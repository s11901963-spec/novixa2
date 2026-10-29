import { dataset, type ReferenceData } from '../../data';

export function shortCitation(r: ReferenceData): string {
  const family = (a: string) => a.replace(/\s*\(eds?\.\)\s*/, '').split(' ').filter(Boolean).pop() ?? a;
  if (r.type === 'database' || r.type === 'textbook') {
    if (r.id === 'cccbdb') return 'NIST CCCBDB';
    if (r.id === 'pubchem-pt') return 'PubChem';
    if (r.id.startsWith('openstax')) return `OpenStax ${r.id.replace('openstax-', '').replace('-', '.')}`;
  }
  const names = r.authors.map(family);
  const who = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} & ${names[1]}` : `${names[0]} et al.`;
  return `${who} ${r.year}`;
}

export function refHref(r: ReferenceData): string | undefined {
  return r.doi ? `https://doi.org/${r.doi}` : r.url;
}

/** Inline citation link(s) for reference ids from references.json. */
export function RefCite({ ids, className = '' }: { ids: string[]; className?: string }) {
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
              <a href={href} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline" dir="ltr">
                {shortCitation(r)}
              </a>
            ) : (
              <bdi dir="ltr">{shortCitation(r)}</bdi>
            )}
          </span>
        );
      })}
    </span>
  );
}
