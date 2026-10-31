import { useEffect, useRef } from 'react';
import { ANGLE_VIDEO_URL, PROJECT_VIDEO_CHAPTERS, PROJECT_VIDEO_POSTER, PROJECT_VIDEO_URL } from '../../data/media';
import { useT } from '../../i18n';
import { useVideo } from '../../state/video';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * The explanatory video, large over the page (for presenting on a projector or a phone): it starts
 * playing at once, from the chapter of the section it was opened from; the chapter list jumps
 * within it. × or Esc or a tap outside closes it.
 */
export function VideoModal() {
  const t = useT();
  const open = useVideo((s) => s.open);
  const close = useVideo((s) => s.close);
  const video = useRef<HTMLVideoElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const project = open?.kind === 'project';
  const start = project ? (PROJECT_VIDEO_CHAPTERS.find((c) => c.id === open.chapter)?.at ?? 0) : 0;

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const v = video.current;
    if (v) {
      const seek = () => {
        if (start) v.currentTime = start;
      };
      if (v.readyState >= 1) seek();
      else v.addEventListener('loadedmetadata', seek, { once: true });
      void v.play().catch(() => {});
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [open, start, close]);

  if (!open) return null;
  const jump = (at: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = at;
    void v.play().catch(() => {});
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={project ? t('video.project') : t('video.angle')} onClick={(e) => e.target === e.currentTarget && close()} data-testid="video-modal" data-video={open.kind} data-start={start}>
      <div className={`flex max-h-full w-full flex-col gap-2 ${project ? 'max-w-5xl' : 'max-w-sm'}`}>
        <div className="flex items-center gap-2 text-white">
          <h2 className="min-w-0 flex-1 truncate text-base font-bold sm:text-lg">{project ? t('video.project') : t('video.angle')}</h2>
          <button ref={closeBtn} type="button" onClick={close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl hover:bg-white/25" aria-label={t('video.close')} data-testid="video-close">
            ×
          </button>
        </div>
        <video
          ref={video}
          key={open.kind}
          className={`w-full rounded-xl bg-black ${project ? 'aspect-video' : 'max-h-[78vh] object-contain'}`}
          src={project ? PROJECT_VIDEO_URL : ANGLE_VIDEO_URL}
          poster={project ? PROJECT_VIDEO_POSTER : undefined}
          controls
          playsInline
          preload="auto"
          data-testid="video-player"
        />
        {project && (
          <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1" aria-label={t('video.chapters')}>
            {PROJECT_VIDEO_CHAPTERS.map((c) => (
              <button key={c.id} type="button" onClick={() => jump(c.at)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold pointer-coarse:min-h-9 ${c.id === (open.chapter ?? 'cover') ? 'border-[#ffc44d] bg-[#ffc44d] text-[#1d1300]' : 'border-white/30 text-white hover:bg-white/10'}`} data-testid={`video-chapter-${c.id}`}>
                {t(`video.ch.${c.id}` as never)} <bdi dir="ltr" className="opacity-70">{clock(c.at)}</bdi>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** «🎬 شرح بالفيديو»: opens the explanatory video at the part about this section. */
export function VideoHelpButton({ chapter, angle = false, tone = 'page', className = '' }: { chapter?: (typeof PROJECT_VIDEO_CHAPTERS)[number]['id']; angle?: boolean; tone?: 'page' | 'screen'; className?: string }) {
  const t = useT();
  const show = useVideo((s) => s.show);
  return (
    <button
      type="button"
      onClick={() => show(angle ? { kind: 'angle' } : { kind: 'project', chapter })}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-semibold pointer-coarse:min-h-10 ${tone === 'screen' ? 'border-[#ffc44d]/60 bg-[#ffc44d]/15 text-screen-fg hover:bg-[#ffc44d]/25' : 'border-accent/40 bg-accent-soft text-accent hover:bg-accent-soft/70'} ${className}`}
      data-testid={angle ? 'video-help-angle' : `video-help-${chapter ?? 'cover'}`}
    >
      <span aria-hidden>🎬</span>
      {t('video.help')}
    </button>
  );
}
