import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, RotateCcw, Search, CheckCircle2, Pencil, X, Calculator } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SSRItem, Project, BOQItem, InsertBOQItem } from "@shared/schema";

// ─── UoM config ──────────────────────────────────────────────────────────────
type DimCategory = "volume" | "area" | "length" | "count" | "weight" | "liquid" | "time" | "lumpsum";

interface UomDef { label: string; group: string; category: DimCategory }

const UOM_CONFIG: Record<string, UomDef> = {
  // Volume
  "m³":      { label: "Cum / m³ — Cubic Metre",   group: "Volume",      category: "volume"  },
  "ft³":     { label: "Cft / ft³ — Cubic Feet",   group: "Volume",      category: "volume"  },
  "brass":   { label: "Brass (100 ft³)",           group: "Volume",      category: "volume"  },
  // Area
  "m²":      { label: "Sqm / m² — Square Metre",  group: "Area",        category: "area"    },
  "sqft":    { label: "Sqft — Square Feet",        group: "Area",        category: "area"    },
  // Length
  "rmt":     { label: "Rmt — Running Metre",       group: "Length",      category: "length"  },
  "rft":     { label: "Rft — Running Feet",        group: "Length",      category: "length"  },
  "km":      { label: "Km — Kilometre",            group: "Length",      category: "length"  },
  // Count
  "nos":     { label: "Nos — Numbers",             group: "Count",       category: "count"   },
  // Weight
  "kg":      { label: "kg — Kilogram",             group: "Weight",      category: "weight"  },
  "mt":      { label: "MT — Metric Tonnes",        group: "Weight",      category: "weight"  },
  "quintal": { label: "Quintal (100 kg)",           group: "Weight",      category: "weight"  },
  // Liquid
  "ltr":     { label: "Ltr — Litres",              group: "Liquid",      category: "liquid"  },
  // Time / Hire
  "days":    { label: "Days",                      group: "Time / Hire", category: "time"    },
  "months":  { label: "Months",                    group: "Time / Hire", category: "time"    },
  // Flat Cost
  "ls":      { label: "LS — Lump Sum",             group: "Flat Cost",   category: "lumpsum" },
};

const UOM_GROUPS = [
  { group: "Volume",      units: ["m³", "ft³", "brass"]   },
  { group: "Area",        units: ["m²", "sqft"]            },
  { group: "Length",      units: ["rmt", "rft", "km"]      },
  { group: "Count",       units: ["nos"]                   },
  { group: "Weight",      units: ["kg", "mt", "quintal"]  },
  { group: "Liquid",      units: ["ltr"]                   },
  { group: "Time / Hire", units: ["days", "months"]        },
  { group: "Flat Cost",   units: ["ls"]                    },
];

// ─── Dimension helpers ────────────────────────────────────────────────────────
type Dims = { nos: string; length: string; breadth: string; depth: string; unitWeight: string; duration: string };
const EMPTY_DIMS: Dims = { nos: "", length: "", breadth: "", depth: "", unitWeight: "", duration: "" };

function calcQty(cat: DimCategory, d: Dims): number {
  const n   = parseFloat(d.nos)        || 0;
  const L   = parseFloat(d.length)     || 0;
  const B   = parseFloat(d.breadth)    || 0;
  const D   = parseFloat(d.depth)      || 0;
  const UW  = parseFloat(d.unitWeight) || 0;
  const dur = parseFloat(d.duration)   || 0;
  switch (cat) {
    case "volume":  return n * L * B * D;
    case "area":    return n * L * B;
    case "length":  return n * L;
    case "count":   return n;
    case "weight":  return n * L * UW;
    case "time":    return n * dur;
    case "lumpsum": return 1;
    default:        return 0;
  }
}

function anyDimFilled(d: Dims): boolean {
  return Object.values(d).some(v => v !== "" && parseFloat(v) > 0);
}

const FORMULA_HINT: Record<DimCategory, string> = {
  volume:  "Qty = No. × Length × Breadth × Depth",
  area:    "Qty = No. × Length × Breadth / Height",
  length:  "Qty = No. × Length",
  count:   "Qty = No. of Items",
  weight:  "Qty = No. × Length × Unit Weight (kg/m)",
  time:    "Qty = No. × Duration",
  liquid:  "",
  lumpsum: "",
};

// ─── Empty form state ─────────────────────────────────────────────────────────
const EMPTY_FORM = { description: "", unit: "", quantity: "", rate: "", remarks: "", itemCode: "" };

