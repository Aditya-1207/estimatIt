import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { ExportOptions } from "../types";
import { buildMeasurementSheet } from "./measurementSheet";
import { buildAbstractSheet } from "./abstract";
import { buildRecapSheet } from "./recapitulation";

/**
 * Build the Excel workbook and trigger a browser download.
 *
 * @throws on ExcelJS errors — callers should wrap in try/catch.
 */
export async function generateMeasurementSheetExcel(
  opts: ExportOptions,
): Promise<string> {
  const { project, recapItems } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = "estimatIt";
  wb.created = new Date();

  // ── SHEET 1: MEASUREMENT SHEET ──────────────────────────────────────────
  buildMeasurementSheet(wb, opts);

  // ── SHEET 2: ABSTRACT ───────────────────────────────────────────────────
  buildAbstractSheet(wb, opts);

  // ── SHEET 3: RECAPITULATION (only if recap items are provided) ────────
  if (recapItems && recapItems.length > 0) {
    buildRecapSheet(wb, opts, recapItems);
  }

  // ── WRITE & DOWNLOAD ────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `${project.name.replace(/[^a-zA-Z0-9_\- ]/g, "")}_measurement_sheet.xlsx`;
  saveAs(blob, filename);

  return filename;
}
