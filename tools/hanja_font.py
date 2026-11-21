#!/usr/bin/env python3
# 게임에 쓰는 한자만 담은 작은 글꼴 둘을 만든다.
#   seal  — 도장·낙관·패 표시에 찍는 반듯한 한자 (Noto Serif KR Black 의 부분집합)
#   brush — 큰 연출에 쓰는 붓글씨 한자 (Yuji Boku 의 부분집합)
#
#   npm pack @fontsource/noto-serif-kr && tar xzf fontsource-noto-serif-kr-*.tgz     # → package/files
#   npm pack @fontsource/yuji-boku     && tar xzf fontsource-yuji-boku-*.tgz
#   pip install fonttools brotli
#   python3 tools/hanja_font.py <package/files 폴더> [seal|brush] [출력 파일]
# 게임에 새 한자를 넣으면 아래 목록에 글자를 더하고 다시 돌린다.
import sys, os, re, glob, tempfile
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.merge import Merger

SEAL = (
    '甲乙丙得開惠淨'            # 전공 등급, 전리품·해금·정화 도장
    '戰强場酒寶頭岐'            # 노정: 싸움·강적·장터·주막·보물·두목·갈림길
    '將劍弓僧仙樂英武陣軍'      # 영웅의 낙관, 무기 표시, 첫 화면, 군기
    '石矢火雷砲鐵藥陣鼓喊伏柵斥炬虛擊令結經霹閃霧標捕興響壁黨縮念'  # 전술 패
    '刀牌槍巫騎道槌車'          # 병력 패
    '福淸神勝敗大吉山門鬼王正'  # 보물 그림과 여벌
)
# 붓글씨는 큰 글자로 쓰는 곳만: 전공 등급, 싸움·강적·두목의 알림, 영웅의 낙관, 합동기, 승패
# (Yuji Boku 에는 强 이 없어 같은 글자인 強 을 쓴다)
BRUSH = (
    '甲乙丙'
    '戰強頭'
    '將劍弓僧仙樂'
    '合勝敗滅破'
    '一二三'
)
KIND = {
    'seal': ('noto-serif-kr-*-900-normal.woff2', r'-\d+-900-normal', SEAL, 'noto-serif-kr-hanja-900-subset.woff2'),
    'brush': ('yuji-boku-*-400-normal.woff2', r'-\d+-400-normal', BRUSH, 'yuji-boku-hanja-subset.woff2'),
}
src_dir = sys.argv[1] if len(sys.argv) > 1 else 'package/files'
kind = sys.argv[2] if len(sys.argv) > 2 else 'seal'
pattern, numbered, chars, name = KIND[kind]
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'fonts', name)
# fontsource 는 한자를 번호 붙은 조각 파일 여러 개에 나눠 담는다: 필요한 글자가 든 조각만 골라 줄인 뒤 하나로 합친다
want = set(ord(c) for c in chars); parts = []; tmp = tempfile.mkdtemp()
for f in sorted(glob.glob(os.path.join(src_dir, pattern))):
    if not re.search(numbered, f): continue
    font = TTFont(f); have = want & set(font.getBestCmap())
    if not have: continue
    opt = subset.Options(); opt.layout_features = []; opt.name_IDs = [1, 2]; opt.notdef_outline = True; opt.hinting = False; opt.desubroutinize = True
    sub = subset.Subsetter(opt); sub.populate(unicodes=sorted(have)); sub.subset(font)
    font.flavor = None; path = os.path.join(tmp, f'part{len(parts)}.ttf'); font.save(path); parts.append(path); want -= have
if want: sys.exit('글꼴에 없는 글자: ' + ''.join(chr(c) for c in sorted(want)))
merged = Merger().merge(parts) if len(parts) > 1 else TTFont(parts[0]); merged.flavor = 'woff2'; merged.save(out)
print(f'{kind}: {len(set(chars))}자, 조각 {len(parts)}개 → {os.path.normpath(out)} ({os.path.getsize(out) / 1024:.1f} KB)')
