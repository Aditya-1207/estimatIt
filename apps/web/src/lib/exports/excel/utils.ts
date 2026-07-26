import ExcelJS from "exceljs";
import { EXCEL_FONT_NAME, EXCEL_FONT_SIZE, EXCEL_POINTS_PER_LINE, EXCEL_THIN_BORDER } from "../constants";

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
export function calculateMergedRowHeight(
  text: string,
  mergedWidthChars: number,
  fontSize: number = EXCEL_FONT_SIZE,
): number {
  const scaleFactor = fontSize / 11; // relative to Calibri 11pt baseline
  // Characters that fit per line ≈ merged width minus cell padding, adjusted
  // for the font-size scale.
  const charsPerLine = Math.max(1, Math.floor((mergedWidthChars - 4) / scaleFactor));

  let totalLines = 0;
  for (const segment of text.split("\n")) {
    totalLines += Math.max(1, Math.ceil((segment.length || 1) / charsPerLine));
  }

  const lineHeight = EXCEL_POINTS_PER_LINE * scaleFactor;
  // Add a small padding (4 pt) for breathing room
  return Math.max(lineHeight + 4, totalLines * lineHeight + 4);
}

/**
 * Apply base styling (font, border, optional fill) to all 7 cells of a row.
 * Call BEFORE setting per-cell overrides (alignment, numFmt, value, etc.).
 */
export function styleRowBase(
  row: ExcelJS.Row,
  opts?: {
    bold?: boolean;
    fontColor?: string;
    fill?: string;
    fontSize?: number;
    colCount?: number;
  },
): void {
  const colCount = opts?.colCount ?? 8;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = {
      name: EXCEL_FONT_NAME,
      size: opts?.fontSize ?? EXCEL_FONT_SIZE,
      bold: opts?.bold ?? false,
      ...(opts?.fontColor ? { color: { argb: opts.fontColor } } : {}),
    };
    cell.border = EXCEL_THIN_BORDER;
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
export function applyRowBorders(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  colCount: number = 8,
): void {
  const row = ws.getRow(rowNum);
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = EXCEL_THIN_BORDER;
  }
}
