import { atoms, getAtom } from '../data/atoms';

/**
 * Electron configurations of neutral atoms in their ground state.
 *
 * The ground state of every element comes from the data file (NIST ASD, see
 * src/data/atoms.json). The Aufbau (Madelung n + l) prediction is computed separately,
 * so the app can show where the simple filling rule and the measured configuration
 * disagree (Cr, Cu, Nb, Mo, …) instead of applying one rule to every element.
 * All four textbook representations — full notation, noble-gas notation, orbital
 * boxes and the electron-dot symbol — are derived from that one configuration.
 */

export const L_LETTERS = ['s', 'p', 'd', 'f'] as const;
export type LLetter = (typeof L_LETTERS)[number];

export interface Subshell {
  n: number;
  l: number;
}
export interface Term extends Subshell {
  count: number;
}

export const subshellLabel = (s: Subshell) => `${s.n}${L_LETTERS[s.l]}`;
export const orbitalCount = (l: number) => 2 * l + 1;
export const capacity = (l: number) => 2 * orbitalCount(l);

/** Aufbau filling order: increasing n + l, then increasing n (1s, 2s, 2p, 3s, 3p, 4s, 3d, …, 7p). */
export const FILLING_ORDER: Subshell[] = (() => {
  const all: Subshell[] = [];
  // n + l ≤ 8 ends the order at 7p (element 118); 6f, 7d and 7f are never occupied.
  for (let n = 1; n <= 7; n++) for (let l = 0; l < Math.min(n, 4); l++) if (n + l <= 8) all.push({ n, l });
  return all.sort((a, b) => a.n + a.l - (b.n + b.l) || a.n - b.n);
})();
const FILLING_INDEX = new Map(FILLING_ORDER.map((s, i) => [subshellLabel(s), i]));
export const fillingIndex = (s: Subshell) => FILLING_INDEX.get(subshellLabel(s)) ?? Number.POSITIVE_INFINITY;

export const NOBLE_GASES = [
  { symbol: 'He', z: 2 },
  { symbol: 'Ne', z: 10 },
  { symbol: 'Ar', z: 18 },
  { symbol: 'Kr', z: 36 },
  { symbol: 'Xe', z: 54 },
  { symbol: 'Rn', z: 86 },
] as const;
export type NobleGas = (typeof NOBLE_GASES)[number];

/** The noble gas that precedes element z (the core of its noble-gas notation), or null for H and He. */
export function previousNobleGas(z: number): NobleGas | null {
  let best: NobleGas | null = null;
  for (const g of NOBLE_GASES) if (g.z < z) best = g;
  return best;
}

/** Fills z electrons strictly in Aufbau order. */
export function aufbauTerms(z: number): Term[] {
  const out: Term[] = [];
  let left = z;
  for (const s of FILLING_ORDER) {
    if (left <= 0) break;
    const count = Math.min(capacity(s.l), left);
    out.push({ ...s, count });
    left -= count;
  }
  return out;
}

// Cores used by NIST ASD ([Cd], [Hg]) besides the noble gases. Each is a closed
// configuration that equals its Aufbau filling.
const DATA_CORES: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Cd: 48, Xe: 54, Hg: 80, Rn: 86 };
const NOBLE_CORES: Record<string, number> = Object.fromEntries(NOBLE_GASES.map((g) => [g.symbol, g.z]));

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------
export type ParseIssue =
  | { code: 'empty' }
  | { code: 'bad-token'; token: string }
  | { code: 'core-position' }
  | { code: 'core-brackets'; core: string }
  | { code: 'core-not-noble'; core: string }
  | { code: 'invalid-subshell'; label: string }
  | { code: 'over-capacity'; label: string; count: number; capacity: number }
  | { code: 'duplicate'; label: string };

export interface ParsedConfiguration {
  core: { symbol: string; z: number } | null;
  /** Terms written after the core, in the order written. */
  terms: Term[];
}

export type ParseResult = { ok: true; value: ParsedConfiguration } | { ok: false; issue: ParseIssue };

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Arabic-Indic and superscript digits → ASCII; a run of superscripts closes a term ("1s²2s²" → "1s2 2s2"). */
function normalize(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (run) => `${[...run].map((c) => SUPERSCRIPT_DIGITS.indexOf(c)).join('')} `)
    .replace(/\^/g, '')
    .replace(/\[\s*([A-Za-z]{1,2})\s*\]/g, '[$1]');
}

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1).toLowerCase();

