import { atoms, getAtom } from '../data/atoms';
import {
  aufbauTerms,
  boxSubshellsFor,
  capacity,
  configText,
  diagnoseBoxes,
  diagnoseNotation,
  electronConfig,
  FILLING_ORDER,
  fillingIndex,
  hundBoxes,
  NOBLE_GASES,
  orbitalCount,
  subshellLabel,
  unpairedElectrons,
  type BoxSubshell,
  type Term,
} from './electrons';
import type { Level, Option, Question } from './questions';
import type { Rng } from './random';

/**
 * Challenge questions on electron configurations. Answers and distractors are produced
 * by chem/electrons from the NIST ground states, and every distractor is checked to be
 * wrong (tests verify this), so a question never offers two correct options.
 */

const POINTS: Record<Level, number> = { 1: 10, 2: 15, 3: 20 };
const RULE_SOURCES = ['openstax-6-4', 'nist-asd'];
let counter = 0;
const uid = (type: string) => `${type}-e${++counter}`;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const regular = (z: number) => !electronConfig(z).isException;
const atomParam = (z: number) => ({ atomZ: z });

const MAIN_20 = range(1, 20).filter((z) => electronConfig(z).dots.applicable);
const MAIN_HEAVY = [...range(31, 36), ...range(49, 54), 19, 20, 37, 38];
const LETTERS = ['s', 'p', 'd', 'f'] as const;

function textOptions(texts: string[]): Option[] {
  const ids = ['a', 'b', 'c', 'd'];
  return texts.map((text, i) => ({ id: ids[i], label: { t: 'text', text } }));
}

/** Correct text first, then distinct distractors that the engine marks wrong; shuffled. */
function textChoice(rng: Rng, z: number, mode: 'full' | 'noble', correct: string, candidates: string[]) {
  const seen = new Set([correct]);
  const distractors: string[] = [];
  for (const c of rng.shuffle(candidates)) {
    if (distractors.length >= 3 || seen.has(c)) continue;
    if (diagnoseNotation(z, c, mode).correct) continue;
    seen.add(c);
    distractors.push(c);
  }
  const texts = rng.shuffle([correct, ...distractors]);
  const options = textOptions(texts);
  const answer = options[texts.indexOf(correct)].id;
  const feedback = (id: string) => {
    const text = texts[options.findIndex((o) => o.id === id)];
    if (text === undefined) return null;
    const d = diagnoseNotation(z, text, mode);
    return d.correct ? null : { key: `ec.diag.${d.code}`, params: d.params };
  };
  return { options, answer, feedback };
}

const withCount = (terms: Term[], i: number, delta: number) => terms.map((t, j) => (j === i ? { ...t, count: t.count + delta } : t)).filter((t) => t.count > 0);

// ---------------------------------------------------------------------------
// Level 1
// ---------------------------------------------------------------------------
function dotsCount(rng: Rng, pool: number[], level: Level): Question {
  const z = rng.pick(pool);
  const c = electronConfig(z);
  return {
    uid: uid('ec-dots'),
    type: 'ec-dots',
    level,
    kind: 'number',
    prompt: { key: 'eq.dots-count', params: atomParam(z) },
    answer: c.dots.count,
    hintKey: 'ch.hint.ec.dots',
    feedback: (a) => {
      const n = Number(a);
      if (n === z && z !== c.dots.count) return { key: 'ch.ec.dotsAll' };
      if (c.group !== null && c.group >= 13 && n === c.group) return { key: 'ch.ec.dotsGroup' };
      if (n === c.dots.count + 10) return { key: 'ch.ec.dotsD' };
      return null;
    },
    explanation: { key: 'exp.ec.dots', params: { terms: configText(c.dots.terms), n: c.dots.count } },
    sources: ['openstax-7-3', 'openstax-6-4'],
    points: POINTS[level],
  };
}

