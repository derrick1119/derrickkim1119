/**
 * 밟기 러너 — 무한 러너 × 서바이버식 성장 × 원버튼.
 * 화면이 흐르고 구덩이와 적이 온다. 누르면 점프. 적을 위에서 밟으면 쓰러뜨리고, 5마리마다 무작위 강화.
 * 옆에서 부딪히거나 구덩이에 빠지면 끝.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const VIEW_H = 0.62, GROUND = 0.5, PX = 0.25, PW = 0.04, PH = 0.06, EW = 0.05, EH = 0.05;
const G = 0.0011, JUMP = -0.0235, BOUNCE = -0.019;
export type Perk = '이단 점프' | '방패' | '느린 시간';
interface Pit { a: number; b: number }
interface Enemy { x: number; alive: boolean }
export interface StompState {
  rng: Rng;
  t: number;
  dist: number;
  speed: number;
  y: number;
  vy: number;
  air: number;
  airMax: number;
  shield: number;
  slow: number;
  pits: Pit[];
  enemies: Enemy[];
  nextAt: number;
  kills: number;
  last: { name: Perk; t: number } | null;
  dead: boolean;
}

/** 앞쪽 2화면까지 장애물을 미리 깔아 둔다 (봇이 내다볼 때 난수를 쓰지 않도록) */
function lay(s: StompState) {
  while (s.nextAt < s.dist + 2.2) {
    const level = Math.min(1, s.dist / 70);
    if (s.rng() < 0.45 + 0.15 * level) {
      const w = 0.1 + s.rng() * (0.05 + 0.36 * level);
      s.pits.push({ a: s.nextAt, b: s.nextAt + w });
      s.nextAt += w;
    } else {
      const n = s.rng() < 0.25 + 0.3 * level ? 2 : 1;
      for (let k = 0; k < n; k++) s.enemies.push({ x: s.nextAt + k * 0.12, alive: true });
      s.nextAt += (n - 1) * 0.12;
    }
    s.nextAt += 0.3 + s.rng() * (0.45 - 0.3 * level);
  }
  s.pits = s.pits.filter((p) => p.b > s.dist - 0.1);
  s.enemies = s.enemies.filter((e) => e.x > s.dist - 0.1);
}

const overPit = (s: StompState) => {
  const x = s.dist + PX;
  return s.pits.some((p) => x - PW / 3 > p.a && x + PW / 3 < p.b);
};

function perk(s: StompState) {
  const all: Perk[] = ['이단 점프', '방패', '느린 시간'];
  const p = all[Math.floor(s.rng() * 3)];
  s.last = { name: p, t: s.t };
  if (p === '이단 점프') s.airMax = Math.min(2, s.airMax + 1);
  else if (p === '방패') s.shield = Math.min(2, s.shield + 1);
  else s.slow = 60 * 6;
}

