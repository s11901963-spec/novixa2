import { useFrame, useThree } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import * as THREE from 'three';

/**
 * Reads what is actually rendered (the atom meshes in the three.js scene graph),
 * measures it, and writes a summary onto the viewer element as data attributes.
 * End-to-end tests compare this with the selected molecule, so the check covers
 * the real 3D objects rather than the app state.
 */
export function SceneProbe({ target }: { target: RefObject<HTMLElement | null> }) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frame = useRef(0);
  const last = useRef<THREE.Vector3[]>([]);
  useFrame(() => {
    frame.current++;
    if (frame.current % 12 !== 0 || !target.current) return;
    const atoms: { index: number; element: string; pos: THREE.Vector3 }[] = [];
    let centralLonePairs = 0;
    scene.traverse((o) => {
      if (o.userData.atomIndex !== undefined && o.visible) {
        atoms.push({ index: o.userData.atomIndex, element: o.userData.element, pos: o.getWorldPosition(new THREE.Vector3()) });
      }
      if (o.userData.lonePair === 'central' && (o as THREE.Mesh).isMesh) centralLonePairs++;
    });
    atoms.sort((a, b) => a.index - b.index);
    const moved = atoms.some((a, i) => !last.current[i] || last.current[i].distanceTo(a.pos) > 1e-4);
    last.current = atoms.map((a) => a.pos.clone());
    // The model itself reports when every atom has reached its target position.
    const root = scene.getObjectByName('molecule-root');
    const converged = root?.userData.converged === true;
    const angles: number[] = [];
    const c = atoms[0]?.pos;
    if (c) {
      for (let i = 1; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const u = atoms[i].pos.clone().sub(c);
          const v = atoms[j].pos.clone().sub(c);
          angles.push(THREE.MathUtils.radToDeg(u.angleTo(v)));
        }
      }
    }
    const el = target.current;
    el.dataset.renderedElements = atoms.map((a) => a.element).join(',');
    el.dataset.renderedAngles = angles
      .map((a) => a.toFixed(1))
      .sort((a, b) => Number(a) - Number(b))
      .join(',');
    el.dataset.renderedCentralLonePairs = String(centralLonePairs);
    el.dataset.settled = String(converged && !moved);
    el.dataset.renderedFor = String(root?.userData.modelKey ?? '');
    // Camera azimuth (degrees around the vertical axis) and distance, for the touch-control tests.
    el.dataset.cameraAzimuth = THREE.MathUtils.radToDeg(Math.atan2(camera.position.x, camera.position.z)).toFixed(1);
    el.dataset.cameraDistance = camera.position.length().toFixed(2);
  });
  return null;
}
