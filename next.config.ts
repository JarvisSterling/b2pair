import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eemeremqmqsqsxioycka.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },
};

export default nextConfig;
