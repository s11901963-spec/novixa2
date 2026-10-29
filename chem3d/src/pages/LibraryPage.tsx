import { useMemo, useState } from 'react';
import { analysisOf } from '../chem/questions';
import type { ElectronGeometryId } from '../chem/types';
import { BookTable } from '../components/library/BookTable';
import { Badge, Card, Segmented } from '../components/ui/controls';
import { ShapeIcon } from '../components/ui/ShapeIcon';
import { Axe, Formula, formulaText } from '../components/ui/Formula';
import { MoleculeThumb } from '../components/ui/MoleculeThumb';
import { dataset } from '../data';
import { ELECTRON_GEOMETRIES } from '../data/schema';
import { useLang, useT } from '../i18n';
import { navigate } from '../router';
import { useLab } from '../state/lab';

export function LibraryPage() {
  const t = useT();
  const lang = useLang();
  const openMolecule = useLab((s) => s.openMolecule);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | 'core' | 'extended' | 'ion'>('all');
  const [eg, setEg] = useState<'all' | ElectronGeometryId>('all');
  const [lp, setLp] = useState<'any' | 'yes' | 'no'>('any');

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return dataset.molecules.filter((m) => {
      const v = analysisOf(m).vsepr!;
      if (cat !== 'all' && m.category !== cat) return false;
      if (eg !== 'all' && v.electronGeometry !== eg) return false;
      if (lp === 'yes' && v.lonePairs === 0) return false;
      if (lp === 'no' && v.lonePairs > 0) return false;
      if (!s) return true;
      return m.formula.toLowerCase().includes(s) || formulaText(m.formula, m.charge).toLowerCase().includes(s) || m.name.en.toLowerCase().includes(s) || m.name.ar.includes(q.trim());
    });
  }, [q, cat, eg, lp]);

  return (
    <div className="gutter mx-auto max-w-7xl py-6">
      <h1 className="text-2xl font-bold">{t('lib.title')}</h1>
      <p className="mt-1 max-w-3xl text-muted">{t('lib.intro', { n: dataset.molecules.length })}</p>

      <div className="mt-4">
        <BookTable />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('lib.search')} aria-label={t('lib.search')} className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:max-w-xs" data-testid="library-search" />
        <div className="flex flex-col gap-1 text-xs text-muted">
          {t('lib.filter.category')}
          <Segmented
            size="sm"
            label={t('lib.filter.category')}
            value={cat}
            onChange={setCat}
            options={[
              { value: 'all', label: t('lib.filter.all') },
              { value: 'core', label: t('category.core') },
              { value: 'extended', label: t('category.extended') },
              { value: 'ion', label: t('category.ion') },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted">
          {t('lib.filter.lp')}
          <Segmented
            size="sm"
            label={t('lib.filter.lp')}
            value={lp}
            onChange={setLp}
            options={[
              { value: 'any', label: t('lib.filter.lp.any') },
              { value: 'yes', label: t('lib.filter.lp.yes') },
              { value: 'no', label: t('lib.filter.lp.no') },
            ]}
          />
        </div>
        <div className="flex basis-full flex-col gap-1 text-xs text-muted">
          {t('lib.filter.eg')}
          <div role="radiogroup" aria-label={t('lib.filter.eg')} className="flex flex-wrap gap-1.5">
            {(['all', ...ELECTRON_GEOMETRIES] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={eg === g}
                onClick={() => setEg(g)}
                className={`flex min-h-10 items-center gap-1.5 rounded-xl border px-2.5 text-[13px] pointer-coarse:min-h-12 ${eg === g ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
              >
                {g !== 'all' && <ShapeIcon shape={g} kind="eg" size={26} />}
                {g === 'all' ? t('lib.filter.all') : t(`eg.${g}`)}
              </button>
            ))}
          </div>
        </div>
        <span className="text-sm text-muted">{t('lib.count', { n: items.length })}</span>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="library-grid">
        {items.map((m) => {
          const v = analysisOf(m).vsepr!;
          return (
            <li key={m.id}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md" as="article">
                <button
                  type="button"
                  className="flex h-full w-full flex-col text-start"
                  onClick={() => {
                    openMolecule(m.id);
                    navigate('lab');
                  }}
                  data-testid={`library-${m.id}`}
                >
                  <div className="flex items-center justify-center bg-screen py-3">
                    <MoleculeThumb molecule={m} size={116} />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-lg font-bold">
                        <Formula formula={m.formula} charge={m.charge} />
                      </span>
                      <span className="truncate text-sm text-muted">{m.name[lang]}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone="accent">{t(`mg.${v.molecularGeometry}`)}</Badge>
                      <Badge>
                        <Axe axe={v.axe} />
                      </Badge>
                      {m.experimental && <Badge tone="ok">{t('lib.hasExp')}</Badge>}
                      {m.textbook && <Badge tone="lp">{t('lib.book')}</Badge>}
                    </div>
                    <span className="mt-auto text-sm font-semibold text-accent">{t('common.openInLab')} {lang === 'ar' ? '←' : '→'}</span>
                  </div>
                </button>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
