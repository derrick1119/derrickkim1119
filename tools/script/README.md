# 대사 모음집 도구

게임을 자동으로 끝까지 플레이하면서 화면에 나온 모든 대사와 글을 나온 순서대로 기록하고, 대사 모음집(`docs/SCRIPT.md`)을 만듭니다.
Playwright와 Chromium이 필요합니다.

```bash
tools/script/runall.sh "$PWD" /tmp/script        # 프롤로그~1장, 2~7장을 녹화 (병렬, 몇 분)
node tools/script/fmt.js /tmp/script             # 플레이 순서대로 번호 매기기 → script.txt, script.json
python3 tools/script/locate.py "$PWD" /tmp/script # 줄마다 코드 위치, 자동 플레이로는 안 나온 문장 목록
python3 tools/script/mkdoc.py /tmp/script        # 장별 표 → doc_*.md, lines.json (번호 → 문장, 위치)
```

- `hook.js`: 페이지에 먼저 주입되어 `T.talk`의 `say`와 `P.text`를 가로채 기록합니다.
- `cap.js`: 한 부분을 플레이합니다. `pro`는 제목 화면부터 키보드로 1장 끝까지, `chN`은 그 장의 `want()`를 따라갑니다.
- `relines.py`: 대사를 고칠 때 씁니다. 코드의 문장과 번역표(`tools/make_i18n.py`)의 한국어를 한 번에 바꿉니다.
  `[{"old": "옛 문장", "new": "새 문장" 또는 null(대사 삭제), "en": "English"}]` 형식의 JSON을 받습니다.
  바꾼 뒤에는 `python3 tools/make_i18n.py`와 `tools/subset_fonts.py`를 다시 돌립니다.
