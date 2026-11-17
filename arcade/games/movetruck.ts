/**
 * 이사 트럭 짐 싣기 (29라운드: 한눈에 아는 놀이 × 진짜 물리) — 짐 싣기 × 덜컹 출발 × 가리키기.
 * 뼈대(짐 싣기): 옆에서 본 트럭 짐칸과 집 앞에 줄 선 짐(지금 + 다음 3개가 보임). 짐칸 위 가로 자리를 꾹 누르고 있으면
 *   맨 앞 짐이 떨어져 쌓일 자리(고스트)와 헐거워질 짐(노란 '흔들')이 보이고, 떼면 툭 떨어져 쌓인다. 판마다 짐 5~9개(연타 없음).
 *   키보드는 화살표 커서 + 스페이스(누르는 동안 미리 보기, 떼면 툭).
 * 물리(결정적, 고정 간격, 난수 없음): 짐은 직사각형·원(공·고양이)·ㄴ자(소파)·말랑한 이불(이어진 기둥 6개)이다.
 *   떨어지면 쌓이고, 무게중심이 받침 밖으로 나가면 미끄러져 내려가고, 공은 굴러간다(위치·속도가 연속으로 움직인다).
 * 와우(덜컹 출발): 다 실으면 트럭이 부릉 출발하고 과속방지턱마다 앞바퀴·뒷바퀴가 짐칸을 차올린다. 짐마다 튀는 세기 =
 *   높이(높을수록 크게) × 끼임(양옆이 꽉 막히면 작게) × 누름(위에 얹힌 무게가 클수록 작게) × 이불(받치거나 덮으면 작게)
 *   × 자리(뒷바퀴 쪽일수록 크게). 튄 짐은 공중에서 뒤로 밀리고, 뒤 난간보다 높이 뜬 짐은 난간 너머 길에 떨어진다.
 *   깨지는 짐(화분·그릇)은 세게 떨어지면 깨지고, 무거운 짐(냉장고·세탁기·책) 밑에 깔린 상자는 찌그러진다.
 * 판 8개: 목표 = 짐을 다 싣고 출발해 새 집까지. 별(쉬운 말) = 모두 싣고 출발 · 하나도 안 떨어뜨리기(2판부터) · 깨진 것 없이(3판부터).
 *   실패(잃은 짐이 판마다 정한 수 이상) = 하트 -1, 그 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1 상자(쌓기·덜컹) → 2 냉장고(무거움: 바닥 자리를 남겨 두기) → 3 화분(깨짐: 위를 비우고 꽉 끼우기)
 *   → 4 공(굴러감: 틈에 가두기) → 5 이불(말랑: 헐거운 짐을 덮어 누르기) → 6 소파(ㄴ자: 앉는 자리 빈 곳 채우기)
 *   → 7 고양이(가장 높은 곳에서 잠: 꼭대기를 단단하게) → 8 울퉁불퉁 길(턱 다섯 개 + 다 섞임).
 * 웃음: 기사 아저씨가 짐이 뜨면 눈이 동그래지고 떨어지면 '어이쿠!', 떨어진 소파엔 쫓아오던 이웃 강아지가 올라앉아 버리고,
 *   킥보드 탄 아이가 떨어진 짐을 쫓아온다. 고양이는 흔들리면 '냐악!' 하고 뛰어내린다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;

// ───────────────────────────── 물리 상수 (짐칸 단위: 가로 0~BW, 위로 +) ─────────────────────────────
const SUB = 2, ITERS = 6;
const G = 0.0105;
/** 짐칸 폭 · 뒤 난간 높이 · 앞 벽 높이 */
export const BW = 6, HT = 1.15, HF = 3.7;
const SLOP = 0.003, GAP = 0.06, SOFTGAP = 0.5;
/** 떨어뜨리는 높이(쌓인 곳 위로) */
const DROP_H = 0.7;
/** 턱에서 차오르는 세기(위·뒤) */
const KV = 0.09, KH = 0.025;
/** 깨지는 짐이 견디는 부딪힘 속도 · 무거운 짐 무게 · 고양이가 깨는 흔들림 */
const BREAK_V = 0.15, HEAVY_M = 4, CAT_WAKE = 0.62;
const CALM_V = 0.0012, CALM_N = 8, SETTLE_MAX = 200;
const DRAPE = 0.45, BLK = 8, WAKE_V = 0.03;
/** 덜컹 길: 첫 턱 · 턱 사이 · 앞바퀴→뒷바퀴 · 마지막 턱 뒤 */
const RT0 = 60, RGAP = 62, RWB = 22, RTAIL = 85;

// ───────────────────────────── 짐 ─────────────────────────────
export type Kind = 'box' | 'heavy' | 'pot' | 'dish' | 'ball' | 'blanket' | 'sofa' | 'cat';
export interface Item { kind: Kind; w: number; h: number; m: number; look: string; tag: string; flip: boolean; name: string }
const MAT: Record<Kind, { e: number; mu: number; base: number }> = {
  box: { e: 0.08, mu: 0.6, base: 1 },
  heavy: { e: 0.02, mu: 0.7, base: 0.3 },
  pot: { e: 0.05, mu: 0.6, base: 1 },
  dish: { e: 0.06, mu: 0.6, base: 1 },
  ball: { e: 0.55, mu: 0.08, base: 1.4 },
  blanket: { e: 0, mu: 0.9, base: 0.25 },
  sofa: { e: 0.05, mu: 0.7, base: 0.6 },
  cat: { e: 0.1, mu: 0.8, base: 1.2 },
};
const BOX_SIZES = [
  [1.0, 0.8, 1],
  [1.3, 1.0, 1.4],
  [1.6, 0.7, 1.4],
  [0.9, 1.15, 1.2],
  [1.2, 0.9, 1.2],
  [1.1, 1.1, 1.3],
];
const TAGS = ['👕', '🧸', '🍳', '🎮', '👟', '🧦', '🎨', '🎵'];
const CAT: Item = { kind: 'cat', w: 0.56, h: 0.56, m: 0.5, look: 'cat', tag: '', flip: false, name: '고양이' };

function itemOf(code: string, r: Rng): Item {
  const base = { tag: '', flip: false };
  switch (code) {
    case 'F': return { ...base, kind: 'heavy', w: 1.1, h: 2.0, m: 6, look: 'fridge', name: '냉장고' };
    case 'W': return { ...base, kind: 'heavy', w: 1.25, h: 1.25, m: 5, look: 'washer', name: '세탁기' };
    case 'K': return { ...base, kind: 'heavy', w: 1.0, h: 0.75, m: 4, look: 'books', name: '책 상자' };
    case 'P': return { ...base, kind: 'pot', w: 0.8, h: 1.05, m: 0.8, look: 'pot', name: '화분' };
    case 'D': return { ...base, kind: 'dish', w: 1.2, h: 0.7, m: 1, look: 'dish', name: '그릇 상자' };
    case 'O': return { ...base, kind: 'ball', w: 0.7, h: 0.7, m: 0.3, look: 'ball', name: '공' };
    case 'L': return { ...base, kind: 'blanket', w: 2.4, h: 0.32, m: 0.6, look: 'blanket', name: '이불' };
    case 'S': return { ...base, kind: 'sofa', w: 2.5, h: 1.15, m: 3, look: 'sofa', name: '소파', flip: r() < 0.5 };
    default: {
      const [w, h, m] = BOX_SIZES[Math.floor(r() * BOX_SIZES.length)];
      return { kind: 'box', w, h, m, look: 'box', tag: TAGS[Math.floor(r() * TAGS.length)], flip: false, name: '상자' };
    }
  }
}

// ───────────────────────────── 판 ─────────────────────────────
export interface StageDef { key: string; name: string; emoji: string; news: string; spot: string; tip: string; items: string; bumps: number; S: number; failN: number; nstar: number; cat?: boolean }
export const STAGES: StageDef[] = [
  { key: 'box', name: '첫 이사', emoji: '📦', news: '👆 짐칸을 꾹 누르면 놓일 자리, 떼면 툭!', spot: '', tip: '다 실으면 부릉 출발 — 턱에서 덜컹!', items: 'bbbbb', bumps: 2, S: 0.85, failN: 4, nstar: 1 },
  { key: 'heavy', name: '냉장고', emoji: '🧊', news: '🧊 냉장고는 무거워요 — 상자 위에 놓으면 상자가 찌그러져요', spot: '🧊 무거워요 — 바닥에 놓을 자리를 남겨요', tip: '냉장고 자리는 바닥에 남겨 둬요', items: 'bbbFbb', bumps: 2, S: 0.95, failN: 3, nstar: 2 },
  { key: 'pot', name: '화분', emoji: '🪴', news: '🪴 화분은 깨져요 — 위에 짐을 얹거나 세게 튀면 와장창', spot: '🪴 깨져요 — 위에 아무것도 얹지 마요', tip: '화분은 꽉 끼우고 위는 비워요', items: 'bPbWbbb', bumps: 3, S: 1.0, failN: 2, nstar: 3 },
  { key: 'ball', name: '공', emoji: '⚽', news: '⚽ 공은 데굴데굴, 통통 잘 튀어요 — 틈에 쏙 가둬요', spot: '⚽ 굴러가요 — 짐 사이 틈에 가둬요', tip: '공은 짐 사이 틈에 가둬요', items: 'bbbObKbb', bumps: 3, S: 1.0, failN: 2, nstar: 3 },
  { key: 'blanket', name: '이불', emoji: '🛏️', news: '🛏️ 이불은 말랑 — 덮거나 받친 짐은 덜 튀어요', spot: '🛏️ 말랑해요 — 헐거운 짐 위에 덮어요', tip: '헐거운 짐 위에 이불을 덮어요', items: 'bbPbLbbb', bumps: 3, S: 1.05, failN: 2, nstar: 3 },
  { key: 'sofa', name: '소파', emoji: '🛋️', news: '🛋️ 소파는 ㄴ자 — 앉는 자리 빈 곳에 짐을 끼워요', spot: '🛋️ ㄴ자예요 — 앉는 자리를 채워요', tip: '소파 앉는 자리에 짐을 끼워요', items: 'SbbDbbO', bumps: 3, S: 1.05, failN: 2, nstar: 3 },
  { key: 'cat', name: '고양이', emoji: '🐈', news: '🐈 출발하면 고양이가 가장 높은 짐 위에서 자요 — 흔들리면 뛰어내려요', spot: '🐈 가장 높은 곳에서 자요 — 꼭대기를 단단히', tip: '가장 높은 곳이 고양이 자리예요', items: 'bFbbLbPb', bumps: 3, S: 1.05, failN: 2, nstar: 3, cat: true },
  { key: 'road', name: '울퉁불퉁 길', emoji: '🚧', news: '🚧 과속방지턱이 다섯 개! 더 꽉 끼워요', spot: '🚧 턱이 다섯 개예요', tip: '뒤쪽 높은 곳은 비워요 — 턱이 많아요', items: 'bWbPbLbOb', bumps: 5, S: 1.1, failN: 2, nstar: 3 },
];
export const STAGE_COUNT = STAGES.length;
export const STAR_TEXT = ['모두 싣고 출발', '하나도 안 떨어뜨리기', '깨진 것 없이'];

function buildItems(seed: number, stage: number): Item[] {
  const r = mulberry32((seed * 31 + stage * 7919 + 11) >>> 0);
  const codes = STAGES[stage].items.split('');
  // 특별한 짐은 판마다 한 칸 앞뒤로 흔든다 (첫 짐은 그대로)
  for (let i = 1; i < codes.length; i++)
    if (codes[i] !== 'b' && r() < 0.5) {
      const j = i + (r() < 0.5 ? -1 : 1);
      if (j > 0 && j < codes.length && codes[j] === 'b') [codes[i], codes[j]] = [codes[j], codes[i]];
    }
  return codes.map((c) => itemOf(c, r));
}

// ───────────────────────────── 물체 ─────────────────────────────
interface Part { dx: number; dy: number; hw: number; hh: number }
export interface Body {
  id: number; it: number; kind: Kind;
  x: number; y: number; vx: number; vy: number; px: number; py: number;
  hw: number; hh: number; r: number; parts: Part[]; cx: number;
  m: number; im: number; e: number; mu: number;
  grp: number; off: number;
  out: boolean; broken: boolean; dead: boolean;
  tip: number; sups: number[]; supL: number; supR: number; sl: number; sr: number; soft: boolean; cover: boolean;
  hit: number; hitSoft: boolean; ck: number; pk: number; air: number; wake: boolean; f: number;
  /** 잠듦: 고요해진 짐은 깨울 때까지 꼼짝 않는다(받침 노릇만) */
  zz: boolean;
}
interface PEv { k: string; id: number; x: number; y: number; v: number }
export interface World { b: Body[]; n: number; ax: number; calm: boolean; still: number; age: number; ev: PEv[] | null }

const newWorld = (): World => ({ b: [], n: 0, ax: 0, calm: true, still: 0, age: 0, ev: null });
export function cloneW(W: World): World {
  return { ...W, ev: null, b: W.b.map((b) => ({ ...b, sups: b.sups.slice() })) };
}
function live(W: World) {
  const out: Body[] = [];
  for (const b of W.b) if (!b.dead) out.push(b);
  return out;
}

function addItem(W: World, it: Item, idx: number, x: number, y: number) {
  const mk = (o: Partial<Body>): Body => ({
    id: W.n++, it: idx, kind: it.kind, x, y, vx: 0, vy: 0, px: x, py: y, hw: it.w / 2, hh: it.h / 2, r: 0, parts: [], cx: 0,
    m: it.m, im: 1 / it.m, e: MAT[it.kind].e, mu: MAT[it.kind].mu, grp: -1, off: 0, out: false, broken: false, dead: false,
    tip: 0, sups: [], supL: 0, supR: 0, sl: 0, sr: 0, soft: false, cover: false, hit: 0, hitSoft: false, ck: 0, pk: 0, air: 0, wake: false, f: 0, zz: false, ...o,
  });
  if (it.kind === 'ball' || it.kind === 'cat') return void W.b.push(mk({ r: it.w / 2 }));
  if (it.kind === 'blanket') {
    const cw = it.w / BLK;
    for (let k = 0; k < BLK; k++) {
      const off = (k - (BLK - 1) / 2) * cw;
      W.b.push(mk({ x: x + off, px: x + off, hw: cw / 2, parts: [{ dx: 0, dy: 0, hw: cw / 2, hh: it.h / 2 }], m: it.m / BLK, im: BLK / it.m, grp: idx, off }));
    }
    return;
  }
  if (it.kind === 'sofa') {
    const H = it.h, hw = it.w / 2, bh = H * 0.48, bw = 0.42, sd = it.flip ? 1 : -1;
    const base: Part = { dx: 0, dy: -H / 2 + bh / 2, hw, hh: bh / 2 };
    const back: Part = { dx: sd * (hw - bw / 2), dy: -H / 2 + bh + (H - bh) / 2, hw: bw / 2, hh: (H - bh) / 2 };
    const a1 = 2 * hw * bh, a2 = bw * (H - bh);
    return void W.b.push(mk({ parts: [base, back], cx: (a2 * back.dx) / (a1 + a2) }));
  }
  W.b.push(mk({ parts: [{ dx: 0, dy: 0, hw: it.w / 2, hh: it.h / 2 }] }));
}

/** 바닥 · 뒤 난간 · 앞 벽 (절대 좌표 가운데 + 반폭) */
const WALLS: Part[] = [
  { dx: BW / 2, dy: -0.25, hw: BW / 2 + 0.16, hh: 0.25 },
  { dx: -0.08, dy: (HT - 0.6) / 2, hw: 0.08, hh: (HT + 0.6) / 2 },
  { dx: BW + 0.09, dy: (HF - 0.6) / 2, hw: 0.09, hh: (HF + 0.6) / 2 },
];

interface C { nx: number; ny: number; d: number }
/** 닿음 하나 (나눠 쓰는 그릇 — 매 틱 새로 만들지 않는다) */
const CT: C = { nx: 0, ny: 0, d: 0 };
const setC = (nx: number, ny: number, d: number) => ((CT.nx = nx), (CT.ny = ny), (CT.d = d), true);
function rr(ax: number, ay: number, ahw: number, ahh: number, bx: number, by: number, bhw: number, bhh: number, pax: number, pay: number, pbx: number, pby: number): boolean {
  const dx = bx - ax, dy = by - ay, ox = ahw + bhw - Math.abs(dx), oy = ahh + bhh - Math.abs(dy);
  if (ox <= 0 || oy <= 0) return false;
  const pox = ahw + bhw - Math.abs(pbx - pax), poy = ahh + bhh - Math.abs(pby - pay);
  if (poy <= 0.002 && pox > 0.002) return setC(0, dy >= 0 ? 1 : -1, oy);
  if (pox <= 0.002 && poy > 0.002) return setC(dx >= 0 ? 1 : -1, 0, ox);
  return ox < oy ? setC(dx >= 0 ? 1 : -1, 0, ox) : setC(0, dy >= 0 ? 1 : -1, oy);
}
/** 원(c)과 네모(r): 네모 → 원 쪽 법선 */
function cr(cx: number, cy: number, rad: number, rx: number, ry: number, hw: number, hh: number): boolean {
  const qx = Math.max(rx - hw, Math.min(rx + hw, cx)), qy = Math.max(ry - hh, Math.min(ry + hh, cy));
  const dx = cx - qx, dy = cy - qy, d2 = dx * dx + dy * dy;
  if (d2 >= rad * rad) return false;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    return setC(dx / d, dy / d, rad - d);
  }
  const ox = hw - Math.abs(cx - rx), oy = hh - Math.abs(cy - ry);
  return ox < oy ? setC(cx >= rx ? 1 : -1, 0, ox + rad) : setC(0, cy >= ry ? 1 : -1, oy + rad);
}

