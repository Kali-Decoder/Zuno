"use client";

import React from "react";
import Image from "next/image";
import { Clock } from "lucide-react";

const TipsPage = () => {
  return (
    <div className="page-container pb-[4rem]">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-[4rem]">
          <div className="inline-flex items-center gap-2 bg-accent-500/10 border border-accent-500/20 rounded-full px-4 py-2 mb-4">
            <Clock className="w-4 h-4 text-accent-500" />
            <span className="text-accent-500 font-medium text-sm">Coming Soon</span>
          </div>

          <h1 className="text-[3rem] sm:text-[4rem] font-bold text-white mb-4">ZUNO</h1>
          <p className="text-[1.05rem] text-accent-500/90 mb-3 tracking-wide">
            Where liquidity finds its next home.
          </p>

          <p className="text-[1.2rem] text-white/70 max-w-2xl mx-auto leading-relaxed">
            Right now, you’re using the first version of ZUNO, our{" "}
            <span className="text-accent-500 font-semibold">liquidity recycling launchpad </span>
            with bonding-curve launches. <br></br>Soon, we’re unlocking the full experience: anyone will
            be able to launch tokens freely (permissionless), powered by bonding curves and recycle flows
            designed for both users and communities.
          </p>
        </div>

        {/* Preview Image Section */}
        <div className="relative mb-[4rem]">
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/20">
            {/* Blurred Preview Image */}
            <div className="relative">
              <Image
                src="/cultdemo.png"
                alt="ZUNO platform preview"
                width={1200}
                height={800}
                className="w-full h-auto filter blur-sm"
                priority
              />

              {/* Simple blurred overlay */}
              <div className="absolute inset-0 bg-black/30"></div>
            </div>
          </div>

          {/* Image Caption */}
          <p className="text-center text-white/50 text-sm mt-4">Preview of the ZUNO trading platform</p>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-white/5 to-accent-500/5 border border-white/10 rounded-xl p-12">
            <div className="max-w-md mx-auto">
              <div className="inline-flex items-center gap-3 bg-accent-500/10 border border-accent-500/20 rounded-full px-8 py-4 mb-6">
                <div className="w-3 h-3 bg-accent-500 rounded-full animate-pulse"></div>
                <span className="text-accent-500 font-semibold text-lg">Stay tuned for updates</span>
              </div>

              <p className="text-white/60 text-lg leading-relaxed">
                Keep building your reputation to get early access to the full platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipsPage;
