import { useMemo, useState } from 'react';
import { Badge, Card } from '../components/ui/controls';
import { refHref, shortCitation } from '../components/ui/RefCite';
import { dataset, type ReferenceData } from '../data';
import { useLang, useT } from '../i18n';

function VerifyBadge({ r }: { r: ReferenceData }) {
  const t = useT();
  const v = r.verification;
  const key = v.status === 'needs-review' ? 'ref.verify.needs-review' : v.status === 'cited' ? 'ref.verify.cited' : `ref.verify.${v.scope}`;
  const tone = v.status === 'needs-review' ? 'warn' : v.status === 'cited' ? 'neutral' : 'ok';
  return (
    <Badge tone={tone} className="whitespace-normal">
      {v.status === 'verified' ? '✓ ' : ''}
      {t(key as never)}
    </Badge>
  );
}

function FullReference({ r }: { r: ReferenceData }) {
  const t = useT();
  const href = refHref(r);
  return (
    <div className="flex flex-col gap-1.5 text-sm" dir={r.label ? 'auto' : 'ltr'} lang={r.label ? undefined : 'en'}>
      <div className="text-fg">
        {r.authors.length > 0 && <span>{r.authors.join(', ')} </span>}
        {r.year && <span>({r.year}). </span>}
        <span className="font-semibold">{r.title}</span>
        {r.container && <span className="italic">. {r.container}</span>}
        {r.volume && <span>, {r.volume}</span>}
        {r.issue && <span>({r.issue})</span>}
        {r.pages && <span>, {r.pages}</span>}.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="break-all text-accent underline-offset-2 hover:underline">
            {r.doi ? `doi:${r.doi}` : r.url}
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2" dir="auto">
        <VerifyBadge r={r} />
        <span className="text-xs text-muted">{t('ref.method', { method: r.verification.method })}</span>
      </div>
    </div>
  );
}

export function ReferencesPage() {
  const t = useT();
  const lang = useLang();
  const [filter, setFilter] = useState('');
  const refs = useMemo(() => {
    const s = filter.trim().toLowerCase();
    return [...dataset.references.values()]
      .filter((r) => !s || `${r.title} ${r.authors.join(' ')} ${r.container ?? ''} ${r.year ?? ''}`.toLowerCase().includes(s))
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  }, [filter]);

  return (
    <div className="gutter mx-auto max-w-5xl py-6" data-testid="references-page">
      <h1 className="text-2xl font-bold">{t('ref.title')}</h1>
      <p className="mt-2 max-w-3xl leading-7 text-muted">
        {t('ref.intro', { date: new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'long', numberingSystem: 'latn', timeZone: 'UTC' }).format(new Date(`${dataset.checkedOn}T00:00:00Z`)) })}
      </p>
      <p className="mt-2 max-w-3xl rounded-xl border border-warn/40 bg-warn-soft px-3 py-2 text-sm">{t('ref.bookNote')}</p>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">{t('ref.topics')}</h2>
        <div className="flex flex-col gap-4">
          {dataset.topics.map((topic) => (
            <Card key={topic.id} className="p-4 sm:p-5" as="article">
              <h3 className="text-lg font-bold">{topic.title[lang]}</h3>
              <p className="mt-2 leading-7">{topic.summary[lang]}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-ok-soft p-3 text-sm leading-7">
                  <div className="mb-1 font-semibold text-ok">{t('ref.supports')}</div>
                  {topic.supports[lang]}
                </div>
                <div className="rounded-xl bg-warn-soft p-3 text-sm leading-7">
                  <div className="mb-1 font-semibold text-warn">{t('ref.limits')}</div>
                  {topic.limits[lang]}
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
                {topic.references.map((id) => {
                  const r = dataset.references.get(id)!;
                  return (
                    <li key={id}>
                      <FullReference r={r} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-xl font-bold">{t('ref.methods')}</h2>
        <p className="mb-3 max-w-3xl text-sm text-muted">{t('ref.methodsIntro')}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {dataset.projectMethods.map((pm) => (
            <Card key={pm.id} className="border-dashed p-4" as="article">
              <div className="mb-1 flex items-center gap-2">
                <Badge tone="lp">Chem3D</Badge>
                <h3 className="font-bold" style={{ fontFamily: 'var(--font-body)' }}>
                  {pm.title[lang]}
                </h3>
              </div>
              <p className="text-sm leading-7 text-muted">{pm.description[lang]}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-3 p-4">
          <h3 className="font-bold" style={{ fontFamily: 'var(--font-body)' }}>
            {t('ref.chem3dLimits')}
          </h3>
          <p className="mt-1 text-sm leading-7 text-muted">{t('ref.chem3dLimits.body')}</p>
        </Card>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">
            {t('ref.biblio')} <span className="text-base font-normal text-muted">({dataset.references.size})</span>
          </h2>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('ref.filter')} aria-label={t('ref.filter')} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        </div>
        <ol className="flex flex-col gap-2">
          {refs.map((r) => (
            <li key={r.id} id={`ref-${r.id}`} className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge>{t(`ref.type.${r.type}`)}</Badge>
                <bdi dir={r.label ? undefined : 'ltr'}>{shortCitation(r, lang)}</bdi>
              </div>
              <FullReference r={r} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
