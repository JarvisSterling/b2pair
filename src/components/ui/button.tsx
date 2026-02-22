import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap",
    "text-body font-medium",
    "transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "shadow-sm hover:shadow-md",
          "hover:brightness-110",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "border border-border",
          "hover:bg-secondary/80 hover:border-border-strong",
        ].join(" "),
        outline: [
          "border border-border bg-transparent",
          "text-foreground",
          "hover:bg-secondary hover:border-border-strong",
        ].join(" "),
        ghost: [
          "text-foreground",
          "hover:bg-secondary",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-sm hover:shadow-md",
          "hover:brightness-110",
        ].join(" "),
        link: [
          "text-primary underline-offset-4",
          "hover:underline",
        ].join(" "),
      },
      size: {
        sm: "h-9 rounded-sm px-3 text-caption",
        default: "h-10 rounded px-5 text-body",
        lg: "h-12 rounded-md px-6 text-body",
        icon: "h-10 w-10 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
