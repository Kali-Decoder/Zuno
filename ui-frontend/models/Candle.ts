import { Schema, models, model } from "mongoose";

export type CandleInterval = "1m" | "5m" | "1h" | "1d";

export type CandleDoc = {
  id: string; // token-interval-openTimeMs
  token: string;
  interval: CandleInterval;
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volumeNative: number;
  tradeCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const CandleSchema = new Schema<CandleDoc>(
  {
    id: { type: String, required: true, unique: true },
    token: { type: String, required: true, lowercase: true, index: true },
    interval: { type: String, enum: ["1m", "5m", "1h", "1d"], required: true },
    openTime: { type: Date, required: true, index: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volumeNative: { type: Number, required: true, default: 0 },
    tradeCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

CandleSchema.index({ token: 1, interval: 1, openTime: 1 }, { unique: true });

export const CandleModel = models.Candle || model<CandleDoc>("Candle", CandleSchema);
