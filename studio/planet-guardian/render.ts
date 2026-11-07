/**
 * 그리기 (브라우저 전용). 시뮬 상태 + 손맛 상태 → 캔버스. 상태는 바꾸지 않는다.
 */
import { CARD_Y, CORE, crew, ENEMY_R, BODY, ORBIT, pos, score, siteAngle, spin, type State } from './sim.ts';
import { COLORS, shakeOffset, type Juice } from './juice.ts';

const BG = '#0a0e1f', SOFT = '#1c2547', MUTED = '#3b4470', INK = '#1b1b2f';

/** 카드 영역의 k번째 카드 가로 범위 (0~1) */
export const cardBox = (k: number) => ({ x0: 0.03 + k * 0.32, x1: 0.03 + k * 0.32 + 0.3 });
export const cardTop = (h: number) => h * CARD_Y;

export interface View { cx: number; cy: number; sc: number; w: number; h: number }

export function view(w: number, h: number, zoom = 1): View {
  const play = h * (CARD_Y - 0.02); // 카드 띠 위가 게임판
  // 오너 "조작이 어렵다" → 판을 키운다. 세로 화면에선 운석 출발점이 좌우 화면 밖이어도 된다(가장자리 화살표로 알림)
  return { cx: w / 2, cy: play * 0.53, sc: Math.min(w * 0.6, play * 0.47) * zoom, w, h };
}

const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
/** 튀어나오기: 0→1.2→1 */
const pop = (x: number) => (x >= 1 ? 1 : x < 0.6 ? ease(x / 0.6) * 1.2 : 1.2 - 0.2 * ease((x - 0.6) / 0.4));

let deadFrame = 0, touchOnly = false;
/** 터치 기기에서는 카드의 키보드 번호를 숨긴다 */
export const setTouchOnly = (v: boolean) => void (touchOnly = v);
/** 판이 끝난 화면 프레임을 알려 준다(기지 전경 줌 시작점) */
export const markDead = (frame: number) => void (deadFrame = frame);

