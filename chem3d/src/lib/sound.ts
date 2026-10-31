import type { Lang } from '../state/settings';

/**
 * Feedback sounds: short tones made with the Web Audio API (no sound files) and the verdict spoken by
 * the device's own voice (Web Speech API) when it has one for the language. Browsers start audio
 * only after a touch or click, so the first one unlocks it (installAudioUnlock).
 */
export type Cue = 'correct' | 'wrong' | 'attention';

export const SPOKEN: Record<Lang, Record<Cue, string>> = {
  ar: { correct: 'إجابة صحيحة', wrong: 'إجابة غير صحيحة، حاول مرة أخرى', attention: 'انتبه' },
  en: { correct: 'Correct answer', wrong: 'Not correct, try again', attention: 'Attention' },
};

// [frequency (Hz), start (s), length (s), wave, loudness]: a rising chime, a low double buzz, two pings.
export const TONES: Record<Cue, [number, number, number, OscillatorType, number][]> = {
  correct: [
    [1046.5, 0, 0.16, 'triangle', 0.22],
    [1318.5, 0.09, 0.18, 'triangle', 0.22],
    [1568, 0.18, 0.34, 'triangle', 0.2],
  ],
  wrong: [
    [311.1, 0, 0.2, 'square', 0.07],
    [233.1, 0.2, 0.34, 'square', 0.07],
  ],
  attention: [
    [880, 0, 0.14, 'sine', 0.2],
    [1174.7, 0.2, 0.22, 'sine', 0.2],
  ],
};

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx ??= new AC();
  } catch {
    return null;
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

function play(kind: Cue) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + 0.02;
  for (const [f, start, len, wave, loud] of TONES[kind]) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = wave;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + start);
    g.gain.exponentialRampToValueAtTime(loud, t0 + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len);
    o.connect(g).connect(a.destination);
    o.start(t0 + start);
    o.stop(t0 + start + len + 0.05);
  }
}

let voices: SpeechSynthesisVoice[] = [];
const speech = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

function say(text: string, lang: Lang) {
  const s = speech();
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') return;
  const own = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  // The device lists its voices and none speaks this language: keep the tone rather than mispronounce.
  if (voices.length && !own.length) return;
  const u = new SpeechSynthesisUtterance(text);
  const voice = own.find((v) => (lang === 'ar' ? /ar[-_]SA/i : /en[-_]US/i).test(v.lang)) ?? own[0];
  u.lang = voice?.lang ?? (lang === 'ar' ? 'ar-SA' : 'en-US');
  if (voice) u.voice = voice;
  s.cancel();
  s.speak(u);
}

/** Lets later sounds play: the first touch, click or key press starts audio and speech. */
export function installAudioUnlock() {
  if (typeof window === 'undefined') return;
  const s = speech();
  if (s) {
    const load = () => {
      voices = s.getVoices();
    };
    load();
    s.addEventListener?.('voiceschanged', load);
  }
  const unlock = () => {
    audio();
    // iOS only speaks after an utterance started by a gesture; an empty one is enough.
    if (s && typeof SpeechSynthesisUtterance !== 'undefined') s.speak(new SpeechSynthesisUtterance(''));
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

export interface CueOptions {
  sound: boolean;
  voice: boolean;
  lang: Lang;
  /** What to say instead of the usual phrase; false for the tone alone. */
  text?: string | false;
}

/** The tone for a verdict, then the verdict spoken, following the sound settings. */
export function cue(kind: Cue, o: CueOptions) {
  if (!o.sound) return;
  const text = o.text === false || !o.voice ? '' : (o.text ?? SPOKEN[o.lang][kind]);
  play(kind);
  if (text) say(text, o.lang);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('chem3d:cue', { detail: { kind, text } }));
}
