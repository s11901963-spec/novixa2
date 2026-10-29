import type { ReactNode } from 'react';
import type { Label, Question } from '../../chem/questions';
import { dataset, getElement } from '../../data';
import { getAtom } from '../../data/atoms';
import { isKey, type TFunction } from '../../i18n';
import type { Lang } from '../../state/settings';
import { Formula, formulaText, hybridizationText, Ltr } from '../ui/Formula';

const molFormula = (id: string) => {
  const m = dataset.moleculesById.get(id);
  return m ? formulaText(m.formula, m.charge) : id;
};

/** Interpolation values for a question prompt: formulas, element names, geometry names. */
export function promptParams(q: Question, t: TFunction, lang: Lang): Record<string, string | number> {
  const p: Record<string, string | number> = { ...q.prompt.params };
  for (const [k, id] of Object.entries(q.formulaParams ?? {})) p[k] = molFormula(id);
  if (typeof p.nameKey === 'string') p.name = getElement(p.nameKey).name[lang];
  if (typeof p.atomZ === 'number') {
    const a = getAtom(p.atomZ);
    p.name = a.name[lang];
    p.symbol = a.symbol;
  }
  // Configurations and subshell labels stay left-to-right inside Arabic sentences.
  for (const k of ['config', 'sub']) if (typeof p[k] === 'string') p[k] = `\u2066${p[k]}\u2069`;
  if (typeof p.egKey === 'string') p.eg = t(`eg.${p.egKey}` as never);
  return p;
}

const LTR_PARAMS = ['config', 'sub', 'terms', 'aufbau', 'ground', 'expected', 'label', 'token', 'core', 'other'];

/** Params for explanations and feedback: element names from atomZ, configurations kept left-to-right. */
export function textParams(params: Record<string, string | number> | undefined, lang: Lang): Record<string, string | number> {
  const p: Record<string, string | number> = { ...(params ?? {}) };
  if (typeof p.atomZ === 'number') {
    const a = getAtom(p.atomZ);
    p.name = a.name[lang];
    p.symbol = a.symbol;
  }
  for (const k of LTR_PARAMS) if (typeof p[k] === 'string') p[k] = `\u2066${p[k]}\u2069`;
  return p;
}

export function promptText(q: Question, t: TFunction, lang: Lang): string {
  return isKey(q.prompt.key) ? t(q.prompt.key, promptParams(q, t, lang)) : q.prompt.key;
}

export function renderLabel(label: Label, t: TFunction, lang: Lang = 'ar'): ReactNode {
  switch (label.t) {
    case 'text':
      return (
        <bdi dir="ltr" className="font-mono">
          {label.text}
        </bdi>
      );
    case 'atom': {
      const a = getAtom(label.z);
      return (
        <span>
          {a.name[lang]} <bdi dir="ltr" className="font-mono text-muted">({a.symbol})</bdi>
        </span>
      );
    }
    case 'key': {
      const params: Record<string, string | number> = { ...(label.params ?? {}) };
      if (typeof params.aMol === 'string') params.a = molFormula(params.aMol);
      return isKey(label.key) ? t(label.key, params) : label.key;
    }
    case 'mg':
      return t(`mg.${label.id}`);
    case 'eg':
      return t(`eg.${label.id}`);
    case 'sig':
      return t(`sig.${label.id}`);
    case 'hyb':
      return <Ltr>{hybridizationText(label.id)}</Ltr>;
    case 'molecule': {
      const m = dataset.moleculesById.get(label.id)!;
      return <Formula formula={m.formula} charge={m.charge} className="font-semibold" />;
    }
    case 'order':
      return (
        <Ltr>
          {label.ids.map((id, i) => (
            <span key={id}>
              {i > 0 && ' > '}
              {molFormula(id)}
            </span>
          ))}
        </Ltr>
      );
  }
}

/** Plain-text version of the correct answer (for the results list and history). */
export function answerText(q: Question, t: TFunction, lang: Lang = 'ar'): string {
  if (q.kind === 'number') return String(q.answer);
  const ids = Array.isArray(q.answer) ? q.answer : [q.answer as string];
  return ids
    .map((id) => {
      const opt = q.options?.find((o) => o.id === id);
      if (!opt) return id;
      const l = opt.label;
      if (l.t === 'text') return `\u2066${l.text}\u2069`;
      if (l.t === 'atom') return `${getAtom(l.z).name[lang]} (${getAtom(l.z).symbol})`;
      if (l.t === 'molecule') return molFormula(l.id);
      if (l.t === 'order') return l.ids.map(molFormula).join(' > ');
      if (l.t === 'hyb') return hybridizationText(l.id);
      if (l.t === 'key') return isKey(l.key) ? t(l.key, l.params?.aMol ? { a: molFormula(String(l.params.aMol)) } : undefined) : l.key;
      return t(`${l.t}.${l.id}` as never);
    })
    .join('، ');
}
