import { getElement } from '../data';
import type {
  BondOrder,
  LewisAtom,
  LewisResult,
  LewisStructure,
  MoleculeSpec,
  OctetStatus,
  ValenceCount,
} from './types';

/**
 * Highest bond order a terminal atom may take in a candidate structure.
 * Halogens may take a (hypothetical) double bond so that the engine can show
 * why such structures lose on formal charge (the classic BF3 discussion).
 * 0 means the element is not supported as a terminal atom.
 */
export function maxTerminalBondOrder(symbol: string): number {
  if (symbol === 'H') return 1;
  switch (getElement(symbol).group) {
    case 17:
    case 16:
      return 2;
    case 15:
    case 14:
      return 3;
    default:
      return 0;
  }
}

/** Electrons a terminal atom keeps as lone pairs once its octet (or H duet) is complete. */
export function terminalLoneElectrons(symbol: string, order: number): number {
  return symbol === 'H' ? 0 : 8 - 2 * order;
}

export function countValence(spec: MoleculeSpec): ValenceCount {
  const counts = new Map<string, number>();
  for (const s of [spec.central, ...spec.ligands]) counts.set(s, (counts.get(s) ?? 0) + 1);
  const perElement = [...counts.entries()].map(([element, count]) => {
    const valence = getElement(element).valenceElectrons;
    return { element, count, valence, subtotal: count * valence };
  });
  const sumNeutral = perElement.reduce((s, p) => s + p.subtotal, 0);
  return { perElement, sumNeutral, charge: spec.charge, total: sumNeutral - spec.charge };
}

interface Candidate {
  orders: BondOrder[];
  terminalLone: number[];
  centralLone: number;
  centralElectrons: number;
  formalCharges: number[]; // index 0 = central
  sumAbsFc: number;
  enWeightedFc: number;
  expansion: number;
}

function evaluate(spec: MoleculeSpec, orders: BondOrder[], total: number): Candidate | null {
  const central = getElement(spec.central);
  const terminalLone: number[] = [];
  let used = 0;
  for (let i = 0; i < spec.ligands.length; i++) {
    const lone = terminalLoneElectrons(spec.ligands[i], orders[i]);
    if (lone < 0) return null;
    terminalLone.push(lone);
    used += 2 * orders[i] + lone;
  }
  const centralLone = total - used;
  if (centralLone < 0 || centralLone % 2 !== 0) return null;
  const bondSum = orders.reduce<number>((s, o) => s + o, 0);
  const centralElectrons = 2 * bondSum + centralLone;
  if (central.period <= 2 && centralElectrons > 8) return null;

  const formalCharges = [
    central.valenceElectrons - centralLone - bondSum,
    ...spec.ligands.map((l, i) => getElement(l).valenceElectrons - terminalLone[i] - orders[i]),
  ];
  const symbols = [spec.central, ...spec.ligands];
  return {
    orders,
    terminalLone,
    centralLone,
    centralElectrons,
    formalCharges,
    sumAbsFc: formalCharges.reduce((s, f) => s + Math.abs(f), 0),
    enWeightedFc: formalCharges.reduce((s, f, i) => s + f * getElement(symbols[i]).electronegativity, 0),
    expansion: Math.max(0, centralElectrons - 8),
  };
}

function* orderAssignments(maxOrders: number[]): Generator<BondOrder[]> {
  const current = maxOrders.map(() => 1 as BondOrder);
  const n = maxOrders.length;
  while (true) {
    yield [...current];
    let i = n - 1;
    while (i >= 0 && current[i] === maxOrders[i]) {
      current[i] = 1;
      i--;
    }
    if (i < 0) return;
    current[i] = (current[i] + 1) as BondOrder;
  }
}

const EPS = 1e-9;

function compareScore(a: Candidate, b: Candidate): number {
  if (a.sumAbsFc !== b.sumAbsFc) return a.sumAbsFc - b.sumAbsFc;
  if (Math.abs(a.enWeightedFc - b.enWeightedFc) > EPS) return a.enWeightedFc - b.enWeightedFc;
  return 0;
}

/** Sorted bond orders per ligand element: two candidates with equal keys are resonance forms. */
function multisetKey(spec: MoleculeSpec, c: Candidate): string {
  const byElement = new Map<string, number[]>();
  spec.ligands.forEach((l, i) => byElement.set(l, [...(byElement.get(l) ?? []), c.orders[i]]));
  return [...byElement.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([el, os]) => `${el}:${os.sort().join(',')}`)
    .join('|');
}

