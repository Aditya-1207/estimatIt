import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportOptions } from "../types";
import { blockMeta, fmt, fmtCurrency, rowQuantity } from "../utils";
import { PDF_COLORS, PDF_FONT_SIZE, PDF_MARGINS } from "../constants";
import { renderSectionHeader } from "./utils";

export function buildMeasurementSheetSection(
  doc: jsPDF,
  opts: ExportOptions,
): void {
  const { project, blocks, ssrVersionLabel } = opts;

  const startY = renderSectionHeader(
    doc,
    "Measurement Sheet",
    project,
    ssrVersionLabel,
  );

  // Build the table body rows
  const body: any[][] = [];
  let grandTotalAmount = 0;

  for (const block of blocks) {
    const meta = blockMeta(block);
    let blockTotalQty = 0;

    // SSR Item header row — spans description columns
    body.push([
      {
        content: String(block.sequence_number),
        styles: {
          fontStyle: "bold",
          textColor: PDF_COLORS.primary,
          fillColor: PDF_COLORS.headerBg,
          halign: "center",
          valign: "top",
        },
      },
      {
        content: `[${meta.itemNo}]: ${meta.description}\nUnit: ${meta.unit}  |  Rate: Rs. ${fmt(meta.rate)}`,
        colSpan: 6,
        styles: {
          fontStyle: "bold",
          textColor: PDF_COLORS.primary,
          fillColor: PDF_COLORS.headerBg,
          valign: "top",
          cellWidth: "auto",
        },
      },
    ]);

    // Major items and dimension rows
    for (const mi of block.major_items) {
      // Build groups of consecutive rows sharing a minor description
      const descGroups: { description: string; rows: typeof mi.dimension_rows }[] = [];
      for (const dr of mi.dimension_rows) {
        const last = descGroups[descGroups.length - 1];
        if (last && last.description === dr.description) {
          last.rows.push(dr);
        } else {
          descGroups.push({ description: dr.description, rows: [dr] });
        }
      }

      // If no dimension rows, add a placeholder row for the major item
      if (descGroups.length === 0) {
        body.push([
          "",
          { content: mi.description, styles: { fontStyle: "bold" } },
          "",
          "",
          "",
          "",
          "",
        ]);
      }

      for (let gi = 0; gi < descGroups.length; gi++) {
        const group = descGroups[gi];

        for (let ri = 0; ri < group.rows.length; ri++) {
          const dr = group.rows[ri];
          const qty = rowQuantity(dr);
          blockTotalQty += qty;

          body.push([
            "", // Sr No (blank for dimension rows)
            ri === 0 && gi === 0 ? { content: mi.description, styles: { fontStyle: "bold" } } : "",
            ri === 0 ? group.description : "",
            dr.number > 0 ? fmt(dr.number) : "",
            dr.length > 0 ? fmt(dr.length) : "",
            dr.breadth > 0 ? fmt(dr.breadth) : "",
            dr.depth > 0 ? fmt(dr.depth) : "",
            qty > 0 ? fmt(qty) : "",
          ]);
        }
      }
    }

    // Block subtotal row
    body.push([
      {
        content: `Total Quantity — [${meta.itemNo}]`,
        colSpan: 7,
        styles: {
          fontStyle: "bold",
          halign: "right",
          fillColor: PDF_COLORS.subtotalBg,
        },
      },
      {
        content: fmt(blockTotalQty),
        styles: {
          fontStyle: "bold",
          halign: "right",
          fillColor: PDF_COLORS.subtotalBg,
        },
      },
    ]);

    grandTotalAmount += blockTotalQty * meta.rate;
  }

  // Grand Total row
  body.push([
    {
      content: "Grand Total Estimated Amount",
      colSpan: 7,
      styles: {
        fontStyle: "bold",
        halign: "right",
        fillColor: PDF_COLORS.grandTotalBg,
        fontSize: PDF_FONT_SIZE + 1,
      },
    },
    {
      content: fmtCurrency(grandTotalAmount),
      styles: {
        fontStyle: "bold",
        halign: "right",
        fillColor: PDF_COLORS.grandTotalBg,
        fontSize: PDF_FONT_SIZE,
        overflow: "linebreak",
        cellWidth: 30,
      },
    },
  ]);

  // Render table
  autoTable(doc, {
    startY,
    head: [[
      "Sr No",
      "Major Item",
      "Description",
      "No",
      "Length",
      "Breadth",
      "Depth/\nHeight",
      "Quantity",
    ]],
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
      0: { cellWidth: 12, halign: "center" },   // Sr No
      1: { cellWidth: 26 },                      // Major Item
      2: { cellWidth: "auto" },                  // Description (flexible)
      3: { cellWidth: 14, halign: "right" },     // No
      4: { cellWidth: 16, halign: "right" },     // Length
      5: { cellWidth: 16, halign: "right" },     // Breadth
      6: { cellWidth: 16, halign: "right" },     // Depth/Height
      7: { cellWidth: 30, halign: "right" },     // Quantity / Amount
    },
    margin: PDF_MARGINS,
    didDrawPage: () => {
      // Running header on continuation pages
      const pageNum = doc.getNumberOfPages();
      if (pageNum > 1) {
        doc.setFontSize(8);
        doc.setTextColor(...PDF_COLORS.gray);
        doc.text(
          `${project.name} — Measurement Sheet (contd.)`,
          PDF_MARGINS.left,
          PDF_MARGINS.top - 5,
        );
      }
    },
  });
}
