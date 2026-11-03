import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: 'dist',
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://teams.cloud.microsoft https://*.cloud.microsoft https://*.office.com https://*.microsoft365.com",
          },
        ],
      },
    ];
  },

  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
