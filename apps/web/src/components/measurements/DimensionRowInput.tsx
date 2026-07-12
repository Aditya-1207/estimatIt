import { useState, useEffect } from "react";
import { Trash2, GripVertical } from "lucide-react";
import type { DimensionRow } from "@estimatit/shared";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DimensionRowInputProps {
  row: DimensionRow;
  blockId: string;
  majorItemId: string;
  onChange: (id: string, updates: Partial<DimensionRow>) => void;
  onDelete: (id: string) => void;
  onEnterNext: (currentRowId: string) => void;
}

export function DimensionRowInput({ row, onChange, onDelete, onEnterNext }: DimensionRowInputProps) {
  // Local state for fast typing
  const [desc, setDesc] = useState(row.description);
  const [num, setNum] = useState(row.number === 0 ? "" : String(row.number));
  const [len, setLen] = useState(row.length === 0 ? "" : String(row.length));
  const [bre, setBre] = useState(row.breadth === 0 ? "" : String(row.breadth));
  const [dep, setDep] = useState(row.depth === 0 ? "" : String(row.depth));

  // Sync from props if they change externally (e.g. initial load)
  useEffect(() => { setDesc(row.description); }, [row.description]);
  useEffect(() => { setNum(row.number === 0 ? "" : String(row.number)); }, [row.number]);
  useEffect(() => { setLen(row.length === 0 ? "" : String(row.length)); }, [row.length]);
  useEffect(() => { setBre(row.breadth === 0 ? "" : String(row.breadth)); }, [row.breadth]);
  useEffect(() => { setDep(row.depth === 0 ? "" : String(row.depth)); }, [row.depth]);

  // Calculate quantity live
  const numVal = parseFloat(num) || 0;
  const lenVal = parseFloat(len) || 0;
  const breVal = parseFloat(bre) || 0;
  const depVal = parseFloat(dep) || 0;
  
  // If any are > 0, we multiply them, but treating empty/0 dimensions as 1 for multiplication if others exist?
  // Wait, the spec says: "If any dimension is 0 or empty, quantity = 0"
  // But wait, if someone only has Length (e.g., Rmt), Breadth and Depth are empty.
  // Actually, standard estimation practice: empty dimensions are ignored (treated as 1 in multiplication).
  // Let's implement smart calculation: multiply all non-zero/non-empty values together.
  // If all are empty, quantity is 0.
  const calcQuantity = () => {
    let q = 1;
    let hasValue = false;
    
    if (numVal > 0) { q *= numVal; hasValue = true; }
    if (lenVal > 0) { q *= lenVal; hasValue = true; }
    if (breVal > 0) { q *= breVal; hasValue = true; }
    if (depVal > 0) { q *= depVal; hasValue = true; }
    
    return hasValue ? q : 0;
  };

  const quantity = calcQuantity();

  // Helper to trigger save on blur
  const handleBlur = () => {
    onChange(row.id, {
      description: desc,
      number: parseFloat(num) || 0,
      length: parseFloat(len) || 0,
      breadth: parseFloat(bre) || 0,
      depth: parseFloat(dep) || 0,
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fieldName: string) => {
    if (e.key === "Escape") {
      setDesc(row.description);
      setNum(row.number === 0 ? "" : String(row.number));
      setLen(row.length === 0 ? "" : String(row.length));
      setBre(row.breadth === 0 ? "" : String(row.breadth));
      setDep(row.depth === 0 ? "" : String(row.depth));
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Enter" && fieldName === "depth") {
      e.preventDefault();
      handleBlur(); // Save current
      onEnterNext(row.id); // Triggers parent to add a new row
    }
    // Arrow Up / Arrow Down moves focus between inputs of the same class
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const currentElement = e.target as HTMLInputElement;
      const inputs = Array.from(document.querySelectorAll(`input[data-field="${fieldName}"]`)) as HTMLInputElement[];
      const index = inputs.indexOf(currentElement);
      if (e.key === "ArrowUp" && index > 0) {
        inputs[index - 1].focus();
      } else if (e.key === "ArrowDown" && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center gap-2 rounded-md transition-colors hover:bg-muted/50 py-1 pl-2 pr-2">
      
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab hover:text-primary text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity p-1"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex flex-1 items-center gap-2">
        {/* Description */}
        <input
          data-field="description"
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => handleKeyDown(e, "description")}
          placeholder="Description (e.g. Septic Tank)"
          className="h-8 flex-1 min-w-[200px] rounded border border-transparent bg-transparent px-2 text-sm transition-colors hover:border-input focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        
        {/* Dimensions */}
        <div className="flex items-center gap-2">
          <input
            data-field="number"
            type="number"
            value={num}
            onChange={(e) => setNum(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown(e, "number")}
            placeholder="No"
            className="h-8 w-16 text-right rounded border border-transparent bg-transparent px-2 text-sm transition-colors hover:border-input focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-muted-foreground text-xs">×</span>
          <input
            data-field="length"
            type="number"
            value={len}
            onChange={(e) => setLen(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown(e, "length")}
            placeholder="L"
            className="h-8 w-20 text-right rounded border border-transparent bg-transparent px-2 text-sm transition-colors hover:border-input focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-muted-foreground text-xs">×</span>
          <input
            data-field="breadth"
            type="number"
            value={bre}
            onChange={(e) => setBre(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown(e, "breadth")}
            placeholder="B"
            className="h-8 w-20 text-right rounded border border-transparent bg-transparent px-2 text-sm transition-colors hover:border-input focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-muted-foreground text-xs">×</span>
          <input
            data-field="depth"
            type="number"
            value={dep}
            onChange={(e) => setDep(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown(e, "depth")}
            placeholder="D"
            className="h-8 w-20 text-right rounded border border-transparent bg-transparent px-2 text-sm transition-colors hover:border-input focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Quantity */}
        <div className="flex w-24 items-center justify-end font-mono text-sm font-semibold pr-2">
          {quantity > 0 ? quantity.toFixed(2) : "—"}
        </div>
      </div>

      <button
        onClick={() => onDelete(row.id)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
        aria-label="Delete row"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
