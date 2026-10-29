import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { relaxDomains } from '../../chem/repulsion';
import { SCREEN_COLORS } from './constants';

/**
 * "Why this shape?" illustration: equal points on a sphere repel until they settle.
 * Plays the stored trajectory of the toy model (chem/repulsion.ts).
 */
export function RepulsionDemo({ count, playKey, onSettled, radius = 2.1 }: { count: number; playKey: number; onSettled: () => void; radius?: number }) {
  const relax = useMemo(() => relaxDomains(count, { seed: 11 + playKey }), [count, playKey]);
  const t0 = useRef<number | null>(null);
  const done = useRef(false);
  const points = useRef<(THREE.Mesh | null)[]>([]);
  const lines = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
        return new THREE.Line(g, new THREE.LineBasicMaterial({ color: SCREEN_COLORS.domainBond, transparent: true, opacity: 0.7 }));
      }),
    [count],
  );
  useEffect(() => {
    t0.current = null;
    done.current = false;
  }, [relax]);
  useEffect(() => () => lines.forEach((l) => l.geometry.dispose()), [lines]);

  useFrame((state) => {
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const duration = 3.2;
    const p = Math.min(1, (state.clock.elapsedTime - t0.current) / duration);
    const eased = 1 - Math.pow(1 - p, 2.2);
    const f = Math.min(relax.frames.length - 1, Math.floor(eased * (relax.frames.length - 1)));
    const frame = relax.frames[f];
    frame.forEach((pt, i) => {
      const m = points.current[i];
      if (m) m.position.set(pt[0] * radius, pt[1] * radius, pt[2] * radius);
      const attr = lines[i].geometry.getAttribute('position') as THREE.BufferAttribute;
      attr.setXYZ(1, pt[0] * radius, pt[1] * radius, pt[2] * radius);
      attr.needsUpdate = true;
    });
    if (p >= 1 && !done.current) {
      done.current = true;
      onSettled();
    }
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 36, 24]} />
        <meshBasicMaterial color={SCREEN_COLORS.polyhedron} wireframe transparent opacity={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 24, 16]} />
        <meshStandardMaterial color="#c9d3e6" />
      </mesh>
      {lines.map((l, i) => (
        <primitive key={`l${i}`} object={l} />
      ))}
      {Array.from({ length: count }, (_, i) => (
        <mesh key={`p${i}`} ref={(el) => {
                points.current[i] = el;
              }}>
          <sphereGeometry args={[0.2, 20, 14]} />
          <meshStandardMaterial color={SCREEN_COLORS.domainBond} emissive="#22336b" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
