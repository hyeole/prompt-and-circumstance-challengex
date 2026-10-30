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

test("bug: charge-fit statements were also issued as separate inconsistencies (C001-CIT; checked on single-person C037-CIT)", async () => {
  const c = load("C037-CIT");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Subject not admitted but charge requires admission", explanation: "The charge requires admission.", evidence: [{ field_path: "entry.manner" }, { sentence_id: sid(c, "crossed the US/MEXICO Border illegally"), quote: "crossed the US/MEXICO Border illegally" }], needs_human_review: true, reason: "" }] }),
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

const c37 = load("C037-X1");
const s37 = sid(c37, "on the afternoon of 06/15/2012");
const conflict37 = facts({ entry_statements: [{ sentence_id: s37, quote: "crossed the US/MEXICO Border illegally, into Naco, Arizona, on the afternoon of 06/15/2012", event: "us_entry", year: 2012, manner: "without_inspection", person: "unclear" }] });

test("merging samples does not double-count the same issue", async () => {
  const c = c37;
  const issue = { type: "inconsistency", title: "Conflict", explanation: "Two accounts of the entry date.", evidence: [{ sentence_id: s37, quote: "on the afternoon of 06/15/2012" }, { field_path: "entry.date" }], needs_human_review: true, reason: "" };
  const r = await reviewCase(c, fake({ review: review({ issues: [issue] }) }));
  assert.equal(r.findings.filter((f) => f.category === "inconsistency").length, 1);
  assert.equal(r.modelConfig.samples, 2);
});

test("the selected charge itself is kept in any equivalent form", async () => {
  const text = "The facts support INA 212(a)(6)(A)(i), also cited as 8 U.S.C. 1182(a)(6)(A)(i). The subject crossed without inspection.";
  const c = load("C037");
  const s = sid(c, "crossed the US/MEXICO Border illegally");
  const r = await reviewCase(c, fake({ review: review({ citation: { status: "consistent", explanation: text, evidence: [] } }),
    facts: facts({ entry_statements: [{ sentence_id: s, quote: "crossed the US/MEXICO Border illegally", event: "us_entry", year: 2009, manner: "without_inspection", person: "unclear" }] }) }));
  assert.equal(r.citation.status, "consistent");
  assert.equal(r.citation.explanation, text);
});

test("an unresolved entry conflict prevents a plain 'consistent' citation (design review item 4)", async () => {
  const r = await reviewCase(c37, fake({ facts: conflict37 }));
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-DATE"));
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

test("audit item 3: an unattributed manner claim in a multi-person narrative is routed, not flagged (C012-X1)", async () => {
  const c = load("C012-X1");
  const visa = sid(c, "tourist visa");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Visa vs PWA", explanation: "The narrative says a tourist visa; the form says PWA.", evidence: [{ sentence_id: visa, quote: "by flying into Chicago O'Hare International Airport on a tourist visa" }, { field_path: "entry.manner" }], needs_human_review: true, reason: "" }] }),
    facts: facts({ entry_statements: [{ sentence_id: visa, quote: "by flying into Chicago O'Hare International Airport on a tourist visa", event: "us_entry", country: "United States", year: 2013, manner: "admitted", person: "unclear" }] }),
  }));
  assert.ok(!r.findings.some((f) => f.category === "inconsistency"));
  assert.ok(r.humanReview.reasons.some((x) => x.includes(visa) && /cannot be attributed/.test(x)));
});

test("a real manner conflict explicitly about the subject is still reported", async () => {
  const c = load("C012-X1");
  const visa = sid(c, "tourist visa");
  const text = sentences(c).map((x) => (x.id === visa ? x.text.replace(/^.*?claims/, "The subject claims") : x.text)).join(" ");
  const c2 = { ...c, narrative: { text } } as CaseRecord;
  const v2 = sid(c2, "tourist visa");
  const r = await reviewCase(c2, fake({ facts: facts({ entry_statements: [{ sentence_id: v2, quote: "by flying into Chicago O'Hare International Airport on a tourist visa", event: "us_entry", year: 2013, manner: "admitted", person: "subject" }] }) }));
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-MANNER"));
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
  const r = await reviewCase(c37, fake({ review: review({ elements: [{ element_id: "N6", status: "absent", sentence_ids: [], note: "" }] }), facts: conflict37 }));
  assert.equal(r.elements.find((e) => e.elementId === "N6")?.status, "absent");
  assert.ok(!r.findings.some((f) => f.referenceIds.includes("N6")), "advisory: shown in the checklist, not issued as a flag");
});

// ---- Regression tests for errors found in the fresh-v1 internal evaluation (post-tuning fixes) ----
const loadF = (id: string) => JSON.parse(readFileSync(`eval/fresh/cases/${id}.json`, "utf8")) as CaseRecord;

test("fresh FS08: 'visiting a friend for two weeks' is a stated purpose of travel", async () => {
  const r = await reviewCase(loadF("FS08"), fake({}));
  assert.equal(r.elements.find((e) => e.elementId === "N3")?.status, "present");
});

test("fresh F010-D: an arrest is not a disposition", async () => {
  const c = loadF("F010-D");
  const arrest = sid(c, "under arrest");
  const r = await reviewCase(c, fake({ review: review({ elements: [{ element_id: "N7", status: "present", sentence_ids: [arrest], note: "Subject was placed under arrest" }] }) }));
  assert.equal(r.elements.find((e) => e.elementId === "N7")?.status, "absent");
  assert.ok(r.findings.some((f) => f.id === "M-N7"));
});

test("fresh FS06: an altered passport establishes the basis for the violation (E6)", async () => {
  const r = await reviewCase(loadF("FS06"), fake({ review: review({ elements: [{ element_id: "E6", status: "absent", sentence_ids: [], note: "" }] }) }));
  assert.equal(r.elements.find((e) => e.elementId === "E6")?.status, "present");
});

test("fresh FS02: a first answer the narrative corrects and explains is not an entry-date conflict", async () => {
  const c = loadF("FS02");
  const s = sid(c, "she entered in 2020");
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [{ sentence_id: s, quote: "the subject said she entered in 2020", event: "us_entry", year: 2020, manner: "unknown", person: "unclear" }] }) }));
  assert.ok(!r.findings.some((f) => f.id.startsWith("F-ENTRY-DATE")));
});

