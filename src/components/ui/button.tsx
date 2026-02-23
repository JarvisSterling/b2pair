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
          "relative overflow-hidden isolate",
          "!text-white font-semibold tracking-wide",
          "border border-white/25",
          "backdrop-blur-xl",
          "bg-white/[0.08]",
          "shadow-[0_0_20px_rgba(0,113,227,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:shadow-[0_0_30px_rgba(0,113,227,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]",
          "before:absolute before:inset-0 before:-z-10 before:rounded-[inherit]",
          "before:bg-[linear-gradient(135deg,#0071E3,#5856D6,#00C7BE,#5856D6,#0071E3)]",
          "before:bg-[length:400%_400%]",
          "before:animate-glass-gradient",
          "before:opacity-70",
          "after:absolute after:inset-0 after:-z-[5] after:rounded-[inherit]",
          "after:bg-gradient-to-b after:from-white/10 after:to-transparent",
          "hover:border-white/40",
          "hover:before:opacity-85",
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
        sm: "h-9 rounded-lg px-3 text-caption",
        default: "h-10 rounded-xl px-5 text-body",
        lg: "h-12 rounded-xl px-6 text-body",
        icon: "h-10 w-10 rounded-xl",
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
