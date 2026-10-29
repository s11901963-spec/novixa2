import { AnglePanel } from '../components/lab/AnglePanel';
import { AtomInfoPanel } from '../components/lab/AtomInfoPanel';
import { BuilderPanel } from '../components/lab/BuilderPanel';
import { LabViewport } from '../components/lab/LabViewport';
import { MoleculePicker } from '../components/lab/MoleculePicker';
import { NotesPanel } from '../components/lab/NotesPanel';
import { PracticePanel, SolutionPanel } from '../components/lab/SolutionPanel';
import { useLabModel } from '../components/lab/useLabModel';
import { useT } from '../i18n';
import { useLab, type LabTab } from '../state/lab';

const TABS: { id: LabTab; icon: string; key: 'lab.tab.practice' | 'lab.tab.angle' | 'lab.tab.solution' | 'lab.tab.atom' | 'lab.tab.builder' | 'lab.tab.notes'; own?: boolean }[] = [
  { id: 'practice', icon: '✍️', key: 'lab.tab.practice', own: true },
  { id: 'angle', icon: '📐', key: 'lab.tab.angle', own: true },
  { id: 'solution', icon: '📘', key: 'lab.tab.solution' },
  { id: 'atom', icon: '⚛', key: 'lab.tab.atom' },
  { id: 'builder', icon: '🧩', key: 'lab.tab.builder' },
  { id: 'notes', icon: 'ℹ', key: 'lab.tab.notes' },
];

/** Activity tabs. "Solve it yourself" and "Change the angle" come first and stand out. */
function TabBar({ className = '', prefix = 'tab' }: { className?: string; prefix?: string }) {
  const t = useT();
  const tab = useLab((s) => s.tab);
  const setTab = useLab((s) => s.setTab);
  return (
    <div role="tablist" aria-label={t('lab.title')} className={`scroll-thin flex gap-1 overflow-x-auto p-1.5 ${className}`}>
      {TABS.map((tb) => {
        const active = tab === tb.id;
        return (
          <button
            key={tb.id}
            role="tab"
            id={`${prefix}-${tb.id}`}
            aria-selected={active}
            aria-controls={`panel-${tb.id}`}
            onClick={() => setTab(tb.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors pointer-coarse:min-h-11 ${
              active
                ? tb.own
                  ? 'bg-accent text-accent-fg shadow-sm'
                  : 'bg-accent-soft text-accent'
                : tb.own
                  ? 'border border-accent/40 bg-accent-soft/50 text-accent hover:bg-accent-soft'
                  : 'text-muted hover:bg-surface-2 hover:text-fg'
            }`}
            data-testid={`${prefix}-${tb.id}`}
          >
            <span aria-hidden>{tb.icon}</span>
            {t(tb.key)}
          </button>
        );
      })}
    </div>
  );
}

export function LabPage() {
  const t = useT();
  const model = useLabModel();
  const tab = useLab((s) => s.tab);
  return (
    <div className="gutter mx-auto flex w-full max-w-[1600px] flex-col gap-3 py-3 lg:grid lg:h-[calc(100dvh-var(--header-h)-var(--footer-h))] lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:grid-rows-[auto_minmax(0,1fr)]">
      <div className="min-w-0 lg:col-span-2">
        <MoleculePicker model={model} />
      </div>
      {/* On phones the activities sit above the 3D view so they are the first thing seen. */}
      <TabBar className="rounded-2xl border border-line bg-surface lg:hidden" prefix="mtab" />
      <LabViewport model={model} />
      <aside className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface" aria-label={t('lab.tab.practice')}>
        <TabBar className="hidden border-b border-line lg:flex" />
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3.5">
          {/* Practice and angle panels stay mounted so progress is kept when switching tabs. */}
          <div hidden={tab !== 'practice'}>
            <PracticePanel model={model} />
          </div>
          <div hidden={tab !== 'angle'}>
            <AnglePanel key={model.specKey} model={model} />
          </div>
          {tab === 'solution' && <SolutionPanel model={model} />}
          {tab === 'atom' && <AtomInfoPanel model={model} />}
          {tab === 'builder' && <BuilderPanel model={model} />}
          {tab === 'notes' && <NotesPanel model={model} />}
        </div>
      </aside>
    </div>
  );
}
