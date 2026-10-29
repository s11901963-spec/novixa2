import { getElement } from '../data';
import type { ExperimentalData } from '../data';
import type {
  AngleKindId,
  Analysis,
  BondOrder,
  LigandPositionRole,
  MolecularGeometryId,
  Vec3,
} from './types';

// ---------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a);
  return l === 0 ? [0, 0, 0] : scale(a, 1 / l);
};
const DEG = Math.PI / 180;
export const toDeg = (rad: number) => rad / DEG;

/** Angle u–center–v in degrees, computed from coordinates: θ = arccos(u·v / |u||v|). */
export function angleAt(u: Vec3, center: Vec3, v: Vec3): number {
  const a = sub(u, center);
  const b = sub(v, center);
  const c = Math.min(1, Math.max(-1, dot(a, b) / (length(a) * length(b))));
  return toDeg(Math.acos(c));
}

/** Any unit vector perpendicular to `a`. */
export function perpendicular(a: Vec3): Vec3 {
  const ref: Vec3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return normalize(cross(a, ref));
}

/** Rotate v around unit axis k by angle (radians), Rodrigues' formula. */
export function rotateAround(v: Vec3, k: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
}

// ---------------------------------------------------------------------------
// Domain layouts
// ---------------------------------------------------------------------------
export interface DomainSlot {
  dir: Vec3;
  role: LigandPositionRole;
}

export interface DomainLayout {
  /** Slot order matters: unique ligands are placed in the first slots. */
  ligandSlots: DomainSlot[];
  lonePairs: DomainSlot[];
}

const S3 = Math.sqrt(3) / 2;
const TET_R = Math.sqrt(8) / 3; // sin(109.47°)
const TET_HALF_S = Math.sqrt(2 / 3); // sin(54.74°)
const TET_HALF_C = Math.sqrt(1 / 3); // cos(54.74°)

const none = (dir: Vec3): DomainSlot => ({ dir, role: 'none' });
const azimuth = (phiDeg: number, y: number, r: number): Vec3 => [r * Math.cos(phiDeg * DEG), y, r * Math.sin(phiDeg * DEG)];

const AX_UP: DomainSlot = { dir: [0, 1, 0], role: 'axial' };
const AX_DOWN: DomainSlot = { dir: [0, -1, 0], role: 'axial' };
const EQ: DomainSlot[] = [
  { dir: [1, 0, 0], role: 'equatorial' },
  { dir: [-0.5, 0, S3], role: 'equatorial' },
  { dir: [-0.5, 0, -S3], role: 'equatorial' },
];

/** Ideal VSEPR directions for X bonded atoms and E lone pairs (canonical orientation, y up, camera on +z). */
export function idealLayout(x: number, e: number): DomainLayout {
  const key = `${x},${e}`;
  const tetDown = [90, 210, 330].map((p) => none(azimuth(p, -1 / 3, TET_R)));
  switch (key) {
    case '2,0':
      return { ligandSlots: [none([1, 0, 0]), none([-1, 0, 0])], lonePairs: [] };
    case '3,0':
      return { ligandSlots: [none([0, 1, 0]), none([-S3, -0.5, 0]), none([S3, -0.5, 0])], lonePairs: [] };
    case '2,1':
      return { ligandSlots: [none([-S3, -0.5, 0]), none([S3, -0.5, 0])], lonePairs: [none([0, 1, 0])] };
    case '4,0':
      return { ligandSlots: [none([0, 1, 0]), ...tetDown], lonePairs: [] };
    case '3,1':
      return { ligandSlots: tetDown, lonePairs: [none([0, 1, 0])] };
    case '2,2':
      return {
        ligandSlots: [none([TET_HALF_S, -TET_HALF_C, 0]), none([-TET_HALF_S, -TET_HALF_C, 0])],
        lonePairs: [none([0, TET_HALF_C, TET_HALF_S]), none([0, TET_HALF_C, -TET_HALF_S])],
      };
    case '5,0':
      return { ligandSlots: [AX_UP, AX_DOWN, ...EQ], lonePairs: [] };
    case '4,1':
      return { ligandSlots: [AX_UP, AX_DOWN, EQ[1], EQ[2]], lonePairs: [EQ[0]] };
    case '3,2':
      return { ligandSlots: [EQ[0], AX_UP, AX_DOWN], lonePairs: [EQ[1], EQ[2]] };
    case '2,3':
      // Linear: the two atoms are axial, but a linear molecule has no axial/equatorial distinction to report.
      return { ligandSlots: [none([0, 1, 0]), none([0, -1, 0])], lonePairs: [...EQ] };
    case '6,0':
      return {
        ligandSlots: [
          none([0, 1, 0]),
          none([0, -1, 0]),
          none([1, 0, 0]),
          none([-1, 0, 0]),
          none([0, 0, 1]),
          none([0, 0, -1]),
        ],
        lonePairs: [],
      };
    case '5,1':
      return {
        ligandSlots: [
          { dir: [0, 1, 0], role: 'apical' },
          { dir: [1, 0, 0], role: 'basal' },
          { dir: [-1, 0, 0], role: 'basal' },
          { dir: [0, 0, 1], role: 'basal' },
          { dir: [0, 0, -1], role: 'basal' },
        ],
        lonePairs: [none([0, -1, 0])],
      };
    case '4,2':
      return {
        ligandSlots: [none([1, 0, 0]), none([0, 0, 1]), none([-1, 0, 0]), none([0, 0, -1])],
        lonePairs: [none([0, 1, 0]), none([0, -1, 0])],
      };
    default:
      throw new Error(`No VSEPR layout for X=${x}, E=${e}`);
  }
}

