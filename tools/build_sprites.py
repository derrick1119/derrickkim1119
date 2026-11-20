#!/usr/bin/env python3
"""컨셉 아트(assets/concept_day_night.png)에서 게임용 스프라이트 파츠를 만든다.

출력 (캐릭터마다, 모두 같은 크기의 캔버스):
  assets/<name>_body.png   다리를 지운 몸통 (다리 뒤쪽 치마는 채워 넣음)
  assets/<name>_front.png  다리 윗부분을 덮는 앞치마 자락
  assets/<name>_leg_l.png  뒤쪽 다리
  assets/<name>_leg_r.png  앞쪽 다리
  js/sprites.js            파츠 크기, 다리 회전축, 손 위치

사용법: python3 tools/build_sprites.py
"""
import json
import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'concept_day_night.png')

# 원본 이미지 좌표계 기준 설정
CHARS = {
    'day': dict(
        xr=(0, 400),
        # 앞치마 밑단(다리가 치마 밑으로 들어가는 선). 이 선 위는 다리보다 앞에 그린다.
        hem=[(170, 392), (200, 402), (213, 405), (222, 394), (240, 388), (250, 383),
             (258, 375), (264, 368), (272, 364), (290, 361), (300, 398), (340, 398)],
        legs=dict(
            l=dict(seed=(222, 450), pivot=(240, 352)),
            r=dict(seed=(268, 450), pivot=(277, 330)),
        ),
        skin=lambda r, g, b: (r >= 214) & ((r - b) >= 27) & (g >= 185),
        hand=(336, 288),
        hole_t=249, hole_area=5,
        # 다리 뒤로 보이는 뒷치마의 밑단. 이 선 위쪽만 치마색으로 메운다.
        back=[(170, 450), (200, 448), (212, 444), (236, 433), (256, 429), (283, 421),
              (292, 416), (300, 404), (340, 400)],
    ),
    'night': dict(
        xr=(400, 800),
        hem=[(480, 400), (512, 414), (521, 420), (530, 415), (542, 407), (548, 401),
             (556, 394), (566, 382), (576, 370), (582, 366), (600, 372), (660, 372)],
        legs=dict(
            l=dict(seed=(527, 450), pivot=(538, 370)),
            r=dict(seed=(565, 450), pivot=(569, 338)),
        ),
        skin=lambda r, g, b: (r >= 190) & ((r - b) >= 20) & (g >= 160),
        hand=(646, 286),
        hole_t=232, hole_area=1,   # 나이트에게는 흰색에 가까운 부분이 없다
        back=[(480, 470), (500, 462), (520, 449), (540, 449), (555, 440), (578, 440),
              (590, 428), (600, 418), (660, 400)],
    ),
}

WHITE_T = 244      # 가장자리에서 이어진 배경으로 볼 최소 밝기
PAD = 6
OFF = 8          # 원본 둘레에 덧대는 흰 여백 (좌표는 원본 기준으로 적고 여기서 보정)


