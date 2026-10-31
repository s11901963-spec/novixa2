import { useEffect, useState } from 'react';

// Plain-name hash routes (#lab, #library…). They work on any static host and inside
// sandboxed viewers that only pass simple #names through.
export const ROUTES = ['home', 'lab', 'electrons', 'library', 'challenges', 'predict', 'history', 'references', 'preferences'] as const;
export type Route = (typeof ROUTES)[number];

function parse(hash: string): Route {
  const name = hash.replace(/^#/, '');
  // No (or an unknown) name: the project's first page.
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : 'home';
}

export function navigate(route: Route) {
  if (parse(window.location.hash) === route && window.location.hash) return;
  window.location.hash = route;
}

/**
 * In-page links (#challenges, #references…) only change the hash of this page. Some viewers that
 * open an HTML file from GitHub (htmlpreview.github.io) add a <base> pointing at the raw file, and
 * the browser would then follow such a link to that address and show the page's source code.
 */
export function keepHashLinksInPage(doc: Document = document): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    if (!link || (link.target && link.target !== '_self')) return;
    e.preventDefault();
    const hash = link.getAttribute('href')!;
    if (window.location.hash !== hash) window.location.hash = hash;
  };
  doc.addEventListener('click', onClick);
  return () => doc.removeEventListener('click', onClick);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
