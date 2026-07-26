import { jsPDF } from "jspdf";
import type { Project } from "@estimatit/shared";
import {
  PDF_COLORS,
  PDF_FONT_SIZE,
  PDF_FONT_SIZE_HEADER,
  PDF_FONT_SIZE_SUBHEADER,
  PDF_MARGINS,
} from "../constants";

/**
 * Add page numbers to every page as a footer.
 * Must be called AFTER all content has been rendered.
 */
export function addPageNumbers(doc: jsPDF, projectName: string): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Footer: page number (right)
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - PDF_MARGINS.right,
      pageHeight - 8,
      { align: "right" },
    );

    // Footer: project name (left)
    doc.text(projectName, PDF_MARGINS.left, pageHeight - 8);
  }
}

/**
 * Render the project header block (project name, work order, date, SSR version).
 * Returns the Y position after the header for subsequent content.
 */
export function renderSectionHeader(
  doc: jsPDF,
  title: string,
  project: Project,
  ssrVersionLabel?: string,
  startY?: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY ?? PDF_MARGINS.top;

  // Title
  doc.setFontSize(PDF_FONT_SIZE_HEADER);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.black);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 7;

  // Project name
  doc.setFontSize(PDF_FONT_SIZE_SUBHEADER + 1);
  doc.text(project.name, pageWidth / 2, y, { align: "center" });
  y += 6;

  // Work order + date row
  doc.setFontSize(PDF_FONT_SIZE);
  doc.setFont("helvetica", "normal");
  const woText = `Work Order: ${project.work_order_no || "—"}`;
  const dateText = `Date: ${new Date().toLocaleDateString("en-IN")}`;
  doc.text(woText, PDF_MARGINS.left, y);
  doc.text(dateText, pageWidth - PDF_MARGINS.right, y, { align: "right" });
  y += 5;

  // SSR Version
  doc.setFont("helvetica", "italic");
  doc.text(`SSR Version: ${ssrVersionLabel || "N/A"}`, PDF_MARGINS.left, y);
  doc.setFont("helvetica", "normal");
  y += 4;

  // Divider line
  doc.setDrawColor(...PDF_COLORS.black);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGINS.left, y, pageWidth - PDF_MARGINS.right, y);
  y += 4;

  return y;
}
