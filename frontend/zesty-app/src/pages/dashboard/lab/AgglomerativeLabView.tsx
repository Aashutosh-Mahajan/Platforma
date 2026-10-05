import React, { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Field, Panel, Segmented } from '../../../components/dashboard/primitives';
import { ArtifactGate, LabPage, MiniTable, Reading, Stat, StatRow, Swatch, TipBox } from './labKit';
import { W, AXIS, GRID, T, fixed, num, sequentialColor, seriesColor, useArtifact } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

const METHODS = ['single', 'complete', 'average', 'ward'] as const;
type Method = typeof METHODS[number];
const METHOD_TEXT: Record<Method, string> = {
  single: 'Distance between the two closest members. Chains clusters together.',
  complete: 'Distance between the two furthest members. Compact, similar-sized clusters.',
  average: 'Mean distance over all pairs of members (UPGMA). A middle ground.',
  ward: 'Merge the pair that increases total within-cluster variance least. Closest to K-Means.',
};

const Dendrogram: React.FC<{ m: any; k: number }> = ({ m, k }) => {
  const { icoord, dcoord, leaves } = m.dendrogram;
  const n = leaves.length;
  const merges = m.merges as any[];
  const cut = k > 1 && k <= n ? (merges[n - k - 1].distance + merges[n - k].distance) / 2 : 0;
  const maxD = m.max_distance * 1.05;
  const H = 340, top = 14, step = 24, left = 44;
  const W0 = left + n * step + 10;
  const x = (v: number) => left + ((v - 5) / 10) * step + step / 2;
  const y = (v: number) => top + (1 - v / maxD) * H;
  const clusterOf = (leafIdx: number) => m.cuts[k]?.[leaves[leafIdx]] ?? 1;
  return (
    <div className="overflow-x-auto">
      <svg width={W0} height={H + top + 110} role="img" aria-label="Dendrogram">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={left} x2={W0} y1={y(maxD * f)} y2={y(maxD * f)} stroke={GRID} />
            <text x={left - 6} y={y(maxD * f) + 4} fontSize="10" textAnchor="end" fill="#6b6a63">{num(maxD * f, 1)}</text>
          </g>
        ))}
        {icoord.map((xs: number[], i: number) => {
          const ds = dcoord[i];
          const height = Math.max(...ds);
          const leafIdx = Math.round((Math.min(...xs) - 5) / 10);
          const color = height <= cut ? seriesColor(clusterOf(leafIdx) - 1) : '#9c9a90';
          return <path key={i} d={`M${x(xs[0])},${y(ds[0])}L${x(xs[1])},${y(ds[1])}L${x(xs[2])},${y(ds[2])}L${x(xs[3])},${y(ds[3])}`} fill="none" stroke={color} strokeWidth={2} />;
        })}
        {cut > 0 && (
          <g>
            <line x1={left} x2={W0} y1={y(cut)} y2={y(cut)} stroke="#e11d48" strokeDasharray="6 4" strokeWidth={1.5} />
            <text x={W0 - 4} y={y(cut) - 5} fontSize="11" textAnchor="end" fill="#e11d48">cut → {k} clusters</text>
          </g>
        )}
        {leaves.map((name: string, i: number) => (
          <text key={name} transform={`translate(${left + i * step + step / 2 + 4},${top + H + 8}) rotate(60)`} fontSize="11" fill="#141414">{name}</text>
        ))}
      </svg>
    </div>
  );
};

