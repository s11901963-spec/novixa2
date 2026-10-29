import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { analyze, specOf } from '../analyze';
import {
  diagnoseAngle,
  diagnoseBondingPairs,
  diagnoseCentralLonePairs,
  diagnoseElectronGeometry,
  diagnoseFormalCharge,
  diagnoseHybridization,
  diagnoseMolecularGeometry,
  diagnosePolarity,
  diagnoseStericNumber,
  diagnoseValence,
} from '../diagnose';

const A = (id: string) => analyze(specOf(dataset.moleculesById.get(id)!));

describe('valence electrons', () => {
  it('accepts the right total', () => expect(diagnoseValence(8, A('ch4')).correct).toBe(true));
  it('ignored charge (NH4+ → 9)', () => expect(diagnoseValence(9, A('nh4')).code).toBe('valence-ignored-charge'));
  it('charge with the wrong sign (NH4+ → 10)', () => expect(diagnoseValence(10, A('nh4')).code).toBe('valence-charge-sign'));
  it('used atomic numbers (H2O → 10)', () => expect(diagnoseValence(10, A('h2o')).code).toBe('valence-atomic-numbers'));
  it('counted only the central atom (NH3 → 5)', () => expect(diagnoseValence(5, A('nh3')).code).toBe('valence-central-only'));
  it('counted each element once (BF3 → 10)', () => expect(diagnoseValence(10, A('bf3')).code).toBe('valence-ignored-counts'));
});

describe('bonding pairs, lone pairs, steric number', () => {
  it('electrons instead of pairs', () => expect(diagnoseBondingPairs(6, A('nh3')).code).toBe('bp-counted-electrons'));
  it('multiple bonds counted once (CO2 → 2)', () => expect(diagnoseBondingPairs(2, A('co2')).code).toBe('bp-ignored-multiple'));
  it('lone pairs of terminal atoms included (BF3 → 9)', () => expect(diagnoseCentralLonePairs(9, A('bf3')).code).toBe('lp-included-terminal'));
  it('electrons instead of pairs (H2O → 4)', () => expect(diagnoseCentralLonePairs(4, A('h2o')).code).toBe('lp-gave-electrons'));
  it('forgot to subtract the terminal octets (ClF3 → 11)', () =>
    expect(diagnoseCentralLonePairs(11, A('clf3')).code).toBe('lp-included-terminal'));
  it('assumed S cannot exceed an octet (SF4 → 0)', () => expect(diagnoseCentralLonePairs(0, A('sf4')).code).toBe('lp-octet-limit'));
  it('forgot lone pairs in the steric number (NH3 → 3)', () => expect(diagnoseStericNumber(3, A('nh3')).code).toBe('sn-forgot-lp'));
  it('counted a double bond as two domains (CO2 → 4)', () => expect(diagnoseStericNumber(4, A('co2')).code).toBe('sn-counted-bond-orders'));
  it('counted the central atom (CH4 → 5)', () => expect(diagnoseStericNumber(5, A('ch4')).code).toBe('sn-counted-central'));
});

describe('geometries', () => {
  it('electron geometry from atoms only (NH3 → trigonal planar)', () =>
    expect(diagnoseElectronGeometry('trigonal-planar', A('nh3')).code).toBe('eg-ignored-lp'));
  it('electron geometry with a different SN (H2O → octahedral)', () =>
    expect(diagnoseElectronGeometry('octahedral', A('h2o')).code).toBe('eg-wrong-sn'));
  it('chose the electron geometry as the molecular shape (NH3 → tetrahedral)', () =>
    expect(diagnoseMolecularGeometry('tetrahedral', A('nh3')).code).toBe('mg-electron-geometry'));
  it('linear for a molecule with three domains (BF3 → linear)', () => {
    const d = diagnoseMolecularGeometry('linear', A('bf3'));
    expect(d.code).toBe('mg-wrong-sn');
    expect(d.params.sn).toBe(3);
  });
  it('ignored the lone pair (NH3 → trigonal planar)', () =>
    expect(diagnoseMolecularGeometry('trigonal-planar', A('nh3')).code).toBe('mg-ignored-lp'));
  it('lone pair placed axially (SF4 → trigonal pyramidal)', () =>
    expect(diagnoseMolecularGeometry('trigonal-pyramidal', A('sf4')).code).toBe('mg-axial-lp'));
  it('lone pairs placed axially (XeF2 → bent)', () => expect(diagnoseMolecularGeometry('bent', A('xef2')).code).toBe('mg-axial-lp'));
  it('lone pairs placed cis (XeF4 → seesaw)', () => expect(diagnoseMolecularGeometry('seesaw', A('xef4')).code).toBe('mg-cis-lp'));
  it('right SN, wrong lone-pair count (NH3 → bent)', () =>
    expect(diagnoseMolecularGeometry('bent', A('nh3')).code).toBe('mg-wrong-lp-count'));
  it('accepts the correct shape', () => expect(diagnoseMolecularGeometry('seesaw', A('sf4')).correct).toBe(true));
});

describe('angles, hybridization, polarity, formal charge', () => {
  it('ideal angle without lone-pair compression (H2O → 109.5°)', () => expect(diagnoseAngle('a109', A('h2o')).code).toBe('angle-not-compressed'));
  it('angle of another arrangement (H2O → 120°)', () => expect(diagnoseAngle('a120', A('h2o')).code).toBe('angle-other-arrangement'));
  it('hybridization from atoms only (NH3 → sp2)', () => expect(diagnoseHybridization('sp2', A('nh3')).code).toBe('hyb-ignored-lp'));
  it('polar bonds but symmetric molecule (CH4 → polar)', () => expect(diagnosePolarity('polar', A('ch4')).code).toBe('pol-dipoles-cancel'));
  it('asymmetric molecule (H2O → nonpolar)', () => expect(diagnosePolarity('nonpolar', A('h2o')).code).toBe('pol-asymmetric'));
  it('formal charge sign (NH4+ → -1)', () => expect(diagnoseFormalCharge(-1, A('nh4')).code).toBe('fc-sign'));
  it('formal charge without halving bonding electrons (NH4+ → -3)', () =>
    expect(diagnoseFormalCharge(-3, A('nh4')).code).toBe('fc-full-bonding'));
  it('formal charge ignoring lone pairs (H3O+ → 3)', () => expect(diagnoseFormalCharge(3, A('h3o')).code).toBe('fc-ignored-lp'));
});
