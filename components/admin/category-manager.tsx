"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { categorySchema } from "@/lib/validations/product";
import { deleteCategory, reorderCategories, saveCategory } from "@/actions/admin/catalog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Uploader, type UploadedFile } from "@/components/ui/uploader";
import { SafeImage } from "@/components/ui/safe-image";

type Row = { _id: string; name: string; slug: string; description: string; image: { url: string; key?: string } | null; parent: string; isActive: boolean; count: number };

export function CategoryManager({ rows: initial }: { rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(rows, rows.findIndex((r) => r._id === e.active.id), rows.findIndex((r) => r._id === e.over!.id));
    setRows(next);
    start(async () => {
      const r = await reorderCategories(next.map((x) => x._id));
      if (!r.ok) toast.error(r.error);
    });
  };
  const nameOf = (id: string) => rows.find((r) => r._id === id)?.name;

  return (
    <>
      <Button variant="signal" onClick={() => setEditing("new")} className="mb-4">
        + New category
      </Button>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map((r) => r._id)} strategy={verticalListSortingStrategy}>
          <ul className="border border-ink">
            {rows.map((r) => (
              <SortableRow key={r._id} row={r} parentName={r.parent ? nameOf(r.parent) : undefined} onEdit={() => setEditing(r)} onDelete={() => start(async () => {
                if (!window.confirm(`Delete category “${r.name}”?`)) return;
                const res = await deleteCategory(r._id);
                if (res.ok) {
                  toast.success(res.message);
                  setRows((x) => x.filter((y) => y._id !== r._id));
                } else toast.error(res.error);
              })} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null ? (
          <DialogContent title={editing === "new" ? "New category" : `Edit ${editing.name}`}>
            <CategoryForm
              row={editing === "new" ? undefined : editing}
              parents={rows.filter((r) => !r.parent && (editing === "new" || r._id !== editing._id))}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

function SortableRow({ row, parentName, onEdit, onDelete }: { row: Row; parentName?: string; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row._id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 border-b border-rule bg-paper px-3 py-2 last:border-b-0">
      <button {...attributes} {...listeners} className="cursor-grab p-1" aria-label={`Reorder ${row.name}`}>
        <GripVertical size={16} />
      </button>
      <span className="relative h-10 w-14 shrink-0 border border-ink bg-paper-2">{row.image ? <SafeImage src={row.image.url} alt="" fill sizes="56px" className="object-cover" /> : null}</span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{parentName ? <span className="text-graphite">{parentName} › </span> : null}{row.name}</span>
        <span className="block font-mono text-[11px] text-graphite">/shop/{row.slug}</span>
      </span>
      <span className="font-mono text-xs">{row.count} lots</span>
      {row.isActive ? <Badge tone="moss">Active</Badge> : <Badge>Hidden</Badge>}
      <Button size="sm" variant="outline" onClick={onEdit}>
        Edit
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete}>
        Delete
      </Button>
    </li>
  );
}

function CategoryForm({ row, parents, onDone }: { row?: Row; parents: Row[]; onDone: () => void }) {
  const [image, setImage] = useState<UploadedFile[]>(row?.image ? [row.image] : []);
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: row?.name ?? "", slug: row?.slug ?? "", description: row?.description ?? "", image: null, parent: row?.parent ?? "", isActive: row?.isActive ?? true },
  });
  const e = form.formState.errors;
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await saveCategory({ ...v, image: image[0] ? { url: image[0].url, key: image[0].key } : null }, row?._id);
        if (r.ok) {
          toast.success(r.message);
          onDone();
        } else toast.error(r.error);
      })}
    >
      <Field label="Name" htmlFor="c-name" error={e.name?.message}>
        <Input id="c-name" {...form.register("name")} />
      </Field>
      <Field label="Slug (auto if blank)" htmlFor="c-slug" error={e.slug?.message}>
        <Input id="c-slug" className="font-mono" {...form.register("slug")} />
      </Field>
      <Field label="Parent (for subcategories)" htmlFor="c-parent">
        <Select id="c-parent" {...form.register("parent")}>
          <option value="">— Top level —</option>
          {parents.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description" htmlFor="c-desc">
        <Textarea id="c-desc" {...form.register("description")} />
      </Field>
      <Field label="Image">
        <Uploader endpoint="categoryImage" value={image} onChange={setImage} max={1} />
      </Field>
      <Checkbox id="c-active" {...form.register("isActive")} label="Visible in shop" />
      <Button type="submit" loading={form.formState.isSubmitting}>
        Save
      </Button>
    </form>
  );
}
