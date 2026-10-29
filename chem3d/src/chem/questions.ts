import { dataset, getElement, type MoleculeData } from '../data';
import { analyze, specOf } from './analyze';
import {
  diagnoseAngle,
  diagnoseBondingPairs,
  diagnoseCentralLonePairs,
  diagnoseElectronGeometry,
  diagnoseFormalCharge,
  diagnoseHybridization,
  diagnoseMolecularGeometry,
  diagnoseValence,
  type Diagnosis,
} from './diagnose';
import { buildSceneModel } from './geometry';
import { createRng, type Rng } from './random';
import { mainAngle } from './steps';
import type { Analysis, AngleSignatureId, ElectronGeometryId, HybridizationId, MolecularGeometryId } from './types';
import { angleSignature, ELECTRON_GEOMETRY_BY_SN, shapeFor, TETRAHEDRAL_ANGLE } from './vsepr';

/**
 * Challenge question generators. Every answer is computed by the engine (or read from
 * the sourced data file) at generation time, so questions change between attempts but
 * stay consistent with the chemistry. Text is referenced by i18n keys; the UI renders it.
 */
export type Level = 1 | 2 | 3;
export type QuestionKind = 'number' | 'single' | 'multi';

export type Label =
  | { t: 'key'; key: string; params?: Record<string, string | number> }
  | { t: 'mg'; id: MolecularGeometryId }
  | { t: 'eg'; id: ElectronGeometryId }
  | { t: 'sig'; id: AngleSignatureId }
  | { t: 'hyb'; id: HybridizationId }
  | { t: 'molecule'; id: string }
  | { t: 'order'; ids: string[] };

export interface Option {
  id: string;
  label: Label;
}

export interface Question {
  uid: string;
  type: string;
  level: Level;
  kind: QuestionKind;
  prompt: { key: string; params: Record<string, string | number> };
  /** Molecules whose formulas appear in the prompt params (rendered as formulas). */
  formulaParams?: Record<string, string>;
  moleculeId?: string;
  /** Show the 3D model before answering (shape recognition). */
  show3dFirst?: boolean;
  options?: Option[];
  answer: string | string[] | number;
  tolerance?: number;
  hintKey: string;
  diagnose?: (answer: string) => Diagnosis;
  explanation?: { key: string; params?: Record<string, string | number> };
  sources?: string[];
  points: number;
}

const POINTS: Record<Level, number> = { 1: 10, 2: 15, 3: 20 };
const molecules = dataset.molecules;
const neutral = molecules.filter((m) => m.charge === 0);
const ions = molecules.filter((m) => m.charge !== 0);
const analysisCache = new Map<string, Analysis>();
export function analysisOf(m: MoleculeData): Analysis {
  let a = analysisCache.get(m.id);
  if (!a) {
    a = analyze(specOf(m));
    analysisCache.set(m.id, a);
  }
  return a;
}

const ALL_EG: ElectronGeometryId[] = ['linear', 'trigonal-planar', 'tetrahedral', 'trigonal-bipyramidal', 'octahedral'];
const ALL_MG: MolecularGeometryId[] = [
  'linear',
  'trigonal-planar',
  'bent',
  'tetrahedral',
  'trigonal-pyramidal',
  'trigonal-bipyramidal',
  'seesaw',
  't-shaped',
  'octahedral',
  'square-pyramidal',
  'square-planar',
];
const ALL_SIG: AngleSignatureId[] = ['a180', 'a120', 'lt120', 'a109', 'lt109', 'a90-120-180', 'lt90-lt120', 'lt90', 'a90-180'];
const ALL_HYB: HybridizationId[] = ['sp', 'sp2', 'sp3', 'sp3d', 'sp3d2'];

let counter = 0;
const uid = (type: string) => `${type}-${++counter}`;

