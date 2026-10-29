import { slotAssignment } from '../../chem/geometry';
import type { LewisStructure } from '../../chem/types';
import { chargeLabel } from '../ui/Formula';

/**
 * 2D Lewis structure. Bond and lone-pair directions follow a conventional textbook
 * layout for each AXmEn type; the drawing shows electron bookkeeping, not geometry.
 */
const LAYOUTS: Record<string, { bonds: number[]; lps: number[] }> = {
  '2,0': { bonds: [180, 0], lps: [] },
  '3,0': { bonds: [90, 210, 330], lps: [] },
  '2,1': { bonds: [210, 330], lps: [90] },
  '4,0': { bonds: [90, 0, 270, 180], lps: [] },
  '3,1': { bonds: [180, 270, 0], lps: [90] },
  '2,2': { bonds: [180, 0], lps: [90, 270] },
  '5,0': { bonds: [90, 270, 0, 150, 210], lps: [] },
  '4,1': { bonds: [90, 270, 330, 30], lps: [180] },
  '3,2': { bonds: [0, 90, 270], lps: [150, 210] },
  '2,3': { bonds: [180, 0], lps: [60, 120, 270] },
  '6,0': { bonds: [90, 30, 330, 270, 210, 150], lps: [] },
  '5,1': { bonds: [90, 15, 165, 315, 225], lps: [270] },
  '4,2': { bonds: [0, 90, 180, 270], lps: [45, 225] },
};

const L = 74; // bond length in SVG units
const R_ATOM = 17;
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (deg: number): [number, number] => [Math.cos(rad(deg)), -Math.sin(rad(deg))];

function DotPair({ x, y, angle, color }: { x: number; y: number; angle: number; color: string }) {
  const [dx, dy] = dir(angle + 90);
  return (
    <g fill={color}>
      <circle cx={x + dx * 4.6} cy={y + dy * 4.6} r={3.1} />
      <circle cx={x - dx * 4.6} cy={y - dy * 4.6} r={3.1} />
    </g>
  );
}

export interface LewisDiagramProps {
  structure: LewisStructure;
  charge: number;
  selectedAtom: number | null;
  onSelectAtom?: (i: number | null) => void;
  showCounts: boolean;
  colors: { text: string; bond: string; centralLp: string; terminalLp: string; accent: string; muted: string };
  compact?: boolean;
  title: string;
}

