import { useMemo } from 'react';
import { angleHits, angleOfKind, angleTarget } from '../../chem/angleExplorer';
import { buildSceneModel } from '../../chem/geometry';
import { useLab } from '../../state/lab';
import type { LabModel } from './useLabModel';

/**
 * "Change the angle yourself": the angle the student has set, what counts as right
 * (measured value, exact symmetric value or VSEPR range) and whether the current value is right.
 * Shared by the side panel and the 3D view so both judge the same way.
 */
export function useAngleChallenge(model: LabModel) {
  const angleTry = useLab((s) => s.angleTry);
  const ex = model.explorer;
  const measured = useMemo(
    () => (ex && model.analysis.ok && model.experimental ? angleOfKind(buildSceneModel(model.analysis, { mode: 'experimental', experimental: model.experimental }), ex.kind) : undefined),
    [ex, model.analysis, model.experimental],
  );
  if (!ex || !model.analysis.ok) return null;
  const target = angleTarget(ex, model.analysis, measured);
  const value = angleTry ?? ex.start;
  const goal = target.value ?? (target.range![0] + target.range![1]) / 2;
  return { ex, target, value, goal, hit: angleHits(value, target) };
}

export type AngleChallenge = NonNullable<ReturnType<typeof useAngleChallenge>>;
