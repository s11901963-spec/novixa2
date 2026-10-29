import { useRef, useState } from 'react';
import { useT } from '../../i18n';
import { applyKey, stepValue, type PadKey } from '../../lib/touchInput';

export interface NumberPadProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  /** Quick-pick values shown as large buttons (the keypad then opens on demand). */
  chips?: number[];
  decimals?: boolean;
  negative?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  /** id of the text field (kept for keyboard users and tests). */
  inputId?: string;
  inputTestId?: string;
  testId?: string;
}

/**
 * Touch-first number entry: quick-pick buttons, − / + steppers and an on-screen keypad.
 * The field does not open the phone keyboard (inputMode "none"); ⌨ switches to typing.
 */
export function NumberPad({ value, onChange, label, chips, decimals, negative, min = negative ? -99 : 0, max = 999, step = 1, unit, disabled, onSubmit, inputId, inputTestId, testId = 'numpad' }: NumberPadProps) {
  const t = useT();
  const [keypad, setKeypad] = useState(!chips);
  const [typing, setTyping] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const press = (k: PadKey) => onChange(applyKey(value, k, { decimals, negative, maxLength: decimals ? 6 : 4 }));
  const keys: PadKey[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', negative ? '±' : decimals ? '.' : 'C', '0', '⌫'];
  const keyBtn = 'flex h-11 items-center justify-center rounded-xl border border-line bg-surface text-lg font-semibold tabular active:scale-95 active:bg-accent-soft disabled:opacity-40 pointer-coarse:h-12';
  return (
    <div className="flex flex-col gap-2.5" data-testid={testId}>
      <div className="flex items-center gap-2" dir="ltr">
        <button type="button" disabled={disabled} onClick={() => onChange(stepValue(value, -step, min, max))} className={`${keyBtn} w-11 text-2xl`} aria-label={t('touch.minus')} data-testid={`${testId}-minus`}>
          −
        </button>
        <div className="relative">
          <input
            ref={input}
            id={inputId}
            value={value}
            disabled={disabled}
            inputMode={typing ? (decimals ? 'decimal' : 'numeric') : 'none'}
            onChange={(e) => {
              const v = e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(negative ? /[^\d.-]/g : /[^\d.]/g, '');
              onChange(decimals ? v : v.replace('.', ''));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSubmit?.();
              }
            }}
            aria-label={label}
            placeholder="—"
            data-testid={inputTestId}
            autoComplete="off"
            className="h-12 w-32 rounded-xl border-2 border-line bg-surface px-3 text-center text-2xl font-bold tabular focus:border-accent"
          />
          {unit && value !== '' && <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>}
        </div>
        <button type="button" disabled={disabled} onClick={() => onChange(stepValue(value, step, min, max))} className={`${keyBtn} w-11 text-2xl`} aria-label={t('touch.plus')} data-testid={`${testId}-plus`}>
          +
        </button>
        <button
          type="button"
          aria-pressed={typing}
          title={t('touch.typing')}
          aria-label={t('touch.typing')}
          onClick={() => {
            setTyping((x) => !x);
            setTimeout(() => input.current?.focus(), 0);
          }}
          className={`ms-1 flex h-11 w-11 items-center justify-center rounded-xl border text-lg ${typing ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}
        >
          ⌨
        </button>
      </div>

      {chips && (
        <div className="flex flex-wrap gap-1.5" dir="ltr" role="group" aria-label={label}>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              aria-pressed={value === String(c)}
              onClick={() => onChange(String(c))}
              className={`h-11 min-w-11 rounded-xl border px-3 text-base font-semibold tabular active:scale-95 pointer-coarse:h-12 pointer-coarse:min-w-12 ${
                value === String(c) ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface hover:bg-surface-2'
              }`}
              data-testid={`${testId}-chip-${c}`}
            >
              {c > 0 && negative ? `+${c}` : c}
            </button>
          ))}
          <button type="button" onClick={() => setKeypad((k) => !k)} aria-expanded={keypad} className="h-11 rounded-xl border border-dashed border-line px-3 text-sm text-muted hover:bg-surface-2 pointer-coarse:h-12">
            {keypad ? t('touch.hideKeypad') : t('touch.keypad')}
          </button>
        </div>
      )}

      {keypad && (
        <div className="grid max-w-[15rem] grid-cols-3 gap-1.5" dir="ltr" role="group" aria-label={t('touch.keypad')}>
          {keys.map((k) => (
            <button key={k} type="button" disabled={disabled} onClick={() => press(k)} className={keyBtn} aria-label={k === '⌫' ? t('touch.backspace') : k === 'C' ? t('touch.clear') : k === '±' ? t('touch.sign') : k} data-testid={`${testId}-key-${k === '.' ? 'dot' : k === '⌫' ? 'back' : k === '±' ? 'sign' : k}`}>
              {k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
