"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAccount } from "wagmi";
import CopyAddressToClipboard from "../common/CopyAddressToClipboard";
import Pagination from "../common/Pagination";
import { Spinner } from "../common/Spinner";
import Table, { TableColumnInterface, TableValueInterface } from "../common/Table";
import { getLeaderboardData, getUserRank } from "~~/hooks/api-hooks";
import { notification } from "~~/lib/notification";
import { cn } from "~~/lib/utils";
import { shortenAddress } from "~~/utils/addressShort";

export enum ColumnType {
  NAME = "name",
  REPUTATION = "reputation",
  POSITION = "position",
}

interface LeaderboardEntry extends TableValueInterface {
  id: string;
  address: string;
  name: string;
  reputation: string;
  position: number;
}

const POSITION_COLUMN: TableColumnInterface = {
  title: "#",
  accessor: (rowData: TableValueInterface) => rowData[ColumnType.POSITION],
  widthPercentage: 2,
  renderer: (value: any) => {
    const rank = Number(value);
    return (
      <div
        className={cn(
          "grid size-[2.8rem] place-content-center rounded-full text-[1.2rem] font-semibold tabular-nums sm:size-[3.2rem] sm:text-[1.35rem]",
          rank === 1 && "bg-accent-500 text-black",
          rank === 2 && "bg-white/15 text-white",
          rank === 3 && "bg-white/10 text-white/80",
          rank > 3 && "bg-white/[0.04] font-normal text-white/55",
        )}
      >
        {value}
      </div>
    );
  },
};

const HOLDER_COLUMN: TableColumnInterface = {
  title: "Trader",
  accessor: (rowData: TableValueInterface) => rowData[ColumnType.NAME],
  widthPercentage: 10,
  renderer: (_: any, rowData?: TableValueInterface) => {
    if (!rowData) return null;
    return (
      <div className="flex items-center gap-2">
        <CopyAddressToClipboard address={String(rowData.address)} />
      </div>
    );
  },
};

const PERCENTAGE_COLUMN: TableColumnInterface = {
  title: "Score",
  accessor: (rowData: TableValueInterface) => `${rowData[ColumnType.REPUTATION]}`,
  widthPercentage: 30,
  renderer: (value: any, rowData?: TableValueInterface) => {
    const position = rowData ? Number(rowData[ColumnType.POSITION]) : 0;
    return (
      <p
        className={cn(
          "inline-block rounded-full px-[0.9rem] py-[0.45rem] text-[1.25rem] tabular-nums sm:px-[1.2rem]",
          position === 1 && "bg-accent-500/15 font-semibold text-accent-500",
          position === 2 && "bg-white/10 font-medium text-white",
          position === 3 && "bg-white/[0.06] font-medium text-white/80",
          position > 3 && "text-white/70",
        )}
      >
        {value}
      </p>
    );
  },
};

const columns = [POSITION_COLUMN, HOLDER_COLUMN, PERCENTAGE_COLUMN];
const ITEMS_PER_PAGE = 10;

const SearchResultNotification = ({
  address,
  rank,
  score,
  isOutsideTop100,
}: {
  address: string;
  rank: number;
  score: string;
  isOutsideTop100?: boolean;
}) => (
  <div className="ml-1 flex flex-col">
    <p className="mb-1 text-[1.4rem] font-bold">Search result</p>
    <p className="text-[1.2rem]">
      <span className="font-semibold">Address:</span> {shortenAddress(address)} ·{" "}
      <span className="font-semibold">Rank:</span> #{rank} · <span className="font-semibold">Score:</span> {score}
    </p>
    {isOutsideTop100 && <p className="mt-1 text-[1rem] text-accent-500/80">Outside the current top 100</p>}
  </div>
);

