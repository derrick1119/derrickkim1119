// 도트 인형들: 사람(병사·영웅·도깨비)은 한 틀(doll)에서 옷·모자·무기를 갈아 끼우고, 짐승·소품은 따로 그린다.
import { Spr, P, INK, rng } from './px.js';

const W = 52, HT = 54, OX = 22, OY = 49;   // 인형 판 크기와 발밑 기준점
const c = (name, i = 2) => P[name][i];
const HEAD = [[19, 24], [17, 26], [16, 27], [15, 28], [15, 28], [15, 28], [15, 28], [15, 28], [15, 28], [16, 27], [17, 26], [19, 24]];   // y 18..29

function part(s, fn, dl = 1, dd = 1) { const t = new Spr(s.w, s.h); fn(t); if (dl || dd) t.shade(dl, dd); s.blit(t, 0, 0); }

const HATS = {
  // 전립: 검은 벙거지에 금빛 띠, 붉은 구슬과 상모
  jeonrip(s) {
    part(s, t => { t.rows(11, [[19, 24], [18, 25], [17, 26], [17, 26], [17, 26], [17, 26]], c('black', 1)); t.rows(17, [[12, 31], [10, 33]], c('black', 1)); });
    s.hl(17, 26, 16, c('gold', 2)); s.set(17, 16, c('gold', 3)); s.set(26, 16, c('gold', 1)); s.set(19, 12, c('black', 3)); s.set(19, 13, c('black', 3)); s.hl(12, 20, 17, c('black', 3));
    s.rect(21, 9, 2, 2, c('red', 3)); s.set(21, 9, c('red', 4)); for (const [x, y] of [[20, 10], [19, 11], [18, 12], [17, 13], [17, 14], [16, 15]]) s.set(x, y, c('red', 2)); s.set(18, 11, c('red', 3));
  },
  // 갓: 넓은 양태와 높은 대우
  gat(s) {
    part(s, t => { t.rows(8, [[19, 24], [18, 25], [18, 25], [18, 25], [18, 25], [18, 25], [18, 25], [18, 25], [18, 25]], c('black', 1)); t.rows(17, [[9, 34], [8, 35]], c('black', 1)); });
    s.vl(19, 9, 15, c('black', 3)); s.hl(10, 20, 17, c('black', 3)); s.hl(18, 25, 16, c('black', 0));
    for (const [x, y] of [[15, 26], [16, 28], [17, 30], [28, 26], [27, 28], [26, 30]]) s.set(x, y, c('red', 3));   // 구슬 갓끈
  },
  // 투구: 금빛 투구에 붉은 상모와 드림
  tugu(s) {
    part(s, t => { t.rect(14, 18, 3, 9, c('red', 2)); t.rect(27, 18, 3, 9, c('red', 2)); });
    for (const y of [20, 23, 26]) { s.set(15, y, c('gold', 3)); s.set(28, y, c('gold', 3)); }
    part(s, t => { t.rows(10, [[19, 24], [17, 26], [16, 27], [16, 27], [16, 27], [16, 27], [16, 27], [15, 28]], c('gold', 2)); }, 1, 1);
    s.hl(15, 28, 18, c('gold', 1)); s.hl(16, 27, 17, c('gold', 3)); s.vl(18, 11, 15, c('gold', 4)); s.vl(19, 11, 13, c('gold', 3));
    s.rect(21, 13, 2, 3, c('red', 3)); s.set(21, 13, c('red', 4));
    part(s, t => { t.rect(21, 7, 2, 3, c('gold', 2)); t.ell(21.5, 4, 4.5, 3.2, c('red', 2)); t.set(16, 6, c('red', 2)); t.set(27, 6, c('red', 2)); t.set(17, 7, c('red', 2)); t.set(26, 7, c('red', 2)); });
    s.set(20, 2, c('red', 4)); s.set(19, 3, c('red', 3)); s.set(22, 4, c('red', 1)); s.set(24, 5, c('red', 1));
  },
  // 고깔: 흰 고깔에 색동 띠와 종이꽃
  gokkal(s) {
    part(s, t => { t.rows(8, [[21, 22], [20, 23], [20, 24], [19, 24], [18, 25], [17, 26], [16, 27], [15, 28], [15, 28], [15, 28], [14, 29], [14, 29]], c('white', 3)); });
    for (let x = 14; x <= 29; x++) s.set(x, 20, [c('red', 2), c('gold', 3), c('blue', 2), c('teal', 3)][((x - 14) >> 2) & 3]);
    s.rect(14, 16, 3, 3, c('pink', 2)); s.set(15, 17, c('gold', 3)); s.rect(27, 15, 2, 2, c('gold', 3)); s.set(22, 12, c('white', 2)); s.set(23, 14, c('white', 2));
  },
  // 맨상투와 머리띠
  topknot(s, o) { part(s, t => { t.rect(20, 13, 4, 4, c('black', 1)); t.rows(17, [[18, 25], [16, 27], [15, 28]], c('black', 1)); }); s.hl(20, 23, 16, c(o.band || 'red', 2)); s.hl(15, 28, 20, c(o.band || 'red', 2)); s.set(15, 20, c(o.band || 'red', 3)); s.set(21, 13, c('black', 3)); },
  // 패랭이: 대오리 벙거지
  paeraeng(s) {
    part(s, t => { t.rows(12, [[19, 24], [18, 25], [17, 26], [17, 26], [17, 26]], c('straw', 2)); t.rows(17, [[12, 31], [10, 33]], c('straw', 2)); });
    s.hl(17, 26, 16, c('blue', 2)); for (let x = 12; x <= 31; x += 3) s.set(x, 17, c('straw', 1)); s.set(19, 13, c('straw', 4));
  },
  // 삿갓
  satgat(s) {
    part(s, t => { t.rows(8, [[21, 22], [20, 23], [18, 25], [17, 26], [15, 28], [13, 30], [12, 31], [10, 33], [9, 34], [8, 35]], c('straw', 2)); }, 1, 1);
    for (let k = 0; k < 5; k++) s.line(21 + (k - 2), 9, 9 + k * 6, 17, c('straw', 1)); s.line(20, 9, 12, 15, c('straw', 4));
  },
  // 쪽진 머리와 비녀 (주모)
  jjok(s) { part(s, t => { t.rows(17, [[18, 25], [16, 27], [15, 28], [15, 28]], c('black', 1)); t.ell(13.5, 24, 2.5, 2.5, c('black', 1)); }); s.hl(9, 13, 23, c('gold', 3)); s.set(9, 23, c('teal', 3)); s.vl(21, 17, 20, c('black', 3)); s.hl(15, 28, 20, c('black', 1)); },
  // 헝클어진 도깨비 머리
  wild(s, o) { part(s, t => { t.rows(15, [[18, 24], [16, 27], [15, 28], [14, 29], [14, 29], [14, 29]], c(o.hair || 'black', 1)); for (const [x, y] of [[16, 14], [20, 13], [24, 14], [27, 15], [13, 19], [30, 20], [13, 22], [30, 23]]) t.set(x, y, c(o.hair || 'black', 1)); }); s.set(18, 16, c('black', 3)); s.set(22, 15, c('black', 3)); },
};

