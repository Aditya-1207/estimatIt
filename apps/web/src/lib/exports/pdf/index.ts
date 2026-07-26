import { jsPDF } from "jspdf";
import type { ExportOptions } from "../types";
import { buildMeasurementSheetSection } from "./measurementSheet";
import { buildAbstractSection } from "./abstract";
import { buildRecapSection } from "./recapitulation";
import { addPageNumbers } from "./utils";

/**
 * Build the PDF document and trigger a browser download.
 *
 * @returns The filename that was downloaded.
 * @throws on jsPDF errors — callers should wrap in try/catch.
 */
export async function generateEstimatePdf(
  opts: ExportOptions,
): Promise<string> {
  const { project } = opts;

  // Create A4 portrait PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set document properties
  doc.setProperties({
    title: `${project.name} — Estimate`,
    creator: "estimatIt",
    author: "estimatIt",
  });

  // ── Section 1: Measurement Sheet ──────────────────────────────────────
  buildMeasurementSheetSection(doc, opts);

  // ── Section 2: Abstract ───────────────────────────────────────────────
  buildAbstractSection(doc, opts);

  // ── Section 3: Recapitulation (if configured) ─────────────────────────
  if (opts.recapItems && opts.recapItems.length > 0) {
    buildRecapSection(doc, opts, opts.recapItems);
  }

  // ── Page numbers & footer ─────────────────────────────────────────────
  addPageNumbers(doc, project.name);

  // ── Save / Download ───────────────────────────────────────────────────
  const filename = `${project.name.replace(/[^a-zA-Z0-9_\- ]/g, "")}_estimate.pdf`;
  doc.save(filename);

  return filename;
}
