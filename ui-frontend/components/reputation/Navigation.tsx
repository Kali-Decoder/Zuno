"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "../wallet/WalletButton";
import { LogoLightTextSvg } from "~~/icons/logos";
import { cn } from "~~/lib/utils";

const navItems = [
  { href: "/", label: "Explore" },
  { href: "/launch", label: "Launch" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/guide", label: "Guide" },
];

function NavPills({
  showTourHint,
  className,
}: {
  showTourHint: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));
  const containerRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const activeIndex = Math.max(
    0,
    navItems.findIndex(({ href }) => isActive(href)),
  );

  const updateIndicator = () => {
    const el = itemRefs.current[activeIndex];
    const parent = containerRef.current;
    if (!el || !parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setIndicator({
      left: rect.left - parentRect.left + parent.scrollLeft,
      width: rect.width,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, activeIndex]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener("resize", onResize);
    const parent = containerRef.current;
    parent?.addEventListener("scroll", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      parent?.removeEventListener("scroll", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <nav
      ref={containerRef}
      className={cn(
        "relative inline-flex max-w-full items-center gap-[0.2rem] overflow-x-auto rounded-full border border-white/[0.06] bg-[#141414] p-[0.4rem] scrollbar-none",
        className,
      )}
      aria-label="Primary"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-[0.4rem] bottom-[0.4rem] rounded-full bg-accent-500/15 ring-1 ring-accent-500/25 transition-all duration-300 ease-out",
          indicator.ready ? "opacity-100" : "opacity-0",
        )}
        style={{ left: indicator.left, width: indicator.width }}
      />

      {navItems.map(({ href, label }, index) => {
        const active = isActive(href);
        const isGuide = href === "/guide";

        return (
          <Link
            key={href}
            href={href}
            ref={node => {
              itemRefs.current[index] = node;
            }}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => {
              const el = itemRefs.current[index];
              const parent = containerRef.current;
              if (!el || !parent) return;
              const parentRect = parent.getBoundingClientRect();
              const rect = el.getBoundingClientRect();
              setIndicator({
                left: rect.left - parentRect.left + parent.scrollLeft,
                width: rect.width,
                ready: true,
              });
            }}
            onMouseLeave={updateIndicator}
            className={cn(
              "relative z-10 shrink-0 rounded-full px-[1.5rem] py-[0.95rem] text-[1.3rem] font-semibold leading-none transition-colors duration-200 sm:px-[1.9rem] sm:py-[1.1rem] sm:text-[1.45rem]",
              active ? "text-accent-500" : "text-white/45 hover:text-white",
            )}
          >
            {label}
            {isGuide && showTourHint && (
              <span className="pointer-events-none absolute right-[0.55rem] top-[0.45rem]">
                <span className="block size-[0.55rem] animate-pulse rounded-full bg-accent-500" />
                <span className="absolute inset-0 size-[0.55rem] animate-ping rounded-full bg-accent-500/40" />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

const Navigation = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [showTourHint, setShowTourHint] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const hasCompletedOnboarding = document.cookie.includes("hasSeenOnboarding=true");
    const tourState = localStorage.getItem("cult-tour-state");
    const welcomeBannerSeen = localStorage.getItem("cult-welcome-banner-seen");
    const isOnPlatformPage = pathname.startsWith("/") && !pathname.includes("/onboarding");

    if (hasCompletedOnboarding && isOnPlatformPage && !tourState && welcomeBannerSeen) {
      setShowTourHint(true);
      const timer = setTimeout(() => setShowTourHint(false), 15000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300",
          scrolled
            ? "border-b border-white/[0.06] bg-black/70 backdrop-blur-xl backdrop-saturate-150"
            : "border-b border-transparent bg-gradient-to-b from-black/50 to-transparent",
        )}
      >
        <div className="page-container flex h-[7.2rem] items-center justify-between gap-[1.2rem] sm:h-[8rem]">
          <Link
            href="/"
            aria-label="Reflow home"
            className="shrink-0 rounded-xl outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-accent-500/50"
          >
            <LogoLightTextSvg />
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center md:flex lg:justify-center">
            <NavPills showTourHint={showTourHint} />
          </div>

          <div className="shrink-0">
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="h-[7.2rem] sm:h-[8rem]" aria-hidden />

      {/* Mobile nav */}
      <div className="page-container mb-[1.6rem] mt-8 md:hidden">
        <NavPills showTourHint={showTourHint} className="w-full justify-start" />
      </div>

      <div className="mb-[1.6rem] hidden md:block sm:mb-[2.4rem]" aria-hidden />
    </>
  );
};

export default Navigation;
