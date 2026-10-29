import refs from "@/config/references.json";

export type RequiredElement = (typeof refs.requiredElements)[number] & { requireAllFields?: boolean };
export type ChargeRef = (typeof refs.charges)[number];

export const REFERENCES = refs;
export const REFERENCE_VERSION = refs.version;

const squash = (s: string) => s.toLowerCase().replace(/[\s.§]/g, "").replace(/^ina|^8usc/, (m) => m);

/** Match an officer-entered citation to a reference entry by exact citation text (spacing and dots ignored). */
export function findCharge(citation: string, referenceId?: string): ChargeRef | undefined {
  if (referenceId) {
    const byId = refs.charges.find((c) => c.id === referenceId);
    if (byId) return byId;
  }
  const want = squash(citation);
  return refs.charges.find((c) => c.citations.some((x) => squash(x) === want));
}
