import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Landmark,
  LayoutDashboard,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  Ticket,
  TrendingUp,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts';
import { adminAPI } from '../../api/admin';
import type {
  PendingRestaurant, PendingEvent, AdminUser, AuditLogEntry, AnalyticsOverview,
} from '../../api/admin';
import { restaurantAPI, payoutAPI } from '../../api/zesty';
import type { EarningsSummary } from '../../api/zesty';
import type { Restaurant } from '../../types';
import { DashboardShell, type DashNavGroup } from '../../components/dashboard/DashboardShell';
import PlatformAnalyticsView from './analytics/PlatformAnalyticsView';
import ZestyAnalyticsView from './analytics/ZestyAnalyticsView';
import EventraAnalyticsView from './analytics/EventraAnalyticsView';
import {
  EmptyState,
  ErrorBanner,
  Field,
  KpiLedger,
  Panel,
  SectionHeading,
  SkeletonRows,
  StatusPill,
} from '../../components/dashboard/primitives';
import { formatDate, formatINR, formatInt, greeting, humanize, themes, toNumber } from '../../components/dashboard/theme';

type Tab = 'approvals' | 'users' | 'audit' | 'analytics' | 'zesty_analytics' | 'eventra_analytics' | 'payouts';
const ANALYTICS_TABS: Tab[] = ['analytics', 'zesty_analytics', 'eventra_analytics'];