const ARMS = {
  // 환도: 손에서 오른쪽 위로 뻗은 칼
  sword(s) { s.line(32, 37, 41, 22, c('steel', 1), 2); s.line(32, 36, 41, 21, c('steel', 3)); s.line(33, 37, 42, 23, c('steel', 2)); s.set(42, 21, c('steel', 4)); s.rect(30, 37, 4, 2, c('gold', 2)); s.set(30, 37, c('gold', 3)); s.rect(29, 39, 2, 3, c('wood', 1)); },
  // 언월도: 긴 자루 끝의 초승달 날과 붉은 삭모
  woldo(s) {
    s.rect(35, 12, 2, 37, c('wood', 2)); s.vl(35, 12, 48, c('wood', 3)); s.rect(34, 47, 4, 2, c('gold', 2));
    s.art(33, 0, ['....ww..', '...wlww.', '..wllsw.', '..wllsw.', '.wlllsw.', '.wllssw.', '.wllsww.', '..wlsw..', '..wssw..', '...ggg..', '..rggr..', '..rrrr..', '...rr...'], { w: c('steel', 1), l: c('steel', 4), s: c('steel', 2), g: c('gold', 2), r: c('red', 2) });
  },
  // 각궁과 메고 있는 화살통
  bow(s) { for (const [x, y] of [[32, 25], [33, 26], [34, 27], [35, 28], [36, 30], [37, 32], [37, 34], [37, 36], [37, 38], [36, 40], [35, 42], [34, 43], [33, 44], [32, 45]]) { s.set(x, y, c('red', 1)); s.set(x, y + 1, c('red', 1)); s.set(x - 1, y, c('gold', 2)); } s.vl(31, 25, 46, c('white', 3)); s.set(31, 24, c('gold', 3)); s.set(31, 47, c('gold', 3)); },
  quiver(s) { part(s, t => t.rect(11, 27, 4, 10, c('wood', 2))); for (const x of [11, 13, 14]) { s.vl(x, 23, 26, c('wood', 3)); s.set(x, 22, c('white', 4)); s.set(x, 23, c('red', 2)); } },
  // 등패: 둥근 등나무 방패와 짧은 칼
  shield(s) {
    s.line(30, 30, 34, 22, c('steel', 3), 2); s.set(35, 21, c('steel', 4));
    part(s, t => t.ell(34, 39, 7, 7, c('straw', 2)), 1, 2); for (const r of [5, 3]) for (let a = 0; a < 24; a++) { const x = Math.round(34 + Math.cos(a / 24 * 6.283) * r), y = Math.round(39 + Math.sin(a / 24 * 6.283) * r); s.set(x, y, c('straw', 1)); }
    s.rect(33, 38, 3, 3, c('red', 2)); s.set(33, 38, c('gold', 4)); s.set(34, 39, c('gold', 3));
  },
  // 장창
  spear(s) { s.rect(35, 10, 2, 39, c('wood', 2)); s.vl(35, 10, 48, c('wood', 3)); s.art(34, 2, ['.ll.', '.ls.', 'llss', 'llss', '.ls.', '.ls.', 'rggr', 'rrrr', '.rr.'], { l: c('steel', 4), s: c('steel', 2), g: c('gold', 2), r: c('red', 2) }); },
  // 방망이
  club(s) { part(s, t => { t.line(32, 38, 39, 24, c('wood', 2), 3); t.ell(39, 22, 3.2, 4.5, c('wood', 2)); }, 1, 1); for (const [x, y] of [[38, 20], [41, 23], [38, 25], [40, 19]]) s.set(x, y, c('wood', 4)); s.set(39, 22, c('wood', 1)); },
  // 부채(무녀): 오방색 살
  fan(s) { const cols = [c('red', 2), c('gold', 3), c('blue', 3), c('white', 3), c('teal', 3)]; for (let k = 0; k < 5; k++) { const a = -1.9 + k * 0.42; s.line(33, 37, Math.round(33 + Math.cos(a) * 9), Math.round(37 + Math.sin(a) * 9), cols[k], 2); } s.set(33, 37, c('wood', 1)); s.set(34, 37, c('wood', 1)); s.rect(10, 36, 3, 3, c('gold', 3)); s.set(10, 36, c('gold', 4)); s.set(11, 39, c('gold', 2)); },
  // 부적(도사)
  talisman(s) { s.rect(32, 28, 5, 9, c('gold', 3)); s.vl(36, 28, 36, c('gold', 2)); for (const [x, y] of [[33, 29], [34, 30], [33, 31], [34, 32], [35, 33], [34, 34], [33, 35]]) s.set(x, y, c('red', 2)); },
};

