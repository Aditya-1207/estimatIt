import { z } from "zod";

export const ssrVersionSchema = z.object({
  id: z.string().uuid(),
  version: z.string(),
  description: z.string().optional().nullable(),
  effective_date: z.union([z.string(), z.date()]), // Can be string from JSON or Date object
  is_active: z.boolean(),
  total_items: z.number(),
  source_file: z.string().optional().nullable(),
  document_title: z.string().optional().nullable(),
  source_pdf_pages: z.string().optional().nullable(),
  field_reference: z.record(z.string()).optional().nullable(),
  known_data_quirks: z.array(z.string()).optional().nullable(),
  created_at: z.union([z.string(), z.date()]),
});

export type SSRVersion = z.infer<typeof ssrVersionSchema>;

export const ssrItemSchema = z.object({
  id: z.string().uuid(),
  sr_no: z.number().nullable(),
  chapter: z.string(),
  item_no: z.string(),
  reference_no: z.string().optional().nullable(),
  description: z.string(),
  additional_specification: z.string().optional().nullable(),
  unit: z.string(),
  completed_rate_inr: z.number().nullable(),
  labour_rate_inr: z.number().nullable(),
  source_page: z.number().nullable(),
  ssr_version_id: z.string().uuid(),
  created_at: z.union([z.string(), z.date()]),
});

export type SSRItem = z.infer<typeof ssrItemSchema>;
