"""
Page-level extraction for the public CBP Detroit Sector I-213/I-44 PDF.

For each page:
  * embedded text (PyMuPDF) is used when present, rebuilt into reading-order lines
    so redaction labels such as "(b) (6), (b) (7)(C)" land where they appear on the page;
  * otherwise the page is rendered and read with Apple Vision OCR (macOS only), and the
    page is marked extraction_method="ocr" so later steps know it needs visual verification.

Also records form type (I-213 / I-831 continuation / other) and the printed
"N of M Pages" numbering, which is used to group pages into cases.

Usage:
  python tools/extract/extract_pages.py <path-to-pdf> data/work/pages.jsonl [--pages 1-40]
Output is written under data/work/ (git-ignored). Source PDF is never modified.
"""
import argparse, json, re, sys, hashlib
import pymupdf

REDACTION = re.compile(r"^\(b\)\s*\(\d\)")

def lines_from_items(items, tol, attach_tol=None):
    """items: (top, left, text). Cluster text by vertical position, sort left to right.
    Redaction labels are drawn on black boxes slightly off the text baseline, so they are
    attached to the nearest text line (within attach_tol) instead of forming their own line."""
    attach_tol = attach_tol if attach_tol is not None else tol * 3
    text_items = sorted(i for i in items if not REDACTION.match(i[2]))
    red_items = [i for i in items if REDACTION.match(i[2])]
    lines = []  # [center, [(left, text)]]
    for top, left, text in text_items:
        if lines and abs(top - lines[-1][0]) <= tol:
            lines[-1][1].append((left, text))
        else:
            lines.append([top, [(left, text)]])
    for top, left, text in red_items:
        best = min(lines, key=lambda l: abs(l[0] - top), default=None)
        if best is not None and abs(best[0] - top) <= attach_tol:
            best[1].append((left, "[" + text + "]"))
        else:
            lines.append([top, [(left, "[" + text + "]")]])
    lines.sort(key=lambda l: l[0])
    return [" ".join(t for _, t in sorted(l[1])).strip() for l in lines]

def embedded_lines(page):
    items = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                t = s["text"].strip()
                if t:
                    x0, y0, x1, y1 = s["bbox"]
                    items.append(((y0 + y1) / 2, x0, t))
    return lines_from_items(items, tol=3.0)

def ocr_lines(page, dpi=200):
    import Vision, Quartz
    from Foundation import NSData
    png = page.get_pixmap(dpi=dpi).tobytes("png")
    data = NSData.dataWithBytes_length_(png, len(png))
    src = Quartz.CGImageSourceCreateWithData(data, None)
    img = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    req.setUsesLanguageCorrection_(False)
    Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(img, None).performRequests_error_([req], None)
    items, confs = [], []
    for o in req.results():
        c = o.topCandidates_(1)[0]; b = o.boundingBox()
        items.append((1 - b.origin.y - b.size.height / 2, b.origin.x, c.string()))
        confs.append(c.confidence())
    return lines_from_items(items, tol=0.006), (min(confs) if confs else 0.0)

PAGE_NUM = re.compile(r"(\d{1,2})\s*[-_ ]*\s*of\s*[-_ ]*\s*(\d{1,2})\s*Pages", re.I)

def classify(text):
    if "Record of Deportable" in text: return "I-213"
    if "Continuation Page" in text or "I-831" in text or "1-831" in text: return "I-831"
    if "I-44" in text or "Report of Apprehension or Seizure" in text: return "I-44"
    return "other"

def page_numbering(lines, kind):
    joined = " ".join(lines)
    m = PAGE_NUM.search(joined)
    if m: return int(m.group(1)), int(m.group(2))
    # Embedded-text continuation pages print "______ of _______ Pages" then "3  4" on a later line.
    # Embedded-text pages put the numbers between the underscores: "______ 3   4" then "of _______ Pages".
    for i, l in enumerate(lines):
        m3 = re.fullmatch(r"_+\s*(\d{1,2})\s+(\d{1,2})", l.strip())
        if m3 and i + 1 < len(lines) and "Pages" in lines[i + 1]:
            return int(m3.group(1)), int(m3.group(2))
    if kind == "I-831":
        for i, l in enumerate(lines):
            if "of" in l and "Pages" in l:
                for nxt in lines[i + 1 : i + 4]:
                    m2 = re.fullmatch(r"(\d{1,2})\s+(\d{1,2})", nxt.strip())
                    if m2: return int(m2.group(1)), int(m2.group(2))
    return None, None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf"); ap.add_argument("out"); ap.add_argument("--pages", default=None)
    a = ap.parse_args()
    doc = pymupdf.open(a.pdf)
    sha = hashlib.sha256(open(a.pdf, "rb").read()).hexdigest()
    rng = range(1, doc.page_count + 1)
    if a.pages:
        lo, hi = map(int, a.pages.split("-")); rng = range(lo, hi + 1)
    with open(a.out, "w") as f:
        for n in rng:
            page = doc[n - 1]
            if page.get_text().strip():
                lines, method, conf = embedded_lines(page), "embedded", None
            else:
                lines, conf = ocr_lines(page); method = "ocr"
            kind = classify("\n".join(lines))
            num, total = page_numbering(lines, kind)
            dates = sorted(set(re.findall(r"\b\d{2}/\d{2}/\d{4}\b", "\n".join(lines))))
            f.write(json.dumps({"pdf_sha256": sha, "page": n, "method": method, "min_ocr_conf": conf,
                                "form": kind, "page_no": num, "page_total": total, "dates": dates,
                                "lines": lines}) + "\n")
            print(f"p{n:>3} {method:8} {kind:6} {num}/{total} {dates[:2]}", file=sys.stderr)

if __name__ == "__main__":
    main()