function capacityQ(rng: Rng): Question {
  const l = rng.int(0, 3);
  const asOrbitals = rng.next() < 0.4;
  const cap = capacity(l);
  const orb = orbitalCount(l);
  return {
    uid: uid('ec-capacity'),
    type: asOrbitals ? 'ec-orbitals' : 'ec-capacity',
    level: 1,
    kind: 'number',
    prompt: { key: asOrbitals ? 'eq.orbitals' : 'eq.capacity', params: { sub: LETTERS[l] } },
    answer: asOrbitals ? orb : cap,
    hintKey: 'ch.hint.ec.capacity',
    feedback: (a) => {
      const n = Number(a);
      if (!asOrbitals && n === orb) return { key: 'ch.ec.capOrbitals' };
      if (asOrbitals && n === cap) return { key: 'ch.ec.orbitalsCap' };
      return null;
    },
    explanation: { key: 'exp.ec.capacity', params: { sub: LETTERS[l], orbitals: orb, cap } },
    sources: ['openstax-6-4'],
    points: POINTS[1],
  };
}

function nobleCore(rng: Rng): Question {
  const z = rng.pick(range(3, 54).filter(regular));
  const c = electronConfig(z);
  const correct = c.core!.symbol;
  const others = NOBLE_GASES.filter((g) => g.symbol !== correct && g.z <= 54).map((g) => g.symbol);
  const texts = rng.shuffle([correct, ...rng.shuffle(others).slice(0, 3)]);
  const options: Option[] = texts.map((s) => ({ id: s, label: { t: 'text', text: `[${s}]` } }));
  return {
    uid: uid('ec-core'),
    type: 'ec-core',
    level: 1,
    kind: 'single',
    prompt: { key: 'eq.noble-core', params: atomParam(z) },
    options,
    answer: correct,
    hintKey: 'ch.hint.ec.core',
    feedback: (id) => {
      const g = NOBLE_GASES.find((x) => x.symbol === id);
      if (!g) return null;
      const params: Record<string, string | number> = g.z >= z ? { core: g.symbol, coreZ: g.z, z } : { core: g.symbol, expected: correct };
      return { key: g.z >= z ? 'ec.diag.core-too-big' : 'ec.diag.core-not-previous', params };
    },
    explanation: { key: 'exp.ec.core', params: { core: correct, config: configText(c.outerTerms, correct) } },
    sources: RULE_SOURCES,
    points: POINTS[1],
  };
}

function fullDistractors(terms: Term[]): string[] {
  const out: string[] = [];
  const last = terms.length - 1;
  // wrong total
  out.push(configText(withCount(terms, last, terms[last].count < capacity(terms[last].l) ? 1 : -1)));
  out.push(configText(withCount(terms, last, -1)));
  // Aufbau broken: one electron moved from the previous full subshell to the last one
  if (last >= 1 && terms[last].count < capacity(terms[last].l)) out.push(configText(withCount(withCount(terms, last - 1, -1), last, 1)));
  // last electrons placed in the next subshell instead
  const next = FILLING_ORDER[fillingIndex(terms[last]) + 1];
  if (next) out.push(configText([...terms.slice(0, last), { ...next, count: Math.min(terms[last].count, capacity(next.l)) }]));
  // over capacity: an s subshell with three electrons
  const sIdx = terms.findIndex((t) => t.l === 0 && t.count === 2 && t !== terms[last]);
  if (sIdx >= 0) out.push(configText(withCount(withCount(terms, sIdx, 1), last, -1)));
  return out;
}

function chooseFull(rng: Rng): Question {
  const z = rng.pick(range(3, 20));
  const c = electronConfig(z);
  const correct = configText(c.terms);
  const { options, answer, feedback } = textChoice(rng, z, 'full', correct, fullDistractors(c.terms));
  return {
    uid: uid('ec-full'),
    type: 'ec-choose-full',
    level: 1,
    kind: 'single',
    prompt: { key: 'eq.choose-full', params: { ...atomParam(z), z } },
    options,
    answer,
    hintKey: 'ch.hint.ec.order',
    feedback,
    explanation: { key: 'exp.ec.config', params: { config: correct } },
    sources: RULE_SOURCES,
    points: POINTS[1],
  };
}

