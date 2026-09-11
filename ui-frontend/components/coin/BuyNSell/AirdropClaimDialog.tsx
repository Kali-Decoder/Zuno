"use client";

import React from "react";
import AirdropSection from "../AirdropSection";
import { Dialog, DialogContent } from "~~/components/common/Dialog";

interface AirdropClaimDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tokenAddress: `0x${string}`;
  airdropAddress: `0x${string}`;
}

const AirdropClaimDialog = ({ isOpen, onOpenChange, tokenAddress, airdropAddress }: AirdropClaimDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-primary-300 rounded-sm border-white/20 pt-[2.4rem] border w-[90vw] sm:w-auto min-w-[300px] mx-auto">
        <AirdropSection />
      </DialogContent>
    </Dialog>
  );
};

export default AirdropClaimDialog;
