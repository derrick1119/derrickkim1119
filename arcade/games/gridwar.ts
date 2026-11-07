/**
 * 한 칸 우주전 — 슈팅(종스크롤) × 자동 전투 · 스와이프 · 턴제화. (0022)
 * 5줄짜리 모눈 위의 전투기. 밀 때마다(←·→로 한 칸, 탭·↑는 제자리) 한 턴이 흐른다. 가만히 있으면 1.2초 뒤 저절로 한 턴.
 * 턴마다: 내가 움직이고 → 내 총이 앞줄 첫 적을 쏘고 → 적이 한 칸 내려온다. 적이 내 칸에 닿거나 바닥을 지나가면 방어막 -1.
 * 비틀기: 슈팅을 한 수씩 두는 차례로 바꿨다 — 손이 빠른 게 아니라 다음 수를 읽는 게 실력. 그런데 오래 고민할 수는 없다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

export const COLS = 5, ROWS = 9, TURN_TICKS = 72, HP_MAX = 5;
export type Mod = '관통' | '양옆 포' | '수리';
type Kind = 'grunt' | 'zig' | 'tank';
interface Foe { c: number; r: number; hp: number; kind: Kind; zig: 1 | -1 }
export interface GridState {
  rng: Rng;
  t: number;
  turn: number;
  wait: number;
  col: number;
  foes: Foe[];
  hp: number;
  pierce: boolean;
  side: boolean;
  kills: number;
  fired: { cols: number[]; t: number } | null;
  hitAt: number;
  last: { name: Mod; t: number } | null;
  dead: boolean;
}

function spawnRow(s: GridState) {
  const lvl = s.turn / 60;
  const n = s.rng() < 0.35 + 0.25 * Math.min(1, lvl) ? 2 : s.rng() < 0.75 ? 1 : 0;
  const used = new Set<number>();
  for (let k = 0; k < n; k++) {
    let c = Math.floor(s.rng() * COLS);
    while (used.has(c)) c = (c + 1) % COLS;
    used.add(c);
    const roll = s.rng();
    const kind: Kind = roll < 0.15 + 0.15 * Math.min(1, lvl) ? 'tank' : roll < 0.4 ? 'zig' : 'grunt';
    s.foes.push({ c, r: 0, hp: kind === 'tank' ? 3 + Math.floor(lvl) : 1 + (s.rng() < lvl * 0.3 ? 1 : 0), kind, zig: s.rng() < 0.5 ? 1 : -1 });
  }
}

function mod(s: GridState) {
  const all: Mod[] = [];
  if (!s.pierce) all.push('관통');
  if (!s.side) all.push('양옆 포');
  if (s.hp < HP_MAX) all.push('수리');
  if (!all.length) return;
  const m = all[Math.floor(s.rng() * all.length)];
  s.last = { name: m, t: s.t };
  if (m === '관통') s.pierce = true;
  else if (m === '양옆 포') s.side = true;
  else s.hp++;
}

/** 한 턴: 이동 → 사격 → 적 전진 */
export function turn(s: GridState, step: -1 | 0 | 1) {
  s.turn++;
  s.wait = 0;
  s.col = Math.max(0, Math.min(COLS - 1, s.col + step));
  // 이동한 칸에 이미 적이 있으면 부딪힘
  for (const f of s.foes) if (f.c === s.col && f.r === ROWS - 1) (f.hp = 0), s.hp--, (s.hitAt = s.t);
  const cols = s.side ? [s.col - 1, s.col, s.col + 1].filter((c) => c >= 0 && c < COLS) : [s.col];
  for (const c of cols) {
    const line = s.foes.filter((f) => f.c === c && f.hp > 0).sort((a, b) => b.r - a.r);
    for (const f of s.pierce ? line : line.slice(0, 1)) {
      f.hp--;
      if (f.hp <= 0 && ++s.kills % 6 === 0) mod(s);
    }
  }
  s.fired = { cols, t: s.t };
  s.foes = s.foes.filter((f) => f.hp > 0);
  for (const f of s.foes) {
    if (f.kind === 'tank' && s.turn % 2 === 1) continue; // 탱크는 두 턴에 한 칸
    f.r++;
    if (f.kind === 'zig') {
      const nc = f.c + f.zig;
      if (nc < 0 || nc >= COLS) f.zig = (-f.zig) as 1 | -1;
      f.c = Math.max(0, Math.min(COLS - 1, f.c + f.zig));
    }
  }
  for (const f of s.foes) {
    if (f.r === ROWS - 1 && f.c === s.col) (f.hp = 0), s.hp--, (s.hitAt = s.t);
    else if (f.r >= ROWS) (f.hp = 0), s.hp--, (s.hitAt = s.t);
  }
  s.foes = s.foes.filter((f) => f.hp > 0);
  spawnRow(s);
  if (s.hp <= 0) s.dead = true;
}

