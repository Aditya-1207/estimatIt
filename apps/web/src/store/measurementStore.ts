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

// ─── Types ──────────────────────────────────────────────────────────────────

interface MeasurementState {
  blocks: MeasurementBlockWithDetails[];
  projectId: string | null;
  syncStatus: "idle" | "saving" | "error";

  /** Load initial data — this is NOT tracked in undo history. */
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

// ─── Debounced API helpers ──────────────────────────────────────────────────

const debouncedUpdateRow = debounce(async (id: string, updates: Partial<DimensionRow>, setSyncStatus: (s: "idle" | "saving" | "error") => void) => {
  try {
    setSyncStatus("saving");
    await apiUpdateDimensionRow(id, updates);
    setSyncStatus("idle");
  } catch (err) {
    setSyncStatus("error");
    console.error("Failed to sync row update", err);
  }
}, 500);

const debouncedUpdateMajorItem = debounce(async (id: string, description: string, setSyncStatus: (s: "idle" | "saving" | "error") => void) => {
  try {
    setSyncStatus("saving");
    await apiUpdateMajorItem(id, { description });
    setSyncStatus("idle");
  } catch (err) {
    setSyncStatus("error");
  }
}, 500);

const debouncedUpdateBlockSequence = debounce(async (id: string, sequence_number: number, setSyncStatus: (s: "idle" | "saving" | "error") => void) => {
  try {
    setSyncStatus("saving");
    await apiUpdateMeasurementBlock(id, { sequence_number });
    setSyncStatus("idle");
  } catch (err) {
    setSyncStatus("error");
  }
}, 500);

// ─── Helpers to set syncStatus WITHOUT creating undo history entries ────────
// We use a separate, non-temporal store slice for syncStatus.
// Since zundo's `partialize` only tracks `blocks`, we need to make sure
// syncStatus updates don't go through the temporal wrapper at all.
// The trick: we call the raw `setState` on the store (not the temporal `set`).
// But with the current setup, every `set()` inside temporal still creates a
// snapshot. So we use `_skipHistory` marker approach via `handleSet`.

// We'll use a module-level flag to skip history for certain set calls.
let _skipHistory = false;

function withoutHistory(fn: () => void) {
  _skipHistory = true;
  fn();
  _skipHistory = false;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useMeasurementStore = create<MeasurementState>()(
  temporal(
    (set) => {
      // Helper to update syncStatus without creating undo entries
      const setSyncStatus = (s: "idle" | "saving" | "error") => {
        withoutHistory(() => set({ syncStatus: s }));
      };

      return {
        blocks: [],
        projectId: null,
        syncStatus: "idle",

        setSheet: (projectId, blocks) => {
          // Initial load — skip history, then clear any accidental entries
          withoutHistory(() => set({ projectId, blocks }));
          // Clear undo history after initial load (deferred so temporal has settled)
          setTimeout(() => {
            useMeasurementStore.temporal.getState().clear();
          }, 0);
        },

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
          debouncedUpdateRow(rowId, updates, setSyncStatus);
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
            setSyncStatus("saving");
            await apiCreateDimensionRow(newRow);
            setSyncStatus("idle");
          } catch { setSyncStatus("error"); }
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
            setSyncStatus("saving");
            await apiDeleteDimensionRow(rowId);
            setSyncStatus("idle");
          } catch { setSyncStatus("error"); }
        },

        updateMajorItem: (blockId, majorItemId, description) => {
          set((state) => ({
            blocks: state.blocks.map(b => b.id === blockId ? {
              ...b,
              major_items: b.major_items.map(mi => mi.id === majorItemId ? { ...mi, description } : mi)
            } : b)
          }));
          debouncedUpdateMajorItem(majorItemId, description, setSyncStatus);
        },

        addMajorItem: async (blockId, newMajorItem) => {
          set((state) => ({
            blocks: state.blocks.map(b => b.id === blockId ? {
              ...b,
              major_items: [...b.major_items, newMajorItem]
            } : b)
          }));
          try {
            setSyncStatus("saving");
            await apiCreateMajorItem(newMajorItem);
            setSyncStatus("idle");
          } catch { setSyncStatus("error"); }
        },

        deleteMajorItem: async (blockId, majorItemId) => {
          set((state) => ({
            blocks: state.blocks.map(b => b.id === blockId ? {
              ...b,
              major_items: b.major_items.filter(mi => mi.id !== majorItemId)
            } : b)
          }));
          try {
            setSyncStatus("saving");
            await apiDeleteMajorItem(majorItemId);
            setSyncStatus("idle");
          } catch { setSyncStatus("error"); }
        },

        addMeasurementBlock: async (newBlock) => {
          set((state) => ({
            blocks: [...state.blocks, newBlock]
          }));
          try {
            setSyncStatus("saving");
            await apiCreateMeasurementBlock({
              project_id: newBlock.project_id,
              sequence_number: newBlock.sequence_number,
              ssr_item_id: newBlock.ssr_item_id,
              custom_description: newBlock.custom_description,
              custom_rate: newBlock.custom_rate,
              custom_unit: newBlock.custom_unit,
            });
            setSyncStatus("idle");
          } catch { setSyncStatus("error"); }
        },

        deleteMeasurementBlock: async (blockId) => {
          set((state) => ({
            blocks: state.blocks.filter(b => b.id !== blockId)
          }));
          try {
            setSyncStatus("saving");
            await apiDeleteMeasurementBlock(blockId);
            setSyncStatus("idle");
          } catch { setSyncStatus("error"); }
        },

        reorderBlocks: (startIndex, endIndex) => {
          set((state) => {
            const newBlocks = Array.from(state.blocks);
            const [removed] = newBlocks.splice(startIndex, 1);
            newBlocks.splice(endIndex, 0, removed);

            newBlocks.forEach((b, i) => {
              b.sequence_number = i + 1;
              debouncedUpdateBlockSequence(b.id, b.sequence_number, setSyncStatus);
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
                apiUpdateMajorItem(mi.id, { sequence_number: mi.sequence_number }).catch(() => setSyncStatus("error"));
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
                    apiUpdateDimensionRow(dr.id, { sequence_number: dr.sequence_number }).catch(() => setSyncStatus("error"));
                  });
                  return { ...mi, dimension_rows: newDr };
                })
              };
            })
          }));
        }
      };
    },
    {
      limit: 50,
      partialize: (state) => ({ blocks: state.blocks }),
      handleSet: (handleSet) => {
        return (state) => {
          // If we're inside a withoutHistory() call, skip recording
          if (_skipHistory) return;
          handleSet(state);
        };
      },
      // Deep equality check on the partialized blocks to prevent duplicate states
      equality: (pastState, currentState) => {
        return JSON.stringify(pastState) === JSON.stringify(currentState);
      },
    }
  )
);
