import { create } from 'zustand';
import type { VideoChapter } from '../data/media';

/** Which explanatory video is open: the project tour (from a chapter) or the touch tutorial for angles. */
export type OpenVideo = { kind: 'project'; chapter?: VideoChapter } | { kind: 'angle' };

export const useVideo = create<{ open: OpenVideo | null; show: (v: OpenVideo) => void; close: () => void }>()((set) => ({
  open: null,
  show: (open) => set({ open }),
  close: () => set({ open: null }),
}));
