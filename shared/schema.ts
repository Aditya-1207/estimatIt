import { pgTable, text, serial, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// SSR Items schema
export const ssrItems = pgTable("ssr_items", {
  id: serial("id").primaryKey(),
  itemCode: text("item_code").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  rate: real("rate").notNull(),
  category: text("category").notNull(),
  ssrVersion: text("ssr_version").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// SSR Versions schema
export const ssrVersions = pgTable("ssr_versions", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  description: text("description"),
  effectiveDate: timestamp("effective_date").notNull(),
  isActive: integer("is_active").notNull().default(0),
  totalItems: integer("total_items").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// BOQ Items schema
export const boqItems = pgTable("boq_items", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  quantity: real("quantity").notNull(),
  rate: real("rate").notNull(),
  amount: real("amount").notNull(),
  remarks: text("remarks"),
  itemCode: text("item_code"),
  sequenceNumber: integer("sequence_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects schema
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  workOrderNo: text("work_order_no"),
  totalAmount: real("total_amount").notNull().default(0),
  itemCount: integer("item_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertSSRItemSchema = createInsertSchema(ssrItems).omit({
  id: true,
  createdAt: true,
});

export const insertSSRVersionSchema = createInsertSchema(ssrVersions).omit({
  id: true,
  createdAt: true,
});

export const insertBOQItemSchema = createInsertSchema(boqItems).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type SSRItem = typeof ssrItems.$inferSelect;
export type InsertSSRItem = z.infer<typeof insertSSRItemSchema>;

export type SSRVersion = typeof ssrVersions.$inferSelect;
export type InsertSSRVersion = z.infer<typeof insertSSRVersionSchema>;

export type BOQItem = typeof boqItems.$inferSelect;
export type InsertBOQItem = z.infer<typeof insertBOQItemSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Additional schemas for API requests
export const searchSSRItemsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional().default(10),
});

export const createBOQItemSchema = insertBOQItemSchema.extend({
  projectId: z.string().min(1),
});

export const updateProjectSchema = z.object({
  name: z.string().optional(),
  workOrderNo: z.string().optional(),
});
