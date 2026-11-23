// 전장 렌더러: 한지 배경, y 정렬된 종이 인형과 지형지물, 장판, 투사체, 이펙트
import { W, H, VIEW, MID_Y } from '../config.js';
import { TAU, INK, PAPER, RED, REDD, INDIGO, OCHRE, TEAL, FONT_B, text, ell, rr, rrPath, poly, line, path, st, drawSprite, clamp, lerp, easeOutBack } from './draw.js';
import { getLook, getWeapon, blinking, leftover } from './sprites.js';
import { defOf } from '../sim/battle.js';
import { CALL_R } from '../data/bossalt.js';
import { HERO_COL, HERO_SEAL, HERO_SKILLS } from '../data/units.js';
import { inkTrail, inkStreak, MEOK, JU } from './ink.js';
import { CARDS } from '../data/cards.js';
import { makeGround, makeFar, makeFrame, makeBackdrop, scenePines, vignette, backlight, stopSprite, obstacleSprite, obstacleBase, drawRiver, GW, FW, BW, FAR_H, THEMES } from './terrain.js';
import { Fx, glow, trailImg } from './fx.js';
import { paintFar, paintBack, paintGround, paintFront, paintTrees } from './painted.js';
import { forkArt, drawForkGlow, LM_K } from './forkmap.js';
import { icon } from '../ui/ui.js';

const PI = Math.PI;
// 쓰러진 자리에 남는 것
const LEFT = { goblin: 'broom', orc: 'bat', garcher: 'sandal', rshield: 'lid', shaman: 'poker', skel: 'hopae', skelarcher: 'hopae', dueok: 'bat', yagwang: 'sandal' };
function swing(p) { if (p < 0.28) return lerp(0, -0.9, p / 0.28); if (p < 0.55) return lerp(-0.9, 1.7, (p - 0.28) / 0.27); return lerp(1.7, 0, (p - 0.55) / 0.45); }

