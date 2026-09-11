// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [],
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
    const path = require("path");
    const webpack = require("webpack");
    const empty = path.resolve(__dirname, "lib/webpack-empty.js");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": empty,
    };
    // Optional Coinbase x402 deps pulled transitively by wagmi — unused
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@x402(\/.*)?$/, empty));
    return config;
  },
};

module.exports = nextConfig;
