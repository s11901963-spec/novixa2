import { useState, type ReactNode } from 'react';
import {
  boxSubshellsFor,
  diagnoseBoxes,
  diagnoseDots,
  diagnoseNotation,
  dotSides,
  electronConfig,
  emptyBoxes,
  hundBoxes,
  parseConfiguration,
  configText,
  type BoxSubshell,
  type ElectronDiagnosis,
} from '../../chem/electrons';
import { getAtom } from '../../data/atoms';
import { useLang, useT } from '../../i18n';
import { useHistory } from '../../state/history';
import { Badge, Button, Card } from '../ui/controls';
import { Feedback } from '../ui/Feedback';
import { RefCite } from '../ui/RefCite';
import { ConfigKeyboard } from './ConfigKeyboard';
import { ConfigText } from './ConfigText';
import { DotSymbol } from './DotSymbol';
import { electronMessage, type ElectronTask } from './messages';
import { OrbitalBoxes } from './OrbitalBoxes';

interface TaskState {
  attempts: number;
  diag: ElectronDiagnosis | null;
  revealed: boolean;
  firstTry: boolean | null;
}
const fresh = (): TaskState => ({ attempts: 0, diag: null, revealed: false, firstTry: null });

const RULE_SOURCES: Record<ElectronTask, string[]> = {
  full: ['openstax-6-4', 'nist-asd'],
  noble: ['openstax-6-4', 'nist-asd'],
  boxes: ['openstax-6-4'],
  dots: ['openstax-7-3'],
};

function TaskCard({
  task,
  title,
  help,
  children,
  state,
  onCheck,
  onReveal,
  onClear,
  solution,
  z,
}: {
  task: ElectronTask;
  title: string;
  help: string;
  children: ReactNode;
  state: TaskState;
  onCheck: () => void;
  onReveal: () => void;
  onClear: () => void;
  solution: ReactNode;
  z: number;
}) {
  const t = useT();
  return (
    <Card className="flex flex-col gap-3 p-4" as="article">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">{title}</h3>
        {state.firstTry !== null && <Badge tone={state.firstTry ? 'ok' : 'warn'}>{state.firstTry ? t('ec.practice.firstTry') : t('ec.practice.attempts', { n: state.attempts })}</Badge>}
      </div>
      <p className="text-sm text-muted">{help}</p>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCheck} data-testid={`ec-check-${task}`}>
          {t('ec.practice.check')}
        </Button>
        <Button variant="secondary" onClick={onClear}>
          {t('ec.practice.clear')}
        </Button>
        <Button variant="ghost" onClick={onReveal} data-testid={`ec-reveal-${task}`}>
          {t('ec.practice.reveal')}
        </Button>
      </div>
      {state.diag && (
        <div data-testid={`ec-feedback-${task}`} data-correct={state.diag.correct} data-code={state.diag.code}>
          <Feedback correct={state.diag.correct} message={electronMessage(t, state.diag, z, task)} rule={state.diag.correct ? t(`ec.rule.${task}`) : undefined}>
            <div className="mt-1.5 text-xs text-muted">
              {t('common.sources')}: <RefCite ids={RULE_SOURCES[task]} />
            </div>
          </Feedback>
        </div>
      )}
      {state.revealed && (
        <div className="rounded-xl border border-ok/40 bg-ok-soft/50 p-3 text-sm" data-testid={`ec-solution-${task}`}>
          <div className="mb-1 font-semibold">{t('ec.practice.solution')}</div>
          {solution}
        </div>
      )}
    </Card>
  );
}

