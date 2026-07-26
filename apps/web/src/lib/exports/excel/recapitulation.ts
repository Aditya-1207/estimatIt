import ExcelJS from "exceljs";
import type { ExportOptions } from "../types";
import type { RecapitulationItem } from "@estimatit/shared";
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
 * Adds Sheet 3 "Recapitulation" to the workbook.
 */
export function buildRecapSheet(
  wb: ExcelJS.Workbook,
  opts: ExportOptions,
  recapItems: RecapitulationItem[],
): void {
  const { project, blocks, ssrVersionLabel } = opts;

  const ws = wb.addWorksheet("Recapitulation");

  // Page setup — A4 Portrait
  ws.pageSetup.paperSize = 9;
  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = EXCEL_PRINT_MARGINS;

  // Column widths: A(8) + B(60) + C(14) + D(18) = 100
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 60;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 18;
  const RECAP_TOTAL_WIDTH = 100;

  // ── Compute abstract total ─────────────────────────────────────────────────
  let abstractTotal = 0;
  for (const block of blocks) {
    let qty = 0;
    for (const mi of block.major_items) {
      for (const dr of mi.dimension_rows) {
        qty += rowQuantity(dr);
      }
    }
    const rate = block.ssr_item_id
      ? (block.ssr_item?.completed_rate_inr ?? 0)
      : (block.custom_rate ?? 0);
    abstractTotal += qty * rate;
  }

  // ── Header rows ──────────────────────────────────────────────────────────
  applyRowBorders(ws, 1, 4);
  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = project.name;
  ws.getCell("A1").font = { name: EXCEL_FONT_NAME, size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = calculateMergedRowHeight(project.name, RECAP_TOTAL_WIDTH, 14);

  applyRowBorders(ws, 2, 4);
  ws.mergeCells("A2:B2");
  ws.mergeCells("C2:D2");
  ws.getCell("A2").value = `Work Order: ${project.work_order_no || "—"}`;
  ws.getCell("A2").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE };
  ws.getCell("A2").alignment = { vertical: "middle" };
  ws.getCell("C2").value = `Date: ${new Date().toLocaleDateString("en-IN")}`;
  ws.getCell("C2").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE };
  ws.getCell("C2").alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(2).height = EXCEL_POINTS_PER_LINE + 4;

  applyRowBorders(ws, 3, 4);
  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = `SSR Version: ${ssrVersionLabel || "N/A"}`;
  ws.getCell("A3").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, italic: true };
  ws.getCell("A3").alignment = { vertical: "middle" };
  ws.getRow(3).height = EXCEL_POINTS_PER_LINE + 4;

  ws.getRow(4).height = 6;

  // ── Row 5: Abstract total banner ─────────────────────────────────────────
  applyRowBorders(ws, 5, 4);
  ws.mergeCells("A5:C5");
  ws.getCell("A5").value = "Estimated Cost as per Abstract";
  ws.getCell("A5").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
  ws.getCell("A5").alignment = { vertical: "middle" };
  ws.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F4FD" } };
  ws.getCell("D5").value = abstractTotal;
  ws.getCell("D5").numFmt = '"Rs. "#,##0.00';
  ws.getCell("D5").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
  ws.getCell("D5").alignment = { horizontal: "right", vertical: "middle" };
  ws.getCell("D5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F4FD" } };
  ws.getRow(5).height = EXCEL_POINTS_PER_LINE + 4;

  // ── Column headers (Row 6) ────────────────────────────────────────────────
  const hdrRow = ws.getRow(6);
  const recapHeaders = ["#", "Description", "%", "Amount (Rs.)"];
  recapHeaders.forEach((h, i) => {
    const cell = hdrRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
    cell.alignment = { horizontal: i === 1 ? "left" : "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EDF5" } };
    cell.border = EXCEL_THIN_BORDER;
  });
  hdrRow.height = 22;

  // ── Data rows (Row 7+) ────────────────────────────────────────────────────
  let currentRow = 7;
  let runningTotal = 0;

  for (const item of recapItems) {
    const isTotalRow = item.type === "rounded_total";

    if (isTotalRow) {
      const sepRow = ws.getRow(currentRow);
      sepRow.getCell(2).value = "Total";
      sepRow.getCell(2).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
      sepRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
      
      sepRow.getCell(4).value = runningTotal;
      sepRow.getCell(4).numFmt = '"Rs. "#,##0.00';
      sepRow.getCell(4).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
      sepRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
      currentRow++;
    }

    let computedAmount = 0;
    if (item.type === "abstract_total") {
      computedAmount = abstractTotal;
    } else if (item.type === "percentage") {
      computedAmount = (item.percentage / 100) * abstractTotal;
    } else if (item.type === "lump_sum") {
      computedAmount = item.amount;
    } else if (item.type === "rounded_total") {
      computedAmount = Math.round(runningTotal);
    }

    if (!isTotalRow) {
      runningTotal += computedAmount;
    }

    const row = ws.getRow(currentRow);
    for (let c = 1; c <= 4; c++) {
      row.getCell(c).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE };
      row.getCell(c).border = EXCEL_THIN_BORDER;
    }

    row.getCell(1).value = item.sequence_number;
    row.getCell(1).alignment = { horizontal: "center", vertical: "top" };

    row.getCell(2).value = item.description;
    row.getCell(2).alignment = { vertical: "top", wrapText: true };
    if (isTotalRow) {
      row.getCell(2).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true, italic: true };
      row.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    }

    if (item.type === "percentage") {
      row.getCell(3).value = item.percentage;
      row.getCell(3).numFmt = "0.00\"%\"";
      row.getCell(3).alignment = { horizontal: "center", vertical: "top" };
    } else {
      row.getCell(3).value = "—";
      row.getCell(3).alignment = { horizontal: "center", vertical: "top" };
    }

    row.getCell(4).value = computedAmount;
    row.getCell(4).numFmt = '"Rs. "#,##0.00';
    row.getCell(4).alignment = { horizontal: "right", vertical: "top" };
    
    if (isTotalRow) {
      row.getCell(4).font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
      row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    }

    currentRow++;
  }
}
