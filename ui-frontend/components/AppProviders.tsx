"use client";

import { Suspense } from "react";
import { AuthProvider } from "./AuthProvider";
import Noise from "./common/Noise";
import { TooltipProvider } from "./common/ToolTip";
import TourComponent from "./onboarding/TourComponent";
import { TourProvider } from "./onboarding/TourContext";
import TourTrigger from "./onboarding/TourTrigger";
import WelcomeBanner from "./onboarding/WelcomeBanner";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "~~/config/wagmi";
import { getQueryClient } from "~~/utils/getQueryClient";

const queryClient = getQueryClient();

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthProvider>
        <TourProvider>
          <TooltipProvider delayDuration={0}>
            <ProgressBar height="3px" color="#C2FF2C" />
            <WelcomeBanner />
            {children}
            <TourComponent />
            <TourTrigger />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "hsl(var(--color-primary-500))",
                  color: "hsl(var(--color-white))",
                  border: "1px solid rgba(255,255,255,0.1)",
                  overflow: "hidden",
                  fontSize: "1.2rem",
                  fontWeight: "500",
                  lineHeight: "150%",
                },
              }}
            />
            <Noise />
          </TooltipProvider>
        </TourProvider>
      </AuthProvider>
    </Suspense>
  );
}

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppShell>{children}</AppShell>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
