# Checks the diag-1 labels against the supplied references and the case texts, without any engine run.
# python3 -I eval/diag-1/check-labels.py
import json, glob, os, re
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(D))
refs = json.load(open(f"{ROOT}/config/references.json"))
norm = lambda s: re.sub(r"[^0-9a-z]", "", s.lower())
charge = {norm(cit): c for c in refs["charges"] for cit in c["citations"]}
elements = {e["id"] for e in refs["requiredElements"]}
checks = json.load(open(f"{D}/checks.json")); problems = []
for f in sorted(glob.glob(f"{D}/cases/*.json")):
    c = json.load(open(f)); e = json.load(open(f"{D}/expected/{c['id']}.json")); text = c["narrative"]["text"]
    for ch in c["selectedCharges"]:
        ref = charge.get(norm(ch["citation"]))
        if not ref: problems.append(f"{c['id']}: charge {ch['citation']} not in references")
        else: print(f"{c['id']}: {ch['citation']} -> {ref['id']} requires {ref.get('requires')}")
    anchors = [a for p in e["plants"] for a in p.get("anchors", [])] + [k["anchor"] for k in checks[c["id"]]["checks"] if "anchor" in k] + e["shouldNotFlag"]
    for a in anchors:
        n = text.count(a)
        if n != 1: problems.append(f"{c['id']}: anchor {a!r} occurs {n} times")
    for p in e["plants"]:
        if p["type"] == "missing_element" and p["elementId"] not in elements: problems.append(f"{c['id']}: unknown element {p['elementId']}")
    for k in checks[c["id"]]["checks"]:
        for el in ([k["element"]] if "element" in k else []) + k.get("elements", []):
            if el not in elements: problems.append(f"{c['id']}: unknown element {el}")
print("PROBLEMS:", problems or "none")
