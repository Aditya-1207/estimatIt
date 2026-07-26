import type { MeasurementBlockWithDetails } from "../api/measurements";
import type { ExportWarning } from "./types";

/**
 * Format a number to 2 decimal places with Indian-style commas.
 * Uses the "en-IN" locale for standard Indian comma placement (e.g. 1,00,000.00).
 */
export function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number as Rs. currency.
 * Using "Rs. " instead of the "₹" symbol ensures compatibility with jsPDF's
 * standard ASCII fonts, preventing rendering artifacts.
 */
export function fmtCurrency(n: number, decimals = 2): string {
  return `Rs. ${fmt(n, decimals)}`;
}

/**
 * Calculate the scalar quantity for a single dimension row.
 * Multiplies Number × Length × Breadth × Depth. Zero values are ignored (treated as 1).
 */
export function rowQuantity(dr: {
  number: number;
  length: number;
  breadth: number;
  depth: number;
}): number {
  let q = 1;
  let hasValue = false;
  if (dr.number > 0)  { q *= dr.number;  hasValue = true; }
  if (dr.length > 0)  { q *= dr.length;  hasValue = true; }
  if (dr.breadth > 0) { q *= dr.breadth; hasValue = true; }
  if (dr.depth > 0)   { q *= dr.depth;   hasValue = true; }
  return hasValue ? q : 0;
}

/**
 * Compute the total quantity for an entire block (sum of all dimension row quantities).
 */
export function blockQuantityTotal(block: MeasurementBlockWithDetails): number {
  let total = 0;
  for (const mi of block.major_items) {
    for (const dr of mi.dimension_rows) {
      total += rowQuantity(dr);
    }
  }
  return total;
}

/**
 * Get block metadata (description, itemNo, unit, rate), handling both
 * standard SSR items and Custom items seamlessly.
 */
export function blockMeta(block: MeasurementBlockWithDetails) {
  const isCustom = !block.ssr_item_id;
  return {
    isCustom,
    description: isCustom
      ? (block.custom_description ?? "—")
      : (block.ssr_item?.description ?? "—"),
    itemNo: isCustom ? "Custom" : (block.ssr_item?.item_no ?? "—"),
    unit: isCustom ? (block.custom_unit ?? "—") : (block.ssr_item?.unit ?? "—"),
    rate: isCustom
      ? (block.custom_rate ?? 0)
      : (block.ssr_item?.completed_rate_inr ?? 0),
  };
}

/**
 * Run pre-export validation across all blocks.
 * Returns an array of warnings (empty = all good).
 */
export function validateForExport(
  blocks: MeasurementBlockWithDetails[],
): ExportWarning[] {
  const warnings: ExportWarning[] = [];

  for (const block of blocks) {
    const label = block.ssr_item_id
      ? `[${block.ssr_item?.item_no}] ${block.ssr_item?.description?.slice(0, 50)}`
      : block.custom_description || "Untitled block";

    if (!block.ssr_item_id && !block.custom_description) {
      warnings.push({
        blockSequence: block.sequence_number,
        blockLabel: label,
        message: "Missing SSR item assignment or custom description",
      });
    }

    const totalRows = block.major_items.reduce(
      (sum, mi) => sum + mi.dimension_rows.length,
      0,
    );
    if (totalRows === 0) {
      warnings.push({
        blockSequence: block.sequence_number,
        blockLabel: label,
        message: "No dimension rows — block will appear empty in export",
      });
    }
  }

  return warnings;
}
