import { describe, expect, it } from 'vitest';
import { dataset } from '../../data';
import { isKey } from '../../i18n';
import { diagnoseFigure, type RuleKind } from '../electronQuestions';
import { diagnoseNotation } from '../electrons';
import { generateSession, isCorrect, type Level } from '../questions';

const CODE_FOR: Record<RuleKind, string> = { aufbau: 'aufbau-order', pauli: 'pauli', hund: 'hund-pairing', none: 'correct' };

describe('electron challenge questions', () => {
  it('builds varied sessions whose answers are among the options', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const types = new Set<string>();
      for (let seed = 1; seed <= 40; seed++) {
        const qs = generateSession(level, seed, 8, 'electrons');
        expect(qs.length).toBe(8);
        for (const q of qs) {
          types.add(q.type);
          expect(isKey(q.prompt.key), q.prompt.key).toBe(true);
          expect(isKey(q.hintKey), q.hintKey).toBe(true);
          if (q.explanation) expect(isKey(q.explanation.key), q.explanation.key).toBe(true);
          for (const s of q.sources ?? []) expect(dataset.references.has(s), s).toBe(true);
          if (q.kind === 'number') {
            expect(Number.isInteger(q.answer)).toBe(true);
            expect(isCorrect(q, String(q.answer))).toBe(true);
          } else {
            const ids = q.options!.map((o) => o.id);
            expect(new Set(ids).size).toBe(ids.length);
            const answers = Array.isArray(q.answer) ? q.answer : [q.answer as string];
            for (const a of answers) expect(ids).toContain(a);
            expect(isCorrect(q, q.answer as string | string[])).toBe(true);
            for (const o of q.options!) {
              if (o.label.t === 'key') expect(isKey(o.label.key), o.label.key).toBe(true);
              if (!answers.includes(o.id) && q.feedback) {
                const f = q.feedback(o.id);
                if (f) expect(isKey(f.key), f.key).toBe(true);
              }
            }
          }
        }
      }
      expect(types.size).toBeGreaterThanOrEqual(4);
    }
  });

  it('offers exactly one correct configuration in configuration choices', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const level of [1, 2, 3] as Level[]) {
        for (const q of generateSession(level, seed, 8, 'electrons')) {
          if (!['ec-choose-full', 'ec-choose-noble', 'ec-exception'].includes(q.type)) continue;
          const z = Number(q.prompt.params.atomZ);
          const mode = q.type === 'ec-choose-full' ? 'full' : 'noble';
          const correct = q.options!.filter((o) => o.label.t === 'text' && diagnoseNotation(z, o.label.text, mode).correct);
          expect(correct.map((o) => o.id), `${q.type} Z=${z}`).toEqual([q.answer]);
          expect(q.options!.length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('draws rule-breaking orbital diagrams that the engine diagnoses as intended', () => {
    for (const z of [6, 7, 8, 14, 15, 16]) {
      for (const kind of ['aufbau', 'pauli', 'hund', 'none'] as RuleKind[]) {
        expect(diagnoseFigure(z, kind).code, `Z=${z} ${kind}`).toBe(CODE_FOR[kind]);
      }
    }
  });

  it('keeps the molecular-shape topic unchanged by default', () => {
    const qs = generateSession(1, 7, 8);
    expect(qs.every((q) => !q.type.startsWith('ec-'))).toBe(true);
  });
});
