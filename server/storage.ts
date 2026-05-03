import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { 
  SSRItem, 
  InsertSSRItem, 
  SSRVersion, 
  InsertSSRVersion, 
  BOQItem, 
  InsertBOQItem, 
  Project, 
  InsertProject 
} from "@shared/schema";

export interface IStorage {
  // SSR Items
  getSSRItems(): Promise<SSRItem[]>;
  searchSSRItems(query: string, limit?: number): Promise<SSRItem[]>;
  createSSRItem(item: InsertSSRItem): Promise<SSRItem>;
  createSSRItems(items: InsertSSRItem[]): Promise<SSRItem[]>;
  clearSSRItems(version: string): Promise<void>;
  
  // SSR Versions
  getSSRVersions(): Promise<SSRVersion[]>;
  getActiveSSRVersion(): Promise<SSRVersion | undefined>;
  createSSRVersion(version: InsertSSRVersion): Promise<SSRVersion>;
  setActiveSSRVersion(versionId: number): Promise<void>;
  
  // BOQ Items
  getBOQItems(projectId: string): Promise<BOQItem[]>;
  getBOQItemById(id: number): Promise<BOQItem | undefined>;
  createBOQItem(item: InsertBOQItem): Promise<BOQItem>;
  updateBOQItem(id: number, item: Partial<BOQItem>): Promise<BOQItem>;
  deleteBOQItem(id: number): Promise<void>;
  
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private ssrItems: Map<number, SSRItem> = new Map();
  private ssrVersions: Map<number, SSRVersion> = new Map();
  private boqItems: Map<number, BOQItem> = new Map();
  private projects: Map<string, Project> = new Map();
  
  private ssrItemIdCounter = 1;
  private ssrVersionIdCounter = 1;
  private boqItemIdCounter = 1;

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default SSR version
    const defaultVersion: SSRVersion = {
      id: 1,
      version: "SSR 2022-23",
      description: "State Schedule of Rates for Maharashtra PWD 2022-23",
      effectiveDate: new Date("2022-07-25"),
      isActive: 1,
      totalItems: 0,
      createdAt: new Date(),
    };
    this.ssrVersions.set(1, defaultVersion);
    this.ssrVersionIdCounter = 2;

    // Load all SSR items from the parsed seed file (Maharashtra PWD SSR 2022-23)
    try {
      const seedPath = join(dirname(fileURLToPath(import.meta.url)), "ssr-seed.json");
      const seedRaw: Array<{ itemCode: string; description: string; unit: string; rate: number; category: string }> =
        JSON.parse(readFileSync(seedPath, "utf8"));

      let id = 1;
      for (const item of seedRaw) {
        const ssrItem: SSRItem = {
          id,
          itemCode: item.itemCode,
          description: item.description,
          unit: item.unit,
          rate: item.rate,
          category: item.category,
          ssrVersion: "SSR 2022-23",
          createdAt: new Date(),
        };
        this.ssrItems.set(id, ssrItem);
        id++;
      }
      this.ssrItemIdCounter = id;
      defaultVersion.totalItems = seedRaw.length;
      this.ssrVersions.set(1, defaultVersion);
      console.log(`[SSR] Loaded ${seedRaw.length} items from seed file.`);
    } catch (err) {
      console.error("[SSR] Failed to load seed data:", err);
      this.ssrItemIdCounter = 1;
    }

