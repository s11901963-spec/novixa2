// The project video, kept in the repository (docs/) and served by jsDelivr, which sends it as video
// with range requests so phones can stream it. Pinned to a commit so the link never changes.
const BASE = 'https://cdn.jsdelivr.net/gh/s11901963-spec/novixa2@e734a6cfc8c7005e8bedd0a133f7c1fa421abb25/docs';
export const PROJECT_VIDEO_URL = `${BASE}/chem3d-project-video.mp4`;
export const PROJECT_VIDEO_POSTER: string | undefined = `${BASE}/chem3d-video-poster.jpg`;
