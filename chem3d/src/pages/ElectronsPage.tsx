import { useMemo, useState } from 'react';
import {
  aufbauTerms,
  boxSubshellsFor,
  capacity,
  configText,
  dotSides,
  electronConfig,
  fillingSteps,
  hundBoxes,
  orbitalCount,
  subshellLabel,
} from '../chem/electrons';
import { ConfigText } from '../components/electrons/ConfigText';
import { DotSymbol } from '../components/electrons/DotSymbol';
import { ElectronPractice } from '../components/electrons/ElectronPractice';
import { FillingOrderDiagram } from '../components/electrons/FillingOrderDiagram';
import { ltr } from '../components/electrons/messages';
import { OrbitalBoxes } from '../components/electrons/OrbitalBoxes';
import { PeriodicPicker } from '../components/electrons/PeriodicPicker';
import { Badge, Button, Card, Segmented } from '../components/ui/controls';
import { RefCite } from '../components/ui/RefCite';
import { atoms, getAtom } from '../data/atoms';
import { useLang, useT } from '../i18n';
import { useElectrons, type PracticeRange } from '../state/electrons';

function RepCard({ title, desc, children, testId }: { title: string; desc: string; children: React.ReactNode; testId: string }) {
  return (
    <Card className="flex flex-col gap-3 p-4" as="article">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{desc}</p>
      </div>
      <div data-testid={testId}>{children}</div>
    </Card>
  );
}

