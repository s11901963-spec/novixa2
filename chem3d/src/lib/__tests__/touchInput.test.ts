import { describe, expect, it } from 'vitest';
import { diagnoseNotation } from '../../chem/electrons';
import { angleFromPoint, appendSubshell, applyKey, lastSubshell, removeLastToken, setCore, setLastCount, snapAngle, stepValue } from '../touchInput';

describe('on-screen keypad', () => {
  it('builds numbers digit by digit without leading zeros', () => {
    const typed = ['4', '8'].reduce((v, k) => applyKey(v, k as '4'), '');
    expect(typed).toBe('48');
    expect(applyKey('0', '7')).toBe('7');
    expect(applyKey('48', '⌫')).toBe('4');
    expect(applyKey('48', 'C')).toBe('');
  });

  it('allows a decimal point and a sign only when asked', () => {
    expect(applyKey('109', '.')).toBe('109');
    expect(applyKey('109', '.', { decimals: true })).toBe('109.');
    expect(applyKey('109.5', '.', { decimals: true })).toBe('109.5');
    expect(applyKey('', '.', { decimals: true })).toBe('0.');
    expect(applyKey('1', '±')).toBe('1');
    expect(applyKey('1', '±', { negative: true })).toBe('-1');
    expect(applyKey('-1', '±', { negative: true })).toBe('1');
  });

  it('limits the length', () => {
    expect(applyKey('12', '3', { maxLength: 2 })).toBe('12');
  });

  it('steps and clamps values', () => {
    expect(stepValue('', 1, 0, 8)).toBe('1');
    expect(stepValue('8', 1, 0, 8)).toBe('8');
    expect(stepValue('109', 0.5, 0, 180)).toBe('109.5');
    expect(stepValue('-1', -1, -2, 2)).toBe('-2');
  });
});

describe('angle dial', () => {
  it('measures the angle counter-clockwise from the right-hand bond', () => {
    expect(angleFromPoint(10, 0, 0, 0)).toBeCloseTo(0);
    expect(angleFromPoint(0, -10, 0, 0)).toBeCloseTo(90);
    expect(angleFromPoint(-10, 0, 0, 0)).toBeCloseTo(180);
    expect(angleFromPoint(-5, -8.66, 0, 0)).toBeCloseTo(120, 0);
  });

  it('snaps points below the baseline to the nearer end and rounds to 0.5°', () => {
    expect(angleFromPoint(10, 3, 0, 0)).toBe(0);
    expect(angleFromPoint(-10, 3, 0, 0)).toBe(180);
    expect(snapAngle(109.47)).toBe(109.5);
    expect(snapAngle(-3)).toBe(0);
  });
});

describe('electron-configuration keyboard', () => {
  it('writes a configuration with a few taps that the engine accepts', () => {
    let d = '';
    for (const [label, cap] of [['1s', 2], ['2s', 2], ['2p', 6], ['3s', 2], ['3p', 6]] as const) d = appendSubshell(d, label, cap);
    d = setLastCount(d, 3);
    expect(d.trim()).toBe('1s2 2s2 2p6 3s2 3p3');
    expect(diagnoseNotation(15, d, 'full').correct).toBe(true);
    expect(lastSubshell(d)).toBe('3p');
  });

  it('sets, replaces and removes the noble-gas core', () => {
    let d = setCore('', 'He');
    d = setCore(d, 'Ne');
    d = appendSubshell(d, '3s', 2);
    d = appendSubshell(d, '3p', 6);
    d = setLastCount(d, 1);
    expect(d.trim()).toBe('[Ne] 3s2 3p1');
    expect(diagnoseNotation(13, d, 'noble').correct).toBe(true);
    d = removeLastToken(d);
    expect(d.trim()).toBe('[Ne] 3s2');
    d = removeLastToken(removeLastToken(d));
    expect(d).toBe('');
  });

  it('ignores count keys before any subshell is written', () => {
    expect(setLastCount('', 2)).toBe('');
    expect(setLastCount('[Ne] ', 2)).toBe('[Ne] ');
  });
});
