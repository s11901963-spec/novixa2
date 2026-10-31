import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSceneModel } from '../../chem/geometry';
import { mainAngle } from '../../chem/steps';
import { dataset } from '../../data';
import { useLang, useT } from '../../i18n';
import { useLab, type ViewMode } from '../../state/lab';
import { useSettings, type DisplayToggles } from '../../state/settings';
import { Segmented, ToggleChip } from '../ui/controls';
import { DraggablePanel } from '../ui/DraggablePanel';
import { VideoHelpButton } from '../ui/VideoModal';
import { useCue } from '../ui/useCue';
import { useRepeat } from '../ui/useRepeat';
import { Axe, Formula, formulaText, Ltr } from '../ui/Formula';
import { shortCitation } from '../ui/RefCite';
import { SCREEN_COLORS } from '../viewer/constants';
import { LewisDiagram } from '../viewer/LewisDiagram';
import type { BendConfig } from '../viewer/MoleculeModel';
import { AngleDemo } from './AngleDemo';
import { MoleculeViewer } from '../viewer/MoleculeViewer';
import { useAngleChallenge } from './useAngleChallenge';
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
  const lang = useLang();
  const viewMode = useLab((s) => s.viewMode);
  const setViewMode = useLab((s) => s.setViewMode);
  const setGeometryMode = useLab((s) => s.setGeometryMode);
  const selectedAtom = useLab((s) => s.selectedAtom);
  const selectAtom = useLab((s) => s.selectAtom);
  const camera = useLab((s) => s.camera);
  const cameraTo = useLab((s) => s.cameraTo);
  const tab = useLab((s) => s.tab);
  const shapeRevealed = useLab((s) => s.shapeRevealed);
  const stage = useRef<HTMLDivElement>(null);
  const [narrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
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
  const mystery = tab === 'practice' && !shapeRevealed;
  const setAngleTry = useLab((s) => s.setAngleTry);
  const setTab = useLab((s) => s.setTab);
  // Someone touching the model in another tab is pointed to the tab where touch changes the angle.
  const [tabNudge, setTabNudge] = useState(false);
  const nudgedAt = useRef(0);
  // "Show me how" on the model, and the screen position of atoms it needs.
  const [demoOn, setDemoOn] = useState(false);
  const probe = useRef<((atom: number) => { x: number; y: number } | null) | null>(null);
  const minusBtn = useRef<HTMLButtonElement>(null);
  const plusBtn = useRef<HTMLButtonElement>(null);
  const angleLive = useSettings((s) => s.angleLive);
  const challenge = useAngleChallenge(model);
  const [bentOnce, setBentOnce] = useState(false);

  // "Change the angle yourself" in the model: drag an outer atom, the angle follows the finger.
  const ex = model.explorer;
  const bending = tab === 'angle' && model.exploring && !!ex && viewMode !== 'lewis' && !whyOpen;
  const haptics = useSettings((s) => s.haptics);
  const buzz = (ms: number) => {
    if (haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
  };
  const bendInfo = useMemo(() => {
    if (!bending || !ex || !analysis.ok) return null;
    const positionsFor = (th: number) => buildSceneModel(analysis, { mode: model.geometryMode, experimental, layout: ex.layout(th) }).atoms.map((a) => a.position);
    // Only atoms that move with the angle can be grabbed; the hint names the first of them.
    const lo = positionsFor(ex.min);
    const hi = positionsFor(ex.max);
    const movable = lo.flatMap((p, i) => (i > 0 && Math.hypot(p[0] - hi[i][0], p[1] - hi[i][1], p[2] - hi[i][2]) > 1e-3 ? [i] : []));
    const config: BendConfig = {
      min: ex.min,
      max: ex.max,
      step: 0.5,
      positionsFor,
      movable,
      hint: !bentOnce,
      onChange: (th) => {
        setAngleTry(th);
        setBentOnce(true);
      },
      onGrab: () => buzz(12),
      probe,
    };
    return { config, atom: movable.length ? analysis.spec.ligands[movable[0] - 1] : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bending, ex, analysis, model.geometryMode, experimental, setAngleTry, bentOnce, haptics]);
  // − / + on the model itself (hold to keep changing): reads the newest value on every repeat.
  const repeat = useRepeat();
  const nudge = (d: number) => {
    if (!ex) return;
    const cur = useLab.getState().angleTry ?? ex.start;
    setAngleTry(Math.min(ex.max, Math.max(ex.min, Math.round((cur + d) * 2) / 2)));
    setBentOnce(true);
  };
  const live = bending && challenge ? (angleLive ? (challenge.hit ? 'ok' : 'bad') : 'off') : null;
  // The moment the angle becomes right: a short buzz on phones, the chime and «إجابة صحيحة»
  // (at most every few seconds, so moving around the right value does not keep repeating it).
  const play = useCue();
  const wasLive = useRef(live);
  const saidAt = useRef(0);
  useEffect(() => {
    if (live === 'ok' && wasLive.current === 'bad') {
      buzz(25);
      if (!demoOn && Date.now() - saidAt.current > 4000) {
        saidAt.current = Date.now();
        play('correct');
      }
    }
    wasLive.current = live;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);
  const main = scene ? mainAngle(scene) : undefined;
  const resonance = analysis.lewis?.resonance ?? [];
  const structure = resonance[Math.min(resIdx, resonance.length - 1)];

  useEffect(() => {
    setResIdx(0);
    setBentOnce(false);
  }, [model.specKey]);
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

  const expSource = experimental ? experimental.sources.map((id) => dataset.references.get(id)).filter(Boolean).map((r) => shortCitation(r!, lang)).join('، ') : '';
  const ariaLabel = `${formulaText(model.formula, model.charge)}${v && !mystery ? ` — ${t(`mg.${v.molecularGeometry}`)}` : ''}`;

  const shapeName = v ? t(`mg.${v.molecularGeometry}`) : '';
  const angleLine = main ? `${main.value.toFixed(1)}°` : '';

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-screen-line bg-screen text-screen-fg" data-testid="lab-viewport" aria-label={t('lab.title')}>
      <div
        ref={stage}
        className={`relative isolate flex-1 lg:min-h-0 ${tab === 'angle' ? 'min-h-[46vh]' : tab === 'practice' ? 'min-h-[42vh]' : 'min-h-[50vh]'}`}
        onPointerDownCapture={(e) => {
          if (tab === 'angle' || Date.now() - nudgedAt.current < 20000 || !ex || viewMode === 'lewis' || whyOpen || (e.target as HTMLElement).tagName !== 'CANVAS') return;
          nudgedAt.current = Date.now();
          setTabNudge(true);
          window.setTimeout(() => setTabNudge(false), 6000);
        }}
      >
        {demoOn && bending && bendInfo && challenge && (
          <AngleDemo
            stage={stage}
            probe={probe}
            atoms={bendInfo.config.movable}
            atomName={bendInfo.atom ?? ''}
            min={bendInfo.config.min}
            max={bendInfo.config.max}
            target={challenge.goal}
            minus={minusBtn}
            plus={plusBtn}
            onDone={() => setDemoOn(false)}
          />
        )}
        {tabNudge && tab !== 'angle' && (
          <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-3">
            <button
              type="button"
              className="pointer-events-auto rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-fg shadow-lg pointer-coarse:min-h-11"
              onClick={() => {
                setTabNudge(false);
                setTab('angle');
              }}
              data-testid="angle-tab-nudge"
            >
              <span aria-hidden>📐 </span>
              {t('angle.tabNudge')}
            </button>
          </div>
        )}
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
          bend={bendInfo?.config}
          angleTone={ex && (live === 'ok' || live === 'bad') ? { kind: ex.kind, tone: live } : null}
        />

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start justify-between gap-2 p-2.5">
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
          {live && challenge ? (
            // Right or wrong, live, while the angle changes; − / + change it right here on the model.
            <div className="flex flex-col items-end gap-1" data-testid="angle-live" data-live={live} data-value={challenge.value}>
              <div dir="ltr" className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-screen-line bg-screen-2/90 text-xl font-bold text-screen-fg shadow-lg select-none active:scale-95 active:bg-white/25 pointer-coarse:h-11 pointer-coarse:w-11"
                  aria-label={t('angle.nudge.down')}
                  title={t('angle.nudge.down')}
                  ref={minusBtn}
                  data-testid="angle-live-minus"
                  {...repeat(() => nudge(-0.5))}
                >
                  −
                </button>
                <span
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow-lg transition-colors pointer-coarse:py-2 ${
                    live === 'ok' ? 'bg-[#22c55e] text-[#04210f]' : live === 'bad' ? 'bg-[#f05252] text-white' : 'bg-[#ffc44d] text-[#1d1300]'
                  }`}
                  aria-label={live === 'off' ? `${t('angle.yourAngle')} ${challenge.value}°` : t('angle.live.aria', { value: challenge.value, verdict: live === 'ok' ? t('angle.live.ok') : t('angle.live.bad') })}
                >
                  <span aria-hidden>{live === 'ok' ? '✅' : live === 'bad' ? '❌' : '📐'}</span>
                  {live !== 'off' && <span>{live === 'ok' ? t('angle.live.ok') : t('angle.live.bad')}</span>}
                  <bdi dir="ltr" className="tabular font-mono">
                    {challenge.value.toFixed(1)}°
                  </bdi>
                </span>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-screen-line bg-screen-2/90 text-xl font-bold text-screen-fg shadow-lg select-none active:scale-95 active:bg-white/25 pointer-coarse:h-11 pointer-coarse:w-11"
                  aria-label={t('angle.nudge.up')}
                  title={t('angle.nudge.up')}
                  ref={plusBtn}
                  data-testid="angle-live-plus"
                  {...repeat(() => nudge(0.5))}
                >
                  +
                </button>
              </div>
              {!bentOnce && bendInfo?.atom && (
                <span className="rounded-full bg-screen-2/90 px-2.5 py-0.5 text-xs text-screen-fg shadow" data-testid="angle-drag-hint">
                  <span aria-hidden>👆 </span>
                  {t('angle.dragHint', { atom: bendInfo.atom })}
                </span>
              )}
              {!bentOnce && bendInfo?.atom && (
                <button
                  type="button"
                  className="pointer-events-auto rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-fg shadow-lg pointer-coarse:min-h-10 pointer-coarse:px-4 pointer-coarse:text-sm"
                  onClick={() => setDemoOn(true)}
                  data-testid="angle-demo-start"
                >
                  {t('angle.demo.button')}
                </button>
              )}
            </div>
          ) : (
            <div className={`pointer-events-auto flex flex-col items-end gap-1 ${viewMode === 'lewis' || model.exploring ? 'invisible' : ''}`}>
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
          )}
        </div>

        {/* Lewis view replaces the 3D canvas */}
        {viewMode === 'lewis' && structure && (
          <div className="absolute inset-0 z-10 flex flex-col items-center gap-2 overflow-y-auto bg-screen px-4 pt-14 pb-4" data-testid="lewis-view">
            {mystery ? (
              <p className="m-auto max-w-sm text-center text-screen-muted">{t('lab.hiddenShapeHint')}</p>
            ) : (
              <>
                <div className="min-h-[220px] w-full max-w-xl flex-1">
                  <LewisDiagram structure={structure} charge={model.charge} selectedAtom={selectedAtom} onSelectAtom={selectAtom} showCounts={showCounts} colors={SCREEN_LEWIS} title={`${t('lewis.title')} ${formulaText(model.formula, model.charge)}`} />
                </div>
                {resonance.length > 1 && (
                  <div className="flex items-center gap-2 text-sm">
                    <button type="button" className="rounded-lg border border-screen-line px-2 py-0.5 pointer-coarse:min-h-10 pointer-coarse:px-3" onClick={() => setResIdx((i) => (i - 1 + resonance.length) % resonance.length)} aria-label={t('lewis.prevResonance')}>
                      ‹
                    </button>
                    <span>{t('lewis.resonance', { i: resIdx + 1, n: resonance.length })}</span>
                    <button type="button" className="rounded-lg border border-screen-line px-2 py-0.5 pointer-coarse:min-h-10 pointer-coarse:px-3" onClick={() => setResIdx((i) => (i + 1) % resonance.length)} aria-label={t('lewis.nextResonance')}>
                      ›
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-screen-muted">
                  <input type="checkbox" className="h-5 w-5" checked={showCounts} onChange={(e) => setShowCounts(e.target.checked)} />
                  {t('lewis.showCounts')}
                </label>
                <p className="max-w-md text-center text-xs text-screen-muted">{t('lewis.note')}</p>
              </>
            )}
          </div>
        )}

        {/* info card: can be dragged aside or folded so it never hides the molecule */}
        {analysis.ok && v && viewMode !== 'lewis' && !whyOpen && (
          <DraggablePanel
            bounds={stage}
            title={t('lab.summary.title')}
            defaultCollapsed={narrow}
            placement={narrow ? 'bottom-start' : 'top-start'}
            className={narrow ? 'max-w-[62%]' : ''}
            testId="viewport-summary"
            folded={
              <span className="flex items-baseline gap-1.5 truncate">
                <Formula formula={model.formula} charge={model.charge} className="font-bold" />
                <span className="truncate text-xs text-screen-muted">
                  {mystery ? t('lab.hiddenShape') : `${shapeName}${angleLine ? ` · ` : ''}`}
                  {!mystery && angleLine && (
                    <bdi dir="ltr" className="tabular font-mono">
                      {angleLine}
                    </bdi>
                  )}
                </span>
              </span>
            }
          >
            <div className="flex flex-col gap-1">
              <span className="text-lg font-bold">
                <Formula formula={model.formula} charge={model.charge} />
              </span>
              {mystery ? (
                <div className="text-screen-muted" data-testid="hidden-shape">
                  {t('lab.hiddenShapeHint')}
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-screen-muted">{t('lab.summary.axe')}: </span>
                    <Axe axe={v.axe} />
                  </div>
                  <div>
                    <span className="text-screen-muted">{t('lab.summary.shape')}: </span>
                    <span className="font-semibold" data-testid="summary-shape">
                      {shapeName}
                    </span>
                  </div>
                  {main && (
                    <div>
                      <span className="text-screen-muted">{model.exploring ? t('angle.yourAngle') : t('lab.summary.angle')}: </span>
                      <Ltr className="font-mono">{main.label}</Ltr>{' '}
                      <bdi dir="ltr" className="tabular font-mono font-semibold">
                        {main.value.toFixed(2)}°
                      </bdi>
                    </div>
                  )}
                  <div className="text-xs text-screen-muted">
                    {model.exploring ? t('angle.notMeasured') : model.geometryMode === 'experimental' ? t('lab.geom.expNote', { source: expSource }) : experimental ? t('lab.geom.idealNote') : t('lab.geom.noExp')}
                  </div>
                </>
              )}
            </div>
          </DraggablePanel>
        )}
      </div>

      {/* "why" illustration: below the view, not on top of it */}
      {whyOpen && v && (
        <div className="border-t border-screen-line bg-screen-2 p-3.5 text-sm" data-testid="why-card">
          <h3 className="mb-1 font-bold">{t('lab.why.title')}</h3>
          <p className="text-screen-muted">{t('lab.why.body')}</p>
          <p className="mt-2 font-semibold">{demoSettled ? t('lab.why.settled', { n: v.stericNumber, eg: t(`eg.${v.electronGeometry}`) }) : t('lab.why.running')}</p>
          {demoSettled && v.lonePairs > 0 && <p className="mt-1">{t('lab.why.lpRule', { e: v.lonePairs, mg: t(`mg.${v.molecularGeometry}`) })}</p>}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg border border-screen-line px-3 py-1 pointer-coarse:min-h-10" onClick={() => setDemoKey((k) => k + 1)}>
              {t('lab.why.replay')}
            </button>
            <button
              type="button"
              className="rounded-lg bg-screen-fg px-3 py-1 font-semibold text-screen pointer-coarse:min-h-10"
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

      {/* toolbar under the view */}
      <div className="flex flex-col gap-1.5 border-t border-screen-line bg-screen-2/60 p-2.5">
        {bending && ex && challenge && (
          // The simplest way on a phone: a slider right under the model.
          <label className="flex items-center gap-2.5 text-sm text-screen-fg">
            <span className="shrink-0 font-semibold">{t('angle.slider')}</span>
            <input
              type="range"
              min={ex.min}
              max={ex.max}
              step={0.5}
              value={challenge.value}
              onChange={(e) => {
                setAngleTry(Number(e.target.value));
                setBentOnce(true);
              }}
              className="h-8 min-w-0 flex-1 cursor-pointer accent-[#ffc44d] pointer-coarse:h-11"
              aria-valuetext={`${challenge.value}°`}
              data-testid="angle-slider"
            />
            <bdi dir="ltr" className="w-14 shrink-0 text-center font-mono font-semibold tabular">
              {challenge.value.toFixed(1)}°
            </bdi>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-accent/60 bg-accent/25 px-2.5 py-1 text-[13px] font-semibold text-screen-fg hover:bg-accent/40 pointer-coarse:min-h-10"
              onClick={() => setDemoOn(true)}
              data-testid="angle-demo-start-toolbar"
            >
              {t('angle.demo.button')}
            </button>
          </label>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {viewMode !== 'lewis' && (
            <>
              <button
                type="button"
                onClick={() => setShowOptions((o) => !o)}
                aria-expanded={showOptions}
                aria-controls="display-options"
                className={`rounded-lg border px-2.5 py-1 text-[13px] font-semibold pointer-coarse:min-h-10 ${showOptions ? 'border-screen-fg bg-screen-fg text-screen' : 'border-screen-line bg-screen-2/80 text-screen-fg'}`}
                data-testid="display-options-toggle"
              >
                {t('lab.options')} {showOptions ? '▴' : '▾'}
              </button>
              {(['reset', 'front', 'top', 'side'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => cameraTo(p)}
                  className={`rounded-lg border border-screen-line bg-screen-2/80 px-2.5 py-1 text-[13px] text-screen-fg hover:bg-white/10 pointer-coarse:min-h-10 ${p === 'reset' ? '' : 'hidden sm:inline-block'}`}
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
                  className="rounded-lg border border-lp/60 bg-lp/20 px-2.5 py-1 text-[13px] font-semibold text-screen-fg hover:bg-lp/30 pointer-coarse:min-h-10"
                  data-testid="why-button"
                >
                  {t('lab.why')}
                </button>
              )}
            </>
          )}
          {tab === 'angle' ? (
            <VideoHelpButton angle tone="screen" />
          ) : (
            <VideoHelpButton chapter={tab === 'practice' ? 'practice' : tab === 'solution' ? 'solution' : tab === 'builder' ? 'builder' : tab === 'atom' ? 'views' : 'lab'} tone="screen" />
          )}
          <span className="ms-auto hidden text-xs text-screen-muted md:pointer-fine:inline">{bending ? t('angle.mouseHint') : t('lab.dragHint')}</span>
        </div>
        {viewMode !== 'lewis' && showOptions && (
          <div className="flex flex-wrap items-center gap-1.5" id="display-options">
            {toggles.map((tg) => (
              <ToggleChip key={tg.key} pressed={display[tg.key]} onToggle={() => toggle(tg.key)} swatch={tg.swatch}>
                {tg.label}
              </ToggleChip>
            ))}
          </div>
        )}
        <span className="hidden text-xs text-screen-muted pointer-coarse:inline">{bending ? t('angle.touchHint') : t('touch.gestureHint')}</span>
      </div>
    </section>
  );
}
