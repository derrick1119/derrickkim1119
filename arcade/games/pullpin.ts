/**
 * 경단 핀 뽑기 (26라운드: 검증된 캐주얼 뼈대 × 공장의 와우) — 핀 뽑기 × 가리키기(톡) × 연쇄(물들기).
 * 떡집 부엌 디오라마: 벽 선반의 유리 단지마다 경단이 들어 있고, 단지 목은 대나무 꼬치(핀)로 막혀 있다.
 * 기준 9(손이 하는 일은 하나): 꼬치를 톡 → 쑥 빠지며 단지 목이 열려 경단이 데굴데굴 굴러 내려간다(되돌릴 수 없음).
 *   누르고 있는 동안 그 꼬치를 뺐을 때 굴러갈 길(점선)과 도착할 곳·일어날 일(물듦·매워!·냠)이 미리 보인다. 꼬치 밖에서 떼면 취소.
 *   키보드는 화살표 커서 + 스페이스.
 * 물리(결정적, 고정 틱, 위치 기반 구슬 충돌·중력): 경단·고춧가루 알갱이가 서로 밀치고 대나무 홈통을 굴러 그릇에 담긴다.
 *   회색 반죽은 색 경단에 닿으면 그 색으로 물들고, 물든 반죽이 또 옆 반죽을 물들인다(연쇄 — 한 덩이가 와르르 물든다).
 *   고춧가루가 경단에 닿으면 매운 경단(빨개져 땀 뻘뻘)이 되고 매운맛도 붙은 경단끼리 번진다.
 *   그릇에 회색 반죽·고춧가루·매운 경단이 들어가면 그 판은 망침(할머니 얼굴이 새빨개짐).
 * 판 8개: 목표 = 그릇에 색 경단 N개. 꼬치를 다 뽑거나 경단이 다 담기면 판정.
 *   ★ 목표 N개 · ★ 가득(경단 전부 — 하나도 안 잃기) · ★ 한 번에(이 판에서 하트를 안 잃기).
 *   실패 = 하트 -1, 그 판을 처음부터. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1 첫 경단(톡 → 데굴데굴) → 2 회색 반죽(색 경단을 먼저 떨궈 물들이기)
 *   → 3 고춧가루(대각선 꼬치로 김치 항아리에 먼저 버리기 — 그 뒤에 꼬치를 빼서 길을 바꾸기)
 *   → 4 저울 칸(무게가 차야 열림 — 마지막에 남는 덩이가 없게 모아서 보내기)
 *   → 5 두 그릇(왼쪽 분홍·오른쪽 쑥 — 회색을 먼저 왼쪽 색으로 물들여 보내고, 길을 바꿔 다른 색)
 *   → 6 생쥐(지나가는 경단을 냠 — 고춧가루로 먼저 '에취!' 쫓아내기) → 7 매운 저울(저울 + 고춧가루) → 8 잔칫날(전부).
 * 웃음: 떡장수 할머니가 경단이 굴러가면 눈이 동그래지고, 그릇이 차면 덩실, 매우면 얼굴이 새빨개져 김이 폴폴,
 *   회색 반죽이 들어가면 '이게 뭐여?'. 선반 위 고양이는 굴러가는 경단을 고개로 따라간다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 경단 반지름 · 고춧가루 반지름 · 벽 두께(반) · 꼬치 두께(반) */
const RB = 0.027, RP = 0.0155, WR = 0.008, PR = 0.011;
const GRAV = 0.0011, VMAX = 0.02, DAMP = 0.997, ITER = 3, DELAY = 5, SLEEP = 16;
const LOST_Y = 1.24, HIT = 0.062;
const NEWS_T = 210, RESULT_OK = 190, RESULT_FAIL = 170;
const NC = 4;
export const COLS = ['#ff8db4', '#86c95f', '#ffcf4a', '#a983e0'];
const CNAME = ['분홍', '쑥', '단호박', '흑임자'];
const GRAYC = '#a7a3a0', PEPC = '#d8321f';

// ───────────────────────────── 판 모양(레이아웃) ─────────────────────────────
/** look: 0 유리 · 1 대나무 홈통 · 2 나무 */
interface Seg { ax: number; ay: number; bx: number; by: number; r: number; pin: number; look: number }
/** kind 0 단지 목 꼬치 · 1 대각선 꼬치 · 2 저울 바닥 */
interface Pin { seg: number; kind: number; hx: number; hy: number; ux: number; uy: number; ch: number }
interface Ch { cx: number; top: number; w: number; h: number; neck: number; yb: number; fy: number; x0: number; x1: number; pin: number; W: number }
interface Bowl { x: number; y: number; hw: number }
interface Pot { x: number; y: number; hw: number }
interface Mouse { x: number; y: number; R: number; cap: number; hx: number; hy: number }
export interface Lay { segs: Seg[]; pins: Pin[]; chs: Ch[]; bowls: Bowl[]; pot: Pot | null; mouse: Mouse | null; syrup: { x: number; y: number; R: number } | null; tap: number[]; order: number[] }

const mkLay = (): Lay => ({ segs: [], pins: [], chs: [], bowls: [], pot: null, mouse: null, syrup: null, tap: [], order: [] });
function wall(L: Lay, ax: number, ay: number, bx: number, by: number, look = 1) {
  L.segs.push({ ax, ay, bx, by, r: look === 1 ? WR * 1.3 : WR, pin: -1, look });
}
function addPin(L: Lay, ax: number, ay: number, bx: number, by: number, kind: number, hx: number, hy: number, ch: number) {
  const p = L.pins.length, ux = hx - (ax + bx) / 2, uy = hy - (ay + by) / 2, ul = Math.hypot(ux, uy) || 1;
  L.segs.push({ ax, ay, bx, by, r: kind === 2 ? WR : PR, pin: p, look: 3 });
  L.pins.push({ seg: L.segs.length - 1, kind, hx, hy, ux: ux / ul, uy: uy / ul, ch });
  if (kind !== 2) L.tap.push(p);
  return p;
}
/** 깔때기 단지: 곧은 벽 + 깔때기 + 목을 막는 꼬치(손잡이는 side 쪽) */
function jar(L: Lay, cx: number, top: number, w: number, h: number, neck: number, side: number) {
  const x0 = cx - w / 2, x1 = cx + w / 2, yb = top + h, fy = yb + ((w - neck) / 2) * 0.72;
  wall(L, x0, top, x0, yb, 0);
  wall(L, x0, yb, cx - neck / 2, fy, 0);
  wall(L, x1, top, x1, yb, 0);
  wall(L, x1, yb, cx + neck / 2, fy, 0);
  const ci = L.chs.length;
  const pin = addPin(L, cx - neck / 2 - 0.014, fy + 0.003, cx + neck / 2 + 0.014, fy + 0.003, 0, cx + side * (neck / 2 + 0.09), fy + 0.003, ci);
  L.chs.push({ cx, top, w, h, neck, yb, fy, x0, x1, pin, W: 0 });
  return ci;
}
/** 저울 칸: 곧은 벽 + 납작한 저울 바닥(무게가 W 이상이면 저절로 열림) */
function scaleCh(L: Lay, cx: number, top: number, w: number, h: number) {
  const x0 = cx - w / 2, x1 = cx + w / 2, fy = top + h;
  wall(L, x0, top, x0, fy, 0);
  wall(L, x1, top, x1, fy, 0);
  const ci = L.chs.length;
  const pin = addPin(L, x0, fy, x1, fy, 2, cx, fy + 0.05, ci);
  L.chs.push({ cx, top, w, h, neck: w, yb: fy, fy, x0, x1, pin, W: 1 });
  return ci;
}
/** 대각선 꼬치: a쪽 끝 너머에 손잡이 */
function diag(L: Lay, ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx, dy = ay - by, d = Math.hypot(dx, dy);
  return addPin(L, ax, ay, bx, by, 1, ax + (dx / d) * 0.07, ay + (dy / d) * 0.07, -1);
}
function bowl(L: Lay, x: number, hw: number) {
  const y = 1.1;
  L.bowls.push({ x, y, hw });
  wall(L, x - hw - 0.022, y - 0.012, x - hw + 0.004, y + 0.07, 2);
  wall(L, x + hw + 0.022, y - 0.012, x + hw - 0.004, y + 0.07, 2);
}
function pot(L: Lay, x: number, hw: number) {
  const y = 1.08;
  L.pot = { x, y, hw };
  wall(L, x - hw - 0.016, y - 0.01, x - hw + 0.004, y + 0.06, 2);
  wall(L, x + hw + 0.016, y - 0.01, x + hw - 0.004, y + 0.06, 2);
}
function done(L: Lay) {
  L.order = L.chs.map((_, i) => i).sort((a, b) => L.chs[b].fy - L.chs[a].fy);
  return L;
}

/** 단지 안 내용: k 0 색 경단(c 색) · 1 회색 반죽 · 2 고춧가루 */
interface Fill { k: number; n: number; c: number }
interface Variant { fills: (Fill | null)[]; N: number; W?: number; bc?: number[] }
interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  lay(): Lay;
  /** 이 판의 내용물 후보 하나 (r로 흔든다) */
  make(r: Rng): Variant;
}

const two = (r: Rng) => {
  const a = Math.floor(r() * NC);
  let b = Math.floor(r() * (NC - 1));
  if (b >= a) b++;
  return [a, b];
};
const F = (k: number, n: number, c = 0): Fill => ({ k, n, c });

