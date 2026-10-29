import { dataset, type ReferenceData } from '../../data';
import { useLang } from '../../i18n';
import type { Lang } from '../../state/settings';

export function shortCitation(r: ReferenceData, lang: Lang = 'en'): string {
  if (r.label) return r.label[lang];
  const family = (a: string) => a.replace(/\s*\(eds?\.\)\s*/, '').split(' ').filter(Boolean).pop() ?? a;
  if (r.type === 'database' || r.type === 'textbook') {
    if (r.id === 'cccbdb') return 'NIST CCCBDB';
    if (r.id === 'pubchem-pt') return 'PubChem';
    if (r.id.startsWith('openstax')) return `OpenStax ${r.id.replace('openstax-', '').replace('-', '.')}`;
  }
  const names = r.authors.map(family);
  const who = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} & ${names[1]}` : `${names[0]} et al.`;
  return r.year ? `${who} ${r.year}` : who;
}

export function refHref(r: ReferenceData): string | undefined {
  // Old Wiley DOIs contain "<", ">" and "#", which must be escaped in a URL.
  return r.doi ? `https://doi.org/${r.doi.replace(/[<>#;]/g, (c) => encodeURIComponent(c))}` : r.url;
}

/** Inline citation link(s) for reference ids from references.json. */
export function RefCite({ ids, className = '' }: { ids: string[]; className?: string }) {
  const lang = useLang();
  const refs = ids.map((id) => dataset.references.get(id)).filter((r): r is ReferenceData => !!r);
  if (!refs.length) return null;
  return (
    <span className={`text-xs ${className}`}>
      {refs.map((r, i) => {
        const href = refHref(r);
        return (
          <span key={r.id}>
            {i > 0 && '؛ '}
            {href ? (
              <a href={href} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline" dir={r.label ? undefined : 'ltr'}>
                {shortCitation(r, lang)}
              </a>
            ) : r.label ? (
              <a href="#references" className="text-accent underline-offset-2 hover:underline">
                {shortCitation(r, lang)}
              </a>
            ) : (
              <bdi dir="ltr">{shortCitation(r, lang)}</bdi>
            )}
          </span>
        );
      })}
    </span>
  );
}
