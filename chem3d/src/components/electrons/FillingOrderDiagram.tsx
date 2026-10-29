import { capacity, FILLING_ORDER, L_LETTERS, occupancyOf, subshellLabel, type Term } from '../../chem/electrons';

const DX = 50;
const DY = 33;
const X0 = 28;
const Y0 = 22;
const at = (n: number, l: number) => ({ x: X0 + l * DX, y: Y0 + (n - 1) * DY });

/**
 * The diagonal-rule picture of the Aufbau filling order. Sublevels occupied in the
 * selected atom are shaded and show their electron count; full ones are solid.
 */
export function FillingOrderDiagram({ terms, ariaLabel }: { terms: Term[]; ariaLabel: string }) {
  const occ = occupancyOf(terms);
  const sums = [...new Set(FILLING_ORDER.map((s) => s.n + s.l))];
  const width = X0 + 3 * DX + 30;
  const height = Y0 + 6 * DY + 22;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-[260px]" role="img" aria-label={ariaLabel}>
      <defs>
        <marker id="fo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)" />
        </marker>
      </defs>
      {sums.map((sum) => {
        const cells = FILLING_ORDER.filter((s) => s.n + s.l === sum).sort((a, b) => a.n - b.n);
        const first = at(cells[0].n, cells[0].l);
        const last = at(cells[cells.length - 1].n, cells[cells.length - 1].l);
        return (
          <line
            key={sum}
            x1={first.x + 16}
            y1={first.y - 11}
            x2={last.x - 13}
            y2={last.y + 9}
            stroke="var(--fg-muted)"
            strokeOpacity={0.55}
            strokeWidth={1.4}
            markerEnd="url(#fo-arrow)"
          />
        );
      })}
      {FILLING_ORDER.map((s) => {
        const { x, y } = at(s.n, s.l);
        const label = subshellLabel(s);
        const c = occ.get(label) ?? 0;
        const full = c === capacity(s.l);
        return (
          <g key={label}>
            <rect x={x - 17} y={y - 11} width={34} height={22} rx={6} fill={c ? (full ? 'var(--accent)' : 'var(--accent-soft)') : 'var(--surface)'} stroke={c ? 'var(--accent)' : 'var(--border)'} />
            <text x={x} y={y} dy="0.35em" textAnchor="middle" fontSize={12} fontWeight={600} fill={full ? 'var(--accent-fg)' : 'var(--fg)'} style={{ fontFamily: 'var(--font-mono)' }}>
              {s.n}
              {L_LETTERS[s.l]}
              {c > 0 && (
                <tspan dy="-0.45em" fontSize={8.5}>
                  {c}
                </tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
