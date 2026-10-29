import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraPreset } from '../../state/lab';

const DIRECTIONS: Record<CameraPreset, THREE.Vector3> = {
  reset: new THREE.Vector3(-0.55, 0.42, 1).normalize(),
  front: new THREE.Vector3(0, 0, 1),
  top: new THREE.Vector3(0, 1, 0.0015).normalize(),
  side: new THREE.Vector3(1, 0, 0),
};

/** Moves the camera smoothly to a preset, at a distance that fits the molecule. */
export function CameraRig({ radius, preset, nonce, instant }: { radius: number; preset: CameraPreset; nonce: number; instant: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const goal = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitHeight = radius / Math.sin(fov / 2);
    const fitWidth = radius / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect));
    const dist = Math.max(fitHeight, fitWidth) * 1.12 + 0.6;
    goal.current = DIRECTIONS[preset].clone().multiplyScalar(dist);
    if (instant) {
      camera.position.copy(goal.current);
      controls?.target.set(0, 0, 0);
      controls?.update();
      goal.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, preset, radius]);

  useFrame((_, dt) => {
    if (!goal.current) return;
    const k = 1 - Math.pow(0.0005, Math.min(dt, 0.1));
    camera.position.lerp(goal.current, k);
    if (controls) {
      controls.target.lerp(new THREE.Vector3(), k);
      controls.update();
    }
    if (camera.position.distanceTo(goal.current) < 0.01) goal.current = null;
  });
  return null;
}
