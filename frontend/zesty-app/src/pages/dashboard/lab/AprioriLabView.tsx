import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Field, Panel, Segmented } from '../../../components/dashboard/primitives';
import { ArtifactGate, LabPage, MiniTable, Reading, Stat, StatRow, TipBox } from './labKit';
import { W, AXIS, GRID, T, fixed, num, pctOf, useArtifact } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

const set = (items: string[]) => `{${items.join(', ')}}`;

const AprioriLabView: React.FC = () => {
  const state = useArtifact<any>('lab_apriori');
  const [level, setLevel] = useState<'category' | 'item'>('category');
  const [minSup, setMinSup] = useState(0.02);
  const [minConf, setMinConf] = useState(0.3);
  const [minLift, setMinLift] = useState(1.0);

  return (
    <LabPage
      eyebrow="Basket analysis"
      title="Frequently ordered together"
      intro="What do Mumbai customers order together? Each order is a transaction; Apriori finds the itemsets that appear often and the rules hidden in them."
      model={state.data?.model}
      concepts={[
        { term: 'Transaction / itemset', meaning: 'A transaction is one basket (an order); an itemset is any set of items, a k-itemset has k items.' },
        { term: 'Support', meaning: 'support(A) = transactions containing A / all transactions.' },
        { term: 'Confidence', meaning: 'confidence(A → B) = support(A ∪ B) / support(A): how often B comes with A.' },
        { term: 'Lift', meaning: 'confidence(A → B) / support(B). Above 1: A makes B more likely; 1: independent; below 1: less likely.' },
        { term: 'Frequent itemset', meaning: 'An itemset whose support is at least the minimum support.' },
        { term: 'Apriori property', meaning: 'Every subset of a frequent itemset is frequent; so a candidate with any infrequent subset is pruned without counting.' },
        { term: 'Candidate generation', meaning: 'Ck is built by joining frequent (k−1)-itemsets Lk−1, then pruned by the Apriori property and counted.' },
        { term: 'Leverage and conviction', meaning: 'Leverage = support(A∪B) − support(A)·support(B); conviction = (1 − support(B)) / (1 − confidence).' },
        { term: 'FP-Growth', meaning: 'Finds the same frequent itemsets from a compressed prefix tree without generating candidates; usually faster.' },
      ]}
    >
      <ArtifactGate state={state} what="association rules">
        {(d) => {
          const L = d[level];
          const itemsets = L.itemsets.filter((s: any) => s.support >= minSup);
          const rules = L.rules.filter((r: any) => r.support >= minSup && r.confidence >= minConf && r.lift >= minLift);
          const top = rules[0];
          const bySize: Record<number, number> = {};
          itemsets.forEach((s: any) => { bySize[s.size] = (bySize[s.size] ?? 0) + 1; });
          return (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Segmented world={W} label="Level" value={level} onChange={(v) => { setLevel(v); setMinSup(v === 'item' ? 0.01 : 0.02); }}
                  options={[{ value: 'category', label: 'Menu categories (all orders)' }, { value: 'item', label: `Dishes (${d.item.restaurant})` }]} />
              </div>
              <StatRow>
                <Stat label="Transactions" value={num(L.transactions, 0)} note={level === 'item' ? 'orders at the busiest restaurant' : 'orders with categorised items'} />
                <Stat label="Frequent itemsets" value={num(itemsets.length, 0)} note={Object.entries(bySize).map(([k, v]) => `L${k}: ${v}`).join(' · ')} />
                <Stat label="Rules passing filters" value={num(rules.length, 0)} />
                <Stat label="Strongest lift" value={top ? fixed(top.lift, 2) : '—'} note={top ? `${set(top.antecedent)} → ${set(top.consequent)}` : undefined} strong />
              </StatRow>

              <Panel world={W} title="Thresholds" description="Mined once at low thresholds; raise them here.">
                <div className="grid gap-5 md:grid-cols-3">
                  <Field world={W} label={`Minimum support: ${pctOf(minSup, 1)}`} htmlFor="ap-s">
                    <input id="ap-s" type="range" min={L.min_support} max={0.3} step={0.005} value={minSup} onChange={(e) => setMinSup(Number(e.target.value))} className="w-full accent-[#6f7f42]" />
                  </Field>
                  <Field world={W} label={`Minimum confidence: ${pctOf(minConf, 0)}`} htmlFor="ap-c">
                    <input id="ap-c" type="range" min={d.min_confidence} max={0.95} step={0.05} value={minConf} onChange={(e) => setMinConf(Number(e.target.value))} className="w-full accent-[#6f7f42]" />
                  </Field>
                  <Field world={W} label={`Minimum lift: ${fixed(minLift, 2)}`} htmlFor="ap-l">
                    <input id="ap-l" type="range" min={0} max={5} step={0.1} value={minLift} onChange={(e) => setMinLift(Number(e.target.value))} className="w-full accent-[#6f7f42]" />
                  </Field>
                </div>
              </Panel>

              <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
                <Panel world={W} title="Sample transactions">
                  <ol className="space-y-1.5 text-sm">
                    {L.sample.map((t: string[], i: number) => (
                      <li key={i} className="flex gap-2"><span className={`w-8 shrink-0 text-xs tabular-nums ${T.faint}`}>T{i + 1}</span><span>{set(t)}</span></li>
                    ))}
                  </ol>
                </Panel>
                {top ? (
                  <Panel world={W} title="Reading the strongest rule" description={`${set(top.antecedent)} → ${set(top.consequent)}`}>
                    <ul className="space-y-2 font-mono text-[13px]">
                      <li>support = P(A ∪ B) = <strong>{fixed(top.support, 4)}</strong> ({num(top.support * L.transactions, 0)} of {num(L.transactions, 0)} orders)</li>
                      <li>confidence = support(A ∪ B) / support(A) = {fixed(top.support, 4)} / {fixed(top.antecedent_support, 4)} = <strong>{fixed(top.confidence, 4)}</strong></li>
                      <li>lift = confidence / support(B) = {fixed(top.confidence, 4)} / {fixed(top.consequent_support, 4)} = <strong>{fixed(top.lift, 3)}</strong></li>
                      <li>leverage = {fixed(top.leverage, 4)} · conviction = {top.conviction === null ? '∞' : fixed(top.conviction, 3)}</li>
                    </ul>
                    <Reading>
                      {pctOf(top.confidence, 0)} of orders with {set(top.antecedent)} also have {set(top.consequent)}, {fixed(top.lift, 1)}× as often as orders in general.
                      {level === 'item' ? ' A natural combo to bundle or suggest at checkout.' : ''}
                    </Reading>
                  </Panel>
                ) : <Panel world={W} title="No rule passes these thresholds"><p className={`text-sm ${T.muted}`}>Lower the minimum support, confidence or lift.</p></Panel>}
              </div>

              {level === 'category' && (
                <Panel world={W} title="Apriori level by level" description={`Minimum support ${pctOf(L.min_support, 0)} as mined. ✓ = frequent (kept in Lk), ✗ = below minimum support.`}>
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {L.levels.map((lv: any) => (
                      <div key={lv.k} className={`rounded-2xl border p-3 ${T.hairline}`}>
                        <p className="text-sm font-semibold">C{lv.k} → L{lv.k} <span className={`font-normal ${T.muted}`}>({lv.candidates.length} candidates, {lv.frequent_count} frequent)</span></p>
                        {lv.pruned_by_apriori.length > 0 && <p className={`mt-1 text-xs ${T.muted}`}>Pruned before counting (an infrequent subset): {lv.pruned_by_apriori.map(set).join(', ')}</p>}
                        <div className="mt-2 max-h-64 overflow-y-auto">
                          <MiniTable rows={lv.candidates} dense rowKey={(c: any) => c.itemset.join('|')} cols={[
                            { key: 'i', label: 'Itemset', render: (c: any) => <span className="text-xs">{set(c.itemset)}</span> },
                            { key: 'n', label: 'Count', align: 'right', render: (c: any) => num(c.count, 0) },
                            { key: 's', label: 'Support', align: 'right', render: (c: any) => pctOf(c.support, 1) },
                            { key: 'f', label: '', align: 'right', render: (c: any) => (c.frequent ? <Check className="ml-auto h-4 w-4 text-emerald-600" aria-label="frequent" /> : <X className="ml-auto h-4 w-4 text-rose-500" aria-label="infrequent" />) },
                          ]} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <Panel world={W} title="Association rules" description="Sorted by lift" flush>
                  <div className="max-h-[480px] overflow-y-auto px-5 pb-5 pt-2 sm:px-6">
                    <MiniTable rows={rules} max={150} dense rowKey={(r: any, i) => `${r.antecedent.join('|')}>${r.consequent.join('|')}${i}`} cols={[
                      { key: 'r', label: 'Rule (A → B)', render: (r: any) => <span className="text-xs">{set(r.antecedent)} → <strong>{set(r.consequent)}</strong></span> },
                      { key: 's', label: 'Support', align: 'right', render: (r: any) => pctOf(r.support, 1) },
                      { key: 'c', label: 'Confidence', align: 'right', render: (r: any) => pctOf(r.confidence, 0) },
                      { key: 'l', label: 'Lift', align: 'right', render: (r: any) => <span className={r.lift > 1.2 ? 'font-semibold text-emerald-700' : r.lift < 1 ? 'text-rose-600' : ''}>{fixed(r.lift, 2)}</span> },
                      { key: 'lv', label: 'Leverage', align: 'right', render: (r: any) => fixed(r.leverage, 4) },
                    ]} />
                  </div>
                </Panel>
                <Panel world={W} title="Support vs confidence" description="Each dot a rule; bigger = higher lift">
                  <div className="h-80">
                    <ResponsiveContainer>
                      <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: 0 }}>
                        <CartesianGrid stroke={GRID} />
                        <XAxis type="number" dataKey="support" tick={AXIS} tickFormatter={(v) => pctOf(v, 0)} label={{ value: 'Support', position: 'insideBottom', offset: -6, fontSize: 11 }} />
                        <YAxis type="number" dataKey="confidence" tick={AXIS} tickFormatter={(v) => pctOf(v, 0)} domain={[0, 1]} />
                        <ZAxis type="number" dataKey="lift" range={[20, 220]} />
                        <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={`${set(payload[0].payload.antecedent)} → ${set(payload[0].payload.consequent)}`} rows={[['Support', pctOf(payload[0].payload.support, 1)], ['Confidence', pctOf(payload[0].payload.confidence, 0)], ['Lift', fixed(payload[0].payload.lift, 2)]]} /> : null} />
                        <Scatter isAnimationActive={false} data={rules.filter((r: any) => r.lift >= 1)} fill="#2a78d6" fillOpacity={0.55} name="lift ≥ 1" />
                        <Scatter isAnimationActive={false} data={rules.filter((r: any) => r.lift < 1)} fill="#eb6834" fillOpacity={0.55} name="lift < 1" />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>

              {level === 'item' && (
                <Panel world={W} title="Apriori vs FP-Growth" description="Same frequent itemsets, different search. Timed on this restaurant's orders.">
                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={L.timing.map((t: any) => ({ ...t, label: pctOf(t.min_support, 1) }))}>
                          <CartesianGrid vertical={false} stroke={GRID} />
                          <XAxis dataKey="label" tick={AXIS} label={{ value: 'minimum support', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                          <YAxis tick={AXIS} unit=" ms" />
                          <Tooltip content={({ payload, label }) => payload?.length ? <TipBox title={`min support ${label}`} rows={payload.map((p) => [String(p.name), `${num(Number(p.value), 1)} ms`])} /> : null} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar isAnimationActive={false} name="Apriori" dataKey="apriori_ms" fill="#2a78d6" radius={[4, 4, 0, 0]} />
                          <Bar isAnimationActive={false} name="FP-Growth" dataKey="fpgrowth_ms" fill="#eb6834" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <MiniTable rows={L.timing} rowKey={(t: any) => t.min_support} cols={[
                      { key: 's', label: 'Min support', render: (t: any) => pctOf(t.min_support, 1) },
                      { key: 'a', label: 'Itemsets (Apriori)', align: 'right', render: (t: any) => t.apriori_itemsets },
                      { key: 'f', label: 'Itemsets (FP-Growth)', align: 'right', render: (t: any) => t.fpgrowth_itemsets },
                      { key: 'z', label: 'By size', align: 'right', render: (t: any) => Object.entries(t.by_size).map(([k, v]) => `L${k}:${v}`).join(' ') },
                    ]} />
                  </div>
                  <Reading>Both find identical itemsets. Lower support means more candidates, and Apriori's repeated database scans grow faster than FP-Growth's tree.</Reading>
                </Panel>
              )}
            </>
          );
        }}
      </ArtifactGate>
    </LabPage>
  );
};

export default AprioriLabView;
