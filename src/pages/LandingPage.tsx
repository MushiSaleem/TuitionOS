import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useTuition } from '@/src/context/TuitionContext';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/src/types/tuition';
import { formatLkrCompact, normalizeSriLankanPhone, validateSriLankanPhone } from '@/src/utils/sriLanka';
import heroAcademyImg from '@/src/assets/images/hero_tuition_academy_1794594687520.jpg';
import counterCheckinImg from '@/src/assets/images/feature_counter_checkin_1794594688420.jpg';
import lecturerAvatarImg from '@/src/assets/images/avatar_lecturer_sample_1794594688408.jpg';

interface LandingPageProps {
  onNavigateLogin: () => void;
}

export function LandingPage({ onNavigateLogin }: LandingPageProps) {
  const { enterDemoSandbox, submitOnboardingRequest } = useTuition();

  const [instituteName, setInstituteName] = useState('');
  const [city, setCity] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [estimatedStudents, setEstimatedStudents] = useState('350');
  const [preferredTier, setPreferredTier] = useState<SubscriptionTier>('pro');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [heroImgError, setHeroImgError] = useState(false);
  const [counterImgError, setCounterImgError] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!instituteName.trim() || !city.trim() || !ownerName.trim() || !email.trim()) {
      setFormError('Please fill in all required institute and contact fields.');
      return;
    }
    if (!validateSriLankanPhone(phone)) {
      setFormError('Enter a valid Sri Lankan mobile number (e.g. +94 77 123 4567 or 077 123 4567).');
      return;
    }

    setSubmitting(true);
    try {
      await submitOnboardingRequest({
        instituteName: instituteName.trim(),
        city: city.trim(),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizeSriLankanPhone(phone),
        estimatedStudents: Math.max(10, Number(estimatedStudents) || 100),
        preferredTier,
        notes: notes.trim(),
      });
      setSubmittedSuccess(true);
      setInstituteName('');
      setCity('');
      setOwnerName('');
      setEmail('');
      setPhone('');
      setNotes('');
    } catch {
      setFormError('Unable to submit request right now. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            TuitionOS
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#capabilities" className="hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#modules" className="hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0">
              Modules
            </a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
            <a href="#onboarding" className="hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0">
              Onboarding
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onNavigateLogin}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="max-w-7xl mx-auto px-6 pt-12 pb-10 lg:pt-16 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-indigo-600 mb-3">
                Built for Sri Lankan Tuition Academies · LKR &amp; NIC Ready
              </p>
              <h1
                className="font-display font-bold tracking-tight text-slate-900 leading-[1.1]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                One operating system for classes, monthly cards, and lecturer splits.
              </h1>
              <p className="mt-5 text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl">
                Replace paper class cards and manual ledger books. TuitionOS gives Sri Lankan tuition
                institutes instant QR attendance check-ins, 80mm thermal fee receipts in LKR,
                automated lecturer payouts, and O/L &amp; A/L paper rank analytics.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => enterDemoSandbox('dashboard')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Try Live Demo Sandbox
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#onboarding"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  Request Institute Onboarding
                </a>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>G.C.E. O/L &amp; A/L Streams</span>
              <span aria-hidden="true">·</span>
              <span>Sinhala, English &amp; Tamil Mediums</span>
              <span aria-hidden="true">·</span>
              <span>Isolated Multi-Tenant Security</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              {!heroImgError ? (
                <img
                  src={heroAcademyImg}
                  alt="Modern lecture hall at a Colombo tuition academy"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center p-8 bg-slate-100 text-slate-600">
                  <GraduationCap className="w-12 h-12 text-indigo-600 mb-3" />
                  <p className="font-display font-semibold text-slate-800">Colombo Academy Lecture Hall</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Metric Strip */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white">
          <div className="p-5">
            <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">&lt; 1 sec</p>
            <p className="mt-1 text-sm text-slate-600">QR &amp; barcode gate check-in with audio chime</p>
          </div>
          <div className="p-5">
            <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">70 / 30</p>
            <p className="mt-1 text-sm text-slate-600">Configurable lecturer &amp; institute LKR split</p>
          </div>
          <div className="p-5">
            <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">12 Months</p>
            <p className="mt-1 text-sm text-slate-600">Full, half &amp; free card tracking Jan–Dec</p>
          </div>
          <div className="p-5">
            <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">A / B / C / S</p>
            <p className="mt-1 text-sm text-slate-600">Automated paper rank &amp; grade calculation</p>
          </div>
        </div>
      </section>

      {/* Capabilities Asymmetric Bento Grid */}
      <section id="capabilities" className="bg-slate-50 border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              Built around real Sri Lankan front-desk &amp; hall workflows
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Every portal is separated by role so your reception counter stays fast during weekend
              rushes while lecturers and parents get exact visibility.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Marquee 2-col card: Counter Check-In & POS */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-7 p-7 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 mb-2">01. Reception &amp; Gate Control</p>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Sub-second QR check-in with instant green/red fee alerts
                  </h3>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    Scan a student&apos;s barcode ID or enter STU-2026-1001. TuitionOS marks attendance,
                    plays a distinct chime, and flashes green for paid monthly cards or red with exact
                    LKR arrears for overdue fees.
                  </p>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>Printable 80mm thermal receipts &amp; QR cards</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => enterDemoSandbox('counter')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap cursor-pointer"
                  >
                    Open Counter Demo →
                  </button>
                </div>
              </div>
              <div className="md:col-span-5 bg-slate-100 min-h-[220px]">
                {!counterImgError ? (
                  <img
                    src={counterCheckinImg}
                    alt="Front-desk QR student check-in counter"
                    referrerPolicy="no-referrer"
                    onError={() => setCounterImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6">
                    <QrCode className="w-10 h-10 text-indigo-600" />
                  </div>
                )}
              </div>
            </div>

            {/* 1-col card: Lecturer Portal */}
            <div className="bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-2">02. Lecturer Portal</p>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Live payouts, paper marks &amp; tutes
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Lecturers track their exact commission share per class in LKR, bulk-enter paper
                  marks with automatic rank &amp; A/B/C/S/W grades, and publish PDF notes.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {!avatarImgError ? (
                    <img
                      src={lecturerAvatarImg}
                      alt="Dr. Kasun Jayawardena"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarImgError(true)}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                      KJ
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">Dr. Kasun Jayawardena</p>
                    <p className="text-xs text-slate-500 truncate">2026 A/L Physics · 70% Split</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => enterDemoSandbox('lecturer')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Preview →
                </button>
              </div>
            </div>

            {/* Bottom row: 03 & 04 */}
            <div className="bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-2">03. Monthly Card Engine</p>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Full, half &amp; free cards without chaos
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Handle admission fees, scholarship half cards, and free cards across January to
                  December with clear receipt numbers and zero double-counting.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Cash, Card &amp; Bank Transfer Reconciliation</span>
              </div>
            </div>

            <div id="modules" className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 mb-2">04. Student &amp; Parent Portal</p>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Mobile-first QR ID, attendance &amp; rank trends
                  </h3>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    Parents and students sign in with their Student ID and 4-digit PIN to inspect paid
                    class cards, attendance history, upcoming hall schedules, and term paper rank
                    trends.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Sample Student Card</span>
                    <span className="font-mono text-slate-700">STU-2026-1001</span>
                  </div>
                  <div className="my-3">
                    <p className="font-display font-semibold text-slate-900">Kavindu Lakshan Perera</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Grade 13 (A/L) · Physical Science · English Medium
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-xs font-semibold text-emerald-700">Nov 2026 · Paid</span>
                    <button
                      type="button"
                      onClick={() => enterDemoSandbox('student')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      View Student Portal →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
            Transparent LKR subscription tiers
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Every institute runs in its own isolated tenant space with full data ownership.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(SUBSCRIPTION_PLANS) as Array<[SubscriptionTier, (typeof SUBSCRIPTION_PLANS)['pro']]>).map(
            ([tierKey, plan]) => {
              const isFeatured = tierKey === 'pro';
              return (
                <div
                  key={tierKey}
                  className={`rounded-xl p-7 flex flex-col justify-between bg-white border ${
                    isFeatured ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-slate-900">{plan.name}</h3>
                      <span className="text-xs text-slate-500">{plan.audience}</span>
                    </div>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                        {formatLkrCompact(plan.monthlyFeeLkr)}
                      </span>
                      <span className="text-sm text-slate-500">/ month</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-800">{plan.studentLimit}</p>
                      <p>{plan.staffLimit}</p>
                    </div>
                    <ul className="mt-5 space-y-2.5">
                      {plan.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href="#onboarding"
                    onClick={() => setPreferredTier(tierKey)}
                    className={`mt-7 w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-center transition-colors ${
                      isFeatured
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Select {plan.name}
                  </a>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* Request Institute Onboarding Form */}
      <section id="onboarding" className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              Request institute onboarding
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Ready to digitize your tuition institute in Colombo, Kandy, Galle, or islandwide?
              Submit your academy details and our platform team will provision your isolated tenant.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 mt-1 shrink-0" />
                <span>Dedicated multi-tenant isolation per institute</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                <span>Same-day batch &amp; student roster migration support</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-7">
            {submittedSuccess ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Onboarding request received
                </h3>
                <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                  Your institute application has been logged for review. While you wait, explore the
                  full Apex Academy sandbox environment.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => enterDemoSandbox('dashboard')}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    Try Live Demo Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedSuccess(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Submit Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Institute / Academy Name
                    </label>
                    <input
                      type="text"
                      required
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                      placeholder="e.g. Sasip Institute - Nugegoda"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      City / Town
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Kandy"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Director / Owner Name
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Mahesh Jayawardena"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Owner Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="director@academy.lk"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Sri Lankan Mobile (+94)
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Estimated Students
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      required
                      value={estimatedStudents}
                      onChange={(e) => setEstimatedStudents(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Plan Tier
                    </label>
                    <select
                      value={preferredTier}
                      onChange={(e) => setPreferredTier(e.target.value as SubscriptionTier)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="starter">Starter (Rs. 7,500/mo)</option>
                      <option value="pro">Pro (Rs. 16,500/mo)</option>
                      <option value="enterprise">Enterprise (Rs. 32,000/mo)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Streams &amp; Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. A/L Physical Science, Bio Science & O/L classes across 4 halls"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                {formError && (
                  <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Onboarding Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="font-display font-semibold text-slate-800">TuitionOS · Sri Lanka</p>
          <div className="flex items-center gap-6">
            <a href="#capabilities" className="hover:text-slate-900">Capabilities</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <button type="button" onClick={onNavigateLogin} className="hover:text-slate-900 cursor-pointer">
              Portal Sign In
            </button>
          </div>
          <p>© 2026 TuitionOS. Multi-tenant education operations.</p>
        </div>
      </footer>
    </div>
  );
}