// 맞았을 때 움찔하는 시간(초)과 가장 크게 밀리는 거리(픽셀, 인형 크기에 비례)
const HIT_T = 0.22, HIT_PX = 6;
// 종이 인형 한 장: 걷기는 깡충거림과 기울임, 공격은 내지르기와 무기 휘두르기
// T = 화면의 시계(걸음·깜빡임), ST = 전투의 시계(공격·등장 시각은 전투 시간으로 적혀 있다)
export function drawUnit(g, u, T, alpha = 1, march = false, ST = T) {
  // 그슨대는 살아 있는 동안 점점 커진다
  const L = getLook(u.look || (u.tails !== undefined && u.tails < 9 ? 'gumiho' + Math.max(1, u.tails) : u.type)), k = L.scale * (u.grown ? 1 + u.grown * (u.def && u.def.boss ? 0.045 : 0.075) : 1), hold = L.hold, WP = u.def && u.def.wpn ? getWeapon(u.def.wpn) : null;
  const mode = WP ? WP.mode : hold.mode, ha = WP ? WP.a : hold.a, wspr = WP ? WP.spr : L.weapon, hand = WP ? WP.hand : 'R';
  const c = Math.cos(u.facing), s = Math.sin(u.facing);
  if (u._dir === undefined) { u._dir = u.team === 0 ? 1 : -1; u._flipT = -9; }
  const nd = c > 0.35 ? 1 : c < -0.35 ? -1 : u._dir; if (nd !== u._dir) { u._dir = nd; u._flipT = T; }
  // 방향을 바꿀 때는 종이를 뒤집듯 가로로 접혔다 펴진다
  const fk = clamp((T - u._flipT) / 0.16, 0, 1), dir = u._dir, flip = fk < 1 ? Math.max(0.12, Math.abs(1 - 2 * fk)) * (fk < 0.5 ? -1 : 1) : 1;
  // 행군 중에는 제자리걸음으로 앞을 보고 걷는다 (앞서 나가 기다리는 병사는 서 있는다)
  const walkin = march && u.team === 0 && !u.waiting; if (walkin) u._dir = 1;
  const ph = walkin ? T * 8.5 + u.id : u.walk * 0.26, moving = (u.moving || walkin) && !L.still;
  let hop = moving ? Math.abs(Math.sin(ph)) * 3.2 : 0, tilt = moving ? Math.sin(ph) * 0.085 : Math.sin(T * 2 + u.id) * 0.018;
  if (L.float) hop += 3 + Math.sin(T * 3.2 + u.id) * 2.2;
  if (L.still) { tilt = 0; hop = u.moving || walkin ? Math.abs(Math.sin(ph * 1.6)) * 1.2 : 0; }
  const ap = clamp((ST - u.atkT) / (mode === 'lob' ? 0.9 : 0.36), 0, 1), act = ap < 1 ? Math.sin(ap * PI) : 0;
  let x = u.x, y = u.y - (u.jumpH || 0), sy = 1, sxm = 1;
  // 막 세워진 인형은 톡 하고 일어선다. 걸을 때는 디딜 때마다 살짝 눌린다
  const age = ST - (u.born || 0); if (age >= 0 && age < 0.3) { const e = age / 0.3, b = 1 + 2.2 * Math.pow(e - 1, 3) + 1.2 * Math.pow(e - 1, 2); sy *= 0.3 + 0.7 * b; sxm *= 1.25 - 0.25 * b; }
  if (moving) { const q = Math.abs(Math.cos(ph)); sy *= 1 - 0.05 * q * q; }
  // 맞은 순간: 맞은 방향으로 살짝 밀리며 뒤로 젖혀졌다가 곧 제자리로 돌아온다 (빠르게 밀리고 천천히 돌아온다)
  const ht = ST - (u.hitT === undefined ? -9 : u.hitT);
  if (ht >= 0 && ht < HIT_T && !L.still) { const e = ht / HIT_T, f = e < 0.2 ? e / 0.2 : Math.pow(1 - (e - 0.2) / 0.8, 2), a = HIT_PX * k * f; x += u.hitX * a; y += u.hitY * a * 0.6; tilt += u.hitX * f * 0.1; sy *= 1 - 0.05 * f * Math.min(1, Math.abs(u.hitX) + Math.abs(u.hitY)); }
  if (act > 0) {
    if (mode === 'slash' || mode === 'thrust' || mode === 'bite') { x += c * act * 6 * k; y += s * act * 6 * k; tilt += dir * act * (mode === 'bite' ? 0.2 : 0.12); }
    else if (mode === 'shoot') { x -= c * act * 3 * k; y -= s * act * 3 * k; sy *= 1 - act * 0.05; }
    else if (mode === 'cast') { hop += act * 5; tilt += dir * act * 0.08; }
  }
  if (u.flash > 0.4) { sy *= 1 - (u.flash - 0.4) * 0.1; sxm *= 1 + (u.flash - 0.4) * 0.08; }
  if (u.stun > 0) x += Math.sin(T * 40 + u.id) * 0.9;
  if (u.temp) alpha *= u.life < 3 ? 0.55 + 0.35 * Math.abs(Math.sin(T * 9)) : 0.92;
  if (u.def && u.def.cloak) alpha *= 0.5 + 0.12 * Math.sin(T * 3 + u.id);   // 감투 도깨비: 도깨비감투를 써서 반쯤 비친다
  g.save(); if (alpha < 1) g.globalAlpha = alpha;
  if (!L.float && !L.gshadow && !u.jumpH && !L.still) { g.fillStyle = 'rgba(70,46,22,0.2)'; g.beginPath(); g.ellipse(u.x + 1, u.y + 1.5, u.r * 1.05 * Math.min(1.6, k), u.r * 0.34 * Math.min(1.6, k), 0, 0, TAU); g.fill(); }   // 발밑의 옅은 그림자 (들판에 묻히지 않게)
  if (L.gshadow) { const [dx, dy, rx, ry] = L.gshadow; for (const [m, a2] of [[1.15, 0.12], [1, 0.2], [0.8, 0.18]]) { g.fillStyle = `rgba(58,38,24,${a2})`; g.beginPath(); g.ellipse(x + dx * k, u.y + dy * k, rx * k * m, ry * k * m, 0, 0, TAU); g.fill(); } }   // 땅에 닿은 그림자 (수레)
  if (L.float || u.jumpH) { g.fillStyle = 'rgba(50,36,20,0.16)'; g.beginPath(); g.ellipse(u.x, u.y + 1, u.r * 0.9, u.r * 0.36, 0, 0, TAU); g.fill(); }
  if (u.guard > 0) { g.beginPath(); g.ellipse(u.x, u.y, u.r * 1.3, u.r * 0.62, 0, 0, TAU); st(g, INK, 3.4); g.beginPath(); g.ellipse(u.x, u.y, u.r * 1.3, u.r * 0.62, 0, 0, TAU); st(g, '#8fb6e6', 1.8); }
  if (u.mark > 0) { const mr = u.r * 1.2, my = u.y + 1; g.beginPath(); g.ellipse(u.x, my, mr, mr * 0.46, 0, 0, TAU); st(g, RED, 1.8); for (const a of [0, PI / 2, PI, PI * 1.5]) line(g, [u.x + Math.cos(a) * mr * 0.7, my + Math.sin(a) * mr * 0.32, u.x + Math.cos(a) * mr * 1.25, my + Math.sin(a) * mr * 0.58], RED, 1.8); }
  if (u.slow > 0) { g.globalAlpha = alpha * 0.8; ell(g, u.x, u.y + 1, u.r * 1.05, u.r * 0.46, 'rgba(143,211,232,0.5)', '#4f8fb8', 1.2); g.globalAlpha = alpha; }
  const by = y - hop * k, fl = u.flash > 0 ? (u.def && u.def.boss ? Math.min(0.35, u.flash * 0.45) : u.flash * 0.85) : 0;   // 두목은 쉴 새 없이 맞으므로 옅게만 번쩍인다 (하얗게 바래면 유령처럼 보인다)
  if (u.root > 0) { for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + u.id; g.beginPath(); g.arc(u.x + Math.cos(a) * u.r * 0.8, u.y - 2 + Math.sin(a) * u.r * 0.35, 5, PI, TAU); st(g, INK, 4); g.beginPath(); g.arc(u.x + Math.cos(a) * u.r * 0.8, u.y - 2 + Math.sin(a) * u.r * 0.35, 5, PI, TAU); st(g, '#5f9a4a', 2); } }
  const sx = dir * k * flip * sxm;
  const bl = blinking(T, u.id);
  drawSprite(g, bl && L.frontBlink ? L.frontBlink : L.front, x, by, sx, k * sy, tilt, fl);
  // 머리는 목에 꿴 종이 한 장: 걸을 때 까딱이고, 가만히 있을 때도 살짝 움직이며, 가끔 눈을 깜빡인다
  if (L.head) {
    const ny = -L.neck * k * sy, ht = tilt * 0.5 + (moving ? Math.sin(ph * 2 + 0.6) * 0.04 : Math.sin(T * 1.7 + u.id * 1.3) * 0.03) + (act > 0 ? dir * act * 0.07 : 0), a2 = tilt + ht;
    drawSprite(g, bl && L.blink ? L.blink : L.head, x - ny * Math.sin(tilt) + ny * Math.sin(a2), by + ny * Math.cos(tilt) - ny * Math.cos(a2), sx, k * sy, a2, fl);
  }
  if (wspr) {
    const ct = Math.cos(tilt), sn = Math.sin(tilt), fsx = flip * sxm;
    // 휘두른 자리에 남는 먹 자국: 붓으로 그은 초승달 (hx, hy = 손, r0→r1 = 무기가 돈 각)
    const inkc = u.team === 0 ? '#191b28' : '#2c1517';
    const trail = (hx, hy, r0, r1, back, q) => { const a = clamp((0.86 - q) / 0.3, 0, 1) * alpha; if (a <= 0.02) return; g.save(); g.globalAlpha = 1; inkTrail(g, hx, hy, 26 * k, r0 - PI / 2, r1 - PI / 2, 12.5 * k, a, inkc, u.id); g.restore(); };
    // 찌르거나 쏜 방향으로 뻗는 짧은 선
    const streak = (hx, hy, d0, d1, a) => { if (a <= 0.02) return; g.save(); g.globalAlpha = 1; inkStreak(g, hx + c * d0 * k, hy + s * d0 * k, hx + c * d1 * k, hy + s * d1 * k, 6 * k, a * alpha, inkc); g.restore(); };
    const put = (px, py, sg) => {
      const hx0 = px * k * dir * fsx, hy0 = py * k * sy; let hx = x + hx0 * ct - hy0 * sn, hy = by + hx0 * sn + hy0 * ct, rot;
      if (mode === 'thrust') {
        const ready = u.def && u.def.charge && u.run > 60 && u.moving, w = Math.max(act, ready ? 1 : 0), rest = sg * ha, aim = u.facing + PI / 2;
        let d = aim - rest; while (d > PI) d -= TAU; while (d < -PI) d += TAU;
        rot = rest + d * w; hx += c * act * 9 * k; hy += s * act * 9 * k; if (ap < 0.7) streak(hx, hy, 26, 26 + 34 * Math.min(1, ap / 0.3), 1 - ap / 0.7);
      } else if (mode === 'cast') { rot = sg * (ha - act * (WP ? WP.cast : 0.95)) + tilt; if (act > 0.2) { g.save(); g.globalAlpha = act * alpha * 0.85; ell(g, hx + Math.sin(rot) * 22 * k, hy - Math.cos(rot) * 22 * k, 7 * k * act, 7 * k * act, null, '#fff6c8', 2.2 * k); g.restore(); } }
      else if (mode === 'lob') rot = sg * (ha + (ap < 0.22 ? lerp(0, 1.7, ap / 0.22) : lerp(1.7, 0, (ap - 0.22) / 0.78)));
      else if (mode === 'shoot') { rot = sg * (ha - act * (hand === 'C' ? 0.28 : 0.08)) + tilt; if (ap < 0.45) streak(hx, hy, 12, 12 + 30 * Math.min(1, ap / 0.2), 1 - ap / 0.45); }
      else { rot = sg * (ha + (ap < 1 ? swing(ap) : 0)) + tilt; if (ap > 0.28 && ap < 0.86) trail(hx, hy, sg * (ha - 0.9) + tilt, sg * (ha + (ap < 0.55 ? swing(ap) : 1.7)) + tilt, sg < 0, ap); }
      drawSprite(g, wspr, hx, hy, sg * k * Math.abs(fsx), k, rot, fl);
    };
    // 활은 쏘는 쪽(앞)으로 내밀어 든다: 활등이 과녁을 향하고 시위가 몸 쪽에 온다
    if (hand === 'L') put(hold.x + 3, hold.y - 1, -dir);
    else if (hand === 'C') put(hold.x * 0.42, hold.y - 1.5, dir);
    else { put(hold.x, hold.y, dir); if (hand === 'B') { const hx0 = -hold.x * k * dir * fsx, hy0 = hold.y * k * sy; const q = clamp(ap * 1.25 - 0.25, 0, 1), rot = -dir * (ha + (mode === 'cast' ? -act * 0.95 : ap < 1 ? swing(q) : 0)) + tilt, bx = x + hx0 * ct - hy0 * sn, byy = by + hx0 * sn + hy0 * ct; drawSprite(g, wspr, bx, byy, -dir * k * Math.abs(fsx), k, rot, fl); if (mode !== 'cast' && ap < 1 && q > 0.28 && q < 0.86) trail(bx, byy, -dir * (ha - 0.9) + tilt, -dir * (ha + (q < 0.55 ? swing(q) : 1.7)) + tilt, dir > 0, q); } }
  }
  const top = by - L.h * k;
  // ── 두목 싸움의 표시들 (sim/bossfight.js) ──
  if (u.open > 0) { const p = 0.55 + 0.45 * Math.sin(T * 11); g.globalAlpha = alpha * p; g.beginPath(); g.ellipse(u.x, u.y, u.r * 1.7, u.r * 0.8, 0, 0, TAU); st(g, '#f0d264', 5); g.globalAlpha = alpha; }   // '빈틈' 글은 두목 체력 칸 아래에 쓴다
  if (u.charm > 0) { for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(x, top - 10, 5 + i * 4, T * 7 + i * 2, T * 7 + i * 2 + 3.6); st(g, INK, 4); g.beginPath(); g.arc(x, top - 10, 5 + i * 4, T * 7 + i * 2, T * 7 + i * 2 + 3.6); st(g, '#e07ac0', 2.2); } }
  if (u.plague > 0) for (let i = 0; i < 3; i++) { const q = (T * 0.9 + i / 3 + u.id * 0.37) % 1; g.globalAlpha = alpha * (1 - q) * 0.9; ell(g, x + Math.sin(q * 6 + i * 2) * 7, by - 8 - q * (L.h * k), 3.4 - q * 1.6, 3.4 - q * 1.6, '#8ac04a', INK, 0.8); g.globalAlpha = alpha; }
  // (소품의 표식과 남은 숨은 BattleView.draw 에서 모든 인형 위에 그린다)
  if (u.ai) {
    const a = u.ai, gg = a.g;
    // 끊기 게이지: 시간이 다 가기 전에 피해를 채우면 두목의 수가 끊긴다 (키 큰 두목이 위쪽에 서도 윗띠에 가리지 않게 내려 단다)
    if (gg) { const w = 190, bx = x - w / 2, yy = Math.max(top - 44, VIEW.y0 + 58); rr(g, bx - 8, yy - 34, w + 16, 86, 9, '#fbf3df', RED, 2.4); text(g, gg.label, x, yy - 16, { size: 20, font: FONT_B, fill: RED }); rr(g, bx - 2, yy - 2, w + 4, 20, 4, '#e3d8bd', INK, 1.6); g.fillStyle = '#d9a41e'; g.fillRect(bx, yy, w * clamp(gg.acc / gg.need, 0, 1), 16); g.fillStyle = RED; g.fillRect(bx + 30, yy + 20, (w - 30) * clamp(gg.t / gg.t0, 0, 1), 4); text(g, '시간', bx + 13, yy + 22, { size: 11, font: FONT_B, fill: RED }); text(g, gg.hint || '두목을 몰아쳐 금빛을 채운다', x, yy + 38, { size: 15, font: FONT_B, fill: '#4a4034' }); }
    // 붙잡힌 영웅 / 조인 부대 / 업경대의 되비침
    if (a.grab && !a.grab.dead) { const t2 = a.grab; line(g, [u.x - dir * 18, u.y - 34, t2.x, t2.y - 22], INK, 7); line(g, [u.x - dir * 18, u.y - 34, t2.x, t2.y - 22], '#e9dfc4', 3.6); }
    if (a.coil) for (const e of a.coil.units) if (!e.dead) { for (const dy of [-6, -16]) { g.beginPath(); g.ellipse(e.x, e.y + dy, e.r * 1.25, e.r * 0.5, 0, 0, TAU); st(g, INK, 4.6); g.beginPath(); g.ellipse(e.x, e.y + dy, e.r * 1.25, e.r * 0.5, 0, 0, TAU); st(g, '#7d6a3a', 2.6); } }
    if (a.callSq && a.callSq.alive > 0) { g.save(); g.globalAlpha = alpha * (0.55 + 0.25 * Math.sin(T * 6)); g.setLineDash([14, 10]); g.lineDashOffset = -T * 24; g.beginPath(); g.arc(u.x, u.y, CALL_R, 0, TAU); st(g, INK, 5.6); g.beginPath(); g.arc(u.x, u.y, CALL_R, 0, TAU); st(g, '#d9ccff', 2.8); g.setLineDash([]); g.restore(); }   // 강림 도령의 부름이 닿는 곳
    if (a.mirror && !a.mirror.dead) { g.globalAlpha = alpha * (0.35 + 0.25 * Math.sin(T * 9)); line(g, [a.mirror.x, a.mirror.y - 54, u.x, u.y - 40], '#fff3c0', 6); g.globalAlpha = alpha; }
  }
  if (u.barrier > 0) { g.globalAlpha = alpha * 0.5; ell(g, x, by - L.h * k * 0.45, u.r * 1.55, L.h * k * 0.62, 'rgba(160,205,235,0.3)', '#5f8fb8', 2); g.globalAlpha = alpha; }
  if (u.stun > 0) for (let i = 0; i < 3; i++) { const a = T * 6 + i / 3 * TAU; icon.star(g, x + Math.cos(a) * 11 * k, top - 2 + Math.sin(a) * 4, 4.4); }
  if (u.haste > 0 && u.moving) { g.globalAlpha = alpha * 0.7; for (let i = -1; i <= 1; i++) line(g, [u.x - c * (u.r + 6) + i * 5 * -s, u.y - 12 - s * (u.r + 6) + i * 5 * c, u.x - c * (u.r + 18) + i * 5 * -s, u.y - 12 - s * (u.r + 18) + i * 5 * c], RED, 1.8); g.globalAlpha = alpha; }
  if (u.weaken > 0) poly(g, [x - 5, top - 9, x + 5, top - 9, x, top - 1], '#6a4a9a', INK, 1.2);
  if (u.dmgUp > 0) { const yy = top - 4 + Math.sin(T * 8 + u.id) * 1.5; poly(g, [x + 8, yy - 3, x + 13, yy - 10, x + 18, yy - 3, x + 15, yy - 3, x + 15, yy + 2, x + 11, yy + 2, x + 11, yy - 3], RED, INK, 1); }
  if (u.burn > 0) { const yy = top + 4 + Math.sin(T * 14 + u.id) * 1.2; path(g, p => { p.moveTo(x - 9, yy - 9); p.quadraticCurveTo(x - 4, yy - 3, x - 6.5, yy + 1); p.quadraticCurveTo(x - 9, yy + 3, x - 11.5, yy + 1); p.quadraticCurveTo(x - 13.5, yy - 3, x - 9, yy - 9); }, '#ff9a2e', INK, 0.9); }
  if (u.regen > 0 && Math.sin(T * 6 + u.id) > 0) { const yy = top - 6; rr(g, x - 16, yy - 1.4, 8, 2.8, 0.6, '#5fae6a', INK, 0.8); rr(g, x - 13.4, yy - 4, 2.8, 8, 0.6, '#5fae6a', INK, 0.8); rr(g, x - 15.4, yy - 0.8, 6.8, 1.6, 0, '#5fae6a'); }
  if (u.fuse > 0 && Math.sin(T * 50) > 0) { g.globalAlpha = 0.6; ell(g, x, by - 20, u.r * 2, u.r * 2, '#fff'); g.globalAlpha = alpha; }
  // 체력 띠: 방금 맞았거나 많이 다친 인형에만 가늘게 (줄지은 부대 위로 띠가 사다리처럼 쌓이지 않게)
  const since = ST - (u.hitT === undefined ? -99 : u.hitT), hpk = u.hp / u.maxHp, showHp = u.hp > 0 && hpk < 0.995 && !(u.def && u.def.boss) && (since < 2.2 || hpk < 0.35 || (L.hero && hpk < 0.9));
  if (showHp) {
    const bw = Math.max(18, u.r * 1.9), bx = x - bw / 2, byy = top - 5, fa = hpk < 0.35 || L.hero ? 1 : clamp((2.2 - since) / 0.6, 0, 1); g.save(); g.globalAlpha *= fa;
    rr(g, bx - 1, byy - 1, bw + 2, 4.4, 1.2, PAPER, 'rgba(38,42,54,0.8)', 0.9); g.fillStyle = u.team === 0 ? INDIGO : RED; g.fillRect(bx, byy, bw * clamp(hpk, 0, 1), 2.4); g.restore();
  }
  // 영웅의 기력: 머리 위의 금빛 띠. 거의 차면 다음 고유기 이름이 떠오르고 띠가 반짝인다
  if (L.hero && u.team === 0 && u.gauge !== undefined && alpha >= 1) {
    const gz = clamp(u.gauge, 0, 1), bw = 52, bx = x - bw / 2, gy = top - (showHp ? 16 : 10) + Math.sin(T * 3) * 1.2, ready = gz > 0.9;
    rr(g, bx - 2, gy - 2, bw + 4, 9, 4, 'rgba(24,20,30,0.78)', ready ? '#f0d264' : 'rgba(250,240,215,0.85)', 1.2);
    if (gz > 0.01) { g.fillStyle = ready && Math.sin(T * 12) > 0 ? '#fff3b0' : '#e2b33a'; g.fillRect(bx, gy, bw * gz, 5); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(bx, gy, bw * gz, 1.6); }
    if (gz > 0.8 && u.def && HERO_SKILLS[u.type]) { const sk = HERO_SKILLS[u.type][u.skillI || 0]; if (sk) text(g, sk.name, x, gy - 11, { size: 15, font: FONT_B, fill: ready ? '#fff3b0' : '#f3ead2', stroke: 'rgba(20,16,24,0.9)', lw: 4 }); }
  }
  g.restore();
}

