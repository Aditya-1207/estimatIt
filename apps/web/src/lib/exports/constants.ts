/**
 * Shared constants and design tokens for Excel and PDF exports.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EXCEL SPECIFIC CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const EXCEL_FONT_NAME = "Calibri";
export const EXCEL_FONT_SIZE = 11;

/** Approximate points per line of wrapped text at Calibri 11pt. */
export const EXCEL_POINTS_PER_LINE = 15;

/**
 * Hardcoded column width budgets for Excel A4 Landscape (~130 char-unit budget).
 * 8-column layout:
 *   A(7) + B(22) + C(30) + D(8) + E(12) + F(12) + G(12) + H(14) = 117
 */
export const EXCEL_COL_WIDTHS = {
  srNo: 7,              // A
  majorDesc: 22,        // B
  minorDesc: 30,        // C
  no: 8,               // D
  length: 12,          // E
  breadth: 12,         // F
  depth: 12,           // G
  quantity: 14,        // H
} as const;

/** Sum of all column widths — used for merged-header height calculations. */
export const EXCEL_TOTAL_COL_WIDTH = Object.values(EXCEL_COL_WIDTHS).reduce((a, b) => a + b, 0);

/** Pre-computed merged-range widths for row-height calculations. */
export const EXCEL_MERGED_BH_WIDTH =
  EXCEL_COL_WIDTHS.majorDesc + EXCEL_COL_WIDTHS.minorDesc + EXCEL_COL_WIDTHS.no +
  EXCEL_COL_WIDTHS.length + EXCEL_COL_WIDTHS.breadth + EXCEL_COL_WIDTHS.depth + EXCEL_COL_WIDTHS.quantity;

export const EXCEL_MERGED_AG_WIDTH =
  EXCEL_COL_WIDTHS.srNo + EXCEL_COL_WIDTHS.majorDesc + EXCEL_COL_WIDTHS.minorDesc +
  EXCEL_COL_WIDTHS.no + EXCEL_COL_WIDTHS.length + EXCEL_COL_WIDTHS.breadth + EXCEL_COL_WIDTHS.depth;

/** Thin black border applied to every cell in Excel. */
export const EXCEL_THIN_BORDER = {
  top:    { style: "thin", color: { argb: "FF000000" } },
  left:   { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right:  { style: "thin", color: { argb: "FF000000" } },
} as any; // Cast as any here to avoid ExcelJS typings in pure constants file, or let TS infer.

/** Standard print margins for Excel (~0.7 in / 18 mm). */
export const EXCEL_PRINT_MARGINS = {
  left: 0.7,
  right: 0.7,
  top: 0.75,
  bottom: 0.75,
  header: 0.3,
  footer: 0.3,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PDF SPECIFIC CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PDF_FONT_SIZE = 9;
export const PDF_FONT_SIZE_HEADER = 14;
export const PDF_FONT_SIZE_SUBHEADER = 10;

/** Page margins in mm (A4 portrait = 210×297 mm). */
export const PDF_MARGINS = { top: 15, right: 10, bottom: 20, left: 10 };

/** Colors used throughout the PDF (RGB). */
export const PDF_COLORS = {
  primary: [30, 64, 175] as [number, number, number],       // blue-800
  headerBg: [240, 244, 255] as [number, number, number],    // blue-50
  colHeaderBg: [232, 237, 245] as [number, number, number], // slate-200
  subtotalBg: [255, 249, 219] as [number, number, number],  // yellow-50
  grandTotalBg: [240, 253, 244] as [number, number, number],// green-50
  black: [0, 0, 0] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
};
