// Touch geometry for bending a molecule on screen (pure, so it can be tested without a browser).

export interface GrabCandidate {
  atom: number;
  /** Atom centre on screen (px). */
  x: number;
  y: number;
  /** How far from the centre a press still catches the atom (px). */
  reach: number;
}

/**
 * The atom a press grabs: the nearest one whose reach circle contains the press; otherwise the one
 * whose bond passes close to the press (outer two thirds only, so the central atom stays free for
 * turning the view). -1 when the press is on neither.
 */
export function grabAtom(px: number, py: number, center: [number, number], atoms: GrabCandidate[], bondReach: number): number {
  let best = -1;
  let bestD = Infinity;
  for (const a of atoms) {
    const d = Math.hypot(a.x - px, a.y - py);
    if (d <= a.reach && d < bestD) {
      best = a.atom;
      bestD = d;
    }
  }
  if (best >= 0) return best;
  for (const a of atoms) {
    const vx = a.x - center[0];
    const vy = a.y - center[1];
    const len2 = vx * vx + vy * vy;
    if (len2 < 1) continue;
    const t = ((px - center[0]) * vx + (py - center[1]) * vy) / len2;
    if (t < 0.35 || t > 1) continue;
    const d = Math.hypot(center[0] + t * vx - px, center[1] + t * vy - py);
    if (d <= bondReach && d < bestD) {
      best = a.atom;
      bestD = d;
    }
  }
  return best;
}

export interface Finger {
  atom: number;
  /** Where that atom should be on screen (the finger, minus where on the atom it was grabbed). */
  x: number;
  y: number;
}

/**
 * Index of the candidate angle whose atoms best follow the fingers (least squares on screen). One
 * finger drags one atom; two fingers on two atoms open or close the angle between them.
 */
export function pickAngle(count: number, screenOf: (k: number, atom: number) => [number, number], fingers: Finger[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let k = 0; k < count; k++) {
    let d = 0;
    for (const f of fingers) {
      const [sx, sy] = screenOf(k, f.atom);
      d += (sx - f.x) ** 2 + (sy - f.y) ** 2;
    }
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}
