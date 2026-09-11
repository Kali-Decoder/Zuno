import { http, createConfig, injected } from "wagmi";
import { arcTestnet } from "~~/config/chains";

/**
 * Injected-only (MetaMask / browser wallets).
 * Do not import from `wagmi/connectors`: that barrel can pull unused Coinbase/x402 deps.
 */
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [arcTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.testnet.arc.network"),
  },
  ssr: true,
});
