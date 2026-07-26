import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportOptions } from "../types";
import type { RecapitulationItem } from "@estimatit/shared";
import { blockMeta, blockQuantityTotal, fmt, fmtCurrency } from "../utils";
import { PDF_COLORS, PDF_FONT_SIZE, PDF_MARGINS } from "../constants";
import { renderSectionHeader } from "./utils";

export function buildRecapSection(
  doc: jsPDF,
  opts: ExportOptions,
  recapItems: RecapitulationItem[],
): void {
  const { project, blocks, ssrVersionLabel } = opts;

  // Start on a new page
  doc.addPage();

  const startY = renderSectionHeader(
    doc,
    "Recapitulation",
    project,
    ssrVersionLabel,
  );

  // Compute abstract total
  let abstractTotal = 0;
  for (const block of blocks) {
    const meta = blockMeta(block);
    const qty = blockQuantityTotal(block);
    abstractTotal += qty * meta.rate;
  }

  // Banner row: Abstract total
  const bannerBody: any[][] = [
    [
      {
        content: "Estimated Cost as per Abstract",
        colSpan: 3,
        styles: {
          fontStyle: "bold",
          fillColor: [232, 244, 253] as [number, number, number],
        },
      },
      {
        content: fmtCurrency(abstractTotal),
        styles: {
          fontStyle: "bold",
          halign: "right",
          fillColor: [232, 244, 253] as [number, number, number],
        },
      },
    ],
  ];

  // Render the banner as a mini-table
  autoTable(doc, {
    startY,
    body: bannerBody,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: PDF_FONT_SIZE,
      cellPadding: 2,
      lineColor: PDF_COLORS.black,
      lineWidth: 0.2,
      textColor: PDF_COLORS.black,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: "auto", halign: "right" },
    },
    margin: PDF_MARGINS,
  });

  // Get the Y position after the banner
  const bannerEndY = (doc as any).lastAutoTable?.finalY ?? startY + 12;

  // Data rows
  const body: any[][] = [];
  let runningTotal = 0;

  for (const item of recapItems) {
    const isTotalRow = item.type === "rounded_total";

    // Inject "Total" separator before rounded_total
    if (isTotalRow) {
      body.push([
        "",
        {
          content: "Total",
          styles: { fontStyle: "bold", halign: "right" },
        },
        "",
        {
          content: fmtCurrency(runningTotal),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ]);
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

    const rowStyles: any = {};
    if (isTotalRow) {
      rowStyles.fontStyle = "bolditalic";
    }

    body.push([
      { content: String(item.sequence_number), styles: { halign: "center" } },
      {
        content: item.description,
        styles: isTotalRow
          ? { fontStyle: "bolditalic", halign: "right" }
          : {},
      },
      item.type === "percentage"
        ? { content: `${fmt(item.percentage)}%`, styles: { halign: "center" } }
        : { content: "—", styles: { halign: "center" } },
      {
        content: fmtCurrency(computedAmount),
        styles: {
          halign: "right",
          ...(isTotalRow ? { fontStyle: "bold" } : {}),
        },
      },
    ]);
  }

  autoTable(doc, {
    startY: bannerEndY + 3,
    head: [["#", "Description", "%", "Amount (Rs.)"]],
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
      0: { cellWidth: 12, halign: "center" },  // #
      1: { cellWidth: "auto" },                 // Description
      2: { cellWidth: 22, halign: "center" },   // %
      3: { cellWidth: 35, halign: "right" },    // Amount
    },
    margin: PDF_MARGINS,
  });
}