function resolve(Aa: Body | null, B: Body, c: C, first: boolean) {
  if ((Aa && Aa.zz) || B.zz) {
    const vn0 = (B.vx - (Aa ? Aa.vx : 0)) * c.nx + (B.vy - (Aa ? Aa.vy : 0)) * c.ny;
    if (-vn0 > WAKE_V || c.d > 0.02) {
      if (Aa) Aa.zz = false;
      B.zz = false;
    }
  }
  const ia = Aa && !Aa.zz ? Aa.im : 0, ib = B.zz ? 0 : B.im, sum = ia + ib;
  if (sum <= 0) return;
  const corr = (Math.max(0, c.d - SLOP) * 0.8) / sum;
  if (Aa) (Aa.x -= c.nx * corr * ia), (Aa.y -= c.ny * corr * ia);
  B.x += c.nx * corr * ib;
  B.y += c.ny * corr * ib;
  let rvx = B.vx - (Aa ? Aa.vx : 0), rvy = B.vy - (Aa ? Aa.vy : 0);
  const vn = rvx * c.nx + rvy * c.ny;
  if (vn >= 0) return;
  if (first) {
    if (-vn > B.hit) (B.hit = -vn), (B.hitSoft = !!Aa && Aa.kind === 'blanket');
    if (Aa && -vn > Aa.hit) (Aa.hit = -vn), (Aa.hitSoft = B.kind === 'blanket');
  }
  const e = first && -vn > 0.03 ? Math.max(Aa ? Aa.e : 0.1, B.e) : 0;
  const j = (-(1 + e) * vn) / sum;
  if (Aa) (Aa.vx -= c.nx * j * ia), (Aa.vy -= c.ny * j * ia);
  B.vx += c.nx * j * ib;
  B.vy += c.ny * j * ib;
  rvx = B.vx - (Aa ? Aa.vx : 0);
  rvy = B.vy - (Aa ? Aa.vy : 0);
  const tx = -c.ny, ty = c.nx, vt = rvx * tx + rvy * ty;
  let mu = Math.min(Aa ? Aa.mu : 0.7, B.mu);
  if ((c.ny > 0.5 && B.tip) || (c.ny < -0.5 && Aa && Aa.tip)) mu = 0.03;
  const jt = Math.max(-mu * j, Math.min(mu * j, -vt / sum));
  if (Aa) (Aa.vx -= tx * jt * ia), (Aa.vy -= ty * jt * ia);
  B.vx += tx * jt * ib;
  B.vy += ty * jt * ib;
}

function solveWalls(b: Body, first: boolean) {
  if (b.zz) return;
  for (const w of WALLS) {
    if (Math.abs(b.x - w.dx) > b.hw + w.hw + 0.02 || Math.abs(b.y - w.dy) > b.hh + w.hh + 0.02) continue;
    if (b.r) {
      if (cr(b.x, b.y, b.r, w.dx, w.dy, w.hw, w.hh)) resolve(null, b, CT, first);
    } else
      for (const p of b.parts) if (rr(w.dx, w.dy, w.hw, w.hh, b.x + p.dx, b.y + p.dy, p.hw, p.hh, w.dx, w.dy, b.px + p.dx, b.py + p.dy)) resolve(null, b, CT, first);
  }
}
function solvePair(a: Body, b: Body, first: boolean) {
  if (a.zz && b.zz) return;
  if (Math.abs(a.x - b.x) > a.hw + b.hw + 0.02 || Math.abs(a.y - b.y) > a.hh + b.hh + 0.02) return;
  if (a.r && b.r) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
    if (d < m && d > 1e-9 && setC(dx / d, dy / d, m - d)) resolve(a, b, CT, first);
  } else if (a.r) {
    for (const p of b.parts) if (cr(a.x, a.y, a.r, b.x + p.dx, b.y + p.dy, p.hw, p.hh)) resolve(b, a, CT, first);
  } else if (b.r) {
    for (const p of a.parts) if (cr(b.x, b.y, b.r, a.x + p.dx, a.y + p.dy, p.hw, p.hh)) resolve(a, b, CT, first);
  } else
    for (const pa of a.parts)
      for (const pb of b.parts)
        if (rr(a.x + pa.dx, a.y + pa.dy, pa.hw, pa.hh, b.x + pb.dx, b.y + pb.dy, pb.hw, pb.hh, a.px + pa.dx, a.py + pa.dy, b.px + pb.dx, b.py + pb.dy)) resolve(a, b, CT, first);
}

/** 이불: 기둥끼리 가로로는 한 몸, 세로로는 DRAPE까지만 늘어진다 (틈으로 처져 메운다) */
function blanketFix(bs: Body[]) {
  let groups: Map<number, Body[]> | null = null;
  for (const b of bs)
    if (b.grp >= 0) {
      groups ??= new Map();
      const g = groups.get(b.grp);
      if (g) g.push(b);
      else groups.set(b.grp, [b]);
    }
  if (!groups) return;
  for (const cols of groups.values()) {
    cols.sort((p, q) => p.off - q.off);
    let X = 0, VX = 0;
    for (const c of cols) (X += c.x - c.off), (VX += c.vx);
    X /= cols.length;
    VX /= cols.length;
    for (const c of cols) (c.x = X + c.off), (c.vx = VX);
    for (let pass = 0; pass < 2; pass++)
      for (let k = 0; k + 1 < cols.length; k++) {
        const p = cols[k], q = cols[k + 1], dy = q.y - p.y;
        if (Math.abs(dy) <= DRAPE) continue;
        const ex = ((Math.abs(dy) - DRAPE) / 2) * Math.sign(dy);
        p.y += ex;
        q.y -= ex;
        const vm = (p.vy + q.vy) / 2;
        p.vy = vm;
        q.vy = vm;
      }
  }
}

type Sh = { x: number; y: number; hw: number; hh: number };
function shapes(b: Body): Sh[] {
  if (b.r) return [{ x: b.x, y: b.y, hw: b.r * 0.55, hh: b.r }];
  const out: Sh[] = [];
  for (const p of b.parts) out.push({ x: b.x + p.dx, y: b.y + p.dy, hw: p.hw, hh: p.hh });
  return out;
}
const WALL_SH: Sh[] = WALLS.map((w) => ({ x: w.dx, y: w.dy, hw: w.hw, hh: w.hh }));

/** 닿음 살피기: 받침(아래)·양옆·이불 받침/덮음 · 미끄러짐 */
function senseOne(b: Body, o: Body | null, mine: Sh[], os: Sh[]) {
  for (let i = 0; i < mine.length; i++) {
    const p = mine[i];
    for (let j = 0; j < os.length; j++) {
      const q = os[j], pb = p.y - p.hh, qt = q.y + q.hh;
      const ox = Math.min(p.x + p.hw, q.x + q.hw) - Math.max(p.x - p.hw, q.x - q.hw);
      if (Math.abs(pb - qt) < GAP && ox > 0.01 && q.y < p.y) {
        const id = o ? o.id : -1;
        if (!b.sups.includes(id)) b.sups.push(id);
        b.supL = Math.min(b.supL, Math.max(p.x - p.hw, q.x - q.hw));
        b.supR = Math.max(b.supR, Math.min(p.x + p.hw, q.x + q.hw));
        if (o && o.kind === 'blanket' && b.kind !== 'blanket') b.soft = true;
        if (o && b.kind === 'blanket' && o.kind !== 'blanket') o.cover = true;
      }
      if (b.kind === 'blanket') continue;
      const oy = Math.min(p.y + p.hh, q.y + q.hh) - Math.max(p.y - p.hh, q.y - q.hh);
      if (oy < 0.6 * Math.min(p.hh, q.hh)) continue;
      const pr = b.r ? b.x + b.r : p.x + p.hw, pl = b.r ? b.x - b.r : p.x - p.hw;
      const gr = q.x - q.hw - pr, gl = pl - (q.x + q.hw);
      const lim = o && o.kind === 'blanket' ? SOFTGAP : GAP;
      if (gr > -0.05 && gr < lim && q.x > p.x) b.sr = 1;
      if (gl > -0.05 && gl < lim && q.x < p.x) b.sl = 1;
    }
  }
}
function sense(bs: Body[]) {
  const SH: Sh[][] = [];
  for (const b of bs) {
    b.sups = [];
    b.supL = 1e9;
    b.supR = -1e9;
    b.sl = b.sr = 0;
    b.soft = b.cover = false;
    SH.push(shapes(b));
  }
  for (let bi = 0; bi < bs.length; bi++) {
    const b = bs[bi];
    senseOne(b, null, SH[bi], WALL_SH);
    for (let oi = 0; oi < bs.length; oi++) {
      const o = bs[oi];
      if (o === b || (o.grp >= 0 && o.grp === b.grp)) continue;
      if (Math.abs(o.x - b.x) > o.hw + b.hw + SOFTGAP || Math.abs(o.y - b.y) > o.hh + b.hh + GAP) continue;
      senseOne(b, o, SH[bi], SH[oi]);
    }
  }
  let anyGrp = false;
  for (const b of bs) {
    b.air = b.sups.length ? 0 : b.air + 1;
    if (b.grp >= 0) anyGrp = true;
    if (b.r || b.grp >= 0) continue;
    b.tip = 0;
    if (!b.sups.length) continue;
    const com = b.x + b.cx;
    // 받침 밖으로 무게중심이 나가면 그쪽으로 미끄러진다 (그쪽 옆이 막혀 기대고 있으면 그대로)
    if (com < b.supL - 0.015 && !b.sl) b.tip = -1;
    else if (com > b.supR + 0.015 && !b.sr) b.tip = 1;
  }
  if (!anyGrp) return;
  const gs: number[] = [];
  for (const b of bs) if (b.grp >= 0 && !gs.includes(b.grp)) gs.push(b.grp);
  for (const g of gs) {
    let L = 1e9, R = -1e9, X = 0, n = 0;
    for (const c of bs) {
      if (c.grp !== g) continue;
      X += c.x;
      n++;
      if (c.sups.length) (L = Math.min(L, c.x - c.hw)), (R = Math.max(R, c.x + c.hw));
    }
    X /= n;
    const tip = L > R ? 0 : X < L - 0.015 ? -1 : X > R + 0.015 ? 1 : 0;
    for (const c of bs) if (c.grp === g) c.tip = tip;
  }
}

const wakeAll = (W: World) => {
  for (const b of W.b) b.zz = false;
  W.calm = false;
};
function shatter(W: World, b: Body) {
  if (b.broken) return;
  b.broken = true;
  b.dead = true;
  wakeAll(W);
  W.ev?.push({ k: 'break', id: b.id, x: b.x, y: b.y, v: 0 });
}
function crush(W: World, b: Body) {
  if (b.broken) return;
  if (b.kind !== 'box') return shatter(W, b);
  b.broken = true;
  wakeAll(W);
  const nh = b.hh * 0.45;
  b.y -= b.hh - nh;
  b.hh = nh;
  b.parts = [{ dx: 0, dy: 0, hw: b.hw, hh: nh }];
  W.ev?.push({ k: 'crush', id: b.id, x: b.x, y: b.y, v: 0 });
}

const byBottom = (p: Body, q: Body) => p.y - p.hh - (q.y - q.hh) || p.id - q.id;
/** 한 틱 (SUB번 나눠 움직이고 ITERS번 맞부딪힘을 푼다) */
export function phys(W: World) {
  const bs = live(W), x0: number[] = [], y0: number[] = [];
  for (const b of bs) (x0[b.id] = b.x), (y0[b.id] = b.y);
  for (const b of bs) (b.hit = 0), (b.hitSoft = false);
  for (const b of bs) if (b.grp >= 0 && !b.zz) for (const q of bs) if (q.grp === b.grp) q.zz = false;
  for (let s = 0; s < SUB; s++) {
    for (const b of bs) {
      if (b.zz) continue;
      b.px = b.x;
      b.py = b.y;
      b.vy -= G / SUB;
      b.vx += (W.ax + b.tip * G * 0.5) / SUB;
      b.x += b.vx / SUB;
      b.y += b.vy / SUB;
    }
    bs.sort(byBottom);
    for (let it = 0; it < ITERS; it++) {
      const first = it === 0;
      for (let i = 0; i < bs.length; i++) {
        const a = bs[i];
        solveWalls(a, first);
        for (let j = i + 1; j < bs.length; j++) {
          const b = bs[j];
          if (a.grp >= 0 && a.grp === b.grp) continue;
          solvePair(a, b, first);
        }
      }
    }
    blanketFix(bs);
  }
  sense(bs);
  // 공은 구르며 조금씩 느려진다
  for (const b of bs) if (b.r && b.sups.length) b.vx *= 0.985;
  // 떨어짐: 짐칸 밖으로 나가 바닥보다 내려가면
  for (const b of bs)
    if ((b.y < -0.9 && (b.x < -0.05 || b.x > BW + 0.05)) || b.y < -3)
      for (const o of bs)
        if ((o === b || (b.grp >= 0 && o.grp === b.grp)) && !o.out) (o.out = true), (o.dead = true), W.ev?.push({ k: 'out', id: o.id, x: o.x, y: o.y, v: o.vx });
  // 무거운 짐 밑의 상자는 찌그러지고, 화분 위에 짐이 얹히면 깨진다
  const byId = W.b, under = new Set<number>(), potLoad = new Map<number, number>();
  for (const h of bs) {
    if (h.dead) continue;
    for (const id of h.sups) {
      if (id < 0) continue;
      const s = byId[id];
      if (s.dead || s.broken) continue;
      if (h.m >= HEAVY_M && (s.kind === 'box' || s.kind === 'dish' || s.kind === 'pot')) under.add(id);
      if (s.kind === 'pot' && h.kind !== 'blanket' && h.kind !== 'cat') potLoad.set(id, (potLoad.get(id) ?? 0) + h.m / h.sups.length);
    }
  }
  for (const b of bs) {
    if (b.dead) continue;
    b.ck = under.has(b.id) ? b.ck + 1 : 0;
    b.pk = (potLoad.get(b.id) ?? 0) >= 0.6 ? b.pk + 1 : 0;
    if (b.ck >= 5) crush(W, b);
    else if (b.pk >= 6) shatter(W, b);
    else if ((b.kind === 'pot' || b.kind === 'dish') && b.hit > BREAK_V * (b.hitSoft ? 1.8 : 1) * (b.kind === 'dish' ? 1.15 : 1)) shatter(W, b);
    else if (b.hit > 0.06 && W.ev && b.air === 0) W.ev.push({ k: 'land', id: b.id, x: b.x, y: b.y - b.hh, v: b.hit });
  }
  // 고요해지면 멈춘다 (미리 보기와 실제가 똑같이 시작하게)
  let mv = 0;
  for (const b of bs) if (!b.dead) mv = Math.max(mv, Math.abs(b.x - x0[b.id]), Math.abs(b.y - y0[b.id]));
  W.still = mv < CALM_V ? W.still + 1 : 0;
  if (W.still >= CALM_N) calmDown(W);
}
function calmDown(W: World) {
  for (const b of W.b) if (!b.dead) (b.vx = 0), (b.vy = 0), (b.zz = true);
  W.calm = true;
}
/** 짐 싣는 동안의 한 틱 (게임·미리 보기·봇이 똑같이 쓴다) */
function loadTick(W: World) {
  phys(W);
  W.age++;
  if (!W.calm && W.age >= SETTLE_MAX) calmDown(W);
}
export function settle(W: World) {
  while (!W.calm) loadTick(W);
}

/** 이 가로 범위에서 가장 높이 쌓인 곳 */
function skyTop(W: World, x0: number, x1: number) {
  let top = 0;
  for (const b of W.b) if (!b.dead && b.x + b.hw > x0 && b.x - b.hw < x1) top = Math.max(top, b.y + b.hh);
  return top;
}
export const clampX = (it: Item, x: number) => Math.max(it.w / 2 + 0.005, Math.min(BW - it.w / 2 - 0.005, x));
export function dropItem(W: World, it: Item, idx: number, x: number) {
  x = clampX(it, x);
  addItem(W, it, idx, x, skyTop(W, x - it.w / 2, x + it.w / 2) + it.h / 2 + DROP_H);
  W.calm = false;
  W.still = 0;
  W.age = 0;
}
/** 고양이 자리: 가장 높은 곳 (같으면 운전석 쪽) */
export function catSpot(W: World) {
  let bx = BW - 0.4, bt = -1;
  for (let x = 0.35; x <= BW - 0.35 + 1e-9; x += 0.1) {
    const t = skyTop(W, x - 0.12, x + 0.12);
    if (t >= bt - 1e-6) (bt = t), (bx = x);
  }
  return { x: bx, y: bt };
}
function placeCat(W: World) {
  const p = catSpot(W);
  addItem(W, CAT, -1, p.x, p.y + CAT.h / 2 + 0.01);
  W.calm = false;
}

