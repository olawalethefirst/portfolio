import type { NextConfig } from "next";

// Let next/image optimize only this project's public Storage objects.
// Unset configuration allows no remote host.
const supabaseUrl = process.env.SUPABASE_URL?.trim();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [new URL("/storage/v1/object/public/**", supabaseUrl)]
      : [],
  },
};

export default nextConfig;
