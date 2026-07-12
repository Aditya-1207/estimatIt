import { create } from "zustand";
import { temporal } from "zundo";
import type { MeasurementBlockWithDetails, MajorItemWithDimensions, DimensionRowWithMeta } from "../lib/api/measurements";
import type { DimensionRow } from "@estimatit/shared";
import { 
  updateDimensionRow as apiUpdateDimensionRow,
  createDimensionRow as apiCreateDimensionRow,
  deleteDimensionRow as apiDeleteDimensionRow,
  updateMajorItem as apiUpdateMajorItem,
  createMajorItem as apiCreateMajorItem,
  deleteMajorItem as apiDeleteMajorItem,
  createMeasurementBlock as apiCreateMeasurementBlock,
  deleteMeasurementBlock as apiDeleteMeasurementBlock,
  updateMeasurementBlock as apiUpdateMeasurementBlock
} from "../lib/api/measurements";
import debounce from "lodash.debounce";

interface MeasurementState {
  blocks: MeasurementBlockWithDetails[];
  projectId: string | null;
  syncStatus: "idle" | "saving" | "error";
  
  setSheet: (projectId: string, blocks: MeasurementBlockWithDetails[]) => void;
  
  // Row Actions
  updateDimensionRow: (blockId: string, majorItemId: string, rowId: string, updates: Partial<DimensionRow>) => void;
  addDimensionRow: (blockId: string, majorItemId: string, newRow: DimensionRowWithMeta) => void;
  deleteDimensionRow: (blockId: string, majorItemId: string, rowId: string) => void;
  
  // Major Item Actions
  updateMajorItem: (blockId: string, majorItemId: string, description: string) => void;
  addMajorItem: (blockId: string, newMajorItem: MajorItemWithDimensions) => void;
  deleteMajorItem: (blockId: string, majorItemId: string) => void;
  
  // Block Actions
  addMeasurementBlock: (newBlock: MeasurementBlockWithDetails) => void;
  deleteMeasurementBlock: (blockId: string) => void;

  // Reordering
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  reorderMajorItems: (blockId: string, startIndex: number, endIndex: number) => void;
  reorderDimensionRows: (blockId: string, majorItemId: string, startIndex: number, endIndex: number) => void;
}

// Debounced API updaters to prevent spamming the server on keystrokes
const debouncedUpdateRow = debounce(async (id: string, updates: Partial<DimensionRow>, setSync: (s: any) => void) => {
  try {
    setSync("saving");
    await apiUpdateDimensionRow(id, updates);
    setSync("idle");
  } catch (err) {
    setSync("error");
    console.error("Failed to sync row update", err);
  }
}, 500);

const debouncedUpdateMajorItem = debounce(async (id: string, description: string, setSync: (s: any) => void) => {
  try {
    setSync("saving");
    await apiUpdateMajorItem(id, { description });
    setSync("idle");
  } catch (err) {
    setSync("error");
  }
}, 500);

const debouncedUpdateBlockSequence = debounce(async (id: string, sequence_number: number, setSync: (s: any) => void) => {
  try {
    setSync("saving");
    await apiUpdateMeasurementBlock(id, { sequence_number });
    setSync("idle");
  } catch (err) {
    setSync("error");
  }
}, 500);

