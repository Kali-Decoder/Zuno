"use client";

import React from "react";
import Image from "next/image";
import { cn } from "~~/lib/utils";

export const ZUNO_LOGO_SRC = "/zuno-logo.png";
/** Arc Testnet / native USDC mark used on swap panels */
export const ARC_CHAIN_LOGO_SRC = "/arc-chain.jpg";

/**
 * ZUNO mark — brand PNG only (no glow / gradient).
 */
export const LogoMark = ({
  className,
  alt = "",
  priority = false,
}: {
  className?: string;
  alt?: string;
  priority?: boolean;
}) => (
  <Image
    src={ZUNO_LOGO_SRC}
    alt={alt}
    width={48}
    height={48}
    priority={priority}
    className={cn("shrink-0 object-contain", className)}
  />
);

/**
 * Interactive ZUNO.FUN lockup for nav / hero.
 * Mark sized to wordmark cap-height; hover tilts mark + brightens .FUN.
 */
export const LogoLightTextSvg = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "group/logo inline-flex items-center gap-[0.5rem] select-none leading-none sm:gap-[0.6rem]",
      className,
    )}
    aria-label="ZUNO.FUN"
  >
    <span className="relative grid size-[1.9rem] place-content-center overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform group-hover/logo:-rotate-[14deg] group-hover/logo:scale-110 group-active/logo:scale-90 sm:size-[2.1rem]">
      <LogoMark priority className="size-full scale-[1.2]" />
    </span>
    <span className="font-area text-[1.7rem] font-black tracking-[-0.055em] transition-[letter-spacing] duration-300 group-hover/logo:tracking-[-0.02em] sm:text-[1.95rem]">
      <span className="inline-block text-white transition-transform duration-300 ease-out group-hover/logo:-translate-y-[1.5px] group-hover/logo:scale-[1.02]">
        ZUNO
      </span>
      <span className="inline-block text-accent-500 transition-[transform,color] duration-300 ease-out group-hover/logo:translate-y-[1.5px] group-hover/logo:scale-[1.04] group-hover/logo:text-[#d4ff4a]">
        .FUN
      </span>
    </span>
  </span>
);

/** Compact footer / inline lockup */
export const LogoWordmark = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "group/logo inline-flex items-center gap-[0.45rem] select-none leading-none",
      className,
    )}
    aria-label="ZUNO.FUN"
  >
    <span className="grid size-[1.7rem] place-content-center overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/logo:-rotate-[14deg] group-hover/logo:scale-110 group-active/logo:scale-90">
      <LogoMark className="size-full scale-[1.2]" />
    </span>
    <span className="font-area text-[1.6rem] font-black tracking-[-0.04em] transition-[letter-spacing] duration-300 group-hover/logo:tracking-[-0.02em]">
      <span className="text-white">ZUNO</span>
      <span className="text-accent-500 transition-colors duration-300 group-hover/logo:text-[#d4ff4a]">.FUN</span>
    </span>
  </span>
);
