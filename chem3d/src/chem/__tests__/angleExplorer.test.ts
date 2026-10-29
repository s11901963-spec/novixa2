import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { analyze, specOf } from '../analyze';
import { angleOfKind, angleTarget, explorerFor, judgeAngle } from '../angleExplorer';
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
