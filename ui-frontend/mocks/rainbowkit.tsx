"use client";

import React from "react";

export type AvatarComponent = React.FC<{ address?: string; ensImage?: string | null; size: number }>;

export function ConnectButton(_props?: unknown) {
  return null;
}

ConnectButton.Custom = function Custom({ children }: { children: (props: any) => React.ReactNode }) {
  return (
    <>
      {children({
        account: undefined,
        chain: undefined,
        openAccountModal: () => undefined,
        openChainModal: () => undefined,
        openConnectModal: () => undefined,
        authenticationStatus: "unauthenticated",
        mounted: true,
      })}
    </>
  );
};
