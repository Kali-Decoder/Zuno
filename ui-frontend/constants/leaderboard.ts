import { shortenAddress } from "~~/utils/addressShort";

export type LeaderboardSeed = {
  address: string;
  reputation: number;
};

/** Seeded leaderboard entries — addresses with mock reputation scores. */
export const LEADERBOARD_SEEDS: LeaderboardSeed[] = [
  { address: "0x90Fb376cCFf6A35eba2681eBA793382A59f6964A", reputation: 42870.42 },
  { address: "0x42796968c248F89F0bcAD8D1b9d501653Dc71db2", reputation: 38125.17 },
  { address: "0x8c23385806382Fe9d56066F8f16fE3Ea0dFc1A7f", reputation: 34992.08 },
  { address: "0xcf10305722793DF476a50C240BA2d4E7B8Cd7869", reputation: 29741.63 },
  { address: "0x1A8e0Ed259D3049e43727Cb0dBBd0754cf4F5ccD", reputation: 26418.55 },
  { address: "0x925E5d1818Dae2BdA539Ee2aE700afe414565D1E", reputation: 22106.91 },
  { address: "0x6720Af0c692Ec33215B3ec6269a8817e0e04F2E2", reputation: 19854.33 },
  { address: "0x646dDcf66c388AD9BF8D41C418FA8B4bbdE60830", reputation: 17502.76 },
  { address: "0x38091725DBa43F390F66e7B8CAEFb5A407892247", reputation: 14887.2 },
  { address: "0x5296220B17994Aae125dCe5aF4d5E2796C7F803F", reputation: 12341.88 },
  { address: "0x8661942Af552Adc37CC898d201B240636b760231", reputation: 9876.45 },
  { address: "0x2fb356e3b2e2485092D769d9FF5Fc805663c011C", reputation: 7643.12 },
  { address: "0xb66fFA3d9D7a9162a164d040c184232eCAcDF0AF", reputation: 5320.67 },
  { address: "0x9c373eE5ab47c68435E6fDD6610e67306C8b671f", reputation: 3188.94 },
  { address: "0x49b525522F9c49cFA156ba967F2Eb63D088f3806", reputation: 1542.39 },
];

export type LeaderboardRow = {
  id: string;
  user_id: string;
  reputation: string;
  displayAddress: string;
  rank: number;
  global_rank: number;
};

export function getSeededLeaderboard(): LeaderboardRow[] {
  const sorted = [...LEADERBOARD_SEEDS].sort((a, b) => b.reputation - a.reputation);
  return sorted.map((entry, index) => {
    const rank = index + 1;
    return {
      id: entry.address,
      user_id: entry.address,
      reputation: entry.reputation.toFixed(2),
      displayAddress: shortenAddress(entry.address),
      rank,
      global_rank: rank,
    };
  });
}

export function getSeededUserRank(userId: string): {
  user_id: string;
  global_rank: number;
  reputation: number | null;
} {
  const board = getSeededLeaderboard();
  const match = board.find(row => row.user_id.toLowerCase() === userId.toLowerCase());
  if (!match) {
    return { user_id: userId, global_rank: 0, reputation: null };
  }
  return {
    user_id: match.user_id,
    global_rank: match.global_rank,
    reputation: Number(match.reputation),
  };
}
