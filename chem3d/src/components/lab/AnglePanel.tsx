import { useEffect, useMemo, useState } from 'react';
import { angleOfKind, angleTarget, judgeAngle, TOLERANCE, type AngleJudgement } from '../../chem/angleExplorer';
import { buildSceneModel } from '../../chem/geometry';
import { useT, type TFunction } from '../../i18n';
import { useHistory } from '../../state/history';
import { useLab } from '../../state/lab';
import { AngleDial } from '../ui/AngleDial';
import { Button } from '../ui/controls';
import { Feedback } from '../ui/Feedback';
import { Deg, Formula, formulaText, Ltr } from '../ui/Formula';
import { RefCite } from '../ui/RefCite';
import type { LabModel } from './useLabModel';

const MAX_ATTEMPTS = 3;
const fmt = (n: number) => Number(n.toFixed(2));

function verdictText(t: TFunction, j: AngleJudgement, ctx: { central: string; formula: string; hint: string }): string {
  const p = { ...j.params, central: ctx.central, formula: ctx.formula, hint: ctx.hint };
  if (j.code === 'close') return t(j.params.direction === 'down' ? 'angle.diag.close.down' : 'angle.diag.close.up', p);
  return t(`angle.diag.${j.code}` as never, p);
}

/**
 * "Change the angle yourself": drag the main bond angle, watch the 3D model follow, then check.
 * Three tries; after that the correct angle is shown on the model.
 */
export function AnglePanel({ model }: { model: LabModel }) {
  const t = useT();
  const angleTry = useLab((s) => s.angleTry);
  const setAngleTry = useLab((s) => s.setAngleTry);
  const addPractice = useHistory((s) => s.addPractice);
  const ex = model.explorer;
  const [attempts, setAttempts] = useState(0);
  const [verdict, setVerdict] = useState<AngleJudgement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (ex && angleTry === null) setAngleTry(ex.start);
  }, [ex, angleTry, setAngleTry]);

  const measured = useMemo(
    () => (ex && model.analysis.ok && model.experimental ? angleOfKind(buildSceneModel(model.analysis, { mode: 'experimental', experimental: model.experimental }), ex.kind) : undefined),
    [ex, model.analysis, model.experimental],
  );
  if (!model.analysis.ok || !ex) return <p className="text-sm text-muted">{t('angle.unavailable')}</p>;

  const target = angleTarget(ex, model.analysis, measured);
  const value = angleTry ?? ex.start;
  const formula = formulaText(model.formula, model.charge);
  const central = model.spec.central;
  const label = model.baseScene?.angles.find((a) => a.kind === ex.kind)?.label.replace(/ \((cis|trans)\)$/, '') ?? '';
  const lp = (model.analysis.vsepr?.lonePairs ?? 0) > 0;
  const book = model.molecule?.textbook && ex.kind === 'x-a-x' ? model.molecule.textbook.angles[0] : undefined;
  const goal = target.value ?? (target.range![0] + target.range![1]) / 2;
  const solved = !!verdict?.correct;
  const sourceText =
    target.source === 'measured' ? t('angle.source.measured') : target.source === 'symmetry' ? t('angle.source.symmetry') : t('angle.source.vsepr', { reference: fmt(ex.reference) });

  const check = () => {
    const j = judgeAngle(value, ex, target, model.analysis, book);
    const n = attempts + 1;
    setAttempts(n);
    setVerdict(j);
    addPractice({ formula, step: 'angle-try', answer: `${value}°`, correct: j.correct, code: j.code });
    if (!j.correct && n >= MAX_ATTEMPTS) {
      setRevealed(true);
      setAngleTry(fmt(goal));
    }
  };
  const restart = () => {
    setAttempts(0);
    setVerdict(null);
    setRevealed(false);
    setAngleTry(ex.start);
  };

  return (
    <div className="flex flex-col gap-3" data-testid="angle-panel" data-target={goal} data-solved={solved} data-revealed={revealed}>
      <div>
        <h2 className="text-base font-bold">
          {t('angle.title')} · <Formula formula={model.formula} charge={model.charge} /> · <Ltr className="font-mono">{label}</Ltr>
        </h2>
        <p className="mt-0.5 text-xs leading-5 text-muted">{t('angle.intro', { formula })}</p>
      </div>

      <AngleDial
        value={value}
        onChange={(v) => {
          setAngleTry(v);
          if (verdict && !verdict.correct) setVerdict(null);
        }}
        label={`${t('angle.title')} ${label}`}
        min={ex.min}
        max={ex.max}
        presets={[90, 104.5, 107, 109.5, 120, 180]}
        testId="angle-try"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={check} disabled={solved || revealed} data-testid="angle-check">
          {t('angle.check')}
        </Button>
        {!solved && !revealed && (
          <Button
            variant="ghost"
            onClick={() => {
              setRevealed(true);
              setAngleTry(fmt(goal));
            }}
            data-testid="angle-reveal"
          >
            {t('angle.reveal')}
          </Button>
        )}
        <Button variant="secondary" onClick={restart} data-testid="angle-restart">
          {t('angle.restart')}
        </Button>
        {!solved && !revealed && <span className="text-sm text-muted">{t('angle.attemptsLeft', { n: MAX_ATTEMPTS - attempts })}</span>}
      </div>

      {verdict && (
        <div data-testid="angle-feedback" data-correct={verdict.correct} data-code={verdict.code}>
          <Feedback
            correct={verdict.correct}
            message={verdict.correct ? t('angle.correct', { label, target: target.value !== undefined ? fmt(target.value) : `${fmt(target.range![0])}–${fmt(target.range![1])}`, source: sourceText }) : verdictText(t, verdict, { central, formula, hint: lp ? t('angle.hint.lp') : t('angle.hint.spread') })}
            rule={verdict.correct ? t('angle.rule', { tol: TOLERANCE }) : undefined}
          />
        </div>
      )}
      {revealed && !solved && (
        <p className="rounded-xl border border-ok/40 bg-ok-soft px-3 py-2 text-sm" data-testid="angle-revealed">
          {t('angle.revealed', { target: target.value !== undefined ? fmt(target.value) : `≈ ${fmt(goal)}`, source: sourceText })}
        </p>
      )}

      {(solved || revealed) && (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-line">
                <td className="px-3 py-1.5 text-muted">{t('angle.compare.you')}</td>
                <td className="px-3 py-1.5 font-semibold">
                  <Deg value={value} />
                </td>
              </tr>
              <tr className="border-b border-line">
                <td className="px-3 py-1.5 text-muted">{t('angle.compare.correct')}</td>
                <td className="px-3 py-1.5 font-semibold">
                  {target.value !== undefined ? <Deg value={target.value} /> : <bdi dir="ltr">{`${fmt(target.range![0])}–${fmt(target.range![1])}°`}</bdi>} <span className="text-xs font-normal text-muted">({sourceText})</span>
                </td>
              </tr>
              <tr className={book !== undefined ? 'border-b border-line' : ''}>
                <td className="px-3 py-1.5 text-muted">{t('angle.compare.noLp')}</td>
                <td className="px-3 py-1.5">
                  <Deg value={ex.reference} />
                </td>
              </tr>
              {book !== undefined && (
                <tr>
                  <td className="px-3 py-1.5 text-muted">{t('angle.compare.book')}</td>
                  <td className="px-3 py-1.5">
                    <Deg value={book} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {model.experimental && (
        <p className="text-xs text-muted">
          {t('common.sources')}: <RefCite ids={model.experimental.sources} />
        </p>
      )}
    </div>
  );
}
