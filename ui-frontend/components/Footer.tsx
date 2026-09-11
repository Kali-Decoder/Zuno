import Link from "next/link";
import { LogoLightTextSvg } from "~~/icons/logos";

const productLinks = [
  { href: "/", label: "Explore" },
  { href: "/leaderboards", label: "Analytics" },
  { href: "/launch", label: "Create" },
  { href: "/tokens", label: "Profile" },
  { href: "/guide", label: "Docs" },
];

const legalLinks = [
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Terms of Use" },
];

function Footer() {
  return (
    <footer className="px-[var(--container-px)] pb-[3.2rem] pt-[2rem] sm:pb-[4.8rem] sm:pt-[3.2rem]">
      <div className="surface-elevated rounded-[2rem] bg-[#161616] px-[2rem] py-[2.4rem] sm:px-[3.2rem] sm:py-[3.2rem]">
        <div className="grid grid-cols-1 gap-[2.4rem] md:grid-cols-2 lg:grid-cols-12 lg:gap-[3.2rem]">
          <div className="lg:col-span-4 space-y-[1.2rem]">
            <Link href="/" aria-label="Reflow home" className="inline-flex">
              <LogoLightTextSvg />
            </Link>
            <p className="max-w-[36rem] text-[1.25rem] leading-relaxed text-white/55 sm:text-[1.35rem]">
              Launch and explore fixed-supply tokens on Monad Testnet. Your wallet submits every
              transaction. Reflow does not custody assets.
            </p>
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-[1.2rem] text-[1.2rem] font-medium text-white/40">Product</h3>
            <ul className="space-y-[0.9rem]">
              {productLinks.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[1.3rem] text-white/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-[1.2rem] text-[1.2rem] font-medium text-white/40">Legal</h3>
            <ul className="space-y-[0.9rem]">
              {legalLinks.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[1.3rem] text-white/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h3 className="mb-[1.2rem] text-[1.2rem] font-medium text-white/40">Risk notice</h3>
            <p className="text-[1.25rem] leading-relaxed text-white/45 sm:text-[1.3rem]">
              Transactions are submitted through your wallet and may be irreversible. Tokens can be
              volatile or lose all value. Reflow does not provide custody, warranties, or financial
              advice.
            </p>
          </div>
        </div>

        <div className="mt-[2.4rem] flex flex-col gap-[1.2rem] border-t border-white/[0.08] pt-[1.8rem] sm:mt-[3.2rem] sm:flex-row sm:items-center sm:justify-between sm:pt-[2.2rem]">
          <p className="text-[1.15rem] text-white/40 sm:text-[1.25rem]">© 2026 Reflow Labs.</p>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[0.7rem] text-[1.2rem] text-white/55 transition-colors hover:text-white"
          >
            <span>@reflow</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.4rem] fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.849L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
