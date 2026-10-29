// Distinguishes a populated form field from known, usable information.
// "Unknown Date, Unknown Time" is populated (the officer recorded that it is unknown) but carries no usable fact.

export type FieldQuality = "known" | "partly_unknown" | "unknown" | "see_narrative";

const UNKNOWN = /\b(unknown|unk)\b/i;

export function fieldQuality(value: string): FieldQuality {
  const v = value.trim();
  if (!v) return "unknown";
  if (/^see narrative$/i.test(v)) return "see_narrative";
  if (!UNKNOWN.test(v)) return "known";
  // Remove unknown markers and the form's filler words; anything left is real information.
  const rest = v
    .replace(/\b(unknown|unk)\b/gi, " ")
    .replace(/miles?\s*\(s\)|miles?/gi, " ")
    .replace(/\b(date|time|of|a|see narrative)\b/gi, " ")
    .replace(/\b0\b/g, " ")
    .replace(/[\s,.;:()\-/]+/g, "");
  return rest ? "partly_unknown" : "unknown";
}

export const QUALITY_LABEL: Record<FieldQuality, string> = {
  known: "Present",
  partly_unknown: "Partly unknown",
  unknown: "Documented as unknown",
  see_narrative: "See narrative",
};
