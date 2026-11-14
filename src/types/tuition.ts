export type UserRole =
  | 'super_admin'
  | 'institute_admin'
  | 'receptionist'
  | 'lecturer'
  | 'student';

export type AcademicMedium = 'Sinhala' | 'English' | 'Tamil';
export type ClassType = 'Theory' | 'Revision' | 'Paper Class';
export type CardTier = 'full' | 'half' | 'free';
export type SubscriptionTier = 'starter' | 'pro' | 'enterprise';
export type InstituteStatus = 'active' | 'pending' | 'suspended';
export type BillingStatus = 'paid' | 'pending' | 'overdue';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer';
export type ExamGrade = 'A' | 'B' | 'C' | 'S' | 'W';
export type MaterialType = 'PDF Notes' | 'Past Paper' | 'Tute' | 'Video Link';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  instituteId: string;
  linkedEntityId?: string;
  status: 'active' | 'suspended';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Invite {
  inviteEmail: string;
  role: Exclude<UserRole, 'super_admin'>;
  instituteId: string;
  linkedEntityId?: string;
  displayName: string;
  status: 'pending' | 'accepted';
  createdByUid: string;
  createdAt?: unknown;
}

export interface Institute {
  instituteId: string;
  name: string;
  city: string;
  district: string;
  address?: string;
  phone: string;
  email: string;
  ownerUid: string;
  ownerName: string;
  status: InstituteStatus;
  subscriptionTier: SubscriptionTier;
  monthlyFeeLkr: number;
  billingStatus: BillingStatus;
  activeStudentCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OnboardingRequest {
  requestId: string;
  instituteName: string;
  city: string;
  ownerName: string;
  email: string;
  phone: string;
  estimatedStudents: number;
  preferredTier: SubscriptionTier;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown;
}

export interface AuditLog {
  logId: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: 'institute' | 'onboarding' | 'billing' | 'system';
  targetId: string;
  summary: string;
  createdAt?: unknown;
}

export interface StaffMember {
  staffId: string;
  instituteId: string;
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  nic: string;
  role: 'institute_admin' | 'receptionist' | 'lecturer';
  subjectSpecialty?: string;
  defaultSharePct: number;
  status: 'active' | 'inactive';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TuitionClass {
  classId: string;
  instituteId: string;
  title: string;
  subject: string;
  grade: string;
  stream: string;
  medium: AcademicMedium;
  classType: ClassType;
  lecturerId: string;
  lecturerName: string;
  lecturerSharePct: number;
  monthlyFeeLkr: number;
  admissionFeeLkr: number;
  hallName: string;
  scheduleDay: string;
  scheduleTime: string;
  status: 'active' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ClassBatch {
  batchId: string;
  instituteId: string;
  classId: string;
  className: string;
  batchCode: string;
  academicYear: string;
  hallName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
  enrolledCount: number;
  status: 'active' | 'full' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Student {
  studentId: string;
  instituteId: string;
  studentCode: string;
  fullName: string;
  nic?: string;
  phone: string;
  parentName?: string;
  parentPhone: string;
  school?: string;
  grade: string;
  stream: string;
  medium: AcademicMedium;
  enrolledClassIds: string[];
  cardTier: CardTier;
  admissionPaid: boolean;
  portalPin: string;
  status: 'active' | 'inactive';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FeePayment {
  paymentId: string;
  instituteId: string;
  receiptNo: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  lecturerId: string;
  lecturerName: string;
  monthKey: string;
  monthLabel: string;
  cardTier: CardTier | 'admission';
  amountLkr: number;
  lecturerShareLkr: number;
  instituteShareLkr: number;
  paymentMethod: PaymentMethod;
  collectedByUid: string;
  collectedByName: string;
  createdAt?: unknown;
}

export interface AttendanceRecord {
  attendanceId: string;
  instituteId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  dateKey: string;
  monthKey: string;
  feeStatus: 'paid' | 'overdue' | 'half_card' | 'free_card';
  arrearsLkr: number;
  checkedInByUid: string;
  createdAt?: unknown;
}

export interface Exam {
  examId: string;
  instituteId: string;
  title: string;
  classId: string;
  className: string;
  lecturerId: string;
  examDate: string;
  maxMarks: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExamMark {
  markId: string;
  instituteId: string;
  examId: string;
  examTitle: string;
  classId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  marksObtained: number;
  maxMarks: number;
  grade: ExamGrade;
  enteredByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudyMaterial {
  materialId: string;
  instituteId: string;
  classId: string;
  className: string;
  lecturerId: string;
  lecturerName: string;
  title: string;
  description?: string;
  materialType: MaterialType;
  url: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const SRI_LANKAN_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Galle',
  'Matara',
  'Kurunegala',
  'Ratnapura',
  'Kegalle',
  'Anuradhapura',
  'Jaffna',
  'Batticaloa',
  'Badulla',
  'Matale',
] as const;

export const ACADEMIC_GRADES = [
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10 (O/L)',
  'Grade 11 (O/L)',
  'Grade 12 (A/L)',
  'Grade 13 (A/L)',
] as const;

export const ACADEMIC_STREAMS = [
  'Physical Science',
  'Bio Science',
  'Commerce',
  'Arts',
  'Technology',
  'O/L National',
  'Cambridge / Edexcel',
] as const;

export const ACADEMIC_MEDIUMS: AcademicMedium[] = ['Sinhala', 'English', 'Tamil'];
export const CLASS_TYPES: ClassType[] = ['Theory', 'Revision', 'Paper Class'];

export const MONTHS_2026 = [
  { key: '2026-01', short: 'Jan', label: 'January 2026' },
  { key: '2026-02', short: 'Feb', label: 'February 2026' },
  { key: '2026-03', short: 'Mar', label: 'March 2026' },
  { key: '2026-04', short: 'Apr', label: 'April 2026' },
  { key: '2026-05', short: 'May', label: 'May 2026' },
  { key: '2026-06', short: 'Jun', label: 'June 2026' },
  { key: '2026-07', short: 'Jul', label: 'July 2026' },
  { key: '2026-08', short: 'Aug', label: 'August 2026' },
  { key: '2026-09', short: 'Sep', label: 'September 2026' },
  { key: '2026-10', short: 'Oct', label: 'October 2026' },
  { key: '2026-11', short: 'Nov', label: 'November 2026' },
  { key: '2026-12', short: 'Dec', label: 'December 2026' },
] as const;

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionTier,
  {
    name: string;
    audience: string;
    monthlyFeeLkr: number;
    studentLimit: string;
    staffLimit: string;
    highlights: string[];
  }
> = {
  starter: {
    name: 'Starter',
    audience: 'For individual lecturers & small centers',
    monthlyFeeLkr: 7500,
    studentLimit: 'Up to 250 active students',
    staffLimit: 'Up to 5 staff accounts',
    highlights: [
      'QR Student ID & quick attendance check-in',
      '12-month class card & thermal receipt POS',
      'Exam paper marks & auto class ranking',
    ],
  },
  pro: {
    name: 'Pro',
    audience: 'For multi-stream tuition academies',
    monthlyFeeLkr: 16500,
    studentLimit: 'Up to 1,500 active students',
    staffLimit: 'Up to 25 lecturers & counter staff',
    highlights: [
      'Automated lecturer commission split reports',
      'Multiple reception counter POS terminals',
      'Student & parent portal with digital QR IDs',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    audience: 'For multi-hall islandwide institutes',
    monthlyFeeLkr: 32000,
    studentLimit: 'Unlimited active students',
    staffLimit: 'Unlimited lecturers & halls',
    highlights: [
      'Dedicated tenant isolation & priority support',
      'Custom hall timetable & capacity tracking',
      'Bulk study materials & full financial exports',
    ],
  },
};
