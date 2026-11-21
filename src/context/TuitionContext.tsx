import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  firebaseInitError,
  googleProvider,
  handleFirestoreError,
} from '@/src/lib/firebase';
import { ClientConfig, getActiveClientConfig } from '@/src/config/clientConfig';
import {
  AttendanceRecord,
  AuditLog,
  BillingStatus,
  CardTier,
  ClassBatch,
  Exam,
  ExamMark,
  FeePayment,
  Institute,
  InstituteStatus,
  Invite,
  OnboardingRequest,
  PaymentMethod,
  StaffMember,
  Student,
  StudyMaterial,
  SubscriptionTier,
  TuitionClass,
  UserProfile,
} from '@/src/types/tuition';
import { DEMO_INSTITUTE_ID, createDemoSeedState } from '@/src/data/demoSeedData';
import {
  calculateGrade,
  getCurrentMonthKey,
  getCurrentMonthLabel,
  getTodayDateKey,
  makeSafeId,
} from '@/src/utils/sriLanka';

export type AppMode = 'public' | 'demo_sandbox' | 'live_firebase';
export type PortalView = 'super_admin' | 'dashboard' | 'counter' | 'lecturer' | 'student';

const SUPER_ADMIN_EMAIL = 'apekollek@gmail.com';

interface TuitionContextValue {
  clientConfig: ClientConfig;
  demoSandboxEnabled: boolean;
  mode: AppMode;
  authReady: boolean;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  authError: string | null;
  activePortal: PortalView;
  setActivePortal: (portal: PortalView) => void;
  demoStudentId: string;
  setDemoStudentId: (studentId: string) => void;
  demoLecturerId: string;
  setDemoLecturerId: (lecturerId: string) => void;

  // Tenant Data (strictly isolated to active instituteId)
  activeInstitute: Institute | null;
  staff: StaffMember[];
  classes: TuitionClass[];
  batches: ClassBatch[];
  students: Student[];
  feePayments: FeePayment[];
  attendance: AttendanceRecord[];
  exams: Exam[];
  examMarks: ExamMark[];
  studyMaterials: StudyMaterial[];

  // Super Admin Platform Data (populated ONLY when userProfile.role === 'super_admin')
  allInstitutes: Institute[];
  onboardingRequests: OnboardingRequest[];
  auditLogs: AuditLog[];

  // Auth & Navigation Actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string, displayName?: string, isSignUp?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  enterDemoSandbox: (initialPortal?: PortalView) => void;
  exitDemoSandbox: () => void;
  resetDemoSandbox: () => void;
  loginDemoStudent: (studentCode: string, pinOrPhone: string) => { ok: boolean; student?: Student; error?: string };

  // Public Onboarding
  submitOnboardingRequest: (payload: Omit<OnboardingRequest, 'requestId' | 'status' | 'createdAt'>) => Promise<void>;

  // Super Admin Operations
  createInstituteAsSuperAdmin: (payload: {
    name: string;
    city: string;
    district: string;
    phone: string;
    ownerEmail: string;
    ownerName: string;
    tier: SubscriptionTier;
  }) => Promise<void>;
  updateInstituteControl: (
    instituteId: string,
    updates: Partial<Pick<Institute, 'status' | 'subscriptionTier' | 'monthlyFeeLkr' | 'billingStatus'>>
  ) => Promise<void>;
  approveOnboardingRequest: (req: OnboardingRequest) => Promise<void>;
  rejectOnboardingRequest: (req: OnboardingRequest) => Promise<void>;

