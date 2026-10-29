import type {
  AngleSignatureId,
  ElectronGeometryId,
  HybridizationId,
  IdealAngle,
  MolecularGeometryId,
  PolarityId,
  PolarityReason,
  VseprResult,
} from './types';

/** Exact tetrahedral angle, arccos(−1/3) in degrees. */
export const TETRAHEDRAL_ANGLE = (Math.acos(-1 / 3) * 180) / Math.PI;

export const ELECTRON_GEOMETRY_BY_SN: Record<number, ElectronGeometryId> = {
  2: 'linear',
  3: 'trigonal-planar',
  4: 'tetrahedral',
  5: 'trigonal-bipyramidal',
  6: 'octahedral',
};

export const SN_BY_ELECTRON_GEOMETRY: Record<ElectronGeometryId, number> = {
  linear: 2,
  'trigonal-planar': 3,
  tetrahedral: 4,
  'trigonal-bipyramidal': 5,
  octahedral: 6,
};

/** Molecular geometry for X bonded atoms and E lone pairs on the central atom (VSEPR table). */
const SHAPE_TABLE: Record<string, MolecularGeometryId> = {
  '2,0': 'linear',
  '3,0': 'trigonal-planar',
  '2,1': 'bent',
  '4,0': 'tetrahedral',
  '3,1': 'trigonal-pyramidal',
  '2,2': 'bent',
  '5,0': 'trigonal-bipyramidal',
  '4,1': 'seesaw',
  '3,2': 't-shaped',
  '2,3': 'linear',
  '6,0': 'octahedral',
  '5,1': 'square-pyramidal',
  '4,2': 'square-planar',
};

export function shapeFor(x: number, e: number): MolecularGeometryId | undefined {
  return SHAPE_TABLE[`${x},${e}`];
}

/** Every (X, E) pair that produces a given molecular geometry. */
export function domainCombosFor(shape: MolecularGeometryId): { x: number; e: number }[] {
  return Object.entries(SHAPE_TABLE)
    .filter(([, s]) => s === shape)
    .map(([k]) => {
      const [x, e] = k.split(',').map(Number);
      return { x, e };
    });
}

export const SUPPORTED_COMBOS = Object.keys(SHAPE_TABLE).map((k) => k.split(',').map(Number) as [number, number]);

export const HYBRIDIZATION_BY_SN: Record<number, HybridizationId> = {
  2: 'sp',
  3: 'sp2',
  4: 'sp3',
  5: 'sp3d',
  6: 'sp3d2',
};

export const SN_BY_HYBRIDIZATION: Record<HybridizationId, number> = {
  sp: 2,
  sp2: 3,
  sp3: 4,
  sp3d: 5,
  sp3d2: 6,
};

export function axeLabel(x: number, e: number): string {
  return `AX${x}${e === 0 ? '' : e === 1 ? 'E' : `E${e}`}`;
}

export function parseAxe(label: string): { x: number; e: number } | null {
  const m = /^AX(\d)(?:E(\d)?)?$/.exec(label);
  if (!m) return null;
  return { x: Number(m[1]), e: label.includes('E') ? Number(m[2] ?? 1) : 0 };
}

function idealAngles(shape: MolecularGeometryId, x: number, e: number, mixed: boolean): IdealAngle[] {
  const exactOr = (lp: boolean): IdealAngle['relation'] => (lp ? 'less-than' : mixed ? 'approx' : 'exact');
  switch (shape) {
    case 'linear':
      return [{ kind: 'x-a-x', value: 180, relation: 'exact' }];
    case 'trigonal-planar':
      return [{ kind: 'x-a-x', value: 120, relation: exactOr(false) }];
    case 'bent':
      return [{ kind: 'x-a-x', value: x + e === 3 ? 120 : TETRAHEDRAL_ANGLE, relation: 'less-than' }];
    case 'tetrahedral':
      return [{ kind: 'x-a-x', value: TETRAHEDRAL_ANGLE, relation: exactOr(false) }];
    case 'trigonal-pyramidal':
      return [{ kind: 'x-a-x', value: TETRAHEDRAL_ANGLE, relation: 'less-than' }];
    case 'trigonal-bipyramidal':
      return [
        { kind: 'ax-eq', value: 90, relation: exactOr(false) },
        { kind: 'eq-eq', value: 120, relation: exactOr(false) },
        { kind: 'ax-ax', value: 180, relation: exactOr(false) },
      ];
    case 'seesaw':
      return [
        { kind: 'ax-eq', value: 90, relation: 'less-than' },
        { kind: 'eq-eq', value: 120, relation: 'less-than' },
        { kind: 'ax-ax', value: 180, relation: 'less-than' },
      ];
    case 't-shaped':
      return [
        { kind: 'ax-eq', value: 90, relation: 'less-than' },
        { kind: 'ax-ax', value: 180, relation: 'less-than' },
      ];
    case 'octahedral':
    case 'square-planar':
      return [
        { kind: 'cis', value: 90, relation: exactOr(false) },
        { kind: 'trans', value: 180, relation: exactOr(false) },
      ];
    case 'square-pyramidal':
      return [{ kind: 'ap-bas', value: 90, relation: 'less-than' }];
  }
}

export function angleSignature(shape: MolecularGeometryId, sn: number, mixed: boolean): AngleSignatureId {
  switch (shape) {
    case 'linear':
      return 'a180';
    case 'trigonal-planar':
      return mixed ? 'approx120' : 'a120';
    case 'bent':
      return sn === 3 ? 'lt120' : 'lt109';
    case 'tetrahedral':
      return mixed ? 'approx109' : 'a109';
    case 'trigonal-pyramidal':
      return 'lt109';
    case 'trigonal-bipyramidal':
      return 'a90-120-180';
    case 'seesaw':
      return 'lt90-lt120';
    case 't-shaped':
    case 'square-pyramidal':
      return 'lt90';
    case 'octahedral':
    case 'square-planar':
      return 'a90-180';
  }
}

const SYMMETRIC_SHAPES = new Set<MolecularGeometryId>([
  'linear',
  'trigonal-planar',
  'tetrahedral',
  'trigonal-bipyramidal',
  'octahedral',
  'square-planar',
]);

export function polarityOf(
  shape: MolecularGeometryId,
  ligands: string[],
  charge: number,
): { polarity: PolarityId; reason: PolarityReason } {
  if (charge !== 0) return { polarity: 'ion', reason: 'ion' };
  const allSame = ligands.every((l) => l === ligands[0]);
  if (!SYMMETRIC_SHAPES.has(shape)) return { polarity: 'polar', reason: 'asymmetric-shape' };
  if (!allSame) return { polarity: 'polar', reason: 'different-ligands' };
  return { polarity: 'nonpolar', reason: 'symmetric-cancel' };
}

/** VSEPR classification from the number of bonded atoms and lone pairs on the central atom. */
export function classify(x: number, e: number, ligands: string[], charge: number): VseprResult | null {
  const shape = shapeFor(x, e);
  if (!shape) return null;
  const sn = x + e;
  const mixed = !ligands.every((l) => l === ligands[0]);
  const { polarity, reason } = polarityOf(shape, ligands, charge);
  return {
    bondingDomains: x,
    lonePairs: e,
    stericNumber: sn,
    axe: axeLabel(x, e),
    electronGeometry: ELECTRON_GEOMETRY_BY_SN[sn],
    molecularGeometry: shape,
    hybridization: HYBRIDIZATION_BY_SN[sn],
    idealAngles: idealAngles(shape, x, e, mixed),
    angleSignature: angleSignature(shape, sn, mixed),
    polarity,
    polarityReason: reason,
  };
}