// ---------------------------------------------------------------------------
// Level 2
// ---------------------------------------------------------------------------
function unpairedQ(rng: Rng, pool: number[], level: Level): Question {
  const z = rng.pick(pool);
  const c = electronConfig(z);
  const lastPartial = [...c.terms].reverse().find((t) => t.count < capacity(t.l));
  const aufbauUnpaired = unpairedElectrons(c.aufbau);
  return {
    uid: uid('ec-unpaired'),
    type: level === 3 ? 'ec-unpaired-d' : 'ec-unpaired',
    level,
    kind: 'number',
    prompt: { key: 'eq.unpaired', params: atomParam(z) },
    answer: c.unpaired,
    hintKey: 'ch.hint.ec.hund',
    feedback: (a) => {
      const n = Number(a);
      if (c.isException && n === aufbauUnpaired && n !== c.unpaired) return { key: 'ch.ec.unpairedAufbau', params: { ground: configText(c.outerTerms, c.core?.symbol) } };
      if (lastPartial && n === lastPartial.count && lastPartial.count > orbitalCount(lastPartial.l)) return { key: 'ch.ec.unpairedAll' };
      if (n === 0 && c.unpaired > 0) return { key: 'ch.ec.unpairedZero' };
      return null;
    },
    explanation: { key: 'exp.ec.unpaired', params: { config: configText(c.outerTerms, c.core?.symbol), n: c.unpaired } },
    sources: RULE_SOURCES,
    points: POINTS[level],
  };
}

function chooseNoble(rng: Rng): Question {
  const z = rng.pick(range(11, 54).filter(regular));
  const c = electronConfig(z);
  const core = c.core!;
  const correct = configText(c.outerTerms, core.symbol);
  const gi = NOBLE_GASES.findIndex((g) => g.symbol === core.symbol);
  const candidates: string[] = [];
  if (gi > 0) candidates.push(configText(c.outerTerms, NOBLE_GASES[gi - 1].symbol));
  if (NOBLE_GASES[gi + 1]) candidates.push(configText(c.outerTerms, NOBLE_GASES[gi + 1].symbol));
  const coreTerms = aufbauTerms(core.z);
  candidates.push(configText([coreTerms[coreTerms.length - 1], ...c.outerTerms], core.symbol));
  const last = c.outerTerms.length - 1;
  candidates.push(configText(withCount(c.outerTerms, last, c.outerTerms[last].count < capacity(c.outerTerms[last].l) ? 1 : -1), core.symbol));
  const sTerm = c.outerTerms.findIndex((t) => t.l === 0);
  if (sTerm >= 0 && c.outerTerms.length > 1) candidates.push(configText(c.outerTerms.filter((_, i) => i !== sTerm).map((t, i, arr) => (i === arr.length - 1 ? { ...t, count: Math.min(capacity(t.l), t.count + c.outerTerms[sTerm].count) } : t)), core.symbol));
  const { options, answer, feedback } = textChoice(rng, z, 'noble', correct, candidates);
  return {
    uid: uid('ec-noble'),
    type: 'ec-choose-noble',
    level: 2,
    kind: 'single',
    prompt: { key: 'eq.choose-noble', params: { ...atomParam(z), z } },
    options,
    answer,
    hintKey: 'ch.hint.ec.core',
    feedback,
    explanation: { key: 'exp.ec.config', params: { config: correct } },
    sources: RULE_SOURCES,
    points: POINTS[2],
  };
}

export type RuleKind = 'aufbau' | 'pauli' | 'hund' | 'none';

