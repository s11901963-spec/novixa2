import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';

export interface ChallengeQuestionRecord {
  prompt: string;
  answer: string;
  correct: boolean;
  attempts: number;
  hints: number;
  points: number;
}

export interface ChallengeSession {
  id: string;
  level: 1 | 2 | 3;
  /** Missing in sessions saved before topics existed (they were all molecular shapes). */
  topic?: 'shapes' | 'electrons';
  seed: number;
  startedAt: number;
  finishedAt: number;
  score: number;
  maxScore: number;
  firstTryCorrect: number;
  total: number;
  questions: ChallengeQuestionRecord[];
}

export interface PracticeEntry {
  id: string;
  at: number;
  formula: string;
  step: string;
  answer: string;
  correct: boolean;
  code: string;
}

export interface PredictRound {
  id: string;
  at: number;
  formula: string;
  score: number;
  egCorrect: boolean;
  mgCorrect: boolean;
  angleCorrect: boolean;
}

interface HistoryState {
  sessions: ChallengeSession[];
  practice: PracticeEntry[];
  predictions: PredictRound[];
  addSession: (s: ChallengeSession) => void;
  addPractice: (p: Omit<PracticeEntry, 'id' | 'at'>) => void;
  addPrediction: (p: Omit<PredictRound, 'id' | 'at'>) => void;
  clear: () => void;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      sessions: [],
      practice: [],
      predictions: [],
      addSession: (s) => set((st) => ({ sessions: [s, ...st.sessions].slice(0, 100) })),
      addPractice: (p) => set((st) => ({ practice: [{ ...p, id: uid(), at: Date.now() }, ...st.practice].slice(0, 300) })),
      addPrediction: (p) => set((st) => ({ predictions: [{ ...p, id: uid(), at: Date.now() }, ...st.predictions].slice(0, 200) })),
      clear: () => set({ sessions: [], practice: [], predictions: [] }),
    }),
    { name: 'chem3d.history', version: 1, storage: safeStorage },
  ),
);

export { uid };
