"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider, useToastContext } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { WalletProvider } from "./contexts/WalletContext";

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <WalletProvider>
          {children}
          <ToastContainerWrapper />
        </WalletProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
