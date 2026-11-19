/**
 * 부풀리기 햄스터 대탈출 (33라운드: 쫓기는 탈출 — 옆으로 달리는 추격) — 부풀었다 줄었다 × 꾹 눌렀다 떼기 × 콤보.
 * 기준 9(손이 하는 일은 하나): 꾹 누르는 동안 햄스터가 '뿌우욱' 화면 높이의 절반만큼 부풀고, 떼면 콩알만 해진다.
 *   햄스터는 아침 햇살 부엌을 오른쪽으로 저절로 굴러가고, 뒤에서 장난꾸러기 고양이가 쫓아온다.
 * 규칙(결정적, 3줄): 큰 몸은 느리지만 컵 탑·시리얼 상자·블록 성을 와장창 부수며 밀고 나가고, 부서진 파편은 뒤로 날아가
 *   고양이를 맞히면 고양이가 데굴(거리가 벌어진다). 작은 몸은 빠르고 의자 밑·소파 밑 낮은 틈으로 쏙 빠지지만 물건에 막힌다.
 *   고양이에게 잡히면 하트 -1·그 판 다시(하트 셋을 다 잃거나 7판을 마치면 끝). 햄스터 집(작은 문)에 들어가면 판 깨기.
 *   몸은 뒤꿈치를 축으로 앞쪽으로 부푼다 — 그래서 부푸는 순간 몸이 앞으로 '쑥' 뻗어 바로 앞의 탑을 부순다.
 * 와우: 첫 꾹에 햄스터가 화면 절반만큼 빵빵해지며 컵 탑이 와장창, 머그컵들이 뒤로 날아가 웅크리고 있던 고양이를 맞혀 데굴데굴.
 * 판 7개(판마다 새것 하나, 하는 일이 바뀐다): 1판 컵 탑(커져서 부수기) → 2판 의자 밑 낮은 틈(작아져서 빠지기)
 *   → 3판 선풍기(작으면 날아감 → 커져서 버티기, 바람 속 파편은 멀리) → 4판 잼 바닥(크면 끈적 → 작게 건너 마지막에 부풀기)
 *   → 5판 청소기 로봇(작으면 빨려 감 → 커서 튕겨 고양이에게) → 6판 계단(크게 굴러 내려가면 가속)
 *   → 7판 강아지(작으면 무시, 크면 놀라 뒤로 도망쳐 고양이 길을 막음).
 * 해바라기씨: 바닥 씨앗(누구나) · 공중 씨앗(커야 닿음) · 의자 밑 씨앗(작아야 들어감).
 * 별: 1판 하나, 판마다 하나씩(3판부터 셋) — "집까지 탈출" · "씨앗 여덟 개 줍기" · "한 번도 안 막히기" …
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.22;
/** 반지름: 콩알 · 빵빵 (화면 폭 = 1) */
const RS = 0.072, RB = 0.25;
const rad = (z: number) => RS + (RB - RS) * z;
/** 빠르기(틱마다): 작은 몸 · 큰 몸 · 따라잡는 비율 */
const VS = 0.0068, VB = 0.003, ACC = 0.09;
/** 부푸는 데 · 줄어드는 데 걸리는 틱 */
const PUFF_T = 14, SHRINK_T = 11;
/** 탑을 부술 수 있는 크기 */
const SMASH_S = 0.7;
/** 선풍기: 이보다 작으면 날아감 · 큰 몸이 밀리는 양 · 날아가는 틱 · 뒤로 날아가는 빠르기 */
const FAN_S = 0.6, FAN_W = 0.0006, BLOW_T = 34, BLOW_V = 0.0048, WIND_L = 1.3;
/** 청소기: 이만큼 커야 튕겨 냄 · 반폭 · 빨려 있는 틱 */
const VAC_S = 0.55, VR = 0.085, SUCK_T = 54;
/** 계단: 이만큼 커야 굴러 가속 · 틱마다 가속 · 최대 · 계단 뒤 줄어드는 비율 */
const STAIR_S = 0.55, STAIR_ACC = 0.00034, BOOST_MAX = 0.0058, BOOST_DECAY = 0.986;
/** 강아지 배 밑 높이 · 몸 길이 */
const DOG_C = 0.17, DOG_L = 0.34;
/** 햄스터 집 문 높이 */
const DOOR_C = 0.2;
/** 쿵(작은 몸이 탑에) · 끼임(큰 몸이 틈에) 멈춤 틱 */
const BONK_T = 24, STUCK_T = 28;
/** 고양이 몸 길이 · 키 · 데굴 틱 */
const CAT_L = 0.21, CAT_H = 0.2, CAT_STUN = 58;
const GRAV = 0.0007;
const COMBO_T = 150;
const RESULT_OK = 210, RESULT_FAIL = 170, NEWS_T = 170;
const SMASH_PTS = 10, SEED_PTS = 5, HIT_PTS = 20, STAR_PTS = 150, CLEAR_PTS = 50, WIN_PTS = 500;

/** 작게 해야 들어가는 틈의 최대 크기 */
const sCap = (c: number) => Math.max(0, Math.min(1, (c / 2 - RS) / (RB - RS)));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type StarK = 'escape' | 'seeds' | 'clean' | 'cathit' | 'combo' | 'vac' | 'dog' | 'smash' | 'roll';
interface Star { k: StarK; n: number; label: string }
const ST = (k: StarK, n: number, label: string): Star => ({ k, n, label });
/** 판 짜기 한 박자: [종류, 앞 간격, 값] — T 탑(값 = 모양 0컵 1시리얼 2블록, 10의 자리 = 몇 개 붙었나) · C 의자 · O 소파 · F 선풍기(길이) · J 잼(길이)
 *  V 청소기 · S 계단(칸 수) · D 강아지 · H 공중 씨앗(개수) · L 바닥 씨앗(개수) · E 햄스터 집 */
type Beat = [string, number, number?];
interface StageDef { key: string; name: string; place: number; news: string; tip: string; vc: number; d0: number; plan: Beat[]; stars: Star[] }

export const STAGES: StageDef[] = [
  {
    key: 'tower', name: '아침 부엌', place: 0, news: '', tip: '꾹 누르면 빵빵! 컵 탑을 와장창 부숴요', vc: 0.0018, d0: 0.27,
    plan: [['T', 0.42, 0], ['L', 0.3, 3], ['T', 0.32, 0], ['H', 0.3, 3], ['T', 0.36, 1], ['L', 0.3, 3], ['T', 0.4, 22], ['E', 0.42]],
    stars: [ST('escape', 0, '집까지 탈출')],
  },
  {
    key: 'chair', name: '식탁 밑', place: 0, news: '의자 밑 낮은 틈 — 작아져야 빠져요', tip: '떼면 콩알만큼! 의자 밑으로 쏙', vc: 0.0035, d0: 0.27,
    plan: [['T', 0.45, 0], ['C', 0.36, 3], ['T', 0.42, 1], ['H', 0.3, 3], ['O', 0.36, 4], ['L', 0.24, 2], ['T', 0.36, 0], ['E', 0.45]],
    stars: [ST('escape', 0, '집까지 탈출'), ST('seeds', 8, '해바라기씨 여덟 개 줍기')],
  },
  {
    key: 'fan', name: '거실 선풍기', place: 1, news: '선풍기 — 작으면 날아가요! 커져서 버텨요', tip: '바람 속에서 부수면 파편이 멀리 날아가요', vc: 0.0049, d0: 0.27,
    plan: [['T', 0.45, 0], ['F', 0.45, 0.32], ['C', 0.5, 3], ['T', 0.4, 21], ['F', 0.45, 0.3], ['L', 0.24, 3], ['T', 0.4, 1], ['E', 0.45]],
    stars: [ST('escape', 0, '집까지 탈출'), ST('cathit', 2, '고양이 두 번 맞히기'), ST('clean', 0, '한 번도 안 막히기')],
  },
  {
    key: 'jam', name: '잼 쏟은 부엌', place: 0, news: '잼 바닥 — 크면 끈적끈적 느려져요', tip: '잼 위는 작게, 다 건너서 부풀기', vc: 0.0051, d0: 0.27,
    plan: [['T', 0.45, 0], ['J', 0.3, 0.36], ['T', 0.3, 1], ['C', 0.32, 3], ['J', 0.3, 0.32], ['T', 0.3, 32], ['H', 0.3, 4], ['E', 0.45]],
    stars: [ST('escape', 0, '집까지 탈출'), ST('seeds', 9, '해바라기씨 아홉 개 줍기'), ST('combo', 3, '탑 셋 연달아 부수기')],
  },
  {
    key: 'vac', name: '청소기 로봇', place: 1, news: '청소기 로봇 — 작으면 빨려 가요! 커서 튕겨요', tip: '튕긴 청소기가 고양이에게 날아가요', vc: 0.0052, d0: 0.27,
    plan: [['T', 0.45, 0], ['V', 0.4, 0], ['C', 0.4, 3], ['T', 0.36, 1], ['H', 0.3, 3], ['V', 0.4, 0], ['T', 0.3, 22], ['E', 0.45]],
    stars: [ST('escape', 0, '집까지 탈출'), ST('vac', 1, '청소기로 고양이 맞히기'), ST('clean', 0, '한 번도 안 막히기')],
  },
  {
    key: 'stairs', name: '계단 내려가기', place: 2, news: '계단 — 크게 굴러 내려가면 슝 빨라져요', tip: '계단에선 빵빵! 내려가서 얼른 작게', vc: 0.0054, d0: 0.27,
    plan: [['T', 0.45, 0], ['S', 0.34, 5], ['C', 0.36, 3], ['T', 0.36, 2], ['H', 0.3, 4], ['S', 0.34, 4], ['L', 0.3, 3], ['T', 0.3, 21], ['E', 0.45]],
    stars: [ST('escape', 0, '집까지 탈출'), ST('seeds', 9, '해바라기씨 아홉 개 줍기'), ST('roll', 2, '계단 두 번 다 크게 굴러 내려가기')],
  },
  {
    key: 'dog', name: '강아지 방', place: 1, news: '강아지 — 크면 놀라서 고양이 쪽으로 도망쳐요', tip: '작으면 배 밑으로 쏙, 크면 멍!', vc: 0.0055, d0: 0.27,
    plan: [['T', 0.45, 0], ['D', 0.4, 0], ['C', 0.4, 3], ['T', 0.34, 1], ['F', 0.4, 0.3], ['D', 0.34, 0], ['T', 0.3, 22], ['V', 0.4, 0], ['E', 0.45]],
    stars: [ST('escape', 0, '집까지 탈출'), ST('dog', 1, '강아지로 고양이 쫓기'), ST('clean', 0, '한 번도 안 막히기')],
  },
];
export const STAGE_COUNT = STAGES.length;
/** 탑 모양: 0 머그컵 탑 · 1 시리얼 상자 · 2 블록 성 */
const TOWER_W = [0.13, 0.15, 0.17], TOWER_H = [0.36, 0.42, 0.38], TOWER_N = [8, 6, 9];
const TOWER_NAME = ['컵 탑', '시리얼 상자', '블록 성'];
/** 틈: 0 의자 · 1 소파 · 2 햄스터 집 문 */
const GAP_W = [0.3, 0.6, 0.3], GAP_C = [0.2, 0.19, DOOR_C];

interface Tower { id: number; x: number; w: number; h: number; look: number; alive: boolean; seed: number; hitT: number }
interface Gap { id: number; x0: number; x1: number; c: number; look: number }
interface Zone { id: number; x0: number; x1: number }
/** 청소기 st: 0 돌아다님 · 1 튕겨 날아감 · 2 뒤집힘 · 3 햄스터를 빨아들이는 중 */
interface Vac { id: number; x: number; a: number; b: number; dir: number; v: number; st: number; t: number; cool: number }
/** 강아지 st: 0 서 있음 · 1 펄쩍 · 2 뒤로 달림 · 3 고양이 앞에 엎드림 · 4 떠남 */
interface Dog { id: number; x: number; st: number; t: number; x0: number }
interface Stair { x0: number; n: number; sw: number; sh: number; done: boolean }
/** 씨앗 k: 0 바닥 · 1 공중 · 2 틈 안 */
interface Seed { id: number; x: number; h: number; k: number; got: number }
/** 부서진 조각 (시뮬레이션: 고양이를 맞힌다) */
interface Bit { x: number; y: number; vx: number; vy: number; a: number; va: number; look: number; col: number; sz: number; t: number; rest: number; hit: boolean }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }

export interface PuffState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'ready' | 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; tries: number; again: boolean;
  bx: number; sz: number; v: number; boost: number; mode: number; mt: number; hold: boolean; prevHold: boolean; stun: number; touch: string;
  lift: number; squish: number; suckId: number; startT: number;
  cx: number; cv: number; cstun: number; cknock: number; cscare: number;
  len: number; towers: Tower[]; gaps: Gap[]; fans: Zone[]; jams: Zone[]; vacs: Vac[]; dogs: Dog[]; stairs: Stair[]; seeds: Seed[]; bits: Bit[]; houseX: number;
  freeze: number; nid: number;
  smashes: number; combo: number; comboBest: number; lastSmash: number; catHits: number; seedsGot: number; mistakes: number; vacHit: number; dogHit: number; rolls: number;
  wowN: number; firstPress: number; firstBig: number; started: boolean; presses: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { x: number; h: number; t: number; label: string } | null;
  events: Ev[];
  // 연출용 (시뮬레이션 결과와 무관)
  camX: number; camY: number; mood: number; moodT: number; roll: number; birdT: number; lookT: number;
}

const ev = (s: PuffState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: PuffState, key: string, text: string, x?: number, h?: number) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  if (text && x !== undefined) s.spot = { x, h: h ?? 0.2, t: s.t, label: text.split(' — ')[0] };
}

/** 바닥 높이 (계단을 내려가면 낮아진다) */
function floorH(s: PuffState, x: number) {
  let y = 0;
  for (const st of s.stairs) {
    if (x < st.x0) continue;
    const k = Math.min(st.n, Math.floor((x - st.x0) / st.sw) + 1);
    y -= k * st.sh;
  }
  return y;
}
const onStairs = (s: PuffState, x: number) => s.stairs.some((st) => x >= st.x0 && x < st.x0 + st.n * st.sw);
const inZone = (zs: Zone[], x: number) => zs.some((z) => x > z.x0 && x < z.x1);
/** 틈 안에 들어가 있나 (몸이 틈에 맞는 크기로 걸쳐 있을 때만 — 문 앞에서 눌린 큰 몸은 '안'이 아니다) */
const inGap = (bx: number, r: number, g: Gap) => bx < g.x1 && bx + 2 * r > g.x0 + 0.002 && 2 * r <= g.c + 0.004;

// ───────────────────────────── 판 만들기 ─────────────────────────────

function build(s: PuffState) {
  const d = STAGES[s.stage], J = () => 1 + (s.rng() - 0.5) * (s.stage ? 0.16 : 0.06);
  s.towers = [];
  s.gaps = [];
  s.fans = [];
  s.jams = [];
  s.vacs = [];
  s.dogs = [];
  s.stairs = [];
  s.seeds = [];
  s.bits = [];
  let x = 0;
  const seed = (sx: number, h: number, k: number) => s.seeds.push({ id: ++s.nid, x: sx, h, k, got: -1 });
  for (const [k, gap, v = 0] of d.plan) {
    x += k === 'T' && x === 0 ? gap : gap * J();
    if (k === 'T') {
      const look = v % 10, n = Math.max(1, Math.floor(v / 10));
      for (let i = 0; i < n; i++) {
        s.towers.push({ id: ++s.nid, x, w: TOWER_W[look], h: TOWER_H[look] * (0.94 + s.rng() * 0.12), look, alive: true, seed: Math.floor(s.rng() * 1e6), hitT: -99 });
        x += TOWER_W[look] + (i < n - 1 ? 0.13 : 0);
      }
    } else if (k === 'C' || k === 'O') {
      const look = k === 'C' ? 0 : 1, w = GAP_W[look];
      s.gaps.push({ id: ++s.nid, x0: x, x1: x + w, c: GAP_C[look], look });
      for (let i = 0; i < v; i++) seed(x + (w * (i + 0.5)) / v, 0.045, 2);
      x += w;
    } else if (k === 'F') {
      s.fans.push({ id: ++s.nid, x0: x, x1: x + v });
      x += v;
    } else if (k === 'J') {
      s.jams.push({ id: ++s.nid, x0: x, x1: x + v });
      for (let i = 0; i < 2; i++) seed(x + v * (0.3 + i * 0.4), 0.045, 0);
      x += v;
    } else if (k === 'V') {
      s.vacs.push({ id: ++s.nid, x: x + 0.2, a: x + VR, b: x + 0.42 - VR, dir: s.rng() < 0.5 ? -1 : 1, v: 0, st: 0, t: 0, cool: 0 });
      x += 0.42;
    } else if (k === 'S') {
      s.stairs.push({ x0: x, n: v, sw: 0.13, sh: 0.06, done: false });
      x += v * 0.13;
    } else if (k === 'D') {
      s.dogs.push({ id: ++s.nid, x, st: 0, t: 0, x0: x });
      x += DOG_L;
    } else if (k === 'H') {
      for (let i = 0; i < v; i++) seed(x + i * 0.085, 0.3 + (i % 2) * 0.07 + (s.rng() - 0.5) * 0.02, 1);
      x += v * 0.085;
    } else if (k === 'L') {
      for (let i = 0; i < v; i++) seed(x + i * 0.075, 0.045, 0);
      x += v * 0.075;
    } else if (k === 'E') {
      s.houseX = x;
      s.gaps.push({ id: ++s.nid, x0: x, x1: x + GAP_W[2], c: DOOR_C, look: 2 });
      x += 0.5;
    }
  }
  s.len = x;
}

function newStage(s: PuffState) {
  const d = STAGES[s.stage];
  build(s);
  s.phase = 'ready';
  s.pt = 0;
  s.bx = 0;
  s.sz = 0;
  s.v = 0;
  s.boost = 0;
  s.mode = 0;
  s.mt = 0;
  s.stun = 0;
  s.touch = '';
  s.lift = 0;
  s.squish = 0;
  s.cx = -d.d0;
  s.cv = 0;
  s.cstun = 0;
  s.cknock = 0;
  s.cscare = 0;
  s.freeze = 0;
  s.smashes = 0;
  s.combo = 0;
  s.comboBest = 0;
  s.lastSmash = -999;
  s.catHits = 0;
  s.seedsGot = 0;
  s.mistakes = 0;
  s.vacHit = 0;
  s.dogHit = 0;
  s.rolls = 0;
  s.started = false;
  s.starOk = d.stars.map(() => false);
  s.camX = -camLead(s);
  s.camY = 0;
  s.mood = 0;
  if (d.news) see(s, d.key, '');
}

function starMet(s: PuffState, st: Star) {
  switch (st.k) {
    case 'escape': return true;
    case 'seeds': return s.seedsGot >= st.n;
    case 'clean': return s.mistakes === 0;
    case 'cathit': return s.catHits >= st.n;
    case 'combo': return s.comboBest >= st.n;
    case 'vac': return s.vacHit >= st.n;
    case 'dog': return s.dogHit >= st.n;
    case 'smash': return s.smashes >= st.n;
    case 'roll': return s.rolls >= st.n;
  }
}
/** 진행 중 숫자 (별 줄에 '3/8'처럼) */
function starNow(s: PuffState, st: Star): string {
  const v = st.k === 'seeds' ? s.seedsGot : st.k === 'cathit' ? s.catHits : st.k === 'combo' ? s.comboBest : st.k === 'smash' ? s.smashes : st.k === 'roll' ? s.rolls : -1;
  return v >= 0 && v < st.n ? `${v}/${st.n}` : '';
}

function endStage(s: PuffState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((st) => starMet(s, st));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 2;
    s.moodT = 999;
    ev(s, 'clear', s.houseX, 0.2);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'caught', s.bx, 0.1, 0, why);
  }
}

function mistake(s: PuffState, kind: string, x: number, h: number) {
  s.mistakes++;
  s.combo = 0;
  ev(s, kind, x, h);
}

function smash(s: PuffState, tw: Tower) {
  tw.alive = false;
  tw.hitT = s.t;
  s.smashes++;
  s.combo = s.t - s.lastSmash <= COMBO_T ? s.combo + 1 : 1;
  s.comboBest = Math.max(s.comboBest, s.combo);
  s.lastSmash = s.t;
  s.pts += SMASH_PTS * s.combo;
  s.freeze = 3 + Math.min(2, s.combo - 1);
  s.v *= 0.62;
  s.wowN++;
  if (s.firstBig < 0) s.firstBig = s.t;
  if (s.bx - s.cx < 0.7 && s.t - s.lookT > 60) s.lookT = s.t;
  const n = TOWER_N[tw.look], fan = inZone(s.fans, tw.x) ? 1.35 : 1;
  for (let i = 0; i < n; i++) {
    const row = i / n;
    s.bits.push({
      x: tw.x + s.rng() * tw.w, y: tw.h * (0.15 + row * 0.8), vx: -(0.016 + s.rng() * 0.016) * fan, vy: 0.006 + s.rng() * 0.011,
      a: s.rng() * 6, va: (s.rng() - 0.5) * 0.5, look: tw.look, col: Math.floor(s.rng() * 4), sz: 0.8 + s.rng() * 0.4, t: 0, rest: 0, hit: false,
    });
  }
  if (s.bits.length > 60) s.bits.splice(0, s.bits.length - 60);
  ev(s, 'smash', tw.x + tw.w / 2, tw.h / 2, s.combo, TOWER_NAME[tw.look]);
}

function hitCat(s: PuffState, stun: number, knock: number, kind: string) {
  if (s.cstun > 0 || s.cscare > 0) return false;
  s.cstun = stun;
  s.cknock = knock;
  s.catHits++;
  s.pts += HIT_PTS;
  ev(s, kind, s.cx - CAT_L / 2, 0.12);
  return true;
}

// ───────────────────────────── 한 틱 ─────────────────────────────

