import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSceneModel } from '../chem/geometry';
import { generateSession, isCorrect, scoreFor, analysisOf, type Level, type Question } from '../chem/questions';
import { randomSeed } from '../chem/random';
import { answerText, promptText, renderLabel } from '../components/challenge/render';
import { diagnosisMessage } from '../components/lab/messages';
import { Badge, Button, Card } from '../components/ui/controls';
import { Feedback } from '../components/ui/Feedback';
import { RefCite } from '../components/ui/RefCite';
import { MoleculeViewer } from '../components/viewer/MoleculeViewer';
import { dataset, getElement } from '../data';
import { isKey, useLang, useT } from '../i18n';
import { useHistory, uid, type ChallengeQuestionRecord } from '../state/history';

const MAX_ATTEMPTS = 3;
const COUNT = 8;

interface QState {
  attempts: number;
  hintUsed: boolean;
  solved: boolean;
  failed: boolean;
  points: number;
  feedback?: { correct: boolean; message: string };
}

function MiniViewer({ moleculeId, mystery = false }: { moleculeId: string; mystery?: boolean }) {
  const t = useT();
  const m = dataset.moleculesById.get(moleculeId)!;
  const scene = useMemo(() => buildSceneModel(analysisOf(m), { mode: m.experimental ? 'experimental' : 'ideal', experimental: m.experimental }), [m]);
  return (
    <MoleculeViewer
      className="relative h-64 w-full rounded-xl sm:h-72"
      scene={scene}
      mode="shape"
      mystery={mystery}
      display={{ angles: !mystery, lonePairs: true, autoRotate: false }}
      moleculeKey={moleculeId}
      ariaLabel={t('ch.viewer3d')}
    />
  );
}