export const gridwar: GameDef<GridState> = {
  id: 'gridwar',
  name: '한 칸 우주전',
  genes: ['shmup', 'autobattle', 'swipe', 'turnbased'],
  twist: '슈팅을 한 수씩 두는 차례로 바꿨다 — 손이 빠른 게 아니라 다음 수를 읽는 게 실력, 그런데 1.2초 안에',
  rules: ['밀면(← →) 한 칸 움직이고 한 턴이 흘러요. 탭(↑)은 제자리. 가만히 있으면 1.2초 뒤 저절로 한 턴.', '턴마다 내 총이 앞의 첫 적을 쏘고, 적은 한 칸씩 내려와요.', '적이 내 칸에 닿거나 바닥을 지나가면 방어막이 깎여요. 다 깎이면 끝.'],
  controls: 'swipe',
  aspect: 1.55,
  art: {
    concept: '모눈종이 우주',
    mood: '공책 모눈 위에 볼펜으로 그린 전투기와 적. 사격은 파란 형광펜, 피격은 빨간 펜 낙서.',
    palette: { bg: '#fdfcf7', ink: '#22313f', muted: '#9fb6cd', accent: '#3a86ff', hot: '#ff006e', soft: '#e3ecf5' },
  },
  create(seed) {
    const s: GridState = { rng: mulberry32(seed), t: 0, turn: 0, wait: 0, col: 2, foes: [], hp: HP_MAX, pierce: false, side: false, kills: 0, fired: null, hitAt: -99, last: null, dead: false };
    spawnRow(s);
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    const m = input.move;
    if (m === 'left') turn(s, -1);
    else if (m === 'right') turn(s, 1);
    else if (m === 'up' || m === 'down' || input.tap) turn(s, 0);
    else if (++s.wait >= TURN_TICKS) turn(s, 0);
  },
  over: (s) => s.dead,
  score: (s) => s.kills,
  draw(ctx, s, w, h, th: Theme) {
    const cw = w / COLS, top = h * 0.08, ch = (h * 0.86) / ROWS;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    // 모눈
    ctx.strokeStyle = th.soft;
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += cw / 3) (ctx.beginPath(), ctx.moveTo(x, 0), ctx.lineTo(x, h), ctx.stroke());
    for (let y = 0; y <= h; y += ch / 3) (ctx.beginPath(), ctx.moveTo(0, y), ctx.lineTo(w, y), ctx.stroke());
    ctx.strokeStyle = th.muted;
    for (let c = 1; c < COLS; c++) (ctx.beginPath(), ctx.moveTo(c * cw, top), ctx.lineTo(c * cw, top + ROWS * ch), ctx.stroke());
    ctx.strokeStyle = th.hot;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, top + ROWS * ch);
    ctx.lineTo(w, top + ROWS * ch);
    ctx.stroke();
    ctx.setLineDash([]);
    // 사격 (형광펜)
    if (s.fired && s.t - s.fired.t < 10) {
      ctx.fillStyle = 'rgba(58,134,255,.25)';
      for (const c of s.fired.cols) ctx.fillRect(c * cw + cw * 0.38, top, cw * 0.24, (ROWS - 1) * ch);
    }
    ctx.lineWidth = 2.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of s.foes) {
      const x = f.c * cw + cw / 2, y = top + f.r * ch + ch / 2, r = Math.min(cw, ch) * 0.32;
      ctx.strokeStyle = th.ink;
      ctx.beginPath();
      if (f.kind === 'tank') ctx.rect(x - r, y - r, r * 2, r * 2);
      else if (f.kind === 'zig') (ctx.moveTo(x - r, y - r), ctx.lineTo(x + r, y - r), ctx.lineTo(x, y + r), ctx.closePath());
      else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (f.kind === 'zig') {
        ctx.fillStyle = th.muted;
        ctx.fillText(f.zig > 0 ? '→' : '←', x, y - r * 1.5);
      }
      ctx.fillStyle = th.ink;
      ctx.font = `700 ${Math.round(r * 0.9)}px system-ui, sans-serif`;
      ctx.fillText(String(f.hp), x, y);
    }
    // 내 전투기
    const px = s.col * cw + cw / 2, py = top + (ROWS - 1) * ch + ch / 2, pr = Math.min(cw, ch) * 0.36;
    ctx.strokeStyle = s.t - s.hitAt < 12 ? th.hot : th.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py - pr);
    ctx.lineTo(px + pr, py + pr);
    ctx.lineTo(px, py + pr * 0.4);
    ctx.lineTo(px - pr, py + pr);
    ctx.closePath();
    ctx.stroke();
    // 턴 타이머
    ctx.fillStyle = th.soft;
    ctx.fillRect(0, h - 6, w, 6);
    ctx.fillStyle = th.accent;
    ctx.fillRect(0, h - 6, w * (1 - s.wait / TURN_TICKS), 6);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${Math.round(h * 0.045)}px system-ui, sans-serif`;
    ctx.fillText(String(s.kills), 8, 6);
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.fillText('♥'.repeat(Math.max(0, s.hp)), w - 8, 6);
    if (s.last && s.t - s.last.t < 90) {
      ctx.textAlign = 'center';
      ctx.fillStyle = th.accent;
      ctx.font = `800 ${Math.round(h * 0.055)}px system-ui, sans-serif`;
      ctx.fillText(`✎ ${s.last.name}!`, w / 2, h * 0.4);
    }
  },
};

/** 봇: 아무 때나 아무 쪽으로 민다 */
export const gridRandom: Bot<GridState> = {
  name: '막밀기',
  act: (_s, rng) => {
    const r = rng();
    return { tap: false, dir: 0, move: r < 0.012 ? 'left' : r < 0.024 ? 'right' : r < 0.03 ? 'up' : undefined };
  },
};

/** 봇: 왼쪽·제자리·오른쪽을 두 턴 앞까지 굴려 보고, 덜 다치고 더 잡는 수를 둔다. 사람처럼 0.5초에 한 수 */
export const gridSmart: Bot<GridState> = {
  name: '두 수 앞',
  act(s) {
    if (s.wait < 30) return { tap: false, dir: 0 };
    const clone = (x: GridState): GridState => ({ ...x, rng: () => 0.99, foes: x.foes.map((f) => ({ ...f })) });
    const value = (first: -1 | 0 | 1) => {
      let best = -Infinity;
      for (const second of [-1, 0, 1] as const) {
        const c = clone(s);
        turn(c, first);
        turn(c, second);
        best = Math.max(best, (c.hp - s.hp) * 100 + (c.kills - s.kills) * 2 - c.foes.filter((f) => f.r >= ROWS - 3).length);
      }
      return best;
    };
    const opts = ([-1, 0, 1] as const).map((m) => ({ m, v: value(m) })).sort((a, b) => b.v - a.v);
    const m = opts[0].m;
    return { tap: false, dir: 0, move: m === -1 ? 'left' : m === 1 ? 'right' : 'up' };
  },
};
