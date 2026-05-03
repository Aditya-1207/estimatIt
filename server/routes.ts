import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  searchSSRItemsSchema, 
  createBOQItemSchema, 
  updateBOQItemSchema,
  insertProjectSchema, 
  updateProjectSchema,
  insertSSRVersionSchema,
  insertSSRItemSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // SSR Items routes
  app.get("/api/ssr-items", async (req, res) => {
    try {
      const items = await storage.getSSRItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SSR items" });
    }
  });

  app.post("/api/ssr-items/search", async (req, res) => {
    try {
      const { query, limit } = searchSSRItemsSchema.parse(req.body);
      const items = await storage.searchSSRItems(query, limit);
      res.json(items);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid search parameters" });
      } else {
        res.status(500).json({ message: "Failed to search SSR items" });
      }
    }
  });

  // SSR Versions routes
  app.get("/api/ssr-versions", async (req, res) => {
    try {
      const versions = await storage.getSSRVersions();
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SSR versions" });
    }
  });

  app.get("/api/ssr-versions/active", async (req, res) => {
    try {
      const activeVersion = await storage.getActiveSSRVersion();
      res.json(activeVersion);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active SSR version" });
    }
  });

  app.post("/api/ssr-versions", async (req, res) => {
    try {
      const versionData = insertSSRVersionSchema.parse(req.body);
      const version = await storage.createSSRVersion(versionData);
      res.json(version);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid version data" });
      } else {
        res.status(500).json({ message: "Failed to create SSR version" });
      }
    }
  });

  app.put("/api/ssr-versions/:id/activate", async (req, res) => {
    try {
      const versionId = parseInt(req.params.id);
      await storage.setActiveSSRVersion(versionId);
      res.json({ message: "SSR version activated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to activate SSR version" });
    }
  });

  // SSR File upload and processing
  app.post("/api/ssr-upload", upload.single('ssrFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { version, description, effectiveDate } = req.body;
      
      if (!version || !effectiveDate) {
        return res.status(400).json({ message: "Version and effective date are required" });
      }

      // Create new SSR version
      const ssrVersion = await storage.createSSRVersion({
        version,
        description,
        effectiveDate: new Date(effectiveDate),
        isActive: 0,
        totalItems: 0,
      });

      // TODO: Process PDF file and extract SSR data
      // For now, we'll simulate processing
      const filePath = req.file.path;
      
      // Clean up uploaded file
      await fs.unlink(filePath);

      res.json({
        message: "SSR file uploaded successfully",
        version: ssrVersion,
        itemsProcessed: 0
      });
    } catch (error) {
      console.error("SSR upload error:", error);
      res.status(500).json({ message: "Failed to process SSR file" });
    }
  });

  // BOQ Items routes
  app.get("/api/boq-items/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const items = await storage.getBOQItems(projectId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch BOQ items" });
    }
  });

  app.post("/api/boq-items", async (req, res) => {
    try {
      console.log("BOQ Item request body:", JSON.stringify(req.body, null, 2));
      const itemData = createBOQItemSchema.parse(req.body);
      const item = await storage.createBOQItem(itemData);
      
      // Update project totals
      const project = await storage.getProject(itemData.projectId);
      if (project) {
        const allItems = await storage.getBOQItems(itemData.projectId);
        const totalAmount = allItems.reduce((sum, item) => sum + item.amount, 0);
        await storage.updateProject(itemData.projectId, {
          totalAmount,
          itemCount: allItems.length,
        });
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        res.status(400).json({ 
          message: "Invalid BOQ item data",
          errors: error.errors 
        });
      } else {
        console.error("BOQ creation error:", error);
        res.status(500).json({ message: "Failed to create BOQ item" });
      }
    }
  });

  app.put("/api/boq-items/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const updates = updateBOQItemSchema.parse(req.body);
      const updatedItem = await storage.updateBOQItem(itemId, updates);

      // Recalculate project totals
      const allItems = await storage.getBOQItems(updatedItem.projectId);
      const totalAmount = allItems.reduce((sum, i) => sum + i.amount, 0);
      await storage.updateProject(updatedItem.projectId, {
        totalAmount,
        itemCount: allItems.length,
      });

      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid BOQ item data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update BOQ item" });
      }
    }
  });

  app.delete("/api/boq-items/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getBOQItemById(itemId);

      if (!item) {
        return res.status(404).json({ message: "BOQ item not found" });
      }

      await storage.deleteBOQItem(itemId);

      // Update project totals
      const allItems = await storage.getBOQItems(item.projectId);
      const totalAmount = allItems.reduce((sum, i) => sum + i.amount, 0);
      await storage.updateProject(item.projectId, {
        totalAmount,
        itemCount: allItems.length,
      });

      res.json({ message: "BOQ item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete BOQ item" });
    }
  });

  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid project data" });
      } else {
        res.status(500).json({ message: "Failed to create project" });
      }
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = updateProjectSchema.parse(req.body);
      const project = await storage.updateProject(id, updateData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid project data" });
      } else {
        res.status(500).json({ message: "Failed to update project" });
      }
    }
  });

  // Excel export route
  app.get("/api/export/excel/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      const items = await storage.getBOQItems(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Maharashtra PWD BOQ Tool";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Bill of Quantities", {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
      });

      // ── Column widths ──
      sheet.columns = [
        { key: "sno",    width: 6  },
        { key: "code",   width: 10 },
        { key: "desc",   width: 46 },
        { key: "unit",   width: 10 },
        { key: "qty",    width: 12 },
        { key: "rate",   width: 14 },
        { key: "amount", width: 18 },
        { key: "rem",    width: 22 },
      ];

      const BLUE      = "FF1D4ED8";
      const NAVY      = "FF1E3A5F";
      const LTBLUE    = "FFE8F0FE";
      const MIDGRAY   = "FFF1F5F9";
      const WHITE     = "FFFFFFFF";
      const BLACK     = "FF0F172A";

      const boldWhite = { bold: true, color: { argb: WHITE }, size: 11 };

      // ── Title block ──
      sheet.mergeCells("A1:H1");
      const t1 = sheet.getCell("A1");
      t1.value = "Maharashtra Public Works Department";
      t1.font  = { bold: true, size: 15, color: { argb: WHITE } };
      t1.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      t1.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 28;

      sheet.mergeCells("A2:H2");
      const t2 = sheet.getCell("A2");
      t2.value = "BILL OF QUANTITIES";
      t2.font  = { bold: true, size: 13, color: { argb: WHITE } };
      t2.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      t2.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(2).height = 24;

      // ── Project info ──
      const infoRows: [string, string][] = [
        ["Project Name",   project.name],
        ["Work Order No.", project.workOrderNo ?? "—"],
        ["Date of Export", new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })],
        ["Total Items",    String(items.length)],
      ];
      infoRows.forEach(([label, value], i) => {
        const row = sheet.getRow(3 + i);
        sheet.mergeCells(`A${3+i}:B${3+i}`);
        sheet.mergeCells(`C${3+i}:H${3+i}`);
        const lCell = sheet.getCell(`A${3+i}`);
        lCell.value = label;
        lCell.font  = { bold: true, size: 11, color: { argb: BLACK } };
        lCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: MIDGRAY } };
        lCell.alignment = { horizontal: "left", indent: 1, vertical: "middle" };
        const vCell = sheet.getCell(`C${3+i}`);
        vCell.value = value;
        vCell.font  = { size: 11, color: { argb: BLACK } };
        vCell.alignment = { horizontal: "left", indent: 1, vertical: "middle" };
        row.height = 20;
      });

      // ── Table header (row 7) ──
      const hdrs = ["S.No", "Item Code", "Description of Work", "Unit", "Quantity", "Rate (₹)", "Amount (₹)", "Remarks"];
      const hRow = sheet.getRow(7);
      hRow.height = 22;
      hdrs.forEach((h, i) => {
        const cell = hRow.getCell(i + 1);
        cell.value = h;
        cell.font  = boldWhite;
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        cell.alignment = { horizontal: i >= 4 && i <= 6 ? "right" : "center", vertical: "middle", wrapText: true };
        cell.border = { bottom: { style: "thin", color: { argb: WHITE } } };
      });

      const totalAmount = items.reduce((s, it) => s + it.amount, 0);

      // ── Data rows ──
      items.forEach((item, idx) => {
        const rn   = 8 + idx;
        const row  = sheet.getRow(rn);
        row.height = 18;
        const bg   = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: idx % 2 === 0 ? WHITE : LTBLUE } };

        const vals = [
          idx + 1,
          item.itemCode ?? "",
          item.description,
          item.unit,
          item.quantity,
          item.rate,
          item.amount,
          item.remarks ?? "",
        ];
        vals.forEach((v, ci) => {
          const cell = row.getCell(ci + 1);
          cell.value = v;
          cell.fill  = bg;
          cell.font  = { size: 11, color: { argb: BLACK } };
          cell.border = {
            top:    { style: "hair", color: { argb: "FFD1D5DB" } },
            bottom: { style: "hair", color: { argb: "FFD1D5DB" } },
            left:   { style: "hair", color: { argb: "FFD1D5DB" } },
            right:  { style: "hair", color: { argb: "FFD1D5DB" } },
          };
          if (ci === 2) { cell.alignment = { horizontal: "left", indent: 1, vertical: "middle", wrapText: true }; }
          else if (ci >= 4 && ci <= 6) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.numFmt = "#,##0.00";
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      });

      // ── Total row ──
      const totalRow = sheet.getRow(8 + items.length);
      totalRow.height = 22;
      sheet.mergeCells(`A${8+items.length}:F${8+items.length}`);
      const tLabel = totalRow.getCell(1);
      tLabel.value = "GRAND TOTAL";
      tLabel.font  = { bold: true, size: 12, color: { argb: WHITE } };
      tLabel.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      tLabel.alignment = { horizontal: "right", vertical: "middle", indent: 2 };
      const tAmt = totalRow.getCell(7);
      tAmt.value  = totalAmount;
      tAmt.numFmt = "#,##0.00";
      tAmt.font   = { bold: true, size: 12, color: { argb: WHITE } };
      tAmt.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      tAmt.alignment = { horizontal: "right", vertical: "middle" };
      totalRow.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };

      // ── Footer ──
      const footerRow = 9 + items.length;
      sheet.mergeCells(`A${footerRow}:H${footerRow}`);
      const footer = sheet.getCell(`A${footerRow}`);
      footer.value = `Generated by Maharashtra PWD BOQ Estimation Tool · ${new Date().toLocaleString("en-IN")}`;
      footer.font  = { italic: true, size: 9, color: { argb: "FF64748B" } };
      footer.alignment = { horizontal: "center" };

      // ── Stream response ──
      const safeName = project.name.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}_BOQ.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export Excel" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