const TELE = { boulder: RED, slam: RED, bomb: '#d9702a', root: '#4f8a4a', dark: '#5a4a8a', meteor: '#d9702a', volley: INDIGO, fox: '#3f9fd0', pounce: '#c8642a', poison: '#6a9a3a', devour: '#6a6f78', bolt: '#d9a41e', flood: '#3f7fb8', swap: '#8a5aa8', rock: '#7a6a5a', fire: '#d9702a', shoe: '#8a6a3a', gallop: '#3f7fb8', rope: '#8a2a26', breath: '#6a4a3a', wail: '#5a4a6a' };
const AMB = { pass: ['#f3c4c9', '#f8dcdc', '#fbf7ec'], grove: ['#9bbf6a', '#d9c25a', '#7aa65a'], dusk: ['#8fd3e8', '#b8a0e0', '#dfe8ee'], autumn: ['#e8a03c', '#c8402f', '#d9702a'], snow: ['#ffffff', '#eef2f4', '#dfe8ee'], mist: ['#c9d6c0', '#e9e6d2', '#a9b8a0'], ember: ['#ff9a2e', '#8a8078', '#5a5046'], storm: ['#cfe3e6', '#9fc0cc', '#dfe8ee'], under: ['#c08ad8', '#b8a0e0', '#8fd3c8'] };
// 붉지 않은 원에는 무엇인지 이름을 붙인다
const ZLABEL = { fox: '여우불', poison: '독', devour: '무는 입 — 원 밖으로', bolt: '벼락', flood: '물벼락', pounce: '덮치기', root: '뿌리 감옥', dark: '낙인', swap: '자리 바꾸기', rock: '바위', fire: '불길', shoe: '신발 도둑', gallop: '내달리기', rope: '포승줄', breath: '세 머리 입김', wail: '소리 없는 울음' };
const isNight = theme => !!(THEMES[theme] && THEMES[theme].night);

