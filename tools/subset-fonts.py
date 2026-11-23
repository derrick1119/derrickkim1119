#!/usr/bin/env python3
"""폰트 서브셋 만들기.

원본 TTF(Bagel Fat One, Pretendard — 둘 다 SIL OFL 1.1)에서
게임에 필요한 글자만 남겨 woff2 로 굽는다.

  pip install fonttools brotli
  python3 tools/subset-fonts.py <BagelFatOne-Regular.ttf> <Pretendard-Medium.ttf> <Pretendard-Bold.ttf> <Pretendard-ExtraBold.ttf>
  (Pretendard TTF 는 npm 패키지 pretendard 의 dist/public/static/alternative/ 에 있다)

남기는 글자: ASCII, 자주 쓰는 문장 부호, KS X 1001 완성형 한글 2,350자,
그리고 src/i18n 의 문구에 실제로 쓰인 모든 글자.
"""
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"


def wanted_chars() -> set[str]:
    chars = {chr(c) for c in range(0x20, 0x7F)}
    chars |= set("·…“”‘’「」『』〈〉★☆×→←↑↓−–—°%℃◈•※♪♥")
    # KS X 1001 완성형 한글 2,350자
    for lead in range(0xB0, 0xC9):
        for trail in range(0xA1, 0xFF):
            try:
                chars.add(bytes([lead, trail]).decode("euc-kr"))
            except UnicodeDecodeError:
                pass
    for path in (ROOT / "src" / "i18n").glob("*.js"):
        chars |= set(path.read_text(encoding="utf-8"))
    # 기능 모듈이 registerStrings 로 더하는 문구
    for path in list((ROOT / "src" / "features").rglob("strings.js")) + [ROOT / "src" / "ui" / "minigames" / "strings.js"]:
        if path.exists():
            chars |= set(path.read_text(encoding="utf-8"))
    chars |= set((ROOT / "index.html").read_text(encoding="utf-8"))
    return {c for c in chars if c >= " "}


def build(src: str, name: str, chars: set[str]) -> None:
    font = TTFont(src)
    cmap = font.getBestCmap()
    have = sorted(ord(c) for c in chars if ord(c) in cmap)
    missing = sorted(c for c in chars if ord(c) not in cmap)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    opts.notdef_outline = True
    opts.desubroutinize = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=have)
    sub.subset(font)
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{name}.woff2"
    font.flavor = "woff2"
    font.save(out)
    print(f"{name}: 글자 {len(have)}개, {out.stat().st_size / 1024:.0f} KB")
    if missing:
        print(f"  폰트에 없는 글자(시스템 글꼴로 대신 표시됨): {''.join(missing)}")


def main() -> None:
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    chars = wanted_chars()
    build(sys.argv[1], "BagelFatOne", chars)
    for src, weight in zip(sys.argv[2:], ("Medium", "Bold", "ExtraBold")):
        build(src, f"Pretendard-{weight}", chars)


if __name__ == "__main__":
    main()
