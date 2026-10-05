import React from 'react';
import { Megaphone } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel } from '../../../components/dashboard/primitives';
import { ArtifactGate, LabPage, MiniTable, Reading, Stat, StatRow, Swatch, TipBox } from './labKit';
import { W, AXIS, GRID, T, num, pctOf, rupees, seriesColor, useArtifact } from './labUtils';
import { ElbowCharts } from './KMeansLabView';

/* eslint-disable @typescript-eslint/no-explicit-any */

const SegmentsView: React.FC = () => {
  const state = useArtifact<any>('lab_customer_kmeans');
  return (
    <LabPage
      eyebrow="Customers"
      title="Customer segments & campaigns"
      intro="Mumbai customers grouped by how recently, how often and how much they buy across Zesty and Eventra, with who each group is and the campaign it should get."
      model={state.data?.model}
      concepts={[
        { term: 'Customer segmentation', meaning: 'Splitting customers into groups that behave alike, so each gets a fitting offer instead of one message for all.' },
        { term: 'RFM', meaning: 'Recency (days since last purchase), Frequency (number of purchases), Monetary (total spend).' },
        { term: 'Scaling', meaning: 'Frequency and spend are log-transformed and all three standardised, so rupees do not decide every distance.' },
        { term: 'K-Means and the elbow', meaning: 'Customers are clustered with K-Means; k comes from the elbow of the WCSS curve, checked with silhouette.' },
        { term: 'Cluster profiling', meaning: 'Describing each cluster in real units and by where its customers live and which verticals they use, then naming it.' },
        { term: 'Personalised marketing', meaning: 'A campaign per segment: reward the best, nurture the new, win back the lapsed, spend little on the long gone.' },
      ]}
    >
      <ArtifactGate state={state} what="customer segments">
        {(d) => (
          <>
            <StatRow>
              <Stat label="Customers segmented" value={num(d.dataset.rows, 0)} />
              <Stat label="Segments" value={d.k} note={`elbow at k=${d.elbow_k}`} />
              <Stat label="Largest segment" value={[...d.segments].sort((a: any, b: any) => b.size - a.size)[0].name} />
              <Stat label="Top segment's revenue share" value={pctOf(d.segments[0].revenue_share)} note={d.segments[0].name} strong />
            </StatRow>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {d.segments.map((s: any) => (
                <div key={s.cluster} className={`${T.panel} p-5`}>
                  <div className="flex items-start justify-between gap-2">
                    <Swatch color={seriesColor(s.cluster)} label={<span className={`${T.display} text-lg`}>{s.name}</span>} />
                    <span className={`text-xs tabular-nums ${T.muted}`}>{num(s.size, 0)} · {pctOf(s.share, 0)}</span>
                  </div>
                  <p className={`mt-1 text-sm ${T.muted}`}>{s.who}</p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div><dt className={T.muted}>Last purchase</dt><dd className="font-semibold tabular-nums">{num(s.recency, 0)} days ago</dd></div>
                    <div><dt className={T.muted}>Purchases</dt><dd className="font-semibold tabular-nums">{num(s.frequency, 1)}</dd></div>
                    <div><dt className={T.muted}>Spend</dt><dd className="font-semibold tabular-nums">{rupees(s.monetary)}</dd></div>
                    <div><dt className={T.muted}>Revenue share</dt><dd className="font-semibold tabular-nums">{pctOf(s.revenue_share, 0)}</dd></div>
                    <div><dt className={T.muted}>Order food</dt><dd className="font-semibold tabular-nums">{pctOf(s.uses_zesty, 0)}</dd></div>
                    <div><dt className={T.muted}>Book events</dt><dd className="font-semibold tabular-nums">{pctOf(s.uses_eventra, 0)}</dd></div>
                  </dl>
                  <div className="mt-4 rounded-xl bg-[#0d0d0d] px-3.5 py-3 text-[13px] text-[#f5f2ea]">
                    <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[#c3d096]"><Megaphone className="h-3.5 w-3.5" />Campaign</p>
                    <p>{s.strategy}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel world={W} title="Revenue vs headcount" description="Share of customers and of spend per segment">
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={d.segments.map((s: any) => ({ name: s.name, customers: s.share, revenue: s.revenue_share, c: s.cluster }))} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} interval={0} />
                      <YAxis tick={AXIS} tickFormatter={(v) => pctOf(v, 0)} />
                      <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={String(payload[0].payload.name)} rows={[['Customers', pctOf(payload[0].payload.customers)], ['Revenue', pctOf(payload[0].payload.revenue)]]} /> : null} />
                      <Bar isAnimationActive={false} dataKey="customers" name="Customers" fill="#cfcac0" radius={[4, 4, 0, 0]} />
                      <Bar isAnimationActive={false} dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                        {d.segments.map((s: any) => <Cell key={s.cluster} fill={seriesColor(s.cluster)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4"><Swatch color="#cfcac0" label="Share of customers" shape="square" /><span className="text-xs">coloured bar = share of revenue</span></div>
              </Panel>
              <Panel world={W} title="Where each segment lives" description="Share of the segment by Mumbai zone">
                <MiniTable rows={d.segments} rowKey={(s: any) => s.cluster} cols={[
                  { key: 'n', label: 'Segment', render: (s: any) => <Swatch color={seriesColor(s.cluster)} label={s.name} /> },
                  ...['South Mumbai', 'Central Mumbai', 'Western Suburbs', 'Eastern Suburbs'].map((z) => ({
                    key: z, label: z.replace(' Mumbai', '').replace(' Suburbs', ' sub.'), align: 'right' as const,
                    render: (s: any) => pctOf(s.zones[z] ?? 0, 0),
                  })),
                ]} />
              </Panel>
            </div>

            <Panel world={W} title="How many segments" description="K-Means for k = 1 to 10 on standardised RFM">
              <ElbowCharts elbow={d.elbow} k={d.k} elbowK={d.elbow_k} />
              <Reading>WCSS always falls as k grows; the elbow is where it stops falling steeply. Silhouette is checked alongside so the segments are also well separated.</Reading>
            </Panel>
          </>
        )}
      </ArtifactGate>
    </LabPage>
  );
};

export default SegmentsView;