export function draw(ctx: CanvasRenderingContext2D, s: State, j: Juice, w: number, h: number, frame: number, showHud = true) {
  const deadFor = s.dead ? frame - deadFrame : 0;
  // 판 중엔 줌 없음(리뷰: 손가락 기준 좌표가 어긋난다). 끝나면 기지 전경으로 다가간다
  const zoom = s.dead ? 1 + 0.9 * ease(deadFor / 90) : 1;
  const v = view(w, h, zoom);
  const sh = shakeOffset(j, frame);
  const cx = v.cx + sh.x * v.sc, cy = v.cy + sh.y * v.sc - (s.dead ? (v.cy - h * 0.27) * ease(deadFor / 90) : 0), sc = v.sc;
  const X = (x: number) => cx + x * sc, Y = (y: number) => cy + y * sc;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  // 별 (시차: 흔들림의 1/3만 따라감)
  for (let k = 0; k < 90; k++) {
    const sx = ((k * 7919) % 997) / 997, sy = ((k * 104729) % 991) / 991;
    ctx.globalAlpha = 0.2 + 0.35 * Math.abs(Math.sin(frame / 50 + k));
    ctx.fillStyle = k % 7 ? MUTED : '#6b78b8';
    const z = k % 5 ? 1.5 : 2.5;
    ctx.fillRect(sx * w + sh.x * sc * 0.3, sy * h + sh.y * sc * 0.3, z, z);
  }
  ctx.globalAlpha = 1;

  // 궤도
  if (!s.dead) {
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = sc * 0.045;
    ctx.beginPath();
    ctx.arc(cx, cy, ORBIT * sc, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 방어막 고리
  const hurt = !s.dead && s.t - s.hitAt < 16;
  for (let k = 0; k < s.hp; k++) {
    ctx.strokeStyle = hurt ? COLORS.big : COLORS.mint;
    ctx.globalAlpha = 0.22 + (hurt ? 0.4 : 0) + 0.06 * Math.sin(frame / 20 + k);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, (CORE + 0.03 + k * 0.018) * sc, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 행성 (광석 흡수에 출렁, 피격에 붉게)
  const pr = CORE * sc * (1 + 0.06 * j.pulse);
  const grad = ctx.createRadialGradient(cx - pr * 0.35, cy - pr * 0.35, pr * 0.1, cx, cy, pr);
  grad.addColorStop(0, hurt ? '#ffb0a0' : '#b8ffe4');
  grad.addColorStop(1, s.dead ? '#3f8f73' : hurt ? '#e05a4a' : COLORS.mint);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(10,14,31,.16)';
  for (let k = 0; k < 5; k++) {
    const c = pos(spin(s) + k * 1.3, CORE * (0.25 + 0.12 * (k % 3)));
    ctx.beginPath();
    ctx.arc(X(c.x), Y(c.y), CORE * sc * (0.12 + 0.05 * (k % 2)), 0, Math.PI * 2);
    ctx.fill();
  }

  // 건물 (튀어나오며 등장, 레벨 점)
  for (const site of s.sites) {
    const a = siteAngle(s, site.slot), bp = pos(a, CORE), k = (0.8 + 0.25 * site.level) * pop((s.t - site.born) / 24);
    ctx.save();
    ctx.translate(X(bp.x), Y(bp.y));
    ctx.rotate(a + Math.PI / 2);
    if (site.kind === '광산') {
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.moveTo(-sc * 0.03 * k, 0);
      ctx.lineTo(sc * 0.03 * k, 0);
      ctx.lineTo(0, -sc * 0.06 * k);
      ctx.fill();
      // 채굴 반짝
      if ((frame + site.slot * 13) % 50 < 6) {
        ctx.fillStyle = COLORS.ore;
        ctx.fillRect(-2, -sc * 0.07 * k, 4, 4);
      }
    } else {
      ctx.fillStyle = COLORS.rock;
      ctx.fillRect(-sc * 0.028 * k, -sc * 0.036 * k, sc * 0.056 * k, sc * 0.036 * k);
      ctx.rotate(site.aim - a - Math.PI / 2 + Math.PI / 2);
      ctx.strokeStyle = COLORS.rock;
      ctx.lineWidth = 3 + site.level;
      ctx.beginPath();
      ctx.moveTo(0, -sc * 0.02 * k);
      ctx.lineTo(0, -sc * 0.07 * k);
      ctx.stroke();
      ctx.rotate(-(site.aim - a));
    }
    ctx.fillStyle = COLORS.ore;
    for (let l = 0; l < site.level; l++) ctx.fillRect(-sc * 0.02 + l * sc * 0.016, sc * 0.012, sc * 0.011, sc * 0.011);
    ctx.restore();
  }

  if (!s.dead) {
    // 운석: 꼬리 + 몸통 + 맞으면 흰 번쩍, HP 2 이상은 테두리(색만으로 구분하지 않기)
    for (const e of s.enemies) {
      const ep = pos(e.a, e.r), tail = pos(e.a, e.r + 0.1), r = ENEMY_R * (e.big ? 1.6 : e.maxHp > 1 ? 1.25 : 1);
      const lit = s.t - e.flash < 4;
      ctx.strokeStyle = e.big ? COLORS.big : COLORS.rock;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = r * sc * 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(ep.x), Y(ep.y));
      ctx.lineTo(X(tail.x), Y(tail.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = lit ? '#ffffff' : e.big ? COLORS.big : COLORS.rock;
      ctx.beginPath();
      ctx.arc(X(ep.x), Y(ep.y), r * sc * (lit ? 1.12 : 1), 0, Math.PI * 2);
      ctx.fill();
      if (e.maxHp > 1) {
        ctx.strokeStyle = '#fff3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X(ep.x), Y(ep.y), r * sc * 0.6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * e.hp) / e.maxHp);
        ctx.stroke();
      }
      // 행성 가까이 오면 경고 표시
      if (e.r < CORE + 0.16) {
        ctx.strokeStyle = COLORS.big;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(frame / 3);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X(ep.x), Y(ep.y), r * sc * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // 총알: 짧은 빛줄기
    ctx.lineCap = 'round';
    for (const b of s.bullets) {
      ctx.strokeStyle = b.from === 'ship' ? COLORS.mint : COLORS.ore;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X(b.x), Y(b.y));
      ctx.lineTo(X(b.x - b.vx * 3), Y(b.y - b.vy * 3));
      ctx.stroke();
    }
    // 편대
    // 목표 표시: 누른 곳(손을 떼도 배가 그리로 간다)
    if (s.target !== null) {
      const tp = pos(s.target, ORBIT);
      ctx.strokeStyle = COLORS.mint;
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(frame / 5);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(X(tp.x), Y(tp.y), BODY * sc * 1.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 화면 밖 운석: 가장자리 화살표
    for (const e of s.enemies) {
      const ep = pos(e.a, e.r), ex = X(ep.x), ey = Y(ep.y), m = 14;
      if (ex > -4 && ex < w + 4 && ey > -4 && ey < h + 4) continue;
      const ax = Math.min(w - m, Math.max(m, ex)), ay = Math.min(h - m, Math.max(m, ey)), ang = Math.atan2(cy - ey, cx - ex);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = e.big ? COLORS.big : COLORS.rock;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-6, 7);
      ctx.fill();
      ctx.restore();
    }
    crew(s).forEach((a, k) => {
      const m = pos(a, ORBIT), r = BODY * sc * (k === 0 ? 1 : 0.85);
      ctx.fillStyle = k === 0 ? COLORS.mint : COLORS.white;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(X(m.x), Y(m.y), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.arc(X(m.x * 1.06), Y(m.y * 1.06), r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      if (s.dir) {
        const ahead = pos(a + s.dir * 0.28, ORBIT);
        ctx.strokeStyle = k === 0 ? COLORS.mint : COLORS.white;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, ORBIT * sc, Math.min(a, a + s.dir * 0.28), Math.max(a, a + s.dir * 0.28));
        ctx.stroke();
        ctx.globalAlpha = 1;
        void ahead;
      }
    });
  }

  // 파티클
  for (const p of j.parts) {
    const f = p.life / p.max;
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = f;
      ctx.lineWidth = 3 * f + 1;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), p.size * sc * (1.2 - f), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, f * 1.5);
      const z = Math.max(1, p.size * sc * (p.kind === 'spark' ? f : 0.5 + f * 0.5));
      ctx.fillRect(X(p.x) - z / 2, Y(p.y) - z / 2, z, z);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.ore;
  for (const m of j.motes) {
    ctx.beginPath();
    ctx.arc(X(m.x), Y(m.y), Math.max(2, sc * 0.009), 0, Math.PI * 2);
    ctx.fill();
  }
  // 떠오르는 글자
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of j.floats) {
    ctx.globalAlpha = 1 - f.age / 50;
    ctx.fillStyle = f.color;
    ctx.font = `900 ${Math.round(f.size * sc * pop(f.age / 10))}px system-ui, sans-serif`;
    ctx.fillText(f.text, X(f.x), Y(f.y));
  }
  ctx.globalAlpha = 1;

  // 가장자리 붉은 번쩍 · 흰 번쩍
  if (!j.calm && j.danger > 0.02) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(255,77,77,0)');
    g.addColorStop(1, `rgba(255,77,77,${0.55 * j.danger})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (!j.calm && j.flash > 0.02) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 * j.flash})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (!s.dead && showHud) hud(ctx, s, w, h, frame);
}

function hud(ctx: CanvasRenderingContext2D, s: State, w: number, h: number, frame: number) {
  const u = Math.min(w, h * 0.7), since = s.last ? s.t - s.last.t : 999;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.white;
  ctx.font = `900 ${Math.round(u * 0.08)}px system-ui, sans-serif`;
  ctx.fillText(String(score(s)), 14, 12);
  ctx.font = `700 ${Math.round(u * 0.036)}px system-ui, sans-serif`;
  ctx.fillStyle = COLORS.mint;
  // 방어막 = 행성 고리와 같은 모양 (리뷰: ♥ 대신 고리로 통일)
  const ry = 14 + u * 0.115, rr = Math.max(7, u * 0.022);
  for (let k = 0; k < Math.max(3, s.hp); k++) {
    ctx.strokeStyle = COLORS.mint;
    ctx.fillStyle = COLORS.mint;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16 + rr + k * rr * 2.6, ry, rr, 0, Math.PI * 2);
    if (k < s.hp) ctx.fill();
    else ctx.stroke();
  }
  ctx.fillStyle = '#8f9bd6';
  ctx.textAlign = 'center';
  ctx.fillText(s.breath > 0 ? `${s.wave}웨이브 방어 · 숨 고르기` : `${s.wave}웨이브`, w / 2, 16);
  ctx.textAlign = 'left';
  if (s.combo >= 2) {
    ctx.fillStyle = COLORS.ore;
    ctx.fillText(`${s.combo}연속`, 16, ry + rr + 8);
  }

  // 건설 카드 띠
  const top = cardTop(h), ch = h * 0.13;
  if (s.offer) {
    const slide = ease((s.t - s.offerAt) / 14), glow = 0.5 + 0.5 * Math.sin(frame / 8);
    s.offer.forEach((c, k) => {
      const bx = cardBox(k), x = bx.x0 * w, cw = (bx.x1 - bx.x0) * w, y = top + (1 - ease((s.t - s.offerAt - k * 3) / 14)) * ch * 1.2;
      ctx.globalAlpha = slide;
      ctx.fillStyle = COLORS.ore;
      ctx.shadowColor = COLORS.ore;
      ctx.shadowBlur = 8 + 10 * glow;
      ctx.beginPath();
      ctx.roundRect(x, y, cw, ch, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(Math.min(cw * 0.13, ch * 0.24))}px system-ui, sans-serif`;
      ctx.fillText(c.label, x + cw / 2, y + ch * 0.2);
      ctx.font = `600 ${Math.round(Math.min(cw * 0.1, ch * 0.18))}px system-ui, sans-serif`;
      ctx.fillText(c.detail, x + cw / 2, y + ch * 0.52);
      ctx.globalAlpha = slide * 0.55;
      ctx.font = `700 ${Math.round(ch * 0.15)}px system-ui, sans-serif`;
      if (!touchOnly) ctx.fillText(String(k + 1), x + cw / 2, y + ch * 0.76);
      ctx.globalAlpha = 1;
    });
  } else {
    const f = Math.min(1, s.ore / s.cost), x = w * 0.06, bw = w * 0.88, y = top + ch * 0.32;
    ctx.fillStyle = SOFT;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, 12, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.ore;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(12, bw * f), 12, 6);
    ctx.fill();
    ctx.fillStyle = '#8f9bd6';
    ctx.textAlign = 'center';
    ctx.font = `600 ${Math.round(Math.min(w * 0.036, ch * 0.17))}px system-ui, sans-serif`;
    ctx.fillText(`광석 ${Math.floor(s.ore)} / ${s.cost} — 차면 건설 카드가 나와요`, w / 2, y + 22);
  }
  if (s.last && since < 70) {
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, (70 - since) / 20);
    ctx.fillStyle = COLORS.ore;
    ctx.font = `900 ${Math.round(u * 0.06 * pop(since / 12))}px system-ui, sans-serif`;
    ctx.fillText(`${s.last.label} 완성!`, w / 2, h * 0.1);
    ctx.globalAlpha = 1;
  }
}
