#!/usr/bin/env python3
"""Markdown for the dialogue collection: one table per chapter, and the appendix.
python3 mkdoc.py <outdir>  → <outdir>/doc_P.md … doc_7.md, doc_A.md, SCRIPT.md (all of it), lines.json (id → text, loc)"""
import json, sys, pathlib, re
out = pathlib.Path(sys.argv[1])
rows = json.loads((out / "rows.json").read_text(encoding="utf-8"))
extra = json.loads((out / "extra.json").read_text(encoding="utf-8"))
TITLES = {"P": "프롤로그", "1": "1장 「항구」", "2": "2장 「약속 목록」", "3": "3장 「꿈」", "4": "4장 「이웃들」", "5": "5장 「꽃길」", "6": "6장 「다 지킨 약속」", "7": "마지막 장 「마중」"}
LEADS = {
 "P": "병실에서 시작해 네 개의 기억, 마지막 밤, 떠나는 배까지.",
 "1": "장례를 마친 밤 아나의 부엌, 그리고 레오가 마중 나루에 닿은 날.",
 "2": "며칠 뒤 약속 목록과 피피, 일 년째 되는 날 브램과 처음 간 호수, 주춧돌.",
 "3": "기둥과 뼈대, 텃밭, 폭풍, 로사의 호수, 소원 숲, 아나의 꿈.",
 "4": "고래와 구름이, 빈이 온 날, 로사의 담요, 브램과 마르타, 로사와 아들, 첫 흰머리.",
 "5": "지붕 올리기, 릴리의 편지, 꿈의 재료 모으기, 결혼식 전날 밤의 꿈, 넓어진 그네.",
 "6": "피피의 엄마, 비 오는 기일, 아나표 스튜, 피피네의 마지막 별자리, 오로라.",
 "7": "아나가 오는 날, 구름이의 비밀, 이야기 담요, 약속 목록.",
}
KEYS = re.compile(r"\s*·\s*[^·]*(←|→|스페이스|엔터)[^·]*$")
def cell(s):
    while KEYS.search(s):   # the keyboard half of a guide line is added by the game itself
        s = KEYS.sub("", s)
    return s.replace("|", "\\|").replace("\n", " / ")
SCN = {"swing": "그네 그림", "stew": "스튜 기억", "walk": "산책 기억", "home": "사진 기억", "kitchen": "아나의 부엌"}
lines = {}
docs = {}
for tag in TITLES:
    rs = [r for r in rows if r["id"].split("-")[0] == tag]
    md = [f"## {TITLES[tag]}", "", LEADS[tag], "", "| 번호 | 누구 | 대사 |", "| --- | --- | --- |"]
    for r in rs:
        who = r["who"] + (f" ({SCN[r['sc']]})" if r["kind"] == "text" and r["sc"] in SCN else "")
        md.append(f"| {r['id']} | {who} | {cell(r['text'])} |")
        lines[r["id"]] = {"who": r["who"], "text": r["text"], "loc": r.get("loc", []), "kind": r["kind"]}
    docs[tag] = "\n".join(md)
# the appendix: what shows only now and then, grouped by where it lives
NICE = {"ch1_kitchen.js": "1장 부엌", "ch1_harbor.js": "1장 항구", "ch2_list.js": "2장", "ch3_dream.js": "3장", "ch4_neighbours.js": "4장", "ch5_flowers.js": "5장", "ch6_kept.js": "6장", "ch7_welcome.js": "마지막 장",
        "room.js": "프롤로그 병실", "mem_home.js": "기억: 사진", "mem_stew.js": "기억: 스튜", "mem_swing.js": "기억: 그네", "mem_walk.js": "기억: 산책", "ending.js": "프롤로그 끝",
        "dreamroom.js": "기울어진 방 (5장)", "evenings.js": "별자리 (2장·6장)", "garden.js": "텃밭 물길 (3장·4장)", "lakehelp.js": "비 오는 길 (6장)",
        "puzzles.js": "종 · 주춧돌", "skyplaces2.js": "소원 숲 · 바람 우체국", "views.js": "호수 (2~4장)", "work.js": "손일"}
RANGES = {"puzzles.js": [(254, "모든 퍼즐"), (362, "종"), (10**9, "주춧돌")],
          "work.js": [(179, "나무 켜기"), (659, "다 같이 당기기"), (10**9, "담요 뜨기")],
          "skyplaces2.js": [(900, "소원 숲 (3장)"), (10**9, "바람 우체국 (5장)")]}
MENU = {"프롤로그", "눌러서 이어하기 · ", "처음부터 시작하기", "화면을 눌러 시작", "소리를 켜면 더 좋아요", "장 바로 가기", "스페이스 / 엔터",
        "← → 로 고르고 스페이스로", "스페이스로 고르고 ← → 로 옮겨요", "건너뛰기", "처음 보는 풀"}
SKIPF = {"ui.js", "core.js", "audio.js", "stage.js"}
ap = ["## 부록 · 상황에 따라 나오는 문장", "", "자동 플레이에서는 나오지 않았지만, 막혔을 때나 틀렸을 때, 오래 기다릴 때 나오는 문장입니다. 퍼즐 힌트가 대부분입니다.", "", "| 번호 | 어디 | 문장 |", "| --- | --- | --- |"]
n = 0
done = set()
for e in extra:
    f = e["loc"].split(":")[0].split("/")[-1]
    t = e["text"]
    shown_t = cell(t)
    if f in SKIPF or t in MENU or shown_t in done or re.fullmatch(r"[^,]+, \d+", t) or (len(t.replace(" ", "")) <= 2 and not re.search(r"[!?.]", t)):
        continue
    done.add(shown_t)
    n += 1
    i = f"A-{n:03d}"
    ln = int(e["loc"].split(":")[1])
    where = NICE.get(f, "퍼즐 공통")
    # files that hold several puzzles: name the one by where the line sits
    for fn, cuts in RANGES.items():
        if f == fn:
            where = next(name for upto, name in cuts if ln <= upto)
    ap.append(f"| {i} | {where} | {cell(t)} |")
    lines[i] = {"who": where, "text": t, "loc": [e["loc"]], "kind": "extra"}
docs["A"] = "\n".join(ap)
for k, v in docs.items():
    (out / f"doc_{k}.md").write_text(v + "\n", encoding="utf-8")
(out / "lines.json").write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding="utf-8")
print({k: v.count("\n| ") - 1 for k, v in docs.items()})
