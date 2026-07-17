import { supabase } from "../supabase";
import type { Project, CreateProjectInput, UpdateProjectInput } from "@estimatit/shared";

/**
 * Fetch all projects for the authenticated user, ordered by most recently updated.
 */
export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }

  return data as Project[];
}

/**
 * Fetch a single project by ID.
 */
export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching project:", error);
    throw error;
  }

  return data as Project | null;
}

/**
 * Create a new project.
 * Note: RLS ensures user_id matches auth.uid(), which Supabase handles via JWT.
 * But we need to supply the user_id in the payload or via default.
 * Actually, our schema requires user_id. We'll get it from auth.
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...input,
      user_id: user.id,
      is_template: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    throw error;
  }

  return data as Project;
}

/**
 * Update an existing project's metadata.
 */
export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating project:", error);
    throw error;
  }

  return data as Project;
}

/**
 * Delete a project.
 * Supabase ON DELETE CASCADE will handle related measurement blocks.
 */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

/**
 * Mark a project as a template.
 */
export async function markAsTemplate(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ is_template: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error marking project as template:", error);
    throw error;
  }

  return data as Project;
}

/**
 * Clone a project as a template.
 */
export async function cloneProject(
  sourceProjectId: string,
  newName: string,
  newWorkOrderNo: string
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("clone_project_as_template", {
    source_project_id: sourceProjectId,
    new_name: newName,
    new_work_order_no: newWorkOrderNo,
    user_id: user.id
  });

  if (error) {
    console.error("Error cloning project:", error);
    throw error;
  }

  return data as string; // returns the new project ID
}
