import { describe, expect, it } from 'vitest';
import { pairAngles, relaxDomains } from '../repulsion';
import { TETRAHEDRAL_ANGLE } from '../vsepr';

describe('illustrative repulsion model', () => {
  const ideal: Record<number, number[]> = { 2: [180], 3: [120], 4: [TETRAHEDRAL_ANGLE], 5: [90, 120, 180], 6: [90, 180] };
  it.each([2, 3, 4, 5, 6])('%i equal domains settle into the ideal VSEPR arrangement', (n) => {
    const r = relaxDomains(n);
    for (const a of pairAngles(r.final)) {
      expect(ideal[n].some((v) => Math.abs(v - a) < 1), `angle ${a.toFixed(2)}`).toBe(true);
    }
    expect(r.frames.length).toBeGreaterThan(5);
  });
});
