import React, { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Panel, Segmented } from '../../../components/dashboard/primitives';
import { paymentName } from '../../../components/dashboard/reportCharts';
import { ArtifactGate, LabPage, MiniTable, Reading, Stat, StatRow, Swatch, TipBox } from './labKit';
import { W, AXIS, GRID, T, divergingColor, fixed, num, pctOf, sequentialColor, seriesColor, useArtifact } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BoxStat { n: number; q1: number; median: number; q3: number; mean: number; whisker_low: number; whisker_high: number; outlier_count: number; outliers: number[] }

/** Horizontal box plots on one shared scale. */
export const BoxPlots: React.FC<{ boxes: Record<string, BoxStat | null>; unit?: string; label?: (k: string) => string }> = ({ boxes, unit = '', label = (k) => k }) => {
  const entries = Object.entries(boxes).filter(([, b]) => b) as [string, BoxStat][];
  const lo = Math.min(...entries.map(([, b]) => Math.min(b.whisker_low, ...b.outliers)));
  const hi = Math.max(...entries.map(([, b]) => Math.max(b.whisker_high, ...b.outliers)));
  const W0 = 140, W1 = 640, rowH = 46;
  const x = (v: number) => W0 + ((v - lo) / (hi - lo || 1)) * (W1 - W0 - 20);
  const ticks = Array.from({ length: 6 }, (_, i) => lo + ((hi - lo) * i) / 5);
  return (
    <svg viewBox={`0 0 ${W1} ${entries.length * rowH + 34}`} className="w-full" role="img" aria-label="Box plots">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={0} y2={entries.length * rowH} stroke={GRID} />
          <text x={x(t)} y={entries.length * rowH + 16} textAnchor="middle" fontSize="11" fill="#6b6a63">{num(t, 0)}{unit}</text>
        </g>
      ))}
      {entries.map(([k, b], i) => {
        const y = i * rowH + rowH / 2;
        return (
          <g key={k}>
            <title>{`${label(k)}: median ${num(b.median, 1)}, IQR ${num(b.q1, 1)}–${num(b.q3, 1)}, ${b.outlier_count} outliers (n=${b.n})`}</title>
            <text x={W0 - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#141414">{label(k)}</text>
            <line x1={x(b.whisker_low)} x2={x(b.whisker_high)} y1={y} y2={y} stroke="#52514e" strokeWidth="1.5" />
            <line x1={x(b.whisker_low)} x2={x(b.whisker_low)} y1={y - 7} y2={y + 7} stroke="#52514e" strokeWidth="1.5" />
            <line x1={x(b.whisker_high)} x2={x(b.whisker_high)} y1={y - 7} y2={y + 7} stroke="#52514e" strokeWidth="1.5" />
            <rect x={x(b.q1)} y={y - 13} width={Math.max(2, x(b.q3) - x(b.q1))} height="26" rx="4" fill={`${seriesColor(i)}33`} stroke={seriesColor(i)} strokeWidth="2" />
            <line x1={x(b.median)} x2={x(b.median)} y1={y - 13} y2={y + 13} stroke="#141414" strokeWidth="2.5" />
            <circle cx={x(b.mean)} cy={y} r="3" fill="#fff" stroke="#141414" strokeWidth="1.5" />
            {b.outliers.map((o, j) => <circle key={j} cx={x(o)} cy={y} r="2.5" fill="none" stroke="#e11d48" strokeWidth="1.2" opacity="0.7" />)}
          </g>
        );
      })}
    </svg>
  );
};

