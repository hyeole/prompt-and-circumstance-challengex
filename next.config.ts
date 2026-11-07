import type { NextConfig } from "next";

// Server-function bundle contents (release/vercel-demo-1). lib/cases.ts reads data/cases/*.json at runtime through a
// computed path, so tracing cannot see it precisely: include the sample cases explicitly, and exclude everything else a
// dynamic path could pull in (evaluation history, tests, tooling, local stores, credentials, test-only values).
// The public demo serves only the sample set (lib/caseSource.ts), so the evaluation case sets are not needed.
const ALL_ROUTES = "/**/*";

const nextConfig: NextConfig = {
  // The model key is read only on the server (lib/llm.ts). Nothing here is exposed to the browser.
  poweredByHeader: false,
  devIndicators: false, // keep the dev-mode badge out of screenshots and the demo video
  outputFileTracingIncludes: {
    [ALL_ROUTES]: ["./data/cases/*.json"],
  },
  outputFileTracingExcludes: {
    [ALL_ROUTES]: [
      "./eval/**/*", "./tests/**/*", "./scripts/**/*", "./tools/**/*", "./docs/**/*",
      "./data/local/**/*", "./data/manifests/**/*", "./share/**/*", "./recordings/**/*", "./reference-materials/**/*",
      "./.env", "./.env.*", "./**/*.env", "./.claude/**/*", "./.worktrees/**/*", "./tmp/**/*", "./.Rhistory",
      "./DESIGN.md", "./README.md", "./**/*.pdf",
    ],
  },
};

export default nextConfig;
