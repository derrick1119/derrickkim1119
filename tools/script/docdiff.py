#!/usr/bin/env python3
"""Compare the dialogue collection doc (an export of it) with the game, row by row.
python3 docdiff.py <export file: the docs export result, JSON with base64, or plain markdown> <docs/SCRIPT.md, or an outdir with doc_*.md>
Prints every row whose 누구 or 대사 differs, rows that were added (no number, or a new number), and rows removed.
Used twice: to check the doc was written faithfully, and to find what the user changed in it."""
import base64, json, re, sys, pathlib
raw = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
out = pathlib.Path(sys.argv[2])
try:
    d = json.loads(raw)
    def b64(o):
        if isinstance(o, dict):
            for v in o.values():
                r = b64(v)
                if r: return r
        elif isinstance(o, list):
            for v in o:
                r = b64(v)
                if r: return r
        elif isinstance(o, str) and len(o) > 1000 and re.fullmatch(r"[A-Za-z0-9+/=\s]+", o[:2000]):
            return o
    md = base64.b64decode(b64(d)).decode("utf-8")
except ValueError:
    md = raw
ROW = re.compile(r"^\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$")
def rows(text):
    r, sec = [], None
    for ln in text.split("\n"):
        if ln.startswith("## "): sec = ln[3:].strip()
        m = ROW.match(ln)
        if not m or m.group(1) in ("번호", "---"): continue
        r.append((sec, m.group(1), m.group(2).replace("\\~", "~"), m.group(3).replace("\\|", "|").replace("\\~", "~")))
    return r
want = {}
base = out.read_text(encoding="utf-8") if out.is_file() else "\n".join((out / f"doc_{t}.md").read_text(encoding="utf-8") for t in ["P", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A"])
for sec, i, who, txt in rows(base):
    want[i] = (who, txt)
got = rows(md)
seen, n = set(), 0
for k, (sec, i, who, txt) in enumerate(got):
    if i in want:
        seen.add(i)
        if (who, txt) != want[i]:
            n += 1; print(f"CHANGED {i}\n  was: {want[i][0]} | {want[i][1]}\n  now: {who} | {txt}")
    else:
        prev = next((got[j][1] for j in range(k - 1, -1, -1) if got[j][1] in want), "-")
        n += 1; print(f"ADDED after {prev} ({sec}): {who} | {txt}")
for i in want:
    if i not in seen:
        n += 1; print(f"REMOVED {i}: {want[i][0]} | {want[i][1]}")
print(f"{len(got)} rows in the doc, {n} differences")
