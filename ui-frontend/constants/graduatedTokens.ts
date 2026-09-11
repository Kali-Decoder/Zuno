export type GraduatedToken = {
  id: `0x${string}`;
  name: string;
  symbol: string;
  imageUrl: string;
  marketCapLabel: string;
  fdvLabel?: string;
  timeAgo: string;
  showV2: boolean;
  partner?: boolean;
};

/** Live data only — populated from Mongo/chain via useApiTokens. */
export const graduatedTokens: GraduatedToken[] = [];
