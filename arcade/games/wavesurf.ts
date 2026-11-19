/**
 * 파도 만들기 꼬마 서퍼 (33라운드: 서로 다른 뼈대 — 파도타기) — 파도 일으키기 × 꾹 눌렀다 떼기 × 콤보.
 * 기준 9(손이 하는 일은 하나): 꾹 누르는 동안 서퍼 뒤의 바다가 부풀어 파도가 점점 커지고(서퍼는 파도 등을 타고 높이 올라간다),
 *   떼는 순간 '쏴아' 파도가 부서지며 서퍼가 파도 끝에서 하늘로 솟구친다. 키보드는 스페이스 꾹.
 * 규칙(결정적): 파도 높이 H는 누른 시간으로 정해진다(빨리 솟았다가 꼭대기에서 멈춤). 떼면
 *   ① 서퍼가 H만큼 높이 뛴다(공중에 오래 있을수록 저절로 공중제비 — 바퀴 수만큼 점수),
 *   ② 부서진 파도의 거품이 앞으로 0.15+1.55H 만큼 밀려가며 그 안의 모래성·비치볼·파라솔·게를 휩쓴다(한 파도에 n번째는 ×(1+0.5(n−1))).
 *   꼭대기에서 더 누르면 파도가 말리고(경고), 그래도 누르면 파도에 말려 넘어진다(와이프아웃). 누르는 동안엔 파도를 오르느라 느려진다.
 *   바위·부두·배에 부딪히거나 와이프아웃·해파리에 쏘이면 보드가 금 간다(보드 3칸 = 지킬 것). 보드가 부러지면 하트 -1·그 판 다시.
 * 와우: 첫 꾹에 바다가 화면 절반만큼 솟고, 떼자 '쏴아' — 서퍼가 공중제비를 돌고 모래성 셋이 와르르 휩쓸린다.
 * 판 7개: 목표 = 등대까지 가기. 별 = ★ 등대 · 판마다 다른 쉬운 한 줄(모래성 다섯 휩쓸기 · 한 번도 안 넘어지기 …).
 * 펼쳐짐(하는 일이 바뀐다): 1판 모래성(언제 부술까) → 2판 바위(높이 맞춰 타고 넘기) → 3판 부두(밑은 작은 파도로, 아니면 훌쩍 넘기)
 *   → 4판 돌고래(내려앉을 자리를 맞춰 2단 점프) → 5판 해파리(물 위를 못 지나감 → 멀리 뛰어 건너기)
 *   → 6판 작은 배(큰 파도의 거품으로 띄워 보내기) → 7판 썰물(파도가 천천히 커짐 → 일찍 누르기).
 * 웃음: 넘어지면 보드가 튕겨 나가고 서퍼는 허우적, 쏘이면 '따끔!' 하고 폴짝, 휩쓸린 게는 '으악' 하고 데굴데굴.
 *   앞 모래밭의 물개는 큰 순간마다 박수를 치고, 게는 집게를 흔든다. 첫 화면의 서퍼는 선글라스를 이마에 얹고 기지개를 켠다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 서퍼가 타는 물길의 화면 높이(가로 폭 = 1) · 서퍼가 서는 화면 x */
const SEA = 1.09, CAMX = 0.27;
/** 앞으로 가는 빠르기(틱당): 그냥 탈 때 · 파도를 키우는 동안(파도를 오르느라 느림) · 공중 · 넘어져 허우적 */
const VX = 0.0085, VXC = 0.002, VXA = 0.0105, VXT = 0.0055;
/** 중력 · 파도 위 서퍼 높이 비율 · 서퍼 키 · 부두 판 두께 · 배 높이(돛대 끝) · 거품 앞머리 빠르기 */
const G = 0.0011, RIDE_K = 0.82, BODY = 0.15, DECK = 0.05, BOAT_H = 0.46, VS = 0.02;
const TUM_T = 48, INV_CRASH = 80, INV_STING = 55, BOARD = 3;
const RESULT_OK = 190, RESULT_FAIL = 160, CARD_T = 150, NEWS_T = 150;
const STAR_PTS = 200, WIN_PTS = 400, CLEAR_PTS = 100;
const IDLE = 0, RIDE = 1, CHARGE = 2, AIR = 3, TUMBLE = 4;

type IK = 'castle' | 'ball' | 'parasol' | 'crab' | 'boat' | 'shell' | 'rock' | 'pier' | 'jelly' | 'dolphin' | 'sand';
const SWEEP: Partial<Record<IK, number>> = { castle: 30, ball: 20, parasol: 40, crab: 30, boat: 120 };
const HALF: Partial<Record<IK, number>> = { castle: 0.045, ball: 0.03, parasol: 0.04, crab: 0.03 };
const FLIP_PTS = [0, 20, 50, 100, 160, 240, 330, 430, 540];
const SHELL_PTS = 15, DOLPHIN_PTS = 50, HOP_PTS = 20, CLEAN_PTS = 40;
const KIND_NAME: Partial<Record<IK, string>> = { rock: '바위', pier: '부두', dolphin: '돌고래', jelly: '해파리', boat: '작은 배' };

/** 가운데 놓인 것(x = 가운데, w = 반폭) · 길게 놓인 것(부두·해파리·모래톱: x = 시작, w = 길이) */
interface Item { id: number; k: IK; x: number; w: number; h: number; v: number; g: number }
const SPAN = (k: IK) => k === 'pier' || k === 'jelly' || k === 'sand';
const x0 = (it: Item) => (SPAN(it.k) ? it.x : it.x - it.w);
const x1 = (it: Item) => (SPAN(it.k) ? it.x + it.w : it.x + it.w);

type StarK = 'castle' | 'combo' | 'nofall' | 'shell' | 'dolphin' | 'nosting' | 'boat' | 'crab' | 'flip2' | 'chain';
interface Star { k: StarK; n: number; label: string }
interface Bld {
  beach(a: number, b: number, kinds: string, jit?: boolean): void;
  rock(x: number, h: number, w?: number): void;
  pier(x: number, len: number, hp?: number): void;
  jelly(x: number, len: number): void;
  dolphin(x: number): void;
  boat(x: number): void;
  shells(x: number, h: number, n: number, dx: number, dh: number): void;
}
interface StageDef {
  key: string; name: string; news: string; hint: string; newKind: IK | ''; place: number;
  /** 파도가 꼭대기까지 크는 틱 · 꼭대기 높이 · 꼭대기에서 버틸 수 있는 틱(넘으면 와이프아웃) · 등대까지 거리 */
  tg: number; hmax: number; curl: number; L: number;
  build: (b: Bld) => void; stars: Star[];
}
const C = (k: StarK, n: number, label: string): Star => ({ k, n, label });

export const STAGES: StageDef[] = [
  {
    key: 'calm', name: '모래성 해변', news: '', hint: '꾹 누르면 파도가 솟아요 — 떼면 쏴아!', newKind: '', place: 0,
    tg: 50, hmax: 0.62, curl: 100, L: 6.3,
    build: (b) => {
      b.beach(0.42, 0.68, 'ccc', false);
      b.shells(1.3, 0.3, 4, 0.08, 0.06);
      b.beach(1.95, 2.55, 'cbc');
      b.shells(2.95, 0.36, 4, 0.08, 0.05);
      b.beach(3.45, 4.05, 'cpcb');
      b.beach(4.7, 5.4, 'ccbcc');
    },
    stars: [],
  },
  {
    key: 'rock', name: '바위 해변', news: '바위 — 떼서 훌쩍 뛰어넘어요', hint: '바위 앞에서 떼면 훌쩍 넘어요', newKind: 'rock', place: 0,
    tg: 50, hmax: 0.62, curl: 60, L: 7.7,
    build: (b) => {
      b.beach(0.8, 1.3, 'cc');
      b.rock(1.8, 0.12);
      b.beach(2.3, 2.85, 'cbc');
      b.rock(3.35, 0.18);
      b.shells(3.25, 0.4, 3, 0.08, 0.05);
      b.beach(3.85, 4.35, 'cc');
      b.rock(4.9, 0.14);
      b.beach(5.45, 6.0, 'cpcc');
      b.rock(6.5, 0.22);
      b.beach(6.9, 7.35, 'cb');
    },
    stars: [C('castle', 5, '모래성 다섯 휩쓸기')],
  },
  {
    key: 'pier', name: '나무 부두', news: '부두 — 밑으로는 작은 파도로', hint: '부두 밑은 작게, 아니면 훌쩍 넘어요', newKind: 'pier', place: 1,
    tg: 50, hmax: 0.62, curl: 30, L: 8.5,
    build: (b) => {
      b.beach(0.8, 1.3, 'cpc');
      b.pier(1.6, 0.6);
      b.shells(1.72, 0.07, 4, 0.12, 0);
      b.rock(2.75, 0.2);
      b.beach(3.15, 3.7, 'cbpc');
      b.pier(4.15, 0.7);
      b.shells(4.25, 0.55, 4, 0.13, 0.06);
      b.beach(5.2, 5.7, 'ccp');
      b.rock(6.1, 0.24);
      b.beach(6.45, 6.85, 'cc');
      b.pier(7.0, 0.55);
      b.beach(7.75, 8.15, 'pcc');
    },
    stars: [C('nofall', 0, '한 번도 안 넘어지기'), C('combo', 3, '한 번에 셋 휩쓸기')],
  },
  {
    key: 'dolphin', name: '돌고래 만', news: '돌고래 — 내려앉으면 한 번 더 점프!', hint: '큰 바위섬 앞 돌고래 위에 내려앉아요', newKind: 'dolphin', place: 1,
    tg: 50, hmax: 0.62, curl: 30, L: 8.7,
    build: (b) => {
      b.beach(0.8, 1.35, 'ccpc');
      b.dolphin(2.0);
      b.rock(2.4, 0.62, 0.075);
      b.shells(2.17, 0.64, 4, 0.09, 0.06);
      b.beach(3.3, 3.8, 'cbc');
      b.rock(4.25, 0.2);
      b.dolphin(4.8);
      b.rock(5.2, 0.66, 0.075);
      b.shells(4.97, 0.68, 4, 0.09, 0.05);
      b.beach(6.1, 6.65, 'cbcc');
      b.rock(7.1, 0.26);
      b.beach(7.5, 7.9, 'cc');
    },
    stars: [C('dolphin', 2, '돌고래 타고 두 번 뛰기'), C('shell', 8, '조개 여덟 개 모으기')],
  },
  {
    key: 'jelly', name: '해파리 물길', news: '해파리 — 물 위로 지나가면 따끔!', hint: '해파리 물길은 멀리 뛰어 건너요', newKind: 'jelly', place: 2,
    tg: 50, hmax: 0.62, curl: 30, L: 8.8,
    build: (b) => {
      b.beach(0.8, 1.3, 'cbc');
      b.jelly(1.7, 0.45);
      b.beach(2.55, 3.05, 'ccpc');
      b.jelly(3.55, 0.5);
      b.rock(4.3, 0.2);
      b.beach(5.0, 5.5, 'cbcc');
      b.jelly(5.85, 0.85);
      b.dolphin(6.2);
      b.beach(7.2, 7.7, 'cpc');
      b.jelly(8.05, 0.4);
    },
    stars: [C('nosting', 0, '해파리에 한 번도 안 쏘이기'), C('combo', 4, '한 번에 넷 휩쓸기')],
  },
  {
    key: 'boat', name: '고깃배 항구', news: '작은 배 — 큰 파도 거품으로 띄워 보내요', hint: '배는 크게 키운 파도로 둥실 밀어내요', newKind: 'boat', place: 2,
    tg: 50, hmax: 0.62, curl: 30, L: 8.9,
    build: (b) => {
      b.beach(0.8, 1.3, 'cc');
      b.boat(1.95);
      b.beach(2.3, 2.75, 'cbc');
      b.pier(3.0, 0.6);
      b.shells(3.12, 0.07, 4, 0.12, 0);
      b.boat(4.4);
      b.beach(4.75, 5.25, 'cpc');
      b.boat(5.75);
      b.jelly(6.2, 0.45);
      b.boat(7.1);
      b.beach(7.45, 8.0, 'ccbc');
    },
    stars: [C('boat', 3, '배 세 척 띄워 보내기'), C('shell', 4, '부두 밑 조개 넷 모으기')],
  },
  {
    key: 'ebb', name: '썰물 갯벌', news: '썰물 — 파도가 천천히 커져요', hint: '일찍 눌러야 파도가 다 자라요', newKind: '', place: 3,
    tg: 84, hmax: 0.56, curl: 30, L: 9.2,
    build: (b) => {
      b.beach(0.75, 1.5, 'kckk');
      b.rock(2.0, 0.2);
      b.beach(2.45, 3.1, 'kcbk');
      b.jelly(3.55, 0.5);
      b.dolphin(3.8);
      b.beach(4.5, 5.15, 'kkck');
      b.boat(5.65);
      b.rock(6.25, 0.24);
      b.beach(6.7, 7.3, 'kcpk');
      b.pier(7.45, 0.6);
      b.beach(8.3, 8.8, 'kk');
    },
    stars: [C('crab', 6, '게 여섯 휩쓸기'), C('nofall', 0, '한 번도 안 넘어지기')],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Ev { t: number; kind: string; x: number; y: number; n?: number; k?: IK; id?: number; text?: string }
interface Air { t0: number; a0: number; ts: number; Ts: number; F: number }
interface Surge { x0: number; end: number; H: number; t0: number }
interface Brk { x: number; H: number; t: number; wipe: boolean }

export interface SurfState {
  rng: Rng; seed: number; t: number; ph: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  items: Item[]; flag: Uint8Array; L: number; ii: number;
  x: number; h: number; vy: number; mode: number; ct: number; H: number; inv: number; tum: number; holdPrev: boolean;
  air: Air; board: number; freeze: number; slowT: number;
  castles: number; crabs: number; boats: number; best: number; falls: number; stings: number; dolphins: number; flip2: number; shells: number; waves: number;
  /** 콤보: 연속으로 무언가를 휩쓴 파도 수(run) → 점수 배수(chain = 1 + run, 최대 5) */
  chain: number; run: number; bestChain: number; cleans: number;
  firstPress: number; firstBig: number; firstRelease: boolean; wows: number;
  seen: Set<string>; spotted: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  events: Ev[]; sim: boolean;
  // 연출용 (시뮬레이션 결과와 무관)
  surge: Surge | null; breaks: Brk[]; goneT: Map<number, number>; mood: number; moodT: number; crashAt: number; lastWhy: string;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ev = (s: SurfState, kind: string, x: number, y: number, n?: number, k?: IK, text?: string) => {
  if (!s.sim) s.events.push({ t: s.t, kind, x, y, n, k, text });
};
function see(s: SurfState, key: string, text: string) {
  if (s.sim || !key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}

// ───────────────────────────── 물리 ─────────────────────────────
const waveH = (s: SurfState, ct: number) => {
  const d = STAGES[s.stage], u = Math.min(1, ct / d.tg);
  return d.hmax * (1 - (1 - u) * (1 - u));
};
const jumpV = (H: number) => Math.sqrt(2 * G * (0.3 * H + 0.045));
/** 떼면 파도 끝이 앞으로 쏟아져 내려앉는 곳: [가까운 끝, 먼 끝] (서퍼 기준) — 클수록 멀리 */
const lipD = (H: number) => 0.1 + 0.75 * H;
const bandLo = (H: number) => 0.55 * lipD(H);
const bandHi = (H: number) => lipD(H) + 0.06 + 0.15 * H;
const CHAIN_MAX = 8;
const airT = (h: number, vy: number) => (vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, h))) / G;
const flipsFor = (T: number) => Math.max(0, Math.min(4, Math.floor((T - 10) / 24)));
/** 꼭대기에서 버틴 정도(0~1, 1이면 곧 와이프아웃) */
const curlOf = (s: SurfState) => {
  const d = STAGES[s.stage];
  return s.mode === CHARGE ? clamp((s.ct - d.tg) / d.curl, 0, 1) : 0;
};

/** 공중 한 구간 시작: 지금 각도에서 F바퀴째(2π의 배수)로 내려앉게 */
function startAir(s: SurfState, fresh: boolean) {
  const T = airT(s.h, s.vy);
  if (fresh) s.air = { t0: s.ph, a0: 0, ts: s.ph, Ts: T, F: flipsFor(T) };
  else {
    const a = airAngle(s), total = s.ph - s.air.t0 + T;
    s.air = { t0: s.air.t0, a0: a, ts: s.ph, Ts: T, F: Math.min(Math.max(4, Math.ceil(a / (Math.PI * 2) - 1e-6)), Math.max(Math.ceil(a / (Math.PI * 2) - 1e-6), flipsFor(total))) };
  }
}
function airAngle(s: SurfState) {
  const a = s.air, u = clamp((s.ph - a.ts) / Math.max(1, a.Ts), 0, 1), e = u * u * (3 - 2 * u);
  return a.a0 + (a.F * Math.PI * 2 - a.a0) * e;
}

/** 부서진 파도가 앞에 내려앉아 그 자리를 휩쓴다 (점수는 지금, 보이는 건 거품이 닿을 때). n번째는 ×n, 콤보만큼 또 ×콤보 */
function sweep(s: SurfState, xb: number, H: number) {
  if (H < 0.1) return 0;
  const lo = xb + bandLo(H), end = xb + bandHi(H);
  let n = 0;
  const hit = new Map<number, number>();
  for (let i = s.ii; i < s.items.length; i++) {
    const it = s.items[i];
    if (x0(it) > end) break;
    const p = SWEEP[it.k];
    if (!p || s.flag[i] || it.x < lo || it.x > end) continue;
    if (it.k === 'boat' && H < 0.3) continue;
    s.flag[i] = 1;
    n++;
    if (it.g) hit.set(it.g, (hit.get(it.g) ?? 0) + 1);
    s.pts += p * n * s.chain;
    if (it.k === 'castle') s.castles++;
    else if (it.k === 'crab') s.crabs++;
    else if (it.k === 'boat') (s.boats++, see(s, 'boatsweep', ''));
    if (!s.sim) {
      const at = s.t + 10 + Math.max(0, Math.round((it.x - lo) / VS));
      s.goneT.set(it.id, at);
      s.events.push({ t: at, kind: 'sweep', x: it.x, y: 0, n, k: it.k, id: it.id, text: String(p * n * s.chain) });
    }
  }
  s.best = Math.max(s.best, n);
  // 싹쓸이: 모래톱 하나에 남은 것을 이 파도 하나로 다 휩쓸면 보너스
  if (n >= 2) {
    const left = new Set<number>();
    for (let i = s.ii; i < s.items.length; i++) {
      const it = s.items[i];
      if (x0(it) > end + 0.8) break;
      if (it.g && !s.flag[i] && hit.has(it.g)) left.add(it.g);
    }
    for (const [g, k] of hit)
      if (k >= 2 && !left.has(g)) {
        s.cleans++;
        s.pts += CLEAN_PTS * k * s.chain;
        if (!s.sim) ev(s, 'clean', xb + lipD(H), 0, k, undefined, String(CLEAN_PTS * k * s.chain));
      }
  }
  if (n >= 3) {
    s.wows++;
    if (s.firstBig < 0 && s.firstPress >= 0) s.firstBig = s.t;
    see(s, 'combo', '');
  }
  return n;
}

function release(s: SurfState) {
  const H = s.H;
  s.waves++;
  const n = sweep(s, s.x, H);
  if (H >= 0.1) (s.run = n > 0 ? s.run + 1 : 0), (s.chain = Math.min(CHAIN_MAX, 1 + s.run));
  s.bestChain = Math.max(s.bestChain, s.run);
  s.vy = jumpV(H);
  s.mode = AIR;
  startAir(s, true);
  if (!s.sim) {
    s.surge = H >= 0.1 ? { x0: s.x + bandLo(H), end: s.x + bandHi(H), H, t0: s.t } : null;
    s.breaks.push({ x: s.x, H, t: s.t, wipe: false });
    ev(s, 'break', s.x, s.h, n, undefined, String(H));
    s.mood = 1;
    s.moodT = 40;
  }
  s.H = 0;
  s.ct = 0;
  s.firstRelease = true;
}

function wipeout(s: SurfState) {
  const H = s.H;
  s.falls++;
  s.board--;
  sweep(s, s.x, H * 0.6);
  s.chain = 1;
  s.run = 0;
  s.mode = TUMBLE;
  s.tum = TUM_T + 10;
  s.inv = INV_CRASH;
  s.vy = 0.004;
  if (!s.sim) {
    s.surge = { x0: s.x + bandLo(H * 0.6), end: s.x + bandHi(H * 0.6), H: H * 0.6, t0: s.t };
    s.breaks.push({ x: s.x, H, t: s.t, wipe: true });
    s.crashAt = s.t;
    s.lastWhy = 'wipe';
  }
  ev(s, 'wipe', s.x, s.h);
  see(s, 'wipe', '');
  s.H = 0;
  s.ct = 0;
  if (s.board <= 0) endStage(s, false, '파도에 말려 보드가 부러졌어요');
}

function crash(s: SurfState, i: number, why: string) {
  s.flag[i] = 2;
  s.chain = 1;
  s.run = 0;
  s.falls++;
  s.board--;
  s.mode = TUMBLE;
  s.tum = TUM_T;
  s.inv = INV_CRASH;
  s.H = 0;
  s.ct = 0;
  s.vy = s.h > 0.02 ? 0.006 : 0.004;
  s.x -= 0.015;
  if (!s.sim) (s.crashAt = s.t), (s.lastWhy = why);
  ev(s, 'crash', s.x, s.h, 0, s.items[i].k, why);
  if (s.board <= 0) endStage(s, false, `${why} — 보드가 부러졌어요`);
}

function sting(s: SurfState) {
  s.stings++;
  s.chain = 1;
  s.run = 0;
  s.board--;
  s.inv = INV_STING;
  if (s.mode === RIDE || s.mode === TUMBLE) {
    s.mode = AIR;
    s.vy = 0.014;
    startAir(s, true);
    s.air.F = 0;
  }
  ev(s, 'sting', s.x, s.h);
  if (s.board <= 0) endStage(s, false, '해파리에 너무 쏘였어요');
}

function land(s: SurfState) {
  s.h = 0;
  s.vy = 0;
  s.mode = RIDE;
  const F = s.air.F;
  if (F > 0) s.pts += FLIP_PTS[Math.min(8, F)];
  if (F >= 2) {
    s.flip2++;
    s.wows++;
    if (s.firstBig < 0 && s.firstPress >= 0) s.firstBig = s.t;
    see(s, 'flip2', '');
  }
  ev(s, 'land', s.x, 0, F);
}

function collide(s: SurfState) {
  const its = s.items;
  while (s.ii < its.length && x1(its[s.ii]) < s.x - 0.7) s.ii++;
  for (let i = s.ii; i < its.length; i++) {
    const it = its[i];
    if (x0(it) > s.x + 0.12) break;
    if (s.flag[i]) continue;
    switch (it.k) {
      case 'rock':
        if (Math.abs(s.x - it.x) < it.w - 0.012 && s.h < it.h - 0.012 && s.inv <= 0) crash(s, i, '바위에 쾅');
        break;
      case 'boat':
        if (Math.abs(s.x - it.x) < 0.07 && s.h < BOAT_H && s.inv <= 0) crash(s, i, '배에 쿵');
        break;
      case 'pier':
        if (s.x > it.x + 0.015 && s.x < it.x + it.w - 0.015) {
          const top = it.h + DECK;
          if (s.mode === AIR && s.vy < 0 && s.h <= top && s.h - s.vy > top) {
            s.h = top;
            s.vy = Math.sqrt(2 * G * 0.1);
            s.pts += HOP_PTS;
            startAir(s, false);
            ev(s, 'hop', s.x, s.h);
          } else if (s.h + BODY > it.h && (s.h < top || s.mode === CHARGE) && s.inv <= 0) crash(s, i, '부두에 꽝');
        }
        break;
      case 'jelly':
        if (s.x > it.x && s.x < it.x + it.w && s.h < 0.05 && s.inv <= 0 && s.mode !== IDLE) sting(s);
        break;
      case 'dolphin':
        if (s.mode === AIR && s.vy < 0 && s.h < 0.13 && Math.abs(s.x - it.x) < 0.09) {
          s.flag[i] = 1;
          s.dolphins++;
          s.pts += DOLPHIN_PTS;
          s.vy = Math.sqrt(2 * G * 0.6);
          s.h = Math.max(s.h, 0.02);
          startAir(s, false);
          s.wows++;
          ev(s, 'dolphin', it.x, s.h);
          see(s, 'bounce', '');
        }
        break;
      case 'shell':
        if (Math.abs(s.x - it.x) < 0.055 && Math.abs(s.h + BODY * 0.5 - it.h) < 0.085) {
          s.flag[i] = 1;
          s.shells++;
          s.pts += SHELL_PTS;
          ev(s, 'shell', it.x, it.h);
        }
        break;
    }
    if (s.phase !== 'play') return;
  }
}

/** 손 입력 한 틱 (게임·봇 시뮬레이션 공용) — 누름 시작·뗌은 틱마다 바로 */
function input(s: SurfState, hold: boolean) {
  const press = hold && !s.holdPrev;
  s.holdPrev = hold;
  if (s.mode === IDLE) {
    if (!press) return;
    if (s.firstPress < 0) s.firstPress = s.t;
    s.mode = CHARGE;
    s.ct = 0;
    s.H = 0;
    ev(s, 'charge', s.x, 0);
    return;
  }
  if (s.mode === RIDE && hold) {
    s.mode = CHARGE;
    s.ct = 0;
    s.H = 0;
    if (s.firstPress < 0) s.firstPress = s.t;
    ev(s, 'charge', s.x, 0);
  } else if (s.mode === CHARGE && !hold) release(s);
}

/** 물리 한 틱 */
function physics(s: SurfState) {
  s.ph++;
  if (s.mode === IDLE) return;
  const d = STAGES[s.stage], play = s.phase === 'play';
  if (s.inv > 0) s.inv--;
  switch (s.mode) {
    case RIDE:
      s.x += VX;
      s.h = 0;
      break;
    case CHARGE:
      s.ct++;
      s.H = waveH(s, s.ct);
      if (s.firstRelease) s.x += VXC;
      s.h = RIDE_K * s.H;
      if (play && s.ct > d.tg + d.curl) wipeout(s);
      break;
    case AIR:
      s.x += VXA;
      s.vy -= G;
      s.h += s.vy;
      if (s.h <= 0) land(s);
      break;
    case TUMBLE:
      s.x += VXT;
      if (s.h > 0 || s.vy > 0) {
        s.vy -= G;
        s.h = Math.max(0, s.h + s.vy);
        if (s.h === 0) s.vy = 0;
      }
      if (--s.tum <= 0 && s.h <= 0) s.mode = RIDE;
      break;
  }
  if (!play) return;
  collide(s);
  if (s.phase === 'play' && s.x >= s.L) endStage(s, true, '');
}

function build(s: SurfState) {
  const d = STAGES[s.stage], r = s.rng, items: Item[] = [];
  let id = 0;
  let grp = 0;
  const add = (k: IK, x: number, w: number, h: number, v = 0) => items.push({ id: ++id, k, x, w, h, v, g: SWEEP[k] && k !== 'boat' ? grp : 0 });
  const jit = (a: number) => (r() * 2 - 1) * a;
  const b: Bld = {
    beach(a, bb, kinds, j = true) {
      // 모래톱 하나 = 가운데에 물건을 촘촘히 (한 파도로 다 휩쓸 수 있게)
      const n = kinds.length, sp = 0.115, mid = (a + bb) / 2 + (j ? jit(0.04) : 0), x0b = mid - (sp * (n - 1)) / 2;
      grp++;
      add('sand', x0b - 0.1, sp * (n - 1) + 0.2, 0, Math.floor(r() * 1000));
      for (let q = 0; q < n; q++) {
        const ch = kinds[q], k: IK = ch === 'b' ? 'ball' : ch === 'p' ? 'parasol' : ch === 'k' ? 'crab' : 'castle';
        add(k, x0b + sp * q + (j ? jit(0.008) : 0), HALF[k] ?? 0.04, 0, Math.floor(r() * 1000));
      }
    },
    rock(x, h, w = 0.06) {
      add('rock', x + jit(0.04), w + (h > 0.4 ? 0.02 : 0.01 + h * 0.08), h + jit(0.015), Math.floor(r() * 1000));
    },
    pier(x, len, hp = 0.32) {
      add('pier', x + jit(0.03), len, hp, Math.floor(r() * 1000));
    },
    jelly(x, len) {
      add('jelly', x + jit(0.03), len, 0, Math.floor(r() * 1000));
    },
    dolphin(x) {
      add('dolphin', x + jit(0.02), 0.06, 0, Math.floor(r() * 1000));
    },
    boat(x) {
      add('boat', x + jit(0.04), 0.08, BOAT_H, Math.floor(r() * 1000));
    },
    shells(x, h, n, dx, dh) {
      for (let q = 0; q < n; q++) {
        const u = n === 1 ? 0 : (2 * q) / (n - 1) - 1;
        add('shell', x + q * dx, 0.025, h + dh * (1 - u * u), Math.floor(r() * 1000));
      }
    },
  };
  d.build(b);
  items.sort((p, q) => x0(p) - x0(q) || p.id - q.id);
  s.items = items;
  s.flag = new Uint8Array(items.length);
  s.L = d.L;
  s.ii = 0;
}

function newStage(s: SurfState) {
  const d = STAGES[s.stage];
  build(s);
  s.x = 0;
  s.h = 0;
  s.vy = 0;
  s.mode = s.stage === 0 && s.firstPress < 0 ? IDLE : RIDE;
  s.ct = 0;
  s.H = 0;
  s.inv = 0;
  s.tum = 0;
  s.board = BOARD;
  s.freeze = 0;
  s.slowT = 0;
  s.castles = s.crabs = s.boats = s.best = s.falls = s.stings = s.dolphins = s.flip2 = s.shells = s.waves = s.bestChain = s.cleans = 0;
  s.chain = 1;
  s.run = 0;
  s.air = { t0: 0, a0: 0, ts: 0, Ts: 1, F: 0 };
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.surge = null;
  s.breaks = [];
  s.goneT = new Map();
  s.spot = null;
  s.seen.add(d.key);
  if (d.newKind) s.spotted.delete(d.newKind);
}

function starMet(s: SurfState, q: Star) {
  switch (q.k) {
    case 'castle': return s.castles >= q.n;
    case 'combo': return s.best >= q.n;
    case 'nofall': return s.falls === 0;
    case 'shell': return s.shells >= q.n;
    case 'dolphin': return s.dolphins >= q.n;
    case 'nosting': return s.stings === 0;
    case 'boat': return s.boats >= q.n;
    case 'crab': return s.crabs >= q.n;
    case 'flip2': return s.flip2 >= q.n;
    case 'chain': return s.bestChain >= q.n;
  }
}
function starVal(s: SurfState, q: Star) {
  switch (q.k) {
    case 'castle': return s.castles;
    case 'combo': return s.best;
    case 'shell': return s.shells;
    case 'dolphin': return s.dolphins;
    case 'boat': return s.boats;
    case 'crab': return s.crabs;
    case 'flip2': return s.flip2;
    case 'chain': return s.bestChain;
    default: return -1;
  }
}

function endStage(s: SurfState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.ok = ok;
  if (s.sim) return;
  s.pt = 0;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, ...d.stars.map((q) => starMet(s, q))];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS * (s.stage + 1) + s.board * 20;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 2;
    s.moodT = 999;
    ev(s, 'clear', s.x, 0);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'fail', s.x, 0, 0, undefined, why);
  }
}