  // Tenant Operations (Dashboard, Counter, Lecturer)
  seedLiveInstituteSampleData: () => Promise<void>;
  createStaffMember: (payload: Omit<StaffMember, 'staffId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  createTuitionClass: (payload: Omit<TuitionClass, 'classId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  createClassBatch: (payload: Omit<ClassBatch, 'batchId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  enrollStudent: (payload: Omit<Student, 'studentId' | 'instituteId' | 'studentCode' | 'createdAt' | 'updatedAt'> & { studentCode?: string }) => Promise<Student>;
  updateStudentEnrollments: (studentId: string, enrolledClassIds: string[], cardTier: CardTier) => Promise<void>;
  collectFeePayment: (payload: {
    student: Student;
    tuitionClass: TuitionClass;
    monthKey: string;
    monthLabel: string;
    cardTier: CardTier | 'admission';
    amountLkr: number;
    paymentMethod: PaymentMethod;
  }) => Promise<FeePayment>;
  recordQuickCheckIn: (studentCodeOrId: string, classId: string) => Promise<{
    ok: boolean;
    error?: string;
    student?: Student;
    tuitionClass?: TuitionClass;
    feeStatus?: 'paid' | 'overdue' | 'half_card' | 'free_card';
    arrearsLkr?: number;
    record?: AttendanceRecord;
  }>;
  createExam: (payload: Omit<Exam, 'examId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => Promise<Exam>;
  saveExamMarksBulk: (
    exam: Exam,
    entries: Array<{ student: Student; marksObtained: number }>
  ) => Promise<void>;
  createStudyMaterial: (payload: Omit<StudyMaterial, 'materialId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteStudyMaterial: (materialId: string) => Promise<void>;
}

const TuitionContext = createContext<TuitionContextValue | null>(null);

export function TuitionProvider({ children }: { children: React.ReactNode }) {
  const clientConfig = useMemo(() => getActiveClientConfig(), []);
  const demoSandboxEnabled = clientConfig.modules.demoSandboxEnabled;

  const [mode, setMode] = useState<AppMode>('public');
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activePortal, setActivePortal] = useState<PortalView>('dashboard');

  // Demo Sandbox State (accessible only when clientConfig.modules.demoSandboxEnabled is true)
  const [demoData, setDemoData] = useState(() => createDemoSeedState(DEMO_INSTITUTE_ID));
  const [demoStudentId, setDemoStudentId] = useState<string>('stu-1001');
  const [demoLecturerId, setDemoLecturerId] = useState<string>('stf-chathura');

  // Live Firestore Tenant State
  const [liveInstitute, setLiveInstitute] = useState<Institute | null>(null);
  const [liveStaff, setLiveStaff] = useState<StaffMember[]>([]);
  const [liveClasses, setLiveClasses] = useState<TuitionClass[]>([]);
  const [liveBatches, setLiveBatches] = useState<ClassBatch[]>([]);
  const [liveStudents, setLiveStudents] = useState<Student[]>([]);
  const [livePayments, setLivePayments] = useState<FeePayment[]>([]);
  const [liveAttendance, setLiveAttendance] = useState<AttendanceRecord[]>([]);
  const [liveExams, setLiveExams] = useState<Exam[]>([]);
  const [liveExamMarks, setLiveExamMarks] = useState<ExamMark[]>([]);
  const [liveMaterials, setLiveMaterials] = useState<StudyMaterial[]>([]);

  // Live Firestore Super Admin State
  const [allInstitutes, setAllInstitutes] = useState<Institute[]>([]);
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const resolvePortalForRole = (role: UserProfile['role']): PortalView => {
    switch (role) {
      case 'super_admin':
        return 'super_admin';
      case 'institute_admin':
        return 'dashboard';
      case 'receptionist':
        return 'counter';
      case 'lecturer':
        return 'lecturer';
      case 'student':
        return 'student';
    }
  };

  // Auth listener & UserProfile resolution
  useEffect(() => {
    if (firebaseInitError || !auth) {
      setAuthReady(true);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);
      if (!user) {
        setUserProfile(null);
        setMode((prev) =>
          demoSandboxEnabled && prev === 'demo_sandbox' ? 'demo_sandbox' : 'public'
        );
        setAuthReady(true);
        return;
      }

      if (!user.emailVerified && user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
        // Still allow profile lookup; Firestore rules require email_verified for writes
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          setUserProfile(profile);
          setMode('live_firebase');
          setActivePortal(resolvePortalForRole(profile.role));
          setAuthReady(true);
          return;
        }

        const emailLower = (user.email || '').toLowerCase();
        if (emailLower === SUPER_ADMIN_EMAIL) {
          const superProfile: UserProfile = {
            uid: user.uid,
            email: emailLower,
            displayName: user.displayName || 'Platform Super Admin',
            role: 'super_admin',
            instituteId: 'platform',
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, superProfile);
          setUserProfile(superProfile);
          setMode('live_firebase');
          setActivePortal('super_admin');
          setAuthReady(true);
          return;
        }

        // Check if this user has a pending invite keyed by lowercase email
        if (emailLower) {
          const inviteRef = doc(db, 'invites', emailLower);
          const inviteSnap = await getDoc(inviteRef);
          if (inviteSnap.exists()) {
            const invite = inviteSnap.data() as Invite;
            if (invite.status === 'pending') {
              const invitedProfile: UserProfile = {
                uid: user.uid,
                email: emailLower,
                displayName: user.displayName || invite.displayName,
                role: invite.role,
                instituteId: invite.instituteId,
                ...(invite.linkedEntityId ? { linkedEntityId: invite.linkedEntityId } : {}),
                status: 'active',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };
              await setDoc(userRef, invitedProfile);
              await updateDoc(inviteRef, { status: 'accepted' });
              setUserProfile(invitedProfile);
              setMode('live_firebase');
              setActivePortal(resolvePortalForRole(invitedProfile.role));
              setAuthReady(true);
              return;
            }
          }
        }

        // Signed in user has no invite or tenant profile yet
        setUserProfile(null);
        setMode('live_firebase');
        setAuthError(
          demoSandboxEnabled
            ? `Your account is verified, but it is not yet assigned to a ${clientConfig.branding.academyName} institute. Ask your Institute Admin or Super Admin to invite your email, or explore the Live Demo Sandbox.`
            : `Your account is verified, but it is not yet assigned to ${clientConfig.branding.academyName}. Ask your Institute Admin to invite your email.`
        );
      } catch (err) {
        console.error('Auth profile resolution error:', err);
        setAuthError(`Unable to verify your ${clientConfig.branding.academyName} profile. Please try again.`);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, [clientConfig.branding.academyName, demoSandboxEnabled]);

  // Firestore Realtime Listeners (Strictly Tenant-Scoped or Super-Admin-Scoped)
  useEffect(() => {
    if (mode !== 'live_firebase' || !firebaseUser || !userProfile) {
      return;
    }

    const unsubscribers: Array<() => void> = [];

    if (userProfile.role === 'super_admin') {
      unsubscribers.push(
        onSnapshot(
          collection(db, 'institutes'),
          (snap) => setAllInstitutes(snap.docs.map((d) => d.data() as Institute)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'institutes')
        )
      );
      unsubscribers.push(
        onSnapshot(
          collection(db, 'onboardingRequests'),
          (snap) => setOnboardingRequests(snap.docs.map((d) => d.data() as OnboardingRequest)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'onboardingRequests')
        )
      );
      unsubscribers.push(
        onSnapshot(
          collection(db, 'auditLogs'),
          (snap) => setAuditLogs(snap.docs.map((d) => d.data() as AuditLog)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
        )
      );
      return () => unsubscribers.forEach((u) => u());
    }

    const instId = userProfile.instituteId;
    if (!instId || instId === 'platform') {
      return;
    }

    // Tenant root
    unsubscribers.push(
      onSnapshot(
        doc(db, 'institutes', instId),
        (snap) => setLiveInstitute(snap.exists() ? (snap.data() as Institute) : null),
        (err) => handleFirestoreError(err, OperationType.GET, `institutes/${instId}`)
      )
    );

    const subQuery = (sub: string) =>
      query(collection(db, 'institutes', instId, sub), where('instituteId', '==', instId));

    unsubscribers.push(
      onSnapshot(
        subQuery('classes'),
        (snap) => setLiveClasses(snap.docs.map((d) => d.data() as TuitionClass)),
        (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/classes`)
      ),
      onSnapshot(
        subQuery('batches'),
        (snap) => setLiveBatches(snap.docs.map((d) => d.data() as ClassBatch)),
        (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/batches`)
      ),
      onSnapshot(
        subQuery('studyMaterials'),
        (snap) => setLiveMaterials(snap.docs.map((d) => d.data() as StudyMaterial)),
        (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/studyMaterials`)
      ),
      onSnapshot(
        subQuery('exams'),
        (snap) => setLiveExams(snap.docs.map((d) => d.data() as Exam)),
        (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/exams`)
      )
    );

    if (userProfile.role !== 'student') {
      unsubscribers.push(
        onSnapshot(
          subQuery('staff'),
          (snap) => setLiveStaff(snap.docs.map((d) => d.data() as StaffMember)),
          (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/staff`)
        ),
        onSnapshot(
          subQuery('students'),
          (snap) => setLiveStudents(snap.docs.map((d) => d.data() as Student)),
          (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/students`)
        ),
        onSnapshot(
          subQuery('feePayments'),
          (snap) => setLivePayments(snap.docs.map((d) => d.data() as FeePayment)),
          (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/feePayments`)
        ),
        onSnapshot(
          subQuery('attendance'),
          (snap) => setLiveAttendance(snap.docs.map((d) => d.data() as AttendanceRecord)),
          (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/attendance`)
        ),
        onSnapshot(
          subQuery('examMarks'),
          (snap) => setLiveExamMarks(snap.docs.map((d) => d.data() as ExamMark)),
          (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/examMarks`)
        )
      );
    } else if (userProfile.linkedEntityId) {
      const sid = userProfile.linkedEntityId;
      const studentScoped = (sub: string) =>
        query(
          collection(db, 'institutes', instId, sub),
          where('instituteId', '==', instId),
          where('studentId', '==', sid)
        );
      unsubscribers.push(
        onSnapshot(
          doc(db, 'institutes', instId, 'students', sid),
          (snap) => setLiveStudents(snap.exists() ? [snap.data() as Student] : []),
          (err) => handleFirestoreError(err, OperationType.GET, `institutes/${instId}/students/${sid}`)
        ),
        onSnapshot(
          studentScoped('feePayments'),
          (snap) => setLivePayments(snap.docs.map((d) => d.data() as FeePayment)),
          (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/feePayments`)
        ),
        onSnapshot(
          studentScoped('attendance'),
          (snap) => setLiveAttendance(snap.docs.map((d) => d.data() as AttendanceRecord)),
          (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/attendance`)
        ),
        onSnapshot(
          studentScoped('examMarks'),
          (snap) => setLiveExamMarks(snap.docs.map((d) => d.data() as ExamMark)),
          (err) => handleFirestoreError(err, OperationType.LIST, `institutes/${instId}/examMarks`)
        )
      );
    }

    return () => unsubscribers.forEach((u) => u());
  }, [mode, firebaseUser, userProfile]);

  // Auth Actions
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(message);
      throw err;
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string, displayName?: string, isSignUp?: boolean) => {
      setAuthError(null);
      try {
        if (isSignUp) {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          if (displayName) {
            await updateProfile(cred.user, { displayName });
          }
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        if (raw.includes('auth/operation-not-allowed')) {
          setAuthError(
            'Email/Password sign-in is not yet enabled in the Firebase Console for this project. Use "Continue with Google" below, or enable Email/Password under Firebase Console → Authentication → Sign-in method.'
          );
        } else {
          setAuthError(raw);
        }
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    if (mode === 'demo_sandbox') {
      setMode('public');
      setUserProfile(null);
      return;
    }
    await signOut(auth);
    setMode('public');
    setUserProfile(null);
  }, [mode]);

  const enterDemoSandbox = useCallback(
    (initialPortal: PortalView = 'dashboard') => {
      if (!demoSandboxEnabled) {
        console.warn('[TuitionOS] Demo sandbox is disabled in the active client configuration.');
        return;
      }
      setMode('demo_sandbox');
      setAuthError(null);
      setActivePortal(initialPortal === 'super_admin' ? 'dashboard' : initialPortal);
    },
    [demoSandboxEnabled]
  );

  const exitDemoSandbox = useCallback(() => {
    setMode(firebaseUser && userProfile ? 'live_firebase' : 'public');
  }, [firebaseUser, userProfile]);

  const resetDemoSandbox = useCallback(() => {
    if (!demoSandboxEnabled || !clientConfig.demo.allowReset) {
      return;
    }
    setDemoData(createDemoSeedState(DEMO_INSTITUTE_ID));
    setDemoStudentId('stu-1001');
    setDemoLecturerId('stf-chathura');
  }, [clientConfig.demo.allowReset, demoSandboxEnabled]);

  const loginDemoStudent = useCallback(
    (studentCode: string, pinOrPhone: string) => {
      if (!demoSandboxEnabled) {
        return {
          ok: false,
          error: 'Demo student sandbox login is disabled for this deployment.',
        };
      }
      const normalizedCode = studentCode.trim().toUpperCase();
      const cleanedAuth = pinOrPhone.replace(/\D/g, '');
      const found = demoData.students.find((s) => s.studentCode.toUpperCase() === normalizedCode);
      if (!found) {
        return {
          ok: false,
          error: `Student ID not found in ${clientConfig.demo.sandboxInstituteName}.`,
        };
      }
      const phoneDigits = found.phone.replace(/\D/g, '');
      const parentDigits = found.parentPhone.replace(/\D/g, '');
      const pinMatches =
        pinOrPhone.trim() === found.portalPin ||
        (cleanedAuth.length >= 6 &&
          (phoneDigits.endsWith(cleanedAuth.slice(-9)) || parentDigits.endsWith(cleanedAuth.slice(-9))));

      if (!pinMatches) {
        return { ok: false, error: 'Incorrect PIN or registered phone number.' };
      }

      setDemoStudentId(found.studentId);
      setMode('demo_sandbox');
      setActivePortal('student');
      return { ok: true, student: found };
    },
    [clientConfig.demo.sandboxInstituteName, demoData.students, demoSandboxEnabled]
  );

  // Public Onboarding Submission
  const submitOnboardingRequest = useCallback(
    async (payload: Omit<OnboardingRequest, 'requestId' | 'status' | 'createdAt'>) => {
      const requestId = makeSafeId('req');
      const path = `onboardingRequests/${requestId}`;
      try {
        await setDoc(doc(db, 'onboardingRequests', requestId), {
          ...payload,
          requestId,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    []
  );

  // Super Admin Operations
  const writeAuditLog = async (
    action: string,
    targetType: AuditLog['targetType'],
    targetId: string,
    summary: string
  ) => {
    if (!firebaseUser) return;
    const logId = makeSafeId('log');
    try {
      await setDoc(doc(db, 'auditLogs', logId), {
        logId,
        actorUid: firebaseUser.uid,
        actorEmail: firebaseUser.email || SUPER_ADMIN_EMAIL,
        action,
        targetType,
        targetId,
        summary,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `auditLogs/${logId}`);
    }
  };

  const tierPriceMap: Record<SubscriptionTier, number> = {
    starter: 7500,
    pro: 16500,
    enterprise: 32000,
  };

  const createInstituteAsSuperAdmin = useCallback(
    async (payload: {
      name: string;
      city: string;
      district: string;
      phone: string;
      ownerEmail: string;
      ownerName: string;
      tier: SubscriptionTier;
    }) => {
      if (!firebaseUser) return;
      const instituteId = makeSafeId('inst');
      const emailLower = payload.ownerEmail.trim().toLowerCase();
      try {
        await setDoc(doc(db, 'institutes', instituteId), {
          instituteId,
          name: payload.name.trim(),
          city: payload.city.trim(),
          district: payload.district,
          phone: payload.phone.trim(),
          email: emailLower,
          ownerUid: 'pending-invite',
          ownerName: payload.ownerName.trim(),
          status: 'active' as InstituteStatus,
          subscriptionTier: payload.tier,
          monthlyFeeLkr: tierPriceMap[payload.tier],
          billingStatus: 'paid' as BillingStatus,
          activeStudentCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'invites', emailLower), {
          inviteEmail: emailLower,
          role: 'institute_admin',
          instituteId,
          displayName: payload.ownerName.trim(),
          status: 'pending',
          createdByUid: firebaseUser.uid,
          createdAt: serverTimestamp(),
        });
        await writeAuditLog(
          'CREATE_INSTITUTE',
          'institute',
          instituteId,
          `Provisioned ${payload.name} (${payload.tier}) and invited ${emailLower}`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `institutes/${instituteId}`);
      }
    },
    [firebaseUser]
  );

  const updateInstituteControl = useCallback(
    async (
      instituteId: string,
      updates: Partial<Pick<Institute, 'status' | 'subscriptionTier' | 'monthlyFeeLkr' | 'billingStatus'>>
    ) => {
      try {
        await updateDoc(doc(db, 'institutes', instituteId), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        await writeAuditLog(
          'UPDATE_INSTITUTE',
          'institute',
          instituteId,
          `Updated institute controls: ${JSON.stringify(updates)}`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `institutes/${instituteId}`);
      }
    },
    [firebaseUser]
  );

  const approveOnboardingRequest = useCallback(
    async (req: OnboardingRequest) => {
      if (!firebaseUser) return;
      await createInstituteAsSuperAdmin({
        name: req.instituteName,
        city: req.city,
        district: 'Colombo',
        phone: req.phone,
        ownerEmail: req.email,
        ownerName: req.ownerName,
        tier: req.preferredTier,
      });
      try {
        await updateDoc(doc(db, 'onboardingRequests', req.requestId), {
          status: 'approved',
        });
        await writeAuditLog(
          'APPROVE_ONBOARDING',
          'onboarding',
          req.requestId,
          `Approved onboarding request for ${req.instituteName}`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `onboardingRequests/${req.requestId}`);
      }
    },
    [firebaseUser, createInstituteAsSuperAdmin]
  );

  const rejectOnboardingRequest = useCallback(
    async (req: OnboardingRequest) => {
      try {
        await updateDoc(doc(db, 'onboardingRequests', req.requestId), {
          status: 'rejected',
        });
        await writeAuditLog(
          'REJECT_ONBOARDING',
          'onboarding',
          req.requestId,
          `Rejected onboarding request for ${req.instituteName}`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `onboardingRequests/${req.requestId}`);
      }
    },
    [firebaseUser]
  );

  // Active Tenant ID helper
  const activeInstituteId =
    mode === 'demo_sandbox' ? DEMO_INSTITUTE_ID : userProfile?.instituteId || '';

  // Seed Live Empty Institute with Sri Lankan sample data
  const seedLiveInstituteSampleData = useCallback(async () => {
    if (mode !== 'live_firebase' || !activeInstituteId || !firebaseUser) return;
    const seed = createDemoSeedState(activeInstituteId);
    const batch = writeBatch(db);

    seed.staff.forEach((item) => {
      batch.set(doc(db, 'institutes', activeInstituteId, 'staff', item.staffId), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    seed.classes.forEach((item) => {
      batch.set(doc(db, 'institutes', activeInstituteId, 'classes', item.classId), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    seed.batches.forEach((item) => {
      batch.set(doc(db, 'institutes', activeInstituteId, 'batches', item.batchId), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    seed.students.forEach((item) => {
      batch.set(doc(db, 'institutes', activeInstituteId, 'students', item.studentId), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    seed.feePayments.slice(0, 25).forEach((item) => {
      batch.set(doc(db, 'institutes', activeInstituteId, 'feePayments', item.paymentId), {
        ...item,
        collectedByUid: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
    });
    seed.exams.forEach((item) => {
      batch.set(doc(db, 'institutes', activeInstituteId, 'exams', item.examId), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    seed.examMarks.forEach((item) => {
      batch.set(doc(db, 'institutes', activeInstituteId, 'examMarks', item.markId), {
        ...item,
        enteredByUid: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    seed.studyMaterials.forEach((item) => {
      batch.set(doc(db, 'institutes', activeInstituteId, 'studyMaterials', item.materialId), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    batch.update(doc(db, 'institutes', activeInstituteId), {
      activeStudentCount: seed.students.length,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `institutes/${activeInstituteId}`);
    }
  }, [mode, activeInstituteId, firebaseUser]);

  // Tenant Mutations (support both Demo Sandbox and Live Firestore cleanly)
  const createStaffMember = useCallback(
    async (payload: Omit<StaffMember, 'staffId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => {
      const staffId = makeSafeId('stf');
      const record: StaffMember = {
        ...payload,
        staffId,
        instituteId: activeInstituteId,
      };
      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({ ...prev, staff: [...prev.staff, record] }));
        return;
      }
      if (!firebaseUser) return;
      try {
        await setDoc(doc(db, 'institutes', activeInstituteId, 'staff', staffId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const emailLower = payload.email.trim().toLowerCase();
        await setDoc(doc(db, 'invites', emailLower), {
          inviteEmail: emailLower,
          role: payload.role === 'institute_admin' ? 'receptionist' : payload.role,
          instituteId: activeInstituteId,
          linkedEntityId: staffId,
          displayName: payload.fullName.trim(),
          status: 'pending',
          createdByUid: firebaseUser.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `institutes/${activeInstituteId}/staff/${staffId}`);
      }
    },
    [mode, activeInstituteId, firebaseUser]
  );

  const createTuitionClass = useCallback(
    async (payload: Omit<TuitionClass, 'classId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => {
      const classId = makeSafeId('cls');
      const record: TuitionClass = {
        ...payload,
        classId,
        instituteId: activeInstituteId,
      };
      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({ ...prev, classes: [...prev.classes, record] }));
        return;
      }
      try {
        await setDoc(doc(db, 'institutes', activeInstituteId, 'classes', classId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `institutes/${activeInstituteId}/classes/${classId}`);
      }
    },
    [mode, activeInstituteId]
  );

  const createClassBatch = useCallback(
    async (payload: Omit<ClassBatch, 'batchId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => {
      const batchId = makeSafeId('bat');
      const record: ClassBatch = {
        ...payload,
        batchId,
        instituteId: activeInstituteId,
      };
      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({ ...prev, batches: [...prev.batches, record] }));
        return;
      }
      try {
        await setDoc(doc(db, 'institutes', activeInstituteId, 'batches', batchId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `institutes/${activeInstituteId}/batches/${batchId}`);
      }
    },
    [mode, activeInstituteId]
  );

  const currentStudents = mode === 'demo_sandbox' ? demoData.students : liveStudents;
  const currentClasses = mode === 'demo_sandbox' ? demoData.classes : liveClasses;
  const currentPayments = mode === 'demo_sandbox' ? demoData.feePayments : livePayments;

  const enrollStudent = useCallback(
    async (
      payload: Omit<Student, 'studentId' | 'instituteId' | 'studentCode' | 'createdAt' | 'updatedAt'> & {
        studentCode?: string;
      }
    ) => {
      const studentId = makeSafeId('stu');
      const nextNum = 1001 + currentStudents.length;
      const studentCode = payload.studentCode || `STU-2026-${String(nextNum).padStart(4, '0')}`;
      const record: Student = {
        ...payload,
        studentId,
        instituteId: activeInstituteId,
        studentCode,
      };
      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({ ...prev, students: [record, ...prev.students] }));
        return record;
      }
      try {
        await setDoc(doc(db, 'institutes', activeInstituteId, 'students', studentId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `institutes/${activeInstituteId}/students/${studentId}`);
      }
      return record;
    },
    [mode, activeInstituteId, currentStudents.length]
  );

  const updateStudentEnrollments = useCallback(
    async (studentId: string, enrolledClassIds: string[], cardTier: CardTier) => {
      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({
          ...prev,
          students: prev.students.map((s) =>
            s.studentId === studentId ? { ...s, enrolledClassIds, cardTier } : s
          ),
        }));
        return;
      }
      try {
        await updateDoc(doc(db, 'institutes', activeInstituteId, 'students', studentId), {
          enrolledClassIds,
          cardTier,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `institutes/${activeInstituteId}/students/${studentId}`);
      }
    },
    [mode, activeInstituteId]
  );

  const collectFeePayment = useCallback(
    async ({
      student,
      tuitionClass,
      monthKey,
      monthLabel,
      cardTier,
      amountLkr,
      paymentMethod,
    }: {
      student: Student;
      tuitionClass: TuitionClass;
      monthKey: string;
      monthLabel: string;
      cardTier: CardTier | 'admission';
      amountLkr: number;
      paymentMethod: PaymentMethod;
    }) => {
      const paymentId = makeSafeId('pay');
      const receiptNo = `RCP-2026-${Math.floor(5000 + Math.random() * 4900)}`;
      const lecturerShareLkr =
        cardTier === 'admission' ? 0 : Math.round(amountLkr * (tuitionClass.lecturerSharePct / 100));
      const instituteShareLkr = amountLkr - lecturerShareLkr;
      const collectorUid = firebaseUser?.uid || 'stf-nadeesha';
      const collectorName = userProfile?.displayName || 'Nadeesha Perera';

      const payment: FeePayment = {
        paymentId,
        instituteId: activeInstituteId,
        receiptNo,
        studentId: student.studentId,
        studentCode: student.studentCode,
        studentName: student.fullName,
        classId: tuitionClass.classId,
        className: tuitionClass.title,
        lecturerId: tuitionClass.lecturerId,
        lecturerName: tuitionClass.lecturerName,
        monthKey,
        monthLabel,
        cardTier,
        amountLkr,
        lecturerShareLkr,
        instituteShareLkr,
        paymentMethod,
        collectedByUid: collectorUid,
        collectedByName: collectorName,
        createdAt: 'Just now',
      };

      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({
          ...prev,
          feePayments: [payment, ...prev.feePayments],
          students:
            cardTier === 'admission'
              ? prev.students.map((s) =>
                  s.studentId === student.studentId ? { ...s, admissionPaid: true } : s
                )
              : prev.students,
        }));
        return payment;
      }

      try {
        await setDoc(doc(db, 'institutes', activeInstituteId, 'feePayments', paymentId), {
          ...payment,
          createdAt: serverTimestamp(),
        });
        if (cardTier === 'admission' && !student.admissionPaid) {
          await updateDoc(doc(db, 'institutes', activeInstituteId, 'students', student.studentId), {
            admissionPaid: true,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `institutes/${activeInstituteId}/feePayments/${paymentId}`);
      }
      return payment;
    },
    [mode, activeInstituteId, firebaseUser, userProfile]
  );

  const recordQuickCheckIn = useCallback(
    async (studentCodeOrId: string, classId: string) => {
      const needle = studentCodeOrId.trim().toUpperCase();
      const student = currentStudents.find(
        (s) =>
          s.studentCode.toUpperCase() === needle ||
          s.studentId.toUpperCase() === needle ||
          s.phone.replace(/\D/g, '').endsWith(needle.replace(/\D/g, ''))
      );
      if (!student) {
        return { ok: false, error: `No student found matching "${studentCodeOrId}".` };
      }

      const tuitionClass = currentClasses.find((c) => c.classId === classId) || currentClasses[0];
      if (!tuitionClass) {
        return { ok: false, error: 'Please select a valid class first.' };
      }

      const monthKey = getCurrentMonthKey();
      const dateKey = getTodayDateKey();
      const hasPaidCurrentMonth = currentPayments.some(
        (p) =>
          p.studentId === student.studentId &&
          p.classId === tuitionClass.classId &&
          p.monthKey === monthKey
      );

      let feeStatus: AttendanceRecord['feeStatus'] = 'overdue';
      let arrearsLkr = 0;

      if (student.cardTier === 'free') {
        feeStatus = 'free_card';
      } else if (hasPaidCurrentMonth) {
        feeStatus = student.cardTier === 'half' ? 'half_card' : 'paid';
      } else {
        feeStatus = 'overdue';
        arrearsLkr =
          student.cardTier === 'half'
            ? Math.round(tuitionClass.monthlyFeeLkr * 0.5)
            : tuitionClass.monthlyFeeLkr;
      }

      const attendanceId = makeSafeId('att');
      const record: AttendanceRecord = {
        attendanceId,
        instituteId: activeInstituteId,
        studentId: student.studentId,
        studentCode: student.studentCode,
        studentName: student.fullName,
        classId: tuitionClass.classId,
        className: tuitionClass.title,
        dateKey,
        monthKey,
        feeStatus,
        arrearsLkr,
        checkedInByUid: firebaseUser?.uid || 'stf-nadeesha',
        createdAt: `Just now (${getCurrentMonthLabel()})`,
      };

      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({
          ...prev,
          attendance: [record, ...prev.attendance],
        }));
      } else {
        try {
          await setDoc(doc(db, 'institutes', activeInstituteId, 'attendance', attendanceId), {
            ...record,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `institutes/${activeInstituteId}/attendance/${attendanceId}`);
        }
      }

      return {
        ok: true,
        student,
        tuitionClass,
        feeStatus,
        arrearsLkr,
        record,
      };
    },
    [mode, activeInstituteId, currentStudents, currentClasses, currentPayments, firebaseUser]
  );

  const createExam = useCallback(
    async (payload: Omit<Exam, 'examId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => {
      const examId = makeSafeId('exm');
      const record: Exam = {
        ...payload,
        examId,
        instituteId: activeInstituteId,
      };
      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({ ...prev, exams: [record, ...prev.exams] }));
        return record;
      }
      try {
        await setDoc(doc(db, 'institutes', activeInstituteId, 'exams', examId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `institutes/${activeInstituteId}/exams/${examId}`);
      }
      return record;
    },
    [mode, activeInstituteId]
  );

  const saveExamMarksBulk = useCallback(
    async (exam: Exam, entries: Array<{ student: Student; marksObtained: number }>) => {
      const uid = firebaseUser?.uid || exam.lecturerId;
      const newMarks: ExamMark[] = entries.map(({ student, marksObtained }) => ({
        markId: `mrk-${exam.examId}-${student.studentId}`,
        instituteId: activeInstituteId,
        examId: exam.examId,
        examTitle: exam.title,
        classId: exam.classId,
        studentId: student.studentId,
        studentCode: student.studentCode,
        studentName: student.fullName,
        marksObtained,
        maxMarks: exam.maxMarks,
        grade: calculateGrade(marksObtained, exam.maxMarks),
        enteredByUid: uid,
      }));

      if (mode === 'demo_sandbox') {
        setDemoData((prev) => {
          const map = new Map(prev.examMarks.map((m) => [m.markId, m]));
          newMarks.forEach((m) => map.set(m.markId, m));
          return { ...prev, examMarks: Array.from(map.values()) };
        });
        return;
      }

      const batch = writeBatch(db);
      newMarks.forEach((m) => {
        batch.set(doc(db, 'institutes', activeInstituteId, 'examMarks', m.markId), {
          ...m,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `institutes/${activeInstituteId}/examMarks`);
      }
    },
    [mode, activeInstituteId, firebaseUser]
  );

  const createStudyMaterial = useCallback(
    async (payload: Omit<StudyMaterial, 'materialId' | 'instituteId' | 'createdAt' | 'updatedAt'>) => {
      const materialId = makeSafeId('mat');
      const record: StudyMaterial = {
        ...payload,
        materialId,
        instituteId: activeInstituteId,
        createdAt: 'Just now',
      };
      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({ ...prev, studyMaterials: [record, ...prev.studyMaterials] }));
        return;
      }
      try {
        await setDoc(doc(db, 'institutes', activeInstituteId, 'studyMaterials', materialId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `institutes/${activeInstituteId}/studyMaterials/${materialId}`
        );
      }
    },
    [mode, activeInstituteId]
  );

  const deleteStudyMaterial = useCallback(
    async (materialId: string) => {
      if (mode === 'demo_sandbox') {
        setDemoData((prev) => ({
          ...prev,
          studyMaterials: prev.studyMaterials.filter((m) => m.materialId !== materialId),
        }));
        return;
      }
      try {
        await deleteDoc(doc(db, 'institutes', activeInstituteId, 'studyMaterials', materialId));
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `institutes/${activeInstituteId}/studyMaterials/${materialId}`
        );
      }
    },
    [mode, activeInstituteId]
  );

  const isDemoActive = demoSandboxEnabled && mode === 'demo_sandbox';

  const value = useMemo<TuitionContextValue>(
    () => ({
      clientConfig,
      demoSandboxEnabled,
      mode: isDemoActive ? 'demo_sandbox' : mode === 'demo_sandbox' ? 'public' : mode,
      authReady,
      firebaseUser,
      userProfile,
      authError,
      activePortal,
      setActivePortal,
      demoStudentId,
      setDemoStudentId,
      demoLecturerId,
      setDemoLecturerId,

      activeInstitute: isDemoActive ? demoData.institute : liveInstitute,
      staff: isDemoActive ? demoData.staff : liveStaff,
      classes: isDemoActive ? demoData.classes : liveClasses,
      batches: isDemoActive ? demoData.batches : liveBatches,
      students: isDemoActive ? demoData.students : liveStudents,
      feePayments: isDemoActive ? demoData.feePayments : livePayments,
      attendance: isDemoActive ? demoData.attendance : liveAttendance,
      exams: isDemoActive ? demoData.exams : liveExams,
      examMarks: isDemoActive ? demoData.examMarks : liveExamMarks,
      studyMaterials: isDemoActive ? demoData.studyMaterials : liveMaterials,

      allInstitutes,
      onboardingRequests,
      auditLogs,

      signInWithGoogle,
      signInWithEmail,
      logout,
      enterDemoSandbox,
      exitDemoSandbox,
      resetDemoSandbox,
      loginDemoStudent,

      submitOnboardingRequest,
      createInstituteAsSuperAdmin,
      updateInstituteControl,
      approveOnboardingRequest,
      rejectOnboardingRequest,

      seedLiveInstituteSampleData,
      createStaffMember,
      createTuitionClass,
      createClassBatch,
      enrollStudent,
      updateStudentEnrollments,
      collectFeePayment,
      recordQuickCheckIn,
      createExam,
      saveExamMarksBulk,
      createStudyMaterial,
      deleteStudyMaterial,
    }),
    [
      clientConfig,
      demoSandboxEnabled,
      isDemoActive,
      mode,
      authReady,
      firebaseUser,
      userProfile,
      authError,
      activePortal,
      demoStudentId,
      demoLecturerId,
      demoData,
      liveInstitute,
      liveStaff,
      liveClasses,
      liveBatches,
      liveStudents,
      livePayments,
      liveAttendance,
      liveExams,
      liveExamMarks,
      liveMaterials,
      allInstitutes,
      onboardingRequests,
      auditLogs,
      signInWithGoogle,
      signInWithEmail,
      logout,
      enterDemoSandbox,
      exitDemoSandbox,
      resetDemoSandbox,
      loginDemoStudent,
      submitOnboardingRequest,
      createInstituteAsSuperAdmin,
      updateInstituteControl,
      approveOnboardingRequest,
      rejectOnboardingRequest,
      seedLiveInstituteSampleData,
      createStaffMember,
      createTuitionClass,
      createClassBatch,
      enrollStudent,
      updateStudentEnrollments,
      collectFeePayment,
      recordQuickCheckIn,
      createExam,
      saveExamMarksBulk,
      createStudyMaterial,
      deleteStudyMaterial,
    ]
  );

  return <TuitionContext.Provider value={value}>{children}</TuitionContext.Provider>;
}

export function useTuition() {
  const ctx = useContext(TuitionContext);
  if (!ctx) throw new Error('useTuition must be used inside TuitionProvider');
  return ctx;
}