/**
 * Reads one chunk without separators, e.g. "1s22s22p6" or "3d104s2". Counts may have
 * one or two digits; the strict pass only accepts counts that fit the subshell, which
 * resolves "1s22s2" as 1s² 2s². The lenient pass keeps impossible counts (e.g. "2p7")
 * so they can be reported instead of rejected as unreadable.
 */
function parseChunk(s: string, strict: boolean): Term[] | null {
  if (s === '') return [];
  const m = /^(\d)([spdf])/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  const l = L_LETTERS.indexOf(m[2] as LLetter);
  for (const len of [2, 1, 0]) {
    const digits = s.slice(2, 2 + len);
    if (digits.length !== len || !/^\d*$/.test(digits)) continue;
    const count = len ? Number(digits) : 1;
    if (strict && (count === 0 || count > capacity(l))) continue;
    const rest = parseChunk(s.slice(2 + len), strict);
    if (rest) return [{ n, l, count }, ...rest];
  }
  return null;
}

/**
 * Parses notations such as "1s2 2s2 2p6", "1s²2s²2p⁶", "[Ne] 3s² 3p³", "1s^2 2s^2" or the
 * NIST form "[Ar].3d5.4s". `cores` limits what may appear in brackets.
 */
export function parseConfiguration(text: string, cores: 'noble' | 'data' = 'noble'): ParseResult {
  const allowed = cores === 'noble' ? NOBLE_CORES : DATA_CORES;
  const chunks = normalize(text)
    .split(/[\s.,،;·]+/)
    .filter(Boolean);
  if (!chunks.length) return { ok: false, issue: { code: 'empty' } };

  let core: ParsedConfiguration['core'] = null;
  const terms: Term[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];
    const cm = /^\[([A-Za-z]{1,2})\]/.exec(chunk);
    if (cm) {
      if (i !== 0) return { ok: false, issue: { code: 'core-position' } };
      const symbol = capitalize(cm[1]);
      if (!(symbol in allowed)) return { ok: false, issue: { code: 'core-not-noble', core: symbol } };
      core = { symbol, z: allowed[symbol] };
      chunk = chunk.slice(cm[0].length);
    } else if (chunk.includes('[') || chunk.includes(']')) {
      return { ok: false, issue: i === 0 ? { code: 'bad-token', token: chunk } : { code: 'core-position' } };
    } else if (/^[A-Za-z]{2}$/.test(chunk) && capitalize(chunk) in NOBLE_CORES) {
      return { ok: false, issue: { code: 'core-brackets', core: capitalize(chunk) } };
    }
    const lower = chunk.toLowerCase();
    const parsed = parseChunk(lower, true) ?? parseChunk(lower, false);
    if (!parsed) return { ok: false, issue: { code: 'bad-token', token: chunk } };
    terms.push(...parsed.filter((t) => t.count > 0));
  }
  if (!core && !terms.length) return { ok: false, issue: { code: 'empty' } };

  const seen = new Set<string>();
  for (const t of terms) {
    const label = subshellLabel({ n: t.n, l: t.l });
    if (t.n < 1 || t.n > 7 || t.l >= t.n) return { ok: false, issue: { code: 'invalid-subshell', label } };
    if (t.count > capacity(t.l)) return { ok: false, issue: { code: 'over-capacity', label, count: t.count, capacity: capacity(t.l) } };
    if (seen.has(label)) return { ok: false, issue: { code: 'duplicate', label } };
    seen.add(label);
  }
  return { ok: true, value: { core, terms } };
}

// ---------------------------------------------------------------------------
// Occupancies
// ---------------------------------------------------------------------------
export type Occupancy = Map<string, number>;

export function occupancyOf(terms: Term[]): Occupancy {
  const occ: Occupancy = new Map();
  for (const t of terms) if (t.count > 0) occ.set(subshellLabel(t), (occ.get(subshellLabel(t)) ?? 0) + t.count);
  return occ;
}

export function sameOccupancy(a: Occupancy, b: Occupancy): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

export function totalElectrons(terms: Term[]): number {
  return terms.reduce((s, t) => s + t.count, 0);
}

const parseLabel = (label: string): Subshell => ({ n: Number(label[0]), l: L_LETTERS.indexOf(label[1] as LLetter) });

/** Terms (all electrons, core expanded) sorted in Aufbau filling order. */
export function termsFromOccupancy(occ: Occupancy): Term[] {
  return [...occ.entries()]
    .map(([label, count]) => ({ ...parseLabel(label), count }))
    .sort((a, b) => fillingIndex(a) - fillingIndex(b));
}

