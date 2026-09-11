export type TokenDetail = {
  id: `0x${string}`;
  name: string;
  symbol: string;
  imageUrl: string;
  description: string;
  marketCapLabel: string;
  liquidityLabel: string;
  volume24hLabel: string;
  athLabel: string;
  change1h: number;
  burnedLabel: string;
  burnedUsd: string;
  burnedPct: string;
  progress?: number;
  timeAgo?: string;
  graduated: boolean;
  curve?: string;
  pair?: string;
  phase?: string;
  curveLocked?: boolean;
  inactive?: boolean;
  recyclingEligible?: boolean;
  vaultStatus?: string;
  creator?: string;
  priceLabel?: string;
  priceNative?: number;
  marketCapUsd?: number;
  marketCapNative?: number;
  liquidityNative?: number;
  volumeNative?: number;
  txCount?: number;
  reserveNativeLabel?: string;
  proposal?: {
    id: number;
    state?: string;
    candidates?: string[];
    endTime?: string;
    winner?: string;
    executed?: boolean;
  } | null;
  socials: {
    x?: string;
    dexscreener?: string;
    geckoterminal?: string;
    pool?: string;
    curve?: string;
    contract?: string;
  };
};

/** No catalog fallback — token detail comes from Mongo/chain only. */
export function getTokenDetail(_id: string): TokenDetail | null {
  return null;
}

export function getMockChartSeries(_id: string, _points = 48): { t: number; v: number }[] {
  return [];
}

export function getMockTrades(_id: string): {
  id: string;
  buy: boolean;
  amountLabel: string;
  address: string;
  ethLabel: string;
  usdLabel: string;
  timeLabel: string;
}[] {
  return [];
}