// The admin API returns geo and commission fields the shared Restaurant type omits.
type RestaurantWithGeo = Restaurant & { city?: string; state?: string; commission_rate?: number };

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingRestaurants, setPendingRestaurants] = useState<PendingRestaurant[]>([]);
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [ledgerData, setLedgerData] = useState<AnalyticsOverview | null>(null);

  // Payouts tab
  const [payoutRestaurantSearch, setPayoutRestaurantSearch] = useState('');
  const [payoutRestaurantResults, setPayoutRestaurantResults] = useState<Restaurant[]>([]);
  const [selectedPayoutRestaurant, setSelectedPayoutRestaurant] = useState<Restaurant | null>(null);
  const [payoutEarnings, setPayoutEarnings] = useState<EarningsSummary | null>(null);
  const [payoutForm, setPayoutForm] = useState({ period_start: '', period_end: '', notes: '' });
  const [commissionRateInput, setCommissionRateInput] = useState('');
  const [payoutBusy, setPayoutBusy] = useState(false);

  const loadApprovals = useCallback(async () => {
    const [restaurants, events] = await Promise.all([
      adminAPI.pendingRestaurants(),
      adminAPI.pendingEvents(),
    ]);
    setPendingRestaurants(restaurants);
    setPendingEvents(events);
  }, []);

  const loadUsers = useCallback(async (search?: string) => {
    const data = await adminAPI.users(search ? { search } : undefined);
    setUsers(data);
  }, []);

  const loadAuditLog = useCallback(async () => {
    const data = await adminAPI.auditLog(50);
    setAuditLog(data);
  }, []);

  const loadActiveTab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'approvals') await loadApprovals();
      else if (activeTab === 'users') await loadUsers(userSearch || undefined);
      else if (activeTab === 'audit') await loadAuditLog();
      // Analytics tabs load their own reports; 'payouts' has no data to load
      // until a restaurant is picked.
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handlePayoutRestaurantSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutRestaurantSearch.trim()) return;
    try {
      const data = await restaurantAPI.list({ search: payoutRestaurantSearch.trim() });
      setPayoutRestaurantResults(data.results);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to search restaurants');
    }
  };

  const selectPayoutRestaurant = async (restaurant: Restaurant) => {
    setSelectedPayoutRestaurant(restaurant);
    setCommissionRateInput(String((restaurant as RestaurantWithGeo).commission_rate ?? 15));
    setPayoutForm({ period_start: '', period_end: '', notes: '' });
    try {
      const data = await restaurantAPI.getEarnings(restaurant.id);
      setPayoutEarnings(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load earnings');
    }
  };

  const refreshPayoutEarnings = async () => {
    if (!selectedPayoutRestaurant) return;
    const data = await restaurantAPI.getEarnings(selectedPayoutRestaurant.id);
    setPayoutEarnings(data);
  };

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayoutRestaurant || !payoutForm.period_start || !payoutForm.period_end) return;

    setPayoutBusy(true);
    setError(null);
    try {
      await payoutAPI.create({
        restaurant: selectedPayoutRestaurant.id,
        period_start: new Date(payoutForm.period_start).toISOString(),
        period_end: new Date(payoutForm.period_end).toISOString(),
        notes: payoutForm.notes,
      });
      setPayoutForm({ period_start: '', period_end: '', notes: '' });
      await refreshPayoutEarnings();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.error?.message || 'Failed to create payout');
    } finally {
      setPayoutBusy(false);
    }
  };

  const handleMarkPayoutPaid = async (payoutId: number) => {
    setPayoutBusy(true);
    setError(null);
    try {
      await payoutAPI.markPaid(payoutId);
      await refreshPayoutEarnings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark payout paid');
    } finally {
      setPayoutBusy(false);
    }
  };

  const handleSetCommissionRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayoutRestaurant) return;
    const rate = Number(commissionRateInput);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError('Commission rate must be a number between 0 and 100.');
      return;
    }

    setPayoutBusy(true);
    setError(null);
    try {
      await adminAPI.setCommissionRate(selectedPayoutRestaurant.id, rate);
      await refreshPayoutEarnings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set commission rate');
    } finally {
      setPayoutBusy(false);
    }
  };

  useEffect(() => {
    loadActiveTab();
  }, [loadActiveTab]);

  const handleVerifyRestaurant = async (id: number, isVerified: boolean) => {
    try {
      await adminAPI.verifyRestaurant(id, isVerified);
      setPendingRestaurants((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update restaurant');
    }
  };

  const handleApproveEvent = async (id: number, isApproved: boolean) => {
    try {
      await adminAPI.approveEvent(id, isApproved);
      setPendingEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update event');
    }
  };

  const handleSuspendUser = async (target: AdminUser) => {
    const suspend = target.is_active;
    if (!confirm(`${suspend ? 'Suspend' : 'Reinstate'} ${target.email}?`)) return;
    try {
      await adminAPI.suspendUser(target.id, suspend);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, is_active: !suspend } : u)));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update user');
    }
  };

  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loadUsers(userSearch || undefined).finally(() => setLoading(false));
  };

  // The ledger and nav badges need platform totals and the review queue on
  // every tab, so fetch them once up front regardless of the active tab.
  useEffect(() => {
    adminAPI.analyticsOverview('city').then(setLedgerData).catch(() => undefined);
    Promise.all([adminAPI.pendingRestaurants(), adminAPI.pendingEvents()])
      .then(([restaurants, events]) => {
        setPendingRestaurants(restaurants);
        setPendingEvents(events);
      })
      .catch(() => undefined);
  }, []);

  const W = 'platforma' as const;
  const t = themes[W];
  const totals = ledgerData?.totals;
  const isAnalyticsTab = ANALYTICS_TABS.includes(activeTab);
  const pendingCount = pendingRestaurants.length + pendingEvents.length;

  const nav: DashNavGroup[] = [
    {
      label: 'Analytics',
      items: [
        { key: 'analytics', label: 'Platform', icon: LayoutDashboard, onClick: () => setActiveTab('analytics') },
        { key: 'zesty_analytics', label: 'Zesty', icon: UtensilsCrossed, onClick: () => setActiveTab('zesty_analytics') },
        { key: 'eventra_analytics', label: 'Eventra', icon: Ticket, onClick: () => setActiveTab('eventra_analytics') },
      ],
    },
    {
      label: 'Operations',
      items: [
        { key: 'approvals', label: 'Approvals', icon: ShieldCheck, onClick: () => setActiveTab('approvals'), badge: pendingCount || undefined },
        { key: 'users', label: 'People', icon: Users, onClick: () => setActiveTab('users') },
        { key: 'payouts', label: 'Payouts', icon: Landmark, onClick: () => setActiveTab('payouts') },
        { key: 'audit', label: 'Audit log', icon: ScrollText, onClick: () => setActiveTab('audit') },
      ],
    },
    {
      label: 'Account',
      items: [{ key: 'profile', label: 'Profile', icon: UserRound, to: '/profile' }],
    },
  ];

  const initialsOf = (first?: string, last?: string, email?: string) =>
    (`${first?.[0] ?? ''}${last?.[0] ?? ''}` || email?.[0] || '?').toUpperCase();

  const place = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(', ');

  const zestyRev = toNumber(totals?.zesty_revenue);
  const eventraRev = toNumber(totals?.eventra_revenue);
  const gmv = zestyRev + eventraRev;

  return (
    <DashboardShell
      world={W}
      context="Operations console"
      nav={nav}
      activeKey={activeTab}
      image="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1800&q=80"
      imagePosition="center 60%"
      title={
        <>
          {greeting()}, <span className={t.titleAccent}>{user?.first_name || 'admin'}</span>
        </>
      }
      subtitle="Everything moving across Zesty and Eventra, from partner approvals to the money going out."
      actions={
        pendingCount > 0 && activeTab !== 'approvals' ? (
          <button type="button" onClick={() => setActiveTab('approvals')} className={t.btnOnImagePrimary}>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Review {pendingCount} pending
          </button>
        ) : undefined
      }
      ledger={
        isAnalyticsTab ? undefined : <KpiLedger
          world={W}
          loading={!totals}
          items={[
            { label: 'Gross volume', icon: TrendingUp, value: formatINR(gmv), hint: 'Zesty and Eventra combined' },
            { label: 'Zesty', icon: UtensilsCrossed, value: formatINR(zestyRev), hint: `${formatInt(totals?.zesty_orders)} orders` },
            { label: 'Eventra', icon: Ticket, value: formatINR(eventraRev), hint: `${formatInt(totals?.eventra_bookings)} bookings` },
            { label: 'Awaiting review', icon: ShieldCheck, value: formatInt(pendingCount), hint: `${pendingRestaurants.length} restaurants · ${pendingEvents.length} events` },
          ]}
        />
      }
    >
      {error && <ErrorBanner world={W} message={String(error)} onRetry={loadActiveTab} onDismiss={() => setError(null)} />}

      {loading ? (
        <Panel world={W}>
          <SkeletonRows world={W} rows={6} />
        </Panel>
      ) : (
        <>
          {activeTab === 'analytics' && <PlatformAnalyticsView onNavigate={setActiveTab} />}
          {activeTab === 'zesty_analytics' && <ZestyAnalyticsView mode="admin" />}
          {activeTab === 'eventra_analytics' && <EventraAnalyticsView mode="admin" />}

          {/* Approvals */}
          {activeTab === 'approvals' && (
            <div className="grid gap-6 xl:grid-cols-2">
              {[
                {
                  key: 'restaurants',
                  title: 'Restaurants',
                  icon: Store,
                  items: pendingRestaurants.map((r) => ({
                    id: r.id,
                    name: r.name,
                    who: r.owner_email,
                    lines: [r.address, place(r.city, r.state) || 'No city or state set', r.cuisine_types ? `Cuisines: ${r.cuisine_types}` : ''],
                    onApprove: () => handleVerifyRestaurant(r.id, true),
                    onReject: () => handleVerifyRestaurant(r.id, false),
                  })),
                  empty: 'No restaurants are waiting for verification.',
                },
                {
                  key: 'events',
                  title: 'Events',
                  icon: CalendarDays,
                  items: pendingEvents.map((e) => ({
                    id: e.id,
                    name: e.name,
                    who: e.organizer_email,
                    lines: [`${e.venue_name} · ${place(e.city, e.state) || 'No city or state set'}`, humanize(e.category), e.is_published ? 'Published by organizer' : 'Still a draft'],
                    onApprove: () => handleApproveEvent(e.id, true),
                    onReject: () => handleApproveEvent(e.id, false),
                  })),
                  empty: 'No events are waiting for approval.',
                },
              ].map((queue) => (
                <Panel key={queue.key} world={W} flush title={queue.title} description={`${queue.items.length} awaiting review`}>
                  {queue.items.length === 0 ? (
                    <EmptyState world={W} compact icon={CheckCircle2} title="Queue is clear" body={queue.empty} />
                  ) : (
                    <ul className={`divide-y ${t.divide}`}>
                      {queue.items.map((item) => (
                        <li key={item.id} className="flex flex-wrap items-start gap-4 px-5 py-5 sm:px-6">
                          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${t.subtle} ${t.accentText}`}>
                            <queue.icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{item.name}</p>
                            <p className={`text-sm ${t.muted}`}>{item.who}</p>
                            <ul className={`mt-2 space-y-0.5 text-sm ${t.faint}`}>
                              {item.lines.filter(Boolean).map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={item.onReject} className={t.btnGhost}>
                              <X className="h-4 w-4" aria-hidden="true" /> Reject
                            </button>
                            <button type="button" onClick={item.onApprove} className={t.btnPrimary}>
                              <Check className="h-4 w-4" aria-hidden="true" /> Approve
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              ))}
            </div>
          )}

          {/* People */}
          {activeTab === 'users' && (
            <Panel
              world={W}
              flush
              title="People"
              description={`${users.length} accounts${userSearch ? ` matching “${userSearch}”` : ''}`}
              action={
                <form onSubmit={handleUserSearchSubmit} className="flex gap-2">
                  <label className="relative">
                    <span className="sr-only">Search people</span>
                    <Search className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${t.faint}`} aria-hidden="true" />
                    <input type="search" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Name or email" className={`${t.input} !w-60 !rounded-full pl-10`} />
                  </label>
                  <button type="submit" className={t.btnPrimary}>Search</button>
                </form>
              }
            >
              {users.length === 0 ? (
                <EmptyState world={W} compact icon={Users} title="No one found" body="Try part of a name or an email address." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className={`text-left text-xs ${t.muted}`}>
                        <th className="px-6 py-3 font-medium">Person</th>
                        <th className="px-3 py-3 font-medium">Role</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Joined</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className={`divide-y border-t ${t.hairline} ${t.divide}`}>
                      {users.map((u) => (
                        <tr key={u.id} className={t.rowHover}>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141414] text-xs font-semibold text-[#f5f2ea]">
                                {initialsOf(u.first_name, u.last_name, u.email)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</p>
                                <p className={`truncate text-xs ${t.muted}`}>{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">{humanize(u.role)}</td>
                          <td className="px-3 py-3.5">
                            <StatusPill world={W} tone={u.is_active ? 'success' : 'danger'} label={u.is_active ? 'Active' : 'Suspended'} />
                          </td>
                          <td className={`px-3 py-3.5 tabular-nums ${t.muted}`}>{formatDate(u.date_joined)}</td>
                          <td className="px-6 py-3.5 text-right">
                            <button type="button" onClick={() => handleSuspendUser(u)} className={u.is_active ? t.btnDanger : t.btnGhost}>
                              {u.is_active ? 'Suspend' : 'Reinstate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {/* Audit log */}
          {activeTab === 'audit' && (
            <Panel world={W} title="Audit log" description="The last 50 admin actions, newest first">
              {auditLog.length === 0 ? (
                <EmptyState world={W} compact icon={ScrollText} title="Nothing recorded yet" body="Approvals, suspensions and payouts are logged here with who made them." />
              ) : (
                <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-[#e6e2d8]">
                  {auditLog.map((entry) => (
                    <li key={entry.id} className="relative flex flex-wrap items-baseline gap-x-3 gap-y-1 pl-7">
                      <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-[#6f7f42] ring-1 ring-[#6f7f42]/30" aria-hidden="true" />
                      <p className="font-medium">{humanize(entry.action)}</p>
                      <p className={`text-sm ${t.muted}`}>
                        {entry.target_type} #{entry.target_id} · by {entry.actor}
                      </p>
                      <p className={`ml-auto text-xs tabular-nums ${t.faint}`}>{formatDate(entry.created_at, true)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          )}

          {/* Payouts */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              {!selectedPayoutRestaurant && (
                <Panel world={W} title="Settle a restaurant" description="Find a restaurant to review its unsettled earnings, set its commission and create a payout.">
                  <form onSubmit={handlePayoutRestaurantSearch} className="flex flex-wrap gap-2">
                    <label className="relative min-w-[220px] flex-1">
                      <span className="sr-only">Search restaurants</span>
                      <Search className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${t.faint}`} aria-hidden="true" />
                      <input type="search" value={payoutRestaurantSearch} onChange={(e) => setPayoutRestaurantSearch(e.target.value)} placeholder="Restaurant name" className={`${t.input} !rounded-full pl-10`} />
                    </label>
                    <button type="submit" className={t.btnPrimary}>Search</button>
                  </form>
                  {payoutRestaurantResults.length > 0 && (
                    <ul className={`mt-5 divide-y rounded-2xl border ${t.hairline} ${t.divide}`}>
                      {payoutRestaurantResults.map((r) => (
                        <li key={r.id}>
                          <button type="button" onClick={() => selectPayoutRestaurant(r)} className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${t.rowHover}`}>
                            <span className="font-medium">{r.name}</span>
                            <span className={`inline-flex items-center gap-1 text-sm ${t.muted}`}>
                              {place((r as RestaurantWithGeo).city, (r as RestaurantWithGeo).state) || r.area}
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}

              {selectedPayoutRestaurant && !payoutEarnings && (
                <Panel world={W}>
                  <SkeletonRows world={W} rows={3} />
                </Panel>
              )}

              {selectedPayoutRestaurant && payoutEarnings && (
                <>
                  <SectionHeading
                    world={W}
                    title={selectedPayoutRestaurant.name}
                    description={`${payoutEarnings.commission_rate}% commission · unsettled since ${formatDate(payoutEarnings.unsettled.period_start)}`}
                    action={
                      <button
                        type="button"
                        onClick={() => { setSelectedPayoutRestaurant(null); setPayoutEarnings(null); setPayoutRestaurantResults([]); }}
                        className={t.btnSecondary}
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Another restaurant
                      </button>
                    }
                  />
                  <div className="grid gap-6 xl:grid-cols-3">
                    <Panel world={W} className="xl:col-span-2" title="Unsettled earnings">
                      <dl className="grid gap-6 sm:grid-cols-3">
                        <div>
                          <dt className={`text-sm ${t.muted}`}>Delivered orders</dt>
                          <dd className="mt-1 text-3xl font-semibold tabular-nums">{formatInt(payoutEarnings.unsettled.order_count)}</dd>
                        </div>
                        <div>
                          <dt className={`text-sm ${t.muted}`}>Gross</dt>
                          <dd className="mt-1 text-3xl font-semibold tabular-nums">{formatINR(payoutEarnings.unsettled.gross_revenue, true)}</dd>
                        </div>
                        <div className="rounded-2xl bg-[#0d0d0d] px-5 py-4 text-[#f5f2ea]">
                          <dt className="text-sm text-white/60">Net owed</dt>
                          <dd className="mt-1 text-3xl font-semibold tabular-nums text-[#c3d096]">{formatINR(payoutEarnings.unsettled.net_amount, true)}</dd>
                        </div>
                      </dl>
                      <form onSubmit={handleCreatePayout} className={`mt-6 grid items-end gap-4 border-t pt-6 md:grid-cols-[1fr_1fr_1.4fr_auto] ${t.hairline}`}>
                        <Field world={W} label="Period start" htmlFor="p-start">
                          <input id="p-start" type="date" required value={payoutForm.period_start} onChange={(e) => setPayoutForm({ ...payoutForm, period_start: e.target.value })} className={t.input} />
                        </Field>
                        <Field world={W} label="Period end" htmlFor="p-end">
                          <input id="p-end" type="date" required value={payoutForm.period_end} onChange={(e) => setPayoutForm({ ...payoutForm, period_end: e.target.value })} className={t.input} />
                        </Field>
                        <Field world={W} label="Notes" htmlFor="p-notes">
                          <input id="p-notes" type="text" value={payoutForm.notes} onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })} placeholder="Optional" className={t.input} />
                        </Field>
                        <button type="submit" disabled={payoutBusy} className={`${t.btnPrimary} !py-2.5`}>
                          {payoutBusy ? 'Working…' : 'Create payout'}
                        </button>
                      </form>
                    </Panel>
                    <Panel world={W} title="Commission rate" description="Applied to this restaurant's future settlements.">
                      <form onSubmit={handleSetCommissionRate} className="flex items-end gap-2">
                        <Field world={W} label="Rate (%)" htmlFor="p-rate" className="flex-1">
                          <input id="p-rate" type="number" min="0" max="100" step="0.01" value={commissionRateInput} onChange={(e) => setCommissionRateInput(e.target.value)} className={t.input} />
                        </Field>
                        <button type="submit" disabled={payoutBusy} className={`${t.btnSecondary} !py-2.5`}>Save</button>
                      </form>
                    </Panel>
                  </div>
                  <Panel world={W} flush title="Payout history" description={`${payoutEarnings.payouts.length} payouts`}>
                    {payoutEarnings.payouts.length === 0 ? (
                      <EmptyState world={W} compact icon={Landmark} title="No payouts yet" body="Create the first one from the unsettled period above." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-sm">
                          <thead>
                            <tr className={`text-left text-xs ${t.muted}`}>
                              <th className="px-6 py-3 font-medium">Period</th>
                              <th className="px-3 py-3 text-right font-medium">Gross</th>
                              <th className="px-3 py-3 text-right font-medium">Commission</th>
                              <th className="px-3 py-3 text-right font-medium">Net</th>
                              <th className="px-3 py-3 font-medium">Status</th>
                              <th className="px-6 py-3" />
                            </tr>
                          </thead>
                          <tbody className={`divide-y border-t ${t.hairline} ${t.divide}`}>
                            {payoutEarnings.payouts.map((p) => (
                              <tr key={p.id} className={t.rowHover}>
                                <td className="px-6 py-3.5">{formatDate(p.period_start)} – {formatDate(p.period_end)}</td>
                                <td className="px-3 py-3.5 text-right tabular-nums">{formatINR(p.gross_revenue, true)}</td>
                                <td className={`px-3 py-3.5 text-right tabular-nums ${t.muted}`}>{formatINR(p.commission_amount, true)}</td>
                                <td className="px-3 py-3.5 text-right font-semibold tabular-nums">{formatINR(p.net_amount, true)}</td>
                                <td className="px-3 py-3.5"><StatusPill world={W} status={p.status === 'paid' ? 'paid' : 'pending'} /></td>
                                <td className="px-6 py-3.5 text-right">
                                  {p.status === 'pending' && (
                                    <button type="button" onClick={() => handleMarkPayoutPaid(p.id)} disabled={payoutBusy} className={t.btnSecondary}>
                                      <Check className="h-4 w-4" aria-hidden="true" /> Mark paid
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>
                </>
              )}
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
};

export default AdminDashboardPage;