function QuestionCard({ q, index, total, state, onUpdate, onNext, isLast }: { q: Question; index: number; total: number; state: QState; onUpdate: (s: QState) => void; onNext: () => void; isLast: boolean }) {
  const t = useT();
  const lang = useLang();
  const [draft, setDraft] = useState<string>('');
  const [multi, setMulti] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const done = state.solved || state.failed;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft('');
    setMulti([]);
    setShowHint(false);
    if (q.kind === 'number') inputRef.current?.focus({ preventScroll: true });
  }, [q.uid, q.kind]);

  const submit = () => {
    const answer = q.kind === 'multi' ? multi : draft;
    if ((q.kind === 'multi' && multi.length === 0) || (q.kind !== 'multi' && draft === '')) return;
    const ok = isCorrect(q, answer);
    const attempts = state.attempts + 1;
    let message = '';
    if (!ok) {
      if (q.diagnose && q.moleculeId) {
        const d = q.diagnose(String(answer));
        message = diagnosisMessage(t, d, analysisOf(dataset.moleculesById.get(q.moleculeId)!));
      } else if (q.type === 'element-valence') {
        message = elementValenceMessage(Number(answer), String(q.prompt.params.element));
      } else if (q.type === 'ideal-angle') {
        message = t('ch.idealAngleWrong');
      } else if (q.kind === 'multi') {
        const correctSet = new Set(q.answer as string[]);
        const extra = multi.filter((x) => !correctSet.has(x)).length;
        const missing = [...correctSet].filter((x) => !multi.includes(x)).length;
        message = t('ch.multiWrong', { extra, missing });
      } else {
        message = t('ch.tryAgain');
      }
    }
    if (ok) {
      onUpdate({ ...state, attempts, solved: true, points: scoreFor(q, attempts, state.hintUsed), feedback: { correct: true, message } });
    } else {
      onUpdate({ ...state, attempts, failed: attempts >= MAX_ATTEMPTS, feedback: { correct: false, message } });
    }
  };

  const explanation = q.explanation && isKey(q.explanation.key) ? t(q.explanation.key, q.explanation.params) : '';

  function elementValenceMessage(n: number, symbol: string): string {
    const e = getElement(symbol);
    if (n === e.atomicNumber) return t('ch.ev.atomicNumber');
    if (e.group >= 13 && n === e.group) return t('ch.ev.groupNumber', { group: e.group });
    if (n === 8 - e.valenceElectrons) return t('ch.ev.bondsNeeded');
    return t('ch.hint.valence');
  }

  return (
    <Card className="p-4 sm:p-5" as="article">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{t('ch.progress', { i: index + 1, n: total })}</span>
        <span className="flex items-center gap-2">
          <Badge tone="accent">
            {q.points} {t('common.points')}
          </Badge>
          {!done && <span>{t('ch.attemptsLeft', { n: MAX_ATTEMPTS - state.attempts })}</span>}
        </span>
      </div>
      <h2 className="text-lg leading-8 font-semibold" style={{ fontFamily: 'var(--font-body)' }} data-testid="question-prompt">
        {promptText(q, t, lang)}
      </h2>
      {q.kind === 'multi' && <p className="mt-1 text-sm text-muted">{t('ch.selectAll')}</p>}

      {q.show3dFirst && q.moleculeId && (
        <div className="mt-3">
          <MiniViewer moleculeId={q.moleculeId} />
        </div>
      )}

      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!done) submit();
        }}
      >
        {q.kind === 'number' && (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step="any"
            dir="ltr"
            disabled={done}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('common.enterNumber')}
            aria-label={promptText(q, t, lang)}
            className="w-40 rounded-lg border border-line bg-surface px-3 py-2 text-base tabular"
            data-testid="answer-number"
          />
        )}
        {q.kind !== 'number' && (
          <div role={q.kind === 'single' ? 'radiogroup' : 'group'} aria-label={promptText(q, t, lang)} className="grid gap-2 sm:grid-cols-2">
            {q.options!.map((o) => {
              const selected = q.kind === 'multi' ? multi.includes(o.id) : draft === o.id;
              const isAnswer = Array.isArray(q.answer) ? q.answer.includes(o.id) : q.answer === o.id;
              const reveal = done && isAnswer;
              return (
                <button
                  key={o.id}
                  type="button"
                  role={q.kind === 'single' ? 'radio' : 'checkbox'}
                  aria-checked={selected}
                  disabled={done}
                  onClick={() => (q.kind === 'multi' ? setMulti((m) => (m.includes(o.id) ? m.filter((x) => x !== o.id) : [...m, o.id])) : setDraft(o.id))}
                  className={`rounded-xl border px-3 py-2.5 text-start text-sm leading-6 transition-colors ${
                    reveal ? 'border-ok bg-ok-soft' : selected ? 'border-accent bg-accent-soft font-semibold' : 'border-line bg-surface hover:bg-surface-2'
                  } disabled:cursor-default`}
                  data-testid={`option-${o.id}`}
                >
                  {q.kind === 'multi' && <span aria-hidden className="me-2">{selected ? '☑' : '☐'}</span>}
                  {renderLabel(o.label, t)}
                </button>
              );
            })}
          </div>
        )}
        {!done && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" data-testid="submit-answer">
              {t('ch.submit')}
            </Button>
            {!state.hintUsed && (
              <Button
                variant="ghost"
                onClick={() => {
                  setShowHint(true);
                  onUpdate({ ...state, hintUsed: true });
                }}
              >
                {t('ch.hintCost', { n: Math.round(q.points * 0.3) })}
              </Button>
            )}
          </div>
        )}
      </form>

      {(showHint || state.hintUsed) && !done && isKey(q.hintKey) && <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">💡 {t(q.hintKey)}</p>}

      {state.feedback && (
        <div className="mt-4">
          <Feedback
            correct={state.feedback.correct}
            message={
              state.feedback.correct ? (
                <span className="font-semibold">{t('ch.earned', { n: state.points })}</span>
              ) : state.failed ? (
                <span>
                  {state.feedback.message && <span className="block">{state.feedback.message}</span>}
                  <span className="mt-1 block font-semibold">{t('ch.outOfAttempts', { answer: answerText(q, t) })}</span>
                </span>
              ) : (
                state.feedback.message || t('ch.tryAgain')
              )
            }
            rule={done && explanation ? explanation : undefined}
          >
            {done && q.sources && q.sources.length > 0 && (
              <div className="mt-1.5 text-xs text-muted">
                {t('common.sources')}: <RefCite ids={q.sources} />
              </div>
            )}
          </Feedback>
        </div>
      )}

      {done && q.moleculeId && !q.show3dFirst && (
        <div className="mt-4">
          <MiniViewer moleculeId={q.moleculeId} />
        </div>
      )}

      {done && (
        <div className="mt-4">
          <Button onClick={onNext} data-testid="next-question">
            {isLast ? t('ch.finish') : t('ch.nextQ')}
          </Button>
        </div>
      )}
    </Card>
  );
}

