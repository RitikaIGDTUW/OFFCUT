"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { moveSubmission, saveSubmissionNotes, sendOffer } from "@/actions/admin/people";
import { SUBMISSION_STATUS, type SubmissionStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { SafeImage } from "@/components/ui/safe-image";
import { cn, formatDate, formatINR } from "@/lib/utils";

type Card = {
  _id: string;
  material: string;
  supplier: string;
  industry: string;
  description: string;
  approxQuantity: string;
  approxDimensions: string;
  approxWeightKg: number;
  askingPrice: number;
  pickupAddress: string;
  photos: string[];
  status: SubmissionStatus;
  offer: number | null;
  supplierResponse: string | null;
  notes: string;
  linked: number;
  createdAt: string;
};

const COLUMNS: { id: SubmissionStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "reviewing", label: "Reviewing" },
  { id: "offer-sent", label: "Offer sent" },
  { id: "accepted", label: "Accepted" },
  { id: "picked-up", label: "Picked up" },
  { id: "listed", label: "Listed" },
  { id: "rejected", label: "Rejected / declined" },
];

export function SubmissionsKanban({ cards: initial }: { cards: Card[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [open, setOpen] = useState<Card | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const move = (id: string, status: SubmissionStatus) => {
    const card = cards.find((c) => c._id === id);
    if (!card || card.status === status) return;
    if (status === "offer-sent") {
      setOpen(card);
      toast("Enter an offer amount to move this card to “Offer sent”.");
      return;
    }
    const prev = cards;
    setCards((cs) => cs.map((c) => (c._id === id ? { ...c, status } : c))); // optimistic
    start(async () => {
      const r = await moveSubmission(id, status);
      if (!r.ok) {
        setCards(prev);
        toast.error(r.error);
      }
    });
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (e.over) move(String(e.active.id), e.over.id as SubmissionStatus);
  };

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} count={cards.filter((c) => c.status === col.id).length}>
              {cards
                .filter((c) => c.status === col.id)
                .map((c) => (
                  <KanbanCard key={c._id} card={c} onOpen={() => setOpen(c)} onMove={(s) => move(c._id, s)} />
                ))}
            </Column>
          ))}
        </div>
      </DndContext>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open ? (
          <DialogContent title={open.material} description={`${open.supplier} · ${open.industry}`} className="max-w-2xl">
            <CardDetail
              card={open}
              onSaved={() => {
                setOpen(null);
                router.refresh();
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

function Column({ id, label, count, children }: { id: string; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={cn("flex w-72 shrink-0 flex-col border border-ink", isOver ? "bg-signal/10" : "bg-paper-2")} aria-label={`${label} column`}>
      <h2 className="spec flex justify-between border-b border-ink bg-paper px-3 py-2 text-[11px]">
        {label} <span className="font-mono">{count}</span>
      </h2>
      <div className="flex min-h-[200px] flex-col gap-2 p-2">{children}</div>
    </section>
  );
}

function KanbanCard({ card, onOpen, onMove }: { card: Card; onOpen: () => void; onMove: (s: SubmissionStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card._id });
  return (
    <article
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn("border border-ink bg-paper", isDragging && "z-20 shadow-stamp")}
    >
      <div {...listeners} {...attributes} className="cursor-grab p-3" aria-label={`Drag ${card.material}`}>
        {card.photos[0] ? (
          <div className="relative mb-2 aspect-[16/9] border border-ink">
            <SafeImage src={card.photos[0]} alt="" fill sizes="280px" className="object-cover" />
          </div>
        ) : null}
        <p className="text-sm font-medium leading-snug">{card.material}</p>
        <p className="text-xs text-graphite">{card.supplier}</p>
        <p className="spec mt-1 text-[10px] text-graphite">
          {card.approxQuantity} · {formatDate(card.createdAt)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {card.offer ? <Badge tone="signal">Offer {formatINR(card.offer)}</Badge> : null}
          {card.supplierResponse ? <Badge tone={card.supplierResponse === "accepted" ? "moss" : "oxide"}>{card.supplierResponse}</Badge> : null}
          {card.linked ? <Badge tone="moss">{card.linked} lot(s)</Badge> : null}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-rule px-3 py-2">
        <Button size="sm" variant="ghost" onClick={onOpen}>
          Open
        </Button>
        <select value={card.status} onChange={(e) => onMove(e.target.value as SubmissionStatus)} aria-label="Move to column" className="ml-auto h-7 border border-rule bg-paper px-1 text-[11px]">
          {SUBMISSION_STATUS.map((s) => (
            <option key={s} value={s}>
              → {s}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function CardDetail({ card, onSaved }: { card: Card; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(card.offer ?? card.askingPrice ?? ""));
  const [msg, setMsg] = useState("");
  const [notes, setNotes] = useState(card.notes);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-5">
      {card.photos.length ? (
        <div className="flex gap-2 overflow-x-auto">
          {card.photos.map((p) => (
            <a key={p} href={p} target="_blank" rel="noreferrer" className="relative h-28 w-28 shrink-0 border border-ink">
              <SafeImage src={p} alt="" fill sizes="112px" className="object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="spec text-[10px] text-graphite">Quantity</dt>
          <dd>{card.approxQuantity}</dd>
        </div>
        <div>
          <dt className="spec text-[10px] text-graphite">Dimensions</dt>
          <dd>{card.approxDimensions}</dd>
        </div>
        <div>
          <dt className="spec text-[10px] text-graphite">Weight</dt>
          <dd>{card.approxWeightKg ? `${card.approxWeightKg} kg` : "—"}</dd>
        </div>
        <div>
          <dt className="spec text-[10px] text-graphite">Asking</dt>
          <dd>{card.askingPrice ? formatINR(card.askingPrice) : "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="spec text-[10px] text-graphite">Pickup</dt>
          <dd>{card.pickupAddress}</dd>
        </div>
        <div className="col-span-2">
          <dt className="spec text-[10px] text-graphite">Description</dt>
          <dd className="whitespace-pre-line">{card.description}</dd>
        </div>
      </dl>

      {["new", "reviewing", "offer-sent"].includes(card.status) ? (
        <div className="space-y-3 border border-ink p-4">
          <p className="spec text-[10px]">Send offer</p>
          <Field label="Offer amount (₹)" htmlFor="off-amt">
            <Input id="off-amt" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Message" htmlFor="off-msg">
            <Textarea id="off-msg" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Includes free pickup within 7 days." />
          </Field>
          <Button
            variant="signal"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await sendOffer(card._id, Number(amount), msg);
                if (r.ok) {
                  toast.success(r.message);
                  onSaved();
                } else toast.error(r.error);
              })
            }
          >
            Send offer to supplier
          </Button>
        </div>
      ) : null}

      <Field label="Internal notes" htmlFor="sub-notes">
        <Textarea id="sub-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await saveSubmissionNotes(card._id, notes);
              if (r.ok) toast.success(r.message);
              else toast.error(r.error);
            })
          }
        >
          Save notes
        </Button>
        {["accepted", "picked-up", "listed"].includes(card.status) ? (
          <Button asChild>
            <Link href={`/admin/products/new?fromSubmission=${card._id}`}>Convert to lot →</Link>
          </Button>
        ) : null}
        <Select
          aria-label="Move to"
          className="w-48"
          defaultValue=""
          onChange={(e) => {
            const s = e.target.value as SubmissionStatus;
            if (!s) return;
            start(async () => {
              const r = await moveSubmission(card._id, s);
              if (r.ok) onSaved();
              else toast.error(r.error);
            });
          }}
        >
          <option value="">Move to…</option>
          {SUBMISSION_STATUS.filter((s) => s !== "offer-sent").map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
