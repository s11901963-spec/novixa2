import { useMemo, useState } from 'react';
import { analysisOf } from '../chem/questions';
import type { ElectronGeometryId } from '../chem/types';
import { BookTable } from '../components/library/BookTable';
import { Badge, Card } from '../components/ui/controls';
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

  const selectCls = 'rounded-lg border border-line bg-surface px-2.5 py-2 text-sm';
  return (
    <div className="gutter mx-auto max-w-7xl py-6">
      <h1 className="text-2xl font-bold">{t('lib.title')}</h1>
      <p className="mt-1 max-w-3xl text-muted">{t('lib.intro', { n: dataset.molecules.length })}</p>

      <div className="mt-4">
        <BookTable />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('lib.search')} aria-label={t('lib.search')} className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:max-w-xs" data-testid="library-search" />
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('lib.filter.category')}
          <select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} className={selectCls}>
            <option value="all">{t('lib.filter.all')}</option>
            <option value="core">{t('category.core')}</option>
            <option value="extended">{t('category.extended')}</option>
            <option value="ion">{t('category.ion')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('lib.filter.eg')}
          <select value={eg} onChange={(e) => setEg(e.target.value as typeof eg)} className={selectCls}>
            <option value="all">{t('lib.filter.all')}</option>
            {ELECTRON_GEOMETRIES.map((g) => (
              <option key={g} value={g}>
                {t(`eg.${g}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('lib.filter.lp')}
          <select value={lp} onChange={(e) => setLp(e.target.value as typeof lp)} className={selectCls}>
            <option value="any">{t('lib.filter.lp.any')}</option>
            <option value="yes">{t('lib.filter.lp.yes')}</option>
            <option value="no">{t('lib.filter.lp.no')}</option>
          </select>
        </label>
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
