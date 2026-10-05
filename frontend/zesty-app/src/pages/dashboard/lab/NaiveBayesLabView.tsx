import React, { useMemo, useState } from 'react';
import { Field, Panel, Segmented } from '../../../components/dashboard/primitives';
import { ArtifactGate, ClassMetrics, ConfusionMatrix, LabPage, MiniTable, Reading, Stat, StatRow } from './labKit';
import { W, T, fixed, num, pctOf, useArtifact } from './labUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Multinomial NB scored in the browser from the model's word likelihoods. */
const useLiveDish = (text: string, nb: any) => useMemo(() => {
  if (!nb) return null;
  const words = (text.toLowerCase().match(/[a-z]{2,}/g) ?? []);
  const logs = [Math.log(nb.priors[0]), Math.log(nb.priors[1])];
  const used: { word: string; p: number[] }[] = [];
  for (const w of words) {
    const p = nb.likelihoods[w];
    if (!p) continue;
    logs[0] += Math.log(p[0]);
    logs[1] += Math.log(p[1]);
    used.push({ word: w, p });
  }
  const m = Math.max(...logs);
  const e = logs.map((l) => Math.exp(l - m));
  const s = e[0] + e[1];
  return { words, used, logs, posterior: [e[0] / s, e[1] / s] };
}, [text, nb]);

