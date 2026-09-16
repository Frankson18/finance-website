import type { NextConfig } from "next";

const API_PROXY_URL = process.env.API_PROXY_URL ?? "http://localhost:3333";

const nextConfig: NextConfig = {
  transpilePackages: ["@fluxo/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
