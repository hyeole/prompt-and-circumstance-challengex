/**
 * Event-scoped clock times. A narrative states times for different events: a call, request or dispatch ("at 0815
 * hours, a Trooper requested assistance"), an agent's arrival ("arrived at approximately 0900 hours"), the encounter
 * ("at 0910 hours, agents encountered …"), the arrest ("placed under arrest at 1330 hours") and later processing
 * ("transported to the station at 1500 hours"). Only an encounter or arrest time can conflict with the form's encounter
 * date and hour. A request or arrival time is not the encounter time unless the same clause also states the encounter
 * or arrest ("arrived at 0900 hours and encountered the subject"). A narrative that never states the encounter time
 * leaves it unresolved, which is not a contradiction.
 */
import type { Sentence } from "@/lib/types";
import { fullDates } from "./facts";

export type TimeEvent = "encounter" | "arrest" | "request" | "arrival" | "processing" | "unknown";
export type StatedTime = { sentenceId: string; hhmm: string; event: TimeEvent; at: number; clause: string };

/** Rewrite 12-hour clock times ("12:06 PM", "1:30 p.m.") as 24-hour times with "hours" ("1206 hours", "1330 hours"). */
export function to24h(t: string): string {
  return t.replace(/\b(\d{1,2}):(\d{2})\s*([ap])\.?\s?m\b\.?/gi, (_m, h: string, mm: string, ap: string) => {
    let hh = Number(h) % 12;
    if (/p/i.test(ap)) hh += 12;
    return `${String(hh).padStart(2, "0")}${mm} hours`;
  });
}

// A clock time, after to24h: "0815 hours", "0815 hrs", or "at 0815" / "at 0412 am" (four digits, a valid hour and
// minute). "at 1234 Main Street" (a capitalised word after it), a date ("0815/…") or a distance is not a time.
const TIME_RE = /\b(?:at\s+)?(?:approximately\s+|about\s+|around\s+)?(([01]\d|2[0-3])[0-5]\d)\s*(?:hours|hrs|hr)\b|\bat\s+(?:approximately\s+)?(([01]\d|2[0-3])[0-5]\d)(?:\s*[ap]\.?m\b\.?)?(?!\s*(?:\/|-|miles?\b|blocks?\b))(?![\w/])/gi;
/** 24-hour "09:10" (no am/pm) as "0910 hours". */
const colon24 = (t: string) => t.replace(/\b([01]\d|2[0-3]):([0-5]\d)\b(?!\s*[ap]\.?m)/gi, "$1$2 hours");
// Clause boundaries: a semicolon, a heading colon ("Facts of Arrest: …"), or ", and" / "and" before a new verb phrase.
// A time belongs to its own clause only.
const CLAUSE_RE = /;|:\s|,?\s+and\s+(?=(?:then|later|subsequently|was|were|he|she|they|agents?|the)\b)|,\s+(?=(?:who|which|where|after|before|when)\b)/gi;
// Event wording, by kind. A noun such as "a traffic stop" in a request is not an encounter by the agents.
const CUES: [TimeEvent, RegExp][] = [
  ["request", /\b(?:request\w*|call(?:ed|s)?\b|received\b|dispatch\w*|radio\w*|notif(?!\w* of (?:his|her|their) right)\w*|contacted|ask(?:ed)? for (?:assistance|help))/gi],
  ["arrest", /\b(?:arrest\w*|apprehend\w*|taken into custody|took (?:him|her|them|the subjects?) into custody)\b/gi],
  ["encounter", /\b(?:encounter\w*|detain\w*|observed|stopped|located|spotted|sighted|made contact|came into contact|intercepted)\b/gi],
  ["processing", /\b(?:process\w*|transport\w*|book\w*|fingerprint\w*|Miranda|served|interview\w*|released|notified of (?:his|her|their) right)/gi],
  ["arrival", /\b(?:arriv\w*|responded|reached|on scene)\b/gi],
];
function clauseAt(text: string, at: number): string {
  let start = 0, end = text.length;
  for (const m of text.matchAll(CLAUSE_RE)) { const a = m.index!, b = a + m[0].length; if (b <= at) start = Math.max(start, b); else if (a > at) end = Math.min(end, a); }
  return text.slice(start, end);
}
/**
 * The event a time at offset `at` of its clause belongs to: the event word nearest before it in the clause, or, with
 * none before, the nearest after it ("At 0815 hours, a Trooper requested …"). "arrested and transported … at 2145
 * hours" is the transport's time. An arrival counts as the encounter only when the same clause also states the
 * encounter or arrest ("arrived at 0900 hours and encountered the subject"): the source links them. Nothing else does.
 */
