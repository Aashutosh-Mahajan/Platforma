import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Field, Panel, Segmented } from '../../../components/dashboard/primitives';
import { ArtifactGate, LabPage, MiniTable, Reading, Stat, StatRow, Swatch, TipBox } from './labKit';
import { W, AXIS, GRID, T, fixed, num, useArtifact } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MetricsTable: React.FC<{ train: any; test: any }> = ({ train, test }) => (
  <MiniTable rows={[['Train', train], ['Test', test]] as [string, any][]} rowKey={([k]) => k} cols={[
    { key: 's', label: 'Split', render: ([k, m]) => <span className="font-medium">{k} <span className={T.faint}>(n={num(m.n, 0)})</span></span> },
    { key: 'mse', label: 'MSE', align: 'right', render: ([, m]) => num(m.mse, 2) },
    { key: 'rmse', label: 'RMSE', align: 'right', render: ([, m]) => num(m.rmse, 2) },
    { key: 'mae', label: 'MAE', align: 'right', render: ([, m]) => num(m.mae, 2) },
    { key: 'r2', label: 'R²', align: 'right', render: ([, m]) => fixed(m.r2, 4) },
    { key: 'ar2', label: 'Adjusted R²', align: 'right', render: ([, m]) => fixed(m.adj_r2, 4) },
  ]} />
);

const Coefficients: React.FC<{ rows: any[]; labels?: Record<string, string> }> = ({ rows, labels = {} }) => (
  <MiniTable rows={rows} rowKey={(r) => r.term} cols={[
    { key: 't', label: 'Term', render: (r) => <span className="font-medium">{labels[r.term] ?? r.term}</span> },
    { key: 'b', label: 'Coefficient (b)', align: 'right', render: (r) => fixed(r.coef, 4) },
    { key: 'se', label: 'Std. error', align: 'right', render: (r) => fixed(r.std_error, 4) },
    { key: 'tv', label: 't', align: 'right', render: (r) => fixed(r.t, 2) },
    { key: 'p', label: 'p-value', align: 'right', render: (r) => (r.p < 0.0001 ? '< 0.0001' : fixed(r.p, 4)) },
    { key: 'beta', label: 'Standardised β', align: 'right', render: (r) => (r.standardized === null ? '—' : fixed(r.standardized, 3)) },
  ]} />
);

const Check: React.FC<{ ok: boolean; title: string; detail: string }> = ({ ok, title, detail }) => (
  <li className="flex gap-2.5">
    {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="holds" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="violated" />}
    <span><span className="font-medium">{title}</span> <span className={T.muted}>{detail}</span></span>
  </li>
);

const Assumptions: React.FC<{ a: any; vif?: any[] }> = ({ a, vif }) => (
  <ul className="space-y-2.5 text-sm">
    <Check ok={Math.abs(a.residual_mean) < 0.5} title="Linearity / zero-mean errors:" detail={`residual mean ${fixed(a.residual_mean, 3)} (should be ≈ 0); check the residual plot for curves.`} />
    <Check ok={a.independence_ok} title="Independence:" detail={`Durbin-Watson ${fixed(a.durbin_watson, 2)} (≈ 2 means no autocorrelation; 1.5–2.5 is fine).`} />
    <Check ok={a.breusch_pagan.homoscedastic} title="Equal variance (homoscedasticity):" detail={`Breusch-Pagan LM ${num(a.breusch_pagan.lm, 1)}, p = ${fixed(a.breusch_pagan.p, 4)}. ${a.breusch_pagan.homoscedastic ? 'No evidence the spread changes.' : 'The spread of errors changes with the predictors.'}`} />
    <Check ok={a.jarque_bera.normal} title="Normal errors:" detail={`Jarque-Bera p = ${fixed(a.jarque_bera.p, 4)}, skew ${fixed(a.residual_skew, 2)}. With thousands of rows small departures still "fail"; the Q-Q plot shows how far.`} />
    {vif && <Check ok={vif.every((v) => v.vif < 5)} title="No multicollinearity:" detail={`VIF ${vif.map((v) => `${v.feature} ${fixed(v.vif, 2)}`).join(', ')} (below 5 is fine).`} />}
  </ul>
);

