"use client";

import { Suspense } from "react";
import { AuthProvider } from "./AuthProvider";
import Noise from "./common/Noise";
import { TooltipProvider } from "./common/ToolTip";
import TourComponent from "./onboarding/TourComponent";
import { TourProvider } from "./onboarding/TourContext";
import TourTrigger from "./onboarding/TourTrigger";
import WelcomeBanner from "./onboarding/WelcomeBanner";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { monadTestnet } from "~~/config/chains";
import { wagmiConfig } from "~~/config/wagmi";
import { isPrivyConfigured, PRIVY_APP_ID } from "~~/lib/privy";
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
  if (!isPrivyConfigured) {
    if (typeof window !== "undefined") {
      console.warn("Missing NEXT_PUBLIC_PRIVY_APP_ID — set it in .env.local to enable Connect.");
    }
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <AppShell>{children}</AppShell>
        </WagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#C2FF2C",
          logo: "/gmonad.jpeg",
          showWalletLoginFirst: false,
        },
        // Keep methods that work without extra OAuth dashboard setup by default
        loginMethods: ["email", "google"],
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={wagmiConfig}>
          <AppShell>{children}</AppShell>
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
};
