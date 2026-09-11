#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUBGRAPH_URL="${SUBGRAPH_URL:-https://api.studio.thegraph.com/query/134675/reflow/version/latest}"

echo "==> codegen + build"
npx graph codegen
npx graph build

echo "==> deploy to Studio (reflow @ v0.0.1)"
npx graph deploy reflow --version-label v0.0.1 -g https://api.studio.thegraph.com/deploy/

echo "==> query $SUBGRAPH_URL"
curl -sS -X POST "$SUBGRAPH_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"{ _meta { block { number } deployment hasIndexingErrors } factories(first: 5) { id tokenCount tradeCount } tokens(first: 10, orderBy: createdAt, orderDirection: desc) { id name symbol graduated tradeCount lastPriceNative } trades(first: 10, orderBy: timestamp, orderDirection: desc) { id isBuy priceNative amountNative timestamp source } }"}' \
  | python3 -m json.tool

echo
echo "Done. Open Studio UI to watch sync progress."
