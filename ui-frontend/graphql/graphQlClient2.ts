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
import {
  fetchSubgraphToken,
  fetchSubgraphTokens,
  isSubgraphConfigured,
  subgraphTokenToApi,
} from "~~/lib/subgraph/client";
import { apiToCultToken } from "~~/lib/tokens/adapters";

const delay = async <T>(value: T, ms = 40): Promise<T> =>
  new Promise(resolve => {
    setTimeout(() => resolve(value), ms);
  });

async function loadCultTokensFromGraph(options?: {
  graduated?: boolean;
  offset?: number;
  limit?: number;
}): Promise<CultToken[]> {
  if (!isSubgraphConfigured()) return [];
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;
  const tokens = await fetchSubgraphTokens({
    graduated: options?.graduated,
    first: offset + limit,
  });
  return tokens.slice(offset, offset + limit).map(t => apiToCultToken(subgraphTokenToApi(t) as any));
}

export const cultTokensQuery = "";

export const createWatchlist = async (_accountId: string, _tokenId: string): Promise<{ success: boolean }> =>
  delay({ success: true });

export const fetchDiscoverTokenData = async <T>(
  _accountId: `0x${string}` | undefined,
  _apiPath: T,
  options: { offset: number; limit: number },
): Promise<CultTokensResponse> => {
  const cultTokens = await loadCultTokensFromGraph({
    graduated: false,
    offset: options.offset,
    limit: options.limit,
  });
  return { cultTokens };
};

export const fetchTrendingTokensData = async (
  _accountId: `0x${string}` | undefined,
  options: { offset: number; limit: number },
): Promise<CultTokensResponse> => {
  const cultTokens = await loadCultTokensFromGraph({
    offset: options.offset,
    limit: options.limit,
  });
  // Prefer higher trade activity when available
  cultTokens.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  return { cultTokens };
};

export const fetchUpcomingTokens = async (_accountId: `0x${string}` | undefined): Promise<CultToken[]> =>
  loadCultTokensFromGraph({ graduated: false, limit: 24 });

export async function fetchTopCoins(): Promise<CultTokensResponse> {
  const cultTokens = await loadCultTokensFromGraph({ limit: 24 });
  cultTokens.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  return { cultTokens };
}

export const fetchTokenPageData = async (tokenAddress: `0x${string}`): Promise<CultToken | null> => {
  if (!isSubgraphConfigured()) return null;
  const token = await fetchSubgraphToken(tokenAddress);
  if (!token) return null;
  return apiToCultToken(subgraphTokenToApi(token) as any);
};

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
    // Prefer subgraph via shared resolver (server or client through API)
    const { fetchSubgraphTrades, isSubgraphConfigured } = await import("~~/lib/subgraph/client");
    if (isSubgraphConfigured()) {
      const rows = await fetchSubgraphTrades(tokenAddress, first);
      if (rows.length) {
        return rows.map(t => ({
          id: t.id,
          tradeType: t.isBuy ? "BUY" : "SELL",
          trader: String(t.trader),
          recipient: String(t.trader),
          orderReferrer: "",
          ethAmount: String(t.amountNative),
          tokenAmount: String(t.amountToken),
          traderTokenBalance: "0",
          marketType: 0,
          timestamp: new Date(Number(t.timestamp) * 1000).toISOString(),
          transactionHash: t.txHash ? String(t.txHash) : t.id.split("-")[0] || "",
        }));
      }
    }

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
