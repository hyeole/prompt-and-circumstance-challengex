// Validation schema for model output. Lenient on extras, strict on what we rely on.
import { z } from "zod";

const Evidence = z.object({
  sentence_id: z.string().optional(),
  quote: z.string().optional(),
  field_path: z.string().optional(),
});

export const ModelOutput = z.object({
  elements: z
    .array(z.object({
      element_id: z.string(),
      status: z.enum(["present", "absent", "unclear", "unavailable"]),
      sentence_ids: z.array(z.string()).default([]),
      note: z.string().optional().default(""),
    }))
    .default([]),
  issues: z
    .array(z.object({
      type: z.enum(["inconsistency", "unclear"]),
      title: z.string(),
      explanation: z.string(),
      evidence: z.array(Evidence).default([]),
      needs_human_review: z.boolean().default(false),
      reason: z.string().optional().default(""),
    }))
    .default([]),
  citation: z.object({
    status: z.enum(["consistent", "likely_mismatch", "insufficient_information", "needs_human_review"]),
    explanation: z.string(),
    evidence: z.array(Evidence).default([]),
  }),
  human_review: z.object({ required: z.boolean(), reasons: z.array(z.string()).default([]) }).default({ required: false, reasons: [] }),
});
export type ModelOutput = z.infer<typeof ModelOutput>;
