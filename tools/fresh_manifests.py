"""Manifests for the fresh independent evaluation (part A): six previously unused source incidents.
I-213 fields transcribed by hand from the page images on 2026-10-30 (Apple Vision OCR not used for values)."""
import json, os
URL="https://www.cbp.gov/sites/default/files/assets/documents/2022-Jan/Detroit%20Sector%20Forms%20I-213%20and%20I-44%20FY%202012%20%E2%80%93%202019%20Part%205_0.pdf"
SRC="CBP, Detroit Sector Forms I-213 and I-44 FY 2012-2019 Part 5 (public, redacted)"
R="[REDACTED (b)(6), (b)(7)(C)]"
def F(path,label,value,field,page,status=None):
    st=status or ("present" if value else "absent")
    return {"path":path,"label":label,"value":value if st=="present" else "","status":st,"sourcePage":page,"sourceField":field}
def facts(p,cit,birth,age,addr,edate,eplace,emanner,method,atnear,dt,imm,crim):
    return [F("subject.name","Subject name","","Family Name (CAPS)",p,"redacted"),F("subject.citizenship","Country of citizenship",cit,"Country of Citizenship",p),
        F("subject.birthplace","City and country of birth",birth,"City, Province (State) and Country of Birth",p),F("subject.age","Age",age,"Date of Birth / Age",p),
        F("subject.us_address","U.S. address",addr,"U S Address",p),F("entry.date","Date and time of last entry",edate,"Date, Place, Time, and Manner of Last Entry",p),
        F("entry.place","Place of last entry",eplace,"Date, Place, Time, and Manner of Last Entry",p),F("entry.manner","Manner of last entry",emanner,"Date, Place, Time, and Manner of Last Entry",p),
        F("status.at_entry","Status at entry","PWA Mexico","Status at Entry",p),F("status.when_found","Status when found","IN TRAVEL","Status When Found",p),
        F("status.time_illegally_in_us","Length of time illegally in U.S.","OVER 1 YEAR","Length of Time Illegally in U S",p),
        F("encounter.date_time","Encounter date and hour",dt,"At/Near Date/Hour",p),F("encounter.location","Encounter location (at/near)",atnear,"At/Near",p),
        F("encounter.method","Method of location/apprehension",method,"Method of Location/Apprehension",p),
        F("encounter.station","Station / location code","DTM/[REDACTED (b)(7)(E)]","Location Code",p,"redacted"),
        F("history.immigration_record","Immigration record",imm,"Immigration Record",p),F("history.criminal_record","Criminal record",crim,"Criminal Record",p),
        F("form.charge_code","Charge code words (as printed)","I6A","Charge Code Words(s)",p)]
def man(cid,title,pages,first,fs,charge_note):
    return {"id":cid,"title":title,"kind":"adapted-public-record","split":"fresh",
      "provenance":{"source":SRC,"sourceUrl":URL,"pdfPages":pages,
        "extraction":f"Page {pages[0]} (I-213) fields transcribed by hand from the page image. Narrative pages {first}-{pages[-1]} use embedded PDF text with redaction labels placed by position.",
        "verification":"Grouping (I-213 + continuation pages with matching header dates and printed totals) and transcribed fields checked visually against page images on 2026-10-30. Not used in any earlier development or evaluation.","replacements":[]},
      "recordedChargeCode":"I6A","selectedCharges":[{"citation":"INA 212(a)(6)(A)(i)","referenceId":"INA-212a6Ai","source":charge_note[0],"note":charge_note[1]}],
      "facts":fs,"narrativePages":[{"page":first,"use":"embedded","start":"NARRATIVE"}]+[{"page":p,"use":"embedded"} for p in pages if p>first]}
ASSIGNED=("team-assigned-for-testing","The record shows charge code words 'I6A'; the narrative states no citation. Team-assigned for testing; code-to-citation mapping not assumed.")
STATED=lambda p:("stated-in-record",f"Citation as stated in the original narrative (PDF page {p}).")
M=[
 man("F010","Encounter near Riley Township, Ohio (2017)",[43,44,45,46],44,facts(43,"MEXICO","CAZONES, VERACRUZ, MEXICO","23",f"{R} TIFFIN, OHIO, 44883","05/05/2011, 1400","2 mile(s) E of MCI","EWI AFOOT","OA","RILEY TOWNSHIP, OH","04/03/2017 0325","NEGATIVE","None Known"),ASSIGNED),
 man("F036","Encounter near Freeland, Michigan (2017)",[156,157,158,159],157,facts(156,"MEXICO","SAN JUAN CHAMULA, CHIAPAS, MEXICO","23",f"{R} BAY CITY, MICHIGAN","Unknown Date, Unknown Time","0 mile(s) of UNK","PWA (AFOOT)","OA","FREELAND, MI","04/29/2017 1200","POSITIVE - See Narrative","None Known"),STATED(159)),
 man("F039","Encounter near Chesterfield, Michigan (2017)",[169,170,171,172,173],170,facts(169,"MEXICO","NORIA DE ANGELES, ZACATECAS, MEXICO","49",f"{R} AUBURN HILLS, MICHIGAN, 48326","Unknown Date, Unknown Time","mile(s) of UNK","PWA (AFOOT)","PB","CHESTERFIELD, MI","05/02/2017 0847","NEGATIVE","None Known"),ASSIGNED),
 man("F051","Encounter near Escanaba, Michigan (2017)",[222,223,224,225],223,facts(222,"GUATEMALA","SANTA CATARINA MITA, JUTIAPA, GUATEMALA","22","FAILED TO PROVIDE UNITED STATES ADDRESS","Unknown Date, Unknown Time","0 mile(s) of UNK","PWA (AFOOT)","OA","ESCANABA, MI","05/18/2017 1300","NEGATIVE","None Known"),STATED(225)),
 man("F055","Encounter near Fenton, Michigan (2017)",[240,241,242,243],241,facts(240,"HONDURAS","SAN PEDRO SULA, COPAN, HONDURAS","29","FAILED TO PROVIDE","Unknown Date, Unknown Time","0 mile(s) of UNK","PWA (AFOOT)","OA","FENTON, MI","05/23/2017 0911","NEGATIVE","None Known"),STATED(243)),
 man("F075","Encounter near Rocky River, Ohio (2017)",[322,323,324,325],323,facts(322,"MEXICO","GUADALUPE, ZACATECAS, MEXICO","29",f"{R} TIFFIN, OHIO, 44883","06/09/2011, 1800","1 mile(s) W of ELP","EWI AFOOT","OA","ROCKY RIVER, OH","06/20/2017 1406","POSITIVE - See Narrative","See Narrative"),STATED(325)),
]
os.makedirs("eval/fresh/manifests",exist_ok=True)
for m in M: json.dump(m,open(f"eval/fresh/manifests/{m['id']}.json","w"),indent=2,ensure_ascii=False)
print(len(M),"manifests")
