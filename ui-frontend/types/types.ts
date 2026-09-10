export type MemeCoin = {
  name: string;
  token: string;
  creator: string;
  img: string;
  description: string;
  netWorth: number;
};

export type RankingsRow = {
  position: number;
  name: {
    name: string;
    imageUrl: string;
  };
  marketCap: string;
  volume: string;
  airdropped: number;
};

export type NavigationItem = {
  id: string;
  href: string;
  label: string;
};

export enum TradeOptions {
  BUY = "buy",
  SELL = "sell",
}

export type Comment = {
  profileIconUrl: string;
  author: string;
  content: string;
  likes: number;
  liked?: boolean;
  createdAt: Date;
};

export type CultToken = {
  // Required fields (actually used in the UI)
  id: `0x${string}`;
  name: string;
  symbol: string;
  tokenCreator: string;
  airdropContract: string;
  poolAddress: string;
  isGraduated: boolean;
  isWatchlisted: boolean;
  marketCap: number;
  blockTimestamp: string;
  imageUrl?: string;
  description?: string;

  // Optional fields (not currently used in UI)
  bondingCurvePercentage?: number;
  buyTxCount24h?: number;
  creatorHoldings?: number;
  holderCount?: number;
  ipfsContent?: string;
  lastTraded?: string;
  sellTxCount24h?: number;
  topHolders?: number;
  totalAirdropRecipientCount?: number;
  volume?: number;
  volume24h?: number;
  socials?: SocialLink;
};

export interface TokenMetadata {
  name: string;
  description: string;
  image: string | File | null;
  tokenAddress: `0x${string}`;
  symbol: string; // Add symbol to metadata for consistency
  socials?: SocialLink;
  marketCap?: string;
  price?: string;
  circulatingSupply?: string;
}

export interface TokenCreated {
  id: string;
  name: string;
  symbol: string;
  image?: string | File; // Add the image field
}

export interface Balance {
  id: string;
  lastBought: string;
  lastSold: string;
  token_id: string;
  value: string;
  image?: string | File;
  name: string;
  symbol: string;
}

export interface TokensCreatedResponse {
  accountData: AccountData | null;
}

export interface CultTokensResponse {
  cultTokens: CultToken[];
}

export interface Community {
  name: string;
  img_url: string;
  chain: string;
  merkle_root: string;
  holder_count: number;
  community_score: number;
}

export interface SocialLink {
  twitter?: string;
  telegram?: string;
  discord?: string;
  website?: string;
}

export interface IPFSMetadata {
  name: string;
  symbol: string;
  description: string;
  socials: SocialLink;
  imageUrl: File | null | string; // For file input
}

export type TopHolder = {
  id: string;
  value: number;
};

export type TokenTrade = {
  id: string;
  tradeType: string;
  trader: string;
  recipient: string;
  orderReferrer: string;
  ethAmount: string;
  tokenAmount: string;
  traderTokenBalance: string;
  marketType: number;
  timestamp: string;
  transactionHash: string;
};

export type TokenTradesData = {
  tokenTrades: TokenTrade[];
};

export type AccountProfileToken = {
  id: "string";
  ipfsContent: "string";
  name: "string";
  symbol: "string";
  userBalance: "string";
};

export interface AccountProfileData {
  airdroppedTokens: {
    id: string;
    ipfsContent: string;
    name: string;
    symbol: string;
  }[];
  communities: {
    id: "string";
    imgUrl: "string";
    name: "string";
  }[];
  createdTokens: AccountProfileToken[];
  ownedTokens: AccountProfileToken[];
  watchlist: AccountProfileToken[];
}

export interface AirdropResponse {
  tokenId: string;
  accountId: string;
  merkleRoot: string;
  merkleProof: string[];
  communityId: string;
  communityName: string;
  totalAmount: string;
  transactionHash: string;
}

export interface AccountData {
  diamondHandProbability: number;
  discord: string;
  feeCollected?: string | bigint; // BigInt often mapped as string in GraphQL
  id: string;
  referralCode: string;
  referrerId: string;
  slug: string;
  tokensCreated: number;
  tokensMigrated: number;
  totalReferrals: number;
  twitter: string;
}

export interface CreateAccount {
  referralCode: string;
  userId: string;
}

export interface AccountDetailsResponse {
  Account: AccountProfileData[];
}
