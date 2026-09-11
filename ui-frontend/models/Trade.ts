import { Schema, models, model } from "mongoose";

export type TradeDoc = {
  id: string; // txHash-logIndex
  token: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  timestamp: Date;
  trader: string;
  isBuy: boolean;
  amountNative: number;
  amountToken: number;
  priceNative: number;
  source: "curve" | "dex";
  createdAt: Date;
  updatedAt: Date;
};

const TradeSchema = new Schema<TradeDoc>(
  {
    id: { type: String, required: true, unique: true },
    token: { type: String, required: true, lowercase: true, index: true },
    txHash: { type: String, required: true, lowercase: true },
    logIndex: { type: Number, required: true },
    blockNumber: { type: Number, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    trader: { type: String, required: true, lowercase: true },
    isBuy: { type: Boolean, required: true },
    amountNative: { type: Number, required: true },
    amountToken: { type: Number, required: true },
    priceNative: { type: Number, required: true },
    source: { type: String, enum: ["curve", "dex"], required: true },
  },
  { timestamps: true },
);

TradeSchema.index({ token: 1, timestamp: -1 });
TradeSchema.index({ token: 1, blockNumber: 1 });

export const TradeModel = models.Trade || model<TradeDoc>("Trade", TradeSchema);
