import { z } from 'zod';

export const ELECTRON_GEOMETRIES = [
  'linear',
  'trigonal-planar',
  'tetrahedral',
  'trigonal-bipyramidal',
  'octahedral',
] as const;

export const MOLECULAR_GEOMETRIES = [
  'linear',
  'trigonal-planar',
  'bent',
  'tetrahedral',
  'trigonal-pyramidal',
  'trigonal-bipyramidal',
  'seesaw',
  't-shaped',
  'octahedral',
  'square-pyramidal',
  'square-planar',
] as const;

export const HYBRIDIZATIONS = ['sp', 'sp2', 'sp3', 'sp3d', 'sp3d2'] as const;

const localized = z.object({ ar: z.string().min(1), en: z.string().min(1) });

export const elementSchema = z.object({
  symbol: z.string().regex(/^[A-Z][a-z]?$/),
  atomicNumber: z.number().int().positive(),
  name: localized,
  group: z.number().int().min(1).max(18),
  period: z.number().int().min(1).max(7),
  valenceElectrons: z.number().int().min(1).max(8),
  electronConfiguration: z.string().min(1),
  atomicMass: z.number().positive(),
  electronegativity: z.number().positive(),
  covalentRadiusPm: z.number().positive(),
  vdwRadiusPm: z.number().positive(),
  vdwSource: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const elementsFileSchema = z.object({
  elements: z.array(elementSchema).min(1),
});

const ligandRole = z.enum(['axial', 'equatorial', 'apical', 'basal']);

export const experimentalSchema = z.object({
  phase: z.literal('gas'),
  pointGroup: z.string().min(1),
  bondLengths: z
    .array(
      z.object({
        ligand: z.string(),
        role: ligandRole.optional(),
        value: z.number().positive().max(4),
        structure: z.enum(['re', 'r0']).optional(),
      }),
    )
    .min(1),
  angles: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.number().gt(0).lte(180),
        basis: z.enum(['measured', 'symmetry', 'derived']),
      }),
    )
    .min(1),
  // Parameters used to build 3D coordinates from the measured values.
  // Allowed keys depend on the molecular geometry (see chem/geometry.ts).
  angleParams: z.record(z.string(), z.number().gt(0).lte(180)),
  sources: z.array(z.string()).min(1),
});

export const moleculeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  formula: z.string().regex(/^([A-Z][a-z]?\d*)+$/),
  charge: z.number().int().min(-3).max(3),
  name: localized,
  category: z.enum(['core', 'extended', 'ion']),
  central: z.string(),
  ligands: z.array(z.string()).min(2).max(6),
  reference: z
    .object({
      axe: z.string().regex(/^AX\d(E\d?)?$/),
      electronGeometry: z.enum(ELECTRON_GEOMETRIES),
      molecularGeometry: z.enum(MOLECULAR_GEOMETRIES),
      hybridization: z.enum(HYBRIDIZATIONS),
      sources: z.array(z.string()),
    })
    .optional(),
  experimental: experimentalSchema.optional(),
  /** The row of the course textbook's Table 6-4, copied as printed (compared with the engine, never used in calculations). */
  textbook: z
    .object({
      table: z.string().min(1),
      page: z.number().int().positive(),
      order: z.number().int().positive(),
      totalPairs: z.number().int().min(2).max(6),
      sharedPairs: z.number().int().min(1).max(6),
      lonePairs: z.number().int().min(0).max(4),
      hybridization: z.enum(HYBRIDIZATIONS),
      geometry: z.enum(MOLECULAR_GEOMETRIES),
      shape: localized,
      angles: z.array(z.number().gt(0).lte(180)).min(1),
    })
    .optional(),
  notes: z.array(
    z.object({
      id: z.string(),
      text: localized,
      sources: z.array(z.string()),
    }),
  ),
});

export const moleculesFileSchema = z.object({
  molecules: z.array(moleculeSchema).min(1),
});

export const referenceSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['article', 'book', 'textbook', 'school-textbook', 'database']),
    // Empty only for a source whose authors are unknown (the course textbook pages); it then needs a label.
    authors: z.array(z.string()),
    /** Short citation label, used instead of "Author year". */
    label: localized.optional(),
    title: z.string().min(1),
    container: z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    pages: z.string().optional(),
    year: z.number().int().min(1800).max(2100).optional(),
    doi: z.string().regex(/^10\.\d{4,9}\/\S+$/).optional(),
    url: z.string().url().optional(),
    verification: z.object({
      status: z.enum(['verified', 'cited', 'needs-review']),
      scope: z.enum(['metadata', 'abstract', 'page', 'cited']),
      method: z.string().min(1),
    }),
  })
  .refine((r) => r.authors.length > 0 || !!r.label, { message: 'a reference without authors needs a label' });

export const topicSchema = z.object({
  id: z.string(),
  kind: z.literal('established'),
  title: localized,
  summary: localized,
  supports: localized,
  limits: localized,
  references: z.array(z.string()).min(1),
});

export const projectMethodSchema = z.object({
  id: z.string(),
  title: localized,
  description: localized,
});

export const referencesFileSchema = z.object({
  checkedOn: z.string(),
  references: z.array(referenceSchema).min(1),
  topics: z.array(topicSchema),
  projectMethods: z.array(projectMethodSchema),
});

export const atomSchema = z.object({
  z: z.number().int().min(1).max(118),
  symbol: z.string().regex(/^[A-Z][a-z]?$/),
  name: localized,
  // Ground-state configuration exactly as NIST ASD prints it, e.g. "[Ar].3d5.4s".
  groundState: z.string().regex(/^(\[[A-Z][a-z]?\]\.)?\d[spdf]\d*(\.\d[spdf]\d*)*$/),
});

export const atomsFileSchema = z.object({
  source: z.string().min(1),
  retrievedOn: z.string().min(1),
  query: z.string().url(),
  atoms: z.array(atomSchema).min(1),
});

export type LocalizedText = z.infer<typeof localized>;
export type AtomData = z.infer<typeof atomSchema>;
export type ElementData = z.infer<typeof elementSchema>;
export type MoleculeData = z.infer<typeof moleculeSchema>;
export type ExperimentalData = z.infer<typeof experimentalSchema>;
export type ReferenceData = z.infer<typeof referenceSchema>;
export type TopicData = z.infer<typeof topicSchema>;
export type ProjectMethodData = z.infer<typeof projectMethodSchema>;
export type LigandRole = z.infer<typeof ligandRole>;
