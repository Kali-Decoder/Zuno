import { useEffect, useState } from "react";

export function useCreateAccount() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function createAccount(body: { user_id: string; twitter?: string; discord?: string; referral_code?: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = { reputation: 0, communities: [], ...body };
      setData(res);
      return res;
    } finally {
      setLoading(false);
    }
  }

  return { createAccount, loading, error, data };
}

export function useGetAccount(userId: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }
    setData({ user_id: userId, reputation: 0, communities: [] });
    setError(null);
    setLoading(false);
  }, [userId]);

  return { data, loading, error };
}

export function useGetAccountCommunities(accountId: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(Boolean(accountId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData([]);
    setLoading(false);
  }, [accountId]);

  return { data, loading, error };
}

export function useGetMerkleProof(accountId: string, tokenId: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(accountId && tokenId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId || !tokenId) return;
    setData(null);
    setLoading(false);
  }, [accountId, tokenId]);

  return { data, loading, error };
}

export function useGetCommunities() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData([]);
    setLoading(false);
  }, []);

  return { data, loading, error };
}

export function useGetDiamondHands() {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData([]);
    setLoading(false);
  }, []);

  return { data, loading, error };
}

export async function getLeaderboardData() {
  return [] as {
    id: string;
    user_id: string;
    reputation: string;
    displayAddress: string;
    rank: number;
    global_rank: number;
  }[];
}

export async function getMerkleProof(_userAddress: string, _tokenAddress: string) {
  return { merkle_proof: [] as string[], proof: [] as string[], root: "", amount: "0" };
}

interface AccountRankResponse {
  user_id: string;
  global_rank: number;
  reputation: number | null;
}

export async function getUserRank(userId: string): Promise<AccountRankResponse> {
  return {
    user_id: userId,
    global_rank: 0,
    reputation: null,
  };
}