const ResidualPlot: React.FC<{ points: any[] }> = ({ points }) => (
  <div className="h-60">
    <ResponsiveContainer>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis type="number" dataKey="fitted" tick={AXIS} name="Fitted" label={{ value: 'Fitted value', position: 'insideBottom', offset: -6, fontSize: 11 }} domain={['auto', 'auto']} />
        <YAxis type="number" dataKey="residual" tick={AXIS} name="Residual" />
        <ZAxis range={[22, 22]} />
        <ReferenceLine y={0} stroke="#141414" />
        <Tooltip content={({ payload }) => payload?.[0] ? <TipBox rows={[['Fitted', num(payload[0].payload.fitted, 1)], ['Actual', num(payload[0].payload.actual, 1)], ['Residual', num(payload[0].payload.residual, 1)]]} /> : null} />
        <Scatter isAnimationActive={false} data={points} fill="#eb6834" fillOpacity={0.4} />
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

const QQPlot: React.FC<{ qq: any[] }> = ({ qq }) => (
  <div className="h-60">
    <ResponsiveContainer>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis type="number" dataKey="theoretical" tick={AXIS} domain={[-2.6, 2.6]} label={{ value: 'Normal quantile', position: 'insideBottom', offset: -6, fontSize: 11 }} />
        <YAxis type="number" dataKey="sample" tick={AXIS} domain={['auto', 'auto']} />
        <ZAxis range={[30, 30]} />
        <ReferenceLine segment={[{ x: -2.4, y: -2.4 }, { x: 2.4, y: 2.4 }]} stroke="#141414" strokeDasharray="4 3" />
        <Scatter isAnimationActive={false} data={qq} fill="#2a78d6" />
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

const RegressionLabView: React.FC = () => {
  const state = useArtifact<any>('lab_regression');
  const [mode, setMode] = useState<'simple' | 'multiple'>('simple');
  const [which, setWhich] = useState(0);
  const [x, setX] = useState<string>('4');
  const [inputs, setInputs] = useState<Record<string, string>>({});

  return (
    <LabPage
      eyebrow="Prediction"
      title="Delivery time & order value models"
      intro="Predicting a number from other numbers on Mumbai orders: order value from basket size, and delivery time from basket size, rush hour, weekend and the restaurant."
      model={state.data?.model}
      concepts={[
        { term: 'Dependent / independent variable', meaning: 'y is predicted (delivery minutes); x are the predictors (items, rush hour...).' },
        { term: 'Simple linear regression', meaning: 'y = a + b·x with one predictor. Least squares: b = Sxy / Sxx, a = ȳ − b·x̄.' },
        { term: 'Multiple linear regression', meaning: 'y = b0 + b1·x1 + … + bk·xk. Each b is the change in y for one unit of its x, others held constant.' },
        { term: 'Slope and intercept', meaning: 'The slope is the change in y per unit of x; the intercept is y when every x is 0.' },
        { term: 'Residual', meaning: 'Actual − predicted. Least squares minimises the sum of squared residuals.' },
        { term: 'MSE / RMSE / MAE', meaning: 'Mean squared error, its square root (in y units), and mean absolute error. Lower is better.' },
        { term: 'R² and adjusted R²', meaning: 'Share of the variance in y explained (0–1). Adjusted R² penalises extra predictors.' },
        { term: 'Correlation r', meaning: 'Strength and direction of a linear relationship; in simple regression R² = r².' },
        { term: 'Assumptions', meaning: 'Linearity, independent errors, constant variance (homoscedasticity), normally distributed errors, no multicollinearity.' },
        { term: 'Train / test split', meaning: 'Fit on 80% of rows, measure on the unseen 20% to estimate real-world error.' },
      ]}
    >
      <ArtifactGate state={state} what="regression results">
        {(d) => {
          const s = d.simple[which];
          const m = d.multiple;
          const xv = Number(x);
          const yhat = s.intercept + s.slope * (Number.isFinite(xv) ? xv : 0);
          const val = (f: string) => inputs[f] ?? String(m.feature_ranges[f][2]);
          const mhat = m.intercept + Object.entries(m.coefs).reduce((acc: number, [f, c]: any) => acc + c * Number(val(f) || 0), 0);
          return (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Segmented world={W} label="Model" value={mode} onChange={setMode} options={[{ value: 'simple', label: 'Simple (one x)' }, { value: 'multiple', label: 'Multiple (four x)' }]} />
                <p className={`text-xs ${T.muted}`}>{d.dataset.name} · {num(d.dataset.rows, 0)} rows · {d.dataset.split}</p>
              </div>

              {mode === 'simple' ? (
                <>
                  <Segmented world={W} label="Simple model" value={String(which)} onChange={(v) => setWhich(Number(v))}
                    options={d.simple.map((sm: any, i: number) => ({ value: String(i), label: `${sm.y_label} ~ ${sm.x_label}` }))} />
                  <div className="rounded-2xl bg-[#0d0d0d] px-6 py-5 text-[#f5f2ea]">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/50">Regression equation</p>
                    <p className={`${T.display} mt-1 text-2xl text-[#c3d096] sm:text-3xl`}>ŷ = {fixed(s.intercept, 2)} + {fixed(s.slope, 2)}·x</p>
                    <p className="mt-1 text-sm text-white/60">{s.equation}</p>
                  </div>
                  <StatRow>
                    <Stat label="Slope (b)" value={fixed(s.slope, 3)} note={`+1 ${s.x_label.toLowerCase()} → ${s.slope >= 0 ? '+' : ''}${fixed(s.slope, 2)}`} />
                    <Stat label="Intercept (a)" value={fixed(s.intercept, 3)} />
                    <Stat label="Correlation r" value={fixed(s.formula.r, 3)} note={`R² = r² = ${fixed(s.formula.r2, 3)}`} />
                    <Stat label="Test RMSE" value={num(s.test.rmse, 2)} note={`test R² ${fixed(s.test.r2, 3)}`} strong />
                  </StatRow>
                  <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                    <Panel world={W} title="Data and fitted line" description="Test-set orders (jittered) with the least-squares line">
                      <div className="h-80">
                        <ResponsiveContainer>
                          <ScatterChart margin={{ top: 8, right: 16, bottom: 14, left: 0 }}>
                            <CartesianGrid stroke={GRID} />
                            <XAxis type="number" dataKey="x" tick={AXIS} allowDecimals={false} domain={[s.x_range[0] - 0.5, s.x_range[1] + 0.5]}
                              ticks={Array.from({ length: s.x_range[1] - s.x_range[0] + 1 }, (_, i) => s.x_range[0] + i)} label={{ value: s.x_label, position: 'insideBottom', offset: -6, fontSize: 11 }} />
                            <YAxis type="number" dataKey="y" tick={AXIS} />
                            <ZAxis range={[22, 22]} />
                            <Tooltip content={({ payload }) => payload?.[0] ? <TipBox rows={[[s.x_label, num(payload[0].payload.x, 2)], [s.y_label, num(payload[0].payload.y, 1)]]} /> : null} />
                            <Scatter isAnimationActive={false} data={s.points.map((p: any, i: number) => ({ x: p.x + ((i * 37) % 11 - 5) * 0.03, y: p.actual }))} fill="#2a78d6" fillOpacity={0.3} />
                            <Scatter isAnimationActive={false} data={s.line} line={{ stroke: '#eb6834', strokeWidth: 2.5 }} shape={() => <g />} legendType="none" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex gap-4"><Swatch color="#2a78d6" label="Actual (test)" /><Swatch color="#eb6834" label="Regression line" /></div>
                    </Panel>
                    <Panel world={W} title="Least squares, step by step" description={`On ${num(s.n_train, 0)} training rows`}>
                      <ol className="space-y-2 font-mono text-[13px]">
                        <li>x̄ = {fixed(s.formula.x_mean, 4)}, ȳ = {fixed(s.formula.y_mean, 4)}</li>
                        <li>Sxy = Σ(x−x̄)(y−ȳ) = {num(s.formula.sxy, 2)}</li>
                        <li>Sxx = Σ(x−x̄)² = {num(s.formula.sxx, 2)}</li>
                        <li>b = Sxy / Sxx = <strong>{fixed(s.slope, 4)}</strong></li>
                        <li>a = ȳ − b·x̄ = <strong>{fixed(s.intercept, 4)}</strong></li>
                        <li>r = Sxy / √(Sxx·Syy) = {fixed(s.formula.r, 4)}</li>
                      </ol>
                      <Reading>scikit-learn's LinearRegression gives b = {fixed(s.sklearn.slope, 4)}, a = {fixed(s.sklearn.intercept, 4)}: the same answer.</Reading>
                      <div className="mt-4 flex items-end gap-3">
                        <Field world={W} label={`Predict for ${s.x_label.toLowerCase()} =`} htmlFor="r-x" className="flex-1">
                          <input id="r-x" type="number" className={T.input} value={x} onChange={(e) => setX(e.target.value)} />
                        </Field>
                        <div className={`rounded-xl px-4 py-2.5 ${T.subtle}`}><p className={`text-xs ${T.muted}`}>ŷ</p><p className="text-lg font-semibold tabular-nums">{num(yhat, 2)}</p></div>
                      </div>
                    </Panel>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel world={W} title="Error metrics"><MetricsTable train={s.train} test={s.test} /></Panel>
                    <Panel world={W} title="Coefficients" description="Ordinary least squares with standard errors"><Coefficients rows={s.coefficients} /></Panel>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-3">
                    <Panel world={W} title="Residuals vs fitted"><ResidualPlot points={s.points} /><Reading>No pattern around 0 means a straight line fits.</Reading></Panel>
                    <Panel world={W} title="Normal Q-Q plot"><QQPlot qq={s.assumptions.qq} /><Reading>Points on the dashed line mean normally distributed residuals.</Reading></Panel>
                    <Panel world={W} title="Assumptions"><Assumptions a={s.assumptions} /></Panel>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-[#0d0d0d] px-6 py-5 text-[#f5f2ea]">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/50">Multiple regression equation</p>
                    <p className="mt-2 font-mono text-[15px] leading-relaxed text-[#c3d096]">
                      ŷ = {fixed(m.intercept, 2)}{Object.entries(m.coefs).map(([f, c]: any) => ` ${c >= 0 ? '+' : '−'} ${fixed(Math.abs(c), 3)}·${f}`).join('')}
                    </p>
                    <p className="mt-1 text-sm text-white/60">Delivery time (minutes) from items, rush hour, weekend and the restaurant's typical time.</p>
                  </div>
                  <StatRow>
                    <Stat label="Test R²" value={fixed(m.test.r2, 3)} note={`adjusted ${fixed(m.test.adj_r2, 3)}`} strong />
                    <Stat label="Test RMSE" value={`${num(m.test.rmse, 2)} min`} />
                    <Stat label="Test MAE" value={`${num(m.test.mae, 2)} min`} />
                    <Stat label="vs simple (items only)" value={`R² ${fixed(d.simple[1].test.r2, 3)}`} note="adding predictors explains more" />
                  </StatRow>
                  <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                    <Panel world={W} title="Coefficients" description="Holding the other predictors constant">
                      <Coefficients rows={m.coefficients} labels={Object.fromEntries(m.features.map((f: any) => [f.key, f.label]))} />
                      <Reading>Every predictor has p &lt; 0.05 if its effect is unlikely to be chance. Standardised β compares predictors measured in different units.</Reading>
                    </Panel>
                    <Panel world={W} title="Predict a delivery">
                      <div className="grid grid-cols-2 gap-3">
                        {m.features.map((f: any) => (
                          <Field key={f.key} world={W} label={f.label} htmlFor={`m-${f.key}`}>
                            <input id={`m-${f.key}`} type="number" className={T.input} value={val(f.key)} onChange={(e) => setInputs((s0) => ({ ...s0, [f.key]: e.target.value }))} />
                          </Field>
                        ))}
                      </div>
                      <div className="mt-4 rounded-2xl bg-[#0d0d0d] px-5 py-4 text-[#f5f2ea]">
                        <p className="text-xs text-white/60">Predicted delivery time</p>
                        <p className="text-3xl font-semibold tabular-nums text-[#c3d096]">{num(mhat, 1)} min</p>
                        <p className="text-xs text-white/50">± {num(m.test.rmse, 1)} min typical error (RMSE)</p>
                      </div>
                    </Panel>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel world={W} title="Each predictor's contribution" description="Test R² as predictors are added one by one">
                      <div className="h-56">
                        <ResponsiveContainer>
                          <BarChart data={m.nested.map((n: any) => ({ label: `+ ${n.features[n.features.length - 1]}`, r2: n.test_r2 }))}>
                            <CartesianGrid vertical={false} stroke={GRID} />
                            <XAxis dataKey="label" tick={AXIS} />
                            <YAxis tick={AXIS} domain={[0, 1]} />
                            <Tooltip content={({ payload }) => payload?.[0] ? <TipBox title={String(payload[0].payload.label)} rows={[['Test R²', fixed(Number(payload[0].value), 3)]]} /> : null} />
                            <Bar isAnimationActive={false} dataKey="r2" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 11, formatter: (v: any) => fixed(Number(v), 3) }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>
                    <Panel world={W} title="Error metrics"><MetricsTable train={m.train} test={m.test} /></Panel>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-3">
                    <Panel world={W} title="Residuals vs fitted"><ResidualPlot points={m.points} /></Panel>
                    <Panel world={W} title="Normal Q-Q plot"><QQPlot qq={m.assumptions.qq} /></Panel>
                    <Panel world={W} title="Assumptions"><Assumptions a={m.assumptions} vif={m.vif} /></Panel>
                  </div>
                </>
              )}
            </>
          );
        }}
      </ArtifactGate>
    </LabPage>
  );
};

export default RegressionLabView;
