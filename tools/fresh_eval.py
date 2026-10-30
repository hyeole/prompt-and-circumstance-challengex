"""
Fresh independent evaluation set (dataset fresh-v1), prepared 2026-10-30 BEFORE any app run on these cases.

Part A: six previously unused source incidents (eval/fresh/base/*.json, built from eval/fresh/manifests/) plus two
        documented single-change variants each. Variants of one incident stay together.
Part B: ten independently authored synthetic scenarios (interior, port of entry, expedited removal). They are not
        rewrites of the dev-synthetic cases (different people, places, documents, charges and facts).
Expected answers are written here and saved to eval/fresh/expected/; runtime inputs go to eval/fresh/cases/.
Doubtful labels are recorded in eval/fresh/LABELS.md before the run and must not be changed afterwards.

Usage: python3 tools/fresh_eval.py
"""
import json, os, re, copy

R = "[REDACTED (b)(6), (b)(7)(C)]"
E = "[REDACTED (b)(7)(E)]"
OUT = "eval/fresh"
CASES, LABELS = [], []

def emit(case, plants=(), elements=None, should_not=(), note=""):
    exp = {"id": case["id"], "base": case.get("baseCaseId", case["id"]), "split": "fresh", "datasetVersion": "fresh-v1",
           "description": (case["provenance"].get("modifications") or ["Unmodified"])[0], "plants": list(plants),
           "elementExpectations": elements or {}, "shouldNotFlag": list(should_not), "labelNotes": note}
    CASES.append((case, exp))
    if note: LABELS.append((case["id"], note))

def load(i): return json.load(open(f"{OUT}/base/{i}.json"))

def variant(base_id, suffix, description, ops):
    c = copy.deepcopy(load(base_id))
    t = c["narrative"]["text"]
    for op in ops:
        kind = op[0]
        if kind == "replace":
            assert t.count(op[1]) == 1, (base_id, suffix, op[1], t.count(op[1]))
            t = t.replace(op[1], op[2])
        elif kind == "fact":
            f = next(x for x in c["facts"] if x["path"] == op[1]); f["value"] = op[2]; f["status"] = "present" if op[2] else "absent"
        elif kind == "charges":
            c["selectedCharges"] = [{"citation": x, "source": "team-assigned-for-testing", "note": "Charge set by the team for this test variant."} for x in op[1]]
        elif kind == "add_charge":
            c["selectedCharges"].append({"citation": op[1], "source": "team-assigned-for-testing", "note": "Second charge added by the team for this test variant."})
    c["narrative"] = {"text": t}  # page spans dropped for edited variants (offsets would shift)
    c["id"] = f"{base_id}-{suffix}"; c["kind"] = "synthetic-variant"; c["baseCaseId"] = base_id
    c["title"] = f"{c['title']} [test variant {suffix}]"
    c["provenance"] = {**c["provenance"], "modifications": [description]}
    return c

# ------------------------------------------------------------------ Part A: unused source incidents
for b in ["F010", "F036", "F039", "F051", "F055", "F075"]:
    c = load(b)
    notes = {
        "F036": "Unmodified record. The form records the entry date as unknown while the narrative states 10/15/2012: a real documentation gap; any flag about it is adjudicated as a valid observation.",
        "F039": "Unmodified record. The form's immigration record is NEGATIVE while the narrative lists earlier apprehensions processed as voluntary returns; any flag about it is adjudicated on its merits.",
        "F051": "Unmodified record with several people; statements about prior removals concern other subjects.",
    }
    emit(c, note=notes.get(b, ""))

emit(variant("F010", "X", "Narrative crossing date changed to May 5, 2014; the form records 05/05/2011.",
             [("replace", "on or about May 5, 2011", "on or about May 5, 2014")]),
     plants=[{"type": "inconsistency", "anchors": ["May 5, 2014"], "fieldPaths": ["entry.date"]}])
