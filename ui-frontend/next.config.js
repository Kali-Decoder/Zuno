// @ts-check
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  webpack: config => {
    config.infrastructureLogging = { level: "error" };
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@privy-io/react-auth": path.resolve(__dirname, "mocks/privy.tsx"),
      "@privy-io/wagmi": path.resolve(__dirname, "mocks/privy-wagmi.tsx"),
      "@rainbow-me/rainbowkit": path.resolve(__dirname, "mocks/rainbowkit.tsx"),
      wagmi: path.resolve(__dirname, "mocks/wagmi.ts"),
      "@wagmi/core": path.resolve(__dirname, "mocks/wagmi-core.ts"),
      "wagmi/actions": path.resolve(__dirname, "mocks/wagmi-actions.ts"),
      "wagmi/query": path.resolve(__dirname, "mocks/wagmi-query.ts"),
    };
    return config;
  },
};

module.exports = nextConfig;
