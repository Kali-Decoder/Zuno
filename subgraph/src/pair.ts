import { BigDecimal } from "@graphprotocol/graph-ts";
import { Swap, UniswapV2Pair } from "../generated/templates/UniswapV2Pair/UniswapV2Pair";
import { Token } from "../generated/schema";
import { recordTrade, toDecimal, ZERO_BD } from "./helpers";

export function handleSwap(event: Swap): void {
  let pair = UniswapV2Pair.bind(event.address);
  let token0Call = pair.try_token0();
  let token1Call = pair.try_token1();
  if (token0Call.reverted || token1Call.reverted) return;

  let t0 = Token.load(token0Call.value.toHexString().toLowerCase());
  let t1 = Token.load(token1Call.value.toHexString().toLowerCase());
  let token = t0 != null ? t0 : t1;
  if (token == null) return;

  let tokenIs0 = t0 != null;
  let amount0In = toDecimal(event.params.amount0In);
  let amount1In = toDecimal(event.params.amount1In);
  let amount0Out = toDecimal(event.params.amount0Out);
  let amount1Out = toDecimal(event.params.amount1Out);

  let amountNative: BigDecimal;
  let amountToken: BigDecimal;
  let isBuy: boolean;

  if (tokenIs0) {
    amountToken = amount0Out.gt(ZERO_BD) ? amount0Out : amount0In;
    amountNative = amount1In.gt(ZERO_BD) ? amount1In : amount1Out;
    isBuy = amount0Out.gt(ZERO_BD);
  } else {
    amountToken = amount1Out.gt(ZERO_BD) ? amount1Out : amount1In;
    amountNative = amount0In.gt(ZERO_BD) ? amount0In : amount0Out;
    isBuy = amount1Out.gt(ZERO_BD);
  }

  if (amountToken.equals(ZERO_BD) || amountNative.equals(ZERO_BD)) return;
  let price = amountNative.div(amountToken);

  recordTrade(
    token.id,
    event.transaction.hash,
    event.logIndex,
    event.block.number,
    event.block.timestamp,
    event.params.to,
    isBuy,
    amountNative,
    amountToken,
    price,
    "dex",
  );
}