function cosmetic(s: SurfState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  // 큰 순간: 거품이 셋째를 휩쓰는 그 틱에 멈칫 + 잠깐 느리게
  for (const e of s.events) if (e.t === s.t && e.kind === 'sweep' && (e.n ?? 0) >= 3 && s.phase === 'play') (s.freeze = Math.max(s.freeze, e.n! >= 5 ? 4 : 3)), (s.slowT = Math.max(s.slowT, 22));
  s.events = s.events.filter((e) => s.t - e.t < 100);
  s.breaks = s.breaks.filter((b) => s.t - b.t < 90);
  if (s.surge && s.t - s.surge.t0 > 10 + (s.surge.end - s.surge.x0) / VS + 30) s.surge = null;
  if (s.spot && s.t - s.spot.t > 120) s.spot = null;
  const d = STAGES[s.stage];
  if (d.newKind && !s.spotted.has(d.newKind) && s.phase === 'play') {
    const it = s.items.find((q) => q.k === d.newKind);
    if (it && x0(it) - s.x < 0.66) {
      s.spotted.add(d.newKind);
      s.spot = { id: it.id, t: s.t, label: KIND_NAME[d.newKind] ?? '' };
    }
  }
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

function blank(seed: number): SurfState {
  return {
    rng: mulberry32(seed), seed, t: 0, ph: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
    hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, won: false, dead: false, again: false, tries: 0,
    items: [], flag: new Uint8Array(0), L: 1, ii: 0,
    x: 0, h: 0, vy: 0, mode: IDLE, ct: 0, H: 0, inv: 0, tum: 0, holdPrev: false,
    air: { t0: 0, a0: 0, ts: 0, Ts: 1, F: 0 }, board: BOARD, freeze: 0, slowT: 0,
    castles: 0, crabs: 0, boats: 0, best: 0, falls: 0, stings: 0, dolphins: 0, flip2: 0, shells: 0, waves: 0, chain: 1, run: 0, bestChain: 0, cleans: 0,
    firstPress: -1, firstBig: -1, firstRelease: false, wows: 0,
    seen: new Set<string>(), spotted: new Set<string>(), newsQ: [], news: null, spot: null, events: [], sim: false,
    surge: null, breaks: [], goneT: new Map(), mood: 0, moodT: 0, crashAt: -999, lastWhy: '',
  };
}

export const wavesurf: GameDef<SurfState> & { wows: (s: SurfState) => number } = {
  id: 'wavesurf',
  name: '파도 만들기 꼬마 서퍼',
  genes: ['wavemake', 'hold', 'combo'],
  twist: '파도를 기다려 타는 게 아니라 내가 만든다 — 꾹 누르는 만큼 바다가 솟고, 떼는 순간 그 파도가 부서지며 서퍼는 하늘로 솟고 해변의 모래성·파라솔·배까지 한꺼번에 휩쓸린다',
  rules: [
    '꾹 누르면 뒤에서 파도가 솟아요. 떼면 쏴아 — 서퍼가 하늘로 솟고 거품이 앞의 모래성을 휩쓸어요.',
    '크게 키울수록 높이·멀리 뛰지만, 꼭대기에서 너무 버티면 파도에 말려 넘어져요.',
    '바위·부두·배에 부딪히거나 해파리에 쏘이면 보드에 금! 보드가 부러지면 하트 -1.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 파도가 솟고, 떼면 쏴아! / 스페이스 꾹',
  aspect: A,
  art: {
    concept: '쨍한 열대 한낮 바다의 꼬마 서퍼 — 내가 만든 파도로 해변을 휩쓰는 여름 그림책',
    mood: '청록에서 짙은 파랑으로 깊어지는 바다, 하얀 모래와 야자수, 뭉게구름과 갈매기. 꾹 누르면 바다가 화면 절반만큼 솟고, 떼면 하얀 거품이 쏴아 밀려가 모래성과 파라솔이 와르르 날아간다.',
    palette: { bg: '#7fd6f5', ink: '#173a5e', muted: '#5f86a8', accent: '#18b6d6', hot: '#ff6b4a', soft: '#fff3d6' },
  },
  guard: (s) => s.board,
  wows: (s) => s.wows,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = blank(seed);
    newStage(s);
    s.starOk = [false];
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const hold = !!inp.hold;
    if (s.phase === 'play') {
      input(s, hold);
      if (s.freeze > 0) s.freeze--;
      else if (s.slowT > 0) (s.slowT--, s.t % 2 === 0 && physics(s));
      else physics(s);
      s.pt++;
    } else {
      s.holdPrev = hold;
      s.pt++;
      physics(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
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
const NO: Input = { tap: false, dir: 0, hold: false };
const HOLD: Input = { tap: false, dir: 0, hold: true };

function simClone(s: SurfState): SurfState {
  return { ...s, flag: s.flag.slice(), air: { ...s.air }, sim: true, events: [], breaks: [], surge: null };
}
/** wait틱 그냥 타다가 hold틱 꾹, 떼고 내려앉을 때까지 (cap틱 상한) */
function runPlan(c: SurfState, wait: number, hold: number, cap: number) {
  for (let i = 0; i < cap && c.phase === 'play'; i++) {
    input(c, i >= wait && i < wait + hold);
    physics(c);
    if (hold > 0 && i > wait + hold + 1 && c.mode === RIDE) break;
  }
}
function value(s: SurfState, c: SurfState) {
  let v = c.pts - s.pts - 1000 * (c.falls - s.falls) - 450 * (c.stings - s.stings);
  if (c.board <= 0) v -= 8000;
  if (c.phase === 'result' && c.ok) v += 500;
  for (const q of STAGES[s.stage].stars) {
    if (q.k === 'nofall') {
      if (s.falls === 0) v -= 1500 * (c.falls - s.falls);
      continue;
    }
    if (q.k === 'nosting') {
      if (s.stings === 0) v -= 1500 * (c.stings - s.stings);
      continue;
    }
    if (starMet(s, q)) continue;
    if (q.k === 'combo' || q.k === 'chain') v += starVal(c, q) >= q.n ? STAR_PTS * 1.3 : 0;
    else v += ((Math.min(q.n, starVal(c, q)) - Math.min(q.n, starVal(s, q))) * STAR_PTS * 1.4) / q.n;
  }
  // 이어 가는 콤보는 다음 파도의 값이다
  v += (c.chain - 1) * 35;
  return v + 40 * (c.x - s.x);
}
interface Plan { wait: number; hold: number; v: number; c: SurfState }
function holdsFor(s: SurfState, fr: number[]) {
  const d = STAGES[s.stage];
  return [...new Set(fr.map((f) => Math.max(3, Math.round((f * d.tg) / 3) * 3)))].filter((hd) => hd < d.tg + d.curl - 3);
}
const WAITS = [0, 6, 12, 21, 30, 42, 57, 75];
const HOLD_FR = [0.06, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.7, 0.8, 0.9, 1.0, 1.15, 1.3];
const WAITS2 = [0, 12, 30, 54];
const HOLD_FR2 = [0.08, 0.24, 0.42, 0.6, 0.8, 1.0];
function plans(s: SurfState, waits0: number[], fr: number[], q = 3): Plan[] {
  const list: Plan[] = [];
  const holds = [...new Set(holdsFor(s, fr).map((hd) => Math.max(q, Math.round(hd / q) * q)))];
  const waits = [...new Set(waits0.map((wt) => Math.round(wt / q) * q))];
  for (const wait of waits) {
    if (s.mode === IDLE && wait > 0) continue;
    for (const hold of holds) {
      const c = simClone(s);
      runPlan(c, wait, hold, wait + hold + 170);
      list.push({ wait, hold, v: value(s, c), c });
    }
  }
  if (s.mode !== IDLE) {
    const c = simClone(s);
    runPlan(c, 15, 0, 15);
    list.push({ wait: 15, hold: 0, v: value(s, c) - 5, c });
  }
  return list;
}
/** 두 수 앞: 이 파도 다음에 둘 수 있는 가장 좋은 파도까지 더해 고른다 */
function choose(s: SurfState, q: number): Plan {
  const list = plans(s, WAITS, HOLD_FR, q).sort((a, b) => b.v - a.v);
  let best = list[0], bv = -Infinity;
  for (const p of list.slice(0, 8)) {
    let v2 = 0;
    if (p.c.phase === 'play' && (p.c.mode === RIDE || p.c.mode === IDLE)) {
      const nx = plans(p.c, WAITS2, HOLD_FR2, q);
      v2 = Math.max(...nx.map((q) => q.v));
    }
    const tot = p.v + 0.8 * v2;
    if (tot > bv) (bv = tot), (best = p);
  }
  return best;
}

const smartMem = new WeakMap<object, { plan: Plan | null; at: number; key: string; last: number; q: number }>();
export const wavesurfSmart: Bot<SurfState> = {
  name: '내다보고 파도 만들기',
  act(s) {
    let m = smartMem.get(s);
    if (!m) smartMem.set(s, (m = { plan: null, at: 0, key: '', last: -1, q: 3 }));
    // 판단 간격(사람 속도로 재면 0.3초)에 맞춰 계획한다
    if (m.last >= 0 && s.t > m.last) m.q = Math.max(3, Math.min(30, s.t - m.last));
    m.last = s.t;
    if (s.phase !== 'play') return (m.plan = null), NO;
    const key = `${s.stage}:${s.tries}`;
    if (m.key !== key) (m.key = key), (m.plan = null);
    if (m.plan) {
      const e = s.ph - m.at;
      if (e < m.plan.wait) return NO;
      if (m.plan.hold > 0 && e < m.plan.wait + m.plan.hold) return HOLD;
      if (s.mode !== RIDE && s.mode !== IDLE) return NO;
      m.plan = null;
    }
    if (s.mode !== RIDE && s.mode !== IDLE) return NO;
    m.plan = choose(s, m.q);
    m.at = s.ph;
    return m.plan.wait === 0 && m.plan.hold > 0 ? HOLD : NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; on: boolean }>();
export const wavesurfRandom: Bot<SurfState> = {
  name: '아무 때나 꾹',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: 0, on: false }));
    if (s.t >= m.next) {
      m.on = !m.on;
      m.next = s.t + (m.on ? 3 + Math.floor(rng() * 75) : 20 + Math.floor(rng() * 90));
    }
    return m.on ? HOLD : NO;
  },
};

/** 버릇 1: 늘 같은 크기(27틱)로 키웠다 부수기 */
export const wavesurfHabit: Bot<SurfState> = {
  name: '늘 같은 크기로 키웠다 부수기',
  act(s) {
    if (s.phase !== 'play') return NO;
    if (s.mode === RIDE || s.mode === IDLE) return HOLD;
    if (s.mode === CHARGE) return s.ct < 27 ? HOLD : NO;
    return NO;
  },
};

/** 버릇 2: 앞에 무언가(장애물·해변 물건)가 가까이(0.35) 오면 늘 꼭대기까지 키워서 부수기 */
export const wavesurfHabit2: Bot<SurfState> = {
  name: '가까이 오면 늘 최대로',
  act(s) {
    if (s.phase !== 'play') return NO;
    const d = STAGES[s.stage];
    if (s.mode === CHARGE) return s.ct < d.tg ? HOLD : NO;
    if (s.mode === IDLE) return HOLD;
    if (s.mode !== RIDE) return NO;
    for (let i = s.ii; i < s.items.length; i++) {
      const it = s.items[i];
      if (x0(it) > s.x + 0.35) break;
      if (s.flag[i] || it.k === 'sand' || it.k === 'shell' || x1(it) < s.x) continue;
      return HOLD;
    }
    return NO;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
/** 굵은 팔다리: 윤곽 → 살색 */
function limb(ctx: C2, pts: number[][], wd: number, col: string) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [c, lw] of [[OUT, wd + 2.6], [col, wd]] as [string, number][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}
const OUT = '#1d3557';
const SKIN: [string, string] = ['#ffd9b0', '#f2a978'];

// ── 배경 층 (한 번 그려 두고 시차로 흘린다) ──
const HZ = 0.62, FAR_W = 1.7, SHORE_W = 2.3, FORE_W = 1.6, SHORE_Y = 0.34, FORE_Y = 1.2, BGY = 0.05;
interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; shore: HTMLCanvasElement; fore: HTMLCanvasElement; sc: number }
const BG = new Map<string, Bg>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function palm(g: C2, x: number, base: number, ht: number, lean: number, seed: number, k = 1) {
  const tx = x + lean * ht, ty = base - ht;
  // 줄기 (휘어진 마디)
  g.lineCap = 'round';
  g.strokeStyle = '#6b4220';
  g.lineWidth = 7 * k + 2;
  g.beginPath();
  g.moveTo(x, base);
  g.quadraticCurveTo(x + lean * ht * 0.2, base - ht * 0.6, tx, ty);
  g.stroke();
  g.strokeStyle = '#b97a3f';
  g.lineWidth = 7 * k;
  g.stroke();
  g.strokeStyle = 'rgba(255,220,160,.55)';
  g.lineWidth = 2 * k;
  g.stroke();
  g.strokeStyle = 'rgba(90,50,20,.45)';
  g.lineWidth = 1.2;
  for (let i = 1; i < 9; i++) {
    const u = i / 9, px = x + (lean * ht * 0.2 * 2 * u * (1 - u)) + (tx - x) * u * u, py = base + (ty - base) * (u * (2 - u) * 0.4 + u * 0.6);
    g.beginPath();
    g.moveTo(px - 3.5 * k, py);
    g.lineTo(px + 3.5 * k, py - 1);
    g.stroke();
  }
  // 잎
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.52 + (hsh(seed + i) - 0.5) * 0.25, L = ht * (0.42 + hsh(seed * 3 + i) * 0.14);
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + L * 0.42;
    const cx = tx + Math.cos(a) * L * 0.55, cy = ty + Math.sin(a) * L * 0.6 - L * 0.12;
    const nx = -Math.sin(a), ny = Math.cos(a);
    g.fillStyle = i % 2 ? '#2fae57' : '#22964a';
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(cx + nx * 7 * k, cy + ny * 7 * k, ex, ey);
    g.quadraticCurveTo(cx - nx * 5 * k, cy - ny * 5 * k, tx, ty);
    g.fill();
    g.strokeStyle = '#13703a';
    g.lineWidth = 1.2;
    g.stroke();
    g.strokeStyle = 'rgba(200,255,170,.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(cx, cy, ex, ey);
    g.stroke();
  }
  g.fillStyle = '#7a4a1e';
  for (let i = 0; i < 3; i++) {
    ell(g, tx - 4 * k + i * 4 * k, ty + 5 * k, 3.4 * k, 3.4 * k);
    g.fill();
  }
}
function parasolBg(g: C2, x: number, base: number, r: number, c1: string) {
  g.strokeStyle = '#8a6a4a';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, base);
  g.lineTo(x + r * 0.15, base - r * 1.9);
  g.stroke();
  const cx = x + r * 0.15, cy = base - r * 1.9;
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : c1;
    g.beginPath();
    g.moveTo(cx, cy - r * 0.45);
    g.lineTo(cx - r + (i * 2 * r) / 6, cy + r * 0.2);
    g.lineTo(cx - r + ((i + 1) * 2 * r) / 6, cy + r * 0.2);
    g.closePath();
    g.fill();
  }
  g.strokeStyle = 'rgba(29,53,87,.5)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - r, cy + r * 0.2);
  g.lineTo(cx, cy - r * 0.45);
  g.lineTo(cx + r, cy + r * 0.2);
  g.stroke();
}
/** 장소별 하늘: 0 한낮 · 1 맑은 오전 · 2 항구 한낮 · 3 늦은 오후(금빛) — 모두 밝게 */
const SKY: [string[], number, number, string][] = [
  [['#2b9be6', '#4fbaf2', '#94dcf8', '#c9f1ff', '#e2fbff'], 0.8, 0.19, '255,250,205'],
  [['#2aa7ec', '#58c8f5', '#a2e6f8', '#d6f8ff', '#ecfdff'], 0.2, 0.17, '255,252,215'],
  [['#3093e0', '#5ab6ef', '#9fd6f5', '#d2efff', '#eef9ff'], 0.68, 0.15, '255,248,200'],
  [['#3a8fd8', '#6fb2e8', '#f0d2a2', '#ffd99e', '#ffe9c4'], 0.74, 0.33, '255,226,160'],
];
function getBg(w: number, h: number, sc: number, place: number): Bg {
  const key = `${w}x${h}@${sc}:${place}`;
  const got = BG.get(key);
  if (got) return got;
  const R = (r: number) => r * w;
  const [sk, sunX, sunY, glow] = SKY[place] ?? SKY[0];
  const sky = layer(w, R(0.86), sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, R(0.86), [0, sk[0]], [0.35, sk[1]], [0.68, sk[2]], [0.8, sk[3]], [1, sk[4]]);
    g.fillRect(0, 0, w, R(0.86));
    g.fillStyle = radg(g, R(sunX), R(sunY), 0, R(place === 3 ? 0.55 : 0.42), [0, 'rgba(255,255,236,1)'], [0.1, `rgba(${glow},.95)`], [0.3, `rgba(${glow},.38)`], [1, `rgba(${glow},0)`]);
    g.fillRect(0, 0, w, R(0.86));
    g.fillStyle = place === 3 ? '#fff4d0' : '#fffcea';
    ell(g, R(sunX), R(sunY), R(place === 3 ? 0.065 : 0.05), R(place === 3 ? 0.065 : 0.05));
    g.fill();
  });
  const far = layer(R(FAR_W), R(0.24), sc, (g) => {
    const base = R(HZ - 0.42);
    const isl = [[0.15, 0.36, 0.07], [0.62, 0.28, 0.05], [1.15, 0.46, 0.1], [1.48, 0.2, 0.045]];
    for (const dx of [-FAR_W, 0, FAR_W])
      for (const [ix, iw, ih] of isl) {
        const x = R(ix + dx), ww = R(iw), hh = R(ih);
        g.fillStyle = lin(g, 0, base - hh, 0, base, [0, '#7fcbd6'], [1, '#9edbe2']);
        g.beginPath();
        g.moveTo(x - ww / 2, base);
        g.bezierCurveTo(x - ww * 0.3, base - hh * 0.9, x - ww * 0.1, base - hh * 1.15, x + ww * 0.05, base - hh);
        g.bezierCurveTo(x + ww * 0.25, base - hh * 0.85, x + ww * 0.35, base - hh * 0.3, x + ww / 2, base);
        g.fill();
        for (let j = 0; j < 3; j++) {
          const px = x - ww * 0.15 + j * ww * 0.12, py = base - hh * (0.95 - Math.abs(j - 1) * 0.1);
          g.strokeStyle = '#6cb8c4';
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px + 2, py - R(0.03));
          g.stroke();
          g.fillStyle = '#6cb8c4';
          for (let q = 0; q < 4; q++) {
            ell(g, px + 2 + Math.cos(q * 1.6) * 5, py - R(0.03) + 1, 5, 1.6, q * 1.6);
            g.fill();
          }
        }
      }
    // 먼 돛단배
    for (const [bx, bs] of [[0.4, 1], [1.3, 0.8]])
      for (const dx of [-FAR_W, 0, FAR_W]) {
        const x = R(bx + dx), y = base - 1;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.moveTo(x, y - R(0.045) * bs);
        g.lineTo(x + R(0.022) * bs, y - 2);
        g.lineTo(x, y - 2);
        g.fill();
        g.fillStyle = '#e8574a';
        g.fillRect(x - R(0.012) * bs, y - 2, R(0.03) * bs, 2.5);
      }
  });
  const shore = layer(R(SHORE_W), R(0.47), sc, (g) => {
    const Ly = (y: number) => R(y - SHORE_Y);
    const W = R(SHORE_W);
    // 모래 띠 (썰물엔 넓은 갯벌)
    g.fillStyle = place === 3 ? lin(g, 0, Ly(0.66), 0, Ly(0.79), [0, '#fff0d0'], [0.4, '#f6d9a0'], [1, '#d9b072']) : lin(g, 0, Ly(0.66), 0, Ly(0.79), [0, '#fff6dc'], [0.55, '#ffe6b0'], [1, '#f0cc86']);
    g.beginPath();
    g.moveTo(0, Ly(0.79));
    for (let i = 0; i <= 46; i++) {
      const u = i / 46, x = u * W;
      g.lineTo(x, Ly(0.672 + 0.008 * Math.sin(u * TAU * 3) + 0.005 * Math.sin(u * TAU * 7)));
    }
    g.lineTo(W, Ly(0.79));
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(214,170,100,.35)';
    for (let i = 0; i < 90; i++) {
      ell(g, hsh(i * 3.1) * W, Ly(0.69 + hsh(i * 7.7) * 0.08), 1.2, 0.8);
      g.fill();
    }
    // 젖은 모래 · 거품 줄
    g.fillStyle = 'rgba(214,170,96,.55)';
    g.fillRect(0, Ly(place === 3 ? 0.735 : 0.765), W, R(place === 3 ? 0.05 : 0.02));
    const thing = (x: number, fn: (xx: number) => void) => {
      for (const dx of [-SHORE_W, 0, SHORE_W]) fn(R(x + dx));
    };
    if (place === 3) {
      // 갯벌 웅덩이 · 얹힌 나룻배
      for (let i = 0; i < 9; i++)
        thing(hsh(i * 4.1) * SHORE_W, (x) => {
          g.fillStyle = 'rgba(90,190,230,.75)';
          ell(g, x, Ly(0.75 + hsh(i * 2.3) * 0.025), R(0.03 + hsh(i) * 0.03), R(0.006));
          g.fill();
          g.fillStyle = 'rgba(255,255,255,.6)';
          ell(g, x - R(0.01), Ly(0.748 + hsh(i * 2.3) * 0.025), R(0.01), R(0.002));
          g.fill();
        });
      thing(0.8, (x) => {
        const b = Ly(0.73);
        g.fillStyle = '#c0603a';
        g.beginPath();
        g.moveTo(x - R(0.06), b - R(0.018));
        g.lineTo(x + R(0.06), b - R(0.024));
        g.quadraticCurveTo(x + R(0.05), b + R(0.004), x + R(0.02), b + R(0.004));
        g.lineTo(x - R(0.04), b + R(0.004));
        g.closePath();
        g.fill();
        g.fillStyle = '#ffffff';
        g.fillRect(x - R(0.058), b - R(0.02), R(0.115), R(0.004));
      });
    }
    if (place === 1)
      // 알록달록 해변 오두막 줄
      for (const [hx, col] of [[0.36, '#7fe0c0'], [0.46, '#ffb3c8'], [0.56, '#ffe07a'], [1.5, '#9fd3ff'], [1.6, '#ffb38a']] as [number, string][])
        thing(hx, (x) => {
          const b = Ly(0.71), ww = R(0.075), hh = R(0.06);
          g.fillStyle = '#8a6a4a';
          g.fillRect(x - ww * 0.4, b - R(0.01), 2, R(0.012));
          g.fillRect(x + ww * 0.4 - 2, b - R(0.01), 2, R(0.012));
          g.fillStyle = col;
          g.fillRect(x - ww / 2, b - hh - R(0.01), ww, hh);
          g.fillStyle = 'rgba(255,255,255,.55)';
          for (let k = 0; k < 4; k++) g.fillRect(x - ww / 2 + (k * ww) / 4, b - hh - R(0.01), 1.5, hh);
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.moveTo(x - ww * 0.62, b - hh - R(0.01));
          g.lineTo(x, b - hh - R(0.045));
          g.lineTo(x + ww * 0.62, b - hh - R(0.01));
          g.closePath();
          g.fill();
          g.strokeStyle = 'rgba(29,53,87,.4)';
          g.lineWidth = 1;
          g.stroke();
          g.fillStyle = '#5a3a1c';
          rr(g, x - R(0.01), b - R(0.045), R(0.02), R(0.035), 2);
          g.fill();
        });
    if (place === 2) {
      // 항구 마을: 언덕 위 하얀 집 · 방파제 · 매어 둔 배
      g.fillStyle = lin(g, 0, Ly(0.55), 0, Ly(0.69), [0, '#7fcf7a'], [1, '#5fb862']);
      g.beginPath();
      g.moveTo(0, Ly(0.69));
      for (let i = 0; i <= 30; i++) g.lineTo((i / 30) * W, Ly(0.6 - 0.04 * Math.sin((i / 30) * TAU * 2) - 0.02 * Math.sin((i / 30) * TAU * 5)));
      g.lineTo(W, Ly(0.69));
      g.closePath();
      g.fill();
      for (let i = 0; i < 14; i++)
        thing(0.08 + i * 0.16 + hsh(i) * 0.05, (x) => {
          const b = Ly(0.665 - hsh(i * 3) * 0.04), ww = R(0.045 + hsh(i * 5) * 0.02), hh = R(0.035 + hsh(i * 7) * 0.015);
          g.fillStyle = '#ffffff';
          g.fillRect(x - ww / 2, b - hh, ww, hh);
          g.fillStyle = ['#2f7cf6', '#ef4b45', '#ffb12e', '#3fc0c0'][i % 4];
          g.beginPath();
          g.moveTo(x - ww * 0.6, b - hh);
          g.lineTo(x, b - hh - R(0.02));
          g.lineTo(x + ww * 0.6, b - hh);
          g.closePath();
          g.fill();
          g.fillStyle = '#5f86a8';
          g.fillRect(x - ww * 0.25, b - hh * 0.6, ww * 0.18, hh * 0.3);
          g.fillRect(x + ww * 0.1, b - hh * 0.6, ww * 0.18, hh * 0.3);
        });
      for (const bx of [0.3, 0.95, 1.7])
        thing(bx, (x) => {
          const b = Ly(0.785);
          g.strokeStyle = '#6a4a2a';
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(x, b - R(0.012));
          g.lineTo(x, b - R(0.09));
          g.stroke();
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.moveTo(x + 1, b - R(0.085));
          g.lineTo(x + R(0.035), b - R(0.02));
          g.lineTo(x + 1, b - R(0.02));
          g.fill();
          g.fillStyle = bx > 1 ? '#2f7cf6' : '#ef4b45';
          g.beginPath();
          g.moveTo(x - R(0.04), b - R(0.016));
          g.lineTo(x + R(0.045), b - R(0.016));
          g.lineTo(x + R(0.03), b);
          g.lineTo(x - R(0.03), b);
          g.closePath();
          g.fill();
        });
    }
    if (place === 0 || place === 1) thing(0.42 + (place === 1 ? 0.8 : 0), (x) => {
      const b = Ly(0.705), ww = R(0.12), hh = R(0.06);
      g.fillStyle = '#d9945a';
      g.fillRect(x - ww / 2, b - hh, ww, hh);
      g.fillStyle = '#6a3d1c';
      rr(g, x - R(0.012), b - R(0.04), R(0.024), R(0.04), 3);
      g.fill();
      g.fillStyle = lin(g, 0, b - hh - R(0.06), 0, b - hh + 4, [0, '#ffd27a'], [1, '#e2a64a']);
      g.beginPath();
      g.moveTo(x - ww * 0.65, b - hh + 4);
      g.lineTo(x, b - hh - R(0.06));
      g.lineTo(x + ww * 0.65, b - hh + 4);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(150,95,30,.6)';
      g.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.moveTo(x, b - hh - R(0.06));
        g.lineTo(x - ww * 0.65 + (i * ww * 1.3) / 7, b - hh + 4);
        g.stroke();
      }
    });
    if (place !== 2) thing(1.55 - (place === 1 ? 0.6 : 0), (x) => {
      // 망루 (빨강·하양)
      const b = Ly(0.715);
      g.strokeStyle = '#f4f4f4';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x - R(0.03), b);
      g.lineTo(x - R(0.015), b - R(0.07));
      g.moveTo(x + R(0.03), b);
      g.lineTo(x + R(0.015), b - R(0.07));
      g.stroke();
      g.fillStyle = '#ef4e45';
      g.fillRect(x - R(0.03), b - R(0.1), R(0.06), R(0.035));
      g.fillStyle = '#ffffff';
      g.fillRect(x - R(0.03), b - R(0.088), R(0.06), R(0.008));
      g.fillStyle = '#ffd34a';
      g.beginPath();
      g.moveTo(x - R(0.04), b - R(0.1));
      g.lineTo(x, b - R(0.125));
      g.lineTo(x + R(0.04), b - R(0.1));
      g.fill();
    });
    thing(0.75, (x) => parasolBg(g, x, Ly(0.735), R(0.035), '#ff5a5a'));
    thing(1.05, (x) => parasolBg(g, x, Ly(0.74), R(0.032), '#2f9cf6'));
    thing(1.88, (x) => parasolBg(g, x, Ly(0.738), R(0.034), '#ffb12e'));
    thing(1.12, (x) => {
      g.fillStyle = '#ff7a8a';
      g.fillRect(x, Ly(0.752), R(0.05), R(0.012));
      g.fillStyle = '#ffffff';
      g.fillRect(x + R(0.012), Ly(0.752), R(0.008), R(0.012));
      g.fillRect(x + R(0.03), Ly(0.752), R(0.008), R(0.012));
    });
    const palms = [[0.1, 0.24, 0.12, 1], [0.23, 0.2, -0.1, 2], [0.62, 0.27, 0.1, 3], [0.9, 0.21, -0.14, 4], [1.3, 0.25, 0.08, 5], [1.42, 0.19, -0.12, 6], [1.75, 0.26, 0.12, 7], [2.08, 0.22, -0.1, 8]];
    for (const [px, ph, pl, sd] of place === 2 || place === 3 ? palms.filter((_, i) => i % 2 === 0) : palms)
      thing(px + place * 0.07, (x) => palm(g, x, Ly(0.715 + hsh(sd) * 0.02), R(ph), pl, sd * 13 + place, w / 360));
  });
  const fore = layer(R(FORE_W), R(0.31), sc, (g) => {
    const Ly = (y: number) => R(y - FORE_Y);
    const W = R(FORE_W);
    g.fillStyle = lin(g, 0, Ly(1.23), 0, Ly(1.5), [0, '#f5d596'], [0.25, '#ffe5ae'], [1, '#ffd892']);
    g.fillRect(0, Ly(1.23), W, R(0.3));
    g.fillStyle = 'rgba(200,150,80,.32)';
    for (let i = 0; i < 160; i++) {
      ell(g, hsh(i * 2.3) * W, Ly(1.25 + hsh(i * 5.1) * 0.25), 1.4, 1);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.45)';
    for (let i = 0; i < 50; i++) {
      ell(g, hsh(i * 9.3) * W, Ly(1.26 + hsh(i * 4.4) * 0.23), 1, 0.8);
      g.fill();
    }
    // 불가사리 · 조개 껍데기 장식
    for (const [sx, sy, sd] of [[0.3, 1.36, 1], [0.95, 1.33, 2], [1.35, 1.38, 3]]) {
      const x = R(sx), y = Ly(sy), r = R(0.022);
      g.fillStyle = sd === 2 ? '#ff9a5a' : '#ff6f61';
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5 + sd, q = k % 2 ? r * 0.45 : r;
        if (k) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.7);
        else g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.7);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(150,60,40,.6)';
      g.lineWidth = 1;
      g.stroke();
    }
  });
  const bg = { sky, far, shore, fore, sc };
  BG.set(key, bg);
  return bg;
}
/** 타일 층을 x 오프셋으로 이어 붙여 그린다 */
function tile(ctx: C2, img: HTMLCanvasElement, sc: number, off: number, y: number, w: number) {
  const tw = img.width / sc, th = img.height / sc;
  let x = -(((off % tw) + tw) % tw);
  for (; x < w; x += tw) ctx.drawImage(img, x, y, tw, th);
}

