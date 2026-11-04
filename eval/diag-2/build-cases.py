# Builds the diag-2 cases, expected answers and locked checks: 30 TEAM-AUTHORED fresh development cases (NOT independent
# or unbiased validation). Written on 2026-11-04, before any engine output on these cases existed. Expected answers are
# set from the source text and config/references.json, not from what the engine currently recognises.
#   python3 -I eval/diag-2/build-cases.py
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
        "encounter.method": ("Method of location/apprehension", "OA", "present"),
        "history.immigration_record": ("Immigration record", "NEGATIVE", "present"),
        "history.criminal_record": ("Criminal record", "None Known", "present"),
        "form.disposition": ("Disposition", "Warrant of Arrest/Notice to Appear", "present"),
    }
    out = []
    for path, (label, value, status) in base.items():
        if path in over:
            v = over[path]
            if v is None: status, value = "absent", ""
            else: value, status = v, "present"
        out.append({"path": path, "label": label, "value": value, "status": status})
    return out

CASES = []
def case(cid, title, cat, text, fx, charges, plants, checks, notes, context=("interior",), snf=()):
    CASES.append(dict(cid=cid, title=title, cat=cat, text=text.strip() + "\n", facts=fx, charges=charges, plants=plants,
                      checks=checks, notes=notes, context=list(context), snf=list(snf)))

G6A = "The subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act, in that he is an alien present in the United States without being admitted or paroled."
G237 = "The subject is removable under Section 237(a)(1)(B) of the Immigration and Nationality Act, in that after admission as a nonimmigrant he remained in the United States for a time longer than permitted."
G1326 = "The subject is being presented for prosecution under 8 U.S.C. 1326 as an alien found in the United States after removal."

