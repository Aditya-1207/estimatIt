import { z } from "zod";

export const recapitulationItemSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  description: z.string().min(1, "Description is required"),
  percentage: z.number().min(0, "Percentage must be ≥ 0"),
  sequence_number: z.number().int().positive(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type RecapitulationItem = z.infer<typeof recapitulationItemSchema>;

export const createRecapItemSchema = recapitulationItemSchema.pick({
  project_id: true,
  description: true,
  percentage: true,
  sequence_number: true,
});

export type CreateRecapItemInput = z.infer<typeof createRecapItemSchema>;

export const updateRecapItemSchema = z.object({
  description: z.string().min(1).optional(),
  percentage: z.number().min(0).optional(),
  sequence_number: z.number().int().positive().optional(),
});

export type UpdateRecapItemInput = z.infer<typeof updateRecapItemSchema>;
