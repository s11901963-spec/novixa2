import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { useT } from '../../i18n';
import { useLab } from '../../state/lab';

type Probe = MutableRefObject<((atom: number) => { x: number; y: number } | null) | null>;

interface Hand {
  x: number;
  y: number;
  pressed: boolean;
}

/**
 * "Show me how": an animated hand on the 3D view that drags an atom, then uses two fingers on two
 * atoms, then taps − and +, with a caption for each step. The angle really changes (the model and
 * the right/wrong badge follow), never passes the correct value, and is put back at the end.
 * Tapping anywhere stops it.
 */
export function AngleDemo({
  stage,
  probe,
  atoms,
  atomName,
  min,
  max,
  target,
  minus,
  plus,
  onDone,
}: {
  stage: RefObject<HTMLDivElement | null>;
  probe: Probe;
  /** Atoms that move with the angle (the first two are used). */
  atoms: number[];
  atomName: string;
  min: number;
  max: number;
  /** The correct value: the demonstration stays clear of it. */
  target: number;
  minus: RefObject<HTMLButtonElement | null>;
  plus: RefObject<HTMLButtonElement | null>;
  onDone: () => void;
}) {
  const t = useT();
  const [hands, setHands] = useState<Hand[]>([]);
  const [caption, setCaption] = useState('');
  const stopped = useRef(false);
  const start = useRef(useLab.getState().angleTry ?? min);

  useEffect(() => {
    const setAngle = useLab.getState().setAngleTry;
    const a0 = start.current;
    const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v * 2) / 2));
    // A sweep that stays at least 4° away from the answer (towards it if there is room, else away).
    const room = target < a0 ? a0 - (target + 4) : target - 4 - a0;
    const dir = target < a0 ? -1 : 1;
    const span = room >= 6 ? dir * Math.min(18, room) : -dir * 18;
    const a1 = snap(a0 + span);
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    const at = (atom: number): Hand | null => {
      const p = probe.current?.(atom);
      return p ? { x: p.x, y: p.y, pressed: true } : null;
    };
    const centreOf = (b: HTMLElement | null) => {
      const s = stage.current?.getBoundingClientRect();
      const r = b?.getBoundingClientRect();
      return s && r ? { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 } : null;
    };
    const tween = (ms: number, step: (k: number) => void) =>
      new Promise<void>((resolve) => {
        const t0 = performance.now();
        const frame = (now: number) => {
          if (stopped.current) return resolve();
          const k = Math.min(1, (now - t0) / ms);
          step(k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
          if (k < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
    const follow = (list: number[], from: number, to: number, ms: number) =>
      tween(ms, (k) => {
        setAngle(snap(from + (to - from) * k));
        setHands(list.map(at).filter((h): h is Hand => !!h));
      });
    const tap = async (b: HTMLElement | null, delta: number) => {
      const c = centreOf(b);
      if (!c) return;
      setHands([{ ...c, pressed: false }]);
      await sleep(450);
      setHands([{ ...c, pressed: true }]);
      setAngle(snap((useLab.getState().angleTry ?? a0) + delta));
      await sleep(350);
      setHands([{ ...c, pressed: false }]);
      await sleep(350);
    };
    (async () => {
      const [one, two] = atoms;
      setCaption(t('angle.demo.step1', { atom: atomName }));
      setHands([at(one)].filter((h): h is Hand => !!h));
      await sleep(700);
      if (!stopped.current) await follow([one], a0, a1, 1800);
      if (!stopped.current && two !== undefined) {
        setCaption(t('angle.demo.step2'));
        setHands([at(one), at(two)].filter((h): h is Hand => !!h));
        await sleep(800);
        if (!stopped.current) await follow([one, two], a1, a0, 1800);
      }
      if (!stopped.current) {
        setCaption(t('angle.demo.step3'));
        await tap(minus.current, -0.5);
        if (!stopped.current) await tap(plus.current, 0.5);
      }
      if (!stopped.current) {
        setHands([]);
        setCaption(t('angle.demo.step4'));
        await sleep(2600);
      }
      setAngle(a0);
      onDone();
    })();
    return () => {
      stopped.current = true;
      setAngle(a0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="absolute inset-0 z-40"
      role="dialog"
      aria-label={t('angle.demo.button')}
      data-testid="angle-demo"
      onPointerDown={(e) => {
        e.stopPropagation();
        stopped.current = true;
        onDone();
      }}
    >
      {hands.map((h, i) => (
        <div key={i} className="pointer-events-none absolute" style={{ left: h.x, top: h.y }} data-testid="angle-demo-hand">
          <span
            className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-white/30 transition-all duration-200 ${h.pressed ? 'h-9 w-9 shadow-[0_0_0_8px_rgba(255,255,255,0.18)]' : 'h-12 w-12'}`}
          />
          <span className="absolute -left-2.5 top-1 text-3xl drop-shadow" aria-hidden>
            👆
          </span>
        </div>
      ))}
      {caption && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          <p className="max-w-md rounded-2xl bg-black/80 px-4 py-2.5 text-center text-sm font-semibold leading-6 text-white shadow-lg" data-testid="angle-demo-caption">
            {caption}
            <span className="mt-0.5 block text-xs font-normal text-white/70">{t('angle.demo.stop')}</span>
          </p>
        </div>
      )}
    </div>
  );
}
