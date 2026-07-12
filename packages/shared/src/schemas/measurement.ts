import { z } from "zod";

export const measurementBlockSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  sequence_number: z.number().int().min(1),
  ssr_item_id: z.string().uuid().optional().nullable(),
  custom_description: z.string().optional().nullable(),
  custom_rate: z.number().optional().nullable(),
  custom_unit: z.string().optional().nullable(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type MeasurementBlock = z.infer<typeof measurementBlockSchema>;

export const majorItemSchema = z.object({
  id: z.string().uuid(),
  block_id: z.string().uuid(),
  description: z.string(),
  sequence_number: z.number().int().min(1),
  created_at: z.union([z.string(), z.date()]),
});

export type MajorItem = z.infer<typeof majorItemSchema>;

export const dimensionRowSchema = z.object({
  id: z.string().uuid(),
  major_item_id: z.string().uuid(),
  description: z.string(),
  sequence_number: z.number().int().min(1),
  number: z.number(),
  length: z.number(),
  breadth: z.number(),
  depth: z.number(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type DimensionRow = z.infer<typeof dimensionRowSchema>;

// Inputs for creating
export const createMeasurementBlockSchema = measurementBlockSchema.pick({
  project_id: true,
  sequence_number: true,
  ssr_item_id: true,
  custom_description: true,
  custom_rate: true,
  custom_unit: true,
});
export type CreateMeasurementBlockInput = z.infer<typeof createMeasurementBlockSchema>;

export const createMajorItemSchema = majorItemSchema.pick({
  block_id: true,
  description: true,
  sequence_number: true,
});
export type CreateMajorItemInput = z.infer<typeof createMajorItemSchema>;

export const createDimensionRowSchema = dimensionRowSchema.pick({
  major_item_id: true,
  description: true,
  sequence_number: true,
  number: true,
  length: true,
  breadth: true,
  depth: true,
});
export type CreateDimensionRowInput = z.infer<typeof createDimensionRowSchema>;

// Input for updating
export const updateMeasurementBlockSchema = createMeasurementBlockSchema.partial().omit({ project_id: true });
export type UpdateMeasurementBlockInput = z.infer<typeof updateMeasurementBlockSchema>;

export const updateMajorItemSchema = createMajorItemSchema.partial().omit({ block_id: true });
export type UpdateMajorItemInput = z.infer<typeof updateMajorItemSchema>;

export const updateDimensionRowSchema = createDimensionRowSchema.partial().omit({ major_item_id: true });
export type UpdateDimensionRowInput = z.infer<typeof updateDimensionRowSchema>;
