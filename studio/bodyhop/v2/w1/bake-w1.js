/*
 * 2기 M1 — 월드 1 그림 굽기 (오너가 고른 시안 1 '손그림 수채 동화풍'의 붓 함수를 그대로 쓴다: ../concepts/c1.js 뒤에 붙여 실행).
 * 수채는 번짐·종이결·글레이즈를 수천 번 겹쳐 그려서 폰에서 매 프레임 그릴 수 없다 → 미리 그림 파일로 굽고, 게임은 그것을 옮겨 놓기만 한다.
 * 결과: bg.jpg(무대 · 마당 · 뒤 새끼줄) · front.png(앞 새끼줄 · 앞 풀) · veil.jpg(곱하기로 덮는 종이결·빛) · atlas.png + 자리표
 */
/* global cast, mk, R, sky, ridge, tree, wash, ellPts, stand, gate, pennants, reserve, arena, rope, slime, bear, ghost, burst, dizzy, heart, tag, star5Pts, polyPath, ink, paperGrain, PAPER */

const W1 = { W: 390, H: 844, cx: 195, cy: 598, rx: 186, ry: 160 };

function bakeBg() {
  const { W, H, cx, cy, rx, ry } = W1;
  const [c, ctx] = mk(W, H);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  const [bgc, bg] = mk(W, H);
  sky(bg, W);
  ridge(bg, W, 262, 70, '#B4C0DC', 0.55, 1.2, { gran: 0.1 });
  ridge(bg, W, 292, 50, '#9DBFA4', 0.6, 3.1, { gran: 0.2 });
  [[372, 312, 48], [30, 316, 40], [334, 322, 30], [95, 318, 24], [290, 318, 22]].forEach((t) => tree(bg, t[0], t[1], t[2], true));
  { const m = [[-10, 336]]; for (let x = 0; x <= W + 10; x += 10) m.push([x, 330 - Math.sin(x / W * Math.PI) * 26 + (R() - 0.5) * 2]); m.push([W + 400, 335], [W + 400, 1600], [-400, 1600], [-400, 335]);
    wash(bg, m, '#A6D06A', 0.65, { gran: 0.5, edge: 0.8, bloom: 3 });
    bg.save(); bg.globalCompositeOperation = 'multiply'; const mg = bg.createLinearGradient(0, 330, 0, 844); mg.addColorStop(0, 'rgba(120,170,90,0)'); mg.addColorStop(0.35, 'rgba(110,170,80,0.45)'); mg.addColorStop(1, 'rgba(70,140,60,0.7)'); bg.fillStyle = mg; bg.fillRect(0, 330, W, 520); bg.restore(); }
  pennants(bg, -10, 150, 140, 268, 30);
  pennants(bg, 400, 140, 250, 268, 34);
  pennants(bg, -10, 236, 400, 232, 42);
  stand(bg, 4, 354, 118, 3, false);
  stand(bg, 268, 354, 118, 3, true);
  gate(bg, 195, 410);
  ctx.save(); ctx.filter = 'blur(0.7px)'; ctx.drawImage(bgc, 0, 0, W, H); ctx.restore();
  ctx.save(); const g = ctx.createLinearGradient(0, 200, 0, 420); g.addColorStop(0, 'rgba(240,236,240,0)'); g.addColorStop(0.4, 'rgba(240,236,240,0.22)'); g.addColorStop(1, 'rgba(240,236,240,0)'); ctx.fillStyle = g; ctx.fillRect(0, 200, W, 220); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) { const px = R() * W, py = 420 + R() * (H - 420); const d = ((px - cx) / (rx + 20)) ** 2 + ((py - cy - 10) / (ry + 30)) ** 2; if (d < 1) continue;
    ctx.strokeStyle = R() < 0.6 ? `rgba(80,140,50,${0.25 + R() * 0.3})` : `rgba(150,190,80,${0.3 + R() * 0.3})`; ctx.lineWidth = 0.8 + R() * 0.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (R() - 0.5) * 3, py - 4 - R() * 6); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < 26; i++) { const px = R() * W, py = 430 + R() * 400; const d = ((px - cx) / (rx + 24)) ** 2 + ((py - cy - 10) / (ry + 32)) ** 2; if (d < 1) continue; const fp = ellPts(px, py, 2, 1.6, 0.1, 8); reserve(ctx, fp); if (i % 2) wash(ctx, fp, ['#F5C830', '#F090B0'][i % 4 > 1 ? 1 : 0], 0.6, { gran: 0, layers: 1 }); }
  arena(ctx, cx, cy, rx, ry);
  rope(ctx, cx, cy, rx - 2, ry - 2, false);
  // 빛 번짐 + 대비(시안과 같은 마감). 종이결·비네트는 veil에서 모든 것 위에 한 번
  const [blc, bl] = mk(W, H); bl.filter = 'blur(12px)'; bl.drawImage(c, 0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.18; ctx.drawImage(blc, 0, 0, W, H); ctx.restore();
  { const [cc, c2] = mk(W, H); c2.drawImage(c, 0, 0, W, H); ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.22; ctx.drawImage(cc, 0, 0, W, H); ctx.restore(); }
  return c;
}

