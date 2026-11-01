/**
 * Person–event analysis (round 6 prototype, offline). For each sentence: who is mentioned, which immigration events are
 * described, who experiences each event and who reports it, the event's polarity, scope and dates, and the explicit
 * links that carry a person reference across sentences. Every link and every identity cites the exact text it rests on.
 *
 * Identity is never inferred from matching values: identical redaction markers, a shared date, citizenship, place or
 * route do not make two mentions one person, and form values are not used at all (they may be wrong). A mention is
 * this record's subject only when the text designates it ("Subject …", "the subject, [REDACTED]") or a pronoun chain
 * leads to such a designation. Everything else stays unresolved, or is classified as an officer, a companion or third
 * party, an unidentified member of a group, or a group.
 */
import type { Sentence } from "../types";
import { fullDates } from "./facts";

export type Identity = "subject" | "officer" | "other" | "member" | "group" | "unresolved";
export type MentionKind = "designation" | "named" | "pronoun" | "officer" | "group" | "member" | "other";
export type Mention = { sentenceId: string; text: string; at: number; kind: MentionKind; gender?: "m" | "f" };
export type EventType = "entry" | "departure" | "arrest" | "removal_processing" | "completed_removal" | "removal_order";
export type PersonEvent = {
  sentenceId: string; type: EventType; trigger: string; at: number; span: string;
  polarity: "affirmed" | "negated" | "not_happened";
  /** Entries only: a first, last or previous entry as the text states it. */
  scope?: "first" | "last" | "previous" | "unspecified";
  dates: string[]; years: number[];
  /** Who reports the event ("[REDACTED] stated that …"), when someone does. */
  speaker?: Mention;
  experiencer?: Mention;
  /** The speaker reports their own event ("claims to have crossed", "stated that he crossed"). */
  selfReport: boolean;
  /** A reinstatement presupposes an earlier removal order. */
  presupposesPriorOrder?: boolean;
};
export type Link = { from: string; to: string; kind: "pronoun"; support: { sentenceId: string; text: string }[]; rationale: string };
export type Resolved = { identity: Identity; chain: Link[]; support: { sentenceId: string; text: string }[]; rationale: string };

