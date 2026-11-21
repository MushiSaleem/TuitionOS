import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Layers,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useTuition } from '@/src/context/TuitionContext';
import { SubscriptionTier } from '@/src/types/tuition';
import { normalizeSriLankanPhone, validateSriLankanPhone } from '@/src/utils/sriLanka';
import { DEFAULT_DEV_CLIENT_CONFIG } from '@/src/config/clientConfig';
import { HeroProductPreview } from '@/src/components/landing/HeroProductPreview';
import { CapabilitiesShowcase } from '@/src/components/landing/CapabilitiesShowcase';
import { RoleExperienceSection } from '@/src/components/landing/RoleExperienceSection';
import heroAcademyImg from '@/src/assets/images/hero_tuition_academy_1794594687520.jpg';

interface LandingPageProps {
  onNavigateLogin: () => void;
}

const CHALLENGE_ITEMS = [
  {
    index: '01',
    title: 'Student records scattered across spreadsheets and paper files',
    detail: 'NIC numbers, parent mobiles, school details, and subject enrollments fall out of sync.',
  },
  {
    index: '02',
    title: 'Slow manual attendance during weekend hall rushes',
    detail: 'Paper roll calls hold up queues and disconnect attendance from monthly fee status.',
  },
  {
    index: '03',
    title: 'Complicated monthly card tracking and cash reconciliation',
    detail: 'Full cards, half cards, free cards, and admission fees create end-of-day balancing errors.',
  },
  {
    index: '04',
    title: 'Time-consuming lecturer payment split calculations',
    detail: 'Calculating 70/30 or custom percentage shares across classes manually invites disputes.',
  },
  {
    index: '05',
    title: 'Exam marks and class rankings compiled by hand',
    detail: 'Sorting hundreds of paper scores into A/B/C/S/W grades and ranks takes hours every term.',
  },
  {
    index: '06',
    title: 'Limited visibility for students and parents',
    detail: 'Families lack a single place to confirm paid cards, attendance dates, and paper standings.',
  },
];

const WHITE_GLOVE_DELIVERABLES = [
  {
    index: '01',
    title: 'Academy-specific branding',
    detail: 'Your logo, colour system, typography, and metadata applied through declarative deployment config.',
  },
  {
    index: '02',
    title: 'Custom domain and public academy website',
    detail: 'A dedicated web address and branded academy presence tailored around your institute.',
  },
  {
    index: '03',
    title: 'Dedicated academy environment',
    detail: 'Your institute operates in its own isolated deployment and cloud data environment.',
  },
  {
    index: '04',
    title: 'Initial system configuration',
    detail: 'Classes, halls, academic streams, mediums, fee structures, and lecturer split rules set up with you.',
  },
  {
    index: '05',
    title: 'Data onboarding assistance',
    detail: 'Guided transition from paper registers and spreadsheets into clean student and batch rosters.',
  },
  {
    index: '06',
    title: 'Hands-on staff training',
    detail: 'Practical onboarding sessions for administrators, reception counter staff, and lecturers.',
  },
  {
    index: '07',
    title: 'Implementation support',
    detail: 'Direct assistance from Novora Edge during launch weeks and weekend class check-in rollouts.',
  },
  {
    index: '08',
    title: 'Ongoing product improvements',
    detail: 'Controlled upgrades from the centrally maintained TuitionOS core without rebuilding your system.',
  },
];

const CORE_MODULES_NOW = [
  {
    title: 'Student & enrollment registry',
    detail: 'Sri Lankan NIC formats, +94 contacts, O/L & A/L streams, mediums, and QR student IDs.',
  },
  {
    title: 'QR attendance & fee-status gate checks',
    detail: 'Fast counter scanning that logs attendance and flags paid, half, free, or overdue cards.',
  },
  {
    title: 'Monthly class cards & 80mm thermal receipts',
    detail: 'Jan–Dec card tracking across cash, card, and bank transfers with structured receipt numbers.',
  },
  {
    title: 'Lecturer commission splits & payouts',
    detail: 'Automatic lecturer and institute share calculation per collected fee.',
  },
  {
    title: 'Examinations, grades & class rankings',
    detail: 'Bulk mark entry, automatic A/B/C/S/W grades, and ranked class sheets.',
  },
  {
    title: 'Study material links & academy reporting',
    detail: 'Lecturers publish PDF notes, tutes, and past paper links while admins monitor halls and collections.',
  },
];

