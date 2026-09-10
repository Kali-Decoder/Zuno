export type WriteContractVariables = Record<string, unknown>;
export type SendTransactionMutate = (...args: unknown[]) => Promise<`0x${string}`>;
