import { getElement } from '../data';
import type {
  AngleSignatureId,
  Analysis,
  ElectronGeometryId,
  HybridizationId,
  MolecularGeometryId,
  PolarityId,
} from './types';
import {
  angleSignature,
  domainCombosFor,
  ELECTRON_GEOMETRY_BY_SN,
  shapeFor,
  SN_BY_ELECTRON_GEOMETRY,
  SN_BY_HYBRIDIZATION,
} from './vsepr';

/**
 * Instant-feedback diagnosis. Each function compares a student's answer with the
 * engine's analysis and returns a code describing the most likely mistake, plus
 * the values the explanation needs. These rules are designed by this project
 * (see references.json → projectMethods → error-diagnosis).
 */
export type DiagnosisCode =
  | 'correct'
  // valence electrons
  | 'valence-ignored-charge'
  | 'valence-charge-sign'
  | 'valence-atomic-numbers'
  | 'valence-central-only'
  | 'valence-ignored-counts'
  | 'valence-wrong'
  // bonding pairs around the central atom
  | 'bp-counted-electrons'
  | 'bp-ignored-multiple'
  | 'bp-included-lone-pairs'
  | 'bp-wrong'
  // lone pairs on the central atom
  | 'lp-included-terminal'
  | 'lp-gave-electrons'
  | 'lp-ignored-charge'
  | 'lp-octet-limit'
  | 'lp-wrong'
  // steric number
  | 'sn-forgot-lp'
  | 'sn-counted-bond-orders'
  | 'sn-counted-central'
  | 'sn-counted-terminal-lp'
  | 'sn-wrong'
  // electron geometry
  | 'eg-ignored-lp'
  | 'eg-wrong-sn'
  // molecular geometry
  | 'mg-electron-geometry'
  | 'mg-axial-lp'
  | 'mg-cis-lp'
  | 'mg-ignored-lp'
  | 'mg-wrong-sn'
  | 'mg-wrong-lp-count'
  | 'mg-wrong'
  // bond angle description
  | 'angle-not-compressed'
  | 'angle-other-arrangement'
  | 'angle-wrong'
  // hybridization
  | 'hyb-ignored-lp'
  | 'hyb-wrong-sn'
  // polarity
  | 'pol-dipoles-cancel'
  | 'pol-asymmetric'
  | 'pol-different-ligands'
  // formal charge
  | 'fc-sign'
  | 'fc-full-bonding'
  | 'fc-ignored-lp'
  | 'fc-wrong';

export interface Diagnosis {
  correct: boolean;
  code: DiagnosisCode;
  params: Record<string, string | number>;
}

const ok = (params: Diagnosis['params'] = {}): Diagnosis => ({ correct: true, code: 'correct', params });
const no = (code: DiagnosisCode, params: Diagnosis['params'] = {}): Diagnosis => ({ correct: false, code, params });

function req(a: Analysis) {
  if (!a.ok || !a.lewis || !a.vsepr) throw new Error('diagnosis needs a valid analysis');
  return { spec: a.spec, lewis: a.lewis, vsepr: a.vsepr };
}

export function diagnoseValence(answer: number, a: Analysis): Diagnosis {
  const { spec, lewis } = req(a);
  const v = lewis.valence;
  const params = { total: v.total, sumNeutral: v.sumNeutral, charge: spec.charge, answer };
  if (answer === v.total) return ok(params);
  const q = spec.charge;
  if (q !== 0 && answer === v.sumNeutral) return no('valence-ignored-charge', params);
  if (q !== 0 && answer === v.sumNeutral + q) return no('valence-charge-sign', params);
  const sumZ = [spec.central, ...spec.ligands].reduce((s, l) => s + getElement(l).atomicNumber, 0);
  if (answer === sumZ || answer === sumZ - q) return no('valence-atomic-numbers', { ...params, sumZ });
  const vc = getElement(spec.central).valenceElectrons;
  if (answer === vc) return no('valence-central-only', { ...params, central: spec.central, vc });
  const distinct = v.perElement.reduce((s, p) => s + p.valence, 0) - q;
  if (v.perElement.some((p) => p.count > 1) && (answer === distinct || answer === distinct + q)) {
    return no('valence-ignored-counts', params);
  }
  return no('valence-wrong', params);
}

