// Regression tests for bugs confirmed during evaluation. The model is replaced by a fake, so these run offline.
// Run with the react-server condition (see package.json "test"), which makes the "server-only" import a no-op.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import type { CaseRecord } from "../lib/types";
import { splitSentences } from "../lib/text";

const load = (id: string) => JSON.parse(readFileSync(`eval/cases/${id}.json`, "utf8")) as CaseRecord;
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!.id;

const review = (o: Record<string, unknown> = {}) => JSON.stringify({
  elements: [{ element_id: "E6", status: "present", sentence_ids: ["S16"], note: "" }, { element_id: "E7", status: "present", sentence_ids: ["S24"], note: "" }],
  issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] }, ...o,
});
const facts = (o: Record<string, unknown> = {}) => JSON.stringify({ entry_statements: [], removal_statements: [], ...o });

/** Fake model: answers the fact-extraction prompt and the review prompt separately. */
function fake(opts: { review?: string | Error; facts?: string | Error }): Complete {
  return async (system) => {
    const v = system === FACTS_SYSTEM_PROMPT ? opts.facts ?? facts() : opts.review ?? review();
    if (v instanceof Error) throw v;
    return { text: v, attempts: 1 };
  };
}

test("bug: human-review banner had no reasons when only a finding required review", async () => {
  const r = await reviewCase(load("C001"), fake({}));
  assert.ok(r.findings.some((f) => f.id === "R-TIME-MISMATCH" && f.needsHumanReview));
  assert.equal(r.humanReview.required, true);
  assert.ok(r.humanReview.reasons.some((x) => /time/i.test(x)), "the finding's reason must appear in the banner");
});

test("bug: charge requirement was skipped when every model call failed (C037-CIT)", async () => {
  const down = new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
  const r = await reviewCase(load("C037-CIT"), fake({ review: down, facts: down }));
  assert.equal(r.modelStatus, "failed");
  assert.equal(r.citation.status, "likely_mismatch");
  assert.equal(r.citation.evidence[0]?.fieldPath, "entry.manner");
  assert.ok(r.checks.find((c) => c.id === "clarity")?.status === "unavailable", "checks that did not run must say unavailable");
});

test("bug: charge requirement was skipped when only the fact call failed (C021-CIT)", async () => {
  const r = await reviewCase(load("C021-CIT"), fake({ facts: new ModelError("timeout", "timeout", 1) }));
  assert.equal(r.citation.status, "likely_mismatch");
  assert.equal(r.modelConfig.factsStatus, "failed");
  assert.equal(r.checks.find((c) => c.id === "consistency")?.status, "partial");
});

test("bug: model 'mismatch' contradicting a supporting statement became a false citation flag (C021-X1)", async () => {
  const c = load("C021-X1");
  const s = sid(c, "admitted as a B2 Visitor");
  const r = await reviewCase(c, fake({
    review: review({ citation: { status: "likely_mismatch", explanation: "Entry date conflict raises uncertainty.", evidence: [{ sentence_id: s, quote: "was admitted as a B2 Visitor" }] } }),
    facts: facts({ entry_statements: [{ sentence_id: s, quote: "was admitted as a B2 Visitor", year: 2015, manner: "admitted", person: "subject" }] }),
  }));
  assert.equal(r.citation.status, "needs_human_review");
  assert.ok(!r.findings.some((f) => f.category === "citation"));
});

test("bug: charge-fit statements were also issued as separate inconsistencies (C001-CIT)", async () => {
  const c = load("C001-CIT");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Subject not admitted but charge requires admission", explanation: "The charge requires admission.", evidence: [{ field_path: "entry.manner" }, { sentence_id: sid(c, "under arrest at 1330"), quote: "placed all subjects under arrest" }], needs_human_review: true, reason: "" }] }),
  }));
  assert.ok(!r.findings.some((f) => f.title.startsWith("Subject not admitted")));
  assert.ok(r.discarded.some((d) => /citation check/.test(d.reason)));
});

