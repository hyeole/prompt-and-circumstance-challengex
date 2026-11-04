# Builds the diag-1 cases, labels and locked checks: 20 team-authored development cases (NOT independent validation).
# Written before any engine output on these cases was inspected. Run once; outputs are locked by LOCK.json.
#   python3 -I eval/diag-1/build-cases.py
import json, os

R = "[REDACTED (b)(6), (b)(7)(C)]"
E = "[REDACTED (b)(7)(E)]"
HERE = os.path.dirname(os.path.abspath(__file__))

def facts(**over):
    base = {
        "subject.name": ("Subject name", "", "redacted"),
        "subject.citizenship": ("Country of citizenship", "MEXICO", "present"),
        "entry.date": ("Date and time of last entry", "", "present"),
        "entry.place": ("Place of last entry", "", "present"),
        "entry.manner": ("Manner of last entry", "EWI AFOOT", "present"),
        "encounter.date_time": ("Encounter date and hour", "", "present"),
        "encounter.location": ("Encounter location (at/near)", "", "present"),
        "encounter.method": ("Method of location/apprehension", "PB", "present"),
        "history.immigration_record": ("Immigration record", "NEGATIVE", "present"),
        "history.criminal_record": ("Criminal record", "None Known", "present"),
        "form.disposition": ("Disposition", "Warrant of Arrest/Notice to Appear", "present"),
    }
    out = []
    for path, (label, value, status) in base.items():
        if path in over:
            v = over[path]
            if v is None: status, value = "absent", ""
            else: value = v; status = "present"
        out.append({"path": path, "label": label, "value": value, "status": status})
    return out

CASES = []
def case(cid, title, cat, text, fx, charges, plants, checks, notes, context=("interior",), mods=None, snf=()):
    CASES.append(dict(cid=cid, title=title, cat=cat, text=text.strip() + "\n", facts=fx, charges=charges, plants=plants,
                      checks=checks, notes=notes, context=list(context), mods=mods or [title], snf=list(snf)))

GROUND_6A = "The subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act, in that he is an alien present in the United States without being admitted or paroled."

