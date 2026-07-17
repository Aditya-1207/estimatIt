import { supabase } from "../supabase";
import type {
  RecapitulationItem,
  CreateRecapItemInput,
  UpdateRecapItemInput,
} from "@estimatit/shared";

// ─── Default items seeded on first open ──────────────────────────────────────

export const DEFAULT_RECAP_ITEMS: Omit<
  CreateRecapItemInput,
  "project_id"
>[] = [
  { description: "Work portion",                               type: "abstract_total", percentage: 0,  amount: 0, sequence_number: 1 },
  { description: "Quality control charges as per statement",   type: "lump_sum",       percentage: 0,  amount: 0, sequence_number: 2 },
  { description: "Royalty charges as per statement",           type: "lump_sum",       percentage: 0,  amount: 0, sequence_number: 3 },
  { description: "Insurance 1.0%",                             type: "percentage",     percentage: 1,  amount: 0, sequence_number: 4 },
  { description: "G.S.T. 18%",                                 type: "percentage",     percentage: 18, amount: 0, sequence_number: 5 },
  { description: "Technical sanction amount",                  type: "rounded_total",  percentage: 0,  amount: 0, sequence_number: 6 },
];

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all recapitulation items for a project, ordered by sequence_number.
 */
export async function getRecapItems(
  projectId: string,
): Promise<RecapitulationItem[]> {
  const { data, error } = await supabase
    .from("recapitulation_items")
    .select("*")
    .eq("project_id", projectId)
    .order("sequence_number", { ascending: true });

  if (error) {
    console.error("Error fetching recap items:", error);
    throw error;
  }

  return data as RecapitulationItem[];
}

/**
 * Insert a single recapitulation item.
 */
export async function createRecapItem(
  input: CreateRecapItemInput,
): Promise<RecapitulationItem> {
  const { data, error } = await supabase
    .from("recapitulation_items")
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("Error creating recap item:", error);
    throw error;
  }

  return data as RecapitulationItem;
}

/**
 * Update a recap item.
 */
export async function updateRecapItem(
  id: string,
  input: UpdateRecapItemInput,
): Promise<RecapitulationItem> {
  const { data, error } = await supabase
    .from("recapitulation_items")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating recap item:", error);
    throw error;
  }

  return data as RecapitulationItem;
}

/**
 * Delete a recapitulation item.
 */
export async function deleteRecapItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("recapitulation_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting recap item:", error);
    throw error;
  }
}

/**
 * Seed the default recap items for a project.
 */
export async function seedDefaultRecapItems(
  projectId: string,
): Promise<RecapitulationItem[]> {
  const inserts = DEFAULT_RECAP_ITEMS.map((item) => ({
    ...item,
    project_id: projectId,
  }));

  const { data, error } = await supabase
    .from("recapitulation_items")
    .insert(inserts)
    .select()
    .order("sequence_number", { ascending: true });

  if (error) {
    console.error("Error seeding recap items:", error);
    throw error;
  }

  return data as RecapitulationItem[];
}
