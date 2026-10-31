import { useMemo, useState } from 'react';
import { VideoHelpButton } from '../components/ui/VideoModal';
import { diagnoseAngle, diagnoseElectronGeometry, diagnoseMolecularGeometry } from '../chem/diagnose';
import { buildSceneModel } from '../chem/geometry';
import { analysisOf } from '../chem/questions';
import { mainAngle } from '../chem/steps';
import type { AngleSignatureId, ElectronGeometryId, MolecularGeometryId } from '../chem/types';
import { diagnosisMessage } from '../components/lab/messages';
import { Button, Card } from '../components/ui/controls';
import { Feedback } from '../components/ui/Feedback';
import { useCue } from '../components/ui/useCue';
import { Deg, Formula, Ltr } from '../components/ui/Formula';
import { AngleDial } from '../components/ui/AngleDial';
import { RefCite } from '../components/ui/RefCite';
import { ShapeIcon } from '../components/ui/ShapeIcon';
import { MoleculeViewer } from '../components/viewer/MoleculeViewer';
import { dataset } from '../data';
import { ELECTRON_GEOMETRIES, MOLECULAR_GEOMETRIES } from '../data/schema';
import { useLang, useT } from '../i18n';
import { useHistory } from '../state/history';

const ANGLES: AngleSignatureId[] = ['a180', 'a120', 'lt120', 'approx120', 'a109', 'lt109', 'a90-120-180', 'lt90-lt120', 'lt90', 'a90-180'];

