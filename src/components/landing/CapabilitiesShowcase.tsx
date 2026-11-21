import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CreditCard,
  GraduationCap,
  QrCode,
  Receipt,
  Users,
} from 'lucide-react';
import type { PortalView } from '@/src/context/TuitionContext';

interface CapabilitiesShowcaseProps {
  currencySymbol: string;
  demoSandboxEnabled: boolean;
  onEnterDemo: (portal: PortalView) => void;
}

type CapabilityId =
  | 'students'
  | 'attendance'
  | 'fees'
  | 'lecturers'
  | 'exams'
  | 'portals'
  | 'admin';

interface CapabilityItem {
  id: CapabilityId;
  index: string;
  label: string;
  title: string;
  summary: string;
  highlights: string[];
  statusNote: string;
  demoPortal: PortalView;
  icon: React.ReactNode;
}

const CAPABILITIES: CapabilityItem[] = [
  {
    id: 'students',
    index: '01',
    label: 'Students & Enrollment',
    title: 'Structured student records built for Sri Lankan academic streams',
    summary:
      'Register students once with NIC validation (9-digit and 12-digit), parent mobile numbers, school, grade, O/L or A/L stream, medium, and full/half/free card eligibility.',
    highlights: [
      'Grades 6–13 across National O/L, A/L streams, and Cambridge/Edexcel',
      'Sinhala, English, and Tamil medium classification per class',
      'Printable student QR ID cards generated directly from each profile',
    ],
    statusNote: 'Available in core platform',
    demoPortal: 'counter',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'attendance',
    index: '02',
    label: 'QR Attendance',
    title: 'Fast hall-entry scanning with live monthly card verification',
    summary:
      'Scan a student barcode or QR ID at the entrance counter to record class attendance and immediately surface paid, half-card, free-card, or overdue status.',
    highlights: [
      'Instant visual status for cleared cards versus overdue monthly fees',
      'Exact LKR arrears surfaced at the gate with direct jump to fee collection',
      'Date-stamped attendance history stored per class and student',
    ],
    statusNote: 'Available in core platform',
    demoPortal: 'counter',
    icon: <QrCode className="w-4 h-4" />,
  },
  {
    id: 'fees',
    index: '03',
    label: 'Fee Collection & POS',
    title: 'Monthly class cards and 80mm thermal receipts without ledger errors',
    summary:
      'Track January through December fee status across full cards, scholarship half cards, free cards, and admission fees with structured receipt numbers.',
    highlights: [
      'Supports Cash, Card, and Bank Transfer payment recording',
      '80mm thermal-printer-ready fee receipt view directly from the counter',
      'Eliminates duplicate monthly entries and end-of-day cash mismatches',
    ],
    statusNote: 'Available in core platform',
    demoPortal: 'counter',
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    id: 'lecturers',
    index: '04',
    label: 'Lecturer Splits',
    title: 'Transparent commission calculations for every lecturer and class',
    summary:
      'Configure percentage splits per lecturer or class so every collected fee automatically calculates the lecturer share and academy share in real time.',
    highlights: [
      'Per-class commission ratios (for example 70% lecturer / 30% institute)',
      'Live monthly collection and payout breakdowns visible to admins and lecturers',
      'Removes manual end-of-month spreadsheet reconciliation',
    ],
    statusNote: 'Available in core platform',
    demoPortal: 'lecturer',
    icon: <Receipt className="w-4 h-4" />,
  },
  {
    id: 'exams',
    index: '05',
    label: 'Exams & Rankings',
    title: 'Bulk paper mark entry with automatic grades and class ranking',
    summary:
      'Create term tests or weekly paper classes, enter student scores in bulk, and automatically compute A/B/C/S/W grades and class rank standings.',
    highlights: [
      'Fast roster-based bulk mark entry for lecturers and admins',
      'Automatic grade thresholds and sorted class rank calculation',
      'Connected directly to student progress views and study material links',
    ],
    statusNote: 'Available in core platform',
    demoPortal: 'lecturer',
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: 'portals',
    index: '06',
    label: 'Student & Parent Portals',
    title: 'Clear visibility into digital IDs, paid cards, attendance and results',
    summary:
      'Give students and parents a mobile-friendly view of their QR student card, 12-month payment history, class attendance, exam results, and published tute links.',
    highlights: [
      'Digital QR ID card ready for entrance counter scanning',
      'Complete monthly payment record, attendance log, and paper ranks',
      'Dedicated self-service student/parent production login is scheduled as a planned upgrade',
    ],
    statusNote: 'Core portal interface built · Production student self-service auth planned',
    demoPortal: 'student',
    icon: <GraduationCap className="w-4 h-4" />,
  },
  {
    id: 'admin',
    index: '07',
    label: 'Admin & Reporting',
    title: 'Central visibility across halls, batches, staff and monthly collections',
    summary:
      'Run the full academy from one workspace: manage halls and weekly timetables, invite staff by role, review collection trends, and monitor enrollment distribution.',
    highlights: [
      'Hall capacity and weekly timetable batch management',
      'Role-scoped staff invitations for admins, receptionists, and lecturers',
      'Monthly collection, arrears, and payout overview in one screen',
    ],
    statusNote: 'Available in core platform',
    demoPortal: 'dashboard',
    icon: <BarChart3 className="w-4 h-4" />,
  },
];

