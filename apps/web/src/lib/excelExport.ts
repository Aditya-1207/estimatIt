/**
 * Excel export engine — generates a government-format `.xlsx` file using
 * ExcelJS entirely on the client side.
 *
 * Output mirrors the Maharashtra PWD estimation format:
 *
 *   Sheet 1: "Measurement Sheet"
 *     Header rows → Column headers →
 *       [SSR block → major items → dimension rows → subtotal] … → Grand Total
 *
 *   Sheet 2: "Abstract"
 *     One row per SSR block: Unit | Qty | Item No | Item | Rate (₹) | Amount (₹)
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  PRINT & LAYOUT RULES ENFORCED
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  1. PAGE SETUP — A4 (code 9), Landscape, fitToWidth=1 / fitToHeight=0,
 *     margins ~0.7 inches.
 *
 *  2. HARDCODED COLUMN WIDTHS — Total ≈ 118 character units (within ~130
 *     landscape budget).  Description gets 50 units.  Never rely on default
 *     widths.
 *
 *  3. TEXT WRAPPING & AUTOFIT — wrapText: true on all cells that contain
 *     multi-line text.  Dimension rows (un-merged) have NO hardcoded row
 *     heights so Excel's native AutoFit stretches them dynamically.
 *
 *  4. MERGED CELLS WITH HEIGHT FALLBACK — Merging is used where the
 *     government format requires it (SSR item rows B:G, major item rows
 *     B:G, subtotal rows A:F, grand total A:F).  Since Excel AutoFit
 *     fails on merged cells, calculateMergedRowHeight() computes explicit
 *     heights based on character count and line breaks (~15 pt/line).
 *     Dimension rows are NEVER merged — they use individual cells.
 */
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Project } from "@estimatit/shared";
import type { MeasurementBlockWithDetails } from "./api/measurements";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONSTANTS & CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FONT_NAME = "Calibri";
const FONT_SIZE = 11;

/** Approximate points per line of wrapped text at Calibri 11pt. */
const POINTS_PER_LINE = 15;

/**
 * Hardcoded column width budgets for A4 Landscape (~130 char-unit budget).
 * 8-column layout:
 *   A(7) + B(22) + C(30) + D(8) + E(12) + F(12) + G(12) + H(14) = 117
 *
 *   A = Sr No
 *   B = Major Item description (e.g., "Gents Toilet")
 *   C = Minor Item description (e.g., "Septic Tank")
 *   D = No
 *   E = Length
 *   F = Breadth
 *   G = Depth/Height
 *   H = Quantity
 */
const COL_WIDTHS = {
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
const TOTAL_COL_WIDTH = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

/**
 * Pre-computed merged-range widths for row-height calculations.
 *   B:H merge (SSR item rows) spans cols B–H = 110 char units
 *   A:G merge (subtotal / grand total)   = 103 char units
 */
const MERGED_BH_WIDTH =
  COL_WIDTHS.majorDesc + COL_WIDTHS.minorDesc + COL_WIDTHS.no +
  COL_WIDTHS.length + COL_WIDTHS.breadth + COL_WIDTHS.depth + COL_WIDTHS.quantity;

const MERGED_AG_WIDTH =
  COL_WIDTHS.srNo + COL_WIDTHS.majorDesc + COL_WIDTHS.minorDesc +
  COL_WIDTHS.no + COL_WIDTHS.length + COL_WIDTHS.breadth + COL_WIDTHS.depth;

/** Thin black border applied to every cell. */
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: "FF000000" } },
  left:   { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right:  { style: "thin", color: { argb: "FF000000" } },
};

