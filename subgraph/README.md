# Reflow subgraph (The Graph Studio)

Indexes bonding-curve **Create / Buy / Sell / Listing** and DEX **Swap** on **monad-testnet**.

## Status

- Graph CLI: installed (`graph` 0.98.x)
- `graph codegen` + `graph build`: ✅ done in this folder
- Skipped `graph init reflow` — this repo already has the Reflow subgraph (no need to scaffold again)

## Deploy

### Subgraph Studio (blocked on Monad Testnet)

`network: monad-testnet` in `subgraph.yaml` is correct, but **Studio’s registrar does not host Monad Testnet yet** (`services.subgraphs: []` in The Graph networks registry). Deploying to `https://api.studio.thegraph.com/deploy/` fails with:

```text
network not supported by registrar: no network monad-testnet found on chain ethereum
```

Studio currently lists **Monad mainnet** (`monad`) only. Do **not** change the network slug to `monad` — that would index the wrong chain.

### Goldsky (recommended for Monad Testnet)

Monad’s docs recommend Goldsky for testnet subgraphs. Same manifest (`network: monad-testnet`):

```bash
# install once: npm i -g @goldskycom/cli && goldsky login
cd subgraph
npm run codegen && npm run build
goldsky subgraph deploy reflow/1.0.0 --path .
```

Then set the Goldsky GraphQL URL in `ui-frontend/.env.local`:

```bash
NEXT_PUBLIC_SUBGRAPH_URL=https://api.goldsky.com/api/public/<PROJECT>/subgraphs/reflow/1.0.0/gn
SUBGRAPH_URL=...
```

### Auth note (Graph CLI)

Newer Graph CLI has no `--studio` flag:

```bash
graph auth <YOUR_DEPLOY_KEY>
```

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
