import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Hard-edged buttons. `signal` (hazard orange) is reserved for primary commerce CTAs. */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border font-mono text-xs uppercase tracking-spec transition-[transform,box-shadow,background-color,border-color,color] duration-150 disabled:pointer-events-none disabled:opacity-50 active:translate-x-0 active:translate-y-0 active:shadow-none",
  {
    variants: {
      variant: {
        ink: "border-ink bg-ink text-paper hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[2px_2px_0_0_rgb(var(--signal))]",
        signal:
          "border-ink bg-signal font-bold text-signal-ink hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-stamp-sm",
        outline: "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
        ghost: "border-transparent bg-transparent text-ink hover:border-rule hover:bg-paper-2",
        danger: "border-ink bg-oxide text-paper hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-stamp-sm",
        link: "border-transparent p-0 text-ink underline decoration-signal underline-offset-4 hover:decoration-2",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-sm",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "ink", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? <span className="inline-block h-3 w-3 animate-spin border border-current border-t-transparent" aria-hidden /> : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
