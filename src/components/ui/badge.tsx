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
          "border-transparent bg-blue text-white",
        secondary:
          "border-border bg-secondary text-muted-foreground",
        outline:
          "border-border text-foreground",
        success:
          "border-transparent bg-success text-white",
        warning:
          "border-transparent bg-orange text-white",
        destructive:
          "border-transparent bg-destructive text-white",
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
