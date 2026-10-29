import { aufbauTerms, configText, electronConfig, type ElectronDiagnosis } from '../../chem/electrons';
import { isKey, type TFunction } from '../../i18n';

/** Wraps left-to-right text (configurations, symbols) so it reads correctly inside Arabic sentences. */
export const ltr = (s: string | number) => `⁦${s}⁩`;

export type ElectronTask = 'full' | 'noble' | 'boxes' | 'dots';

/** Text of a diagnosis: the specific mistake, or the confirmation plus any notes. */
export function electronMessage(t: TFunction, d: ElectronDiagnosis, z: number, task: ElectronTask): string {
  const c = electronConfig(z);
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(d.params)) {
    params[k] = typeof v === 'string' && /[spdf\[\]]|\d/.test(v) ? ltr(v) : v;
  }
  if (!d.correct) {
    const key = `ec.diag.${d.code}`;
    return isKey(key) ? t(key, params) : t('ec.diag.mismatch', { expected: ltr(configText(c.outerTerms, c.core?.symbol)) });
  }
  const parts = [t(`ec.diag.correct.${task}` as never, { z, core: c.core?.symbol ?? '', n: c.dots.count })];
  for (const note of d.notes) {
    if (note === 'order-shell' || note === 'order-other') {
      parts.push(t(`ec.note.${note}`, { expected: ltr(task === 'noble' ? configText(c.outerTerms, c.core?.symbol) : configText(c.terms)) }));
    } else if (note === 'exception') {
      parts.push(t('ec.note.exception', { aufbau: ltr(configText(aufbauTerms(z))) }));
    } else if (isKey(`ec.note.${note}`)) {
      parts.push(t(`ec.note.${note}` as never));
    }
  }
  return parts.join(' ');
}