emit(variant("F010", "D", "Disposition removed: the DISPOSITION section (warrant of arrest/notice to appear and jail hold) is deleted.",
             [("replace", "DISPOSITION:\n\n", ""), ("replace", " was issued a Warrant of Arrest/Notice to Appear. ", " "),
              ("replace", " will be held at the " + E + " County Jail pending his hearing before an immigration judge.", "")]),
     plants=[{"type": "missing_element", "elementId": "N7"}],
     note="F010-D: the PROPERTY section still says property will accompany him on his transfer to a county jail. We label the disposition as missing because the action taken and its documenting form are no longer stated; a reader could argue the transfer implies detention.")
emit(variant("F036", "C", "Selected charge replaced with overstay after admission (INA 237(a)(1)(B)); the record documents entry without inspection.",
             [("charges", ["INA 237(a)(1)(B)"])]), plants=[{"type": "citation"}])
emit(variant("F036", "M", "Second charge added (multi-charge case).", [("add_charge", "8 U.S.C. 1325(a)")]),
     plants=[{"type": "human_review", "reason": "multi_charge"}])
emit(variant("F039", "X", "Form date of last entry changed to 02/15/2009; the narrative says February of 2004.",
             [("fact", "entry.date", "02/15/2009, Unknown Time")]),
     plants=[{"type": "inconsistency", "anchors": ["February of 2004"], "fieldPaths": ["entry.date"]}])
emit(variant("F039", "G", "Stated ground removed: the sentence citing section 212(a)(6)(A)(i) and explaining it is deleted.",
             [("replace", re.search(r"\[REDACTED \(b\)\(6\), \(b\)\(7\)\(C\)\] is inadmissible under section 212\(a\)\(6\)\(A\)\(i\) of the INA[^.]*\.\s*", load("F039")["narrative"]["text"]).group(0), "")]),
     plants=[{"type": "missing_element", "elementId": "N5"}])
emit(variant("F051", "C", "Selected charge replaced with reentry after removal (8 U.S.C. 1326); this subject's immigration record is NEGATIVE.",
             [("charges", ["8 U.S.C. 1326"])]),
     plants=[{"type": "citation"}],
     note="F051-C: the narrative says one of the group 'had been ordered removed' without saying who. A careful reviewer could route this to a person instead of calling it a mismatch. Under scoring policy v2.2 only a verified mismatch counts as detected; 'needs human review' will be reported as routed-only.")
emit(variant("F051", "E", "Manner of entry removed: form field blanked; 'illegally' and the swimming sentence removed.",
             [("fact", "entry.manner", ""), ("replace", "claims to have illegally entered the United States in Laredo around 2015.", "claims to have entered the United States in Laredo around 2015."),
              ("replace", "He claims to have swam the river to cross the border. ", "")]),
     plants=[{"type": "missing_element", "elementId": "E3"}],
     note="F051-E: the legal ground still says 'present in the United States without being admitted or paroled'. We label the manner of entry missing because no factual account of how he crossed remains; the legal conclusion alone is not a factual statement.")
emit(variant("F055", "A", "Added a conflicting statement that he entered through the Hidalgo port of entry with a border crossing card.",
             [("replace", "in July of 2014.", "in July of 2014. During a later interview, he stated that he entered the United States through the Hidalgo port of entry with a border crossing card.")]),
     plants=[{"type": "human_review", "reason": "ambiguity", "anchors": ["border crossing card"]},
             {"type": "inconsistency", "anchors": ["border crossing card"], "fieldPaths": ["entry.manner"]}])
emit(variant("F055", "H", "Form immigration record changed from NEGATIVE to 'POSITIVE - prior removal 2012' with no removal in the narrative.",
             [("fact", "history.immigration_record", "POSITIVE - prior removal 2012")]),
     plants=[{"type": "inconsistency", "anchors": [], "fieldPaths": ["history.immigration_record"]}],
     note="F055-H: the narrative says immigration history 'NONE FOUND'. The conflict is between that sentence and the changed form field; a finding citing the field counts.")
