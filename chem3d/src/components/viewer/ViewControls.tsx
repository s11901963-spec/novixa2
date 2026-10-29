import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useT } from '../../i18n';
import { DraggablePanel } from '../ui/DraggablePanel';

export interface CameraHandle {
  /** Orbit the camera by the given degrees (azimuth around the vertical axis, elevation). */
  rotate: (azimuthDeg: number, elevationDeg: number) => void;
  /** Multiply the camera distance (< 1 zooms in). */
  zoom: (factor: number) => void;
}

const MIN_DIST = 2.5;
const MAX_DIST = 40;

/** Inside the canvas: applies queued rotate/zoom requests smoothly over a few frames. */
export function CameraCommands({ handle, instant }: { handle: MutableRefObject<CameraHandle | null>; instant: boolean }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const pending = useRef({ az: 0, el: 0, zoom: 1 });

  useEffect(() => {
    handle.current = {
      rotate: (az, el) => {
        pending.current.az += THREE.MathUtils.degToRad(az);
        pending.current.el += THREE.MathUtils.degToRad(el);
        invalidate();
      },
      zoom: (f) => {
        pending.current.zoom *= f;
        invalidate();
      },
    };
    return () => {
      handle.current = null;
    };
  }, [handle, invalidate]);

  useFrame((_, dt) => {
    const p = pending.current;
    if (p.az === 0 && p.el === 0 && p.zoom === 1) return;
    const k = instant ? 1 : Math.min(1, dt * 12);
    const target = controls?.target ?? new THREE.Vector3();
    const offset = camera.position.clone().sub(target);
    const s = new THREE.Spherical().setFromVector3(offset);
    const dAz = p.az * k;
    const dEl = p.el * k;
    const zf = Math.pow(p.zoom, k);
    s.theta += dAz;
    s.phi = THREE.MathUtils.clamp(s.phi - dEl, 0.06, Math.PI - 0.06);
    s.radius = THREE.MathUtils.clamp(s.radius * zf, MIN_DIST, MAX_DIST);
    camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(s));
    camera.lookAt(target);
    controls?.update();
    p.az -= dAz;
    p.el -= dEl;
    p.zoom /= zf;
    if (Math.abs(p.az) < 1e-4) p.az = 0;
    if (Math.abs(p.el) < 1e-4) p.el = 0;
    if (Math.abs(p.zoom - 1) < 1e-4) p.zoom = 1;
  });
  return null;
}

/** Press-and-hold repeat for touch buttons; keyboard activation fires once. */
function useRepeat() {
  const timers = useRef<{ start?: number; tick?: number }>({});
  const stop = () => {
    window.clearTimeout(timers.current.start);
    window.clearInterval(timers.current.tick);
    timers.current = {};
  };
  useEffect(() => stop, []);
  return (fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      fn();
      stop();
      timers.current.start = window.setTimeout(() => {
        timers.current.tick = window.setInterval(fn, 90);
      }, 380);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    // A click from the keyboard has detail 0; pointer clicks were handled on pointer-down.
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) fn();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
}

function Btn({ label, children, className = '', ...rest }: { label: string; children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-screen-fg transition-colors select-none hover:bg-white/15 active:scale-95 active:bg-white/25 pointer-coarse:h-11 pointer-coarse:w-11 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** On-screen rotate / zoom / full-screen buttons for touch screens (dragging still works too). */
export function ViewControls({ handle, host }: { handle: MutableRefObject<CameraHandle | null>; host: RefObject<HTMLElement | null> }) {
  const t = useT();
  const repeat = useRepeat();
  const [full, setFull] = useState(false);
  // Folded on phones so it does not cover the molecule; it can be dragged anywhere in the view.
  const [narrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const canFull = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  useEffect(() => {
    const on = () => setFull(!!host.current && document.fullscreenElement === host.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, [host]);
  return (
    <DraggablePanel
      bounds={host}
      title={t('touch.viewControls')}
      defaultCollapsed={narrow}
      placement={narrow ? 'bottom-end' : 'middle-end'}
      className="w-auto"
      testId="view-controls"
      folded={<span className="px-1 text-base" aria-hidden>✥</span>}
    >
      <div className="grid grid-cols-2 gap-0.5" dir="ltr" role="toolbar" aria-label={t('touch.viewControls')}>
        <Btn label={t('touch.rotateLeft')} {...repeat(() => handle.current?.rotate(-15, 0))} data-testid="view-rotate-left">
          ⟲
        </Btn>
        <Btn label={t('touch.rotateRight')} {...repeat(() => handle.current?.rotate(15, 0))} data-testid="view-rotate-right">
          ⟳
        </Btn>
        <Btn label={t('touch.tiltUp')} {...repeat(() => handle.current?.rotate(0, 12))} data-testid="view-tilt-up">
          ▲
        </Btn>
        <Btn label={t('touch.tiltDown')} {...repeat(() => handle.current?.rotate(0, -12))} data-testid="view-tilt-down">
          ▼
        </Btn>
        <Btn label={t('touch.zoomIn')} {...repeat(() => handle.current?.zoom(0.88))} data-testid="view-zoom-in">
          +
        </Btn>
        <Btn label={t('touch.zoomOut')} {...repeat(() => handle.current?.zoom(1.14))} data-testid="view-zoom-out">
          −
        </Btn>
        {canFull && (
          <Btn
            label={full ? t('touch.exitFullscreen') : t('touch.fullscreen')}
            className="col-span-2 w-auto text-base"
            onClick={() => {
              if (full) void document.exitFullscreen();
              else void host.current?.requestFullscreen?.();
            }}
            data-testid="view-fullscreen"
          >
            {full ? '⤡' : '⛶'}
          </Btn>
        )}
      </div>
    </DraggablePanel>
  );
}