/** Angle parameters each shape needs to be built from experimental data. */
export function requiredAngleParams(shape: MolecularGeometryId, mixedLigands: boolean): string[] {
  switch (shape) {
    case 'trigonal-pyramidal':
    case 'bent':
      return ['xAx'];
    case 'trigonal-planar':
      return mixedLigands ? ['xAx'] : [];
    case 'seesaw':
      return ['axAx', 'eqEq'];
    case 't-shaped':
      return ['axEq'];
    case 'square-pyramidal':
      return ['apBas'];
    default:
      return [];
  }
}

/**
 * Directions reproducing measured angles (published symmetry assumed).
 * Falls back to the ideal layout when a parameter is missing.
 */
export function experimentalLayout(
  shape: MolecularGeometryId,
  x: number,
  e: number,
  params: Record<string, number>,
): DomainLayout {
  const ideal = idealLayout(x, e);
  const p = (k: string) => params[k];
  switch (shape) {
    case 'trigonal-pyramidal': {
      if (p('xAx') === undefined) return ideal;
      const cos2 = (2 * Math.cos(p('xAx') * DEG) + 1) / 3;
      const ca = Math.sqrt(Math.max(0, cos2));
      const sa = Math.sqrt(1 - ca * ca);
      return { ligandSlots: [90, 210, 330].map((phi) => none(azimuth(phi, -ca, sa))), lonePairs: ideal.lonePairs };
    }
    case 'bent': {
      if (p('xAx') === undefined) return ideal;
      const h = (p('xAx') / 2) * DEG;
      return {
        ligandSlots: [none([Math.sin(h), -Math.cos(h), 0]), none([-Math.sin(h), -Math.cos(h), 0])],
        lonePairs: ideal.lonePairs,
      };
    }
    case 'trigonal-planar': {
      if (p('xAx') === undefined) return ideal;
      const h = (p('xAx') / 2) * DEG;
      return {
        ligandSlots: [none([0, 1, 0]), none([-Math.sin(h), -Math.cos(h), 0]), none([Math.sin(h), -Math.cos(h), 0])],
        lonePairs: [],
      };
    }
    case 'seesaw': {
      if (p('axAx') === undefined || p('eqEq') === undefined) return ideal;
      const d = ((180 - p('axAx')) / 2) * DEG;
      const h = (p('eqEq') / 2) * DEG;
      return {
        ligandSlots: [
          { dir: [-Math.sin(d), Math.cos(d), 0], role: 'axial' },
          { dir: [-Math.sin(d), -Math.cos(d), 0], role: 'axial' },
          { dir: [-Math.cos(h), 0, Math.sin(h)], role: 'equatorial' },
          { dir: [-Math.cos(h), 0, -Math.sin(h)], role: 'equatorial' },
        ],
        lonePairs: ideal.lonePairs,
      };
    }
    case 't-shaped': {
      if (p('axEq') === undefined) return ideal;
      const a = p('axEq') * DEG;
      return {
        ligandSlots: [
          { dir: [1, 0, 0], role: 'equatorial' },
          { dir: [Math.cos(a), Math.sin(a), 0], role: 'axial' },
          { dir: [Math.cos(a), -Math.sin(a), 0], role: 'axial' },
        ],
        lonePairs: ideal.lonePairs,
      };
    }
    case 'square-pyramidal': {
      if (p('apBas') === undefined) return ideal;
      const b = p('apBas') * DEG;
      const s = Math.sin(b);
      const c = Math.cos(b);
      return {
        ligandSlots: [
          { dir: [0, 1, 0], role: 'apical' },
          { dir: [s, c, 0], role: 'basal' },
          { dir: [-s, c, 0], role: 'basal' },
          { dir: [0, c, s], role: 'basal' },
          { dir: [0, c, -s], role: 'basal' },
        ],
        lonePairs: ideal.lonePairs,
      };
    }
    default:
      return ideal;
  }
}

