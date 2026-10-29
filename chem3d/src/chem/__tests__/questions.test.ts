import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { analysisOf, generateSession, isCorrect, measuredAngle, scoreFor, type Level, type Question } from '../questions';

const SEEDS = Array.from({ length: 150 }, (_, i) => i * 7919 + 13);

function checkQuestion(q: Question) {
  if (q.kind === 'number') {
    expect(Number.isFinite(q.answer as number), q.uid).toBe(true);
    expect(isCorrect(q, String(q.answer))).toBe(true);
  } else {
    const ids = q.options!.map((o) => o.id);
    expect(new Set(ids).size, `${q.uid} duplicate options`).toBe(ids.length);
    if (q.kind === 'single') {
      expect(ids, q.uid).toContain(q.answer as string);
    } else {
      const ans = q.answer as string[];
      expect(ans.length, `${q.uid} has no correct option`).toBeGreaterThan(0);
      for (const a of ans) expect(ids).toContain(a);
      expect(isCorrect(q, ans)).toBe(true);
    }
  }
  if (q.diagnose) {
    // The engine accepts the stored answer and rejects every distractor.
    expect(q.diagnose(String(q.answer)).correct, `${q.uid} answer rejected by engine`).toBe(true);
    if (q.kind === 'single') for (const o of q.options!) if (o.id !== q.answer) expect(q.diagnose(o.id).correct, `${q.uid} distractor ${o.id} accepted`).toBe(false);
  }
}

describe('challenge sessions', () => {
  for (const level of [1, 2, 3] as Level[]) {
    it(`level ${level}: 150 random sessions have 8 distinct, valid questions`, () => {
      const types = new Set<string>();
      for (const seed of SEEDS) {
        const qs = generateSession(level, seed);
        expect(qs).toHaveLength(8);
        const counts = new Map<string, number>();
        for (const q of qs) {
          counts.set(q.type, (counts.get(q.type) ?? 0) + 1);
          types.add(q.type);
          checkQuestion(q);
        }
        for (const c of counts.values()) expect(c).toBeLessThanOrEqual(2);
      }
      expect(types.size).toBeGreaterThanOrEqual(5);
    });
  }

  it('questions change between attempts', () => {
    const a = generateSession(2, 1).map((q) => q.type + q.moleculeId).join();
    const b = generateSession(2, 2).map((q) => q.type + q.moleculeId).join();
    expect(a).not.toBe(b);
  });

  it('shape answers agree with the reference classification in the data file', () => {
    for (const seed of SEEDS) {
      for (const q of [...generateSession(2, seed), ...generateSession(3, seed)]) {
        if ((q.type === 'predict-shape' || q.type === 'ion-shape') && q.moleculeId) {
          expect(q.answer).toBe(dataset.moleculesById.get(q.moleculeId)!.reference!.molecularGeometry);
        }
      }
    }
  });

  it('angle questions are consistent with the measured values', () => {
    for (const seed of SEEDS) {
      for (const q of generateSession(2, seed)) {
        if (q.type === 'compare-angles') {
          const ids = (q.answer as string).split('>');
          const vals = ids.map((id) => measuredAngle(dataset.moleculesById.get(id)!)!);
          expect(vals[0]).toBeGreaterThan(vals[1]);
          expect(vals[1]).toBeGreaterThan(vals[2]);
        }
        if (q.type === 'explain-deviation') {
          expect(Number(q.prompt.params.value)).toBeLessThan(Number(q.prompt.params.ideal));
        }
      }
      for (const q of generateSession(3, seed)) {
        if (q.type === 'angle-trend') expect(Number(q.prompt.params.av)).toBeLessThan(Number(q.prompt.params.bv));
        if (q.type === 'nonpolar') for (const id of q.answer as string[]) expect(analysisOf(dataset.moleculesById.get(id)!).vsepr!.polarity).toBe('nonpolar');
      }
    }
  });

  it('scoring rewards first attempts and penalises hints', () => {
    const q = generateSession(1, 5)[0];
    expect(scoreFor(q, 1, false)).toBe(q.points);
    expect(scoreFor(q, 2, false)).toBe(Math.round(q.points / 2));
    expect(scoreFor(q, 1, true)).toBeLessThan(q.points);
    expect(scoreFor(q, 4, false)).toBe(0);
  });
});
