import { Fragment } from 'react';
import type { MoleculeSpec } from '../../chem/types';

const SUB: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };

export function chargeLabel(charge: number): string {
  if (charge === 0) return '';
  const sign = charge > 0 ? '+' : '−';
  return Math.abs(charge) === 1 ? sign : `${Math.abs(charge)}${sign}`;
}

/** Plain-text formula with Unicode sub/superscripts, e.g. "NH₄⁺" — for prompts and labels. */
export function formulaText(formula: string, charge = 0): string {
  const body = formula.replace(/\d/g, (d) => SUB[d]);
  if (!charge) return body;
  const c = `${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}`;
  return body + [...c].map((ch) => SUP[ch]).join('');
}

/** Hill-like formula for a builder species: central atom first, then ligands in order of appearance. */
export function formulaFromSpec(spec: MoleculeSpec): string {
  const order = [spec.central, ...spec.ligands.filter((l, i) => spec.ligands.indexOf(l) === i)];
  const counts = new Map<string, number>();
  for (const s of [spec.central, ...spec.ligands]) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...new Set(order)].map((el) => `${el}${counts.get(el)! > 1 ? counts.get(el) : ''}`).join('');
}

/** Formula with real <sub>/<sup>, isolated left-to-right inside Arabic text. */
export function Formula({ formula, charge = 0, className = '' }: { formula: string; charge?: number; className?: string }) {
  const parts = [...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)];
  return (
    <bdi dir="ltr" className={`whitespace-nowrap ${className}`}>
      {parts.map(([, el, n], i) => (
        <Fragment key={i}>
          {el}
          {n && <sub className="text-[0.72em]">{n}</sub>}
        </Fragment>
      ))}
      {charge !== 0 && <sup className="text-[0.72em]">{chargeLabel(charge)}</sup>}
    </bdi>
  );
}

/** Left-to-right isolate for codes such as AX3E or "F(ax)–S–F(eq)". */
export function Ltr({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  );
}

/** "AX3E2" with subscripts. */
export function Axe({ axe }: { axe: string }) {
  const m = /^AX(\d)(?:E(\d)?)?$/.exec(axe);
  if (!m) return <Ltr>{axe}</Ltr>;
  return (
    <bdi dir="ltr" className="whitespace-nowrap font-mono">
      AX<sub>{m[1]}</sub>
      {axe.includes('E') && (
        <>
          E{m[2] && <sub>{m[2]}</sub>}
        </>
      )}
    </bdi>
  );
}

export function hybridizationText(h: string): string {
  return { sp: 'sp', sp2: 'sp²', sp3: 'sp³', sp3d: 'sp³d', sp3d2: 'sp³d²' }[h] ?? h;
}
