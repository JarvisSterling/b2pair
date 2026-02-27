import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center",
    "rounded-full border px-2 py-px",
    "text-[10px] font-medium",
    "transition-colors duration-150 ease-out",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-emerald-800 bg-emerald-950 text-emerald-400",
        secondary:
          "border-zinc-700 bg-zinc-800 text-zinc-400",
        outline:
          "border-border text-foreground",
        success:
          "border-emerald-800 bg-emerald-950 text-emerald-400",
        warning:
          "border-amber-800 bg-amber-950 text-amber-400",
        destructive:
          "border-red-800 bg-red-950 text-red-400",
        blue:
          "border-blue-800 bg-blue-950 text-blue-400",
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
