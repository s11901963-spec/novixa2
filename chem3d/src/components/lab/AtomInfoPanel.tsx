import { getElement } from '../../data';
import { useLang, useT } from '../../i18n';
import { useLab } from '../../state/lab';
import { Formula, Ltr } from '../ui/Formula';
import { Tex } from '../ui/Tex';
import type { LabModel } from './useLabModel';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-medium tabular">{children}</dd>
    </div>
  );
}

export function AtomInfoPanel({ model }: { model: LabModel }) {
  const t = useT();
  const lang = useLang();
  const selected = useLab((s) => s.selectedAtom);
  const selectAtom = useLab((s) => s.selectAtom);
  const lewis = model.analysis.lewis;
  if (!lewis || selected === null || selected >= lewis.structure.atoms.length) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">{t('atom.empty')}</p>
        {lewis && (
          <div className="flex flex-wrap gap-1.5">
            {lewis.structure.atoms.map((a) => (
              <button key={a.index} type="button" onClick={() => selectAtom(a.index)} className="rounded-lg border border-line bg-surface px-2.5 py-1 text-sm font-mono hover:bg-surface-2">
                {a.element}
                {a.index > 0 ? <sub>{a.index}</sub> : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  const atom = lewis.structure.atoms[selected];
  const el = getElement(atom.element);
  const sceneAtom = model.scene?.atoms[selected];
  const V = el.valenceElectrons;
  const L = atom.lonePairs * 2;
  const B = atom.bondOrderSum * 2;
  const octet = atom.element === 'H' ? 'duet' : atom.electronCount < 8 ? 'incomplete' : atom.electronCount === 8 ? 'octet' : 'expanded';
  const fcText = atom.formalCharge > 0 ? `+${atom.formalCharge}` : `${atom.formalCharge}`;

  return (
    <div className="flex flex-col gap-4" data-testid="atom-info" data-element={atom.element}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-line"
          style={{ background: `${el.color}26` }}
          aria-hidden
        >
          <span className="text-[10px] text-muted tabular">{el.atomicNumber}</span>
          <span className="font-mono text-xl font-bold leading-none">{el.symbol}</span>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {el.name[lang]}
          </div>
          <div className="text-sm text-muted">
            {t(atom.role === 'central' ? 'role.central' : 'role.terminal')}
            {sceneAtom && sceneAtom.slotRole !== 'none' && ` · ${t(`slot.${sceneAtom.slotRole}`)}`}
          </div>
        </div>
      </div>

      <section>
        <h3 className="mb-1 text-sm font-semibold text-muted" style={{ fontFamily: 'var(--font-body)' }}>
          {t('atom.inMolecule')} <Formula formula={model.formula} charge={model.charge} />
        </h3>
        <dl className="text-sm">
          <Row label={t('atom.bonds')}>{atom.index === 0 ? lewis.structure.bonds.length : 1}</Row>
          <Row label={t('atom.bondingPairs')}>{atom.bondOrderSum}</Row>
          <Row label={t('atom.lonePairs')}>{atom.lonePairs}</Row>
          <Row label={t('atom.electronsAround')}>
            {atom.electronCount} ({t(`octet.${octet}`)})
          </Row>
          <Row label={t('atom.formalCharge')}>{atom.formalCharge === 0 ? '0' : fcText}</Row>
        </dl>
        <div className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <Tex tex={`FC = V - L - \\tfrac{1}{2}B = ${V} - ${L} - \\tfrac{1}{2}(${B}) = ${atom.formalCharge === 0 ? '0' : fcText}`} display />
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold text-muted" style={{ fontFamily: 'var(--font-body)' }}>
          {t('atom.element')}
        </h3>
        <dl className="text-sm">
          <Row label={t('atom.atomicNumber')}>{el.atomicNumber}</Row>
          <Row label={t('atom.group')}>{el.group}</Row>
          <Row label={t('atom.period')}>{el.period}</Row>
          <Row label={t('atom.config')}>
            <Ltr className="font-mono">{el.electronConfiguration.replace(/(\d)([spdf])(\d+)/g, '$1$2^$3').replace(/\^(\d+)/g, (_, d: string) => d.replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]))}</Ltr>
          </Row>
          <Row label={t('atom.valence')}>{el.valenceElectrons}</Row>
          <Row label={t('atom.en')}>{el.electronegativity.toFixed(2)}</Row>
          <Row label={t('atom.covalent')}>{el.covalentRadiusPm} pm</Row>
          <Row label={t('atom.vdw')}>{el.vdwRadiusPm} pm</Row>
        </dl>
        <p className="mt-2 text-xs text-muted">{t('atom.dataSources')}</p>
      </section>
    </div>
  );
}
