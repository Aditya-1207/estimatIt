import React, { useState, useCallback, useRef } from "react";
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

  // ── Inline edit state ───────────────────────────────────────────────────────
  const [pendingEdits, setPendingEdits] = useState<
    Record<string, { description?: string; percentage?: string; amount?: string }>
  >({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RecapitulationItem> }) =>
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
        type: "percentage",
        percentage: 0,
        amount: 0,
        sequence_number: items.length + 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recap_items", projectId] });
    },
  });

  const handleFieldChange = useCallback(
    (id: string, field: "description" | "percentage" | "amount", rawValue: string) => {
      setPendingEdits((prev) => ({
        ...prev,
        [id]: { ...prev[id], [field]: rawValue },
      }));

      clearTimeout(debounceTimers.current[`${id}_${field}`]);
      debounceTimers.current[`${id}_${field}`] = setTimeout(() => {
        if (field === "description") {
          if (rawValue.trim()) {
            updateMutation.mutate({ id, input: { description: rawValue.trim() } });
          }
        } else {
          const val = parseFloat(rawValue);
          if (!isNaN(val) && val >= 0) {
            updateMutation.mutate({ id, input: { [field]: val } });
          }
        }
      }, 500);
    },
    [updateMutation],
  );

  function displayValue(item: RecapitulationItem, field: "description" | "percentage" | "amount"): string {
    const pending = pendingEdits[item.id]?.[field];
    if (pending !== undefined) return pending;
    if (field === "description") return item.description;
    return String(item[field]);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate live amounts for display
  let runningTotal = 0;
  const displayItems = items.map(item => {
    let computedAmount = 0;
    if (item.type === "abstract_total") {
      computedAmount = abstractTotal;
    } else if (item.type === "percentage") {
      computedAmount = (item.percentage / 100) * abstractTotal;
    } else if (item.type === "lump_sum") {
      const pendingAmt = pendingEdits[item.id]?.amount;
      computedAmount = pendingAmt !== undefined ? (parseFloat(pendingAmt) || 0) : item.amount;
    } else if (item.type === "rounded_total") {
      computedAmount = Math.round(runningTotal);
    }

    // Accumulate total before rounding
    if (item.type !== "rounded_total") {
      runningTotal += computedAmount;
    }

    return { ...item, computedAmount };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden pb-4">
        {/* Table header */}
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
              {displayItems.map((item, idx) => {
                const isTotalRow = item.type === "rounded_total";

                // Inject un-numbered "Total" separator right before rounded_total
                const renderTotalSeparator = isTotalRow && (
                  <tr key={`total-sep-${item.id}`} className="border-b border-border bg-muted/5 font-semibold">
                    <td colSpan={2} className="border-r border-border px-3 py-2 text-center text-muted-foreground" />
                    <td colSpan={2} className="border-r border-border px-4 py-2 text-right">
                      Total
                    </td>
                    <td className="border-r border-border px-3 py-2 text-right tabular-nums">
                      {fmt(runningTotal)}
                    </td>
                    <td className="px-2 py-2" />
                  </tr>
                );

                return (
                  <React.Fragment key={item.id}>
                    {renderTotalSeparator}
                    <tr
                      className={`border-b border-border transition-colors group ${
                        isTotalRow ? "bg-emerald-50 dark:bg-emerald-950/20" : 
                        idx % 2 === 0 ? "bg-background" : "bg-muted/15"
                      }`}
                    >
                      {/* Drag handle */}
                      <td className="px-2 py-2 text-center text-muted-foreground/40 group-hover:text-muted-foreground">
                        <GripVertical className="h-4 w-4 mx-auto" />
                      </td>

                      {/* Sequence */}
                      <td className="px-3 py-2 text-center text-muted-foreground border-r border-border">
                        {item.sequence_number}
                      </td>

                      {/* Description */}
                      <td className="px-2 py-1 border-r border-border">
                        <input
                          type="text"
                          value={displayValue(item, "description")}
                          onChange={(e) => handleFieldChange(item.id, "description", e.target.value)}
                          className={`w-full rounded-md border-transparent bg-transparent px-2 py-1.5 text-sm transition-colors hover:bg-muted/40 focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                            isTotalRow ? "font-bold text-emerald-800 dark:text-emerald-200 uppercase" : "text-foreground"
                          }`}
                        />
                      </td>

                      {/* Percentage */}
                      <td className="px-2 py-1 border-r border-border">
                        {item.type === "percentage" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={displayValue(item, "percentage")}
                              onChange={(e) => handleFieldChange(item.id, "percentage", e.target.value)}
                              className="w-full rounded-md border-transparent bg-transparent px-2 py-1.5 text-sm text-right tabular-nums text-foreground transition-colors hover:bg-muted/40 focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-muted-foreground text-xs flex-shrink-0">%</span>
                          </div>
                        ) : null}
                      </td>

                      {/* Amount */}
                      <td className="px-2 py-1 border-r border-border bg-white dark:bg-transparent">
                        {item.type === "lump_sum" ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={displayValue(item, "amount")}
                            onChange={(e) => handleFieldChange(item.id, "amount", e.target.value)}
                            className="w-full rounded-md border-transparent bg-transparent px-2 py-1.5 text-sm text-right tabular-nums text-foreground transition-colors hover:bg-muted/40 focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <div className={`px-2 py-1.5 text-right tabular-nums ${
                            isTotalRow ? "font-bold text-emerald-700 dark:text-emerald-300 text-base" : "font-medium text-foreground"
                          }`}>
                            {isTotalRow ? "" : ""}
                            {fmt(item.computedAmount)}
                          </div>
                        )}
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
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add row */}
        <div className="mt-4 px-4 flex gap-2">
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary/50 px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add percentage row
          </button>
        </div>
      </div>
    </div>
  );
}
