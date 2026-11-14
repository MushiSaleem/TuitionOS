import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Building2, Check, Plus, ShieldCheck, Users, X } from 'lucide-react';
import { useTuition } from '@/src/context/TuitionContext';
import {
  BillingStatus,
  InstituteStatus,
  SRI_LANKAN_DISTRICTS,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '@/src/types/tuition';
import { formatLkr, formatLkrCompact, formatTimestampLabel, normalizeSriLankanPhone, validateSriLankanPhone } from '@/src/utils/sriLanka';

export function SuperAdminPortal() {
  const {
    userProfile,
    allInstitutes,
    onboardingRequests,
    auditLogs,
    createInstituteAsSuperAdmin,
    updateInstituteControl,
    approveOnboardingRequest,
    rejectOnboardingRequest,
  } = useTuition();

  const [activeTab, setActiveTab] = useState<'institutes' | 'onboarding' | 'audit'>('institutes');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState<string>('Colombo');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [tier, setTier] = useState<SubscriptionTier>('pro');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (userProfile?.role !== 'super_admin') {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-8 text-center">
        <p className="text-sm font-semibold text-rose-700">
          Access Denied: Super Admin privileges required.
        </p>
      </div>
    );
  }

  const metrics = useMemo(() => {
    const activeInst = allInstitutes.filter((i) => i.status === 'active');
    const mrrLkr = activeInst.reduce((sum, i) => sum + (i.monthlyFeeLkr || 0), 0);
    const totalStudents = allInstitutes.reduce((sum, i) => sum + (i.activeStudentCount || 0), 0);
    const pendingReqCount = onboardingRequests.filter((r) => r.status === 'pending').length;
    return {
      mrrLkr,
      activeCount: activeInst.length,
      totalCount: allInstitutes.length,
      totalStudents,
      pendingReqCount,
    };
  }, [allInstitutes, onboardingRequests]);

  const tierRevenueData = useMemo(() => {
    return (['starter', 'pro', 'enterprise'] as SubscriptionTier[]).map((t) => {
      const matching = allInstitutes.filter((i) => i.subscriptionTier === t && i.status === 'active');
      return {
        tier: SUBSCRIPTION_PLANS[t].name,
        mrr: matching.reduce((s, i) => s + i.monthlyFeeLkr, 0),
        institutes: matching.length,
      };
    });
  }, [allInstitutes]);

  const handleCreateInstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validateSriLankanPhone(phone)) {
      setFormError('Enter a valid Sri Lankan phone number (+94 7X XXX XXXX).');
      return;
    }
    setSaving(true);
    try {
      await createInstituteAsSuperAdmin({
        name,
        city,
        district,
        phone: normalizeSriLankanPhone(phone),
        ownerEmail,
        ownerName,
        tier,
      });
      setShowCreateModal(false);
      setName('');
      setCity('');
      setPhone('');
      setOwnerName('');
      setOwnerEmail('');
    } catch {
      setFormError('Failed to provision institute. Check Firestore permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Platform Super Admin
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Multi-tenant institute provisioning, LKR subscription billing, and audit governance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Provision Institute
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Platform MRR</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatLkr(metrics.mrrLkr)}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">Active subscriptions</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Active Institutes</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {metrics.activeCount} / {metrics.totalCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Isolated tenant databases</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Active Students</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {metrics.totalStudents.toLocaleString('en-LK')}
          </p>
          <p className="mt-1 text-xs text-slate-500">Across all Sri Lankan tenants</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Pending Onboarding</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {metrics.pendingReqCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Awaiting approval</p>
        </div>
      </div>

      {/* MRR Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              MRR Distribution by Subscription Tier (LKR)
            </h2>
            <p className="text-xs text-slate-500">Monthly recurring revenue across active tenants</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierRevenueData} margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="tier" tick={{ fontSize: 12, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
              <Tooltip
                formatter={(value) => [formatLkrCompact(Number(value ?? 0)), 'MRR']}
                contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }}
              />
              <Bar dataKey="mrr" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('institutes')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'institutes'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Registered Institutes ({allInstitutes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('onboarding')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'onboarding'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Onboarding Queue ({metrics.pendingReqCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'institutes' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {allInstitutes.length === 0 ? (
            <div className="p-10 text-center">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">No institutes provisioned yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Provision your first Sri Lankan tuition institute or approve an onboarding request.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Institute</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4 text-right">Monthly Fee</th>
                    <th className="py-3 px-4">Billing</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {allInstitutes.map((inst) => (
                    <tr key={inst.instituteId} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{inst.name}</p>
                        <p className="text-xs text-slate-500">
                          {inst.city}, {inst.district} · {inst.phone}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-800">{inst.ownerName}</p>
                        <p className="text-xs text-slate-500">{inst.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={inst.subscriptionTier}
                          onChange={(e) => {
                            const nextTier = e.target.value as SubscriptionTier;
                            void updateInstituteControl(inst.instituteId, {
                              subscriptionTier: nextTier,
                              monthlyFeeLkr: SUBSCRIPTION_PLANS[nextTier].monthlyFeeLkr,
                            });
                          }}
                          className="text-xs font-medium border border-slate-300 rounded-md px-2 py-1 bg-white"
                        >
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                        {formatLkr(inst.monthlyFeeLkr)}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={inst.billingStatus}
                          onChange={(e) =>
                            void updateInstituteControl(inst.instituteId, {
                              billingStatus: e.target.value as BillingStatus,
                            })
                          }
                          className={`text-xs font-semibold border rounded-md px-2 py-1 bg-white ${
                            inst.billingStatus === 'paid'
                              ? 'text-emerald-700 border-emerald-200'
                              : inst.billingStatus === 'overdue'
                              ? 'text-rose-700 border-rose-200'
                              : 'text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={inst.status}
                          onChange={(e) =>
                            void updateInstituteControl(inst.instituteId, {
                              status: e.target.value as InstituteStatus,
                            })
                          }
                          className={`text-xs font-semibold border rounded-md px-2 py-1 bg-white ${
                            inst.status === 'active'
                              ? 'text-emerald-700 border-emerald-200'
                              : inst.status === 'suspended'
                              ? 'text-rose-700 border-rose-200'
                              : 'text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {inst.activeStudentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {onboardingRequests.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">No onboarding requests</p>
              <p className="text-xs text-slate-500 mt-1">
                Submissions from the public landing page appear here for approval.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {onboardingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-indigo-600 uppercase">{req.preferredTier}</span>
                      <span>·</span>
                      <span>{req.city}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">~{req.estimatedStudents} students</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-slate-900 mt-1">
                      {req.instituteName}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {req.ownerName} · {req.email} · {req.phone}
                    </p>
                    {req.notes && <p className="text-xs text-slate-500 mt-1">{req.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void approveOnboardingRequest(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve &amp; Provision
                        </button>
                        <button
                          type="button"
                          onClick={() => void rejectOnboardingRequest(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-xs font-semibold ${
                          req.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {req.status === 'approved' ? 'Approved & Provisioned' : 'Rejected'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {auditLogs.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No audit events recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {auditLogs.map((log) => (
                    <tr key={log.logId}>
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatTimestampLabel(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{log.action}</td>
                      <td className="py-3 px-4 text-slate-600">{log.actorEmail}</td>
                      <td className="py-3 px-4 text-slate-700">{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Institute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Provision New Tuition Institute
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInstitute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institute Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Synergy Academy - Kandy"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kandy"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {SRI_LANKAN_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Nuwan Bandara"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Owner Google Email
                  </label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@academy.lk"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile (+94)</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 450 2211"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="starter">Starter (Rs. 7,500/mo)</option>
                    <option value="pro">Pro (Rs. 16,500/mo)</option>
                    <option value="enterprise">Enterprise (Rs. 32,000/mo)</option>
                  </select>
                </div>
              </div>

              {formError && <p className="text-xs text-rose-600">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  {saving ? 'Provisioning...' : 'Provision & Invite Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
