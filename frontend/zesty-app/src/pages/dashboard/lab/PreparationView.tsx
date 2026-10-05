import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { labAPI } from '../../../api/lab';
import { Panel } from '../../../components/dashboard/primitives';
import { apiErrorMessage } from '../../../components/dashboard/intelligenceUtils';
import { ArtifactGate, LabPage, MiniTable, Reading, Stat, StatRow } from './labKit';
import { T, W, fixed, num, pctOf, useArtifact } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

const PreparationView: React.FC = () => {
  const state = useArtifact<any>('lab_preprocessing');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (key: string, format: 'csv' | 'arff') => {
    setBusy(`${key}.${format}`);
    setError(null);
    try { await labAPI.download(key, format); } catch (e) { setError(apiErrorMessage(e, 'Export failed.')); } finally { setBusy(null); }
  };

  return (
    <LabPage
      eyebrow="Analytics"
      title="Data preparation"
      intro="How raw platform data becomes model-ready: cleaning in the ETL, missing values, duplicates, outliers, encoding, scaling and feature selection. Every model in the console is trained on data prepared this way."
      model={state.data?.model}
      concepts={[
        { term: 'Data cleaning', meaning: 'Validation rules in the ETL reject bad rows (negative totals, missing keys) into a quarantine table with the rule that failed.' },
        { term: 'Missing values', meaning: 'Gaps are counted per attribute and filled (imputed) with a sensible value such as a group median, or the row is dropped.' },
        { term: 'Duplicates', meaning: 'The same record loaded twice. The warehouse upserts on natural keys, so a re-run never duplicates a fact.' },
        { term: 'Outliers', meaning: 'Values beyond 1.5 × IQR from the quartiles; capped (winsorised) so they do not dominate a model.' },
        { term: 'Encoding', meaning: 'Turning categories into numbers: one-hot for unordered (payment method), label/ordinal for ordered (price band).' },
        { term: 'Normalisation / standardisation', meaning: 'Min-max scaling maps a feature to [0, 1]; z-score standardisation to mean 0 and standard deviation 1.' },
        { term: 'Feature selection', meaning: 'Keeping the attributes that carry information: variance threshold, correlation with the target, mutual information, chi-square.' },
        { term: 'WEKA / R', meaning: 'The prepared datasets download as ARFF (WEKA) or CSV (R, Excel) below.' },
      ]}
    >
      <ArtifactGate state={state} what="data preparation report">
        {(d) => (
          <>
            <ol className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
              {d.steps.map((s: any, i: number) => (
                <li key={s.step} className={`rounded-2xl p-3.5 ${T.subtle}`}>
                  <p className={`text-xs font-semibold ${T.accentText}`}>{i + 1}. {s.step}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{num(s.count, 0)}</p>
                  <p className={`text-[11px] ${T.muted}`}>{s.detail}</p>
                </li>
              ))}
            </ol>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel world={W} title="Cleaning in the ETL" description="Rows rejected by validation rules, and the latest quality checks">
                {d.quarantine.length ? (
                  <MiniTable rows={d.quarantine} dense rowKey={(r: any) => `${r.table_name}${r.violated_rule}`} cols={[
                    { key: 't', label: 'Table', render: (r: any) => <span className="font-mono text-[12px]">{r.table_name}</span> },
                    { key: 'r', label: 'Rule broken', render: (r: any) => r.violated_rule },
                    { key: 'n', label: 'Rows', align: 'right', render: (r: any) => num(r.n, 0) },
                  ]} />
                ) : <p className={`text-sm ${T.muted}`}>No rows were quarantined in the latest loads.</p>}
                <h3 className="mb-2 mt-5 text-sm font-semibold">Quality checks</h3>
                <MiniTable rows={d.quality_checks} dense rowKey={(r: any) => `${r.check_name}${r.table_name}`} cols={[
                  { key: 'c', label: 'Check', render: (r: any) => r.check_name },
                  { key: 't', label: 'Table', render: (r: any) => <span className="font-mono text-[11px]">{r.table_name}</span> },
                  { key: 's', label: 'Result', render: (r: any) => <span className={r.status === 'pass' ? 'text-emerald-700' : r.status === 'warn' ? 'text-amber-700' : 'text-rose-600'}>{r.status}</span> },
                ]} />
              </Panel>
              <Panel world={W} title="Missing values" description="In the order dataset used for modelling">
                <MiniTable rows={d.missing} dense rowKey={(r: any) => r.column} cols={[
                  { key: 'c', label: 'Attribute', render: (r: any) => <span className="font-mono text-[12px]">{r.column}</span> },
                  { key: 'm', label: 'Missing', align: 'right', render: (r: any) => num(r.missing, 0) },
                  { key: 'p', label: 'Share', align: 'right', render: (r: any) => pctOf(r.pct) },
                ]} />
                <Reading>{d.imputation.strategy} Missing delivery times: {num(d.imputation.missing_before, 0)} → {num(d.imputation.missing_after, 0)}; mean {num(d.imputation.mean_before, 1)} → {num(d.imputation.mean_after, 1)} min.</Reading>
                <StatRow cols={3}>
                  <Stat label="Natural-key duplicates" value={num(d.duplicates.natural_key_duplicates, 0)} note={d.duplicates.key.join(', ')} />
                  <Stat label="Duplicate order ids" value={num(d.duplicates.order_id_duplicates, 0)} />
                  <Stat label="Orders capped (IQR)" value={num(d.outliers.rows_capped, 0)} note={`above Rs ${num(d.outliers.upper_fence, 0)}`} />
                </StatRow>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel world={W} title="Outlier capping" description="Order value, IQR rule">
                <MiniTable rows={[['Before', d.outliers.max_before, d.outliers.std_before], ['After capping', d.outliers.max_after, d.outliers.std_after]] as [string, number, number][]} rowKey={(r) => r[0]} cols={[
                  { key: 's', label: '', render: (r) => r[0] },
                  { key: 'm', label: 'Maximum', align: 'right', render: (r) => `Rs ${num(r[1], 0)}` },
                  { key: 'sd', label: 'Std deviation', align: 'right', render: (r) => `Rs ${num(r[2], 1)}` },
                ]} />
              </Panel>
              <Panel world={W} title="Encoding" description="Categorical attributes turned into numbers">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className={`mb-1 text-xs font-semibold ${T.muted}`}>Label encoding: part of day</p>
                    <p className="font-mono text-[12px]">{Object.entries(d.encoding.label).map(([k, v]) => `${k}=${v}`).join(', ')}</p>
                    <p className={`mb-1 mt-3 text-xs font-semibold ${T.muted}`}>Ordinal encoding: price band</p>
                    <p className="font-mono text-[12px]">{Object.entries(d.encoding.ordinal).map(([k, v]) => `${k}=${v}`).join(' < ')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <p className={`mb-1 text-xs font-semibold ${T.muted}`}>One-hot: payment method and zone</p>
                    <table className="font-mono text-[11px]">
                      <thead><tr>{d.encoding.one_hot.columns.map((c: string) => <th key={c} className="px-1 font-normal [writing-mode:vertical-rl]">{c}</th>)}</tr></thead>
                      <tbody>{d.encoding.one_hot.rows.map((r: number[], i: number) => <tr key={i}>{r.map((v, j) => <td key={j} className={`px-1 text-center ${v ? 'font-bold' : T.faint}`}>{v}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              </Panel>
            </div>

            <Panel world={W} title="Scaling RFM features" description={d.normalisation.why}>
              <MiniTable rows={['recency', 'frequency', 'monetary']} rowKey={(c) => c} cols={[
                { key: 'c', label: 'Feature', render: (c) => <span className="font-medium">{c}</span> },
                ...(['raw', 'minmax', 'zscore'] as const).flatMap((s) => [
                  { key: `${s}r`, label: `${s === 'raw' ? 'Raw' : s === 'minmax' ? 'Min-max' : 'Z-score'} range`, align: 'right' as const,
                    render: (c: string) => `${num(d.normalisation[s][c].min, 2)} – ${num(d.normalisation[s][c].max, 2)}` },
                  { key: `${s}m`, label: 'mean ± sd', align: 'right' as const,
                    render: (c: string) => `${num(d.normalisation[s][c].mean, 2)} ± ${num(d.normalisation[s][c].std, 2)}` },
                ]),
              ]} />
            </Panel>

            {d.feature_selection && (
              <Panel world={W} title="Feature selection" description={`Target: ${d.feature_selection.target}. ${num(d.feature_selection.rows, 0)} customers, ${pctOf(d.feature_selection.positive_rate)} positive.`}>
                <MiniTable rows={d.feature_selection.table} rowKey={(r: any) => r.feature} cols={[
                  { key: 'f', label: 'Feature', render: (r: any) => <span className={d.feature_selection.selected.includes(r.feature) ? 'font-semibold' : ''}>{r.label}</span> },
                  { key: 'v', label: 'Variance kept', align: 'right', render: (r: any) => (r.kept_by_variance ? 'yes' : 'no') },
                  { key: 'c', label: 'Corr. with target', align: 'right', render: (r: any) => fixed(r.corr_with_target, 3) },
                  { key: 'm', label: 'Mutual information', align: 'right', render: (r: any) => fixed(r.mutual_info, 4) },
                  { key: 'x', label: 'Chi-square', align: 'right', render: (r: any) => num(r.chi2, 1) },
                  { key: 'p', label: 'p', align: 'right', render: (r: any) => (r.chi2_p < 0.0001 ? '< 0.0001' : fixed(r.chi2_p, 4)) },
                ]} />
                <Reading>Selected (top six by mutual information): {d.feature_selection.selected.join(', ')}.</Reading>
              </Panel>
            )}

            <Panel world={W} title="Export for WEKA or R" description="Prepared datasets, straight from the warehouse">
              {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
              <ul className={`divide-y ${T.divide}`}>
                {d.exports.map((e: any) => (
                  <li key={e.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="font-medium">{e.label}</span>
                    <span className="flex gap-2">
                      {(['csv', 'arff'] as const).map((f) => (
                        <button key={f} type="button" className={T.btnSecondary} disabled={busy !== null} onClick={() => download(e.key, f)}>
                          <Download className="h-4 w-4" /> {busy === `${e.key}.${f}` ? 'Preparing…' : f.toUpperCase()}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        )}
      </ArtifactGate>
    </LabPage>
  );
};

export default PreparationView;