export function LewisDiagram({ structure, charge, selectedAtom, onSelectAtom, showCounts, colors, compact, title }: LewisDiagramProps) {
  const ligands = structure.atoms.slice(1).map((a) => a.element);
  const x = ligands.length;
  const e = structure.atoms[0].lonePairs;
  const layout = LAYOUTS[`${x},${e}`] ?? { bonds: ligands.map((_, i) => 90 - (360 / x) * i), lps: [] };
  const order = slotAssignment(ligands);
  const angleOf = new Map<number, number>();
  order.forEach((ligIdx, slot) => angleOf.set(ligIdx + 1, layout.bonds[slot]));

  const pos = (i: number): [number, number] => {
    if (i === 0) return [0, 0];
    const [dx, dy] = dir(angleOf.get(i)!);
    return [dx * L, dy * L];
  };

  // Bounding box for the viewBox
  const pts = structure.atoms.map((_, i) => pos(i));
  const pad = 46;
  const minX = Math.min(...pts.map((p) => p[0])) - pad;
  const maxX = Math.max(...pts.map((p) => p[0])) + pad;
  const minY = Math.min(...pts.map((p) => p[1])) - pad;
  const maxY = Math.max(...pts.map((p) => p[1])) + pad + (showCounts ? 14 : 0);
  const bracket = charge !== 0 ? 22 : 0;
  const vb = [minX - bracket, minY - (bracket ? 10 : 0), maxX - minX + 2 * bracket + (bracket ? 18 : 0), maxY - minY + (bracket ? 20 : 0)];

  return (
    <svg viewBox={vb.join(' ')} role="img" aria-label={title} className={compact ? 'h-full w-full' : 'h-full max-h-[460px] w-full'} data-testid="lewis-diagram">
      {/* bonds */}
      {structure.bonds.map((b, i) => {
        const [x1, y1] = pos(b.a);
        const [x2, y2] = pos(b.b);
        const ang = angleOf.get(b.b)!;
        const [ux, uy] = dir(ang);
        const [px, py] = dir(ang + 90);
        const offs = b.order === 1 ? [0] : b.order === 2 ? [-4.5, 4.5] : [-7, 0, 7];
        return (
          <g key={`b${i}`} stroke={colors.bond} strokeWidth={2.6} strokeLinecap="round">
            {offs.map((o, j) => (
              <line
                key={j}
                x1={x1 + ux * R_ATOM + px * o}
                y1={y1 + uy * R_ATOM + py * o}
                x2={x2 - ux * R_ATOM + px * o}
                y2={y2 - uy * R_ATOM + py * o}
              />
            ))}
          </g>
        );
      })}
      {/* central lone pairs */}
      {layout.lps.slice(0, e).map((a, i) => {
        const [dx, dy] = dir(a);
        return <DotPair key={`clp${i}`} x={dx * 27} y={dy * 27} angle={a} color={colors.centralLp} />;
      })}
      {/* terminal lone pairs */}
      {structure.atoms.slice(1).map((atom) => {
        const [ax, ay] = pos(atom.index);
        const out = angleOf.get(atom.index)!;
        const slots = atom.lonePairs === 1 ? [out] : atom.lonePairs === 2 ? [out + 90, out - 90] : [out, out + 90, out - 90];
        return slots.slice(0, atom.lonePairs).map((a, j) => {
          const [dx, dy] = dir(a);
          return <DotPair key={`t${atom.index}-${j}`} x={ax + dx * 25} y={ay + dy * 25} angle={a} color={colors.terminalLp} />;
        });
      })}
      {/* atoms */}
      {structure.atoms.map((atom) => {
        const [ax, ay] = pos(atom.index);
        const sel = selectedAtom === atom.index;
        return (
          <g
            key={`a${atom.index}`}
            role={onSelectAtom ? 'button' : undefined}
            tabIndex={onSelectAtom ? 0 : undefined}
            aria-pressed={onSelectAtom ? sel : undefined}
            aria-label={`${atom.element} ${atom.index === 0 ? '(central)' : ''}`}
            onClick={() => onSelectAtom?.(sel ? null : atom.index)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                onSelectAtom?.(sel ? null : atom.index);
              }
            }}
            style={{ cursor: onSelectAtom ? 'pointer' : 'default' }}
          >
            <circle cx={ax} cy={ay} r={R_ATOM} fill={sel ? colors.accent : 'transparent'} fillOpacity={sel ? 0.28 : 0} stroke={sel ? colors.accent : 'none'} strokeWidth={2} />
            <text x={ax} y={ay} dy="0.36em" textAnchor="middle" fontSize={atom.element.length > 1 ? 21 : 24} fontWeight={600} fill={colors.text} style={{ fontFamily: 'var(--font-mono)' }}>
              {atom.element}
            </text>
            {atom.formalCharge !== 0 && (
              <g>
                <circle cx={ax + 17} cy={ay - 17} r={8.5} fill="none" stroke={colors.text} strokeWidth={1.4} />
                <text x={ax + 17} y={ay - 17} dy="0.35em" textAnchor="middle" fontSize={atom.formalCharge > 0 ? 13 : 15} fill={colors.text} style={{ fontFamily: 'var(--font-mono)' }}>
                  {Math.abs(atom.formalCharge) === 1 ? (atom.formalCharge > 0 ? '+' : '−') : chargeLabel(atom.formalCharge)}
                </text>
              </g>
            )}
            {showCounts && (
              <text x={ax} y={ay + 34} textAnchor="middle" fontSize={11} fill={colors.muted} style={{ fontFamily: 'var(--font-mono)' }}>
                {atom.electronCount}e⁻
              </text>
            )}
          </g>
        );
      })}
      {/* ion brackets */}
      {charge !== 0 && (
        <g stroke={colors.text} strokeWidth={2} fill="none">
          <path d={`M ${minX - 6} ${minY} h -10 v ${maxY - minY} h 10`} />
          <path d={`M ${maxX + 6} ${minY} h 10 v ${maxY - minY} h -10`} />
          <text x={maxX + 22} y={minY + 4} fontSize={16} stroke="none" fill={colors.text} style={{ fontFamily: 'var(--font-mono)' }}>
            {chargeLabel(charge)}
          </text>
        </g>
      )}
    </svg>
  );
}
