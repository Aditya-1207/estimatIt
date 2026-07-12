import { supabase } from "../supabase";
import type { 
  MeasurementBlock, 
  MajorItem, 
  DimensionRow,
  SSRItem,
  CreateMeasurementBlockInput,
  CreateMajorItemInput,
  CreateDimensionRowInput,
  UpdateMeasurementBlockInput,
  UpdateMajorItemInput,
  UpdateDimensionRowInput
} from "@estimatit/shared";

// Extended types for the hierarchical data
export interface DimensionRowWithMeta extends DimensionRow {}

export interface MajorItemWithDimensions extends MajorItem {
  dimension_rows: DimensionRowWithMeta[];
}

export interface MeasurementBlockWithDetails extends MeasurementBlock {
  ssr_item: SSRItem | null;
  major_items: MajorItemWithDimensions[];
}

/**
 * Fetch the complete measurement sheet hierarchy for a project.
 */
export async function getMeasurementSheet(projectId: string): Promise<MeasurementBlockWithDetails[]> {
  const { data, error } = await supabase
    .from("measurement_blocks")
    .select(`
      *,
      ssr_item:ssr_items(*),
      major_items(
        *,
        dimension_rows(*)
      )
    `)
    .eq("project_id", projectId)
    .order("sequence_number", { ascending: true });

  if (error) {
    console.error("Error fetching measurement sheet:", error);
    throw error;
  }

  // Supabase doesn't natively order nested relations reliably without explicit modifiers 
  // in the query string, which can be tricky. We'll sort them in memory just to be safe.
  const blocks = (data as unknown) as MeasurementBlockWithDetails[];
  
  return blocks.map(block => ({
    ...block,
    major_items: (block.major_items || [])
      .sort((a, b) => a.sequence_number - b.sequence_number)
      .map(mi => ({
        ...mi,
        dimension_rows: (mi.dimension_rows || []).sort((a, b) => a.sequence_number - b.sequence_number)
      }))
  }));
}

// ── Measurement Blocks ──────────────────────────────────────────────────────

export async function createMeasurementBlock(input: CreateMeasurementBlockInput): Promise<MeasurementBlock> {
  const { data, error } = await supabase
    .from("measurement_blocks")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as MeasurementBlock;
}

export async function updateMeasurementBlock(id: string, input: UpdateMeasurementBlockInput): Promise<MeasurementBlock> {
  const { data, error } = await supabase
    .from("measurement_blocks")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MeasurementBlock;
}

export async function deleteMeasurementBlock(id: string): Promise<void> {
  const { error } = await supabase.from("measurement_blocks").delete().eq("id", id);
  if (error) throw error;
}

// ── Major Items ─────────────────────────────────────────────────────────────

export async function createMajorItem(input: CreateMajorItemInput): Promise<MajorItem> {
  const { data, error } = await supabase
    .from("major_items")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as MajorItem;
}

export async function updateMajorItem(id: string, input: UpdateMajorItemInput): Promise<MajorItem> {
  const { data, error } = await supabase
    .from("major_items")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MajorItem;
}

export async function deleteMajorItem(id: string): Promise<void> {
  const { error } = await supabase.from("major_items").delete().eq("id", id);
  if (error) throw error;
}

// ── Dimension Rows ──────────────────────────────────────────────────────────

export async function createDimensionRow(input: CreateDimensionRowInput): Promise<DimensionRow> {
  const { data, error } = await supabase
    .from("dimension_rows")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as DimensionRow;
}

export async function updateDimensionRow(id: string, input: UpdateDimensionRowInput): Promise<DimensionRow> {
  const { data, error } = await supabase
    .from("dimension_rows")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DimensionRow;
}

export async function deleteDimensionRow(id: string): Promise<void> {
  const { error } = await supabase.from("dimension_rows").delete().eq("id", id);
  if (error) throw error;
}
