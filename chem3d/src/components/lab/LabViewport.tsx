import { useEffect, useState } from 'react';
import { mainAngle } from '../../chem/steps';
import { dataset } from '../../data';
import { useT } from '../../i18n';
import { useLab, type ViewMode } from '../../state/lab';
import { useSettings, type DisplayToggles } from '../../state/settings';
import { Segmented, ToggleChip } from '../ui/controls';
import { Axe, Formula, formulaText, Ltr } from '../ui/Formula';
import { shortCitation } from '../ui/RefCite';
import { SCREEN_COLORS } from '../viewer/constants';
import { LewisDiagram } from '../viewer/LewisDiagram';
import { MoleculeViewer } from '../viewer/MoleculeViewer';
import type { LabModel } from './useLabModel';

const SCREEN_LEWIS = {
  text: '#eef2fa',
  bond: '#dfe6f3',
  centralLp: SCREEN_COLORS.lonePair,
  terminalLp: '#b9c6de',
  accent: '#7c9bff',
  muted: '#9fb0cc',
};

export function LabViewport({ model }: { model: LabModel }) {
  const t = useT();
  const viewMode = useLab((s) => s.viewMode);
  const setViewMode = useLab((s) => s.setViewMode);
  const setGeometryMode = useLab((s) => s.setGeometryMode);
  const selectedAtom = useLab((s) => s.selectedAtom);
  const selectAtom = useLab((s) => s.selectAtom);
  const camera = useLab((s) => s.camera);
  const cameraTo = useLab((s) => s.cameraTo);
  const solveMode = useLab((s) => s.solveMode);
  const shapeRevealed = useLab((s) => s.shapeRevealed);
  const whyOpen = useLab((s) => s.whyOpen);
  const setWhyOpen = useLab((s) => s.setWhyOpen);
  const display = useSettings((s) => s.display);
  const toggle = useSettings((s) => s.toggle);
  const [demoKey, setDemoKey] = useState(0);
  const [demoSettled, setDemoSettled] = useState(false);
  const [resIdx, setResIdx] = useState(0);
  const [showCounts, setShowCounts] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { analysis, scene, experimental } = model;
  const v = analysis.vsepr;
  const mystery = solveMode && !shapeRevealed;
  const main = scene ? mainAngle(scene) : undefined;
  const resonance = analysis.lewis?.resonance ?? [];
  const structure = resonance[Math.min(resIdx, resonance.length - 1)];

  useEffect(() => setResIdx(0), [model.specKey]);
  useEffect(() => {
    setDemoSettled(false);
  }, [demoKey, whyOpen]);

  const toggles: { key: keyof DisplayToggles; label: string; swatch?: string }[] = [
    { key: 'bonds', label: t('lab.toggle.bonds') },
    { key: 'lonePairs', label: t('lab.toggle.lonePairs'), swatch: SCREEN_COLORS.lonePair },
    { key: 'terminalLonePairs', label: t('lab.toggle.terminalLonePairs') },
    { key: 'bondingPairs', label: t('lab.toggle.bondingPairs'), swatch: SCREEN_COLORS.bondingPair },
    { key: 'angles', label: t('lab.toggle.angles'), swatch: SCREEN_COLORS.angle },
    { key: 'allAngles', label: t('lab.toggle.allAngles') },
    { key: 'polyhedron', label: t('lab.toggle.polyhedron'), swatch: SCREEN_COLORS.polyhedron },
    { key: 'autoRotate', label: t('lab.toggle.autoRotate') },
  ];

  const expSource = experimental ? experimental.sources.map((id) => dataset.references.get(id)).filter(Boolean).map((r) => shortCitation(r!)).join('، ') : '';
  const ariaLabel = `${formulaText(model.formula, model.charge)}${v && !mystery ? ` — ${t(`mg.${v.molecularGeometry}`)}` : ''}`;

  return (
    <section className="relative isolate flex min-h-[66vh] flex-col overflow-hidden rounded-2xl border border-screen-line bg-screen text-screen-fg lg:min-h-0" data-testid="lab-viewport" aria-label={t('lab.title')}>
      <MoleculeViewer
        className="absolute inset-0"
        scene={analysis.ok ? scene : null}
        mode={viewMode === 'vsepr' ? 'vsepr' : 'shape'}
        mystery={mystery}
        selectedAtom={selectedAtom}
        onSelectAtom={selectAtom}
        camera={camera}
        demo={whyOpen && v ? { count: v.stericNumber, playKey: demoKey, onSettled: () => setDemoSettled(true) } : null}
        moleculeKey={model.specKey}
        ariaLabel={ariaLabel}
      />

      {/* top bar */}
      <div className="pointer-events-none relative z-10 flex flex-wrap items-start justify-between gap-2 p-2.5">
        <div className="pointer-events-auto">
          <Segmented<ViewMode>
            tone="screen"
            size="sm"
            label={t('lab.viewModeLabel')}
            value={viewMode}
            onChange={(m) => {
              setViewMode(m);
              setWhyOpen(false);
            }}
            options={[
              { value: 'lewis', label: t('lab.view.lewis') },
              { value: 'vsepr', label: t('lab.view.vsepr') },
              { value: 'shape', label: t('lab.view.shape') },
            ]}
          />
        </div>
        <div className={`pointer-events-auto flex flex-col items-end gap-1 ${viewMode === 'lewis' ? 'invisible' : ''}`}>
          <Segmented
            tone="screen"
            size="sm"
            label={t('lab.geomLabel')}
            value={model.geometryMode}
            onChange={(m) => setGeometryMode(m)}
            options={[
              { value: 'ideal', label: t('lab.geom.ideal') },
              { value: 'experimental', label: t('lab.geom.experimental'), disabled: !experimental, title: experimental ? undefined : t('lab.geom.noExp') },
            ]}
          />
        </div>
      </div>

      {/* summary */}
      {analysis.ok && v && viewMode !== 'lewis' && !whyOpen && (
        <div className="pointer-events-none relative z-10 mx-2.5 flex max-w-[min(100%,340px)] flex-col gap-1 self-start rounded-xl bg-screen-2/80 px-3 py-1.5 text-sm backdrop-blur-sm md:py-2" data-testid="viewport-summary">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold">
              <Formula formula={model.formula} charge={model.charge} />
            </span>
            {!mystery && (
              <span className="text-screen-muted md:hidden">
                {t(`mg.${v.molecularGeometry}`)}
                {main && (
                  <>
                    {' · '}
                    <bdi dir="ltr" className="tabular font-mono">
                      {main.value.toFixed(1)}°
                    </bdi>
                  </>
                )}
              </span>
            )}
          </div>
          {!mystery ? (
            <div className="hidden flex-col gap-1 md:flex">
              <div>
                <span className="text-screen-muted">{t('lab.summary.axe')}: </span>
                <Axe axe={v.axe} />
              </div>
              <div>
                <span className="text-screen-muted">{t('lab.summary.shape')}: </span>
                <span className="font-semibold" data-testid="summary-shape">
                  {t(`mg.${v.molecularGeometry}`)}
                </span>
              </div>
              {main && (
                <div>
                  <span className="text-screen-muted">{t('lab.summary.angle')}: </span>
                  <Ltr className="font-mono">{main.label}</Ltr>{' '}
                  <bdi dir="ltr" className="tabular font-mono font-semibold">
                    {main.value.toFixed(2)}°
                  </bdi>
                </div>
              )}
              <div className="text-xs text-screen-muted">{model.geometryMode === 'experimental' ? t('lab.geom.expNote', { source: expSource }) : experimental ? t('lab.geom.idealNote') : t('lab.geom.noExp')}</div>
            </div>
          ) : (
            <div className="text-screen-muted">{t('lab.hiddenShapeHint')}</div>
          )}
        </div>
      )}

      {/* Lewis view */}
      {viewMode === 'lewis' && structure && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center gap-2 bg-screen px-4 pb-16" data-testid="lewis-view">
          {mystery ? (
            <p className="m-auto max-w-sm text-center text-screen-muted">{t('lab.hiddenShapeHint')}</p>
          ) : (
            <>
              <div className="min-h-0 w-full max-w-xl flex-1">
                <LewisDiagram structure={structure} charge={model.charge} selectedAtom={selectedAtom} onSelectAtom={selectAtom} showCounts={showCounts} colors={SCREEN_LEWIS} title={`${t('lewis.title')} ${formulaText(model.formula, model.charge)}`} />
              </div>
              {resonance.length > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <button type="button" className="rounded-lg border border-screen-line px-2 py-0.5" onClick={() => setResIdx((i) => (i - 1 + resonance.length) % resonance.length)} aria-label={t('lewis.prevResonance')}>
                    ‹
                  </button>
                  <span>{t('lewis.resonance', { i: resIdx + 1, n: resonance.length })}</span>
                  <button type="button" className="rounded-lg border border-screen-line px-2 py-0.5" onClick={() => setResIdx((i) => (i + 1) % resonance.length)} aria-label={t('lewis.nextResonance')}>
                    ›
                  </button>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-screen-muted">
                <input type="checkbox" checked={showCounts} onChange={(e) => setShowCounts(e.target.checked)} />
                {t('lewis.showCounts')}
              </label>
              <p className="max-w-md text-center text-xs text-screen-muted">{t('lewis.note')}</p>
            </>
          )}
        </div>
      )}

      {/* hidden-shape banner */}
      {mystery && viewMode !== 'lewis' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 mx-auto w-fit max-w-[90%] rounded-xl bg-screen-2/90 px-3 py-2 text-center text-sm" data-testid="hidden-shape">
          {t('lab.hiddenShape')}
        </div>
      )}

      {/* "why" illustration card */}
      {whyOpen && v && (
        <div className="absolute inset-x-2.5 bottom-20 z-20 max-w-md rounded-2xl border border-screen-line bg-screen-2/95 p-3.5 text-sm shadow-xl sm:inset-x-auto sm:start-2.5" data-testid="why-card">
          <h3 className="mb-1 font-bold">{t('lab.why.title')}</h3>
          <p className="text-screen-muted">{t('lab.why.body')}</p>
          <p className="mt-2 font-semibold">{demoSettled ? t('lab.why.settled', { n: v.stericNumber, eg: t(`eg.${v.electronGeometry}`) }) : t('lab.why.running')}</p>
          {demoSettled && v.lonePairs > 0 && <p className="mt-1">{t('lab.why.lpRule', { e: v.lonePairs, mg: t(`mg.${v.molecularGeometry}`) })}</p>}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg border border-screen-line px-3 py-1" onClick={() => setDemoKey((k) => k + 1)}>
              {t('lab.why.replay')}
            </button>
            <button
              type="button"
              className="rounded-lg bg-screen-fg px-3 py-1 font-semibold text-screen"
              onClick={() => {
                setWhyOpen(false);
                setViewMode('vsepr');
              }}
            >
              {t('lab.why.stop')}
            </button>
          </div>
        </div>
      )}

      {/* bottom toolbar */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 bg-gradient-to-t from-screen via-screen/85 to-transparent p-2.5 pt-6">
        {viewMode !== 'lewis' && (
          <div className={`${showOptions ? 'flex' : 'hidden'} flex-wrap items-center gap-1.5 rounded-xl bg-screen-2/95 p-2 md:flex md:bg-transparent md:p-0`} id="display-options">
            {toggles.map((tg) => (
              <ToggleChip key={tg.key} pressed={display[tg.key]} onToggle={() => toggle(tg.key)} swatch={tg.swatch}>
                {tg.label}
              </ToggleChip>
            ))}
            {(['front', 'top', 'side'] as const).map((p) => (
              <button key={p} type="button" onClick={() => cameraTo(p)} className="rounded-lg border border-screen-line bg-screen-2/80 px-2.5 py-1 text-[13px] text-screen-fg hover:bg-white/10 md:hidden">
                {t(`lab.camera.${p}`)}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {viewMode !== 'lewis' && (
            <>
              <button
                type="button"
                onClick={() => setShowOptions((o) => !o)}
                aria-expanded={showOptions}
                aria-controls="display-options"
                className="rounded-lg border border-screen-line bg-screen-2/80 px-2.5 py-1 text-[13px] font-semibold text-screen-fg md:hidden"
              >
                {t('lab.options')}
              </button>
              {(['reset', 'front', 'top', 'side'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => cameraTo(p)}
                  className={`rounded-lg border border-screen-line bg-screen-2/80 px-2.5 py-1 text-[13px] text-screen-fg hover:bg-white/10 ${p === 'reset' ? '' : 'hidden md:inline-block'}`}
                  data-testid={`camera-${p}`}
                >
                  {t(`lab.camera.${p}`)}
                </button>
              ))}
              {v && !mystery && (
                <button
                  type="button"
                  onClick={() => {
                    setWhyOpen(!whyOpen);
                    setDemoKey((k) => k + 1);
                  }}
                  aria-pressed={whyOpen}
                  className="rounded-lg border border-lp/60 bg-lp/20 px-2.5 py-1 text-[13px] font-semibold text-screen-fg hover:bg-lp/30"
                  data-testid="why-button"
                >
                  {t('lab.why')}
                </button>
              )}
            </>
          )}
          <span className="ms-auto hidden text-xs text-screen-muted md:inline">{t('lab.dragHint')}</span>
        </div>
      </div>
    </section>
  );
}