    // legacy array removed — seed file handles all items above
    if (false) { const defaultItems: SSRItem[] = [
      {
        id: 1,
        itemCode: "21.01",
        description: "Excavation in soil",
        unit: "m³",
        rate: 180.00,
        category: "Excavation",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 2,
        itemCode: "21.02",
        description: "Excavation in hard soil",
        unit: "m³",
        rate: 210.00,
        category: "Excavation",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 3,
        itemCode: "21.03",
        description: "Excavation in soft rock",
        unit: "m³",
        rate: 320.00,
        category: "Excavation",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 4,
        itemCode: "24.01",
        description: "Plain cement concrete 1:4:8",
        unit: "m³",
        rate: 600.00,
        category: "Plain Cement Concrete",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 5,
        itemCode: "24.02",
        description: "Plain cement concrete 1:3:6",
        unit: "m³",
        rate: 750.00,
        category: "Plain Cement Concrete",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 6,
        itemCode: "24.03",
        description: "Plain cement concrete 1:2:4",
        unit: "m³",
        rate: 900.00,
        category: "Plain Cement Concrete",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 7,
        itemCode: "25.11",
        description: "Reinforced cement concrete M20",
        unit: "m³",
        rate: 1200.00,
        category: "Reinforcement Cement Concrete",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 8,
        itemCode: "25.12",
        description: "Reinforced cement concrete M25",
        unit: "m³",
        rate: 1350.00,
        category: "Reinforcement Cement Concrete",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 9,
        itemCode: "27.01",
        description: "Brick work 230mm thick",
        unit: "m³",
        rate: 750.00,
        category: "Brick Work",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 10,
        itemCode: "27.02",
        description: "Brick work 115mm thick",
        unit: "m³",
        rate: 650.00,
        category: "Brick Work",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 11,
        itemCode: "32.01",
        description: "Plastering 12mm thick cement mortar",
        unit: "m²",
        rate: 45.00,
        category: "Plastering and Pointing",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 12,
        itemCode: "32.02",
        description: "Plastering 20mm thick cement mortar",
        unit: "m²",
        rate: 65.00,
        category: "Plastering and Pointing",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 13,
        itemCode: "33.01",
        description: "Cement concrete flooring 40mm thick",
        unit: "m²",
        rate: 125.00,
        category: "Paving, Flooring and Dado",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 14,
        itemCode: "33.02",
        description: "Vitrified tiles flooring",
        unit: "m²",
        rate: 280.00,
        category: "Paving, Flooring and Dado",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 15,
        itemCode: "38.01",
        description: "AC sheet roofing 6mm thick",
        unit: "m²",
        rate: 145.00,
        category: "Roofing and Ceiling",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 16,
        itemCode: "38.02",
        description: "GI sheet roofing 0.5mm thick",
        unit: "m²",
        rate: 180.00,
        category: "Roofing and Ceiling",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 17,
        itemCode: "3.01",
        description: "Water bound macadam 75mm thick",
        unit: "m²",
        rate: 85.00,
        category: "Road Sub Base and Base Course",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 18,
        itemCode: "3.02",
        description: "Wet mix macadam 150mm thick including spreading, rolling, and compaction",
        unit: "m²",
        rate: 165.00,
        category: "Road Sub Base and Base Course",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 19,
        itemCode: "4.01",
        description: "Bituminous macadam 50mm thick",
        unit: "m²",
        rate: 125.00,
        category: "Road Surfacing Course",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 20,
        itemCode: "4.02",
        description: "Dense bituminous macadam 100mm thick",
        unit: "m²",
        rate: 245.00,
        category: "Road Surfacing Course",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },

      // ── Volume / m³ ─────────────────────────────────────────────────────────
      {
        id: 21,
        itemCode: "21.04",
        description: "Excavation for foundation in earth, soils of all types, sand, gravel and soft murum, including removal of excavated material up to a lead of 50m",
        unit: "m³",
        rate: 195.00,
        category: "Excavation",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 22,
        itemCode: "24.04",
        description: "Providing and laying in situ plain cement concrete (PCC) of grade M15 (1:2:4) for foundation and bedding, including curing and formwork",
        unit: "m³",
        rate: 4850.00,
        category: "Plain Cement Concrete",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 23,
        itemCode: "27.03",
        description: "Providing second-class burnt brick masonry in cement mortar 1:6 in foundation and plinth",
        unit: "m³",
        rate: 5200.00,
        category: "Brick Work",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 24,
        itemCode: "25.13",
        description: "Providing and laying Ready Mix Concrete (RMC) of grade M25 for RCC slabs and beams",
        unit: "m³",
        rate: 6800.00,
        category: "Reinforcement Cement Concrete",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },

      // ── Area / m² ───────────────────────────────────────────────────────────
      {
        id: 25,
        itemCode: "32.03",
        description: "Providing and applying internal cement plaster 12mm thick in single coat in cement mortar 1:4",
        unit: "m²",
        rate: 120.00,
        category: "Plastering and Pointing",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 26,
        itemCode: "33.04",
        description: "Providing and fixing vitrified floor tiles (600x600mm) with cement-based synthetic adhesive including grouting",
        unit: "m²",
        rate: 650.00,
        category: "Paving, Flooring and Dado",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 27,
        itemCode: "40.01",
        description: "Providing and applying two coats of 100% acrylic flat exterior paint over a coat of primer on external surfaces",
        unit: "m²",
        rate: 85.00,
        category: "Painting",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },

      // ── Length / Rmt ─────────────────────────────────────────────────────────
      {
        id: 28,
        itemCode: "50.01",
        description: "Providing and laying 110mm diameter PVC rigid pipes (Class 3) for drainage lines including jointing with solvent cement",
        unit: "rmt",
        rate: 380.00,
        category: "Drainage and Sewerage",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 29,
        itemCode: "50.02",
        description: "Providing and fixing 25mm dia. G.I. pipes (B-Class) for internal water supply lines with necessary specials and clamps",
        unit: "rmt",
        rate: 220.00,
        category: "Water Supply",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 30,
        itemCode: "60.01",
        description: "Providing and fixing 100mm high wooden skirting on the wall matched with flooring including finishing",
        unit: "rmt",
        rate: 145.00,
        category: "Carpentry and Joinery",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },

      // ── Count / Nos ──────────────────────────────────────────────────────────
      {
        id: 31,
        itemCode: "61.01",
        description: "Providing and fixing factory-made solid core flush door shutters 35mm thick with commercial veneer on both faces",
        unit: "nos",
        rate: 4500.00,
        category: "Doors and Windows",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 32,
        itemCode: "62.01",
        description: "Providing and fixing white vitreous china wash basin (630x450mm) with C.P. brass pillar tap and PVC waste pipe complete",
        unit: "nos",
        rate: 3200.00,
        category: "Sanitary Fittings",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 33,
        itemCode: "63.01",
        description: "Providing and erecting street light LED luminaire (45 Watt) with driver on existing poles including wiring",
        unit: "nos",
        rate: 8500.00,
        category: "Electrical Works",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },

      // ── Weight / MT and kg ───────────────────────────────────────────────────
      {
        id: 34,
        itemCode: "26.01",
        description: "Providing and fixing Thermo Mechanically Treated (TMT) Fe-500 steel reinforcement bars for RCC work including cutting, bending and tying with binding wire",
        unit: "mt",
        rate: 62000.00,
        category: "Steel Work",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 35,
        itemCode: "26.02",
        description: "Providing and fabricating structural steel work in rolled sections like joists, channels and angles for roof trusses including painting one coat of red oxide primer",
        unit: "mt",
        rate: 72000.00,
        category: "Steel Work",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 36,
        itemCode: "26.03",
        description: "Supplying and fixing MS grills for windows as per approved design including painting one coat of red oxide primer",
        unit: "kg",
        rate: 72.00,
        category: "Steel Work",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },

      // ── Brass ────────────────────────────────────────────────────────────────
      {
        id: 37,
        itemCode: "22.01",
        description: "Supplying standard quality river sand for masonry and plastering works at site including unloading",
        unit: "brass",
        rate: 1800.00,
        category: "Raw Materials",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 38,
        itemCode: "22.02",
        description: "Supplying crushed stone metal (aggregate) of 20mm nominal size conforming to IS specifications at site",
        unit: "brass",
        rate: 2200.00,
        category: "Raw Materials",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },

      // ── Lump Sum ─────────────────────────────────────────────────────────────
      {
        id: 39,
        itemCode: "01.01",
        description: "Site clearance including uprooting of rank vegetation, grass and bushes, and levelling of the area before layout",
        unit: "ls",
        rate: 25000.00,
        category: "Miscellaneous",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
      {
        id: 40,
        itemCode: "99.01",
        description: "Maintenance of Reverse Osmosis (RO) plant machinery and pump sets for a period of one month including consumables",
        unit: "ls",
        rate: 18000.00,
        category: "Miscellaneous",
        ssrVersion: "SSR 2022-23",
        createdAt: new Date(),
      },
    ]; defaultItems.forEach(item => { this.ssrItems.set(item.id, item); }); } // end if(false) dead-code block
  }

