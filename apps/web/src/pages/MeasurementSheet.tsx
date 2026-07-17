import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Ruler, Undo2, Redo2, Cloud, CloudUpload, CloudOff, FileSpreadsheet, LayoutList, TableProperties, Percent } from "lucide-react";
import type { SSRItem } from "@estimatit/shared";
import { getProject } from "../lib/api/projects";
import { getActiveSSRVersion } from "../lib/api/ssr";
import { getMeasurementSheet } from "../lib/api/measurements";
import { getRecapItems } from "../lib/api/recapitulation";
import { MeasurementBlockCard } from "../components/measurements/MeasurementBlockCard";
import { SSRCombobox } from "../components/measurements/SSRCombobox";
import { ExportValidationDialog } from "../components/measurements/ExportValidationDialog";
import { AbstractSheet } from "../components/measurements/AbstractSheet";
import { RecapitulationSheet } from "../components/measurements/RecapitulationSheet";
import { useMeasurementStore } from "../store/measurementStore";
import { useStore } from "zustand";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { validateForExport, generateMeasurementSheetExcel, type ExportWarning } from "../lib/excelExport";
import { toast } from "../components/Toast";

export function MeasurementSheet() {
  const { id } = useParams<{ id: string }>();
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [exportWarnings, setExportWarnings] = useState<ExportWarning[]>([]);
  const [activeTab, setActiveTab] = useState<"measurement" | "abstract" | "recapitulation">("measurement");
  
  // Zustand store
  const { 
    blocks, 
    setSheet, 
    syncStatus, 
    addMeasurementBlock, 
    reorderBlocks 
  } = useMeasurementStore();

  const { undo, redo, pastStates, futureStates } = useStore(useMeasurementStore.temporal, (state) => state);

  // Undo/Redo is available via toolbar buttons only.
  // Global Ctrl+Z is left to browser native (text-level undo inside inputs).

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

  // Fetch recap items so they can be passed to Excel export
  const { data: recapItems = [] } = useQuery({
    queryKey: ["recap_items", id],
    queryFn: () => getRecapItems(id!),
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

  // ── Export flow ──────────────────────────────────────────────────────────
  const handleExport = () => {
    const warnings = validateForExport(blocks);
    if (warnings.length > 0) {
      setExportWarnings(warnings);
      setShowValidationDialog(true);
    } else {
      performExport();
    }
  };

  const performExport = async () => {
    setShowValidationDialog(false);
    setIsExporting(true);
    try {
      const filename = await generateMeasurementSheetExcel({
        project: project!,
        blocks,
        ssrVersionLabel: activeVersion?.version,
        recapItems,
      });
      toast(`Exported: ${filename}`, "success");
    } catch (err) {
      console.error("Export failed:", err);
      toast("Export failed. Please try again.", "error", {
        label: "Try again",
        onClick: performExport,
      });
    } finally {
      setIsExporting(false);
    }
  };

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
          <div className="relative group">
            <button
              onClick={handleExport}
              disabled={blocks.length === 0 || isExporting || !project}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {isExporting ? "Exporting..." : "Export to Excel"}
            </button>
            {blocks.length === 0 && (
              <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Add measurements before exporting
              </div>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
          <button
            onClick={() => setActiveTab("measurement")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "measurement"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Measurement Sheet
          </button>
          <button
            onClick={() => setActiveTab("abstract")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "abstract"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableProperties className="h-3.5 w-3.5" />
            Abstract
          </button>
          <button
            onClick={() => setActiveTab("recapitulation")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "recapitulation"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Percent className="h-3.5 w-3.5" />
            Recapitulation
          </button>
        </div>

        {/* Loading State */}
        {isLoadingSheet ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Abstract Tab ── */}
            {activeTab === "abstract" && (
              <AbstractSheet />
            )}

            {/* ── Recapitulation Tab ── */}
            {activeTab === "recapitulation" && id && (
              <RecapitulationSheet projectId={id} />
            )}

            {/* ── Measurement Sheet Tab ── */}
            {activeTab === "measurement" && (
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
          </>
        )}

        {/* Export Validation Dialog */}
        <ExportValidationDialog
          warnings={exportWarnings}
          isOpen={showValidationDialog}
          onClose={() => setShowValidationDialog(false)}
          onExportAnyway={performExport}
        />
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
