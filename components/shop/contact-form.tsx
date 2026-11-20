"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactSchema } from "@/lib/validations/common";
import { submitContact } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const form = useForm({ resolver: zodResolver(contactSchema), defaultValues: { name: "", email: "", subject: "", message: "" } });
  const e = form.formState.errors;
  if (sent) return <p className="border border-moss p-5 text-moss">Message sent — thank you. We&apos;ll reply within one working day.</p>;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await submitContact(v);
        if (r.ok) setSent(true);
        else toast.error(r.error);
      })}
    >
      <Field label="Name" htmlFor="c-name" error={e.name?.message}>
        <Input id="c-name" autoComplete="name" {...form.register("name")} />
      </Field>
      <Field label="Email" htmlFor="c-email" error={e.email?.message}>
        <Input id="c-email" type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Subject" htmlFor="c-sub" error={e.subject?.message} className="sm:col-span-2">
        <Input id="c-sub" {...form.register("subject")} />
      </Field>
      <Field label="Message" htmlFor="c-msg" error={e.message?.message} className="sm:col-span-2">
        <Textarea id="c-msg" rows={6} {...form.register("message")} />
      </Field>
      <Button type="submit" variant="signal" loading={form.formState.isSubmitting} className="sm:col-span-2 sm:justify-self-start">
        Send message
      </Button>
    </form>
  );
}