  // SSR Items
  async getSSRItems(): Promise<SSRItem[]> {
    return Array.from(this.ssrItems.values());
  }

  async searchSSRItems(query: string, limit = 20): Promise<SSRItem[]> {
    const lowercaseQuery = query.toLowerCase();
    const items = Array.from(this.ssrItems.values());
    
    const matches = items.filter(item => 
      item.description.toLowerCase().includes(lowercaseQuery) ||
      item.itemCode.toLowerCase().includes(lowercaseQuery) ||
      item.category.toLowerCase().includes(lowercaseQuery)
    );
    
    return matches.slice(0, limit);
  }

  async createSSRItem(item: InsertSSRItem): Promise<SSRItem> {
    const id = this.ssrItemIdCounter++;
    const newItem: SSRItem = {
      ...item,
      id,
      createdAt: new Date(),
    };
    this.ssrItems.set(id, newItem);
    return newItem;
  }

  async createSSRItems(items: InsertSSRItem[]): Promise<SSRItem[]> {
    const createdItems: SSRItem[] = [];
    for (const item of items) {
      const createdItem = await this.createSSRItem(item);
      createdItems.push(createdItem);
    }
    return createdItems;
  }

  async clearSSRItems(version: string): Promise<void> {
    const itemsToDelete = Array.from(this.ssrItems.values())
      .filter(item => item.ssrVersion === version);
    
    itemsToDelete.forEach(item => {
      this.ssrItems.delete(item.id);
    });
  }

