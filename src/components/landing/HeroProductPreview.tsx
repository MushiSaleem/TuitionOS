import React, { useState } from 'react';
import { QrCode, Receipt, Users } from 'lucide-react';

interface HeroProductPreviewProps {
  brandName: string;
  currencySymbol: string;
  demoSandboxEnabled: boolean;
  onLaunchDemo?: () => void;
}

type PreviewTab = 'overview' | 'attendance' | 'payouts';

const WEEKLY_SERIES = [
  { label: 'Mon', collections: 64, attendance: 78 },
  { label: 'Tue', collections: 72, attendance: 84 },
  { label: 'Wed', collections: 58, attendance: 74 },
  { label: 'Thu', collections: 81, attendance: 88 },
  { label: 'Fri', collections: 76, attendance: 86 },
  { label: 'Sat', collections: 96, attendance: 95 },
  { label: 'Sun', collections: 91, attendance: 92 },
];

const RECENT_ACTIVITY = [
  {
    code: 'STU-2026-1001',
    detail: '2026 A/L Physics · Hall A',
    status: 'Paid · Nov Card',
    tone: 'text-[#24C8B5]',
    time: '08:14',
  },
  {
    code: 'STU-2026-1042',
    detail: '2026 A/L Chemistry · Hall B',
    status: 'Half Card · Verified',
    tone: 'text-[#8B7CFF]',
    time: '08:13',
  },
  {
    code: 'STU-2026-1089',
    detail: 'Grade 11 O/L Maths · Hall C',
    status: 'Overdue · Arrears Flagged',
    tone: 'text-amber-300',
    time: '08:11',
  },
];

const PAYOUT_ROWS = [
  { lecturer: 'Dr. K. Jayawardena', subject: 'A/L Physics', split: '70%', payout: '588,000' },
  { lecturer: 'Mr. C. Senanayake', subject: 'A/L Combined Maths', split: '70%', payout: '514,500' },
  { lecturer: 'Ms. N. Fernando', subject: 'O/L Science', split: '65%', payout: '321,750' },
];

export function HeroProductPreview({
  brandName,
  currencySymbol,
  demoSandboxEnabled,
  onLaunchDemo,
}: HeroProductPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('overview');

  return (
    <div className="w-full rounded-2xl border border-white/12 bg-[#171F3B]/95 shadow-2xl shadow-black/40 overflow-hidden">
      {/* Window Bar */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#121A33]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          </div>
          <span className="text-xs font-medium text-slate-300 truncate">
            {brandName} Workspace · Sample Academy Overview
          </span>
        </div>

        {/* Interactive View Switcher */}
        <div
          className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0D1326] border border-white/10"
          role="tablist"
          aria-label="Preview workspace views"
        >
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'attendance', label: 'QR Gate' },
              { id: 'payouts', label: 'Payouts' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-brand-primary text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Preview Body */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[#10172D]/90 border border-white/8 p-3.5">
            <p className="text-[11px] font-medium text-slate-400">Total Students</p>
            <p className="mt-1 font-mono text-lg sm:text-xl font-semibold text-white tabular-nums">
              842
            </p>
            <p className="mt-0.5 text-[11px] text-[#24C8B5]">A/L &amp; O/L Active</p>
          </div>

          <div className="rounded-xl bg-[#10172D]/90 border border-white/8 p-3.5">
            <p className="text-[11px] font-medium text-slate-400">Today&apos;s Attendance</p>
            <p className="mt-1 font-mono text-lg sm:text-xl font-semibold text-white tabular-nums">
              618
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">QR Checked In</p>
          </div>

          <div className="rounded-xl bg-[#10172D]/90 border border-white/8 p-3.5">
            <p className="text-[11px] font-medium text-slate-400">Monthly Collections</p>
            <p className="mt-1 font-mono text-lg sm:text-xl font-semibold text-white tabular-nums">
              {currencySymbol} 2.94M
            </p>
            <p className="mt-0.5 text-[11px] text-[#8B7CFF]">Cash · Card · Bank</p>
          </div>

          <div className="rounded-xl bg-[#10172D]/90 border border-white/8 p-3.5">
            <p className="text-[11px] font-medium text-slate-400">Active Classes</p>
            <p className="mt-1 font-mono text-lg sm:text-xl font-semibold text-white tabular-nums">
              18
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">4 Lecture Halls</p>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Weekly Attendance & Collections Chart */}
            <div className="sm:col-span-7 rounded-xl bg-[#10172D]/90 border border-white/8 p-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <p className="text-xs font-semibold text-white">Weekly Attendance &amp; Collections</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Peak load across Saturday &amp; Sunday sessions
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-[#625BFF]" />
                    Fees
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-[#24C8B5]" />
                    Attendance
                  </span>
                </div>
              </div>

              <div className="h-36 flex items-end justify-between gap-2 pt-2">
                {WEEKLY_SERIES.map((item) => (
                  <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full h-28 flex items-end justify-center gap-1">
                      <div
                        className="w-2.5 sm:w-3 rounded-t-sm bg-[#625BFF]"
                        style={{ height: `${item.collections}%` }}
                      />
                      <div
                        className="w-2.5 sm:w-3 rounded-t-sm bg-[#24C8B5]/90"
                        style={{ height: `${item.attendance}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Counter Activity */}
            <div className="sm:col-span-5 rounded-xl bg-[#10172D]/90 border border-white/8 p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-white mb-3">Recent Gate &amp; Fee Activity</p>
                <div className="divide-y divide-white/8">
                  {RECENT_ACTIVITY.map((row) => (
                    <div key={row.code} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          {row.code}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">{row.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{row.detail}</p>
                      <p className={`text-[11px] font-medium mt-0.5 ${row.tone}`}>{row.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="rounded-xl bg-[#10172D]/90 border border-white/8 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 text-[#24C8B5]" />
                <p className="text-xs font-semibold text-white">
                  Reception Gate Check-In · 2026 A/L Physics Theory
                </p>
              </div>
              <span className="font-mono text-xs text-slate-400">Hall A · Saturday 08:00</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#24C8B5]/35 bg-[#24C8B5]/10 p-3.5">
                <p className="font-mono text-xs text-[#24C8B5]">PAID · FULL CARD</p>
                <p className="mt-1 text-sm font-semibold text-white">Kavindu L. Perera</p>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">STU-2026-1001 · Nov 2026 Cleared</p>
              </div>
              <div className="rounded-lg border border-amber-400/35 bg-amber-400/10 p-3.5">
                <p className="font-mono text-xs text-amber-300">ARREARS ALERT · {currencySymbol} 3,500</p>
                <p className="mt-1 text-sm font-semibold text-white">Dilshan R. Bandara</p>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">STU-2026-1089 · Collect at Counter</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="rounded-xl bg-[#10172D]/90 border border-white/8 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#8B7CFF]" />
                <p className="text-xs font-semibold text-white">Automated Lecturer Split Summary</p>
              </div>
              <span className="text-[11px] text-slate-400">Monthly Ledger ({currencySymbol})</span>
            </div>
            <div className="divide-y divide-white/8">
              {PAYOUT_ROWS.map((row) => (
                <div key={row.lecturer} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{row.lecturer}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {row.subject} · {row.split} Split
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-[#24C8B5] shrink-0 tabular-nums">
                    {currencySymbol} {row.payout}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Illustrative Data Disclaimer Footer */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Illustrative preview using sample academy figures
          </span>
          {demoSandboxEnabled && onLaunchDemo && (
            <button
              type="button"
              onClick={onLaunchDemo}
              className="text-xs font-medium text-[#24C8B5] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Open interactive sandbox →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