/** 위에 얹힌 무게 (받침이 여럿이면 나눠 진다) */
function loads(bs: Body[]): Map<number, number> {
  const L = new Map<number, number>();
  for (const b of [...bs].sort((p, q) => q.y - p.y || q.id - p.id)) {
    if (!b.sups.length) continue;
    const ids = b.sups.filter((id) => id >= 0);
    const share = (b.m + (L.get(b.id) ?? 0)) / b.sups.length;
    for (const id of ids) L.set(id, (L.get(id) ?? 0) + share);
  }
  return L;
}
/** 덜컹 세기: 높이 × 끼임 × 누름 × 이불 × 자리. wheel 0 = 뒷바퀴, 1 = 앞바퀴 */
export function looseOf(b: Body, wheel: number, load: number) {
  if (!b.sups.length) return 0;
  const hF = 1 + 0.6 * Math.max(0, b.y - b.hh);
  const sides = (b.sl ? 1 : 0) + (b.sr ? 1 : 0);
  const wF = sides === 2 ? 0.28 : sides === 1 ? 0.62 : 1;
  const lF = 1 / (1 + (0.9 * load) / b.m);
  const cF = b.soft ? 0.5 : b.cover ? 0.6 : 1;
  const xr = Math.max(0, Math.min(1, b.x / BW));
  const pF = wheel === 0 ? 0.5 + 0.7 * (1 - xr) : 0.35 + 0.35 * xr;
  return MAT[b.kind].base * hF * wF * lF * cF * pF;
}
function kick(W: World, wheel: number, S: number) {
  const bs = live(W), L = loads(bs);
  let top = 0;
  for (const b of bs) {
    const f = looseOf(b, wheel, L.get(b.id) ?? 0) * S;
    b.f = f;
    top = Math.max(top, f);
    b.vy += KV * f * (wheel ? 0.55 : 1);
    b.vx -= KH * f * (wheel ? 1 : 0.6);
    if (b.kind === 'cat' && f > CAT_WAKE && !b.wake) (b.wake = true), (b.vx -= 0.05), (b.vy += 0.06), W.ev?.push({ k: 'wake', id: b.id, x: b.x, y: b.y, v: f });
  }
  blanketFix(bs);
  W.calm = false;
  W.ev?.push({ k: wheel ? 'bumpF' : 'bumpR', id: -1, x: 0, y: 0, v: top });
}
export const rideEnd = (d: StageDef) => RT0 + (d.bumps - 1) * RGAP + RWB + RTAIL;
export const bumpAt = (k: number) => RT0 + k * RGAP;
/** 덜컹 길의 한 틱: 출발 가속 → 턱마다 앞바퀴·뒷바퀴 → 도착 감속 */
export function rideTick(W: World, rt: number, d: StageDef) {
  const end = rideEnd(d);
  let ax = 0;
  if (rt >= 18 && rt < 58) ax = -0.0011;
  for (let k = 0; k < d.bumps; k++) {
    const T = bumpAt(k);
    if (rt === T) kick(W, 1, d.S);
    if (rt === T + RWB) kick(W, 0, d.S);
    if (rt > T + RWB && rt < T + RWB + 22) ax = -0.0009;
  }
  if (rt >= end - 50 && rt < end - 20) ax = 0.0011;
  W.ax = ax;
  wakeAll(W);
  phys(W);
}

export interface Outcome { dropped: number; broken: number; cat: boolean; lostIt: Set<number>; brokeIt: Set<number> }
export function outcomeOf(W: World): Outcome {
  const lostIt = new Set<number>(), brokeIt = new Set<number>();
  let cat = false;
  for (const b of W.b) {
    if (b.kind === 'cat') {
      if (b.out) cat = true;
      continue;
    }
    if (b.out) lostIt.add(b.it);
    else if (b.broken) brokeIt.add(b.it);
  }
  for (const i of lostIt) brokeIt.delete(i);
  return { dropped: lostIt.size + (cat ? 1 : 0), broken: brokeIt.size, cat, lostIt, brokeIt };
}
/** 지금 그대로 출발하면? (덜컹 길을 끝까지 돌려 본다) */
export function predictRide(W0: World, d: StageDef, withCat: boolean, short = false): { o: Outcome; W: World } {
  const W = cloneW(W0);
  if (withCat) placeCat(W), settle(W);
  const end = short ? bumpAt(0) + RWB + 45 : rideEnd(d);
  for (let rt = 0; rt < end; rt++) rideTick(W, rt, d);
  W.ax = 0;
  W.still = 0;
  for (let k = 0; k < 80 && !W.calm; k++) phys(W);
  return { o: outcomeOf(W), W };
}

// ───────────────────────────── 화면 배치 (가로 0~1, 세로 0~A) ─────────────────────────────
/** 짐칸 0이 화면의 어디 · 짐칸 한 칸 = 화면 몇 · 짐칸 바닥 높이 · 위 띠 · 아래 띠 */
const BX0 = 0.065, U = 0.105, FY = 1.03, HB = 0.075, BAND = 1.3;
const INTRO_LOCK = 36, CHECK_T = 80, RESULT_OK = 210, RESULT_FAIL = 170, NEWS_T = 170, CARD_T = 150;
const STAR_PTS = 100, KEEP_PTS = 5, WIN_PTS = 300;
export const bedToScreen = (bx: number) => BX0 + bx * U;

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; bed?: boolean }
interface Debris { it: number; look: string; tag: string; kind: Kind; w: number; h: number; flip: boolean; wx: number; y: number; vx: number; vy: number; rot: number; vr: number; broken: boolean; hits: number }
export interface TruckState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'load' | 'check' | 'ride' | 'result'; pt: number;
  items: Item[]; next: number; W: World; rt: number; slow: number; tail: number;
  down: boolean; ax: number; ay: number; lastDrop: number; taps: number; firstTap: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  dropped: number; broken: number; catOff: boolean; again: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[]; startT: number;
  pred: Outcome | null; predW: World | null;
  // 연출(시뮬레이션 결과와 무관)
  dist: number; speed: number; zoom: number; yb: number; vb: number; pa: number; pv: number;
  debris: Debris[]; mood: string; moodT: number; dogX: number; dogSofa: number; kidX: number; catT: number;
}

const ev = (s: TruckState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, bed = false) => s.events.push({ t: s.t, kind, x, y, text, col, v, bed });
function see(s: TruckState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const setMood = (s: TruckState, m: string) => ((s.mood = m), (s.moodT = s.t));

function newStage(s: TruckState) {
  const d = STAGES[s.stage];
  s.items = buildItems(s.seed, s.stage);
  s.next = 0;
  s.W = newWorld();
  s.W.ev = [];
  s.phase = 'load';
  s.pt = 0;
  s.rt = 0;
  s.slow = 0;
  s.tail = 0;
  s.pred = null;
  s.predW = null;
  s.dropped = s.broken = 0;
  s.catOff = false;
  s.starOk = [false, false, false];
  s.got = 0;
  s.startT = s.t;
  s.lastDrop = s.t;
  s.dist = 0;
  s.speed = 0;
  s.zoom = 1;
  s.yb = s.vb = s.pa = s.pv = 0;
  s.debris = [];
  s.dogX = 0;
  s.dogSofa = -1;
  s.kidX = 0;
  s.catT = -999;
  setMood(s, 'idle');
  // 판의 새것은 시작 카드에 바로 보인다 (알림 띠에는 넣지 않는다)
  see(s, d.key, '');
}

/** 측정·미리 보기용: 이 판을 처음부터 */
export function jumpTo(s: TruckState, k: number) {
  s.stage = k;
  newStage(s);
}

const canDrop = (s: TruckState) => s.phase === 'load' && s.W.calm && s.pt >= INTRO_LOCK && s.next < s.items.length;
/** 화면 → 짐칸 가로 */
const toBed = (sx: number) => (sx - BX0) / U;

function tryDrop(s: TruckState) {
  if (!canDrop(s)) return;
  if (s.ay < HB || s.ay > BAND) return void ev(s, 'miss', 0.5, BAND - 0.05, '짐칸 위를 꾹 눌러요', '#fff3df');
  const it = s.items[s.next];
  dropItem(s.W, it, s.next, toBed(s.ax));
  s.next++;
  s.lastDrop = s.t;
  s.taps++;
  s.firstTap = true;
  if (it.kind === 'heavy') setMood(s, 'strain');
}

/** 물리 사건 → 화면 연출 */
function drain(s: TruckState) {
  const W = s.W, E = W.ev;
  if (!E || !E.length) return;
  for (const e of E) {
    const b = e.id >= 0 ? W.b[e.id] : null;
    if (e.k === 'land' && b) {
      if (b.grp >= 0 && b.off !== W.b.filter((q) => q.grp === b.grp)[0]?.off) continue;
      const big = e.v > 0.09 || b.m >= HEAVY_M;
      ev(s, 'land', e.x, e.y, big ? '쿵!' : '툭', big ? '#ffe2b0' : '#fff6e0', e.v, true);
      if (s.phase === 'load' && !b.wake) see(s, 'stack', '');
    } else if (e.k === 'crush' && b) {
      ev(s, 'crush', b.x, b.y, '와지끈! 찌그러졌어요', '#ffcf9e', 0, true);
      setMood(s, 'oops');
      see(s, 'crush', '🧊 무거운 짐 밑에 깔린 상자는 찌그러져요');
    } else if (e.k === 'break' && b) {
      ev(s, 'break', b.x, b.y, b.kind === 'pot' ? '와장창! 화분이…' : '와장창! 그릇이…', '#ffb3a8', 0, true);
      setMood(s, 'oops');
    } else if (e.k === 'out' && b) {
      if (b.grp >= 0 && W.b.some((q) => q.grp === b.grp && q.id < b.id)) continue;
      ev(s, 'out', Math.max(-0.4, b.x), Math.max(-0.6, b.y), b.kind === 'cat' ? '고양이가 뛰어내렸다!' : `앗! ${b.it >= 0 ? s.items[b.it].name : ''} 떨어졌다`, '#ffd0c8', 0, true);
      setMood(s, 'oops');
      addDebris(s, b, e.v);
      see(s, 'out', '');
    } else if (e.k === 'wake' && b) {
      ev(s, 'wake', b.x, b.y, '냐아악!', '#ffe0b0', 0, true);
      setMood(s, 'worry');
    } else if (e.k === 'bumpF' || e.k === 'bumpR') {
      s.vb += e.k === 'bumpR' ? 0.012 : 0.008;
      s.pv += e.k === 'bumpR' ? -0.02 : 0.025;
      ev(s, 'bump', e.k === 'bumpR' ? 0.2 : 0.84, 1.16, '덜컹!', '#fff1c4', e.v);
      if (e.v > 0.9) setMood(s, 'worry');
      see(s, 'ride', '');
    }
  }
  E.length = 0;
}

function addDebris(s: TruckState, b: Body, vx: number) {
  const it = b.it >= 0 ? s.items[b.it] : CAT;
  s.debris.push({ it: b.it, look: it.look, tag: it.tag, kind: it.kind, w: it.w, h: it.h, flip: it.flip, wx: s.dist + bedToScreen(Math.max(-0.4, b.x)), y: FY - b.y * U, vx: s.speed + vx * U, vy: 0.004, rot: 0, vr: -0.05 - Math.abs(vx) * 2, broken: b.broken, hits: 0 });
  if (it.kind === 'sofa') s.dogSofa = s.debris.length - 1;
}

function startCheck(s: TruckState) {
  const d = STAGES[s.stage];
  s.phase = 'check';
  s.pt = 0;
  if (d.cat) {
    placeCat(s.W);
    settle(s.W);
    s.catT = s.t;
    s.W.ev!.length = 0;
  }
  const p = predictRide(s.W, d, false);
  s.pred = p.o;
  s.predW = p.W;
  setMood(s, 'go');
}

function startRide(s: TruckState) {
  s.phase = 'ride';
  s.pt = 0;
  s.rt = 0;
  ev(s, 'go', 0.5, 0.9, '부릉!', '#ffffff');
}

/** 트럭이 달린 거리(화면 단위) · 속도: 앞바퀴→뒷바퀴가 RWB틱에 맞게 */
const WHEEL_F = 0.865, WHEEL_R = 0.22, VMAX = (WHEEL_F - WHEEL_R) / RWB;
function speedAt(rt: number, d: StageDef) {
  const end = rideEnd(d);
  if (rt < 40) return (VMAX * rt) / 40;
  if (rt > end - 50) return Math.max(0, (VMAX * (end - rt)) / 50);
  return VMAX;
}

function rideStep(s: TruckState) {
  const d = STAGES[s.stage], end = rideEnd(d);
  if (s.slow > 0) {
    s.slow--;
    if (s.slow % 2) return;
  }
  if (s.rt < end) {
    rideTick(s.W, s.rt, d);
    s.speed = speedAt(s.rt, d);
    s.dist += s.speed;
    s.rt++;
    // 크게 튀는 순간은 잠깐 느리게
    if (bumpAtRear(s.rt - 1, d) && s.W.b.some((b) => !b.dead && b.f > 1.0)) s.slow = 40;
  } else {
    s.speed = 0;
    s.W.ax = 0;
    if (!s.W.calm) phys(s.W);
    s.tail++;
    if (s.W.calm || s.tail > 80) finish(s);
  }
  drain(s);
}
const bumpAtRear = (rt: number, d: StageDef) => {
  for (let k = 0; k < d.bumps; k++) if (rt === bumpAt(k) + RWB) return true;
  return false;
};

function finish(s: TruckState) {
  const d = STAGES[s.stage], o = outcomeOf(s.W);
  s.dropped = o.dropped;
  s.broken = o.broken;
  s.catOff = o.cat;
  const lost = o.dropped + o.broken;
  s.phase = 'result';
  s.pt = 0;
  s.ok = lost < d.failN;
  if (s.ok) {
    s.starOk = [true, d.nstar >= 2 && o.dropped === 0, d.nstar >= 3 && o.broken === 0];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + (s.items.length - lost) * KEEP_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.7, s.won ? '이사 끝! 🏠' : '무사 도착!', '#fff1a8', s.got);
    setMood(s, lost ? 'phew' : 'happy');
  } else {
    s.hearts--;
    s.tries++;
    s.why = `짐을 ${lost}개나 잃었어요`;
    ev(s, 'fail', 0.5, 0.7, s.why, '#ffd0c8');
    setMood(s, 'sad');
  }
}

/** 연출용: 트럭 흔들림 · 떨어진 짐 굴러감 · 강아지 · 아이 · 카메라 */
function cosmetic(s: TruckState) {
  s.vb += -0.25 * s.yb - 0.18 * s.vb;
  s.yb += s.vb;
  s.pv += -0.22 * s.pa - 0.16 * s.pv;
  s.pa += s.pv;
  const zt = s.phase === 'ride' || (s.phase === 'result' && s.zoom < 1) ? 0.8 : 1;
  s.zoom += (zt - s.zoom) * 0.06;
  for (const g of s.debris) {
    if (g.hits > 6) {
      g.vx *= 0.9;
      g.wx += g.vx;
      continue;
    }
    g.vy += 0.0016;
    g.wx += g.vx;
    g.y += g.vy;
    g.rot += g.vr;
    const ground = ROAD_Y - g.h * U * 0.5;
    if (g.y > ground) {
      g.y = ground;
      g.vy *= -0.35;
      g.vx *= 0.8;
      g.vr *= 0.6;
      g.hits++;
      if (g.hits === 1) ev(s, 'thud', g.wx - s.dist, ROAD_Y, g.kind === 'pot' || g.kind === 'dish' ? '와장창' : '쿵', '#ffe2c8');
    }
  }
  if (s.phase === 'ride' || s.phase === 'result') {
    // 강아지는 트럭을 쫓아 달리다 떨어진 소파가 있으면 올라앉는다
    if (s.dogSofa >= 0 && s.debris[s.dogSofa]) {
      const g = s.debris[s.dogSofa], tx = g.wx - s.dist;
      s.dogX += (tx - s.dogX) * 0.12;
      if (Math.abs(tx - s.dogX) < 0.02 && (juiceMemo.get(s) ?? -1) !== g.it) juiceMemo.set(s, g.it), ev(s, 'dog', tx, ROAD_Y - 0.12, '멍! 내 소파!', '#fff3c4');
    } else s.dogX += (0.02 + 0.03 * Math.sin(s.t * 0.05) - s.dogX) * 0.08;
    const want = s.debris.length ? 0.06 : -0.15;
    s.kidX += (want - s.kidX) * 0.05;
  }
  if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'sad' || s.mood === 'happy' ? 400 : 80)) s.mood = s.phase === 'ride' ? 'go' : 'idle';
}
const juiceMemo = new WeakMap<object, number>();
const ROAD_Y = 1.19;

