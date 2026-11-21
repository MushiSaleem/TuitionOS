import React, { useState } from 'react';
import { BookOpen, Building2, GraduationCap, QrCode, Users } from 'lucide-react';

interface RoleExperienceSectionProps {
  currencySymbol: string;
}

type RoleId = 'owner' | 'reception' | 'lecturer' | 'student' | 'parent';

interface RoleSpec {
  id: RoleId;
  label: string;
  headline: string;
  description: string;
  tasks: string[];
  accessNote: string;
  icon: React.ReactNode;
  previewTitle: string;
  previewRows: Array<{ primary: string; secondary: string; value: string; accent?: string }>;
}

const ROLES: RoleSpec[] = [
  {
    id: 'owner',
    label: 'Owners & Admins',
    headline: 'Complete operational and financial visibility without chasing ledgers',
    description:
      'Oversee classes, lecture halls, weekly batches, invited staff, monthly fee collections, and exact lecturer payouts from a dedicated administrative workspace.',
    tasks: [
      'Create classes, assign halls, and configure monthly and admission fees in LKR',
      'Invite receptionists and lecturers with role-scoped access to your academy',
      'Review monthly collections, institute net share, and lecturer split totals',
    ],
    accessNote: 'Authenticated admin workspace',
    icon: <Building2 className="w-4 h-4" />,
    previewTitle: 'Academy Operations Snapshot (Sample)',
    previewRows: [
      { primary: 'Monthly Gross Collections', secondary: 'All active classes', value: 'Rs. 2,947,000', accent: 'text-[#18213B]' },
      { primary: 'Lecturer Payout Allocation', secondary: 'Calculated by class split', value: 'Rs. 2,018,500', accent: 'text-brand-primary' },
      { primary: 'Institute Net Share', secondary: 'Before hall overheads', value: 'Rs. 928,500', accent: 'text-emerald-700' },
    ],
  },
  {
    id: 'reception',
    label: 'Reception & Counter',
    headline: 'Built for weekend check-in queues and rapid monthly card collection',
    description:
      'Counter staff scan student QR codes, verify paid monthly cards at a glance, collect cash/card/bank fees, print 80mm thermal receipts, and register new students.',
    tasks: [
      'Sub-second barcode/QR student lookup with immediate paid or overdue alerts',
      'One-step jump from an overdue check-in alert to collecting the monthly card',
      'Print 80mm receipts and student QR cards without switching systems',
    ],
    accessNote: 'Authenticated counter POS workspace',
    icon: <QrCode className="w-4 h-4" />,
    previewTitle: 'Front-Desk Queue Preview (Sample)',
    previewRows: [
      { primary: 'STU-2026-1001 · Kavindu Perera', secondary: 'A/L Physics · Nov Card', value: 'Paid · Verified', accent: 'text-emerald-700' },
      { primary: 'STU-2026-1042 · Hasini Jayasinghe', secondary: 'A/L Chemistry · Half Card', value: 'Half · Cleared', accent: 'text-brand-primary' },
      { primary: 'STU-2026-1089 · Dilshan Bandara', secondary: 'O/L Maths · Nov Card', value: 'Overdue · Collect', accent: 'text-amber-700' },
    ],
  },
  {
    id: 'lecturer',
    label: 'Lecturers',
    headline: 'Clear payout tracking, paper mark sheets and study material publishing',
    description:
      'Lecturers access only their own classes to review student counts, check monthly commission shares, enter exam paper marks in bulk, and publish PDF notes or tute links.',
    tasks: [
      'View per-class fee collections and earned commission share transparently',
      'Create paper exams and enter marks with automated grading and ranking',
      'Share structured links to PDF notes, past papers, tutes, and recorded resources',
    ],
    accessNote: 'Authenticated lecturer workspace',
    icon: <BookOpen className="w-4 h-4" />,
    previewTitle: 'Lecturer Class Summary (Sample)',
    previewRows: [
      { primary: '2026 A/L Physics Theory', secondary: '240 active students · 70% split', value: 'Rs. 588,000', accent: 'text-emerald-700' },
      { primary: 'Term Paper 04 Grading', secondary: 'Auto A/B/C/S/W + class rank', value: 'Published', accent: 'text-brand-primary' },
      { primary: 'Unit 06 Mechanics Tute', secondary: 'PDF Notes link shared', value: 'Available', accent: 'text-slate-700' },
    ],
  },
  {
    id: 'student',
    label: 'Students',
    headline: 'Digital QR student card, class schedules, exam ranks and tutes',
    description:
      'The student portal interface organizes a student’s QR gate ID, enrolled classes, 12-month payment history, attendance records, exam rankings, and linked study materials.',
    tasks: [
      'Present a mobile QR ID card at the lecture hall counter',
      'Track exam marks, grades, and class rank progression over the term',
      'Access study material links published by their class lecturers',
    ],
    accessNote: 'Portal UI built · Dedicated production student sign-in is planned',
    icon: <GraduationCap className="w-4 h-4" />,
    previewTitle: 'Student Portal View (Illustrative)',
    previewRows: [
      { primary: 'Digital QR Class ID', secondary: 'STU-2026-1001 · Physical Science', value: 'Ready to Scan', accent: 'text-brand-primary' },
      { primary: 'Term Paper 04 · Physics', secondary: '92 / 100 · Grade A', value: 'Rank #1', accent: 'text-emerald-700' },
      { primary: 'Published Study Materials', secondary: 'PDF notes & past papers', value: '6 Resources', accent: 'text-slate-700' },
    ],
  },
  {
    id: 'parent',
    label: 'Parents',
    headline: 'Clear records of attendance, monthly fees and academic progress',
    description:
      'TuitionOS captures guardian contact details alongside every attendance mark, fee receipt, and exam grade so academies can keep parents accurately informed.',
    tasks: [
      'Structured attendance dates and fee card status per enrolled subject',
      'Clear exam marks, grades, and class standing without waiting for term reports',
      'Automated SMS and WhatsApp parent alerts are scheduled as planned expansion modules',
    ],
    accessNote: 'Core records tracked · Direct parent self-service login & SMS alerts planned',
    icon: <Users className="w-4 h-4" />,
    previewTitle: 'Parent Visibility Record (Illustrative)',
    previewRows: [
      { primary: 'Guardian Contact Linked', secondary: '+94 mobile stored on profile', value: 'Recorded', accent: 'text-slate-700' },
      { primary: 'Monthly Fee Receipts', secondary: 'Jan–Nov 2026 card status', value: 'Up to Date', accent: 'text-emerald-700' },
      { primary: 'SMS / WhatsApp Alerts', secondary: 'Optional notification module', value: 'Planned', accent: 'text-slate-500' },
    ],
  },
];

