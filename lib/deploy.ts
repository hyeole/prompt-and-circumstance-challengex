// Deployment mode and limits (hosting-free-1). Two modes:
// - Local single-user tool (default): no judge code, no usage caps, storage in a local file (or memory for tests).
// - Public demo (on Vercel, or NC_PUBLIC_DEMO=1 for local rehearsal): judge code for live reviews and uploads, usage
//   caps, visitor separation over Upstash Redis, benchmark cases hidden, demo notice shown. Everything fails closed.
// Nothing here changes the review engine, prompts or model settings.

const num = (name: string, dflt: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : dflt;
};

/** True on any Vercel deployment, or when rehearsing the public demo locally. */
export const publicDemo = () => !!process.env.VERCEL || process.env.NC_PUBLIC_DEMO === "1";
/** True only for the Vercel production deployment. */
export const vercelProduction = () => process.env.VERCEL_ENV === "production";
export const isProductionBuild = () => process.env.NODE_ENV === "production";

/** Saved visitor data is deleted this many days after the visitor's LAST CHANGE (every write renews the expiry). */
export const retentionDays = () => num("NC_RETENTION_DAYS", 30);
export const retentionSeconds = () => Math.max(1, Math.round(retentionDays() * 86_400));

/** Where saved work lives, in the words shown on the pages (kept consistent with the retention rule above). */
export const savedWhere = () => (publicDemo() ? `in this browser's private workspace, deleted ${retentionDays()} days after your last change` : "on this computer");
/** The demo notice (public demo only). */
export const demoNotice = () => (publicDemo() ? `Public demo: enter only synthetic or public redacted text. Text you review is sent to the shared model endpoint. Your saved work is visible only in this browser and is deleted ${retentionDays()} days after your last change.` : null);

export const MB = 1024 * 1024;
/** PDF limit: below Vercel's 4.5 MB request body limit; stored as base64 (x4/3) under Upstash's 10 MB request limit. */
export const MAX_PDF_BYTES = 3 * MB;

/** Live-review admission limits (public demo only). */
export const reviewLimits = () => ({
  perJudgeHour: num("NC_RL_JUDGE_PER_HOUR", 15),
  perIpDay: num("NC_RL_IP_PER_DAY", 30),
  perDay: num("NC_CAP_PER_DAY", 60),
  total: num("NC_CAP_TOTAL", 400),
  inflight: num("NC_MAX_INFLIGHT", 3),
  /** A lease outlives the route's maxDuration (90 s), so a crashed instance cannot hold capacity for long. */
  leaseMs: num("NC_LEASE_MS", 120_000),
});

export type WriteKind = "case" | "version" | "decision" | "pdf";
/** Storage-write limits (public demo only). Per visitor, per IP per UTC day, and global; global limits do not depend on
 *  cookies, so clearing cookies cannot bypass them. Bytes are the stored sizes (JSON text, base64 for PDFs). */
export const writeLimits = () => ({
  perVisitor: { case: num("NC_W_CASES_PER_VISITOR", 10), version: num("NC_W_VERSIONS_PER_VISITOR", 60), decision: num("NC_W_DECISIONS_PER_VISITOR", 400), pdf: num("NC_W_PDFS_PER_VISITOR", 2) } as Record<WriteKind, number>,
  perIpDay: { case: num("NC_W_CASES_PER_IP_DAY", 20), version: num("NC_W_VERSIONS_PER_IP_DAY", 60), decision: num("NC_W_DECISIONS_PER_IP_DAY", 800), pdf: num("NC_W_PDFS_PER_IP_DAY", 4) } as Record<WriteKind, number>,
  globalPerDay: { case: num("NC_W_CASES_PER_DAY", 150), version: num("NC_W_VERSIONS_PER_DAY", 80), decision: num("NC_W_DECISIONS_PER_DAY", 4000), pdf: num("NC_W_PDFS_PER_DAY", 15) } as Record<WriteKind, number>,
  globalTotal: { case: num("NC_W_CASES_TOTAL", 1500), version: num("NC_W_VERSIONS_TOTAL", 500), decision: num("NC_W_DECISIONS_TOTAL", 20000), pdf: num("NC_W_PDFS_TOTAL", 30) } as Record<WriteKind, number>,
  visitorBytes: num("NC_W_BYTES_PER_VISITOR", 12 * MB),
  /** Every byte ever written in the demo (never decremented): an upper bound on stored data, under the 256 MB plan size. */
  globalBytes: num("NC_W_BYTES_TOTAL", 160 * MB),
});

/** Monthly budget for the storage service (public demo only), below Upstash Free's 10 GB bandwidth and 500K commands. */
export const monthlyBudget = () => ({ bytes: num("NC_BUDGET_BYTES_MONTH", 8 * 1024 * MB), commands: num("NC_BUDGET_COMMANDS_MONTH", 400_000) });

/** Judge sessions last this long. */
export const JUDGE_SESSION_SECONDS = 12 * 3600;
/** Access-code attempts per 15 minutes, per IP and per visitor. */
export const ACCESS_ATTEMPTS = 5;
export const ACCESS_WINDOW_SECONDS = 15 * 60;

export const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
export const utcMonth = (t = Date.now()) => new Date(t).toISOString().slice(0, 7);
export const utcHour = (t = Date.now()) => new Date(t).toISOString().slice(0, 13);
