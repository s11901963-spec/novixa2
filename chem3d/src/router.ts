import { useEffect, useState } from 'react';

// Plain-name hash routes (#lab, #library…). They work on any static host and inside
// sandboxed viewers that only pass simple #names through.
export const ROUTES = ['lab', 'electrons', 'library', 'challenges', 'predict', 'history', 'references', 'preferences'] as const;
export type Route = (typeof ROUTES)[number];

function parse(hash: string): Route {
  const name = hash.replace(/^#/, '');
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : 'lab';
}

export function navigate(route: Route) {
  if (parse(window.location.hash) === route && window.location.hash) return;
  window.location.hash = route;
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