export function timeEvent(clause: string, at: number): TimeEvent {
  const cues = CUES.flatMap(([k, re]) => [...clause.matchAll(re)].map((m) => ({ k, at: m.index! })));
  const before = cues.filter((x) => x.at < at).sort((a, b) => b.at - a.at)[0];
  const after = cues.filter((x) => x.at > at).sort((a, b) => a.at - b.at)[0];
  const k = (before ?? after)?.k ?? "unknown";
  if (k === "arrival") { const link = cues.find((x) => x.k === "encounter" || x.k === "arrest"); if (link) return link.k; }
  return k;
}
/** Every clock time the narrative states, with the event it belongs to. */
export function statedTimes(sentences: Sentence[]): StatedTime[] {
  return sentences.flatMap((s) => {
    const t = colon24(to24h(s.text));
    return [...t.matchAll(TIME_RE)].filter((m) => m[1] || !/^\s+[A-Z][a-z]/.test(t.slice(m.index! + m[0].length))).map((m) => {
      const clause = clauseAt(t, m.index!);
      const start = t.indexOf(clause);
      return { sentenceId: s.id, hhmm: m[1] ?? m[3], event: timeEvent(clause, m.index! - start), at: m.index!, clause: clause.trim() };
    });
  });
}
export const isEncounterTime = (t: StatedTime) => t.event === "encounter" || t.event === "arrest";
export const toMinutes = (hhmm: string) => parseInt(hhmm.slice(0, 2)) * 60 + parseInt(hhmm.slice(2));
/** The difference the time rule treats as a discrepancy (R-TIME-MISMATCH): 30 minutes or more. */
export const TIME_TOLERANCE_MIN = 30;
/** The form's encounter hour ("03/12/2024 0910" → "0910"), if it states one. */
export const formTimeOf = (value: string | undefined) => (value ? to24h(value).match(/\b([01]\d|2[0-3])([0-5]\d)\b(?!\/)/g)?.pop() : undefined);
const LABEL: Record<TimeEvent, string> = {
  encounter: "the encounter", arrest: "the arrest", request: "a call or request", arrival: "an agent's or officer's arrival", processing: "a later step (transport or processing)", unknown: "no stated event",
};
export const describeTime = (t: StatedTime) => `${t.hhmm} hours (${LABEL[t.event]})`;

/**
 * Whether the narrative supports an encounter-time conflict with the form: a stated encounter or arrest time that
 * differs from the form's encounter hour by the tolerance or more. With `orUnresolved`, a differing time the narrative
 * ties to no event counts too: it does not establish a conflict, but it leaves one possible (used for routing, never
 * for a finding).
 */
export function encounterTimeConflict(sentences: Sentence[], formValue: string | undefined, orUnresolved = false): StatedTime | null {
  const ft = formTimeOf(formValue);
  if (!ft) return null;
  return statedTimes(sentences).find((t) => (isEncounterTime(t) || (orUnresolved && t.event === "unknown")) && Math.abs(toMinutes(t.hhmm) - toMinutes(ft)) >= TIME_TOLERANCE_MIN) ?? null;
}

