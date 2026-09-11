import React from "react";
import { cn } from "~~/lib/utils";

/** Reflow mark — recycling loop (liquidity that flows back) */
export const LogoMark = ({ className }: { className?: string }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("shrink-0", className)}
    aria-hidden
  >
    <rect width="32" height="32" rx="9" fill="#C2FF2C" />
    {/* Outer recirculating arcs */}
    <path
      d="M9.5 18.2C10.2 21.1 12.8 23.2 16 23.2C19.6 23.2 22.5 20.6 23.2 17.2"
      stroke="#0A0A0A"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M22.5 13.8C21.8 10.9 19.2 8.8 16 8.8C12.4 8.8 9.5 11.4 8.8 14.8"
      stroke="#0A0A0A"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Flow arrows */}
    <path d="M21.2 15.2L23.4 17.4L25.2 14.8" stroke="#0A0A0A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.8 16.8L8.6 14.6L6.8 17.2" stroke="#0A0A0A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Reflow wordmark — interactive brand lockup */
export const LogoLightTextSvg = ({ className }: { className?: string }) => {
  return (
    <span
      className={cn(
        "group/logo inline-flex items-center gap-[0.85rem] select-none leading-none",
        className,
      )}
      aria-label="Reflow"
    >
      <span className="relative grid place-content-center transition-transform duration-300 ease-out group-hover/logo:rotate-[-8deg] group-hover/logo:scale-105">
        <LogoMark className="size-[2.4rem] sm:size-[2.8rem]" />
        <span className="pointer-events-none absolute inset-0 rounded-[0.9rem] bg-accent-500/0 blur-md transition-all duration-300 group-hover/logo:bg-accent-500/35" />
      </span>
      <span className="flex flex-col gap-[0.2rem]">
        <span className="font-area text-[2.1rem] font-black tracking-[-0.04em] text-white sm:text-[2.5rem]">
          Re
          <span className="text-accent-500 transition-colors duration-300 group-hover/logo:text-[#d6ff6a]">flow</span>
        </span>
        <span className="hidden font-sans text-[1rem] font-medium tracking-[0.14em] text-white/30 uppercase transition-colors duration-300 group-hover/logo:text-white/50 sm:block">
          recycle · relaunch
        </span>
      </span>
    </span>
  );
};
