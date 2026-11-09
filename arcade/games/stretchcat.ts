/**
 * 쭉쭉 고양이 (20라운드 디오라마) — 타이밍 쌓기 × 꾹 눌렀다 떼기 × 꾸미기.
 * 기준 9(손이 하는 일은 하나): 꾹 누르면 엄마 고양이 몸이 쭉쭉 늘어나 옆 지붕 쪽으로 뻗고, 떼면 앞발이 그 자리에 '척' 내려앉는다.
 *   얼마나 누를지 = 몸 길이(틈마다 거리가 다르다), 언제 뗄지 = 움직이는 것들(멍멍이 잠·바구니·비둘기·돌풍·까망이 앞발)과 맞추기.
 * 와우: 무표정한 고양이가 국수처럼 길~게 늘어나 지붕과 지붕 사이 다리가 되고, 새끼들이 그 등을 종종종 건넌다 — 다 건너면 '퉁!' 고무줄처럼 돌아온다.
 * 실패는 웃음: 모자라면 퐁당 — 빨랫줄에 걸려 양말 쓰고 버둥버둥. 너무 늘리면 '퉁!' 하고 뒤로 날아가 어질어질.
 * 판 = 해 질 녘 한 번. 해 지기 전에 새 집터까지 새끼들을 데려가면 별(★ 도착 · ★★ 아기 모두 · ★★★ + 생선),
 *   건넌 새끼들이 그 지붕에 상자 집·화분·생선가게를 짓는다 → 다음 판은 그 마을에서 출발. 해가 지면 하트 -1, 그 판만 다시.
 * 펼쳐짐: 생선(1판) → 자는 멍멍이(2판, 쿨쿨 깊이 잘 때만) → 도르래 바구니(3판, 움직이는 틈) → 비둘기(4판, 걷는 자리 피하기)
 *        → 돌풍(5판, 잠잠할 때 늘리기) → 까망이(6판 밤, 둘이 앞발을 맞대야 건너는 넓은 틈).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.15, TAU = Math.PI * 2, STAGES = 6;
/** 늘어나는 속도(칸/틱) · 고무줄 한계(넘으면 '퉁') · 새끼 걸음(칸/틱) · 새끼 사이 간격(틱) */
const V = 0.05, LMAX = 5, KV = 0.11, SP = 12;
/** 바구니 폭·왕복 주기 · 멍멍이 잠 주기(꿈틀·얕은 잠 시작) · 까망이 주기 · 돌풍 주기 */
const BW = 1.3, BP = 300, DP = 240, DWARN = 150, DLIGHT = 190, PP = 300, GP = 300;
const FALL = 105, FLY = 92, PULL = 16;
const GAPS = [4, 4, 5, 5, 5, 6], KITS = [3, 3, 4, 4, 5, 5], FISHG = [1, 2, 2, 2, 2, 3];
const LIMIT = [1500, 1500, 1800, 1800, 2100, 2100];
/** 새끼 털색 순서 (한 판 안에서 겹치지 않게) */
const KORDER = [3, 0, 1, 4, 5, 2];
const NAMES = ['골목 입구', '멍멍이네 지붕', '도르래 바구니', '비둘기 광장', '바람 부는 언덕', '까망이의 밤'];
const ROOF = 0, BASKET = 1, LOT = 2;
const SEE: Record<string, string> = {
  stretch: '🐱 쭈욱~ 다리 완성! 새끼들이 등을 건너요',
  fish: '🐟 생선 위에 앞발 척 — 생선가게 재료!',
  fall: '🧦 모자라면 퐁당 — 빨랫줄에 걸려 버둥버둥',
  snap: '💥 너무 늘리면 퉁! 고무줄처럼 날아가요',
  shaky: '😿 끝자락에 걸치면 막내가 미끄러져요',
  village: '🏠 건넌 새끼들이 새 집을 지어요',
  shop: '🐟 생선을 모으면 생선가게가 열려요',
  dog: '🐕 자는 멍멍이 — 쿨쿨 깊이 잘 때만 척!',
  basket: '🧺 도르래 바구니 — 움직여요, 때를 노려요',
  pigeon: '🕊️ 비둘기 — 밟으면 푸드덕! 피해서 척',
  wind: '🍃 돌풍 — 바람 불면 몸이 밀려요',
  partner: '🐈 까망이 — 앞발이 딱 만날 때 떼요!',
};