/** Options = the correct id plus distractors (deduplicated), shuffled. */
function choose<T extends string>(rng: Rng, correct: T, preferred: T[], pool: T[], count: number): T[] {
  const set = new Set<T>([correct]);
  for (const p of rng.shuffle(preferred)) if (set.size < count && p !== correct) set.add(p);
  for (const p of rng.shuffle(pool)) if (set.size < count) set.add(p);
  return rng.shuffle([...set]);
}

const molParam = (m: MoleculeData) => ({ formula: m.id });

// ---------------------------------------------------------------------------
// Level 1
// ---------------------------------------------------------------------------
const L1_ELEMENTS = ['Be', 'B', 'C', 'N', 'O', 'F', 'Al', 'Si', 'P', 'S', 'Cl', 'Br', 'I', 'Xe'];

function elementValence(rng: Rng): Question {
  const el = getElement(rng.pick(L1_ELEMENTS));
  return {
    uid: uid('element-valence'),
    type: 'element-valence',
    level: 1,
    kind: 'number',
    prompt: { key: 'q.element-valence', params: { element: el.symbol, nameKey: el.symbol } },
    answer: el.valenceElectrons,
    hintKey: 'ch.hint.valence',
    explanation: { key: 'ch.explain.generic', params: { answer: el.valenceElectrons } },
    points: POINTS[1],
  };
}