function hamster(s: PuffState, hold: boolean) {
  if (s.mode === 1) {
    // 선풍기에 날아가는 중
    s.mt--;
    s.bx -= BLOW_V * (0.35 + s.mt / BLOW_T);
    s.lift = Math.sin((1 - s.mt / BLOW_T) * Math.PI) * 0.2;
    s.sz = hold ? Math.min(1, s.sz + 1 / PUFF_T) : Math.max(0, s.sz - 1 / SHRINK_T);
    if (s.mt <= 0) (s.mode = 0), (s.lift = 0), (s.v = 0), (s.stun = 8), ev(s, 'land', s.bx + rad(s.sz), 0);
    return;
  }
  if (s.mode === 2) {
    const vac = s.vacs.find((q) => q.id === s.suckId);
    s.mt--;
    s.sz = 0;
    if (vac) s.bx = vac.x - RS;
    if (s.mt <= 0 || !vac) {
      s.mode = 0;
      s.bx = (vac ? vac.x - VR : s.bx) - 2 * RS - 0.07;
      s.v = 0;
      s.stun = 14;
      if (vac) (vac.st = 0), (vac.cool = 70), (vac.dir = 1);
      ev(s, 'spit', s.bx + RS, 0.06);
    }
    return;
  }
  // 크기 (틈 안에선 더 못 부푼다)
  let cap = 1;
  const r0 = rad(s.sz);
  for (const g of s.gaps) if (inGap(s.bx, r0, g)) cap = Math.min(cap, sCap(g.c));
  const want = hold ? Math.min(1, s.sz + 1 / PUFF_T) : Math.max(0, s.sz - 1 / SHRINK_T);
  s.squish = hold && want > cap ? Math.min(1, s.squish + 0.08) : Math.max(0, s.squish - 0.1);
  s.sz = want > cap ? Math.max(cap, Math.min(want, s.sz - 1 / SHRINK_T)) : want;
  const r1 = rad(s.sz), R2 = 2 * r1, cxm = s.bx + r1;
  // 바닥 효과
  let vT = VS + (VB - VS) * s.sz;
  if (inZone(s.jams, cxm)) vT *= 0.75 - 0.5 * s.sz;
  if (inZone(s.fans, cxm)) {
    if (s.sz < FAN_S) {
      s.mode = 1;
      s.mt = BLOW_T;
      s.boost = 0;
      mistake(s, 'blown', cxm, r1);
      return;
    }
    vT -= FAN_W;
  }
  const stair = onStairs(s, cxm);
  if (stair && s.sz >= STAIR_S) s.boost = Math.min(BOOST_MAX, s.boost + STAIR_ACC);
  else {
    if (stair) vT = Math.min(vT, 0.0024);
    s.boost *= BOOST_DECAY;
  }
  for (const st of s.stairs) {
    if (st.done || cxm < st.x0 + st.n * st.sw) continue;
    st.done = true;
    if (s.boost >= BOOST_MAX * 0.7) {
      s.rolls++;
      s.wowN++;
      ev(s, 'roll', cxm, r1, s.rolls);
    }
  }
  if (s.stun > 0) (s.stun--, (vT = 0), (s.boost *= 0.9));
  s.v += (vT - s.v) * ACC;
  let nb = s.bx + s.v + s.boost;
  let touch = '';
  // 탑: 크면 와장창, 작으면 막힘
  for (const tw of s.towers) {
    if (!tw.alive || tw.x + tw.w < s.bx) continue;
    if (nb + R2 > tw.x) {
      if (s.sz >= SMASH_S) smash(s, tw);
      else {
        const lim = tw.x - R2;
        if (nb > lim) nb = Math.max(lim, Math.min(nb, s.bx));
        touch = 't' + tw.id;
        if (!hold && s.touch !== touch && s.v + s.boost > 0.0015) {
          s.stun = BONK_T;
          s.v = -0.0035;
          s.boost = 0;
          mistake(s, 'bonk', tw.x, Math.min(tw.h, R2) * 0.7);
        } else s.v = Math.min(s.v, 0);
      }
    }
    break;
  }
  // 틈: 크면 끼임
  for (const g of s.gaps) {
    if (g.x1 < s.bx || g.x0 > nb + R2 + 0.01) continue;
    if (!inGap(s.bx, r0, g) && nb + R2 > g.x0 && R2 > g.c + 1e-6) {
      const lim = g.x0 - R2;
      if (nb > lim) nb = Math.max(lim, Math.min(nb, s.bx));
      touch = 'g' + g.id;
      if (hold && s.touch !== touch && s.v + s.boost > 0.0012) {
        s.stun = STUCK_T;
        s.boost = 0;
        mistake(s, 'stuck', g.x0, g.c);
      }
      s.v = Math.min(s.v, 0);
    }
  }
  // 청소기
  for (const vac of s.vacs) {
    if (vac.st !== 0 || vac.cool > 0) continue;
    if (nb + R2 > vac.x - VR && nb < vac.x + VR) {
      if (s.sz >= VAC_S) {
        vac.st = 1;
        vac.v = -0.017;
        vac.t = 0;
        s.v *= 0.5;
        s.wowN++;
        ev(s, 'vacbump', vac.x, 0.05);
      } else {
        s.mode = 2;
        s.mt = SUCK_T;
        s.suckId = vac.id;
        vac.st = 3;
        vac.t = 0;
        s.boost = 0;
        mistake(s, 'suck', vac.x, 0.05);
        return;
      }
    }
  }
  // 강아지: 크면 놀라 펄쩍
  for (const dg of s.dogs) {
    if (dg.st !== 0) continue;
    if (nb + R2 > dg.x + 0.02 && nb < dg.x + DOG_L && R2 > DOG_C) {
      dg.st = 1;
      dg.t = 0;
      s.v *= 0.7;
      ev(s, 'woof', dg.x + DOG_L / 2, 0.3);
    }
  }
  s.touch = touch;
  s.bx = nb;
  // 씨앗
  const cx2 = s.bx + r1, cy2 = r1;
  for (const sd of s.seeds) {
    if (sd.got >= 0 || Math.abs(sd.x - cx2) > r1 + 0.04) continue;
    if (Math.hypot(sd.x - cx2, sd.h - cy2) < r1 + 0.028) {
      sd.got = s.t;
      s.seedsGot++;
      s.pts += SEED_PTS;
      ev(s, 'seed', sd.x, sd.h, sd.k);
    }
  }
}

function catStep(s: PuffState) {
  if (!s.started) return;
  const d = STAGES[s.stage];
  if (s.cstun > 0) {
    s.cstun--;
    const k = s.cknock * 0.07;
    s.cx -= k;
    s.cknock -= k;
    s.cv = 0;
    return;
  }
  if (s.cscare > 0) {
    s.cscare--;
    const k = s.cknock * 0.06;
    s.cx -= k;
    s.cknock -= k;
    s.cv = 0;
    return;
  }
  const gap = s.bx - s.cx, ramp = Math.min(1, (s.t - s.startT) / 80);
  let vt = d.vc * ramp * Math.min(1.8, 1 + Math.max(0, gap - 0.3) * 4);
  const mid = s.cx - CAT_L / 2;
  if (inZone(s.jams, mid)) vt *= 0.5;
  // 선풍기 바람은 방을 가로질러 멀리까지 — 고양이는 바람이 싫어 느려진다
  if (s.fans.some((z) => mid > z.x1 - WIND_L && mid < z.x1)) vt *= 0.45;
  s.cv += (vt - s.cv) * 0.06;
  s.cx += s.cv;
}

function world(s: PuffState) {
  // 부서진 조각: 뒤로 날아가 고양이를 맞힌다
  for (const b of s.bits) {
    b.t++;
    if (b.rest > 0) {
      b.rest++;
      continue;
    }
    b.vy -= GRAV;
    if (inZone(s.fans, b.x)) b.vx -= 0.0004;
    b.x += b.vx;
    b.y += b.vy;
    b.a += b.va;
    const fl = floorH(s, b.x);
    if (b.y < fl + 0.02) {
      b.y = fl + 0.02;
      b.vy = Math.abs(b.vy) > 0.003 ? -b.vy * 0.35 : 0;
      b.vx *= 0.6;
      b.va *= 0.6;
      if (Math.abs(b.vx) < 0.0006 && b.vy === 0) b.rest = 1;
    }
    if (!b.hit && b.x < s.cx + 0.02 && b.x > s.cx - CAT_L && b.y < fl + CAT_H && Math.abs(b.vx) > 0.002) {
      b.hit = true;
      if (hitCat(s, CAT_STUN, 0.06, 'cathit')) {
        b.vx = 0.004;
        b.vy = 0.008;
      }
    }
  }
  s.bits = s.bits.filter((b) => b.rest < 240 && b.x > s.cx - 1.5);
  // 청소기
  for (const v of s.vacs) {
    v.t++;
    if (v.cool > 0) v.cool--;
    if (v.st === 0 || v.st === 3) {
      v.x += v.dir * (v.st === 3 ? 0.0008 : v.cool > 0 ? 0.003 : 0.0016);
      if (v.x < v.a) (v.x = v.a), (v.dir = 1);
      if (v.x > v.b) (v.x = v.b), (v.dir = -1);
    } else if (v.st === 1) {
      v.x += v.v;
      v.v *= 0.986;
      if (v.x - VR < s.cx + 0.01 && v.x + VR > s.cx - CAT_L) {
        if (hitCat(s, CAT_STUN + 30, 0.1, 'vaccat')) (s.vacHit++, s.wowN++);
        v.st = 2;
        v.v = 0;
      } else if (Math.abs(v.v) < 0.0007) v.st = 2;
    }
  }
  // 강아지
  for (const dg of s.dogs) {
    dg.t++;
    if (dg.st === 1) {
      dg.x -= 0.012;
      if (dg.t >= 26) (dg.st = 2), (dg.t = 0);
    } else if (dg.st === 2) {
      dg.x -= 0.014;
      if (dg.x < s.cx + 0.06) {
        if (s.cstun <= 0 && s.cscare <= 0) {
          s.cscare = 120;
          s.cknock = 0.16;
          s.catHits++;
          s.dogHit++;
          s.pts += HIT_PTS;
          s.wowN++;
          ev(s, 'dogcat', s.cx, 0.15);
        }
        dg.st = 3;
        dg.t = 0;
      } else if (dg.t > 200) (dg.st = 4), (dg.t = 0);
    } else if (dg.st === 3 && dg.t > 150) (dg.st = 4), (dg.t = 0);
  }
  // 새것 보기 (햄스터 앞 화면 안에 들어오면)
  const ahead = s.bx + 0.95;
  for (const tw of s.towers) if (tw.x < ahead) see(s, 'look' + tw.look, tw.look ? `${TOWER_NAME[tw.look]} — 커져서 부숴요` : '', tw.x + tw.w / 2, tw.h + 0.05);
  for (const g of s.gaps) if (g.x0 < ahead && g.look < 2) see(s, 'gap' + g.look, g.look ? '소파 밑 — 길어요, 끝까지 작게' : '의자 밑 — 작아져야 쏙 빠져요', (g.x0 + g.x1) / 2, g.c + 0.06);
  for (const z of s.fans) if (z.x0 < ahead) see(s, 'fan', '선풍기 — 작으면 날아가요, 커져서 버텨요', z.x1, 0.3);
  for (const z of s.jams) if (z.x0 < ahead) see(s, 'jam', '잼 — 크면 끈적끈적 느려요', (z.x0 + z.x1) / 2, 0.06);
  for (const v of s.vacs) if (v.x < ahead) see(s, 'vac', '청소기 로봇 — 작으면 빨려 가요', v.x, 0.12);
  for (const st of s.stairs) if (st.x0 < ahead) see(s, 'stairs', '계단 — 크게 굴러 내려가면 슝!', st.x0 + 0.2, 0.1);
  for (const dg of s.dogs) if (dg.x < ahead) see(s, 'dog', '강아지 — 크면 놀라서 고양이 쪽으로!', dg.x + DOG_L / 2, 0.36);
  for (const sd of s.seeds) if (sd.k === 1 && sd.x < ahead) see(s, 'high', '공중 씨앗 — 커야 닿아요', sd.x, sd.h + 0.05);
}

/** 카메라: 고양이가 가까우면 고양이도 보이게, 크면 앞이 더 보이게 */
const camLead = (s: PuffState) => clamp(s.bx - s.cx + 0.17, 0.3, 0.5) - 0.14 * s.sz + (s.t - s.lookT < 70 ? 0.24 * Math.sin(((s.t - s.lookT) / 70) * Math.PI) : 0);