// o: { skin, hair, hat, style, top, robe, legs, sash, git, face, beard, arm, back, band, bulk }
export function doll(o) {
  const s = new Spr(W, HT, OX, OY), skin = o.skin || 'skin', sb = o.skinBase === undefined ? 3 : o.skinBase, K = INK, bulk = o.bulk ? 1 : 0;
  if (o.back) o.back(s);
  if (o.cape) part(s, t => t.rows(29, [[14, 29], [13, 30], [12, 31], [12, 31], [11, 32], [11, 32], [11, 32], [10, 33], [10, 33], [10, 33], [10, 33], [11, 32], [11, 33], [12, 33]], c(o.cape, 1)), 0, 1);
  const st = o.style || 'soldier';
  // 다리와 신
  if (st === 'bare') { part(s, t => { t.rect(17, 41, 4, 6, c(skin, sb)); t.rect(23, 41, 4, 6, c(skin, sb)); t.rect(16, 46, 5, 2, c(skin, sb)); t.rect(23, 46, 5, 2, c(skin, sb)); }); s.set(16, 47, c('white', 3)); s.set(18, 47, c('white', 3)); s.set(25, 47, c('white', 3)); s.set(27, 47, c('white', 3)); }
  else if (st !== 'hanbok' && st !== 'ghost') { part(s, t => { t.rect(17, 38, 4, 8, c(o.legs || 'white', 3)); t.rect(23, 38, 4, 8, c(o.legs || 'white', 3)); }); s.rect(16, 46, 5, 2, c('black', 1)); s.rect(23, 46, 5, 2, c('black', 1)); s.set(16, 46, c('black', 3)); s.set(23, 46, c('black', 3)); if (st === 'armor') { s.rect(17, 43, 4, 3, c('black', 2)); s.rect(23, 43, 4, 3, c('black', 2)); } }
  // 몸통
  const top = o.top || 'blue', robe = o.robe || top, x0 = 16 - bulk, x1 = 27 + bulk;
  if (st === 'bare') {
    part(s, t => { t.rows(29, [[17, 26], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1]], c(skin, sb)); }, 1, 1);
    s.hl(19, 20, 32, c(skin, sb - 1)); s.hl(23, 24, 32, c(skin, sb - 1)); s.vl(21, 31, 34, c(skin, sb - 1)); s.set(21, 35, c(skin, sb - 2));
    part(s, t => t.rows(36, [[x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0 + 0, x1], [x0, x1]], c('cream', 2)), 1, 1); s.vl(21, 39, 41, c('cream', 0)); s.vl(22, 39, 41, c('cream', 0));
    for (let x = x0; x <= x1; x++) s.set(x, 36, x % 2 ? c('straw', 3) : c('straw', 1)); s.vl(19, 37, 39, c('straw', 3)); s.set(19, 40, c('straw', 2));
    for (const [x, y] of [[x0 + 1, 41], [x0 + 3, 41], [x1 - 2, 41], [x1, 41]]) s.set(x, y, -1);
  } else if (st === 'hanbok') {
    part(s, t => t.rows(34, [[16, 27], [15, 28], [15, 28], [14, 29], [14, 29], [13, 30], [13, 30], [12, 31], [12, 31], [12, 31], [11, 32], [11, 32], [11, 32], [12, 31]], c(robe, 3)), 1, 2);
    for (let x = 11; x <= 32; x++) { if (s.get(x, 45) !== -1) s.set(x, 45, [c('red', 2), c('gold', 3), c('blue', 3)][((x + 1) >> 1) % 3]); }
    s.vl(18, 37, 43, c(robe, 2)); s.vl(24, 38, 44, c(robe, 2)); s.vl(21, 36, 42, c(robe, 4));
    part(s, t => t.rows(29, [[17, 26], [16, 27], [16, 27], [16, 27], [16, 27]], c(top, 3)), 1, 1);
    s.rect(21, 31, 2, 2, c('red', 2)); s.vl(21, 33, 38, c('red', 2)); s.vl(23, 33, 36, c('red', 3));
  } else if (st === 'ghost') {
    part(s, t => { t.rows(29, [[17, 26], [16, 27], [16, 27], [16, 27], [16, 27], [15, 28], [15, 28], [15, 28], [14, 29], [14, 29], [14, 29], [14, 29], [15, 28], [15, 28], [16, 27]], c(robe, 3)); }, 1, 2);
    for (const [x, y] of [[15, 44], [17, 45], [18, 46], [20, 44], [21, 46], [22, 47], [24, 45], [25, 46], [27, 44], [28, 43]]) { s.set(x, y, c(robe, 3)); s.set(x, y - 1, c(robe, 3)); }
    for (const [x, y] of [[16, 43], [19, 44], [23, 44], [26, 43]]) s.set(x, y, -1);
    s.vl(19, 36, 42, c(robe, 2)); s.vl(24, 37, 43, c(robe, 2));
  } else {
    const long = st === 'robe';
    part(s, t => { t.rows(29, [[17, 26], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1], [x0, x1]], c(top, 2)); t.rows(38, long ? [[15, 28], [15, 28], [15, 28], [15, 28], [14, 29], [14, 29], [14, 29], [14, 29]] : [[15, 28], [15, 28], [15, 28], [15, 28]], c(robe, 2)); }, 1, 2);
    if (long) { s.vl(19, 39, 44, c(robe, 1)); s.vl(24, 40, 45, c(robe, 1)); s.vl(21, 38, 43, c(robe, 3)); if (o.hem) s.hl(14, 29, 45, c(o.hem, 2)); }
    else { s.vl(21, 38, 41, c(robe, 1)); if (o.hem) s.hl(15, 28, 41, c(o.hem, 3)); }
    // 깃(동정)과 허리띠
    const git = c(o.git || 'white', 3); for (const [x, y] of [[19, 29], [20, 30], [21, 31], [22, 32], [24, 29], [23, 30], [22, 31]]) s.set(x, y, git);
    s.hl(x0, x1, 36, c(o.sash || 'gold', 2)); s.hl(x0, x1, 37, c(o.sash || 'gold', 1)); s.set(x0, 36, c(o.sash || 'gold', 3)); s.rect(20, 36, 3, 2, c(o.sash || 'gold', 3)); s.vl(20, 38, 40, c(o.sash || 'gold', 2));
    if (st === 'armor') {   // 두정갑: 금징과 견갑, 갑옷 자락의 금단
      for (let y = 31; y <= 34; y += 2) for (let x = 17 + (y % 4 === 1 ? 1 : 0); x <= 26; x += 2) s.set(x, y, c('gold', 3));
      for (let x = 16; x <= 27; x += 2) s.set(x, 39, c('gold', 3));
      part(s, t => { t.ell(15, 30.5, 2.6, 2.2, c('gold', 2)); t.ell(28, 30.5, 2.6, 2.2, c('gold', 2)); }, 1, 1);
      s.rect(20, 32, 4, 3, c('blue', 1)); s.set(21, 33, c('gold', 3)); s.set(22, 33, c('gold', 3)); s.set(20, 32, c('blue', 2));   // 흉배
    }
    if (o.vest) { part(s, t => { t.rect(x0, 30, 4, 6, c(o.vest, 2)); t.rect(x1 - 3, 30, 4, 6, c(o.vest, 2)); }, 1, 1); }
  }
  // 팔과 손
  const sleeve = st === 'bare' ? skin : (o.sleeve || top), si = st === 'bare' ? sb : (st === 'hanbok' ? 3 : 2);
  part(s, t => { t.rect(13 - bulk, 31, 3 + bulk, 6, c(sleeve, si)); t.rect(28, 31, 3 + bulk, 6, c(sleeve, si)); if (st === 'hanbok' || st === 'robe') { t.rect(12, 34, 4, 4, c(sleeve, si)); t.rect(28, 34, 4, 4, c(sleeve, si)); } }, 1, 1);
  part(s, t => { t.rect(13 - bulk, 37, 3, 3, c(skin, sb)); t.rect(29 + bulk, 37, 3, 3, c(skin, sb)); }, 1, 1);
  if (o.cuff) { s.hl(13, 15, 36, c(o.cuff, 3)); s.hl(28, 30, 36, c(o.cuff, 3)); }
  // 머리
  part(s, t => t.rows(18, HEAD, c(skin, sb)), 1, 1);
  if (o.hair !== false && st !== 'bare') { const hc = c(o.hair || 'black', 1); s.rows(18, [[19, 24], [17, 26], [16, 27], [15, 28]], hc); s.vl(15, 21, 24, hc); s.vl(28, 21, 25, hc); s.vl(16, 21, 22, hc); if (o.longHair) { s.vl(14, 22, 31, hc); s.vl(15, 24, 32, hc); s.vl(29, 22, 30, hc); s.set(15, 25, c(o.hair || 'black', 2)); } }
  if (o.hat && HATS[o.hat]) HATS[o.hat](s, o);
  // 얼굴: 살짝 오른쪽을 본다
  const f = o.face || {}, ey = 23, ec = f.eye === undefined ? K : f.eye;
  if (!o.noFace) {
    s.hl(17, 27, 21, c(skin, sb - 1));   // 모자·머리칼 아래 그늘
    if (f.type === 'dok') {   // 도깨비: 노란 눈, 치켜뜬 눈썹, 이를 드러낸 큰 입
      s.rect(18, 22, 3, 3, c('gold', 4)); s.rect(24, 22, 3, 3, c('gold', 4)); s.set(19, 23, c('red', 2)); s.set(25, 23, c('red', 2)); s.set(20, 23, K); s.set(26, 23, K);
      s.line(17, 20, 21, 22, K); s.line(27, 20, 23, 22, K); s.set(22, 25, c(skin, sb - 2)); s.set(23, 25, c(skin, sb - 2));
      s.rect(18, 26, 9, 3, K); s.hl(19, 25, 27, c('white', 4)); s.set(21, 27, c('white', 2)); s.set(23, 27, c('white', 2)); s.set(19, 26, c('white', 4)); s.set(25, 26, c('white', 4));
    } else {
      for (const ex of [19, 25]) { s.rect(ex, ey, 2, 3, ec); s.set(ex, ey, c('white', 4)); if (f.lash) s.set(ex - 1, ey, K); }
      const bc = c(o.hair || 'black', 1);
      if (f.brow === 'stern') { s.set(18, 21, bc); s.set(19, 21, bc); s.set(20, 22, bc); s.set(21, 22, bc); s.set(27, 21, bc); s.set(26, 21, bc); s.set(25, 22, bc); s.set(24, 22, bc); }
      else if (f.brow === 'white') { s.hl(18, 21, 21, c('white', 4)); s.hl(24, 27, 21, c('white', 4)); }
      else { s.hl(18, 20, 21, bc); s.hl(25, 27, 21, bc); }
      s.set(23, 25, c(skin, sb - 1));
      if (f.blush) { s.hl(16, 17, 26, c('pink', 3)); s.hl(27, 28, 26, c('pink', 3)); }
      if (f.mouth === 'smile') { s.set(21, 27, c('red', 1)); s.hl(22, 23, 28, c('red', 1)); s.set(24, 27, c('red', 1)); }
      else if (f.mouth !== false) { s.hl(22, 23, 27, f.lip ? c('red', 2) : c('red', 0)); }
      if (o.beard) { const bd = c(o.beard, o.beard === 'white' ? 3 : 1); s.rows(25, [[16, 18], [16, 19], [16, 27], [17, 26], [18, 25], [19, 24]], bd); s.hl(26, 27, 25, bd); s.hl(25, 27, 26, bd); s.hl(20, 24, 26, bd); s.hl(22, 23, 27, c('red', 0)); if (o.beard === 'white') { s.rows(31, [[19, 24], [20, 23], [21, 22]], bd); s.vl(21, 28, 32, c('white', 2)); } else { s.set(19, 28, c('black', 3)); s.set(22, 29, c('black', 3)); } }
      else if (f.stache) { s.hl(21, 24, 26, c('black', 1)); s.set(20, 27, c('black', 1)); s.set(25, 27, c('black', 1)); }
    }
  }
  if (o.arm) for (const a of [].concat(o.arm)) ARMS[a](s);
  if (o.front) o.front(s);
  return s.outline();
}

