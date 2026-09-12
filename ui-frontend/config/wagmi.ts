import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { arcTestnet } from "~~/config/chains";

/**
 * Wagmi config for Privy — use createConfig from `@privy-io/wagmi`
 * so Privy drives connectors and stays in sync with wagmi.
 */
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.testnet.arc.network"),
  },
});
