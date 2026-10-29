import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { atoms } from '../../data/atoms';
import {
  aufbauTerms,
  boxSubshellsFor,
  diagnoseBoxes,
  diagnoseDots,
  diagnoseNotation,
  dotSides,
  electronConfig,
  emptyBoxes,
  fullNotation,
  hundBoxes,
  nobleGasNotation,
  occupancyOf,
  parseConfiguration,
  previousNobleGas,
  sameOccupancy,
  totalElectrons,
  type BoxSubshell,
  type Orbital,
} from '../electrons';

const zOf = (symbol: string) => atoms.bySymbol.get(symbol)!.z;

describe('atoms.json (NIST ASD ground states)', () => {
  it('covers Z = 1–86 and every configuration has Z electrons', () => {
    expect(atoms.list.length).toBe(86);
    for (const a of atoms.list) expect(totalElectrons(electronConfig(a.z).terms)).toBe(a.z);
  });

  it('cites a reference that exists', () => {
    expect(dataset.references.has(atoms.source)).toBe(true);
  });

  it('agrees with the configurations stored for the molecule elements', () => {
    for (const el of dataset.elements.values()) {
      const parsed = parseConfiguration(el.electronConfiguration, 'data');
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      const fromElements = occupancyOf([...(parsed.value.core ? aufbauTerms(parsed.value.core.z) : []), ...parsed.value.terms]);
      expect(sameOccupancy(fromElements, occupancyOf(electronConfig(el.atomicNumber).terms)), el.symbol).toBe(true);
      expect(atoms.byZ.get(el.atomicNumber)!.symbol).toBe(el.symbol);
      expect(atoms.byZ.get(el.atomicNumber)!.name.ar).toBe(el.name.ar);
    }
  });

  it('flags exactly the known Aufbau exceptions up to radon', () => {
    const exceptions = atoms.list.filter((a) => electronConfig(a.z).isException).map((a) => a.symbol);
    expect(exceptions).toEqual(['Cr', 'Cu', 'Nb', 'Mo', 'Ru', 'Rh', 'Pd', 'Ag', 'La', 'Ce', 'Gd', 'Pt', 'Au']);
  });

  it('every noble-gas core is fully contained in the element configuration', () => {
    for (const a of atoms.list) {
      const c = electronConfig(a.z);
      expect(totalElectrons(c.outerTerms) + (c.core?.z ?? 0)).toBe(a.z);
      expect(c.outerTerms.every((t) => t.count > 0)).toBe(true);
    }
  });
});

describe('notations', () => {
  it('writes full and noble-gas notation in filling order', () => {
    expect(fullNotation(1)).toBe('1s¹');
    expect(nobleGasNotation(2)).toBe('1s²');
    expect(fullNotation(15)).toBe('1s² 2s² 2p⁶ 3s² 3p³');
    expect(nobleGasNotation(15)).toBe('[Ne] 3s² 3p³');
    expect(nobleGasNotation(10)).toBe('[He] 2s² 2p⁶');
    expect(nobleGasNotation(26)).toBe('[Ar] 4s² 3d⁶');
    expect(nobleGasNotation(24)).toBe('[Ar] 4s¹ 3d⁵');
    expect(nobleGasNotation(29)).toBe('[Ar] 4s¹ 3d¹⁰');
    expect(nobleGasNotation(35)).toBe('[Ar] 4s² 3d¹⁰ 4p⁵');
    expect(nobleGasNotation(50)).toBe('[Kr] 5s² 4d¹⁰ 5p²');
    expect(nobleGasNotation(82)).toBe('[Xe] 6s² 4f¹⁴ 5d¹⁰ 6p²');
  });

  it('finds the previous noble gas', () => {
    expect(previousNobleGas(2)).toBeNull();
    expect(previousNobleGas(10)?.symbol).toBe('He');
    expect(previousNobleGas(11)?.symbol).toBe('Ne');
    expect(previousNobleGas(36)?.symbol).toBe('Ar');
  });

  it('places elements in the periodic table', () => {
    const fe = electronConfig(26);
    expect([fe.period, fe.group, fe.block]).toEqual([4, 8, 'd']);
    expect([electronConfig(2).group, electronConfig(2).block]).toEqual([18, 's']);
    expect(electronConfig(57).group).toBeNull();
    expect(electronConfig(72).group).toBe(4);
    expect(electronConfig(86).group).toBe(18);
    expect(electronConfig(31).block).toBe('p');
  });

  it('counts unpaired electrons with Hund’s rule', () => {
    const unpaired = (s: string) => electronConfig(zOf(s)).unpaired;
    expect([unpaired('N'), unpaired('O'), unpaired('Ne'), unpaired('Fe'), unpaired('Cr'), unpaired('Cu')]).toEqual([3, 2, 0, 4, 6, 1]);
  });
});

