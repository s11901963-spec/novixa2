import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getElement } from '../../data';
import type { SceneModel } from '../../chem/geometry';
import type { DisplayToggles, Lang, LabelMode, RenderStyle } from '../../state/settings';
import { atomRadius, bondRadius, SCALE, SCREEN_COLORS } from './constants';
import { LabelLayer } from './labels';
import { Polyhedron } from './Polyhedron';

export interface MoleculeModelProps {
  scene: SceneModel;
  mode: 'vsepr' | 'shape';
  display: DisplayToggles;
  renderStyle: RenderStyle;
  labelMode: LabelMode;
  lang: Lang;
  mystery: boolean;
  selectedAtom: number | null;
  onSelectAtom?: (i: number | null) => void;
  reduceMotion: boolean;
  lonePairLabel: string;
  /** DOM overlay that receives the screen-space labels. */
  labelContainer: HTMLElement | null;
  /** Identifies what is drawn; read back by the scene probe. */
  modelKey: string;
}

const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();

function toV(p: [number, number, number], s = SCALE) {
  return new THREE.Vector3(p[0] * s, p[1] * s, p[2] * s);
}

/** Wandering positions used while the shape is hidden ("mystery" mode). */
function mysteryPosition(i: number, n: number, t: number, out: THREE.Vector3) {
  const k = i - 1;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (2 * (k + 0.5)) / Math.max(n - 1, 1);
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = k * golden + t * 0.35 + k;
  const rad = 2.3 + 0.25 * Math.sin(t * 0.9 + k * 1.7);
  return out.set(Math.cos(phi) * r * rad, y * rad * 0.8 + 0.2 * Math.sin(t * 0.6 + k), Math.sin(phi) * r * rad);
}

/**
 * The molecule as three.js objects. Positions are animated imperatively every frame
 * (atoms glide to new places when the molecule changes); bonds, lone pairs and
 * angle arcs follow the animated atom positions, and angle labels show the angle
 * measured from the current coordinates.
 */
