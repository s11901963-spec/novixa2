import { useState } from 'react';
import { Badge, Button, Card } from '../components/ui/controls';
import { formulaText } from '../components/ui/Formula';
import { useLang, useT } from '../i18n';
import { useHistory } from '../state/history';

export function HistoryPage() {
  const t = useT();
  const lang = useLang();
  const { sessions, practice, predictions, clear } = useHistory();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });
  const empty = !sessions.length && !practice.length && !predictions.length;
  const firstTry = sessions.reduce((s, x) => s + x.firstTryCorrect, 0);
  const totalQ = sessions.reduce((s, x) => s + x.total, 0);
  const best = (level: 1 | 2 | 3) => {
    const xs = sessions.filter((s) => s.level === level);
    return xs.length ? Math.max(...xs.map((s) => s.score)) : null;
  };

  return (
    <div className="gutter mx-auto max-w-5xl py-6" data-testid="history-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('hist.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('hist.storageNote')}</p>
        </div>
        {!empty &&
          (confirming ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bad/40 bg-bad-soft px-3 py-2 text-sm">
              <span>{t('hist.clearConfirm')}</span>
              <Button
                variant="danger"
                onClick={() => {
                  clear();
                  setConfirming(false);
                  setCleared(true);
                }}
              >
                {t('common.confirm')}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              {t('hist.clear')}
            </Button>
          ))}
      </div>
      {cleared && empty && <p className="mt-3 text-sm text-ok">{t('hist.cleared')}</p>}
      {empty ? (
        <p className="mt-6 rounded-xl border border-dashed border-line p-6 text-center text-muted">{t('hist.empty')}</p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-sm text-muted">{t('hist.stats.sessions')}</div>
              <div className="text-2xl font-bold tabular">{sessions.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted">{t('hist.stats.best')}</div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-sm">
                {([1, 2, 3] as const).map((l) => (
                  <Badge key={l} tone={best(l) === null ? 'neutral' : 'accent'}>
                    {t(`ch.level.${l}`)}: {best(l) ?? '—'}
                  </Badge>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted">{t('hist.stats.accuracy')}</div>
              <div className="text-2xl font-bold tabular">{totalQ ? `${Math.round((firstTry / totalQ) * 100)}%` : '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted">{t('hist.stats.practice')}</div>
              <div className="text-2xl font-bold tabular">
                {practice.filter((p) => p.correct).length} / {practice.length}
              </div>
            </Card>
          </div>

          {sessions.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-bold">{t('hist.sessions')}</h2>
              <ul className="flex flex-col gap-2">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <details className="rounded-xl border border-line bg-surface p-3">
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-semibold">
                          {t(`ch.level.${s.level}`)} · <span className="tabular">{s.score}</span>/<span className="tabular">{s.maxScore}</span>
                        </span>
                        <span className="text-muted">
                          {t('ch.result.accuracy', { n: s.firstTryCorrect, total: s.total })} · {fmt.format(s.finishedAt)}
                        </span>
                      </summary>
                      <ol className="mt-2 flex flex-col gap-1.5 text-sm">
                        {s.questions.map((q, i) => (
                          <li key={i} className="flex items-start justify-between gap-3 border-t border-line pt-1.5">
                            <span>
                              {i + 1}. {q.prompt} <span className="text-muted">({q.answer})</span>
                            </span>
                            <span className="shrink-0 tabular">
                              {q.correct ? '✅' : '❌'} {q.points}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {predictions.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-bold">{t('hist.predict')}</h2>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-muted">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium">{t('hist.molecule')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('pr.eg')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('pr.mg')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('pr.angle')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('common.score')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('hist.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.slice(0, 50).map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="px-3 py-2 font-semibold">{formulaText(p.formula)}</td>
                        <td className="px-3 py-2">{p.egCorrect ? '✅' : '❌'}</td>
                        <td className="px-3 py-2">{p.mgCorrect ? '✅' : '❌'}</td>
                        <td className="px-3 py-2">{p.angleCorrect ? '✅' : '❌'}</td>
                        <td className="px-3 py-2 tabular">{p.score}</td>
                        <td className="px-3 py-2 text-muted">{fmt.format(p.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {practice.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-bold">{t('hist.practice')}</h2>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-muted">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium">{t('hist.molecule')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('common.step')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('common.yourAnswer')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('common.result')}</th>
                      <th className="px-3 py-2 text-start font-medium">{t('hist.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {practice.slice(0, 80).map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="px-3 py-2 font-semibold">{p.formula}</td>
                        <td className="px-3 py-2">{t(`step.${p.step}.title` as never)}</td>
                        <td className="px-3 py-2">{p.answer}</td>
                        <td className="px-3 py-2">{p.correct ? '✅' : '❌'}</td>
                        <td className="px-3 py-2 text-muted">{fmt.format(p.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