describe('parser', () => {
  const total = (s: string) => {
    const p = parseConfiguration(s);
    if (!p.ok) throw new Error(p.issue.code);
    return (p.value.core?.z ?? 0) + totalElectrons(p.value.terms);
  };
  it('accepts the common ways of writing a configuration', () => {
    for (const s of ['1s2 2s2 2p6 3s2 3p3', '1s²2s²2p⁶3s²3p³', '1s^2 2s^2 2p^6 3s^2 3p^3', '1s22s22p63s23p3', '[Ne]3s23p3', '[ne] 3S2 3P3', '١s٢ ٢s٢ ٢p٦ ٣s٢ ٣p٣', '[ Ne ] 3s² 3p³']) {
      expect(total(s), s).toBe(15);
    }
    expect(total('[Ar]3d104s24p5')).toBe(35);
    expect(total('[Ar].3d5.4s')).toBe(24);
  });

  it('reports what is wrong with an unreadable notation', () => {
    const issue = (s: string) => {
      const p = parseConfiguration(s);
      return p.ok ? 'ok' : p.issue.code;
    };
    expect(issue('')).toBe('empty');
    expect(issue('1s2 2d4')).toBe('invalid-subshell');
    expect(issue('1s2 2s2 2p7')).toBe('over-capacity');
    expect(issue('1s3')).toBe('over-capacity');
    expect(issue('1s2 1s2')).toBe('duplicate');
    expect(issue('[Na] 3s1')).toBe('core-not-noble');
    expect(issue('3s2 [Ne]')).toBe('core-position');
    expect(issue('Ne 3s2 3p3')).toBe('core-brackets');
    expect(issue('hello')).toBe('bad-token');
  });
});

describe('notation diagnosis', () => {
  it('accepts the correct answer in either order and notes the difference', () => {
    expect(diagnoseNotation(15, '1s2 2s2 2p6 3s2 3p3', 'full')).toMatchObject({ correct: true, notes: [] });
    expect(diagnoseNotation(26, '1s2 2s2 2p6 3s2 3p6 3d6 4s2', 'full')).toMatchObject({ correct: true, notes: ['order-shell'] });
    expect(diagnoseNotation(24, '[Ar] 4s1 3d5', 'noble')).toMatchObject({ correct: true, notes: ['exception'] });
  });

  it('explains wrong answers', () => {
    const code = (z: number, s: string, mode: 'full' | 'noble') => diagnoseNotation(z, s, mode).code;
    expect(code(15, '1s2 2s2 2p6 3s2 3p4', 'full')).toBe('wrong-total');
    expect(code(19, '1s2 2s2 2p6 3s2 3p6 3d1', 'full')).toBe('aufbau-order');
    expect(diagnoseNotation(19, '1s2 2s2 2p6 3s2 3p6 3d1', 'full').params).toMatchObject({ label: '3d', before: '4s' });
    expect(code(24, '[Ar] 4s2 3d4', 'noble')).toBe('exception-aufbau');
    expect(code(15, '3s2 3p3', 'noble')).toBe('core-missing');
    expect(code(15, '[He] 2s2 2p6 3s2 3p3', 'noble')).toBe('core-not-previous');
    expect(code(15, '[Ar] 3s2 3p3', 'noble')).toBe('core-too-big');
    expect(code(15, '[Ne] 2p6 3s2 3p3', 'noble')).toBe('core-overlap');
    expect(code(15, '[Ne] 3s2 3p3', 'full')).toBe('core-in-full');
    expect(code(8, '1s2 2s1 2p5', 'full')).toBe('aufbau-order');
  });
});

