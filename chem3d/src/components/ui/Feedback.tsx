import { useEffect, type ReactNode } from 'react';
import { useT } from '../../i18n';
import { useSettings } from '../../state/settings';

/** ✅ / ❌ feedback with the specific explanation and the rule that applies. */
export function Feedback({ correct, message, rule, children }: { correct: boolean; message: ReactNode; rule?: ReactNode; children?: ReactNode }) {
  const t = useT();
  const haptics = useSettings((s) => s.haptics);
  const key = typeof message === 'string' ? message : '';
  // A short buzz for ✅, a double buzz for ❌ (phones and tablets that support vibration).
  useEffect(() => {
    if (haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(correct ? 25 : [40, 60, 40]);
  }, [correct, key, haptics]);
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
