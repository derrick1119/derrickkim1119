/**
 * 버텨라 블록성 (21라운드, 오너 아이디어 #1 "앵그리버드의 반대") — 지어서 버티기 × 새총 물리(맞는 쪽) × 역할 뒤집기.
 * 구조 '예보 → 짓기 → 버티기':
 *   예보: 판이 열리면 언덕 위 너구리 해적단의 투석기가 쏠 탄(수박·볼링공·물풍선·폭죽·고무 오리·큰 바위)과
 *         그 궤적이 점선으로 그려진다. 궤적 끝에는 '지금 지은 성에서 처음 맞을 곳'이 표시된다(집이면 빨간 ⚠).
 *   짓기: 손이 하는 일은 '줄 톡' 하나 — 톡 친 줄에 다음 블록이 떨어져 쌓인다(다음 블록 미리 보기). 다 놓거나 ▶ 버티기.
 *   버티기: 너구리가 하나씩 쏜다. 칸 기반의 결정적 물리 — 블록마다 체력·무게, 받침이 없으면 떨어지고(떨어진 무게만큼 아래가 다침),
 *          볼링공은 약한 블록을 뚫고, 폭죽은 맞은 칸 둘레까지 터지고, 물풍선은 양옆 세 줄로 흘러내리고, 큰 바위는 가벼운 블록을 민다.
 * 와우: 고무 블록에 맞은 탄은 '온 길 그대로' 되돌아가 투석기의 너구리를 맞힌다(궤적이 시간을 거꾸로 되감듯).
 * 목표·보상: 판마다 햄스터 집(체력 3)이 버티면 ★, 흠집 하나 없으면 ★★, 블록을 남기고도 무사하면 ★★★.
 *           집이 무너지면 하트 -1, 그 판을 처음부터 다시 짓는다. 8판을 다 버티면 끝(하트 3개를 다 잃어도 끝).
 * 펼쳐짐(판마다 하는 일이 바뀐다): 1 수박(앞을 막기) → 2 볼링공·돌(뚫리니 튼튼한 걸 앞에) → 3 물풍선·유리(지붕 덮기)
 *        → 4 폭죽(집에서 떨어진 곳에서 막기) → 5 고무 오리·고무 블록(되받아치기) → 6 강(돌을 먼저 가라앉혀 받침)
 *        → 7 언덕·바람(가벼운 탄이 바람에 밀려 집 뒤로) → 8 큰 바위(가벼운 벽은 집 쪽으로 밀려 온다).
 * 웃음: 햄스터(창문으로 빼꼼 · 탄이 오면 쏙 숨기 · 맞으면 어질어질 · 버티면 지붕에 올라 만세), 너구리 해적단
 *       (쏠 땐 낄낄 · 막히면 발 동동 · 되받아치기에 맞으면 혹이 나서 빙글빙글 · 성이 무너지면 배 잡고 데굴데굴).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.31;
export const COLS = 7, ROWS = 6, N = COLS * ROWS;
/** 화면 배치(폭 단위). 칸 0.094 = 340px 폭에서 32px */
const X0 = 0.03, CW = 0.094, Y0 = 0.33, CH = 0.094, GY = Y0 + ROWS * CH;
/** 3/4 시점: 블록 윗면·옆면이 오른쪽 위로 비켜 보인다 */
const DX = 0.3 * CW, DY = -0.3 * CH;
/** 투석기 숟가락(탄을 놓는 곳)과 너구리 언덕 (칸 좌표) */
const LX = 9.1, LY = 2.75, HILL_X = 7.7, HILL_Y = 3.9;
/** 투석기 팔 길이(폭 단위) — 숟가락이 (LX,LY)에서 탄을 놓도록 축을 둔다 */
const ARM = 0.07;
const G = 0.0016, SUB = 4, GRAV_T = 4, WINDUP = 46, SETTLE = 30, INTRO = 110, RESULT = 150;
export const E = 0, WOOD = 1, STONE = 2, GLASS = 3, RUBBER = 4, HOUSE = 5, GROUND = 6, RIVER = 7;
const HPMAX = [0, 3, 6, 1, 3, 3, 0, 0];
/** 떨어져 부딪힐 때 아래에 주는 피해 (고무는 통통 튀어서 0) */
const WGT = [0, 2, 5, 1, 0, 0, 0, 0];
const HOUSE_HP = 3;
const BNAME = ['', '나무', '돌', '유리', '고무'];
const BTIP = ['', '무게 2 · 체력 3', '무거움 5 · 체력 6', '가벼움 1 · 체력 1', '튕겨 보냄 · 체력 3'];
/** ▶ 버티기 단추 (폭 단위) */
const BTN = { x: 0.69, y: 1.053, w: 0.285, h: 0.13 };

export type Ammo = 'melon' | 'bowl' | 'water' | 'fire' | 'duck' | 'rock';
const AM: Record<Ammo, { name: string; dmg: number; mass: number; heavy: boolean }> = {
  melon: { name: '수박', dmg: 2, mass: 2, heavy: false },
  bowl: { name: '볼링공', dmg: 4, mass: 4, heavy: true },
  water: { name: '물풍선', dmg: 2, mass: 1.4, heavy: false },
  fire: { name: '폭죽', dmg: 2, mass: 1.4, heavy: false },
  duck: { name: '고무 오리', dmg: 1, mass: 1, heavy: false },
  rock: { name: '큰 바위', dmg: 3, mass: 6, heavy: true },
};

interface LvDef {
  title: string;
  pieces: number[];
  /** [탄, 날아가는 틱(바람 빼고), 겨냥 dx, 겨냥 dy] — 겨냥은 햄스터 집 가운데 기준 */
  shots: [Ammo, number, number?, number?][];
  hc: number[];
  river?: number;
  hill?: [number, number][];
  wind?: number;
  news: [string, string][];
}
const W = WOOD, S = STONE, Gl = GLASS, R = RUBBER;
const LV: LvDef[] = [
  { title: '첫 수박', pieces: [W, W, W], shots: [['melon', 58]], hc: [2], news: [['melon', '🍉 수박 — 블록에 맞으면 퍽! 터져요']] },
  {
    title: '볼링공', pieces: [W, S, W, W], shots: [['melon', 62], ['bowl', 50]], hc: [2, 3],
    news: [['bowl', '🎳 볼링공 — 약한 블록은 뚫고 지나가요'], ['stone', '돌 블록 — 무겁고 튼튼해요 (체력 6)']],
  },
  {
    title: '물풍선', pieces: [W, Gl, W, Gl, W], shots: [['water', 132], ['melon', 60], ['water', 122, 1]], hc: [2, 3],
    news: [['water', '💧 물풍선 — 양옆 세 줄로 물이 흘러요. 지붕!'], ['glass', '유리 블록 — 약하지만 물은 막아요']],
  },
  { title: '폭죽', pieces: [W, S, W, Gl, W, W], shots: [['fire', 66], ['melon', 58], ['fire', 118]], hc: [2, 3], news: [['fire', '🎆 폭죽 — 맞은 칸 둘레까지 펑! 집에서 먼 데서 막아요']] },
  {
    title: '고무 오리', pieces: [R, W, R, W, S, W], shots: [['duck', 64], ['melon', 60], ['duck', 112]], hc: [2, 3],
    news: [['duck', '🦆 고무 오리 — 여러 번 통통 튀어요'], ['rubber', '고무 블록 — 맞은 탄을 온 길로 되돌려 보내요!']],
  },
  {
    title: '강가', pieces: [S, W, W, S, W, Gl, W], shots: [['bowl', 50], ['water', 130], ['melon', 60]], hc: [1, 2], river: 1,
    news: [['river', '🌊 강 — 가벼운 블록은 떠내려가요. 돌을 먼저 가라앉혀요']],
  },
  {
    title: '언덕과 바람', pieces: [W, Gl, S, W, W, R, W], shots: [['duck', 118], ['water', 130], ['fire', 70], ['melon', 58]], hc: [1, 2],
    hill: [[2, 1], [3, 1]], wind: -0.00017,
    news: [['hill', '⛰️ 언덕 — 땅은 안 부서지는 벽이에요'], ['wind', '🌬️ 바람 — 가벼운 탄은 밀려서 집 뒤로 떨어져요']],
  },
  {
    title: '큰 바위', pieces: [S, W, S, W, Gl, W, W, S], shots: [['rock', 56], ['bowl', 50], ['water', 128], ['rock', 64]], hc: [2, 3],
    news: [['rock', '🪨 큰 바위 — 가벼운 블록을 밀어내요. 돌만 버텨요']],
  },
];

export interface ShotSpec { k: Ammo; vx: number; vy: number }
export interface Level { n: number; hc: number; hr: number; hill: number[]; river: number; wind: number; pieces: number[]; shots: ShotSpec[] }
interface Proj { k: Ammo; x: number; y: number; vx: number; vy: number; dmg: number; bounces: number; alive: boolean; back: boolean; age: number; n: number }
export interface Ev { t: number; kind: string; x: number; y: number; text?: string; m?: number; x2?: number; y2?: number }
export interface World {
  kind: Uint8Array; hp: Int8Array; drop: Uint8Array; moved: Uint8Array; landed: Uint8Array;
  hc: number; hr: number; hhp: number; taken: number; god: boolean; wind: number;
  shots: ShotSpec[]; next: number; cd: number; p: Proj | null;
  t: number; done: boolean; broken: boolean; bonks: number; broke: number; anyMoved: boolean;
  /** 사건 기록 (봇의 시뮬레이션에선 null) */
  out: Ev[] | null; now: number;
}

const isBlock = (k: number) => k >= WOOD && k <= RUBBER;
const AIR = -1, GRD = -2, RIV = -3, HILL = -4, OUT = -5;
const hillTop = (x: number) => (x < HILL_X + 0.5 ? ROWS - ((x - HILL_X) / 0.5) * (ROWS - HILL_Y) : HILL_Y);

function ev(w: World, kind: string, x: number, y: number, text?: string, m?: number, x2?: number, y2?: number) {
  if (w.out) w.out.push({ t: w.now, kind, x, y, text, m, x2, y2 });
}

export function newWorld(L: Level): World {
  const w: World = {
    kind: new Uint8Array(N), hp: new Int8Array(N), drop: new Uint8Array(N), moved: new Uint8Array(N), landed: new Uint8Array(N),
    hc: L.hc, hr: L.hr, hhp: HOUSE_HP, taken: 0, god: false, wind: L.wind, shots: L.shots, next: 0, cd: 0, p: null,
    t: 0, done: false, broken: false, bonks: 0, broke: 0, anyMoved: false, out: null, now: 0,
  };
  for (let c = 0; c < COLS; c++) for (let k = 0; k < L.hill[c]; k++) w.kind[(ROWS - 1 - k) * COLS + c] = GROUND;
  if (L.river >= 0) w.kind[(ROWS - 1) * COLS + L.river] = RIVER;
  w.kind[L.hr * COLS + L.hc] = HOUSE;
  w.hp[L.hr * COLS + L.hc] = HOUSE_HP;
  return w;
}
function cloneWorld(w: World): World {
  return { ...w, kind: w.kind.slice(), hp: w.hp.slice(), drop: w.drop.slice(), moved: w.moved.slice(), landed: w.landed.slice(), p: w.p && { ...w.p }, out: null };
}

/** 줄 c에 블록 k를 떨어뜨린다. 놓인 칸(강에 가라앉으면 강 칸, 떠내려가면 -2), 꽉 찼으면 -1 */
export function placeIn(w: World, c: number, k: number): number {
  let r = -1;
  while (r + 1 < ROWS && w.kind[(r + 1) * COLS + c] === E) r++;
  if (r < 0) return -1;
  const b = (r + 1) * COLS + c;
  if (r + 1 < ROWS && w.kind[b] === RIVER) {
    if (k === STONE) return (w.kind[b] = STONE), (w.hp[b] = HPMAX[STONE]), ev(w, 'sink', c + 0.5, r + 1.5), b;
    return ev(w, 'float', c + 0.5, r + 1.5, undefined, k), -2;
  }
  const i = r * COLS + c;
  w.kind[i] = k;
  w.hp[i] = HPMAX[k];
  ev(w, 'place', c + 0.5, r + 0.5, undefined, k, r + 1);
  return i;
}

function hurt(w: World, d: number, why: string) {
  if (d <= 0 || w.broken) return;
  w.taken += d;
  if (w.god) return;
  w.hhp = Math.max(0, w.hhp - d);
  ev(w, 'ouch', w.hc + 0.5, w.hr + 0.5, why, d);
  if (w.hhp === 0) (w.broken = true), ev(w, 'collapse', w.hc + 0.5, w.hr + 0.5);
}
function dmgCell(w: World, i: number, d: number, why: string) {
  const k = w.kind[i];
  if (k === HOUSE) return hurt(w, d, why);
  if (!isBlock(k) || d <= 0) return;
  w.hp[i] -= d;
  const x = (i % COLS) + 0.5, y = Math.floor(i / COLS) + 0.5;
  if (w.hp[i] <= 0) (w.kind[i] = E), (w.hp[i] = 0), (w.drop[i] = 0), w.broke++, ev(w, 'break', x, y, why, k);
  else ev(w, 'crack', x, y, why, k);
}
function explode(w: World, c: number, r: number) {
  ev(w, 'boom', c + 0.5, r + 0.5);
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const cc = c + dc, rr = r + dr;
      if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && w.kind[rr * COLS + cc]) dmgCell(w, rr * COLS + cc, 2, 'boom');
    }
}
/** 물풍선: 터진 자리에서 양옆 세 줄로 물이 아래로 흘러, 처음 닿는 것에서 멈춘다 */
function splash(w: World, c: number, r: number) {
  ev(w, 'splash', c + 0.5, r + 0.5);
  let wet = false;
  for (let cc = c - 1; cc <= c + 1; cc++) {
    if (cc < 0 || cc >= COLS) continue;
    let rr = Math.max(0, r);
    for (; rr < ROWS; rr++) {
      const k = w.kind[rr * COLS + cc];
      if (k) {
        if (k === HOUSE) wet = true;
        break;
      }
    }
    ev(w, 'drip', cc + 0.5, r + 0.5, undefined, 0, cc + 0.5, rr);
  }
  if (wet) hurt(w, 2, 'wet');
}
/** 큰 바위: 가벼운 블록을 한 칸 민다 */
function push(w: World, i: number, dir: number) {
  const c = i % COLS, r = Math.floor(i / COLS), nc = c + dir, k = w.kind[i];
  if (nc < 0 || nc >= COLS) return (w.kind[i] = E), (w.hp[i] = 0), w.broke++, ev(w, 'fly', c + 0.5, r + 0.5, undefined, k, dir);
  const j = r * COLS + nc, kj = w.kind[j];
  if (kj === E) return (w.kind[j] = k), (w.hp[j] = w.hp[i]), (w.kind[i] = E), (w.hp[i] = 0), (w.drop[j] = 0), ev(w, 'push', nc + 0.5, r + 0.5, undefined, k, c + 0.5, r + 0.5);
  if (kj === RIVER) return (w.kind[i] = E), (w.hp[i] = 0), w.broke++, ev(w, 'float', nc + 0.5, r + 0.5, undefined, k);
  if (kj === HOUSE) return ev(w, 'shove', c + 0.5, r + 0.5, undefined, k, dir), hurt(w, 2, 'bump'), dmgCell(w, i, 1, 'bump');
  if (isBlock(kj)) return ev(w, 'shove', c + 0.5, r + 0.5, undefined, k, dir), dmgCell(w, i, 1, 'bump'), dmgCell(w, j, 1, 'bump');
  dmgCell(w, i, 2, 'bump');
}

