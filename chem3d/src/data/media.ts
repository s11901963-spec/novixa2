// The project video, kept in the repository (docs/) and served by jsDelivr, which sends it as video
// with range requests so phones can stream it. Pinned to a commit so the link never changes.
const BASE = 'https://cdn.jsdelivr.net/gh/s11901963-spec/novixa2@cc05e03e63b60dd9801c8f5d4bf9ad0c66b647fa/docs';
export const PROJECT_VIDEO_URL = `${BASE}/chem3d-project-video.mp4`;
export const PROJECT_VIDEO_POSTER: string | undefined = `${BASE}/chem3d-video-poster.jpg`;
