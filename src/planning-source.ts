import { z } from "zod";

export const storeIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
export const sourceSelectionSchema = z.object({
  storeId: storeIdSchema.nullable().optional(),
});
export const planningSourceSchema = z.object({
  storeId: storeIdSchema.nullable(),
  rootPath: z.string().min(1),
});
export type PlanningSource = z.infer<typeof planningSourceSchema>;
export const planningCatalogSchema = z.object({
  stores: z.array(z.object({ id: storeIdSchema })),
  warning: z.string().nullable(),
});
export type PlanningCatalog = z.infer<typeof planningCatalogSchema>;
