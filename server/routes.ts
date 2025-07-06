import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  searchSSRItemsSchema, 
  createBOQItemSchema, 
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
        res.status(400).json({ message: "Invalid BOQ item data" });
      } else {
        res.status(500).json({ message: "Failed to create BOQ item" });
      }
    }
  });

  app.delete("/api/boq-items/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getBOQItems("").then(items => 
        items.find(i => i.id === itemId)
      );
      
      if (!item) {
        return res.status(404).json({ message: "BOQ item not found" });
      }
      
      await storage.deleteBOQItem(itemId);
      
      // Update project totals
      const allItems = await storage.getBOQItems(item.projectId);
      const totalAmount = allItems.reduce((sum, item) => sum + item.amount, 0);
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

      // TODO: Implement Excel generation using ExcelJS
      // For now, return project data
      res.json({
        project,
        items,
        message: "Excel export functionality will be implemented"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to export Excel" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
