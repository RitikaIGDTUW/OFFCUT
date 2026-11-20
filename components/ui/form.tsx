import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Form primitives — inputs sit on paper with an ink hairline; focus uses the signal ring. */
const field =
  "w-full border border-ink/70 bg-paper px-3 py-2 text-sm text-ink placeholder:text-graphite/70 focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-signal disabled:opacity-60 aria-[invalid=true]:border-oxide";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-10", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, "min-h-[96px]", className)} {...p} />,
);
Textarea.displayName = "Textarea";

/** Native <select> (fully accessible + keyboard friendly), restyled. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...p }, ref) => (
    <select
      ref={ref}
      className={cn(
        field,
        "h-10 appearance-none bg-[length:10px] bg-[right_12px_center] bg-no-repeat pr-8",
        "bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'><path d='M0 0l5 6 5-6z' fill='%235C5A55'/></svg>\")]",
        className,
      )}
      {...p}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export const Label = forwardRef<HTMLLabelElement, LabelPrimitive.LabelProps>(({ className, ...p }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("spec mb-1.5 block text-[11px] text-graphite", className)} {...p} />
));
Label.displayName = "Label";

/** Label + control + error message. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-oxide">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-graphite">{hint}</p>
      ) : null}
    </div>
  );
}

/** Simple styled checkbox (native for accessibility). */
export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }>(
  ({ className, label, id, ...p }, ref) => (
    <label htmlFor={id} className={cn("inline-flex cursor-pointer items-center gap-2 text-sm", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-[#183D35] focus-visible:outline-2 focus-visible:outline-signal"
        {...p}
      />
      {label}
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
