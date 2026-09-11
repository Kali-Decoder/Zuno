#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUBGRAPH_URL="${SUBGRAPH_URL:-https://api.studio.thegraph.com/query/1760143/reflow/version/latest}"
VERSION_LABEL="${VERSION_LABEL:-v0.0.3}"

echo "==> codegen + build (arc-testnet)"
npx graph codegen
npx graph build

echo "==> deploy to Studio (reflow @ ${VERSION_LABEL})"
npx graph deploy reflow --version-label "$VERSION_LABEL" -g https://api.studio.thegraph.com/deploy/

echo "==> query $SUBGRAPH_URL"
sleep 3
curl -sS -X POST "$SUBGRAPH_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"{ _meta { block { number } deployment hasIndexingErrors } factories(first: 5) { id tokenCount tradeCount } tokens(first: 10, orderBy: createdAt, orderDirection: desc) { id name symbol graduated tradeCount lastPriceNative } trades(first: 10, orderBy: timestamp, orderDirection: desc) { id isBuy priceNative amountNative timestamp source } }"}' \
  | python3 -m json.tool

echo
echo "Done. Open Studio UI to watch Arc Testnet sync progress."
