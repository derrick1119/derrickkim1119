/**
 * 태풍 캠핑장 (21라운드 '예보 → 짓기 → 버티기' 변형) — 지어서 버티기 × 재난 예보 × 연쇄 · 톡(자리).
 * 기준 9(손이 하는 일은 하나): 칸을 톡 = 그 칸에 지금 조각(돌·바람막이·말뚝·피뢰침)을 놓는다. 다음 조각이 미리 보인다.
 * 와우: 오른쪽에서 풍속 30m/s 돌풍 예보 — 돌·바람막이로 바람 그늘을 만들어 곰 가족 텐트를 지킨다.
 *       안 묶인 것들은 소·냄비·의자까지 우스꽝스럽게 날아가고, 날아간 것이 다른 것을 때려 연쇄로 날린다.
 * 바람은 칸 단위의 결정적인 '바람 지도'다: 막힌 칸 뒤는 바람 그늘(옆에서 돌아 들어와 점점 세짐),
 *       막힌 칸 바로 옆 틈은 밀려난 바람이 몰려 더 세다. 짓는 동안 칸마다 화살표 색으로 그대로 보인다(예보 = 실제).
 *       예보 띠의 돌풍 칩을 톡 하면 그 돌풍의 바람 지도를 골라 본다. 텐트 위 배지 = 그 칸 바람 vs 버팀 22.
 * 고민: 돌은 낮아서 바람은 막지만 날아오는 소·냄비는 훌쩍 넘어 텐트를 때린다 → 말뚝으로 묶거나 높은 바람막이·나무로 막는다.
 *       막은 칸 바로 옆은 바람이 더 세서, 텐트를 빙 둘러 막으면 오히려 텐트 칸으로 바람이 몰린다(6판 회오리).
 * 첫 3초: 판 카드가 예보(← 22m/s)를 크게 보여 주고, 텐트 줄의 냄비에 '!'(날아가 텐트를 때림)와 그 앞 칸이 반짝.
 *       돌을 톡 — 쿵 하며 화살표가 돌 뒤로 휘고 냄비의 '!'가 사라진다. 다 놓으면 돌풍이 휙, 텐트는 버티고 옆 빨래만 펄럭(나무에 걸림).
 *       1판은 풍속 22 = 텐트 버팀이라 아무 데나 놓아도 대개 버틴다(무작위 73%) — 단 텐트 바로 옆(위·아래)에 돌을 두면 틈 바람이 몰려 날아간다.
 * 판 구조: 판마다 정해진 조각을 다 놓거나 '▶ 버티기'를 누르면 돌풍이 온다. 텐트가 무사하면 별
 *       (★ 버팀 · ★ 텐트 상처 없음 · ★ 잃은 물건 없음). 텐트가 날아가거나 무너지면 하트 -1, 그 판을 처음부터 다시 짓는다.
 * 펼쳐짐(하는 일이 바뀐다): 1판 돌(바람 그늘·틈 바람) → 2판 소·말뚝(묶기, 날아간 게 때리는 연쇄)
 *       → 3판 바람막이(두 칸)·나무 틈(바람이 몰림) → 4판 뒤에서 부는 두 번째 돌풍(두 방향 막기)
 *       → 5판 번개(가장 높은 나무가 바람 쪽으로 쓰러짐 → 피뢰침으로 대신 맞기) → 6판 도는 회오리(→ ↓ ←) → 7판 큰 태풍.
 * 웃음(기준 10): 곰 가족 표정(편안·걱정·힘줌·어질어질·우쭐), 소가 공중에서 '음메~?!', 냄비가 텐트에 '땡~!',
 *       텐트가 날아가면 곰 셋이 데굴데굴, 우산 쓴 너구리 구경꾼('ㅋㅋ'·'헉!'), 우산은 돌풍에 뒤집힌다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.34;
export const COLS = 8, ROWS = 8, NN = COLS * ROWS;
/** 3/4 시점 디오라마: 판은 뒤가 살짝 좁은 사다리꼴 (뒤 줄 칸 0.0975·앞 줄 0.11 — 340px에서 33~37px) */
const BY0 = 0.285, CH = 0.083, BY1 = BY0 + ROWS * CH, SIDE = 0.062, WB = 0.78, WF = 0.88, CW = WF / COLS;
const wid = (v: number) => WB + ((WF - WB) * v) / ROWS;
/** 판 좌표(u 열, v 줄) → 화면 x */
const sx = (u: number, v: number) => 0.5 + (u / COLS - 0.5) * wid(v);
/** 화면 (x, y) → 칸 (판 밖이면 -1) */
function cellAt(x: number, y: number): number {
  const v = (y - BY0) / CH, r = Math.floor(v);
  if (r < 0 || r >= ROWS) return -1;
  const u = ((x - 0.5) / wid(v) + 0.5) * COLS, c = Math.floor(u);
  return c < 0 || c >= COLS ? -1 : r * COLS + c;
}
const TRAY0 = 1.02, TRAY1 = 1.235, FOOT0 = 1.25;
const BTN = { x0: 0.665, x1: 0.96, y0: 1.055, y1: 1.2 };
/** 예보 띠: 머리말 폭 · 돌풍 칩 폭 · 칩 i의 가운데 x (톡 하면 그 돌풍의 바람 지도를 본다) */
const PILL_Y = 0.12, PILL_H = 0.06, HEAD_W = 0.2;
const chipW = (gs: Gust[]) => (gs.some((g) => g.bolt) ? 0.19 : 0.16);
const pillW = (gs: Gust[]) => HEAD_W + gs.length * (chipW(gs) + 0.012) + 0.02;
const chipX = (gs: Gust[], i: number) => 0.5 - pillW(gs) / 2 + HEAD_W + i * (chipW(gs) + 0.012) + chipW(gs) / 2;
/** 텐트가 버티는 바람 · 텐트 튼튼함 */
export const TENT_HOLD = 22, HP = 3;
/** 바람 지도: 막힌 칸 옆으로 밀려나는 몫 · 줄마다 되살아나는 몫 · 최대 배율 */
const FUN = 0.25, REC = 0.15, MAXF = 1.5;
/** 날아가던 것이 바람이 (버팀 × LAND)보다 약한 칸에 오면 떨어진다 */
const LAND = 0.75;
/** 돌풍 연출(틱): 예고 · 한 칸 날아가는 시간 · 꼬리 · 돌풍 사이 · 최소 길이 */
const PRE = 46, STEP = 9, TAIL = 40, GAP = 18, MING = 80, RESULT_T = 140, AUTO = 40;
const L = 0, D = 1, R = 2;
const ARROW = ['←', '↓', '→'], FROM = ['오른쪽에서', '뒤에서', '왼쪽에서'];
const NONE = 0, STONE = 1, FENCE = 2, TREE = 3, LOG = 4, STUMP = 5;
const blocks = (b: number) => b >= STONE && b <= LOG;
/** 날아오는 것을 막는 높은 것 (돌·쓰러진 통나무는 낮아서 훌쩍 넘어간다) */
const tall = (b: number) => b === FENCE || b === TREE;

export type Piece = 'stone' | 'fv' | 'fh' | 'stake' | 'rod';
export type Kind = 'laundry' | 'parasol' | 'chair' | 'bike' | 'pot' | 'cow';
export const ITEM: Record<Kind, { e: string; hold: number; dmg: number; name: string; fly: string; hit: string }> = {
  laundry: { e: '👕', hold: 9, dmg: 0, name: '빨래', fly: '펄럭~', hit: '퍽!' },
  parasol: { e: '⛱️', hold: 11, dmg: 1, name: '파라솔', fly: '둥실~', hit: '퍽!' },
  chair: { e: '🪑', hold: 14, dmg: 1, name: '의자', fly: '끼익!', hit: '쿵!' },
  bike: { e: '🚲', hold: 16, dmg: 1, name: '자전거', fly: '따릉~?!', hit: '와장창!' },
  pot: { e: '🍲', hold: 18, dmg: 1, name: '냄비', fly: '달그락!', hit: '땡~!' },
  cow: { e: '🐄', hold: 25, dmg: 2, name: '소', fly: '음메~?!', hit: '음메!!' },
};
export const PIECE: Record<Piece, { name: string; tip: string }> = {
  stone: { name: '돌', tip: '바람을 막아요' },
  fv: { name: '세로 바람막이', tip: '톡한 칸+아래 칸' },
  fh: { name: '가로 바람막이', tip: '톡한 칸+오른쪽 칸' },
  stake: { name: '말뚝', tip: '물건을 묶어요' },
  rod: { name: '피뢰침', tip: '번개를 대신 맞아요' },
};

export interface Gust { dir: number; W: number; bolt: boolean }
export interface Item { k: Kind; cell: number; staked: boolean; lost: boolean }
/** 캠핑장 한 판의 땅: 막는 것(blk)·바람막이 모양(fd)·피뢰침·큰 나무·물건·텐트 */
export interface Camp { blk: Uint8Array; fd: Uint8Array; rod: Uint8Array; big: number; items: Item[]; tent: number; hp: number; gone: boolean }
const cloneCamp = (c: Camp): Camp => ({ blk: c.blk.slice(), fd: c.fd.slice(), rod: c.rod.slice(), big: c.big, items: c.items.map((i) => ({ ...i })), tent: c.tent, hp: c.hp, gone: c.gone });

const rowOf = (k: number) => (k / COLS) | 0, colOf = (k: number) => k % COLS;
const at = (r: number, c: number) => (r < 0 || c < 0 || r >= ROWS || c >= COLS ? -1 : r * COLS + c);
/** 바람 방향의 다음 칸 (판 밖이면 -1) */
const next = (k: number, dir: number) => (dir === L ? (colOf(k) > 0 ? k - 1 : -1) : dir === R ? (colOf(k) < COLS - 1 ? k + 1 : -1) : rowOf(k) < ROWS - 1 ? k + COLS : -1);
/** 바람이 들어오는 쪽에서 몇 번째 줄인가 */
const along = (k: number, dir: number) => (dir === L ? COLS - 1 - colOf(k) : dir === R ? colOf(k) : rowOf(k));
/** (줄 a, 가로 b) → 칸 */
const MAP = [L, D, R].map((dir) => {
  const m = new Int8Array(NN);
  for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) m[a * 8 + b] = dir === L ? b * COLS + (COLS - 1 - a) : dir === D ? a * COLS + b : b * COLS + a;
  return m;
});

/**
 * 바람 지도 (예보 = 실제). 바람이 들어오는 쪽 줄부터 차례로:
 *  막힌 칸은 0, 그 바람의 일부(FUN)는 바로 옆 열린 칸으로 밀려 더 세지고(틈 바람),
 *  다음 줄로 갈 때 옆 칸과 섞이며(돌아 들어오는 바람) 조금씩 원래 세기로 되살아난다 → 그늘은 뒤로 갈수록 가늘어진다.
 */
export function windField(c: Camp, dir: number, W: number, out = new Float32Array(NN)): Float32Array {
  const m = MAP[dir], f = new Float32Array(8).fill(W), col = new Float32Array(8), ex = new Float32Array(8);
  for (let a = 0; a < 8; a++) {
    ex.fill(0);
    for (let b = 0; b < 8; b++) {
      if (!blocks(c.blk[m[a * 8 + b]])) continue;
      const sh = FUN * f[b];
      if (b > 0 && !blocks(c.blk[m[a * 8 + b - 1]])) ex[b - 1] += sh;
      if (b < 7 && !blocks(c.blk[m[a * 8 + b + 1]])) ex[b + 1] += sh;
    }
    for (let b = 0; b < 8; b++) {
      const k = m[a * 8 + b];
      col[b] = blocks(c.blk[k]) ? 0 : Math.min(MAXF * W, f[b] + ex[b]);
      out[k] = col[b];
    }
    for (let b = 0; b < 8; b++) {
      const mm = 0.5 * col[b] + 0.25 * (b > 0 ? col[b - 1] : col[b]) + 0.25 * (b < 7 ? col[b + 1] : col[b]);
      f[b] = mm + REC * (W - mm);
    }
  }
  return out;
}

const itemAtCell = (c: Camp, k: number, skip = -1, flying?: Uint8Array) => {
  for (let i = 0; i < c.items.length; i++) if (i !== skip && !c.items[i].lost && c.items[i].cell === k && !(flying && flying[i])) return i;
  return -1;
};
export const free = (c: Camp, k: number) => k >= 0 && c.blk[k] === NONE && !c.rod[k] && k !== c.tent && itemAtCell(c, k) < 0;

/** 조각 놓기 (안 되는 자리면 이유 문자열) */
export function place(c: Camp, p: Piece, k: number): string {
  if (k < 0) return '판 밖이에요';
  if (p === 'stake') {
    if (k === c.tent) return '텐트는 이미 묶여 있어요';
    const i = itemAtCell(c, k);
    if (i < 0) return '말뚝은 물건에 톡!';
    if (c.items[i].staked) return '벌써 묶었어요';
    c.items[i].staked = true;
    return '';
  }
  if (!free(c, k)) return '여긴 자리가 없어요';
  if (p === 'stone') c.blk[k] = STONE;
  else if (p === 'rod') c.rod[k] = 1;
  else {
    const k2 = p === 'fv' ? (rowOf(k) < ROWS - 1 ? k + COLS : -1) : colOf(k) < COLS - 1 ? k + 1 : -1;
    if (!free(c, k2)) return p === 'fv' ? '아래 칸이 막혀 있어요' : '오른쪽 칸이 막혀 있어요';
    c.blk[k] = c.blk[k2] = FENCE;
    c.fd[k] = p === 'fv' ? 1 : 3;
    c.fd[k2] = p === 'fv' ? 2 : 4;
  }
  return '';
}

/** 번개가 칠 곳: 피뢰침 > 큰 나무 (없으면 -1) */
export function boltTarget(c: Camp): number {
  for (let k = 0; k < NN; k++) if (c.rod[k]) return k;
  return c.big >= 0 && c.blk[c.big] === TREE ? c.big : -1;
}
/** 큰 나무가 쓰러질 칸들 (바람 방향으로 두 칸, 막힌 칸에서 멈춤) */
export function fallCells(c: Camp, from: number, dir: number): number[] {
  const out: number[] = [];
  for (let k = next(from, dir), n = 0; k >= 0 && n < 2 && !blocks(c.blk[k]); k = next(k, dir), n++) out.push(k);
  return out;
}

