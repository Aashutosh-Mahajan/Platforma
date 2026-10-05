import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpToLine, Columns3, Repeat2, Scissors, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { labAPI, type CubeCatalog, type CubeResult } from '../../../api/lab';
import { ErrorBanner, Field, Panel, SkeletonRows } from '../../../components/dashboard/primitives';
import { apiErrorMessage, useLoad } from '../../../components/dashboard/intelligenceUtils';
import { LabPage, Reading, TipBox } from './labKit';
import { AXIS, GRID, T, W, num, pctOf, sequentialColor } from './labUtils';

type Op = { op: string; detail: string };

const OP_TONE: Record<string, string> = {
  'Roll-up': 'bg-sky-50 text-sky-800', 'Drill-down': 'bg-emerald-50 text-emerald-800', Slice: 'bg-amber-50 text-amber-800',
  Dice: 'bg-orange-50 text-orange-800', Pivot: 'bg-violet-50 text-violet-800', Start: 'bg-stone-100 text-stone-700',
  'Add columns': 'bg-stone-100 text-stone-700', 'Remove filter': 'bg-stone-100 text-stone-700',
};

const OlapLabView: React.FC = () => {
  const [catalog, setCatalog] = useState<CubeCatalog | null>(null);
  const [fact, setFact] = useState('orders');
  const [measure, setMeasure] = useState('revenue');
  const [rows, setRows] = useState('time.year');
  const [cols, setCols] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Op[]>([{ op: 'Start', detail: 'Revenue by year' }]);
  // Slice / dice picker
  const [pickLevel, setPickLevel] = useState('location.zone');
  const [pickChosen, setPickChosen] = useState<string[]>([]);

  useEffect(() => { labAPI.cubeCatalog().then(setCatalog).catch((e) => setError(apiErrorMessage(e, 'Could not load the cube.'))); }, []);

  const cube = catalog?.cubes[fact];
  const levelLabel = (key: string) => {
    for (const d of cube?.dimensions ?? []) for (const l of d.levels) if (l.key === key) return `${d.label}: ${l.label}`;
    return key;
  };
  const levelIndex = (key: string) => {
    const [dim] = key.split('.');
    return cube?.dimensions.find((d) => d.key === dim)?.levels.findIndex((l) => l.key === key) ?? -1;
  };

  const query = useLoad<CubeResult | null>(
    () => (cube ? labAPI.cube(fact, measure, rows, cols, filters) : Promise.resolve(null)),
    [cube, fact, measure, rows, cols, filters],
  );
  const result = query.data;
  const loading = query.loading;
  const members = useLoad<string[]>(
    () => (cube ? labAPI.cube(fact, measure, pickLevel, null, {}).then((r) => r.row_members) : Promise.resolve([])),
    [cube, fact, measure, pickLevel],
  );
  const pickMembers = members.data ?? [];

  const log = (op: string, detail: string) => setHistory((h) => [...h.slice(-11), { op, detail }]);

  const drill = (member: string) => {
    if (!result?.can_drill || !result.finer) return;
    setFilters((f) => ({ ...f, [rows]: [member] }));
    setRows(result.finer);
    log('Drill-down', `${member} → ${levelLabel(result.finer)}`);
  };
  const rollUp = () => {
    if (!result?.coarser) return;
    const [dim] = rows.split('.');
    const target = levelIndex(result.coarser);
    setFilters((f) => Object.fromEntries(Object.entries(f).filter(([k]) => !(k.startsWith(`${dim}.`) && levelIndex(k) >= target))));
    setRows(result.coarser);
    log('Roll-up', `${levelLabel(rows)} → ${levelLabel(result.coarser)}`);
  };
  const pivot = () => {
    if (!cols) return;
    setRows(cols);
    setCols(rows);
    log('Pivot', `rows ⇄ columns`);
  };
  const applyPick = () => {
    if (!pickChosen.length) return;
    const next = { ...filters, [pickLevel]: pickChosen };
    setFilters(next);
    const dims = new Set(Object.keys(next).map((k) => k.split('.')[0]));
    const isSlice = pickChosen.length === 1 && dims.size === 1;
    log(isSlice ? 'Slice' : 'Dice', `${levelLabel(pickLevel)} = ${pickChosen.join(', ')}`);
  };
  const removeFilter = (k: string) => {
    setFilters((f) => Object.fromEntries(Object.entries(f).filter(([key]) => key !== k)));
    log('Remove filter', levelLabel(k));
  };
  const changeFact = (f: string) => {
    setFact(f);
    setMeasure(f === 'orders' ? 'revenue' : 'revenue');
    setRows('time.year');
    setCols(null);
    setFilters({});
    setPickLevel(f === 'orders' ? 'location.zone' : 'event.category');
    setPickChosen([]);
    setHistory([{ op: 'Start', detail: `${f === 'orders' ? 'Orders' : 'Bookings'} cube` }]);
  };

  const max = useMemo(() => {
    if (!result) return 1;
    if (result.values) return Math.max(1, ...result.values.map((v) => v.value));
    return Math.max(1, ...Object.values(result.matrix ?? {}).flatMap((r) => Object.values(r)));
  }, [result]);
  const fmt = (v: number) => (result?.measure.startsWith('avg') || result?.measure === 'lead_time' ? num(v, 1) : num(v, 0));
  const allLevels = cube?.dimensions.flatMap((d) => d.levels.map((l) => ({ ...l, dim: d.label }))) ?? [];

  return (
    <LabPage
      eyebrow="Data warehouse"
      title="OLAP cube explorer"
      intro="A live cube over the warehouse's fact tables. Click a bar or row to drill down, roll back up the hierarchy, slice or dice on any dimension, and pivot rows and columns."
      concepts={[
        { term: 'OLAP cube', meaning: 'Facts viewed as a multidimensional array: each dimension is an axis, each cell an aggregated measure.' },
        { term: 'Hierarchy', meaning: 'Levels of one dimension from coarse to fine: year → quarter → month → day; city → zone → area.' },
        { term: 'Roll-up', meaning: 'Aggregate to a coarser level (months → quarters) or drop a dimension.' },
        { term: 'Drill-down', meaning: 'Go to a finer level for one member (2026 → its quarters). The reverse of roll-up.' },
        { term: 'Slice', meaning: 'Fix one dimension to a single value, giving a sub-cube with one fewer dimension (zone = Western Suburbs).' },
        { term: 'Dice', meaning: 'Restrict two or more dimensions to sets of values (zones A, B and payment = UPI).' },
        { term: 'Pivot (rotate)', meaning: 'Swap the axes of the view: rows become columns.' },
        { term: 'Additive measures', meaning: 'Sums and counts can be totalled across any dimension; averages cannot, so they show no totals.' },
      ]}
    >
      {(error || query.error) && <ErrorBanner world={W} message={error ?? query.error ?? ''} onDismiss={() => setError(null)} />}
      {!cube ? <Panel world={W}><SkeletonRows world={W} rows={6} /></Panel> : (
        <>
          <Panel world={W}>
            <div className="grid gap-4 md:grid-cols-4">
              <Field world={W} label="Fact table" htmlFor="o-fact">
                <select id="o-fact" className={T.input} value={fact} onChange={(e) => changeFact(e.target.value)}>
                  {Object.entries(catalog!.cubes).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                </select>
              </Field>
              <Field world={W} label="Measure" htmlFor="o-measure">
                <select id="o-measure" className={T.input} value={measure} onChange={(e) => setMeasure(e.target.value)}>
                  {cube.measures.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </Field>
              <Field world={W} label="Rows" htmlFor="o-rows">
                <select id="o-rows" className={T.input} value={rows} onChange={(e) => { setRows(e.target.value); log('Start', `rows = ${levelLabel(e.target.value)}`); }}>
                  {allLevels.map((l) => <option key={l.key} value={l.key} disabled={cols?.split('.')[0] === l.key.split('.')[0]}>{l.dim}: {l.label}</option>)}
                </select>
              </Field>
              <Field world={W} label="Columns (optional)" htmlFor="o-cols">
                <select id="o-cols" className={T.input} value={cols ?? ''} onChange={(e) => { setCols(e.target.value || null); if (e.target.value) log('Add columns', levelLabel(e.target.value)); }}>
                  <option value="">None</option>
                  {allLevels.map((l) => <option key={l.key} value={l.key} disabled={rows.split('.')[0] === l.key.split('.')[0]}>{l.dim}: {l.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" className={T.btnSecondary} onClick={rollUp} disabled={!result?.can_roll_up}><ArrowUpToLine className="h-4 w-4" /> Roll-up{result?.coarser ? ` to ${levelLabel(result.coarser).split(': ')[1]}` : ''}</button>
              <span className={`text-xs ${T.muted}`}>{result?.can_drill ? `Click a ${result.rows_label.toLowerCase()} to drill down to ${levelLabel(result.finer!).split(': ')[1].toLowerCase()}.` : 'Finest level of this hierarchy.'}</span>
              <button type="button" className={`${T.btnSecondary} ml-auto`} onClick={pivot} disabled={!cols}><Repeat2 className="h-4 w-4" /> Pivot</button>
            </div>
            {Object.keys(filters).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(filters).map(([k, v]) => (
                  <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${T.subtle}`}>
                    <strong>{levelLabel(k)}</strong> = {v.join(', ')}
                    <button type="button" aria-label={`Remove ${k} filter`} onClick={() => removeFilter(k)}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </Panel>

          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <Panel world={W} title={result ? `${result.measure_label} by ${result.rows_label.toLowerCase()}${result.cols ? ` × ${result.cols_label?.toLowerCase()}` : ''}` : 'Result'}
              description={result?.total !== undefined && result?.total !== null ? `Total ${fmt(result.total)}` : result && !result.additive ? 'Averages are not additive, so no totals.' : undefined}>
              {loading && !result ? <SkeletonRows world={W} rows={6} /> : result && (
                result.values ? (
                  <>
                    <div style={{ height: Math.min(520, Math.max(220, result.values.length * 26 + 40)) }}>
                      <ResponsiveContainer>
                        <BarChart data={result.values} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                          <CartesianGrid horizontal={false} stroke={GRID} />
                          <XAxis type="number" tick={AXIS} tickFormatter={(v) => num(v, 0)} />
                          <YAxis type="category" dataKey="member" width={140} tick={AXIS} interval={0} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={({ payload }) => payload?.[0] ? (
                            <TipBox title={String(payload[0].payload.member)} rows={[[result.measure_label, fmt(Number(payload[0].value))], ...(result.can_drill ? [['', 'click to drill down'] as [string, string]] : [])]} />
                          ) : null} />
                          <Bar isAnimationActive={false} dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} onClick={(d: { payload?: { member?: string } }) => { const m = d?.payload?.member; if (m) drill(m); }} cursor={result.can_drill ? 'pointer' : 'default'}>
                            {result.values.map((v) => <Cell key={v.member} fill="#2a78d6" />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <table className="mt-4 w-full text-sm">
                      <thead><tr className={`text-left text-xs ${T.muted}`}><th className="py-2 font-medium">{result.rows_label}</th><th className="py-2 text-right font-medium">{result.measure_label}</th>{result.additive && <th className="py-2 text-right font-medium">Share</th>}<th /></tr></thead>
                      <tbody className={`divide-y border-t ${T.hairline} ${T.divide}`}>
                        {result.values.map((v) => (
                          <tr key={v.member} className={T.rowHover}>
                            <td className="py-2">{v.member || '—'}</td>
                            <td className="py-2 text-right tabular-nums">{fmt(v.value)}</td>
                            {result.additive && <td className={`py-2 text-right tabular-nums ${T.muted}`}>{pctOf(v.value / (result.total || 1))}</td>}
                            <td className="py-2 text-right">{result.can_drill && <button type="button" className={`inline-flex items-center gap-1 text-xs ${T.accentText} hover:underline`} onClick={() => drill(v.member)}><ArrowDownToLine className="h-3.5 w-3.5" />Drill</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`text-xs ${T.muted}`}>
                          <th className="py-2 pr-3 text-left font-medium">{result.rows_label} \ {result.cols_label}</th>
                          {result.col_members!.map((c) => <th key={c} className="px-2 py-2 text-right font-medium">{c}</th>)}
                          {result.row_totals && <th className="py-2 pl-2 text-right font-semibold">Total</th>}
                        </tr>
                      </thead>
                      <tbody className={`divide-y border-t ${T.hairline} ${T.divide}`}>
                        {result.row_members.map((r) => (
                          <tr key={r}>
                            <td className="py-1.5 pr-3">
                              {result.can_drill ? <button type="button" className="hover:underline" onClick={() => drill(r)}>{r}</button> : r}
                            </td>
                            {result.col_members!.map((c) => {
                              const v = result.matrix![r]?.[c] ?? 0;
                              return (
                                <td key={c} className="px-1 py-1 text-right tabular-nums">
                                  <span className="block rounded-md px-1.5 py-1" style={{ background: sequentialColor(v / max), color: v / max > 0.55 ? '#fff' : undefined }}>{v ? fmt(v) : '·'}</span>
                                </td>
                              );
                            })}
                            {result.row_totals && <td className="py-1.5 pl-2 text-right font-semibold tabular-nums">{fmt(result.row_totals[r])}</td>}
                          </tr>
                        ))}
                        {result.col_totals && (
                          <tr className="font-semibold">
                            <td className="py-2 pr-3">Total</td>
                            {result.col_members!.map((c) => <td key={c} className="px-2 py-2 text-right tabular-nums">{fmt(result.col_totals![c])}</td>)}
                            <td className="py-2 pl-2 text-right tabular-nums">{fmt(result.total ?? 0)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              )}
              {result && <pre className={`mt-4 overflow-x-auto rounded-xl bg-[#0d0d0d] p-3.5 text-[12px] leading-relaxed text-[#d8e2b5]`}>{result.sql}</pre>}
            </Panel>

            <div className="space-y-6">
              <Panel world={W} title={<span className="inline-flex items-center gap-2"><Scissors className="h-4 w-4" />Slice & dice</span>} description="One value on one dimension slices; several values or dimensions dice.">
                <Field world={W} label="Dimension level" htmlFor="o-pick">
                  <select id="o-pick" className={T.input} value={pickLevel} onChange={(e) => { setPickLevel(e.target.value); setPickChosen([]); }}>
                    {allLevels.map((l) => <option key={l.key} value={l.key}>{l.dim}: {l.label}</option>)}
                  </select>
                </Field>
                <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1 text-sm">
                  {pickMembers.slice(0, 80).map((m) => (
                    <label key={m} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" className={T.checkbox} checked={pickChosen.includes(m)}
                        onChange={() => setPickChosen((c) => (c.includes(m) ? c.filter((x) => x !== m) : [...c, m]))} />
                      {m}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={applyPick} disabled={!pickChosen.length} className={`${T.btnPrimary} mt-3 w-full`}>
                  {pickChosen.length === 1 && !Object.keys(filters).length ? 'Slice' : 'Dice'} on {pickChosen.length || 0} value{pickChosen.length === 1 ? '' : 's'}
                </button>
              </Panel>
              <Panel world={W} title={<span className="inline-flex items-center gap-2"><Columns3 className="h-4 w-4" />Operations</span>} description="What you have done to the cube">
                <ol className="space-y-2">
                  {history.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${OP_TONE[h.op] ?? T.subtle}`}>{h.op}</span>
                      <span className={T.muted}>{h.detail}</span>
                    </li>
                  ))}
                </ol>
                <Reading>Try it: Rows = Time: Year, drill into the year, then a quarter. Add Columns = Location: Zone, then Pivot. Slice Payment = UPI.</Reading>
              </Panel>
            </div>
          </div>
        </>
      )}
    </LabPage>
  );
};

export default OlapLabView;
