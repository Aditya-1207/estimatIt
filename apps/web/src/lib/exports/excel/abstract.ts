import ExcelJS from "exceljs";
import type { ExportOptions } from "../types";
import { rowQuantity } from "../utils";
import {
  EXCEL_FONT_NAME,
  EXCEL_FONT_SIZE,
  EXCEL_POINTS_PER_LINE,
  EXCEL_PRINT_MARGINS,
  EXCEL_THIN_BORDER,
} from "../constants";
import { applyRowBorders, calculateMergedRowHeight } from "./utils";

/**
 * Adds Sheet 2 "Abstract" to the workbook.
 */
export function buildAbstractSheet(wb: ExcelJS.Workbook, opts: ExportOptions): void {
  const { project, blocks, ssrVersionLabel } = opts;

  const ws = wb.addWorksheet("Abstract");

  // Page setup — A4 Landscape
  ws.pageSetup.paperSize = 9;
  ws.pageSetup.orientation = "landscape";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = EXCEL_PRINT_MARGINS;

  // Column widths
  ws.getColumn(1).width = 10;  // Unit
  ws.getColumn(2).width = 12;  // Quantity
  ws.getColumn(3).width = 10;  // Item No
  ws.getColumn(4).width = 70;  // Item description — widest
  ws.getColumn(5).width = 14;  // Rate
  ws.getColumn(6).width = 16;  // Amount

  const ABSTRACT_TOTAL_WIDTH = 10 + 12 + 10 + 70 + 14 + 16;

  // ── Header rows ──────────────────────────────────────────────────────────
  applyRowBorders(ws, 1, 6);
  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = project.name;
  ws.getCell("A1").font = { name: EXCEL_FONT_NAME, size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = calculateMergedRowHeight(project.name, ABSTRACT_TOTAL_WIDTH, 14);

  applyRowBorders(ws, 2, 6);
  ws.mergeCells("A2:C2");
  ws.mergeCells("D2:F2");
  ws.getCell("A2").value = `Work Order: ${project.work_order_no || "—"}`;
  ws.getCell("A2").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE };
  ws.getCell("A2").alignment = { vertical: "middle" };
  ws.getCell("D2").value = `Date: ${new Date().toLocaleDateString("en-IN")}`;
  ws.getCell("D2").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE };
  ws.getCell("D2").alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(2).height = EXCEL_POINTS_PER_LINE + 4;

  applyRowBorders(ws, 3, 6);
  ws.mergeCells("A3:F3");
  ws.getCell("A3").value = `SSR Version: ${ssrVersionLabel || "N/A"}`;
  ws.getCell("A3").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, italic: true };
  ws.getCell("A3").alignment = { vertical: "middle" };
  ws.getRow(3).height = EXCEL_POINTS_PER_LINE + 4;

  ws.getRow(4).height = 6;

  // ── Column header row (Row 5) ─────────────────────────────────────────────
  const absHeaders = ["Unit", "Quantity", "Item\nNo", "Item", "Rate (Rs.)", "Amount (Rs.)"];
  const headerRow = ws.getRow(5);
  absHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EDF5" } };
    cell.border = EXCEL_THIN_BORDER;
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

    let qty = 0;
    for (const mi of block.major_items) {
      for (const dr of mi.dimension_rows) {
        qty += rowQuantity(dr);
      }
    }

    const amount = qty * rate;
    grandTotal += amount;

    const row = ws.getRow(currentRow);
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE };
      cell.border = EXCEL_THIN_BORDER;
    }

    row.getCell(1).value = unit;
    row.getCell(1).alignment = { horizontal: "center", vertical: "top" };

    row.getCell(2).value = qty;
    row.getCell(2).alignment = { horizontal: "right", vertical: "top" };
    row.getCell(2).numFmt = "#,##0.00";

    row.getCell(3).value = block.sequence_number;
    row.getCell(3).alignment = { horizontal: "center", vertical: "top" };

    row.getCell(4).value = description;
    row.getCell(4).alignment = { vertical: "top", wrapText: true };

    row.getCell(5).value = rate;
    row.getCell(5).alignment = { horizontal: "right", vertical: "top" };
    row.getCell(5).numFmt = "#,##0.00";

    row.getCell(6).value = amount;
    row.getCell(6).alignment = { horizontal: "right", vertical: "top" };
    row.getCell(6).numFmt = "#,##0.00";
    row.getCell(6).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };

    currentRow++;
  }

  // ── Total row ─────────────────────────────────────────────────────────────
  const totalRow = ws.getRow(currentRow);
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  totalRow.getCell(1).value = "Total";
  totalRow.getCell(1).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
  totalRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(1).border = EXCEL_THIN_BORDER;
  totalRow.getCell(6).value = grandTotal;
  totalRow.getCell(6).numFmt = '"Rs. "#,##0.00';
  totalRow.getCell(6).font = { name: EXCEL_FONT_NAME, size: 12, bold: true };
  totalRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(6).border = EXCEL_THIN_BORDER;
  totalRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  ws.getRow(currentRow).height = EXCEL_POINTS_PER_LINE + 4;
  currentRow++;

  // ── "Say" row (rounded total) ─────────────────────────────────────────────
  const sayRow = ws.getRow(currentRow);
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  sayRow.getCell(1).value = "Say";
  sayRow.getCell(1).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true, italic: true };
  sayRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
  sayRow.getCell(1).border = EXCEL_THIN_BORDER;
  sayRow.getCell(6).value = Math.round(grandTotal);
  sayRow.getCell(6).numFmt = '"Rs. "#,##0';
  sayRow.getCell(6).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true, italic: true };
  sayRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
  sayRow.getCell(6).border = EXCEL_THIN_BORDER;
  sayRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  ws.getRow(currentRow).height = EXCEL_POINTS_PER_LINE + 4;
}
