import { useCallback } from 'react';
import { cue, type Cue } from '../../lib/sound';
import { useSettings } from '../../state/settings';

/** Plays a feedback cue (tone, then the verdict spoken) with the student's sound settings. */
export function useCue() {
  const sound = useSettings((s) => s.sound);
  const voice = useSettings((s) => s.voice);
  const lang = useSettings((s) => s.lang);
  return useCallback((kind: Cue, text?: string | false) => cue(kind, { sound, voice, lang, text }), [sound, voice, lang]);
}
