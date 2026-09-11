import { Address } from "@graphprotocol/graph-ts";
import { Buy, Listing, Sell } from "../generated/templates/BondingCurve/BondingCurve";
import { UniswapV2Pair as PairTemplate } from "../generated/templates";
import { Token } from "../generated/schema";
import { recordTrade, toDecimal, ZERO_BD } from "./helpers";

export function handleBuy(event: Buy): void {
  let tokenId = event.params.token.toHexString().toLowerCase();
  let amountNative = toDecimal(event.params.amountIn);
  let amountToken = toDecimal(event.params.amountOut);
  let price = amountToken.equals(ZERO_BD) ? ZERO_BD : amountNative.div(amountToken);

  recordTrade(
    tokenId,
    event.transaction.hash,
    event.logIndex,
    event.block.number,
    event.block.timestamp,
    event.params.sender,
    true,
    amountNative,
    amountToken,
    price,
    "curve",
  );
}

export function handleSell(event: Sell): void {
  let tokenId = event.params.token.toHexString().toLowerCase();
  let amountToken = toDecimal(event.params.amountIn);
  let amountNative = toDecimal(event.params.amountOut);
  let price = amountToken.equals(ZERO_BD) ? ZERO_BD : amountNative.div(amountToken);

  recordTrade(
    tokenId,
    event.transaction.hash,
    event.logIndex,
    event.block.number,
    event.block.timestamp,
    event.params.sender,
    false,
    amountNative,
    amountToken,
    price,
    "curve",
  );
}

export function handleListing(event: Listing): void {
  let tokenId = event.params.token.toHexString().toLowerCase();
  let token = Token.load(tokenId);
  if (token == null) return;
  token.graduated = true;
  token.pair = event.params.pair;
  token.listedAt = event.block.timestamp;
  token.save();

  PairTemplate.create(changetype<Address>(event.params.pair));
}
