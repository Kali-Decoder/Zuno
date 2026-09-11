# Reflow

Liquidity-recycling launchpad on **Monad**.

Projects launch on a bonding curve, graduate to Uniswap V2 with **locked LP** (not burned), and if a pool goes inactive the community votes to recycle that liquidity into an active project.

```
Bond → Graduate → Lock LP → Trade → Inactive → Vote → Recycle → Lock again
```

---

## Monorepo layout

| Path | Stack | Role |
|------|--------|------|
| [`implementation/`](./implementation) | Solidity, Hardhat, Foundry | Contracts, deploy scripts, recycle tests |
| [`ui-frontend/`](./ui-frontend) | Next.js, wagmi, ethers, MongoDB | Explore / launch / trade / lifecycle UI |

Contract-level detail and step-by-step deploy live in [`implementation/README.md`](./implementation/README.md).

---

## Architecture overview

```mermaid
flowchart TB
  subgraph UI["ui-frontend (Next.js)"]
    Pages["Explore · Launch · Token · Guide · Leaderboards"]
    Actions["lib/reflow/actions.ts"]
    API["/api/tokens · /api/tokens/sync"]
    Pages --> Actions
    Pages --> API
  end

  subgraph Index["MongoDB"]
    Tokens["Token documents\n(phase, progress, vault, proposal)"]
  end

  subgraph Chain["Monad Testnet"]
    Core["Core"]
    Curve["BondingCurve + Factory"]
    Router["DexRouter"]
    Vault["LPRecyclingVault"]
    Monitor["ActivityMonitor"]
    Gov["RecyclingGovernor"]
    V2["Uniswap V2 Pair"]
  end

  Actions -->|"wallet txs + eth_call"| Chain
  API -->|"sync events + lifecycle"| Chain
  API --> Tokens
  Tokens -->|"browse / filter"| Pages
```

| Layer | Source of truth | Purpose |
|-------|-----------------|---------|
| **On-chain** | Core, Curve, DexRouter, Vault, Monitor, Governor | Balances, pricing, LP, inactivity, votes, recycle |
| **Mongo** | Derived index via sync | Fast explore/filter by phase; fewer RPCs on browse |
| **UI** | Hybrid | Lists from Mongo; quotes/trades/lifecycle from chain |

---

## Token lifecycle

```mermaid
flowchart TD
  A[Core.createCurve] --> B[BondingCurve buy / sell]
  B --> C{Target reached?}
  C -->|yes| D[Curve lock]
  D --> E[BondingCurve.listing]
  E --> F[Uniswap V2 pair + LP]
  F --> G[LPRecyclingVault.registerLock]
  G --> H[DexRouter buy / sell]
  H --> I[ActivityMonitor]
  I --> J{Inactive window?}
  J -->|yes| K[Vault.markInactive]
  K --> L[Governor.propose]
  L --> M[vote with MON stake]
  M --> N[execute]
  N --> O[Vault.recycleToWinner]
  O --> G
```

**Phases in the UI / Mongo model**

`bonding` → `locked` → `listed` → `inactive` → `voting` → `recycling` → `recycled`

---

## Smart contracts

| Contract | Path | Role |
|----------|------|------|
| `Core` | `implementation/src/Core.sol` | Create curve; bonding buy/sell |
| `BondingCurve` / `BondingCurveFactory` | `src/BondingCurve*.sol` | Price discovery; lock; graduate to V2 |
| `Token` | `src/Token.sol` | Project ERC20 (transfer-gated until listing) |
| `DexRouter` | `src/DexRouter.sol` | Post-listing swaps; records activity |
| `WNative` / `FeeVault` | `src/` | Wrapped native + protocol fees |
| `uniswap/*` | `src/uniswap/` | Local Uniswap V2 factory / pair / router |
| `LPRecyclingVault` | `src/recycle/` | Holds graduated LP; executes recycle |
| `ActivityMonitor` | `src/recycle/` | Volume / tx / time inactivity |
| `RecyclingGovernor` | `src/recycle/` | Native-weighted propose → vote → execute |
| `ReflowV2Deployer` | `src/recycle/` | Optional one-shot deploy + wiring |

