import { AtomInfoPanel } from '../components/lab/AtomInfoPanel';
import { BuilderPanel } from '../components/lab/BuilderPanel';
import { LabViewport } from '../components/lab/LabViewport';
import { MoleculePicker } from '../components/lab/MoleculePicker';
import { NotesPanel } from '../components/lab/NotesPanel';
import { SolutionPanel } from '../components/lab/SolutionPanel';
import { useLabModel } from '../components/lab/useLabModel';
import { useT } from '../i18n';
import { useLab, type LabTab } from '../state/lab';

export function LabPage() {
  const t = useT();
  const model = useLabModel();
  const tab = useLab((s) => s.tab);
  const setTab = useLab((s) => s.setTab);
  const tabs: { id: LabTab; label: string }[] = [
    { id: 'solution', label: t('lab.tab.solution') },
    { id: 'atom', label: t('lab.tab.atom') },
    { id: 'builder', label: t('lab.tab.builder') },
    { id: 'notes', label: t('lab.tab.notes') },
  ];
  return (
    <div className="gutter mx-auto flex w-full max-w-[1600px] flex-col gap-3 py-3 lg:grid lg:h-[calc(100dvh-var(--header-h)-var(--footer-h))] lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:grid-rows-[auto_minmax(0,1fr)]">
      <div className="min-w-0 lg:col-span-2">
        <MoleculePicker model={model} />
      </div>
      <LabViewport model={model} />
      <aside className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface" aria-label={t('lab.tab.solution')}>
        <div role="tablist" aria-label={t('lab.title')} className="flex gap-1 overflow-x-auto border-b border-line p-1.5">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              role="tab"
              id={`tab-${tb.id}`}
              aria-selected={tab === tb.id}
              aria-controls={`panel-${tb.id}`}
              onClick={() => setTab(tb.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${tab === tb.id ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}
              data-testid={`tab-${tb.id}`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3.5">
          {tab === 'solution' && <SolutionPanel model={model} />}
          {tab === 'atom' && <AtomInfoPanel model={model} />}
          {tab === 'builder' && <BuilderPanel model={model} />}
          {tab === 'notes' && <NotesPanel model={model} />}
        </div>
      </aside>
    </div>
  );
}
