import { useEffect, useState } from 'react';
import { judgeAngle, TOLERANCE, type AngleJudgement } from '../../chem/angleExplorer';
import { useT, type TFunction } from '../../i18n';
import { useHistory } from '../../state/history';
import { useLab } from '../../state/lab';
import { useSettings } from '../../state/settings';
import { AngleDial } from '../ui/AngleDial';
import { Button } from '../ui/controls';
import { Feedback } from '../ui/Feedback';
import { useCue } from '../ui/useCue';
import { Deg, Formula, formulaText, Ltr } from '../ui/Formula';
import { RefCite } from '../ui/RefCite';
import { useAngleChallenge } from './useAngleChallenge';
import type { LabModel } from './useLabModel';

const MAX_ATTEMPTS = 3;
const fmt = (n: number) => Number(n.toFixed(2));

function verdictText(t: TFunction, j: AngleJudgement, ctx: { central: string; formula: string; hint: string }): string {
  const p = { ...j.params, central: ctx.central, formula: ctx.formula, hint: ctx.hint };
  if (j.code === 'close') return t(j.params.direction === 'down' ? 'angle.diag.close.down' : 'angle.diag.close.up', p);
  return t(`angle.diag.${j.code}` as never, p);
}

/**
 * "Change the angle yourself": set the main bond angle (drag an atom in the 3D model, or use the
 * protractor), see right/wrong at once on the model, then check for the explanation.
 * Three tries; after that the correct angle is shown on the model.
 */
export function AnglePanel({ model }: { model: LabModel }) {
  const t = useT();
  const angleTry = useLab((s) => s.angleTry);
  const setAngleTry = useLab((s) => s.setAngleTry);
  const addPractice = useHistory((s) => s.addPractice);
  const angleLive = useSettings((s) => s.angleLive);
  const play = useCue();
  const setAngleLive = useSettings((s) => s.setAngleLive);
  const ex = model.explorer;
  const challenge = useAngleChallenge(model);
  const [attempts, setAttempts] = useState(0);
  const [verdict, setVerdict] = useState<AngleJudgement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (ex && angleTry === null) setAngleTry(ex.start);
  }, [ex, angleTry, setAngleTry]);

  if (!model.analysis.ok || !ex || !challenge) return <p className="text-sm text-muted">{t('angle.unavailable')}</p>;

  const { target, value, goal } = challenge;
  const formula = formulaText(model.formula, model.charge);
  const central = model.spec.central;
  const label = model.baseScene?.angles.find((a) => a.kind === ex.kind)?.label.replace(/ \((cis|trans)\)$/, '') ?? '';
  const lp = (model.analysis.vsepr?.lonePairs ?? 0) > 0;
  const book = model.molecule?.textbook && ex.kind === 'x-a-x' ? model.molecule.textbook.angles[0] : undefined;
  const solved = !!verdict?.correct;
  // A wrong verdict explains the value that was checked; it goes away once the angle is changed.
  const shownVerdict = verdict && (verdict.correct || revealed || verdict.params.value === fmt(value)) ? verdict : null;
  const sourceText =
    target.source === 'measured' ? t('angle.source.measured') : target.source === 'symmetry' ? t('angle.source.symmetry') : t('angle.source.vsepr', { reference: fmt(ex.reference) });

  const check = () => {
    const j = judgeAngle(value, ex, target, model.analysis, book);
    const n = attempts + 1;
    setAttempts(n);
    setVerdict(j);
    addPractice({ formula, step: 'angle-try', answer: `${value}°`, correct: j.correct, code: j.code });
    if (j.correct) play('correct');
    else if (n < MAX_ATTEMPTS) play('wrong');
    else {
      // Third wrong try: the buzz, then the alert as the model moves to the right angle.
      play('wrong', false);
      window.setTimeout(() => play('attention', t('angle.sound.revealed')), 700);
    }
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

      <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-sm pointer-coarse:min-h-11">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={angleLive} onChange={(e) => setAngleLive(e.target.checked)} data-testid="angle-live-toggle" />
        <span>{t('angle.liveToggle')}</span>
      </label>

      <AngleDial
        value={value}
        onChange={(v) => setAngleTry(v)}
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
              play('attention', t('angle.sound.revealed'));
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

      {shownVerdict && (
        <div data-testid="angle-feedback" data-correct={shownVerdict.correct} data-code={shownVerdict.code}>
          <Feedback
            silent
            correct={shownVerdict.correct}
            message={shownVerdict.correct ? t('angle.correct', { label, target: target.value !== undefined ? fmt(target.value) : `${fmt(target.range![0])}–${fmt(target.range![1])}`, source: sourceText }) : verdictText(t, shownVerdict, { central, formula, hint: lp ? t('angle.hint.lp') : t('angle.hint.spread') })}
            rule={shownVerdict.correct ? t('angle.rule', { tol: TOLERANCE }) : undefined}
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
              {verdict && (
                <tr className="border-b border-line">
                  <td className="px-3 py-1.5 text-muted">{t('angle.compare.you')}</td>
                  <td className="px-3 py-1.5 font-semibold">
                    <Deg value={Number(verdict.params.value)} />
                  </td>
                </tr>
              )}
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