export interface Pigeon { c: number; a: number; ph: number; per: number }
export interface Roof {
  x0: number; x1: number; h: number; kind: number; k: number;
  fish: number; got: boolean; dog: number; dogPh: number; pig: Pigeon[]; pal: boolean;
  /** 바구니: 왼쪽 끝 기준 x · 흔들림 폭 · 위상 · 멈춘 자리(-1 = 움직이는 중) */
  bx: number; amp: number; ph: number; fz: number;
  /** 꾸미기: 지나간 새끼들이 놓고 간 것 · 새 집터에 지은 집 수 · 생선가게 */
  deco: number; build: number; shop: number; v: number;
}
type Mode = 'idle' | 'stretch' | 'bridge' | 'pull' | 'fall' | 'fly';
export interface Cat { at: number; mode: Mode; L: number; hold: number; timer: number; to: number; xp: number; edge: number; shaky: boolean; pal: boolean; lock: boolean; why: string; long: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
interface Note { t: number; text: string; color: string }
export interface CatState {
  rng: Rng; seed: number; t: number; ct: number; k: number; roofs: Roof[]; starts: number[]; cat: Cat;
  nk: number; kst: Uint8Array; kp: Float32Array; klx: Float32Array; kcol: Uint8Array;
  phase: 'run' | 'pause'; pause: number; cleared: boolean; hearts: number; stars: number; lastStars: number;
  delivered: number; fishAll: number; sf: number; lost: number; done: number; won: boolean; dead: boolean;
  limit: number; idleN: number; bridges: number; lastFall: number; lastSnap: number; lastFish: number;
  seen: Set<string>; events: Ev[]; notes: Note[];
}

const ev = (s: CatState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: CatState, key: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.notes.push({ t: s.t, text: SEE[key], color: '#ffe9a8' });
}

// ───────────────────────────── 움직이는 것들 (게임과 봇이 같은 함수를 쓴다) ─────────────────────────────
export const rx0 = (r: Roof, ct: number) => (r.kind === BASKET ? (r.fz >= 0 ? r.fz : r.bx + r.amp * (0.5 - 0.5 * Math.cos((TAU * (ct + r.ph)) / BP))) : r.x0);
export const rx1 = (r: Roof, ct: number) => (r.kind === BASKET ? rx0(r, ct) + BW : r.x1);
/** 멍멍이: 240틱 주기 중 150~190은 꿈틀(곧 깸), 뒤 50틱은 얕은 잠(눈 반짝 '!') — 그때 1칸 안에 내려앉으면 깬다 */
export const dogLight = (r: Roof, ct: number) => r.dog >= 0 && (ct + r.dogPh) % DP >= DLIGHT;
export const pigX = (p: Pigeon, ct: number) => p.c + p.a * Math.sin((TAU * (ct + p.ph)) / p.per);
/** 까망이가 지붕 끝에서 뻗은 길이 (0.9 ~ 3.2칸을 느릿느릿 오간다) */
export const palP = (r: Roof, ct: number) => 0.9 + 2.3 * (0.5 - 0.5 * Math.cos((TAU * (ct + r.ph)) / PP));
/** 돌풍 (5판): 300틱마다 80틱 동안 (앞 40틱은 잎이 날리며 미리 알려 준다) */
export function gust(k: number, ct: number) {
  if (k !== 4) return 0;
  const u = ct % GP;
  return u < 220 ? 0 : Math.sin((Math.PI * (u - 220)) / 80);
}
export const rateAt = (k: number, ct: number) => V * (1 - 1.8 * gust(k, ct));

const BRIDGE = 1, DROP = 2, DOG = 3, PIG = 4;
export interface Out { kind: number; to: number; xp: number; fish: boolean; shaky: boolean; pal: boolean; margin: number }
const MISS: Out = { kind: DROP, to: -1, xp: 0, fish: false, shaky: false, pal: false, margin: 0 };
/** 앞발을 xp = edge + L에 내릴 때 무슨 일이 생기나 (ct = 떼는 순간) */
export function judge(R: Roof[], at: number, edge: number, ct: number, L: number): Out {
  const xp = edge + L;
  for (let j = at + 1; j < R.length && j <= at + 3; j++) {
    const r = R[j];
    if (r.pal) {
      const tip = r.x0 - palP(r, ct);
      if (Math.abs(xp - tip) <= 0.48) return { kind: BRIDGE, to: j, xp: tip, fish: false, shaky: false, pal: true, margin: 1 };
      if (xp < r.x0) break;
    }
    const x0 = rx0(r, ct), x1 = rx1(r, ct);
    if (xp < x0 + 0.06) break;
    if (xp > x1 - 0.06) continue;
    const margin = Math.min(xp - x0, x1 - xp);
    if (r.dog >= 0 && (Math.abs(xp - r.dog) < 0.32 || (dogLight(r, ct) && Math.abs(xp - r.dog) < 1.1))) return { ...MISS, kind: DOG, to: j, xp };
    for (const p of r.pig) if (Math.abs(xp - pigX(p, ct)) < 0.3) return { ...MISS, kind: PIG, to: j, xp };
    return { kind: BRIDGE, to: j, xp, fish: r.fish >= 0 && !r.got && Math.abs(xp - r.fish) < 0.3, shaky: margin < 0.18, pal: false, margin };
  }
  return { ...MISS, xp };
}

// ───────────────────────────── 지붕 마을 만들기 ─────────────────────────────
function makeWorld(seed: number) {
  const r = mulberry32((seed ^ 0x7f4a7c15) >>> 0);
  const R: Roof[] = [], starts: number[] = [];
  const mk = (x0: number, x1: number, h: number, kind: number, k: number): Roof => ({ x0, x1, h, kind, k, fish: -1, got: false, dog: -1, dogPh: 0, pig: [], pal: false, bx: 0, amp: 0, ph: 0, fz: -1, deco: 0, build: 0, shop: 0, v: r() });
  const cl = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  R.push(mk(-4.2, 1.2, 2.6, LOT, -1));
  R[0].build = -1;
  starts.push(0);
  for (let k = 0; k < STAGES; k++) {
    let n = 0, dogs = 0, baskets = 0, pigs = 0;
    const first = R.length;
    while (n < GAPS[k]) {
      const prev = R[R.length - 1];
      const basket = k >= 2 && n <= GAPS[k] - 2 && n > 0 && (k === 2 ? baskets < 2 && (n === 1 || n === 3) : baskets < 1 && r() < 0.25);
      const pal = k === 5 && (n === 1 || n === 4);
      if (basket) {
        const span = 5.05 + r() * 0.55, h = cl(prev.h + (r() - 0.5) * 0.6, 2.1, 3.2);
        const b = mk(0, 0, Math.min(prev.h, h) - 0.35, BASKET, k);
        b.bx = prev.x1 + 0.8;
        b.amp = span - 1.6 - BW;
        b.ph = Math.floor(r() * BP);
        R.push(b);
        const w = 1.7 + r() * 0.9;
        R.push(mk(prev.x1 + span, prev.x1 + span + w, h, ROOF, k));
        n += 2;
        baskets++;
        continue;
      }
      const d = pal ? 5.8 + r() * 0.6 : k === 0 ? (n === 0 ? 1.5 : 1.3 + r() * 1.3) : 1.4 + r() * 1.9;
      const w = pal ? 2.3 + r() * 0.4 : k === 0 ? 2.0 + r() * 1.0 : 1.3 + r() * 1.4;
      const t = mk(prev.x1 + d, prev.x1 + d + w, cl(prev.h + (r() - 0.5) * 0.7, 2.0, 3.3), ROOF, k);
      if (pal) (t.pal = true), (t.ph = Math.floor(r() * PP));
      else {
        if (k >= 1 && w >= 1.6 && (k === 1 ? dogs < 3 && r() < 0.85 : r() < 0.28)) (t.dog = t.x1 - 0.45 - r() * Math.min(0.5, w - 1.6)), (t.dogPh = Math.floor(r() * DP)), dogs++;
        else if (k >= 3 && (k === 3 ? pigs < 4 && r() < 0.9 : r() < 0.35)) {
          const m = w > 2 ? 2 : 1;
          for (let i = 0; i < m; i++) t.pig.push({ c: t.x0 + w * (m === 1 ? 0.5 : 0.3 + 0.4 * i), a: Math.min(0.5, w * (m === 1 ? 0.3 : 0.16)), ph: Math.floor(r() * 240), per: 150 + Math.floor(r() * 90) });
          pigs++;
        }
        if (r() < (k === 0 ? 0.8 : 0.62)) {
          let fx = t.x0 + 0.3 + r() * (w - 0.6);
          if (t.dog >= 0 && Math.abs(fx - t.dog) < 0.7) fx = t.dog - t.x0 > w / 2 ? t.x0 + 0.3 : t.x1 - 0.3;
          t.fish = fx;
        }
      }
      R.push(t);
      n++;
    }
    // 생선이 별 목표보다 적으면 빈 지붕에 더 놓는다
    let fishN = 0;
    for (let j = first; j < R.length; j++) if (R[j].fish >= 0) fishN++;
    for (let j = first; j < R.length && fishN < FISHG[k] + 1; j++) {
      const t = R[j];
      if (t.fish >= 0 || t.kind !== ROOF || t.pal) continue;
      t.fish = t.dog >= 0 ? (t.dog - t.x0 > (t.x1 - t.x0) / 2 ? t.x0 + 0.3 : t.x1 - 0.3) : t.x0 + (t.x1 - t.x0) * (0.25 + r() * 0.5);
      fishN++;
    }
    const prev = R[R.length - 1], d = 1.4 + r() * 1.3;
    R.push(mk(prev.x1 + d, prev.x1 + d + 3.6, cl(prev.h + (r() - 0.5) * 0.5, 2.2, 3.1), LOT, k));
    starts.push(R.length - 1);
  }
  return { R, starts };
}

function startStage(s: CatState) {
  const k = s.k, c = s.cat, R = s.roofs;
  c.at = s.starts[k];
  c.mode = 'idle';
  c.L = 0;
  c.hold = 0;
  c.timer = 0;
  c.lock = true;
  c.to = -1;
  s.nk = KITS[k];
  s.kst = new Uint8Array(s.nk);
  s.kp = new Float32Array(s.nk);
  s.klx = new Float32Array(s.nk);
  s.kcol = Uint8Array.from({ length: s.nk }, (_, i) => KORDER[(i + k + (s.seed % 6)) % 6]);
  for (let j = s.starts[k] + 1; j <= s.starts[k + 1]; j++) (R[j].got = false), (R[j].fz = -1);
  s.ct = 0;
  s.limit = LIMIT[k];
  s.sf = 0;
  s.lost = 0;
  s.phase = 'run';
  s.idleN++;
  ev(s, 'stage', R[c.at].x1, R[c.at].h, `${k + 1}판 · ${NAMES[k]}`);
  if (k === 4) see(s, 'wind');
}

function failStage(s: CatState, why: string) {
  s.hearts--;
  s.cleared = false;
  ev(s, 'fail', 0, 0, why);
  if (s.hearts <= 0) s.dead = true;
  else (s.phase = 'pause'), (s.pause = 110);
}

function clearStage(s: CatState) {
  const k = s.k, alive = s.nk - s.lost, g = s.roofs[s.starts[k + 1]];
  const st = 1 + (s.lost === 0 ? 1 : 0) + (s.lost === 0 && s.sf >= FISHG[k] ? 1 : 0);
  s.stars += st;
  s.lastStars = st;
  s.delivered += alive;
  s.fishAll += s.sf;
  s.done++;
  g.build = alive;
  g.shop = s.sf;
  s.cleared = true;
  s.phase = 'pause';
  s.pause = k === STAGES - 1 ? 200 : 150;
  ev(s, 'clear', g.x0 + 1.5, g.h, `${k + 1}판 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, st);
  see(s, 'village');
  if (s.sf > 0) see(s, 'shop');
}

function release(s: CatState) {
  const c = s.cat, R = s.roofs;
  const o = judge(R, c.at, c.edge, s.ct, c.L);
  if (o.kind === BRIDGE) {
    const r = R[o.to];
    c.mode = 'bridge';
    c.to = o.to;
    c.xp = o.xp;
    c.shaky = o.shaky;
    c.pal = o.pal;
    c.timer = 0;
    if (r.kind === BASKET) r.fz = rx0(r, s.ct);
    let rank = 0;
    for (let i = 0; i < s.nk; i++) if (s.kst[i] !== 3) (s.kst[i] = 1), (s.kp[i] = -rank * SP * KV), rank++;
    s.bridges++;
    ev(s, 'land', o.xp, o.pal ? R[c.at].h + 0.4 : r.h, o.pal ? '짝! 하이파이브' : o.shaky ? '아슬아슬!' : '척!');
    if (o.fish) (r.got = true), s.sf++, (s.lastFish = s.t), ev(s, 'fish', r.fish, r.h, '덥석! 🐟');
    if (o.shaky) see(s, 'shaky');
  } else if (o.kind === DOG) {
    c.mode = 'fly';
    c.timer = FLY;
    c.why = 'dog';
    s.lastSnap = s.t;
    ev(s, 'dog', R[o.to].dog, R[o.to].h, '왈왈!!');
  } else {
    c.mode = 'fall';
    c.timer = FALL;
    c.why = o.kind === PIG ? 'pigeon' : 'short';
    c.xp = o.xp;
    s.lastFall = s.t;
    ev(s, o.kind === PIG ? 'pigeon' : 'fall', o.xp, R[c.at].h, o.kind === PIG ? '푸드덕! 퐁당~' : '퐁당!');
    see(s, 'fall');
  }
}

function toIdle(s: CatState, hold: boolean) {
  const c = s.cat;
  c.mode = 'idle';
  c.L = 0;
  c.hold = 0;
  c.timer = 0;
  c.lock = hold;
  c.long = false;
  s.idleN++;
}

export const stretchcat: GameDef<CatState> = {
  id: 'stretchcat',
  name: '쭉쭉 고양이',
  genes: ['stack', 'hold', 'decorate'],
  twist: '무표정한 엄마 고양이가 꾹 누른 만큼 국수처럼 쭉쭉 늘어나 지붕 사이 다리가 되고, 새끼들이 그 등을 건넌다 — 모자라면 빨랫줄에 퐁당, 너무 늘리면 고무줄처럼 퉁 날아간다',
  rules: [
    '꾹 누르면 고양이가 쭉쭉 늘어나요. 떼면 앞발이 그 자리에 척! (스페이스도 돼요)',
    '옆 지붕에 닿으면 새끼들이 등을 건너요. 모자라면 퐁당, 너무 늘리면 퉁!',
    '해 지기 전에 새 집터까지 — 건넌 새끼들이 마을을 지어요.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 쭉쭉 늘어나기, 떼면 앞발 척 / 스페이스',
  aspect: A,
  art: {
    concept: '노을 지는 지붕 마을 디오라마',
    mood: '흙층 받침 위에 파스텔 벽 집들이 나란히 선 장난감 같은 지붕 마을. 골목엔 빨랫줄이 늘어지고, 해가 지면 창문이 하나둘 켜진다. 무표정한 주황 고양이가 국수처럼 늘어나 다리가 되고, 새끼들이 등을 종종 건너 지붕마다 화분과 상자 집을 놓는다.',
    palette: { bg: '#2a1f3d', ink: '#fff6ea', muted: '#9a8aa8', accent: '#ffb347', hot: '#ff5f6d', soft: '#ffe3b8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const { R, starts } = makeWorld(seed);
    const s: CatState = {
      rng: mulberry32(seed), seed, t: 0, ct: 0, k: 0, roofs: R, starts,
      cat: { at: 0, mode: 'idle', L: 0, hold: 0, timer: 0, to: -1, xp: 0, edge: 0, shaky: false, pal: false, lock: false, why: '', long: false },
      nk: 0, kst: new Uint8Array(0), kp: new Float32Array(0), klx: new Float32Array(0), kcol: new Uint8Array(0),
      phase: 'run', pause: 0, cleared: false, hearts: 3, stars: 0, lastStars: 0, delivered: 0, fishAll: 0, sf: 0, lost: 0, done: 0, won: false, dead: false,
      limit: LIMIT[0], idleN: 0, bridges: 0, lastFall: -999, lastSnap: -999, lastFish: -999, seen: new Set<string>(), events: [], notes: [],
    };
    startStage(s);
    s.cat.lock = false;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 100) s.events = s.events.filter((e) => s.t - e.t <= 100);
    if (s.notes.length && s.t - s.notes[0].t > 210) s.notes = s.notes.filter((e) => s.t - e.t <= 210);
    if (s.dead) return;
    const hold = !!inp.hold;
    if (s.phase === 'pause') {
      if (--s.pause <= 0) {
        if (!s.cleared) startStage(s);
        else if (s.k === STAGES - 1) (s.won = true), (s.dead = true);
        else s.k++, startStage(s);
      }
      return;
    }
    s.ct++;
    const c = s.cat, R = s.roofs, goal = s.starts[s.k + 1];
    if (c.mode === 'idle') {
      if (!hold) c.lock = false;
      else if (!c.lock) {
        c.mode = 'stretch';
        c.hold = 0;
        c.L = 0;
        c.edge = rx1(R[c.at], s.ct);
        ev(s, 'start', c.edge, R[c.at].h, '쭈욱~');
      }
    }
    if (c.mode === 'stretch') {
      if (hold) {
        c.hold++;
        c.L = Math.max(0, c.L + rateAt(s.k, s.ct));
        if (c.L > 3.4 && !c.long) (c.long = true), ev(s, 'long', c.edge + c.L, R[c.at].h, '쭈우우욱~');
        if (c.L >= LMAX) {
          c.mode = 'fly';
          c.timer = FLY;
          c.why = 'snap';
          s.lastSnap = s.t;
          ev(s, 'snap', c.edge + c.L, R[c.at].h, '퉁!! 날아가요~');
          see(s, 'snap');
        }
      } else if (c.L < 0.3) {
        toIdle(s, false);
        ev(s, 'tap', c.edge, R[c.at].h, '꾹 눌러야 늘어나요!');
      } else release(s);
    } else if (c.mode === 'bridge') {
      c.timer++;
      const len = c.xp - c.edge + 0.6, calm = gust(s.k, s.ct) < 0.35;
      let last = -1, alive = 0, moving = 0, dn = 0;
      for (let i = 0; i < s.nk; i++) if (s.kst[i] !== 3) (last = i), alive++, s.kst[i] === 2 && dn++;
      for (let i = 0; i < s.nk; i++) {
        if (s.kst[i] !== 1) continue;
        if (calm || s.kp[i] < 0) s.kp[i] += KV;
        if (c.shaky && i === last && s.kp[i] >= len * 0.5) {
          s.kst[i] = 3;
          s.klx[i] = c.edge + s.kp[i] - 0.6;
          s.lost++;
          alive--;
          c.shaky = false;
          ev(s, 'slip', s.klx[i], R[c.at].h, '냥?! 미끄덩');
        } else if (s.kp[i] >= len) (s.kst[i] = 2), ev(s, 'arrive', c.xp, R[c.to].h, '냥!', dn++);
        else moving++;
      }
      if (alive === 0) failStage(s, '아기들이 모두 빨랫줄에… ♥ -1');
      else if (moving === 0) {
        c.mode = 'pull';
        c.timer = 0;
        ev(s, 'pull', c.edge, R[c.at].h, '퉁!');
        if (s.bridges === 1) see(s, 'stretch');
      }
    } else if (c.mode === 'pull') {
      c.timer++;
      const walk = Math.max(0, rx1(R[c.to], s.ct) - c.xp);
      if (c.timer >= PULL + Math.ceil(walk / 0.12)) {
        c.at = c.to;
        R[c.at].deco++;
        for (let i = 0; i < s.nk; i++) if (s.kst[i] === 2) (s.kst[i] = 0), (s.kp[i] = 0);
        toIdle(s, hold);
        if (c.at === goal) clearStage(s);
      }
    } else if (c.mode === 'fall' || c.mode === 'fly') {
      if (--c.timer <= 0) toIdle(s, hold);
    }
    // 보이기 시작한 새것
    for (let j = c.at + 1; j <= Math.min(R.length - 1, c.at + 2); j++) {
      const r = R[j];
      if (r.fish >= 0 && !r.got) see(s, 'fish');
      if (r.dog >= 0) see(s, 'dog');
      if (r.kind === BASKET) see(s, 'basket');
      if (r.pig.length) see(s, 'pigeon');
      if (r.pal) see(s, 'partner');
    }
    if (!s.dead && s.phase === 'run' && s.ct >= s.limit && !(c.mode === 'pull' && c.to === goal)) failStage(s, s.k === STAGES - 1 ? '밤이 깊었어요… ♥ -1 · 다시!' : '해가 졌어요… ♥ -1 · 다시!');
  },
  over: (s) => s.dead,
  /** 별 하나 10점 · 데려간 새끼 하나 2점 · 생선 하나 3점 · 6판 다 지으면 30점 */
  score: (s) => s.stars * 10 + s.delivered * 2 + s.fishAll * 3 + (s.won ? 30 : 0),
  draw(ctx, s, w, h, th: Theme) {
    drawWorld(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function mix(a: string, b: string, f: number) {
  const p = hex(a), q = hex(b), u = Math.max(0, Math.min(1, f));
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * u).toString(16).padStart(2, '0')).join('');
}
function grad(stops: string[], f: number) {
  const n = stops.length - 1, x = Math.max(0, Math.min(0.9999, f)) * n, i = Math.floor(x);
  return mix(stops[i], stops[i + 1], x - i);
}
const rgba = (c: string, a: number) => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
};
const hsh = (k: number) => ((Math.imul(Math.floor(k * 1000) + 7, 2654435761) >>> 0) % 10007) / 10007;
const EMOJI_FONT = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function emo(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y);
}
function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number) {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size * 0.9;
  ctx.fillStyle = 'rgba(255,255,255,.94)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - size * 0.8, tw, size * 1.45, size * 0.6);
  ctx.moveTo(x - 3, y + size * 0.6);
  ctx.lineTo(x, y + size * 1.05);
  ctx.lineTo(x + 4, y + size * 0.6);
  ctx.fill();
  ctx.fillStyle = '#3a2a2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - size * 0.07);
}

const PLASTER = ['#f6d6b4', '#f2bfa0', '#cfe6d2', '#f7e2a0', '#ecc8da', '#cbd8ee', '#f4ceb0'];
const TRIM = ['#c95a3c', '#b8483a', '#5d8f74', '#c98a3c', '#9a5a86', '#5a74a8', '#b86a3c'];
const SHUT = ['#3f8a6a', '#4a6fb0', '#c0563d', '#8a5ab0', '#2f7a8a'];
const LAUNDRY = ['#ff6b6b', '#ffd23f', '#6cc6ff', '#7ed957', '#ffffff', '#ff9fd0', '#b48cff'];
/** 새끼 털색: 흰둥이 · 회색 · 까망 · 크림 · 삼색 · 고등어 */
const KFUR = ['#fbf7f0', '#a7adb8', '#3a3540', '#f6cf8e', '#fbf7f0', '#b9a58a'];
const KSPOT = ['#f0a050', '#7d8390', '#5a5560', '#e0a860', '#3a3540', '#6e5c48'];

type Face = 'meh' | 'strain' | 'wow' | 'smug' | 'dizzy' | 'sleepy';
interface Fur { body: string; stripe: string; belly: string; line: string; ear: string }
const ORANGE: Fur = { body: '#f39a4a', stripe: '#c8682a', belly: '#ffe4c2', line: '#6e3612', ear: '#ffb3a0' };
const BLACK: Fur = { body: '#463e54', stripe: '#362e44', belly: '#6c627c', line: '#e2d6ff', ear: '#e090b0' };

/** 고양이 얼굴 (x,y = 머리 가운데, r = 머리 반지름, dir = 보는 쪽) */
function catHead(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, f: Fur, face: Face, dir: number, t: number) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 귀
  for (const sx of [-1, 1]) {
    const ex = x + sx * r * 0.62 + dir * r * 0.08, ey = y - r * 0.62;
    ctx.fillStyle = f.body;
    ctx.strokeStyle = f.line;
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.36, ey + r * 0.22);
    ctx.lineTo(ex + sx * r * 0.08, ey - r * 0.5 + (face === 'wow' ? -r * 0.1 : 0));
    ctx.lineTo(ex + r * 0.36, ey + r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = f.ear;
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.18, ey + r * 0.14);
    ctx.lineTo(ex + sx * r * 0.06, ey - r * 0.3);
    ctx.lineTo(ex + r * 0.18, ey + r * 0.14);
    ctx.fill();
  }
  ctx.fillStyle = f.body;
  ctx.strokeStyle = f.line;
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.08, r * 0.92, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 이마 줄무늬
  if (f === ORANGE) {
    ctx.strokeStyle = f.stripe;
    ctx.lineWidth = r * 0.12;
    for (const q of [-0.25, 0, 0.25]) {
      ctx.beginPath();
      ctx.moveTo(x + q * r, y - r * 0.85);
      ctx.lineTo(x + q * r * 0.8, y - r * 0.5);
      ctx.stroke();
    }
  }
  // 볼(흰 주둥이)
  const mx = x + dir * r * 0.18, my = y + r * 0.32;
  ctx.fillStyle = f.belly;
  ctx.beginPath();
  ctx.ellipse(mx, my, r * 0.48, r * 0.3, 0, 0, TAU);
  ctx.fill();
  // 눈
  const ey = y - r * 0.08, gap = r * 0.42, ink = f === BLACK ? '#f6e27a' : '#2a1a10';
  ctx.lineWidth = Math.max(1.2, r * 0.11);
  ctx.strokeStyle = f === BLACK ? '#f6e27a' : '#2a1a10';
  for (const sx of [-1, 1]) {
    const ex = mx + sx * gap - dir * r * 0.05;
    if (face === 'meh' || face === 'sleepy') {
      // 무표정: 반쯤 감긴 눈 (흰자 위로 눈꺼풀이 수평으로 덮인다)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.17, r * 0.15, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ex + dir * r * 0.04, ey + r * 0.04, r * 0.085, 0, TAU);
      ctx.fill();
      ctx.fillStyle = f.body;
      ctx.fillRect(ex - r * 0.2, ey - r * 0.2, r * 0.4, r * (face === 'sleepy' ? 0.27 : 0.19));
      ctx.strokeStyle = f.line;
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.19, ey + r * (face === 'sleepy' ? 0.07 : -0.01));
      ctx.lineTo(ex + r * 0.19, ey + r * (face === 'sleepy' ? 0.07 : -0.01));
      ctx.stroke();
    } else if (face === 'wow') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey - r * 0.03, r * 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = f.line;
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ex, ey - r * 0.03, r * 0.06, 0, TAU);
      ctx.fill();
    } else if (face === 'strain') {
      ctx.strokeStyle = f === BLACK ? '#f6e27a' : '#2a1a10';
      ctx.beginPath();
      ctx.moveTo(ex - sx * r * 0.16, ey - r * 0.12);
      ctx.lineTo(ex + sx * r * 0.1, ey);
      ctx.lineTo(ex - sx * r * 0.16, ey + r * 0.12);
      ctx.stroke();
    } else if (face === 'smug') {
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.07, r * 0.15, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,110,120,.45)';
      ctx.beginPath();
      ctx.ellipse(ex + sx * r * 0.08, ey + r * 0.32, r * 0.14, r * 0.08, 0, 0, TAU);
      ctx.fill();
    } else {
      // 어질어질: 소용돌이
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.beginPath();
      for (let a = 0; a < TAU * 1.6; a += 0.4) {
        const rr = r * 0.03 + a * r * 0.018, aa = a + t * 0.3 * sx;
        if (a === 0) ctx.moveTo(ex + Math.cos(aa) * rr, ey + Math.sin(aa) * rr);
        else ctx.lineTo(ex + Math.cos(aa) * rr, ey + Math.sin(aa) * rr);
      }
      ctx.stroke();
    }
  }
  // 코·입 (ω), 놀라면 동그란 입
  ctx.fillStyle = '#ff8a9a';
  ctx.beginPath();
  ctx.moveTo(mx - r * 0.07, my - r * 0.1);
  ctx.lineTo(mx + r * 0.07, my - r * 0.1);
  ctx.lineTo(mx, my - r * 0.02);
  ctx.fill();
  ctx.strokeStyle = f.line;
  ctx.lineWidth = Math.max(1, r * 0.07);
  if (face === 'wow' || face === 'dizzy') {
    ctx.fillStyle = '#7a2a2a';
    ctx.beginPath();
    ctx.ellipse(mx, my + r * 0.12, r * 0.08, r * 0.1, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.13, my + r * 0.04);
    ctx.quadraticCurveTo(mx - r * 0.065, my + r * 0.13, mx, my - r * 0.01);
    ctx.quadraticCurveTo(mx + r * 0.065, my + r * 0.13, mx + r * 0.13, my + r * 0.04);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = f === BLACK ? 'rgba(255,255,255,.6)' : 'rgba(60,30,10,.55)';
  ctx.lineWidth = Math.max(0.7, r * 0.04);
  for (const sx of [-1, 1])
    for (const q of [-0.06, 0.06]) {
      ctx.beginPath();
      ctx.moveTo(mx + sx * r * 0.32, my + q * r);
      ctx.lineTo(mx + sx * r * 0.85, my + q * r * 2.4 - r * 0.02);
      ctx.stroke();
    }
  if (face === 'strain') {
    ctx.fillStyle = '#8fd3ff';
    const d = (t % 30) / 30;
    ctx.beginPath();
    ctx.ellipse(x - dir * r * 0.95, y - r * 0.3 + d * r * 0.5, r * 0.09, r * 0.14, 0, 0, TAU);
    ctx.fill();
  }
}

/** 앉은 고양이 (x,y = 발밑 가운데, u = 한 칸 px) */
function catSit(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, f: Fur, face: Face, dir: number, t: number, squash = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, squash);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 꼬리 (뒤쪽에서 위로 말린다)
  const wag = Math.sin(t / 22) * 0.12;
  ctx.strokeStyle = f.line;
  ctx.lineWidth = u * 0.11;
  ctx.beginPath();
  ctx.moveTo(-dir * u * 0.22, -u * 0.08);
  ctx.quadraticCurveTo(-dir * u * 0.55, -u * 0.1, -dir * u * (0.5 + wag), -u * 0.45);
  ctx.stroke();
  ctx.strokeStyle = f.body;
  ctx.lineWidth = u * 0.08;
  ctx.stroke();
  // 몸
  ctx.fillStyle = f.body;
  ctx.strokeStyle = f.line;
  ctx.lineWidth = Math.max(1, u * 0.025);
  ctx.beginPath();
  ctx.ellipse(-dir * u * 0.05, -u * 0.22, u * 0.27, u * 0.24, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(dir * u * 0.08, -u * 0.36, u * 0.16, u * 0.22, dir * 0.25, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = f.belly;
  ctx.beginPath();
  ctx.ellipse(dir * u * 0.13, -u * 0.32, u * 0.08, u * 0.14, dir * 0.25, 0, TAU);
  ctx.fill();
  if (f === ORANGE) {
    ctx.strokeStyle = f.stripe;
    ctx.lineWidth = u * 0.035;
    for (const q of [-0.22, -0.08, 0.06]) {
      ctx.beginPath();
      ctx.arc(-dir * u * 0.05 + dir * q * u, -u * 0.22, u * 0.2, -Math.PI * 0.85, -Math.PI * 0.55);
      ctx.stroke();
    }
  }
  // 앞발
  ctx.fillStyle = f.body;
  ctx.strokeStyle = f.line;
  ctx.lineWidth = Math.max(1, u * 0.025);
  for (const q of [0.03, 0.17]) {
    ctx.beginPath();
    ctx.roundRect(dir * u * q - u * 0.045, -u * 0.22, u * 0.09, u * 0.22, u * 0.04);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = f.belly;
    ctx.beginPath();
    ctx.ellipse(dir * u * q, -u * 0.015, u * 0.055, u * 0.03, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = f.body;
  }
  ctx.restore();
  catHead(ctx, x + dir * u * 0.12, y - u * 0.62 * squash, u * 0.2, f, face, dir, t);
}

/** 길~게 늘어난 고양이: 엉덩이(hx,hy=발밑)는 지붕에, 가슴(cx,cy)은 앞쪽 공중이나 옆 지붕에 */
function catLong(ctx: CanvasRenderingContext2D, hx: number, hy: number, cx: number, cy: number, sag: number, u: number, f: Fur, face: Face, dir: number, t: number, legs: 'reach' | 'plant' | 'dangle', tremble: number) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const th = u * 0.26;
  const ax = hx + dir * u * 0.08, ay = hy - u * 0.3;
  const mx = (ax + cx) / 2, my = (ay + cy) / 2 + sag;
  const at = (p: number): [number, number] => {
    const q = 1 - p;
    return [q * q * ax + 2 * q * p * mx + p * p * cx, q * q * ay + 2 * q * p * my + p * p * cy];
  };
  // 꼬리
  const wag = Math.sin(t / 14) * 0.15;
  ctx.strokeStyle = f.line;
  ctx.lineWidth = u * 0.11;
  ctx.beginPath();
  ctx.moveTo(hx - dir * u * 0.2, hy - u * 0.2);
  ctx.quadraticCurveTo(hx - dir * u * 0.55, hy - u * 0.25, hx - dir * u * (0.48 + wag), hy - u * 0.62);
  ctx.stroke();
  ctx.strokeStyle = f.body;
  ctx.lineWidth = u * 0.08;
  ctx.stroke();
  // 뒷다리 (지붕을 꽉 딛는다)
  ctx.fillStyle = f.body;
  ctx.strokeStyle = f.line;
  ctx.lineWidth = Math.max(1, u * 0.025);
  for (const q of [-0.12, 0.06]) {
    ctx.beginPath();
    ctx.roundRect(hx + dir * u * q - u * 0.05, hy - u * 0.2, u * 0.1, u * 0.2, u * 0.04);
    ctx.fill();
    ctx.stroke();
  }
  // 엉덩이
  ctx.beginPath();
  ctx.ellipse(hx - dir * u * 0.04, hy - u * 0.25, u * 0.22, u * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 국수 몸통: 외곽선 → 털 → 배 → 줄무늬(늘어날수록 사이가 벌어진다)
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, cx, cy);
  };
  const tr = tremble ? Math.sin(t * 1.9) * tremble : 0;
  ctx.save();
  ctx.translate(0, tr);
  path();
  ctx.strokeStyle = f.line;
  ctx.lineWidth = th + 2.4;
  ctx.stroke();
  path();
  ctx.strokeStyle = tremble > 0.6 ? mix(f.body, '#ff6a5a', Math.min(1, tremble / 3)) : f.body;
  ctx.lineWidth = th;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, th * 0.28);
  path();
  ctx.strokeStyle = f.belly;
  ctx.lineWidth = th * 0.35;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = f.stripe;
  ctx.lineWidth = Math.max(1.4, u * 0.045);
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const p = i / (n + 1), [px, py] = at(p), [qx, qy] = at(Math.min(1, p + 0.01));
    const dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.beginPath();
    ctx.moveTo(px - nx * th * 0.48 * dir, py - ny * th * 0.48 * dir);
    ctx.lineTo(px - nx * th * 0.05 * dir, py - ny * th * 0.05 * dir);
    ctx.stroke();
  }
  ctx.restore();
  // 앞다리
  ctx.strokeStyle = f.line;
  ctx.lineWidth = u * 0.1;
  const legPts: [number, number, number, number][] = [];
  for (const q of [0, 1]) {
    const lx = cx + dir * u * (0.02 + q * 0.1);
    if (legs === 'plant') legPts.push([lx, cy + tr, lx + dir * u * 0.04, cy + u * 0.28]);
    else if (legs === 'reach') legPts.push([lx, cy + tr, lx + dir * u * (0.26 + q * 0.04), cy + u * (0.1 + 0.04 * Math.sin(t / 5 + q * 2)) + tr]);
    else legPts.push([lx, cy, lx + Math.sin(t / 3 + q * 2) * u * 0.08, cy + u * 0.3]);
  }
  for (const [x0, y0, x1, y1] of legPts) {
    ctx.strokeStyle = f.line;
    ctx.lineWidth = u * 0.1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = f.body;
    ctx.lineWidth = u * 0.075;
    ctx.stroke();
    ctx.fillStyle = f.belly;
    ctx.beginPath();
    ctx.arc(x1, y1, u * 0.045, 0, TAU);
    ctx.fill();
  }
  // 가슴·머리
  ctx.fillStyle = f.body;
  ctx.strokeStyle = f.line;
  ctx.lineWidth = Math.max(1, u * 0.025);
  ctx.beginPath();
  ctx.ellipse(cx, cy + tr, u * 0.16, u * 0.15, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  catHead(ctx, cx + dir * u * 0.15, cy - u * 0.17 + tr, u * 0.2, f, face, dir, t);
  return at;
}

/** 새끼 고양이 (x,y = 발밑, u = 한 칸) */
function kitten(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, col: number, t: number, mood: 'walk' | 'sit' | 'scared' | 'happy' | 'hang', ang = 0) {
  const fur = KFUR[col], spot = KSPOT[col], s = u * 0.55;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const step = mood === 'walk' ? Math.sin(t / 2.4) : 0, hop = mood === 'happy' ? -Math.abs(Math.sin(t / 5)) * s * 0.3 : mood === 'walk' ? -Math.abs(step) * s * 0.05 : 0;
  ctx.translate(0, hop);
  const line = col === 2 ? '#141018' : 'rgba(60,40,30,.85)';
  // 꼬리 (세운다)
  ctx.strokeStyle = line;
  ctx.lineWidth = s * 0.13;
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, -s * 0.3);
  ctx.quadraticCurveTo(-s * 0.48, -s * 0.5, -s * 0.38 + Math.sin(t / 9) * s * 0.06, -s * 0.78);
  ctx.stroke();
  ctx.strokeStyle = fur;
  ctx.lineWidth = s * 0.08;
  ctx.stroke();
  // 다리
  ctx.strokeStyle = line;
  ctx.lineWidth = s * 0.1;
  for (const [lx, ph] of [[-0.2, 0], [-0.05, Math.PI], [0.12, Math.PI], [0.24, 0]] as [number, number][]) {
    const sw = mood === 'walk' ? Math.sin(t / 2.4 + ph) * s * 0.08 : 0;
    ctx.beginPath();
    ctx.moveTo(lx * s, -s * 0.22);
    ctx.lineTo(lx * s + sw, mood === 'hang' ? s * 0.05 + Math.abs(sw) : 0);
    ctx.stroke();
  }
  // 몸
  ctx.fillStyle = fur;
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(0.8, s * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.3, s * 0.34, s * 0.17, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (col === 4 || col === 0 || col === 5) {
    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, -s * 0.36, s * 0.13, s * 0.08, 0.3, 0, TAU);
    ctx.fill();
  }
  // 머리
  const hx = s * 0.33, hy = -s * 0.52;
  ctx.fillStyle = fur;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sx * s * 0.17 - s * 0.08, hy - s * 0.08);
    ctx.lineTo(hx + sx * s * 0.2, hy - s * 0.32);
    ctx.lineTo(hx + sx * s * 0.17 + s * 0.08, hy - s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(hx, hy, s * 0.21, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (col === 4) {
    ctx.fillStyle = '#3a3540';
    ctx.beginPath();
    ctx.arc(hx - s * 0.08, hy - s * 0.06, s * 0.09, 0, TAU);
    ctx.fill();
  }
  // 눈
  ctx.fillStyle = col === 2 ? '#ffe27a' : '#2a1a10';
  ctx.strokeStyle = col === 2 ? '#ffe27a' : '#2a1a10';
  ctx.lineWidth = Math.max(1, s * 0.05);
  for (const ex of [hx - s * 0.02, hx + s * 0.11]) {
    if (mood === 'happy') {
      ctx.beginPath();
      ctx.arc(ex, hy + s * 0.01, s * 0.04, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(ex, hy - s * 0.01, mood === 'scared' || mood === 'hang' ? s * 0.055 : s * 0.04, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#ff8a9a';
  ctx.beginPath();
  ctx.arc(hx + s * 0.05, hy + s * 0.07, s * 0.025, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function dog(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, light: boolean, awake: boolean, t: number) {
  const s = u * 0.9;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(30,20,20,.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.42, s * 0.08, 0, 0, TAU);
  ctx.fill();
  const breathe = 1 + (awake ? 0 : Math.sin(t / 18) * 0.04);
  if (awake) ctx.translate(Math.sin(t * 1.3) * 1.5, -s * 0.06);
  ctx.fillStyle = '#d9a066';
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.16 * breathe, s * 0.38, s * 0.17 * breathe, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff4e4';
  ctx.beginPath();
  ctx.ellipse(-s * 0.08, -s * 0.12, s * 0.16, s * 0.08, 0, 0, TAU);
  ctx.fill();
  // 머리 (왼쪽을 보고 엎드림)
  const hx = -s * 0.36, hy = awake ? -s * 0.34 : -s * 0.2;
  ctx.fillStyle = '#d9a066';
  ctx.beginPath();
  ctx.ellipse(hx, hy, s * 0.17, s * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff4e4';
  ctx.beginPath();
  ctx.ellipse(hx - s * 0.12, hy + s * 0.04, s * 0.09, s * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(hx - s * 0.2, hy + s * 0.02, s * 0.035, 0, TAU);
  ctx.fill();
  // 귀: 얕은 잠이면 쫑긋, 깨면 번쩍
  const earUp = awake ? -0.9 : light ? -0.35 + Math.sin(t / 3) * 0.2 : 0.4;
  ctx.fillStyle = '#8a5a30';
  ctx.save();
  ctx.translate(hx + s * 0.06, hy - s * 0.08);
  ctx.rotate(earUp);
  ctx.beginPath();
  ctx.ellipse(s * 0.04, s * 0.08, s * 0.06, s * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 눈
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1, s * 0.03);
  if (awake) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx - s * 0.04, hy - s * 0.04, s * 0.05, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.arc(hx - s * 0.05, hy - s * 0.04, s * 0.02, 0, TAU);
    ctx.fill();
  } else if (light) {
    ctx.beginPath();
    ctx.arc(hx - s * 0.04, hy - s * 0.04, s * 0.035, 0, Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.arc(hx - s * 0.04, hy - s * 0.03, s * 0.015, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(hx - s * 0.04, hy - s * 0.05, s * 0.035, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 꼬리
  ctx.strokeStyle = '#8a5a30';
  ctx.lineWidth = s * 0.06;
  ctx.beginPath();
  ctx.moveTo(s * 0.35, -s * 0.2);
  ctx.quadraticCurveTo(s * 0.5, -s * 0.25, s * 0.48 + (awake ? Math.sin(t) * s * 0.06 : 0), -s * (awake ? 0.42 : 0.12));
  ctx.stroke();
  ctx.restore();
}

function pigeon(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, dir: number, t: number, fly = false) {
  const s = u * 0.42;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(30,20,20,.2)';
  if (!fly) {
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.4, s * 0.08, 0, 0, TAU);
    ctx.fill();
  }
  const bob = fly ? 0 : Math.max(0, Math.sin(t / 4)) * s * 0.12;
  ctx.fillStyle = '#9aa3b5';
  ctx.strokeStyle = '#4a5060';
  ctx.lineWidth = Math.max(0.8, s * 0.05);
  ctx.beginPath();
  ctx.ellipse(-s * 0.05, -s * 0.38, s * 0.36, s * 0.22, -0.15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a8296';
  ctx.beginPath();
  if (fly) {
    const fl = Math.sin(t * 0.9) * s * 0.4;
    ctx.moveTo(-s * 0.1, -s * 0.45);
    ctx.lineTo(-s * 0.3, -s * 0.8 - fl);
    ctx.lineTo(s * 0.15, -s * 0.48);
  } else ctx.ellipse(-s * 0.1, -s * 0.38, s * 0.22, s * 0.12, -0.2, 0, TAU);
  ctx.fill();
  // 목·머리 (무지갯빛)
  ctx.fillStyle = '#5ab08a';
  ctx.beginPath();
  ctx.ellipse(s * 0.22, -s * 0.5 + bob * 0.3, s * 0.12, s * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8a92a6';
  ctx.beginPath();
  ctx.arc(s * 0.3 + bob, -s * 0.66 + bob * 0.5, s * 0.12, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff7a3a';
  ctx.beginPath();
  ctx.arc(s * 0.33 + bob, -s * 0.69 + bob * 0.5, s * 0.03, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e0b060';
  ctx.beginPath();
  ctx.moveTo(s * 0.4 + bob, -s * 0.68 + bob * 0.5);
  ctx.lineTo(s * 0.52 + bob, -s * 0.63 + bob * 0.5);
  ctx.lineTo(s * 0.4 + bob, -s * 0.6 + bob * 0.5);
  ctx.fill();
  if (!fly) {
    ctx.strokeStyle = '#d06a5a';
    ctx.lineWidth = Math.max(0.8, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, -s * 0.18);
    ctx.lineTo(-s * 0.04, 0);
    ctx.moveTo(s * 0.08, -s * 0.18);
    ctx.lineTo(s * 0.08, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function fish(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number) {
  const s = u * 0.32, bob = Math.sin(t / 10) * 1.5;
  ctx.fillStyle = 'rgba(30,20,20,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.8, s * 0.18, 0, 0, TAU);
  ctx.fill();
  // 접시
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#9ab0c8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, s * 0.75, s * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  const fy = y - s * 0.35 + bob * 0.3;
  ctx.fillStyle = '#7fb6e0';
  ctx.strokeStyle = '#2f5a80';
  ctx.beginPath();
  ctx.ellipse(x, fy, s * 0.55, s * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, fy);
  ctx.lineTo(x - s * 0.85, fy - s * 0.2);
  ctx.lineTo(x - s * 0.85, fy + s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d8ecff';
  ctx.beginPath();
  ctx.ellipse(x + s * 0.05, fy + s * 0.06, s * 0.3, s * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#16263a';
  ctx.beginPath();
  ctx.arc(x + s * 0.32, fy - s * 0.04, s * 0.05, 0, TAU);
  ctx.fill();
  const tw = Math.abs(Math.sin(t / 14));
  ctx.fillStyle = `rgba(255,255,255,${tw})`;
  ctx.fillRect(x + s * 0.5 - 1, fy - s * 0.6 - 3 * tw, 2, 6 * tw);
  ctx.fillRect(x + s * 0.5 - 3 * tw, fy - s * 0.6 - 1, 6 * tw, 2);
}

function drawWorld(ctx: CanvasRenderingContext2D, s: CatState, w: number, h: number, th: Theme) {
  const fx = juice(s), R = s.roofs, c = s.cat, k = s.k, ct = s.ct;
  const S = w / 7.2, top = w * 0.12, botY = h - w * 0.105;
  const yS = botY - S * 0.55, D = S * 0.82, KX = S * 0.42, CZ = 0.45;
  const night = k === STAGES - 1;
  const frac = Math.min(1, ct / s.limit);
  /** 판을 깬 뒤 지난 틱 (집이 하나씩 뚝딱 지어지는 시계) */
  const since = s.phase === 'pause' && s.cleared ? (k === STAGES - 1 ? 200 : 150) - s.pause : -1;
  const dusk = night ? 1 : Math.max(0, (frac - 0.35) / 0.65);
  const rh = (j: number) => R[j].h;
  // ── 고양이 자세 (그림용) ──
  const r0 = R[c.at], h0 = r0.h, e0 = rx1(r0, ct);
  let hipX = e0 - 0.62, tipX = e0, tipH = h0 + 0.42, pose: 'sit' | 'long' | 'fall' | 'fly' = 'sit', sag = 0, legs: 'reach' | 'plant' | 'dangle' = 'reach';
  let face: Face = 'meh';
  let flyP = 0;
  if (c.mode === 'stretch') {
    hipX = c.edge - 0.62;
    tipX = c.edge + c.L;
    tipH = h0 + 0.42 - Math.max(0, c.L - 2.5) * 0.05;
    pose = 'long';
    face = c.L > LMAX * 0.78 || gust(k, ct) > 0.3 ? 'strain' : 'meh';
  } else if (c.mode === 'bridge') {
    hipX = c.edge - 0.62;
    tipX = c.xp;
    tipH = c.pal ? h0 + 0.42 : rh(c.to) + 0.3;
    pose = 'long';
    legs = c.pal ? 'reach' : 'plant';
    sag = S * Math.min(0.35, 0.05 + (c.xp - c.edge) * 0.04);
    face = s.t - s.lastFish < 70 ? 'smug' : 'meh';
  } else if (c.mode === 'pull') {
    const walk = Math.max(0, rx1(R[c.to], ct) - c.xp), sp = Math.min(1, c.timer / PULL);
    const e = 1 - Math.pow(1 - sp, 3) + Math.sin(sp * Math.PI) * 0.12;
    const hx0 = c.edge - 0.62, hx1 = c.xp - 0.62;
    if (c.timer < PULL) {
      hipX = hx0 + (hx1 - hx0) * e;
      tipX = c.xp;
      tipH = rh(c.to) + 0.3;
      pose = Math.abs(tipX - hipX) > 0.75 ? 'long' : 'sit';
      legs = 'plant';
    } else {
      const wp = Math.min(1, (c.timer - PULL) / Math.max(1, Math.ceil(walk / 0.12)));
      hipX = hx1 + walk * wp;
      tipX = hipX + 0.62;
    }
    face = 'smug';
  } else if (c.mode === 'fall') {
    pose = 'fall';
    face = c.timer > FALL - 25 ? 'wow' : 'strain';
  } else if (c.mode === 'fly') {
    pose = 'fly';
    flyP = 1 - c.timer / FLY;
    face = flyP < 0.6 ? 'wow' : 'dizzy';
  } else if (s.phase === 'pause' && s.cleared) face = 'smug';
  else if (s.t - s.lastSnap < 200 || s.t - s.lastFall < 160) face = 'sleepy';
  // ── 카메라 ──
  const VW = w / S;
  let camX = hipX - 1.55;
  if (pose === 'long') camX = Math.max(camX, Math.min(tipX + 1.5 - VW, hipX - 0.4));
  if (since >= 0) {
    // 새 마을이 화면 가운데 오도록 카메라를 천천히 옮긴다
    const g = R[s.starts[k + 1]], e = Math.min(1, since / 24), mid = (g.x0 + g.x1) / 2 + 0.6 - VW / 2;
    camX += (mid - camX) * (e * e * (3 - 2 * e));
  }
  const X = (wx: number, z: number) => (wx - camX) * S + z * KX;
  const Y = (z: number, hg: number) => yS - z * D - hg * S;
  const x0v = camX - 1, x1v = camX + VW + 1;
  const hit = s.events.filter((e) => s.t - e.t < 60);
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  const SKY_T = ['#7cc4f0', '#9cb2ea', '#e98a78', '#4a3a7a'], SKY_B = ['#e6f6ff', '#ffe2b0', '#ffb070', '#ee8a70'];
  const sky = ctx.createLinearGradient(0, top, 0, yS - 2.6 * S);
  sky.addColorStop(0, night ? '#0e1236' : grad(SKY_T, frac));
  sky.addColorStop(1, night ? '#3a2a62' : grad(SKY_B, frac));
  ctx.fillStyle = sky;
  ctx.fillRect(-12, -12, w + 24, h + 24);
  if (night || dusk > 0.7)
    for (let i = 0; i < 46; i++) {
      ctx.globalAlpha = (night ? 1 : (dusk - 0.7) * 3) * (0.3 + 0.6 * Math.abs(Math.sin(s.t / 30 + i)));
      ctx.fillStyle = '#fffbe6';
      ctx.fillRect(hsh(i * 3.1) * w, top + hsh(i * 5.7 + 1) * (yS - 3.4 * S - top), 1.6, 1.6);
    }
  ctx.globalAlpha = 1;
  // 해(판 시계) · 달
  if (!night) {
    const sx = w * 0.78, sy = top + S * 0.5 + frac * S * 2.6;
    const sc = mix('#fff4b8', '#ff7a3d', frac);
    const gl = ctx.createRadialGradient(sx, sy, 2, sx, sy, w * 0.42);
    gl.addColorStop(0, rgba(mix('#fff6c8', '#ffb070', frac), 0.55));
    gl.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = sc;
    ctx.shadowColor = sc;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(sx, sy, S * 0.42, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#fff3c4';
    ctx.shadowColor = '#fff3c4';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(w * 0.8, top + S * 0.9, S * 0.38, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#16183e';
    ctx.beginPath();
    ctx.arc(w * 0.8 + S * 0.16, top + S * 0.8, S * 0.33, 0, TAU);
    ctx.fill();
  }
  // 구름
  for (let i = 0; i < 4; i++) {
    const cx = ((((i * 211 + s.t * 0.1 - camX * S * 0.08) % (w + 160)) + w + 160) % (w + 160)) - 80, cy = top + S * 0.35 + i * S * 0.42;
    ctx.fillStyle = night ? 'rgba(120,120,180,.22)' : rgba(mix('#ffffff', '#ffc2a8', frac), 0.82);
    for (const [dx, dy, r] of [[0, 0, 0.3], [0.3, -0.1, 0.24], [-0.3, -0.04, 0.22], [0.55, 0.04, 0.17]]) (ctx.beginPath(), ctx.arc(cx + dx * S, cy + dy * S, r * S, 0, TAU), ctx.fill());
  }
  // 새 떼
  if (!night) {
    ctx.strokeStyle = 'rgba(60,50,70,.55)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const bx = w + 30 - ((s.t * (0.45 + i * 0.1) + i * 140) % (w + 80)), by = top + S * 0.8 + i * 13 + Math.sin(s.t / 30 + i) * 5, fl = Math.sin(s.t / 5 + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by - fl);
      ctx.quadraticCurveTo(bx - 3, by - 2, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 2, bx + 6, by - fl);
      ctx.stroke();
    }
  }
  // ── 먼 지붕 실루엣 (시차, 멀수록 하늘빛에 묻힌다) ──
  const skyLow = night ? '#3a2a62' : grad(SKY_B, frac);
  for (const [par, base, tone, n] of [[0.15, yS - 2.95 * S, 0.3, 0], [0.35, yS - 2.45 * S, 0.5, 1]] as [number, number, number, number][]) {
    const off = camX * S * par, step = S * (n ? 1.1 : 0.85);
    const col = night ? mix('#262856', '#141432', n * 0.4) : mix(skyLow, mix('#9a82b8', '#4a3a72', dusk), tone);
    const i0 = Math.floor(off / step) - 1;
    for (let i = i0; i < i0 + w / step + 3; i++) {
      ctx.fillStyle = col;
      const bx = i * step - off, hh = (0.25 + hsh(i * 1.7 + n) * 0.85) * S, bw = step * (0.75 + hsh(i * 2.3 + n) * 0.2);
      ctx.fillRect(bx, base - hh, bw, yS - base + hh);
      // 지붕 모양: 삼각 지붕 · 굴뚝 · 첨탑 · 고양이 귀 지붕
      const kind = Math.floor(hsh(i * 3.9 + n) * 5);
      ctx.beginPath();
      if (kind === 0) (ctx.moveTo(bx - 2, base - hh), ctx.lineTo(bx + bw / 2, base - hh - S * 0.4), ctx.lineTo(bx + bw + 2, base - hh));
      else if (kind === 1) ctx.rect(bx + bw * 0.65, base - hh - S * 0.28, bw * 0.14, S * 0.28);
      else if (kind === 2 && n === 0) (ctx.moveTo(bx + bw * 0.42, base - hh), ctx.lineTo(bx + bw * 0.5, base - hh - S * 0.9), ctx.lineTo(bx + bw * 0.58, base - hh));
      else if (kind === 3) {
        ctx.moveTo(bx + bw * 0.1, base - hh);
        ctx.lineTo(bx + bw * 0.25, base - hh - S * 0.3);
        ctx.lineTo(bx + bw * 0.4, base - hh);
        ctx.moveTo(bx + bw * 0.6, base - hh);
        ctx.lineTo(bx + bw * 0.75, base - hh - S * 0.3);
        ctx.lineTo(bx + bw * 0.9, base - hh);
      }
      ctx.fill();
      if (dusk > 0.25)
        for (let q = 0; q < 3; q++)
          if (hsh(i * 7 + q + n * 3) < 0.4 + dusk * 0.3) {
            ctx.fillStyle = `rgba(255,${200 + n * 20},110,${Math.min(1, (dusk - 0.25) * 2) * (0.45 + n * 0.3)})`;
            ctx.fillRect(bx + bw * (0.2 + q * 0.25), base - hh + S * (0.2 + hsh(i + q) * 0.3), S * 0.08, S * 0.1);
          }
    }
  }
  // ── 골목 안쪽 벽 (틈 사이로 보인다: 따뜻한 벽돌, 지붕보다 낮게) ──
  {
    const off = camX * S * 0.7, step = S * 1.3;
    const i0 = Math.floor(off / step) - 1;
    for (let i = i0; i < i0 + w / step + 3; i++) {
      const bx = i * step - off, top0 = yS - (1.45 + hsh(i * 4.1) * 0.5) * S;
      const wc = night ? '#2e2444' : mix(['#b08070', '#a07a88', '#b89070'][Math.floor(hsh(i * 2.2) * 3)], '#4e3550', dusk * 0.85);
      ctx.fillStyle = wc;
      ctx.fillRect(bx, top0, step + 1, yS - top0);
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      ctx.fillRect(bx + step - 3, top0, 3, yS - top0);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(bx, top0, step, 2);
      ctx.fillStyle = 'rgba(60,20,30,.12)';
      for (let q = 0; q < 6; q++) ctx.fillRect(bx + hsh(i * 9 + q) * step * 0.8, top0 + S * 0.2 + hsh(i * 3 + q) * (yS - top0 - S * 0.4), S * 0.2, S * 0.07);
      for (let q = 0; q < 2; q++) {
        const wx = bx + step * (0.2 + q * 0.45), wy = top0 + S * 0.35;
        const lit = dusk > 0.3 && hsh(i * 5 + q) < 0.6;
        ctx.fillStyle = lit ? `rgba(255,214,120,${0.4 + dusk * 0.5})` : 'rgba(40,30,60,.3)';
        ctx.fillRect(wx, wy, S * 0.22, S * 0.28);
      }
    }
  }
  // ── 디오라마 받침: 길바닥 · 흙층 · 나무 받침대 ──
  {
    const tb = ctx.createLinearGradient(0, yS, 0, h);
    tb.addColorStop(0, '#8a5a3a');
    tb.addColorStop(1, '#3d2519');
    ctx.fillStyle = tb;
    ctx.fillRect(-10, yS, w + 20, h - yS + 10);
    // 길 윗면 (골목 바닥)
    ctx.fillStyle = night ? '#4a4258' : mix('#c8b8a8', '#7a6878', dusk * 0.7);
    ctx.beginPath();
    ctx.moveTo(-10, yS);
    ctx.lineTo(w + 10, yS);
    ctx.lineTo(w + 10, yS - D);
    ctx.lineTo(-10, yS - D);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,60,.25)';
    ctx.lineWidth = 1;
    for (let q = Math.floor(x0v * 2) / 2; q < x1v; q += 0.5) {
      ctx.beginPath();
      ctx.moveTo(X(q, 0), yS);
      ctx.lineTo(X(q, 1), yS - D);
      ctx.stroke();
    }
    // 앞면 흙층
    const T = S * 0.42;
    const fg = ctx.createLinearGradient(0, yS, 0, yS + T);
    fg.addColorStop(0, '#9a8a7a');
    fg.addColorStop(0.3, '#8a5a3a');
    fg.addColorStop(1, '#4e3122');
    ctx.fillStyle = fg;
    ctx.fillRect(-10, yS, w + 20, T);
    ctx.strokeStyle = 'rgba(40,20,10,.35)';
    ctx.lineWidth = 1.5;
    for (const f of [0.45, 0.75]) {
      ctx.beginPath();
      for (let q = Math.floor(x0v * 2) / 2; q <= x1v; q += 0.5) ctx.lineTo(X(q, 0), yS + T * f + Math.sin(q * 1.7 + f * 9) * 1.6);
      ctx.stroke();
    }
    for (let q = Math.floor(x0v); q < x1v; q += 1) {
      const r1 = hsh(q * 1.31);
      if (r1 < 0.4) continue;
      ctx.fillStyle = r1 > 0.8 ? '#b9ab9a' : '#6d4a34';
      ctx.beginPath();
      ctx.ellipse(X(q + r1 * 0.8, 0), yS + T * (0.3 + r1 * 0.5), 2.5 + r1 * 2.5, 1.8 + r1 * 1.2, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 고양이를 그릴 차례를 알기 위해 지붕을 뒤에서부터 (x 순서로) 그린다
  const glows: [number, number, number, string][] = [];
  const front: (() => void)[] = [];
  const jl = Math.max(0, c.at - 4), jr = Math.min(R.length - 1, c.at + 7);
  // 골목 빨랫줄 (지붕 앞면보다 먼저 = 틈 안에)
  const lines: { xa: number; xb: number; lh: number; j: number }[] = [];
  for (let j = jl; j < jr; j++) {
    const a = R[j];
    if (a.kind === BASKET) continue;
    let b = j + 1;
    while (b <= jr && R[b].kind === BASKET) b++;
    if (b > jr) break;
    const xa = a.x1, xb = R[b].x0;
    if (xb < x0v || xa > x1v) continue;
    const lh = Math.min(a.h, R[b].h) - 0.95;
    lines.push({ xa, xb, lh, j });
  }
  // ── 지붕 (건물) ──
  const roofAt = (j: number) => {
    const r = R[j];
    if (r.kind === BASKET) return drawBasket(j);
    const xa = r.x0, xb = r.x1;
    if (xb < x0v - 1 || xa > x1v + 1) return;
    const pi = Math.floor(r.v * PLASTER.length), wall = PLASTER[pi], trim = TRIM[pi];
    const dk = night ? 0.45 : dusk * 0.35;
    const L0 = X(xa, 0), R0 = X(xb, 0), yT = Y(0, r.h);
    // 바닥 그림자
    ctx.fillStyle = 'rgba(30,15,30,.28)';
    ctx.beginPath();
    ctx.moveTo(R0, yS);
    ctx.lineTo(R0 + S * 0.35, yS - D * 0.2);
    ctx.lineTo(X(xb, 1) + S * 0.35, yS - D);
    ctx.lineTo(X(xb, 1), yS - D);
    ctx.fill();
    // 오른쪽 옆면
    ctx.fillStyle = mix(mix(wall, '#3a2a40', 0.38), '#141028', dk);
    ctx.beginPath();
    ctx.moveTo(R0, yT);
    ctx.lineTo(X(xb, 1), Y(1, r.h));
    ctx.lineTo(X(xb, 1), Y(1, 0));
    ctx.lineTo(R0, yS);
    ctx.fill();
    // 앞면 (아래로 갈수록 어둡게)
    const fg = ctx.createLinearGradient(0, yT, 0, yS);
    fg.addColorStop(0, mix(wall, '#1a1430', dk));
    fg.addColorStop(1, mix(mix(wall, '#6a4a5a', 0.35), '#100c22', dk));
    ctx.fillStyle = fg;
    ctx.fillRect(L0, yT, R0 - L0, yS - yT);
    // 벽돌 무늬 몇 개
    ctx.fillStyle = rgba(trim, 0.12);
    for (let q = 0; q < 6; q++) {
      const bx = L0 + hsh(j * 9 + q) * (R0 - L0 - 10), by = yT + S * 0.3 + hsh(j * 13 + q) * (yS - yT - S * 0.5);
      ctx.fillRect(bx, by, S * 0.18, S * 0.08);
    }
    // 창문: 층마다
    const cols = Math.max(1, Math.floor((xb - xa) / 0.62));
    for (let fl = 0; fl < 3; fl++) {
      const wy = r.h - 0.5 - fl * 0.82;
      if (wy < 0.35) break;
      for (let q = 0; q < cols; q++) {
        const wx = xa + ((q + 0.5) * (xb - xa)) / cols, seed = j * 31 + fl * 7 + q;
        const lit = night ? hsh(seed) < 0.75 : dusk > 0.2 && hsh(seed) < dusk * 0.9;
        const px = X(wx, 0), py = Y(0, wy), ww = S * 0.3, wh = S * 0.38;
        if (hsh(seed * 1.7) < 0.13 && fl > 0) {
          // 문 대신 화분 선반만
          continue;
        }
        ctx.fillStyle = '#fff8ee';
        ctx.fillRect(px - ww / 2 - 2, py - wh / 2 - 2, ww + 4, wh + 4);
        ctx.fillStyle = lit ? '#ffd56a' : mix('#6a8ab8', '#2a3050', dk);
        if (lit) (ctx.shadowColor = '#ffc04a'), (ctx.shadowBlur = 10);
        ctx.fillRect(px - ww / 2, py - wh / 2, ww, wh);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(px - ww / 2 + 2, py - wh / 2 + 2, ww * 0.25, wh * 0.4);
        ctx.strokeStyle = '#fff8ee';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(px, py - wh / 2);
        ctx.lineTo(px, py + wh / 2);
        ctx.moveTo(px - ww / 2, py);
        ctx.lineTo(px + ww / 2, py);
        ctx.stroke();
        // 덧창
        const sc = SHUT[Math.floor(hsh(seed * 2.3) * SHUT.length)];
        if (hsh(seed * 3.1) < 0.6) {
          ctx.fillStyle = mix(sc, '#101020', dk);
          ctx.fillRect(px - ww / 2 - S * 0.13, py - wh / 2, S * 0.1, wh);
          ctx.fillRect(px + ww / 2 + S * 0.03, py - wh / 2, S * 0.1, wh);
        }
        // 화분 상자
        if (hsh(seed * 4.7) < 0.55) {
          ctx.fillStyle = mix('#a0583a', '#301810', dk);
          ctx.fillRect(px - ww / 2 - 2, py + wh / 2 + 1, ww + 4, S * 0.08);
          for (let p = 0; p < 3; p++) {
            ctx.fillStyle = mix(['#ff6b8a', '#ffd23f', '#ffffff'][(seed + p) % 3], '#302020', dk);
            ctx.beginPath();
            ctx.arc(px - ww / 3 + p * ww / 3, py + wh / 2, S * 0.045, 0, TAU);
            ctx.fill();
          }
        }
        if (lit) glows.push([px, py, S * 0.6, '255,200,110']);
        // 창가 주민: 고양이가 빠지거나 날아가면 '어머!'
        if (fl === 0 && q === 0 && hsh(seed * 5.3) < 0.35) {
          const near = hit.find((e) => (e.kind === 'fall' || e.kind === 'snap' || e.kind === 'pigeon' || e.kind === 'dog' || e.kind === 'long') && Math.abs(e.x - wx) < 3.5);
          if (near) {
            ctx.fillStyle = '#ffdcb8';
            ctx.beginPath();
            ctx.arc(px, py + wh * 0.05, S * 0.1, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#c8c8d8';
            ctx.beginPath();
            ctx.arc(px, py - wh * 0.1, S * 0.1, Math.PI, TAU);
            ctx.fill();
            ctx.fillStyle = '#2a1a10';
            ctx.fillRect(px - S * 0.04, py, 1.5, 1.5);
            ctx.fillRect(px + S * 0.03, py, 1.5, 1.5);
            front.push(() => bubble(ctx, px, py - wh * 0.9, near.kind === 'long' ? '길다…!' : hsh(seed) < 0.5 ? '어머!' : '아이고', 12));
          }
        }
      }
    }
    // 처마 띠
    ctx.fillStyle = mix(trim, '#141028', dk);
    ctx.fillRect(L0 - 2, yT, R0 - L0 + 4, S * 0.12);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(L0 - 2, yT, R0 - L0 + 4, 1.5);
    // 윗면 (옥상 테라스)
    const T0 = [X(xa, 0), Y(0, r.h)], T1 = [X(xb, 0), Y(0, r.h)], T2 = [X(xb, 1), Y(1, r.h)], T3 = [X(xa, 1), Y(1, r.h)];
    const tg = ctx.createLinearGradient(0, T3[1], 0, T0[1]);
    tg.addColorStop(0, mix(r.kind === LOT ? '#d8c8a0' : '#e8b088', '#2a2040', dk));
    tg.addColorStop(1, mix(r.kind === LOT ? '#c8b088' : '#d89670', '#201838', dk));
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(T0[0], T0[1]);
    ctx.lineTo(T1[0], T1[1]);
    ctx.lineTo(T2[0], T2[1]);
    ctx.lineTo(T3[0], T3[1]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,60,40,.18)';
    ctx.lineWidth = 1;
    for (let q = Math.ceil(xa * 3) / 3; q < xb; q += 1 / 3) {
      ctx.beginPath();
      ctx.moveTo(X(q, 0), Y(0, r.h));
      ctx.lineTo(X(q, 1), Y(1, r.h));
      ctx.stroke();
    }
    for (const z of [0.33, 0.66]) {
      ctx.beginPath();
      ctx.moveTo(X(xa, z), Y(z, r.h));
      ctx.lineTo(X(xb, z), Y(z, r.h));
      ctx.stroke();
    }
    // 뒤쪽 난간
    ctx.strokeStyle = mix('#fff2e0', '#3a3050', dk);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(X(xa, 1), Y(1, r.h + 0.2));
    ctx.lineTo(X(xb, 1), Y(1, r.h + 0.2));
    ctx.stroke();
    for (let q = xa + 0.15; q < xb; q += 0.35) {
      ctx.beginPath();
      ctx.moveTo(X(q, 1), Y(1, r.h));
      ctx.lineTo(X(q, 1), Y(1, r.h + 0.2));
      ctx.stroke();
    }
    // 옥상 소품: 굴뚝(연기) · 안테나 · 물탱크 · 작은 다락
    const prop = Math.floor(hsh(j * 2.9) * 4);
    if (r.kind === ROOF) {
      const px = xa + (xb - xa) * (0.25 + hsh(j * 3.3) * 0.5);
      if (prop === 0) {
        const cx0 = X(px, 0.85), cy0 = Y(0.85, r.h);
        ctx.fillStyle = mix('#b85a40', '#301818', dk);
        ctx.fillRect(cx0 - S * 0.12, cy0 - S * 0.55, S * 0.24, S * 0.55);
        ctx.fillStyle = mix('#8a3a2a', '#201010', dk);
        ctx.fillRect(cx0 - S * 0.15, cy0 - S * 0.6, S * 0.3, S * 0.08);
        for (let p = 0; p < 3; p++) {
          const ph = ((s.t + p * 30 + j * 11) % 90) / 90;
          ctx.fillStyle = `rgba(235,235,240,${0.45 * (1 - ph)})`;
          ctx.beginPath();
          ctx.arc(cx0 + ph * S * 0.3 + (k === 4 ? -ph * S * 0.8 * gust(k, ct) : 0), cy0 - S * 0.7 - ph * S * 0.7, 2 + ph * 4, 0, TAU);
          ctx.fill();
        }
      } else if (prop === 1) {
        const ax = X(px, 0.9), ay = Y(0.9, r.h);
        ctx.strokeStyle = mix('#6a6a78', '#202028', dk);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax, ay - S * 0.9);
        ctx.moveTo(ax - S * 0.25, ay - S * 0.7);
        ctx.lineTo(ax + S * 0.25, ay - S * 0.7);
        ctx.moveTo(ax - S * 0.18, ay - S * 0.85);
        ctx.lineTo(ax + S * 0.18, ay - S * 0.85);
        ctx.stroke();
        if (k === 4) {
          // 바람 자루
          const g = gust(k, ct), fl = Math.sin(s.t / 3) * 2;
          ctx.fillStyle = '#ff6a4a';
          ctx.beginPath();
          ctx.moveTo(ax, ay - S * 0.9);
          ctx.lineTo(ax - S * (0.2 + g * 0.35), ay - S * (0.9 - 0.25 + g * 0.2) + fl * g);
          ctx.lineTo(ax - S * (0.2 + g * 0.35), ay - S * (0.9 - 0.4 + g * 0.2) + fl * g);
          ctx.lineTo(ax, ay - S * 0.75);
          ctx.fill();
        }
      } else if (prop === 2) {
        const tx = X(px, 0.8), ty = Y(0.8, r.h);
        ctx.fillStyle = mix('#8ab0c8', '#203040', dk);
        ctx.fillRect(tx - S * 0.2, ty - S * 0.55, S * 0.4, S * 0.4);
        ctx.fillStyle = mix('#6a90a8', '#182838', dk);
        ctx.beginPath();
        ctx.ellipse(tx, ty - S * 0.55, S * 0.2, S * 0.06, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = mix('#5a6a78', '#202028', dk);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx - S * 0.15, ty - S * 0.15);
        ctx.lineTo(tx - S * 0.18, ty);
        ctx.moveTo(tx + S * 0.15, ty - S * 0.15);
        ctx.lineTo(tx + S * 0.18, ty);
        ctx.stroke();
      }
    }
    // 생선 접시
    if (r.fish >= 0 && !r.got) front.push(() => fish(ctx, X(r.fish, CZ), Y(CZ, r.h) + 2, S, s.t + j * 7));
    // 자는 멍멍이
    if (r.dog >= 0) {
      const dd = hit.find((e) => e.kind === 'dog' && Math.abs(e.x - r.dog) < 0.1);
      const awake = !!dd, light = dogLight(r, ct), warn = (ct + r.dogPh) % DP >= DWARN;
      front.push(() => {
        // 깰 수 있는 자리(1칸): 꿈틀이면 점선, 얕은 잠이면 빨갛게
        const ahead = j > c.at;
        if (!awake && ahead && (warn || light)) {
          const zx0 = X(Math.max(rx0(r, ct), r.dog - 1.1), CZ), zx1 = X(Math.min(r.x1, r.dog + 1.1), CZ), zy0 = Y(CZ, r.h);
          ctx.fillStyle = light ? 'rgba(255,70,70,.28)' : 'rgba(255,170,70,.14)';
          ctx.strokeStyle = light ? 'rgba(255,70,70,.8)' : 'rgba(255,170,70,.6)';
          ctx.lineWidth = 1.5;
          if (!light) ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.ellipse((zx0 + zx1) / 2, zy0, (zx1 - zx0) / 2, S * 0.2, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }
        dog(ctx, X(r.dog, CZ + 0.15) + (warn && !light && !awake ? Math.sin(s.t * 1.4) * 1.2 : 0), Y(CZ + 0.15, r.h), S, light, awake, s.t);
        const zx = X(r.dog, CZ + 0.15) - S * 0.15, zy = Y(CZ + 0.15, r.h) - S * 0.55;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (awake) bubble(ctx, zx, zy - 6, '왈왈!!', 13);
        else if (ahead && (light || warn)) {
          const t2 = light ? '!' : '?';
          ctx.fillStyle = light ? '#ff4a4a' : '#ffb347';
          ctx.font = `900 ${S * (light ? 0.42 : 0.3)}px system-ui, sans-serif`;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeText(t2, zx, zy - S * 0.1);
          ctx.fillText(t2, zx, zy - S * 0.1);
        } else {
          const ph = ((ct + r.dogPh) % DP) / DWARN;
          ctx.font = `900 ${S * 0.28}px system-ui, sans-serif`;
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(40,30,60,.5)';
          for (let q = 0; q < 3; q++) {
            const zz = (ph * 3 + q / 3) % 1;
            ctx.globalAlpha = 1 - zz;
            ctx.fillStyle = '#ffffff';
            ctx.strokeText('Z', zx + zz * S * 0.4, zy - zz * S * 0.5);
            ctx.fillText('Z', zx + zz * S * 0.4, zy - zz * S * 0.5);
          }
          ctx.globalAlpha = 1;
        }
      });
    }
    // 비둘기
    for (const p of r.pig) {
      const px = pigX(p, ct), vx = Math.cos((TAU * (ct + p.ph)) / p.per);
      const scat = hit.find((e) => e.kind === 'pigeon' && Math.abs(e.x - px) < 0.5);
      front.push(() => {
        if (scat) pigeon(ctx, X(px, CZ + 0.1) + (s.t - scat.t) * 1.5, Y(CZ + 0.1, r.h) - (s.t - scat.t) * 2.2, S, 1, s.t, true);
        else pigeon(ctx, X(px, CZ + 0.1), Y(CZ + 0.1, r.h), S, vx >= 0 ? 1 : -1, s.t + p.ph);
      });
    }
    // 까망이 (넓은 틈 건너편)
    if (r.pal) front.push(() => drawPal(j));
    // 꾸미기: 새끼들이 지나간 지붕엔 화분·등불, 새 집터엔 집
    if (r.deco > 0 && r.kind === ROOF) {
      const n = Math.min(3, r.deco);
      for (let q = 0; q < n; q++) {
        const px = X(xa + 0.3 + q * 0.42, 0.88), py = Y(0.88, r.h);
        if (q === 1) {
          ctx.strokeStyle = mix('#5a4030', '#201010', dk);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py - S * 0.6);
          ctx.stroke();
          ctx.fillStyle = dusk > 0.3 ? '#ffd56a' : '#ff9a5a';
          if (dusk > 0.3) (ctx.shadowColor = '#ffb040'), (ctx.shadowBlur = 12), glows.push([px, py - S * 0.6, S * 0.9, '255,190,90']);
          ctx.beginPath();
          ctx.ellipse(px, py - S * 0.6, S * 0.08, S * 0.11, 0, 0, TAU);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = mix('#c0603a', '#301810', dk);
          ctx.beginPath();
          ctx.moveTo(px - S * 0.1, py - S * 0.18);
          ctx.lineTo(px + S * 0.1, py - S * 0.18);
          ctx.lineTo(px + S * 0.07, py);
          ctx.lineTo(px - S * 0.07, py);
          ctx.fill();
          ctx.fillStyle = mix('#4aa04a', '#102010', dk);
          ctx.beginPath();
          ctx.arc(px, py - S * 0.28, S * 0.12, 0, TAU);
          ctx.fill();
          ctx.fillStyle = ['#ff6b8a', '#ffd23f'][q % 2];
          ctx.beginPath();
          ctx.arc(px + S * 0.04, py - S * 0.33, S * 0.04, 0, TAU);
          ctx.fill();
        }
      }
    }
    if (r.kind === LOT) drawLot(j, dk);
  };
  function drawLot(j: number, dk: number) {
    const r = R[j], xa = r.x0, xb = r.x1;
    if (r.build === -1) {
      // 출발 지붕: 종이 상자 집
      const bx = X(xa + 3.2, 0.7), by = Y(0.7, r.h);
      cardbox(bx, by, 1.1, dk, 0, false);
      return;
    }
    if (r.build === 0 && s.phase === 'run' && j === s.starts[k + 1]) {
      // 빈 집터: 깃발 · 판자
      const fx0 = X(xa + 1.8, 0.8), fy0 = Y(0.8, r.h);
      ctx.strokeStyle = '#6a4a30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx0, fy0);
      ctx.lineTo(fx0, fy0 - S * 1.1);
      ctx.stroke();
      ctx.fillStyle = '#ff5f6d';
      const fl = Math.sin(s.t / 8) * 3;
      ctx.beginPath();
      ctx.moveTo(fx0, fy0 - S * 1.1);
      ctx.lineTo(fx0 + S * 0.5, fy0 - S * 0.95 + fl);
      ctx.lineTo(fx0, fy0 - S * 0.8);
      ctx.fill();
      ctx.fillStyle = mix('#c8a070', '#302010', dk);
      for (let q = 0; q < 3; q++) ctx.fillRect(X(xa + 0.6 + q * 0.25, 0.55), Y(0.55, r.h) - S * 0.06 * (q + 1), S * 0.9, S * 0.06);
      front.push(() => {
        ctx.font = `900 ${S * 0.27}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(40,20,30,.6)';
        ctx.strokeText('🏠 새 집터', X(xa + 1.8, 0), Y(0, r.h) - S * 1.55);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🏠 새 집터', X(xa + 1.8, 0), Y(0, r.h) - S * 1.55);
      });
      return;
    }
    // 지어진 마을: 상자 집(새끼 수만큼) + 생선가게
    const n = Math.max(0, r.build), age = since >= 0 && j === s.starts[k + 1] ? since : 999;
    for (let q = 0; q < n; q++) {
      const appear = age - 20 - q * 14;
      if (appear < 0) continue;
      const sc = Math.min(1, appear / 10) * (1 + Math.max(0, 1 - appear / 14) * 0.3);
      const bx = X(xa + 0.45 + (q % 3) * 0.95 + (q >= 3 ? 0.45 : 0), q >= 3 ? 0.5 : 0.85), by = Y(q >= 3 ? 0.5 : 0.85, r.h);
      cardbox(bx, by, sc, dk, q, true);
    }
    if (r.shop > 0) {
      const appear = age - 20 - n * 14;
      if (appear >= 0) {
        const bx = X(xb - 0.75, 0.3), by = Y(0.3, r.h), sc = Math.min(1, appear / 10);
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(sc, sc);
        ctx.fillStyle = mix('#8a5a3a', '#201010', dk);
        ctx.fillRect(-S * 0.42, -S * 0.42, S * 0.84, S * 0.42);
        ctx.fillStyle = mix('#e8f0f8', '#303040', dk);
        ctx.fillRect(-S * 0.38, -S * 0.3, S * 0.76, S * 0.12);
        for (let q = 0; q < Math.min(4, r.shop + 1); q++) {
          ctx.fillStyle = '#7fb6e0';
          ctx.beginPath();
          ctx.ellipse(-S * 0.26 + q * S * 0.17, -S * 0.25, S * 0.07, S * 0.03, 0, 0, TAU);
          ctx.fill();
        }
        for (let q = 0; q < 5; q++) {
          ctx.fillStyle = q % 2 ? '#ffffff' : '#3a8ad8';
          ctx.beginPath();
          ctx.moveTo(-S * 0.48 + q * S * 0.192, -S * 0.72);
          ctx.lineTo(-S * 0.48 + (q + 1) * S * 0.192, -S * 0.72);
          ctx.lineTo(-S * 0.48 + (q + 1) * S * 0.192, -S * 0.5);
          ctx.arc(-S * 0.48 + (q + 0.5) * S * 0.192, -S * 0.5, S * 0.096, 0, Math.PI);
          ctx.fill();
        }
        ctx.strokeStyle = '#5a3a20';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-S * 0.44, -S * 0.42);
        ctx.lineTo(-S * 0.44, -S * 0.72);
        ctx.moveTo(S * 0.44, -S * 0.42);
        ctx.lineTo(S * 0.44, -S * 0.72);
        ctx.stroke();
        ctx.fillStyle = '#fff3c4';
        ctx.font = `900 ${S * 0.17}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('생선', 0, -S * 0.84);
        ctx.restore();
        if (dusk > 0.3) glows.push([bx, by - S * 0.5, S * 1.1, '255,200,120']);
      }
    }
    // 마을 등불 줄
    if (n > 0 && dusk > 0.2) {
      ctx.strokeStyle = 'rgba(60,40,30,.6)';
      ctx.lineWidth = 1;
      const y0 = Y(0.95, r.h + 1.0);
      ctx.beginPath();
      ctx.moveTo(X(xa + 0.1, 0.95), y0);
      ctx.quadraticCurveTo(X((xa + xb) / 2, 0.95), y0 + S * 0.3, X(xb - 0.1, 0.95), y0);
      ctx.stroke();
      for (let q = 0; q < 6; q++) {
        const p = (q + 0.5) / 6, lx = X(xa + 0.1 + (xb - xa - 0.2) * p, 0.95), ly = y0 + S * 0.3 * 4 * p * (1 - p) * 0.5 + 2;
        ctx.fillStyle = ['#ff6b6b', '#ffd23f', '#7ed957', '#6cc6ff'][q % 4];
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(lx, ly, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
  }
  function cardbox(bx: number, by: number, sc: number, dk: number, q: number, kit: boolean) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(30,15,20,.25)';
    ctx.beginPath();
    ctx.ellipse(S * 0.05, 0, S * 0.4, S * 0.08, 0, 0, TAU);
    ctx.fill();
    const box = mix(['#d8a46a', '#e0b07a', '#c8945a'][q % 3], '#2a1a14', dk);
    ctx.fillStyle = box;
    ctx.fillRect(-S * 0.32, -S * 0.42, S * 0.64, S * 0.42);
    ctx.fillStyle = mix(box, '#000000', 0.2);
    ctx.beginPath();
    ctx.moveTo(S * 0.32, -S * 0.42);
    ctx.lineTo(S * 0.44, -S * 0.5);
    ctx.lineTo(S * 0.44, -S * 0.08);
    ctx.lineTo(S * 0.32, 0);
    ctx.fill();
    // 지붕 (색 다르게)
    ctx.fillStyle = mix(['#e0533d', '#3d7fe0', '#e09a3d', '#9a4de0', '#3da07a'][q % 5], '#200c10', dk);
    ctx.beginPath();
    ctx.moveTo(-S * 0.4, -S * 0.4);
    ctx.lineTo(S * 0.02, -S * 0.75);
    ctx.lineTo(S * 0.46, -S * 0.48);
    ctx.lineTo(S * 0.4, -S * 0.4);
    ctx.fill();
    // 고양이 얼굴 모양 문
    ctx.fillStyle = '#3a2418';
    ctx.beginPath();
    ctx.arc(0, -S * 0.13, S * 0.13, Math.PI, TAU);
    ctx.lineTo(S * 0.13, 0);
    ctx.lineTo(-S * 0.13, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-S * 0.12, -S * 0.2);
    ctx.lineTo(-S * 0.09, -S * 0.32);
    ctx.lineTo(-S * 0.03, -S * 0.24);
    ctx.moveTo(S * 0.12, -S * 0.2);
    ctx.lineTo(S * 0.09, -S * 0.32);
    ctx.lineTo(S * 0.03, -S * 0.24);
    ctx.fill();
    // 창문 불빛
    ctx.fillStyle = dusk > 0.25 ? '#ffd56a' : '#9ac0e0';
    ctx.fillRect(S * 0.16, -S * 0.32, S * 0.1, S * 0.1);
    ctx.restore();
    if (dusk > 0.25) glows.push([bx + S * 0.2 * sc, by - S * 0.27 * sc, S * 0.6, '255,200,110']);
    // 문에서 내다보는 새끼
    if (kit && sc > 0.9) {
      const peek = Math.max(0, Math.sin(s.t / 40 + q * 2.1));
      if (peek > 0.2) kitten(ctx, bx - S * 0.02, by + 1 - peek * S * 0.05, S * 0.75, (q * 3 + 1) % 6, s.t, 'sit');
    }
  }
  function drawBasket(j: number) {
    const r = R[j], bx0 = rx0(r, ct), yb = r.h;
    // 도르래 줄: 앞 지붕 기둥 ~ 뒤 지붕 기둥
    const a = R[j - 1], b = R[j + 1], wh = Math.max(a.h, b.h) + 1.25;
    const ax = X(a.x1 - 0.15, CZ), bxx = X(b.x0 + 0.15, CZ), wy = Y(CZ, wh);
    ctx.strokeStyle = '#5a4a40';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, Y(CZ, a.h));
    ctx.lineTo(ax, wy);
    ctx.moveTo(bxx, Y(CZ, b.h));
    ctx.lineTo(bxx, wy);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ax, wy);
    ctx.lineTo(bxx, wy);
    ctx.stroke();
    for (const px of [ax, bxx]) {
      ctx.fillStyle = '#8a7a6a';
      ctx.beginPath();
      ctx.arc(px, wy, 3.5, 0, TAU);
      ctx.fill();
    }
    const L0 = X(bx0, CZ - 0.3), R0 = X(bx0 + BW, CZ - 0.3), yT = Y(CZ - 0.3, yb);
    const mid = X(bx0 + BW / 2, CZ);
    ctx.strokeStyle = '#7a6050';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mid, wy);
    ctx.lineTo(L0 + 3, yT);
    ctx.moveTo(mid, wy);
    ctx.lineTo(R0 - 3, yT);
    ctx.stroke();
    ctx.fillStyle = '#c8a070';
    ctx.beginPath();
    ctx.arc(mid, wy, 4, 0, TAU);
    ctx.fill();
    // 바구니 (윗면 + 앞면 엮은 무늬)
    ctx.fillStyle = '#b8864a';
    ctx.beginPath();
    ctx.moveTo(L0, yT);
    ctx.lineTo(R0, yT);
    ctx.lineTo(X(bx0 + BW, CZ + 0.4), Y(CZ + 0.4, yb));
    ctx.lineTo(X(bx0, CZ + 0.4), Y(CZ + 0.4, yb));
    ctx.fill();
    ctx.fillStyle = '#d6a868';
    ctx.beginPath();
    ctx.moveTo(L0, yT);
    ctx.lineTo(R0, yT);
    ctx.lineTo(R0 - S * 0.08, yT + S * 0.45);
    ctx.lineTo(L0 + S * 0.08, yT + S * 0.45);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,70,30,.6)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 4; q++) {
      ctx.beginPath();
      ctx.moveTo(L0 + q * 0.03 * S, yT + q * S * 0.11);
      ctx.lineTo(R0 - q * 0.03 * S, yT + q * S * 0.11);
      ctx.stroke();
    }
    for (let q = 1; q < 7; q++) {
      ctx.beginPath();
      ctx.moveTo(L0 + ((R0 - L0) * q) / 7, yT);
      ctx.lineTo(L0 + ((R0 - L0) * q) / 7, yT + S * 0.45);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff7aa0';
    ctx.beginPath();
    ctx.arc(L0 + S * 0.15, yT + S * 0.1, S * 0.06, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(R0 - S * 0.18, yT + S * 0.12, S * 0.05, 0, TAU);
    ctx.fill();
  }
  function drawPal(j: number) {
    const r = R[j], meet = c.mode === 'bridge' && c.to === j;
    const P = meet ? r.x0 - c.xp : c.mode === 'pull' && c.to === j ? Math.max(0.3, (r.x0 - c.xp) * (1 - Math.min(1, c.timer / PULL))) : palP(r, ct);
    const hx = X(r.x0 + 0.62, CZ), hy = Y(CZ, r.h);
    glows.push([X(r.x0 - P * 0.5, CZ), Y(CZ, r.h + 0.4), S * 1.8, '120,100,170']);
    if (P > 0.7) {
      const cx = X(r.x0 - P, CZ), cy = Y(CZ, r.h + 0.42);
      catLong(ctx, hx, hy, cx, cy, meet ? S * 0.1 : 0, S, BLACK, meet ? 'smug' : 'meh', -1, s.t, 'reach', 0);
      // 리본
      ctx.fillStyle = '#ff5f8a';
      ctx.beginPath();
      ctx.moveTo(cx - S * 0.2, cy - S * 0.05);
      ctx.lineTo(cx - S * 0.32, cy - S * 0.13);
      ctx.lineTo(cx - S * 0.32, cy + S * 0.03);
      ctx.fill();
    } else catSit(ctx, hx, hy, S, BLACK, 'meh', -1, s.t);
    if (meet) {
      const hy2 = Y(CZ, r.h + 1.1) - Math.sin(s.t / 8) * 4;
      emo(ctx, '💕', X(c.xp, CZ), hy2, S * 0.32);
    }
  }
  // 지붕들 + 빨랫줄 + 고양이를 x 순서로
  for (const ln of lines) drawLine(ln.xa, ln.xb, ln.lh, ln.j);
  for (let j = jl; j <= jr; j++) roofAt(j);
  function drawLine(xa: number, xb: number, lh: number, j: number) {
    for (const [dz, dh] of [[0.55, 0], [0.4, -0.85]] as [number, number][]) {
      const hh = lh + dh;
      if (hh < 0.4) continue;
      const a = [X(xa, dz), Y(dz, hh)], b = [X(xb, dz), Y(dz, hh)], sg = S * 0.25;
      ctx.strokeStyle = 'rgba(70,60,60,.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sg * 2, b[0], b[1]);
      ctx.stroke();
      const n = Math.max(1, Math.floor((xb - xa) / 0.5));
      for (let q = 0; q < n; q++) {
        const p = (q + 0.5) / n, lx = a[0] + (b[0] - a[0]) * p, ly = a[1] + (b[1] - a[1]) * p + sg * 4 * p * (1 - p);
        const kind = Math.floor(hsh(j * 17 + q * 3 + dz) * 4), col = LAUNDRY[Math.floor(hsh(j * 11 + q + dh) * LAUNDRY.length)];
        const sw = Math.sin(s.t / 20 + q + j) * (1 + (k === 4 ? gust(k, ct) * 6 : 0));
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(sw * 0.05 - (k === 4 ? gust(k, ct) * 0.5 : 0));
        ctx.fillStyle = mix(col, '#201830', night ? 0.45 : dusk * 0.3);
        if (kind === 0) {
          // 티셔츠
          ctx.beginPath();
          ctx.moveTo(-S * 0.16, 0);
          ctx.lineTo(S * 0.16, 0);
          ctx.lineTo(S * 0.24, S * 0.1);
          ctx.lineTo(S * 0.13, S * 0.13);
          ctx.lineTo(S * 0.13, S * 0.36);
          ctx.lineTo(-S * 0.13, S * 0.36);
          ctx.lineTo(-S * 0.13, S * 0.13);
          ctx.lineTo(-S * 0.24, S * 0.1);
          ctx.fill();
        } else if (kind === 1) {
          // 양말
          ctx.fillRect(-S * 0.05, 0, S * 0.09, S * 0.24);
          ctx.beginPath();
          ctx.ellipse(S * 0.03, S * 0.24, S * 0.09, S * 0.05, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-S * 0.05, S * 0.02, S * 0.09, S * 0.04);
        } else if (kind === 2) {
          // 수건
          ctx.fillRect(-S * 0.14, 0, S * 0.28, S * 0.3);
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          ctx.fillRect(-S * 0.14, S * 0.22, S * 0.28, S * 0.03);
        } else {
          // 바지
          ctx.beginPath();
          ctx.moveTo(-S * 0.13, 0);
          ctx.lineTo(S * 0.13, 0);
          ctx.lineTo(S * 0.14, S * 0.34);
          ctx.lineTo(S * 0.03, S * 0.34);
          ctx.lineTo(0, S * 0.12);
          ctx.lineTo(-S * 0.03, S * 0.34);
          ctx.lineTo(-S * 0.14, S * 0.34);
          ctx.fill();
        }
        ctx.fillStyle = '#c8a070';
        ctx.fillRect(-1.5, -2, 3, 4);
        ctx.restore();
      }
    }
  }
  for (const f of front) f();
  front.length = 0;
  // ── 새끼들 ──
  const U = S;
  const roofY = (z: number, j: number) => Y(z, R[j].h);
  let bodyAt: ((p: number) => [number, number]) | null = null;
  // ── 엄마 고양이 ──
  const shadow = (wx: number, j: number, wd: number) => {
    ctx.fillStyle = 'rgba(30,15,20,.3)';
    ctx.beginPath();
    ctx.ellipse(X(wx, CZ), roofY(CZ, j) + 1, S * wd, S * 0.07, 0, 0, TAU);
    ctx.fill();
  };
  const hipJ = c.mode === 'pull' && c.timer >= PULL ? c.to : c.at;
  // 새끼 그리기 (엄마 뒤에 줄 서기 · 건너편 · 빨랫줄은 엄마보다 먼저, 등 위를 건너는 새끼는 엄마 다음에)
  function drawKits(onBack: boolean) {
    let wait = 0, doneN = 0;
    const pullP = c.mode === 'pull' ? Math.min(1, c.timer / (PULL + 10)) : 0;
    for (let i = 0; i < s.nk; i++) {
      const st = s.kst[i], col = s.kcol[i];
      if (st === 3) {
        if (onBack) continue;
        // 빨랫줄에 매달려 냥냥
        const ln = lines.find((q) => q.xa <= s.klx[i] + 0.3 && q.xb >= s.klx[i] - 0.3);
        if (!ln) continue;
        const kx = Math.max(ln.xa + 0.3, Math.min(ln.xb - 0.3, s.klx[i]));
        kitten(ctx, X(kx, 0.55) - S * 0.15, Y(0.55, ln.lh) + S * 0.42, U * 1.1, col, s.t, 'hang', Math.sin(s.t / 6 + i) * 0.2);
        continue;
      }
      if (onBack !== (st === 1 && s.kp[i] >= 0 && !!bodyAt)) continue;
      if (st === 1 && s.kp[i] >= 0 && bodyAt) {
        const len = c.xp - c.edge + 0.6, p = Math.min(1, s.kp[i] / len), [bx, by] = bodyAt(Math.max(0.02, p));
        const g = gust(k, ct) >= 0.35;
        kitten(ctx, bx, by - U * 0.13 + (g ? Math.sin(s.t) * 1.5 : 0), U * 1.1, col, s.t + i * 7, g ? 'scared' : 'walk', g ? -0.2 : 0);
        continue;
      }
      if (st === 2) {
        const r = R[c.to], tx = Math.min(rx1(r, ct) - 0.25, c.xp + 0.15 + doneN * 0.42);
        const homeX = rx1(r, ct) - 0.62 - 0.45 - doneN * 0.42;
        const kx = c.mode === 'pull' ? tx + (homeX - tx) * pullP : tx;
        kitten(ctx, X(kx, CZ + 0.18 + (doneN % 2) * 0.12), Y(CZ + 0.18 + (doneN % 2) * 0.12, r.h), U * 1.1, col, s.t + i * 5, c.mode === 'pull' ? 'walk' : 'happy');
        doneN++;
        continue;
      }
      // 줄 서서 기다리기 (엄마 엉덩이 뒤)
      const j = c.at, r = R[j];
      const kx = Math.max(r.kind === BASKET ? rx0(r, ct) + 0.2 : r.x0 + 0.25, hipX - 0.42 - wait * 0.42);
      const z = CZ + 0.15 + (wait % 2) * 0.14;
      const watching = c.mode === 'stretch' || c.mode === 'fall' || c.mode === 'fly';
      const won = s.phase === 'pause' && s.cleared;
      kitten(ctx, X(kx, z), Y(z, r.h), U * 1.1, col, s.t + i * 9, won || (c.mode === 'stretch' && c.L > 1.2) ? 'happy' : watching ? 'scared' : 'sit');
      if (c.mode === 'fly' && wait === 0 && flyP < 0.6) front.push(() => bubble(ctx, X(kx, z), Y(z, r.h) - S * 0.75, 'ㅋㅋㅋ', 12));
      if (c.mode === 'fall' && wait === 0 && c.timer > 40) front.push(() => bubble(ctx, X(kx, z), Y(z, r.h) - S * 0.75, '엄마?!', 12));
      wait++;
    }
  }
  drawKits(false);
  // 밤엔 고양이 둘레를 등불처럼 밝혀 잘 보이게
  if (night) {
    glows.push([X(hipX + 0.4, CZ), Y(CZ, h0 + 0.3), S * 1.4, '150,120,90']);
    if (pose === 'long') glows.push([X(tipX, CZ), Y(CZ, tipH - 0.2), S * 1.3, '150,120,90']);
  }
  if (pose === 'sit') {
    shadow(hipX + 0.55, hipJ, 0.35);
    catSit(ctx, X(hipX + 0.55, CZ), roofY(CZ, hipJ), U * 1.15, ORANGE, face, 1, s.t);
  } else if (pose === 'long') {
    shadow(hipX, c.at, 0.3);
    const tremble = c.mode === 'stretch' ? Math.max(0, (c.L - LMAX * 0.7) / (LMAX * 0.3)) * 2.5 : 0;
    if (c.mode === 'bridge' && !c.pal) shadow(tipX, c.to, 0.2);
    bodyAt = catLong(ctx, X(hipX, CZ), roofY(CZ, c.at), X(tipX, CZ), Y(CZ, tipH), sag, U * 1.15, ORANGE, face, 1, s.t, legs, tremble);
    // 새끼들이 등을 건넌다
    if (c.mode === 'stretch' && s.t % 6 === 0 && c.L > 0.5) fx.burst(X(c.edge + 0.1, CZ), Y(CZ, h0 + 0.4), 'rgba(255,220,180,.8)', 1, 1.2, 1.5);
    // 비둘기 개그: 4판부터 다리가 된 고양이 머리 위에 비둘기가 앉는다
    if (c.mode === 'bridge' && k >= 3 && c.timer > 20) pigeon(ctx, X(tipX, CZ) + S * 0.2, Y(CZ, tipH) - S * 0.48, S, -1, s.t);
  } else if (pose === 'fall') {
    // 빨랫줄에 걸려 버둥버둥 — 양말 모자
    const lx = c.edge + 0.55, ln = lines.find((q) => q.xa <= lx + 0.1 && q.xb >= lx - 0.1) ?? { lh: h0 - 0.95 };
    const drop = Math.min(1, (FALL - c.timer) / 14), lineY = Y(0.55, ln.lh) + S * 0.18;
    const climb = c.timer < 22 ? 1 - c.timer / 22 : 0;
    const cx = X(lx, 0.55), cy = Y(CZ, h0 + 0.2) + (lineY - Y(CZ, h0 + 0.2)) * drop * (1 - climb);
    if (climb > 0) catSit(ctx, cx - climb * S * 0.4, cy, U * 1.15, ORANGE, 'sleepy', 1, s.t);
    else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(s.t / 4) * 0.12);
      ctx.lineCap = 'round';
      // 축 늘어진 몸 (줄 위로 반 접혀서)
      ctx.strokeStyle = ORANGE.line;
      ctx.lineWidth = U * 0.3 + 2;
      ctx.beginPath();
      ctx.moveTo(-U * 0.35, U * 0.25);
      ctx.quadraticCurveTo(0, -U * 0.25, U * 0.35, U * 0.25);
      ctx.stroke();
      ctx.strokeStyle = ORANGE.body;
      ctx.lineWidth = U * 0.3;
      ctx.stroke();
      ctx.strokeStyle = ORANGE.stripe;
      ctx.lineWidth = 2;
      for (const q of [-0.15, 0, 0.15]) {
        ctx.beginPath();
        ctx.moveTo(q * U, -U * 0.08);
        ctx.lineTo(q * U, -U * 0.18);
        ctx.stroke();
      }
      // 버둥거리는 다리
      ctx.lineWidth = U * 0.08;
      ctx.strokeStyle = ORANGE.body;
      for (const [lx0, ph] of [[-0.42, 0], [-0.3, 2], [0.3, 1], [0.42, 3]] as [number, number][]) {
        ctx.beginPath();
        ctx.moveTo(lx0 * U, U * 0.28);
        ctx.lineTo(lx0 * U + Math.sin(s.t / 2 + ph) * U * 0.1, U * 0.55);
        ctx.stroke();
      }
      // 꼬리
      ctx.lineWidth = U * 0.08;
      ctx.beginPath();
      ctx.moveTo(-U * 0.38, U * 0.3);
      ctx.quadraticCurveTo(-U * 0.6, U * 0.5, -U * 0.5 + Math.sin(s.t / 3) * U * 0.1, U * 0.75);
      ctx.stroke();
      ctx.restore();
      catHead(ctx, cx + U * 0.42, cy + U * 0.28, U * 0.23, ORANGE, face, 1, s.t);
      // 양말 모자
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.roundRect(cx + U * 0.3, cy + U * 0.0, U * 0.24, U * 0.14, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + U * 0.3, cy + U * 0.1, U * 0.24, U * 0.04);
      if (c.why === 'pigeon') pigeon(ctx, cx + U * 0.45, cy - U * 0.05, S, -1, s.t);
      if (s.t % 10 === 0) fx.burst(cx, cy, 'rgba(255,255,255,.8)', 2, 1.5, 2);
    }
  } else {
    // 퉁! 뒤로 날아가 데굴 → 엎어져서 어질어질
    const p = Math.min(1, flyP / 0.55), fromX = c.edge + Math.min(c.L, 2.4) * 0.45, toX = c.edge - 0.35;
    const px = fromX + (toX - fromX) * p, ph = h0 + Math.sin(Math.PI * p) * 2.0;
    shadow(px, c.at, 0.3);
    if (flyP < 0.55) {
      ctx.save();
      ctx.translate(X(px, CZ), Y(CZ, ph) - S * 0.4);
      ctx.rotate(-p * TAU * 1.5);
      catSit(ctx, 0, S * 0.4, U * 1.15, ORANGE, 'wow', 1, s.t);
      ctx.restore();
    } else {
      const sq = 0.55 + 0.45 * Math.min(1, (flyP - 0.55) / 0.45);
      catSit(ctx, X(px, CZ), Y(CZ, ph), U * 1.15, ORANGE, 'dizzy', 1, s.t, sq);
      for (let i = 0; i < 3; i++) {
        const a = s.t / 8 + (i * TAU) / 3;
        ctx.fillStyle = '#ffd23f';
        ctx.font = `900 ${S * 0.22}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText('★', X(px, CZ) + S * 0.15 + Math.cos(a) * S * 0.35, Y(CZ, ph) - S * 0.85 + Math.sin(a) * S * 0.1);
      }
    }
  }
  drawKits(true);
  // 누르는 동안: 앞발이 내려앉을 자리 미리 보기
  if (c.mode === 'stretch' && c.L > 0.15) {
    const o = judge(R, c.at, c.edge, ct, c.L), xp = c.edge + c.L, good = o.kind === BRIDGE;
    let gy = yS - D * CZ;
    if (good && !o.pal) gy = Y(CZ, R[o.to].h);
    else if (o.kind === DOG || o.kind === PIG) gy = Y(CZ, R[o.to].h);
    else {
      for (let j = c.at + 1; j < R.length && j <= c.at + 3; j++)
        if (xp >= rx0(R[j], ct) && xp <= rx1(R[j], ct)) {
          gy = Y(CZ, R[j].h);
          break;
        }
    }
    const col = o.kind === BRIDGE ? (o.pal ? '#ff7ac0' : o.fish ? '#ffd23f' : o.shaky ? '#ffb347' : '#7ef07a') : '#ff5a5a';
    const px = X(xp, CZ), py0 = Y(CZ, tipH) + S * 0.2;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, py0);
    ctx.lineTo(px, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    const pulse = 0.6 + 0.4 * Math.sin(s.t / 3);
    ctx.fillStyle = rgba(col, 0.35 + 0.3 * pulse);
    ctx.beginPath();
    ctx.ellipse(px, gy, S * 0.22, S * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 발자국
    ctx.fillStyle = col;
    for (const [dx, dy, r] of [[0, 0.02, 0.06], [-0.07, -0.05, 0.025], [0, -0.075, 0.025], [0.07, -0.05, 0.025]] as [number, number, number][]) {
      ctx.beginPath();
      ctx.arc(px + dx * S, gy - S * 0.08 + dy * S, r * S, 0, TAU);
      ctx.fill();
    }
    const lab = o.kind === BRIDGE ? (o.pal ? '짝!' : o.fish ? '🐟!' : o.shaky ? '아슬' : '') : o.kind === DOG ? '깨요!' : o.kind === PIG ? '푸드덕' : '';
    if (lab) {
      ctx.font = `900 ${S * 0.28}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(40,20,30,.7)';
      ctx.strokeText(lab, px, gy + S * 0.3);
      ctx.fillStyle = col;
      ctx.fillText(lab, px, gy + S * 0.3);
    }
    // 고무줄 한계 게이지 (몸 위)
    const p = c.L / LMAX, gw = S * 1.3, gx = Math.max(gw / 2 + 6, Math.min(w - gw / 2 - 6, X(c.edge - 0.9, CZ))), gyy = Y(CZ, h0 + 0.95);
    ctx.fillStyle = 'rgba(30,20,30,.55)';
    ctx.beginPath();
    ctx.roundRect(gx - gw / 2, gyy - 5, gw, 10, 5);
    ctx.fill();
    ctx.fillStyle = p > 0.8 ? '#ff5a5a' : p > 0.6 ? '#ffb347' : '#7ef07a';
    ctx.beginPath();
    ctx.roundRect(gx - gw / 2 + 2, gyy - 3, Math.max(6, (gw - 4) * Math.min(1, p)), 6, 3);
    ctx.fill();
  }
  // 돌풍: 잎과 바람 줄
  if (k === 4) {
    const g = gust(k, ct), warn = ct % GP >= 180 && ct % GP < 220;
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + g * 0.5})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const sp = 3 + g * 9 + (warn ? 1.5 : 0);
      const px = w - ((s.t * sp + i * 47) % (w + 60)), py = top + S * 0.4 + ((i * 37) % 100) / 100 * (yS - top - S);
      if (g < 0.05 && !warn && i % 3) continue;
      ctx.lineWidth = 1.5 + g * 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 14 + g * 40, py);
      ctx.stroke();
      if (i % 3 === 0) {
        ctx.save();
        ctx.translate(px, py + 6);
        ctx.rotate(s.t / 6 + i);
        ctx.fillStyle = i % 2 ? '#e0a03a' : '#9acd4a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  // 노을빛 · 밤
  if (dusk > 0 && !night) ((ctx.fillStyle = `rgba(255,110,70,${dusk * 0.12})`), ctx.fillRect(-10, -10, w + 20, h + 20));
  if (night || dusk > 0.5) {
    const nf = night ? 1 : (dusk - 0.5) * 2;
    ctx.fillStyle = `rgba(10,12,48,${0.3 * nf})`;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    ctx.globalCompositeOperation = 'lighter';
    for (const [gx, gy, r, rgb] of glows) {
      const lg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      lg.addColorStop(0, `rgba(${rgb},${0.32 * nf})`);
      lg.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = lg;
      ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (night)
      for (let i = 0; i < 9; i++) {
        const a = Math.abs(Math.sin(s.t / 20 + i * 2.1));
        ctx.fillStyle = `rgba(220,255,120,${a})`;
        ctx.beginPath();
        ctx.arc((i * 97 + s.t * 0.3) % w, top + S * 1.2 + ((i * 53) % 140), 1.8, 0, TAU);
        ctx.fill();
      }
  }
  for (const f of front) f();
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.35, w / 2, h * 0.55, h * 0.8);
  vg.addColorStop(0, 'rgba(30,10,30,0)');
  vg.addColorStop(1, 'rgba(30,10,30,.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // ── 사건 → 연출 ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, color: string, size: number) => {
    const slot = (fx.memo.pt ?? -99) > s.t - 24 ? ((fx.memo.ps ?? 0) + 1) % 3 : 0;
    fx.memo.pt = s.t;
    fx.memo.ps = slot;
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const half = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(half, Math.min(w - half, x)), Math.max(top + size, y - slot * size * 1.2), text, color, size);
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x, CZ), ey = Y(CZ, e.y);
    if (e.kind === 'start') (say(X(c.edge, CZ), ey - S * 1.0, e.text!, '#ffffff', 18), fx.burst(X(c.edge, CZ), ey - S * 0.3, '#ffe2c0', 10, 2.5, 2.5), fx.kick(2));
    else if (e.kind === 'long') (say(ex, ey - S * 1.1, e.text!, '#ffe08a', 17), fx.ring(ex, ey - S * 0.4, '#ffe08a', S * 0.8, 3));
    else if (e.kind === 'land') (say(ex, ey - S * 0.9, e.text!, e.text === '아슬아슬!' ? '#ffb347' : e.text!.startsWith('짝') ? '#ff9ad0' : '#b8ff8a', 20), fx.ring(ex, ey, '#ffffff', S * 0.8, 4), fx.burst(ex, ey - 2, '#f0e0c8', 14, 3, 2.5), fx.kick(4));
    else if (e.kind === 'fish') (say(ex, ey - S * 1.3, e.text!, '#8fd3ff', 18), fx.burst(ex, ey - S * 0.2, '#bfe6ff', 18, 3.5, 2.5), fx.blink('#dff4ff', 0.12));
    else if (e.kind === 'arrive') (fx.pop(ex + S * (0.25 + 0.3 * (e.n ?? 0)), ey - S * (0.75 + 0.12 * (e.n ?? 0)), e.text!, '#ffffff', 13), fx.burst(ex + S * 0.2, ey - S * 0.2, '#ffd8e8', 6, 2, 2));
    else if (e.kind === 'slip') (say(ex, ey - S * 0.5, e.text!, '#ff9a8a', 17), fx.burst(ex, ey, '#ffffff', 10, 3, 2), fx.kick(5));
    else if (e.kind === 'pull') (say(ex + S * 0.6, ey - S * 0.9, e.text!, '#ffe08a', 22), fx.ring(ex, ey - S * 0.3, '#ffe08a', S * 1.1, 4), fx.burst(ex, ey - S * 0.3, '#ffb347', 12, 3.5, 2), fx.kick(3));
    else if (e.kind === 'snap') (say(ex - S, ey - S * 1.0, e.text!, '#ff8a7a', 24), fx.ring(ex - S, ey - S * 0.4, '#ffffff', S * 1.6, 5), fx.burst(ex - S, ey - S * 0.4, '#ffb070', 22, 5, 3), fx.kick(10), fx.blink(th.hot, 0.15));
    else if (e.kind === 'fall' || e.kind === 'pigeon') (say(ex, ey - S * 0.6, e.text!, '#8fd3ff', 22), fx.burst(ex, ey + S * 0.8, '#ffffff', 16, 3.5, 2.5), fx.kick(7));
    else if (e.kind === 'dog') (say(ex, ey - S * 1.2, e.text!, '#ff8a7a', 22), fx.ring(ex, ey - S * 0.4, '#ff8a7a', S * 1.4, 5), fx.kick(9), fx.blink('#ffd0c0', 0.12));
    else if (e.kind === 'tap') fx.pop(w / 2, h * 0.42, e.text!, '#ffffff', 15);
    else if (e.kind === 'stage') fx.pop(w / 2, h * 0.36, e.text!, '#ffffff', 22);
    else if (e.kind === 'clear') {
      fx.pop(w / 2, h * 0.3, e.text!, '#ffd23f', 26);
      for (const [cx, col] of [[0.25, '#ff6b6b'], [0.5, '#ffd23f'], [0.75, '#7ed957'], [0.4, '#6cc6ff'], [0.6, '#ff8fb1']] as [number, string][]) fx.burst(w * cx, h * 0.3, col, 22, 5.5, 3);
      fx.blink('#fff6c8', 0.25);
    } else if (e.kind === 'fail') (fx.pop(w / 2, h * 0.32, e.text!, th.hot, 19), fx.kick(10), fx.blink('#3a1a3a', 0.35));
  }
  // 집이 뚝딱 지어질 때
  if (since >= 0) {
    const g = R[s.starts[k + 1]];
    for (let q = 0; q <= g.build; q++) {
      if (since !== 20 + q * 14) continue;
      const isShop = q === g.build;
      if (isShop && !g.shop) continue;
      const bx = isShop ? X(g.x1 - 0.75, 0.3) : X(g.x0 + 0.45 + (q % 3) * 0.95 + (q >= 3 ? 0.45 : 0), q >= 3 ? 0.5 : 0.85);
      const by = isShop ? Y(0.3, g.h) : Y(q >= 3 ? 0.5 : 0.85, g.h);
      fx.burst(bx, by - S * 0.3, '#ffe08a', 14, 3.5, 2.5);
      fx.ring(bx, by - S * 0.3, '#ffffff', S * 0.7, 3);
      fx.pop(bx, by - S * 1.0, isShop ? '🐟 생선가게!' : '뚝딱!', '#ffffff', 14);
    }
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ── HUD ──
  const hg = ctx.createLinearGradient(0, 0, 0, top);
  hg.addColorStop(0, 'rgba(36,22,44,.86)');
  hg.addColorStop(1, 'rgba(36,22,44,.6)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, top);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${Math.max(13, w * 0.043)}px system-ui, sans-serif`;
  ctx.fillText(`🐱 ${k + 1}/${STAGES}판 · ${NAMES[k]}`, 10, top * 0.3);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, top * 0.3);
  ctx.textAlign = 'left';
  ctx.font = `800 ${Math.max(12, w * 0.037)}px system-ui, sans-serif`;
  ctx.fillStyle = th.soft;
  const alive = s.nk - s.lost;
  ctx.fillText(`🐾 아기 ${alive}/${s.nk}  🐟 ${s.sf}/${FISHG[k]}  ⭐ ${s.stars}`, 10, top * 0.74);
  ctx.textAlign = 'right';
  const left = Math.max(0, (s.limit - ct) / 60);
  ctx.fillStyle = left < 6 && s.phase === 'run' ? th.hot : th.ink;
  ctx.fillText(`${night ? '🌙' : '☀️'} ${Math.ceil(left)}초`, w - 10, top * 0.74);
  // 아래 띠: 지붕 지도 + 별 조건
  ctx.fillStyle = 'rgba(36,22,44,.8)';
  ctx.fillRect(0, botY, w, h - botY);
  {
    const a = s.starts[k], b = s.starts[k + 1], xa = R[a].x1 - 0.8, xb = R[b].x0 + 1.2, mx0 = 16, mx1 = w - 30, my = botY + (h - botY) * 0.36;
    const M = (wx: number) => mx0 + ((wx - xa) / (xb - xa)) * (mx1 - mx0);
    for (let j = a; j <= b; j++) {
      const r = R[j], l = Math.max(mx0, M(rx0(r, ct))), rr = Math.min(mx1, M(rx1(r, ct)));
      if (rr <= l) continue;
      ctx.fillStyle = j < c.at || (j === c.at && j !== a) ? '#ffb347' : r.kind === LOT ? '#7ed957' : r.kind === BASKET ? '#d6a868' : 'rgba(255,255,255,.45)';
      ctx.fillRect(l, my - (r.kind === BASKET ? 2 : 4), rr - l, r.kind === BASKET ? 4 : 8);
      if (r.fish >= 0 && !r.got) ((ctx.fillStyle = '#8fd3ff'), ctx.fillRect(M(r.fish) - 1.5, my - 8, 3, 3));
    }
    emo(ctx, '🏠', mx1 + 12, my - 1, 13);
    emo(ctx, '🐱', Math.max(mx0, Math.min(mx1, M(hipX + 0.6))), my - 9, 14);
    const cy = botY + (h - botY) * 0.76;
    ctx.font = `800 ${Math.max(12, w * 0.035)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const items: [string, boolean][] = [['★ 도착', s.phase === 'pause' && s.cleared], ['★★ 아기 모두', s.lost === 0], [`★★★ +🐟${FISHG[k]}`, s.lost === 0 && s.sf >= FISHG[k]]];
    items.forEach(([t2, ok], i) => {
      ctx.fillStyle = ok ? '#ffd23f' : 'rgba(255,255,255,.6)';
      ctx.fillText(t2, w * (0.17 + i * 0.33), cy);
    });
  }
  // 새 소식 띠 (하늘 자리)
  let ny = top + w * 0.04;
  ctx.textAlign = 'center';
  for (const n of s.notes.slice(-2)) {
    const age = s.t - n.t, al = Math.min(1, (210 - age) / 30, age / 8);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    ctx.font = `800 ${Math.max(12, w * 0.036)}px system-ui, sans-serif`;
    const tw = ctx.measureText(n.text).width + 18;
    ctx.fillStyle = 'rgba(36,22,44,.68)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, ny - w * 0.028, tw, w * 0.056, w * 0.028);
    ctx.fill();
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, w / 2, ny + 1);
    ny += w * 0.066;
  }
  ctx.globalAlpha = 1;
  // 돌풍 알림 (5판): 다음 돌풍까지 · 곧 바람 · 돌풍!
  if (k === 4 && s.phase === 'run') {
    const u = ct % GP, g = gust(k, ct), warn = u >= 180 && u < 220;
    const txt = g > 0.02 ? '💨 돌풍! 몸이 밀려요' : warn ? '🍃 곧 바람!' : `🍃 잠잠 ${((180 - u) / 60).toFixed(1)}초`;
    ctx.font = `900 ${Math.max(12, w * 0.038)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(txt).width + 16, py = botY - w * 0.06;
    ctx.fillStyle = g > 0.02 ? 'rgba(200,60,70,.82)' : warn ? 'rgba(210,130,40,.82)' : 'rgba(36,22,44,.72)';
    ctx.beginPath();
    ctx.roundRect(8, py - w * 0.03, tw, w * 0.06, w * 0.03);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, 16, py + 1);
  }
  // 첫 안내
  if (s.phase === 'run' && k === 0 && s.bridges === 0 && c.mode === 'idle' && s.t > 10) {
    const t1 = '👆 꾹 누르면 쭈욱~ 늘어나요', t2 = '떼면 앞발 척! 옆 지붕에 닿게';
    ctx.font = `900 ${Math.max(14, w * 0.046)}px system-ui, sans-serif`;
    const tw = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width) + 26, by = botY - w * 0.2;
    ctx.fillStyle = 'rgba(36,22,44,.78)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, by - w * 0.05, tw, w * 0.13, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t1, w / 2, by - w * 0.012);
    ctx.font = `800 ${Math.max(12, w * 0.038)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffe3b8';
    ctx.fillText(t2, w / 2, by + w * 0.045);
  }
  if (s.phase === 'pause') {
    ctx.fillStyle = 'rgba(36,22,44,.66)';
    ctx.beginPath();
    ctx.roundRect(w * 0.12, botY - w * 0.13, w * 0.76, w * 0.085, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(12, w * 0.038)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(s.cleared ? (k === STAGES - 1 ? '🏆 지붕 마을 완성! 쭉쭉이 최고' : `다음: ${k + 2}판 ${NAMES[k + 1]}`) : `♥ ${s.hearts} — 같은 판 다시!`, w / 2, botY - w * 0.088);
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const OFF: Input = { tap: false, dir: 0, hold: false };
const ON: Input = { tap: false, dir: 0, hold: true };
const moods = new WeakMap<object, { n: number; press: number; H: number }>();
/** 못하는 봇: 아무 때나 누르고 아무만큼 누른다 */
export const stretchcatRandom: Bot<CatState> = {
  name: '아무렇게나',
  act(s, rng) {
    if (s.phase !== 'run') return OFF;
    const c = s.cat;
    let m = moods.get(s);
    if (c.mode === 'idle') {
      if (!m || m.n !== s.idleN) moods.set(s, (m = { n: s.idleN, press: s.ct + 10 + Math.floor(rng() * 120), H: 6 + Math.floor(rng() * 110) }));
      return s.ct >= m.press && !c.lock ? ON : OFF;
    }
    if (c.mode === 'stretch') return c.hold < (m?.H ?? 40) ? ON : OFF;
    return OFF;
  },
};

const plans = new WeakMap<object, { n: number; press: number; H: number }>();
/** 앞으로 d틱 뒤에 눌러 H틱 늘렸을 때를 흉내 내 값을 매긴다: 다리 성공(생선·여유·건너뛰기) − 실패 − 걸린 시간 */
function plan(s: CatState) {
  const c = s.cat, R = s.roofs, k = s.k, edge = rx1(R[c.at], s.ct), goal = s.starts[k + 1];
  const alive = s.nk - s.lost, needFish = s.sf < FISHG[k];
  let gapsLeft = 0;
  for (let j = c.at + 1; j <= goal; j++) gapsLeft++;
  const slack = s.limit - s.ct - gapsLeft * 230;
  const wt = slack < 0 ? 5 : slack < 300 ? 2.5 : 1.2;
  let best = { n: s.idleN, press: s.ct + 30, H: 0, v: -1e9 };
  for (let d = 0; d <= 300; d += 3) {
    const c0 = s.ct + d;
    let L = 0;
    for (let H = 1; H <= 130; H++) {
      L = Math.max(0, L + rateAt(k, c0 + H));
      if (L >= LMAX) break;
      if (H % 3 || L < 0.4) continue;
      const tr = c0 + H + 1, o = judge(R, c.at, edge, tr, L);
      let v: number;
      if (o.kind !== BRIDGE) v = -3000;
      else {
        v = 1000 + (o.fish ? (needFish ? 500 : 160) : 0) - (o.shaky ? 900 : 0) + Math.min(0.5, o.margin) * 120 + (o.to - c.at - 1) * 200;
        // 돌풍: 새끼들이 건너는 동안 바람이 불면 그만큼 늦어진다
        if (k === 4) {
          const dur = (alive - 1) * SP + (o.xp - edge + 0.6) / KV;
          let blown = 0;
          for (let q = tr; q < tr + dur; q += 3) if (gust(k, q) >= 0.35) blown += 3;
          v -= blown * wt;
        }
      }
      v -= (d + H) * wt;
      if (v > best.v) best = { n: s.idleN, press: c0, H, v };
    }
  }
  return best;
}

/** 잘하는 봇: 언제 누르고(0~5초 뒤) 얼마나 누를지를 앞날 흉내로 다 겨뤄, 가장 빨리·안전하게(생선까지) 건너는 것을 고른다 */
export const stretchcatSmart: Bot<CatState> = {
  name: '쭉쭉 장인',
  act(s) {
    if (s.phase !== 'run') return OFF;
    const c = s.cat;
    let p = plans.get(s);
    if (c.mode === 'stretch') return c.hold < (p?.H ?? 30) ? ON : OFF;
    if (c.mode !== 'idle' || c.lock) return OFF;
    if (!p || p.n !== s.idleN || p.press < s.ct) plans.set(s, (p = plan(s)));
    return p.H > 0 && s.ct >= p.press ? ON : OFF;
  },
};
