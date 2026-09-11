import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Candle1m, Factory, Token, Trade } from "../generated/schema";

export const ZERO = BigInt.fromI32(0);
export const ONE = BigInt.fromI32(1);
export const ZERO_BD = BigDecimal.fromString("0");
export const EIGHTEEN = BigInt.fromI32(18);

export function toDecimal(value: BigInt, decimals: BigInt = EIGHTEEN): BigDecimal {
  if (value.equals(ZERO)) return ZERO_BD;
  let precision = BigInt.fromI32(10).pow(u8(decimals.toI32()));
  return value.toBigDecimal().div(precision.toBigDecimal());
}

export function factoryId(address: Bytes): string {
  return address.toHexString().toLowerCase();
}

export function getOrCreateFactory(id: string): Factory {
  let factory = Factory.load(id);
  if (factory == null) {
    factory = new Factory(id);
    factory.tokenCount = ZERO;
    factory.tradeCount = ZERO;
    factory.save();
  }
  return factory;
}

export function upsertCandle1m(
  tokenId: string,
  timestamp: BigInt,
  price: BigDecimal,
  volumeNative: BigDecimal,
): void {
  let openTime = timestamp.div(BigInt.fromI32(60)).times(BigInt.fromI32(60));
  let id = tokenId + "-" + openTime.toString();
  let candle = Candle1m.load(id);
  if (candle == null) {
    candle = new Candle1m(id);
    candle.token = tokenId;
    candle.openTime = openTime;
    candle.open = price;
    candle.high = price;
    candle.low = price;
    candle.close = price;
    candle.volumeNative = volumeNative;
    candle.tradeCount = ONE;
  } else {
    if (price.gt(candle.high)) candle.high = price;
    if (price.lt(candle.low)) candle.low = price;
    candle.close = price;
    candle.volumeNative = candle.volumeNative.plus(volumeNative);
    candle.tradeCount = candle.tradeCount.plus(ONE);
  }
  candle.save();
}

export function recordTrade(
  tokenId: string,
  txHash: Bytes,
  logIndex: BigInt,
  blockNumber: BigInt,
  timestamp: BigInt,
  trader: Bytes,
  isBuy: boolean,
  amountNative: BigDecimal,
  amountToken: BigDecimal,
  priceNative: BigDecimal,
  source: string,
): void {
  let id = txHash.toHexString() + "-" + logIndex.toString();
  let trade = new Trade(id);
  trade.token = tokenId;
  trade.txHash = txHash;
  trade.logIndex = logIndex;
  trade.blockNumber = blockNumber;
  trade.timestamp = timestamp;
  trade.trader = trader;
  trade.isBuy = isBuy;
  trade.amountNative = amountNative;
  trade.amountToken = amountToken;
  trade.priceNative = priceNative;
  trade.source = source;
  trade.save();

  let token = Token.load(tokenId);
  if (token != null) {
    token.tradeCount = token.tradeCount.plus(ONE);
    token.volumeNative = token.volumeNative.plus(amountNative);
    token.lastPriceNative = priceNative;
    token.lastTradeAt = timestamp;
    token.save();
  }

  upsertCandle1m(tokenId, timestamp, priceNative, amountNative);
}
