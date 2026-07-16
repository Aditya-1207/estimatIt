import { Plus, Trash2, GripVertical } from "lucide-react";
import type { MeasurementBlockWithDetails } from "../../lib/api/measurements";
import { MajorItemSection } from "./MajorItemSection";
import { useMeasurementStore } from "../../store/measurementStore";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MeasurementBlockCardProps {
  block: MeasurementBlockWithDetails;
}

export function MeasurementBlockCard({ block }: MeasurementBlockCardProps) {
  const { deleteMeasurementBlock, addMajorItem, reorderMajorItems } = useMeasurementStore();

  // Calculate Block Total Quantity
  let blockTotal = 0;
  block.major_items.forEach((mi) => {
    mi.dimension_rows.forEach((dr) => {
      let q = 1;
      let hasValue = false;
      if (dr.number > 0) { q *= dr.number; hasValue = true; }
      if (dr.length > 0) { q *= dr.length; hasValue = true; }
      if (dr.breadth > 0) { q *= dr.breadth; hasValue = true; }
      if (dr.depth > 0) { q *= dr.depth; hasValue = true; }
      if (hasValue) blockTotal += q;
    });
  });

  // Display attributes
  const isCustom = !block.ssr_item_id;
  const description = isCustom ? block.custom_description : block.ssr_item?.description;
  const unit = isCustom ? block.custom_unit : block.ssr_item?.unit;
  const itemNo = isCustom ? "Custom" : block.ssr_item?.item_no;
  
  const rate = isCustom ? block.custom_rate : block.ssr_item?.completed_rate_inr;
  const blockAmount = blockTotal * (rate || 0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, data: { type: "Block" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDragEndMajorItems = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = block.major_items.findIndex(mi => mi.id === active.id);
      const newIndex = block.major_items.findIndex(mi => mi.id === over.id);
      reorderMajorItems(block.id, oldIndex, newIndex);
    }
  };

  const handleAddMajorItem = () => {
    const nextSeq = block.major_items.length > 0 
      ? Math.max(...block.major_items.map(m => m.sequence_number)) + 1 
      : 1;

    addMajorItem(block.id, {
      id: crypto.randomUUID(),
      block_id: block.id,
      description: "",
      sequence_number: nextSeq,
      created_at: new Date().toISOString(),
      dimension_rows: []
    });
  };

  return (
    <div ref={setNodeRef} style={style} className="group/block relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md mb-6">
      
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border bg-muted/30 px-5 py-4 pl-12">
        <div 
          {...attributes} 
          {...listeners}
          className="absolute left-4 top-5 cursor-grab hover:text-primary text-muted-foreground/30 opacity-0 group-hover/block:opacity-100 transition-opacity p-1"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="flex items-start gap-4 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
            {block.sequence_number}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground">
              <span className="text-primary mr-2">[{itemNo}]</span>
              {description}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <span className="rounded-full bg-background border px-2 py-0.5">
                Unit: {unit || "—"}
              </span>
              <span className="rounded-full bg-background border px-2 py-0.5">
                Rate: ₹{rate?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => deleteMeasurementBlock(block.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/block:opacity-100 focus:opacity-100"
          aria-label="Delete block"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Content (Major Items) */}
      <div className="p-5 pt-3">
        {block.major_items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground">No measurements added.</p>
            <p className="text-xs text-muted-foreground mt-1">Start by adding a major item.</p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndMajorItems}>
            <SortableContext items={block.major_items.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {block.major_items.map((mi) => (
                  <MajorItemSection
                    key={mi.id}
                    blockId={block.id}
                    majorItem={mi}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-4 pl-4">
          <button
            onClick={handleAddMajorItem}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            Add Major Item (e.g. Gents Toilet)
          </button>
        </div>
      </div>

      {/* Footer (Total) */}
      <div className="flex items-center justify-end gap-6 bg-muted/10 border-t border-border px-5 py-3">
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Quantity</span>
          <span className="font-mono text-base font-bold text-foreground">
            {blockTotal > 0 ? blockTotal.toFixed(2) : "0.00"} <span className="text-xs text-muted-foreground font-sans font-normal">{unit}</span>
          </span>
        </div>
        <div className="h-10 w-px bg-border hidden sm:block" />
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Block Amount</span>
          <span className="font-mono text-base font-bold text-primary">
            ₹{blockAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