export function MoleculeModel(props: MoleculeModelProps) {
  const { scene, mode, display, renderStyle, labelMode, lang, mystery, selectedAtom, onSelectAtom, reduceMotion } = props;
  const n = scene.atoms.length;

  const targets = useMemo(() => scene.atoms.map((a) => toV(a.position)), [scene]);
  const radii = useMemo(() => scene.atoms.map((a) => atomRadius(a.element, renderStyle)), [scene, renderStyle]);
  const current = useRef<THREE.Vector3[]>([]);
  const atomGroups = useRef<(THREE.Group | null)[]>([]);
  const bondGroups = useRef<(THREE.Group | null)[]>([]);
  const bondInner = useRef<(THREE.Group | null)[]>([]);
  const bpDots = useRef<(THREE.Group | null)[]>([]);
  const lpGroups = useRef<(THREE.Group | null)[]>([]);
  const lpDirs = useRef<THREE.Vector3[]>([]);
  const arcLines = useRef<Line2[]>([]);
  const labelPos = useRef(new THREE.Vector3());
  const [hovered, setHovered] = useState<number | null>(null);
  const rootRef = useRef<THREE.Group>(null);

  // Keep the animated positions array aligned with the atoms; new atoms grow out of the centre.
  if (current.current.length !== n) {
    current.current = Array.from({ length: n }, (_, i) => current.current[i]?.clone() ?? new THREE.Vector3());
  }

  const lonePairs = useMemo(() => scene.lonePairs.filter((lp) => (lp.central ? display.lonePairs || mode === 'vsepr' : display.terminalLonePairs)), [scene, display.lonePairs, display.terminalLonePairs, mode]);
  if (lpDirs.current.length !== lonePairs.length) {
    lpDirs.current = lonePairs.map((lp, i) => lpDirs.current[i]?.clone() ?? new THREE.Vector3(...lp.dir));
  }

  const shownAngles = useMemo(() => {
    if (!display.angles || mystery) return [];
    const reps = scene.angles.filter((a) => (display.allAngles ? true : a.representative));
    if (display.allAngles) return reps;
    const nonStraight = reps.filter((a) => a.value < 179.5);
    return nonStraight.length ? nonStraight : reps.slice(0, 1);
  }, [scene, display.angles, display.allAngles, mystery]);

  const arcObjects = useMemo(
    () =>
      shownAngles.map(() => {
        const g = new LineGeometry();
        g.setPositions(new Float32Array(33 * 3));
        const m = new LineMaterial({ color: SCREEN_COLORS.angle, linewidth: 2.5, transparent: true, opacity: 0.95 });
        return new Line2(g, m);
      }),
    [shownAngles],
  );
  const arcBuffer = useRef(new Float32Array(33 * 3));
  arcLines.current = arcObjects;
  useEffect(() => () => arcObjects.forEach((l) => l.geometry.dispose()), [arcObjects]);

  const showBonds = display.bonds && renderStyle !== 'space-filling' && !mystery;

  // Screen-space labels (atoms, central lone pairs, live angle values)
  const layer = useMemo(() => (props.labelContainer ? new LabelLayer(props.labelContainer) : null), [props.labelContainer]);
  useEffect(() => () => layer?.clear(), [layer]);
  const labelDefs = useMemo(() => {
    const defs: { key: string; text: string; className: string }[] = [];
    if (!mystery) {
      scene.atoms.forEach((a, i) => {
        if (labelMode === 'none' && selectedAtom !== i) return;
        const text = labelMode === 'name' ? getElement(a.element).name[lang] : a.element;
        defs.push({ key: `atom-${i}`, text, className: `atom-label${selectedAtom === i ? ' is-selected' : ''}` });
      });
      if (mode === 'vsepr' && labelMode !== 'none') {
        lonePairs.forEach((lp, i) => lp.central && defs.push({ key: `lp-${i}`, text: props.lonePairLabel, className: 'lp-label' }));
      }
    }
    shownAngles.forEach((_, i) => defs.push({ key: `angle-${i}`, text: '', className: 'angle-label' }));
    return defs;
  }, [scene, labelMode, selectedAtom, lang, mystery, mode, lonePairs, shownAngles, props.lonePairLabel]);
  useEffect(() => layer?.sync(labelDefs), [layer, labelDefs]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = reduceMotion ? 1 : 1 - Math.pow(0.002, Math.min(dt, 0.1));
    const cur = current.current;
    let converged = !mystery;
    for (let i = 0; i < n; i++) {
      const target = mystery && i > 0 ? mysteryPosition(i, n, t, tmpA) : targets[i];
      cur[i].lerp(target, k);
      if (cur[i].distanceToSquared(target) > 1e-10) converged = false;
      else if (!mystery) cur[i].copy(target);
      atomGroups.current[i]?.position.copy(cur[i]);
      layer?.place(`atom-${i}`, cur[i], state.camera, state.size.width, state.size.height);
    }
    if (rootRef.current) {
      rootRef.current.userData.converged = converged;
      rootRef.current.userData.modelKey = props.modelKey;
    }
    // bonds
    scene.bonds.forEach((b, i) => {
      const g = bondGroups.current[i];
      const inner = bondInner.current[i];
      if (!g || !inner) return;
      const a = cur[b.a];
      const c = cur[b.b];
      tmpB.subVectors(c, a);
      const len = tmpB.length();
      g.position.copy(a);
      if (len > 1e-6) g.quaternion.setFromUnitVectors(Y, tmpB.normalize());
      inner.scale.set(1, Math.max(len, 1e-3), 1);
      bpDots.current[i]?.position.set(0, len / 2, 0);
    });
    // lone pairs
    lonePairs.forEach((lp, i) => {
      const g = lpGroups.current[i];
      if (!g) return;
      const d = lpDirs.current[i];
      d.lerp(tmpC.set(...lp.dir), k).normalize();
      const r = radii[lp.atom] ?? 0.4;
      const dist = lp.central ? r + (mode === 'vsepr' ? 0.5 : 0.36) : r + 0.16;
      g.position.copy(cur[lp.atom]).addScaledVector(d, dist);
      g.quaternion.setFromUnitVectors(Z, d);
      if (lp.central && mode === 'vsepr') {
        layer?.place(`lp-${i}`, labelPos.current.copy(g.position).addScaledVector(d, 0.75), state.camera, state.size.width, state.size.height);
      }
    });
    // angle arcs and their live labels
    shownAngles.forEach((ang, i) => {
      const line = arcLines.current[i];
      if (!line) return;
      const c = cur[0];
      const u = tmpA.subVectors(cur[ang.a], c);
      const v = tmpB.subVectors(cur[ang.b], c);
      const lu = u.length();
      const lv = v.length();
      if (lu < 1e-6 || lv < 1e-6) return;
      u.normalize();
      v.normalize();
      const cos = THREE.MathUtils.clamp(u.dot(v), -1, 1);
      const theta = Math.acos(cos);
      const w = tmpC.copy(v).addScaledVector(u, -cos);
      if (w.lengthSq() < 1e-6) {
        w.crossVectors(u, Math.abs(u.z) < 0.9 ? Z : Y);
      }
      w.normalize();
      const r = 0.42 * Math.min(lu, lv) * (1 + 0.22 * i);
      const buf = arcBuffer.current;
      for (let s = 0; s <= 32; s++) {
        const a = (theta * s) / 32;
        buf[s * 3] = c.x + r * (Math.cos(a) * u.x + Math.sin(a) * w.x);
        buf[s * 3 + 1] = c.y + r * (Math.cos(a) * u.y + Math.sin(a) * w.y);
        buf[s * 3 + 2] = c.z + r * (Math.cos(a) * u.z + Math.sin(a) * w.z);
      }
      line.geometry.setPositions(buf);
      line.material.resolution.set(state.size.width, state.size.height);
      const half = theta / 2;
      const rr = r + 0.3;
      labelPos.current.set(
        c.x + rr * (Math.cos(half) * u.x + Math.sin(half) * w.x),
        c.y + rr * (Math.cos(half) * u.y + Math.sin(half) * w.y),
        c.z + rr * (Math.cos(half) * u.z + Math.sin(half) * w.z),
      );
      layer?.place(`angle-${i}`, labelPos.current, state.camera, state.size.width, state.size.height);
      layer?.setText(`angle-${i}`, `${THREE.MathUtils.radToDeg(theta).toFixed(1)}°`);
    });
  });

  const polyPoints = useMemo(() => {
    if (mystery) return null;
    if (mode === 'vsepr') {
      const avg = scene.bonds.reduce((s, b) => s + b.length, 0) / Math.max(scene.bonds.length, 1);
      return scene.domainDirs.map((d) => toV(d.dir, avg * SCALE * 1.05));
    }
    if (!display.polyhedron) return null;
    return [new THREE.Vector3(), ...targets.slice(1)];
  }, [mystery, mode, display.polyhedron, scene, targets]);

  const domainSpokes = useMemo(() => {
    if (mode !== 'vsepr' || mystery) return null;
    const avg = scene.bonds.reduce((s, b) => s + b.length, 0) / Math.max(scene.bonds.length, 1);
    return scene.domainDirs.map((d) => {
      const end = toV(d.dir, avg * SCALE * 1.05);
      const color = d.lonePair ? SCREEN_COLORS.lonePair : SCREEN_COLORS.domainBond;
      const line = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), end]),
        new THREE.LineDashedMaterial({ color, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.85 }),
      );
      line.computeLineDistances();
      return { end, color, line };
    });
  }, [mode, mystery, scene]);
  useEffect(() => () => domainSpokes?.forEach((d) => d.line.geometry.dispose()), [domainSpokes]);


  const onAtomClick = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!mystery) onSelectAtom?.(selectedAtom === i ? null : i);
  };

  useEffect(() => {
    document.body.style.cursor = hovered !== null && !mystery ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered, mystery]);

  return (
    <group ref={rootRef} name="molecule-root">
      {scene.atoms.map((a, i) => {
        const r = radii[i];
        const color = mystery && i > 0 ? SCREEN_COLORS.mystery : getElement(a.element).color;
        const isSel = selectedAtom === i && !mystery;
        return (
          <group key={`atom-${i}`} ref={(el) => {
                atomGroups.current[i] = el;
              }}>
            <mesh
              scale={r}
              userData={{ atomIndex: i, element: a.element }}
              onClick={onAtomClick(i)}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(i);
              }}
              onPointerOut={() => setHovered((h) => (h === i ? null : h))}
            >
              <sphereGeometry args={[1, 40, 28]} />
              <meshStandardMaterial
                color={color}
                roughness={0.32}
                metalness={0.04}
                emissive={isSel || hovered === i ? '#3b4f8f' : '#000000'}
                emissiveIntensity={isSel ? 0.55 : hovered === i ? 0.3 : 0}
              />
            </mesh>
            {isSel && (
              <mesh scale={r * 1.22}>
                <sphereGeometry args={[1, 32, 20]} />
                <meshBasicMaterial color={SCREEN_COLORS.selection} transparent opacity={0.32} side={THREE.BackSide} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}

      {showBonds &&
        scene.bonds.map((b, i) => {
          const ca = getElement(scene.atoms[b.a].element).color;
          const cb = getElement(scene.atoms[b.b].element).color;
          const r = bondRadius(renderStyle, b.order);
          const offsets = b.order === 1 ? [0] : b.order === 2 ? [-0.1, 0.1] : [-0.15, 0, 0.15];
          return (
            <group key={`bond-${i}-${b.order}`} ref={(el) => {
                bondGroups.current[i] = el;
              }}>
              <group ref={(el) => {
                bondInner.current[i] = el;
              }}>
                {offsets.map((x, j) => (
                  <group key={j} position={[x, 0, 0]}>
                    <mesh position={[0, 0.25, 0]}>
                      <cylinderGeometry args={[r, r, 0.5, 18, 1, true]} />
                      <meshStandardMaterial color={ca} roughness={0.45} />
                    </mesh>
                    <mesh position={[0, 0.75, 0]}>
                      <cylinderGeometry args={[r, r, 0.5, 18, 1, true]} />
                      <meshStandardMaterial color={cb} roughness={0.45} />
                    </mesh>
                  </group>
                ))}
              </group>
              {display.bondingPairs && (
                <group ref={(el) => {
                bpDots.current[i] = el;
              }}>
                  {Array.from({ length: b.order }, (_, j) => {
                    const off = (j - (b.order - 1) / 2) * 0.2;
                    return (
                      <group key={j}>
                        <mesh position={[off - 0.055, 0, 0.16]}>
                          <sphereGeometry args={[0.055, 12, 10]} />
                          <meshBasicMaterial color={SCREEN_COLORS.bondingPair} />
                        </mesh>
                        <mesh position={[off + 0.055, 0, 0.16]}>
                          <sphereGeometry args={[0.055, 12, 10]} />
                          <meshBasicMaterial color={SCREEN_COLORS.bondingPair} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              )}
            </group>
          );
        })}

      {!mystery &&
        lonePairs.map((lp, i) => {
          const big = lp.central;
          const s = big ? (mode === 'vsepr' ? [0.34, 0.34, 0.6] : [0.27, 0.27, 0.46]) : [0.14, 0.14, 0.24];
          return (
            <group key={`lp-${i}-${lp.atom}`} ref={(el) => {
                lpGroups.current[i] = el;
              }} userData={{ lonePair: big ? 'central' : 'terminal' }}>
              <mesh scale={s as [number, number, number]} userData={{ lonePair: big ? 'central' : 'terminal' }}>
                <sphereGeometry args={[1, 28, 20]} />
                <meshStandardMaterial color={SCREEN_COLORS.lonePair} transparent opacity={big ? (mode === 'vsepr' ? 0.5 : 0.38) : 0.35} roughness={0.5} depthWrite={false} />
              </mesh>
              <mesh position={[-s[0] * 0.33, 0, s[2] * 0.15]}>
                <sphereGeometry args={[big ? 0.05 : 0.03, 10, 8]} />
                <meshBasicMaterial color={SCREEN_COLORS.lonePairDot} />
              </mesh>
              <mesh position={[s[0] * 0.33, 0, s[2] * 0.15]}>
                <sphereGeometry args={[big ? 0.05 : 0.03, 10, 8]} />
                <meshBasicMaterial color={SCREEN_COLORS.lonePairDot} />
              </mesh>
            </group>
          );
        })}

      {arcObjects.map((line, i) => (
        <group key={`arc-${i}`}>
          <primitive object={line} />
        </group>
      ))}

      {domainSpokes?.map((d, i) => (
        <group key={`spoke-${i}`}>
          <primitive object={d.line} />
          <mesh position={d.end}>
            <sphereGeometry args={[0.07, 14, 10]} />
            <meshBasicMaterial color={d.color} />
          </mesh>
        </group>
      ))}

      {polyPoints && <Polyhedron points={polyPoints} color={SCREEN_COLORS.polyhedron} opacity={mode === 'vsepr' ? 0.1 : 0.15} />}
    </group>
  );
}
