import { useMemo } from 'react';
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

/**
 * Translucent polyhedron through the given points. Coplanar sets (trigonal planar,
 * square planar, bent, T-shaped) become a flat polygon; two points become a segment.
 */
export function Polyhedron({ points, color, opacity = 0.13 }: { points: THREE.Vector3[]; color: string; opacity?: number }) {
  const geometry = useMemo(() => buildGeometry(points), [points]);
  const edges = useMemo(() => (geometry ? new THREE.EdgesGeometry(geometry, 1) : null), [geometry]);
  const segment = useMemo(() => new THREE.BufferGeometry().setFromPoints(points.slice(0, 2)), [points]);
  if (points.length < 2) return null;
  if (!geometry || !edges) {
    return (
      <lineSegments geometry={segment}>
        <lineBasicMaterial color={color} transparent opacity={0.7} />
      </lineSegments>
    );
  }
  return (
    <group>
      <mesh geometry={geometry} renderOrder={1}>
        <meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} roughness={0.6} />
      </mesh>
      <lineSegments geometry={edges} renderOrder={2}>
        <lineBasicMaterial color={color} transparent opacity={0.75} />
      </lineSegments>
    </group>
  );
}

function buildGeometry(points: THREE.Vector3[]): THREE.BufferGeometry | null {
  if (points.length < 3) return null;
  const plane = planeThrough(points);
  if (plane && points.every((p) => Math.abs(plane.distanceToPoint(p)) < 1e-3)) return polygon(points, plane.normal);
  try {
    return new ConvexGeometry(points);
  } catch {
    return null;
  }
}

function planeThrough(points: THREE.Vector3[]): THREE.Plane | null {
  for (let i = 1; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const n = new THREE.Vector3().subVectors(points[i], points[0]).cross(new THREE.Vector3().subVectors(points[j], points[0]));
      if (n.lengthSq() > 1e-8) return new THREE.Plane().setFromNormalAndCoplanarPoint(n.normalize(), points[0]);
    }
  }
  return null;
}

/** Convex polygon (fan triangulation) of coplanar points. */
function polygon(points: THREE.Vector3[], normal: THREE.Vector3): THREE.BufferGeometry {
  const center = points.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1 / points.length);
  const u = new THREE.Vector3().subVectors(points[0], center);
  if (u.lengthSq() < 1e-8) u.set(1, 0, 0);
  u.normalize();
  const v = new THREE.Vector3().crossVectors(normal, u).normalize();
  const sorted = [...points].sort((a, b) => {
    const da = new THREE.Vector3().subVectors(a, center);
    const db = new THREE.Vector3().subVectors(b, center);
    return Math.atan2(da.dot(v), da.dot(u)) - Math.atan2(db.dot(v), db.dot(u));
  });
  const verts: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[(i + 1) % sorted.length];
    verts.push(center.x, center.y, center.z, a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}
