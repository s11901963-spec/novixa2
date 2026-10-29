import atomsJson from './atoms.json';
import { atomsFileSchema, type AtomData } from './schema';

export interface AtomDataset {
  list: AtomData[];
  byZ: Map<number, AtomData>;
  bySymbol: Map<string, AtomData>;
  source: string;
  retrievedOn: string;
}

/** Validates atoms.json (unique, consecutive atomic numbers starting at 1). */
export function buildAtoms(raw: unknown): AtomDataset {
  const file = atomsFileSchema.parse(raw);
  const problems: string[] = [];
  file.atoms.forEach((a, i) => {
    if (a.z !== i + 1) problems.push(`atom #${i + 1} has z=${a.z} (atomic numbers must be consecutive from 1)`);
  });
  const bySymbol = new Map(file.atoms.map((a) => [a.symbol, a]));
  if (bySymbol.size !== file.atoms.length) problems.push('duplicate element symbol');
  if (problems.length) throw new Error(`Chem3D atoms.json is invalid:\n- ${problems.join('\n- ')}`);
  return {
    list: file.atoms,
    byZ: new Map(file.atoms.map((a) => [a.z, a])),
    bySymbol,
    source: file.source,
    retrievedOn: file.retrievedOn,
  };
}

export const atoms: AtomDataset = buildAtoms(atomsJson);

export function getAtom(z: number): AtomData {
  const a = atoms.byZ.get(z);
  if (!a) throw new Error(`No atom data for Z=${z}`);
  return a;
}

export type { AtomData } from './schema';
