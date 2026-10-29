import type { ELECTRON_GEOMETRIES, HYBRIDIZATIONS, MOLECULAR_GEOMETRIES } from '../data/schema';

export type ElectronGeometryId = (typeof ELECTRON_GEOMETRIES)[number];
export type MolecularGeometryId = (typeof MOLECULAR_GEOMETRIES)[number];
export type HybridizationId = (typeof HYBRIDIZATIONS)[number];

export type Vec3 = [number, number, number];

/** What the engine needs to analyse a species: one central atom, its terminal atoms, the net charge. */
export interface MoleculeSpec {
  central: string;
  ligands: string[];
  charge: number;
}

export type BondOrder = 1 | 2 | 3;

export interface LewisAtom {
  index: number;
  element: string;
  role: 'central' | 'terminal';
  lonePairs: number;
  /** Sum of the orders of the bonds to this atom (number of shared pairs). */
  bondOrderSum: number;
  formalCharge: number;
  /** Electrons counted around the atom: 2 per shared pair + 2 per lone pair. */
  electronCount: number;
}

export interface LewisBond {
  a: number;
  b: number;
  order: BondOrder;
}

export interface LewisStructure {
  atoms: LewisAtom[];
  bonds: LewisBond[];
}

export type OctetStatus = 'duet' | 'incomplete' | 'octet' | 'expanded';

export interface ValenceCount {
  perElement: { element: string; count: number; valence: number; subtotal: number }[];
  sumNeutral: number;
  charge: number;
  total: number;
}

export type LewisAlternativeReason = 'formal-charge-minimized' | 'octet-completed';

export interface LewisResult {
  valence: ValenceCount;
  structure: LewisStructure;
  /** All equivalent best structures (resonance forms); always contains `structure`. */
  resonance: LewisStructure[];
  alternatives: { reason: LewisAlternativeReason; structure: LewisStructure }[];
  bondingElectrons: number;
  terminalElectrons: number;
  centralLoneElectrons: number;
  centralElectrons: number;
  centralOctet: OctetStatus;
}

export type AngleRelation = 'exact' | 'less-than' | 'approx';

/** Names of the characteristic angles of each shape (e.g. axial–equatorial). */
export type AngleKindId = 'x-a-x' | 'ax-eq' | 'eq-eq' | 'ax-ax' | 'cis' | 'trans' | 'ap-bas';

export interface IdealAngle {
  kind: AngleKindId;
  value: number;
  relation: AngleRelation;
}

/** Categorical description of what VSEPR predicts for the bond angles of a shape. */
export type AngleSignatureId =
  | 'a180'
  | 'a120'
  | 'approx120'
  | 'lt120'
  | 'a109'
  | 'approx109'
  | 'lt109'
  | 'a90-120-180'
  | 'lt90-lt120'
  | 'lt90'
  | 'a90-180';

export type PolarityId = 'polar' | 'nonpolar' | 'ion';
export type PolarityReason = 'symmetric-cancel' | 'asymmetric-shape' | 'different-ligands' | 'ion';

export interface VseprResult {
  bondingDomains: number;
  lonePairs: number;
  stericNumber: number;
  axe: string;
  electronGeometry: ElectronGeometryId;
  molecularGeometry: MolecularGeometryId;
  hybridization: HybridizationId;
  idealAngles: IdealAngle[];
  angleSignature: AngleSignatureId;
  polarity: PolarityId;
  polarityReason: PolarityReason;
}

export type IssueCode =
  | 'unknown-element'
  | 'too-few-ligands'
  | 'too-many-ligands'
  | 'h-central'
  | 'unsupported-central'
  | 'unsupported-terminal'
  | 'odd-electrons'
  | 'too-few-electrons'
  | 'period2-octet-exceeded'
  | 'too-many-domains'
  | 'unsupported-domain-combination'
  | 'large-formal-charge'
  | 'central-more-electronegative'
  | 'transition-metal'
  | 'transition-metal-dn';

export interface AnalysisIssue {
  code: IssueCode;
  severity: 'error' | 'warning';
  params: Record<string, string | number>;
}

export interface Analysis {
  spec: MoleculeSpec;
  ok: boolean;
  issues: AnalysisIssue[];
  lewis?: LewisResult;
  vsepr?: VseprResult;
}

export type LigandPositionRole = 'axial' | 'equatorial' | 'apical' | 'basal' | 'none';