function cosmetic(s: PuffState) {
  const r1 = rad(s.sz);
  s.camX += (s.bx - camLead(s) - s.camX) * 0.12;
  s.camY += (floorH(s, s.bx + r1) - s.camY) * 0.12;
  s.roll += (s.v + s.boost) / Math.max(0.03, r1);
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  if (s.spot && s.t - s.spot.t > 150) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

export const puffhamster: GameDef<PuffState> & { wows(s: PuffState): number } = {
  id: 'puffhamster',
  name: '부풀리기 햄스터 대탈출',
  genes: ['puffsize', 'hold', 'combo'],
  twist: '몸이 뒤꿈치를 축으로 앞쪽으로 부풀어서, 꾹 누르는 순간 몸이 화면 절반만큼 앞으로 뻗어 탑을 부수고 그 파편이 뒤로 날아가 쫓아오는 고양이를 맞힌다 — 크면 부수고 막고, 작으면 빠르고 틈으로 빠진다',
  rules: [
    '꾹 누르면 햄스터가 빵빵하게 부풀어 컵 탑·상자를 와장창 부숴요. 파편이 고양이를 맞히면 데굴!',
    '떼면 콩알만 해져서 빨라지고 의자 밑 낮은 틈으로 쏙 빠져요. 큰 몸은 틈에 끼어요.',
    '고양이에게 잡히면 하트 -1(그 판 다시). 햄스터 집에 들어가면 다음 판!',
  ],
  controls: 'hold',
  hint: '꾹 누르면 빵빵, 떼면 콩알 / 스페이스',
  aspect: A,
  anywhere: true,
  art: {
    concept: '아침 햇살 부엌의 빵빵 햄스터 — 동글동글 그림책',
    mood: '노란 벽지와 민트색 찬장, 창문으로 비스듬히 쏟아지는 아침 햇살과 나무 바닥 결. 통통한 햄스터가 빵빵 부풀어 머그컵 탑을 와장창 부수면 컵들이 뒤로 날아가 장난꾸러기 고양이가 데굴데굴 구른다.',
    palette: { bg: '#ffe9a8', ink: '#4a2c14', muted: '#a07a50', accent: '#ff9f43', hot: '#ff5a5f', soft: '#bff0dc' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => Math.max(0, Math.round((s.bx - s.cx) * 100)),
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'ready', pt: 0, ok: false, why: '',
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, won: false, dead: false, tries: 0, again: false,
      bx: 0, sz: 0, v: 0, boost: 0, mode: 0, mt: 0, hold: false, prevHold: false, stun: 0, touch: '', lift: 0, squish: 0, suckId: 0, startT: 0,
      cx: 0, cv: 0, cstun: 0, cknock: 0, cscare: 0,
      len: 0, towers: [], gaps: [], fans: [], jams: [], vacs: [], dogs: [], stairs: [], seeds: [], bits: [], houseX: 0, freeze: 0, nid: 0,
      smashes: 0, combo: 0, comboBest: 0, lastSmash: -999, catHits: 0, seedsGot: 0, mistakes: 0, vacHit: 0, dogHit: 0, rolls: 0,
      wowN: 0, firstPress: -1, firstBig: -1, started: false, presses: 0,
      seen: new Set<string>(), newsQ: [], news: null, spot: null, events: [],
      camX: -0.34, camY: 0, mood: 0, moodT: 0, roll: 0, birdT: -999, lookT: -999,
    } as unknown as PuffState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const hold = !!(inp.hold || inp.tap);
    const press = hold && !s.prevHold;
    s.prevHold = hold;
    s.hold = hold;
    if (press) s.presses++;
    if (s.phase === 'ready') {
      s.pt++;
      if (hold) {
        s.phase = 'play';
        s.started = true;
        s.startT = s.t;
        s.pt = 0;
        if (s.firstPress < 0) s.firstPress = s.t;
      } else {
        cosmetic(s);
        return;
      }
    }
    if (s.phase === 'result') {
      s.pt++;
      s.sz = Math.max(0, s.sz - 1 / SHRINK_T);
      world(s);
      cosmetic(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    s.pt++;
    if (s.freeze > 0) {
      s.freeze--;
      cosmetic(s);
      return;
    }
    hamster(s, hold);
    catStep(s);
    world(s);
    if (s.phase === 'play') {
      if (s.mode === 0 && s.bx >= s.houseX + 0.02) endStage(s, true, '');
      else if (s.bx - s.cx <= 0) endStage(s, false, '고양이에게 잡혔어요');
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
const HOLD: Input = { tap: false, dir: 0, hold: true };
const FREE: Input = { tap: false, dir: 0, hold: false };

/** 앞으로 커야/작아야 하는 자리: 앞면이 at에 닿을 때부터 뒤꿈치가 to를 지날 때까지 크기가 th 이상(커야)·이하(작아야). soft = 꼭은 아님 */
interface Need { at: number; to: number; big: boolean; th: number; soft: boolean; k: string }

function needs(s: PuffState, wantSeeds: boolean): Need[] {
  const out: Need[] = [];
  const back = s.bx;
  for (const tw of s.towers) if (tw.alive && tw.x + tw.w > back) out.push({ at: tw.x, to: tw.x + tw.w, big: true, th: SMASH_S + 0.06, soft: false, k: 't' });
  for (const g of s.gaps) if (g.x1 > back) out.push({ at: g.x0, to: g.x1 + 0.005, big: false, th: sCap(g.c) - 0.01, soft: false, k: 'g' });
  for (const z of s.fans) if (z.x1 - RS > back) out.push({ at: z.x0 + rad(FAN_S + 0.12) - 0.03, to: z.x1 - RS + 0.01, big: true, th: FAN_S + 0.12, soft: false, k: 'f' });
  for (const z of s.jams) if (z.x1 > back) out.push({ at: z.x0, to: z.x1, big: false, th: 0.25, soft: true, k: 'j' });
  for (const v of s.vacs) if ((v.st === 0 || v.st === 3) && v.x + VR > back) out.push({ at: v.x - VR - 0.03, to: v.x + VR, big: true, th: VAC_S + 0.1, soft: false, k: 'v' });
  for (const st of s.stairs) if (st.x0 + st.n * st.sw - RB > back) out.push({ at: st.x0 + rad(STAIR_S + 0.15) - 0.02, to: st.x0 + st.n * st.sw - RB, big: true, th: STAIR_S + 0.15, soft: true, k: 's' });
  for (const dg of s.dogs) if (dg.st === 0 && dg.x + 0.1 > back) out.push({ at: dg.x + 0.03, to: dg.x + 0.08, big: true, th: 0.4, soft: true, k: 'd' });
  if (wantSeeds) for (const sd of s.seeds) if (sd.k === 1 && sd.got < 0 && sd.x - 0.18 > back) out.push({ at: sd.x - 0.04, to: sd.x - 0.18, big: true, th: clamp((sd.h + 0.03 - 2 * RS) / (2 * (RB - RS)), 0.3, 1), soft: true, k: 'h' });
  return out.sort((a, b) => a.at - b.at);
}

/** 지금부터 hold로 가면 몇 틱 뒤 크기 th에 닿고, 그때 앞면은 어디인가 (햄스터만 흉내) */
function reach(s: PuffState, hold: boolean, th: number): { k: number; front: number } {
  let z = s.sz, v = s.v, b = s.bx, bo = s.boost;
  for (let k = 0; k < 40; k++) {
    if (hold ? z >= th : z <= th) return { k, front: b + 2 * rad(z) };
    z = hold ? Math.min(1, z + 1 / PUFF_T) : Math.max(0, z - 1 / SHRINK_T);
    const vT = VS + (VB - VS) * z;
    v += (vT - v) * ACC;
    bo *= BOOST_DECAY;
    b += v + bo;
  }
  return { k: 40, front: b + 2 * rad(z) };
}

/** 잘하는 봇: 앞에 놓인 것을 읽고, 커야 할 자리에 딱 맞춰 부풀고 작아야 할 자리 전에 줄인다. 별(고양이 맞히기·씨앗)도 노린다 */
export const puffhamsterSmart: Bot<PuffState> = {
  name: '앞을 읽고 크기 바꾸기',
  act(s) {
    if (s.phase === 'result') return FREE;
    if (s.phase === 'ready') return s.pt > 20 ? HOLD : FREE;
    if (s.mode !== 0) return FREE;
    const d = STAGES[s.stage], gap = s.bx - s.cx;
    const ns = needs(s, gap > 0.14);
    const front = s.bx + 2 * rad(s.sz), back = s.bx, mg = 0.035 + (s.v + s.boost) * 4;
    const on = (n: Need) => n.at <= front + 0.004 && n.to >= back;
    const soon = (n: Need) => !on(n) && n.to >= back && reach(s, n.big, n.th).front + mg >= n.at;
    // 1. 꼭 작아야 할 자리가 코앞이거나 그 안 → 뗀다
    if (ns.some((n) => !n.big && !n.soft && (on(n) || soon(n)))) return FREE;
    // 2. 꼭 커야 할 자리 안이거나 코앞 → 꾹
    if (ns.some((n) => n.big && !n.soft && (on(n) || soon(n)))) return HOLD;
    // 3. 크고, 다음 탑이 바로 앞이면(사이에 틈이 없으면) 그대로 — 연달아 와장창
    const nx = ns.find((n) => n.to >= back && !n.soft);
    if (nx && nx.big && s.sz >= 0.5 && nx.at - front < 0.3) return HOLD;
    // 4. 고양이를 맞혀야 하는데 멀면, 탑 앞에서 일찍 커져 고양이를 끌어들인다
    const hitStar = d.stars.find((x) => x.k === 'cathit');
    if (hitStar && s.catHits < hitStar.n && nx && nx.k === 't' && gap > 0.36 && nx.at - front < 0.75) return HOLD;
    // 5. 하면 좋은 자리(계단·강아지·공중 씨앗): 다음 꼭 작아야 할 자리를 망치지 않을 때만
    const hard = ns.find((n) => !n.big && !n.soft && n.to >= back);
    for (const n of ns) {
      if (!n.big || !n.soft || !(on(n) || soon(n))) continue;
      if (hard && hard.at - (n.to + 2 * RB) < 0.02 && n.k === 'h') continue;
      return HOLD;
    }
    return FREE;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: boolean }>();
/** 못하는 봇: 아무 때나 꾹·뗌 */
export const puffhamsterRandom: Bot<PuffState> = {
  name: '아무렇게나',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: 0, hold: false }));
    if (s.t >= m.next) {
      m.hold = rng() < 0.5;
      m.next = s.t + 12 + Math.floor(rng() * 48);
    }
    return m.hold ? HOLD : FREE;
  },
};

const habitMem = new WeakMap<object, { key: string; x1: number }>();
/** 버릇 봇 1: 앞에 물건이 있으면 늘 부풀기 (틈에 끼면 그제야 줄여서 빠져나가기) */
export const puffhamsterHabit: Bot<PuffState> = {
  name: '앞에 물건이 있으면 늘 부풀기',
  act(s) {
    if (s.phase !== 'play') return s.phase === 'ready' ? HOLD : FREE;
    if (s.mode !== 0) return FREE;
    const key = `${s.stage}:${s.tries}`;
    if (s.touch.startsWith('g')) {
      const g = s.gaps.find((q) => 'g' + q.id === s.touch);
      if (g) habitMem.set(s, { key, x1: g.x1 });
    }
    const m = habitMem.get(s);
    if (m && m.key === key && s.bx < m.x1) return FREE;
    const front = s.bx + 2 * rad(s.sz), near = (x0: number, x1: number) => x1 > s.bx && x0 < front + 0.3;
    const thing =
      s.towers.some((t) => t.alive && near(t.x, t.x + t.w)) || s.gaps.some((g) => g.look < 2 && near(g.x0, g.x1)) || s.fans.some((z) => near(z.x0, z.x1)) ||
      s.jams.some((z) => near(z.x0, z.x1)) || s.vacs.some((v) => v.st === 0 && near(v.x - VR, v.x + VR)) || s.stairs.some((q) => near(q.x0, q.x0 + q.n * q.sw)) ||
      s.dogs.some((dg) => dg.st === 0 && near(dg.x, dg.x + DOG_L));
    return thing ? HOLD : FREE;
  },
};

const habit2Mem = new WeakMap<object, number>();
/** 버릇 봇 2 (생성기와 무관한 독립 버릇): 늘 작게 달리다 쿵 막히면 그제야 그 탑을 부술 때까지 부풀기 */
export const puffhamsterHabit2: Bot<PuffState> = {
  name: '작게 달리다 막히면 부풀기',
  act(s) {
    if (s.phase !== 'play') return s.phase === 'ready' ? HOLD : FREE;
    if (s.mode !== 0) return FREE;
    if (s.touch.startsWith('t') || s.stun > 0) {
      const tw = s.towers.find((q) => q.alive && q.x + q.w > s.bx);
      if (tw) habit2Mem.set(s, tw.id);
    }
    const id = habit2Mem.get(s);
    return id !== undefined && s.towers.some((q) => q.id === id && q.alive) ? HOLD : FREE;
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
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.47 : r;
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
/** 테두리 있는 글자 */
function label(ctx: C2, text: string, x: number, y: number, size: number, fill: string, stroke = 'rgba(90,54,27,.9)', lw = 3.5, wgt = 900) {
  ctx.font = `${wgt} ${Math.max(12, size)}px system-ui, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
const OUT = '#5a361b';

// ── 장소별 팔레트: 0 부엌 · 1 거실 · 2 복도 계단 ──
interface Pal { wall: [string, string]; stripe: string; dot: string; wain: string; wainD: string; floor: [string, string, string, string]; seam: string; cab: string; cabD: string; top: string }
const PAL: Pal[] = [
  { wall: ['#fff6cf', '#ffe193'], stripe: 'rgba(255,255,255,.42)', dot: '#ffc35c', wain: '#a8e8d1', wainD: '#78cdb0', floor: ['#f3cb92', '#ebbb7e', '#e2ad6f', '#d89f61'], seam: '#b5793f', cab: '#9fe3cb', cabD: '#6fc7a9', top: '#e8b073' },
  { wall: ['#eafcf3', '#c6f1de'], stripe: 'rgba(255,255,255,.5)', dot: '#86d9bb', wain: '#ffd98f', wainD: '#efbb5e', floor: ['#efc48d', '#e5b37a', '#daa46c', '#cf965f'], seam: '#ad713c', cab: '#ffcf86', cabD: '#e9ad55', top: '#d9965a' },
  { wall: ['#fff3e2', '#ffd9b5'], stripe: 'rgba(255,255,255,.45)', dot: '#ffb27f', wain: '#a8e8d1', wainD: '#78cdb0', floor: ['#f1c890', '#e7b77c', '#dda96e', '#d29b62'], seam: '#b1763f', cab: '#a8e8d1', cabD: '#78cdb0', top: '#e3aa6c' },
];
/** 화면 세로 자리(폭 = 1): 바닥 선 · 벽 아래 끝까지의 깊이 · 위·아래 띠 */
const TRACK = 0.95, DEPTH = 0.085, HUD_T = 0.15, HUD_B = 1.085;

function drawWindow(ctx: C2, x: number, y: number, ww: number, wh: number, t: number, k: number, wow: number) {
  // 창틀 그림자
  ctx.fillStyle = 'rgba(160,110,40,.18)';
  rr(ctx, x + ww * 0.04, y + wh * 0.05, ww, wh, ww * 0.06);
  ctx.fill();
  // 하늘
  ctx.fillStyle = lin(ctx, 0, y, 0, y + wh, [0, '#8fd6ff'], [0.7, '#c9efff'], [1, '#effbff']);
  rr(ctx, x, y, ww, wh, ww * 0.05);
  ctx.fill();
  ctx.save();
  rr(ctx, x, y, ww, wh, ww * 0.05);
  ctx.clip();
  // 해
  const sx = x + ww * 0.78, sy = y + wh * 0.24;
  ctx.fillStyle = radg(ctx, sx, sy, 0, ww * 0.5, [0, 'rgba(255,250,200,.95)'], [0.25, 'rgba(255,236,150,.55)'], [1, 'rgba(255,236,150,0)']);
  ctx.fillRect(x, y, ww, wh);
  ctx.fillStyle = '#fff6c2';
  ell(ctx, sx, sy, ww * 0.1, ww * 0.1);
  ctx.fill();
  // 구름
  for (let i = 0; i < 2; i++) {
    const cx = x + ((hsh(k * 7 + i) * ww + t * 0.06 * (i + 1)) % (ww * 1.4)) - ww * 0.2, cy = y + wh * (0.45 + i * 0.22);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    for (const [dx, dy, r] of [[0, 0, 0.09], [0.08, -0.03, 0.11], [0.17, 0, 0.08], [0.08, 0.02, 0.09]]) (ell(ctx, cx + dx * ww, cy + dy * ww, r * ww, r * ww * 0.75), ctx.fill());
  }
  // 먼 나무 언덕
  ctx.fillStyle = '#9edb8a';
  ell(ctx, x + ww * 0.3, y + wh * 1.02, ww * 0.55, wh * 0.2);
  ctx.fill();
  ctx.fillStyle = '#86cf74';
  ell(ctx, x + ww * 0.85, y + wh * 1.05, ww * 0.45, wh * 0.18);
  ctx.fill();
  ctx.restore();
  // 창틀
  ctx.strokeStyle = '#fffdf6';
  ctx.lineWidth = ww * 0.07;
  rr(ctx, x, y, ww, wh, ww * 0.05);
  ctx.stroke();
  ctx.lineWidth = ww * 0.04;
  ctx.beginPath();
  ctx.moveTo(x + ww / 2, y);
  ctx.lineTo(x + ww / 2, y + wh);
  ctx.moveTo(x, y + wh * 0.5);
  ctx.lineTo(x + ww, y + wh * 0.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(180,130,70,.35)';
  ctx.lineWidth = 1;
  rr(ctx, x - ww * 0.035, y - ww * 0.035, ww * 1.07, wh + ww * 0.07, ww * 0.07);
  ctx.stroke();
  // 창턱
  ctx.fillStyle = '#fffaf0';
  rr(ctx, x - ww * 0.09, y + wh + ww * 0.01, ww * 1.18, ww * 0.07, ww * 0.03);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,140,80,.35)';
  ctx.fillRect(x - ww * 0.08, y + wh + ww * 0.065, ww * 1.16, ww * 0.015);
  // 커튼 (노란 깅엄)
  for (const side of [-1, 1]) {
    const cx0 = side < 0 ? x - ww * 0.12 : x + ww * 0.88, sway = Math.sin(t * 0.03 + side) * ww * 0.012;
    ctx.fillStyle = lin(ctx, cx0, 0, cx0 + ww * 0.24, 0, [0, '#ffb0a0'], [0.5, '#ff8f7f'], [1, '#ffb0a0']);
    ctx.beginPath();
    ctx.moveTo(cx0, y - ww * 0.06);
    ctx.lineTo(cx0 + ww * 0.24, y - ww * 0.06);
    ctx.quadraticCurveTo(cx0 + ww * 0.12 + sway, y + wh * 0.5, cx0 + ww * (side < 0 ? 0.2 : 0.04) + sway, y + wh * 0.92);
    ctx.lineTo(cx0 + ww * (side < 0 ? 0.02 : 0.22) + sway, y + wh * 0.92);
    ctx.quadraticCurveTo(cx0 + ww * 0.1, y + wh * 0.5, cx0, y - ww * 0.06);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.2;
    for (let j = 1; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(cx0 + ww * 0.06 * j, y - ww * 0.04);
      ctx.lineTo(cx0 + ww * 0.06 * j + sway * 0.6, y + wh * 0.8);
      ctx.stroke();
    }
  }
  // 커튼 봉
  ctx.fillStyle = '#c98a4b';
  rr(ctx, x - ww * 0.16, y - ww * 0.09, ww * 1.32, ww * 0.04, ww * 0.02);
  ctx.fill();
  // 창턱 위 참새 (구경꾼: 큰 순간에 파닥)
  const bx = x + ww * (0.2 + 0.5 * hsh(k * 3)), by = y + wh + ww * 0.012, flap = wow > 0 ? Math.sin(t * 0.9) : 0, hop = wow > 0 ? Math.abs(Math.sin(t * 0.3)) * ww * 0.05 : Math.abs(Math.sin(t * 0.05 + k)) > 0.97 ? ww * 0.02 : 0;
  drawBird(ctx, bx, by - hop, ww * 0.09, flap, t + k * 40);
}

function drawBird(ctx: C2, x: number, y: number, r: number, flap: number, t: number) {
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.strokeStyle = OUT;
  // 꼬리
  ctx.fillStyle = '#9b6a3d';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y - r * 0.5);
  ctx.lineTo(x - r * 1.25, y - r * 0.85);
  ctx.lineTo(x - r * 1.1, y - r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 몸
  ctx.fillStyle = radg(ctx, x - r * 0.2, y - r * 0.8, 0, r * 1.1, [0, '#d9a777'], [1, '#a8713f']);
  ell(ctx, x, y - r * 0.55, r * 0.75, r * 0.55);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff3df';
  ell(ctx, x + r * 0.2, y - r * 0.4, r * 0.42, r * 0.3);
  ctx.fill();
  // 날개
  ctx.fillStyle = '#8a5a30';
  ctx.save();
  ctx.translate(x - r * 0.1, y - r * 0.65);
  ctx.rotate(-0.3 - flap * 0.9);
  ell(ctx, -r * 0.2, 0, r * 0.45, r * 0.22);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 머리
  ctx.fillStyle = '#b07a45';
  ell(ctx, x + r * 0.55, y - r * 0.95, r * 0.38, r * 0.36);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffb13b';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.88, y - r * 1.0);
  ctx.lineTo(x + r * 1.15, y - r * 0.92 + Math.sin(t * 0.4) * r * 0.03);
  ctx.lineTo(x + r * 0.88, y - r * 0.84);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ell(ctx, x + r * 0.66, y - r * 1.02, r * 0.07, r * 0.08);
  ctx.fill();
}

/** 벽(먼 층, 시차 0.3): 벽지 · 아래 판벽 · 창문과 햇살 · 선반 · 시계 */
function drawWall(ctx: C2, s: PuffState, w: number, h: number, P: Pal, baseY: number, t: number, wow: number) {
  const cam = s.camX * 0.3;
  ctx.fillStyle = lin(ctx, 0, 0, 0, baseY, [0, P.wall[0]], [1, P.wall[1]]);
  ctx.fillRect(0, 0, w, h);
  // 세로 줄무늬 벽지
  const sp = 0.09;
  ctx.fillStyle = P.stripe;
  ctx.beginPath();
  for (let i = Math.floor(cam / sp) - 1; i < cam / sp + 13; i++) ctx.rect((i * sp - cam) * w, 0, sp * 0.45 * w, baseY);
  ctx.fill();
  // 작은 꽃무늬 (한 번에 칠한다)
  ctx.fillStyle = P.dot;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  const pr = w * 0.006;
  for (let i = Math.floor(cam / sp) - 1; i < cam / sp + 13; i++) {
    for (let j = 0; j < 7; j++) {
      const fx = (i * sp + sp * 0.72 - cam) * w, fy = (0.17 + j * 0.1 + (i % 2) * 0.05) * w;
      if (fy > baseY - 0.3 * w) continue;
      for (let q = 0; q < 4; q++) {
        const px = fx + Math.cos(q * 1.57) * w * 0.007, py = fy + Math.sin(q * 1.57) * w * 0.007;
        ctx.moveTo(px + pr, py);
        ctx.arc(px, py, pr, 0, TAU);
      }
    }
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // 아래 판벽 (민트) + 몰딩
  const wy = baseY - 0.27 * w;
  ctx.fillStyle = P.wain;
  ctx.fillRect(0, wy, w, baseY - wy);
  const pw = 0.24;
  for (let i = Math.floor(cam / pw) - 1; i < cam / pw + 6; i++) {
    const px = (i * pw - cam) * w;
    ctx.strokeStyle = P.wainD;
    ctx.lineWidth = 2;
    rr(ctx, px + w * 0.025, wy + w * 0.04, pw * w - w * 0.05, baseY - wy - w * 0.08, w * 0.012);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px + w * 0.03, baseY - w * 0.045);
    ctx.lineTo(px + pw * w - w * 0.03, baseY - w * 0.045);
    ctx.stroke();
  }
  ctx.fillStyle = '#fffcf2';
  ctx.fillRect(0, wy - w * 0.018, w, w * 0.022);
  ctx.fillStyle = 'rgba(170,120,60,.25)';
  ctx.fillRect(0, wy + w * 0.004, w, w * 0.006);
  // 걸레받이
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, baseY - w * 0.03, w, w * 0.03);
  ctx.fillStyle = 'rgba(170,120,60,.3)';
  ctx.fillRect(0, baseY - w * 0.03, w, w * 0.004);
  // 창문 · 장식 (1.1 간격)
  const per = 1.1;
  for (let i = Math.floor(cam / per) - 1; i < cam / per + 2; i++) {
    const ox = (i * per - cam) * w, kind = Math.floor(hsh(i * 13 + s.stage) * 3);
    drawWindow(ctx, ox + w * 0.08, w * 0.21, w * 0.34, w * 0.3, t, i, wow);
    // 창문 옆: 선반과 화분 / 액자 / 시계
    const dx = ox + w * 0.62;
    if (kind === 0) {
      ctx.fillStyle = '#d99a5c';
      rr(ctx, dx, w * 0.4, w * 0.28, w * 0.022, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,100,50,.25)';
      ctx.fillRect(dx + 4, w * 0.422, w * 0.27, w * 0.012);
      drawPot(ctx, dx + w * 0.07, w * 0.4, w * 0.05, t, i);
      drawJar(ctx, dx + w * 0.17, w * 0.4, w * 0.04, '#ff9f7a');
      drawJar(ctx, dx + w * 0.235, w * 0.4, w * 0.032, '#ffd166');
    } else if (kind === 1) {
      ctx.fillStyle = 'rgba(150,100,50,.2)';
      rr(ctx, dx + w * 0.05 + 3, w * 0.25 + 3, w * 0.18, w * 0.2, 4);
      ctx.fill();
      ctx.fillStyle = '#e7a35a';
      rr(ctx, dx + w * 0.05, w * 0.25, w * 0.18, w * 0.2, 4);
      ctx.fill();
      ctx.fillStyle = '#fffdf2';
      rr(ctx, dx + w * 0.065, w * 0.265, w * 0.15, w * 0.17, 2);
      ctx.fill();
      // 해바라기 그림
      const fx = dx + w * 0.14, fy = w * 0.33;
      ctx.strokeStyle = '#6cbf5a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, w * 0.425);
      ctx.stroke();
      ctx.fillStyle = '#ffcf3f';
      for (let q = 0; q < 8; q++) (ell(ctx, fx + Math.cos(q * 0.785) * w * 0.024, fy + Math.sin(q * 0.785) * w * 0.024, w * 0.013, w * 0.008, q * 0.785), ctx.fill());
      ctx.fillStyle = '#8a5a2b';
      ell(ctx, fx, fy, w * 0.016, w * 0.016);
      ctx.fill();
    } else {
      const cx = dx + w * 0.14, cy = w * 0.33, cr = w * 0.07;
      ctx.fillStyle = 'rgba(150,100,50,.2)';
      ell(ctx, cx + 3, cy + 3, cr, cr);
      ctx.fill();
      ctx.fillStyle = '#ff9f7a';
      ell(ctx, cx, cy, cr, cr);
      ctx.fill();
      ctx.fillStyle = '#fffdf4';
      ell(ctx, cx, cy, cr * 0.8, cr * 0.8);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const a1 = t * 0.004, a2 = t * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a1 - 1.57) * cr * 0.45, cy + Math.sin(a1 - 1.57) * cr * 0.45);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a2 - 1.57) * cr * 0.65, cy + Math.sin(a2 - 1.57) * cr * 0.65);
      ctx.stroke();
      for (let q = 0; q < 12; q++) (ctx.fillStyle = '#d9a46a'), ell(ctx, cx + Math.cos(q * 0.5236) * cr * 0.68, cy + Math.sin(q * 0.5236) * cr * 0.68, 1.3, 1.3), ctx.fill();
    }
  }
}

function drawPot(ctx: C2, x: number, y: number, r: number, t: number, k: number) {
  // 잎
  ctx.strokeStyle = '#3f9a52';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.42 + Math.sin(t * 0.03 + i + k) * 0.05;
    ctx.fillStyle = i % 2 ? '#6ccf6e' : '#57bb5c';
    ell(ctx, x + Math.cos(a) * r * 0.9, y - r * 0.9 + Math.sin(a) * r * 0.9, r * 0.5, r * 0.2, a);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = lin(ctx, x - r, 0, x + r, 0, [0, '#ff8b6b'], [0.5, '#ffab8a'], [1, '#e8704f']);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y - r * 0.8);
  ctx.lineTo(x + r * 0.7, y - r * 0.8);
  ctx.lineTo(x + r * 0.5, y);
  ctx.lineTo(x - r * 0.5, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffc2a8';
  ctx.fillRect(x - r * 0.75, y - r * 0.85, r * 1.5, r * 0.18);
}
function drawJar(ctx: C2, x: number, y: number, r: number, col: string) {
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  rr(ctx, x - r * 0.6, y - r * 1.5, r * 1.2, r * 1.5, r * 0.3);
  ctx.fill();
  ctx.fillStyle = col;
  rr(ctx, x - r * 0.5, y - r * 0.9, r, r * 0.85, r * 0.2);
  ctx.fill();
  ctx.fillStyle = '#e46a5a';
  rr(ctx, x - r * 0.65, y - r * 1.75, r * 1.3, r * 0.32, r * 0.1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,40,.6)';
  ctx.lineWidth = 1;
  rr(ctx, x - r * 0.6, y - r * 1.5, r * 1.2, r * 1.5, r * 0.3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillRect(x - r * 0.4, y - r * 1.35, r * 0.15, r * 0.9);
}

/** 가운데 층(시차 0.6): 벽에 붙은 찬장·조리대 / 책장 / 낮은 장 */
function drawMid(ctx: C2, s: PuffState, w: number, P: Pal, baseY: number, t: number) {
  const cam = s.camX * 0.6, per = 0.9;
  for (let i = Math.floor(cam / per) - 1; i < cam / per + 2; i++) {
    const x0 = (i * per - cam) * w, kind = Math.floor(hsh(i * 31 + s.stage * 7) * 3);
    if (kind === 0) {
      // 조리대 + 아래 찬장
      const cw = w * 0.5, ch = w * 0.24, cx = x0 + w * 0.2, top = baseY - ch;
      ctx.fillStyle = 'rgba(150,100,40,.16)';
      ctx.fillRect(cx + w * 0.02, top + w * 0.01, cw, ch);
      ctx.fillStyle = lin(ctx, 0, top, 0, baseY, [0, P.cab], [1, P.cabD]);
      ctx.fillRect(cx, top, cw, ch);
      ctx.strokeStyle = 'rgba(80,60,40,.35)';
      ctx.lineWidth = 1.5;
      for (let j = 0; j < 3; j++) {
        rr(ctx, cx + w * 0.015 + (j * cw) / 3, top + w * 0.035, cw / 3 - w * 0.03, ch - w * 0.05, 4);
        ctx.stroke();
        ctx.fillStyle = '#fff5dc';
        ell(ctx, cx + ((j + 0.5) * cw) / 3, top + w * 0.07, w * 0.009, w * 0.009);
        ctx.fill();
      }
      // 나무 상판
      ctx.fillStyle = lin(ctx, 0, top - w * 0.03, 0, top, [0, '#f3c38a'], [1, P.top]);
      rr(ctx, cx - w * 0.015, top - w * 0.03, cw + w * 0.03, w * 0.032, 3);
      ctx.fill();
      // 조리대 위 물건: 토스터 · 과일 그릇 · 주전자
      const ty = top - w * 0.03;
      ctx.fillStyle = lin(ctx, 0, ty - w * 0.08, 0, ty, [0, '#ffe9d6'], [1, '#ffb4a2']);
      rr(ctx, cx + w * 0.04, ty - w * 0.075, w * 0.11, w * 0.075, w * 0.02);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,54,27,.5)';
      ctx.fillRect(cx + w * 0.06, ty - w * 0.072, w * 0.025, w * 0.006);
      ctx.fillRect(cx + w * 0.105, ty - w * 0.072, w * 0.025, w * 0.006);
      const pop = Math.max(0, Math.sin(t * 0.02 + i)) > 0.96 ? w * 0.03 : 0;
      ctx.fillStyle = '#f2c27f';
      rr(ctx, cx + w * 0.058, ty - w * 0.1 - pop, w * 0.03, w * 0.04, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx + w * 0.3, ty - w * 0.02, w * 0.075, w * 0.025);
      ctx.fill();
      for (const [fx, fc] of [[-0.035, '#ff6b6b'], [0, '#ffd43b'], [0.035, '#8ce99a'], [0.017, '#ff922b']] as [number, string][]) {
        ctx.fillStyle = fc;
        ell(ctx, cx + w * (0.3 + fx), ty - w * (fx === 0.017 ? 0.06 : 0.04), w * 0.022, w * 0.022);
        ctx.fill();
      }
      ctx.fillStyle = lin(ctx, cx + w * 0.4, 0, cx + w * 0.48, 0, [0, '#8fe0ff'], [1, '#4fb3e0']);
      ell(ctx, cx + w * 0.44, ty - w * 0.04, w * 0.04, w * 0.04);
      ctx.fill();
      ctx.fillStyle = '#4fb3e0';
      ctx.fillRect(cx + w * 0.425, ty - w * 0.09, w * 0.03, w * 0.012);
    } else if (kind === 1) {
      // 큰 화분
      drawPot(ctx, x0 + w * 0.35, baseY - w * 0.005, w * 0.11, t, i);
    } else {
      // 낮은 장 + 램프
      const cw = w * 0.36, ch = w * 0.17, cx = x0 + w * 0.25, top = baseY - ch;
      ctx.fillStyle = 'rgba(150,100,40,.16)';
      ctx.fillRect(cx + w * 0.02, top + w * 0.01, cw, ch);
      ctx.fillStyle = lin(ctx, 0, top, 0, baseY, [0, '#f6cf98'], [1, '#e2a868']);
      ctx.fillRect(cx, top, cw, ch);
      ctx.strokeStyle = 'rgba(80,60,40,.3)';
      ctx.lineWidth = 1.5;
      rr(ctx, cx + w * 0.015, top + w * 0.02, cw / 2 - w * 0.02, ch - w * 0.04, 3);
      ctx.stroke();
      rr(ctx, cx + cw / 2 + w * 0.005, top + w * 0.02, cw / 2 - w * 0.02, ch - w * 0.04, 3);
      ctx.stroke();
      ctx.fillStyle = '#c98a4b';
      ctx.fillRect(cx + cw * 0.7, top - w * 0.12, w * 0.012, w * 0.12);
      ctx.fillStyle = lin(ctx, 0, top - w * 0.2, 0, top - w * 0.11, [0, '#fff3c4'], [1, '#ffd36b']);
      ctx.beginPath();
      ctx.moveTo(cx + cw * 0.7 - w * 0.06, top - w * 0.11);
      ctx.lineTo(cx + cw * 0.7 + w * 0.07, top - w * 0.11);
      ctx.lineTo(cx + cw * 0.7 + w * 0.04, top - w * 0.2);
      ctx.lineTo(cx + cw * 0.7 - w * 0.03, top - w * 0.2);
      ctx.closePath();
      ctx.fill();
      // 책 몇 권
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = ['#ff8787', '#74c0fc', '#ffd43b', '#8ce99a'][j];
        ctx.fillRect(cx + w * (0.03 + j * 0.028), top - w * (0.07 + (j % 2) * 0.01), w * 0.022, w * (0.07 + (j % 2) * 0.01));
      }
    }
  }
}

/** 햇살 줄기 (창문에서 바닥으로 비스듬히) */
function drawBeams(ctx: C2, s: PuffState, w: number, baseY: number, t: number) {
  const cam = s.camX * 0.3, per = 1.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = Math.floor(cam / per) - 1; i < cam / per + 2; i++) {
    const x0 = (i * per - cam) * w + w * 0.1, a = 0.08 + 0.025 * Math.sin(t * 0.02 + i);
    ctx.fillStyle = lin(ctx, x0, w * 0.25, x0 + w * 0.45, baseY + w * 0.1, [0, `rgba(255,244,190,${a * 1.6})`], [1, 'rgba(255,244,190,0)']);
    ctx.beginPath();
    ctx.moveTo(x0, w * 0.22);
    ctx.lineTo(x0 + w * 0.3, w * 0.22);
    ctx.lineTo(x0 + w * 0.72, baseY + w * 0.16);
    ctx.lineTo(x0 + w * 0.3, baseY + w * 0.16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** 나무 바닥 (계단이면 칸마다 내려가고, 높은 칸의 옆면이 계단 모양으로 보인다) */
const FRONT = 0.125;
function drawFloor(ctx: C2, s: PuffState, w: number, h: number, P: Pal, sy: (hw: number) => number) {
  const x0 = s.camX - 0.2, x1 = s.camX + 1.2, low = floorH(s, s.len + 5);
  // 높이가 같은 구간으로 나눈다
  const cuts = [x0];
  for (const st of s.stairs) for (let k = 0; k <= st.n; k++) if (st.x0 + k * st.sw > x0 && st.x0 + k * st.sw < x1) cuts.push(st.x0 + k * st.sw);
  cuts.push(x1);
  cuts.sort((a, b) => a - b);
  const X = (x: number) => (x - s.camX) * w;
  for (let c = 0; c < cuts.length - 1; c++) {
    const a = cuts[c], b = cuts[c + 1], fh = floorH(s, (a + b) / 2), top = sy(fh + DEPTH), trk = sy(fh), fe = Math.min(h, sy(fh - FRONT));
    const L = X(a), R = X(b) + 1;
    // 옆면 (높은 칸일수록 길다)
    if (fh > low + 0.001) {
      const bot = Math.min(h, sy(low - FRONT));
      ctx.fillStyle = lin(ctx, 0, fe, 0, bot, [0, '#c98a4b'], [1, '#a86a33']);
      ctx.fillRect(L, fe, R - L, bot - fe);
      ctx.strokeStyle = 'rgba(90,54,27,.35)';
      ctx.lineWidth = 1;
      for (let yy = fe + w * 0.03; yy < bot; yy += w * 0.03) {
        ctx.beginPath();
        ctx.moveTo(L, yy);
        ctx.lineTo(R, yy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(90,54,27,.5)';
      ctx.fillRect(R - 2, fe, 2, bot - fe);
    }
    ctx.fillStyle = lin(ctx, 0, top, 0, fe, [0, P.floor[0]], [0.4, P.floor[1]], [1, P.floor[3]]);
    ctx.fillRect(L, top, R - L, fe - top);
    // 널빤지 줄 (뒤 → 앞으로 넓어진다)
    const rows = [0, 0.16, 0.36, 0.62, 1.0, 1.45, 2.4];
    for (let r = 0; r < rows.length - 1; r++) {
      const ya = top + (trk - top) * rows[r], yb = Math.min(fe, top + (trk - top) * rows[r + 1]);
      if (ya >= fe) break;
      const pf = 0.9 + r * 0.06, sp = 0.36, off = r * 0.13;
      ctx.fillStyle = r % 2 ? 'rgba(255,255,255,.07)' : 'rgba(120,70,20,.05)';
      ctx.fillRect(L, ya, R - L, yb - ya);
      ctx.strokeStyle = P.seam;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(L, yb);
      ctx.lineTo(R, yb);
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      const cs = s.camX * pf;
      for (let k = Math.floor((cs + (a - s.camX) - off) / sp) - 1; k < (cs + (b - s.camX) - off) / sp + 1; k++) {
        const xs = (k * sp + off - cs) * w;
        if (xs < L || xs > R) continue;
        ctx.beginPath();
        ctx.moveTo(xs, ya);
        ctx.lineTo(xs - (yb - ya) * 0.15, yb);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(150,90,40,.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const gy = ya + (yb - ya) * (0.35 + hsh(k * 7 + r) * 0.3);
        ctx.moveTo(xs + w * 0.03, gy);
        ctx.bezierCurveTo(xs + w * 0.1, gy - (yb - ya) * 0.2, xs + w * 0.16, gy + (yb - ya) * 0.2, xs + w * 0.26, gy);
        ctx.stroke();
        ctx.strokeStyle = P.seam;
        ctx.lineWidth = 1.2;
      }
      ctx.globalAlpha = 1;
    }
    // 뒤 가장자리 그늘 · 앞 모서리 빛
    ctx.fillStyle = lin(ctx, 0, top, 0, top + w * 0.03, [0, 'rgba(120,70,20,.22)'], [1, 'rgba(120,70,20,0)']);
    ctx.fillRect(L, top, R - L, w * 0.03);
    if (fh > low + 0.001) {
      ctx.fillStyle = '#ffe2b0';
      ctx.fillRect(L, fe - 2, R - L, 3);
    }
    // 계단 칸 앞의 그늘 (한 칸 내려간 곳)
    if (c > 0 && floorH(s, a - 0.001) > fh + 0.001) {
      ctx.fillStyle = lin(ctx, L, 0, L + w * 0.04, 0, [0, 'rgba(120,70,20,.3)'], [1, 'rgba(120,70,20,0)']);
      ctx.fillRect(L, top, w * 0.04, fe - top);
    }
  }
}

// ── 부서지는 것들: 0 머그컵·그릇 탑 · 1 시리얼 상자 · 2 블록 성 ──
const MUG = ['#ff8fab', '#7fd8be', '#ffd166', '#8ecae6', '#c3a6ff'];
const BOX = [['#ff6b6b', '#ffd43b'], ['#4dabf7', '#ffffff'], ['#69db7c', '#ff922b'], ['#ffa94d', '#ff6b6b']];
const BLK = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'];

/** 탑 조각 하나 (cx, 바닥 cy 기준) — 부서진 조각에도 쓴다 */
function drawPiece(ctx: C2, look: number, kind: number, col: number, cx: number, by: number, pw: number, ph: number) {
  ctx.lineWidth = Math.max(1.2, pw * 0.05);
  ctx.strokeStyle = OUT;
  if (look === 0) {
    const c = MUG[col % MUG.length];
    if (kind % 3 === 0) {
      // 그릇
      ctx.fillStyle = lin(ctx, cx - pw / 2, 0, cx + pw / 2, 0, [0, '#ffffff'], [0.4, c], [1, shade(c, -0.18)]);
      ctx.beginPath();
      ctx.moveTo(cx - pw / 2, by - ph);
      ctx.quadraticCurveTo(cx - pw * 0.45, by, cx - pw * 0.2, by);
      ctx.lineTo(cx + pw * 0.2, by);
      ctx.quadraticCurveTo(cx + pw * 0.45, by, cx + pw / 2, by - ph);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(c, 0.25);
      ell(ctx, cx, by - ph, pw / 2, ph * 0.18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let q = 0; q < 3; q++) (ell(ctx, cx - pw * 0.25 + q * pw * 0.25, by - ph * 0.45, pw * 0.04, pw * 0.04), ctx.fill());
    } else {
      // 머그컵
      const mw = pw * 0.78;
      ctx.beginPath();
      ctx.arc(cx + mw / 2, by - ph * 0.5, ph * 0.26, -1.3, 1.3);
      ctx.lineWidth = Math.max(2, pw * 0.09);
      ctx.strokeStyle = OUT;
      ctx.stroke();
      ctx.lineWidth = Math.max(1, pw * 0.05);
      ctx.strokeStyle = c;
      ctx.stroke();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1.2, pw * 0.05);
      ctx.fillStyle = lin(ctx, cx - mw / 2, 0, cx + mw / 2, 0, [0, shade(c, 0.3)], [0.35, c], [1, shade(c, -0.2)]);
      rr(ctx, cx - mw / 2, by - ph, mw, ph, mw * 0.14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(c, -0.3);
      ell(ctx, cx, by - ph, mw / 2, ph * 0.13);
      ctx.fill();
      ctx.stroke();
      // 무늬: 하트 · 줄 · 점
      ctx.fillStyle = '#ffffff';
      if (kind % 3 === 1) (heartPath(ctx, cx, by - ph * 0.5, mw * 0.14), ctx.fill());
      else ctx.fillRect(cx - mw / 2 + 2, by - ph * 0.6, mw - 4, ph * 0.12);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(cx - mw * 0.36, by - ph * 0.85, mw * 0.08, ph * 0.6);
    }
  } else if (look === 1) {
    const [c, d] = BOX[col % BOX.length], dd = pw * 0.14;
    // 윗면 · 옆면 (3/4)
    ctx.fillStyle = shade(c, 0.25);
    ctx.beginPath();
    ctx.moveTo(cx - pw / 2, by - ph);
    ctx.lineTo(cx - pw / 2 + dd, by - ph - dd * 0.7);
    ctx.lineTo(cx + pw / 2 + dd, by - ph - dd * 0.7);
    ctx.lineTo(cx + pw / 2, by - ph);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(c, -0.25);
    ctx.beginPath();
    ctx.moveTo(cx + pw / 2, by - ph);
    ctx.lineTo(cx + pw / 2 + dd, by - ph - dd * 0.7);
    ctx.lineTo(cx + pw / 2 + dd, by - dd * 0.7);
    ctx.lineTo(cx + pw / 2, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = lin(ctx, cx - pw / 2, 0, cx + pw / 2, 0, [0, shade(c, 0.12)], [1, c]);
    ctx.fillRect(cx - pw / 2, by - ph, pw, ph);
    ctx.strokeRect(cx - pw / 2, by - ph, pw, ph);
    // 앞면 그림: 웃는 해 · 별 조각
    ctx.fillStyle = d;
    ell(ctx, cx, by - ph * 0.5, pw * 0.24, pw * 0.24);
    ctx.fill();
    ctx.fillStyle = 'rgba(90,54,27,.8)';
    ell(ctx, cx - pw * 0.08, by - ph * 0.54, pw * 0.025, pw * 0.03);
    ctx.fill();
    ell(ctx, cx + pw * 0.08, by - ph * 0.54, pw * 0.025, pw * 0.03);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,54,27,.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, by - ph * 0.47, pw * 0.08, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(cx - pw * 0.42, by - ph * 0.92, pw * 0.84, ph * 0.13);
    ctx.fillStyle = c;
    ctx.fillRect(cx - pw * 0.3, by - ph * 0.88, pw * 0.6, ph * 0.05);
  } else {
    const c = BLK[col % BLK.length], dd = pw * 0.16;
    ctx.fillStyle = shade(c, 0.3);
    ctx.beginPath();
    ctx.moveTo(cx - pw / 2, by - ph);
    ctx.lineTo(cx - pw / 2 + dd, by - ph - dd * 0.7);
    ctx.lineTo(cx + pw / 2 + dd, by - ph - dd * 0.7);
    ctx.lineTo(cx + pw / 2, by - ph);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(c, -0.22);
    ctx.beginPath();
    ctx.moveTo(cx + pw / 2, by - ph);
    ctx.lineTo(cx + pw / 2 + dd, by - ph - dd * 0.7);
    ctx.lineTo(cx + pw / 2 + dd, by - dd * 0.7);
    ctx.lineTo(cx + pw / 2, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (kind === 9) {
      // 지붕 (세모)
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(cx - pw / 2, by);
      ctx.lineTo(cx, by - ph);
      ctx.lineTo(cx + pw / 2, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    ctx.fillStyle = c;
    rr(ctx, cx - pw / 2, by - ph, pw, ph, pw * 0.08);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    if (kind % 2) (starPath(ctx, cx, by - ph / 2, pw * 0.26), ctx.fill());
    else (ell(ctx, cx, by - ph / 2, pw * 0.2, pw * 0.2), ctx.fill());
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(cx - pw * 0.4, by - ph * 0.9, pw * 0.12, ph * 0.7);
  }
}
/** 색 밝게(+)/어둡게(-) */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), f = (c: number) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** 탑 하나: 조각을 쌓아 그린다 (흔들림 wob) */
function drawTower(ctx: C2, tw: Tower, X: (x: number) => number, sy: (h: number) => number, w: number, wob: number, fh: number) {
  const x0 = X(tw.x), pw = tw.w * w, base = sy(fh);
  // 바닥 그림자
  ctx.fillStyle = 'rgba(120,70,20,.22)';
  ell(ctx, x0 + pw / 2 + w * 0.01, base + w * 0.006, pw * 0.62, w * 0.016);
  ctx.fill();
  ctx.save();
  ctx.translate(x0 + pw / 2, base);
  ctx.rotate(wob * 0.06);
  const H = tw.h * w;
  if (tw.look === 0) {
    const n = 5, hs = [0.22, 0.16, 0.22, 0.2, 0.2];
    let y = 0;
    for (let i = 0; i < n; i++) {
      const ph = H * hs[i], k = i === 0 || i === 2 ? 0 : i === 4 ? 1 : 2, sw = i === 0 ? 1 : i === 2 ? 0.9 : 0.78 - i * 0.03;
      drawPiece(ctx, 0, k, (tw.seed + i) % 5, Math.sin(i * 2.1 + tw.seed) * pw * 0.05 + wob * i * 1.5, -y, pw * sw, ph);
      y += ph * (k === 0 ? 0.92 : 1);
    }
  } else if (tw.look === 1) {
    const n = 3;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const ph = H / n, sw = i === 1 ? 0.86 : 1;
      drawPiece(ctx, 1, i, (tw.seed + i) % 4, (i === 1 ? -0.06 : i === 2 ? 0.04 : 0) * pw + wob * i * 1.5, -y, pw * sw * 0.86, ph * 0.94);
      y += ph;
    }
  } else {
    const bw = pw / 2, bh = H / 3.3;
    drawPiece(ctx, 2, 0, tw.seed, -bw / 2, 0, bw * 0.96, bh);
    drawPiece(ctx, 2, 1, tw.seed + 1, bw / 2, 0, bw * 0.96, bh);
    drawPiece(ctx, 2, 1, tw.seed + 2, -bw / 2 + wob, -bh, bw * 0.96, bh);
    drawPiece(ctx, 2, 0, tw.seed + 3, bw / 2 + wob, -bh, bw * 0.96, bh);
    drawPiece(ctx, 2, 0, tw.seed + 1, wob * 2, -bh * 2, bw * 1.2, bh);
    drawPiece(ctx, 2, 9, tw.seed + 2, wob * 2.5, -bh * 3, bw * 1.3, bh * 0.9);
    // 깃발
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wob * 2.5, -bh * 3.85);
    ctx.lineTo(wob * 2.5, -bh * 4.5);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(wob * 2.5, -bh * 4.5);
    ctx.lineTo(wob * 2.5 + bw * 0.45, -bh * 4.3 + Math.sin(tw.seed) * 2);
    ctx.lineTo(wob * 2.5, -bh * 4.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** 의자 (뒤쪽 다리 · 앞쪽 다리를 따로: 햄스터가 사이로 지나간다) */
function drawChair(ctx: C2, g: Gap, X: (x: number) => number, sy: (h: number) => number, w: number, part: 0 | 1, fh: number) {
  const x0 = X(g.x0), x1 = X(g.x1), seatY = sy(fh + g.c), base = sy(fh), lw = w * 0.022, dk = w * 0.03;
  const wood = (a: number, b: number) => lin(ctx, a, 0, b, 0, [0, '#e7ab69'], [1, '#c4833f']);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  if (part === 0) {
    // 그림자
    ctx.fillStyle = 'rgba(120,70,20,.18)';
    ell(ctx, (x0 + x1) / 2, base + w * 0.004, (x1 - x0) * 0.6, w * 0.02);
    ctx.fill();
    // 뒤 다리 (조금 위·어둡게)
    for (const lx of [x0 + dk, x1 - lw + dk]) {
      ctx.fillStyle = '#b8783c';
      rr(ctx, lx, seatY - dk * 0.7, lw * 0.9, base - seatY - w * 0.012, 2);
      ctx.fill();
      ctx.stroke();
    }
    // 등받이 (오른쪽)
    ctx.fillStyle = wood(x1 - lw * 1.2, x1 + lw);
    rr(ctx, x1 - lw * 1.1 + dk * 0.5, seatY - w * 0.3, lw * 1.1, w * 0.3, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = wood(x1 - w * 0.12, x1);
    for (let j = 0; j < 2; j++) {
      rr(ctx, x1 - w * 0.115 + dk * 0.5, seatY - w * (0.28 - j * 0.09), w * 0.115, w * 0.035, 4);
      ctx.fill();
      ctx.stroke();
    }
    return;
  }
  // 앉는 판 (두께) + 민트 방석
  ctx.fillStyle = '#d99a58';
  rr(ctx, x0 - w * 0.01, seatY - w * 0.028, x1 - x0 + w * 0.02, w * 0.04, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, seatY - w * 0.05, 0, seatY - w * 0.02, [0, '#c8f3e4'], [1, '#8fdcc2']);
  rr(ctx, x0 + w * 0.01, seatY - w * 0.05, x1 - x0 - w * 0.03, w * 0.03, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c4833f';
  ctx.fillRect(x0 - w * 0.008, seatY + w * 0.006, x1 - x0 + w * 0.016, w * 0.006);
  // 앞 다리 (조금 아래·밝게)
  for (const lx of [x0, x1 - lw]) {
    ctx.fillStyle = wood(lx, lx + lw);
    rr(ctx, lx, seatY + w * 0.01, lw, base - seatY + w * 0.012, 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** 소파 (긴 낮은 틈) */
function drawSofa(ctx: C2, g: Gap, X: (x: number) => number, sy: (h: number) => number, w: number, part: 0 | 1, fh: number) {
  const x0 = X(g.x0), x1 = X(g.x1), bot = sy(fh + g.c), base = sy(fh), dk = w * 0.035;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  if (part === 0) {
    ctx.fillStyle = 'rgba(120,70,20,.2)';
    ell(ctx, (x0 + x1) / 2, base + w * 0.004, (x1 - x0) * 0.58, w * 0.022);
    ctx.fill();
    ctx.fillStyle = '#7a4a24';
    for (const lx of [x0 + w * 0.03 + dk, x1 - w * 0.06 + dk]) (rr(ctx, lx, bot - 4, w * 0.026, base - bot - w * 0.008, 3), ctx.fill(), ctx.stroke());
    // 등받이 (뒤)
    ctx.fillStyle = lin(ctx, 0, bot - w * 0.36, 0, bot, [0, '#ffb39a'], [1, '#f2876a']);
    rr(ctx, x0 + dk * 0.5, bot - w * 0.36, x1 - x0, w * 0.26, w * 0.05);
    ctx.fill();
    ctx.stroke();
    return;
  }
  // 앉는 부분
  ctx.fillStyle = lin(ctx, 0, bot - w * 0.14, 0, bot, [0, '#ffc2ad'], [1, '#ef7f62']);
  rr(ctx, x0, bot - w * 0.13, x1 - x0, w * 0.135, w * 0.035);
  ctx.fill();
  ctx.stroke();
  // 방석 둘
  const cwid = (x1 - x0 - w * 0.12) / 2;
  for (let j = 0; j < 2; j++) {
    ctx.fillStyle = lin(ctx, 0, bot - w * 0.17, 0, bot - w * 0.1, [0, '#ffe0d4'], [1, '#ffab92']);
    rr(ctx, x0 + w * 0.06 + j * cwid, bot - w * 0.17, cwid, w * 0.07, w * 0.03);
    ctx.fill();
    ctx.stroke();
  }
  // 팔걸이
  for (const ax of [x0 - w * 0.02, x1 - w * 0.06]) {
    ctx.fillStyle = lin(ctx, 0, bot - w * 0.22, 0, bot, [0, '#ffc2ad'], [1, '#e8765a']);
    rr(ctx, ax, bot - w * 0.22, w * 0.08, w * 0.225, w * 0.035);
    ctx.fill();
    ctx.stroke();
  }
  // 앞 다리
  ctx.fillStyle = '#9a6234';
  for (const lx of [x0 + w * 0.01, x1 - w * 0.04]) (rr(ctx, lx, bot - 2, w * 0.028, base - bot + w * 0.008, 3), ctx.fill(), ctx.stroke());
  // 술 장식
  ctx.fillStyle = '#fff3c4';
  for (let q = x0 + w * 0.04; q < x1 - w * 0.04; q += w * 0.035) (ell(ctx, q, bot + w * 0.006, w * 0.006, w * 0.01), ctx.fill());
}

/** 햄스터 집 (문 = 작은 틈) — part 0 집 안쪽(햄스터 뒤), 1 앞면(햄스터 앞, 문 구멍) */
function drawHouse(ctx: C2, g: Gap, X: (x: number) => number, sy: (h: number) => number, w: number, part: 0 | 1, t: number, glow: number, fh: number) {
  const L = X(g.x0) - w * 0.04, R = X(g.x0) + w * 0.42, base = sy(fh), top = sy(fh + 0.42), dw = w * 0.17, dh = g.c * w;
  const dx = X(g.x0) + w * 0.005;
  if (part === 0) {
    ctx.fillStyle = 'rgba(120,70,20,.25)';
    ell(ctx, (L + R) / 2, base + w * 0.006, (R - L) * 0.62, w * 0.024);
    ctx.fill();
    ctx.fillStyle = '#6b3d1c';
    rr(ctx, dx, base - dh, dw, dh, dw * 0.5);
    ctx.fill();
    return;
  }
  ctx.save();
  // 앞면 (문 구멍을 뚫는다)
  ctx.beginPath();
  ctx.rect(L, top, R - L, base - top);
  ctx.roundRect(dx + dw, base - dh, -dw, dh, [dw * 0.5, dw * 0.5, 0, 0]);
  ctx.fillStyle = lin(ctx, L, 0, R, 0, [0, '#ffd99a'], [1, '#f2b76a']);
  ctx.fill('evenodd');
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  // 판자 결
  ctx.strokeStyle = 'rgba(170,110,50,.45)';
  ctx.lineWidth = 1.2;
  for (let y = top + w * 0.05; y < base - 4; y += w * 0.055) {
    ctx.beginPath();
    ctx.moveTo(y > base - dh ? dx + dw + 3 : L + 3, y);
    ctx.lineTo(R - 3, y);
    ctx.stroke();
  }
  // 지붕
  ctx.fillStyle = lin(ctx, 0, top - w * 0.2, 0, top, [0, '#ff8a7a'], [1, '#e8604f']);
  ctx.beginPath();
  ctx.moveTo(L - w * 0.05, top + w * 0.01);
  ctx.lineTo((L + R) / 2, top - w * 0.2);
  ctx.lineTo(R + w * 0.05, top + w * 0.01);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(L - w * 0.05 + k * w * 0.05, top + w * 0.01 - k * w * 0.042);
    ctx.lineTo(R + w * 0.05 - k * w * 0.05, top + w * 0.01 - k * w * 0.042);
    ctx.stroke();
  }
  // 둥근 창 (불이 켜진다)
  const wx = R - w * 0.11, wy = top + w * 0.11;
  ctx.fillStyle = glow > 0 ? `rgba(255,236,150,${0.6 + 0.4 * glow})` : '#9fdcff';
  ell(ctx, wx, wy, w * 0.045, w * 0.045);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (glow > 0) {
    ctx.fillStyle = '#ff6b8a';
    heartPath(ctx, wx, wy, w * 0.018 * (1 + 0.15 * Math.sin(t * 0.3)));
    ctx.fill();
  }
  // 문틀 · 문패
  ctx.strokeStyle = '#c98a4b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(dx - 2, base - dh - 2, dw + 4, dh + 2, [dw * 0.5 + 2, dw * 0.5 + 2, 0, 0]);
  ctx.stroke();
  ctx.fillStyle = '#fff5dc';
  rr(ctx, dx + dw + w * 0.02, top + w * 0.2, w * 0.13, w * 0.06, 4);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b5652a';
  ctx.font = `900 ${Math.max(12, w * 0.036)}px system-ui, sans-serif`;
  ctx.fillText('집', dx + dw + w * 0.085, top + w * 0.232);
  // 해바라기 화분
  const fx = R + w * 0.02;
  ctx.strokeStyle = '#4caf50';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx, base);
  ctx.lineTo(fx, base - w * 0.2);
  ctx.stroke();
  ctx.fillStyle = '#ffcf3f';
  for (let q = 0; q < 10; q++) (ell(ctx, fx + Math.cos(q * 0.628 + t * 0.01) * w * 0.03, base - w * 0.2 + Math.sin(q * 0.628 + t * 0.01) * w * 0.03, w * 0.016, w * 0.009, q * 0.628 + t * 0.01), ctx.fill());
  ctx.fillStyle = '#8a5a2b';
  ell(ctx, fx, base - w * 0.2, w * 0.018, w * 0.018);
  ctx.fill();
  ctx.restore();
}

/** 선풍기 (뒤쪽에 서서 왼쪽으로 분다) + 바람 줄 */
function drawFan(ctx: C2, z: Zone, X: (x: number) => number, sy: (h: number) => number, w: number, t: number, fh: number) {
  const fx = X(z.x1) + w * 0.12, base = sy(fh + DEPTH * 0.55), hy = sy(fh + 0.4), r = w * 0.15;
  // 받침 · 기둥
  ctx.fillStyle = 'rgba(120,70,20,.2)';
  ell(ctx, fx, base + 3, w * 0.11, w * 0.02);
  ctx.fill();
  ctx.fillStyle = lin(ctx, fx - w * 0.1, 0, fx + w * 0.1, 0, [0, '#f1fffa'], [1, '#8fd6be']);
  ell(ctx, fx, base, w * 0.1, w * 0.026);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = lin(ctx, fx - w * 0.015, 0, fx + w * 0.015, 0, [0, '#f1fffa'], [1, '#a9e3cf']);
  rr(ctx, fx - w * 0.016, hy, w * 0.032, base - hy, 4);
  ctx.fill();
  ctx.stroke();
  // 뒤 모터
  ctx.fillStyle = lin(ctx, 0, hy - r * 0.35, 0, hy + r * 0.35, [0, '#e6fbf3'], [1, '#9fdcc6']);
  ell(ctx, fx + r * 0.42, hy, r * 0.3, r * 0.34);
  ctx.fill();
  ctx.stroke();
  // 머리 (왼쪽을 본다: 타원) — 도는 날개
  ctx.fillStyle = 'rgba(230,250,244,.7)';
  ell(ctx, fx, hy, r * 0.42, r);
  ctx.fill();
  ctx.save();
  ell(ctx, fx, hy, r * 0.42, r);
  ctx.clip();
  for (let k = 0; k < 4; k++) {
    const a = t * 0.8 + (k * TAU) / 4;
    ctx.fillStyle = k % 2 ? 'rgba(255,170,150,.75)' : 'rgba(126,216,190,.75)';
    ell(ctx, fx + Math.cos(a) * r * 0.18, hy + Math.sin(a) * r * 0.48, r * 0.16, r * 0.44, a);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#6cc6a8';
  ctx.lineWidth = 3;
  ell(ctx, fx, hy, r * 0.42, r);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(108,198,168,.8)';
  ctx.lineWidth = 1.2;
  for (let k = -3; k <= 3; k++) {
    const yy = Math.sqrt(Math.max(0, 1 - (k / 3.4) ** 2));
    ctx.beginPath();
    ctx.moveTo(fx + (k * r * 0.42) / 3.4, hy - r * yy);
    ctx.lineTo(fx + (k * r * 0.42) / 3.4, hy + r * yy);
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ell(ctx, fx, hy, r * 0.47, r * 1.06);
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ell(ctx, fx - r * 0.04, hy, r * 0.1, r * 0.15);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
/** 바람 줄: 선풍기 앞(센 바람)은 굵고 많게, 방을 가로질러 멀리까지 옅게 */
function drawWind(ctx: C2, z: Zone, X: (x: number) => number, sy: (h: number) => number, w: number, t: number, fh: number) {
  const b = X(z.x1) + w * 0.06, far = X(z.x1 - WIND_L), strong = X(z.x0);
  ctx.lineCap = 'round';
  for (let k = 0; k < 16; k++) {
    const sp = b - far + w * 0.2, u = ((t * (4.5 + (k % 4)) + hsh(k * 3) * sp * 9) % sp) / sp, x = b - u * sp;
    const near = x > strong ? 1 : 0.6, hy = sy(fh + 0.03 + (k % 6) * 0.075 + hsh(k) * 0.03) + Math.sin(t * 0.15 + k) * 3;
    const len = w * (0.07 + 0.06 * hsh(k + 9)) * (near > 0.5 ? 1.4 : 1), a = Math.sin(u * Math.PI) * near;
    ctx.strokeStyle = `rgba(110,190,235,${0.8 * a})`;
    ctx.lineWidth = near > 0.5 ? 4.5 : 3;
    ctx.beginPath();
    ctx.moveTo(x, hy);
    ctx.quadraticCurveTo(x + len * 0.5, hy - 4 * Math.sin(t * 0.2 + k), x + len, hy);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * a})`;
    ctx.lineWidth = near > 0.5 ? 2 : 1.4;
    ctx.stroke();
    if (k % 4 === 0) {
      ctx.fillStyle = `rgba(110,200,100,${0.95 * a})`;
      ell(ctx, x - 5, hy + 5 * Math.sin(t * 0.3 + k), 4.5, 2.4, t * 0.3 + k);
      ctx.fill();
    }
  }
}

/** 잼 웅덩이 + 넘어진 잼 병 */
function drawJam(ctx: C2, z: Zone, X: (x: number) => number, sy: (h: number) => number, w: number, t: number, fh: number) {
  const a = X(z.x0), b = X(z.x1), y = sy(fh), dy = (sy(fh) - sy(fh + DEPTH)) * 0.7;
  ctx.fillStyle = 'rgba(160,20,60,.25)';
  ell(ctx, (a + b) / 2, y + dy * 0.2, (b - a) * 0.55, dy * 0.9);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y - dy, 0, y + dy, [0, '#ff6f9a'], [1, '#c2185b']);
  ctx.beginPath();
  const n = 10, cxj = (a + b) / 2;
  const pt = (i: number) => {
    const ang = (i / n) * TAU, rx = ((b - a) / 2) * (0.95 + 0.07 * Math.sin(i * 2.7)), ry = dy * 0.7 * (0.9 + 0.12 * Math.cos(i * 1.9));
    return [cxj + Math.cos(ang) * rx, y + Math.sin(ang) * ry];
  };
  for (let i = 0; i < n; i++) {
    const p0 = pt(i), p1 = pt(i + 1), mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo((pt(n - 1)[0] + p0[0]) / 2, (pt(n - 1)[1] + p0[1]) / 2);
    ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a1040';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ell(ctx, a + (b - a) * 0.32, y - dy * 0.3, (b - a) * 0.12, dy * 0.12, -0.2);
  ctx.fill();
  ell(ctx, a + (b - a) * 0.62, y + dy * 0.1, (b - a) * 0.05, dy * 0.07);
  ctx.fill();
  // 딸기 조각
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = '#ff2e63';
    ell(ctx, a + (b - a) * (0.25 + k * 0.25), y + dy * (k % 2 ? -0.2 : 0.25), w * 0.012, w * 0.009);
    ctx.fill();
  }
  // 거품 (끈적)
  const bb = (t * 0.02) % 1;
  ctx.strokeStyle = `rgba(255,220,235,${1 - bb})`;
  ctx.lineWidth = 1.2;
  ell(ctx, a + (b - a) * 0.7, y - dy * 0.2, 2 + bb * 5, 2 + bb * 4);
  ctx.stroke();
  // 넘어진 잼 병 (뒤쪽)
  const jx = a - w * 0.01, jy = sy(fh + DEPTH * 0.6);
  ctx.save();
  ctx.translate(jx, jy);
  ctx.rotate(-1.35);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  rr(ctx, -w * 0.03, -w * 0.07, w * 0.06, w * 0.07, w * 0.012);
  ctx.fill();
  ctx.fillStyle = '#e8336d';
  rr(ctx, -w * 0.026, -w * 0.04, w * 0.052, w * 0.038, w * 0.008);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  rr(ctx, -w * 0.034, -w * 0.084, w * 0.068, w * 0.016, 2);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  rr(ctx, -w * 0.03, -w * 0.07, w * 0.06, w * 0.07, w * 0.012);
  ctx.stroke();
  ctx.restore();
}

/** 청소기 로봇 */
function drawVac(ctx: C2, v: Vac, X: (x: number) => number, sy: (h: number) => number, w: number, t: number, fh: number) {
  const cx = X(v.x), base = sy(fh), rx = VR * w, hh = w * 0.06, flip = v.st === 2;
  ctx.fillStyle = 'rgba(120,70,20,.22)';
  ell(ctx, cx, base + 2, rx * 1.05, w * 0.016);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, base - hh * 0.5);
  if (v.st === 1) ctx.rotate(Math.sin(t * 0.9) * 0.12);
  if (flip) ctx.scale(1, -1);
  // 옆면
  ctx.fillStyle = lin(ctx, 0, -hh / 2, 0, hh / 2, [0, '#6b7785'], [1, '#3d4752']);
  rr(ctx, -rx, -hh * 0.3, rx * 2, hh * 0.8, hh * 0.35);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // 윗면
  ctx.fillStyle = lin(ctx, 0, -hh, 0, 0, [0, '#ffffff'], [1, '#bff0dc']);
  ell(ctx, 0, -hh * 0.3, rx, hh * 0.55);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fe3cb';
  ell(ctx, rx * 0.1, -hh * 0.38, rx * 0.35, hh * 0.22);
  ctx.fill();
  // 눈 (LED)
  const look = v.st === 3 ? 0 : v.dir;
  ctx.fillStyle = v.st === 3 ? '#ff5a5f' : v.st === 2 ? '#ffd166' : '#3ad4ff';
  for (const ex of [-0.18, 0.18]) {
    if (v.st === 2) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rx * (ex + look * 0.25) - 3, hh * 0.1 - 3);
      ctx.lineTo(rx * (ex + look * 0.25) + 3, hh * 0.1 + 3);
      ctx.moveTo(rx * (ex + look * 0.25) + 3, hh * 0.1 - 3);
      ctx.lineTo(rx * (ex + look * 0.25) - 3, hh * 0.1 + 3);
      ctx.stroke();
    } else (ell(ctx, rx * (ex + look * 0.25), hh * 0.12, w * 0.008, w * 0.006), ctx.fill());
  }
  // 옆 솔
  ctx.strokeStyle = '#ffb13b';
  ctx.lineWidth = 1.4;
  const bxp = rx * 0.85 * (v.dir || 1);
  for (let k = 0; k < 3; k++) {
    const a = t * 0.5 + (k * TAU) / 3;
    ctx.beginPath();
    ctx.moveTo(bxp, hh * 0.45);
    ctx.lineTo(bxp + Math.cos(a) * w * 0.022, hh * 0.45 + Math.sin(a) * w * 0.006);
    ctx.stroke();
  }
  ctx.restore();
  if (v.st === 1) {
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) {
      const ly = base - hh * (0.2 + k * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx + rx * 1.1, ly);
      ctx.lineTo(cx + rx * 1.1 + w * 0.08, ly);
      ctx.stroke();
    }
  }
  if (v.st === 3) {
    // 빨아들이는 소용돌이
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a0 = t * 0.4 + k * 2.1;
      ctx.beginPath();
      ctx.arc(cx, base - hh, w * (0.03 + k * 0.02), a0, a0 + 2.2);
      ctx.stroke();
    }
  }
}

