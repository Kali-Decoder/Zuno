"use client";

import ConnectWalletButton from "../common/ConnectWalletButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../common/DropdownMenu";
import CopyAddressToClipboard from "../common/CopyAddressToClipboard";
import { useAuth } from "../AuthProvider";
import { ChevronDown, Unplug, UserRound } from "lucide-react";
import { useAccount, useBalance, useDisconnect, useSwitchChain } from "wagmi";
import { arcTestnet } from "~~/config/chains";

function WalletButtonInner() {
  const { isValidChain } = useAuth();
  const { address, isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    chainId: arcTestnet.id,
    query: { enabled: !!address },
  });
  const { switchChainAsync } = useSwitchChain();

  const truncated = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "No wallet";
  const nativeBalance = balance ? `${parseFloat(balance.formatted).toFixed(2)} ${balance.symbol}` : "--";
  const networkName = isValidChain ? "Arc Testnet" : "Wrong network";

  if (!isConnected || !address) {
    return <ConnectWalletButton />;
  }

  return (
    <div className="leading-none">
      <DropdownMenu>
        <DropdownMenuTrigger className="group outline-none">
          <div className="flex h-[4rem] items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-[1.4rem] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.1] sm:h-[4.4rem] sm:gap-3 sm:px-[1.8rem]">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 shrink-0 rounded-full ${isValidChain ? "bg-accent-500" : "bg-red-400"}`}
              />
              <span className="hidden font-sans text-[1.25rem] font-medium text-white/70 sm:inline sm:text-[1.35rem]">
                {networkName}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 pl-2 sm:pl-3">
              <span className="font-area text-[1.35rem] font-black tracking-[-0.02em] text-white sm:text-[1.5rem]">
                {truncated}
              </span>
              <ChevronDown className="h-4 w-4 text-white/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          sideOffset={8}
          align="end"
          className="w-[22rem] rounded-xl border border-white/[0.08] bg-[#121212]/95 px-[1rem] py-[1rem] backdrop-blur-xl sm:w-[26rem]"
        >
          <div className="mb-4 rounded-lg border border-white/[0.05] bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500">
                <UserRound className="h-4 w-4 text-black" />
              </div>
              <div className="min-w-0">
                <p className="font-area text-[1.4rem] font-black tracking-[-0.02em] text-white">Wallet</p>
                <CopyAddressToClipboard
                  address={address}
                  className="font-sans text-[1.15rem] text-white/60 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-between font-sans text-[1.25rem]">
              <span className="text-white/70">Balance</span>
              <span className="font-semibold text-white">{nativeBalance}</span>
            </div>
            {!isValidChain && (
              <p className="mt-2 font-sans text-[1.15rem] text-red-400">Switch to Arc Testnet to trade.</p>
            )}
          </div>

          <div className="space-y-2">
            {!isValidChain && (
              <button
                type="button"
                onClick={() => void switchChainAsync({ chainId: arcTestnet.id })}
                className="group w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-[1rem] py-[0.85rem] text-white/70 transition-all duration-200 hover:border-accent-500/40 hover:bg-white/[0.05] hover:text-accent-500"
              >
                <div className="flex items-center justify-center gap-[0.6rem] font-sans text-[1.3rem] font-medium">
                  Switch to Arc
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => void disconnectAsync()}
              className="group w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-[1rem] py-[0.85rem] text-white/70 transition-all duration-200 hover:border-red-500/30 hover:bg-white/[0.05] hover:text-red-400"
            >
              <div className="flex items-center justify-center gap-[0.6rem] font-sans text-[1.3rem] font-medium">
                <Unplug className="h-3.5 w-3.5 transition-colors group-hover:text-red-400" />
                Disconnect
              </div>
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Nav wallet control — injected MetaMask/browser connect (same pattern as frontend ConnectButton). */
export const WalletButton = () => <WalletButtonInner />;

export default WalletButton;
