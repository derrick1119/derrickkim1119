/**
 * 합체 탑 — 타이밍 쌓기 × 2048 합치기 × 원버튼.
 * 숫자 블록이 위에서 좌우로 미끄러진다. 누른 순간 그 아래 칸으로 떨어지고, 같은 숫자와 위아래·옆으로 닿으면
 * 두 배로 합쳐진다(연쇄). 3초 안에 안 누르면 저절로 떨어진다. 블록이 맨 위까지 쌓이면 끝.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

export const COLS = 5, ROWS = 8;
const AUTO_DROP = 180;

export interface TowerState {
  rng: Rng;
  t: number;
  /** grid[c] = 아래부터 쌓인 값들 */
  grid: number[][];
  x: number;
  vx: number;
  cur: number;
  next: number;
  wait: number;
  score: number;
  best: number;
  flash: { c: number; r: number; t: number } | null;
  dead: boolean;
}

function draw(s: TowerState): number {
  const top = Math.max(2, s.best);
  // 지금까지 만든 가장 큰 수의 1/4까지 나온다 (판이 커질수록 큰 블록도 섞인다)
  const choices = [2, 4, 8, 16, 32, 64].filter((v) => v <= Math.max(8, top / 4));
  const k = Math.floor(s.rng() * s.rng() * choices.length); // 작은 수가 더 자주
  return choices[k];
}

const colOf = (s: TowerState) => Math.min(COLS - 1, Math.floor(s.x * COLS));

/** 떨어진 블록 (c, r)이 같은 숫자 이웃(아래·왼쪽·오른쪽)을 흡수하며 커진다. 그다음 판 전체 연쇄 */
function settle(s: TowerState, c: number, r: number) {
  for (let k = 0; k < 32; k++) {
    const v = s.grid[c][r];
    const left = c > 0 && s.grid[c - 1][r] === v, right = c < COLS - 1 && s.grid[c + 1][r] === v, below = r > 0 && s.grid[c][r - 1] === v;
    const n = +left + +right + +below;
    if (!n) break;
    if (left) s.grid[c - 1].splice(r, 1);
    if (right) s.grid[c + 1].splice(r, 1);
    if (below) (s.grid[c].splice(r - 1, 1), r--);
    s.grid[c][r] = v * 2 ** n;
    gain(s, c, r);
  }
  chain(s);
}

function gain(s: TowerState, c: number, r: number) {
  const v = s.grid[c][r];
  s.score += v;
  s.best = Math.max(s.best, v);
  s.flash = { c, r, t: s.t };
}

/** 블록이 내려앉으며 새로 닿은 같은 수끼리 합친다: 위아래면 아래 칸으로, 옆이면 왼쪽 칸으로 */
function chain(s: TowerState) {
  for (let changed = true, k = 0; changed && k < 64; k++) {
    changed = false;
    for (let c = 0; c < COLS && !changed; c++) {
      const col = s.grid[c];
      for (let r = 0; r < col.length && !changed; r++) {
        if (r > 0 && col[r - 1] === col[r]) (col.splice(r, 1), (col[r - 1] *= 2), gain(s, c, r - 1), (changed = true));
        else if (c < COLS - 1 && s.grid[c + 1][r] === col[r]) (s.grid[c + 1].splice(r, 1), (col[r] *= 2), gain(s, c, r), (changed = true));
      }
    }
  }
}

function drop(s: TowerState) {
  const c = colOf(s);
  if (s.grid[c].length >= ROWS) return void (s.dead = true);
  s.grid[c].push(s.cur);
  settle(s, c, s.grid[c].length - 1);
  s.cur = s.next;
  s.next = draw(s);
  s.wait = 0;
  s.vx *= 1.01;
}

