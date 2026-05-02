import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trash2, TableProperties, FileBarChart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { BOQItem, Project } from "@shared/schema";

interface LivePreviewTableProps {
  project: Project;
}

export default function LivePreviewTable({ project }: LivePreviewTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: boqItems = [], isLoading } = useQuery<BOQItem[]>({
    queryKey: ["/api/boq-items", project.id],
    queryFn: async () => {
      const response = await fetch(`/api/boq-items/${project.id}`);
      if (!response.ok) throw new Error("Failed to fetch BOQ items");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("DELETE", `/api/boq-items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Item removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/boq-items", project.id] });
    },
    onError: () => {
      toast({ title: "Could not delete item", variant: "destructive" });
    },
  });

  const totalAmount = boqItems.reduce((sum, item) => sum + item.amount, 0);

  const fmtINR = (val: number) =>
    val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
          <span className="text-gray-500">
            Items:{" "}
            <span className="font-bold text-gray-900">{boqItems.length}</span>
          </span>
          {boqItems.length > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">
                Total:{" "}
                <span className="font-bold text-blue-600">₹{fmtINR(totalAmount)}</span>
              </span>
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
              Use the form on the left to search the SSR database and add items to your BOQ
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-14"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {boqItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-4 py-3.5 text-gray-400 font-medium text-center">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 leading-snug">{item.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.itemCode && (
                          <span className="text-xs bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded">
                            {item.itemCode}
                          </span>
                        )}
                        {item.remarks && (
                          <span className="text-xs text-gray-400 truncate max-w-[180px]">{item.remarks}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center text-gray-600 font-medium">{item.unit}</td>
                    <td className="px-4 py-3.5 text-right text-gray-700 tabular-nums">{item.quantity.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right text-gray-700 tabular-nums">{fmtINR(item.rate)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-gray-900 tabular-nums">{fmtINR(item.amount)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer total */}
      {boqItems.length > 0 && (
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Grand Total</span>
          <span className="text-xl font-bold text-blue-600">
            ₹{fmtINR(totalAmount)}
          </span>
        </div>
      )}
    </div>
  );
}