/** Standard print margins (~0.7 in / 18 mm). */
const PRINT_MARGINS = {
  left: 0.7,
  right: 0.7,
  top: 0.75,
  bottom: 0.75,
  header: 0.3,
  footer: 0.3,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Calculate quantity for a single dimension row. */
function rowQuantity(dr: {
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
 * Calculate an explicit row height for MERGED cells.
 *
 * Excel's native AutoFit does NOT work on merged cells, so we must compute
 * the height manually.  Rule of thumb: ~15 points per line of wrapped text.
 *
 * @param text             Full text content of the cell
 * @param mergedWidthChars Total width of the merged range (Excel char units)
 * @param fontSize         Font size in points (default 11)
 * @returns                Row height in points
 */
function calculateMergedRowHeight(
  text: string,
  mergedWidthChars: number,
  fontSize: number = FONT_SIZE,
): number {
  const scaleFactor = fontSize / 11; // relative to Calibri 11pt baseline
  // Characters that fit per line ≈ merged width minus cell padding, adjusted
  // for the font-size scale.
  const charsPerLine = Math.max(1, Math.floor((mergedWidthChars - 4) / scaleFactor));

  let totalLines = 0;
  for (const segment of text.split("\n")) {
    totalLines += Math.max(1, Math.ceil((segment.length || 1) / charsPerLine));
  }

  const lineHeight = POINTS_PER_LINE * scaleFactor;
  // Add a small padding (4 pt) for breathing room
  return Math.max(lineHeight + 4, totalLines * lineHeight + 4);
}

/**
 * Apply base styling (font, border, optional fill) to all 7 cells of a row.
 * Call BEFORE setting per-cell overrides (alignment, numFmt, value, etc.).
 */
function styleRowBase(
  row: ExcelJS.Row,
  opts?: {
    bold?: boolean;
    fontColor?: string;
    fill?: string;
    fontSize?: number;
  },
): void {
  for (let c = 1; c <= 7; c++) {
    const cell = row.getCell(c);
    cell.font = {
      name: FONT_NAME,
      size: opts?.fontSize ?? FONT_SIZE,
      bold: opts?.bold ?? false,
      ...(opts?.fontColor ? { color: { argb: opts.fontColor } } : {}),
    };
    cell.border = THIN_BORDER;
    if (opts?.fill) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: opts.fill },
      };
    }
  }
}

/**
 * Apply borders to every cell in a row.  Call BEFORE ws.mergeCells() so
 * each cell retains its border data once Excel renders the merged range.
 */
function applyRowBorders(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  colCount: number = 7,
): void {
  const row = ws.getRow(rowNum);
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = THIN_BORDER;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VALIDATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ExportWarning {
  blockSequence: number;
  blockLabel: string;
  message: string;
}

/**
 * Run pre-export validation.  Returns an array of warnings (empty = all good).
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  WORKBOOK BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ExportOptions {
  project: Project;
  blocks: MeasurementBlockWithDetails[];
  ssrVersionLabel?: string;
  /** Optional progress callback: called with fraction 0–1. */
  onProgress?: (fraction: number) => void;
}

/**
 * Build the Excel workbook and trigger a browser download.
 *
 * @throws on ExcelJS errors — callers should wrap in try/catch.
 */
