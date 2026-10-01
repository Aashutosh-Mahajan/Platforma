import React, { useEffect, useMemo, useState } from 'react';
import { Download, Play, Table2 } from 'lucide-react';
import { olapAPI, type OlapCuboid, type OlapPivot, type OlapRows } from '../../../api/warehouse';
import { AreaChart, EmptyState, ErrorBanner, Field, Panel, RankedBars, SkeletonRows } from '../../../components/dashboard/primitives';
import { VerticalSwitch } from '../../../components/dashboard/intelligence';
import { apiErrorMessage, useLoad, type Vertical } from '../../../components/dashboard/intelligenceUtils';
import { formatINR, formatInt, humanize, themes, type DashWorld } from '../../../components/dashboard/theme';
import { downloadCsv } from '../reports/shared';

const DATASET_NAMES: Record<string, string> = {
  cb_daily_outlet_revenue: 'Restaurant sales by day',
  cb_daily_item_performance: 'Dish sales by day',
  cb_monthly_customer_activity: 'Customer activity by month',
  cb_daily_event_sales: 'Ticket sales by day',
  cb_hourly_demand_profile: 'Demand by time of day',
};

const isMoney = (measure: string) => /revenue|spend/.test(measure);

/**
 * Slice-and-dice over the warehouse cuboids: pick a data set, a measure and
 * up to two dimensions (two = a pivot table), optionally pinned to one value.
 * Partners get the same tool; the API confines them to their own rows.
 */
/**
 * `vertical` (admins) narrows the data sets to Zesty or Eventra; data sets
 * that span both verticals are then filtered by their 'domain' dimension.
 */
