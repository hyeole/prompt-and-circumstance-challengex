import refs from "@/config/references.json";

export type RequiredElement = (typeof refs.requiredElements)[number] & { requireAllFields?: boolean };
export type ChargeRef = (typeof refs.charges)[number];

export const REFERENCES = refs;
export const REFERENCE_VERSION = refs.version;

const squash = (s: string) => s.toLowerCase().replace(/[\s.§]/g, "").replace(/^ina|^8usc/, (m) => m);

/**
 * True when a selected charge's reference ID and its citation text point to different charges (or the text is not
 * one of the referenced charge's citations or a subsection of one). The tool cannot tell which one the officer meant, so a person must.
 */
export function chargeIdConflict(citation: string, referenceId?: string): boolean {
  if (!referenceId) return false;
  const byId = refs.charges.find((c) => c.id === referenceId);
  if (!byId) return false;
  const want = squash(citation);
  // A subsection of the referenced section ("8 U.S.C. 1326(a)" for "8 U.S.C. 1326") agrees with it.
  return !byId.citations.some((x) => want === squash(x) || (want.startsWith(squash(x)) && want[squash(x).length] === "("));
}

/** Match an officer-entered citation to a reference entry by exact citation text (spacing and dots ignored).
 *  A reference ID is used only when it agrees with the citation text; on a conflict no reference is returned. */
export function findCharge(citation: string, referenceId?: string): ChargeRef | undefined {
  if (chargeIdConflict(citation, referenceId)) return undefined;
  if (referenceId) {
    const byId = refs.charges.find((c) => c.id === referenceId);
    if (byId) return byId;
  }
  const want = squash(citation);
  return refs.charges.find((c) => c.citations.some((x) => squash(x) === want));
}