// ── 호랑이 (고개 호랑이): 오른쪽을 보고 그린다. 민화의 범처럼 둥근 얼굴, 큰 눈, 등에서 내려오는 쐐기 줄무늬 ──
export function tiger() {
  const s = new Spr(104, 68, 50, 63), T = n => c('tiger', n), K = INK, B = c('black', 1), Wt = c('cream', 4);
  // 꼬리: S 자로 말아 올린다
  part(s, t => { t.line(14, 34, 7, 30, T(2), 4); t.line(7, 30, 4, 20, T(2), 4); t.line(4, 20, 9, 11, T(2), 4); t.line(9, 11, 16, 8, T(2), 3); t.rect(15, 6, 5, 4, B); }, 1, 1);
  for (const [x, y] of [[5, 28], [3, 23], [4, 17], [8, 12]]) s.hl(x, x + 3, y, B);
  // 뒤쪽 다리 (어둡게)
  part(s, t => { t.rect(29, 44, 7, 16, T(1)); t.rect(28, 59, 10, 4, T(1)); t.rect(48, 44, 7, 16, T(1)); t.rect(48, 59, 10, 4, T(1)); }, 0, 1);
  // 몸통: 엉덩이 · 허리 · 어깨
  part(s, t => { t.ell(40, 36, 17, 11, T(2)); t.ell(56, 35, 12, 14, T(2)); t.ell(25, 37, 13, 13, T(2)); }, 2, 2);
  part(s, t => t.ell(42, 46, 14, 3, Wt), 0, 0);
  // 줄무늬: 등에서 배로 가늘어지는 쐐기
  for (const [x, y, len, w] of [[17, 26, 10, 4], [24, 24, 12, 4], [31, 25, 12, 4], [38, 25, 13, 4], [45, 24, 12, 4], [52, 22, 12, 4]]) s.poly([[x, y], [x + w, y], [x + w - 2, y + len], [x + 1, y + len - 2]], B);
  // 앞쪽 다리와 발
  part(s, t => { t.ell(21, 42, 9, 10, T(2)); t.poly([[15, 46], [25, 46], [24, 60], [17, 60]], T(2)); t.rect(15, 59, 13, 4, T(2)); t.poly([[54, 40], [67, 40], [65, 60], [57, 60]], T(2)); t.rect(56, 59, 12, 4, T(2)); }, 1, 2);
  part(s, t => t.ell(60, 40, 4, 6, c('cream', 4)), 0, 0);
  for (const [lx, w] of [[16, 9], [56, 9]]) { s.hl(lx, lx + 4, 46, B); s.hl(lx + w - 5, lx + w - 1, 50, B); s.hl(lx, lx + 3, 54, B); }
  for (const px of [16, 57]) { s.set(px + 3, 62, Wt); s.set(px + 6, 62, Wt); s.set(px + 9, 62, Wt); s.vl(px + 4, 60, 61, T(1)); s.vl(px + 7, 60, 61, T(1)); }
  // 귀
  part(s, t => { t.poly([[58, 17], [62, 8], [67, 15]], T(2)); t.poly([[77, 15], [82, 8], [86, 17]], T(2)); }, 1, 1);
  for (const [x, y] of [[62, 12], [62, 13], [63, 14], [82, 12], [82, 13], [81, 14]]) s.set(x, y, c('pink', 2)); s.set(62, 9, B); s.set(82, 9, B);
  // 머리와 볼 털
  part(s, t => { t.ell(72, 28, 14.5, 13, T(2)); t.poly([[58, 30], [54, 35], [60, 36]], T(2)); t.poly([[86, 30], [90, 35], [84, 36]], T(2)); t.poly([[59, 34], [57, 39], [63, 38]], T(2)); t.poly([[85, 34], [87, 39], [81, 38]], T(2)); }, 2, 2);
  // 흰 주둥이와 턱
  part(s, t => { t.ell(72, 34, 8, 5.5, Wt); t.ell(72, 38, 5, 3, Wt); }, 0, 1);
  // 눈 위 흰 점과 이마 무늬 (글자처럼 보이지 않게 굽은 쐐기 둘과 점 하나)
  s.rect(64, 19, 4, 2, c('cream', 3)); s.rect(77, 19, 4, 2, c('cream', 3));
  s.line(68, 15, 70, 19, B, 2); s.line(77, 15, 75, 19, B, 2); s.rect(72, 16, 2, 2, B);
  s.hl(58, 62, 27, B); s.hl(58, 61, 31, B); s.hl(83, 87, 27, B); s.hl(84, 87, 31, B);
  // 눈: 노란 눈에 세로 눈동자, 치켜 올라간 검은 눈썹
  for (const ex of [63, 76]) { s.rect(ex, 22, 6, 5, c('gold', 3)); s.hl(ex + 1, ex + 4, 21, K); s.set(ex, 22, K); s.set(ex + 5, 22, K); s.hl(ex, ex + 5, 27, K); s.rect(ex + 2, 22, 2, 5, K); s.set(ex + 1, 23, c('white', 4)); s.set(ex + 4, 25, c('gold', 4)); }
  s.line(61, 18, 68, 21, K, 2); s.line(84, 18, 77, 21, K, 2);
  // 코·입·송곳니·혀·수염
  s.rect(70, 30, 5, 3, c('pink', 1)); s.hl(70, 73, 30, c('pink', 2)); s.vl(72, 33, 34, K);
  s.rect(66, 35, 13, 5, c('red', 0)); s.hl(65, 79, 35, K); s.rect(70, 38, 5, 2, c('pink', 2)); s.set(72, 38, c('pink', 3));
  for (const fx of [66, 77]) { s.rect(fx, 36, 2, 3, c('white', 4)); s.set(fx + (fx < 70 ? 0 : 1), 39, c('white', 4)); } s.set(69, 36, c('white', 4)); s.set(75, 36, c('white', 4));
  for (const [x, y] of [[66, 32], [68, 33], [76, 33], [78, 32]]) s.set(x, y, T(0));
  for (const [x0, y0, x1, y1] of [[64, 32, 55, 30], [64, 34, 55, 35], [80, 32, 89, 30], [80, 34, 89, 35]]) s.line(x0, y0, x1, y1, c('white', 4));
  return s.outline();
}