// 이어 붙인 긴 그림 한 장(너비 period)을 화면에 보이는 만큼만 그린다. top 위쪽은 투명해서 건너뛴다
function strip(g, img, period, off, top) {
  const k = img.width / period, full = img.height / k; let x = -(((off % period) + period) % period);
  for (; x < W; x += period) { const a = Math.max(0, -x), b = Math.min(period, W - x); if (b > a) g.drawImage(img, a * k, top * k, (b - a) * k, (full - top) * k, x + a, top, b - a, full - top); }
}
export class BattleView {
  constructor(theme, seed) { this.fx = new Fx(); this.dust = 0; this.scroll = 0; this.props = []; this.fork = null; this.ter = null; this.oldTer = null; this.terT = -9; this.oldT = -9; this.skyA = { night: 0, rain: 0 }; this.setTheme(theme, seed); }
  setTheme(theme, seed) {
    this.seed = seed; this.theme = theme; this.ground = makeGround(theme, seed); this.far = makeFar(theme, seed);
    // 바람에 날리는 꽃잎·나뭇잎·도깨비불
    this.amb = []; for (let i = 0; i < 22; i++) this.amb.push({ x: Math.random() * W, y: 110 + Math.random() * 440, s: 2.4 + Math.random() * 2.6, v: 14 + Math.random() * 22, ph: Math.random() * 9, col: (AMB[theme] || AMB.pass)[i % 3] });
  }
  // 길가에 서 있는 것 (주막·장터·푯말 …): 바닥과 함께 흐른다
  // 들판의 갈림길 (render/forkmap.js): 길이 화면 속에서 갈라지고, 갈래 끝에 그곳이 선다. 바닥과 함께 흐른다
  setFork(st, wx) { this.fork = { st, wx, art: forkArt(this.theme, st, ((wx | 0) % 997) + 3), hover: null, pick: null, pickT: 0, alpha: 1, fade: false }; }
  addProp(kind, wx, y = 152, top = false) { this.props.push({ spr: stopSprite(kind), wx, y, top }); if (this.props.length > 5) this.props.shift(); }
  draw(g, b, T, opt = {}) {
    const fx = this.fx, sc = Math.max(0, this.scroll);
    g.save();
    if (fx.shake > 0) g.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
    // 배경은 두 벌: 'paint' 붓으로 칠한 풍경화(기본) · 'paper' 종이 디오라마. 위 띠의 단추로 바꿔 볼 수 있다
    const paint = this.style !== 'paper';
    if (paint) { strip(g, paintFar(this.theme, this.seed), FW, sc * 0.25, 0); strip(g, paintBack(this.theme), BW, sc * 0.5, 0); strip(g, paintGround(this.theme, this.seed), GW, sc, 100); }
    else {
      strip(g, this.far, FW, sc * 0.25, 0);
      // 큰 산과 언덕: 먼 산보다 빠르고 바닥보다 느리게 흐른다
      strip(g, makeBackdrop(this.theme), BW, sc * 0.5, 0);
      strip(g, this.ground, GW, sc, 200);
    }
    // 지평선의 역광: 화면에 고정된 따뜻한 빛 무리와 빛살 (종이 디오라마)
    { const bl = backlight(isNight(this.theme)), k = bl.width / W; g.save(); g.globalCompositeOperation = 'screen'; if (paint) g.globalAlpha = 0.55; g.drawImage(bl, 0, 0, bl.width, 610 * k, 0, 0, W, 610); g.restore(); }
    // 지형: 싸움터가 차려지면 종이 무대 장치처럼 일어서고, 끝나면 접힌다
    if (!this.ter) this.ter = b.terrain; else if (b.terrain !== this.ter) { this.oldTer = this.ter; this.oldT = T; this.ter = b.terrain; this.terT = T; }
    const kin = clamp((T - this.terT) / 0.38, 0, 1), kout = this.oldTer ? 1 - clamp((T - this.oldT) / 0.25, 0, 1) : 0;
    if (kout > 0) drawRiver(g, this.oldTer, this.theme, T, kout); drawRiver(g, this.ter, this.theme, T, kin);
    // 갈림길: 흙길이 갈래로 나뉘는 바닥 그림 (닿은 뒤 걸음이 조금 더 갔으면 그 자리로 살며시 옮긴다). 고른 갈래가 싸움터면 옅어진다
    if (this.fork) { const f = this.fork, dt = opt.dt || 0; if (f.target !== undefined) f.wx += (f.target - f.wx) * Math.min(1, dt * 8); if (f.fade) f.alpha = Math.max(0, f.alpha - dt * 1.4); if (f.pick) f.pickT += dt;
      const ox = f.wx - sc; if (f.alpha <= 0 || ox < -700) this.fork = null; else if (ox < W + 700) { g.globalAlpha = f.alpha; g.drawImage(f.art.img, ox + f.art.x0, f.art.y0, f.art.w, f.art.h); g.globalAlpha = 1; if (f.alpha > 0.5) drawForkGlow(g, f, ox, T); } }
    // 큰 소나무와 둔덕·들꽃: 바닥과 함께 흐른다
    if (paint) { strip(g, paintFront(this.theme), GW, sc, 520);
      // 모서리 꽃나무: 들판 가장자리를 꾸미되 인형·표시는 가리지 않게 그 아래에 깐다
      // 싸움 중 들판 한가운데 멈춘 나무는 옅게 (붉은 원 같은 표시가 꽃빛에 묻히지 않게). 행군 중에는 그대로 흐른다
      const off2 = sc % GW; for (const p of paintTrees(this.theme)) if (p.under) for (const k of [0, 1]) { const x = p.wx - off2 + k * GW; if (x > -p.hw * 1.6 && x < W + p.hw * 1.6) { const mid = opt.march ? 0 : clamp(1 - (Math.abs(x - W / 2) - 380) / 160, 0, 1); g.globalAlpha = 1 - 0.55 * mid; drawSprite(g, p.spr, x, p.y); g.globalAlpha = 1; } }
    } else strip(g, makeFrame(this.theme), GW, sc, 280);
    if (opt.deploy) this.drawDeployZone(g, opt.deploy, T);
    for (const z of b.zones) this.drawZone(g, z, T);
    for (const c of b.corpses) {
      if (c.revive) { g.globalAlpha = 0.85; path(g, p => { p.moveTo(c.x, c.y - 16); p.quadraticCurveTo(c.x + 7, c.y - 6, c.x + 4, c.y); p.quadraticCurveTo(c.x, c.y + 3, c.x - 4, c.y); p.quadraticCurveTo(c.x - 7, c.y - 6, c.x, c.y - 16); }, '#9fd3e8', INK, 1); g.globalAlpha = 1; g.beginPath(); g.arc(c.x, c.y - 4, 14, -PI / 2, -PI / 2 + TAU * (1 - c.t / 3)); st(g, '#4f8fb8', 2.6); }
      else if (LEFT[c.type]) { g.globalAlpha = clamp(c.t / 2, 0, 1); drawSprite(g, leftover(LEFT[c.type]), c.x, c.y, 1, 1, ((c.x * 7 + c.y * 13) % 10 - 5) * 0.09); g.globalAlpha = 1; } // 도깨비는 헌 물건으로, 망령은 호패로 돌아간다
      else { g.globalAlpha = clamp(c.t / 3, 0, 0.6); poly(g, [c.x - 7, c.y - 1, c.x - 2, c.y - 5, c.x + 6, c.y - 3, c.x + 8, c.y + 2, c.x - 3, c.y + 4], PAPER, INK, 1); g.globalAlpha = 1; }
    }
    if (opt.rings) for (const r of opt.rings) { g.globalAlpha = 0.9; ell(g, r.x, r.y + 1, r.r * 1.35, r.r * 0.72, r.col + '55', r.col, 2.4); g.globalAlpha = 1; }
    if (opt.orders) this.drawOrders(g, b, T);
    fx.drawLayer(g, true);
    const list = [];
    for (const u of b.units) { if (u.dead || u.hidden > 0 || u.x > W + 60) continue; list.push({ y: u.y + (u.def && u.def.boss ? 26 : u.def && u.def.prop ? 60 : 0), u }); }   // 두목과 쳐야 할 소품(종·업경대 …)은 둘레에 겹친 인형보다 위에
    // 싸움터의 깃대(top)는 요괴 무리에 가리지 않게 인형들보다 나중에 그린다
    for (const p of this.props) { const x = p.wx - sc; if (x > -90 && x < W + 90) list.push({ y: p.top ? 9999 : p.y, spr: p.spr, x, sy0: p.y }); }
    // 갈림길의 푯말과 갈래 끝의 장소들 (인형들과 앞뒤를 맞춘다)
    if (this.fork) { const f = this.fork, ox = f.wx - sc, al = f.alpha; if (ox > -700 && ox < W + 700) { list.push({ y: MID_Y - 24, x: ox + 22, spr: stopSprite('fork'), sy0: MID_Y - 24, k: 0.62, al });
      for (const e of f.art.ends) { const dim = f.pick && f.pick !== e.k ? 0.45 : 1; if (e.hidden) { if (f.art.thicket) list.push({ y: e.ly, x: ox + e.lx, spr: f.art.thicket, sy0: e.ly, al: al * dim }); } else list.push({ y: e.ly + 8, x: ox + e.lx, spr: stopSprite(e.type), sy0: e.ly + 8, k: LM_K * (f.hover === e.k || f.pick === e.k ? 1.06 : 1), al: al * dim }); } } }
    for (const o of this.ter.obstacles) if (o.kind !== 'water') { const q = obstacleBase(o); list.push({ y: q.y, x: q.x, spr: obstacleSprite(o, this.theme), sy: easeOutBack(kin) }); }
    if (kout > 0) for (const o of this.oldTer.obstacles) if (o.kind !== 'water') { const q = obstacleBase(o); list.push({ y: q.y, x: q.x, spr: obstacleSprite(o, this.theme), sy: kout }); }
    // 들판의 큰 소나무: 밑동 높이로 인형들과 앞뒤를 맞추고, 뒤에 인형이나 표시(붉은 원 …)가 가려지면 옅어진다
    const pa = this.pineA || (this.pineA = {}), off = sc % GW;
    (paint ? paintTrees : scenePines)(this.theme).forEach((p, i) => { if (p.under) return; for (const k of [0, 1]) {
      const x = p.wx - off + k * GW; if (x < -p.hw * 1.6 || x > W + p.hw * 1.6) continue;
      const hid = q => q.y < p.y + 4 && q.y > p.y - p.h && Math.abs(q.x - x) < p.hw + (q.r || 0);
      const behind = !!opt.deploy || b.units.some(u => !u.dead && !(u.hidden > 0) && hid(u)) || b.zones.some(hid);
      const key = (paint ? 'p' : '') + i + ':' + k, a0 = pa[key] === undefined ? 1 : pa[key]; pa[key] = a0 + ((behind ? p.fade || 0.32 : 1) - a0) * 0.18;
      list.push({ y: p.y, x, pine: p.spr, a: pa[key] });
    } });
    if (opt.extra) for (const e of opt.extra) list.push(e);
    list.sort((a, c) => a.y - c.y);
    for (const it of list) { if (it.u) drawUnit(g, it.u, T, it.alpha === undefined ? 1 : it.alpha, opt.march, b.time); else if (it.pine) { g.globalAlpha = it.a; drawSprite(g, it.pine, it.x, it.y); g.globalAlpha = 1; } else if (it.spr) { if (it.al !== undefined) g.globalAlpha = it.al; if (it.sy === undefined) drawSprite(g, it.spr, it.x, it.sy0 === undefined ? it.y : it.sy0, it.k || 1, it.k || 1); else if (it.sy > 0.02) drawSprite(g, it.spr, it.x, it.y, 1 + (1 - Math.min(1, it.sy)) * 0.15, it.sy); g.globalAlpha = 1; } }
    this.dust -= opt.dt || 0;
    if (this.dust <= 0) { for (const p of b.proj) if (p.kind === 'fireball' || p.kind === 'firearrow' || p.kind === 'sunfire') { const yy = p.lob ? p.y - (p.h || 0) - 10 : p.y; fx.embers(p.x, yy, 1, '#ff9a2e'); }   // 불화살·불덩이의 불티 꼬리
      this.dust = 0.09; for (const u of b.units) if (!u.dead && u.moving && u.def.charge && u.run > 60 && u.hidden <= 0) fx.puff(u.x - Math.cos(u.facing) * 12, u.y - 2, 1, '#e8dcc0', 6); if (opt.march) for (const u of b.units) if (!u.dead && u.team === 0 && Math.random() < 0.05) fx.puff(u.x - 10, u.y - 1, 1, '#e8dcc0', 5); }
    if (b.form) this.drawForm(g, b, T);   // 진형의 금빛 먹줄은 인형들 위에 옅게 (부대가 가리지 않게)
    for (const p of b.proj) this.drawProj(g, p, T);
    this.drawSky(g, b, T, opt.dt || 0);
    this.drawAmbient(g, T, opt.dt || 0, opt.march);
    fx.drawLayer(g, false, false);   // (피해 숫자는 장면이 말풍선까지 그린 뒤 drawNums 로)
    // 소품(종·여의주·업경대·명부 든 사자): 어떤 인형·효과·피해 숫자에도 가리지 않게 맨 위에 표식과 이름, 남은 숨을 단다
    const tag = (x, y, s, col) => { g.font = `400 17px ${FONT_B}`; const w = g.measureText(s).width + 22; rr(g, x - w / 2, y - 14, w, 28, 7, '#fbf3df', col, 2.2); text(g, s, x, y + 1, { size: 17, font: FONT_B, fill: col }); };
    for (const u of b.units) {
      if (u.dead || !(u.def.prop || u.def.porter || u.def.toad) || u.hidden > 0) continue; const a = u.ai || {}, L = getLook(u.type), top = u.y - L.h * L.scale, rest = a.rest > b.time, yy = top - 18 + Math.sin(T * 6) * 4;
      if (!rest) poly(g, [u.x - 11, yy - 13, u.x + 11, yy - 13, u.x, yy], '#f0d264', INK, 2);
      const own = a.owner && a.owner.ai, verb = { pearl: '여의주를 깨라', mirror: '업경대를 깨라', scribe: '붓 든 사자를 잡아라', cage: '우리를 부숴라', porter: '짐꾼을 잡아라', dokbang: '방망이를 부러뜨려라', toad: '두꺼비를 지켜라', sieve: '곁에 부대를 세워라' }[u.type] || u.def.name, s = u.type === 'sieve' ? `${verb} · 체 걸기 ${Math.round(Math.min(1, (a.hold || 0) / 2.5) * 100)}%` : u.type === 'bell' ? (rest ? '종 · 쉬는 중' : '종을 쳐라 ' + '●'.repeat(own ? own.rings : 0) + '○'.repeat(3 - (own ? own.rings : 0))) : `${verb}${a.count > 0 ? ' ' + Math.ceil(a.count) : ''}`;
      tag(u.x, yy - 32, s, rest ? '#8a8474' : a.count > 0 && a.count < 5 ? RED : '#7a4a2c');
    }
    // (홀린 부대에 할 일은 두목 체력 아래 알림 칸에 쓴다. 부대 위에는 소용돌이 표시만)
    // 명부: 이름이 적힌 부대와 명부 든 사자를 먹줄로 잇는다
    { const boss = b.units.find(e => !e.dead && e.ai && e.ai.doomSq); if (boss && boss.ai.scribe && !boss.ai.scribe.dead) { const q = boss.ai.doomSq, sc = boss.ai.scribe; g.save(); g.globalAlpha = 0.75; g.setLineDash([10, 8]); g.lineDashOffset = -T * 26; line(g, [q.cx, q.cy - 60, sc.x, sc.y - 50], INK, 5); line(g, [q.cx, q.cy - 60, sc.x, sc.y - 50], '#f3e7c8', 2.4); g.setLineDash([]); g.restore(); } }
    // 붉지 않은 원의 이름과 연타의 차례: 부대에 가리지 않게 원 위쪽 테두리에 단다
    { const put = []; for (const z of b.zones) if (z.kind === 'tele' && !z.ally && (z.n || ZLABEL[z.style])) { const s2 = z.n ? `${z.n}` : ZLABEL[z.style], ty = Math.max(VIEW.y0 + 4, z.y - z.r * 0.62); if (z.style === 'fox' || put.some(q => q[2] === s2)) continue; const busy = fx.p.some(q => q.k === 'text' && Math.abs(q.x - z.x) < 150 && Math.abs(q.y - ty) < 36), ty2 = busy ? Math.min(VIEW.y1 - 4, z.y + z.r * 0.62 + 6) : ty; put.push([z.x, ty2, s2]); tag(z.x, ty2, s2, TELE[z.style] || RED); } }   // 같은 이름표는 하나만 (여우불은 두목이 외치므로 원에는 달지 않는다)
    // 명부에 이름이 적힌 부대: 머리 위에 남은 숨을 센다
    for (const q of b.squads) if (q.doom > 0 && q.alive > 0) tag(q.cx, q.cy - 84 + Math.sin(T * 6) * 3, `명부에 적혔다 ${Math.ceil(q.doom)}`, q.doom < 3 ? RED : '#5a4a8a');
    // 강림 도령이 이름을 부른 부대: 세 번째 부름까지 남은 숨 (점선 원 밖으로 떼어 놓아야 한다)
    for (const q of b.squads) if (q.call > 0 && q.alive > 0) tag(q.cx, q.cy - 84 + Math.sin(T * 6) * 3, `이름이 불렸다 · 점선 밖으로 ${Math.ceil(q.call)}`, q.call < 2.5 ? RED : '#5a4a8a');
    g.restore();
    g.drawImage(vignette(isNight(this.theme)), 0, 0, W, H);
    if (fx.flash > 0) { g.globalAlpha = fx.flash * 0.45; g.fillStyle = fx.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  // 진형: 진을 이룬 부대들을 금빛 먹줄로 잇고, 발밑에 금빛 테를 두른다 (선 순간 크게 번쩍인다)
  drawForm(g, b, T) {
    const f = b.form, sq = b.formSquads(), hq = b.squads.find(q => q.team === 0 && q.hero && q.alive > 0); if (!sq.length) return;
    let pts = sq.map(q => [q.cx, q.cy]);
    if (f.id === 'jangsa') pts.sort((a, c) => a[0] - c[0]); else if (f.id === 'bangwon' && hq) pts.sort((a, c) => Math.atan2(a[1] - hq.cy, a[0] - hq.cx) - Math.atan2(c[1] - hq.cy, c[0] - hq.cx)); else pts.sort((a, c) => a[1] - c[1]);
    const age = T - (f.t0 === undefined ? (f.t0 = T) : f.t0), flash = Math.max(0, 1 - age / 0.8), pul = 0.55 + 0.25 * Math.sin(T * 4) + flash * 0.4;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const trace = () => { g.beginPath(); pts.forEach(([x, y], i) => { if (i) g.lineTo(x, y + 18); else g.moveTo(x, y + 18); }); if (f.id === 'bangwon') g.closePath(); };
    g.globalAlpha = 0.3 * pul; trace(); st(g, '#fff0b0', 12 + flash * 18);
    g.globalAlpha = 0.55; trace(); st(g, '#3a2410', 6.5);
    g.globalAlpha = 0.95; g.setLineDash([18, 9]); g.lineDashOffset = -T * 40; trace(); st(g, '#ffd560', 3.6); g.setLineDash([]);
    for (const [x, y] of pts) { g.globalAlpha = 0.6; ell(g, x, y + 18, 46 + flash * 30, 14 + flash * 8, null, '#3a2410', 4.5); g.globalAlpha = 0.95 * pul + 0.05; ell(g, x, y + 18, 46 + flash * 30, 14 + flash * 8, null, '#ffd560', 2.4); g.globalAlpha = 0.16 * pul; ell(g, x, y + 18, 44, 13, '#ffe7a0'); }
    if (f.id === 'bangwon' && hq) { g.globalAlpha = 0.6 * pul; ell(g, hq.cx, hq.cy + 18, 30, 10, null, '#f3d27c', 2); }
    g.restore();
  }
  // 밤과 비: 싸움터의 하늘에 따라 천천히 덮였다가 걷힌다
  drawSky(g, b, T, dt) {
    const a = this.skyA, k = Math.min(1, dt * 2.2); a.night += ((b.sky === 'night' ? 1 : 0) - a.night) * k; a.rain += ((b.sky === 'rain' ? 1 : 0) - a.rain) * k;
    if (a.night > 0.01) { const lit = b.torch > 0; g.fillStyle = `rgba(16,20,58,${(lit ? 0.12 : 0.4) * a.night})`; g.fillRect(0, 60, W, 512); if (lit) { g.fillStyle = `rgba(255,170,60,${0.09 * a.night})`; g.fillRect(0, 60, W, 512); } }
    if (a.rain > 0.01) {
      g.fillStyle = `rgba(48,58,84,${0.2 * a.rain})`; g.fillRect(0, 60, W, 512); g.globalAlpha = 0.42 * a.rain;
      for (let i = 0; i < 80; i++) { const x = ((i * 97 + T * 420) % (W + 240)) - 120, y = 66 + ((i * 53 + T * 980 + (i % 7) * 40) % 500); line(g, [x, y, x - 9, y + 24], '#e6eef4', 1.5); }
      g.globalAlpha = 1;
    }
  }
  drawAmbient(g, T, dt, march) {
    const night = isNight(this.theme), wind = march ? 230 : 0;
    for (const a of this.amb) {
      if (night) { a.y -= a.v * 0.5 * dt; a.x += (Math.sin(T * 0.9 + a.ph) * 8 - wind) * dt; if (a.y < 100) { a.y = 556; a.x = Math.random() * W; } if (a.x < -12) a.x = W + 10; g.globalAlpha = 0.25 + 0.2 * Math.sin(T * 2 + a.ph); ell(g, a.x, a.y, a.s * 2.2, a.s * 2.2, a.col); g.globalAlpha = 0.85; ell(g, a.x, a.y, a.s * 0.7, a.s * 0.7, '#f6fbff'); }
      else { a.x -= (a.v + Math.sin(T * 1.3 + a.ph) * 10 + wind) * dt; a.y += (a.v * 0.45 + Math.cos(T * 1.7 + a.ph) * 9) * dt; if (a.x < -12 || a.y > 566) { a.x = W + 10 + Math.random() * 60; a.y = 100 + Math.random() * 400; } g.globalAlpha = 0.8; g.save(); g.translate(a.x, a.y); g.rotate(T * 1.6 + a.ph); g.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(T * 2.2 + a.ph))); ell(g, 0, 0, a.s * 1.25, a.s * 0.7, a.col, 'rgba(38,42,54,0.45)', 0.7); g.restore(); }
    }
    g.globalAlpha = 1;
  }
  // 병력 패를 끌 때: 세울 수 있는 곳을 옅게 칠한다
  drawDeployZone(g, d, T) {
    const x1 = d.maxX + 34, col = d.ok ? INDIGO : RED;
    g.globalAlpha = 0.1; g.fillStyle = col; g.fillRect(VIEW.x0 - 6, VIEW.y0 - 26, x1 - VIEW.x0 + 6, VIEW.y1 - VIEW.y0 + 40);
    g.globalAlpha = 0.75; g.setLineDash([12, 9]); g.lineDashOffset = -T * 30; line(g, [x1, VIEW.y0 - 26, x1, VIEW.y1 + 14], col, 3); g.setLineDash([]); g.globalAlpha = 1;
  }
  drawZone(g, z, T) {
    if (z.kind === 'tele') {
      const col = z.ally ? INDIGO : TELE[z.style] || RED, k = clamp(z.t / z.delay, 0, 1);
      g.globalAlpha = 0.18; ell(g, z.x, z.y, z.r, z.r, col); g.globalAlpha = 0.3; ell(g, z.x, z.y, z.r * k, z.r * k, col);
      g.globalAlpha = 0.95; g.setLineDash([14, 10]); g.lineDashOffset = -T * 40; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); st(g, col, 4); g.setLineDash([]);
      if (z.ally) { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + T * 1.5; line(g, [z.x + Math.cos(a) * z.r * 0.25, z.y + Math.sin(a) * z.r * 0.25, z.x + Math.cos(a) * z.r * 0.55, z.y + Math.sin(a) * z.r * 0.55], col, 3.4); } ell(g, z.x, z.y, 5, 5, col); }
      else text(g, '!', z.x, z.y, { size: 40 + Math.sin(T * 14) * 4, font: FONT_B, fill: col, stroke: PAPER, lw: 7 });
      g.globalAlpha = 1;
    } else if (z.kind === 'mark') {
      text(g, '!', z.x, z.y - 32, { size: 34 + Math.sin(T * 18) * 4, font: FONT_B, fill: RED, stroke: PAPER, lw: 6 });
      g.beginPath(); g.arc(z.x, z.y, z.r * (1.6 - z.t / z.delay * 0.6), 0, TAU); st(g, RED, 2.4);
    } else if (z.kind === 'spawn') {
      const k = clamp(z.t / z.delay, 0, 1), sap = z.utype === 'sapling';
      g.globalAlpha = 0.45 + k * 0.3; ell(g, z.x, z.y, 16 + k * 4, 9 + k * 2, sap ? '#4f8a4a' : '#3d3560', INK, 1.4); g.globalAlpha = 1;
      if (z.fx !== undefined) { g.globalAlpha = 0.6 * (1 - k); line(g, [z.fx, z.fy - 30, z.x, z.y], '#5a4a8a', 3); g.globalAlpha = 1; }
    } else if (z.kind === 'rain') {
      const col = z.fire ? '#d9702a' : INDIGO; g.globalAlpha = 0.16; ell(g, z.x, z.y, z.r, z.r, col); g.globalAlpha = 0.85; g.setLineDash([10, 8]); g.lineDashOffset = T * 30; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); st(g, col, 2.6); g.setLineDash([]); g.globalAlpha = 1;
    } else if (z.kind === 'hazard') {
      // 두목이 남긴 땅의 해: 돌무더기(잿빛 돌멩이) · 불 자국(일렁이는 불꽃)
      const a = Math.min(1, z.t * 3, (z.dur - z.t) * 1.5), fire = z.style === 'fire', col = fire ? '#d9702a' : '#6a5e52';
      g.globalAlpha = (fire ? 0.2 + 0.06 * Math.sin(T * 9 + z.x) : 0.22) * a; ell(g, z.x, z.y, z.r, z.r * 0.8, col);
      g.globalAlpha = 0.75 * a; g.setLineDash([6, 8]); g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, TAU); st(g, col, 2.2); g.setLineDash([]);
      const n = Math.max(4, Math.round(z.r / 7));
      for (let i = 0; i < n; i++) { const an = i * 2.39 + z.x * 0.1, rr2 = z.r * (0.2 + ((i * 37) % 60) / 100), px = z.x + Math.cos(an) * rr2, py = z.y + Math.sin(an) * rr2 * 0.78;
        g.globalAlpha = 0.95 * a;
        if (fire) { const h = 9 + 4 * Math.sin(T * 12 + i * 1.7); path(g, p => { p.moveTo(px, py - h); p.quadraticCurveTo(px + 4.4, py - h * 0.4, px + 2.6, py); p.quadraticCurveTo(px, py + 1.4, px - 2.6, py); p.quadraticCurveTo(px - 4.4, py - h * 0.4, px, py - h); }, i % 2 ? '#ff9a2e' : '#f0c23a', INK, 1); }
        else { const w2 = 5 + (i * 13) % 5; path(g, p => { p.moveTo(px - w2, py + 2); p.lineTo(px - w2 * 0.6, py - w2 * 0.7); p.lineTo(px + w2 * 0.4, py - w2 * 0.8); p.lineTo(px + w2, py + 1); p.closePath(); }, i % 3 ? '#9a8e80' : '#7f7466', INK, 1.1); }
      }
      g.globalAlpha = 1;
    } else if (z.kind === 'caltrop' && z.ice) {
      const a = Math.min(1, z.t * 4, (z.dur - z.t) * 2); g.globalAlpha = 0.26 * a; ell(g, z.x, z.y, z.r, z.r * 0.92, '#bfe3ee'); g.globalAlpha = 0.8 * a; g.setLineDash([6, 8]); g.lineDashOffset = T * 20; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); st(g, '#4f8fb8', 2.4); g.setLineDash([]);
      for (let i = 0; i < 9; i++) { const an = i * 2.1 + z.x, r2 = z.r * (0.2 + ((i * 41) % 70) / 100), px = z.x + Math.cos(an + T * 0.3) * r2, py = z.y + Math.sin(an + T * 0.3) * r2 * 0.9; for (let j = 0; j < 3; j++) { const b2 = j / 3 * Math.PI; line(g, [px - Math.cos(b2) * 5, py - Math.sin(b2) * 5, px + Math.cos(b2) * 5, py + Math.sin(b2) * 5], '#eef8fc', 1.6); } }
      g.globalAlpha = 1;
    } else if (z.kind === 'caltrop') {
      const a = Math.min(1, z.t * 4, (z.dur - z.t) * 2); g.globalAlpha = 0.14 * a; ell(g, z.x, z.y, z.r, z.r, '#4a4a55'); g.globalAlpha = 0.7 * a; g.setLineDash([5, 9]); g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); st(g, '#4a4a55', 2.2); g.setLineDash([]);
      g.globalAlpha = 0.9 * a; for (let i = 0; i < 16; i++) { const an = i * 2.4 + z.x, rr2 = z.r * (0.2 + ((i * 37) % 70) / 100), px = z.x + Math.cos(an) * rr2, py = z.y + Math.sin(an) * rr2 * 0.9; for (let j = 0; j < 3; j++) { const b2 = j / 3 * TAU + i; line(g, [px, py, px + Math.cos(b2) * 5, py + Math.sin(b2) * 4], INK, 2.4); line(g, [px, py, px + Math.cos(b2) * 5, py + Math.sin(b2) * 4], '#c9cdd2', 1.1); } line(g, [px, py, px, py - 6], INK, 2.4); line(g, [px, py, px, py - 6], '#e4e8ea', 1.1); }
      g.globalAlpha = 1;
    } else if (z.kind === 'grail') {
      const a = z.t > z.dur - 0.5 ? (z.dur - z.t) * 2 : 1;
      g.globalAlpha = 0.26 * a; ell(g, z.x, z.y, z.r, z.r, '#f0d264'); g.globalAlpha = 0.9 * a; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); st(g, '#b8862a', 2.6);
      g.beginPath(); g.arc(z.x, z.y, z.r * (0.3 + (T * 0.6) % 0.7), 0, TAU); g.globalAlpha = 0.45 * a; st(g, '#b8862a', 1.6); g.globalAlpha = 1;
    }
  }
  drawOrders(g, b, T) {
    for (const sq of b.squads) {
      if (sq.team !== 0 || sq.alive <= 0) continue; const o = sq.order;
      if (o.kind === 'move') { g.globalAlpha = 0.7; g.setLineDash([8, 8]); g.lineDashOffset = -T * 30; line(g, [sq.cx, sq.cy, o.x, o.y], INK, 2.4); g.setLineDash([]); g.globalAlpha = 1; icon.flag(g, o.x, o.y - 6, 1); }
      else if (o.kind === 'focus' && o.target && o.target.alive > 0) {
        const t = o.target; g.globalAlpha = 0.55; g.setLineDash([6, 8]); g.lineDashOffset = -T * 30; line(g, [sq.cx, sq.cy, t.cx, t.cy], RED, 2.4); g.setLineDash([]);
        g.globalAlpha = 0.9; const r = 22 + Math.sin(T * 6) * 2; g.beginPath(); g.arc(t.cx, t.cy - 14, r, 0, TAU); st(g, RED, 3);
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + T; line(g, [t.cx + Math.cos(a) * (r - 6), t.cy - 14 + Math.sin(a) * (r - 6), t.cx + Math.cos(a) * (r + 6), t.cy - 14 + Math.sin(a) * (r + 6)], RED, 3); }
        g.globalAlpha = 1;
      } else if (o.kind === 'hold') icon.flag(g, sq.cx + 30, sq.cy - 50, 0.8);
    }
  }
  drawProj(g, p, T) {
    if (p.lob) {
      const sh = 1 - Math.min(0.6, (p.h || 0) / 160); g.fillStyle = 'rgba(50,36,20,0.2)'; g.beginPath(); g.ellipse(p.x, p.y, 8 * sh, 4.5 * sh, 0, 0, TAU); g.fill();
      const yy = p.y - (p.h || 0) - 10, vx = (p.tx - p.sx) / p.dur, vy = (p.ty - p.sy) / p.dur - Math.cos(clamp(p.t / p.dur, 0, 1) * PI) * 120, a = Math.atan2(vy, vx);
      g.save(); g.translate(p.x, yy);
      if (p.kind === 'fireball' || p.kind === 'iceball') { const ice = p.kind === 'iceball'; glow(g, 0, 0, 26, ice ? '#8fd3e8' : '#ff9a2e', 0.85); g.rotate(T * 9); g.globalAlpha = 0.5; ell(g, 0, 0, 10, 10, ice ? '#8fd3e8' : '#ff9a2e'); g.globalAlpha = 1; rr(g, -4, -7.5, 8, 15, 1, ice ? '#d6eef6' : '#f0d264', INK, 1.1); line(g, [-1.6, -4.5, 1.6, -2, -1.6, 0.6, 1.6, 3], ice ? INDIGO : RED, 1.1); }
      else { g.rotate(a); line(g, [-14, 0, 6, 0], INK, 3); line(g, [-14, 0, 6, 0], '#e9d9b0', 1.4); poly(g, [5, -3, 12, 0, 5, 3], RED, INK, 0.9); g.globalAlpha = 0.8; poly(g, [-14, -2.4, -24, 0, -14, 2.4], '#ff9a2e'); g.globalAlpha = 1; }
      g.restore();
    } else {
      const a = p.ang || 0;
      if (p.kind === 'sunfire') { glow(g, p.x, p.y, 22, '#ffb040', 0.8); g.globalAlpha = 0.45; ell(g, p.x - Math.cos(a) * 9, p.y - Math.sin(a) * 9, 4.4, 4.4, '#ff9a2e'); ell(g, p.x - Math.cos(a) * 16, p.y - Math.sin(a) * 16, 2.8, 2.8, '#e0503f'); g.globalAlpha = 1; ell(g, p.x, p.y, 5.6, 5.6, '#f0a53a', INK, 1.2); ell(g, p.x - 1.2, p.y - 1.4, 2, 2, '#fbe08a'); return; }
      if (p.kind === 'dark') { g.globalAlpha = 0.5; ell(g, p.x - Math.cos(a) * 8, p.y - Math.sin(a) * 8, 5, 5, '#8fd3e8'); g.globalAlpha = 1; ell(g, p.x, p.y, 6, 6, '#3d3560', INK, 1.2); return; }
      if (p.kind === 'note') { for (let i = 0; i < 3; i++) { g.globalAlpha = 0.9 - i * 0.28; g.beginPath(); g.arc(p.x - Math.cos(a) * i * 7, p.y - Math.sin(a) * i * 7, 4.4 + i * 2, a - 0.9, a + 0.9); st(g, i ? '#e2b24a' : INK, i ? 1.8 : 3.4); if (!i) { g.beginPath(); g.arc(p.x, p.y, 4.4, a - 0.9, a + 0.9); st(g, '#fff3c0', 1.8); } } g.globalAlpha = 1; return; }
      if (p.kind === 'stone') { ell(g, p.x, p.y, 4.4, 4, '#a59f8f', INK, 1.2); return; }
      if (p.kind === 'bullet') { g.globalAlpha = 0.5; line(g, [p.x - Math.cos(a) * 34, p.y - Math.sin(a) * 34, p.x, p.y], '#fbf7ec', 3); g.globalAlpha = 1; ell(g, p.x, p.y, 2.8, 2.8, '#3a3a44', INK, 1); return; }
      if (p.kind === 'spark') { const nx = -Math.sin(a), ny = Math.cos(a), pts = []; for (let i = 0; i <= 4; i++) { const d = i * 9, o = (i % 2 ? 1 : -1) * (i === 0 || i === 4 ? 0 : 5); pts.push(p.x - Math.cos(a) * d + nx * o, p.y - Math.sin(a) * d + ny * o); } line(g, pts, INK, 5); line(g, pts, '#b89cf0', 2.6); ell(g, p.x, p.y, 3.4, 3.4, '#fffbe6', INK, 1); return; }
      if (p.kind === 'firearrow') { glow(g, p.x - Math.cos(a) * 3, p.y - Math.sin(a) * 3, 16, '#ff9a2e', 0.8); g.globalAlpha = 0.75; ell(g, p.x - Math.cos(a) * 3, p.y - Math.sin(a) * 3, 5.5, 5.5, '#ff9a2e'); g.globalAlpha = 1; }
      // 날아가는 화살 뒤로 옅은 바람 자국
      g.save(); g.translate(p.x, p.y); g.rotate(a); g.drawImage(trailImg(), -46, -1.5, 46, 3); g.restore();
      line(g, [p.x - Math.cos(a) * 16, p.y - Math.sin(a) * 16, p.x, p.y], INK, 2.6);
      g.save(); g.translate(p.x, p.y); g.rotate(a); poly(g, [-18, -2.6, -12, 0, -18, 2.6], '#fbf7ec', INK, 0.8); poly(g, [0, -2.2, 5, 0, 0, 2.2], '#e4e8ea', INK, 0.8); g.restore();
    }
  }
  // 시뮬레이션 이벤트 → 이펙트/사운드
  handle(b, sfx) {
    const fx = this.fx, out = [];
    for (const e of b.events) {
      switch (e.type) {
        case 'hit':
          if (e.dodge) { fx.puff(e.x, e.y - 16, 2, '#dfe6ee', 7); fx.txt(e.x, e.y - 50, '흘림', '#5a4a8a', 16, 0.5); break; }
          if (e.block) { fx.star(e.x, e.y - 18, 9, '#dfe6ee'); sfx('clang'); break; }
          if (e.kind === 'burn') { fx.embers(e.x, e.y - 14, 1, '#ff9a2e'); break; }
          if (e.kind === 'melee' || e.kind === 'proj') {
            // 타격: 작은 타격은 종잇조각과 옅은 빛, 큰 타격·배후 타격은 빛 번짐과 먹 붓질
            const warm = e.team === 0 ? '#ff9a7a' : '#ffc870', ink = e.team === 0 ? REDD : MEOK;
            if (e.kind === 'melee' && (e.big || e.flank)) fx.hit(e.x, e.y - 18, !!e.big, ink, warm);
            else { fx.chips(e.x, e.y - 16, e.flank ? 3 : 2, ['#fbf3df', '#efe2c4'], 120); if (Math.random() < 0.5) fx.flare(e.x, e.y - 16, 14, warm, 0.14, 1); }
            if (e.big) fx.shake = Math.max(fx.shake, 2.5);
            sfx(e.kind === 'proj' ? 'thud' : 'hit');
          }
          if (e.flank && Math.random() < 0.34) fx.txt(e.x, e.y - 46, '배후!', '#c8642a', 18, 0.6);
          if (e.big && e.amt >= 60) fx.num(e.x, e.y - 42, e.amt, e.team === 0 ? RED : INK);
          break;
        case 'melee': if (e.big || Math.random() < 0.3) fx.star(e.x, e.y - 4, e.big ? 16 : 9); break;
        case 'squadLost': fx.txt(e.x, e.y - 66, e.again ? '전멸! — 다시 모인다' : '전멸!', RED, 26, 1.1); fx.shake = Math.max(fx.shake, 5); sfx('warn'); out.push(e); break;
        // 패의 살림: 전장에서 주운 패, 가득 찬 주머니, 턴 엽전, 주운 돌
        case 'loot': if (e.x !== undefined) { fx.star(e.x, e.y - 20, 16, '#fffbe6'); fx.add({ k: 'text', x: Math.min(Math.max(e.x, 150), 1130), y: Math.min(Math.max(e.y - 56, 150), 492) - 78, vy: -8, drag: 1.5, s: (e.why === 'hero' ? '되찾은 패 — ' : '노획 — ') + CARDS[e.id].name + (e.up ? '+' : ''), col: '#2f6f5c', size: 22, life: 1.1 }); } sfx('card'); out.push(e); break;
        case 'lootFull': out.push(e); break;
        case 'gold': fx.add({ k: 'text', x: e.x + 18, y: e.y - 34, vy: -40, drag: 1.5, s: '+' + e.n, col: '#b8862a', size: 17, life: 0.8 }); break;
        case 'scavenge': sfx('card'); out.push(e); break;
        case 'waveClear': out.push(e); break;
        case 'porterDown': fx.txt(e.x, e.y - 60, '보따리를 빼앗았다!', '#b8862a', 24, 1.3); out.push(e); break;
        case 'rescue': fx.txt(e.x, e.y - 80, '마을 사람을 구했다!', TEAL, 24, 1.4); out.push(e); break;
        case 'escaped': case 'rescueLost': out.push(e); break;
        case 'ambush': fx.txt(e.x + 330, Math.max(250, e.y), '뒤에서 요괴가 들이닥친다!', RED, 26, 1.6); fx.shake = Math.max(fx.shake, 6); sfx('warn'); break;
        case 'armyDown': fx.shake = 16; fx.flash = 0.8; fx.flashCol = '#fff'; out.push(e); break;
        case 'waveStart': sfx('warn'); break;
        case 'heroSkill': {
          const col = HERO_COL[e.hero] || INDIGO, id = e.id, P2 = e.pts || [];
          fx.add({ k: 'text', x: e.x, y: e.y - 100, vy: -20, drag: 1.5, s: e.name + '!', col, size: 30, life: 1.3, big: true }); fx.ring(e.x, e.y, 64, col, 0.35, 6);
          // 영웅의 낙관 그림을 등 뒤에 붓으로 그리고, 발밑에 먹 고리를 긋는다
          fx.enso(e.x, e.y, 1.15, MEOK, 0.8); if (HERO_SEAL[e.hero]) fx.glyph(e.x, Math.max(124, e.y - 172), HERO_SEAL[e.hero], 88, MEOK, 1.1);
          if (id === 'whirl') { fx.ring(e.x, e.y, 112, INK, 0.3, 7); for (let i = 0; i < 4; i++) fx.slash(e.x + Math.cos(i * 1.57) * 52, e.y - 16 + Math.sin(i * 1.57) * 34, 34, REDD, i * 1.57 + 1.2); fx.shake = Math.max(fx.shake, 6); sfx('charge'); }
          else if (id === 'roar') { fx.ring(e.x, e.y, 190, RED, 0.6, 9); sfx('horn'); }
          else if (id === 'leap') sfx('leap');
          else if (id === 'wave') { fx.ring(e.x, e.y, 250, '#5fae6a', 0.6, 7); sfx('bless'); }
          else if (id === 'ward') { fx.ring(e.x, e.y, 210, '#5f8fb8', 0.6, 8); sfx('bless'); }
          else if (id === 'smite') { fx.bolt(e.tx, e.ty - 6, '#fff3b0'); fx.ring(e.tx, e.ty, 104, '#b8862a', 0.45, 8); fx.burst(e.tx, e.ty - 12, 12, '#f0d264', 220, 4); fx.shake = Math.max(fx.shake, 7); sfx('boom'); }
          else if (id === 'chain') { for (let i = 0; i + 3 < e.pts.length; i += 2) { fx.beam(e.pts[i], e.pts[i + 1], e.pts[i + 2], e.pts[i + 3], '#b89cf0', 0.36, 4); fx.star(e.pts[i + 2], e.pts[i + 3], 16, '#fffbe6'); } fx.flash = 0.25; fx.flashCol = '#e6dcf2'; sfx('magic'); }
          else if (id === 'frost') { fx.ring(e.tx, e.ty, 124, '#4f8fb8', 0.5, 7); fx.burst(e.tx, e.ty - 10, 10, '#bfe3ee', 160, 4); sfx('magic'); }
          else if (id === 'fire') { fx.add({ k: 'fall', x: e.tx, y: e.ty, life: 0.9, size: 16, col: '#f0d264', tail: '#ff9a2e' }); sfx('magic'); }
          else if (id === 'dash') { fx.beam(P2[0], P2[1] - 18, P2[2], P2[3] - 18, '#eef0ff', 0.32, 7); const a = Math.atan2(P2[3] - P2[1], P2[2] - P2[0]); for (let i = 1; i < 4; i++) fx.slash(P2[0] + (P2[2] - P2[0]) * i / 4, P2[1] + (P2[3] - P2[1]) * i / 4 - 18, 30, col, a); fx.shake = Math.max(fx.shake, 5); sfx('charge'); }
          else if (id === 'flurry') { for (let i = 0; i + 1 < P2.length; i += 2) fx.slash(P2[i] + (Math.random() - 0.5) * 10, P2[i + 1] - 18, 28, i % 4 ? col : '#eef0ff', i * 1.3); sfx('charge'); }
          else if (id === 'shadow') { fx.slash(e.tx, e.ty - 18, 44, '#eef0ff', 0.8); fx.slash(e.tx, e.ty - 18, 44, col, 2.3); fx.star(e.tx, e.ty - 20, 22, '#fffbe6'); fx.shake = Math.max(fx.shake, 6); sfx('leap'); }
          else if (id === 'pierce') { fx.beam(P2[0], P2[1], P2[2], P2[3], '#fff3b0', 0.4, 5); fx.beam(P2[0], P2[1], P2[2], P2[3], col, 0.28, 2); sfx('shoot'); }
          else if (id === 'burst') { for (let i = 0; i + 1 < P2.length; i += 2) { fx.beam(e.x, e.y - 30, P2[i], P2[i + 1] - 14, '#e9d9b0', 0.24, 2.4); fx.star(P2[i], P2[i + 1] - 14, 12, '#fffbe6'); } sfx('shoot'); }
          else if (id === 'snipe') { fx.beam(P2[0], P2[1], P2[2], P2[3], '#fffbe6', 0.45, 6); fx.star(e.tx, e.ty - 16, 30, '#fffbe6'); fx.ring(e.tx, e.ty, 60, col, 0.4, 7); fx.shake = Math.max(fx.shake, 8); sfx('thud'); }
          else if (id === 'jajin') { fx.ring(e.x, e.y, 250, '#5fae8a', 0.6, 7); fx.ring(e.x, e.y, 150, '#f0d264', 0.45, 4); sfx('clang'); }
          else if (id === 'sinmyeong') { fx.ring(e.x, e.y, 250, '#f0d264', 0.7, 8); fx.burst(e.x, e.y - 30, 12, '#f0d264', 200, 4); sfx('bless'); }
          else if (id === 'hwimori') { fx.ring(e.x, e.y, 230, col, 0.5, 9); fx.ring(e.x, e.y, 120, '#f0d264', 0.4, 5); fx.flash = 0.25; fx.flashCol = '#fff3c0'; fx.shake = Math.max(fx.shake, 5); sfx('clang'); }
          else if (id === 'quake') { fx.ring(e.x, e.y, 124, INK, 0.4, 9); fx.puff(e.x, e.y - 4, 12, '#e8dcc0', 16); fx.burst(e.x, e.y - 6, 12, '#a59f8f', 220, 4.5); fx.shake = Math.max(fx.shake, 11); sfx('boom'); }
          else if (id === 'provoke') { fx.ring(e.x, e.y, 250, col, 0.7, 9); sfx('horn'); }
          else if (id === 'throw') { fx.star(e.tx, e.ty - 14, 28, '#fbf7ec'); fx.ring(e.tx, e.ty, 60, INK, 0.35, 6); fx.puff(e.tx, e.ty - 6, 8, '#e8dcc0', 12); fx.shake = Math.max(fx.shake, 8); sfx('charge'); }
          break;
        }
        case 'combo': { fx.flash = 0.7; fx.flashCol = '#fff3b0'; fx.shake = 12; fx.ring(e.ax, e.ay, 260, OCHRE, 0.8, 10); fx.ring(e.bx, e.by, 260, OCHRE, 0.8, 10); fx.beam(e.ax, e.ay - 30, e.bx, e.by - 30, '#f0d264', 0.6, 6);
          // 두 영웅 사이를 큰 붓으로 긋고 맞물린 두 고리를 찍는다
          const mx = (e.ax + e.bx) / 2, my = (e.ay + e.by) / 2 - 40; fx.ink('swash', mx, my + 14, { s: 0.9, s1: 1.25, rot: -0.08, life: 1.1, peak: 0.9, in: 0.08, fast: true, v: 0 }); fx.enso(e.ax, e.ay, 1.5, MEOK, 1); fx.enso(e.bx, e.by, 1.5, MEOK, 1); fx.glyph(mx, my, 'combo', 170, JU, 1.4);
          sfx('boss'); out.push(e); break; }
        case 'comboFx': for (const [x, y] of e.pts) { if (e.style === 'slash') { fx.slash(x, y - 18, 48, '#eef0ff', 0.8); fx.slash(x, y - 18, 48, '#5a4a8a', 2.3); } else if (e.style === 'arrow') { fx.add({ k: 'arrow', x, y, life: 0.2 }); fx.add({ k: 'stuck', ground: true, x, y, life: 0.9 }); } else { fx.bolt(x, y - 8); fx.star(x, y - 16, 22, '#fffbe6'); } } break;
        // 사기는 싸움터 한복판이 아니라 왼쪽 아래 사기 표시 위에서 오른다
        case 'morale': { const p = fx.p.find(q => q.mor && q.t < 0.45); if (p) { p.val += e.n; p.s = '사기 +' + Math.round(p.val * 10) / 10; p.t = Math.min(p.t, 0.1); } else fx.add({ k: 'text', mor: true, val: e.n, x: 132, y: 548, vy: -34, drag: 1.5, s: '사기 +' + Math.round(e.n * 10) / 10, col: '#b8862a', size: 21, life: 1 }); } fx.star(e.x, e.y - 30, 11, '#f0d264'); sfx('coin'); break;
        case 'synergy': case 'chase': case 'formation': case 'formLost': out.push(e); break;
        case 'death': {
          const L = getLook(e.utype); fx.puff(e.x, e.y - 8, e.boss ? 14 : 4, '#e8dcc0', e.boss ? 20 : 11); fx.scraps(e.x, e.y - 22, e.boss ? 26 : 6, e.team === 0 ? [PAPER, '#c9d6e6', '#e9dec4'] : [PAPER, '#efc9b8', '#e9dec4']);
          fx.add({ k: 'sprite', x: e.x, y: e.y, spr: L.front, sx: L.scale, sy: L.scale, life: 0.3 }); if (L.head) fx.add({ k: 'sprite', x: e.x, y: e.y, spr: L.head, sx: L.scale, sy: L.scale, life: 0.3 });
          // 요괴는 먹으로 번져 사라진다: 바닥에 먹 자국이 남고 먹 연기가 피어오른다
          if (e.team === 1) { fx.stain(e.x, e.y + 2, e.boss ? 2.6 : 0.6 + Math.random() * 0.35, e.boss ? 9 : 5); fx.wisp(e.x, e.y - 16, e.boss ? 8 : 2); }
          if (e.boss) { fx.shake = 16; fx.flash = 1; fx.flashCol = '#fff'; fx.ring(e.x, e.y, 150, INK, 0.7, 8); fx.splat(e.x, e.y - 30, 2.8, MEOK, 1); fx.glyph(e.x, e.y - 96, 'slay', 150, JU, 1.7); sfx('boom'); } else sfx('death');
          if (e.team === 1) out.push(e);
          break;
        }
        case 'shoot': if (e.kind === 'note') { sfx('clang'); break; } sfx(e.kind === 'fireball' || e.kind === 'dark' || e.kind === 'iceball' || e.kind === 'spark' || e.kind === 'sunfire' ? 'magic' : e.kind === 'shell' ? 'boom' : e.kind === 'bullet' ? 'thud' : 'shoot'); if (e.kind === 'bullet') fx.puff(e.x, e.y - 26, 3, '#d9d4c8', 7); if (e.kind === 'shell') { fx.puff(e.x, e.y - 30, 4, '#d9d4c8', 9); fx.shake = Math.max(fx.shake, 3); } break;
        case 'heal': if (!e.quiet && e.fx !== undefined) fx.beam(e.fx, e.fy - 34, e.x, e.y - 16, e.team === 0 ? '#f0d264' : '#e4826a', 0.22, 3); fx.add({ k: 'plus', x: e.x + (Math.random() - 0.5) * 12, y: e.y - 30, vy: -40, life: 0.6, size: 5.5, col: e.team === 0 ? '#5fae6a' : '#e4826a' }); sfx('heal'); break;
        case 'charge': fx.flare(e.x, e.y - 14, 34, '#ffd890', 0.26, 2); fx.ring(e.x, e.y, 52, INK, 0.32, 5); fx.puff(e.x, e.y - 6, 6, '#e8dcc0', 9); fx.txt(e.x, e.y - 52, '돌격!', e.team === 0 ? INDIGO : RED, 24, 0.8); fx.shake = Math.max(fx.shake, 5); sfx('charge'); break;
        case 'impact': {
          const st2 = e.style, col = st2 === 'root' ? '#4f8a4a' : st2 === 'dark' ? '#5a4a8a' : st2 === 'strike' || st2 === 'volley' ? INDIGO : st2 === 'iceball' ? '#4f8fb8' : '#d9702a';
          fx.ring(e.x, e.y, e.r * 1.25, col, 0.45, 8); fx.ring(e.x, e.y, e.r * 0.8, INK, 0.3, 4); fx.stain(e.x, e.y, e.r / 30, 2.2, 0.36);
          fx.burst(e.x, e.y - 8, st2 === 'fireball' || st2 === 'iceball' ? 8 : 14, st2 === 'root' ? '#9bcf7a' : st2 === 'dark' ? '#b8a0e0' : st2 === 'iceball' ? '#bfe3ee' : '#ffb03a', 220, 4.5); fx.scraps(e.x, e.y - 10, 4, ['#e9dec4', '#d9cdb0']); fx.puff(e.x, e.y - 6, st2 === 'fireball' ? 4 : 8, st2 === 'root' ? '#cfe6b8' : st2 === 'dark' ? '#d3c6ea' : '#e8dcc0', 13);
          fx.shake = Math.max(fx.shake, st2 === 'fireball' || st2 === 'iceball' ? 3 : st2 === 'meteor' ? 14 : 8); if (st2 === 'meteor') { fx.flash = 0.7; fx.flashCol = '#ffd9a0'; }
          // 터지는 자리의 빛: 불은 주황 빛과 불티, 얼음은 푸른 빛, 그 밖은 흰 빛
          { const lc = st2 === 'iceball' ? '#9fd8f0' : st2 === 'dark' ? '#b8a0e0' : st2 === 'root' ? '#bfe0a0' : st2 === 'fireball' || st2 === 'meteor' || st2 === 'fire' ? '#ffb050' : '#ffe6b0'; fx.flare(e.x, e.y - 10, Math.min(120, e.r * 1.1 + 20), lc, st2 === 'meteor' ? 0.5 : 0.32, 3); if (lc === '#ffb050') fx.embers(e.x, e.y - 8, st2 === 'meteor' ? 14 : 6, '#ff9a2e'); }
          sfx('boom'); break;
        }
        case 'rainTick': if (e.fire) fx.embers(e.x, e.y - 6, 4, '#ff9a2e'); for (let i = 0; i < 9; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * e.r, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r * 0.6, life = 0.2 + Math.random() * 0.12; fx.add({ k: 'arrow', x, y, life }); fx.add({ k: 'stuck', ground: true, x, y, life: 1.1 }); if (i % 3 === 0) fx.puff(x, y - 2, 1, '#e8dcc0', 7); if (e.fire && i % 2 === 0) fx.flare(x, y - 4, 12, '#ffa040', 0.18, 1); } sfx('rain'); break;
        case 'vanish': fx.puff(e.x, e.y - 14, e.ally ? 4 : 7, e.ally ? PAPER : '#cfe6f0', 11); if (e.ally) fx.scraps(e.x, e.y - 20, 3); else sfx('leap'); break;
        case 'grow': fx.txt(e.x, e.y - 74 - e.n * 4, e.s || '커진다…', '#5a4a8a', 18, 0.8); fx.wisp(e.x, e.y - 30, 2); fx.ring(e.x, e.y, 46 + e.n * 4, '#3d3560', 0.4, 4); break;
        // 야광귀가 훔친 사기는 한 줄로 더해서 보여 준다
        case 'steal': { const p = fx.p.find(q => q.steal && q.t < 0.7); if (p) { p.val += e.n; p.s = '사기 -' + p.val.toFixed(1); p.t = Math.min(p.t, 0.15); } else fx.add({ k: 'text', steal: true, val: e.n, x: e.x, y: e.y - 50, vy: -30, drag: 1.5, s: '사기 -' + e.n.toFixed(1), col: RED, size: 19, life: 1 }); break; }
        case 'appear': if (e.pounce) { fx.puff(e.x, e.y - 14, 8, PAPER, 12); fx.ring(e.x, e.y, 70, OCHRE, 0.45, 7); fx.slash(e.x, e.y - 18, 36, MEOK); fx.txt(e.x, e.y - 62, '어흥!', '#c8642a', 28, 0.9); fx.shake = Math.max(fx.shake, 5); sfx('charge'); break; }
          fx.puff(e.x, e.y - 14, e.ally ? 10 : 7, e.ally ? PAPER : e.summon || e.revive ? '#cfe6f0' : '#f6f1e6', e.ally ? 13 : 11); if (e.ally) fx.ring(e.x, e.y, 60, INDIGO, 0.4, 5); if (!e.summon && !e.revive) { if (!fx.p.some(q => q.amb && q.t < 0.6 && Math.hypot(q.x - e.x, q.y - e.y) < 150)) { fx.txt(e.x, e.y - 54, '기습!', RED, 22, 0.8); fx.p[fx.p.length - 1].amb = true; sfx('warn'); } } break;
        case 'fuse': fx.txt(e.x, e.y - 60, '화르륵…', '#2f7fa8', 18, 0.5); break;
        case 'lob': fx.add({ k: 'arc', x: e.x, y: e.y - 34, x1: e.tx, y1: e.ty, h: 230, life: e.dur, size: 9, col: '#a59f8f' }); sfx('charge'); break;
        case 'raise': fx.beam(e.fx, e.fy - 40, e.x, e.y, '#8fd3e8', 0.5, 3); sfx('magic'); break;
        case 'warcry': fx.ring(e.x, e.y, 320, RED, 0.8, 10); fx.shake = 10; sfx('boss'); break;
        // ── 두목의 수 ──
        case 'tail': fx.splat(e.x, e.y - 30, 1.2, MEOK, 0.6); fx.puff(e.x, e.y - 24, 7, PAPER, 12); fx.ring(e.x, e.y, 90, '#c8402f', 0.5, 6); fx.shake = Math.max(fx.shake, 6); sfx('boom'); break;
        case 'ring': fx.ring(e.x, e.y - 30, 70 + e.n * 34, '#d9a41e', 0.7, 7); fx.ring(e.x, e.y - 30, 40 + e.n * 20, '#f0d264', 0.5, 4); fx.shake = Math.max(fx.shake, 3 + e.n * 2); sfx('boss'); break;
        case 'charm': fx.ring(e.x, e.y, 70, '#e07ac0', 0.6, 6); sfx('warn'); break;
        case 'plague': fx.ring(e.x, e.y, 70, '#8ac04a', 0.6, 6); fx.wisp(e.x, e.y - 20, 3); sfx('warn'); break;
        case 'bossOpen': fx.ring(e.x, e.y, 120, '#f0d264', 0.6, 8); fx.flash = Math.max(fx.flash, 0.35); fx.flashCol = '#fff3b0'; sfx('star'); break;
        case 'pounce': fx.puff(e.x, e.y - 14, 8, PAPER, 12); fx.ring(e.x, e.y, 80, OCHRE, 0.45, 7); fx.shake = Math.max(fx.shake, 7); sfx('charge'); break;
        case 'text': {
          // 같은 외침이 아직 떠 있으면 새로 쌓지 않고 그 꼬리표를 다시 오래 띄운다
          const same = e.big && fx.p.find(q => q.k === 'text' && q.big && q.s === e.s && q.t < q.life * 0.9); if (same) { same.t = Math.min(same.t, 0.2); sfx('warn'); break; }
          // 위로 쌓다가 머리 띠·패널에 닿으면 아래로 쌓는다
          const minY = e.x > 900 || e.x < 380 ? 124 : VIEW.y0 + 18; let ty = e.y, tail = e.tail, dir = e.tail < 0 ? 1 : -1;
          if (e.big) for (let k = 0; k < 4; k++) { const hit = fx.p.find(q => q.big && q.t < q.life * 0.9 && Math.abs(q.x - e.x) < 230 && Math.abs(q.y - ty) < 42); if (!hit) break; ty = hit.y + dir * 44; if (ty < minY) { dir = 1; ty = Math.max(e.y, hit.y) + 44; } tail = 0; }   // 큰 글이 겹치면 비켜 쌓는다 (비킨 것은 꼬리 없이 앞 꼬리표에 잇댄다)
          fx.add({ k: 'text', x: e.x, y: ty, vy: e.big ? -6 : -30, drag: 1.5, s: e.s, col: e.c || INK, size: e.big ? 30 : 20, life: e.big ? 2 : 0.8, big: e.big, tail }); if (e.big) sfx('warn'); break; }
        case 'blink': fx.puff(e.x, e.y - 14, 3, '#eef3f4', 9); fx.puff(e.tx, e.ty - 14, 3, '#eef3f4', 9); break;
        case 'redraw': case 'shuffle': sfx('card'); break;
        case 'cast': {
          const id = e.id, x = e.x, y = e.y;
          if (e.unit) { sfx('place'); break; }
          if (id === 'sling') { fx.add({ k: 'arc', x, y: y + 260, x1: x, y1: y, h: 60, life: 0.01, size: 6, col: '#a59f8f' }); fx.ring(x, y, e.r * 1.2, INK, 0.3, 5); fx.burst(x, y - 6, 9, '#a59f8f', 170, 4); fx.puff(x, y - 4, 4, '#e8dcc0', 9); fx.shake = Math.max(fx.shake, 4); sfx('thud'); }
          else if (id === 'rain' || id === 'firerain') sfx('shoot');
          else if (id === 'thunder') { fx.bolt(x, y - 10); fx.star(x, y - 18, 30, '#fffbe6'); fx.ring(x, y, 70, '#b8862a', 0.4, 7); fx.burst(x, y - 14, 12, '#f0d264', 240, 4); fx.flash = 0.55; fx.flashCol = '#fffbe6'; fx.shake = Math.max(fx.shake, 9); sfx('boom'); }
          else if (id === 'volley') { fx.txt(x, y - 40, '방포하라!', INDIGO, 26, 1); sfx('charge'); }
          else if (id === 'caltrop') { fx.ring(x, y, e.r * 1.2, '#4a4a55', 0.4, 5); fx.burst(x, y - 20, 10, '#c9cdd2', 150, 3); sfx('clang'); }
          else if (id === 'heal') { fx.ring(x, y, e.r * 1.25, '#5fae6a', 0.5, 6); for (let i = 0; i < 6; i++) fx.add({ k: 'plus', x: x + (Math.random() - 0.5) * e.r * 1.4, y: y - 10 - Math.random() * 30, vy: -50, life: 0.7, size: 6, col: '#5fae6a' }); sfx('heal'); }
          else if (id === 'grail') { fx.ring(x, y, e.r * 1.3, '#b8862a', 0.6, 7); sfx('bless'); }
          else if (id === 'wall') { fx.ring(x, y, e.r * 1.25, INDIGO, 0.5, 8); fx.txt(x, y - 50, '방패 진!', INDIGO, 26, 0.9); sfx('clang'); }
          else if (id === 'flash') { const a = Math.atan2(y - e.sy, x - e.sx); fx.beam(e.sx, e.sy - 18, x, y - 18, '#eef0ff', 0.34, 8); for (let i = 1; i < 5; i++) fx.slash(e.sx + (x - e.sx) * i / 5, e.sy + (y - e.sy) * i / 5 - 18, 34, '#5a4a8a', a); fx.txt(x, y - 60, '일섬!', '#5a4a8a', 28, 0.9); fx.shake = Math.max(fx.shake, 6); sfx('charge'); }
          else if (id === 'veil') { fx.puff(x, y - 14, 12, '#dfe6ee', 15); fx.ring(x, y, 60, '#8fa6b8', 0.5, 6); sfx('leap'); }
          else if (id === 'mark') { fx.ring(x, y, e.r * 1.2, RED, 0.5, 7); fx.ring(x, y, e.r * 0.6, RED, 0.5, 4); fx.txt(x, y - 50, '표적!', RED, 26, 0.9); sfx('warn'); }
          else if (id === 'snare') { fx.ring(x, y, e.r * 1.2, '#8a5a2c', 0.5, 7); fx.burst(x, y - 8, 10, '#d9b77a', 160, 4); fx.puff(x, y - 4, 6, '#e8dcc0', 10); sfx('thud'); }
          else if (id === 'pangut') { fx.ring(x, y, 150, '#f0d264', 0.6, 7); fx.txt(x, y - 70, '얼쑤!', '#2f6f5c', 28, 0.9); sfx('clang'); sfx('card'); }
          else if (id === 'deong') { fx.ring(x, y, 420, '#f0d264', 0.8, 10); fx.ring(x, y, 220, '#2f6f5c', 0.6, 7); fx.flash = 0.4; fx.flashCol = '#fff3c0'; fx.shake = Math.max(fx.shake, 8); fx.txt(x, y - 70, '덩더쿵!', '#2f6f5c', 30, 1); sfx('boom'); sfx('clang'); }
          else if (id === 'bulwark') { fx.ring(x, y, 150, '#8a2a26', 0.6, 9); fx.txt(x, y - 70, '덤벼라!', '#8a2a26', 28, 0.9); sfx('horn'); }
          else if (id === 'raid') { fx.txt(x, y - 50, '산채에서 왔다!', '#8a2a26', 24, 1); sfx('horn'); }
          else if (id === 'horn') { sfx('horn'); fx.flash = 0.3; fx.flashCol = '#f6d98a'; }
          else if (id === 'cry') { fx.ring(x, y, e.r * 1.25, RED, 0.5, 8); fx.txt(x, y - 50, '와아아!', RED, 28, 0.9); sfx('horn'); }
          else if (id === 'ambush') { fx.txt(x, y - 60, '매복이다!', INDIGO, 26, 1); sfx('leap'); }
          else if (id === 'archers') { fx.txt(x, y - 60, '원군 도착!', INDIGO, 26, 1); sfx('leap'); }
          else if (id === 'decoy') { fx.txt(x, y - 60, '허수아비', '#8a6a3c', 22, 0.9); sfx('place'); }
          else if (id === 'strike') sfx('leap');
          else if (id === 'order') { fx.ring(x, y, e.r * 1.2, '#b8862a', 0.5, 8); fx.txt(x, y - 80, '호령!', '#b8742a', 30, 1); sfx('horn'); }
          else if (id === 'sanctuary') { fx.ring(x, y, 170, '#5f8fb8', 0.6, 8); sfx('bless'); }
          else if (id === 'sutra') { fx.flash = 0.3; fx.flashCol = '#f6efd0'; fx.txt(640, 330, '독경', '#b8862a', 40, 1.1); sfx('bless'); }
          else if (id === 'meteor') { fx.add({ k: 'fall', x, y, life: 1.1, size: 18, col: '#f0d264', tail: '#ff9a2e' }); sfx('magic'); }
          else if (id === 'blink') { fx.ring(x, y, e.r, '#8fb6c8', 0.4, 6); sfx('leap'); }
          else if (id === 'scout') { fx.txt(640, 330, '척후를 보냈다', INDIGO, 30, 1.1); sfx('leap'); }
          else if (id === 'torch') { fx.flash = 0.35; fx.flashCol = '#ffd9a0'; fx.txt(640, 330, '횃불을 밝혀라!', '#d9702a', 30, 1.1); sfx('magic'); }
          else if (id === 'stakes') { fx.puff(x, y - 10, 8, '#e8dcc0', 11); fx.txt(x, y - 74, '목책!', '#7a4a2c', 24, 0.9); sfx('place'); }
          else if (id === 'doubt') { fx.txt(640, 520, '잡념을 떨쳤다', '#5a4a7a', 24, 1); sfx('card'); }
          // 데이터로 적은 패(fx): 하는 일에 맞춰 그린다 — 피해는 먹 폭발, 강화는 빛 고리, 부름은 연기, 사기는 금빛 글
          else if (e.fx) { const d = CARDS[id], col = e.col || (d.kind === 'attack' ? RED : d.kind === 'support' ? TEAL : d.kind === 'hero' ? (HERO_COL[d.hero] || OCHRE) : INDIGO), has = k => e.fx.includes(k);
            if (has('aoe') || has('heroJump')) { fx.ring(x, y, (e.r || 60) * 1.15, INK, 0.35, 6); fx.burst(x, y - 10, 12, col, 210, 4); fx.splat(x, y - 6, 1.1, MEOK, 0.35); fx.shake = Math.max(fx.shake, 6); sfx('boom'); }
            if (has('buff') || has('heroBuff') || has('cleanse')) { fx.ring(x, y, Math.max(50, (e.r || 90) * 1.2), col, 0.55, 7); for (let q = 0; q < 6; q++) fx.add({ k: 'plus', x: x + (Math.random() - 0.5) * 90, y: y - 10 - Math.random() * 30, vy: -50, life: 0.7, size: 5, col }); sfx('bless'); }
            if (has('summon')) { fx.puff(x, y - 10, 10, '#e8dcc0', 13); sfx('place'); }
            if (has('zone') || has('mark') || has('weaken') || has('pull')) { fx.ring(x, y, (e.r || 80) * 1.2, col, 0.45, 5); sfx('clang'); }
            if (has('morale') || has('draw') || has('free') || has('expose') || has('bench')) sfx('star');
            fx.txt(x, y - 64, d.name, col, 22, 0.9); }
          break;
        }
      }
    }
    b.events.length = 0;
    return out; // 장면이 처리할 일 (물결 끝, 군기 쓰러짐)
  }
}

// 진형 미리보기(드래그 중)용 임시 인형
export function ghostUnits(type, n, x, y, formation, wpn, br) {
  const def = defOf(type, wpn, br); return formation(n).map(([dx, dy], i) => ({ type, def, x: x + dy, y: y + dx, r: def.r, facing: 0, walk: 0, moving: false, atkT: -9, id: i, flash: 0, hp: 1, maxHp: 1, team: 0, stun: 0, root: 0, haste: 0, weaken: 0, barrier: 0, fuse: 0, run: 0, born: -9 }));
}