// A routing reason (or part of one) about the encounter time, and its kind.
const TIME_TOPIC_RE = /\b(?:encounter|arrest|apprehension|stop)\b[^;.]{0,25}\b(?:times?|hours?|timing|date\/time|date and (?:hour|time))\b|\b(?:times?|timing|hours?)\b[^;.]{0,25}\b(?:of|for) (?:the )?(?:encounter|arrest|apprehension)\b|\b(?:encounter|arrival) times?\b|\bdiffering times\b|\b(?:the )?times? (?:differ|disagree|conflict)\w*\b|\bconflicting times\b/i;
const GAP_RE = /\b(?:not (?:stated|given|recorded|documented|provided|specified|included)|(?:does|did) not (?:state|give|record|say|specify|include|mention|provide)|missing|absent|no (?:encounter )?time|omit\w*|without (?:a|any) (?:narrative )?(?:date|time))\b/i;
const ASSERTS_RE = /\b(?:conflict\w*|mismatch\w*|discrepan\w*|inconsisten\w*|differ\w*|contradict\w*|disagree\w*|verify|verif\w*|confirm\w*|correct|accura\w*|clarif\w*|recording error)\b/i;
// Words a time-only part may use besides its topic: conflict wording, the sources, the encounter itself, and filler.
const TIME_PART_WORDS = new Set(("encounter encounters encountered arrest apprehension stop time times timing hour hours "
  + "conflict conflicts conflicting mismatch mismatches discrepancy discrepancies inconsistent inconsistency inconsistencies differ differs differing different difference "
  + "contradict contradiction between form field fields narrative record records recorded value values listed lists list reported states stated "
  + "potential possible need needs needed verify verified verification confirm confirmed correct correctly accurate accuracy clarify clarification "
  + "requires require required ensure event events same separate could may might affect impact determination determine whether the and with for from "
  + "regarding about of its this that these those there are was were has have had minor likely acceptable recording error refers refer which "
  + "circumstances timing occurred adjudication review impact affect accuracy determination").split(" "));
const partWords = (t: string) => t.toLowerCase().replace(/['’]s\b/g, "").match(/[a-z][a-z'-]{2,}/g) ?? [];
/**
 * A routing-reason part whose only concern is an asserted conflict in (or a need to verify) the encounter time or the
 * encounter record's timing: every word is time, encounter, conflict or follow-on wording ("Encounter time discrepancy
 * between narrative and form field", "Potential impact on the accuracy of the encounter record"). A part naming
 * anything else (a location, a person, an entry date, a charge) is not.
 */
export function timeOnlyAssertion(part: string, dateAgrees = false): boolean {
  if (!TIME_TOPIC_RE.test(part) && !/\b(?:encounter|arrest)\w*/i.test(part)) return false;
  if (GAP_RE.test(part) || !ASSERTS_RE.test(part)) return false;
  // A date is a different fact. "date/time" counts as a time concern only when the narrative states the form's own
  // encounter date (so only the time can be in question); a part about the encounter date alone is never removed.
  const dateTime = /\bdate\s*(?:\/|and)\s*(?:time|hour)s?\b/i.test(part);
  return partWords(part.replace(/\bdates?\s*(?:\/|and)\s*(?:times?|hours?)\b/gi, dateAgrees ? "time" : "date")).every((w) => TIME_PART_WORDS.has(w)) && (!dateTime || dateAgrees);
}
/** Whether the narrative states the form's encounter date ("On March 12, 2024" for "03/12/2024 0910"). */
export function narrativeStatesFormDate(sentences: Sentence[], formValue: string | undefined): boolean {
  const d = formValue ? fullDates(formValue)[0] : undefined;
  return !!d && sentences.some((s) => fullDates(s.text).includes(d));
}
/** The parts of a routing reason, split as the model's reasons are elsewhere (";", ":" and sentence breaks). */
export const reasonParts = (r: string) => r.split(/\s*;\s*|:\s+|\.\s+(?=[A-Z])/).map((x) => x.trim().replace(/\.$/, "")).filter(Boolean);