// ── 장승: 길가의 나무 장승 ──
export function jangseung(kind = 0) {
  const s = new Spr(22, 52, 10, 50), Wd = n => c('wood', n);
  part(s, t => { t.rect(5, 8, 11, 42, Wd(2)); t.rows(2, [[7, 13], [6, 14], [5, 15], [4, 16], [4, 16], [4, 16]], Wd(kind ? 1 : 0)); }, 1, 2);
  s.vl(8, 10, 48, Wd(1)); s.vl(13, 20, 46, Wd(1)); s.set(9, 30, Wd(1)); s.set(12, 38, Wd(3));
  s.rect(6, 12, 3, 3, c('white', 4)); s.rect(12, 12, 3, 3, c('white', 4)); s.set(7, 13, INK); s.set(13, 13, INK); s.line(5, 10, 9, 11, INK); s.line(15, 10, 11, 11, INK);
  s.vl(10, 14, 18, Wd(0)); s.rect(6, 21, 9, 4, INK); for (let x = 7; x <= 13; x += 2) s.rect(x, 22, 1, 2, c('white', 4));
  if (kind) s.vl(10, 27, 30, c('red', 2));
  s.set(4, 49, c('grass', 3)); s.set(16, 49, c('grass', 3)); s.set(3, 48, c('grass', 2)); s.set(17, 48, c('grass', 3));
  return s.outline();
}

