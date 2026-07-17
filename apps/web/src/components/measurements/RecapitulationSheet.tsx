import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import type { RecapitulationItem } from "@estimatit/shared";
import {
  getRecapItems,
  createRecapItem,
  updateRecapItem,
  deleteRecapItem,
  seedDefaultRecapItems,
} from "../../lib/api/recapitulation";
import { useMeasurementStore } from "../../store/measurementStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeAbstractTotal(
  blocks: ReturnType<typeof useMeasurementStore.getState>["blocks"],
): number {
  let total = 0;
  for (const block of blocks) {
    let qty = 0;
    for (const mi of block.major_items) {
      for (const dr of mi.dimension_rows) {
        let q = 1;
        let hasValue = false;
        if (dr.number > 0)  { q *= dr.number;  hasValue = true; }
        if (dr.length > 0)  { q *= dr.length;  hasValue = true; }
        if (dr.breadth > 0) { q *= dr.breadth; hasValue = true; }
        if (dr.depth > 0)   { q *= dr.depth;   hasValue = true; }
        if (hasValue) qty += q;
      }
    }
    const rate = block.ssr_item_id
      ? (block.ssr_item?.completed_rate_inr ?? 0)
      : (block.custom_rate ?? 0);
    total += qty * rate;
  }
  return total;
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

interface RecapitulationSheetProps {
  projectId: string;
}

export function RecapitulationSheet({ projectId }: RecapitulationSheetProps) {
  const blocks = useMeasurementStore((s) => s.blocks);
  const abstractTotal = computeAbstractTotal(blocks);
  const queryClient = useQueryClient();

  // ── Load items ──────────────────────────────────────────────────────────────
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["recap_items", projectId],
    queryFn: async () => {
      const existing = await getRecapItems(projectId);
      if (existing.length === 0) {
        return seedDefaultRecapItems(projectId);
      }
      return existing;
    },
    enabled: !!projectId,
  });

  // ── Derived totals ──────────────────────────────────────────────────────────
  const recapTotal = items.reduce(
    (sum, item) => sum + (item.percentage / 100) * abstractTotal,
    0,
  );
  const finalTotal = abstractTotal + recapTotal;

  // ── Inline edit state ───────────────────────────────────────────────────────
  // Track per-row pending edits so the UI feels instant
  const [pendingEdits, setPendingEdits] = useState<
    Record<string, { description?: string; percentage?: string }>
  >({});

  // Debounce timers
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { description?: string; percentage?: number } }) =>
      updateRecapItem(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recap_items", projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecapItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recap_items", projectId] });
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createRecapItem({
        project_id: projectId,
        description: "New charge",
        percentage: 0,
        sequence_number: items.length + 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recap_items", projectId] });
    },
  });

  // ── Debounced field change ──────────────────────────────────────────────────
  const handleFieldChange = useCallback(
    (id: string, field: "description" | "percentage", rawValue: string) => {
      // Update local state immediately
      setPendingEdits((prev) => ({
        ...prev,
        [id]: { ...prev[id], [field]: rawValue },
      }));

      // Debounce the API call
      clearTimeout(debounceTimers.current[`${id}_${field}`]);
      debounceTimers.current[`${id}_${field}`] = setTimeout(() => {
        if (field === "description") {
          if (rawValue.trim()) {
            updateMutation.mutate({ id, input: { description: rawValue.trim() } });
          }
        } else {
          const pct = parseFloat(rawValue);
          if (!isNaN(pct) && pct >= 0) {
            updateMutation.mutate({ id, input: { percentage: pct } });
          }
        }
      }, 500);
    },
    [updateMutation],
  );

  // Resolve displayed value: pending edit takes priority over server value
  function displayValue(item: RecapitulationItem, field: "description" | "percentage"): string {
    const pending = pendingEdits[item.id]?.[field];
    if (pending !== undefined) return pending;
    return field === "percentage" ? String(item.percentage) : item.description;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abstract total callout */}
      <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-900 dark:bg-blue-950/30">
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
          Estimated Cost as per Abstract
        </span>
        <span className="text-lg font-bold tabular-nums text-blue-900 dark:text-blue-100">
          ₹{fmt(abstractTotal)}
        </span>
      </div>

      {/* Items table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="w-8 px-2 py-3" />
                <th className="px-3 py-3 text-center font-semibold text-foreground border-r border-border w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground border-r border-border">
                  Description
                </th>
                <th className="px-3 py-3 text-center font-semibold text-foreground border-r border-border w-24">
                  %
                </th>
                <th className="px-3 py-3 text-right font-semibold text-foreground border-r border-border w-36">
                  Amount (₹)
                </th>
                <th className="px-2 py-3 w-10" />
              </tr>
            </thead>

            <tbody>
              {items.map((item, idx) => {
                const amount = (item.percentage / 100) * abstractTotal;
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-border transition-colors hover:bg-accent/30 group ${
                      idx % 2 === 0 ? "bg-background" : "bg-muted/15"
                    }`}
                  >
                    {/* Drag handle (visual only for now) */}
                    <td className="px-2 py-2 text-center text-muted-foreground/40 group-hover:text-muted-foreground">
                      <GripVertical className="h-4 w-4 mx-auto" />
                    </td>

                    {/* Sequence */}
                    <td className="px-3 py-2 text-center text-muted-foreground border-r border-border">
                      {item.sequence_number}
                    </td>

                    {/* Description — inline editable */}
                    <td className="px-2 py-1 border-r border-border">
                      <input
                        type="text"
                        value={displayValue(item, "description")}
                        onChange={(e) =>
                          handleFieldChange(item.id, "description", e.target.value)
                        }
                        className="w-full rounded-md border-transparent bg-transparent px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/40 focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* Percentage — inline editable */}
                    <td className="px-2 py-1 border-r border-border">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={displayValue(item, "percentage")}
                          onChange={(e) =>
                            handleFieldChange(item.id, "percentage", e.target.value)
                          }
                          className="w-full rounded-md border-transparent bg-transparent px-2 py-1.5 text-sm text-right tabular-nums text-foreground transition-colors hover:bg-muted/40 focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-muted-foreground text-xs flex-shrink-0">%</span>
                      </div>
                    </td>

                    {/* Calculated amount */}
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground border-r border-border">
                      {fmt(amount)}
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all disabled:pointer-events-none"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add row */}
        <div className="border-t border-dashed border-border bg-muted/10 px-4 py-3">
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add charge
          </button>
        </div>
      </div>

      {/* Totals panel */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Recap sub-total */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm text-muted-foreground">Add: Percentage additions</span>
          <span className="tabular-nums font-medium text-foreground">
            ₹{fmt(recapTotal)}
          </span>
        </div>

        {/* Final total */}
        <div className="flex items-center justify-between bg-emerald-50 px-5 py-4 dark:bg-emerald-950/20">
          <span className="text-base font-bold text-emerald-800 dark:text-emerald-200">
            Total Estimated Cost
          </span>
          <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            ₹{fmt(finalTotal)}
          </span>
        </div>
        {/* Say (rounded) */}
        <div className="flex items-center justify-between border-t border-border bg-emerald-50/60 px-5 py-2 dark:bg-emerald-950/10">
          <span className="text-xs font-medium italic text-muted-foreground">Say</span>
          <span className="text-sm font-semibold italic tabular-nums text-muted-foreground">
            ₹{Math.round(finalTotal).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}
