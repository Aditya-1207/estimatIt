import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Ruler, Undo2, Redo2, Cloud, CloudUpload, CloudOff } from "lucide-react";
import type { SSRItem } from "@estimatit/shared";
import { getProject } from "../lib/api/projects";
import { getActiveSSRVersion } from "../lib/api/ssr";
import { getMeasurementSheet } from "../lib/api/measurements";
import { MeasurementBlockCard } from "../components/measurements/MeasurementBlockCard";
import { SSRCombobox } from "../components/measurements/SSRCombobox";
import { useMeasurementStore } from "../store/measurementStore";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export function MeasurementSheet() {
  const { id } = useParams<{ id: string }>();
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  
  // Zustand store
  const { 
    blocks, 
    setSheet, 
    syncStatus, 
    addMeasurementBlock, 
    reorderBlocks 
  } = useMeasurementStore();

  const { undo, redo, pastStates, futureStates } = useMeasurementStore.temporal.getState();

  // Initial Data Fetching
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const { data: activeVersion } = useQuery({
    queryKey: ["ssr_version", "active"],
    queryFn: getActiveSSRVersion,
  });

  const { isLoading: isLoadingSheet } = useQuery({
    queryKey: ["measurement_sheet", id],
    queryFn: async () => {
      const data = await getMeasurementSheet(id!);
      setSheet(id!, data);
      return data;
    },
    enabled: !!id,
  });

  // Reorder Blocks Handler
  const handleDragEndBlocks = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      reorderBlocks(oldIndex, newIndex);
    }
  };

  const handleSelectSSRItem = (item: SSRItem | null, isCustom: boolean) => {
    setIsAddingBlock(false);
    
    const nextSeq = blocks.length > 0 
      ? Math.max(...blocks.map(b => b.sequence_number)) + 1 
      : 1;

    if (item) {
      addMeasurementBlock({
        id: crypto.randomUUID(),
        project_id: id!,
        sequence_number: nextSeq,
        ssr_item_id: item.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        major_items: [],
        ssr_item: item
      });
    } else if (isCustom) {
      addMeasurementBlock({
        id: crypto.randomUUID(),
        project_id: id!,
        sequence_number: nextSeq,
        custom_description: "New Custom Item",
        custom_unit: "Nos",
        custom_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        major_items: [],
        ssr_item: null
      });
    }
  };

  // Calculate Grand Total from store
  let grandTotal = 0;
  blocks.forEach((block) => {
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex-1 space-y-6 pb-24">
        {/* Back link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Projects
          </Link>

          {/* Undo/Redo Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => undo()}
              disabled={pastStates.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              onClick={() => redo()}
              disabled={futureStates.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Redo2 className="h-3.5 w-3.5" />
              Redo
            </button>
          </div>
        </div>

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
            {blocks.length === 0 ? (
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
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndBlocks}>
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {blocks.map((block) => (
                      <MeasurementBlockCard
                        key={block.id}
                        block={block}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

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
              {syncStatus === "idle" && (
                <>
                  <Cloud className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-muted-foreground">All changes saved</span>
                </>
              )}
              {syncStatus === "saving" && (
                <>
                  <CloudUpload className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm font-medium text-primary">Saving...</span>
                </>
              )}
              {syncStatus === "error" && (
                <>
                  <CloudOff className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Offline — saved locally</span>
                </>
              )}
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
