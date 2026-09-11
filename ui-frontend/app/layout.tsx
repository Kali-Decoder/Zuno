import { Suspense } from "react";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import localFont from "next/font/local";
import { AppProviders } from "~~/components/AppProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/lib/getMetadata";

const manrope = Manrope({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

const areaBlack = localFont({
  src: "./fonts/Area_Normal_Black.otf",
  display: "swap",
  variable: "--font-area-normal",
});

export const metadata = getMetadata({ title: "Reflow", description: "Reflow — liquidity recycling launchpad" });

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body className={`${manrope.variable} ${manrope.className} ${areaBlack.variable} ${ibmPlexMono.variable}`}>
        <ThemeProvider enableSystem>
          <Suspense fallback={null}>
            <AppProviders>{children}</AppProviders>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