/** Order ligand indices so that the rarest elements fill the first (unique) slots. */
export function slotAssignment(ligands: string[]): number[] {
  const counts = new Map<string, number>();
  for (const l of ligands) counts.set(l, (counts.get(l) ?? 0) + 1);
  return ligands
    .map((l, i) => ({ i, c: counts.get(l)! }))
    .sort((a, b) => a.c - b.c || a.i - b.i)
    .map((o) => o.i);
}

// ---------------------------------------------------------------------------
// Scene model (pure data; rendered by the 3D viewer)
// ---------------------------------------------------------------------------
export interface SceneAtom {
  index: number;
  element: string;
  position: Vec3; // Å
  role: 'central' | 'terminal';
  slotRole: LigandPositionRole;
}

export interface SceneBond {
  a: number;
  b: number;
  order: BondOrder;
  length: number; // Å
}

export interface SceneLonePair {
  atom: number;
  dir: Vec3;
  central: boolean;
}

export interface SceneAngle {
  a: number;
  b: number;
  value: number; // degrees, measured from the coordinates
  kind: AngleKindId;
  label: string; // e.g. "F(ax)–S–F(eq)"
  groupKey: string;
  representative: boolean;
}

export type GeometryMode = 'ideal' | 'experimental';

export interface SceneModel {
  atoms: SceneAtom[];
  bonds: SceneBond[];
  lonePairs: SceneLonePair[];
  angles: SceneAngle[];
  /** Unit directions of every electron domain on the central atom (bonds first, then lone pairs). */
  domainDirs: { dir: Vec3; lonePair: boolean }[];
  mode: GeometryMode;
  /** True when bond lengths and angles come from measurement rather than the ideal model. */
  measured: boolean;
  radius: number;
}

const ROLE_TAG: Record<LigandPositionRole, string> = {
  axial: '(ax)',
  equatorial: '(eq)',
  apical: '(ap)',
  basal: '(bas)',
  none: '',
};

function angleKind(shape: MolecularGeometryId, ra: LigandPositionRole, rb: LigandPositionRole, value: number): AngleKindId {
  const roles = [ra, rb].sort().join('-');
  if (shape === 'trigonal-bipyramidal' || shape === 'seesaw' || shape === 't-shaped') {
    if (roles === 'axial-axial') return 'ax-ax';
    if (roles === 'equatorial-equatorial') return 'eq-eq';
    return 'ax-eq';
  }
  if (shape === 'square-pyramidal' && roles === 'apical-basal') return 'ap-bas';
  if (shape === 'octahedral' || shape === 'square-planar' || shape === 'square-pyramidal') {
    return value > 135 ? 'trans' : 'cis';
  }
  return 'x-a-x';
}

/** Estimated bond length (Å) for ideal mode: sum of single-bond covalent radii (Cordero et al. 2008). */
export function covalentBondLength(a: string, b: string): number {
  return (getElement(a).covalentRadiusPm + getElement(b).covalentRadiusPm) / 100;
}

function measuredLength(exp: ExperimentalData, element: string, role: LigandPositionRole): number | undefined {
  const cands = exp.bondLengths.filter((b) => b.ligand === element);
  return (cands.find((b) => b.role === role) ?? cands.find((b) => !b.role) ?? cands[0])?.value;
}

