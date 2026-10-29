import { getElement } from '../data';
import { angleAt, type SceneModel } from './geometry';
import type {
  AngleSignatureId,
  Analysis,
  ElectronGeometryId,
  HybridizationId,
  IdealAngle,
  MolecularGeometryId,
  PolarityId,
  Vec3,
} from './types';

export type StepId =
  | 'valence'
  | 'bonding'
  | 'terminal'
  | 'central-lp'
  | 'formal-charge'
  | 'steric-number'
  | 'electron-geometry'
  | 'molecular-geometry'
  | 'bond-angle'
  | 'hybridization'
  | 'polarity';

export type UnitId = 'electrons' | 'pairs' | 'domains' | 'charge' | 'degrees';

export type StepResult =
  | { kind: 'number'; value: number; unit: UnitId }
  | { kind: 'electron-geometry'; value: ElectronGeometryId }
  | { kind: 'molecular-geometry'; value: MolecularGeometryId; axe: string }
  | { kind: 'angle'; signature: AngleSignatureId; ideal: IdealAngle[]; measured?: { value: number; label: string; fromExperiment: boolean } }
  | { kind: 'hybridization'; value: HybridizationId }
  | { kind: 'polarity'; value: PolarityId };

export interface SolutionStep {
  id: StepId;
  /** General rule in TeX (symbols only, no language-specific words). */
  formula: string;
  /** The rule with this molecule's numbers substituted. */
  substitution: string;
  result: StepResult;
  /** Values used by the localized explanation text. */
  params: Record<string, string | number>;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const fmt = (n: number, digits = 2) => Number(n.toFixed(digits)).toString();

export function axeTex(axe: string): string {
  const m = /^AX(\d)(?:E(\d)?)?$/.exec(axe);
  if (!m) return `\\mathrm{${axe}}`;
  const e = axe.includes('E') ? `\\mathrm{E}${m[2] ? `_{${m[2]}}` : ''}` : '';
  return `\\mathrm{AX}_{${m[1]}}${e}`;
}

function idealAngleTex(eg: ElectronGeometryId): string {
  switch (eg) {
    case 'linear':
      return '\\theta = 180^\\circ';
    case 'trigonal-planar':
      return '\\theta = \\dfrac{360^\\circ}{3} = 120^\\circ';
    case 'tetrahedral':
      return '\\theta = \\arccos\\!\\left(-\\tfrac{1}{3}\\right) \\approx 109.47^\\circ';
    case 'trigonal-bipyramidal':
      return '\\theta_{\\mathrm{ax\\text{-}eq}} = 90^\\circ,\\; \\theta_{\\mathrm{eq\\text{-}eq}} = 120^\\circ,\\; \\theta_{\\mathrm{ax\\text{-}ax}} = 180^\\circ';
    case 'octahedral':
      return '\\theta_{\\mathrm{cis}} = 90^\\circ,\\; \\theta_{\\mathrm{trans}} = 180^\\circ';
  }
}

/** Picks the angle that best represents the shape (the one the textbook quotes). */
export function mainAngle(scene: SceneModel): SceneModel['angles'][number] | undefined {
  const reps = scene.angles.filter((a) => a.representative);
  const priority = ['x-a-x', 'eq-eq', 'ap-bas', 'ax-eq', 'cis', 'ax-ax', 'trans'];
  return [...reps].sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind))[0];
}

