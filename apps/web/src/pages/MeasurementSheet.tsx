import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Ruler } from "lucide-react";
import type { DimensionRow, SSRItem } from "@estimatit/shared";
import { getProject } from "../lib/api/projects";
import { getActiveSSRVersion } from "../lib/api/ssr";
import { 
  getMeasurementSheet,
  createMeasurementBlock,
  deleteMeasurementBlock,
  createMajorItem,
  updateMajorItem,
  deleteMajorItem,
  createDimensionRow,
  updateDimensionRow,
  deleteDimensionRow
} from "../lib/api/measurements";
import { MeasurementBlockCard } from "../components/measurements/MeasurementBlockCard";
import { SSRCombobox } from "../components/measurements/SSRCombobox";

export function MeasurementSheet() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  // Queries
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const { data: activeVersion } = useQuery({
    queryKey: ["ssr_version", "active"],
    queryFn: getActiveSSRVersion,
  });

  const { data: sheetData, isLoading: isLoadingSheet } = useQuery({
    queryKey: ["measurement_sheet", id],
    queryFn: () => getMeasurementSheet(id!),
    enabled: !!id,
  });

  // Mutations
  const addBlockMutation = useMutation({
    mutationFn: createMeasurementBlock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurement_sheet", id] }),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: deleteMeasurementBlock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurement_sheet", id] }),
  });

  const addMajorItemMutation = useMutation({
    mutationFn: createMajorItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurement_sheet", id] }),
  });

  const updateMajorItemMutation = useMutation({
    mutationFn: ({ miId, description }: { miId: string; description: string }) => 
      updateMajorItem(miId, { description }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurement_sheet", id] }),
  });

  const deleteMajorItemMutation = useMutation({
    mutationFn: deleteMajorItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurement_sheet", id] }),
  });

  const addDimensionRowMutation = useMutation({
    mutationFn: createDimensionRow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurement_sheet", id] }),
  });

  const updateDimensionRowMutation = useMutation({
    mutationFn: ({ rowId, updates }: { rowId: string; updates: Partial<DimensionRow> }) => 
      updateDimensionRow(rowId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurement_sheet", id] }),
  });

  const deleteDimensionRowMutation = useMutation({
    mutationFn: deleteDimensionRow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurement_sheet", id] }),
  });

  // Event Handlers
  const handleSelectSSRItem = (item: SSRItem | null, isCustom: boolean) => {
    setIsAddingBlock(false);
    
    // Auto-calculate the next sequence number
    const nextSeq = sheetData && sheetData.length > 0 
      ? Math.max(...sheetData.map(b => b.sequence_number)) + 1 
      : 1;

    if (item) {
      addBlockMutation.mutate({
        project_id: id!,
        sequence_number: nextSeq,
        ssr_item_id: item.id,
      });
    } else if (isCustom) {
      addBlockMutation.mutate({
        project_id: id!,
        sequence_number: nextSeq,
        custom_description: "New Custom Item",
        custom_unit: "Nos",
        custom_rate: 0,
      });
    }
  };

  const handleAddMajorItem = (blockId: string) => {
    const block = sheetData?.find(b => b.id === blockId);
    const nextSeq = block && block.major_items.length > 0 
      ? Math.max(...block.major_items.map(m => m.sequence_number)) + 1 
      : 1;

    addMajorItemMutation.mutate({
      block_id: blockId,
      sequence_number: nextSeq,
      description: "",
    });
  };

  const handleAddDimensionRow = (majorItemId: string) => {
    // Find the major item to calculate the next sequence
    let nextSeq = 1;
    sheetData?.forEach(b => {
      const mi = b.major_items.find(m => m.id === majorItemId);
      if (mi && mi.dimension_rows.length > 0) {
        nextSeq = Math.max(...mi.dimension_rows.map(r => r.sequence_number)) + 1;
      }
    });

    addDimensionRowMutation.mutate({
      major_item_id: majorItemId,
      sequence_number: nextSeq,
      description: "",
      number: 0,
      length: 0,
      breadth: 0,
      depth: 0,
    });
  };

  // Calculate Grand Total
  let grandTotal = 0;
  if (sheetData) {
    sheetData.forEach((block) => {
      let blockTotal = 0;
      block.major_items.forEach((mi) => {
        mi.dimension_rows.forEach((dr) => {
          let q = 1;
          let hasValue = false;
          if (dr.number > 0) { q *= dr.number; hasValue = true; }
          if (dr.length > 0) { q *= dr.length; hasValue = true; }
          if (dr.breadth > 0) { q *= dr.breadth; hasValue = true; }
          if (dr.depth > 0) { q *= dr.depth; hasValue = true; }
          if (hasValue) blockTotal += q;
        });
      });
      const rate = block.ssr_item_id ? block.ssr_item?.completed_rate_inr : block.custom_rate;
      grandTotal += blockTotal * (rate || 0);
    });
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex-1 space-y-6 pb-24">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Projects
        </Link>

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground line-clamp-1">
              {project?.name || "Measurement Sheet"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {project?.work_order_no ? `WO: ${project.work_order_no}` : "Draft Project"}
            </p>
          </div>
          <button
            disabled
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            Export to Excel
          </button>
        </div>

        {/* Loading State */}
        {isLoadingSheet ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Empty State */}
            {!sheetData || sheetData.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Ruler className="h-8 w-8" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">
                  No measurements yet
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Start by adding an SSR item to create your first measurement block.
                </p>
                <div className="mt-6 w-full max-w-md text-left">
                  <SSRCombobox
                    versionId={activeVersion?.id || ""}
                    onSelect={handleSelectSSRItem}
                    disabled={!activeVersion}
                  />
                  {!activeVersion && (
                    <p className="mt-2 text-xs text-destructive text-center">No active SSR version found.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Render Blocks */}
                {sheetData.map((block) => (
                  <MeasurementBlockCard
                    key={block.id}
                    block={block}
                    onDelete={(bId) => deleteBlockMutation.mutate(bId)}
                    onAddMajorItem={handleAddMajorItem}
                    onUpdateMajorItem={(miId, desc) => updateMajorItemMutation.mutate({ miId, description: desc })}
                    onDeleteMajorItem={(miId) => deleteMajorItemMutation.mutate(miId)}
                    onAddDimensionRow={handleAddDimensionRow}
                    onUpdateDimensionRow={(rowId, updates) => updateDimensionRowMutation.mutate({ rowId, updates })}
                    onDeleteDimensionRow={(rowId) => deleteDimensionRowMutation.mutate(rowId)}
                  />
                ))}

                {/* Add new block section */}
                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                  {isAddingBlock ? (
                    <div className="mx-auto max-w-xl text-left animate-in fade-in slide-in-from-top-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Search SSR Item</label>
                      <SSRCombobox
                        versionId={activeVersion?.id || ""}
                        onSelect={handleSelectSSRItem}
                      />
                      <button 
                        onClick={() => setIsAddingBlock(false)}
                        className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingBlock(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Measurement Block
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-md shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-medium text-muted-foreground">Auto-saving active</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Estimated Total</span>
              <span className="text-xl font-bold tracking-tight text-primary">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
