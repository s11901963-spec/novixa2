import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { analyze, specOf } from '../analyze';
import { angleAt, buildSceneModel, dot, idealLayout, normalize } from '../geometry';
import { mainAngle } from '../steps';
import { SUPPORTED_COMBOS, TETRAHEDRAL_ANGLE } from '../vsepr';

const O = [0, 0, 0] as [number, number, number];
const pairAngles = (dirs: [number, number, number][]) => {
  const out: number[] = [];
  for (let i = 0; i < dirs.length; i++) for (let j = i + 1; j < dirs.length; j++) out.push(angleAt(dirs[i], O, dirs[j]));
  return out.sort((a, b) => a - b);
};

describe('ideal VSEPR layouts', () => {
  it.each(SUPPORTED_COMBOS)('X=%i E=%i gives unit vectors with the ideal domain angles', (x, e) => {
    const l = idealLayout(x, e);
    expect(l.ligandSlots).toHaveLength(x);
    expect(l.lonePairs).toHaveLength(e);
    const dirs = [...l.ligandSlots, ...l.lonePairs].map((s) => s.dir);
    for (const d of dirs) expect(Math.hypot(...d)).toBeCloseTo(1, 10);
    const sn = x + e;
    const expected: Record<number, number[]> = {
      2: [180],
      3: [120],
      4: [TETRAHEDRAL_ANGLE],
      5: [90, 120, 180],
      6: [90, 180],
    };
    for (const a of pairAngles(dirs)) {
      expect(expected[sn].some((v) => Math.abs(v - a) < 1e-9), `angle ${a}`).toBe(true);
    }
  });

  it('trigonal bipyramid: lone pairs always equatorial (perpendicular to the axis)', () => {
    for (const e of [1, 2, 3]) {
      for (const lp of idealLayout(5 - e, e).lonePairs) expect(Math.abs(lp.dir[1])).toBeLessThan(1e-12);
    }
  });

  it('octahedron with two lone pairs puts them opposite (trans)', () => {
    const [a, b] = idealLayout(4, 2).lonePairs;
    expect(dot(a.dir, b.dir)).toBeCloseTo(-1, 12);
  });
});

describe('scene model matches the selected molecule', () => {
  for (const m of dataset.molecules) {
    it(m.formula, () => {
      const a = analyze(specOf(m));
      const scene = buildSceneModel(a, { mode: 'ideal' });
      expect(scene.atoms.map((x) => x.element)).toEqual([m.central, ...m.ligands]);
      expect(scene.bonds).toHaveLength(m.ligands.length);
      const centralLp = scene.lonePairs.filter((l) => l.central).length;
      expect(centralLp).toBe(a.vsepr!.lonePairs);
      const terminalLp = scene.lonePairs.filter((l) => !l.central).length;
      expect(terminalLp).toBe(a.lewis!.terminalElectrons / 2);
      // angles labelled in the model are computed from the coordinates
      for (const ang of scene.angles) {
        expect(ang.value).toBeCloseTo(angleAt(scene.atoms[ang.a].position, O, scene.atoms[ang.b].position), 10);
      }
      // each lone-pair direction points away from the bonds it shares an atom with
      for (const lp of scene.lonePairs.filter((l) => l.central)) {
        for (const at of scene.atoms.slice(1)) expect(dot(lp.dir, normalize(at.position))).toBeLessThan(0.5);
      }
    });
  }

  it('ideal angles: CH4 109.47°, BF3 120°, SF6 90°', () => {
    const angleOf = (id: string) => {
      const m = dataset.moleculesById.get(id)!;
      return mainAngle(buildSceneModel(analyze(specOf(m)), { mode: 'ideal' }))!.value;
    };
    expect(angleOf('ch4')).toBeCloseTo(109.4712, 3);
    expect(angleOf('bf3')).toBeCloseTo(120, 6);
    expect(angleOf('sf6')).toBeCloseTo(90, 6);
  });
});