function Explore({ z }: { z: number }) {
  const t = useT();
  const lang = useLang();
  const atom = getAtom(z);
  const c = electronConfig(z);
  const steps = fillingSteps(z);
  const boxes = hundBoxes(c.terms, boxSubshellsFor(z));
  // Sublevel that ends up half-filled or full in an exception (Cr: 3d⁵, Cu: 3d¹⁰ …).
  const special = c.isException ? c.terms.find((x) => x.l >= 2 && (x.count === capacity(x.l) || x.count === orbitalCount(x.l))) : undefined;
  return (
    <div className="flex flex-col gap-4">
      {c.isException && (
        <div className="rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm" data-testid="ec-exception">
          <div className="font-bold text-warn">{t('ec.exception.title')}</div>
          <p className="mt-1 leading-7">
            {t('ec.exception.text', { aufbau: ltr(configText(aufbauTerms(z))), ground: ltr(configText(c.terms)) })}
            {special && ` ${t(special.count === capacity(special.l) ? 'ec.exception.filled' : 'ec.exception.halfFilled', { label: ltr(subshellLabel(special)) })}`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t('common.sources')}: <RefCite ids={['nist-asd', 'openstax-6-4']} />
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <RepCard title={t('ec.rep.full')} desc={t('ec.rep.full.desc')} testId="ec-rep-full">
          <div className="text-xl leading-9">
            <ConfigText terms={c.terms} />
          </div>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-semibold text-accent">{t('ec.steps.title')}</summary>
            <p className="mt-2 text-muted">{t('ec.steps.explain', { z })}</p>
            <ol className="mt-2 flex flex-wrap gap-1.5" dir="ltr">
              {steps.map((s) => (
                <li key={s.label} className="rounded-lg border border-line bg-surface-2 px-2 py-1 font-mono text-xs">
                  {s.label}
                  <sup>{s.count}</sup> <span className="text-muted">→ {s.total}</span>
                </li>
              ))}
            </ol>
            {c.isException && <p className="mt-2 text-xs text-warn">{t('ec.steps.exception')}</p>}
          </details>
        </RepCard>

        <RepCard title={t('ec.rep.noble')} desc={t('ec.rep.noble.desc')} testId="ec-rep-noble">
          <div className="text-xl leading-9">
            {c.core ? <ConfigText terms={c.outerTerms} core={c.core.symbol} /> : <ConfigText terms={c.terms} />}
          </div>
          <p className="mt-2 text-sm text-muted">
            {c.core
              ? t('ec.rep.noble.core', { core: c.core.symbol, coreText: ltr(configText(aufbauTerms(c.core.z))), n: c.core.z })
              : t('ec.rep.noble.none', { symbol: atom.symbol })}
          </p>
        </RepCard>

        <RepCard title={t('ec.rep.boxes')} desc={t('ec.rep.boxes.desc')} testId="ec-rep-boxes">
          <OrbitalBoxes boxes={boxes} ariaLabel={t('ec.rep.boxes')} />
          <p className="mt-3 text-sm">
            <Badge tone="lp">{t('ec.rep.boxes.unpaired', { n: c.unpaired })}</Badge>
          </p>
        </RepCard>

        <RepCard title={t('ec.rep.dots')} desc={t('ec.rep.dots.desc')} testId="ec-rep-dots">
          {c.dots.applicable ? (
            <div className="flex flex-wrap items-center gap-4">
              <DotSymbol symbol={atom.symbol} sides={dotSides(c.dots.count, z === 2)} ariaLabel={`${t('ec.rep.dots')}: ${atom.symbol}, ${c.dots.count}`} />
              <div className="text-sm leading-7">
                <div>{t('ec.rep.dots.count', { terms: ltr(configText(c.dots.terms)), n: c.dots.count })}</div>
                {z === 2 && <div className="text-muted">{t('ec.rep.dots.he')}</div>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{t('ec.rep.dots.na', { name: atom.name[lang] })}</p>
          )}
        </RepCard>
      </div>

      <Card className="p-4" as="section">
        <h2 className="text-lg font-bold">{t('ec.principles')}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <dl className="flex flex-col gap-3 text-sm leading-7">
            {(['aufbau', 'pauli', 'hund'] as const).map((k) => (
              <div key={k}>
                <dt className="font-bold">{t(`ec.${k}`)}</dt>
                <dd className="text-muted">{t(`ec.${k}.text`)}</dd>
              </div>
            ))}
            <div className="text-xs text-muted">
              {t('common.sources')}: <RefCite ids={['openstax-6-4', 'openstax-7-3', 'nist-asd']} />
            </div>
          </dl>
          <figure className="flex flex-col items-center gap-1">
            <FillingOrderDiagram terms={c.terms} ariaLabel={t('ec.order.title')} />
            <figcaption className="max-w-[260px] text-center text-xs text-muted">{t('ec.order.caption', { symbol: atom.symbol })}</figcaption>
          </figure>
        </div>
      </Card>
    </div>
  );
}

export function ElectronsPage() {
  const t = useT();
  const lang = useLang();
  const { z, mode, range, setZ, setMode, setRange } = useElectrons();
  const [query, setQuery] = useState('');
  const safeZ = atoms.byZ.has(z) ? z : 15;
  const atom = getAtom(safeZ);
  const c = electronConfig(safeZ);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return atoms.list.filter((a) => String(a.z) === q || a.symbol.toLowerCase() === q || a.name.en.toLowerCase().startsWith(q) || a.name.ar.includes(query.trim())).slice(0, 8);
  }, [query]);

  const random = () => {
    let next = safeZ;
    while (next === safeZ) next = 1 + Math.floor(Math.random() * range);
    setZ(next);
  };

  return (
    <div className="gutter mx-auto max-w-7xl py-6" data-testid="electrons-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('ec.title')}</h1>
          <p className="mt-1 max-w-3xl leading-7 text-muted">{t('ec.intro')}</p>
        </div>
        <Segmented
          label={t('ec.title')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'explore', label: t('ec.mode.explore') },
            { value: 'practice', label: t('ec.mode.practice') },
          ]}
        />
      </div>

      <Card className="mt-4 flex flex-col gap-3 p-3 sm:p-4" as="section">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ec.search')}
              aria-label={t('ec.search')}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              data-testid="ec-search"
            />
            {matches.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
                {matches.map((a) => (
                  <li key={a.z}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm hover:bg-surface-2"
                      onClick={() => {
                        setZ(a.z);
                        setQuery('');
                      }}
                    >
                      <span className="w-6 text-xs text-muted tabular">{a.z}</span>
                      <span className="w-7 font-mono font-bold">{a.symbol}</span>
                      <span>{a.name[lang]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button variant="secondary" onClick={() => setZ(Math.max(1, safeZ - 1))} disabled={safeZ <= 1} title={t('ec.prev')}>
            <span aria-hidden>{lang === 'ar' ? '→' : '←'}</span>
            <span className="sr-only">{t('ec.prev')}</span>
          </Button>
          <Button variant="secondary" onClick={() => setZ(Math.min(atoms.list.length, safeZ + 1))} disabled={safeZ >= atoms.list.length} title={t('ec.next')}>
            <span aria-hidden>{lang === 'ar' ? '←' : '→'}</span>
            <span className="sr-only">{t('ec.next')}</span>
          </Button>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Segmented
              size="sm"
              label={t('ec.practice.range')}
              value={String(range) as `${PracticeRange}`}
              onChange={(v) => setRange(Number(v) as PracticeRange)}
              options={[
                { value: '20', label: <bdi dir="ltr">Z ≤ 20</bdi> },
                { value: '36', label: <bdi dir="ltr">Z ≤ 36</bdi> },
                { value: '86', label: <bdi dir="ltr">Z ≤ 86</bdi> },
              ]}
            />
            <Button variant="secondary" onClick={random} data-testid="ec-random">
              {t('ec.practice.random')}
            </Button>
          </div>
        </div>
        <details open className="group">
          <summary className="cursor-pointer text-sm font-semibold text-accent">{t('ec.table')}</summary>
          <div className="mt-2">
            <PeriodicPicker value={safeZ} onChange={setZ} />
          </div>
        </details>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4" data-testid="ec-element" data-z={safeZ} data-symbol={atom.symbol}>
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-2" aria-hidden>
          <span className="text-[11px] text-muted tabular">{safeZ}</span>
          <span className="font-mono text-2xl font-bold leading-none">{atom.symbol}</span>
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {atom.name[lang]} <bdi dir="ltr" className="font-mono text-base text-muted">({atom.symbol})</bdi>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-sm">
            <Badge>
              {t('ec.atomicNumber')}: <span className="tabular">{safeZ}</span>
            </Badge>
            <Badge>{t('ec.electrons', { n: safeZ })}</Badge>
            <Badge>
              {t('ec.period')}: <span className="tabular">{c.period}</span>
            </Badge>
            {c.group !== null && (
              <Badge>
                {t('ec.group')}: <span className="tabular">{c.group}</span>
              </Badge>
            )}
            <Badge tone="accent">{t('ec.blockName', { block: c.block })}</Badge>
            {c.isException && <Badge tone="warn">{t('ec.exception.badge')}</Badge>}
          </div>
        </div>
        {mode === 'practice' && <p className="basis-full text-sm font-semibold">{t('ec.practice.target', { name: atom.name[lang], symbol: atom.symbol, z: safeZ })}</p>}
      </div>

      <div className="mt-4">{mode === 'explore' ? <Explore z={safeZ} /> : <ElectronPractice key={safeZ} z={safeZ} />}</div>

      <p className="mt-6 text-xs leading-6 text-muted">
        {t('ec.dataNote')} <RefCite ids={['nist-asd']} />
      </p>
    </div>
  );
}
