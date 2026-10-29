import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The model key is read only on the server (lib/llm.ts). Nothing here is exposed to the browser.
  poweredByHeader: false,
};

export default nextConfig;