/** Four practice tasks for one element; every answer is checked by chem/electrons. */
export function ElectronPractice({ z }: { z: number }) {
  const t = useT();
  const lang = useLang();
  const addPractice = useHistory((s) => s.addPractice);
  const atom = getAtom(z);
  const c = electronConfig(z);
  const boxList = boxSubshellsFor(z, true);

  const [full, setFull] = useState('');
  const [noble, setNoble] = useState('');
  const [boxes, setBoxes] = useState<BoxSubshell[]>(() => emptyBoxes(boxList));
  const [sides, setSides] = useState<number[]>([0, 0, 0, 0]);
  const [st, setSt] = useState<Record<ElectronTask, TaskState>>({ full: fresh(), noble: fresh(), boxes: fresh(), dots: fresh() });

  const record = (task: ElectronTask, d: ElectronDiagnosis, answer: string) => {
    setSt((s) => {
      const prev = s[task];
      const attempts = prev.attempts + 1;
      const firstTry = prev.firstTry ?? (d.correct && !prev.revealed ? attempts === 1 : d.correct ? false : null);
      return { ...s, [task]: { ...prev, attempts, diag: d, firstTry } };
    });
    addPractice({ formula: atom.symbol, step: `ec-${task}`, answer, correct: d.correct, code: d.code });
  };

  const preview = (text: string) => {
    if (!text.trim()) return null;
    const p = parseConfiguration(text);
    if (!p.ok) return null;
    return <ConfigText terms={p.value.terms} core={p.value.core?.symbol} />;
  };

  const boxesText = (b: BoxSubshell[]) =>
    b
      .filter((s) => s.orbitals.some((o) => o[0] || o[1]))
      .map((s) => `${s.label}:${s.orbitals.map((o) => `${o[0] === 'up' ? '↑' : o[0] === 'down' ? '↓' : ''}${o[1] === 'up' ? '↑' : o[1] === 'down' ? '↓' : ''}` || '·').join('|')}`)
      .join(' ');

  const solved = (['full', 'noble', 'boxes', 'dots'] as ElectronTask[]).filter((k) => (k !== 'dots' || c.dots.applicable) && st[k].diag?.correct);
  const total = c.dots.applicable ? 4 : 3;

  return (
    <div className="flex flex-col gap-4" data-testid="electron-practice" data-z={z}>
      <p className="text-sm text-muted">{t('ec.practice.progress', { n: solved.length, total })}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <TaskCard
          task="full"
          z={z}
          title={t('ec.practice.full.label')}
          help={t('ec.practice.full.hint')}
          state={st.full}
          onCheck={() => full.trim() && record('full', diagnoseNotation(z, full, 'full'), full)}
          onReveal={() => setSt((s) => ({ ...s, full: { ...s.full, revealed: true } }))}
          onClear={() => {
            setFull('');
            setSt((s) => ({ ...s, full: { ...s.full, diag: null } }));
          }}
          solution={<ConfigText terms={c.terms} className="text-base" />}
        >
          <input
            dir="ltr"
            value={full}
            onChange={(e) => setFull(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && full.trim() && record('full', diagnoseNotation(z, full, 'full'), full)}
            placeholder="1s2 2s2 2p6 …"
            aria-label={t('ec.practice.full.label')}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-base"
            data-testid="ec-input-full"
          />
          {preview(full) && (
            <p className="text-sm text-muted">
              {t('ec.practice.preview')} {preview(full)}
            </p>
          )}
          <p className="text-xs text-muted">{t('ec.kbd.help')}</p>
          <ConfigKeyboard value={full} onChange={setFull} mode="full" testId="ec-kbd-full" />
        </TaskCard>

        <TaskCard
          task="noble"
          z={z}
          title={t('ec.practice.noble.label')}
          help={c.core ? t('ec.practice.noble.hint') : t('ec.practice.noble.hintNoCore', { symbol: atom.symbol })}
          state={st.noble}
          onCheck={() => noble.trim() && record('noble', diagnoseNotation(z, noble, 'noble'), noble)}
          onReveal={() => setSt((s) => ({ ...s, noble: { ...s.noble, revealed: true } }))}
          onClear={() => {
            setNoble('');
            setSt((s) => ({ ...s, noble: { ...s.noble, diag: null } }));
          }}
          solution={<ConfigText terms={c.core ? c.outerTerms : c.terms} core={c.core?.symbol} className="text-base" />}
        >
          <input
            dir="ltr"
            value={noble}
            onChange={(e) => setNoble(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && noble.trim() && record('noble', diagnoseNotation(z, noble, 'noble'), noble)}
            placeholder="[Ne] 3s2 …"
            aria-label={t('ec.practice.noble.label')}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-base"
            data-testid="ec-input-noble"
          />
          {preview(noble) && (
            <p className="text-sm text-muted">
              {t('ec.practice.preview')} {preview(noble)}
            </p>
          )}
          <ConfigKeyboard value={noble} onChange={setNoble} mode="noble" testId="ec-kbd-noble" />
        </TaskCard>

        <TaskCard
          task="boxes"
          z={z}
          title={t('ec.practice.boxes.label')}
          help={t('ec.practice.boxes.help')}
          state={st.boxes}
          onCheck={() => record('boxes', diagnoseBoxes(z, boxes), boxesText(boxes))}
          onReveal={() => setSt((s) => ({ ...s, boxes: { ...s.boxes, revealed: true } }))}
          onClear={() => {
            setBoxes(emptyBoxes(boxList));
            setSt((s) => ({ ...s, boxes: { ...s.boxes, diag: null } }));
          }}
          solution={<OrbitalBoxes boxes={hundBoxes(c.terms, boxList)} ariaLabel={t('ec.rep.boxes')} size="sm" />}
        >
          <OrbitalBoxes
            boxes={boxes}
            onChange={(b) => {
              setBoxes(b);
              setSt((s) => ({ ...s, boxes: { ...s.boxes, diag: null } }));
            }}
            highlight={st.boxes.diag && !st.boxes.diag.correct ? String(st.boxes.diag.params.label ?? '') : null}
            ariaLabel={t('ec.practice.boxes.label')}
          />
        </TaskCard>

        {c.dots.applicable ? (
          <TaskCard
            task="dots"
            z={z}
            title={t('ec.practice.dots.label')}
            help={t('ec.practice.dots.help')}
            state={st.dots}
            onCheck={() => record('dots', diagnoseDots(z, sides), sides.join(','))}
            onReveal={() => setSt((s) => ({ ...s, dots: { ...s.dots, revealed: true } }))}
            onClear={() => {
              setSides([0, 0, 0, 0]);
              setSt((s) => ({ ...s, dots: { ...s.dots, diag: null } }));
            }}
            solution={
              <div className="flex items-center gap-3">
                <DotSymbol symbol={atom.symbol} sides={dotSides(c.dots.count, z === 2)} size={96} ariaLabel={t('ec.rep.dots')} />
                <span>{t('ec.rep.dots.count', { terms: `⁦${configText(c.dots.terms)}⁩`, n: c.dots.count })}</span>
              </div>
            }
          >
            <div className="flex justify-center">
              <DotSymbol
                symbol={atom.symbol}
                sides={sides}
                onChange={(s) => {
                  setSides(s);
                  setSt((x) => ({ ...x, dots: { ...x.dots, diag: null } }));
                }}
                size={150}
                ariaLabel={t('ec.practice.dots.label')}
              />
            </div>
          </TaskCard>
        ) : (
          <Card className="p-4 text-sm text-muted" as="article">
            <h3 className="mb-1 text-base font-bold text-fg">{t('ec.practice.dots.label')}</h3>
            {t('ec.rep.dots.na', { name: atom.name[lang] })}
          </Card>
        )}
      </div>
    </div>
  );
}