function moleculeValence(rng: Rng, level: Level, pool: MoleculeData[]): Question {
  const m = rng.pick(pool);
  const a = analysisOf(m);
  return {
    uid: uid('molecule-valence'),
    type: level === 3 ? 'ion-valence' : 'molecule-valence',
    level,
    kind: 'number',
    prompt: { key: 'q.molecule-valence', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    answer: a.lewis!.valence.total,
    hintKey: 'ch.hint.valence',
    diagnose: (s) => diagnoseValence(Number(s), a),
    explanation: { key: 'ch.explain.generic', params: { answer: a.lewis!.valence.total } },
    points: POINTS[level],
  };
}

function bondingPairs(rng: Rng): Question {
  const m = rng.pick(neutral.filter((x) => analysisOf(x).lewis!.structure.bonds.every((b) => b.order === 1)));
  const a = analysisOf(m);
  const pairs = a.lewis!.bondingElectrons / 2;
  return {
    uid: uid('bonding-pairs'),
    type: 'bonding-pairs',
    level: 1,
    kind: 'number',
    prompt: { key: 'q.bonding-pairs', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    answer: pairs,
    hintKey: 'ch.hint.bonding',
    diagnose: (s) => diagnoseBondingPairs(Number(s), a),
    explanation: { key: 'ch.explain.generic', params: { answer: pairs } },
    points: POINTS[1],
  };
}

const NO_LP = () => neutral.filter((m) => analysisOf(m).vsepr!.lonePairs === 0 && m.ligands.every((l) => l === m.ligands[0]));

function recognizeShape(rng: Rng): Question {
  const m = rng.pick(NO_LP());
  const a = analysisOf(m);
  const correct = a.vsepr!.molecularGeometry;
  const options = choose(rng, correct, ['linear', 'trigonal-planar', 'tetrahedral', 'trigonal-bipyramidal', 'octahedral'], ALL_MG, 4);
  return {
    uid: uid('recognize-shape'),
    type: 'recognize-shape',
    level: 1,
    kind: 'single',
    prompt: { key: 'q.recognize-shape', params: {} },
    moleculeId: m.id,
    show3dFirst: true,
    options: options.map((id) => ({ id, label: { t: 'mg', id } })),
    answer: correct,
    hintKey: 'ch.hint.recognize',
    diagnose: (s) => diagnoseMolecularGeometry(s as MolecularGeometryId, a),
    points: POINTS[1],
  };
}

function basicShape(rng: Rng): Question {
  const m = rng.pick(NO_LP());
  const a = analysisOf(m);
  const correct = a.vsepr!.molecularGeometry;
  const options = choose(rng, correct, ['linear', 'trigonal-planar', 'tetrahedral', 'bent', 'trigonal-pyramidal', 'octahedral', 'trigonal-bipyramidal'], ALL_MG, 4);
  return {
    uid: uid('basic-shape'),
    type: 'basic-shape',
    level: 1,
    kind: 'single',
    prompt: { key: 'q.basic-shape', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    options: options.map((id) => ({ id, label: { t: 'mg', id } })),
    answer: correct,
    hintKey: 'ch.hint.shape',
    diagnose: (s) => diagnoseMolecularGeometry(s as MolecularGeometryId, a),
    points: POINTS[1],
  };
}

function basicAngle(rng: Rng): Question {
  const m = rng.pick(NO_LP());
  const a = analysisOf(m);
  const correct = a.vsepr!.angleSignature;
  const options = choose(rng, correct, ['a180', 'a120', 'a109', 'a90-120-180', 'a90-180'], ALL_SIG, 4);
  return {
    uid: uid('basic-angle'),
    type: 'basic-angle',
    level: 1,
    kind: 'single',
    prompt: { key: 'q.basic-angle', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    options: options.map((id) => ({ id, label: { t: 'sig', id } })),
    answer: correct,
    hintKey: 'ch.hint.angle',
    diagnose: (s) => diagnoseAngle(s as AngleSignatureId, a),
    points: POINTS[1],
  };
}

// ---------------------------------------------------------------------------
// Level 2
// ---------------------------------------------------------------------------
function centralLp(rng: Rng, level: Level, pool: MoleculeData[]): Question {
  const m = rng.pick(pool);
  const a = analysisOf(m);
  return {
    uid: uid('central-lp'),
    type: 'central-lp',
    level,
    kind: 'number',
    prompt: { key: 'q.central-lp', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    answer: a.vsepr!.lonePairs,
    hintKey: 'ch.hint.lp',
    diagnose: (s) => diagnoseCentralLonePairs(Number(s), a),
    explanation: { key: 'ch.explain.generic', params: { answer: a.vsepr!.lonePairs } },
    points: POINTS[level],
  };
}

function predictShape(rng: Rng, level: Level, pool: MoleculeData[]): Question {
  const m = rng.pick(pool);
  const a = analysisOf(m);
  const v = a.vsepr!;
  const correct = v.molecularGeometry;
  const preferred: MolecularGeometryId[] = [];
  if (v.lonePairs > 0) {
    preferred.push(v.electronGeometry as MolecularGeometryId);
    const ignored = shapeFor(v.bondingDomains, 0);
    if (ignored) preferred.push(ignored);
  }
  const options = choose(rng, correct, preferred, ALL_MG, 5);
  return {
    uid: uid('predict-shape'),
    type: level === 3 ? 'ion-shape' : 'predict-shape',
    level,
    kind: 'single',
    prompt: { key: 'q.predict-shape', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    options: options.map((id) => ({ id, label: { t: 'mg', id } })),
    answer: correct,
    hintKey: 'ch.hint.shape',
    diagnose: (s) => diagnoseMolecularGeometry(s as MolecularGeometryId, a),
    points: POINTS[level],
  };
}

function electronGeometryQ(rng: Rng): Question {
  const m = rng.pick(neutral.filter((x) => analysisOf(x).vsepr!.lonePairs > 0));
  const a = analysisOf(m);
  return {
    uid: uid('electron-geometry'),
    type: 'electron-geometry',
    level: 2,
    kind: 'single',
    prompt: { key: 'q.electron-geometry', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    options: rng.shuffle(ALL_EG).map((id) => ({ id, label: { t: 'eg', id } })),
    answer: a.vsepr!.electronGeometry,
    hintKey: 'ch.hint.eg',
    diagnose: (s) => diagnoseElectronGeometry(s as ElectronGeometryId, a),
    points: POINTS[2],
  };
}

function angleDescription(rng: Rng): Question {
  const m = rng.pick(neutral.filter((x) => analysisOf(x).vsepr!.lonePairs > 0));
  const a = analysisOf(m);
  const v = a.vsepr!;
  const correct = v.angleSignature;
  const ideal = angleSignature(ELECTRON_GEOMETRY_BY_SN[v.stericNumber] as MolecularGeometryId, v.stericNumber, false);
  const options = choose(rng, correct, [ideal], ALL_SIG, 5);
  return {
    uid: uid('angle-description'),
    type: 'angle-description',
    level: 2,
    kind: 'single',
    prompt: { key: 'q.angle-description', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    options: options.map((id) => ({ id, label: { t: 'sig', id } })),
    answer: correct,
    hintKey: 'ch.hint.angle',
    diagnose: (s) => diagnoseAngle(s as AngleSignatureId, a),
    points: POINTS[2],
  };
}

function idealAngle(rng: Rng): Question {
  const eg = rng.pick<ElectronGeometryId>(['linear', 'trigonal-planar', 'tetrahedral', 'octahedral']);
  const value = { linear: 180, 'trigonal-planar': 120, tetrahedral: TETRAHEDRAL_ANGLE, octahedral: 90, 'trigonal-bipyramidal': 90 }[eg];
  return {
    uid: uid('ideal-angle'),
    type: 'ideal-angle',
    level: 2,
    kind: 'number',
    prompt: { key: 'q.ideal-angle', params: { egKey: eg } },
    answer: Number(value.toFixed(2)),
    tolerance: 0.6,
    hintKey: 'ch.hint.idealAngle',
    explanation: { key: 'ch.explain.generic', params: { answer: `${value.toFixed(eg === 'tetrahedral' ? 2 : 0)}°` } },
    points: POINTS[2],
  };
}

/** Measured main angle of a dataset molecule (experimental coordinates). */
export function measuredAngle(m: MoleculeData): number | undefined {
  if (!m.experimental) return undefined;
  const scene = buildSceneModel(analysisOf(m), { mode: 'experimental', experimental: m.experimental });
  return mainAngle(scene)?.value;
}

const ORDER_SETS = [
  ['ch4', 'nh3', 'h2o'],
  ['sih4', 'ph3', 'h2s'],
  ['nh3', 'ph3', 'ash3'],
  ['ch4', 'nh3', 'nf3'],
];

function compareAngles(rng: Rng): Question {
  const ids = rng.pick(ORDER_SETS);
  const mols = ids.map((id) => dataset.moleculesById.get(id)!);
  const sorted = [...mols].sort((x, y) => measuredAngle(y)! - measuredAngle(x)!).map((m) => m.id);
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ].map((p) => p.map((i) => sorted[i]));
  const correctKey = sorted.join('>');
  const others = rng.shuffle(perms.filter((p) => p.join('>') !== correctKey)).slice(0, 3);
  const options = rng.shuffle([sorted, ...others]).map((p) => ({ id: p.join('>'), label: { t: 'order', ids: p } as Label }));
  return {
    uid: uid('compare-angles'),
    type: 'compare-angles',
    level: 2,
    kind: 'single',
    prompt: { key: 'q.compare-angles', params: {} },
    options,
    answer: correctKey,
    hintKey: 'ch.hint.trend',
    explanation: {
      key: 'ch.explain.generic',
      params: { answer: sorted.map((id) => `${dataset.moleculesById.get(id)!.formula} ${measuredAngle(dataset.moleculesById.get(id)!)!.toFixed(1)}°`).join(' > ') },
    },
    sources: ['cccbdb'],
    points: POINTS[2],
  };
}

/** Main measured angle and the ideal value it is compared with. */
function deviationOf(m: MoleculeData) {
  const a = analysisOf(m);
  const main = mainAngle(buildSceneModel(a, { mode: 'experimental', experimental: m.experimental }))!;
  const ideal = a.vsepr!.idealAngles.find((x) => x.kind === main.kind) ?? a.vsepr!.idealAngles[0];
  return { main, ideal };
}

function explainDeviation(rng: Rng): Question {
  // Only molecules whose measured angle really is below the ideal one (XeF2, XeF4 are exact by symmetry).
  const pool = neutral.filter((m) => {
    if (!m.experimental || analysisOf(m).vsepr!.lonePairs === 0 || !m.ligands.every((l) => l === m.ligands[0])) return false;
    const { main, ideal } = deviationOf(m);
    return main.value < ideal.value - 0.5;
  });
  const m = rng.pick(pool);
  const a = analysisOf(m);
  const v = a.vsepr!;
  const { main, ideal } = deviationOf(m);
  const multiple = a.lewis!.structure.bonds.some((b) => b.order > 1);
  const distractors = ['opt.dev.attract', 'opt.dev.nolp'];
  if (v.electronGeometry !== 'trigonal-planar') distractors.push('opt.dev.planar');
  if (!multiple) distractors.push('opt.dev.double');
  const options = rng.shuffle(['opt.dev.lp', ...rng.shuffle(distractors).slice(0, 3)]);
  return {
    uid: uid('explain-deviation'),
    type: 'explain-deviation',
    level: 2,
    kind: 'single',
    prompt: { key: 'q.explain-deviation', params: { value: main.value.toFixed(1), ideal: ideal.value.toFixed(ideal.value % 1 ? 1 : 0) } },
    formulaParams: molParam(m),
    moleculeId: m.id,
    options: options.map((k) => ({ id: k, label: { t: 'key', key: k } })),
    answer: 'opt.dev.lp',
    hintKey: 'ch.hint.angle',
    explanation: { key: 'step.bond-angle.less' },
    sources: ['openstax-7-6', ...(m.experimental?.sources ?? [])],
    points: POINTS[2],
  };
}

function hybridizationQ(rng: Rng, level: Level): Question {
  const m = rng.pick(neutral);
  const a = analysisOf(m);
  return {
    uid: uid('hybridization'),
    type: 'hybridization',
    level,
    kind: 'single',
    prompt: { key: 'q.hybridization', params: {} },
    formulaParams: molParam(m),
    moleculeId: m.id,
    options: ALL_HYB.map((id) => ({ id, label: { t: 'hyb', id } })),
    answer: a.vsepr!.hybridization,
    hintKey: 'ch.hint.hyb',
    diagnose: (s) => diagnoseHybridization(s as HybridizationId, a),
    points: POINTS[level],
  };
}

// ---------------------------------------------------------------------------
// Level 3
// ---------------------------------------------------------------------------
function formalChargeQ(rng: Rng): Question {
  // SO2 is excluded: its "textbook" formal charge depends on the Lewis convention used.
  const pool = molecules.filter((m) => m.id !== 'so2' && (m.charge !== 0 || analysisOf(m).lewis!.structure.atoms[0].formalCharge !== 0));
  const m = rng.pick(pool);
  const a = analysisOf(m);
  const fc = a.lewis!.structure.atoms[0].formalCharge;
  return {
    uid: uid('formal-charge'),
    type: 'formal-charge',
    level: 3,
    kind: 'number',
    prompt: { key: 'q.formal-charge', params: { central: m.central } },
    formulaParams: molParam(m),
    moleculeId: m.id,
    answer: fc,
    hintKey: 'ch.hint.fc',
    diagnose: (s) => diagnoseFormalCharge(Number(s), a, 0),
    explanation: { key: 'ch.explain.generic', params: { answer: fc > 0 ? `+${fc}` : fc } },
    points: POINTS[3],
  };
}

function lpSameEg(rng: Rng): Question {
  const eg = rng.pick<ElectronGeometryId>(['tetrahedral', 'trigonal-bipyramidal', 'octahedral']);
  const withEg = molecules.filter((m) => analysisOf(m).vsepr!.electronGeometry === eg);
  const correctPool = withEg.filter((m) => analysisOf(m).vsepr!.lonePairs > 0);
  const wrongPool = molecules.filter((m) => !correctPool.includes(m));
  const nCorrect = rng.int(1, Math.min(3, correctPool.length));
  const picks = [...rng.shuffle(correctPool).slice(0, nCorrect), ...rng.shuffle(wrongPool).slice(0, 5 - nCorrect)];
  const answer = picks.filter((m) => correctPool.includes(m)).map((m) => m.id);
  return {
    uid: uid('lp-same-eg'),
    type: 'lp-same-eg',
    level: 3,
    kind: 'multi',
    prompt: { key: 'q.lp-same-eg', params: { egKey: eg } },
    options: rng.shuffle(picks).map((m) => ({ id: m.id, label: { t: 'molecule', id: m.id } })),
    answer,
    hintKey: 'ch.hint.eg',
    explanation: { key: 'ch.explain.generic', params: { answer: answer.map((id) => dataset.moleculesById.get(id)!.formula).join('، ') } },
    points: POINTS[3],
  };
}

function nonpolarQ(rng: Rng): Question {
  const np = neutral.filter((m) => analysisOf(m).vsepr!.polarity === 'nonpolar');
  const p = neutral.filter((m) => analysisOf(m).vsepr!.polarity === 'polar');
  const nCorrect = rng.int(1, 3);
  const picks = [...rng.shuffle(np).slice(0, nCorrect), ...rng.shuffle(p).slice(0, 5 - nCorrect)];
  const answer = picks.filter((m) => np.includes(m)).map((m) => m.id);
  return {
    uid: uid('nonpolar'),
    type: 'nonpolar',
    level: 3,
    kind: 'multi',
    prompt: { key: 'q.nonpolar', params: {} },
    options: rng.shuffle(picks).map((m) => ({ id: m.id, label: { t: 'molecule', id: m.id } })),
    answer,
    hintKey: 'ch.hint.polar',
    explanation: { key: 'ch.explain.generic', params: { answer: answer.map((id) => dataset.moleculesById.get(id)!.formula).join('، ') } },
    points: POINTS[3],
  };
}

function sameShape(rng: Rng): Question {
  const byShape = new Map<MolecularGeometryId, MoleculeData[]>();
  for (const m of molecules) {
    const s = analysisOf(m).vsepr!.molecularGeometry;
    byShape.set(s, [...(byShape.get(s) ?? []), m]);
  }
  const shapes = [...byShape.entries()].filter(([, ms]) => ms.length >= 2).map(([s]) => s);
  const shape = rng.pick(shapes);
  const [target, match] = rng.shuffle(byShape.get(shape)!);
  const others = rng.shuffle(molecules.filter((m) => analysisOf(m).vsepr!.molecularGeometry !== shape)).slice(0, 3);
  return {
    uid: uid('same-shape'),
    type: 'same-shape',
    level: 3,
    kind: 'single',
    prompt: { key: 'q.same-shape', params: {} },
    formulaParams: molParam(target),
    moleculeId: target.id,
    options: rng.shuffle([match, ...others]).map((m) => ({ id: m.id, label: { t: 'molecule', id: m.id } })),
    answer: match.id,
    hintKey: 'ch.hint.shape',
    explanation: { key: 'ch.explain.generic', params: { answer: match.formula } },
    points: POINTS[3],
  };
}

function octetQ(rng: Rng): Question {
  const less = rng.next() < 0.4;
  const status = (m: MoleculeData) => analysisOf(m).lewis!.centralOctet;
  const correctPool = molecules.filter((m) => status(m) === (less ? 'incomplete' : 'expanded'));
  const wrongPool = molecules.filter((m) => status(m) === 'octet');
  const nCorrect = rng.int(1, Math.min(less ? 2 : 3, correctPool.length));
  const picks = [...rng.shuffle(correctPool).slice(0, nCorrect), ...rng.shuffle(wrongPool).slice(0, 5 - nCorrect)];
  const answer = picks.filter((m) => correctPool.includes(m)).map((m) => m.id);
  return {
    uid: uid('octet'),
    type: less ? 'octet-less' : 'octet-more',
    level: 3,
    kind: 'multi',
    prompt: { key: less ? 'q.octet-less' : 'q.octet-more', params: {} },
    options: rng.shuffle(picks).map((m) => ({ id: m.id, label: { t: 'molecule', id: m.id } })),
    answer,
    hintKey: 'ch.hint.octet',
    explanation: { key: 'ch.explain.generic', params: { answer: answer.map((id) => dataset.moleculesById.get(id)!.formula).join('، ') } },
    sources: ['openstax-7-3'],
    points: POINTS[3],
  };
}

/** Pairs (smaller angle first) and the explanation that applies, from the measured data. */
const TREND_PAIRS: { a: string; b: string; reason: 'ligandEn' | 'centralSize' | 'moreLp'; sources: string[] }[] = [
  { a: 'nf3', b: 'nh3', reason: 'ligandEn', sources: ['gillespieRobinson1996', 'cccbdb'] },
  { a: 'of2', b: 'h2o', reason: 'ligandEn', sources: ['gillespieRobinson1996', 'cccbdb'] },
  { a: 'ph3', b: 'nh3', reason: 'centralSize', sources: ['kutzelnigg1984', 'cccbdb'] },
  { a: 'ash3', b: 'nh3', reason: 'centralSize', sources: ['kutzelnigg1984', 'cccbdb'] },
  { a: 'h2s', b: 'h2o', reason: 'centralSize', sources: ['kutzelnigg1984', 'cccbdb'] },
  { a: 'h2o', b: 'nh3', reason: 'moreLp', sources: ['openstax-7-6', 'cccbdb'] },
  { a: 'nh3', b: 'ch4', reason: 'moreLp', sources: ['openstax-7-6', 'cccbdb'] },
];

function angleTrend(rng: Rng): Question {
  const pair = rng.pick(TREND_PAIRS);
  const A = dataset.moleculesById.get(pair.a)!;
  const B = dataset.moleculesById.get(pair.b)!;
  const opts = ['opt.trend.ligandEn', 'opt.trend.centralSize', 'opt.trend.moreLp', rng.pick(['opt.trend.planar', 'opt.trend.heavier'])];
  return {
    uid: uid('angle-trend'),
    type: 'angle-trend',
    level: 3,
    kind: 'single',
    prompt: { key: 'q.angle-trend', params: { av: measuredAngle(A)!.toFixed(1), bv: measuredAngle(B)!.toFixed(1) } },
    formulaParams: { a: A.id, b: B.id },
    options: rng.shuffle(opts).map((k) => ({ id: k, label: { t: 'key', key: k, params: { aMol: A.id } } })),
    answer: `opt.trend.${pair.reason}`,
    hintKey: 'ch.hint.trend',
    explanation: { key: `exp.trend.${pair.reason}` },
    sources: pair.sources,
    points: POINTS[3],
  };
}

const LIMITS: { id: string; sources: string[] }[] = [
  { id: 'pcl5', sources: ['clark1942'] },
  { id: 'ph3', sources: ['cccbdb', 'kutzelnigg1984'] },
  { id: 'sf6', sources: ['reedWeinhold1986', 'kutzelnigg1984'] },
  { id: 'becl2', sources: ['rundleLewis1952'] },
  { id: 'scope', sources: ['openstax-7-6', 'gillespieRobinson1996'] },
  { id: 'so2', sources: ['suidan1995'] },
];

function limitsQ(rng: Rng, used: Set<string>): Question {
  const item = rng.pick(LIMITS.filter((l) => !used.has(`lim-${l.id}`)).length ? LIMITS.filter((l) => !used.has(`lim-${l.id}`)) : LIMITS);
  used.add(`lim-${item.id}`);
  const opts = rng.shuffle(['a', 'b', 'c', 'd']);
  return {
    uid: uid('limits'),
    type: 'limits',
    level: 3,
    kind: 'single',
    prompt: { key: `lim.${item.id}.q`, params: {} },
    options: opts.map((o) => ({ id: o, label: { t: 'key', key: `lim.${item.id}.${o}` } })),
    answer: 'a',
    hintKey: 'ch.hint.limits',
    explanation: { key: `lim.${item.id}.exp` },
    sources: item.sources,
    points: POINTS[3],
  };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
type Gen = (rng: Rng, used: Set<string>) => Question;

const GENERATORS: Record<Level, Gen[]> = {
  1: [
    (r) => elementValence(r),
    (r) => moleculeValence(r, 1, neutral),
    (r) => bondingPairs(r),
    (r) => recognizeShape(r),
    (r) => basicShape(r),
    (r) => basicAngle(r),
  ],
  2: [
    (r) => centralLp(r, 2, neutral),
    (r) => predictShape(r, 2, neutral.filter((m) => analysisOf(m).vsepr!.lonePairs > 0)),
    (r) => electronGeometryQ(r),
    (r) => angleDescription(r),
    (r) => idealAngle(r),
    (r) => compareAngles(r),
    (r) => explainDeviation(r),
    (r) => hybridizationQ(r, 2),
  ],
  3: [
    (r) => moleculeValence(r, 3, ions),
    (r) => predictShape(r, 3, ions),
    (r) => formalChargeQ(r),
    (r) => lpSameEg(r),
    (r) => nonpolarQ(r),
    (r) => sameShape(r),
    (r) => octetQ(r),
    (r) => angleTrend(r),
    (r, u) => limitsQ(r, u),
    (r, u) => limitsQ(r, u),
  ],
};

function signature(q: Question): string {
  return `${q.type}|${q.moleculeId ?? ''}|${JSON.stringify(q.prompt.params)}|${JSON.stringify(q.formulaParams ?? {})}`;
}

/** A shuffled set of distinct questions for one challenge attempt. */
export function generateSession(level: Level, seed: number, count = 8): Question[] {
  const rng = createRng(seed);
  const gens = GENERATORS[level];
  const out: Question[] = [];
  const seen = new Set<string>();
  const typeCount = new Map<string, number>();
  const used = new Set<string>();
  let guard = 0;
  // Cycle through the generators in a shuffled order so each session mixes question types.
  let order = rng.shuffle(gens.map((_, i) => i));
  while (out.length < count && guard++ < 400) {
    if (!order.length) order = rng.shuffle(gens.map((_, i) => i));
    const q = gens[order.shift()!](rng, used);
    const sig = signature(q);
    if (seen.has(sig) || (typeCount.get(q.type) ?? 0) >= 2) continue;
    seen.add(sig);
    typeCount.set(q.type, (typeCount.get(q.type) ?? 0) + 1);
    out.push(q);
  }
  return out;
}

/** Checks an answer; numbers use the tolerance, multi-select compares sets. */
export function isCorrect(q: Question, answer: string | string[]): boolean {
  if (q.kind === 'number') {
    const n = Number(answer);
    return Number.isFinite(n) && Math.abs(n - (q.answer as number)) <= (q.tolerance ?? 0);
  }
  if (q.kind === 'multi') {
    const a = new Set(answer as string[]);
    const b = new Set(q.answer as string[]);
    return a.size === b.size && [...a].every((x) => b.has(x));
  }
  return answer === q.answer;
}

/** Points for a question solved on attempt `attempt` (1-based), with or without a hint. */
export function scoreFor(q: Question, attempt: number, hintUsed: boolean): number {
  const factor = [1, 0.5, 0.25][attempt - 1] ?? 0;
  return Math.round(q.points * factor * (hintUsed ? 0.7 : 1));
}
