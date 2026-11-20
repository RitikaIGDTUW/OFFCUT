"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Uploader } from "@/components/ui/uploader";
import { SafeImage } from "@/components/ui/safe-image";

export type ManagedImage = { url: string; key?: string; alt: string };

/** UploadThing multi-image dropzone + drag-to-reorder (mouse or keyboard) + per-image alt text. First image = cover. */
export function ImageManager({ value, onChange, max = 10 }: { value: ManagedImage[]; onChange: (v: ManagedImage[]) => void; max?: number }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = value.findIndex((v) => v.url === e.active.id);
    const to = value.findIndex((v) => v.url === e.over!.id);
    onChange(arrayMove(value, from, to));
  };
  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.map((v) => v.url)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {value.map((img, i) => (
              <SortableImage
                key={img.url}
                img={img}
                index={i}
                onAlt={(alt) => onChange(value.map((v, idx) => (idx === i ? { ...v, alt } : v)))}
                onRemove={() => onChange(value.filter((_, idx) => idx !== i))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Uploader
        endpoint="productImages"
        value={[]}
        showPreview={false}
        max={Math.max(0, max - value.length)}
        label="Drop lot photos here (first image is the cover)"
        onChange={(files) => onChange([...value, ...files.map((f) => ({ url: f.url, key: f.key, alt: "" }))].slice(0, max))}
      />
    </div>
  );
}

function SortableImage({ img, index, onAlt, onRemove }: { img: ManagedImage; index: number; onAlt: (a: string) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.url });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`border border-ink bg-paper ${isDragging ? "z-10 shadow-stamp" : ""}`}>
      <div className="relative aspect-square">
        <SafeImage src={img.url} alt={img.alt || "Lot photo"} fill sizes="200px" className="object-cover" />
        <button type="button" {...attributes} {...listeners} className="absolute left-1 top-1 cursor-grab border border-ink bg-paper p-1" aria-label={`Drag to reorder image ${index + 1}`}>
          <GripVertical size={14} />
        </button>
        <button type="button" onClick={onRemove} className="absolute right-1 top-1 border border-ink bg-paper p-1 hover:bg-ink hover:text-paper" aria-label={`Remove image ${index + 1}`}>
          <X size={14} />
        </button>
        {index === 0 ? <span className="spec absolute bottom-1 left-1 bg-signal px-1 text-[9px] text-signal-ink">Cover</span> : null}
      </div>
      <input value={img.alt} onChange={(e) => onAlt(e.target.value)} placeholder="Alt text" aria-label={`Alt text for image ${index + 1}`} className="w-full border-t border-ink bg-paper px-2 py-1 text-xs" />
    </li>
  );
}
