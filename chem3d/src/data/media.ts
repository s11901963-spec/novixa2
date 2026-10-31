// The project videos, kept in the repository (docs/) and served by jsDelivr, which sends them as video
// with range requests so phones can stream them. Pinned to a commit so the links never change.
const BASE = 'https://cdn.jsdelivr.net/gh/s11901963-spec/novixa2@cc05e03e63b60dd9801c8f5d4bf9ad0c66b647fa/docs';
export const PROJECT_VIDEO_URL = `${BASE}/chem3d-project-video.mp4`;
export const PROJECT_VIDEO_POSTER: string | undefined = `${BASE}/chem3d-video-poster.jpg`;
/** Phone screen recording: changing the angle by touch (one finger, two fingers, − / +, slider). */
export const ANGLE_VIDEO_URL = `${BASE}/chem3d-angle-demo.mp4`;

export type VideoChapter = 'cover' | 'lab' | 'practice' | 'views' | 'solution' | 'why' | 'angle' | 'builder' | 'electrons' | 'library' | 'challenges' | 'predict' | 'references' | 'settings';

/** Where each part starts in the project video (seconds; measured on that recording). */
export const PROJECT_VIDEO_CHAPTERS: { id: VideoChapter; at: number }[] = [
  { id: 'cover', at: 0 },
  { id: 'lab', at: 22 },
  { id: 'practice', at: 31.5 },
  { id: 'views', at: 69.3 },
  { id: 'solution', at: 98 },
  { id: 'why', at: 123 },
  { id: 'angle', at: 134 },
  { id: 'builder', at: 167.6 },
  { id: 'electrons', at: 189.2 },
  { id: 'library', at: 227 },
  { id: 'challenges', at: 237.5 },
  { id: 'predict', at: 247.8 },
  { id: 'references', at: 266.5 },
  { id: 'settings', at: 272.5 },
];
