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
          "relative overflow-hidden",
          "text-white font-semibold",
          "border border-white/20",
          "backdrop-blur-sm",
          "shadow-[0_0_15px_rgba(0,113,227,0.3)] hover:shadow-[0_0_25px_rgba(0,113,227,0.5)]",
          "bg-primary/80",
          "before:absolute before:inset-0 before:-z-10",
          "before:bg-[linear-gradient(135deg,rgba(0,113,227,0.9),rgba(88,86,214,0.9),rgba(0,199,190,0.9),rgba(0,113,227,0.9))]",
          "before:bg-[length:300%_300%]",
          "before:animate-glass-gradient",
          "after:absolute after:inset-0 after:-z-10",
          "after:bg-white/5",
          "hover:border-white/30",
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
