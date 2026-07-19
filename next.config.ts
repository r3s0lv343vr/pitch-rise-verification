import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow task document uploads up to the 25MB product limit (+ small form overhead).
  experimental: {
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
