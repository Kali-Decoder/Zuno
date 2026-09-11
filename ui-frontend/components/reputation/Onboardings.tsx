"use client";

import React, { useEffect, useState } from "react";
import Onboarding from "./Onboarding";
import { useRouter } from "next-nprogress-bar";

const ONBOARDINGS = [
  {
    text: "With reputation alone, you can stand out and win. Hold tokens to grow your reputation score: the longer you hold and support the price action, the higher your score climbs. Show your loyalty to ZUNO, and let your on-chain actions speak for you",
    sprite: "sprite-coin",
    imgPos: "right",
  },
  {
    text: "Climb leaderboards by increasing your reputation score. The higher score you get, the better your chances of getting on a diamond hands list that refreshes every day.",
    sprite: "sprite-trophy",
    imgPos: "left",
  },
  {
    text: "Once you exceed a certain reputation, you become a Diamond Hand holder, unlocking early access to tokens before the rest of the world catches on.",
    sprite: "sprite-smile",
    imgPos: "center",
    showFlowchart: true,
  },
];

const Onboardings = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding cookie exists
    const hasSeen = document.cookie.includes("hasSeenOnboarding=true");
    if (!hasSeen) {
      setShowOnboarding(true);
    } else {
      router.push("/"); // Already seen onboarding
    }
  }, [router]);

  const activeOnboarding = ONBOARDINGS[currentStep];

  const handleNextStep = () => {
    if (currentStep === ONBOARDINGS.length - 1) {
      // ✅ Set cookie
      document.cookie = "hasSeenOnboarding=true; path=/; max-age=31536000"; // 1 year
      router.push("/");
      return;
    }

    setIsTransitioning(true);
    setCurrentStep(step => step + 1);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 100); // match any CSS transitions
  };

  return (
    <div>
      {showOnboarding && (
        <Onboarding
          handleNextStep={handleNextStep}
          text={activeOnboarding.text}
          sprite={activeOnboarding.sprite}
          currentStep={currentStep + 1}
          imgPos={activeOnboarding.imgPos}
          showFlowchart={activeOnboarding.showFlowchart}
        />
      )}
      {isTransitioning && <div className="min-h-screen w-full fixed bg-accent-500 z-[999999] top-0"></div>}
    </div>
  );
};

export default Onboardings;
