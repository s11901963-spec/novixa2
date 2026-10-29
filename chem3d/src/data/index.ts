import elementsJson from './elements.json';
import moleculesJson from './molecules.json';
import referencesJson from './references.json';
import {
  elementsFileSchema,
  moleculesFileSchema,
  referencesFileSchema,
  type ElementData,
  type MoleculeData,
  type ProjectMethodData,
  type ReferenceData,
  type TopicData,
} from './schema';

export interface ChemDataset {
  elements: Map<string, ElementData>;
  molecules: MoleculeData[];
  moleculesById: Map<string, MoleculeData>;
  references: Map<string, ReferenceData>;
  topics: TopicData[];
  projectMethods: ProjectMethodData[];
  checkedOn: string;
}

/**
 * Validates the raw JSON files and the links between them (element symbols,
 * reference ids). Throws a readable error listing every problem, so a bad edit
 * to a data file fails loudly at start-up and in the test suite.
 */
export function buildDataset(rawElements: unknown, rawMolecules: unknown, rawReferences: unknown): ChemDataset {
  const el = elementsFileSchema.parse(rawElements);
  const mol = moleculesFileSchema.parse(rawMolecules);
  const ref = referencesFileSchema.parse(rawReferences);

  const problems: string[] = [];
  const elements = new Map(el.elements.map((e) => [e.symbol, e]));
  const references = new Map(ref.references.map((r) => [r.id, r]));
  if (elements.size !== el.elements.length) problems.push('duplicate element symbol');
  if (references.size !== ref.references.length) problems.push('duplicate reference id');

  const checkRefs = (where: string, ids: string[]) => {
    for (const id of ids) if (!references.has(id)) problems.push(`${where}: unknown reference "${id}"`);
  };

  const moleculesById = new Map<string, MoleculeData>();
  for (const m of mol.molecules) {
    if (moleculesById.has(m.id)) problems.push(`duplicate molecule id "${m.id}"`);
    moleculesById.set(m.id, m);
    for (const sym of [m.central, ...m.ligands]) {
      if (!elements.has(sym)) problems.push(`${m.id}: unknown element "${sym}"`);
    }
    if (m.reference) checkRefs(`${m.id}.reference`, m.reference.sources);
    if (m.experimental) {
      checkRefs(`${m.id}.experimental`, m.experimental.sources);
      for (const b of m.experimental.bondLengths) {
        if (!m.ligands.includes(b.ligand)) problems.push(`${m.id}: bond length for absent ligand "${b.ligand}"`);
      }
    }
    for (const n of m.notes) checkRefs(`${m.id}.notes.${n.id}`, n.sources);
  }
  for (const t of ref.topics) checkRefs(`topic ${t.id}`, t.references);

  if (problems.length) throw new Error(`Chem3D data is invalid:\n- ${problems.join('\n- ')}`);

  return {
    elements,
    molecules: mol.molecules,
    moleculesById,
    references,
    topics: ref.topics,
    projectMethods: ref.projectMethods,
    checkedOn: ref.checkedOn,
  };
}

export const dataset: ChemDataset = buildDataset(elementsJson, moleculesJson, referencesJson);

export function getElement(symbol: string): ElementData {
  const e = dataset.elements.get(symbol);
  if (!e) throw new Error(`Unknown element ${symbol}`);
  return e;
}

export function getMolecule(id: string): MoleculeData | undefined {
  return dataset.moleculesById.get(id);
}

export type { ElementData, ExperimentalData, MoleculeData, ReferenceData, TopicData, ProjectMethodData } from './schema';
