/**
 * 동물 떨구기 합체 온천 (26라운드: 검증된 캐주얼 뼈대 × 공장의 와우, 2탄) — 합치기 × 가리키기(누르고 떼기) × 연쇄.
 * 뼈대: 요즘 잘 팔리는 '떨어뜨려 합치기' 퍼즐. 위에서 떨군 것이 통 안에서 물리로 구르고 쌓이고, 같은 것 둘이 닿으면 한 단계 큰 것.
 *   우리 것(과일 대신): 눈 내리는 산속 노천 온천탕에 동물 손님이 퐁당 — 병아리 → 닭 → 펭귄 → 너구리 → 양 → 판다 → 하마 → 코끼리.
 * 기준 9(손이 하는 일은 하나): 누르고 있으면 대나무 줄에 매달린 바구니가 그 자리로 가고, 떨어질 세로선과 내려앉을 자리가 보인다
 *   (선 끝에 같은 동물이 있으면 선이 금빛 — '뿅 예정'). 떼면 바구니가 기울며 퐁당. 다음 동물 하나는 오른쪽 위 나무통에.
 *   키보드는 화살표 커서 + 스페이스(누르는 동안 겨누고, 떼면 퐁당).
 * 물리(결정적, 고정 틱): 원 사이 충돌·중력·마찰을 위치 기반으로 푼다(봇의 미리 굴려 보기 = 실제).
 *   합쳐지면 '뿅' 김이 터지며 둘레 동물을 살짝 밀어 올린다 — 꽉 낀 탕이 들썩이며 굴러 내려가 다음 합체로 이어진다(연쇄).
 *   연쇄가 3번을 넘거나 판다 이상이 생기면 느린 화면(물리를 두 틱에 한 번 — 결과는 같고 천천히 보인다), 길수록 더 크게 터진다.
 *   꽉 끼어 위에서 눌리는 동물은 찌그러진 얼굴(>_<), 떨어지는 동물은 놀란 얼굴, 막 합쳐진 동물은 헤헤, 금줄 위 동물은 식은땀.
 * 판 8개: 판마다 목표(목표 동물 만들기 · 바위 깨기 · 김 모으기)를 정해진 동물 수 안에. 2판부터는 손님이 빽빽한 '만원 온천'에서 시작
 *   (닿은 이웃끼리 다른 동물로 앉혀서 시작하자마자 뿅은 없다).
 *   ★ 목표 · ★ 금줄 무사(한 번도 금줄 위로 넘치지 않음) · ★ 한 번 떨궈 뿅 C번(연쇄).
 *   실패(금줄 위로 넘친 채 1.7초 · 동물이 다 떨어짐) = 하트 -1, 그 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1 첫 온천(병아리 위에 퐁당 → 뿅뿅뿅 연쇄) → 2 만원 온천(빽빽한 탕 — 금줄·다음 동물을 보고 자리 남기기)
 *   → 3 바위 온천(안 합쳐지는 바위 셋 — 그 옆에서 양 이상을 만들어 쩍!) → 4 졸린 손님(😴 수면 모자: 숫자만큼 더 떨궈야 깨어남 — 어디에 재울까)
 *   → 5 물바가지(🪣 떨군 곳 둘레를 콸콸 밀고 졸린 동물을 깨움 — 어디에 끼얹을까) → 6 시소 탕(4번 떨굴 때마다 반대로 기울어 와르르 — 곧 낮아질 쪽에 모아 두기)
 *   → 7 김 모으기(한 번에 연달아 뿅 할수록 김이 곱절 — 큰 동물보다 연쇄 계단) → 8 산꼭대기 큰 탕(전부).
 * 전략: 큰 동물을 한쪽에 모으고 작은 동물은 위로, 다음 동물을 보고 자리를 남기기. 3판부터 '같은 동물 위에 떨구기'·'늘 가운데' 버릇 봇이
 *   ★3을 절반 넘게 못 딴다(측정: 판별 ★3 0.25~0.46).
 * 웃음: 대나무 줄 끝의 눈원숭이(머리에 수건)가 평소엔 눈 감고 노곤 ~♪, 큰 합체엔 깜짝, 넘칠 듯하면 허둥지둥, 성공하면 만세, 넘치면 어질어질 별.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 탕 안쪽 벽(왼·오른쪽) · 바닥 · 넘침 금줄 · 떨구는 높이 · 대나무 줄 높이 (가로 = 1) */
export const TL = 0.1, TR = 0.9, FLOOR = 1.2, LINE = 0.5, DROPY = 0.375, RAIL = 0.27;
/** 동물 반지름: 병아리 → 코끼리 */
export const RAD = [0.048, 0.062, 0.079, 0.1, 0.124, 0.151, 0.18, 0.212];
export const MAXLV = RAD.length - 1;
export const NAMES = ['병아리', '닭', '펭귄', '너구리', '양', '판다', '하마', '코끼리'];
export const EMO = ['🐤', '🐔', '🐧', '🦝', '🐑', '🐼', '🦛', '🐘'];
const G = 0.0011, VMAX = 0.034, ITER = 4, DAMP = 0.99, FF = 0.3, PF = 0.3, WF = 0.1, POP = 0.0045, SPL = 0.2;
/** 넘침: 금줄 위에서 이만큼 버티면 실패 · 경고 시작 · 떨군 뒤 다음 동물까지 · 바위를 깨는 동물 단계 · 졸린 동물이 깨기까지 떨굴 수 */
const OVER_T = 100, WARN_T = 18, CD = 24, ROCK_LV = 4, SLEEP_N = 4, AGE_OK = 50;
const RESULT_OK = 180, RESULT_FAIL = 160, CLEAR_T = 45, CARD_T = 170, NEWS_T = 170;
const STAR_PTS = 100, WIN_PTS = 500;

// ───────────────────────────── 물리 ─────────────────────────────
export interface Body {
  id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  r: number;
  lv: number;
  /** 바위면 남은 단단함(>0), 동물이면 0 */
  rock: number;
  /** 졸린 동물: 깨기까지 남은 떨굼 수 */
  sleep: number;
  age: number;
  /** 금줄 위에 머문 틱 */
  hot: number;
  /** 굴러간 각도(그리기용, 결정적) */
  a: number;
  /** 아직 공중(떨어지는 중) */
  air: boolean;
  dead?: boolean;
}
export interface WEv { k: 'merge' | 'crack' | 'break' | 'wake' | 'bigpop' | 'splash' | 'land'; x: number; y: number; lv: number; id: number }
export interface World { b: Body[]; t: number; slope: number; /** 시소 탕: 바닥이 이 기울기로 천천히 옮겨 간다 */ tilt: number; nid: number; out: WEv[]; nomerge: boolean; /** 이 단계 넘게는 안 합쳐짐(판 준비용) */ cap: number }

export const floorY = (W: World, x: number) => FLOOR + W.slope * (x - 0.5);

function newBody(W: World, lv: number, x: number, y: number, sleep = 0): Body {
  const b: Body = { id: W.nid++, x, y, px: x, py: y, r: RAD[lv], lv, rock: 0, sleep, age: 0, hot: 0, a: 0, air: true };
  W.b.push(b);
  return b;
}

function merge(W: World, a: Body, c: Body) {
  a.dead = c.dead = true;
  const x = (a.x + c.x) / 2, y = (a.y + c.y) / 2, vx = (a.x - a.px + c.x - c.px) / 2, vy = (a.y - a.py + c.y - c.py) / 2;
  const top = a.lv >= MAXLV, lv = top ? a.lv : a.lv + 1, reach = (top ? RAD[MAXLV] * 1.4 : RAD[lv]) + 0.05;
  let nb: Body | null = null;
  if (top) W.out.push({ k: 'bigpop', x, y, lv, id: -1 });
  else {
    nb = { id: W.nid++, x, y, px: x - vx, py: y - vy, r: Math.max(a.r, c.r), lv, rock: 0, sleep: 0, age: 0, hot: 0, a: 0, air: false };
    W.b.push(nb);
    W.out.push({ k: 'merge', x, y, lv, id: nb.id });
  }
  // '뿅' 김: 둘레를 살짝 밀어 올린다, 큰 합체는 옆 바위를 깬다
  for (const o of W.b) {
    if (o === nb || o.dead) continue;
    const dx = o.x - x, dy = o.y - y, rr = reach + o.r, d2 = dx * dx + dy * dy;
    if (d2 > rr * rr || d2 < 1e-12) continue;
    if (o.rock) {
      if (lv >= ROCK_LV) {
        o.rock--;
        W.out.push({ k: o.rock > 0 ? 'crack' : 'break', x: o.x, y: o.y, lv, id: o.id });
        if (o.rock <= 0) o.dead = true;
      }
      continue;
    }
    const d = Math.sqrt(d2), f = (top ? POP * 3 : POP) * (1 - d / rr);
    o.px -= (dx / d) * f;
    o.py -= (dy / d) * f + f * 0.6;
  }
}

/** 물바가지: x 둘레를 콸콸 밀어내고(가까울수록 세게) 졸린 동물을 깨운다 */
export function splash(W: World, x: number) {
  W.out.push({ k: 'splash', x, y: LINE, lv: 0, id: -1 });
  for (const b of W.b) {
    if (b.rock) continue;
    const dx = b.x - x, ad = Math.abs(dx);
    if (ad > SPL) continue;
    const f = 1 - ad / SPL;
    b.px = b.x - (dx >= 0 ? 1 : -1) * 0.02 * f;
    b.py = b.y + 0.017 * f;
    if (b.sleep > 0) (b.sleep = 0), W.out.push({ k: 'wake', x: b.x, y: b.y, lv: b.lv, id: b.id });
  }
}

/** 한 틱: 움직이고 → 겹침·벽·바닥 풀기(4번) → 마찰 → 닿은 같은 동물 합치기 */
export function tick(W: World) {
  W.t++;
  if (W.slope !== W.tilt) W.slope += Math.max(-0.004, Math.min(0.004, W.tilt - W.slope));
  const B = W.b;
  for (const b of B) {
    if (b.rock) continue;
    let vx = (b.x - b.px) * DAMP, vy = (b.y - b.py) * DAMP;
    const sp = vx * vx + vy * vy;
    if (sp > VMAX * VMAX) {
      const k = VMAX / Math.sqrt(sp);
      vx *= k;
      vy *= k;
    }
    b.px = b.x;
    b.py = b.y;
    b.x += vx;
    b.y += vy + G;
    b.age++;
    b.a = (b.a + (vx / b.r) * 0.7) * 0.95;
    const R = RAD[b.lv];
    if (b.r < R) b.r = Math.min(R, b.r + (R - b.r) * 0.3 + 0.0015);
  }
  const n = B.length, C: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = B[i];
    for (let j = i + 1; j < n; j++) {
      const c = B[j];
      if (a.rock && c.rock) continue;
      const rr = a.r + c.r + 0.012, dx = c.x - a.x;
      if (dx > rr || dx < -rr) continue;
      const dy = c.y - a.y;
      if (dy > rr || dy < -rr || dx * dx + dy * dy > rr * rr) continue;
      C.push(i, j);
    }
  }
  const sl = W.slope, sn = Math.sqrt(1 + sl * sl), fnx = sl / sn, fny = -1 / sn;
  for (let it = 0; it < ITER; it++) {
    for (let k = 0; k < C.length; k += 2) {
      const a = B[C[k]], c = B[C[k + 1]];
      const dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy, m = a.r + c.r;
      if (d2 >= m * m || d2 < 1e-12) continue;
      const d = Math.sqrt(d2), pen = m - d, nx = dx / d, ny = dy / d;
      const ia = a.rock ? 0 : 1 / (a.r * a.r), ic = c.rock ? 0 : 1 / (c.r * c.r), q = pen / (ia + ic);
      a.x -= nx * q * ia;
      a.y -= ny * q * ia;
      c.x += nx * q * ic;
      c.y += ny * q * ic;
      if (it === 0 && pen > 0.002) {
        if (a.air && !a.rock && a.age > 3) (a.air = false), W.out.push({ k: 'land', x: a.x, y: a.y + a.r, lv: a.lv, id: a.id });
        if (c.air && !c.rock && c.age > 3) (c.air = false), W.out.push({ k: 'land', x: c.x, y: c.y + c.r, lv: c.lv, id: c.id });
      }
    }
    for (const b of B) {
      if (b.rock) continue;
      if (b.x < TL + b.r) b.x = TL + b.r;
      else if (b.x > TR - b.r) b.x = TR - b.r;
      const d = (FLOOR + sl * (b.x - 0.5) - b.y) / sn;
      if (d < b.r) {
        const p = b.r - d;
        b.x += fnx * p;
        b.y += fny * p;
        if (b.air && it === 0) (b.air = false), W.out.push({ k: 'land', x: b.x, y: b.y + b.r, lv: b.lv, id: b.id });
      }
    }
  }
  // 마찰: 벽·바닥·서로 닿은 곳에서 미끄러짐을 조금씩 줄인다
  for (const b of B) {
    if (b.rock) continue;
    if (b.x <= TL + b.r + 1e-4 || b.x >= TR - b.r - 1e-4) b.py += (b.y - b.py) * WF;
    const d = (FLOOR + sl * (b.x - 0.5) - b.y) / sn;
    if (d < b.r + 0.002) {
      const vt = (b.x - b.px + (b.y - b.py) * sl) / sn;
      b.px += (vt * FF) / sn;
      b.py += (vt * FF * sl) / sn;
    }
  }
  for (let k = 0; k < C.length; k += 2) {
    const a = B[C[k]], c = B[C[k + 1]];
    const dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy, m = a.r + c.r + 0.002;
    if (d2 >= m * m || d2 < 1e-12) continue;
    const d = Math.sqrt(d2), tx = -dy / d, ty = dx / d;
    const rel = (c.x - c.px - (a.x - a.px)) * tx + (c.y - c.py - (a.y - a.py)) * ty;
    const ia = a.rock ? 0 : 1 / (a.r * a.r), ic = c.rock ? 0 : 1 / (c.r * c.r), dl = (rel * PF) / (ia + ic);
    a.px -= tx * dl * ia;
    a.py -= ty * dl * ia;
    c.px += tx * dl * ic;
    c.py += ty * dl * ic;
  }
  // 합체: 닿은(거의 닿은) 같은 동물 둘 — 졸린 동물·바위는 빼고
  let any = false;
  if (!W.nomerge)
    for (let k = 0; k < C.length; k += 2) {
      const a = B[C[k]], c = B[C[k + 1]];
      if (a.dead || c.dead || a.rock || c.rock || a.lv !== c.lv || a.sleep > 0 || c.sleep > 0 || a.lv >= W.cap) continue;
      const dx = c.x - a.x, dy = c.y - a.y, m = a.r + c.r + 0.004;
      if (dx * dx + dy * dy > m * m) continue;
      merge(W, a, c);
      any = true;
    }
  if (any) W.b = W.b.filter((b) => !b.dead);
  for (const b of W.b) {
    if (b.rock) continue;
    if (b.age > AGE_OK && b.y - b.r < LINE) b.hot++;
    else if (b.hot > 0) b.hot = Math.max(0, b.hot - 3);
  }
}