test("fresh FS10: an unattributed group member's deportation is not evidence against this subject's record", async () => {
  const c = loadF("FS10");
  const s = sid(c, "deported to Honduras");
  const r = await reviewCase(c, fake({ review: review({ issues: [{ type: "inconsistency", title: "History record conflict", explanation: "Narrative reports a prior removal in 2019, but the form field indicates a negative immigration record.", evidence: [{ sentence_id: s, quote: "stated that he was deported to Honduras in 2019" }, { field_path: "history.immigration_record" }], needs_human_review: true, reason: "" }] }) }));
  assert.ok(!r.findings.some((f) => f.title === "History record conflict"));
});

test("fresh F055: a combined date/place claim whose manner part misreads PWA is withheld", async () => {
  const c = loadF("F055");
  const s = sid(c, "crossing the Rio Grande River near Hildalgo");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Entry facts mismatch", explanation: "Form fields list entry date, place, and manner (PWA AFOOT) that differ from the river crossing.", evidence: [{ sentence_id: s, quote: "claims to have last entered the United States illegally by crossing the Rio Grande River" }, { field_path: "entry.date" }, { field_path: "entry.manner" }], needs_human_review: true, reason: "" }] }),
    facts: facts({ entry_statements: [{ sentence_id: s, quote: "claims to have last entered the United States illegally by crossing the Rio Grande River near Hildalgo, Texas", event: "us_entry", year: 2014, manner: "without_inspection", person: "unclear" }] }),
  }));
  assert.ok(!r.findings.some((f) => f.title === "Entry facts mismatch"));
});

test("a documented prior removal in a one-person narrative still contradicts a NEGATIVE record (code-side attribution)", async () => {
  const c = load("C013-X1");
  const s = sid(c, "received an Expedited Removal");
  const r = await reviewCase({ ...c, narrative: { text: sentenceText(c, s) } } as CaseRecord, fake({ facts: facts({ removal_statements: [{ sentence_id: "S1", quote: "was arrested by Border Patrol and received an Expedited Removal", person: "unclear" }] }) }));
  assert.ok(r.findings.some((f) => f.id === "F-HISTORY"));
});
const sentences = (c: CaseRecord) => splitSentences(c.narrative.text, c.narrative.pageSpans);
function sentenceText(c: CaseRecord, id: string) { return splitSentences(c.narrative.text, c.narrative.pageSpans).find((x) => x.id === id)!.text; }

