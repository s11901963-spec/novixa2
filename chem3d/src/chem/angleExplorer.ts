import { experimentalLayout, idealLayout, type DomainLayout, type DomainSlot, type SceneModel } from './geometry';
import type { Analysis, AngleKindId, MolecularGeometryId } from './types';
import { TETRAHEDRAL_ANGLE } from './vsepr';

/**
 * "Change the angle yourself": a one-parameter family of shapes for every VSEPR class,
 * so a student can drag the main bond angle, watch the 3D model follow, and have the
 * chosen value judged against the measured (or VSEPR) value.
 *
 * Each family keeps the molecule's symmetry while the angle changes (all H–N–H angles of
 * NH₃ change together, for example) and keeps the lone-pair directions fixed.
 */

type Vec3 = [number, number, number];
const DEG = Math.PI / 180;
const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => mul(a, 1 / Math.hypot(...a));

export interface AngleExplorer {
  /** The angle the control sets (as named in the 3D scene). */
  kind: AngleKindId;
  min: number;
  max: number;
  /** Where the control starts (never the answer itself). */
  start: number;
  /** The same angle with no lone pairs pressing on the bonds (the electron-geometry value). */
  reference: number;
  layout: (theta: number) => DomainLayout;
}

/** Two bonded atoms bent symmetrically about their bisector. */
function pairBend(base: DomainLayout, fallback: Vec3) {
  const u1 = base.ligandSlots[0].dir as Vec3;
  const u2 = base.ligandSlots[1].dir as Vec3;
  const sum = add(u1, u2);
  const m = Math.hypot(...sum) > 1e-6 ? norm(sum) : fallback;
  const w = norm(add(u1, m, -dot(u1, m)));
  return (theta: number): DomainLayout => {
    const h = (theta / 2) * DEG;
    const slot = (sign: number, role: DomainSlot['role']): DomainSlot => ({ dir: add(mul(m, Math.cos(h)), w, sign * Math.sin(h)), role });
    return { ligandSlots: [slot(1, base.ligandSlots[0].role), slot(-1, base.ligandSlots[1].role)], lonePairs: base.lonePairs };
  };
}

/**
 * Bonds lying in a plane (equally spaced) tilted out of it towards `n`. With k bonds the
 * angle between neighbours satisfies cos θ = cos²γ·cos(360°/k) + sin²γ.
 */
function umbrella(base: DomainLayout, moving: number[], n: Vec3) {
  const k = moving.length;
  const c = Math.cos((2 * Math.PI) / k);
  return (theta: number): DomainLayout => {
    const cos2g = Math.min(1, Math.max(0, (1 - Math.cos(theta * DEG)) / (1 - c)));
    const cg = Math.sqrt(cos2g);
    const sg = Math.sqrt(1 - cos2g);
    const ligandSlots = base.ligandSlots.map((s, i) => {
      if (!moving.includes(i)) return s;
      const d = s.dir as Vec3;
      const flat = norm(add(d, n, -dot(d, n)));
      return { dir: add(mul(flat, cg), n, sg), role: s.role };
    });
    return { ligandSlots, lonePairs: base.lonePairs };
  };
}

/** The adjustable angle for each molecular shape (null if the class is not supported). */
export function explorerFor(analysis: Analysis): AngleExplorer | null {
  const v = analysis.vsepr;
  if (!analysis.ok || !v) return null;
  const x = v.bondingDomains;
  const e = v.lonePairs;
  const shape: MolecularGeometryId = v.molecularGeometry;
  const base = idealLayout(x, e);
  const down: Vec3 = [0, -1, 0];
  switch (shape) {
    case 'linear':
      return { kind: 'x-a-x', min: 60, max: 180, start: 120, reference: 180, layout: pairBend(base, e === 3 ? [-1, 0, 0] : down) };
    case 'bent':
      return { kind: 'x-a-x', min: 60, max: 180, start: 180, reference: e === 1 ? 120 : TETRAHEDRAL_ANGLE, layout: pairBend(base, down) };
    case 'trigonal-planar':
      return { kind: 'x-a-x', min: 60, max: 120, start: 95, reference: 120, layout: umbrella(base, [0, 1, 2], [0, 0, -1]) };
    case 'trigonal-pyramidal':
      return { kind: 'x-a-x', min: 60, max: 120, start: 120, reference: TETRAHEDRAL_ANGLE, layout: (t) => experimentalLayout('trigonal-pyramidal', 3, 1, { xAx: t }) };
    case 'tetrahedral':
      return { kind: 'x-a-x', min: 60, max: 120, start: 120, reference: TETRAHEDRAL_ANGLE, layout: umbrella(base, [1, 2, 3], down) };
    case 'trigonal-bipyramidal':
      return { kind: 'eq-eq', min: 60, max: 120, start: 95, reference: 120, layout: umbrella(base, [2, 3, 4], down) };
    case 'seesaw':
      return { kind: 'eq-eq', min: 60, max: 150, start: 145, reference: 120, layout: (t) => experimentalLayout('seesaw', 4, 1, { axAx: 180, eqEq: t }) };
    case 't-shaped':
      return { kind: 'ax-eq', min: 60, max: 120, start: 115, reference: 90, layout: (t) => experimentalLayout('t-shaped', 3, 2, { axEq: t }) };
    case 'square-planar':
      return { kind: 'cis', min: 60, max: 90, start: 70, reference: 90, layout: umbrella(base, [0, 1, 2, 3], down) };
    case 'square-pyramidal':
      return { kind: 'ap-bas', min: 60, max: 120, start: 115, reference: 90, layout: (t) => experimentalLayout('square-pyramidal', 5, 1, { apBas: t }) };
    case 'octahedral':
      return { kind: 'cis', min: 60, max: 90, start: 70, reference: 90, layout: umbrella(base, [2, 3, 4, 5], down) };
  }
}