function gravity(w: World) {
  w.moved.fill(0);
  w.landed.fill(0);
  let any = false;
  for (let c = 0; c < COLS; c++) {
    const i = (ROWS - 1) * COLS + c;
    if (isBlock(w.kind[i]) && w.drop[i]) (w.drop[i] = 0), ev(w, 'land', c + 0.5, ROWS, undefined, w.kind[i]);
  }
  for (let r = ROWS - 2; r >= 0; r--)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, k = w.kind[i];
      if (!isBlock(k)) continue;
      const b = i + COLS, kb = w.kind[b];
      if (kb === E) {
        w.kind[b] = k;
        w.hp[b] = w.hp[i];
        w.drop[b] = Math.min(9, w.drop[i] + 1);
        w.kind[i] = E;
        w.hp[i] = 0;
        w.drop[i] = 0;
        w.moved[b] = 1;
        any = true;
      } else if (kb === RIVER) {
        if (k === STONE) (w.kind[b] = STONE), (w.hp[b] = w.hp[i]), ev(w, 'sink', c + 0.5, r + 1.5);
        else ev(w, 'float', c + 0.5, r + 1.5, undefined, k);
        w.kind[i] = E;
        w.hp[i] = 0;
        w.drop[i] = 0;
        any = true;
      } else if (w.drop[i]) {
        w.drop[i] = 0;
        w.landed[i] = 1;
        ev(w, 'land', c + 0.5, r + 1, undefined, k);
        // 같이 떨어지던 블록끼리는 다치지 않는다 — 가만히 있던 것 위에 떨어질 때만 무게만큼
        if (!w.landed[b]) dmgCell(w, b, WGT[k], 'crush');
      }
    }
  w.anyMoved = any;
}

function probe(w: World, x: number, y: number): number {
  if (x < -0.45 || x > 12 || y > ROWS + 3) return OUT;
  if (x >= 0 && x < COLS) {
    if (y >= ROWS) return GRD;
    if (y < 0) return AIR;
    const i = Math.floor(y) * COLS + Math.floor(x);
    // 강물 표면은 땅보다 조금 낮다 — 낮게 스쳐 가는 탄은 물 위로 지나간다
    return w.kind[i] && (w.kind[i] !== RIVER || y - Math.floor(y) > 0.55) ? i : AIR;
  }
  if (x < 0) return y >= ROWS ? GRD : AIR;
  if (x < HILL_X) return y >= ROWS + 0.3 ? RIV : AIR;
  return y >= hillTop(x) ? HILL : AIR;
}
function sideHit(x: number, y: number, nx: number, ny: number, code: number) {
  if (code < 0) return false;
  const c0 = Math.floor(x), c1 = Math.floor(nx), r0 = Math.floor(y), r1 = Math.floor(ny);
  if (c0 === c1) return false;
  if (r0 === r1) return true;
  const fx = ((nx > x ? c1 : c0) - x) / (nx - x), fy = ((ny > y ? r1 : r0) - y) / (ny - y);
  return fx > fy;
}
function bounce(p: Proj, horiz: boolean, e: number) {
  if (horiz) (p.vx = -p.vx * e), (p.vy *= 0.8);
  else (p.vy = -p.vy * e), (p.vx *= 0.8);
  p.back = p.vx > 0;
  if (++p.bounces > 3 || Math.abs(p.vx) + Math.abs(p.vy) < 0.025) p.alive = false;
}
function bonk(w: World, p: Proj) {
  p.alive = false;
  w.bonks++;
  ev(w, 'bonk', Math.min(p.x, LX), Math.min(p.y, HILL_Y), p.k);
}

function hit(w: World, p: Proj, code: number, horiz: boolean, nx: number) {
  const x = p.x, y = p.y, c = Math.floor(x), r = Math.floor(y);
  const die = (kind: string) => ((p.alive = false), ev(w, kind, x, y, p.k));
  const k = code >= 0 ? w.kind[code] : code === GRD ? GROUND : code === RIV ? RIVER : -1;
  if (code === HILL) return p.vx > 0 ? bonk(w, p) : die('splat');
  if (k === RIVER) return die('plop');
  if (k === GROUND) {
    const gc = Math.max(0, Math.min(COLS - 1, Math.floor(nx)));
    if (p.k === 'water') return (p.alive = false), splash(w, c, r);
    if (p.k === 'fire') return (p.alive = false), explode(w, gc, code >= 0 ? Math.floor(code / COLS) : ROWS);
    if (p.k === 'duck') return ev(w, 'squeak', x, y), bounce(p, horiz, 0.62);
    return die(p.k === 'melon' ? 'splat' : 'thud');
  }
  if (k === HOUSE) {
    if (p.k === 'fire') return (p.alive = false), explode(w, w.hc, w.hr);
    if (p.k === 'water') return die('splash'), hurt(w, 2, 'wet');
    hurt(w, p.dmg, p.k);
    if (p.k === 'duck' && !w.broken) return ev(w, 'squeak', x, y), bounce(p, horiz, 0.62);
    return die(p.k === 'melon' ? 'splat' : 'thud');
  }
  // 블록
  if (p.k === 'fire') return (p.alive = false), explode(w, code % COLS, Math.floor(code / COLS));
  if (k === RUBBER && !AM[p.k].heavy) {
    // 고무: 온 길 그대로 되돌려 보낸다 (등가속 운동은 속도를 뒤집으면 같은 포물선을 거꾸로 되짚는다)
    (p.vx = -p.vx), (p.vy = -p.vy), (p.back = true);
    ev(w, 'boing', x, y, p.k);
    return dmgCell(w, code, 1, 'boing');
  }
  if (p.k === 'water') return (p.alive = false), splash(w, c, r);
  if (p.k === 'rock') {
    if (k === GLASS) return dmgCell(w, code, 1, 'rock'), (p.vx *= 0.8);
    if (k === STONE) return die('thud'), dmgCell(w, code, 3, 'rock');
    return die('thud'), push(w, code, p.vx > 0 ? 1 : -1);
  }
  if (p.k === 'bowl') {
    const h = w.hp[code];
    if (h <= p.dmg) {
      dmgCell(w, code, h, 'bowl');
      p.dmg -= h;
      p.vx *= 0.72;
      p.vy *= 0.72;
      if (p.dmg <= 0) die('thud');
      return;
    }
    return die('thud'), dmgCell(w, code, p.dmg, 'bowl');
  }
  if (p.k === 'duck') return ev(w, 'squeak', x, y), dmgCell(w, code, 1, 'duck'), bounce(p, horiz, 0.62);
  die('splat');
  dmgCell(w, code, p.dmg, p.k);
}

function stepProj(w: World, p: Proj) {
  const ax = w.wind / AM[p.k].mass, d = 1 / SUB;
  if (++p.age > 480) return void (p.alive = false);
  for (let k = 0; k < SUB && p.alive; k++) {
    const nx = p.x + p.vx * d + 0.5 * ax * d * d, ny = p.y + p.vy * d + 0.5 * G * d * d;
    if (p.vx > 0 && nx >= LX - 0.9 && ny < HILL_Y + 0.4) return bonk(w, p);
    const code = probe(w, nx, ny);
    if (code === AIR) {
      p.x = nx;
      p.y = ny;
      p.vx += ax * d;
      p.vy += G * d;
      continue;
    }
    if (code === OUT) return (p.alive = false), ev(w, 'miss', p.x, p.y, p.k);
    hit(w, p, code, sideHit(p.x, p.y, nx, ny, code), nx);
    if (p.alive && code >= 0 && w.kind[code] === E) {
      // 뚫고 지나간다 (볼링공 · 바위가 유리를 깸)
      p.x = nx;
      p.y = ny;
    }
  }
}

/** 버티기 한 틱 (게임과 봇이 똑같이 쓴다) */
export function wStep(w: World) {
  w.t++;
  if (w.done) return;
  if (w.t % GRAV_T === 0) gravity(w);
  if (w.p) {
    stepProj(w, w.p);
    if (!w.p.alive) (w.p = null), (w.cd = SETTLE + (w.next < w.shots.length && !w.broken ? WINDUP : 0));
    return;
  }
  if (w.anyMoved && w.cd < 14) w.cd = 14;
  if (w.cd > 0) return void w.cd--;
  if (w.broken || w.next >= w.shots.length) return void (w.done = true);
  const s = w.shots[w.next++];
  w.p = { k: s.k, x: LX, y: LY, vx: s.vx, vy: s.vy, dmg: AM[s.k].dmg, bounces: 0, alive: true, back: false, age: 0, n: w.next - 1 };
  ev(w, 'launch', LX, LY, s.k, w.next - 1);
}

/** 예보: 지금 지은 성에서 이 탄이 처음 닿는 곳까지의 궤적 (아무것도 바꾸지 않는다) */
export function forecast(w: World, s: ShotSpec): { pts: number[]; code: number; x: number; y: number; px: number; py: number } {
  const ax = w.wind / AM[s.k].mass, d = 1 / SUB, pts: number[] = [LX, LY];
  let x = LX, y = LY, vx = s.vx, vy = s.vy;
  for (let t = 0; t < 400 * SUB; t++) {
    const nx = x + vx * d + 0.5 * ax * d * d, ny = y + vy * d + 0.5 * G * d * d;
    const code = probe(w, nx, ny);
    if (code !== AIR) return pts.push(nx, ny), { pts, code, x: nx, y: ny, px: x, py: y };
    x = nx;
    y = ny;
    vx += ax * d;
    vy += G * d;
    if (t % 8 === 7) pts.push(x, y);
  }
  return { pts, code: OUT, x, y, px: x, py: y };
}

export function makeLevel(rng: Rng, n: number): Level {
  const d = LV[n];
  const hc = d.hc[Math.floor(rng() * d.hc.length)], hill = Array(COLS).fill(0) as number[];
  for (const [dx, h] of d.hill ?? []) hill[hc + dx] = h;
  const hr = ROWS - 1 - hill[hc];
  const shots = d.shots.map(([k, T0, dx = 0, dy = 0]) => {
    const T = T0 + Math.floor(rng() * 9) - 4, tx = hc + 0.5 + dx, ty = hr + 0.5 + dy;
    return { k, vx: (tx - LX) / T, vy: (ty - LY - 0.5 * G * T * T) / T };
  });
  return { n, hc, hr, hill, river: d.river === undefined ? -1 : hc + d.river, wind: d.wind ?? 0, pieces: d.pieces.slice(), shots };
}

export interface FortState {
  rng: Rng; t: number; lv: number; tries: number; phase: 'intro' | 'build' | 'siege' | 'result'; pt: number;
  L: Level; w: World; q: number; down: boolean; taps: number; cursor: number;
  hearts: number; stars: number; pts: number; got: number; ok: boolean; won: boolean; dead: boolean;
  bonks: number; seen: Set<string>; news: { text: string; t: number } | null; events: Ev[];
}

function see(s: FortState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news = { text, t: s.t };
}

function openLevel(s: FortState, retry: boolean) {
  if (!retry) s.L = makeLevel(s.rng, s.lv);
  s.w = newWorld(s.L);
  s.w.out = s.events;
  s.w.now = s.t;
  s.q = 0;
  s.phase = 'intro';
  s.pt = retry ? INTRO - 40 : 0;
  s.got = 0;
  if (!retry) for (const [k, text] of LV[s.lv].news) see(s, k, text);
}

function startSiege(s: FortState) {
  s.phase = 'siege';
  s.pt = 0;
  s.w.cd = WINDUP + 12;
  s.events.push({ t: s.t, kind: 'siege', x: 0, y: 0 });
}

function tap(s: FortState, px: number, py: number) {
  const x = px, y = py * A;
  if (x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) return startSiege(s);
  if (x < X0 - 0.01 || x >= X0 + COLS * CW + 0.01 || y < Y0 - 2.8 * CH || y > GY + 0.04) return;
  const c = Math.max(0, Math.min(COLS - 1, Math.floor((x - X0) / CW)));
  s.w.now = s.t;
  const at = placeIn(s.w, c, s.L.pieces[s.q]);
  if (at === -1) return void s.events.push({ t: s.t, kind: 'full', x: c + 0.5, y: 0.5 });
  s.q++;
  s.taps++;
}

function finish(s: FortState) {
  const w = s.w, left = s.L.pieces.length - s.q;
  s.ok = !w.broken;
  s.bonks += w.bonks;
  s.pts += w.bonks * 5;
  if (s.ok) {
    const st = w.hhp === HOUSE_HP ? (left > 0 ? 3 : 2) : 1;
    s.got = st;
    s.stars += st;
    s.pts += 10 + st * 10;
    if (s.lv === LV.length - 1) (s.won = true), (s.pts += 30);
  } else s.hearts--;
  s.phase = 'result';
  s.pt = 0;
}