const EXPANSION_MODULES = [
  {
    title: 'Learning management & recorded lessons',
    status: 'Planned module',
    detail: 'Structured online lesson delivery and recorded class archives integrated with enrollments.',
  },
  {
    title: 'Announcements & hosted study materials',
    status: 'Planned module',
    detail: 'Centralized academy notices and managed file distribution alongside linked notes.',
  },
  {
    title: 'Automated SMS notifications',
    status: 'Planned integration',
    detail: 'Attendance, fee confirmation, and schedule notices via local Sri Lankan SMS providers.',
  },
  {
    title: 'Online payment gateways',
    status: 'Planned integration',
    detail: 'Online monthly card payments via gateways such as PayHere or WebXPay.',
  },
  {
    title: 'Dedicated student & parent production sign-in',
    status: 'Planned enhancement',
    detail: 'Self-service authenticated family access extending the current portal experience.',
  },
  {
    title: 'Additional academy integrations',
    status: 'Optional expansion',
    detail: 'WhatsApp alerts, custom reporting exports, and institute-specific workflow extensions.',
  },
];

const TRUST_PRINCIPLES = [
  {
    title: 'Separate academy environments',
    detail: 'Each white-glove academy receives its own dedicated cloud configuration and isolated operational space.',
  },
  {
    title: 'Role-based access',
    detail: 'Owners, reception counter staff, and lecturers only see the workspaces and actions assigned to their role.',
  },
  {
    title: 'Secure authentication',
    detail: 'Staff sign in cleanly through Firebase Authentication using email/password or Google accounts without public demo switchers.',
  },
  {
    title: 'Controlled access to academy records',
    detail: 'Student profiles, attendance logs, fee receipts, and exam marks remain scoped strictly to authorized institute members.',
  },
  {
    title: 'Scalable cloud-based foundation',
    detail: 'Built on modern web infrastructure designed for peak weekend intake rushes across desktop and mobile counters.',
  },
  {
    title: 'Continuous product development',
    detail: 'Delivered from a centrally maintained core so your academy benefits from steady improvements over time.',
  },
];