// ── 꼬마 서퍼 ──
type Face = 'grin' | 'yawn' | 'focus' | 'panic' | 'whee' | 'dizzy' | 'ouch';
type Arms = 'bal' | 'up' | 'tuck' | 'flail' | 'yeah';
interface SPose { crouch: number; arms: Arms; face: Face; glassesUp: boolean; board: boolean; lean: number }
function drawBoard(ctx: C2, x: number, y: number, U: number, ang: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(-0.56 * U, -0.035 * U);
  ctx.quadraticCurveTo(0.1 * U, -0.08 * U, 0.48 * U, -0.072 * U);
  ctx.quadraticCurveTo(0.66 * U, -0.07 * U, 0.62 * U, -0.03 * U);
  ctx.quadraticCurveTo(0.1 * U, 0.012 * U, -0.52 * U, 0.004 * U);
  ctx.quadraticCurveTo(-0.6 * U, -0.012 * U, -0.56 * U, -0.035 * U);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -0.08 * U, 0, 0.01 * U, [0, '#fff27e'], [0.45, '#ffcf3e'], [1, '#f5961f']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.strokeStyle = '#ff5a4a';
  ctx.lineWidth = Math.max(1.5, 0.022 * U);
  ctx.beginPath();
  ctx.moveTo(-0.5 * U, -0.022 * U);
  ctx.quadraticCurveTo(0.1 * U, -0.05 * U, 0.55 * U, -0.045 * U);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-0.45 * U, -0.042 * U);
  ctx.quadraticCurveTo(0.1 * U, -0.072 * U, 0.46 * U, -0.064 * U);
  ctx.stroke();
  // 지느러미
  ctx.fillStyle = '#2a6fd0';
  ctx.beginPath();
  ctx.moveTo(-0.45 * U, 0.0);
  ctx.lineTo(-0.38 * U, 0.075 * U);
  ctx.lineTo(-0.33 * U, 0.004 * U);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}
