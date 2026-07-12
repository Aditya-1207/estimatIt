import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { MajorItemWithDimensions } from "../../lib/api/measurements";
import { DimensionRowInput } from "./DimensionRowInput";
import { useMeasurementStore } from "../../store/measurementStore";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter } from "@dnd-kit/core";

interface MajorItemSectionProps {
  blockId: string;
  majorItem: MajorItemWithDimensions;
}

export function MajorItemSection({
  blockId,
  majorItem,
}: MajorItemSectionProps) {
  const [desc, setDesc] = useState(majorItem.description);
  const { updateMajorItem, deleteMajorItem, updateDimensionRow, deleteDimensionRow, addDimensionRow, reorderDimensionRows } = useMeasurementStore();

  useEffect(() => {
    setDesc(majorItem.description);
  }, [majorItem.description]);

  const handleBlur = () => {
    if (desc !== majorItem.description) {
      updateMajorItem(blockId, majorItem.id, desc);
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: majorItem.id, data: { type: "MajorItem", blockId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDragEndRows = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = majorItem.dimension_rows.findIndex(r => r.id === active.id);
      const newIndex = majorItem.dimension_rows.findIndex(r => r.id === over.id);
      reorderDimensionRows(blockId, majorItem.id, oldIndex, newIndex);
    }
  };

  const handleAddRow = () => {
    const nextSeq = majorItem.dimension_rows.length > 0
      ? Math.max(...majorItem.dimension_rows.map(r => r.sequence_number)) + 1
      : 1;
    const newId = crypto.randomUUID();
    addDimensionRow(blockId, majorItem.id, {
      id: newId,
      major_item_id: majorItem.id,
      sequence_number: nextSeq,
      description: "",
      number: 0,
      length: 0,
      breadth: 0,
      depth: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Auto-focus the newly created description field
    setTimeout(() => {
      const el = document.querySelector(`[data-row-id="${newId}"] [data-field="description"]`) as HTMLInputElement;
      if (el) el.focus();
    }, 50);
  };

  return (
    <div ref={setNodeRef} style={style} className="group/major relative ml-2 pl-4 border-l-2 border-muted hover:border-primary/30 transition-colors pt-2 pb-4">
      
      <div 
        {...attributes} 
        {...listeners}
        className="absolute -left-3 top-3 cursor-grab hover:text-primary text-muted-foreground/30 opacity-0 group-hover/major:opacity-100 transition-opacity bg-card p-1 rounded-full border border-border"
      >
        <GripVertical className="h-3 w-3" />
      </div>

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
          onClick={() => deleteMajorItem(blockId, majorItem.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/major:opacity-100 focus:opacity-100"
          aria-label="Delete major item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndRows}>
        <SortableContext items={majorItem.dimension_rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {majorItem.dimension_rows.map((row) => (
              <DimensionRowInput
                key={row.id}
                row={row}
                blockId={blockId}
                majorItemId={majorItem.id}
                onChange={(id, updates) => updateDimensionRow(blockId, majorItem.id, id, updates)}
                onDelete={(id) => deleteDimensionRow(blockId, majorItem.id, id)}
                onEnterNext={handleAddRow}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-2 ml-2">
        <button
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add Dimension Row
        </button>
      </div>
    </div>
  );
}
