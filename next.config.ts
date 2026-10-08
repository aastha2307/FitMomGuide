import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening dev via 127.0.0.1 (Firebase phone auth) or localhost without 403 on /_next/*
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
