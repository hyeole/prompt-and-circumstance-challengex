"""
Group extracted pages into candidate cases.

Rule: a case starts at a Form I-213 page; following continuation (I-831) or other pages
belong to it until the next I-213. Printed "N of M Pages" numbering and the dates in the
continuation headers are used as cross-checks, and disagreements are recorded as warnings.
Groupings are candidates only: each case used in the app is visually verified before use.

Usage: python tools/extract/group_cases.py data/work/pages.jsonl data/work/case_index.json
"""
import json, sys
from collections import Counter

pages = [json.loads(l) for l in open(sys.argv[1])]
cases, cur = [], None
for p in pages:
    if p["form"] == "I-213" or cur is None:
        cur = {"pages": [], "warnings": []}
        cases.append(cur)
    cur["pages"].append(p)

out = []
for i, c in enumerate(cases, 1):
    ps = c["pages"]
    nums = [(p["page"], p["page_no"], p["page_total"]) for p in ps if p["page_no"]]
    totals = Counter(t for _, _, t in nums)
    expected = totals.most_common(1)[0][0] if totals else None
    warnings = []
    if ps[0]["form"] != "I-213": warnings.append("does not start with an I-213 page")
    if expected and expected != len(ps): warnings.append(f"printed total {expected} pages but grouped {len(ps)}")
    for pg, n, t in nums:
        if n != ps.index(next(p for p in ps if p["page"] == pg)) + 1:
            warnings.append(f"page {pg} prints {n} of {t} but is position {[p['page'] for p in ps].index(pg)+1}")
    date_counts = Counter(d for p in ps[1:] for d in p["dates"])
    out.append({
        "candidate_id": f"C{i:03d}",
        "pdf_pages": [p["page"] for p in ps],
        "methods": [p["method"] for p in ps],
        "ocr_pages": sum(p["method"] == "ocr" for p in ps),
        "header_date": date_counts.most_common(1)[0][0] if date_counts else None,
        "printed_total": expected,
        "warnings": warnings,
    })
json.dump(out, open(sys.argv[2], "w"), indent=1)
ok = [c for c in out if not c["warnings"]]
print(f"{len(pages)} pages -> {len(out)} candidate cases; {len(ok)} without warnings")
print("pages per case:", Counter(len(c["pdf_pages"]) for c in out).most_common())
print("all-embedded-text cases after page 1:", sum(1 for c in out if all(m=='embedded' for m in c['methods'][1:])))
for c in out[:12]: print(c["candidate_id"], c["pdf_pages"], c["methods"], c["header_date"], c["warnings"])
