import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';

export type ElectronsMode = 'explore' | 'practice';
export type PracticeRange = 20 | 36 | 86;

interface ElectronsState {
  z: number;
  mode: ElectronsMode;
  range: PracticeRange;
  setZ: (z: number) => void;
  setMode: (m: ElectronsMode) => void;
  setRange: (r: PracticeRange) => void;
}

export const useElectrons = create<ElectronsState>()(
  persist(
    (set) => ({
      z: 15,
      mode: 'explore',
      range: 36,
      setZ: (z) => set({ z }),
      setMode: (mode) => set({ mode }),
      setRange: (range) => set({ range }),
    }),
    { name: 'chem3d.electrons', version: 1, storage: safeStorage },
  ),
);