function ChoiceGrid<T extends string>({ id, label, value, onChange, options, render, icon, disabled }: { id: string; label: string; value: T | ''; onChange: (v: T) => void; options: readonly T[]; render: (v: T) => string; icon?: 'mg' | 'eg'; disabled?: boolean }) {
  return (
    <fieldset className="flex flex-col gap-1.5" data-testid={id} data-value={value}>
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div role="radiogroup" aria-label={label} className={`grid gap-1.5 ${icon ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-2'}`}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            disabled={disabled}
            onClick={() => onChange(o)}
            className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-start text-[13px] leading-5 transition-colors active:scale-[0.98] disabled:opacity-60 pointer-coarse:min-h-12 ${
              value === o ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line bg-surface hover:bg-surface-2'
            }`}
            data-testid={`${id}-${o}`}
          >
            {icon && <ShapeIcon shape={o} kind={icon} size={30} />}
            <span>{render(o)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function pickRandom(includeIons: boolean, avoid?: string) {
  const pool = dataset.molecules.filter((m) => (includeIons || m.charge === 0) && m.id !== avoid);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function PredictPage() {
  const t = useT();
  const play = useCue();
  const lang = useLang();
  const addPrediction = useHistory((s) => s.addPrediction);
  const [includeIons, setIncludeIons] = useState(false);
  const [id, setId] = useState(() => pickRandom(false));
  const [eg, setEg] = useState<ElectronGeometryId | ''>('');
  const [mg, setMg] = useState<MolecularGeometryId | ''>('');
  const [angle, setAngle] = useState<AngleSignatureId | ''>('');
  const [estimate, setEstimate] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [warn, setWarn] = useState(false);

  const m = dataset.moleculesById.get(id)!;
  const a = analysisOf(m);
  const v = a.vsepr!;
  const scene = useMemo(() => buildSceneModel(a, { mode: m.experimental ? 'experimental' : 'ideal', experimental: m.experimental }), [a, m]);
  const main = mainAngle(scene);

  const results = revealed && eg && mg && angle
    ? {
        eg: diagnoseElectronGeometry(eg, a),
        mg: diagnoseMolecularGeometry(mg, a),
        angle: diagnoseAngle(angle, a),
      }
    : null;
  const roundScore = results ? [results.eg, results.mg, results.angle].filter((d) => d.correct).length * 10 : 0;

  const next = () => {
    setId(pickRandom(includeIons, id));
    setEg('');
    setMg('');
    setAngle('');
    setEstimate('');
    setRevealed(false);
    setWarn(false);
  };

  const reveal = () => {
    if (!eg || !mg || !angle) {
      setWarn(true);
      return;
    }
    setWarn(false);
    setRevealed(true);
    const r = { eg: diagnoseElectronGeometry(eg, a), mg: diagnoseMolecularGeometry(mg, a), angle: diagnoseAngle(angle, a) };
    const score = [r.eg, r.mg, r.angle].filter((d) => d.correct).length * 10;
    play(score === 30 ? 'correct' : 'wrong', score === 30 ? undefined : t('pr.sound.partial', { n: score / 10 }));
    setTotal((x) => x + score);
    setStreak((s) => (score === 30 ? s + 1 : 0));
    addPrediction({ formula: m.formula, score, egCorrect: r.eg.correct, mgCorrect: r.mg.correct, angleCorrect: r.angle.correct });
  };

  const est = Number(estimate);
  const hasEstimate = estimate !== '' && Number.isFinite(est);

  return (
    <div className="gutter mx-auto max-w-6xl py-6" data-testid="predict-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold">{t('pr.title')}</h1>
            <VideoHelpButton chapter="predict" />
          </div>
          <p className="mt-1 max-w-2xl text-muted">{t('pr.intro')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeIons} onChange={(e) => setIncludeIons(e.target.checked)} />
            {t('pr.includeIons')}
          </label>
          <Button variant="secondary" onClick={next} data-testid="predict-random">
            {t('pr.random')}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="relative">
          <MoleculeViewer
            className="relative h-[46vh] min-h-[320px] w-full rounded-2xl border border-screen-line"
            scene={scene}
            mode="shape"
            mystery={!revealed}
            display={{ angles: revealed, lonePairs: true, autoRotate: false }}
            moleculeKey={id}
            ariaLabel={t('ch.mystery')}
          />
          <div className="pointer-events-none absolute start-3 top-3 rounded-xl bg-screen-2/85 px-3 py-2 text-screen-fg">
            <div className="text-2xl font-bold">
              <Formula formula={m.formula} charge={m.charge} />
            </div>
            <div className="text-sm text-screen-muted">{m.name[lang]}</div>
          </div>
        </div>

        <Card className="flex flex-col gap-4 p-4">
          <ChoiceGrid id="predict-eg" label={t('pr.eg')} value={eg} onChange={setEg} options={ELECTRON_GEOMETRIES} render={(o) => t(`eg.${o}`)} icon="eg" disabled={revealed} />
          <ChoiceGrid id="predict-mg" label={t('pr.mg')} value={mg} onChange={setMg} options={MOLECULAR_GEOMETRIES} render={(o) => t(`mg.${o}`)} icon="mg" disabled={revealed} />
          <ChoiceGrid id="predict-angle" label={t('pr.angle')} value={angle} onChange={setAngle} options={ANGLES} render={(o) => t(`sig.${o}`)} disabled={revealed} />
          {main && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">
                {t('pr.angleDial')} <Ltr className="font-mono font-normal">{main.label}</Ltr>
              </span>
              <AngleDial value={estimate === '' ? null : Number(estimate)} onChange={(v) => setEstimate(String(v))} label={`${t('pr.estimate')} ${main.label}`} disabled={revealed} testId="predict-estimate" />
            </div>
          )}
          {warn && <p className="text-sm text-warn">{t('pr.needAll')}</p>}
          {!revealed ? (
            <Button onClick={reveal} data-testid="predict-reveal">
              {t('pr.reveal')}
            </Button>
          ) : (
            <Button onClick={next}>{t('pr.next')}</Button>
          )}
          <p className="text-sm text-muted">{t('pr.total', { score: total, streak })}</p>
        </Card>
      </div>

      {results && (
        <section className="mt-5 flex flex-col gap-3" data-testid="predict-results">
          <h2 className="text-lg font-bold">{t('pr.roundScore', { n: roundScore })}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {(['eg', 'mg', 'angle'] as const).map((k) => (
              <Feedback key={k} silent correct={results[k].correct} message={results[k].correct ? t(k === 'eg' ? 'diag.correct.electron-geometry' : k === 'mg' ? 'diag.correct.molecular-geometry' : 'diag.correct.bond-angle') : diagnosisMessage(t, results[k], a)} />
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t('pr.table.item')}</th>
                  <th className="px-3 py-2 text-start font-medium">{t('pr.table.you')}</th>
                  <th className="px-3 py-2 text-start font-medium">{t('pr.table.model')}</th>
                  <th className="px-3 py-2 text-start font-medium">{t('pr.table.exp')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="px-3 py-2">{t('pr.eg')}</td>
                  <td className="px-3 py-2">{t(`eg.${eg as ElectronGeometryId}`)}</td>
                  <td className="px-3 py-2 font-semibold">{t(`eg.${v.electronGeometry}`)}</td>
                  <td className="px-3 py-2 text-muted">—</td>
                </tr>
                <tr className="border-t border-line">
                  <td className="px-3 py-2">{t('pr.mg')}</td>
                  <td className="px-3 py-2">{t(`mg.${mg as MolecularGeometryId}`)}</td>
                  <td className="px-3 py-2 font-semibold">{t(`mg.${v.molecularGeometry}`)}</td>
                  <td className="px-3 py-2">{m.experimental ? <span className="font-mono">{m.experimental.pointGroup}</span> : <span className="text-muted">{t('pr.noExp')}</span>}</td>
                </tr>
                <tr className="border-t border-line">
                  <td className="px-3 py-2">{t('pr.angle')}</td>
                  <td className="px-3 py-2">{t(`sig.${angle as AngleSignatureId}`)}</td>
                  <td className="px-3 py-2 font-semibold">{t(`sig.${v.angleSignature}`)}</td>
                  <td className="px-3 py-2">
                    {m.experimental && main ? (
                      <>
                        <Ltr className="font-mono">{main.label}</Ltr> <Deg value={main.value} className="font-semibold" />
                      </>
                    ) : (
                      <span className="text-muted">{t('pr.noExp')}</span>
                    )}
                  </td>
                </tr>
                {hasEstimate && main && (
                  <tr className="border-t border-line">
                    <td className="px-3 py-2">{t('pr.estimateRow')}</td>
                    <td className="px-3 py-2">
                      <Deg value={est} />
                    </td>
                    <td className="px-3 py-2 text-muted">{t(`sig.${v.angleSignature}`)}</td>
                    <td className="px-3 py-2">{m.experimental ? <Deg value={main.value} /> : t('pr.noExp')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasEstimate && main && m.experimental && <p className="text-sm text-muted">{t('pr.estimateNote', { diff: Math.abs(est - main.value).toFixed(1) })}</p>}
          {hasEstimate && main && m.experimental && m.textbook && m.textbook.angles.some((b) => Math.abs(est - b) < 0.6 && Math.abs(b - main.value) > 0.5) && (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn" data-testid="predict-book-note">
              {t('book.estimateBook', { value: `${est}°`, measured: `${Number(main.value.toFixed(2))}°` })}
            </p>
          )}
          {m.experimental && (
            <p className="text-xs text-muted">
              {t('common.sources')}: <RefCite ids={m.experimental.sources} />
            </p>
          )}
        </section>
      )}
    </div>
  );
}