export const movetruck: GameDef<TruckState> = {
  id: 'movetruck',
  name: '이사 트럭 짐 싣기',
  genes: ['packing', 'bumpyride', 'pointer'],
  twist: '다 실은 뒤 과속방지턱에서 짐칸이 덜컹 차오르는 연속 물리 — 틈 없이 꽉 끼운 짐·위에서 눌린 짐은 버티고, 헐겁거나 높이·뒤쪽에 얹힌 짐은 통통 튀어 뒤 난간 너머 길에 떨어져서, 같은 짐이라도 어디에 어떤 순서로 쌓느냐가 출발 뒤 결과를 바꾼다',
  rules: ['짐칸 위를 꾹 누르면 놓일 자리가 보이고, 떼면 맨 앞 짐이 툭 떨어져 쌓여요.', '다 실으면 부릉 출발! 턱에서 덜컹 — 헐겁거나 높이 얹힌 짐은 튀어서 길에 떨어져요.'],
  controls: 'touch',
  hint: '짐칸을 꾹 누르면 놓일 자리, 떼면 툭! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '골목 이사 날 — 작은 트럭 디오라마',
    mood: '아침 햇살이 비스듬한 골목, 파스텔 집들 앞에 선 하늘색 작은 트럭. 테이프 붙인 골판지 상자와 냉장고·화분·이불이 현관 앞에 줄 서 있고, 콧수염 기사 아저씨가 창밖으로 고개를 내민다. 이웃 강아지가 꼬리를 흔들고 킥보드 탄 아이가 따라온다.',
    palette: { bg: '#bfe6ff', ink: '#2b2233', muted: '#7d8aa3', accent: '#ffb84d', hot: '#ff5f57', soft: '#fff3d6' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'load', pt: 0, items: [], next: 0, W: newWorld(), rt: 0, slow: 0, tail: 0,
      down: false, ax: 0.5, ay: 0.7, lastDrop: 0, taps: 0, firstTap: false,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      dropped: 0, broken: 0, catOff: false, again: false,
      seen: new Set<string>(), newsQ: [], news: null, events: [], startT: 0, pred: null, predW: null,
      dist: 0, speed: 0, zoom: 1, yb: 0, vb: 0, pa: 0, pv: 0, debris: [], mood: 'idle', moodT: 0, dogX: 0, dogSofa: -1, kidX: 0, catT: -999,
    } as TruckState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.phase === 'load') {
      if (!s.W.calm) loadTick(s.W), drain(s);
      if (release) tryDrop(s);
      if (s.next >= s.items.length && s.W.calm) startCheck(s);
    } else if (s.phase === 'check') {
      if (s.pt >= CHECK_T) startRide(s);
    } else if (s.phase === 'ride') rideStep(s);
    else if (s.phase === 'result' && s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
      if (s.ok) {
        if (s.won) s.dead = true;
        else (s.again = false), s.stage++, newStage(s);
      } else if (s.hearts <= 0) s.dead = true;
      else (s.again = true), newStage(s);
    }
    cosmetic(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const sig = (z: number) => 1 / (1 + Math.exp(-z));
/** 무거운 짐을 찌그러뜨리지 않고 놓을 바닥(또는 무거운 짐 위)이 남았나 */
function roomFor(W: World, it: Item) {
  const bs = live(W);
  for (let k = 0; k <= 20; k++) {
    const x = it.w / 2 + ((BW - it.w) * k) / 20, x0 = x - it.w / 2, x1 = x + it.w / 2;
    const top = skyTop(W, x0, x1);
    if (top + it.h > HF) continue;
    if (top < 0.02) return true;
    if (bs.every((b) => !(b.x + b.hw > x0 && b.x - b.hw < x1 && b.y + b.hh > top - 0.03) || b.m >= HEAVY_M)) return true;
  }
  return false;
}
/** 내다보기: 지금 모양이 덜컹 길에서 얼마나 위험한가 (짐마다 튀는 높이·밀리는 거리로 어림) */
function judge(W: World, d: StageDef, items: Item[], from: number): number {
  const bs = live(W), L = loads(bs), o = outcomeOf(W);
  let v = -(o.dropped + o.broken) * 3000, top = 0;
  const nb = d.bumps / 3;
  for (const b of bs) {
    const f = looseOf(b, 0, L.get(b.id) ?? 0) * d.S;
    const vy = KV * f, h = (vy * vy) / (2 * G), T = (2 * vy) / G, drift = KH * 0.6 * f * T + 0.25 * f;
    const pOut = sig((b.y - b.hh + h - HT) / 0.18) * sig((drift - (b.x - b.hw)) / 0.3);
    const wgt = b.grp >= 0 ? 1 / BLK : 1;
    v -= (pOut * 900 * nb + f * 70) * wgt;
    if (b.kind === 'pot' || b.kind === 'dish') v -= sig((vy - BREAK_V * (b.soft ? 1.8 : 1)) / 0.012) * 900;
    top = Math.max(top, b.y + b.hh);
  }
  v -= Math.max(0, top - 2.4) * 90;
  for (let k = from; k < Math.min(items.length, from + 3); k++) if (items[k].kind === 'heavy' && !roomFor(W, items[k])) v -= 900;
  return v;
}
function cands(W: World, it: Item, fine: boolean) {
  const hw = it.w / 2, xs: number[] = [], n = fine ? 14 : 8;
  for (let k = 0; k <= n; k++) xs.push(hw + ((BW - 2 * hw) * k) / n);
  if (fine) for (const b of live(W)) if (b.grp < 0 || b.off < 0 && b.off > -0.4) xs.push(b.x - b.hw - hw - 0.005, b.x + b.hw + hw + 0.005);
  const out: number[] = [];
  for (const x of xs.map((x) => clampX(it, x)).sort((p, q) => p - q)) if (!out.length || x - out[out.length - 1] > 0.04) out.push(x);
  return out;
}
const tryAt = (W: World, it: Item, idx: number, x: number) => {
  const W2 = cloneW(W);
  dropItem(W2, it, idx, x);
  settle(W2);
  return W2;
};
/** 잘하는 봇의 수: 자리마다 실제로 떨어뜨려 보고(물리) 어림값으로 고르고, 다음 짐 한 수 더 · 마지막 짐은 덜컹 길을 끝까지 돌려 본다 */
export function planX(s: TruckState): number {
  const d = STAGES[s.stage], it = s.items[s.next], last = s.next === s.items.length - 1;
  const res = cands(s.W, it, true).map((x) => {
    const W2 = tryAt(s.W, it, s.next, x);
    return { x, W2, v: judge(W2, d, s.items, s.next + 1) };
  });
  res.sort((p, q) => q.v - p.v);
  if (last) {
    let best = res[0], bv = -1e9;
    for (const r of res.slice(0, 5)) {
      const o = predictRide(r.W2, d, !!d.cat).o;
      const v = -(o.dropped + o.broken) * 10000 - o.broken * 2000 + r.v * 0.1;
      if (v > bv) (bv = v), (best = r);
    }
    return best.x;
  }
  // 다음 짐 한 수 더 내다보고, 지금 그대로 출발하면 어떻게 되는지도 덜컹 길을 돌려 본다
  const nx = s.items[s.next + 1];
  let best = res[0], bv = -1e9;
  for (const r of res.slice(0, 3)) {
    let v2 = -1e9;
    for (const x of cands(r.W2, nx, false)) v2 = Math.max(v2, judge(tryAt(r.W2, nx, s.next + 1, x), d, s.items, s.next + 2));
    const o = predictRide(r.W2, d, false, true).o;
    const v = v2 * 0.6 + r.v * 0.4 - (o.dropped + o.broken * 1.5) * 700 * (d.bumps / 2);
    if (v > bv) (bv = v), (best = r);
  }
  return best.x;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const press = (bx: number): Input => ({ tap: false, dir: 0, pointer: { x: bedToScreen(bx), y: (FY - 2.6 * U) / A } });
const smartMem = new WeakMap<object, { key: string; x: number; hold: number; next: number }>();
/** 봇: 자리마다 떨어뜨려 보고 내다본 가장 좋은 곳에 꾹 → 툭. 사람처럼 짐마다 조금 생각한다 */
export const movetruckSmart: Bot<TruckState> = {
  name: '이사 반장',
  act(s) {
    if (!canDrop(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.next}`;
    let m = smartMem.get(s);
    if (!m || m.key !== key) smartMem.set(s, (m = { key, x: planX(s), hold: 0, next: s.t + 21 }));
    if (s.t < m.next) return NO;
    if (m.hold < 9) return (m.hold += 3), press(m.x);
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 아무 데나 꾹 → 툭 (대개 짐칸 위, 가끔 화면 아무 데나) */
export const movetruckRandom: Bot<TruckState> = {
  name: '아무 데나 툭',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 30 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } } : NO;
    }
    if (s.phase !== 'load' || s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 100);
    if (rng() < 0.15) (m.x = rng()), (m.y = rng() * A);
    else (m.x = BX0 + rng() * BW * U), (m.y = FY - (0.5 + rng() * 3) * U);
    m.hold = 2 + Math.floor(rng() * 5);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } };
  },
};

/** 버릇 1: 늘 가장 낮게 놓이는 자리 (같으면 운전석 쪽) */
export function lowestX(W: World, it: Item) {
  let bx = BW - it.w / 2, bt = 1e9;
  for (let k = 0; k <= 24; k++) {
    const x = it.w / 2 + ((BW - it.w) * k) / 24, t = skyTop(W, x - it.w / 2, x + it.w / 2);
    if (t <= bt + 0.02) (bt = Math.min(bt, t)), (bx = x);
  }
  return bx;
}
/** 버릇 2 (판 만들기에 안 쓴 독립 버릇): 운전석 쪽부터 차례로 — 앞에 놓은 짐 바로 뒤에 붙이고, 끝에 닿으면 다시 앞에서 */
export function frontFillX(s: TruckState) {
  const it = s.items[s.next], W = s.W;
  const prev = [...W.b].reverse().find((b) => !b.dead && b.kind !== 'cat');
  if (!prev) return BW - it.w / 2;
  const x = prev.x - prev.hw - it.w / 2 - 0.005;
  return x - it.w / 2 < 0 ? BW - it.w / 2 : x;
}
const habitBot = (name: string, pick: (s: TruckState) => number): Bot<TruckState> => {
  const mem = new WeakMap<object, { key: string; x: number; hold: number; next: number }>();
  return {
    name,
    act(s) {
      if (!canDrop(s)) return NO;
      const key = `${s.stage}:${s.tries}:${s.next}`;
      let m = mem.get(s);
      if (!m || m.key !== key) mem.set(s, (m = { key, x: pick(s), hold: 0, next: s.t + 21 }));
      if (s.t < m.next) return NO;
      if (m.hold < 9) return (m.hold += 3), press(m.x);
      return NO;
    },
  };
};
/** 버릇 봇(측정용): 늘 가장 낮은 빈자리에 */
export const movetruckHabit = habitBot('버릇: 가장 낮은 빈자리', (s) => lowestX(s.W, s.items[s.next]));
/** 독립 버릇 봇(측정용): 운전석 쪽부터 차례로 붙여 채우기 */
export const movetruckHabit2 = habitBot('버릇: 앞에서부터 차례로', frontFillX);

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const PIV_X = 0.97;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
type F = (v: number) => number;
const distAt = (rt: number, d: StageDef) => {
  let x = 0;
  for (let r = 0; r < rt; r++) x += speedAt(r, d);
  return x;
};

/** 미리 보기: 지금 이 자리에 떨어뜨리면? (쌓인 모양 + 그대로 출발하면 덜컹 길에서 어떻게 되나) */
interface Pre { W: World; risk: Map<number, number>; it: Item; x: number; y0: number; idx: number }
const preCache = new WeakMap<object, { key: string; p: Pre }>();
function riskOf(Wnow: World, Wride: World, S: number) {
  const risk = new Map<number, number>(), bs = live(Wnow), L = loads(bs);
  for (const b of Wnow.b) {
    if (b.kind === 'cat') continue;
    if (b.dead || b.broken) {
      risk.set(b.id, 3);
      continue;
    }
    const q = Wride.b[b.id];
    if (q && (q.out || q.broken)) risk.set(b.id, 2);
    else if (looseOf(b, 0, L.get(b.id) ?? 0) * S >= 0.8) risk.set(b.id, 1);
  }
  return risk;
}
function previewOf(s: TruckState, bx: number): Pre {
  const it = s.items[s.next], x = clampX(it, bx), key = `${s.stage}:${s.tries}:${s.next}:${Math.round(x * 30)}`, c = preCache.get(s);
  if (c && c.key === key) return c.p;
  const d = STAGES[s.stage], W = cloneW(s.W), y0 = skyTop(W, x - it.w / 2, x + it.w / 2) + it.h / 2 + DROP_H;
  dropItem(W, it, s.next, x);
  settle(W);
  const pr = predictRide(W, d, !!d.cat);
  const p: Pre = { W, risk: riskOf(W, pr.W, d.S), it, x, y0, idx: s.next };
  preCache.set(s, { key, p });
  return p;
}

// ── 색 ──
const CARD = ['#e0a868', '#efc48c', '#c08548'];
const TRUCK = ['#6cc3f5', '#a8e0ff', '#3f97cf'];

function shade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dp: number, front: string, top: string, side: string) {
  // 윗면 · 옆면(오른쪽) · 앞면
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dp, y - dp * 0.7);
  ctx.lineTo(x + w + dp, y - dp * 0.7);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + dp, y - dp * 0.7);
  ctx.lineTo(x + w + dp, y + h - dp * 0.7);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = front;
  ctx.fillRect(x, y, w, h);
}

function emoji(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, sz: number) {
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(9, sz)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y);
}

/** 짐 하나 그리기: (cx,cy) 가운데 · w,h 픽셀 · u = 한 칸 픽셀 */
function drawLook(ctx: CanvasRenderingContext2D, it: { look: string; tag: string; flip: boolean }, cx: number, cy: number, w: number, h: number, u: number, o: { broken?: boolean; rot?: number; t?: number; ghost?: string; mood?: number } = {}) {
  const x = cx - w / 2, y = cy - h / 2, dp = u * 0.16;
  if (o.ghost) {
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.strokeStyle = o.ghost;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    if (it.look === 'ball' || it.look === 'cat') ctx.arc(cx, cy, w / 2, 0, TAU);
    else if (it.look === 'sofa') {
      const bh = h * 0.48, bw = u * 0.42, left = !it.flip;
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - bh);
      if (left) ctx.lineTo(x + bw, y + h - bh), ctx.lineTo(x + bw, y), ctx.lineTo(x, y);
      else ctx.lineTo(x + w, y), ctx.lineTo(x + w - bw, y), ctx.lineTo(x + w - bw, y + h - bh), ctx.lineTo(x, y + h - bh);
      ctx.closePath();
    } else ctx.roundRect(x, y, w, h, Math.min(6, u * 0.12));
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  // 바닥 그림자
  ctx.fillStyle = 'rgba(40,30,50,.16)';
  ctx.beginPath();
  ctx.ellipse(cx + dp * 0.6, y + h + 1, w * 0.52, Math.max(2, u * 0.07), 0, 0, TAU);
  ctx.fill();
  switch (it.look) {
    case 'box':
    case 'books':
    case 'dish': {
      const heavy = it.look === 'books', dish = it.look === 'dish';
      const c = heavy ? ['#b9824f', '#cf9a66', '#94643a'] : dish ? ['#f0d2a8', '#f8e2c0', '#d2ae80'] : CARD;
      if (o.broken) {
        // 찌그러진 상자: 톱니 윗변
        ctx.fillStyle = c[0];
        ctx.beginPath();
        ctx.moveTo(x - w * 0.04, y + h);
        for (let k = 0; k <= 8; k++) ctx.lineTo(x + (w * k) / 8 + (k % 2 ? 2 : -1), y + (k % 2 ? h * 0.25 : 0));
        ctx.lineTo(x + w * 1.04, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,50,20,.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        for (let k = 1; k < 4; k++) (ctx.beginPath(), ctx.moveTo(x + (w * k) / 4, y + h * 0.2), ctx.lineTo(x + (w * k) / 4 + 3, y + h), ctx.stroke());
        break;
      }
      shade(ctx, x, y, w, h, dp, c[0], c[1], c[2]);
      ctx.strokeStyle = 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      // 테이프
      ctx.fillStyle = dish ? 'rgba(255,90,80,.85)' : 'rgba(255,235,190,.75)';
      ctx.fillRect(cx - w * 0.07, y, w * 0.14, h * 0.32);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.07, y);
      ctx.lineTo(cx - w * 0.07 + dp, y - dp * 0.7);
      ctx.lineTo(cx + w * 0.07 + dp, y - dp * 0.7);
      ctx.lineTo(cx + w * 0.07, y);
      ctx.fill();
      if (heavy) {
        ctx.fillStyle = '#5b3a22';
        ctx.fillRect(x, y + h * 0.62, w, h * 0.12);
        emoji(ctx, '📚', cx, y + h * 0.42, Math.min(w, h) * 0.42);
        ctx.font = `900 ${Math.max(8, u * 0.17)}px system-ui, sans-serif`;
        ctx.fillStyle = '#fff1d6';
        ctx.fillText('무거움', cx, y + h * 0.69);
      } else if (dish) {
        ctx.fillStyle = '#ff5f57';
        ctx.fillRect(x + w * 0.08, y + h * 0.5, w * 0.84, h * 0.26);
        ctx.font = `900 ${Math.max(8, u * 0.16)}px system-ui, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('깨짐 주의', cx, y + h * 0.63);
        emoji(ctx, '🍽️', cx, y + h * 0.3, Math.min(w, h) * 0.32);
      } else if (it.tag) emoji(ctx, it.tag, cx, y + h * 0.6, Math.min(w, h) * 0.4);
      break;
    }
    case 'fridge': {
      shade(ctx, x, y, w, h, dp, '#eef3f8', '#ffffff', '#c9d3de');
      ctx.strokeStyle = 'rgba(80,100,120,.4)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.36);
      ctx.lineTo(x + w, y + h * 0.36);
      ctx.stroke();
      ctx.fillStyle = '#7d8aa3';
      ctx.fillRect(x + w * 0.12, y + h * 0.1, w * 0.08, h * 0.18);
      ctx.fillRect(x + w * 0.12, y + h * 0.44, w * 0.08, h * 0.24);
      ctx.fillStyle = '#ff8fb1';
      ctx.beginPath();
      ctx.arc(x + w * 0.62, y + h * 0.55, w * 0.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(x + w * 0.5, y + h * 0.72, w * 0.2, w * 0.16);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(x + w * 0.82, y + h * 0.05, w * 0.06, h * 0.88);
      break;
    }
    case 'washer': {
      shade(ctx, x, y, w, h, dp, '#f2f5f9', '#ffffff', '#cdd6e0');
      ctx.strokeStyle = 'rgba(80,100,120,.4)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = '#d9e2ec';
      ctx.fillRect(x, y, w, h * 0.18);
      ctx.fillStyle = '#5cb8ff';
      ctx.beginPath();
      ctx.arc(x + w * 0.75, y + h * 0.09, h * 0.05, 0, TAU);
      ctx.fill();
      const r = Math.min(w, h) * 0.3;
      ctx.fillStyle = '#9aa7b8';
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.58, r * 1.12, 0, TAU);
      ctx.fill();
      const g = ctx.createRadialGradient(cx - r * 0.3, y + h * 0.5, r * 0.1, cx, y + h * 0.58, r);
      g.addColorStop(0, '#d8f1ff');
      g.addColorStop(1, '#4f86b8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.58, r, 0, TAU);
      ctx.fill();
      break;
    }
    case 'pot': {
      // 잎 (위)
      const lc = ['#3fae5a', '#5cc96f', '#2f8f48'];
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.5 + Math.sin((o.t ?? 0) * 0.05 + k) * 0.05;
        ctx.fillStyle = lc[k % 3];
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * w * 0.28, y + h * 0.42 + Math.sin(a) * h * 0.3, w * 0.13, h * 0.2, a + Math.PI / 2, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd1e0';
      ctx.beginPath();
      ctx.arc(cx + w * 0.05, y + h * 0.12, w * 0.09, 0, TAU);
      ctx.fill();
      // 화분 (아래 절반)
      const py = y + h * 0.5;
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#d9774a');
      g.addColorStop(0.6, '#f0935f');
      g.addColorStop(1, '#b85e36');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.lineTo(x + w * 0.84, y + h);
      ctx.lineTo(x + w * 0.16, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c4643a';
      ctx.fillRect(x - w * 0.03, py, w * 1.06, h * 0.1);
      break;
    }
    case 'ball': {
      const r = w / 2, rot = o.rot ?? 0;
      const cols = ['#ff5f57', '#ffd166', '#4cc9f0', '#ffffff'];
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = cols[k];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, rot + (k * TAU) / 4, rot + ((k + 1) * TAU) / 4);
        ctx.closePath();
        ctx.fill();
      }
      const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,.55)');
      g.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(0,0,40,.25)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
      break;
    }
    case 'blanket': {
      // 접힌 이불 (줄 선 곳·길에서)
      ctx.fillStyle = '#ff9fc0';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, h * 0.45);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = Math.max(1, h * 0.12);
      for (let k = 1; k < 6; k++) (ctx.beginPath(), ctx.moveTo(x + (w * k) / 6, y + 2), ctx.lineTo(x + (w * k) / 6, y + h - 2), ctx.stroke());
      break;
    }
    case 'sofa': {
      const bh = h * 0.48, bw = u * 0.42, left = !it.flip;
      const c = ['#2fb5a5', '#53d0bf', '#1f8a7e'];
      // 등받이
      const bx = left ? x : x + w - bw;
      shade(ctx, bx, y, bw, h - bh, dp, c[0], c[1], c[2]);
      // 앉는 자리
      shade(ctx, x, y + h - bh, w, bh * 0.8, dp, c[0], c[1], c[2]);
      // 쿠션
      ctx.fillStyle = '#7fe0d2';
      const sx0 = left ? x + bw : x, sw = w - bw;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.roundRect(sx0 + (sw * k) / 2 + 2, y + h - bh - 2, sw / 2 - 4, bh * 0.3, 3);
        ctx.fill();
      }
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(x + w * 0.06, y + h - bh * 0.2, w * 0.06, bh * 0.2);
      ctx.fillRect(x + w * 0.88, y + h - bh * 0.2, w * 0.06, bh * 0.2);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.roundRect(left ? x + bw + 3 : x + w - bw - u * 0.36, y + h - bh - u * 0.3, u * 0.32, u * 0.28, 3);
      ctx.fill();
      break;
    }
    case 'cat':
      drawCat(ctx, cx, cy, w * 0.62, o.mood ?? 0, o.t ?? 0);
      break;
  }
}

