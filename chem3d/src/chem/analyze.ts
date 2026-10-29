import { dataset, getElement } from '../data';
import type { MoleculeData } from '../data';
import { buildLewis, maxTerminalBondOrder } from './lewis';
import type { Analysis, AnalysisIssue, MoleculeSpec } from './types';
import { classify } from './vsepr';

export function specOf(m: Pick<MoleculeData, 'central' | 'ligands' | 'charge'>): MoleculeSpec {
  return { central: m.central, ligands: [...m.ligands], charge: m.charge };
}

const SUPPORTED_CENTRAL_GROUPS = new Set([2, 13, 14, 15, 16, 17, 18]);

/** Full analysis of a species: valence electrons, Lewis structure, VSEPR classification, issues. */
export function analyze(spec: MoleculeSpec): Analysis {
  const issues: AnalysisIssue[] = [];
  const fail = (issue: AnalysisIssue): Analysis => ({ spec, ok: false, issues: [...issues, issue] });

  for (const s of [spec.central, ...spec.ligands]) {
    if (!dataset.elements.has(s)) return fail({ code: 'unknown-element', severity: 'error', params: { element: s } });
  }
  if (spec.ligands.length < 2) {
    return fail({ code: 'too-few-ligands', severity: 'error', params: { count: spec.ligands.length } });
  }
  if (spec.ligands.length > 6) {
    return fail({ code: 'too-many-ligands', severity: 'error', params: { count: spec.ligands.length } });
  }
  if (spec.central === 'H') return fail({ code: 'h-central', severity: 'error', params: {} });
  if (!SUPPORTED_CENTRAL_GROUPS.has(getElement(spec.central).group)) {
    return fail({ code: 'unsupported-central', severity: 'error', params: { element: spec.central } });
  }
  for (const l of spec.ligands) {
    if (maxTerminalBondOrder(l) === 0) {
      return fail({ code: 'unsupported-terminal', severity: 'error', params: { element: l } });
    }
  }

  const built = buildLewis(spec);
  if (!built.ok) {
    const f = built.failure;
    if (f.code === 'odd-electrons') return fail({ code: 'odd-electrons', severity: 'error', params: { total: f.total } });
    if (f.code === 'too-few-electrons') {
      return fail({ code: 'too-few-electrons', severity: 'error', params: { total: f.total, needed: f.needed } });
    }
    return fail({
      code: 'period2-octet-exceeded',
      severity: 'error',
      params: { element: spec.central, total: f.total, minimum: f.minimum },
    });
  }
  const lewis = built.result;

  const x = spec.ligands.length;
  const e = lewis.centralLoneElectrons / 2;
  if (x + e > 6) {
    return { spec, ok: false, lewis, issues: [...issues, { code: 'too-many-domains', severity: 'error', params: { sn: x + e } }] };
  }
  const vsepr = classify(x, e, spec.ligands, spec.charge);
  if (!vsepr) {
    return {
      spec,
      ok: false,
      lewis,
      issues: [...issues, { code: 'unsupported-domain-combination', severity: 'error', params: { x, e } }],
    };
  }

  const maxFc = Math.max(...lewis.structure.atoms.map((a) => Math.abs(a.formalCharge)));
  if (maxFc >= 2) issues.push({ code: 'large-formal-charge', severity: 'warning', params: { value: maxFc } });
  const centralEn = getElement(spec.central).electronegativity;
  const lowerEn = spec.ligands.filter((l) => l !== 'H' && getElement(l).electronegativity < centralEn);
  if (lowerEn.length > 0) {
    issues.push({ code: 'central-more-electronegative', severity: 'warning', params: { element: lowerEn[0] } });
  }

  return { spec, ok: true, issues, lewis, vsepr };
}

/** Finds a dataset molecule with exactly this composition (ligand order ignored). */
export function findMoleculeBySpec(spec: MoleculeSpec): MoleculeData | undefined {
  const key = (s: MoleculeSpec) => `${s.central}|${[...s.ligands].sort().join(',')}|${s.charge}`;
  const k = key(spec);
  return dataset.molecules.find((m) => key(specOf(m)) === k);
}
