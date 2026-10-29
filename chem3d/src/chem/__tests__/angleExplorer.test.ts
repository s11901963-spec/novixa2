import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { analyze, specOf } from '../analyze';
import { angleHits, angleOfKind, angleTarget, explorerFor, judgeAngle, TOLERANCE } from '../angleExplorer';
import { buildSceneModel } from '../geometry';
import { TETRAHEDRAL_ANGLE } from '../vsepr';

const mol = (id: string) => dataset.moleculesById.get(id)!;
const analysisOf = (id: string) => analyze(specOf(mol(id)));
const measured = (id: string) => {
  const m = mol(id);
  const a = analysisOf(id);
  return m.experimental ? angleOfKind(buildSceneModel(a, { mode: 'experimental', experimental: m.experimental }), explorerFor(a)!.kind) : undefined;
};

describe('angle explorer families', () => {
  it('exists for every species in the data file and starts away from the answer', () => {
    for (const m of dataset.molecules) {
      const a = analyze(specOf(m));
      const ex = explorerFor(a);
      expect(ex, m.id).not.toBeNull();
      const target = angleTarget(ex!, a, measured(m.id));
      if (target.value !== undefined) expect(Math.abs(ex!.start - target.value), m.id).toBeGreaterThan(4);
      expect(ex!.start).toBeGreaterThanOrEqual(ex!.min);
      expect(ex!.start).toBeLessThanOrEqual(ex!.max);
    }
  });

  it('builds 3D layouts whose angle equals the chosen value, for every species', () => {
    for (const m of dataset.molecules) {
      const a = analyze(specOf(m));
      const ex = explorerFor(a)!;
      for (const theta of [ex.min, (ex.min + ex.max) / 2, ex.max]) {
        const scene = buildSceneModel(a, { mode: 'ideal', layout: ex.layout(theta) });
        const values = scene.angles.filter((x) => x.kind === ex.kind).map((x) => x.value);
        expect(values.some((v) => Math.abs(v - theta) < 0.01), `${m.id} θ=${theta}: ${values.map((v) => v.toFixed(2))}`).toBe(true);
        expect(scene.measured).toBe(false);
      }
    }
  });

  it('keeps every angle of the family equal (NH₃ umbrella) and reproduces the ideal shape', () => {
    const a = analysisOf('nh3');
    const ex = explorerFor(a)!;
    const scene = buildSceneModel(a, { mode: 'ideal', layout: ex.layout(100) });
    expect(scene.angles.map((x) => x.value.toFixed(2))).toEqual(['100.00', '100.00', '100.00']);
    const ch4 = analysisOf('ch4');
    const t = buildSceneModel(ch4, { mode: 'ideal', layout: explorerFor(ch4)!.layout(TETRAHEDRAL_ANGLE) });
    expect(t.angles.every((x) => Math.abs(x.value - TETRAHEDRAL_ANGLE) < 0.01)).toBe(true);
  });
});

describe('dragging an atom in the 3D model', () => {
  // The viewer picks the angle whose atom position is nearest to the finger, so an outer atom must
  // move steadily (never back over its own path) as the angle goes from min to max.
  it('moves at least one outer atom steadily along the whole range, for every species and both geometries', () => {
    for (const m of dataset.molecules) {
      const a = analyze(specOf(m));
      const ex = explorerFor(a)!;
      for (const mode of m.experimental ? (['ideal', 'experimental'] as const) : (['ideal'] as const)) {
        const path = (th: number) => buildSceneModel(a, { mode, experimental: m.experimental, layout: ex.layout(th) }).atoms.map((x) => x.position);
        const thetas: number[] = [];
        for (let th = ex.min; th <= ex.max + 1e-9; th += 0.5) thetas.push(th);
        const all = thetas.map(path);
        const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
        const moving = all[0].findIndex((p, i) => i > 0 && dist(p, all[all.length - 1][i]) > 1e-3);
        expect(moving, `${m.id} (${mode})`).toBeGreaterThan(0);
        const fromStart = all.map((ps) => dist(ps[moving], all[0][moving]));
        for (let k = 1; k < fromStart.length; k++) expect(fromStart[k], `${m.id} (${mode}) θ=${thetas[k]}`).toBeGreaterThan(fromStart[k - 1] + 1e-5);
      }
    }
  });
});

describe('judging the student’s angle', () => {
  const judge = (id: string, value: number) => {
    const a = analysisOf(id);
    const ex = explorerFor(a)!;
    return judgeAngle(value, ex, angleTarget(ex, a, measured(id)), a, mol(id).textbook?.angles[0]);
  };

  it('accepts the measured value within ±1.5°', () => {
    expect(judge('nh3', 107).correct).toBe(true);
    expect(judge('h2o', 104.5).correct).toBe(true);
    expect(judge('ch4', 109.5).correct).toBe(true);
    expect(judge('bf3', 120).correct).toBe(true);
    expect(judge('ch2o', 120).correct).toBe(true);
    expect(judge('sf4', 101.5).correct).toBe(true);
  });

  it('colours the model right or wrong with the same rule as the check (±1.5° or the predicted range)', () => {
    expect(TOLERANCE).toBe(1.5);
    expect(angleHits(106.67 + 1.5, { value: 106.67, source: 'measured' })).toBe(true);
    expect(angleHits(106.67 - 1.5, { value: 106.67, source: 'measured' })).toBe(true);
    expect(angleHits(108.5, { value: 106.67, source: 'measured' })).toBe(false);
    expect(angleHits(120, { range: [105, 119.5], source: 'vsepr' })).toBe(false);
    expect(angleHits(105, { range: [105, 119.5], source: 'vsepr' })).toBe(true);
    for (const [id, value] of [['nh3', 107], ['nh3', 120], ['h2o', 104.5], ['h2o', 109.5], ['sf4', 101.5]] as const) {
      const a = analysisOf(id);
      const ex = explorerFor(a)!;
      const target = angleTarget(ex, a, measured(id));
      expect(angleHits(value, target), `${id} ${value}`).toBe(judge(id, value).correct);
    }
  });

  it('explains the typical mistakes', () => {
    expect(judge('nh3', 180).code).toBe('linear');
    expect(judge('nh3', 109.5).code).toBe('ignored-lp');
    expect(judge('h2o', 120).code).toBe('other-geometry');
    expect(judge('ph3', 107.5).code).toBe('book-value');
    expect(judge('nh3', 104).code).toBe('close');
    expect(judge('h2o', 90).code).toBe('other-geometry');
    expect(judge('h2o', 95).code).toBe('too-small');
    expect(judge('nh3', 75).code).toBe('too-small');
  });

  it('judges species without measurements by the VSEPR prediction', () => {
    const a = analysisOf('no2');
    const ex = explorerFor(a)!;
    const target = angleTarget(ex, a, undefined);
    expect(target.source).toBe('vsepr');
    expect(judgeAngle(115, ex, target, a).correct).toBe(true);
    expect(judgeAngle(120, ex, target, a).correct).toBe(false);
    const nbbr5 = analysisOf('nbbr5');
    expect(judgeAngle(120, explorerFor(nbbr5)!, angleTarget(explorerFor(nbbr5)!, nbbr5, undefined), nbbr5).correct).toBe(true);
  });
});