emit(variant("F075", "H", "Form immigration record changed to NEGATIVE; the narrative describes two earlier Border Patrol apprehensions (NTA, voluntary return).",
             [("fact", "history.immigration_record", "NEGATIVE")]),
     plants=[{"type": "inconsistency", "anchors": ["previously arrested", "Voluntary Return", "Notice to Appear"], "fieldPaths": ["history.immigration_record"]}],
     note="F075-H: earlier apprehensions are voluntary return and NTA, not removals; detecting this needs the model, not the removal-based rule.")
emit(variant("F075", "X", "Form date of last entry changed to 06/09/2013; the narrative says he crossed the day after a voluntary return on 06/08/2011.",
             [("fact", "entry.date", "06/09/2013, 1800")]),
     plants=[{"type": "inconsistency", "anchors": ["06/08/2011"], "fieldPaths": ["entry.date"]}],
     note="F075-X: the narrative gives the entry only relative to 06/08/2011 ('the day after'); detection requires reading the year from that date.")

# ------------------------------------------------------------------ Part B: independently authored scenarios
def syn(cid, title, context, scenario, narrative, facts, charges):
    return {"id": cid, "title": title, "kind": "synthetic", "split": "fresh", "context": context,
            "provenance": {"source": "Team-authored synthetic scenario (fresh-v1), 2026-10-30", "extraction": "Written directly as text.",
                           "verification": "Synthetic; checked by the team against its intended scenario before any run.", "replacements": [],
                           "textOrigin": "synthetic-test", "modifications": [scenario]},
            "narrative": {"text": narrative}, "facts": facts,
            "selectedCharges": [{"citation": x, "source": "team-assigned-for-testing", "note": "Synthetic scenario."} for x in charges]}
def f(path, label, value, status=None):
    st = status or ("present" if value else "absent")
    return {"path": path, "label": label, "value": value if st == "present" else "", "status": st}
def interior(cit, edate, eplace, emanner, dt, loc, imm="NEGATIVE"):
    return [f("subject.citizenship", "Country of citizenship", cit), f("entry.date", "Date and time of last entry", edate), f("entry.place", "Place of last entry", eplace),
            f("entry.manner", "Manner of last entry", emanner), f("encounter.date_time", "Encounter date and hour", dt), f("encounter.location", "Encounter location (at/near)", loc),
            f("encounter.method", "Method of location/apprehension", "BC"), f("history.immigration_record", "Immigration record", imm)]
NA = {"N2": "not_applicable", "N3": "not_applicable", "N8": "not_applicable"}

BUS = f"""ENCOUNTER:
On February 14, 2024, at approximately 0640 hours, Border Patrol Agents {R} and {R} were performing transportation checks at the Greyhound bus terminal in Detroit, Michigan. Agent {R} identified himself and asked a passenger about her citizenship. The passenger, later identified as the subject, stated that she is a citizen of Guatemala and presented a Guatemalan passport. She stated that she did not have a visa or any other document allowing her to be in the United States. Agent {R} arrested the subject at approximately 0650 hours and transported her to the {E} Border Patrol Station.

ENTRY:
The subject stated that she entered the United States on or about September 3, 2019, by wading across the Rio Grande near El Paso, Texas, and that she was not inspected by any immigration officer. She travelled by bus from El Paso to Chicago, Illinois, where she has lived since 2019.
"""
GROUND_B = "The subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act, in that she is an alien present in the United States without being admitted or paroled.\n"
DISP_B = "DISPOSITION:\nThe subject was served a Notice to Appear and released on her own recognizance pending her hearing.\n"
emit(syn("FS01", "Bus terminal check in Detroit (complete)", ["interior"], "Clean interior scenario.", BUS + GROUND_B + DISP_B,
         interior("GUATEMALA", "09/03/2019", "near El Paso, TX", "EWI WADING", "02/14/2024 0640", "DETROIT, MI"), ["INA 212(a)(6)(A)(i)"]),
     elements={"N1": "present", "N5": "present", "N7": "present", "N6": "not_applicable", **NA})
