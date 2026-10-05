import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel, Segmented } from '../../../components/dashboard/primitives';
import { ArtifactGate, ClassMetrics, ConfusionMatrix, LabPage, MiniTable, Reading, Stat, StatRow, TipBox } from './labKit';
import { W, AXIS, GRID, T, fixed, num, pctOf, useArtifact } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Node = {
  id: number; leaf: boolean; feature: string | null; feature_label: string | null; threshold: number | null;
  impurity: number; samples: number; value: number[]; class: string; left: number | null; right: number | null;
};

const NODE_W = 150, NODE_H = 78, GAP_X = 14, GAP_Y = 46;

/** Draws the tree top-down: leaves spaced evenly, parents centred over their children. */
const TreeDiagram: React.FC<{ nodes: Node[]; criterion: string; highlight?: number[] }> = ({ nodes, criterion, highlight = [] }) => {
  const layout = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const pos = new Map<number, { x: number; y: number }>();
    let leafX = 0;
    let maxDepth = 0;
    const place = (id: number, depth: number): number => {
      const n = byId.get(id)!;
      maxDepth = Math.max(maxDepth, depth);
      let x: number;
      if (n.leaf) { x = leafX; leafX += NODE_W + GAP_X; } else {
        const l = place(n.left!, depth + 1);
        const r = place(n.right!, depth + 1);
        x = (l + r) / 2;
      }
      pos.set(id, { x, y: depth * (NODE_H + GAP_Y) });
      return x;
    };
    place(0, 0);
    return { pos, width: leafX, height: (maxDepth + 1) * (NODE_H + GAP_Y) };
  }, [nodes]);
  const hl = new Set(highlight);
  return (
    <div className="overflow-x-auto">
      <svg width={layout.width} height={layout.height} role="img" aria-label="Decision tree">
        {nodes.filter((n) => !n.leaf).map((n) => {
          const p = layout.pos.get(n.id)!;
          return [n.left!, n.right!].map((c, side) => {
            const q = layout.pos.get(c)!;
            const on = hl.has(n.id) && hl.has(c);
            return (
              <g key={`${n.id}-${c}`}>
                <path d={`M${p.x + NODE_W / 2},${p.y + NODE_H} C${p.x + NODE_W / 2},${p.y + NODE_H + GAP_Y / 2} ${q.x + NODE_W / 2},${q.y - GAP_Y / 2} ${q.x + NODE_W / 2},${q.y}`}
                  fill="none" stroke={on ? '#eb6834' : '#cfcac0'} strokeWidth={on ? 3 : 1.5} />
                <text x={(p.x + q.x) / 2 + NODE_W / 2} y={(p.y + NODE_H + q.y) / 2 + 4} textAnchor="middle" fontSize="10" fill="#6b6a63">{side === 0 ? 'yes' : 'no'}</text>
              </g>
            );
          });
        })}
        {nodes.map((n) => {
          const p = layout.pos.get(n.id)!;
          const share = n.value[1] / Math.max(1, n.samples);
          const quiet = n.class === 'Goes quiet';
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`}>
              <title>{`${n.leaf ? 'Leaf' : `${n.feature_label} ≤ ${fixed(n.threshold, 1)}`} · ${criterion} ${fixed(n.impurity, 3)} · ${n.samples} customers · ${n.value[0]} active / ${n.value[1]} quiet`}</title>
              <rect width={NODE_W} height={NODE_H} rx="10" fill={n.leaf ? (quiet ? '#fdeee6' : '#e7f0fb') : '#fff'}
                stroke={hl.has(n.id) ? '#eb6834' : n.leaf ? (quiet ? '#eb6834' : '#2a78d6') : '#cfcac0'} strokeWidth={hl.has(n.id) ? 2.5 : 1.2} />
              <text x="8" y="16" fontSize="10.5" fontWeight="600" fill="#141414">
                {n.leaf ? `→ ${n.class}` : `${(n.feature ?? '').slice(0, 14)} ≤ ${num(n.threshold, 1)}`}
              </text>
              <text x="8" y="32" fontSize="10" fill="#52514e">{criterion} = {fixed(n.impurity, 3)}</text>
              <text x="8" y="46" fontSize="10" fill="#52514e">samples = {num(n.samples, 0)}</text>
              <text x="8" y="60" fontSize="10" fill="#52514e">value = [{n.value[0]}, {n.value[1]}]</text>
              <rect x="8" y="66" width={NODE_W - 16} height="5" rx="2.5" fill="#e7f0fb" />
              <rect x="8" y="66" width={(NODE_W - 16) * share} height="5" rx="2.5" fill="#eb6834" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const DecisionTreeLabView: React.FC = () => {
  const state = useArtifact<any>('lab_decision_tree');
  const [example, setExample] = useState(0);
  const [view, setView] = useState<'diagram' | 'rules'>('diagram');

  return (
    <LabPage
      eyebrow="Prediction"
      title="Churn prediction"
      intro="Will a Mumbai customer go quiet? A tree learns yes/no questions about recency, frequency and spend that split customers into purer and purer groups."
      model={state.data?.model}
      concepts={[
        { term: 'Classification', meaning: 'Predicting a category (stays active / goes quiet) from attributes, learned from labelled examples.' },
        { term: 'Entropy', meaning: 'Impurity of a node: H = −Σ p·log2 p. 0 when every row has the same class, 1 at a 50/50 split.' },
        { term: 'Information gain', meaning: 'Parent entropy minus the weighted entropy of the children. ID3/C4.5 split on the attribute with the highest gain.' },
        { term: 'Gini index', meaning: 'Impurity G = 1 − Σ p². CART (scikit-learn\'s default) picks the split with the largest Gini decrease.' },
        { term: 'Attribute relevance', meaning: 'Ranking attributes by how much a single split on them reduces impurity: a simple feature-selection method.' },
        { term: 'Root, internal and leaf nodes', meaning: 'The root holds all training rows; internal nodes test an attribute; leaves assign the majority class.' },
        { term: 'Overfitting', meaning: 'A deep tree memorises the training data: training accuracy keeps rising while test accuracy stalls or falls.' },
        { term: 'Pruning', meaning: 'Cutting back branches that add little. Cost-complexity pruning removes subtrees whose impurity gain is below α per leaf.' },
      ]}
    >
      <ArtifactGate state={state} what="decision tree">
        {(d) => {
          const root = d.root_split;
          const ex = d.examples[example];
          const crit = d.best_criterion;
          return (
            <>
              <StatRow>
                <Stat label="Customers" value={num(d.dataset.rows, 0)} note={`${num(d.dataset.n_train, 0)} train · ${num(d.dataset.n_test, 0)} test`} />
                <Stat label="Went quiet" value={pctOf(d.dataset.positive_rate)} note="class balance" />
                <Stat label="Pruned tree" value={`${d.pruned.leaves} leaves`} note={`depth ${d.pruned.depth}, α = ${fixed(d.best_alpha, 5)}`} />
                <Stat label="Recall on quiet customers" value={pctOf(d.display.test.recall)} note={`accuracy ${pctOf(d.display.test.accuracy)} · F1 ${pctOf(d.display.test.f1)}`} strong />
              </StatRow>

              {root && (
                <Panel world={W} title="Choosing the root split" description="Information gain worked through for the best first question">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className={`rounded-2xl p-4 ${T.subtle}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide">Parent (all training rows)</p>
                      <p className="mt-2 text-sm">{num(d.parent.n, 0)} customers, {num(d.parent.positives, 0)} went quiet</p>
                      <p className="mt-1 font-mono text-[13px]">H = {fixed(d.parent.entropy, 4)} · Gini = {fixed(d.parent.gini, 4)}</p>
                    </div>
                    {(['left', 'right'] as const).map((side) => (
                      <div key={side} className={`rounded-2xl border p-4 ${T.hairline}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide">{side === 'left' ? 'Yes' : 'No'}: {root.label} {side === 'left' ? '≤' : '>'} {num(root.threshold, 1)}</p>
                        <p className="mt-2 text-sm">{num(root[side].n, 0)} customers, {num(root[side].positives, 0)} went quiet</p>
                        <p className="mt-1 font-mono text-[13px]">H = {fixed(root[side].entropy, 4)} · Gini = {fixed(root[side].gini, 4)}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 font-mono text-[13px]">
                    Gain = {fixed(d.parent.entropy, 4)} − ({num(root.left.n, 0)}/{num(d.parent.n, 0)} × {fixed(root.left.entropy, 4)} + {num(root.right.n, 0)}/{num(d.parent.n, 0)} × {fixed(root.right.entropy, 4)}) = <strong>{fixed(root.information_gain, 4)}</strong>
                    &nbsp;· Gini decrease = <strong>{fixed(root.gini_decrease, 4)}</strong> · Gain ratio = {fixed(root.gain_ratio, 4)}
                  </p>
                </Panel>
              )}

              <Panel world={W} title="Attribute relevance" description="Each attribute's best single split, ranked by information gain">
                <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
                  <div className="h-72">
                    <ResponsiveContainer>
                      <BarChart data={d.relevance} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid horizontal={false} stroke={GRID} />
                        <XAxis type="number" tick={AXIS} />
                        <YAxis type="category" dataKey="feature" width={92} tick={AXIS} interval={0} />
                        <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={payload[0].payload.label} rows={[['Information gain', fixed(payload[0].payload.information_gain, 4)], ['Best threshold', num(payload[0].payload.threshold, 1)]]} /> : null} />
                        <Bar isAnimationActive={false} dataKey="information_gain" fill="#2a78d6" radius={[0, 4, 4, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <MiniTable rows={d.relevance} dense rowKey={(r: any) => r.feature} cols={[
                    { key: 'f', label: 'Attribute', render: (r: any) => r.label },
                    { key: 't', label: 'Split at', align: 'right', render: (r: any) => `≤ ${num(r.threshold, 1)}` },
                    { key: 'g', label: 'Info gain', align: 'right', render: (r: any) => fixed(r.information_gain, 4) },
                    { key: 'gi', label: 'Gini ↓', align: 'right', render: (r: any) => fixed(r.gini_decrease, 4) },
                    { key: 'gr', label: 'Gain ratio', align: 'right', render: (r: any) => fixed(r.gain_ratio, 3) },
                  ]} />
                </div>
              </Panel>

              <Panel world={W} title="The tree" description={`Criterion: ${crit}, pre-pruned to depth ${d.display.max_depth} with at least 40 customers per leaf, classes weighted. Orange bar = share that went quiet. Hover a node for details.`}
                action={<Segmented world={W} label="View" value={view} onChange={setView} options={[{ value: 'diagram', label: 'Diagram' }, { value: 'rules', label: 'Rules' }]} />}>
                {view === 'diagram' ? <TreeDiagram nodes={d.display.nodes} criterion={crit} highlight={ex?.path} /> : (
                  <pre className="max-h-[520px] overflow-auto rounded-xl bg-[#0d0d0d] p-4 text-[12px] leading-relaxed text-[#d8e2b5]">{d.display.rules}</pre>
                )}
                {ex && (
                  <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-sm font-semibold">Prediction for test customer #{example + 1} (path in orange)</p>
                      <p className={`mt-1 text-sm ${T.muted}`}>
                        Recency {num(ex.features.recency, 0)} d · {num(ex.features.n_all, 0)} purchases · Rs {num(ex.features.spend_all, 0)} spent →
                        predicted <strong>{ex.predicted}</strong> ({pctOf(ex.probability)} chance of going quiet); actually <strong>{ex.actual}</strong>.
                      </p>
                    </div>
                    <Segmented world={W} label="Example" value={String(example)} onChange={(v) => setExample(Number(v))}
                      options={d.examples.map((_: any, i: number) => ({ value: String(i), label: `#${i + 1}` }))} />
                  </div>
                )}
              </Panel>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel world={W} title="Overfitting: accuracy vs depth" description="Training accuracy keeps climbing; test accuracy peaks and flattens">
                  <div className="h-72">
                    <ResponsiveContainer>
                      <LineChart data={d.depth_curve}>
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis dataKey="depth" tick={AXIS} label={{ value: 'max depth', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                        <YAxis tick={AXIS} domain={['auto', 1]} tickFormatter={(v) => pctOf(v, 0)} />
                        <Tooltip content={({ payload, label }) => payload?.length ? <TipBox title={`Depth ${label}`} rows={payload.map((p) => [String(p.name), pctOf(Number(p.value))])} /> : null} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line isAnimationActive={false} name="Gini · train" dataKey="gini_train" stroke="#2a78d6" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                        <Line isAnimationActive={false} name="Gini · test" dataKey="gini_test" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line isAnimationActive={false} name="Entropy · train" dataKey="entropy_train" stroke="#eb6834" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                        <Line isAnimationActive={false} name="Entropy · test" dataKey="entropy_test" stroke="#eb6834" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel world={W} title="Cost-complexity pruning" description="Larger α prunes more: fewer leaves, a simpler tree">
                  <div className="h-72">
                    <ResponsiveContainer>
                      <LineChart data={d.pruning.map((p: any) => ({ ...p, alphaLabel: p.alpha.toExponential(1) }))}>
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis dataKey="alphaLabel" tick={{ ...AXIS, fontSize: 9 }} interval={2} />
                        <YAxis yAxisId="acc" tick={AXIS} tickFormatter={(v) => pctOf(v, 0)} domain={['auto', 1]} />
                        <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={`α = ${fixed(payload[0].payload.alpha, 6)}`} rows={[['Train', pctOf(payload[0].payload.train)], ['Test', pctOf(payload[0].payload.test)], ['Leaves', payload[0].payload.leaves]]} /> : null} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line isAnimationActive={false} yAxisId="acc" name="Train accuracy" dataKey="train" stroke="#2a78d6" strokeDasharray="5 3" strokeWidth={2} dot={false} />
                        <Line isAnimationActive={false} yAxisId="acc" name="Test accuracy" dataKey="test" stroke="#eb6834" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <Reading>The chosen α ({fixed(d.best_alpha, 5)}) gives the best F1 on customers who go quiet, with {d.pruned.leaves} leaves against {d.unpruned.leaves} unpruned. Only about a fifth of customers go quiet, so classes are weighted (balanced) and F1, not accuracy, decides: a tree that always says “stays active” would score 80% accuracy and catch no one.</Reading>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Panel world={W} title="The tree above, on the test set">
                  <ClassMetrics m={d.display.test} />
                  <div className="mt-5"><ConfusionMatrix matrix={d.display.test.confusion_matrix} labels={d.classes} /></div>
                </Panel>
                <Panel world={W} title="Feature importance" description="Total impurity decrease each attribute brings">
                  <MiniTable rows={d.importance} rowKey={(r: any) => r.feature} cols={[
                    { key: 'f', label: 'Attribute', render: (r: any) => r.label },
                    { key: 'b', label: '', render: (r: any) => <span className="block h-2 rounded-full bg-[#2a78d6]" style={{ width: `${Math.max(2, r.importance * 160)}px` }} /> },
                    { key: 'v', label: 'Importance', align: 'right', render: (r: any) => pctOf(r.importance) },
                  ]} />
                  <h3 className="mb-2 mt-6 text-sm font-semibold">Compared</h3>
                  <MiniTable rows={d.comparison} rowKey={(r: any) => r.model} cols={[
                    { key: 'm', label: 'Model', render: (r: any) => r.model },
                    { key: 'a', label: 'Accuracy', align: 'right', render: (r: any) => pctOf(r.accuracy) },
                    { key: 'p', label: 'Precision', align: 'right', render: (r: any) => pctOf(r.precision) },
                    { key: 'r', label: 'Recall', align: 'right', render: (r: any) => pctOf(r.recall) },
                    { key: 'f', label: 'F1', align: 'right', render: (r: any) => pctOf(r.f1) },
                  ]} />
                </Panel>
              </div>
            </>
          );
        }}
      </ArtifactGate>
    </LabPage>
  );
};

export default DecisionTreeLabView;
