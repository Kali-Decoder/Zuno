"use client";

import toast from "react-hot-toast";

type TransactionFunc = (tx?: unknown, options?: unknown) => Promise<`0x${string}` | undefined>;

/** Mock transactor — toast only, no chain writes. */
export const useTransactor = (_walletClient?: unknown): TransactionFunc => {
  return async () => {
    toast.success("Mock transaction submitted");
    return "0xmocktxhash";
  };
};

export const useMockTx = useTransactor;
