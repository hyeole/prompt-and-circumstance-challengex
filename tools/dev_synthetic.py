"""
Development synthetic cases (dataset dev-synthetic-v1), written by the team on 2026-10-30.
Guided by how narratives are written in the public CBP PDF and by Unissant's 'Core elements to cover' table.
Not real cases. Expected answers are written here, before any run, and saved apart from the runtime inputs.
Usage: python3 tools/dev_synthetic.py   -> eval/dev-synthetic/cases/*.json and eval/dev-synthetic/expected/*.json
"""
import json, os
R = "[REDACTED (b)(6), (b)(7)(C)]"
E = "[REDACTED (b)(7)(E)]"

def F(path, label, value, status=None):
    return {"path": path, "label": label, "value": value if (status or ("present" if value else "absent")) == "present" else "", "status": status or ("present" if value else "absent")}

def interior_facts(cit, edate, eplace, emanner, encdt, encloc, method="PB", imm="NEGATIVE", disp="", code="I6A"):
    return [F("subject.name", "Subject name", "", "redacted"), F("subject.citizenship", "Country of citizenship", cit),
            F("entry.date", "Date and time of last entry", edate), F("entry.place", "Place of last entry", eplace),
            F("entry.manner", "Manner of last entry", emanner), F("encounter.date_time", "Encounter date and hour", encdt),
            F("encounter.location", "Encounter location (at/near)", encloc), F("encounter.method", "Method of location/apprehension", method),
            F("history.immigration_record", "Immigration record", imm), F("history.criminal_record", "Criminal record", "None Known"),
            F("form.disposition", "Disposition", disp), F("form.charge_code", "Charge code words (as printed)", code)]

def poe_facts(cit, passport, port, dt):
    return [F("subject.name", "Subject name", "", "redacted"), F("subject.citizenship", "Country of citizenship", cit),
            F("documents.passport", "Passport number and country", passport), F("encounter.location", "Port of entry", port),
            F("encounter.date_time", "Inspection date and hour", dt), F("history.immigration_record", "Immigration record", "NEGATIVE")]

CASES = []
def case(cid, title, context, scenario, narrative, facts, charges, expected, notes=""):
    CASES.append(({"id": cid, "title": title, "kind": "synthetic", "split": "dev-synthetic", "context": context,
        "provenance": {"source": "Team-authored synthetic case (dev-synthetic-v1), 2026-10-30", "extraction": "Written directly as text; not taken from any document.",
                       "verification": "Synthetic; reviewed by the team for internal consistency against its intended scenario.", "replacements": [],
                       "textOrigin": "synthetic-test", "modifications": [scenario]},
        "narrative": {"text": narrative}, "facts": facts,
        "selectedCharges": [{"citation": c, "source": "team-assigned-for-testing", "note": "Synthetic case."} for c in charges]},
        {"id": cid, "base": cid, "split": "dev-synthetic", "datasetVersion": "dev-synthetic-v1", "description": scenario, "plants": expected.get("plants", []),
         "elementExpectations": expected.get("elements", {}), "shouldNotFlag": expected.get("shouldNotFlag", []), "labelNotes": notes}))

BASE_INT = f"""ENCOUNTER:
On June 4, 2023, at approximately 1410 hours, Border Patrol Agent {R} was conducting roving patrol duties on Interstate 75 near Monroe, Michigan. Agent {R} observed a vehicle travelling northbound and conducted a vehicle stop with the assistance of Michigan State Police. Agent {R} identified himself as a Border Patrol Agent and questioned the passenger, later identified as the subject, as to his citizenship. The subject stated that he is a citizen and national of Mexico and presented a Mexican voter identification card. The subject stated that he did not have any immigration documents allowing him to be in or remain in the United States legally. Agent {R} placed the subject under arrest at approximately 1425 hours and transported him to the {E} Border Patrol Station for processing.

ENTRY:
The subject stated that he entered the United States on or about March 10, 2018, by walking across the border near Nogales, Arizona, and that he was not inspected or admitted by an immigration officer. The subject stated that he then travelled by car to Phoenix, Arizona, and later by bus to Toledo, Ohio, where he has lived since 2019.
"""
GROUND = "REMOVABILITY:\nThe subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act, in that he is an alien present in the United States without being admitted or paroled.\n"
DISP = "DISPOSITION:\nThe subject was processed for a Notice to Appear and was served with a Warrant of Arrest. The subject was transferred to Immigration and Customs Enforcement custody pending removal proceedings.\n"
INT_FACTS = lambda **kw: interior_facts("MEXICO", kw.get("edate", "03/10/2018"), kw.get("eplace", "near Nogales, AZ"), kw.get("emanner", "EWI AFOOT"), "06/04/2023 1410", "MONROE, MI", disp=kw.get("disp", "Warrant of Arrest/Notice to Appear"))
NA_POE = {"N2": "not_applicable", "N3": "not_applicable", "N8": "not_applicable"}

