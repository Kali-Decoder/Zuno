"use client";

import React, { useEffect, useState } from "react";
import { useTour } from "./TourContext";
import { HelpCircle, X } from "lucide-react";

const TourTrigger: React.FC = () => {
  const { restartTour, tourState } = useTour();
  const [isHovered, setIsHovered] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Only show trigger on platform pages after onboarding completion
    const hasCompletedOnboarding = document.cookie.includes("hasSeenOnboarding=true");
    const isOnPlatformPage =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/") &&
      !window.location.pathname.includes("/onboarding");

    if (hasCompletedOnboarding && isOnPlatformPage) {
      // Show the trigger after a delay
      const timer = setTimeout(() => {
        setShouldShow(true);
      }, 4000); // Show after 4 seconds on platform pages

      return () => clearTimeout(timer);
    }
  }, []);

  // Don't show trigger when tour is active or if we shouldn't show it yet
  if (tourState.isActive || !shouldShow) {
    return null;
  }

  return (
    <div className="fixed bottom-[1.5rem] right-[1.5rem] z-40">
      <button
        onClick={restartTour}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative bg-white/5 hover:bg-accent-500/20 border border-white/10 hover:border-accent-500/30 text-white/70 hover:text-accent-500 p-[0.75rem] rounded-full transition-all duration-300 hover:scale-105 backdrop-blur-sm"
        title="Take Platform Tour"
        aria-label="Take Platform Tour"
      >
        <HelpCircle className="w-[1.25rem] h-[1.25rem] transition-all duration-300 group-hover:rotate-12" />

        {/* Tooltip */}
        <div
          className={`absolute bottom-full right-0 mb-[0.75rem] transition-all duration-200 ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
        >
          <div className="bg-primary-400 border border-white/10 rounded-md px-[0.75rem] py-[0.5rem] whitespace-nowrap backdrop-blur-sm">
            <p className="text-[0.875rem] text-white font-medium">Platform Tour</p>
            <div className="absolute top-full right-[1rem] w-0 h-0 border-l-[0.375rem] border-r-[0.375rem] border-t-[0.375rem] border-l-transparent border-r-transparent border-t-primary-400"></div>
          </div>
        </div>

        {/* Subtle pulse for new users */}
        {!tourState.hasCompletedTour && (
          <div className="absolute inset-0 rounded-full bg-accent-500/20 animate-pulse"></div>
        )}
      </button>
    </div>
  );
};

export default TourTrigger;