export const useMeasurementStore = create<MeasurementState>()(
  temporal(
    (set) => ({
      blocks: [],
      projectId: null,
      syncStatus: "idle",
      
      setSheet: (projectId, blocks) => set({ projectId, blocks }),
      
      updateDimensionRow: (blockId, majorItemId, rowId, updates) => {
        set((state) => ({
          blocks: state.blocks.map(b => b.id === blockId ? {
            ...b,
            major_items: b.major_items.map(mi => mi.id === majorItemId ? {
              ...mi,
              dimension_rows: mi.dimension_rows.map(dr => dr.id === rowId ? { ...dr, ...updates } : dr)
            } : mi)
          } : b)
        }));
        debouncedUpdateRow(rowId, updates, (s) => set({ syncStatus: s }));
      },
        
      addDimensionRow: async (blockId, majorItemId, newRow) => {
        set((state) => ({
          blocks: state.blocks.map(b => b.id === blockId ? {
            ...b,
            major_items: b.major_items.map(mi => mi.id === majorItemId ? {
              ...mi,
              dimension_rows: [...mi.dimension_rows, newRow]
            } : mi)
          } : b)
        }));
        try {
          set({ syncStatus: "saving" });
          await apiCreateDimensionRow(newRow);
          set({ syncStatus: "idle" });
        } catch { set({ syncStatus: "error" }); }
      },

      deleteDimensionRow: async (blockId, majorItemId, rowId) => {
        set((state) => ({
          blocks: state.blocks.map(b => b.id === blockId ? {
            ...b,
            major_items: b.major_items.map(mi => mi.id === majorItemId ? {
              ...mi,
              dimension_rows: mi.dimension_rows.filter(dr => dr.id !== rowId)
            } : mi)
          } : b)
        }));
        try {
          set({ syncStatus: "saving" });
          await apiDeleteDimensionRow(rowId);
          set({ syncStatus: "idle" });
        } catch { set({ syncStatus: "error" }); }
      },

      updateMajorItem: (blockId, majorItemId, description) => {
        set((state) => ({
          blocks: state.blocks.map(b => b.id === blockId ? {
            ...b,
            major_items: b.major_items.map(mi => mi.id === majorItemId ? { ...mi, description } : mi)
          } : b)
        }));
        debouncedUpdateMajorItem(majorItemId, description, (s) => set({ syncStatus: s }));
      },

      addMajorItem: async (blockId, newMajorItem) => {
        set((state) => ({
          blocks: state.blocks.map(b => b.id === blockId ? {
            ...b,
            major_items: [...b.major_items, newMajorItem]
          } : b)
        }));
        try {
          set({ syncStatus: "saving" });
          await apiCreateMajorItem(newMajorItem);
          set({ syncStatus: "idle" });
        } catch { set({ syncStatus: "error" }); }
      },

      deleteMajorItem: async (blockId, majorItemId) => {
        set((state) => ({
          blocks: state.blocks.map(b => b.id === blockId ? {
            ...b,
            major_items: b.major_items.filter(mi => mi.id !== majorItemId)
          } : b)
        }));
        try {
          set({ syncStatus: "saving" });
          await apiDeleteMajorItem(majorItemId);
          set({ syncStatus: "idle" });
        } catch { set({ syncStatus: "error" }); }
      },

      addMeasurementBlock: async (newBlock) => {
        set((state) => ({
          blocks: [...state.blocks, newBlock]
        }));
        try {
          set({ syncStatus: "saving" });
          await apiCreateMeasurementBlock({
            project_id: newBlock.project_id,
            sequence_number: newBlock.sequence_number,
            ssr_item_id: newBlock.ssr_item_id,
            custom_description: newBlock.custom_description,
            custom_rate: newBlock.custom_rate,
            custom_unit: newBlock.custom_unit,
          });
          set({ syncStatus: "idle" });
        } catch { set({ syncStatus: "error" }); }
      },

      deleteMeasurementBlock: async (blockId) => {
        set((state) => ({
          blocks: state.blocks.filter(b => b.id !== blockId)
        }));
        try {
          set({ syncStatus: "saving" });
          await apiDeleteMeasurementBlock(blockId);
          set({ syncStatus: "idle" });
        } catch { set({ syncStatus: "error" }); }
      },

      reorderBlocks: (startIndex, endIndex) => {
        set((state) => {
          const newBlocks = Array.from(state.blocks);
          const [removed] = newBlocks.splice(startIndex, 1);
          newBlocks.splice(endIndex, 0, removed);
          
          newBlocks.forEach((b, i) => { 
            b.sequence_number = i + 1; 
            debouncedUpdateBlockSequence(b.id, b.sequence_number, (s) => set({ syncStatus: s }));
          });
          
          return { blocks: newBlocks };
        });
      },

      reorderMajorItems: (blockId, startIndex, endIndex) => {
        set((state) => ({
          blocks: state.blocks.map(b => {
            if (b.id !== blockId) return b;
            const newMi = Array.from(b.major_items);
            const [removed] = newMi.splice(startIndex, 1);
            newMi.splice(endIndex, 0, removed);
            newMi.forEach((mi, i) => { 
              mi.sequence_number = i + 1; 
              // Fire async
              apiUpdateMajorItem(mi.id, { sequence_number: mi.sequence_number }).catch(() => set({ syncStatus: "error" }));
            });
            return { ...b, major_items: newMi };
          })
        }));
      },

      reorderDimensionRows: (blockId, majorItemId, startIndex, endIndex) => {
        set((state) => ({
          blocks: state.blocks.map(b => {
            if (b.id !== blockId) return b;
            return {
              ...b,
              major_items: b.major_items.map(mi => {
                if (mi.id !== majorItemId) return mi;
                const newDr = Array.from(mi.dimension_rows);
                const [removed] = newDr.splice(startIndex, 1);
                newDr.splice(endIndex, 0, removed);
                newDr.forEach((dr, i) => { 
                  dr.sequence_number = i + 1; 
                  // Fire async
                  apiUpdateDimensionRow(dr.id, { sequence_number: dr.sequence_number }).catch(() => set({ syncStatus: "error" }));
                });
                return { ...mi, dimension_rows: newDr };
              })
            };
          })
        }));
      }
    }),
    {
      limit: 50,
      partialize: (state) => ({ blocks: state.blocks }), 
      // Diff approach for zundo is still missing for full undo syncing. 
      // If we need undo to sync to DB, we must listen to zundo events.
    }
  )
);
