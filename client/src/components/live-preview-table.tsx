import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Trash2, TableIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { BOQItem, Project } from "@shared/schema";

interface LivePreviewTableProps {
  project: Project;
}

export default function LivePreviewTable({ project }: LivePreviewTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch BOQ items for the project
  const { data: boqItems = [], isLoading } = useQuery<BOQItem[]>({
    queryKey: ["/api/boq-items", project.id],
    queryFn: async () => {
      const response = await fetch(`/api/boq-items/${project.id}`);
      if (!response.ok) throw new Error("Failed to fetch BOQ items");
      return response.json();
    },
  });

  // Delete BOQ item mutation
  const deleteBOQItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("DELETE", `/api/boq-items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "BOQ item deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/boq-items", project.id],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete BOQ item",
        variant: "destructive",
      });
    },
  });

  // Calculate totals
  const totalAmount = boqItems.reduce((sum, item) => sum + item.amount, 0);
  const itemCount = boqItems.length;

  const handleDeleteItem = (itemId: number) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteBOQItemMutation.mutate(itemId);
    }
  };

  if (isLoading) {
    return (
      <Card className="h-fit">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-secondary mt-2">Loading BOQ items...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TableIcon className="h-5 w-5 text-primary" />
            <span>Bill of Quantities Preview</span>
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-secondary">
            <span>Items: <span className="font-medium text-primary">{itemCount}</span></span>
            <span>|</span>
            <span>Total: <span className="font-bold text-primary">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-center">S.No</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Unit</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate (₹)</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boqItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-secondary">
                      <TableIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No BOQ items added yet</p>
                      <p className="text-sm">Use the form on the left to add items</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                boqItems.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="text-center font-medium">{index + 1}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={item.description}>
                        {item.description}
                      </div>
                      {item.itemCode && (
                        <div className="text-xs text-secondary">{item.itemCode}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.rate.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-secondary" title={item.remarks || ""}>
                        {item.remarks || ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-error hover:text-red-700 hover:bg-red-50"
                        disabled={deleteBOQItemMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {boqItems.length > 0 && (
              <TableFooter>
                <TableRow className="bg-primary text-white">
                  <TableCell colSpan={5} className="text-right font-bold">
                    Total Amount:
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
