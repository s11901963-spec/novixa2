import { describe, expect, it } from 'vitest';
import { analyze } from '../analyze';
import { countValence } from '../lewis';

const spec = (central: string, ligands: string[], charge = 0) => ({ central, ligands, charge });

describe('valence electron count', () => {
  it.each([
    [spec('C', ['H', 'H', 'H', 'H']), 8],
    [spec('N', ['H', 'H', 'H', 'H'], 1), 8],
    [spec('B', ['F', 'F', 'F', 'F'], -1), 32],
    [spec('I', ['I', 'I'], -1), 22],
    [spec('Xe', ['F', 'F']), 22],
    [spec('C', ['O', 'O', 'O'], -2), 24],
  ])('%o → %i', (s, total) => {
    expect(countValence(s).total).toBe(total);
  });
});

describe('Lewis structure selection', () => {
  it('CO2 uses two double bonds with zero formal charges', () => {
    const a = analyze(spec('C', ['O', 'O']));
    expect(a.lewis!.structure.bonds.map((b) => b.order)).toEqual([2, 2]);
    expect(a.lewis!.structure.atoms.every((x) => x.formalCharge === 0)).toBe(true);
    expect(a.vsepr!.stericNumber).toBe(2);
  });

  it('CH2O puts the double bond on oxygen', () => {
    const a = analyze(spec('C', ['H', 'H', 'O']));
    expect(a.lewis!.structure.bonds.map((b) => b.order)).toEqual([1, 1, 2]);
  });

  it('HCN gets a C≡N triple bond', () => {
    const a = analyze(spec('C', ['H', 'N']));
    expect(a.lewis!.structure.bonds.map((b) => b.order)).toEqual([1, 3]);
    expect(a.vsepr!.molecularGeometry).toBe('linear');
  });

  it('BF3 keeps an incomplete octet and offers the B=F octet structure only as an alternative', () => {
    const a = analyze(spec('B', ['F', 'F', 'F']));
    expect(a.lewis!.centralOctet).toBe('incomplete');
    expect(a.lewis!.centralElectrons).toBe(6);
    const alt = a.lewis!.alternatives.find((x) => x.reason === 'octet-completed');
    expect(alt).toBeDefined();
    expect(alt!.structure.atoms.some((x) => x.formalCharge === 1 && x.element === 'F')).toBe(true);
  });

  it('SO2: octet structure with resonance is primary, zero-formal-charge expanded octet is the alternative', () => {
    const a = analyze(spec('S', ['O', 'O']));
    expect(a.lewis!.centralElectrons).toBe(8);
    expect(a.lewis!.resonance).toHaveLength(2);
    const alt = a.lewis!.alternatives.find((x) => x.reason === 'formal-charge-minimized');
    expect(alt!.structure.atoms.every((x) => x.formalCharge === 0)).toBe(true);
    expect(alt!.structure.atoms[0].electronCount).toBe(10);
  });

  it('NO3- has three equivalent resonance structures', () => {
    const a = analyze(spec('N', ['O', 'O', 'O'], -1));
    expect(a.lewis!.resonance).toHaveLength(3);
    expect(a.lewis!.structure.atoms[0].formalCharge).toBe(1);
  });

  it('expanded octets: SF4 has 10 and SF6 has 12 electrons on S', () => {
    expect(analyze(spec('S', ['F', 'F', 'F', 'F'])).lewis!.centralElectrons).toBe(10);
    expect(analyze(spec('S', ['F', 'F', 'F', 'F', 'F', 'F'])).lewis!.centralElectrons).toBe(12);
  });

  it('formal charges of common ions', () => {
    expect(analyze(spec('N', ['H', 'H', 'H', 'H'], 1)).lewis!.structure.atoms[0].formalCharge).toBe(1);
    expect(analyze(spec('O', ['H', 'H', 'H'], 1)).lewis!.structure.atoms[0].formalCharge).toBe(1);
    expect(analyze(spec('B', ['F', 'F', 'F', 'F'], -1)).lewis!.structure.atoms[0].formalCharge).toBe(-1);
    expect(analyze(spec('I', ['Cl', 'Cl', 'Cl', 'Cl'], -1)).lewis!.structure.atoms[0].formalCharge).toBe(-1);
  });
});

describe('invalid or unsupported species are explained, not guessed', () => {
  it('a period-2 central atom cannot exceed the octet (OH4)', () => {
    const a = analyze(spec('O', ['H', 'H', 'H', 'H']));
    expect(a.ok).toBe(false);
    expect(a.issues[0].code).toBe('period2-octet-exceeded');
  });
  it('odd-electron species are reported (NO2)', () => {
    expect(analyze(spec('N', ['O', 'O'])).issues[0].code).toBe('odd-electrons');
  });
  it('more than six domains is outside the model (IF7, XeF6)', () => {
    expect(analyze(spec('I', Array(7).fill('F'))).issues[0].code).toBe('too-many-ligands');
    expect(analyze(spec('Xe', Array(6).fill('F'))).issues[0].code).toBe('too-many-domains');
  });
  it('hydrogen cannot be central, noble gases cannot be terminal', () => {
    expect(analyze(spec('H', ['F', 'F'], -1)).issues[0].code).toBe('h-central');
    expect(analyze(spec('C', ['Xe', 'Xe'])).issues[0].code).toBe('unsupported-terminal');
  });
  it('a single ligand is not a VSEPR case', () => {
    expect(analyze(spec('Cl', ['H'])).issues[0].code).toBe('too-few-ligands');
  });
  it('warns about large formal charges', () => {
    const a = analyze(spec('O', ['H', 'H', 'H', 'H'], 2));
    expect(a.ok).toBe(true);
    expect(a.issues.map((i) => i.code)).toContain('large-formal-charge');
  });
});
