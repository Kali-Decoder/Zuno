import {
  AccountData,
  AccountProfileData,
  AirdropResponse,
  Community,
  CultToken,
  CultTokensResponse,
  TokenTrade,
  TokensCreatedResponse,
} from "~~/types/types";

const delay = async <T>(value: T, ms = 40): Promise<T> =>
  new Promise(resolve => {
    setTimeout(() => resolve(value), ms);
  });

export const cultTokensQuery = "";

export const createWatchlist = async (_accountId: string, _tokenId: string): Promise<{ success: boolean }> =>
  delay({ success: true });

export const fetchDiscoverTokenData = async <T>(
  _accountId: `0x${string}` | undefined,
  _apiPath: T,
  _options: { offset: number; limit: number },
): Promise<CultTokensResponse> => delay({ cultTokens: [] });

export const fetchTrendingTokensData = async (
  _accountId: `0x${string}` | undefined,
  _options: { offset: number; limit: number },
): Promise<CultTokensResponse> => delay({ cultTokens: [] });

export const fetchUpcomingTokens = async (_accountId: `0x${string}` | undefined): Promise<CultToken[]> => delay([]);

export async function fetchTopCoins(): Promise<CultTokensResponse> {
  return delay({ cultTokens: [] });
}

export const fetchTokenPageData = async (_tokenAddress: `0x${string}`): Promise<CultToken | null> => delay(null);

export const fetchTopHolders = async (_tokenAddress: string, _first = 10, _skip = 0) =>
  delay({ topHolders: [] as { id: string; value: number }[] });

export const fetchWatchList = async (_args: { accountId: string }): Promise<CultTokensResponse> =>
  delay({ cultTokens: [] });

export const fetchAccountData = async (_accountId: string): Promise<AccountProfileData> =>
  delay({
    airdroppedTokens: [],
    communities: [],
    createdTokens: [],
    ownedTokens: [],
    watchlist: [],
  } as unknown as AccountProfileData);

export const fetchAccount = async (accountId: string): Promise<AccountData> =>
  delay({
    diamondHandProbability: 0,
    discord: "",
    feeCollected: "0",
    id: accountId,
    referralCode: "",
    referrerId: "",
    slug: "",
    tokensCreated: 0,
    tokensMigrated: 0,
    totalReferrals: 0,
    twitter: "",
  });

export const createAccount = async (payload: {
  user_id: string;
  twitter?: string;
  discord?: string;
  referral_code?: string;
}) => delay({ success: true, ...payload });

export const fetchAirdrop = async (_accountId: string, tokenAddress: `0x${string}`): Promise<AirdropResponse | null> =>
  delay(null);

export async function fetchTokenTrades(tokenAddress: string, first = 20, _skip = 0): Promise<TokenTrade[]> {
  try {
    const res = await fetch(`/api/tokens/${tokenAddress}/trades?limit=${first}`);
    const data = await res.json();
    const rows = (data.trades || []) as Array<{
      id: string;
      buy: boolean;
      trader: string;
      amountNative: number;
      amountToken: number;
      timestamp: string;
      txHash: string;
    }>;
    return rows.map(t => ({
      id: t.id,
      tradeType: t.buy ? "BUY" : "SELL",
      trader: t.trader,
      recipient: t.trader,
      orderReferrer: "",
      ethAmount: String(t.amountNative),
      tokenAmount: String(t.amountToken),
      traderTokenBalance: "0",
      marketType: 0,
      timestamp: t.timestamp,
      transactionHash: t.txHash,
    }));
  } catch {
    return [];
  }
}

export async function fetchHolderDistribution(_tokenAddress: string) {
  return delay({ top10: 0, top50: 0, others: 0 });
}

export async function fetchCommunities(): Promise<Community[]> {
  return delay([]);
}

export const fetchTokensCreated = async (accountId: string): Promise<TokensCreatedResponse> =>
  delay({
    accountData: await fetchAccount(accountId),
  });

export const fetchAccountDetails = async (
  accountId: string,
): Promise<{ accountData: AccountProfileData | null }> => {
  const accountData = await fetchAccountData(accountId);
  return { accountData };
};
