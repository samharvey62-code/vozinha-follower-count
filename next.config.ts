import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The avatar is served same-origin via /api/avatar, so no remote image config is needed.
  poweredByHeader: false,
};

export default nextConfig;
