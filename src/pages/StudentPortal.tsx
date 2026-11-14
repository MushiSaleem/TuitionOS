import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BookOpen, Calendar, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { useTuition } from '@/src/context/TuitionContext';
import { MONTHS_2026 } from '@/src/types/tuition';
import { formatLkr, getCurrentMonthKey } from '@/src/utils/sriLanka';

export function StudentPortal() {
  const {
    mode,
    activeInstitute,
    userProfile,
    students,
    classes,
    feePayments,
    attendance,
    exams,
    examMarks,
    studyMaterials,
    demoStudentId,
    setDemoStudentId,
  } = useTuition();

  const student = useMemo(() => {
    if (mode === 'demo_sandbox') {
      return students.find((s) => s.studentId === demoStudentId) || students[0] || null;
    }
    if (userProfile?.linkedEntityId) {
      return students.find((s) => s.studentId === userProfile.linkedEntityId) || students[0] || null;
    }
    return students[0] || null;
  }, [mode, students, demoStudentId, userProfile]);

  const enrolledClasses = useMemo(() => {
    if (!student) return [];
    return classes.filter((c) => student.enrolledClassIds.includes(c.classId));
  }, [student, classes]);

  const studentAttendance = useMemo(() => {
    if (!student) return [];
    return attendance.filter((a) => a.studentId === student.studentId);
  }, [student, attendance]);

  const studentResultsWithRank = useMemo(() => {
    if (!student) return [];
    return examMarks
      .filter((m) => m.studentId === student.studentId)
      .map((mark) => {
        const allForExam = examMarks
          .filter((m) => m.examId === mark.examId)
          .sort((a, b) => b.marksObtained - a.marksObtained);
        const rank = allForExam.findIndex((m) => m.studentId === student.studentId) + 1;
        const exam = exams.find((e) => e.examId === mark.examId);
        return {
          ...mark,
          rank,
          totalCandidates: allForExam.length,
          examDate: exam?.examDate || '',
        };
      });
  }, [student, examMarks, exams]);

  const rankTrendData = useMemo(() => {
    return studentResultsWithRank.map((r) => ({
      exam: r.examTitle.split('—')[0].trim(),
      scorePct: Math.round((r.marksObtained / r.maxMarks) * 100),
      rank: r.rank,
    }));
  }, [studentResultsWithRank]);

  const myMaterials = useMemo(() => {
    if (!student) return [];
    const set = new Set(student.enrolledClassIds);
    return studyMaterials.filter((m) => set.has(m.classId));
  }, [student, studyMaterials]);

  if (!student) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">No student profile linked yet.</p>
      </div>
    );
  }

  const currentMonthKey = getCurrentMonthKey();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Student &amp; Parent Portal
          </h1>
          <p className="text-sm text-slate-600">
            {activeInstitute?.name || 'TuitionOS Academy'} · Digital ID, Class Cards &amp; Results
          </p>
        </div>

        {mode === 'demo_sandbox' && (
          <select
            value={demoStudentId}
            onChange={(e) => setDemoStudentId(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white"
          >
            {students.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.studentCode} · {s.fullName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Digital QR Student ID Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          <QRCodeSVG value={student.studentCode} size={116} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-mono text-xs font-bold text-indigo-600">{student.studentCode}</p>
          <h2 className="font-display text-xl font-bold text-slate-900 mt-0.5">
            {student.fullName}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {student.grade} · {student.stream} · {student.medium} Medium
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {student.school || 'Colombo'} · Parent Mobile: {student.parentPhone}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs">
            <span className="font-semibold text-slate-800 capitalize">
              Card Tier: {student.cardTier} card
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-700 font-semibold">
              {student.admissionPaid ? 'Admission Verified' : 'Admission Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Class Cards (Sep - Nov + Full Status) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">
            Monthly Class Cards (2026)
          </h3>
          <p className="text-xs text-slate-500">
            Payment status per enrolled subject class
          </p>
        </div>

        <div className="space-y-4">
          {enrolledClasses.map((cls) => {
            const feeToPay =
              student.cardTier === 'free'
                ? 0
                : student.cardTier === 'half'
                ? Math.round(cls.monthlyFeeLkr * 0.5)
                : cls.monthlyFeeLkr;
            const novPaid =
              student.cardTier === 'free' ||
              feePayments.some(
                (p) =>
                  p.studentId === student.studentId &&
                  p.classId === cls.classId &&
                  p.monthKey === currentMonthKey
              );

            return (
              <div key={cls.classId} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{cls.title}</p>
                    <p className="text-xs text-slate-500">
                      {cls.lecturerName} · {cls.scheduleDay} {cls.scheduleTime} ({cls.hallName})
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {formatLkr(feeToPay)} / mo
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                        novPaid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {novPaid ? 'Nov Paid' : 'Nov Pending'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {MONTHS_2026.map((m) => {
                    const paid =
                      student.cardTier === 'free' ||
                      feePayments.some(
                        (p) =>
                          p.studentId === student.studentId &&
                          p.classId === cls.classId &&
                          p.monthKey === m.key
                      );
                    return (
                      <div
                        key={m.key}
                        className={`py-1.5 rounded text-center text-[10px] font-mono border ${
                          paid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {m.short}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exam Results & Score Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-bold text-slate-900 mb-3">
            Recent Paper Results &amp; Rank
          </h3>
          {studentResultsWithRank.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No graded papers yet.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {studentResultsWithRank.map((res) => (
                <div key={res.markId} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{res.examTitle}</p>
                    <p className="text-xs text-slate-500">
                      Rank #{res.rank} of {res.totalCandidates} · {res.examDate}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-indigo-600 tabular-nums">
                      {res.marksObtained}/{res.maxMarks}
                    </span>
                    <p className="text-xs font-bold text-slate-700">Grade {res.grade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-bold text-slate-900 mb-3">
            Performance Trend (%)
          </h3>
          {rankTrendData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rankTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="exam" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="scorePct"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#4F46E5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">
              Trend chart appears once multiple papers are graded.
            </p>
          )}
        </div>
      </div>

      {/* Attendance & Study Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Recent Attendance History
            </h3>
          </div>
          {studentAttendance.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No gate check-ins logged yet.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {studentAttendance.slice(0, 6).map((att) => (
                <div key={att.attendanceId} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{att.className}</p>
                    <p className="text-slate-500 font-mono">{att.dateKey}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Present
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Study Materials &amp; Tutes
            </h3>
          </div>
          {myMaterials.length === 0 ? (
            <div className="py-4 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-4 h-4" />
              No study materials published for your classes yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {myMaterials.map((mat) => (
                <div key={mat.materialId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{mat.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {mat.materialType} · {mat.className}
                    </p>
                  </div>
                  <a
                    href={mat.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0"
                  >
                    Open
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