function lexicographicallyGreater(a: BondOrder[], b: BondOrder[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

function octetStatus(symbol: string, electrons: number): OctetStatus {
  if (symbol === 'H') return 'duet';
  if (electrons < 8) return 'incomplete';
  if (electrons === 8) return 'octet';
  return 'expanded';
}

function toStructure(spec: MoleculeSpec, c: Candidate): LewisStructure {
  const atoms: LewisAtom[] = [
    {
      index: 0,
      element: spec.central,
      role: 'central',
      lonePairs: c.centralLone / 2,
      bondOrderSum: c.orders.reduce<number>((s, o) => s + o, 0),
      formalCharge: c.formalCharges[0],
      electronCount: c.centralElectrons,
    },
    ...spec.ligands.map((l, i) => ({
      index: i + 1,
      element: l,
      role: 'terminal' as const,
      lonePairs: c.terminalLone[i] / 2,
      bondOrderSum: c.orders[i],
      formalCharge: c.formalCharges[i + 1],
      electronCount: 2 * c.orders[i] + c.terminalLone[i],
    })),
  ];
  return { atoms, bonds: spec.ligands.map((_, i) => ({ a: 0, b: i + 1, order: c.orders[i] })) };
}

export type LewisFailure =
  | { code: 'odd-electrons'; total: number }
  | { code: 'too-few-electrons'; total: number; needed: number }
  | { code: 'period2-octet-exceeded'; total: number; minimum: number };

/**
 * Builds the Lewis structure(s) for a species with one central atom.
 *
 * Selection rule (documented in references.json → projectMethods):
 *  1. hard constraints: H keeps a duet, period-2 atoms never exceed an octet,
 *     terminal atoms complete their octet;
 *  2. expand the central atom's octet only as far as necessary;
 *  3. smallest total |formal charge|;
 *  4. negative formal charge on the more electronegative atoms.
 */
export function buildLewis(spec: MoleculeSpec): { ok: true; result: LewisResult } | { ok: false; failure: LewisFailure } {
  const valence = countValence(spec);
  const total = valence.total;
  if (total % 2 !== 0) return { ok: false, failure: { code: 'odd-electrons', total } };

  const maxOrders = spec.ligands.map(maxTerminalBondOrder);
  const valid: Candidate[] = [];
  for (const orders of orderAssignments(maxOrders)) {
    const c = evaluate(spec, orders, total);
    if (c) valid.push(c);
  }

  if (valid.length === 0) {
    // Explain why: compare with the electrons needed for single bonds + terminal octets.
    const singles = spec.ligands.reduce((s, l) => s + 2 + terminalLoneElectrons(l, 1), 0);
    if (total < singles) return { ok: false, failure: { code: 'too-few-electrons', total, needed: singles } };
    return {
      ok: false,
      failure: { code: 'period2-octet-exceeded', total, minimum: 2 * spec.ligands.length + (total - singles) },
    };
  }

  const minExpansion = Math.min(...valid.map((c) => c.expansion));
  const pool = valid.filter((c) => c.expansion === minExpansion);
  pool.sort(compareScore);
  const best = pool[0];
  const bestKey = multisetKey(spec, best);
  const resonanceCandidates = pool.filter((c) => compareScore(c, best) === 0 && multisetKey(spec, c) === bestKey);
  let primary = resonanceCandidates[0];
  for (const c of resonanceCandidates) if (lexicographicallyGreater(c.orders, primary.orders)) primary = c;
  const resonance = [primary, ...resonanceCandidates.filter((c) => c !== primary)];

  const alternatives: LewisResult['alternatives'] = [];
  const globalBest = [...valid].sort(compareScore)[0];
  if (globalBest.sumAbsFc < primary.sumAbsFc) {
    alternatives.push({ reason: 'formal-charge-minimized', structure: toStructure(spec, globalBest) });
  }
  if (primary.centralElectrons < 8 && spec.central !== 'H') {
    const octet = valid.filter((c) => c.centralElectrons === 8).sort(compareScore)[0];
    if (octet) alternatives.push({ reason: 'octet-completed', structure: toStructure(spec, octet) });
  }

  const bondSum = primary.orders.reduce<number>((s, o) => s + o, 0);
  return {
    ok: true,
    result: {
      valence,
      structure: toStructure(spec, primary),
      resonance: resonance.map((c) => toStructure(spec, c)),
      alternatives,
      bondingElectrons: 2 * bondSum,
      terminalElectrons: primary.terminalLone.reduce((s, x) => s + x, 0),
      centralLoneElectrons: primary.centralLone,
      centralElectrons: primary.centralElectrons,
      centralOctet: octetStatus(spec.central, primary.centralElectrons),
    },
  };
}