  // SSR Versions
  async getSSRVersions(): Promise<SSRVersion[]> {
    return Array.from(this.ssrVersions.values());
  }

  async getActiveSSRVersion(): Promise<SSRVersion | undefined> {
    return Array.from(this.ssrVersions.values()).find(v => v.isActive === 1);
  }

  async createSSRVersion(version: InsertSSRVersion): Promise<SSRVersion> {
    const id = this.ssrVersionIdCounter++;
    const newVersion: SSRVersion = {
      ...version,
      id,
      createdAt: new Date(),
    };
    this.ssrVersions.set(id, newVersion);
    return newVersion;
  }

  async setActiveSSRVersion(versionId: number): Promise<void> {
    // Deactivate all versions
    this.ssrVersions.forEach(version => {
      version.isActive = 0;
    });
    
    // Activate the specified version
    const version = this.ssrVersions.get(versionId);
    if (version) {
      version.isActive = 1;
    }
  }

  // BOQ Items
  async getBOQItems(projectId: string): Promise<BOQItem[]> {
    return Array.from(this.boqItems.values())
      .filter(item => item.projectId === projectId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  async getBOQItemById(id: number): Promise<BOQItem | undefined> {
    return this.boqItems.get(id);
  }

  async createBOQItem(item: InsertBOQItem): Promise<BOQItem> {
    const id = this.boqItemIdCounter++;
    const newItem: BOQItem = {
      ...item,
      id,
      createdAt: new Date(),
    };
    this.boqItems.set(id, newItem);
    return newItem;
  }

  async updateBOQItem(id: number, item: Partial<BOQItem>): Promise<BOQItem> {
    const existingItem = this.boqItems.get(id);
    if (!existingItem) {
      throw new Error(`BOQ item with id ${id} not found`);
    }
    
    const updatedItem = { ...existingItem, ...item };
    this.boqItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteBOQItem(id: number): Promise<void> {
    if (!this.boqItems.has(id)) {
      throw new Error(`BOQ item with id ${id} not found`);
    }
    this.boqItems.delete(id);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const newProject: Project = {
      ...project,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(project.id, newProject);
    return newProject;
  }

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    const existingProject = this.projects.get(id);
    if (!existingProject) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    const updatedProject = { 
      ...existingProject, 
      ...project, 
      updatedAt: new Date() 
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    if (!this.projects.has(id)) {
      throw new Error(`Project with id ${id} not found`);
    }
    this.projects.delete(id);
  }
}

export const storage = new MemStorage();
