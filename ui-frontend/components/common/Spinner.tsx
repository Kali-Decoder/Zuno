"use client";

import React from "react";
import Image from "next/image";
import { VariantProps, cva } from "class-variance-authority";
import { cn } from "~~/lib/utils";
import { ZUNO_LOGO_SRC } from "~~/icons/logos";

const spinnerVariants = cva("inline-flex flex-col items-center justify-center", {
  variants: {
    show: {
      true: "flex",
      false: "hidden",
    },
  },
  defaultVariants: {
    show: true,
  },
});

const markVariants = cva("relative inline-grid shrink-0 place-content-center overflow-hidden", {
  variants: {
    size: {
      small: "size-[1.5rem]",
      medium: "size-[2.2rem]",
      large: "size-[3.2rem]",
    },
  },
  defaultVariants: {
    size: "medium",
  },
});

interface SpinnerContentProps extends VariantProps<typeof spinnerVariants>, VariantProps<typeof markVariants> {
  className?: string;
  children?: React.ReactNode;
}

/** Brand spinner — rotating zuno-logo.png */
export function Spinner({ size, show, children, className }: SpinnerContentProps) {
  return (
    <span className={spinnerVariants({ show })}>
      <span className={cn(markVariants({ size }), className)} role="status" aria-label="Loading">
        <Image
          src={ZUNO_LOGO_SRC}
          alt=""
          width={64}
          height={64}
          className="size-full animate-zuno-spin object-contain"
        />
      </span>
      {children}
    </span>
  );
}
