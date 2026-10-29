import type { BoxSubshell, Orbital, Spin } from '../../chem/electrons';
import { useT } from '../../i18n';

const ARROW: Record<Spin, string> = { up: '↑', down: '↓' };
const NEXT: Record<'empty' | Spin, Spin | null> = { empty: 'up', up: 'down', down: null };

/**
 * Orbital (box) diagram: one square per orbital, grouped by sublevel in filling order.
 * With `onChange` every half of a square is a button that cycles empty → ↑ → ↓.
 */
export function OrbitalBoxes({
  boxes,
  onChange,
  highlight,
  ariaLabel,
  size = 'md',
}: {
  boxes: BoxSubshell[];
  onChange?: (next: BoxSubshell[]) => void;
  highlight?: string | null;
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  const t = useT();
  const box = size === 'sm' ? 'h-8 w-8 text-base' : 'h-10 w-10 text-lg';
  const set = (label: string, oi: number, slot: 0 | 1) => {
    if (!onChange) return;
    onChange(
      boxes.map((s) =>
        s.label !== label
          ? s
          : {
              ...s,
              orbitals: s.orbitals.map((o, i): Orbital => {
                if (i !== oi) return o;
                const next: Orbital = [o[0], o[1]];
                next[slot] = NEXT[o[slot] ?? 'empty'];
                return next;
              }),
            },
      ),
    );
  };
  return (
    <div dir="ltr" role="group" aria-label={ariaLabel} className="flex flex-wrap items-start gap-x-3 gap-y-3" data-testid="orbital-boxes">
      {boxes.map((s) => (
        <div
          key={s.label}
          className={`flex flex-col items-center gap-1 rounded-lg p-1 ${highlight === s.label ? 'bg-bad-soft ring-2 ring-bad/50' : ''}`}
          data-subshell={s.label}
        >
          <div className="flex">
            {s.orbitals.map((o, oi) => (
              <div key={oi} className={`${box} -ms-px first:ms-0 grid grid-cols-2 border-2 border-fg/70 bg-surface font-bold leading-none`}>
                {([0, 1] as const).map((slot) =>
                  onChange ? (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => set(s.label, oi, slot)}
                      className="flex items-center justify-center hover:bg-accent-soft focus-visible:bg-accent-soft"
                      aria-label={t('ec.boxes.slot', { label: s.label, orbital: oi + 1, slot: slot + 1, state: o[slot] ? ARROW[o[slot]!] : t('ec.boxes.empty') })}
                      data-testid={`box-${s.label}-${oi}-${slot}`}
                    >
                      <span aria-hidden className={o[slot] === 'up' ? 'text-accent' : 'text-lp'}>
                        {o[slot] ? ARROW[o[slot]!] : ''}
                      </span>
                    </button>
                  ) : (
                    <span key={slot} className={`flex items-center justify-center ${o[slot] === 'up' ? 'text-accent' : 'text-lp'}`} aria-hidden>
                      {o[slot] ? ARROW[o[slot]!] : ''}
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
          <span className="font-mono text-xs font-semibold text-muted">{s.label}</span>
        </div>
      ))}
      {!onChange && (
        <span className="sr-only">
          {boxes
            .map((s) => `${s.label}: ${s.orbitals.map((o) => (o[0] && o[1] ? '↑↓' : o[0] ? ARROW[o[0]] : o[1] ? ARROW[o[1]] : '□')).join(' ')}`)
            .join('; ')}
        </span>
      )}
    </div>
  );
}