/** An orbital diagram for z that breaks exactly one rule (or none). */
export function ruleFigure(z: number, kind: RuleKind): BoxSubshell[] {
  const c = electronConfig(z);
  const subs = boxSubshellsFor(z, true);
  const boxes = hundBoxes(c.terms, subs);
  if (kind === 'none') return boxes;
  if (kind === 'pauli') return boxes.map((b) => (b.label === '1s' ? { ...b, orbitals: [['up', 'up']] } : b));
  if (kind === 'hund') {
    const p = [...c.terms].reverse().find((t) => t.l === 1 && t.count >= 2 && t.count <= 4)!;
    const label = subshellLabel(p);
    const pairs = p.count === 4 ? 2 : 1;
    return boxes.map((b) =>
      b.label !== label
        ? b
        : { ...b, orbitals: b.orbitals.map((_, i) => (i < pairs ? ['up', 'down'] : i === pairs && p.count - 2 * pairs === 1 ? ['up', null] : [null, null])) },
    );
  }
  // aufbau: one electron leaves the full subshell just before the last one and joins the last one
  const last = c.terms[c.terms.length - 1];
  const before = c.terms[c.terms.length - 2];
  const terms = c.terms.map((t) => (t === before ? { ...t, count: t.count - 1 } : t === last ? { ...t, count: t.count + 1 } : t));
  return hundBoxes(terms, subs);
}

const RULE_POOL = [6, 7, 8, 14, 15, 16];

function ruleViolated(rng: Rng, level: Level): Question {
  const z = rng.pick(RULE_POOL);
  const kind = rng.pick<RuleKind>(['aufbau', 'pauli', 'hund', 'none']);
  const kinds: RuleKind[] = ['aufbau', 'pauli', 'hund', 'none'];
  return {
    uid: uid('ec-rule'),
    type: 'ec-rule',
    level,
    kind: 'single',
    prompt: { key: 'eq.rule', params: atomParam(z) },
    figure: { t: 'boxes', boxes: ruleFigure(z, kind) },
    options: kinds.map((k) => ({ id: k, label: { t: 'key', key: `opt.rule.${k}` } })),
    answer: kind,
    hintKey: 'ch.hint.ec.rules',
    explanation: { key: `exp.ec.rule.${kind}` },
    sources: ['openstax-6-4'],
    points: POINTS[level],
  };
}

function sublevelCount(rng: Rng): Question {
  const z = rng.pick(range(11, 36).filter(regular));
  const c = electronConfig(z);
  const term = rng.pick(c.terms.filter((t) => t.n >= 2));
  return {
    uid: uid('ec-sub'),
    type: 'ec-sublevel',
    level: 2,
    kind: 'number',
    prompt: { key: 'eq.sublevel-count', params: { ...atomParam(z), sub: subshellLabel(term) } },
    answer: term.count,
    hintKey: 'ch.hint.ec.order',
    explanation: { key: 'exp.ec.config', params: { config: configText(c.terms) } },
    sources: RULE_SOURCES,
    points: POINTS[2],
  };
}

// ---------------------------------------------------------------------------
// Level 3
// ---------------------------------------------------------------------------
const EXCEPTIONS = [24, 29, 42, 46, 47, 79];

function exceptionQ(rng: Rng): Question {
  const z = rng.pick(EXCEPTIONS);
  const c = electronConfig(z);
  const core = c.core!.symbol;
  const coreZ = c.core!.z;
  const correct = configText(c.outerTerms, core);
  const aufbauOuter = c.aufbau.slice(aufbauTerms(coreZ).length);
  const candidates = [configText(aufbauOuter, core)];
  const s = aufbauOuter.find((t) => t.l === 0);
  const d = aufbauOuter.find((t) => t.l === 2);
  if (s && d) {
    if (d.count + s.count <= 10) candidates.push(configText(aufbauOuter.filter((t) => t !== s).map((t) => (t === d ? { ...t, count: d.count + s.count } : t)), core));
    const pNext = FILLING_ORDER[fillingIndex(d) + 1];
    if (d.count > 1) candidates.push(configText([...aufbauOuter.map((t) => (t === d ? { ...t, count: d.count - 1 } : t)), { ...pNext, count: 1 }], core));
    candidates.push(configText(aufbauOuter.map((t) => (t === s ? { ...t, count: 1 } : t === d ? { ...t, count: d.count } : t)), core));
  }
  const { options, answer, feedback } = textChoice(rng, z, 'noble', correct, candidates);
  return {
    uid: uid('ec-exc'),
    type: 'ec-exception',
    level: 3,
    kind: 'single',
    prompt: { key: 'eq.exception', params: atomParam(z) },
    options,
    answer,
    hintKey: 'ch.hint.ec.exception',
    feedback,
    explanation: { key: 'exp.ec.exception', params: { aufbau: configText(c.aufbau.slice(aufbauTerms(coreZ).length), core), ground: correct } },
    sources: RULE_SOURCES,
    points: POINTS[3],
  };
}