export interface Flight { it: number; path: number[]; t0: number; dir: number; end: 'land' | 'off' | 'block' | 'tent' | 'item' }
export interface Tl { at: number; kind: string; cell: number; text?: string; it?: number; g?: number }
export interface GustRun { t0: number; on: number; t1: number; dir: number; W: number; f: Float32Array; bolt: number }
export interface Sim {
  flights: Flight[]; tl: Tl[]; gx: GustRun[]; hits: { at: number; dmg: number; it: number }[];
  tentOut: number; downAt: number; fall: { cell: number; cells: number[]; dir: number; at: number } | null;
  end: number; ok: boolean; hp: number; lost: number; flown: number; risk: number;
}

/**
 * 돌풍들을 차례로 일으킨다 (c를 바꾼다). 게임 연출과 봇의 내다보기가 같은 함수를 쓴다.
 *  · 번개: 가장 높은 것(피뢰침 > 큰 나무). 나무면 바람 방향으로 두 칸 쓰러져 텐트를 덮치거나 물건을 튕겨 낸다.
 *  · 텐트 칸의 바람이 버팀(22)보다 세면 텐트가 날아간다.
 *  · 안 묶인 물건은 바람 > 버팀이면 바람 방향으로 한 칸씩 날아간다 — 막힌 칸에 '쿵', 텐트에 '땡'(상처),
 *    다른 물건을 때리면 그 물건이 튕겨 날아간다(연쇄), 바람 그늘에 들어오면 떨어진다, 판 밖이면 잃는다.
 */
export function simStage(c: Camp, gusts: Gust[]): Sim {
  const sim: Sim = { flights: [], tl: [], gx: [], hits: [], tentOut: -1, downAt: -1, fall: null, end: 0, ok: false, hp: c.hp, lost: 0, flown: 0, risk: 0 };
  const flown = new Uint8Array(c.items.length);
  let T = 12;
  gusts.forEach((g, gi) => {
    const on = T + PRE;
    sim.tl.push({ at: T, kind: 'warn', cell: -1, g: gi });
    const kick: number[] = [];
    let bolt = -1;
    if (g.bolt) {
      bolt = boltTarget(c);
      const bt = T + 24;
      if (bolt < 0) sim.tl.push({ at: bt, kind: 'zap', cell: -1 });
      else if (c.rod[bolt]) sim.tl.push({ at: bt, kind: 'zap', cell: bolt });
      else {
        const cells = fallCells(c, bolt, g.dir);
        sim.fall = { cell: bolt, cells, dir: g.dir, at: bt };
        sim.tl.push({ at: bt, kind: 'bolt', cell: bolt });
        c.blk[bolt] = STUMP;
        for (const k of cells) {
          if (k === c.tent && !c.gone) {
            c.hp -= 3;
            sim.hits.push({ at: bt + 12, dmg: 3, it: -1 });
            sim.tl.push({ at: bt + 12, kind: 'crush', cell: k });
            if (c.hp <= 0 && sim.downAt < 0) (sim.downAt = bt + 14), sim.tl.push({ at: bt + 14, kind: 'collapse', cell: k });
            continue;
          }
          for (let i = 0; i < c.items.length; i++) if (!c.items[i].lost && c.items[i].cell === k) kick.push(i);
          c.blk[k] = LOG;
          c.fd[k] = 10 + g.dir;
        }
      }
    }
    const f = windField(c, g.dir, g.W);
    sim.gx.push({ t0: T, on, t1: 0, dir: g.dir, W: g.W, f, bolt });
    sim.tl.push({ at: on, kind: 'gust', cell: -1, g: gi });
    if (!c.gone && c.hp > 0) {
      sim.risk += Math.max(0, f[c.tent] - (TENT_HOLD - 4));
      if (f[c.tent] > TENT_HOLD) (c.gone = true), (sim.tentOut = on + 8), sim.tl.push({ at: on + 8, kind: 'tentfly', cell: c.tent });
    }
    // 날아가기 시작하는 것들 (나무에 튕긴 것은 두 칸 이상 날아간다)
    const fly = new Uint8Array(c.items.length);
    let fl: { it: number; mom: number; f: Flight }[] = [];
    const launch = (i: number, mom: number, t0: number, kind: string) => {
      fly[i] = 1;
      flown[i] = 1;
      const F: Flight = { it: i, path: [c.items[i].cell], t0, dir: g.dir, end: 'land' };
      sim.flights.push(F);
      fl.push({ it: i, mom, f: F });
      sim.tl.push({ at: t0, kind, cell: c.items[i].cell, it: i });
    };
    for (const i of kick) launch(i, 2, on, 'chain');
    for (let i = 0; i < c.items.length; i++) {
      const it = c.items[i];
      if (it.lost || it.staked || fly[i] || f[it.cell] <= ITEM[it.k].hold) continue;
      launch(i, 1, on + along(it.cell, g.dir), 'fly');
    }
    let step = 0;
    while (fl.length && step < 40) {
      step++;
      const now = on + step * STEP, born: number[] = [];
      fl.sort((x, y) => along(c.items[y.it].cell, g.dir) - along(c.items[x.it].cell, g.dir));
      const keep: typeof fl = [];
      for (const q of fl) {
        const it = c.items[q.it], cur = it.cell, nx = next(cur, g.dir);
        const stop = (end: Flight['end'], kind: string, cell: number, text?: string) => {
          q.f.end = end;
          fly[q.it] = 0;
          sim.tl.push({ at: now, kind, cell, it: q.it, text });
        };
        if (nx < 0) {
          it.lost = true;
          stop('off', 'off', cur);
        } else if (tall(c.blk[nx])) stop('block', 'bonk', nx);
        else if (blocks(c.blk[nx])) {
          // 낮은 돌·통나무: 훌쩍 넘어 계속 날아간다 (그 위에선 떨어지지 않는다)
          it.cell = nx;
          q.f.path.push(nx);
          q.mom = Math.max(q.mom, 1);
          sim.tl.push({ at: now, kind: 'hop', cell: nx, it: q.it });
          keep.push(q);
        }
        else if (nx === c.tent && !c.gone && c.hp > 0) {
          const dmg = ITEM[it.k].dmg;
          c.hp -= dmg;
          sim.hits.push({ at: now, dmg, it: q.it });
          stop('tent', 'hit', nx);
          if (c.hp <= 0 && sim.downAt < 0) (sim.downAt = now + 4), sim.tl.push({ at: now + 4, kind: 'collapse', cell: nx });
        } else {
          const j = itemAtCell(c, nx, q.it, fly);
          if (j >= 0) {
            if (c.items[j].staked) stop('block', 'bonk', nx);
            else (stop('item', 'knock', nx), born.push(j));
          } else {
            it.cell = nx;
            q.f.path.push(nx);
            if (--q.mom <= 0 && f[nx] < ITEM[it.k].hold * LAND) stop('land', 'land', nx);
            else keep.push(q);
          }
        }
      }
      fl = keep;
      for (const j of born) launch(j, 2, now, 'chain');
    }
    const t1 = Math.max(on + step * STEP + TAIL, on + MING);
    sim.gx[gi].t1 = t1;
    T = t1 + GAP;
  });
  sim.end = T + 6;
  sim.hp = Math.max(0, c.hp);
  sim.ok = !c.gone && c.hp > 0;
  sim.lost = c.items.filter((i) => i.lost).length;
  sim.flown = flown.reduce((a, b) => a + b, 0);
  return sim;
}

// ───────────────────────────── 판 ─────────────────────────────
interface Layout { tent: number; items: [Kind, number][]; trees: number[]; big: number }
interface Stage { title: string; intro: string; gusts: [number, number, boolean?][]; pieces: Piece[]; make: (rng: Rng) => Layout }
const pick = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
export const STAGES: Stage[] = [
  {
    title: '첫 돌풍',
    intro: '! 표시는 날아가요 — 그 앞에 돌을 놓아요',
    // 첫 판은 거의 못 진다(기준 6): 풍속 22 = 텐트 버팀 — 아무 데나 놓아도 대개 버틴다(무작위 73%).
    // 별은 골라야 받는다: 텐트 줄의 냄비가 날아와 '땡'(상처) · 파라솔은 판 밖으로(잃음) → 그 앞에 돌로 바람 그늘.
    gusts: [[L, 22]],
    pieces: ['stone', 'stone', 'stone'],
    make(rng) {
      const tr = pick(rng, 3, 4), tc = pick(rng, 2, 3), up = rng() < 0.5 ? -1 : 1;
      return { tent: at(tr, tc), items: [['pot', at(tr, tc + 3)], ['laundry', at(tr + up, tc + 1)], ['parasol', at(tr - 2 * up, tc + 3)]], trees: [at(tr + up, 0)], big: -1 };
    },
  },
  {
    title: '소가 날아요',
    intro: '말뚝으로 묶으면 안 날아가요',
    gusts: [[L, 30]],
    pieces: ['stake', 'stone', 'stake', 'stone'],
    make(rng) {
      const tr = pick(rng, 2, 5), tc = pick(rng, 1, 2), up = tr >= 4 ? -1 : 1;
      return { tent: at(tr, tc), items: [['cow', at(tr, tc + 5)], ['chair', at(tr, tc + 3)], ['parasol', at(tr + 2 * up, tc + 3)]], trees: [at(tr + 2 * up, 0)], big: -1 };
    },
  },
  {
    title: '나무 틈 바람',
    intro: '바람막이는 두 칸을 한 번에 막아요',
    gusts: [[L, 32], [L, 32]],
    pieces: ['fv', 'stake', 'stone', 'stone'],
    make(rng) {
      const tr = pick(rng, 2, 5), tc = pick(rng, 1, 2), up = tr >= 4 ? -1 : 1;
      return { tent: at(tr, tc), items: [['pot', at(tr, tc + 5)], ['bike', at(tr + 2 * up, tc + 1)], ['laundry', at(tr - up, tc + 4)]], trees: [at(tr - 1, tc + 3), at(tr + 1, tc + 3)], big: -1 };
    },
  },
  {
    title: '뒤바람',
    intro: '두 번째 돌풍은 뒤에서 불어요',
    gusts: [[L, 30], [D, 26]],
    pieces: ['fh', 'stone', 'stake', 'fv', 'stone'],
    make(rng) {
      const tr = pick(rng, 4, 5), tc = pick(rng, 2, 4);
      return { tent: at(tr, tc), items: [['cow', at(tr - 3, tc)], ['chair', at(tr, tc + 3)], ['pot', at(tr + 1, tc + 2)]], trees: [at(tr - 3, tc + 3)], big: -1 };
    },
  },
  {
    title: '번개 나무',
    intro: '번개는 가장 높은 것에 떨어져요',
    gusts: [[L, 30, true], [L, 28]],
    pieces: ['rod', 'fv', 'stake', 'stone', 'stone'],
    make(rng) {
      const tr = pick(rng, 2, 5), tc = pick(rng, 1, 2), up = tr >= 4 ? -1 : 1;
      const big = at(tr, tc + 2);
      return { tent: at(tr, tc), items: [['cow', at(tr + 2 * up, tc + 5)], ['pot', at(tr - up, tc + 4)], ['laundry', at(tr + up, tc + 1)]], trees: [big, at(tr + 2 * up, tc + 2)], big };
    },
  },
  {
    title: '도는 회오리',
    intro: '바람이 빙 돌아요 → ↓ ←',
    gusts: [[L, 24], [D, 24], [R, 24]],
    pieces: ['stone', 'fv', 'stake', 'fh', 'stone'],
    make(rng) {
      const tr = pick(rng, 3, 4), tc = pick(rng, 3, 4);
      return { tent: at(tr, tc), items: [['cow', at(tr - 2, tc - 2)], ['chair', at(tr + 1, tc + 2)], ['pot', at(tr, tc - 3)], ['parasol', at(tr - 2, tc + 2)]], trees: [at(tr + 2, tc - 1)], big: -1 };
    },
  },
  {
    title: '큰 태풍',
    intro: '풍속 34! 번개까지 와요',
    gusts: [[L, 34, true], [D, 30], [L, 34]],
    pieces: ['rod', 'fv', 'stone', 'stake', 'fh', 'stone', 'stake'],
    make(rng) {
      const tr = pick(rng, 3, 5), tc = pick(rng, 2, 3), big = at(tr - 1, tc + 2);
      return { tent: at(tr, tc), items: [['cow', at(tr, tc + 4)], ['cow', at(tr - 3, tc)], ['pot', at(tr + 1, tc + 3)], ['bike', at(tr + 2, tc + 1)], ['laundry', at(tr - 2, tc + 4)]], trees: [big, at(tr + 2, tc + 4)], big };
    },
  },
];

function buildCamp(L0: Layout): Camp {
  const c: Camp = { blk: new Uint8Array(NN), fd: new Uint8Array(NN), rod: new Uint8Array(NN), big: -1, items: [], tent: L0.tent, hp: HP, gone: false };
  for (const k of L0.trees) if (k >= 0 && k !== c.tent) c.blk[k] = TREE;
  if (L0.big >= 0 && c.blk[L0.big] === TREE) c.big = L0.big;
  for (const [kd, k] of L0.items) if (k >= 0 && free(c, k)) c.items.push({ k: kd, cell: k, staked: false, lost: false });
  return c;
}

interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }
export interface TyphoonState {
  rng: Rng; t: number; stage: number; phase: 'build' | 'storm' | 'result'; pt: number; tries: number;
  base: Camp; camp: Camp; pre: Camp | null; sim: Sim | null; gusts: Gust[]; pieces: Piece[]; pi: number; auto: number;
  prev: Float32Array[]; boltPrev: number; pv: number;
  down: boolean; taps: number; hearts: number; stars: number; got: number; pts: number; ok: boolean; won: boolean; dead: boolean;
  seen: Set<string>; events: Ev[]; news: { text: string; t: number }[];
}

