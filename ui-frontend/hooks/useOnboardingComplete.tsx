"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const useOnboardingComplete = () => {
  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if user just completed onboarding and is now on platform
    const hasCompletedOnboarding = document.cookie.includes("hasSeenOnboarding=true");
    const isOnPlatformPage =
      pathname === "/" ||
      pathname.startsWith("/tokens") ||
      pathname.startsWith("/leaderboards") ||
      pathname.startsWith("/guide");
    const hasSeenPlatformWelcome = localStorage.getItem("cult-platform-welcome-shown");

    // If user completed onboarding, is on platform, but hasn't seen platform welcome
    if (hasCompletedOnboarding && isOnPlatformPage && !hasSeenPlatformWelcome) {
      setJustCompletedOnboarding(true);
      // Mark that we've shown the platform welcome
      localStorage.setItem("cult-platform-welcome-shown", "true");
    }
  }, [pathname]);

  return { justCompletedOnboarding };
};
