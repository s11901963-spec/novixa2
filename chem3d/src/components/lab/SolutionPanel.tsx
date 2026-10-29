import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  diagnoseAngle,
  diagnoseBondingPairs,
  diagnoseCentralLonePairs,
  diagnoseElectronGeometry,
  diagnoseFormalCharge,
  diagnoseHybridization,
  diagnoseMolecularGeometry,
  diagnosePolarity,
  diagnoseStericNumber,
  diagnoseValence,
  type Diagnosis,
} from '../../chem/diagnose';
import type { SolutionStep, StepId } from '../../chem/steps';
import type { AngleSignatureId, Analysis, ElectronGeometryId, HybridizationId, MolecularGeometryId } from '../../chem/types';
import { ELECTRON_GEOMETRIES, HYBRIDIZATIONS, MOLECULAR_GEOMETRIES } from '../../data/schema';
import { useT, type TFunction } from '../../i18n';
import { useHistory } from '../../state/history';
import { useLab } from '../../state/lab';
import { Badge, Button, Segmented } from '../ui/controls';
import { Feedback } from '../ui/Feedback';
import { Axe, Deg, Formula, formulaText, hybridizationText, Ltr } from '../ui/Formula';
import { NumberPad } from '../ui/NumberPad';
import { ShapeIcon } from '../ui/ShapeIcon';
import { Tex } from '../ui/Tex';
import { diagnosisMessage } from './messages';
import type { LabModel } from './useLabModel';

const ANGLE_OPTIONS: AngleSignatureId[] = ['a180', 'a120', 'lt120', 'a109', 'lt109', 'a90-120-180', 'lt90-lt120', 'lt90', 'a90-180'];
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// ---------------------------------------------------------------------------
// Step content (shared by both modes)
// ---------------------------------------------------------------------------
function explanation(t: TFunction, step: SolutionStep, a: Analysis): ReactNode {
  const p = step.params;
  const v = a.vsepr!;
  switch (step.id) {
    case 'valence':
      return t('step.valence.explain');
    case 'bonding':
      return t('step.bonding.explain');
    case 'terminal':
      return p.onlyHydrogen ? t('step.terminal.onlyH') : t('step.terminal.explain');
    case 'central-lp':
      return t('step.central-lp.explain', { central: String(p.central), centralElectrons: p.centralElectrons, octet: t(`octet.${p.octet}` as never) });
    case 'formal-charge':
      return `${t('step.formal-charge.explain')}${p.others ? ` ${t('step.formal-charge.others', { others: String(p.others) })}` : ''}`;
    case 'steric-number':
      return `${t('step.steric-number.explain')}${p.multiple ? ` ${t('step.steric-number.multiple')}` : ''}`;
    case 'electron-geometry':
      return t('step.electron-geometry.explain', { sn: v.stericNumber, eg: t(`eg.${v.electronGeometry}`) });
    case 'molecular-geometry': {
      if (v.lonePairs === 0) return t('step.molecular-geometry.noLp');
      let s = t('step.molecular-geometry.lp', { eg: t(`eg.${v.electronGeometry}`), mg: t(`mg.${v.molecularGeometry}`) });
      if (v.stericNumber === 5) s += ` ${t('step.molecular-geometry.tbp')}`;
      if (v.stericNumber === 6 && v.lonePairs === 2) s += ` ${t('step.molecular-geometry.oct')}`;
      return s;
    }
    case 'bond-angle': {
      const rel = v.idealAngles.some((x) => x.relation === 'less-than') ? 'less' : v.idealAngles.some((x) => x.relation === 'approx') ? 'approx' : 'exact';
      return t(`step.bond-angle.${rel}` as never);
    }
    case 'hybridization':
      return `${t('step.hybridization.explain', { sn: v.stericNumber })}${p.expanded ? ` ${t('step.hybridization.caveat')}` : ''}`;
    case 'polarity':
      return t(`step.polarity.${p.reason}` as never);
  }
}