# ================================================================ established issues (12)
case("EG01", "Narrative: admitted with a visa at a port; form manner EWI AFOOT (category conflict)", "established", f"""
ENCOUNTER:
On June 11, 2024, at approximately 0930 hours, Border Patrol Agent {R} encountered the subject at a residential construction site in Grand Rapids, Michigan, while following up on information received from the site's general contractor. Agent {R} identified himself and asked the subject about his citizenship and immigration status.
The subject stated that he is a citizen and national of Mexico and handed the agent a Mexican passport.
ENTRY:
The subject stated that on 08/22/2018 he presented his passport and a B1/B2 visa at the Laredo, Texas, port of entry and was admitted as a visitor for pleasure for six months. He stated that he never left after his authorized stay ran out in February 2019 because he found steady work.
TRAVEL:
He took a bus from Laredo to San Antonio and later moved to Michigan with a cousin.
REMOVABILITY:
{G237}
DISPOSITION:
The subject was transported to the {E} Station and processed for a Notice to Appear.
""", facts(**{"entry.date": "08/22/2018", "entry.place": "LAREDO, TX", "entry.manner": "EWI AFOOT", "encounter.date_time": "06/11/2024 0930", "encounter.location": "GRAND RAPIDS, MI"}),
    ["INA 237(a)(1)(B)"],
    [{"type": "inconsistency", "anchors": ["presented his passport and a B1/B2 visa at the Laredo, Texas, port of entry"], "fieldPaths": ["entry.manner"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "presented his passport and a B1/B2 visa at the Laredo, Texas, port of entry", "field": "entry.manner"},
     {"kind": "citationNot", "status": "likely_mismatch"}],
    "The subject's own account of his last entry is an inspection and admission with a visa; the form codes the manner as EWI AFOOT (entered without inspection, on foot). These are incompatible inspection categories for the same entry. The selected charge (237(a)(1)(B)) depends on an admission, which the narrative states, so the charge itself is not contradicted by the narrative.")

case("EG02", "Narrative: carried across a bridge hidden in a tractor-trailer; form manner AFOOT (mode conflict)", "established", f"""
ENCOUNTER:
On February 27, 2024, Agents {R} and {R} assisted the Kent County Sheriff's Office with a traffic stop on US-131 near Wyoming, Michigan. The driver did not have a license, and the deputy asked for Border Patrol assistance with identification.
Agent {R} interviewed the subject in Spanish. The subject stated that he is a citizen of Mexico and that he has no documents that allow him to be in the United States.
ENTRY:
The subject stated that in November 2020 he paid a smuggler in Reynosa, who hid him and four other people inside the trailer of a tractor-trailer that was driven across the Pharr International Bridge without the trailer being opened or inspected. He was let out at a warehouse in Pharr, Texas, later that night.
REMOVABILITY:
{G6A}
DISPOSITION:
Warrant of Arrest and Notice to Appear.
""", facts(**{"entry.date": "11/2020", "entry.place": "PHARR, TX", "entry.manner": "EWI AFOOT", "encounter.date_time": "02/27/2024 1410", "encounter.location": "WYOMING, MI", "encounter.method": "PB"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["hid him and four other people inside the trailer of a tractor-trailer"], "fieldPaths": ["entry.manner"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "hid him and four other people inside the trailer of a tractor-trailer", "field": "entry.manner"}],
    "Both the narrative and the form say the subject was not inspected, so the inspection category agrees and the charge is supported. The mode does not: the form says AFOOT (on foot), the narrative says he was carried across hidden in a vehicle. A documentation conflict in the manner code that a person should correct.")

case("EG03", "Completed removal on a removal flight (paraphrase) while the record is NEGATIVE", "established", f"""
ENCOUNTER:
On May 2, 2024, at approximately 0715 hours, Agent {R} responded to the Monroe County Jail in Monroe, Michigan, after the jail reported that a person booked overnight for operating a vehicle while intoxicated had given a foreign birth certificate as identification.
The subject stated that he is a citizen of Honduras. He stated that he has no immigration documents.
CRIMINAL AND IMMIGRATION HISTORY:
The subject was booked on 05/01/2024 for operating while intoxicated; the case is pending in Monroe County.
Fingerprint results show that the subject was ordered removed by an immigration judge in Houston, Texas, on 01/15/2019 and was flown to San Pedro Sula, Honduras, on a removal flight on 03/07/2019.
ENTRY:
The subject stated that he came back into the United States by walking across the border near Eagle Pass, Texas, in August 2020.
REMOVABILITY:
{G6A}
DISPOSITION:
An immigration detainer was lodged with the Monroe County Jail.
""", facts(**{"subject.citizenship": "HONDURAS", "entry.date": "08/2020", "entry.place": "near Eagle Pass, TX", "encounter.date_time": "05/02/2024 0715", "encounter.location": "MONROE, MI", "history.immigration_record": "NEGATIVE", "history.criminal_record": "OWI pending (Monroe County)", "form.disposition": "Detainer lodged"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["was flown to San Pedro Sula, Honduras, on a removal flight on 03/07/2019"], "fieldPaths": ["history.immigration_record"]}],
    [{"kind": "finding", "category": ["inconsistency", "unclear"], "anchor": "was flown to San Pedro Sula, Honduras, on a removal flight on 03/07/2019", "field": "history.immigration_record"}],
    "The fingerprint results attribute to the subject an order of removal and its execution (flown to Honduras on a removal flight): a completed removal. The form records the immigration record as NEGATIVE. The same subject's history conflicts with the form.")

case("EG04", "Prior Border Patrol apprehension and voluntary return while the record is NEGATIVE", "established", f"""
On October 8, 2024, at approximately 1645 hours, Agent {R} encountered the subject at a gas station in Adrian, Michigan, after the subject approached the marked patrol vehicle to ask for directions to a nearby farm. Agent {R} identified himself and asked the subject where he was from. The subject stated that he is a citizen of Mexico and admitted that he had no papers to be in the United States.
The subject said that this is not his first time in the United States. In 2014 he was caught by Border Patrol agents shortly after crossing near Eagle Pass, Texas, and was voluntarily returned to Piedras Negras the same day.
He stated that he crossed again on foot near Eagle Pass on 03/18/2015 and has worked on farms in Ohio and Michigan since then.
{G6A}
The subject was processed for a Warrant of Arrest and Notice to Appear.
""", facts(**{"entry.date": "03/18/2015", "entry.place": "near Eagle Pass, TX", "encounter.date_time": "10/08/2024 1645", "encounter.location": "ADRIAN, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["was voluntarily returned to Piedras Negras the same day"], "fieldPaths": ["history.immigration_record"]}],
    [{"kind": "finding", "category": ["inconsistency", "unclear"], "anchor": "was voluntarily returned to Piedras Negras the same day", "field": "history.immigration_record"}],
    "The subject describes his own prior apprehension by Border Patrol and voluntary return in 2014. That is prior immigration history; the form's record is NEGATIVE. Not a removal, so an 'unclear' item for a person to confirm is an acceptable form of the finding; a contradiction finding is also acceptable.")

case("EG05", "Pronoun-linked entry year (spring of 2021) differs from the form (2018)", "established", f"""
ENCOUNTER:
On July 19, 2024, at approximately 2210 hours, Agents {R} and {R} encountered the subject walking along the shoulder of Interstate 75 near Erie, Michigan, after a motorist reported a pedestrian on the highway. The agents stopped to check on his welfare.
The subject told agents that he is from Ecuador and does not have permission to be in the United States. He showed them an Ecuadorian national identity card.
ENTRY:
He said that he made the journey north through Mexico by bus and that he got across the river near Del Rio, Texas, in the spring of 2021, walking at night with a small group.
He said he worked in Texas and Tennessee before coming to Michigan last month.
REMOVABILITY:
{G6A}
DISPOSITION:
The subject was processed for a Notice to Appear and released on his own recognizance.
""", facts(**{"subject.citizenship": "ECUADOR", "entry.date": "04/2018", "entry.place": "near Del Rio, TX", "encounter.date_time": "07/19/2024 2210", "encounter.location": "ERIE, MI", "encounter.method": "PB", "form.disposition": "Notice to Appear/OREC"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["in the spring of 2021"], "fieldPaths": ["entry.date"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "in the spring of 2021", "field": "entry.date"}],
    "Only one person is described; 'He said' continues the subject's account. He places his entry in spring 2021; the form records 04/2018. A year conflict for the same entry.")

case("EG06", "Designated subject among three occupants gives a different entry year from the form", "established", f"""
ENCOUNTER:
On September 3, 2024, at approximately 0550 hours, Agent {R} conducted an immigration inspection of a gray minivan at the request of the Michigan State Police following a traffic stop near Marshall, Michigan. Three men were in the vehicle.
{R}, the driver and the subject of this record, stated that he is a citizen of Mexico without documents and that he entered the United States illegally near Sasabe, Arizona, in October 2016.
The front passenger, {R}, stated that he crossed in 2013, and the rear passenger, {R}, stated that he crossed in 2019. Both passengers are documented on separate records.
REMOVABILITY:
{G6A}
DISPOSITION:
All three men were transported to the {E} Station and processed for Notices to Appear.
""", facts(**{"entry.date": "10/2013", "entry.place": "near Sasabe, AZ", "encounter.date_time": "09/03/2024 0550", "encounter.location": "MARSHALL, MI", "encounter.method": "PB"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["near Sasabe, Arizona, in October 2016"], "fieldPaths": ["entry.date"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "near Sasabe, Arizona, in October 2016", "field": "entry.date"}],
    "The driver is designated as this record's subject and states October 2016; the form records 10/2013. The front passenger's 2013 matches the form's year but is another person's entry and must not be used to explain the conflict away.")

case("EG07", "Entry place (west of Columbus, New Mexico) differs from the form (near Nogales, AZ)", "established", f"""
ENCOUNTER:
On January 16, 2024, Agent {R} encountered the subject at a bus station in Kalamazoo, Michigan. The subject stated that he is a citizen of Mexico and that he has no immigration documents.
ENTRY:
The subject stated that he crossed on foot through the desert west of Columbus, New Mexico, on or about 09/03/2022, and was picked up by a driver on a ranch road the next morning.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "09/03/2022", "entry.place": "near Nogales, AZ", "encounter.date_time": "01/16/2024 1120", "encounter.location": "KALAMAZOO, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["west of Columbus, New Mexico"], "fieldPaths": ["entry.place"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "west of Columbus, New Mexico", "field": "entry.place"}],
    "Short narrative, one person. The subject places his entry west of Columbus, New Mexico; the form records near Nogales, Arizona (different state and sector). The date and manner agree.")

case("EG08", "8 U.S.C. 1326: the removal order was explicitly never executed and records show no removal", "established", f"""
ENCOUNTER:
On March 21, 2024, at approximately 1000 hours, Deportation Officer {R} and Border Patrol Agent {R} encountered the subject at his scheduled check-in at the ICE office in Detroit, Michigan.
IMMIGRATION HISTORY:
The subject first entered the United States without inspection near Roma, Texas, in May 2014 and was apprehended there the next day.
On 06/20/2015 an immigration judge in San Antonio, Texas, ordered the subject removed. The order was never executed: the subject was released on an order of supervision the same month, and ICE records show that he has reported for every scheduled check-in since then and has never departed the United States.
A records check revealed no removal, deportation or exclusion of the subject. Asked directly, the subject stated that he has never been deported or sent back to Mexico.
REMOVABILITY:
{G1326}
DISPOSITION:
The case was presented to the U.S. Attorney's Office for review.
""", facts(**{"entry.date": "05/2014", "entry.place": "near Roma, TX", "encounter.date_time": "03/21/2024 1000", "encounter.location": "DETROIT, MI", "history.immigration_record": "POSITIVE - See Narrative", "form.disposition": "Presented for prosecution"}),
    ["8 U.S.C. 1326"],
    [{"type": "citation"}],
    [{"kind": "citation", "status": "likely_mismatch"}],
    "8 U.S.C. 1326 requires a prior removal, deportation or denial of admission. The record explicitly states that the subject's removal order was never executed, that he has never departed, that record checks show no removal, deportation or exclusion, and the subject denies any. The requirement is contradicted for this subject: an established citation mismatch. (An ORDER is not a removal; here its non-execution is stated, not merely undocumented.)")

case("EG09", "INA 212(a)(6)(A)(i) selected, but the last entry was an admission with a B1/B2 visa (earlier EWI entry in the history)", "established", f"""
ENCOUNTER:
On August 14, 2024, Agents {R} and {R} encountered the subject during a consensual interview at a restaurant in Ann Arbor, Michigan, where the owner had reported an employee using another person's Social Security number.
The subject stated that he is a citizen of Mexico and presented a Mexican passport issued in 2018.
ENTRY:
The subject stated that he first entered the United States illegally near Calexico, California, in 2005 and lived in Fresno until he went back to Mexico in 2012.
On 07/09/2019 he flew from Guadalajara to Houston, presented his passport and a valid B1/B2 visa, and was admitted as a visitor until 01/08/2020. He has not left the United States since that entry.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "07/09/2019", "entry.place": "HOUSTON, TX", "entry.manner": "B2", "encounter.date_time": "08/14/2024 1300", "encounter.location": "ANN ARBOR, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "citation"}],
    [{"kind": "citation", "status": "likely_mismatch"}],
    "212(a)(6)(A)(i) requires presence without admission or parole. The subject's last entry (2019) was an admission with a B1/B2 visa, which the form also records (B2). The 2005 entry without inspection was an earlier entry, followed by departure in 2012, so it does not support the charge. Citation mismatch.")

case("EG10", "INA 237(a)(1)(B) selected, but the subject was never inspected or admitted", "established", f"""
ENCOUNTER:
On April 30, 2024, at approximately 1340 hours, Agent {R} encountered the subject at a landscaping company yard in Novi, Michigan, during a worksite inquiry. The subject stated that he is a citizen of Mexico.
ENTRY:
The subject stated that he has never been inspected or admitted at any port of entry. He waded across the Rio Grande near Brownsville, Texas, in August 2017 and has lived in Houston and Michigan since then.
REMOVABILITY:
{G237}
DISPOSITION:
The subject was processed for a Notice to Appear.
""", facts(**{"entry.date": "08/2017", "entry.place": "near Brownsville, TX", "entry.manner": "EWI", "encounter.date_time": "04/30/2024 1340", "encounter.location": "NOVI, MI"}),
    ["INA 237(a)(1)(B)"],
    [{"type": "citation"}],
    [{"kind": "citation", "status": "likely_mismatch"}],
    "237(a)(1)(B) applies to a person admitted who remained longer than permitted. The subject explicitly was never inspected or admitted, and the form says EWI. Citation mismatch.")

case("EG11", "Manner of entry not stated anywhere (narrative or form)", "established", f"""
ENCOUNTER:
On November 6, 2024, at approximately 0820 hours, Agent {R} encountered the subject at the Greyhound station in Battle Creek, Michigan. The subject stated that he is a citizen of Guatemala and that he has no documents allowing him to be in the United States. He showed a Guatemalan identity document (DPI).
ENTRY:
The subject stated that he arrived in the United States near El Paso, Texas, in May 2019, and that he stayed with an aunt in El Paso for several months before moving north.
REMOVABILITY:
{G6A}
DISPOSITION:
The subject was processed for a Notice to Appear.
""", facts(**{"subject.citizenship": "GUATEMALA", "entry.date": "05/2019", "entry.place": "near El Paso, TX", "entry.manner": None, "encounter.date_time": "11/06/2024 0820", "encounter.location": "BATTLE CREEK, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "missing_element", "elementId": "E3"}],
    [{"kind": "missing", "element": "E3"}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "'Arrived … near El Paso' gives a place and date but not how he entered (inspected or not, by what means); the form's manner field is empty. E3 is missing. Absence is not contradiction: no citation mismatch.")

case("EG12", "No disposition or documenting form stated", "established", f"""
ENCOUNTER:
On December 2, 2024, at approximately 1530 hours, Agents {R} and {R} encountered the subject at a residence in Saginaw, Michigan, while attempting to locate a different person. The subject answered the door and agreed to speak with the agents.
The subject stated that he is a citizen of Mexico and showed a Mexican consular identification card. He stated that he has no immigration documents.
ENTRY:
He stated that he crossed the border illegally on foot near Sasabe, Arizona, on 02/14/2017 with a group of five, walked for two nights, and was driven to Phoenix.
TRAVEL:
From Phoenix he took a series of buses to Chicago and then to Saginaw.
REMOVABILITY:
{G6A}
""", facts(**{"entry.date": "02/14/2017", "entry.place": "near Sasabe, AZ", "encounter.date_time": "12/02/2024 1530", "encounter.location": "SAGINAW, MI", "form.disposition": None}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "missing_element", "elementId": "N7"}],
    [{"kind": "missing", "element": "N7"}],
    "The narrative ends at the removability ground; it never states what action was taken or the documenting form, and the form's disposition field is empty. N7 is missing.")

# ================================================================ negative controls (10)
case("NC01", "Smuggler (coyote) assistance with a crossing on foot; form EWI AFOOT", "negative", f"""
ENCOUNTER:
On March 9, 2024, at approximately 1930 hours, Agent {R} encountered the subject at a laundromat in Holland, Michigan, after a citizen reported a person who appeared lost and distressed. The subject stated that he is a citizen of Mexico and that he has no papers to be in the United States.
ENTRY:
The subject stated that he paid a coyote in Ciudad Juarez the equivalent of four thousand dollars. The coyote led him and six others on foot across the border west of the Santa Teresa port of entry at about 0200 hours on 12/02/2022, avoiding any inspection, and a second smuggler drove the group to a stash house in El Paso.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "12/02/2022", "entry.place": "near Santa Teresa, NM", "entry.manner": "EWI AFOOT", "encounter.date_time": "03/09/2024 1930", "encounter.location": "HOLLAND, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"], "field": "entry.manner"}, {"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "Smuggler help, payment and a later vehicle ride after the crossing are compatible with an entry on foot without inspection. Date, place and manner agree with the form.",
    snf=["led him and six others on foot across the border"])

case("NC02", "B2 admission and overstay with a NEGATIVE immigration record (237(a)(1)(B))", "negative", f"""
ENCOUNTER:
On May 22, 2024, at approximately 1100 hours, Agent {R} encountered the subject at a hotel in Dearborn, Michigan, where he works as a housekeeper, during an inquiry about unauthorized employment. The subject stated that he is a citizen of Jordan and presented a Jordanian passport containing a B1/B2 visa.
ENTRY:
The subject was admitted at Chicago O'Hare International Airport on 03/14/2017 as a B2 visitor authorized to remain until 09/13/2017. He did not depart.
IMMIGRATION HISTORY:
Records confirm the admission and show no other immigration history.
REMOVABILITY:
{G237}
DISPOSITION:
The subject was processed for a Notice to Appear.
""", facts(**{"subject.citizenship": "JORDAN", "entry.date": "03/14/2017", "entry.place": "CHICAGO, IL", "entry.manner": "B2", "encounter.date_time": "05/22/2024 1100", "encounter.location": "DEARBORN, MI"}),
    ["INA 237(a)(1)(B)"], [],
    [{"kind": "noFinding", "category": ["inconsistency", "unclear"], "field": "history.immigration_record"}, {"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "A lawful admission and an overstay are not prior immigration history in the sense of the NEGATIVE record (no prior removals, orders or immigration arrests); the records explicitly show no other history. Everything agrees with the form and the charge.",
    snf=["was admitted at Chicago O'Hare International Airport on 03/14/2017"])

case("NC03", "8 U.S.C. 1326 with a removal order that was explicitly executed", "negative", f"""
ENCOUNTER:
On July 2, 2024, at approximately 0600 hours, Agents {R} and {R} encountered the subject at his residence in Pontiac, Michigan, while executing an administrative warrant issued for him after fingerprint records matched a prior removal.
The subject stated that he is a citizen of Mexico and that he has no documents to be in the United States.
IMMIGRATION HISTORY:
An immigration judge in Atlanta, Georgia, ordered the subject removed on 08/30/2012, and the order was carried out on 10/04/2012, when officers escorted him across the international bridge at Laredo, Texas, into Nuevo Laredo.
ENTRY:
The subject stated that he reentered the United States illegally, wading across the river near Laredo, in June 2016, and that he never applied for permission to return.
REMOVABILITY:
{G1326}
DISPOSITION:
The subject was transported to the {E} Station and the case was accepted for prosecution.
""", facts(**{"entry.date": "06/2016", "entry.place": "near Laredo, TX", "encounter.date_time": "07/02/2024 0600", "encounter.location": "PONTIAC, MI", "history.immigration_record": "POSITIVE - removed 10/04/2012", "form.disposition": "Accepted for prosecution"}),
    ["8 U.S.C. 1326"], [],
    [{"kind": "citation", "status": "consistent"}, {"kind": "noFinding", "category": ["inconsistency"]}],
    "The order was explicitly carried out (the subject was escorted across the bridge into Mexico): a completed removal, which is what 8 U.S.C. 1326 requires, and the form's record says removed 10/04/2012. The charge is supported; nothing conflicts.")

case("NC04", "Identity documents stated in paraphrase (voter card with photograph; birth certificate)", "negative", f"""
ENCOUNTER:
On April 12, 2024, at approximately 1215 hours, Agent {R} was asked by the Ottawa County Sheriff's Office to help identify a passenger in a vehicle stopped near Zeeland, Michigan. The passenger, the subject, stated that he is a citizen of Mexico.
He handed the agent a Mexican voter identification card (INE) bearing his name and photograph, along with a copy of his birth certificate from Puebla. He stated that he has no visa or other papers allowing him to be in the United States.
ENTRY:
He stated that he crossed the border illegally on foot near Douglas, Arizona, on 01/20/2021.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "01/20/2021", "entry.place": "near Douglas, AZ", "encounter.date_time": "04/12/2024 1215", "encounter.location": "ZEELAND, MI", "encounter.method": "PB"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noElementFlag", "elements": ["N1"]}, {"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "The identifying documents are stated: a Mexican voter identification card with name and photograph, and a birth certificate. N1 is satisfied in paraphrase; the absence of status documents is a separate point (E6).")

case("NC05", "8 U.S.C. 1326 with a statute citation inside a sentence and a completed removal", "negative", f"""
ENCOUNTER:
On September 17, 2024, at approximately 0905 hours, Agent {R} encountered the subject at the Saint Clair County Jail in Port Huron, Michigan, following his arrest by local police for driving without a license.
The subject stated that he is a citizen of Mexico and presented a Mexican consular identification card.
IMMIGRATION HISTORY:
Records show that he was removed to Mexico through Laredo, Texas, on 02/11/2019 after a final order of removal.
ENTRY:
The subject stated that he walked across the border illegally near Laredo in April 2020.
REMOVABILITY:
The subject is being presented for prosecution under 8 U.S.C. 1326 because he was found in the United States after his removal on 02/11/2019 without having obtained the consent of the Secretary of Homeland Security to reapply for admission.
DISPOSITION:
The case was accepted for prosecution by the U.S. Attorney's Office.
""", facts(**{"entry.date": "04/2020", "entry.place": "near Laredo, TX", "encounter.date_time": "09/17/2024 0905", "encounter.location": "PORT HURON, MI", "history.immigration_record": "POSITIVE - removed 02/11/2019", "history.criminal_record": "Driving without a license (pending)", "form.disposition": "Accepted for prosecution"}),
    ["8 U.S.C. 1326"], [],
    [{"kind": "noElementFlag", "elements": ["N5"]}, {"kind": "citation", "status": "consistent"}, {"kind": "noFinding", "category": ["inconsistency"]}],
    "The ground is stated and explained in one sentence that contains a statute citation (8 U.S.C. 1326): found in the United States after removal, without consent to reapply. The completed removal on 02/11/2019 supports the charge and matches the form.")

case("NC06", "An entry year corrected and explained in the narrative", "negative", f"""
ENCOUNTER:
On June 25, 2024, Agent {R} encountered the subject at a farm in Hart, Michigan, during a follow-up on an earlier encounter with his employer. The subject stated that he is a citizen of Mexico and that he has no documents. He showed a Mexican birth certificate and a voter identification card.
ENTRY:
When first asked, the subject said that he came to the United States in 2017. A moment later he corrected himself, explaining that 2017 was when his brother arrived, and stated that he himself crossed the river illegally near McAllen, Texas, in March 2015.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "03/2015", "entry.place": "near McAllen, TX", "encounter.date_time": "06/25/2024 1010", "encounter.location": "HART, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"], "field": "entry.date"}, {"kind": "noFinding", "category": ["inconsistency"]}],
    "The 2017 answer was withdrawn and explained (it was his brother's arrival); his own entry is March 2015, as on the form. No conflict.",
    snf=["came to the United States in 2017"])

case("NC07", "Current removal proceedings (Notice to Appear) with a NEGATIVE record", "negative", f"""
ENCOUNTER:
On August 6, 2024, at approximately 1400 hours, Agent {R} encountered the subject at a car wash in Lansing, Michigan. The subject stated that he is a citizen of El Salvador and presented a Salvadoran passport. He has no visa or other immigration document.
ENTRY:
The subject stated that he crossed the Rio Grande without inspection near Hidalgo, Texas, on 10/10/2021.
REMOVABILITY:
{G6A}
DISPOSITION:
The subject was served with a Notice to Appear and placed in removal proceedings under Section 240 of the Immigration and Nationality Act. A master calendar hearing will be scheduled by the Detroit Immigration Court.
""", facts(**{"subject.citizenship": "EL SALVADOR", "entry.date": "10/10/2021", "entry.place": "near Hidalgo, TX", "encounter.date_time": "08/06/2024 1400", "encounter.location": "LANSING, MI", "form.disposition": "Notice to Appear"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency", "unclear"], "field": "history.immigration_record"}, {"kind": "noFinding", "category": ["inconsistency"]}],
    "The Notice to Appear and removal proceedings are the current disposition, not prior immigration history; the NEGATIVE record is not contradicted.")

case("NC08", "Entry into Mexico months before the U.S. entry (Ciudad Hidalgo, Chiapas vs Hidalgo, Texas)", "negative", f"""
ENCOUNTER:
On February 13, 2024, at approximately 0745 hours, Agents {R} and {R} encountered the subject at a bus stop in Ypsilanti, Michigan. The subject stated that he is a citizen of Guatemala and showed a Guatemalan passport. He has no permission to be in the United States.
TRAVEL AND ENTRY:
The subject stated that he left Huehuetenango in early January 2019 and entered Mexico without documents at Ciudad Hidalgo, Chiapas, on 01/10/2019. He worked in Monterrey for several months to pay for the rest of the trip.
He crossed the Rio Grande into the United States on foot near Hidalgo, Texas, on 06/02/2019 without being inspected, and travelled to Michigan by bus a year later.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"subject.citizenship": "GUATEMALA", "entry.date": "06/02/2019", "entry.place": "near Hidalgo, TX", "encounter.date_time": "02/13/2024 0745", "encounter.location": "YPSILANTI, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"], "field": "entry.date"}, {"kind": "noFinding", "category": ["inconsistency"], "field": "entry.place"}, {"kind": "noFinding", "category": ["inconsistency"], "field": "entry.manner"}],
    "The January 2019 entry is into Mexico; the U.S. entry is 06/02/2019 near Hidalgo, Texas, on foot without inspection, as on the form.",
    snf=["entered Mexico without documents at Ciudad Hidalgo, Chiapas, on 01/10/2019"])

case("NC09", "Same manner in different words (through a gap in the fence, no checkpoint) vs PWA (AFOOT)", "negative", f"""
ENCOUNTER:
On October 29, 2024, Agent {R} encountered the subject at a strawberry farm near Watervliet, Michigan, during a worksite visit. The subject stated that he is a citizen of Mexico and presented a Mexican consular identification card.
ENTRY:
The subject stated that late on 07/04/2020 he climbed through a gap in the border fence east of the San Luis port of entry and walked north for several hours without going through any checkpoint.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "07/04/2020", "entry.place": "near San Luis, AZ", "entry.manner": "PWA (AFOOT)", "encounter.date_time": "10/29/2024 1015", "encounter.location": "WATERVLIET, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"], "field": "entry.manner"}, {"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "Climbing through a fence gap and walking north without any checkpoint is entry on foot without inspection, as the form's PWA (AFOOT) says.")

case("NC10", "A complete, longer case with every core element stated", "negative", f"""
ENCOUNTER:
On March 28, 2024, at approximately 0640 hours, Border Patrol Agents {R} and {R} were conducting traffic observation on Interstate 94 near Jackson, Michigan, when the Michigan State Police requested assistance with a commercial vehicle inspection. Agent {R} identified himself as a Border Patrol Agent to the vehicle's passenger, the subject, and questioned him as to his citizenship and immigration status.
IDENTITY AND STATUS:
The subject stated that he is a citizen and national of Honduras. He presented a Honduran passport issued in 2016 and a Honduran national identity card. He stated that he does not possess any visa, parole document or other document allowing him to enter or remain in the United States, and that he has never applied for any immigration benefit.
ENTRY:
The subject stated that on 09/15/2019 he crossed the Rio Grande on a raft near Roma, Texas, at approximately 2300 hours, together with eight other people, and walked inland without presenting himself for inspection at any port of entry. A smuggler arranged the crossing for a fee that his family paid.
TRAVEL:
He was driven from Roma to Houston, where he worked in construction until 2022, and then moved to Michigan by bus to work for a moving company.
IMMIGRATION AND CRIMINAL HISTORY:
Record checks returned no prior immigration encounters and no criminal history. The subject confirmed that he has never been arrested in the United States or in Honduras.
REMOVABILITY:
{G6A} He was not admitted or paroled at any time after his entry.
DISPOSITION:
The subject was arrested, transported to the {E} Station, processed for a Warrant of Arrest and Notice to Appear (Form I-862), and released on an order of recognizance pending his hearing.
""", facts(**{"subject.citizenship": "HONDURAS", "entry.date": "09/15/2019 2300", "entry.place": "near Roma, TX", "entry.manner": "EWI", "encounter.date_time": "03/28/2024 0640", "encounter.location": "JACKSON, MI", "encounter.method": "PB", "form.disposition": "Warrant of Arrest/Notice to Appear/OREC"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noMissing"}, {"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "All core elements are stated (date, place, manner, location method, citizenship, basis, identifying documents, ground, disposition). The raft crossing is consistent with the form's EWI (no mode coded). No conflicts.")

# ================================================================ unresolved (8)
case("UN01", "8 U.S.C. 1326: a final order of removal whose execution is unknown", "unresolved", f"""
ENCOUNTER:
On January 30, 2024, at approximately 0915 hours, Agent {R} encountered the subject at the Washtenaw County Jail in Ann Arbor, Michigan, after his arrest by local police for retail fraud. The subject stated that he is a citizen of Mexico. He declined to answer questions about his immigration history.
IMMIGRATION HISTORY:
Records reflect a final order of removal entered against the subject by the Newark Immigration Court on 11/18/2013. No record of the order's execution, and no record of the subject's departure, was located; agents could not determine whether he left the United States after the order.
REMOVABILITY:
{G1326}
DISPOSITION:
An immigration detainer was lodged and the case was referred for review of the prior order.
""", facts(**{"entry.date": "Unknown Date, Unknown Time", "entry.place": "UNKNOWN", "entry.manner": "UNKNOWN", "encounter.date_time": "01/30/2024 0915", "encounter.location": "ANN ARBOR, MI", "history.immigration_record": "POSITIVE - See Narrative", "history.criminal_record": "Retail fraud (pending)", "form.disposition": "Detainer lodged"}),
    ["8 U.S.C. 1326"], [{"type": "human_review", "reason": "execution of the removal order unknown"}],
    [{"kind": "citationIn", "status": ["needs_human_review", "insufficient_information"]}, {"kind": "routed"}],
    "An order of removal is documented, but its execution and any departure are expressly unknown. Whether the subject was removed (the 1326 requirement) is neither shown nor contradicted: a person must decide. Neither 'consistent' nor a mismatch.")

case("UN02", "8 U.S.C. 1326: removal order plus an unrelated arrest warrant executed years later", "unresolved", f"""
ENCOUNTER:
On May 3, 2024, Dallas County deputies executed a state arrest warrant at the subject's residence in Mesquite, Texas, for an unrelated theft charge, and the subject was booked into the Dallas County Jail. ICE Officer {R} interviewed him there on 05/04/2024 at approximately 1030 hours.
The subject stated that he is a citizen of Mexico.
IMMIGRATION HISTORY:
An immigration judge in Dallas ordered the subject removed in absentia on 04/11/2017 after he failed to appear for his hearing. The subject stated that he did not know about the order.
REMOVABILITY:
{G1326}
DISPOSITION:
A detainer was lodged with the Dallas County Jail.
""", facts(**{"entry.date": "Unknown Date, Unknown Time", "entry.place": "UNKNOWN", "entry.manner": "UNKNOWN", "encounter.date_time": "05/04/2024 1030", "encounter.location": "DALLAS, TX", "history.immigration_record": "POSITIVE - See Narrative", "history.criminal_record": "Theft (pending)", "form.disposition": "Detainer lodged"}),
    ["8 U.S.C. 1326"], [{"type": "human_review", "reason": "removal order with no stated execution"}],
    [{"kind": "citationIn", "status": ["needs_human_review", "insufficient_information"]}, {"kind": "routed"}],
    "The warrant that was executed is a state arrest warrant, not the removal order. Nothing says the order was executed or that he departed (his not knowing about it suggests, but does not establish, that it was not). Unresolved: a person decides.")

case("UN03", "A relative relays 'he was deported' (speaker or subject)", "unresolved", f"""
ENCOUNTER:
On June 18, 2024, at approximately 1730 hours, Agents {R} and {R} encountered the subject and his uncle at a mobile home park in Sturgis, Michigan, while looking for a person named in a tip. The subject stated that he is a citizen of Guatemala and showed a Guatemalan identity document (DPI). He has no immigration documents.
The subject stated that he crossed the border illegally near Sasabe, Arizona, in March 2019.
The subject's uncle, who was also present, told Agent {R} that he was deported to Guatemala back in 2015 and came back a few months later. The subject declined to discuss any earlier trips.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"subject.citizenship": "GUATEMALA", "entry.date": "03/2019", "entry.place": "near Sasabe, AZ", "encounter.date_time": "06/18/2024 1730", "encounter.location": "STURGIS, MI"}),
    ["INA 212(a)(6)(A)(i)"], [{"type": "human_review", "reason": "ambiguity", "anchors": ["he was deported to Guatemala back in 2015"]}],
    [{"kind": "route", "anchor": "he was deported to Guatemala back in 2015"}, {"kind": "noContradiction", "anchor": "he was deported to Guatemala back in 2015"}],
    "In the uncle's statement 'he' may be the uncle himself or the subject. If it is the subject, it conflicts with the NEGATIVE record; that cannot be decided from the text. Route it; do not assert a history contradiction.")

case("UN04", "Two redacted men give different entry years; the record does not say which is the subject", "unresolved", f"""
ENCOUNTER:
On September 24, 2024, at approximately 0505 hours, Agents {R} and {R} encountered two men walking along a county road near Allegan, Michigan. Both stated that they are citizens of Mexico without documents. This record concerns one of the two men; the other is documented separately.
ENTRY:
{R} stated that he crossed the border near Douglas, Arizona, in July 2012, by walking through the desert.
{R} stated that he crossed near Douglas in 2016 with a cousin.
REMOVABILITY:
{G6A}
DISPOSITION:
Both men were processed for Notices to Appear.
""", facts(**{"entry.date": "07/2012", "entry.place": "near Douglas, AZ", "encounter.date_time": "09/24/2024 0505", "encounter.location": "ALLEGAN, MI", "encounter.method": "PB"}),
    ["INA 212(a)(6)(A)(i)"], [{"type": "human_review", "reason": "ambiguity", "anchors": ["crossed near Douglas in 2016"]}],
    [{"kind": "route", "anchor": "crossed near Douglas in 2016"}, {"kind": "noContradiction", "anchor": "crossed near Douglas in 2016"}],
    "Two people, both redacted, neither designated. One statement's year matches the form (2012) and the other's does not (2016); a matching value does not identify the subject. Which statement is the subject's is for a person: route, no contradiction.")

case("UN05", "The same subject gives two unexplained accounts of his last entry (flew in on a visa vs walked across)", "unresolved", f"""
ENCOUNTER:
On April 4, 2024, at approximately 1310 hours, Agent {R} encountered the subject at a restaurant in Southfield, Michigan. The subject stated that he is a citizen of Colombia and presented a Colombian passport.
ENTRY:
During the initial interview the subject stated that he flew into Miami from Bogota in April 2019 on a tourist visa.
Later, at the station, he stated that he walked across the border near Laredo, Texas, in April 2019 with a group led by a smuggler. He offered no explanation for the difference between his two statements, and no admission record was found.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"subject.citizenship": "COLOMBIA", "entry.date": "04/2019", "entry.place": "UNKNOWN", "entry.manner": "UNKNOWN", "encounter.date_time": "04/04/2024 1310", "encounter.location": "SOUTHFIELD, MI"}),
    ["INA 212(a)(6)(A)(i)"], [{"type": "human_review", "reason": "ambiguity", "anchors": ["flew into Miami from Bogota in April 2019 on a tourist visa"]}],
    [{"kind": "route", "anchor": "flew into Miami from Bogota in April 2019 on a tourist visa"}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "Two incompatible accounts by the same subject of the same entry, unexplained; the form's manner is UNKNOWN. A finding that the accounts conflict is correct; whether he was admitted (and so which charge fits) is for a person. No mismatch.")

case("UN06", "A redacted man's visa admission versus a form recording EWI; neither man is designated", "unresolved", f"""
ENCOUNTER:
On July 30, 2024, at approximately 1150 hours, Agent {R} encountered two men at a roofing job site in Kentwood, Michigan, after the property owner reported workers without identification. This record concerns one of them; the other is documented separately.
STATEMENTS:
{R} stated that he entered through the San Ysidro port of entry with a visitor visa in 2018 and stayed after it expired.
{R} stated that he has never had any immigration document.
Both men stated that they are citizens of Mexico.
REMOVABILITY:
{G6A}
DISPOSITION:
Notices to Appear.
""", facts(**{"entry.date": "2018", "entry.place": "UNKNOWN", "entry.manner": "EWI", "encounter.date_time": "07/30/2024 1150", "encounter.location": "KENTWOOD, MI"}),
    ["INA 212(a)(6)(A)(i)"], [{"type": "human_review", "reason": "ambiguity", "anchors": ["through the San Ysidro port of entry with a visitor visa"]}],
    [{"kind": "route", "anchor": "through the San Ysidro port of entry with a visitor visa"}, {"kind": "noContradiction", "anchor": "through the San Ysidro port of entry with a visitor visa"}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "If the visa admission is the subject's, it conflicts with the form's EWI and with the charge; if it is the other man's, nothing conflicts. The text does not say which: route, no contradiction, no mismatch.")

case("UN07", "8 U.S.C. 1326: one unidentified member of a group had been ordered removed", "unresolved", f"""
ENCOUNTER:
On November 14, 2024, at approximately 0300 hours, Agents {R} and {R} stopped a pickup truck with four occupants on M-50 near Dundee, Michigan, at the request of the Monroe County Sheriff's Office. All four occupants stated that they are citizens of Mexico without immigration documents.
RECORD CHECKS:
Record checks on the four occupants showed that one of them had been ordered removed by an immigration judge in 2011; the remaining three had no record. The results did not identify which occupant the order concerns.
REMOVABILITY:
{G1326}
DISPOSITION:
All four occupants were transported to the {E} Station.
""", facts(**{"entry.date": "Unknown Date, Unknown Time", "entry.place": "UNKNOWN", "entry.manner": "EWI", "encounter.date_time": "11/14/2024 0300", "encounter.location": "DUNDEE, MI", "encounter.method": "PB", "history.immigration_record": "POSITIVE - See Narrative", "form.disposition": "Pending review"}),
    ["8 U.S.C. 1326"], [{"type": "human_review", "reason": "unattributed removal order"}],
    [{"kind": "citationIn", "status": ["needs_human_review", "insufficient_information"]}, {"kind": "routed"}],
    "One of four occupants had an order; which one, and whether it was executed, is not stated. The 1326 requirement is neither shown nor contradicted for this subject.")

case("UN08", "8 U.S.C. 1326 with a dated history list that names no removal; the form defers to the narrative", "unresolved", f"""
ENCOUNTER:
On August 21, 2024, at approximately 1440 hours, Agent {R} encountered the subject at a factory in Lansing, Michigan, during a follow-up on a referral from ICE. The subject stated that he is a citizen of India and presented an Indian passport.
IMMIGRATION HISTORY:
05/12/2009 - admitted at Detroit Metropolitan Airport as a B2 visitor.
11/12/2009 - authorized stay expired.
03/04/2016 - encountered by ICE in Lansing, Michigan; released.
REMOVABILITY:
{G1326}
DISPOSITION:
The case was referred to the U.S. Attorney's Office.
""", facts(**{"subject.citizenship": "INDIA", "entry.date": "05/12/2009", "entry.place": "DETROIT, MI", "entry.manner": "B2", "encounter.date_time": "08/21/2024 1440", "encounter.location": "LANSING, MI", "history.immigration_record": "POSITIVE - See Narrative", "form.disposition": "Referred for prosecution"}),
    ["8 U.S.C. 1326"], [{"type": "human_review", "reason": "history neither shows nor rules out a removal"}],
    [{"kind": "citationIn", "status": ["needs_human_review", "insufficient_information"]}, {"kind": "routed"}],
    "The listed history names an admission, an expiry and a release, and no removal; the list is not said to be complete, and the form only points to the narrative. Neither a removal nor its absence is established: a person decides. A mismatch would treat absence of a listed removal as proof.")

# ---------------------------------------------------------------- write
os.makedirs(f"{HERE}/cases", exist_ok=True); os.makedirs(f"{HERE}/expected", exist_ok=True)
checks = {}
for c in CASES:
    rec = {"id": c["cid"], "title": c["title"], "kind": "synthetic", "split": "diag-2", "context": c["context"],
           "provenance": {"source": "Team-authored fresh development case (diag-2), 2026-11-04. NOT independent or unbiased validation.",
                          "extraction": "Written directly as text; not taken from any document.",
                          "verification": "Synthetic; expected answers set from the source text and config/references.json before any engine run.",
                          "replacements": [], "textOrigin": "synthetic-test", "modifications": [c["title"]]},
           "narrative": {"text": c["text"]}, "facts": c["facts"],
           "selectedCharges": [{"citation": x, "source": "team-assigned-for-testing", "note": "Development case."} for x in c["charges"]]}
    json.dump(rec, open(f"{HERE}/cases/{c['cid']}.json", "w"), indent=2)
    exp = {"id": c["cid"], "base": c["cid"], "split": "diag-2", "datasetVersion": "diag-2", "description": c["title"],
           "plants": c["plants"], "shouldNotFlag": c["snf"], "labelNotes": c["notes"]}
    json.dump(exp, open(f"{HERE}/expected/{c['cid']}.json", "w"), indent=2)
    checks[c["cid"]] = {"category": c["cat"], "checks": c["checks"]}
json.dump(checks, open(f"{HERE}/checks.json", "w"), indent=2)
print(len(CASES), "cases;", {k: sum(1 for c in CASES if c["cat"] == k) for k in ("established", "negative", "unresolved")})
