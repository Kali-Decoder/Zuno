import { Step } from "react-joyride";

export const tourSteps: Step[] = [
  {
    target: "body",
    content: (
      <div>
        <h3 className="text-[2rem] font-semibold text-white mb-[1rem] leading-tight">
          Welcome to <span className="text-accent-500">Reflow</span>!
        </h3>
        <p className="text-[1.45rem] text-white/80 mb-[1.2rem] leading-relaxed">
          Reflow rewards diamond hands holders with exclusive early access to new tokens. Let's show you how everything
          works!
        </p>
        <div className="flex items-center gap-[0.5rem] text-[1.3rem] text-white/60">
          <div className="w-[0.375rem] h-[0.375rem] bg-accent-500 rounded-full"></div>
          <span>This tour takes about 2 minutes</span>
        </div>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
  },
  {
    target: ".check-eligibility-button",
    content: (
      <div>
        <h3 className="text-[2rem] font-semibold text-white mb-[1rem] leading-tight">Check Your Status</h3>
        <p className="text-[1.45rem] text-white/80 mb-[1rem] leading-relaxed">
          Click the "Prebuy" button on any token card to check if you're a diamond hands holder and eligible for pre-buy
          access.
        </p>
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-md p-[0.75rem]">
          <p className="text-[1.3rem] text-white/60 leading-relaxed">
            💎 Build your reputation by trading to unlock future opportunities!
          </p>
        </div>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: ".token-card:first-child",
    content: (
      <div>
        <h3 className="text-[2rem] font-semibold text-white mb-[1rem] leading-tight">Token Cards</h3>
        <p className="text-[1.45rem] text-white/80 mb-[1.2rem] leading-relaxed">
          Each token shows its current phase and relevant information.
        </p>
        <div className="space-y-[0.75rem]">
          <div className="flex items-start gap-[0.75rem]">
            <div className="w-[0.375rem] h-[0.375rem] bg-yellow-400 rounded-full mt-[0.5rem] flex-shrink-0"></div>
            <p className="text-[1.3rem] text-white/70 leading-relaxed">
              <span className="text-yellow-400 font-medium">Pre-buy phase:</span> Shows status and access info
            </p>
          </div>
          <div className="flex items-start gap-[0.75rem]">
            <div className="w-[0.375rem] h-[0.375rem] bg-green-400 rounded-full mt-[0.5rem] flex-shrink-0"></div>
            <p className="text-[1.3rem] text-white/70 leading-relaxed">
              <span className="text-green-400 font-medium">Live phase:</span> Shows market cap and holder count
            </p>
          </div>
        </div>
      </div>
    ),
    placement: "left",
  },
  {
    target: ".token-phase-indicator",
    content: (
      <div>
        <h3 className="text-[2rem] font-semibold text-white mb-[1rem] leading-tight">Token Phases</h3>
        <p className="text-[1.45rem] text-white/80 mb-[1.2rem] leading-relaxed">
          Tokens have two distinct phases with different information available:
        </p>
        <div className="space-y-[0.75rem] mb-[1.2rem]">
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-md p-[0.75rem]">
            <div className="flex items-center gap-[0.5rem] mb-[0.5rem]">
              <div className="w-[0.75rem] h-[0.75rem] bg-yellow-400 rounded-full"></div>
              <span className="text-yellow-400 font-medium">Pre-buy Phase</span>
            </div>
            <p className="text-[1.25rem] text-white/70 leading-relaxed">
              Diamond hands only • No market cap yet • Exclusive access
            </p>
          </div>
          <div className="bg-green-400/10 border border-green-400/20 rounded-md p-[0.75rem]">
            <div className="flex items-center gap-[0.5rem] mb-[0.5rem]">
              <div className="w-[0.75rem] h-[0.75rem] bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">Live Trading</span>
            </div>
            <p className="text-[1.25rem] text-white/70 leading-relaxed">
              Open to everyone • Market cap & holders • Full trading
            </p>
          </div>
        </div>
        <div className="bg-accent-500/10 border border-accent-500/20 rounded-md p-[0.75rem]">
          <p className="text-[1.3rem] text-white/80 leading-relaxed">
            💡 The animated dot shows the current active phase
          </p>
        </div>
      </div>
    ),
    placement: "top",
  },
  {
    target: ".token-stage-buttons",
    content: (
      <div>
        <h3 className="text-[2rem] font-semibold text-white mb-[1rem] leading-tight">Token Actions</h3>
        <p className="text-[1.45rem] text-white/80 mb-[1.2rem] leading-relaxed">
          Each token has different available actions based on its current phase:
        </p>
        <div className="space-y-[0.75rem] mb-[1.2rem]">
          <div className="flex items-start gap-[0.75rem]">
            <div className="w-[0.375rem] h-[0.375rem] bg-yellow-400 rounded-full mt-[0.5rem] flex-shrink-0"></div>
            <div>
              <span className="text-yellow-400 font-medium text-[1.3rem]">Pre-buy phase:</span>
              <span className="text-white/70 text-[1.3rem] ml-[0.5rem]">Only Prebuy button active</span>
            </div>
          </div>
          <div className="flex items-start gap-[0.75rem]">
            <div className="w-[0.375rem] h-[0.375rem] bg-green-400 rounded-full mt-[0.5rem] flex-shrink-0"></div>
            <div>
              <span className="text-green-400 font-medium text-[1.3rem]">Live phase:</span>
              <span className="text-white/70 text-[1.3rem] ml-[0.5rem]">Chart and Trade buttons active</span>
            </div>
          </div>
        </div>
        <div className="bg-accent-500/10 border border-accent-500/20 rounded-md p-[0.75rem]">
          <p className="text-[1.3rem] text-white/80 leading-relaxed">
            💡 Hover over disabled buttons to see why they're locked!
          </p>
        </div>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  {
    target: ".leaderboard-link",
    content: (
      <div>
        <h3 className="text-[2rem] font-semibold text-white mb-[1rem] leading-tight">Reputation System</h3>
        <p className="text-[1.45rem] text-white/80 mb-[1.2rem] leading-relaxed">
          Check the leaderboards to see top traders and your current rank. Higher reputation = better access to future
          pre-buys!
        </p>
        <div className="bg-gradient-to-r from-accent-500/10 to-accent-600/5 border border-accent-500/20 rounded-md p-[0.75rem]">
          <div className="flex items-center gap-[0.5rem] mb-[0.5rem]">
            <div className="w-[1rem] h-[1rem] bg-accent-500 rounded-full flex items-center justify-center">
              <span className="text-black text-[1.1rem] font-bold">🏆</span>
            </div>
            <span className="text-accent-500 font-medium text-[1.3rem]">Pro Tip</span>
          </div>
          <p className="text-[1.3rem] text-white/70 leading-relaxed">
            You can search for any user's rank, even outside the top 100
          </p>
        </div>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: "body",
    content: (
      <div>
        <div className="text-center mb-[1.5rem]">
          <div className="w-[3rem] h-[3rem] bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-[1rem]">
            <span className="text-black text-[1.5rem]">🎉</span>
          </div>
          <h3 className="text-[2rem] font-semibold text-white mb-[0.5rem] leading-tight">You're All Set!</h3>
        </div>
        <p className="text-[1.45rem] text-white/80 mb-[1.2rem] leading-relaxed text-center">
          Now you understand how Reflow works:
        </p>
        <div className="space-y-[0.75rem] mb-[1.5rem]">
          <div className="flex items-center gap-[0.75rem]">
            <div className="w-[0.375rem] h-[0.375rem] bg-accent-500 rounded-full flex-shrink-0"></div>
            <span className="text-[1.3rem] text-white/80">Trade to build reputation</span>
          </div>
          <div className="flex items-center gap-[0.75rem]">
            <div className="w-[0.375rem] h-[0.375rem] bg-accent-500 rounded-full flex-shrink-0"></div>
            <span className="text-[1.3rem] text-white/80">Get early access to pre-buys</span>
          </div>
          <div className="flex items-center gap-[0.75rem]">
            <div className="w-[0.375rem] h-[0.375rem] bg-accent-500 rounded-full flex-shrink-0"></div>
            <span className="text-[1.3rem] text-white/80">Earn from being a diamond hands holder</span>
          </div>
        </div>
        <div className="bg-gradient-to-r from-accent-500/10 to-accent-600/5 border border-accent-500/20 rounded-md p-[1rem] text-center">
          <p className="text-[1.3rem] text-white/80 leading-relaxed">
            Ready to start your journey? Check your eligibility first!
          </p>
        </div>
      </div>
    ),
    placement: "center",
  },
];

export const tourStyles = {
  options: {
    primaryColor: "#C2FF2C",
    backgroundColor: "hsl(var(--color-primary-400))",
    textColor: "#ffffff",
    overlayColor: "rgba(0, 0, 0, 0.85)",
    spotlightShadow: "0 0 20px rgba(194, 255, 44, 0.4), 0 0 40px rgba(194, 255, 44, 0.2)",
    zIndex: 10000,
    width: 520,
    arrowColor: "hsl(var(--color-primary-400))",
  },
  tooltip: {
    backgroundColor: "hsl(var(--color-primary-400))",
    borderRadius: "0.375rem", // rounded-md equivalent
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
    fontSize: "1.35rem",
    fontFamily: "var(--font-manrope-sans), sans-serif",
    padding: "0",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)",
    maxWidth: "520px",
    minHeight: "auto",
  },
  tooltipContainer: {
    textAlign: "left" as const,
  },
  tooltipContent: {
    padding: "2rem",
    lineHeight: "1.6",
  },
  tooltipTitle: {
    fontSize: "1.6rem",
    fontWeight: "600",
    marginBottom: "0.75rem",
    color: "#ffffff",
    fontFamily: "var(--font-manrope-sans), sans-serif",
  },
  tooltipFooter: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "1.4rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
    borderBottomLeftRadius: "0.375rem",
    borderBottomRightRadius: "0.375rem",
  },
  buttonNext: {
    backgroundColor: "#C2FF2C",
    color: "#000000",
    border: "none",
    borderRadius: "9999px", // rounded-full
    padding: "1rem 1.6rem",
    fontWeight: "500",
    fontSize: "1.35rem",
    fontFamily: "var(--font-mono), monospace",
    textTransform: "uppercase" as const,
    letterSpacing: "0.025em",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minWidth: "110px",
    height: "auto",
    lineHeight: "1",
  },
  buttonBack: {
    backgroundColor: "transparent",
    color: "#C2FF2C",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "9999px",
    padding: "1rem 1.6rem",
    fontWeight: "500",
    fontSize: "1.35rem",
    fontFamily: "var(--font-mono), monospace",
    textTransform: "uppercase" as const,
    letterSpacing: "0.025em",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginRight: "0.75rem",
    minWidth: "110px",
    height: "auto",
    lineHeight: "1",
  },
  buttonSkip: {
    backgroundColor: "transparent",
    color: "rgba(255, 255, 255, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "9999px",
    padding: "0.9rem 1.4rem",
    fontSize: "1.25rem",
    fontFamily: "var(--font-mono), monospace",
    textTransform: "uppercase" as const,
    letterSpacing: "0.025em",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontWeight: "400",
    height: "auto",
    lineHeight: "1",
  },
  buttonClose: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "0.25rem",
    fontSize: "1.2rem",
    padding: "0.25rem",
    position: "absolute" as const,
    right: "0.75rem",
    top: "0.75rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: "1",
  },
  spotlight: {
    borderRadius: "0.375rem",
  },
  beacon: {
    inner: "#C2FF2C",
    outer: "rgba(194, 255, 44, 0.3)",
  },
};
