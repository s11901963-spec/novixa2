import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useT } from '../../i18n';

/**
 * A small panel floating over the 3D view that the student can move out of the way
 * (drag the ⠿ handle with a finger or the mouse, or use the arrow keys on it) and fold
 * to a single line. It always stays inside `bounds`.
 */
export function DraggablePanel({
  bounds,
  children,
  folded,
  title,
  defaultCollapsed = false,
  placement = 'top-start',
  className = '',
  testId,
}: {
  bounds: RefObject<HTMLElement | null>;
  children: ReactNode;
  /** One-line content shown when folded. */
  folded: ReactNode;
  title: string;
  defaultCollapsed?: boolean;
  placement?: 'top-start' | 'top-end' | 'middle-end' | 'bottom-start' | 'bottom-end';
  className?: string;
  testId?: string;
}) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const clampTo = (x: number, y: number) => {
    const b = bounds.current?.getBoundingClientRect();
    const p = panel.current?.getBoundingClientRect();
    if (!b || !p) return { x, y };
    return { x: Math.min(Math.max(0, x), Math.max(0, b.width - p.width)), y: Math.min(Math.max(0, y), Math.max(0, b.height - p.height)) };
  };
  const current = () => {
    const b = bounds.current?.getBoundingClientRect();
    const p = panel.current?.getBoundingClientRect();
    return b && p ? { x: p.left - b.left, y: p.top - b.top } : { x: 0, y: 0 };
  };

  // Keep the panel inside the view when the view is resized (rotation, window resize, folding).
  useEffect(() => {
    const el = bounds.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPos((p) => (p ? clampTo(p.x, p.y) : p)));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]);
  useEffect(() => {
    setPos((p) => (p ? clampTo(p.x, p.y) : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const place = {
    'top-start': 'top-14 start-2.5',
    'top-end': 'top-14 end-2.5',
    'middle-end': 'top-1/2 end-2 -translate-y-1/2',
    'bottom-start': 'bottom-2.5 start-2.5',
    'bottom-end': 'bottom-2.5 end-2.5',
  }[placement];

  return (
    <div
      ref={panel}
      className={`absolute z-20 max-w-[min(92%,340px)] rounded-xl border border-screen-line bg-screen-2/95 text-sm text-screen-fg shadow-lg ${pos ? '' : place} ${className}`}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', transform: 'none' } : undefined}
      data-testid={testId}
      data-collapsed={collapsed}
      data-moved={!!pos}
    >
      <div className="flex items-center gap-1 ps-1 pe-1 pt-1">
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-base text-screen-muted hover:bg-white/10 active:cursor-grabbing pointer-coarse:h-10 pointer-coarse:w-10"
          aria-label={t('panel.move', { title })}
          title={t('panel.move', { title })}
          onPointerDown={(e) => {
            const c = current();
            const b = bounds.current?.getBoundingClientRect();
            if (!b) return;
            grab.current = { dx: e.clientX - b.left - c.x, dy: e.clientY - b.top - c.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const b = bounds.current?.getBoundingClientRect();
            if (!grab.current || !b) return;
            setPos(clampTo(e.clientX - b.left - grab.current.dx, e.clientY - b.top - grab.current.dy));
          }}
          onPointerUp={() => {
            grab.current = null;
          }}
          onPointerCancel={() => {
            grab.current = null;
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 40 : 12;
            const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
            if (!d) return;
            e.preventDefault();
            const c = pos ?? current();
            setPos(clampTo(c.x + d[0], c.y + d[1]));
          }}
          data-testid={testId ? `${testId}-handle` : undefined}
        >
          <span aria-hidden>⠿</span>
        </button>
        <div className="min-w-0 flex-1">{collapsed ? folded : null}</div>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base text-screen-muted hover:bg-white/10 pointer-coarse:h-10 pointer-coarse:w-10"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('panel.expand', { title }) : t('panel.collapse', { title })}
          title={collapsed ? t('panel.expand', { title }) : t('panel.collapse', { title })}
          onClick={() => setCollapsed((c) => !c)}
          data-testid={testId ? `${testId}-fold` : undefined}
        >
          <span aria-hidden>{collapsed ? '▾' : '▴'}</span>
        </button>
      </div>
      {!collapsed && <div className="px-3 pb-2.5">{children}</div>}
    </div>
  );
}
