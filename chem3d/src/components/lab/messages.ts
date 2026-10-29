import type { Diagnosis } from '../../chem/diagnose';
import type { Analysis } from '../../chem/types';
import { isKey, type TFunction } from '../../i18n';
import { hybridizationText } from '../ui/Formula';

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Localized explanation for a diagnosis code, with the values it refers to. */
export function diagnosisMessage(t: TFunction, d: Diagnosis, a: Analysis): string {
  if (d.correct) return '';
  const p: Record<string, string | number> = { ...d.params };
  if (typeof p.charge === 'number') p.charge = signed(p.charge);
  const ans = String(d.params.answer ?? '');
  if (d.code.startsWith('mg-')) p.answerName = isKey(`mg.${ans}`) ? t(`mg.${ans}` as never) : ans;
  if (d.code.startsWith('eg-')) p.answerName = isKey(`eg.${ans}`) ? t(`eg.${ans}` as never) : ans;
  if (d.code === 'angle-other-arrangement') {
    p.chosenEgName = t(`eg.${d.params.chosenEg}` as never);
    p.correctEgName = a.vsepr ? t(`eg.${a.vsepr.electronGeometry}` as never) : '';
  }
  if (d.code === 'pol-asymmetric') p.shapeName = t(`mg.${d.params.shape}` as never);
  if (d.code.startsWith('hyb-')) p.answer = hybridizationText(ans);
  const key = `diag.${d.code}`;
  return isKey(key) ? t(key, p) : d.code;
}
