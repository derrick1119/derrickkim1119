#!/usr/bin/env python3
"""Replace spoken lines in the game and in the translation table at once.
python3 relines.py <repo> <fixes.json>
fixes.json: [{"old": "한국어\\n그대로", "new": "새 줄" | null (delete the say line), "en": "English" (optional)}]
Each old string must occur in exactly one src file (one or more times). A line holding only that say call is
removed when new is null."""
import json, re, sys, pathlib
repo = pathlib.Path(sys.argv[1]); fixes = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
src = [p for p in (repo / "src").rglob("*.js") if p.name != "i18n.js"]
tab = repo / "tools" / "make_i18n.py"; tt = tab.read_text(encoding="utf-8")
def js(s): return s.replace("\\", "\\\\").replace("\n", "\\n").replace("'", "\\'")
def py(s): return s.replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')
bad = 0
for fx in fixes:
    old, new, en = fx["old"], fx.get("new"), fx.get("en")
    lit = "'" + js(old) + "'"
    hits = [p for p in src if lit in p.read_text(encoding="utf-8")]
    if not hits:
        print("NOT FOUND in src:", old.replace("\n", " / ")); bad += 1; continue
    for p in hits:
        t = p.read_text(encoding="utf-8")
        if new is None:
            lines = t.split("\n"); keep = []
            for ln in lines:
                if lit in ln and re.match(r"^\s*await (X\.)?TALK\.say\([^;]*\);\s*$", ln):
                    continue
                keep.append(ln)
            if len(keep) == len(lines):
                print("could not delete (not a bare say line):", old); bad += 1
            t = "\n".join(keep)
        else:
            t = t.replace(lit, "'" + js(new) + "'")
        p.write_text(t, encoding="utf-8")
        print(("DEL " if new is None else "OK  ") + str(p.relative_to(repo)) + ": " + old.replace("\n", " / ")[:50])
    # the table: rows whose Korean is the old line, or a unique beginning of it
    rows = list(re.finditer(r'\("((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"', tt))
    found = False
    for m in rows:
        ko = m.group(1).encode().decode("unicode_escape").encode("latin1").decode("utf-8") if "\\u" in m.group(1) else m.group(1).replace("\\n", "\n").replace('\\"', '"')
        if ko == old or (len(ko) >= 6 and old.startswith(ko) and ko != old):
            found = True
            if new is None:
                continue   # an unused row is harmless; make_i18n only warns about missing English
            en2 = py(en) if en is not None else m.group(2)
            tt = tt[:m.start()] + '("' + py(new) + '", "' + en2 + '"' + tt[m.end():]
            break
    if not found and new is not None:
        print("  no table row; add:", new.replace("\n", " / ")); 
        end = tt.index("\n]\n", tt.index("T = ["))
        tt = tt[:end] + "\n    (\"" + py(new) + "\", \"" + py(en or "") + "\")," + tt[end:]
tab.write_text(tt, encoding="utf-8")
print("problems:", bad)
