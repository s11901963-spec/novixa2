import { covalentBondLength } from '../../chem/geometry';
import { useLang, useT } from '../../i18n';
import { Badge } from '../ui/controls';
import { Axe, Deg, Formula, hybridizationText, Ltr } from '../ui/Formula';
import { RefCite } from '../ui/RefCite';
import { LewisDiagram } from '../viewer/LewisDiagram';
import type { LabModel } from './useLabModel';

const LEWIS_COLORS = {
  text: 'var(--fg)',
  bond: 'var(--fg)',
  centralLp: 'var(--lp)',
  terminalLp: 'var(--fg-muted)',
  accent: 'var(--accent)',
  muted: 'var(--fg-muted)',
};

export function NotesPanel({ model }: { model: LabModel }) {
  const t = useT();
  const lang = useLang();
  const { molecule, analysis, scene } = model;
  const v = analysis.vsepr;
  const isBuilder = model.source.kind === 'builder' && !molecule;
  const exp = molecule?.experimental;

  return (
    <div className="flex flex-col gap-5" data-testid="notes-panel">
      {molecule && (
        <header>
          <h2 className="text-lg font-bold">
            <Formula formula={molecule.formula} charge={molecule.charge} /> — {molecule.name[lang]}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge>{t(`category.${molecule.category}`)}</Badge>
            {exp && <Badge tone="ok">{t('lib.hasExp')}</Badge>}
          </div>
        </header>
      )}
      {isBuilder && <p className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">{t('notes.builderOnly')}</p>}

      {v && (
        <section>
          <h3 className="mb-2 text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
            {t('notes.compare')}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t('notes.quantity')}</th>
                  <th className="px-3 py-2 text-start font-medium">{t('notes.ideal')}</th>
                  <th className="px-3 py-2 text-start font-medium">{t('notes.experimental')}</th>
                </tr>
              </thead>
              <tbody>
                {v.idealAngles.map((ia) => {
                  const measured = exp?.angles.filter((a) => scene?.angles.some((s) => s.label === a.label && s.kind === ia.kind));
                  return (
                    <tr key={ia.kind} className="border-t border-line">
                      <td className="px-3 py-2">{t(`angleKind.${ia.kind}`)}</td>
                      <td className="px-3 py-2">
                        <Deg value={ia.value} prefix={ia.relation === 'less-than' ? '< ' : ia.relation === 'approx' ? '≈ ' : ''} />
                      </td>
                      <td className="px-3 py-2">
                        {measured && measured.length ? (
                          measured.map((m) => (
                            <div key={m.label}>
                              <Ltr className="font-mono">{m.label}</Ltr>: <Deg value={m.value} digits={3} className="font-semibold" />{' '}
                              <span className="text-xs text-muted">({t(`notes.basis.${m.basis}`)})</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {exp &&
                  exp.bondLengths.map((b) => (
                    <tr key={`${b.ligand}-${b.role ?? ''}`} className="border-t border-line">
                      <td className="px-3 py-2">
                        {t('notes.bondLength', { pair: `${analysis.spec.central}–${b.ligand}${b.role ? ` (${t(`slot.${b.role}`)})` : ''}` })}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {t('notes.bondLengthIdeal', { value: covalentBondLength(analysis.spec.central, b.ligand).toFixed(2) })}
                      </td>
                      <td className="px-3 py-2 tabular font-semibold">
                        {b.value.toFixed(3)} Å{b.structure && <span className="ms-1 text-xs font-normal text-muted">({b.structure === 're' ? 'rₑ' : 'r₀'})</span>}
                      </td>
                    </tr>
                  ))}
                {exp && (
                  <tr className="border-t border-line">
                    <td className="px-3 py-2">{t('notes.pointGroup')}</td>
                    <td className="px-3 py-2 text-muted">—</td>
                    <td className="px-3 py-2 font-mono">{exp.pointGroup}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {exp ? (
            <p className="mt-1.5 text-xs text-muted">
              {t('notes.phase')}: {t('notes.phase.gas')} · {t('common.sources')}: <RefCite ids={exp.sources} />
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">{t('notes.noExp')}</p>
          )}
        </section>
      )}

      {molecule?.reference && v && (
        <section className="rounded-xl border border-line p-3 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span className="text-muted">{t('notes.engine')}</span>
            <span>
              <Axe axe={v.axe} /> · {t(`eg.${v.electronGeometry}`)} · {t(`mg.${v.molecularGeometry}`)} · <Ltr>{hybridizationText(v.hybridization)}</Ltr>
            </span>
            <span className="text-muted">{t('notes.reference')}</span>
            <span>
              <Axe axe={molecule.reference.axe} /> · {t(`eg.${molecule.reference.electronGeometry}`)} · {t(`mg.${molecule.reference.molecularGeometry}`)} ·{' '}
              <Ltr>{hybridizationText(molecule.reference.hybridization)}</Ltr> <RefCite ids={molecule.reference.sources} />
            </span>
          </div>
          {v.axe === molecule.reference.axe && v.molecularGeometry === molecule.reference.molecularGeometry ? (
            <p className="mt-2 text-ok">✅ {t('notes.agree')}</p>
          ) : (
            <p className="mt-2 text-bad">❌ {t('notes.disagree')}</p>
          )}
        </section>
      )}

      {molecule && (
        <section>
          <h3 className="mb-2 text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
            {t('notes.scientific')}
          </h3>
          {molecule.notes.length === 0 ? (
            <p className="text-sm text-muted">{t('notes.none')}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {molecule.notes.map((n) => (
                <li key={n.id} className="rounded-xl border border-line bg-surface p-3 text-sm leading-7">
                  {n.text[lang]} {n.sources.length > 0 && <RefCite ids={n.sources} className="ms-1" />}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {analysis.lewis && analysis.lewis.alternatives.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
            {t('lewis.altTitle')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.lewis.alternatives.map((alt, i) => (
              <figure key={i} className="rounded-xl border border-line bg-surface p-2">
                <div className="h-40">
                  <LewisDiagram structure={alt.structure} charge={analysis.spec.charge} selectedAtom={null} showCounts colors={LEWIS_COLORS} compact title={t(`lewis.alt.${alt.reason}`)} />
                </div>
                <figcaption className="px-1 pt-1 text-xs text-muted">{t(`lewis.alt.${alt.reason}`)}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
