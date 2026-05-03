import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trash2, TableProperties, FileBarChart, Pencil } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { BOQItem, Project } from "@shared/schema";

interface LivePreviewTableProps {
  project: Project;
  onEditItem: (item: BOQItem) => void;
  editingItem: BOQItem | null;
}

export default function LivePreviewTable({ project, onEditItem, editingItem }: LivePreviewTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: boqItems = [], isLoading } = useQuery<BOQItem[]>({
    queryKey: ["/api/boq-items", project.id],
    queryFn: async () => {
      const res = await fetch(`/api/boq-items/${project.id}`);
      if (!res.ok) throw new Error("Failed to fetch BOQ items");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest("DELETE", `/api/boq-items/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Item removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/boq-items", project.id] });
    },
    onError: () => toast({ title: "Could not delete item", variant: "destructive" }),
  });

  const handleDelete = (item: BOQItem) => {
    if (!window.confirm(`Remove "${item.description}"?`)) return;
    deleteMutation.mutate(item.id);
  };

  const totalAmount = boqItems.reduce((sum, item) => sum + item.amount, 0);

  const fmtINR = (v: number) =>
    v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-2xl card-shadow overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <TableProperties className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Bill of Quantities</h2>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Items: <span className="font-bold text-gray-900">{boqItems.length}</span></span>
          {boqItems.length > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">Total: <span className="font-bold text-blue-600">₹{fmtINR(totalAmount)}</span></span>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading items…</p>
          </div>
        ) : boqItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FileBarChart className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">No items yet</p>
            <p className="text-sm text-gray-500 max-w-xs">
              Use the form on the left to search the SSR database and add items
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Rate (₹)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Amount (₹)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {boqItems.map((item, index) => {
                  const isSelected = editingItem?.id === item.id;
                  return (
                  <tr
                    key={item.id}
                    className={`transition-colors group ${
                      isSelected
                        ? "bg-amber-50 border-l-4 border-l-amber-400"
                        : "hover:bg-blue-50/40 border-l-4 border-l-transparent"
                    }`}
                  >
                    <td className={`px-4 py-3.5 font-medium text-center ${isSelected ? "text-amber-600" : "text-gray-400"}`}>
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        <div>
                          <p className={`font-medium leading-snug ${isSelected ? "text-amber-900" : "text-gray-900"}`}>
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.itemCode && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isSelected ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                {item.itemCode}
                              </span>
                            )}
                            {item.remarks && (
                              <span className="text-xs text-gray-400 truncate max-w-[180px]">{item.remarks}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3.5 text-center font-medium ${isSelected ? "text-amber-800" : "text-gray-600"}`}>{item.unit}</td>
                    <td className={`px-4 py-3.5 text-right tabular-nums ${isSelected ? "text-amber-800" : "text-gray-700"}`}>{item.quantity.toFixed(2)}</td>
                    <td className={`px-4 py-3.5 text-right tabular-nums ${isSelected ? "text-amber-800" : "text-gray-700"}`}>{fmtINR(item.rate)}</td>
                    <td className={`px-4 py-3.5 text-right font-bold tabular-nums ${isSelected ? "text-amber-700" : "text-gray-900"}`}>{fmtINR(item.amount)}</td>
                    <td className="px-4 py-3.5">
                      <div className={`flex items-center justify-center gap-1 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <button
                          onClick={() => onEditItem(item)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isSelected ? "text-amber-600 bg-amber-100 hover:bg-amber-200" : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"}`}
                          title="Edit item"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deleteMutation.isPending}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer total */}
      {boqItems.length > 0 && (
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Grand Total</span>
          <span className="text-xl font-bold text-blue-600">₹{fmtINR(totalAmount)}</span>
        </div>
      )}
    </div>
  );
}