const cy = (r: number) => BY0 + (r + 0.5) * CH;
const kx = (k: number) => sx(colOf(k) + 0.5, rowOf(k) + 0.5), ky = (k: number) => cy(rowOf(k));
/** 그 줄의 칸 폭 (원근) */
const cwAt = (r: number) => wid(r + 0.5) / COLS;
const ev = (s: TyphoonState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
function see(s: TyphoonState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news.push({ text, t: s.t });
}
function refresh(s: TyphoonState) {
  s.prev = s.gusts.map((g) => windField(s.camp, g.dir, g.W));
  s.boltPrev = s.gusts.some((g) => g.bolt) ? boltTarget(s.camp) : -1;
}

function newStage(s: TyphoonState, retry: boolean) {
  const st = STAGES[s.stage];
  if (!retry) s.base = buildCamp(st.make(s.rng));
  s.camp = cloneCamp(s.base);
  s.gusts = st.gusts.map(([dir, W, bolt]) => ({ dir, W, bolt: !!bolt }));
  s.pieces = st.pieces.slice();
  s.pi = 0;
  s.auto = 0;
  s.pv = -1;
  s.phase = 'build';
  s.pt = 0;
  s.pre = null;
  s.sim = null;
  s.got = 0;
  s.ok = false;
  refresh(s);
  ev(s, 'stage', 0.5, 0.2);
  if (s.stage === 1) see(s, 'stake', '📍 말뚝 — 묶은 물건은 안 날아가요'), see(s, 'cow', '🐄 무거운 소도 30m/s면 날아가요');
  if (s.stage === 2) see(s, 'fence', '🧱 바람막이 — 두 칸을 한 번에 막아요'), see(s, 'gap', '🌲 나무 틈으로는 바람이 몰려 세져요');
  if (s.stage === 3) see(s, 'back', '↓ 두 번째 돌풍은 뒤에서 불어요');
  if (s.stage === 4) see(s, 'bolt', '⚡ 번개 맞은 나무는 바람 쪽으로 쓰러져요'), see(s, 'rod', '🗼 피뢰침 — 번개를 대신 맞아요');
  if (s.stage === 5) see(s, 'twister', '🌀 회오리 — 바람이 빙 돌아요 → ↓ ←');
  if (s.stage === 6) see(s, 'typhoon', '🌪️ 큰 태풍 — 풍속 34m/s!');
}

function startStorm(s: TyphoonState) {
  s.pre = cloneCamp(s.camp);
  const c = cloneCamp(s.camp);
  s.sim = simStage(c, s.gusts);
  s.camp = c;
  s.phase = 'storm';
  s.pt = 0;
}

function tapAt(s: TyphoonState, x: number, y: number) {
  if (s.gusts.length > 1 && Math.abs(y - PILL_Y) < PILL_H / 2 + 0.01)
    for (let i = 0; i < s.gusts.length; i++) if (Math.abs(x - chipX(s.gusts, i)) < chipW(s.gusts) / 2 + 0.006) return void ((s.pv = i), ev(s, 'peek', chipX(s.gusts, i), PILL_Y));
  if (x >= BTN.x0 && x <= BTN.x1 && y >= BTN.y0 && y <= BTN.y1) {
    s.taps++;
    ev(s, 'go', (BTN.x0 + BTN.x1) / 2, (BTN.y0 + BTN.y1) / 2);
    return startStorm(s);
  }
  const k = cellAt(x, Math.max(BY0, y));
  if (k < 0 || y < BY0 - 0.012 || s.pi >= s.pieces.length) return;
  const p = s.pieces[s.pi], why = place(s.camp, p, k);
  if (why) return void ev(s, 'nope', kx(k), ky(k), why);
  s.taps++;
  s.pi++;
  refresh(s);
  ev(s, p === 'stake' ? 'tie' : 'put', kx(k), ky(k), p === 'stake' ? '꽉!' : undefined);
  if (p === 'stone' || p === 'fv' || p === 'fh') {
    see(s, 'stone', '🪨 막힌 칸 뒤는 바람 그늘 — 바람이 약해져요');
    const W = s.gusts[0].W;
    if (s.prev[0].some((v) => v > W * 1.2)) see(s, 'funnel', '💨 막힌 칸 바로 옆 틈은 바람이 더 세요');
  }
  if (p === 'rod') ev(s, 'rodput', kx(k), ky(k), '번개는 이리로!');
  if (s.pi >= s.pieces.length) s.auto = s.pt + AUTO;
}

function emit(s: TyphoonState) {
  const sim = s.sim!, pre = s.pre!;
  for (const e of sim.tl) {
    if (e.at !== s.pt) continue;
    const x = e.cell >= 0 ? kx(e.cell) : 0.5, y = e.cell >= 0 ? ky(e.cell) : 0.2, it = e.it !== undefined ? ITEM[pre.items[e.it].k] : null;
    if (e.kind === 'warn') {
      const g = s.gusts[e.g!];
      ev(s, 'warn', 0.5, 0.2, `돌풍 ${e.g! + 1}/${s.gusts.length} ${ARROW[g.dir]} ${g.W}m/s${g.bolt ? ' ⚡' : ''}`);
      if (g.dir === D) see(s, 'back', '↓ 두 번째 돌풍은 뒤에서 불어요');
    } else if (e.kind === 'gust') ev(s, 'gust', 0.5, 0.2);
    else if (e.kind === 'fly') ev(s, 'fly', x, y, it!.fly), see(s, 'fly', '💨 바람이 버팀보다 세면 날아가요');
    else if (e.kind === 'chain') ev(s, 'chain', x, y, `연쇄! ${it!.fly}`), see(s, 'chain', '💥 날아간 게 다른 걸 때려 연쇄로 날려요');
    else if (e.kind === 'knock') ev(s, 'bonk', x, y, '퍽!');
    else if (e.kind === 'hop') ev(s, 'hop', x, y, '훌쩍!'), see(s, 'hop', '🪨 돌은 낮아서 날아오는 건 훌쩍 넘어요 — 바람막이·나무는 막아요');
    else if (e.kind === 'bonk') ev(s, 'bonk', x, y, '쿵!');
    else if (e.kind === 'hit') ev(s, 'hit', x, y, it!.hit), see(s, 'chain', '💥 날아간 게 다른 걸 때려 연쇄로 날려요');
    else if (e.kind === 'off') ev(s, 'off', x, y, '안녕~');
    else if (e.kind === 'land') ev(s, 'land', x, y);
    else if (e.kind === 'tentfly') ev(s, 'tentfly', x, y, '텐트가 날아가요!!');
    else if (e.kind === 'collapse') ev(s, 'collapse', x, y, '폭삭!');
    else if (e.kind === 'bolt') ev(s, 'bolt', x, y, '번쩍! 우지끈!');
    else if (e.kind === 'crush') ev(s, 'hit', x, y, '쿵!! 나무가…');
    else if (e.kind === 'zap') ev(s, 'zap', x, y, e.cell >= 0 ? '찌릿! 피뢰침 덕분에 무사' : '번쩍!');
  }
}

function finish(s: TyphoonState) {
  const sim = s.sim!;
  s.phase = 'result';
  s.pt = 0;
  s.ok = sim.ok;
  if (sim.ok) {
    const st = 1 + (sim.hp >= HP ? 1 : 0) + (sim.lost === 0 ? 1 : 0);
    s.got = st;
    s.stars += st;
    s.pts += 20 + st * 10 + 3 * (s.pieces.length - s.pi);
    ev(s, 'clear', 0.5, BY0 + 0.25, `${s.stage + 1}판 무사! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += 40);
  } else {
    s.hearts--;
    ev(s, 'fail', 0.5, BY0 + 0.25, sim.tentOut >= 0 ? '텐트가 날아갔어요!' : '텐트가 무너졌어요!');
  }
}

export const typhoon: GameDef<TyphoonState> = {
  id: 'typhoon',
  name: '태풍 캠핑장',
  genes: ['fortify', 'forecast', 'chain'],
  twist: '바람은 막힌 곳 뒤로 돌아 들어오고(바람 그늘) 틈에선 더 세지는 칸 단위 바람 지도라서, 돌·바람막이·말뚝을 어디에 놓느냐로 곰 가족 텐트가 버티거나 날아간다 — 안 묶인 소·냄비·의자는 날아가 다른 것을 때리며 연쇄로 텐트를 덮친다',
  rules: ['돌풍 예보를 보고, 칸을 톡 쳐서 돌·바람막이·말뚝을 놓아요.', '막힌 칸 뒤는 바람 그늘! 바람이 버팀보다 세면 날아가요.', '곰 가족 텐트가 버티면 별, 날아가면 하트 -1 다시 짓기.'],
  controls: 'touch',
  origin: '오너 아이디어(지어서 버티기)의 변형 — 태풍',
  hint: '칸을 톡 = 조각 놓기 · ▶ 버티기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '태풍 오는 캠핑장 디오라마',
    mood: '두꺼운 흙 받침 위 작은 잔디 캠핑장, 주황 텐트 속 곰 가족이 빼꼼. 하늘 한쪽에서 거대한 소용돌이 구름이 다가오고, 칸마다 바람 화살표가 흐른다. 돌풍이 오면 빗줄기가 눕고 소·냄비·의자가 빙글빙글 날아간다.',
    palette: { bg: '#1c2433', ink: '#fff8ec', muted: '#8d97a8', accent: '#ffb547', hot: '#ff5d6c', soft: '#34405a' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), t: 0, stage: 0, phase: 'build', pt: 0, tries: 0, base: null as unknown as Camp, camp: null as unknown as Camp, pre: null, sim: null,
      gusts: [], pieces: [], pi: 0, auto: 0, prev: [], boltPrev: -1, pv: -1, down: false, taps: 0, hearts: 3, stars: 0, got: 0, pts: 0, ok: false, won: false, dead: false,
      seen: new Set<string>(), events: [], news: [],
    } as TyphoonState;
    newStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    if (s.events.length > 40) s.events = s.events.filter((e) => s.t - e.t < 90);
    if (s.news.length && ((s.phase === 'build' && s.pt < 110 && s.pi === 0) || s.phase === 'result')) s.news[0].t = s.t;
    if (s.news.length && s.t - s.news[0].t > 170) s.news.shift(), s.news.length && (s.news[0].t = s.t);
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'build') {
      if (press && p) tapAt(s, p.x, p.y * A);
      if (s.phase === 'build' && s.auto > 0 && s.pt >= s.auto) startStorm(s);
    } else if (s.phase === 'storm') {
      emit(s);
      if (s.pt >= s.sim!.end) finish(s);
    } else if (s.pt >= RESULT_T) {
      if (s.won || s.hearts <= 0) s.dead = true;
      else if (s.ok) s.stage++, newStage(s, false);
      else s.tries++, newStage(s, true);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 내다보기 점수: 텐트가 버티는가 > 상처 > 잃은 물건 > 날아간 물건 > 텐트 바람 여유 */
function judge(c: Camp, gusts: Gust[]): number {
  const sim = simStage(cloneCamp(c), gusts);
  return (sim.ok ? 1e6 : 0) + sim.hp * 1e4 - sim.lost * 2500 - sim.flown * 150 - sim.risk * 40;
}
function candidates(c: Camp, p: Piece): number[] {
  const out: number[] = [];
  if (p === 'stake') {
    for (const it of c.items) if (!it.lost && !it.staked) out.push(it.cell);
    return out;
  }
  for (let k = 0; k < NN; k++) {
    if (!free(c, k)) continue;
    if (p === 'fv' && !free(c, rowOf(k) < ROWS - 1 ? k + COLS : -1)) continue;
    if (p === 'fh' && !free(c, colOf(k) < COLS - 1 ? k + 1 : -1)) continue;
    out.push(k);
    if (p === 'rod') break; // 피뢰침은 어디든 같다
  }
  return out;
}
/** 남은 조각을 순서대로, 폭 B의 빔 탐색으로 배치 계획 (매 후보를 실제 돌풍 시뮬레이션으로 잰다) */
export function planCells(c0: Camp, pieces: Piece[], gusts: Gust[], B = 6): number[] {
  let beam: { c: Camp; cells: number[]; v: number }[] = [{ c: c0, cells: [], v: judge(c0, gusts) }];
  for (const p of pieces) {
    const cand: typeof beam = [];
    for (const node of beam) {
      for (const k of candidates(node.c, p)) {
        const c2 = cloneCamp(node.c);
        if (place(c2, p, k)) continue;
        cand.push({ c: c2, cells: [...node.cells, k], v: judge(c2, gusts) });
      }
    }
    if (!cand.length) break;
    cand.sort((a, b) => b.v - a.v);
    const seenKey = new Set<string>(), nb: typeof beam = [];
    for (const x of cand) {
      const key = x.cells.slice().sort((a, b) => a - b).join(',');
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      nb.push(x);
      if (nb.length >= B) break;
    }
    beam = nb;
  }
  return beam[0].cells;
}

const brain = new WeakMap<object, { key: string; cells: number[] }>();
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 잘하는 봇: 판이 시작되면 남은 조각 전부를 빔 탐색 + 돌풍 시뮬레이션으로 계획하고, 계획대로 톡톡 놓는다 */
export const typhoonSmart: Bot<TyphoonState> = {
  name: '캠핑 박사',
  act(s) {
    if (s.phase !== 'build' || s.down || s.pi >= s.pieces.length) return NO;
    const key = `${s.stage}:${s.tries}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, cells: planCells(cloneCamp(s.camp), s.pieces.slice(s.pi), s.gusts) }));
    const k = m.cells.shift();
    if (k === undefined) return { tap: false, dir: 0, pointer: { x: (BTN.x0 + BTN.x1) / 2, y: (BTN.y0 + BTN.y1) / 2 / A } };
    return { tap: false, dir: 0, pointer: { x: kx(k), y: ky(k) / A } };
  },
};

const dumbAt = new WeakMap<object, number>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const typhoonRandom: Bot<TyphoonState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    const nx = dumbAt.get(s) ?? 20 + Math.floor(rng() * 60);
    if (s.t < nx || s.phase !== 'build') return NO;
    dumbAt.set(s, s.t + 15 + Math.floor(rng() * 70));
    return { tap: false, dir: 0, pointer: { x: rng(), y: rng() } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => (c[0] === '#' ? [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)) : c.slice(4, -1).split(',').map(Number));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b), u = Math.max(0, Math.min(1, t));
  return `rgb(${p.map((v, k) => Math.round(v + (q[k] - v) * u)).join(',')})`;
};
const WSTOP: [number, string][] = [[0, '#6fd6c0'], [12, '#9be37a'], [19, '#ffe27a'], [24, '#ffae45'], [30, '#ff6b4a'], [38, '#e8407f']];
/** 바람 세기 → 색 (잔잔 청록 · 약 연두 · 중간 노랑 · 셈 주황 · 아주 셈 빨강) */
function windCol(v: number) {
  for (let i = 1; i < WSTOP.length; i++) if (v <= WSTOP[i][0]) return mix(WSTOP[i - 1][1], WSTOP[i][1], (v - WSTOP[i - 1][0]) / (WSTOP[i][0] - WSTOP[i - 1][0]));
  return WSTOP[WSTOP.length - 1][1];
}
const DV = [[-1, 0], [0, 1], [1, 0]];
const LIFT = 0.055;
type Mood = 'calm' | 'wow' | 'strain' | 'dizzy' | 'smug';
const memo = new WeakMap<object, { racc: { text: string; t: number } | null; pops: { x: number; y: number; t: number }[]; hint: { key: string; cells: number[] } | null }>();