const CONFLICT_WORDS_RE = /\b(?:conflict\w*|mismatch\w*|discrepan\w*|inconsisten\w*|differ\w*|contradict\w*|disagree\w*|while|whereas|but|versus|vs\.?)\b/i;
const HHMM_RE = /\b([01]\d|2[0-3])[0-5]\d\b(?!\/)/g;
const DATE_RE = /\b\d{1,2}\/\d{1,2}\/(?:19|20)\d\d\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:19|20)\d\d\b/g;
const isoOf = (d: string) => {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const n = new Date(d.replace(",", "")); return isNaN(+n) ? d : `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
const PHRASE: Record<TimeEvent, string> = {
  encounter: "the encounter", arrest: "the arrest", request: "the time of a call or request", arrival: "the time of an agent's or officer's arrival", processing: "the time of a later step (transport or processing)", unknown: "a time the narrative does not tie to any event",
};

/**
 * Why a model claim of a time conflict is not supported by the source (null when it is, or when it is not a time
 * conflict claim at all). Only conflict claims about clock times are judged; a date part, a missing-time observation or
 * another topic is left to the other checks.
 * - Against the form's encounter hour (`citesForm`): supported only when a cited sentence states the encounter or arrest
 *   time and it differs from the form's by the time rule's tolerance (30 minutes) or more. A call, request, arrival or
 *   processing time is a different event; a narrative that never states the encounter time leaves it unresolved.
 * - Between narrative times only: supported only when two cited times belong to the same event and differ by the
 *   tolerance or more ("the trooper's request at 0815 and the agent's arrival at 0900" are two events).
 */
export type TimeClaimCheck = { reason: string; /** false: unresolved rather than shown wrong (a differing time tied to no stated event) */ invalid: boolean; routeReason?: string };
export function unsupportedTimeClaim(claim: string, cited: Sentence[], citesForm: boolean, formValue: string | undefined): TimeClaimCheck | null {
  const r = timeClaimReason(claim, cited, citesForm, formValue);
  if (!r) return null;
  if (typeof r !== "string") return r;
  return { reason: r, invalid: true };
}
function timeClaimReason(claim: string, cited: Sentence[], citesForm: boolean, formValue: string | undefined): string | TimeClaimCheck | null {
  const text = to24h(claim);
  // An observation that the narrative does not state a time is not a conflict claim (kept as the model gave it).
  if (GAP_RE.test(text)) return null;
  if (!CONFLICT_WORDS_RE.test(text) || !/\b(?:times?|timing|hours?|hrs)\b|\b([01]\d|2[0-3])[0-5]\d\b(?!\/)/i.test(text)) return null;
  const times = statedTimes(cited);
  const ft = formTimeOf(formValue);
  // Years and dates are not clock times ("2017" in "4/12/2017").
  const claimed = [...new Set(text.replace(DATE_RE, " ").replace(/\b(?:in|of|since|year)\s+(?:19|20)\d\d\b/gi, " ").match(HHMM_RE) ?? [])].filter((t) => t !== ft);
  if (citesForm) {
    // A claim naming a date other than the form's is (also) a date claim: judged by the other checks, not here.
    const formDates = new Set((formValue?.match(DATE_RE) ?? []).map(isoOf));
    if ((claim.match(DATE_RE) ?? []).some((d) => !formDates.has(isoOf(d)))) return null;
    if (!ft) return "The form does not record an encounter hour, so there is no encounter time for the narrative to conflict with.";
    const enc = times.filter(isEncounterTime);
    if (enc.some((t) => Math.abs(toMinutes(t.hhmm) - toMinutes(ft)) >= TIME_TOLERANCE_MIN)) return null;
    const unresolved = times.filter((t) => t.event === "unknown" && Math.abs(toMinutes(t.hhmm) - toMinutes(ft)) >= TIME_TOLERANCE_MIN);
    if (unresolved.length) {
      const shown = unresolved.map((t) => `${t.hhmm} hours`).join(" and ");
      return { invalid: false, reason: `The narrative gives ${shown} without saying which event it is, so it does not establish a conflict with the form's encounter time (${ft} hours); whether it is the encounter time is unresolved.`,
        routeReason: `The narrative gives ${shown} without saying which event it is; the form records the encounter at ${ft} hours. A person should confirm the encounter time.` };
    }
    if (enc.length) return `The narrative's ${enc.map((t) => `${t.event} time (${t.hhmm} hours)`).join(" and ")} is within ${TIME_TOLERANCE_MIN} minutes of the form's encounter time (${ft} hours), the threshold the time rule uses, so it is not a conflict.`;
    const named = times.filter((t) => claimed.includes(t.hhmm));
    const shown = (named.length ? named : times).filter((t, i, all) => all.findIndex((x) => x.hhmm === t.hhmm) === i);
    if (!shown.length) return `The cited narrative text does not state the encounter time. A time the narrative does not give is unresolved, not a conflict with the form's encounter time (${ft} hours).`;
    return `The narrative gives ${shown.map((t) => `${t.hhmm} hours as ${PHRASE[t.event]}`).join(" and ")}, not the encounter, so it cannot conflict with the form's encounter time.${shown.some((t) => t.event !== "request") ? " The narrative does not state the encounter time itself." : ""}`;
  }
  const named = times.filter((t) => claimed.includes(t.hhmm));
  if (new Set(named.map((t) => t.hhmm)).size < 2) return null;
  const same = named.some((a) => named.some((b) => a !== b && a.event === b.event && a.event !== "unknown" && Math.abs(toMinutes(a.hhmm) - toMinutes(b.hhmm)) >= TIME_TOLERANCE_MIN));
  return same ? null : `The compared times belong to different events (${named.map(describeTime).join(", ")}), so they do not conflict.`;
}