emit(syn("FS02", "Bus terminal check: corrected entry year", ["interior"],
         "Subject first gives 2020 and corrects herself to 2019, explaining why; the officer records the correction.",
         BUS + "When first asked, the subject said she entered in 2020. She then corrected herself and explained that she entered in September 2019, because her son was born in Chicago in December 2019, three months after she arrived. Agent " + R + " recorded the entry as September 2019.\n" + GROUND_B + DISP_B,
         interior("GUATEMALA", "09/03/2019", "near El Paso, TX", "EWI WADING", "02/14/2024 0640", "DETROIT, MI"), ["INA 212(a)(6)(A)(i)"]),
     should_not=["entered in 2020"], elements=NA,
     note="FS02: the 2020 statement is corrected and explained in the narrative (sponsor S5). Any conflict flag citing it counts as a should-not-flag violation.")
emit(syn("FS03", "Bus terminal check: citizenship not recorded", ["interior"], "Citizenship removed from the narrative and the form.",
         BUS.replace("stated that she is a citizen of Guatemala and presented a Guatemalan passport. She ", "presented an identity document. She ") + GROUND_B + DISP_B,
         [x for x in interior("", "09/03/2019", "near El Paso, TX", "EWI WADING", "02/14/2024 0640", "DETROIT, MI")], ["INA 212(a)(6)(A)(i)"]),
     plants=[{"type": "missing_element", "elementId": "E5"}], elements=NA,
     note="FS03: the narrative still says 'an alien present ... without being admitted' in the ground; that states alienage as a legal conclusion but no country of citizenship. Labeled missing.")
OVER = f"""ENCOUNTER:
On July 9, 2024, at approximately 1115 hours, Border Patrol Agent {R} responded to a request from the Michigan State Police at a traffic stop near Port Huron, Michigan. The driver, later identified as the subject, stated that he is a citizen of Nigeria and presented a Nigerian passport containing a B1/B2 visa. Records checks showed that the subject was admitted at John F. Kennedy International Airport on March 2, 2016, as a B2 visitor authorized to remain until September 1, 2016. The subject stated that he stayed after his authorized period to work and has not applied for any other status. Agent {R} arrested the subject at approximately 1130 hours.
"""
emit(syn("FS04", "Visa overstay near Port Huron (complete)", ["interior"], "Clean overstay scenario with a matching charge.",
         OVER + "The subject is removable under Section 237(a)(1)(B) of the Immigration and Nationality Act, in that after admission as a nonimmigrant he remained in the United States for a time longer than permitted.\nDISPOSITION:\nThe subject was served a Notice to Appear and detained pending removal proceedings.\n",
         interior("NIGERIA", "03/02/2016", "JFK AIRPORT, NY", "B2 ADMITTED", "07/09/2024 1115", "PORT HURON, MI"), ["INA 237(a)(1)(B)"]),
     elements={"N5": "present", "N7": "present", **NA})
emit(syn("FS05", "Visa overstay near Port Huron: entry-without-inspection charge", ["interior"], "Charge requires entry without admission; the record documents admission as a B2 visitor.",
         OVER + "DISPOSITION:\nThe subject was served a Notice to Appear and detained pending removal proceedings.\n",
         interior("NIGERIA", "03/02/2016", "JFK AIRPORT, NY", "B2 ADMITTED", "07/09/2024 1115", "PORT HURON, MI"), ["INA 212(a)(6)(A)(i)"]),
     plants=[{"type": "citation"}], elements=NA)
