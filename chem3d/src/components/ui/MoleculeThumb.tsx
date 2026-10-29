import { useMemo } from 'react';
import { buildSceneModel, cross, dot, normalize, scale } from '../../chem/geometry';
import { analysisOf } from '../../chem/questions';
import type { Vec3 } from '../../chem/types';
import { getElement, type MoleculeData } from '../../data';
import { SCREEN_COLORS } from '../viewer/constants';

const VIEW: Vec3 = normalize([-0.55, 0.42, 1]);
const X = normalize(cross([0, 1, 0], VIEW));
const Y = cross(VIEW, X);

/** Static 2D projection of the ideal 3D model (same viewing angle as the lab camera). */
export function MoleculeThumb({ molecule, size = 120 }: { molecule: MoleculeData; size?: number }) {
  const data = useMemo(() => {
    const a = analysisOf(molecule);
    if (!a.ok) return null;
    const scene = buildSceneModel(a, { mode: 'ideal' });
    const project = (p: Vec3) => ({ x: dot(p, X), y: -dot(p, Y), z: dot(p, VIEW) });
    const atoms = scene.atoms.map((at) => ({ ...project(at.position), r: 0.2 + 0.3 * (getElement(at.element).covalentRadiusPm / 100), color: getElement(at.element).color }));
    const avg = scene.bonds.reduce((s, b) => s + b.length, 0) / scene.bonds.length;
    const lps = scene.lonePairs.filter((l) => l.central).map((l) => project(scale(l.dir, avg * 0.62)));
    const extent = Math.max(...atoms.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)) + p.r)) + 0.25;
    return { atoms, lps, extent };
  }, [molecule]);
  if (!data) return null;
  const { atoms, lps, extent } = data;
  const order = atoms.map((_, i) => i).sort((i, j) => atoms[i].z - atoms[j].z);
  return (
    <svg viewBox={`${-extent} ${-extent} ${2 * extent} ${2 * extent}`} width={size} height={size} aria-hidden className="block">
      {lps.map((p, i) => (
        <ellipse key={`lp${i}`} cx={p.x} cy={p.y} rx={0.26} ry={0.26} fill={SCREEN_COLORS.lonePair} opacity={0.45} />
      ))}
      {atoms.slice(1).map((p, i) => (
        <line key={`b${i}`} x1={atoms[0].x} y1={atoms[0].y} x2={p.x} y2={p.y} stroke="#9fb0cc" strokeWidth={0.12} strokeLinecap="round" />
      ))}
      {order.map((i) => {
        const p = atoms[i];
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={p.r} fill={p.color} stroke="#0c1322" strokeWidth={0.04} />
            <circle cx={p.x - p.r * 0.3} cy={p.y - p.r * 0.3} r={p.r * 0.35} fill="#ffffff" opacity={0.35} />
          </g>
        );
      })}
    </svg>
  );
}