/**
 * The explored angle in a (measured) scene: the mean of all angles of that kind. The families
 * keep those angles equal, so the mean is the comparable value (e.g. CH₂O: (116.1 + 2 × 121.9)/3
 * = 120, the planar arrangement).
 */
export function angleOfKind(scene: SceneModel, kind: AngleKindId): number | undefined {
  const values = scene.angles.filter((a) => a.kind === kind).map((a) => a.value);
  if (!values.length) return undefined;
  return values.reduce((s, x) => s + x, 0) / values.length;
}

export interface AngleTarget {
  /** Exact value to reach (± tolerance), when one is known. */
  value?: number;
  /** Accepted interval when only the direction of the deviation is predicted. */
  range?: [number, number];
  source: 'measured' | 'symmetry' | 'vsepr';
}

export const TOLERANCE = 1.5;

/**
 * What counts as correct: the measured gas-phase value when the data file has one; otherwise
 * the exact symmetric value (no lone pairs), or "somewhat smaller than the reference" when lone
 * pairs compress the angle and no measurement is stored.
 */
export function angleTarget(ex: AngleExplorer, analysis: Analysis, measured?: number): AngleTarget {
  if (measured !== undefined) return { value: Math.round(measured * 100) / 100, source: 'measured' };
  const compressed = (analysis.vsepr?.lonePairs ?? 0) > 0 && analysis.vsepr!.idealAngles.some((a) => a.relation === 'less-than');
  if (compressed) return { range: [ex.reference - 15, ex.reference - 0.5], source: 'vsepr' };
  return { value: Math.round(ex.reference * 100) / 100, source: 'symmetry' };
}

export interface AngleJudgement {
  correct: boolean;
  code: 'correct' | 'book-value' | 'linear' | 'ignored-lp' | 'other-geometry' | 'close' | 'too-large' | 'too-small';
  params: Record<string, string | number>;
}

const STANDARD: { value: number; sn: number }[] = [
  { value: 180, sn: 2 },
  { value: 120, sn: 3 },
  { value: TETRAHEDRAL_ANGLE, sn: 4 },
  { value: 90, sn: 6 },
];

export function judgeAngle(value: number, ex: AngleExplorer, target: AngleTarget, analysis: Analysis, bookValue?: number): AngleJudgement {
  const v = analysis.vsepr!;
  const goal = target.value ?? (target.range![0] + target.range![1]) / 2;
  const hit = target.value !== undefined ? Math.abs(value - target.value) <= TOLERANCE : value >= target.range![0] && value <= target.range![1];
  const fmt = (n: number) => Number(n.toFixed(2));
  const params: Record<string, string | number> = { value: fmt(value), target: target.value !== undefined ? fmt(target.value) : `${fmt(target.range![0])}–${fmt(target.range![1])}`, reference: fmt(ex.reference), sn: v.stericNumber, e: v.lonePairs };
  if (hit) return { correct: true, code: 'correct', params };
  if (bookValue !== undefined && Math.abs(value - bookValue) < 0.6 && target.value !== undefined && Math.abs(bookValue - target.value) > 2) {
    return { correct: false, code: 'book-value', params: { ...params, book: bookValue } };
  }
  if (value >= 175 && goal < 170) return { correct: false, code: 'linear', params };
  if (v.lonePairs > 0 && Math.abs(value - ex.reference) < 1.2 && goal < ex.reference - 1) return { correct: false, code: 'ignored-lp', params };
  const other = STANDARD.find((s) => Math.abs(value - s.value) < 1.2 && Math.abs(s.value - ex.reference) > 1);
  if (other) return { correct: false, code: 'other-geometry', params: { ...params, otherSn: other.sn } };
  const diff = value - goal;
  if (Math.abs(diff) <= 4) return { correct: false, code: 'close', params: { ...params, diff: fmt(Math.abs(diff)), direction: diff > 0 ? 'down' : 'up' } };
  return { correct: false, code: diff > 0 ? 'too-large' : 'too-small', params };
}