/** 강아지 (서 있음 · 펄쩍 · 달림 · 엎드림) */
function drawDog(ctx: C2, dg: Dog, X: (x: number) => number, sy: (h: number) => number, w: number, t: number, fh: number, sniff: number) {
  if (dg.st === 4 && dg.t > 60) return;
  const x0 = X(dg.x), base = sy(fh), L = DOG_L * w, belly = DOG_C * w;
  const jump = dg.st === 1 ? Math.sin((dg.t / 26) * Math.PI) * w * 0.32 : 0, run = dg.st === 2 || dg.st === 4, lie = dg.st === 3;
  const face = run || dg.st === 1 ? -1 : 1;
  ctx.fillStyle = 'rgba(120,70,20,.22)';
  ell(ctx, x0 + L / 2, base + 2, L * 0.5 * (1 - jump / (w * 0.6)), w * 0.02);
  ctx.fill();
  ctx.save();
  ctx.translate(x0 + L / 2, base - jump);
  if (face < 0) ctx.scale(-1, 1);
  const cy = lie ? -belly * 0.45 : -belly - w * 0.07, step = run ? Math.sin(t * 0.7) : 0;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  // 다리
  if (!lie) {
    for (const [lx, ph] of [[-0.32, 0], [-0.2, 1], [0.22, 1], [0.34, 0]] as [number, number][]) {
      const sw = (ph ? 1 : -1) * step * w * 0.03;
      ctx.fillStyle = ph ? '#f3e2c8' : '#fff6e8';
      const legH = dg.st === 1 ? w * 0.1 : -cy;
      rr(ctx, lx * L - w * 0.018 + sw, cy, w * 0.036, legH, w * 0.016);
      ctx.fill();
      ctx.stroke();
    }
  }
  // 꼬리
  const wag = Math.sin(t * (lie ? 0.6 : 0.35)) * 0.6;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-L * 0.42, cy - w * 0.02);
  ctx.quadraticCurveTo(-L * 0.6, cy - w * 0.08, -L * 0.55 + wag * w * 0.04, cy - w * 0.15);
  ctx.stroke();
  ctx.strokeStyle = '#fff6e8';
  ctx.lineWidth = w * 0.018;
  ctx.stroke();
  // 몸
  ctx.fillStyle = radg(ctx, -L * 0.1, cy - w * 0.06, 0, L * 0.6, [0, '#fffdf8'], [1, '#f1dcc0']);
  ell(ctx, 0, cy, L * 0.46, w * 0.085);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#d9a066';
  ell(ctx, -L * 0.12, cy - w * 0.04, L * 0.16, w * 0.045, 0.2);
  ctx.fill();
  // 머리
  const hx = L * 0.42, hy = cy - w * 0.1 + (sniff > 0 ? w * 0.06 * sniff : 0) + (lie ? w * 0.04 : 0);
  ctx.fillStyle = radg(ctx, hx - w * 0.02, hy - w * 0.03, 0, w * 0.1, [0, '#fffdf8'], [1, '#f1dcc0']);
  ell(ctx, hx, hy, w * 0.085, w * 0.075);
  ctx.fill();
  ctx.stroke();
  // 주둥이 · 코 · 혀
  ctx.fillStyle = '#fff6e8';
  ell(ctx, hx + w * 0.06, hy + w * 0.025, w * 0.045, w * 0.032);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a1a10';
  ell(ctx, hx + w * 0.1, hy + w * 0.012, w * 0.016, w * 0.012);
  ctx.fill();
  if (!run || lie) {
    ctx.fillStyle = '#ff7a8a';
    rr(ctx, hx + w * 0.055, hy + w * 0.045, w * 0.022, w * 0.03 + Math.abs(Math.sin(t * 0.2)) * w * 0.006, w * 0.01);
    ctx.fill();
  }
  // 눈
  ctx.fillStyle = '#2a1a10';
  if (dg.st === 1) {
    ctx.fillStyle = '#ffffff';
    ell(ctx, hx + w * 0.025, hy - w * 0.02, w * 0.02, w * 0.022);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a1a10';
    ell(ctx, hx + w * 0.03, hy - w * 0.02, w * 0.007, w * 0.008);
    ctx.fill();
  } else if (lie) {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(hx + w * 0.025, hy - w * 0.015, w * 0.012, Math.PI + 0.3, -0.3);
    ctx.stroke();
  } else {
    ell(ctx, hx + w * 0.025, hy - w * 0.018, w * 0.011, w * 0.013);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, hx + w * 0.029, hy - w * 0.023, w * 0.004, w * 0.004);
    ctx.fill();
  }
  // 늘어진 귀
  const flapE = run ? Math.sin(t * 0.7) * 0.4 : dg.st === 1 ? -0.9 : 0;
  ctx.fillStyle = '#c98a4b';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.save();
  ctx.translate(hx - w * 0.035, hy - w * 0.05);
  ctx.rotate(0.5 + flapE);
  ell(ctx, 0, w * 0.04, w * 0.026, w * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** 해바라기씨 (k: 0 바닥 · 1 공중 · 2 틈 안) */
function drawSeed(ctx: C2, x: number, y: number, r: number, rot: number, glow: number) {
  if (glow > 0) {
    ctx.fillStyle = radg(ctx, x, y, 0, r * 2.6, [0, `rgba(255,236,120,${0.55 * glow})`], [1, 'rgba(255,236,120,0)']);
    ell(ctx, x, y, r * 2.6, r * 2.6);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#3b3640';
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.2);
  ctx.quadraticCurveTo(r * 0.85, -r * 0.2, 0, r);
  ctx.quadraticCurveTo(-r * 0.85, -r * 0.2, 0, -r * 1.2);
  ctx.fill();
  ctx.strokeStyle = '#f4efe3';
  ctx.lineWidth = Math.max(1, r * 0.16);
  for (const dx of [-0.28, 0, 0.28]) {
    ctx.beginPath();
    ctx.moveTo(dx * r * 0.7, -r * 0.85);
    ctx.lineTo(dx * r, r * 0.7);
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.2);
  ctx.quadraticCurveTo(r * 0.85, -r * 0.2, 0, r);
  ctx.quadraticCurveTo(-r * 0.85, -r * 0.2, 0, -r * 1.2);
  ctx.stroke();
  ctx.restore();
}

/** 햄스터 표정: 0 달림 · 1 힘줌(부푸는 중) · 2 빵빵 · 3 어질 · 4 끼임 · 5 와장창 · 6 날아감 · 7 집에 옴 · 8 잡힘 */
interface HamLook { sz: number; mood: number; t: number; run: number; squash: number; wob: number; blink: boolean; sweat: boolean }
function drawHamster(ctx: C2, cx: number, cy: number, R: number, F: number, o: HamLook) {
  const big = o.sz, t = o.t;
  let sx = 1.06 - 0.06 * big + o.squash * 0.18, sy2 = 0.95 + 0.05 * big - o.squash * 0.12;
  sx *= 1 + o.wob;
  sy2 *= 1 - o.wob * 0.7;
  const rx = R * sx, ry = R * sy2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 발 (뒤쪽)
  const pawC = '#ffb3a6', foot = cy + ry * 0.92;
  const pr = F * 0.17;
  const stepA = Math.sin(o.run), stepB = Math.sin(o.run + Math.PI);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.4, F * 0.06);
  if (o.mood !== 6) {
    ctx.fillStyle = shade('#ffb3a6', -0.1);
    ell(ctx, cx - rx * 0.35 + stepB * F * 0.18, foot - Math.max(0, stepA) * F * 0.08, pr * 1.25, pr * 0.8);
    ctx.fill();
    ctx.stroke();
    ell(ctx, cx + rx * 0.35 + stepA * F * 0.18, foot - Math.max(0, stepB) * F * 0.08, pr * 1.25, pr * 0.8);
    ctx.fill();
    ctx.stroke();
  }
  // 꼬리
  ctx.fillStyle = '#f2b062';
  ell(ctx, cx - rx * 0.98, cy + ry * 0.15, F * 0.12, F * 0.09);
  ctx.fill();
  ctx.stroke();
  // 몸
  ctx.fillStyle = radg(ctx, cx - rx * 0.35, cy - ry * 0.45, R * 0.05, R * 1.25, [0, '#ffe3ad'], [0.45, '#f8b968'], [1, '#d9893a']);
  ell(ctx, cx, cy, rx, ry);
  ctx.fill();
  ctx.save();
  ell(ctx, cx, cy, rx, ry);
  ctx.clip();
  // 등 무늬 (굴러가면 돈다)
  ctx.fillStyle = 'rgba(196,112,40,.55)';
  const rot = big > 0.4 ? o.run * 0.15 : 0;
  ell(ctx, cx - rx * 0.35 + Math.cos(rot) * rx * 0.1, cy - ry * 0.6, rx * 0.55, ry * 0.32, -0.35);
  ctx.fill();
  // 배 (크림색)
  ctx.fillStyle = '#fff4de';
  ell(ctx, cx + rx * 0.38, cy + ry * 0.42, rx * 0.62, ry * 0.5, -0.2);
  ctx.fill();
  // 빵빵할 때 반짝 (풍선처럼)
  if (big > 0.4) {
    ctx.fillStyle = `rgba(255,255,255,${0.45 * big})`;
    ell(ctx, cx - rx * 0.42, cy - ry * 0.5, rx * 0.22, ry * 0.1, -0.6);
    ctx.fill();
    ell(ctx, cx - rx * 0.62, cy - ry * 0.25, rx * 0.06, ry * 0.05);
    ctx.fill();
    // 늘어난 털 줄
    ctx.strokeStyle = `rgba(196,112,40,${0.35 * big})`;
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(cx - rx * 0.1, cy + ry * 0.05, rx * (0.75 + k * 0.08), 2.4 + k * 0.1, 2.9 + k * 0.1);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.8, F * 0.075);
  ell(ctx, cx, cy, rx, ry);
  ctx.stroke();
  // 얼굴 자리
  const fx = cx + rx * (0.52 - 0.05 * big), fy = cy - ry * (0.18 + 0.08 * big);
  // 귀
  const earBack = o.mood === 0 ? 0.5 : o.mood === 6 ? 1 : 0;
  for (const [ex, ey, er, a] of [[-0.62, -0.95, 0.24, -0.4], [-0.05, -1.02, 0.27, 0.2]] as number[][]) {
    const px = fx + ex * F - earBack * F * 0.15, py = fy + ey * F * (1 + big * 0.1);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a - earBack * 0.6);
    ctx.fillStyle = '#f2a957';
    ell(ctx, 0, 0, er * F, er * F * 1.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb3b8';
    ell(ctx, er * F * 0.1, er * F * 0.1, er * F * 0.55, er * F * 0.6);
    ctx.fill();
    ctx.restore();
  }
  // 볼주머니 (빵빵하면 터질 듯)
  const ck = 0.28 + 0.16 * big + (o.mood === 1 ? 0.08 : 0);
  ctx.fillStyle = '#fff4de';
  ell(ctx, fx + F * 0.15, fy + F * 0.42, F * ck * 1.25, F * ck);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,54,27,.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = `rgba(255,120,130,${0.45 + 0.3 * big})`;
  ell(ctx, fx + F * 0.05, fy + F * 0.38, F * 0.15, F * 0.09);
  ctx.fill();
  ell(ctx, fx - F * 0.62, fy + F * 0.3, F * 0.11, F * 0.07);
  ctx.fill();
  // 눈
  const eyes: [number, number, number][] = [[-0.42, -0.12, 0.8], [0.12, -0.12, 1]];
  ctx.strokeStyle = '#2a1a10';
  ctx.fillStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.6, F * 0.08);
  for (const [ex, ey, k] of eyes) {
    const x = fx + ex * F, y = fy + ey * F, er = F * 0.15 * k;
    if (o.mood === 1 || o.mood === 4 || o.mood === 5) {
      // > <  꽉 감은 눈
      const sgn = ex < 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x - er * sgn, y - er);
      ctx.lineTo(x + er * sgn * 0.8, y);
      ctx.lineTo(x - er * sgn, y + er);
      ctx.stroke();
    } else if (o.mood === 3 || o.mood === 6) {
      // 빙글 눈
      ctx.beginPath();
      for (let a = 0; a < 9; a++) {
        const q = a * 0.8 + t * 0.3, rr2 = er * (a / 9) * 1.2;
        if (a) ctx.lineTo(x + Math.cos(q) * rr2, y + Math.sin(q) * rr2);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    } else if (o.mood === 7) {
      ctx.beginPath();
      ctx.arc(x, y + er * 0.4, er, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else if (o.mood === 8) {
      ctx.beginPath();
      ctx.moveTo(x - er, y - er * 0.2);
      ctx.lineTo(x + er, y - er * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#7fd3ff';
      ell(ctx, x + er * 0.3, y + er * 0.9 + (t % 30) * 0.15, er * 0.35, er * 0.55);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
    } else if (o.blink) {
      ctx.beginPath();
      ctx.moveTo(x - er, y);
      ctx.lineTo(x + er, y);
      ctx.stroke();
    } else {
      // 빵빵하면 눈이 동그래지고 눈동자가 작아진다
      const wide = big > 0.5 ? 1.35 : 1;
      ctx.fillStyle = big > 0.5 ? '#ffffff' : '#2a1a10';
      ell(ctx, x, y, er * wide, er * 1.12 * wide);
      ctx.fill();
      if (big > 0.5) {
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#2a1a10';
        ell(ctx, x + er * 0.25, y, er * 0.45, er * 0.5);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ell(ctx, x + er * 0.35, y - er * 0.4, er * 0.32, er * 0.32);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
      ctx.strokeStyle = '#2a1a10';
    }
  }
  // 코 · 입
  ctx.fillStyle = '#ff8fa3';
  ell(ctx, fx + F * 0.5, fy + F * 0.12, F * 0.09, F * 0.07);
  ctx.fill();
  ctx.strokeStyle = '#6b3d1c';
  ctx.lineWidth = Math.max(1.2, F * 0.05);
  ctx.beginPath();
  if (o.mood === 5 || o.mood === 7) {
    ctx.fillStyle = '#c0394b';
    ctx.moveTo(fx + F * 0.22, fy + F * 0.25);
    ctx.quadraticCurveTo(fx + F * 0.38, fy + F * 0.55, fx + F * 0.52, fy + F * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (o.mood === 2 || o.mood === 1) {
    ctx.moveTo(fx + F * 0.22, fy + F * 0.32);
    for (let k = 1; k <= 4; k++) ctx.lineTo(fx + F * (0.22 + k * 0.07), fy + F * (0.32 + (k % 2 ? -0.04 : 0.03)));
    ctx.stroke();
  } else if (o.mood === 0 || o.mood === 6) {
    ctx.fillStyle = '#c0394b';
    ell(ctx, fx + F * 0.38, fy + F * 0.32, F * 0.07, F * 0.08);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.moveTo(fx + F * 0.3, fy + F * 0.28);
    ctx.quadraticCurveTo(fx + F * 0.38, fy + F * 0.33, fx + F * 0.46, fy + F * 0.28);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(90,54,27,.6)';
  ctx.lineWidth = 1;
  for (const dy of [-0.06, 0.06]) {
    ctx.beginPath();
    ctx.moveTo(fx + F * 0.55, fy + F * (0.15 + dy));
    ctx.lineTo(fx + F * 0.95, fy + F * (0.1 + dy * 2.5));
    ctx.stroke();
  }
  // 앞발 (빵빵하면 버둥)
  ctx.fillStyle = pawC;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.3, F * 0.055);
  const flail = big > 0.4 || o.mood === 6 ? Math.sin(t * 0.8) * F * 0.12 : 0;
  ell(ctx, cx + rx * 0.72, cy + ry * 0.35 - flail, pr, pr * 0.9);
  ctx.fill();
  ctx.stroke();
  ell(ctx, cx + rx * 0.55, cy + ry * 0.55 + flail, pr, pr * 0.9);
  ctx.fill();
  ctx.stroke();
  // 땀방울
  if (o.sweat) {
    const sx2 = cx - rx * 0.1, syy = cy - ry * 1.02 - Math.abs(Math.sin(t * 0.1)) * F * 0.1;
    ctx.fillStyle = '#8fd8ff';
    ctx.beginPath();
    ctx.moveTo(sx2, syy - F * 0.22);
    ctx.quadraticCurveTo(sx2 + F * 0.14, syy, sx2, syy + F * 0.06);
    ctx.quadraticCurveTo(sx2 - F * 0.14, syy, sx2, syy - F * 0.22);
    ctx.fill();
    ctx.strokeStyle = '#4a9fd0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** 고양이 자세: 0 웅크려 기다림 · 1 달림 · 2 데굴 · 3 깜짝(강아지) · 4 덮치기 직전 · 5 잡았다 */
function drawCat(ctx: C2, fx: number, base: number, S: number, pose: number, t: number, spin: number) {
  const body = '#c6cfda', light = '#eef2f6', dark = '#8e9bab', white = '#fbfcff';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.8, S * 0.028);
  // 그림자
  ctx.fillStyle = 'rgba(120,70,20,.22)';
  ell(ctx, fx - S * 0.48, base + 2, S * 0.5, S * 0.07);
  ctx.fill();
  if (pose === 2) {
    // 데굴데굴 (몸을 공처럼 말고 굴러간다)
    const cx = fx - S * 0.45, cy = base - S * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-spin);
    ctx.fillStyle = radg(ctx, -S * 0.08, -S * 0.1, 0, S * 0.36, [0, light], [1, body]);
    ell(ctx, 0, 0, S * 0.3, S * 0.28);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = dark;
    ctx.lineWidth = S * 0.035;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, S * 0.2, k * 2.1, k * 2.1 + 0.6);
      ctx.stroke();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.8, S * 0.028);
    for (let k = 0; k < 4; k++) {
      const a = k * 1.57 + 0.5;
      ctx.fillStyle = white;
      ell(ctx, Math.cos(a) * S * 0.3, Math.sin(a) * S * 0.28, S * 0.06, S * 0.05, a);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    // 머리(어질)
    drawCatHead(ctx, cx + S * 0.08, cy - S * 0.22, S, 2, t);
    for (let k = 0; k < 3; k++) {
      const a = t * 0.15 + (k * TAU) / 3;
      ctx.fillStyle = '#ffd43b';
      starPath(ctx, cx + S * 0.08 + Math.cos(a) * S * 0.25, cy - S * 0.5 + Math.sin(a) * S * 0.07, S * 0.06);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    return;
  }
  const crouch = pose === 0, scared = pose === 3;
  const gal = pose === 1 || pose === 4 ? t * 0.42 : 0, bob = pose === 1 ? Math.abs(Math.sin(gal)) * S * 0.04 : 0;
  const wig = crouch ? Math.sin(t * 0.45) * S * 0.025 : 0;
  const by = base - (crouch ? S * 0.24 : scared ? S * 0.5 : S * 0.38) - bob;
  const bcx = fx - S * 0.55;
  // 꼬리
  const tw = crouch ? Math.sin(t * 0.22) : Math.sin(t * 0.15) * 0.4;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = S * (scared ? 0.12 : 0.085);
  ctx.beginPath();
  ctx.moveTo(bcx - S * 0.3, by - S * 0.02 + (crouch ? -S * 0.12 : 0));
  if (scared) ctx.quadraticCurveTo(bcx - S * 0.45, by - S * 0.3, bcx - S * 0.38, by - S * 0.55);
  else ctx.quadraticCurveTo(bcx - S * 0.55, by - S * 0.05, bcx - S * (0.52 + tw * 0.12), by - S * (0.35 + Math.abs(tw) * 0.05));
  ctx.stroke();
  ctx.strokeStyle = body;
  ctx.lineWidth = S * (scared ? 0.09 : 0.06);
  ctx.stroke();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.8, S * 0.028);
  // 다리 (달리기 사이클)
  const legs: [number, number][] = [[-0.26, 0], [-0.16, Math.PI], [0.14, Math.PI * 0.5], [0.24, Math.PI * 1.5]];
  for (const [lx, ph] of legs) {
    const sw = pose === 1 || pose === 4 ? Math.sin(gal + ph) * S * 0.1 : 0, lift = pose === 1 ? Math.max(0, Math.cos(gal + ph)) * S * 0.06 : 0;
    const hx = bcx + lx * S + wig * (lx < 0 ? 1 : 0), hy = by + S * 0.04, px = hx + sw, py = base - lift - S * 0.03;
    const kx = (hx + px) / 2 + (lx < 0 ? -1 : 1) * S * 0.035, ky = (hy + py) / 2 - (crouch ? S * 0.02 : 0);
    for (const [c, lw] of [[OUT, S * 0.105], [lx < 0 ? '#aab6c3' : body, S * 0.072]] as [string, number][]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(kx, ky, px, py);
      ctx.stroke();
    }
    ctx.fillStyle = white;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.5, S * 0.022);
    ell(ctx, px + S * 0.015, py + S * 0.005, S * 0.052, S * 0.032);
    ctx.fill();
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(1.8, S * 0.028);
  // 몸통
  ctx.save();
  ctx.translate(bcx + wig, by);
  ctx.rotate(crouch ? -0.22 : scared ? 0 : 0.04);
  if (scared) {
    // 털이 쭈뼛 (등을 둥글게)
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let k = 0; k <= 14; k++) {
      const a = Math.PI + (k / 14) * Math.PI, rr2 = S * (0.34 + (k % 2) * 0.05);
      ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * 0.9);
    }
    ctx.lineTo(S * 0.34, S * 0.06);
    ctx.lineTo(-S * 0.34, S * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = radg(ctx, -S * 0.05, -S * 0.12, 0, S * 0.45, [0, light], [0.6, body], [1, '#aab6c3']);
    ell(ctx, 0, 0, S * 0.36, S * 0.17);
    ctx.fill();
    ctx.stroke();
    // 줄무늬
    ctx.strokeStyle = dark;
    ctx.lineWidth = S * 0.035;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-S * (0.2 - k * 0.11), -S * 0.16);
      ctx.quadraticCurveTo(-S * (0.17 - k * 0.11), -S * 0.06, -S * (0.21 - k * 0.11), S * 0.02);
      ctx.stroke();
    }
    ctx.fillStyle = white;
    ell(ctx, S * 0.18, S * 0.07, S * 0.14, S * 0.08);
    ctx.fill();
  }
  ctx.restore();
  // 머리
  const hx = fx - S * (crouch ? 0.12 : 0.15) + (pose === 4 ? S * 0.05 : 0), hy = by - S * (crouch ? 0.02 : scared ? 0.18 : 0.16);
  drawCatHead(ctx, hx, hy, S, pose === 3 ? 3 : pose === 4 ? 4 : pose === 5 ? 5 : crouch ? 0 : 1, t);
  // 빨간 목걸이 + 방울
  ctx.strokeStyle = '#ff5a5f';
  ctx.lineWidth = S * 0.035;
  ctx.beginPath();
  ctx.arc(hx - S * 0.02, hy + S * 0.04, S * 0.13, 0.6, 2.2);
  ctx.stroke();
  ctx.fillStyle = '#ffd43b';
  ell(ctx, hx - S * 0.04, hy + S * 0.18, S * 0.035, S * 0.035);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
function drawCatHead(ctx: C2, hx: number, hy: number, S: number, mood: number, t: number) {
  const body = '#c6cfda', white = '#fbfcff', r = S * 0.19;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.8, S * 0.028);
  // 귀
  for (const [ex, a] of [[-0.55, -0.35], [0.35, 0.25]]) {
    ctx.save();
    ctx.translate(hx + ex * r, hy - r * 0.7);
    ctx.rotate(a + (mood === 3 ? (ex < 0 ? -0.4 : 0.4) : 0) + (ex > 0 && t % 140 < 8 ? 0.25 : 0));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, r * 0.2);
    ctx.lineTo(0, -r * 0.62);
    ctx.lineTo(r * 0.32, r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb3c1';
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, r * 0.1);
    ctx.lineTo(0, -r * 0.38);
    ctx.lineTo(r * 0.16, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = radg(ctx, hx - r * 0.3, hy - r * 0.3, 0, r * 1.3, [0, '#f2f5f8'], [1, body]);
  ell(ctx, hx, hy, r * 1.08, r * 0.95);
  ctx.fill();
  ctx.stroke();
  // 이마 줄무늬
  ctx.strokeStyle = '#8e9bab';
  ctx.lineWidth = S * 0.025;
  for (const dx of [-0.25, 0, 0.25]) {
    ctx.beginPath();
    ctx.moveTo(hx + dx * r, hy - r * 0.9);
    ctx.lineTo(hx + dx * r * 0.8, hy - r * 0.55);
    ctx.stroke();
  }
  // 주둥이
  ctx.fillStyle = white;
  ell(ctx, hx + r * 0.45, hy + r * 0.3, r * 0.48, r * 0.36);
  ctx.fill();
  ctx.fillStyle = '#ff9fb2';
  ell(ctx, hx + r * 0.62, hy + r * 0.12, r * 0.13, r * 0.09);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, S * 0.018);
  // 입
  ctx.beginPath();
  if (mood === 4 || mood === 5) {
    ctx.fillStyle = '#c0394b';
    ctx.moveTo(hx + r * 0.3, hy + r * 0.32);
    ctx.quadraticCurveTo(hx + r * 0.55, hy + r * 0.75, hx + r * 0.85, hy + r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.38, hy + r * 0.34);
    ctx.lineTo(hx + r * 0.43, hy + r * 0.48);
    ctx.lineTo(hx + r * 0.48, hy + r * 0.34);
    ctx.fill();
  } else {
    ctx.moveTo(hx + r * 0.42, hy + r * 0.38);
    ctx.quadraticCurveTo(hx + r * 0.52, hy + r * 0.48, hx + r * 0.62, hy + r * 0.32);
    ctx.quadraticCurveTo(hx + r * 0.72, hy + r * 0.48, hx + r * 0.82, hy + r * 0.38);
    ctx.stroke();
  }
  // 눈
  for (const [ex, k] of [[-0.25, 0.85], [0.28, 1]] as number[][]) {
    const x = hx + ex * r, y = hy - r * 0.12, er = r * 0.24 * k;
    if (mood === 2) {
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - er, y - er);
      ctx.lineTo(x + er, y + er);
      ctx.moveTo(x + er, y - er);
      ctx.lineTo(x - er, y + er);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#c8f06a';
    ell(ctx, x, y, er, er * (mood === 0 ? 0.85 : 1.05));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#1a1410';
    const pw2 = mood === 0 || mood === 3 ? er * 0.6 : mood === 4 ? er * 0.18 : er * 0.3;
    ell(ctx, x + er * 0.2, y, pw2, er * 0.85);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, x + er * 0.35, y - er * 0.4, er * 0.25, er * 0.25);
    ctx.fill();
  }
  // 장난꾸러기 눈썹
  if (mood === 1 || mood === 4) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.45, hy - r * 0.48);
    ctx.lineTo(hx - r * 0.05, hy - r * 0.38);
    ctx.moveTo(hx + r * 0.1, hy - r * 0.38);
    ctx.lineTo(hx + r * 0.5, hy - r * 0.5);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(60,60,70,.6)';
  ctx.lineWidth = 1;
  for (const dy of [-0.05, 0.08]) {
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.75, hy + r * (0.25 + dy));
    ctx.lineTo(hx + r * 1.35, hy + r * (0.15 + dy * 2.5));
    ctx.stroke();
  }
}

