import { useEffect, useMemo, useRef, useState } from 'react';
import { dataset } from '../../data';
import { useLang, useT } from '../../i18n';
import { useLab } from '../../state/lab';
import { Formula, formulaText } from '../ui/Formula';
import type { LabModel } from './useLabModel';

const CORE = dataset.molecules.filter((m) => m.category === 'core');

/** Molecule selector: quick chips for the lesson molecules + searchable list of every species. */
export function MoleculePicker({ model }: { model: LabModel }) {
  const t = useT();
  const lang = useLang();
  const openMolecule = useLab((s) => s.openMolecule);
  const setTab = useLab((s) => s.setTab);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const currentId = model.source.kind === 'library' ? model.source.id : null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return dataset.molecules.filter(
      (m) => !s || m.formula.toLowerCase().includes(s) || formulaText(m.formula, m.charge).toLowerCase().includes(s) || m.name.ar.includes(q.trim()) || m.name.en.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="relative" ref={boxRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2"
          data-testid="molecule-picker"
        >
          <span className="text-muted">{t('lab.pick')}:</span>
          <Formula formula={model.formula} charge={model.charge} className="text-base" />
          {model.molecule && model.source.kind === 'library' && <span className="hidden text-muted sm:inline">· {model.molecule.name[lang]}</span>}
          <span aria-hidden className="text-muted">▾</span>
        </button>
        {open && (
          <div className="absolute start-0 top-full z-40 mt-1.5 w-[min(92vw,360px)] rounded-2xl border border-line bg-surface p-2 shadow-xl">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('lab.search')}
              aria-label={t('lab.search')}
              className="mb-2 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
            />
            <div role="listbox" className="scroll-thin max-h-[52vh] overflow-y-auto">
              {(['core', 'extended', 'ion'] as const).map((cat) => {
                const items = filtered.filter((m) => m.category === cat);
                if (!items.length) return null;
                return (
                  <div key={cat} className="mb-1">
                    <div className="px-2 py-1 text-xs font-semibold text-muted">{t(`category.${cat}`)}</div>
                    {items.map((m) => (
                      <button
                        key={m.id}
                        role="option"
                        aria-selected={m.id === currentId}
                        type="button"
                        onClick={() => {
                          openMolecule(m.id);
                          setOpen(false);
                          setQ('');
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2 ${m.id === currentId ? 'bg-accent-soft' : ''}`}
                      >
                        <span className="font-semibold">
                          <Formula formula={m.formula} charge={m.charge} />
                        </span>
                        <span className="truncate text-muted">{m.name[lang]}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
              {!filtered.length && <div className="px-2 py-3 text-sm text-muted">{t('lab.noResults')}</div>}
            </div>
          </div>
        )}
      </div>
      <div className="scroll-thin flex min-w-0 max-w-full gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label={t('category.core')}>
        {CORE.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => openMolecule(m.id)}
            aria-pressed={m.id === currentId}
            className={`shrink-0 rounded-lg border px-2.5 py-1 text-sm transition-colors ${
              m.id === currentId ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface hover:bg-surface-2'
            }`}
            data-testid={`chip-${m.id}`}
          >
            <Formula formula={m.formula} />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setTab('builder')}
        className={`shrink-0 rounded-lg border border-dashed px-2.5 py-1 text-sm ${model.source.kind === 'builder' ? 'border-accent text-accent' : 'border-line text-muted hover:text-fg'}`}
        data-testid="open-builder"
      >
        + {t('lab.builderMode')}
      </button>
    </div>
  );
}