function ResultView({ step }: { step: SolutionStep }) {
  const t = useT();
  const r = step.result;
  switch (r.kind) {
    case 'number':
      return (
        <span className="tabular font-semibold">
          {r.unit === 'charge' ? signed(r.value).replace('+0', '0') : r.value} {r.unit !== 'charge' && t(`unit.${r.unit}`)}
        </span>
      );
    case 'electron-geometry':
      return <span className="font-semibold">{t(`eg.${r.value}`)}</span>;
    case 'molecular-geometry':
      return (
        <span className="font-semibold">
          {t(`mg.${r.value}`)} · <Axe axe={r.axe} />
        </span>
      );
    case 'angle':
      return (
        <div className="flex flex-col gap-1">
          <span className="font-semibold">
            {t('step.bond-angle.prediction')}: {t(`sig.${r.signature}`)}
          </span>
          {r.measured && (
            <span className="text-muted">
              <Deg value={r.measured.value} className="font-mono font-semibold text-fg" />{' '}
              {t(r.measured.fromExperiment ? 'step.bond-angle.measuredExp' : 'step.bond-angle.measuredIdeal', { label: r.measured.label })}
            </span>
          )}
        </div>
      );
    case 'hybridization':
      return <span className="font-semibold">{hybridizationText(r.value)}</span>;
    case 'polarity':
      return <span className="font-semibold">{t(`polarity.${r.value}`)}</span>;
  }
}

function StepBody({ step, analysis }: { step: SolutionStep; analysis: Analysis }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-muted">{explanation(t, step, analysis)}</p>
      {step.formula && (
        <div className="rounded-lg bg-surface-2 px-3 py-2">
          <Tex tex={step.formula} display />
        </div>
      )}
      {step.substitution && (
        <div className="rounded-lg border border-line px-3 py-2">
          <Tex tex={step.substitution} display />
        </div>
      )}
      <div className="flex items-start gap-2">
        <span className="text-muted">{t('common.result')}:</span>
        <ResultView step={step} />
      </div>
    </div>
  );
}

