import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MoleculeSpec } from '../chem/types';
import type { GeometryMode } from '../chem/geometry';
import { safeStorage } from './storage';

export type LabSource = { kind: 'library'; id: string } | { kind: 'builder'; spec: MoleculeSpec };
export type ViewMode = 'lewis' | 'vsepr' | 'shape';
export type LabTab = 'solution' | 'atom' | 'builder' | 'notes';
export type CameraPreset = 'reset' | 'front' | 'top' | 'side';

interface LabState {
  source: LabSource;
  viewMode: ViewMode;
  geometryMode: GeometryMode;
  selectedAtom: number | null;
  tab: LabTab;
  solveMode: boolean;
  /** Changes whenever the practice must restart (new molecule, explicit restart). */
  practiceKey: number;
  shapeRevealed: boolean;
  camera: { preset: CameraPreset; nonce: number };
  whyOpen: boolean;
  openMolecule: (id: string) => void;
  setBuilderSpec: (spec: MoleculeSpec) => void;
  setViewMode: (m: ViewMode) => void;
  setGeometryMode: (m: GeometryMode) => void;
  selectAtom: (i: number | null) => void;
  setTab: (t: LabTab) => void;
  setSolveMode: (v: boolean) => void;
  restartPractice: () => void;
  revealShape: () => void;
  cameraTo: (p: CameraPreset) => void;
  setWhyOpen: (v: boolean) => void;
}

export const useLab = create<LabState>()(
  persist(
    (set) => ({
      source: { kind: 'library', id: 'nh3' },
      viewMode: 'shape',
      geometryMode: 'experimental',
      selectedAtom: null,
      tab: 'solution',
      solveMode: false,
      practiceKey: 0,
      shapeRevealed: false,
      camera: { preset: 'reset', nonce: 0 },
      whyOpen: false,
      openMolecule: (id) =>
        set((s) => ({
          source: { kind: 'library', id },
          selectedAtom: null,
          practiceKey: s.practiceKey + 1,
          shapeRevealed: false,
          whyOpen: false,
          camera: { preset: 'reset', nonce: s.camera.nonce + 1 },
          tab: s.tab === 'builder' ? 'solution' : s.tab,
        })),
      setBuilderSpec: (spec) =>
        set((s) => ({
          source: { kind: 'builder', spec },
          selectedAtom: null,
          practiceKey: s.practiceKey + 1,
          shapeRevealed: false,
          whyOpen: false,
        })),
      setViewMode: (viewMode) => set({ viewMode }),
      setGeometryMode: (geometryMode) => set({ geometryMode }),
      selectAtom: (selectedAtom) => set((s) => ({ selectedAtom, tab: selectedAtom === null ? s.tab : 'atom' })),
      setTab: (tab) => set({ tab }),
      setSolveMode: (solveMode) => set((s) => ({ solveMode, practiceKey: s.practiceKey + 1, shapeRevealed: false })),
      restartPractice: () => set((s) => ({ practiceKey: s.practiceKey + 1, shapeRevealed: false })),
      revealShape: () => set({ shapeRevealed: true }),
      cameraTo: (preset) => set((s) => ({ camera: { preset, nonce: s.camera.nonce + 1 } })),
      setWhyOpen: (whyOpen) => set({ whyOpen }),
    }),
    {
      name: 'chem3d.lab',
      version: 1,
      storage: safeStorage,
      partialize: ({ source, viewMode, geometryMode }) => ({ source, viewMode, geometryMode }),
    },
  ),
);