export const mergetower: GameDef<TowerState> = {
  id: 'mergetower',
  name: '합체 탑',
  genes: ['stack', 'merge', 'onebutton'],
  twist: '2048인데 어디에 둘지가 아니라 언제 누를지로 고른다 — 좌우로 미끄러지는 블록을 제때 떨어뜨린다',
  rules: ['누르면 위에서 움직이는 블록이 떨어집니다.', '같은 숫자끼리 닿으면 두 배로 합쳐져요.', '한 줄이라도 맨 위까지 차면 끝.'],
  controls: 'tap',
  aspect: 1.45,
  create(seed) {
    const s: TowerState = {
      rng: mulberry32(seed), t: 0, grid: Array.from({ length: COLS }, () => []), x: 0.5, vx: 0.011, cur: 2, next: 2,
      wait: 0, score: 0, best: 2, flash: null, dead: false,
    };
    s.cur = draw(s);
    s.next = draw(s);
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    s.x += s.vx;
    if (s.x > 0.999) (s.x = 0.999), (s.vx = -Math.abs(s.vx));
    if (s.x < 0) (s.x = 0), (s.vx = Math.abs(s.vx));
    if (input.tap || ++s.wait >= AUTO_DROP) drop(s);
  },
  over: (s) => s.dead,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    const cell = Math.min(w / COLS, h / (ROWS + 2.2)), ox = (w - cell * COLS) / 2, top = cell * 2;
    const tint = (v: number) => [th.soft, th.muted, th.accent, th.ink, th.hot][Math.min(4, Math.floor(Math.log2(v) / 1.6))];
    const box = (x: number, y: number, v: number, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = tint(v);
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      ctx.fillStyle = Math.log2(v) / 1.6 < 1 ? th.ink : th.bg;
      ctx.font = `800 ${Math.round(cell * (v >= 1000 ? 0.28 : v >= 100 ? 0.34 : 0.42))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(v), x + cell / 2, y + cell / 2);
      ctx.globalAlpha = 1;
    };
    // 바닥 판
    ctx.strokeStyle = th.soft;
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) (ctx.beginPath(), ctx.moveTo(ox + c * cell, top), ctx.lineTo(ox + c * cell, top + ROWS * cell), ctx.stroke());
    ctx.strokeStyle = th.hot;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(ox, top);
    ctx.lineTo(ox + COLS * cell, top);
    ctx.stroke();
    ctx.setLineDash([]);
    // 떨어질 자리 표시
    const c = colOf(s);
    ctx.fillStyle = th.soft;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(ox + c * cell, top, cell, ROWS * cell);
    ctx.globalAlpha = 1;
    s.grid.forEach((col, ci) => col.forEach((v, r) => box(ox + ci * cell, top + (ROWS - 1 - r) * cell, v)));
    if (s.flash && s.t - s.flash.t < 20) {
      ctx.strokeStyle = th.hot;
      ctx.lineWidth = 4;
      ctx.strokeRect(ox + s.flash.c * cell + 2, top + (ROWS - 1 - s.flash.r) * cell + 2, cell - 4, cell - 4);
    }
    // 움직이는 블록 + 자동 낙하 게이지
    box(ox + s.x * COLS * cell - cell / 2, cell * 0.6, s.cur);
    ctx.fillStyle = th.hot;
    ctx.fillRect(ox, cell * 0.45, COLS * cell * (1 - s.wait / AUTO_DROP), 3);
    ctx.fillStyle = th.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 ${Math.round(cell * 0.32)}px system-ui, sans-serif`;
    ctx.fillText(String(s.score), ox, 4);
    ctx.textAlign = 'right';
    ctx.fillText(`다음 ${s.next}`, ox + COLS * cell, 4);
  },
};

export const towerRandom: Bot<TowerState> = { name: '막누르기', act: (_s, rng) => ({ tap: rng() < 1 / 50, dir: 0 }) };

/** 봇: 각 칸에 떨어뜨렸을 때를 미리 계산해 가장 좋은 칸 한가운데에서 누른다 */
export const towerSmart: Bot<TowerState> = {
  name: '칸 고르기',
  act(s) {
    const value = (c: number) => {
      const t: TowerState = { ...s, rng: () => 0.5, grid: s.grid.map((col) => col.slice()), flash: null };
      if (t.grid[c].length >= ROWS) return -1e9;
      t.grid[c].push(t.cur);
      const before = t.score;
      settle(t, c, t.grid[c].length - 1);
      const heights = t.grid.map((col) => col.length);
      const maxH = Math.max(...heights), sumH = heights.reduce((a, b) => a + b, 0);
      // 위에 작은 수, 아래 큰 수가 오게(2048식 정렬)를 약하게 선호
      const order = t.grid.reduce((a, col) => a + col.reduce((b, v, r) => b + (r > 0 && v > col[r - 1] ? -1 : 0), 0), 0);
      return (t.score - before) * 2 - sumH * 3 - (maxH >= ROWS - 1 ? 400 : maxH * maxH * 2) + order * 4;
    };
    const scores = [...Array(COLS).keys()].map(value);
    const best = scores.indexOf(Math.max(...scores));
    const center = (best + 0.5) / COLS, here = colOf(s);
    // 그 칸 안에 들어왔고 가운데 근처면 누른다 (자동 낙하 직전이면 지금 칸이라도)
    return { tap: (here === best && Math.abs(s.x - center) < 0.06) || s.wait > AUTO_DROP - 3, dir: 0 };
  },
};
