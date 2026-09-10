import { Suspense } from "react";
import Footer from "~~/components/Footer";
import Topbar from "~~/components/Topbar";
import Navigation from "~~/components/reputation/Navigation";
import "~~/styles/globals.css";
import { getMetadata } from "~~/lib/getMetadata";

export const metadata = getMetadata({ title: "Reflow", description: "Reflow — liquidity recycling launchpad" });

const RootShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={null}>
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <Topbar />
        <main className="relative flex flex-1 flex-col">{children}</main>
        <Footer />
      </div>
    </Suspense>
  );
};

export default RootShell;