test("unverifiable model evidence is withheld, never highlighted", async () => {
  const r = await reviewCase(load("C001"), fake({
    review: review({ issues: [{ type: "unclear", title: "Invented", explanation: "x", evidence: [{ sentence_id: "S3", quote: "words that do not appear anywhere in the narrative" }], needs_human_review: false, reason: "" }] }),
  }));
  assert.ok(!r.findings.some((f) => f.title === "Invented"));
  assert.ok(r.discarded.some((d) => d.title === "Invented"));
});

test("invalid model output gives a partial review, not invented results", async () => {
  const r = await reviewCase(load("C012-M2"), fake({ review: '{"elements": "truncated', facts: "not json" }));
  assert.equal(r.modelStatus, "invalid_output");
  assert.equal(r.elements.find((e) => e.elementId === "E2")?.status, "not_checked");
  assert.ok(r.humanReview.reasons.some((x) => /partial/i.test(x)));
  assert.ok(!r.findings.some((f) => f.source === "model" && f.category !== "citation"));
});

test("C012-M2: missing place of entry is reported as absent with no invented text span", async () => {
  const c = load("C012-M2");
  assert.equal(c.facts.find((f) => f.path === "entry.place")?.status, "absent");
  assert.ok(!/near Laredo/.test(c.narrative.text));
  const r = await reviewCase(c, fake({ review: review({ elements: [{ element_id: "E2", status: "absent", sentence_ids: [], note: "" }] }) }));
  const f = r.findings.find((x) => x.id === "M-E2");
  assert.ok(f);
  assert.deepEqual(f!.evidence.map((e) => e.kind), ["missing"]);
  assert.equal(f!.evidence[0].start, undefined);
});

test("a redacted form field makes the element unavailable, not missing", async () => {
  const c = load("C012-M2");
  c.facts = c.facts.map((f) => (f.path === "entry.place" ? { ...f, status: "redacted" as const } : f));
  const r = await reviewCase(c, fake({ review: review({ elements: [{ element_id: "E2", status: "absent", sentence_ids: [], note: "" }] }) }));
  assert.equal(r.elements.find((e) => e.elementId === "E2")?.status, "unavailable_redacted");
  assert.ok(!r.findings.some((f) => f.id === "M-E2"));
});

test("no displayed text may recommend or name another charge", async () => {
  const c = load("C001");
  const r = await reviewCase(c, fake({
    review: review({
      citation: { status: "needs_human_review", explanation: "Facts are mixed. The officer should consider 8 U.S.C. 1325(a) instead.", evidence: [] },
      human_review: { required: true, reasons: ["A more appropriate charge would be INA 237(a)(1)(B)."] },
      elements: [{ element_id: "E6", status: "present", sentence_ids: ["S16"], note: "Supports 8 U.S.C. 1326 as well." }],
    }),
  }));
  const shown = JSON.stringify([r.citation.explanation, r.humanReview.reasons, r.findings.map((f) => [f.title, f.explanation, f.humanReviewReason]), r.elements.map((e) => e.note)]);
  assert.ok(!/1325|1326|237\(a\)\(1\)\(B\)|more appropriate/i.test(shown), shown);
});

test("merging samples does not double-count the same issue", async () => {
  const c = load("C012-X1");
  const s = sid(c, "tourist visa");
  const issue = { type: "inconsistency", title: "Conflict", explanation: "Two accounts.", evidence: [{ sentence_id: s, quote: "on a tourist visa" }, { field_path: "entry.manner" }], needs_human_review: true, reason: "" };
  const r = await reviewCase(c, fake({ review: review({ issues: [issue] }) }));
  assert.equal(r.findings.filter((f) => f.category === "inconsistency").length, 1);
  assert.equal(r.modelConfig.samples, 2);
});