export function LandingPage({ onNavigateLogin }: LandingPageProps) {
  const { enterDemoSandbox, submitOnboardingRequest, clientConfig, demoSandboxEnabled } = useTuition();
  const brandName = clientConfig.branding.academyName;
  const currencySymbol = clientConfig.localization.currencySymbol;
  const isDefaultMarketingSite = clientConfig.clientSlug === DEFAULT_DEV_CLIENT_CONFIG.clientSlug;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  // Demo booking / onboarding intake state (wired to real Firestore submitOnboardingRequest)
  const formInputRef = useRef<HTMLInputElement | null>(null);
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

  const scrollToDemoBooking = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('book-demo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    window.setTimeout(() => {
      formInputRef.current?.focus();
    }, 350);
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!instituteName.trim() || !city.trim() || !ownerName.trim() || !email.trim()) {
      setFormError('Please complete all required academy and contact fields.');
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
      setFormError('Unable to submit your request right now. Please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#18213B] overflow-x-clip">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#10172D]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24C8B5]"
          >
            {clientConfig.branding.logoUrl && (
              <img
                src={clientConfig.branding.logoUrl}
                alt={brandName}
                className="w-7 h-7 rounded-md object-contain shrink-0"
              />
            )}
            <span>{brandName}</span>
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
            aria-label="Primary navigation"
          >
            <a
              href="#platform"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Platform
            </a>
            <a
              href="#roles"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Roles
            </a>
            <a
              href="#implementation"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              White-Glove
            </a>
            <a
              href="#trust"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Security
            </a>
          </nav>

          {/* Zone 3: 1 primary action + mobile menu toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onNavigateLogin}
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#10172D] border-t border-white/10 px-5 py-4 space-y-1">
            {[
              { href: '#platform', label: 'Platform Capabilities' },
              { href: '#roles', label: 'Academy Roles' },
              { href: '#implementation', label: 'White-Glove Delivery' },
              { href: '#expansion', label: 'Growth & Roadmap' },
              { href: '#trust', label: 'Trust & Technology' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 text-sm font-medium text-slate-200 hover:text-white border-b border-white/5 last:border-0"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={scrollToDemoBooking}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover transition-colors cursor-pointer"
              >
                Book a Personal Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateLogin();
                }}
                className="w-full py-2.5 px-4 text-sm font-semibold text-slate-200 border border-white/20 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                Sign In to Workspace
              </button>
            </div>
          </div>
        )}
      </header>

      {/* SECTION 1 — PREMIUM DARK HERO */}
      <section id="top" className="landing-hero-surface text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-12 pb-16 lg:pt-18 lg:pb-22">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero Copy */}
            <div className="lg:col-span-6 landing-fade-up">
              <p className="text-xs sm:text-sm font-medium text-[#24C8B5] tracking-wide">
                {brandName} by Novora Edge <span aria-hidden="true">·</span> Sri Lankan Tuition Operations
              </p>

              <h1
                className="mt-4 font-display font-bold tracking-tight text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.65rem)', textWrap: 'balance' }}
              >
                {isDefaultMarketingSite ? (
                  <>
                    Run your academy.
                    <br />
                    <span className="text-slate-300">Not a hundred different systems.</span>
                  </>
                ) : (
                  clientConfig.branding.tagline
                )}
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                {brandName} brings students, classes, attendance, fees, examinations and academy
                operations together in one intelligent platform—configured and implemented around
                your institute by Novora Edge.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={scrollToDemoBooking}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Book a Personal Demo
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#platform"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-white/8 border border-white/18 rounded-lg hover:bg-white/14 transition-colors whitespace-nowrap shrink-0"
                >
                  Explore the Platform
                </a>
              </div>

              <div className="mt-8 pt-6 border-t border-white/12 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                <span>G.C.E. O/L &amp; A/L Streams</span>
                <span aria-hidden="true">·</span>
                <span>{clientConfig.localization.currency} &amp; NIC Ready</span>
                <span aria-hidden="true">·</span>
                <span>Dedicated White-Glove Setup</span>
                {demoSandboxEnabled && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => enterDemoSandbox(clientConfig.demo.defaultPortal)}
                      className="font-semibold text-[#24C8B5] hover:text-white transition-colors cursor-pointer"
                    >
                      Try Live Demo Sandbox →
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Hero Dominant Focal Anchor: Interactive Illustrative Product Preview */}
            <div className="lg:col-span-6 landing-fade-up-delay">
              <HeroProductPreview
                brandName={brandName}
                currencySymbol={currencySymbol}
                demoSandboxEnabled={demoSandboxEnabled}
                onLaunchDemo={
                  demoSandboxEnabled
                    ? () => enterDemoSandbox(clientConfig.demo.defaultPortal)
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THE ACADEMY MANAGEMENT CHALLENGE (Bright White) */}
      <section className="bg-white py-20 lg:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-brand-primary tracking-wide">
              The academy management challenge
            </p>
            <h2
              className="mt-2.5 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18213B] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Your academy deserves better than disconnected tools.
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Growing tuition academies outgrow notebooks, spreadsheets, and ad-hoc counters fast.
              When student records, attendance, monthly cards, and lecturer payouts live in
              separate places, every weekend creates avoidable friction.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Numbered Friction Ledger */}
            <div className="lg:col-span-7 divide-y divide-slate-200 border-y border-slate-200">
              {CHALLENGE_ITEMS.map((item) => (
                <div key={item.index} className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4">
                  <span className="sm:col-span-1 font-mono text-xs font-semibold text-brand-primary pt-0.5">
                    {item.index}.
                  </span>
                  <div className="sm:col-span-11">
                    <h3 className="font-display text-base font-semibold text-[#18213B]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Unified Operations Visual Column */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[#F5F7FF] border border-slate-200 overflow-hidden">
              <div className="p-6 sm:p-7 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-brand-primary">How {brandName} connects it</p>
                  <h3 className="mt-1.5 font-display text-xl font-bold text-[#18213B]">
                    One operational backbone from front desk to lecturer payout
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    ['Student Profile', 'NIC, stream, medium, guardian & QR ID'],
                    ['QR Gate Check-In', 'Attendance linked live to monthly card status'],
                    ['Counter POS', '80mm receipts & 12-month card reconciliation'],
                    ['Lecturer Split Engine', 'Automatic commission calculation per class'],
                    ['Exam & Rank Ledger', 'Bulk paper marks, grades & class standings'],
                  ].map(([step, desc], i) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 py-2.5 border-b border-slate-200/80 last:border-0"
                    >
                      <span className="font-mono text-xs font-semibold text-brand-primary pt-0.5 shrink-0">
                        0{i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#18213B]">{step}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative h-48 sm:h-52 border-t border-slate-200 bg-slate-100">
                {!heroImgError ? (
                  <img
                    src={heroAcademyImg}
                    alt="Sri Lankan tuition academy lecture hall"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-600">
                    <GraduationCap className="w-8 h-8 text-brand-primary mb-2" />
                    <p className="text-sm font-medium text-[#18213B]">Built for Sri Lankan Academies</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — ONE PLATFORM. COMPLETE ACADEMY OPERATIONS (Cloud White) */}
      <section id="platform" className="bg-[#F5F7FF] py-20 lg:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-brand-primary tracking-wide">
              Core platform capabilities
            </p>
            <h2
              className="mt-2.5 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18213B] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              One platform. Complete academy operations.
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Every module is designed around how Sri Lankan tuition institutes actually run—from
              G.C.E. O/L and A/L enrollments to weekend QR check-ins, 80mm thermal receipts, and
              lecturer commission settlements.
            </p>
          </div>

          <CapabilitiesShowcase
            currencySymbol={currencySymbol}
            demoSandboxEnabled={demoSandboxEnabled}
            onEnterDemo={(portal) => enterDemoSandbox(portal)}
          />
        </div>
      </section>

      {/* SECTION 4 — DESIGNED FOR EVERYONE IN THE ACADEMY (Bright White) */}
      <section id="roles" className="bg-white py-20 lg:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-brand-primary tracking-wide">
              Purpose-built role experiences
            </p>
            <h2
              className="mt-2.5 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18213B] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Designed for everyone in the academy.
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Instead of forcing counter staff, lecturers, and administrators into the same
              cluttered screen, each role receives a focused workflow tailored to their daily work.
            </p>
          </div>

          <RoleExperienceSection currencySymbol={currencySymbol} />
        </div>
      </section>

      {/* SECTION 5 — MORE THAN SOFTWARE. A COMPLETE IMPLEMENTATION (Dark Navy Hybrid Band) */}
      <section id="implementation" className="bg-[#10172D] text-white py-20 lg:py-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Commercial Positioning + Dedicated Stack Visual */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <p className="text-xs font-semibold text-[#24C8B5] tracking-wide">
                  White-glove implementation by Novora Edge
                </p>
                <h2
                  className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Your academy. Your brand. Your own system.
                </h2>
                <p className="mt-4 text-base text-slate-300 leading-relaxed">
                  You are not left alone with a generic self-serve login. Novora Edge configures,
                  brands, and launches {brandName} around your institute’s structure—then supports
                  your team as your academy grows.
                </p>
              </div>

              {/* Dedicated Academy Architecture Blueprint */}
              <div className="rounded-2xl bg-[#171F3B] border border-white/12 p-6 space-y-4">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-[#24C8B5]">
                  <Layers className="w-4 h-4" />
                  <span>What every paying academy receives</span>
                </div>

                <div className="divide-y divide-white/10 text-sm">
                  <div className="py-3 first:pt-0">
                    <p className="font-semibold text-white">Branded Public Presence</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Custom domain, academy name, colours, logo, and public academy website
                    </p>
                  </div>
                  <div className="py-3">
                    <p className="font-semibold text-white">Isolated Academy Workspace</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Dedicated deployment and cloud environment configured exclusively for your institute
                    </p>
                  </div>
                  <div className="py-3">
                    <p className="font-semibold text-white">Guided Launch &amp; Training</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Initial fee/hall setup, roster onboarding, and hands-on staff training
                    </p>
                  </div>
                  <div className="py-3 last:pb-0">
                    <p className="font-semibold text-white">Centrally Maintained Core</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Controlled releases from the TuitionOS platform without maintaining custom forks
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 8-Item White-Glove Deliverables Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7 pt-2">
              {WHITE_GLOVE_DELIVERABLES.map((item) => (
                <div key={item.index} className="border-t border-white/12 pt-5">
                  <p className="font-mono text-xs font-semibold text-[#8B7CFF]">{item.index}.</p>
                  <h3 className="mt-2 font-display text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — BUILT TO GROW WITH YOUR ACADEMY (Cloud White) */}
      <section id="expansion" className="bg-[#F5F7FF] py-20 lg:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-brand-primary tracking-wide">
              Modular platform evolution
            </p>
            <h2
              className="mt-2.5 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18213B] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Built to grow with your academy.
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Start with rock-solid daily academy operations today, and expand into deeper digital
              learning and automated parent integrations as optional modules come online.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Available Now Column */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8">
              <div className="pb-5 border-b border-slate-200 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-xl font-bold text-[#18213B]">
                  Core Academy Operations
                </h3>
                <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                  Available now
                </span>
              </div>
              <div className="divide-y divide-slate-200">
                {CORE_MODULES_NOW.map((mod) => (
                  <div key={mod.title} className="py-4 first:pt-5 last:pb-0">
                    <p className="text-sm font-semibold text-[#18213B]">{mod.title}</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{mod.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Planned & Optional Modules Column */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8">
              <div className="pb-5 border-b border-slate-200 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-xl font-bold text-[#18213B]">
                  Expansion &amp; Integration Roadmap
                </h3>
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  Planned &amp; optional
                </span>
              </div>
              <div className="divide-y divide-slate-200">
                {EXPANSION_MODULES.map((mod) => (
                  <div key={mod.title} className="py-4 first:pt-5 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-[#18213B]">{mod.title}</p>
                      <span className="text-xs font-medium text-brand-primary">{mod.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{mod.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — TRUST AND TECHNOLOGY (Bright White) */}
      <section id="trust" className="bg-white py-20 lg:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-brand-primary tracking-wide">
              Trust and technology
            </p>
            <h2
              className="mt-2.5 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18213B] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              A disciplined cloud foundation built around academy privacy.
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Your student roster, fee ledger, and examination records are core institutional
              assets. {brandName} is architected to keep academy environments separated and
              controlled.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-9">
            {TRUST_PRINCIPLES.map((principle, idx) => (
              <div key={principle.title} className="border-t border-slate-200 pt-5">
                <p className="font-mono text-xs font-semibold text-brand-primary">
                  0{idx + 1}.
                </p>
                <h3 className="mt-2 font-display text-lg font-semibold text-[#18213B]">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{principle.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8 — FINAL CONVERSION & PERSONAL DEMO BOOKING (Dark Midnight Band) */}
      <section id="book-demo" className="landing-cta-surface text-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Conversion Messaging */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="text-xs font-semibold text-[#24C8B5] tracking-wide">
                  Personal walkthrough &amp; implementation consultation
                </p>
                <h2
                  className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Ready to bring your academy into a better system?
                </h2>
                <p className="mt-4 text-base text-slate-300 leading-relaxed">
                  Let’s explore how {brandName} can be configured around the way your academy works.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => formInputRef.current?.focus()}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Book a Personal Demo
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href={`mailto:${clientConfig.contact.email}?subject=${encodeURIComponent(
                    `${brandName} Implementation Inquiry`
                  )}`}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-white/8 border border-white/18 rounded-lg hover:bg-white/14 transition-colors whitespace-nowrap shrink-0"
                >
                  Talk to Novora Edge
                </a>
              </div>

              {/* Configured Contact Details Only (Never Invented) */}
              <div className="pt-6 border-t border-white/12 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#24C8B5] shrink-0" />
                  <a
                    href={`mailto:${clientConfig.contact.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {clientConfig.contact.email}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#24C8B5] shrink-0" />
                  <span className="font-mono">{clientConfig.contact.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#24C8B5] shrink-0" />
                  <span>
                    {clientConfig.contact.address}, {clientConfig.contact.country}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/12 flex items-start gap-3 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-[#8B7CFF] shrink-0 mt-0.5" />
                <span>
                  Dedicated academy setup, branding configuration, and guided staff onboarding handled
                  directly by Novora Edge.
                </span>
              </div>
            </div>

            {/* Right Interactive Demo Request Form (Wired to Real Firestore Intake) */}
            <div className="lg:col-span-7 bg-white text-[#18213B] rounded-2xl p-6 sm:p-8 border border-white/10">
              {submittedSuccess ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                  <h3 className="font-display text-xl font-bold text-[#18213B]">
                    Demo request received
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    {demoSandboxEnabled
                      ? `Your academy details have been logged for Novora Edge. While we prepare your walkthrough, you can also explore the ${clientConfig.demo.sandboxInstituteName} interactive sandbox.`
                      : 'Your academy details have been logged. Novora Edge will reach out to coordinate your personal demonstration.'}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {demoSandboxEnabled && (
                      <button
                        type="button"
                        onClick={() => enterDemoSandbox(clientConfig.demo.defaultPortal)}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover cursor-pointer"
                      >
                        Try Live Demo Sandbox
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSubmittedSuccess(false)}
                      className="px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                  <div className="pb-2 border-b border-slate-200">
                    <h3 className="font-display text-lg font-bold text-[#18213B]">
                      Request a Personal Demo &amp; Implementation Call
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Tell us about your academy so we can tailor the walkthrough to your classes and
                      counter workflows.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="demo-institute-name"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Academy / Institute Name
                      </label>
                      <input
                        id="demo-institute-name"
                        ref={formInputRef}
                        type="text"
                        required
                        value={instituteName}
                        onChange={(e) => setInstituteName(e.target.value)}
                        placeholder="e.g. Sasip Institute - Nugegoda"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="demo-city"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        City / Town
                      </label>
                      <input
                        id="demo-city"
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Kandy"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ring-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="demo-owner-name"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Director / Owner Name
                      </label>
                      <input
                        id="demo-owner-name"
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Mahesh Jayawardena"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="demo-email"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Email Address
                      </label>
                      <input
                        id="demo-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="director@academy.lk"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ring-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="demo-phone"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Sri Lankan Mobile (+94)
                      </label>
                      <input
                        id="demo-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+94 77 123 4567"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="demo-students"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Estimated Students
                      </label>
                      <input
                        id="demo-students"
                        type="number"
                        min={10}
                        max={50000}
                        required
                        value={estimatedStudents}
                        onChange={(e) => setEstimatedStudents(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="demo-scale"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Academy Size
                      </label>
                      <select
                        id="demo-scale"
                        value={preferredTier}
                        onChange={(e) => setPreferredTier(e.target.value as SubscriptionTier)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 ring-brand-primary"
                      >
                        <option value="starter">Small Center (Up to 250)</option>
                        <option value="pro">Multi-Stream Academy (250–1,500)</option>
                        <option value="enterprise">Large / Multi-Hall (1,500+)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="demo-notes"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Streams, Halls &amp; Goals (Optional)
                    </label>
                    <textarea
                      id="demo-notes"
                      rows={2}
                      maxLength={500}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. A/L Physical Science, Bio Science & O/L classes across 4 halls"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ring-brand-primary"
                    />
                  </div>

                  {formError && (
                    <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-5 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {submitting ? 'Submitting Request...' : 'Book a Personal Demo'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9 — PROFESSIONAL FOOTER */}
      <footer className="bg-[#0B1020] text-slate-400 border-t border-white/10 py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/10">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                {clientConfig.branding.logoUrl && (
                  <img
                    src={clientConfig.branding.logoUrl}
                    alt={brandName}
                    className="w-6 h-6 rounded object-contain shrink-0"
                  />
                )}
                <p className="font-display text-lg font-bold text-white">{brandName}</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                {clientConfig.branding.description}
              </p>
              <p className="text-xs text-slate-500 pt-1">
                Developed and delivered by <span className="text-slate-300 font-medium">Novora Edge</span>.
              </p>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-sm">
              <p className="font-display text-xs font-semibold text-white">Product</p>
              <ul className="space-y-2">
                <li>
                  <a href="#platform" className="hover:text-white transition-colors">
                    Platform Capabilities
                  </a>
                </li>
                <li>
                  <a href="#roles" className="hover:text-white transition-colors">
                    Academy Roles
                  </a>
                </li>
                <li>
                  <a href="#implementation" className="hover:text-white transition-colors">
                    White-Glove Implementation
                  </a>
                </li>
                <li>
                  <a href="#expansion" className="hover:text-white transition-colors">
                    Expansion Roadmap
                  </a>
                </li>
                <li>
                  <a href="#trust" className="hover:text-white transition-colors">
                    Trust &amp; Technology
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-2.5 text-sm">
              <p className="font-display text-xs font-semibold text-white">Contact &amp; Access</p>
              <ul className="space-y-2">
                <li>
                  <a
                    href={`mailto:${clientConfig.contact.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {clientConfig.contact.email}
                  </a>
                </li>
                <li className="font-mono text-xs">{clientConfig.contact.phone}</li>
                <li className="text-xs text-slate-500">
                  {clientConfig.contact.address}, {clientConfig.contact.country}
                </li>
                <li className="pt-2">
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#24C8B5] hover:text-white transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Academy Portal Sign In
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© 2026 {brandName} · Novora Edge. All rights reserved.</p>
            <p>
              {clientConfig.contact.city}, {clientConfig.contact.country}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
