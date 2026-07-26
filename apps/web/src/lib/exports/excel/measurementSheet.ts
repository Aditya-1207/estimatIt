import ExcelJS from "exceljs";
import type { ExportOptions } from "../types";
import { rowQuantity } from "../utils";
import {
  EXCEL_COL_WIDTHS,
  EXCEL_FONT_NAME,
  EXCEL_FONT_SIZE,
  EXCEL_MERGED_AG_WIDTH,
  EXCEL_MERGED_BH_WIDTH,
  EXCEL_POINTS_PER_LINE,
  EXCEL_PRINT_MARGINS,
  EXCEL_THIN_BORDER,
  EXCEL_TOTAL_COL_WIDTH,
} from "../constants";
import { applyRowBorders, calculateMergedRowHeight, styleRowBase } from "./utils";

/**
 * Builds the primary Measurement Sheet in the provided workbook.
 */
export function buildMeasurementSheet(wb: ExcelJS.Workbook, opts: ExportOptions): void {
  const { project, blocks, ssrVersionLabel, onProgress } = opts;

  const ws = wb.addWorksheet("Measurement Sheet");

  // ── 1. PAGE SETUP & A4 PRINT BUDGETING ──────────────────────────────────
  //    A4 (code 9) · Landscape · fitToWidth = 1 · fitToHeight = 0 (auto)
  ws.pageSetup.paperSize = 9;
  ws.pageSetup.orientation = "landscape";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = EXCEL_PRINT_MARGINS;

  // ── 2. HARDCODED COLUMN WIDTHS ──────────────────────────────────────────
  ws.getColumn(1).width = EXCEL_COL_WIDTHS.srNo;
  ws.getColumn(2).width = EXCEL_COL_WIDTHS.majorDesc;
  ws.getColumn(3).width = EXCEL_COL_WIDTHS.minorDesc;
  ws.getColumn(4).width = EXCEL_COL_WIDTHS.no;
  ws.getColumn(5).width = EXCEL_COL_WIDTHS.length;
  ws.getColumn(6).width = EXCEL_COL_WIDTHS.breadth;
  ws.getColumn(7).width = EXCEL_COL_WIDTHS.depth;
  ws.getColumn(8).width = EXCEL_COL_WIDTHS.quantity;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  HEADER SECTION (Rows 1–4)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ── Row 1: Project Title ────────────────────────────────────────────────
  const titleText = project.name;
  applyRowBorders(ws, 1); // borders BEFORE merge
  ws.mergeCells("A1:H1");
  const titleCell = ws.getCell("A1");
  titleCell.value = titleText;
  titleCell.font = { name: EXCEL_FONT_NAME, size: 14, bold: true };
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  ws.getRow(1).height = calculateMergedRowHeight(titleText, EXCEL_TOTAL_COL_WIDTH, 14);

  // ── Row 2: Work Order + Date ────────────────────────────────────────────
  const woText = `Work Order: ${project.work_order_no || "—"}`;
  const dateText = `Date: ${new Date().toLocaleDateString("en-IN")}`;
  applyRowBorders(ws, 2);
  ws.mergeCells("A2:E2");
  ws.mergeCells("F2:H2");
  ws.getCell("A2").value = woText;
  ws.getCell("A2").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE };
  ws.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  ws.getCell("F2").value = dateText;
  ws.getCell("F2").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE };
  ws.getCell("F2").alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(2).height = EXCEL_POINTS_PER_LINE + 4;

  // ── Row 3: SSR Version ──────────────────────────────────────────────────
  const versionText = `SSR Version: ${ssrVersionLabel || "N/A"}`;
  applyRowBorders(ws, 3);
  ws.mergeCells("A3:H3");
  ws.getCell("A3").value = versionText;
  ws.getCell("A3").font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, italic: true };
  ws.getCell("A3").alignment = { vertical: "middle", wrapText: true };
  ws.getRow(3).height = EXCEL_POINTS_PER_LINE + 4;

  // ── Row 4: Visual spacer ───────────────────────────────────────────────
  ws.getRow(4).height = 6;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  COLUMN HEADERS (Row 5)
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
    cell.font = { name: EXCEL_FONT_NAME, size: EXCEL_FONT_SIZE, bold: true };
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
    cell.border = EXCEL_THIN_BORDER;
  });
  headerRow.height = 22;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  DATA ROWS (Row 6+)
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
        `Unit: ${unit || "—"}  |  Rate: Rs. ${rate.toFixed(2)}`,
      ].join("\n");

      // Apply borders + base style to ALL 8 cells BEFORE merging
      styleRowBase(ssrRow, {
        bold: true,
        fontColor: "FF1E40AF",
        fill: "FFF0F4FF",
        colCount: 8,
      });

      ssrRow.getCell(1).value = block.sequence_number;
      ssrRow.getCell(1).alignment = { horizontal: "center", vertical: "top" };

      ws.mergeCells(`B${currentRow}:H${currentRow}`);
      ssrRow.getCell(2).value = ssrDescText;
      ssrRow.getCell(2).alignment = { vertical: "top", wrapText: true };

      ws.getRow(currentRow).height = calculateMergedRowHeight(
        ssrDescText,
        EXCEL_MERGED_BH_WIDTH,
      );

      currentRow++;
    }

    let blockTotalQty = 0;

    for (const mi of block.major_items) {
      const majorItemStartRow = currentRow;
      
      const descGroups: { description: string; rows: typeof mi.dimension_rows }[] = [];
      for (const dr of mi.dimension_rows) {
        const last = descGroups[descGroups.length - 1];
        if (last && last.description === dr.description) {
          last.rows.push(dr);
        } else {
          descGroups.push({ description: dr.description, rows: [dr] });
        }
      }

      for (const group of descGroups) {
        const groupStartRow = currentRow;

        for (let ri = 0; ri < group.rows.length; ri++) {
          const dr = group.rows[ri];
          const qty = rowQuantity(dr);
          const drRow = ws.getRow(currentRow);

          styleRowBase(drRow, { colCount: 8 });

          if (ri === 0) {
            drRow.getCell(3).value = group.description;
          }

          drRow.getCell(4).value = dr.number > 0 ? dr.number : null;
          drRow.getCell(5).value = dr.length > 0 ? dr.length : null;
          drRow.getCell(6).value = dr.breadth > 0 ? dr.breadth : null;
          drRow.getCell(7).value = dr.depth > 0 ? dr.depth : null;
          drRow.getCell(8).value = qty > 0 ? qty : null;

          for (let c = 4; c <= 8; c++) {
            drRow.getCell(c).alignment = { horizontal: "right", vertical: "middle" };
            drRow.getCell(c).numFmt = "#,##0.00";
          }

          blockTotalQty += qty;
          currentRow++;
        }

        if (group.rows.length > 1) {
          ws.mergeCells(`C${groupStartRow}:C${currentRow - 1}`);
        }

        ws.getCell(`C${groupStartRow}`).alignment = {
          vertical: "top",
          wrapText: true,
        };
      }
      
      if (majorItemStartRow === currentRow) {
        const emptyRow = ws.getRow(currentRow);
        styleRowBase(emptyRow, { colCount: 8 });
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

      styleRowBase(stRow, { bold: true, colCount: 8 });

      ws.mergeCells(`A${currentRow}:G${currentRow}`);
      stRow.getCell(1).value = stText;
      stRow.getCell(1).alignment = {
        horizontal: "right",
        vertical: "middle",
        wrapText: true,
      };

      stRow.getCell(8).value = blockTotalQty;
      stRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
      stRow.getCell(8).numFmt = "#,##0.00";
      stRow.getCell(8).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF9DB" },
      };

      ws.getRow(currentRow).height = calculateMergedRowHeight(
        stText,
        EXCEL_MERGED_AG_WIDTH,
      );

      currentRow++;
    }

    currentRow++; // Spacer row

    grandTotalQty += blockTotalQty;
    grandTotalAmount += blockTotalQty * rate;

    onProgress?.((blockIdx + 1) / totalBlocks);
  }

  // ── Grand Total Row ────────────────────────────────────────────────────
  {
    const gtRow = ws.getRow(currentRow);
    const gtText = "Grand Total Estimated Amount";

    styleRowBase(gtRow, {
      bold: true,
      fontColor: "FF16A34A",
      fontSize: 12,
      colCount: 8,
    });

    ws.mergeCells(`A${currentRow}:G${currentRow}`);
    gtRow.getCell(1).value = gtText;
    gtRow.getCell(1).alignment = {
      horizontal: "right",
      vertical: "middle",
      wrapText: true,
    };

    gtRow.getCell(8).value = grandTotalAmount;
    gtRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
    gtRow.getCell(8).numFmt = '"Rs. "#,##0.00';
    gtRow.getCell(8).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0FDF4" },
    };

    ws.getRow(currentRow).height = calculateMergedRowHeight(
      gtText,
      EXCEL_MERGED_AG_WIDTH,
      12,
    );
  }
}
