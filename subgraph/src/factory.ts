import { Create } from "../generated/BondingCurveFactory/BondingCurveFactory";
import { BondingCurve as BondingCurveTemplate } from "../generated/templates";
import { Token } from "../generated/schema";
import { ZERO, ZERO_BD, factoryId, getOrCreateFactory, ONE } from "./helpers";

export function handleCreate(event: Create): void {
  let tokenId = event.params.token.toHexString().toLowerCase();
  let token = new Token(tokenId);
  token.address = event.params.token;
  token.name = event.params.name;
  token.symbol = event.params.symbol;
  token.creator = event.params.owner;
  token.curve = event.params.curve;
  token.pair = null;
  token.tokenURI = event.params.tokenURI;
  token.createdAt = event.block.timestamp;
  token.createdBlock = event.block.number;
  token.graduated = false;
  token.listedAt = null;
  token.tradeCount = ZERO;
  token.volumeNative = ZERO_BD;
  token.lastPriceNative = ZERO_BD;
  token.lastTradeAt = null;
  token.save();

  let factory = getOrCreateFactory(factoryId(event.address));
  factory.tokenCount = factory.tokenCount.plus(ONE);
  factory.save();

  BondingCurveTemplate.create(event.params.curve);
}