const NaiveBayesLabView: React.FC = () => {
  const state = useArtifact<any>('lab_naive_bayes');
  const [kind, setKind] = useState<'multinomial' | 'bernoulli'>('multinomial');
  const [dish, setDish] = useState('paneer butter masala');
  const live = useLiveDish(dish, state.data?.data?.text?.multinomial);

  return (
    <LabPage
      eyebrow="Prediction"
      title="Churn & dish classifiers"
      intro="Two problems: Gaussian NB predicts whether a customer goes quiet from numeric features; Multinomial and Bernoulli NB decide whether a dish is vegetarian from the words in its name."
      model={state.data?.model}
      concepts={[
        { term: "Bayes' theorem", meaning: 'P(class | x) = P(x | class) · P(class) / P(x): turn how likely the evidence is under each class into how likely each class is given the evidence.' },
        { term: 'Prior', meaning: 'P(class) before seeing any features: the class share in the training data.' },
        { term: 'Likelihood', meaning: 'P(x | class): how probable the observed feature values are if the row belonged to that class.' },
        { term: 'Posterior', meaning: 'P(class | x): the prior updated by the likelihoods. Predict the class with the largest posterior.' },
        { term: 'Naïve independence', meaning: 'Features are assumed independent given the class, so P(x | c) = Π P(xi | c). Rarely true, often good enough.' },
        { term: 'Gaussian NB', meaning: 'Numeric features: each class has a normal distribution (mean, variance) per feature.' },
        { term: 'Multinomial NB', meaning: 'Word counts: P(word | class) estimated from how often the word appears in that class.' },
        { term: 'Bernoulli NB', meaning: 'Word present / absent: also penalises a class when its typical words are missing.' },
        { term: 'Laplace smoothing', meaning: 'Add 1 to every count so an unseen word does not make a probability zero.' },
        { term: 'Confusion matrix and metrics', meaning: 'TP, FP, FN, TN; accuracy, precision (how many predicted positives were right), recall (how many positives were found), F1.' },
      ]}
    >
      <ArtifactGate state={state} what="Naive Bayes results">
        {(d) => {
          const g = d.gaussian;
          const ex = g.worked_example;
          const text = d.text;
          const nb = text?.[kind];
          return (
            <>
              <h3 className={`${T.display} text-xl`}>1 · Gaussian Naïve Bayes: will a customer go quiet?</h3>
              <StatRow>
                <Stat label="Prior: stays active" value={pctOf(g.priors[0])} note={`${num(g.class_counts[0], 0)} customers`} />
                <Stat label="Prior: goes quiet" value={pctOf(g.priors[1])} note={`${num(g.class_counts[1], 0)} customers`} />
                <Stat label="Train accuracy" value={pctOf(g.train_accuracy)} />
                <Stat label="Test accuracy" value={pctOf(g.test.accuracy)} strong
                  note={g.raw_test_accuracy !== undefined ? `${pctOf(g.raw_test_accuracy)} before log-transforming skewed features` : undefined} />
              </StatRow>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <Panel world={W} title="Learned parameters" description="Mean and variance of each feature within each class">
                  <MiniTable rows={g.parameters} dense rowKey={(r: any) => r.feature} cols={[
                    { key: 'f', label: 'Feature', render: (r: any) => r.label },
                    { key: 'm0', label: 'μ active', align: 'right', render: (r: any) => num(r.mean[0], 2) },
                    { key: 'm1', label: 'μ quiet', align: 'right', render: (r: any) => num(r.mean[1], 2) },
                    { key: 'v0', label: 'σ² active', align: 'right', render: (r: any) => num(r.variance[0], 1) },
                    { key: 'v1', label: 'σ² quiet', align: 'right', render: (r: any) => num(r.variance[1], 1) },
                  ]} />
                </Panel>
                <Panel world={W} title="On the test set">
                  <ClassMetrics m={g.test} />
                  <div className="mt-5"><ConfusionMatrix matrix={g.test.confusion_matrix} labels={['Stays active', 'Goes quiet']} /></div>
                </Panel>
              </div>
              <Panel world={W} title="One customer's posterior, worked through" description={`Log-likelihood of each feature value under each class's normal curve, added to the log prior. Actual class: ${ex.actual}.`}>
                <MiniTable rows={ex.steps} dense rowKey={(r: any) => r.feature} cols={[
                  { key: 'f', label: 'Feature', render: (r: any) => r.label },
                  { key: 'x', label: 'Value', align: 'right', render: (r: any) => num(r.value, 2) },
                  { key: 'l0', label: 'log P(x | active)', align: 'right', render: (r: any) => fixed(r.log_likelihood[0], 3) },
                  { key: 'l1', label: 'log P(x | quiet)', align: 'right', render: (r: any) => fixed(r.log_likelihood[1], 3) },
                  { key: 'w', label: 'Favours', align: 'right', render: (r: any) => (r.log_likelihood[1] > r.log_likelihood[0] ? <span className="text-[#c4501f]">quiet</span> : <span className="text-[#2a78d6]">active</span>) },
                ]} />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Stat label="log prior (active, quiet)" value={`${fixed(ex.log_prior[0], 3)}, ${fixed(ex.log_prior[1], 3)}`} />
                  <Stat label="log posterior (unnormalised)" value={`${fixed(ex.log_posterior[0], 2)}, ${fixed(ex.log_posterior[1], 2)}`} />
                  <Stat label="Posterior → prediction" value={`${pctOf(ex.posterior[1])} quiet`} note={`predicted: ${ex.predicted}`} strong />
                </div>
                <Reading>The model multiplies (adds in logs) one likelihood per feature as if they were independent: that is the naïve assumption. Recency and frequency are correlated, so the posterior is often overconfident even when the label is right.</Reading>
              </Panel>

              {text && (
                <>
                  <h3 className={`${T.display} pt-2 text-xl`}>2 · Text Naïve Bayes: is this dish vegetarian?</h3>
                  <StatRow>
                    <Stat label="Distinct dish names" value={num(text.rows, 0)} note={`${num(text.n_train, 0)} train · ${num(text.n_test, 0)} test`} />
                    <Stat label="Vegetarian share" value={pctOf(text.veg_share)} />
                    <Stat label="Multinomial accuracy" value={pctOf(text.multinomial.test.accuracy)} />
                    <Stat label="Bernoulli accuracy" value={pctOf(text.bernoulli.test.accuracy)} strong />
                  </StatRow>
                  <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <Panel world={W} title="Try it" description="Multinomial NB, computed in your browser from the trained word likelihoods">
                      <Field world={W} label="Dish name" htmlFor="nb-dish">
                        <input id="nb-dish" className={T.input} value={dish} onChange={(e) => setDish(e.target.value)} />
                      </Field>
                      {live && (
                        <div className="mt-4 space-y-3">
                          <div className="flex h-9 overflow-hidden rounded-full text-xs font-semibold">
                            <div className="grid place-items-center bg-[#1baf7a] text-white" style={{ width: `${live.posterior[1] * 100}%` }}>{live.posterior[1] > 0.12 ? `Veg ${pctOf(live.posterior[1], 0)}` : ''}</div>
                            <div className="grid place-items-center bg-[#eb6834] text-white" style={{ width: `${live.posterior[0] * 100}%` }}>{live.posterior[0] > 0.12 ? `Non-veg ${pctOf(live.posterior[0], 0)}` : ''}</div>
                          </div>
                          <MiniTable rows={live.used} dense rowKey={(r) => r.word} cols={[
                            { key: 'w', label: 'Word', render: (r) => <span className="font-mono">{r.word}</span> },
                            { key: 'v', label: 'P(word | veg)', align: 'right', render: (r) => fixed(r.p[1], 5) },
                            { key: 'n', label: 'P(word | non-veg)', align: 'right', render: (r) => fixed(r.p[0], 5) },
                          ]} />
                          {live.words.length > live.used.length && <p className={`text-xs ${T.faint}`}>Words outside the 300 most common are ignored here.</p>}
                        </div>
                      )}
                    </Panel>
                    <Panel world={W} title="Model" action={<Segmented world={W} label="Variant" value={kind} onChange={setKind} options={[{ value: 'multinomial', label: 'Multinomial' }, { value: 'bernoulli', label: 'Bernoulli' }]} />}>
                      <ClassMetrics m={nb.test} />
                      <div className="mt-5"><ConfusionMatrix matrix={nb.test.confusion_matrix} labels={text.classes} /></div>
                      <p className={`mt-3 text-xs ${T.muted}`}>Vocabulary {num(nb.vocabulary, 0)} words · priors non-veg {pctOf(nb.priors[0])}, veg {pctOf(nb.priors[1])}</p>
                    </Panel>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-3">
                    {(['Veg', 'Non-veg'] as const).map((c) => (
                      <Panel key={c} world={W} title={`Words that say "${c}"`} description="Highest likelihood ratio between the classes">
                        <MiniTable rows={nb.top_words[c]} dense rowKey={(r: any) => r.word} cols={[
                          { key: 'w', label: 'Word', render: (r: any) => <span className="font-mono">{r.word}</span> },
                          { key: 'r', label: 'Ratio', align: 'right', render: (r: any) => `${num(r.ratio, 1)}×` },
                        ]} />
                      </Panel>
                    ))}
                    <Panel world={W} title="Test predictions">
                      <MiniTable rows={nb.examples} dense rowKey={(r: any) => r.dish} cols={[
                        { key: 'd', label: 'Dish', render: (r: any) => <span className={r.actual !== r.predicted ? 'text-rose-600' : ''}>{r.dish}</span> },
                        { key: 'p', label: 'P(veg)', align: 'right', render: (r: any) => pctOf(r.p_veg, 0) },
                        { key: 'a', label: 'Actual', align: 'right', render: (r: any) => r.actual },
                      ]} />
                    </Panel>
                  </div>
                </>
              )}

              <Panel world={W} title="Naïve Bayes vs decision tree" description="Same customers, same test set">
                <MiniTable rows={d.comparison} rowKey={(r: any) => r.model} cols={[
                  { key: 'm', label: 'Model', render: (r: any) => r.model },
                  { key: 'a', label: 'Accuracy', align: 'right', render: (r: any) => pctOf(r.accuracy) },
                  { key: 'p', label: 'Precision', align: 'right', render: (r: any) => pctOf(r.precision) },
                  { key: 'r', label: 'Recall', align: 'right', render: (r: any) => pctOf(r.recall) },
                  { key: 'f', label: 'F1', align: 'right', render: (r: any) => pctOf(r.f1) },
                ]} />
              </Panel>
            </>
          );
        }}
      </ArtifactGate>
    </LabPage>
  );
};

export default NaiveBayesLabView;