// ─── Props ────────────────────────────────────────────────────────────────────
interface BOQInputFormProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  editingItem: BOQItem | null;
  onEditDone: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BOQInputForm({ project, onProjectUpdate, editingItem, onEditDone }: BOQInputFormProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [dims, setDims] = useState<Dims>(EMPTY_DIMS);
  const [selectedSSRItem, setSelectedSSRItem] = useState<SSRItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEditMode = editingItem !== null;
  const cat: DimCategory = (formData.unit && UOM_CONFIG[formData.unit]?.category) || "volume";
  const isLumpSum = cat === "lumpsum";
  const isLiquid  = cat === "liquid";
  const showDims  = formData.unit && !isLumpSum && !isLiquid;

  // Auto-calculate quantity from dimensions
  useEffect(() => {
    if (!formData.unit || isLumpSum || isLiquid) return;
    if (!anyDimFilled(dims)) return;
    const computed = calcQty(cat, dims);
    setFormData(prev => ({ ...prev, quantity: computed > 0 ? computed.toFixed(3) : prev.quantity }));
  }, [dims, formData.unit]);

  // Lump sum: lock quantity to 1
  useEffect(() => {
    if (isLumpSum) setFormData(prev => ({ ...prev, quantity: "1" }));
  }, [isLumpSum]);

  // Pre-fill when entering edit mode
  useEffect(() => {
    if (editingItem) {
      setFormData({
        description: editingItem.description,
        unit: editingItem.unit,
        quantity: editingItem.quantity.toString(),
        rate: editingItem.rate.toString(),
        remarks: editingItem.remarks ?? "",
        itemCode: editingItem.itemCode ?? "",
      });
      setDims(EMPTY_DIMS);
      setSearchQuery(editingItem.description);
      setSelectedSSRItem(null);
      setShowDropdown(false);
    } else {
      handleClear();
    }
  }, [editingItem]);

  const { data: ssrItems = [], isLoading: isSearching } = useQuery<SSRItem[]>({
    queryKey: ["/api/ssr-items/search", searchQuery],
    enabled: searchQuery.length >= 2 && !isEditMode,
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/ssr-items/search", { query: searchQuery, limit: 10 });
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/boq-items", project.id] });

  const addMutation = useMutation({
    mutationFn: async (item: InsertBOQItem) => {
      const res = await apiRequest("POST", "/api/boq-items", item);
      return res.json();
    },
    onSuccess: () => { toast({ title: "Item added" }); handleClear(); invalidate(); },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: object }) => {
      const res = await apiRequest("PUT", `/api/boq-items/${id}`, updates);
      return res.json();
    },
    onSuccess: () => { toast({ title: "Item updated" }); onEditDone(); invalidate(); },
    onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
  });

  const handleSSRSelect = (item: SSRItem) => {
    setSelectedSSRItem(item);
    setFormData(prev => ({
      ...prev,
      description: item.description,
      unit: item.unit,
      rate: item.rate.toString(),
      remarks: "As per SSR",
      itemCode: item.itemCode,
    }));
    setDims(EMPTY_DIMS);
    setSearchQuery(item.description);
    setShowDropdown(false);
  };

  const handleDescriptionChange = (val: string) => {
    setFormData(prev => ({ ...prev, description: val }));
    if (!isEditMode) {
      setSearchQuery(val);
      setShowDropdown(val.length >= 2);
      if (!val) setSelectedSSRItem(null);
    }
  };

  const handleUnitChange = (v: string) => {
    setFormData(prev => ({ ...prev, unit: v, quantity: v === "ls" ? "1" : "" }));
    setDims(EMPTY_DIMS);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty  = isLumpSum ? 1 : parseFloat(formData.quantity);
    const rate = parseFloat(formData.rate);
    if (!formData.description || !formData.unit || isNaN(qty) || isNaN(rate)) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const amount = qty * rate;
    if (isEditMode && editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        updates: {
          description: formData.description, unit: formData.unit,
          quantity: qty, rate, amount,
          remarks: formData.remarks || null,
          itemCode: formData.itemCode || null,
        },
      });
    } else {
      addMutation.mutate({
        projectId: project.id,
        description: formData.description,
        unit: formData.unit,
        quantity: qty,
        rate,
        amount,
        remarks: formData.remarks || null,
        itemCode: formData.itemCode || null,
        sequenceNumber: Math.floor(Date.now() / 1000) % 2000000000,
      });
    }
  };

  const handleClear = () => {
    setFormData(EMPTY_FORM);
    setDims(EMPTY_DIMS);
    setSelectedSSRItem(null);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleCancelEdit = () => { onEditDone(); handleClear(); };
  const setDim = (key: keyof Dims, val: string) => setDims(prev => ({ ...prev, [key]: val }));

  const qty = isLumpSum ? 1 : (parseFloat(formData.quantity) || 0);
  const rate = parseFloat(formData.rate) || 0;
  const amount = qty * rate;
  const isPending = addMutation.isPending || updateMutation.isPending;
  const dimsActive = !!showDims && anyDimFilled(dims);

  // ── Dim input sub-component ──────────────────────────────────────────────
  const DimField = ({
    label, dimKey, placeholder = "0",
  }: { label: string; dimKey: keyof Dims; placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <Input
        type="number" step="any" min="0"
        value={dims[dimKey]}
        onChange={e => setDim(dimKey, e.target.value)}
        placeholder={placeholder}
        className="h-10 text-sm border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  // ── Dimension grid columns per category ──────────────────────────────────
  const dimGridCols: Record<DimCategory, string> = {
    volume:  "grid-cols-2 sm:grid-cols-4",
    area:    "grid-cols-3",
    length:  "grid-cols-2",
    count:   "grid-cols-1",
    weight:  "grid-cols-3",
    time:    "grid-cols-2",
    liquid:  "",
    lumpsum: "",
  };

  return (
    <div className={`bg-white rounded-2xl card-shadow overflow-hidden border-2 transition-colors ${isEditMode ? "border-amber-400" : "border-transparent"}`}>

      {/* ── Header ── */}
      <div className={`px-6 py-4 border-b flex items-center gap-3 ${isEditMode ? "bg-amber-50 border-amber-200" : "border-gray-100"}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isEditMode ? "bg-amber-100" : "bg-blue-50"}`}>
          {isEditMode ? <Pencil className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-900">{isEditMode ? "Edit BOQ Item" : "Add BOQ Item"}</h2>
          {isEditMode && <p className="text-xs text-amber-700 mt-0.5">Editing item — update fields and save</p>}
        </div>
        {isEditMode && (
          <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" title="Cancel edit">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">

        {/* ── Description / SSR search ── */}
        <div className="space-y-2 relative">
          <Label className="text-[15px] font-semibold text-gray-800">
            Item Description <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={formData.description}
              onChange={e => handleDescriptionChange(e.target.value)}
              onFocus={() => !isEditMode && searchQuery.length >= 2 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
              placeholder={isEditMode ? "Update description…" : "Type to search SSR items…"}
              className="pl-10 h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {selectedSSRItem && !isEditMode && (
              <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
            )}
          </div>

          {/* SSR dropdown */}
          {!isEditMode && showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
              ) : ssrItems.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No SSR items found. Enter details manually.</div>
              ) : (
                <ul className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {ssrItems.map(item => (
                    <li key={item.id} onMouseDown={() => handleSSRSelect(item)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer group">
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

          {selectedSSRItem && !isEditMode && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">
                <span className="font-semibold">{selectedSSRItem.itemCode}</span> — Rate auto-filled from SSR
              </span>
            </div>
          )}
        </div>

        {/* ── Unit of Measurement ── */}
        <div className="space-y-2">
          <Label className="text-[15px] font-semibold text-gray-800">
            Unit of Measurement <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.unit} onValueChange={handleUnitChange}>
            <SelectTrigger className="h-12 text-base border-gray-200 rounded-xl">
              <SelectValue placeholder="Select unit…" />
            </SelectTrigger>
            <SelectContent>
              {UOM_GROUPS.map(g => (
                <SelectGroup key={g.group}>
                  <SelectLabel className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1.5">{g.group}</SelectLabel>
                  {g.units.map(u => (
                    <SelectItem key={u} value={u} className="text-sm py-2.5">{UOM_CONFIG[u].label}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Dimensional inputs ── */}
        {showDims && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-700">Dimensions</span>
              </div>
              {dimsActive && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Qty = {calcQty(cat, dims).toFixed(3)} {formData.unit}
                </span>
              )}
            </div>

            <div className={`grid gap-3 ${dimGridCols[cat]}`}>
              {cat === "volume" && (
                <>
                  <DimField label="No." dimKey="nos" />
                  <DimField label="Length (L)" dimKey="length" />
                  <DimField label="Breadth (B)" dimKey="breadth" />
                  <DimField label="Depth / Ht (D)" dimKey="depth" />
                </>
              )}
              {cat === "area" && (
                <>
                  <DimField label="No." dimKey="nos" />
                  <DimField label="Length (L)" dimKey="length" />
                  <DimField label="Breadth / Ht (B)" dimKey="breadth" />
                </>
              )}
              {cat === "length" && (
                <>
                  <DimField label="No." dimKey="nos" />
                  <DimField label="Length (L)" dimKey="length" />
                </>
              )}
              {cat === "count" && (
                <DimField label="No. of Items" dimKey="nos" />
              )}
              {cat === "weight" && (
                <>
                  <DimField label="No." dimKey="nos" />
                  <DimField label="Length (m)" dimKey="length" />
                  <DimField label="Unit Wt (kg/m)" dimKey="unitWeight" placeholder="0.000" />
                </>
              )}
              {cat === "time" && (
                <>
                  <DimField label="No. of Units" dimKey="nos" />
                  <DimField label="Duration" dimKey="duration" />
                </>
              )}
            </div>

            {dimsActive && FORMULA_HINT[cat] && (
              <p className="text-xs text-blue-500 font-medium">{FORMULA_HINT[cat]}</p>
            )}
            {!dimsActive && (
              <p className="text-xs text-gray-400">Enter dimensions above to auto-calculate the quantity.</p>
            )}
          </div>
        )}

        {/* ── Lump Sum notice ── */}
        {isLumpSum && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800 font-medium">Lump Sum item — enter the rate directly. Quantity is fixed at 1.</p>
          </div>
        )}

        {/* ── Liquid notice ── */}
        {isLiquid && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
            <p className="text-sm text-blue-700 font-medium">Enter quantity directly in litres.</p>
          </div>
        )}

        {/* ── Quantity + Rate ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Quantity — hidden for lump sum */}
          {!isLumpSum && (
            <div className="space-y-2">
              <Label className="text-[15px] font-semibold text-gray-800">
                Quantity <span className="text-red-500">*</span>
                {dimsActive && <span className="text-xs font-normal text-blue-500 ml-1">(auto)</span>}
              </Label>
              <div className="relative">
                <Input
                  type="number" step="any" min="0"
                  value={formData.quantity}
                  onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0.000"
                  className={`h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    dimsActive ? "bg-blue-50 text-blue-800 font-semibold" : ""
                  }`}
                />
                {dimsActive && (
                  <Calculator className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                )}
              </div>
            </div>
          )}

          <div className={`space-y-2 ${isLumpSum ? "col-span-2" : ""}`}>
            <Label className="text-[15px] font-semibold text-gray-800">
              {isLumpSum ? "Rate / Amount (₹)" : "Rate (₹)"}
              <span className="text-red-500"> *</span>
            </Label>
            <Input
              type="number" step="0.01" min="0"
              value={formData.rate}
              onChange={e => setFormData(prev => ({ ...prev, rate: e.target.value }))}
              placeholder="0.00"
              className="h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* ── Amount display ── */}
        <div className="space-y-2">
          <Label className="text-[15px] font-semibold text-gray-800">Amount (₹)</Label>
          <div className={`h-12 flex items-center px-4 border rounded-xl text-base font-bold transition-colors ${
            amount > 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-gray-50 border-gray-200 text-gray-400"
          }`}>
            {amount > 0
              ? `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : <span className="font-normal">Auto-calculated</span>}
          </div>
        </div>

        {/* ── Remarks ── */}
        <div className="space-y-2">
          <Label className="text-[15px] font-semibold text-gray-800">
            Remarks <span className="text-gray-400 font-normal">(Optional)</span>
          </Label>
          <Input
            value={formData.remarks}
            onChange={e => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
            placeholder="Any additional notes…"
            className="h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3 pt-1">
          <Button
            type="submit"
            disabled={isPending}
            className={`flex-1 h-12 text-white text-base font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 ${
              isEditMode ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isPending ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {isEditMode ? "Saving…" : "Adding…"}</>
            ) : isEditMode ? (
              <><Pencil className="w-4 h-4" /> Save Changes</>
            ) : (
              <><Plus className="w-5 h-5" /> Add Item</>
            )}
          </Button>
          {isEditMode ? (
            <Button type="button" variant="outline" onClick={handleCancelEdit} className="h-12 px-5 rounded-xl border-gray-200 text-gray-600 font-medium">
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={handleClear} className="h-12 px-5 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
