import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import type { MumbaiAreasPayload } from '../../../api/lab';
import { Panel, Segmented } from '../../../components/dashboard/primitives';
import { ArtifactGate, LabPage, MiniTable, Reading, Stat, StatRow, Swatch, TipBox } from './labKit';
import { W, AXIS, GRID, T, fixed, num, pctOf, seriesColor, useArtifact } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const ElbowCharts: React.FC<{ elbow: any[]; k: number; elbowK?: number }> = ({ elbow, k, elbowK }) => (
  <div className="grid gap-4 md:grid-cols-2">
    <div>
      <p className={`mb-1 text-xs font-semibold ${T.muted}`}>WCSS (inertia) by k: the elbow</p>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={elbow} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="k" tick={AXIS} />
            <YAxis tick={AXIS} tickFormatter={(v) => num(v, 0)} />
            <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={`k = ${payload[0].payload.k}`} rows={[['WCSS', num(payload[0].payload.wcss, 1)], ['Iterations', payload[0].payload.iterations]]} /> : null} />
            {elbowK && <ReferenceLine x={elbowK} stroke="#eb6834" strokeDasharray="4 3" label={{ value: 'elbow', fontSize: 10, fill: '#c4501f', position: 'top' }} />}
            <ReferenceLine x={k} stroke="#141414" strokeDasharray="2 2" label={{ value: `k=${k}`, fontSize: 10, position: 'insideTopRight' }} />
            <Line isAnimationActive={false} dataKey="wcss" stroke="#2a78d6" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div>
      <p className={`mb-1 text-xs font-semibold ${T.muted}`}>Silhouette by k (higher = better separated)</p>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={elbow.filter((e) => e.silhouette !== undefined)} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="k" tick={AXIS} />
            <YAxis tick={AXIS} domain={['auto', 'auto']} tickFormatter={(v) => fixed(v, 2)} />
            <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={`k = ${payload[0].payload.k}`} rows={[['Silhouette', fixed(payload[0].payload.silhouette, 3)], ['Davies-Bouldin', fixed(payload[0].payload.davies_bouldin, 3)]]} /> : null} />
            <ReferenceLine x={k} stroke="#141414" strokeDasharray="2 2" />
            <Line isAnimationActive={false} dataKey="silhouette" stroke="#eb6834" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const KMeansLabView: React.FC = () => {
  const areas = useArtifact<MumbaiAreasPayload>('mumbai_areas');
  const customers = useArtifact<any>('lab_customer_kmeans');
  const [part, setPart] = useState<'areas' | 'customers'>('areas');
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'assign' | 'update'>('assign');

  return (
    <LabPage
      eyebrow="Clustering"
      title="Area & customer clusters"
      intro="Unsupervised grouping, twice: Mumbai's localities (the clusters on the map) and customers by recency, frequency and spend."
      model={(part === 'areas' ? areas : customers).data?.model}
      action={<Segmented world={W} label="Data" value={part} onChange={setPart} options={[{ value: 'areas', label: 'Mumbai areas' }, { value: 'customers', label: 'Customers (RFM)' }]} />}
      concepts={[
        { term: 'Unsupervised learning', meaning: 'No labels: the algorithm finds structure (groups) on its own.' },
        { term: 'Centroid', meaning: 'The mean point of a cluster. K-Means represents each cluster by its centroid.' },
        { term: 'Euclidean distance', meaning: 'Straight-line distance √Σ(xi − ci)²; why features must be scaled first.' },
        { term: 'Assignment step', meaning: 'Each point joins the nearest centroid.' },
        { term: 'Update step', meaning: 'Each centroid moves to the mean of the points assigned to it.' },
        { term: 'Convergence', meaning: 'Repeat assign/update until centroids stop moving (or assignments stop changing).' },
        { term: 'K value', meaning: 'The number of clusters, chosen before running; picked with the elbow method and silhouette score.' },
        { term: 'WCSS / inertia', meaning: 'Within-cluster sum of squared distances to the centroid. Always falls as k grows.' },
        { term: 'Elbow method', meaning: 'Plot WCSS against k; the bend where adding a cluster stops helping much is a good k.' },
        { term: 'Silhouette', meaning: '(b − a) / max(a, b): how much closer a point is to its own cluster than the next one. −1 to 1.' },
      ]}
    >
      {part === 'areas' ? (
        <ArtifactGate state={areas} what="area clusters">
          {(d) => {
            const s = d.trace[Math.min(step, d.trace.length - 1)];
            const cents = phase === 'assign' ? s.centroids_before : s.centroids_after;
            const pts = d.areas.map((a, i) => ({ x: a.pc1, y: a.pc2, area: a.area, c: s.labels[i] }));
            const ev = d.pca.explained_variance;
            return (
              <>
                <StatRow>
                  <Stat label="Localities" value={d.areas.length} note={`${d.features.length} standardised features`} />
                  <Stat label="Chosen k" value={d.k} strong note="best silhouette in 3–6" />
                  <Stat label="Silhouette at k" value={fixed(d.elbow.find((e) => e.k === d.k)?.silhouette, 3)} />
                  <Stat label="Iterations to converge" value={d.trace.length} note="in the 2-D replay below" />
                </StatRow>
                <Panel world={W} title="Choosing k"><ElbowCharts elbow={d.elbow} k={d.k} /></Panel>
                <Panel world={W} title="K-Means step by step" description={`Areas projected to 2-D with PCA (PC1 ${pctOf(ev[0], 0)}, PC2 ${pctOf(ev[1], 0)} of the variance). Lloyd's algorithm replayed on these points.`}
                  action={
                    <div className="flex items-center gap-2">
                      <button type="button" className={T.btnSecondary} disabled={step === 0 && phase === 'assign'} aria-label="Previous step"
                        onClick={() => (phase === 'update' ? setPhase('assign') : (setStep((x) => x - 1), setPhase('update')))}><ChevronLeft className="h-4 w-4" /></button>
                      <span className="w-48 text-center text-sm font-medium">Iteration {s.step}: {phase === 'assign' ? 'assign points' : 'move centroids'}</span>
                      <button type="button" className={T.btnSecondary} disabled={step >= d.trace.length - 1 && phase === 'update'} aria-label="Next step"
                        onClick={() => (phase === 'assign' ? setPhase('update') : (setStep((x) => x + 1), setPhase('assign')))}><ChevronRight className="h-4 w-4" /></button>
                    </div>
                  }>
                  <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                    <div className="h-[420px]">
                      <ResponsiveContainer>
                        <ScatterChart margin={{ top: 8, right: 16, bottom: 12, left: 0 }}>
                          <CartesianGrid stroke={GRID} />
                          <XAxis type="number" dataKey="x" tick={AXIS} name="PC1" domain={['auto', 'auto']} label={{ value: 'PC1', position: 'insideBottom', offset: -6, fontSize: 11 }} />
                          <YAxis type="number" dataKey="y" tick={AXIS} name="PC2" domain={['auto', 'auto']} />
                          <ZAxis range={[90, 90]} />
                          <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={payload[0].payload.area ?? `Centroid ${payload[0].payload.c + 1}`} rows={[['Cluster', String(payload[0].payload.c + 1)]]} /> : null} />
                          {Array.from({ length: d.k }, (_, c) => (
                            <Scatter isAnimationActive={false} key={c} data={pts.filter((p) => p.c === c)} fill={seriesColor(c)} stroke="#fff" strokeWidth={1.5} />
                          ))}
                          <Scatter isAnimationActive={false} data={cents.map(([x, y], c) => ({ x, y, c }))} shape={(p: any) => (
                            <g><path d={`M${p.cx - 9},${p.cy}L${p.cx + 9},${p.cy}M${p.cx},${p.cy - 9}L${p.cx},${p.cy + 9}`} stroke="#141414" strokeWidth={4} /><path d={`M${p.cx - 8},${p.cy}L${p.cx + 8},${p.cy}M${p.cx},${p.cy - 8}L${p.cx},${p.cy + 8}`} stroke={seriesColor(p.payload.c)} strokeWidth={2.5} /></g>
                          )} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-3">{Array.from({ length: d.k }, (_, c) => <Swatch key={c} color={seriesColor(c)} label={`Cluster ${c + 1}`} />)}<Swatch color="#141414" label="+ centroid" shape="square" /></div>
                      <MiniTable rows={d.trace} dense rowKey={(r) => r.step} cols={[
                        { key: 's', label: 'Iteration', render: (r) => <span className={r.step === s.step ? 'font-semibold' : ''}>{r.step}</span> },
                        { key: 'w', label: 'WCSS', align: 'right', render: (r) => fixed(r.wcss, 3) },
                        { key: 'm', label: 'Largest centroid move', align: 'right', render: (r) => fixed(r.max_shift, 4) },
                      ]} />
                      <Reading>Assign: every area joins its nearest centroid (+). Update: each centroid moves to the mean of its areas. WCSS falls every iteration; when no centroid moves (shift 0) the algorithm has converged.</Reading>
                    </div>
                  </div>
                </Panel>
                <Panel world={W} title="Final clusters" description="Centroids in z-scores (0 = city average)">
                  <MiniTable rows={d.clusters} rowKey={(c) => c.cluster} cols={[
                    { key: 'n', label: 'Cluster', render: (c) => <Swatch color={seriesColor(c.cluster)} label={<span className="font-medium">{c.name}</span>} /> },
                    { key: 's', label: 'Areas', align: 'right', render: (c) => c.size },
                    ...d.features.map((f) => ({
                      key: f.key, align: 'right' as const, label: <span title={f.label}>{f.key.replace('log_', '').replace(/_/g, ' ')}</span>,
                      render: (c: any) => <span style={{ color: c.centroid_z[f.key] > 0.5 ? '#c4501f' : c.centroid_z[f.key] < -0.5 ? '#2a78d6' : undefined }}>{fixed(c.centroid_z[f.key], 2)}</span>,
                    })),
                  ]} />
                </Panel>
              </>
            );
          }}
        </ArtifactGate>
      ) : (
        <ArtifactGate state={customers} what="customer clusters">
          {(d) => (
            <>
              <StatRow>
                <Stat label="Customers" value={num(d.dataset.rows, 0)} />
                <Stat label="Elbow k" value={d.elbow_k} note="kneedle: max distance below the chord" />
                <Stat label="Best-silhouette k" value={d.silhouette_k} />
                <Stat label="k used" value={d.k} strong note={`${d.iterations} iterations, WCSS ${num(d.wcss, 0)}`} />
              </StatRow>
              <Panel world={W} title="Choosing k"><ElbowCharts elbow={d.elbow} k={d.k} elbowK={d.elbow_k} /></Panel>
              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <Panel world={W} title="Customers by recency and spend" description="Sample of 900, coloured by cluster (spend on a log scale)">
                  <div className="h-[400px]">
                    <ResponsiveContainer>
                      <ScatterChart margin={{ top: 8, right: 16, bottom: 12, left: 8 }}>
                        <CartesianGrid stroke={GRID} />
                        <XAxis type="number" dataKey="recency" tick={AXIS} name="Recency" label={{ value: 'Days since last purchase', position: 'insideBottom', offset: -6, fontSize: 11 }} />
                        <YAxis type="number" dataKey="monetary" scale="log" domain={['auto', 'auto']} tick={AXIS} tickFormatter={(v) => num(v, 0)} />
                        <ZAxis range={[18, 18]} />
                        <Tooltip content={({ payload }) => payload?.[0] ? <TipBox rows={[['Recency', `${num(payload[0].payload.recency, 0)} d`], ['Purchases', payload[0].payload.frequency], ['Spend', `Rs ${num(payload[0].payload.monetary, 0)}`]]} /> : null} />
                        {d.segments.map((s: any) => (
                          <Scatter isAnimationActive={false} key={s.cluster} data={d.scatter.filter((p: any) => p.cluster === s.cluster)} fill={seriesColor(s.cluster)} fillOpacity={0.6} />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3">{d.segments.map((s: any) => <Swatch key={s.cluster} color={seriesColor(s.cluster)} label={s.name} />)}</div>
                </Panel>
                <Panel world={W} title="Centroids" description="Back in real units">
                  <MiniTable rows={d.segments} rowKey={(s: any) => s.cluster} cols={[
                    { key: 'n', label: 'Cluster', render: (s: any) => <Swatch color={seriesColor(s.cluster)} label={s.name} /> },
                    { key: 'r', label: 'Recency', align: 'right', render: (s: any) => `${num(s.centroid.recency, 0)} d` },
                    { key: 'f', label: 'Frequency', align: 'right', render: (s: any) => num(s.centroid.frequency, 1) },
                    { key: 'm', label: 'Monetary', align: 'right', render: (s: any) => `Rs ${num(s.centroid.monetary, 0)}` },
                    { key: 'sz', label: 'Size', align: 'right', render: (s: any) => num(s.size, 0) },
                  ]} />
                  <Reading>Recency, log frequency and log spend were standardised (z-scores) before clustering so no feature dominates the distance. Each segment's profile and campaign are on the Customer segments page.</Reading>
                </Panel>
              </div>
            </>
          )}
        </ArtifactGate>
      )}
    </LabPage>
  );
};

export default KMeansLabView;