**Design choice:** `BondingCurve.listing()` does **not** burn LP. LP is sent to `LPRecyclingVault` and registered so inactive liquidity can be recycled later.

---

## Frontend architecture

```
ui-frontend/
├── app/                    # App Router pages + API routes
│   ├── (root)/             # /, /launch, /token/[id], /guide, /leaderboards, …
│   └── api/tokens/         # GET/POST list · POST sync from chain
├── components/             # Explore, trade sidebar, lifecycle, nav, …
├── config/
│   ├── reflow.ts           # Addresses + ABIs (from deployments JSON)
│   ├── chains.ts           # Monad Testnet (10143)
│   └── wagmi.ts            # Injected wallet connector
├── lib/reflow/
│   ├── actions.ts          # create / buy / sell / list / vote / quotes / lifecycle
│   ├── provider.ts         # Public RPC
│   └── tx.ts               # sendContractTx helpers
├── lib/tokens/             # Mongo adapters + mongoSync
├── models/Token.ts         # Mongoose schema (phases mirror chain)
└── hooks/                  # useApiTokens, useReflowWallet, …
```

**Trading**

- Bonding: `Core.buy` / `Core.sell` (fee on native / output)
- Listed: `DexRouter.buy` / `DexRouter.sell`
- Quotes and market cap from virtual reserves (curve) or pair reserves (DEX)

**Wallet**

wagmi injected connector → ethers `BrowserProvider` signer for writes (`useReflowWallet`).

---

## Data flow

```mermaid
flowchart LR
  W[Wallet] -->|tx| C[Contracts]
  C -->|events + eth_call| S["/api/tokens/sync"]
  S --> M[(MongoDB)]
  M -->|GET /api/tokens| U[UI lists]
  C -->|actions.ts reads| U
  U -->|buy / sell / lifecycle CTAs| W
```

1. Launch or trade hits the chain.
2. Sync (manual or after lifecycle actions) indexes Create / vault / governor / progress into Mongo.
3. Explore and token pages hydrate from Mongo, then refresh live stats from chain.

---

## Network

| Network | Chain ID | RPC |
|---------|----------|-----|
| Monad Testnet | `10143` | `https://testnet-rpc.monad.xyz` (override with `MONAD_RPC_URL` / `NEXT_PUBLIC_RPC_URL`) |

Deployed addresses are saved in:

- `implementation/deployments/monadTestnet.json`
- `ui-frontend/config/deployments/monadTestnet.json`

| Contract | Address |
|----------|---------|
| Core | `0x002b3C2fe3442bb1Cef409C9dd1830A3E01C03f6` |
| BondingCurveFactory | `0x54eE35d85740CbB12B5cAB18A179ff6F5C7b28FF` |
| DexRouter | `0x200bbaD68ECAD4D64ff8B6Aa36C60A7a6d5374E1` |
| LPRecyclingVault | `0xEc6247Ea7698ACaC1343Db972d3d3484c6555163` |
| ActivityMonitor | `0x295D9dc3Ba2b47C5a6f6872f1DFf52ab5273609B` |
| RecyclingGovernor | `0x0B30672ef6e1F89938a9d0cc078F0ce5b5Ace098` |

---

## Quick start

### Contracts (`implementation/`)

```bash
cd implementation
cp .env.example .env   # set PRIVATE_KEY, optional MONAD_RPC_URL / MONGODB_URI
npm install
npx hardhat compile

# Deploy in order (01 → 11) — see implementation/README.md
# Or seed random tokens on an existing deploy:
npm run launch:random
```

### UI (`ui-frontend/`)

```bash
cd ui-frontend
cp .env.example .env.local
# MONGODB_URI, MONGODB_DB=reflow
# NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
# optional NEXT_PUBLIC_MON_USD=1  (mcap display)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect an injected wallet on Monad Testnet.

---

## Docs

| Doc | Contents |
|-----|----------|
| This file | Product + system architecture |
| [`implementation/README.md`](./implementation/README.md) | Contract cycle, deploy steps, usage |
| `ui-frontend/.env.example` | Frontend env vars |

---

## License

See individual packages for license terms.