function identify(rng: Rng): Question {
  const z = rng.pick(range(11, 54).filter(regular));
  const c = electronConfig(z);
  const near = rng.shuffle([z - 1, z + 1, z - 2, z + 2, ...atoms.list.filter((a) => a.z !== z && electronConfig(a.z).group === c.group && a.z <= 54).map((a) => a.z)].filter((x) => x >= 1 && x <= 54 && x !== z));
  const zs = rng.shuffle([z, ...[...new Set(near)].slice(0, 3)]);
  return {
    uid: uid('ec-id'),
    type: 'ec-identify',
    level: 3,
    kind: 'single',
    prompt: { key: 'eq.identify', params: { config: configText(c.outerTerms, c.core?.symbol) } },
    options: zs.map((x) => ({ id: String(x), label: { t: 'atom', z: x } })),
    answer: String(z),
    hintKey: 'ch.hint.ec.identify',
    feedback: (id) => {
      const other = Number(id);
      if (!other || other === z) return null;
      return { key: 'ch.ec.identifyCount', params: { total: z, other: getAtom(other).symbol, otherZ: other } };
    },
    explanation: { key: 'exp.ec.identify', params: { ...atomParam(z), z } },
    sources: RULE_SOURCES,
    points: POINTS[3],
  };
}

function sameValence(rng: Rng): Question {
  const groups = [1, 2, 13, 14, 15, 16, 17];
  const g = rng.pick(groups);
  const members = atoms.list.filter((a) => a.z <= 54 && electronConfig(a.z).group === g && a.z !== 1).map((a) => a.z);
  const [ref, ...rest] = rng.shuffle(members);
  const same = rng.shuffle(rest).slice(0, rng.int(1, 2));
  const othersPool = atoms.list.filter((a) => a.z <= 54 && electronConfig(a.z).dots.applicable && electronConfig(a.z).group !== g && electronConfig(a.z).group !== 18).map((a) => a.z);
  const others = rng.shuffle(othersPool).slice(0, 4 - same.length);
  const zs = rng.shuffle([...same, ...others]);
  return {
    uid: uid('ec-same'),
    type: 'ec-same-valence',
    level: 3,
    kind: 'multi',
    prompt: { key: 'eq.same-valence', params: atomParam(ref) },
    options: zs.map((x) => ({ id: String(x), label: { t: 'atom', z: x } })),
    answer: same.map(String),
    hintKey: 'ch.hint.ec.dots',
    explanation: { key: 'exp.ec.same-valence', params: { n: electronConfig(ref).dots.count } },
    sources: ['openstax-6-4'],
    points: POINTS[3],
  };
}

type Gen = (rng: Rng) => Question;

export const ELECTRON_GENERATORS: Record<Level, Gen[]> = {
  1: [(r) => dotsCount(r, MAIN_20, 1), (r) => capacityQ(r), (r) => nobleCore(r), (r) => chooseFull(r)],
  2: [
    (r) => unpairedQ(r, range(5, 36).filter(regular), 2),
    (r) => chooseNoble(r),
    (r) => ruleViolated(r, 2),
    (r) => sublevelCount(r),
    (r) => dotsCount(r, MAIN_HEAVY, 2),
  ],
  3: [(r) => exceptionQ(r), (r) => identify(r), (r) => unpairedQ(r, range(21, 30), 3), (r) => sameValence(r), (r) => ruleViolated(r, 3)],
};

/** For tests: the rule each generated figure breaks, as the engine diagnoses it. */
export function diagnoseFigure(z: number, kind: RuleKind) {
  return diagnoseBoxes(z, ruleFigure(z, kind));
}