/** 지금 가장 빨리 움직이는 동물의 속력 (멈췄는지 보기) */
export function motion(W: World) {
  let m = 0;
  for (const b of W.b) if (!b.rock) m = Math.max(m, Math.abs(b.x - b.px) + Math.abs(b.y - b.py));
  return m;
}

const cloneW = (W: World): World => ({ b: W.b.map((b) => ({ ...b })), t: W.t, slope: W.slope, tilt: W.tilt, nid: W.nid, out: [], nomerge: W.nomerge, cap: W.cap });

/** 떨굴 수 있는 x 범위 (동물 크기만큼 벽에서 띄움) */
export const clampX = (x: number, lv: number) => {
  const r = lv < 0 ? 0.04 : RAD[lv];
  return Math.max(TL + r + 0.002, Math.min(TR - r - 0.002, x));
};

// ───────────────────────────── 판 ─────────────────────────────
interface Item { lv: number; sleep: number; bucket: boolean }
type Goal = ['lv', number] | ['rock', number] | ['steam', number];
export interface StageDef {
  key: string;
  title: string;
  news: string;
  hint: string;
  goal: Goal;
  /** 이 판의 동물 수 · ★ 한 번 떨궈 뿅 수(연쇄) */
  K: number;
  C: number;
  /** 떨굴 동물 비율 (병아리·닭·펭귄·너구리) */
  w: number[];
  sleepy?: number;
  bucket?: number[];
  slope?: number;
  /** 시소 탕: 이만큼 떨굴 때마다 반대로 기운다 */
  flip?: number;
  /** 미리 앉아 있는 손님 [단계, x, 졸림] (차례로 떨궈 가라앉힘) */
  pre: [number, number, number?][];
  /** 붐비는 손님 수 · 그 단계 비율(병아리~양) · 졸린 비율 · 준비 중 합체 상한 */
  crowd?: number;
  cw?: number[];
  cs?: number;
  cap?: number;
  /** 준비가 끝났을 때 손님 꼭대기와 금줄 사이 여유 */
  room?: number;
  /** 바위 [x, y, r, 단단함] */
  rocks?: [number, number, number, number][];
  first?: number[];
}

export const STAGES: StageDef[] = [
  {
    key: '', title: '첫 온천', news: '', hint: '👆 병아리 위에서 떼면 퐁당 — 뿅뿅뿅!',
    goal: ['lv', 4], K: 20, C: 3, w: [4, 3, 2, 0],
    pre: [[2, 0.2], [1, 0.36], [0, 0.49], [2, 0.8], [1, 0.66], [0, 0.6]],
    first: [0, 1, 0],
  },
  {
    key: 'next', title: '만원 온천', news: '🈵 만원 온천 — 금줄을 넘치면 실패! 오른쪽 위 = 다음 동물', hint: '큰 동물은 한쪽에, 작은 동물은 위로',
    goal: ['lv', 5], K: 20, C: 4, w: [4, 3, 3, 1],
    pre: [], crowd: 40, cw: [4, 3, 3, 1], room: 0.13,
  },
  {
    key: 'rock', title: '바위 온천', news: '🪨 바위는 안 합쳐져요 — 바로 옆에서 🐑양 이상이 생기면 쩍!', hint: '바위 옆에 너구리 둘을 붙여요',
    goal: ['rock', 3], K: 28, C: 4, w: [4, 3, 3, 1],
    pre: [], crowd: 40, cw: [4, 3, 3, 1], room: 0.12,
    rocks: [[0.5, 1.14, 0.09, 1], [0.86, 0.86, 0.075, 1], [0.13, 0.95, 0.07, 1]],
  },
  {
    key: 'sleepy', title: '졸린 손님', news: '😴 졸린 동물 — 숫자만큼 더 떨궈야 깨어나 합쳐져요', hint: '졸린 동물은 구석에 재워요',
    goal: ['lv', 6], K: 40, C: 5, w: [4, 3, 3, 1], sleepy: 0.25,
    pre: [], crowd: 40, cw: [4, 3, 3, 1], cs: 0.3, room: 0.16,
  },
  {
    key: 'bucket', title: '뜨거운 물바가지', news: '🪣 물바가지 — 떨군 곳 둘레를 콸콸 밀고 졸린 동물을 깨워요', hint: '물바가지는 엉킨 곳·졸린 동물 위에',
    goal: ['lv', 6], K: 38, C: 5, w: [4, 3, 3, 1], sleepy: 0.35, bucket: [4, 12, 21, 30],
    pre: [], crowd: 40, cw: [4, 3, 3, 1], cs: 0.4, room: 0.14,
  },
  {
    key: 'slope', title: '시소 탕', news: '⚖️ 시소 탕 — 4번 떨굴 때마다 반대로 기울어 와르르!', hint: '곧 낮아질 쪽에 같은 동물을 모아 둬요',
    goal: ['lv', 6], K: 40, C: 5, w: [4, 3, 3, 1], slope: 0.22, flip: 4,
    pre: [], crowd: 40, cw: [4, 3, 3, 1], room: 0.16,
  },
  {
    key: 'steam', title: '김 모으기', news: '♨️ 김 모으기 — 한 번 떨궈 연달아 뿅 할수록 김이 곱절', hint: '연쇄 계단을 쌓아요 (큰 것 옆에 한 단계 작은 것)',
    goal: ['steam', 50], K: 22, C: 6, w: [4, 3, 3, 1],
    pre: [], crowd: 40, cw: [4, 3, 3, 1], room: 0.16,
  },
  {
    key: 'final', title: '산꼭대기 큰 탕', news: '🏔️ 마지막 탕 — 바위·졸린 동물·물바가지가 다 나와요', hint: '하마를 만들면 끝!',
    goal: ['lv', 6], K: 40, C: 5, w: [4, 3, 3, 1], sleepy: 0.2, bucket: [7, 19, 30], slope: 0.06,
    pre: [], crowd: 40, cw: [4, 3, 3, 1], cs: 0.2, room: 0.14,
    rocks: [[0.16, 1.1, 0.085, 2]],
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; lv?: number; n?: number }
type Phase = 'play' | 'clear' | 'result';

export interface DMState {
  rng: Rng;
  seed: number;
  t: number;
  stage: number;
  phase: Phase;
  pt: number;
  W: World;
  Q: Item[];
  qi: number;
  cd: number;
  down: boolean;
  aim: number;
  pending: number | null;
  wait: boolean;
  /** 이번 떨굼으로 일어난 뿅 수 · 이 판 최고 · 이 판에서 만든 가장 큰 동물 · 깬 바위 · 모은 김 · 목표 순간 남은 동물 */
  combo: number;
  bestCombo: number;
  maxLv: number;
  broke: number;
  steam: number;
  leftAt: number;
  hearts: number;
  stars: number;
  got: number;
  starOk: boolean[];
  pts: number;
  ok: boolean;
  why: string;
  seen: Set<string>;
  newsQ: string[];
  news: { text: string; t: number } | null;
  events: Ev[];
  dead: boolean;
  won: boolean;
  tries: number;
  again: boolean;
  firstTap: boolean;
  lastDrop: number;
  /** 원숭이: 0 노곤 · 1 구경 · 2 깜짝 · 3 허둥지둥 · 4 박수 · 5 어질어질 */
  monkey: number;
  monkeyT: number;
  /** 금줄 위에 가장 오래 머문 동물의 틱 · 이 판에서 한 번도 금줄을 안 넘겼나(★) */
  warn: number;
  clean: boolean;
  /** 느린 화면 남은 틱 (이 동안 물리는 두 틱에 한 번만 — 같은 결과가 천천히 보인다) */
  slow: number;
}

const ev = (s: DMState, kind: string, x: number, y: number, text?: string, lv?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, lv, n });
function see(s: DMState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const goalText = (g: Goal) => (g[0] === 'lv' ? `${EMO[g[1]]} ${NAMES[g[1]]} 만들기` : g[0] === 'rock' ? `🪨 바위 ${g[1]}개 깨기` : `♨️ 김 ${g[1]} 모으기`);
const goalMet = (s: DMState) => {
  const g = STAGES[s.stage].goal;
  return g[0] === 'lv' ? s.maxLv >= g[1] : g[0] === 'rock' ? s.broke >= g[1] : s.steam >= g[1];
};

function newStage(s: DMState) {
  const d = STAGES[s.stage], r = s.rng;
  const W: World = { b: [], t: 0, slope: d.slope ?? 0, tilt: d.slope ?? 0, nid: 1, out: [], nomerge: true, cap: d.cap ?? 4 };
  for (const [x, y, rad, hp] of d.rocks ?? []) {
    const b = newBody(W, 0, x, y);
    (b.rock = hp), (b.r = rad), (b.lv = -1), (b.air = false);
  }
  // 미리 앉아 있는 손님: 하나씩 떨궈 가라앉힌다(합체 없이) — 좌우는 판마다 살짝 흔든다
  for (const [lv, x, sl] of d.pre) {
    newBody(W, lv, clampX(x + (r() - 0.5) * 0.03, lv), DROPY + 0.12, sl ?? 0);
    for (let k = 0; k < 40; k++) tick(W);
  }
  // 붐비는 손님: 하나씩 떨궈 빽빽하게 쌓는다 — 닿은 이웃과 같은 동물이 되지 않게 골라 앉힌다(시작하자마자 뿅이 나지 않게)
  const cw = d.cw ?? [1], ct = cw.reduce((x, y) => x + y, 0), room = LINE + (d.room ?? 0.16);
  for (let i = 0; i < (d.crowd ?? 0); i++) {
    let u = r() * ct, lv = 0;
    while (lv < cw.length - 1 && u >= cw[lv]) (u -= cw[lv]), lv++;
    const b = newBody(W, lv, clampX(TL + r() * (TR - TL), lv), LINE - 0.08, d.cs && r() < d.cs ? SLEEP_N : 0);
    for (let k = 0; k < 36; k++) tick(W);
    relabel(W, b, cw.length, r);
    if (b.y - b.r < room) {
      W.b = W.b.filter((o) => o !== b);
      for (let k = 0; k < 20; k++) tick(W);
    }
  }
  // 마무리: 닿은 같은 동물 쌍이 하나도 없고 금줄 아래 여유가 남을 때까지 위쪽 손님을 바꾸거나 내보낸다
  for (let rep = 0; rep < 40; rep++) {
    for (let k = 0; k < 40; k++) tick(W);
    let bad: Body | null = null;
    for (const a of W.b)
      for (const c of W.b) {
        if (a === c || a.rock || c.rock || a.lv !== c.lv || a.sleep || c.sleep || Math.hypot(a.x - c.x, a.y - c.y) > a.r + c.r + 0.012) continue;
        const up = a.y < c.y ? a : c;
        if (!bad || up.y < bad.y) bad = up;
      }
    if (bad) {
      const before = bad.lv;
      relabel(W, bad, cw.length, r);
      if (bad.lv === before) W.b = W.b.filter((o) => o !== bad);
      continue;
    }
    const top = W.b.filter((o) => !o.rock && o.y - o.r < room - (d.crowd ? 0 : 1)).sort((p, q) => p.y - q.y)[0];
    if (!top) break;
    W.b = W.b.filter((o) => o !== top);
  }
  W.nomerge = false;
  for (const b of W.b) (b.age = 999), (b.hot = 0), (b.air = false), (b.a = 0), (b.px = b.x), (b.py = b.y);
  W.out = [];
  W.cap = 99;
  s.W = W;
  // 떨굴 동물 줄
  const tot = d.w.reduce((a, b) => a + b, 0);
  s.Q = [];
  for (let i = 0; i < d.K; i++) {
    if (d.bucket?.includes(i)) {
      s.Q.push({ lv: -1, sleep: 0, bucket: true });
      continue;
    }
    let u = r() * tot, lv = 0;
    while (lv < d.w.length - 1 && u >= d.w[lv]) (u -= d.w[lv]), lv++;
    if (d.first && i < d.first.length) lv = d.first[i];
    const sleepy = d.sleepy && i > 0 && r() < d.sleepy ? SLEEP_N : 0;
    s.Q.push({ lv, sleep: sleepy, bucket: false });
  }
  s.qi = 0;
  s.cd = 0;
  s.pending = null;
  s.down = false;
  s.aim = 0.5;
  s.wait = true;
  s.phase = 'play';
  s.pt = 0;
  s.combo = 0;
  s.bestCombo = 0;
  s.maxLv = Math.max(-1, ...W.b.filter((b) => !b.rock).map((b) => b.lv));
  s.broke = 0;
  s.steam = 0;
  s.leftAt = 0;
  s.starOk = [false, false, false];
  s.monkey = 0;
  s.warn = 0;
  s.clean = true;
  s.slow = 0;
  s.lastDrop = s.t;
  if (d.key) s.seen.add(d.key);
}

/** 측정용: 이 판부터 시작 */
export function startAt(s: DMState, i: number) {
  s.stage = i;
  newStage(s);
}

/** 닿은 이웃 중에 같은 동물이 있으면 다른 동물로 바꿔 앉힌다 (판 준비용, 합체 없이) */
function relabel(W: World, b: Body, nl: number, r: Rng) {
  if (b.rock || b.sleep) return;
  for (let tries = 0; tries < 4; tries++) {
    const near = new Set<number>();
    for (const o of W.b) if (o !== b && !o.rock && Math.hypot(o.x - b.x, o.y - b.y) < o.r + b.r + 0.02) near.add(o.lv);
    if (!near.has(b.lv)) return;
    const ok = [...Array(nl).keys()].filter((l) => !near.has(l));
    if (!ok.length) return;
    b.lv = ok[Math.floor(r() * ok.length)];
    b.r = RAD[b.lv];
    for (let k = 0; k < 24; k++) tick(W);
  }
}

function drop(s: DMState, x: number) {
  const it = s.Q[s.qi];
  s.qi++;
  s.cd = CD;
  s.combo = 0;
  s.lastDrop = s.t;
  s.firstTap = true;
  // 떨굴 때마다 졸린 동물이 하나씩 깬다
  for (const b of s.W.b)
    if (b.sleep > 0 && --b.sleep === 0) s.W.out.push({ k: 'wake', x: b.x, y: b.y, lv: b.lv, id: b.id });
  const d = STAGES[s.stage];
  if (d.flip && s.qi % d.flip === 0) {
    s.W.tilt = -s.W.tilt;
    ev(s, 'tilt', 0.5, FLOOR, s.W.tilt > 0 ? '시소! ↘' : '↙ 시소!');
    see(s, 'flip', '⚖️ 시소 탕이 반대로 기울어요 — 와르르!');
  }
  if (it.bucket) {
    splash(s.W, x);
    see(s, 'bucket', '🪣 물바가지 콸콸! 둘레가 밀려나고 졸린 동물이 깨요');
  } else {
    newBody(s.W, it.lv, clampX(x, it.lv), DROPY, it.sleep);
    ev(s, 'drop', x, DROPY, undefined, it.lv);
    see(s, 'drop', '👆 누른 곳 위에서 동물이 퐁당');
    if (it.sleep) see(s, 'sleepy', '😴 졸린 동물 — 숫자만큼 더 떨궈야 깨어나 합쳐져요');
  }
  if (s.qi === s.Q.length - 2) see(s, 'few', '⏳ 동물이 두 마리 남았어요');
}

function endStage(s: DMState, ok: boolean, why = '') {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    s.starOk = [true, s.clean, s.bestCombo >= d.C];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.monkey = 4;
    ev(s, 'clear', 0.5, 0.75, s.won ? '온천 대성공! ♨️' : '목표 달성!');
  } else {
    s.hearts--;
    s.tries++;
    s.monkey = 5;
    ev(s, 'fail', 0.5, 0.75, why);
  }
}

