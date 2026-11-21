import React from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  QrCode,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { PortalView, useTuition } from '@/src/context/TuitionContext';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const {
    mode,
    userProfile,
    activeInstitute,
    activePortal,
    setActivePortal,
    logout,
    exitDemoSandbox,
    resetDemoSandbox,
    clientConfig,
    demoSandboxEnabled,
  } = useTuition();

  const brandName = clientConfig.branding.academyName;
  const isDemo = demoSandboxEnabled && mode === 'demo_sandbox';
  const role = isDemo ? 'demo' : userProfile?.role;

  // Navigation items permitted for the current role (strict isolation)
  const navItems: Array<{ id: PortalView; label: string; icon: React.ReactNode }> = [];

  if (role === 'super_admin') {
    navItems.push({
      id: 'super_admin',
      label: 'Platform Control',
      icon: <Shield className="w-4 h-4" />,
    });
  } else if (role === 'institute_admin') {
    navItems.push(
      { id: 'dashboard', label: 'Admin Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'counter', label: 'Counter POS', icon: <QrCode className="w-4 h-4" /> },
      { id: 'lecturer', label: 'Exams & Marks', icon: <BookOpen className="w-4 h-4" /> }
    );
  } else if (role === 'receptionist') {
    navItems.push({
      id: 'counter',
      label: 'Counter POS',
      icon: <QrCode className="w-4 h-4" />,
    });
  } else if (role === 'lecturer') {
    navItems.push({
      id: 'lecturer',
      label: 'Lecturer Portal',
      icon: <BookOpen className="w-4 h-4" />,
    });
  } else if (role === 'student') {
    navItems.push({
      id: 'student',
      label: 'Student Portal',
      icon: <GraduationCap className="w-4 h-4" />,
    });
  } else if (isDemo) {
    // Strictly isolated inside Apex Academy Demo Sandbox (Super Admin never exposed)
    navItems.push(
      { id: 'dashboard', label: 'Admin Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'counter', label: 'Counter & Check-In', icon: <QrCode className="w-4 h-4" /> },
      { id: 'lecturer', label: 'Lecturer Portal', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'student', label: 'Student Portal', icon: <GraduationCap className="w-4 h-4" /> }
    );
  }

  const showMobileBottomBar =
    activePortal === 'counter' || activePortal === 'student' || isDemo;

  const portalLabelMap: Record<PortalView, string> = {
    super_admin: 'Super Admin Console',
    dashboard: 'Institute Admin Dashboard',
    counter: 'Reception Counter & Check-In',
    lecturer: 'Lecturer Workspace',
    student: 'Student & Parent Portal',
  };

  return (
    <div className="min-h-screen bg-brand-surface text-brand-body flex flex-col lg:flex-row">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="px-6 h-16 flex items-center gap-2.5 border-b border-slate-200">
          {clientConfig.branding.logoUrl && (
            <img
              src={clientConfig.branding.logoUrl}
              alt={brandName}
              className="w-6 h-6 rounded object-contain shrink-0"
            />
          )}
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 truncate">
            {brandName}
          </span>
        </div>

        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-primary-soft text-brand-primary flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {role === 'super_admin'
                  ? `${brandName} Platform`
                  : activeInstitute?.name || 'Loading Institute...'}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {isDemo
                  ? `Demo Sandbox · ${clientConfig.demo.sandboxCity}`
                  : userProfile?.displayName || userProfile?.email}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = activePortal === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePortal(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-brand-primary-soft text-brand-primary font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          {isDemo && clientConfig.demo.allowReset && (
            <button
              type="button"
              onClick={resetDemoSandbox}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Sandbox Data
            </button>
          )}
          <button
            type="button"
            onClick={isDemo ? exitDemoSandbox : logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isDemo ? 'Exit Demo Sandbox' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Breadcrumb Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-14 lg:h-16 px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="lg:hidden font-display font-bold text-slate-900 shrink-0">{brandName}</span>
            <span className="lg:hidden text-slate-300">/</span>
            <span className="hidden lg:inline text-slate-500 truncate">
              {role === 'super_admin' ? 'Platform' : activeInstitute?.name || 'Institute'}
            </span>
            <span className="hidden lg:inline text-slate-300">/</span>
            <span className="font-semibold text-slate-900 truncate">
              {portalLabelMap[activePortal]}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isDemo && (
              <span className="text-xs font-medium text-brand-primary bg-brand-primary-soft border border-brand-primary px-2.5 py-1 rounded-md whitespace-nowrap">
                Demo Sandbox
              </span>
            )}
            <button
              type="button"
              onClick={isDemo ? exitDemoSandbox : logout}
              className="lg:hidden px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              {isDemo ? 'Exit' : 'Sign Out'}
            </button>
          </div>
        </header>

        <main className={`flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto ${showMobileBottomBar ? 'pb-24 lg:pb-8' : ''}`}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Counter Check-In, Student & Demo Views) */}
      {showMobileBottomBar && navItems.length > 0 && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around">
          {navItems.map((item) => {
            const active = activePortal === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePortal(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  active ? 'text-brand-primary' : 'text-slate-500'
                }`}
              >
                {item.icon}
                <span className="truncate max-w-[78px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
