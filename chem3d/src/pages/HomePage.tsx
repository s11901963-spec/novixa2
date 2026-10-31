import { PROJECT_VIDEO_POSTER, PROJECT_VIDEO_URL } from '../data/media';
import { useT } from '../i18n';
import { navigate, type Route } from '../router';
import { useLab, type LabTab } from '../state/lab';

const FEATURES: { id: string; icon: string; route: Route; tab?: LabTab }[] = [
  { id: 'lab', icon: '🧪', route: 'lab', tab: 'solution' },
  { id: 'practice', icon: '✍️', route: 'lab', tab: 'practice' },
  { id: 'angle', icon: '📐', route: 'lab', tab: 'angle' },
  { id: 'electrons', icon: '⚛', route: 'electrons' },
  { id: 'challenges', icon: '🏆', route: 'challenges' },
  { id: 'library', icon: '📚', route: 'library' },
];

/** The project's first page: school, section, title, student and supervisor, then what the project does. */
export function HomePage() {
  const t = useT();
  const setTab = useLab((s) => s.setTab);
  const open = (route: Route, tab?: LabTab) => {
    if (tab) setTab(tab);
    navigate(route);
  };
  return (
    <div className="gutter mx-auto flex w-full max-w-5xl flex-col gap-6 py-6" data-testid="home-page">
      <section className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_30%_15%,#1e3a8a_0%,#0b1020_58%,#05070f_100%)] px-5 py-9 text-center text-white shadow-xl sm:px-10 sm:py-12">
        <p className="text-sm font-semibold tracking-wide text-[#cbd5e1] sm:text-base" data-testid="home-school">
          {t('home.school')}
        </p>
        <p className="mt-1 inline-block rounded-full border border-white/25 bg-white/10 px-3 py-0.5 text-sm font-semibold" data-testid="home-section">
          {t('home.section')}
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-6xl" style={{ fontFamily: 'var(--font-display)' }} data-testid="home-title">
          {t('home.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[#cbd5e1] sm:text-lg">{t('home.subtitle')}</p>
        <dl className="mx-auto mt-6 grid max-w-xl gap-2 text-base sm:grid-cols-2">
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <dt className="text-sm text-[#cbd5e1]">{t('home.byLabel')}</dt>
            <dd className="mt-0.5 text-lg font-bold text-[#ffc44d]" data-testid="home-student">
              {t('home.by')}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <dt className="text-sm text-[#cbd5e1]">{t('home.supervisorLabel')}</dt>
            <dd className="mt-0.5 text-lg font-bold text-[#ffc44d]" data-testid="home-supervisor">
              {t('home.supervisor')}
            </dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => open('lab', 'practice')}
            className="rounded-2xl bg-[#ffc44d] px-6 py-3 text-lg font-extrabold text-[#1d1300] shadow-lg transition hover:brightness-105 active:scale-[.98] pointer-coarse:min-h-12"
            data-testid="home-start"
          >
            {t('home.start')}
          </button>
          <a href="#home-video" onClick={(e) => { e.preventDefault(); document.getElementById('home-video')?.scrollIntoView({ behavior: 'smooth' }); }} className="rounded-2xl border border-white/30 px-5 py-3 text-lg font-bold text-white hover:bg-white/10 pointer-coarse:min-h-12">
            {t('home.watch')}
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-bold">{t('home.ideaTitle')}</h2>
        <p className="mt-2 leading-8 text-fg">{t('home.idea')}</p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">{t('home.featuresTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => open(f.route, f.tab)}
              className="flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface p-4 text-start transition hover:border-accent hover:bg-accent-soft/40 pointer-coarse:min-h-24"
              data-testid={`home-go-${f.id}`}
            >
              <span className="text-lg font-bold">
                <span aria-hidden>{f.icon} </span>
                {t(`home.f.${f.id}.title` as never)}
              </span>
              <span className="text-sm leading-6 text-muted">{t(`home.f.${f.id}.text` as never)}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="home-video" className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-bold">{t('home.videoTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('home.videoNote')}</p>
        <video className="mt-3 aspect-video w-full rounded-xl bg-black" src={PROJECT_VIDEO_URL} poster={PROJECT_VIDEO_POSTER} controls preload="metadata" playsInline data-testid="home-video-player" />
      </section>
    </div>
  );
}
