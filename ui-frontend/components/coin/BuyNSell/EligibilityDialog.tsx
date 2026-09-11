"use client";

import React, { useMemo, useState } from "react";
import AirdropClaimDialog from "./AirdropClaimDialog";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTrigger } from "~~/components/common/Dialog";
import HoverButton from "~~/components/common/HoverButton";
import { Spinner } from "~~/components/common/Spinner";
import { tokens } from "~~/constants";
import { fetchAirdrop } from "~~/graphql/graphQlClient2";
import { useTokenStore } from "~~/stores/tokenStore";
import { TokenMetadata } from "~~/types/types";

const EligibilityDialog = ({
  tokenAddress,
  className,
}: {
  tradeType: any;
  tokenAddress: `0x${string}`;
  className: string | undefined;
  isGraduated: boolean;
  poolAddress: string;
  disabled?: boolean;
}) => {
  const { setTokenAddress, setMetadata } = useTokenStore();
  const { address, isConnected: authenticated } = useAccount();
  const user = address ? { wallet: { address } } : null;
  const [isFirstDialogOpen, setIsFirstDialogOpen] = useState(false);
  const [isSecondDialogOpen, setIsSecondDialogOpen] = useState(false);

  const getAirdropAddress = (tokenAddr: string): `0x${string}` => {
    switch (tokenAddr) {
      case "0x83F6Ce3325e85f3A695FeE6Ec9e63c4C6111D5ba":
        return "0x3C9CC2A582EF6962B08d090D00de3a12DDD1F20C";
      case "0xfd64EB341d7811eFEE1E2A7E1D9a40a4E1de9487":
        return "0x0fc3FdD1bcC3820F95C75e7Fddbe8513009e6466";
      case "0x782adeA82aB44cF5985168967724B4AfAc607F60":
        return "0x81B428c6f2d357Cc7eDD7B7ad8821a9c846E7bC5";
      default:
        return "0x3C9CC2A582EF6962B08d090D00de3a12DDD1F20C";
    }
  };

  const airdropAddress = getAirdropAddress(tokenAddress);
  const userAddress = user?.wallet?.address || "";

  const {
    data: airdropData,
    isLoading: isFetchingProof,
    isError: proofError,
  } = useQuery({
    queryKey: ["airdrop", userAddress, tokenAddress],
    queryFn: () => fetchAirdrop(userAddress, tokenAddress),
    enabled:
      authenticated === true &&
      !!user?.wallet?.address &&
      userAddress.length > 0 &&
      !!tokenAddress &&
      tokenAddress.length > 0 &&
      isFirstDialogOpen,
  });

  const merkleProof = useMemo(() => airdropData?.merkleProof ?? [], [airdropData]);
  const hasAirdropAllocation = merkleProof.length > 0;
  const canClaim = authenticated && hasAirdropAllocation;
  const hasClaimed = false;

  const getEligibilityState = () => {
    if (!hasAirdropAllocation) return "not-eligible";
    if (hasClaimed) return "already-claimed";
    if (canClaim) return "eligible";
    return "not-eligible";
  };

  const eligibilityState = getEligibilityState();

  const handleFirstDialogOpen = (open: boolean) => {
    setIsFirstDialogOpen(open);
    if (open) {
      setTokenAddress(tokenAddress);
      const token = tokens.find(t => t.id === tokenAddress);
      const metadata: TokenMetadata = {
        name: token?.name || "Unknown Token",
        description: token?.description || "",
        image: token?.imageUrl || "/diamondHands.png",
        tokenAddress,
        symbol: token?.symbol || "UNKNOWN",
      };
      setMetadata(metadata);
    }
  };

  const handlePrebuyClick = () => {
    setIsFirstDialogOpen(false);
    setIsSecondDialogOpen(true);
  };

  const isLoading = isFetchingProof && !proofError;

  return (
    <>
      {/* First Dialog - Eligibility Check */}
      <Dialog open={isFirstDialogOpen} onOpenChange={handleFirstDialogOpen}>
        <DialogTrigger asChild>
          <HoverButton className={className} size="sm" data-tour="check-eligibility">
            <div>Prebuy</div>
          </HoverButton>
        </DialogTrigger>
        <DialogContent className="bg-primary-300 rounded-sm border-white/20 pt-[2.4rem] border w-[90vw] sm:w-auto min-w-[300px] mx-auto">
          <div className="p-[0.6rem] w-auto text-center">
            <h3 className="font-bold leading-tight text-[1.2rem] md:text-[1.8rem] mb-[2rem]">Pre-buy Eligibility</h3>

            {isLoading && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Spinner className="size-[2rem]" />
                <p className="text-[1.4rem] text-white/80">Checking eligibility...</p>
              </div>
            )}

            {!isLoading && !authenticated && (
              <div className="py-8">
                <p className="text-[1.4rem] text-white/80 mb-4">Please connect your wallet to check eligibility</p>
              </div>
            )}

            {!isLoading && authenticated && eligibilityState === "not-eligible" && (
              <div className="py-8">
                <div className="mb-4">
                  <h4 className="text-[1.6rem] font-bold text-red-400 mb-2">Not Eligible</h4>
                </div>
                <p className="text-[1.4rem] text-white/80 mb-4">
                  You are not eligible yet. Trade more on the tokens launched on Reflow to be eligible for pre-buy.
                </p>
              </div>
            )}

            {!isLoading && authenticated && eligibilityState === "already-claimed" && (
              <div className="py-8">
                <div className="mb-4">
                  <h4 className="text-[1.6rem] font-bold text-yellow-400 mb-2">Already Pre-bought</h4>
                </div>
                <p className="text-[1.4rem] text-white/80 mb-4">
                  You have already pre-bought the tokens, wait for next token to launch to pre-buy.
                </p>
              </div>
            )}

            {!isLoading && authenticated && eligibilityState === "eligible" && (
              <div className="py-8">
                <div className="mb-6">
                  <h4 className="text-[1.6rem] font-bold text-green-400 mb-2">Congratulations!</h4>
                  <p className="text-[1.4rem] text-white/90">You are a diamond hands holder!</p>
                </div>
                <HoverButton
                  className="w-full bg-accent-500 hover:bg-accent-600 text-black font-bold"
                  handleOnClick={handlePrebuyClick}
                >
                  Pre-buy
                </HoverButton>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Second Dialog - Airdrop Claim */}
      <AirdropClaimDialog
        isOpen={isSecondDialogOpen}
        onOpenChange={setIsSecondDialogOpen}
        tokenAddress={tokenAddress}
        airdropAddress={airdropAddress}
      />
    </>
  );
};

export default EligibilityDialog;
