"""
Build an app case file (data/cases/<id>.json) from a manifest (data/manifests/<id>.json).

The manifest lists, per PDF page, either
  * "use": "embedded"  -> narrative lines are taken from data/work/pages.jsonl (embedded PDF text),
                          between optional start/stop markers, with page headers and footers removed; or
  * "text": "..."      -> a manual transcription verified against the page image (used for OCR pages).
Facts, selected charge, and provenance are copied from the manifest as written.

Redaction labels are normalized to "[REDACTED (b)(6), (b)(7)(C)]" style tokens. The narrative wording
itself is not edited. Page spans record which characters came from which PDF page.

Usage: python tools/extract/build_case.py data/manifests/C001.json data/work/pages.jsonl data/cases/
"""
import json, re, sys, os

HEADING = re.compile(r"^[A-Z][A-Z /&]+:$")

def norm_redaction(m):
    inner = re.sub(r"\s+", "", m.group(1))
    inner = inner.replace(",(b)", ", (b)")
    return f"[REDACTED {inner}]"

def normalize_redactions(s):
    return re.sub(r"\[(\(b\)[^\]]*)\]", norm_redaction, s)

def page_body(lines, start=None, stop=None):
    # drop header (through the "Event No:" line) and footer (from "Signature Title")
    try: i0 = next(i for i, l in enumerate(lines) if l.startswith("Event No:")) + 1
    except StopIteration: i0 = 0
    i1 = next((i for i, l in enumerate(lines) if l.startswith("Signature")), len(lines))
    body = lines[i0:i1]
    if start:
        body = body[next(i for i, l in enumerate(body) if start in l):]
    if stop:
        body = body[: next(i for i, l in enumerate(body) if stop in l)]
    return body

def join_lines(lines):
    """Join wrapped lines into paragraphs; headings start a new paragraph."""
    paras, cur = [], []
    for l in lines:
        l = re.sub(r"\s{2,}", " ", l.strip())
        if not l or re.fullmatch(r"-{3,}", l): continue
        if HEADING.match(l):
            if cur: paras.append(" ".join(cur)); cur = []
            paras.append(l)
        else:
            cur.append(l)
    if cur: paras.append(" ".join(cur))
    return paras

def main():
    man = json.load(open(sys.argv[1]))
    pages = {json.loads(l)["page"]: json.loads(l) for l in open(sys.argv[2])}
    chunks = []  # (page, text)
    for spec in man["narrativePages"]:
        if "text" in spec:
            chunks.append((spec["page"], spec["text"].strip()))
        else:
            body = page_body(pages[spec["page"]]["lines"], spec.get("start"), spec.get("stop"))
            chunks.append((spec["page"], "\n\n".join(join_lines(body))))
    # Merge sentence continuations across page breaks: if a chunk ends mid-sentence, join with a space.
    text, spans = "", []
    for page, t in chunks:
        t = normalize_redactions(t)
        if text:
            sep = " " if not re.search(r"[.:!?]\s*$", text) and not HEADING.match(t.split("\n")[0]) else "\n\n"
            text += sep
        start = len(text); text += t
        spans.append({"page": page, "start": start, "end": len(text)})
    case = {k: v for k, v in man.items() if k != "narrativePages"}
    case["narrative"] = {"text": text, "pageSpans": spans}
    os.makedirs(sys.argv[3], exist_ok=True)
    out = os.path.join(sys.argv[3], f"{man['id']}.json")
    json.dump(case, open(out, "w"), indent=2, ensure_ascii=False)
    print(f"wrote {out}: {len(text)} chars from pages {[p for p, _ in chunks]}")

if __name__ == "__main__":
    main()
