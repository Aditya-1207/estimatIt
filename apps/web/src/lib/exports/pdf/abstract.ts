import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportOptions } from "../types";
import { blockMeta, blockQuantityTotal, fmt, fmtCurrency } from "../utils";
import { PDF_COLORS, PDF_FONT_SIZE, PDF_MARGINS } from "../constants";
import { renderSectionHeader } from "./utils";

export function buildAbstractSection(
  doc: jsPDF,
  opts: ExportOptions,
): void {
  const { project, blocks, ssrVersionLabel } = opts;

  // Start on a new page
  doc.addPage();

  const startY = renderSectionHeader(
    doc,
    "Abstract",
    project,
    ssrVersionLabel,
  );

  const body: any[][] = [];
  let grandTotal = 0;

  for (const block of blocks) {
    const meta = blockMeta(block);
    const qty = blockQuantityTotal(block);
    const amount = qty * meta.rate;
    grandTotal += amount;

    body.push([
      meta.unit,
      fmt(qty),
      String(block.sequence_number),
      meta.description,
      fmt(meta.rate),
      { content: fmt(amount), styles: { fontStyle: "bold" } },
    ]);
  }

  // Total row
  body.push([
    {
      content: "Total",
      colSpan: 5,
      styles: {
        fontStyle: "bold",
        halign: "right",
        fillColor: PDF_COLORS.grandTotalBg,
      },
    },
    {
      content: fmtCurrency(grandTotal),
      styles: {
        fontStyle: "bold",
        halign: "right",
        fillColor: PDF_COLORS.grandTotalBg,
      },
    },
  ]);

  // "Say" row (rounded)
  body.push([
    {
      content: "Say",
      colSpan: 5,
      styles: {
        fontStyle: "bolditalic",
        halign: "right",
        fillColor: PDF_COLORS.grandTotalBg,
      },
    },
    {
      content: fmtCurrency(Math.round(grandTotal), 0),
      styles: {
        fontStyle: "bolditalic",
        halign: "right",
        fillColor: PDF_COLORS.grandTotalBg,
      },
    },
  ]);

  autoTable(doc, {
    startY,
    head: [["Unit", "Quantity", "Item\nNo", "Item", "Rate (Rs.)", "Amount (Rs.)"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: PDF_FONT_SIZE,
      cellPadding: 1.5,
      lineColor: PDF_COLORS.black,
      lineWidth: 0.2,
      textColor: PDF_COLORS.black,
      valign: "middle",
    },
    headStyles: {
      fillColor: PDF_COLORS.colHeaderBg,
      textColor: PDF_COLORS.black,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: PDF_FONT_SIZE,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },   // Unit
      1: { cellWidth: 22, halign: "right" },     // Quantity
      2: { cellWidth: 14, halign: "center" },    // Item No
      3: { cellWidth: "auto" },                  // Item description
      4: { cellWidth: 24, halign: "right" },     // Rate
      5: { cellWidth: 28, halign: "right" },     // Amount
    },
    margin: PDF_MARGINS,
  });
}
