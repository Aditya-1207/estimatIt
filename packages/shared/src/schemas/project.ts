import { z } from "zod";

export const projectSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(3, "Project name must be at least 3 characters").max(255),
  work_order_no: z.string().max(100).optional().nullable(),
  is_template: z.boolean(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = projectSchema.pick({
  name: true,
  work_order_no: true,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
