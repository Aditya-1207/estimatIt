import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { MajorItemWithDimensions } from "../../lib/api/measurements";
import type { DimensionRow } from "@estimatit/shared";
import { DimensionRowInput } from "./DimensionRowInput";

interface MajorItemSectionProps {
  majorItem: MajorItemWithDimensions;
  onUpdate: (id: string, description: string) => void;
  onDelete: (id: string) => void;
  onAddRow: (majorItemId: string) => void;
  onUpdateRow: (rowId: string, updates: Partial<DimensionRow>) => void;
  onDeleteRow: (rowId: string) => void;
}

export function MajorItemSection({
  majorItem,
  onUpdate,
  onDelete,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
}: MajorItemSectionProps) {
  const [desc, setDesc] = useState(majorItem.description);

  useEffect(() => {
    setDesc(majorItem.description);
  }, [majorItem.description]);

  const handleBlur = () => {
    if (desc !== majorItem.description) {
      onUpdate(majorItem.id, desc);
    }
  };

  return (
    <div className="group/major relative ml-2 pl-4 border-l-2 border-muted hover:border-primary/30 transition-colors pt-2 pb-4">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={handleBlur}
          placeholder="Major Item Description (e.g., Gents Toilet)"
          className="flex-1 font-semibold text-foreground bg-transparent border border-transparent rounded px-2 py-1 text-sm transition-colors hover:border-input focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() => onDelete(majorItem.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/major:opacity-100 focus:opacity-100"
          aria-label="Delete major item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {majorItem.dimension_rows.map((row) => (
          <DimensionRowInput
            key={row.id}
            row={row}
            onChange={onUpdateRow}
            onDelete={onDeleteRow}
          />
        ))}
      </div>

      <div className="mt-2 ml-2">
        <button
          onClick={() => onAddRow(majorItem.id)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add Dimension Row
        </button>
      </div>
    </div>
  );
}