export function CapabilitiesShowcase({
  currencySymbol,
  demoSandboxEnabled,
  onEnterDemo,
}: CapabilitiesShowcaseProps) {
  const [selectedId, setSelectedId] = useState<CapabilityId>('students');
  const active = CAPABILITIES.find((item) => item.id === selectedId) ?? CAPABILITIES[0];

  return (
    <div className="space-y-8">
      {/* Horizontal Segmented Navigation */}
      <div
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-4"
        role="tablist"
        aria-label="Platform capabilities"
      >
        {CAPABILITIES.map((cap) => {
          const isSelected = cap.id === selectedId;
          return (
            <button
              key={cap.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedId(cap.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#10172D] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-[#18213B]'
              }`}
            >
              <span className={`font-mono text-xs ${isSelected ? 'text-[#24C8B5]' : 'text-slate-400'}`}>
                {cap.index}
              </span>
              <span>{cap.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Feature Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 lg:p-10">
        {/* Left Copy Column */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              <span className="font-mono text-brand-primary font-semibold">{active.index}.</span>{' '}
              {active.label} <span aria-hidden="true">·</span> {active.statusNote}
            </p>
            <h3
              className="mt-3 font-display text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#18213B] leading-snug"
              style={{ textWrap: 'balance' }}
            >
              {active.title}
            </h3>
            <p className="mt-4 text-[15px] text-slate-600 leading-relaxed">{active.summary}</p>

            <ul className="mt-6 space-y-3 border-t border-slate-200 pt-5">
              {active.highlights.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {demoSandboxEnabled && (
            <div className="mt-8 pt-5 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onEnterDemo(active.demoPortal)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors cursor-pointer whitespace-nowrap"
              >
                Inspect {active.label} in Demo Sandbox
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Product Interface Mockup Column */}
        <div className="lg:col-span-7 rounded-xl bg-[#10172D] text-white p-5 sm:p-6 flex flex-col justify-between border border-[#1E2A4D]">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
              <span className="text-[#24C8B5]">{active.icon}</span>
              <span>{active.label} Workspace</span>
            </div>
            <span className="text-[11px] text-slate-400">Illustrative interface</span>
          </div>

          <div className="py-5 flex-1 flex flex-col justify-center">
            {active.id === 'students' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#171F3B] border border-white/10 p-4">
                    <p className="font-mono text-xs text-[#24C8B5]">STU-2026-1001</p>
                    <p className="mt-1 font-display text-base font-semibold">Kavindu Lakshan Perera</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Grade 13 (A/L) · Physical Science · English Medium
                    </p>
                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400">NIC</p>
                        <p className="font-mono text-slate-200 mt-0.5">200715401829</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Card Tier</p>
                        <p className="text-slate-200 mt-0.5">Full Card</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#171F3B] border border-white/10 p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-300">Enrolled Classes</p>
                      <div className="mt-2.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-200">
                          <span>2026 A/L Physics Theory</span>
                          <span className="font-mono text-slate-400">Sat 08:00</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span>2026 A/L Combined Maths</span>
                          <span className="font-mono text-slate-400">Sun 08:30</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span>2026 A/L Physics Paper</span>
                          <span className="font-mono text-slate-400">Wed 15:30</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-400">
                      Guardian contact verified · +94 mobile format
                    </p>
                  </div>
                </div>
              </div>
            )}

            {active.id === 'attendance' && (
              <div className="space-y-3">
                <div className="rounded-lg bg-[#171F3B] border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-slate-300">SCAN INPUT: STU-2026-1001</span>
                  <span className="font-mono text-xs text-[#24C8B5]">CHECKED IN</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#24C8B5]/12 border border-[#24C8B5]/35 p-4">
                    <p className="font-mono text-xs text-[#24C8B5]">ENTRY CLEARED · PAID</p>
                    <p className="mt-1.5 text-sm font-semibold text-white">Kavindu L. Perera</p>
                    <p className="text-xs text-slate-300 mt-1">
                      November 2026 monthly card verified for Hall A.
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-400/12 border border-amber-400/35 p-4">
                    <p className="font-mono text-xs text-amber-300">FEE DUE · {currencySymbol} 3,500</p>
                    <p className="mt-1.5 text-sm font-semibold text-white">Dilshan R. Bandara</p>
                    <p className="text-xs text-slate-300 mt-1">
                      Attendance logged with arrears flag for reception counter.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {active.id === 'fees' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7 rounded-lg bg-[#171F3B] border border-white/10 p-4">
                  <p className="text-xs font-medium text-slate-300 mb-3">2026 Monthly Card Ledger</p>
                  <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                      (month, idx) => (
                        <div
                          key={month}
                          className={`py-2 rounded-md border ${
                            idx < 10
                              ? 'bg-[#24C8B5]/15 border-[#24C8B5]/30 text-[#24C8B5]'
                              : idx === 10
                              ? 'bg-[#625BFF]/25 border-[#8B7CFF]/50 text-white'
                              : 'bg-[#10172D] border-white/10 text-slate-500'
                          }`}
                        >
                          {month}
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="sm:col-span-5 rounded-lg bg-white text-[#18213B] p-4 font-mono text-xs space-y-2">
                  <p className="font-bold text-center border-b border-dashed border-slate-300 pb-2">
                    80MM THERMAL RECEIPT
                  </p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receipt</span>
                    <span>RCP-2026-4812</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student</span>
                    <span>STU-2026-1001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Month</span>
                    <span>Nov 2026 (Full)</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-2">
                    <span>Total Paid</span>
                    <span>{currencySymbol} 3,500.00</span>
                  </div>
                </div>
              </div>
            )}

            {active.id === 'lecturers' && (
              <div className="rounded-lg bg-[#171F3B] border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-medium text-slate-400 border-b border-white/10">
                  <span className="col-span-5">Lecturer &amp; Class</span>
                  <span className="col-span-2 text-right">Split</span>
                  <span className="col-span-2 text-right">Collected</span>
                  <span className="col-span-3 text-right">Lecturer Share</span>
                </div>
                <div className="divide-y divide-white/8 text-xs">
                  {[
                    { name: 'Dr. K. Jayawardena', cls: 'A/L Physics', split: '70 / 30', gross: '840,000', share: '588,000' },
                    { name: 'Mr. C. Senanayake', cls: 'A/L Combined Maths', split: '70 / 30', gross: '735,000', share: '514,500' },
                    { name: 'Ms. N. Fernando', cls: 'O/L Science', split: '65 / 35', gross: '495,000', share: '321,750' },
                  ].map((row) => (
                    <div key={row.name} className="grid grid-cols-12 px-4 py-3 items-center gap-2">
                      <div className="col-span-5 min-w-0">
                        <p className="font-medium text-white truncate">{row.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{row.cls}</p>
                      </div>
                      <span className="col-span-2 text-right font-mono text-slate-300">{row.split}</span>
                      <span className="col-span-2 text-right font-mono text-slate-300 tabular-nums">{row.gross}</span>
                      <span className="col-span-3 text-right font-mono font-semibold text-[#24C8B5] tabular-nums">
                        {currencySymbol} {row.share}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active.id === 'exams' && (
              <div className="rounded-lg bg-[#171F3B] border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between text-xs">
                  <span className="font-medium text-white">Term Paper 04 · A/L Physics Mechanics</span>
                  <span className="font-mono text-slate-400">Max: 100</span>
                </div>
                <div className="divide-y divide-white/8 text-xs">
                  {[
                    { rank: '#1', code: 'STU-2026-1001', name: 'Kavindu L. Perera', marks: '92', grade: 'A' },
                    { rank: '#2', code: 'STU-2026-1019', name: 'Nethmi S. Wickramasinghe', marks: '88', grade: 'A' },
                    { rank: '#3', code: 'STU-2026-1034', name: 'Tharindu M. Silva', marks: '76', grade: 'A' },
                    { rank: '#4', code: 'STU-2026-1042', name: 'Hasini D. Jayasinghe', marks: '68', grade: 'B' },
                  ].map((row) => (
                    <div key={row.code} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[#8B7CFF] font-semibold w-6">{row.rank}</span>
                        <span className="text-white truncate">{row.name}</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono shrink-0">
                        <span className="text-slate-300 tabular-nums">{row.marks} / 100</span>
                        <span className="text-[#24C8B5] font-semibold w-4 text-right">{row.grade}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active.id === 'portals' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg bg-[#171F3B] border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Digital Student ID</span>
                    <span className="font-mono text-xs text-[#24C8B5]">STU-2026-1001</span>
                  </div>
                  <div className="py-4 rounded-lg bg-[#10172D] border border-white/10 flex flex-col items-center justify-center">
                    <QrCode className="w-12 h-12 text-white" />
                    <p className="mt-2 font-mono text-[11px] text-slate-400">SCAN AT GATE COUNTER</p>
                  </div>
                  <p className="text-xs text-slate-300">Kavindu L. Perera · Grade 13 Physical Science</p>
                </div>
                <div className="rounded-lg bg-[#171F3B] border border-white/10 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-300">Parent &amp; Student Summary</p>
                    <div className="mt-3 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">November Fee Card</span>
                        <span className="text-[#24C8B5] font-medium">Paid</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recent Paper Rank</span>
                        <span className="font-mono text-white">#1 · 92 (A)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Study Materials</span>
                        <span className="text-slate-200">6 Tutes Linked</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 border-t border-white/10 pt-3">
                    Production self-service student/parent authentication is planned for a future release.
                  </p>
                </div>
              </div>
            )}

            {active.id === 'admin' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-[#171F3B] border border-white/10 p-3.5">
                    <p className="text-slate-400">Active Halls</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-white">4</p>
                  </div>
                  <div className="rounded-lg bg-[#171F3B] border border-white/10 p-3.5">
                    <p className="text-slate-400">Weekly Batches</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-white">24</p>
                  </div>
                  <div className="rounded-lg bg-[#171F3B] border border-white/10 p-3.5">
                    <p className="text-slate-400">Invited Staff</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-white">14</p>
                  </div>
                </div>
                <div className="rounded-lg bg-[#171F3B] border border-white/10 p-4 space-y-2 text-xs">
                  <p className="font-medium text-white">Saturday Hall Allocation</p>
                  <div className="flex justify-between text-slate-300">
                    <span>Main Auditorium · 08:00 – 12:00</span>
                    <span className="font-mono text-[#24C8B5]">2026 A/L Physics</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Hall B · 08:30 – 12:30</span>
                    <span className="font-mono text-[#8B7CFF]">2026 A/L Chemistry</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Hall C · 14:00 – 17:00</span>
                    <span className="font-mono text-slate-300">Grade 11 O/L Mathematics</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Representative workflow preview</span>
            <span className="font-mono">Sri Lanka · {currencySymbol}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
