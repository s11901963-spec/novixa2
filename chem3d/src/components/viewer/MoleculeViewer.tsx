import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, useRef, useState, type ReactNode } from 'react';
import type { SceneModel } from '../../chem/geometry';
import { useT } from '../../i18n';
import type { CameraPreset } from '../../state/lab';
import { useSettings, type DisplayToggles } from '../../state/settings';
import { CameraRig } from './CameraRig';
import { SCALE, webglAvailable } from './constants';
import { Lights } from './Lights';
import { MoleculeModel, type AngleTone, type BendConfig } from './MoleculeModel';
import { RepulsionDemo } from './RepulsionDemo';
import { SceneProbe } from './SceneProbe';
import { CameraCommands, ViewControls, type CameraHandle } from './ViewControls';

class GlBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface MoleculeViewerProps {
  scene: SceneModel | null;
  mode: 'vsepr' | 'shape';
  display?: Partial<DisplayToggles>;
  mystery?: boolean;
  selectedAtom?: number | null;
  onSelectAtom?: (i: number | null) => void;
  camera?: { preset: CameraPreset; nonce: number };
  demo?: { count: number; playKey: number; onSettled: () => void } | null;
  /** Identifies the molecule for tests (data-molecule). */
  moleculeKey: string;
  className?: string;
  children?: ReactNode;
  ariaLabel: string;
  /** On-screen rotate/zoom/full-screen buttons (default on). */
  controls?: boolean;
  /** Drag an atom to change the bond angle. */
  bend?: BendConfig | null;
  angleTone?: AngleTone | null;
}

/** The 3D canvas (three.js via react-three-fiber) with orbit controls and camera presets. */
export function MoleculeViewer(props: MoleculeViewerProps) {
  const t = useT();
  const settings = useSettings();
  const hostRef = useRef<HTMLDivElement>(null);
  const cameraHandle = useRef<CameraHandle | null>(null);
  const [labelLayer, setLabelLayer] = useState<HTMLDivElement | null>(null);
  const [gl] = useState(webglAvailable);
  const display = { ...settings.display, ...props.display };
  const reduceMotion = settings.reduceMotion || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const radius = (props.scene?.radius ?? 2) * SCALE;
  const sceneKey = `${props.moleculeKey}|${props.scene?.mode ?? 'none'}|${props.mystery ? 'hidden' : 'shown'}`;

  const fallback = (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-screen-muted">{t('lab.webglError')}</div>
  );

  return (
    <div
      ref={hostRef}
      className={`overflow-hidden bg-screen ${props.className ?? 'relative'}`}
      data-testid="molecule-viewer"
      data-molecule={props.moleculeKey}
      data-scene-key={sceneKey}
      data-mode={props.mode}
      data-mystery={String(!!props.mystery)}
      role="group"
      aria-label={props.ariaLabel}
    >
      {gl ? (
        <GlBoundary fallback={fallback}>
          <Canvas
            dpr={[1, 2]}
            camera={{ fov: 38, position: [3, 2.4, 9], near: 0.1, far: 200 }}
            gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
            onPointerMissed={() => props.onSelectAtom?.(null)}
            style={{ touchAction: 'none' }}
          >
            <Lights preset={settings.lighting} />
            {props.demo ? (
              <RepulsionDemo count={props.demo.count} playKey={props.demo.playKey} onSettled={props.demo.onSettled} />
            ) : (
              props.scene && (
                <MoleculeModel
                  scene={props.scene}
                  mode={props.mode}
                  display={display}
                  renderStyle={settings.renderStyle}
                  labelMode={settings.labelMode}
                  lang={settings.lang}
                  mystery={!!props.mystery}
                  selectedAtom={props.selectedAtom ?? null}
                  onSelectAtom={props.onSelectAtom}
                  reduceMotion={!!reduceMotion}
                  lonePairLabel={t('lab.legend.lonePair')}
                  labelContainer={labelLayer}
                  modelKey={sceneKey}
                  bend={props.bend}
                  angleTone={props.angleTone}
                />
              )
            )}
            <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2.5} maxDistance={40} autoRotate={display.autoRotate && !props.demo} autoRotateSpeed={1.2} />
            <CameraRig radius={props.demo ? 2.6 : radius} preset={props.camera?.preset ?? 'reset'} nonce={props.camera?.nonce ?? 0} instant={!!reduceMotion} />
            <CameraCommands handle={cameraHandle} instant={!!reduceMotion} />
            <SceneProbe target={hostRef} />
          </Canvas>
        </GlBoundary>
      ) : (
        fallback
      )}
      <div ref={setLabelLayer} className="pointer-events-none absolute inset-0 isolate overflow-hidden" aria-hidden />
      {gl && settings.viewButtons && props.controls !== false && !props.demo && <ViewControls handle={cameraHandle} host={hostRef} />}
      {props.children}
    </div>
  );
}