export async function generateMeasurementSheetExcel(
  opts: ExportOptions,
): Promise<string> {
  const { project, blocks, ssrVersionLabel, onProgress } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = "estimatIt";
  wb.created = new Date();

  // ── Worksheet Creation ──────────────────────────────────────────────────
  const ws = wb.addWorksheet("Measurement Sheet");

  // ── 1. PAGE SETUP & A4 PRINT BUDGETING ──────────────────────────────────
  //    A4 (code 9) · Landscape · fitToWidth = 1 · fitToHeight = 0 (auto)
  //    Standard margins ~0.7 in / 18 mm
  ws.pageSetup.paperSize = 9;
  ws.pageSetup.orientation = "landscape";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = PRINT_MARGINS;

  // ── 2. HARDCODED COLUMN WIDTHS ──────────────────────────────────────────
  //    8-column layout, total ~117 char units, within ~130 landscape budget.
  ws.getColumn(1).width = COL_WIDTHS.srNo;
  ws.getColumn(2).width = COL_WIDTHS.majorDesc;
  ws.getColumn(3).width = COL_WIDTHS.minorDesc;
  ws.getColumn(4).width = COL_WIDTHS.no;
  ws.getColumn(5).width = COL_WIDTHS.length;
  ws.getColumn(6).width = COL_WIDTHS.breadth;
  ws.getColumn(7).width = COL_WIDTHS.depth;
  ws.getColumn(8).width = COL_WIDTHS.quantity;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  HEADER SECTION (Rows 1–4)
  //
  //  These are non-data rows with short, predictable text.
  //  Merging IS used here, with calculateMergedRowHeight() providing
  //  explicit heights (Rule 4 fallback).
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ── Row 1: Project Title ────────────────────────────────────────────────
  const titleText = project.name;
  applyRowBorders(ws, 1); // borders BEFORE merge
  ws.mergeCells("A1:H1");
  const titleCell = ws.getCell("A1");
  titleCell.value = titleText;
  titleCell.font = { name: FONT_NAME, size: 14, bold: true };
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  ws.getRow(1).height = calculateMergedRowHeight(titleText, TOTAL_COL_WIDTH, 14);

  // ── Row 2: Work Order + Date ────────────────────────────────────────────
  const woText = `Work Order: ${project.work_order_no || "—"}`;
  const dateText = `Date: ${new Date().toLocaleDateString("en-IN")}`;
  applyRowBorders(ws, 2);
  ws.mergeCells("A2:E2");
  ws.mergeCells("F2:H2");
  ws.getCell("A2").value = woText;
  ws.getCell("A2").font = { name: FONT_NAME, size: FONT_SIZE };
  ws.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  ws.getCell("F2").value = dateText;
  ws.getCell("F2").font = { name: FONT_NAME, size: FONT_SIZE };
  ws.getCell("F2").alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(2).height = POINTS_PER_LINE + 4;

  // ── Row 3: SSR Version ──────────────────────────────────────────────────
  const versionText = `SSR Version: ${ssrVersionLabel || "N/A"}`;
  applyRowBorders(ws, 3);
  ws.mergeCells("A3:H3");
  ws.getCell("A3").value = versionText;
  ws.getCell("A3").font = { name: FONT_NAME, size: FONT_SIZE, italic: true };
  ws.getCell("A3").alignment = { vertical: "middle", wrapText: true };
  ws.getRow(3).height = POINTS_PER_LINE + 4;

  // ── Row 4: Visual spacer ───────────────────────────────────────────────
  ws.getRow(4).height = 6;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  COLUMN HEADERS (Row 5)
  //  Short, predictable labels — no merging, fixed height is acceptable.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const headerRow = ws.getRow(5);
  const headers = [
    "Sr No",
    "Major Item",
    "Description",
    "No",
    "Length",
    "Breadth",
    "Depth/Height",
    "Quantity",
  ];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: FONT_SIZE, bold: true };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EDF5" },
    };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 22;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  DATA ROWS (Row 6+)
  //
  //  LAYOUT (matches government measurement sheet reference):
  //
  //  ┌─────┬─────────────────────────────────────────────────────────┐
  //  │  1  │ [1.01]: SSR description …                  (B:G merged)│
  //  │     │ Unit: m²  |  Rate: ₹189.00                             │
  //  ├─────┼─────────────────────────────────────────────────────────┤
  //  │     │   Gents Toilet                             (B:G merged)│
  //  ├─────┼──────────────┬─────┬───────┬────────┬──────┬───────────┤
  //  │     │     Wall 1   │ 7   │ 8.00  │  9.00  │      │   504.00  │
  //  │     │     Wall 2   │ 9   │ 10.00 │        │      │    90.00  │
  //  ├─────┴──────────────┴─────┴───────┴────────┴──────┼───────────┤
  //  │               Total Quantity — [1.01]  (A:F)     │  4,419.00 │
  //  └──────────────────────────────────────────────────┴───────────┘
  //
  //  RULES:
  //  • SSR item rows:  B:G merged — height via calculateMergedRowHeight()
  //  • Major item rows: B:G merged — height via calculateMergedRowHeight()
  //  • Dimension rows: NO merge — height NOT SET (Excel auto-fits)
  //  • Subtotal rows:  A:F merged — height via calculateMergedRowHeight()
  //  • Grand total:    A:F merged — height via calculateMergedRowHeight()
  //  • Numbers right-aligned, 2 decimal places
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let currentRow = 6;
  let grandTotalQty = 0;
  let grandTotalAmount = 0;
  const totalBlocks = blocks.length;

  for (let blockIdx = 0; blockIdx < totalBlocks; blockIdx++) {
    const block = blocks[blockIdx];
    const isCustom = !block.ssr_item_id;
    const description = isCustom
      ? block.custom_description
      : block.ssr_item?.description;
    const itemNo = isCustom ? "Custom" : block.ssr_item?.item_no;
    const unit = isCustom ? block.custom_unit : block.ssr_item?.unit;
    const rate = isCustom
      ? (block.custom_rate ?? 0)
      : (block.ssr_item?.completed_rate_inr ?? 0);

    // ── SSR Item Header Row ─────────────────────────────────────────────
    {
      const ssrRow = ws.getRow(currentRow);
      const ssrDescText = [
        `[${itemNo}]: ${description || "—"}`,
        `Unit: ${unit || "—"}  |  Rate: ₹${rate.toFixed(2)}`,
      ].join("\n");

      // Apply borders + base style to ALL 8 cells BEFORE merging
      styleRowBase(ssrRow, {
        bold: true,
        fontColor: "FF1E40AF",
        fill: "FFF0F4FF",
      });

      // Col A: sequence number
      ssrRow.getCell(1).value = block.sequence_number;
      ssrRow.getCell(1).alignment = { horizontal: "center", vertical: "top" };

      // Cols B:H: MERGE then set description on master cell
      ws.mergeCells(`B${currentRow}:H${currentRow}`);
      ssrRow.getCell(2).value = ssrDescText;
      ssrRow.getCell(2).alignment = { vertical: "top", wrapText: true };

      // Height: CALCULATED (AutoFit fails on merged cells)
      ws.getRow(currentRow).height = calculateMergedRowHeight(
        ssrDescText,
        MERGED_BH_WIDTH,
      );

      currentRow++;
    }

    let blockTotalQty = 0;

    for (const mi of block.major_items) {
      const majorItemStartRow = currentRow;
      
      // Step 1: Build groups of consecutive rows sharing a minor description
      const descGroups: { description: string; rows: typeof mi.dimension_rows }[] = [];
      for (const dr of mi.dimension_rows) {
        const last = descGroups[descGroups.length - 1];
        if (last && last.description === dr.description) {
          last.rows.push(dr);
        } else {
          descGroups.push({ description: dr.description, rows: [dr] });
        }
      }

      // Step 2: Render each minor item group
      for (const group of descGroups) {
        const groupStartRow = currentRow;

        for (let ri = 0; ri < group.rows.length; ri++) {
          const dr = group.rows[ri];
          const qty = rowQuantity(dr);
          const drRow = ws.getRow(currentRow);

          styleRowBase(drRow);

          // Minor Description: set only on the FIRST row of the group (Col C)
          if (ri === 0) {
            drRow.getCell(3).value = group.description;
          }

          drRow.getCell(4).value = dr.number > 0 ? dr.number : null;
          drRow.getCell(5).value = dr.length > 0 ? dr.length : null;
          drRow.getCell(6).value = dr.breadth > 0 ? dr.breadth : null;
          drRow.getCell(7).value = dr.depth > 0 ? dr.depth : null;
          drRow.getCell(8).value = qty > 0 ? qty : null;

          // Right-align and format number columns (D–H)
          for (let c = 4; c <= 8; c++) {
            drRow.getCell(c).alignment = { horizontal: "right", vertical: "middle" };
            drRow.getCell(c).numFmt = "#,##0.00";
          }

          blockTotalQty += qty;
          currentRow++;
        }

        // Step 3: If the minor group spans multiple rows, merge Col C vertically
        if (group.rows.length > 1) {
          ws.mergeCells(`C${groupStartRow}:C${currentRow - 1}`);
        }

        // Set alignment on the minor description cell (Col C)
        ws.getCell(`C${groupStartRow}`).alignment = {
          vertical: "top",
          wrapText: true,
        };
      }
      
      // Step 4: After rendering all minor items for this major item,
      // write the major item description to Col B and merge it vertically.
      // If there are NO dimension rows, we still need to render a row for the major item.
      if (majorItemStartRow === currentRow) {
        const emptyRow = ws.getRow(currentRow);
        styleRowBase(emptyRow);
        currentRow++;
      }
      
      const bCell = ws.getCell(`B${majorItemStartRow}`);
      bCell.value = mi.description;
      bCell.alignment = { vertical: "top", wrapText: true, horizontal: "left" };
      
      if (currentRow - 1 > majorItemStartRow) {
        ws.mergeCells(`B${majorItemStartRow}:B${currentRow - 1}`);
      }
    }

    // ── Block Subtotal Row ────────────────────────────────────────────
    {
      const stRow = ws.getRow(currentRow);
      const stText = `Total Quantity — [${itemNo}]`;

      // Base style BEFORE merge
      styleRowBase(stRow, { bold: true });

      // Cols A:G: MERGE
      ws.mergeCells(`A${currentRow}:G${currentRow}`);
      stRow.getCell(1).value = stText;
      stRow.getCell(1).alignment = {
        horizontal: "right",
        vertical: "middle",
        wrapText: true,
      };

      // Col H: quantity total
      stRow.getCell(8).value = blockTotalQty;
      stRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
      stRow.getCell(8).numFmt = "#,##0.00";
      stRow.getCell(8).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF9DB" },
      };

      // Height: CALCULATED
      ws.getRow(currentRow).height = calculateMergedRowHeight(
        stText,
        MERGED_AG_WIDTH,
      );

      currentRow++;
    }

    // Spacer row between blocks (unstyled, default height)
    currentRow++;

    grandTotalQty += blockTotalQty;
    grandTotalAmount += blockTotalQty * rate;

    onProgress?.((blockIdx + 1) / totalBlocks);
  }

  // ── Grand Total Row ────────────────────────────────────────────────────
  {
    const gtRow = ws.getRow(currentRow);
    const gtText = "Grand Total Estimated Amount";

    // Base style BEFORE merge
    styleRowBase(gtRow, {
      bold: true,
      fontColor: "FF16A34A",
      fontSize: 12,
    });

    // Cols A:G: MERGE
    ws.mergeCells(`A${currentRow}:G${currentRow}`);
    gtRow.getCell(1).value = gtText;
    gtRow.getCell(1).alignment = {
      horizontal: "right",
      vertical: "middle",
      wrapText: true,
    };

    // Col H: amount
    gtRow.getCell(8).value = grandTotalAmount;
    gtRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
    gtRow.getCell(8).numFmt = "₹#,##0.00";
    gtRow.getCell(8).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0FDF4" },
    };

    // Height: CALCULATED
    ws.getRow(currentRow).height = calculateMergedRowHeight(
      gtText,
      MERGED_AG_WIDTH,
      12,
    );
  }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  SHEET 2: ABSTRACT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  buildAbstractSheet(wb, opts);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  WRITE & DOWNLOAD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `${project.name.replace(/[^a-zA-Z0-9_\- ]/g, "")}_measurement_sheet.xlsx`;
  saveAs(blob, filename);

  return filename;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ABSTRACT SHEET BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Adds Sheet 2 "Abstract" to the workbook.
 *
 * Column order (matches government Abstract reference):
 *   A = Unit  |  B = Quantity  |  C = Item No  |  D = Item (description)
 *   E = Rate (₹)  |  F = Amount (₹)
 *
 * Same print settings, fonts, and borders as the Measurement Sheet.
 */
