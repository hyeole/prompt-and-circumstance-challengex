// Review request input (hosting-free-1 fix). The request body is read with a size bound before parsing, and only the
// fields an officer can edit (narrative, form fields, selected charges) are taken from the client, each limited to its
// known properties; unknown properties are dropped, so they are neither stored nor counted. Everything else about the
// case (id, title, kind, provenance, context, ...) comes from the server's own record. For a legitimate request this
// is exactly what the client sent, so the review engine receives the same input as before.
import { z } from "zod";
import type { CaseRecord } from "./types";

/** Largest accepted review request body. The largest sample case is about 13 KB; an edited case stays far below. */
export const MAX_REVIEW_BODY_BYTES = 200_000;

export class BodyTooLarge extends Error { override name = "BodyTooLarge"; }

/** Read at most `max` bytes of the body; throws BodyTooLarge as soon as more arrive (nothing more is buffered). */
export async function readBodyLimited(req: Request, max = MAX_REVIEW_BODY_BYTES): Promise<string> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > max) throw new BodyTooLarge();
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await reader.cancel().catch(() => {}); throw new BodyTooLarge(); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const PageSpan = z.object({ page: z.number().int().min(1).max(5000), start: z.number().int().min(0), end: z.number().int().min(0) });
const Fact = z.object({
  path: z.string().max(100), label: z.string().max(200), value: z.string().max(2_000),
  status: z.enum(["present", "redacted", "absent", "unreadable", "not_applicable"]),
  sourcePage: z.number().int().min(1).max(5000).optional(), sourceField: z.string().max(200).optional(),
});
const Charge = z.object({
  citation: z.string().max(200), referenceId: z.string().max(100).optional(),
  source: z.enum(["officer-selected", "stated-in-record", "team-assigned-for-testing"]), note: z.string().max(1_000).optional(),
});
/** The editable part of a case, with only supported properties (zod drops unknown keys). */
export const EditableCase = z.object({
  narrative: z.object({ text: z.string().min(1).max(40_000), pageSpans: z.array(PageSpan).max(1_000).optional() }),
  facts: z.array(Fact).max(200),
  selectedCharges: z.array(Charge).max(5),
});
export type Editable = z.infer<typeof EditableCase>;

/** The case the engine reviews: the server's record with the client's edits to the editable fields. */
export function mergeEdits(server: CaseRecord, edits: Editable): CaseRecord {
  return { ...server, narrative: edits.narrative, facts: edits.facts, selectedCharges: edits.selectedCharges };
}
