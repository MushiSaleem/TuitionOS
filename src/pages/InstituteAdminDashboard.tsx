import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Plus, Search, Sparkles } from 'lucide-react';
import { useTuition } from '@/src/context/TuitionContext';
import {
  ACADEMIC_GRADES,
  ACADEMIC_MEDIUMS,
  ACADEMIC_STREAMS,
  AcademicMedium,
  CLASS_TYPES,
  ClassType,
  MONTHS_2026,
} from '@/src/types/tuition';
import {
  formatLkr,
  formatLkrCompact,
  getCurrentMonthKey,
  normalizeSriLankanPhone,
  validateNic,
  validateSriLankanPhone,
} from '@/src/utils/sriLanka';

export function InstituteAdminDashboard() {
  const {
    mode,
    activeInstitute,
    staff,
    classes,
    batches,
    students,
    feePayments,
    seedLiveInstituteSampleData,
    createStaffMember,
    createTuitionClass,
    createClassBatch,
  } = useTuition();

  const [tab, setTab] = useState<'overview' | 'classes' | 'staff' | 'students'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Add Class form state
  const [showAddClass, setShowAddClass] = useState(false);
  const [clsTitle, setClsTitle] = useState('');
  const [clsSubject, setClsSubject] = useState('');
  const [clsGrade, setClsGrade] = useState<string>('Grade 13 (A/L)');
  const [clsStream, setClsStream] = useState<string>('Physical Science');
  const [clsMedium, setClsMedium] = useState<AcademicMedium>('Sinhala');
  const [clsType, setClsType] = useState<ClassType>('Theory');
  const [clsLecturerId, setClsLecturerId] = useState('');
  const [clsSharePct, setClsSharePct] = useState('70');
  const [clsMonthlyFee, setClsMonthlyFee] = useState('3500');
  const [clsAdmissionFee, setClsAdmissionFee] = useState('1500');
  const [clsHall, setClsHall] = useState('Hall A');
  const [clsDay, setClsDay] = useState('Saturday');
  const [clsTime, setClsTime] = useState('08:00 AM - 12:00 PM');

  // Add Staff form state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [stfName, setStfName] = useState('');
  const [stfEmail, setStfEmail] = useState('');
  const [stfPhone, setStfPhone] = useState('');
  const [stfNic, setStfNic] = useState('');
  const [stfRole, setStfRole] = useState<'lecturer' | 'receptionist'>('lecturer');
  const [stfSpecialty, setStfSpecialty] = useState('');
  const [stfSharePct, setStfSharePct] = useState('70');
  const [staffError, setStaffError] = useState<string | null>(null);

  // Add Batch form state
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [batClassId, setBatClassId] = useState('');
  const [batCode, setBatCode] = useState('');
  const [batHall, setBatHall] = useState('Hall A');
  const [batDay, setBatDay] = useState('Saturday');
  const [batStart, setBatStart] = useState('08:00 AM');
  const [batEnd, setBatEnd] = useState('12:00 PM');
  const [batCap, setBatCap] = useState('120');

  const currentMonthKey = getCurrentMonthKey();

  const financialStats = useMemo(() => {
    const novPayments = feePayments.filter((p) => p.monthKey === currentMonthKey);
    const totalCollected = novPayments.reduce((s, p) => s + p.amountLkr, 0);
    const lecturerShare = novPayments.reduce((s, p) => s + p.lecturerShareLkr, 0);
    const instituteShare = novPayments.reduce((s, p) => s + p.instituteShareLkr, 0);

    // Count overdue class cards for current month
    let overdueCards = 0;
    let overdueAmount = 0;
    for (const stu of students) {
      if (stu.cardTier === 'free') continue;
      for (const clsId of stu.enrolledClassIds) {
        const cls = classes.find((c) => c.classId === clsId);
        if (!cls) continue;
        const paid = novPayments.some((p) => p.studentId === stu.studentId && p.classId === clsId);
        if (!paid) {
          overdueCards += 1;
          overdueAmount += stu.cardTier === 'half' ? cls.monthlyFeeLkr * 0.5 : cls.monthlyFeeLkr;
        }
      }
    }

    return {
      totalCollected,
      lecturerShare,
      instituteShare,
      overdueCards,
      overdueAmount,
    };
  }, [feePayments, students, classes, currentMonthKey]);

  const monthlyChartData = useMemo(() => {
    const targetMonths = [
      { key: '2026-09', label: 'Sep 2026' },
      { key: '2026-10', label: 'Oct 2026' },
      { key: '2026-11', label: 'Nov 2026' },
    ];
    return targetMonths.map((m) => {
      const items = feePayments.filter((p) => p.monthKey === m.key);
      return {
        month: m.label,
        'Lecturer Payouts': items.reduce((s, p) => s + p.lecturerShareLkr, 0),
        'Institute Share': items.reduce((s, p) => s + p.instituteShareLkr, 0),
      };
    });
  }, [feePayments]);

  const lecturerSplitSummary = useMemo(() => {
    const lecturers = staff.filter((s) => s.role === 'lecturer');
    return lecturers.map((lec) => {
      const lecPayments = feePayments.filter(
        (p) => p.lecturerId === lec.staffId && p.monthKey === currentMonthKey
      );
      const gross = lecPayments.reduce((s, p) => s + p.amountLkr, 0);
      const payout = lecPayments.reduce((s, p) => s + p.lecturerShareLkr, 0);
      const retained = lecPayments.reduce((s, p) => s + p.instituteShareLkr, 0);
      return {
        lecturer: lec,
        receiptsCount: lecPayments.length,
        gross,
        payout,
        retained,
      };
    });
  }, [staff, feePayments, currentMonthKey]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.nic || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const exportMonthlyReportCsv = () => {
    const rows = [
      ['Receipt No', 'Month', 'Student ID', 'Student Name', 'Class', 'Lecturer', 'Card Tier', 'Amount (LKR)', 'Lecturer Share (LKR)', 'Institute Share (LKR)', 'Method'],
      ...feePayments.map((p) => [
        p.receiptNo,
        p.monthLabel,
        p.studentCode,
        p.studentName,
        p.className,
        p.lecturerName,
        p.cardTier,
        String(p.amountLkr),
        String(p.lecturerShareLkr),
        String(p.instituteShareLkr),
        p.paymentMethod,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tuitionos-financial-ledger-${currentMonthKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const lecturer = staff.find((s) => s.staffId === clsLecturerId) || staff.find((s) => s.role === 'lecturer');
    if (!lecturer) return;
    await createTuitionClass({
      title: clsTitle.trim(),
      subject: clsSubject.trim(),
      grade: clsGrade,
      stream: clsStream,
      medium: clsMedium,
      classType: clsType,
      lecturerId: lecturer.staffId,
      lecturerName: lecturer.fullName,
      lecturerSharePct: Number(clsSharePct) || 70,
      monthlyFeeLkr: Number(clsMonthlyFee) || 3500,
      admissionFeeLkr: Number(clsAdmissionFee) || 1500,
      hallName: clsHall.trim(),
      scheduleDay: clsDay,
      scheduleTime: clsTime.trim(),
      status: 'active',
    });
    setShowAddClass(false);
    setClsTitle('');
    setClsSubject('');
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    if (!validateSriLankanPhone(stfPhone)) {
      setStaffError('Enter a valid Sri Lankan mobile number (+94 7X XXX XXXX).');
      return;
    }
    if (!validateNic(stfNic) || !stfNic.trim()) {
      setStaffError('Enter a valid Sri Lankan NIC (9 digits + V/X or 12 digits).');
      return;
    }
    await createStaffMember({
      fullName: stfName.trim(),
      email: stfEmail.trim().toLowerCase(),
      phone: normalizeSriLankanPhone(stfPhone),
      nic: stfNic.trim().toUpperCase(),
      role: stfRole,
      subjectSpecialty: stfSpecialty.trim() || (stfRole === 'receptionist' ? 'Front-Desk POS' : 'General'),
      defaultSharePct: stfRole === 'lecturer' ? Number(stfSharePct) || 70 : 0,
      status: 'active',
    });
    setShowAddStaff(false);
    setStfName('');
    setStfEmail('');
    setStfPhone('');
    setStfNic('');
    setStfSpecialty('');
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls = classes.find((c) => c.classId === batClassId) || classes[0];
    if (!cls) return;
    await createClassBatch({
      classId: cls.classId,
      className: cls.title,
      batchCode: batCode.trim().toUpperCase(),
      academicYear: '2026',
      hallName: batHall.trim(),
      dayOfWeek: batDay,
      startTime: batStart.trim(),
      endTime: batEnd.trim(),
      capacity: Number(batCap) || 100,
      enrolledCount: 0,
      status: 'active',
    });
    setShowAddBatch(false);
    setBatCode('');
  };

  const handleSeedLive = async () => {
    setSeeding(true);
    try {
      await seedLiveInstituteSampleData();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            {activeInstitute?.name || 'Institute Overview'}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {activeInstitute ? `${activeInstitute.city}, ${activeInstitute.district} · ` : ''}
            Monthly financial splits, class schedules, and student rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'live_firebase' && classes.length === 0 && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedLive}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {seeding ? 'Seeding Data...' : 'Seed Sample Sri Lankan Data'}
            </button>
          )}
          <button
            type="button"
            onClick={exportMonthlyReportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export LKR Ledger CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">November Collections</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatLkr(financialStats.totalCollected)}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">Gross class fee receipts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Lecturer Payouts Due</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatLkr(financialStats.lecturerShare)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Revenue share allocation</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Net Institute Retention</p>
          <p className="mt-2 font-mono text-2xl font-bold text-indigo-600 tabular-nums">
            {formatLkr(financialStats.instituteShare)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Hall &amp; operations margin</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Overdue Monthly Cards</p>
          <p className="mt-2 font-mono text-2xl font-bold text-rose-600 tabular-nums">
            {financialStats.overdueCards} cards
          </p>
          <p className="mt-1 text-xs text-rose-700 font-mono tabular-nums">
            {formatLkr(financialStats.overdueAmount)} pending
          </p>
        </div>
      </div>

      {/* Segmented Workspace Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {[
          { id: 'overview', label: 'Financial Reports' },
          { id: 'classes', label: `Classes & Batches (${classes.length})` },
          { id: 'staff', label: `Lecturers & Staff (${staff.length})` },
          { id: 'students', label: `Students (${students.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === item.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Financial Reports */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-slate-900">
              Monthly Revenue vs. Lecturer Splits (LKR)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Last 3 months split between lecturer commissions and institute retention
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                  <Tooltip
                    formatter={(value) => formatLkrCompact(Number(value ?? 0))}
                    contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Lecturer Payouts" stackId="a" fill="#4F46E5" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Institute Share" stackId="a" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-slate-900">
              November Lecturer Commission Split
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Calculated automatically from collected class cards
            </p>
            <div className="divide-y divide-slate-200">
              {lecturerSplitSummary.map(({ lecturer, receiptsCount, gross, payout, retained }) => (
                <div key={lecturer.staffId} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{lecturer.fullName}</p>
                    <span className="font-mono text-sm font-bold text-indigo-600 tabular-nums">
                      {formatLkr(payout)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {lecturer.subjectSpecialty} · {lecturer.defaultSharePct}% share ({receiptsCount} cards)
                    </span>
                    <span className="font-mono tabular-nums">
                      Gross {formatLkrCompact(gross)} · Inst {formatLkrCompact(retained)}
                    </span>
                  </div>
                </div>
              ))}
              {lecturerSplitSummary.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Add lecturers and collect class fees to see commission splits.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Classes & Batches */}
      {tab === 'classes' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900">Subject Classes</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddBatch(!showAddBatch)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Batch
              </button>
              <button
                type="button"
                onClick={() => setShowAddClass(!showAddClass)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Class
              </button>
            </div>
          </div>

          {showAddClass && (
            <form
              onSubmit={handleAddClass}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="font-display text-sm font-bold text-slate-900">Create Subject Class</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={clsTitle}
                  onChange={(e) => setClsTitle(e.target.value)}
                  placeholder="Class Title (e.g. 2026 A/L Biology)"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={clsSubject}
                  onChange={(e) => setClsSubject(e.target.value)}
                  placeholder="Subject (e.g. Biology)"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <select
                  value={clsLecturerId}
                  onChange={(e) => setClsLecturerId(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Select Lecturer...</option>
                  {staff
                    .filter((s) => s.role === 'lecturer')
                    .map((l) => (
                      <option key={l.staffId} value={l.staffId}>
                        {l.fullName} ({l.defaultSharePct}%)
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <select
                  value={clsGrade}
                  onChange={(e) => setClsGrade(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {ACADEMIC_GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={clsStream}
                  onChange={(e) => setClsStream(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {ACADEMIC_STREAMS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={clsMedium}
                  onChange={(e) => setClsMedium(e.target.value as AcademicMedium)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {ACADEMIC_MEDIUMS.map((m) => (
                    <option key={m} value={m}>{m} Medium</option>
                  ))}
                </select>
                <select
                  value={clsType}
                  onChange={(e) => setClsType(e.target.value as ClassType)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {CLASS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <input
                  type="number"
                  required
                  value={clsMonthlyFee}
                  onChange={(e) => setClsMonthlyFee(e.target.value)}
                  placeholder="Monthly Fee (LKR)"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
                <input
                  type="number"
                  required
                  value={clsAdmissionFee}
                  onChange={(e) => setClsAdmissionFee(e.target.value)}
                  placeholder="Admission (LKR)"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={clsSharePct}
                  onChange={(e) => setClsSharePct(e.target.value)}
                  placeholder="Lecturer %"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
                <input
                  type="text"
                  required
                  value={clsHall}
                  onChange={(e) => setClsHall(e.target.value)}
                  placeholder="Hall Name"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={clsTime}
                  onChange={(e) => setClsTime(e.target.value)}
                  placeholder="Time Slot"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClass(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  Save Class
                </button>
              </div>
            </form>
          )}

          {showAddBatch && (
            <form
              onSubmit={handleAddBatch}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="font-display text-sm font-bold text-slate-900">Schedule Timetable Batch</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={batClassId}
                  onChange={(e) => setBatClassId(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {classes.map((c) => (
                    <option key={c.classId} value={c.classId}>{c.title}</option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={batCode}
                  onChange={(e) => setBatCode(e.target.value)}
                  placeholder="Batch Code (e.g. BIO-26-SUN)"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
                <input
                  type="text"
                  required
                  value={batHall}
                  onChange={(e) => setBatHall(e.target.value)}
                  placeholder="Hall"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  required
                  value={batCap}
                  onChange={(e) => setBatCap(e.target.value)}
                  placeholder="Capacity"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={batDay}
                  onChange={(e) => setBatDay(e.target.value)}
                  placeholder="Day of Week"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={batStart}
                  onChange={(e) => setBatStart(e.target.value)}
                  placeholder="Start Time"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={batEnd}
                  onChange={(e) => setBatEnd(e.target.value)}
                  placeholder="End Time"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatch(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  Save Batch
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Class Title</th>
                    <th className="py-3 px-4">Stream / Medium</th>
                    <th className="py-3 px-4">Lecturer</th>
                    <th className="py-3 px-4">Schedule &amp; Hall</th>
                    <th className="py-3 px-4 text-right">Split %</th>
                    <th className="py-3 px-4 text-right">Monthly Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {classes.map((cls) => (
                    <tr key={cls.classId} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{cls.title}</p>
                        <p className="text-xs text-slate-500">
                          {cls.grade} · {cls.classType}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {cls.stream} · {cls.medium}
                      </td>
                      <td className="py-3 px-4 text-slate-800">{cls.lecturerName}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {cls.scheduleDay} · {cls.scheduleTime}
                        <br />
                        <span className="text-slate-500">{cls.hallName}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {cls.lecturerSharePct}% / {100 - cls.lecturerSharePct}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {formatLkr(cls.monthlyFeeLkr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-semibold text-slate-700">Hall Timetable Batches ({batches.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Batch Code</th>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4">Hall</th>
                    <th className="py-2.5 px-4">Day &amp; Time</th>
                    <th className="py-2.5 px-4 text-right">Occupancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {batches.map((b) => (
                    <tr key={b.batchId}>
                      <td className="py-2.5 px-4 font-mono font-semibold text-indigo-700">{b.batchCode}</td>
                      <td className="py-2.5 px-4 text-slate-800">{b.className}</td>
                      <td className="py-2.5 px-4 text-slate-600">{b.hallName}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {b.dayOfWeek} · {b.startTime} – {b.endTime}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {b.enrolledCount} / {b.capacity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Staff & Lecturers */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900">Lecturers &amp; Counter Staff</h2>
            <button
              type="button"
              onClick={() => setShowAddStaff(!showAddStaff)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Staff / Lecturer
            </button>
          </div>

          {showAddStaff && (
            <form
              onSubmit={handleAddStaff}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={stfName}
                  onChange={(e) => setStfName(e.target.value)}
                  placeholder="Full Name"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="email"
                  required
                  value={stfEmail}
                  onChange={(e) => setStfEmail(e.target.value)}
                  placeholder="Google / Login Email"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="tel"
                  required
                  value={stfPhone}
                  onChange={(e) => setStfPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <input
                  type="text"
                  required
                  value={stfNic}
                  onChange={(e) => setStfNic(e.target.value)}
                  placeholder="NIC (e.g. 881234567V)"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
                <select
                  value={stfRole}
                  onChange={(e) => setStfRole(e.target.value as 'lecturer' | 'receptionist')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="lecturer">Lecturer</option>
                  <option value="receptionist">Reception / Counter</option>
                </select>
                <input
                  type="text"
                  value={stfSpecialty}
                  onChange={(e) => setStfSpecialty(e.target.value)}
                  placeholder="Subject Specialty"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={stfSharePct}
                  onChange={(e) => setStfSharePct(e.target.value)}
                  placeholder="Revenue Share %"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
              {staffError && <p className="text-xs text-rose-600">{staffError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaff(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  Save &amp; Invite Staff
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Role &amp; Specialty</th>
                    <th className="py-3 px-4">NIC</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4 text-right">Default Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {staff.map((member) => (
                    <tr key={member.staffId} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{member.fullName}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 capitalize">
                        {member.role.replace('_', ' ')} · {member.subjectSpecialty}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{member.nic}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{member.phone}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                        {member.role === 'lecturer' ? `${member.defaultSharePct}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Students Directory & 12-Month Class Card Status */}
      {tab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Enrolled Students &amp; Card Matrix
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search STU-2026 ID, name, NIC..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Student Name &amp; School</th>
                    <th className="py-3 px-4">Stream / Medium</th>
                    <th className="py-3 px-4">Card Tier</th>
                    <th className="py-3 px-4">Sep / Oct / Nov Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredStudents.map((stu) => {
                    const recentMonths = MONTHS_2026.slice(8, 11);
                    return (
                      <tr key={stu.studentId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-700 whitespace-nowrap">
                          {stu.studentCode}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{stu.fullName}</p>
                          <p className="text-xs text-slate-500">
                            {stu.school || 'Colombo'} · {stu.phone}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {stu.grade} · {stu.stream}
                          <br />
                          <span className="text-slate-500">{stu.medium} Medium</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold capitalize text-slate-800">
                          {stu.cardTier} card
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            {recentMonths.map((m) => {
                              const paidCount = feePayments.filter(
                                (p) => p.studentId === stu.studentId && p.monthKey === m.key
                              ).length;
                              const isFull =
                                stu.cardTier === 'free' || paidCount >= stu.enrolledClassIds.length;
                              return (
                                <span
                                  key={m.key}
                                  className={`px-2 py-0.5 rounded border ${
                                    isFull
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {m.short}: {isFull ? 'Paid' : 'Due'}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
