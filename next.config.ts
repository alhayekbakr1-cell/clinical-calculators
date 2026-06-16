import type { NextConfig } from "next";

// On a GitHub Pages *project* site the app is served from /<repo>, so the
// workflow passes that prefix in PAGES_BASE_PATH (empty for user/custom-domain
// sites). trailingSlash makes every route emit an index.html for static hosting.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