/** 누르는 손가락 (첫 안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  const py = y + press * k * 0.18;
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 3;
  if (press > 0.5) {
    for (let j = 0; j < 2; j++) {
      ctx.globalAlpha = 0.8 - j * 0.35;
      ell(ctx, x, y, k * (0.35 + j * 0.22), k * (0.14 + j * 0.09));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(x, py - k * 0.56);
  ctx.scale(1, -1);
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-k * 0.09, 0);
  ctx.quadraticCurveTo(-k * 0.11, -k * 0.55, 0, -k * 0.56);
  ctx.quadraticCurveTo(k * 0.11, -k * 0.55, k * 0.09, -k * 0.3);
  ctx.quadraticCurveTo(k * 0.28, -k * 0.36, k * 0.3, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.44, -k * 0.25, k * 0.44, -k * 0.05);
  ctx.lineTo(k * 0.4, k * 0.35);
  ctx.quadraticCurveTo(k * 0.15, k * 0.55, -k * 0.15, k * 0.38);
  ctx.quadraticCurveTo(-k * 0.3, k * 0.2, -k * 0.22, k * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** 바닥 깔개 (부엌은 줄무늬 매트, 거실은 둥근 러그) */
function drawRugs(ctx: C2, s: PuffState, w: number, sy: (hw: number) => number, place: number) {
  const per = 2.3;
  for (let i = Math.floor((s.camX - 0.8) / per); i < (s.camX + 1.3) / per; i++) {
    if (i < 0 || hsh(i * 17 + s.stage) < 0.35) continue;
    const x0 = i * per + 0.4 + hsh(i) * 0.6, len = 0.55 + hsh(i * 3) * 0.3, fh = floorH(s, x0);
    if (s.stairs.some((st) => x0 + len > st.x0 - 0.1 && x0 < st.x0 + st.n * st.sw + 0.1)) continue;
    const L = (x0 - s.camX) * w, R = L + len * w, y0 = sy(fh + DEPTH * 0.45), y1 = sy(fh - FRONT * 0.7);
    ctx.save();
    if (place === 1) {
      const cx = (L + R) / 2, cy = (y0 + y1) / 2;
      ctx.fillStyle = 'rgba(120,70,20,.12)';
      ell(ctx, cx + 3, cy + 3, (R - L) / 2, (y1 - y0) / 2);
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = ['#ffb3a0', '#fff1c9', '#9fe3cb', '#ffd98f'][k];
        ell(ctx, cx, cy, ((R - L) / 2) * (1 - k * 0.22), ((y1 - y0) / 2) * (1 - k * 0.22));
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(120,70,20,.12)';
      ctx.beginPath();
      ctx.moveTo(L + w * 0.03 + 3, y0 + 3);
      ctx.lineTo(R + 3, y0 + 3);
      ctx.lineTo(R - w * 0.03 + 3, y1 + 3);
      ctx.lineTo(L + 3, y1 + 3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(L + w * 0.03, y0);
      ctx.lineTo(R, y0);
      ctx.lineTo(R - w * 0.03, y1);
      ctx.lineTo(L, y1);
      ctx.closePath();
      ctx.clip();
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = k % 2 ? '#fffaf0' : place === 2 ? '#ff9f7a' : '#8fdcc2';
        ctx.fillRect(L - w * 0.05, y0 + ((y1 - y0) * k) / 8, R - L + w * 0.1, (y1 - y0) / 8 + 1);
      }
    }
    ctx.restore();
  }
}