const VisualizationLabView: React.FC = () => {
  const state = useArtifact<any>('lab_visualization');
  const [boxBy, setBoxBy] = useState<'total_by_zone' | 'total_by_payment' | 'delivery_by_zone'>('total_by_zone');
  const [hist, setHist] = useState<'total' | 'delivery_minutes' | 'items'>('total');
  const [scatter, setScatter] = useState<'items_vs_total' | 'items_vs_delivery'>('items_vs_total');

  return (
    <LabPage
      eyebrow="Analytics"
      title="Order insights"
      intro="Understanding the Mumbai order data before mining it: summary statistics, how values are distributed, how they relate and where the outliers are."
      model={state.data?.model}
      concepts={[
        { term: 'Descriptive statistics', meaning: 'Centre (mean, median, mode), spread (range, variance, standard deviation, IQR) and shape (skewness, kurtosis).' },
        { term: 'Histogram', meaning: 'Counts of a numeric variable in equal-width bins: shows the distribution and its skew.' },
        { term: 'Box plot', meaning: 'Median line, box from Q1 to Q3, whiskers to the furthest points within 1.5 × IQR; points beyond are outliers.' },
        { term: 'Bar chart', meaning: 'Compares a measure across categories (orders by area).' },
        { term: 'Pie chart', meaning: 'Parts of one whole; readable only with a few slices (payment mix).' },
        { term: 'Line chart', meaning: 'A measure over time: trend, weekly cycles, festivals.' },
        { term: 'Scatter plot', meaning: 'Two numeric variables per observation: reveals correlation and clusters.' },
        { term: 'Heatmap', meaning: 'A matrix coloured by value: weekday × hour demand, or a correlation matrix.' },
        { term: 'Correlation (Pearson r)', meaning: 'Strength of a linear relationship, from -1 to +1. Correlation is not causation.' },
        { term: 'Outliers', meaning: 'Values beyond Q1 − 1.5 IQR or Q3 + 1.5 IQR (the IQR rule).' },
      ]}
    >
      <ArtifactGate state={state} what="visualizations">
        {(d) => {
          const statRows = Object.entries(d.stats) as [string, any][];
          const corr = d.correlation;
          const heatMax = Math.max(...d.heatmap.values.flat());
          return (
            <>
              <StatRow>
                <Stat label="Orders analysed" value={num(d.dataset.rows, 0)} note={`${String(d.dataset.from).slice(0, 10)} → ${String(d.dataset.to).slice(0, 10)}`} />
                <Stat label="Attributes" value={d.dataset.columns} />
                <Stat label="Mean order" value={`Rs ${num(d.stats.total.mean, 0)}`} note={`median Rs ${num(d.stats.total.median, 0)}`} />
                <Stat label="Outlier orders" value={num(d.stats.total.outliers, 0)} note="IQR rule on order value" strong />
              </StatRow>

              <Panel world={W} title="What the data says">
                <ul className="list-disc space-y-1 pl-5 text-sm">{d.insights.map((s: string) => <li key={s}>{s}</li>)}</ul>
              </Panel>

              <Panel world={W} title="Descriptive statistics" flush>
                <div className="px-5 pb-5 pt-2 sm:px-6">
                  <MiniTable rows={statRows} rowKey={([k]) => k} cols={[
                    { key: 'a', label: 'Attribute', render: ([, s]) => <span className="font-medium">{s.label}</span> },
                    ...(['count', 'missing', 'mean', 'median', 'mode', 'std', 'min', 'q1', 'q3', 'max', 'iqr', 'skew', 'kurtosis', 'outliers'] as const).map((k) => ({
                      key: k, label: k === 'std' ? 'Std dev' : k === 'q1' ? 'Q1' : k === 'q3' ? 'Q3' : k === 'iqr' ? 'IQR' : k[0].toUpperCase() + k.slice(1),
                      align: 'right' as const, render: ([, s]: [string, any]) => num(s[k], k === 'skew' || k === 'kurtosis' ? 2 : 1),
                    })),
                  ]} />
                </div>
              </Panel>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel world={W} title="Histogram" action={<Segmented world={W} label="Variable" value={hist} onChange={setHist}
                  options={[{ value: 'total', label: 'Order value' }, { value: 'delivery_minutes', label: 'Delivery' }, { value: 'items', label: 'Items' }]} />}>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <BarChart data={d.histograms[hist].map((b: any) => ({ ...b, bin: hist === 'items' ? String(b.from) : num(b.from, 0) }))} barCategoryGap={1}>
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis dataKey="bin" tick={AXIS} interval="preserveStartEnd" />
                        <YAxis tick={AXIS} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={({ payload }) => payload?.[0] ? (
                          <TipBox title={hist === 'items' ? `${payload[0].payload.from} items` : `${num(payload[0].payload.from, 0)} – ${num(payload[0].payload.to, 0)}`} rows={[['Orders', num(Number(payload[0].value), 0)]]} />) : null} />
                        <Bar isAnimationActive={false} dataKey="count" fill="#2a78d6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Reading>{hist === 'total' ? 'Long right tail: most orders are modest, a few are large. The mean sits right of the median.' : hist === 'delivery_minutes' ? 'Roughly bell-shaped around the typical delivery time, stretched right by rush-hour and large orders.' : 'Most orders hold two to four items.'}</Reading>
                </Panel>

                <Panel world={W} title="Box plot" action={<Segmented world={W} label="Box plot" value={boxBy} onChange={setBoxBy}
                  options={[{ value: 'total_by_zone', label: 'Value · zone' }, { value: 'total_by_payment', label: 'Value · payment' }, { value: 'delivery_by_zone', label: 'Delivery · zone' }]} />}>
                  <BoxPlots boxes={d.box[boxBy]} label={boxBy === 'total_by_payment' ? paymentName : (k) => k} />
                  <Reading>Box = middle 50% (Q1–Q3), dark line = median, open dot = mean, red rings = sample of outliers beyond 1.5 × IQR.</Reading>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <Panel world={W} title="Line chart: orders per day" description="Daily orders with a 7-day moving average">
                  <div className="h-64">
                    <ResponsiveContainer>
                      <LineChart data={d.line.daily}>
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis dataKey="date" tick={AXIS} minTickGap={40} tickFormatter={(v) => String(v).slice(5)} />
                        <YAxis tick={AXIS} />
                        <Tooltip content={({ payload, label }) => payload?.length ? (
                          <TipBox title={String(label)} rows={[['Orders', num(Number(payload[0]?.payload.orders), 0)], ['7-day average', num(Number(payload[0]?.payload.orders_7d), 0)]]} />) : null} />
                        <Line isAnimationActive={false} dataKey="orders" stroke="#2a78d6" strokeWidth={1} strokeOpacity={0.45} dot={false} />
                        <Line isAnimationActive={false} dataKey="orders_7d" stroke="#eb6834" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4"><Swatch color="#2a78d6" label="Daily orders" /><Swatch color="#eb6834" label="7-day average" /></div>
                </Panel>
                <Panel world={W} title="Pie chart: payment methods">
                  <div className="h-64">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie isAnimationActive={false} data={d.pie.payment} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={1.5} stroke="#fff" strokeWidth={2}
                          label={({ name, percent }: any) => `${paymentName(String(name))} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false} fontSize={11}>
                          {d.pie.payment.map((p: any, i: number) => <Cell key={p.label} fill={seriesColor(i)} />)}
                        </Pie>
                        <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={paymentName(String(payload[0].name))} rows={[['Orders', num(Number(payload[0].value), 0)]]} /> : null} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel world={W} title="Bar chart: orders by area" description="Where the kitchens that cooked them are">
                  <div className="h-[520px]">
                    <ResponsiveContainer>
                      <BarChart data={d.bar.by_area} layout="vertical" margin={{ left: 4, right: 16 }}>
                        <CartesianGrid horizontal={false} stroke={GRID} />
                        <XAxis type="number" tick={AXIS} />
                        <YAxis type="category" dataKey="area" width={100} tick={{ ...AXIS, fontSize: 10 }} interval={0} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={({ payload }) => payload?.[0] ? (
                          <TipBox title={`${payload[0].payload.area} · ${payload[0].payload.zone}`} rows={[['Orders', num(payload[0].payload.orders, 0)], ['Avg value', `Rs ${num(payload[0].payload.avg_value, 0)}`]]} />) : null} />
                        <Bar isAnimationActive={false} dataKey="orders" radius={[0, 4, 4, 0]} maxBarSize={12}>
                          {d.bar.by_area.map((a: any) => <Cell key={a.area} fill={seriesColor(['South Mumbai', 'Central Mumbai', 'Western Suburbs', 'Eastern Suburbs'].indexOf(a.zone))} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-4">{['South Mumbai', 'Central Mumbai', 'Western Suburbs', 'Eastern Suburbs'].map((z, i) => <Swatch key={z} color={seriesColor(i)} label={z} />)}</div>
                </Panel>
                <Panel world={W} title="Scatter plot" action={<Segmented world={W} label="Scatter" value={scatter} onChange={setScatter}
                  options={[{ value: 'items_vs_total', label: 'Items · value' }, { value: 'items_vs_delivery', label: 'Items · delivery' }]} />}>
                  <div className="h-[520px]">
                    <ResponsiveContainer>
                      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke={GRID} />
                        <XAxis type="number" dataKey="items" name="Items" tick={AXIS} label={{ value: 'Items in order', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                        <YAxis type="number" dataKey={scatter === 'items_vs_total' ? 'total' : 'delivery_minutes'} tick={AXIS} />
                        <ZAxis range={[28, 28]} />
                        <Tooltip content={({ payload }) => payload?.[0] ? (
                          <TipBox rows={[['Items', payload[0].payload.items], [scatter === 'items_vs_total' ? 'Value' : 'Delivery', num(payload[0].payload[scatter === 'items_vs_total' ? 'total' : 'delivery_minutes'], 0)]]} />) : null} />
                        <Scatter isAnimationActive={false} data={d.scatter[scatter]} fill="#2a78d6" fillOpacity={0.35} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <Reading>{scatter === 'items_vs_total' ? 'A clear positive, roughly linear relationship: more items, bigger bill. The delivery-time & order-value models build on this.' : 'Delivery time rises with basket size but with much more scatter: other factors (rush hour, the restaurant) matter.'}</Reading>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel world={W} title="Heatmap: when Mumbai orders" description="Orders by weekday and hour">
                  <div className="overflow-x-auto">
                    <table className="text-[10px]">
                      <thead><tr><th />{d.heatmap.columns.map((h: number) => <th key={h} className={`w-5 font-normal ${T.faint}`}>{h % 3 === 0 ? h : ''}</th>)}</tr></thead>
                      <tbody>
                        {d.heatmap.values.map((row: number[], i: number) => (
                          <tr key={i}>
                            <th className="pr-2 text-right font-medium">{d.heatmap.rows[i]}</th>
                            {row.map((v, h) => <td key={h} className="p-[1px]"><div className="h-6 w-5 rounded-[3px]" style={{ background: sequentialColor(v / heatMax) }} title={`${d.heatmap.rows[i]} ${h}:00 — ${v} orders`} /></td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Reading>Two daily peaks (lunch 12–14, dinner 19–22), heavier on Friday to Sunday.</Reading>
                </Panel>
                <Panel world={W} title="Correlation matrix" description="Pearson r between numeric attributes">
                  <div className="overflow-x-auto">
                    <table className="text-[11px]">
                      <thead><tr><th />{corr.columns.map((c: string) => <th key={c} className="px-1 pb-1 font-medium [writing-mode:vertical-rl]">{c}</th>)}</tr></thead>
                      <tbody>
                        {corr.matrix.map((row: number[], i: number) => (
                          <tr key={i}>
                            <th className="pr-2 text-right font-medium">{corr.columns[i]}</th>
                            {row.map((v, j) => (
                              <td key={j} className="p-[1px]">
                                <div className="grid h-9 w-11 place-items-center rounded-[4px] tabular-nums" style={{ background: divergingColor(v ?? 0), color: Math.abs(v ?? 0) > 0.6 ? '#fff' : '#141414' }}>{fixed(v, 2)}</div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex gap-4"><Swatch color={divergingColor(-1)} label="negative" shape="square" /><Swatch color={divergingColor(0)} label="none" shape="square" /><Swatch color={divergingColor(1)} label="positive" shape="square" /></div>
                  <Reading>Strongest pairs: {corr.top_pairs.slice(0, 3).map((p: any) => `${p.a} & ${p.b} (r = ${fixed(p.r, 2)})`).join('; ')}.</Reading>
                </Panel>
              </div>

              <Panel world={W} title="Orders by zone" flush>
                <div className="px-5 pb-5 pt-2 sm:px-6">
                  <MiniTable rows={d.bar.by_zone} rowKey={(z: any) => z.zone} cols={[
                    { key: 'z', label: 'Zone', render: (z: any) => z.zone },
                    { key: 'o', label: 'Orders', align: 'right', render: (z: any) => num(z.orders, 0) },
                    { key: 's', label: 'Share', align: 'right', render: (z: any) => pctOf(z.orders / d.dataset.rows) },
                    { key: 'r', label: 'Revenue', align: 'right', render: (z: any) => `Rs ${num(z.revenue, 0)}` },
                    { key: 'a', label: 'Avg order', align: 'right', render: (z: any) => `Rs ${num(z.avg_value, 0)}` },
                  ]} />
                </div>
              </Panel>
            </>
          );
        }}
      </ArtifactGate>
    </LabPage>
  );
};

export default VisualizationLabView;
