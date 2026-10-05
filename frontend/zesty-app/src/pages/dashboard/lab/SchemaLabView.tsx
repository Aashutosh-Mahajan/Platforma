import React, { useState } from 'react';
import { Database, KeyRound, Link2, Play, Sigma } from 'lucide-react';
import { labAPI } from '../../../api/lab';
import { ErrorBanner, Panel, Segmented, SkeletonRows } from '../../../components/dashboard/primitives';
import { useLoad } from '../../../components/dashboard/intelligenceUtils';
import { LabPage, MiniTable, Reading, Stat, StatRow } from './labKit';
import { T, W, num } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Field = { name: string; type: string; kind: 'pk' | 'fk' | 'measure' | 'attribute'; references: string | null };
type Table = { name: string; role: 'fact' | 'dimension' | 'cuboid'; rows: number; grain: string; scd: string; doc: string; fields: Field[] };

const KIND_ICON = { pk: KeyRound, fk: Link2, measure: Sigma, attribute: null } as const;
const ROLE_TONE: Record<Table['role'], string> = {
  fact: 'bg-[#141414] text-white',
  dimension: 'bg-[#e8ecd9] text-[#3d4a22]',
  cuboid: 'bg-[#f2e6d6] text-[#7a4512]',
};

const TableCard: React.FC<{ table?: Table; compact?: boolean; highlight?: boolean }> = ({ table, compact, highlight }) => {
  if (!table) return null;
  const fields = compact ? table.fields.filter((f) => f.kind !== 'attribute').slice(0, 9) : table.fields;
  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl border bg-white ${highlight ? 'border-[#141414] shadow-md' : T.hairline}`}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 ${ROLE_TONE[table.role]}`}>
        <span className="truncate font-mono text-[13px] font-semibold">{table.name}</span>
        <span className="shrink-0 text-[11px] opacity-75">{num(table.rows, 0)} rows</span>
      </div>
      <ul className="divide-y divide-[#f0ede5] px-3 py-1 font-mono text-[12px]">
        {fields.map((f) => {
          const Icon = KIND_ICON[f.kind];
          return (
            <li key={f.name} className="flex items-center gap-1.5 py-1">
              <span className="w-3.5">{Icon && <Icon className={`h-3 w-3 ${f.kind === 'measure' ? 'text-[#c4621a]' : T.accentText}`} aria-label={f.kind} />}</span>
              <span className="truncate">{f.name}</span>
              {f.references && <span className={`ml-auto truncate text-[11px] ${T.faint}`}>→ {f.references}</span>}
            </li>
          );
        })}
        {compact && table.fields.length > fields.length && <li className={`py-1 text-[11px] ${T.faint}`}>+ {table.fields.length - fields.length} attributes</li>}
      </ul>
    </div>
  );
};

type Pattern = 'star' | 'snowflake' | 'constellation';

