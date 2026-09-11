# ZUNO / Reflow subgraph — Arc Testnet

Indexes bonding-curve **Create / Buy / Sell / Listing** and DEX **Swap** on **arc-testnet** (chain `5042002`).

## Network

| Field | Value |
|-------|-------|
| Graph network | `arc-testnet` |
| Chain ID | `5042002` |
| Factory | `0x8133D59B8b59C1210cf6B28e7833810aA691A33a` |
| startBlock | `61615630` |

## Install Graph CLI

```bash
# from subgraph/
npm install
# or globally:
# npm install -g @graphprotocol/graph-cli
```

This repo already has the subgraph scaffold — **do not** run `graph init` again.

## Authenticate & deploy (Studio)

1. Create/open subgraph **`reflow`** in [Subgraph Studio](https://thegraph.com/studio/) with network **Arc Testnet**.
2. Copy the deploy key, then:

```bash
cd subgraph
graph auth <YOUR_DEPLOY_KEY>
npm run codegen
npm run build
npm run deploy
# or: npm run deploy:test
```

Newer Graph CLI has no `--studio` flag — just `graph auth <KEY>`.

## Query URL

After deploy, Studio shows a query URL like:

```text
https://api.studio.thegraph.com/query/<ID>/reflow/version/latest
```

Put it in `ui-frontend/.env.local`:

```bash
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/<ID>/reflow/version/latest
SUBGRAPH_URL=https://api.studio.thegraph.com/query/<ID>/reflow/version/latest
```

Test:

```bash
npm run test:query
```
