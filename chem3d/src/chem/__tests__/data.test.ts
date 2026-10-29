import { describe, expect, it } from 'vitest';
import elementsJson from '../../data/elements.json';
import moleculesJson from '../../data/molecules.json';
import referencesJson from '../../data/references.json';
import { buildDataset, dataset } from '../../data';
import { analyze, specOf } from '../analyze';
import { buildSceneModel, requiredAngleParams } from '../geometry';

describe('dataset', () => {
  it('loads and contains the required molecules', () => {
    const required = ['BeCl2', 'BF3', 'CH4', 'NH3', 'PH3', 'H2O', 'PCl5', 'SF4', 'ClF3', 'XeF2', 'SF6'];
    const formulas = dataset.molecules.filter((m) => m.charge === 0).map((m) => m.formula);
    for (const f of required) expect(formulas).toContain(f);
  });

  it('formula string matches central + ligands', () => {
    for (const m of dataset.molecules) {
      const counts = new Map<string, number>();
      for (const s of [m.central, ...m.ligands]) counts.set(s, (counts.get(s) ?? 0) + 1);
      const parsed = new Map<string, number>();
      for (const [, el, n] of m.formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) parsed.set(el, (parsed.get(el) ?? 0) + (n ? Number(n) : 1));
      expect(parsed, m.id).toEqual(counts);
    }
  });

  it('rejects data with an unknown element or reference', () => {
    const bad = structuredClone(moleculesJson) as typeof moleculesJson;
    bad.molecules[0].ligands = ['Zz', 'Cl'];
    expect(() => buildDataset(elementsJson, bad, referencesJson)).toThrow(/unknown element "Zz"/);
    const bad2 = structuredClone(moleculesJson) as typeof moleculesJson;
    bad2.molecules[0].notes[0].sources = ['no-such-ref'];
    expect(() => buildDataset(elementsJson, bad2, referencesJson)).toThrow(/unknown reference "no-such-ref"/);
  });

  it('every reference states how it was verified, and DOIs/URLs are present', () => {
    for (const r of dataset.references.values()) {
      expect(r.verification.method.length).toBeGreaterThan(3);
      if (r.verification.status === 'verified' && r.type === 'article') expect(r.doi, r.id).toBeTruthy();
      if (r.type === 'textbook' || r.type === 'database') expect(r.url ?? r.doi, r.id).toBeTruthy();
    }
  });
});

describe('engine reproduces the reference classification of every molecule', () => {
  for (const m of dataset.molecules) {
    it(`${m.formula}${m.charge ? ` (${m.charge})` : ''}`, () => {
      const a = analyze(specOf(m));
      expect(a.ok).toBe(true);
      expect(a.vsepr!.axe).toBe(m.reference!.axe);
      expect(a.vsepr!.electronGeometry).toBe(m.reference!.electronGeometry);
      expect(a.vsepr!.molecularGeometry).toBe(m.reference!.molecularGeometry);
      expect(a.vsepr!.hybridization).toBe(m.reference!.hybridization);
      // formal charges always add up to the net charge
      const sum = a.lewis!.structure.atoms.reduce((s, at) => s + at.formalCharge, 0);
      expect(sum).toBe(m.charge);
    });
  }
});

describe('experimental 3D coordinates reproduce the measured data', () => {
  for (const m of dataset.molecules.filter((x) => x.experimental)) {
    it(m.formula, () => {
      const a = analyze(specOf(m));
      const exp = m.experimental!;
      const mixed = !m.ligands.every((l) => l === m.ligands[0]);
      for (const p of requiredAngleParams(a.vsepr!.molecularGeometry, mixed)) {
        expect(exp.angleParams[p], `${m.id} needs angleParams.${p}`).toBeDefined();
      }
      const scene = buildSceneModel(a, { mode: 'experimental', experimental: exp });
      expect(scene.measured).toBe(true);
      // every reported angle exists in the model with the same value (±0.05°)
      for (const ang of exp.angles) {
        const matches = scene.angles.filter((s) => s.label === ang.label);
        expect(matches.length, `${m.id}: no model angle labelled ${ang.label}; have ${[...new Set(scene.angles.map((s) => s.label))].join(', ')}`).toBeGreaterThan(0);
        expect(matches.some((s) => Math.abs(s.value - ang.value) < 0.05), `${m.id} ${ang.label}: model ${matches.map((s) => s.value.toFixed(2)).join('/')} vs data ${ang.value}`).toBe(true);
      }
      // every bond length equals a reported value for that ligand
      for (const b of scene.bonds) {
        const el = scene.atoms[b.b].element;
        const reported = exp.bondLengths.filter((x) => x.ligand === el).map((x) => x.value);
        expect(reported.some((v) => Math.abs(v - b.length) < 1e-9), `${m.id} bond to ${el}`).toBe(true);
      }
    });
  }
});