// ---- Regression tests for the post-tuning runs' false flags (eval/runs/2026-10-30T03-03-23, 2026-10-30T03-05-54) ----

const loadD = (id: string) => JSON.parse(readFileSync(`eval/dev-synthetic/cases/${id}.json`, "utf8")) as CaseRecord;

test("dev DS10: current expedited-removal processing is not a prior removal", async () => {
  const c = loadD("DS10");
  const s = sid(c, "processed for expedited removal");
  const r = await reviewCase(c, fake({ facts: facts({ removal_statements: [{ sentence_id: s, quote: "The subject was processed for expedited removal and was served Form I-860", person: "subject" }] }) }));
  assert.ok(!r.findings.some((f) => f.id === "F-HISTORY"));
});

test("fresh FS02: a corrected first answer is not a second entry year either", async () => {
  const c = loadF("FS02");
  const first = sid(c, "she entered in 2020"), main = sid(c, "on or about September 3, 2019");
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [
    { sentence_id: main, quote: "she entered the United States on or about September 3, 2019, by wading across the Rio Grande", event: "us_entry", year: 2019, manner: "without_inspection", person: "subject" },
    { sentence_id: first, quote: "the subject said she entered in 2020", event: "us_entry", year: 2020, manner: "unknown", person: "subject" },
  ] }) }));
  assert.ok(!r.findings.some((f) => f.id.startsWith("F-ENTRY-DATE")));
});

test("fresh F075-X: a model 'mismatch' that says the narrative supports the charge is routed, not flagged, even if the fact call fails", async () => {
  const c = loadF("F075-X");
  const s = sid(c, "crossed the Rio Grande River into the United States");
  const r = await reviewCase(c, fake({
    facts: new ModelError("timeout", "timeout", 1),
    review: review({
      issues: [{ type: "inconsistency", title: "Entry date conflict", explanation: "Narrative indicates entry in 2011, while form fields list 06/09/2013.", evidence: [{ sentence_id: s, quote: "crossed the Rio Grande River into the United States" }, { field_path: "entry.date" }], needs_human_review: true, reason: "" }],
      citation: { status: "likely_mismatch", explanation: "The selected charge requires entry without inspection, which the narrative supports, but the entry date conflict raises uncertainty about the applicable entry event.", evidence: [{ sentence_id: s, quote: "crossed the Rio Grande River into the United States" }] },
    }),
  }));
  assert.ok(!r.findings.some((f) => f.id === "C-1"));
  assert.equal(r.citation.status, "needs_human_review");
});

test("a past removal with a date is still a removal even when it names the expedited-removal form", async () => {
  const c = loadD("DS10");
  const r = await reviewCase({ ...c, narrative: { text: "The subject was previously removed on 03/02/2018 and was served Form I-860, Notice and Order of Expedited Removal." } } as CaseRecord,
    fake({ facts: facts({ removal_statements: [{ sentence_id: "S1", quote: "The subject was previously removed on 03/02/2018", person: "subject" }] }) }));
  assert.ok(r.findings.some((f) => f.id === "F-HISTORY"));
});

// ---- Independent audit (items 4-6) ----

test("audit item 5: an unknown encounter date with a known location and method is only partly established", async () => {
  const c = load("C037");
  const facts2 = c.facts.map((f) => (f.path === "encounter.date_time" ? { ...f, value: "Unknown Date, Unknown Time", status: "present" as const } : f));
  const r = await reviewCase({ ...c, facts: facts2 }, fake({}));
  const e4 = r.elements.find((e) => e.elementId === "E4")!;
  assert.equal(e4.status, "present");
  assert.equal(e4.qualifier, "partly_unknown");
  assert.match(e4.note ?? "", /Unknown Date/);
});

test("audit item 5: a narrative that only says the entry date is unknown documents it without establishing it", async () => {
  const c = load("C003");
  const s = sid(c, "does not recall anything about his illegal entry");
  const facts2 = c.facts.filter((f) => f.path !== "entry.date");
  const r = await reviewCase({ ...c, facts: facts2 }, fake({ review: review({ elements: [{ element_id: "E1", status: "present", sentence_ids: [s], note: "" }] }) }));
  const e1 = r.elements.find((e) => e.elementId === "E1")!;
  assert.equal(e1.qualifier, "recorded_unknown");
});