# ---------------------------------------------------------------- established issues (10)
case("DG01", "Pronoun-linked entry date differs from the form", "established", f"""
ENCOUNTER:
On September 14, 2023, at approximately 0640 hours, Border Patrol Agents {R} and {R} were conducting traffic observation duties on Interstate 94 near Kalamazoo, Michigan. The agents conducted a vehicle stop on a white sedan after a records check showed the registered owner had an outstanding immigration matter. The driver, later identified as {R}, presented a valid Michigan driver's license and was determined to be a United States citizen; he was released at the scene. Agent {R} then questioned the passenger, who is the subject of this report, as to his citizenship.
The subject stated that he is a citizen and national of Honduras and that he does not possess any documents allowing him to be in or remain in the United States legally. He further stated that he last entered the United States on or about March 3, 2016, by crossing the Rio Grande on foot near Roma, Texas, and that he was not inspected by an immigration officer. He presented a Honduran national identity card bearing his name.
TRAVEL:
After crossing, the subject travelled by car to Houston, Texas, and later by bus to Kalamazoo, where he has worked in construction.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was transported to the {E} Border Patrol Station, processed, and served a Notice to Appear (Form I-862). He will be held pending removal proceedings.
""", facts(**{"subject.citizenship": "HONDURAS", "entry.date": "03/03/2019", "entry.place": "near Roma, TX", "encounter.date_time": "09/14/2023 0640", "encounter.location": "KALAMAZOO, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["March 3, 2016"], "fieldPaths": ["entry.date"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "March 3, 2016", "field": "entry.date"}],
    "Attribution is established across sentences: 'The subject stated…' then 'He further stated…', the only other person (the driver) having been released; 'He' has one antecedent. The narrative gives 2016, the form 2019, for the last entry.",
    mods=["Narrative last-entry date (March 3, 2016) differs from the form (03/03/2019); the date is stated in a sentence linked to the subject by pronoun."])

case("DG02", "Last entry without inspection; form manner records the earlier visa entry", "established", f"""
ENCOUNTER:
On April 2, 2024, Border Patrol Agent {R} responded to a request from the Toledo Police Department for identification assistance with a person detained after a minor traffic collision near Toledo, Ohio. Agent {R} arrived at approximately 1515 hours, identified himself as a Border Patrol Agent, and interviewed the subject in Spanish.
The subject stated that he is a citizen of Guatemala and presented a Guatemalan passport that expired in 2015. He stated that he first came to the United States in July 2009, when he flew into Los Angeles International Airport and was admitted as a B2 visitor. He returned to Guatemala in 2013. The subject stated that he most recently re-entered the United States on or about April 15, 2017, by walking through the desert near Sasabe, Arizona, with a guide, and that he did not present himself for inspection.
He stated that he has no visa or other document allowing him to remain in the United States.
TRAVEL:
From Arizona he was driven to Phoenix and then took a bus to Toledo.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was arrested, transported to the {E} Station, and processed for a Notice to Appear.
""", facts(**{"subject.citizenship": "GUATEMALA", "entry.date": "04/15/2017", "entry.place": "near Sasabe, AZ", "entry.manner": "B2", "encounter.date_time": "04/02/2024 1515", "encounter.location": "TOLEDO, OH", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["walking through the desert near Sasabe"], "fieldPaths": ["entry.manner"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "walking through the desert near Sasabe", "field": "entry.manner"}],
    "The form records the LAST entry (04/15/2017, near Sasabe) with manner B2, but the narrative states that last entry was without inspection; B2 belongs to the 2009 first entry. Event scope is explicit ('first came', 'most recently re-entered').",
    mods=["Form manner of last entry is B2 (from the 2009 first entry); the narrative's most recent entry (2017) was without inspection."])

case("DG03", "Admission-based charge, but the subject explicitly was never admitted", "established", f"""
ENCOUNTER:
On January 18, 2024, at about 2210 hours, Agents {R} and {R} were patrolling near the Ambassador Bridge in Detroit, Michigan, when they observed a man walking along the railroad right-of-way away from the river. The agents approached, identified themselves as Border Patrol Agents, and questioned him regarding his citizenship.
The subject stated that he is a citizen of Mexico. He stated that he has never been inspected or admitted by an immigration officer and that he has never held a visa, border crossing card or any other entry document. He stated that he entered the United States in 2012 by wading across the Rio Grande near Hidalgo, Texas. He had a Mexican voter identification card in his wallet.
TRAVEL:
He travelled by bus from McAllen to Chicago in 2012 and moved to Detroit in 2020.
REMOVABILITY:
The subject is removable under Section 237(a)(1)(B) of the Immigration and Nationality Act, in that he is in the United States in violation of law.
DISPOSITION:
The subject was processed for a Notice to Appear and detained pending a hearing.
""", facts(**{"entry.date": "2012", "entry.place": "near Hidalgo, TX", "encounter.date_time": "01/18/2024 2210", "encounter.location": "DETROIT, MI"}),
    ["INA 237(a)(1)(B)"],
    [{"type": "citation"}],
    [{"kind": "citation", "status": "likely_mismatch"}],
    "INA 237(a)(1)(B) requires a prior admission (team reference: requires entryManner 'admitted'). The subject states he was never inspected or admitted (explicit negation, the subject named) and the form records EWI.",
    mods=["Selected charge requires admission; the subject explicitly states he was never admitted and entered by wading the river."])

case("DG04", "Documented prior removal; form immigration record is NEGATIVE", "established", f"""
ENCOUNTER:
On June 11, 2024, at approximately 0930 hours, Border Patrol Agent {R} assisted the Monroe County Sheriff's Office with a person who could not produce identification after a workplace inspection near Monroe, Michigan. Agent {R} interviewed the subject, who stated that he is a citizen of Mexico and has no immigration documents allowing him to be in the United States.
IMMIGRATION HISTORY:
Fingerprint checks of the subject returned an alien file. Records show that the subject was ordered removed by an immigration judge in San Antonio, Texas, on 05/02/2014, and that he was physically removed to Mexico through the Laredo, Texas, port of entry on 05/20/2014.
ENTRY:
The subject stated that he re-entered the United States in late 2015 by crossing the river near Laredo, Texas, without inspection. He was carrying a Mexican birth certificate.
TRAVEL:
He stated that he travelled by car to Detroit in 2016.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was transported to the {E} Station and processed. A Notice to Appear was prepared and the case was referred for review.
""", facts(**{"entry.date": "2015", "entry.place": "near Laredo, TX", "encounter.date_time": "06/11/2024 0930", "encounter.location": "MONROE, MI", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["physically removed to Mexico"], "fieldPaths": ["history.immigration_record"]}],
    [{"kind": "finding", "category": ["inconsistency", "unclear"], "anchor": "physically removed to Mexico", "field": "history.immigration_record"}],
    "A completed removal of the subject (records check of the subject's own fingerprints; 'physically removed' on 05/20/2014) conflicts with the form's NEGATIVE immigration record. 'Notice to Appear' and 'referred for review' are current processing, not a prior removal.",
    mods=["Form immigration record is NEGATIVE although the subject's records show a completed removal in 2014."])

case("DG05", "Manner of last entry not stated anywhere", "established", f"""
ENCOUNTER:
On March 5, 2024, at approximately 1105 hours, Agents {R} and {R} encountered the subject at a bus station in Lansing, Michigan, after he asked them for directions. The agents identified themselves and asked about his citizenship.
The subject stated that he is a citizen of Ecuador and that he has no documents allowing him to live or work in the United States. He showed the agents an Ecuadorian passport.
ENTRY:
The subject stated that he entered the United States in or around June 2018 near El Paso, Texas.
TRAVEL:
He stated that he stayed in El Paso for two weeks and then travelled to Michigan by bus.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was processed and served a Notice to Appear (Form I-862).
""", facts(**{"subject.citizenship": "ECUADOR", "entry.date": "06/2018", "entry.place": "near El Paso, TX", "entry.manner": None, "encounter.date_time": "03/05/2024 1105", "encounter.location": "LANSING, MI", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "missing_element", "elementId": "E3"}],
    [{"kind": "missing", "element": "E3"}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "No sentence states how the subject entered (date and place only; the legal ground's 'without being admitted or paroled' is a conclusion, not a factual account) and the form's manner field is blank: E3 is missing. The charge's requirement (entry without inspection) is then unestablished, not contradicted: absence is not a mismatch.",
    mods=["Manner of last entry removed from the narrative and the form."])

case("DG06", "No disposition or documenting form recorded", "established", f"""
ENCOUNTER:
On July 22, 2024, at approximately 1340 hours, Border Patrol Agent {R} was conducting an inspection at a bus terminal in Port Huron, Michigan. Agent {R} approached a man seated in the waiting area, identified himself, and asked about his citizenship.
The subject stated that he is a citizen of Mexico and that he has no immigration documents. He presented a Mexican consular identification card. He stated that he entered the United States without inspection by walking across the border near Nogales, Arizona, on or about October 1, 2021.
TRAVEL:
From Nogales he was driven to Tucson and later flew from Phoenix to Detroit.
REMOVABILITY:
{GROUND_6A}
PROCESSING:
The subject was transported to the {E} Station, where his fingerprints and photograph were taken and entered into the databases. Records checks returned no criminal or immigration history.
""", facts(**{"entry.date": "10/01/2021", "entry.place": "near Nogales, AZ", "encounter.date_time": "07/22/2024 1340", "encounter.location": "PORT HURON, MI", "encounter.method": "OA", "form.disposition": None}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "missing_element", "elementId": "N7"}],
    [{"kind": "missing", "element": "N7"}],
    "The narrative ends at processing (fingerprints, records checks); no action taken (NTA, voluntary return, etc.) or documenting form is stated, and the form's disposition field is blank.",
    mods=["Disposition removed from the narrative and the form."])

case("DG07", "Reentry-after-removal charge; the subject's record and statement both show no removal", "established", f"""
ENCOUNTER:
On February 27, 2024, at approximately 0815 hours, Agents {R} and {R} encountered the subject during a vehicle stop near Gaylord, Michigan, conducted with the Michigan State Police. The subject was the only occupant. He stated that he is a citizen of Mexico and has no documents allowing him to be in the United States.
The subject's fingerprints were checked through the mobile biometric device. The checks returned no prior immigration encounters, no removals and no deportations for the subject. The subject stated that he has never been arrested by immigration authorities and has never been removed or deported from the United States.
ENTRY:
He stated that he entered without inspection by crossing the river near Eagle Pass, Texas, in August 2019. He presented a Mexican driver's license.
TRAVEL:
He travelled to Michigan by car with a cousin in 2020.
CHARGE:
The subject is charged under 8 U.S.C. 1326 as an alien found in the United States after removal.
DISPOSITION:
The subject was transported to the {E} Station and processed for prosecution.
""", facts(**{"entry.date": "08/2019", "entry.place": "near Eagle Pass, TX", "encounter.date_time": "02/27/2024 0815", "encounter.location": "GAYLORD, MI"}),
    ["8 U.S.C. 1326"],
    [{"type": "citation"}],
    [{"kind": "citation", "status": "likely_mismatch"}],
    "8 U.S.C. 1326 requires a prior removal (team reference). The subject's own fingerprint check explicitly returned no removals, the subject explicitly denies any removal, and the form record is NEGATIVE: an explicit, subject-specific negative result, not an absence.",
    mods=["Selected charge requires a prior removal; the subject's record check and statement explicitly show none."])

case("DG08", "Charge for entry without admission; the subject was admitted as a visitor", "established", f"""
ENCOUNTER:
On May 14, 2024, at approximately 1650 hours, Agent {R} encountered the subject at a farm supply store in Traverse City, Michigan, after a tip from a local employer. Agent {R} identified himself and questioned the subject about his citizenship.
The subject stated that he is a citizen of Jamaica. He presented a Jamaican passport containing a B1/B2 visa. He stated that he was admitted at the Detroit-Windsor Tunnel port of entry on 06/02/2019 as a B2 visitor, that he was allowed to stay for six months, and that he has remained in the United States since then without extending his stay.
TRAVEL:
After his admission he travelled by car to Traverse City, where he has worked on farms.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was processed for a Notice to Appear and released on an order of recognizance.
""", facts(**{"subject.citizenship": "JAMAICA", "entry.date": "06/02/2019", "entry.place": "DETROIT-WINDSOR TUNNEL POE", "entry.manner": "B2", "encounter.date_time": "05/14/2024 1650", "encounter.location": "TRAVERSE CITY, MI", "encounter.method": "OA", "form.disposition": "Notice to Appear / OREC"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "citation"}],
    [{"kind": "citation", "status": "likely_mismatch"}],
    "INA 212(a)(6)(A)(i) requires presence without admission (team reference: entryManner 'without_inspection'). The subject was admitted as a B2 visitor (statement, passport, form manner B2): the facts describe an overstay after admission.",
    mods=["Selected charge requires entry without admission; the subject's record shows a B2 admission."])

case("DG09", "Designated subject among three people; entry date differs from the form", "established", f"""
ENCOUNTER:
On October 3, 2023, at approximately 2330 hours, Agents {R} and {R} stopped a pickup truck on US-23 near Ann Arbor, Michigan, after it was observed travelling in tandem with a vehicle previously linked to smuggling. Three men were in the truck. The agents identified themselves and questioned each occupant separately.
The subject, who was seated in the front passenger seat, stated that he is a citizen of Mexico, that he has no immigration documents, and that he crossed the border illegally near Nogales, Arizona, on or about August 20, 2015. He had no identity documents. The driver and the rear-seat passenger declined to answer questions and were processed separately.
TRAVEL:
The subject stated that after crossing he lived in Arizona for several years before moving to Michigan in 2021.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
All three men were transported to the {E} Station. The subject was processed for a Notice to Appear and detained.
""", facts(**{"entry.date": "08/20/2017", "entry.place": "near Nogales, AZ", "encounter.date_time": "10/03/2023 2330", "encounter.location": "ANN ARBOR, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["August 20, 2015"], "fieldPaths": ["entry.date"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "August 20, 2015", "field": "entry.date"}],
    "Three people are described, but the entry statement is in a clause that designates 'The subject' (the front-seat passenger); the other two made no statements. 2015 vs the form's 2017.",
    mods=["Narrative entry date (August 20, 2015) differs from the form (08/20/2017) in a multi-person narrative where the statement names the subject."])

case("DG10", "Place of last entry differs from the form", "established", f"""
ENCOUNTER:
On August 8, 2024, at approximately 0705 hours, Agent {R} encountered the subject at a gas station in Saginaw, Michigan, during a follow-up investigation. Agent {R} identified himself and asked the subject about his citizenship.
The subject stated that he is a citizen of Mexico and has no immigration documents. He presented a Mexican consular identification card. The subject stated that he last entered the United States in May 2019 by crossing the Rio Grande on foot near Del Rio, Texas, without being inspected.
TRAVEL:
He stated that he was picked up near Del Rio and driven to San Antonio, and later travelled to Michigan by bus.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was processed for a Notice to Appear and detained at the {E} Station.
""", facts(**{"entry.date": "05/2019", "entry.place": "near Calexico, CA", "encounter.date_time": "08/08/2024 0705", "encounter.location": "SAGINAW, MI", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["near Del Rio, Texas"], "fieldPaths": ["entry.place"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "near Del Rio, Texas", "field": "entry.place"}],
    "The subject (named) states the last entry was near Del Rio, Texas; the form records near Calexico, CA. Different states, same last entry (May 2019).",
    mods=["Form place of last entry (near Calexico, CA) differs from the narrative (near Del Rio, Texas)."])

# ---------------------------------------------------------------- matched negative controls (6)
DN01 = CASES[0]["text"].replace("on or about March 3, 2016", "on or about March 3, 2019")
case("DN01", "Control for DG01: pronoun-linked entry date agrees with the form", "negative", DN01,
    facts(**{"subject.citizenship": "HONDURAS", "entry.date": "03/03/2019", "entry.place": "near Roma, TX", "encounter.date_time": "09/14/2023 0640", "encounter.location": "KALAMAZOO, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "noMissing"}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "Matched to DG01; the date agrees (03/03/2019). The released U.S.-citizen driver must not cause an attribution flag.", snf=["March 3, 2019"],
    mods=["DG01 with the narrative date matching the form."])

DN02 = CASES[1]["text"]
case("DN02", "Control for DG02: earlier visa entry, last entry without inspection, form agrees", "negative", DN02,
    facts(**{"subject.citizenship": "GUATEMALA", "entry.date": "04/15/2017", "entry.place": "near Sasabe, AZ", "entry.manner": "EWI AFOOT", "encounter.date_time": "04/02/2024 1515", "encounter.location": "TOLEDO, OH", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "Matched to DG02 with the form manner EWI AFOOT. The 2009 B2 admission is the FIRST entry; it does not conflict with the last-entry manner or with the charge.",
    snf=["admitted as a B2 visitor"], mods=["DG02 with the form manner matching the last entry."])

case("DN03", "Control for DG03/DG07: explicit negations consistent with the charge and record", "negative", f"""
ENCOUNTER:
On December 2, 2023, at approximately 1545 hours, Agents {R} and {R} encountered the subject walking along a county road near Adrian, Michigan, after a resident reported a man asking for a ride to Ohio. The agents identified themselves and questioned him about his citizenship.
The subject stated that he is a citizen of El Salvador. He stated that he was not inspected or admitted when he entered the United States and that he has never had a visa. He stated that he has never been arrested by immigration authorities and has never been removed. Fingerprint checks returned no prior immigration history.
ENTRY:
He stated that he crossed the river near Brownsville, Texas, on foot in November 2016. He carried a Salvadoran identity document (DUI).
TRAVEL:
He travelled to Michigan by bus in 2017.
REMOVABILITY:
The subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act, in that he is present in the United States without having been admitted or paroled.
DISPOSITION:
The subject was processed and served a Notice to Appear.
""", facts(**{"subject.citizenship": "EL SALVADOR", "entry.date": "11/2016", "entry.place": "near Brownsville, TX", "encounter.date_time": "12/02/2023 1545", "encounter.location": "ADRIAN, MI", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}, {"kind": "noMissing"}],
    "Negations ('not inspected or admitted', 'never been removed') support the selected charge and agree with the NEGATIVE record.",
    snf=["never been removed"], mods=["Negation control."])

case("DN04", "Control for DG04: current removal processing is not a prior removal", "negative", f"""
ENCOUNTER:
On June 19, 2024, at approximately 1020 hours, Border Patrol Agent {R} assisted the Wood County Sheriff's Office near Perrysburg, Ohio, with a man detained after a traffic violation. Agent {R} interviewed the subject, who stated that he is a citizen of Mexico and has no documents allowing him to remain in the United States. He presented a Mexican voter identification card.
IMMIGRATION HISTORY:
Fingerprint checks of the subject returned no prior immigration history.
ENTRY:
The subject stated that he entered the United States without inspection near Douglas, Arizona, in March 2020, walking through the desert.
TRAVEL:
He was driven from Arizona to Ohio in 2020.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was placed in removal proceedings and served a Notice to Appear. He will be held pending removal proceedings and may be removed if ordered by an immigration judge.
""", facts(**{"entry.date": "03/2020", "entry.place": "near Douglas, AZ", "encounter.date_time": "06/19/2024 1020", "encounter.location": "PERRYSBURG, OH", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency", "unclear"], "field": "history.immigration_record"}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "'Removal proceedings', 'held pending removal' and 'may be removed' describe the current process, not a past removal; the record check and the form agree (no history).",
    snf=["placed in removal proceedings"], mods=["Processing control."])

case("DN05", "Control: an explained correction of the entry year", "negative", f"""
ENCOUNTER:
On November 6, 2023, at approximately 1255 hours, Agents {R} and {R} encountered the subject at a construction site near Grand Rapids, Michigan, during a follow-up on a smuggling investigation. The agents identified themselves and questioned the subject.
The subject stated that he is a citizen of Mexico and has no immigration documents; he presented a Mexican passport. When first asked, the subject stated that he crossed the border in 2015. Later in the interview he corrected himself and stated that he actually crossed on foot near Nogales, Arizona, on or about August 20, 2017, explaining that 2015 was the year his brother crossed.
TRAVEL:
After crossing he lived in Tucson until 2022, then moved to Grand Rapids.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was processed for a Notice to Appear and detained.
""", facts(**{"entry.date": "08/20/2017", "entry.place": "near Nogales, AZ", "encounter.date_time": "11/06/2023 1255", "encounter.location": "GRAND RAPIDS, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"], "field": "entry.date"}],
    "The first answer (2015) is corrected in the narrative and explained (his brother's year); the corrected date agrees with the form. A resolved discrepancy, not a conflict.",
    snf=["crossed the border in 2015"], mods=["Correction control."])

case("DN06", "Control for DG05/DG06: every element stated in paraphrased wording", "negative", f"""
ENCOUNTER:
On January 9, 2024, at approximately 0450 hours, Agents {R} and {R} were watching the shoreline of the St. Clair River near Marine City, Michigan, when they saw a man come ashore from a small inflatable boat. The agents identified themselves and asked him where he was a citizen.
The man, the subject of this report, stated that he is a national of Mexico and carried no papers of any kind. He stated that he had been living in Canada and that, minutes earlier, he had paddled across the river from Ontario to avoid the port of entry at the Blue Water Bridge.
TRAVEL:
He stated that he intended to take a bus to Chicago.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
He was issued a Notice to Appear (Form I-862) and released on his own recognizance (Form I-220A).
""", facts(**{"entry.date": "01/09/2024 0440", "entry.place": "near Marine City, MI", "entry.manner": "EWI BOAT", "encounter.date_time": "01/09/2024 0450", "encounter.location": "MARINE CITY, MI", "encounter.method": "LP", "form.disposition": "NTA/OREC"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noMissing", "elements": ["E1", "E2", "E3", "N1", "N5", "N7"]}, {"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "Paraphrases: manner ('paddled across the river … to avoid the port of entry'), place (St. Clair River near Marine City), date (minutes before the 0450 encounter on January 9, 2024), documents ('no papers of any kind'), disposition (NTA, I-220A). Nothing is missing.",
    mods=["Paraphrase control (complete case)."])

# ---------------------------------------------------------------- genuinely unresolved (4)
case("DU01", "Two redacted people give different entry years; nothing ties either to the subject", "unresolved", f"""
ENCOUNTER:
On May 2, 2024, at approximately 1910 hours, Agents {R} and {R} encountered two men walking along the railroad tracks near Jackson, Michigan. The agents identified themselves and questioned both men in Spanish. Both men stated that they are citizens of Mexico and that they have no immigration documents. Neither man carried identification.
ENTRY:
{R} stated that he entered the United States in 2010 by crossing the river near Laredo, Texas. {R} stated that he entered in 2018, also near Laredo.
TRAVEL:
Both men stated that they had travelled from Texas to Michigan for farm work.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
Both men were processed for Notices to Appear.
""", facts(**{"entry.date": "2018", "entry.place": "near Laredo, TX", "encounter.date_time": "05/02/2024 1910", "encounter.location": "JACKSON, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "human_review", "reason": "ambiguity", "anchors": ["in 2010 by crossing"]}],
    [{"kind": "route", "anchor": "in 2010 by crossing"}, {"kind": "noContradiction", "anchor": "in 2010 by crossing"}],
    "Two men, both names redacted, both 'stated that he entered'. Nothing ties the 2010 statement or the 2018 statement to this record's subject (matching the form's year is value matching, excluded). A person must decide; no contradiction should be asserted.",
    mods=["Unattributable entry years in a two-person narrative."])

case("DU02", "Relayed statement: 'he was deported' may be about the cousin or the subject", "unresolved", f"""
ENCOUNTER:
On March 21, 2024, at approximately 1730 hours, Agent {R} responded to a request for assistance from the Battle Creek Police Department regarding two men involved in a minor dispute at an apartment complex. The subject stated that he is a citizen of Honduras and that he has no documents to be in the United States. He presented a Honduran identity card.
The subject's cousin, {R}, who lives in the same apartment and is a lawful permanent resident, told Agent {R} that he was deported to Honduras in 2014 and came back the following year.
Fingerprint checks of the subject returned no prior immigration history.
ENTRY:
The subject stated that he entered without inspection near Hidalgo, Texas, in 2016.
TRAVEL:
He travelled to Michigan by bus.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was processed for a Notice to Appear.
""", facts(**{"subject.citizenship": "HONDURAS", "entry.date": "2016", "entry.place": "near Hidalgo, TX", "encounter.date_time": "03/21/2024 1730", "encounter.location": "BATTLE CREEK, MI", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "human_review", "reason": "ambiguity", "anchors": ["he was deported to Honduras in 2014"]}],
    [{"kind": "route", "anchor": "he was deported to Honduras in 2014"}, {"kind": "noContradiction", "anchor": "he was deported to Honduras in 2014"}],
    "'he was deported' in the cousin's statement has two possible referents (the cousin himself, or the subject). The cousin is a permanent resident, which makes a deportation of the cousin less likely but does not settle it; the subject's own check is negative. Whose removal it was is unresolved: route, do not assert a history conflict.",
    mods=["Relayed removal statement with an ambiguous referent."])

case("DU03", "Reentry charge; removal order issued but execution not documented", "unresolved", f"""
ENCOUNTER:
On April 25, 2024, at approximately 0610 hours, Agents {R} and {R} encountered the subject at a residence in Holland, Michigan, while serving an administrative warrant for another person. The subject stated that he is a citizen of Guatemala and that he has no immigration documents. He presented a Guatemalan passport.
IMMIGRATION HISTORY:
Records show that the subject was apprehended near McAllen, Texas, on 03/02/2016 and released on a Notice to Appear. Records show that an immigration judge in Chicago, Illinois, ordered the subject removed in absentia on 09/12/2016. The records reviewed do not show whether the order was executed or whether the subject departed the United States.
ENTRY:
The subject stated that he has lived in the United States continuously since he crossed near McAllen in 2016.
REMOVABILITY:
The subject is charged under 8 U.S.C. 1326 as an alien found in the United States after removal.
DISPOSITION:
The subject was transported to the {E} Station; the case was referred to a supervisor for review of the prior order.
""", facts(**{"subject.citizenship": "GUATEMALA", "entry.date": "03/2016", "entry.place": "near McAllen, TX", "encounter.date_time": "04/25/2024 0610", "encounter.location": "HOLLAND, MI", "encounter.method": "OA", "history.immigration_record": "POSITIVE - See Narrative", "form.disposition": "Referred for review"}),
    ["8 U.S.C. 1326"],
    [],
    [{"kind": "citationIn", "status": ["needs_human_review", "insufficient_information"]}, {"kind": "routed"}],
    "8 U.S.C. 1326 requires a prior removal. An in-absentia removal ORDER is documented, but the records do not show that it was executed or that the subject departed; the subject says he has stayed since 2016 (which suggests, but does not establish, that he was not removed). Neither supported nor contradicted: a person must review; no mismatch should be asserted, and no 'consistent'.",
    mods=["Removal order without documented execution, under a reentry charge."])

case("DU04", "The subject gives two accounts of how he entered; the form records the manner as unknown", "unresolved", f"""
ENCOUNTER:
On August 30, 2024, at approximately 2040 hours, Agent {R} encountered the subject at a roadside fruit stand near Benton Harbor, Michigan, during a worksite follow-up. Agent {R} identified himself and questioned the subject.
The subject stated that he is a citizen of Mexico and that his border crossing card expired in 2018. He stated that he entered the United States through the Hidalgo port of entry with his border crossing card in July 2019 and was allowed in.
At the station, during processing, the subject stated that he crossed the river illegally near Hidalgo in July 2019 because his card had already expired. He did not explain why his two accounts differ.
TRAVEL:
He travelled to Michigan by car with relatives.
REMOVABILITY:
{GROUND_6A}
DISPOSITION:
The subject was processed for a Notice to Appear.
""", facts(**{"entry.date": "07/2019", "entry.place": "near Hidalgo, TX", "entry.manner": "UNKNOWN", "encounter.date_time": "08/30/2024 2040", "encounter.location": "BENTON HARBOR, MI", "encounter.method": "OA"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "human_review", "reason": "ambiguity", "anchors": ["through the Hidalgo port of entry with his border crossing card"]}],
    [{"kind": "route", "anchor": "through the Hidalgo port of entry"}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "The same subject gives two incompatible accounts of the same entry (July 2019: admitted with a card vs crossed the river illegally), without explanation; the form records the manner as UNKNOWN. Which account is true, and therefore whether the charge's requirement is met, is for a person. A finding that the accounts conflict is correct; asserting either manner, or a citation mismatch, is not.",
    mods=["Two unexplained accounts of the manner of the same entry; form manner UNKNOWN."])

# ---------------------------------------------------------------- write
os.makedirs(f"{HERE}/cases", exist_ok=True); os.makedirs(f"{HERE}/expected", exist_ok=True)
checks = {}
for c in CASES:
    rec = {"id": c["cid"], "title": c["title"], "kind": "synthetic", "split": "diag-1", "context": c["context"],
           "provenance": {"source": "Team-authored development case (diag-1), 2026-11-04. Not independent validation.",
                          "extraction": "Written directly as text; not taken from any document.",
                          "verification": "Synthetic; expected answers checked by the team against config/references.json before any engine run.",
                          "replacements": [], "textOrigin": "synthetic-test", "modifications": c["mods"]},
           "narrative": {"text": c["text"]}, "facts": c["facts"],
           "selectedCharges": [{"citation": x, "source": "team-assigned-for-testing", "note": "Development case."} for x in c["charges"]]}
    json.dump(rec, open(f"{HERE}/cases/{c['cid']}.json", "w"), indent=2)
    exp = {"id": c["cid"], "base": c["cid"], "split": "diag-1", "datasetVersion": "diag-1", "description": c["title"],
           "plants": c["plants"], "shouldNotFlag": c["snf"], "labelNotes": c["notes"]}
    json.dump(exp, open(f"{HERE}/expected/{c['cid']}.json", "w"), indent=2)
    checks[c["cid"]] = {"category": c["cat"], "checks": c["checks"]}
json.dump(checks, open(f"{HERE}/checks.json", "w"), indent=2)
print(len(CASES), "cases;", {k: sum(1 for c in CASES if c["cat"] == k) for k in ("established", "negative", "unresolved")})