/** 맨 앞 층(시차 1.25): 바닥 앞쪽의 큰 화분 잎 · 털실 공 — 깊이감 */
function drawFront(ctx: C2, s: PuffState, w: number, h: number, sy: (hw: number) => number, t: number) {
  const cam = s.camX * 1.25, per = 1.7;
  for (let i = Math.floor(cam / per) - 1; i < cam / per + 2; i++) {
    const x = (i * per + 0.9 - cam) * w, y = Math.min(h, sy(s.camY - FRONT * 0.75)), kind = hsh(i * 23) < 0.5 ? 0 : 1;
    if (x < -w * 0.3 || x > w * 1.3) continue;
    if (kind === 0) {
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.5 + Math.sin(t * 0.02 + k + i) * 0.04;
        ctx.fillStyle = k % 2 ? '#5fbf68' : '#4aa957';
        ctx.strokeStyle = '#2f7a3d';
        ctx.lineWidth = 1.5;
        ell(ctx, x + Math.cos(a) * w * 0.09, y + Math.sin(a) * w * 0.07, w * 0.09, w * 0.03, a);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = radg(ctx, x - w * 0.02, y - w * 0.04, 0, w * 0.07, [0, '#ffc2d4'], [1, '#ff8fab']);
      ell(ctx, x, y - w * 0.02, w * 0.055, w * 0.05);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,80,110,.6)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(x, y - w * 0.02, w * 0.055, -0.8 + k * 0.5, 0.6 + k * 0.5);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ff8fab';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.04, y);
      ctx.quadraticCurveTo(x + w * 0.12, y + w * 0.02, x + w * 0.2, y - w * 0.005);
      ctx.stroke();
    }
  }
}

