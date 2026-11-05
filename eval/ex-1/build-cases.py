# Builds the ex-1 cases, expected answers and locked checks: 20 TEAM-AUTHORED fresh development cases (NOT independent
# or unbiased validation). Written on 2026-11-04, before any engine output on these cases existed. Expected answers are
# set from the source text and config/references.json, not from what the engine currently recognises.
#   python3 -I eval/ex-1/build-cases.py
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

# Written before any engine output on these cases and before the extraction change was coded. Event-rich narratives:
# several entries, departures, removals or people per case, so attribution and event scope matter.
# ================================================================ established issues (8)
case("XE01", "Last of three crossings (summer 2017) differs from the form's 2019; earlier crossings in 2008 and 2012", "established", f"""
ENCOUNTER:
On April 4, 2024, at approximately 1310 hours, Agent {R} encountered the subject at a landscaping supply yard in Novi, Michigan, while following up on a tip about unauthorized workers. The subject stated that he is a citizen of Mexico and that he has no papers that allow him to live or work in the United States.
ENTRY AND TRAVEL:
The subject said he has crossed the border three times. The first time was in 2008, when he was a teenager; he was caught near Nogales and sent back the same day. The second time, in 2012, he stayed about a year in Phoenix before going home on his own for his father's funeral.
The subject stated that his most recent crossing was in the summer of 2017, when he walked through the hills east of Nogales, Arizona, with a guide, and that he has not left the United States since then.
REMOVABILITY:
{G6A}
DISPOSITION:
The subject was processed for a Warrant of Arrest and Notice to Appear.
""", facts(**{"entry.date": "07/2019", "entry.place": "near Nogales, AZ", "encounter.date_time": "04/04/2024 1310", "encounter.location": "NOVI, MI", "history.immigration_record": "POSITIVE - See Narrative"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["his most recent crossing was in the summer of 2017"], "fieldPaths": ["entry.date"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "his most recent crossing was in the summer of 2017", "field": "entry.date"},
     {"kind": "noContradiction", "anchor": "The first time was in 2008"}],
    "The subject names his most recent crossing as summer 2017 and says he has not left since; the form's last entry is 07/2019. The 2008 and 2012 crossings are earlier events and must not be compared with the form's last entry.")

case("XE02", "Designated subject (rear passenger) gives a 2020 river crossing; the form records 2022; the driver's account differs", "established", f"""
ENCOUNTER:
On August 15, 2024, at approximately 0140 hours, Agents {R} and {R} assisted the Hillsdale County Sheriff's Office with a traffic stop of a white sedan on M-99 near Jonesville, Michigan. The sedan carried a driver and two passengers.
INTERVIEWS:
The driver, {R}, stated that he is a citizen of Guatemala and that he crossed the border near Hidalgo, Texas, in 2022. He is documented on a separate record.
The rear passenger, {R}, is the subject of this record. The subject stated that he is a citizen of Guatemala, that he has no immigration documents, and that he waded across the Rio Grande near Roma, Texas, in March 2020 and was picked up by a car on the U.S. side.
The front passenger declined to answer questions and is documented on a separate record.
REMOVABILITY:
{G6A}
DISPOSITION:
All three were transported to the {E} Station.
""", facts(**{"subject.citizenship": "GUATEMALA", "entry.date": "03/2022", "entry.place": "near Roma, TX", "encounter.date_time": "08/15/2024 0140", "encounter.location": "JONESVILLE, MI", "encounter.method": "PB"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["waded across the Rio Grande near Roma, Texas, in March 2020"], "fieldPaths": ["entry.date"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "waded across the Rio Grande near Roma, Texas, in March 2020", "field": "entry.date"},
     {"kind": "noContradiction", "anchor": "he crossed the border near Hidalgo, Texas, in 2022"}],
    "The rear passenger is expressly designated as the subject of this record and states March 2020; the form records 03/2022. The driver's 2022 crossing matches the form's year but is another person's entry and must not be used to explain the conflict away.")

case("XE03", "Executed removal through the Laredo bridge (2016) while the record is NEGATIVE; a later voluntary departure", "established", f"""
ENCOUNTER:
On October 29, 2024, at approximately 0820 hours, ICE Officer {R} interviewed the subject at the Ingham County Jail in Mason, Michigan, following his arrest for driving without a license. The subject stated that he is a citizen of Mexico.
IMMIGRATION HISTORY:
Biometric record checks for the subject show that an immigration judge in Houston ordered him removed on 02/09/2016 and that he was removed on foot through the Laredo, Texas, port of entry on 04/02/2016.
The subject also stated that in 2019 he went back to Mexico on his own to visit his mother and returned a month later by crossing the river near Piedras Negras.
REMOVABILITY:
{G6A}
DISPOSITION:
An immigration detainer was lodged with the Ingham County Jail.
""", facts(**{"entry.date": "2019", "entry.place": "near Piedras Negras, MX / Eagle Pass, TX", "encounter.date_time": "10/29/2024 0820", "encounter.location": "MASON, MI", "history.immigration_record": "NEGATIVE", "history.criminal_record": "No license (pending)", "form.disposition": "Detainer lodged"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["he was removed on foot through the Laredo, Texas, port of entry on 04/02/2016"], "fieldPaths": ["history.immigration_record"]}],
    [{"kind": "finding", "category": ["inconsistency", "unclear"], "anchor": "he was removed on foot through the Laredo, Texas, port of entry on 04/02/2016", "field": "history.immigration_record"}],
    "Record checks for the subject show a removal order and its execution (removed through Laredo in 2016). The form's NEGATIVE record conflicts with that history. The 2019 visit home is a voluntary trip, not a removal.")

case("XE04", "Last entry with a border crossing card at San Ysidro (2018); earlier EWI entry in 2009; form manner EWI", "established", f"""
ENCOUNTER:
On February 6, 2024, at approximately 1545 hours, Agent {R} encountered the subject at a restaurant kitchen in Southfield, Michigan, during a worksite inquiry. The subject stated that he is a citizen of Mexico and produced an expired border crossing card.
ENTRY:
The subject stated that he first came to the United States in 2009 by climbing the fence near Tijuana and that he went back to Mexico in 2014.
The subject stated that on 06/20/2018 he showed his border crossing card to an officer at the San Ysidro port of entry, was let through, and has stayed in the United States since.
REMOVABILITY:
The subject is removable under Section 237(a)(1)(B) of the Immigration and Nationality Act, in that after admission as a nonimmigrant he remained in the United States for a time longer than permitted.
DISPOSITION:
The subject was processed for a Notice to Appear.
""", facts(**{"entry.date": "06/20/2018", "entry.place": "SAN YSIDRO, CA", "entry.manner": "EWI", "encounter.date_time": "02/06/2024 1545", "encounter.location": "SOUTHFIELD, MI", "history.immigration_record": "NEGATIVE"}),
    ["INA 237(a)(1)(B)"],
    [{"type": "inconsistency", "anchors": ["showed his border crossing card to an officer at the San Ysidro port of entry"], "fieldPaths": ["entry.manner"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "showed his border crossing card to an officer at the San Ysidro port of entry", "field": "entry.manner"},
     {"kind": "noContradiction", "anchor": "by climbing the fence near Tijuana"}],
    "The subject's last entry (06/20/2018) was an inspection with a border crossing card at a port; the form codes the manner as EWI. The 2009 fence crossing is the first entry and must not be compared with the form's last entry.")

case("XE05", "Last entry near El Paso, Texas (2021); form place near Tucson, AZ; first entry near Nogales", "established", f"""
ENCOUNTER:
On May 28, 2024, at approximately 1105 hours, Agent {R} encountered the subject at a farm stand in Coloma, Michigan, after a deputy asked for help identifying a person without identification. The subject stated that he is a citizen of Mexico and that he has no documents.
ENTRY:
According to the subject, his first trip north was in 2015 through the desert near Nogales, Arizona; he worked in Tucson until he returned to Chihuahua in 2019.
On his last trip, in November 2021, he crossed on foot through a gap in the fence on the west side of El Paso, Texas, and took a bus to Michigan a week later.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "11/2021", "entry.place": "near Tucson, AZ", "encounter.date_time": "05/28/2024 1105", "encounter.location": "COLOMA, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["crossed on foot through a gap in the fence on the west side of El Paso, Texas"], "fieldPaths": ["entry.place"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "crossed on foot through a gap in the fence on the west side of El Paso, Texas", "field": "entry.place"},
     {"kind": "noContradiction", "anchor": "his first trip north was in 2015 through the desert near Nogales, Arizona"}],
    "Only one person of interest is described. His last entry was near El Paso, Texas; the form records near Tucson, Arizona. The 2015 Nogales trip is his first entry; it matches the form's state but is a different event.")

case("XE06", "Subject carried across hidden in a pickup's cargo area; form EWI AFOOT; companions walked", "established", f"""
ENCOUNTER:
On December 3, 2024, at approximately 2030 hours, Agent {R} encountered the subject at a gas station in Paw Paw, Michigan, after a clerk called about a man asking for help. The subject stated that he is a citizen of El Salvador without documents.
ENTRY:
The subject stated that in January 2023 a driver hid him under tarps in the cargo bed of a pickup truck that drove through a ranch gate east of Laredo, Texas, while the rest of his group walked across the river and met them later.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"subject.citizenship": "EL SALVADOR", "entry.date": "01/2023", "entry.place": "near Laredo, TX", "entry.manner": "EWI AFOOT", "encounter.date_time": "12/03/2024 2030", "encounter.location": "PAW PAW, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["hid him under tarps in the cargo bed of a pickup truck"], "fieldPaths": ["entry.manner"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "hid him under tarps in the cargo bed of a pickup truck", "field": "entry.manner"}],
    "Both sources say no inspection, so the charge is supported. The mode differs: the subject was carried in a vehicle, the form says AFOOT. Walking is the group's mode, not the subject's.")

case("XE07", "Single subject, pronoun-continued account: crossing on the night of 11/14/2015; form 11/14/2017", "established", f"""
ENCOUNTER:
On March 12, 2024, at approximately 0905 hours, Agent {R} encountered the subject at the Kalamazoo County courthouse after a referral from a probation officer. Agent {R} explained who he was and asked about the subject's citizenship.
The subject stated that he is a citizen of Honduras.
He explained that he left Choluteca in October 2015 and traveled through Guatemala and Mexico by bus and freight train.
He said he crossed the Rio Grande on an inner tube near Brownsville, Texas, on the night of 11/14/2015, and that agents never stopped him.
He has lived in Michigan since 2016.
REMOVABILITY:
{G6A}
DISPOSITION:
Warrant of Arrest and Notice to Appear.
""", facts(**{"subject.citizenship": "HONDURAS", "entry.date": "11/14/2017", "entry.place": "near Brownsville, TX", "encounter.date_time": "03/12/2024 0905", "encounter.location": "KALAMAZOO, MI"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["on the night of 11/14/2015"], "fieldPaths": ["entry.date"]}],
    [{"kind": "finding", "category": "inconsistency", "anchor": "on the night of 11/14/2015", "field": "entry.date"}],
    "Only one person of interest; 'He said' continues the subject's account. He crossed on 11/14/2015; the form records 11/14/2017. The agent is an official, not a second person of interest.")

case("XE08", "Subject's own prior apprehension and expedited removal (2013) while the record is NEGATIVE; brother's arrest also mentioned", "established", f"""
ENCOUNTER:
On July 7, 2024, at approximately 1620 hours, Agent {R} encountered the subject and his brother at a roadside fruit stand near Benton Harbor, Michigan. Both stated that they are citizens of Mexico without documents; the brother is documented on a separate record.
HISTORY:
The subject stated that Border Patrol agents caught him near Calexico, California, in 2013, that he was given expedited removal, and that he was bused to Mexicali the next day.
The subject stated that his brother was arrested in Texas once but was let go.
The subject said that he crossed again near Calexico in 2014.
REMOVABILITY:
{G6A}
DISPOSITION:
Warrant of Arrest and Notice to Appear.
""", facts(**{"entry.date": "2014", "entry.place": "near Calexico, CA", "encounter.date_time": "07/07/2024 1620", "encounter.location": "BENTON HARBOR, MI", "history.immigration_record": "NEGATIVE"}),
    ["INA 212(a)(6)(A)(i)"],
    [{"type": "inconsistency", "anchors": ["that he was given expedited removal, and that he was bused to Mexicali the next day"], "fieldPaths": ["history.immigration_record"]}],
    [{"kind": "finding", "category": ["inconsistency", "unclear"], "anchor": "that he was given expedited removal, and that he was bused to Mexicali the next day", "field": "history.immigration_record"}],
    "The sentence names the subject and describes his own apprehension and executed expedited removal (bused to Mexicali). The form's NEGATIVE record conflicts. The brother's arrest is another person's history.")

# ================================================================ negative controls (8)
case("XN01", "First entry 2010 (different year) and last entry 2018 matching the form", "negative", f"""
ENCOUNTER:
On January 23, 2024, at approximately 1030 hours, Agent {R} encountered the subject at a hardware store in Wyoming, Michigan. The subject stated that he is a citizen of Mexico and that he has no immigration documents.
ENTRY:
The subject stated that he first entered the United States in 2010 near Sasabe, Arizona, and lived in Tucson until 2016, when he returned to Sonora to care for his mother.
The subject stated that he last entered on 09/09/2018, walking through the desert near Lukeville, Arizona.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "09/09/2018", "entry.place": "near Lukeville, AZ", "encounter.date_time": "01/23/2024 1030", "encounter.location": "WYOMING, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "noContradiction", "anchor": "he first entered the United States in 2010 near Sasabe, Arizona"}],
    "The 2010 entry near Sasabe is explicitly the first entry; the last entry (09/09/2018, near Lukeville) matches the form's date, place and manner.",
    snf=["he first entered the United States in 2010 near Sasabe, Arizona"])

case("XN02", "Companion's different entry year; the designated subject's account matches the form", "negative", f"""
ENCOUNTER:
On June 2, 2024, at approximately 0715 hours, Agent {R} encountered two men waiting at a bus stop in Holland, Michigan. Both stated that they are citizens of Honduras without documents.
INTERVIEWS:
The subject of this record, {R}, stated that he crossed the river near McAllen, Texas, in April 2021.
His companion, {R}, stated that he crossed near Eagle Pass in 2017 and is documented on a separate record.
REMOVABILITY:
{G6A}
DISPOSITION:
Both men were processed for Notices to Appear.
""", facts(**{"subject.citizenship": "HONDURAS", "entry.date": "04/2021", "entry.place": "near McAllen, TX", "encounter.date_time": "06/02/2024 0715", "encounter.location": "HOLLAND, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "noContradiction", "anchor": "he crossed near Eagle Pass in 2017"}],
    "The companion's 2017 Eagle Pass crossing is another person's entry. The designated subject's April 2021 McAllen crossing matches the form.",
    snf=["he crossed near Eagle Pass in 2017"])

case("XN03", "Denied crossing at Nogales; affirmed crossing near Sasabe in 2019 matches the form", "negative", f"""
ENCOUNTER:
On September 17, 2024, at approximately 1500 hours, Agent {R} encountered the subject at an apartment complex in Grand Rapids, Michigan. The subject stated that he is a citizen of Mexico without documents.
ENTRY:
Asked whether he had come in through Nogales, the subject said no, he has never crossed at Nogales. He stated that he crossed through the desert near Sasabe, Arizona, in May 2019.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "05/2019", "entry.place": "near Sasabe, AZ", "encounter.date_time": "09/17/2024 1500", "encounter.location": "GRAND RAPIDS, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}],
    "The Nogales crossing is denied, not affirmed; the affirmed crossing matches the form's date and place.",
    snf=["he has never crossed at Nogales"])

case("XN04", "Cousin's deportation mentioned; the subject's record NEGATIVE stands", "negative", f"""
ENCOUNTER:
On April 30, 2024, at approximately 1145 hours, Agent {R} encountered the subject at a car wash in Taylor, Michigan, during a follow-up on an employer referral. The subject stated that he is a citizen of Mexico without documents.
ENTRY:
The subject stated that he crossed the border on foot near Eagle Pass, Texas, on 10/11/2020, the first and only time he has come to the United States.
OTHER INFORMATION:
The subject stated that his cousin was deported to Mexico in 2018 and now lives in Monterrey. The subject has never been arrested.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "10/11/2020", "entry.place": "near Eagle Pass, TX", "encounter.date_time": "04/30/2024 1145", "encounter.location": "TAYLOR, MI", "history.immigration_record": "NEGATIVE"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency", "unclear"], "field": "history.immigration_record"}, {"kind": "noFinding", "category": ["inconsistency"]}],
    "The deportation is the cousin's. The subject's own history is a single entry and no arrests, consistent with NEGATIVE.",
    snf=["his cousin was deported to Mexico in 2018"])

case("XN05", "Two visa admissions (2012 visit; last admission 2019); form records the 2019 admission; overstay charge", "negative", f"""
ENCOUNTER:
On March 26, 2024, at approximately 1400 hours, Agent {R} encountered the subject at an auto parts warehouse in Troy, Michigan, during a worksite inquiry. The subject stated that he is a citizen of Brazil and presented a Brazilian passport.
ENTRY:
The subject stated that he first visited the United States in 2012 as a tourist, was admitted at Miami International Airport, and went home after three weeks.
He was last admitted at Detroit Metropolitan Airport on 07/02/2019 with a B2 visa that allowed him to stay until 01/01/2020. He did not leave.
REMOVABILITY:
{G237}
DISPOSITION:
Notice to Appear.
""", facts(**{"subject.citizenship": "BRAZIL", "entry.date": "07/02/2019", "entry.place": "DETROIT, MI", "entry.manner": "B2", "encounter.date_time": "03/26/2024 1400", "encounter.location": "TROY, MI"}),
    ["INA 237(a)(1)(B)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "citationNot", "status": "likely_mismatch"}],
    "The 2012 Miami admission is an earlier visit; the last admission (Detroit, 07/02/2019, B2) matches the form and supports the overstay charge.",
    snf=["was admitted at Miami International Airport"])

case("XN06", "Approximate month ('in or around June 2019') with a full form date in that month", "negative", f"""
ENCOUNTER:
On November 6, 2024, at approximately 1820 hours, Agent {R} encountered the subject at a restaurant in Lansing, Michigan. The subject stated that he is a citizen of Mexico without documents.
ENTRY:
The subject stated that he does not remember the exact day but that he crossed in or around June 2019, walking at night through the brush near Del Rio, Texas.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "06/14/2019", "entry.place": "near Del Rio, TX", "encounter.date_time": "11/06/2024 1820", "encounter.location": "LANSING, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}],
    "Month-level precision ('in or around June 2019') is compatible with the form's 06/14/2019.",
    snf=["he crossed in or around June 2019"])

case("XN07", "Travel and residence inside Mexico across several years; U.S. crossing in 2018 matches the form", "negative", f"""
ENCOUNTER:
On August 8, 2024, at approximately 1240 hours, Agent {R} encountered the subject at a dairy farm near Coopersville, Michigan. The subject stated that he is a citizen of Mexico and that he does not have permission to be in the United States.
TRAVEL:
The subject stated that he left Oaxaca in 2014 and worked in Tijuana for three years, then moved to Mexicali in 2017.
In August 2018 he crossed into the United States by walking through the desert west of Calexico, California.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"entry.date": "08/2018", "entry.place": "near Calexico, CA", "encounter.date_time": "08/08/2024 1240", "encounter.location": "COOPERSVILLE, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}],
    "2014 and 2017 are moves inside Mexico, not U.S. entries. The U.S. crossing (August 2018, west of Calexico, on foot) matches the form.",
    snf=["he left Oaxaca in 2014"])

case("XN08", "Entry into Mexico from Guatemala (2017) and U.S. entry (2018) matching the form", "negative", f"""
ENCOUNTER:
On October 15, 2024, at approximately 0950 hours, Agent {R} encountered the subject at a construction site in Ann Arbor, Michigan. The subject stated that he is a citizen of Guatemala and that he has no documents.
ENTRY:
The subject stated that he crossed into Mexico from Guatemala at Tecun Uman in December 2017 and spent several months in Chiapas.
The subject stated that he then crossed the Rio Grande near Eagle Pass, Texas, on 05/22/2018.
REMOVABILITY:
{G6A}
DISPOSITION:
Notice to Appear.
""", facts(**{"subject.citizenship": "GUATEMALA", "entry.date": "05/22/2018", "entry.place": "near Eagle Pass, TX", "encounter.date_time": "10/15/2024 0950", "encounter.location": "ANN ARBOR, MI"}),
    ["INA 212(a)(6)(A)(i)"], [],
    [{"kind": "noFinding", "category": ["inconsistency"]}, {"kind": "noContradiction", "anchor": "he crossed into Mexico from Guatemala at Tecun Uman in December 2017"}],
    "The 2017 crossing is into Mexico, not the United States. The U.S. entry matches the form.",
    snf=["he crossed into Mexico from Guatemala at Tecun Uman in December 2017"])

# ================================================================ unresolved (4)
case("XU01", "Two redacted men; one gives 2016, the form 2019; the record does not say which is the subject", "unresolved", f"""
ENCOUNTER:
On February 19, 2024, at approximately 0610 hours, Agents {R} and {R} encountered two men walking along a railroad line near Niles, Michigan. Both stated that they are citizens of Mexico without documents. This record concerns one of the two men.
ENTRY:
{R} stated that he crossed the border near Nogales, Arizona, in 2016 by walking through the hills.
{R} stated that he has been in the United States for about five years.
REMOVABILITY:
{G6A}
DISPOSITION:
Both men were processed for Notices to Appear.
""", facts(**{"entry.date": "2019", "entry.place": "near Nogales, AZ", "encounter.date_time": "02/19/2024 0610", "encounter.location": "NILES, MI", "encounter.method": "PB"}),
    ["INA 212(a)(6)(A)(i)"], [{"type": "human_review", "reason": "ambiguity", "anchors": ["he crossed the border near Nogales, Arizona, in 2016"]}],
    [{"kind": "route", "anchor": "he crossed the border near Nogales, Arizona, in 2016"}, {"kind": "noContradiction", "anchor": "he crossed the border near Nogales, Arizona, in 2016"}],
    "The redacted names cannot be told apart and nothing designates the subject. The 2016 statement may be the other man's: route, no contradiction.")

case("XU02", "Three occupants; one unnamed statement matches the form's date exactly, another differs; neither is designated", "unresolved", f"""
ENCOUNTER:
On June 25, 2024, at approximately 2315 hours, Agent {R} stopped a van with three occupants on I-94 near Battle Creek, Michigan, at the request of the Michigan State Police. All three stated that they are citizens of Mexico without documents.
INTERVIEWS:
{R} stated that he crossed near Laredo, Texas, on 03/03/2021.
{R} stated that he crossed near Laredo, Texas, on 07/19/2018.
The third occupant did not answer questions.
REMOVABILITY:
{G6A}
DISPOSITION:
All three were transported to the {E} Station.
""", facts(**{"entry.date": "03/03/2021", "entry.place": "near Laredo, TX", "encounter.date_time": "06/25/2024 2315", "encounter.location": "BATTLE CREEK, MI", "encounter.method": "PB"}),
    ["INA 212(a)(6)(A)(i)"], [{"type": "human_review", "reason": "ambiguity", "anchors": ["he crossed near Laredo, Texas, on 07/19/2018"]}],
    [{"kind": "route", "anchor": "he crossed near Laredo, Texas, on 07/19/2018"}, {"kind": "noContradiction", "anchor": "he crossed near Laredo, Texas, on 07/19/2018"}],
    "One statement matches the form's date in full; that does not establish that it is the subject's (identity is never inferred from matching values), and the other statement may be the subject's. Route; no contradiction.")

case("XU03", "One of the men 'had been deported in 2014' while the record is NEGATIVE; which man is not stated", "unresolved", f"""
ENCOUNTER:
On September 9, 2024, at approximately 1710 hours, Agents {R} and {R} encountered three men at a migrant housing unit near Hart, Michigan, during a follow-up on a tip. All three stated that they are citizens of Mexico without documents.
HISTORY:
One of the men told the agents that he had been deported in 2014 through Nogales; the others said they have never been arrested.
The subject stated that he crossed near Douglas, Arizona, in 2020.
REMOVABILITY:
{G6A}
DISPOSITION:
All three were processed for Notices to Appear.
""", facts(**{"entry.date": "2020", "entry.place": "near Douglas, AZ", "encounter.date_time": "09/09/2024 1710", "encounter.location": "HART, MI", "history.immigration_record": "NEGATIVE"}),
    ["INA 212(a)(6)(A)(i)"], [{"type": "human_review", "reason": "ambiguity", "anchors": ["he had been deported in 2014 through Nogales"]}],
    [{"kind": "route", "anchor": "he had been deported in 2014 through Nogales"}, {"kind": "noContradiction", "anchor": "he had been deported in 2014 through Nogales"}],
    "'One of the men' could be the subject or not. If it is the subject, the removal conflicts with NEGATIVE. Route; no contradiction.")

case("XU04", "'The driver' crossed near Lukeville in 2015; the subject is not identified as the driver", "unresolved", f"""
ENCOUNTER:
On November 21, 2024, at approximately 0445 hours, Agents {R} and {R} stopped a pickup truck with two occupants on US-23 near Dundee, Michigan, after a sheriff's deputy requested help with identification. Both occupants stated that they are citizens of Mexico without documents. This record concerns one of the two occupants; the other is documented separately.
ENTRY:
The driver stated that he walked across the border near Lukeville, Arizona, in 2015.
The passenger stated that he does not remember when he came.
REMOVABILITY:
{G6A}
DISPOSITION:
Both occupants were transported to the {E} Station.
""", facts(**{"entry.date": "2017", "entry.place": "near Lukeville, AZ", "encounter.date_time": "11/21/2024 0445", "encounter.location": "DUNDEE, MI", "encounter.method": "PB"}),
    ["INA 212(a)(6)(A)(i)"], [{"type": "human_review", "reason": "ambiguity", "anchors": ["he walked across the border near Lukeville, Arizona, in 2015"]}],
    [{"kind": "route", "anchor": "he walked across the border near Lukeville, Arizona, in 2015"}, {"kind": "noContradiction", "anchor": "he walked across the border near Lukeville, Arizona, in 2015"}],
    "The record does not say whether its subject is the driver or the passenger. The driver's 2015 crossing would conflict with the form's 2017 only if he is the subject: route, no contradiction.")
# ---------------------------------------------------------------- write
os.makedirs(f"{HERE}/cases", exist_ok=True); os.makedirs(f"{HERE}/expected", exist_ok=True)
checks = {}
for c in CASES:
    rec = {"id": c["cid"], "title": c["title"], "kind": "synthetic", "split": "ex-1", "context": c["context"],
           "provenance": {"source": "Team-authored fresh development case (ex-1), 2026-11-04. NOT independent or unbiased validation.",
                          "extraction": "Written directly as text; not taken from any document.",
                          "verification": "Synthetic; expected answers set from the source text and config/references.json before any engine run.",
                          "replacements": [], "textOrigin": "synthetic-test", "modifications": [c["title"]]},
           "narrative": {"text": c["text"]}, "facts": c["facts"],
           "selectedCharges": [{"citation": x, "source": "team-assigned-for-testing", "note": "Development case."} for x in c["charges"]]}
    json.dump(rec, open(f"{HERE}/cases/{c['cid']}.json", "w"), indent=2)
    exp = {"id": c["cid"], "base": c["cid"], "split": "ex-1", "datasetVersion": "ex-1", "description": c["title"],
           "plants": c["plants"], "shouldNotFlag": c["snf"], "labelNotes": c["notes"]}
    json.dump(exp, open(f"{HERE}/expected/{c['cid']}.json", "w"), indent=2)
    checks[c["cid"]] = {"category": c["cat"], "checks": c["checks"]}
json.dump(checks, open(f"{HERE}/checks.json", "w"), indent=2)
print(len(CASES), "cases;", {k: sum(1 for c in CASES if c["cat"] == k) for k in ("established", "negative", "unresolved")})