export function RoleExperienceSection({ currencySymbol }: RoleExperienceSectionProps) {
  const [activeRole, setActiveRole] = useState<RoleId>('owner');
  const current = ROLES.find((r) => r.id === activeRole) ?? ROLES[0];

  const formatValue = (val: string) =>
    currencySymbol === 'Rs.' ? val : val.replace(/Rs\./g, currencySymbol);

  return (
    <div className="space-y-8">
      {/* Role Selector Tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Academy roles"
      >
        {ROLES.map((role) => {
          const selected = role.id === activeRole;
          return (
            <button
              key={role.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveRole(role.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selected
                  ? 'bg-brand-primary text-white'
                  : 'bg-[#F5F7FF] text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              {role.icon}
              <span>{role.label}</span>
            </button>
          );
        })}
      </div>

      {/* Role Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border-t border-slate-200 pt-8">
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {current.label} <span aria-hidden="true">·</span> {current.accessNote}
            </p>
            <h3
              className="mt-2.5 font-display text-2xl font-bold tracking-tight text-[#18213B] leading-snug"
              style={{ textWrap: 'balance' }}
            >
              {current.headline}
            </h3>
            <p className="mt-3.5 text-[15px] text-slate-600 leading-relaxed">
              {current.description}
            </p>
            <ul className="mt-6 space-y-3">
              {current.tasks.map((task) => (
                <li key={task} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#24C8B5] shrink-0" aria-hidden="true" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl bg-[#F5F7FF] border border-slate-200/90 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <p className="text-sm font-semibold text-[#18213B]">{current.previewTitle}</p>
              <span className="text-xs text-slate-500">{current.label}</span>
            </div>

            <div className="divide-y divide-slate-200/90">
              {current.previewRows.map((row) => (
                <div
                  key={row.primary}
                  className="py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#18213B] truncate">{row.primary}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{row.secondary}</p>
                  </div>
                  <span
                    className={`font-mono text-xs sm:text-sm font-semibold shrink-0 tabular-nums ${
                      row.accent || 'text-[#18213B]'
                    }`}
                  >
                    {formatValue(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
            Role access is enforced per academy environment; staff roles authenticate through Firebase.
          </p>
        </div>
      </div>
    </div>
  );
}