// ── 군기 수레: 태극 깃발과 북 ──
export function bannerCart() {
  const s = new Spr(46, 64, 22, 60);
  part(s, t => { t.rect(8, 44, 28, 6, c('wood', 2)); t.rect(4, 46, 6, 3, c('wood', 2)); }, 1, 1);
  for (const cx of [14, 31]) { part(s, t => t.ell(cx, 53, 5.5, 5.5, c('wood', 1)), 1, 1); s.rect(cx - 1, 52, 2, 2, c('gold', 2)); s.hl(cx - 4, cx + 3, 52, c('wood', 3)); s.vl(cx, 49, 56, c('wood', 3)); }
  part(s, t => t.rect(22, 34, 10, 10, c('red', 2)), 1, 1); s.hl(22, 31, 34, c('gold', 3)); s.hl(22, 31, 43, c('gold', 2)); s.rect(25, 37, 4, 4, c('cream', 3));
  s.rect(15, 4, 2, 40, c('wood', 3)); s.vl(16, 4, 43, c('wood', 1)); s.rect(14, 2, 4, 3, c('gold', 3));
  part(s, t => t.rows(6, [[17, 38], [17, 39], [17, 39], [17, 40], [17, 40], [17, 40], [17, 40], [17, 40], [17, 40], [17, 39], [17, 39], [17, 38], [17, 38], [17, 36]], c('blue', 2)), 1, 1);
  s.ell(28, 12.5, 4, 4, c('white', 4)); for (let y = 9; y <= 16; y++) for (let x = 24; x <= 32; x++) if (s.get(x, y) === c('white', 4)) s.set(x, y, y < 13 - Math.sin((x - 28) / 4 * 1.57) * 2 ? c('red', 2) : c('blue', 3));
  for (const [x, y] of [[20, 8], [35, 8], [20, 17], [35, 17]]) { s.hl(x, x + 2, y, INK); }
  return s.outline();
}