function bakeFront() {
  const { W, H, cx, cy, rx, ry } = W1;
  const [c, ctx] = mk(W, H);
  rope(ctx, cx, cy, rx - 2, ry - 2, true);
  ctx.save(); ctx.filter = 'blur(2.5px)';
  for (let i = 0; i < 10; i++) { const px = i * 42 + R() * 20, py = 842; for (let k = 0; k < 10; k++) { ctx.strokeStyle = k % 2 ? 'rgba(70,130,50,0.6)' : 'rgba(130,180,70,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + k * 2.4, py + 8); ctx.quadraticCurveTo(px + k * 2.4 + 4, py - 8, px + k * 2.4 + (R() - 0.5) * 16, py - 16 - R() * 14); ctx.stroke(); } }
  ctx.restore();
  return c;
}

/** 모든 것 위에 '곱하기'로 덮는 한 장: 아침 빛(왼쪽 위 따뜻, 오른쪽 아래 서늘) · 보랏빛 비네트 · 종이결. 흰색 = 바뀌지 않음 */
function bakeVeil() {
  const { W, H } = W1;
  const [c, ctx] = mk(W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; let g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,236,200,0.5)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(200,205,235,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; g = ctx.createRadialGradient(W / 2, H * 0.56, H * 0.33, W / 2, H * 0.56, H * 0.72); g.addColorStop(0, 'rgba(200,190,220,0)'); g.addColorStop(1, 'rgba(170,150,190,0.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  paperGrain(ctx, W, H);
  return c;
}

/** 한 칸에 그려 투명한 곳을 잘라 낸다. 기준점(발밑)은 칸 안 (ax, ay) */
function cell(w, h, ax, ay, draw) {
  const [c, ctx] = mk(w, h);
  draw(ctx, ax, ay);
  const id = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (id[(y * c.width + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(c.width - 1, x1 + 2); y1 = Math.min(c.height - 1, y1 + 2);
  return { c, sx: x0, sy: y0, sw: x1 - x0 + 1, sh: y1 - y0 + 1, ax: ax * 2 - x0, ay: ay * 2 - y0 };
}

/** 몸 색 넷(시안 그대로) */
const SLIME_COLS = [['#9ACF52', '#4E8A2C'], ['#F0B848', '#B06A20'], ['#C2D850', '#7A8A20'], ['#7CCB8A', '#2E7A50']];
const SLIME_R = 30;

function bakeSprites() {
  // 바닥 그림자는 투명 칸 위에서 '곱하기'가 안 되므로(보라 덩어리) 굽지 않고, 게임이 마당 위에 곱하기로 그린다
  const keepCast = cast; cast = () => {};
  const S = {};
  SLIME_COLS.forEach(([col, dk], i) => {
    S[`slime${i}_idle`] = cell(110, 110, 55, 92, (c, x, y) => slime(c, { x, y, r: SLIME_R, col, dk, look: 0.3 }));
    S[`slime${i}_mad`] = cell(110, 110, 55, 92, (c, x, y) => slime(c, { x, y, r: SLIME_R, col, dk, look: 1, angry: true, mouth: 'shout' }));
    S[`slime${i}_dizzy`] = cell(110, 110, 55, 92, (c, x, y) => slime(c, { x, y, r: SLIME_R, col, dk, eyes: 'dizzy', mouth: 'o' }));
  });
  // 내 몸(청록 눈·청록 테두리) — 색은 첫째(초록)
  S.slime_me = cell(120, 120, 60, 100, (c, x, y) => {
    slime(c, { x, y, r: SLIME_R, eyes: 'teal', mouth: 'o', rim: '#20C8C0', inkc: '#0B6A70' });
  });
  S.bear = cell(230, 230, 120, 200, (c, x, y) => bear(c, x, y, 1));
  S.ghost_dive = cell(150, 170, 75, 85, (c, x, y) => ghost(c, x, y, 22, Math.PI / 2));
  S.ghost_float = cell(150, 170, 75, 85, (c, x, y) => ghost(c, x, y, 22, -Math.PI / 2));
  S.burst = cell(300, 300, 150, 150, (c, x, y) => burst(c, x, y));
  S.dizzy = cell(60, 40, 30, 20, (c, x, y) => dizzy(c, x, y, 14));
  S.heart = cell(30, 30, 15, 15, (c, x, y) => heart(c, x, y, 10));
  S.star_off = cell(30, 30, 15, 15, (c, x, y) => { const sp = star5Pts(x, y, 9.5, 0); c.save(); c.globalCompositeOperation = 'multiply'; polyPath(c, sp); c.fillStyle = 'rgba(160,140,130,0.35)'; c.fill(); c.restore(); ink(c, sp, '#6A4A38', 1.3, { gap: 0.05 }); });
  S.star_on = cell(30, 30, 15, 15, (c, x, y) => { const sp = star5Pts(x, y, 9.5, 0); reserve(c, sp); wash(c, sp, '#F5C030', 0.95, { gran: 0.3, edge: 0.9 }); ink(c, sp, '#8A5010', 1.3, { gap: 0.05 }); });
  S.tag = cell(100, 40, 6, 5, (c, x, y) => tag(c, x, y, 88, 30, '#F2E2C0'));
  S.plank = cell(76, 42, 8, 5, (c, x, y) => tag(c, x, y, 60, 32, '#E0B070'));
  S.card = cell(300, 200, 10, 10, (c, x, y) => tag(c, x, y, 280, 170, '#F6EAD0'));
  cast = keepCast;
  return S;
}

/** 칸들을 한 장(아틀라스)에 줄지어 놓는다 */
function pack(S) {
  const names = Object.keys(S).filter((k) => S[k]);
  const PW = 1024; let x = 0, y = 0, rowH = 0;
  const map = {};
  for (const n of names) { const s = S[n]; if (x + s.sw > PW) { x = 0; y += rowH + 2; rowH = 0; } map[n] = { x, y, w: s.sw, h: s.sh, ax: s.ax, ay: s.ay }; x += s.sw + 2; rowH = Math.max(rowH, s.sh); }
  const at = document.createElement('canvas'); at.width = PW; at.height = y + rowH; const a = at.getContext('2d');
  for (const n of names) { const s = S[n], m = map[n]; a.drawImage(s.c, s.sx, s.sy, s.sw, s.sh, m.x, m.y, m.w, m.h); }
  return { at, map };
}

function bakeAll() {
  const bg = bakeBg(), front = bakeFront(), veil = bakeVeil();
  const { at, map } = pack(bakeSprites());
  return {
    'bg.jpg': bg.toDataURL('image/jpeg', 0.88), 'front.png': front.toDataURL('image/png'), 'veil.jpg': veil.toDataURL('image/jpeg', 0.9),
    'atlas.png': at.toDataURL('image/png'), map,
  };
}