test("audit item 6: a 'consistent' verdict without verified support is routed to a person", async () => {
  const c = load("C037");
  const r = await reviewCase({ ...c, facts: c.facts.filter((f) => f.path !== "entry.manner") }, fake({ review: review({ citation: { status: "consistent", explanation: "Supported.", evidence: [] } }) }));
  assert.equal(r.citation.status, "needs_human_review");
});

test("audit item 6: a selected citation that disagrees with its reference ID is routed, never checked against either", async () => {
  const c = load("C037");
  const r = await reviewCase({ ...c, selectedCharges: [{ ...c.selectedCharges[0], citation: "INA 237(a)(1)(B)" }] }, fake({}));
  assert.equal(r.citation.status, "needs_human_review");
  assert.match(r.citation.explanation, /does not match its reference ID/);
  assert.ok(r.humanReview.required);
});

test("audit item 1: a failed fact-extraction call makes the review partial even when the model review succeeded", async () => {
  const r = await reviewCase(load("C037"), fake({ facts: new ModelError("timeout", "timeout", 1) }));
  assert.equal(r.modelStatus, "ok");
  assert.equal(r.completion?.status, "partial");
  assert.ok(r.completion?.failed.some((f) => f.check === "Fact extraction"));
});

test("audit item 1: elements the model omitted make the review partial", async () => {
  const r = await reviewCase(load("C037"), fake({ review: review({ elements: [] }) }));
  assert.equal(r.completion?.status, "partial");
  assert.ok(r.completion?.failed.some((f) => f.check === "Required elements"));
});

test("audit: a mixed claim keeps its supported date part when only the manner part is wrong", async () => {
  const c = load("C037-X1");
  const s = sid(c, "on the afternoon of 06/15/2012");
  const r = await reviewCase(c, fake({
    review: review({ issues: [{ type: "inconsistency", title: "Entry facts mismatch", explanation: "The narrative's crossing differs from the form's EWI AFOOT entry and date.", evidence: [{ sentence_id: s, quote: "crossed the US/MEXICO Border illegally" }, { field_path: "entry.manner" }, { field_path: "entry.date" }], needs_human_review: true, reason: "" }] }),
    facts: facts({ entry_statements: [{ sentence_id: s, quote: "crossed the US/MEXICO Border illegally, into Naco, Arizona, on the afternoon of 06/15/2012", event: "us_entry", year: null, manner: "without_inspection", person: "unclear" }] }),
  }));
  const kept = r.findings.find((f) => f.category === "inconsistency");
  assert.ok(kept, "the date conflict is retained");
  assert.ok(!kept!.evidence.some((e) => e.fieldPath === "entry.manner"), "the unsupported manner part is removed");
  assert.match(kept!.explanation, /2012/);
  assert.equal(kept!.source, "model", "retained from the model claim, not re-derived by the fact comparison");
});

// ---- Post-audit runs (2026-10-30T03-48-20, 03-52-17): over-routing found and fixed (post-tuning) ----

test("DS07: INA 212(a)(7)(A)(i)(I) needs an application for admission, not a prior admission", async () => {
  const c = loadD("DS07");
  const r = await reviewCase(c, fake({ review: review({ citation: { status: "consistent", explanation: "Supported.", evidence: [] } }) }));
  assert.equal(r.citation.status, "consistent");
});

test("a known form code that meets the charge's requirement is verified support in a multi-person narrative (F010)", async () => {
  const c = loadF("F010");
  const r = await reviewCase(c, fake({ review: review({ citation: { status: "consistent", explanation: "Supported.", evidence: [] } }) }));
  assert.equal(r.citation.status, "consistent");
});

test("without a form code or an attributable statement, 'consistent' is still routed (DS11)", async () => {
  const r = await reviewCase(loadD("DS11"), fake({ review: review({ citation: { status: "consistent", explanation: "Supported.", evidence: [] } }) }));
  assert.equal(r.citation.status, "needs_human_review");
});

// ---- Post-audit diagnosis fixes (eval/fresh/POST-AUDIT-DIAGNOSIS.md); post-tuning ----



test("negative control DS06: a companion's different year with no form link stays unflagged", async () => {
  const c = loadD("DS06");
  const s = sid(c, "in 2016");
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [{ sentence_id: s, quote: sentenceText(c, s), event: "us_entry", year: 2016, manner: "without_inspection", person: "unclear" }] }) }));
  assert.ok(!r.findings.some((f) => f.id.startsWith("F-ENTRY-DATE")));
});