/** 별 칸 짧은 말 (위 띠에 들어갈 길이) */
function starShort(st: Star) {
  switch (st.k) {
    case 'escape': return '집까지 탈출';
    case 'seeds': return `씨앗 ${st.n}개`;
    case 'clean': return '안 막히기';
    case 'cathit': return `고양이 ${st.n}번 맞히기`;
    case 'combo': return '탑 셋 연달아';
    case 'vac': return '청소기로 고양이';
    case 'dog': return '강아지로 고양이';
    case 'smash': return `탑 ${st.n}개`;
    case 'roll': return `계단 슝 ${st.n}번`;
  }
}
/** 고양이가 의자·소파·강아지를 뛰어넘는 높이 */
function catLift(s: PuffState) {
  const m = s.cx - CAT_L * 0.5;
  let lift = 0;
  const hop = (a: number, b: number, hh: number) => {
    if (m < a || m > b) return;
    lift = Math.max(lift, Math.sin(((m - a) / (b - a)) * Math.PI) * hh);
  };
  for (const g of s.gaps) if (g.look < 2) hop(g.x0 - 0.12, g.x1 + 0.08, g.c + (g.look ? 0.24 : 0.22));
  for (const dg of s.dogs) if (dg.st === 0) hop(dg.x - 0.12, dg.x + DOG_L + 0.08, 0.42);
  for (const v of s.vacs) if (v.st !== 1) hop(v.x - VR - 0.1, v.x + VR + 0.06, 0.12);
  for (const tw of s.towers) if (tw.alive) hop(tw.x - 0.12, tw.x + tw.w + 0.08, tw.h + 0.06);
  return lift;
}

const bandMem = new WeakMap<object, { text: string; col: string; t: number; big: number }>();