function StepShell({ index, title, status, children, testId }: { index: number; title: string; status?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-3.5" data-testid={testId}>
      <div className="mb-2 flex items-center gap-2.5">
        <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">{index}</span>
        <h3 className="min-w-0 flex-1 text-[15px] font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
          {title}
        </h3>
        {status}
      </div>
      {children}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Practice ("solve it yourself first")
// ---------------------------------------------------------------------------
type QKind = 'number' | 'choice';
interface PracticeQuestion {
  id: StepId;
  kind: QKind;
  /** Quick-pick values for number questions (touch); none means the keypad is shown. */
  chips?: number[];
  negative?: boolean;
  options?: string[];
  optionLabel?: (o: string) => ReactNode;
  check: (answer: string) => Diagnosis;
  expected: () => string;
  answerLabel: (answer: string) => string;
}

function buildQuestions(a: Analysis, t: TFunction): PracticeQuestion[] {
  const v = a.vsepr!;
  const l = a.lewis!;
  const range = (a0: number, b0: number) => Array.from({ length: b0 - a0 + 1 }, (_, i) => a0 + i);
  const num = (id: StepId, fn: (n: number, a: Analysis) => Diagnosis, expected: number, chips?: number[], fmt = (n: number) => String(n)): PracticeQuestion => ({
    id,
    kind: 'number',
    chips,
    negative: id === 'formal-charge',
    check: (s) => fn(Number(s), a),
    expected: () => fmt(expected),
    answerLabel: (s) => s,
  });
  const qs: PracticeQuestion[] = [
    num('valence', diagnoseValence, l.valence.total),
    num('bonding', diagnoseBondingPairs, l.bondingElectrons / 2, range(1, 8)),
    num('central-lp', diagnoseCentralLonePairs, v.lonePairs, range(0, 4)),
  ];
  if (a.spec.charge !== 0 || l.structure.atoms[0].formalCharge !== 0) {
    qs.push(num('formal-charge', (n, an) => diagnoseFormalCharge(n, an, 0), l.structure.atoms[0].formalCharge, range(-2, 2), signed));
  }
  qs.push(num('steric-number', diagnoseStericNumber, v.stericNumber, range(2, 6)));
  qs.push({
    id: 'electron-geometry',
    kind: 'choice',
    options: [...ELECTRON_GEOMETRIES],
    optionLabel: (o) => (
      <span className="flex items-center gap-1.5">
        <ShapeIcon shape={o} kind="eg" size={30} />
        {t(`eg.${o}` as never)}
      </span>
    ),
    check: (s) => diagnoseElectronGeometry(s as ElectronGeometryId, a),
    expected: () => t(`eg.${v.electronGeometry}`),
    answerLabel: (s) => t(`eg.${s}` as never),
  });
  qs.push({
    id: 'molecular-geometry',
    kind: 'choice',
    options: [...MOLECULAR_GEOMETRIES],
    optionLabel: (o) => (
      <span className="flex items-center gap-1.5">
        <ShapeIcon shape={o} kind="mg" size={30} />
        {t(`mg.${o}` as never)}
      </span>
    ),
    check: (s) => diagnoseMolecularGeometry(s as MolecularGeometryId, a),
    expected: () => t(`mg.${v.molecularGeometry}`),
    answerLabel: (s) => t(`mg.${s}` as never),
  });
  const angleOpts = ANGLE_OPTIONS.includes(v.angleSignature) ? ANGLE_OPTIONS : [...ANGLE_OPTIONS, v.angleSignature];
  qs.push({
    id: 'bond-angle',
    kind: 'choice',
    options: angleOpts,
    optionLabel: (o) => t(`sig.${o}` as never),
    check: (s) => diagnoseAngle(s as AngleSignatureId, a),
    expected: () => t(`sig.${v.angleSignature}`),
    answerLabel: (s) => t(`sig.${s}` as never),
  });
  qs.push({
    id: 'hybridization',
    kind: 'choice',
    options: [...HYBRIDIZATIONS],
    optionLabel: (o) => <Ltr>{hybridizationText(o)}</Ltr>,
    check: (s) => diagnoseHybridization(s as HybridizationId, a),
    expected: () => hybridizationText(v.hybridization),
    answerLabel: (s) => hybridizationText(s),
  });
  if (v.polarity !== 'ion') {
    qs.push({
      id: 'polarity',
      kind: 'choice',
      options: ['polar', 'nonpolar'],
      optionLabel: (o) => t(`polarity.${o}` as never),
      check: (s) => diagnosePolarity(s as 'polar' | 'nonpolar', a),
      expected: () => t(`polarity.${v.polarity}`),
      answerLabel: (s) => t(`polarity.${s}` as never),
    });
  }
  return qs;
}

interface QState {
  status: 'open' | 'correct' | 'revealed';
  attempts: number;
  firstAnswer?: string;
  lastDiag?: Diagnosis;
  draft: string;
}

function QuestionInput({ q, state, onDraft, onCheck, onReveal, central }: { q: PracticeQuestion; state: QState; onDraft: (v: string) => void; onCheck: () => void; onReveal: () => void; central: string }) {
  const t = useT();
  const id = `practice-${q.id}`;
  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (state.draft !== '') onCheck();
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        {t(`practice.q.${q.id}` as never, { central })}
      </label>
      {q.kind === 'number' ? (
        <NumberPad
          inputId={id}
          value={state.draft}
          onChange={onDraft}
          onSubmit={() => state.draft !== '' && onCheck()}
          label={t(`practice.q.${q.id}` as never, { central })}
          chips={q.chips}
          negative={q.negative}
          min={q.negative ? -4 : 0}
          max={q.id === 'valence' ? 200 : 12}
          testId={`pad-${q.id}`}
        />
      ) : (
        <div id={id} role="radiogroup" aria-label={t(`practice.q.${q.id}` as never, { central })} className="flex flex-wrap gap-1.5">
          {q.options!.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={state.draft === o}
              onClick={() => onDraft(o)}
              className={`min-h-10 rounded-xl border px-2.5 py-1.5 text-[13px] transition-colors active:scale-[0.98] pointer-coarse:min-h-12 pointer-coarse:text-sm ${
                state.draft === o ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line bg-surface hover:bg-surface-2'
              }`}
            >
              {q.optionLabel!(o)}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={state.draft === ''} data-testid={`check-${q.id}`}>
          {t('common.check')}
        </Button>
        <Button variant="ghost" onClick={onReveal} data-testid={`reveal-${q.id}`}>
          {t('common.showSolution')}
        </Button>
      </div>
    </form>
  );
}

function Practice({ model }: { model: LabModel }) {
  const t = useT();
  const revealShape = useLab((s) => s.revealShape);
  const restart = useLab((s) => s.restartPractice);
  const addPractice = useHistory((s) => s.addPractice);
  const analysis = model.analysis;
  const questions = useMemo(() => buildQuestions(analysis, t), [analysis, t]);
  const [qs, setQs] = useState<Record<string, QState>>({});
  const get = (id: string): QState => qs[id] ?? { status: 'open', attempts: 0, draft: '' };
  const resolved = (id: string) => get(id).status !== 'open';
  const currentIdx = questions.findIndex((q) => !resolved(q.id));
  const formula = formulaText(model.formula, model.charge);

  useEffect(() => {
    if (resolved('molecular-geometry')) revealShape();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const update = (id: string, patch: Partial<QState>) => setQs((s) => ({ ...s, [id]: { ...get(id), ...s[id], ...patch } }));

  const check = (q: PracticeQuestion) => {
    const st = get(q.id);
    const d = q.check(st.draft);
    update(q.id, {
      attempts: st.attempts + 1,
      firstAnswer: st.firstAnswer ?? st.draft,
      lastDiag: d,
      status: d.correct ? 'correct' : 'open',
    });
    addPractice({ formula, step: q.id, answer: q.answerLabel(st.draft), correct: d.correct, code: d.code });
  };

  const questionFor = new Map(questions.map((q, i) => [q.id, { q, i }]));
  // A step is visible once every question before it has been resolved.
  let blocked = false;
  const items: ReactNode[] = [];
  model.steps.forEach((step, idx) => {
    if (blocked) return;
    const entry = questionFor.get(step.id);
    const title = t(`step.${step.id}.title` as never);
    if (!entry) {
      items.push(
        <StepShell key={step.id} index={idx + 1} title={title}>
          <StepBody step={step} analysis={analysis} />
        </StepShell>,
      );
      return;
    }
    const { q } = entry;
    const st = get(q.id);
    const status =
      st.status === 'correct' ? (
        <Badge tone="ok">✅</Badge>
      ) : st.status === 'revealed' ? (
        <Badge tone="warn">{t('practice.revealed')}</Badge>
      ) : null;
    items.push(
      <StepShell key={step.id} index={idx + 1} title={title} status={status} testId={`practice-step-${q.id}`}>
        {st.status === 'open' ? (
          <div className="flex flex-col gap-3">
            <QuestionInput
              q={q}
              state={st}
              central={analysis.spec.central}
              onDraft={(v) => update(q.id, { draft: v })}
              onCheck={() => check(q)}
              onReveal={() => update(q.id, { status: 'revealed', firstAnswer: st.firstAnswer })}
            />
            {st.lastDiag && !st.lastDiag.correct && (
              <Feedback correct={false} message={diagnosisMessage(t, st.lastDiag, analysis)}>
                <div className="mt-1.5 text-xs text-muted">{t('practice.tryAgainHint')}</div>
              </Feedback>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {st.status === 'correct' && (
              <Feedback correct message={<span className="font-semibold">{q.answerLabel(st.draft)}</span>} rule={t(`diag.correct.${q.id}` as never)} />
            )}
            <StepBody step={step} analysis={analysis} />
          </div>
        )}
      </StepShell>,
    );
    if (st.status === 'open') blocked = true;
  });

  const done = currentIdx === -1;
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">{items}</ol>
      {questions.some((q) => resolved(q.id)) && (
        <section className="rounded-xl border border-line bg-surface p-3.5" data-testid="practice-compare">
          <h3 className="mb-2 text-[15px] font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
            {t('practice.compare')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted">
                <tr className="text-start">
                  <th className="py-1 text-start font-medium">{t('common.step')}</th>
                  <th className="py-1 text-start font-medium">{t('common.yourAnswer')}</th>
                  <th className="py-1 text-start font-medium">{t('common.expected')}</th>
                  <th className="py-1 text-start font-medium">{t('common.result')}</th>
                </tr>
              </thead>
              <tbody>
                {questions
                  .filter((q) => resolved(q.id))
                  .map((q) => {
                    const st = get(q.id);
                    return (
                      <tr key={q.id} className="border-t border-line">
                        <td className="py-1.5 pe-2">{t(`step.${q.id}.title` as never)}</td>
                        <td className="py-1.5 pe-2">{st.firstAnswer ? q.answerLabel(st.firstAnswer) : '—'}</td>
                        <td className="py-1.5 pe-2">{q.expected()}</td>
                        <td className="py-1.5">
                          {st.status === 'correct' ? (st.attempts === 1 ? '✅' : `✅ (${st.attempts})`) : '➖'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {done && <p className="rounded-xl bg-accent-soft p-3 text-sm text-accent">{t('practice.done')}</p>}
      <div>
        <Button variant="secondary" onClick={restart}>
          {t('practice.restart')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
export function IssueList({ analysis }: { analysis: Analysis }) {
  const t = useT();
  if (!analysis.issues.length) return null;
  return (
    <ul className="flex flex-col gap-2" data-testid="analysis-issues">
      {analysis.issues.map((i, k) => (
        <li key={k} className={`rounded-xl border px-3 py-2 text-sm ${i.severity === 'error' ? 'border-bad/40 bg-bad-soft' : 'border-warn/40 bg-warn-soft'}`}>
          {t(`issue.${i.code}` as never, i.params)}
        </li>
      ))}
    </ul>
  );
}

export function SolutionPanel({ model }: { model: LabModel }) {
  const t = useT();
  const solveMode = useLab((s) => s.solveMode);
  const setSolveMode = useLab((s) => s.setSolveMode);
  const practiceKey = useLab((s) => s.practiceKey);
  const { analysis } = model;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">
          <Formula formula={model.formula} charge={model.charge} />
        </h2>
        <Segmented
          label={t('steps.modeLabel')}
          value={solveMode ? 'solve' : 'show'}
          size="sm"
          onChange={(v) => setSolveMode(v === 'solve')}
          options={[
            { value: 'show', label: t('steps.mode.show') },
            { value: 'solve', label: t('steps.mode.solve') },
          ]}
        />
      </div>
      <IssueList analysis={analysis} />
      {analysis.ok && (
        <>
          <details className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
            <summary className="cursor-pointer font-semibold text-fg">{t('steps.legend')}</summary>
            <p className="mt-1.5 leading-6">{t('steps.legend.body')}</p>
          </details>
          {solveMode ? (
            <Practice key={`${practiceKey}-${model.specKey}`} model={model} />
          ) : (
            <ol className="flex flex-col gap-3" data-testid="solution-steps">
              {model.steps.map((s, i) => (
                <StepShell key={s.id} index={i + 1} title={t(`step.${s.id}.title` as never)} testId={`step-${s.id}`}>
                  <StepBody step={s} analysis={analysis} />
                </StepShell>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
