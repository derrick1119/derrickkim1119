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

const pick = <T,>(r: Rng, a: T[]) => a[Math.floor(r() * a.length)];
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
      wall(L, 0.19, 0.74, 0.19, 0.99, 2);
      wall(L, 0.33, 0.86, 0.7, 0.95);
      wall(L, 0.33, 0.815, 0.33, 0.86, 2);
      wall(L, 0.81, 0.84, 0.81, 1.0, 2);
      bowl(L, 0.27, 0.12);
      bowl(L, 0.73, 0.12);
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
        ev(s, 'in', e.x, e.y, once(s, 'in', 14) ? '퐁!' : undefined, col);
        if (!W.fail && s.mood !== 'spicy') setMood(s, 'happy');
        see(s, 'bowl', '🥣 그릇에 쏙! 목표 개수를 채워요');
        break;
      }
      case 'bad':
        ev(s, 'bad', e.x, e.y, WHY[W.fail] ?? '앗!', '#ffd0c8');
        setMood(s, W.fail === 'pepper' || W.fail === 'hot' ? 'spicy' : 'what');
        break;
      case 'dye':
        ev(s, 'dye', e.x, e.y, once(s, 'dye', 50) ? '물들었다!' : undefined, col);
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
        ev(s, 'scale', e.x, e.y, '덜컥!', '#fff1a8');
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
      pullT: [], mood: 'idle', moodT: 0, pop: {},
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
    stepWorld(lv.L, W, lv.v);
    if (W.out.length) absorb(s);
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
function drawAll(ctx: CanvasRenderingContext2D, s: PinState, w: number, h: number, th: Theme) {
  void th;
  ctx.fillStyle = '#f3e3c3';
  ctx.fillRect(0, 0, w, h);
  void s;
}
