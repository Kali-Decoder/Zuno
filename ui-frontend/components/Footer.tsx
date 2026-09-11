import Link from "next/link";
import { LogoMark } from "~~/icons/logos";

const productLinks = [
  { href: "/", label: "Explore" },
  { href: "/launch", label: "Launch" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/guide", label: "Guide" },
];

const legalLinks = [
  { href: "#", label: "Privacy" },
  { href: "#", label: "Terms" },
];

function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.06]">
      <div className="page-container py-[2.4rem] sm:py-[3.2rem]">
        <div className="flex flex-col gap-[2.4rem] lg:flex-row lg:items-start lg:justify-between lg:gap-[3.2rem]">
          <div className="max-w-[34rem] space-y-[1rem]">
            <Link
              href="/"
              aria-label="Reflow home"
              className="inline-flex items-center gap-[0.75rem] transition-opacity hover:opacity-90"
            >
              <LogoMark className="size-[2.4rem]" />
              <span className="font-area text-[2rem] font-black tracking-[-0.04em] text-white">
                Re<span className="text-accent-500">flow</span>
              </span>
            </Link>
            <p className="text-[1.25rem] leading-relaxed text-white/40">
              Bonding-curve launchpad on Monad. Graduate LP stays locked so inactive liquidity can be recycled.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-[3.2rem] gap-y-[2rem]">
            <div>
              <p className="mb-[1rem] text-[1.1rem] font-medium uppercase tracking-[0.08em] text-white/30">
                Product
              </p>
              <ul className="flex flex-col gap-[0.75rem]">
                {productLinks.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[1.3rem] text-white/65 transition-colors hover:text-accent-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-[1rem] text-[1.1rem] font-medium uppercase tracking-[0.08em] text-white/30">
                Legal
              </p>
              <ul className="flex flex-col gap-[0.75rem]">
                {legalLinks.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[1.3rem] text-white/65 transition-colors hover:text-accent-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="max-w-[28rem]">
              <p className="mb-[1rem] text-[1.1rem] font-medium uppercase tracking-[0.08em] text-white/30">
                Network
              </p>
              <p className="text-[1.3rem] text-white/65">Monad Testnet</p>
              <p className="mt-[0.4rem] font-mono text-[1.15rem] text-white/30">Chain ID 10143</p>
            </div>
          </div>
        </div>

        <div className="mt-[2.4rem] flex flex-col gap-[1.2rem] border-t border-white/[0.06] pt-[1.6rem] sm:mt-[2.8rem] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[1.15rem] text-white/30">
            © {new Date().getFullYear()} Reflow · Non-custodial. Trade at your own risk.
          </p>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[0.55rem] text-[1.2rem] text-white/40 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.35rem] fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.849L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
            @reflow
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
