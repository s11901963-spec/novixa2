import { idealLayout } from '../../chem/geometry';
import type { ElectronGeometryId, MolecularGeometryId } from '../../chem/types';

// One representative (bonded atoms, lone pairs) combination per shape, for the icon.
const MG: Record<MolecularGeometryId, [number, number]> = {
  linear: [2, 0],
  'trigonal-planar': [3, 0],
  bent: [2, 1],
  tetrahedral: [4, 0],
  'trigonal-pyramidal': [3, 1],
  'trigonal-bipyramidal': [5, 0],
  seesaw: [4, 1],
  't-shaped': [3, 2],
  octahedral: [6, 0],
  'square-pyramidal': [5, 1],
  'square-planar': [4, 2],
};
const EG: Record<ElectronGeometryId, [number, number]> = {
  linear: [2, 0],
  'trigonal-planar': [3, 0],
  tetrahedral: [4, 0],
  'trigonal-bipyramidal': [5, 0],
  octahedral: [6, 0],
};

// Fixed oblique view (same spirit as the 3D camera's default direction).
const YAW = (-28 * Math.PI) / 180;
const PITCH = (18 * Math.PI) / 180;
function project([x, y, z]: number[]) {
  const x1 = x * Math.cos(YAW) + z * Math.sin(YAW);
  const z1 = -x * Math.sin(YAW) + z * Math.cos(YAW);
  const y2 = y * Math.cos(PITCH) - z1 * Math.sin(PITCH);
  const z2 = y * Math.sin(PITCH) + z1 * Math.cos(PITCH);
  return { x: x1, y: -y2, z: z2 };
}

/** Small drawing of a VSEPR shape for touch-friendly choice buttons. */
export function ShapeIcon({ shape, kind = 'mg', size = 40 }: { shape: string; kind?: 'mg' | 'eg'; size?: number }) {
  const combo = kind === 'mg' ? MG[shape as MolecularGeometryId] : EG[shape as ElectronGeometryId];
  if (!combo) return null;
  const layout = idealLayout(combo[0], combo[1]);
  const L = 14;
  const atoms = layout.ligandSlots.map((s) => project(s.dir));
  const lps = layout.lonePairs.map((s) => project(s.dir));
  const items = [
    ...lps.map((p, i) => ({ kind: 'lp' as const, p, i })),
    ...atoms.map((p, i) => ({ kind: 'atom' as const, p, i })),
  ].sort((a, b) => a.p.z - b.p.z);
  return (
    <svg viewBox="-22 -22 44 44" width={size} height={size} aria-hidden className="shrink-0">
      {items.map((it) =>
        it.kind === 'lp' ? (
          <ellipse
            key={`lp${it.i}`}
            cx={it.p.x * 9}
            cy={it.p.y * 9}
            rx={6.2}
            ry={3.6}
            transform={`rotate(${(Math.atan2(it.p.y, it.p.x) * 180) / Math.PI} ${it.p.x * 9} ${it.p.y * 9})`}
            fill="var(--lp)"
            opacity={0.45}
          />
        ) : (
          <g key={`a${it.i}`} opacity={it.p.z < -0.2 ? 0.75 : 1}>
            <line x1={0} y1={0} x2={it.p.x * L} y2={it.p.y * L} stroke="var(--fg-muted)" strokeWidth={2.2} strokeLinecap="round" />
            <circle cx={it.p.x * L} cy={it.p.y * L} r={it.p.z < -0.2 ? 3.6 : 4.4} fill="var(--fg-muted)" />
          </g>
        ),
      )}
      <circle cx={0} cy={0} r={5.6} fill="var(--accent)" />
    </svg>
  );
}
