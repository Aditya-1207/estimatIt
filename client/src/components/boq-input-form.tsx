import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { apiRequest } from "@/lib/queryClient";
import type { SSRItem, Project, InsertBOQItem } from "@shared/schema";

interface BOQInputFormProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

export default function BOQInputForm({ project, onProjectUpdate }: BOQInputFormProps) {
  const [formData, setFormData] = useState({
    description: "",
    unit: "",
    quantity: "",
    rate: "",
    remarks: "",
    itemCode: "",
  });
  const [selectedSSRItem, setSelectedSSRItem] = useState<SSRItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search SSR items
  const { data: ssrItems = [], isLoading: isSearching } = useQuery<SSRItem[]>({
    queryKey: ["/api/ssr-items/search", searchQuery],
    enabled: searchQuery.length >= 2,
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/ssr-items/search", {
        query: searchQuery,
        limit: 10,
      });
      return response.json();
    },
  });

  // Add BOQ item mutation
  const addBOQItemMutation = useMutation({
    mutationFn: async (itemData: InsertBOQItem) => {
      const response = await apiRequest("POST", "/api/boq-items", itemData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "BOQ item added successfully",
      });
      
      // Clear form
      setFormData({
        description: "",
        unit: "",
        quantity: "",
        rate: "",
        remarks: "",
        itemCode: "",
      });
      setSelectedSSRItem(null);
      setSearchQuery("");
      
      // Invalidate BOQ items query
      queryClient.invalidateQueries({
        queryKey: ["/api/boq-items", project.id],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add BOQ item",
        variant: "destructive",
      });
    },
  });

  // Convert SSR items to combobox options
  const ssrOptions: ComboboxOption[] = ssrItems.map((item) => ({
    value: item.itemCode,
    label: item.description,
    description: `${item.itemCode} | ${item.category}`,
    category: item.category,
    rate: item.rate,
    unit: item.unit,
  }));

  // Handle SSR item selection
  const handleSSRItemSelect = (itemCode: string) => {
    const item = ssrItems.find((i) => i.itemCode === itemCode);
    if (item) {
      setSelectedSSRItem(item);
      setFormData({
        ...formData,
        description: item.description,
        unit: item.unit,
        rate: item.rate.toString(),
        remarks: "As per SSR",
        itemCode: item.itemCode,
      });
    }
  };

  // Calculate amount when quantity or rate changes
  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate) || 0;
    // Amount is calculated automatically in the form display
  }, [formData.quantity, formData.rate]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.unit || !formData.quantity || !formData.rate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const rate = parseFloat(formData.rate);
    const amount = quantity * rate;

    // Get next sequence number
    const nextSequence = Date.now(); // Simple sequence for demo

    const itemData: InsertBOQItem = {
      projectId: project.id,
      description: formData.description,
      unit: formData.unit,
      quantity,
      rate,
      amount,
      remarks: formData.remarks,
      itemCode: formData.itemCode,
      sequenceNumber: nextSequence,
    };

    addBOQItemMutation.mutate(itemData);
  };

  const handleClear = () => {
    setFormData({
      description: "",
      unit: "",
      quantity: "",
      rate: "",
      remarks: "",
      itemCode: "",
    });
    setSelectedSSRItem(null);
    setSearchQuery("");
  };

  const units = [
    { value: "m", label: "m (Meter)" },
    { value: "m²", label: "m² (Square Meter)" },
    { value: "m³", label: "m³ (Cubic Meter)" },
    { value: "ft", label: "ft (Feet)" },
    { value: "kg", label: "kg (Kilogram)" },
    { value: "lump sum", label: "Lump Sum" },
    { value: "nos", label: "Nos (Numbers)" },
    { value: "tonnes", label: "Tonnes" },
  ];

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5 text-primary" />
          <span>Add BOQ Items</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Project Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-primary mb-3">Project Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-secondary">Project Name</Label>
              <p className="text-sm text-primary font-medium">{project.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-secondary">Work Order No.</Label>
              <p className="text-sm text-primary font-medium">{project.workOrderNo || "N/A"}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Description with Search */}
          <div>
            <Label htmlFor="description">Item Description *</Label>
            <div className="space-y-2">
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  setSearchQuery(e.target.value);
                }}
                placeholder="Start typing item description..."
                className="w-full"
              />
              
              {searchQuery.length >= 2 && ssrOptions.length > 0 && (
                <div className="relative">
                  <Combobox
                    options={ssrOptions}
                    value={selectedSSRItem?.itemCode || ""}
                    onValueChange={handleSSRItemSelect}
                    placeholder="Select from SSR database..."
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Unit and Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Rate and Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rate">Rate (₹) *</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-secondary mt-1">Auto-filled from SSR or enter custom rate</p>
            </div>
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                value={((parseFloat(formData.quantity) || 0) * (parseFloat(formData.rate) || 0)).toFixed(2)}
                className="bg-gray-50"
                readOnly
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Optional remarks..."
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              type="submit"
              className="flex-1"
              disabled={addBOQItemMutation.isPending}
            >
              {addBOQItemMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Item
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
