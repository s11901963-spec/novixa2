/**
 * Pure editing rules behind the touch controls (on-screen keypad, angle dial and the
 * electron-configuration keyboard), kept separate from React so they can be unit-tested.
 */

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | '±' | '⌫' | 'C';

export interface PadOptions {
  decimals?: boolean;
  negative?: boolean;
  maxLength?: number;
}

/** Applies one keypad key to the current text value. */
export function applyKey(value: string, key: PadKey, opts: PadOptions = {}): string {
  const maxLength = opts.maxLength ?? 6;
  if (key === 'C') return '';
  if (key === '⌫') return value.slice(0, -1);
  if (key === '±') {
    if (!opts.negative) return value;
    return value.startsWith('-') ? value.slice(1) : `-${value}`;
  }
  if (key === '.') {
    if (!opts.decimals || value.includes('.')) return value;
    return value === '' || value === '-' ? `${value}0.` : `${value}.`;
  }
  if (value.replace('-', '').length >= maxLength) return value;
  // No leading zeros ("07" → "7"), but keep "0." for decimals.
  if (value === '0') return key;
  if (value === '-0') return `-${key}`;
  return value + key;
}

/** Adds `delta` to a numeric text value, clamped to [min, max]. Empty input starts from `from`. */
export function stepValue(value: string, delta: number, min: number, max: number, from = 0): string {
  const n = value === '' || value === '-' ? from : Number(value);
  if (!Number.isFinite(n)) return String(from);
  const next = Math.min(max, Math.max(min, Math.round((n + delta) * 100) / 100));
  return String(next);
}

/**
 * Angle (degrees, 0–180) of a point relative to the dial centre: 0° to the right, 180° to the left,
 * increasing counter-clockwise over the top. Points below the baseline snap to the nearer end.
 */
export function angleFromPoint(px: number, py: number, cx: number, cy: number): number {
  const deg = (Math.atan2(cy - py, px - cx) * 180) / Math.PI;
  if (deg >= 0) return deg;
  return deg > -90 ? 0 : 180;
}

export function snapAngle(a: number, step = 0.5): number {
  return Math.min(180, Math.max(0, Math.round(a / step) * step));
}

// ---------------------------------------------------------------------------
// Electron-configuration keyboard
// ---------------------------------------------------------------------------
const LAST_TERM = /(\d[spdf])(\d*)\s*$/;

/** Appends a subshell filled to `capacity` ("2p6"); students then lower the last count if needed. */
export function appendSubshell(draft: string, label: string, capacity: number): string {
  const base = draft.trimEnd();
  return `${base}${base ? ' ' : ''}${label}${capacity} `;
}

/** Sets the electron count of the last written subshell. */
export function setLastCount(draft: string, count: number): string {
  if (!LAST_TERM.test(draft)) return draft;
  return draft.replace(LAST_TERM, (_, label: string) => `${label}${count} `);
}

/** Puts a noble-gas core at the start, replacing any core already written. */
export function setCore(draft: string, core: string): string {
  const rest = draft.replace(/^\s*\[[A-Za-z]{1,2}\]\s*/, '').trimStart();
  return `[${core}] ${rest}`;
}

/** Removes the last token (a subshell term or the core). */
export function removeLastToken(draft: string): string {
  const trimmed = draft.trimEnd();
  const m = /(\s*)(\[[A-Za-z]{1,2}\]|\d[spdf]\d*|\S+)$/.exec(trimmed);
  if (!m) return '';
  const out = trimmed.slice(0, trimmed.length - m[0].length);
  return out ? `${out} ` : '';
}

/** The subshell label the count keys would change, if any. */
export function lastSubshell(draft: string): string | null {
  return LAST_TERM.exec(draft)?.[1] ?? null;
}