def flood(mask_ok, seeds):
    """mask_ok 가 참인 픽셀을 seeds 에서부터 4방향으로 채운다."""
    h, w = mask_ok.shape
    out = np.zeros((h, w), bool)
    dq = deque()
    for (x, y) in seeds:
        if 0 <= x < w and 0 <= y < h and mask_ok[y, x] and not out[y, x]:
            out[y, x] = True
            dq.append((x, y))
    while dq:
        x, y = dq.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and mask_ok[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True
                dq.append((nx, ny))
    return out


def components(mask):
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    comps = []
    ys, xs = np.nonzero(mask)
    for x, y in zip(xs.tolist(), ys.tolist()):
        if seen[y, x]:
            continue
        comp = flood(mask & ~seen, [(x, y)])
        seen |= comp
        comps.append(comp)
    return comps


def dilate(mask, n=1):
    out = mask.copy()
    for _ in range(n):
        m = out.copy()
        m[1:, :] |= out[:-1, :]
        m[:-1, :] |= out[1:, :]
        m[:, 1:] |= out[:, :-1]
        m[:, :-1] |= out[:, 1:]
        out = m
    return out


def poly_y(poly, w):
    """폴리라인을 x 마다의 y 값 배열로."""
    ys = np.full(w, -1.0)
    for (x0, y0), (x1, y1) in zip(poly, poly[1:]):
        for x in range(int(x0), int(x1) + 1):
            if 0 <= x < w:
                t = (x - x0) / max(1e-6, (x1 - x0))
                ys[x] = y0 + (y1 - y0) * t
    return ys


def main():
    src = Image.open(SRC).convert('RGB')
    im = Image.new('RGB', (src.width + 2 * OFF, src.height + 2 * OFF), (255, 255, 255))
    im.paste(src, (OFF, OFF))
    rgb = np.array(im).astype(np.int32)
    h, w, _ = rgb.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mn = rgb.min(axis=2)

    # 1) 배경: 가장자리와 이어진 흰색 + 갇힌 흰 구멍
    border = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + \
             [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    bg = flood(mn >= WHITE_T, border)
    for cfg in CHARS.values():
        zone = np.zeros((h, w), bool)
        zone[:, cfg['xr'][0] + OFF:cfg['xr'][1] + OFF] = True
        for comp in components((mn >= cfg['hole_t']) & ~bg & zone):
            if comp.sum() >= cfg['hole_area']:
                bg |= comp

    # 2) 알파: 배경 가까운 띠(3px)는 "주변에서 가장 어두운 색 + 흰 배경"의 혼합으로 보고 푼다
    alpha = np.where(bg, 0.0, 1.0)
    band = dilate(bg, 3) & ~bg
    mn_fg = np.where(bg, 255, mn)
    local_min = mn_fg.copy()
    R = 2
    padded = np.pad(mn_fg, R, constant_values=255)
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            local_min = np.minimum(local_min, padded[R + dy:R + dy + h, R + dx:R + dx + w])
    est = np.clip((255.0 - mn) / np.maximum(255.0 - local_min, 1.0), 0.0, 1.0)
    alpha = np.where(band & (est < 0.85), est, alpha)
    a3 = np.clip(alpha, 0.05, 1)[..., None]
    col = np.clip((rgb - (1 - a3) * 255.0) / a3, 0, 255)
    col = np.where((alpha > 0.02)[..., None], col, rgb)

    def sh(p):
        return (p[0] + OFF, p[1] + OFF)

    meta = {}
    for name, cfg0 in CHARS.items():
        cfg = dict(cfg0)
        cfg['hem'] = [sh(p) for p in cfg0['hem']]
        cfg['back'] = [sh(p) for p in cfg0['back']]
        cfg['hand'] = sh(cfg0['hand'])
        cfg['legs'] = {k: dict(seed=sh(v['seed']), pivot=sh(v['pivot'])) for k, v in cfg0['legs'].items()}
        x0, x1 = cfg0['xr'][0] + OFF, cfg0['xr'][1] + OFF
        sel = np.zeros((h, w), bool)
        sel[:, x0:x1] = True
        fg = (alpha > 0.02) & sel
        ys, xs = np.nonzero(fg)
        bx0, bx1 = xs.min() - PAD, xs.max() + PAD + 1
        by0, by1 = ys.min() - PAD, ys.max() + PAD + 1

        hem = poly_y(cfg['hem'], w)
        yy = np.arange(h)[:, None]
        hem_ok = hem[None, :] >= 0
        below = hem_ok & (yy > hem[None, :])
        above = ~below

        skin = cfg['skin'](r, g, b) & fg & below
        legs = {}
        all_legs = np.zeros((h, w), bool)
        for key, lc in cfg['legs'].items():
            m = flood(skin, [lc['seed']])
            # 외곽선까지 포함 (배경이 아닌 픽셀로만 확장)
            legs[key] = dilate(m, 3) & fg & below
            all_legs |= dilate(m, 6) & fg & below   # 몸통에서는 외곽선 찌꺼기까지 넉넉히 지운다

        rgba = np.dstack([col, alpha * 255.0])

        # 3) 몸통: 다리 자리 중 뒷치마가 있던 곳(뒷밑단 선 위)을 좌우 치마색으로 메움
        back = poly_y(cfg['back'], w)
        body = rgba.copy()
        body[all_legs] = 0
        solid = fg & ~all_legs & (alpha > 0.9)
        for y in range(by0, by1):
            row = all_legs[y]
            if not row.any():
                continue
            xs_row = np.nonzero(row)[0]
            for run in np.split(xs_row, np.nonzero(np.diff(xs_row) > 1)[0] + 1):
                xa, xb = int(run[0]), int(run[-1])

                def sample(x_from, step):
                    vals = []
                    x = x_from
                    while 0 <= x < w and abs(x - x_from) < 14 and len(vals) < 4:
                        if solid[y, x]:
                            vals.append(col[y, x])
                        elif vals:
                            break
                        x += step
                    return np.mean(vals, axis=0) if vals else None
                cl = sample(xa - 2, -1)
                cr = sample(xb + 2, 1)
                if cl is None and cr is None:
                    continue
                cl = cr if cl is None else cl
                cr = cl if cr is None else cr
                n = max(1, xb - xa)
                for x in range(xa, xb + 1):
                    if back[x] < 0 or y > back[x]:
                        continue
                    t = (x - xa) / n
                    body[y, x, :3] = cl * (1 - t) + cr * t
                    body[y, x, 3] = 255

        # 4) 앞자락: 밑단 선 위쪽의 몸통 픽셀 (다리 근처만)
        lx = np.nonzero(all_legs.any(axis=0))[0]
        ly = np.nonzero(all_legs.any(axis=1))[0]
        front = np.zeros_like(rgba)
        band = np.zeros((h, w), bool)
        band[max(0, ly.min() - 70):ly.min() + 60, max(0, lx.min() - 50):lx.max() + 60] = True
        fm = fg & above & ~all_legs & band & hem_ok
        front[fm] = rgba[fm]

        parts = {'body': body, 'front': front}
        info = {'legs': {}}
        for key, m in legs.items():
            leg = np.zeros_like(rgba)
            leg[m] = rgba[m]
            # 치마 밑으로 숨는 윗부분을 살색으로 이어 붙인다
            px, py = cfg['legs'][key]['pivot']
            top_y = np.nonzero(m.any(axis=1))[0].min()
            cols = np.nonzero(m[top_y:top_y + 14].any(axis=0))[0]
            ta, tb = cols.min(), cols.max()
            skin_col = col[m & cfg['skin'](r, g, b)].mean(axis=0)
            ext = Image.new('L', (w, h), 0)
            wtop = (tb - ta) * 0.42
            ImageDraw.Draw(ext).polygon(
                [(ta + 1, top_y + 12), (tb - 1, top_y + 12), (px + wtop, py - 6), (px - wtop, py - 6)], fill=255)
            em = (np.array(ext) > 0) & ~m
            leg[em, :3] = skin_col
            leg[em, 3] = 255
            parts['leg_' + key] = leg
            info['legs'][key] = {'pivot': [int(px - bx0), int(py - by0)]}

        for pn, arr in parts.items():
            out = np.clip(arr[by0:by1, bx0:bx1], 0, 255).astype(np.uint8)
            Image.fromarray(out, 'RGBA').save(os.path.join(ROOT, 'assets', f'{name}_{pn}.png'), optimize=True)

        foot_y = int(ys.max() - by0)
        feet = np.nonzero(all_legs[ys.max() - 30:ys.max()].any(axis=0))[0]
        info.update(
            w=int(bx1 - bx0), h=int(by1 - by0),
            foot=[int((feet.min() + feet.max()) / 2 - bx0), foot_y],
            hand=[int(cfg['hand'][0] - bx0), int(cfg['hand'][1] - by0)],
        )
        meta[name] = info

    js = ("/* tools/build_sprites.py 가 만든 파일 — 직접 고치지 마세요 */\n"
          "(function (root) {\n  const DN = (root.DN = root.DN || {});\n  DN.SPRITES = "
          + json.dumps(meta, indent=2).replace('\n', '\n  ') + ";\n"
          "})(typeof globalThis !== 'undefined' ? globalThis : window);\n")
    with open(os.path.join(ROOT, 'js', 'sprites.js'), 'w') as f:
        f.write(js)
    print(json.dumps(meta))


if __name__ == '__main__':
    main()