function buildAbstractSheet(wb: ExcelJS.Workbook, opts: ExportOptions): void {
  const { project, blocks, ssrVersionLabel } = opts;

  const ws = wb.addWorksheet("Abstract");

  // Page setup — A4 Landscape, same as Sheet 1
  ws.pageSetup.paperSize = 9;
  ws.pageSetup.orientation = "landscape";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = PRINT_MARGINS;

  // Column widths
  //   A(10) + B(12) + C(10) + D(70) + E(14) + F(16) = 132
  ws.getColumn(1).width = 10;  // Unit
  ws.getColumn(2).width = 12;  // Quantity
  ws.getColumn(3).width = 10;  // Item No
  ws.getColumn(4).width = 70;  // Item description — widest
  ws.getColumn(5).width = 14;  // Rate
  ws.getColumn(6).width = 16;  // Amount

  const ABSTRACT_TOTAL_WIDTH = 10 + 12 + 10 + 70 + 14 + 16;

  // ── Header rows ──────────────────────────────────────────────────────────
  // Row 1: Title
  applyRowBorders(ws, 1);
  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = project.name;
  ws.getCell("A1").font = { name: FONT_NAME, size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = calculateMergedRowHeight(project.name, ABSTRACT_TOTAL_WIDTH, 14);

  // Row 2: Work Order + Date
  applyRowBorders(ws, 2);
  ws.mergeCells("A2:C2");
  ws.mergeCells("D2:F2");
  ws.getCell("A2").value = `Work Order: ${project.work_order_no || "—"}`;
  ws.getCell("A2").font = { name: FONT_NAME, size: FONT_SIZE };
  ws.getCell("A2").alignment = { vertical: "middle" };
  ws.getCell("D2").value = `Date: ${new Date().toLocaleDateString("en-IN")}`;
  ws.getCell("D2").font = { name: FONT_NAME, size: FONT_SIZE };
  ws.getCell("D2").alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(2).height = POINTS_PER_LINE + 4;

  // Row 3: SSR Version
  applyRowBorders(ws, 3);
  ws.mergeCells("A3:F3");
  ws.getCell("A3").value = `SSR Version: ${ssrVersionLabel || "N/A"}`;
  ws.getCell("A3").font = { name: FONT_NAME, size: FONT_SIZE, italic: true };
  ws.getCell("A3").alignment = { vertical: "middle" };
  ws.getRow(3).height = POINTS_PER_LINE + 4;

  // Row 4: Spacer
  ws.getRow(4).height = 6;

  // ── Column header row (Row 5) ─────────────────────────────────────────────
  const absHeaders = ["Unit", "Quantity", "Item\nNo", "Item", "Rate (₹)", "Amount (₹)"];
  const headerRow = ws.getRow(5);
  absHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: FONT_SIZE, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EDF5" } };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 28;

  // ── Data rows (Row 6+) ────────────────────────────────────────────────────
  let currentRow = 6;
  let grandTotal = 0;

  for (const block of blocks) {
    const isCustom = !block.ssr_item_id;
    const description = isCustom
      ? (block.custom_description ?? "—")
      : (block.ssr_item?.description ?? "—");
    const unit = isCustom ? (block.custom_unit ?? "—") : (block.ssr_item?.unit ?? "—");
    const rate = isCustom
      ? (block.custom_rate ?? 0)
      : (block.ssr_item?.completed_rate_inr ?? 0);

    // Compute block quantity
    let qty = 0;
    for (const mi of block.major_items) {
      for (const dr of mi.dimension_rows) {
        let q = 1;
        let hasValue = false;
        if (dr.number > 0)  { q *= dr.number;  hasValue = true; }
        if (dr.length > 0)  { q *= dr.length;  hasValue = true; }
        if (dr.breadth > 0) { q *= dr.breadth; hasValue = true; }
        if (dr.depth > 0)   { q *= dr.depth;   hasValue = true; }
        if (hasValue) qty += q;
      }
    }

    const amount = qty * rate;
    grandTotal += amount;

    const row = ws.getRow(currentRow);

    // Style row
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.font = { name: FONT_NAME, size: FONT_SIZE };
      cell.border = THIN_BORDER;
    }

    // A: Unit
    row.getCell(1).value = unit;
    row.getCell(1).alignment = { horizontal: "center", vertical: "top" };

    // B: Quantity
    row.getCell(2).value = qty;
    row.getCell(2).alignment = { horizontal: "right", vertical: "top" };
    row.getCell(2).numFmt = "#,##0.00";

    // C: Item No
    row.getCell(3).value = block.sequence_number;
    row.getCell(3).alignment = { horizontal: "center", vertical: "top" };

    // D: Item description
    row.getCell(4).value = description;
    row.getCell(4).alignment = { vertical: "top", wrapText: true };

    // E: Rate
    row.getCell(5).value = rate;
    row.getCell(5).alignment = { horizontal: "right", vertical: "top" };
    row.getCell(5).numFmt = "#,##0.00";

    // F: Amount
    row.getCell(6).value = amount;
    row.getCell(6).alignment = { horizontal: "right", vertical: "top" };
    row.getCell(6).numFmt = "#,##0.00";
    row.getCell(6).font = { name: FONT_NAME, size: FONT_SIZE, bold: true };

    // Height: not set — Excel auto-fits (description may wrap)
    currentRow++;
  }

  // ── Total row ─────────────────────────────────────────────────────────────
  const totalRow = ws.getRow(currentRow);
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  totalRow.getCell(1).value = "Total";
  totalRow.getCell(1).font = { name: FONT_NAME, size: FONT_SIZE, bold: true };
  totalRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(1).border = THIN_BORDER;
  totalRow.getCell(6).value = grandTotal;
  totalRow.getCell(6).numFmt = "₹#,##0.00";
  totalRow.getCell(6).font = { name: FONT_NAME, size: 12, bold: true };
  totalRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(6).border = THIN_BORDER;
  totalRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  ws.getRow(currentRow).height = POINTS_PER_LINE + 4;
  currentRow++;

  // ── "Say" row (rounded total) ─────────────────────────────────────────────
  const sayRow = ws.getRow(currentRow);
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  sayRow.getCell(1).value = "Say";
  sayRow.getCell(1).font = { name: FONT_NAME, size: FONT_SIZE, bold: true, italic: true };
  sayRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
  sayRow.getCell(1).border = THIN_BORDER;
  sayRow.getCell(6).value = Math.round(grandTotal);
  sayRow.getCell(6).numFmt = "₹#,##0";
  sayRow.getCell(6).font = { name: FONT_NAME, size: FONT_SIZE, bold: true, italic: true };
  sayRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
  sayRow.getCell(6).border = THIN_BORDER;
  sayRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  ws.getRow(currentRow).height = POINTS_PER_LINE + 4;
}
