import { lazy, Suspense, useEffect, useState } from 'react';
import { useT } from './i18n';
import { navigate, useRoute, type Route } from './router';
import { useSettings } from './state/settings';
import { VideoModal } from './components/ui/VideoModal';
import { HomePage } from './pages/HomePage';
import { LabPage } from './pages/LabPage';

const ElectronsPage = lazy(() => import('./pages/ElectronsPage').then((m) => ({ default: m.ElectronsPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage').then((m) => ({ default: m.ChallengesPage })));
const PredictPage = lazy(() => import('./pages/PredictPage').then((m) => ({ default: m.PredictPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ReferencesPage = lazy(() => import('./pages/ReferencesPage').then((m) => ({ default: m.ReferencesPage })));
const PreferencesPage = lazy(() => import('./pages/PreferencesPage').then((m) => ({ default: m.PreferencesPage })));

// A host page (e.g. an embedding viewer) may set data-theme itself; "system" restores that value.
const hostTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;

const TEXT_SCALE = { normal: '', large: '112.5%', xlarge: '125%' } as const;

function useDocumentSettings() {
  const lang = useSettings((s) => s.lang);
  const theme = useSettings((s) => s.theme);
  const textSize = useSettings((s) => s.textSize);
  useEffect(() => {
    // The UI is sized in rem, so the root font size scales every page.
    document.documentElement.style.fontSize = TEXT_SCALE[textSize] ?? '';
  }, [textSize]);
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme !== 'system') root.setAttribute('data-theme', theme);
    else if (hostTheme) root.setAttribute('data-theme', hostTheme);
    else root.removeAttribute('data-theme');
  }, [theme]);
}

function systemIsDark() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr === 'dark';
  return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
      <rect width="64" height="64" rx="15" fill="var(--screen)" />
      <g stroke="#9fb0cc" strokeWidth="4" strokeLinecap="round">
        <line x1="32" y1="35" x2="32" y2="13" />
        <line x1="32" y1="35" x2="14" y2="46" />
        <line x1="32" y1="35" x2="50" y2="46" />
      </g>
      <ellipse cx="32" cy="22" rx="6" ry="9" fill="#a78bfa" opacity="0.55" transform="rotate(0 32 22)" />
      <circle cx="32" cy="35" r="9.5" fill="#3050F8" />
      <circle cx="14" cy="47" r="6" fill="#f3f6fb" />
      <circle cx="50" cy="47" r="6" fill="#f3f6fb" />
      <circle cx="32" cy="12" r="6" fill="#f3f6fb" />
    </svg>
  );
}

const NAV: Route[] = ['lab', 'electrons', 'library', 'challenges', 'predict', 'history', 'references', 'preferences'];

function Header({ route }: { route: Route }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const sound = useSettings((s) => s.sound);
  const setSound = useSettings((s) => s.setSound);
  const [menu, setMenu] = useState(false);
  const isDark = theme === 'dark' || (theme === 'system' && systemIsDark());
  useEffect(() => setMenu(false), [route]);
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="gutter mx-auto flex h-[var(--header-h)] max-w-[1600px] items-center gap-3">
        <a href="#home" className="flex items-center gap-2" onClick={() => navigate('home')} data-testid="logo-link">
          <Logo />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }} dir="ltr">
              Chem3D
            </span>
            <span className="hidden text-[11px] text-muted sm:block">{t('app.tagline')}</span>
          </span>
        </a>
        <nav aria-label={t('nav.menu')} className="ms-2 hidden flex-1 items-center gap-0.5 xl:flex">
          {NAV.map((r) => (
            <a
              key={r}
              href={`#${r}`}
              aria-current={route === r ? 'page' : undefined}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${route === r ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}
              data-testid={`nav-${r}`}
            >
              {t(`nav.${r}`)}
            </a>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold hover:bg-surface-2"
            aria-label={t('nav.languageLabel')}
            data-testid="lang-toggle"
          >
            {t('nav.language')}
          </button>
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm hover:bg-surface-2"
            aria-label={t('nav.theme')}
            title={t('nav.theme')}
          >
            <span aria-hidden>{isDark ? '☀' : '☾'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSound(!sound)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm hover:bg-surface-2"
            aria-pressed={sound}
            aria-label={sound ? t('nav.sound.on') : t('nav.sound.off')}
            title={sound ? t('nav.sound.on') : t('nav.sound.off')}
            data-testid="sound-toggle"
          >
            <span aria-hidden>{sound ? '🔊' : '🔇'}</span>
          </button>
          <button type="button" className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold xl:hidden" aria-expanded={menu} aria-controls="mobile-nav" onClick={() => setMenu((m) => !m)} data-testid="menu-toggle">
            {t('nav.menu')}
          </button>
        </div>
      </div>
      {menu && (
        <nav id="mobile-nav" aria-label={t('nav.menu')} className="gutter grid grid-cols-2 gap-1 border-t border-line bg-surface pb-3 pt-2 sm:grid-cols-4 xl:hidden">
          {(['home', ...NAV] as Route[]).map((r) => (
            <a key={r} href={`#${r}`} aria-current={route === r ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-medium ${route === r ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2'}`} data-testid={`mnav-${r}`}>
              {t(`nav.${r}`)}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-line bg-surface/90 text-xs text-muted">
      <div className="gutter mx-auto flex min-h-[var(--footer-h)] max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5">
        <span className="font-semibold text-fg" data-testid="credits">
          {t('app.credits')}
        </span>
        <span className="flex gap-4">
          <a href="#home" className="hover:text-accent" data-testid="footer-home">
            {t('app.footer.about')}
          </a>
          <a href="#references" className="hover:text-accent">
            {t('app.footer.data')}
          </a>
        </span>
      </div>
    </footer>
  );
}

export function App() {
  useDocumentSettings();
  const route = useRoute();
  const t = useT();
  useEffect(() => {
    document.title = route === 'home' ? `${t('home.title')} · Chem3D` : route === 'lab' ? 'Chem3D Lab' : `Chem3D · ${t(`nav.${route}`)}`;
  }, [route, t]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {t('app.skip')}
      </a>
      <Header route={route} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<div className="gutter py-10 text-muted">{t('common.loading')}</div>}>
          {route === 'home' && <HomePage />}
          {route === 'lab' && <LabPage />}
          {route === 'electrons' && <ElectronsPage />}
          {route === 'library' && <LibraryPage />}
          {route === 'challenges' && <ChallengesPage />}
          {route === 'predict' && <PredictPage />}
          {route === 'history' && <HistoryPage />}
          {route === 'references' && <ReferencesPage />}
          {route === 'preferences' && <PreferencesPage />}
        </Suspense>
      </main>
      <Footer />
      <VideoModal />
    </div>
  );
}
