import { z } from "zod";

export const specificationInputSchema = z.object({
  capabilityId: z.string().min(1).max(1000),
  changeId: z.string().min(1).max(1000).optional(),
});
export const specificationEntrySchema = z.object({
  id: z.string(),
  mainPath: z.string().nullable(),
  changes: z.array(z.object({
    changeId: z.string(), path: z.string(),
    status: z.enum(["added", "modified", "unknown"]),
    error: z.string().nullable(),
  })),
});
export const specificationCatalogSchema = z.object({
  entries: z.array(specificationEntrySchema),
  missing: z.boolean(), watchError: z.string().nullable(),
});
export const issueCodes = ["structure", "duplicate", "missing", "baseline", "ambiguous"] as const;
export const projectionIssueSchema = z.object({ code: z.enum(issueCodes), target: z.string() });
export const comparisonBlockSchema = z.object({
  name: z.string(), previousName: z.string().nullable(),
  operation: z.enum(["unchanged", "added", "modified", "removed", "renamed"]),
  before: z.string().nullable(), after: z.string().nullable(),
});
export const specificationDocumentSchema = z.object({
  capabilityId: z.string(),
  main: z.object({ content: z.string(), path: z.string() }).nullable(),
  delta: z.object({ content: z.string(), path: z.string(), changeId: z.string() }).nullable(),
  readErrors: z.array(z.object({ path: z.string(), message: z.string() })),
  proposed: z.string().nullable(),
  blocks: z.array(comparisonBlockSchema), issues: z.array(projectionIssueSchema),
});
export type SpecificationEntry = z.infer<typeof specificationEntrySchema>;
export type SpecificationCatalog = z.infer<typeof specificationCatalogSchema>;
export type SpecificationDocument = z.infer<typeof specificationDocumentSchema>;
export type ProjectionIssue = z.infer<typeof projectionIssueSchema>;
export type ComparisonBlock = z.infer<typeof comparisonBlockSchema>;

/** A capability id is its complete relative directory; archives are not pending work. */
export function specificationPath(file: string): { id: string; changeId: string | null } | null {
  const main = /^specs\/(.+)\/spec\.md$/.exec(file);
  if (main) return { id: main[1], changeId: null };
  const delta = /^changes\/([^/]+)\/specs\/(.+)\/spec\.md$/.exec(file);
  return delta && delta[1] !== "archive" ? { id: delta[2], changeId: delta[1] } : null;
}
