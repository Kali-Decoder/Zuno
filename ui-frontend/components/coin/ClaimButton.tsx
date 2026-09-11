"use client";

import { useEffect, useState } from "react";
import ConnectWalletButton from "../common/ConnectWalletButton";
import HoverButton from "../common/HoverButton";
import { Spinner } from "../common/Spinner";
import { usePrivy } from "@privy-io/react-auth";
import { getMerkleProof } from "~~/hooks/api-hooks";
import { useTransactor } from "~~/hooks/useMockTx";

interface AirdropButtonProps {
  airdropAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  onSuccess?: () => void;
}

export default function AirdropButton({ airdropAddress, tokenAddress, onSuccess }: AirdropButtonProps) {
  const { user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [canClaim, setCanClaim] = useState(true);
  const writeTx = useTransactor();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.wallet?.address || !tokenAddress || !airdropAddress) return;
      try {
        await getMerkleProof(user.wallet.address, tokenAddress);
        setCanClaim(true);
        setHasClaimed(false);
      } catch (err) {
        console.error("Error fetching merkle or claim status", err);
      }
    };
    fetchData();
  }, [user?.wallet?.address, tokenAddress, airdropAddress]);

  const handleClaim = async () => {
    if (!airdropAddress || !user?.wallet?.address) return;
    try {
      setIsLoading(true);
      await writeTx();
      setHasClaimed(true);
      setCanClaim(false);
      onSuccess?.();
    } catch (err) {
      console.error("Claim transaction failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.wallet?.address) {
    return (
      <ConnectWalletButton className="h-auto w-full rounded-sm px-[1.6rem] py-[1.2rem] text-[1.4rem] hover:bg-accent-600">
        Connect to claim
      </ConnectWalletButton>
    );
  }

  let buttonLabel = "Claim Airdrop";
  let isButtonDisabled = false;

  if (!canClaim && hasClaimed) {
    buttonLabel = "You have already claimed";
    isButtonDisabled = true;
  } else if (!canClaim && !hasClaimed) {
    buttonLabel = "You are not eligible";
    isButtonDisabled = true;
  }

  return (
    <HoverButton className="w-full group" handleOnClick={handleClaim} disabled={isButtonDisabled || isLoading}>
      <div className="flex gap-[0.8rem] items-center justify-center">
        {isLoading ? (
          <>
            <span>Claiming…</span>
            <Spinner />
          </>
        ) : (
          buttonLabel
        )}
      </div>
    </HoverButton>
  );
}
