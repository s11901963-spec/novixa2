import { useEffect, type ReactNode } from 'react';
import { useT } from '../../i18n';
import { useSettings } from '../../state/settings';
import { useCue } from './useCue';

/**
 * ✅ / ❌ feedback with the specific explanation and the rule that applies. When it appears it also
 * sounds: a chime and «إجابة صحيحة», or a low buzz and «إجابة غير صحيحة» (unless `silent`, when the
 * caller plays the sound itself).
 */
export function Feedback({ correct, message, rule, children, silent }: { correct: boolean; message: ReactNode; rule?: ReactNode; children?: ReactNode; silent?: boolean }) {
  const t = useT();
  const haptics = useSettings((s) => s.haptics);
  const play = useCue();
  const key = typeof message === 'string' ? message : '';
  // A short buzz for ✅, a double buzz for ❌ (phones and tablets that support vibration).
  useEffect(() => {
    if (haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(correct ? 25 : [40, 60, 40]);
  }, [correct, key, haptics]);
  useEffect(() => {
    if (!silent) play(correct ? 'correct' : 'wrong');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correct, key, silent]);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-3.5 py-3 text-sm ${correct ? 'border-ok/40 bg-ok-soft' : 'border-bad/40 bg-bad-soft'}`}
    >
      <div className={`font-bold ${correct ? 'text-ok' : 'text-bad'}`}>{correct ? t('common.correct') : t('common.incorrect')}</div>
      <div className="mt-1 text-fg">{message}</div>
      {rule && (
        <div className="mt-1.5 text-muted">
          <span className="font-semibold">{t('common.rule')}: </span>
          {rule}
        </div>
      )}
      {children}
    </div>
  );
}