const NotFoundNotification = ({ searchTerm }: { searchTerm: string }) => (
  <div className="ml-1 flex flex-col">
    <p className="mb-1 text-[1.4rem] font-bold">Address not found</p>
    <p className="text-[1.2rem]">
      <span className="font-semibold">{shortenAddress(searchTerm)}</span> is not on the board yet.
    </p>
  </div>
);

const LeaderboardsTab = () => {
  const { address: accountAddress } = useAccount();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchAddress, setSearchAddress] = useState("");
  const [searchResult, setSearchResult] = useState<LeaderboardEntry | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [userRankData, setUserRankData] = useState<LeaderboardEntry | null>(null);
  const [loadingUserRank, setLoadingUserRank] = useState(false);

  useEffect(() => {
    const calculateTimeUntilRefresh = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      const timeDiff = tomorrow.getTime() - now.getTime();
      setTimeUntilRefresh({
        hours: Math.floor(timeDiff / (1000 * 60 * 60)),
        minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((timeDiff % (1000 * 60)) / 1000),
      });
    };
    calculateTimeUntilRefresh();
    const interval = setInterval(calculateTimeUntilRefresh, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const data = await getLeaderboardData();
        setLeaderboardData(
          data.map((item: any, index: number) => ({
            name: shortenAddress(item?.id) || `Holder ${index + 1}`,
            address: item?.id,
            reputation: parseFloat(item.reputation).toFixed(2),
            id: item.id,
            position: index + 1,
          })),
        );
      } catch {
        /* empty board is fine */
      } finally {
        setLoadingLeaderboard(false);
      }
    }
    void fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!accountAddress) return;
    setLoadingUserRank(true);
    getUserRank(accountAddress)
      .then(rankData => {
        if (rankData?.global_rank && rankData.reputation != null) {
          setUserRankData({
            id: accountAddress,
            address: accountAddress,
            name: shortenAddress(accountAddress),
            reputation: parseFloat(rankData.reputation.toString()).toFixed(2),
            position: rankData.global_rank,
          });
        } else {
          setUserRankData(null);
        }
      })
      .catch(() => setUserRankData(null))
      .finally(() => setLoadingUserRank(false));
  }, [accountAddress]);

  const totalPages = Math.max(1, Math.ceil(leaderboardData.length / ITEMS_PER_PAGE));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return leaderboardData.slice(start, start + ITEMS_PER_PAGE).map((item, index) => ({
      ...item,
      position: start + index + 1,
    }));
  }, [currentPage, leaderboardData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    const searchTerm = searchAddress.trim();
    try {
      const rankData = await getUserRank(searchTerm);
      if (rankData?.global_rank && rankData.reputation != null) {
        const result = {
          id: searchTerm,
          address: searchTerm,
          name: shortenAddress(searchTerm),
          reputation: parseFloat(rankData.reputation.toString()).toFixed(2),
          position: rankData.global_rank,
        };
        setSearchResult(result);
        const isOutsideTop100 = rankData.global_rank > 100;
        notification.success(
          <SearchResultNotification
            address={result.address}
            rank={result.position}
            score={result.reputation}
            isOutsideTop100={isOutsideTop100}
          />,
          { duration: 5000 },
        );
        if (!isOutsideTop100) {
          setCurrentPage(Math.ceil(rankData.global_rank / ITEMS_PER_PAGE));
        }
      } else {
        setSearchResult(null);
        notification.error(<NotFoundNotification searchTerm={searchTerm} />, { duration: 5000 });
      }
    } catch {
      setSearchResult(null);
      notification.error(<NotFoundNotification searchTerm={searchTerm} />, { duration: 5000 });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchAddress("");
    setSearchResult(null);
  };

  return (
    <div className="page-container pb-[6rem]">
      <section className="relative mb-[1.6rem] overflow-hidden rounded-[1.8rem] border border-white/[0.06] bg-[#121212]">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 0% 0%, rgba(194,255,44,0.07), transparent 55%)",
          }}
        />
        <div className="relative p-[1.6rem] sm:p-[2.2rem]">
          <div className="flex flex-col gap-[1.6rem] lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-[0.6rem]">
              <div className="flex flex-wrap items-baseline gap-[1rem]">
                <h1 className="text-[2.8rem] font-semibold tracking-tight text-white sm:text-[3.2rem]">Leaderboard</h1>
                <span className="rounded-full bg-white/[0.06] px-[1rem] py-[0.35rem] text-[1.15rem] text-white/45">
                  {leaderboardData.length.toLocaleString()} traders
                </span>
              </div>
              <p className="max-w-[44rem] text-[1.25rem] text-white/40">
                Ranked by Reflow trading activity on Monad Testnet.
              </p>
            </div>

            <p className="font-mono text-[1.15rem] tabular-nums text-white/35">
              Refresh in {String(timeUntilRefresh.hours).padStart(2, "0")}:
              {String(timeUntilRefresh.minutes).padStart(2, "0")}:
              {String(timeUntilRefresh.seconds).padStart(2, "0")}
            </p>
          </div>

          <form onSubmit={handleSearch} className="mt-[1.8rem] flex flex-col gap-[0.8rem] sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-[1.2rem] top-1/2 size-[1.4rem] -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchAddress}
                onChange={e => setSearchAddress(e.target.value)}
                placeholder="Search by wallet address"
                className="w-full rounded-full border border-white/[0.08] bg-[#0c0c0c] py-[1.1rem] pl-[3.8rem] pr-[3.2rem] text-[1.3rem] text-white outline-none placeholder:text-white/25 focus:border-accent-500/40"
              />
              {searchAddress && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-[1.2rem] top-1/2 -translate-y-1/2 text-[1.2rem] text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchAddress.trim()}
              className="inline-flex items-center justify-center gap-[0.5rem] rounded-full bg-accent-500 px-[1.8rem] py-[1.1rem] text-[1.3rem] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isSearching ? <Spinner className="size-[1.5rem]" /> : "Search"}
            </button>
          </form>
        </div>
      </section>

      {accountAddress && (
        <section className="mb-[1.6rem] rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.4rem] sm:p-[1.8rem]">
          <div className="flex flex-col gap-[0.8rem] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[1.1rem] uppercase tracking-[0.06em] text-white/30">Your rank</p>
              <p className="mt-[0.3rem] font-mono text-[1.2rem] text-white/40">{shortenAddress(accountAddress)}</p>
            </div>
            {loadingUserRank ? (
              <Spinner className="size-[1.6rem]" />
            ) : userRankData ? (
              <div className="flex items-center gap-[1.2rem]">
                <div className="rounded-full bg-accent-500/15 px-[1.2rem] py-[0.55rem] text-[1.3rem] font-semibold text-accent-500">
                  #{userRankData.position}
                </div>
                <p className="text-[1.4rem] text-white/80">
                  Score <span className="font-semibold tabular-nums text-white">{userRankData.reputation}</span>
                </p>
              </div>
            ) : (
              <p className="max-w-[36rem] text-[1.25rem] text-white/40">
                No score yet — trade bonding-curve tokens on Reflow to climb the board.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.4rem] sm:p-[1.8rem]">
        {loadingLeaderboard ? (
          <div className="grid h-[28rem] place-content-center">
            <Spinner />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="grid h-[22rem] place-content-center px-[2rem] text-center">
            <p className="text-[1.5rem] text-white/50">No leaderboard data yet</p>
            <p className="mt-[0.5rem] text-[1.25rem] text-white/30">
              Rankings will appear as traders buy and sell on the curve.
            </p>
          </div>
        ) : (
          <>
            <Table values={paginatedData} columns={columns} highlightedRowId={searchResult?.id} />
            <div className="mt-[1.2rem]">
              <Pagination
                currentPage={currentPage}
                onPageChange={page => setCurrentPage(page)}
                sibling={1}
                totalPages={totalPages}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default LeaderboardsTab;
