"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ErrorMsg from "../common/ErrorMsg";
import { Spinner } from "../common/Spinner";
import AirdropButton from "./ClaimButton";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAirdrop } from "~~/graphql/graphQlClient2";
import { useTokenStore } from "~~/stores/tokenStore";

function AirdropSection() {
  const { isLoading, metadata, tokenAddress } = useTokenStore();

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
  const { user, authenticated } = usePrivy();
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState(false);

  const userAddress = user?.wallet?.address || "";
  const {
    data: airdropData,
    isLoading: isFetchingProof,
    isError: proofError,
    error: proofErrorObj,
  } = useQuery({
    queryKey: ["airdrop", userAddress, tokenAddress],
    queryFn: () => fetchAirdrop(userAddress, tokenAddress as `0x${string}`),
    enabled:
      authenticated === true &&
      !!user?.wallet?.address &&
      userAddress.length > 0 &&
      !!tokenAddress &&
      tokenAddress.length > 0,
  });

  const claimAmount = useMemo(() => {
    const raw = airdropData?.totalAmount ? Number(BigInt(airdropData.totalAmount)) / 1e18 : 1000;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(raw);
  }, [airdropData]);

  const canClaim = authenticated && !claimed;
  const claimLoading = (isFetchingProof || isLoading || !metadata) && !proofError;
  const claimReady = !claimLoading;

  const handleSuccess = function () {
    setClaimed(true);
    queryClient.invalidateQueries({ queryKey: ["airdrop", userAddress, tokenAddress] });
  };

  return (
    <div className="tabs-wrapper gap-0 md:min-h-[20.5rem] justify-between w-auto">
      <div className="p-[0.6rem] w-auto">
        <h3 className="font-bold leading-tight text-[1.2rem] md:text-[1.8rem] mb-[1rem]">Airdrop</h3>

        {claimLoading && (
          <p className="text-[1.4rem] text-white/80 mb-[1rem] flex-grow grid place-content-center">
            <Spinner />
          </p>
        )}

        {claimReady && (
          <div className="text-[1rem] md:text-[1.6rem] mb-[0.8rem] md:mb-[1.6rem] w-auto">
            {canClaim ? (
              <p className="flex flex-col">
                <span className="font-mono leading-none mb-[0.4rem] space-x-[0.4rem] inline-flex items-baseline">
                  <span className="tracking-wider text-[2.4rem] md:text-[5rem] font-semibold">{claimAmount}</span>
                  <span className="uppercase">{metadata?.symbol}</span>
                </span>
                <span className="text-[1.2rem] text-white/80">( Allocation from this airdrop )</span>
              </p>
            ) : (
              <div className="space-y-[0.4rem]">
                {claimAmount ? (
                  <p className="flex flex-col">
                    <span className="font-mono leading-none mb-[0.4rem] space-x-[0.4rem] text-white/40 inline-flex items-baseline">
                      <span className="tracking-wider text-[2.4rem] md:text-[5rem] font-semibold relative">
                        <span>{claimAmount}</span>
                        <span className="inline-block h-[4px] absolute w-full top-1/2 -translate-y-1/2 bg-white right-0"></span>
                      </span>
                      <span className="uppercase">{metadata?.symbol}</span>
                    </span>
                    <span className="text-[0.8rem] md:text-[1.2rem] text-white/80">( You have already claimed )</span>
                  </p>
                ) : (
                  <p className="mb-[0.4rem]">
                    You do not have any allocation. (Increase your
                    <span className="text-accent-500 font-bold inline-block mx-[0.4rem]">&apos;diamond hand&apos;</span>
                    to get in the next airdrop)
                  </p>
                )}
                <p className="text-[0.8rem] md:text-[1.2rem] text-white/80">
                  Learn how to increase your diamond hand from{" "}
                  <Link href="/" className="text-accent-500 hover:underline">
                    here
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        {proofError && (proofErrorObj as any)?.status !== 404 && (
          <div className="mb-[1.6rem]">
            <ErrorMsg errorText={(proofErrorObj as Error).message} errorType="Claim" />
          </div>
        )}
        <AirdropButton onSuccess={handleSuccess} airdropAddress={airdropAddress} tokenAddress={tokenAddress} />
      </div>
    </div>
  );
}

export default AirdropSection;
