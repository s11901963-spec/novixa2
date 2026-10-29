import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';

export type Lang = 'ar' | 'en';
export type ThemePref = 'system' | 'light' | 'dark';
export type Lighting = 'studio' | 'soft' | 'contrast';
export type RenderStyle = 'ball-stick' | 'space-filling' | 'sticks';
export type LabelMode = 'symbol' | 'name' | 'none';
export type TextSize = 'normal' | 'large' | 'xlarge';

export interface DisplayToggles {
  bonds: boolean;
  lonePairs: boolean;
  terminalLonePairs: boolean;
  bondingPairs: boolean;
  angles: boolean;
  allAngles: boolean;
  polyhedron: boolean;
  autoRotate: boolean;
}

interface SettingsState {
  lang: Lang;
  theme: ThemePref;
  lighting: Lighting;
  renderStyle: RenderStyle;
  labelMode: LabelMode;
  reduceMotion: boolean;
  display: DisplayToggles;
  textSize: TextSize;
  haptics: boolean;
  viewButtons: boolean;
  setLang: (l: Lang) => void;
  setTheme: (t: ThemePref) => void;
  setLighting: (l: Lighting) => void;
  setRenderStyle: (r: RenderStyle) => void;
  setLabelMode: (m: LabelMode) => void;
  setReduceMotion: (v: boolean) => void;
  setTextSize: (v: TextSize) => void;
  setHaptics: (v: boolean) => void;
  setViewButtons: (v: boolean) => void;
  toggle: (key: keyof DisplayToggles) => void;
  reset: () => void;
}

export const DEFAULT_DISPLAY: DisplayToggles = {
  bonds: true,
  lonePairs: true,
  terminalLonePairs: false,
  bondingPairs: false,
  angles: true,
  allAngles: false,
  polyhedron: false,
  autoRotate: false,
};

const defaults = {
  lang: 'ar' as Lang,
  theme: 'system' as ThemePref,
  lighting: 'studio' as Lighting,
  renderStyle: 'ball-stick' as RenderStyle,
  labelMode: 'symbol' as LabelMode,
  reduceMotion: false,
  display: DEFAULT_DISPLAY,
  textSize: 'normal' as TextSize,
  haptics: true,
  viewButtons: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setLighting: (lighting) => set({ lighting }),
      setRenderStyle: (renderStyle) => set({ renderStyle }),
      setLabelMode: (labelMode) => set({ labelMode }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setTextSize: (textSize) => set({ textSize }),
      setHaptics: (haptics) => set({ haptics }),
      setViewButtons: (viewButtons) => set({ viewButtons }),
      toggle: (key) => set((s) => ({ display: { ...s.display, [key]: !s.display[key] } })),
      reset: () => set({ ...defaults, display: { ...DEFAULT_DISPLAY } }),
    }),
    {
      name: 'chem3d.settings',
      version: 1,
      storage: safeStorage,
      partialize: ({ lang, theme, lighting, renderStyle, labelMode, reduceMotion, display, textSize, haptics, viewButtons }) => ({
        lang,
        theme,
        lighting,
        renderStyle,
        labelMode,
        reduceMotion,
        display,
        textSize,
        haptics,
        viewButtons,
      }),
    },
  ),
);
