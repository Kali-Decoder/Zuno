"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./Dialog";
import HoverButton from "./HoverButton";
import { Spinner } from "./Spinner";
import { useAccount } from "wagmi";
import confetti from "canvas-confetti";
import { Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { getMerkleProof } from "~~/hooks/api-hooks";
import { useTransactor } from "~~/hooks/useMockTx";

const tokenAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;
const airdropAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

const CheckEligibility = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confettiShown, setConfettiShown] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [wasClicked, setWasClicked] = useState(false);

  const { address } = useAccount();
  const user = address ? { wallet: { address } } : null;
  const writeTx = useTransactor();

  useEffect(() => {
    if (wasClicked) return;
    const pulseInterval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1000);
    }, 3000);
    return () => clearInterval(pulseInterval);
  }, [wasClicked]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    setConfettiShown(true);
  };

  const handleOpen = async (open: boolean) => {
    setWasClicked(true);

    if (!open) {
      setIsOpen(false);
      setConfettiShown(false);
      return;
    }

    try {
      setIsLoading(true);
      const address = user?.wallet?.address;

      if (!address) {
        toast(() => <span className="flex flex-col gap-[0.2rem]">Please connect your wallet !!!</span>, {
          duration: 1000,
        });
        return;
      }

      await getMerkleProof(address, tokenAddress);
      // Mock: connected users are eligible
      setCanClaim(true);
      setHasClaimed(false);
      if (!confettiShown) triggerConfetti();
      setIsOpen(true);
    } catch (error) {
      console.error("Eligibility check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!airdropAddress || !user?.wallet?.address) return;
    try {
      setIsLoading(true);
      await writeTx();
      setCanClaim(false);
      setHasClaimed(true);
    } catch (err) {
      console.error("Claim transaction failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEligibilityContent = () => {
    if (canClaim) {
      return (
        <>
          <div className="border border-accent-500 rounded-full mx-auto grid place-content-center size-[8rem]">
            <Check className="size-[2rem] sm:size-[4rem] mt-[0.4rem] text-accent-500" />
          </div>
          <div className="flex flex-col items-center gap-[0.4rem]">
            <DialogTitle className="text-[2rem]">You&apos;re a Diamond Hand holder! 🎉</DialogTitle>
            <DialogDescription className="md:text-[1.4rem] leading-[150%] text-center font-semibold text-white/60">
              You qualify for the early contribution phase. You can now buy before graduation.
            </DialogDescription>
          </div>
          <HoverButton className="w-full group" handleOnClick={handleClaim}>
            <div className="flex gap-[0.8rem] items-center">
              {isLoading ? (
                <div className="flex items-center">
                  <span>Claiming…</span>
                  <Spinner />
                </div>
              ) : (
                "Claim Airdrop"
              )}
            </div>
          </HoverButton>
        </>
      );
    }

    if (hasClaimed) {
      return (
        <>
          <div className="border border-accent-500 rounded-full mx-auto grid place-content-center size-[8rem]">
            <Check className="size-[2rem] sm:size-[4rem] mt-[0.4rem] text-accent-500" />
          </div>
          <div className="flex flex-col items-center gap-[0.4rem]">
            <DialogTitle className="text-[2rem]">🎉 Airdrop already claimed!</DialogTitle>
            <DialogDescription className="md:text-[1.4rem] leading-[150%] text-center font-semibold text-white/60">
              You have already claimed your airdrop tokens. Thank you for being a part of ZUNO!
            </DialogDescription>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="border border-accent-500 rounded-full mx-auto grid place-content-center size-[4.4rem] sm:size-[8rem]">
          <X className="size-[2rem] sm:size-[4rem] mt-[0.2rem] sm:mt-[0.4rem] text-accent-500" />
        </div>
        <div className="flex flex-col items-center gap-[0.4rem]">
          <DialogTitle className="text-[1.4rem] sm:text-[2rem] text-center">You&apos;re not eligible yet!</DialogTitle>
          <DialogDescription className="md:text-[1.4rem] leading-[150%] text-center font-semibold text-white/60">
            To qualify for early access, buy and hold more tokens. You&apos;ll be able to join the next round once you
            meet the holding requirement.
          </DialogDescription>
        </div>
        <HoverButton disabled={true} className="md:text-[1.6rem] md:py-[1.4rem] w-full mx-auto">
          Not Eligible to Claim
        </HoverButton>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          disabled={isLoading}
          data-tour="check-eligibility"
          className={`flex items-center gap-[0.6rem] sm:gap-[0.8rem] bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/30 hover:border-accent-500/50 text-accent-400 hover:text-accent-300 rounded-xl px-[1rem] sm:px-[1.4rem] py-[0.6rem] sm:py-[0.8rem] font-medium text-[0.8rem] sm:text-[1rem] transition-all duration-200 backdrop-blur-sm ${
            isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
          } ${isPulsing ? "animate-pulse" : ""}`}
        >
          <div className="flex items-center gap-[0.4rem] sm:gap-[0.6rem]">
            <span>Check Eligibility</span>
            {isLoading ? (
              <Spinner className="w-[1.2rem] h-[1.2rem] sm:w-[1.4rem] sm:h-[1.4rem]" />
            ) : (
              <Check className="w-[1.2rem] h-[1.2rem] sm:w-[1.4rem] sm:h-[1.4rem]" />
            )}
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-primary-800 border border-white/20 max-w-xl p-[1.6rem] sm:p-[2.4rem] gap-0 rounded-sm space-y-[0.8rem] sm:space-y-[1.6rem]">
        {renderEligibilityContent()}
      </DialogContent>
    </Dialog>
  );
};

export default CheckEligibility;
