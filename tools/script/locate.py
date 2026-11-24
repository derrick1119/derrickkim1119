#!/usr/bin/env python3
"""Adds the source location to every captured row and lists the Korean strings the playthrough never showed.
python3 locate.py <repo> <outdir>  → <outdir>/rows.json, <outdir>/extra.json, <outdir>/extra.txt"""
import json, re, sys, pathlib
repo, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
LIT = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`")
HAN = re.compile(r"[가-힣]")
SKIP = {"i18n.js", "devmenu.js", "fxdemo.js", "dance.js", "settings.js"}
loaded = set(re.findall(r'src="([^"]+)"', (repo / "index.html").read_text(encoding="utf-8")))
lits = []   # (text, file, line)
# puzzles no chapter calls any more: their words are not in the game
UNUSED = {"haul", "sniff", "cook", "steam", "frame", "rope", "taste", "garland", "patchDraw", "story", "calm"}
def dead_ranges(path):
    rs, defs = [], []
    lines = path.read_text(encoding="utf-8").split("\n")
    for i, ln in enumerate(lines, 1):
        m = re.match(r"\s*(?:Z|L|T\.puzzle)\.([A-Za-z]+) = function", ln)
        if m: defs.append((i, m.group(1)))
    for k, (i, name) in enumerate(defs):
        end = defs[k + 1][0] - 1 if k + 1 < len(defs) else len(lines)
        if name in UNUSED: rs.append((i, end))
    return rs
for f in sorted((repo / "src").rglob("*.js")):
    rel = str(f.relative_to(repo))
    if f.name in SKIP or rel not in loaded:
        continue
    dead = dead_ranges(f)
    for i, ln in enumerate(f.read_text(encoding="utf-8").split("\n"), 1):
        if any(a <= i <= b for a, b in dead) or "고리를 눌러 돌려" in ln:
            continue
        s0 = ln.strip()
        if "T.announce(" in ln or s0.startswith("/*") or s0.startswith("*") or s0.startswith("//"):
            continue
        for m in LIT.finditer(ln):
            s = next(g for g in m.groups() if g is not None)
            s = s.replace("\\n", "\n").replace("\\'", "'").replace('\\"', '"')
            if HAN.search(s):
                lits.append((s, rel, i))
rows = json.loads((out / "script.json").read_text(encoding="utf-8"))
where = {}
for s, f, i in lits:
    where.setdefault(s, []).append(f"{f}:{i}")
shown = set()
for r in rows:
    r["loc"] = where.get(r["text"], [])
    shown.add(r["text"])
    if not r["loc"]:   # built from pieces (a template, or joined): find the longest literal inside it
        best = max((s for s in where if len(s) >= 4 and s in r["text"]), key=len, default=None)
        if best:
            r["loc"] = [w + " (일부)" for w in where[best]]
            shown.add(best)
(out / "rows.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
extra, seen = [], set()
for s, f, i in lits:
    if s in shown or s in seen:
        continue
    seen.add(s)
    extra.append({"text": s, "loc": f"{f}:{i}"})
(out / "extra.json").write_text(json.dumps(extra, ensure_ascii=False, indent=1), encoding="utf-8")
cur, txt = None, []
for e in extra:
    f = e["loc"].split(":")[0]
    if f != cur:
        cur = f; txt.append(f"\n--- {f}")
    txt.append(f"{e['loc'].split(':')[1]}: {e['text'].replace(chr(10), ' / ')}")
(out / "extra.txt").write_text("\n".join(txt), encoding="utf-8")
print("rows", len(rows), "unlocated", sum(1 for r in rows if not r["loc"]), "extra", len(extra))
