import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { analyze, specOf } from '../analyze';
import { buildSceneModel } from '../geometry';
import { buildSteps } from '../steps';

const steps = (id: string, mode: 'ideal' | 'experimental' = 'experimental') => {
  const m = dataset.moleculesById.get(id)!;
  const a = analyze(specOf(m));
  return buildSteps(a, buildSceneModel(a, { mode, experimental: m.experimental }));
};
const num = (s: ReturnType<typeof steps>, id: string) => {
  const r = s.find((x) => x.id === id)!.result;
  if (r.kind !== 'number') throw new Error('not numeric');
  return r.value;
};

describe('solution steps', () => {
  it('CH4: 8 e⁻, 4 bonding pairs, 0 lone pairs, SN 4, tetrahedral, 109.47°, sp3', () => {
    const s = steps('ch4');
    expect(num(s, 'valence')).toBe(8);
    expect(num(s, 'bonding')).toBe(4);
    expect(num(s, 'central-lp')).toBe(0);
    expect(num(s, 'steric-number')).toBe(4);
    const eg = s.find((x) => x.id === 'electron-geometry')!.result;
    expect(eg).toEqual({ kind: 'electron-geometry', value: 'tetrahedral' });
    const angle = s.find((x) => x.id === 'bond-angle')!.result;
    if (angle.kind !== 'angle') throw new Error();
    expect(angle.measured!.value).toBeCloseTo(109.47, 2);
    expect(s.find((x) => x.id === 'hybridization')!.result).toEqual({ kind: 'hybridization', value: 'sp3' });
    expect(s.find((x) => x.id === 'valence')!.substitution).toContain('= 8');
  });

  it('H2O: the angle measured from the experimental model is 104.48°', () => {
    const angle = steps('h2o').find((x) => x.id === 'bond-angle')!.result;
    if (angle.kind !== 'angle') throw new Error();
    expect(angle.measured!.fromExperiment).toBe(true);
    expect(angle.measured!.value).toBeCloseTo(104.48, 2);
    expect(angle.signature).toBe('lt109');
  });

  it('NH4+: the charge appears in the valence substitution', () => {
    const s = steps('nh4', 'ideal');
    expect(s.find((x) => x.id === 'valence')!.substitution).toContain('- (+1)');
    expect(num(s, 'formal-charge')).toBe(1);
    expect(s.some((x) => x.id === 'polarity')).toBe(false);
  });

  it('SF4: one lone pair, the main angle is the equatorial F–S–F', () => {
    const s = steps('sf4');
    expect(num(s, 'central-lp')).toBe(1);
    const angle = s.find((x) => x.id === 'bond-angle')!.result;
    if (angle.kind !== 'angle') throw new Error();
    expect(angle.measured!.label).toBe('F(eq)–S–F(eq)');
    expect(angle.measured!.value).toBeCloseTo(101.55, 2);
  });
});