test("the selected charge itself is kept in any equivalent form", async () => {
  const text = "The facts support INA 212(a)(6)(A)(i), also cited as 8 U.S.C. 1182(a)(6)(A)(i). The subject crossed without inspection.";
  const r = await reviewCase(load("C001"), fake({ review: review({ citation: { status: "consistent", explanation: text, evidence: [] } }) }));
  assert.equal(r.citation.explanation, text);
});

test("an unresolved entry conflict prevents a plain 'consistent' citation (design review item 4)", async () => {
  const c = load("C012-X1");
  const visa = sid(c, "tourist visa"), port = sid(c, "did not cross through a designated Port");
  const r = await reviewCase(c, fake({
    facts: facts({ entry_statements: [
      { sentence_id: visa, quote: "by flying into Chicago O'Hare International Airport on a tourist visa", year: 2013, manner: "admitted", person: "subject" },
      { sentence_id: port, quote: "did not cross through a designated Port of Entry", year: null, manner: "without_inspection", person: "subject" },
    ] }),
  }));
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-MANNER"));
  assert.equal(r.citation.status, "needs_human_review");
  assert.match(r.citation.explanation, /unresolved conflict/);
});

// ---- Regression tests for the final run's confirmed errors (eval/runs/2026-10-29T23-32-42) ----

test("bug C021: a redacted companion's entry year is not a contradiction when an explicit 'Subject' statement agrees with the form", async () => {
  const c = load("C021");
  const s4 = sid(c, "Subject entered the United States at the Miami"), s29 = sid(c, "arriving on 06- 01-2016");
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [
    { sentence_id: s4, quote: "Subject entered the United States at the Miami International Airport", event: "us_entry", country: "United States", year: 2015, manner: "admitted", person: "subject" },
    { sentence_id: s29, quote: "entered as a B-1/B2 arriving on 06- 01-2016", event: "us_entry", country: "United States", year: 2016, manner: "admitted", person: "unclear" },
  ] }) }));
  assert.ok(!r.findings.some((f) => f.id.startsWith("F-ENTRY-DATE")), JSON.stringify(r.findings.map((f) => f.id)));
});

test("planted date conflict is still found when the differing statement is explicitly about the subject (C021-X1)", async () => {
  const c = load("C021-X1");
  const s4 = sid(c, "Subject entered the United States at the Miami");
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [
    { sentence_id: s4, quote: "Subject entered the United States at the Miami International Airport port of entry (MIA) on 12/23/2013", event: "us_entry", country: "United States", year: 2013, manner: "admitted", person: "unclear" },
  ] }) }));
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-DATE"));
});

test("planted date conflict between two unattributed statements is still found (C045-X1)", async () => {
  const c = load("C045-X1");
  const s30 = sid(c, "claims to have last entered"), s35 = sid(c, "February 21, 2015");
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [
    { sentence_id: s30, quote: "last entered the United States on February 21, 2012", event: "us_entry", year: 2012, manner: "admitted", person: "unclear" },
    { sentence_id: s35, quote: "last entered the United States on February 21, 2015", event: "us_entry", year: 2015, manner: "admitted", person: "unclear" },
  ] }) }));
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-DATE"));
});

test("bug C013: entering Mexico is not compared with the U.S. entry field", async () => {
  const c = load("C013");
  const s6 = sid(c, "illegally entered into Mexico");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Entry facts mismatch", explanation: "Form field indicates entry as PWA (AFOOT) but narrative describes illegal crossing.", evidence: [{ field_path: "entry.manner" }, { sentence_id: s6, quote: "illegally entered into Mexico by walking through the mountains" }], needs_human_review: true, reason: "" }] }),
    facts: facts({ entry_statements: [{ sentence_id: s6, quote: "illegally entered into Mexico by walking through the mountains", event: "other_country_entry", country: "Mexico", year: null, manner: "without_inspection", person: "unclear" }] }),
  }));
  assert.ok(!r.findings.some((f) => f.title === "Entry facts mismatch"));
  assert.ok(r.discarded.some((d) => /another country/.test(d.reason)));
});

