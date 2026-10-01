import React, { useState } from 'react';
import { Check, ShieldAlert, ShieldCheck, Ticket, UtensilsCrossed, X } from 'lucide-react';
import { miningAPI, type Anomaly } from '../../../api/warehouse';
import { EmptyState, ErrorBanner, Panel, Segmented, SkeletonRows, StatusPill } from '../../../components/dashboard/primitives';
import { ModelBadge, VerticalSwitch } from '../../../components/dashboard/intelligence';
import { apiErrorMessage, useLoad, type Vertical } from '../../../components/dashboard/intelligenceUtils';
import { formatDate, formatINR, shortRef, themes } from '../../../components/dashboard/theme';

const W = 'platforma' as const;
type Status = 'open' | 'confirmed' | 'dismissed';

const precisionNote = (evaluation?: { precision_at_k: number; planted: number } | null) =>
  evaluation ? `${Math.round(evaluation.precision_at_k * 100)}% of the top ${evaluation.planted} are known test anomalies` : undefined;

/** Orders and bookings the anomaly model flagged, for an admin to confirm or dismiss. */
const AnomalyQueueView: React.FC<{ onCountChange?: (open: number) => void } & { vertical: Vertical; onVerticalChange: (v: Vertical) => void }> = ({ onCountChange, vertical, onVerticalChange }) => {
  const t = themes[W];
  const [status, setStatus] = useState<Status>('open');
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, setData, loading, error, reload } = useLoad(
    () => miningAPI.anomalies({ vertical, status }),
    [vertical, status]
  );

  const review = async (anomaly: Anomaly, next: Anomaly['review_status']) => {
    setBusy(anomaly.id);
    setActionError(null);
    try {
      await miningAPI.reviewAnomaly(anomaly.id, next);
      if (data) {
        const counts = { ...data.counts };
        counts[anomaly.review_status] = Math.max(0, (counts[anomaly.review_status] ?? 1) - 1);
        counts[next] = (counts[next] ?? 0) + 1;
        setData({ ...data, counts, results: data.results.filter((a) => a.id !== anomaly.id) });
        if (vertical === 'all') onCountChange?.(counts.open ?? 0);
      }
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not save that review.'));
    } finally {
      setBusy(null);
    }
  };

  const metrics = data?.model.metrics;
  const quality = precisionNote(metrics?.orders?.evaluation) ?? precisionNote(metrics?.bookings?.evaluation);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={`${t.display} text-2xl sm:text-[28px] ${t.strong}`}>Review queue</h2>
          <p className={`mt-1 text-sm ${t.muted}`}>Orders and bookings that look unusual: inflated totals, payment retry storms, booking bursts.</p>
          <div className="mt-2"><ModelBadge world={W} model={data?.model} quality={quality} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <VerticalSwitch world={W} value={vertical} onChange={onVerticalChange} />
          <Segmented world={W} label="Review status" value={status} onChange={setStatus}
            options={[
              { value: 'open', label: 'To review', count: data?.counts.open },
              { value: 'confirmed', label: 'Confirmed', count: data?.counts.confirmed },
              { value: 'dismissed', label: 'Dismissed', count: data?.counts.dismissed },
            ]} />
        </div>
      </div>

      {(error || actionError) && <ErrorBanner world={W} message={(error || actionError)!} onRetry={error ? reload : undefined} onDismiss={() => setActionError(null)} />}

      <Panel world={W} flush>
        {loading && !data ? (
          <div className="p-6"><SkeletonRows world={W} rows={6} /></div>
        ) : !data || data.results.length === 0 ? (
          <EmptyState world={W} compact icon={status === 'open' ? ShieldCheck : ShieldAlert}
            title={status === 'open' ? 'Nothing waiting for review' : `Nothing ${status} yet`}
            body={data?.model.available === false ? data.model.reason : 'New flags appear here after each nightly run.'} />
        ) : (
          <ul className={`divide-y ${t.divide}`}>
            {data.results.map((a) => {
              const Icon = a.domain === 'order' ? UtensilsCrossed : Ticket;
              return (
                <li key={a.id} className="flex flex-wrap items-start gap-4 px-5 py-5 sm:px-6">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${t.subtle} ${t.accentText}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {a.domain === 'order' ? 'Order' : 'Booking'} #{shortRef(a.target_id)}
                      <span className={`ml-2 font-normal ${t.muted}`}>{a.entity_name ?? ''}</span>
                    </p>
                    <p className={`text-sm ${t.muted}`}>
                      {a.customer ? `${a.customer.name} · ${a.customer.email}` : `Customer ${a.customer_id}`} · {formatDate(a.occurred_on)} · {formatINR(a.amount, true)}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {a.reasons.map((reason) => (
                        <li key={reason} className="flex gap-2">
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusPill world={W} tone={a.review_status === 'confirmed' ? 'danger' : a.review_status === 'dismissed' ? 'neutral' : 'warn'}
                      label={a.review_status === 'open' ? `Rank ${a.rank}` : a.review_status === 'confirmed' ? 'Confirmed' : 'Dismissed'} />
                    <div className="flex gap-2">
                      {a.review_status !== 'dismissed' && (
                        <button type="button" disabled={busy === a.id} onClick={() => void review(a, 'dismissed')} className={t.btnGhost}>
                          <X className="h-4 w-4" aria-hidden="true" /> Looks fine
                        </button>
                      )}
                      {a.review_status !== 'confirmed' && (
                        <button type="button" disabled={busy === a.id} onClick={() => void review(a, 'confirmed')} className={t.btnDanger}>
                          <Check className="h-4 w-4" aria-hidden="true" /> Confirm issue
                        </button>
                      )}
                      {a.review_status !== 'open' && (
                        <button type="button" disabled={busy === a.id} onClick={() => void review(a, 'open')} className={t.btnSecondary}>Reopen</button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
};

export default AnomalyQueueView;
