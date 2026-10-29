import { buildSceneModel } from '../../chem/geometry';
import { analysisOf } from '../../chem/questions';
import { mainAngle } from '../../chem/steps';
import { dataset, type MoleculeData } from '../../data';
import { useLang, useT } from '../../i18n';
import { navigate } from '../../router';
import { useLab } from '../../state/lab';
import { Badge, Card } from '../ui/controls';
import { Deg, Formula, hybridizationText, Ltr } from '../ui/Formula';
import { RefCite } from '../ui/RefCite';

const NOTES: { key: 'book.note.ph3' | 'book.note.nbbr5' | 'book.note.alcl3' | 'book.note.angles' | 'book.note.terms'; sources: string[] }[] = [
  { key: 'book.note.ph3', sources: ['course-textbook', 'cccbdb', 'herzberg1966'] },
  { key: 'book.note.nbbr5', sources: ['course-textbook', 'kaupp2001'] },
  { key: 'book.note.alcl3', sources: ['cccbdb', 'landolt1976'] },
  { key: 'book.note.angles', sources: ['course-textbook', 'cccbdb'] },
  { key: 'book.note.terms', sources: ['course-textbook'] },
];

function measuredAngle(m: MoleculeData) {
  if (!m.experimental) return undefined;
  return mainAngle(buildSceneModel(analysisOf(m), { mode: 'experimental', experimental: m.experimental }));
}

/**
 * The course textbook's Table 6-4 next to what the engine computes and what was measured.
 * Book values are shown as printed; a difference is flagged and explained, never "fixed".
 */
export function BookTable() {
  const t = useT();
  const lang = useLang();
  const openMolecule = useLab((s) => s.openMolecule);
  const rows = dataset.molecules.filter((m) => m.textbook).sort((a, b) => a.textbook!.order - b.textbook!.order);
  const ok = <span className="text-ok" aria-label={t('book.match')}>✓</span>;
  return (
    <Card className="p-4" as="section">
      <div data-testid="book-table">
        <h2 className="text-xl font-bold">{t('book.title')}</h2>
        <p className="mt-1 max-w-4xl text-sm leading-7 text-muted">{t('book.intro')}</p>
        <ul className="mt-3 grid gap-1.5 text-sm leading-7 md:grid-cols-2">
          {(['book.bigIdea', 'book.vsepr', 'book.angle', 'book.lp', 'book.legend'] as const).map((k) => (
            <li key={k} className="rounded-lg bg-surface-2 px-3 py-1.5">
              {t(k)}
            </li>
          ))}
        </ul>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-surface-2 text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t('book.col.molecule')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('book.col.total')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('book.col.shared')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('book.col.lone')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('book.col.hybrid')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('book.col.shape')}</th>
                <th className="px-3 py-2 text-start font-medium">
                  {t('book.col.angle')} ({t('book.row.book')})
                </th>
                <th className="px-3 py-2 text-start font-medium">{t('book.col.measured')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const tb = m.textbook!;
                const v = analysisOf(m).vsepr!;
                const meas = measuredAngle(m);
                const agree = (a: unknown, b: unknown) => (a === b ? ok : <Badge tone="bad">{t('book.differs')}</Badge>);
                const angleDiffers = !!meas && tb.lonePairs > 0 && Math.abs(meas.value - tb.angles[0]) > 0.5;
                return (
                  <tr key={m.id} className="border-t border-line align-top" data-testid={`book-row-${m.id}`} data-angle-differs={angleDiffers}>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-semibold text-accent hover:underline"
                        onClick={() => {
                          openMolecule(m.id);
                          navigate('lab');
                        }}
                        title={t('common.openInLab')}
                      >
                        <Formula formula={m.formula} />
                      </button>
                      <div className="text-xs text-muted">{m.name[lang]}</div>
                    </td>
                    <td className="px-3 py-2 tabular">
                      {tb.totalPairs} {agree(tb.totalPairs, v.stericNumber)}
                    </td>
                    <td className="px-3 py-2 tabular">
                      {tb.sharedPairs} {agree(tb.sharedPairs, v.bondingDomains)}
                    </td>
                    <td className="px-3 py-2 tabular">
                      {tb.lonePairs} {agree(tb.lonePairs, v.lonePairs)}
                    </td>
                    <td className="px-3 py-2">
                      <Ltr>{hybridizationText(tb.hybridization)}</Ltr> {agree(tb.hybridization, v.hybridization)}
                    </td>
                    <td className="px-3 py-2">
                      {tb.shape[lang]} {agree(tb.geometry, v.molecularGeometry)}
                    </td>
                    <td className="px-3 py-2">
                      {tb.angles.map((a, i) => (
                        <span key={a}>
                          {i > 0 && ' / '}
                          <Deg value={a} />
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-2">
                      {meas ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Deg value={meas.value} className="font-semibold" />
                          {angleDiffers ? <Badge tone="warn">{t('book.differs')}</Badge> : ok}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">{t('book.noExp')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="mt-4 mb-2 text-base font-bold">{t('book.notes')}</h3>
        <ul className="flex flex-col gap-2 text-sm leading-7">
          {NOTES.map((n) => (
            <li key={n.key} className="rounded-xl border border-line px-3 py-2" data-testid={n.key}>
              {t(n.key)}{' '}
              <span className="whitespace-nowrap text-xs text-muted">
                ({t('common.sources')}: <RefCite ids={n.sources} />)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
