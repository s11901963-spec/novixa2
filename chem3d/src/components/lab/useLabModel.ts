import { useMemo } from 'react';
import { analyze, findMoleculeBySpec, specOf } from '../../chem/analyze';
import { buildSceneModel } from '../../chem/geometry';
import { buildSteps } from '../../chem/steps';
import { getMolecule } from '../../data';
import { useLab } from '../../state/lab';
import { formulaFromSpec } from '../ui/Formula';

/** Everything the lab shows, derived from the current selection (library molecule or builder). */
export function useLabModel() {
  const source = useLab((s) => s.source);
  const geometryPref = useLab((s) => s.geometryMode);
  const molecule = source.kind === 'library' ? (getMolecule(source.id) ?? getMolecule('nh3')!) : findMoleculeBySpec(source.spec);
  const spec = source.kind === 'library' ? specOf(molecule!) : source.spec;
  const specKey = `${spec.central}|${spec.ligands.join(',')}|${spec.charge}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const analysis = useMemo(() => analyze(spec), [specKey]);
  const experimental = molecule?.experimental;
  const geometryMode = experimental ? geometryPref : 'ideal';
  const scene = useMemo(
    () => (analysis.ok ? buildSceneModel(analysis, { mode: geometryMode, experimental }) : null),
    [analysis, geometryMode, experimental],
  );
  const steps = useMemo(() => buildSteps(analysis, scene ?? undefined), [analysis, scene]);
  const formula = molecule && source.kind === 'library' ? molecule.formula : formulaFromSpec(spec);
  return { source, molecule, spec, specKey, analysis, scene, steps, formula, charge: spec.charge, experimental, geometryMode };
}

export type LabModel = ReturnType<typeof useLabModel>;
