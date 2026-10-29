import { angleAt, dot, length, normalize } from './geometry';
import { createRng } from './random';
import type { Vec3 } from './types';

/**
 * Illustrative "points on a sphere" model for the "Why this shape?" animation.
 * Each electron domain is a point on a unit sphere and the points repel with an
 * energy 1/r^p. Equal domains settle into the ideal VSEPR arrangement for 2–6
 * points, which is what the animation shows. Where the lone pairs then go is NOT
 * simulated: a weighted version of this toy model puts the two lone pairs of
 * AX4E2 next to each other (wrong), so the app applies the published rule instead.
 * This is a teaching analogy, not a physical simulation (references.json → projectMethods).
 */
export interface RepulsionOptions {
  power?: number;
  starts?: number;
  maxSteps?: number;
  seed?: number;
}

const DEFAULTS = { power: 3, starts: 6, maxSteps: 900, seed: 7 };

export function repulsionEnergy(points: Vec3[], weights: number[], power = DEFAULTS.power): number {
  let e = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = length([points[i][0] - points[j][0], points[i][1] - points[j][1], points[i][2] - points[j][2]]);
      e += (weights[i] * weights[j]) / Math.pow(Math.max(d, 1e-6), power);
    }
  }
  return e;
}

function step(points: Vec3[], weights: number[], power: number, rate: number): { next: Vec3[]; moved: number } {
  const forces: Vec3[] = points.map(() => [0, 0, 0]);
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d: Vec3 = [points[i][0] - points[j][0], points[i][1] - points[j][1], points[i][2] - points[j][2]];
      const r = Math.max(length(d), 1e-6);
      const f = (power * weights[i] * weights[j]) / Math.pow(r, power + 2);
      for (let k = 0; k < 3; k++) {
        forces[i][k] += f * d[k];
        forces[j][k] -= f * d[k];
      }
    }
  }
  // Keep only the tangential part of each force, then move and project back onto the sphere.
  let maxF = 0;
  const tangential = forces.map((f, i) => {
    const p = points[i];
    const radial = dot(f, p);
    const t: Vec3 = [f[0] - radial * p[0], f[1] - radial * p[1], f[2] - radial * p[2]];
    maxF = Math.max(maxF, length(t));
    return t;
  });
  const scaleBy = maxF > 0 ? Math.min(rate, rate / maxF) : 0;
  let moved = 0;
  const next = points.map((p, i) => {
    const q = normalize([p[0] + tangential[i][0] * scaleBy, p[1] + tangential[i][1] * scaleBy, p[2] + tangential[i][2] * scaleBy]);
    moved = Math.max(moved, length([q[0] - p[0], q[1] - p[1], q[2] - p[2]]));
    return q;
  });
  return { next, moved };
}

export interface Relaxation {
  frames: Vec3[][];
  final: Vec3[];
  energy: number;
}

/** Relaxes `count` equal domains from random starts; returns the lowest-energy trajectory. */
export function relaxDomains(count: number, options: RepulsionOptions = {}): Relaxation {
  const o = { ...DEFAULTS, ...options };
  const weights = Array(count).fill(1);
  const rng = createRng(o.seed + 31 * count);
  let best: Relaxation | null = null;
  for (let s = 0; s < o.starts; s++) {
    let pts: Vec3[] = weights.map(() => {
      const z = rng.next() * 2 - 1;
      const phi = rng.next() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      return [r * Math.cos(phi), z, r * Math.sin(phi)] as Vec3;
    });
    const frames: Vec3[][] = [pts];
    for (let k = 0; k < o.maxSteps; k++) {
      const { next, moved } = step(pts, weights, o.power, 0.05);
      pts = next;
      if (k % 4 === 0) frames.push(pts);
      if (moved < 1e-7) break;
    }
    frames.push(pts);
    const energy = repulsionEnergy(pts, weights, o.power);
    if (!best || energy < best.energy - 1e-9) best = { frames, final: pts, energy };
  }
  return best!;
}

/** Sorted angles between all pairs of points (degrees). */
export function pairAngles(points: Vec3[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) out.push(angleAt(points[i], [0, 0, 0], points[j]));
  return out.sort((a, b) => a - b);
}