export function diagnoseBondingPairs(answer: number, a: Analysis): Diagnosis {
  const { lewis, vsepr } = req(a);
  const pairs = lewis.bondingElectrons / 2;
  const params = { pairs, x: vsepr.bondingDomains, answer };
  if (answer === pairs) return ok(params);
  if (answer === 2 * pairs) return no('bp-counted-electrons', params);
  if (pairs !== vsepr.bondingDomains && answer === vsepr.bondingDomains) return no('bp-ignored-multiple', params);
  if (vsepr.lonePairs > 0 && answer === pairs + vsepr.lonePairs) return no('bp-included-lone-pairs', { ...params, e: vsepr.lonePairs });
  return no('bp-wrong', params);
}

export function diagnoseCentralLonePairs(answer: number, a: Analysis): Diagnosis {
  const { spec, lewis, vsepr } = req(a);
  const e = vsepr.lonePairs;
  const terminalLp = lewis.terminalElectrons / 2;
  const params = {
    e,
    answer,
    total: lewis.valence.total,
    nb: lewis.bondingElectrons,
    nt: lewis.terminalElectrons,
    central: spec.central,
    terminalLp,
  };
  if (answer === e) return ok(params);
  if (terminalLp > 0 && answer === e + terminalLp) return no('lp-included-terminal', params);
  // Note: (N_v − N_b)/2 equals E + terminal lone pairs, so "forgot to subtract the terminal octets"
  // and "counted the terminal lone pairs" are the same mistake and share one message.
  if (e > 0 && answer === 2 * e) return no('lp-gave-electrons', params);
  const q = spec.charge;
  if (q !== 0 && (answer === e + q / 2 || answer === e - q / 2)) return no('lp-ignored-charge', { ...params, charge: q });
  if (lewis.centralElectrons > 8 && answer === Math.max(0, (8 - lewis.bondingElectrons) / 2)) {
    return no('lp-octet-limit', { ...params, period: getElement(spec.central).period, centralElectrons: lewis.centralElectrons });
  }
  return no('lp-wrong', params);
}

export function diagnoseStericNumber(answer: number, a: Analysis): Diagnosis {
  const { lewis, vsepr } = req(a);
  const pairs = lewis.bondingElectrons / 2;
  const params = { sn: vsepr.stericNumber, x: vsepr.bondingDomains, e: vsepr.lonePairs, answer };
  if (answer === vsepr.stericNumber) return ok(params);
  if (vsepr.lonePairs > 0 && answer === vsepr.bondingDomains) return no('sn-forgot-lp', params);
  if (pairs !== vsepr.bondingDomains && answer === pairs + vsepr.lonePairs) return no('sn-counted-bond-orders', { ...params, pairs });
  if (answer === vsepr.stericNumber + 1) return no('sn-counted-central', params);
  const terminalLp = lewis.terminalElectrons / 2;
  if (terminalLp > 0 && answer === vsepr.stericNumber + terminalLp) return no('sn-counted-terminal-lp', { ...params, terminalLp });
  return no('sn-wrong', params);
}

export function diagnoseElectronGeometry(answer: ElectronGeometryId, a: Analysis): Diagnosis {
  const { vsepr } = req(a);
  const chosenSn = SN_BY_ELECTRON_GEOMETRY[answer];
  const params = { sn: vsepr.stericNumber, chosenSn, correct: vsepr.electronGeometry, answer, x: vsepr.bondingDomains, e: vsepr.lonePairs };
  if (answer === vsepr.electronGeometry) return ok(params);
  if (vsepr.lonePairs > 0 && chosenSn === vsepr.bondingDomains) return no('eg-ignored-lp', params);
  return no('eg-wrong-sn', params);
}

/** Shape a student would get by putting lone pairs in the wrong positions (SN 5 and 6). */
function misplacedLonePairShape(x: number, e: number): { shape: MolecularGeometryId; code: 'mg-axial-lp' | 'mg-cis-lp' } | null {
  const sn = x + e;
  if (sn === 5 && e === 1) return { shape: 'trigonal-pyramidal', code: 'mg-axial-lp' };
  if (sn === 5 && e === 2) return { shape: 'trigonal-planar', code: 'mg-axial-lp' };
  if (sn === 5 && e === 3) return { shape: 'bent', code: 'mg-axial-lp' };
  if (sn === 6 && e === 2) return { shape: 'seesaw', code: 'mg-cis-lp' };
  return null;
}