/** 물리 한 틱의 사건을 판 상태에 반영 (뿅·연쇄·바위·김·새 동물) */
function absorb(s: DMState) {
  for (const e of s.W.out) {
    if (e.k === 'merge' || e.k === 'bigpop') {
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.steam += s.combo;
      s.maxLv = Math.max(s.maxLv, e.lv);
      ev(s, e.k, e.x, e.y, s.combo > 1 ? `뿅×${s.combo}!` : '뿅!', e.lv, s.combo);
      // 큰 순간은 느린 화면으로 (연쇄가 길수록 더 오래)
      if (s.combo >= 3 || e.lv >= 5 || e.k === 'bigpop') s.slow = Math.max(s.slow, e.k === 'bigpop' ? 60 : 18 + 8 * Math.min(5, Math.max(0, s.combo - 3)) + (e.lv >= 5 ? 14 : 0));
      see(s, 'merge', '💨 같은 동물 둘이 닿으면 뿅! 한 단계 큰 동물');
      if (s.combo === 2) see(s, 'combo', '🔗 연쇄! 합쳐진 동물이 또 합쳐졌어요');
      if (e.lv >= 3 && e.k === 'merge') see(s, 'a' + e.lv, `${EMO[e.lv]} 새 손님: ${NAMES[e.lv]}!`);
      if (e.k === 'bigpop') see(s, 'bigpop', '🐘🐘 코끼리 둘 = 온천 대폭발!');
      if (e.lv >= 4 || s.combo >= 3) (s.monkey = 2), (s.monkeyT = s.t);
    } else if (e.k === 'crack' || e.k === 'break') {
      if (e.k === 'break') (s.broke++, (s.slow = Math.max(s.slow, 34)));
      ev(s, e.k, e.x, e.y, e.k === 'break' ? '쩍! 바위가 깨졌어요' : '금이 갔어요!');
      (s.monkey = 2), (s.monkeyT = s.t);
    } else if (e.k === 'wake') {
      ev(s, 'wake', e.x, e.y, '하암!', e.lv);
    } else if (e.k === 'splash') ev(s, 'splash', e.x, e.y);
    else if (e.k === 'land') ev(s, 'land', e.x, e.y, undefined, e.lv);
  }
  s.W.out.length = 0;
}

export const dropmerge: GameDef<DMState> = {
  id: 'dropmerge',
  name: '동물 떨구기 합체 온천',
  genes: ['merge', 'pointer', 'chain'],
  twist:
    '과일 대신 산속 온천의 동물 손님 — 합쳐질 때 김이 "뿅" 터지며 둘레를 밀어 올려, 꽉 낀 탕이 들썩이고 굴러 내려가 다음 합체로 이어진다(연쇄, 길면 느린 화면). 판마다 바위·졸린 손님·물바가지·시소 탕이 하는 일을 바꾼다',
  rules: ['누른 곳 위에서 동물이 떨어진다 (누르는 동안 떨어질 선, 떼면 퐁당)', '같은 동물 둘이 닿으면 한 단계 큰 동물로! 탕 위 금줄을 넘치면 실패'],
  controls: 'touch',
  hint: '누르고 있으면 떨어질 선 · 떼면 퐁당 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '눈 내리는 산속 노천 온천 디오라마 — 동물 손님이 퐁당퐁당',
    mood: '해 질 녘 보랏빛 눈산 아래, 김이 피어오르는 돌 온천탕. 대나무 울타리와 종이 등불, 탕 위를 가로지른 금줄. 머리에 수건을 얹은 눈원숭이가 탕 가장자리에서 노곤하게 구경하고, 동물 손님들이 꽉 끼면 찌그러진 얼굴을 한다.',
    palette: { bg: '#1d2440', ink: '#fff8ef', muted: '#b9c3dd', accent: '#7fe3d4', hot: '#ff6b5a', soft: '#ffd9a8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, W: { b: [], t: 0, slope: 0, tilt: 0, nid: 1, out: [], nomerge: false, cap: 99 }, Q: [], qi: 0, cd: 0,
      down: false, aim: 0.5, pending: null, wait: false, combo: 0, bestCombo: 0, maxLv: 0, broke: 0, steam: 0, leftAt: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', seen: new Set<string>(), newsQ: [], news: null,
      events: [], dead: false, won: false, tries: 0, again: false, firstTap: false, lastDrop: 0, monkey: 0, monkeyT: 0, warn: 0, clean: true, slow: 0,
    } as DMState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null;
    if (s.wait && !p) s.wait = false;
    const it = s.Q[s.qi];
    if (p && s.phase === 'play' && !s.wait && it) (s.down = true), (s.aim = clampX(p.x, it.bucket ? -1 : it.lv));
    else if (s.down) {
      s.down = false;
      if (s.phase === 'play') s.pending = s.aim;
    }
    s.t++;
    s.pt++;
    if (s.cd > 0) s.cd--;
    if (s.pending !== null && s.cd <= 0 && s.phase === 'play' && s.qi < s.Q.length) {
      drop(s, s.pending);
      s.pending = null;
    }
    if (s.slow > 0) s.slow--;
    if (s.slow % 2 === 0) tick(s.W);
    absorb(s);
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    s.warn = 0;
    for (const b of s.W.b) if (b.hot > s.warn) s.warn = b.hot;
    if (s.phase === 'play') {
      if (s.monkey !== 2 || s.t - s.monkeyT > 50) s.monkey = s.warn > WARN_T ? 3 : s.down ? 1 : 0;
      if (s.warn > WARN_T) (s.clean = false), see(s, 'line', '⚠️ 금줄 위로 넘친 채 버티면 실패!');
      if (goalMet(s)) {
        s.phase = 'clear';
        s.pt = 0;
        s.leftAt = s.Q.length - s.qi;
        s.pending = null;
        s.down = false;
      } else if (s.warn >= OVER_T) endStage(s, false, '탕이 넘쳤어요!');
      else if (s.qi >= s.Q.length && s.pending === null && s.t - s.lastDrop > 60 && (motion(s.W) < 0.002 || s.t - s.lastDrop > 200))
        endStage(s, false, '동물이 다 떨어졌어요');
    } else if (s.phase === 'clear') {
      if (s.pt >= CLEAR_T) endStage(s, true);
    } else if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number): Input => ({ tap: false, dir: 0, pointer: { x, y: DROPY / A } });

interface Sim { W: World; combo: number; steam: number; maxLv: number; broke: number }
/** 이 자리에 떨구면? — 실제와 같은 물리로 멈출 때까지 굴려 본다 */
function simDrop(W0: World, it: Item, x: number, maxT = 110, flip = false): Sim {
  const W = cloneW(W0);
  if (flip) W.tilt = -W.tilt;
  for (const b of W.b) if (b.sleep > 0) b.sleep--;
  if (it.bucket) splash(W, x);
  else newBody(W, it.lv, clampX(x, it.lv), DROPY, it.sleep);
  let combo = 0, steam = 0, maxLv = -1, broke = 0;
  for (let t = 0; t < maxT; t++) {
    tick(W);
    for (const e of W.out) {
      if (e.k === 'merge' || e.k === 'bigpop') (combo++), (steam += combo), (maxLv = Math.max(maxLv, e.lv));
      else if (e.k === 'break') broke++;
    }
    W.out.length = 0;
    if (t > 24 && t % 6 === 0 && motion(W) < 0.0012) break;
  }
  return { W, combo, steam, maxLv, broke };
}

/** 판 모양 점수: 큰 동물로 뭉칠수록·같은 동물이나 한 단계 위 동물이 붙어 있을수록(연쇄 계단) 좋고,
 *  높이 쌓이거나 작은 게 큰 것 밑에 깔리면 나쁘다 */
