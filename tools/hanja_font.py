#!/usr/bin/env python3
# 도장·낙관에 쓰는 한자만 담은 작은 글꼴을 만든다 (Noto Serif KR Black 의 부분집합).
#   npm pack @fontsource/noto-serif-kr && tar xzf fontsource-noto-serif-kr-*.tgz
#   pip install fonttools brotli
#   python3 tools/hanja_font.py <package/files 폴더>
# 게임에 새 한자 도장을 넣으면 아래 HANJA 에 글자를 더하고 다시 돌린다.
import sys, os, re
from fontTools.ttLib import TTFont
from fontTools import subset

HANJA = (
    '甲乙丙得開惠淨'            # 전공 등급, 전리품·해금·정화 도장
    '戰强場酒寶頭岐'            # 노정: 싸움·강적·장터·주막·보물·두목·갈림길
    '將劍弓僧仙樂英武陣軍'      # 영웅의 낙관, 무기 표시, 첫 화면, 군기
    '石矢火雷砲鐵藥陣鼓喊伏柵斥炬虛擊令結經霹閃霧標捕興響壁黨縮念'  # 전술 패
    '刀牌槍巫騎道槌車'          # 병력 패
    '福淸神勝敗大吉山門鬼王正'  # 보물 그림과 여벌
)
src_dir = sys.argv[1] if len(sys.argv) > 1 else 'package/files'
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'fonts', 'noto-serif-kr-hanja-900-subset.woff2')
# fontsource 는 한자를 번호 붙은 조각 파일 여러 개에 나눠 담는다: 필요한 글자가 든 조각만 골라 줄인 뒤 하나로 합친다
import glob, tempfile
from fontTools.merge import Merger
want = set(ord(c) for c in HANJA); parts = []; tmp = tempfile.mkdtemp()
for f in sorted(glob.glob(os.path.join(src_dir, 'noto-serif-kr-*-900-normal.woff2'))):
    if not re.search(r'-\d+-900-normal', f): continue
    font = TTFont(f); have = want & set(font.getBestCmap())
    if not have: continue
    opt = subset.Options(); opt.layout_features = []; opt.name_IDs = [1, 2]; opt.notdef_outline = True; opt.hinting = False; opt.desubroutinize = True
    sub = subset.Subsetter(opt); sub.populate(unicodes=sorted(have)); sub.subset(font)
    font.flavor = None; path = os.path.join(tmp, f'part{len(parts)}.ttf'); font.save(path); parts.append(path); want -= have
if want: sys.exit('글꼴에 없는 글자: ' + ''.join(chr(c) for c in sorted(want)))
merged = Merger().merge(parts); merged.flavor = 'woff2'; merged.save(out)
print(f'{len(set(HANJA))}자, 조각 {len(parts)}개 → {os.path.normpath(out)} ({os.path.getsize(out) / 1024:.1f} KB)')
