import { supabase } from "../supabase";
import { type SSRVersion, type SSRItem } from "@estimatit/shared";

/**
 * Fetches the active SSR version (or the most recent one).
 */
export async function getActiveSSRVersion(): Promise<SSRVersion | null> {
  const { data, error } = await supabase
    .from("ssr_versions")
    .select("*")
    .eq("is_active", true)
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching active SSR version:", error);
    throw error;
  }

  return data as SSRVersion | null;
}

/**
 * Fetches SSR items, optionally filtered by a search query (item_no or description)
 */
export async function getSSRItems(
  versionId: string,
  searchQuery?: string,
  limit: number = 50
): Promise<SSRItem[]> {
  let query = supabase
    .from("ssr_items")
    .select("*")
    .eq("ssr_version_id", versionId)
    .order("sr_no", { ascending: true })
    .limit(limit);

  if (searchQuery) {
    // ilike for partial matches on item_no, description, or chapter
    query = query.or(
      `item_no.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,chapter.ilike.%${searchQuery}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching SSR items:", error);
    throw error;
  }

  return data as SSRItem[];
}

/**
 * Fetches distinct chapters for the active version (for category filtering)
 */
export async function getSSRChapters(versionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("ssr_items")
    .select("chapter")
    .eq("ssr_version_id", versionId)
    .order("chapter", { ascending: true });

  if (error) {
    console.error("Error fetching SSR chapters:", error);
    throw error;
  }

  // Deduplicate on the client side
  const unique = [...new Set((data || []).map((d: any) => d.chapter))];
  return unique;
}