function drawKid(ctx: C2, U: number, p: SPose, t: number) {
  const c = p.crouch, ln = p.lean * U;
  const hipY = -(0.43 - 0.15 * c) * U, hipX = -0.02 * U + ln * 0.3;
  const shY = hipY - (0.22 - 0.03 * c) * U, shX = hipX + 0.05 * U + ln * 0.7;
  const hd = { x: shX + 0.04 * U + ln * 0.2, y: shY - 0.19 * U, r: 0.175 * U };
  const tuck = p.arms === 'tuck';
  // 다리
  const fB = tuck ? [-0.16 * U, -0.07 * U] : [-0.2 * U, -0.065 * U], fF = tuck ? [0.14 * U, -0.075 * U] : [0.16 * U, -0.075 * U];
  const kB = [-0.12 * U + 0.1 * c * U, -(0.25 - 0.06 * c) * U], kF = [0.1 * U + 0.12 * c * U, -(0.26 - 0.05 * c) * U];
  const flail = p.arms === 'flail';
  if (flail) {
    fB[0] = -0.24 * U + Math.sin(t * 0.5) * 0.06 * U;
    fF[0] = 0.22 * U + Math.cos(t * 0.5) * 0.06 * U;
    fB[1] = -0.02 * U;
    fF[1] = -0.04 * U;
  }
  limb(ctx, [fB, kB, [hipX - 0.04 * U, hipY]], 0.08 * U, SKIN[0]);
  limb(ctx, [fF, kF, [hipX + 0.05 * U, hipY]], 0.08 * U, SKIN[0]);
  for (const f of [fB, fF]) {
    ctx.fillStyle = SKIN[0];
    ell(ctx, f[0] + 0.02 * U, f[1] + 0.005 * U, 0.055 * U, 0.028 * U);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  // 반바지
  ctx.fillStyle = lin(ctx, 0, hipY - 0.05 * U, 0, hipY + 0.1 * U, [0, '#4f97ff'], [1, '#2361d8']);
  ctx.beginPath();
  ctx.moveTo(hipX - 0.12 * U, hipY - 0.05 * U);
  ctx.lineTo(hipX + 0.13 * U, hipY - 0.05 * U);
  ctx.lineTo(kF[0] + 0.05 * U, (hipY + kF[1]) / 2 + 0.02 * U);
  ctx.lineTo(hipX + 0.01 * U, hipY + 0.05 * U);
  ctx.lineTo(kB[0] - 0.05 * U, (hipY + kB[1]) / 2 + 0.02 * U);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = '#ffe14a';
  for (const [dx, dy] of [[-0.06, 0.0], [0.06, 0.02], [0.0, 0.04]]) {
    ell(ctx, hipX + dx * U, hipY + dy * U, 0.014 * U, 0.014 * U);
    ctx.fill();
  }
  // 몸통 (래시가드)
  ctx.save();
  ctx.translate((hipX + shX) / 2, (hipY + shY) / 2);
  ctx.rotate(Math.atan2(shX - hipX, hipY - shY) * 0.9);
  const th = Math.hypot(shX - hipX, shY - hipY) + 0.05 * U;
  rr(ctx, -0.13 * U, -th / 2, 0.26 * U, th, 0.09 * U);
  ctx.fillStyle = lin(ctx, -0.13 * U, 0, 0.13 * U, 0, [0, '#ff7a62'], [0.6, '#f2434f'], [1, '#c92b3d']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.moveTo(-0.13 * U, -th * 0.12);
  ctx.lineTo(0.13 * U, -th * 0.28);
  ctx.lineTo(0.13 * U, -th * 0.12);
  ctx.lineTo(-0.13 * U, th * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // 팔
  const shB = [shX - 0.08 * U, shY + 0.03 * U], shF = [shX + 0.08 * U, shY + 0.03 * U];
  let hB: number[], eB: number[], hF: number[], eF: number[];
  const wob = Math.sin(t * 0.12) * 0.03 * U;
  if (p.arms === 'up') {
    const sw = Math.sin(t * 0.06) * 0.05 * U;
    (eB = [shB[0] - 0.12 * U, shB[1] - 0.2 * U]), (hB = [hd.x - 0.06 * U + sw, hd.y - 0.3 * U]);
    (eF = [shF[0] + 0.12 * U, shF[1] - 0.2 * U]), (hF = [hd.x + 0.1 * U + sw, hd.y - 0.3 * U]);
  } else if (p.arms === 'yeah') {
    (eB = [shB[0] - 0.14 * U, shB[1] - 0.14 * U]), (hB = [shB[0] - 0.22 * U, shB[1] - 0.34 * U + wob]);
    (eF = [shF[0] + 0.14 * U, shF[1] - 0.14 * U]), (hF = [shF[0] + 0.24 * U, shF[1] - 0.34 * U - wob]);
  } else if (tuck) {
    (eB = [shB[0] - 0.1 * U, shB[1] + 0.12 * U]), (hB = [-0.06 * U, -0.1 * U]);
    (eF = [shF[0] + 0.1 * U, shF[1] + 0.1 * U]), (hF = [0.2 * U, -0.11 * U]);
  } else if (flail) {
    const a1 = t * 0.45, a2 = t * 0.45 + 2;
    (eB = [shB[0] - 0.14 * U, shB[1] - 0.05 * U]), (hB = [eB[0] + Math.cos(a1) * 0.16 * U, eB[1] + Math.sin(a1) * 0.16 * U]);
    (eF = [shF[0] + 0.14 * U, shF[1] - 0.05 * U]), (hF = [eF[0] + Math.cos(a2) * 0.16 * U, eF[1] + Math.sin(a2) * 0.16 * U]);
  } else {
    const k = 1 - c * 0.4;
    (eB = [shB[0] - 0.16 * U, shB[1] + 0.04 * U + wob]), (hB = [shB[0] - 0.32 * U * k, shB[1] - 0.04 * U + wob * 1.5]);
    (eF = [shF[0] + 0.15 * U, shF[1] - 0.05 * U - wob]), (hF = [shF[0] + 0.32 * U * k, shF[1] + 0.02 * U - wob]);
  }
  for (const [s0, e0, h0] of [[shB, eB, hB], [shF, eF, hF]]) {
    limb(ctx, [s0, e0, h0], 0.07 * U, SKIN[0]);
    // 소매
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.08 * U + 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s0[0], s0[1]);
    ctx.lineTo(s0[0] + (e0[0] - s0[0]) * 0.38, s0[1] + (e0[1] - s0[1]) * 0.38);
    ctx.stroke();
    ctx.strokeStyle = '#ef3f4d';
    ctx.lineWidth = 0.08 * U;
    ctx.stroke();
    ctx.fillStyle = SKIN[0];
    ell(ctx, h0[0], h0[1], 0.04 * U, 0.04 * U);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  // 머리
  ctx.fillStyle = '#7b3f1c';
  ell(ctx, hd.x - 0.04 * U, hd.y - 0.02 * U, hd.r * 1.02, hd.r * 1.0);
  ctx.fill();
  ctx.fillStyle = radg(ctx, hd.x + hd.r * 0.3, hd.y - hd.r * 0.3, hd.r * 0.1, hd.r * 1.2, [0, '#ffe4c2'], [0.6, SKIN[0]], [1, SKIN[1]]);
  ell(ctx, hd.x, hd.y, hd.r, hd.r * 0.96);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // 귀
  ctx.fillStyle = SKIN[1];
  ell(ctx, hd.x - hd.r * 0.62, hd.y + hd.r * 0.12, hd.r * 0.2, hd.r * 0.26);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // 삐죽 머리카락
  ctx.fillStyle = lin(ctx, 0, hd.y - hd.r * 1.4, 0, hd.y, [0, '#a65a2a'], [1, '#6f3618']);
  ctx.beginPath();
  ctx.moveTo(hd.x - hd.r * 0.95, hd.y + hd.r * 0.05);
  const spikes = [[-1.15, -0.45], [-0.85, -0.55], [-0.95, -1.05], [-0.45, -0.9], [-0.35, -1.4], [0.05, -1.0], [0.35, -1.3], [0.45, -0.85], [0.95, -0.9], [0.8, -0.45]];
  for (const [sx, sy] of spikes) ctx.lineTo(hd.x + sx * hd.r + Math.sin(t * 0.2 + sx * 3) * 0.6, hd.y + sy * hd.r);
  ctx.quadraticCurveTo(hd.x + hd.r * 0.4, hd.y - hd.r * 0.35, hd.x - hd.r * 0.2, hd.y - hd.r * 0.4);
  ctx.quadraticCurveTo(hd.x - hd.r * 0.6, hd.y - hd.r * 0.2, hd.x - hd.r * 0.95, hd.y + hd.r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // 볼
  ctx.fillStyle = 'rgba(255,110,110,.38)';
  ell(ctx, hd.x + hd.r * 0.55, hd.y + hd.r * 0.32, hd.r * 0.2, hd.r * 0.13);
  ctx.fill();
  // 눈 · 선글라스
  const ey = hd.y - hd.r * 0.05, e1 = hd.x + hd.r * 0.12, e2 = hd.x + hd.r * 0.66;
  const lens = (cx: number, cy: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    rr(ctx, -hd.r * 0.27, -hd.r * 0.2, hd.r * 0.54, hd.r * 0.4, hd.r * 0.14);
    ctx.fillStyle = lin(ctx, 0, -hd.r * 0.2, 0, hd.r * 0.2, [0, '#1d2a66'], [1, '#3fb9ff']);
    ctx.fill();
    ctx.strokeStyle = '#141a33';
    ctx.lineWidth = Math.max(1.6, hd.r * 0.09);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = Math.max(1.2, hd.r * 0.07);
    ctx.beginPath();
    ctx.moveTo(-hd.r * 0.14, hd.r * 0.08);
    ctx.lineTo(hd.r * 0.02, -hd.r * 0.1);
    ctx.stroke();
    ctx.restore();
  };
  if (p.glassesUp) {
    // 이마 위 선글라스 · 감은 눈
    const gy = hd.y - hd.r * 0.62;
    lens(e1 - hd.r * 0.04, gy, -0.12);
    lens(e2 - hd.r * 0.04, gy - hd.r * 0.06, -0.12);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    for (const ex of [e1, e2]) {
      ctx.beginPath();
      ctx.arc(ex, ey + hd.r * 0.05, hd.r * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    const rot = p.face === 'dizzy' ? 0.35 : p.face === 'panic' ? -0.06 : 0;
    const off = p.face === 'dizzy' ? hd.r * 0.12 : 0;
    ctx.strokeStyle = '#141a33';
    ctx.lineWidth = Math.max(1.5, hd.r * 0.08);
    ctx.beginPath();
    ctx.moveTo(e1 + hd.r * 0.25, ey + off * 0.5);
    ctx.lineTo(e2 - hd.r * 0.25, ey + off * 1.2);
    ctx.moveTo(e1 - hd.r * 0.26, ey + off * 0.2);
    ctx.lineTo(hd.x - hd.r * 0.55, ey + hd.r * 0.05);
    ctx.stroke();
    lens(e1, ey + off * 0.3, rot);
    lens(e2, ey + off * 1.3, rot);
    if (p.face === 'dizzy') {
      ctx.fillStyle = '#ffe14a';
      for (let k = 0; k < 3; k++) {
        const a = t * 0.15 + (k * TAU) / 3;
        starPath(ctx, hd.x + Math.cos(a) * hd.r * 1.3, hd.y - hd.r * 1.1 + Math.sin(a) * hd.r * 0.35, hd.r * 0.22);
        ctx.fill();
      }
    }
  }
  // 입
  const mx = hd.x + hd.r * 0.42, my = hd.y + hd.r * 0.45;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = OUT;
  if (p.face === 'yawn' || p.face === 'panic' || p.face === 'dizzy') {
    const big = p.face === 'yawn' ? 1 : 0.65;
    ctx.fillStyle = '#8a2030';
    ell(ctx, mx, my + hd.r * 0.04, hd.r * 0.17 * big, hd.r * 0.22 * big);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff8a9a';
    ell(ctx, mx, my + hd.r * 0.15 * big, hd.r * 0.1 * big, hd.r * 0.07 * big);
    ctx.fill();
  } else if (p.face === 'ouch') {
    ctx.beginPath();
    ctx.moveTo(mx - hd.r * 0.28, my);
    for (let k = 1; k <= 4; k++) ctx.lineTo(mx - hd.r * 0.28 + k * hd.r * 0.14, my + (k % 2 ? hd.r * 0.1 : 0));
    ctx.stroke();
  } else {
    const open = p.face === 'whee' ? 1.25 : p.face === 'focus' ? 0.7 : 1;
    ctx.beginPath();
    ctx.moveTo(mx - hd.r * 0.36, my - hd.r * 0.08);
    ctx.quadraticCurveTo(mx + hd.r * 0.05, my - hd.r * 0.02, mx + hd.r * 0.4, my - hd.r * 0.14);
    ctx.quadraticCurveTo(mx + hd.r * 0.12, my + hd.r * 0.42 * open, mx - hd.r * 0.36, my - hd.r * 0.08);
    ctx.closePath();
    ctx.fillStyle = '#8a2030';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - hd.r * 0.4, my - hd.r * 0.2, hd.r * 0.85, hd.r * (p.face === 'focus' ? 0.3 : 0.15));
    if (p.face !== 'focus') {
      ctx.fillStyle = '#ff8a9a';
      ell(ctx, mx + hd.r * 0.02, my + hd.r * 0.25 * open, hd.r * 0.16, hd.r * 0.1);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(29,53,87,.5)';
      ctx.lineWidth = 1;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(mx + k * hd.r * 0.13, my - hd.r * 0.2);
        ctx.lineTo(mx + k * hd.r * 0.13, my + hd.r * 0.12);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (p.face === 'panic' || p.face === 'ouch') {
    ctx.fillStyle = '#bfefff';
    ctx.beginPath();
    const dx = hd.x - hd.r * 0.55, dy = hd.y - hd.r * 0.55 + ((t * 0.6) % 8);
    ctx.moveTo(dx, dy - hd.r * 0.25);
    ctx.quadraticCurveTo(dx + hd.r * 0.16, dy, dx, dy + hd.r * 0.08);
    ctx.quadraticCurveTo(dx - hd.r * 0.16, dy, dx, dy - hd.r * 0.25);
    ctx.fill();
    ctx.strokeStyle = '#3a8acb';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
function drawSurfer(ctx: C2, x: number, y: number, U: number, ang: number, p: SPose, t: number) {
  ctx.save();
  ctx.translate(x, y);
  if (ang) {
    ctx.translate(0, -0.42 * U);
    ctx.rotate(ang);
    ctx.translate(0, 0.42 * U);
  }
  if (p.board) drawBoard(ctx, 0, 0, U, -0.04 + p.lean * 0.2);
  drawKid(ctx, U, p, t);
  ctx.restore();
}

// ── 해변 물건 · 장애물 ──
function drawCastle(ctx: C2, x: number, y: number, S: number, v: number, t: number) {
  ctx.fillStyle = 'rgba(120,80,30,.22)';
  ell(ctx, x, y + 1, S * 0.62, S * 0.1);
  ctx.fill();
  const sand = lin(ctx, x - S * 0.5, 0, x + S * 0.5, 0, [0, '#ffe7b0'], [0.55, '#f5cf86'], [1, '#d9a95c']);
  const block = (x0: number, w0: number, h0: number) => {
    ctx.fillStyle = sand;
    ctx.fillRect(x0, y - h0, w0, h0);
    // 톱니
    const n = Math.max(2, Math.round(w0 / (S * 0.1)));
    for (let i = 0; i < n; i += 2) ctx.fillRect(x0 + (i * w0) / n, y - h0 - S * 0.07, w0 / n, S * 0.07);
    ctx.strokeStyle = '#a26f2c';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0, y - h0);
    for (let i = 0; i < n; i++) {
      const xa = x0 + (i * w0) / n, xb = x0 + ((i + 1) * w0) / n, up = i % 2 === 0;
      if (up) ctx.lineTo(xa, y - h0 - S * 0.07), ctx.lineTo(xb, y - h0 - S * 0.07), ctx.lineTo(xb, y - h0);
      else ctx.lineTo(xb, y - h0);
    }
    ctx.lineTo(x0 + w0, y);
    ctx.stroke();
  };
  block(x - S * 0.5, S, S * 0.45);
  block(x - S * 0.46, S * 0.24, S * 0.82);
  block(x + S * 0.22, S * 0.24, S * 0.78);
  block(x - S * 0.15, S * 0.3, S * 1.05);
  // 문 · 창
  ctx.fillStyle = '#8a5a26';
  ctx.beginPath();
  ctx.moveTo(x - S * 0.09, y);
  ctx.lineTo(x - S * 0.09, y - S * 0.16);
  ctx.arc(x, y - S * 0.16, S * 0.09, Math.PI, 0);
  ctx.lineTo(x + S * 0.09, y);
  ctx.fill();
  for (const [wx, wy] of [[-0.34, 0.62], [0.34, 0.58], [0, 0.78]]) {
    ctx.fillStyle = '#9a6a2e';
    rr(ctx, x + wx * S - S * 0.035, y - wy * S - S * 0.05, S * 0.07, S * 0.1, S * 0.035);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(160,110,50,.4)';
  for (let i = 0; i < 6; i++) {
    ell(ctx, x + (hsh(v + i) - 0.5) * S * 0.9, y - hsh(v * 2 + i) * S * 0.4, 1.2, 1);
    ctx.fill();
  }
  // 깃발
  const fx0 = x, fy0 = y - S * 1.12;
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(fx0, fy0);
  ctx.lineTo(fx0, fy0 - S * 0.32);
  ctx.stroke();
  const wv = Math.sin(t * 0.15 + v) * S * 0.04;
  ctx.fillStyle = v % 3 === 0 ? '#ff4d5e' : v % 3 === 1 ? '#2f9cf6' : '#ffb12e';
  ctx.beginPath();
  ctx.moveTo(fx0, fy0 - S * 0.32);
  ctx.quadraticCurveTo(fx0 + S * 0.15, fy0 - S * 0.3 + wv, fx0 + S * 0.26, fy0 - S * 0.24 + wv);
  ctx.lineTo(fx0, fy0 - S * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function drawBall(ctx: C2, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const cols = ['#ff4d5e', '#ffffff', '#2f9cf6', '#ffffff', '#ffd23a', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, (i * TAU) / 6, ((i + 1) * TAU) / 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = radg(ctx, x - r * 0.35, y - r * 0.4, 0, r * 1.2, [0, 'rgba(255,255,255,.7)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(0,30,80,.25)']);
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function drawParasol(ctx: C2, x: number, y: number, S: number, v: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (!rot) {
    ctx.fillStyle = v % 2 ? '#3fa9f5' : '#ff6f7d';
    ctx.fillRect(-S * 0.55, -S * 0.04, S * 0.75, S * 0.06);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-S * 0.4, -S * 0.04, S * 0.1, S * 0.06);
    ctx.fillRect(-S * 0.15, -S * 0.04, S * 0.1, S * 0.06);
  }
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = Math.max(1.6, S * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(S * 0.1, -S * 1.15);
  ctx.stroke();
  const cx = S * 0.1, cy = -S * 1.15, r = S * 0.62, c1 = v % 2 ? '#2f9cf6' : '#ff4d5e';
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : c1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.42);
    ctx.lineTo(cx - r + (i * 2 * r) / 6, cy + r * 0.22);
    ctx.quadraticCurveTo(cx - r + ((i + 0.5) * 2 * r) / 6, cy + r * 0.32, cx - r + ((i + 1) * 2 * r) / 6, cy + r * 0.22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + r * 0.22);
  ctx.lineTo(cx, cy - r * 0.42);
  ctx.lineTo(cx + r, cy + r * 0.22);
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ell(ctx, cx, cy - r * 0.44, S * 0.05, S * 0.05);
  ctx.fill();
  ctx.restore();
}
function drawCrab(ctx: C2, x: number, y: number, S: number, t: number, wave: number, rot = 0, scared = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#b8322a';
  ctx.lineWidth = Math.max(1.4, S * 0.08);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const a = sd * (0.5 + k * 0.35) + Math.sin(t * 0.4 + k) * 0.1;
      ctx.beginPath();
      ctx.moveTo(sd * S * 0.25, -S * 0.2);
      ctx.lineTo(sd * S * (0.45 + k * 0.08), -S * 0.12 + Math.abs(a) * S * 0.08);
      ctx.lineTo(sd * S * (0.55 + k * 0.1), S * 0.02);
      ctx.stroke();
    }
  // 집게
  for (const sd of [-1, 1]) {
    const up = sd * wave;
    const cx = sd * S * 0.48, cy = -S * (0.5 + 0.25 * Math.max(0, wave)) + Math.sin(t * 0.3 + sd) * S * 0.04 * Math.abs(up);
    ctx.strokeStyle = '#b8322a';
    ctx.beginPath();
    ctx.moveTo(sd * S * 0.25, -S * 0.3);
    ctx.lineTo(cx, cy + S * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#ff6a4a';
    ell(ctx, cx, cy, S * 0.15, S * 0.12, sd * 0.4);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#fff1e6';
    ctx.beginPath();
    ctx.moveTo(cx + sd * S * 0.02, cy - S * 0.02);
    ctx.lineTo(cx + sd * S * 0.16, cy - S * 0.1);
    ctx.lineTo(cx + sd * S * 0.13, cy + S * 0.02);
    ctx.fill();
  }
  ctx.fillStyle = radg(ctx, -S * 0.1, -S * 0.36, 0, S * 0.5, [0, '#ffa07a'], [0.6, '#ff6a4a'], [1, '#d9402e']);
  ell(ctx, 0, -S * 0.25, S * 0.36, S * 0.24);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const sd of [-1, 1]) {
    ctx.strokeStyle = '#b8322a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sd * S * 0.1, -S * 0.42);
    ctx.lineTo(sd * S * 0.13, -S * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ell(ctx, sd * S * 0.13, -S * 0.64, S * 0.09, S * (scared ? 0.11 : 0.09));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#141a33';
    ell(ctx, sd * S * 0.13 + S * 0.02, -S * 0.63, S * 0.04, S * 0.05);
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (scared) ell(ctx, 0, -S * 0.2, S * 0.06, S * 0.07);
  else ctx.arc(0, -S * 0.24, S * 0.1, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
}
function drawRock(ctx: C2, x: number, y: number, hw: number, hh: number, v: number, t: number, big: boolean) {
  // 물보라 고리 (뒤)
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ell(ctx, x, y + 1, hw * 1.15, hw * 0.16);
  ctx.fill();
  const pts: number[][] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = Math.PI * (1 - u);
    const bump = 1 + (hsh(v + i * 1.7) - 0.5) * 0.22;
    const top = big ? Math.pow(Math.sin(a), 0.55) : Math.sin(a);
    pts.push([x + Math.cos(a) * hw * (big ? 0.9 + 0.1 * Math.sin(a) : 1) * bump, y - top * hh * bump]);
  }
  ctx.beginPath();
  ctx.moveTo(x - hw, y + 3);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.lineTo(x + hw, y + 3);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x - hw, y - hh, x + hw, y, [0, '#c9c2b6'], [0.45, '#958b80'], [1, '#625952']);
  ctx.fill();
  ctx.strokeStyle = '#3d3530';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ell(ctx, x - hw * 0.35, y - hh * 0.65, hw * 0.35, hh * 0.25, -0.4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,50,45,.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const cx = x + (hsh(v + i * 3) - 0.5) * hw, cy = y - hsh(v + i * 5) * hh * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + hw * 0.12, cy + hh * 0.12);
    ctx.lineTo(cx + hw * 0.05, cy + hh * 0.25);
    ctx.stroke();
  }
  // 이끼 · 따개비
  ctx.fillStyle = '#5cbf5a';
  for (let i = 0; i < 5; i++) {
    ell(ctx, x + (i - 2) * hw * 0.25, y - hh * (0.93 - Math.abs(i - 2) * 0.12) + 2, hw * 0.16, hh * 0.06 + 1.5);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 6; i++) {
    ell(ctx, x + (hsh(v + i * 9) - 0.5) * hw * 1.4, y - hsh(v + i * 11) * hh * 0.25, 1.6, 1.6);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(40,120,150,.25)';
  ctx.fillRect(x - hw * 1.2, y - hh * 0.08, hw * 2.4, hh * 0.2);
  ctx.restore();
  if (big) {
    palm(ctx, x + hw * 0.1, y - hh * 0.96, hh * 0.32, 0.18, v, hw / 40);
  }
  // 물보라 고리 (앞)
  const sw = Math.sin(t * 0.08 + v) * 0.5 + 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 1, hw * (1.05 + sw * 0.1), hw * 0.13, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
}
function drawPierPosts(ctx: C2, x0: number, x1: number, y: number, dy: number, t: number) {
  for (let px = x0 + 4; px <= x1 - 2; px += Math.max(26, (x1 - x0) / 6)) {
    ctx.fillStyle = lin(ctx, px - 4, 0, px + 4, 0, [0, '#9a6236'], [1, '#5e3a1c']);
    ctx.fillRect(px - 4, y - dy, 8, dy + 8);
    ctx.strokeStyle = '#3d2410';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(px - 4, y - dy, 8, dy + 8);
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(px, y + 1, 8 + Math.sin(t * 0.1 + px) * 1.5, 2.5, 0, 0, TAU);
    ctx.stroke();
  }
}
function drawPierDeck(ctx: C2, x0: number, x1: number, yTop: number, th: number, v: number) {
  // 난간 기둥 · 밧줄
  ctx.strokeStyle = '#6a4220';
  ctx.lineWidth = 3;
  const n = Math.max(2, Math.round((x1 - x0) / 34));
  for (let i = 0; i <= n; i++) {
    const px = x0 + 6 + ((x1 - x0 - 12) * i) / n;
    ctx.beginPath();
    ctx.moveTo(px, yTop);
    ctx.lineTo(px, yTop - th * 1.7);
    ctx.stroke();
  }
  ctx.strokeStyle = '#e8d2a0';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const pa = x0 + 6 + ((x1 - x0 - 12) * i) / n, pb = x0 + 6 + ((x1 - x0 - 12) * (i + 1)) / n;
    ctx.moveTo(pa, yTop - th * 1.6);
    ctx.quadraticCurveTo((pa + pb) / 2, yTop - th * 1.1, pb, yTop - th * 1.6);
  }
  ctx.stroke();
  // 판 윗면 · 앞면
  ctx.fillStyle = lin(ctx, 0, yTop - th * 0.35, 0, yTop, [0, '#f0c287'], [1, '#d99b5c']);
  ctx.fillRect(x0, yTop - th * 0.3, x1 - x0, th * 0.3);
  ctx.fillStyle = lin(ctx, 0, yTop, 0, yTop + th, [0, '#c4813f'], [1, '#8f5a2a']);
  ctx.fillRect(x0, yTop, x1 - x0, th);
  ctx.strokeStyle = '#4a2c12';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, yTop - th * 0.3, x1 - x0, th * 1.3);
  ctx.strokeStyle = 'rgba(80,45,15,.5)';
  ctx.lineWidth = 1;
  for (let px = x0 + 10; px < x1; px += 11) {
    ctx.beginPath();
    ctx.moveTo(px, yTop - th * 0.3);
    ctx.lineTo(px - 2, yTop);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x0, yTop + th * 0.5);
  ctx.lineTo(x1, yTop + th * 0.5);
  ctx.stroke();
  // 구명 튜브
  const bx = x0 + (x1 - x0) * (0.3 + hsh(v) * 0.4), by = yTop + th + 9;
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? '#ffffff' : '#ff5a3c';
    ctx.beginPath();
    ctx.arc(bx, by, 7, (i * TAU) / 4, ((i + 1) * TAU) / 4);
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ell(ctx, bx, by, 9.5, 9.5);
  ctx.stroke();
  ell(ctx, bx, by, 4.5, 4.5);
  ctx.stroke();
}
function drawBoat(ctx: C2, x: number, y: number, S: number, v: number, t: number, rot: number, worried: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot + Math.sin(t * 0.07 + v) * 0.04);
  // 돛대 · 돛
  ctx.strokeStyle = '#6a4220';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-S * 0.05, -S * 0.25);
  ctx.lineTo(-S * 0.05, -S * 2.7);
  ctx.stroke();
  ctx.fillStyle = lin(ctx, -S * 0.05, 0, S * 0.9, 0, [0, '#ffffff'], [1, '#e2f2ff']);
  ctx.beginPath();
  ctx.moveTo(-S * 0.02, -S * 2.6);
  ctx.quadraticCurveTo(S * 0.75, -S * 1.6, S * 0.85, -S * 0.5);
  ctx.lineTo(-S * 0.02, -S * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = '#2f9cf6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(S * 0.05, -S * 1.3);
  ctx.lineTo(S * 0.55, -S * 1.3);
  ctx.stroke();
  // 깃발
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(-S * 0.05, -S * 2.7);
  ctx.lineTo(-S * 0.4, -S * 2.6 + Math.sin(t * 0.2) * 2);
  ctx.lineTo(-S * 0.05, -S * 2.5);
  ctx.fill();
  // 고양이 어부
  const cx = -S * 0.5, cy = -S * 0.48;
  ctx.fillStyle = '#ffb35c';
  ell(ctx, cx, cy, S * 0.2, S * 0.24);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ell(ctx, cx, cy - S * 0.32, S * 0.2, S * 0.18);
  ctx.fill();
  ctx.stroke();
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sd * S * 0.17, cy - S * 0.4);
    ctx.lineTo(cx + sd * S * 0.14, cy - S * 0.56);
    ctx.lineTo(cx + sd * S * 0.05, cy - S * 0.46);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#141a33';
  for (const sd of [-1, 1]) {
    ell(ctx, cx + sd * S * 0.07, cy - S * 0.33, S * 0.025, S * (worried > 0 ? 0.045 : 0.03));
    ctx.fill();
  }
  // 밀짚모자
  ctx.fillStyle = '#ffe08a';
  ell(ctx, cx, cy - S * 0.47, S * 0.28, S * 0.06);
  ctx.fill();
  ctx.strokeStyle = '#a07a2a';
  ctx.stroke();
  ctx.fillStyle = '#ffd36a';
  ell(ctx, cx, cy - S * 0.53, S * 0.14, S * 0.08);
  ctx.fill();
  ctx.stroke();
  // 낚싯대
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.1, cy);
  ctx.lineTo(cx - S * 0.75, cy - S * 0.65);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(29,53,87,.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.75, cy - S * 0.65);
  ctx.lineTo(cx - S * 0.85, S * 0.2);
  ctx.stroke();
  // 선체
  ctx.beginPath();
  ctx.moveTo(-S * 0.95, -S * 0.35);
  ctx.lineTo(S * 1.0, -S * 0.42);
  ctx.quadraticCurveTo(S * 0.85, S * 0.2, S * 0.5, S * 0.22);
  ctx.lineTo(-S * 0.6, S * 0.22);
  ctx.quadraticCurveTo(-S * 0.9, S * 0.1, -S * 0.95, -S * 0.35);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -S * 0.4, 0, S * 0.22, [0, '#ff6a5a'], [0.6, '#e2403a'], [1, '#a32a2a']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-S * 0.93, -S * 0.3);
  ctx.lineTo(S * 0.98, -S * 0.36);
  ctx.lineTo(S * 0.95, -S * 0.25);
  ctx.lineTo(-S * 0.9, -S * 0.19);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ell(ctx, S * 0.55, -S * 0.05, S * 0.07, S * 0.07);
  ctx.fill();
  ctx.restore();
}
function drawJelly(ctx: C2, x: number, y: number, S: number, t: number, sd: number, glow: number) {
  const bob = Math.sin(t * 0.07 + sd) * S * 0.12;
  if (glow > 0) {
    ctx.fillStyle = `rgba(255,120,200,${0.25 * glow})`;
    ell(ctx, x, y - S * 0.2 + bob, S * 1.1, S * 0.6);
    ctx.fill();
  }
  ctx.fillStyle = radg(ctx, x - S * 0.2, y - S * 0.55 + bob, 0, S * 0.9, [0, 'rgba(255,230,250,.95)'], [0.5, 'rgba(255,140,215,.85)'], [1, 'rgba(220,70,170,.8)']);
  ctx.beginPath();
  ctx.moveTo(x - S * 0.55, y + bob);
  ctx.bezierCurveTo(x - S * 0.55, y - S * 0.75 + bob, x + S * 0.55, y - S * 0.75 + bob, x + S * 0.55, y + bob);
  for (let k = 0; k < 5; k++) ctx.quadraticCurveTo(x + S * (0.44 - k * 0.22), y + S * 0.14 + bob, x + S * (0.33 - k * 0.22), y + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c23d8f';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ell(ctx, x - S * 0.2, y - S * 0.42 + bob, S * 0.13, S * 0.08, -0.4);
  ctx.fill();
  ctx.fillStyle = '#c23d8f';
  for (const dx of [-0.15, 0.15]) {
    ell(ctx, x + dx * S, y - S * 0.22 + bob, S * 0.05, S * 0.07);
    ctx.fill();
  }
}
function drawJellyLegs(ctx: C2, x: number, y: number, S: number, t: number, sd: number) {
  ctx.strokeStyle = 'rgba(230,90,180,.55)';
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 4; k++) {
    const bx = x + (k - 1.5) * S * 0.25;
    ctx.beginPath();
    ctx.moveTo(bx, y + S * 0.08);
    for (let j = 1; j <= 4; j++) ctx.lineTo(bx + Math.sin(t * 0.12 + j + k + sd) * S * 0.12, y + S * 0.08 + j * S * 0.18);
    ctx.stroke();
  }
}
function drawDolphin(ctx: C2, x: number, y: number, S: number, t: number, up: number, used: number) {
  const hop = used > 0 ? Math.sin(Math.min(1, used / 40) * Math.PI) * S * 1.6 : 0;
  const rot = used > 0 ? -Math.min(1, used / 40) * TAU : 0;
  ctx.save();
  ctx.translate(x, y - hop - up * S * 0.35 + Math.sin(t * 0.09) * S * 0.06);
  ctx.rotate(rot - up * 0.35);
  // 몸통 (물 위로 드러난 등)
  ctx.beginPath();
  ctx.moveTo(-S * 1.05, S * 0.15);
  ctx.bezierCurveTo(-S * 0.7, -S * 0.55, S * 0.4, -S * 0.65, S * 0.85, -S * 0.15);
  ctx.quadraticCurveTo(S * 1.15, -S * 0.08, S * 1.18, S * 0.02);
  ctx.quadraticCurveTo(S * 0.9, S * 0.08, S * 0.7, S * 0.12);
  ctx.bezierCurveTo(S * 0.2, S * 0.35, -S * 0.6, S * 0.35, -S * 1.05, S * 0.15);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -S * 0.6, 0, S * 0.3, [0, '#7fc2f5'], [0.55, '#4c9be0'], [1, '#e6f6ff']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // 등지느러미
  ctx.fillStyle = '#3f86cc';
  ctx.beginPath();
  ctx.moveTo(-S * 0.25, -S * 0.5);
  ctx.quadraticCurveTo(-S * 0.3, -S * 0.95, -S * 0.55, -S * 0.98);
  ctx.quadraticCurveTo(-S * 0.45, -S * 0.7, -S * 0.6, -S * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 눈 · 웃음
  ctx.fillStyle = '#141a33';
  ell(ctx, S * 0.62, -S * 0.22, S * 0.06, S * 0.08);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, S * 0.64, -S * 0.25, S * 0.025, S * 0.025);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(S * 0.88, -S * 0.04, S * 0.16, 0.2, 1.6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,140,170,.5)';
  ell(ctx, S * 0.72, -S * 0.08, S * 0.07, S * 0.04);
  ctx.fill();
  ctx.restore();
}
function drawShell(ctx: C2, x: number, y: number, r: number, t: number, v: number) {
  const bob = Math.sin(t * 0.08 + v) * r * 0.25;
  y += bob;
  ctx.fillStyle = radg(ctx, x - r * 0.3, y - r * 0.35, 0, r * 1.1, [0, 'rgba(255,255,255,.55)'], [0.7, 'rgba(190,240,255,.25)'], [1, 'rgba(150,220,255,.45)']);
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // 가리비
  const s = r * 0.62;
  ctx.fillStyle = lin(ctx, x, y - s, x, y + s, [0, '#ffd1dc'], [1, '#ff8fa8']);
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.75);
  for (let k = 0; k <= 5; k++) {
    const a = Math.PI + (k * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * s, y - s * 0.1 + Math.sin(a) * s * 0.85);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d0587a';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  for (let k = 1; k < 5; k++) {
    const a = Math.PI + (k * Math.PI) / 5;
    ctx.moveTo(x, y + s * 0.7);
    ctx.lineTo(x + Math.cos(a) * s * 0.85, y - s * 0.1 + Math.sin(a) * s * 0.72);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ell(ctx, x - r * 0.45, y - r * 0.45, r * 0.16, r * 0.1, -0.6);
  ctx.fill();
}
function drawLighthouse(ctx: C2, x: number, y: number, S: number, t: number) {
  // 바위섬
  ctx.fillStyle = lin(ctx, 0, y - S * 0.25, 0, y + 4, [0, '#b9b0a4'], [1, '#6f665e']);
  ctx.beginPath();
  ctx.moveTo(x - S * 0.75, y + 4);
  ctx.quadraticCurveTo(x - S * 0.6, y - S * 0.2, x - S * 0.2, y - S * 0.26);
  ctx.quadraticCurveTo(x + S * 0.3, y - S * 0.3, x + S * 0.65, y - S * 0.1);
  ctx.quadraticCurveTo(x + S * 0.8, y, x + S * 0.8, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3d3530';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // 탑
  const b = y - S * 0.22, top = b - S * 1.55, wb = S * 0.26, wt = S * 0.17;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - wb, b);
  ctx.lineTo(x - wt, top);
  ctx.lineTo(x + wt, top);
  ctx.lineTo(x + wb, b);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x - wb, 0, x + wb, 0, [0, '#ffffff'], [0.7, '#eef4fa'], [1, '#c9d5e2']);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#ef4b45';
  for (let i = 0; i < 3; i++) ctx.fillRect(x - wb, b - S * (0.3 + i * 0.45), wb * 2, S * 0.2);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(x + wt * 0.5, top, wb, b - top);
  ctx.restore();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - wb, b);
  ctx.lineTo(x - wt, top);
  ctx.lineTo(x + wt, top);
  ctx.lineTo(x + wb, b);
  ctx.stroke();
  ctx.fillStyle = '#3d5a80';
  rr(ctx, x - S * 0.06, b - S * 0.18, S * 0.12, S * 0.18, S * 0.05);
  ctx.fill();
  // 등불 방
  ctx.fillStyle = '#2b3d5a';
  ctx.fillRect(x - wt * 1.35, top - S * 0.04, wt * 2.7, S * 0.05);
  const glow = 0.6 + 0.4 * Math.sin(t * 0.1);
  ctx.fillStyle = radg(ctx, x, top - S * 0.16, 0, S * 0.5, [0, `rgba(255,248,180,${0.8 * glow})`], [1, 'rgba(255,240,150,0)']);
  ell(ctx, x, top - S * 0.16, S * 0.5, S * 0.5);
  ctx.fill();
  ctx.fillStyle = '#fff3a8';
  ctx.fillRect(x - wt * 0.8, top - S * 0.26, wt * 1.6, S * 0.22);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x - wt * 0.8, top - S * 0.26, wt * 1.6, S * 0.22);
  ctx.fillStyle = '#ef4b45';
  ctx.beginPath();
  ctx.moveTo(x - wt * 1.1, top - S * 0.26);
  ctx.quadraticCurveTo(x, top - S * 0.5, x + wt * 1.1, top - S * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 깃발
  ctx.strokeStyle = '#3d3530';
  ctx.beginPath();
  ctx.moveTo(x, top - S * 0.42);
  ctx.lineTo(x, top - S * 0.62);
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(x, top - S * 0.62);
  ctx.lineTo(x + S * 0.2, top - S * 0.56 + Math.sin(t * 0.2) * 2);
  ctx.lineTo(x, top - S * 0.5);
  ctx.fill();
}
function drawSeal(ctx: C2, x: number, y: number, S: number, t: number, cheer: number, gasp: number) {
  // 바위
  ctx.fillStyle = lin(ctx, 0, y - S * 0.2, 0, y + S * 0.35, [0, '#b9b0a4'], [1, '#7a7068']);
  ctx.beginPath();
  ctx.moveTo(x - S * 0.95, y + S * 0.35);
  ctx.quadraticCurveTo(x - S * 0.8, y - S * 0.1, x - S * 0.2, y - S * 0.15);
  ctx.quadraticCurveTo(x + S * 0.6, y - S * 0.18, x + S * 0.95, y + S * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4a423c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const bounce = cheer > 0 ? Math.abs(Math.sin(t * 0.35)) * S * 0.15 : Math.sin(t * 0.05) * S * 0.02;
  ctx.save();
  ctx.translate(x, y - S * 0.12 - bounce);
  // 몸
  ctx.fillStyle = lin(ctx, 0, -S * 0.9, 0, 0, [0, '#a9bccd'], [1, '#7f94a8']);
  ctx.beginPath();
  ctx.moveTo(-S * 0.7, 0);
  ctx.bezierCurveTo(-S * 0.75, -S * 0.35, -S * 0.3, -S * 0.5, -S * 0.05, -S * 0.75);
  ctx.bezierCurveTo(S * 0.1, -S * 1.05, S * 0.55, -S * 0.95, S * 0.5, -S * 0.6);
  ctx.bezierCurveTo(S * 0.48, -S * 0.3, S * 0.5, -S * 0.1, S * 0.4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = 'rgba(235,242,250,.9)';
  ell(ctx, S * 0.22, -S * 0.35, S * 0.2, S * 0.3);
  ctx.fill();
  // 지느러미 (박수)
  const clap = cheer > 0 ? Math.sin(t * 0.7) * 0.5 : 0;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(S * 0.2 + sd * S * 0.18, -S * 0.45);
    ctx.rotate(sd * (0.9 - clap) + (cheer > 0 ? -0.6 : 0.4));
    ctx.fillStyle = '#7f94a8';
    ell(ctx, 0, S * 0.16, S * 0.08, S * 0.2);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
  // 얼굴
  const fx = S * 0.24, fy = -S * 0.8;
  ctx.fillStyle = '#141a33';
  for (const sd of [-1, 1]) {
    ell(ctx, fx + sd * S * 0.12, fy, S * 0.065, S * (gasp > 0 ? 0.09 : 0.075));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, fx + sd * S * 0.12 + S * 0.02, fy - S * 0.03, S * 0.022, S * 0.022);
    ctx.fill();
    ctx.fillStyle = '#141a33';
  }
  ell(ctx, fx, fy + S * 0.12, S * 0.07, S * 0.05);
  ctx.fill();
  ctx.strokeStyle = 'rgba(29,53,87,.7)';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1])
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(fx + sd * S * 0.08, fy + S * 0.16);
      ctx.lineTo(fx + sd * S * 0.32, fy + S * (0.1 + k * 0.06));
      ctx.stroke();
    }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (gasp > 0) ell(ctx, fx, fy + S * 0.25, S * 0.06, S * 0.07);
  else ctx.arc(fx, fy + S * 0.18, S * 0.08, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.fillStyle = 'rgba(29,53,87,.18)';
  ell(ctx, k * 0.05, k * 0.62, k * 0.32, k * 0.08);
  ctx.fill();
  ctx.fillStyle = '#fff4e6';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-k * 0.08, -k * 0.35);
  ctx.quadraticCurveTo(0, -k * 0.48, k * 0.08, -k * 0.35);
  ctx.lineTo(k * 0.09, 0);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.08, k * 0.32, k * 0.1);
  ctx.lineTo(k * 0.28, k * 0.38);
  ctx.quadraticCurveTo(k * 0.12, k * 0.55, -k * 0.12, k * 0.48);
  ctx.quadraticCurveTo(-k * 0.28, k * 0.3, -k * 0.24, k * 0.1);
  ctx.lineTo(-k * 0.08, k * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/** 거품 덩이 (흰 구름처럼 겹친 원) */
function foam(ctx: C2, x: number, y: number, r: number, seed: number, a: number) {
  ctx.fillStyle = `rgba(214,244,255,${0.9 * a})`;
  for (let i = 0; i < 5; i++) {
    ell(ctx, x + (hsh(seed + i) - 0.5) * r * 1.6, y + (hsh(seed + i * 3) - 0.3) * r * 0.6, r * (0.45 + hsh(seed + i * 7) * 0.35), r * (0.4 + hsh(seed + i * 5) * 0.3));
    ctx.fill();
  }
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  for (let i = 0; i < 5; i++) {
    ell(ctx, x + (hsh(seed + i) - 0.5) * r * 1.5, y + (hsh(seed + i * 3) - 0.5) * r * 0.5 - r * 0.1, r * (0.38 + hsh(seed + i * 7) * 0.3), r * (0.32 + hsh(seed + i * 5) * 0.25));
    ctx.fill();
  }
}

/** 파도 모양: 서퍼 앞(오른쪽)으로 오목하게 내려가는 얼굴, 서퍼 뒤 위쪽의 입술(꼭대기), 뒤로 길게 완만한 등 */
function waveGeom(xs: number, yb: number, Hp: number, w: number) {
  const b = 0.5 * Hp + 0.04 * w, a = b / 3.1;
  return { lipX: xs - a, top: yb - Hp, trX: xs + b, cX: xs + b * 0.3, Wb: 1.1 * Hp + 0.3 * w };
}
/** 서퍼가 선 자리의 얼굴 기울기 (보드를 얼굴 따라 기울인다) */
function faceAngle(Hp: number, w: number) {
  const b = 0.5 * Hp + 0.04 * w, a = b / 3.1, u = 0.906;
  const dx = 2 * (1 - u) * (b * 0.3 - b) + 2 * u * (-a - b * 0.3), dy = 2 * u * -Hp;
  return clamp(Math.atan2(-dy, -dx) * 0.3, -0.1, 0.42);
}
/** 파도 한 덩이: (xs = 서퍼 화면 x, yb = 물길 화면 y, Hp = 높이 px, curl = 말림 0~1) */
function drawWave(ctx: C2, xs: number, yb: number, Hp: number, w: number, curl: number, t: number) {
  if (Hp < 1.5) return;
  const g = waveGeom(xs, yb, Hp, w), top = g.top, lx = g.lipX;
  ctx.save();
  // 물 몸통: 뒤 등(완만) → 꼭대기 → 앞 얼굴(오목)
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(lx - g.Wb, yb + 3);
    ctx.bezierCurveTo(lx - g.Wb * 0.5, yb + 3, lx - g.Wb * 0.28, top + Hp * 0.04, lx, top);
    ctx.quadraticCurveTo(g.cX, yb, g.trX, yb + 3);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = lin(ctx, 0, top, 0, yb, [0, '#a6fbf2'], [0.22, '#54e2e4'], [0.6, '#1fb4dc'], [1, '#168ed0']);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // 햇빛이 비쳐 보이는 얼굴 · 뒤쪽 그늘
  ctx.fillStyle = radg(ctx, xs + (g.trX - xs) * 0.15, top + Hp * 0.45, 0, Hp * 0.75, [0, 'rgba(220,255,250,.6)'], [1, 'rgba(220,255,250,0)']);
  ctx.fillRect(lx - g.Wb, top, g.Wb + g.trX - lx + 4, Hp + 4);
  ctx.fillStyle = lin(ctx, lx - g.Wb, 0, lx, 0, [0, 'rgba(12,90,160,.25)'], [1, 'rgba(12,90,160,0)']);
  ctx.fillRect(lx - g.Wb, top, g.Wb, Hp + 4);
  // 얼굴 따라 흐르는 결
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const u = (i / 5 + t * 0.012) % 1, k = 0.25 + u * 0.7;
    ctx.beginPath();
    ctx.moveTo(lx - g.Wb * 0.18 * (1 - u), top + Hp * k * 0.9);
    ctx.quadraticCurveTo(xs - Hp * 0.05, top + Hp * (k + 0.05), xs + (g.trX - xs) * (0.2 + 0.6 * u), top + Hp * Math.min(1, k + 0.2 + 0.2 * u));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(10,80,150,.16)';
  ctx.fillRect(lx - g.Wb, yb - Hp * 0.14, g.Wb + g.trX - lx + 4, Hp * 0.16);
  ctx.restore();
  // 등 위 거품
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = Math.max(3, Hp * 0.06);
  ctx.beginPath();
  ctx.moveTo(lx - g.Wb * 0.3, top + Hp * 0.16);
  ctx.quadraticCurveTo(lx - g.Wb * 0.12, top + Hp * 0.01, lx, top);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const u = i / 5, px = lx - g.Wb * 0.3 * (1 - u), py = top + Hp * 0.16 * (1 - u) * (1 - u) + Math.sin(t * 0.3 + i) * 1.2;
    ctx.fillStyle = '#ffffff';
    ell(ctx, px, py - 1, 2 + hsh(i) * 2.5 + Hp * 0.022, 2 + hsh(i + 4) * 2 + Hp * 0.016);
    ctx.fill();
  }
  // 입술: 앞으로 말려 서퍼 머리 위를 덮는다 (꼭대기에서 버틸수록 길게, 낮게)
  const c = clamp(curl, 0, 1), L = Hp * (0.2 + 0.4 * c) + 4, drop = Hp * (0.05 + 0.5 * c * c);
  const tipX = lx + L, tipY = top + drop;
  ctx.beginPath();
  ctx.moveTo(lx - Hp * 0.1, top + Hp * 0.03);
  ctx.quadraticCurveTo(lx + L * 0.55, top - Hp * (0.07 + 0.05 * c), tipX, tipY);
  ctx.quadraticCurveTo(lx + L * 0.4, top + drop * 0.45 + Hp * 0.07, lx + Hp * 0.03, top + Hp * 0.12);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, top - Hp * 0.12, 0, tipY + 4, [0, '#c8fff8'], [0.5, '#6be8e6'], [1, '#2cbfe0']);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = Math.max(2.5, Hp * 0.035);
  ctx.beginPath();
  ctx.moveTo(lx - Hp * 0.1, top + Hp * 0.02);
  ctx.quadraticCurveTo(lx + L * 0.55, top - Hp * (0.07 + 0.05 * c), tipX, tipY);
  ctx.stroke();
  foam(ctx, tipX, tipY, 3 + Hp * 0.05 * (0.6 + c), Math.floor(t / 4), 1);
  if (c > 0.05) {
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * c})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const dx = tipX + (hsh(i + Math.floor(t / 3)) - 0.3) * Hp * 0.12, dy = tipY + Hp * 0.05 + i * Hp * 0.05;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + 2, dy + Hp * 0.05);
      ctx.stroke();
    }
  }
  ctx.restore();
}
/** 부서지는 순간: 입술이 앞으로 던져져 내려앉는 물 혀 (age 틱) */
function drawThrow(ctx: C2, x0: number, y0: number, x1: number, yb: number, Hp: number, age: number) {
  const u = clamp(age / 12, 0, 1), tx = x0 + (x1 - x0) * u, ty = y0 + (yb - y0) * u * u;
  // 혀의 뒤끝은 따라오며 짧아진다 (긴 띠가 아니라 쏟아지는 물 덩이)
  const tail = Math.max(0, u - 0.45), bx = x0 + (x1 - x0) * tail, by = y0 + (yb - y0) * tail * tail;
  const cx = (bx + tx) / 2, cy = Math.min(by, ty) - Hp * 0.12 * (1 - u);
  const n = 10, wd = Math.max(5, Hp * 0.16);
  const P = (k: number) => {
    const v = k / n, q = 1 - v;
    return [q * q * bx + 2 * v * q * cx + v * v * tx, q * q * by + 2 * v * q * cy + v * v * ty];
  };
  ctx.beginPath();
  for (let k = 0; k <= n; k++) {
    const [px, py] = P(k), r = wd * (0.15 + 0.85 * (k / n)) * 0.5;
    if (k) ctx.lineTo(px, py - r);
    else ctx.moveTo(px, py - r);
  }
  for (let k = n; k >= 0; k--) {
    const [px, py] = P(k), r = wd * (0.15 + 0.85 * (k / n)) * 0.5;
    ctx.lineTo(px, py + r);
  }
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, ty - wd, 0, ty + wd, [0, 'rgba(210,255,250,.95)'], [1, 'rgba(60,205,225,.9)']);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 2;
  ctx.stroke();
  foam(ctx, tx, ty, 5 + Hp * 0.08, Math.floor(age / 2) + 3, 1);
}

