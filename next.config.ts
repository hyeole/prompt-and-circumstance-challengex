import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The model key is read only on the server (lib/llm.ts). Nothing here is exposed to the browser.
  poweredByHeader: false,
  devIndicators: false, // keep the dev-mode badge out of screenshots and the demo video
};

export default nextConfig;
