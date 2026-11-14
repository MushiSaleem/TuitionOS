/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TuitionProvider, useTuition } from '@/src/context/TuitionContext';
import { LandingPage } from '@/src/pages/LandingPage';
import { LoginPage } from '@/src/pages/LoginPage';
import { AppShell } from '@/src/components/AppShell';
import { SuperAdminPortal } from '@/src/pages/SuperAdminPortal';
import { InstituteAdminDashboard } from '@/src/pages/InstituteAdminDashboard';
import { ReceptionCounterPortal } from '@/src/pages/ReceptionCounterPortal';
import { LecturerPortal } from '@/src/pages/LecturerPortal';
import { StudentPortal } from '@/src/pages/StudentPortal';

function TuitionRouter() {
  const { mode, authReady, userProfile, activePortal, authError } = useTuition();
  const [showLogin, setShowLogin] = useState(false);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Loading TuitionOS...</p>
        </div>
      </div>
    );
  }

  // Show workspace if inside Demo Sandbox or authenticated with resolved UserProfile
  if (mode === 'demo_sandbox' || (mode === 'live_firebase' && userProfile)) {
    return (
      <AppShell>
        {activePortal === 'super_admin' && <SuperAdminPortal />}
        {activePortal === 'dashboard' && <InstituteAdminDashboard />}
        {activePortal === 'counter' && <ReceptionCounterPortal />}
        {activePortal === 'lecturer' && <LecturerPortal />}
        {activePortal === 'student' && <StudentPortal />}
      </AppShell>
    );
  }

  if (showLogin || (mode === 'live_firebase' && !userProfile && !authError)) {
    return <LoginPage onBackHome={() => setShowLogin(false)} />;
  }

  return <LandingPage onNavigateLogin={() => setShowLogin(true)} />;
}

export default function App() {
  return (
    <TuitionProvider>
      <TuitionRouter />
    </TuitionProvider>
  );
}
