import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@truth-commission/db", "@truth-commission/ingest"],
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: "../..",
  },
};

export default nextConfig;
