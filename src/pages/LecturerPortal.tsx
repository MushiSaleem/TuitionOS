import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BookOpen, ExternalLink, FileText, Plus, Trash2 } from 'lucide-react';
import { useTuition } from '@/src/context/TuitionContext';
import { ExamGrade, MaterialType } from '@/src/types/tuition';
import { calculateGrade, formatLkr, getCurrentMonthKey } from '@/src/utils/sriLanka';

export function LecturerPortal() {
  const {
    mode,
    userProfile,
    staff,
    classes,
    students,
    feePayments,
    attendance,
    exams,
    examMarks,
    studyMaterials,
    demoLecturerId,
    setDemoLecturerId,
    createExam,
    saveExamMarksBulk,
    createStudyMaterial,
    deleteStudyMaterial,
  } = useTuition();

  const lecturers = useMemo(() => staff.filter((s) => s.role === 'lecturer'), [staff]);

  const activeLecturerId = useMemo(() => {
    if (mode === 'demo_sandbox') return demoLecturerId;
    if (userProfile?.role === 'lecturer' && userProfile.linkedEntityId) {
      return userProfile.linkedEntityId;
    }
    return lecturers[0]?.staffId || '';
  }, [mode, demoLecturerId, userProfile, lecturers]);

  const myClasses = useMemo(() => {
    if (userProfile?.role === 'institute_admin') return classes;
    return classes.filter((c) => c.lecturerId === activeLecturerId);
  }, [classes, activeLecturerId, userProfile]);

  const [tab, setTab] = useState<'overview' | 'exams' | 'materials'>('overview');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [bulkMarksDraft, setBulkMarksDraft] = useState<Record<string, string>>({});
  const [savedNotice, setSavedNotice] = useState(false);

  // Create Exam form
  const [showNewExam, setShowNewExam] = useState(false);
  const [exTitle, setExTitle] = useState('');
  const [exClassId, setExClassId] = useState('');
  const [exDate, setExDate] = useState('2026-11-13');
  const [exMax, setExMax] = useState('100');

  // Study Material form
  const [matClassId, setMatClassId] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<MaterialType>('PDF Notes');
  const [matUrl, setMatUrl] = useState('');
  const [matDesc, setMatDesc] = useState('');

  const myExams = useMemo(() => {
    const classIds = new Set(myClasses.map((c) => c.classId));
    return exams.filter((e) => classIds.has(e.classId));
  }, [exams, myClasses]);

  useEffect(() => {
    if (!selectedExamId && myExams[0]) {
      setSelectedExamId(myExams[0].examId);
    } else if (selectedExamId && !myExams.some((e) => e.examId === selectedExamId)) {
      setSelectedExamId(myExams[0]?.examId || '');
    }
  }, [myExams, selectedExamId]);

  useEffect(() => {
    if (!exClassId && myClasses[0]) setExClassId(myClasses[0].classId);
    if (!matClassId && myClasses[0]) setMatClassId(myClasses[0].classId);
  }, [myClasses, exClassId, matClassId]);

  const currentExam = myExams.find((e) => e.examId === selectedExamId) || myExams[0];

  const enrolledInCurrentExamClass = useMemo(() => {
    if (!currentExam) return [];
    return students.filter((s) => s.enrolledClassIds.includes(currentExam.classId));
  }, [currentExam, students]);

  useEffect(() => {
    if (!currentExam) return;
    const draft: Record<string, string> = {};
    enrolledInCurrentExamClass.forEach((stu) => {
      const existing = examMarks.find(
        (m) => m.examId === currentExam.examId && m.studentId === stu.studentId
      );
      draft[stu.studentId] = existing ? String(existing.marksObtained) : '';
    });
    setBulkMarksDraft(draft);
  }, [currentExam, enrolledInCurrentExamClass, examMarks]);

  const rankedExamResults = useMemo(() => {
    if (!currentExam) return [];
    const list = examMarks
      .filter((m) => m.examId === currentExam.examId)
      .sort((a, b) => b.marksObtained - a.marksObtained);
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [currentExam, examMarks]);

  const gradeDistribution = useMemo(() => {
    const counts: Record<ExamGrade, number> = { A: 0, B: 0, C: 0, S: 0, W: 0 };
    rankedExamResults.forEach((r) => {
      counts[r.grade] = (counts[r.grade] || 0) + 1;
    });
    return (['A', 'B', 'C', 'S', 'W'] as ExamGrade[]).map((g) => ({
      grade: `Grade ${g}`,
      students: counts[g],
    }));
  }, [rankedExamResults]);

  const examAverage = useMemo(() => {
    if (rankedExamResults.length === 0) return 0;
    const total = rankedExamResults.reduce((s, r) => s + r.marksObtained, 0);
    return Math.round((total / rankedExamResults.length) * 10) / 10;
  }, [rankedExamResults]);

  const currentMonthKey = getCurrentMonthKey();

  const earningsSummary = useMemo(() => {
    const classIds = new Set(myClasses.map((c) => c.classId));
    const myPayments = feePayments.filter(
      (p) => classIds.has(p.classId) && p.monthKey === currentMonthKey
    );
    const totalPayout = myPayments.reduce((s, p) => s + p.lecturerShareLkr, 0);
    const totalGross = myPayments.reduce((s, p) => s + p.amountLkr, 0);
    const headcount = attendance.filter((a) => classIds.has(a.classId)).length;
    return {
      totalPayout,
      totalGross,
      cardsPaid: myPayments.length,
      headcount,
    };
  }, [myClasses, feePayments, attendance, currentMonthKey]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls = myClasses.find((c) => c.classId === exClassId) || myClasses[0];
    if (!cls) return;
    const created = await createExam({
      title: exTitle.trim(),
      classId: cls.classId,
      className: cls.title,
      lecturerId: cls.lecturerId,
      examDate: exDate,
      maxMarks: Number(exMax) || 100,
    });
    setSelectedExamId(created.examId);
    setShowNewExam(false);
    setExTitle('');
  };

  const handleSaveBulkMarks = async () => {
    if (!currentExam) return;
    const entries = enrolledInCurrentExamClass
      .filter((s) => bulkMarksDraft[s.studentId] !== '' && bulkMarksDraft[s.studentId] !== undefined)
      .map((s) => ({
        student: s,
        marksObtained: Math.min(currentExam.maxMarks, Math.max(0, Number(bulkMarksDraft[s.studentId]) || 0)),
      }));
    if (entries.length === 0) return;
    await saveExamMarksBulk(currentExam, entries);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls = myClasses.find((c) => c.classId === matClassId) || myClasses[0];
    if (!cls) return;
    await createStudyMaterial({
      classId: cls.classId,
      className: cls.title,
      lecturerId: cls.lecturerId,
      lecturerName: cls.lecturerName,
      title: matTitle.trim(),
      description: matDesc.trim(),
      materialType: matType,
      url: matUrl.trim(),
    });
    setMatTitle('');
    setMatUrl('');
    setMatDesc('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Lecturer Portal
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Personal fee share earnings, paper test grading with class rank, and study materials.
          </p>
        </div>

        {mode === 'demo_sandbox' && lecturers.length > 0 && (
          <select
            value={demoLecturerId}
            onChange={(e) => setDemoLecturerId(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white"
          >
            {lecturers.map((l) => (
              <option key={l.staffId} value={l.staffId}>
                Viewing as: {l.fullName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">November Lecturer Share</p>
          <p className="mt-2 font-mono text-2xl font-bold text-indigo-600 tabular-nums">
            {formatLkr(earningsSummary.totalPayout)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            From {formatLkr(earningsSummary.totalGross)} gross ({earningsSummary.cardsPaid} paid cards)
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Assigned Active Classes</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {myClasses.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Theory, Revision &amp; Paper Classes</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Live Check-In Headcount</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-600 tabular-nums">
            {earningsSummary.headcount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Scanned gate entries recorded</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Classes &amp; Earnings
        </button>
        <button
          type="button"
          onClick={() => setTab('exams')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tab === 'exams' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Exams &amp; Bulk Marks ({myExams.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('materials')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tab === 'materials' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Study Materials
        </button>
      </div>

      {/* TAB 1: Classes & Earnings */}
      {tab === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Hall &amp; Schedule</th>
                  <th className="py-3 px-4 text-right">Enrolled</th>
                  <th className="py-3 px-4 text-right">Share %</th>
                  <th className="py-3 px-4 text-right">Nov Payout (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {myClasses.map((cls) => {
                  const enrolledCount = students.filter((s) =>
                    s.enrolledClassIds.includes(cls.classId)
                  ).length;
                  const novPayout = feePayments
                    .filter((p) => p.classId === cls.classId && p.monthKey === currentMonthKey)
                    .reduce((s, p) => s + p.lecturerShareLkr, 0);
                  return (
                    <tr key={cls.classId} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{cls.title}</p>
                        <p className="text-xs text-slate-500">
                          {cls.medium} Medium · {cls.classType}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {cls.scheduleDay} · {cls.scheduleTime}
                        <br />
                        <span className="text-slate-500">{cls.hallName}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {enrolledCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {cls.lecturerSharePct}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-indigo-600">
                        {formatLkr(novPayout)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Exam & Paper Marks Tracker */}
      {tab === 'exams' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3.5 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white"
              >
                {myExams.map((ex) => (
                  <option key={ex.examId} value={ex.examId}>
                    {ex.title} ({ex.examDate})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowNewExam(!showNewExam)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Paper Test
            </button>
          </div>

          {showNewExam && (
            <form
              onSubmit={handleCreateExam}
              className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Paper Title</label>
                <input
                  type="text"
                  required
                  value={exTitle}
                  onChange={(e) => setExTitle(e.target.value)}
                  placeholder="Paper Test 05 - Mechanics"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                <select
                  value={exClassId}
                  onChange={(e) => setExClassId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {myClasses.map((c) => (
                    <option key={c.classId} value={c.classId}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={exDate}
                    onChange={(e) => setExDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Marks</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={1000}
                    value={exMax}
                    onChange={(e) => setExMax(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="py-2 px-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
              >
                Create Exam
              </button>
            </form>
          )}

          {currentExam && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Bulk Marks Entry */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Bulk Marks Entry · {currentExam.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Max Marks: {currentExam.maxMarks} · Class Average: {examAverage}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveBulkMarks()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    Save &amp; Rank
                  </button>
                </div>

                {savedNotice && (
                  <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    Marks saved and class ranks recalculated.
                  </p>
                )}

                <div className="divide-y divide-slate-200">
                  {enrolledInCurrentExamClass.map((stu) => {
                    const val = bulkMarksDraft[stu.studentId] ?? '';
                    const num = Number(val);
                    const previewGrade =
                      val !== '' && !Number.isNaN(num)
                        ? calculateGrade(num, currentExam.maxMarks)
                        : '—';
                    const rankRow = rankedExamResults.find((r) => r.studentId === stu.studentId);
                    return (
                      <div key={stu.studentId} className="py-2.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            <span className="font-mono text-xs text-indigo-700 mr-2">
                              {stu.studentCode}
                            </span>
                            {stu.fullName}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={currentExam.maxMarks}
                            value={val}
                            onChange={(e) =>
                              setBulkMarksDraft((prev) => ({
                                ...prev,
                                [stu.studentId]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            className="w-20 px-2.5 py-1.5 text-sm font-mono text-right border border-slate-300 rounded-lg"
                          />
                          <span className="w-8 text-center font-mono text-xs font-bold text-slate-800">
                            {previewGrade}
                          </span>
                          <span className="w-12 text-right font-mono text-xs text-slate-500">
                            {rankRow ? `#${rankRow.rank}` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grade Distribution Chart */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Grade Distribution (A / B / C / S / W)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Sri Lankan G.C.E. grading rubric across {rankedExamResults.length} graded scripts
                </p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#475569' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                      <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }} />
                      <Bar dataKey="students" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Study Materials */}
      {tab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddMaterial}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit"
          >
            <h2 className="font-display text-base font-bold text-slate-900">
              Publish Tute / PDF / Video Link
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
              <select
                value={matClassId}
                onChange={(e) => setMatClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {myClasses.map((c) => (
                  <option key={c.classId} value={c.classId}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Material Title</label>
              <input
                type="text"
                required
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                placeholder="e.g. Tute 14 - Organic Mechanisms"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Material Type</label>
              <select
                value={matType}
                onChange={(e) => setMatType(e.target.value as MaterialType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="PDF Notes">PDF Notes</option>
                <option value="Tute">Tute</option>
                <option value="Past Paper">Past Paper</option>
                <option value="Video Link">Video Link</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Drive / PDF URL</label>
              <input
                type="url"
                required
                value={matUrl}
                onChange={(e) => setMatUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={matDesc}
                onChange={(e) => setMatDesc(e.target.value)}
                placeholder="Short summary for students..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Publish Material
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            {studyMaterials.map((mat) => (
              <div key={mat.materialId} className="p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    {mat.materialType === 'Video Link' ? (
                      <BookOpen className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">
                      {mat.materialType} · {mat.className}
                    </p>
                    <h3 className="font-display text-sm font-bold text-slate-900 mt-0.5">
                      {mat.title}
                    </h3>
                    {mat.description && (
                      <p className="text-xs text-slate-600 mt-1">{mat.description}</p>
                    )}
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-2"
                    >
                      Open Link
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteStudyMaterial(mat.materialId)}
                  aria-label="Delete material"
                  className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
