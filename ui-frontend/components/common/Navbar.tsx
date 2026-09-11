"use client";

import { usePathname } from "next/navigation";
import HoverButton from "./HoverButton";
import { NavigationItem } from "~~/types/types";

function Nabar({ navItems, className }: { navItems: NavigationItem[]; className?: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };
  return (
    <div className={`flex gap-[0.8rem] md:gap-[2.4rem] ${className}`}>
      {navItems.map(({ id, href, label }) => (
        <HoverButton
          isLink
          href={href}
          key={id}
          className={`${isActive(href) ? "text-white-500" : "text-white/60"} sm:font-medium bg-transparent p-0 hover:bg-transparent md:p-0`}
        >
          {label}
        </HoverButton>
      ))}
    </div>
  );
}

export default Nabar;
