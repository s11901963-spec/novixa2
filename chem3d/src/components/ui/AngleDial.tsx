import { useRef, useState } from 'react';
import { useT } from '../../i18n';
import { angleFromPoint, snapAngle } from '../../lib/touchInput';

const CX = 130;
const CY = 128;
const R = 104;
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (deg: number, r: number) => ({ x: CX + r * Math.cos(rad(deg)), y: CY - r * Math.sin(rad(deg)) });

/**
 * A protractor for entering a bond angle by touch: drag the movable bond (or tap the arc),
 * fine-tune with the ± buttons, or pick a common value. Keyboard: ← → (Shift for 5°).
 */
export function AngleDial({
  value,
  onChange,
  label,
  presets = [90, 104.5, 107, 109.5, 120, 180],
  disabled,
  testId = 'angle-dial',
}: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
  presets?: number[];
  disabled?: boolean;
  testId?: string;
}) {
  const t = useT();
  const svg = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const shown = value ?? 90;
  const set = (v: number) => !disabled && onChange(snapAngle(v));

  const fromEvent = (e: React.PointerEvent) => {
    const el = svg.current;
    if (!el) return;
    const p = el.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const local = p.matrixTransform(el.getScreenCTM()!.inverse());
    set(angleFromPoint(local.x, local.y, CX, CY));
  };

  const end = pt(shown, R * 0.78);
  const arcR = 46;
  const arcEnd = pt(shown, arcR);
  const ticks = Array.from({ length: 19 }, (_, i) => i * 10);
  const fine = [-1, -0.5, 0.5, 1];

  return (
    <div className="flex flex-col gap-2.5" data-testid={testId} data-value={value ?? ''}>
      <div className="flex max-w-[22rem] justify-center">
        <bdi dir="ltr" className={`rounded-xl px-3 py-0.5 font-mono text-2xl font-bold tabular ${value === null ? 'text-muted' : 'bg-accent-soft text-accent'}`} aria-live="polite">
          {value === null ? '?°' : `${value}°`}
        </bdi>
      </div>
      <svg
        ref={svg}
        viewBox="0 0 260 150"
        className={`w-full max-w-[22rem] select-none ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
        style={{ touchAction: 'none' }}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={180}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value === null ? t('touch.dragHint') : `${value}°`}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          fromEvent(e);
        }}
        onPointerMove={(e) => dragging && fromEvent(e)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(e) => {
          const d = e.shiftKey ? 5 : 0.5;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            set(shown + d);
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            set(shown - d);
          }
        }}
      >
        <path d={`M ${CX + R} ${CY} A ${R} ${R} 0 0 0 ${CX - R} ${CY}`} fill="var(--surface-2)" stroke="var(--border)" strokeWidth={1.5} />
        {ticks.map((d) => {
          const a = pt(d, R);
          const b = pt(d, R - (d % 30 === 0 ? 12 : 6));
          return <line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--fg-muted)" strokeWidth={d % 30 === 0 ? 1.6 : 1} />;
        })}
        {[0, 30, 60, 90, 120, 150, 180].map((d) => {
          const p = pt(d, R - 22);
          return (
            <text key={d} x={p.x} y={p.y} dy="0.35em" textAnchor="middle" fontSize={10} fill="var(--fg-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
              {d}
            </text>
          );
        })}
        {/* angle arc */}
        {value !== null && <path d={`M ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 0 0 ${arcEnd.x} ${arcEnd.y} L ${CX} ${CY} Z`} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.5} />}
        {/* fixed bond */}
        <line x1={CX} y1={CY} x2={CX + R * 0.78} y2={CY} stroke="var(--fg)" strokeWidth={5} strokeLinecap="round" />
        <circle cx={CX + R * 0.78} cy={CY} r={10} fill="var(--fg-muted)" />
        {/* movable bond */}
        <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke={value === null ? 'var(--fg-muted)' : 'var(--accent)'} strokeWidth={5} strokeLinecap="round" strokeDasharray={value === null ? '6 6' : undefined} />
        <circle cx={end.x} cy={end.y} r={13} fill={value === null ? 'var(--surface)' : 'var(--accent)'} stroke="var(--accent)" strokeWidth={2.5} />
        <circle cx={CX} cy={CY} r={12} fill="var(--fg)" />
      </svg>
      {value === null && <p className="text-xs text-muted">{t('touch.dragHint')}</p>}
      <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
        {fine.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => set(shown + d)}
            className="h-11 min-w-11 rounded-xl border border-line bg-surface px-2.5 text-sm font-semibold tabular active:scale-95 pointer-coarse:h-12"
            data-testid={`${testId}-fine-${d}`}
          >
            {d > 0 ? `+${d}` : d}°
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" dir="ltr" role="group" aria-label={t('touch.presets')}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            aria-pressed={value === p}
            onClick={() => set(p)}
            className={`h-11 rounded-xl border px-3 text-sm font-semibold tabular active:scale-95 pointer-coarse:h-12 ${value === p ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface hover:bg-surface-2'}`}
            data-testid={`${testId}-preset-${p}`}
          >
            {p}°
          </button>
        ))}
      </div>
    </div>
  );
}
