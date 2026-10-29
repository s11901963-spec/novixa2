import { useT } from '../../i18n';

// Sides in the order used by chem/electrons dotSides(): top, right, bottom, left.
const SIDES = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
] as const;

/**
 * Electron-dot (Lewis) symbol. With `onChange`, each side is a button that cycles
 * 0 → 1 → 2 dots, so students can build the symbol themselves.
 */
export function DotSymbol({
  symbol,
  sides,
  onChange,
  size = 132,
  ariaLabel,
  highlight = false,
}: {
  symbol: string;
  sides: number[];
  onChange?: (sides: number[]) => void;
  size?: number;
  ariaLabel: string;
  highlight?: boolean;
}) {
  const t = useT();
  const half = symbol.length > 1 ? 31 : 24;
  const pos = (side: number, k: number, count: number) => {
    const { dx, dy } = SIDES[side];
    const offset = count === 2 ? (k === 0 ? -7.5 : 7.5) : 0;
    const dist = dx !== 0 ? half + 8 : 31;
    return { x: dx * dist + (dx === 0 ? offset : 0), y: dy * dist + (dy === 0 ? offset : 0) };
  };
  const cycle = (side: number) => onChange?.(sides.map((c, i) => (i === side ? (c + 1) % 3 : c)));
  return (
    <svg viewBox="-62 -62 124 124" width={size} height={size} role="img" aria-label={ariaLabel} className={`overflow-visible ${highlight ? 'rounded-xl bg-bad-soft' : ''}`} data-testid="dot-symbol" data-dots={sides.join(',')}>
      {onChange &&
        SIDES.map(({ dx, dy }, side) => {
          const w = dx === 0 ? 56 : 26;
          const h = dx === 0 ? 26 : 56;
          const cx = dx * (dx !== 0 ? half + 8 : 31);
          const cy = dy * 31;
          return (
            <rect
              key={`hit-${side}`}
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              rx={8}
              role="button"
              tabIndex={0}
              aria-label={t('ec.dots.side', { side: t(`ec.dots.side.${side}` as never), n: sides[side] })}
              className="cursor-pointer fill-transparent stroke-transparent hover:fill-[var(--accent-soft)] focus-visible:fill-[var(--accent-soft)] focus-visible:stroke-[var(--accent)] focus:outline-none"
              strokeWidth={1.5}
              onClick={() => cycle(side)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  cycle(side);
                }
              }}
              data-testid={`dot-side-${side}`}
            />
          );
        })}
      <text x={0} y={0} dy="0.36em" pointerEvents="none" textAnchor="middle" fontSize={symbol.length > 1 ? 34 : 38} fontWeight={700} fill="var(--fg)" style={{ fontFamily: 'var(--font-mono)' }}>
        {symbol}
      </text>
      {sides.map((count, side) =>
        Array.from({ length: count }, (_, k) => {
          const p = pos(side, k, count);
          return <circle key={`${side}-${k}`} cx={p.x} cy={p.y} r={4.6} fill="var(--accent)" pointerEvents="none" />;
        }),
      )}
    </svg>
  );
}
