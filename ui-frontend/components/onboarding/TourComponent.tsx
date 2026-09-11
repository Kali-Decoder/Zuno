"use client";

import React, { useEffect } from "react";
import { useTour } from "./TourContext";
import { tourSteps, tourStyles } from "./TourSteps";
import Joyride, { CallBackProps, EVENTS, STATUS } from "react-joyride";

const TourComponent: React.FC = () => {
  const { tourState, setTourStep, completeTour, skipTour } = useTour();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;
    console.log("Tour callback:", { status, type, index });

    if (type === EVENTS.STEP_AFTER) {
      setTourStep(index + 1);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log("Tour completed or skipped");
      completeTour();
    }

    // Handle special navigation steps
    if (index === 6 && type === EVENTS.STEP_AFTER) {
      // Navigate to leaderboards page if needed
      // This would be handled by your routing system
    }
  };

  // Add CSS classes to elements for tour targeting
  useEffect(() => {
    if (tourState.isActive) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Add targeting classes to elements
        const checkEligibilityBtn = document.querySelector('[data-tour="check-eligibility"]');
        if (checkEligibilityBtn) {
          checkEligibilityBtn.classList.add("check-eligibility-button");
        }

        // Add classes to token cards
        const tokenCards = document.querySelectorAll('[data-tour="token-card"]');
        tokenCards.forEach((card, index) => {
          card.classList.add("token-card");
          if (index === 0) {
            // Find phase indicator and buttons within first card
            const phaseIndicator = card.querySelector('[data-tour="phase-indicator"]');
            if (phaseIndicator) {
              phaseIndicator.classList.add("token-phase-indicator");
            }

            const buttons = card.querySelector('[data-tour="card-buttons"]');
            if (buttons) {
              // Check if it's prebuy or live stage
              const stage = card.getAttribute("data-stage");
              if (stage === "Prebuy") {
                buttons.classList.add("prebuy-stage-buttons");
              } else {
                buttons.classList.add("live-stage-buttons");
              }
              // Always add the combined class for targeting
              buttons.classList.add("token-stage-buttons");
            }
          }
        });

        // Add class to leaderboard link
        const leaderboardLink = document.querySelector('[data-tour="leaderboard-link"]');
        if (leaderboardLink) {
          leaderboardLink.classList.add("leaderboard-link");
        }
      }, 100);

      return () => clearTimeout(timer);
    }

    return () => {
      // Cleanup classes when tour ends
      document
        .querySelectorAll(
          ".check-eligibility-button, .token-card, .token-phase-indicator, .prebuy-stage-buttons, .live-stage-buttons, .token-stage-buttons, .leaderboard-link",
        )
        .forEach(el => {
          el.classList.remove(
            "check-eligibility-button",
            "token-card",
            "token-phase-indicator",
            "prebuy-stage-buttons",
            "live-stage-buttons",
            "token-stage-buttons",
            "leaderboard-link",
          );
        });
    };
  }, [tourState.isActive]);

  if (!tourState.isActive) {
    return null;
  }

  return (
    <Joyride
      steps={tourSteps}
      run={tourState.isActive}
      stepIndex={tourState.currentStep}
      callback={handleJoyrideCallback}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      styles={tourStyles}
      locale={{
        back: "BACK",
        close: "CLOSE",
        last: "FINISH",
        next: "NEXT",
        skip: "SKIP TOUR",
      }}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
        styles: {
          arrow: {
            length: 8,
            spread: 16,
          },
        },
      }}
      disableOverlayClose={false}
      disableScrollParentFix={true}
      spotlightClicks={true}
      hideCloseButton={false}
      disableScrolling={false}
      scrollToFirstStep={true}
      scrollOffset={100}
      spotlightPadding={4}
    />
  );
};

export default TourComponent;
