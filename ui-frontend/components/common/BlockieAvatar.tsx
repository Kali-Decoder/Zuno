"use client";

import { blo } from "blo";

type BlockieAvatarProps = {
  address?: string;
  ensImage?: string | null;
  size: number;
};

export const BlockieAvatar = ({ address, ensImage, size }: BlockieAvatarProps) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    className="rounded-full"
    src={ensImage || blo((address || "0x0000000000000000000000000000000000000000") as `0x${string}`)}
    width={size}
    height={size}
    alt={`${address || "unknown"} avatar`}
  />
);
