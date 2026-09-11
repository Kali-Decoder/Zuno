export type ExploreBadge = "V2" | "OG" | "warn" | null;

export type ExploreToken = {
  id: `0x${string}`;
  name: string;
  symbol: string;
  imageUrl: string;
  marketCapLabel: string;
  progress: number;
  timeAgo: string;
  badge: ExploreBadge;
  volume: number;
  createdAt: number;
  lastBuyAt: number;
};

/** Live data only — populated from Mongo/chain via useApiTokens. */
export const exploreTokens: ExploreToken[] = [];