export const STAGES: StageDef[] = [
  {
    key: 'first', name: '첫 경단', emoji: '🍡', news: '🍡 꼬치를 톡 → 쑥 빠지면 경단이 데굴데굴!', tip: '🍡 꼬치를 톡 — 경단이 그릇으로 데굴데굴',
    lay: () => {
      const L = mkLay();
      jar(L, 0.3, 0.2, 0.28, 0.17, 0.11, -1);
      jar(L, 0.7, 0.2, 0.28, 0.17, 0.11, 1);
      wall(L, 0.1, 0.62, 0.435, 0.86);
      wall(L, 0.9, 0.62, 0.565, 0.86);
      bowl(L, 0.5, 0.15);
      return done(L);
    },
    make: (r) => {
      const [a, b] = two(r);
      return { fills: [F(0, 7, a), F(0, 7, b)], N: 9 };
    },
  },
  {
    key: 'gray', name: '회색 반죽', emoji: '⚪', news: '⚪ 회색 반죽 — 색 경단에 닿으면 그 색으로 물들어요', tip: '⚪ 회색은 그릇에 들어가면 망쳐요 — 색 경단을 먼저 떨궈 물들여요',
    lay: () => {
      const L = mkLay();
      jar(L, 0.5, 0.15, 0.26, 0.13, 0.11, -1);
      jar(L, 0.5, 0.42, 0.34, 0.12, 0.11, 1);
      jar(L, 0.83, 0.3, 0.22, 0.14, 0.1, 1);
      wall(L, 0.06, 0.74, 0.435, 0.92);
      wall(L, 0.96, 0.68, 0.565, 0.92);
      bowl(L, 0.5, 0.15);
      return done(L);
    },
    make: (r) => {
      const [a, b] = two(r);
      return { fills: [F(0, 6, a), F(1, 5), F(0, 4, b)], N: 9 };
    },
  },
  {
    key: 'pepper', name: '고춧가루', emoji: '🌶️', news: '🌶️ 고춧가루 — 경단에 묻거나 그릇에 들어가면 매워요!', tip: '🌶️ 고춧가루는 대각선 꼬치를 타고 🏺 김치 항아리로',
    lay: () => {
      const L = mkLay();
      jar(L, 0.66, 0.12, 0.24, 0.13, 0.1, 1);
      jar(L, 0.39, 0.17, 0.24, 0.13, 0.1, -1);
      diag(L, 0.82, 0.42, 0.17, 0.59);
      jar(L, 0.52, 0.64, 0.48, 0.11, 0.11, 1);
      wall(L, 0.03, 0.5, 0.03, 1.07, 2);
      pot(L, 0.13, 0.09);
      bowl(L, 0.52, 0.15);
      return done(L);
    },
    make: (r) => {
      const [a, b] = two(r);
      const swap = r() < 0.5, gray = r() < 0.7;
      const top = F(0, 5 + Math.floor(r() * 2), a), pep = F(2, 13);
      return { fills: swap ? [pep, top, gray ? F(1, 5) : F(0, 5, b)] : [top, pep, gray ? F(1, 5) : F(0, 5, b)], N: 8 };
    },
  },
  {
    key: 'scale', name: '저울 칸', emoji: '⚖️', news: '⚖️ 저울 칸 — 경단이 숫자만큼 모여야 덜컥 열려요', tip: '⚖️ 마지막에 저울에 남는 경단이 없게 — 모아서 보내요',
    lay: () => {
      const L = mkLay();
      jar(L, 0.36, 0.12, 0.22, 0.1, 0.1, -1);
      jar(L, 0.36, 0.33, 0.24, 0.1, 0.1, -1);
      jar(L, 0.64, 0.14, 0.22, 0.1, 0.1, 1);
      jar(L, 0.64, 0.33, 0.24, 0.1, 0.1, 1);
      scaleCh(L, 0.5, 0.6, 0.4, 0.17);
      wall(L, 0.28, 0.84, 0.425, 0.98);
      wall(L, 0.72, 0.84, 0.575, 0.98);
      bowl(L, 0.5, 0.15);
      return done(L);
    },
    make: (r) => {
      const [a, b] = two(r);
      const g2 = r() < 0.3;
      const kinds = [F(1, 2 + Math.floor(r() * 3)), F(0, 2 + Math.floor(r() * 4), a), F(0, 2 + Math.floor(r() * 4), b), g2 ? F(1, 2) : F(0, 2 + Math.floor(r() * 3), r() < 0.5 ? a : b)];
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      return { fills: [...kinds, null], N: 7, W: 5 + Math.floor(r() * 4) };
    },
  },
  {
    key: 'two', name: '두 그릇', emoji: '🎨', news: '🎨 두 그릇 — 그릇 색과 같은 경단만! 다른 색이 섞이면 망쳐요', tip: '🎨 회색은 먼저 만난 색으로 물들어요 — 꼬치로 길을 바꿔요',
    lay: () => {
      const L = mkLay();
      jar(L, 0.24, 0.17, 0.24, 0.12, 0.1, -1);
      jar(L, 0.76, 0.12, 0.24, 0.12, 0.1, 1);
      wall(L, 0.13, 0.4, 0.425, 0.5);
      wall(L, 0.87, 0.355, 0.575, 0.455);
      jar(L, 0.5, 0.5, 0.26, 0.11, 0.1, -1);
      diag(L, 0.62, 0.72, 0.3, 0.8);
      wall(L, 0.17, 0.74, 0.17, 0.99, 2);
      wall(L, 0.33, 0.86, 0.6, 0.93);
      wall(L, 0.33, 0.815, 0.33, 0.86, 2);
      wall(L, 0.7, 0.82, 0.7, 1.0, 2);
      bowl(L, 0.25, 0.12);
      bowl(L, 0.63, 0.12);
      return done(L);
    },
    make: (r) => {
      const [a, b] = two(r);
      const left = r() < 0.5 ? a : b;
      return { fills: [F(0, 4 + Math.floor(r() * 2), a), F(0, 4 + Math.floor(r() * 2), b), F(1, 4)], N: 9, bc: [left, left === a ? b : a] };
    },
  },
  {
    key: 'mouse', name: '생쥐', emoji: '🐭', news: '🐭 생쥐 — 지나가는 경단을 냠냠! 고춧가루엔 에취!', tip: '🐭 고춧가루로 먼저 쫓아내요 — 그다음 김치 항아리 길을 닫아요',
    lay: () => {
      const L = mkLay();
      jar(L, 0.22, 0.12, 0.22, 0.12, 0.1, -1);
      jar(L, 0.5, 0.17, 0.22, 0.12, 0.1, -1);
      jar(L, 0.78, 0.12, 0.22, 0.12, 0.1, 1);
      wall(L, 0.06, 0.38, 0.45, 0.5);
      wall(L, 0.94, 0.38, 0.55, 0.5);
      wall(L, 0.04, 0.3, 0.04, 0.39, 2);
      wall(L, 0.96, 0.3, 0.96, 0.39, 2);
      wall(L, 0.36, 0.58, 0.8, 0.7);
      wall(L, 0.9, 0.6, 0.9, 0.9, 2);
      diag(L, 0.89, 0.785, 0.2, 0.93);
      wall(L, 0.03, 0.84, 0.03, 1.07, 2);
      wall(L, 0.93, 0.95, 0.62, 1.02);
      L.mouse = { x: 0.84, y: 0.72, R: 0.08, cap: 3, hx: 0.9, hy: 0.72 };
      pot(L, 0.13, 0.09);
      bowl(L, 0.47, 0.15);
      return done(L);
    },
    make: (r) => {
      const [a, b] = two(r);
      const f = [F(0, 5 + Math.floor(r() * 2), a), F(2, 12), F(0, 5 + Math.floor(r() * 2), b)];
      for (let i = f.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [f[i], f[j]] = [f[j], f[i]];
      }
      return { fills: f, N: 7 };
    },
  },
  {
    key: 'syrup', name: '조청 홈통', emoji: '🍯', news: '🍯 조청 홈통 — 맨 처음 지나가는 것이 찰싹 달라붙어요', tip: '🍯 고춧가루를 먼저 조청에 붙여 고추장으로! 그다음 경단',
    lay: () => {
      const L = mkLay();
      jar(L, 0.25, 0.12, 0.22, 0.11, 0.1, -1);
      jar(L, 0.25, 0.34, 0.26, 0.11, 0.1, -1);
      jar(L, 0.75, 0.12, 0.22, 0.11, 0.1, 1);
      jar(L, 0.75, 0.34, 0.26, 0.11, 0.1, 1);
      wall(L, 0.07, 0.6, 0.445, 0.72);
      wall(L, 0.93, 0.6, 0.555, 0.72);
      wall(L, 0.05, 0.52, 0.05, 0.61, 2);
      wall(L, 0.95, 0.52, 0.95, 0.61, 2);
      wall(L, 0.6, 0.77, 0.36, 0.88);
      wall(L, 0.24, 0.8, 0.24, 1.0, 2);
      L.syrup = { x: 0.5, y: 0.79, R: 0.065 };
      bowl(L, 0.38, 0.15);
      return done(L);
    },
    make: (r) => {
      const [a, b] = two(r);
      const f = [F(0, 4 + Math.floor(r() * 2), a), F(1, 4), F(2, 10), F(0, 4 + Math.floor(r() * 2), b)];
      for (let i = f.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [f[i], f[j]] = [f[j], f[i]];
      }
      return { fills: f, N: 8 };
    },
  },
  {
    key: 'party', name: '잔칫날', emoji: '🎉', news: '🎉 잔칫날 — 회색·고춧가루·생쥐가 한 판에!', tip: '🎉 무엇을 먼저? 고춧가루·물들이기·생쥐를 다 따져요',
    lay: () => {
      const L = mkLay();
      jar(L, 0.22, 0.11, 0.22, 0.1, 0.1, -1);
      jar(L, 0.22, 0.3, 0.26, 0.1, 0.1, -1);
      jar(L, 0.74, 0.11, 0.22, 0.1, 0.1, 1);
      jar(L, 0.74, 0.3, 0.26, 0.1, 0.1, 1);
      wall(L, 0.06, 0.5, 0.45, 0.6);
      wall(L, 0.94, 0.5, 0.55, 0.6);
      wall(L, 0.04, 0.42, 0.04, 0.51, 2);
      wall(L, 0.96, 0.42, 0.96, 0.51, 2);
      wall(L, 0.36, 0.66, 0.8, 0.76);
      wall(L, 0.9, 0.66, 0.9, 0.93, 2);
      diag(L, 0.89, 0.84, 0.2, 0.96);
      wall(L, 0.03, 0.88, 0.03, 1.07, 2);
      wall(L, 0.93, 0.99, 0.64, 1.05);
      L.mouse = { x: 0.84, y: 0.78, R: 0.08, cap: 3, hx: 0.9, hy: 0.78 };
      pot(L, 0.13, 0.09);
      bowl(L, 0.48, 0.15);
      return done(L);
    },
    make: (r) => {
      const [a, b] = two(r);
      const f = [F(0, 4 + Math.floor(r() * 2), a), F(1, 3 + Math.floor(r() * 2)), F(2, 11), F(0, 4 + Math.floor(r() * 2), b)];
      for (let i = f.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [f[i], f[j]] = [f[j], f[i]];
      }
      return { fills: f, N: 8 };
    },
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 물리 ─────────────────────────────
/** st: 0 굴러다님 · 1 그릇 · 2 항아리 · 3 떨어짐 · 4 생쥐가 먹음 · 5 조청에 붙음 */
export interface Ball { x: number; y: number; px: number; py: number; r: number; k: number; c: number; hot: boolean; st: number; still: number; tD: number; rot: number; bi: number; tc: number; sx: number; sy: number; slot: number; id: number; kk: number }
export interface WEv { k: string; x: number; y: number; c?: number; n?: number }
export interface World {
  b: Ball[]; on: number; t: number; calm: number; quiet: number; chain: number; fail: string;
  bowlN: number[]; bowlAll: number[]; potN: number; lost: number; eaten: number; mouseOn: boolean; mouseCool: number; mouseT: number;
  scaleT: number[]; scaleOpen: number[]; scaleN: number[]; out: WEv[]; pulled: number; syrupOn: boolean; syrupT: number;
}

function activeSegs(L: Lay, on: number) {
  return L.segs.filter((sg) => sg.pin < 0 || (on >> sg.pin) & 1);
}
const segCache = new WeakMap<Lay, Map<number, Seg[]>>();
function segsOn(L: Lay, on: number) {
  let m = segCache.get(L);
  if (!m) segCache.set(L, (m = new Map()));
  let a = m.get(on);
  if (!a) m.set(on, (a = activeSegs(L, on)));
  return a;
}
/** 공 하나를 벽에서 밀어낸다 */
function pushOut(b: { x: number; y: number; r: number }, sg: Seg) {
  const ex = sg.bx - sg.ax, ey = sg.by - sg.ay, l2 = ex * ex + ey * ey;
  let q = ((b.x - sg.ax) * ex + (b.y - sg.ay) * ey) / l2;
  q = q < 0 ? 0 : q > 1 ? 1 : q;
  const cx = sg.ax + ex * q, cy = sg.ay + ey * q, dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy, m = b.r + sg.r;
  if (d2 >= m * m || d2 < 1e-12) return false;
  const d = Math.sqrt(d2), o = (m - d) / d;
  b.x += dx * o;
  b.y += dy * o;
  return true;
}
const inBox = (sg: Seg, x: number, y: number, m: number) =>
  x > Math.min(sg.ax, sg.bx) - m && x < Math.max(sg.ax, sg.bx) + m && y > Math.min(sg.ay, sg.by) - m && y < Math.max(sg.ay, sg.by) + m;

function chAt(L: Lay, x: number, y: number) {
  for (let i = 0; i < L.chs.length; i++) {
    const c = L.chs[i];
    if (x > c.x0 - 0.005 && x < c.x1 + 0.005 && y > c.top - 0.09 && y < c.fy + 0.02) return i;
  }
  return -1;
}

export function newWorld(L: Lay, v: Variant): World {
  const W: World = {
    b: [], on: (1 << L.pins.length) - 1, t: 0, calm: 0, quiet: 0, chain: -99, fail: '',
    bowlN: L.bowls.map(() => 0), bowlAll: L.bowls.map(() => 0), potN: 0, lost: 0, eaten: 0, mouseOn: !!L.mouse, mouseCool: 0, mouseT: -99,
    scaleT: L.chs.map(() => 0), scaleOpen: L.chs.map(() => -1), scaleN: L.chs.map(() => 0), out: [], pulled: 0, syrupOn: !!L.syrup, syrupT: -1,
  };
  v.fills.forEach((f, ci) => {
    if (!f) return;
    const pts = packJar(L.chs[ci], f.k === 2 ? RP : RB, f.n);
    for (const [x, y] of pts) W.b.push({ x, y, px: x, py: y, r: f.k === 2 ? RP : RB, k: f.k, c: f.c, hot: false, st: 0, still: 0, tD: -99, rot: (W.b.length * 1.7) % 6.28, bi: -1, tc: 0, sx: 0, sy: 0, slot: 0, id: W.b.length, kk: 0 });
  });
  for (let k = 0; k < 140; k++) stepWorld(L, W, v);
  W.t = 0;
  W.out = [];
  return W;
}
/** 단지 안에 n개를 아래부터 촘촘히 */
function packJar(c: Ch, r: number, n: number): number[][] {
  const out: number[][] = [], sp = r * 2 + 0.002, dy = sp * 0.87, m = r + WR + 0.003;
  for (let row = 0; out.length < n && row < 40; row++) {
    const y = c.fy - r - PR - 0.006 - row * dy;
    // 깔때기 안이면 그 높이의 벽 사이
    let xl = c.x0 + m, xr = c.x1 - m;
    if (y > c.yb) {
      const q = (y - c.yb) / Math.max(1e-6, c.fy - c.yb);
      xl = c.x0 + (c.cx - c.neck / 2 - c.x0) * q + m * 1.25;
      xr = c.x1 - (c.x1 - c.cx - c.neck / 2) * q - m * 1.25;
    }
    if (xr < xl) continue;
    const cnt = Math.max(1, Math.floor((xr - xl) / sp) + 1), off = (xr - xl - (cnt - 1) * sp) / 2 + (row % 2 ? sp * 0.25 : -sp * 0.25) * (cnt > 1 ? 1 : 0);
    const xs: number[] = [];
    for (let i = 0; i < cnt; i++) xs.push(Math.max(xl, Math.min(xr, xl + off + i * sp)));
    xs.sort((a, b) => Math.abs(a - c.cx) - Math.abs(b - c.cx));
    for (const x of xs) if (out.length < n) out.push([x, y]);
  }
  return out;
}

function touch(W: World, a: Ball, b: Ball) {
  const t = W.t;
  if (a.st || b.st) return;
  if (a.k === 2 || b.k === 2) {
    if (a.k === 2 && b.k === 2) return;
    const o = a.k === 2 ? b : a;
    if (!o.hot) (o.hot = true), (o.tD = t), (W.chain = t), W.out.push({ k: 'hot', x: o.x, y: o.y });
    return;
  }
  if (a.hot !== b.hot) {
    const h = a.hot ? a : b, o = a.hot ? b : a;
    if (t - h.tD >= DELAY) (o.hot = true), (o.tD = t), (W.chain = t), W.out.push({ k: 'hot', x: o.x, y: o.y });
    return;
  }
  if (a.hot) return;
  if (a.k === 1 && b.k === 0 && t - b.tD >= DELAY) (a.k = 0), (a.c = b.c), (a.tD = t), (W.chain = t), W.out.push({ k: 'dye', x: a.x, y: a.y, c: a.c });
  else if (b.k === 1 && a.k === 0 && t - a.tD >= DELAY) (b.k = 0), (b.c = a.c), (b.tD = t), (W.chain = t), W.out.push({ k: 'dye', x: b.x, y: b.y, c: b.c });
}

const order: number[] = [];
export function stepWorld(L: Lay, W: World, v: Variant) {
  W.t++;
  const B = W.b, segs = segsOn(L, W.on);
  let awake = 0;
  for (const b of B) {
    if (b.st) continue;
    if (b.still > SLEEP) continue;
    let vx = (b.x - b.px) * DAMP, vy = (b.y - b.py) * DAMP + GRAV;
    const sp = Math.hypot(vx, vy);
    if (sp > VMAX) (vx *= VMAX / sp), (vy *= VMAX / sp);
    b.px = b.x;
    b.py = b.y;
    b.x += vx;
    b.y += vy;
    b.kk = 0;
    awake++;
  }
  const chainOn = W.t - W.chain <= DELAY + 2;
  if (awake || chainOn) {
    order.length = 0;
    for (let i = 0; i < B.length; i++) if (!B[i].st) order.push(i);
    order.sort((i, j) => B[i].x - B[j].x);
    for (let it = 0; it < ITER; it++) {
      const last = it === ITER - 1;
      for (let oi = 0; oi < order.length; oi++) {
        const a = B[order[oi]], aS = a.still > SLEEP;
        for (let oj = oi + 1; oj < order.length; oj++) {
          const b = B[order[oj]], m = a.r + b.r;
          if (b.x - a.x > m + 0.004) break;
          const bS = b.still > SLEEP;
          const dx = b.x - a.x, dy = b.y - a.y;
          if (dy > m + 0.004 || dy < -m - 0.004) continue;
          const d2 = dx * dx + dy * dy;
          if (aS && bS) {
            if (last && chainOn && d2 < (m + 0.004) * (m + 0.004)) touch(W, a, b);
            continue;
          }
          // 잠든 공 옆에서 이웃이 움직이면 깨운다 (받쳐 주던 더미가 빠져나가면 같이 굴러가게)
          if ((aS || bS) && it === 0 && d2 < (m + 0.012) * (m + 0.012)) {
            const w = aS ? b : a, z = aS ? a : b, vx = w.x - w.px, vy = w.y - w.py;
            if (vx * vx + vy * vy > 1e-6 && !z.st) z.still = 0;
          }
          if (d2 < m * m && d2 > 1e-12) {
            const d = Math.sqrt(d2), o = (m - d) / d;
            let ma = a.k === 2 ? 0.3 : 1, mb = b.k === 2 ? 0.3 : 1;
            if (aS) ma *= 4;
            if (bS) mb *= 4;
            const wa = mb / (ma + mb), wb = ma / (ma + mb);
            a.x -= dx * o * wa;
            a.y -= dy * o * wa;
            b.x += dx * o * wb;
            b.y += dy * o * wb;
            a.kk += (m - d) * wa;
            b.kk += (m - d) * wb;
          }
          if (last && d2 < (m + 0.004) * (m + 0.004)) touch(W, a, b);
        }
      }
      for (const b of B) {
        if (b.st || b.still > SLEEP) continue;
        for (const sg of segs) if (inBox(sg, b.x, b.y, b.r + sg.r)) pushOut(b, sg);
      }
    }
    // 깊이 파고든 충돌은 튕겨 나가지 않게 (위치 보정이 속도로 바뀌어 옆으로 튀는 것 막기)
    for (const b of B)
      if (!b.st && b.kk > 0.005) {
        b.px = b.x - (b.x - b.px) * 0.55;
        b.py = b.y - (b.y - b.py) * 0.55;
      }
  }
  // 잠·회전·잡히기
  let moving = 0, fast = 0;
  const M = L.mouse;
  for (const b of B) {
    if (b.st) continue;
    const dx = b.x - b.px, dy = b.y - b.py, sp = Math.hypot(dx, dy);
    if (b.still > SLEEP) {
      if (sp > 0.001) b.still = 0;
      else {
        b.x = b.px;
        b.y = b.py;
        continue;
      }
    }
    if (sp < 0.0008) {
      b.still++;
      // 열린 단지 목에 둘이 아치처럼 걸리면 살짝 흔들어 풀어 준다
      if (b.still > 4) {
        for (const c of L.chs)
          if (!c.W && !((W.on >> c.pin) & 1) && b.x > c.x0 && b.x < c.x1 && b.y > c.top && b.y < c.fy) {
            b.px += (b.id & 1 ? 1 : -1) * 0.0016;
            b.still = 0;
            break;
          }
      }
    } else b.still = 0;
    if (b.still <= SLEEP) moving++;
    if (sp > 0.0016) fast++;
    b.rot += dx / b.r;
    for (let i = 0; i < L.bowls.length; i++) {
      const bw = L.bowls[i];
      if (Math.abs(b.x - bw.x) < bw.hw && b.y > bw.y + 0.012 && b.y < bw.y + 0.15) {
        capture(W, b, 1, i, v);
        break;
      }
    }
    if (b.st) continue;
    const P = L.pot;
    if (P && Math.abs(b.x - P.x) < P.hw && b.y > P.y + 0.012 && b.y < P.y + 0.15) {
      capture(W, b, 2, 0, v);
      continue;
    }
    const Sy = L.syrup;
    if (Sy && W.syrupOn && Math.hypot(b.x - Sy.x, b.y - Sy.y) < Sy.R) {
      b.st = 5;
      b.tc = W.t;
      b.sx = b.x;
      b.sy = b.y;
      if (W.syrupT < 0) W.out.push({ k: 'stick', x: b.x, y: b.y, c: b.k });
      W.syrupT = W.t;
      continue;
    }
    if (M && W.mouseOn && Math.hypot(b.x - M.x, b.y - M.y) < M.R) {
      if (b.k === 2) {
        W.mouseOn = false;
        W.mouseT = W.t;
        W.out.push({ k: 'sneeze', x: M.hx, y: M.hy });
      } else if (W.t >= W.mouseCool) {
        b.st = 4;
        b.tc = W.t;
        b.sx = b.x;
        b.sy = b.y;
        W.eaten++;
        W.mouseCool = W.t + 4;
        W.out.push({ k: 'eat', x: b.x, y: b.y, c: b.k === 1 ? -1 : b.c });
        if (W.eaten >= M.cap) (W.mouseOn = false), (W.mouseT = W.t), W.out.push({ k: 'full', x: M.hx, y: M.hy });
        continue;
      }
    }
    if (b.y > LOST_Y || b.x < -0.15 || b.x > 1.15) {
      b.st = 3;
      b.tc = W.t;
      W.lost++;
      if (b.k !== 2) W.out.push({ k: 'lost', x: Math.max(0.05, Math.min(0.95, b.x)), y: LOST_Y });
    }
  }
  // 저울 칸
  let pend = false;
  for (let ci = 0; ci < L.chs.length; ci++) {
    const c = L.chs[ci];
    if (!c.W) continue;
    const bit = 1 << c.pin;
    let n = 0, any = 0;
    for (const b of B)
      if (!b.st && b.x > c.x0 && b.x < c.x1 && b.y > c.top - 0.03 && b.y < c.fy + 0.03) {
        any++;
        if (b.k !== 2) n++;
      }
    W.scaleN[ci] = n;
    const need = v.W ?? 6;
    if (W.on & bit) {
      if (n >= need) {
        pend = true;
        if (++W.scaleT[ci] >= 30) {
          W.on &= ~bit;
          W.scaleOpen[ci] = W.t;
          W.scaleT[ci] = 0;
          for (const b of B) b.still = 0;
          W.out.push({ k: 'scale', x: c.cx, y: c.fy, n });
        }
      } else W.scaleT[ci] = 0;
    } else {
      pend = true;
      if (any) W.scaleT[ci] = 0;
      else if (++W.scaleT[ci] >= 14 && W.t - W.scaleOpen[ci] > 40) {
        W.on |= bit;
        W.scaleT[ci] = 0;
        W.out.push({ k: 'scaleClose', x: c.cx, y: c.fy });
      }
    }
  }
  if (W.syrupOn && W.syrupT >= 0 && W.t - W.syrupT > 40) {
    W.syrupOn = false;
    W.out.push({ k: 'syrupDone', x: L.syrup!.x, y: L.syrup!.y });
  }
  if (W.syrupOn && W.syrupT >= 0) pend = true;
  W.calm = moving || chainOn || pend ? 0 : W.calm + 1;
  W.quiet = fast || chainOn || pend ? 0 : W.quiet + 1;
}

function capture(W: World, b: Ball, st: number, bi: number, v: Variant) {
  b.st = st;
  b.bi = bi;
  b.tc = W.t;
  b.sx = b.x;
  b.sy = b.y;
  if (st === 2) {
    W.potN++;
    W.out.push({ k: b.k === 2 ? 'potP' : 'potD', x: b.x, y: b.y, c: b.c });
    return;
  }
  b.slot = W.bowlAll[bi]++;
  const bad = b.k === 1 ? 'gray' : b.k === 2 ? 'pepper' : b.hot ? 'hot' : v.bc && v.bc[bi] !== b.c ? 'mix' : '';
  if (bad) {
    if (!W.fail) W.fail = bad;
    W.out.push({ k: 'bad', x: b.x, y: b.y, c: b.c, n: bi });
  } else {
    W.bowlN[bi]++;
    W.out.push({ k: 'in', x: b.x, y: b.y, c: b.c, n: bi });
  }
}

/** 꼬치 뽑기 (물리) */
export function pullPin(W: World, p: number) {
  const bit = 1 << p;
  if (!(W.on & bit)) return false;
  W.on &= ~bit;
  W.pulled++;
  for (const b of W.b) b.still = 0;
  W.calm = 0;
  W.quiet = 0;
  return true;
}

// ───────────────────────────── 길 찾기(유령 경단) ─────────────────────────────
/** end: 0 이상 = 단지 · -1 바닥 · -2 김치 항아리 · -3 어딘가 걸림 · -10-i = i번 그릇 */
export interface Route { end: number; mouse: boolean; syrup: boolean; pts: number[] }
const routeCache = new WeakMap<Lay, Map<number, Route>>();
export function route(L: Lay, ci: number, on: number): Route {
  let m = routeCache.get(L);
  if (!m) routeCache.set(L, (m = new Map()));
  const key = ci * 1048576 + on;
  let r = m.get(key);
  if (!r) m.set(key, (r = trace(L, ci, on)));
  return r;
}
function trace(L: Lay, ci: number, on: number): Route {
  const c = L.chs[ci], segs = segsOn(L, on & ~(1 << c.pin));
  const b = { x: c.cx, y: c.fy + 0.02, px: c.cx, py: c.fy + 0.018, r: RB };
  const pts = [c.cx, c.fy - 0.02];
  let still = 0, mouse = false, syrup = false;
  for (let t = 0; t < 900; t++) {
    let vx = (b.x - b.px) * DAMP, vy = (b.y - b.py) * DAMP + GRAV;
    const sp = Math.hypot(vx, vy);
    if (sp > VMAX) (vx *= VMAX / sp), (vy *= VMAX / sp);
    b.px = b.x;
    b.py = b.y;
    b.x += vx;
    b.y += vy;
    for (let it = 0; it < ITER; it++) for (const sg of segs) if (inBox(sg, b.x, b.y, b.r + sg.r)) pushOut(b, sg);
    if (t % 3 === 0) pts.push(b.x, b.y);
    if (L.mouse && Math.hypot(b.x - L.mouse.x, b.y - L.mouse.y) < L.mouse.R) mouse = true;
    if (L.syrup && Math.hypot(b.x - L.syrup.x, b.y - L.syrup.y) < L.syrup.R) syrup = true;
    for (let i = 0; i < L.bowls.length; i++) {
      const bw = L.bowls[i];
      if (Math.abs(b.x - bw.x) < bw.hw && b.y > bw.y + 0.012) return { end: -10 - i, mouse, syrup, pts: [...pts, b.x, b.y + 0.03] };
    }
    if (L.pot && Math.abs(b.x - L.pot.x) < L.pot.hw && b.y > L.pot.y + 0.012) return { end: -2, mouse, syrup, pts: [...pts, b.x, b.y + 0.03] };
    if (b.y > LOST_Y || b.x < -0.15 || b.x > 1.15) return { end: -1, mouse, syrup, pts };
    if (Math.hypot(b.x - b.px, b.y - b.py) < 0.0005) {
      if (++still > 10) {
        const k = chAt(L, b.x, b.y);
        return { end: k >= 0 && k !== ci ? k : -3, mouse, syrup, pts: [...pts, b.x, b.y] };
      }
    } else still = 0;
  }
  return { end: -3, mouse, syrup, pts };
}

// ───────────────────────────── 머릿속 모형(봇·판 고르기·미리 보기) ─────────────────────────────
/** 단지 하나의 내용: c 색별 경단 · g 회색 · p 고춧가루 · h 매운 경단 · x 여러 색에 물든 반죽 */
export interface Bag { c: number[]; g: number; p: number; h: number; x: number }
export interface MS { ch: Bag[]; on: number; bowl: number[]; potP: number; lost: number; eaten: number; mouse: number; syrup: boolean; fail: string; pulled: number }
export interface View { L: Lay; v: Variant; N: number; F: number; tapMask: number }
const bag = (): Bag => ({ c: [0, 0, 0, 0], g: 0, p: 0, h: 0, x: 0 });
const cloneBag = (b: Bag): Bag => ({ c: b.c.slice(), g: b.g, p: b.p, h: b.h, x: b.x });
const dango = (b: Bag) => b.c[0] + b.c[1] + b.c[2] + b.c[3] + b.g + b.h + b.x;
const empty = (b: Bag) => dango(b) + b.p === 0;
const cloneMS = (S: MS): MS => ({ ...S, ch: S.ch.map(cloneBag), bowl: S.bowl.slice() });

function mix(b: Bag) {
  const cs = b.c[0] + b.c[1] + b.c[2] + b.c[3];
  if ((b.p > 0 || b.h > 0) && cs + b.g + b.x > 0) {
    b.h += cs + b.g + b.x;
    b.c = [0, 0, 0, 0];
    b.g = 0;
    b.x = 0;
    return;
  }
  if (b.g > 0 && cs > 0) {
    let k = -1, n = 0;
    for (let i = 0; i < NC; i++) if (b.c[i] > 0) (k = i), n++;
    if (n === 1) b.c[k] += b.g;
    else b.x += b.g;
    b.g = 0;
  }
}
function deliver(V: View, S: MS, b: Bag, r: Route) {
  if (r.syrup && S.syrup) {
    S.syrup = false;
    S.lost += dango(b);
    return;
  }
  if (r.mouse && S.mouse > 0) {
    {
      let eat = Math.min(S.mouse, dango(b));
      S.mouse -= eat;
      S.eaten += eat;
      for (let i = 0; i < NC && eat; i++) {
        const q = Math.min(eat, b.c[i]);
        b.c[i] -= q;
        eat -= q;
      }
      for (const k of ['g', 'h', 'x'] as const) {
        const q = Math.min(eat, b[k]);
        b[k] -= q;
        eat -= q;
      }
    }
    if (b.p > 0) S.mouse = 0;
  }
  if (r.end >= 0) {
    const d = S.ch[r.end];
    for (let i = 0; i < NC; i++) d.c[i] += b.c[i];
    d.g += b.g;
    d.p += b.p;
    d.h += b.h;
    d.x += b.x;
    mix(d);
    return;
  }
  if (r.end <= -10) {
    const bi = -10 - r.end, bc = V.v.bc;
    if (b.g || b.p || b.h) S.fail ||= b.g ? 'gray' : b.p ? 'pepper' : 'hot';
    else if (bc && (b.x || b.c.some((n, i) => n > 0 && i !== bc[bi]))) S.fail ||= 'mix';
    S.bowl[bi] += b.c[0] + b.c[1] + b.c[2] + b.c[3] + b.x;
    return;
  }
  if (r.end === -2) S.potP += b.p;
  S.lost += dango(b);
}
function settleModel(V: View, S: MS) {
  const L = V.L;
  for (let guard = 0; guard < 24; guard++) {
    let moved = false;
    for (const ci of L.order) {
      const b = S.ch[ci];
      if (empty(b)) continue;
      const c = L.chs[ci], bit = 1 << c.pin;
      let on = S.on;
      if (on & bit) {
        if (!c.W || dango(b) < (V.v.W ?? 6)) continue;
        on &= ~bit;
      }
      S.ch[ci] = bag();
      deliver(V, S, b, route(L, ci, on));
      moved = true;
    }
    if (!moved) break;
  }
}
export function pullModel(V: View, S: MS, p: number) {
  S.on &= ~(1 << p);
  S.pulled++;
  settleModel(V, S);
}
const total = (S: MS) => S.bowl.reduce((a, b) => a + b, 0);
export const modelDone = (V: View, S: MS) => !!S.fail || (S.on & V.tapMask) === 0 || total(S) >= V.F;
function value(V: View, S: MS) {
  const n = total(S);
  if (S.fail) return -1e6 + n;
  return n * 10 + (n >= V.N ? 1000 : 0) + (n >= V.F ? 2000 : 0) - S.lost * 3 - S.eaten * 3;
}
export function initModel(V: View): MS {
  const S: MS = { ch: V.L.chs.map(() => bag()), on: (1 << V.L.pins.length) - 1, bowl: V.L.bowls.map(() => 0), potP: 0, lost: 0, eaten: 0, mouse: V.L.mouse ? V.L.mouse.cap : 0, syrup: !!V.L.syrup, fail: '', pulled: 0 };
  V.v.fills.forEach((f, ci) => {
    if (!f) return;
    const b = S.ch[ci];
    if (f.k === 0) b.c[f.c] += f.n;
    else if (f.k === 1) b.g += f.n;
    else b.p += f.n;
  });
  return S;
}
/** 실제 물리 상태를 모형으로 읽는다 (굴러가는 중이면 대충) */
export function observe(V: View, W: World): MS {
  const L = V.L, S: MS = { ch: L.chs.map(() => bag()), on: W.on, bowl: W.bowlN.slice(), potP: 0, lost: W.lost, eaten: W.eaten, mouse: W.mouseOn && L.mouse ? L.mouse.cap - W.eaten : 0, syrup: W.syrupOn && W.syrupT < 0, fail: W.fail, pulled: W.pulled };
  for (const b of W.b) {
    if (b.st) continue;
    const ci = chAt(L, b.x, b.y);
    if (ci < 0) continue;
    const g = S.ch[ci];
    if (b.k === 2) g.p++;
    else if (b.hot) g.h++;
    else if (b.k === 1) g.g++;
    else g.c[b.c]++;
  }
  return S;
}
const msKey = (S: MS) => `${S.on}|${S.bowl.join(',')}|${S.mouse}|${S.syrup ? 1 : 0}|${S.lost}|${S.fail}|${S.ch.map((b) => `${b.c.join('.')}.${b.g}.${b.p}.${b.h}.${b.x}`).join('/')}`;
/** 남은 꼬치를 모든 순서로 따져 가장 좋은 다음 꼬치 */
export function bestPin(V: View, S0: MS): { pin: number; v: number } {
  const memo = new Map<string, number>(), top = 3000 + V.F * 10;
  const rec = (S: MS): number => {
    if (modelDone(V, S)) return value(V, S);
    const k = msKey(S), hit = memo.get(k);
    if (hit !== undefined) return hit;
    let best = -Infinity;
    for (const p of V.L.tap) {
      if (!((S.on >> p) & 1)) continue;
      const S2 = cloneMS(S);
      pullModel(V, S2, p);
      const v = rec(S2);
      if (v > best) best = v;
      if (best >= top - S.lost * 3 - S.eaten * 3) break;
    }
    memo.set(k, best);
    return best;
  };
  let pin = -1, bv = -Infinity;
  for (const p of V.L.tap) {
    if (!((S0.on >> p) & 1)) continue;
    const S2 = cloneMS(S0);
    pullModel(V, S2, p);
    const v = rec(S2);
    if (v > bv) (bv = v), (pin = p);
  }
  return { pin, v: bv };
}
/** 버릇 하나: 남은 꼬치 중 맨 위(손잡이가 가장 높은)부터 */
export function habitTop(L: Lay, on: number) {
  let best = -1;
  for (const p of L.tap) if ((on >> p) & 1 && (best < 0 || L.pins[p].hy < L.pins[best].hy)) best = p;
  return best;
}
/** 두 번째 버릇(측정용): 맨 아래부터 */
export function habitBottom(L: Lay, on: number) {
  let best = -1;
  for (const p of L.tap) if ((on >> p) & 1 && (best < 0 || L.pins[p].hy > L.pins[best].hy)) best = p;
  return best;
}
function playModel(V: View, choose: (S: MS) => number) {
  const S = initModel(V);
  for (let g = 0; g < 20 && !modelDone(V, S); g++) {
    const p = choose(S);
    if (p < 0) break;
    pullModel(V, S, p);
  }
  return S;
}
/** 모형 판정: 0 실패 · 1 목표 · 2 가득 */
export function grade(V: View, S: MS) {
  if (S.fail) return 0;
  const n = total(S);
  return n >= V.F ? 2 : n >= V.N ? 1 : 0;
}

// ───────────────────────────── 판 만들기(내용 고르기) ─────────────────────────────
export interface Level { L: Lay; v: Variant; V: View; N: number; F: number }
const layCache: Lay[] = [];
export const layOf = (st: number) => (layCache[st] ??= STAGES[st].lay());
function viewOf(L: Lay, v: Variant): View {
  const F = v.fills.reduce((a, f) => a + (f && f.k !== 2 ? f.n : 0), 0);
  return { L, v, N: Math.min(v.N, F), F, tapMask: L.tap.reduce((a, p) => a | (1 << p), 0) };
}
function randomPass(V: View, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = playModel(V, (S) => {
      const on = V.L.tap.filter((p) => (S.on >> p) & 1);
      return on[Math.floor(r() * on.length)];
    });
    if (grade(V, S) > 0) ok++;
  }
  return ok / n;
}
export const smartPlay = (V: View) => playModel(V, (S) => bestPin(V, S).pin);
export const habitPlay = (V: View) => playModel(V, (S) => habitTop(V.L, S.on));
const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const L = layOf(stage), r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let best: Level | null = null, bv = -1e9;
  for (let c = 0; c < 14; c++) {
    const v = STAGES[stage].make(r), V = viewOf(L, v);
    let sc: number;
    if (stage === 0) sc = randomPass(V, r, 8);
    else if (stage === 1) sc = -Math.abs(randomPass(V, r, 24) - 0.6);
    else {
      // 버릇대로(맨 위부터·맨 아래부터) 두면 가득이 안 되고, 내다보면 가득이 되는 판 (무엇을 먼저 뽑을지가 수가 되게)
      const sm = grade(V, smartPlay(V)), ht = grade(V, habitPlay(V)), hb = grade(V, playModel(V, (S) => habitBottom(L, S.on)));
      sc = (sm === 2 ? 3 : sm === 1 ? 0.5 : -5) + (ht < 2 ? 1 : 0) + (hb < 2 ? 0.6 : 0) + randomPass(V, r, 10) * 0.4;
      if (sc >= 4.6 + 0.04) {
        best = { L, v, V, N: V.N, F: V.F };
        break;
      }
    }
    if (sc > bv) (bv = sc), (best = { L, v, V, N: V.N, F: V.F });
  }
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, best!);
  return best!;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
