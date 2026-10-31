import { Button, Card, Field, Segmented, ToggleChip } from '../components/ui/controls';
import { VideoHelpButton } from '../components/ui/VideoModal';
import { useT } from '../i18n';
import { cue } from '../lib/sound';
import { useSettings, type DisplayToggles } from '../state/settings';

export function PreferencesPage() {
  const t = useT();
  const s = useSettings();
  const toggles: (keyof DisplayToggles)[] = ['bonds', 'lonePairs', 'terminalLonePairs', 'bondingPairs', 'angles', 'allAngles', 'polyhedron', 'autoRotate'];
  return (
    <div className="gutter mx-auto max-w-3xl py-6" data-testid="preferences-page">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold">{t('pref.title')}</h1>
        <VideoHelpButton chapter="settings" />
      </div>
      <p className="mt-1 text-sm text-muted">{t('pref.saved')}</p>
      <Card className="mt-5 flex flex-col gap-5 p-5">
        <Field label={t('pref.language')}>
          <Segmented label={t('pref.language')} value={s.lang} onChange={s.setLang} options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} />
        </Field>
        <Field label={t('pref.theme')}>
          <Segmented
            label={t('pref.theme')}
            value={s.theme}
            onChange={s.setTheme}
            options={[
              { value: 'system', label: t('pref.theme.system') },
              { value: 'light', label: t('pref.theme.light') },
              { value: 'dark', label: t('pref.theme.dark') },
            ]}
          />
        </Field>
        <Field label={t('pref.lighting')}>
          <Segmented
            label={t('pref.lighting')}
            value={s.lighting}
            onChange={s.setLighting}
            options={[
              { value: 'studio', label: t('pref.lighting.studio') },
              { value: 'soft', label: t('pref.lighting.soft') },
              { value: 'contrast', label: t('pref.lighting.contrast') },
            ]}
          />
        </Field>
        <Field label={t('pref.render')}>
          <Segmented
            label={t('pref.render')}
            value={s.renderStyle}
            onChange={s.setRenderStyle}
            options={[
              { value: 'ball-stick', label: t('pref.render.ball-stick') },
              { value: 'space-filling', label: t('pref.render.space-filling') },
              { value: 'sticks', label: t('pref.render.sticks') },
            ]}
          />
        </Field>
        <Field label={t('pref.labels')}>
          <Segmented
            label={t('pref.labels')}
            value={s.labelMode}
            onChange={s.setLabelMode}
            options={[
              { value: 'symbol', label: t('pref.labels.symbol') },
              { value: 'name', label: t('pref.labels.name') },
              { value: 'none', label: t('pref.labels.none') },
            ]}
          />
        </Field>
        <Field label={t('pref.display')}>
          <div className="flex flex-wrap gap-1.5">
            {toggles.map((k) => (
              <ToggleChip key={k} tone="surface" pressed={s.display[k]} onToggle={() => s.toggle(k)}>
                {t(`lab.toggle.${k}`)}
              </ToggleChip>
            ))}
          </div>
        </Field>
        <Field label={t('pref.touch')}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{t('pref.textSize')}</span>
              <Segmented
                label={t('pref.textSize')}
                value={s.textSize}
                onChange={s.setTextSize}
                options={[
                  { value: 'normal', label: t('pref.textSize.normal') },
                  { value: 'large', label: t('pref.textSize.large') },
                  { value: 'xlarge', label: t('pref.textSize.xlarge') },
                ]}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={s.viewButtons} onChange={(e) => s.setViewButtons(e.target.checked)} />
              {t('pref.viewButtons')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={s.angleLive} onChange={(e) => s.setAngleLive(e.target.checked)} />
              {t('pref.angleLive')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={s.sound} onChange={(e) => s.setSound(e.target.checked)} data-testid="pref-sound" />
              {t('pref.sound')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={s.voice} disabled={!s.sound} onChange={(e) => s.setVoice(e.target.checked)} data-testid="pref-voice" />
              {t('pref.voice')}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => cue('correct', { sound: true, voice: s.voice, lang: s.lang })} data-testid="sound-test-correct">
                {t('pref.soundTest.correct')}
              </Button>
              <Button variant="secondary" onClick={() => cue('wrong', { sound: true, voice: s.voice, lang: s.lang })} data-testid="sound-test-wrong">
                {t('pref.soundTest.wrong')}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={s.haptics} onChange={(e) => s.setHaptics(e.target.checked)} />
              {t('pref.haptics')}
            </label>
          </div>
        </Field>
        <Field label={t('pref.motion')}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={s.reduceMotion} onChange={(e) => s.setReduceMotion(e.target.checked)} />
            {t('pref.motion.reduce')}
          </label>
        </Field>
        <div>
          <Button variant="secondary" onClick={s.reset}>
            {t('pref.reset')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