function terminalLonePairDirs(bondToCentral: Vec3, count: number, reference: Vec3): Vec3[] {
  if (count <= 0) return [];
  const w = normalize(scale(bondToCentral, -1)); // outward
  if (count === 1) return [w];
  let p = normalize(cross(w, reference));
  if (length(p) < 1e-6) p = perpendicular(w);
  // count 2 → trigonal arrangement (60° from w); count 3 → tetrahedral (70.53° from w)
  const tilt = count === 2 ? 60 * DEG : Math.acos(1 / 3);
  const base = add(scale(w, Math.cos(tilt)), scale(p, Math.sin(tilt)));
  return Array.from({ length: count }, (_, k) => normalize(rotateAround(base, w, (2 * Math.PI * k) / count)));
}

export function buildSceneModel(
  analysis: Analysis,
  opts: { mode: GeometryMode; experimental?: ExperimentalData; layout?: DomainLayout },
): SceneModel {
  if (!analysis.ok || !analysis.lewis || !analysis.vsepr) throw new Error('Cannot build a 3D model for an invalid analysis');
  const { spec, lewis, vsepr } = analysis;
  const shape = vsepr.molecularGeometry;
  const useExp = opts.mode === 'experimental' && !!opts.experimental;
  // A student-chosen layout (angle explorer) replaces the directions; bond lengths stay as selected.
  const layout =
    opts.layout ??
    (useExp ? experimentalLayout(shape, vsepr.bondingDomains, vsepr.lonePairs, opts.experimental!.angleParams) : idealLayout(vsepr.bondingDomains, vsepr.lonePairs));

  const order = slotAssignment(spec.ligands);
  const slotOfLigand = new Map<number, number>();
  order.forEach((ligandIdx, slot) => slotOfLigand.set(ligandIdx, slot));

  const atoms: SceneAtom[] = [{ index: 0, element: spec.central, position: [0, 0, 0], role: 'central', slotRole: 'none' }];
  const bonds: SceneBond[] = [];
  spec.ligands.forEach((el, i) => {
    const slot = layout.ligandSlots[slotOfLigand.get(i)!];
    const len = (useExp ? measuredLength(opts.experimental!, el, slot.role) : undefined) ?? covalentBondLength(spec.central, el);
    atoms.push({ index: i + 1, element: el, position: scale(normalize(slot.dir), len), role: 'terminal', slotRole: slot.role });
    bonds.push({ a: 0, b: i + 1, order: lewis.structure.bonds[i].order, length: len });
  });

  const lonePairs: SceneLonePair[] = layout.lonePairs.map((s) => ({ atom: 0, dir: normalize(s.dir), central: true }));
  // Terminal lone pairs: reference vector keeps them in a consistent, readable plane.
  const molNormal: Vec3 = [0, 0, 1];
  lewis.structure.atoms.forEach((a) => {
    if (a.role !== 'terminal' || a.lonePairs === 0) return;
    const pos = atoms[a.index].position;
    for (const d of terminalLonePairDirs(sub([0, 0, 0], pos), a.lonePairs, molNormal)) {
      lonePairs.push({ atom: a.index, dir: d, central: false });
    }
  });

  const angles: SceneAngle[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const A = atoms[i];
      const B = atoms[j];
      const value = angleAt(A.position, [0, 0, 0], B.position);
      const kind = angleKind(shape, A.slotRole, B.slotRole, value);
      const [first, second] = [A, B].sort((p, q) => (p.element + p.slotRole).localeCompare(q.element + q.slotRole));
      const suffix = kind === 'cis' || kind === 'trans' ? ` (${kind})` : '';
      const label = `${first.element}${ROLE_TAG[first.slotRole]}–${spec.central}–${second.element}${ROLE_TAG[second.slotRole]}${suffix}`;
      const groupKey = `${label}|${kind}|${value.toFixed(1)}`;
      angles.push({ a: A.index, b: B.index, value, kind, label, groupKey, representative: !seen.has(groupKey) });
      seen.add(groupKey);
    }
  }

  const domainDirs = [
    ...atoms.slice(1).map((a) => ({ dir: normalize(a.position), lonePair: false })),
    ...layout.lonePairs.map((s) => ({ dir: normalize(s.dir), lonePair: true })),
  ];
  const radius = Math.max(...atoms.map((a) => length(a.position) + getElement(a.element).covalentRadiusPm / 100));

  return { atoms, bonds, lonePairs, angles, domainDirs, mode: useExp ? 'experimental' : 'ideal', measured: useExp && !opts.layout, radius };
}
