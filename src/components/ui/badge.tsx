import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center",
    "rounded-full border px-2.5 py-0.5",
    "text-small font-medium",
    "transition-colors duration-150 ease-out",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-950 text-emerald-400",
        secondary:
          "border-transparent bg-zinc-800 text-zinc-400",
        outline:
          "border-border text-foreground",
        success:
          "border-transparent bg-emerald-950 text-emerald-400",
        warning:
          "border-transparent bg-amber-950 text-amber-400",
        destructive:
          "border-transparent bg-red-950 text-red-400",
        blue:
          "border-transparent bg-blue-950 text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