// ── 풍경 소품 ──
export function pine(seed = 1, sc = 1) {
  const R = rng(seed), s = new Spr(70, 70, 34, 66);
  part(s, t => { t.line(34, 64, 32, 44, c('wood', 1), 4); t.line(32, 44, 38, 30, c('wood', 1), 3); t.line(38, 30, 34, 18, c('wood', 1), 3); t.line(33, 46, 20, 36, c('wood', 1), 2); t.line(37, 34, 50, 28, c('wood', 1), 2); }, 1, 0);
  s.vl(33, 48, 62, c('wood', 3)); s.set(36, 38, c('wood', 3)); s.set(35, 24, c('wood', 3));
  const pad = (cx, cy, rx, ry) => part(s, t => { t.ell(cx, cy, rx, ry, c('pine', 2)); t.ell(cx - rx * 0.4, cy - 1, rx * 0.5, ry * 0.8, c('pine', 2)); }, 1, 2);
  for (const [cx, cy, rx, ry] of [[18, 34, 12, 5], [52, 26, 12, 5], [34, 14, 16, 6], [24, 22, 10, 4], [46, 16, 9, 4]]) { pad(cx, cy, rx, ry); for (let k = 0; k < rx * 1.2; k++) { const x = Math.round(cx - rx + R() * rx * 2), y = Math.round(cy - ry + R() * ry); if (s.get(x, y) !== -1 && s.get(x, y - 1) !== -1) s.set(x, y, c('pine', R() < 0.5 ? 4 : 3)); } }
  return s.outline(P.pine[0]);
}
export function sansuyu(seed = 3) {
  const R = rng(seed), s = new Spr(60, 56, 30, 54);
  const br = (x0, y0, x1, y1, th) => s.line(x0, y0, x1, y1, c('wood', 0), th);
  br(30, 54, 29, 38, 3); br(29, 38, 18, 24, 2); br(29, 40, 42, 24, 2); br(18, 24, 10, 14, 1); br(18, 24, 22, 10, 1); br(42, 24, 50, 14, 1); br(42, 24, 38, 10, 1); br(30, 44, 30, 20, 1); br(24, 31, 14, 30, 1); br(36, 31, 48, 32, 1);
  s.vl(29, 42, 52, c('wood', 2));
  for (const [x, y] of [[10, 14], [22, 10], [50, 14], [38, 10], [30, 20], [14, 30], [48, 32], [16, 20], [44, 18], [26, 16], [34, 14], [20, 28], [40, 28], [8, 20], [53, 22]]) for (let k = 0; k < 7; k++) { const px = x + Math.round((R() - 0.5) * 7), py = y + Math.round((R() - 0.5) * 6); s.set(px, py, c('gold', R() < 0.35 ? 4 : 3)); if (R() < 0.3) s.set(px + 1, py + 1, c('gold', 2)); }
  return s;
}
export function rock(w = 16, seed = 1) { const s = new Spr(w + 4, w, (w + 4) >> 1, w - 2); part(s, t => { t.ell(w / 2 + 1, w * 0.62, w / 2, w * 0.34, c('stone', 2)); t.ell(w * 0.4, w * 0.5, w * 0.3, w * 0.3, c('stone', 2)); }, 1, 2); s.set((w * 0.4) | 0, (w * 0.4) | 0, c('stone', 4)); s.hl(2, w, w - 2, c('grass', 2)); s.set(1, w - 3, c('grass', 3)); s.set(w + 1, w - 3, c('grass', 3)); return s.outline(P.stone[0]); }
export function tuft(k = 0) { const s = new Spr(9, 7, 4, 6), g3 = c('grass', k % 2 ? 3 : 2), g4 = c('grass', 4); for (const [x, y0] of [[1, 3], [3, 1], [4, 0], [6, 2], [7, 4]]) s.vl(x, y0, 6, g3); s.set(4, 0, g4); s.set(3, 1, g4); if (k % 3 === 0) { s.set(2, 2, c('gold', 4)); s.set(6, 1, c('white', 4)); } return s; }
// 청사초롱
export function lantern(col = 'red') { const s = new Spr(12, 22, 6, 2); s.vl(5, 0, 3, c('wood', 1)); part(s, t => t.rows(4, [[3, 8], [2, 9], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [2, 9], [3, 8]], c(col, 2)), 1, 1); s.hl(3, 8, 4, c('gold', 2)); s.hl(3, 8, 13, c('gold', 2)); s.rect(4, 7, 4, 4, c('gold', 4)); s.set(5, 8, c('white', 4)); for (const x of [4, 6, 7]) s.vl(x, 14, 17 + (x % 2), c('gold', 3)); return s.outline(); }

