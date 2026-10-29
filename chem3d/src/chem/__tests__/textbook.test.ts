import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { analyze, specOf } from '../analyze';
import { buildSceneModel } from '../geometry';
import { mainAngle } from '../steps';
import { TETRAHEDRAL_ANGLE } from '../vsepr';

const book = dataset.molecules.filter((m) => m.textbook).sort((a, b) => a.textbook!.order - b.textbook!.order);

describe('course textbook Table 6-4', () => {
  it('contains the seven molecules of the table, in order', () => {
    expect(book.map((m) => m.formula)).toEqual(['BeCl2', 'AlCl3', 'CH4', 'PH3', 'H2O', 'NbBr5', 'SF6']);
  });

  it('agrees with the engine on pairs, hybridization and shape', () => {
    for (const m of book) {
      const a = analyze(specOf(m));
      expect(a.ok, m.id).toBe(true);
      const v = a.vsepr!;
      const tb = m.textbook!;
      expect([v.stericNumber, v.bondingDomains, v.lonePairs], m.id).toEqual([tb.totalPairs, tb.sharedPairs, tb.lonePairs]);
      expect(v.hybridization, m.id).toBe(tb.hybridization);
      expect(v.molecularGeometry, m.id).toBe(tb.geometry);
    }
  });

  it('matches ideal angles where there are no lone pairs', () => {
    for (const m of book.filter((x) => x.textbook!.lonePairs === 0)) {
      const scene = buildSceneModel(analyze(specOf(m)), { mode: 'ideal' });
      const ideal = [...new Set(scene.angles.map((x) => Math.round(x.value * 10) / 10))];
      for (const angle of m.textbook!.angles) {
        expect(ideal.some((x) => Math.abs(x - angle) < 0.1 || (angle === 109.5 && Math.abs(x - TETRAHEDRAL_ANGLE) < 0.1)), `${m.id} ${angle}`).toBe(true);
      }
    }
  });

  it('keeps measured values and documents where the textbook differs', () => {
    const angleOf = (id: string) => {
      const m = dataset.moleculesById.get(id)!;
      return mainAngle(buildSceneModel(analyze(specOf(m)), { mode: 'experimental', experimental: m.experimental }))!.value;
    };
    // Water: textbook 104.5°, measured 104.48° — same to the precision printed.
    expect(Math.abs(angleOf('h2o') - dataset.moleculesById.get('h2o')!.textbook!.angles[0])).toBeLessThan(0.1);
    // Phosphine: textbook 107.3°, measured 93.3°; the app keeps the measurement and explains the difference.
    const ph3 = dataset.moleculesById.get('ph3')!;
    expect(angleOf('ph3')).toBeCloseTo(93.3, 1);
    expect(ph3.textbook!.angles[0]).toBe(107.3);
    expect(ph3.notes.some((n) => n.id === 'ph3-textbook' && n.sources.includes('course-textbook'))).toBe(true);
  });

  it('treats NbBr5 as a d0 transition-metal case with a warning and no invented data', () => {
    const m = dataset.moleculesById.get('nbbr5')!;
    const a = analyze(specOf(m));
    expect(a.ok).toBe(true);
    expect(a.issues.map((i) => i.code)).toContain('transition-metal');
    expect(a.lewis!.centralLoneElectrons).toBe(0);
    expect(m.experimental).toBeUndefined();
    // A d-block centre that would keep nonbonding d electrons is refused.
    expect(analyze({ central: 'Nb', ligands: ['Br', 'Br', 'Br'], charge: 0 }).issues.map((i) => i.code)).toContain('transition-metal-dn');
  });
});