test("negative control F055-A: a conflicting manner with nothing on the form to link it stays routed", async () => {
  const c = loadF("F055-A");
  const s = sid(c, "border crossing card");
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [{ sentence_id: s, quote: "he stated that he entered the United States through the Hidalgo port of entry with a border crossing card", event: "us_entry", year: null, manner: "admitted", person: "unclear" }] }) }));
  assert.ok(!r.findings.some((f) => f.id === "F-ENTRY-MANNER"));
  assert.ok(r.humanReview.reasons.some((x) => x.includes(s) && /cannot be attributed/.test(x)));
});

test("F051-C: 'one had been ordered removed ... the last subject was in status' is about group members, not this subject", async () => {
  const c = loadF("F051-C");
  const s = sid(c, "one had been ordered removed");
  const r = await reviewCase(c, fake({ facts: facts({ removal_statements: [{ sentence_id: s, quote: "one had been ordered removed", person: "unclear" }] }) }));
  assert.ok(!r.findings.some((f) => f.id === "F-HISTORY"));
});

test("invalid fact output is retried once and the reason is logged without content", async () => {
  let n = 0;
  const complete: Complete = async (system) => {
    if (system === FACTS_SYSTEM_PROMPT) return { text: n++ === 0 ? "not json at all" : facts(), attempts: 1 };
    return { text: review(), attempts: 1 };
  };
  const r = await reviewCase(load("C037"), complete);
  const first = r.calls.find((x) => x.role === "facts")!;
  assert.equal(first.status, "invalid_output");
  assert.equal(first.error, "not valid JSON");
  assert.equal(r.calls.find((x) => x.role === "facts-retry")?.status, "ok");
  assert.ok(!r.completion?.failed.some((f) => f.check === "Fact extraction"));
});

test("provenance: a missing element decided by a deterministic detector is a rule finding (F039-G)", async () => {
  const r = await reviewCase(loadF("F039-G"), fake({ facts: new ModelError("timeout", "timeout", 1) }));
  const n5 = r.findings.find((f) => f.id === "M-N5" || f.id === "U-N5");
  assert.ok(n5);
  assert.equal(n5!.source, "rule");
});

test("F055-H: a form that records a prior removal the narrative never describes is routed as a clarity gap", async () => {
  const r = await reviewCase(loadF("F055-H"), fake({}));
  const f = r.findings.find((x) => x.id === "F-HISTORY-2");
  assert.ok(f);
  assert.equal(f!.category, "unclear");
  assert.ok(f!.needsHumanReview);
});

// ---- Refinement: attribute only when identity is uniquely supported (post-tuning) ----
const multi = (entry: string) => `ENCOUNTER: Agents stopped a vehicle with two occupants, [REDACTED] and [REDACTED], near Monroe, Michigan. Both subjects were arrested. ENTRY: ${entry} REMOVABILITY: The subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act.`;
const synth = (entry: string, facts2: { path: string; value: string }[]): CaseRecord => {
  const c = load("C037");
  return { ...c, id: "T-ATTR", narrative: { text: multi(entry) }, facts: c.facts.map((f) => facts2.find((x) => x.path === f.path) ? { ...f, ...facts2.find((x) => x.path === f.path)!, status: "present" as const } : f) };
};
const form = [{ path: "entry.date", value: "05/05/2011, 1400" }, { path: "entry.place", value: "2 mile(s) W of NOG" }, { path: "entry.manner", value: "EWI AFOOT" }];
const entryFacts = (c: CaseRecord, needle: string, year: number) => {
  const s = sid(c, needle);
  return facts({ entry_statements: [{ sentence_id: s, quote: sentenceText(c, s), event: "us_entry", year, manner: "without_inspection", person: "unclear" }] });
};

test("unique support: one entry account matching the form on day, place and manner keeps the year conflict, with the reason", async () => {
  const c = synth("[REDACTED] stated that he crossed the border illegally near Nogales, Arizona on May 5, 2014.", form);
  const r = await reviewCase(c, fake({ facts: entryFacts(c, "May 5, 2014", 2014) }));
  const f = r.findings.find((x) => x.id === "F-ENTRY-DATE");
  assert.ok(f);
  assert.match(f!.explanation, /nothing in the narrative suggests another person shares those facts/);
});

test("one matching fact is not enough: only the month and day match (no place, no manner)", async () => {
  const c = synth("[REDACTED] stated that he came to the United States on May 5, 2014.", form);
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [{ sentence_id: sid(c, "May 5, 2014"), quote: "came to the United States on May 5, 2014", event: "us_entry", year: 2014, manner: "unknown", person: "unclear" }] }) }));
  assert.ok(!r.findings.some((x) => x.id === "F-ENTRY-DATE"));
});