describe('orbital boxes', () => {
  const set = (boxes: BoxSubshell[], label: string, orbitals: Orbital[]) => boxes.map((b) => (b.label === label ? { ...b, orbitals } : b));
  it('draws Hund boxes and accepts them', () => {
    for (const s of ['H', 'N', 'O', 'Ne', 'Fe', 'Cr', 'Cu', 'Br']) {
      const z = zOf(s);
      const boxes = hundBoxes(electronConfig(z).terms, boxSubshellsFor(z, true));
      expect(diagnoseBoxes(z, boxes).correct, s).toBe(true);
    }
  });

  it('names the broken rule', () => {
    const z = zOf('N');
    const base = hundBoxes(electronConfig(z).terms, boxSubshellsFor(z, true));
    expect(diagnoseBoxes(z, set(base, '2p', [['up', 'down'], ['up', null], [null, null]])).code).toBe('hund-pairing');
    expect(diagnoseBoxes(z, set(base, '2p', [['up', null], ['down', null], ['up', null]])).code).toBe('hund-parallel');
    expect(diagnoseBoxes(z, set(base, '1s', [['up', 'up']])).code).toBe('pauli');
    const aufbau = set(set(base, '2s', [['up', null]]), '2p', [['up', null], ['up', null], ['up', null]]);
    expect(diagnoseBoxes(z, set(aufbau, '3s', [['up', null]])).code).toBe('aufbau-order');
    expect(diagnoseBoxes(z, emptyBoxes(boxSubshellsFor(z))).code).toBe('wrong-total');
    const cr = zOf('Cr');
    expect(diagnoseBoxes(cr, hundBoxes(aufbauTerms(cr), boxSubshellsFor(cr, true))).code).toBe('exception-aufbau');
  });

  it('accepts singles drawn spin-down but notes the convention', () => {
    const z = zOf('N');
    const base = hundBoxes(electronConfig(z).terms, boxSubshellsFor(z));
    const d = diagnoseBoxes(z, set(base, '2p', [['down', null], ['down', null], ['down', null]]));
    expect(d).toMatchObject({ correct: true, notes: ['singles-down'] });
  });
});

describe('electron-dot symbols', () => {
  it('uses valence electrons of main-group elements only', () => {
    expect(electronConfig(zOf('Br')).dots).toMatchObject({ applicable: true, count: 7 });
    expect(electronConfig(zOf('Sn')).dots.count).toBe(4);
    expect(electronConfig(zOf('He')).dots.count).toBe(2);
    expect(electronConfig(zOf('Fe')).dots.applicable).toBe(false);
  });

  it('spreads dots before pairing them', () => {
    expect(dotSides(5)).toEqual([1, 2, 1, 1]);
    expect(dotSides(2)).toEqual([0, 1, 0, 1]);
    expect(dotSides(8)).toEqual([2, 2, 2, 2]);
    expect(dotSides(2, true)).toEqual([0, 2, 0, 0]);
  });

  it('diagnoses dot answers', () => {
    const n = zOf('N');
    expect(diagnoseDots(n, [1, 2, 1, 1]).correct).toBe(true);
    expect(diagnoseDots(n, [2, 2, 1, 0]).code).toBe('dots-paired-early');
    expect(diagnoseDots(n, [1, 1, 1, 1]).code).toBe('dots-wrong-count');
    expect(diagnoseDots(zOf('Be'), [2, 0, 0, 0]).correct).toBe(true);
    expect(diagnoseDots(zOf('Br'), [2, 2, 2, 1].map((x) => x) /* 7 */).correct).toBe(true);
    expect(diagnoseDots(zOf('Fe'), [1, 1, 0, 0]).code).toBe('dots-not-applicable');
    expect(diagnoseDots(zOf('O'), [2, 2, 2, 2]).code).toBe('dots-all-electrons');
  });
});
