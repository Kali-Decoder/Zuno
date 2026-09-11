import { http, createConfig, injected } from "wagmi";
import { monadTestnet } from "~~/config/chains";

/**
 * Injected-only (MetaMask / browser wallets).
 * Do not import from `wagmi/connectors`: that barrel can pull unused Coinbase/x402 deps.
 */
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [monadTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz"),
  },
  ssr: true,
});