test("bug C003-CIT: a stated lack of status establishes E6 even if the model says absent", async () => {
  const c = load("C003-CIT");
  const s24 = sid(c, "present in the United States Illegally");
  const r = await reviewCase(c, fake({
    review: review({ elements: [{ element_id: "E6", status: "absent", sentence_ids: [], note: "" }, { element_id: "E7", status: "present", sentence_ids: ["S41"], note: "" }] }),
    facts: facts({ status_statements: [{ sentence_id: s24, quote: "if he was present in the United States Illegally, and he advised yes", person: "unclear" }] }),
  }));
  assert.equal(r.elements.find((e) => e.elementId === "E6")?.status, "present");
  assert.ok(!r.findings.some((f) => f.id === "M-E6"));
});

test("a status statement without status wording does not override the model", async () => {
  const c = load("C003-CIT");
  const r = await reviewCase(c, fake({
    review: review({ elements: [{ element_id: "E6", status: "absent", sentence_ids: [], note: "" }] }),
    facts: facts({ status_statements: [{ sentence_id: "S7", quote: "the Border Patrol station assisted in the identification", person: "unclear" }] }),
  }));
  assert.equal(r.elements.find((e) => e.elementId === "E6")?.status, "absent");
});

test("bug C135-M3: 'came to the United States near Sasabe' does not state a manner of entry", async () => {
  const c = load("C135-M3");
  const s = sid(c, "came to the United States near Sasabe");
  const r = await reviewCase(c, fake({
    review: review({ elements: [{ element_id: "E3", status: "present", sentence_ids: [s], note: "Narrative states the subject entered near Sasabe" }] }),
    facts: facts({ entry_statements: [{ sentence_id: s, quote: "came to the United States near Sasabe, Arizona", event: "us_entry", country: "United States", year: null, manner: "without_inspection", person: "unclear" }] }),
  }));
  assert.equal(r.elements.find((e) => e.elementId === "E3")?.status, "absent");
  assert.ok(r.findings.some((f) => f.id === "M-E3"));
});

test("bug C021-CIT: a date claim that its evidence does not contain is withheld", async () => {
  const c = load("C021-CIT");
  const s = sid(c, "At 0412 am");
  const r = await reviewCase(c, fake({ review: review({ issues: [{ type: "inconsistency", title: "Encounter date mismatch", explanation: "Narrative reports encounter on 4/12/2017 while form field lists 4/16/2017.", evidence: [{ sentence_id: s, quote: "At 0412 am, Sector Dispatch requested" }, { field_path: "encounter.date_time" }], needs_human_review: true, reason: "" }] }) }));
  assert.ok(!r.findings.some((f) => f.title === "Encounter date mismatch"));
  assert.ok(r.discarded.some((d) => /4\/12\/2017/.test(d.reason)));
});

// ---- Regression tests for recurring false flags in the M2 runs (2026-10-30) ----

test("PWA (AFOOT) vs 'illegally crossed ... by swimming' is not a conflict (C013)", async () => {
  const c = load("C013");
  const s8 = sid(c, "eventually illegally crossed");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Entry manner mismatch", explanation: "Narrative states subject entered illegally, while form entry.manner indicates PWA.", evidence: [{ sentence_id: s8, quote: "eventually illegally crossed the United States/Mexico Border near Laredo" }, { field_path: "entry.manner" }], needs_human_review: true, reason: "" }] }),
    facts: facts({ entry_statements: [{ sentence_id: s8, quote: "eventually illegally crossed the United States/Mexico Border near Laredo, Texas by swimming", event: "us_entry", country: "United States", year: null, manner: "without_inspection", person: "unclear" }] }),
  }));
  assert.ok(!r.findings.some((f) => f.title === "Entry manner mismatch"));
  assert.ok(r.discarded.some((d) => /same manner of entry/.test(d.reason)));
});

