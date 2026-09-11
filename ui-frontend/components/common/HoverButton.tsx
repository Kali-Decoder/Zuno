"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Button, ButtonProps } from "./button";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "~~/lib/utils";

type HoverButtonProps = ButtonProps & {
  isLink?: boolean;
  href?: string;
  handleOnClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const ease = "secondary";
const duration = 0.3;

const HoverButton = React.forwardRef<HTMLButtonElement, HoverButtonProps>(
  ({ children, className, handleOnClick, isLink = false, href = "#", ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { contextSafe } = useGSAP(
      () => {
        // setup timeline or animation if needed
      },
      {
        scope: containerRef,
      },
    );

    const handleMouseEnter = contextSafe(() => {
      gsap.to(".hover-primary", {
        y: "-100%",
        duration,
        ease,
      });
      gsap.to(".hover-secondary", {
        y: 0,
        duration,
        ease,
      });
    });

    const handleMouseLeave = contextSafe(() => {
      gsap.to(".hover-primary", {
        y: 0,
        duration,
        ease,
      });
      gsap.to(".hover-secondary", {
        y: "100%",
        duration,
        ease,
      });
    });

    const content = (
      <div ref={containerRef}>
        <div className="overflow-hidden">
          <span className="hover-primary inline-block">{children}</span>
        </div>
        <div className="absolute inset-0 m-auto w-fit h-fit overflow-hidden grid place-content-center">
          <span className="hover-secondary inline-block translate-y-full">{children}</span>
        </div>
      </div>
    );

    const sharedProps = {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      className: cn("relative cursor-pointer", className),
    };

    if (isLink) {
      return (
        <Button ref={ref} {...sharedProps} asChild {...props}>
          <Link href={href}>{content}</Link>
        </Button>
      );
    }

    return (
      <Button onClick={handleOnClick} ref={ref} {...sharedProps} {...props}>
        {content}
      </Button>
    );
  },
);

HoverButton.displayName = "HoverButton";

export default HoverButton;
