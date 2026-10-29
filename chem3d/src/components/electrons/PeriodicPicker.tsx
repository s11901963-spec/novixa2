import { useEffect, useRef } from 'react';
import { blockOf, groupOf, periodOf, type Block } from '../../chem/electrons';
import { atoms } from '../../data/atoms';
import { useLang, useT } from '../../i18n';

const BLOCK_STYLE: Record<Block, string> = {
  s: 'bg-accent-soft',
  p: 'bg-ok-soft',
  d: 'bg-warn-soft',
  f: 'bg-lp/15',
};

/** Compact periodic table (H–Rn) for choosing an element; La–Lu sit in a separate row. */
export function PeriodicPicker({ value, onChange }: { value: number; onChange: (z: number) => void }) {
  const t = useT();
  const lang = useLang();
  const scroller = useRef<HTMLDivElement>(null);
  // On narrow screens the table scrolls sideways: keep the selected element in view.
  useEffect(() => {
    const box = scroller.current;
    const cell = box?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!box || !cell || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft = cell.offsetLeft - box.clientWidth / 2 + cell.clientWidth / 2;
  }, [value]);
  const cells = atoms.list.map((a) => {
    const group = groupOf(a.z);
    const period = periodOf(a.z);
    // f-row (La–Lu) goes under the table, starting below group 3.
    const col = group ?? a.z - 57 + 3;
    const row = group === null ? period + 2 : period;
    return { a, col, row, block: blockOf(a.z) };
  });
  return (
    <div className="flex flex-col gap-2">
      <div ref={scroller} className="scroll-thin relative overflow-x-auto pb-1" dir="ltr">
        <div className="grid min-w-[620px] gap-[3px]" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }} role="listbox" aria-label={t('ec.table')}>
          {cells.map(({ a, col, row, block }) => {
            const selected = a.z === value;
            return (
              <button
                key={a.z}
                type="button"
                role="option"
                aria-selected={selected}
                title={`${a.z} · ${a.name[lang]}`}
                aria-label={`${a.z} ${a.symbol} ${a.name[lang]}`}
                onClick={() => onChange(a.z)}
                style={{ gridColumn: col, gridRow: row }}
                className={`flex aspect-square min-h-0 flex-col items-center justify-center rounded-md border text-center leading-none transition-colors ${
                  selected ? 'border-accent bg-accent text-accent-fg shadow-sm' : `border-line ${BLOCK_STYLE[block]} text-fg hover:border-accent`
                }`}
                data-testid={`pt-${a.symbol}`}
              >
                <span className={`text-[9px] tabular ${selected ? 'opacity-90' : 'text-muted'}`}>{a.z}</span>
                <span className="font-mono text-[13px] font-bold">{a.symbol}</span>
              </button>
            );
          })}
          <div aria-hidden style={{ gridColumn: 3, gridRow: 6 }} className="flex aspect-square items-center justify-center rounded-md border border-dashed border-line bg-lp/10 text-[9px] text-muted">
            57–71
          </div>
          <div aria-hidden style={{ gridColumn: '1 / span 18', gridRow: 7 }} className="h-1.5" />
          <div aria-hidden style={{ gridColumn: '1 / span 2', gridRow: 8 }} className="flex items-center justify-end pe-1 text-[10px] text-muted">
            57–71
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {(['s', 'p', 'd', 'f'] as Block[]).map((b) => (
          <span key={b} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-3 w-3 rounded-sm border border-line ${BLOCK_STYLE[b]}`} />
            {t('ec.blockName', { block: b })}
          </span>
        ))}
      </div>
    </div>
  );
}