/**
 * Routing reasons, minus the parts whose only concern is an encounter-time conflict the source does not support. A part
 * is removed only when it is about the encounter time alone (timeOnlyAssertion) and:
 * - it asserts a conflict, and the source has no encounter-time conflict (no stated encounter or arrest time, nor a
 *   time tied to no event, differing from the form's by the tolerance; no kept finding about the encounter time); or
 * - it asks to verify or confirm the time, and in addition this review withheld a model time claim (the request rests
 *   on that claim).
 * Parts about anything else (the encounter date included), mixed parts, and observations that the time is missing or
 * unstated are kept. A reason
 * whose remaining parts are only follow-ons ("Potential impact on the charge") goes with its removed part.
 */
export function timeRoutingReasons(reasons: string[], supported: boolean, withheld: boolean, dateAgrees = false): { reasons: string[]; removed: string[] } {
  if (supported) return { reasons, removed: [] };
  const conflictPart = (p: string) => /\b(?:conflict\w*|mismatch\w*|discrepan\w*|inconsisten\w*|differ\w*|contradict\w*|disagree\w*)\b/i.test(p);
  const removable = (p: string) => timeOnlyAssertion(p, dateAgrees) && (conflictPart(p) || withheld);
  const followOn = (p: string) => !conflictPart(p) && partWords(p).every((w) => TIME_PART_WORDS.has(w) || /^(?:charge|charging|facts?|decision|officer|human|person|should|must)$/.test(w)) && !/\b(?:times?|timing|hours?)\b/i.test(p);
  const kept: string[] = [], removed: string[] = [];
  for (const r of reasons) {
    const parts = reasonParts(r);
    const dep = parts.filter(removable);
    if (!dep.length) { kept.push(r); continue; }
    const rest = parts.filter((p) => !dep.includes(p));
    if (rest.every(followOn)) { removed.push(r); continue; }
    removed.push(...dep);
    kept.push(rest.join("; "));
  }
  return { reasons: kept, removed };
}