test("negative control, shared date: a companion's account gives the same month and day", async () => {
  const c = synth("[REDACTED] stated that he crossed the border illegally near Nogales, Arizona on May 5, 2014. [REDACTED] stated that he crossed on May 5, 2011.", form);
  const r = await reviewCase(c, fake({ facts: entryFacts(c, "May 5, 2014", 2014) }));
  assert.ok(!r.findings.some((x) => x.id === "F-ENTRY-DATE"));
  assert.ok(r.humanReview.reasons.some((x) => /cannot be attributed/.test(x)));
});

test("negative control, shared manner: a companion's account also crossed illegally", async () => {
  const c = synth("[REDACTED] stated that he crossed the border illegally near Nogales, Arizona on May 5, 2014. [REDACTED] stated that he walked across the border illegally in 2012.", form);
  const r = await reviewCase(c, fake({ facts: entryFacts(c, "May 5, 2014", 2014) }));
  assert.ok(!r.findings.some((x) => x.id === "F-ENTRY-DATE"));
});

test("negative control, travelled together: 'with eight other individuals' (F010-X) stays routed", async () => {
  const c = loadF("F010-X");
  const r = await reviewCase(c, fake({ facts: entryFacts(c, "May 5, 2014", 2014) }));
  assert.ok(!r.findings.some((x) => x.id === "F-ENTRY-DATE"));
  assert.ok(r.humanReview.reasons.some((x) => /cannot be attributed/.test(x)));
});

test("F075-X stays routed: another account in the narrative crossed 'with about five other individuals' into El Paso", async () => {
  const c = loadF("F075-X");
  const r = await reviewCase(c, fake({ facts: entryFacts(c, "the day after returning to Mexico", 2011) }));
  assert.ok(!r.findings.some((x) => x.id === "F-ENTRY-DATE"));
});

test("C045-X1 stays routed: another unattributed account gives the form's own date (February 21, 2012)", async () => {
  const c = load("C045-X1");
  const s30 = sid(c, "claims to have last entered"), s35 = sid(c, "February 21, 2015");
  const r = await reviewCase(c, fake({ facts: facts({ entry_statements: [
    { sentence_id: s30, quote: "last entered the United States on February 21, 2012", event: "us_entry", year: 2012, manner: "admitted", person: "unclear" },
    { sentence_id: s35, quote: "last entered the United States on February 21, 2015", event: "us_entry", year: 2015, manner: "admitted", person: "unclear" },
  ] }) }));
  assert.ok(!r.findings.some((x) => x.id.startsWith("F-ENTRY-DATE")));
});

test("DS06: a model claim comparing two companions' years is routed, not flagged", async () => {
  const c = loadD("DS06");
  const a = sid(c, "in 2016"), b = sid(c, "in 2018");
  const r = await reviewCase(c, fake({ review: review({ issues: [{ type: "inconsistency", title: "Conflicting entry dates", explanation: "The narrative reports two different years of entry, 2016 and 2018.", evidence: [{ sentence_id: a, quote: "entered the United States in 2016" }, { sentence_id: b, quote: "entered the United States in 2018" }], needs_human_review: true, reason: "" }] }) }));
  assert.ok(!r.findings.some((x) => x.title === "Conflicting entry dates"));
  assert.ok(r.humanReview.reasons.some((x) => /may be about different people/.test(x)));
});

test("FS09: a form removal that the narrative does describe in its own words is not a clarity gap, even if extraction missed it", async () => {
  const r = await reviewCase(loadF("FS09"), fake({}));
  assert.ok(!r.findings.some((x) => x.id === "F-HISTORY-2"));
});

test("F075-H: a voluntary return is not a removal, so it is neither a removal conflict nor routed as one", async () => {
  const c = loadF("F075-H");
  const s = sid(c, "resulted in a Voluntary Return");
  const r = await reviewCase(c, fake({ facts: facts({ removal_statements: [{ sentence_id: s, quote: "The second event resulted in a Voluntary Return", person: "unclear" }] }) }));
  assert.ok(!r.findings.some((x) => x.id === "F-HISTORY"));
  assert.ok(!r.humanReview.reasons.some((x) => x.includes(s) && /cannot be attributed/.test(x)));
});
