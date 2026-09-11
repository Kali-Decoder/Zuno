import React from "react";
import Link from "next/link";
import { AddressCopyIcon } from "./AddressCopyIcon";
import { BLOCKCHAIN_URL } from "~~/constants";
import { cn } from "~~/lib/utils";

const CopyAddressToClipboard = ({
  address,
  format = "short",
  className,
}: {
  address: string;
  format?: "very-short" | "short" | "long";
  className?: string;
}) => {
  const checkSumAddress = address;

  const shortAddress = checkSumAddress?.slice(0, 6) + "..." + checkSumAddress?.slice(-4);
  const veryShortAddress = checkSumAddress?.slice(0, 4) + "..." + checkSumAddress?.slice(-2);

  const displayAddress =
    format === "long" ? checkSumAddress : format === "very-short" ? veryShortAddress : shortAddress;

  return (
    <div className={cn("flex items-center gap-[0.4rem]", className)}>
      <Link
        target="_blank"
        href={`${BLOCKCHAIN_URL}/address/${checkSumAddress}`}
        className="break-words hover:underline"
      >
        {displayAddress}
      </Link>
      {displayAddress && <AddressCopyIcon address={address} />}
    </div>
  );
};

export default CopyAddressToClipboard;