// ---- Mentions ----
const MARK = /\[REDACTED \(b\)\(6\)[^\]]*\](?:\s*\[REDACTED \(b\)\(6\)[^\]]*\])*/g;
const OFFICIAL = /\b(?:Agents?|BPA|SBPA|LBPA|BPAs|Officers?|Troopers?|Deputy|Detective|Sergeant|Sgt\.?|Supervisory Border Patrol Agent|Special Agent|Investigator)\s*$/i;
// Kinds are matched in this order on the text with earlier matches blanked out, so a phrase is classified once.
const PATTERNS: [MentionKind, RegExp][] = [
  ["officer", /\b(?:the\s+)?(?:agents?|BPAs?|troopers?|officers?|deputy|dispatch)\b/gi],
  // A quantified or ordinal member of a group, not identified in the clause.
  ["member", /\b(?:one of (?:the|them|these|those)(?:\s+[\w-]+){0,2}?|another|the (?:first|second|third|fourth|fifth|last|remaining) (?:subject|individual|person|man|woman|occupant|passenger|one)|(?:a|one) (?:subject|individual|person|man|woman|occupant|passenger)|(?<=(?:^|[:;,]\s*|\bthat\s+))one)(?=\s+(?:had|has|was|were|is|of|subject|individual|person|man|woman|occupant|passenger|\w+ed)\b)/gi],
  ["other", /\b(?:the other subject|an? unknown (?:subject|individual|person|man|smuggler|driver)|(?:his|her|their|my)\s+(?:[\w-]+\s+){0,2}?(?:wife|husband|spouse|partner|sons?|daughters?|child|children|brothers?|sisters?|mother|father|parents?|cousins?|uncle|aunt|friends?|girlfriend|boyfriend|companions?|relatives?|family)|(?:\w+\s+)?other (?:individuals|subjects|people|persons|men|aliens)|a smuggler|the smuggler|a (?:female|male)(?=,? later identified))\b/gi],
  ["group", /\b(?:they|them|both(?: subjects)?|all(?: \w+)? subjects|the subjects|these subjects|the group|(?:two|three|four|five|six|seven|eight|nine|ten) (?:subjects|individuals|people|occupants|men))\b/gi],
  ["designation", /(?<!\b(?:a|an|one|each|every|another|other|first|second|third|fourth|fifth|last|remaining|any|either|neither|this|that)\s+)\b(?:[Tt]he\s+)?[Ss]ubject(?![s'’\w])/g],
  ["pronoun", /\b(?:he|she)\b/gi],
];
export function mentions(s: Sentence): Mention[] {
  const out: Mention[] = [];
  // Redacted names: an official's name when a title precedes it, otherwise a named person of interest.
  for (const m of s.text.matchAll(MARK)) {
    const before = s.text.slice(Math.max(0, m.index! - 40), m.index!);
    const joinedToOfficial = /\b(?:Agents?|BPAs?|Troopers?|Officers?)\s+\[REDACTED[^\]]*\]\s*(?:,|and|&)\s*$/i.test(before);
    out.push({ sentenceId: s.id, text: m[0], at: m.index!, kind: OFFICIAL.test(before) || joinedToOfficial ? "officer" : "named" });
  }
  let t = s.text.replace(MARK, (x) => " ".repeat(x.length));
  for (const [kind, re] of PATTERNS) {
    for (const m of t.matchAll(re)) out.push({ sentenceId: s.id, text: m[0], at: m.index!, kind, gender: kind === "pronoun" ? (/^he$/i.test(m[0]) ? "m" : "f") : undefined });
    t = t.replace(re, (x) => " ".repeat(x.length));
  }
  // Gender of a named mention, when its own clause says "his" or "her" right after it.
  for (const m of out) if (m.kind === "named" || m.kind === "designation") {
    const after = s.text.slice(m.at + m.text.length, m.at + m.text.length + 80).split(/[;.]/)[0];
    if (/\b(his|him|he)\b/i.test(after) && !/\b(her|she)\b/i.test(after)) m.gender = "m";
    else if (/\b(her|she)\b/i.test(after) && !/\b(his|him|he)\b/i.test(after)) m.gender = "f";
  }
  return out.sort((a, b) => a.at - b.at);
}
const PERSON_KINDS: MentionKind[] = ["designation", "named", "pronoun"];
/** "the subject, [REDACTED]": an appositive that designates the redacted person as the subject. */
const appositiveSubject = (s: Sentence, m: Mention) => m.kind === "named" && /\bthe subject,?\s*$/i.test(s.text.slice(Math.max(0, m.at - 20), m.at));

// ---- Events ----
const EVENT_PATTERNS: [EventType, RegExp][] = [
  ["removal_processing", /\b(?:(?:reviewed|approved|authori[sz]ed)(?: and (?:reviewed|approved|authori[sz]ed))? (?:the |this |his |her )?(?:expedited )?removal|processed (?:as|for) (?:an? )?(?:WA\/NTA|NTA|VR|Reinstate\w*|expedited removal|removal|stipulated removal)|served (?:with )?(?:an? |the )?(?:Reinstatement|Notice to Appear|Warrant of Arrest|Form I-\d+|I-\d+)|(?:Warrant of Arrest\/)?Notice to Appear|removal proceedings|pending (?:his |her )?removal|Stipulated (?:Order of )?Removal|reinstate(?:ment)? case|Reinstatement of (?:his|her|a|the) (?:original )?prior order)\b/gi],
  ["removal_order", /\bordered removed\b|\b(?:removal|deportation|exclusion) order\b|\border of (?:removal|deportation|exclusion)\b/gi],
  ["completed_removal", /\b(?:deported|removed|received an? Expedited Removal|expedited removal)\b/gi],
  ["entry", /\b(?:re-?entered|entered|enter|entering|crossed|crossing|came (?:in)?to|arrived (?:in|at|into)|swam|waded|walked across)\b/gi],
  ["departure", /\b(?:voluntar(?:y|ily) (?:return(?:ed)?|depart(?:ure|ed))|processed as an? VR|left (?:the United States|his home|her home)|departed|returned to (?:Mexico|Guatemala|Honduras|El Salvador|Nicaragua|his|her))\b/gi],
  ["arrest", /\b(?:arrested|apprehended|taken into custody|placed (?:him |her )?under arrest)\b/gi],
];
const CLAUSE_BOUNDARY = /;|\bbut\b|,\s+(?=one\b|another\b)|,?\s+and\s+(?=(?:he|she|they|one|another|three|two|the last)\b)/gi;
const clauseOf = (text: string, at: number) => {
  let start = 0, end = text.length;
  for (const m of text.matchAll(CLAUSE_BOUNDARY)) { const a = m.index!, b = a + m[0].length; if (b <= at) start = Math.max(start, b); else if (a > at) end = Math.min(end, a); }
  return { start, text: text.slice(start, end) };
};
const OTHER_COUNTRY = /\b(?:into|to|in)\s+(?:both\s+)?(?:Mexico|Guatemala|Honduras|El Salvador|Nicaragua|Belize|Canada)\b/i;
const NOT_HAPPENED = /\b(?:offered|declined|refused|requested|will be|would be|may be|could be)\b/i;
const NEGATION = (trigger: string) => new RegExp(`\\b(?:never|not|no|none|without|nor)\\s+(?:(?:been|be|being|was|were|had|has|have|ever|previously|any|prior|record of|history of)\\s+){0,3}${trigger.split(/\s+/)[0]}`, "i");
const REPORT = /\b(?:stated|states|said|says|claimed|claims|told|admitted|explained|reported)\b(?:\s+(?:that|to have))?|:\s*/gi;

export function events(s: Sentence): PersonEvent[] {
  const ms = mentions(s);
  const taken: [number, number][] = [];
  const out: PersonEvent[] = [];
  for (const [type, re] of EVENT_PATTERNS) for (const m of s.text.matchAll(re)) {
    const at = m.index!, end = at + m[0].length;
    if (taken.some(([a, b]) => at < b && end > a)) continue; // a phrase is classified once (processing before removal)
    // One event worded twice in a clause ("returned to Mexico as a Voluntary Return") is one event.
    if (out.some((e) => e.type === type && Math.abs(e.at - at) < 40)) continue;
    taken.push([at, end]);
    const cl = clauseOf(s.text, at);
    if (type === "entry" && OTHER_COUNTRY.test(cl.text) && !/United States|U\.S\./.test(cl.text)) continue;
    if (type === "entry" && /\b(?:the vehicles?|the van|bathroom|the house|a house|the station|the room|systems?|databases?)\b/i.test(s.text.slice(at, at + 40))) continue;
    const local = cl.text.slice(0, at - cl.start);
    const polarity = NEGATION(m[0]).test(cl.text) ? "negated" : NOT_HAPPENED.test(local) || (type === "removal_processing" && NOT_HAPPENED.test(cl.text)) ? "not_happened" : "affirmed";
    // Speaker: the person before the last reporting verb in the sentence before the event. Experiencer: the nearest
    // person mention after that verb and before the event; with none, a self-report by the speaker ("claims to have …").
    const reports = [...s.text.slice(0, at).matchAll(REPORT)];
    const cut = reports.length ? reports.at(-1)!.index! : -1;
    const persons = ms.filter((x) => x.at < at);
    const speaker = cut >= 0 ? persons.filter((x) => x.at < cut).at(-1) : undefined;
    const afterCut = persons.filter((x) => x.at > Math.max(cut, cl.start - 1));
    const inClause = afterCut.at(-1);
    // Any single person can report their own event ("The other subject stated that he entered …" is the other subject's).
    const selfReport = !!speaker && speaker.kind !== "group" && (!inClause || (inClause.kind === "pronoun" && (!speaker.gender || speaker.gender === inClause.gender)));
    // Active voice ("Agent [REDACTED] arrested [REDACTED]"): the person after the verb is the one arrested or removed.
    const active = (type === "arrest" || type === "completed_removal") && !/\b(?:was|were|been|being|is|are|be|had|has|have|got)\s+(?:\w+\s+)?$/i.test(s.text.slice(Math.max(cl.start, at - 30), at)) && /\b(?:arrested|apprehended|deported|removed)$/i.test(m[0]);
    const object = active ? ms.find((x) => x.at > end && x.at < cl.start + cl.text.length) : undefined;
    const experiencer = object ?? (inClause && !(selfReport && inClause.kind === "pronoun") ? inClause : selfReport ? speaker : persons.filter((x) => x.at >= cl.start).at(-1) ?? persons.at(-1));
    const scopeText = cl.text.slice(Math.max(0, at - cl.start - 40), at - cl.start + m[0].length + 5);
    out.push({
      sentenceId: s.id, type, trigger: m[0], at, span: cl.text.trim(), polarity,
      scope: type === "entry" ? (/\b(?:first|initially|originally)\b/i.test(scopeText) ? "first" : /\b(?:last|most recent(?:ly)?)\b/i.test(scopeText) ? "last" : /\b(?:previous(?:ly)?|prior|earlier)\b/i.test(scopeText) ? "previous" : "unspecified") : undefined,
      dates: fullDates(cl.text), years: [...new Set((cl.text.match(/\b(?:19|20)\d\d\b/g) ?? []).map(Number))],
      speaker, experiencer, selfReport,
      presupposesPriorOrder: type === "removal_processing" && /reinstat/i.test(m[0]) ? true : undefined,
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

// ---- Links and identity ----
const HEADING_ONLY = /^\s*[A-Z][A-Z /&-]{2,}:\s*$/;
/**
 * A pronoun's antecedent: the nearest earlier sentence (within its section, at most four back) whose singular person
 * mentions agree in gender. A sentence with two or more such candidates, or an unidentified third party of unknown
 * gender, makes the reference ambiguous: no link.
 */
export function pronounLink(sentences: Sentence[], idx: number, p: Mention): Link | null {
  for (let j = idx - 1; j >= Math.max(0, idx - 4); j--) {
    const s = sentences[j];
    if (HEADING_ONLY.test(s.text)) return null;
    const ms = mentions(s);
    const singular = ms.filter((m) => PERSON_KINDS.includes(m.kind) || m.kind === "member" || (m.kind === "other" && !/other (?:individuals|subjects|people|persons|men|aliens)|companions|children|parents|family/i.test(m.text)));
    const compatible = singular.filter((m) => !m.gender || m.gender === p.gender);
    // People of the other gender only: the pronoun cannot refer to them; keep looking.
    if (!compatible.length) continue;
    const anchors = compatible.filter((m) => m.kind !== "pronoun");
    const distinct = anchors.length ? anchors : compatible;
    if (distinct.filter((m) => m.kind !== "pronoun").length > 1 || distinct.some((m) => m.kind === "other" || m.kind === "member")) return null;
    const to = distinct[0];
    return { from: sentences[idx].id, to: s.id, kind: "pronoun", rationale: `"${p.text}" in ${sentences[idx].id} has one compatible antecedent, "${to.text.replace(/\[REDACTED[^\]]*\]/g, "[REDACTED]")}" in ${s.id}${j < idx - 1 ? " (the sentences between mention no compatible person)" : ""}`,
      support: [{ sentenceId: sentences[idx].id, text: p.text }, { sentenceId: s.id, text: to.text }] };
  }
  return null;
}
/** The identity of a mention, following pronoun links back to a designation, a named person or nothing. */
export function resolve(sentences: Sentence[], m: Mention | undefined, depth = 0): Resolved {
  if (!m) return { identity: "unresolved", chain: [], support: [], rationale: "no person is mentioned for this event" };
  const idx = sentences.findIndex((x) => x.id === m.sentenceId);
  const own = { sentenceId: m.sentenceId, text: m.text };
  switch (m.kind) {
    case "designation": return { identity: "subject", chain: [], support: [own], rationale: `${m.sentenceId} designates the subject ("${m.text}")` };
    case "officer": return { identity: "officer", chain: [], support: [own], rationale: `${m.sentenceId}: an official` };
    case "other": return { identity: "other", chain: [], support: [own], rationale: `${m.sentenceId}: a companion or third party ("${m.text}")` };
    case "member": return { identity: "member", chain: [], support: [own], rationale: `${m.sentenceId}: an unidentified member of a group ("${m.text}")` };
    case "group": return { identity: "group", chain: [], support: [own], rationale: `${m.sentenceId}: a group ("${m.text}")` };
    case "named":
      if (appositiveSubject(sentences[idx], m)) return { identity: "subject", chain: [], support: [{ sentenceId: m.sentenceId, text: "the subject, " }, own], rationale: `${m.sentenceId} names this person "the subject"` };
      return { identity: "unresolved", chain: [], support: [own], rationale: `${m.sentenceId}: a redacted name; nothing in the text says whose` };
    case "pronoun": {
      // A pronoun with a person earlier in its own sentence refers to that person.
      const inSentence = mentions(sentences[idx]).filter((x) => x.at < m.at && x.kind !== "pronoun" && x.kind !== "group" && x.kind !== "officer" && !/other (?:individuals|subjects|people|persons|men|aliens)/i.test(x.text) && (!x.gender || x.gender === m.gender));
      if (inSentence.length === 1) return resolve(sentences, inSentence[0], depth + 1);
      if (inSentence.length > 1) return { identity: "unresolved", chain: [], support: [own], rationale: `${m.sentenceId}: "${m.text}" has more than one possible antecedent in its sentence` };
      const link = depth < 8 ? pronounLink(sentences, idx, m) : null;
      if (!link) return { identity: "unresolved", chain: [], support: [own], rationale: `${m.sentenceId}: "${m.text}" has no single compatible antecedent` };
      const target = mentions(sentences.find((x) => x.id === link.to)!).find((x) => x.text === link.support[1].text)!;
      const r = resolve(sentences, target, depth + 1);
      return { ...r, chain: [link, ...r.chain], support: [own, ...r.support] };
    }
  }
}

/** Every event in the narrative with the resolved identity of its experiencer. */
export function analyze(sentences: Sentence[]): (PersonEvent & { who: Resolved })[] {
  return sentences.flatMap((s) => events(s).map((e) => ({ ...e, who: resolve(sentences, e.experiencer) })));
}