/** Expands a parsed notation (core + written terms) to all electrons. */
export function expandParsed(p: ParsedConfiguration): Term[] {
  return [...(p.core ? aufbauTerms(p.core.z) : []), ...p.terms];
}

/**
 * First place where the Aufbau order is broken: an occupied subshell (`label`) that comes
 * after a subshell that is not yet full (`before`). Null when the filling order is respected.
 */
export function aufbauBreak(occ: Occupancy): { label: string; before: string } | null {
  let firstNotFull: string | null = null;
  for (const s of FILLING_ORDER) {
    const label = subshellLabel(s);
    const c = occ.get(label) ?? 0;
    if (firstNotFull && c > 0) return { label, before: firstNotFull };
    if (!firstNotFull && c < capacity(s.l)) firstNotFull = label;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Element configuration and the four representations
// ---------------------------------------------------------------------------
export type Block = 's' | 'p' | 'd' | 'f';

export interface ElectronConfig {
  z: number;
  symbol: string;
  /** Ground state (NIST ASD), all electrons, in Aufbau filling order. */
  terms: Term[];
  /** What the Aufbau rule alone predicts. */
  aufbau: Term[];
  isException: boolean;
  /** Previous noble gas and the electrons written after it. */
  core: NobleGas | null;
  outerTerms: Term[];
  period: number;
  /** Group 1–18; null for La–Lu, which this layout shows in the f-block row. */
  group: number | null;
  block: Block;
  /** Electrons shown in the electron-dot symbol (main-group elements only). */
  dots: { applicable: boolean; count: number; terms: Term[] };
  unpaired: number;
}

const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118];

export function periodOf(z: number): number {
  return PERIOD_ENDS.findIndex((end) => z <= end) + 1;
}

export function groupOf(z: number): number | null {
  const period = periodOf(z);
  const start = period === 1 ? 1 : PERIOD_ENDS[period - 2] + 1;
  const pos = z - start + 1;
  if (period === 1) return z === 1 ? 1 : 18;
  if (period <= 3) return pos <= 2 ? pos : pos + 10;
  if (period <= 5) return pos;
  // Periods 6–7: two s-block columns, then the 15-element f row, then groups 4–18.
  if (pos <= 2) return pos;
  if (pos <= 17) return null;
  return pos - 14;
}

export function blockOf(z: number): Block {
  const g = groupOf(z);
  if (g === null) return 'f';
  if (g <= 2 || z === 2) return 's';
  if (g >= 13) return 'p';
  return 'd';
}

/** Unpaired electrons when every subshell is filled following Hund's rule. */
export function unpairedElectrons(terms: Term[]): number {
  return terms.reduce((s, t) => {
    const k = orbitalCount(t.l);
    return s + (t.count <= k ? t.count : 2 * k - t.count);
  }, 0);
}

const configCache = new Map<number, ElectronConfig>();

export function electronConfig(z: number): ElectronConfig {
  const cached = configCache.get(z);
  if (cached) return cached;
  const atom = getAtom(z);
  const parsed = parseConfiguration(atom.groundState, 'data');
  if (!parsed.ok) throw new Error(`Cannot read ground state of ${atom.symbol}: ${atom.groundState}`);
  const terms = termsFromOccupancy(occupancyOf(expandParsed(parsed.value)));
  const aufbau = aufbauTerms(z);
  const core = previousNobleGas(z);
  const coreOcc = occupancyOf(core ? aufbauTerms(core.z) : []);
  const outerTerms = terms
    .map((t) => ({ ...t, count: t.count - (coreOcc.get(subshellLabel(t)) ?? 0) }))
    .filter((t) => t.count > 0);
  const block = blockOf(z);
  const nMax = Math.max(...terms.map((t) => t.n));
  const dotTerms = terms.filter((t) => t.n === nMax && t.l <= 1);
  const result: ElectronConfig = {
    z,
    symbol: atom.symbol,
    terms,
    aufbau,
    isException: !sameOccupancy(occupancyOf(terms), occupancyOf(aufbau)),
    core,
    outerTerms,
    period: periodOf(z),
    group: groupOf(z),
    block,
    dots: { applicable: block === 's' || block === 'p', count: totalElectrons(dotTerms), terms: dotTerms },
    unpaired: unpairedElectrons(terms),
  };
  configCache.set(z, result);
  return result;
}

export const ATOM_COUNT = atoms.list.length;

/** Running totals while filling in Aufbau order (used for the step-by-step explanation). */
export function fillingSteps(z: number): { label: string; count: number; total: number }[] {
  let total = 0;
  return aufbauTerms(z).map((t) => {
    total += t.count;
    return { label: subshellLabel(t), count: t.count, total };
  });
}

// ---------------------------------------------------------------------------
// Text formatting
// ---------------------------------------------------------------------------
const toSuperscript = (n: number) => [...String(n)].map((d) => SUPERSCRIPT_DIGITS[Number(d)]).join('');

export function termText(t: Term): string {
  return `${subshellLabel(t)}${toSuperscript(t.count)}`;
}

/** "1s² 2s² 2p⁶ 3s¹" or "[Ne] 3s¹" (Unicode superscripts, filling order). */
export function configText(terms: Term[], core?: string | null): string {
  const body = terms.map(termText).join(' ');
  return core ? `[${core}]${body ? ` ${body}` : ''}` : body;
}

export function fullNotation(z: number): string {
  return configText(electronConfig(z).terms);
}

export function nobleGasNotation(z: number): string {
  const c = electronConfig(z);
  return c.core ? configText(c.outerTerms, c.core.symbol) : configText(c.terms);
}

// ---------------------------------------------------------------------------
// Orbital boxes
// ---------------------------------------------------------------------------
export type Spin = 'up' | 'down';
/** One orbital: first and second electron (null = empty slot). */
export type Orbital = [Spin | null, Spin | null];
export interface BoxSubshell extends Subshell {
  label: string;
  orbitals: Orbital[];
}

/** Subshells drawn for element z: 1s up to its last occupied subshell, plus the next one if `withNext`. */
export function boxSubshellsFor(z: number, withNext = false): Subshell[] {
  const c = electronConfig(z);
  const last = Math.max(...c.terms.map((t) => fillingIndex(t)));
  return FILLING_ORDER.slice(0, Math.min(FILLING_ORDER.length, last + 1 + (withNext ? 1 : 0)));
}

/** Boxes filled by Hund's rule (single electrons with parallel spin first, then pairs). */
export function hundBoxes(terms: Term[], subshells: Subshell[]): BoxSubshell[] {
  const occ = occupancyOf(terms);
  return subshells.map((s) => {
    const k = orbitalCount(s.l);
    const c = occ.get(subshellLabel(s)) ?? 0;
    const orbitals: Orbital[] = Array.from({ length: k }, (_, i) => [i < c ? 'up' : null, i + k < c ? 'down' : null]);
    return { ...s, label: subshellLabel(s), orbitals };
  });
}

export function emptyBoxes(subshells: Subshell[]): BoxSubshell[] {
  return subshells.map((s) => ({ ...s, label: subshellLabel(s), orbitals: Array.from({ length: orbitalCount(s.l) }, () => [null, null] as Orbital) }));
}

export const electronsInOrbital = (o: Orbital) => (o[0] ? 1 : 0) + (o[1] ? 1 : 0);

// ---------------------------------------------------------------------------
// Electron-dot symbol
// ---------------------------------------------------------------------------
/**
 * Dots per side [top, right, bottom, left]: one dot on each side before any pairing
 * (common textbook convention), filled right, left, top, bottom. Helium's two
 * electrons are drawn as one pair.
 */
export function dotSides(count: number, helium = false): number[] {
  if (helium) return [0, 2, 0, 0];
  const sides = [0, 0, 0, 0];
  const order = [1, 3, 0, 2];
  for (let i = 0; i < count; i++) sides[order[i % 4]] += 1;
  return sides;
}

// ---------------------------------------------------------------------------
// Diagnosis of student answers
// ---------------------------------------------------------------------------
export interface ElectronDiagnosis {
  correct: boolean;
  code: string;
  params: Record<string, string | number>;
  /** Extra remarks shown with a correct answer. */
  notes: string[];
}

const ok = (notes: string[] = [], params: Record<string, string | number> = {}): ElectronDiagnosis => ({ correct: true, code: 'correct', params, notes });
const wrong = (code: string, params: Record<string, string | number> = {}): ElectronDiagnosis => ({ correct: false, code, params, notes: [] });

/** Shared comparison of an occupancy (all electrons) with the ground state of z. */
function compareOccupancy(z: number, occ: Occupancy): ElectronDiagnosis | null {
  const c = electronConfig(z);
  const total = [...occ.values()].reduce((s, v) => s + v, 0);
  if (total !== z) return wrong('wrong-total', { total, z });
  if (sameOccupancy(occ, occupancyOf(c.terms))) return null;
  if (c.isException && sameOccupancy(occ, occupancyOf(c.aufbau))) {
    return wrong('exception-aufbau', { expected: configText(c.outerTerms, c.core?.symbol) });
  }
  const br = aufbauBreak(occ);
  if (br) return wrong('aufbau-order', br);
  return wrong('mismatch', { expected: configText(c.outerTerms, c.core?.symbol) });
}

export type NotationMode = 'full' | 'noble';

export function diagnoseNotation(z: number, text: string, mode: NotationMode): ElectronDiagnosis {
  const parsed = parseConfiguration(text, 'noble');
  if (!parsed.ok) {
    const { code, ...params } = parsed.issue;
    return wrong(code, params as Record<string, string | number>);
  }
  const p = parsed.value;
  const c = electronConfig(z);
  if (mode === 'full' && p.core) return wrong('core-in-full', { core: p.core.symbol });
  if (mode === 'noble') {
    if (!p.core && c.core) return wrong('core-missing', { expected: c.core.symbol });
    if (p.core && p.core.z >= z) return wrong('core-too-big', { core: p.core.symbol, coreZ: p.core.z, z });
    if (p.core && c.core && p.core.symbol !== c.core.symbol) return wrong('core-not-previous', { core: p.core.symbol, expected: c.core.symbol });
  }
  if (p.core) {
    const coreOcc = occupancyOf(aufbauTerms(p.core.z));
    const overlap = p.terms.find((t) => coreOcc.has(subshellLabel(t)));
    if (overlap) return wrong('core-overlap', { label: subshellLabel(overlap), core: p.core.symbol });
  }
  const verdict = compareOccupancy(z, occupancyOf(expandParsed(p)));
  if (verdict) return verdict;

  const notes: string[] = [];
  const written = p.terms.map(fillingIndex);
  const inFillingOrder = written.every((v, i) => i === 0 || v > written[i - 1]);
  if (!inFillingOrder) {
    const byShell = p.terms.every((t, i) => i === 0 || t.n > p.terms[i - 1].n || (t.n === p.terms[i - 1].n && t.l > p.terms[i - 1].l));
    notes.push(byShell ? 'order-shell' : 'order-other');
  }
  if (c.isException) notes.push('exception');
  return ok(notes);
}

export function diagnoseBoxes(z: number, boxes: BoxSubshell[]): ElectronDiagnosis {
  for (const s of boxes) {
    for (const o of s.orbitals) {
      if (o[0] && o[1] && o[0] === o[1]) return wrong('pauli', { label: s.label });
    }
  }
  const occ: Occupancy = new Map();
  for (const s of boxes) {
    const c = s.orbitals.reduce((sum, o) => sum + electronsInOrbital(o), 0);
    if (c > 0) occ.set(s.label, c);
  }
  const verdict = compareOccupancy(z, occ);
  if (verdict) return verdict;

  let singlesDown = false;
  for (const s of boxes) {
    const counts = s.orbitals.map(electronsInOrbital);
    const filled = counts.reduce((a, b) => a + b, 0);
    if (filled === 0 || filled === 2 * s.orbitals.length) continue;
    if (counts.includes(2) && counts.includes(0)) return wrong('hund-pairing', { label: s.label });
    const singleSpins = new Set(s.orbitals.filter((o) => electronsInOrbital(o) === 1).map((o) => o[0] ?? o[1]));
    if (singleSpins.size > 1) return wrong('hund-parallel', { label: s.label });
    if (singleSpins.has('down')) singlesDown = true;
  }
  const notes = singlesDown ? ['singles-down'] : [];
  if (electronConfig(z).isException) notes.push('exception');
  return ok(notes);
}

export function diagnoseDots(z: number, sides: number[]): ElectronDiagnosis {
  const c = electronConfig(z);
  if (!c.dots.applicable) return wrong('dots-not-applicable');
  const count = sides.reduce((a, b) => a + b, 0);
  const valence = c.dots.count;
  if (count !== valence) {
    if (count === z && z !== valence) return wrong('dots-all-electrons', { count, valence });
    const inner = c.terms.filter((t) => t.n < Math.max(...c.terms.map((x) => x.n)) && t.l >= 2);
    const withD = valence + totalElectrons(inner.filter((t) => t.n === c.period - 1));
    if (inner.length && count === withD) return wrong('dots-counted-d', { count, valence });
    return wrong('dots-wrong-count', { count, valence });
  }
  if (valence !== 2 && sides.some((s) => s === 2) && sides.some((s) => s === 0)) {
    return wrong('dots-paired-early', { valence });
  }
  return ok();
}