export const fortress: GameDef<FortState> = {
  id: 'fortress',
  name: '버텨라 블록성',
  genes: ['fortify', 'slingshot', 'rolereverse'],
  twist: '앵그리버드를 뒤집어 내가 짓고 너구리 해적이 쏜다 — 날아올 궤적이 미리 보이고, 고무 블록에 맞은 탄은 온 길 그대로 되돌아가 쏜 너구리를 맞힌다',
  rules: [
    '줄을 톡 치면 다음 블록이 그 줄에 떨어져 쌓여요. 날아올 탄의 궤적이 미리 보여요.',
    '다 놓거나 ▶를 누르면 너구리 해적이 쏴요 — 햄스터 집이 버티면 통과!',
    '나무·돌·유리·고무는 무게·체력·튕김이 달라요. 받침이 없으면 떨어져요.',
  ],
  controls: 'touch',
  origin: '오너 아이디어 — "앵그리버드의 반대: 내가 건물을 짓고 누군가가 날리면 버티는 게임" (2026-11-09)',
  hint: '줄을 톡 = 블록 쌓기 · ▶ = 버티기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '언덕 단면 디오라마의 햄스터 블록성',
    mood: '풀 덮인 작은 언덕을 칼로 자른 단면(흙층·자갈·뿌리) 위에 나무·돌·유리·고무 블록으로 햄스터 집을 짓는다. 강 건너 높은 언덕엔 두건 쓴 너구리 해적단과 삐걱대는 나무 투석기. 판이 지날수록 아침에서 노을로, 마지막엔 창문에 불이 켜진다.',
    palette: { bg: '#2a2340', ink: '#fffaf0', muted: '#a99cc4', accent: '#ffcf4a', hot: '#ff6b5a', soft: '#4b3f6b' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), t: 0, lv: 0, tries: 0, phase: 'intro', pt: 0, L: null as unknown as Level, w: null as unknown as World,
      q: 0, down: false, taps: 0, cursor: 0, hearts: 3, stars: 0, pts: 0, got: 0, ok: false, won: false, dead: false,
      bonks: 0, seen: new Set<string>(), news: null, events: [],
    } as FortState;
    openLevel(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.t % 30 === 0) s.events.splice(0, s.events.length, ...s.events.filter((e) => s.t - e.t < 150));
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    s.pt++;
    if (s.dead) return;
    if (s.phase === 'intro') {
      if (press && p) (s.phase = 'build'), (s.pt = 0), tap(s, p.x, p.y);
      else if (s.pt >= INTRO) (s.phase = 'build'), (s.pt = 0);
      if (s.phase === 'build' && s.q >= s.L.pieces.length) startSiege(s);
      return;
    }
    if (s.phase === 'build') {
      if (press && p) tap(s, p.x, p.y);
      if (s.phase === 'build' && s.q >= s.L.pieces.length) startSiege(s);
      return;
    }
    if (s.phase === 'siege') {
      s.w.now = s.t;
      wStep(s.w);
      if (s.w.done) finish(s);
      return;
    }
    if (s.pt >= RESULT) {
      if (s.won || s.hearts <= 0) return void (s.dead = true);
      if (s.ok) s.lv++, (s.tries = 0), openLevel(s, false);
      else s.tries++, openLevel(s, true);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return `rgb(${p.map((v, k) => Math.round(v + (q[k] - v) * Math.max(0, Math.min(1, t)))).join(',')})`;
};
/** 블록 재질 색: 앞면·윗면·옆면·선 */
const MAT: Record<number, [string, string, string, string]> = {
  [WOOD]: ['#d99a52', '#f0c487', '#a5662c', '#86501f'],
  [STONE]: ['#9aa4b0', '#c8cfd8', '#6c7681', '#59616b'],
  [GLASS]: ['#a9defa', '#dcf4ff', '#7fbde0', '#eefaff'],
  [RUBBER]: ['#e3539a', '#f78dc2', '#a9306f', '#7b1d50'],
};
const AMMO_COL: Record<Ammo, string> = { melon: '#ff5d6c', bowl: '#8f7cff', water: '#58c4ff', fire: '#ffb02e', duck: '#ffe04a', rock: '#c9b8a6' };
const SAY: Record<string, string> = { melon: '퍽!', bowl: '쿵!', water: '철썩!', fire: '콰광!', duck: '꽥!', rock: '쿠웅!' };
interface Mem { trail: { x: number; y: number }[]; trailN: number; stains: { x: number; y: number; t: number; c: string; k: string }[]; recent: { x: number; y: number; t: number }[]; arm: number; lastLaunch: number }
const mems = new WeakMap<object, Mem>();

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function poly(ctx: CanvasRenderingContext2D, pts: number[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
  ctx.closePath();
}

/** 3/4 시점 블록 하나. (x,y)=앞면 왼쪽 위(px), z=앞면 한 변, frac=남은 체력 비율 */
function cube(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, z: number, frac: number, seed: number, glow = 0) {
  const [f, tp, sd, ln] = MAT[k], dx = z * 0.27, dy = -z * 0.27, glass = k === GLASS;
  ctx.globalAlpha = glass ? 0.82 : 1;
  ctx.fillStyle = sd;
  poly(ctx, [x + z, y, x + z + dx, y + dy, x + z + dx, y + z + dy, x + z, y + z]);
  ctx.fill();
  ctx.fillStyle = tp;
  poly(ctx, [x, y, x + dx, y + dy, x + z + dx, y + dy, x + z, y]);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x + z * 0.6, y + z);
  g.addColorStop(0, mix(f, '#ffffff', 0.12));
  g.addColorStop(1, mix(f, '#000000', 0.12));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, z, z);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = ln;
  ctx.lineWidth = Math.max(1, z * 0.04);
  if (k === WOOD) {
    // 널빤지 셋 + 못 + 나뭇결
    ctx.beginPath();
    for (const q of [0.34, 0.67]) (ctx.moveTo(x + 1, y + z * q), ctx.lineTo(x + z - 1, y + z * q));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,70,25,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let j = 0; j < 3; j++) {
      const yy = y + z * (0.17 + j * 0.33) + (hsh(seed + j) - 0.5) * z * 0.08;
      ctx.moveTo(x + z * 0.12, yy);
      ctx.quadraticCurveTo(x + z * 0.5, yy + z * 0.06 * (hsh(seed * 3 + j) - 0.5), x + z * 0.88, yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#6b4a2b';
    for (const [a, b] of [[0.12, 0.17], [0.88, 0.17], [0.12, 0.83], [0.88, 0.83]]) (ctx.beginPath(), ctx.arc(x + z * a, y + z * b, Math.max(1, z * 0.04), 0, 7), ctx.fill());
  } else if (k === STONE) {
    // 벽돌 쌓기 줄눈 + 반점
    ctx.beginPath();
    ctx.moveTo(x, y + z * 0.5);
    ctx.lineTo(x + z, y + z * 0.5);
    ctx.moveTo(x + z * 0.5, y);
    ctx.lineTo(x + z * 0.5, y + z * 0.5);
    ctx.moveTo(x + z * 0.22, y + z * 0.5);
    ctx.lineTo(x + z * 0.22, y + z);
    ctx.moveTo(x + z * 0.75, y + z * 0.5);
    ctx.lineTo(x + z * 0.75, y + z);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    for (let j = 0; j < 5; j++) ctx.fillRect(x + z * hsh(seed + j * 7), y + z * hsh(seed + j * 11), 1.5, 1.5);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(x + 1, y + 1, z - 2, z * 0.07);
  } else if (k === GLASS) {
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = Math.max(1.2, z * 0.05);
    ctx.strokeRect(x + 1, y + 1, z - 2, z - 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    poly(ctx, [x + z * 0.15, y + z * 0.85, x + z * 0.55, y + z * 0.12, x + z * 0.72, y + z * 0.12, x + z * 0.32, y + z * 0.85]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    poly(ctx, [x + z * 0.5, y + z * 0.85, x + z * 0.78, y + z * 0.35, x + z * 0.85, y + z * 0.35, x + z * 0.58, y + z * 0.85]);
    ctx.fill();
  } else if (k === RUBBER) {
    // 말랑한 고무: 둥근 테두리·광택·용수철 무늬
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = Math.max(1, z * 0.05);
    rr(ctx, x + z * 0.1, y + z * 0.1, z * 0.8, z * 0.8, z * 0.2);
    ctx.stroke();
    ctx.strokeStyle = ln;
    ctx.lineWidth = Math.max(1.2, z * 0.06);
    ctx.beginPath();
    for (let j = 0; j <= 4; j++) {
      const xx = x + z * (0.22 + j * 0.14);
      if (j === 0) ctx.moveTo(xx, y + z * 0.55);
      else ctx.lineTo(xx, y + z * (j % 2 ? 0.38 : 0.62));
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(x + z * 0.3, y + z * 0.24, z * 0.13, z * 0.07, -0.5, 0, 7);
    ctx.fill();
  }
  // 금 (체력이 줄면)
  if (frac < 0.999) {
    ctx.strokeStyle = glass ? 'rgba(255,255,255,.95)' : 'rgba(30,15,5,.75)';
    ctx.lineWidth = Math.max(1, z * 0.045);
    const n = frac > 0.6 ? 1 : frac > 0.3 ? 2 : 3;
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      let px = x + z * (0.25 + 0.5 * hsh(seed + j * 5)), py = y + z * 0.05;
      ctx.moveTo(px, py);
      for (let q = 0; q < 4; q++) (px += (hsh(seed + j * 13 + q) - 0.5) * z * 0.35), (py += z * 0.22), ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  if (glow > 0) {
    ctx.strokeStyle = `rgba(255,240,140,${glow})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - 1, y - 1, z + 2, z + 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, z - 1, z - 1);
}

/** 탄 그리기 (z = 반지름 px) */
function ammo(ctx: CanvasRenderingContext2D, k: Ammo, x: number, y: number, z: number, spin: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  if (k === 'melon') {
    ctx.rotate(spin);
    ctx.fillStyle = '#2f8a3a';
    ctx.beginPath();
    ctx.ellipse(0, 0, z * 1.1, z, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#185c22';
    ctx.lineWidth = z * 0.22;
    ctx.beginPath();
    for (let j = -2; j <= 2; j++) (ctx.moveTo(j * z * 0.4, -z * 0.95), ctx.quadraticCurveTo(j * z * 0.62, 0, j * z * 0.4, z * 0.95));
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.beginPath();
    ctx.ellipse(-z * 0.4, -z * 0.45, z * 0.35, z * 0.2, -0.6, 0, 7);
    ctx.fill();
  } else if (k === 'bowl') {
    const g = ctx.createRadialGradient(-z * 0.35, -z * 0.35, z * 0.1, 0, 0, z);
    g.addColorStop(0, '#9c8cff');
    g.addColorStop(1, '#2c2370');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, z, 0, 7);
    ctx.fill();
    ctx.rotate(spin);
    ctx.fillStyle = '#120d33';
    for (const [a, b] of [[0.25, -0.35], [-0.05, -0.45], [0.1, -0.05]]) (ctx.beginPath(), ctx.arc(a * z, b * z, z * 0.13, 0, 7), ctx.fill());
  } else if (k === 'water') {
    const wob = 1 + 0.08 * Math.sin(t * 0.5);
    ctx.scale(wob, 1 / wob);
    const g = ctx.createRadialGradient(-z * 0.3, -z * 0.35, z * 0.1, 0, 0, z * 1.1);
    g.addColorStop(0, '#d6f3ff');
    g.addColorStop(1, '#2a8fe0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -z * 1.05);
    ctx.bezierCurveTo(z * 1.05, -z * 0.9, z * 1.05, z * 0.75, 0, z * 0.9);
    ctx.bezierCurveTo(-z * 1.05, z * 0.75, -z * 1.05, -z * 0.9, 0, -z * 1.05);
    ctx.fill();
    ctx.fillStyle = '#2a7cc4';
    poly(ctx, [-z * 0.18, z * 1.15, z * 0.18, z * 1.15, 0, z * 0.85]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.ellipse(-z * 0.35, -z * 0.4, z * 0.2, z * 0.32, 0.4, 0, 7);
    ctx.fill();
  } else if (k === 'fire') {
    ctx.rotate(spin);
    ctx.fillStyle = '#e8364a';
    rr(ctx, -z * 0.45, -z * 0.95, z * 0.9, z * 1.7, z * 0.15);
    ctx.fill();
    ctx.fillStyle = '#ffd43b';
    for (const q of [-0.45, 0.1]) ctx.fillRect(-z * 0.45, z * q, z * 0.9, z * 0.22);
    ctx.fillStyle = '#5a6cf0';
    poly(ctx, [-z * 0.55, -z * 0.9, z * 0.55, -z * 0.9, 0, -z * 1.6]);
    ctx.fill();
    // 심지 불꽃
    ctx.fillStyle = t % 6 < 3 ? '#fff3a0' : '#ff9a2e';
    ctx.beginPath();
    ctx.arc(0, z * 1.05 + Math.sin(t) * 1.5, z * 0.32, 0, 7);
    ctx.fill();
  } else if (k === 'duck') {
    ctx.rotate(spin * 0.5);
    ctx.fillStyle = '#ffd92e';
    ctx.beginPath();
    ctx.ellipse(z * 0.15, z * 0.25, z * 1.05, z * 0.7, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-z * 0.45, -z * 0.45, z * 0.58, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#ff8a1f';
    ctx.beginPath();
    ctx.ellipse(-z * 1.05, -z * 0.35, z * 0.36, z * 0.18, 0.15, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-z * 0.6, -z * 0.6, z * 0.12, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#f2b800';
    ctx.beginPath();
    ctx.ellipse(z * 0.45, z * 0.15, z * 0.45, z * 0.25, -0.5, 0, 7);
    ctx.fill();
  } else {
    ctx.rotate(spin);
    const g = ctx.createRadialGradient(-z * 0.3, -z * 0.4, z * 0.1, 0, 0, z * 1.1);
    g.addColorStop(0, '#d9d2c8');
    g.addColorStop(1, '#6e655b');
    ctx.fillStyle = g;
    poly(ctx, [-z, -z * 0.3, -z * 0.55, -z * 0.95, z * 0.35, -z, z, -z * 0.35, z * 0.95, z * 0.45, z * 0.3, z, -z * 0.6, z * 0.85]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,50,40,.5)';
    ctx.lineWidth = Math.max(1, z * 0.08);
    ctx.beginPath();
    ctx.moveTo(-z * 0.3, -z * 0.6);
    ctx.lineTo(z * 0.1, 0);
    ctx.lineTo(z * 0.55, z * 0.2);
    ctx.moveTo(z * 0.1, 0);
    ctx.lineTo(-z * 0.2, z * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

/** 햄스터. pose: peek(창문으로 빼꼼) hide(쏙 숨음) dizzy(어질) cheer(만세) roll(데굴데굴) — z=머리 반지름 */
function hamster(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, pose: string, t: number, look = 1) {
  ctx.save();
  ctx.translate(x, y);
  if (pose === 'roll') ctx.rotate(t * 0.18);
  const body = pose === 'cheer' || pose === 'roll';
  if (body) {
    ctx.fillStyle = '#f0a85a';
    ctx.beginPath();
    ctx.ellipse(0, z * 1.05, z * 0.95, z * 0.85, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#fff1dc';
    ctx.beginPath();
    ctx.ellipse(0, z * 1.2, z * 0.6, z * 0.55, 0, 0, 7);
    ctx.fill();
    // 팔: 만세면 번쩍
    ctx.strokeStyle = '#f0a85a';
    ctx.lineWidth = z * 0.32;
    ctx.lineCap = 'round';
    const up = pose === 'cheer' ? Math.sin(t * 0.3) * 0.25 : 0;
    ctx.beginPath();
    if (pose === 'cheer') {
      ctx.moveTo(-z * 0.7, z * 0.75);
      ctx.lineTo(-z * 1.2, -z * (0.25 + up));
      ctx.moveTo(z * 0.7, z * 0.75);
      ctx.lineTo(z * 1.2, -z * (0.25 - up));
    } else {
      ctx.moveTo(-z * 0.7, z * 0.9);
      ctx.lineTo(-z * 1.2, z * 0.5);
      ctx.moveTo(z * 0.7, z * 0.9);
      ctx.lineTo(z * 1.2, z * 0.5);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffc9c9';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * z * 1.22, pose === 'cheer' ? -z * 0.3 : z * 0.5, z * 0.2, 0, 7), ctx.fill());
  }
  const dy = pose === 'hide' ? z * 0.7 : 0;
  ctx.translate(0, dy);
  // 귀
  ctx.fillStyle = '#e8944a';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * z * 0.62, -z * 0.68, z * 0.3, 0, 7), ctx.fill());
  ctx.fillStyle = '#ffb6b6';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * z * 0.62, -z * 0.66, z * 0.16, 0, 7), ctx.fill());
  // 머리
  const g = ctx.createRadialGradient(-z * 0.3, -z * 0.35, z * 0.1, 0, 0, z * 1.1);
  g.addColorStop(0, '#ffcf8f');
  g.addColorStop(1, '#ec9a4c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, z, z * 0.88, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#fff3e2';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.32, z * 0.62, z * 0.5, 0, 0, 7);
  ctx.fill();
  // 볼
  ctx.fillStyle = 'rgba(255,120,130,.45)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * z * 0.6, z * 0.22, z * 0.2, z * 0.13, 0, 0, 7), ctx.fill());
  // 눈
  const ex = look * z * 0.08;
  if (pose === 'dizzy' || pose === 'roll') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.2, z * 0.1);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.5) ctx.lineTo(sx * z * 0.36 + Math.cos(a + t * 0.3) * a * z * 0.025, -z * 0.12 + Math.sin(a + t * 0.3) * a * z * 0.025);
      ctx.stroke();
    }
  } else if (pose === 'cheer') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.4, z * 0.11);
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * z * 0.36, -z * 0.08, z * 0.14, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
  } else {
    const big = pose === 'hide' ? 1.35 : 1, blink = pose === 'peek' && t % 170 < 6;
    ctx.fillStyle = '#1e120a';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      if (blink) ctx.ellipse(sx * z * 0.36 + ex, -z * 0.12, z * 0.14, z * 0.03, 0, 0, 7);
      else ctx.arc(sx * z * 0.36 + ex, -z * 0.12, z * 0.14 * big, 0, 7);
      ctx.fill();
    }
    if (!blink) {
      ctx.fillStyle = '#ffffff';
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * z * 0.36 + ex + z * 0.05, -z * 0.17, z * 0.05 * big, 0, 7), ctx.fill());
    }
  }
  // 코·입
  ctx.fillStyle = '#ff7f9a';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.12, z * 0.11, z * 0.08, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#7a3a22';
  ctx.lineWidth = Math.max(1, z * 0.07);
  ctx.beginPath();
  if (pose === 'cheer' || pose === 'roll') ctx.arc(0, z * 0.25, z * 0.18, 0.1, Math.PI - 0.1);
  else if (pose === 'hide' || pose === 'dizzy') ctx.ellipse(0, z * 0.36, z * 0.08, z * 0.1, 0, 0, 7);
  else (ctx.moveTo(-z * 0.15, z * 0.28), ctx.quadraticCurveTo(0, z * 0.38, z * 0.15, z * 0.28));
  ctx.stroke();
  if (pose === 'hide') {
    // 식은땀
    ctx.fillStyle = '#9fdcff';
    ctx.beginPath();
    ctx.ellipse(z * 0.9, -z * 0.45, z * 0.12, z * 0.18, 0, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  if (pose === 'dizzy' || pose === 'roll') {
    ctx.fillStyle = '#ffe14d';
    ctx.font = `${Math.round(z * 0.7)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let j = 0; j < 3; j++) {
      const a = t * 0.12 + (j * Math.PI * 2) / 3;
      ctx.fillText('★', x + Math.cos(a) * z * 1.1, y - z * 1.05 + Math.sin(a) * z * 0.3);
    }
  }
}

/** 너구리 해적. mood: smug fire laugh grr bonk cry roll. z=머리 반지름, dir=-1이면 왼쪽을 본다 */
function raccoon(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, mood: string, t: number, hat: 'cap' | 'band', dir = -1) {
  ctx.save();
  ctx.translate(x, y);
  if (mood === 'roll') ctx.rotate(Math.sin(t * 0.25) * 0.9 - 1.2);
  if (mood === 'bonk') ctx.rotate(-0.5 + Math.sin(t * 0.4) * 0.15);
  const bob = mood === 'laugh' ? Math.abs(Math.sin(t * 0.35)) * z * 0.35 : mood === 'grr' ? Math.abs(Math.sin(t * 0.6)) * z * 0.2 : Math.sin(t * 0.08) * z * 0.05;
  ctx.translate(0, -bob);
  ctx.scale(-dir, 1);
  // 꼬리 (줄무늬)
  ctx.save();
  ctx.translate(-z * 0.9, z * 1.3);
  ctx.rotate(-0.7 + Math.sin(t * 0.12) * 0.25);
  for (let j = 0; j < 4; j++) {
    ctx.fillStyle = j % 2 ? '#3b3640' : '#8d8794';
    ctx.beginPath();
    ctx.ellipse(-z * 0.32 * j, 0, z * 0.32, z * 0.28, 0, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  // 몸
  ctx.fillStyle = '#8d8794';
  ctx.beginPath();
  ctx.ellipse(0, z * 1.25, z * 0.8, z * 0.85, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#d9d4dc';
  ctx.beginPath();
  ctx.ellipse(z * 0.1, z * 1.35, z * 0.45, z * 0.55, 0, 0, 7);
  ctx.fill();
  // 해적 조끼
  ctx.fillStyle = hat === 'cap' ? '#7a2335' : '#24506e';
  poly(ctx, [-z * 0.75, z * 0.75, -z * 0.15, z * 0.85, -z * 0.35, z * 1.95, -z * 0.8, z * 1.6]);
  ctx.fill();
  // 팔
  ctx.strokeStyle = '#6f6976';
  ctx.lineWidth = z * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'fire') (ctx.moveTo(z * 0.45, z * 0.9), ctx.lineTo(z * 1.2, -z * 0.2));
  else if (mood === 'laugh' || mood === 'roll') (ctx.moveTo(z * 0.45, z * 0.9), ctx.lineTo(z * 0.3, z * 1.4));
  else if (mood === 'grr') (ctx.moveTo(z * 0.45, z * 0.9), ctx.lineTo(z * 1.0, z * (0.4 + 0.3 * Math.sin(t * 0.6))));
  else if (mood === 'cry') (ctx.moveTo(z * 0.45, z * 0.9), ctx.lineTo(z * 0.55, z * 0.1));
  else (ctx.moveTo(z * 0.45, z * 0.9), ctx.lineTo(z * 0.95, z * 1.25));
  ctx.stroke();
  if (mood === 'fire' && hat === 'cap') {
    // 나무칼 들고 "발사!"
    ctx.strokeStyle = '#c99a5b';
    ctx.lineWidth = z * 0.18;
    ctx.beginPath();
    ctx.moveTo(z * 1.2, -z * 0.2);
    ctx.lineTo(z * 1.55, -z * 1.0);
    ctx.stroke();
  }
  // 머리
  ctx.fillStyle = '#9a94a2';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sx * z * 0.75, -z * 0.35), ctx.lineTo(sx * z * 0.55, -z * 1.0), ctx.lineTo(sx * z * 0.15, -z * 0.6), ctx.fill());
  ctx.beginPath();
  ctx.ellipse(0, 0, z, z * 0.82, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#efeaf2';
  ctx.beginPath();
  ctx.ellipse(z * 0.35, z * 0.3, z * 0.55, z * 0.42, 0, 0, 7);
  ctx.fill();
  // 검은 눈가면
  ctx.fillStyle = '#2b2730';
  ctx.beginPath();
  ctx.ellipse(-z * 0.15, -z * 0.12, z * 0.42, z * 0.22, 0.2, 0, 7);
  ctx.ellipse(z * 0.5, -z * 0.12, z * 0.38, z * 0.22, -0.2, 0, 7);
  ctx.fill();
  // 눈
  if (mood === 'bonk' || mood === 'roll') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, z * 0.1);
    ctx.beginPath();
    for (const ex of [-z * 0.15, z * 0.5]) (ctx.moveTo(ex - z * 0.12, -z * 0.22), ctx.lineTo(ex + z * 0.12, -z * 0.02), ctx.moveTo(ex + z * 0.12, -z * 0.22), ctx.lineTo(ex - z * 0.12, -z * 0.02));
    ctx.stroke();
  } else if (mood === 'laugh') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, z * 0.1);
    for (const ex of [-z * 0.15, z * 0.5]) (ctx.beginPath(), ctx.arc(ex, -z * 0.05, z * 0.12, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
  } else {
    ctx.fillStyle = '#ffffff';
    for (const ex of [-z * 0.15, z * 0.5]) (ctx.beginPath(), ctx.arc(ex, -z * 0.12, z * 0.13, 0, 7), ctx.fill());
    ctx.fillStyle = '#111';
    for (const ex of [-z * 0.15, z * 0.5]) (ctx.beginPath(), ctx.arc(ex + z * 0.04, -z * 0.1, z * 0.07, 0, 7), ctx.fill());
    if (mood === 'grr') {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = Math.max(1.2, z * 0.09);
      ctx.beginPath();
      ctx.moveTo(-z * 0.35, -z * 0.38);
      ctx.lineTo(z * 0.05, -z * 0.26);
      ctx.moveTo(z * 0.75, -z * 0.38);
      ctx.lineTo(z * 0.35, -z * 0.26);
      ctx.stroke();
    }
  }
  if (hat === 'cap') {
    // 외눈 안대
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(1, z * 0.06);
    ctx.beginPath();
    ctx.moveTo(-z * 0.75, -z * 0.45);
    ctx.lineTo(z * 0.85, z * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(-z * 0.15, -z * 0.12, z * 0.2, z * 0.17, 0, 0, 7);
    ctx.fill();
  }
  // 코·입
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(z * 0.85, z * 0.18, z * 0.13, z * 0.1, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(1, z * 0.07);
  ctx.beginPath();
  if (mood === 'laugh' || mood === 'roll') {
    ctx.fillStyle = '#7a1f2b';
    ctx.moveTo(z * 0.2, z * 0.35);
    ctx.quadraticCurveTo(z * 0.5, z * 0.85, z * 0.8, z * 0.38);
    ctx.closePath();
    ctx.fill();
  } else if (mood === 'cry' || mood === 'bonk') ctx.arc(z * 0.5, z * 0.6, z * 0.18, Math.PI * 1.15, Math.PI * 1.85);
  else if (mood === 'grr') (ctx.moveTo(z * 0.3, z * 0.48), ctx.lineTo(z * 0.75, z * 0.45));
  else ctx.arc(z * 0.5, z * 0.3, z * 0.22, 0.3, Math.PI - 0.6);
  ctx.stroke();
  // 모자
  if (hat === 'cap') {
    ctx.fillStyle = '#2b2233';
    ctx.beginPath();
    ctx.moveTo(-z * 1.15, -z * 0.55);
    ctx.quadraticCurveTo(0, -z * 0.85, z * 1.15, -z * 0.55);
    ctx.quadraticCurveTo(z * 0.6, -z * 1.75, 0, -z * 1.45);
    ctx.quadraticCurveTo(-z * 0.6, -z * 1.75, -z * 1.15, -z * 0.55);
    ctx.fill();
    ctx.fillStyle = '#ffd43b';
    ctx.font = `900 ${Math.round(z * 0.55)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', 0, -z * 1.05);
  } else {
    ctx.fillStyle = '#d7263d';
    ctx.beginPath();
    ctx.ellipse(0, -z * 0.62, z * 0.95, z * 0.35, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let j = -2; j <= 2; j++) (ctx.beginPath(), ctx.arc(j * z * 0.32, -z * 0.78, z * 0.06, 0, 7), ctx.fill());
    ctx.fillStyle = '#d7263d';
    poly(ctx, [-z * 0.9, -z * 0.6, -z * 1.4, -z * 0.35, -z * 1.3, -z * 0.8]);
    ctx.fill();
  }
  if (mood === 'cry') {
    ctx.fillStyle = '#8fd6ff';
    const k = (t % 30) / 30;
    for (const ex of [-z * 0.15, z * 0.5]) (ctx.beginPath(), ctx.ellipse(ex, z * (0.1 + k * 0.6), z * 0.07, z * 0.12, 0, 0, 7), ctx.fill());
  }
  if (mood === 'bonk') {
    // 혹
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.arc(z * 0.1, -z * 1.0, z * 0.25, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  if (mood === 'bonk') {
    ctx.fillStyle = '#ffe14d';
    ctx.font = `${Math.round(z * 0.75)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let j = 0; j < 3; j++) {
      const a = t * 0.15 + (j * Math.PI * 2) / 3;
      ctx.fillText('★', x + Math.cos(a) * z * 1.1, y - z * 1.3 + Math.sin(a) * z * 0.3);
    }
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: FortState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const gx = (c: number) => X(X0 + c * CW), gyy = (r: number) => Y(Y0 + r * CH), cz = R(CW), ddx = R(DX), ddy = R(DY);
  const t = s.t, wd = s.w, L = s.L, p = s.lv / (LV.length - 1);
  let m = mems.get(s);
  if (!m) mems.set(s, (m = { trail: [], trailN: -1, stains: [], recent: [], arm: 0, lastLaunch: -999 }));
  const age = (kind: string) => {
    for (let k = s.events.length - 1; k >= 0; k--) if (s.events[k].kind === kind) return t - s.events[k].t;
    return 9999;
  };
  ctx.save();
  fx.begin(ctx);
  // ── 하늘: 판이 지날수록 아침 → 한낮 → 노을 → 저녁 ──
  const top = p < 0.5 ? mix('#7cc8f5', '#4fa3e3', p * 2) : mix('#4fa3e3', '#2c2a63', (p - 0.5) * 2);
  const bot = p < 0.5 ? mix('#e6f7ff', '#fff0c8', p * 2) : mix('#fff0c8', '#ff9466', (p - 0.5) * 2);
  const sky = ctx.createLinearGradient(0, 0, 0, Y(GY));
  sky.addColorStop(0, top);
  sky.addColorStop(1, bot);
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  if (p > 0.7) {
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 30; k++) {
      ctx.globalAlpha = (p - 0.7) * 2.5 * (0.3 + 0.7 * Math.abs(Math.sin(t / 40 + k)));
      ctx.fillRect(hsh(k) * w, Y(0.09 + hsh(k + 40) * 0.3), 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  }
  // 해
  {
    const sx = X(0.12 + 0.62 * p), sy = Y(0.28 + 0.34 * Math.max(0, p - 0.4) - 0.1 * Math.sin(p * Math.PI));
    ctx.fillStyle = p > 0.6 ? '#ffb27a' : '#fff4b0';
    ctx.shadowColor = p > 0.6 ? '#ff7a3d' : '#ffe680';
    ctx.shadowBlur = R(0.09);
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.042), 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // 구름 (바람 부는 판엔 빨리 흐른다)
  const wind = L.wind < 0;
  for (let k = 0; k < 4; k++) {
    const sp = wind ? 0.9 : 0.12, cxx = ((((hsh(k * 3) * 1.4 - t * sp * 0.001 * (1 + k * 0.3)) % 1.4) + 1.4) % 1.4) - 0.2, cyy = 0.2 + k * 0.055;
    ctx.fillStyle = p > 0.6 ? `rgba(255,${200 - k * 10},${190 - k * 15},.75)` : 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.arc(X(cxx), Y(cyy), R(0.03 + k * 0.004), 0, 7);
    ctx.arc(X(cxx + 0.035), Y(cyy - 0.012), R(0.038), 0, 7);
    ctx.arc(X(cxx + 0.075), Y(cyy), R(0.028), 0, 7);
    ctx.fill();
  }
  if (wind) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 9; k++) {
      const yy = Y(0.2 + hsh(k + 7) * 0.5), xx = (((hsh(k) * 1.3 - t * 0.012 * (1 + hsh(k + 3))) % 1.3) + 1.3) % 1.3 - 0.15;
      ctx.beginPath();
      ctx.moveTo(X(xx), yy);
      ctx.quadraticCurveTo(X(xx + 0.05), yy - R(0.012), X(xx + 0.11), yy);
      ctx.stroke();
    }
  }
  // 먼 언덕 두 겹
  for (const [yy, col, amp, k] of [[GY - 0.16, '#a6d6b0', 0.05, 1], [GY - 0.09, '#86c08e', 0.04, 2]] as [number, string, number, number][]) {
    ctx.fillStyle = mix(col, '#5a4a7d', Math.max(0, p - 0.45) * 1.3);
    ctx.beginPath();
    ctx.moveTo(-5, Y(GY + 0.05));
    for (let x = 0; x <= 1.0001; x += 0.04) ctx.lineTo(X(x), Y(yy - amp * (0.5 + 0.5 * Math.sin(x * 6 * k + k * 2))));
    ctx.lineTo(w + 5, Y(GY + 0.05));
    ctx.fill();
  }
  // ── 너구리 언덕 (오른쪽, 두꺼운 흙 단면) ──
  const HX = (x: number) => X(X0 + x * CW), HYt = (x: number) => Y(Y0 + hillTop(x) * CH);
  const SLAB = 0.105, LW = 1.9;
  {
    const xs: number[] = [];
    for (let x = HILL_X - 0.15; x <= 11.2; x += 0.1) xs.push(x);
    const outline = (oy: number) => xs.map((x) => [HX(x) + ddx * oy, (x < HILL_X ? Y(GY) : HYt(x)) + ddy * oy]);
    // 윗면(풀)
    const back = outline(LW), front = outline(0);
    ctx.fillStyle = mix('#7cc45a', '#4d5a6e', Math.max(0, p - 0.55));
    ctx.beginPath();
    front.forEach(([a, b], k) => (k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    for (let k = back.length - 1; k >= 0; k--) ctx.lineTo(back[k][0], back[k][1]);
    ctx.fill();
    // 앞면 흙층
    const bands = ['#6d4a2e', '#8a5f3a', '#a5764a', '#5e4030'];
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = mix(bands[b], '#2a2340', Math.max(0, p - 0.6) * 0.8);
      ctx.beginPath();
      front.forEach(([a, bb], k) => {
        const yy = bb + (b === 0 ? 0 : R(0.028 * b + 0.01 * Math.sin(k * 0.5 + b)));
        if (k) ctx.lineTo(a, yy);
        else ctx.moveTo(a, yy);
      });
      ctx.lineTo(w + 10, Y(GY + SLAB));
      ctx.lineTo(HX(HILL_X - 0.15), Y(GY + SLAB));
      ctx.fill();
    }
    ctx.fillStyle = '#5fae45';
    ctx.beginPath();
    front.forEach(([a, b], k) => (k ? ctx.lineTo(a, b + R(0.012)) : ctx.moveTo(a, b + R(0.012))));
    for (let k = front.length - 1; k >= 0; k--) ctx.lineTo(front[k][0], front[k][1]);
    ctx.fill();
    // 자갈
    for (let k = 0; k < 14; k++) {
      const x = HILL_X + 0.6 + hsh(k + 300) * 3, yy = HYt(x) + R(0.03 + hsh(k + 310) * 0.1), r = R(0.006 + hsh(k) * 0.006);
      ctx.fillStyle = '#8b8178';
      ctx.beginPath();
      ctx.ellipse(HX(x), yy, r * 1.3, r, 0, 0, 7);
      ctx.fill();
    }
    // 해적 깃발
    const fxp = X(0.855), fyp = HYt(9);
    ctx.strokeStyle = '#5a3b22';
    ctx.lineWidth = R(0.007);
    ctx.beginPath();
    ctx.moveTo(fxp, fyp);
    ctx.lineTo(fxp, fyp - R(0.17));
    ctx.stroke();
    ctx.fillStyle = '#1f1b2b';
    ctx.beginPath();
    ctx.moveTo(fxp, fyp - R(0.17));
    for (let k = 0; k <= 6; k++) ctx.lineTo(fxp - R(0.012 * k), fyp - R(0.17) + R(0.006) * Math.sin(t * 0.2 + k) + (k === 6 ? 0 : 0));
    ctx.lineTo(fxp - R(0.072), fyp - R(0.115) + R(0.006) * Math.sin(t * 0.2 + 6));
    ctx.lineTo(fxp, fyp - R(0.115));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${R(0.032)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦝', fxp - R(0.036), fyp - R(0.142));
  }
  // ── 골짜기 강 ──
  {
    const x0 = X(X0 + COLS * CW), x1 = HX(HILL_X + 0.3), wy = Y(GY + 0.015);
    const wg = ctx.createLinearGradient(0, wy, 0, Y(GY + SLAB));
    wg.addColorStop(0, '#5cc2ef');
    wg.addColorStop(1, '#1d5a93');
    ctx.fillStyle = wg;
    ctx.fillRect(x0 - 2, wy, x1 - x0 + 4, Y(GY + SLAB) - wy);
    ctx.fillStyle = 'rgba(190,240,255,.7)';
    poly(ctx, [x0 - 2, wy, x0 + ddx * LW, wy + ddy * LW, x1 + ddx * LW, wy + ddy * LW, x1, wy]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      const xx = x0 + ((t * 0.3 + k * 9) % Math.max(4, x1 - x0));
      ctx.beginPath();
      ctx.moveTo(xx, wy + R(0.012 + k * 0.012));
      ctx.lineTo(xx + R(0.02), wy + R(0.012 + k * 0.012));
      ctx.stroke();
    }
  }
  // ── 내 땅 (두꺼운 흙 덩어리) ──
  const PR = X(X0 + COLS * CW);
  {
    // 바닥 그림자
    const sg = ctx.createRadialGradient(X(0.35), Y(GY + SLAB + 0.01), 0, X(0.35), Y(GY + SLAB + 0.01), R(0.45));
    sg.addColorStop(0, 'rgba(20,20,40,.45)');
    sg.addColorStop(1, 'rgba(20,20,40,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, Y(GY + SLAB - 0.03), w, R(0.08));
    // 윗면 풀밭
    const gtop = ctx.createLinearGradient(0, Y(GY) + ddy * LW, 0, Y(GY));
    gtop.addColorStop(0, mix('#6db850', '#4b566a', Math.max(0, p - 0.55)));
    gtop.addColorStop(1, mix('#93d86a', '#5b667a', Math.max(0, p - 0.55)));
    ctx.fillStyle = gtop;
    poly(ctx, [-5, Y(GY), -5 + ddx * LW, Y(GY) + ddy * LW, PR + ddx * LW, Y(GY) + ddy * LW, PR, Y(GY)]);
    ctx.fill();
    // 옆면(강 쪽 절벽)
    ctx.fillStyle = '#4a3222';
    poly(ctx, [PR, Y(GY), PR + ddx * LW, Y(GY) + ddy * LW, PR + ddx * LW, Y(GY + SLAB) + ddy * LW, PR, Y(GY + SLAB)]);
    ctx.fill();
    // 뒤쪽 잔디 위 꽃·버섯·덤불 (블록 뒤로 보이는 작은 정원)
    for (let k = 0; k < 9; k++) {
      const fxx = X(0.03 + k * 0.074 + hsh(k + 3) * 0.03) + ddx * 1.5, fyy = Y(GY) + ddy * (1.35 + hsh(k) * 0.4);
      if (k % 3 === 0) {
        ctx.fillStyle = '#4f9a3c';
        ctx.beginPath();
        ctx.arc(fxx, fyy - R(0.008), R(0.014), 0, 7);
        ctx.arc(fxx + R(0.014), fyy - R(0.005), R(0.011), 0, 7);
        ctx.fill();
      } else if (k % 3 === 1) {
        ctx.strokeStyle = '#3f8a30';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fxx, fyy);
        ctx.lineTo(fxx, fyy - R(0.02));
        ctx.stroke();
        ctx.fillStyle = ['#ff8fb1', '#ffd43b', '#ffffff'][k % 3];
        ctx.beginPath();
        ctx.arc(fxx, fyy - R(0.022), R(0.006), 0, 7);
        ctx.fill();
      } else {
        ctx.fillStyle = '#f4e6d0';
        ctx.fillRect(fxx - 1, fyy - R(0.012), 2.5, R(0.012));
        ctx.fillStyle = '#e04848';
        ctx.beginPath();
        ctx.ellipse(fxx, fyy - R(0.012), R(0.01), R(0.006), 0, Math.PI, 0);
        ctx.fill();
      }
    }
    // 앞면 흙층
    const bands = [['#7a5233', 0], ['#946640', 0.028], ['#b08250', 0.06], ['#6b4a36', 0.095]] as [string, number][];
    for (const [col, off] of bands) {
      ctx.fillStyle = mix(col, '#2a2340', Math.max(0, p - 0.6) * 0.8);
      ctx.beginPath();
      ctx.moveTo(-5, Y(GY + SLAB));
      for (let x = -0.01; x <= X0 + COLS * CW + 0.001; x += 0.02) ctx.lineTo(X(x), Y(GY + off + (off ? 0.005 * Math.sin(x * 31 + off * 90) : 0)));
      ctx.lineTo(PR, Y(GY + SLAB));
      ctx.fill();
    }
    ctx.fillStyle = '#5aa543';
    ctx.fillRect(-5, Y(GY), PR + 5, R(0.01));
    // 자갈·뿌리·지렁이
    for (let k = 0; k < 22; k++) {
      const xx = X(0.01 + hsh(k * 3 + 1) * (X0 + COLS * CW - 0.03)), yy = Y(GY + 0.025 + hsh(k * 3 + 2) * (SLAB - 0.035)), r = R(0.004 + hsh(k) * 0.007);
      ctx.fillStyle = k % 3 ? '#8d837a' : '#c2b8a8';
      ctx.beginPath();
      ctx.ellipse(xx, yy, r * 1.3, r, hsh(k + 5) * 3, 0, 7);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(225,190,140,.55)';
    ctx.lineWidth = 1.2;
    for (const [rx, len] of [[0.12, 0.05], [0.41, 0.07], [0.58, 0.045]]) {
      ctx.beginPath();
      ctx.moveTo(X(rx), Y(GY + 0.01));
      ctx.bezierCurveTo(X(rx - 0.015), Y(GY + len * 0.4), X(rx + 0.02), Y(GY + len * 0.7), X(rx + 0.004), Y(GY + len));
      ctx.stroke();
    }
    ctx.strokeStyle = '#e48a9a';
    ctx.lineWidth = R(0.008);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const wx = X(0.27 + 0.01 * Math.sin(t / 50)), wy = Y(GY + 0.085);
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + R(0.012), wy - R(0.01), wx + R(0.024), wy);
    ctx.quadraticCurveTo(wx + R(0.036), wy + R(0.01), wx + R(0.046), wy);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // 풀잎
    ctx.strokeStyle = 'rgba(50,110,40,.6)';
    ctx.lineWidth = 1.1;
    for (let k = 0; k < 40; k++) {
      const dep = hsh(k + 90) * LW, gxp = hsh(k + 70) * PR + ddx * dep, gyp = Y(GY) + ddy * dep;
      ctx.beginPath();
      ctx.moveTo(gxp, gyp);
      ctx.lineTo(gxp + Math.sin(t / 30 + k) * (wind ? 3 : 1.2), gyp - 3 - hsh(k + 9) * 3);
      ctx.stroke();
    }
  }
  // 칸 안의 언덕(땅)과 강
  for (let r = ROWS - 1; r >= 0; r--)
    for (let c = 0; c < COLS; c++) {
      const k = wd.kind[r * COLS + c], x = gx(c), y = gyy(r);
      if (k === GROUND) {
        ctx.fillStyle = '#4a3222';
        poly(ctx, [x + cz, y, x + cz + ddx, y + ddy, x + cz + ddx, y + cz + ddy, x + cz, y + cz]);
        ctx.fill();
        ctx.fillStyle = mix('#7fcb5c', '#4b566a', Math.max(0, p - 0.55));
        poly(ctx, [x, y, x + ddx, y + ddy, x + cz + ddx, y + ddy, x + cz, y]);
        ctx.fill();
        const gg = ctx.createLinearGradient(0, y, 0, y + cz);
        gg.addColorStop(0, '#8a5f3a');
        gg.addColorStop(1, '#6d4a2e');
        ctx.fillStyle = gg;
        ctx.fillRect(x, y, cz, cz);
        ctx.fillStyle = '#5aa543';
        ctx.fillRect(x, y, cz, R(0.01));
        ctx.fillStyle = '#9a8f84';
        ctx.beginPath();
        ctx.ellipse(x + cz * (0.3 + 0.4 * hsh(c + r * 7)), y + cz * 0.6, cz * 0.1, cz * 0.07, 0, 0, 7);
        ctx.fill();
      } else if (k === RIVER) {
        const sy = y + cz * 0.45;
        ctx.fillStyle = '#4a3222';
        ctx.fillRect(x, y, cz, Y(GY + SLAB) - y);
        const wg = ctx.createLinearGradient(0, sy, 0, Y(GY + SLAB));
        wg.addColorStop(0, '#5cc2ef');
        wg.addColorStop(1, '#1d5a93');
        ctx.fillStyle = wg;
        ctx.fillRect(x + 1, sy, cz - 2, Y(GY + SLAB) - sy);
        ctx.fillStyle = 'rgba(190,240,255,.8)';
        poly(ctx, [x + 1, sy, x + 1 + ddx, sy + ddy, x + cz - 1 + ddx, sy + ddy, x + cz - 1, sy]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const o = (t * 0.4) % cz;
        ctx.moveTo(x + o * 0.6, sy + cz * 0.15);
        ctx.lineTo(x + o * 0.6 + cz * 0.2, sy + cz * 0.15);
        ctx.stroke();
      }
    }
  // ── 투석기와 너구리 해적단 ──
  const ht = HYt(10), relX = X(X0 + LX * CW), relY = Y(Y0 + LY * CH), pvx = relX + R(ARM * 0.26), pvy = relY + R(ARM * 0.966);
  {
    // 팔 각도: 쏘기 직전 당기기 → 휙 → 천천히 돌아오기
    const la = age('launch');
    let ang: number;
    const loading = s.phase === 'siege' && !wd.p && wd.cd < WINDUP && !wd.broken && wd.next < wd.shots.length;
    if (la < 8) ang = 1.3 - (la / 8) * 1.56;
    else if (la < 60) ang = -0.26 + ((la - 8) / 52) * 0.5;
    else if (loading) ang = 0.24 + (1 - wd.cd / WINDUP) * 1.06;
    else ang = 0.24;
    if (la < 4) fx.kick(2);
    // 받침대 (바퀴 둘 · A자 기둥 · 멈춤대)
    const by = ht - R(0.014);
    ctx.strokeStyle = '#7a4f2a';
    ctx.lineWidth = R(0.012);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pvx - R(0.05), by);
    ctx.lineTo(pvx + R(0.065), by);
    ctx.moveTo(pvx - R(0.035), by);
    ctx.lineTo(pvx, pvy);
    ctx.lineTo(pvx + R(0.045), by);
    ctx.stroke();
    ctx.strokeStyle = '#9b6a3a';
    ctx.beginPath();
    ctx.moveTo(pvx, pvy);
    ctx.lineTo(pvx - R(0.022), pvy - R(0.04));
    ctx.stroke();
    ctx.fillStyle = '#c94a3a';
    ctx.beginPath();
    ctx.arc(pvx - R(0.022), pvy - R(0.04), R(0.008), 0, 7);
    ctx.fill();
    for (const wx of [-0.035, 0.045]) {
      ctx.fillStyle = '#5a3a20';
      ctx.beginPath();
      ctx.arc(pvx + R(wx), by + R(0.004), R(0.017), 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#c9965a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let j = 0; j < 4; j++) (ctx.moveTo(pvx + R(wx), by + R(0.004)), ctx.lineTo(pvx + R(wx) + Math.cos(j * 0.8 + t * 0.01) * R(0.015), by + R(0.004) + Math.sin(j * 0.8 + t * 0.01) * R(0.015)));
      ctx.stroke();
    }
    // 던지는 팔 + 숟가락
    ctx.save();
    ctx.translate(pvx, pvy);
    ctx.rotate(ang - 0.26);
    ctx.strokeStyle = '#b07a42';
    ctx.lineWidth = R(0.011);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, R(0.012));
    ctx.lineTo(0, -R(ARM * 0.88));
    ctx.stroke();
    ctx.fillStyle = '#8a5a2c';
    ctx.beginPath();
    ctx.ellipse(0, -R(ARM), R(0.022), R(0.012), 0, 0, Math.PI);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#4a2e18';
    ctx.beginPath();
    ctx.arc(pvx, pvy, R(0.007), 0, 7);
    ctx.fill();
    // 숟가락에 다음 탄
    if (loading || (s.phase !== 'siege' && s.phase !== 'result')) {
      const nk = s.phase === 'siege' ? wd.shots[wd.next]?.k : L.shots[0].k;
      if (nk) {
        const a = ang - 0.26, bx = pvx + Math.sin(a) * R(ARM + 0.012), bby = pvy - Math.cos(a) * R(ARM + 0.012);
        ammo(ctx, nk, bx, bby, R(0.022), 0, t);
      }
    }
    ctx.lineCap = 'butt';
  }
  // 너구리 기분: 사건에 따라
  {
    const ouch = age('ouch'), bk = age('bonk'), blocked = Math.min(age('splat'), age('thud'), age('break'), age('plop'), age('miss'));
    let mood = 'smug';
    if (s.phase === 'result') mood = s.ok ? 'cry' : 'roll';
    else if (bk < 100) mood = 'bonk';
    else if (ouch < 70) mood = 'laugh';
    else if (blocked < 50 && s.phase === 'siege') mood = 'grr';
    else if (s.phase === 'siege' && !wd.p && wd.cd < WINDUP) mood = 'fire';
    const z = R(0.03);
    raccoon(ctx, X(0.975), ht - z * 2.05, z * 0.9, mood === 'fire' ? 'smug' : mood, t + 17, 'band', -1);
    raccoon(ctx, X(0.818), ht - z * 2.1, z, mood, t, 'cap', -1);
    // 말풍선
    let say = '';
    if (s.phase === 'result') say = s.ok ? '흑흑…' : 'ㅋㅋㅋㅋ';
    else if (bk < 80) say = '으악!';
    else if (ouch < 60) say = 'ㅋㅋㅋ';
    else if (blocked < 45 && s.phase === 'siege') say = '끄응!';
    else if (s.phase === 'siege' && !wd.p && wd.cd < 26 && wd.next < wd.shots.length && !wd.broken) say = '발사!';
    if (say) {
      ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
      const tw = ctx.measureText(say).width + R(0.03), bx = Math.min(w - tw - 2, X(0.8) - tw / 2), by = ht - R(0.2);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      rr(ctx, bx, by, tw, R(0.05), R(0.02));
      ctx.fill();
      poly(ctx, [bx + tw * 0.4, by + R(0.05), bx + tw * 0.55, by + R(0.05), bx + tw * 0.5, by + R(0.068)]);
      ctx.fill();
      ctx.fillStyle = '#3a2a4a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(say, bx + tw / 2, by + R(0.026));
    }
  }
  // ── 예보: 궤적 점선 + 처음 닿는 곳 ──
  const fc = s.phase === 'intro' || s.phase === 'build';
  const shotList = fc ? L.shots.map((sh, n) => ({ sh, n })) : s.phase === 'siege' && !wd.p && wd.next < wd.shots.length && !wd.broken ? [{ sh: wd.shots[wd.next], n: wd.next }] : [];
  const warns: { x: number; y: number; text: string; col: string }[] = [];
  for (const { sh, n } of shotList) {
    const f = forecast(wd, sh), col = AMMO_COL[sh.k];
    const grow = fc && s.phase === 'intro' && !s.tries ? Math.min(1, s.pt / 50 - n * 0.25) : 1;
    if (grow <= 0) continue;
    const cnt = Math.max(2, Math.floor((f.pts.length / 2) * grow));
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.lineWidth = R(0.0075);
    ctx.strokeStyle = 'rgba(30,20,50,.35)';
    ctx.beginPath();
    for (let k = 0; k < cnt; k++) {
      const xx = gx(f.pts[k * 2]) + 1.5, yy = gyy(f.pts[k * 2 + 1]) + 1.5;
      if (k) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.beginPath();
    for (let k = 0; k < cnt; k++) {
      const xx = gx(f.pts[k * 2]), yy = gyy(f.pts[k * 2 + 1]);
      if (k) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // 궤적 꼭대기에 번호
    const ai = Math.floor((f.pts.length / 2) * (0.3 + 0.08 * n));
    if (ai < cnt) {
      const bx = gx(f.pts[ai * 2]), by = gyy(f.pts[ai * 2 + 1]) - R(0.025);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bx, by, R(0.022), 0, 7);
      ctx.fill();
      ctx.fillStyle = '#2a1d3a';
      ctx.font = `900 ${R(0.03)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n + 1), bx, by + 0.5);
    }
    if (grow < 1) continue;
    // 처음 닿는 곳 판정 (한 수 앞만 — 그 뒤는 직접 생각)
    const ix = gx(f.x), iy = gyy(f.y);
    let text = '', wc = '#8be38b';
    const k = f.code >= 0 ? wd.kind[f.code] : -1, hc = wd.hc, hr = wd.hr;
    if (k === HOUSE) (text = '⚠ 집!'), (wc = '#ff5a5a');
    else if (sh.k === 'fire' && f.code >= 0 && Math.abs((f.code % COLS) - hc) <= 1 && Math.abs(Math.floor(f.code / COLS) - hr) <= 1) (text = '⚠ 펑→집'), (wc = '#ff5a5a');
    else if (sh.k === 'fire' && f.code === GRD && Math.abs(Math.floor(f.x) - hc) <= 1 && hr === ROWS - 1) (text = '⚠ 펑→집'), (wc = '#ff5a5a');
    else if (sh.k === 'water' && Math.abs(Math.floor(f.px) - hc) <= 1 && splashHits(wd, Math.floor(f.px), Math.floor(f.py)) && !(k === RUBBER)) (text = '⚠ 물→집'), (wc = '#ff5a5a');
    else if (k === RUBBER && !AM[sh.k].heavy && sh.k !== 'fire') (text = '뿅! 되돌림'), (wc = '#ff9ad5');
    else if (sh.k === 'bowl' && isBlock(k) && wd.hp[f.code] <= 4) (text = '뚫려요'), (wc = '#ffb347');
    else if (sh.k === 'rock' && isBlock(k) && k !== STONE) (text = k === GLASS ? '뚫려요' : '밀려요'), (wc = '#ffb347');
    else if (isBlock(k) || k === GROUND || f.code === GRD || k === RIVER || f.code === RIV) (text = '막음'), (wc = '#8be38b');
    else text = '';
    if (text) warns.push({ x: ix, y: iy, text, col: wc });
    ctx.strokeStyle = wc;
    ctx.lineWidth = 2.5;
    const pr = R(0.02) + (wc === '#ff5a5a' ? Math.sin(t / 5) * 2 : 0);
    ctx.beginPath();
    ctx.moveTo(ix - pr, iy - pr);
    ctx.lineTo(ix + pr, iy + pr);
    ctx.moveTo(ix + pr, iy - pr);
    ctx.lineTo(ix - pr, iy + pr);
    ctx.stroke();
  }
  // ── 놓을 자리 미리 보기 (줄마다 떨어질 칸) ──
  if (fc && s.q < L.pieces.length) {
    const nk = L.pieces[s.q];
    ctx.setLineDash([3, 3]);
    for (let c = 0; c < COLS; c++) {
      let r = -1;
      while (r + 1 < ROWS && wd.kind[(r + 1) * COLS + c] === E) r++;
      if (r < 0) continue;
      const river = r + 1 < ROWS && wd.kind[(r + 1) * COLS + c] === RIVER;
      const x = gx(c), y = gyy(river ? r + 1 : r) + (river ? cz * 0.25 : 0);
      ctx.strokeStyle = river && nk !== STONE ? 'rgba(120,200,255,.8)' : 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 3, y + 3, cz - 6, cz - 6);
      if (river) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${R(0.026)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(nk === STONE ? '가라앉음' : '둥둥~', x + cz / 2, y - R(0.012));
      }
    }
    ctx.setLineDash([]);
  }
  // ── 블록·집 (아래 줄부터, 왼쪽부터) ──
  const offs = new Map<number, [number, number]>();
  for (const e of s.events) {
    const a = t - e.t;
    const ci = Math.floor(e.y - 0.5) * COLS + Math.floor(e.x);
    if (e.kind === 'place' && a < 10) offs.set(ci, [0, -(e.y2 ?? 1) * Math.pow(1 - a / 10, 2)]);
    if (e.kind === 'push' && a < 8) offs.set(ci, [((e.x2 ?? e.x) - e.x) * (1 - a / 8), 0]);
    if (e.kind === 'crack' && a < 14) offs.set(ci, [Math.sin(a * 1.8) * 0.06 * (1 - a / 14), 0]);
  }
  const gphase = (wd.t % GRAV_T) / GRAV_T;
  const hcx = gx(wd.hc), hcy = gyy(wd.hr);
  // 블록 그림자 (빛은 왼쪽 위에서)
  ctx.fillStyle = 'rgba(30,40,20,.28)';
  for (let c = 0; c < COLS; c++) {
    let tall = 0;
    for (let r = ROWS - 1; r >= 0 && isBlock(wd.kind[r * COLS + c]) || (r >= 0 && wd.kind[r * COLS + c] === HOUSE); r--) tall++;
    if (!tall) continue;
    ctx.beginPath();
    ctx.ellipse(gx(c) + cz * 0.75, Y(GY) + ddy * 0.45, cz * (0.55 + tall * 0.08), Math.abs(ddy) * 0.45, 0, 0, 7);
    ctx.fill();
  }
  const pr = wd.p, hamPose = s.phase === 'result' ? (s.ok ? 'cheer' : 'roll') : age('ouch') < 50 ? 'dizzy' : pr && !pr.back && s.phase === 'siege' ? 'hide' : 'peek';
  for (let r = ROWS - 1; r >= 0; r--)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, k = wd.kind[i];
      if (!isBlock(k) && k !== HOUSE) continue;
      const o = offs.get(i) ?? [0, 0], fall = wd.moved[i] ? -(1 - gphase) : 0;
      const x = gx(c + o[0]), y = gyy(r + o[1] + fall);
      if (k === HOUSE) {
        drawHouse(ctx, x, y, cz, wd.hhp, t, hamPose, L.n >= LV.length - 2 ? 1 : 0);
        continue;
      }
      cube(ctx, k, x, y, cz, wd.hp[i] / HPMAX[k], i * 7 + k, 0);
    }
  // 얼룩 (수박 즙·물·그을음)
  for (const e of s.events) {
    if (e.t <= (fx.memo.t ?? -1)) continue;
    if (e.kind === 'splat' && e.text === 'melon') m.stains.push({ x: e.x, y: e.y, t: e.t, c: '#ff4d6d', k: 'melon' });
    if (e.kind === 'boom') m.stains.push({ x: e.x, y: e.y, t: e.t, c: '#2a2020', k: 'soot' });
  }
  m.stains = m.stains.filter((q) => t - q.t < 200);
  for (const q of m.stains) {
    const a = 1 - (t - q.t) / 200;
    ctx.globalAlpha = a * (q.k === 'soot' ? 0.4 : 0.8);
    ctx.fillStyle = q.c;
    const xx = X(X0 + q.x * CW), yy = Y(Y0 + q.y * CH);
    for (let j = 0; j < 6; j++) {
      ctx.beginPath();
      ctx.arc(xx + (hsh(j + q.t) - 0.5) * cz * 0.8, yy + (hsh(j * 3 + q.t) - 0.5) * cz * 0.8, cz * (0.06 + hsh(j + 9) * 0.1) * (q.k === 'soot' ? 2.2 : 1), 0, 7);
      ctx.fill();
    }
    if (q.k === 'melon') {
      ctx.fillStyle = '#1a1a1a';
      for (let j = 0; j < 4; j++) ctx.fillRect(xx + (hsh(j * 5 + q.t) - 0.5) * cz * 0.7, yy + (hsh(j * 7 + q.t) - 0.5) * cz * 0.7, 2, 3);
    }
    ctx.globalAlpha = 1;
  }
  // ── 날아가는 탄 (꼬리 + 땅 그림자) ──
  if (pr) {
    if (m.trailN !== pr.n) (m.trailN = pr.n), (m.trail = []);
    const px = X(X0 + pr.x * CW), py = Y(Y0 + pr.y * CH);
    m.trail.push({ x: px, y: py });
    if (m.trail.length > 14) m.trail.shift();
    for (let k = 0; k < m.trail.length; k++) {
      ctx.globalAlpha = (k / m.trail.length) * 0.45;
      ctx.fillStyle = pr.k === 'fire' ? (k % 2 ? '#ffdf6b' : '#ff7a2e') : '#ffffff';
      ctx.beginPath();
      ctx.arc(m.trail[k].x, m.trail[k].y, R(0.008) * (k / m.trail.length) + 1, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const shy = Y(GY) + ddy * 0.5, hgt = Math.max(0, shy - py);
    ctx.fillStyle = `rgba(20,20,40,${Math.max(0.08, 0.35 - hgt / w)})`;
    ctx.beginPath();
    ctx.ellipse(px, pr.x < COLS ? shy : Y(GY + 0.02), R(0.03) * (1 + hgt / w), R(0.008), 0, 0, 7);
    ctx.fill();
    ammo(ctx, pr.k, px, py, R(pr.k === 'rock' ? 0.038 : 0.033), pr.age * (pr.back ? -0.25 : 0.2), t);
  } else m.trail = [];
  // ── 사건 → 손맛 ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    for (let k = 0; k < 6 && m!.recent.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    m!.recent.push({ x, y, t });
    if (m!.recent.length > 12) m!.recent.shift();
    fx.pop(x, y, text, col, size);
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(X0 + e.x * CW), y = Y(Y0 + e.y * CH), mc = e.m && MAT[e.m] ? MAT[e.m][0] : '#ffffff';
    switch (e.kind) {
      case 'place':
        fx.burst(x, y + cz * 0.5, '#d9c7a0', 6, 1.5, 2), fx.kick(1.2);
        if (s.taps === 1 && s.lv === 0) say(x - cz, y - cz * 0.4, '톡!', '#fff6c8', 15);
        break;
      case 'full': say(x, y, '꽉 찼어요', '#ffffff', 13); break;
      case 'sink': fx.burst(x, y, '#9fe0ff', 18, 3, 2.5), say(x, y - cz * 0.6, '꼬르륵 — 받침 완성!', '#cdefff', 13); break;
      case 'float': fx.burst(x, y, '#9fe0ff', 14, 2.5, 2.2), say(x, y - cz * 0.6, '둥둥~ 떠내려가요', '#cdefff', 13); break;
      case 'launch':
        fx.burst(pvx, pvy - R(0.06), '#c9a06a', 10, 2.5, 2), say(X(0.8), ht - R(0.3), `${e.m! + 1}. ${AM[e.text as Ammo].name}!`, AMMO_COL[e.text as Ammo], 15);
        break;
      case 'splat':
        fx.burst(x, y, e.text === 'melon' ? '#ff4d6d' : '#d8d8d8', 22, 3.6, 2.6), fx.burst(x, y, '#2f8a3a', 8, 2.5, 2.4), fx.kick(4), say(x, y - cz * 0.4, SAY[e.text ?? 'melon'] ?? '퍽!', '#ffffff', 17);
        break;
      case 'thud': fx.burst(x, y, '#cfc6b8', 16, 3, 2.5), fx.kick(6), say(x, y - cz * 0.4, SAY[e.text ?? 'bowl'] ?? '쿵!', '#ffffff', 17); break;
      case 'plop': fx.burst(x, y, '#9fe0ff', 20, 3, 2.5), say(x, y - cz * 0.4, '퐁당!', '#cdefff', 15); break;
      case 'miss': say(Math.max(R(0.1), x), y, '휙— 빗나감', '#ffffff', 14); break;
      case 'squeak': fx.burst(x, y, '#ffe04a', 8, 2, 2), say(x, y - cz * 0.3, '꽥!', '#fff3a0', 15); break;
      case 'boing': fx.ring(x, y, '#ff9ad5', R(0.08), 4), fx.burst(x, y, '#ff9ad5', 14, 3, 2.5), fx.kick(3), say(x, y - cz * 0.4, '뿅! 되돌려 보내기', '#ffd0ea', 15); break;
      case 'bonk':
        fx.burst(X(0.8), ht - R(0.08), '#ffe14d', 30, 4.5, 3), fx.ring(X(0.8), ht - R(0.08), '#ffe14d', R(0.12), 5), fx.kick(7), fx.blink('#fff0a0', 0.18);
        say(X(0.78), ht - R(0.24), '되받아치기! +5', '#ffe14d', 18);
        break;
      case 'break':
        fx.burst(x, y, mc, 26, 4.2, 3), fx.burst(x, y, '#ffffff', 6, 3, 1.6), fx.kick(e.m === STONE ? 8 : 5);
        say(x, y - cz * 0.3, e.m === GLASS ? '와장창!' : e.m === STONE ? '쩌억!' : e.m === RUBBER ? '뿌직!' : '우지끈!', '#ffffff', 16);
        break;
      case 'crack': fx.burst(x, y, mc, 8, 2.4, 2), fx.kick(3); break;
      case 'boom':
        fx.burst(x, y, '#ffb02e', 40, 5.5, 3.4), fx.burst(x, y, '#ff4d4d', 24, 4, 3), fx.burst(x, y, '#5a6cf0', 14, 4.5, 2.6), fx.ring(x, y, '#ffdf6b', cz * 1.7, 6);
        fx.kick(10), fx.blink('#ffdf9a', 0.3), say(x, y - cz, '콰광!', '#ffdf6b', 20);
        break;
      case 'splash': fx.burst(x, y, '#7fd0ff', 30, 4, 3), fx.ring(x, y, '#9fe0ff', cz * 1.3, 4), fx.kick(4), say(x, y - cz * 0.5, '철썩!', '#cdefff', 17); break;
      case 'drip': {
        const y2 = Y(Y0 + (e.y2 ?? e.y) * CH);
        for (let yy = y; yy < y2; yy += cz * 0.35) fx.burst(x, yy, '#7fd0ff', 2, 0.8, 2.2);
        fx.burst(x, y2, '#bfe9ff', 8, 2, 2);
        break;
      }
      case 'push': fx.burst(x, y + cz * 0.5, '#cfc6b8', 12, 2.5, 2.2), say(x, y - cz * 0.5, '밀려요!', '#ffd28a', 14); break;
      case 'shove': fx.kick(5), fx.burst(x, y, '#cfc6b8', 10, 2.5, 2.2); break;
      case 'fly': fx.burst(x, y, mc, 14, 3, 2.5), say(x, y - cz * 0.5, '휘잉~', '#ffffff', 14); break;
      case 'land': fx.burst(x, y, '#cfc6b8', 8, 2, 2), fx.kick(e.m === STONE ? 5 : 2.5); break;
      case 'ouch':
        fx.burst(x, y, e.text === 'wet' ? '#7fd0ff' : '#ffcf8f', 26, 4, 3), fx.ring(x, y, '#ff5a5a', cz * 1.2, 5), fx.kick(9), fx.blink('#ff7a7a', 0.22);
        say(x, y - cz * 0.9, e.text === 'wet' ? '앗 차가워! -' + e.m : e.text === 'crush' ? '아야! 깔렸다 -' + e.m : e.text === 'boom' ? '앗 뜨거! -' + e.m : `아야! -${e.m}`, '#ffb3b3', 16);
        break;
      case 'collapse': fx.burst(x, y, '#f3d9b8', 50, 6, 3.6), fx.kick(14), fx.blink('#ff5a5a', 0.35); break;
      case 'siege': say(X(0.45), Y(0.29), '🏴‍☠️ 너구리 해적단 공격!', '#ffe14d', 18); break;
    }
  }
  fx.memo.t = s.t;
  // 예보 판정 글자 (블록 위에)
  for (const q of warns) {
    ctx.font = `900 ${R(0.034)}px system-ui, sans-serif`;
    const tw = ctx.measureText(q.text).width + R(0.024), bx = Math.max(2, Math.min(w - tw - 2, q.x - tw / 2)), by = q.y - R(0.075);
    ctx.fillStyle = 'rgba(30,22,45,.82)';
    rr(ctx, bx, by, tw, R(0.044), R(0.015));
    ctx.fill();
    ctx.fillStyle = q.col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(q.text, bx + tw / 2, by + R(0.023));
  }
  // 판 끝: 햄스터 만세(지붕 꼭대기) / 데굴데굴
  if (s.phase === 'result') {
    if (s.ok) {
      let top = wd.hr;
      while (top - 1 >= 0 && isBlock(wd.kind[(top - 1) * COLS + wd.hc])) top--;
      const hop = Math.abs(Math.sin(t * 0.18)) * R(0.03);
      hamster(ctx, hcx + cz / 2 + ddx * 0.4, gyy(top) - R(0.055) - hop, R(0.034), 'cheer', t, 0);
      if (t % 24 === 0) fx.burst(hcx + cz / 2, gyy(top) - R(0.1), ['#ffe14d', '#ff8fb1', '#8be38b', '#7cc7ff'][(t / 24) % 4], 14, 4, 2.6);
    } else {
      const roll = Math.min(1, s.pt / 60);
      hamster(ctx, hcx - cz * 0.2 - roll * cz * 1.2, Y(GY) - R(0.03), R(0.03), 'roll', t, 0);
    }
  }
  // 저녁: 창문 불빛
  if (p > 0.6) {
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(hcx + cz / 2, hcy + cz / 2, 0, hcx + cz / 2, hcy + cz / 2, cz * 1.6);
    lg.addColorStop(0, `rgba(255,190,90,${0.35 * (p - 0.5)})`);
    lg.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(hcx - cz * 1.6, hcy - cz * 1.1, cz * 4.2, cz * 3.2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(255,120,70,${(p - 0.6) * 0.18})`;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
  ctx.restore();
  drawHud(ctx, s, w, h, th, R, X, Y);
}

/** 물풍선이 (c,r)에서 터지면 집이 젖는가 (예보용) */
function splashHits(w: World, c: number, r: number) {
  for (let cc = c - 1; cc <= c + 1; cc++) {
    if (cc < 0 || cc >= COLS) continue;
    for (let rr2 = Math.max(0, r); rr2 < ROWS; rr2++) {
      const k = w.kind[rr2 * COLS + cc];
      if (k) {
        if (k === HOUSE) return true;
        break;
      }
    }
  }
  return false;
}

/** 햄스터 집: 크림색 벽 · 빨간 처마 · 둥근 창으로 햄스터가 빼꼼 */
function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, hp: number, t: number, pose: string, lamp: number) {
  const dx = z * 0.27, dy = -z * 0.27;
  if (hp <= 0) {
    // 무너진 집: 판자 더미
    ctx.fillStyle = '#c9a57a';
    for (let j = 0; j < 5; j++) {
      ctx.save();
      ctx.translate(x + z * (0.2 + j * 0.16), y + z * (0.75 + (j % 2) * 0.08));
      ctx.rotate((hsh(j) - 0.5) * 1.6);
      ctx.fillRect(-z * 0.22, -z * 0.06, z * 0.44, z * 0.12);
      ctx.restore();
    }
    ctx.fillStyle = '#d6453d';
    poly(ctx, [x + z * 0.1, y + z * 0.75, x + z * 0.55, y + z * 0.45, x + z * 0.95, y + z * 0.8]);
    ctx.fill();
    return;
  }
  ctx.fillStyle = '#c98f6a';
  poly(ctx, [x + z, y, x + z + dx, y + dy, x + z + dx, y + z + dy, x + z, y + z]);
  ctx.fill();
  ctx.fillStyle = '#d6453d';
  poly(ctx, [x, y, x + dx, y + dy, x + z + dx, y + dy, x + z, y]);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x, y + z);
  g.addColorStop(0, '#fff1d6');
  g.addColorStop(1, '#f2d3a6');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, z, z);
  // 처마 줄
  ctx.fillStyle = '#d6453d';
  ctx.fillRect(x - 1, y, z + 2, z * 0.12);
  ctx.fillStyle = '#ffffff';
  for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.arc(x + z * (0.15 + j * 0.23), y + z * 0.12, z * 0.06, 0, Math.PI), ctx.fill());
  // 둥근 창 (안쪽이 어둡고, 저녁엔 불빛)
  const wx = x + z * 0.5, wy = y + z * 0.56, wr = z * 0.36;
  ctx.fillStyle = lamp ? '#ffcf73' : '#4a3a5a';
  if (lamp) (ctx.shadowColor = '#ffb347'), (ctx.shadowBlur = z * 0.5);
  ctx.beginPath();
  ctx.arc(wx, wy, wr, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath();
  ctx.arc(wx, wy, wr, 0, 7);
  ctx.clip();
  if (pose !== 'cheer' && pose !== 'roll') hamster(ctx, wx, wy + z * 0.06, z * 0.31, pose, t, 1);
  ctx.restore();
  ctx.strokeStyle = '#8a5a3a';
  ctx.lineWidth = Math.max(1.5, z * 0.07);
  ctx.beginPath();
  ctx.arc(wx, wy, wr, 0, 7);
  ctx.stroke();
  // 금 (다치면)
  if (hp < HOUSE_HP) {
    ctx.strokeStyle = 'rgba(90,50,30,.8)';
    ctx.lineWidth = Math.max(1, z * 0.04);
    ctx.beginPath();
    ctx.moveTo(x + z * 0.08, y + z * 0.2);
    ctx.lineTo(x + z * 0.2, y + z * 0.45);
    ctx.lineTo(x + z * 0.1, y + z * 0.7);
    if (hp < 2) (ctx.moveTo(x + z * 0.92, y + z * 0.25), ctx.lineTo(x + z * 0.8, y + z * 0.5), ctx.lineTo(x + z * 0.9, y + z * 0.8));
    ctx.stroke();
  }
  // 체력 점 (집 위 작은 하트 대신 동그라미 3개)
  for (let j = 0; j < HOUSE_HP; j++) {
    ctx.fillStyle = j < hp ? '#ffcf4a' : 'rgba(60,40,60,.55)';
    ctx.beginPath();
    ctx.arc(x + z * (0.3 + j * 0.2), y + z * 0.93, z * 0.065, 0, 7);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, z - 1, z - 1);
}

function drawHud(ctx: CanvasRenderingContext2D, s: FortState, w: number, h: number, th: Theme, R: (r: number) => number, X: (x: number) => number, Y: (y: number) => number) {
  const L = s.L, wd = s.w, t = s.t;
  // ── 위 띠: 판 · 별 · 하트 ──
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(42,35,64,.86)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${R(0.044)}px system-ui, sans-serif`;
  ctx.fillText(`${s.lv + 1}/${LV.length}판 · ${LV[s.lv].title}`, R(0.03), hb * 0.5);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
  const hearts = '♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts));
  ctx.fillText(hearts, w - R(0.03), hb * 0.5);
  const hw = ctx.measureText(hearts).width;
  ctx.fillStyle = '#ffe14d';
  ctx.fillText(`★${s.stars}`, w - R(0.05) - hw, hb * 0.5);
  // ── 예보 띠: 날아올 탄 차례대로 (위력) ──
  const fy = hb + R(0.008), fh = R(0.07);
  ctx.fillStyle = 'rgba(42,35,64,.62)';
  ctx.fillRect(0, fy, w, fh);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('예보', R(0.03), fy + fh / 2);
  let cx = R(0.13);
  L.shots.forEach((sh, n) => {
    const done = s.phase === 'siege' || s.phase === 'result' ? n < wd.next - (wd.p ? 1 : 0) : false, cur = s.phase === 'siege' && (wd.p ? wd.p.n === n : wd.next === n);
    const cw = R(0.135);
    ctx.globalAlpha = done ? 0.4 : 1;
    ctx.fillStyle = cur ? 'rgba(255,225,77,.3)' : 'rgba(255,255,255,.1)';
    rr(ctx, cx, fy + R(0.008), cw, fh - R(0.016), R(0.02));
    ctx.fill();
    ctx.strokeStyle = AMMO_COL[sh.k];
    ctx.lineWidth = cur ? 2.5 : 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${R(0.032)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(String(n + 1), cx + R(0.012), fy + fh / 2);
    ammo(ctx, sh.k, cx + R(0.055), fy + fh / 2, R(0.017), 0, t);
    ctx.fillStyle = AMMO_COL[sh.k];
    ctx.font = `900 ${R(0.034)}px system-ui, sans-serif`;
    ctx.fillText(sh.k === 'water' ? '💧' : String(AM[sh.k].dmg), cx + R(0.088), fy + fh / 2);
    ctx.globalAlpha = 1;
    cx += cw + R(0.012);
  });
  if (L.wind) {
    ctx.fillStyle = '#dff6ff';
    ctx.font = `900 ${R(0.034)}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('바람 ←', w - R(0.03), fy + fh / 2);
  }
  // ── 아래 판: 다음 블록 · ▶ 버티기 ──
  const py = R(1.012);
  const tg = ctx.createLinearGradient(0, py, 0, h);
  tg.addColorStop(0, '#6e4a2e');
  tg.addColorStop(1, '#4a301c');
  ctx.fillStyle = tg;
  ctx.fillRect(0, py, w, h - py);
  ctx.fillStyle = 'rgba(255,220,170,.18)';
  ctx.fillRect(0, py, w, 2);
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.lineWidth = 1;
  for (const q of [0.2, 0.27]) (ctx.beginPath(), ctx.moveTo(0, py + R(q)), ctx.lineTo(w, py + R(q)), ctx.stroke());
  const building = s.phase === 'intro' || s.phase === 'build';
  const left = L.pieces.length - s.q;
  if (s.q < L.pieces.length) {
    const k = L.pieces[s.q], z = R(0.095), bx = R(0.045), by = py + R(0.045);
    ctx.globalAlpha = building ? 1 : 0.45;
    if (building) {
      ctx.fillStyle = 'rgba(255,240,180,.22)';
      rr(ctx, bx - R(0.018), by - R(0.03), z + R(0.06), z + R(0.05), R(0.02));
      ctx.fill();
    }
    cube(ctx, k, bx, by - (building ? Math.abs(Math.sin(t * 0.1)) * R(0.006) : 0), z, 1, 99, 0);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
    ctx.fillText(BNAME[k], bx + z + R(0.05), by + R(0.018));
    ctx.fillStyle = '#ffe9c8';
    ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
    ctx.fillText(BTIP[k], bx + z + R(0.05), by + R(0.068));
    // 그 다음 블록들
    const rest = L.pieces.slice(s.q + 1);
    let nx = bx + z + R(0.05);
    const nz = R(0.04);
    ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
    ctx.fillStyle = '#d9c2a5';
    if (rest.length) ctx.fillText('다음', nx, by + R(0.118));
    nx += R(0.085);
    for (const k2 of rest.slice(0, 5)) {
      cube(ctx, k2, nx, by + R(0.098), nz, 1, 98, 0);
      nx += nz + R(0.02);
    }
    if (rest.length > 5) (ctx.fillStyle = '#ffffff'), ctx.fillText(`+${rest.length - 5}`, nx, by + R(0.118));
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#ffe9c8';
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('블록을 다 놓았어요', R(0.05), py + R(0.08));
  }
  // ▶ 버티기 단추
  {
    const bx = X(BTN.x), by = Y(BTN.y), bw = R(BTN.w), bh = R(BTN.h), on = building;
    const pulse = on && s.q > 0 ? 1 + 0.03 * Math.sin(t * 0.15) : 1;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = on ? '#3a2a14' : 'rgba(0,0,0,.25)';
    rr(ctx, -bw / 2, -bh / 2 + R(0.008), bw, bh, R(0.03));
    ctx.fill();
    ctx.fillStyle = on ? '#ffcf4a' : '#8a7660';
    rr(ctx, -bw / 2, -bh / 2, bw, bh, R(0.03));
    ctx.fill();
    ctx.fillStyle = on ? '#3a2410' : '#d9c8b0';
    ctx.textAlign = 'center';
    ctx.font = `900 ${R(0.048)}px system-ui, sans-serif`;
    ctx.fillText(on ? '▶ 버티기' : s.phase === 'siege' ? '버티는 중…' : '', 0, -R(0.018));
    ctx.font = `800 ${R(0.034)}px system-ui, sans-serif`;
    ctx.fillText(on ? (left > 0 ? `남기면 ★ (${left}개)` : '') : `남긴 블록 ${left}`, 0, R(0.032));
    ctx.restore();
  }
  // 맨 아래 한 줄
  {
    let msg = '';
    if (building && s.lv === 0 && s.taps === 0) msg = '👆 줄을 톡! 블록이 떨어져 쌓여요';
    else if (building) msg = '점선 = 날아올 길 · ✕ = 처음 맞을 곳';
    else if (s.phase === 'siege') msg = `🏴‍☠️ 공격 ${Math.min(wd.next, wd.shots.length)}/${wd.shots.length} · 집 체력 ${wd.hhp}/${HOUSE_HP}`;
    ctx.fillStyle = '#fff6e6';
    ctx.font = `800 ${R(0.037)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(msg, R(0.035), h - R(0.03), w - R(0.07));
  }
  // ── 첫 안내 (첫 판, 아직 안 놓았을 때) ──
  if (s.lv === 0 && s.taps === 0 && (s.phase === 'build' || (s.phase === 'intro' && s.pt > 60))) {
    const tx = '👆 줄을 톡 = 블록 쌓기', a = 0.75 + 0.25 * Math.sin(t / 8);
    ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const tw = ctx.measureText(tx).width + R(0.05);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(42,35,64,.82)';
    rr(ctx, X(0.36) - tw / 2, Y(0.3) - R(0.038), tw, R(0.076), R(0.035));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, X(0.36), Y(0.3));
    ctx.globalAlpha = 1;
    // 집 앞 줄을 가리키는 손가락
    const c = wd.hc + 1, bob = Math.sin(t / 6) * R(0.012);
    ctx.font = `${R(0.06)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👇', X(X0 + (c + 0.5) * CW), Y(Y0 + (ROWS - 2.3) * CH) + bob);
  }
  // ── 판 카드: 시작(예보) · 결과 ──
  {
    let head = '', sub = '', sub2 = '', col = '#ffffff', a = 1, sc = 1;
    if (s.phase === 'intro' && !(s.lv === 0 && s.pt > 60)) {
      const cnt = new Map<Ammo, number>();
      for (const sh of L.shots) cnt.set(sh.k, (cnt.get(sh.k) ?? 0) + 1);
      head = s.tries ? `${s.lv + 1}판 다시 짓기` : `${s.lv + 1}판 · ${LV[s.lv].title}`;
      sub = [...cnt].map(([k, n]) => `${AM[k].name} ×${n}`).join(' · ') + ' 날아와요';
      sub2 = s.tries ? '같은 탄이 같은 길로 와요' : `✨ ${LV[s.lv].news[0][1]}`;
      col = '#ffe14d';
      a = Math.min(1, ((s.lv === 0 ? 60 : INTRO) - s.pt) / 15);
      sc = Math.min(1, 0.7 + s.pt / 15);
    } else if (s.phase === 'result') {
      sc = Math.min(1, 0.6 + s.pt / 12);
      if (s.ok) {
        head = s.won ? '블록성 완성! 🏰' : '버텼다!';
        sub = `${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}${wd.bonks ? `  되받아치기 ×${wd.bonks}` : ''}`;
        sub2 = `${'✔'} 버팀  ${s.got >= 2 ? '✔' : '✘'} 집 무사  ${s.got >= 3 ? '✔' : '✘'} 블록 남김`;
        col = '#ffe14d';
      } else {
        head = '와르르…';
        sub = s.hearts > 0 ? `하트 -1 · ${s.lv + 1}판을 다시 지어요` : '햄스터가 이사 가요…';
        sub2 = '같은 탄이 같은 길로 와요';
        col = '#ffb3a8';
      }
    }
    if (head) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(w / 2, Y(0.27));
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(42,35,64,.9)';
      rr(ctx, -R(0.44), -R(0.085), R(0.88), R(0.19), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      ctx.font = `900 ${R(0.054)}px system-ui, sans-serif`;
      ctx.fillText(head, 0, -R(0.042), R(0.84));
      ctx.fillStyle = s.phase === 'result' && s.ok ? '#ffe14d' : '#fffaf0';
      ctx.font = `900 ${R(s.phase === 'result' && s.ok ? 0.05 : 0.038)}px system-ui, sans-serif`;
      ctx.fillText(sub, 0, R(0.012), R(0.84));
      ctx.fillStyle = '#d9cff0';
      ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
      ctx.fillText(sub2, 0, R(0.064), R(0.84));
      ctx.restore();
    }
  }
  // ── 새것 알림 ──
  if (s.news && s.t - s.news.t < 300 && s.phase !== 'result' && s.phase !== 'intro') {
    const ag = s.t - s.news.t, a = Math.min(1, ag / 10, (300 - ag) / 20);
    ctx.globalAlpha = a;
    ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`, tw = Math.min(w - 12, ctx.measureText(tx).width + R(0.05)), by = R(0.205);
    ctx.fillStyle = 'rgba(42,35,64,.88)';
    rr(ctx, w / 2 - tw / 2, by - R(0.03), tw, R(0.06), R(0.03));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by, w - 24);
    ctx.globalAlpha = 1;
  }
  if (s.dead) {
    ctx.fillStyle = 'rgba(20,15,35,.35)';
    ctx.fillRect(0, 0, w, h);
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 데나, 아무 때나 톡 */
export const fortressRandom: Bot<FortState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 20 + Math.floor(rng() * 60);
    if (s.t < next) return { tap: false, dir: 0, pointer: null };
    dumbAt.set(s, s.t + 30 + Math.floor(rng() * 110));
    return { tap: false, dir: 0, pointer: { x: rng(), y: rng() } };
  },
};

/** 지은 성을 버티기 끝까지 시뮬레이션해 값을 매긴다 (집은 안 무너지게 두고 받은 피해를 센다 — 덜 지은 성끼리도 비교되게) */
function value(w0: World, left: number): number {
  const w = cloneWorld(w0);
  w.god = true;
  w.cd = 1;
  for (let t = 0; t < 4000 && !w.done; t++) wStep(w);
  const ok = w.taken < HOUSE_HP;
  // 덜 지은 성끼리 가르는 작은 값: 예보 궤적이 집에서 먼 블록에 먼저 닿을수록 좋다
  let shape = 0;
  for (const sh of w0.shots) {
    const f = forecast(w0, sh);
    if (f.code >= 0 && isBlock(w0.kind[f.code])) shape += 6 + 4 * Math.min(3, Math.max(Math.abs((f.code % COLS) - w0.hc), Math.abs(Math.floor(f.code / COLS) - w0.hr)));
  }
  return (ok ? 1000 : 0) - w.taken * 120 + (ok && w.taken === 0 && left > 0 ? 260 : 0) + w.bonks * 45 - w.broke * 3 + left * 4 + shape;
}

/** 다음 블록부터 끝까지, 줄 하나씩 넣어 보며 좋은 성 몇 개만 남기는 빔 탐색. 덜 쓰고 멈추는 쪽(▶)도 후보다 */
export function plan(L: Level): number[] {
  const P = L.pieces.length, base = newWorld(L);
  let beam: { cols: number[]; w: World }[] = [{ cols: [], w: base }];
  let best = { cols: [] as number[], v: value(base, P) };
  for (let d = 0; d < P; d++) {
    const cand: { cols: number[]; w: World; v: number }[] = [], keys = new Set<string>();
    for (const b of beam)
      for (let c = 0; c < COLS; c++) {
        const w2 = cloneWorld(b.w);
        if (placeIn(w2, c, L.pieces[d]) === -1) continue;
        const key = `${w2.kind.join('')}`;
        if (keys.has(key)) continue;
        keys.add(key);
        cand.push({ cols: [...b.cols, c], w: w2, v: value(w2, P - d - 1) });
      }
    if (!cand.length) break;
    cand.sort((a, b) => b.v - a.v);
    if (cand[0].v > best.v) best = { cols: cand[0].cols, v: cand[0].v };
    beam = cand.slice(0, 10);
  }
  return best.cols;
}

const plans = new WeakMap<object, { key: string; cols: number[]; i: number }>();
/** 봇: 블록마다 일곱 줄을 다 넣어 보고 버티기를 끝까지 돌려 보는 건축가 — 무사하고, 블록을 남기고, 되받아치기까지 */
export const fortressSmart: Bot<FortState> = {
  name: '햄스터 건축가',
  act(s) {
    const no = { tap: false, dir: 0 as const, pointer: null };
    if ((s.phase !== 'build' && s.phase !== 'intro') || s.down) return no;
    const key = `${s.lv}:${s.tries}`;
    let m = plans.get(s);
    if (!m || m.key !== key) plans.set(s, (m = { key, cols: plan(s.L), i: 0 }));
    if (s.phase === 'intro' && s.pt < 30) return no;
    if (m.i < m.cols.length) {
      const c = m.cols[m.i++];
      return { tap: false, dir: 0, pointer: { x: X0 + (c + 0.5) * CW, y: (Y0 + 1.5 * CH) / A } };
    }
    return { tap: false, dir: 0, pointer: { x: BTN.x + BTN.w / 2, y: (BTN.y + BTN.h / 2) / A } };
  },
};