const SchemaLabView: React.FC = () => {
  const state = useLoad(() => labAPI.schema(), []);
  const [pattern, setPattern] = useState<Pattern>('star');
  const [picked, setPicked] = useState<string>('fact_order');
  const [race, setRace] = useState<any>(null);
  const [racing, setRacing] = useState(false);
  const s = state.data;
  const by: Record<string, Table> = Object.fromEntries((s?.tables ?? []).map((t: Table) => [t.name, t]));

  const runRace = async () => {
    setRacing(true);
    try { setRace(await labAPI.oltpVsOlap()); } finally { setRacing(false); }
  };

  return (
    <LabPage
      eyebrow="Data warehouse"
      title="Warehouse schema & data marts"
      intro="Platforma's operational database (OLTP) is copied nightly by ETL into a separate warehouse (OLAP) built from fact and dimension tables. Read live from the warehouse models."
      concepts={[
        { term: 'OLTP vs OLAP', meaning: 'OLTP runs the app: many small writes, normalised tables. OLAP answers questions: big reads over history, denormalised for aggregation, in its own database.' },
        { term: 'Fact table', meaning: 'Measurable events at a stated grain (one order, one ticket) holding measures and foreign keys to dimensions.' },
        { term: 'Dimension table', meaning: 'The context for a fact: who, what, where, when. Holds descriptive attributes and hierarchies (area → zone → city).' },
        { term: 'Measures', meaning: 'Numeric, usually additive facts: order_total, item_count, seats_booked. Averages and ranks are non-additive.' },
        { term: 'Surrogate keys', meaning: 'Warehouse-owned integer keys (customer_key). Natural ids from the app are kept as attributes; SCD 2 needs surrogates to version rows.' },
        { term: 'Star schema', meaning: 'One fact table in the middle, every dimension one join away. Fast and simple to query.' },
        { term: 'Snowflake schema', meaning: 'Dimensions normalised into sub-dimensions (dim_location → dim_zone). Less repetition, more joins.' },
        { term: 'Fact constellation (galaxy)', meaning: 'Several fact tables sharing conformed dimensions (date, customer, payment), so food and events can be analysed together.' },
        { term: 'Data mart', meaning: 'A subject-specific slice of the warehouse for one team: here a Zesty (food) mart and an Eventra (events) mart.' },
        { term: 'SCD (slowly changing dimension)', meaning: 'Type 0 never changes, type 1 overwrites, type 2 keeps history with valid_from / valid_to / is_current.' },
        { term: 'ETL', meaning: 'Extract from the app database, Transform (clean, key, band), Load dimensions then facts; plus aggregation into cuboids.' },
      ]}
    >
      {state.error && <ErrorBanner world={W} message={state.error} onRetry={state.reload} />}
      {!s ? <Panel world={W}><SkeletonRows world={W} rows={8} /></Panel> : (
        <>
          <StatRow>
            <Stat label="Fact tables" value={s.tables.filter((t: Table) => t.role === 'fact').length} />
            <Stat label="Dimension tables" value={s.tables.filter((t: Table) => t.role === 'dimension').length} />
            <Stat label="Cuboids (pre-aggregates)" value={s.tables.filter((t: Table) => t.role === 'cuboid').length} />
            <Stat label="Warehouse rows" value={num(s.tables.reduce((a: number, t: Table) => a + t.rows, 0), 0)} strong />
          </StatRow>

          <Panel world={W} title="Schema patterns" description={s.patterns[pattern].note}
            action={<Segmented world={W} label="Schema" value={pattern} onChange={setPattern}
              options={[{ value: 'star', label: 'Star' }, { value: 'snowflake', label: 'Snowflake' }, { value: 'constellation', label: 'Fact constellation' }]} />}>
            {pattern === 'star' && (
              <div className="grid items-start gap-3 md:grid-cols-3">
                <div className="space-y-3">{s.patterns.star.dimensions.slice(0, 4).map((d: string) => <TableCard key={d} table={by[d]} compact />)}</div>
                <div className="md:pt-16"><TableCard table={by.fact_order} highlight /></div>
                <div className="space-y-3">{s.patterns.star.dimensions.slice(4).map((d: string) => <TableCard key={d} table={by[d]} compact />)}</div>
              </div>
            )}
            {pattern === 'snowflake' && (
              <div className="grid items-start gap-3 md:grid-cols-3">
                {s.patterns.snowflake.chain.map((name: string, i: number) => (
                  <div key={name} className="relative">
                    <TableCard table={by[name]} highlight={i === 0} compact={i === 0} />
                    {i < 2 && <span className={`absolute -right-3 top-6 hidden text-lg md:block ${T.accentText}`} aria-hidden="true">→</span>}
                  </div>
                ))}
              </div>
            )}
            {pattern === 'constellation' && (
              <>
                <MiniTable rows={Object.entries(s.patterns.constellation.shared_dimensions) as [string, string[]][]} rowKey={([d]) => d} cols={[
                  { key: 'd', label: 'Shared (conformed) dimension', render: ([d]) => <span className="font-mono">{d}</span> },
                  { key: 'f', label: 'Used by fact tables', render: ([, fs]) => <span className="font-mono text-xs">{fs.join(', ')}</span> },
                  { key: 'n', label: 'Facts', align: 'right', render: ([, fs]) => fs.length },
                ]} />
                <Reading>Because fact_order and fact_booking both point at the same dim_customer and dim_date rows, one query can compare a customer's food orders and event bookings on the same calendar: the galaxy schema at work.</Reading>
              </>
            )}
          </Panel>

          <div className="grid gap-6 xl:grid-cols-3">
            {s.marts.map((m: any) => (
              <Panel key={m.name} world={W} title={m.name} description={`${m.tables.length} tables · ${num(m.rows, 0)} rows`}>
                <div className="flex flex-wrap gap-1.5">
                  {m.tables.map((t: string) => (
                    <button key={t} type="button" onClick={() => setPicked(t)}
                      className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${by[t] ? ROLE_TONE[by[t].role] : T.subtle} ${picked === t ? 'ring-2 ring-[#6f7f42]' : ''}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Panel>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <Panel world={W} title={<span className="font-mono">{picked}</span>} description={by[picked] ? `${by[picked].grain || by[picked].doc}${by[picked].scd ? ` · ${by[picked].scd}` : ''}` : ''}>
              <TableCard table={by[picked]} />
              <div className={`mt-3 flex flex-wrap gap-4 text-xs ${T.muted}`}>
                <span className="inline-flex items-center gap-1"><KeyRound className="h-3 w-3" /> primary key</span>
                <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> foreign key</span>
                <span className="inline-flex items-center gap-1"><Sigma className="h-3 w-3 text-[#c4621a]" /> measure</span>
              </div>
            </Panel>
            <Panel world={W} title="All warehouse tables" flush>
              <div className="px-5 pb-5 pt-2 sm:px-6">
                <MiniTable rows={s.tables as Table[]} rowKey={(t) => t.name} dense cols={[
                  { key: 'n', label: 'Table', render: (t) => <button type="button" onClick={() => setPicked(t.name)} className="font-mono text-[12px] hover:underline">{t.name}</button> },
                  { key: 'r', label: 'Role', render: (t) => <span className={`rounded-full px-2 py-0.5 text-[11px] ${ROLE_TONE[t.role]}`}>{t.role}</span> },
                  { key: 'g', label: 'Grain / SCD', render: (t) => <span className={`text-xs ${T.muted}`}>{t.grain || t.scd || '—'}</span> },
                  { key: 'm', label: 'Measures', align: 'right', render: (t) => t.fields.filter((f) => f.kind === 'measure').length || '—' },
                  { key: 'c', label: 'Rows', align: 'right', render: (t) => num(t.rows, 0) },
                ]} />
              </div>
            </Panel>
          </div>

          <Panel world={W} title="ETL pipeline" description={`${num(s.etl.quarantined, 0)} rows quarantined by validation rules`}>
            <ol className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {s.etl.stages.map((st: any, i: number) => (
                <li key={st.stage} className={`rounded-2xl p-3.5 ${T.subtle}`}>
                  <p className={`text-xs font-semibold ${T.accentText}`}>{i + 1}. {st.stage}</p>
                  <p className={`mt-1 text-xs ${T.muted}`}>{st.detail}</p>
                </li>
              ))}
            </ol>
            <div className="mt-5">
              <MiniTable rows={s.etl.tables} max={20} dense rowKey={(r: any) => r.table_name} cols={[
                { key: 't', label: 'Loaded table', render: (r: any) => <span className="font-mono text-[12px]">{r.table_name}</span> },
                { key: 'rd', label: 'Read', align: 'right', render: (r: any) => num(r.read, 0) },
                { key: 'l', label: 'Loaded', align: 'right', render: (r: any) => num(r.loaded, 0) },
                { key: 'rj', label: 'Rejected', align: 'right', render: (r: any) => num(r.rejected, 0) },
                { key: 'ru', label: 'Runs', align: 'right', render: (r: any) => r.runs },
              ]} />
            </div>
          </Panel>

          <Panel world={W} title="OLTP vs OLAP: the same question three ways" description="Revenue by area, per month"
            action={<button type="button" onClick={runRace} disabled={racing} className={T.btnPrimary}><Play className="h-4 w-4" />{racing ? 'Running…' : race ? 'Run again' : 'Run the comparison'}</button>}>
            {race ? (
              <>
                <MiniTable rows={race.runs} rowKey={(r: any) => r.source} cols={[
                  { key: 's', label: 'Source', render: (r: any) => <span className="font-medium">{r.source}</span> },
                  { key: 't', label: 'Tables', render: (r: any) => <span className="font-mono text-[12px]">{r.tables}</span> },
                  { key: 'rs', label: 'Rows scanned', align: 'right', render: (r: any) => num(r.rows_scanned, 0) },
                  { key: 'rr', label: 'Result rows', align: 'right', render: (r: any) => num(r.result_rows, 0) },
                  { key: 'ms', label: 'Time', align: 'right', render: (r: any) => `${num(r.ms, 0)} ms` },
                ]} />
                <Reading>{race.runs.map((r: any) => r.note).join(' ')}</Reading>
              </>
            ) : (
              <p className={`flex items-center gap-2 text-sm ${T.muted}`}><Database className="h-4 w-4" /> Runs the query live against the app database, the star schema and a cuboid, and times each.</p>
            )}
          </Panel>
        </>
      )}
    </LabPage>
  );
};

export default SchemaLabView;
