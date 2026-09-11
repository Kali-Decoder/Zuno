"use client";

import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";

interface TourState {
  isActive: boolean;
  currentStep: number;
  hasCompletedTour: boolean;
  isFirstVisit: boolean;
}

interface TourContextType {
  tourState: TourState;
  startTour: () => void;
  skipTour: () => void;
  restartTour: () => void;
  setTourStep: (step: number) => void;
  completeTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [tourState, setTourState] = useState<TourState>({
    isActive: false,
    currentStep: 0,
    hasCompletedTour: false,
    isFirstVisit: true,
  });

  // Load tour state from localStorage on mount
  useEffect(() => {
    const savedTourState = localStorage.getItem("cult-tour-state");
    const hasCompletedOnboarding = document.cookie.includes("hasSeenOnboarding=true");
    const isOnPlatformPage =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/") &&
      !window.location.pathname.includes("/onboarding");

    if (savedTourState) {
      const parsed = JSON.parse(savedTourState);
      setTourState(prev => ({
        ...prev,
        hasCompletedTour: parsed.hasCompletedTour || false,
        isFirstVisit: parsed.isFirstVisit || false,
      }));
    } else if (hasCompletedOnboarding && isOnPlatformPage) {
      // User completed onboarding but no tour state exists = first platform visit
      setTourState(prev => ({
        ...prev,
        isFirstVisit: true,
        hasCompletedTour: false,
      }));
    }
  }, []);

  // Auto-start tour for users who completed onboarding and are on platform pages
  useEffect(() => {
    const hasCompletedOnboarding = document.cookie.includes("hasSeenOnboarding=true");
    const hasSeenWelcome = localStorage.getItem("cult-welcome-banner-seen");
    const isOnPlatformPage =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/") &&
      !window.location.pathname.includes("/onboarding");

    // Only auto-start if:
    // 1. User completed the 3-screen onboarding
    // 2. They're on a platform page (not onboarding)
    // 3. It's their first visit to the platform
    // 4. They haven't completed the tour
    // 5. They haven't seen the welcome banner (fallback)
    if (
      hasCompletedOnboarding &&
      isOnPlatformPage &&
      tourState.isFirstVisit &&
      !tourState.hasCompletedTour &&
      !hasSeenWelcome
    ) {
      // Longer delay to let welcome banner show first
      const timer = setTimeout(() => {
        // Double-check they haven't dismissed the banner or started tour manually
        const currentWelcomeState = localStorage.getItem("cult-welcome-banner-seen");
        if (!currentWelcomeState) {
          console.log("Auto-starting platform tour after onboarding completion");
          startTour();
        }
      }, 6000); // 6 seconds to give time for welcome banner interaction
      return () => clearTimeout(timer);
    }
  }, [tourState.isFirstVisit, tourState.hasCompletedTour]);

  const saveTourState = (newState: Partial<TourState>) => {
    const updatedState = { ...tourState, ...newState };
    localStorage.setItem(
      "cult-tour-state",
      JSON.stringify({
        hasCompletedTour: updatedState.hasCompletedTour,
        isFirstVisit: updatedState.isFirstVisit,
      }),
    );
    setTourState(updatedState);
  };

  const startTour = () => {
    console.log("Starting tour...");
    setTourState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
    }));
  };

  const skipTour = () => {
    console.log("Tour skipped by user");
    saveTourState({
      isActive: false,
      hasCompletedTour: true, // Mark as completed even if skipped
      isFirstVisit: false,
    });

    // Also mark welcome banner as seen if user skips tour
    localStorage.setItem("cult-welcome-banner-seen", "true");
  };

  const restartTour = () => {
    console.log("Restarting tour...");
    setTourState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
    }));
  };

  const setTourStep = (step: number) => {
    setTourState(prev => ({
      ...prev,
      currentStep: step,
    }));
  };

  const completeTour = () => {
    console.log("Tour completed successfully");
    saveTourState({
      isActive: false,
      hasCompletedTour: true,
      isFirstVisit: false,
    });

    // Also mark welcome banner as seen if user completes tour
    localStorage.setItem("cult-welcome-banner-seen", "true");
  };

  return (
    <TourContext.Provider
      value={{
        tourState,
        startTour,
        skipTour,
        restartTour,
        setTourStep,
        completeTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};
