import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Printer,
  QrCode,
  Search,
  UserPlus,
} from 'lucide-react';
import { useTuition } from '@/src/context/TuitionContext';
import {
  ACADEMIC_GRADES,
  ACADEMIC_MEDIUMS,
  ACADEMIC_STREAMS,
  AcademicMedium,
  CardTier,
  FeePayment,
  MONTHS_2026,
  PaymentMethod,
  Student,
  TuitionClass,
} from '@/src/types/tuition';
import {
  formatLkr,
  getCurrentMonthKey,
  getCurrentMonthLabel,
  normalizeSriLankanPhone,
  playCheckInChime,
  validateNic,
  validateSriLankanPhone,
} from '@/src/utils/sriLanka';

export function ReceptionCounterPortal() {
  const {
    activeInstitute,
    classes,
    students,
    feePayments,
    attendance,
    enrollStudent,
    collectFeePayment,
    recordQuickCheckIn,
  } = useTuition();

  const [subView, setSubView] = useState<'checkin' | 'pos' | 'enroll'>('checkin');

  // 1. Quick Check-In Scanner State
  const [scanInput, setScanInput] = useState('');
  const [scanClassId, setScanClassId] = useState<string>(classes[0]?.classId || '');
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    error?: string;
    student?: Student;
    tuitionClass?: TuitionClass;
    feeStatus?: 'paid' | 'overdue' | 'half_card' | 'free_card';
    arrearsLkr?: number;
  } | null>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scanClassId && classes[0]) {
      setScanClassId(classes[0].classId);
    }
  }, [classes, scanClassId]);

  // 2. Fee POS & Monthly Class Card State
  const [posSearch, setPosSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.studentId || '');
  const [posClassId, setPosClassId] = useState<string>('');
  const [posMonthKey, setPosMonthKey] = useState<string>(getCurrentMonthKey());
  const [posCardTier, setPosCardTier] = useState<CardTier | 'admission'>('full');
  const [posMethod, setPosMethod] = useState<PaymentMethod>('cash');
  const [lastReceipt, setLastReceipt] = useState<FeePayment | null>(null);

  // 3. New Student Enrollment & QR Card State
  const [newName, setNewName] = useState('');
  const [newNic, setNewNic] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newSchool, setNewSchool] = useState('');
  const [newGrade, setNewGrade] = useState<string>('Grade 13 (A/L)');
  const [newStream, setNewStream] = useState<string>('Physical Science');
  const [newMedium, setNewMedium] = useState<AcademicMedium>('Sinhala');
  const [newCardTier, setNewCardTier] = useState<CardTier>('full');
  const [newEnrolledIds, setNewEnrolledIds] = useState<string[]>([]);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [newlyEnrolledStudent, setNewlyEnrolledStudent] = useState<Student | null>(null);

  const selectedStudent = useMemo(
    () => students.find((s) => s.studentId === selectedStudentId) || students[0] || null,
    [students, selectedStudentId]
  );

  useEffect(() => {
    if (selectedStudent && selectedStudent.enrolledClassIds.length > 0) {
      if (!selectedStudent.enrolledClassIds.includes(posClassId)) {
        setPosClassId(selectedStudent.enrolledClassIds[0]);
      }
      setPosCardTier(selectedStudent.cardTier);
    }
  }, [selectedStudent, posClassId]);

  const posFilteredStudents = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    return students.filter(
      (s) =>
        s.studentCode.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q)
    );
  }, [students, posSearch]);

  const executeCheckIn = async (codeOverride?: string) => {
    const code = (codeOverride ?? scanInput).trim();
    if (!code) return;
    const res = await recordQuickCheckIn(code, scanClassId || classes[0]?.classId || '');
    setScanResult(res);
    if (res.ok) {
      const isGood = res.feeStatus !== 'overdue';
      playCheckInChime(isGood);
      setScanInput('');
    } else {
      playCheckInChime(false);
    }
    scannerInputRef.current?.focus();
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCheckIn();
  };

  const handleJumpToCollectOverdue = () => {
    if (scanResult?.student && scanResult?.tuitionClass) {
      setSelectedStudentId(scanResult.student.studentId);
      setPosClassId(scanResult.tuitionClass.classId);
      setPosMonthKey(getCurrentMonthKey());
      setPosCardTier(scanResult.student.cardTier);
      setSubView('pos');
    }
  };

  const posSelectedClass =
    classes.find((c) => c.classId === posClassId) ||
    classes.find((c) => selectedStudent?.enrolledClassIds.includes(c.classId)) ||
    classes[0];

  const computedPosAmount = useMemo(() => {
    if (!posSelectedClass) return 0;
    if (posCardTier === 'admission') return posSelectedClass.admissionFeeLkr;
    if (posCardTier === 'free') return 0;
    if (posCardTier === 'half') return Math.round(posSelectedClass.monthlyFeeLkr * 0.5);
    return posSelectedClass.monthlyFeeLkr;
  }, [posSelectedClass, posCardTier]);

  const handleCollectPayment = async () => {
    if (!selectedStudent || !posSelectedClass) return;
    const monthObj = MONTHS_2026.find((m) => m.key === posMonthKey);
    const receipt = await collectFeePayment({
      student: selectedStudent,
      tuitionClass: posSelectedClass,
      monthKey: posCardTier === 'admission' ? 'ADMISSION' : posMonthKey,
      monthLabel: posCardTier === 'admission' ? 'Admission Fee' : monthObj?.label || getCurrentMonthLabel(),
      cardTier: posCardTier,
      amountLkr: computedPosAmount,
      paymentMethod: posMethod,
    });
    setLastReceipt(receipt);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    if (!validateSriLankanPhone(newPhone) || !validateSriLankanPhone(newParentPhone)) {
      setEnrollError('Please enter valid Sri Lankan mobile numbers (+94 7X XXX XXXX).');
      return;
    }
    if (!validateNic(newNic)) {
      setEnrollError('NIC must be 9 digits followed by V/X or a 12-digit number.');
      return;
    }
    const enrolled = await enrollStudent({
      fullName: newName.trim(),
      nic: newNic.trim().toUpperCase(),
      phone: normalizeSriLankanPhone(newPhone),
      parentName: newParentName.trim(),
      parentPhone: normalizeSriLankanPhone(newParentPhone),
      school: newSchool.trim(),
      grade: newGrade,
      stream: newStream,
      medium: newMedium,
      enrolledClassIds: newEnrolledIds.length > 0 ? newEnrolledIds : classes.slice(0, 1).map((c) => c.classId),
      cardTier: newCardTier,
      admissionPaid: false,
      portalPin: '2026',
      status: 'active',
    });
    setNewlyEnrolledStudent(enrolled);
    setNewName('');
    setNewNic('');
    setNewPhone('');
    setNewParentName('');
    setNewParentPhone('');
    setNewSchool('');
    setNewEnrolledIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Reception Counter &amp; Gate Check-In
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Keyboard-first QR scanner, instant monthly card POS, and thermal receipt printing.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setSubView('checkin')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subView === 'checkin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Quick Check-In
          </button>
          <button
            type="button"
            onClick={() => setSubView('pos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subView === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Fee POS
          </button>
          <button
            type="button"
            onClick={() => setSubView('enroll')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subView === 'enroll' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Enroll &amp; ID Card
          </button>
        </div>
      </div>

      {/* VIEW 1: QUICK CHECK-IN SCANNER */}
      {subView === 'checkin' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <form onSubmit={handleScanSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Active Class Session
                </label>
                <select
                  value={scanClassId}
                  onChange={(e) => setScanClassId(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Scan QR / Barcode or Type Student ID (Press Enter)
                </label>
                <input
                  ref={scannerInputRef}
                  type="text"
                  autoFocus
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="e.g. STU-2026-1001 or STU-2026-1003"
                  className="w-full px-4 py-3 text-base font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Check In
                </button>
              </div>
            </form>

            {/* Quick Scan Sample Shortcuts for Rapid Testing */}
            {students.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Quick scan test:</span>
                {students.slice(0, 4).map((s) => (
                  <button
                    key={s.studentId}
                    type="button"
                    onClick={() => void executeCheckIn(s.studentCode)}
                    className="px-2.5 py-1 font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 cursor-pointer"
                  >
                    {s.studentCode}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Instant GREEN / RED Status Flash Banner */}
          {scanResult && (
            <div
              role="status"
              className={`rounded-xl p-6 border-2 ${
                !scanResult.ok || scanResult.feeStatus === 'overdue'
                  ? 'bg-rose-50 border-rose-500 text-rose-950'
                  : 'bg-emerald-50 border-emerald-500 text-emerald-950'
              }`}
            >
              {!scanResult.ok ? (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-display text-lg font-bold">Student Lookup Failed</p>
                    <p className="text-sm">{scanResult.error}</p>
                  </div>
                </div>
              ) : scanResult.feeStatus === 'overdue' ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-10 h-10 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                        FEE OVERDUE / UNPAID FOR {getCurrentMonthLabel().toUpperCase()}
                      </p>
                      <h2 className="font-display text-2xl font-bold mt-0.5">
                        {scanResult.student?.fullName} ({scanResult.student?.studentCode})
                      </h2>
                      <p className="text-sm mt-1">
                        {scanResult.tuitionClass?.title} · Arrears Due:{' '}
                        <span className="font-mono font-bold text-rose-700">
                          {formatLkr(scanResult.arrearsLkr || 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleJumpToCollectOverdue}
                    className="px-5 py-3 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Collect {formatLkr(scanResult.arrearsLkr || 0)} Now →
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      {scanResult.feeStatus === 'free_card'
                        ? 'FREE CARD · CLEARED FOR ENTRY'
                        : scanResult.feeStatus === 'half_card'
                        ? `HALF CARD PAID FOR ${getCurrentMonthLabel().toUpperCase()}`
                        : `PAID FOR ${getCurrentMonthLabel().toUpperCase()}`}
                    </p>
                    <h2 className="font-display text-2xl font-bold mt-0.5">
                      {scanResult.student?.fullName} ({scanResult.student?.studentCode})
                    </h2>
                    <p className="text-sm mt-1 text-emerald-900">
                      Attendance marked in {scanResult.tuitionClass?.title} · {scanResult.tuitionClass?.hallName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Check-In Log */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">Recent Gate Check-Ins</h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {attendance.length} logs
              </span>
            </div>
            <div className="divide-y divide-slate-200">
              {attendance.slice(0, 10).map((att) => (
                <div key={att.attendanceId} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">
                      <span className="font-mono text-xs text-indigo-700 mr-2">{att.studentCode}</span>
                      {att.studentName}
                    </p>
                    <p className="text-xs text-slate-500">{att.className}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        att.feeStatus === 'overdue' ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {att.feeStatus === 'overdue'
                        ? `Overdue (${formatLkr(att.arrearsLkr)})`
                        : att.feeStatus === 'half_card'
                        ? 'Half Card Paid'
                        : att.feeStatus === 'free_card'
                        ? 'Free Card'
                        : 'Paid'}
                    </span>
                    <p className="text-[11px] text-slate-400 font-mono">{String(att.createdAt || 'Today')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FEE COLLECTION POS & THERMAL RECEIPT */}
      {subView === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Student Selector */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="Find STU-2026 ID or name..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="divide-y divide-slate-200 max-h-[420px] overflow-y-auto">
              {posFilteredStudents.map((stu) => {
                const active = selectedStudent?.studentId === stu.studentId;
                return (
                  <button
                    key={stu.studentId}
                    type="button"
                    onClick={() => setSelectedStudentId(stu.studentId)}
                    className={`w-full text-left py-3 px-2.5 rounded-lg transition-colors cursor-pointer ${
                      active ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-mono text-xs font-semibold text-indigo-700">{stu.studentCode}</p>
                    <p className="text-sm font-semibold text-slate-900">{stu.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {stu.grade} · {stu.cardTier} card
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Card POS + Thermal Receipt */}
          <div className="lg:col-span-8 space-y-6">
            {selectedStudent && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <p className="font-mono text-xs font-semibold text-indigo-700">
                      {selectedStudent.studentCode}
                    </p>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      {selectedStudent.fullName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selectedStudent.stream} · {selectedStudent.medium} Medium · Parent:{' '}
                      {selectedStudent.parentPhone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-700">
                      Admission: {selectedStudent.admissionPaid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* 12-Month Class Card Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Select Class for Monthly Card Issuance
                    </label>
                    <select
                      value={posClassId}
                      onChange={(e) => setPosClassId(e.target.value)}
                      className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                    >
                      {classes
                        .filter((c) => selectedStudent.enrolledClassIds.includes(c.classId))
                        .map((c) => (
                          <option key={c.classId} value={c.classId}>
                            {c.title} ({formatLkr(c.monthlyFeeLkr)})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                    {MONTHS_2026.map((m) => {
                      const isPaid = feePayments.some(
                        (p) =>
                          p.studentId === selectedStudent.studentId &&
                          p.classId === posSelectedClass?.classId &&
                          p.monthKey === m.key
                      );
                      const isSelected = posMonthKey === m.key && posCardTier !== 'admission';
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setPosMonthKey(m.key);
                            if (posCardTier === 'admission') setPosCardTier(selectedStudent.cardTier);
                          }}
                          className={`p-2 rounded-lg border text-center transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50'
                              : isPaid
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <p className="text-xs font-semibold">{m.short}</p>
                          <p className="text-[11px] font-medium mt-0.5">
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Card / Fee Type
                    </label>
                    <select
                      value={posCardTier}
                      onChange={(e) => setPosCardTier(e.target.value as CardTier | 'admission')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="full">Full Card (100%)</option>
                      <option value="half">Half Card (50%)</option>
                      <option value="free">Free Card (Rs. 0)</option>
                      <option value="admission">Admission Fee</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Payment Method
                    </label>
                    <select
                      value={posMethod}
                      onChange={(e) => setPosMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card Terminal</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => void handleCollectPayment()}
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Issue Card · {formatLkr(computedPosAmount)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Printable 80mm Thermal-Style Receipt */}
            {lastReceipt && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Thermal Receipt Preview (80mm)
                  </h3>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Receipt
                  </button>
                </div>

                <div className="printable-receipt max-w-[300px] mx-auto border border-dashed border-slate-300 rounded-lg p-4 font-mono text-xs text-slate-900 space-y-2 bg-slate-50">
                  <div className="text-center border-b border-dashed border-slate-300 pb-2">
                    <p className="font-bold text-sm">{activeInstitute?.name || 'Apex Academy'}</p>
                    <p>{activeInstitute?.city}, Sri Lanka</p>
                    <p>{activeInstitute?.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Receipt:</span>
                      <span className="font-bold">{lastReceipt.receiptNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Student:</span>
                      <span>{lastReceipt.studentCode}</span>
                    </div>
                    <p className="font-semibold">{lastReceipt.studentName}</p>
                    <p className="text-[11px]">{lastReceipt.className}</p>
                  </div>
                  <div className="border-y border-dashed border-slate-300 py-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Card Month:</span>
                      <span>{lastReceipt.monthLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card Tier:</span>
                      <span className="uppercase">{lastReceipt.cardTier}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1">
                      <span>TOTAL PAID:</span>
                      <span>{formatLkr(lastReceipt.amountLkr)}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-center text-slate-600 pt-1">
                    <p>Method: {lastReceipt.paymentMethod.toUpperCase()}</p>
                    <p>Cashier: {lastReceipt.collectedByName}</p>
                    <p className="mt-1">Thank you for learning with us.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: ENROLLMENT & QR ID CARD GENERATOR */}
      {subView === 'enroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleEnrollSubmit}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-900">
              New Student Enrollment
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Tharindu Perera"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIC (Optional for O/L)
                </label>
                <input
                  type="text"
                  value={newNic}
                  onChange={(e) => setNewNic(e.target.value)}
                  placeholder="200712345678 or 991234567V"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Mobile</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Name</label>
                <input
                  type="text"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="Sunil Perera"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={newParentPhone}
                  onChange={(e) => setNewParentPhone(e.target.value)}
                  placeholder="+94 71 987 6543"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {ACADEMIC_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select
                value={newStream}
                onChange={(e) => setNewStream(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {ACADEMIC_STREAMS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={newMedium}
                onChange={(e) => setNewMedium(e.target.value as AcademicMedium)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {ACADEMIC_MEDIUMS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={newCardTier}
                onChange={(e) => setNewCardTier(e.target.value as CardTier)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="full">Full Card</option>
                <option value="half">Half Card</option>
                <option value="free">Free Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">School</label>
              <input
                type="text"
                value={newSchool}
                onChange={(e) => setNewSchool(e.target.value)}
                placeholder="e.g. Ananda College, Colombo 10"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Classes to Enroll
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {classes.map((cls) => {
                  const checked = newEnrolledIds.includes(cls.classId);
                  return (
                    <label
                      key={cls.classId}
                      className={`flex items-center gap-2.5 p-2.5 border rounded-lg text-xs cursor-pointer ${
                        checked ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setNewEnrolledIds((prev) =>
                            prev.includes(cls.classId)
                              ? prev.filter((id) => id !== cls.classId)
                              : [...prev, cls.classId]
                          )
                        }
                      />
                      <span className="font-medium text-slate-800 truncate">{cls.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {enrollError && <p className="text-xs text-rose-600">{enrollError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Register Student &amp; Generate QR ID Card
            </button>
          </form>

          {/* QR Student ID Card Generator Preview */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            {(() => {
              const cardStudent = newlyEnrolledStudent || students[0];
              if (!cardStudent) return null;
              return (
                <>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Digital &amp; Printable QR Student ID
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scan directly at the Quick Check-In gate terminal
                    </p>

                    <div className="mt-5 border border-slate-200 rounded-xl p-5 bg-slate-50">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <p className="font-display font-bold text-sm text-indigo-700">
                            {activeInstitute?.name || 'Apex Academy - Colombo'}
                          </p>
                          <p className="text-[11px] text-slate-500">Student Gate Pass · 2026</p>
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {cardStudent.studentCode}
                        </span>
                      </div>

                      <div className="py-5 flex items-center gap-5">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shrink-0">
                          <QRCodeSVG value={cardStudent.studentCode} size={96} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="font-display font-bold text-base text-slate-900 truncate">
                            {cardStudent.fullName}
                          </p>
                          <p className="text-xs text-slate-600">
                            {cardStudent.grade} · {cardStudent.stream}
                          </p>
                          <p className="text-xs text-slate-500">{cardStudent.medium} Medium</p>
                          <p className="text-xs font-mono text-slate-700 pt-1">
                            PIN: {cardStudent.portalPin}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setScanInput(cardStudent.studentCode);
                      setSubView('checkin');
                    }}
                    className="mt-5 w-full py-2.5 px-4 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 cursor-pointer"
                  >
                    Test {cardStudent.studentCode} in Quick Check-In →
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
