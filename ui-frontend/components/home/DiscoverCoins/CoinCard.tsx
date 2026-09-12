"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import CoinHeader from "../CoinHeader";
import TradeInfo from "~~/components/coin/BuyNSell";
import EligibilityDialog from "~~/components/coin/BuyNSell/EligibilityDialog";
import { Dialog, DialogContent, DialogTrigger } from "~~/components/common/Dialog";
import HoverButton from "~~/components/common/HoverButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~~/components/common/Tabs";
import { Button } from "~~/components/common/button";
import { cn, formatWeiValues } from "~~/lib/utils";
import { useTokenStore } from "~~/stores/tokenStore";
import { CultToken, TokenMetadata, TradeOptions } from "~~/types/types";
import { useAuth } from "~~/components/AuthProvider";
const MINIMUM_MARKETCAP_USD = 100000;

const CoinCard = ({ className, stage, token }: { className?: string; stage: "Prebuy" | "Live"; token: CultToken }) => {
  const containerRef = useRef<HTMLElement>(null);
  const { setTokenAddress, setMetadata } = useTokenStore();

  const isPreBuyPhase = stage === "Prebuy";
  const isLivePhase = stage === "Live";
  const isInactive = Boolean(
    token.inactive ||
    token.phase === "inactive" ||
    token.vaultStatus === "Inactive" ||
    token.recyclingEligible,
  );

  // HARDCODED TIMER SETTINGS - Easy to adjust
  const TOTAL_PREBUY_HOURS = 24; // Total duration of pre-buy phase
  const REMAINING_HOURS = 18; // How many hours are left (you can change this)
  const REMAINING_MINUTES = 45; // How many minutes are left (you can change this)

  // Timer state for pre-buy phase countdown
  const [timeRemaining, setTimeRemaining] = useState({
    hours: REMAINING_HOURS,
    minutes: REMAINING_MINUTES,
    seconds: 0,
    totalSeconds: REMAINING_HOURS * 3600 + REMAINING_MINUTES * 60,
  });
  const { isValidChain: isValidchain } = useAuth();
  useEffect(() => {
    if (!isPreBuyPhase) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev.totalSeconds <= 0) {
          clearInterval(interval);
          return prev;
        }

        const newTotalSeconds = prev.totalSeconds - 1;
        const hours = Math.floor(newTotalSeconds / 3600);
        const minutes = Math.floor((newTotalSeconds % 3600) / 60);
        const seconds = newTotalSeconds % 60;

        return {
          hours,
          minutes,
          seconds,
          totalSeconds: newTotalSeconds,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPreBuyPhase]);

  // Calculate progress percentage (0-100)
  const totalPrebuySeconds = TOTAL_PREBUY_HOURS * 3600;
  const elapsedSeconds = totalPrebuySeconds - timeRemaining.totalSeconds;
  const progressPercentage = isPreBuyPhase
    ? Math.max(0, Math.min(100, (elapsedSeconds / totalPrebuySeconds) * 100))
    : 100;

  // Function to set token data when opening trade dialog
  const handleTradeDialogOpen = () => {
    setTokenAddress(token.id as `0x${string}`);

    // Create metadata from our centralized token data
    const metadata: TokenMetadata = {
      name: token.name,
      description: token.description || "",
      image: token.imageUrl || "/diamondHands.png", // Use the direct image URL
      tokenAddress: token.id,
      symbol: token.symbol,
    };

    setMetadata(metadata);
  };

  // Function to handle phase badge click
  const handlePhaseBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click events
    // Could show a modal or tooltip with phase information
    console.log(`${token.name} is in ${stage} phase`);
  };

  return (
    <article
      className={cn(
        "bg-primary-400 w-fit sm:w-full  relative z-0 rounded-sm border-white/10 border-[1px] hover:border-white group",
        className,
      )}
      ref={containerRef}
      data-tour="token-card"
      data-stage={stage}
    >
      <div className="absolute h-full w-full bg-primary-radial z-[-1] rounded-sm"></div>

      <div className="p-[1.2rem] space-y-[0.8rem] md:space-y-[0.8rem]">
        <div className="flex flex-col items-start gap-[0.8rem]">
          <div className="relative">
            <Image
              width={280}
              height={280}
              src={token.imageUrl || "/diamondHands.png"}
              alt={`${token.name} Logo`}
              className="bg-black w-full aspect-square object-cover duration-300 transition-transform rounded-sm"
            />
            <div className="absolute h-full w-full bg-black/10 top-0 rounded-sm" />

            {/* Inactive tag on image */}
            {isInactive && (
              <div
                className="absolute top-[0.8rem] left-[0.8rem] z-10 flex items-center gap-[0.4rem] rounded-full border border-orange-500/40 bg-orange-500/25 px-[0.85rem] py-[0.35rem] text-[1.1rem] font-semibold text-orange-300 backdrop-blur-md shadow-sm"
                title="Inactive token - Low activity, eligible for LP recycling"
              >
                <span className="size-[0.65rem] rounded-full bg-orange-400" />
                <span>Inactive</span>
              </div>
            )}

            <button
              onClick={handlePhaseBadgeClick}
              className={cn(
                "group absolute top-[0.8rem] right-[0.8rem] rounded-full uppercase leading-none sm:text-[1.4rem] px-[0.8rem] border py-[0.4rem] font-semibold font-mono tracking-wider text-sm flex items-center gap-2 transition-all duration-200 cursor-pointer backdrop-blur-sm",
                "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent",
                isPreBuyPhase &&
                  "bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black border-yellow-300 focus:ring-yellow-400",
                !isPreBuyPhase && isInactive &&
                  "bg-gradient-to-br from-orange-800 to-orange-950 hover:from-orange-700 hover:to-orange-800 text-orange-300 border-orange-400 focus:ring-orange-400",
                !isPreBuyPhase && !isInactive && isLivePhase &&
                  "bg-gradient-to-br from-green-800 to-green-900 hover:from-green-700 hover:to-green-800 text-green-300 border-green-400 focus:ring-green-400",
              )}
              title={
                isPreBuyPhase
                  ? "Pre-buy Phase - Diamond Hands Only"
                  : isInactive
                  ? "Inactive Phase - Eligible for LP Recycling"
                  : "Live Trading - Open to Everyone"
              }
              aria-label={`Token is in ${isPreBuyPhase ? "pre-buy" : isInactive ? "inactive" : "live trading"} phase`}
            >
              {/* Background texture overlay */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full opacity-20",
                  isPreBuyPhase && "bg-gradient-to-br from-white/30 to-transparent",
                  isInactive && "bg-gradient-to-br from-orange-400/30 to-transparent",
                  !isInactive && isLivePhase && "bg-gradient-to-br from-white/20 to-transparent",
                )}
              ></div>

              {/* Subtle dot pattern texture */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full opacity-10",
                  "bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.3)_1px,transparent_0)]",
                  "bg-[length:8px_8px]",
                )}
              ></div>

              {/* Content */}
              <div className="relative flex items-center gap-2">
                {isInactive ? (
                  <div className="relative">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  </div>
                ) : isLivePhase ? (
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-400/50 rounded-full animate-ping"></div>
                  </div>
                ) : null}
                <span className="relative font-semibold">
                  {isPreBuyPhase ? "Pre-buy" : isInactive ? "Inactive" : "Live"}
                </span>
              </div>

              <div className="absolute inset-0 rounded-full opacity-30"></div>

              {/* Hover glow effect */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                  isPreBuyPhase && "",
                  isLivePhase && "",
                )}
              ></div>
            </button>
          </div>
          <CoinHeader
            title={token.name}
            symbol={token.symbol}
            tokenId={token.id}
            creatorId={token.tokenCreator}
            age={token.blockTimestamp}
            isWatchlisted={token.isWatchlisted}
            isInactive={isInactive}
          />
        </div>

        <div className="text-[1rem] md:text-[1.2rem] flex flex-col justify-between gap-[1.2rem] items-stretch">
          {/* Market Cap & Holders Section - Only show for Live tokens */}
          {isLivePhase ? (
            <div className="overflow-y-hidden space-y-[0.4rem]">
              {/* Market Cap */}
              <div className="font-bold text-[1.2rem] md:text-[1.4rem] flex justify-between text-white">
                <span>Market Cap</span>
                <span className="text-accent-500">${formatWeiValues(token.marketCap)}</span>
              </div>

              {/* Holders */}
              <div className="font-bold text-[1.2rem] md:text-[1.4rem] flex justify-between text-white">
                <span>Holders</span>
                <span className="text-accent-500">{(token.holderCount || 0).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="overflow-y-hidden">
              <div
                className="space-y-[0.2rem] cursor-help"
                title="Pre-buy Phase - Exclusive early access for diamond hands holders. Market cap and public trading will be available once the token graduates to live phase."
              >
                <div className="text-[0.8rem] text-white/60 flex justify-between">
                  <span>Access</span>
                  <span className="text-accent-500 font-medium">Diamond Hands Only</span>
                </div>
                <div className="text-[0.8rem] text-white/60 flex justify-between">
                  <span>Market Cap</span>
                  <span className="text-white/50">TBD at Launch</span>
                </div>
              </div>
            </div>
          )}

          {/* Token Phase Progress Indicator */}
          <div className="flex flex-col gap-[0.6rem] pt-[0.4rem] border-t border-white/10" data-tour="phase-indicator">
            <div className="text-[0.9rem] text-white/70 font-medium">Token Phase</div>

            {/* Goes Live In timer - positioned above the main phase line */}
            {isPreBuyPhase && timeRemaining.totalSeconds > 0 && (
              <div className="flex justify-end">
                <div className="flex items-center gap-1 text-[0.7rem] text-green-400 font-mono bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                  <span>
                    Goes Live In {timeRemaining.hours}h {timeRemaining.minutes}m
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-[0.8rem]">
              {/* Pre-buy Phase */}
              <div
                className="flex items-center gap-[0.4rem] cursor-help"
                title="Early Access Phase - Exclusive to diamond hands holders"
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2 transition-all duration-300",
                    isPreBuyPhase
                      ? "bg-yellow-500 border-yellow-400 animate-pulse"
                      : "bg-yellow-500 border-yellow-400",
                  )}
                ></div>
                <span
                  className={cn(
                    "text-[0.8rem] font-medium transition-colors duration-300",
                    isPreBuyPhase ? "text-yellow-400" : "text-white/50",
                  )}
                >
                  Pre-buy
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="flex-1 mx-2 relative">
                {/* Background track */}
                <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
                  {/* Progress fill */}
                  <div
                    className={cn(
                      "h-full transition-all duration-1000 ease-out rounded-full",
                      isLivePhase
                        ? "bg-gradient-to-r from-yellow-400 via-green-400 to-green-500"
                        : "bg-gradient-to-r from-yellow-400 to-yellow-500",
                    )}
                    style={{ width: `${progressPercentage}%` }}
                  />
                  {/* Animated shimmer effect for active progress */}
                  {isPreBuyPhase && (
                    <div
                      className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
                      style={{
                        left: `${Math.max(0, progressPercentage - 15)}%`,
                        opacity: progressPercentage > 10 ? 1 : 0,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Live Trading / Inactive Phase - aligned with Pre-buy */}
              {isInactive ? (
                <div
                  className="flex items-center gap-[0.4rem] cursor-help"
                  title="Inactive Pool - Low activity, eligible for LP recycling"
                >
                  <div className="w-3 h-3 rounded-full border-2 bg-orange-400 border-orange-300" />
                  <span className="text-[0.8rem] font-medium text-orange-400">
                    Inactive
                  </span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-[0.4rem] cursor-help"
                  title="Public Trading Phase - Open to everyone"
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full border-2 transition-all duration-300",
                      isLivePhase
                        ? "bg-green-400 border-green-300 animate-pulse"
                        : "bg-transparent border-white/30",
                    )}
                  ></div>
                  <span
                    className={cn(
                      "text-[0.8rem] font-medium transition-colors duration-300",
                      isLivePhase ? "text-green-400" : "text-white/50",
                    )}
                  >
                    Live Trading
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="gap-[0.8rem] grid grid-cols-[repeat(3,auto)] justify-end" data-tour="card-buttons">
          {/* Chart Button - Always visible, disabled in pre-buy stage */}
          {isPreBuyPhase ? (
            <Button
              variant="secondary"
              size="sm"
              disabled
              className="cursor-help"
              title="Chart Unavailable - Charts become available when the token enters Live Trading phase"
            >
              Chart
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <HoverButton size="sm" className="bg-accent-500 hover:bg-accent-600 text-black font-bold">
                  Chart
                </HoverButton>
              </DialogTrigger>
              <DialogContent className="border-white/20 max-w-[1400px] sm:max-h-[800px] w-[90vw] h-[60vh] sm:w-[60vw] sm:h-[60vw] p-0 overflow-hidden rounded-sm">
                <iframe
                  height="100%"
                  width="100%"
                  id="geckoterminal-embed"
                  title="GeckoTerminal Embed"
                  src="https://www.geckoterminal.com/solana/pools/4PoAsh3VoSGDBps6Nxpfs3XNscqf7kLaYQb1dxK4f8SA?embed=1&info=1&swaps=0&grayscale=0&light_chart=0&chart_type=price&resolution=15m"
                  allow="clipboard-write"
                ></iframe>
              </DialogContent>
            </Dialog>
          )}

          {/* Trade Button - Always visible, disabled in pre-buy stage */}
          {isPreBuyPhase ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="cursor-help"
              title="Trading Locked - Currently in pre-buy phase for diamond hands holders only"
            >
              Trade
            </Button>
          ) : (
            <Dialog onOpenChange={open => open && handleTradeDialogOpen()}>
              <DialogTrigger asChild>
                <HoverButton size="sm" className="bg-accent-500 hover:bg-accent-600 text-black font-bold">
                  Trade
                </HoverButton>
              </DialogTrigger>
              <DialogContent className="bg-primary-300 w-[90vw] rounded-sm sm:w-full sm:max-w-2xl border-white/20 border">
                <h3 className="text-[1.8rem] font-bold">Buy & Sell</h3>
                <Tabs defaultValue="buy">
                  <TabsList className="bg-primary-800 w-full text-center mb-[2rem]">
                    <TabsTrigger value="buy">Buy</TabsTrigger>
                    <TabsTrigger value="sell">Sell</TabsTrigger>
                  </TabsList>
                  <TabsContent value="buy">
                    <TradeInfo
                      tradeType={TradeOptions.BUY}
                      isGraduated={token.isGraduated}
                      poolAddress={token.poolAddress as `0x${string}`}
                    />
                  </TabsContent>
                  <TabsContent value="sell">
                    <TradeInfo
                      tradeType={TradeOptions.SELL}
                      isGraduated={token.isGraduated}
                      poolAddress={token.poolAddress as `0x${string}`}
                    />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}

          {/* Pre-buy Button - Always visible, only enabled in pre-buy stage */}
          {isPreBuyPhase ? (
            <EligibilityDialog
              tradeType={TradeOptions.BUY}
              tokenAddress={token.id}
              className="w-full"
              isGraduated={token.isGraduated}
              poolAddress={token.poolAddress}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="cursor-help"
              title="Pre-buy Ended - This token has graduated to live trading"
            >
              Prebuy
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

CoinCard.displayName = "CoinCard";

export default CoinCard;