function boardValue(W: World, d: StageDef) {
  const B = W.b;
  let v = 0, top = 9, big: Body | null = null;
  for (const b of B) if (!b.rock && (!big || b.lv > big.lv)) big = b;
  // 구석 정하기: 가장 큰 동물이 있는 쪽 (기운 탕은 낮은 쪽)
  const corner = W.slope > 0.1 ? TR : W.slope < -0.1 ? TL : big && big.x > 0.5 ? TR : TL;
  for (const b of B) {
    if (b.rock) continue;
    top = Math.min(top, b.y - b.r);
    v += Math.pow(2.7, b.lv) * 12 - 70;
    if (b.sleep > 0) v -= 30;
    if (b.lv >= 3) v -= Math.abs(b.x - corner) * b.lv * b.lv * 8;
  }
  for (let i = 0; i < B.length; i++) {
    const a = B[i];
    if (a.rock) continue;
    for (let j = i + 1; j < B.length; j++) {
      const c = B[j];
      const dx = c.x - a.x, dy = c.y - a.y, dd = Math.sqrt(dx * dx + dy * dy);
      if (c.rock) {
        if (d.goal[0] === 'rock' && a.lv >= ROCK_LV - 1 && dd < a.r + c.r + 0.06) v += 60 * (a.lv - 1);
        continue;
      }
      const gap = dd - a.r - c.r, lo = Math.min(a.lv, c.lv), dl = Math.abs(a.lv - c.lv);
      if (dl === 0 && gap < 0.06) v += 40 * (lo + 1) * (a.sleep || c.sleep ? 0.5 : 1);
      else if (dl === 1 && gap < 0.03) v += 14 * (lo + 1);
      // 큰 동물끼리는 가까이 (뭉쳐야 더 큰 동물이 된다)
      if (lo >= 3 && dl <= 1) v -= Math.max(0, gap) * (dl ? 60 * lo : 1500 * (lo - 2));
      const big = a.lv > c.lv ? a : c, small = big === a ? c : a;
      if (big.lv - small.lv >= 2 && big.y < small.y && Math.abs(big.x - small.x) < big.r) v -= 35 * (big.lv - small.lv);
    }
  }
  const danger = LINE + 0.24 - top;
  if (danger > 0) v -= danger * danger * 6e5;
  return v;
}

function dropValue(s: DMState, r: Sim) {
  const d = STAGES[s.stage], g = d.goal;
  let v = boardValue(r.W, d);
  if (g[0] === 'lv' && Math.max(s.maxLv, r.maxLv) >= g[1]) v += 1e6;
  if (g[0] === 'rock') v += r.broke * 2e5 + (s.broke + r.broke >= g[1] ? 1e6 : 0);
  if (g[0] === 'steam') v += r.steam * 1.5e4 + (s.steam + r.steam >= g[1] ? 1e6 : 0);
  if (r.combo >= d.C && s.bestCombo < d.C) v += 6e4;
  v += r.combo * 400;
  for (const b of r.W.b) if (!b.rock && b.hot > 0) v -= s.clean ? 3e5 : 1e5;
  return v;
}

/** 떨굴 후보 x: 고르게 13곳 + 위가 트인 같은 동물 바로 위 */
function candidates(it: Item, W: World) {
  const lv = it.bucket ? -1 : it.lv, xs: number[] = [];
  const lo = clampX(0, lv), hi = clampX(1, lv);
  for (let k = 0; k <= 12; k++) xs.push(lo + ((hi - lo) * k) / 12);
  if (!it.bucket) for (const b of W.b) if (b.lv === it.lv && !b.sleep && exposed(W, b)) xs.push(clampX(b.x, lv));
  return xs;
}

/** 위가 트였나 (바로 위에 다른 동물이 없나) */
function exposed(W: World, b: Body) {
  for (const o of W.b) if (o !== b && o.y < b.y && Math.abs(o.x - b.x) < (o.r + b.r) * 0.7) return false;
  return true;
}

export function plan(s: DMState): number {
  const it = s.Q[s.qi], nx = s.Q[s.qi + 1];
  const xs = candidates(it, s.W), fl = STAGES[s.stage].flip ?? 0;
  const f1 = fl > 0 && (s.qi + 1) % fl === 0, f2 = fl > 0 && (s.qi + 2) % fl === 0;
  const res = xs.map((x) => {
    const r = simDrop(s.W, it, x, 110, f1);
    return { x, r, v: dropValue(s, r) };
  });
  res.sort((a, b) => b.v - a.v);
  // 다음 동물까지 내다보기: 상위 셋만 (목표를 이미 이루면 그대로)
  if (nx && res[0].v < 5e5) {
    let best = res[0].x, bv = -1e18;
    for (const c of res.slice(0, 3)) {
      const st = { ...s, maxLv: Math.max(s.maxLv, c.r.maxLv), broke: s.broke + c.r.broke, steam: s.steam + c.r.steam, bestCombo: Math.max(s.bestCombo, c.r.combo) } as DMState;
      let v2 = -1e18;
      for (const x2 of candidates(nx, c.r.W).filter((_, k) => k % 2 === 0)) v2 = Math.max(v2, dropValue(st, simDrop(c.r.W, nx, x2, 90, f2)));
      const v = c.v * 0.35 + v2;
      if (v > bv) (bv = v), (best = c.x);
    }
    return best;
  }
  return res[0].x;
}

const HOLD = 9;
const smartMem = new WeakMap<object, { key: string; x: number; hold: number; wait: number }>();
/** 봇: 떨굴 자리마다 실제 물리로 굴려 보고(다음 동물까지 2수) 판 모양이 가장 좋은 곳에. 사람처럼 꾹 눌러 겨누고 뗀다 */
export const dropmergeSmart: Bot<DMState> = {
  name: '온천 지배인',
  act(s) {
    if (s.phase !== 'play' || s.qi >= s.Q.length) return NO;
    const key = `${s.stage}:${s.tries}:${s.qi}`;
    let m = smartMem.get(s);
    if (!m || m.key !== key) smartMem.set(s, (m = { key, x: -1, hold: 0, wait: 0 }));
    if (m.x >= 0) {
      if (m.hold < HOLD) return (m.hold += 3), at(m.x);
      return NO;
    }
    if (s.cd > 0 || s.pending !== null || s.wait) return NO;
    m.wait += 3;
    if (motion(s.W) > 0.003 && m.wait < 36) return NO;
    m.x = plan(s);
    return at(m.x);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number }>();
/** 봇: 아무 때나 아무 데나 퐁당 */
export const dropmergeRandom: Bot<DMState> = {
  name: '아무 데나 퐁당',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 30 + Math.floor(rng() * 60), hold: 0, x: 0.5 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? at(m.x) : NO;
    }
    if (s.phase !== 'play' || s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 100);
    m.x = TL + rng() * (TR - TL);
    m.hold = 2 + Math.floor(rng() * 6);
    return at(m.x);
  },
};

/** 버릇: 지금 동물과 같은 동물이 위가 트여 있으면 그 바로 위, 없으면 가장 낮은 곳 (물바가지는 가운데) */
export function habitX(s: DMState): number {
  const it = s.Q[s.qi], W = s.W;
  if (it.bucket) return 0.5;
  let best = -1, by = -9;
  for (const b of W.b) if (b.lv === it.lv && !b.rock && exposed(W, b) && b.y > by) (by = b.y), (best = b.x);
  if (best >= 0) return clampX(best, it.lv);
  let lx = 0.5, ly = -9;
  for (let k = 0; k <= 8; k++) {
    const x = clampX(TL + ((TR - TL) * k) / 8, it.lv);
    let y = floorY(W, x);
    for (const b of W.b) if (Math.abs(b.x - x) < b.r) y = Math.min(y, b.y - b.r);
    if (y > ly) (ly = y), (lx = x);
  }
  return lx;
}
export const centerX = () => 0.5;

function habitBot(name: string, pick: (s: DMState) => number): Bot<DMState> {
  const mem = new WeakMap<object, { key: string; x: number; hold: number; wait: number }>();
  return {
    name,
    act(s) {
      if (s.phase !== 'play' || s.qi >= s.Q.length) return NO;
      const key = `${s.stage}:${s.tries}:${s.qi}`;
      let m = mem.get(s);
      if (!m || m.key !== key) mem.set(s, (m = { key, x: -1, hold: 0, wait: 0 }));
      if (m.x >= 0) {
        if (m.hold < HOLD) return (m.hold += 3), at(m.x);
        return NO;
      }
      if (s.cd > 0 || s.pending !== null || s.wait) return NO;
      m.wait += 3;
      if (motion(s.W) > 0.0015 && m.wait < 66) return NO;
      m.x = pick(s);
      return at(m.x);
    },
  };
}
/** 버릇 봇(측정용): 늘 '같은 동물 바로 위에 떨구기' */
export const dropmergeHabit: Bot<DMState> = habitBot('같은 동물 위에', habitX);
/** 버릇 봇(측정용): 늘 '가운데 떨구기' */
export const dropmergeCenter: Bot<DMState> = habitBot('늘 가운데', centerX);

