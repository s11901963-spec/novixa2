import type { ReactNode } from 'react';

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
  tone = 'surface',
}: {
  value: T;
  options: { value: T; label: ReactNode; disabled?: boolean; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
  tone?: 'surface' | 'screen';
}) {
  const base =
    tone === 'screen'
      ? 'bg-screen-2/90 border-screen-line text-screen-fg'
      : 'bg-surface-2 border-line text-fg';
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex flex-wrap rounded-xl border p-0.5 gap-0.5 ${base}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`rounded-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              size === 'sm' ? 'px-2.5 py-1 text-[13px]' : 'px-3.5 py-1.5 text-sm'
            } ${
              active
                ? tone === 'screen'
                  ? 'bg-screen-fg text-screen'
                  : 'bg-accent text-accent-fg shadow-sm'
                : tone === 'screen'
                  ? 'hover:bg-white/10'
                  : 'hover:bg-surface'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ToggleChip({
  pressed,
  onToggle,
  children,
  tone = 'screen',
  swatch,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
  tone?: 'screen' | 'surface';
  swatch?: string;
}) {
  const on =
    tone === 'screen' ? 'bg-screen-fg/95 text-screen border-screen-fg' : 'bg-accent-soft text-accent border-accent/40';
  const off =
    tone === 'screen'
      ? 'bg-screen-2/80 text-screen-muted border-screen-line hover:text-screen-fg'
      : 'bg-surface text-muted border-line hover:text-fg';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-medium transition-colors ${pressed ? on : off}`}
    >
      {swatch && <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: swatch }} />}
      {children}
    </button>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
  title,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  title?: string;
  'data-testid'?: string;
}) {
  const styles = {
    primary: 'bg-accent text-accent-fg hover:brightness-110 border-transparent',
    secondary: 'bg-surface text-fg border-line hover:bg-surface-2',
    ghost: 'bg-transparent text-accent border-transparent hover:bg-accent-soft',
    danger: 'bg-bad text-white border-transparent hover:brightness-110',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-45 disabled:cursor-not-allowed ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'ok' | 'bad' | 'warn' | 'lp'; className?: string }) {
  const styles = {
    neutral: 'bg-surface-2 text-muted border-line',
    accent: 'bg-accent-soft text-accent border-accent/30',
    ok: 'bg-ok-soft text-ok border-ok/30',
    bad: 'bg-bad-soft text-bad border-bad/30',
    warn: 'bg-warn-soft text-warn border-warn/30',
    lp: 'bg-lp/15 text-lp border-lp/30',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${styles} ${className}`}>{children}</span>;
}

export function Card({ children, className = '', as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <As className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</As>;
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-sm font-semibold text-fg">{label}</div>
      {children}
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
