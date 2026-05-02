import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, RotateCcw, Search, CheckCircle2, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SSRItem, Project, InsertBOQItem } from "@shared/schema";

interface BOQInputFormProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const UNITS = [
  { value: "m",        label: "m — Metre" },
  { value: "m²",       label: "m² — Square Metre" },
  { value: "m³",       label: "m³ — Cubic Metre" },
  { value: "ft",       label: "ft — Feet" },
  { value: "kg",       label: "kg — Kilogram" },
  { value: "tonnes",   label: "Tonnes" },
  { value: "nos",      label: "Nos — Numbers" },
  { value: "lump sum", label: "Lump Sum" },
  { value: "rmt",      label: "Rmt — Running Metre" },
];

const EMPTY_FORM = {
  description: "",
  unit: "",
  quantity: "",
  rate: "",
  remarks: "",
  itemCode: "",
};

export default function BOQInputForm({ project, onProjectUpdate }: BOQInputFormProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedSSRItem, setSelectedSSRItem] = useState<SSRItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const addBOQItemMutation = useMutation({
    mutationFn: async (itemData: InsertBOQItem) => {
      const response = await apiRequest("POST", "/api/boq-items", itemData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Item added successfully" });
      setFormData(EMPTY_FORM);
      setSelectedSSRItem(null);
      setSearchQuery("");
      setShowDropdown(false);
      queryClient.invalidateQueries({ queryKey: ["/api/boq-items", project.id] });
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const handleSSRSelect = (item: SSRItem) => {
    setSelectedSSRItem(item);
    setFormData({
      description: item.description,
      unit: item.unit,
      rate: item.rate.toString(),
      remarks: "As per SSR",
      itemCode: item.itemCode,
      quantity: formData.quantity,
    });
    setSearchQuery(item.description);
    setShowDropdown(false);
  };

  const handleDescriptionChange = (val: string) => {
    setFormData({ ...formData, description: val });
    setSearchQuery(val);
    setShowDropdown(val.length >= 2);
    if (!val) setSelectedSSRItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.unit || !formData.quantity || !formData.rate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const quantity = parseFloat(formData.quantity);
    const rate = parseFloat(formData.rate);
    addBOQItemMutation.mutate({
      projectId: project.id,
      description: formData.description,
      unit: formData.unit,
      quantity,
      rate,
      amount: quantity * rate,
      remarks: formData.remarks || null,
      itemCode: formData.itemCode || null,
      sequenceNumber: Date.now(),
    });
  };

  const handleClear = () => {
    setFormData(EMPTY_FORM);
    setSelectedSSRItem(null);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const amount = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.rate) || 0);

  return (
    <div className="bg-white rounded-2xl card-shadow overflow-hidden">
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <Plus className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Add BOQ Item</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Description / SSR Search */}
        <div className="space-y-2 relative">
          <Label className="text-[15px] font-semibold text-gray-800">
            Item Description <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={formData.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
              placeholder="Type to search SSR items…"
              className="pl-10 h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {selectedSSRItem && (
              <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
            )}
          </div>

          {/* SSR Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
              ) : ssrItems.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No SSR items found. You can still enter details manually.</div>
              ) : (
                <ul className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {ssrItems.map((item) => (
                    <li
                      key={item.id}
                      onMouseDown={() => handleSSRSelect(item)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer group"
                    >
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 leading-snug">{item.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded">{item.itemCode}</span>
                        <span className="text-xs text-gray-500">{item.unit}</span>
                        <span className="text-xs font-semibold text-gray-700 ml-auto">₹{item.rate.toLocaleString("en-IN")}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {selectedSSRItem && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">
                <span className="font-semibold">{selectedSSRItem.itemCode}</span> — Rate auto-filled from SSR
              </span>
            </div>
          )}
        </div>

        {/* Unit + Quantity row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[15px] font-semibold text-gray-800">
              Unit <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
              <SelectTrigger className="h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value} className="text-base py-2.5">
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[15px] font-semibold text-gray-800">
              Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="0.00"
              className="h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Rate + Amount row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[15px] font-semibold text-gray-800">
              Rate (₹) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              placeholder="0.00"
              className="h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[15px] font-semibold text-gray-800">Amount (₹)</Label>
            <div className="h-12 flex items-center px-4 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900">
              {amount > 0
                ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : <span className="text-gray-400 font-normal">Auto-calculated</span>}
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <Label className="text-[15px] font-semibold text-gray-800">
            Remarks <span className="text-gray-400 font-normal">(Optional)</span>
          </Label>
          <Input
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="Any additional notes…"
            className="h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <Button
            type="submit"
            disabled={addBOQItemMutation.isPending}
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2"
          >
            {addBOQItemMutation.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Item
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="h-12 px-5 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