/** Ordered solution steps for an analysed species, each with TeX and the numbers used. */
export function buildSteps(analysis: Analysis, scene?: SceneModel): SolutionStep[] {
  if (!analysis.ok || !analysis.lewis || !analysis.vsepr) return [];
  const { spec, lewis, vsepr } = analysis;
  const steps: SolutionStep[] = [];
  const v = lewis.valence;
  const q = spec.charge;

  // 1 — valence electrons
  const terms = v.perElement.map((p) => `${p.count}(${p.valence})`).join(' + ');
  const qTerm = q === 0 ? '- 0' : `- (${signed(q)})`;
  steps.push({
    id: 'valence',
    formula: 'N_{\\mathrm{v}} = \\sum_i n_i\\,v_i - q',
    substitution: `N_{\\mathrm{v}} = ${terms} ${qTerm} = ${v.total}`,
    result: { kind: 'number', value: v.total, unit: 'electrons' },
    params: { total: v.total, charge: q, sumNeutral: v.sumNeutral },
  });

  // 2 — bonding electrons (shared pairs × 2)
  const bondSum = lewis.bondingElectrons / 2;
  steps.push({
    id: 'bonding',
    formula: 'N_{\\mathrm{b}} = 2\\sum b',
    substitution: `N_{\\mathrm{b}} = 2 \\times ${bondSum} = ${lewis.bondingElectrons}`,
    result: { kind: 'number', value: bondSum, unit: 'pairs' },
    params: { pairs: bondSum, electrons: lewis.bondingElectrons, atoms: spec.ligands.length },
  });

  // 3 — electrons that complete the terminal atoms' octets
  const groups = new Map<string, { count: number; order: number; element: string }>();
  lewis.structure.bonds.forEach((b, i) => {
    const el = spec.ligands[i];
    if (el === 'H') return;
    const key = `${el}|${b.order}`;
    const g = groups.get(key) ?? { count: 0, order: b.order, element: el };
    g.count++;
    groups.set(key, g);
  });
  const terminalTex = [...groups.values()].map((g) => `${g.count}(8 - 2\\cdot${g.order})`).join(' + ');
  steps.push({
    id: 'terminal',
    formula: 'N_{\\mathrm{t}} = \\sum_{t \\neq \\mathrm{H}} \\left(8 - 2b_t\\right)',
    substitution: `N_{\\mathrm{t}} = ${terminalTex || '0'} = ${lewis.terminalElectrons}`,
    result: { kind: 'number', value: lewis.terminalElectrons, unit: 'electrons' },
    params: { electrons: lewis.terminalElectrons, onlyHydrogen: groups.size === 0 ? 1 : 0 },
  });

  // 4 — lone pairs on the central atom
  steps.push({
    id: 'central-lp',
    formula: 'E = \\dfrac{N_{\\mathrm{v}} - N_{\\mathrm{b}} - N_{\\mathrm{t}}}{2}',
    substitution: `E = \\dfrac{${v.total} - ${lewis.bondingElectrons} - ${lewis.terminalElectrons}}{2} = ${vsepr.lonePairs}`,
    result: { kind: 'number', value: vsepr.lonePairs, unit: 'pairs' },
    params: {
      lp: vsepr.lonePairs,
      centralElectrons: lewis.centralElectrons,
      octet: lewis.centralOctet,
      central: spec.central,
    },
  });

  // 5 — formal charge of the central atom
  const c = lewis.structure.atoms[0];
  const V = getElement(spec.central).valenceElectrons;
  const others = lewis.structure.atoms
    .filter((a) => a.role === 'terminal' && a.formalCharge !== 0)
    .map((a) => `${a.element}${a.index}:${signed(a.formalCharge)}`);
  steps.push({
    id: 'formal-charge',
    formula: 'FC = V - L - \\tfrac{1}{2}B',
    substitution: `FC_{\\mathrm{${spec.central}}} = ${V} - ${c.lonePairs * 2} - \\tfrac{1}{2}(${c.bondOrderSum * 2}) = ${c.formalCharge === 0 ? '0' : signed(c.formalCharge)}`,
    result: { kind: 'number', value: c.formalCharge, unit: 'charge' },
    params: { fc: c.formalCharge, others: others.join(', '), central: spec.central },
  });

  // 6 — steric number
  steps.push({
    id: 'steric-number',
    formula: 'SN = X + E',
    substitution: `SN = ${vsepr.bondingDomains} + ${vsepr.lonePairs} = ${vsepr.stericNumber}`,
    result: { kind: 'number', value: vsepr.stericNumber, unit: 'domains' },
    params: { x: vsepr.bondingDomains, e: vsepr.lonePairs, sn: vsepr.stericNumber, multiple: bondSum > vsepr.bondingDomains ? 1 : 0 },
  });

  // 7 — electron geometry
  steps.push({
    id: 'electron-geometry',
    formula: '',
    substitution: `SN = ${vsepr.stericNumber}`,
    result: { kind: 'electron-geometry', value: vsepr.electronGeometry },
    params: { sn: vsepr.stericNumber },
  });

  // 8 — molecular geometry
  steps.push({
    id: 'molecular-geometry',
    formula: '\\mathrm{AX}_{m}\\mathrm{E}_{n}',
    substitution: axeTex(vsepr.axe),
    result: { kind: 'molecular-geometry', value: vsepr.molecularGeometry, axe: vsepr.axe },
    params: { x: vsepr.bondingDomains, e: vsepr.lonePairs },
  });

  // 9 — bond angle: ideal value, then the value measured from the 3D coordinates
  let measured: { value: number; label: string; fromExperiment: boolean } | undefined;
  let substitution = idealAngleTex(vsepr.electronGeometry);
  const main = scene ? mainAngle(scene) : undefined;
  if (scene && main) {
    const u = scene.atoms[main.a].position;
    const w = scene.atoms[main.b].position;
    const o: Vec3 = [0, 0, 0];
    const cosv = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w));
    const value = angleAt(u, o, w);
    measured = { value, label: main.label, fromExperiment: scene.measured };
    substitution = `\\theta = \\arccos\\!\\left(\\dfrac{\\vec{u}\\cdot\\vec{v}}{|\\vec{u}|\\,|\\vec{v}|}\\right) = \\arccos(${fmt(cosv, 4)}) = ${fmt(value)}^\\circ`;
  }
  steps.push({
    id: 'bond-angle',
    formula: idealAngleTex(vsepr.electronGeometry),
    substitution,
    result: { kind: 'angle', signature: vsepr.angleSignature, ideal: vsepr.idealAngles, measured },
    params: { e: vsepr.lonePairs, label: main?.label ?? '' },
  });

  // 10 — hybridization (traditional teaching label)
  steps.push({
    id: 'hybridization',
    formula: '',
    substitution: `SN = ${vsepr.stericNumber} \\;\\Rightarrow\\; \\mathrm{${hybridizationTex(vsepr.hybridization)}}`,
    result: { kind: 'hybridization', value: vsepr.hybridization },
    params: { sn: vsepr.stericNumber, expanded: vsepr.stericNumber >= 5 ? 1 : 0 },
  });

  // 11 — polarity (neutral species only)
  if (vsepr.polarity !== 'ion') {
    const centralEn = getElement(spec.central).electronegativity;
    const deltas = [...new Set(spec.ligands)].map((l) => {
      const d = Math.abs(getElement(l).electronegativity - centralEn);
      return `\\Delta\\chi_{\\mathrm{${spec.central}-${l}}} = |${fmt(centralEn)} - ${fmt(getElement(l).electronegativity)}| = ${fmt(d)}`;
    });
    steps.push({
      id: 'polarity',
      formula: '\\vec{\\mu}_{\\mathrm{mol}} = \\sum \\vec{\\mu}_{\\mathrm{bond}}',
      substitution: deltas.join(',\\quad '),
      result: { kind: 'polarity', value: vsepr.polarity },
      params: { reason: vsepr.polarityReason },
    });
  }
  return steps;
}

export function hybridizationTex(h: HybridizationId): string {
  return { sp: 'sp', sp2: 'sp^2', sp3: 'sp^3', sp3d: 'sp^3d', sp3d2: 'sp^3d^2' }[h];
}
