import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.born2smile.co.kr" }],
        destination: "https://born2smile.co.kr/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
