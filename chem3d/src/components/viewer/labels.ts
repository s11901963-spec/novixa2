import * as THREE from 'three';

/**
 * Screen-space labels for the 3D view, kept as plain DOM elements in an overlay and
 * positioned every frame by projecting their 3D anchor. (No nested React roots, which
 * avoids label flicker/loss seen with portal-based HTML labels under React 19.)
 */
export class LabelLayer {
  private items = new Map<string, HTMLSpanElement>();
  constructor(private container: HTMLElement) {}

  sync(defs: { key: string; text: string; className: string }[]) {
    const keep = new Set(defs.map((d) => d.key));
    for (const [k, el] of this.items) {
      if (!keep.has(k)) {
        el.remove();
        this.items.delete(k);
      }
    }
    for (const d of defs) {
      let el = this.items.get(d.key);
      if (!el) {
        el = document.createElement('span');
        el.style.position = 'absolute';
        el.style.left = '0';
        el.style.top = '0';
        el.style.willChange = 'transform';
        el.dataset.labelKey = d.key;
        this.container.appendChild(el);
        this.items.set(d.key, el);
      }
      if (el.className !== d.className) el.className = d.className;
      if (d.text && el.textContent !== d.text) el.textContent = d.text;
      el.dir = 'auto';
    }
  }

  setText(key: string, text: string) {
    const el = this.items.get(key);
    if (el && el.textContent !== text) el.textContent = text;
  }

  /** Square size in pixels (for markers drawn around an atom). */
  setSize(key: string, px: number) {
    const el = this.items.get(key);
    const v = `${Math.round(px)}px`;
    if (el && el.style.width !== v) {
      el.style.width = v;
      el.style.height = v;
    }
  }

  place(key: string, world: THREE.Vector3, camera: THREE.Camera, width: number, height: number) {
    const el = this.items.get(key);
    if (!el) return;
    const p = world.clone().project(camera);
    if (p.z > 1 || p.z < -1) {
      el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = 'visible';
    const x = ((p.x + 1) / 2) * width;
    const y = ((1 - p.y) / 2) * height;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    el.style.zIndex = String(Math.round((1 - p.z) * 1000));
  }

  clear() {
    for (const el of this.items.values()) el.remove();
    this.items.clear();
  }
}