export function diagnoseMolecularGeometry(answer: MolecularGeometryId, a: Analysis): Diagnosis {
  const { vsepr } = req(a);
  const x = vsepr.bondingDomains;
  const e = vsepr.lonePairs;
  const sn = vsepr.stericNumber;
  const combos = domainCombosFor(answer);
  const params: Diagnosis['params'] = {
    answer,
    correct: vsepr.molecularGeometry,
    electronGeometry: vsepr.electronGeometry,
    sn,
    x,
    e,
    chosenSn: [...new Set(combos.map((c) => c.x + c.e))].join('/'),
    chosenE: [...new Set(combos.filter((c) => c.x + c.e === sn).map((c) => c.e))].join('/'),
  };
  if (answer === vsepr.molecularGeometry) return ok(params);
  if (e > 0 && answer === (vsepr.electronGeometry as string)) return no('mg-electron-geometry', params);
  const misplaced = misplacedLonePairShape(x, e);
  if (misplaced && misplaced.shape === answer) return no(misplaced.code, params);
  if (e > 0 && shapeFor(x, 0) === answer) return no('mg-ignored-lp', params);
  if (!combos.some((c) => c.x + c.e === sn)) return no('mg-wrong-sn', params);
  if (combos.some((c) => c.x + c.e === sn && c.e !== e)) return no('mg-wrong-lp-count', params);
  return no('mg-wrong', params);
}

export function diagnoseAngle(answer: AngleSignatureId, a: Analysis): Diagnosis {
  const { vsepr } = req(a);
  const params = { answer, correct: vsepr.angleSignature, e: vsepr.lonePairs, sn: vsepr.stericNumber };
  if (answer === vsepr.angleSignature) return ok(params);
  const mixed = vsepr.angleSignature.startsWith('approx');
  const idealOfEg = angleSignature(
    { 2: 'linear', 3: 'trigonal-planar', 4: 'tetrahedral', 5: 'trigonal-bipyramidal', 6: 'octahedral' }[vsepr.stericNumber] as MolecularGeometryId,
    vsepr.stericNumber,
    mixed,
  );
  if (vsepr.lonePairs > 0 && answer === idealOfEg) return no('angle-not-compressed', params);
  const sigToSn: Partial<Record<AngleSignatureId, number>> = {
    a120: 3,
    approx120: 3,
    lt120: 3,
    a109: 4,
    approx109: 4,
    lt109: 4,
    'a90-120-180': 5,
    'lt90-lt120': 5,
    'a90-180': 6,
  };
  const chosenSn = sigToSn[answer];
  if (chosenSn !== undefined && chosenSn !== vsepr.stericNumber) {
    return no('angle-other-arrangement', { ...params, chosenEg: ELECTRON_GEOMETRY_BY_SN[chosenSn] });
  }
  return no('angle-wrong', params);
}

export function diagnoseHybridization(answer: HybridizationId, a: Analysis): Diagnosis {
  const { vsepr } = req(a);
  const params = { answer, correct: vsepr.hybridization, sn: vsepr.stericNumber, x: vsepr.bondingDomains, e: vsepr.lonePairs, chosenSn: SN_BY_HYBRIDIZATION[answer] };
  if (answer === vsepr.hybridization) return ok(params);
  if (vsepr.lonePairs > 0 && SN_BY_HYBRIDIZATION[answer] === vsepr.bondingDomains) return no('hyb-ignored-lp', params);
  return no('hyb-wrong-sn', params);
}

export function diagnosePolarity(answer: Exclude<PolarityId, 'ion'>, a: Analysis): Diagnosis {
  const { vsepr } = req(a);
  const params = { answer, correct: vsepr.polarity, shape: vsepr.molecularGeometry };
  if (answer === vsepr.polarity) return ok(params);
  if (vsepr.polarity === 'nonpolar') return no('pol-dipoles-cancel', params);
  if (vsepr.polarityReason === 'different-ligands') return no('pol-different-ligands', params);
  return no('pol-asymmetric', params);
}

/** Formal charge of atom `index` (0 = central) in the primary Lewis structure. */
export function diagnoseFormalCharge(answer: number, a: Analysis, index = 0): Diagnosis {
  const { lewis } = req(a);
  const atom = lewis.structure.atoms[index];
  const V = getElement(atom.element).valenceElectrons;
  const L = atom.lonePairs * 2;
  const B = atom.bondOrderSum * 2;
  const params = { fc: atom.formalCharge, answer, element: atom.element, V, L, B };
  if (answer === atom.formalCharge) return ok(params);
  if (atom.formalCharge !== 0 && answer === -atom.formalCharge) return no('fc-sign', params);
  if (answer === V - L - B) return no('fc-full-bonding', params);
  if (L > 0 && answer === V - B / 2) return no('fc-ignored-lp', params);
  return no('fc-wrong', params);
}