// ── 연출 상태 (그리기 전용, 시뮬레이션과 무관) ──
interface Deb { k: IK; v: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; t0: number; chunk: boolean }
interface Spr { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string }
const FXW = new WeakMap<object, { deb: Deb[]; spr: Spr[]; seed: number }>();
function fxw(s: object) {
  let f = FXW.get(s);
  if (!f) FXW.set(s, (f = { deb: [], spr: [], seed: 7 }));
  return f;
}
function rnd(f: { seed: number }) {
  f.seed = (f.seed * 16807) % 2147483647;
  return f.seed / 2147483647;
}
function spray(f: { spr: Spr[]; seed: number }, x: number, y: number, n: number, sp: number, up: number, col = '#ffffff', r = 3) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (rnd(f) - 0.5) * 2.4, v = sp * (0.4 + rnd(f));
    const life = 26 + rnd(f) * 22;
    f.spr.push({ x, y, vx: Math.cos(a) * v + up * 0.3, vy: -Math.sin(a) * v * 1.2, life, max: life, r: r * (0.5 + rnd(f)), c: col });
  }
  if (f.spr.length > 260) f.spr.splice(0, f.spr.length - 260);
}

function drawAll(ctx: C2, s: SurfState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), f = fxw(s), t = s.t, d = STAGES[s.stage];
  const R = (r: number) => r * w;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const lsc = Math.min(3, Math.max(1, Math.round(sc)));
  const bg = getBg(Math.round(w), Math.round(h), lsc, d.place);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  // 카메라: 서퍼를 따라간다 (판이 바뀌면 바로)
  if (fx.memo.cam === undefined || fx.memo.stg !== s.stage * 100 + s.tries || Math.abs(fx.memo.cam - s.x) > 1) fx.memo.cam = s.x;
  fx.memo.stg = s.stage * 100 + s.tries;
  fx.memo.cam += (s.x - fx.memo.cam) * 0.35;
  const cam = fx.memo.cam;
  const X = (x: number) => (x - cam + CAMX) * w, Y = (y: number) => (SEA - y) * w;
  const yb = Y(0);
  const U = R(BODY * 1.12);
  const seenT = fx.memo.t ?? -1;
  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.kind) {
      case 'charge':
        fx.ring(X(s.x), yb, 'rgba(255,255,255,.9)', R(0.08), 3);
        spray(f, s.x, 0.01, 6, 0.006, 0, '#e8fbff', 2.5);
        break;
      case 'break': {
        const H = Number(e.text) || 0;
        spray(f, e.x - 0.03, e.y + 0.05, 18 + Math.round(H * 50), 0.012 + H * 0.02, 0.006, '#ffffff', 3 + H * 4);
        fx.kick(3 + H * 12);
        if (H > 0.25) fx.pop(ex - R(0.02), ey - R(0.12), '쏴아!', '#ffffff', Math.round(R(0.06) + H * R(0.07)));
        fx.memo.breakT = t;
        fx.memo.breakH = H;
        break;
      }
      case 'sweep': {
        const it = s.items.find((q) => q.id === e.id);
        const v = it?.v ?? 0, k = e.k ?? 'castle';
        f.deb.push({ k, v, x: e.x, y: k === 'boat' ? 0.05 : 0.04, vx: 0.014 + rnd(f) * 0.01, vy: (k === 'boat' ? 0.024 : 0.018) + rnd(f) * 0.012, rot: 0, vr: (rnd(f) - 0.5) * 0.4, t0: t, chunk: false });
        if (k === 'castle') for (let i = 0; i < 7; i++) f.deb.push({ k, v: v + i, x: e.x + (rnd(f) - 0.5) * 0.06, y: 0.03 + rnd(f) * 0.07, vx: 0.006 + rnd(f) * 0.014, vy: 0.008 + rnd(f) * 0.016, rot: rnd(f) * 3, vr: (rnd(f) - 0.5) * 0.5, t0: t, chunk: true });
        if (f.deb.length > 70) f.deb.splice(0, f.deb.length - 70);
        spray(f, e.x, 0.03, 12, 0.012, 0.006, k === 'castle' ? '#ffe2a0' : '#ffffff', 3);
        fx.ring(ex, yb - R(0.03), 'rgba(255,255,255,.95)', R(0.07 + 0.01 * (e.n ?? 1)), 4);
        fx.kick(2 + (e.n ?? 1) * 1.2);
        if (e.text) fx.pop(ex, yb - R(0.16 + 0.03 * ((e.n ?? 1) % 3)), `+${e.text}`, (e.n ?? 1) >= 3 ? '#ffe14a' : '#ffffff', Math.min(30, 15 + (e.n ?? 1) * 3));
        if ((e.n ?? 1) >= 3) (fx.memo.bigT = t), (fx.memo.bigN = e.n ?? 3), (fx.memo.bigK = 1), (fx.memo.bigX = ex), (fx.memo.cheerT = t);
        if (k === 'boat') (fx.memo.bigT = t), (fx.memo.bigK = 4), (fx.memo.bigX = ex), (fx.memo.cheerT = t);
        fx.memo['gone' + (e.id ?? 0)] = t;
        break;
      }
      case 'land':
        spray(f, e.x, 0.01, 10 + (e.n ?? 0) * 4, 0.01, 0.004, '#ffffff', 3);
        fx.memo.landT = t;
        if ((e.n ?? 0) === 1) fx.pop(ex, yb - R(0.24), '공중제비!', '#ffffff', 16);
        if ((e.n ?? 0) >= 2) (fx.memo.bigT = t), (fx.memo.bigN = e.n ?? 2), (fx.memo.bigK = 2), (fx.memo.bigX = ex), (fx.memo.cheerT = t);
        break;
      case 'crash':
      case 'wipe':
        spray(f, e.x, e.y + 0.05, 24, 0.016, -0.004, '#ffffff', 4);
        fx.kick(10);
        fx.blink('#ffffff', 0.35);
        fx.pop(ex, ey - R(0.2), e.kind === 'wipe' ? '말렸다!' : e.k === 'pier' ? '꽝!' : '쾅!', '#ff6a4a', 26);
        fx.memo.gaspT = t;
        break;
      case 'sting':
        spray(f, e.x, 0.02, 10, 0.01, 0, '#ffb3e0', 3);
        fx.blink('#ff9ad5', 0.25);
        fx.kick(4);
        fx.pop(ex, ey - R(0.2), '따끔!', '#ff7ac8', 22);
        fx.memo.stingT = t;
        fx.memo.gaspT = t;
        break;
      case 'dolphin':
        spray(f, e.x, 0.02, 20, 0.014, 0.004, '#ffffff', 3.5);
        fx.ring(ex, yb, '#ffffff', R(0.12), 4);
        fx.kick(5);
        fx.pop(ex, yb - R(0.2), '돌고래 점프!', '#bff4ff', 20);
        (fx.memo.bigT = t), (fx.memo.bigK = 3), (fx.memo.bigX = ex), (fx.memo.cheerT = t);
        fx.memo['dol' + Math.round(e.x * 1000)] = t;
        break;
      case 'hop':
        spray(f, e.x, e.y, 6, 0.008, 0.002, '#f0c287', 2.5);
        fx.pop(ex, ey - R(0.18), '통!', '#ffe9b8', 18);
        fx.kick(3);
        break;
      case 'shell':
        fx.burst(ex, ey, '#ffd1dc', 10, 2.6, 2.4);
        fx.burst(ex, ey, '#ffffff', 6, 2, 2);
        fx.pop(ex, ey - R(0.05), '+15', '#ffe0ea', 14);
        break;
      case 'clear':
        for (let i = 0; i < 4; i++) fx.burst(R(0.2 + i * 0.2), R(0.35), ['#ffd23a', '#ff6a5a', '#3fd0e0', '#ffffff'][i], 22, 4, 3);
        fx.memo.cheerT = t;
        break;
    }
  }
  fx.memo.t = t;

  ctx.save();
  ctx.fillStyle = '#2b9be6';
  ctx.fillRect(-30, -30, w + 60, R(0.5));
  ctx.fillStyle = '#ffd892';
  ctx.fillRect(-30, R(1.2), w + 60, h - R(1.2) + 30);
  fx.begin(ctx);
  // ═════ 하늘 · 해 · 구름 · 갈매기 ═════
  ctx.drawImage(bg.sky, -12, -12, w + 24, R(0.86) + 12);
  ctx.save();
  ctx.translate(R(0.8), R(0.19));
  ctx.rotate(t * 0.002);
  ctx.fillStyle = 'rgba(255,250,210,.16)';
  for (let i = 0; i < 10; i++) {
    ctx.rotate(TAU / 10);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(R(0.45), -R(0.03));
    ctx.lineTo(R(0.45), R(0.03));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 5; i++) {
    const cw = R(0.18 + hsh(i * 3) * 0.14), cx = ((((hsh(i) * 1.6 - cam * 0.04 + t * 0.00012 * (1 + i * 0.2)) % 1.6) + 1.6) % 1.6) * w - R(0.25), cy = R(0.2 + hsh(i * 5) * 0.28);
    ctx.fillStyle = 'rgba(180,215,240,.5)';
    for (let j = 0; j < 5; j++) {
      ell(ctx, cx + (j - 2) * cw * 0.2, cy + cw * 0.06, cw * (0.16 + hsh(i * 7 + j) * 0.08), cw * 0.1);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < 5; j++) {
      ell(ctx, cx + (j - 2) * cw * 0.2, cy - Math.sin((j / 4) * Math.PI) * cw * 0.1, cw * (0.15 + hsh(i * 7 + j) * 0.09), cw * (0.12 + Math.sin((j / 4) * Math.PI) * 0.06));
      ctx.fill();
    }
  }
  for (let i = 0; i < 3; i++) {
    const gx = ((((hsh(i + 20) * 1.4 + t * 0.0009 * (1 + i * 0.3) - cam * 0.25) % 1.4) + 1.4) % 1.4) * w - R(0.2), gy = R(0.28 + i * 0.07) + Math.sin(t * 0.03 + i) * R(0.02);
    const fl = Math.sin(t * 0.25 + i * 2), gs = R(0.03);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gx - gs, gy - fl * gs * 0.5);
    ctx.quadraticCurveTo(gx - gs * 0.4, gy - gs * 0.4, gx, gy);
    ctx.quadraticCurveTo(gx + gs * 0.4, gy - gs * 0.4, gx + gs, gy - fl * gs * 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,90,130,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // ═════ 먼 섬 · 수평선 바다 · 먼 해변 ═════
  tile(ctx, bg.far, lsc, cam * R(0.08), R(HZ - 0.42 + BGY), w);
  ctx.fillStyle = lin(ctx, 0, R(HZ + BGY), 0, R(0.71 + BGY), [0, '#1667c4'], [1, '#1f8bd8']);
  ctx.fillRect(0, R(HZ + BGY), w, R(0.71 - HZ));
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  for (let i = 0; i < 14; i++) {
    const sx = ((((hsh(i * 3.3) - cam * 0.12 + t * 0.0005) % 1) + 1) % 1) * w, sy = R(HZ + BGY + 0.01 + hsh(i * 1.7) * 0.07);
    ctx.fillRect(sx, sy, R(0.02) * (0.5 + Math.abs(Math.sin(t * 0.05 + i))), 1.2);
  }
  tile(ctx, bg.shore, lsc, cam * R(0.3), R(SHORE_Y + BGY), w);
  // ═════ 석호 (청록 → 물길) ═════
  const ebb = d.place === 3;
  ctx.fillStyle = ebb ? lin(ctx, 0, R(0.78 + BGY), 0, yb, [0, '#38aee0'], [0.5, '#3cc4dc'], [1, '#4dd4d6']) : lin(ctx, 0, R(0.78 + BGY), 0, yb, [0, '#2a9fdc'], [0.5, '#24b6dc'], [1, '#22c8d8']);
  ctx.fillRect(0, R(0.775 + BGY), w, yb - R(0.775 + BGY) + 1);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillRect(0, R(0.775 + BGY), w, 1.5);
  for (let i = 0; i < 26; i++) {
    const sx = ((((hsh(i * 7.1) * 1.3 - cam * 0.6 + t * 0.0008) % 1.3) + 1.3) % 1.3) * w - R(0.1), sy = R(0.79 + BGY + hsh(i * 2.9) * (SEA - 0.82 - BGY));
    const a = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.04 + i * 1.3));
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + R(0.02), sy - 2, sx + R(0.04 + hsh(i) * 0.03), sy);
    ctx.stroke();
  }

  // ═════ 물길 위 ═════
  const vis = (a: number, b: number) => X(b) > -R(0.3) && X(a) < w + R(0.3);
  const goneAt = (it: Item) => s.goneT.get(it.id);
  const isGone = (it: Item) => {
    const g0 = goneAt(it);
    return g0 !== undefined && t >= g0;
  };
  // 등대 (결승)
  if (vis(s.L - 0.3, s.L + 0.3)) drawLighthouse(ctx, X(s.L + 0.12), yb + 2, R(0.2), t);
  // 결승 부표줄
  if (vis(s.L - 0.1, s.L + 0.1)) {
    for (let i = 0; i < 4; i++) {
      const bx = X(s.L) - R(0.012) * i, by = yb + 3 + i * R(0.035);
      ctx.fillStyle = i % 2 ? '#ffffff' : '#ff5a3c';
      ell(ctx, bx, by + Math.sin(t * 0.1 + i) * 1.5, R(0.012), R(0.012));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // 모래톱
  for (const it of s.items) {
    if (it.k !== 'sand' || !vis(it.x, it.x + it.w)) continue;
    const a = X(it.x), b = X(it.x + it.w), top = yb - R(0.022);
    ctx.fillStyle = lin(ctx, 0, top, 0, yb + 4, [0, '#fff0c8'], [0.6, '#f6d796'], [1, '#d9b26a']);
    ctx.beginPath();
    ctx.moveTo(a - R(0.03), yb + 4);
    ctx.quadraticCurveTo(a + R(0.02), top, a + R(0.08), top);
    ctx.lineTo(b - R(0.08), top);
    ctx.quadraticCurveTo(b - R(0.02), top, b + R(0.03), yb + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    const lap = Math.sin(t * 0.07 + it.v) * R(0.008);
    ctx.beginPath();
    ctx.moveTo(a - R(0.035) - lap, yb + 3);
    ctx.quadraticCurveTo(a + R(0.01), yb - R(0.004), a + R(0.06), top + R(0.008));
    ctx.moveTo(b + R(0.035) + lap, yb + 3);
    ctx.quadraticCurveTo(b - R(0.01), yb - R(0.004), b - R(0.06), top + R(0.008));
    ctx.stroke();
  }
  // ═════ 부서진 파도 · 거품 ═════
  for (const b of s.breaks) {
    const age = t - b.t, xs = X(b.x);
    if (age < 24) {
      const k = 1 - age / 24;
      drawWave(ctx, xs, yb, R(b.H) * k * k, w, Math.min(1, 0.5 + age / 8), t);
    }
    // 입술이 앞으로 던져져 내려앉는다
    const lo = b.x + bandLo(b.H), hi = b.x + bandHi(b.H);
    if (age < 16 && b.H > 0.08) {
      const g0 = waveGeom(xs, yb, R(b.H), w);
      drawThrow(ctx, g0.lipX + R(b.H) * 0.2, g0.top + R(b.H) * 0.05, X(b.x + lipD(b.H)), yb - R(0.01), R(b.H), age);
    }
    if (age >= 8 && age < 80 && b.H > 0.08) {
      const a = Math.max(0, Math.min(1, (age - 8) / 5)) * Math.max(0, 1 - (age - 30) / 50);
      ctx.fillStyle = `rgba(255,255,255,${0.45 * a})`;
      ctx.beginPath();
      ctx.ellipse((X(lo) + X(hi)) / 2, yb + 1, (X(hi) - X(lo)) / 2, R(0.014), 0, 0, TAU);
      ctx.fill();
    }
  }
  // ═════ 지금 키우는 파도 ═════
  const sx = X(s.x), wob = Math.sin(t * 0.09) * 1.2;
  if (s.mode === CHARGE && s.phase === 'play') {
    const cu = curlOf(s);
    drawWave(ctx, sx, yb, R(s.H), w, cu, t);
    if (t % 3 === 0) spray(f, s.x - 0.05 - s.H * 0.2, s.H * 0.98, 1, 0.006, -0.004, '#ffffff', 2.5);
  }
  // 해변 물건 · 장애물 (파도 앞 — 키우는 동안에도 보이게)
  const near = (it: Item) => Math.abs(it.x - s.x);
  for (let i = 0; i < s.items.length; i++) {
    const it = s.items[i];
    if (it.k === 'sand' || it.k === 'pier' || it.k === 'shell' || !vis(x0(it), x1(it))) continue;
    if (SWEEP[it.k] && isGone(it)) continue;
    const x = X(it.x);
    switch (it.k) {
      case 'castle':
        drawCastle(ctx, x, yb - R(0.018), R(0.105), it.v, t);
        break;
      case 'ball':
        drawBall(ctx, x, yb - R(0.018) - R(0.038) - Math.abs(Math.sin(t * 0.06 + it.v)) * 2, R(0.038), Math.sin(t * 0.03 + it.v) * 0.3);
        break;
      case 'parasol':
        drawParasol(ctx, x, yb - R(0.018), R(0.12), it.v, 0);
        break;
      case 'crab': {
        const sc2 = s.mode === CHARGE && it.x > s.x && it.x - s.x < 1 ? 1 : 0;
        drawCrab(ctx, x + (sc2 ? Math.sin(t * 0.8 + it.v) * 1.5 : Math.sin(t * 0.05 + it.v) * R(0.008)), yb - R(0.02), R(0.075), t, sc2 ? 1 : Math.sin(t * 0.08 + it.v) * 0.5, 0, sc2 > 0);
        break;
      }
      case 'rock':
        drawRock(ctx, x, yb + 2, R(it.w), R(it.h), it.v, t, it.h > 0.4);
        break;
      case 'boat':
        if (!isGone(it)) drawBoat(ctx, x, yb + 2, R(0.075), it.v, t, s.flag[i] === 2 ? 0.5 : 0, s.mode === CHARGE && it.x > s.x ? 1 : 0);
        break;
      case 'jelly': {
        const n = Math.max(2, Math.round(it.w / 0.13));
        for (let k = 0; k < n; k++) drawJelly(ctx, X(it.x + ((k + 0.5) * it.w) / n), yb + 2, R(0.052), t, k * 1.7 + it.v, s.mode !== AIR && it.x - s.x < 0.45 && it.x + it.w > s.x ? 1 : 0);
        break;
      }
      case 'dolphin': {
        const used = fx.memo['dol' + Math.round(it.x * 1000)];
        const up = s.mode === AIR && it.x > s.x - 0.05 && it.x - s.x < 0.5 && !s.flag[i] ? 1 : 0;
        if (s.flag[i] && used !== undefined && t - used > 60) break;
        drawDolphin(ctx, x, yb + R(0.012), R(0.055), t, up, s.flag[i] && used !== undefined ? t - used : 0);
        break;
      }
    }
    void near;
  }
  if (s.surge) {
    const sg = s.surge, age = t - sg.t0 - 10;
    if (age >= 0) {
      const span = sg.end - sg.x0, prog = Math.min(1, (age * VS) / span), fxw2 = sg.x0 + span * prog;
      const fade = prog >= 1 ? Math.max(0, 1 - (age - span / VS) / 30) : 1;
      const hgt = R(0.05 + sg.H * 0.26) * (1 - prog * 0.55) * fade;
      // 거품 카펫
      ctx.fillStyle = `rgba(255,255,255,${0.5 * fade})`;
      ctx.fillRect(X(sg.x0), yb - R(0.012), X(fxw2) - X(sg.x0), R(0.02));
      for (let i = 0; i < 8; i++) {
        const u = i / 8, px = X(sg.x0) + (X(fxw2) - X(sg.x0)) * u;
        foam(ctx, px, yb - R(0.01), R(0.02) + hgt * 0.25 * u, sg.t0 + i * 7, 0.7 * fade);
      }
      // 거품 벽 (앞머리)
      if (fade > 0.05) {
        ctx.fillStyle = lin(ctx, 0, yb - hgt, 0, yb, [0, `rgba(255,255,255,${fade})`], [1, `rgba(120,220,235,${0.7 * fade})`]);
        ctx.beginPath();
        ctx.moveTo(X(fxw2) - R(0.12), yb + 2);
        ctx.quadraticCurveTo(X(fxw2) - R(0.05), yb - hgt * 1.05, X(fxw2) + R(0.02), yb - hgt * 0.6);
        ctx.quadraticCurveTo(X(fxw2) + R(0.05), yb - hgt * 0.2, X(fxw2) + R(0.04), yb + 2);
        ctx.closePath();
        ctx.fill();
        foam(ctx, X(fxw2) - R(0.02), yb - hgt * 0.75, R(0.025) + hgt * 0.3, Math.floor(t / 3), fade);
        if (prog < 1 && t % 2 === 0) spray(f, fxw2, hgt / w, 2, 0.008, 0.01, '#ffffff', 2.5);
      }
    }
  }
  // 서퍼 그림자
  if (s.mode === AIR || s.mode === TUMBLE) {
    const k = Math.max(0.2, 1 - s.h * 1.2);
    ctx.fillStyle = `rgba(10,70,120,${0.25 * k})`;
    ell(ctx, sx, yb + 2, U * 0.45 * k, U * 0.06 * k);
    ctx.fill();
  }
  // ═════ 서퍼 ═════
  {
    const age = (q: number | undefined) => (q === undefined ? 999 : t - q);
    let pose: SPose = { crouch: 0.1, arms: 'bal', face: 'grin', glassesUp: false, board: true, lean: 0 };
    let ang = 0, y = Y(s.h) + (s.mode === RIDE || s.mode === IDLE ? 2 + wob : 0);
    const x = sx;
    if (s.mode === IDLE) {
      const ph = (t % 220) / 220;
      pose = { crouch: 0, arms: 'up', face: ph < 0.4 ? 'yawn' : 'grin', glassesUp: true, board: true, lean: -0.05 };
    } else if (s.mode === CHARGE) {
      const cu = curlOf(s), k = s.H / STAGES[s.stage].hmax;
      pose = { crouch: 0.3 + 0.6 * k, arms: 'bal', face: cu > 0.3 ? 'panic' : 'focus', glassesUp: false, board: true, lean: 0.12 + 0.15 * k };
      ang = faceAngle(R(s.H), w) + Math.sin(t * 0.3) * 0.03;
    } else if (s.mode === AIR) {
      ang = airAngle(s);
      const spinning = s.air.F > 0 && ang > 0.3 && ang < s.air.F * TAU - 0.3;
      pose = { crouch: spinning ? 1 : 0.2, arms: spinning ? 'tuck' : age(fx.memo.stingT) < 30 ? 'flail' : 'yeah', face: age(fx.memo.stingT) < 30 ? 'ouch' : 'whee', glassesUp: false, board: true, lean: 0 };
    } else if (s.mode === TUMBLE) {
      const ca = t - s.crashAt;
      pose = { crouch: 0.2, arms: 'flail', face: 'dizzy', glassesUp: false, board: false, lean: 0 };
      ang = s.h > 0.01 ? ca * 0.32 : Math.sin(ca * 0.2) * 0.4;
      y = Y(s.h) + (s.h > 0.01 ? 0 : R(0.03));
      // 튕겨 나간 보드
      const bu = Math.min(1, ca / 40), bxp = x + R(0.18) * bu, byp = Y(s.h) - R(0.25) * Math.sin(bu * Math.PI) + R(0.01) * bu;
      drawBoard(ctx, bxp, byp, U, ca * 0.4);
      if (s.h <= 0.01 && ca % 6 === 0) spray(f, s.x, 0.01, 3, 0.008, 0, '#ffffff', 2.5);
    } else {
      const la = age(fx.memo.landT);
      pose = { crouch: la < 12 ? 0.5 - la * 0.03 : 0.1, arms: la < 40 && s.air.F >= 1 ? 'yeah' : 'bal', face: age(fx.memo.stingT) < 30 ? 'ouch' : 'grin', glassesUp: false, board: true, lean: 0.03 };
    }
    if (s.phase === 'result') pose = s.ok ? { crouch: 0, arms: 'yeah', face: 'whee', glassesUp: false, board: true, lean: 0 } : { ...pose, face: 'dizzy' };
    if (s.inv > 0 && s.mode !== TUMBLE && s.inv % 8 < 3) ctx.globalAlpha = 0.55;
    drawSurfer(ctx, x, y, U, ang, pose, t);
    ctx.globalAlpha = 1;
    // 물 가르기
    if (s.mode === RIDE && t % 4 === 0) spray(f, s.x - 0.06, 0.005, 1, 0.005, -0.006, '#ffffff', 2.4);
  }
  // 부두 (서퍼 앞)
  for (const it of s.items) {
    if (it.k !== 'pier' || !vis(it.x, it.x + it.w)) continue;
    const a = X(it.x), b = X(it.x + it.w), yt = Y(it.h + DECK);
    drawPierPosts(ctx, a, b, yb + 2, yb + 2 - Y(it.h), t);
    drawPierDeck(ctx, a, b, yt, R(DECK), it.v);
  }
  // 조개 방울
  for (let i = 0; i < s.items.length; i++) {
    const it = s.items[i];
    if (it.k !== 'shell' || s.flag[i] || !vis(it.x - 0.05, it.x + 0.05)) continue;
    drawShell(ctx, X(it.x), Y(it.h), R(0.027), t, it.v);
  }
  // ═════ 날아가는 것들 ═════
  for (const q of f.deb) {
    q.x += q.vx;
    q.y += q.vy;
    q.vy -= G * 0.75;
    q.rot += q.vr;
    if (q.y < -0.02 && q.vy < 0) {
      spray(f, q.x, 0, q.chunk ? 2 : 8, 0.008, 0, '#ffffff', 2.5);
      q.t0 = -1;
      continue;
    }
    const x = X(q.x), y = Y(q.y);
    if (q.chunk) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.v % 2 ? '#f5cf86' : '#ffe2a6';
      ctx.fillRect(-R(0.012), -R(0.01), R(0.024), R(0.02));
      ctx.strokeStyle = '#a26f2c';
      ctx.lineWidth = 1;
      ctx.strokeRect(-R(0.012), -R(0.01), R(0.024), R(0.02));
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(q.rot);
    if (q.k === 'castle') drawCastle(ctx, 0, R(0.04), R(0.08), q.v, t);
    else if (q.k === 'ball') drawBall(ctx, 0, 0, R(0.038), q.rot);
    else if (q.k === 'parasol') drawParasol(ctx, 0, R(0.06), R(0.12), q.v, 0.01);
    else if (q.k === 'crab') drawCrab(ctx, 0, R(0.02), R(0.075), t, 1, 0, true);
    else if (q.k === 'boat') drawBoat(ctx, 0, 0, R(0.075), q.v, t, 0, 1);
    ctx.restore();
    if ((q.k === 'crab' || q.k === 'boat') && t - q.t0 < 40) {
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(29,53,87,.6)';
      ctx.fillStyle = '#ffffff';
      const txt = q.k === 'crab' ? '으악!' : '냐아아!';
      ctx.strokeText(txt, x, y - R(0.07));
      ctx.fillText(txt, x, y - R(0.07));
    }
  }
  f.deb = f.deb.filter((q) => q.t0 >= 0 && X(q.x) < w + R(0.5));
  // ═════ 가까운 얕은 물 ═════
  ctx.fillStyle = ebb ? lin(ctx, 0, yb, 0, R(1.25), [0, 'rgba(70,214,214,.9)'], [0.5, 'rgba(150,226,200,.94)'], [1, 'rgba(214,226,170,.98)']) : lin(ctx, 0, yb, 0, R(1.25), [0, 'rgba(38,200,214,.93)'], [0.5, 'rgba(70,220,214,.95)'], [1, 'rgba(140,236,214,.98)']);
  ctx.fillRect(0, yb + 1, w, R(1.26) - yb);
  // 물길 수면선 (반짝 + 잔물결)
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const px = (i / 40) * w, py = yb + 1.5 + Math.sin(i * 0.9 + t * 0.12 - cam * 30) * 1.4;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  // 물속 빛 무늬 · 모래 바닥
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) {
    const py = yb + R(0.03) + i * R(0.018), off = (cam * w * 1.05 + i * 37) % R(0.12);
    ctx.beginPath();
    for (let px = -off; px < w + R(0.12); px += R(0.12)) {
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + R(0.03), py - R(0.01) + Math.sin(t * 0.05 + i + px * 0.02) * 2, px + R(0.06), py);
    }
    ctx.stroke();
  }
  // 해파리 다리 (물속)
  for (const it of s.items) {
    if (it.k !== 'jelly' || !vis(it.x, it.x + it.w)) continue;
    const n = Math.max(2, Math.round(it.w / 0.13));
    for (let k = 0; k < n; k++) drawJellyLegs(ctx, X(it.x + ((k + 0.5) * it.w) / n), yb + 2, R(0.052), t, k * 1.7 + it.v);
  }
  // 물에 비친 서퍼 · 반사광
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ell(ctx, sx, yb + R(0.03), U * 0.5, R(0.012));
  ctx.fill();
  // ═════ 앞 모래밭 · 구경꾼 ═════
  const fcam = cam * R(1.2);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.moveTo(0, R(1.24));
  for (let i = 0; i <= 30; i++) {
    const px = (i / 30) * w, py = R(1.232) + Math.sin(i * 0.7 + t * 0.05 - fcam * 0.04) * R(0.006) + Math.sin(t * 0.03) * R(0.004);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(w, R(1.26));
  ctx.lineTo(0, R(1.26));
  ctx.fill();
  tile(ctx, bg.fore, lsc, fcam, R(FORE_Y), w);
  const cheer = t - (fx.memo.cheerT ?? -999) < 70 ? 1 : 0, gasp = t - (fx.memo.gaspT ?? -999) < 50 ? 1 : 0;
  const PER = 2.6;
  for (let k = Math.floor((fcam / w - 0.5) / PER); k <= Math.floor((fcam / w + 1.5) / PER); k++) {
    const sxp = (k * PER + 0.55) * w - fcam, cxp = (k * PER + 1.75) * w - fcam;
    if (sxp > -R(0.3) && sxp < w + R(0.3)) drawSeal(ctx, sxp, R(1.315), R(0.1), t + k * 17, cheer, gasp);
    if (cxp > -R(0.2) && cxp < w + R(0.2)) {
      // 양동이 · 삽 · 게
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(cxp - R(0.09), R(1.3));
      ctx.lineTo(cxp - R(0.05), R(1.3));
      ctx.lineTo(cxp - R(0.056), R(1.34));
      ctx.lineTo(cxp - R(0.084), R(1.34));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.strokeStyle = '#2f9cf6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cxp - R(0.03), R(1.34));
      ctx.lineTo(cxp - R(0.0), R(1.29));
      ctx.stroke();
      drawCrab(ctx, cxp + R(0.07), R(1.34) - (cheer ? Math.abs(Math.sin(t * 0.4)) * R(0.02) : 0), R(0.065), t, cheer ? 1 : Math.sin(t * 0.06) * 0.3, 0, gasp > 0);
    }
  }
  // ═════ 미리 보기 (누르는 동안): 파도가 내려앉을 자리 · 뛰는 길 ═════
  if (s.mode === CHARGE && s.phase === 'play') {
    const H = s.H, lo = s.x + bandLo(H), hi = s.x + bandHi(H), pulse = 0.5 + 0.5 * Math.sin(t * 0.3);
    if (H >= 0.1) {
      ctx.fillStyle = `rgba(255,255,255,${0.28 + 0.12 * pulse})`;
      ell(ctx, (X(lo) + X(hi)) / 2, yb - R(0.004), (X(hi) - X(lo)) / 2, R(0.022));
      ctx.fill();
      ctx.setLineDash([R(0.016), R(0.012)]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.setLineDash([]);
      // 휩쓸릴 것에 노란 고리
      for (let i = s.ii; i < s.items.length; i++) {
        const it = s.items[i];
        if (x0(it) > hi) break;
        if (!SWEEP[it.k] || s.flag[i] || it.x < lo || it.x > hi || (it.k === 'boat' && H < 0.3)) continue;
        ctx.strokeStyle = `rgba(255,225,74,${0.7 + 0.3 * pulse})`;
        ctx.lineWidth = 2.5;
        ell(ctx, X(it.x), yb - R(it.k === 'boat' ? 0.1 : 0.05), R(it.k === 'boat' ? 0.1 : 0.055), R(it.k === 'boat' ? 0.12 : 0.065));
        ctx.stroke();
      }
    }
    // 뛰는 길 (지금 떼면)
    const c = simClone(s);
    input(c, false);
    const pts: number[][] = [];
    let bad = -1;
    for (let k = 0; k < 160 && c.phase === 'play'; k++) {
      physics(c);
      if (k % 3 === 0) pts.push([X(c.x), Y(c.h + BODY * 0.4)]);
      if (c.falls > s.falls || c.stings > s.stings) {
        bad = pts.length - 1;
        break;
      }
      if (c.mode === RIDE) break;
    }
    for (let k = 1; k < pts.length; k++) {
      const red = bad >= 0 && k >= bad - 1;
      ctx.fillStyle = red ? '#ff5a4a' : '#ffffff';
      ctx.globalAlpha = red ? 1 : 0.95 - (k / pts.length) * 0.3;
      ell(ctx, pts[k][0], pts[k][1], red ? 3.4 : 3, red ? 3.4 : 3);
      ctx.fill();
      ctx.strokeStyle = red ? '#8a1a1a' : 'rgba(29,53,87,.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (bad >= 0 && pts[bad]) {
      const [bx, by] = pts[bad];
      ctx.strokeStyle = '#ff5a4a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by - 6);
      ctx.lineTo(bx + 6, by + 6);
      ctx.moveTo(bx + 6, by - 6);
      ctx.lineTo(bx - 6, by + 6);
      ctx.stroke();
    }
    // 말림 경고
    const cu = curlOf(s);
    if (cu > 0) {
      const bx = sx + R(0.02), by = Y(s.h + BODY) - R(0.06);
      ctx.fillStyle = cu > 0.5 && t % 8 < 4 ? '#ff4d3d' : '#ffb12e';
      ell(ctx, bx, by, R(0.03), R(0.03));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('!', bx, by + 1);
    }
  }
  // 물보라 입자 (세상 좌표)
  for (const p of f.spr) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy -= G * 0.6;
    p.life--;
    if (p.y < -0.01) p.life = Math.min(p.life, 3);
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.c;
    ell(ctx, X(p.x), Y(p.y), p.r, p.r);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  f.spr = f.spr.filter((p) => p.life > 0);
  // NEW 스포트라이트
  if (s.spot) {
    const it = s.items.find((q) => q.id === s.spot!.id), age = t - s.spot.t;
    if (it && age < 120) {
      const cx = X(SPAN(it.k) ? it.x + it.w / 2 : it.x), cy = yb - R(it.k === 'rock' ? it.h / 2 : it.k === 'pier' ? it.h : it.k === 'boat' ? 0.15 : 0.05);
      const span = it.k === 'pier' || it.k === 'jelly', r0 = R(span ? it.w / 2 + 0.03 : it.k === 'boat' ? 0.15 : Math.max(0.08, (it.k === 'rock' ? it.h / 2 : 0.05) + 0.05));
      const ry = span ? R(0.08) : r0 * 0.75;
      const a = Math.min(1, age / 8) * Math.min(1, (120 - age) / 20);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffe14a';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([R(0.02), R(0.012)]);
      ctx.lineDashOffset = -t * 0.8;
      ell(ctx, cx, cy, r0 + Math.sin(t * 0.2) * 3, ry + Math.sin(t * 0.2) * 3);
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.04, 900);
      const label = `NEW  ${s.spot.label}`, tw = ctx.measureText(label).width + R(0.05);
      const lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6), ly = Math.max(R(0.24), cy - ry - R(0.05));
      ctx.fillStyle = '#ff5a3c';
      rr(ctx, lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // 첫 안내: 손가락 하나 + 한 줄
  const firstHint = s.stage === 0 && s.phase === 'play' && !s.firstRelease;
  if (firstHint) {
    const holding = s.mode === CHARGE;
    const bx = w * (holding ? 0.62 : 0.62), by = R(holding ? 1.19 : 0.55);
    const txt = holding ? (s.H > STAGES[0].hmax * 0.8 ? '이제 떼요 — 쏴아!' : '꾹… 파도가 솟아요') : '꾹 누르면 파도가 솟아요';
    font(0.046, 900);
    const tw = ctx.measureText(txt).width + R(0.06);
    ctx.fillStyle = 'rgba(29,53,87,.2)';
    rr(ctx, bx - tw / 2 + 3, by - R(0.035) + 4, tw, R(0.07), R(0.035));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    rr(ctx, bx - tw / 2, by - R(0.035), tw, R(0.07), R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#ff8a3c';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = OUT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, bx, by + 1);
    if (!holding) drawHand(ctx, bx + R(0.02), by + R(0.13), R(0.14), Math.max(0, Math.sin(t * 0.12)));
  }
  // 큰 순간 띠
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 60) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN ?? 3, K = fx.memo.bigK ?? 1, sc2 = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (60 - age) / 16);
    const txt = K === 1 ? `와르르 ${n}개!` : K === 2 ? `공중제비 ${n}바퀴!` : K === 3 ? '돌고래 점프!' : '배가 둥실!';
    const size = Math.min(34, 22 + (K === 1 ? n * 2 : 6));
    ctx.save();
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width, pw = tw + 36, phh = size * 1.5, fit = Math.min(1, (w * 0.86) / (pw * sc2)), half = (pw * sc2 * fit) / 2 + 4;
    const high = Y(s.h + BODY) < R(0.5);
    const bx = clamp(fx.memo.bigX ?? w / 2, Math.min(w / 2, half), Math.max(w / 2, w - half)), by = R(high ? 0.62 : 0.27);
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.05);
    ctx.scale(sc2 * fit, sc2 * fit);
    ctx.fillStyle = 'rgba(29,53,87,.3)';
    rr(ctx, -pw / 2 + 3, -phh / 2 + 5, pw, phh, phh * 0.45);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -phh / 2, 0, phh / 2, [0, '#fff3a0'], [0.5, '#ffc93a'], [1, '#ff8a2a']);
    rr(ctx, -pw / 2, -phh / 2, pw, phh, phh * 0.45);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#b4441a';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, 0, 2);
    for (let i = 0; i < 4; i++) {
      const an = t * 0.08 + (i * TAU) / 4;
      ctx.fillStyle = i % 2 ? '#ffffff' : '#7ff0ff';
      ell(ctx, Math.cos(an) * (pw / 2 + 8), Math.sin(an) * (phh / 2 + 6), 4, 4);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();

  // ═════════════ HUD ═════════════
  ctx.textBaseline = 'middle';
  const pill = (x: number, y: number, ww: number, hh: number) => {
    ctx.fillStyle = 'rgba(29,53,87,.18)';
    rr(ctx, x + 1.5, y + 3, ww, hh, hh / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.94)';
    rr(ctx, x, y, ww, hh, hh / 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb35c';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  {
    const ph = R(0.075), y1 = R(0.02);
    font(0.042, 900);
    const nm = d.name, nw = ctx.measureText(nm).width;
    font(0.032, 800);
    const sub = ` ${s.stage + 1}/${STAGE_COUNT}`, sw2 = ctx.measureText(sub).width;
    const lw = R(0.085) + nw + sw2 + R(0.03);
    pill(R(0.02), y1, lw, ph);
    ctx.fillStyle = lin(ctx, 0, y1, 0, y1 + ph, [0, '#ffd36a'], [1, '#ff8a3c']);
    ell(ctx, R(0.02) + ph / 2, y1 + ph / 2, ph * 0.4, ph * 0.4);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(s.stage + 1), R(0.02) + ph / 2, y1 + ph / 2 + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = OUT;
    font(0.042, 900);
    ctx.fillText(nm, R(0.02) + R(0.08), y1 + ph / 2 + 1);
    font(0.032, 800);
    ctx.fillStyle = '#5f86a8';
    ctx.fillText(sub, R(0.02) + R(0.08) + nw, y1 + ph / 2 + 2);
    // 점수
    font(0.046, 900);
    const sc3 = String(s.pts), scw = ctx.measureText(sc3).width + R(0.06);
    pill(w - R(0.02) - scw, y1, scw, ph);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6a3c';
    ctx.fillText(sc3, w - R(0.02) - scw / 2, y1 + ph / 2 + 1);
    // 둘째 줄: 하트 · 보드 · 콤보 · 등대까지
    const y2 = y1 + ph + R(0.014), ph2 = R(0.062);
    const hw2 = R(0.36);
    pill(R(0.02), y2, hw2, ph2);
    for (let j = 0; j < 3; j++) {
      const hx = R(0.065) + j * R(0.05);
      heartPath(ctx, hx, y2 + ph2 / 2, R(0.016));
      ctx.fillStyle = j < s.hearts ? lin(ctx, hx, y2, hx, y2 + ph2, [0, '#ff8a95'], [1, '#e2304a']) : 'rgba(29,53,87,.12)';
      ctx.fill();
      ctx.strokeStyle = j < s.hearts ? '#8a1a2a' : 'rgba(29,53,87,.3)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    // 보드 내구 (금이 가면 회색)
    const brd = s.phase === 'result' && !s.ok ? 0 : s.board;
    for (let j = 0; j < BOARD; j++) {
      const bx = R(0.24) + j * R(0.045), by = y2 + ph2 / 2;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-0.7);
      const ok2 = j < brd, L = R(0.024), Wd = R(0.0095);
      ctx.beginPath();
      ctx.moveTo(-L, 0);
      ctx.quadraticCurveTo(-L, -Wd, -L * 0.2, -Wd);
      ctx.quadraticCurveTo(L * 0.7, -Wd, L * 1.15, 0);
      ctx.quadraticCurveTo(L * 0.7, Wd, -L * 0.2, Wd);
      ctx.quadraticCurveTo(-L, Wd, -L, 0);
      ctx.closePath();
      ctx.fillStyle = ok2 ? lin(ctx, 0, -R(0.01), 0, R(0.01), [0, '#fff27e'], [1, '#f59a1f']) : 'rgba(29,53,87,.12)';
      ctx.fill();
      ctx.strokeStyle = ok2 ? OUT : 'rgba(29,53,87,.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (ok2) {
        ctx.strokeStyle = '#ff5a4a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-R(0.015), 0);
        ctx.lineTo(R(0.015), 0);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(29,53,87,.55)';
        ctx.beginPath();
        ctx.moveTo(-R(0.004), -R(0.01));
        ctx.lineTo(R(0.002), 0);
        ctx.lineTo(-R(0.003), R(0.01));
        ctx.stroke();
      }
      ctx.restore();
    }
    if (s.board === 1 && s.phase === 'play' && t % 30 < 15) {
      ctx.strokeStyle = '#ff4d3d';
      ctx.lineWidth = 2;
      rr(ctx, R(0.02), y2, hw2, ph2, ph2 / 2);
      ctx.stroke();
    }
    // 등대까지 줄
    const tx0 = R(0.42), tx1 = w - R(0.09), ty = y2 + ph2 / 2;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    rr(ctx, tx0, ty - R(0.009), tx1 - tx0, R(0.018), R(0.009));
    ctx.fill();
    ctx.strokeStyle = 'rgba(29,53,87,.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const prog = clamp(s.x / s.L, 0, 1);
    ctx.fillStyle = lin(ctx, tx0, 0, tx1, 0, [0, '#3fd0e0'], [1, '#2f9cf6']);
    rr(ctx, tx0, ty - R(0.009), (tx1 - tx0) * prog + 1, R(0.018), R(0.009));
    ctx.fill();
    // 작은 등대
    const lx = tx1 + R(0.035);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(lx - R(0.014), ty + R(0.026));
    ctx.lineTo(lx - R(0.009), ty - R(0.02));
    ctx.lineTo(lx + R(0.009), ty - R(0.02));
    ctx.lineTo(lx + R(0.014), ty + R(0.026));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#ef4b45';
    ctx.fillRect(lx - R(0.011), ty - R(0.002), R(0.022), R(0.01));
    ctx.fillStyle = '#ffd23a';
    ell(ctx, lx, ty - R(0.028), R(0.009), R(0.009));
    ctx.fill();
    // 서퍼 머리 표시
    const hx = tx0 + (tx1 - tx0) * prog;
    ctx.fillStyle = SKIN[0];
    ell(ctx, hx, ty, R(0.016), R(0.016));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#1d2a66';
    ctx.fillRect(hx - R(0.006), ty - R(0.005), R(0.016), R(0.007));
    // 콤보
    if (s.chain >= 2 && s.phase === 'play') {
      const cy = y2 + ph2 + R(0.04), txt = `콤보 ×${s.chain}`;
      font(0.04, 900);
      const cw = ctx.measureText(txt).width + R(0.05), cx = R(0.02);
      const pop = 1 + Math.max(0, 1 - (t - (fx.memo.landT ?? -99)) / 12) * 0.15;
      ctx.save();
      ctx.translate(cx + cw / 2, cy);
      ctx.scale(pop, pop);
      ctx.fillStyle = lin(ctx, 0, -R(0.03), 0, R(0.03), [0, '#ffe14a'], [1, '#ff8a2a']);
      rr(ctx, -cw / 2, -R(0.028), cw, R(0.056), R(0.028));
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#b4441a';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(txt, 0, 1);
      ctx.fillText(txt, 0, 1);
      ctx.restore();
    }
  }
  // ═════ 판 카드 (하늘 띠 안) ═════
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '바다를 다 건넜다!' : '등대 도착!';
      else (head = s.why || '으앗!'), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 꼬마 서퍼가 아이스크림 먹으러 가요');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : d.hint;
    }
    if (head) {
      const cy = R(0.3), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.048, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.05), Math.max(w1, w2) + R(0.1)) * unroll, ch = sub || (s.phase === 'result' && s.ok) ? R(0.14) : R(0.085);
      ctx.fillStyle = 'rgba(29,53,87,.22)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - ch / 2 + 5, cw, ch, R(0.04));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#ffffff'], [1, '#fff1d0']);
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = '#ff9a3c';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.048, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#ff6a3c' : '#c8323a') : OUT;
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.03), w - R(0.1));
        const nst = s.starOk.length;
        for (let j = 0; j < nst; j++) {
          const ag = s.pt - (12 + j * 12), stx = w / 2 + (j - (nst - 1) / 2) * R(0.075), sty = cy + R(0.032);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, stx, sty, R(0.028) * (ag < 0 ? 1 : pop));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(29,53,87,.15)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#b4441a' : 'rgba(29,53,87,.35)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(stx, sty, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.028) : 0), w - R(0.1));
        if (sub) {
          font(0.036, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#e2403a' : '#3d5a80';
          ctx.fillText(sub, w / 2, cy + R(0.035), w - R(0.1));
        }
      }
      ctx.restore();
    }
  }
  // ═════ 아래 띠: 별(쉬운 말) · 안내 ═════
  {
    const ty = R(1.375);
    ctx.fillStyle = 'rgba(29,53,87,.15)';
    rr(ctx, R(0.015), ty + 3, w - R(0.03), h - ty - R(0.01), R(0.035));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.93)';
    rr(ctx, R(0.015), ty, w - R(0.03), h - ty - R(0.012), R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#ffb35c';
    ctx.lineWidth = 2;
    ctx.stroke();
    const r2 = ty + R(0.035);
    const labels = ['등대까지 가기', ...d.stars.map((q) => {
      const v = starVal(s, q);
      return q.label + (s.phase === 'play' && v > 0 && v < q.n ? ` ${v}/${q.n}` : '');
    })];
    const ok = s.phase === 'result' && s.ok ? s.starOk : [false, ...d.stars.map((q) => q.k !== 'nofall' && q.k !== 'nosting' && starMet(s, q))];
    const bad = [false, ...d.stars.map((q) => (q.k === 'nofall' && s.falls > 0) || (q.k === 'nosting' && s.stings > 0))];
    font(0.033, 800);
    const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
    const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (labels.length - 1), scl = Math.min(1, (w - R(0.05)) / tot);
    let xx = (w - tot * scl) / 2;
    for (let j = 0; j < labels.length; j++) {
      const pw = ws[j] * scl;
      ctx.fillStyle = ok[j] ? 'rgba(255,201,58,.3)' : bad[j] ? 'rgba(29,53,87,.08)' : 'rgba(63,208,224,.14)';
      rr(ctx, xx, r2 - R(0.025), pw, R(0.05), R(0.025));
      ctx.fill();
      ctx.strokeStyle = ok[j] ? '#ffb12e' : bad[j] ? 'rgba(29,53,87,.2)' : 'rgba(31,139,216,.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      starPath(ctx, xx + R(0.026) * scl + 2, r2, R(0.015));
      ctx.fillStyle = ok[j] ? '#ffc93a' : bad[j] ? 'rgba(29,53,87,.2)' : 'rgba(29,53,87,.35)';
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = ok[j] ? '#b4441a' : bad[j] ? 'rgba(29,53,87,.4)' : OUT;
      font(0.033, 800);
      ctx.fillText(labels[j], xx + R(0.05) * scl, r2 + 1, pw - R(0.058) * scl);
      xx += pw + gap * scl;
    }
    let hint = d.hint;
    if (s.phase === 'play' && s.mode === CHARGE) hint = curlOf(s) > 0 ? '파도가 말려요 — 얼른 떼요!' : '하얀 자리에 파도가 쏟아져요 — 떼면 쏴아!';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 바다를 건넜어요!' : `별 ${s.got}개! 다음 바다엔 새것이 나와요`) : '얼마나 키울지, 언제 뗄지 골라요';
    else if (s.stage === 0 && !s.firstRelease) hint = '꾹 눌렀다 떼면 파도가 쏴아!';
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = s.mode === CHARGE && curlOf(s) > 0 ? '#e2403a' : '#2a6fb0';
    ctx.fillText(hint, w / 2, ty + R(0.092), w - R(0.06));
  }
}
