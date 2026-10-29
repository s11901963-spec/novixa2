import { capacity, FILLING_ORDER, NOBLE_GASES, subshellLabel } from '../../chem/electrons';
import { useT } from '../../i18n';
import { appendSubshell, lastSubshell, removeLastToken, setCore, setLastCount } from '../../lib/touchInput';

// Sublevels used by elements 1–86, in filling order (1s … 6p).
const KEYS = FILLING_ORDER.slice(0, FILLING_ORDER.findIndex((s) => s.n === 7)).map((s) => ({ label: subshellLabel(s), cap: capacity(s.l), l: s.l }));
const L_TONE = ['bg-accent-soft', 'bg-ok-soft', 'bg-warn-soft', 'bg-lp/15'];

/**
 * Touch keyboard for electron configurations: tap the sublevels in order (each is added
 * full, e.g. 2p⁶), then tap a number to change the last one. Noble-gas cores for the
 * short notation. Typing in the text field still works.
 */
export function ConfigKeyboard({ value, onChange, mode, testId = 'ec-kbd' }: { value: string; onChange: (v: string) => void; mode: 'full' | 'noble'; testId?: string }) {
  const t = useT();
  const last = lastSubshell(value);
  const lastCap = last ? capacity(['s', 'p', 'd', 'f'].indexOf(last[1])) : 0;
  const btn = 'flex h-11 items-center justify-center rounded-xl border border-line font-mono text-[15px] font-semibold active:scale-95 disabled:opacity-35 pointer-coarse:h-12';
  return (
    <div className="flex flex-col gap-2" dir="ltr" data-testid={testId}>
      {mode === 'noble' && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('ec.kbd.cores')}>
          {NOBLE_GASES.map((g) => (
            <button key={g.symbol} type="button" onClick={() => onChange(setCore(value, g.symbol))} className={`${btn} min-w-14 bg-surface-2 px-2`} data-testid={`${testId}-core-${g.symbol}`}>
              [{g.symbol}]
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8" role="group" aria-label={t('ec.kbd.sublevels')}>
        {KEYS.map((k) => (
          <button key={k.label} type="button" onClick={() => onChange(appendSubshell(value, k.label, k.cap))} className={`${btn} ${L_TONE[k.l]}`} data-testid={`${testId}-sub-${k.label}`}>
            {k.label}
            <sup className="text-[0.7em] text-muted">{k.cap}</sup>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('ec.kbd.count', { label: last ?? '…' })}>
        <span className="me-1 text-xs text-muted" dir="auto">
          {last ? t('ec.kbd.count', { label: last }) : t('ec.kbd.pickFirst')}
        </span>
        {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" disabled={!last || n > lastCap} onClick={() => onChange(setLastCount(value, n))} className={`${btn} w-10 bg-surface`} data-testid={`${testId}-count-${n}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button type="button" disabled={!value} onClick={() => onChange(removeLastToken(value))} className={`${btn} bg-surface px-3`} aria-label={t('touch.backspace')} data-testid={`${testId}-back`}>
          ⌫
        </button>
        <button type="button" disabled={!value} onClick={() => onChange('')} className={`${btn} bg-surface px-3 font-sans text-sm`} data-testid={`${testId}-clear`}>
          {t('touch.clear')}
        </button>
      </div>
    </div>
  );
}