export const stomp: GameDef<StompState> = {
  id: 'stomp',
  name: '밟기 러너',
  genes: ['endless', 'survivor', 'onebutton'],
  twist: '러너에서 적은 피하는 것이었는데, 여기선 위에서 밟아야 강해진다 — 피할지 밟을지가 매 순간의 선택',
  rules: ['누르면 점프합니다.', '적은 위에서 밟으면 쓰러져요. 옆에서 부딪히거나 구덩이에 빠지면 끝.', '5마리마다 무작위 강화: 이단 점프·방패·느린 시간.'],
  controls: 'tap',
  aspect: 0.62,
  art: {
    concept: '종이 공작',
    mood: '크라프트지 위에 오려 붙인 언덕과 종이 인형. 멀리 있는 언덕은 천천히 지나간다.',
    palette: { bg: '#f1e4c8', ink: '#3b2a1e', muted: '#c9b48e', accent: '#2f6fd6', hot: '#e2513a', soft: '#a9875a' },
  },
  create(seed) {
    const s: StompState = {
      rng: mulberry32(seed), t: 0, dist: 0, speed: 0.0075, y: GROUND, vy: 0, air: 0, airMax: 1, shield: 0, slow: 0,
      pits: [], enemies: [], nextAt: 2.6, kills: 0, last: null, dead: false,
    };
    lay(s);
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    s.speed = 0.0075 + Math.min(0.013, s.t * 0.0000032);
    s.dist += s.slow > 0 ? s.speed * 0.7 : s.speed;
    if (s.slow > 0) s.slow--;
    lay(s);
    const onGround = s.y >= GROUND && s.vy >= 0 && !overPit(s);
    if (onGround) (s.y = GROUND), (s.vy = 0), (s.air = 0);
    if (input.tap && (onGround || s.air < s.airMax)) {
      if (!onGround) s.air++;
      s.vy = JUMP;
    }
    s.vy += G;
    s.y += s.vy;
    if (s.y >= GROUND && !overPit(s) && s.y - s.vy <= GROUND + 0.002) (s.y = GROUND), (s.vy = 0);
    if (s.y > VIEW_H + 0.1) return void (s.dead = true);
    const x = s.dist + PX;
    for (const e of s.enemies) {
      if (!e.alive || Math.abs(e.x - x) > (EW + PW) / 2) continue;
      const top = GROUND - EH;
      if (s.y <= top) continue; // 아직 위에 있음
      if (s.vy > 0 && s.y - s.vy <= top + 0.012) {
        e.alive = false;
        s.vy = BOUNCE;
        s.air = 0;
        if (++s.kills % 5 === 0) perk(s);
      } else if (s.shield > 0) (s.shield--, (e.alive = false));
      else return void (s.dead = true);
    }
  },
  over: (s) => s.dead,
  score: (s) => Math.floor(s.dist * 10) + s.kills * 10,
  draw(ctx, s, w, h, th: Theme) {
    const sc = w, X = (x: number) => (x - s.dist) * sc, Y = (y: number) => (y / VIEW_H) * h;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    // 먼 언덕 두 겹 (느리게 흐르는 시차 스크롤)
    for (const [k, col, amp, base] of [[0.15, th.muted, 0.08, 0.36], [0.4, '#b99c6c', 0.06, 0.44]] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, Y(base - amp * Math.abs(Math.sin((x / w + s.dist * k) * 3.1))));
      ctx.lineTo(w, h);
      ctx.fill();
    }
    // 땅 (구덩이 제외)
    ctx.fillStyle = th.soft;
    ctx.fillRect(0, Y(GROUND), w, h - Y(GROUND));
    ctx.fillStyle = th.bg;
    for (const p of s.pits) ctx.fillRect(X(p.a), Y(GROUND) - 1, (p.b - p.a) * sc, h);
    ctx.fillStyle = th.ink;
    for (const p of s.pits) (ctx.fillRect(X(p.a) - 2, Y(GROUND), 2, h), ctx.fillRect(X(p.b), Y(GROUND), 2, h));
    for (const e of s.enemies) {
      if (!e.alive) continue;
      // 종이 그림자 + 몸통
      ctx.fillStyle = 'rgba(59,42,30,.25)';
      ctx.fillRect(X(e.x - EW / 2) + 3, Y(GROUND - EH) + 3, EW * sc, (EH / VIEW_H) * h);
      ctx.fillStyle = th.hot;
      ctx.fillRect(X(e.x - EW / 2), Y(GROUND - EH), EW * sc, (EH / VIEW_H) * h);
      ctx.fillStyle = th.bg;
      ctx.fillRect(X(e.x - EW / 4), Y(GROUND - EH * 0.7), 3, 3);
    }
    ctx.fillStyle = 'rgba(59,42,30,.25)';
    ctx.fillRect(X(s.dist + PX - PW / 2) + 3, Y(s.y - PH) + 3, PW * sc, (PH / VIEW_H) * h);
    ctx.fillStyle = s.dead ? th.hot : th.accent;
    ctx.fillRect(X(s.dist + PX - PW / 2), Y(s.y - PH), PW * sc, (PH / VIEW_H) * h);
    if (s.shield > 0) {
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(X(s.dist + PX - PW / 2) - 4, Y(s.y - PH) - 4, PW * sc + 8, (PH / VIEW_H) * h + 8);
    }
    ctx.fillStyle = th.ink;
    ctx.font = `700 ${Math.round(h * 0.08)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(stomp.score(s)), 8, 6);
    ctx.textAlign = 'right';
    ctx.font = `600 ${Math.round(h * 0.055)}px system-ui, sans-serif`;
    ctx.fillText(`👟${s.airMax} 🛡${s.shield}${s.slow > 0 ? ' ⏳' : ''} · 다음 강화까지 ${5 - (s.kills % 5)}`, w - 8, 8);
    if (s.last && s.t - s.last.t < 90) {
      ctx.textAlign = 'center';
      ctx.fillStyle = th.hot;
      ctx.font = `800 ${Math.round(h * 0.1)}px system-ui, sans-serif`;
      ctx.fillText(`🎲 ${s.last.name}!`, w / 2, h * 0.22);
    }
  },
};

export const stompRandom: Bot<StompState> = { name: '막누르기', act: (_s, rng) => ({ tap: rng() < 1 / 40, dir: 0 }) };

/** 봇: 지금 뛸 때와 안 뛸 때를 내다보고, 오래 살아남고 더 많이 밟는 쪽을 고른다.
 *  반응 간격은 모든 게임 공통으로 runBot이 준다 (core.REACT, 실험 0016) */
export const stompSmart: Bot<StompState> = {
  name: '내다보기',
  act(s) {
    const sim = (tapNow: boolean) => {
      const c: StompState = { ...s, rng: () => 0.5, pits: s.pits.slice(), enemies: s.enemies.map((e) => ({ ...e })), nextAt: Infinity };
      let k = 0;
      for (; k < 70 && !c.dead; k++) {
        // 뛰고 난 뒤에는 착지 직전 위험하면 한 번 더 뛰는 단순 규칙
        const again = k > 0 && c.vy > 0 && c.air < c.airMax && c.y > GROUND - 0.02 && overPit(c);
        stomp.step(c, { tap: (tapNow && k === 0) || again, dir: 0 });
      }
      return (c.dead ? k : 100) + (c.kills - s.kills) * 15;
    };
    const stay = sim(false), jump = sim(true);
    return { tap: jump > stay, dir: 0 };
  },
};