test("a real manner conflict with the form code is still reported (C012-X1)", async () => {
  const c = load("C012-X1");
  const visa = sid(c, "tourist visa");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Visa vs PWA", explanation: "The narrative says a tourist visa; the form says PWA.", evidence: [{ sentence_id: visa, quote: "by flying into Chicago O'Hare International Airport on a tourist visa" }, { field_path: "entry.manner" }], needs_human_review: true, reason: "" }] }),
    facts: facts({ entry_statements: [{ sentence_id: visa, quote: "by flying into Chicago O'Hare International Airport on a tourist visa", event: "us_entry", country: "United States", year: 2013, manner: "admitted", person: "unclear" }] }),
  }));
  assert.ok(r.findings.some((f) => f.category === "inconsistency"));
});

test("a model conflict citing an entry into Mexico is withheld even without a form field (C013-X1)", async () => {
  const c = load("C013-X1");
  const s6 = sid(c, "illegally entered into Mexico"), s8 = sid(c, "eventually illegally crossed");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Walking vs swimming", explanation: "One sentence says walking, another swimming.", evidence: [{ sentence_id: s6, quote: "illegally entered into Mexico by walking through the mountains" }, { sentence_id: s8, quote: "eventually illegally crossed the United States/Mexico Border" }], needs_human_review: true, reason: "" }] }),
    facts: facts({ entry_statements: [
      { sentence_id: s6, quote: "illegally entered into Mexico by walking through the mountains", event: "other_country_entry", country: "Mexico", year: null, manner: "without_inspection", person: "unclear" },
    ] }),
  }));
  assert.ok(!r.findings.some((f) => f.title === "Walking vs swimming"));
});

test("a citation 'mismatch' for a reentry charge is downgraded when prior removals are documented (C013)", async () => {
  const c = load("C013");
  const s = sid(c, "received an Expedited Removal");
  const r = await reviewCase(c, fake({
    review: review({ citation: { status: "likely_mismatch", explanation: "The narrative supports the charge but the form conflicts.", evidence: [{ sentence_id: s, quote: "received an Expedited Removal" }] } }),
    facts: facts({ removal_statements: [{ sentence_id: s, quote: "was arrested by Border Patrol and received an Expedited Removal", person: "unclear" }] }),
  }));
  assert.equal(r.citation.status, "needs_human_review");
  assert.ok(!r.findings.some((f) => f.category === "citation"));
});

test("checklist v2: traveler's explanation (N6) is not applicable without a discrepancy and never becomes a flag", async () => {
  const clean = await reviewCase(load("C037"), fake({}));
  assert.equal(clean.elements.find((e) => e.elementId === "N6")?.status, "not_applicable");
  assert.equal(clean.elements.find((e) => e.elementId === "N3")?.status, "not_applicable", "port-of-entry item on an interior case");
  assert.equal(clean.caseContext?.contexts.join(","), "interior");
  const c = load("C012-X1");
  const visa = sid(c, "tourist visa"), port = sid(c, "did not cross through a designated Port");
  const r = await reviewCase(c, fake({
    review: review({ elements: [{ element_id: "N6", status: "absent", sentence_ids: [], note: "" }] }),
    facts: facts({ entry_statements: [
      { sentence_id: visa, quote: "by flying into Chicago O'Hare International Airport on a tourist visa", event: "us_entry", year: 2013, manner: "admitted", person: "unclear" },
      { sentence_id: port, quote: "did not cross through a designated Port of Entry", event: "us_entry", year: null, manner: "without_inspection", person: "unclear" },
    ] }),
  }));
  assert.equal(r.elements.find((e) => e.elementId === "N6")?.status, "absent");
  assert.ok(!r.findings.some((f) => f.referenceIds.includes("N6")), "advisory: shown in the checklist, not issued as a flag");
});
