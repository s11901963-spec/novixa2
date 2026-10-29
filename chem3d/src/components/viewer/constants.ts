import { getElement } from '../../data';
import type { RenderStyle } from '../../state/settings';

/** Scene units per ångström. */
export const SCALE = 1.45;

/** Colours drawn on the dark "screen" behind the model (same in both themes). */
export const SCREEN_COLORS = {
  lonePair: '#a78bfa',
  lonePairDot: '#f5f0ff',
  bondingPair: '#34c4d6',
  angle: '#ffc44d',
  polyhedron: '#7c9bff',
  domainBond: '#7c9bff',
  selection: '#9db4ff',
  mystery: '#5b6b8c',
};

export function atomRadius(symbol: string, style: RenderStyle): number {
  const e = getElement(symbol);
  if (style === 'space-filling') return (e.vdwRadiusPm / 100) * SCALE * 0.82;
  if (style === 'sticks') return 0.17;
  return 0.2 + 0.3 * (e.covalentRadiusPm / 100);
}

export function bondRadius(style: RenderStyle, order: number): number {
  if (style === 'sticks') return order > 1 ? 0.09 : 0.16;
  return order > 1 ? 0.06 : 0.085;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