AMB = f"""INSPECTION:
On August 21, 2024, at approximately 1620 hours, the subject applied for admission at the Ambassador Bridge port of entry in Detroit, Michigan, as the driver of a commercial truck. The subject presented an Indian passport and a Canadian permanent resident card and stated that the purpose of his trip was to deliver auto parts to a warehouse in Taylor, Michigan. CBP Officer {R} found that the passport's biographic page had been altered: the laminate was lifted and the date of birth did not match the permanent resident card. When asked about the passport, the subject stated that a relative had changed the date of birth to help him obtain work. CBP Officer {R} found that the subject sought admission by presenting an altered document.
"""
emit(syn("FS06", "Altered passport at the Ambassador Bridge (complete)", ["port_of_entry"], "Clean port-of-entry scenario; the selected charge is outside the team's charge summaries.",
         AMB + "The subject is inadmissible under Section 212(a)(6)(C)(i) of the Immigration and Nationality Act, in that he sought admission to the United States by fraud or willful misrepresentation of a material fact.\nDISPOSITION:\nThe subject was refused admission, the altered passport was seized, and the subject was returned to Canada.\n",
         [f("subject.citizenship", "Country of citizenship", "INDIA"), f("documents.passport", "Passport number and country", f"{R}, INDIA"), f("encounter.location", "Port of entry", "AMBASSADOR BRIDGE, MI"), f("encounter.date_time", "Inspection date and hour", "08/21/2024 1620")],
         ["INA 212(a)(6)(C)(i)"]),
     elements={"N2": "present", "N3": "present", "N5": "present", "N7": "present", "E1": "not_applicable", "N8": "not_applicable"},
     note="FS06: INA 212(a)(6)(C)(i) is not in the team's charge summaries, so the citation check is expected to say it cannot be checked and route the case to a person. That routing is expected, not a false flag.")
emit(syn("FS07", "Altered passport at the Ambassador Bridge: no claimed status", ["port_of_entry"], "The claimed status/classification (permanent resident card, delivery purpose) is removed.",
         AMB.replace(" and a Canadian permanent resident card and stated that the purpose of his trip was to deliver auto parts to a warehouse in Taylor, Michigan", "").replace(" and the date of birth did not match the permanent resident card", "")
         + "The subject is inadmissible under Section 212(a)(6)(C)(i) of the Immigration and Nationality Act, in that he sought admission to the United States by fraud or willful misrepresentation of a material fact.\nDISPOSITION:\nThe subject was refused admission and returned to Canada.\n",
         [f("subject.citizenship", "Country of citizenship", "INDIA"), f("encounter.location", "Port of entry", "AMBASSADOR BRIDGE, MI"), f("encounter.date_time", "Inspection date and hour", "08/21/2024 1620")],
         ["INA 212(a)(6)(C)(i)"]),
     plants=[{"type": "missing_element", "elementId": "N2"}], elements={"E1": "not_applicable", "N8": "not_applicable"},
     note="FS07: removing the purpose of travel also makes N3 incomplete; an N3 finding is adjudicated as a valid observation, not a false flag.")
ER = f"""INSPECTION:
On November 2, 2024, at approximately 0915 hours, the subject applied for admission at the Sault Ste. Marie port of entry as a pedestrian and presented a Mexican passport with a B1/B2 visa, stating that he was visiting a friend for two weeks. Records checks showed that the subject had been ordered removed from the United States by an immigration judge on May 4, 2018, and was removed through Laredo, Texas, on June 1, 2018. The subject did not have permission to reapply for admission.
"""
ER_PROC = f"""PROCESSING:
The subject was processed for expedited removal. CBP Officer {R} advised the subject in Spanish of the charge of inadmissibility, took a sworn statement on Form I-867A/B, and gave him an opportunity to respond. The subject stated that he did not know he needed permission to return. Supervisory CBP Officer {R} reviewed and approved the expedited removal, and the subject was served Form I-860 and signed the acknowledgment.
"""
ER_GROUND = "The subject is inadmissible under Section 212(a)(9)(A)(ii) of the Immigration and Nationality Act, in that he was ordered removed and seeks admission within ten years of removal without permission to reapply.\n"
emit(syn("FS08", "Expedited removal at Sault Ste. Marie (complete)", ["port_of_entry", "expedited_removal"], "Clean expedited-removal scenario.",
         ER + ER_GROUND + ER_PROC,
         [f("subject.citizenship", "Country of citizenship", "MEXICO"), f("documents.passport", "Passport number and country", f"{R}, MEXICO"), f("encounter.location", "Port of entry", "SAULT STE. MARIE, MI"), f("encounter.date_time", "Inspection date and hour", "11/02/2024 0915"), f("history.immigration_record", "Immigration record", "POSITIVE - removed 06/01/2018")],
         ["INA 212(a)(9)(A)(ii)"]),
     elements={"N3": "present", "N8": "present", "N7": "present", "E1": "not_applicable"},
     note="FS08: INA 212(a)(9)(A)(ii) is not in the team's charge summaries; routing because the citation cannot be checked is expected.")
