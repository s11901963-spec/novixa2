import { useMemo } from 'react';
import { analyze, findMoleculeBySpec, specOf } from '../../chem/analyze';
import { explorerFor } from '../../chem/angleExplorer';
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
  const baseScene = useMemo(
    () => (analysis.ok ? buildSceneModel(analysis, { mode: geometryMode, experimental }) : null),
    [analysis, geometryMode, experimental],
  );
  // "Change the angle yourself": the viewer shows the student's angle instead of the real one.
  const tab = useLab((s) => s.tab);
  const angleTry = useLab((s) => s.angleTry);
  const explorer = useMemo(() => (analysis.ok ? explorerFor(analysis) : null), [analysis]);
  const exploring = tab === 'angle' && !!explorer && angleTry !== null;
  const scene = useMemo(
    () => (exploring && baseScene ? buildSceneModel(analysis, { mode: geometryMode, experimental, layout: explorer!.layout(angleTry!) }) : baseScene),
    [exploring, baseScene, analysis, geometryMode, experimental, explorer, angleTry],
  );
  const steps = useMemo(() => buildSteps(analysis, baseScene ?? undefined), [analysis, baseScene]);
  const formula = molecule && source.kind === 'library' ? molecule.formula : formulaFromSpec(spec);
  return { source, molecule, spec, specKey, analysis, scene, baseScene, explorer, exploring, steps, formula, charge: spec.charge, experimental, geometryMode };
}

export type LabModel = ReturnType<typeof useLabModel>;
