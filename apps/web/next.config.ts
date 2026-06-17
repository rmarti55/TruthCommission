import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@truth-commission/db", "@truth-commission/ingest"],
  turbopack: {
    root: "../..",
  },
};

export default nextConfig;
