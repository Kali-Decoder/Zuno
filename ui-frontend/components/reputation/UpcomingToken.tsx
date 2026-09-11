"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ZapIcon } from "~~/icons/symbols";
import { cn } from "~~/lib/utils";

const UpcomingToken = ({
  className,
  name = "GMonad",
  symbol = "GMONAD",
  imageUrl = "/gmonad.jpeg",
  href,
  subtitle = "Upcoming",
  description = "Reflow lifecycle token on Monad Testnet.",
}: {
  className?: string;
  name?: string;
  symbol?: string;
  imageUrl?: string;
  href?: string;
  subtitle?: string;
  description?: string;
}) => {
  const body = (
    <article
      className={cn(
        "relative w-[20rem] max-w-[422px] rounded-sm border border-white/10 bg-primary-400 p-[1.2rem] sm:w-[28rem] sm:max-w-none",
        className,
      )}
    >
      <div className="absolute inset-0 z-[-1] rounded-sm bg-primary-radial opacity-80" />
      <div className="flex flex-col gap-[0.8rem]">
        <div className="grid grid-rows-[auto_auto] gap-[0.8rem]">
          <Image
            src={imageUrl}
            alt={name}
            width={280}
            height={280}
            className="h-full w-full rounded-sm border border-white/10 object-cover"
          />
          <div className="flex w-full flex-col items-start gap-[0.8rem]">
            <div className="flex w-full items-center justify-between">
              <h3 className="font-bold text-accent-500">
                {name} <span className="font-mono text-[1rem] text-white/40">${symbol}</span>
              </h3>
              <div className="flex items-center gap-[0.6rem] rounded-full border border-white/10 bg-white/5 p-[0.4rem] px-[0.8rem] font-mono text-[1rem] uppercase leading-none">
                <ZapIcon className="w-[0.8rem] text-yellow-400" />
                <p className="max-w-[12rem] truncate normal-case">{subtitle}</p>
              </div>
            </div>
          </div>
        </div>
        <p className="col-span-2 text-[1rem] text-white/60 sm:text-[1.2rem]">{description}</p>
      </div>
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
};

export default UpcomingToken;
