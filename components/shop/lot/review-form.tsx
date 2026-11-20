"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { reviewSchema } from "@/lib/validations/common";
import { submitReview } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Uploader, type UploadedFile } from "@/components/ui/uploader";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, canAddPhotos }: { productId: string; canAddPhotos: boolean }) {
  const [done, setDone] = useState(false);
  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const form = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: { productId, rating: 5, title: "", body: "", photos: [] },
  });
  const rating = form.watch("rating");
  const { errors, isSubmitting } = form.formState;

  if (done) return <p className="border border-moss p-4 text-sm text-moss">Thanks — your review is awaiting moderation.</p>;

  return (
    <form
      className="space-y-4 border border-ink p-5"
      onSubmit={form.handleSubmit(async (values) => {
        const r = await submitReview({ ...values, photos });
        if (r.ok) {
          toast.success(r.message);
          setDone(true);
        } else toast.error(r.error);
      })}
    >
      <p className="font-display text-2xl">Write a review</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => form.setValue("rating", n)}
          >
            <Star size={22} className={cn(n <= Number(rating) ? "fill-signal text-ink" : "text-rule")} />
          </button>
        ))}
      </div>
      <Field label="Title" htmlFor="rv-title" error={errors.title?.message}>
        <Input id="rv-title" {...form.register("title")} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Your review" htmlFor="rv-body" error={errors.body?.message}>
        <Textarea id="rv-body" {...form.register("body")} aria-invalid={!!errors.body} placeholder="Was it the size and grade described? What did you make?" />
      </Field>
      {canAddPhotos ? (
        <Field label="Photos (verified buyers, up to 3)">
          <Uploader endpoint="reviewPhotos" value={photos} onChange={setPhotos} max={3} />
        </Field>
      ) : null}
      <Button type="submit" loading={isSubmitting}>
        Submit review
      </Button>
    </form>
  );
}