function emo(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, rot = 0, alpha = 1, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, 0, 0);
  ctx.restore();
}
function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, col: string, weight = 800, align: CanvasTextAlign = 'center', maxW?: number) {
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * 0.22);
  ctx.strokeStyle = 'rgba(10,14,24,.75)';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y, maxW);
  ctx.fillStyle = col;
  ctx.fillText(text, x, y, maxW);
}
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  if (stroke) (ctx.strokeStyle = stroke), (ctx.lineWidth = 1.5), ctx.stroke();
}

/** 곰 얼굴 (표정: 편안 · 놀람 · 힘줌 · 어질어질 · 우쭐) */
function bear(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mood: Mood, fur: string, t: number) {
  const dark = mix(fur, '#000000', 0.35);
  for (const s of [-1, 1]) {
    oval(ctx, x + s * r * 0.72, y - r * 0.72, r * 0.36, r * 0.36, fur);
    oval(ctx, x + s * r * 0.72, y - r * 0.72, r * 0.18, r * 0.18, dark);
  }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, mix(fur, '#ffffff', 0.25));
  g.addColorStop(1, fur);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  oval(ctx, x, y + r * 0.38, r * 0.5, r * 0.36, '#f4dcb4');
  oval(ctx, x, y + r * 0.2, r * 0.17, r * 0.11, '#2a1a12');
  ctx.strokeStyle = '#2a1a12';
  ctx.fillStyle = '#2a1a12';
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.lineCap = 'round';
  const ex = r * 0.4, ey = y - r * 0.12;
  if (mood === 'calm') {
    for (const s of [-1, 1]) oval(ctx, x + s * ex, ey, r * 0.11, r * 0.13, '#2a1a12');
    ctx.beginPath();
    ctx.arc(x - r * 0.1, y + r * 0.42, r * 0.1, 0.1, Math.PI - 0.1);
    ctx.arc(x + r * 0.1, y + r * 0.42, r * 0.1, 0.1, Math.PI - 0.1);
    ctx.stroke();
  } else if (mood === 'wow') {
    for (const s of [-1, 1]) oval(ctx, x + s * ex, ey, r * 0.2, r * 0.22, '#ffffff'), oval(ctx, x + s * ex, ey + r * 0.03, r * 0.1, r * 0.11, '#2a1a12');
    oval(ctx, x, y + r * 0.52, r * 0.13, r * 0.16, '#5a1a1a');
  } else if (mood === 'strain') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * (ex + r * 0.14), ey - r * 0.1);
      ctx.lineTo(x + s * (ex - r * 0.08), ey);
      ctx.lineTo(x + s * (ex + r * 0.14), ey + r * 0.1);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - r * 0.24, y + r * 0.42, r * 0.48, r * 0.16);
    ctx.strokeRect(x - r * 0.24, y + r * 0.42, r * 0.48, r * 0.16);
    oval(ctx, x + r * 0.95, y - r * 0.5 + Math.sin(t / 5) * r * 0.1, r * 0.13, r * 0.2, '#9fd8ff');
  } else if (mood === 'dizzy') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < 9; a++) {
        const an = a * 0.9 + t * 0.3, rr = r * 0.02 * a;
        ctx.lineTo(x + s * ex + Math.cos(an) * rr, ey + Math.sin(an) * rr);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - r * 0.25, y + r * 0.5);
    for (let k = 1; k <= 4; k++) ctx.lineTo(x - r * 0.25 + k * r * 0.125, y + r * 0.5 + (k % 2 ? -1 : 1) * r * 0.07);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const an = t * 0.12 + (k * Math.PI * 2) / 3;
      label(ctx, '★', x + Math.cos(an) * r * 1.1, y - r * 1.15 + Math.sin(an) * r * 0.3, r * 0.6, '#ffe066', 900);
    }
  } else {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * ex, ey + r * 0.06, r * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      oval(ctx, x + s * r * 0.62, y + r * 0.22, r * 0.15, r * 0.09, 'rgba(255,120,140,.6)');
    }
    ctx.fillStyle = '#5a1a1a';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.42, r * 0.22, 0, Math.PI);
    ctx.fill();
  }
}

/** 3/4 시점 텐트 (bx,by = 바닥 가운데). 상처(hp)만큼 반창고, flat이면 폭삭 */
function tentShape(ctx: CanvasRenderingContext2D, bx: number, by: number, W: number, H: number, hp: number, mood: Mood, t: number, night: number, flat = false) {
  const D = H * 0.5;
  ctx.save();
  ctx.translate(bx, by);
  if (flat) ctx.scale(1.15, 0.38);
  // 뒤쪽 그림자
  oval(ctx, W * 0.06, -D * 0.25, W * 0.62, D * 0.55, 'rgba(20,30,15,.35)');
  // 지붕 두 면 (위에서 비스듬히 본다)
  ctx.fillStyle = '#ffb04d';
  ctx.beginPath();
  ctx.moveTo(-W / 2, 0);
  ctx.lineTo(0, -H);
  ctx.lineTo(0, -H - D);
  ctx.lineTo(-W / 2, -D);
  ctx.fill();
  ctx.fillStyle = '#e06f26';
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(0, -H);
  ctx.lineTo(0, -H - D);
  ctx.lineTo(W / 2, -D);
  ctx.fill();
  // 앞면
  const fg = ctx.createLinearGradient(0, -H, 0, 0);
  fg.addColorStop(0, '#ffcf7a');
  fg.addColorStop(1, '#f59a3c');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-W / 2, 0);
  ctx.lineTo(0, -H);
  ctx.lineTo(W / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a84e17';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 문 (안쪽은 어둡고, 밤엔 랜턴 빛)
  const dw = W * 0.34, dh = H * 0.72;
  const ig = ctx.createRadialGradient(0, -dh * 0.4, 1, 0, -dh * 0.4, dw);
  ig.addColorStop(0, mix('#3a2414', '#ffcf6a', 0.25 + night * 0.6));
  ig.addColorStop(1, '#2a160b');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.moveTo(-dw, 0);
  ctx.lineTo(0, -dh);
  ctx.lineTo(dw, 0);
  ctx.closePath();
  ctx.fill();
  // 걷어 올린 문자락
  ctx.fillStyle = '#ffd99a';
  ctx.beginPath();
  ctx.moveTo(-dw, 0);
  ctx.lineTo(-dw * 0.25, -dh * 0.75);
  ctx.lineTo(-dw * 1.12, -dh * 0.15);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(dw, 0);
  ctx.lineTo(dw * 0.25, -dh * 0.75);
  ctx.lineTo(dw * 1.12, -dh * 0.15);
  ctx.fill();
  // 곰 가족 (아빠·엄마·아기)
  if (!flat) {
    const r = W * 0.145;
    if (mood === 'smug') {
      // 버텼다! 셋이 문 앞으로 나와 만세 (통통 뛴다)
      ([[-1.25, '#a8703d', 0.95, 0], [1.25, '#86532a', 1.0, 9], [0, '#c99057', 0.78, 17]] as [number, string, number, number][]).forEach(([ox, fur, sz, ph]) => {
        const hop = Math.abs(Math.sin((t + ph) / 7)) * r * 0.5, bx = ox * r, by = r * 0.35 - hop, rr = r * sz;
        oval(ctx, bx, r * 0.55, rr * 0.7, rr * 0.18, 'rgba(20,30,15,.35)');
        oval(ctx, bx, by, rr * 0.72, rr * 0.8, fur);
        oval(ctx, bx, by + rr * 0.15, rr * 0.42, rr * 0.48, '#f4dcb4');
        for (const sd of [-1, 1]) oval(ctx, bx + sd * rr * 0.75, by - rr * 0.75 - Math.sin((t + ph) / 4) * rr * 0.15, rr * 0.22, rr * 0.3, fur);
        bear(ctx, bx, by - rr * 0.95, rr * 0.82, 'smug', fur, t + ph);
      });
    } else {
      bear(ctx, -r * 0.95, -r * 1.05, r * 0.92, mood, '#a8703d', t);
      bear(ctx, r * 0.95, -r * 1.0, r * 0.98, mood, '#86532a', t + 7);
      bear(ctx, 0, -r * 0.55, r * 0.72, mood, '#c99057', t + 13);
      if (mood === 'strain') for (const sd of [-1, 1]) oval(ctx, sd * dw * 0.92, -dh * 0.22, r * 0.28, r * 0.24, '#86532a');
    }
  }
  // 반창고
  for (let k = 0; k < HP - Math.max(0, hp); k++) {
    const px = (k === 0 ? -0.26 : k === 1 ? 0.28 : 0.02) * W, py = (k === 2 ? -0.86 : -0.42) * H;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(k % 2 ? 0.5 : -0.5);
    ctx.fillStyle = '#fff1d6';
    ctx.fillRect(-W * 0.09, -W * 0.035, W * 0.18, W * 0.07);
    ctx.fillStyle = '#e8b98a';
    ctx.fillRect(-W * 0.03, -W * 0.035, W * 0.06, W * 0.07);
    ctx.restore();
  }
  ctx.restore();
  if (flat) {
    for (const [dx, f] of [[-0.25, '#a8703d'], [0.22, '#86532a'], [0, '#c99057']] as [number, string][]) bear(ctx, bx + dx * W, by - H * 0.18, W * 0.1, 'dizzy', f, t + dx * 9);
  }
}

function stoneShape(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, seed: number) {
  oval(ctx, x, y + z * 0.05, z * 0.62, z * 0.2, 'rgba(15,25,10,.4)');
  const g = ctx.createLinearGradient(x, y - z * 0.7, x, y);
  g.addColorStop(0, '#b9b4ab');
  g.addColorStop(1, '#6f6a63');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI + (k / 10) * Math.PI, rr = 0.85 + 0.2 * hsh(seed * 13 + k);
    ctx.lineTo(x + Math.cos(a) * z * 0.55 * rr, y - z * 0.05 + Math.sin(a) * z * 0.62 * rr);
  }
  ctx.lineTo(x + z * 0.55, y);
  ctx.lineTo(x - z * 0.55, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,36,32,.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  oval(ctx, x - z * 0.17, y - z * 0.42, z * 0.16, z * 0.08, 'rgba(255,255,255,.35)');
  oval(ctx, x + z * 0.2, y - z * 0.12, z * 0.12, z * 0.06, 'rgba(110,160,70,.7)');
}

