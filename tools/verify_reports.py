"""
Verify every exported one-page report against the saved review result it was made from.

Checks per PDF:
  * exactly one page, and no text drawn outside the page (clipping)
  * footer credit present (the bottom of the report was not cut off)
  * human-review indicator matches the result
  * every shown finding's ID and evidence references appear (sentence + page, form field, or missing element)
  * "N more findings" note when more than nine findings exist
  * "PARTIAL REVIEW" notice present exactly when the model check did not complete

Usage: python tools/verify_reports.py eval/runs/<timestamp>
Writes <run>/REPORTS-VERIFICATION.md and exits non-zero on any failure.
"""
import json, os, re, sys
import pymupdf

run = sys.argv[1]
rep_dir = os.path.join(run, "reports")
rows, failures = [], 0
norm = lambda s: re.sub(r"\s+", " ", s)

for name in sorted(os.listdir(rep_dir)):
    if not name.endswith(".pdf"):
        continue
    cid = name[:-4]
    result = json.load(open(os.path.join(run, "raw", f"{cid}.json")))
    doc = pymupdf.open(os.path.join(rep_dir, name))
    problems = []
    if doc.page_count != 1:
        problems.append(f"{doc.page_count} pages")
    page = doc[0]
    W, H = page.rect.width, page.rect.height
    for b in page.get_text("dict")["blocks"]:
        x0, y0, x1, y1 = b["bbox"]
        if x0 < 0 or y0 < 0 or x1 > W + 0.5 or y1 > H + 0.5:
            problems.append("text outside page")
            break
    text = norm(" ".join(p.get_text() for p in doc))
    if "Built by Prompt & Circumstance" not in text:
        problems.append("footer missing (possible clipping)")
    hr = "HUMAN REVIEW REQUIRED" in text
    if hr != result["humanReview"]["required"]:
        problems.append("human-review indicator mismatch")
    partial = result["modelStatus"] != "ok"
    if partial != ("PARTIAL REVIEW" in text):
        problems.append("partial-review notice missing" if partial else "unexpected partial-review notice")
    shown = result["findings"][:9]
    refs_checked = 0
    for f in shown:
        if f"({f['id']})" not in text:
            problems.append(f"finding {f['id']} missing")
            continue
        for e in f["evidence"]:
            if e["kind"] == "sentence":
                token = f"{e['sentenceId']}" + (f" p.{e['page']}" if e.get("page") else "")
            elif e["kind"] == "field":
                token = f"field {e['fieldPath']}"
            else:
                token = f"required element {e['elementId']} not stated"
            refs_checked += 1
            if token not in text:
                problems.append(f"evidence '{token}' missing for {f['id']}")
    if len(result["findings"]) > 9 and f"{len(result['findings']) - 9} more findings" not in text:
        problems.append("'more findings' note missing")
    ok = not problems
    failures += 0 if ok else 1
    rows.append(f"| {cid} | {doc.page_count} | {'yes' if partial else 'no'} | {'yes' if hr else 'no'} | {len(result['findings'])} | {refs_checked} | {'PASS' if ok else 'FAIL: ' + '; '.join(problems)} |")

md = f"""# Report verification for {os.path.basename(run)}

Each PDF was checked against the saved review result it was generated from (tools/verify_reports.py).

| Case | Pages | Partial review | Human review | Findings | Evidence refs checked | Result |
|---|---|---|---|---|---|---|
""" + "\n".join(rows) + f"\n\n{len(rows)} reports, {failures} failing.\n"
open(os.path.join(run, "REPORTS-VERIFICATION.md"), "w").write(md)
print(md)
sys.exit(1 if failures else 0)
