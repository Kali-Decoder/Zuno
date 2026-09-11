# Reflow subgraph (The Graph Studio)

Indexes bonding-curve **Create / Buy / Sell / Listing** and DEX **Swap** on **monad-testnet**.

## Status

- Graph CLI: installed (`graph` 0.98.x)
- `graph codegen` + `graph build`: ✅ done in this folder
- Skipped `graph init reflow` — this repo already has the Reflow subgraph (no need to scaffold again)

## Deploy to Studio

1. Create a subgraph named **`reflow`** in [Subgraph Studio](https://thegraph.com/studio/) (network: **Monad Testnet**).
2. Copy the **Deploy Key** from Studio.
3. Authenticate and deploy from this directory:

```bash
cd subgraph
graph auth --studio <YOUR_DEPLOY_KEY>
npm run deploy
# or: graph deploy --studio reflow
```

When prompted for a version label, use e.g. `v0.0.1`.

## Local build

```bash
cd subgraph
npm install
npm run codegen
npm run build
```

## After deploy

Set the Studio query URL in the app:

```bash
# ui-frontend/.env.local
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/<ID>/reflow/<VERSION>
```

Charts/trades already work via the Mongo indexer; the Studio URL can replace RPC fallback later.