function treeShape(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, lean: number, seed: number, big: boolean) {
  oval(ctx, x + lean * z * 0.3, y + z * 0.04, z * 0.55, z * 0.18, 'rgba(15,25,10,.4)');
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath();
  ctx.moveTo(x - z * 0.08, y);
  ctx.lineTo(x + z * 0.08, y);
  ctx.lineTo(x + z * 0.05 + lean * z * 0.3, y - z * 0.75);
  ctx.lineTo(x - z * 0.05 + lean * z * 0.3, y - z * 0.75);
  ctx.fill();
  const cols = big ? ['#2f6b3a', '#3e8a45', '#5bb055'] : ['#3b7a3e', '#4f9a48', '#73c15e'];
  const blobs = [[0, -0.9, 0.42], [-0.25, -0.72, 0.3], [0.27, -0.75, 0.3], [0.02, -1.18, 0.28]];
  cols.forEach((col, li) => {
    ctx.fillStyle = col;
    for (const [bx0, by0, br] of blobs) {
      const lx = x + (bx0 + lean * 0.55 * (-by0)) * z - li * z * 0.03, ly = y + by0 * z - li * z * 0.04;
      ctx.beginPath();
      ctx.arc(lx, ly, br * z * (1 - li * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
  });
  for (let k = 0; k < 3; k++) oval(ctx, x + (hsh(seed + k) - 0.5) * z * 0.6 + lean * z * 0.4, y - z * (0.8 + hsh(seed + k + 5) * 0.4), z * 0.05, z * 0.04, 'rgba(255,255,255,.25)');
}

function rodShape(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, glow: number) {
  oval(ctx, x, y + z * 0.03, z * 0.3, z * 0.1, 'rgba(15,25,10,.4)');
  oval(ctx, x, y - z * 0.03, z * 0.2, z * 0.09, '#7d7a76');
  ctx.strokeStyle = '#c9d2dc';
  ctx.lineWidth = Math.max(2, z * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y - z * 0.05);
  ctx.lineTo(x, y - z * 1.45);
  ctx.stroke();
  ctx.fillStyle = '#ffe066';
  ctx.shadowColor = '#ffe066';
  ctx.shadowBlur = 6 + glow * 16 + 3 * Math.sin(t / 6);
  ctx.beginPath();
  ctx.arc(x, y - z * 1.5, z * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/** 바람막이: v = 앞뒤로 긴 천 울타리(두 줄), h = 옆으로 긴 나무 판자 */
function fenceShape(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, H: number, vert: boolean, sway: number) {
  oval(ctx, (x0 + x1) / 2 + H * 0.15, (y0 + y1) / 2 + H * 0.1, Math.abs(x1 - x0) / 2 + H * 0.35, Math.abs(y1 - y0) / 2 + H * 0.18, 'rgba(15,25,10,.35)');
  if (vert) {
    // 앞뒤로 긴 천 울타리: 살짝 비스듬히 보이는 파랑·흰 줄무늬 천
    const n = 6, sk = H * 0.55;
    for (let k = 0; k < n; k++) {
      const ya = y0 + ((y1 - y0) * k) / n, yb = y0 + ((y1 - y0) * (k + 1)) / n, bw = sway * H * 0.12 * Math.sin(k * 1.3);
      ctx.fillStyle = k % 2 ? '#f4f7fb' : '#3d8bd9';
      ctx.beginPath();
      ctx.moveTo(x0, ya);
      ctx.lineTo(x0, yb);
      ctx.lineTo(x0 - sk + bw, yb - H);
      ctx.lineTo(x0 - sk + bw, ya - H);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(20,40,80,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 - sk, y0 - H);
    ctx.lineTo(x0 - sk, y1 - H);
    ctx.lineTo(x0, y1);
    ctx.stroke();
    ctx.fillStyle = '#6b4321';
    for (const py of [y0, (y0 + y1) / 2, y1]) {
      ctx.beginPath();
      ctx.moveTo(x0 - 2, py);
      ctx.lineTo(x0 + 2, py);
      ctx.lineTo(x0 - sk + 2, py - H * 1.12);
      ctx.lineTo(x0 - sk - 2, py - H * 1.12);
      ctx.fill();
    }
    return;
  } else {
    const g = ctx.createLinearGradient(0, y0 - H, 0, y0);
    g.addColorStop(0, '#d69a5c');
    g.addColorStop(1, '#9a6334');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0 - H, x1 - x0, H);
    ctx.strokeStyle = 'rgba(70,40,15,.6)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 3; k++) (ctx.beginPath(), ctx.moveTo(x0, y0 - (H * k) / 3), ctx.lineTo(x1, y0 - (H * k) / 3), ctx.stroke());
    ctx.fillStyle = 'rgba(255,230,190,.35)';
    ctx.fillRect(x0, y0 - H, x1 - x0, 2);
  }
  ctx.fillStyle = '#6b4321';
  for (const [px, py] of [[x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) ctx.fillRect(px - 2, py - H * 1.12, 4, H * 1.12);
}

function logShape(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, dir: number) {
  oval(ctx, x, y + z * 0.06, z * 0.6, z * 0.18, 'rgba(15,25,10,.35)');
  ctx.fillStyle = '#7a4a26';
  if (dir === D) ctx.fillRect(x - z * 0.17, y - z * 0.5, z * 0.34, z * 0.62);
  else ctx.fillRect(x - z * 0.52, y - z * 0.28, z * 1.04, z * 0.3);
  ctx.fillStyle = 'rgba(80,140,60,.85)';
  oval(ctx, x + z * 0.1, y - z * 0.3, z * 0.22, z * 0.12, '#4f9a48');
}

/** 너구리 구경꾼 (우산을 들고, 돌풍엔 우산이 뒤집힌다) */
function raccoon(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, gust: number, t: number) {
  oval(ctx, x, y + z * 0.05, z * 0.45, z * 0.12, 'rgba(10,15,10,.4)');
  const flip = gust > 0.6;
  ctx.strokeStyle = '#4a3a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + z * 0.32, y - z * 0.4);
  ctx.lineTo(x + z * 0.32 + gust * z * 0.15, y - z * 1.25);
  ctx.stroke();
  ctx.save();
  ctx.translate(x + z * 0.32 + gust * z * 0.15, y - z * 1.25);
  ctx.rotate(-gust * 0.4 + Math.sin(t / 4) * gust * 0.15);
  ctx.fillStyle = '#ff6b8a';
  ctx.beginPath();
  if (flip) (ctx.moveTo(-z * 0.5, -z * 0.45), ctx.quadraticCurveTo(0, z * 0.05, z * 0.5, -z * 0.45), ctx.lineTo(0, 0));
  else (ctx.moveTo(-z * 0.55, 0), ctx.quadraticCurveTo(0, -z * 0.55, z * 0.55, 0), ctx.closePath());
  ctx.fill();
  ctx.restore();
  emo(ctx, '🦝', x, y - z * 0.32, z * 0.8);
}

function cloudPuff(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  ctx.fillStyle = col;
  for (const [dx, dy, rr] of [[0, 0, 1], [-0.75, 0.2, 0.7], [0.8, 0.18, 0.72], [-0.35, -0.35, 0.65], [0.4, -0.3, 0.6]]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 소용돌이 태풍 구름 */
function stormCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, power: number, flash: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = r * 0.5;
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, mix('#3a4258', '#ffffff', flash));
  g.addColorStop(1, mix('#596379', '#ffffff', flash * 0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.5);
  ctx.rotate(t * (0.02 + power * 0.05));
  for (let arm = 0; arm < 3; arm++) {
    ctx.rotate((Math.PI * 2) / 3);
    ctx.strokeStyle = `rgba(220,230,250,${0.35 + 0.3 * power})`;
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k <= 14; k++) {
      const a = k * 0.28, rr = r * (0.18 + k * 0.065);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
  }
  oval(ctx, 0, 0, r * 0.16, r * 0.16, '#1e2433');
  ctx.restore();
}

function rainLayer(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, amt: number, dir: number, leaves = 0) {
  if (amt <= 0.02) return;
  const [dx, dy] = DV[dir], sx = dx * 0.55 + (dy ? 0.12 : 0), n = Math.round(90 * amt);
  // 바람에 날리는 잎사귀
  for (let k = 0; k < Math.round(16 * leaves); k++) {
    const sp = 3 + hsh(k + 70) * 3, lx = (((hsh(k + 71) * (w + 60) + t * sp * (dx || 0.25)) % (w + 60)) + w + 60) % (w + 60) - 30, ly = (((hsh(k + 72) * h + t * sp * (dy || 0.12) + Math.sin(t / 9 + k) * 12) % h) + h) % h;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(t * 0.2 + k);
    oval(ctx, 0, 0, 4, 2, k % 3 ? '#7cc45a' : '#e0b84a');
    ctx.restore();
  }
  ctx.strokeStyle = `rgba(200,220,255,${0.25 + 0.3 * amt})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const sp = 6 + hsh(k) * 4, px = ((hsh(k + 3) * (w + 80) + t * sp * sx) % (w + 80) + w + 80) % (w + 80) - 40, py = ((hsh(k + 9) * h + t * sp) % h);
    ctx.moveTo(px, py);
    ctx.lineTo(px - sx * 9, py - 11);
  }
  ctx.stroke();
}

/** 지금 화면에 보일 바람: 짓는 동안은 예보(돌아가며), 버티는 동안은 지금 부는 돌풍 */
function liveWind(s: TyphoonState) {
  if (s.phase === 'build') {
    const pv = s.pv >= 0 ? s.pv : s.gusts.length > 1 ? Math.floor(s.pt / 150) % s.gusts.length : 0;
    return { f: s.prev[pv], dir: s.gusts[pv].dir, W: s.gusts[pv].W, k: 1, gi: pv, on: false, pre: 0 };
  }
  if (s.phase === 'storm' && s.sim) {
    const tau = s.pt;
    for (let gi = 0; gi < s.sim.gx.length; gi++) {
      const g = s.sim.gx[gi];
      if (tau < g.t0 || tau >= g.t1 + GAP) continue;
      const k = tau < g.on ? 0.25 * ((tau - g.t0) / PRE) : tau > g.t1 - 25 ? Math.max(0, (g.t1 - tau) / 25) : Math.min(1, (tau - g.on) / 8);
      return { f: g.f, dir: g.dir, W: g.W, k, gi, on: tau >= g.on && tau < g.t1, pre: tau < g.on ? (tau - g.t0) / PRE : 0 };
    }
  }
  return null;
}

interface Pose { x: number; y: number; z: number; rot: number; a: number; air: boolean; dizzy: number }
/** 버티는 동안 물건 i의 자리 (날아가는 길을 칸 단위로 따라간다) */
function pose(s: TyphoonState, i: number, tau: number): Pose | null {
  const sim = s.sim!, base = s.pre!.items[i];
  let F: Flight | null = null;
  for (const f of sim.flights) if (f.it === i && f.t0 <= tau && (!F || f.t0 >= F.t0)) F = f;
  if (!F) return { x: kx(base.cell), y: ky(base.cell) + CH * 0.2, z: 0, rot: 0, a: 1, air: false, dizzy: 0 };
  const dt = tau - F.t0, n = F.path.length - 1, [dx, dy] = DV[F.dir], sg = dx || 1, P = (k: number) => [kx(k), ky(k) + CH * 0.2];
  const seg = dt / STEP;
  if (seg < n) {
    const i0 = Math.floor(seg), fr = seg - i0, [x0, y0] = P(F.path[i0]), [x1, y1] = P(F.path[i0 + 1]);
    return { x: x0 + (x1 - x0) * fr, y: y0 + (y1 - y0) * fr, z: LIFT * Math.min(1, dt / 6) + 0.014 * Math.sin(fr * Math.PI), rot: dt * 0.22 * sg, a: 1, air: true, dizzy: 0 };
  }
  const e = dt - n * STEP, [px, py] = P(F.path[n]);
  if (F.end === 'off') {
    const a = Math.max(0, 1 - e / 34);
    if (a <= 0) return null;
    return { x: px + dx * (e / STEP) * CW, y: py + dy * (e / STEP) * CH, z: LIFT * Math.min(1, dt / 6) + e * 0.004, rot: dt * 0.22 * sg, a, air: true, dizzy: 0 };
  }
  const bump = e < 8 && F.end !== 'land' ? Math.sin((e / 8) * Math.PI) * 0.3 : 0, fall = Math.max(0, 1 - e / 12);
  return { x: px + dx * bump * CW, y: py + dy * bump * CH, z: LIFT * Math.min(1, dt / 6) * fall + (e > 12 && e < 22 ? 0.012 * Math.sin(((e - 12) / 10) * Math.PI) : 0), rot: n * STEP * 0.22 * sg * fall, a: 1, air: fall > 0.3, dizzy: e > 10 && e < 110 ? 1 : 0 };
}

function drawAll(ctx: CanvasRenderingContext2D, s: TyphoonState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, Rr = (r: number) => r * w;
  const t = s.t, M = memo.get(s) ?? { racc: null, pops: [], hint: null };
  memo.set(s, M);
  const lw = liveWind(s), gustK = lw ? lw.k : 0, storming = s.phase === 'storm';
  const sim = s.sim, tau = s.pt, cam = storming && s.pre ? s.pre : s.camp;
  const night = Math.min(1, Math.max(0, (s.stage - 2) / 4));
  const dark = Math.min(1, (s.phase === 'build' ? 0.2 + 0.08 * s.gusts.length : storming ? 0.45 + 0.5 * gustK : 0.2) + night * 0.2);
  let flash = 0;
  if (storming && sim) for (const e of sim.tl) if ((e.kind === 'bolt' || e.kind === 'zap') && tau >= e.at && tau < e.at + 14) flash = Math.max(flash, 1 - (tau - e.at) / 14);
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  const top = mix(mix('#6fb6e8', '#1d2550', night), '#2c3346', dark * 0.8), bot = mix(mix('#ffe6b0', '#8a5a8f', night), '#5a6275', dark * 0.75);
  const sky = ctx.createLinearGradient(0, 0, 0, Y(BY0 + 0.1));
  sky.addColorStop(0, mix(top, '#ffffff', flash * 0.7));
  sky.addColorStop(1, mix(bot, '#ffffff', flash * 0.5));
  ctx.fillStyle = sky;
  ctx.fillRect(-12, -12, w + 24, h + 24);
  if (night > 0.3) {
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 24; k++) (ctx.globalAlpha = (0.2 + 0.5 * hsh(k)) * (1 - dark) * night), ctx.fillRect(hsh(k + 40) * w, Y(0.09 + hsh(k + 80) * 0.16), 1.5, 1.5);
    ctx.globalAlpha = 1;
  }
  // 먼 산 (지평선)
  for (const [yy, col, amp, kk] of [[0.205, '#6a8796', 0.03, 1], [0.235, '#4e7262', 0.022, 2]] as [number, string, number, number][]) {
    ctx.fillStyle = mix(mix(col, '#1a2030', night * 0.6), '#3b4150', dark * 0.5);
    ctx.beginPath();
    ctx.moveTo(-5, Y(yy + 0.12));
    for (let x = 0; x <= 1.0001; x += 0.04) ctx.lineTo(X(x), Y(yy - amp * (0.6 + Math.sin(x * 9 * kk + kk) * 0.5 + 0.4 * Math.sin(x * 23 + kk * 3))));
    ctx.lineTo(w + 5, Y(yy + 0.12));
    ctx.fill();
  }
  // ── 태풍 구름 (바람이 오는 쪽) ──
  {
    const dir = lw ? lw.dir : s.gusts[0].dir, cxp = dir === L ? 0.83 : dir === R ? 0.17 : 0.5, cyp = dir === D ? 0.13 : 0.16;
    const near = storming ? 0.04 * gustK : 0;
    stormCloud(ctx, X(cxp - DV[dir][0] * near), Y(cyp), Rr(0.1 + 0.03 * dark), t, gustK, flash);
    cloudPuff(ctx, X(cxp + (dir === L ? -0.1 : dir === R ? 0.1 : 0.15)), Y(cyp + 0.035), Rr(0.035), mix('#4a5268', '#ffffff', flash * 0.5));
    if (storming && flash > 0.2 && sim) {
      const e = sim.tl.find((q) => (q.kind === 'bolt' || q.kind === 'zap') && tau >= q.at && tau < q.at + 14);
      if (e && e.cell >= 0) {
        const tx = X(kx(e.cell)), ty = Y(ky(e.cell) - 0.06);
        ctx.strokeStyle = '#fffbe0';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#fff7a8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(X(cxp), Y(cyp + 0.03));
        for (let k = 1; k <= 6; k++) ctx.lineTo(X(cxp) + (tx - X(cxp)) * (k / 6) + (k < 6 ? (hsh(k + e.at) - 0.5) * Rr(0.06) : 0), Y(cyp + 0.03) + (ty - Y(cyp + 0.03)) * (k / 6));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }
  // 골짜기: 디오라마 받침 아래로 깊어지는 숲 계곡과 안개 — 받침이 떠 보이게
  {
    const vg = ctx.createLinearGradient(0, Y(0.24), 0, h);
    vg.addColorStop(0, mix(mix('#3f6a58', '#1b2a30', night), '#2c3644', dark * 0.5));
    vg.addColorStop(0.45, mix('#1c2c2c', '#10161e', night));
    vg.addColorStop(1, '#0b0f16');
    ctx.fillStyle = vg;
    ctx.fillRect(-12, Y(0.24), w + 24, h);
    for (let k = 0; k < 26; k++) {
      const side = k % 2, px = side ? 1.02 - hsh(k) * 0.2 : -0.02 + hsh(k) * 0.2, py = 0.27 + hsh(k + 50) * 0.75, z = 0.035 + hsh(k + 9) * 0.035;
      ctx.fillStyle = mix(mix('#2c5244', '#14202a', Math.min(1, (py - 0.27) / 0.8 + night * 0.3)), '#262e3a', dark * 0.3);
      ctx.beginPath();
      ctx.moveTo(X(px), Y(py - z * 2.2));
      ctx.lineTo(X(px + z * 0.6), Y(py));
      ctx.lineTo(X(px - z * 0.6), Y(py));
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(210,225,235,.07)';
    for (let k = 0; k < 4; k++) oval(ctx, X(((hsh(k + 7) + t * 0.0004 * (k + 1)) % 1.4) - 0.2), Y(0.5 + k * 0.17), Rr(0.3), Rr(0.03), 'rgba(210,225,235,.06)');
  }
  // ── 땅 덩어리 (디오라마 받침: 뒤가 좁은 잔디 판 + 두꺼운 흙 옆면) ──
  const m = 0.014, TLx = sx(0, 0) - m, TRx = sx(COLS, 0) + m, BLx = sx(0, ROWS) - m, BRx = sx(COLS, ROWS) + m, Q0 = BY0 - m;
  const corner = (c: number, r: number) => [X(sx(c, r)), Y(BY0 + r * CH)];
  /** 칸 k의 사다리꼴 (sh: 가운데로 줄이는 비율) */
  const quad = (k: number, sh = 0) => {
    const c = colOf(k), r = rowOf(k), mx = X(kx(k)), my = Y(ky(k));
    ctx.beginPath();
    for (const [a, b] of [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]]) {
      const [px, py] = corner(a, b);
      ctx.lineTo(px + (mx - px) * sh, py + (my - py) * sh);
    }
    ctx.closePath();
  };
  {
    const sg = ctx.createRadialGradient(X(0.5), Y(BY1 + SIDE + 0.02), 0, X(0.5), Y(BY1 + SIDE + 0.02), Rr(0.55));
    sg.addColorStop(0, 'rgba(0,0,0,.6)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(X(0.5), Y(BY1 + SIDE + 0.02), Rr(0.52), Rr(0.05), 0, 0, Math.PI * 2);
    ctx.fill();
    // 앞 옆면 흙층 (아래로 갈수록 좁아지는 받침)
    const bands = ['#6b9a45', '#9a6a3c', '#7b4e2e', '#5e3a22', '#45291a'], bh = [0.008, 0.015, 0.014, 0.013, 0.012];
    let yy = BY1;
    bands.forEach((col, b) => {
      const ins = (yy - BY1) * 0.35, ins2 = (yy + bh[b] - BY1) * 0.35;
      ctx.fillStyle = mix(col, '#1a1420', night * 0.35);
      ctx.beginPath();
      ctx.moveTo(X(BLx + ins), Y(yy));
      for (let x = BLx + ins; x <= BRx - ins + 0.001; x += 0.03) ctx.lineTo(X(x), Y(yy + (b ? 0.003 * Math.sin(x * 31 + b) : 0)));
      ctx.lineTo(X(BRx - ins2), Y(yy + bh[b] + 0.002));
      ctx.lineTo(X(BLx + ins2), Y(yy + bh[b] + 0.002));
      ctx.fill();
      yy += bh[b];
    });
    for (let k = 0; k < 30; k++) oval(ctx, X(BLx + 0.03 + hsh(k * 3) * (BRx - BLx - 0.06)), Y(BY1 + 0.014 + hsh(k * 3 + 1) * 0.04), Rr(0.004 + hsh(k) * 0.006), Rr(0.003 + hsh(k + 1) * 0.003), k % 3 ? 'rgba(0,0,0,.25)' : 'rgba(210,190,160,.45)');
    ctx.strokeStyle = 'rgba(220,190,140,.35)';
    ctx.lineWidth = 1.2;
    for (const rx of [0.22, 0.47, 0.71]) {
      ctx.beginPath();
      ctx.moveTo(X(rx), Y(BY1 + 0.006));
      ctx.bezierCurveTo(X(rx - 0.015), Y(BY1 + 0.02), X(rx + 0.02), Y(BY1 + 0.035), X(rx + 0.004), Y(BY1 + 0.05));
      ctx.stroke();
    }
    // 윗면 잔디 (뒤쪽은 살짝 어둡게 — 깊이)
    const gg = ctx.createLinearGradient(0, Y(Q0), 0, Y(BY1));
    gg.addColorStop(0, mix(mix('#6fae4c', '#2b4536', night * 0.7), '#465646', dark * 0.35));
    gg.addColorStop(1, mix(mix('#a3dc6c', '#3f5e42', night * 0.7), '#5d6d52', dark * 0.35));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(X(TLx), Y(Q0));
    ctx.lineTo(X(TRx), Y(Q0));
    ctx.lineTo(X(BRx), Y(BY1));
    ctx.lineTo(X(BLx), Y(BY1));
    ctx.closePath();
    ctx.fill();
    // 칸 무늬 (손가락이 놓을 칸이 보이게)
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    for (let k = 0; k < NN; k++) if ((rowOf(k) + colOf(k)) % 2) (quad(k), ctx.fill());
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) (ctx.moveTo(...(corner(c, 0) as [number, number])), ctx.lineTo(...(corner(c, ROWS) as [number, number])));
    for (let r = 1; r < ROWS; r++) (ctx.moveTo(...(corner(0, r) as [number, number])), ctx.lineTo(...(corner(COLS, r) as [number, number])));
    ctx.stroke();
    // 앞 모서리 빛
    ctx.strokeStyle = 'rgba(230,255,190,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(BLx), Y(BY1));
    ctx.lineTo(X(BRx), Y(BY1));
    ctx.stroke();
    // 텐트 자리 흙 · 잔디 결 · 꽃
    oval(ctx, X(kx(cam.tent)), Y(ky(cam.tent) + CH * 0.15), Rr(CW * 0.75), Rr(CH * 0.62), 'rgba(170,130,80,.45)');
    ctx.strokeStyle = 'rgba(40,80,30,.35)';
    ctx.lineWidth = 1.1;
    for (let k = 0; k < 60; k++) {
      const v = hsh(k + 77) * ROWS, gx = X(sx(hsh(k + 7) * COLS, v)), gy = Y(BY0 + v * CH), lean = lw ? DV[lw.dir][0] * lw.k * 3 : Math.sin(t / 30 + k);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + lean, gy - 4);
      ctx.stroke();
    }
    for (let k = 0; k < 9; k++) {
      const v = hsh(k + 330) * ROWS;
      oval(ctx, X(sx(hsh(k + 300) * COLS, v)), Y(BY0 + v * CH), 1.8, 1.8, ['#ffd3e8', '#fff4a8', '#ffffff'][k % 3]);
    }
    // 잔디가 옆면으로 흘러내린 술
    ctx.fillStyle = mix('#8cc95e', '#2f4a3a', night * 0.7);
    for (let x = BLx + 0.008; x < BRx - 0.01; x += 0.022) {
      ctx.beginPath();
      ctx.moveTo(X(x), Y(BY1 - 0.002));
      ctx.lineTo(X(x + 0.011), Y(BY1 + 0.007 + 0.006 * hsh(x * 99)));
      ctx.lineTo(X(x + 0.022), Y(BY1 - 0.002));
      ctx.fill();
    }
  }
  // ── 바람 지도: 칸 색(셀수록 붉게, 바람 그늘은 맑게) + 흐르는 화살표 ──
  if (lw) {
    const [dx, dy] = DV[lw.dir], vis = s.phase === 'build' ? 1 : Math.max(lw.k, 0.25 * lw.pre);
    for (let k = 0; k < NN; k++) {
      if (blocks(cam.blk[k])) continue;
      const v = lw.f[k], x = X(kx(k)), y = Y(ky(k)), cw = X(cwAt(rowOf(k))), col = windCol(v);
      ctx.globalAlpha = (0.03 + 0.24 * Math.max(0, Math.min(1, (v - 9) / 24))) * vis;
      ctx.fillStyle = col;
      quad(k, 0.06);
      ctx.fill();
      const len = (0.18 + 0.36 * Math.min(1, v / 34)) * (dx ? cw : Y(CH));
      if (s.phase === 'build') {
        const ph = (t * (0.005 + v * 0.0007) + hsh(k)) % 1, off = (ph - 0.5) * 0.45;
        ctx.globalAlpha = (0.5 + 0.5 * Math.sin(ph * Math.PI)) * (v < 12 ? 0.45 : 0.7 + 0.3 * Math.min(1, v / 30));
        const ax = x + dx * off * cw, ay = y + dy * off * Y(CH), hw = Math.max(3, len * 0.33);
        ctx.strokeStyle = v < 12 ? '#e8fff4' : col;
        ctx.lineWidth = v > 30 ? 3.2 : v < 12 ? 1.6 : 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(ax - (dx * len) / 2, ay - (dy * len) / 2);
        ctx.lineTo(ax + (dx * len) / 2, ay + (dy * len) / 2);
        ctx.moveTo(ax + (dx * len) / 2 - dx * hw + dy * hw * 0.8, ay + (dy * len) / 2 - dy * hw + dx * hw * 0.8);
        ctx.lineTo(ax + (dx * len) / 2, ay + (dy * len) / 2);
        ctx.lineTo(ax + (dx * len) / 2 - dx * hw - dy * hw * 0.8, ay + (dy * len) / 2 - dy * hw - dx * hw * 0.8);
        ctx.stroke();
      } else if (lw.k > 0.05) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        for (let j = 0; j < 2; j++) {
          const ph = (t * (0.02 + v * 0.0016) + hsh(k * 3 + j)) % 1, off = ph - 0.5, side = (hsh(k * 7 + j) - 0.5) * 0.7;
          ctx.globalAlpha = Math.sin(ph * Math.PI) * Math.min(1, v / 28) * lw.k * 0.85;
          const ax = x + dx * off * cw + dy * side * cw, ay = y + dy * off * Y(CH) + dx * side * Y(CH);
          ctx.beginPath();
          ctx.moveTo(ax - dx * len * 0.6, ay - dy * len * 0.6);
          ctx.lineTo(ax + dx * len * 0.6, ay + dy * len * 0.6);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    // 판 가장자리: 바람이 들어오는 쪽 큰 화살표
    const pulse = 0.65 + 0.35 * Math.sin(t / 8);
    ctx.globalAlpha = s.phase === 'build' ? pulse : 0.4 + 0.6 * lw.k;
    if (lw.dir === D) for (const c of [1, 3, 5, 7]) label(ctx, '↓', X(kx(at(0, c))), Y(BY0 - 0.026), Rr(0.048), windCol(lw.W), 900);
    else for (const r of lw.dir === L ? [1, 3, 5, 7] : [4, 6]) label(ctx, ARROW[lw.dir], X(lw.dir === L ? sx(COLS, r + 0.5) + 0.042 : sx(0, r + 0.5) - 0.042), Y(cy(r)), Rr(0.05), windCol(lw.W), 900);
    ctx.globalAlpha = 1;
  }
  // ── 쓰러질 자리·번개 표시 (예보) ──
  if (s.phase === 'build' && s.boltPrev >= 0) {
    const bg = s.gusts.find((g) => g.bolt)!, k = s.boltPrev, bx = X(kx(k)), by = Y(ky(k) - CH * 1.6);
    if (!cam.rod[k]) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = `rgba(255,90,90,${0.6 + 0.3 * Math.sin(t / 6)})`;
      ctx.lineWidth = 2;
      for (const f of fallCells(cam, k, bg.dir)) (quad(f, 0.1), ctx.stroke());
      ctx.setLineDash([]);
    }
    emo(ctx, '⚡', bx, by + Math.sin(t / 7) * 3, Rr(0.05));
  }
  // ── 세워진 것들 (뒤 줄부터) ──
  const tentGone = storming && sim ? sim.tentOut >= 0 && tau >= sim.tentOut : s.camp.gone;
  const tentFlat = storming && sim ? sim.downAt >= 0 && tau >= sim.downAt : s.camp.hp <= 0;
  let hpNow = cam.hp;
  if (storming && sim) for (const q of sim.hits) if (tau >= q.at) hpNow -= q.dmg;
  if (!storming) hpNow = s.camp.hp;
  const lastHit = storming && sim ? sim.hits.reduce((m, q) => (tau >= q.at ? Math.max(m, q.at) : m), -999) : -999;
  let mood: Mood = 'calm';
  if (s.phase === 'build') mood = s.prev.some((f) => f[cam.tent] > TENT_HOLD) ? 'wow' : 'calm';
  else if (storming) mood = tau - lastHit < 50 || tentFlat ? 'dizzy' : lw && lw.on ? 'strain' : 'wow';
  else mood = s.ok ? 'smug' : 'dizzy';
  const pv = lw && s.phase === 'build' ? lw.f : null;
  const fall = storming && sim ? sim.fall : null;
  const itemsNow: { i: number; p: Pose }[] = [];
  const src = storming && s.pre ? s.pre : s.camp;
  for (let i = 0; i < src.items.length; i++) {
    if (storming && sim) {
      const p = pose(s, i, tau);
      if (p) itemsNow.push({ i, p });
    } else if (!s.camp.items[i].lost) itemsNow.push({ i, p: { x: kx(s.camp.items[i].cell), y: ky(s.camp.items[i].cell) + CH * 0.2, z: 0, rot: 0, a: 1, air: false, dizzy: s.phase === 'result' ? 1 : 0 } });
  }
  const sway = lw ? lw.k : 0.1, cl = (v: number, n: number) => Math.max(0, Math.min(n - 1, v));
  const ground: { i: number; p: Pose }[][] = [...Array(NN)].map(() => []);
  for (const q of itemsNow) if (!q.p.air) {
    const r = cl(Math.floor((q.p.y - CH * 0.2 - BY0) / CH), ROWS);
    ground[at(r, cl(Math.floor(((q.p.x - 0.5) / wid(r + 0.5) + 0.5) * COLS), COLS))].push(q);
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = at(r, c), x = X(kx(k)), y = Y(ky(k) + CH * 0.22), z = Rr(cwAt(r) * 0.8), b = cam.blk[k];
      let bk = b;
      if (fall && tau >= fall.at) {
        if (k === fall.cell) bk = STUMP;
        else if (fall.cells.includes(k) && k !== cam.tent) bk = LOG;
      }
      if (bk === STONE) stoneShape(ctx, x, y, z, k);
      else if (bk === TREE) {
        const lean = (lw ? DV[lw.dir][0] * sway * 0.5 : 0) + Math.sin(t / 25 + k) * 0.04;
        if (fall && k === fall.cell && tau >= fall.at - 0) treeShape(ctx, x, y, z * 1.25, lean, k, true);
        else treeShape(ctx, x, y, z * (k === cam.big ? 1.25 : 1), lean, k, k === cam.big);
      } else if (bk === STUMP) {
        oval(ctx, x, y, z * 0.2, z * 0.08, '#6b4321');
        oval(ctx, x, y - z * 0.12, z * 0.2, z * 0.08, '#c99a64');
      } else if (bk === LOG) logShape(ctx, x, y - z * 0.05, z, fall && fall.cells.includes(k) ? fall.dir : cam.fd[k] - 10);
      else if (bk === FENCE) {
        const H = Rr(0.055);
        if (cam.fd[k] === 2) fenceShape(ctx, X(kx(k)), Y(ky(k - COLS) - CH * 0.1), X(kx(k)), Y(ky(k) + CH * 0.3), H, true, sway);
        if (cam.fd[k] === 4) fenceShape(ctx, X(kx(k - 1) - cwAt(r) * 0.3), Y(ky(k) + CH * 0.2), X(kx(k) + cwAt(r) * 0.3), Y(ky(k) + CH * 0.2), H, false, sway);
      }
      if (cam.rod[k]) rodShape(ctx, x, y, z, t, flash);
      // 텐트
      if (k === cam.tent && !tentGone) {
        const shake = storming && tau - lastHit < 14 ? Math.sin(tau * 2.3) * 3 : lw && lw.on ? Math.sin(t * 0.9) * 1.2 * lw.k : 0;
        tentShape(ctx, x + shake, y + Rr(0.004), Rr(0.17), Rr(0.115), hpNow, mood, t, night, tentFlat);
        // 텐트 바람 배지 (예보 바람 vs 버팀 22)
        // 짓는 동안은 예보, 돌풍이 부는 동안은 지금 바람 — 왜 버텼는지/날아갔는지 보이게
        const bv = pv ? pv[k] : lw && lw.on && !tentFlat ? lw.f[k] : -1;
        if (bv >= 0 && !tentFlat) {
          const v = Math.round(bv), bad = v > TENT_HOLD, bw = Rr(pv ? 0.25 : 0.2), by = Y(ky(k) - CH * 1.75), bxx = Math.max(bw / 2 + 2, Math.min(w - bw / 2 - 2, x));
          pill(ctx, bxx, by, bw, Rr(0.05), bad ? 'rgba(170,30,45,.94)' : 'rgba(20,100,65,.92)', '#ffffff');
          label(ctx, pv ? (bad ? `💨${v} > 버팀${TENT_HOLD} 위험!` : `💨${v} ≤ 버팀${TENT_HOLD} 안전`) : bad ? `💨${v} 으아아!` : `💨${v} 버틴다!`, bxx, by, Rr(0.036), '#ffffff', 900, 'center', bw - 8);
        }
      }
      // 물건 (땅에 있는 것)
      ground[k].forEach(({ i, p }, j) => drawItem(ctx, s, src.items[i], X(p.x) + j * Rr(0.02), Y(p.y) - j * Rr(0.012), Rr(0.072), p, pv, t, k));
    }
  }
  // ── 첫 판 안내: 놓을 칸이 반짝 ──
  if (s.phase === 'build' && s.pi < s.pieces.length && (s.stage === 0 || s.tries >= 2)) {
    const key = `${s.stage}:${s.tries}:${s.pi}`;
    if (!M.hint || M.hint.key !== key) M.hint = { key, cells: planCells(cloneCamp(s.camp), s.pieces.slice(s.pi), s.gusts, 3) };
    const k = M.hint.cells[0];
    if (k !== undefined) {
      const a = 0.55 + 0.45 * Math.sin(t / 5);
      ctx.strokeStyle = `rgba(255,240,140,${a})`;
      ctx.fillStyle = `rgba(255,240,140,${0.12 + 0.18 * a})`;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#fff3a0';
      ctx.shadowBlur = 12;
      quad(k, 0.08);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (s.stage === 0 && s.pi === 0) emo(ctx, '👆', X(kx(k)) + Rr(0.025), Y(ky(k)) + Rr(0.035) + Math.sin(t / 6) * 3, Rr(0.06));
    }
  }
  // 하늘을 나는 것들 (그림자는 땅에)
  for (const { i, p } of itemsNow) {
    if (!p.air) continue;
    ctx.globalAlpha = p.a * 0.5;
    oval(ctx, X(p.x), Y(p.y), Rr(0.03), Rr(0.01), 'rgba(10,20,10,.6)');
    ctx.globalAlpha = 1;
    drawItem(ctx, s, src.items[i], X(p.x), Y(p.y - p.z), Rr(0.072), p, null, t, -1);
  }
  // 날아가는 텐트와 데굴데굴 곰들
  if (storming && sim && sim.tentOut >= 0 && tau >= sim.tentOut) {
    const e = tau - sim.tentOut, g = sim.gx.find((q) => tau >= q.t0) ?? sim.gx[0], [dx, dy] = DV[g ? g.dir : L];
    const bx = X(kx(cam.tent) + dx * e * 0.0065), by = Y(ky(cam.tent) + dy * e * 0.005 - e * 0.0045);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - e / 90);
    ctx.translate(bx, by);
    ctx.rotate(e * 0.07 * (dx || 1));
    tentShape(ctx, 0, 0, Rr(0.17), Rr(0.115), hpNow, 'wow', t, night);
    ctx.restore();
    ctx.globalAlpha = Math.max(0, 1 - e / 110);
    [['#a8703d', -1], ['#86532a', 0.3], ['#c99057', 1.2]].forEach(([fur, o], j) => {
      const u = e - j * 6, ox = X(kx(cam.tent) + dx * u * 0.004 + (o as number) * 0.02), oy = Y(ky(cam.tent) + dy * u * 0.003 - Math.abs(Math.sin(u / 9)) * 0.04 - u * 0.0015);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(u * 0.2);
      bear(ctx, 0, 0, Rr(0.022 - j * 0.002), 'wow', fur as string, t);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  // 너구리 구경꾼 (판 왼쪽 앞)
  {
    const rx = X(0.052), ry = Y(BY0 + 0.2);
    ctx.fillStyle = mix('#5e3a22', '#1a1420', night * 0.4);
    ctx.beginPath();
    ctx.moveTo(rx - Rr(0.045), ry);
    ctx.lineTo(rx + Rr(0.05), ry);
    ctx.lineTo(rx + Rr(0.03), ry + Rr(0.04));
    ctx.lineTo(rx - Rr(0.02), ry + Rr(0.055));
    ctx.fill();
    oval(ctx, rx, ry, Rr(0.048), Rr(0.012), mix('#7fbf5a', '#2f4a3a', night * 0.7));
    raccoon(ctx, rx, ry, Rr(0.075), gustK, t);
  }
  // 비
  rainLayer(ctx, w, Y(BY1 + SIDE), t, storming ? 0.25 + 0.75 * gustK : s.stage >= 4 ? 0.18 : 0, lw ? lw.dir : L, storming ? gustK : 0);
  // ── 사건 → 손맛 ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    for (let k = 0; k < 6 && M.pops.some((q) => s.t - q.t < 45 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    M.pops.push({ x, y, t: s.t });
    if (M.pops.length > 14) M.pops.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const half = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(half, Math.min(w - half, x)), Math.max(Y(BY0 - 0.005), y), text, col, size);
  };
  const racc = (text: string) => (M.racc = { text, t: s.t });
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'put') fx.burst(x, y, '#d9c08a', 16, 3, 2.4), fx.ring(x, y, '#ffffff', Rr(0.07), 3), fx.kick(3);
    if (e.kind === 'tie') fx.ring(x, y, '#ffe066', Rr(0.06), 3), say(x, y - Rr(0.06), e.text!, '#ffe066', Rr(0.042));
    if (e.kind === 'rodput') fx.ring(x, y, '#ffe066', Rr(0.08), 3), say(x, y - Rr(0.08), e.text!, '#ffe066', Rr(0.038));
    if (e.kind === 'nope') say(x, y - Rr(0.05), e.text!, '#ffb3b3', Rr(0.036)), fx.kick(1.5);
    if (e.kind === 'go') fx.ring(x, y, '#ffe066', Rr(0.12), 4);
    if (e.kind === 'peek') fx.ring(x, y, '#ffffff', Rr(0.06), 3);
    if (e.kind === 'warn') say(w / 2, Y(BY0 + 0.06), e.text!, '#ffffff', Rr(0.055)), fx.kick(2), racc('온다 온다…');
    if (e.kind === 'gust') fx.blink('#dbe8ff', 0.22), fx.kick(7);
    if (e.kind === 'fly') say(x, y - Rr(0.07), e.text!, '#ffffff', Rr(0.04)), fx.burst(x, y, '#b6e08a', 8, 2.5, 2), racc('ㅋㅋㅋ');
    if (e.kind === 'chain') say(x, y - Rr(0.07), e.text!, '#ffb347', Rr(0.042)), fx.ring(x, y, '#ffb347', Rr(0.08), 4), fx.kick(4);
    if (e.kind === 'bonk') say(x, y - Rr(0.05), e.text!, '#e9edf5', Rr(0.04)), fx.burst(x, y, '#c9c2b8', 12, 3, 2.4), fx.kick(4);
    if (e.kind === 'hit') say(x, y - Rr(0.11), e.text!, '#ff8a8a', Rr(0.05)), fx.ring(x, y, '#ff5d6c', Rr(0.1), 5), fx.kick(10), fx.blink('#ff5d6c', 0.18), racc('헉!');
    if (e.kind === 'off') say(Math.max(Rr(0.12), Math.min(w - Rr(0.12), x)), y - Rr(0.05), e.text!, '#cfe3ff', Rr(0.038));
    if (e.kind === 'land') fx.burst(x, y + Rr(0.02), '#d9c08a', 8, 2, 2);
    if (e.kind === 'hop') say(x, y - Rr(0.09), e.text!, '#e0f0ff', Rr(0.036));
    if (e.kind === 'tentfly') say(x, y - Rr(0.12), e.text!, '#ff8a8a', Rr(0.055)), fx.kick(12), fx.blink('#ffffff', 0.3), racc('어어어?!');
    if (e.kind === 'collapse') say(x, y - Rr(0.1), e.text!, '#ff8a8a', Rr(0.055)), fx.burst(x, y, '#ffb04d', 26, 4, 3), fx.kick(10), racc('으앗!');
    if (e.kind === 'bolt') say(x, y - Rr(0.13), e.text!, '#fff3a0', Rr(0.05)), fx.burst(x, y - Rr(0.05), '#fff3a0', 30, 5, 3), fx.blink('#ffffff', 0.6), fx.kick(12), racc('번쩍!!');
    if (e.kind === 'zap') fx.blink('#ffffff', 0.5), fx.kick(6), e.text && say(x, y - Rr(0.13), e.text, '#fff3a0', Rr(0.04)), fx.ring(x, y - Rr(0.08), '#ffe066', Rr(0.1), 4);
    if (e.kind === 'clear') fx.burst(w / 2, y, '#ffe066', 60, 6, 3.2), fx.burst(w / 2, y, '#ff8fb1', 30, 5, 3), fx.ring(w / 2, y, '#ffe066', Rr(0.4), 7), fx.blink('#fff6c8', 0.25), racc('짝짝짝!');
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.25), racc('토닥토닥…');
  }
  fx.memo.t = s.t;
  // 너구리 말풍선
  if (M.racc && s.t - M.racc.t < 70) {
    const a = Math.min(1, (70 - (s.t - M.racc.t)) / 15);
    ctx.globalAlpha = a;
    ctx.font = `900 ${Rr(0.036)}px system-ui, sans-serif`;
    const tw = ctx.measureText(M.racc.text).width + 12, bx = X(0.012), by = Y(BY0 + 0.085);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath();
    ctx.roundRect(bx, by - Rr(0.025), tw, Rr(0.05), Rr(0.02));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx + 8, by + Rr(0.024));
    ctx.lineTo(bx + 6, by + Rr(0.045));
    ctx.lineTo(bx + 16, by + Rr(0.024));
    ctx.fill();
    ctx.fillStyle = '#24304a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(M.racc.text, bx + 6, by);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawHud(ctx, s, w, h, th, lw);
}

/** 물건 하나 (땅 위 또는 공중). 예보에서 날아갈 것은 덜덜 + '!' */
function drawItem(ctx: CanvasRenderingContext2D, s: TyphoonState, it: Item, x: number, y: number, size: number, p: Pose, pv: Float32Array | null, t: number, k: number) {
  const def = ITEM[it.k], willFly = !!pv && !it.staked && k >= 0 && pv[k] > def.hold;
  const wob = willFly ? Math.sin(t * 0.8 + k) * 0.12 : 0;
  if (!p.air) oval(ctx, x, y + size * 0.05, size * 0.42, size * 0.13, 'rgba(15,25,10,.4)');
  if (it.k === 'laundry' && !p.air) {
    // 빨랫줄 기둥 둘 + 줄
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y);
    ctx.lineTo(x - size * 0.55, y - size * 1.05);
    ctx.moveTo(x + size * 0.55, y);
    ctx.lineTo(x + size * 0.55, y - size * 1.05);
    ctx.stroke();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y - size * 0.98);
    ctx.quadraticCurveTo(x, y - size * 0.82, x + size * 0.55, y - size * 0.98);
    ctx.stroke();
    emo(ctx, def.e, x + Math.sin(t / 7) * 1.5, y - size * 0.55, size * 0.75, wob * 2);
  } else emo(ctx, def.e, x, y - size * 0.45, size, p.rot + wob, p.a, it.k === 'cow' && p.air && Math.floor(t / 20) % 2 === 0);
  if (it.staked && !p.air) {
    // 말뚝 둘에 노란 밧줄로 꽁꽁 (멀리서도 '묶였다'가 보이게)
    ctx.strokeStyle = '#ffd65a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - size * 0.05, y - size * 0.5);
    ctx.quadraticCurveTo(x + size * 0.3, y - size * 0.15, x + size * 0.55, y - size * 0.05);
    ctx.moveTo(x + size * 0.05, y - size * 0.5);
    ctx.quadraticCurveTo(x - size * 0.3, y - size * 0.15, x - size * 0.55, y - size * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.32, size * 0.36, size * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#8a5a2b';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sd * size * 0.5, y - size * 0.18);
      ctx.lineTo(x + sd * size * 0.62, y - size * 0.18);
      ctx.lineTo(x + sd * size * 0.56, y + size * 0.06);
      ctx.fill();
    }
  }
  if (willFly) {
    const bx = x + size * 0.42, by = y - size * 1.0 + Math.sin(t / 5) * 2;
    oval(ctx, bx, by, size * 0.2, size * 0.2, '#ff4d5e');
    label(ctx, '!', bx, by + 1, size * 0.32, '#ffffff', 900);
  }
  if (p.dizzy && !p.air && s.phase !== 'build') {
    for (let j = 0; j < 2; j++) {
      const an = t * 0.15 + j * Math.PI;
      label(ctx, '★', x + Math.cos(an) * size * 0.4, y - size * 0.95 + Math.sin(an) * size * 0.1, size * 0.25, '#ffe066', 900);
    }
  }
}

function pieceIcon(ctx: CanvasRenderingContext2D, p: Piece, x: number, y: number, z: number, t: number) {
  if (p === 'stone') stoneShape(ctx, x, y + z * 0.3, z, 3);
  else if (p === 'fv') fenceShape(ctx, x, y - z * 0.25, x, y + z * 0.45, z * 0.55, true, 0.2);
  else if (p === 'fh') fenceShape(ctx, x - z * 0.55, y + z * 0.3, x + z * 0.55, y + z * 0.3, z * 0.55, false, 0);
  else if (p === 'stake') {
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.moveTo(x - z * 0.12, y - z * 0.4);
    ctx.lineTo(x + z * 0.12, y - z * 0.4);
    ctx.lineTo(x + z * 0.05, y + z * 0.35);
    ctx.lineTo(x, y + z * 0.45);
    ctx.lineTo(x - z * 0.05, y + z * 0.35);
    ctx.fill();
    ctx.strokeStyle = '#e8d9a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - z * 0.2, z * 0.22, z * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else rodShape(ctx, x, y + z * 0.45, z * 0.62, t, 0);
}

function drawHud(ctx: CanvasRenderingContext2D, s: TyphoonState, w: number, h: number, th: Theme, lw: ReturnType<typeof liveWind>) {
  const Rr = (r: number) => r * w, Y = (y: number) => y * w, t = s.t;
  // 위 띠: 판 · 하트 · 별
  const hb = Rr(0.085);
  ctx.fillStyle = 'rgba(18,24,38,.82)';
  ctx.fillRect(0, 0, w, hb);
  label(ctx, `🏕️ ${s.stage + 1}/${STAGES.length}판 · ${STAGES[s.stage].title}`, 10, hb / 2, Rr(0.042), th.ink, 900, 'left', w * 0.6);
  ctx.font = `900 ${Rr(0.042)}px system-ui, sans-serif`;
  const st = `★${s.stars}`, sw = ctx.measureText(st).width;
  label(ctx, st, w - 10, hb / 2, Rr(0.042), '#ffe066', 900, 'right');
  label(ctx, '♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 18 - sw, hb / 2, Rr(0.042), th.hot, 900, 'right');
  // 예보 띠 (무엇이·얼마나·어디서)
  {
    const y = Y(PILL_Y), chips = s.gusts.length, cur = lw ? lw.gi : -1, cw = Rr(chipW(s.gusts)), x0 = w / 2 - Rr(pillW(s.gusts)) / 2;
    const head = s.phase === 'storm' ? '🌪️ 돌풍!' : '🌪️ 예보';
    pill(ctx, w / 2, y, Rr(pillW(s.gusts)), Rr(PILL_H), 'rgba(18,24,38,.82)', 'rgba(255,255,255,.25)');
    label(ctx, head, x0 + Rr(0.02), y, Rr(0.038), '#ffffff', 900, 'left', Rr(HEAD_W - 0.025));
    s.gusts.forEach((g, i) => {
      const cxp = Rr(chipX(s.gusts, i)), on = i === cur;
      pill(ctx, cxp, y, cw, Rr(0.045), on ? windCol(g.W) : 'rgba(255,255,255,.12)', on ? '#ffffff' : undefined);
      label(ctx, `${ARROW[g.dir]}${g.W}${g.bolt ? '⚡' : ''}`, cxp, y + 0.5, Rr(0.036), '#ffffff', 900, 'center', cw - 4);
    });
    // 바람이 오는 쪽 한마디
    const g = lw ? s.gusts[lw.gi] : s.gusts[0];
    label(ctx, chips > 1 ? `${(lw ? lw.gi : 0) + 1}번째: ${FROM[g.dir]} ${g.W}m/s${s.phase === 'build' ? ' · 톡=골라 보기' : ''}` : `${FROM[g.dir]} 풍속 ${g.W}m/s`, w / 2, Y(0.172), Rr(0.036), '#ffffff', 800, 'center', w - 20);
  }
  // 새것 알림
  if (s.news.length) {
    const n = s.news[0], age = s.t - n.t, a = Math.min(1, age / 10, (170 - age) / 20);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.font = `900 ${Rr(0.036)}px system-ui, sans-serif`;
      const tx = `✨ ${n.text}`, tw = Math.min(w - 12, ctx.measureText(tx).width + 22), y = Y(0.222);
      pill(ctx, w / 2, y, tw, Rr(0.055), 'rgba(40,30,70,.92)', th.accent);
      label(ctx, tx, w / 2, y, Rr(0.036), '#ffffff', 900, 'center', w - 26);
      ctx.globalAlpha = 1;
    }
  }
  // ── 조각 쟁반 ──
  const y0 = Y(TRAY0), y1 = Y(TRAY1);
  ctx.fillStyle = 'rgba(16,22,34,.9)';
  ctx.beginPath();
  ctx.roundRect(6, y0, w - 12, y1 - y0, Rr(0.03));
  ctx.fill();
  if (s.phase === 'build') {
    const p = s.pieces[s.pi];
    // 지금 조각
    const sx = Rr(0.17), sy = (y0 + y1) / 2;
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.strokeStyle = p ? th.accent : 'rgba(255,255,255,.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(Rr(0.035), y0 + 6, Rr(0.27), y1 - y0 - 12, Rr(0.025));
    ctx.fill();
    ctx.stroke();
    label(ctx, '지금', Rr(0.055), y0 + Rr(0.035), Rr(0.035), th.accent, 900, 'left');
    if (p) {
      pieceIcon(ctx, p, sx + Rr(0.04), sy - Rr(0.005), Rr(0.075), t);
      label(ctx, PIECE[p].name, sx, y1 - Rr(0.03), Rr(0.036), '#ffffff', 900, 'center', Rr(0.26));
    } else label(ctx, '다 놓았어요', sx, sy, Rr(0.036), '#ffffff', 800);
    // 다음 조각
    label(ctx, s.pieces.length - s.pi - 1 > 0 ? `다음 ${s.pieces.length - s.pi - 1}개` : '다음 없음', Rr(0.325), y0 + Rr(0.035), Rr(0.035), '#c8d0e0', 800, 'left');
    for (let j = 1; j <= 3; j++) {
      const q = s.pieces[s.pi + j];
      if (!q) break;
      const qx = Rr(0.36 + (j - 1) * 0.1), qy = sy + Rr(0.015);
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.beginPath();
      ctx.roundRect(qx - Rr(0.04), qy - Rr(0.045), Rr(0.085), Rr(0.09), 6);
      ctx.fill();
      ctx.globalAlpha = 1 - (j - 1) * 0.2;
      pieceIcon(ctx, q, qx + Rr(0.003), qy - Rr(0.005), Rr(0.045), t);
      ctx.globalAlpha = 1;
    }
    // ▶ 버티기
    const bx = Rr((BTN.x0 + BTN.x1) / 2), by = Y((BTN.y0 + BTN.y1) / 2), ready = s.pi >= s.pieces.length, pulse = ready ? 1 + 0.05 * Math.sin(t / 4) : 1;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = ready ? '#ff8a3d' : 'rgba(255,138,61,.8)';
    ctx.shadowColor = '#ff8a3d';
    ctx.shadowBlur = ready ? 14 : 4;
    ctx.beginPath();
    ctx.roundRect(-Rr((BTN.x1 - BTN.x0) / 2), -Y((BTN.y1 - BTN.y0) / 2), Rr(BTN.x1 - BTN.x0), Y(BTN.y1 - BTN.y0), Rr(0.03));
    ctx.fill();
    ctx.shadowBlur = 0;
    label(ctx, '▶ 버티기', 0, -Rr(0.012), Rr(0.046), '#ffffff', 900);
    label(ctx, s.pi < s.pieces.length ? `남은 조각 ${s.pieces.length - s.pi}` : '곧 돌풍!', 0, Rr(0.03), Rr(0.035), '#fff3e0', 800);
    ctx.restore();
  } else {
    const sim = s.sim;
    let txt = '';
    if (s.phase === 'storm' && sim && lw) txt = `💨 돌풍 ${lw.gi + 1}/${s.gusts.length} ${ARROW[lw.dir]} ${lw.W}m/s — 버텨라!`;
    else if (s.phase === 'storm') txt = '💨 숨 고르는 중…';
    else txt = s.ok ? '🐻 곰 가족 무사!' : '🐻 다시 지어 봐요';
    label(ctx, txt, w / 2, (y0 + y1) / 2 - Rr(0.02), Rr(0.044), '#ffffff', 900, 'center', w - 30);
    if (sim) {
      let hp = HP, lost = 0;
      for (const q of sim.hits) if (s.phase !== 'storm' || s.pt >= q.at) hp -= q.dmg;
      for (const e of sim.tl) if (e.kind === 'off' && (s.phase !== 'storm' || s.pt >= e.at)) lost++;
      label(ctx, `텐트 ${'♥'.repeat(Math.max(0, hp))}${'♡'.repeat(Math.max(0, HP - Math.max(0, hp)))} · 잃은 물건 ${lost}`, w / 2, (y0 + y1) / 2 + Rr(0.04), Rr(0.038), '#ffb3b3', 800);
    }
  }
  // ── 아래 띠: 지금 할 일 ──
  const f0 = Y(FOOT0);
  ctx.fillStyle = 'rgba(18,24,38,.82)';
  ctx.fillRect(0, f0, w, h - f0);
  let msg = '';
  const p = s.pieces[s.pi];
  if (s.phase === 'build') {
    if (s.stage === 0 && s.pi === 0) msg = '👆 반짝이는 칸을 톡 — 냄비 앞에 돌!';
    else if (s.stage === 0) msg = '🪨 하나 더! 막은 칸 뒤는 바람 그늘';
    else if (p === 'stake') msg = '📍 말뚝: 물건을 톡 = 묶여서 안 날아가요';
    else if (p === 'rod') msg = '🗼 피뢰침: 아무 칸이나 — 번개를 대신 맞아요';
    else if (p === 'fv') msg = '🧱 세로 바람막이: 톡한 칸과 그 아래 칸';
    else if (p === 'fh') msg = '🧱 가로 바람막이: 톡한 칸과 그 오른쪽 칸';
    else if (p) msg = '🪨 돌: 막은 칸 뒤는 바람 그늘이 돼요';
    else msg = '돌풍이 와요!';
  } else if (s.phase === 'storm') msg = '👀 바람이 어디로 도는지 보세요';
  else if (s.ok) msg = s.won ? '🏆 모든 태풍을 버텼어요!' : '다음 판으로…';
  else msg = s.hearts > 0 ? '하트 -1 · 같은 판을 처음부터 다시 지어요' : '캠핑 끝!';
  label(ctx, msg, w / 2, (f0 + h) / 2, Rr(0.037), '#ffffff', 800, 'center', w - 16);
  // 판 시작 카드 (예보를 크게)
  if (s.phase === 'build' && s.pt < 110 && s.pi === 0) {
    const a = Math.min(1, (110 - s.pt) / 18), sc = Math.min(1, 0.7 + s.pt / 10);
    const g = s.gusts;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(0.165));
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(16,22,36,.9)';
    ctx.beginPath();
    ctx.roundRect(-Rr(0.42), -Rr(0.085), Rr(0.84), Rr(0.17), Rr(0.035));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, `${s.stage + 1}판 · ${STAGES[s.stage].title}${s.tries ? ' (다시)' : ''}`, 0, -Rr(0.045), Rr(0.05), th.accent, 900, 'center', Rr(0.8));
    label(ctx, `예보: ${g.map((q) => `${ARROW[q.dir]} ${q.W}m/s${q.bolt ? '⚡' : ''}`).join('  ')}`, 0, Rr(0.005), Rr(0.042), '#ffffff', 900, 'center', Rr(0.8));
    label(ctx, STAGES[s.stage].intro, 0, Rr(0.05), Rr(0.036), '#ffd9a8', 800, 'center', Rr(0.8));
    ctx.restore();
  }
  // 결과 카드
  if (s.phase === 'result' || s.dead) {
    const age = s.pt, sc = Math.min(1, 0.6 + age / 12);
    let head = '', sub = '', col = '#ffe066';
    if (s.ok) (head = s.won ? '🏆 태풍을 다 버텼어요!' : `${s.stage + 1}판 무사! ${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`), (sub = `${s.sim && s.sim.hp >= HP ? '텐트 상처 없음' : '텐트에 반창고'} · ${s.sim && s.sim.lost === 0 ? '잃은 물건 없음' : `잃은 물건 ${s.sim?.lost ?? 0}`}`);
    else {
      const blew = !!s.sim && s.sim.tentOut >= 0, why = blew ? Math.round(Math.max(...s.sim!.gx.map((g) => g.f[s.pre ? s.pre.tent : s.camp.tent]))) : 0;
      head = blew ? '텐트가 날아갔어요!' : '텐트가 폭삭!';
      sub = `${blew ? `텐트 칸 바람 ${why} > 버팀 ${TENT_HOLD}` : '날아온 것에 맞았어요'} · ${s.hearts > 0 ? '하트 -1 다시' : `끝 · 별 ${s.stars}개`}`;
      col = '#ff9a9a';
    }
    ctx.save();
    ctx.translate(w / 2, Y(0.165));
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(16,22,36,.9)';
    ctx.beginPath();
    ctx.roundRect(-Rr(0.4), -Rr(0.075), Rr(0.8), Rr(0.15), Rr(0.035));
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, head, 0, -Rr(0.025), Rr(0.055), col, 900, 'center', Rr(0.76));
    label(ctx, sub, 0, Rr(0.035), Rr(0.038), '#ffffff', 800, 'center', Rr(0.76));
    ctx.restore();
  }
}