emit(syn("FS09", "Expedited removal at Sault Ste. Marie: no advisal or response", ["port_of_entry", "expedited_removal"], "Advisal, sworn statement, response and supervisory review removed.",
         ER + ER_GROUND + "PROCESSING:\nThe subject was processed for expedited removal and was served Form I-860.\n",
         [f("subject.citizenship", "Country of citizenship", "MEXICO"), f("documents.passport", "Passport number and country", f"{R}, MEXICO"), f("encounter.location", "Port of entry", "SAULT STE. MARIE, MI"), f("encounter.date_time", "Inspection date and hour", "11/02/2024 0915"), f("history.immigration_record", "Immigration record", "POSITIVE - removed 06/01/2018")],
         ["INA 212(a)(9)(A)(ii)"]),
     plants=[{"type": "missing_element", "elementId": "N8"}], elements={"E1": "not_applicable"})
GROUP = f"""ENCOUNTER:
On April 5, 2024, at approximately 2210 hours, Border Patrol Agents assisted the Ohio State Highway Patrol with a vehicle stop on Interstate 80 near Toledo, Ohio. The three passengers, {R}, {R} and {R}, stated that they are citizens of Honduras and that they had no immigration documents allowing them to be in the United States. All three were arrested at approximately 2230 hours and transported to the {E} Border Patrol Station.

ENTRY AND HISTORY:
{R} stated that he was deported to Honduras in 2019 and returned the same year. {R} stated that he entered the United States in 2021 by crossing the Rio Grande near McAllen, Texas, and has never been arrested before. {R} stated that she entered with her cousin in 2022.
"""
emit(syn("FS10", "Three passengers near Toledo, redacted names", ["interior"],
         "Three redacted people; one says he was deported in 2019. This record's form shows a NEGATIVE immigration record and entry in 2021. Attribution cannot be determined from the redacted names.",
         GROUP + GROUND_B.replace("she is", "he is") + "DISPOSITION:\nThe subject was served a Notice to Appear.\n",
         interior("HONDURAS", "2021", "near McAllen, TX", "EWI", "04/05/2024 2210", "TOLEDO, OH"), ["INA 212(a)(6)(A)(i)"]),
     should_not=["deported to Honduras"], elements=NA,
     note="FS10: the deportation statement cannot be attributed to this record's subject. A flag citing it as conflicting with the NEGATIVE record is a should-not-flag violation. Routing the case to a person because several people are described is acceptable.")

for d in ("cases", "expected"):
    os.makedirs(f"{OUT}/{d}", exist_ok=True)
for c, e in CASES:
    json.dump(c, open(f"{OUT}/cases/{c['id']}.json", "w"), indent=2, ensure_ascii=False)
    json.dump(e, open(f"{OUT}/expected/{e['id']}.json", "w"), indent=2, ensure_ascii=False)
with open(f"{OUT}/LABELS.md", "w") as fh:
    fh.write("# Fresh evaluation (fresh-v1): label notes recorded before any run\n\n")
    fh.write("These notes were written on 2026-10-30 before the app was run on any fresh case. They must not be changed after the run; any later doubt is reported separately.\n\n")
    for cid, n in LABELS: fh.write(f"- **{cid}**: {n}\n")
print(len(CASES), "fresh cases;", sum(len(e["plants"]) for _, e in CASES), "planted issues;", sum(len(e["shouldNotFlag"]) for _, e in CASES), "should-not-flag anchors;", len(LABELS), "label notes")
