/**
 * Writes the generalization set gen-v1 (12 team-authored synthetic cases) and its labels, then a lock file with the
 * SHA-256 of every label. Written and locked BEFORE the frozen round-2 build is run on it. Prepared by the same team
 * (Claude Code for Harshal Yeole) that tuned the system, so it is NOT independently held out.
 * Usage: npx tsx scripts/build-gen-v1.ts
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

type Plant = Record<string, unknown>;
type Spec = { id: string; title: string; narrative: string; form: Record<string, string>; charges?: string[]; plants: Plant[]; shouldNotFlag?: string[]; note: string };
const R = "[REDACTED (b)(6), (b)(7)(C)]";
const ENC = (place: string, time: string, extra = "") =>
  `ENCOUNTER:\nOn March 12, 2024, at approximately ${time} hours, Border Patrol Agent ${R} encountered ${extra}near ${place} during roving patrol duties. Agent ${R} identified himself as a Border Patrol Agent and questioned the subject as to his citizenship. The subject stated that he is a citizen and national of Mexico and that he does not possess any immigration documents allowing him to be in or remain in the United States legally. The subject presented a Mexican consular identification card. Agent ${R} placed the subject under arrest at approximately ${time} hours.\n`;
const DISP = "\nREMOVABILITY:\nThe subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act, in that he is an alien present in the United States without being admitted or paroled.\nDISPOSITION:\nThe subject was processed for a Notice to Appear and was served with a Warrant of Arrest.\n";
const FIELDS: [string, string][] = [["subject.citizenship", "Country of citizenship"], ["entry.date", "Date and time of last entry"], ["entry.place", "Place of last entry"], ["entry.manner", "Manner of last entry"], ["encounter.date_time", "Encounter date and hour"], ["encounter.location", "Encounter location (at/near)"], ["encounter.method", "Method of location/apprehension"], ["history.immigration_record", "Immigration record"], ["history.criminal_record", "Criminal record"], ["form.disposition", "Disposition"]];
const form = (o: Record<string, string>) => ({ "subject.citizenship": "MEXICO", "entry.date": "08/14/2016", "entry.place": "near El Paso, TX", "entry.manner": "EWI AFOOT", "encounter.date_time": "03/12/2024 0910", "encounter.location": "MONROE, MI", "encounter.method": "OA", "history.immigration_record": "NEGATIVE", "history.criminal_record": "None Known", "form.disposition": "NTA/WA", ...o });

const specs: Spec[] = [
  { id: "G01", title: "Clean one-person record", form: form({}), plants: [], note: "Clean: every element stated and consistent with the form.",
    narrative: ENC("Monroe, Michigan", "0910") + "ENTRY:\nThe subject stated that he entered the United States on August 14, 2016, by walking across the border near El Paso, Texas, and that he was not inspected or admitted by an immigration officer." + DISP },
  { id: "G02", title: "Two subjects; the other subject's different year", form: form({ "entry.date": "03/14/2019", "entry.place": "near Laredo, TX" }), plants: [], shouldNotFlag: ["entered in 2015"],
    note: "Person control: the other subject's year is someone else's; the subject's own statement agrees with the form.",
    narrative: ENC("Monroe, Michigan", "0910", "two men ") + "ENTRY:\nThe subject stated that he entered the United States on March 14, 2019, by wading across the Rio Grande near Laredo, Texas, without inspection. The other subject stated that he entered in 2015 near Del Rio, Texas." + DISP },
  { id: "G03", title: "Subject's entry year conflicts with the form", form: form({ "entry.date": "06/20/2017", "entry.place": "near Nogales, AZ" }), plants: [{ type: "inconsistency", anchors: ["June 2012"], fieldPaths: ["entry.date"] }],
    note: "Resolvable: an explicit subject statement gives 2012; the form records 2017.",
    narrative: ENC("Monroe, Michigan", "0910") + "ENTRY:\nThe subject stated that he entered the United States in June 2012 by walking through the desert near Nogales, Arizona, without being inspected." + DISP },
  { id: "G04", title: "Subject says visa admission; form says EWI", form: form({ "entry.manner": "EWI AFOOT", "entry.place": "CHICAGO, IL", "entry.date": "05/02/2018" }), charges: ["INA 237(a)(1)(B)"],
    plants: [{ type: "inconsistency", anchors: ["B2 visitor visa"], fieldPaths: ["entry.manner"] }],
    note: "Resolvable: the subject flew in on a B2 visa (admitted) while the form codes EWI. A citation flag against the form's EWI code would be a valid consequence.",
    narrative: ENC("Monroe, Michigan", "0910").replace("does not possess any immigration documents allowing him to be in or remain in the United States legally", "remained after his authorized stay expired") + "ENTRY:\nThe subject stated that he flew into Chicago O'Hare International Airport on May 2, 2018, and was admitted on a B2 visitor visa valid for six months. He stated that he did not depart when his authorized stay ended.\nREMOVABILITY:\nThe subject is removable under Section 237(a)(1)(B) of the Immigration and Nationality Act, in that he remained in the United States longer than permitted.\nDISPOSITION:\nThe subject was processed for a Notice to Appear.\n" },
  { id: "G05", title: "Subject's prior removal vs NEGATIVE record", form: form({}), plants: [{ type: "inconsistency", anchors: ["previously removed"], fieldPaths: ["history.immigration_record"] }],
    note: "Resolvable: an explicit subject statement of a prior removal; the form's record is NEGATIVE.",
    narrative: ENC("Monroe, Michigan", "0910") + "ENTRY:\nThe subject stated that he entered the United States on August 14, 2016, by walking across the border near El Paso, Texas, without inspection.\nIMMIGRATION HISTORY:\nThe subject stated that he was previously removed from the United States to Mexico in 2014." + DISP },
  { id: "G06", title: "Unattributable conflicting account among three people", form: form({ "entry.date": "04/02/2019", "entry.place": "near Hidalgo, TX" }),
    plants: [{ type: "human_review", reason: "ambiguity", anchors: ["in 2011 by crossing"] }],
    note: "Ambiguous: three people, names redacted; one redacted person's 2011 entry conflicts with the form but nothing ties it to this subject. Expected: routed to a person with the statement named; no contradiction asserted.",
    narrative: ENC("Monroe, Michigan", "0910", "three men ").replace("questioned the subject", "questioned all three men") + `ENTRY:\n${R} stated that he entered the United States in 2011 by crossing the river near Hidalgo, Texas. ${R} stated that he entered in 2020 near Eagle Pass, Texas. ${R} stated that he did not remember when he entered.` + DISP },
  { id: "G07", title: "Companion's removal in a group", form: form({}), plants: [], shouldNotFlag: ["deported to Honduras"],
    note: "Person control: a group member's deportation, not attributable to this subject; at most routed, never a contradiction.",
    narrative: ENC("Monroe, Michigan", "0910", "four men ") + `ENTRY:\nThe subject stated that he entered the United States on August 14, 2016, by walking across the border near El Paso, Texas, without inspection.\nIMMIGRATION HISTORY:\nRecords checks showed that one of the four men had been deported to Honduras in 2015.` + DISP },
  { id: "G08", title: "Request time and arrest location are not encounter time or entry place", form: form({ "encounter.date_time": "03/12/2024 0900", "entry.place": "near Brownsville, TX", "entry.date": "07/01/2017" }), plants: [], shouldNotFlag: ["0815 hours", "arrested in Detroit"],
    note: "Event controls: the Trooper's request time is not the encounter time; the arrest city is not the entry place.",
    narrative: `ENCOUNTER:\nOn March 12, 2024, at approximately 0815 hours, a Michigan State Police Trooper requested Border Patrol assistance with a traffic stop. Agent ${R} arrived and encountered the subject at approximately 0900 hours near Detroit, Michigan. The subject stated that he is a citizen and national of Mexico and that he does not possess any immigration documents allowing him to be in or remain in the United States legally. The subject presented a Mexican passport.\nENTRY:\nThe subject stated that he crossed the Rio Grande near Brownsville, Texas, on July 1, 2017, without inspection, and was arrested in Detroit in 2024.` + DISP },
  { id: "G09", title: "Manner of entry missing", form: form({ "entry.manner": "UNK", "entry.place": "UNK", "entry.date": "Unknown" }), plants: [{ type: "missing_element", elementId: "E3" }],
    note: "Missing element: neither the narrative nor the form states how the subject entered.",
    narrative: ENC("Monroe, Michigan", "0910") + "ENTRY:\nThe subject stated that he came to the United States several years ago and has lived in Toledo, Ohio, since then." + DISP },
  { id: "G10", title: "Voluntary return is not a removal", form: form({}), plants: [], note: "Event control: a prior voluntary return with a NEGATIVE record may be noted for clarity but is not a removal conflict.",
    narrative: ENC("Monroe, Michigan", "0910") + "ENTRY:\nThe subject stated that he entered the United States on August 14, 2016, by walking across the border near El Paso, Texas, without inspection.\nIMMIGRATION HISTORY:\nThe subject stated that in 2013 he was granted a voluntary return to Mexico by the Border Patrol." + DISP },
  { id: "G11", title: "Reentry charge with no prior removal", form: form({}), charges: ["8 U.S.C. 1326"], plants: [{ type: "citation" }],
    note: "Citation mismatch: 8 U.S.C. 1326 depends on a prior removal; the record is NEGATIVE and the narrative describes none.",
    narrative: ENC("Monroe, Michigan", "0910") + "ENTRY:\nThe subject stated that he entered the United States on August 14, 2016, by walking across the border near El Paso, Texas, without inspection. The subject stated that he has never been removed or deported." + DISP },
  { id: "G12", title: "Two charges selected", form: form({}), charges: ["INA 212(a)(6)(A)(i)", "8 U.S.C. 1325(a)"], plants: [{ type: "human_review", reason: "multi_charge" }],
    note: "Multi-charge: must go to a person; the tool must not choose.",
    narrative: ENC("Monroe, Michigan", "0910") + "ENTRY:\nThe subject stated that he entered the United States on August 14, 2016, by walking across the border near El Paso, Texas, without inspection." + DISP },
];

mkdirSync("eval/gen-v1/cases", { recursive: true }); mkdirSync("eval/gen-v1/expected", { recursive: true });
const lock: Record<string, string> = {};
for (const s of specs) {
  const facts = [{ path: "subject.name", label: "Subject name", value: "", status: "redacted" }, ...FIELDS.map(([path, label]) => ({ path, label, value: s.form[path], status: "present" }))];
  const c = { id: s.id, title: s.title, kind: "synthetic", split: "gen-v1", context: ["interior"],
    provenance: { source: "Team-authored synthetic generalization case (gen-v1), 2026-10-30. Not independently held out.", extraction: "Written directly as text.", verification: "Synthetic.", replacements: [], textOrigin: "synthetic-test", modifications: [] },
    narrative: { text: s.narrative }, facts, selectedCharges: (s.charges ?? ["INA 212(a)(6)(A)(i)"]).map((citation) => ({ citation, source: "team-assigned-for-testing", note: "Synthetic case." })) };
  const e = { id: s.id, base: s.id, split: "gen-v1", datasetVersion: "gen-v1", description: s.title, plants: s.plants, shouldNotFlag: s.shouldNotFlag ?? [], labelNotes: s.note };
  writeFileSync(`eval/gen-v1/cases/${s.id}.json`, JSON.stringify(c, null, 2) + "\n");
  const ej = JSON.stringify(e, null, 2) + "\n";
  writeFileSync(`eval/gen-v1/expected/${s.id}.json`, ej);
  lock[s.id] = createHash("sha256").update(ej).digest("hex");
}
writeFileSync("eval/gen-v1/LOCK.json", JSON.stringify({ lockedAt: new Date().toISOString(), note: "SHA-256 of each label file, written before the frozen build is run on gen-v1. Prepared by the tuning team: not independently held out.", labels: lock }, null, 2) + "\n");
console.log(`wrote ${specs.length} cases and labels; plants ${specs.reduce((n, s) => n + s.plants.length, 0)}`);
