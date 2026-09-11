"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "~~/lib/utils";

const buttonVariants = cva(
  "inline-flex font-mono text-[0.8rem] sm:text-[1rem] md:text-[1.4rem] items-center justify-center uppercase gap-2 whitespace-nowrap rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:bg-white/20 disabled:cursor-not-allowed [&_svg]:pointer-events-none leading-none",
  {
    variants: {
      variant: {
        default: "bg-accent-500 text-primary-800 hover:bg-accent-600",
        destructive: "bg-white bg-danger-500  hover:bg-destructive/90",
        outline: "border border-white/10 hover:bg-white/10 text-white disabled:text-black/80 disabled:border-0",
        secondary:
          "bg-primary-800 hover:bg-primary-800/60 text-white py-[0.8rem]  rounded-full transition-colors w-full",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "py-[0.6rem] px-[1rem] sm:py-[0.8rem] md:py-[1.2rem] md:px-[1.6rem] w-fit h-auto rounded-full",
        sm: "h-auto text-[1rem] md:text-[1.2rem] rounded-full py-[0.4rem] px-[1.2rem]",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
