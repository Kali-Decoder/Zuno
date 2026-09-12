"use client";

import { Suspense, type ReactNode } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./AuthProvider";
import Noise from "./common/Noise";
import { TooltipProvider } from "./common/ToolTip";
import TourComponent from "./onboarding/TourComponent";
import { TourProvider } from "./onboarding/TourContext";
import TourTrigger from "./onboarding/TourTrigger";
import WelcomeBanner from "./onboarding/WelcomeBanner";
import { arcTestnet } from "~~/config/chains";
import { wagmiConfig } from "~~/config/wagmi";
import { getQueryClient } from "~~/utils/getQueryClient";

const queryClient = getQueryClient();

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

const privyConfig: PrivyClientConfig = {
  loginMethods: ["wallet", "email", "google"],
  appearance: {
    theme: "dark",
    accentColor: "#C2FF2C",
    logo: "/zuno-logo.png",
    walletList: ["detected_wallets", "metamask", "rabby_wallet", "coinbase_wallet", "wallet_connect"],
  },
  defaultChain: arcTestnet,
  supportedChains: [arcTestnet],
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
};

function AppShell({ children }: { children: ReactNode }) {
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

export const AppProviders = ({ children }: { children: ReactNode }) => {
  if (!privyAppId) {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID is missing — wallet login will not work.");
  }

  return (
    <PrivyProvider appId={privyAppId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <AppShell>{children}</AppShell>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
};