const ExplorerView: React.FC<{
  world: DashWorld;
  intro?: string;
  vertical?: Vertical;
  onVerticalChange?: (v: Vertical) => void;
}> = ({ world, intro, vertical = 'all', onVerticalChange }) => {
  const t = themes[world];
  const catalog = useLoad(() => olapAPI.catalog(), []);
  const [cuboidName, setCuboidName] = useState('');
  const [measure, setMeasure] = useState('');
  const [rowDim, setRowDim] = useState('');
  const [colDim, setColDim] = useState('');
  const [filterDim, setFilterDim] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [result, setResult] = useState<OlapRows | OlapPivot | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (catalog.data?.cuboids ?? []).filter((c) => vertical === 'all' || c.vertical === 'both' || c.vertical === vertical),
    [catalog.data, vertical]
  );
  const cuboid: OlapCuboid | undefined = visible.find((c) => c.name === cuboidName);

  useEffect(() => {
    if (visible.length && !visible.some((c) => c.name === cuboidName)) setCuboidName(visible[0].name);
  }, [visible, cuboidName]);

  useEffect(() => {
    if (!cuboid) return;
    setMeasure(cuboid.measures[0]?.key ?? '');
    const preferred = cuboid.dimensions.find((d) => d.key !== 'date') ?? cuboid.dimensions[0];
    setRowDim(preferred?.key ?? '');
    setColDim('');
    setFilterDim('');
    setFilterValue('');
    setResult(null);
  }, [cuboid?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    if (!measure || !rowDim) return;
    setRunning(true);
    setError(null);
    const filters: Record<string, string[]> = filterDim && filterValue.trim()
      ? { [filterDim]: filterValue.split(',').map((v) => v.trim()).filter(Boolean) }
      : {};
    if (cuboid?.vertical === 'both' && vertical !== 'all' && !filters.domain) filters.domain = [vertical];
    try {
      setResult(colDim ? await olapAPI.pivot(measure, rowDim, colDim, filters) : await olapAPI.breakdown(measure, [rowDim], filters));
    } catch (err) {
      setError(apiErrorMessage(err, 'That query could not run.'));
    } finally {
      setRunning(false);
    }
  };

  const format = (v: number) => (isMoney(measure) ? formatINR(v) : formatInt(v));
  const label = (key: string) => cuboid?.dimensions.find((d) => d.key === key)?.label ?? key;
  const measureLabel = cuboid?.measures.find((m) => m.key === measure)?.label ?? measure;

  const flat = result && 'rows' in result ? result : null;
  const pivot = result && 'matrix' in result ? result : null;
  const sortedRows = useMemo(() => {
    if (!flat) return [];
    const rows = [...flat.rows];
    if (rowDim === 'date' || rowDim === 'month') return rows.sort((a, b) => String(a[rowDim]).localeCompare(String(b[rowDim])));
    return rows.sort((a, b) => Number(b[measure] ?? 0) - Number(a[measure] ?? 0));
  }, [flat, rowDim, measure]);
  const nameOf = (row: Record<string, unknown>) =>
    rowDim === 'domain' ? humanize(String(row.domain ?? '—')) : String(row[`${rowDim}_label`] ?? row[rowDim] ?? '—');

  const exportCsv = () => {
    if (flat) downloadCsv(`warehouse-${measure}-by-${rowDim}.csv`, sortedRows.map((r) => ({ [rowDim]: nameOf(r), [measure]: r[measure] })));
    if (pivot) {
      downloadCsv(`warehouse-${measure}-${rowDim}-by-${colDim}.csv`, pivot.row_values.map((rv) => ({
        [rowDim]: pivot.row_labels?.[rv] ?? rv,
        ...Object.fromEntries(pivot.column_values.map((cv) => [pivot.column_labels?.[cv] ?? cv, pivot.matrix[rv]?.[cv] ?? 0])),
      })));
    }
  };

  if (catalog.loading && !catalog.data) {
    return <Panel world={world}><SkeletonRows world={world} rows={5} /></Panel>;
  }
  if (catalog.error) return <ErrorBanner world={world} message={catalog.error} onRetry={catalog.reload} />;

  const select = (id: string, value: string, onChange: (v: string) => void, options: { key: string; label: string }[], allowNone?: string) => (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={t.input}>
      {allowNone !== undefined && <option value="">{allowNone}</option>}
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      <Panel
        world={world}
        action={onVerticalChange ? <VerticalSwitch world={world} value={vertical} onChange={(v) => { onVerticalChange(v); setResult(null); }} /> : undefined}
        title="Explore the warehouse"
        description={intro ?? 'Pick a data set, what to measure and how to break it down. Add a second dimension for a pivot table.'}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field world={world} label="Data set" htmlFor="x-cuboid">
            {select('x-cuboid', cuboidName, setCuboidName, visible.map((c) => ({ key: c.name, label: DATASET_NAMES[c.name] ?? c.name })))}
          </Field>
          <Field world={world} label="Measure" htmlFor="x-measure">
            {select('x-measure', measure, setMeasure, cuboid?.measures ?? [])}
          </Field>
          <Field world={world} label="Break down by" htmlFor="x-row">
            {select('x-row', rowDim, setRowDim, cuboid?.dimensions ?? [])}
          </Field>
          <Field world={world} label="Across (pivot)" htmlFor="x-col">
            {select('x-col', colDim, setColDim, (cuboid?.dimensions ?? []).filter((d) => d.key !== rowDim), 'Nothing')}
          </Field>
          <Field world={world} label="Only where" htmlFor="x-fdim">
            {select('x-fdim', filterDim, setFilterDim, cuboid?.dimensions ?? [], 'No filter')}
          </Field>
          <Field world={world} label="equals (comma-separated)" htmlFor="x-fval">
            <input id="x-fval" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} disabled={!filterDim}
              placeholder={filterDim === 'date' ? '2026-09-01' : filterDim ? 'e.g. 12, 15' : ''} className={t.input} />
          </Field>
          <div className="flex items-end gap-2 xl:col-span-2">
            <button type="button" onClick={() => void run()} disabled={running || !measure || !rowDim} className={`${t.btnPrimary} !py-2.5`}>
              <Play className="h-4 w-4" aria-hidden="true" /> {running ? 'Running…' : 'Run'}
            </button>
            {result && (
              <button type="button" onClick={exportCsv} className={`${t.btnSecondary} !py-2.5`}>
                <Download className="h-4 w-4" aria-hidden="true" /> CSV
              </button>
            )}
          </div>
        </div>
        {catalog.data?.scoped_to && (
          <p className={`mt-4 text-xs ${t.faint}`}>Showing only your own {catalog.data.scoped_to === 'restaurant' ? 'restaurants' : 'events'}.</p>
        )}
      </Panel>

      {error && <ErrorBanner world={world} message={error} onDismiss={() => setError(null)} />}

      {!result && !running && (
        <Panel world={world}>
          <EmptyState world={world} compact icon={Table2} title="Run a query" body="Results appear here as a chart and a table you can download." />
        </Panel>
      )}

      {flat && (
        flat.rows.length === 0 ? (
          <Panel world={world}>
            <EmptyState world={world} compact icon={Table2} title="No rows"
              body={flat.source_cuboid === 'unavailable' ? 'This measure can’t be broken down that way.' : 'Nothing matches that query.'} />
          </Panel>
        ) : (
          <div className="grid gap-6 xl:grid-cols-5">
            <Panel world={world} className="xl:col-span-2" title={`${measureLabel} by ${label(rowDim).toLowerCase()}`}
              description={`${formatInt(flat.rows.length)} rows · from ${flat.source_cuboid}`}>
              {rowDim === 'date' || rowDim === 'month' ? (
                <AreaChart world={world} ariaLabel={`${measureLabel} over time`} format={format}
                  data={sortedRows.map((r) => ({ label: String(r[rowDim]), value: Number(r[measure] ?? 0) }))} />
              ) : (
                <RankedBars world={world} format={format}
                  data={sortedRows.slice(0, 10).map((r) => ({ label: nameOf(r), value: Number(r[measure] ?? 0) }))} />
              )}
            </Panel>
            <Panel world={world} flush className="xl:col-span-3" title="Rows">
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className={`sticky top-0 ${t.dark ? 'bg-[#141414]' : 'bg-white'}`}>
                    <tr className={`text-left text-xs ${t.muted}`}>
                      <th className="py-3 pl-6 pr-3 font-medium">{label(rowDim)}</th>
                      <th className="py-3 pl-3 pr-6 text-right font-medium">{measureLabel}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y border-t ${t.hairline} ${t.divide}`}>
                    {sortedRows.slice(0, 300).map((r) => (
                      <tr key={String(r[rowDim])} className={t.rowHover}>
                        <td className="max-w-0 truncate py-2.5 pl-6 pr-3">{nameOf(r)}</td>
                        <td className="whitespace-nowrap py-2.5 pl-3 pr-6 text-right tabular-nums">{format(Number(r[measure] ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )
      )}

      {pivot && (
        <Panel world={world} flush title={`${measureLabel}: ${label(rowDim).toLowerCase()} × ${label(colDim).toLowerCase()}`}
          description={`${pivot.row_values.length} × ${pivot.column_values.length} · from ${pivot.source_cuboid}`}>
          {pivot.row_values.length === 0 ? (
            <p className={`px-6 py-10 text-center text-sm ${t.muted}`}>Nothing matches that query.</p>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className={`sticky top-0 ${t.dark ? 'bg-[#141414]' : 'bg-white'}`}>
                  <tr className={`text-left text-xs ${t.muted}`}>
                    <th className="py-3 pl-6 pr-3 font-medium">{label(rowDim)}</th>
                    {pivot.column_values.slice(0, 16).map((cv) => (
                      <th key={cv} className="px-3 py-3 text-right font-medium">{pivot.column_labels?.[cv] ?? cv}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y border-t ${t.hairline} ${t.divide}`}>
                  {pivot.row_values.slice(0, 200).map((rv) => (
                    <tr key={rv} className={t.rowHover}>
                      <td className="py-2.5 pl-6 pr-3 font-medium">{pivot.row_labels?.[rv] ?? rv}</td>
                      {pivot.column_values.slice(0, 16).map((cv) => (
                        <td key={cv} className="px-3 py-2.5 text-right tabular-nums">
                          {pivot.matrix[rv]?.[cv] ? format(Number(pivot.matrix[rv][cv])) : <span className={t.faint}>·</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
};

export default ExplorerView;