/** 고양이: mood 0 잠 · 1 깜짝 */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const orange = ['#ffb35c', '#f08a2c', '#c86a1a'];
  if (mood === 0) {
    const br = 1 + Math.sin(t * 0.08) * 0.04;
    ctx.fillStyle = orange[1];
    ctx.beginPath();
    ctx.ellipse(0, u * 0.25, u * 0.85, u * 0.5 * br, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = orange[2];
    ctx.lineWidth = u * 0.12;
    ctx.beginPath();
    ctx.arc(u * 0.1, u * 0.55, u * 0.6, 0.2, 2.6);
    ctx.stroke();
    ctx.fillStyle = orange[0];
    ctx.beginPath();
    ctx.arc(-u * 0.55, u * 0.15, u * 0.42, 0, TAU);
    ctx.fill();
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-u * 0.55 + s2 * u * 0.32, u * -0.05);
      ctx.lineTo(-u * 0.55 + s2 * u * 0.22, -u * 0.38);
      ctx.lineTo(-u * 0.55 + s2 * u * 0.05, -u * 0.12);
      ctx.fill();
    }
    ctx.strokeStyle = '#4a2a10';
    ctx.lineWidth = Math.max(1, u * 0.07);
    for (const s2 of [-1, 1]) (ctx.beginPath(), ctx.arc(-u * 0.55 + s2 * u * 0.16, u * 0.12, u * 0.08, 0.2, Math.PI - 0.2), ctx.stroke());
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(9, u * 0.55)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('z', u * 0.5 + Math.sin(t * 0.05) * 2, -u * 0.5 - ((t * 0.3) % 8));
  } else {
    ctx.fillStyle = orange[1];
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.8, u * 0.5, 0, Math.PI, TAU);
    ctx.lineTo(u * 0.8, u * 0.4);
    ctx.lineTo(-u * 0.8, u * 0.4);
    ctx.fill();
    ctx.strokeStyle = orange[2];
    ctx.lineWidth = u * 0.14;
    ctx.beginPath();
    ctx.moveTo(u * 0.7, 0);
    ctx.quadraticCurveTo(u * 1.2, -u * 0.6, u * 0.9, -u * 0.9);
    ctx.stroke();
    ctx.fillStyle = orange[0];
    ctx.beginPath();
    ctx.arc(-u * 0.8, -u * 0.3, u * 0.42, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const s2 of [-1, 1]) (ctx.beginPath(), ctx.arc(-u * 0.8 + s2 * u * 0.17, -u * 0.34, u * 0.12, 0, TAU), ctx.fill());
    ctx.fillStyle = '#222';
    for (const s2 of [-1, 1]) (ctx.beginPath(), ctx.arc(-u * 0.8 + s2 * u * 0.17, -u * 0.34, u * 0.05, 0, TAU), ctx.fill());
  }
  ctx.restore();
}

/** 이불 (짐칸 안): 기둥 꼭대기를 잇는 말랑한 띠 */
function drawBlanket(ctx: CanvasRenderingContext2D, cols: Body[], P: (bx: number, by: number) => [number, number], u: number, ghost?: string) {
  cols = [...cols].sort((p, q) => p.off - q.off);
  if (!cols.length) return;
  const top = cols.map((c) => P(c.x, c.y + c.hh)), bot = cols.map((c) => P(c.x, c.y - c.hh));
  const hw = cols[0].hw * u;
  ctx.beginPath();
  ctx.moveTo(top[0][0] - hw, top[0][1] + 2);
  for (let k = 0; k < top.length; k++) ctx.lineTo(top[k][0], top[k][1]);
  ctx.lineTo(top[top.length - 1][0] + hw, top[top.length - 1][1] + 2);
  ctx.lineTo(bot[bot.length - 1][0] + hw, bot[bot.length - 1][1] - 1);
  for (let k = bot.length - 1; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]);
  ctx.lineTo(bot[0][0] - hw, bot[0][1] - 1);
  ctx.closePath();
  if (ghost) {
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = ghost;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  ctx.fillStyle = '#ff9fc0';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#e8739b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = Math.max(1.5, u * 0.05);
  for (let k = 0; k < top.length; k += 2) (ctx.beginPath(), ctx.moveTo(top[k][0], top[k][1] + 2), ctx.lineTo(bot[k][0], bot[k][1] - 2), ctx.stroke());
  ctx.fillStyle = '#ffd6e5';
  for (let k = 1; k < top.length; k += 2) (ctx.beginPath(), ctx.arc((top[k][0] + bot[k][0]) / 2, (top[k][1] + bot[k][1]) / 2, u * 0.05, 0, TAU), ctx.fill());
}

/** 짐칸 안의 짐 하나 */
function drawBody(ctx: CanvasRenderingContext2D, s: TruckState, b: Body, P: (bx: number, by: number) => [number, number], u: number, ghost?: string) {
  const it = b.kind === 'cat' ? CAT : s.items[b.it];
  const [cx, cy] = P(b.x, b.y);
  const tilt = b.tip * 0.18 + (b.air > 3 ? Math.sin(b.id * 1.7) * Math.min(0.5, b.air * 0.02) : 0);
  ctx.save();
  if (tilt) {
    ctx.translate(cx, cy + b.hh * u);
    ctx.rotate(tilt);
    ctx.translate(-cx, -(cy + b.hh * u));
  }
  if (b.kind === 'sofa' || b.kind === 'cat' || b.kind === 'ball') drawLook(ctx, it, cx, cy, b.hw * 2 * u, b.hh * 2 * u, u, { ghost, rot: b.x / Math.max(0.1, b.r) + b.y, t: s.t, mood: b.wake ? 1 : 0 });
  else drawLook(ctx, it, cx, cy, b.hw * 2 * u, b.hh * 2 * u, u, { ghost, broken: b.broken, t: s.t });
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: TruckState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage];
  const X: F = (x) => x * w, Y: F = (y) => y * w, R: F = (r) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const z = s.zoom;
  /** 짐칸 좌표 → (카메라 전) 화면 좌표 */
  const P = (bx: number, by: number): [number, number] => [X(BX0 + bx * U), Y(FY - by * U)];
  /** 카메라까지 → 화면 픽셀 (연출 위치용) */
  const scr = (wx: number, wy: number): [number, number] => [X(PIV_X + (wx - PIV_X) * z), Y(ROAD_Y + (wy - ROAD_Y) * z)];
  const bedScr = (bx: number, by: number) => scr(BX0 + bx * U, FY - by * U - s.yb);
  ctx.save();
  fx.begin(ctx);
  drawSky(ctx, s, w, h, X, Y, R);
  ctx.save();
  ctx.translate(X(PIV_X), Y(ROAD_Y));
  ctx.scale(z, z);
  ctx.translate(-X(PIV_X), -Y(ROAD_Y));
  drawStreet(ctx, s, d, w, X, Y, R, t);
  drawQueue(ctx, s, X, Y, R, t);
  drawCritters(ctx, s, X, Y, R, t);
  // ═════════ 트럭 ═════════
  ctx.save();
  ctx.translate(0, -Y(s.yb));
  ctx.translate(X(0.55), Y(ROAD_Y));
  ctx.rotate(s.pa);
  ctx.translate(-X(0.55), -Y(ROAD_Y));
  drawTruckBack(ctx, s, X, Y, R, t);
  const pre = s.down && canDrop(s) ? previewOf(s, toBed(s.ax)) : null;
  const risk = pre ? pre.risk : s.phase === 'check' && s.predW ? riskOf(s.W, s.predW, d.S) : null;
  // 짐
  const cols: Body[] = [];
  for (const b of s.W.b) {
    if (b.dead) continue;
    if (b.grp >= 0) cols.push(b);
    else if (b.kind !== 'cat' || s.phase !== 'check' || t - s.catT > 30) drawBody(ctx, s, b, P, R(U));
  }
  if (cols.length) drawBlanket(ctx, cols, P, R(U));
  // 고양이가 현관에서 폴짝 올라온다
  if (s.phase === 'check' && t - s.catT <= 30) {
    const cb = s.W.b.find((b) => b.kind === 'cat' && !b.dead);
    if (cb) {
      const q = (t - s.catT) / 30, [tx, ty] = P(cb.x, cb.y), fx0 = X(0.25), fy0 = Y(PORCH_Y - 0.03);
      drawCat(ctx, fx0 + (tx - fx0) * q, fy0 + (ty - fy0) * q - Math.sin(q * Math.PI) * R(0.15), R(U * 0.35), 1, t);
    }
  }
  if (pre) drawPreview(ctx, s, pre, P, X, Y, R, font, t);
  if (risk) drawRisk(ctx, s, pre ? pre.W : s.W, risk, P, R, font, t);
  drawTruckFront(ctx, s, X, Y, R, t);
  ctx.restore();
  ctx.restore();
  // 가장자리 살짝 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.5), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,20,60,.18)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(HB + 0.06), Math.min(Y(BAND - 0.04), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 45 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 6;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const [x, y] = e.bed ? bedScr(e.x, e.y) : scr(e.x, e.y);
    if (e.kind === 'land') {
      fx.burst(x, y, '#e8d6b8', e.text === '쿵!' ? 14 : 6, e.text === '쿵!' ? 2.6 : 1.6, 1.8);
      if (e.text === '쿵!') fx.kick(3);
      say(x, y - R(0.04), e.text!, e.col!, e.text === '쿵!' ? 16 : 13);
    }
    if (e.kind === 'crush') fx.burst(x, y, '#c08548', 22, 3.6, 2.6), fx.kick(7), fx.ring(x, y, '#ffb36b', R(0.12), 4), say(x, y - R(0.07), e.text!, e.col!, 16);
    if (e.kind === 'break') fx.burst(x, y, '#f0935f', 26, 4.2, 2.6), fx.burst(x, y, '#5cc96f', 10, 3, 2.2), fx.kick(8), fx.ring(x, y, '#ff6a5a', R(0.13), 5), fx.blink('#ffd0c8', 0.15), say(x, y - R(0.07), e.text!, e.col!, 17);
    if (e.kind === 'out') fx.ring(x, y, '#ff6a5a', R(0.1), 4), fx.kick(5), say(x + R(0.1), y - R(0.1), e.text!, e.col!, 16);
    if (e.kind === 'wake') fx.burst(x, y, '#ffb35c', 12, 3, 2), say(x, y - R(0.08), e.text!, e.col!, 16);
    if (e.kind === 'bump') {
      const big = e.x < 0.5;
      fx.kick(big ? 8 : 4);
      fx.burst(x, y, '#d8cbb4', big ? 18 : 10, big ? 3.4 : 2.4, 2.4);
      say(x, Y(0.86), e.text!, e.col!, big ? 22 : 16);
    }
    if (e.kind === 'go') fx.burst(X(0.05), Y(1.1), '#e6e6ee', 16, 2.4, 3), fx.kick(3), say(X(0.5), Y(0.8), e.text!, e.col!, 22);
    if (e.kind === 'thud') fx.burst(x, y, e.text === '와장창' ? '#f0935f' : '#d8cbb4', 12, 2.6, 2.2), say(x, y - R(0.05), e.text!, e.col!, 14);
    if (e.kind === 'dog') fx.burst(x, y, '#ffffff', 8, 2, 2), say(x, y - R(0.05), e.text!, e.col!, 15);
    if (e.kind === 'miss') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'wedge') fx.ring(x, y, '#9df0a8', R(0.07), 3), say(x, y - R(0.05), e.text!, e.col!, 14);
    if (e.kind === 'clear') {
      fx.burst(w * 0.3, Y(0.5), '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, Y(0.5), '#ff9ec4', 40, 6, 3.2), fx.burst(w * 0.5, Y(0.6), '#8fe3ff', 30, 5, 3);
      fx.ring(w / 2, Y(0.55), '#ffe066', R(0.45), 7), fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, d, w, h, X, Y, R, font, th);
}
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function drawSky(ctx: CanvasRenderingContext2D, s: TruckState, w: number, h: number, X: F, Y: F, R: F) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#8fd0ff');
  g.addColorStop(0.45, '#c8ecff');
  g.addColorStop(0.7, '#ffe9c7');
  g.addColorStop(1, '#ffd9a8');
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 해 + 빛 번짐
  const sun = ctx.createRadialGradient(X(0.86), Y(0.2), R(0.02), X(0.86), Y(0.2), R(0.4));
  sun.addColorStop(0, 'rgba(255,250,210,1)');
  sun.addColorStop(0.15, 'rgba(255,236,170,.75)');
  sun.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.arc(X(0.86), Y(0.2), R(0.05), 0, TAU);
  ctx.fill();
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 1) + s.t * 0.00012 * (1 + k * 0.3) - s.dist * 0.04) % 1.4 + 1.4) % 1.4 - 0.2, cy = 0.12 + hsh(k + 9) * 0.25, sc = 0.6 + hsh(k + 3) * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.arc(X(cx + (j - 1.5) * 0.04 * sc), Y(cy - (j % 2) * 0.015 * sc), R(0.035 * sc * (j % 3 ? 1 : 1.3)), 0, TAU), ctx.fill());
  }
  // 먼 언덕
  for (let layer = 0; layer < 2; layer++) {
    const par = s.dist * (0.08 + layer * 0.1), base = 0.62 + layer * 0.08;
    ctx.fillStyle = layer ? '#a6dca0' : '#bfe3d6';
    ctx.beginPath();
    ctx.moveTo(0, Y(1.0));
    for (let x = 0; x <= 1.02; x += 0.02) ctx.lineTo(X(x), Y(base - 0.05 * Math.sin((x + par) * (5 + layer * 3)) - 0.03 * Math.sin((x + par) * 13 + layer)));
    ctx.lineTo(X(1.02), Y(1.0));
    ctx.fill();
  }
}

