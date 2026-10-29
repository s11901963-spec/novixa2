import { analyze, findMoleculeBySpec, specOf } from '../../chem/analyze';
import { getElement } from '../../data';
import { useLang, useT } from '../../i18n';
import { useLab } from '../../state/lab';
import { Badge, Button } from '../ui/controls';
import { Axe, Formula, formulaFromSpec } from '../ui/Formula';
import { IssueList } from './SolutionPanel';
import type { LabModel } from './useLabModel';

const CENTRAL = ['Be', 'B', 'Al', 'C', 'Si', 'Ge', 'N', 'P', 'As', 'Sb', 'O', 'S', 'Se', 'Te', 'Cl', 'Br', 'I', 'Kr', 'Xe'];
const TERMINAL = ['H', 'F', 'Cl', 'Br', 'I', 'O', 'S', 'N', 'C'];

function ElementTile({ symbol, active, onClick, label }: { symbol: string; active?: boolean; onClick: () => void; label: string }) {
  const e = getElement(symbol);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`flex h-14 w-12 flex-col items-center justify-center rounded-lg border text-center transition-colors ${
        active ? 'border-accent bg-accent-soft ring-2 ring-accent/30' : 'border-line bg-surface hover:bg-surface-2'
      }`}
    >
      <span className="h-1.5 w-6 rounded-full" style={{ background: e.color }} aria-hidden />
      <span className="mt-0.5 font-mono text-base font-semibold leading-tight">{symbol}</span>
      <bdi dir="ltr" className="text-[10px] text-muted tabular">{e.valenceElectrons}e⁻</bdi>
    </button>
  );
}

export function BuilderPanel({ model }: { model: LabModel }) {
  const t = useT();
  const lang = useLang();
  const setSpec = useLab((s) => s.setBuilderSpec);
  const spec = model.source.kind === 'builder' ? model.source.spec : { central: model.spec.central, ligands: [] as string[], charge: 0 };
  const isBuilder = model.source.kind === 'builder';
  const set = (patch: Partial<typeof spec>) => setSpec({ ...spec, ...patch });
  const analysis = isBuilder ? model.analysis : analyze(spec);
  const match = isBuilder ? findMoleculeBySpec(spec) : undefined;

  return (
    <div className="flex flex-col gap-4" data-testid="builder">
      <div>
        <h2 className="text-base font-bold">{t('builder.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('builder.intro')}</p>
        {!isBuilder && (
          <Button variant="secondary" className="mt-2" onClick={() => setSpec(specOf(model.spec))}>
            {t('builder.fromCurrent')}
          </Button>
        )}
      </div>

      <section>
        <h3 className="mb-1.5 text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
          {t('builder.central')}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {CENTRAL.map((s) => (
            <ElementTile key={s} symbol={s} active={isBuilder && spec.central === s} label={getElement(s).name[lang]} onClick={() => set({ central: s })} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1.5 text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
          {t('builder.terminal')}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {TERMINAL.map((s) => (
            <ElementTile
              key={s}
              symbol={s}
              label={getElement(s).name[lang]}
              onClick={() => (spec.ligands.length < 6 ? set({ ligands: [...spec.ligands, s] }) : undefined)}
            />
          ))}
        </div>
        {spec.ligands.length >= 6 && <p className="mt-1 text-xs text-warn">{t('builder.max')}</p>}
      </section>

      <section>
        <h3 className="mb-1.5 text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
          {t('builder.current')}
        </h3>
        {spec.ligands.length === 0 ? (
          <p className="text-sm text-muted">{t('builder.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {spec.ligands.map((l, i) => (
              <button
                key={`${l}-${i}`}
                type="button"
                onClick={() => set({ ligands: spec.ligands.filter((_, j) => j !== i) })}
                aria-label={t('builder.remove', { element: l })}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-sm hover:border-bad hover:text-bad"
              >
                {l} <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" onClick={() => set({ ligands: [] })} className="text-sm text-accent underline-offset-2 hover:underline">
              {t('builder.clear')}
            </button>
          </div>
        )}
      </section>

      <section className="flex items-center gap-3">
        <span className="text-sm font-semibold">{t('builder.charge')}</span>
        <div className="inline-flex items-center rounded-xl border border-line" dir="ltr">
          <button type="button" className="px-3 py-1.5 text-lg" aria-label="−" onClick={() => set({ charge: Math.max(-2, spec.charge - 1) })}>
            −
          </button>
          <span className="min-w-10 text-center font-mono tabular" data-testid="builder-charge">
            {spec.charge > 0 ? `+${spec.charge}` : spec.charge}
          </span>
          <button type="button" className="px-3 py-1.5 text-lg" aria-label="+" onClick={() => set({ charge: Math.min(2, spec.charge + 1) })}>
            +
          </button>
        </div>
      </section>

      {isBuilder && (
        <section className="rounded-xl border border-line bg-surface-2 p-3 text-sm" data-testid="builder-result">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold">
              <Formula formula={formulaFromSpec(spec)} charge={spec.charge} />
            </span>
            {analysis.ok && analysis.vsepr && (
              <>
                <Badge tone="accent">
                  <Axe axe={analysis.vsepr.axe} />
                </Badge>
                <Badge tone="neutral">{t(`mg.${analysis.vsepr.molecularGeometry}`)}</Badge>
              </>
            )}
          </div>
          <div className="mt-2">
            <IssueList analysis={analysis} />
          </div>
          {analysis.ok && (
            <p className={`mt-2 ${match ? 'text-ok' : 'text-muted'}`}>
              {match ? t('builder.matches', { name: match.name[lang], exp: match.experimental ? t('builder.matchesExp') : '' }) : t('builder.notInData')}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
