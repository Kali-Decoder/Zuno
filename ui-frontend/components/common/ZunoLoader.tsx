"use client";

import React from "react";
import Image from "next/image";
import { cn } from "~~/lib/utils";
import { ZUNO_LOGO_SRC } from "~~/icons/logos";

type ZunoLoaderProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  fullScreen?: boolean;
};

const sizeClass = {
  sm: "size-[2.4rem]",
  md: "size-[3.8rem]",
  lg: "size-[5.6rem]",
  xl: "size-[7.2rem]",
} as const;

/** Brand page loader — pulsing zuno-logo.png (no glow / gradient). */
export function ZunoLoader({ className, size = "md", label, fullScreen }: ZunoLoaderProps) {
  const mark = (
    <span className={cn("relative inline-grid place-content-center", sizeClass[size], className)}>
      <Image
        src={ZUNO_LOGO_SRC}
        alt=""
        width={128}
        height={128}
        className="size-full animate-zuno-pulse object-contain"
        priority
      />
      <span className="sr-only">Loading</span>
    </span>
  );

  const wordmark = (
    <p className="font-area text-[1.6rem] font-black tracking-[-0.04em]">
      <span className="text-white">ZUNO</span>
      <span className="text-accent-500">.FUN</span>
    </p>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] grid place-content-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-[1.6rem]">
          {mark}
          {label ? <p className="text-[1.35rem] text-white/65">{label}</p> : wordmark}
        </div>
      </div>
    );
  }

  if (label) {
    return (
      <div className="inline-flex flex-col items-center gap-[0.9rem]">
        {mark}
        <p className="text-[1.25rem] text-white/55">{label}</p>
      </div>
    );
  }

  return mark;
}