case("DS01", "Vehicle stop near Monroe, Michigan (complete)", ["interior"], "Clean interior case: citizenship, documents, entry, encounter, status, stated ground with explanation, and disposition all present.",
     BASE_INT + GROUND + DISP, INT_FACTS(), ["INA 212(a)(6)(A)(i)"],
     {"elements": {"E5": "present", "N1": "present", "N5": "present", "N7": "present", "N6": "not_applicable", **NA_POE}})
case("DS02", "Vehicle stop near Monroe, Michigan (no disposition)", ["interior"], "Disposition removed from the narrative and the form.",
     BASE_INT + GROUND, INT_FACTS(disp=""), ["INA 212(a)(6)(A)(i)"],
     {"plants": [{"type": "missing_element", "elementId": "N7"}], "elements": {"N5": "present", **NA_POE}})
case("DS03", "Vehicle stop near Monroe, Michigan (no stated ground)", ["interior"], "No INA section stated in the narrative; selected charge is still recorded.",
     BASE_INT + DISP, INT_FACTS(), ["INA 212(a)(6)(A)(i)"],
     {"plants": [{"type": "missing_element", "elementId": "N5"}], "elements": {"N7": "present", **NA_POE}})
case("DS04", "Traveler's explanation resolves an apparent place conflict", ["interior"],
     "Subject first names Laredo, then explains he crossed near Hidalgo and was picked up in Laredo; the officer records the clarification. The apparent conflict is resolved in the narrative.",
     BASE_INT.replace("by walking across the border near Nogales, Arizona", "by wading across the Rio Grande").replace("then travelled by car to Phoenix, Arizona", "then travelled by car to San Antonio, Texas")
     + "When first asked, the subject said he crossed at Laredo, Texas. When asked again, the subject explained that he crossed the river near Hidalgo, Texas, and that Laredo is where a driver picked him up the next day. Agent " + R + " recorded the place of entry as near Hidalgo, Texas, based on this explanation.\n" + GROUND + DISP,
     INT_FACTS(eplace="near Hidalgo, TX", emanner="EWI WADING"), ["INA 212(a)(6)(A)(i)"],
     {"shouldNotFlag": ["crossed at Laredo"], "elements": {"N7": "present", **NA_POE}},
     "If the app flags the Laredo/Hidalgo statements as a conflict, it is counted against precision: the narrative records and resolves the explanation (sponsor category S5).")
case("DS05", "Entry date conflicts with the form", ["interior"], "Narrative says the subject entered in August 2015; the form records 03/10/2018.",
     BASE_INT.replace("on or about March 10, 2018", "in August 2015") + GROUND + DISP, INT_FACTS(), ["INA 212(a)(6)(A)(i)"],
     {"plants": [{"type": "inconsistency", "anchors": ["August 2015"], "fieldPaths": ["entry.date"]}], "elements": NA_POE})
case("DS06", "Two subjects, redacted names, different entry years", ["interior"],
     "Two people in one vehicle. One redacted person says 2016, the other says 2018; the form (for this record's subject) says 2018. Attribution cannot be determined from redacted names.",
     f"""ENCOUNTER:
On June 4, 2023, at approximately 1410 hours, Border Patrol Agent {R} conducted a vehicle stop on Interstate 75 near Monroe, Michigan, with the assistance of Michigan State Police. Two occupants, {R} and {R}, stated that they are citizens of Mexico and that they did not have any immigration documents allowing them to be in the United States legally. Both subjects were arrested and transported to the {E} Border Patrol Station.

ENTRY:
{R} stated that he entered the United States in 2016 by crossing the border illegally near Nogales, Arizona. {R} stated that he entered the United States in 2018 by walking across the border near Nogales, Arizona, and was not inspected.
""" + GROUND + DISP, INT_FACTS(), ["INA 212(a)(6)(A)(i)"],
     {"shouldNotFlag": ["in 2016"], "elements": NA_POE},
     "Correct behaviour is no entry-date conflict: the 2016 statement cannot be attributed to this record's subject.")
POE = f"""INSPECTION:
On September 12, 2023, at approximately 1130 hours, the subject applied for admission at the Detroit-Windsor Tunnel port of entry as a passenger in a private vehicle. The subject presented a valid Brazilian passport and a B1/B2 visitor visa and stated that the purpose of his trip was tourism for one week. In secondary inspection, CBP Officer {R} found work tools, a hotel receipt for 90 days, and an employment offer letter from a construction company in Dearborn, Michigan. When asked about the letter, the subject stated that he intended to work in Michigan for three months. CBP Officer {R} found that the subject's stated purpose did not match the documents in his possession and that he intended to work without authorization.
"""
POE_GROUND = "The subject is inadmissible under Section 212(a)(7)(A)(i)(I) of the Immigration and Nationality Act, in that he is an immigrant not in possession of a valid immigrant visa or other valid entry document at the time of application for admission.\n"
case("DS07", "Application for admission at the Detroit-Windsor Tunnel (complete)", ["port_of_entry"], "Clean port-of-entry case: documents presented, claimed classification, purpose of travel, facts developed, ground, and disposition.",
     POE + POE_GROUND + "DISPOSITION:\nThe subject was permitted to withdraw his application for admission on Form I-275 and was returned to Canada.\n",
     poe_facts("BRAZIL", f"{R}, BRAZIL", "DETROIT-WINDSOR TUNNEL, MI", "09/12/2023 1130"), ["INA 212(a)(7)(A)(i)(I)"],
     {"elements": {"N1": "present", "N2": "present", "N3": "present", "N5": "present", "N7": "present", "E1": "not_applicable", "E4": "not_applicable", "N8": "not_applicable"}})