function formatTime(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ChallengesPage() {
  const t = useT();
  const lang = useLang();
  const sessions = useHistory((s) => s.sessions);
  const addSession = useHistory((s) => s.addSession);
  const [run, setRun] = useState<{ level: Level; seed: number; questions: Question[]; startedAt: number } | null>(null);
  const [states, setStates] = useState<QState[]>([]);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState<{ at: number } | null>(null);

  const start = (level: Level) => {
    const seed = randomSeed();
    const questions = generateSession(level, seed, COUNT);
    setRun({ level, seed, questions, startedAt: Date.now() });
    setStates(questions.map(() => ({ attempts: 0, hintUsed: false, solved: false, failed: false, points: 0 })));
    setIndex(0);
    setFinished(null);
    window.scrollTo({ top: 0 });
  };

  const finish = () => {
    if (!run) return;
    const at = Date.now();
    setFinished({ at });
    const records: ChallengeQuestionRecord[] = run.questions.map((q, i) => ({
      prompt: promptText(q, t, lang),
      answer: answerText(q, t),
      correct: states[i].solved,
      attempts: states[i].attempts,
      hints: states[i].hintUsed ? 1 : 0,
      points: states[i].points,
    }));
    addSession({
      id: uid(),
      level: run.level,
      seed: run.seed,
      startedAt: run.startedAt,
      finishedAt: at,
      score: states.reduce((s, x) => s + x.points, 0),
      maxScore: run.questions.reduce((s, q) => s + q.points, 0),
      firstTryCorrect: states.filter((x) => x.solved && x.attempts === 1).length,
      total: run.questions.length,
      questions: records,
    });
  };

  if (!run) {
    return (
      <div className="gutter mx-auto max-w-5xl py-6">
        <h1 className="text-2xl font-bold">{t('ch.title')}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t('ch.intro')}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {([1, 2, 3] as Level[]).map((level) => {
            const best = sessions.filter((s) => s.level === level).reduce<number | null>((b, s) => (b === null || s.score > b ? s.score : b), null);
            return (
              <Card key={level} className="flex flex-col gap-3 p-5" as="article">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{t(`ch.level.${level}`)}</h2>
                  <Badge tone={level === 1 ? 'ok' : level === 2 ? 'accent' : 'lp'}>{t('ch.questions', { n: COUNT })}</Badge>
                </div>
                <p className="flex-1 text-sm text-muted">{t(`ch.level.${level}.desc`)}</p>
                {best !== null && <p className="text-sm">{t('ch.best', { score: best })}</p>}
                <Button onClick={() => start(level)} data-testid={`start-level-${level}`}>
                  {t('ch.start')}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const score = states.reduce((s, x) => s + x.points, 0);
  const max = run.questions.reduce((s, q) => s + q.points, 0);

  if (finished) {
    const firstTry = states.filter((x) => x.solved && x.attempts === 1).length;
    return (
      <div className="gutter mx-auto max-w-3xl py-6" data-testid="challenge-result">
        <Card className="p-5">
          <h1 className="text-2xl font-bold">{t('ch.result.title')}</h1>
          <p className="mt-1 text-muted">{t(`ch.level.${run.level}`)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-accent-soft p-3">
              <div className="text-sm text-muted">{t('common.score')}</div>
              <div className="text-2xl font-bold tabular text-accent">{t('ch.result.score', { score, max })}</div>
            </div>
            <div className="rounded-xl bg-surface-2 p-3 text-sm">{t('ch.result.accuracy', { n: firstTry, total: run.questions.length })}</div>
            <div className="rounded-xl bg-surface-2 p-3 text-sm">{t('ch.result.time', { time: formatTime(finished.at - run.startedAt) })}</div>
          </div>
          <p className="mt-3 text-sm text-ok">{t('ch.result.saved')}</p>
          <h2 className="mt-5 mb-2 text-lg font-bold">{t('ch.result.review')}</h2>
          <ol className="flex flex-col gap-2">
            {run.questions.map((q, i) => (
              <li key={q.uid} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span>
                    {i + 1}. {promptText(q, t, lang)}
                  </span>
                  <span className="shrink-0">{states[i].solved ? '✅' : '❌'}</span>
                </div>
                <div className="mt-1 text-muted">
                  {t('common.expected')}: {answerText(q, t)} · {t('ch.earned', { n: states[i].points })}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => start(run.level)}>{t('ch.result.again')}</Button>
            <Button variant="secondary" onClick={() => setRun(null)}>
              {t('ch.result.levels')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const q = run.questions[index];
  return (
    <div className="gutter mx-auto max-w-3xl py-6" data-testid="challenge-run">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          {t('ch.title')} · {t(`ch.level.${run.level}`)}
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <Badge tone="accent">
            {t('common.score')}: <span className="tabular">{score}</span> / <span className="tabular">{max}</span>
          </Badge>
          <Button variant="ghost" onClick={() => setRun(null)}>
            {t('ch.quit')}
          </Button>
        </div>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={run.questions.length} aria-valuenow={index}>
        <div className="h-full bg-accent transition-all" style={{ width: `${(index / run.questions.length) * 100}%` }} />
      </div>
      <QuestionCard
        q={q}
        index={index}
        total={run.questions.length}
        state={states[index]}
        isLast={index === run.questions.length - 1}
        onUpdate={(s) => setStates((all) => all.map((x, i) => (i === index ? s : x)))}
        onNext={() => (index === run.questions.length - 1 ? finish() : setIndex(index + 1))}
      />
    </div>
  );
}