// ── 병사·영웅·요괴 차림 ──
export const LOOKS = {
  commander: () => doll({ style: 'armor', top: 'red', robe: 'red', hem: 'gold', legs: 'black', hat: 'tugu', beard: 'black', face: { brow: 'stern' }, arm: 'woldo', cape: 'blue', sash: 'gold' }),
  sword: () => doll({ top: 'red', robe: 'blue', legs: 'white', hat: 'jeonrip', vest: 'black', sash: 'gold', hem: 'gold', face: { brow: 'stern' }, arm: 'sword' }),
  archer: () => doll({ top: 'white', robe: 'white', legs: 'white', hat: 'topknot', band: 'blue', vest: 'blue', sash: 'red', face: {}, arm: 'bow', back: s => ARMS.quiver(s) }),
  shield: () => doll({ top: 'teal', robe: 'teal', legs: 'white', hat: 'topknot', band: 'gold', sash: 'gold', face: { brow: 'stern', stache: true }, arm: 'shield' }),
  spear: () => doll({ top: 'cream', robe: 'cream', legs: 'white', hat: 'paeraeng', vest: 'wood', sash: 'red', face: {}, arm: 'spear' }),
  priest: () => doll({ style: 'hanbok', top: 'white', robe: 'white', hat: 'gokkal', longHair: true, face: { blush: true, lash: true, lip: true }, arm: 'fan' }),
  wizard: () => doll({ style: 'robe', top: 'steel', robe: 'steel', hem: 'black', sash: 'black', hat: 'gat', beard: 'black', face: { brow: 'stern' }, arm: 'talisman', git: 'white' }),
  blade: () => doll({ style: 'robe', top: 'night', robe: 'night', hem: 'red', sash: 'red', hat: 'satgat', git: 'red', face: { brow: 'stern', lash: true }, arm: 'sword' }),
  jumo: () => doll({ style: 'hanbok', top: 'teal', robe: 'blue', hat: 'jjok', face: { blush: true, lash: true, lip: true, mouth: 'smile' } }),
  goblin: () => doll({ style: 'bare', skin: 'dok', skinBase: 2, hat: 'paeraeng', face: { type: 'dok' }, arm: 'club' }).flipped(),
  ogre: () => doll({ style: 'bare', skin: 'dokb', skinBase: 2, hat: 'wild', bulk: 1, face: { type: 'dok' }, arm: 'club' }).flipped(),
  ghost: () => doll({ style: 'ghost', skin: 'pale', skinBase: 3, top: 'pale', robe: 'pale', hat: 'jeonrip', hair: 'night', face: { eye: P.night[2], mouth: false }, arm: 'sword' }).flipped(),
  tiger: () => tiger().flipped(),
};
const CACHE = new Map();
export const look = k => { let s = CACHE.get(k); if (!s) CACHE.set(k, s = LOOKS[k]()); return s; };