const AgglomerativeLabView: React.FC = () => {
  const state = useArtifact<any>('area_hierarchy');
  const [method, setMethod] = useState<Method>('ward');
  const [k, setK] = useState(4);

  return (
    <LabPage
      eyebrow="Clustering"
      title="Locality hierarchy"
      intro="Mumbai's localities merged bottom-up into a hierarchy on the same standardised features as the map. Cut the dendrogram anywhere to get k clusters."
      model={state.data?.model}
      concepts={[
        { term: 'Hierarchical clustering', meaning: 'Builds a tree of nested clusters instead of one flat partition.' },
        { term: 'Agglomerative vs divisive', meaning: 'Agglomerative starts with every point alone and merges the closest pair repeatedly (bottom-up). Divisive starts with one cluster and splits (top-down).' },
        { term: 'Distance matrix', meaning: 'Every pairwise distance between points; the algorithm reads the closest pair from it at each step.' },
        { term: 'Linkage', meaning: 'How the distance between two clusters is measured: single, complete, average or Ward.' },
        { term: 'Dendrogram', meaning: 'The merge tree. The height of each join is the distance at which the two clusters merged.' },
        { term: 'Choosing the number of clusters', meaning: 'Cut the dendrogram horizontally; long vertical gaps mark natural cuts. Silhouette compares cut levels.' },
        { term: 'Cophenetic correlation', meaning: 'How faithfully the tree heights preserve the original pairwise distances (closer to 1 is better).' },
      ]}
    >
      <ArtifactGate state={state} what="hierarchical clustering">
        {(d) => {
          const m = d.methods[method];
          const silData = Array.from({ length: 7 }, (_, i) => {
            const kk = i + 2;
            return { k: kk, ...Object.fromEntries(METHODS.map((me) => [me, d.methods[me].silhouette_by_k[kk] ?? null])) };
          });
          const groups: Record<number, string[]> = {};
          Object.entries(m.cuts[k] ?? {}).forEach(([area, c]) => { (groups[c as number] ??= []).push(area); });
          const dm = d.distance_matrix as number[][];
          const maxDist = Math.max(...dm.flat());
          return (
            <>
              <StatRow>
                <Stat label="Localities" value={d.labels.length} note={`${d.labels.length - 1} merges`} />
                <Stat label="Best linkage" value={d.best_method} note="highest silhouette" />
                <Stat label={`Cophenetic (${method})`} value={fixed(m.cophenetic, 3)} />
                <Stat label="Agrees with K-Means" value={fixed(d.kmeans_agreement.adjusted_rand_index, 3)} note={`adjusted Rand index, Ward vs K-Means at k=${d.kmeans_agreement.k}`} strong />
              </StatRow>
              <Panel world={W} title="Dendrogram" description={METHOD_TEXT[method]}
                action={
                  <div className="flex flex-wrap items-center gap-3">
                    <Segmented world={W} label="Linkage" value={method} onChange={setMethod} options={METHODS.map((me) => ({ value: me, label: me[0].toUpperCase() + me.slice(1) }))} />
                    <Field world={W} label={`Cut at k = ${k}`} htmlFor="ag-k">
                      <input id="ag-k" type="range" min={2} max={8} value={k} onChange={(e) => setK(Number(e.target.value))} className="w-36 accent-[#6f7f42]" />
                    </Field>
                  </div>
                }>
                <Dendrogram m={m} k={k} />
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([c, list]) => (
                    <div key={c} className={`rounded-2xl border p-3 ${T.hairline}`}>
                      <Swatch color={seriesColor(Number(c) - 1)} label={<span className="font-semibold">Cluster {c} · {list.length} areas</span>} />
                      <p className={`mt-1 text-xs ${T.muted}`}>{list.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </Panel>
              <div className="grid gap-6 xl:grid-cols-2">
                <Panel world={W} title="Linkage methods compared" description="Silhouette when the tree is cut into k clusters">
                  <div className="h-64">
                    <ResponsiveContainer>
                      <LineChart data={silData}>
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis dataKey="k" tick={AXIS} />
                        <YAxis tick={AXIS} tickFormatter={(v) => fixed(v, 2)} domain={['auto', 'auto']} />
                        <Tooltip content={({ payload, label }) => payload?.length ? <TipBox title={`k = ${label}`} rows={payload.map((p) => [String(p.name), fixed(Number(p.value), 3)])} /> : null} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {METHODS.map((me, i) => <Line isAnimationActive={false} key={me} dataKey={me} name={me} stroke={seriesColor(i)} strokeWidth={me === method ? 3 : 1.5} dot={{ r: 3 }} connectNulls />)}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <MiniTable rows={[...METHODS]} rowKey={(me) => me} cols={[
                    { key: 'm', label: 'Linkage', render: (me) => <span className={me === method ? 'font-semibold' : ''}>{me}</span> },
                    { key: 'c', label: 'Cophenetic r', align: 'right', render: (me) => fixed(d.methods[me].cophenetic, 3) },
                    { key: 'k', label: 'Best k', align: 'right', render: (me) => d.methods[me].best_k },
                    { key: 's', label: 'Best silhouette', align: 'right', render: (me) => fixed(d.methods[me].best_silhouette, 3) },
                  ]} />
                </Panel>
                <Panel world={W} title="Merge sequence" description={`The first merges under ${method} linkage, closest pair first`}>
                  <MiniTable rows={m.merges} max={14} dense rowKey={(r: any) => r.step} cols={[
                    { key: 's', label: 'Step', render: (r: any) => r.step },
                    { key: 'l', label: 'Merged', render: (r: any) => <span className="text-xs">{r.left.slice(0, 3).join(', ')}{r.left.length > 3 ? '…' : ''} <span className={T.faint}>+</span> {r.right.slice(0, 3).join(', ')}{r.right.length > 3 ? '…' : ''}</span> },
                    { key: 'd', label: 'Distance', align: 'right', render: (r: any) => fixed(r.distance, 3) },
                    { key: 'n', label: 'Size', align: 'right', render: (r: any) => r.size },
                  ]} />
                </Panel>
              </div>
              <Panel world={W} title="Distance matrix" description="Euclidean distance between every pair of localities (standardised features). Darker = further apart.">
                <div className="overflow-x-auto">
                  <table className="text-[9px]">
                    <thead>
                      <tr><th />{d.labels.map((l: string) => <th key={l} className="h-24 px-0 align-bottom font-normal [writing-mode:vertical-rl]">{l}</th>)}</tr>
                    </thead>
                    <tbody>
                      {dm.map((row, i) => (
                        <tr key={d.labels[i]}>
                          <th className="whitespace-nowrap pr-1.5 text-right font-normal">{d.labels[i]}</th>
                          {row.map((v, j) => <td key={j} className="p-0"><div className="h-[14px] w-[14px]" style={{ background: sequentialColor(v / maxDist) }} title={`${d.labels[i]} ↔ ${d.labels[j]}: ${fixed(v, 2)}`} /></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Reading>Agglomerative clustering starts from this matrix: the lightest off-diagonal cell is the first pair merged. After each merge the cluster's distances to the rest are recomputed with the chosen linkage.</Reading>
              </Panel>
            </>
          );
        }}
      </ArtifactGate>
    </LabPage>
  );
};

export default AgglomerativeLabView;