case("DS08", "Application for admission without purpose of travel or documents presented", ["port_of_entry"], "Port-of-entry case with the documents presented and the purpose of travel removed.",
     POE.replace("The subject presented a valid Brazilian passport and a B1/B2 visitor visa and stated that the purpose of his trip was tourism for one week. ", "")
     + POE_GROUND + "DISPOSITION:\nThe subject was permitted to withdraw his application for admission on Form I-275 and was returned to Canada.\n",
     poe_facts("BRAZIL", "", "DETROIT-WINDSOR TUNNEL, MI", "09/12/2023 1130"), ["INA 212(a)(7)(A)(i)(I)"],
     {"plants": [{"type": "missing_element", "elementId": "N3"}], "elements": {"E1": "not_applicable", "N8": "not_applicable"}},
     "N3 asks for port, documents presented and purpose; the port remains stated, so 'unclear' is also an acceptable detection.")
ER = POE + POE_GROUND + f"""PROCESSING:
The subject was processed for expedited removal. CBP Officer {R} advised the subject of the charge of inadmissibility through a Portuguese interpreter, took a sworn statement on Form I-867A/B, and gave the subject an opportunity to respond. The subject stated that he understood the charge and had nothing to add. Supervisory CBP Officer {R} reviewed and approved the expedited removal. The subject was served Form I-860, Notice and Order of Expedited Removal, and signed the acknowledgment.
"""
case("DS09", "Expedited removal at the Detroit-Windsor Tunnel (complete)", ["port_of_entry", "expedited_removal"], "Clean expedited-removal case: advisal, sworn statement, opportunity to respond, supervisory approval, I-860 service.",
     ER, poe_facts("BRAZIL", f"{R}, BRAZIL", "DETROIT-WINDSOR TUNNEL, MI", "09/12/2023 1130"), ["INA 212(a)(7)(A)(i)(I)"],
     {"elements": {"N8": "present", "N7": "present", "N3": "present", "E1": "not_applicable"}})
case("DS10", "Expedited removal without advisal or opportunity to respond", ["port_of_entry", "expedited_removal"], "Expedited-removal case with the advisal, sworn statement, response and supervisory review removed.",
     POE + POE_GROUND + "PROCESSING:\nThe subject was processed for expedited removal and was served Form I-860, Notice and Order of Expedited Removal.\n",
     poe_facts("BRAZIL", f"{R}, BRAZIL", "DETROIT-WINDSOR TUNNEL, MI", "09/12/2023 1130"), ["INA 212(a)(7)(A)(i)(I)"],
     {"plants": [{"type": "missing_element", "elementId": "N8"}], "elements": {"N7": "present"}})
case("DS11", "Short narrative with no context cues", [], "No case context set and no Border Patrol or port wording: context-dependent items should be 'applicability unclear', not missing.",
     "The subject stated that he is a citizen of Guatemala. The subject stated that he has no documents allowing him to be in the United States. The subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act, in that he is present without being admitted or paroled. The subject was served a Notice to Appear.\n",
     [F("subject.citizenship", "Country of citizenship", "GUATEMALA")], ["INA 212(a)(6)(A)(i)"],
     {"elements": {"E1": "applicability_unclear", "E4": "applicability_unclear", "N3": "applicability_unclear", "N8": "applicability_unclear", "N7": "present", "N5": "present"}})
case("DS12", "Overstay charge on an entry without inspection", ["interior"], "Selected charge requires a prior admission; the record documents entry without inspection.",
     BASE_INT + DISP, INT_FACTS(), ["INA 237(a)(1)(B)"],
     {"plants": [{"type": "citation"}], "elements": NA_POE})

out = "eval/dev-synthetic"
for d in ("cases", "expected"):
    os.makedirs(f"{out}/{d}", exist_ok=True)
for c, e in CASES:
    json.dump(c, open(f"{out}/cases/{c['id']}.json", "w"), indent=2, ensure_ascii=False)
    json.dump(e, open(f"{out}/expected/{c['id']}.json", "w"), indent=2, ensure_ascii=False)
print(len(CASES), "dev-synthetic cases")
