// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cue, installAudioUnlock, SPOKEN, TONES } from '../sound';

// Minimal stand-ins for the Web Audio and Web Speech APIs (jsdom has neither).
const started: number[] = [];
class FakeParam {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  type = '';
  connect(n: unknown) {
    return n;
  }
  start() {
    started.push(this.frequency.value);
  }
  stop() {}
}
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createOscillator() {
    return new FakeNode();
  }
  createGain() {
    return new FakeNode();
  }
  resume() {
    return Promise.resolve();
  }
}
const spoken: { text: string; lang: string }[] = [];
let voiceList: { lang: string }[] = [];

beforeAll(() => {
  Object.assign(window, {
    AudioContext: FakeAudioContext,
    SpeechSynthesisUtterance: class {
      lang = '';
      voice: unknown = null;
      constructor(public text: string) {}
    },
    speechSynthesis: {
      getVoices: () => voiceList,
      addEventListener: () => {},
      cancel: () => {},
      speak: (u: { text: string; lang: string }) => u.text && spoken.push({ text: u.text, lang: u.lang }),
    },
  });
  (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance;
});

beforeEach(() => {
  started.length = 0;
  spoken.length = 0;
  voiceList = [];
  installAudioUnlock();
});

describe('feedback sounds', () => {
  it('plays the chime and says «إجابة صحيحة» for a right answer', () => {
    const events: unknown[] = [];
    window.addEventListener('chem3d:cue', (e) => events.push((e as CustomEvent).detail), { once: true });
    cue('correct', { sound: true, voice: true, lang: 'ar' });
    expect(started).toEqual(TONES.correct.map((t) => t[0]));
    expect(spoken).toEqual([{ text: 'إجابة صحيحة', lang: 'ar-SA' }]);
    expect(events).toEqual([{ kind: 'correct', text: 'إجابة صحيحة' }]);
  });

  it('plays a different, lower sound for a wrong answer and says so', () => {
    cue('wrong', { sound: true, voice: true, lang: 'ar' });
    expect(started).toEqual(TONES.wrong.map((t) => t[0]));
    expect(Math.max(...started)).toBeLessThan(Math.min(...TONES.correct.map((t) => t[0])));
    expect(spoken[0].text).toBe(SPOKEN.ar.wrong);
  });

  it('stays silent when sounds are off, and only plays the tone when the voice is off', () => {
    cue('correct', { sound: false, voice: true, lang: 'ar' });
    expect(started).toEqual([]);
    expect(spoken).toEqual([]);
    cue('attention', { sound: true, voice: false, lang: 'ar', text: 'انتبه' });
    expect(started).toEqual(TONES.attention.map((t) => t[0]));
    expect(spoken).toEqual([]);
  });

  it('uses the device’s Arabic voice, and keeps to the tone when it has none', () => {
    voiceList = [{ lang: 'en-US' }, { lang: 'ar-SA' }];
    installAudioUnlock();
    cue('correct', { sound: true, voice: true, lang: 'ar' });
    expect(spoken).toEqual([{ text: 'إجابة صحيحة', lang: 'ar-SA' }]);
    voiceList = [{ lang: 'en-US' }];
    installAudioUnlock();
    spoken.length = 0;
    cue('correct', { sound: true, voice: true, lang: 'ar' });
    expect(spoken).toEqual([]);
    cue('correct', { sound: true, voice: true, lang: 'en' });
    expect(spoken).toEqual([{ text: 'Correct answer', lang: 'en-US' }]);
  });
});