/** 집 · 언덕 위 현관 · 길 · 과속방지턱 */
function drawStreet(ctx: CanvasRenderingContext2D, s: TruckState, d: StageDef, w: number, X: F, Y: F, R: F, t: number) {
  const par = s.dist * 0.6, endD = s.phase === 'ride' || s.phase === 'result' ? distAt(rideEnd(d), d) * 0.6 : 99;
  // 길가 집들
  for (let k = -1; k < 40; k++) {
    const hx = 0.72 + k * 0.42 - par;
    if (hx < -0.6 || hx > 1.6) continue;
    if (k >= 0 && Math.abs(hx + par - (endD + 0.02)) < 0.5) continue;
    if (k < 0) continue;
    drawHouse(ctx, X, Y, R, hx, 0.98, 0.34, 0.26, k, false, t);
  }
  // 떠나는 집(언덕 위) · 새 집
  drawTerrace(ctx, X, Y, R, -par, t);
  if (endD < 90) drawHouse(ctx, X, Y, R, endD - par + 0.02, 0.98, 0.56, 0.4, 99, true, t);
  // 먼 인도
  ctx.fillStyle = '#e9dfd0';
  ctx.fillRect(-w, Y(0.975), w * 3, Y(0.07));
  ctx.strokeStyle = 'rgba(150,130,110,.35)';
  ctx.lineWidth = 1;
  for (let k = -2; k < 24; k++) {
    const x = (((k * 0.12 - s.dist * 0.85) % 2.4) + 2.4) % 2.4 - 0.4;
    ctx.beginPath();
    ctx.moveTo(X(x), Y(0.975));
    ctx.lineTo(X(x - 0.02), Y(1.045));
    ctx.stroke();
  }
  // 가로수 · 가로등
  for (let k = 0; k < 6; k++) {
    const x = (((1.65 + k * 0.5 - s.dist * 0.85) % 3) + 3) % 3 - 0.5;
    if (k % 2) {
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(X(x) - 2, Y(0.86), 4, Y(0.12));
      ctx.fillStyle = '#5cbf6a';
      ctx.beginPath();
      ctx.arc(X(x), Y(0.84), R(0.05), 0, TAU);
      ctx.arc(X(x - 0.03), Y(0.87), R(0.035), 0, TAU);
      ctx.arc(X(x + 0.03), Y(0.87), R(0.035), 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath();
      ctx.arc(X(x - 0.015), Y(0.825), R(0.02), 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#5d6475';
      ctx.fillRect(X(x) - 1.5, Y(0.72), 3, Y(0.26));
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(X(x), Y(0.72), R(0.012), 0, TAU);
      ctx.fill();
    }
  }
  // 길
  const rg = ctx.createLinearGradient(0, Y(1.045), 0, Y(1.3));
  rg.addColorStop(0, '#8d8d9c');
  rg.addColorStop(1, '#6d6d7e');
  ctx.fillStyle = rg;
  ctx.fillRect(-w, Y(1.045), w * 3, Y(0.26));
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let k = -2; k < 14; k++) {
    const x = (((k * 0.24 - s.dist) % 3.6) + 3.6) % 3.6 - 0.6;
    ctx.fillRect(X(x), Y(1.255), R(0.11), R(0.012));
  }
  ctx.fillStyle = '#d7d3cc';
  ctx.fillRect(-w, Y(1.292), w * 3, Y(0.02));
  ctx.fillStyle = '#b9b3aa';
  ctx.fillRect(-w, Y(1.31), w * 3, Y(0.05));
  // 과속방지턱 (줄무늬 띠 + 볼록)
  if (s.phase === 'ride' || s.phase === 'result' || s.phase === 'check') {
    for (let k = 0; k < d.bumps; k++) {
      const x = distAt(bumpAt(k), d) + WHEEL_F - s.dist;
      if (x < -0.6 || x > 1.5) continue;
      // 길을 가로지르는 볼록 띠 (먼 쪽은 좁게, 가까운 쪽은 넓게) + 노랑·검정 빗금
      const band = (y0: number, y1: number, w0: number, w1: number, sk: number) => {
        ctx.beginPath();
        ctx.moveTo(X(x - w0 + sk * (y0 - 1.05)), Y(y0));
        ctx.lineTo(X(x + w0 + sk * (y0 - 1.05)), Y(y0));
        ctx.lineTo(X(x + w1 + sk * (y1 - 1.05)), Y(y1));
        ctx.lineTo(X(x - w1 + sk * (y1 - 1.05)), Y(y1));
        ctx.closePath();
      };
      ctx.fillStyle = 'rgba(30,30,40,.25)';
      band(1.05, 1.29, 0.03, 0.05, 0.12);
      ctx.fill();
      ctx.save();
      band(1.048, 1.285, 0.022, 0.04, 0.12);
      ctx.clip();
      for (let j = -6; j < 10; j++) {
        ctx.fillStyle = j % 2 ? '#2b2b33' : '#ffd23a';
        ctx.beginPath();
        ctx.moveTo(X(x - 0.1 + j * 0.03), Y(1.29));
        ctx.lineTo(X(x - 0.1 + j * 0.03 + 0.03), Y(1.29));
        ctx.lineTo(X(x - 0.1 + j * 0.03 + 0.09), Y(1.04));
        ctx.lineTo(X(x - 0.1 + j * 0.03 + 0.06), Y(1.04));
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      band(1.048, 1.285, 0.022, 0.04, 0.12);
      ctx.save();
      ctx.clip();
      ctx.fillRect(X(x - 0.2), Y(1.04), R(0.4), R(0.012));
      ctx.restore();
      // 표지판
      ctx.fillStyle = '#5d6475';
      ctx.fillRect(X(x + 0.06) - 1.5, Y(0.88), 3, Y(0.1));
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(X(x + 0.06), Y(0.83));
      ctx.lineTo(X(x + 0.09), Y(0.885));
      ctx.lineTo(X(x + 0.03), Y(0.885));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2b2b33';
      ctx.font = `900 ${Math.max(9, R(0.03))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', X(x + 0.06), Y(0.868));
    }
  }
  // 떨어진 짐
  for (const g of s.debris) {
    const x = g.wx - s.dist;
    if (x < -0.6 || x > 1.6) continue;
    const u = R(U * 0.9);
    ctx.save();
    ctx.translate(X(x), Y(g.y));
    ctx.rotate(g.rot);
    if ((g.kind === 'pot' || g.kind === 'dish') && g.hits > 0) {
      ctx.fillStyle = '#f0935f';
      for (let k = 0; k < 5; k++) (ctx.beginPath(), ctx.moveTo(-u * 0.3 + k * u * 0.15, 0), ctx.lineTo(-u * 0.25 + k * u * 0.15, -u * 0.12), ctx.lineTo(-u * 0.2 + k * u * 0.15, 0), ctx.fill());
    } else drawLook(ctx, g, 0, 0, g.w * u, g.h * u, u, { broken: g.broken && g.kind === 'box', t, mood: 1 });
    ctx.restore();
  }
}

function drawHouse(ctx: CanvasRenderingContext2D, X: F, Y: F, R: F, x: number, gy: number, w: number, hh: number, k: number, isNew: boolean, t: number) {
  const walls = ['#ffd6c9', '#d6ecff', '#fff1b8', '#dff5d8', '#f0dcff'], roofs = ['#e46a5a', '#5a8fe4', '#e4a35a', '#5ab88a', '#a36ae4'];
  const wc = isNew ? '#fff3e0' : walls[k % 5], rc = isNew ? '#ff7a59' : roofs[(k * 3) % 5];
  shade(ctx, X(x), Y(gy - hh), R(w), R(hh), R(0.025), wc, '#ffffff', 'rgba(0,0,0,.08)');
  ctx.fillStyle = rc;
  ctx.beginPath();
  ctx.moveTo(X(x - 0.02), Y(gy - hh));
  ctx.lineTo(X(x + w / 2), Y(gy - hh - 0.1));
  ctx.lineTo(X(x + w + 0.03), Y(gy - hh));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7ec8ff';
  for (let j = 0; j < 2; j++) {
    const wx = x + w * (0.2 + j * 0.45);
    ctx.fillRect(X(wx), Y(gy - hh * 0.75), R(0.06), R(0.06));
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(X(wx), Y(gy - hh * 0.75), R(0.02), R(0.06));
    ctx.fillStyle = '#7ec8ff';
  }
  if (isNew) {
    ctx.fillStyle = '#ff7a59';
    ctx.font = `900 ${Math.max(12, R(0.035))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('새 집 🏠', X(x + w / 2), Y(gy - hh - 0.14 + Math.sin(t * 0.08) * 0.004));
  }
}

/** 떠나는 집: 언덕 위 현관(짐이 줄 서는 곳) + 돌 축대 + 계단 */
const PORCH_Y = 0.4;
function drawTerrace(ctx: CanvasRenderingContext2D, X: F, Y: F, R: F, ox: number, t: number) {
  if (ox < -1.3) return;
  // 축대: 크기·빛깔이 조금씩 다른 돌
  const sw = ctx.createLinearGradient(0, Y(PORCH_Y), 0, Y(0.98));
  sw.addColorStop(0, '#e3d5bf');
  sw.addColorStop(1, '#c9b79c');
  ctx.fillStyle = sw;
  ctx.fillRect(X(ox - 0.2), Y(PORCH_Y), R(0.9), Y(0.98 - PORCH_Y));
  for (let r = 0; r < 9; r++) {
    const yy = PORCH_Y + 0.025 + r * 0.064;
    for (let c = 0; c < 8; c++) {
      const xx = ox - 0.2 + c * 0.12 + (r % 2) * 0.06, k = r * 11 + c;
      ctx.fillStyle = `rgba(${150 + hsh(k) * 40},${130 + hsh(k + 1) * 30},${100 + hsh(k + 2) * 30},.28)`;
      ctx.beginPath();
      ctx.roundRect(X(xx) + 1.5, Y(yy) + 1.5, R(0.117), R(0.061), R(0.012));
      ctx.fill();
    }
  }
  // 담쟁이 · 꽃
  for (let k = 0; k < 34; k++) {
    ctx.fillStyle = k % 9 === 0 ? '#ff8fb1' : k % 7 === 0 ? '#fff1a8' : `rgba(${70 + (k % 3) * 20},${160 + (k % 4) * 12},90,.85)`;
    ctx.beginPath();
    ctx.arc(X(ox - 0.15 + hsh(k + 40) * 0.24), Y(PORCH_Y + 0.02 + hsh(k + 50) * hsh(k + 51) * 0.45), R(0.011 + hsh(k) * 0.009), 0, TAU);
    ctx.fill();
  }
  // 계단 (오른쪽)
  for (let k = 0; k < 9; k++) {
    ctx.fillStyle = k % 2 ? '#cbb89e' : '#ddccb2';
    ctx.fillRect(X(ox + 0.66 + k * 0.01), Y(PORCH_Y + k * 0.064), R(0.12), Y(0.064));
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(X(ox + 0.66 + k * 0.01), Y(PORCH_Y + k * 0.064), R(0.12), 1.5);
  }
  // 집
  shade(ctx, X(ox + 0.03), Y(0.15), R(0.5), R(PORCH_Y - 0.15), R(0.035), '#ffe1c2', '#fff4e6', '#e9c49c');
  ctx.fillStyle = 'rgba(200,140,90,.18)';
  for (let k = 0; k < 6; k++) ctx.fillRect(X(ox + 0.03), Y(0.17 + k * 0.04), R(0.5), 1);
  ctx.fillStyle = '#e46a5a';
  ctx.beginPath();
  ctx.moveTo(X(ox - 0.01), Y(0.155));
  ctx.lineTo(X(ox + 0.28), Y(0.075));
  ctx.lineTo(X(ox + 0.58), Y(0.155));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.fillRect(X(ox + 0.03), Y(0.155), R(0.5), R(0.012));
  // 문 + '이사 가요' 팻말
  ctx.fillStyle = '#8a5a3b';
  ctx.beginPath();
  ctx.roundRect(X(ox + 0.07), Y(0.24), R(0.085), Y(PORCH_Y - 0.24), [R(0.04), R(0.04), 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(X(ox + 0.14), Y(0.33), R(0.007), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff6e0';
  ctx.fillRect(X(ox + 0.06), Y(0.19), R(0.11), R(0.035));
  ctx.fillStyle = '#c0582f';
  ctx.font = `900 ${Math.max(9, R(0.022))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('이사 가요', X(ox + 0.115), Y(0.208));
  // 창 둘
  for (const wx of [0.24, 0.39]) {
    ctx.fillStyle = '#7ec8ff';
    ctx.fillRect(X(ox + wx), Y(0.2), R(0.09), R(0.08));
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.fillRect(X(ox + wx + 0.042), Y(0.2), R(0.006), R(0.08));
    ctx.fillRect(X(ox + wx), Y(0.237), R(0.09), R(0.005));
    ctx.fillStyle = '#ff9fc0';
    ctx.fillRect(X(ox + wx - 0.005), Y(0.28), R(0.1), R(0.015));
  }
  // 현관 바닥(나무 데크) + 산울타리
  ctx.fillStyle = '#a8865e';
  ctx.fillRect(X(ox - 0.2), Y(PORCH_Y), R(0.9), R(0.02));
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(X(ox - 0.2), Y(PORCH_Y), R(0.9), R(0.004));
  ctx.fillStyle = '#6cbf6a';
  for (let k = 0; k < 16; k++) (ctx.beginPath(), ctx.arc(X(ox - 0.18 + k * 0.055), Y(PORCH_Y + 0.03), R(0.022), 0, TAU), ctx.fill());
  void t;
}

/** 현관에 줄 선 짐: 지금 짐(크게) + 다음 3개 */
const QS = 0.62;
function drawQueue(ctx: CanvasRenderingContext2D, s: TruckState, X: F, Y: F, R: F, t: number) {
  if (s.phase !== 'load' && s.phase !== 'check') return;
  const ox = -s.dist * 0.6, u = R(U * QS);
  let x = 0.6;
  for (let k = 0; k < 4; k++) {
    const i = s.next + k;
    if (i >= s.items.length) break;
    const it = s.items[i], sc = k === 0 ? 1.15 : 0.9, ww = it.w * u * sc, hh = it.h * u * sc;
    if (k === 0 && s.down && canDrop(s)) {
      x -= it.w * U * QS * sc + 0.02;
      continue;
    }
    const cx = X(ox + x) - ww / 2, bob = k === 0 && canDrop(s) ? Math.sin(t * 0.15) * 2 : 0;
    drawLook(ctx, it, cx, Y(PORCH_Y) - hh / 2 - 1 + bob, ww, hh, u * sc, { t, mood: 0 });
    if (k === 0) {
      ctx.fillStyle = '#ff7a59';
      ctx.font = `900 ${Math.max(12, R(0.033))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▼', cx, Y(PORCH_Y) - hh - R(0.02) + bob);
    }
    x -= it.w * U * QS * sc + 0.02;
  }
  const rest = s.items.length - s.next - 4;
  if (rest > 0) {
    ctx.fillStyle = 'rgba(60,40,30,.75)';
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(`+${rest}`, X(ox + Math.max(0.02, x - 0.02)), Y(PORCH_Y - 0.03));
  }
  // 고양이 (고양이 판): 현관에서 기다린다
  if (STAGES[s.stage].cat && s.phase === 'load') drawCat(ctx, X(ox + 0.25), Y(PORCH_Y) - R(0.02), R(0.028), 0, t);
}

/** 강아지 · 킥보드 아이 */
function drawCritters(ctx: CanvasRenderingContext2D, s: TruckState, X: F, Y: F, R: F, t: number) {
  const riding = s.phase === 'ride' || s.phase === 'result';
  // 강아지
  const onSofa = s.dogSofa >= 0 && s.debris[s.dogSofa] && Math.abs(s.debris[s.dogSofa].wx - s.dist - s.dogX) < 0.03;
  const dx = riding ? s.dogX : 0.2 - s.dist * 0.6, dy = riding ? (onSofa ? ROAD_Y - 0.075 : ROAD_Y - 0.005) : PORCH_Y;
  drawDog(ctx, X(dx), Y(dy), R(0.03), riding && !onSofa ? t : 0, onSofa, t);
  // 아이
  const kx = riding ? s.kidX : 0.035 - s.dist * 0.6, ky = riding ? ROAD_Y : PORCH_Y;
  if (kx > -0.3) drawKid(ctx, X(kx), Y(ky), R(0.032), riding, s.debris.length > 0, t);
}

function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, run: number, sit: boolean, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const leg = run ? Math.sin(run * 0.5) * u * 0.25 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 1.1, u * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f7efe4';
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = Math.max(1, u * 0.08);
  for (const lx of [-0.55, 0.45]) (ctx.beginPath(), ctx.moveTo(u * lx, -u * 0.5), ctx.lineTo(u * lx + leg * (lx > 0 ? 1 : -1), 0), ctx.stroke());
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.7, u * 0.85, u * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 꼬리
  ctx.beginPath();
  ctx.moveTo(-u * 0.8, -u * 0.8);
  ctx.lineTo(-u * 1.15, -u * (1.2 + 0.2 * Math.sin(t * 0.6)));
  ctx.stroke();
  // 머리
  ctx.beginPath();
  ctx.arc(u * 0.85, -u * (sit ? 1.35 : 1.15), u * 0.45, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b07a4a';
  ctx.beginPath();
  ctx.ellipse(u * 0.62, -u * (sit ? 1.3 : 1.1), u * 0.16, u * 0.32, 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2b2233';
  ctx.beginPath();
  ctx.arc(u * 1.0, -u * (sit ? 1.42 : 1.22), u * 0.07, 0, TAU);
  ctx.arc(u * 1.27, -u * (sit ? 1.3 : 1.1), u * 0.08, 0, TAU);
  ctx.fill();
  if (sit) {
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath();
    ctx.ellipse(u * 1.15, -u * 1.08, u * 0.07, u * 0.12, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawKid(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, scooter: boolean, chase: boolean, t: number) {
  ctx.save();
  ctx.translate(x, y);
  if (scooter) {
    ctx.strokeStyle = '#5d6475';
    ctx.lineWidth = Math.max(1.5, u * 0.12);
    ctx.beginPath();
    ctx.moveTo(-u * 0.8, -u * 0.2);
    ctx.lineTo(u * 0.8, -u * 0.2);
    ctx.lineTo(u * 0.9, -u * 1.9);
    ctx.stroke();
    ctx.fillStyle = '#2b2233';
    for (const wx of [-0.75, 0.8]) (ctx.beginPath(), ctx.arc(u * wx, -u * 0.12, u * 0.14, 0, TAU), ctx.fill());
  }
  const bob = Math.sin(t * 0.3) * u * 0.06;
  ctx.strokeStyle = '#3a4a8a';
  ctx.lineWidth = Math.max(1.5, u * 0.2);
  ctx.beginPath();
  ctx.moveTo(-u * 0.15, -u * 0.3);
  ctx.lineTo(-u * 0.1, -u * 1.1 + bob);
  ctx.moveTo(u * 0.2, -u * 0.3);
  ctx.lineTo(u * 0.1, -u * 1.1 + bob);
  ctx.stroke();
  ctx.fillStyle = '#ff5f57';
  ctx.beginPath();
  ctx.roundRect(-u * 0.35, -u * 1.9 + bob, u * 0.7, u * 0.85, u * 0.2);
  ctx.fill();
  ctx.strokeStyle = '#ffd8b0';
  ctx.lineWidth = Math.max(1.5, u * 0.16);
  ctx.beginPath();
  ctx.moveTo(u * 0.2, -u * 1.7 + bob);
  ctx.lineTo(chase ? u * 0.75 : u * 0.6, chase ? -u * 2.5 : -u * 2.2 + Math.sin(t * 0.2) * u * 0.3);
  ctx.stroke();
  ctx.fillStyle = '#ffd8b0';
  ctx.beginPath();
  ctx.arc(0, -u * 2.25 + bob, u * 0.42, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(0, -u * 2.35 + bob, u * 0.44, Math.PI, TAU);
  ctx.fill();
  ctx.fillRect(0, -u * 2.4 + bob, u * 0.7, u * 0.12);
  ctx.fillStyle = '#2b2233';
  ctx.beginPath();
  ctx.arc(u * 0.18, -u * 2.2 + bob, u * 0.06, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(u * 0.14, -u * 2.02 + bob, u * (chase ? 0.1 : 0.06), 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 트럭 뒤쪽(짐 뒤에 그릴 것): 그림자 · 바퀴 · 차대 · 먼 쪽 옆판 · 바닥 · 앞 벽 */
function drawTruckBack(ctx: CanvasRenderingContext2D, s: TruckState, X: F, Y: F, R: F, t: number) {
  const bx0 = X(BX0 - 0.015), bx1 = X(BX0 + BW * U + 0.02), fy = Y(FY), rail = Y(FY - HT * U);
  // 그림자
  ctx.fillStyle = 'rgba(30,20,40,.25)';
  ctx.beginPath();
  ctx.ellipse(X(0.52), Y(ROAD_Y + 0.005 + s.yb), R(0.5), R(0.022), 0, 0, TAU);
  ctx.fill();
  // 차대
  ctx.fillStyle = '#4a4f5c';
  ctx.fillRect(X(0.05), Y(FY + 0.025), R(0.9), R(0.045));
  // 바퀴
  for (const wx of [WHEEL_R, WHEEL_F]) {
    const cx = X(wx), cy = Y(ROAD_Y - 0.052) + Y(s.yb), r = R(0.052);
    ctx.fillStyle = '#2b2b33';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9ced8';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#7d8aa3';
    ctx.lineWidth = 2;
    const a = s.dist / 0.052;
    for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.moveTo(cx, cy), ctx.lineTo(cx + Math.cos(a + (k * TAU) / 3) * r * 0.48, cy + Math.sin(a + (k * TAU) / 3) * r * 0.48), ctx.stroke());
    // 흙받기
    ctx.fillStyle = TRUCK[2];
    ctx.beginPath();
    ctx.arc(cx, cy - Y(s.yb), r * 1.25, Math.PI, TAU);
    ctx.lineTo(cx + r * 1.25, cy - Y(s.yb) - r * 0.1);
    ctx.fill();
  }
  // 먼 쪽 옆판 (난간 높이 = 뒤 난간)
  const dp = R(0.03);
  ctx.fillStyle = '#4c9fd6';
  ctx.fillRect(bx0 + dp, rail - dp * 0.7, bx1 - bx0, fy - rail);
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 2;
  for (let k = 1; k < 8; k++) (ctx.beginPath(), ctx.moveTo(bx0 + dp + ((bx1 - bx0) * k) / 8, rail - dp * 0.7 + 3), ctx.lineTo(bx0 + dp + ((bx1 - bx0) * k) / 8, fy - dp * 0.7 - 2), ctx.stroke());
  // 바닥 (나무)
  ctx.fillStyle = '#c48b55';
  ctx.beginPath();
  ctx.moveTo(bx0, fy);
  ctx.lineTo(bx0 + dp, fy - dp * 0.7);
  ctx.lineTo(bx1 + dp, fy - dp * 0.7);
  ctx.lineTo(bx1, fy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = TRUCK[0];
  ctx.fillRect(bx0, fy, bx1 - bx0, R(0.028));
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.fillRect(bx0, fy, bx1 - bx0, R(0.005));
  // 앞 벽 (운전석 쪽, 높다)
  const hx = X(BX0 + BW * U), top = Y(FY - HF * U);
  shade(ctx, hx, top, R(0.018), fy - top, dp, '#9aa7b8', '#c9d3de', '#6f7d91');
  ctx.strokeStyle = 'rgba(60,70,90,.5)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 9; k++) (ctx.beginPath(), ctx.moveTo(hx, top + ((fy - top) * k) / 9), ctx.lineTo(hx + R(0.018) + dp, top + ((fy - top) * k) / 9 - dp * 0.7), ctx.stroke());
  void t;
}

/** 트럭 앞쪽(짐 앞에 그릴 것): 뒤 난간 기둥 · 가까운 쪽 난간 · 운전석 · 기사 아저씨 */
function drawTruckFront(ctx: CanvasRenderingContext2D, s: TruckState, X: F, Y: F, R: F, t: number) {
  const bx0 = X(BX0 - 0.015), bx1 = X(BX0 + BW * U + 0.02), fy = Y(FY), rail = Y(FY - HT * U);
  // 뒤 난간 (기둥)
  shade(ctx, bx0 - R(0.012), rail, R(0.016), fy - rail + R(0.028), R(0.012), TRUCK[0], TRUCK[1], TRUCK[2]);
  ctx.fillStyle = '#ff5f57';
  ctx.fillRect(bx0 - R(0.012), fy - R(0.02), R(0.016), R(0.02));
  // 가까운 쪽 난간: 반투명 띠 + 기둥
  ctx.fillStyle = 'rgba(108,195,245,.55)';
  ctx.fillRect(bx0, rail, bx1 - bx0, R(0.016));
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(bx0, rail, bx1 - bx0, R(0.004));
  ctx.fillStyle = 'rgba(63,151,207,.6)';
  for (let k = 1; k < 4; k++) ctx.fillRect(bx0 + ((bx1 - bx0) * k) / 4 - 1.5, rail, 3, fy - rail);
  // 운전석
  const cx0 = X(0.716), cx1 = X(0.982), ct = Y(0.7), cb = Y(FY + 0.03);
  const g = ctx.createLinearGradient(0, ct, 0, cb);
  g.addColorStop(0, TRUCK[1]);
  g.addColorStop(0.4, TRUCK[0]);
  g.addColorStop(1, TRUCK[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx0, cb);
  ctx.lineTo(cx0, ct + R(0.02));
  ctx.quadraticCurveTo(cx0, ct, cx0 + R(0.02), ct);
  ctx.lineTo(cx1 - R(0.06), ct);
  ctx.quadraticCurveTo(cx1 - R(0.01), ct + R(0.01), cx1, ct + R(0.1));
  ctx.lineTo(cx1, cb);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx0, ct + R(0.012), cx1 - cx0 - R(0.05), R(0.01));
  // 창 (기사 아저씨)
  const wx0 = X(0.736), wx1 = X(0.886), wy0 = Y(0.735), wy1 = Y(0.865);
  ctx.fillStyle = '#d9f1ff';
  ctx.beginPath();
  ctx.roundRect(wx0, wy0, wx1 - wx0, wy1 - wy0, R(0.012));
  ctx.fill();
  drawDriver(ctx, s, X(0.812), Y(0.84), R(0.045), t);
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.moveTo(wx0 + R(0.01), wy0 + R(0.005));
  ctx.lineTo(wx0 + R(0.04), wy0 + R(0.005));
  ctx.lineTo(wx0 + R(0.005), wy1 - R(0.02));
  ctx.fill();
  // 앞창
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath();
  ctx.moveTo(X(0.905), wy0);
  ctx.lineTo(X(0.945), wy0);
  ctx.quadraticCurveTo(X(0.968), wy0 + R(0.02), X(0.972), wy1 - R(0.02));
  ctx.lineTo(X(0.905), wy1 - R(0.02));
  ctx.closePath();
  ctx.fill();
  // 문 · 글씨
  ctx.strokeStyle = 'rgba(30,70,110,.45)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(X(0.727), Y(0.725), R(0.172), Y(FY + 0.02 - 0.725));
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(10, R(0.03))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏠 이사', X(0.812), Y(0.93));
  // 전조등 · 범퍼
  ctx.fillStyle = '#fff3a8';
  ctx.beginPath();
  ctx.arc(X(0.968), Y(0.96), R(0.012), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#9aa7b8';
  ctx.fillRect(X(0.948), Y(FY + 0.01), R(0.045), R(0.025));
  // 배기 연기 (달릴 때)
  if (s.phase === 'ride' && s.speed > 0.002)
    for (let k = 0; k < 3; k++) {
      const q = ((t * 0.04 + k / 3) % 1);
      ctx.fillStyle = `rgba(220,220,230,${0.5 * (1 - q)})`;
      ctx.beginPath();
      ctx.arc(X(0.04 - q * 0.08), Y(FY + 0.05 - q * 0.04), R(0.012 + q * 0.02), 0, TAU);
      ctx.fill();
    }
}

/** 기사 아저씨: idle 웃음 · go 힘줌 · worry 눈 동그래짐 · oops 어이쿠 · happy 활짝 · sad 시무룩 · strain 영차 · phew 휴 */
function drawDriver(ctx: CanvasRenderingContext2D, s: TruckState, x: number, y: number, u: number, t: number) {
  const m = s.mood;
  ctx.save();
  ctx.translate(x, y);
  const look = m === 'oops' || m === 'worry' ? -1 : 1;
  ctx.fillStyle = '#3a6fb0';
  ctx.beginPath();
  ctx.roundRect(-u * 0.9, -u * 0.1, u * 1.8, u * 1.2, u * 0.4);
  ctx.fill();
  ctx.fillStyle = '#ffd8b0';
  ctx.beginPath();
  ctx.arc(0, -u * 0.75, u * 0.7, 0, TAU);
  ctx.fill();
  // 모자
  ctx.fillStyle = '#ff5f57';
  ctx.beginPath();
  ctx.arc(0, -u * 0.95, u * 0.72, Math.PI, TAU);
  ctx.fill();
  ctx.fillRect(look > 0 ? 0 : -u * 1.1, -u * 1.0, u * 1.1, u * 0.18);
  // 눈
  ctx.fillStyle = '#2b2233';
  const ex = look * u * 0.22;
  if (m === 'worry' || m === 'oops') {
    ctx.fillStyle = '#ffffff';
    for (const s2 of [-1, 1]) (ctx.beginPath(), ctx.arc(ex + s2 * u * 0.22, -u * 0.8, u * 0.17, 0, TAU), ctx.fill());
    ctx.fillStyle = '#2b2233';
    for (const s2 of [-1, 1]) (ctx.beginPath(), ctx.arc(ex + s2 * u * 0.22 + look * u * 0.05, -u * 0.8, u * 0.07, 0, TAU), ctx.fill());
  } else if (m === 'happy' || m === 'phew') {
    ctx.strokeStyle = '#2b2233';
    ctx.lineWidth = Math.max(1, u * 0.09);
    for (const s2 of [-1, 1]) (ctx.beginPath(), ctx.arc(ex + s2 * u * 0.22, -u * 0.76, u * 0.1, Math.PI, TAU), ctx.stroke());
  } else for (const s2 of [-1, 1]) (ctx.beginPath(), ctx.arc(ex + s2 * u * 0.22, -u * 0.8, u * (m === 'strain' ? 0.04 : 0.07), 0, TAU), ctx.fill());
  // 콧수염 · 입
  ctx.fillStyle = '#5b3a22';
  ctx.beginPath();
  ctx.ellipse(ex - u * 0.12, -u * 0.55, u * 0.2, u * 0.08, 0.2, 0, TAU);
  ctx.ellipse(ex + u * 0.12, -u * 0.55, u * 0.2, u * 0.08, -0.2, 0, TAU);
  ctx.fill();
  if (m === 'oops' || m === 'worry') {
    ctx.fillStyle = '#7a2a2a';
    ctx.beginPath();
    ctx.ellipse(ex, -u * 0.38, u * 0.1, u * (m === 'oops' ? 0.14 : 0.08), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#9fe0ff';
    ctx.beginPath();
    ctx.ellipse(u * 0.62 * -look, -u * 1.0 + ((t * 0.5) % 6), u * 0.08, u * 0.13, 0, 0, TAU);
    ctx.fill();
  } else if (m === 'sad') {
    ctx.strokeStyle = '#7a2a2a';
    ctx.lineWidth = Math.max(1, u * 0.08);
    ctx.beginPath();
    ctx.arc(ex, -u * 0.28, u * 0.14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (m === 'happy') {
    ctx.fillStyle = '#7a2a2a';
    ctx.beginPath();
    ctx.arc(ex, -u * 0.44, u * 0.16, 0, Math.PI);
    ctx.fill();
  }
  // 엄지 척 (도착)
  if (m === 'happy') {
    ctx.fillStyle = '#ffd8b0';
    ctx.beginPath();
    ctx.arc(u * 1.0, -u * 0.3 + Math.sin(t * 0.2) * u * 0.05, u * 0.22, 0, TAU);
    ctx.fill();
    ctx.fillRect(u * 0.92, -u * 0.7 + Math.sin(t * 0.2) * u * 0.05, u * 0.14, u * 0.35);
  }
  ctx.restore();
}

/** 미리 보기: 들고 있는 짐 · 떨어질 줄 · 놓일 자리(고스트) */
function drawPreview(ctx: CanvasRenderingContext2D, s: TruckState, pre: Pre, P: (bx: number, by: number) => [number, number], X: F, Y: F, R: F, font: (sz: number, w?: number) => void, t: number) {
  const u = R(U), it = pre.it;
  const nb = pre.W.b.filter((b) => b.it === pre.idx && !b.dead);
  // 떨어질 줄
  const [hx, hy] = P(pre.x, pre.y0);
  const land = nb.length ? Math.max(...nb.map((b) => b.y + b.hh)) : 0;
  const [, ly] = P(pre.x, land);
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.lineDashOffset = -t * 0.6;
  ctx.beginPath();
  ctx.moveTo(hx, hy + (it.h / 2) * u);
  ctx.lineTo(hx, ly);
  ctx.stroke();
  ctx.setLineDash([]);
  // 다른 짐이 밀려날 자리 (흐린 윤곽)
  for (const b of pre.W.b) {
    if (b.it === pre.idx || b.dead || b.grp >= 0) continue;
    const o = s.W.b[b.id];
    if (o && !o.dead && Math.hypot(o.x - b.x, o.y - b.y) > 0.08) drawBody(ctx, s, b, P, u, 'rgba(255,240,180,.9)');
  }
  // 놓일 자리
  const ok = !nb.some((b) => b.broken) && !pre.W.b.some((b) => b.broken && !s.W.b[b.id]?.broken);
  const col = ok ? '#ffffff' : '#ff6a5a';
  if (it.kind === 'blanket') drawBlanket(ctx, nb, P, u, col);
  else for (const b of nb) drawBody(ctx, s, b, P, u, col);
  // 들고 있는 짐 (반투명)
  ctx.save();
  ctx.globalAlpha = 0.9;
  drawLook(ctx, it, hx, hy, it.w * u, it.h * u, u, { t, mood: 0 });
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(16, R(0.05))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👇', hx, hy - (it.h / 2) * u - R(0.03) + Math.sin(t * 0.2) * 2);
  void X;
  void Y;
  void font;
}

/** 흔들 위험 표시: 노랑 = 흔들흔들(튈 것 같아요) · 빨강 = 이대로 출발하면 떨어지거나 깨져요 */
function drawRisk(ctx: CanvasRenderingContext2D, s: TruckState, W: World, risk: Map<number, number>, P: (bx: number, by: number) => [number, number], R: F, font: (sz: number, w?: number) => void, t: number) {
  const u = R(U), done = new Set<number>();
  for (const b of W.b) {
    const r = risk.get(b.id);
    if (!r || done.has(b.it)) continue;
    if (b.dead && r !== 3) continue;
    done.add(b.it);
    const grp = b.grp >= 0 ? W.b.filter((q) => q.grp === b.grp && !q.dead) : [b];
    const cx = grp.reduce((a, q) => a + q.x, 0) / grp.length, top = Math.max(...grp.map((q) => q.y + q.hh));
    const [x, y] = P(cx, top);
    const red = r >= 2, wob = Math.sin(t * 0.5 + b.id) * 2;
    if (!red) {
      // 흔들흔들 물결
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = 2.5;
      for (const sd of [-1, 1]) {
        const ex = x + sd * (b.hw + 0.12) * u;
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) ctx.lineTo(ex + Math.sin(t * 0.4 + k) * 2.5 * sd, y + k * u * 0.09);
        ctx.stroke();
      }
    }
    const label = r === 3 ? (b.out ? '떨어져요!' : '찌그러져요!') : red ? (s.items[b.it]?.kind === 'pot' || s.items[b.it]?.kind === 'dish' || (W.b[b.id] && b.kind === 'box' && false) ? '깨질 것 같아요' : '떨어질 것 같아요') : '흔들';
    font(0.032, 900);
    const tw = ctx.measureText(label).width + R(0.03);
    const ly = y - R(0.035) + wob;
    ctx.fillStyle = red ? 'rgba(220,50,40,.92)' : 'rgba(255,200,40,.95)';
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = red ? '#ffffff' : '#3a2a00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, ly + 1);
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr2 = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath();
}

function drawHud(ctx: CanvasRenderingContext2D, s: TruckState, d: StageDef, w: number, h: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t;
  // ═════════ 위 띠 ═════════
  const hb = Y(HB);
  ctx.fillStyle = 'rgba(43,34,51,.86)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  font(0.042, 900);
  ctx.fillStyle = '#ffffff';
  const ttl = `${s.stage + 1}/${STAGE_COUNT}판 · ${d.emoji} ${d.name}`;
  ctx.fillText(ttl, R(0.03), hb * 0.53);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd23a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.53);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.53);
  // ═════════ 새것 알림 ═════════
  if (s.news && t - s.news.t < NEWS_T) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20);
    ctx.globalAlpha = a;
    font(0.035, 900);
    ctx.textAlign = 'center';
    const tw = Math.min(w - 10, ctx.measureText(s.news.text).width + 24), by = Y(HB + 0.04);
    ctx.fillStyle = 'rgba(43,34,51,.9)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, by - R(0.025), tw, R(0.05), R(0.025));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.news.text, w / 2, by + 1, w - 24);
    ctx.globalAlpha = 1;
  }
  // ═════════ 판 카드 · 스포트라이트 · 결과 ═════════
  drawSpot(ctx, s, d, w, X, Y, R, font);
  drawCard(ctx, s, d, w, Y, R, font);
  // ═════════ 아래 띠: 별 목표(쉬운 말) + 안내 한 줄 ═════════
  const by0 = Y(BAND);
  const g = ctx.createLinearGradient(0, by0, 0, h);
  g.addColorStop(0, 'rgba(43,34,51,.9)');
  g.addColorStop(1, 'rgba(30,22,38,.96)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, by0, w, h - by0 + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  const lost = outcomeOf(s.W), riding = s.phase === 'ride' || s.phase === 'result';
  const st = [0, 1, 2].slice(0, d.nstar).map((k) => {
    const done = s.phase === 'result' && s.ok;
    const ok = done ? s.starOk[k] : null;
    const bad = k === 1 ? riding && lost.dropped > 0 : k === 2 ? lost.broken > 0 : s.phase === 'result' && !s.ok;
    return { txt: STAR_TEXT[k], ok, bad: ok === null && bad };
  });
  font(0.036, 800);
  const pad = R(0.022), gap = R(0.014), starW = R(0.04);
  let fs = 0.036;
  const total = () => st.reduce((a, c) => a + ctx.measureText(c.txt).width + pad * 2 + starW, 0) + gap * (st.length - 1);
  while (total() > w - R(0.04) && fs > 0.0331) font((fs -= 0.001), 800);
  let x = (w - total()) / 2;
  const cy = Y(BAND + 0.05);
  for (const c of st) {
    const cw = ctx.measureText(c.txt).width + pad * 2 + starW;
    ctx.fillStyle = c.ok ? 'rgba(255,210,58,.28)' : c.bad || c.ok === false ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.1)';
    ctx.beginPath();
    ctx.roundRect(x, cy - R(0.027), cw, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = c.ok ? '#ffd23a' : 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    star(ctx, x + pad + starW * 0.35, cy, R(0.017));
    ctx.fillStyle = c.ok ? '#ffd23a' : c.bad || c.ok === false ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.55)';
    ctx.fill();
    ctx.fillStyle = c.bad || c.ok === false ? 'rgba(255,255,255,.45)' : '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(c.txt, x + pad + starW * 0.85, cy + 1);
    if (c.bad || c.ok === false) {
      ctx.strokeStyle = 'rgba(255,120,110,.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + pad + starW * 0.85, cy + 1);
      ctx.lineTo(x + cw - pad, cy + 1);
      ctx.stroke();
    }
    x += cw + gap;
  }
  // 안내 한 줄
  let hint = d.tip;
  const first = s.stage === 0 && !s.firstTap && s.phase === 'load';
  if (first) hint = '👆 짐칸 위를 꾹 누르면 놓일 자리가 보여요';
  else if (s.phase === 'load' && s.down && canDrop(s)) hint = '떼면 툭! 노랑 = 흔들흔들 · 빨강 = 떨어지거나 깨져요';
  else if (s.phase === 'load' && !s.W.calm) hint = '툭… 자리 잡는 중';
  else if (s.phase === 'check') hint = s.pred && s.pred.dropped + s.pred.broken > 0 ? '출발 전 점검 — 빨간 짐이 위험해요!' : '출발 전 점검 — 꽉 잘 실었어요';
  else if (s.phase === 'ride') hint = s.rt < 40 ? '부릉! 출발해요' : '덜컹덜컹 — 꽉 붙들어!';
  else if (s.phase === 'result') hint = s.ok ? (s.won ? '이사 끝! 모두 고마워해요' : '다음 판엔 새 짐이 와요') : '같은 짐을 다시 — 꾹 눌러 미리 보고 놓아요';
  ctx.textAlign = 'center';
  font(first ? 0.04 : 0.036, 900);
  ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
  ctx.fillText(hint, w / 2, Y(BAND + 0.135), w - R(0.04));
  // 첫 판: 손가락으로 짐칸 가리키기
  if (first && s.pt > INTRO_LOCK) {
    const bob = Math.sin(t * 0.15) * R(0.012);
    ctx.font = `${Math.max(22, R(0.08))}px system-ui`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', X(BX0 + 4.4 * U), Y(FY - 0.9 * U) + bob);
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.beginPath();
    ctx.roundRect(X(BX0), Y(FY - 3.2 * U), R(BW * U), R(3.2 * U), R(0.02));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.textBaseline = 'alphabetic';
}

/** 판 시작 카드(새것 한 줄 + 별 셋을 말로) · 결과 카드(무엇을 해서 땄는지 말로) */
function drawCard(ctx: CanvasRenderingContext2D, s: TruckState, d: StageDef, w: number, Y: F, R: F, font: (sz: number, w?: number) => void) {
  let lines: { text: string; col: string; size: number; star?: number }[] = [], a = 1, cy = 0.47, border = '#ffd23a';
  if (s.phase === 'load' && s.pt < CARD_T && !(s.firstTap && s.taps > 0 && s.lastDrop > s.startT)) {
    a = Math.min(1, s.pt / 8, (CARD_T - s.pt) / 18);
    lines.push({ text: `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.emoji} ${d.name}`, col: '#ffffff', size: 0.05 });
    if (d.key !== 'box') lines.push({ text: d.news, col: '#ffe9a8', size: 0.034 });
    else lines.push({ text: '짐을 다 실으면 트럭이 부릉 출발해요', col: '#ffe9a8', size: 0.035 });
    lines.push({ text: d.nstar === 1 ? '별 하나: 모두 싣고 출발하기' : `별 ${d.nstar}개를 모아요`, col: '#ffffff', size: 0.034 });
    for (let k = 0; k < d.nstar && d.nstar > 1; k++) lines.push({ text: STAR_TEXT[k], col: '#fff6dc', size: 0.034, star: 0 });
    cy = 0.47;
  } else if (s.phase === 'result') {
    const age = s.pt;
    a = Math.min(1, age / 10);
    cy = 0.42;
    if (s.ok) {
      lines.push({ text: s.won ? '🏠 이사 끝!' : '🚚 무사 도착!', col: '#ffe066', size: 0.056 });
      const o = s.dropped, b = s.broken;
      const said = [
        '모두 싣고 출발했어요',
        o === 0 ? '하나도 안 떨어뜨렸어요' : s.catOff && o === 1 ? '고양이가 뛰어내렸어요' : `짐 ${o}개가 길에 떨어졌어요`,
        b === 0 ? '깨진 것 없이 왔어요' : `짐 ${b}개가 깨지거나 찌그러졌어요`,
      ];
      for (let k = 0; k < d.nstar; k++) lines.push({ text: said[k], col: s.starOk[k] ? '#fff6dc' : 'rgba(255,255,255,.55)', size: 0.036, star: s.starOk[k] ? 1 : -1 });
      if (d.nstar < 3) lines.push({ text: '다음 판부터 별이 하나씩 늘어요', col: '#bfeaff', size: 0.032 });
    } else {
      border = '#ff8a7a';
      lines.push({ text: `앗… ${s.why}`, col: '#ffd0c8', size: 0.048 });
      lines.push({ text: s.hearts > 0 ? '하트 하나를 쓰고, 같은 짐을 다시 실어요' : '하트를 다 썼어요 — 끝', col: '#ffffff', size: 0.036 });
      lines.push({ text: '꾹 누르면 흔들릴 짐이 노랗게 보여요', col: '#ffe9a8', size: 0.032 });
    }
  } else return;
  if (!lines.length) return;
  ctx.save();
  ctx.globalAlpha = a;
  const lh = lines.map((l) => R(l.size) * 1.45), H = lh.reduce((p, q) => p + q, 0) + R(0.04);
  let mw = 0;
  for (const l of lines) font(l.size, 900), (mw = Math.max(mw, ctx.measureText(l.text).width + (l.star !== undefined ? R(0.06) : 0)));
  const W2 = Math.min(w - R(0.04), mw + R(0.08)), x0 = w / 2 - W2 / 2, y0 = Y(cy) - H / 2;
  ctx.fillStyle = 'rgba(43,34,51,.9)';
  ctx.beginPath();
  ctx.roundRect(x0, y0, W2, H, R(0.03));
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();
  let y = y0 + R(0.02);
  lines.forEach((l, i) => {
    font(l.size, i === 0 ? 900 : 800);
    const mid = y + lh[i] / 2;
    ctx.textBaseline = 'middle';
    if (l.star !== undefined) {
      const tw = ctx.measureText(l.text).width, sx = w / 2 - (tw + R(0.06)) / 2;
      const k = i - 1, ag = s.phase === 'result' ? s.pt - 12 - k * 12 : 99, pop = ag >= 0 && ag < 8 ? 1.8 - 0.8 * (ag / 8) : 1;
      if (ag >= 0) {
        ctx.save();
        ctx.translate(sx + R(0.02), mid);
        ctx.scale(pop, pop);
        star(ctx, 0, 0, R(0.019));
        ctx.fillStyle = l.star === 1 ? '#ffd23a' : l.star === -1 ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.6)';
        ctx.fill();
        ctx.restore();
        if (l.star === 1 && ag === 0) juice(s).burst(sx + R(0.02), mid, '#ffe066', 14, 3, 2.4);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = l.col;
      ctx.fillText(l.text, sx + R(0.055), mid + 1);
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = l.col;
      ctx.fillText(l.text, w / 2, mid + 1, W2 - R(0.03));
    }
    y += lh[i];
  });
  ctx.restore();
}

/** NEW 스포트라이트: 새 짐이 처음 나오는 판에, 카드 뒤 2초쯤 주변을 어둡게 하고 새것을 비춘다 */
function drawSpot(ctx: CanvasRenderingContext2D, s: TruckState, d: StageDef, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  if (s.again || s.phase !== 'load' || !d.spot || s.down) return;
  const age = s.pt, T0 = CARD_T - 10, T1 = CARD_T + 130;
  if (age < T0 || age > T1) return;
  let x = -1, y = -1, rr2 = 0.09;
  if (d.key === 'cat') (x = 0.25), (y = PORCH_Y - 0.03);
  else if (d.key === 'road') (x = 0.84), (y = 1.17), (rr2 = 0.1);
  else {
    const code = d.items.split('');
    // 줄에서 그 새 짐이 몇 번째에 보이나
    let px = 0.6;
    for (let k = 0; k < 4; k++) {
      const i = s.next + k;
      if (i >= s.items.length) break;
      const it = s.items[i], sc = k === 0 ? 1.15 : 0.9;
      const isNew = (d.key === 'heavy' && it.look === 'fridge') || it.kind === d.key || (d.key === 'blanket' && it.kind === 'blanket');
      if (isNew) {
        x = px - (it.w * U * QS * sc) / 2;
        y = PORCH_Y - (it.h * U * QS * sc) / 2;
        rr2 = Math.max(0.07, it.w * U * QS * 0.62);
        break;
      }
      px -= it.w * U * QS * sc + 0.02;
    }
    void code;
  }
  if (x < 0) return;
  const a = Math.min(1, (age - T0) / 10, (T1 - age) / 18), cx = X(x), cy = Y(y), r = R(rr2) * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20,10,30,.6)';
  ctx.beginPath();
  ctx.rect(0, Y(HB), w, Y(BAND - HB));
  ctx.arc(cx, cy, r, 0, TAU, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff1a8';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -age;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  font(0.034, 900);
  let fs = 0.034;
  while (ctx.measureText(d.spot).width > w - R(0.08) && fs > 0.0331) font((fs -= 0.001), 900);
  const tw = ctx.measureText(d.spot).width + R(0.05), ly = cy + r + R(0.06), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
  ctx.fillStyle = 'rgba(60,24,90,.96)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.03), tw, R(0.06), R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(d.spot, lx, ly + 1);
  font(0.03, 900);
  const nb = 'NEW!', nw = ctx.measureText(nb).width + R(0.03);
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.055), nw, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw / 2, ly - R(0.034));
  ctx.restore();
}