// ───────────────────────────── 그리기 ─────────────────────────────
/** 아래 띠 위쪽 · 위 띠 높이 (가로 = 1) */
const BAND = 1.27, HB = 0.085;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** 동물 털 색 [몸, 밝은 쪽, 어두운 쪽] */
const FUR = [
  ['#ffd84a', '#fff1a6', '#e8a92a'],
  ['#fff7ec', '#ffffff', '#e2cdb8'],
  ['#2f416e', '#4d6299', '#1c2747'],
  ['#a7896a', '#c9ad8c', '#7a5f45'],
  ['#fbf6ee', '#ffffff', '#d9cfc2'],
  ['#fbfbf8', '#ffffff', '#d5d8dc'],
  ['#9d8fbf', '#bfb3dc', '#74679a'],
  ['#8fa8c6', '#b7cbe2', '#647e9e'],
];
/** 연쇄 색: 길수록 노랑 → 주황 → 분홍 → 보라 → 하늘 */
const COMBO_C = ['#ffffff', '#ffffff', '#ffe066', '#ffb347', '#ff7ab6', '#c49cff', '#6fe3ff', '#7dffb0', '#ffffff'];
const PUFFS = new WeakMap<object, { x: number; y: number; r: number; life: number; max: number; vx: number; c: string }[]>();
const HAPPY = new WeakMap<object, Map<number, number>>();
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 얼굴 표정: 0 노곤 · 1 찌그러짐 >_< · 2 놀람 · 3 졸림 · 4 헤헤 · 5 식은땀 */
function face(ctx: CanvasRenderingContext2D, r: number, ex: number, ey: number, mood: number, t: number, dark: boolean, id: number) {
  const ink = dark ? '#ffffff' : '#3a2a22', ew = r * 0.11;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.lineCap = 'round';
  const blink = (t + id * 37) % 190 < 7;
  for (const sx of [-1, 1]) {
    const x = sx * ex, y = ey;
    ctx.beginPath();
    if (mood === 1) {
      // >_<
      ctx.moveTo(x - sx * ew, y - ew);
      ctx.lineTo(x + sx * ew * 0.6, y);
      ctx.lineTo(x - sx * ew, y + ew);
      ctx.stroke();
    } else if (mood === 3 || (mood === 0 && blink)) {
      ctx.moveTo(x - ew, y);
      ctx.quadraticCurveTo(x, y + ew * 0.8, x + ew, y);
      ctx.stroke();
    } else if (mood === 4) {
      ctx.moveTo(x - ew, y + ew * 0.3);
      ctx.quadraticCurveTo(x, y - ew, x + ew, y + ew * 0.3);
      ctx.stroke();
    } else {
      const er = mood === 2 ? ew * 1.15 : ew * 0.8;
      ctx.arc(x, y, er, 0, Math.PI * 2);
      ctx.fill();
      if (mood === 2 || r > 0.06) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + er * 0.35, y - er * 0.35, er * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ink;
      }
    }
  }
  // 입
  const my = ey + r * 0.24;
  ctx.beginPath();
  if (mood === 2) {
    ctx.ellipse(0, my + r * 0.04, r * 0.08, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 1) {
    ctx.moveTo(-r * 0.13, my);
    for (let k = 1; k <= 4; k++) ctx.lineTo(-r * 0.13 + (k * r * 0.26) / 4, my + (k % 2 ? r * 0.05 : 0));
    ctx.stroke();
  } else if (mood === 4) {
    ctx.arc(0, my - r * 0.03, r * 0.12, 0.1, Math.PI - 0.1);
    ctx.fill();
  } else if (mood === 5) {
    ctx.moveTo(-r * 0.1, my + r * 0.04);
    ctx.quadraticCurveTo(0, my - r * 0.04, r * 0.1, my + r * 0.04);
    ctx.stroke();
  } else {
    ctx.moveTo(-r * 0.08, my);
    ctx.quadraticCurveTo(-r * 0.04, my + r * 0.06, 0, my);
    ctx.quadraticCurveTo(r * 0.04, my + r * 0.06, r * 0.08, my);
    ctx.stroke();
  }
  // 볼
  if (mood !== 1) {
    ctx.fillStyle = 'rgba(255,120,130,.35)';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * ex * 1.45, ey + r * 0.16, r * 0.11, r * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (mood === 5) {
    ctx.fillStyle = '#9fe0ff';
    ctx.beginPath();
    ctx.ellipse(ex * 1.9, ey - r * 0.25 + ((t * 0.3) % 6) * 0.3, r * 0.07, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 동물 하나 (가운데 0,0 · 반지름 r px) */
function animal(ctx: CanvasRenderingContext2D, lv: number, r: number, mood: number, t: number, id: number) {
  const c = FUR[lv];
  // 귀·볏처럼 몸 뒤에 붙는 것
  if (lv === 3) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.62, -r * 0.72, r * 0.26, r * 0.24, sx * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a3a30';
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.62, -r * 0.7, r * 0.13, r * 0.12, sx * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (lv === 5) {
    ctx.fillStyle = '#26262b';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * r * 0.66, -r * 0.7, r * 0.27, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (lv === 6) {
    ctx.fillStyle = c[2];
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.55, -r * 0.86, r * 0.13, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (lv === 7) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.86, -r * 0.05, r * 0.42, r * 0.55, sx * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b6c4';
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.88, -r * 0.03, r * 0.26, r * 0.38, sx * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (lv === 1) {
    ctx.fillStyle = '#e8413c';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.arc(k * r * 0.2, -r * 0.92 - (k === 0 ? r * 0.08 : 0), r * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (lv === 0) {
    ctx.strokeStyle = c[2];
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(k * r * 0.08, -r * 0.9);
      ctx.quadraticCurveTo(k * r * 0.25, -r * 1.25, k * r * 0.18 + r * 0.06, -r * 1.12);
      ctx.stroke();
    }
  }
  // 몸 (빛은 왼쪽 위에서)
  if (lv === 4) {
    ctx.fillStyle = c[2];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, c[1]);
  g.addColorStop(0.55, c[0]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  if (lv === 4) {
    // 양털 송이
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.5 - r * 0.1, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5b4a43';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.12, r * 0.42, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5b4a43';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.5, -r * 0.05, r * 0.2, r * 0.09, sx * -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (lv === 2) {
    // 펭귄 흰 얼굴·배
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.24, -r * 0.08, r * 0.36, r * 0.42, 0.2, 0, Math.PI * 2);
    ctx.ellipse(r * 0.24, -r * 0.08, r * 0.36, r * 0.42, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.5, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (lv === 3) {
    // 너구리 눈가 검은 띠 + 밝은 주둥이
    ctx.fillStyle = '#3f3129';
    ctx.beginPath();
    ctx.ellipse(-r * 0.36, -r * 0.08, r * 0.3, r * 0.2, -0.3, 0, Math.PI * 2);
    ctx.ellipse(r * 0.36, -r * 0.08, r * 0.3, r * 0.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#efe2cf';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.36, r * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a201b';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.09, r * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (lv === 5) {
    ctx.fillStyle = '#26262b';
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, -r * 0.06, r * 0.2, r * 0.27, 0.5, 0, Math.PI * 2);
    ctx.ellipse(r * 0.34, -r * 0.06, r * 0.2, r * 0.27, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.09, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (lv === 6) {
    ctx.fillStyle = c[1];
    ctx.beginPath();
    ctx.ellipse(0, r * 0.42, r * 0.66, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d4f80';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.24, r * 0.32, r * 0.07, r * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (lv === 7) {
    ctx.strokeStyle = c[2];
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.05);
    ctx.quadraticCurveTo(r * 0.05, r * 0.6, r * 0.32, r * 0.72);
    ctx.stroke();
    ctx.strokeStyle = c[0];
    ctx.lineWidth = r * 0.14;
    ctx.stroke();
  }
  // 반짝임
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, -r * 0.5, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // 얼굴
  const dark = lv === 2;
  const ey = lv === 6 ? -r * 0.22 : lv === 4 ? r * 0.02 : lv === 7 ? -r * 0.2 : -r * 0.1;
  face(ctx, r, r * (lv === 6 ? 0.3 : lv === 4 ? 0.17 : 0.3), ey, mood, t, dark || lv === 4, id);
  // 부리
  if (lv <= 2) {
    ctx.fillStyle = '#ff9a2a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.13, ey + r * 0.12);
    ctx.lineTo(r * 0.13, ey + r * 0.12);
    ctx.lineTo(0, ey + r * 0.3);
    ctx.closePath();
    ctx.fill();
    if (lv === 1) {
      ctx.fillStyle = '#e8413c';
      ctx.beginPath();
      ctx.ellipse(r * 0.02, ey + r * 0.38, r * 0.07, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function rockAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hp: number, id: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, '#d8cdb8');
  g.addColorStop(0.6, '#9a8e7c');
  g.addColorStop(1, '#5e5547');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2, rr = r * (0.9 + hsh(id * 9 + k) * 0.14);
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2e2b3a';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.stroke();
  // 이끼·눈
  ctx.fillStyle = 'rgba(120,170,90,.55)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y + r * 0.45, r * 0.35, r * 0.18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f7ff';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.1, y - r * 0.78, r * 0.55, r * 0.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
  if (hp <= 1) {
    ctx.strokeStyle = 'rgba(40,30,50,.55)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.2, y - r * 0.5);
    ctx.lineTo(x + r * 0.05, y - r * 0.1);
    ctx.lineTo(x - r * 0.1, y + r * 0.2);
    ctx.lineTo(x + r * 0.15, y + r * 0.5);
    ctx.stroke();
  }
}

function monkey(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mood: number, t: number) {
  const bob = mood === 3 ? Math.sin(t * 0.6) * r * 0.08 : mood === 4 ? -Math.abs(Math.sin(t * 0.25)) * r * 0.25 : Math.sin(t * 0.04) * r * 0.03;
  y += bob;
  // 몸
  ctx.fillStyle = '#9b8577';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.95, r * 0.8, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // 팔
  ctx.strokeStyle = '#8a7466';
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = 'round';
  const up = mood === 3 || mood === 4;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * r * 0.6, y + r * 0.7);
    if (up) ctx.lineTo(x + sx * r * 1.05, y - r * 0.35 + (mood === 4 && Math.sin(t * 0.5) > 0 ? sx * r * 0.15 : 0));
    else ctx.lineTo(x + sx * r * 0.45, y + r * 1.35);
    ctx.stroke();
  }
  // 머리 (털)
  ctx.fillStyle = '#a99384';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // 얼굴 (분홍)
  ctx.fillStyle = mood === 5 ? '#ff9a9a' : '#f6a7a0';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.15, r * 0.66, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 수건
  const tw = mood === 2 ? -r * 0.25 : 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.82 + tw, r * 0.72, r * 0.26, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fd2ff';
  ctx.fillRect(x - r * 0.6, y - r * 0.86 + tw, r * 1.2, r * 0.07);
  // 눈·입
  ctx.strokeStyle = '#3a2420';
  ctx.fillStyle = '#3a2420';
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  for (const sx of [-1, 1]) {
    const ex = x + sx * r * 0.26, ey = y + r * 0.02;
    ctx.beginPath();
    if (mood === 0) {
      ctx.moveTo(ex - r * 0.12, ey);
      ctx.quadraticCurveTo(ex, ey + r * 0.1, ex + r * 0.12, ey);
      ctx.stroke();
    } else if (mood === 4) {
      ctx.moveTo(ex - r * 0.12, ey + r * 0.05);
      ctx.quadraticCurveTo(ex, ey - r * 0.12, ex + r * 0.12, ey + r * 0.05);
      ctx.stroke();
    } else if (mood === 5) {
      ctx.arc(ex, ey, r * 0.1, 0, Math.PI * 1.6);
      ctx.stroke();
    } else {
      ctx.arc(ex, ey, mood === 2 || mood === 3 ? r * 0.12 : r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.beginPath();
  if (mood === 2 || mood === 3) ctx.ellipse(x, y + r * 0.42, r * 0.12, r * 0.15, 0, 0, Math.PI * 2), ctx.fill();
  else if (mood === 4) ctx.arc(x, y + r * 0.32, r * 0.18, 0.1, Math.PI - 0.1), ctx.fill();
  else {
    ctx.moveTo(x - r * 0.14, y + r * 0.4);
    ctx.quadraticCurveTo(x, y + r * 0.5, x + r * 0.14, y + r * 0.4);
    ctx.stroke();
  }
  if (mood === 3) {
    ctx.fillStyle = '#9fe0ff';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.8, y - r * 0.2, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mood === 5) {
    ctx.fillStyle = '#ffe14d';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      star(ctx, x + Math.cos(a) * r * 0.9, y - r * 1.05 + Math.sin(a) * r * 0.25, r * 0.16);
      ctx.fill();
    }
  }
  if (mood === 0 && (t >> 5) % 3 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(r * 0.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('~♪', x + r * 0.9, y - r * 0.6);
  }
}

/** 물바가지 (손잡이 달린 나무 바가지) */
function ladle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tip: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tip);
  ctx.strokeStyle = '#a8763f';
  ctx.lineWidth = r * 0.18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.2);
  ctx.lineTo(r * 1.5, -r * 1.0);
  ctx.stroke();
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, '#e4b77a');
  g.addColorStop(1, '#b07b42');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-r * 0.75, -r * 0.55, r * 1.5, r * 1.15, [r * 0.12, r * 0.12, r * 0.35, r * 0.35]);
  ctx.fill();
  ctx.fillStyle = '#6fd3e8';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.55, r * 0.72, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a4f28';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.1);
  ctx.lineTo(r * 0.75, -r * 0.1);
  ctx.stroke();
  ctx.restore();
}

/** 기다리는 동물 그리기 (졸린 표시 포함) */
function itemAt(ctx: CanvasRenderingContext2D, it: Item, x: number, y: number, r: number, t: number) {
  if (it.bucket) return ladle(ctx, x, y, r * 0.95, 0);
  ctx.save();
  ctx.translate(x, y);
  animal(ctx, it.lv, r, it.sleep ? 3 : 0, t, 7);
  if (it.sleep) nightcap(ctx, r, t);
  ctx.restore();
  if (it.sleep) zz(ctx, x + r * 0.8, y - r * 0.9, r, it.sleep, t);
}

/** 졸린 동물 수면 모자 (몸 기준 좌표, 반지름 r) */
function nightcap(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const sw = Math.sin(t * 0.05) * r * 0.08;
  ctx.fillStyle = '#5b7bd6';
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.62);
  ctx.quadraticCurveTo(-r * 0.1, -r * 1.25, r * 0.55 + sw, -r * 1.35);
  ctx.quadraticCurveTo(r * 0.35, -r * 0.95, r * 0.62, -r * 0.62);
  ctx.quadraticCurveTo(0, -r * 0.9, -r * 0.62, -r * 0.62);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.92);
  ctx.lineTo(-r * 0.05, -r * 0.8);
  ctx.moveTo(r * 0.05, -r * 1.12);
  ctx.lineTo(r * 0.3, -r * 0.98);
  ctx.stroke();
  ctx.fillStyle = '#f2f4ff';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.66, r * 0.66, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.58 + sw, -r * 1.33, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

function zz(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, t: number) {
  const s = Math.max(12, Math.min(16, r * 0.7));
  ctx.fillStyle = 'rgba(40,50,90,.85)';
  ctx.beginPath();
  ctx.roundRect(x - s * 0.15, y - s * 0.62 + Math.sin(t * 0.05) * 1.5, s * 1.55, s * 1.05, s * 0.45);
  ctx.fill();
  ctx.fillStyle = '#cfe0ff';
  ctx.font = `900 ${Math.round(s * 0.78)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`z${n}`, x + s * 0.05, y - s * 0.1 + Math.sin(t * 0.05) * 1.5);
}

/** 각 동물이 위에서 받는 무게 (찌그러짐용): 위에서부터 아래로 무게를 나눠 내린다 */
function loads(B: Body[], slope: number) {
  const n = B.length, load = new Float64Array(n), order = [...B.keys()].sort((a, b) => B[a].y - B[b].y);
  for (const i of order) {
    const a = B[i];
    if (a.rock) continue;
    const sup: number[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const c = B[j];
      if (c.y > a.y + a.r * 0.25 && Math.hypot(c.x - a.x, c.y - a.y) < a.r + c.r + 0.006) sup.push(j);
    }
    const onFloor = a.y + a.r > FLOOR + slope * (a.x - 0.5) - 0.006 ? 1 : 0;
    const share = (a.r * a.r + load[i]) / Math.max(1, sup.length + onFloor);
    for (const j of sup) load[j] += share;
  }
  return load;
}

function drawAll(ctx: CanvasRenderingContext2D, s: DMState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const d = STAGES[s.stage], W = s.W, B = W.b;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.16, Math.min(w * 0.84, x)), Math.max(Y(LINE + 0.02) + size, y), text, col, size);
  };
  let happy = HAPPY.get(s);
  if (!happy) HAPPY.set(s, (happy = new Map()));
  const it = s.Q[s.qi], nx = s.Q[s.qi + 1];
  const fl = (x: number) => FLOOR + W.slope * (x - 0.5);

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 (해 질 녘 산) ──
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0.62));
  sky.addColorStop(0, '#1b2147');
  sky.addColorStop(0.5, '#4a3a78');
  sky.addColorStop(0.85, '#c06f8e');
  sky.addColorStop(1, '#f2a98a');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(0.64));
  // 달
  {
    const mx = X(0.7), my = Y(0.17);
    const mg = ctx.createRadialGradient(mx, my, R(0.01), mx, my, R(0.16));
    mg.addColorStop(0, 'rgba(255,246,214,.55)');
    mg.addColorStop(1, 'rgba(255,246,214,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(mx - R(0.16), my - R(0.16), R(0.32), R(0.32));
    ctx.fillStyle = '#fff4cf';
    ctx.beginPath();
    ctx.arc(mx, my, R(0.034), 0, Math.PI * 2);
    ctx.fill();
  }
  // 별
  for (let k = 0; k < 22; k++) {
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t / 60 + k * 1.7));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(X(hsh(k * 3.1)), Y(HB + hsh(k * 7.3) * 0.22), 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  // 먼 눈산 (두 겹)
  for (let layer = 0; layer < 2; layer++) {
    const base = layer ? 0.5 : 0.44, col = layer ? '#5c5a8e' : '#3d3f72';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-5, Y(0.62));
    const peaks = layer ? [[-0.05, 0.42], [0.22, 0.31], [0.45, 0.4], [0.68, 0.29], [0.95, 0.38], [1.1, 0.33]] : [[-0.1, 0.3], [0.12, 0.22], [0.36, 0.32], [0.58, 0.2], [0.86, 0.27], [1.1, 0.24]];
    for (const [px, py] of peaks) ctx.lineTo(X(px), Y(py + (layer ? 0.06 : 0)));
    ctx.lineTo(w + 5, Y(0.62));
    ctx.closePath();
    ctx.fill();
    // 눈 덮인 꼭대기
    ctx.fillStyle = layer ? 'rgba(240,240,255,.85)' : 'rgba(220,222,250,.7)';
    for (const [px, py] of peaks) {
      const yy = Y(py + (layer ? 0.06 : 0));
      ctx.beginPath();
      ctx.moveTo(X(px) - R(0.05), yy + R(0.045));
      ctx.lineTo(X(px), yy);
      ctx.lineTo(X(px) + R(0.05), yy + R(0.045));
      ctx.lineTo(X(px) + R(0.02), yy + R(0.035));
      ctx.lineTo(X(px), yy + R(0.05));
      ctx.lineTo(X(px) - R(0.025), yy + R(0.038));
      ctx.closePath();
      ctx.fill();
    }
    void base;
  }
  // 소나무 실루엣
  for (const [px, sc] of [[0.03, 1], [0.97, 1.1], [0.2, 0.7], [0.82, 0.75]]) {
    const bx = X(px), by = Y(0.5), hh = R(0.17 * sc);
    ctx.fillStyle = '#26304f';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(bx - hh * (0.36 - k * 0.08), by - hh * (k * 0.3));
      ctx.lineTo(bx, by - hh * (0.45 + k * 0.3));
      ctx.lineTo(bx + hh * (0.36 - k * 0.08), by - hh * (k * 0.3));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(235,240,255,.75)';
    ctx.beginPath();
    ctx.ellipse(bx, by - hh * 0.78, hh * 0.09, hh * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 대나무 울타리 (탕 뒤)
  {
    const y0 = Y(0.4), y1 = Y(0.56);
    for (let k = 0; k < 24; k++) {
      const bx = X(0.01 + k * 0.042), top = y0 + R(hsh(k * 5) * 0.03);
      const bg = ctx.createLinearGradient(bx, 0, bx + R(0.034), 0);
      bg.addColorStop(0, '#8aa25a');
      bg.addColorStop(0.5, '#b8c97c');
      bg.addColorStop(1, '#6d8444');
      ctx.fillStyle = bg;
      ctx.fillRect(bx, top, R(0.034), y1 - top);
      ctx.fillStyle = 'rgba(60,80,30,.5)';
      ctx.fillRect(bx, top + R(0.05), R(0.034), 1.5);
    }
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(0, y0 + R(0.06), w, R(0.012));
  }
  // 종이 등불 두 개
  for (const [lx, ph] of [[0.17, 0], [0.83, 1.3]]) {
    const sw = Math.sin(t * 0.03 + ph) * 0.06, cx = X(lx) + Math.sin(sw) * R(0.05), cy = Y(0.395);
    ctx.strokeStyle = '#3a2a2a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(X(lx), Y(RAIL));
    ctx.lineTo(cx, cy - R(0.03));
    ctx.stroke();
    const lg = ctx.createRadialGradient(cx, cy, R(0.005), cx, cy, R(0.1));
    lg.addColorStop(0, 'rgba(255,200,120,.55)');
    lg.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(cx - R(0.1), cy - R(0.1), R(0.2), R(0.2));
    ctx.fillStyle = '#ff8a4a';
    ctx.beginPath();
    ctx.ellipse(cx, cy, R(0.022), R(0.03), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd58a';
    ctx.beginPath();
    ctx.ellipse(cx - R(0.006), cy - R(0.004), R(0.01), R(0.018), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a2a';
    ctx.fillRect(cx - R(0.014), cy - R(0.034), R(0.028), R(0.007));
    ctx.fillRect(cx - R(0.014), cy + R(0.027), R(0.028), R(0.007));
  }

  // ── 온천탕: 안쪽 벽(뒤) ──
  const water = Math.max(0.62, 0.9 - B.reduce((a, b) => a + (b.rock ? 0 : b.r * b.r), 0) * 0.5);
  {
    const ig = ctx.createLinearGradient(0, Y(LINE - 0.02), 0, Y(FLOOR));
    ig.addColorStop(0, '#5b5571');
    ig.addColorStop(1, '#3b3650');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.moveTo(X(TL), Y(LINE - 0.03));
    ctx.lineTo(X(TR), Y(LINE - 0.03));
    ctx.lineTo(X(TR), Y(fl(TR)));
    ctx.lineTo(X(TL), Y(fl(TL)));
    ctx.closePath();
    ctx.fill();
    // 뒷벽 돌 무늬
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.lineWidth = 1.5;
    for (let row = 0; row < 7; row++) {
      const yy = LINE + 0.02 + row * 0.1;
      for (let k = 0; k < 6; k++) {
        const xx = TL + ((k + (row % 2) * 0.5) / 6) * (TR - TL);
        ctx.beginPath();
        ctx.ellipse(X(xx), Y(yy), R(0.06), R(0.04), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // 물 (뒤쪽 어두운 층)
    const wg = ctx.createLinearGradient(0, Y(water), 0, Y(FLOOR));
    wg.addColorStop(0, 'rgba(70,190,200,.55)');
    wg.addColorStop(1, 'rgba(30,110,140,.75)');
    ctx.fillStyle = wg;
    ctx.fillRect(X(TL), Y(water), R(TR - TL), Y(FLOOR + 0.12) - Y(water));
    // 바닥 (기운 탕이면 비탈)
    ctx.fillStyle = '#6e6884';
    ctx.beginPath();
    ctx.moveTo(X(TL), Y(fl(TL)));
    ctx.lineTo(X(TR), Y(fl(TR)));
    ctx.lineTo(X(TR), Y(FLOOR + 0.12));
    ctx.lineTo(X(TL), Y(FLOOR + 0.12));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.moveTo(X(TL), Y(fl(TL)));
    ctx.lineTo(X(TR), Y(fl(TR)));
    ctx.lineTo(X(TR), Y(fl(TR) + 0.012));
    ctx.lineTo(X(TL), Y(fl(TL) + 0.012));
    ctx.closePath();
    ctx.fill();
  }

  // ── 동물 그림자 ──
  ctx.fillStyle = 'rgba(10,20,40,.28)';
  for (const b of B) {
    const gy = fl(b.x), hgt = gy - (b.y + b.r);
    if (hgt > 0.25) continue;
    ctx.globalAlpha = Math.max(0.05, 0.3 - hgt);
    ctx.beginPath();
    ctx.ellipse(X(b.x + 0.012), Y(gy - 0.004), R(b.r * 0.9), R(0.014), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── 떨어질 선 (누르는 동안) ──
  const aimX = it ? clampX(s.aim, it.bucket ? -1 : it.lv) : s.aim;
  let target: Body | null = null, landY = fl(aimX);
  if (it && !it.bucket && s.phase === 'play') {
    const r0 = RAD[it.lv];
    for (const b of B) {
      const dx = Math.abs(b.x - aimX);
      if (dx >= b.r + r0) continue;
      const hitY = b.y - Math.sqrt((b.r + r0) ** 2 - dx * dx);
      if (hitY - r0 < landY - r0 + 0 && hitY < landY) (landY = hitY), (target = b);
    }
    if (!target) landY = fl(aimX) - r0;
  }
  if (s.down && it && s.phase === 'play') {
    const same = target && !target.rock && !target.sleep && target.lv === it.lv;
    ctx.strokeStyle = same ? '#ffe066' : 'rgba(255,255,255,.75)';
    ctx.lineWidth = same ? 3 : 2;
    ctx.setLineDash([R(0.014), R(0.012)]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.beginPath();
    ctx.moveTo(X(aimX), Y(DROPY + (it.bucket ? 0.04 : RAD[it.lv])));
    ctx.lineTo(X(aimX), Y(it.bucket ? water : landY));
    ctx.stroke();
    ctx.setLineDash([]);
    if (!it.bucket) {
      // 내려앉을 자리 윤곽
      ctx.strokeStyle = same ? '#ffe066' : 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(aimX), Y(landY), R(RAD[it.lv]), 0, Math.PI * 2);
      ctx.stroke();
      if (same && target) {
        const p = 1 + Math.sin(t * 0.3) * 0.08;
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(X(target.x), Y(target.y), R(target.r) * p + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // 물바가지가 밀어낼 범위
      ctx.fillStyle = 'rgba(120,220,255,.16)';
      ctx.fillRect(X(Math.max(TL, aimX - SPL)), Y(LINE), R(Math.min(TR, aimX + SPL) - Math.max(TL, aimX - SPL)), Y(FLOOR) - Y(LINE));
    }
  }

  // ── 동물들 ──
  const ld = loads(B, W.slope);
  const order = [...B.keys()].sort((a, b) => B[a].r - B[b].r);
  for (const i of order) {
    const b = B[i];
    const px = X(b.x), py = Y(b.y), pr = R(b.r);
    if (b.rock) {
      // 바위: 곧 깰 수 있으면(옆에 너구리 이상) 금빛으로 두근두근
      const near = B.some((o) => !o.rock && o.lv >= ROCK_LV - 1 && Math.hypot(o.x - b.x, o.y - b.y) < o.r + b.r + 0.03);
      const pulse = 0.5 + 0.5 * Math.sin(t * (near ? 0.3 : 0.1));
      ctx.strokeStyle = near ? `rgba(255,224,102,${0.5 + pulse * 0.5})` : `rgba(255,150,90,${0.25 + pulse * 0.3})`;
      ctx.lineWidth = near ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(px, py, pr + 4 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      rockAt(ctx, px, py, pr, b.rock, b.id);
      continue;
    }
    const sq = Math.max(0, Math.min(1, ld[i] / (b.r * b.r * 2.2) - 0.25));
    const hp = happy.get(b.id) ?? -1;
    const sp = Math.abs(b.x - b.px) + Math.abs(b.y - b.py);
    const mood = b.sleep > 0 ? 3 : b.hot > 0 ? 5 : b.air && sp > 0.006 ? 2 : t < hp ? 4 : sq > 0.45 ? 1 : 0;
    const grow = b.r < RAD[b.lv] - 0.002 ? 1.12 : 1;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.max(-0.5, Math.min(0.5, b.a)));
    ctx.scale((1 + sq * 0.1) * grow, (1 - sq * 0.1) * grow);
    animal(ctx, b.lv, pr, mood, t, b.id);
    if (b.sleep > 0) nightcap(ctx, pr, t + b.id * 13);
    ctx.restore();
    if (b.sleep > 0) zz(ctx, px + pr * 0.55, py - pr * 0.75, pr, b.sleep, t + b.id * 9);
  }
  // 1판 첫 퐁당 전: 병아리 위를 누르라는 손가락
  if (s.stage === 0 && !s.firstTap && s.phase === 'play') {
    const ch = B.filter((b) => b.lv === 0 && !b.rock).sort((a, b) => Math.abs(a.x - 0.49) - Math.abs(b.x - 0.49))[0];
    if (ch) {
      const pulse = (t % 50) / 50;
      ctx.strokeStyle = `rgba(255,236,120,${1 - pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(X(ch.x), Y(ch.y), R(ch.r) * (1.1 + pulse * 0.8), 0, Math.PI * 2);
      ctx.stroke();
      font(0.07, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(ch.x) + R(0.02), Y(DROPY + 0.13) + Math.sin(t * 0.15) * 4);
      ctx.setLineDash([R(0.01), R(0.01)]);
      ctx.strokeStyle = 'rgba(255,236,120,.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(ch.x), Y(DROPY + 0.18));
      ctx.lineTo(X(ch.x), Y(ch.y - ch.r - 0.02));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // 물바가지 물줄기 (콸콸 순간)
  for (const e of s.events) {
    const age = t - e.t;
    if (e.kind !== 'splash' || age > 30) continue;
    const k = 1 - age / 30, sx = X(e.x), wd = R(0.07) * k + 2;
    const sg = ctx.createLinearGradient(sx - wd, 0, sx + wd, 0);
    sg.addColorStop(0, 'rgba(120,220,255,0)');
    sg.addColorStop(0.5, `rgba(200,245,255,${0.85 * k})`);
    sg.addColorStop(1, 'rgba(120,220,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - wd, Y(DROPY), wd * 2, Y(water) - Y(DROPY));
    ctx.fillStyle = `rgba(220,250,255,${0.6 * k})`;
    ctx.beginPath();
    ctx.ellipse(sx, Y(water), R(SPL) * (1 - k * 0.5), R(0.03) * k + 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 물 (앞쪽 반투명 층) + 물결 ──
  {
    const wy = Y(water);
    const wg = ctx.createLinearGradient(0, wy, 0, Y(FLOOR));
    wg.addColorStop(0, 'rgba(140,240,235,.16)');
    wg.addColorStop(1, 'rgba(60,160,190,.24)');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(X(TL), wy);
    for (let k = 0; k <= 24; k++) {
      const xx = TL + ((TR - TL) * k) / 24;
      ctx.lineTo(X(xx), wy + Math.sin(t * 0.06 + k * 0.9) * 1.6);
    }
    ctx.lineTo(X(TR), Y(fl(TR)));
    ctx.lineTo(X(TL), Y(fl(TL)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,255,255,.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const xx = TL + ((TR - TL) * k) / 24;
      ctx[k ? 'lineTo' : 'moveTo'](X(xx), wy + Math.sin(t * 0.06 + k * 0.9) * 1.6);
    }
    ctx.stroke();
    // 물 위 김
    for (let k = 0; k < 7; k++) {
      const ph = (t * 0.004 + hsh(k * 4.1)) % 1, xx = TL + 0.05 + hsh(k * 2.3) * (TR - TL - 0.1);
      ctx.fillStyle = `rgba(255,255,255,${0.16 * Math.sin(ph * Math.PI)})`;
      ctx.beginPath();
      ctx.ellipse(X(xx + Math.sin(t * 0.02 + k) * 0.02), wy - R(ph * 0.22), R(0.035 + ph * 0.04), R(0.025 + ph * 0.02), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 탕 테두리 돌 (왼·오른쪽·바닥) ──
  const stones = (x0: number, y0: number, x1: number, y1: number, n: number, seed: number, rr: number) => {
    for (let k = 0; k < n; k++) {
      const f = n > 1 ? k / (n - 1) : 0.5, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, r0 = rr * (0.85 + hsh(seed + k) * 0.3);
      const g = ctx.createRadialGradient(X(x - r0 * 0.3), Y(y - r0 * 0.4), R(r0 * 0.1), X(x), Y(y), R(r0 * 1.1));
      g.addColorStop(0, '#a29cb3');
      g.addColorStop(0.65, '#746e88');
      g.addColorStop(1, '#4a4560');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(X(x), Y(y), R(r0 * 1.15), R(r0), (hsh(seed + k * 3) - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(245,248,255,.85)';
      ctx.beginPath();
      ctx.ellipse(X(x - r0 * 0.1), Y(y - r0 * 0.72), R(r0 * 0.75), R(r0 * 0.26), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  stones(TL - 0.045, LINE - 0.01, TL - 0.045, FLOOR + 0.03, 8, 11, 0.05);
  stones(TR + 0.045, LINE - 0.01, TR + 0.045, FLOOR + 0.03, 8, 31, 0.05);
  // 앞쪽 바닥 돌 (낮게)
  {
    const fg = ctx.createLinearGradient(0, Y(FLOOR + 0.02), 0, Y(BAND));
    fg.addColorStop(0, '#5c5670');
    fg.addColorStop(1, '#3b3650');
    ctx.fillStyle = fg;
    ctx.fillRect(X(TL - 0.09), Y(Math.max(fl(TL), fl(TR)) + 0.004), R(TR - TL + 0.18), Y(BAND + 0.02) - Y(Math.max(fl(TL), fl(TR))));
    stones(TL - 0.02, FLOOR + 0.055, TR + 0.02, FLOOR + 0.055, 9, 51, 0.042);
  }
  // 금줄 (넘침 선): 두 기둥 사이 새끼줄 + 종이 술
  {
    const danger = s.warn > WARN_T, flash = danger && t % 12 < 6;
    for (const px of [TL - 0.045, TR + 0.045]) {
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(X(px) - R(0.012), Y(RAIL - 0.02), R(0.024), Y(LINE + 0.02) - Y(RAIL - 0.02));
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath();
      ctx.ellipse(X(px), Y(RAIL - 0.022), R(0.02), R(0.008), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const sag = (f: number) => Y(LINE) + Math.sin(f * Math.PI) * R(0.016);
    ctx.strokeStyle = flash ? '#ff4b3e' : danger ? '#ffb3a0' : '#e9cf8f';
    ctx.lineWidth = R(0.011);
    ctx.beginPath();
    for (let k = 0; k <= 20; k++) ctx[k ? 'lineTo' : 'moveTo'](X(TL - 0.045 + (TR - TL + 0.09) * (k / 20)), sag(k / 20));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,80,30,.6)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 30; k++) {
      const f = k / 30, xx = X(TL - 0.045 + (TR - TL + 0.09) * f), yy = sag(f);
      ctx.beginPath();
      ctx.moveTo(xx - R(0.005), yy - R(0.005));
      ctx.lineTo(xx + R(0.005), yy + R(0.005));
      ctx.stroke();
    }
    for (let k = 1; k < 6; k++) {
      const f = k / 6, xx = X(TL - 0.045 + (TR - TL + 0.09) * f), yy = sag(f), sw = Math.sin(t * 0.05 + k) * R(0.004);
      ctx.fillStyle = flash ? '#ffd0c8' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(xx - R(0.008), yy);
      ctx.lineTo(xx + R(0.008), yy);
      ctx.lineTo(xx + R(0.008) + sw, yy + R(0.022));
      ctx.lineTo(xx - R(0.004) + sw, yy + R(0.022));
      ctx.lineTo(xx + R(0.004) + sw, yy + R(0.04));
      ctx.lineTo(xx - R(0.008) + sw, yy + R(0.04));
      ctx.closePath();
      ctx.fill();
    }
    if (danger) {
      font(0.042, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tx = `⚠️ 넘친다! ${Math.max(0, (OVER_T - s.warn) / 60).toFixed(1)}초`, tw = ctx.measureText(tx).width + R(0.05);
      ctx.fillStyle = flash ? 'rgba(200,40,40,.92)' : 'rgba(40,20,40,.9)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2, Y(LINE - 0.09), tw, R(0.055), R(0.027));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tx, w / 2, Y(LINE - 0.0625));
    }
  }

  // ── 대나무 줄 + 바구니 + 지금 동물 ──
  {
    const rg = ctx.createLinearGradient(0, Y(RAIL - 0.012), 0, Y(RAIL + 0.012));
    rg.addColorStop(0, '#c9d98a');
    rg.addColorStop(1, '#7d9a46');
    ctx.fillStyle = rg;
    ctx.fillRect(X(TL - 0.06), Y(RAIL - 0.011), R(TR - TL + 0.12), R(0.022));
    ctx.fillStyle = 'rgba(60,80,30,.5)';
    for (let k = 1; k < 6; k++) ctx.fillRect(X(TL - 0.06 + k * 0.16), Y(RAIL - 0.011), 2, R(0.022));
    const showCur = it && s.phase === 'play' && s.cd <= CD - 14;
    const bx = X(aimX), tipping = s.cd > CD - 14 ? (s.cd - (CD - 14)) / 14 : 0;
    // 도르래
    ctx.fillStyle = '#5a3d22';
    ctx.beginPath();
    ctx.arc(bx, Y(RAIL), R(0.014), 0, Math.PI * 2);
    ctx.fill();
    const rr = it && !it.bucket ? RAD[it.lv] : 0.06;
    const by = Y(DROPY);
    ctx.strokeStyle = '#d8c39a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, Y(RAIL));
    ctx.lineTo(bx - R(rr * 0.85), by + R(rr * 0.2));
    ctx.moveTo(bx, Y(RAIL));
    ctx.lineTo(bx + R(rr * 0.85), by + R(rr * 0.2));
    ctx.stroke();
    if (showCur && it) itemAt(ctx, it, bx, by - (it.bucket ? 0 : R(0.004)), R(rr), t);
    // 바구니 (아래 반쪽) — 떨군 직후엔 기울어진다
    ctx.save();
    ctx.translate(bx, by + R(rr * 0.2));
    ctx.rotate(tipping * 0.9);
    const kg = ctx.createLinearGradient(0, 0, 0, R(rr * 0.9));
    kg.addColorStop(0, '#d9a25c');
    kg.addColorStop(1, '#9a6a34');
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.moveTo(-R(rr * 0.95), 0);
    ctx.quadraticCurveTo(-R(rr * 0.9), R(rr * 0.85), 0, R(rr * 0.85));
    ctx.quadraticCurveTo(R(rr * 0.9), R(rr * 0.85), R(rr * 0.95), 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,20,.55)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-R(rr * 0.9), R(rr * 0.28 * k));
      ctx.lineTo(R(rr * 0.9), R(rr * 0.28 * k));
      ctx.stroke();
    }
    ctx.restore();
  }
  // ── 다음 동물 (오른쪽 위 나무통) ──
  {
    const cx = X(0.9), cy = Y(0.17), rr = R(0.052);
    ctx.fillStyle = 'rgba(20,20,40,.35)';
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy + rr * 1.15, rr * 1.2, rr * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    const tg = ctx.createLinearGradient(cx - rr, 0, cx + rr, 0);
    tg.addColorStop(0, '#c48a4a');
    tg.addColorStop(0.5, '#e6b878');
    tg.addColorStop(1, '#9a6430');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(cx - rr * 1.1, cy + rr * 0.15);
    ctx.lineTo(cx + rr * 1.1, cy + rr * 0.15);
    ctx.lineTo(cx + rr * 0.95, cy + rr * 1.15);
    ctx.lineTo(cx - rr * 0.95, cy + rr * 1.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5b5b66';
    ctx.fillRect(cx - rr * 1.05, cy + rr * 0.4, rr * 2.1, 2);
    ctx.fillRect(cx - rr * 0.98, cy + rr * 0.9, rr * 1.96, 2);
    if (nx) itemAt(ctx, nx, cx, cy - rr * 0.1, nx.bucket ? rr * 0.8 : Math.min(rr * 0.95, R(RAD[nx.lv]) * 0.7), t);
    ctx.fillStyle = '#ffffff';
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nx ? '다음' : '끝!', cx, cy + rr * 1.55);
  }
  // ── 눈원숭이 (왼쪽 기둥 위) ──
  monkey(ctx, X(0.09), Y(RAIL - 0.115), R(0.068), s.monkey, t);

  // ── 사건 연출 ──
  let puffs = PUFFS.get(s);
  if (!puffs) PUFFS.set(s, (puffs = []));
  const seenT = fx.memo.t ?? -1;
  const steam = (x: number, y: number, n: number, size: number, c = '255,255,255') => {
    for (let k = 0; k < n; k++) puffs!.push({ x: x + (hsh(t + k * 7) - 0.5) * size, y: y + (hsh(k * 3 + t) - 0.5) * size * 0.6, r: size * (0.35 + hsh(k + t) * 0.3), life: 70, max: 70, vx: (hsh(k * 5 + t) - 0.5) * 0.7, c });
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'merge' || e.kind === 'bigpop') {
      // 연쇄가 길수록 점점 더 크게: 파티클·고리·흔들림·번쩍·떠오르는 큰 숫자
      const lv = e.lv ?? 0, k = Math.min(8, e.n ?? 1), u = R(RAD[Math.min(MAXLV, lv)]), col = COMBO_C[Math.min(COMBO_C.length - 1, k)];
      steam(x, y - u * 0.3, 2 + Math.min(4, (lv >> 1) + k), u * (1 + k * 0.15));
      fx.burst(x, y, col, 12 + k * 7 + lv * 2, 2.6 + k * 0.55 + lv * 0.3, 2.4 + k * 0.25);
      fx.burst(x, y, '#ffffff', 8 + lv, 2, 2);
      fx.ring(x, y, col, u * (1.6 + k * 0.5), 3 + k);
      if (k >= 2) fx.ring(x, y, '#ffffff', u * (2.4 + k * 0.7), 2);
      fx.kick(1.5 + lv * 0.7 + k * 1.8 + (e.kind === 'bigpop' ? 12 : 0));
      if (k >= 3) fx.blink(col, Math.min(0.35, 0.07 * k));
      if (k >= 2) say(x, y - u - 8, `×${k}`, col, Math.min(46, 18 + k * 5));
      else say(x, y - u - 6, lv >= 4 ? `${EMO[lv]} ${NAMES[lv]}!` : '뿅!', lv >= 4 ? '#ffe9a8' : '#ffffff', lv >= 4 ? 19 : 16);
      if (k >= 4) steam(x, y - u * 2, 6, R(0.12), '255,240,250');
      for (const b of B) if (Math.hypot(b.x - e.x, b.y - e.y) < 0.02) happy.set(b.id, t + 60);
      if (e.kind === 'bigpop') fx.blink('#fff6c8', 0.45);
    }
    if (e.kind === 'tilt') (fx.kick(6), say(x, Y(FLOOR - 0.12), e.text!, '#ffe066', 22), fx.burst(x, Y(FLOOR + 0.03), '#e9d2a8', 24, 4, 2.6));
    if (e.kind === 'land') {
      const inWater = e.y > water;
      fx.burst(x, y, inWater ? '#bff4ff' : '#e9e4f5', inWater ? 8 : 5, 2.2, 2.2);
      if (inWater && (e.lv ?? 0) >= 2) steam(x, Y(water), 1, R(0.06), '200,245,255');
      fx.kick(0.8 + (e.lv ?? 0) * 0.3);
    }
    if (e.kind === 'drop') steam(x, y - R(0.02), 1, R(0.04));
    if (e.kind === 'crack' || e.kind === 'break') {
      fx.burst(x, y, '#b9b4c4', e.kind === 'break' ? 28 : 12, e.kind === 'break' ? 5 : 3, 3);
      fx.ring(x, y, '#ffe066', R(0.2), 5);
      fx.kick(e.kind === 'break' ? 9 : 4);
      say(x, y - R(0.06), e.kind === 'break' ? '쩍! 🪨' : '쩌억', '#ffe066', 18);
    }
    if (e.kind === 'wake') (say(x, y - R(0.06), '하암!', '#cfe0ff', 15), fx.burst(x, y - R(0.04), '#ffe9a8', 8, 2, 2));
    if (e.kind === 'splash') {
      fx.burst(x, Y(LINE + 0.05), '#9fe8ff', 40, 5.5, 3);
      fx.burst(x, Y(LINE + 0.2), '#e6fbff', 24, 4, 2.6);
      fx.ring(x, Y(LINE + 0.25), '#9fe8ff', R(SPL), 6);
      fx.kick(7);
      say(x, Y(LINE + 0.02), '콸콸!', '#9fe8ff', 20);
      steam(x, Y(water), 4, R(0.1), '200,245,255');
    }
    if (e.kind === 'clear') (fx.burst(w * 0.3, Y(0.7), '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, Y(0.7), '#ff9ec4', 40, 6, 3.2), fx.ring(w / 2, Y(0.75), '#ffe066', R(0.45), 7), fx.blink('#fff6c8', 0.2));
    if (e.kind === 'fail') (fx.kick(8), fx.blink(th.hot, 0.18), fx.burst(w / 2, Y(LINE), '#9fe8ff', 50, 6, 3));
  }
  fx.memo.t = s.t;
  for (const p of puffs) {
    p.life--;
    p.x += p.vx;
    p.y -= 0.55;
    p.r += 0.2;
    ctx.fillStyle = `rgba(${p.c},${0.3 * (p.life / p.max)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  PUFFS.set(s, puffs.filter((p) => p.life > 0).slice(-90));
  // 뿅 콤보 큰 글자
  if (s.combo >= 2 && s.t - s.lastDrop < 260) {
    const last = s.events.filter((e) => e.kind === 'merge' || e.kind === 'bigpop').at(-1);
    const age = last ? s.t - last.t : 99, k = Math.min(8, s.combo);
    if (age < 60) {
      const big = s.events.filter((e) => (e.kind === 'merge' || e.kind === 'bigpop') && e.t >= s.lastDrop).reduce((m, e) => Math.max(m, e.lv ?? 0), 0);
      const tx = `${k >= 6 ? '온천 폭발!! ' : k >= 4 ? '대연쇄! ' : '연쇄 '}뿅×${s.combo}${big >= 3 ? ' ' + EMO[big] : '!'}`;
      font(0.07, 900);
      const fit = (w * 0.9) / Math.max(1, ctx.measureText(tx).width);
      const sc = Math.min(fit, (1 + k * 0.07) * (1 + Math.max(0, 8 - age) * 0.07));
      ctx.save();
      ctx.translate(w / 2, Y(LINE - 0.075));
      ctx.rotate(Math.sin(t * 0.35) * 0.012 * k);
      ctx.scale(sc, sc);
      ctx.globalAlpha = Math.min(1, (60 - age) / 12);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(40,20,60,.7)';
      ctx.strokeText(tx, 0, 0);
      ctx.fillStyle = COMBO_C[Math.min(COMBO_C.length - 1, k)];
      ctx.fillText(tx, 0, 0);
      if (s.combo >= d.C) {
        font(0.04, 900);
        ctx.fillStyle = '#ffe066';
        ctx.fillText('★ 연쇄 별!', 0, R(0.055));
      }
      ctx.restore();
    }
  }
  // 시소 탕: 받침목 + 몇 번 뒤에 반대로 기우는지
  if (d.flip) {
    const left = d.flip - (s.qi % d.flip), cx = X(0.5), cy = Y(FLOOR + 0.038);
    ctx.fillStyle = '#7a4f2a';
    ctx.beginPath();
    ctx.moveTo(cx - R(0.06), Y(BAND - 0.005));
    ctx.lineTo(cx, Y(FLOOR + 0.01));
    ctx.lineTo(cx + R(0.06), Y(BAND - 0.005));
    ctx.closePath();
    ctx.fill();
    const dir = W.tilt > 0 ? '↙' : '↘', soon = left <= 1;
    font(0.04, 900);
    const tx = soon ? `⚖️ 다음에 ${dir} 와르르!` : `⚖️ ${left}번 뒤 ${dir}`, tw = ctx.measureText(tx).width + R(0.05);
    ctx.fillStyle = soon && t % 16 < 8 ? 'rgba(190,60,40,.92)' : 'rgba(40,26,20,.85)';
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, cy - R(0.028), tw, R(0.056), R(0.028));
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tx, cx, cy);
  }
  // 김 모으기: 탕 위에 모이는 김 구름 (목표까지 차오른다)
  if (d.goal[0] === 'steam') {
    const p = Math.min(1, s.steam / d.goal[1]), cx = X(0.5), cy = Y(0.17), rr = R(0.035 + 0.06 * p);
    ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.3 * p})`;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + t * 0.01;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr * 0.9, cy + Math.sin(a) * rr * 0.45, rr * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, rr * 0.8, 0, Math.PI * 2);
    ctx.fill();
    font(0.046, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a4a7a';
    ctx.fillText(`♨️ ${Math.min(s.steam, d.goal[1])}/${d.goal[1]}`, cx, cy);
  }
  // 2판: 다음 동물 나무통을 반짝
  if (d.key === 'next' && s.pt < 300 && s.phase === 'play') {
    const pulse = (t % 40) / 40;
    ctx.strokeStyle = `rgba(255,236,120,${1 - pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(X(0.9), Y(0.19), R(0.07) * (1 + pulse * 0.6), 0, Math.PI * 2);
    ctx.stroke();
  }
  // 느린 화면: 위아래 검은 띠 + 글자
  if (s.slow > 0) {
    const k = Math.min(1, s.slow / 10);
    ctx.fillStyle = 'rgba(8,6,20,.6)';
    ctx.fillRect(0, Y(HB), w, R(0.04) * k);
    ctx.fillRect(0, Y(BAND) - R(0.04) * k, w, R(0.04) * k);
    if (k > 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      font(0.034, 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▶ 느린 화면 ◀', w / 2, Y(HB) + R(0.02));
    }
  }
  ctx.restore();

  // ═════════════ HUD (위 띠) ═════════════
  const hb = R(HB);
  ctx.fillStyle = 'rgba(20,22,48,.88)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `♨️ ${s.stage + 1}번째 탕`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);

  // 판 카드: 시작 · 결과 (탕 한가운데, 누르면 바로 사라짐)
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '온천 대성공! ♨️' : '목표 달성!'), (sub = `금줄 무사 ${s.starOk[1] ? '✓' : '✗'} · 한 번에 뿅×${d.C} ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffd84a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 탕 다시' : '끝 — 동물들이 수건을 챙겨요'), (col = '#ffb3a8');
    } else if (s.phase === 'play' && s.pt < CARD_T && !s.down && s.qi === 0 && !(s.stage === 0 && s.pt > 70)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = `${s.again ? '다시! ' : ''}${d.title}`;
      sub = `목표 ${goalText(d.goal)} · 동물 ${d.K}마리`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(0.74), ch2 = nw ? 0.17 : 0.12, cw2 = 0.86;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(24,26,56,.9)';
      ctx.beginPath();
      ctx.roundRect(-R(cw2 / 2), -R(0.06), R(cw2), R(ch2), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.056, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.06), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.02));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.02));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, R(0.026));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.02), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.02), R(cw2 - 0.06));
      ctx.fillStyle = '#fff8ef';
      font(0.038, 800);
      ctx.fillText(sub, 0, R(0.03), R(cw2 - 0.06));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, R(0.08), R(cw2 - 0.04));
      }
      ctx.restore();
    }
  }

  // ═════════════ 아래 띠 ═════════════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(30,32,64,.97)');
    g.addColorStop(1, 'rgba(18,20,42,.99)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 1줄: 목표 + 진행 · 남은 동물
    const r1 = Y(ty + 0.04), gl = d.goal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff1d6';
    font(0.04, 900);
    const gtx = `목표 ${goalText(gl)}`;
    ctx.fillText(gtx, X(0.03), r1);
    const gx = X(0.03) + ctx.measureText(gtx).width + R(0.025);
    font(0.036, 800);
    ctx.fillStyle = '#bfe9ff';
    const prog =
      gl[0] === 'lv' ? `지금 최고 ${s.maxLv >= 0 ? EMO[Math.min(MAXLV, s.maxLv)] : '-'}` : gl[0] === 'rock' ? `${Math.min(gl[1], s.broke)}/${gl[1]}` : `${Math.min(gl[1], s.steam)}/${gl[1]}`;
    ctx.fillText(prog, gx, r1);
    if (gl[0] === 'steam') {
      const bw = R(0.16), bx2 = gx + ctx.measureText(prog).width + R(0.015);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(bx2, r1 - 4, bw, 8);
      ctx.fillStyle = '#9fe8ff';
      ctx.fillRect(bx2, r1 - 4, bw * Math.min(1, s.steam / gl[1]), 8);
    }
    ctx.textAlign = 'right';
    const left = s.Q.length - s.qi;
    ctx.fillStyle = left <= 3 ? '#ffb3a8' : '#ffe9d6';
    font(0.038, 900);
    ctx.fillText(`남은 동물 ${left}`, X(0.97), r1);
    // 2줄: 별 목표 셋
    const done = s.phase === 'result' && s.ok;
    const okk = done ? s.starOk : [false, s.clean && s.phase !== 'result', s.bestCombo >= d.C];
    const bad = [s.phase === 'result' && !s.ok, !s.clean, done && !s.starOk[2]];
    const labels = ['목표', '금줄 무사', `한 번에 뿅×${d.C}`];
    const r2 = Y(ty + 0.105), cw3 = R(0.3);
    for (let k = 0; k < 3; k++) {
      const cx1 = X(0.03) + k * (cw3 + R(0.017));
      const lit = okk[k] && (k > 0 || done);
      ctx.fillStyle = lit ? 'rgba(255,216,74,.22)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - R(0.027), cw3, R(0.054), R(0.027));
      ctx.fill();
      ctx.strokeStyle = lit ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = lit ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + R(0.03), r2 + R(0.002));
      ctx.fillStyle = lit ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#f1e6ff';
      font(0.036, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + R(0.058), r2 + R(0.002), cw3 - R(0.066));
    }
    // 3줄: 안내 · 새것 알림
    let hint = d.hint, col = '#ffe9a8';
    const first = s.stage === 0 && !s.firstTap && s.phase === 'play';
    if (first) (hint = '👆 병아리 위에서 꾹 누르고 → 떼면 퐁당!'), (col = '#ffffff');
    else if (s.news && s.t - s.news.t < NEWS_T) (hint = s.news.text), (col = '#9fe8ff');
    else if (s.down && s.phase === 'play' && it) hint = it.bucket ? '떼면 콸콸! 둘레를 밀어내요' : target && target.lv === it.lv && !target.sleep ? '✨ 같은 동물! 떼면 뿅' : '떼면 퐁당 · 금빛 선 = 뿅 예정';
    else if (s.warn > WARN_T) (hint = '⚠️ 금줄 위 동물을 빨리 합쳐요!'), (col = '#ffb3a8');
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '온천 손님 모두 뽀송뽀송 — 고마워요!' : `★ ${s.got}개! 다음 탕엔 새것이 나와요`) : '같은 동물은 붙여 두고, 큰 동물은 한쪽에';
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    font(first ? 0.042 : 0.038, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.17), w - R(0.05));
  }
}
