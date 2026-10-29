import { describe, expect, it } from 'vitest';
import elementsJson from '../../data/elements.json';
import moleculesJson from '../../data/molecules.json';
import referencesJson from '../../data/references.json';
import { buildDataset } from '../../data';
import { analyze, specOf } from '../analyze';
import { buildSceneModel } from '../geometry';

describe('changing the data re-computes the shape and results', () => {
  it('turning NH3 into NH4+ in the data file changes the analysis and the 3D model', () => {
    const raw = structuredClone(moleculesJson) as typeof moleculesJson;
    const nh3 = raw.molecules.find((m) => m.id === 'nh3')!;
    const before = analyze(specOf(nh3));
    nh3.ligands = ['H', 'H', 'H', 'H'];
    nh3.charge = 1;
    nh3.formula = 'NH4';
    delete (nh3 as { experimental?: unknown }).experimental;
    const ds = buildDataset(elementsJson, raw, referencesJson);
    const after = analyze(specOf(ds.moleculesById.get('nh3')!));
    expect(before.vsepr!.molecularGeometry).toBe('trigonal-pyramidal');
    expect(after.vsepr!.molecularGeometry).toBe('tetrahedral');
    expect(after.lewis!.valence.total).toBe(8);
    const scene = buildSceneModel(after, { mode: 'ideal' });
    expect(scene.atoms).toHaveLength(5);
    expect(scene.lonePairs.filter((l) => l.central)).toHaveLength(0);
  });

  it('editing a measured angle moves the atoms in experimental mode', () => {
    const raw = structuredClone(moleculesJson) as typeof moleculesJson;
    const h2o = raw.molecules.find((m) => m.id === 'h2o')!;
    h2o.experimental!.angleParams = { xAx: 100 };
    const ds = buildDataset(elementsJson, raw, referencesJson);
    const m = ds.moleculesById.get('h2o')!;
    const scene = buildSceneModel(analyze(specOf(m)), { mode: 'experimental', experimental: m.experimental });
    expect(scene.angles[0].value).toBeCloseTo(100, 6);
  });

  it('adding a new molecule to the data needs no code change', () => {
    const raw = structuredClone(moleculesJson) as typeof moleculesJson;
    raw.molecules.push({
      id: 'sef4',
      formula: 'SeF4',
      charge: 0,
      name: { ar: 'رباعي فلوريد السيلينيوم', en: 'Selenium tetrafluoride' },
      category: 'extended',
      central: 'Se',
      ligands: ['F', 'F', 'F', 'F'],
      notes: [],
    } as unknown as (typeof raw.molecules)[number]);
    const ds = buildDataset(elementsJson, raw, referencesJson);
    const a = analyze(specOf(ds.moleculesById.get('sef4')!));
    expect(a.vsepr!.molecularGeometry).toBe('seesaw');
  });
});
