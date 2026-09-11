"use client";

import React, { useEffect, useState } from "react";
import HoverButton from "../common/HoverButton";
import { useTour } from "./TourContext";
import { Sparkles, X } from "lucide-react";
import { useOnboardingComplete } from "~~/hooks/useOnboardingComplete";

const WelcomeBanner: React.FC = () => {
  const { restartTour, tourState } = useTour();
  const { justCompletedOnboarding } = useOnboardingComplete();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Show banner only for users who just completed onboarding and reached platform
    const hasSeenWelcome = localStorage.getItem("cult-welcome-banner-seen");
    const hasCompletedTour = localStorage.getItem("cult-tour-state");

    if (justCompletedOnboarding && !hasSeenWelcome && !hasCompletedTour) {
      // Small delay to let page load and feel natural
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [justCompletedOnboarding]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem("cult-welcome-banner-seen", "true");
    }, 300);
  };

  const handleTakeTour = () => {
    handleClose();
    setTimeout(() => {
      restartTour();
    }, 400);
  };

  // Don't show if tour is active or banner is not visible
  if (!isVisible || tourState.isActive) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${isClosing ? "translate-y-[-100%] opacity-0" : "translate-y-0 opacity-100"}`}
    >
      <div className="bg-gradient-to-r from-accent-500/8 via-accent-500/4 to-accent-500/8 border-b border-accent-500/15 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                <p className="text-white font-medium text-sm">
                  Welcome to <span className="text-accent-500">Reflow</span>
                </p>
                <p className="text-white/60 text-xs sm:text-sm">Take our quick tour to get started</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTakeTour}
                className="bg-accent-500/20 hover:bg-accent-500 text-accent-500 hover:text-black border border-accent-500/30 hover:border-accent-500 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105"
              >
                Start Tour
              </button>
              <button
                onClick={handleClose}
                className="p-1 text-white/50 hover:text-white/70 hover:bg-white/5 rounded-md transition-colors"
                aria-label="Close welcome banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