function drawAll(ctx: C2, s: PuffState, w: number, h: number, _th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage], P = PAL[d.place];
  const X = (x: number) => (x - s.camX) * w;
  const sy = (hw: number) => (TRACK - (hw - s.camY)) * w;
  const r1 = rad(s.sz), hcx = s.bx + r1, gap = s.bx - s.cx;
  const seenT = fx.memo.t ?? -1;
  const band = (text: string, col: string, big: number) => bandMem.set(s, { text, col, t, big });
  const say = (x: number, y: number, text: string, col: string, size: number) => fx.pop(Math.max(w * 0.22, Math.min(w * 0.78, x)), Math.max(w * 0.22, y), text, col, size);
  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = sy(floorH(s, e.x) + e.y), n = e.n ?? 0;
    if (e.kind === 'smash') {
      fx.kick(7 + n * 3);
      fx.blink('#fff6d0', 0.18 + n * 0.05);
      fx.burst(ex, ey, '#ffffff', 14 + n * 4, 4.5, 3);
      fx.burst(ex, ey, e.text === '시리얼 상자' ? '#ffd43b' : e.text === '블록 성' ? '#4dabf7' : '#ff8fab', 12 + n * 4, 5, 3.4);
      fx.ring(ex, ey, '#fff3b0', w * (0.16 + n * 0.04), 6);
      say(ex, ey - w * 0.2, n >= 2 ? `와장창 ×${n}!` : '와장창!', '#ffe066', 26 + Math.min(4, n) * 4);
      band(n >= 3 ? `와장창 ×${n} 연달아!` : n === 2 ? '와장창 ×2!' : `${e.text} 와장창!`, n >= 2 ? '#ff6b6b' : '#ff9f43', n);
      fx.memo.smashT = t;
      fx.memo.wowT = t;
    } else if (e.kind === 'cathit') {
      const cx = X(s.cx - CAT_L * 0.4), cy = sy(floorH(s, s.cx) + 0.2);
      fx.burst(cx, cy, '#ffd43b', 14, 3.5, 2.6);
      fx.kick(4);
      if (X(s.cx) > w * 0.02) say(cx + w * 0.05, cy - w * 0.08, '데굴!', '#ffffff', 22);
      fx.memo.catHitT = t;
    } else if (e.kind === 'vacbump') {
      fx.kick(6);
      fx.burst(ex, ey, '#c9f0e2', 12, 3.5, 2.5);
      say(ex, ey - w * 0.12, '퉁!', '#ffffff', 22);
    } else if (e.kind === 'vaccat') {
      fx.kick(10);
      fx.blink('#fff6d0', 0.25);
      fx.burst(X(s.cx - CAT_L / 2), sy(0.15), '#ffd43b', 24, 4.5, 3);
      band('청소기 슝! 고양이 데굴!', '#3ad4ff', 2);
      fx.memo.wowT = t;
    } else if (e.kind === 'woof') {
      fx.kick(5);
      say(ex, ey - w * 0.15, '멍!', '#ffffff', 30);
      fx.ring(ex, ey, '#ffffff', w * 0.18, 4);
    } else if (e.kind === 'dogcat') {
      fx.kick(10);
      fx.blink('#fff6d0', 0.22);
      say(X(s.cx), sy(0.4), '냐아앙?!', '#ffffff', 22);
      band('멍멍! 고양이 줄행랑!', '#ff9f43', 2);
      fx.memo.wowT = t;
    } else if (e.kind === 'roll') {
      fx.kick(6);
      fx.burst(ex, ey, '#ffd43b', 18, 4.5, 2.6);
      band('계단 데굴데굴 슝~!', '#ffb02e', 1);
      fx.memo.wowT = t;
    } else if (e.kind === 'seed') {
      fx.burst(ex, ey, '#ffe066', 7, 2.4, 2);
      say(ex, ey - w * 0.05, '+1', '#fff3b0', 14);
    } else if (e.kind === 'bonk') {
      fx.kick(6);
      fx.burst(ex, ey, '#ffffff', 10, 3, 2.2);
      say(ex - w * 0.04, ey - w * 0.1, '쿵!', '#ffffff', 22);
      fx.memo.bonkT = t;
    } else if (e.kind === 'stuck') {
      fx.kick(4);
      say(ex - w * 0.05, ey - w * 0.08, Math.abs(e.x - s.houseX) < 0.01 ? '문이 작아요! 떼서 콩알로' : '끼었다! 떼서 작게', '#ffd0c8', 17);
    } else if (e.kind === 'blown') {
      say(ex, ey - w * 0.12, '으아아~', '#ffffff', 20);
    } else if (e.kind === 'land') {
      fx.burst(ex, sy(floorH(s, e.x)), '#f3d9b0', 10, 2.5, 2.4);
    } else if (e.kind === 'suck') {
      fx.kick(5);
      say(ex, ey - w * 0.12, '슈우욱!', '#ffffff', 20);
    } else if (e.kind === 'spit') {
      fx.burst(ex, ey, '#e9ecef', 14, 3, 3);
      say(ex, ey - w * 0.1, '퉤!', '#ffffff', 20);
    } else if (e.kind === 'clear') {
      fx.burst(w * 0.3, w * 0.5, '#ffd43b', 30, 6, 3);
      fx.burst(w * 0.7, w * 0.5, '#7fd8be', 30, 6, 3);
      fx.burst(w * 0.5, w * 0.4, '#ff8fab', 24, 5, 3);
      fx.blink('#fff6d0', 0.3);
      fx.memo.wowT = t;
    } else if (e.kind === 'caught') {
      fx.kick(9);
      fx.blink('#ffe0b0', 0.2);
      say(X(s.bx), sy(0.35), '잡혔다!', '#ffd0c8', 24);
    }
  }
  // 꾹 누르는 순간: 뿌우욱
  if (s.phase === 'play' && s.hold && !fx.memo.ph && s.sz < 0.35 && s.mode === 0 && t - (fx.memo.puffT ?? -99) > 45) {
    fx.memo.puffT = t;
    say(X(hcx), sy(0.5), '뿌우욱!', '#ffffff', 20);
    fx.ring(X(hcx), sy(r1), '#ffffff', w * 0.22, 4);
    fx.kick(2);
  }
  if (s.hold && s.sz >= 1 && !fx.memo.full) (fx.memo.full = 1), (fx.memo.fullT = t);
  if (s.sz < 0.9) fx.memo.full = 0;
  fx.memo.ph = s.hold ? 1 : 0;
  fx.memo.t = t;
  const wow = Math.max(0, 50 - (t - (fx.memo.wowT ?? -99)));

  ctx.save();
  fx.begin(ctx);
  const baseY = sy(s.camY + DEPTH);
  drawWall(ctx, s, w, h, P, baseY, t, wow);
  drawMid(ctx, s, w, P, baseY, t);
  drawBeams(ctx, s, w, baseY, t);
  drawFloor(ctx, s, w, h, P, sy);
  drawRugs(ctx, s, w, sy, d.place);
  const vis = (a: number, b: number) => X(b) > -w * 0.3 && X(a) < w * 1.3;
  // ── 뒤쪽: 선풍기 · 잼 · 집 안 · 의자 뒤 ──
  for (const z of s.fans) if (vis(z.x0, z.x1 + 0.35)) drawFan(ctx, z, X, sy, w, t, floorH(s, z.x1));
  for (const z of s.jams) if (vis(z.x0 - 0.1, z.x1)) drawJam(ctx, z, X, sy, w, t, floorH(s, z.x0));
  for (const g of s.gaps) {
    if (!vis(g.x0 - 0.1, g.x1 + 0.4)) continue;
    const fh = floorH(s, g.x0);
    if (g.look === 0) drawChair(ctx, g, X, sy, w, 0, fh);
    else if (g.look === 1) drawSofa(ctx, g, X, sy, w, 0, fh);
    else drawHouse(ctx, g, X, sy, w, 0, t, 0, fh);
  }
  // 바닥 씨앗
  for (const sd of s.seeds) {
    if (sd.k === 1 || !vis(sd.x - 0.05, sd.x + 0.05)) continue;
    if (sd.got >= 0) continue;
    drawSeed(ctx, X(sd.x), sy(floorH(s, sd.x) + sd.h) + Math.sin(t * 0.1 + sd.id) * 1.2, w * 0.021, 0.9 + Math.sin(sd.id) * 0.3, 0.6);
  }
  // 탑
  const touchT = s.touch.startsWith('t') ? Number(s.touch.slice(1)) : -1;
  for (const tw of s.towers) {
    if (!tw.alive || !vis(tw.x - 0.1, tw.x + tw.w + 0.1)) continue;
    const wob = tw.id === touchT ? Math.sin(t * 0.9) * 0.8 : Math.sin(t * 0.05 + tw.seed) * 0.12;
    drawTower(ctx, tw, X, sy, w, wob, floorH(s, tw.x));
  }
  for (const v of s.vacs) if (vis(v.x - 0.2, v.x + 0.2)) drawVac(ctx, v, X, sy, w, t, floorH(s, v.x));
  // ── 고양이 ──
  {
    const S = CAT_L * w * 1.35, fxp = X(s.cx), base = sy(floorH(s, s.cx - CAT_L / 2) + catLift(s));
    const pose = !s.started ? 0 : s.cstun > 0 ? 2 : s.cscare > 0 ? 3 : s.phase === 'result' && !s.ok ? 5 : gap < 0.14 ? 4 : 1;
    if (fxp > -S * 0.2) drawCat(ctx, fxp, base, S, pose, t, (CAT_STUN + 30 - s.cstun) * 0.32);
    const mid = s.cx - CAT_L / 2;
    if (s.started && pose === 1 && s.fans.some((z) => mid > z.x1 - WIND_L && mid < z.x1)) {
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 4; k++) {
        const ly = base - S * (0.25 + k * 0.17), lx = fxp - S * 0.1 - ((t * 6 + k * 23) % (S * 1.2));
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - S * 0.25, ly);
        ctx.stroke();
      }
      if (t - (fx.memo.windSay ?? -999) > 150) (fx.memo.windSay = t), say(fxp, base - S * 1.1, '으으 바람 싫어~', '#ffffff', 15);
    }
    if (s.started && pose === 1 && inZone(s.jams, mid) && t - (fx.memo.jamSay ?? -999) > 150) (fx.memo.jamSay = t), say(fxp, base - S * 1.1, '끈적끈적 냐옹!', '#ffd0dc', 15);
    if (pose === 4 && s.phase === 'play' && t % 20 < 14) label(ctx, '!', fxp - S * 0.1, base - S * 1.05, w * 0.06, '#ff5a5f', '#ffffff', 4);
  }
  // ── 햄스터 ──
  if (s.mode !== 2) {
    const hop = onStairs(s, hcx) && s.sz < STAIR_S ? Math.abs(Math.sin(t * 0.25)) * w * 0.03 : 0;
    const R = r1 * w, F = RS * w * (1 + 0.9 * s.sz), cx = X(hcx), cy = sy(floorH(s, hcx) + r1 + s.lift) - hop;
    const since = t - (fx.memo.smashT ?? -99), bonk = t - (fx.memo.bonkT ?? -99) < 50;
    const stuck = s.touch.startsWith('g') && s.hold;
    const mood = s.phase === 'result' ? (s.ok ? 7 : 8) : s.mode === 1 ? 6 : bonk || (s.stun > 0 && !stuck) ? 3 : stuck ? 4 : since < 24 ? 5 : s.hold && s.sz < 0.97 ? 1 : s.sz > 0.6 ? 2 : 0;
    const press = s.touch && s.hold ? 1 : s.squish;
    const fullT = t - (fx.memo.fullT ?? -99);
    const wob = (since < 12 ? 0.14 * (1 - since / 12) * Math.cos(since * 1.2) : 0) + (s.hold && s.sz < 1 && s.sz > 0.05 ? 0.05 * Math.sin(t * 1.4) : 0) + (fullT < 16 ? 0.08 * Math.sin(fullT * 0.9) * (1 - fullT / 16) : 0);
    // 그림자
    const fl = sy(floorH(s, hcx));
    ctx.fillStyle = `rgba(120,70,20,${0.26 - Math.min(0.15, s.lift * 0.6)})`;
    ell(ctx, cx, fl + 2, R * (0.85 - s.lift), Math.max(3, R * 0.16));
    ctx.fill();
    if (s.phase === 'play' && s.mode === 0 && s.v + s.boost > 0.002 && t % (s.sz > 0.5 ? 7 : 11) === 0 && t !== fx.memo.dustT) {
      fx.memo.dustT = t;
      fx.burst(cx - R * 0.6, fl - 2, s.sz > 0.5 ? '#f1d3a3' : '#f6e1bd', s.sz > 0.5 ? 4 : 2, 1.2, s.sz > 0.5 ? 3 : 2);
    }
    // 빠를 때 바람 줄
    if (s.sz < 0.3 && s.v + s.boost > 0.005 && s.phase === 'play') {
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const ly = cy - R * 0.5 + k * R * 0.5, lx = cx - R * 1.3 - ((t * 3 + k * 9) % 14);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - w * 0.05, ly);
        ctx.stroke();
      }
    }
    if (s.boost > 0.002) {
      ctx.strokeStyle = 'rgba(255,214,102,.85)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) {
        const ly = cy - R * 0.6 + k * R * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx - R * 1.1, ly);
        ctx.lineTo(cx - R * 1.1 - w * 0.08 * (s.boost / BOOST_MAX), ly);
        ctx.stroke();
      }
    }
    if (inZone(s.jams, hcx) && s.phase === 'play') {
      ctx.strokeStyle = 'rgba(214,51,108,.85)';
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 4; k++) {
        const jx = cx - R * 0.6 + k * R * 0.4, stretch = Math.abs(Math.sin(t * 0.15 + k)) * R * (0.2 + 0.5 * s.sz);
        ctx.beginPath();
        ctx.moveTo(jx, fl);
        ctx.quadraticCurveTo(jx + 3, fl - stretch * 0.5, jx, fl - stretch);
        ctx.stroke();
      }
      if (s.sz > 0.5 && t - (fx.memo.jamH ?? -999) > 120) (fx.memo.jamH = t), say(cx, cy - R - w * 0.04, '끈적!', '#ffd0dc', 16);
    }
    ctx.save();
    if (s.mode === 1) {
      ctx.translate(cx, cy);
      ctx.rotate(-(BLOW_T - s.mt) * 0.35);
      ctx.translate(-cx, -cy);
    }
    drawHamster(ctx, cx, cy, R, F, { sz: s.sz, mood, t, run: s.v > 0.0008 || s.mode === 1 ? t * (0.55 - 0.3 * s.sz) : 0, squash: press, wob, blink: t % 150 < 6, sweat: s.sz > 0.65 || (gap < 0.14 && s.phase === 'play') });
    ctx.restore();
    if (s.phase === 'result' && !s.ok) {
      // 고양이 앞발이 꾹 (웃긴 패배)
      const u = Math.min(1, s.pt / 14), px = cx - R * 0.2, py = cy - R - w * 0.05 + u * w * 0.04 + Math.sin(s.pt * 0.25) * 2;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = w * 0.06;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px - w * 0.2, py - w * 0.12);
      ctx.quadraticCurveTo(px - w * 0.08, py - w * 0.08, px, py);
      ctx.stroke();
      ctx.strokeStyle = '#c6cfda';
      ctx.lineWidth = w * 0.042;
      ctx.stroke();
      ctx.fillStyle = '#fbfcff';
      ctx.lineWidth = 2;
      ctx.strokeStyle = OUT;
      ell(ctx, px + w * 0.005, py + w * 0.008, w * 0.04, w * 0.028);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffb3c1';
      for (const dx of [-0.018, 0, 0.018]) (ell(ctx, px + w * (0.005 + dx), py + w * 0.024, w * 0.007, w * 0.006), ctx.fill());
      if (s.pt > 20 && s.pt < 120) label(ctx, '찍!', cx + R * 0.6, cy - R - w * 0.04, w * 0.045, '#ffffff', OUT, 3.5);
    }
    if (bonk) {
      for (let k = 0; k < 3; k++) {
        const a = t * 0.15 + (k * TAU) / 3;
        ctx.fillStyle = '#ffd43b';
        starPath(ctx, cx + Math.cos(a) * R * 0.9, cy - R * 1.05 + Math.sin(a) * R * 0.25, w * 0.016);
        ctx.fill();
      }
    }
  }
  // 강아지 (햄스터 위로)
  for (const dg of s.dogs) {
    if (!vis(dg.x - 0.2, dg.x + DOG_L + 0.2)) continue;
    const under = dg.st === 0 && s.bx + 2 * r1 > dg.x && s.bx < dg.x + DOG_L ? 1 : 0;
    drawDog(ctx, dg, X, sy, w, t, floorH(s, dg.x), under);
  }
  // ── 앞쪽: 의자 앞 · 집 앞면 ──
  for (const g of s.gaps) {
    if (!vis(g.x0 - 0.1, g.x1 + 0.4)) continue;
    const fh = floorH(s, g.x0);
    if (g.look === 0) drawChair(ctx, g, X, sy, w, 1, fh);
    else if (g.look === 1) drawSofa(ctx, g, X, sy, w, 1, fh);
    else drawHouse(ctx, g, X, sy, w, 1, t, s.phase === 'result' && s.ok ? 1 : 0, fh);
  }
  // 공중 씨앗 (커야 닿는다)
  for (const sd of s.seeds) {
    if (sd.k !== 1 || sd.got >= 0 || !vis(sd.x - 0.05, sd.x + 0.05)) continue;
    const yy = sy(floorH(s, sd.x) + sd.h) + Math.sin(t * 0.07 + sd.id) * 3;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(sd.x), yy - w * 0.02);
    ctx.lineTo(X(sd.x), yy - w * 0.06);
    ctx.stroke();
    drawSeed(ctx, X(sd.x), yy, w * 0.024, Math.sin(t * 0.05 + sd.id) * 0.3, 0.8 + 0.2 * Math.sin(t * 0.1 + sd.id));
  }
  for (const z of s.fans) if (vis(z.x1 - WIND_L, z.x1 + 0.2)) drawWind(ctx, z, X, sy, w, t, floorH(s, z.x0));
  // 부서진 조각
  for (const b of s.bits) {
    const bx = X(b.x);
    if (bx < -30 || bx > w + 30) continue;
    const by = sy(b.y), fade = b.rest > 180 ? 1 - (b.rest - 180) / 60 : 1;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(b.a);
    const pw = w * (b.look === 2 ? 0.07 : b.look === 1 ? 0.075 : 0.07) * b.sz, ph = pw * (b.look === 1 ? 1.1 : 0.85);
    drawPiece(ctx, b.look, b.col + (b.look === 2 ? 0 : 1), b.col, 0, ph / 2, pw, ph);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // NEW 동그라미
  if (s.spot && s.phase === 'play') {
    const u = (t - s.spot.t) / 150, px = X(s.spot.x), py = sy(floorH(s, s.spot.x) + s.spot.h);
    if (px > 0 && px < w) {
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ell(ctx, px, py, w * (0.1 + 0.015 * Math.sin(t * 0.3)), w * (0.1 + 0.015 * Math.sin(t * 0.3)));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff5a5f';
      rr(ctx, px - w * 0.05, py - w * 0.15, w * 0.1, w * 0.045, w * 0.02);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(12, w * 0.033)}px system-ui, sans-serif`;
      ctx.fillText('NEW', px, py - w * 0.127);
    }
  }
  drawFront(ctx, s, w, h, sy, t);
  // 햇살 속 먼지
  ctx.fillStyle = 'rgba(255,250,215,.6)';
  ctx.beginPath();
  for (let k = 0; k < 14; k++) {
    const px = ((hsh(k * 5) * w * 1.4 - s.camX * w * 0.4 + t * 0.15 * (0.5 + hsh(k))) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * 0.2;
    const py = w * (0.25 + 0.55 * hsh(k * 9)) + Math.sin(t * 0.02 + k) * w * 0.02, r0 = 1 + Math.abs(Math.sin(t * 0.05 + k * 2));
    ctx.moveTo(px + r0, py);
    ctx.arc(px, py, r0, 0, TAU);
  }
  ctx.fill();
  // 위험: 고양이가 바로 뒤
  if (s.phase === 'play' && gap < 0.16 && s.started) {
    const a = (0.16 - gap) / 0.16 * (0.5 + 0.3 * Math.sin(t * 0.4));
    ctx.fillStyle = lin(ctx, 0, 0, w * 0.35, 0, [0, `rgba(255,90,95,${0.45 * a})`], [1, 'rgba(255,90,95,0)']);
    ctx.fillRect(0, 0, w * 0.35, h);
  }
  // 화면 밖 고양이 표시
  if (s.started && X(s.cx) < w * 0.02 && s.phase !== 'result') {
    const hit = s.cstun > 0 || s.cscare > 0, iy = sy(floorH(s, s.cx) + (hit ? 0.3 : 0.16)), r = w * (hit ? 0.075 : 0.045);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ell(ctx, r + 6, iy, r, r);
    ctx.fill();
    ctx.strokeStyle = gap < 0.3 ? '#ff5a5f' : '#7fcfb3';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.save();
    if (hit) {
      ctx.translate(r + 6, iy);
      ctx.rotate(Math.sin(t * 0.3) * 0.5);
      ctx.translate(-(r + 6), -iy);
    }
    drawCatHead(ctx, r + 6, iy + r * 0.12, r * 3.4, hit ? (s.cscare > 0 ? 3 : 2) : 1, t);
    ctx.restore();
    if (hit) {
      for (let k = 0; k < 3; k++) {
        const a = t * 0.18 + (k * TAU) / 3;
        ctx.fillStyle = '#ffd43b';
        starPath(ctx, r + 6 + Math.cos(a) * r * 0.9, iy - r * 0.95 + Math.sin(a) * r * 0.25, w * 0.016);
        ctx.fill();
      }
      ctx.textAlign = 'left';
      label(ctx, s.cscare > 0 ? '냐앙?!' : '데굴!', r * 2 + 10, iy - r * 0.5, w * 0.042, '#ffffff', OUT, 3.5);
    }
    ctx.fillStyle = gap < 0.3 ? '#ff5a5f' : '#7fcfb3';
    ctx.beginPath();
    ctx.moveTo(4, iy);
    ctx.lineTo(10, iy - 6);
    ctx.lineTo(10, iy + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  hud(ctx, s, w, h, t);
}

function hud(ctx: C2, s: PuffState, w: number, h: number, t: number) {
  const d = STAGES[s.stage], gap = s.bx - s.cx;
  const font = (px: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(px))}px system-ui, sans-serif`);
  ctx.textBaseline = 'middle';
  // ── 위 띠 ──
  const top = w * HUD_T;
  ctx.fillStyle = 'rgba(150,100,40,.18)';
  rr(ctx, 6, 7, w - 12, top - 6, 14);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,251,240,.95)';
  rr(ctx, 6, 4, w - 12, top - 7, 14);
  ctx.fill();
  ctx.strokeStyle = '#f2cf96';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const r1y = w * 0.042;
  // 판 이름 알약
  font(w * 0.037, 900);
  const title = `${s.stage + 1}판 ${d.name}`, tw2 = ctx.measureText(title).width + 20;
  ctx.fillStyle = lin(ctx, 0, r1y - 12, 0, r1y + 12, [0, '#ffb35c'], [1, '#ff8a2a']);
  rr(ctx, 12, r1y - w * 0.028, tw2, w * 0.056, w * 0.028);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, 22, r1y + 1);
  // 하트
  for (let i = 0; i < 3; i++) {
    const hx = w - w * 0.05 - i * w * 0.062;
    ctx.fillStyle = i < s.hearts ? '#ff5a6e' : 'rgba(150,120,100,.25)';
    heartPath(ctx, hx, r1y + 1, w * 0.02);
    ctx.fill();
    if (i < s.hearts) {
      ctx.strokeStyle = '#b8323f';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ell(ctx, hx - w * 0.008, r1y - w * 0.006, w * 0.005, w * 0.004);
      ctx.fill();
    }
  }
  // 씨앗 수
  const sx = w - w * 0.27;
  drawSeed(ctx, sx, r1y + 1, w * 0.016, 0.5, 0);
  font(w * 0.038, 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6b3d1c';
  ctx.fillText(`${s.seedsGot}`, sx + w * 0.025, r1y + 1);
  // 별 줄 (쉬운 말)
  const r2y = w * 0.106;
  font(w * 0.034, 800);
  const chips = d.stars.map((st) => {
    const prog = starNow(s, st), met = st.k === 'escape' ? s.phase === 'result' && s.ok : st.k === 'clean' ? s.mistakes === 0 : starMet(s, st);
    const lost = st.k === 'clean' && s.mistakes > 0;
    const text = prog ? `${starShort(st).replace(/ \d+[개번]| 셋/, '')} ${prog}` : starShort(st);
    return { text, met, lost, wd: ctx.measureText(text).width + w * 0.075 };
  });
  const totalW = chips.reduce((a, c) => a + c.wd, 0) + (chips.length - 1) * 5;
  let cx0 = Math.max(10, (w - totalW) / 2);
  for (const c of chips) {
    ctx.fillStyle = c.lost ? 'rgba(200,180,160,.35)' : c.met ? '#fff1b8' : '#fff8e6';
    rr(ctx, cx0, r2y - w * 0.026, c.wd, w * 0.052, w * 0.026);
    ctx.fill();
    ctx.strokeStyle = c.met && !c.lost ? '#f5b82e' : 'rgba(200,150,90,.6)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    starPath(ctx, cx0 + w * 0.032, r2y, w * 0.018);
    ctx.fillStyle = c.lost ? 'rgba(150,120,100,.5)' : c.met ? '#ffc61a' : 'rgba(255,255,255,.9)';
    ctx.fill();
    ctx.strokeStyle = c.lost ? 'rgba(150,120,100,.6)' : '#d48b0a';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = c.lost ? 'rgba(120,90,60,.6)' : '#6b3d1c';
    ctx.fillText(c.text, cx0 + w * 0.058, r2y + 1);
    if (c.lost) {
      ctx.strokeStyle = 'rgba(120,90,60,.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx0 + w * 0.058, r2y + 1);
      ctx.lineTo(cx0 + c.wd - w * 0.015, r2y + 1);
      ctx.stroke();
    }
    cx0 += c.wd + 5;
  }
  // ── 아래 띠: 고양이와 거리 · 집까지 ──
  const bt = w * HUD_B;
  ctx.fillStyle = 'rgba(150,100,40,.18)';
  rr(ctx, 6, bt + 5, w - 12, h - bt - 8, 14);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,251,240,.95)';
  rr(ctx, 6, bt + 2, w - 12, h - bt - 8, 14);
  ctx.fill();
  ctx.strokeStyle = '#f2cf96';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const ry = bt + (h - bt) * 0.36, bx0 = w * 0.15, bx1 = w * 0.64;
  const danger = s.started && gap < 0.16, col = gap < 0.16 ? '#ff5a5f' : gap < 0.32 ? '#ffa94d' : '#51cf66';
  drawCatHead(ctx, w * 0.075, ry + w * 0.005, w * 0.17, danger ? 4 : 1, t);
  ctx.fillStyle = 'rgba(200,160,110,.25)';
  rr(ctx, bx0, ry - w * 0.014, bx1 - bx0, w * 0.028, w * 0.014);
  ctx.fill();
  const p = clamp(gap / 1.0, 0, 1);
  ctx.fillStyle = danger && t % 16 < 8 ? '#ff8787' : col;
  rr(ctx, bx0, ry - w * 0.014, Math.max(w * 0.028, (bx1 - bx0) * p), w * 0.028, w * 0.014);
  ctx.fill();
  // 작은 햄스터 표시
  const mx = bx0 + (bx1 - bx0) * p;
  ctx.fillStyle = '#f8b968';
  ell(ctx, mx, ry, w * 0.022, w * 0.02);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#2a1a10';
  ell(ctx, mx + w * 0.009, ry - w * 0.004, w * 0.003, w * 0.004);
  ctx.fill();
  font(w * 0.036, 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = danger ? '#e03131' : '#6b3d1c';
  ctx.fillText(`고양이와 ${Math.max(0, Math.round(gap * 100))}cm`, bx1 + w * 0.035, ry + 1);
  // 집까지
  const py2 = bt + (h - bt) * 0.74, q0 = w * 0.05, q1 = w * 0.8, prog = clamp(s.bx / Math.max(0.1, s.houseX), 0, 1);
  ctx.strokeStyle = 'rgba(200,150,90,.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(q0, py2);
  ctx.lineTo(q1, py2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ffa94d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(q0, py2);
  ctx.lineTo(q0 + (q1 - q0) * prog, py2);
  ctx.stroke();
  ctx.fillStyle = '#ffa94d';
  ell(ctx, q0 + (q1 - q0) * prog, py2, w * 0.011, w * 0.011);
  ctx.fill();
  // 집 아이콘
  const hx = q1 + w * 0.05;
  ctx.fillStyle = '#ffd99a';
  ctx.fillRect(hx - w * 0.025, py2 - w * 0.012, w * 0.05, w * 0.03);
  ctx.fillStyle = '#ff7a6a';
  ctx.beginPath();
  ctx.moveTo(hx - w * 0.034, py2 - w * 0.01);
  ctx.lineTo(hx, py2 - w * 0.038);
  ctx.lineTo(hx + w * 0.034, py2 - w * 0.01);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6b3d1c';
  ell(ctx, hx, py2 + w * 0.008, w * 0.008, w * 0.01);
  ctx.fill();
  ctx.textAlign = 'left';
  font(w * 0.033, 900);
  ctx.fillStyle = '#6b3d1c';
  ctx.fillText('집', hx + w * 0.045, py2 + 1);

  // ── 큰 순간 띠 ──
  const bm = bandMem.get(s);
  if (bm && t - bm.t < 70) {
    const u = t - bm.t, sc = u < 8 ? 0.6 + (u / 8) * 0.55 : u < 14 ? 1.15 - ((u - 8) / 6) * 0.15 : 1, a = u > 55 ? 1 - (u - 55) / 15 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, w * 0.25);
    ctx.scale(sc, sc);
    font(w * (0.058 + Math.min(2, bm.big) * 0.006), 900);
    const tw3 = ctx.measureText(bm.text).width + w * 0.12;
    ctx.fillStyle = shade(bm.col, -0.25);
    ctx.beginPath();
    ctx.moveTo(-tw3 / 2 - w * 0.05, -w * 0.02);
    ctx.lineTo(-tw3 / 2, -w * 0.045);
    ctx.lineTo(-tw3 / 2, w * 0.045);
    ctx.closePath();
    ctx.moveTo(tw3 / 2 + w * 0.05, -w * 0.02);
    ctx.lineTo(tw3 / 2, -w * 0.045);
    ctx.lineTo(tw3 / 2, w * 0.045);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bm.col;
    rr(ctx, -tw3 / 2, -w * 0.048, tw3, w * 0.096, w * 0.03);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    label(ctx, bm.text, 0, 2, w * (0.058 + Math.min(2, bm.big) * 0.006), '#ffffff', shade(bm.col, -0.45), 4);
    ctx.restore();
  }
  // ── NEW 소식 ──
  if (s.news && t - s.news.t < NEWS_T && s.phase === 'play') {
    const u = t - s.news.t, a = Math.min(1, u / 10, (NEWS_T - u) / 15);
    ctx.globalAlpha = a;
    font(w * 0.036, 800);
    const tw4 = ctx.measureText(s.news.text).width + w * 0.16;
    const nx = (w - tw4) / 2, ny = w * 0.175;
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    rr(ctx, nx, ny - w * 0.03, tw4, w * 0.06, w * 0.03);
    ctx.fill();
    ctx.strokeStyle = '#ff5a5f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ff5a5f';
    rr(ctx, nx + 4, ny - w * 0.022, w * 0.1, w * 0.044, w * 0.022);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    font(w * 0.03, 900);
    ctx.fillText('NEW', nx + 4 + w * 0.05, ny + 1);
    ctx.textAlign = 'left';
    font(w * 0.036, 800);
    ctx.fillStyle = '#6b3d1c';
    ctx.fillText(s.news.text, nx + w * 0.13, ny + 1);
    ctx.globalAlpha = 1;
  }
  // ── 시작 (첫 손짓 전) ──
  if (s.phase === 'ready') {
    const r1 = rad(s.sz), hx2 = (s.bx + r1 - s.camX) * w, hy2 = (TRACK - r1) * w;
    const press = Math.max(0, Math.sin(t * 0.12));
    drawHand(ctx, hx2 + w * 0.03, hy2 - r1 * w - w * 0.005, w * 0.15, press);
    const first = s.stage === 0 && !s.again;
    if (!first) {
      const cy = w * 0.3, cw = w * 0.84;
      ctx.fillStyle = 'rgba(150,100,40,.2)';
      rr(ctx, (w - cw) / 2, cy - w * 0.1 + 4, cw, w * 0.2, 16);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,251,240,.97)';
      rr(ctx, (w - cw) / 2, cy - w * 0.1, cw, w * 0.2, 16);
      ctx.fill();
      ctx.strokeStyle = '#ffb35c';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.textAlign = 'center';
      label(ctx, s.again ? `${s.stage + 1}판 다시!` : `${s.stage + 1}판 · ${d.name}`, w / 2, cy - w * 0.05, w * 0.055, '#ff8a2a', '#ffffff', 4);
      font(w * 0.037, 800);
      ctx.fillStyle = '#6b3d1c';
      ctx.fillText(s.again ? d.tip : d.news, w / 2, cy + w * 0.012);
      font(w * 0.033, 700);
      ctx.fillStyle = '#a07a50';
      ctx.fillText(s.again ? '하트가 남아 있는 동안 몇 번이든!' : d.tip, w / 2, cy + w * 0.062);
    }
    ctx.textAlign = 'center';
    label(ctx, first ? '꾹 누르면 빵빵! 떼면 콩알!' : '꾹 눌러서 출발!', w / 2, first ? w * 0.25 : w * 0.47, w * (first ? 0.062 : 0.05), '#ffffff', '#c76a12', 5);
  }
  // ── 결과 ──
  if (s.phase === 'result' && s.pt > 30) {
    const u = s.pt - 30, a = Math.min(1, u / 10), cy = w * 0.42, cw = w * 0.8, chh = w * (s.ok ? 0.32 : 0.24);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(150,100,40,.22)';
    rr(ctx, (w - cw) / 2, cy - chh / 2 + 5, cw, chh, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,251,240,.97)';
    rr(ctx, (w - cw) / 2, cy - chh / 2, cw, chh, 18);
    ctx.fill();
    ctx.strokeStyle = s.ok ? '#ffc61a' : '#ff8787';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    if (s.ok) {
      label(ctx, s.won ? '대탈출 성공!' : '탈출 성공!', w / 2, cy - chh / 2 + w * 0.06, w * 0.07, '#ff8a2a', '#ffffff', 5);
      const n = s.starOk.length;
      for (let i = 0; i < n; i++) {
        const k = Math.min(1, Math.max(0, (u - 6 - i * 10) / 8)), pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.4 : 1;
        const sx2 = w / 2 + (i - (n - 1) / 2) * w * 0.15, sy2 = cy - w * 0.01;
        starPath(ctx, sx2, sy2, w * 0.05 * (k > 0 ? pop : 1));
        ctx.fillStyle = s.starOk[i] && k > 0 ? '#ffc61a' : 'rgba(200,180,150,.35)';
        ctx.fill();
        ctx.strokeStyle = s.starOk[i] && k > 0 ? '#c77a00' : 'rgba(160,130,100,.5)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      font(w * 0.034, 800);
      d.stars.forEach((st, i) => {
        ctx.fillStyle = s.starOk[i] ? '#6b3d1c' : 'rgba(120,90,60,.5)';
        ctx.fillText(`${s.starOk[i] ? '★' : '☆'} ${st.label}`, w / 2, cy + w * (0.07 + i * 0.042) - (n - 1) * w * 0.012);
      });
    } else {
      label(ctx, '잡혔다!', w / 2, cy - chh / 2 + w * 0.06, w * 0.07, '#ff5a5f', '#ffffff', 5);
      font(w * 0.038, 800);
      ctx.fillStyle = '#6b3d1c';
      ctx.fillText(s.hearts > 0 ? `하트 하나 잃었어요 — 이 판 다시!` : '하트를 다 썼어요', w / 2, cy + w * 0.01);
      font(w * 0.034, 700);
      ctx.fillStyle = '#a07a50';
      ctx.fillText(d.tip, w / 2, cy + w * 0.06);
    }
    ctx.globalAlpha = 1;
  }
}
