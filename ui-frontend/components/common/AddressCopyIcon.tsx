"use client";

import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { toast } from "react-hot-toast";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

export const AddressCopyIcon = ({ className, address }: { className?: string; address: string }) => {
  const [addressCopied, setAddressCopied] = useState(false);

  return (
    <CopyToClipboard
      text={address}
      onCopy={() => {
        toast(() => (
          <span className="flex flex-col gap-[0.2rem]">
            Copied!
            <span className="text-[1.2rem] text-white/60 break-all">{address}</span>
          </span>
        ));
        setAddressCopied(true);
        setTimeout(() => {
          setAddressCopied(false);
        }, 800);
      }}
    >
      <button onClick={e => e.stopPropagation()} type="button" className="size-[1rem] md:size-[1.6rem]">
        {addressCopied ? (
          <CheckCircleIcon className={className} aria-hidden="true" />
        ) : (
          <DocumentDuplicateIcon className={className} aria-hidden="true" />
        )}
      </button>
    </CopyToClipboard>
  );
};