export interface PinState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  lv: Level; W: World;
  down: boolean; ax: number; ay: number; press: number; cool: number; lastPull: number; taps: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  pullT: number[]; mood: string; moodT: number; pop: Record<string, number>;
  /** 쾌감: 한 번에 쏟아진 수 · 줄줄이 물든 수 · 느린 화면 남은 틱 · 그릇이 마지막으로 받은 틱 */
  combo: number; comboT: number; chainN: number; chainT: number; slow: number; bowlT: number[]; goal: number;
}
const ev = (s: PinState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function see(s: PinState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
function tip(s: PinState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
const setMood = (s: PinState, m: string) => ((s.mood = m), (s.moodT = s.t));
/** 같은 말이 쏟아지지 않게: 마지막으로 띄운 뒤 gap틱이 지났을 때만 */
const once = (s: PinState, k: string, gap: number) => (s.t - (s.pop[k] ?? -999) >= gap ? ((s.pop[k] = s.t), true) : false);
export const bowlTotal = (W: World) => W.bowlN.reduce((a, b) => a + b, 0);

function newStage(s: PinState) {
  const d = STAGES[s.stage];
  s.lv = buildLevel(s.seed, s.stage);
  s.W = newWorld(s.lv.L, s.lv.v);
  s.pullT = s.lv.L.pins.map(() => -1);
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.cool = s.t + 20;
  s.startT = s.t;
  s.lastPull = s.t;
  s.got = 0;
  s.pop = {};
  s.combo = 0;
  s.chainN = 0;
  s.slow = 0;
  s.goal = 0;
  s.bowlT = s.lv.L.bowls.map(() => -99);
  setMood(s, 'idle');
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

const WHY: Record<string, string> = {
  gray: '회색 반죽이 그릇에! 이게 뭐여?',
  pepper: '고춧가루가 그릇에! 매워~!',
  hot: '매운 경단이 그릇에! 후아~!',
  mix: '그릇에 다른 색이 섞였어요!',
};
function finish(s: PinState) {
  s.phase = 'result';
  s.pt = 0;
  const d = STAGES[s.stage], n = bowlTotal(s.W);
  if (s.ok) {
    const st = 1 + (n >= s.lv.F ? 1 : 0) + (s.tries === 0 ? 1 : 0);
    s.got = st;
    s.stars += st;
    s.pts += st * 100 + n * 5;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += 200);
    ev(s, 'clear', 0.5, 0.62, `${d.emoji} ${d.name} 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    tip(s, 'retry', '💡 꼬치를 누르고 있으면 굴러갈 길과 결과가 보여요');
    ev(s, 'fail', 0.5, 0.62, s.why, '#ffd0c8');
    setMood(s, s.W.fail === 'pepper' || s.W.fail === 'hot' ? 'spicy' : s.W.fail ? 'what' : 'dizzy');
  }
}

/** 손가락 자리에서 가장 가까운(아직 꽂힌) 꼬치 */
function pickPin(s: PinState, x: number, y: number) {
  const L = s.lv.L;
  let best = -1, bd = HIT;
  for (const p of L.tap) {
    if (!((s.W.on >> p) & 1)) continue;
    const P = L.pins[p], gx = P.hx - P.ux * 0.07, gy = P.hy - P.uy * 0.07;
    const ex = P.hx - gx, ey = P.hy - gy, q = Math.max(0, Math.min(1, ((x - gx) * ex + (y - gy) * ey) / (ex * ex + ey * ey)));
    let dd = Math.hypot(x - gx - ex * q, y - gy - ey * q);
    const [fx, fy] = farEnd(L, p), bx = gx - fx, by = gy - fy, q2 = Math.max(0, Math.min(1, ((x - fx) * bx + (y - fy) * by) / (bx * bx + by * by)));
    dd = Math.min(dd, Math.hypot(x - fx - bx * q2, y - fy - by * q2) + 0.02);
    if (dd < bd) (bd = dd), (best = p);
  }
  return best;
}
/** 꼬치에서 손잡이 반대쪽 끝 */
function farEnd(L: Lay, p: number): [number, number] {
  const P = L.pins[p], sg = L.segs[P.seg];
  return Math.hypot(sg.ax - P.hx, sg.ay - P.hy) > Math.hypot(sg.bx - P.hx, sg.by - P.hy) ? [sg.ax, sg.ay] : [sg.bx, sg.by];
}

function doPull(s: PinState, k: number) {
  const L = s.lv.L, P = L.pins[k];
  if (!pullPin(s.W, k)) return;
  s.pullT[k] = s.t;
  s.cool = s.t + 6;
  s.lastPull = s.t;
  s.taps++;
  ev(s, 'pull', P.hx, P.hy, '쑥!', '#fff3c4');
  setMood(s, 'wow');
  if (P.kind === 1) see(s, 'diag', '↘️ 대각선 꼬치 — 꽂혀 있으면 미끄럼틀, 빼면 곧장 아래로');
}

/** 물리 세계에서 난 일을 화면 사건·표정으로 */
function absorb(s: PinState) {
  const W = s.W, L = s.lv.L;
  for (const e of W.out) {
    const col = e.c !== undefined && e.c >= 0 ? COLS[e.c] : undefined;
    switch (e.k) {
      case 'in': {
        s.combo = s.t - s.comboT < 26 ? s.combo + 1 : 1;
        s.comboT = s.t;
        s.bowlT[e.n ?? 0] = s.t;
        ev(s, 'in', e.x, e.y, `+${s.combo}`, col, s.combo);
        if (!W.fail && s.mood !== 'spicy') setMood(s, 'happy');
        see(s, 'bowl', '🥣 그릇에 쏙! 목표 개수를 채워요');
        const n = bowlTotal(W), bw = L.bowls[e.n ?? 0];
        if (!W.fail && n >= s.lv.F && s.goal < 2) {
          s.goal = 2;
          s.slow = 56;
          ev(s, 'full', bw.x, 1.0, '가득!! 하나도 안 흘렸다!', '#fff1a8');
          setMood(s, 'cheer');
        } else if (!W.fail && n >= s.lv.N && s.goal < 1) {
          s.goal = 1;
          s.slow = 40;
          ev(s, 'goal', bw.x, 1.0, '목표 달성!', '#fff1a8');
          setMood(s, 'cheer');
        }
        break;
      }
      case 'bad':
        ev(s, 'bad', e.x, e.y, WHY[W.fail] ?? '앗!', '#ffd0c8');
        setMood(s, W.fail === 'pepper' || W.fail === 'hot' ? 'spicy' : 'what');
        break;
      case 'dye':
        s.chainN = s.t - s.chainT < 24 ? s.chainN + 1 : 1;
        s.chainT = s.t;
        ev(s, 'dye', e.x, e.y, s.chainN === 1 ? '물들었다!' : `×${s.chainN}`, col, s.chainN);
        if (s.chainN === 4) s.slow = Math.max(s.slow, 24);
        see(s, 'dye', '🎨 물든 반죽이 옆 반죽을 또 물들여요 — 줄줄이!');
        break;
      case 'hot':
        ev(s, 'hot', e.x, e.y, once(s, 'hot', 50) ? '매워!!' : undefined, '#ffb4a0');
        see(s, 'hot', '🥵 고춧가루 묻은 경단은 매운 경단 — 그릇에 넣으면 망쳐요');
        break;
      case 'eat':
        ev(s, 'eat', e.x, e.y, '냠!', '#ffe0b8');
        setMood(s, 'angry');
        see(s, 'eat', '🐭 생쥐가 경단을 냠! 고춧가루로 쫓아내요');
        break;
      case 'sneeze':
        ev(s, 'sneeze', e.x, e.y, '에취!! 🐭💨', '#fff1d6');
        setMood(s, 'happy');
        break;
      case 'full':
        ev(s, 'full', e.x, e.y, '배불러… zZ', '#e8e0ff');
        break;
      case 'potP':
        ev(s, 'potP', e.x, e.y, once(s, 'potP', 60) ? '김치 양념!' : undefined, '#ff7a5a');
        see(s, 'pot', '🏺 김치 항아리 — 고춧가루는 여기로 보내면 딱!');
        break;
      case 'potD':
        ev(s, 'potD', e.x, e.y, once(s, 'potD', 40) ? '김치에 경단?!' : undefined, col);
        setMood(s, 'what');
        break;
      case 'lost':
        ev(s, 'lost', e.x, e.y, once(s, 'lost', 40) ? '데구르르…' : undefined);
        break;
      case 'scale':
        s.slow = Math.max(s.slow, 20);
        ev(s, 'scale', e.x, e.y, `덜컥! ${e.n}개 와르르`, '#fff1a8');
        setMood(s, 'wow');
        see(s, 'scaleOpen', '⚖️ 무게가 차면 덜컥! 내려보낸 뒤엔 다시 닫혀요');
        break;
      case 'scaleClose':
        ev(s, 'scaleClose', e.x, e.y);
        break;
      case 'stick':
        ev(s, 'stick', e.x, e.y, e.c === 2 ? '찰싹! 고추장 됐다!' : '찰싹! 붙어 버렸다', e.c === 2 ? '#ff9a7a' : '#ffe1a0');
        setMood(s, e.c === 2 ? 'happy' : 'what');
        see(s, 'stick', e.c === 2 ? '🍯 고춧가루가 조청에 붙어 고추장! 이제 지나가도 괜찮아요' : '🍯 경단이 조청에 붙었어요 — 조청은 이제 덮였어요');
        break;
      case 'syrupDone':
        ev(s, 'syrupDone', e.x, e.y);
        break;
    }
  }
  W.out.length = 0;
  void L;
}

export const pullpin: GameDef<PinState> = {
  id: 'pullpin',
  name: '경단 핀 뽑기',
  genes: ['pinpull', 'pointer', 'chain'],
  twist: '회색 반죽은 색 경단에 닿는 순간 그 색으로 물들고, 물든 반죽이 옆 반죽을 줄줄이 물들인다 — 고춧가루도 똑같이 번진다. 그래서 꼬치를 뽑는 순서가 "무엇이 무엇을 먼저 만나느냐"를 정한다',
  rules: ['꼬치를 톡 → 쑥 빠지면 막혔던 단지가 열려 경단이 굴러 내려가요.', '그릇에 색 경단을 목표만큼! 회색 반죽·고춧가루가 들어가면 망쳐요.', '회색은 색 경단에 닿으면 물들어요 — 뽑는 순서가 중요해요.'],
  controls: 'touch',
  hint: '꼬치를 톡! 누르고 있으면 굴러갈 길이 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '할머니 떡집 부엌의 경단 단지 선반',
    mood: '한지 바른 따뜻한 부엌 벽에 유리 단지가 줄줄이 — 알록달록 경단이 대나무 홈통을 데굴데굴 굴러 사기 그릇에 소복이 쌓이고, 김치 항아리와 떡장수 할머니, 선반 위 고양이가 구경한다.',
    palette: { bg: '#f3e3c3', ink: '#3a2414', muted: '#9a7a5a', accent: '#ff8db4', hot: '#e2452f', soft: '#fff4dc' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, press: -1, cool: 0, lastPull: 0, taps: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      pullT: [], mood: 'idle', moodT: 0, pop: {}, combo: 0, comboT: -99, chainN: 0, chainT: -99, slow: 0, bowlT: [], goal: 0,
    } as unknown as PinState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 80 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    const W = s.W, lv = s.lv;
    // 큰 순간엔 잠깐 느린 화면 (물리를 한 틱 걸러 한 번 — 결정적)
    if (s.slow > 0) s.slow--;
    if (s.slow % 2 === 0) stepWorld(lv.L, W, lv.v);
    if (W.out.length) absorb(s);
    if (s.combo && s.t - s.comboT > 26) {
      if (s.combo >= 4) ev(s, 'pour', lv.L.bowls[0].x, 0.98, `와르르 ×${s.combo}!`, '#ffe9a8', s.combo);
      s.combo = 0;
    }
    if (s.chainN && s.t - s.chainT > 24) {
      let de: Ev | undefined;
      for (const e of s.events) if (e.kind === 'dye') de = e;
      if (s.chainN >= 3) ev(s, 'chain', de ? de.x : 0.5, de ? de.y : 0.5, `줄줄이 ${s.chainN}개 물들었다!`, '#ffffff', s.chainN);
      s.chainN = 0;
    }
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' || s.mood === 'spicy' ? 400 : 80)) s.mood = 'idle';
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.stage++, (s.tries = 0), newStage(s));
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      if (s.pt >= (s.ok ? 40 : 70)) finish(s);
      return;
    }
    const n = bowlTotal(W);
    if (W.fail) {
      s.phase = 'settle';
      s.pt = 0;
      s.ok = false;
      s.why = WHY[W.fail] ?? '망쳤어요!';
      s.press = -1;
      return;
    }
    if ((n >= lv.F && W.quiet >= 8) || ((W.on & lv.V.tapMask) === 0 && W.quiet >= 24)) {
      s.phase = 'settle';
      s.pt = 0;
      s.ok = n >= lv.N;
      s.why = s.ok ? '' : `경단이 모자라요 (${n}/${lv.N})`;
      s.press = -1;
      return;
    }
    if (p) s.press = pickPin(s, p.x, p.y * A);
    if (!release) return;
    const k = s.press;
    s.press = -1;
    if (k < 0) {
      const y = s.ay * A;
      if (y > 0.1 && y < 1.2) ev(s, 'miss', s.ax, y, '꼬치를 톡!', '#fff3df');
      return;
    }
    if (s.t < s.cool) return;
    doPull(s, k);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const atPin = (L: Lay, p: number): Input => ({ tap: false, dir: 0, pointer: { x: L.pins[p].hx - L.pins[p].ux * 0.02, y: (L.pins[p].hy - L.pins[p].uy * 0.02) / A } });
/** 사람처럼: 다 멈춘 걸 보고 잠깐 생각한 뒤 하나 뽑는다 */
const ready = (s: PinState) => s.phase === 'play' && !s.down && s.t >= s.cool && s.W.quiet >= 18 && s.t - s.lastPull >= 30 && s.t - s.startT >= 40;
const brain = new WeakMap<object, { key: string; p: number }>();
/** 봇: 지금 단지 속을 읽어 남은 꼬치의 모든 순서를 머릿속으로 굴려 보고(물들기·매운맛·생쥐·저울·조청까지) 가장 좋은 꼬치를 뽑는다 */
export const pullpinSmart: Bot<PinState> = {
  name: '떡집 장인',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.W.on}:${s.W.pulled}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, p: bestPin(s.lv.V, observe(s.lv.V, s.W)).pin }));
    return m.p >= 0 ? atPin(s.lv.L, m.p) : NO;
  },
};
/** 버릇 봇(측정용): 남은 꼬치 중 맨 위부터 차례로 */
export const pullpinHabit: Bot<PinState> = {
  name: '버릇: 위에서부터',
  act(s) {
    if (!ready(s)) return NO;
    const p = habitTop(s.lv.L, s.W.on);
    return p >= 0 ? atPin(s.lv.L, p) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 꼬치나 톡 (가끔 화면 아무 데나) */
export const pullpinRandom: Bot<PinState> = {
  name: '아무 꼬치나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.lv.L, on = L.tap.filter((p) => (s.W.on >> p) & 1);
    if (rng() < 0.25 || !on.length) m.p = { x: rng(), y: rng() };
    else {
      const p = on[Math.floor(rng() * on.length)];
      m.p = { x: L.pins[p].hx - L.pins[p].ux * 0.02 + (rng() - 0.5) * 0.03, y: (L.pins[p].hy + (rng() - 0.5) * 0.03) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const tint = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);
type XY = (v: number) => number;
interface Kit { ctx: CanvasRenderingContext2D; X: XY; Y: XY; R: XY; t: number; w: number; h: number; font: (sz: number, wgt?: number) => void }

/** 경단 하나: 얼굴 0 평온 · 1 놀람 · 2 행복 · 3 졸림(반죽) · 4 매움 */
function drawDango(k: Kit, x: number, y: number, r: number, col: string, face: number, ang: number, glaze = 0) {
  const { ctx } = k;
  ctx.fillStyle = 'rgba(70,35,10,.16)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.22, y + r * 0.86, r * 0.82, r * 0.28, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r * 1.05);
  g.addColorStop(0, tint(col, '#ffffff', 0.62));
  g.addColorStop(0.62, col);
  g.addColorStop(1, tint(col, '#5a2a10', 0.32));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = tint(col, '#3a1a08', 0.45);
  ctx.lineWidth = Math.max(0.8, r * 0.07);
  ctx.stroke();
  if (glaze > 0) {
    ctx.fillStyle = `rgba(233,162,59,${0.42 * glaze})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.36, y - r * 0.44, r * 0.24, r * 0.15, -0.6, 0, TAU);
  ctx.fill();
  if (r < 6) return;
  ctx.save();
  ctx.translate(x, y + r * 0.08);
  ctx.rotate(Math.sin(ang) * 0.45);
  const e = r * 0.3, ey = -r * 0.08, ink = '#3b2314';
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.lineCap = 'round';
  if (face === 3) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sx * e - r * 0.1, ey), ctx.lineTo(sx * e + r * 0.1, ey), ctx.stroke());
  } else if (face === 2) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * e, ey + r * 0.04, r * 0.1, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
  } else if (face === 4) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sx * e - r * 0.1, ey - r * 0.08), ctx.lineTo(sx * e + sx * r * 0.02, ey), ctx.lineTo(sx * e - r * 0.1, ey + r * 0.08), ctx.stroke());
  } else {
    const er = face === 1 ? r * 0.11 : r * 0.075;
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * e, ey, er, 0, TAU), ctx.fill());
  }
  if (face === 1 || face === 4) {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.26, r * 0.11, r * (face === 4 ? 0.13 : 0.1), 0, 0, TAU);
    ctx.fill();
  } else if (face !== 3) {
    ctx.beginPath();
    ctx.arc(0, r * 0.14, r * 0.13, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  if (face !== 3) {
    ctx.fillStyle = 'rgba(255,110,120,.35)';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * r * 0.52, r * 0.12, r * 0.14, r * 0.08, 0, 0, TAU), ctx.fill());
  }
  ctx.restore();
  if (face === 4) {
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.8, y - r * 0.3, r * 0.14, r * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    for (let j = 0; j < 2; j++) {
      const sx = x + (j - 0.5) * r * 0.7, ph = k.t * 0.25 + j * 2 + x;
      ctx.beginPath();
      ctx.moveTo(sx, y - r * 1.05);
      ctx.quadraticCurveTo(sx + Math.sin(ph) * r * 0.3, y - r * 1.35, sx, y - r * 1.6);
      ctx.stroke();
    }
  }
}
function drawFlake(k: Kit, x: number, y: number, r: number, ang: number, sealed = false) {
  const { ctx } = k;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = sealed ? '#9a2a1a' : PEPC;
  ctx.beginPath();
  for (let j = 0; j < 5; j++) {
    const a = (j / 5) * TAU, rr = r * (0.75 + 0.35 * hsh(j + Math.round(x)));
    j ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = sealed ? '#c7682b' : '#ff7a4a';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5a0e06';
  ctx.beginPath();
  ctx.arc(r * 0.25, r * 0.2, r * 0.16, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function ballLook(b: Ball, t: number) {
  const sp = Math.hypot(b.x - b.px, b.y - b.py);
  const col = b.k === 1 ? GRAYC : b.hot ? tint(COLS[b.c] ?? GRAYC, '#ff3a20', 0.55) : COLS[b.c];
  const face = b.hot ? 4 : b.k === 1 ? 3 : sp > 0.007 ? 1 : t - b.tD < 30 ? 2 : 0;
  return { col: b.hot && b.k === 1 ? '#d66a5a' : col, face };
}

function jarPath(k: Kit, c: Ch) {
  const { ctx, X, Y } = k;
  ctx.beginPath();
  ctx.moveTo(X(c.x0), Y(c.top));
  ctx.lineTo(X(c.x0), Y(c.yb));
  ctx.lineTo(X(c.cx - c.neck / 2), Y(c.fy));
  ctx.lineTo(X(c.cx + c.neck / 2), Y(c.fy));
  ctx.lineTo(X(c.x1), Y(c.yb));
  ctx.lineTo(X(c.x1), Y(c.top));
}
function drawJarBack(k: Kit, c: Ch) {
  const { ctx, X, Y, R } = k;
  // 벽 그림자
  ctx.save();
  ctx.translate(R(0.014), R(0.02));
  jarPath(k, c);
  ctx.closePath();
  ctx.fillStyle = 'rgba(90,50,15,.13)';
  ctx.fill();
  ctx.restore();
  // 나무 받침대
  ctx.fillStyle = '#8b5a33';
  for (const x of [c.x0 - 0.018, c.x1 + 0.004]) {
    ctx.fillRect(X(x), Y(c.top + c.h * 0.55), R(0.014), R(0.05));
    ctx.fillStyle = '#6b4022';
  }
  jarPath(k, c);
  ctx.closePath();
  const g = ctx.createLinearGradient(X(c.x0), 0, X(c.x1), 0);
  g.addColorStop(0, 'rgba(255,255,255,.42)');
  g.addColorStop(0.5, 'rgba(215,236,248,.22)');
  g.addColorStop(1, 'rgba(170,205,225,.32)');
  ctx.fillStyle = g;
  ctx.fill();
}
function drawJarFront(k: Kit, c: Ch) {
  const { ctx, X, Y, R } = k;
  jarPath(k, c);
  ctx.strokeStyle = 'rgba(120,165,195,.75)';
  ctx.lineWidth = R(0.012);
  ctx.lineJoin = 'round';
  ctx.stroke();
  jarPath(k, c);
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = R(0.005);
  ctx.stroke();
  // 입구 테두리(3/4 시점 타원)
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = R(0.006);
  ctx.beginPath();
  ctx.ellipse(X(c.cx), Y(c.top), R(c.w / 2), R(0.016), 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,165,195,.6)';
  ctx.lineWidth = R(0.003);
  ctx.beginPath();
  ctx.ellipse(X(c.cx), Y(c.top), R(c.w / 2), R(0.016), 0, 0, Math.PI);
  ctx.stroke();
  // 유리 반짝
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = R(0.007);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(c.x0 + 0.02), Y(c.top + 0.025));
  ctx.lineTo(X(c.x0 + 0.02), Y(c.yb - 0.01));
  ctx.stroke();
  ctx.lineWidth = R(0.004);
  ctx.beginPath();
  ctx.moveTo(X(c.x0 + 0.034), Y(c.top + 0.03));
  ctx.lineTo(X(c.x0 + 0.034), Y(c.top + 0.06));
  ctx.stroke();
}
function drawBamboo(k: Kit, sg: Seg) {
  const { ctx, X, Y, R } = k;
  const dx = sg.bx - sg.ax, dy = sg.by - sg.ay, d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d, up = ny > 0 ? -1 : 1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(80,45,15,.2)';
  ctx.lineWidth = R(0.03);
  ctx.beginPath();
  ctx.moveTo(X(sg.ax + 0.006), Y(sg.ay + 0.014));
  ctx.lineTo(X(sg.bx + 0.006), Y(sg.by + 0.014));
  ctx.stroke();
  ctx.strokeStyle = '#6f9a3c';
  ctx.lineWidth = R(0.028);
  ctx.beginPath();
  ctx.moveTo(X(sg.ax), Y(sg.ay));
  ctx.lineTo(X(sg.bx), Y(sg.by));
  ctx.stroke();
  ctx.strokeStyle = '#a3cc5e';
  ctx.lineWidth = R(0.017);
  ctx.beginPath();
  ctx.moveTo(X(sg.ax + nx * up * 0.003), Y(sg.ay + ny * up * 0.003));
  ctx.lineTo(X(sg.bx + nx * up * 0.003), Y(sg.by + ny * up * 0.003));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(235,250,190,.75)';
  ctx.lineWidth = R(0.004);
  ctx.beginPath();
  ctx.moveTo(X(sg.ax + nx * up * 0.008), Y(sg.ay + ny * up * 0.008));
  ctx.lineTo(X(sg.bx + nx * up * 0.008), Y(sg.by + ny * up * 0.008));
  ctx.stroke();
  ctx.strokeStyle = '#557a2a';
  ctx.lineWidth = R(0.004);
  for (let q = 0.12; q < d; q += 0.11) {
    const x = sg.ax + (dx / d) * q, y = sg.ay + (dy / d) * q;
    ctx.beginPath();
    ctx.moveTo(X(x + nx * 0.013), Y(y + ny * 0.013));
    ctx.lineTo(X(x - nx * 0.013), Y(y - ny * 0.013));
    ctx.stroke();
  }
}
function drawBoard(k: Kit, sg: Seg) {
  const { ctx, X, Y, R } = k;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(80,45,15,.2)';
  ctx.lineWidth = R(0.024);
  ctx.beginPath();
  ctx.moveTo(X(sg.ax + 0.006), Y(sg.ay + 0.012));
  ctx.lineTo(X(sg.bx + 0.006), Y(sg.by + 0.012));
  ctx.stroke();
  ctx.strokeStyle = '#8c5a30';
  ctx.lineWidth = R(0.02);
  ctx.beginPath();
  ctx.moveTo(X(sg.ax), Y(sg.ay));
  ctx.lineTo(X(sg.bx), Y(sg.by));
  ctx.stroke();
  ctx.strokeStyle = '#c08a55';
  ctx.lineWidth = R(0.006);
  ctx.beginPath();
  ctx.moveTo(X(sg.ax - 0.003), Y(sg.ay));
  ctx.lineTo(X(sg.bx - 0.003), Y(sg.by));
  ctx.stroke();
}
/** 꼬치: 대나무 살 + 손잡이 삼색 경단 */
function drawPin(k: Kit, L: Lay, p: number, off: number, alpha: number, hot: boolean) {
  const { ctx, X, Y, R, t } = k, P = L.pins[p];
  const [fx0, fy0] = farEnd(L, p), ox = P.ux * off, oy = P.uy * off - off * off * 0.6;
  ctx.globalAlpha = alpha;
  const ax = fx0 + ox, ay = fy0 + oy, bx = P.hx + ox, by = P.hy + oy;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(70,35,10,.22)';
  ctx.lineWidth = R(0.016);
  ctx.beginPath();
  ctx.moveTo(X(ax + 0.005), Y(ay + 0.012));
  ctx.lineTo(X(bx + 0.005), Y(by + 0.012));
  ctx.stroke();
  if (hot) {
    ctx.strokeStyle = `rgba(255,236,120,${0.55 + 0.3 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = R(0.03);
    ctx.beginPath();
    ctx.moveTo(X(ax), Y(ay));
    ctx.lineTo(X(bx), Y(by));
    ctx.stroke();
  }
  const dg = P.kind === 1;
  ctx.strokeStyle = '#8a6434';
  ctx.lineWidth = R(dg ? 0.022 : 0.017);
  ctx.beginPath();
  ctx.moveTo(X(ax), Y(ay));
  ctx.lineTo(X(bx), Y(by));
  ctx.stroke();
  ctx.strokeStyle = '#f3dcaa';
  ctx.lineWidth = R(dg ? 0.014 : 0.01);
  ctx.stroke();
  if (dg) {
    // 대각선 꼬치는 빨간 줄무늬 — 길을 바꾸는 특별한 꼬치
    ctx.strokeStyle = '#d6455a';
    ctx.setLineDash([R(0.018), R(0.022)]);
    ctx.lineDashOffset = 0;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const cols = ['#9fd27c', '#fff6e4', '#ff9ec0'];
  for (let j = 2; j >= 0; j--) {
    const x = bx - P.ux * j * 0.033, y = by - P.uy * j * 0.033;
    drawDango(k, X(x), Y(y), R(0.022), cols[j], 0, 0);
  }
  if (dg) {
    ctx.fillStyle = '#d6455a';
    const rx = X(bx - P.ux * 0.1), ry = Y(by - P.uy * 0.1);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - R(0.022), ry - R(0.016));
    ctx.lineTo(rx - R(0.022), ry + R(0.016));
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + R(0.022), ry - R(0.016));
    ctx.lineTo(rx + R(0.022), ry + R(0.016));
    ctx.fill();
  }
  if (hot) {
    ctx.strokeStyle = '#fff1a0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(X(bx - P.ux * 0.031), Y(by - P.uy * 0.031), R(0.062) + Math.sin(t * 0.3) * 2, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawRoom(k: Kit) {
  const { ctx, X, Y, R, w, h, t } = k;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#f7ead0');
  g.addColorStop(0.55, '#f0dcb6');
  g.addColorStop(1, '#e2c493');
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 한지 결
  ctx.strokeStyle = 'rgba(170,120,60,.07)';
  ctx.lineWidth = 1;
  for (let j = 0; j < 26; j++) {
    const x = hsh(j) * w, y0 = hsh(j + 40) * h;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.quadraticCurveTo(x + 8, y0 + 30, x + 2, y0 + 60);
    ctx.stroke();
  }
  // 창살 창 (왼쪽 위 빛)
  const wx = X(0.36), wy = Y(0.085), ww = R(0.28), wh = R(0.16);
  ctx.fillStyle = 'rgba(255,250,232,.55)';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = 'rgba(150,100,55,.28)';
  ctx.lineWidth = R(0.006);
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = R(0.003);
  for (let j = 1; j < 4; j++) (ctx.beginPath(), ctx.moveTo(wx + (ww * j) / 4, wy), ctx.lineTo(wx + (ww * j) / 4, wy + wh), ctx.stroke());
  for (let j = 1; j < 3; j++) (ctx.beginPath(), ctx.moveTo(wx, wy + (wh * j) / 3), ctx.lineTo(wx + ww, wy + (wh * j) / 3), ctx.stroke());
  // 기둥
  for (const x of [0, w - R(0.024)]) {
    const pg = ctx.createLinearGradient(x, 0, x + R(0.024), 0);
    pg.addColorStop(0, '#9c6a3c');
    pg.addColorStop(1, '#7a4c26');
    ctx.fillStyle = pg;
    ctx.fillRect(x, 0, R(0.024), h);
  }
  // 따뜻한 빛
  const lg = ctx.createRadialGradient(X(0.5), Y(0.3), R(0.05), X(0.5), Y(0.5), R(0.9));
  lg.addColorStop(0, 'rgba(255,248,220,.5)');
  lg.addColorStop(1, 'rgba(255,230,180,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, w, h);
  // 김 (떡 찌는 냄새)
  for (let j = 0; j < 5; j++) {
    const x = X(0.1 + 0.2 * j + 0.03 * Math.sin(t / 70 + j)), y = Y(1.18 - ((t * 0.0011 + hsh(j + 9)) % 1) * 0.5);
    ctx.fillStyle = `rgba(255,255,255,${0.07 + 0.05 * Math.sin(t / 40 + j)})`;
    ctx.beginPath();
    ctx.arc(x, y, R(0.035 + 0.01 * j % 2), 0, TAU);
    ctx.fill();
  }
}
function drawCounter(k: Kit) {
  const { ctx, Y, R, w, h } = k;
  const top = Y(1.212);
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.fillRect(0, top - R(0.01), w, R(0.012));
  const g = ctx.createLinearGradient(0, top, 0, top + R(0.04));
  g.addColorStop(0, '#d79a5e');
  g.addColorStop(1, '#b07440');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, R(0.04));
  ctx.fillStyle = 'rgba(255,240,210,.45)';
  ctx.fillRect(0, top, w, R(0.005));
  const f = ctx.createLinearGradient(0, top + R(0.04), 0, h);
  f.addColorStop(0, '#83522c');
  f.addColorStop(1, '#5e3519');
  ctx.fillStyle = f;
  ctx.fillRect(0, top + R(0.04), w, h);
  ctx.strokeStyle = 'rgba(40,20,5,.2)';
  ctx.lineWidth = 1;
  for (let j = 0; j < 6; j++) {
    const y = top + R(0.05) + j * R(0.018);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.05 + j) * 1.4);
    ctx.stroke();
  }
}
/** 그릇 무더기 자리 */
function slotXY(bw: Bowl, i: number): [number, number] {
  const base = Math.max(3, Math.floor((bw.hw * 2 - 0.01) / 0.05));
  let row = 0, n = base, j = i;
  while (j >= n && n > 1) (j -= n), row++, n--;
  return [bw.x + (j - (n - 1) / 2) * 0.05, 1.138 - row * 0.042];
}
function drawBowl(k: Kit, bw: Bowl, part: 0 | 1, col: number) {
  const { ctx, X, Y, R } = k;
  const rx = bw.hw + 0.035, ry = 0.03, cy = 1.1;
  if (part === 0) {
    ctx.fillStyle = 'rgba(60,30,10,.25)';
    ctx.beginPath();
    ctx.ellipse(X(bw.x + 0.01), Y(1.218), R(rx * 0.85), R(0.018), 0, 0, TAU);
    ctx.fill();
    const g = ctx.createLinearGradient(0, Y(cy - ry), 0, Y(cy + ry));
    g.addColorStop(0, '#b9c6cf');
    g.addColorStop(1, '#e8eef2');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(X(bw.x), Y(cy), R(rx), R(ry), 0, 0, TAU);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.ellipse(X(bw.x), Y(cy), R(rx), R(ry), 0, Math.PI, 0, true);
  ctx.bezierCurveTo(X(bw.x + rx), Y(1.17), X(bw.x + rx * 0.62), Y(1.205), X(bw.x + rx * 0.55), Y(1.212));
  ctx.lineTo(X(bw.x - rx * 0.55), Y(1.212));
  ctx.bezierCurveTo(X(bw.x - rx * 0.62), Y(1.205), X(bw.x - rx), Y(1.17), X(bw.x - rx), Y(cy));
  ctx.closePath();
  const g = ctx.createLinearGradient(X(bw.x - rx), 0, X(bw.x + rx), 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.55, '#f2f5f7');
  g.addColorStop(1, '#c9d3da');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#8fa2ae';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 파란 띠 무늬 (사기그릇)
  ctx.strokeStyle = col >= 0 ? COLS[col] : '#3f6fb5';
  ctx.lineWidth = R(col >= 0 ? 0.012 : 0.006);
  ctx.beginPath();
  ctx.ellipse(X(bw.x), Y(cy + 0.032), R(rx * 0.93), R(ry * 0.9), 0, Math.PI * 0.95, Math.PI * 0.05, true);
  ctx.stroke();
  if (col < 0) {
    ctx.fillStyle = '#3f6fb5';
    for (let j = -2; j <= 2; j++) (ctx.beginPath(), ctx.arc(X(bw.x + j * rx * 0.33), Y(cy + 0.07), R(0.006), 0, TAU), ctx.fill());
  }
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = R(0.006);
  ctx.beginPath();
  ctx.ellipse(X(bw.x), Y(cy), R(rx), R(ry), 0, Math.PI, 0, true);
  ctx.stroke();
}
function drawPot(k: Kit, P: Pot, part: 0 | 1, red: number) {
  const { ctx, X, Y, R } = k;
  const rx = P.hw + 0.025, cy = P.y;
  if (part === 0) {
    ctx.fillStyle = 'rgba(60,30,10,.28)';
    ctx.beginPath();
    ctx.ellipse(X(P.x + 0.012), Y(1.22), R(rx * 1.05), R(0.018), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a140a';
    ctx.beginPath();
    ctx.ellipse(X(P.x), Y(cy), R(rx), R(0.026), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = tint('#c8452c', '#e0281a', Math.min(1, red / 20));
    ctx.beginPath();
    ctx.ellipse(X(P.x), Y(cy + 0.008), R(rx * 0.8), R(0.017), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#eef3d0';
    for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.ellipse(X(P.x + (j - 1.5) * 0.03), Y(cy + 0.006 + (j % 2) * 0.005), R(0.012), R(0.005), j, 0, TAU), ctx.fill());
    return;
  }
  ctx.beginPath();
  ctx.ellipse(X(P.x), Y(cy), R(rx), R(0.026), 0, Math.PI, 0, true);
  ctx.bezierCurveTo(X(P.x + rx * 1.35), Y(cy + 0.05), X(P.x + rx * 1.05), Y(1.2), X(P.x + rx * 0.6), Y(1.215));
  ctx.lineTo(X(P.x - rx * 0.6), Y(1.215));
  ctx.bezierCurveTo(X(P.x - rx * 1.05), Y(1.2), X(P.x - rx * 1.35), Y(cy + 0.05), X(P.x - rx), Y(cy));
  ctx.closePath();
  const g = ctx.createLinearGradient(X(P.x - rx), 0, X(P.x + rx), 0);
  g.addColorStop(0, '#8a4a24');
  g.addColorStop(0.4, '#6b3518');
  g.addColorStop(1, '#3d1c0b');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,180,.35)';
  ctx.lineWidth = R(0.006);
  ctx.beginPath();
  ctx.ellipse(X(P.x - rx * 0.45), Y(cy + 0.06), R(0.01), R(0.035), 0.2, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#f6e8c8';
  ctx.fillRect(X(P.x - 0.032), Y(cy + 0.05), R(0.064), R(0.044));
  ctx.fillStyle = '#b8231a';
  k.font(0.034, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('김치', X(P.x), Y(cy + 0.073));
}
function drawGranny(k: Kit, s: PinState, x: number, y: number, u: number) {
  const { ctx, t } = k, m = s.mood;
  const bob = m === 'cheer' || m === 'happy' ? Math.abs(Math.sin(t * 0.18)) * u * 0.12 : 0;
  y -= bob;
  // 저고리
  ctx.fillStyle = '#86b48d';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 1.55, u * 1.35, u * 0.85, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff8ea';
  ctx.beginPath();
  ctx.moveTo(x - u * 0.5, y + u * 0.85);
  ctx.lineTo(x, y + u * 1.45);
  ctx.lineTo(x + u * 0.5, y + u * 0.85);
  ctx.lineTo(x + u * 0.28, y + u * 0.85);
  ctx.lineTo(x, y + u * 1.2);
  ctx.lineTo(x - u * 0.28, y + u * 0.85);
  ctx.fill();
  ctx.fillStyle = '#d6455a';
  ctx.beginPath();
  ctx.ellipse(x + u * 0.25, y + u * 1.35, u * 0.18, u * 0.1, 0.5, 0, TAU);
  ctx.fill();
  // 머리
  const spicy = m === 'spicy', skin = spicy ? tint('#f6cfa8', '#ff4a2a', 0.55 + 0.15 * Math.sin(t * 0.3)) : '#f6cfa8';
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x, y, u, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,40,.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // 하얀 머리 + 쪽 + 비녀
  ctx.fillStyle = '#e9e6e2';
  ctx.beginPath();
  ctx.arc(x, y - u * 0.15, u * 1.02, Math.PI * 1.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(x, y - u * 0.55, x - u * 0.98, y - u * 0.3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + u * 0.7, y - u * 0.75, u * 0.38, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c99a2e';
  ctx.lineWidth = Math.max(2, u * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + u * 0.25, y - u * 0.95);
  ctx.lineTo(x + u * 1.2, y - u * 0.55);
  ctx.stroke();
  // 얼굴
  const ink = '#4a2a18', ex = u * 0.36, ey = y - u * 0.02;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, u * 0.08);
  const blink = t % 170 < 6 && m === 'idle';
  if (m === 'dizzy') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(x + sx * ex + Math.cos(a + t * 0.2) * a * u * 0.022, ey + Math.sin(a + t * 0.2) * a * u * 0.022);
      ctx.stroke();
    }
  } else if (m === 'wow' || m === 'what' || m === 'angry') {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + sx * ex, ey, u * 0.17, 0, TAU);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + sx * ex + u * 0.03, ey + u * 0.02, u * 0.08, 0, TAU);
      ctx.fill();
    }
    if (m === 'angry')
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x + sx * ex * 1.5, ey - u * 0.32), ctx.lineTo(x + sx * ex * 0.4, ey - u * 0.2), ctx.stroke());
  } else if (m === 'happy' || m === 'cheer' || blink) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sx * ex, ey + u * 0.05, u * 0.13, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
  } else if (spicy) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x + sx * ex - u * 0.12, ey - u * 0.1), ctx.lineTo(x + sx * ex + sx * u * 0.05, ey), ctx.lineTo(x + sx * ex - u * 0.12, ey + u * 0.1), ctx.stroke());
  } else {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sx * ex, ey, u * 0.08, 0, TAU), ctx.fill());
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sx * ex * 1.45, ey + u * 0.02, u * 0.1, -0.6, 0.6), ctx.stroke());
  }
  ctx.fillStyle = 'rgba(255,120,110,.4)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(x + sx * u * 0.56, y + u * 0.28, u * 0.17, u * 0.1, 0, 0, TAU), ctx.fill());
  ctx.fillStyle = ink;
  if (m === 'wow' || m === 'what') (ctx.beginPath(), ctx.ellipse(x, y + u * 0.42, u * 0.12, u * 0.16, 0, 0, TAU), ctx.fill());
  else if (spicy) {
    ctx.beginPath();
    ctx.ellipse(x, y + u * 0.42, u * 0.22, u * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath();
    ctx.ellipse(x, y + u * 0.58, u * 0.13, u * 0.14 + Math.sin(t * 0.5) * u * 0.03, 0, 0, TAU);
    ctx.fill();
  } else if (m === 'dizzy' || m === 'angry') (ctx.beginPath(), ctx.moveTo(x - u * 0.2, y + u * 0.45), ctx.quadraticCurveTo(x, y + u * 0.32, x + u * 0.2, y + u * 0.45), ctx.stroke());
  else {
    ctx.beginPath();
    ctx.arc(x, y + u * 0.28, u * (m === 'happy' || m === 'cheer' ? 0.24 : 0.16), 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 웃긴 효과
  ctx.fillStyle = '#ffffff';
  k.font(0.05, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (spicy) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = Math.max(2, u * 0.1);
    for (let j = 0; j < 3; j++) {
      const sx = x + (j - 1) * u * 0.55, ph = t * 0.22 + j * 2, hy = y - u * 1.2 - ((t * 0.6 + j * 9) % 18);
      ctx.beginPath();
      ctx.moveTo(sx, y - u * 1.0);
      ctx.quadraticCurveTo(sx + Math.sin(ph) * u * 0.3, (y - u * 1.0 + hy) / 2, sx, hy);
      ctx.stroke();
    }
  } else if (m === 'what') ctx.fillText('?', x - u * 1.2, y - u * 0.9 + Math.sin(t * 0.2) * 2);
  else if (m === 'angry') ctx.fillText('💢', x - u * 1.1, y - u * 0.8);
  else if (m === 'dizzy')
    for (let j = 0; j < 3; j++) {
      const a = t * 0.08 + (j * TAU) / 3;
      ctx.fillText('★', x + Math.cos(a) * u * 1.1, y - u * 1.05 + Math.sin(a) * u * 0.3);
    }
  else if (m === 'cheer') ctx.fillText('♪', x - u * 1.25, y - u * 0.7 - Math.abs(Math.sin(t * 0.15)) * 4);
}
function drawHands(k: Kit, s: PinState, x: number, u: number) {
  const { ctx, Y, t } = k;
  const up = s.mood === 'cheer' ? Math.abs(Math.sin(t * 0.18)) : 0;
  ctx.fillStyle = '#f6cfa8';
  ctx.strokeStyle = 'rgba(120,70,40,.5)';
  ctx.lineWidth = 1;
  for (const sx of [-1, 1]) {
    const hx = x + sx * u * 0.95, hy = Y(1.212) - u * 0.12 - up * u * 1.4;
    ctx.beginPath();
    ctx.ellipse(hx, hy, u * 0.26, u * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}
function drawCat(k: Kit, s: PinState) {
  const { ctx, X, Y, R, t } = k, W = s.W;
  // 선반
  ctx.fillStyle = 'rgba(70,35,10,.2)';
  ctx.fillRect(X(0.02), Y(0.158), R(0.12), R(0.012));
  ctx.fillStyle = '#9c6a3c';
  ctx.fillRect(X(0.015), Y(0.145), R(0.12), R(0.014));
  // 어디를 보나: 굴러가는 경단
  let tx = 0.5, ty = 0.6, n = 0;
  for (const b of W.b)
    if (!b.st && Math.hypot(b.x - b.px, b.y - b.py) > 0.004) {
      if (!n) (tx = 0), (ty = 0);
      tx += b.x;
      ty += b.y;
      n++;
    }
  if (n) (tx /= n), (ty /= n);
  const cx = X(0.07), cy = Y(0.118), u = R(0.032);
  const tail = Math.sin(t * 0.06) * 0.5;
  ctx.strokeStyle = '#e08a3c';
  ctx.lineWidth = u * 0.32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + u * 0.9, cy + u * 0.6);
  ctx.quadraticCurveTo(cx + u * 1.5, cy + u * 1.4, cx + u * (1.2 + tail), cy + u * 2.2);
  ctx.stroke();
  ctx.fillStyle = '#f2a65a';
  ctx.beginPath();
  ctx.ellipse(cx + u * 0.3, cy + u * 0.45, u * 1.0, u * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e08a3c';
  for (let j = 0; j < 3; j++) (ctx.beginPath(), ctx.ellipse(cx + u * (0.0 + j * 0.35), cy + u * 0.15, u * 0.08, u * 0.3, 0.2, 0, TAU), ctx.fill());
  const hx = cx - u * 0.45, hy = cy - u * 0.05 + (s.mood === 'wow' ? -u * 0.15 : 0);
  ctx.fillStyle = '#f2a65a';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sx * u * 0.62, hy - u * 0.15);
    ctx.lineTo(hx + sx * u * 0.5, hy - u * 0.95);
    ctx.lineTo(hx + sx * u * 0.1, hy - u * 0.5);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(hx, hy, u * 0.68, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff4e4';
  ctx.beginPath();
  ctx.ellipse(hx, hy + u * 0.3, u * 0.38, u * 0.28, 0, 0, TAU);
  ctx.fill();
  const lx = Math.max(-1, Math.min(1, (tx - 0.07) * 2.5)), ly = Math.max(-1, Math.min(1, (ty - 0.12) * 2));
  const wide = s.mood === 'wow' || s.mood === 'spicy';
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.ellipse(hx + sx * u * 0.27, hy - u * 0.05, u * 0.17, u * (wide ? 0.2 : 0.15), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.ellipse(hx + sx * u * 0.27 + lx * u * 0.07, hy - u * 0.05 + ly * u * 0.06, u * 0.07, u * (wide ? 0.14 : 0.1), 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#e86a7a';
  ctx.beginPath();
  ctx.arc(hx, hy + u * 0.18, u * 0.07, 0, TAU);
  ctx.fill();
}
function drawMouse(k: Kit, s: PinState, M: Mouse) {
  const { ctx, X, Y, R, t } = k, W = s.W;
  const hx = X(M.hx), hy = Y(M.hy + 0.02);
  ctx.fillStyle = '#2a170c';
  ctx.beginPath();
  ctx.ellipse(hx, hy, R(0.036), R(0.05), 0, Math.PI, 0);
  ctx.lineTo(hx + R(0.036), hy + R(0.014));
  ctx.lineTo(hx - R(0.036), hy + R(0.014));
  ctx.fill();
  const u = R(0.034), lastEat = W.mouseCool - 4, full = !W.mouseOn && W.eaten >= M.cap, gone = !W.mouseOn && !full;
  if (gone) {
    if (t - W.mouseT < 50) {
      ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - (t - W.mouseT) / 50)})`;
      for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.arc(hx + (j - 1.5) * u * 0.6, hy - u * 0.4 - (t - W.mouseT) * 0.3, u * 0.35, 0, TAU), ctx.fill());
    }
    return;
  }
  const reach = W.mouseOn && t - lastEat < 10 ? 1 - (t - lastEat) / 10 : 0, peek = W.mouseOn ? Math.sin(t * 0.08) * u * 0.1 : 0;
  const mx = hx - u * (0.55 + reach * 0.9) + peek, my = hy - u * 0.5;
  const cheek = Math.min(3, W.eaten) * 0.12;
  ctx.fillStyle = '#9a96a0';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(mx + sx * u * 0.45 + u * 0.15, my - u * 0.62, u * 0.38, 0, TAU), ctx.fill());
  ctx.fillStyle = '#f2b3c0';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(mx + sx * u * 0.45 + u * 0.15, my - u * 0.62, u * 0.22, 0, TAU), ctx.fill());
  ctx.fillStyle = '#a8a4ae';
  ctx.beginPath();
  ctx.ellipse(mx, my, u * (0.75 + cheek), u * (0.62 + cheek * 0.5), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff8fa0';
  ctx.beginPath();
  ctx.arc(mx - u * 0.72 - cheek * u, my + u * 0.05, u * 0.13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a1010';
  if (full) {
    ctx.strokeStyle = '#1a1010';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx - u * 0.3, my - u * 0.15, u * 0.1, 0, Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    k.font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.fillText('z', mx + u * 0.5, my - u * 1.3 - ((t * 0.3) % 10));
  } else {
    ctx.beginPath();
    ctx.arc(mx - u * 0.3, my - u * 0.15, u * 0.11, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(40,30,30,.6)';
  ctx.lineWidth = 1;
  for (const d of [-1, 0, 1]) (ctx.beginPath(), ctx.moveTo(mx - u * 0.75, my + u * 0.05), ctx.lineTo(mx - u * 1.35, my + u * 0.05 + d * u * 0.22), ctx.stroke());
  if (reach > 0) {
    ctx.fillStyle = '#c9c5cf';
    ctx.beginPath();
    ctx.ellipse(mx - u * 0.6, my + u * 0.55, u * 0.2, u * 0.14, 0, 0, TAU);
    ctx.fill();
  }
}

/** 미리 보기: 이 꼬치를 지금 뽑으면? */
interface Pre { paths: number[][]; label: string; bad: boolean }
const preCache = new WeakMap<object, { key: string; p: Pre }>();
function preview(s: PinState, p: number): Pre {
  const W = s.W, key = `${p}:${W.on}:${s.stage}:${W.pulled}:${W.quiet > 5}`, c = preCache.get(s);
  if (c && c.key === key) return c.p;
  const L = s.lv.L, V = s.lv.V, P = L.pins[p], S = observe(V, W), S2 = cloneMS(S), on2 = W.on & ~(1 << p);
  pullModel(V, S2, p);
  const paths: number[][] = [];
  if (P.ch >= 0) paths.push(route(L, P.ch, on2).pts);
  else
    for (let ci = 0; ci < L.chs.length && paths.length < 2; ci++) {
      const a = route(L, ci, W.on), b = route(L, ci, on2);
      if (a.end !== b.end && !empty(S.ch[ci])) paths.push(b.pts);
    }
  if (P.ch < 0 && !paths.length)
    for (let ci = 0; ci < L.chs.length && !paths.length; ci++) if (route(L, ci, W.on).end !== route(L, ci, on2).end) paths.push(route(L, ci, on2).pts);
  const parts: string[] = [];
  const db = total(S2) - total(S), eat = S2.eaten - S.eaten, lost = S2.lost - S.lost, pot = S2.potP - S.potP;
  let dyed = 0, hot = 0;
  for (let ci = 0; ci < L.chs.length; ci++) {
    dyed += Math.max(0, S.ch[ci].g - S2.ch[ci].g - (S.ch[ci].g && empty(S2.ch[ci]) ? S.ch[ci].g : 0));
    hot += Math.max(0, S2.ch[ci].h - S.ch[ci].h);
  }
  let bad = false;
  if (S2.fail && !S.fail) {
    bad = true;
    parts.push(S2.fail === 'gray' ? '💥 회색이 그릇에!' : S2.fail === 'mix' ? '💥 색이 섞여요!' : '💥 매워요!');
  } else {
    if (db > 0) parts.push(`🥣 +${db}`);
    if (dyed > 0) parts.push('🎨 물듦');
    if (hot > 0) (parts.push('🥵 매워져요'), (bad = true));
    if (eat > 0) (parts.push(`🐭 냠 ${eat}`), (bad = true));
    if (S.syrup && !S2.syrup) parts.push('🍯 찰싹');
    if (pot > 0) parts.push('🏺 김치로');
    if (lost > 0) (parts.push(`경단 ${lost}개 잃음`), (bad = true));
    for (let ci = 0; ci < L.chs.length; ci++)
      if (L.chs[ci].W && dango(S2.ch[ci]) > dango(S.ch[ci])) parts.push(`⚖️ ${dango(S2.ch[ci])}/${V.v.W ?? 6}`);
    if (!parts.length) parts.push(P.ch >= 0 ? (empty(S.ch[P.ch]) ? '빈 단지' : '아래 단지로') : '길만 바뀌어요');
  }
  const pre = { paths, label: parts.slice(0, 3).join(' '), bad };
  preCache.set(s, { key, p: pre });
  return pre;
}

/** 판마다 새 장치를 눈에 띄게: 판이 시작되면 장치를 하나씩 비추고 '무엇을 해야 하나'를 한 줄로 */
interface Spot { x: number; y: number; r: number; text: string }
const spotCache = new WeakMap<object, Spot[]>();
function spotsOf(s: PinState): Spot[] {
  const lv = s.lv, hit = spotCache.get(lv);
  if (hit) return hit;
  const L = lv.L, v = lv.v, a: Spot[] = [], key = STAGES[s.stage].key;
  v.fills.forEach((f, ci) => {
    if (!f) return;
    const c = L.chs[ci], y = (c.top + c.fy) / 2;
    if (f.k === 1 && (key === 'gray' || key === 'party')) a.push({ x: c.cx, y, r: c.w * 0.62, text: '⚪ 회색 반죽 — 색 경단을 먼저 만나게!' });
    if (f.k === 2 && (key === 'pepper' || key === 'mouse' || key === 'syrup')) a.push({ x: c.cx, y, r: c.w * 0.62, text: '🌶️ 고춧가루 — 경단에 닿으면 매워요' });
  });
  for (const p of L.tap)
    if (L.pins[p].kind === 1) {
      const sg = L.segs[L.pins[p].seg];
      a.push({ x: (sg.ax + sg.bx) / 2, y: (sg.ay + sg.by) / 2, r: 0.2, text: v.bc ? '↘️ 줄무늬 꼬치 = 길 바꾸기 (있으면 왼쪽)' : '↘️ 줄무늬 꼬치 — 있으면 🏺로, 빼면 그릇으로' });
    }
  if (L.pot && key !== 'party') a.push({ x: L.pot.x, y: 1.12, r: 0.12, text: '🏺 김치 항아리 — 고춧가루는 여기로' });
  L.chs.forEach((c) => c.W && a.push({ x: c.cx, y: c.top + c.h / 2, r: c.w * 0.62, text: `⚖️ 저울 — ${v.W ?? 6}개 모여야 덜컥! 모아서 보내요` }));
  if (v.bc) L.bowls.forEach((bw, i) => a.push({ x: bw.x, y: 1.13, r: 0.13, text: `🥣 ${i ? '오른쪽' : '왼쪽'} 그릇은 ${CNAME[v.bc![i]]}만!` }));
  if (L.mouse) a.push({ x: L.mouse.x + 0.02, y: L.mouse.y, r: 0.1, text: '🐭 경단 도둑 — 🌶️가 먼저 지나가면 에취!' });
  if (L.syrup) a.push({ x: L.syrup.x, y: L.syrup.y + 0.02, r: 0.1, text: '🍯 조청 — 맨 처음 지나간 것만 찰싹!' });
  spotCache.set(lv, a);
  return a;
}
const SPOT0 = 70, SPOT_T = 85;
function drawSpots(k: Kit, s: PinState) {
  if (s.tries > 0 || s.phase !== 'play') return;
  const { ctx, X, Y, R, w, h, t } = k, list = spotsOf(s), age = t - s.startT - SPOT0;
  if (age < 0 || age >= list.length * SPOT_T) return;
  const i = Math.floor(age / SPOT_T), u = age - i * SPOT_T, sp = list[i];
  const a = Math.min(1, u / 10, (SPOT_T - u) / 12), pr = R(sp.r) * (1 + 0.05 * Math.sin(t * 0.2));
  // 장치만 밝고 나머지는 살짝 어둡게
  ctx.save();
  ctx.globalAlpha = a * 0.42;
  ctx.fillStyle = '#2a1508';
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(X(sp.x), Y(sp.y), pr, 0, TAU, true);
  ctx.fill('evenodd');
  ctx.restore();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 3;
  ctx.setLineDash([R(0.02), R(0.012)]);
  ctx.lineDashOffset = -t * 0.6;
  ctx.beginPath();
  ctx.arc(X(sp.x), Y(sp.y), pr, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  k.font(0.04, 900);
  const tw = ctx.measureText(sp.text).width + R(0.045), below = sp.y < 0.75;
  let bx = X(sp.x), by = below ? Y(sp.y) + pr + R(0.05) : Y(sp.y) - pr - R(0.05);
  bx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, bx));
  by = Math.max(Y(0.11), Math.min(Y(1.3), by));
  ctx.fillStyle = 'rgba(255,224,102,.97)';
  ctx.beginPath();
  ctx.roundRect(bx - tw / 2, by - R(0.03), tw, R(0.06), R(0.03));
  ctx.fill();
  ctx.fillStyle = '#3a2414';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sp.text, bx, by + 1);
  ctx.globalAlpha = 1;
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: PinState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.lv.L, W = s.W, V = s.lv.V, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const k: Kit = { ctx, X, Y, R, t, w, h, font };
  ctx.save();
  fx.begin(ctx);
  drawRoom(k);
  drawCat(k, s);
  // 홈통·널빤지
  for (const sg of L.segs) if (sg.pin < 0 && sg.look === 2) drawBoard(k, sg);
  for (const sg of L.segs) if (sg.pin < 0 && sg.look === 1) drawBamboo(k, sg);
  // 조청
  if (L.syrup) {
    const Sy = L.syrup, used = W.syrupT >= 0;
    let pep = 0, dg = 0;
    for (const b of W.b) if (b.st === 5) b.k === 2 ? pep++ : dg++;
    const g = ctx.createRadialGradient(X(Sy.x - 0.02), Y(Sy.y + 0.015), R(0.01), X(Sy.x), Y(Sy.y + 0.03), R(0.08));
    const base = used && pep >= dg ? '#a8321e' : '#e9a23b';
    g.addColorStop(0, tint(base, '#fff2c0', 0.45));
    g.addColorStop(1, tint(base, '#6a3008', 0.25));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(X(Sy.x), Y(Sy.y + 0.028), R(0.075), R(0.024), -0.42, 0, TAU);
    ctx.fill();
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(X(Sy.x - 0.04 + j * 0.035), Y(Sy.y + 0.06 + j * 0.006 + 0.004 * Math.sin(t / 30 + j)), R(0.007), R(0.014 + 0.004 * Math.sin(t / 25 + j)), 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(X(Sy.x - 0.025), Y(Sy.y + 0.022), R(0.02), R(0.005), -0.42, 0, TAU);
    ctx.fill();
    if (!used) {
      font(0.032, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7a3c08';
      ctx.fillText('조청', X(Sy.x + 0.07), Y(Sy.y + 0.075));
    }
  }
  // 단지(뒤)
  for (const c of L.chs) {
    if (c.W) {
      ctx.fillStyle = 'rgba(90,50,15,.12)';
      ctx.fillRect(X(c.x0 + 0.014), Y(c.top + 0.02), R(c.w), R(c.h));
      const g = ctx.createLinearGradient(X(c.x0), 0, X(c.x1), 0);
      g.addColorStop(0, 'rgba(255,255,255,.4)');
      g.addColorStop(1, 'rgba(170,205,225,.3)');
      ctx.fillStyle = g;
      ctx.fillRect(X(c.x0), Y(c.top), R(c.w), R(c.h));
    } else drawJarBack(k, c);
  }
  if (L.mouse) drawMouse(k, s, L.mouse);
  // 경단·고춧가루
  for (const b of W.b) {
    if (b.st !== 0 && b.st !== 5) continue;
    if (b.k === 2) drawFlake(k, X(b.x), Y(b.y), R(b.r) * 1.05, b.rot, b.st === 5);
    else {
      const lk = ballLook(b, t);
      drawDango(k, X(b.x), Y(b.y + (b.st === 5 ? 0.006 : 0)), R(b.r), lk.col, b.st === 5 ? 3 : lk.face, b.rot, b.st === 5 ? 1 : 0);
      if (b.k === 0 && t - b.tD < 14 && b.tD > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${1 - (t - b.tD) / 14})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X(b.x), Y(b.y), R(b.r) * (1 + (t - b.tD) / 10), 0, TAU);
        ctx.stroke();
      }
    }
  }
  // 생쥐가 먹는 경단 (입으로 쏙)
  if (L.mouse)
    for (const b of W.b) {
      if (b.st !== 4 || t - b.tc > 10) continue;
      const q = (t - b.tc) / 10, mx = L.mouse.hx - 0.04, my = L.mouse.hy;
      drawDango(k, X(b.sx + (mx - b.sx) * q), Y(b.sy + (my - b.sy) * q), R(b.r) * (1 - q * 0.7), ballLook(b, t).col, 1, 0);
    }
  const pressK = s.down && s.phase === 'play' ? s.press : -1;
  // 단지(앞 유리)
  for (const c of L.chs) {
    if (c.W) {
      ctx.strokeStyle = 'rgba(120,165,195,.75)';
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      ctx.moveTo(X(c.x0), Y(c.top));
      ctx.lineTo(X(c.x0), Y(c.fy));
      ctx.moveTo(X(c.x1), Y(c.top));
      ctx.lineTo(X(c.x1), Y(c.fy));
      ctx.stroke();
      // 저울 바닥(놋쇠 판) — 열리면 양쪽으로 툭 떨어진다
      const ci = L.chs.indexOf(c), open = !((W.on >> c.pin) & 1), a = open ? ease((t - W.scaleOpen[ci]) / 8) * 1.25 : 0;
      ctx.strokeStyle = '#b8862c';
      ctx.lineWidth = R(0.016);
      ctx.lineCap = 'round';
      for (const sx of [-1, 1]) {
        const ox = sx < 0 ? c.x0 : c.x1, len = c.w / 2;
        ctx.beginPath();
        ctx.moveTo(X(ox), Y(c.fy));
        ctx.lineTo(X(ox - sx * Math.cos(a) * len), Y(c.fy + Math.sin(a) * len));
        ctx.stroke();
      }
      ctx.strokeStyle = '#f2cf6a';
      ctx.lineWidth = R(0.005);
      if (!open) (ctx.beginPath(), ctx.moveTo(X(c.x0), Y(c.fy - 0.004)), ctx.lineTo(X(c.x1), Y(c.fy - 0.004)), ctx.stroke());
      // 눈금판
      const need = V.v.W ?? 6, n = W.scaleN[ci], dx = X(c.x1 + 0.055), dy = Y(c.top + 0.05), dr = R(0.042);
      ctx.fillStyle = 'rgba(70,35,10,.25)';
      ctx.beginPath();
      ctx.arc(dx + 2, dy + 3, dr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#b8862c';
      ctx.lineWidth = R(0.008);
      ctx.stroke();
      const q = Math.min(1, n / need), na = Math.PI * (0.8 + 1.4 * q) + (W.scaleT[ci] > 0 && !open ? Math.sin(t * 0.8) * 0.08 : 0);
      ctx.strokeStyle = q >= 1 ? '#e2452f' : '#3a2414';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + Math.cos(na) * dr * 0.8, dy + Math.sin(na) * dr * 0.8);
      ctx.stroke();
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3a2414';
      ctx.fillText(`${n}/${need}`, dx, dy + dr * 0.48);
      ctx.fillStyle = '#ffffff';
      font(0.03, 800);
      ctx.fillText('⚖️', dx, dy - dr * 0.4);
    } else drawJarFront(k, c);
  }
  // 꼬치
  for (const p of L.tap) {
    const on = (W.on >> p) & 1;
    if (on) drawPin(k, L, p, 0, 1, p === pressK);
    else if (s.pullT[p] >= 0 && t - s.pullT[p] < 30) {
      const u = t - s.pullT[p];
      drawPin(k, L, p, ease(u / 12) * 0.22 + Math.max(0, u - 12) * 0.012, Math.max(0, 1 - Math.max(0, u - 14) / 16), false);
    }
  }
  // 할머니(카운터 뒤) · 카운터 · 그릇 · 항아리
  const gx = X(0.875), gu = R(0.066);
  drawGranny(k, s, gx, Y(1.15), gu);
  drawCounter(k);
  if (L.pot) drawPot(k, L.pot, 0, W.b.filter((b) => b.st === 2 && b.k === 2).length);
  /** 그릇이 경단을 받을 때마다 통 — 살짝 눌렸다 튄다 */
  const bob = (i: number) => {
    const u = t - (s.bowlT[i] ?? -99);
    return u >= 0 && u < 12 ? Math.sin((u / 12) * Math.PI) * R(0.009) : 0;
  };
  L.bowls.forEach((bw, i) => (ctx.save(), ctx.translate(0, bob(i)), drawBowl(k, bw, 0, V.v.bc ? V.v.bc[i] : -1), ctx.restore()));
  // 그릇 무더기 (잡힌 순서대로 자리)
  for (const b of W.b) {
    if (b.st !== 1) continue;
    const bw = L.bowls[b.bi], [sx, sy] = slotXY(bw, b.slot), q = ease((t - b.tc) / 12), hop = Math.sin(Math.PI * Math.min(1, (t - b.tc) / 12)) * 0.03;
    const x = b.sx + (sx - b.sx) * q, y = b.sy + (sy - b.sy) * q - hop;
    const by = q >= 1 ? bob(b.bi) : 0;
    if (b.k === 2) drawFlake(k, X(x), Y(y) + by, R(0.02), b.rot);
    else drawDango(k, X(x), Y(y) + by, R(0.024), ballLook(b, t).col, b.hot ? 4 : b.k === 1 ? 3 : 2, 0);
  }
  L.bowls.forEach((bw, i) => (ctx.save(), ctx.translate(0, bob(i)), drawBowl(k, bw, 1, V.v.bc ? V.v.bc[i] : -1), ctx.restore()));
  if (L.pot) {
    for (const b of W.b)
      if (b.st === 2 && t - b.tc < 14) {
        const q = (t - b.tc) / 14;
        if (b.k === 2) drawFlake(k, X(b.sx), Y(b.sy + q * 0.04), R(b.r) * (1 - q), b.rot);
        else drawDango(k, X(b.sx), Y(b.sy + q * 0.05), R(b.r) * (1 - q * 0.5), ballLook(b, t).col, 1, 0);
      }
    drawPot(k, L.pot, 1, 0);
  }
  drawHands(k, s, gx, gu);
  // 그릇 개수 팻말
  L.bowls.forEach((bw, i) => {
    const n = W.bowlN[i], two = L.bowls.length > 1, txt = two ? `${n}` : `🍡 ${n}/${V.N}`, pu = t - (s.bowlT[i] ?? -99);
    font(0.04, 900);
    const tw = ctx.measureText(txt).width + R(two ? 0.05 : 0.03), tx = X(bw.x), ty = Y(1.262);
    ctx.save();
    if (pu >= 0 && pu < 10) {
      const sc = 1 + (1 - pu / 10) * 0.28;
      ctx.translate(tx, ty);
      ctx.scale(sc, sc);
      ctx.translate(-tx, -ty);
    }
    ctx.fillStyle = 'rgba(40,20,5,.35)';
    ctx.beginPath();
    ctx.roundRect(tx - tw / 2 + 2, ty - R(0.024) + 3, tw, R(0.048), R(0.012));
    ctx.fill();
    ctx.fillStyle = n >= (two ? 1e9 : V.N) ? '#ffe9a8' : '#f6e2bf';
    ctx.beginPath();
    ctx.roundRect(tx - tw / 2, ty - R(0.024), tw, R(0.048), R(0.012));
    ctx.fill();
    ctx.strokeStyle = '#8a5a30';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a2414';
    ctx.fillText(txt, tx + (two ? R(0.012) : 0), ty + 1);
    if (two && V.v.bc) {
      ctx.fillStyle = COLS[V.v.bc[i]];
      ctx.beginPath();
      ctx.arc(tx - tw / 2 + R(0.022), ty, R(0.013), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#3a2414';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  });
  // ═════════ 미리 보기 ═════════
  if (pressK >= 0) {
    const pre = preview(s, pressK), P = L.pins[pressK];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pts of pre.paths) {
      if (pts.length < 4) continue;
      for (const [col, lw] of [['rgba(60,30,10,.45)', R(0.014)], [pre.bad ? '#ffb4a0' : '#ffffff', R(0.007)]] as [string, number][]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.setLineDash([R(0.016), R(0.014)]);
        ctx.lineDashOffset = -t * 0.8;
        ctx.beginPath();
        for (let j = 0; j < pts.length; j += 2) j ? ctx.lineTo(X(pts[j]), Y(pts[j + 1])) : ctx.moveTo(X(pts[j]), Y(pts[j + 1]));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      const ex = pts[pts.length - 2], ey = pts[pts.length - 1];
      ctx.fillStyle = pre.bad ? '#ff6a50' : '#ffffff';
      ctx.beginPath();
      ctx.arc(X(ex), Y(ey), R(0.016) + Math.sin(t * 0.3) * 1.5, 0, TAU);
      ctx.fill();
    }
    font(0.04, 900);
    const tw = ctx.measureText(pre.label).width + R(0.04);
    let bx = X(P.hx) - P.ux * R(0.02), by = Y(P.hy) - R(0.075);
    bx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, bx));
    by = Math.max(Y(0.1), by);
    ctx.fillStyle = pre.bad ? 'rgba(150,30,20,.92)' : 'rgba(40,24,12,.9)';
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2, by - R(0.028), tw, R(0.056), R(0.028));
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pre.label, bx, by + 1);
  }
  // 첫 판: 손가락
  if (s.stage === 0 && s.taps === 0 && s.phase === 'play' && t - s.startT > 30 && pressK < 0) {
    const p = L.tap[0], P = L.pins[p], bob = Math.sin(t * 0.15) * R(0.012);
    const x = X(P.hx - P.ux * 0.03), y = Y(P.hy);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, R(0.055) + Math.sin(t * 0.15) * 2, 0, TAU);
    ctx.stroke();
    ctx.font = `${Math.max(18, R(0.075))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', x + R(0.02), y + R(0.075) + bob);
  }
  drawSpots(k, s);
  // 느린 화면: 가장자리가 금빛으로
  if (s.slow > 0) {
    const a = Math.min(1, s.slow / 20) * 0.35, sg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.45), w / 2, h * 0.5, R(1.0));
    sg.addColorStop(0, 'rgba(255,220,120,0)');
    sg.addColorStop(1, `rgba(255,214,102,${a})`);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.45, R(0.5), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(60,30,5,.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.12), Math.min(Y(1.17), y));
    for (let j = 0; j < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); j++) y -= size + 5;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Y(e.y), col = e.col ?? '#ffffff';
    switch (e.kind) {
      case 'pull':
        fx.ring(x, y, '#fff3c4', R(0.07), 3);
        fx.burst(x, y, '#efd59f', 8, 2.2, 1.6);
        say(x, y - R(0.05), e.text!, col, 16);
        break;
      case 'in': {
        // 많이 담길수록 점점 크게: 파티클·흔들림·숫자
        const v = e.v ?? 1, bx = X(L.bowls[0] && L.bowls.length === 1 ? L.bowls[0].x : e.x);
        fx.burst(x, Y(1.1), col, 4 + Math.min(v, 14), 1.8 + Math.min(v, 14) * 0.12, 1.6 + Math.min(v, 10) * 0.08);
        fx.burst(x, Y(1.1), '#fff6c8', 3, 1.4, 1.2);
        fx.kick(Math.min(5.5, 0.6 + v * 0.35));
        if (v % 5 === 0) fx.ring(bx, Y(1.1), col, R(0.12 + Math.min(v, 15) * 0.008), 3);
        fx.pop(bx + (hsh(e.t) - 0.5) * R(0.06), Y(1.0) - Math.min(v, 12) * 2, e.text!, v >= 8 ? '#ffd166' : '#fff6c8', 15 + Math.min(v, 14) * 1.5);
        break;
      }
      case 'pour': {
        const v = e.v ?? 4;
        fx.blink('#fff3c4', 0.18);
        fx.ring(x, Y(1.1), '#ffe066', R(0.22 + v * 0.01), 6);
        for (const c of COLS) fx.burst(x, Y(1.08), c, 8 + v, 4 + v * 0.15, 2.6);
        say(x, Y(0.93), e.text!, col, Math.min(30, 19 + v));
        break;
      }
      case 'goal':
        fx.blink('#ffe9a0', 0.32);
        fx.kick(6);
        fx.ring(x, Y(1.08), '#ffe066', R(0.34), 7);
        for (const c of ['#ffe066', ...COLS]) fx.burst(x, Y(1.05), c, 16, 5.5, 3);
        say(w / 2, Y(0.88), e.text!, col, 27);
        break;
      case 'full':
        fx.blink('#fff6c8', 0.4);
        fx.kick(7);
        fx.ring(x, Y(1.08), '#ffe066', R(0.42), 8);
        fx.ring(x, Y(1.08), '#ff8db4', R(0.3), 6);
        for (const c of ['#ffe066', '#ffffff', ...COLS]) fx.burst(x, Y(1.05), c, 20, 6.5, 3.2);
        say(w / 2, Y(0.84), e.text!, col, 25);
        break;
      case 'chain':
        fx.ring(x, y, '#ffffff', R(0.16), 5);
        fx.kick(3);
        say(x, y - R(0.1), e.text!, col, 19);
        break;
      case 'bad':
        fx.kick(8);
        fx.blink('#ff6a50', 0.28);
        fx.burst(x, Y(1.1), '#ff5a3a', 22, 3.6, 2.6);
        fx.ring(x, Y(1.1), '#ff6a50', R(0.2), 5);
        say(w / 2, Y(0.98), e.text!, '#ffd0c8', 18);
        break;
      case 'dye': {
        const v = e.v ?? 1;
        fx.ring(x, y, col, R(0.045 + Math.min(v, 8) * 0.004), 2.5);
        fx.burst(x, y, col, 5 + Math.min(v, 8), 1.6 + v * 0.1, 1.6);
        fx.burst(x, y, '#ffffff', 3, 1.2, 1.2);
        if (v === 1) say(x, y - R(0.06), e.text!, '#ffffff', 16);
        else fx.pop(x, y - R(0.04), e.text!, col, 13 + Math.min(v, 10) * 1.2);
        break;
      }
      case 'hot':
        fx.burst(x, y, '#ff6a40', 6, 1.8, 1.7);
        if (e.text) (say(x, y - R(0.06), e.text, col, 17), fx.kick(3));
        break;
      case 'eat':
        fx.burst(x, y, '#ffe0b8', 8, 2, 1.6);
        say(x - R(0.05), y - R(0.05), e.text!, col, 16);
        break;
      case 'sneeze':
        fx.ring(x, y, '#ffffff', R(0.12), 4);
        fx.burst(x, y, '#ffffff', 16, 3.4, 2.4);
        fx.kick(4);
        say(x - R(0.12), y - R(0.06), e.text!, col, 17);
        break;
      case 'full':
        say(x - R(0.1), y - R(0.07), e.text!, col, 15);
        break;
      case 'potP':
        fx.burst(x, Y(1.08), '#ff5a3a', 6, 1.8, 1.8);
        if (e.text) say(x + R(0.08), Y(1.0), e.text, col, 15);
        break;
      case 'potD':
        if (e.text) say(x + R(0.08), Y(1.0), e.text, '#ffd8c0', 15);
        break;
      case 'lost':
        if (e.text) say(x, Y(1.15), e.text, '#fff3df', 14);
        break;
      case 'scale':
        fx.kick(4);
        fx.ring(x, y, '#ffe066', R(0.14), 4);
        fx.burst(x, y, '#ffe066', 14, 3, 2);
        say(x, y - R(0.08), e.text!, col, 18);
        break;
      case 'stick':
        fx.ring(x, y, '#e9a23b', R(0.09), 4);
        fx.burst(x, y, '#e9a23b', 12, 2.4, 2);
        say(x, y - R(0.08), e.text!, col, 16);
        break;
      case 'miss':
        say(x, y, e.text!, col, 14);
        break;
      case 'stage':
        fx.blink('#fff6d6', 0.18);
        break;
      case 'clear':
        fx.burst(X(0.5), Y(1.05), '#ffe066', 44, 6, 3.2);
        fx.burst(X(0.5), Y(1.05), '#ff8db4', 30, 5, 3);
        fx.burst(X(0.5), Y(1.05), '#86c95f', 24, 5, 3);
        fx.ring(X(0.5), Y(1.05), '#ffe066', R(0.35), 6);
        fx.blink('#fff6c8', 0.25);
        break;
      case 'fail':
        fx.kick(9);
        fx.blink(th.hot, 0.22);
        break;
    }
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(k, s, d, th);
}

function drawHud(k: Kit, s: PinState, d: StageDef, th: Theme) {
  const { ctx, Y, R, w, t, font } = k, W = s.W, V = s.lv.V;
  const hb = R(0.07);
  ctx.fillStyle = 'rgba(58,32,14,.88)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1d6';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 110 && s.phase === 'play') {
      const a = Math.min(1, age / 8, (110 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(0.58));
      ctx.scale(sc, sc);
      font(0.072, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(60,30,10,.8)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.042, 800);
      const bc = V.v.bc, sub = bc ? `왼쪽 ${CNAME[bc[0]]} · 오른쪽 ${CNAME[bc[1]]} — 합 ${V.N}개!` : `그릇에 색 경단 ${V.N}개!`;
      ctx.strokeText(sub, 0, R(0.065));
      ctx.fillText(sub, 0, R(0.065));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(60,70,20,.66)' : 'rgba(90,25,15,.66)';
    ctx.fillRect(0, Y(0.5), w, R(0.27));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(s.ok ? 0.058 : 0.048, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '잔치 완성! 🎉' : `${d.emoji} ${d.name} 완성!`) : s.why, w / 2, Y(0.56));
    if (s.ok) {
      for (let j = 0; j < 3; j++) {
        const ag = age - 14 - j * 10, got = j < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (j - 1) * R(0.1), Y(0.645));
        if (got && (juice(s).memo['star' + j] ?? -1) < s.clearT) (juice(s).memo['star' + j] = s.clearT), juice(s).burst(w / 2 + (j - 1) * R(0.1), Y(0.645), '#ffe066', 14, 3, 2.4);
      }
      font(0.036, 800);
      ctx.fillStyle = '#ffffff';
      const n = bowlTotal(W), miss = s.lv.F - n;
      ctx.fillText(`경단 ${n}개${miss > 0 ? ` · ${miss}개 놓침` : ' · 하나도 안 잃음!'}${s.tries ? ' · 다시 해서 깸' : ''}`, w / 2, Y(0.72));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 판을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.65));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y2 = Y(1.392), n = bowlTotal(W), done = s.phase === 'result' && s.ok;
    const fullFail = W.lost + W.eaten > 0 || W.b.some((b) => b.st === 2 && b.k !== 2) || W.b.some((b) => b.st === 5 && b.k !== 2) || W.b.some((b) => b.hot);
    const chips = [
      { txt: `목표 ${V.N}`, st: done ? true : n >= V.N ? true : null },
      { txt: `가득 ${V.F}`, st: done && n >= V.F ? true : fullFail || (s.phase === 'result' && !s.ok) ? false : n >= V.F ? true : null },
      { txt: '한 번에', st: s.tries > 0 ? false : done ? true : null },
    ];
    const gx0 = R(0.03), gw = (w - gx0 * 2) / 3;
    chips.forEach(({ txt, st }, j) => {
      const gx = gx0 + j * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.38)' : st === false ? 'rgba(0,0,0,.3)' : 'rgba(255,240,210,.14)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.027), gw - 4, R(0.054), R(0.027));
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      font(0.036, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.5)' : '#fff6e0';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
    let tp = d.tip;
    if (s.stage === 0 && s.taps === 0) tp = '👆 꼬치를 톡! 쑥 빠지면 데굴데굴';
    else if (s.down && s.press >= 0) tp = '떼면 쑥! · 꼬치 밖에서 떼면 취소';
    else if (s.phase === 'result') tp = s.ok ? (s.won ? '할머니 떡집 잔치 끝!' : '다음 판이 와요!') : '같은 판을 다시 — 누르고 있으면 길이 보여요';
    else if (s.tries > 0 && s.taps < 2) tp = '💡 꼬치를 누르고 있으면 무슨 일이 날지 보여요';
    ctx.textAlign = 'center';
    const nw = s.news && t - s.news.t < NEWS_T + 20 && !(s.down && s.press >= 0);
    if (nw) tp = '✨ ' + s.news!.text;
    let fs = 0.037;
    font(fs, nw ? 900 : 800);
    while (ctx.measureText(tp).width > w - R(0.05) && fs > 0.031) font((fs -= 0.001), nw ? 900 : 800);
    if (nw) {
      const age = t - s.news!.t, pop = 1 + Math.max(0, 8 - age) * 0.03, tw2 = Math.min(w - 4, ctx.measureText(tp).width + R(0.04));
      ctx.save();
      ctx.translate(w / 2, Y(1.455));
      ctx.scale(pop, pop);
      ctx.fillStyle = `rgba(255,${200 + Math.round(30 * Math.sin(t * 0.15))},90,.95)`;
      ctx.beginPath();
      ctx.roundRect(-tw2 / 2, -R(0.03), tw2, R(0.06), R(0.03));
      ctx.fill();
      ctx.fillStyle = '#3a2414';
      ctx.fillText(tp, 0, 1);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,240,214,.95)';
      ctx.fillText(tp, w / 2, Y(1.455));
    }
  }
  ctx.textBaseline = 'alphabetic';
}
