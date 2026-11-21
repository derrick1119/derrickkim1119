/**
 * ⏪ 한 물건만 되감기 (38라운드: 오너가 고른 아이디어를 깊게 — 톡) — 한 물건만 되감기 × 깊어지는 판 × 도감(복원).
 * 세상은 저절로 앞으로 흐른다: 다리가 무너지고, 화분이 떨어져 깨지고, 술통이 굴러오고, 도깨비가 화살을 쏘고,
 *   뗏목이 떠내려가고, 물탱크가 터지고, 풍선이 고양이를 싣고 날아간다.
 * 손짓 하나(톡): 물건을 톡 하면 **그 물건 하나만** 자기 시간이 거꾸로 감긴다 — 지나온 길을 그대로 되짚는다
 *   (조각이 모여 붙고, 술통이 비탈을 거슬러 오르고, 화살이 쏜 도깨비에게 돌아간다). 다른 것은 계속 앞으로 → 엇갈림.
 *   다시 톡 하면 그 자리에서 멈춰 잠깐 쉬었다가 다시 앞으로. 제자리까지 되감으면: 주인이 있으면 받아 들고(영영 해결),
 *   없으면 잠깐 쉬었다가 같은 일이 다시 벌어진다. 되감는 동안 모래시계 모래가 준다.
 * 판 목표: 꼬마 시계공(부엉이)이 저절로 걸어가 시계 부품에 닿게. 별: 부품까지 · 아무도 안 다치게(또는 구하기) · 되감기 N초 안에.
 * 더 하고 싶게: 판을 깨면 부품이 시계탑으로 날아가 마을이 하나씩 복원된다(분수 → 꽃 → 가로등 → 풍차 → 물레방아 …
 *   → 시계 바늘). 다음 판의 새 장치와 다음 복원이 결과 화면에 미리 보인다. 장 셋(장터 · 강가 · 시계탑) × 판 넷.
 * 결정적: 모든 물건은 '자기 시간 τ'의 함수로만 움직인다(같은 τ → 같은 자세). 되감기 = τ가 거꾸로. 봇·미리 보기가 같은 세계를 돌린다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice, type Juice } from '../juice.ts';

// ───────────────────────────── 화면·세계 상수 ─────────────────────────────
/** 화면 세로 ÷ 가로 */
const A = 1.5;
/** 위 띠 높이(폭 단위) — 세계 y=0이 화면 TOPH */
const TOPH = 0.085;
/** 세계 y가 이 아래면 아래 띠 */
const BOTY = 1.2;
/** 걷는 속도 · 한 발 높이(넘을 수 있는 단차) · 중력 · 되감기 속도(자기 시간 틱/틱) */
const V = 0.0034, STEP = 0.03, G = 0.0009, RW = 2, RW_FAST = 3;
/** 낭떠러지 앞에서 이만큼 떨어져 선다 (떨어지는 상자가 머리에 안 닿게) */
const LOOK = 0.04;
/** 제자리까지 되감은 뒤 쉬는 틱 · 다시 톡으로 멈춘 뒤 쉬는 틱 · 멈출 때 '걸림 자리'로 붙는 거리(τ) */
const HOLD_FULL = 110, HOLD_STOP = 100, SNAP = 90, SNAP_UP = 90;
/** 모래시계를 뒤집을 때마다 드는 모래 한 줌(틱) — 아무거나 다 되감으면 금방 바닥난다 */
const PINCH = 25;
/** 주인공 몸(발에서 위로) · 반지름 */
const HCY = 0.05, HR = 0.036;
/** 톡이 물건을 잡는 거리 */
const TAP_R = 0.13;

type Kind = 'bridge' | 'pot' | 'barrel' | 'arrow' | 'raft' | 'log' | 'water' | 'balloon' | 'crate' | 'gear' | 'stack' | 'ferry' | 'sack';
const WAIT = 0, FWD = 1, REW = 2, HOLD = 3, DONE = 4, CHN = 5;

export interface Thing {
  id: number; k: Kind;
  /** 자기 시간 · 길의 끝 · 상태 · 쉬는 틱 */
  tau: number; dur: number; st: number; hold: number;
  /** 주인(배우 id, 없으면 -1) · 태운 배우 · 멈출 때 붙는 자리(τ, 없으면 -1) */
  owner: number; rider: number; dock: number;
  x: number; y: number; x2: number; y2: number; w: number; h: number; n: number;
  /** 구르는 것: τ마다 [x, y, 회전] */
  path: Float32Array | null;
  /** 크기(소리 높낮이) · 처음 움직인 틱 · 태어난 틱 · 부딪히면 다치나(0 = 물에 뜬 빈 통처럼 괜찮음) · 이번 되감기를 시작한 τ */
  big: number; moved: number; born: number; harm: number; rs: number;
  /** 제자리까지 되감은 뒤 쉬는 틱 (첫 판 다리는 넉넉히) · 다시 톡으로 멈춘 뒤 쉬는 틱 · 지난 틱에 옆으로 움직인 거리(나룻배) */
  hf: number; hs: number; dx: number;
  /** 연쇄: 이 물건을 밀어 움직이게 한 물건(-1 없음)과 그때의 τ — 그 물건이 이 τ 아래로 되감기면 이 물건도 함께 제자리로 · 되감기를 시작한 틱 */
  cause: number; ctau: number; rsT: number;
}

/** 배우 종류 · 역할 */
type AK = 'grandma' | 'farmer' | 'kid' | 'cat' | 'beaver' | 'mole' | 'goblin' | 'walker' | 'mom' | 'machine' | 'duck';
const R_DECO = 0, R_VILL = 1, R_ARCH = 2, R_WALK = 3, R_RIDER = 4;
export interface Actor {
  id: number; k: AK; role: number; x: number; y: number; x0: number; x1: number; vx: number;
  ride: number; ko: boolean; hurt: boolean; saved: boolean; t: number;
  /** 활: 다음 쏠 틱 · 간격 · 쏜 수 · 과녁(0 주인공, 1 마을 사람 번갈아) */
  next: number; per: number; shots: number; alt: number; pause: number;
}

const H_IDLE = 0, H_WALK = 1, H_WAIT = 2, H_FALL = 3, H_FAIL = 4, H_WIN = 5;
export interface Hero { x: number; y: number; st: number; on: number; vy: number; t: number; delay: number; waitT: number; why: string; fallY: number }

// ───────────────────────────── 판 정의 ─────────────────────────────
type Key = 'bridge' | 'pot' | 'barrel' | 'arrow' | 'stairs' | 'twice' | 'raft' | 'log' | 'water' | 'balloon' | 'ferry' | 'chain' | 'crate' | 'gear' | 'scale' | 'fire' | 'cross' | 'grand';
type StarK = 'goal' | 'sand' | 'safe' | 'rescue' | 'taps';
/** 판: news = 새 장치가 '무엇을 하는지'만(답은 말하지 않는다) · tip = 답(1~2판 안내와 막힘 힌트의 말) */
interface StageDef { key: Key; ch: number; name: string; news: string; tip: string; stars: StarK[]; fix: string; spot: string }
export const STAGES: StageDef[] = [
  { key: 'bridge', ch: 0, name: '무너진 다리', news: '', tip: '다리를 톡! 다리만 시간이 거꾸로', stars: ['goal'], fix: '분수', spot: '' },
  { key: 'pot', ch: 0, name: '떨어진 화분', news: '제자리까지 되감으면 주인이 받아 들어요', tip: '깨진 화분을 톡 — 할머니 손으로 쏙', stars: ['goal', 'sand'], fix: '꽃 화단', spot: '할머니' },
  { key: 'barrel', ch: 0, name: '굴러오는 술통', news: '술통 — 거꾸로 굴러도 부딪히면 쿵!', tip: '점선을 봐요: 누구에게 굴러가나?', stars: ['goal', 'safe', 'sand'], fix: '가로등', spot: '술통 수레' },
  { key: 'arrow', ch: 0, name: '도깨비 화살', news: '화살 — 되감으면 쏜 자리로 돌아가요', tip: '화살을 되감으면 도깨비가 꽈당', stars: ['goal', 'safe', 'sand'], fix: '풍차', spot: '도깨비' },
  { key: 'stairs', ch: 0, name: '와르르 계단', news: '되감는 중에 다시 톡 — 그 모양 그대로 멈춰요', tip: '상자가 계단 모양일 때 다시 톡!', stars: ['goal', 'safe', 'sand'], fix: '깃발 줄', spot: '상자 탑' },
  { key: 'twice', ch: 0, name: '갈 때 하나 올 때 둘', news: '연쇄 — 친 것을 되감으면 떨어진 것도 함께 와요', tip: '둘째 도깨비가 골목 앞에 서면 술통을 끝까지', stars: ['goal', 'taps', 'sand'], fix: '열기구', spot: '꽃바구니' },
  { key: 'raft', ch: 1, name: '떠내려간 뗏목', news: '뗏목 — 탄 아이도 함께 거꾸로', tip: '폭포에 닿기 전에 뗏목을 톡', stars: ['goal', 'rescue', 'sand'], fix: '물레방아', spot: '뗏목' },
  { key: 'log', ch: 1, name: '통나무 다리', news: '말뚝 — 되감는 통나무가 여기 오면 빛나요', tip: '통나무가 강을 가로지를 때 다시 톡!', stars: ['goal', 'safe', 'sand'], fix: '나룻배', spot: '말뚝' },
  { key: 'water', ch: 1, name: '터진 물탱크', news: '물탱크 — 쏟아진 물도 거꾸로', tip: '물이 차기 전에 물탱크를 톡', stars: ['goal', 'safe', 'sand'], fix: '새 떼', spot: '물탱크' },
  { key: 'balloon', ch: 1, name: '날아간 고양이', news: '풍선 — 날아간 것도 거꾸로 내려와요', tip: '풍선을 톡 — 아이 품으로', stars: ['goal', 'rescue', 'sand'], fix: '무지개', spot: '풍선' },
  { key: 'ferry', ch: 1, name: '나룻배 왕복', news: '나룻배 — 그냥 두면 태우고 건너가요', tip: '부엉이가 나루에 오면 나룻배를 톡', stars: ['goal', 'safe', 'sand'], fix: '연 날리기', spot: '나룻배' },
  { key: 'chain', ch: 1, name: '두 뗏목 맞추기', news: '뗏목 둘 — 되감기는 하나씩', tip: '하나를 붙인 뒤 얼른 다른 하나도', stars: ['goal', 'sand', 'taps'], fix: '물고기', spot: '뗏목 둘' },
  { key: 'crate', ch: 2, name: '상자 승강기', news: '승강기 — 타고 되감으면 함께 올라가요', tip: '승강기를 되감으며 날아오는 화살도 함께', stars: ['goal', 'safe', 'sand'], fix: '숫자판', spot: '망보는 도깨비' },
  { key: 'gear', ch: 2, name: '굴러간 톱니', news: '톱니 — 기계에 끼우면 다리가 내려와요', tip: '톱니가 도깨비를 쓰러뜨린 뒤에 되감아요', stars: ['goal', 'safe', 'sand'], fix: '큰 톱니', spot: '톱니 기계' },
  { key: 'scale', ch: 2, name: '저울 승강기', news: '저울 — 자루가 왼쪽 접시에 앉으면 오른쪽이 올라가요', tip: '부엉이가 접시에 타면 자루를 톡', stars: ['goal', 'safe', 'sand'], fix: '종', spot: '모래 자루' },
  { key: 'fire', ch: 2, name: '거꾸로 솟는 물', news: '불 — 거꾸로 솟는 물이 지나가면 꺼져요', tip: '등불 말고 물을 되감아요', stars: ['goal', 'sand', 'taps'], fix: '뻐꾸기', spot: '쏟아진 물' },
  { key: 'cross', ch: 2, name: '오르며 막기', news: '도깨비 둘 — 하나는 아래층 고양이를 노려요', tip: '승강기를 올리면서 화살 둘도 차례로', stars: ['goal', 'safe', 'sand'], fix: '시계추', spot: '도깨비 둘' },
  { key: 'grand', ch: 2, name: '시계탑 꼭대기', news: '마지막 — 배운 것 모두', tip: '무엇부터 되감을지 차례를 봐요', stars: ['goal', 'safe', 'sand'], fix: '시계 바늘', spot: '' },
];
export const STAGE_COUNT = STAGES.length;
const CH_NAME = ['장터', '강가', '시계탑'];
const CH_SUB = ['부서진 것을 되돌려요', '떠내려간 것을 되돌려요', '거꾸로 타고 올라가요'];

export interface Level {
  key: Key; ch: number; ground: number[]; things: Thing[]; actors: Actor[]; sand: number; par: number; stars: StarK[];
  gearX: number; gearY: number; heroX: number; heroY: number; heroDelay: number; fallY: number;
  /** 물길(세로 강·도랑) · 마른 웅덩이 · 승강기 구멍 · 도개교(기계가 움직이면 내려옴) */
  canal: [number, number] | null; basin: [number, number] | null; shaft: [number, number, number, number] | null; gate: [number, number, number] | null;
  /** 저울 [받침 x, 받침 y, 왼 접시 x, 오른 접시 x, 접시 폭, 오른 접시 아래 y, 위 y] · 불 [x0, x1, y] · 되감기 횟수 별 */
  scale: number[] | null; fire: number[] | null; tapsPar: number;
  /** 판 장식(골목·수레·발코니·탑 위치) */
  deco: Record<string, number>;
  /** 복원이 준 능력: 되감기 빠르기(자기 시간 틱/틱 — 풍차 뒤 3) · 한꺼번에 되감을 수 있는 물건 수(물레방아 뒤 2) */
  rw: number; multi: number;
}

// ───────────────────────────── 물건의 자세 (τ의 함수) ─────────────────────────────
/** 자세 한 벌(전역 하나를 돌려쓴다 — 할당 없음) */
const P = { x: 0, y: 0, a: 0, s: 0 };
const smooth = (q: number) => (q <= 0 ? 0 : q >= 1 ? 1 : q * q * (3 - 2 * q));
// 다리
const BR_FALL0 = 14, BR_GAP = 7, BR_DEPTH = 0.13;
const brFall = (i: number) => BR_FALL0 + i * BR_GAP;
const brLand = Math.sqrt((2 * BR_DEPTH) / G);
/** 다리 판자 i의 처짐·기울기 */
function plank(th: Thing, i: number, tau: number) {
  const pw = (th.x2 - th.x) / th.n, cx = th.x + (i + 0.5) * pw;
  P.x = cx;
  P.y = th.y;
  P.a = 0;
  const f = brFall(i);
  if (tau < f) {
    if (tau > 0) P.a = Math.sin(tau * 1.9 + i) * 0.03 * (tau / f), (P.y += Math.abs(Math.sin(tau * 2.3 + i)) * 0.003);
    return P;
  }
  const dt = tau - f, sg = i % 2 ? 1 : -1;
  if (dt < brLand) {
    P.y += 0.5 * G * dt * dt;
    P.a = sg * 0.07 * dt;
    P.x += sg * 0.0008 * dt;
  } else {
    const fl = dt - brLand;
    P.y += BR_DEPTH + fl * 0.0007 + Math.sin(fl * 0.2 + i) * 0.004;
    P.a = sg * (0.07 * brLand + fl * 0.004);
    P.x += sg * 0.0008 * brLand;
  }
  return P;
}
// 화분
const POT_TT = 40;
/** 흔들리다 떨어지기까지 (매단 꽃바구니는 짧게 — th.w) */
const potTT = (th: Thing) => (th.w > 0 ? th.w : POT_TT);
const potFall = (th: Thing) => Math.sqrt((2 * (th.y2 - th.y)) / G);
const potHit = (th: Thing) => potTT(th) + potFall(th);
// 뗏목·통나무 흘러가기
const RAFT_V = 0.0009, LOG_V = 0.0008;
const LOG_CHOP = 44, LOG_FALL = 30, LOG_LIE = LOG_CHOP + LOG_FALL;
// 물탱크
const WAT_CRACK = 16, WAT_FILL = 84;
const water = (_th: Thing, tau: number) => smooth((tau - WAT_CRACK) / WAT_FILL);
// 상자
const CR_FRAY = 24;
/** 승강기(느린 상자, n=1): 감개가 풀려 천천히 내려온다 */
const LIFT_V = 0.0018;
const crFall = (th: Thing) => (th.n === 1 ? (th.y2 - th.y) / LIFT_V : Math.sqrt((2 * (th.y2 - th.y)) / G));
// 풍선
const BAL_V = 0.0011;

// 와르르 계단: 과일 상자 탑이 옆으로 무너지며 잠깐 계단 모양이 된다
const ST_N = 4, ST_DX = 0.072, ST_CH = 0.05, ST_CW = 0.1, ST_SLUMP = 50, ST_STAG = 5;
/** 상자 k(0 = 맨 아래)의 윗면 가운데 */
function stackCrate(th: Thing, k: number, tau: number) {
  const q = smooth(Math.min(1, tau / ST_SLUMP));
  P.x = th.x + k * ST_DX * q;
  P.y = th.y - (k + 1) * ST_CH;
  P.a = tau > 0 && tau < ST_SLUMP ? Math.sin(tau * 0.45 + k) * 0.025 * (1 - q) : 0;
  if (tau > ST_SLUMP && k > 0) {
    const dt = tau - ST_SLUMP - (ST_N - 1 - k) * ST_STAG;
    if (dt > 0) {
      const H0 = k * ST_CH, drop = Math.min(H0, 0.5 * G * dt * dt);
      P.y += drop;
      P.x += Math.min(1, dt / 18) * k * 0.034;
      P.a = drop < H0 ? (drop / H0) * 0.35 * (k % 2 ? 1 : -1) : 0;
    }
  }
  return P;
}
const stackDur = () => Math.ceil(ST_SLUMP + (ST_N - 1) * ST_STAG + Math.sqrt((2 * (ST_N - 1) * ST_CH) / G) + 6);
// 나룻배: 줄을 따라 왼쪽 나루 → 오른쪽 나루
const FERRY_V = 0.0016;
// 모래 자루: 저울 왼쪽 접시에서 미끄러져 바닥으로
const SK_SLIP = 12;
const skFall = (th: Thing) => Math.sqrt((2 * (th.y2 - th.y)) / G);

/** 물건의 대표 자세(톡 잡기·위험·그리기) */
function pose(th: Thing, tau: number) {
  P.a = 0;
  P.s = 1;
  switch (th.k) {
    case 'bridge': {
      // 가운데 판자들의 평균
      let sx = 0, sy = 0;
      for (let i = 0; i < th.n; i++) (plank(th, i, tau), (sx += P.x), (sy += P.y));
      P.x = sx / th.n;
      P.y = sy / th.n + 0.01;
      P.a = 0;
      break;
    }
    case 'pot': {
      P.x = th.x;
      const tt = potTT(th);
      if (tau <= tt) {
        P.y = th.y - 0.035;
        P.a = Math.sin(tau * 0.42) * 0.32 * (tau / tt);
      } else {
        const dt = tau - tt, ft = potFall(th);
        if (dt < ft) {
          P.y = th.y - 0.035 + 0.5 * G * dt * dt;
          P.a = 0.32 + dt * 0.12;
        } else (P.y = th.y2 - 0.02), (P.a = 0);
      }
      break;
    }
    case 'barrel':
    case 'gear': {
      const p = th.path!, n = p.length / 3 - 1, i = Math.max(0, Math.min(n, Math.floor(tau)));
      P.x = p[i * 3];
      P.y = p[i * 3 + 1];
      P.a = p[i * 3 + 2];
      break;
    }
    case 'arrow': {
      const q = Math.min(1, tau / th.n);
      P.x = th.x + (th.x2 - th.x) * q;
      P.y = th.y + (th.y2 - th.y) * q - th.h * 4 * q * (1 - q);
      const dx = (th.x2 - th.x) / th.n, dy = (th.y2 - th.y) / th.n - (th.h * 4 * (1 - 2 * q)) / th.n;
      P.a = Math.atan2(dy, dx);
      break;
    }
    case 'raft': {
      P.x = th.x + Math.sin(tau * 0.05) * 0.004;
      P.y = th.y + RAFT_V * tau;
      P.a = Math.sin(tau * 0.07) * 0.03;
      break;
    }
    case 'log': {
      if (tau < LOG_CHOP) {
        P.x = th.x;
        P.y = th.y;
        P.a = tau > 4 ? Math.sin(tau * 1.3) * 0.025 : 0;
      } else if (tau < LOG_LIE) {
        const q = (tau - LOG_CHOP) / LOG_FALL;
        P.x = th.x;
        P.y = th.y;
        P.a = (Math.PI / 2) * q * q;
      } else {
        P.x = th.x;
        P.y = th.y + LOG_V * (tau - LOG_LIE);
        P.a = Math.PI / 2 + Math.sin((tau - LOG_LIE) * 0.04) * 0.02;
      }
      break;
    }
    case 'water': {
      P.x = (th.x2 + th.y2) / 2;
      P.y = LYof(th);
      P.s = water(th, tau);
      break;
    }
    case 'balloon': {
      const d = tau;
      P.x = th.x + d * 0.0009 + Math.sin(d * 0.045) * 0.02;
      P.y = th.y - d * BAL_V - Math.min(d, 20) * 0.0006;
      P.a = Math.sin(d * 0.06) * 0.15;
      break;
    }
    case 'stack': {
      let sx = 0, sy = 0;
      for (let k = 0; k < ST_N; k++) (stackCrate(th, k, tau), (sx += P.x), (sy += P.y));
      P.x = sx / ST_N;
      P.y = sy / ST_N;
      P.a = 0;
      break;
    }
    case 'ferry': {
      P.x = th.x + Math.min(th.x2 - th.x, FERRY_V * tau);
      P.y = th.y + Math.sin(tau * 0.08) * 0.002;
      P.a = Math.sin(tau * 0.06) * 0.015;
      break;
    }
    case 'sack': {
      if (tau <= SK_SLIP) (P.x = th.x), (P.y = th.y), (P.a = Math.sin(tau * 0.9) * 0.08 * (tau / SK_SLIP));
      else {
        const dt = tau - SK_SLIP, ft = skFall(th);
        P.x = th.x + Math.min(dt, ft) * 0.0016;
        P.y = dt < ft ? th.y + 0.5 * G * dt * dt : th.y2;
        P.a = Math.min(dt, ft) * 0.05;
      }
      break;
    }
    case 'crate': {
      P.x = th.x;
      if (tau <= CR_FRAY) (P.y = th.y), (P.a = Math.sin(tau * 0.8) * 0.04 * (tau / CR_FRAY));
      else {
        const dt = tau - CR_FRAY, ft = crFall(th);
        P.y = dt < ft ? th.y + (th.n === 1 ? ((th.y2 - th.y) * dt) / ft : 0.5 * G * dt * dt) : th.y2;
        P.a = th.n === 1 && dt < ft ? Math.sin(tau * 0.3) * 0.01 : 0;
      }
      break;
    }
  }
  return P;
}
const LYof = (th: Thing) => th.h;

// ───────────────────────────── 세계 ─────────────────────────────
export interface World {
  t: number; L: Level; th: Thing[]; ac: Actor[]; hero: Hero; sand: number; used: number; rew: number; nid: number;
  hurt: number; saved: number; ko: number; mach: number; taps: number;
  /** 저울 기울기(1 = 오른쪽 접시가 위) · 불(1 = 타는 중) */
  tilt: number; fire: number;
}
interface Ev { t: number; kind: string; x: number; y: number; v: number; id: number; text?: string }
type Sink = ((kind: string, x: number, y: number, v?: number, id?: number) => void) | null;

const cloneT = (q: Thing): Thing => ({ ...q });
const cloneA = (q: Actor): Actor => ({ ...q });
export function cloneWorld(W: World): World {
  return { ...W, th: W.th.map(cloneT), ac: W.ac.map(cloneA), hero: { ...W.hero } };
}
function newWorld(L: Level): World {
  const W: World = {
    t: 0, L, th: L.things.map(cloneT), ac: L.actors.map(cloneA), sand: L.sand, used: 0, rew: -1, nid: 100, hurt: 0, saved: 0, ko: 0, mach: -1, taps: 0, tilt: L.scale ? 1 : 0, fire: L.fire ? 1 : 0,
    hero: { x: L.heroX, y: L.heroY, st: H_IDLE, on: -1, vy: 0, t: 0, delay: L.heroDelay, waitT: 0, why: '', fallY: L.fallY },
  };
  return W;
}
const thingOf = (W: World, id: number) => W.th.find((q) => q.id === id);
const actorOf = (W: World, id: number) => W.ac.find((q) => q.id === id);

/** 화분 조각·홍수가 막는 길 [x0, x1, y] */
function blockOf(th: Thing): [number, number, number] | null {
  if (th.st === DONE) return null;
  if (th.k === 'pot' && th.n === 0 && th.tau >= potHit(th) - 1) return [th.x - 0.065, th.x + 0.065, th.y2];
  if (th.k === 'water' && water(th, th.tau) > 0.18) return [th.x2, th.y2, th.h];
  // 상자 탑: 우뚝 선 탑·와르르 쌓인 더미는 못 넘는다 (계단 모양일 때만 오른다)
  if (th.k === 'stack' && (th.tau <= 3 || th.tau >= ST_SLUMP + 4)) return [th.x - ST_CW / 2, th.x + (ST_N - 1) * ST_DX + ST_CW / 2, th.y];
  return null;
}
/** 위험한 동그라미(움직이는 동안) — 앞으로든 거꾸로든 */
const D = { x: 0, y: 0, r: 0 };
function dangerOf(th: Thing): typeof D | null {
  if (th.st === DONE || th.st === WAIT || !th.harm) return null;
  const t = th.tau;
  if (th.st === HOLD && th.k !== 'arrow') return null;
  switch (th.k) {
    case 'pot': {
      if (t < potTT(th) + 4 || t > potHit(th)) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y - 0.03, D.r = 0.035;
      return D;
    }
    case 'barrel': {
      const n = th.path!.length / 3 - 1;
      if (t < 6 || t >= n) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y - 0.034, D.r = 0.034;
      return D;
    }
    case 'gear': {
      const n = th.path!.length / 3 - 1;
      if (t < 14 || t >= n) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y - 0.055, D.r = 0.05;
      return D;
    }
    case 'arrow': {
      if (th.st === HOLD || t < th.n * 0.3 || t >= th.n) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y, D.r = 0.022;
      return D;
    }
    case 'crate': {
      if (t <= CR_FRAY + 2 || t >= CR_FRAY + crFall(th)) return null;
      pose(th, t);
      D.x = P.x, D.y = P.y + th.h * 0.75, D.r = th.w * 0.36;
      return D;
    }
  }
  return null;
}

/** 발판들 [x0, x1, y, id, 한 번에 오를 수 있는 높이] — 땅(id -1) · 도개교(-2) · 저울 접시(-3) · 물건 */
const STAIR = 0.065;
function supports(W: World, out: number[]) {
  out.length = 0;
  const g = W.L.ground;
  for (let i = 0; i < g.length; i += 3) out.push(g[i], g[i + 1], g[i + 2], -1, STEP);
  const gate = W.L.gate;
  if (gate && W.mach >= 0 && W.t - W.mach >= 56) out.push(gate[0], gate[1], gate[2], -2, STEP);
  const sc = W.L.scale;
  if (sc) out.push(sc[3] - sc[4] / 2, sc[3] + sc[4] / 2, sc[5] + (sc[6] - sc[5]) * W.tilt, -3, STEP);
  for (const th of W.th) {
    if (th.st === DONE && th.k !== 'raft' && th.k !== 'log') continue;
    if (th.k === 'bridge') {
      const pw = (th.x2 - th.x) / th.n;
      for (let i = 0; i < th.n; i++) if (th.tau <= brFall(i) + 1) out.push(th.x + i * pw - (i === 0 ? 0.004 : 0), th.x + (i + 1) * pw + (i === th.n - 1 ? 0.004 : 0), th.y, th.id, STEP);
    } else if (th.k === 'raft') {
      if (th.tau < th.dur) out.push(th.x - th.w / 2, th.x + th.w / 2, th.y + RAFT_V * th.tau, th.id, STEP);
    } else if (th.k === 'log') {
      if (th.tau >= LOG_LIE && th.tau < th.dur) out.push(th.x - 0.02, th.x2, th.y + LOG_V * (th.tau - LOG_LIE), th.id, STEP);
    } else if (th.k === 'crate') {
      pose(th, th.tau);
      out.push(th.x - th.w / 2, th.x + th.w / 2, P.y, th.id, STEP);
    } else if (th.k === 'ferry') {
      pose(th, th.tau);
      out.push(P.x - th.w / 2, P.x + th.w / 2, th.y, th.id, STEP);
    } else if (th.k === 'stack') {
      for (let k = 0; k < ST_N; k++) {
        stackCrate(th, k, th.tau);
        if (th.tau > 3 && th.tau < ST_SLUMP + 4) out.push(P.x - ST_CW / 2, P.x + ST_CW / 2, P.y, 1e6 + th.id * 10 + k, STAIR);
      }
    }
  }
}
/** 발판 id → 물건 id (상자 탑은 상자마다 따로) */
const supThing = (id: number) => (id >= 1e6 ? Math.floor((id - 1e6) / 10) : id);
/** 흘러가는 중인 뗏목·통나무·나룻배엔 올라타지 않는다 (멈춰 있을 때만) */
function boardable(W: World, id: number): boolean {
  if (id < 0) return true;
  const th = thingOf(W, supThing(id));
  if (!th || (th.k !== 'raft' && th.k !== 'log' && th.k !== 'ferry')) return true;
  return th.st !== FWD || th.tau >= th.dur;
}
const SUP: number[] = [];

/** 사건 τ 경계(앞으로 지날 때 · 거꾸로 지날 때) */
function crossEv(_W: World, th: Thing, t0: number, t1: number, E: Sink) {
  if (!E || t0 === t1) return;
  const up = t1 > t0, lo = Math.min(t0, t1), hi = Math.max(t0, t1);
  const at = (q: number) => q > lo && q <= hi;
  const atR = (q: number) => q >= lo && q < hi;
  pose(th, t1);
  const x = P.x, y = P.y;
  switch (th.k) {
    case 'bridge':
      if (up && at(1)) E('creak', x, th.y, 0, th.id);
      for (let i = 0; i < th.n; i++) {
        const q = brFall(i) + brLand;
        if (up && at(q)) (plank(th, i, t1), E('plankSplash', P.x, th.y + BR_DEPTH, i, th.id));
        if (!up && atR(brFall(i))) (plank(th, i, t1), E('plankMend', P.x, th.y, i, th.id));
        if (!up && atR(q)) (plank(th, i, t1), E('plankLift', P.x, th.y + BR_DEPTH, i, th.id));
      }
      break;
    case 'pot': {
      const q = potHit(th);
      if (up && at(potTT(th))) E('potFall', x, y, 0, th.id);
      if (up && at(q)) E('potBreak', th.x, th.y2, 0, th.id);
      if (!up && atR(q)) E('potMend', th.x, th.y2, 0, th.id);
      break;
    }
    case 'barrel':
    case 'gear': {
      const n = th.path!.length / 3 - 1;
      if (up && at(n)) E(th.k === 'gear' ? 'gearStop' : 'barrelSmash', x, y, 0, th.id);
      if (!up && atR(n)) E(th.k === 'gear' ? 'gearUnstop' : 'barrelMend', x, y, 0, th.id);
      break;
    }
    case 'arrow':
      if (up && at(th.n)) E('arrowStick', x, y, 0, th.id);
      if (!up && atR(th.n)) E('arrowPull', x, y, 0, th.id);
      break;
    case 'raft':
      if (up && at(th.dur)) E('weir', x, y, 0, th.id);
      break;
    case 'log':
      if (up && at(LOG_CHOP)) E('treeFall', th.x, th.y, 0, th.id);
      if (up && at(LOG_LIE)) E('logLand', (th.x + th.x2) / 2, th.y, 0, th.id);
      if (!up && atR(LOG_CHOP)) E('treeUp', th.x, th.y, 0, th.id);
      if (!up && atR(LOG_LIE)) E('logLift', (th.x + th.x2) / 2, th.y, 0, th.id);
      break;
    case 'water':
      if (up && at(WAT_CRACK)) E('burst', th.x, th.y, 0, th.id);
      break;
    case 'crate': {
      const q = CR_FRAY + crFall(th);
      if (up && at(CR_FRAY)) E('crateDrop', x, y, 0, th.id);
      if (up && at(q)) E('crateLand', th.x, th.y2, 0, th.id);
      if (!up && atR(q)) E('crateLift', th.x, th.y2, 0, th.id);
      break;
    }
    case 'balloon':
      if (up && at(th.dur)) E('balloonGone', x, y, 0, th.id);
      break;
    case 'stack':
      if (up && at(1)) E('stackTip', th.x, th.y - 0.2, 0, th.id);
      if (up && at(ST_SLUMP + 6)) E('stackFall', x, th.y, 0, th.id);
      if (!up && atR(ST_SLUMP + 2)) E('stackStairs', x, y, 0, th.id);
      break;
    case 'ferry':
      if (up && at(1)) E('ferryGo', x, y, 0, th.id);
      if (up && at(Math.ceil((th.x2 - th.x) / FERRY_V))) E('ferryArrive', x, y, 0, th.id);
      break;
    case 'sack': {
      const q = SK_SLIP + skFall(th);
      if (up && at(SK_SLIP)) E('sackSlip', x, y, 0, th.id);
      if (up && at(q)) E('sackLand', x, th.y2, 0, th.id);
      if (!up && atR(SK_SLIP)) E('sackBack', th.x, th.y, 0, th.id);
      break;
    }
  }
}

/** 지금 되감는 물건(가장 나중에 시작한 것) 다시 찾기 — 둘을 함께 되감을 수 있다 */
function fixRew(W: World) {
  let best = -1, bt = -1e9;
  for (const q of W.th) if (q.st === REW && q.rsT > bt) (bt = q.rsT), (best = q.id);
  W.rew = best;
}
function rewN(W: World): number {
  let n = 0;
  for (const q of W.th) if (q.st === REW) n++;
  return n;
}
/** 제자리까지 되감았다 */
function origin(W: World, th: Thing, E: Sink) {
  th.tau = 0;
  pose(th, 0);
  if (!arrive(W, th, E)) {
    th.st = HOLD;
    th.hold = th.hf;
    E?.('origin', P.x, P.y, 0, th.id);
  }
  fixRew(W);
}
/** 연쇄로 끌려 제자리까지 왔다: 주인이 있으면 받고, 없으면 밀어 준 물건이 다시 올 때까지 가만히 */
function chainHome(W: World, th: Thing, E: Sink) {
  th.tau = 0;
  pose(th, 0);
  if (!arrive(W, th, E)) {
    th.st = WAIT;
    th.hold = 1;
    E?.('chainHome', P.x, P.y, 0, th.id);
  }
}
/** 제자리에 닿았을 때: 태운 배우 구하기 · 주인이 받기(영영 해결) — 해결되면 true */
function arrive(W: World, th: Thing, E: Sink): boolean {
  pose(th, 0);
  const x = P.x, y = P.y;
  if (th.rider >= 0) {
    const r = actorOf(W, th.rider);
    if (r && !r.saved && !r.hurt) {
      r.saved = true;
      r.ride = -1;
      r.t = W.t;
      W.saved++;
      th.rider = -1;
      E?.('rescue', r.x, r.y, 0, r.id);
    }
  }
  if (th.owner >= 0) {
    const o = actorOf(W, th.owner)!;
    if (o.k === 'goblin' || o.k === 'walker') {
      if (!o.ko) (o.ko = true), (o.t = W.t), W.ko++, E?.('ko', o.x, o.y, 1, o.id);
      th.st = DONE;
      E?.('arrowHome', x, y, 0, th.id);
      return true;
    }
    th.st = DONE;
    o.t = W.t;
    if (o.k === 'machine') (W.mach = W.t), E?.('machine', o.x, o.y, 0, th.id);
    else E?.('catch', o.x, o.y - 0.06, 0, th.id);
    return true;
  }
  return false;
}
/** 걸림 자리(말뚝)에 걸 수 있나: 그 자리로 다가오는 중(조금 앞)이거나, 이번 되감기에서 막 지나쳤을 때 */
const canDock = (th: Thing) => th.dock >= 0 && ((th.tau >= th.dock && th.tau <= th.dock + SNAP) || (th.tau < th.dock && th.rs > th.dock && th.tau >= th.dock - SNAP_UP));
/** 되감기를 멈춘다 (다시 톡 · 모래 바닥) */
function stopRew(W: World, th: Thing, E: Sink, why: number) {
  th.st = HOLD;
  th.hold = th.hs;
  fixRew(W);
  if (canDock(th)) {
    th.tau = th.dock;
    pose(th, th.tau);
    E?.('dock', P.x, P.y, 0, th.id);
  } else {
    pose(th, th.tau);
    E?.(why ? 'empty' : 'stop', P.x, P.y, 0, th.id);
  }
}
/** 톡 한 물건에 하는 일 (세계·봇·미리 보기 공용). 돌려주는 값: 0 아무 일 없음 · 1 되감기 시작 · 2 멈춤 */
function tapThing(W: World, th: Thing, E: Sink): number {
  if (th.st === REW) return stopRew(W, th, E, 0), 2;
  if (th.st === DONE || th.st === CHN) return 0;
  pose(th, th.tau);
  if (th.tau <= 0) return E?.('notyet', P.x, P.y, 0, th.id), 0;
  if (W.sand <= 0) return E?.('nosand', P.x, P.y, 0, th.id), 0;
  // 한꺼번에 되감을 수 있는 수를 넘으면 가장 먼저 시작한 것을 멈춘다
  if (rewN(W) >= W.L.multi) {
    let o: Thing | null = null;
    for (const q of W.th) if (q.st === REW && (!o || q.rsT < o.rsT)) o = q;
    if (o) stopRew(W, o, E, 0);
  }
  th.st = REW;
  th.rs = th.tau;
  th.rsT = W.t;
  W.rew = th.id;
  W.taps++;
  const pinch = Math.min(PINCH, W.sand);
  W.sand -= pinch;
  W.used += pinch;
  E?.('rew', P.x, P.y, th.big, th.id);
  if (rewN(W) >= 2) E?.('twin', P.x, P.y, 0, th.id);
  return 1;
}

/** 부엉이가 지금 타고 올라가는 중인가 (되감는 승강기 · 올라가는 저울 접시) — 망보는 도깨비가 깨는 때 */
function riding(W: World): boolean {
  const H = W.hero;
  if (H.on === -3 && W.L.scale) {
    const sk = W.th.find((q) => q.k === 'sack');
    return !!sk && sk.tau <= 6 && W.tilt < 0.9;
  }
  const fr = H.on >= 0 ? thingOf(W, supThing(H.on)) : undefined;
  return !!fr && fr.k === 'crate' && fr.st === REW && fr.tau > 20;
}
/** 도깨비가 쏘는 화살 */
function shoot(W: World, g: Actor, E: Sink) {
  const H = W.hero, tgtKid = (g.alt === 1 && g.shots % 2 === 1) || g.alt === 3;
  // 망보는 도깨비(alt 2): 승강기에 탄 부엉이가 올라올 자리를 노린다 (빠른 화살)
  const F = g.alt >= 2 ? 72 : 104;
  let tx: number, ty: number;
  const kid = tgtKid ? W.ac.find((a) => a.role === R_VILL && !a.hurt) : undefined;
  const lift = H.on >= 0 ? thingOf(W, supThing(H.on)) : undefined;
  const sc = W.L.scale;
  if (kid) (tx = kid.x), (ty = kid.y);
  else if (sc && H.on === -3 && g.alt === 2) {
    // 저울 접시: 다 오르면 걸어 나간다
    const rem = (1 - W.tilt) / 0.013, xTop = Math.max(H.x, sc[3] + sc[4] / 2 - LOOK - 0.004), cur = sc[5] + (sc[6] - sc[5]) * W.tilt;
    if (rem >= F) (tx = xTop), (ty = cur + ((sc[6] - cur) * F) / rem);
    else (tx = Math.min(0.95, xTop + V * (F - rem) * 0.97)), (ty = sc[6]);
  } else if (lift && lift.k === 'crate' && lift.st === REW) {
    // 부엉이는 오르는 동안 승강기 오른쪽 끝까지 걸어가 서 있다가, 다 오르면 걸어 나간다
    const rem = lift.tau / W.L.rw, xTop = Math.max(H.x, lift.x + lift.w / 2 - LOOK - 0.004);
    if (rem >= F) (pose(lift, lift.tau - W.L.rw * F), (tx = xTop), (ty = P.y));
    else (tx = Math.min(0.95, xTop + V * (F - rem) * 0.97)), (ty = lift.y);
  } else {
    const walking = H.st === H_WALK || H.st === H_IDLE;
    const fr = H.on >= 0 ? thingOf(W, supThing(H.on)) : undefined;
    const lead = walking ? V * F * 0.97 : fr && fr.k === 'ferry' && fr.st === FWD ? Math.min(FERRY_V * F, fr.x2 - fr.x - FERRY_V * fr.tau) : 0;
    tx = Math.max(0.06, Math.min(0.95, H.x + lead));
    ty = H.y;
  }
  const bx = g.x - 0.03, by = g.y - 0.06;
  const th: Thing = {
    id: W.nid++, k: 'arrow', tau: 0, dur: F, st: FWD, hold: 0, owner: g.id, rider: -1, dock: -1,
    x: bx, y: by, x2: tx, y2: ty - 0.035, w: 0.08, h: 0.16 + Math.abs(tx - bx) * 0.12, n: F, path: null, big: 0.4, moved: W.t, born: W.t, harm: 1, rs: 0, hf: HOLD_FULL, hs: HOLD_STOP, dx: 0, cause: -1, ctau: 0, rsT: 0,
  };
  W.th.push(th);
  g.shots++;
  E?.('shoot', bx, by, 0, th.id);
}

/** 세계 한 틱. E가 있으면 사건을 알린다(봇·미리 보기는 null) */
export function stepWorld(W: World, E: Sink) {
  W.t++;
  const H = W.hero;
  // ── 물건
  for (const th of W.th) {
    const t0 = th.tau;
    const fx0 = th.k === 'ferry' ? Math.min(th.x2 - th.x, FERRY_V * th.tau) : 0;
    // 연쇄: 밀어 준 물건이 그 자리를 지나면 움직이기 시작하고, 그 물건이 그 자리 앞으로 되감기면 함께 끌려 돌아간다
    if (th.cause >= 0 && th.st !== DONE && th.st !== REW && th.st !== CHN) {
      const c = thingOf(W, th.cause);
      if (c) {
        if (th.st === WAIT && th.tau <= 0) {
          if (c.tau >= th.ctau && c.st !== REW && c.st !== CHN) {
            th.st = FWD;
            th.moved = W.t;
            pose(th, 0);
            E?.('knock', P.x, P.y, 0, th.id);
          }
        } else if (th.tau > 0 && c.tau < th.ctau) {
          th.st = CHN;
          pose(th, th.tau);
          E?.('chain', P.x, P.y, th.cause, th.id);
        }
      }
    }
    switch (th.st) {
      case WAIT:
        if (th.cause < 0 && --th.hold <= 0) (th.st = FWD), (th.moved = W.t);
        break;
      case HOLD:
        if (--th.hold <= 0) th.st = th.cause >= 0 && th.tau <= 0 ? WAIT : FWD;
        break;
      case FWD:
        if (th.tau < th.dur) th.tau++;
        break;
      case REW: {
        const rw = W.L.rw;
        // 주인공이 올라탄 뗏목·통나무는 말뚝(걸림 자리)을 지나치지 않고 척 걸린다
        if (th.dock >= 0 && supThing(H.on) === th.id && th.tau > th.dock && th.tau - rw <= th.dock) {
          th.tau = th.dock + 1;
          stopRew(W, th, E, 0);
          break;
        }
        th.tau = Math.max(0, th.tau - rw);
        W.sand--;
        W.used++;
        if (th.tau <= 0) origin(W, th, E);
        else if (W.sand <= 0) stopRew(W, th, E, 1);
        break;
      }
      case CHN:
        th.tau = Math.max(0, th.tau - W.L.rw);
        if (th.tau <= 0) chainHome(W, th, E);
        break;
    }
    if (th.tau !== t0) crossEv(W, th, t0, th.tau, E);
    if (th.k === 'ferry') th.dx = Math.min(th.x2 - th.x, FERRY_V * th.tau) - fx0;
    // 끝까지 가 버리면 태운 배우는 위험
    if (th.rider >= 0 && th.st === FWD && th.tau >= th.dur) {
      const r = actorOf(W, th.rider);
      if (r && !r.hurt && !r.saved) (r.hurt = true), (r.t = W.t), W.hurt++, E?.('lost', r.x, r.y, 0, r.id);
      th.rider = -1;
    }
  }
  // 오래된 화살(꽂힌 것)은 치운다 (세계를 가볍게)
  if (W.th.length > 14) W.th = W.th.filter((q) => !(q.k === 'arrow' && (q.st === DONE || (q.tau >= q.dur && W.t - q.born > 600))));
  // 저울: 모래 자루가 왼쪽 접시에 있으면 오른쪽 접시가 올라간다 (지금 시간으로 천천히)
  if (W.L.scale) {
    const sk = W.th.find((q) => q.k === 'sack');
    const on = sk ? sk.tau <= 6 : false, d = (on ? 1 : 0) - W.tilt;
    W.tilt += Math.max(-0.013, Math.min(0.013, d));
  }
  // 불: 되감기로 거꾸로 솟는 물이 지나가면 꺼진다
  if (W.fire && W.L.fire) {
    const f = W.L.fire;
    for (const th of W.th) {
      if (th.k !== 'pot' || th.n !== 1 || th.st !== REW) continue;
      pose(th, th.tau);
      if (P.x > f[0] - 0.03 && P.x < f[1] + 0.03 && P.y > f[2] - 0.16 && P.y < f[2] + 0.01) {
        W.fire = 0;
        E?.('steam', (f[0] + f[1]) / 2, f[2] - 0.04, 0, th.id);
      }
    }
  }
  // ── 배우
  for (const a of W.ac) {
    if (a.role === R_WALK && !a.ko && a.vx > 0 && W.t >= a.next && a.x !== a.x0 && !(Math.abs(a.x - H.x) < 0.09 && Math.abs(a.y - H.y) < 0.05)) {
      const d = a.x0 - a.x;
      a.x += Math.sign(d) * Math.min(Math.abs(d), a.vx);
      if (a.x === a.x0) E?.('guard', a.x, a.y, 0, a.id);
    }
    if (a.role === R_RIDER && a.ride >= 0 && !a.hurt) {
      const th = thingOf(W, a.ride);
      if (th) {
        pose(th, th.tau);
        if (th.k === 'raft') (a.x = P.x - 0.03), (a.y = P.y);
        else if (th.k === 'balloon') (a.x = P.x), (a.y = P.y + 0.13);
      }
    }
    if (a.role === R_ARCH && !a.ko && H.st !== H_WIN && H.st !== H_FAIL && W.t >= a.next) {
      if (a.alt >= 2 && a.shots === 0) {
        // 망보는 도깨비: 부엉이가 타고 올라오기 시작하면 깨어나 쏜다 (그 뒤로는 per마다) — alt 3은 마을 사람을 노린다
        if (riding(W)) (E?.('wake', a.x, a.y - 0.1, a.alt, a.id), shoot(W, a, E), (a.next = W.t + a.per));
      } else {
        shoot(W, a, E);
        a.next += a.per;
      }
    }
  }
  // ── 주인공
  stepHero(W, E);
  // ── 부딪힘
  for (const th of W.th) {
    const d = dangerOf(th);
    if (!d) continue;
    if ((H.st === H_WALK || H.st === H_WAIT || H.st === H_IDLE) && H.on !== th.id && Math.hypot(H.x - d.x, H.y - HCY - d.y) < d.r + HR) {
      H.st = H_FAIL;
      H.why = th.k === 'arrow' ? '화살에 콕!' : th.k === 'pot' ? '화분에 쿵!' : th.k === 'gear' ? '톱니에 데굴!' : th.k === 'crate' ? '상자에 쿵!' : '술통에 데굴!';
      H.t = W.t;
      E?.('bonk', H.x, H.y - HCY, 0, th.id);
      continue;
    }
    for (const a of W.ac) {
      if (a.hurt || a.ko || a.saved || (a.role !== R_VILL && a.role !== R_ARCH && a.role !== R_WALK)) continue;
      if (th.k === 'arrow' && th.owner === a.id) continue;
      if (Math.hypot(a.x - d.x, a.y - 0.04 - d.y) < d.r + 0.034) {
        if (a.role === R_VILL) (a.hurt = true), (a.t = W.t), W.hurt++, E?.('hurt', a.x, a.y - 0.04, 0, a.id);
        else (a.ko = true), (a.t = W.t), W.ko++, E?.('ko', a.x, a.y, 0, a.id);
        if (th.k === 'arrow' && th.st !== REW) (th.st = DONE);
      }
    }
  }
  // 물: 웅덩이에 있던 마을 사람은 젖는다
  for (const th of W.th) {
    if (th.k !== 'water' || th.st === DONE || water(th, th.tau) < 0.5) continue;
    for (const a of W.ac) if (a.role === R_VILL && !a.hurt && a.x > th.x2 && a.x < th.y2) (a.hurt = true), (a.t = W.t), W.hurt++, E?.('wet', a.x, a.y - 0.03, 0, a.id);
  }
}

function stepHero(W: World, E: Sink) {
  const H = W.hero, L = W.L;
  if (H.st === H_WIN || H.st === H_FAIL) return;
  if (H.st === H_IDLE) {
    if (W.t >= H.delay) (H.st = H_WALK), (H.t = W.t);
    return;
  }
  if (H.st === H_FALL) {
    const py = H.y;
    H.vy += G;
    H.y += H.vy;
    // 발판 위로 떨어지면 쿵 착지 (물·구덩이면 풍덩)
    supports(W, SUP);
    for (let i = 0; i < SUP.length; i += 5) {
      if (H.x < SUP[i] || H.x > SUP[i + 1] || py > SUP[i + 2] + 0.002 || H.y < SUP[i + 2]) continue;
      H.y = SUP[i + 2];
      H.vy = 0;
      H.on = SUP[i + 3];
      H.st = H_WAIT;
      H.why = '';
      E?.('land', H.x, H.y, 0, -1);
      return;
    }
    if (H.y > H.fallY) {
      H.st = H_FAIL;
      H.why = H.why || '풍덩!';
      H.t = W.t;
      E?.('splash', H.x, H.fallY, 0, -1);
    }
    return;
  }
  // 나룻배는 옆으로 실어 간다
  if (H.on >= 0) {
    const th = thingOf(W, supThing(H.on));
    if (th && th.k === 'ferry') H.x += th.dx;
  }
  supports(W, SUP);
  // 발밑: 올라탄 것이 움직이면 같이
  let under = -9, uy = 0, best = 9, ux0 = 0, ustep = STEP;
  for (let i = 0; i < SUP.length; i += 5) {
    if (H.x < SUP[i] - 0.006 || H.x > SUP[i + 1] + 0.006) continue;
    const dy = Math.abs(SUP[i + 2] - H.y);
    const lim = SUP[i + 3] === H.on && H.on !== -1 && H.on !== -2 ? 0.08 : STEP;
    if (dy <= lim && dy < best) (best = dy), (under = SUP[i + 3]), (uy = SUP[i + 2]), (ux0 = SUP[i]), (ustep = SUP[i + 4]);
  }
  if (under === -9) {
    H.st = H_FALL;
    H.vy = 0;
    H.why = '풍덩!';
    E?.('fall', H.x, H.y, 0, H.on);
    return;
  }
  if (under !== H.on && under >= 0) E?.('board', H.x, uy, 0, supThing(under));
  H.on = under;
  H.y = uy;
  // 상자 탑 발치(땅)에 떨어졌으면 탑 앞으로 밀려난다 — 지나쳐 갇히거나 계단 밑에 끼지 않게
  if (H.on === -1)
    for (const th of W.th) {
      if (th.k !== 'stack') continue;
      const x0 = th.x - ST_CW / 2, x1 = th.x + (ST_N - 1) * ST_DX + ST_CW / 2;
      if (Math.abs(H.y - th.y) < 0.02 && H.x > x0 + 0.004 && H.x < x1) {
        H.x = x0 - 0.03;
        E?.('shove', H.x, H.y, 0, th.id);
        return wait(W, H, E);
      }
    }
  // 막힘(화분 조각·물·불)
  const nx = H.x + V;
  for (const th of W.th) {
    const b = blockOf(th);
    if (!b) continue;
    if (Math.abs(H.y - b[2]) > 0.06) continue;
    if (H.x > b[0] + 0.01 && H.x < b[1] - 0.01) {
      if (th.k === 'water') {
        H.st = H_FAIL;
        H.why = '물에 휩쓸렸어요!';
        H.t = W.t;
        E?.('splash', H.x, H.y, 0, th.id);
        return;
      }
    }
    if (nx + 0.025 > b[0] && H.x + 0.025 <= b[0] + 0.004) return wait(W, H, E);
  }
  if (W.fire && L.fire && Math.abs(H.y - L.fire[2]) < 0.06 && nx + 0.03 > L.fire[0] && H.x < L.fire[1]) return wait(W, H, E);
  // 한 발 앞 발판: 오르막은 그 발판이 허락하는 높이까지(계단은 앞으로 이어진 것만), 내리막은 계단에서만 조금 더
  const canStep = (i: number, fromY: number, fromX0: number, fromStep: number) => {
    const ty = SUP[i + 2], up = fromY - ty;
    if (up > 0.001) return up <= SUP[i + 4] && (SUP[i + 4] <= STEP || SUP[i] > fromX0 + 0.02);
    return -up <= (SUP[i + 4] > STEP || fromStep > STEP ? 0.07 : STEP);
  };
  let nb = -9, ny = 0, nbest = 9, nx0 = 0, nstep = STEP;
  for (let i = 0; i < SUP.length; i += 5) {
    if (nx < SUP[i] || nx > SUP[i + 1]) continue;
    if (!canStep(i, H.y, ux0, ustep) || (SUP[i + 3] !== under && !boardable(W, SUP[i + 3]))) continue;
    // 오를 수 있으면 높은 쪽(상자 위)으로
    const dy = SUP[i + 2] - H.y;
    if (dy < nbest) (nbest = dy), (nb = SUP[i + 3]), (ny = SUP[i + 2]), (nx0 = SUP[i]), (nstep = SUP[i + 4]);
  }
  if (nb === -9) return wait(W, H, E);
  if (nx + LOOK < 1) {
    let ok = false;
    const fx = nx + LOOK;
    for (let i = 0; i < SUP.length && !ok; i += 5) if (fx >= SUP[i] && fx <= SUP[i + 1] && canStep(i, ny, nx0, nstep) && (SUP[i + 3] === nb || boardable(W, SUP[i + 3]))) ok = true;
    if (!ok) return wait(W, H, E);
  }
  // 길을 막은 도깨비 앞에서는 겁먹고 선다
  for (const a of W.ac) if (a.role === R_WALK && !a.ko && Math.abs(a.y - H.y) < 0.05 && a.x - H.x > 0 && a.x - H.x < 0.085) return wait(W, H, E);
  if (H.st === H_WAIT) E?.('go', H.x, H.y, 0, -1);
  H.st = H_WALK;
  H.waitT = 0;
  H.x = nx;
  H.y = ny;
  H.on = nb;
  if (H.x >= L.gearX - 0.02 && Math.abs(H.y - L.gearY) < 0.05) {
    H.st = H_WIN;
    H.t = W.t;
    E?.('gearGet', L.gearX, L.gearY, 0, -1);
  }
}
function wait(W: World, H: Hero, E: Sink) {
  if (H.st !== H_WAIT) (H.st = H_WAIT), (H.t = W.t), E?.('stuck', H.x, H.y, 0, -1);
  H.waitT++;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
const rnd = (r: Rng, a: number, b: number) => a + (b - a) * r();
let NID = 1;
function T(k: Kind, o: Partial<Thing>): Thing {
  return { id: NID++, k, tau: 0, dur: 1, st: WAIT, hold: 1, owner: -1, rider: -1, dock: -1, x: 0, y: 0, x2: 0, y2: 0, w: 0, h: 0, n: 0, path: null, big: 1, moved: -1, born: 0, harm: 1, rs: 0, hf: HOLD_FULL, hs: HOLD_STOP, dx: 0, cause: -1, ctau: 0, rsT: 0, ...o };
}
/** 판이 시작되기 전에 이미 벌어진 일 (끝 자세에서 시작 — 되감기 값이 정해져 있다) */
function pre(th: Thing): Thing {
  th.tau = th.dur;
  th.st = FWD;
  th.hold = 0;
  th.moved = -60;
  return th;
}
function Ac(k: AK, role: number, x: number, y: number, o: Partial<Actor> = {}): Actor {
  return { id: NID++, k, role, x, y, x0: x, x1: x, vx: 0, ride: -1, ko: false, hurt: false, saved: false, t: -99, next: 1e9, per: 0, shots: 0, alt: 0, pause: 0, ...o };
}
/** 구르는 길: 꺾은선을 따라 가속해 구른다 → [x, y, 회전] τ마다 */
function rollPath(pts: number[], r: number, v0: number, acc: number, vmax: number, tail = 14): Float32Array {
  const out: number[] = [];
  let seg = 0, s = 0, v = v0, rot = 0;
  const segLen = (i: number) => Math.hypot(pts[i * 2 + 2] - pts[i * 2], pts[i * 2 + 3] - pts[i * 2 + 1]);
  const nSeg = pts.length / 2 - 1;
  for (let guard = 0; guard < 2000; guard++) {
    const L0 = segLen(seg), q = Math.min(1, s / L0);
    const x = pts[seg * 2] + (pts[seg * 2 + 2] - pts[seg * 2]) * q, y = pts[seg * 2 + 1] + (pts[seg * 2 + 3] - pts[seg * 2 + 1]) * q;
    out.push(x, y, rot);
    if (seg >= nSeg - 1 && s >= L0) break;
    v = Math.min(vmax, v + acc);
    s += v;
    rot += (v / r) * (pts[seg * 2 + 2] >= pts[seg * 2] ? 1 : -1);
    while (s > segLen(seg) && seg < nSeg - 1) (s -= segLen(seg)), seg++;
    if (seg === nSeg - 1 && s > segLen(seg)) s = segLen(seg);
  }
  const lx = out[out.length - 3], ly = out[out.length - 2], lr = out[out.length - 1];
  for (let k = 0; k < tail; k++) out.push(lx, ly, lr);
  return new Float32Array(out);
}
const LY = 0.86, LY3 = 0.95, UP3 = 0.6;

function bridgeT(x0: number, x1: number, y: number, w0: number, n = 4): Thing {
  return T('bridge', { x: x0, x2: x1, y, n, hold: w0, dur: Math.ceil(brFall(n - 1) + brLand + 12), big: 1.2 });
}
function potT(x: number, yb: number, w0: number, owner: number, yl = LY): Thing {
  const th = T('pot', { x, y: yb, y2: yl, hold: w0, owner, big: 0.6 });
  th.dur = Math.ceil(potHit(th) + 16);
  return th;
}
function raftT(x: number, y0: number, y1: number, w: number, w0: number, rider: number, dockY = -1): Thing {
  const th = T('raft', { x, y: y0, y2: y1, w, hold: w0, rider, big: 1.1 });
  th.dur = Math.ceil((y1 - y0) / RAFT_V);
  if (dockY > 0) th.dock = Math.round((dockY - y0) / RAFT_V);
  return th;
}
function logT(xb: number, x2: number, y: number, w0: number, yEnd = 1.18): Thing {
  const th = T('log', { x: xb, x2, y, hold: w0, w: x2 - xb, big: 1.3 });
  th.dur = Math.ceil(LOG_LIE + (yEnd - y) / LOG_V);
  th.dock = LOG_LIE;
  return th;
}
function crateT(x: number, yTop: number, yRest: number, w: number, w0: number, slow = false): Thing {
  const th = T('crate', { x, y: yTop, y2: yRest, w, h: Math.min(0.2, yRest - yTop + 0.05), hold: w0, big: 1.3, n: slow ? 1 : 0, harm: slow ? 0 : 1 });
  th.h = 0.12;
  th.dur = Math.ceil(CR_FRAY + crFall(th) + 10);
  return th;
}

function stackT(x: number, y: number, w0: number): Thing {
  const th = T('stack', { x, y, hold: w0, harm: 0, big: 1.2, hs: 170 });
  th.dur = stackDur();
  th.dock = ST_SLUMP;
  return th;
}
function ferryT(x0: number, x1: number, y: number, w0: number): Thing {
  const th = T('ferry', { x: x0, x2: x1, y, w: 0.13, hold: w0, harm: 0, big: 1.1 });
  th.dur = Math.ceil((x1 - x0) / FERRY_V) + 10;
  return th;
}
function sackT(x: number, yPan: number, yFloor: number, w0: number): Thing {
  const th = T('sack', { x, y: yPan, y2: yFloor, hold: w0, harm: 0, big: 1 });
  th.dur = Math.ceil(SK_SLIP + skFall(th) + 8);
  return th;
}

function baseLevel(key: Key, ch: number): Level {
  return {
    key, ch, ground: [], things: [], actors: [], sand: 240, par: 0, stars: [], gearX: 0.91, gearY: ch === 2 ? LY3 : LY, heroX: 0.07, heroY: ch === 2 ? LY3 : LY, heroDelay: 40,
    fallY: (ch === 2 ? LY3 : LY) + 0.16, canal: null, basin: null, shaft: null, gate: null, deco: {}, scale: null, fire: null, tapsPar: 9,
    rw: ch >= 1 ? RW_FAST : RW, multi: ch >= 2 ? 2 : 1,
  };
}

/** 미끼: 발코니 화분이 꽃밭으로 (길은 안 막는다 — 되감아도 모래만 든다) */
function decoyPot(L: Level, x: number, w0: number) {
  const gm = Ac('grandma', R_DECO, x + 0.045, 0.5);
  L.actors.push(gm);
  L.things.push(potT(x, 0.5, w0, gm.id, 0.77));
  if (L.deco.balc === undefined) L.deco.balc = x;
  else L.deco.balc2 = x;
}
/** 미끼: 강물에 떠내려가는 빈 통 (부딪혀도 괜찮다 — 먼저 움직여 눈길을 끈다) */
function decoyBarrel(L: Level, x: number, w0: number, y0 = 0.5) {
  const th = T('barrel', { path: rollPath([x, y0, x + 0.02, 1.16], 0.03, 0.0011, 0, 0.0011, 4), hold: w0, big: 0.8, harm: 0 });
  th.dur = th.path!.length / 3 - 1;
  L.things.push(th);
}
/** 판의 모양 (변형 r로 시간·자리를 조금씩 흔든다) */
function rawLevel(si: number, r: Rng): Level {
  const d = STAGES[si], L = baseLevel(d.key, d.ch);
  L.stars = d.stars;
  const lane = L.heroY;
  switch (d.key) {
    case 'bridge': {
      L.ground = [0, 0.4, lane, 0.62, 1, lane];
      L.canal = [0.4, 0.62];
      const br = bridgeT(0.4, 0.62, lane, 1);
      // 화면이 뜨면 이미 무너지는 중 — 판자 셋이 떨어지고 있다 (첫 톡에 셋이 한꺼번에 '착착착' 날아 붙는다)
      br.st = FWD;
      br.hold = 0;
      br.moved = 0;
      br.tau = Math.round(rnd(r, 30, 33));
      // 첫 판: 다시 세운 다리는 오래 버틴다 (느린 사람도 건넌다)
      br.hf = 900;
      L.things.push(br);
      L.actors.push(Ac('kid', R_DECO, 0.78, lane), Ac('duck', R_DECO, 0.5, 1.02));
      L.heroDelay = 16;
      L.sand = 300;
      break;
    }
    case 'pot': {
      L.ground = [0, 0.56, lane, 0.74, 1, lane];
      L.canal = [0.56, 0.74];
      const px = rnd(r, 0.32, 0.36);
      const gm = Ac('grandma', R_DECO, px + 0.05, 0.5);
      L.actors.push(gm, Ac('cat', R_DECO, px - 0.06, 0.5), Ac('duck', R_DECO, 0.65, 1.05));
      L.things.push(potT(px, 0.5, Math.round(rnd(r, 8, 16)), gm.id));
      L.things.push(bridgeT(0.56, 0.74, lane, Math.round(rnd(r, 96, 120))));
      L.deco.balc = px;
      L.sand = 240;
      break;
    }
    case 'barrel': {
      L.ground = [0, 1, lane];
      const ax = rnd(r, 0.47, 0.53), top = 0.47;
      const fm = Ac('farmer', R_DECO, ax + 0.07, top - 0.005);
      const gm = Ac('grandma', R_VILL, rnd(r, 0.8, 0.86), 1.05);
      L.actors.push(fm, gm);
      L.deco.alley = ax;
      L.deco.top = top;
      // A: 곧장 앞으로 → 상자 더미(괜찮음) · B: 길을 따라 왼쪽(주인공 쪽) · C: 앞 인도를 따라 오른쪽(할머니 쪽)
      const down = [ax, top + 0.01, ax, lane];
      const paths = {
        A: [...down, ax + 0.02, 1.13],
        B: [...down, 0.03, lane],
        C: [...down, ax + 0.01, 1.05, 0.97, 1.05],
      };
      const order: ('A' | 'B' | 'C')[][] = [['A', 'B', 'C'], ['A', 'C', 'B'], ['B', 'A', 'C']];
      const ord = order[Math.floor(r() * order.length)];
      let w0 = Math.round(rnd(r, 12, 20));
      for (const kk of ord) {
        L.things.push(T('barrel', { path: rollPath(paths[kk], 0.034, 0.0012, 0.00011, 0.0052), hold: w0, owner: fm.id, big: 1 }));
        w0 += Math.round(rnd(r, 46, 62));
      }
      for (const th of L.things) th.dur = th.path!.length / 3 - 1;
      L.sand = 240;
      break;
    }
    case 'arrow': {
      L.ground = [0, 0.62, lane, 0.8, 1, lane];
      L.canal = [0.62, 0.8];
      const gx = rnd(r, 0.28, 0.4);
      const gb = Ac('goblin', R_ARCH, gx, 0.36, { next: Math.round(rnd(r, 70, 90)), per: Math.round(rnd(r, 150, 175)), alt: 1 });
      const kid = Ac('kid', R_VILL, rnd(r, 0.86, 0.9), lane);
      L.actors.push(gb, kid);
      L.deco.roof = gx;
      L.things.push(pre(bridgeT(0.62, 0.8, lane, 1)));
      decoyPot(L, 0.12, Math.round(rnd(r, 20, 40)));
      L.gearX = 0.93;
      L.sand = 240;
      break;
    }
    case 'stairs': {
      const sx = rnd(r, 0.34, 0.38), stage = sx + (ST_N - 1) * ST_DX + ST_CW / 2 - 0.006;
      L.ground = [0, stage, lane, stage, 1, lane - ST_N * ST_CH];
      L.things.push(stackT(sx, lane, Math.round(rnd(r, 12, 20))));
      const gm = Ac('grandma', R_DECO, 0.2, 0.5), cat = Ac('cat', R_VILL, 0.15, lane);
      L.actors.push(gm, cat);
      L.things.push(potT(0.15, 0.5, Math.round(rnd(r, 60, 100)), gm.id, lane));
      L.deco.balc = 0.15;
      decoyPot(L, 0.25, Math.round(rnd(r, 70, 90)));
      L.deco.stage = stage;
      L.gearY = lane - ST_N * ST_CH;
      L.sand = 260;
      break;
    }
    case 'twice': {
      L.ground = [0, 1, lane];
      const ax = rnd(r, 0.5, 0.54), top = 0.47;
      const fm = Ac('farmer', R_DECO, ax + 0.07, top - 0.005);
      L.actors.push(fm);
      L.deco.alley = ax;
      L.deco.top = top;
      const br = T('barrel', { path: rollPath([ax, top + 0.01, ax, lane, ax + 0.02, 1.13], 0.034, 0.0012, 0.00011, 0.0052), hold: Math.round(rnd(r, 30, 40)), owner: fm.id, big: 1 });
      br.dur = br.path!.length / 3 - 1;
      L.things.push(br);
      // 첫째 도깨비는 골목 앞을 막고 서 있고, 둘째는 통이 지나간 뒤 그 자리로 걸어와 선다
      L.actors.push(Ac('walker', R_WALK, ax, lane));
      L.actors.push(Ac('walker', R_WALK, 0.86, lane, { x0: ax, x1: 0.86, vx: rnd(r, 0.003, 0.0034), next: Math.round(rnd(r, 66, 76)) }));
      // 골목 어귀 가로등의 꽃바구니: 술통이 가로등을 쿵 치면 흔들흔들 툭 — 길을 막는다 (연쇄: 술통을 되감으면 함께 제자리로)
      const px = ax - 0.12, hb = potT(px, 0.6, 1, -1);
      hb.cause = br.id;
      hb.hold = 1;
      hb.w = 14;
      hb.dur = Math.ceil(potHit(hb) + 16);
      for (let i = 0; i < br.dur; i++) if (br.path![i * 3 + 1] >= lane - 0.004) {
        hb.ctau = i;
        break;
      }
      L.things.push(hb);
      L.deco.post = px;
      // 미끼: 발코니 화분이 꽃밭으로 (길은 안 막는다)
      const gm = Ac('grandma', R_DECO, 0.24, 0.5);
      L.actors.push(gm);
      L.things.push(potT(0.2, 0.5, Math.round(rnd(r, 6, 16)), gm.id, 0.77));
      L.deco.balc = 0.2;
      L.heroDelay = 120;
      L.sand = 240;
      break;
    }
    case 'raft': {
      L.ground = [0, 0.45, lane, 0.63, 1, lane];
      L.canal = [0.45, 0.63];
      const kid = Ac('kid', R_RIDER, 0.51, lane), mom = Ac('mom', R_DECO, 0.38, lane);
      L.actors.push(kid, mom);
      const raft = raftT(0.54, lane, 1.17, 0.21, Math.round(rnd(r, 10, 18)), kid.id);
      kid.ride = raft.id;
      L.things.push(raft);
      // 물에 떠내려가는 빈 통(먼저 움직임)
      const bx = 0.5 + rnd(r, -0.02, 0.02);
      L.things.push(T('barrel', { path: rollPath([bx, 0.5, bx + 0.02, 1.16], 0.03, 0.0011, 0, 0.0011, 4), hold: 2, big: 0.8, harm: 0 }));
      L.things[1].dur = L.things[1].path!.length / 3 - 1;
      // 꽃밭으로 떨어지는 화분 (길은 안 막는다 — 버릇 봇이 속는 것)
      const gm = Ac('grandma', R_DECO, 0.26, 0.5);
      L.actors.push(gm);
      L.things.push(potT(rnd(r, 0.2, 0.24), 0.5, Math.round(rnd(r, 4, 12)), gm.id, 0.77));
      L.deco.balc = L.things[2].x;
      L.sand = 240;
      break;
    }
    case 'log': {
      L.ground = [0, 0.42, lane, 0.62, 1, lane];
      L.canal = [0.42, 0.62];
      const bv = Ac('beaver', R_DECO, 0.33, lane);
      L.actors.push(bv);
      L.things.push(logT(0.4, 0.66, lane, Math.round(rnd(r, 6, 14))));
      L.actors.push(Ac('duck', R_DECO, 0.52, 1.0), Ac('kid', R_VILL, rnd(r, 0.84, 0.9), lane));
      const gx = rnd(r, 0.72, 0.8);
      L.actors.push(Ac('goblin', R_ARCH, gx, 0.36, { next: Math.round(rnd(r, 120, 150)), per: Math.round(rnd(r, 160, 180)), alt: 1 }));
      L.deco.roof = gx;
      decoyBarrel(L, 0.47, 2, 0.6);
      L.sand = 200;
      break;
    }
    case 'water': {
      L.ground = [0, 1, lane];
      const bx0 = rnd(r, 0.26, 0.3), bx1 = bx0 + 0.17;
      const mole = Ac('mole', R_DECO, bx0 + 0.13, 0.4);
      const cat = Ac('cat', R_VILL, bx0 + 0.08, lane);
      L.actors.push(mole, cat);
      L.basin = [bx0, bx1];
      L.things.push(T('water', { x: bx0 + 0.08, y: 0.42, x2: bx0, y2: bx1, h: lane, hold: Math.round(rnd(r, 30, 44)), owner: mole.id, dur: WAT_CRACK + WAT_FILL, big: 1.2 }));
      L.canal = [0.6, 0.78];
      L.ground = [0, 0.6, lane, 0.78, 1, lane];
      L.things.push(logT(0.58, 0.82, lane, Math.round(rnd(r, 4, 10))));
      L.actors.push(Ac('beaver', R_DECO, 0.53, lane));
      decoyBarrel(L, 0.72, 2, 0.56);
      L.sand = 260;
      break;
    }
    case 'balloon': {
      L.ground = [0, 0.5, lane, 0.7, 1, lane];
      L.canal = [0.5, 0.7];
      const kid = Ac('kid', R_DECO, 0.2, lane), cat = Ac('cat', R_RIDER, 0.21, lane - 0.12);
      L.actors.push(kid, cat);
      const bal = T('balloon', { x: 0.22, y: lane - 0.25, hold: Math.round(rnd(r, 26, 40)), owner: kid.id, rider: cat.id, dur: 300, big: 0.7 });
      cat.ride = bal.id;
      L.things.push(bal);
      L.things.push(raftT(0.6, lane - 0.16, 1.17, 0.21, Math.round(rnd(r, 10, 20)), -1, lane));
      const gx = rnd(r, 0.8, 0.86);
      L.actors.push(Ac('goblin', R_ARCH, gx, 0.36, { next: Math.round(rnd(r, 160, 190)), per: 200 }));
      L.deco.roof = gx;
      L.sand = 260;
      break;
    }
    case 'ferry': {
      L.ground = [0, 0.36, lane, 0.7, 1, lane];
      L.canal = [0.36, 0.7];
      L.things.push(ferryT(0.42, 0.635, lane, Math.round(rnd(r, 8, 16))));
      const gx = rnd(r, 0.8, 0.86);
      L.actors.push(Ac('goblin', R_ARCH, gx, 0.36, { next: Math.round(rnd(r, 150, 175)), per: Math.round(rnd(r, 160, 180)), alt: 1 }));
      L.actors.push(Ac('kid', R_VILL, rnd(r, 0.88, 0.92), lane));
      L.deco.roof = gx;
      decoyBarrel(L, 0.55, 2, 0.56);
      L.sand = 260;
      break;
    }
    case 'chain': {
      L.ground = [0, 0.3, lane, 0.74, 1, lane];
      L.canal = [0.3, 0.74];
      const a = raftT(0.408, lane - 0.12, 1.17, 0.226, Math.round(rnd(r, 8, 18)), -1, lane);
      const b = raftT(0.629, lane - 0.12, 1.17, 0.228, Math.round(rnd(r, 40, 60)), -1, lane);
      a.hs = b.hs = 230;
      L.things.push(a, b);
      L.actors.push(Ac('duck', R_DECO, 0.5, 1.05), Ac('mom', R_DECO, 0.84, lane));
      decoyBarrel(L, 0.52, 2, 0.52);
      L.sand = 300;
      break;
    }
    case 'scale': {
      L.ground = [0, 0.4, lane, 0.62, 1, UP3];
      L.scale = [0.3, 0.42, 0.13, 0.51, 0.22, lane, UP3];
      L.gearY = UP3;
      L.things.push(sackT(0.13, 0.74, lane, Math.round(rnd(r, 12, 22))));
      const gx = rnd(r, 0.84, 0.9);
      L.actors.push(Ac('goblin', R_ARCH, gx, UP3, { next: 0, per: 80, alt: 2 }));
      L.actors.push(Ac('cat', R_VILL, 0.06, lane));
      // 비계의 페인트 통이 고양이 위로 (부엉이가 떠난 뒤)
      const pt = Ac('beaver', R_DECO, 0.12, 0.46);
      L.actors.push(pt);
      L.things.push(potT(0.06, 0.48, Math.round(rnd(r, 50, 70)), pt.id, lane));
      L.deco.roof = gx;
      L.sand = 260;
      break;
    }
    case 'fire': {
      L.ground = [0, 0.68, lane, 0.82, 1, UP3];
      L.shaft = [0.68, 0.82, UP3, lane];
      L.gearY = UP3;
      L.things.push(crateT(0.75, UP3, lane, 0.15, Math.round(rnd(r, 30, 50)), true));
      L.fire = [0.4, 0.54, lane];
      // 등불(먼저 떨어져 불을 냄 — 되감아도 불은 그대로) · 물통(그 전에 쏟아짐 — 되감으면 불을 지나 솟는다)
      const bv = Ac('beaver', R_DECO, 0.36, 0.56), mole = Ac('mole', R_DECO, 0.58, 0.5);
      L.actors.push(bv, mole);
      const lamp = potT(0.41, 0.58, 1, bv.id, lane - 0.01);
      lamp.n = 2;
      lamp.harm = 0;
      const pail = potT(rnd(r, 0.5, 0.53), 0.52, 1, mole.id, lane);
      pail.n = 1;
      pail.harm = 0;
      L.things.push(pre(lamp), pre(pail));
      L.actors.push(Ac('kid', R_DECO, 0.62, lane));
      L.sand = 260;
      break;
    }
    case 'crate': {
      L.ground = [0, 0.5, lane, 0.66, 1, UP3];
      L.shaft = [0.5, 0.66, UP3, lane];
      L.gearY = UP3;
      // 감개가 풀려 천천히 내려오는 승강기 (타고 되감으면 같이 올라간다)
      L.things.push(crateT(0.58, UP3, lane, 0.17, Math.round(rnd(r, 10, 20)), true));
      // 비계에서 떨어지는 페인트 통 — 낮잠 자는 고양이 위로 (길도 막는다 · 주인 있음)
      const pt = Ac('beaver', R_DECO, 0.32, 0.46);
      L.actors.push(pt);
      const px = rnd(r, 0.25, 0.29);
      L.things.push(potT(px, 0.48, Math.round(rnd(r, 70, 90)), pt.id, lane));
      L.actors.push(Ac('cat', R_VILL, px, lane));
      // 위층 망보는 도깨비: 승강기가 올라오면 쏜다 (함께 되감기 — 오르면서 화살도)
      const gx = rnd(r, 0.86, 0.9);
      L.actors.push(Ac('goblin', R_ARCH, gx, UP3, { next: 0, per: 70, alt: 2 }));
      L.deco.roof = gx;
      L.sand = 240;
      break;
    }
    case 'gear': {
      L.ground = [0, 0.46, lane, 0.66, 1, lane];
      L.gate = [0.46, 0.66, lane];
      L.fallY = lane + 0.2;
      const m = Ac('machine', R_DECO, 0.22, 0.6);
      L.actors.push(m);
      const gp = rollPath([0.22, 0.64, 0.25, 0.7, 0.4, lane, 0.47, lane, 0.55, lane + 0.17], 0.05, 0.001, 0.00009, 0.0042, 18);
      const gr = T('gear', { path: gp, hold: Math.round(rnd(r, 26, 36)), owner: m.id, big: 1.4 });
      gr.dur = gp.length / 3 - 1;
      L.things.push(gr);
      // 길을 막은 도깨비 (구르는 톱니에 꽈당 — 그 뒤에 되감아야)
      L.actors.push(Ac('walker', R_WALK, rnd(r, 0.37, 0.41), lane));
      // 비탈 아래 등 기둥: 톱니가 쿵 치면 매단 꽃바구니가 툭 (연쇄: 톱니를 되감으면 함께 제자리로)
      const bxp = 0.3, hb = potT(bxp - 0.04, 0.66, 1, -1, lane);
      hb.cause = gr.id;
      hb.w = 14;
      hb.dur = Math.ceil(potHit(hb) + 16);
      for (let i = 0; i < gr.dur; i++) if (gp[i * 3] >= bxp + 0.02) {
        hb.ctau = i;
        break;
      }
      L.things.push(hb);
      L.deco.post = bxp - 0.04;
      // 창가 화분이 고양이 위로
      const gm = Ac('grandma', R_DECO, 0.84, 0.5), cat = Ac('cat', R_VILL, 0.79, lane);
      L.actors.push(gm, cat);
      L.things.push(potT(0.79, 0.5, Math.round(rnd(r, 60, 120)), gm.id, lane));
      L.deco.balc = 0.79;
      L.heroDelay = 140;
      L.gearX = 0.93;
      L.sand = 240;
      break;
    }
    case 'cross': {
      L.ground = [0, 0.5, lane, 0.66, 1, UP3];
      L.shaft = [0.5, 0.66, UP3, lane];
      L.gearY = UP3;
      L.things.push(crateT(0.58, UP3, lane, 0.17, Math.round(rnd(r, 8, 16)), true));
      // 망보는 도깨비 둘: 승강기가 오르기 시작하면 하나는 부엉이를, 하나는 아래층 고양이를 쏜다
      const gx = rnd(r, 0.84, 0.88);
      L.actors.push(Ac('goblin', R_ARCH, gx, UP3, { next: 0, per: 80, alt: 2 }));
      L.actors.push(Ac('goblin', R_ARCH, rnd(r, 0.72, 0.76), UP3, { next: 0, per: 400, alt: 3 }));
      L.actors.push(Ac('cat', R_VILL, rnd(r, 0.3, 0.36), lane));
      L.deco.roof = gx;
      L.sand = 260;
      break;
    }
    case 'grand': {
      L.ground = [0, 0.36, lane, 0.66, 1, UP3];
      L.gate = [0.36, 0.5, lane];
      L.shaft = [0.5, 0.66, UP3, lane];
      L.gearY = UP3;
      L.fallY = lane + 0.2;
      const m = Ac('machine', R_DECO, 0.15, 0.6);
      L.actors.push(m);
      const gp = rollPath([0.15, 0.64, 0.18, 0.7, 0.29, lane, 0.36, lane, 0.43, lane + 0.17], 0.05, 0.001, 0.00009, 0.0042, 18);
      L.things.push(T('gear', { path: gp, hold: Math.round(rnd(r, 14, 22)), owner: m.id, big: 1.4 }));
      L.things[0].dur = gp.length / 3 - 1;
      L.actors.push(Ac('walker', R_WALK, rnd(r, 0.27, 0.3), lane));
      L.things.push(crateT(0.58, UP3, lane, 0.17, Math.round(rnd(r, 20, 40)), true));
      // 꼭대기 망보는 도깨비 (승강기가 오르면 깬다) + 아래층 고양이를 노리는 도깨비
      const gx = rnd(r, 0.84, 0.9);
      L.actors.push(Ac('goblin', R_ARCH, gx, UP3, { next: 0, per: 80, alt: 2 }));
      L.actors.push(Ac('cat', R_VILL, rnd(r, 0.1, 0.16), lane));
      L.actors.push(Ac('goblin', R_ARCH, rnd(r, 0.72, 0.76), UP3, { next: 0, per: 400, alt: 3 }));
      L.deco.roof = gx;
      L.heroDelay = 150;
      L.sand = 260;
      break;
    }
  }
  return L;
}

// ───────────────────────────── 앞을 셈 (같은 세계로) ─────────────────────────────
interface Out { win: boolean; fail: boolean; t: number; x: number; hurt: number; used: number; saved: number; stuck: boolean }
/** 아무것도 안 하고(또는 되감는 물건을 걸림 자리에서 멈추며) 앞으로 세어 본다 */
function rollout(W0: World, maxT = 1300, dockId = -1, dockFrom = 0, snap: World[] | null = null): Out {
  const W = cloneWorld(W0), H = W.hero, t0 = W.t;
  let still = 0;
  while (W.t - t0 < maxT) {
    if (dockId >= 0 && W.t >= dockFrom) {
      const th = thingOf(W, dockId);
      if (th && th.st === REW && th.tau <= th.dock + 30) tapThing(W, th, null);
    }
    stepWorld(W, null);
    if (H.st === H_WIN || H.st === H_FAIL) break;
    if (H.st === H_WAIT) {
      still++;
      // 막혀 선 자리 (두 수 앞을 볼 때 여기서 한 번 더 둬 본다)
      if (snap && still === 24 && !snap.length && W.rew < 0) snap.push(cloneWorld(W));
      if (still > 420 && W.rew < 0) break;
    } else still = 0;
  }
  return { win: H.st === H_WIN, fail: H.st === H_FAIL, t: W.t, x: H.x, hurt: W.hurt, used: W.used, saved: W.saved, stuck: H.st === H_WAIT };
}
/** 결과의 값: 이기기 ≫ 안 다치게·구하기 ≫ 모래 아끼기 > 빨리 */
function value(o: Out): number {
  let v = -4 * o.used - 2500 * o.hurt + 2500 * o.saved;
  if (o.win) v += 30000 - 0.5 * o.t;
  else if (o.fail) v += 4000 * o.x;
  else v += 9000 + 4000 * o.x;
  return v;
}
/** 지금 톡 할 수 있는(되감을 수 있는) 물건 */
const tappable = (th: Thing) => th.st !== DONE && th.st !== REW && th.st !== CHN && th.tau > 0;
const DEC = 6, LATER = 12;
/** 손이 다시 누를 수 있는 간격(틱): 톡 → 뗌 → 다음 톡은 두 칸 뒤. 잘하는 봇은 자기 손 빠르기에 맞춰 계획한다 (판 고르기는 늘 6) */
let PACE = DEC;
/** 두 수 앞까지 본 값: 그냥 두면 막히는 세계는, 막힌 자리에서 한 번 더 톡 해서 이길 수 있는지까지 본다
 *  (되돌릴 수 없는 막다른 길 — 술통을 너무 일찍 받아 버림 — 을 '조금 더 걸어감'으로 착각하지 않게) */
function score2(W0: World, dockId = -1, dockFrom = 0): number {
  const snap: World[] = [];
  const o = rollout(W0, 1300, dockId, dockFrom, snap);
  let v = value(o);
  if (o.fail && dockId < 0 && W0.sand > 0) {
    // 넘어지기 조금 전에 한 번 더 톡 하면 살 수 있나 (날아오는 화살을 되감기 등)
    const C = cloneWorld(W0), tb = o.t - 30;
    while (C.t < tb) stepWorld(C, null);
    for (const th of C.th) {
      if (!tappable(th)) continue;
      const c = cloneWorld(C);
      tapThing(c, thingOf(c, th.id)!, null);
      const v2 = value(rollout(c));
      if (v2 - 1500 > v) v = v2 - 1500;
    }
    return v;
  }
  if (o.win || o.fail || !snap.length || snap[0].sand <= 0) return v;
  const S = snap[0];
  for (const th of S.th) {
    if (!tappable(th)) continue;
    const c = cloneWorld(S);
    tapThing(c, thingOf(c, th.id)!, null);
    let v2 = value(rollout(c));
    if (th.dock >= 0 && th.tau > th.dock + 4) {
      const c2 = cloneWorld(S);
      tapThing(c2, thingOf(c2, th.id)!, null);
      v2 = Math.max(v2, value(rollout(c2, 1300, th.id, c2.t + 2 * PACE)));
    }
    if (v2 - 1500 > v) v = v2 - 1500;
  }
  return v;
}
function tryTap(W: World, id: number, toDock: boolean): number {
  const c = cloneWorld(W);
  tapThing(c, thingOf(c, id)!, null);
  return score2(c, toDock ? id : -1, c.t + 2 * PACE);
}

/** 잘하는 머리: 지금 무엇을(또는 멈춤을) 톡 할까 — 같은 세계로 앞을 세어 본다. 돌려주는 값: 물건 id(-1 없음) · 걸림 자리에서 멈출 생각인가 */
const PICK = { id: -1, dock: false };
function decide(W: World, base: Out, bv: number): typeof PICK {
  PICK.id = -1;
  PICK.dock = false;
  if (W.rew >= 0) {
    // 되감는 중: 지금 멈춰도 똑같이(또는 더) 좋으면 멈춘다
    for (const r of W.th) {
      if (r.st !== REW) continue;
      const c = cloneWorld(W);
      tapThing(c, thingOf(c, r.id)!, null);
      if (score2(c) >= bv - 0.5) return (PICK.id = r.id), PICK;
    }
    // 하나씩만 되감을 수 있으면 기다린다 (둘을 함께 되감을 수 있으면 다른 것도 본다)
    if (rewN(W) >= W.L.multi) return PICK;
  }
  if (base.win && base.hurt === 0) return PICK;
  let bestV = bv + 1;
  for (const th of W.th) {
    if (!tappable(th) || W.sand <= 0) continue;
    let vNow = tryTap(W, th.id, false), dk = false;
    if (th.dock >= 0 && th.tau > th.dock + 4) {
      const v2 = tryTap(W, th.id, true);
      if (v2 > vNow) (vNow = v2), (dk = true);
    }
    // 이기는 길이 안 보이는 '조금 더 걸어감'은 함부로 사지 않는다 (막다른 길일 수 있다)
    if (vNow <= bestV || (vNow < 20000 && vNow < bv + 600)) continue;
    // 조금 뒤에 해도 똑같이 좋으면 기다린다 (되감기는 늦을수록 비싸지만, 다시 벌어지는 일은 너무 일찍 하면 헛일)
    const c2 = cloneWorld(W);
    for (let k = 0; k < Math.max(LATER, PACE); k++) stepWorld(c2, null);
    const t2 = thingOf(c2, th.id);
    if (t2 && tappable(t2) && c2.hero.st !== H_FAIL) {
      tapThing(c2, t2, null);
      if (score2(c2, dk ? th.id : -1, c2.t + 2 * PACE) >= vNow - 0.5) continue;
    }
    PICK.id = th.id;
    PICK.dock = dk;
    bestV = vNow;
  }
  return PICK;
}
/** 남은 계획을 그대로 따라 끝까지 세어 본다 (계획이 아직 맞는지 확인) */
function simPlan(W0: World, acts: number[], i0: number, maxT = 1800): Out {
  const W = cloneWorld(W0), H = W.hero, t0 = W.t;
  let i = i0;
  while (W.t - t0 < maxT && H.st !== H_WIN && H.st !== H_FAIL) {
    while (i < acts.length) {
      const th = thingOf(W, acts[i + 1]), ts = acts[i + 2];
      if (ts >= 0) {
        if (!th || th.st !== REW) (i += 3);
        else if (th.tau <= ts) (tapThing(W, th, null), (i += 3));
        else break;
      } else if (W.t >= acts[i]) {
        if (th && tappable(th)) tapThing(W, th, null);
        i += 3;
      } else break;
    }
    stepWorld(W, null);
  }
  return { win: H.st === H_WIN, fail: H.st === H_FAIL, t: W.t, x: H.x, hurt: W.hurt, used: W.used, saved: W.saved, stuck: H.st === H_WAIT };
}
/** 판 하나를 처음부터 끝까지 잘하는 머리로 둬 본다 → 할 일 목록 [틱, 물건 id, 멈출 τ(-1이면 되감기 시작)] */
interface Plan { acts: number[]; used: number; win: boolean; hurt: number; saved: number; t: number; taps: number }
function planFrom(W0: World, maxT = 3600): Plan {
  const W = cloneWorld(W0), acts: number[] = [];
  let intent = -1;
  let base = rollout(W), bv = base.win ? value(base) : score2(W);
  // 결정은 봇이 실제로 손을 쓸 수 있는 틱에만 (지금부터 PACE마다, 누른 뒤엔 두 칸 쉬고)
  const t0 = W.t, pace = PACE;
  let nextOk = t0;
  while (W.t - t0 < maxT && W.hero.st !== H_WIN && W.hero.st !== H_FAIL && !(W.hero.st === H_WAIT && W.hero.waitT > 1200)) {
    const on = (W.t - t0) % pace === 0;
    if (on && W.t >= nextOk) {
      const p = decide(W, base, bv);
      if (p.id >= 0) {
        const wasRew = thingOf(W, p.id)!.st === REW;
        acts.push(W.t, p.id, wasRew ? thingOf(W, p.id)!.tau : -1);
        tapThing(W, thingOf(W, p.id)!, null);
        nextOk = W.t + 2 * pace;
        intent = !wasRew && p.dock ? p.id : -1;
        base = rollout(W, 1300, intent, nextOk);
        bv = base.win ? value(base) : score2(W, intent, nextOk);
      }
    }
    stepWorld(W, null);
    if (intent >= 0 && thingOf(W, intent)?.st !== REW) intent = -1;
    if ((W.t - t0) % pace === 0 && (base.t <= W.t || W.rew >= 0)) (base = rollout(W, 1300, intent, nextOk)), (bv = base.win ? value(base) : score2(W, intent, nextOk));
  }
  return { acts, used: W.used, win: W.hero.st === H_WIN, hurt: W.hurt, saved: W.saved, t: W.t - t0, taps: W.taps - W0.taps };
}

// ───────────────────────────── 버릇 봇의 머리 ─────────────────────────────
/** 버릇 1: 쉬는 틈만 나면 '가장 먼저 움직이기 시작한 것'을 되감는다 (끝까지) */
function habitFirst(W: World): number {
  if (W.rew >= 0 || W.sand <= 0) return -1;
  let best: Thing | null = null;
  for (const th of W.th) if (tappable(th) && th.st === FWD && (!best || th.moved < best.moved)) best = th;
  return best ? best.id : -1;
}
/** 버릇 2: 곧 일이 나면(주인공이 막히거나 맞거나 누가 다치면) '주인공에 가장 가까운 것'을 되감는다 (끝까지) */
function habitNear(W: World): number {
  if (W.rew >= 0 || W.sand <= 0) return -1;
  const o = rollout(W, 75);
  if (!(o.fail || o.hurt > W.hurt || o.stuck || (W.hero.st === H_WAIT))) return -1;
  const H = W.hero;
  let best = -1, bd = 9;
  for (const th of W.th) {
    if (!tappable(th)) continue;
    pose(th, th.tau);
    const d = Math.hypot(P.x - H.x, P.y - H.y);
    if (d < bd) (bd = d), (best = th.id);
  }
  return best;
}
/** 버릇 머리로 판 하나를 끝까지 */
function trialHabit(L: Level, pick: (W: World) => number, maxT = 3600): World {
  const W = newWorld(L);
  while (W.t < maxT && W.hero.st !== H_WIN && W.hero.st !== H_FAIL) {
    if (W.t % DEC === 0) {
      const id = pick(W);
      if (id >= 0) tapThing(W, thingOf(W, id)!, null);
    }
    stepWorld(W, null);
  }
  return W;
}
function starsOf(L: Level, W: World): boolean[] {
  const win = W.hero.st === H_WIN;
  return L.stars.map((k) => (k === 'goal' ? win : k === 'sand' ? win && W.used <= L.par : k === 'safe' ? win && W.hurt === 0 : k === 'taps' ? win && W.taps <= L.tapsPar : win && W.saved > 0 && W.hurt === 0));
}

// ───────────────────────────── 판 고르기 (변형 셋, 잘하는 머리로 검사) ─────────────────────────────
const VARIANTS = 3;
const levelCache = new Map<string, Level>();
const planCache = new Map<string, Plan>();
export function buildLevel(variant: number, si: number): Level {
  const ck = `${variant}:${si}`;
  const c = levelCache.get(ck);
  if (c) return c;
  const r = mulberry32((variant * 7919 + si * 104729 + 17) >>> 0);
  let pick: Level | null = null, fb: Level | null = null;
  for (let tries = 0; tries < 8 && !pick; tries++) {
    const L = rawLevel(si, r);
    const W = newWorld(L), pl = planFrom(W);
    if (!pl.win) continue;
    L.par = Math.max(30, Math.ceil((pl.used + 20) / 6) * 6);
    L.tapsPar = Math.max(1, pl.taps);
    if (pl.hurt > 0 && L.stars.includes('safe')) continue;
    fb ??= L;
    if (si >= 2) {
      const hb = trialHabit(L, habitFirst);
      if (starsOf(L, hb).every(Boolean)) continue;
    }
    planCache.set(`${ck}:${DEC}:0`, pl);
    pick = L;
  }
  const L = pick ?? fb ?? rawLevel(0, mulberry32(5));
  if (!pick && !fb) L.par = 120;
  levelCache.set(ck, L);
  return L;
}

// ───────────────────────────── 상태 ─────────────────────────────
export interface RewState {
  seed: number; variant: number; t: number; stage: number; phase: 'play' | 'result' | 'chapter'; pt: number; endT: number;
  L: Level; W: World; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; again: boolean; tries: number;
  gears: number; fixed: number;
  seen: Set<string>; events: Ev[]; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; r: number; label: string; t: number } | null;
  wowN: number; firstTap: number; down: boolean; ax: number; ay: number; slow: number; magnet: boolean; idleT: number; lastTap: number;
  sel: number;
  /** 카메라: 화면 왼쪽 위의 세계 좌표 · 당김(1 = 판 전체, 1.4 = 가까이). 시뮬레이션과 같은 틱에 움직여 톡·봇이 같은 화면을 본다 */
  cam: { x: number; y: number; z: number };
  /** 막 끝낸 장 (장 끝 되살림 장면) · 마지막 연쇄 틱 */
  chDone: number; chainT?: number; filmMarks?: { x: number; y: number; t: number; r: number; hero: boolean }[];
  /** 판 시작 '곧 벌어질 일' 필름 (null이면 끝) · 필름 틱 · 필름이 끝난 틱(목표 길 안내) */
  film: Film | null; ft: number; playT: number;
  /** 막힘 힌트: 지금 보여 주는 한 수 · 이 판에서 쓴 수 · 모두 쓴 수 · 이 판 실패 수 · 저절로 보여 줬나 · 마지막으로 나아간 틱 · 다시 하기(↺) 수 */
  hint: Hint | null; hintsHere: number; hintN: number; fails: number; autoHint: boolean; progT: number; restarts: number;
}
/** 필름: 손 안 대면 벌어질 일을 미리 돌려 둔 세계들 (FS틱마다 한 장) · 큰일 표시 */
interface Film { frames: World[]; evs: Ev[]; marks: { x: number; y: number; t: number; r: number; hero: boolean }[]; why: string; end: number }
const FS = 3, FILM_FWD = 96, FILM_REW = 30;
/** 막힘 힌트 한 수: 무엇(id)을 언제(at, 세계 틱) — 멈춤이면 stop = 멈출 τ, ghost = 그때 물건의 τ · 판을 다시 해야 하면 restart */
interface Hint { t: number; id: number; at: number; stop: number; ghost: number; text: string; restart: boolean; none: boolean; done: number; arch: number; next: number; why2: string }
const ev = (s: RewState, kind: string, x: number, y: number, v = 0, id = -1, text?: string) => s.events.push({ t: s.t, kind, x, y, v, id, text });
const see = (s: RewState, key: string) => s.seen.add(key);

function newStage(s: RewState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.variant, s.stage);
  s.W = newWorld(s.L);
  s.phase = 'play';
  s.pt = 0;
  s.endT = -1;
  s.got = 0;
  s.starOk = s.L.stars.map(() => false);
  s.magnet = s.stage <= 1 && !s.again;
  s.idleT = 0;
  s.sel = -1;
  s.hint = null;
  s.hintsHere = s.again ? s.hintsHere : 0;
  if (!s.again) (s.fails = 0), (s.autoHint = false);
  see(s, d.key);
  // 판 띠: 새 장치가 '무엇을 하는지'만 (1·2판은 답도 — 배우는 판). 다시 할 때도 답은 말하지 않는다 (막히면 전구)
  if (s.again) s.banner = { head: `다시! ${d.ch + 1}-${inCh(s.stage)} · ${d.name}`, sub: s.stage <= 1 ? d.tip : d.news ? d.news : '막히면 오른쪽 위 전구를 톡', t: s.t };
  else s.banner = s.stage === 0 ? null : { head: `${d.ch + 1}-${inCh(s.stage)} · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.tip, t: s.t };
  s.spot = null;
  if (!s.again && s.stage > 0 && d.spot) {
    const L = s.L, th = L.things[0];
    pose(th, 0);
    let sx = P.x, sy = P.y;
    const own = L.actors.find((a) => a.k === 'grandma' || a.k === 'farmer' || a.k === 'goblin' || a.k === 'machine' || a.k === 'walker');
    if ((d.key === 'pot' || d.key === 'barrel' || d.key === 'arrow' || d.key === 'gear' || d.key === 'cross' || d.key === 'crate') && own) (sx = own.x), (sy = own.y - 0.05);
    if (d.key === 'twice') {
      const hb = L.things.find((q) => q.cause >= 0);
      if (hb) (sx = hb.x), (sy = hb.y - 0.04);
    }
    if (d.key === 'log') (sx = (th.x + th.x2) / 2), (sy = th.y);
    s.spot = { x: sx, y: sy, r: 0.11, label: d.spot, t: s.t + 150 };
  }
  // 곧 벌어질 일: 손 안 대고 앞으로 돌려 본 필름 (2초) — 다 보면 '지이익' 되감겨 지금으로. 다시 할 땐 바로 시작 (이미 봤다)
  const again = s.again;
  s.again = false;
  s.ft = 0;
  s.playT = -1;
  s.progT = s.t;
  if (again) {
    s.film = null;
    updateCam(s, true);
    s.playT = s.t;
    if (s.fails >= 2 && !s.autoHint) (s.autoHint = true), showHint(s, true);
    return;
  }
  s.film = makeFilm(s.W);
  s.cam.x = 0;
  s.cam.y = 0;
  s.cam.z = 1;
  ev(s, 'filmGo', 0.5, 0.4);
}
/** 필름을 접고 진짜로 시작 (판 띠·스포트라이트는 지금부터) */
function endFilm(s: RewState) {
  if (!s.film) return;
  s.filmMarks = s.film.marks.filter((m) => !m.hero);
  s.film = null;
  s.playT = s.t;
  s.progT = s.t;
  if (s.banner) s.banner.t = s.t;
  if (s.spot) s.spot.t = s.t + 150;
  ev(s, 'filmEnd', 0.5, 0.4);
  // 두 번 넘게 진 판: 힌트를 한 번 저절로
  if (s.fails >= 2 && !s.autoHint) (s.autoHint = true), showHint(s, true);
}
/** 손 안 대면 벌어질 일을 미리 돌려 둔다: 주인공이 넘어지거나·막히거나·누가 다치면 조금 더 보여 주고 끝 */
function makeFilm(W0: World): Film {
  const W = cloneWorld(W0), frames: World[] = [cloneWorld(W)], evs: Ev[] = [], marks: Film['marks'] = [];
  let end = -1, why = '';
  const sink: Sink = (kind, x, y, v = 0, id = -1) => {
    evs.push({ t: W.t, kind, x, y, v, id });
    if (end >= 0) return;
    const H = W.hero;
    if (kind === 'bonk' || kind === 'splash') {
      end = W.t + 36;
      why = H.why || '어이쿠!';
      marks.push({ x: H.x, y: H.y - HCY, t: W.t, r: 0.06, hero: true });
      const th = id >= 0 ? thingOf(W, id) : undefined;
      if (th) {
        const c = thingCenter(th);
        marks.push({ x: c.x, y: c.y, t: W.t, r: Math.min(0.1, c.r), hero: false });
      }
    } else if (kind === 'hurt' || kind === 'wet' || kind === 'lost') {
      end = W.t + 36;
      why = kind === 'lost' ? '놓쳐 버려요!' : '다쳐요!';
      marks.push({ x, y, t: W.t, r: 0.05, hero: true });
    } else if (kind === 'stuck') {
      end = W.t + 30;
      why = '길이 막혀요!';
      marks.push({ x: H.x + 0.05, y: H.y - 0.03, t: W.t, r: 0.05, hero: true });
      // 길을 막는 것: 주인공 앞에서 가장 가까운 물건 (또는 막아선 도깨비)
      let best: Thing | null = null, bd = 0.3;
      for (const th of W.th) {
        if (th.k === 'arrow') continue;
        const c = thingCenter(th), d = Math.hypot(c.x - (H.x + 0.08), c.y - H.y);
        if (c.x > H.x - 0.05 && d < bd) (bd = d), (best = th);
      }
      const wk = W.ac.find((a) => a.role === R_WALK && !a.ko && a.x > H.x && a.x - H.x < 0.12);
      if (wk) marks.push({ x: wk.x, y: wk.y - 0.05, t: W.t, r: 0.06, hero: false });
      else if (best) {
        const c = thingCenter(best);
        marks.push({ x: c.x, y: c.y, t: W.t, r: Math.min(0.11, c.r), hero: false });
      }
    }
  };
  for (let k = 0; k < 560 && (end < 0 || W.t < end); k++) {
    stepWorld(W, sink);
    if (W.t % FS === 0) frames.push(cloneWorld(W));
    if (end < 0 && W.hero.st === H_WIN) (end = W.t + 20), (why = '');
  }
  if (W.t % FS !== 0) frames.push(cloneWorld(W));
  return { frames, evs, marks, why, end: W.t };
}

// ───────────────────────────── 카메라 ─────────────────────────────
/** 가장 가깝게 당긴 배율 · 장면 높이(폭 단위) */
const ZMAX = 1.4, SCN = BOTY;
/** 지금 봐야 할 것(주인공·움직이는 물건·되돌아갈 자리·쏘려는 도깨비)을 담는 카메라 목표 */
function camTarget(s: RewState): { x: number; y: number; z: number } {
  const W = s.W, H = W.hero, L = s.L;
  const walking = H.st === H_WALK || H.st === H_IDLE;
  let x0 = H.x - 0.1, x1 = H.x + (walking ? 0.3 : 0.22), y0 = H.y - 0.22, y1 = H.y + 0.05;
  const add = (x: number, y: number, rx: number, ry: number) => {
    x0 = Math.min(x0, x - rx);
    x1 = Math.max(x1, x + rx);
    y0 = Math.min(y0, y - ry);
    y1 = Math.max(y1, y + ry);
  };
  for (const th of W.th) {
    if (th.st === DONE) continue;
    const active = th.st === REW || th.st === CHN || th.st === HOLD || (th.st === FWD && th.tau < th.dur) || (th.st === WAIT && th.hold < 45);
    const c = thingCenter(th);
    const ahead = c.x > H.x - 0.12 && c.x < H.x + 0.5;
    if (!active && !(ahead && th.tau > 0)) continue;
    add(c.x, c.y, Math.min(0.12, c.r * 0.8), Math.min(0.1, c.r * 0.7));
    if (th.st === REW) {
      pose(th, 0);
      add(P.x, P.y, 0.04, 0.04);
      const o = th.owner >= 0 ? actorOf(W, th.owner) : undefined;
      if (o) add(o.x, o.y - 0.05, 0.04, 0.06);
    } else if (th.k === 'arrow' && th.tau < th.n) {
      add(th.x2, th.y2, 0.03, 0.03);
      add(th.x, th.y, 0.04, 0.04);
    }
  }
  for (const a of W.ac) {
    if (a.ko || a.hurt || a.k === 'machine') continue;
    if (a.role === R_ARCH && a.next - W.t < 70) add(a.x, a.y - 0.05, 0.05, 0.06);
    else if (a.role === R_RIDER || a.role === R_WALK) {
      if (Math.abs(a.x - H.x) < 0.5) add(a.x, a.y - 0.05, 0.04, 0.06);
    } else if (a.role === R_VILL && W.th.some((q) => dangerOf(q) !== null && Math.hypot(D.x - a.x, D.y - a.y) < 0.3)) add(a.x, a.y - 0.05, 0.04, 0.06);
  }
  if (H.x > L.gearX - 0.45) add(L.gearX, L.gearY - 0.06, 0.05, 0.06);
  const bw = x1 - x0 + 0.03, bh = y1 - y0 + 0.03;
  const z = Math.max(1, Math.min(ZMAX, 1 / bw, SCN / bh));
  const vw = 1 / z, vh = SCN / z;
  const cx = (x0 + x1) / 2;
  // 주인공 발은 화면 아래쪽 2/3 근처 (위는 지붕·발코니, 아래는 앞마당)
  const want = Math.min(y0 - 0.03, H.y - vh * 0.64);
  return { x: Math.max(0, Math.min(1 - vw, cx - vw / 2)), y: Math.max(0, Math.min(BOTY - vh, want)), z };
}
function updateCam(s: RewState, snap: boolean) {
  const t = camTarget(s), c = s.cam;
  if (snap) (c.x = t.x), (c.y = t.y), (c.z = t.z);
  else {
    c.z += (t.z - c.z) * 0.035;
    c.x += (t.x - c.x) * 0.05;
    c.y += (t.y - c.y) * 0.05;
  }
  c.x = Math.max(0, Math.min(1 - 1 / c.z, c.x));
  c.y = Math.max(0, Math.min(BOTY - SCN / c.z, c.y));
}
/** 화면(0~1) → 세계 */
const toWorldX = (s: RewState, px: number) => s.cam.x + px / s.cam.z;
const toWorldY = (s: RewState, py: number) => s.cam.y + (py * A - TOPH) / s.cam.z;

/** 손가락이 닿은 자리 → 가장 가까운 물건을 톡 */
function tapAt(s: RewState, px: number, py: number) {
  const W = s.W, wx = toWorldX(s, px), wy = toWorldY(s, py);
  if (s.banner && s.t - s.banner.t < 150) s.banner.t = s.t - 150;
  let best: Thing | null = null, bd = TAP_R;
  for (const th of W.th) {
    if (th.st === DONE) continue;
    const d = tapDist(th, wx, wy);
    if (d < bd) (bd = d), (best = th);
  }
  if (!best && s.magnet) {
    // 배우는 판: 어디를 톡 해도 움직인 물건 중 가장 가까운 것 (처음 하는 사람의 첫 손길은 반드시 '착!')
    let bd2 = s.stage === 0 ? 3 : 0.3;
    for (const th of W.th) {
      if (th.st === DONE || th.tau <= 0) continue;
      const d = tapDist(th, wx, wy);
      if (d < bd2) (bd2 = d), (best = th);
    }
  }
  if (!best) {
    ev(s, 'miss', wx, wy);
    return;
  }
  const r = tapThing(W, best, sinkOf(s));
  s.sel = best.id;
  s.lastTap = s.t;
  if (r === 1) {
    if (s.firstTap < 0) (s.firstTap = s.t), (s.slow = 10);
    see(s, 'rewind');
  } else if (r === 2) see(s, 'stop');
}
// ───────────────────────────── 위 띠 단추 · 막힘 힌트 ─────────────────────────────
/** 전구(힌트)·↺(처음부터) 단추 자리 (폭 단위, 화면 위에서) */
const BULB = [0.935, 0.05, 0.072], AGAIN = [0.825, 0.05, 0.056];
/** 필름에서 다시 보여 줄 사건 (그림·소리) */
const FILM_EV = new Set(['potBreak', 'barrelSmash', 'plankSplash', 'splash', 'bonk', 'stuck', 'hurt', 'wet', 'lost', 'crateLand', 'stackFall', 'burst', 'treeFall', 'logLand', 'shoot', 'knock', 'sackLand', 'weir', 'balloonGone', 'ko', 'creak', 'guard']);
/** 키보드 H·? 로 힌트를 부른 판 (그리기에서 캔버스에 단 귀가 알린다) */
const hintKey = new WeakSet<object>();
let lastDrawn: object | null = null;
const hooked = new WeakSet<object>();
function hookKeys(cv: HTMLCanvasElement | undefined) {
  if (!cv || typeof cv.addEventListener !== 'function' || hooked.has(cv)) return;
  hooked.add(cv);
  cv.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.key === 'h' || e.key === 'H' || e.key === '?' || e.key === 'ㅗ') && lastDrawn) hintKey.add(lastDrawn);
  });
}
/** 누른 자리가 위 띠 단추인가 · 띠(물건 없는 곳)인가 */
function hudHit(px: number, py: number): 'bulb' | 'again' | 'bar' | null {
  const y = py * A;
  if (Math.hypot(px - BULB[0], y - BULB[1]) < BULB[2]) return 'bulb';
  if (Math.hypot(px - AGAIN[0], y - AGAIN[1]) < AGAIN[2]) return 'again';
  if (y < TOPH || y > TOPH + BOTY) return 'bar';
  return null;
}
function toggleHint(s: RewState) {
  if (s.phase !== 'play') return;
  if (s.film) endFilm(s);
  if (s.hint && s.hint.done < 0 && s.t - s.hint.t > 20) return void (s.hint = null);
  showHint(s, false);
}
/** 받침(을/를·이/가) */
const jong = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 !== 0;
};
const eul = (w: string) => w + (jong(w) ? '을' : '를');
const iga = (w: string) => w + (jong(w) ? '이' : '가');
function thingName(th: Thing | undefined): string {
  if (!th) return '화살';
  if (th.k === 'pot') return th.n === 1 ? '물통' : th.n === 2 ? '등불' : th.cause >= 0 ? '꽃바구니' : '화분';
  return ({ bridge: '다리', barrel: th.harm ? '술통' : '빈 통', arrow: '화살', raft: '뗏목', log: '통나무', water: '물탱크', balloon: '풍선', crate: '상자', gear: '톱니', stack: '상자 탑', ferry: '나룻배', sack: '모래 자루' } as Record<string, string>)[th.k] ?? '물건';
}
/** 지금 상태에서 다음 한 수: 잘하는 봇의 계획을 지금 세계로 한 번 돌려 첫 수를 쓴다 (난수 없음 — 세계 복사본만) */
function showHint(s: RewState, auto: boolean) {
  const W = s.W;
  s.hintsHere++;
  s.hintN++;
  const save = PACE;
  PACE = DEC;
  const pl = planFrom(cloneWorld(W), 3000);
  PACE = save;
  const h: Hint = { t: s.t, id: -1, at: W.t, stop: -1, ghost: -1, text: '', restart: false, none: false, done: -1, arch: -1, next: -1, why2: '' };
  s.hint = h;
  if (s.banner && s.t - s.banner.t < 170) s.banner.t = s.t - 170;
  ev(s, 'hint', 0.5, 0.3, auto ? 1 : 0);
  if (!pl.win) {
    h.restart = true;
    h.text = '이대로는 어려워요 — 처음부터 다시 해 볼까요?';
    return;
  }
  if (!pl.acts.length) {
    h.none = true;
    h.text = '그대로 두면 돼요 — 부엉이를 지켜봐요';
    return;
  }
  h.at = pl.acts[0];
  h.id = pl.acts[1];
  h.stop = pl.acts[2];
  // 계획대로 한 번 더 돌려 그 한 수가 무슨 일을 하는지 본다 (무엇을·왜)
  const C = cloneWorld(W), acts = pl.acts, evs: Ev[] = [];
  const sink: Sink = (kind, x, y, v = 0, id = -1) => evs.push({ t: C.t, kind, x, y, v, id });
  let i = 0, th0: Thing | undefined;
  for (let k = 0; k < 1500 && C.hero.st !== H_WIN && C.hero.st !== H_FAIL; k++) {
    while (i < acts.length) {
      const th = thingOf(C, acts[i + 1]), ts = acts[i + 2];
      if (ts >= 0) {
        if (!th || th.st !== REW) i += 3;
        else if (th.tau <= ts) (tapThing(C, th, sink), (i += 3));
        else break;
      } else if (C.t >= acts[i]) {
        if (i === 0 && th) (th0 = { ...th }), (h.ghost = th.tau);
        if (th && tappable(th)) tapThing(C, th, i === 0 ? sink : null);
        if (i === 0 && th && tappable(th)) evs.push({ t: C.t, kind: 'go!', x: 0, y: 0, v: 0, id: th.id });
        i += 3;
      } else break;
    }
    stepWorld(C, i >= 3 ? sink : null);
    if (i >= 3 && C.t - h.at > 420) break;
  }
  if (h.stop >= 0) h.ghost = h.stop;
  // 되감기 시작 다음 수가 같은 물건 멈춤이면, 시작을 누른 뒤 이어서 멈출 자리도 보여 준다
  if (h.stop < 0 && acts.length > 3 && acts[4] === h.id && acts[5] >= 0) h.next = acts[5];
  const cur = thingOf(W, h.id), th = cur ?? th0;
  if (!cur && th && th.k === 'arrow') h.arch = th.owner;
  const nm = thingName(th);
  let why = '';
  // 다음 수를 두기 전까지 일어난 일만 이 한 수의 덕으로 친다 (물건 id가 붙은 사건은 언제든)
  const nextT = acts.length > 3 && acts[5] < 0 ? acts[3] : 1e9;
  for (const e of evs) {
    const mine = e.t < nextT;
    if (e.kind === 'catch' && e.id === h.id) why ||= `${eul(nm)} 제자리까지 — 주인이 받아요`;
    else if (e.kind === 'arrowHome' && e.id === h.id) why ||= '화살을 되감으면 쏜 도깨비가 꽈당!';
    else if (e.kind === 'ko' && mine && th && (th.k === 'barrel' || th.k === 'gear')) why ||= `되감은 ${iga(nm)} 도깨비를 꽈당!`;
    else if (e.kind === 'rescue' && mine) why ||= `${eul(nm)} 되감아 태운 친구를 데려와요`;
    else if (e.kind === 'machine' && e.id === h.id) why ||= '톱니를 기계까지 — 다리가 내려와요';
    else if (e.kind === 'steam' && e.id === h.id) why ||= '쏟아진 물을 거꾸로 — 불을 지나 솟아요';
    else if (e.kind === 'chain' && e.v === h.id) why ||= `${eul(nm)} 되감으면 떨어진 것도 함께 돌아와요`;
    else if (e.kind === 'dock' && e.id === h.id) why ||= (h.stop < 0 ? `${eul(nm)} 되감다가, ` : '') + (th && th.k === 'stack' ? '계단 모양일 때 다시 톡' : '강을 가로지를 때 다시 톡 — 다리가 돼요');
    else if (e.kind === 'stop' && e.id === h.id && th && th.k === 'crate' && h.stop < 0) why ||= '부엉이를 태운 채 상자를 되감다가, 위층에서 다시 톡';
    else if (e.kind === 'origin' && e.id === h.id && th && th.k === 'crate') why ||= '부엉이를 태운 채 상자를 되감아요';
    else if (e.kind === 'plankMend' && e.id === h.id && e.v === 0) why ||= '다리를 되감아 다시 세워요';
  }
  if (!why && th && h.stop < 0) {
    if (th.k === 'crate') why = '부엉이를 태운 채 상자를 되감아요';
    else if (th.k === 'ferry') why = '나룻배를 되감아 이쪽 나루로 데려와요';
    else if (th.k === 'sack') why = '모래 자루를 되감아 접시에 앉혀요 — 반대쪽이 올라가요';
    else if (th.k === 'pot' && th.n === 0) why = `${eul(nm)} 되감아 길 위에서 치워요`;
  }
  if (!why) why = h.stop >= 0 ? `${iga(nm)} 이 자리에 오면 다시 톡 — 멈춰요` : `${eul(nm)} 되감아요`;
  h.text = why;
  h.why2 = th && th.k === 'stack' ? '계단 모양에 오면 다시 톡!' : th && (th.k === 'log' || th.k === 'raft') ? '강을 가로지를 때 다시 톡!' : `${iga(nm)} 반투명 자리에 오면 다시 톡!`;
}
/** 힌트 따라가기: 그 수를 두면 '좋아요' 하고 접고, 때를 한참 놓치면 접는다 (전구는 그대로) */
function keepHint(s: RewState) {
  const h = s.hint;
  if (!h) return;
  if (h.done >= 0) {
    if (s.t - h.done > 60) s.hint = null;
    return;
  }
  if (h.restart || h.none) {
    if (s.t - h.t > 420) s.hint = null;
    return;
  }
  const th = thingOf(s.W, h.id);
  const did = h.stop >= 0 ? !th || th.st !== REW : !!th && th.st === REW;
  if (did && h.next >= 0 && th && th.st === REW) {
    // 이어서: 멈출 자리
    h.stop = h.ghost = h.next;
    h.next = -1;
    h.text = h.why2;
    h.t = s.t;
    ev(s, 'hintOk', 0.5, 0.3);
  } else if (did) (h.done = s.t), ev(s, 'hintOk', 0.5, 0.3);
  else if (s.W.t > h.at + 100 || s.t - h.t > 1500) s.hint = null;
}
/** 톡 한 자리와 물건 사이 거리(물건마다 잡히는 모양이 다르다 — 넉넉히) */
function tapDist(th: Thing, x: number, y: number): number {
  pose(th, th.tau);
  switch (th.k) {
    case 'bridge': {
      const cx = (th.x + th.x2) / 2, hw = (th.x2 - th.x) / 2 + 0.02;
      const dx = Math.max(0, Math.abs(x - cx) - hw), dy = y < th.y - 0.08 ? th.y - 0.08 - y : y > th.y + 0.24 ? y - th.y - 0.24 : 0;
      return Math.hypot(dx, dy);
    }
    case 'water': {
      const dx = Math.max(0, th.x2 - 0.01 - x, x - th.y2 - 0.01), dy = Math.max(0, th.h - 0.1 - y, y - th.h - 0.08);
      const dt = Math.hypot(x - th.x, y - th.y);
      return Math.min(Math.hypot(dx, dy), Math.max(0, dt - 0.06));
    }
    case 'raft':
    case 'log': {
      if (th.k === 'log' && th.tau < LOG_LIE) {
        // 서 있는(쓰러지는) 나무: 줄기 둘레
        const ang = P.a, len = th.w;
        const ex = th.x + Math.sin(ang) * len, ey = th.y - Math.cos(ang) * len;
        return segDist(x, y, th.x, th.y, ex, ey);
      }
      const x0 = th.k === 'raft' ? th.x - th.w / 2 : th.x - 0.02, x1 = th.k === 'raft' ? th.x + th.w / 2 : th.x2;
      return segDist(x, y, x0, P.y - 0.01, x1, P.y - 0.01);
    }
    case 'crate':
      return Math.max(0, Math.hypot(x - P.x, y - (P.y + 0.06)) - 0.07);
    case 'stack': {
      // 상자들 둘레 (넉넉히)
      let bd = 9;
      for (let k = 0; k < ST_N; k++) (stackCrate(th, k, th.tau), (bd = Math.min(bd, Math.hypot(x - P.x, y - (P.y + ST_CH / 2)) - 0.06)));
      return Math.max(0, bd);
    }
    case 'ferry':
      return segDist(x, y, P.x - th.w / 2, th.y - 0.01, P.x + th.w / 2, th.y - 0.01);
    case 'sack':
      return Math.max(0, Math.hypot(x - P.x, y - (P.y - 0.03)) - 0.04);
    case 'balloon':
      return Math.max(0, Math.min(Math.hypot(x - P.x, y - P.y), Math.hypot(x - P.x, y - P.y - 0.13)) - 0.04);
    case 'pot':
      // 물통: 선반 위 통이나 쏟아진 물
      if (th.n === 1) return Math.max(0, Math.min(Math.hypot(x - th.x, y - (th.y - 0.025)) - 0.035, Math.hypot(x - P.x, y - P.y) - 0.03));
      return Math.max(0, Math.hypot(x - P.x, y - P.y) - (th.tau >= potHit(th) ? 0.05 : 0.02));
    case 'gear':
      return Math.max(0, Math.hypot(x - P.x, y - (P.y - 0.05)) - 0.04);
    case 'arrow':
      return Math.max(0, Math.hypot(x - P.x, y - P.y) - 0.02);
    default:
      return Math.hypot(x - P.x, y - P.y);
  }
}
function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
  const q = l2 > 0 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0;
  return Math.hypot(px - (x0 + dx * q), py - (y0 + dy * q));
}

const PTS_CLEAR = 120, PTS_STAR = [0, 80, 180, 320], PTS_WIN = 500;
function finish(s: RewState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const L = s.L, W = s.W;
  if (ok) {
    s.starOk = starsOf(L, W);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.gears++;
    s.fixed = Math.max(s.fixed, s.stage + 1);
    s.pts += Math.round((PTS_CLEAR + PTS_STAR[s.got] + Math.max(0, W.sand) * 0.5 + W.saved * 40 + W.ko * 30) * (1 + 0.12 * s.stage));
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += PTS_WIN + s.hearts * 120);
    ev(s, 'clear', 0.5, 0.5, s.got);
    see(s, 'fix' + s.stage);
  } else {
    s.hearts--;
    s.tries++;
    s.fails++;
    ev(s, 'fail', 0.5, 0.5, 0, -1, why);
  }
}
/** 나아감으로 치는 사건 (15초 넘게 이게 없으면 전구가 반짝) */
const PROG = new Set(['catch', 'ko', 'rescue', 'machine', 'dock', 'origin', 'plankMend', 'stackStairs', 'steam', 'go', 'board', 'gearGet', 'chain', 'potMend', 'barrelMend']);

/** 사건 받기: 세계가 알리는 일을 화면 사건으로 · 큰 순간 · 새것 */
function sinkOf(s: RewState): Sink {
  return (kind, x, y, v = 0, id = -1) => {
    ev(s, kind, x, y, v, id);
    if (PROG.has(kind)) s.progT = s.t;
    if (kind === 'twin') (s.wowN++, see(s, 'twin'), (s.slow = Math.max(s.slow, 14)));
    if (kind === 'chain') {
      // 연쇄: 되감는 물건이 밀었던 것까지 끌고 온다 — 한 번의 되감기에 한 번 큰 순간
      if (s.t - (s.chainT ?? -99) > 40) (s.wowN++, see(s, 'chain'), (s.slow = Math.max(s.slow, 18)));
      s.chainT = s.t;
      return;
    }
    if (kind === 'plankMend' || kind === 'potMend' || kind === 'barrelMend' || kind === 'logLift' || kind === 'crateLift') {
      // 다리는 마지막 판자까지 붙어 '다시 섰을 때' 한 번
      if (kind === 'plankMend' && v !== 0) return;
      s.wowN++;
      see(s, 'mend');
      s.slow = Math.max(s.slow, 8);
    } else if (kind === 'catch') (s.wowN++, see(s, 'catch'), (s.slow = Math.max(s.slow, 10)));
    else if (kind === 'ko') (s.wowN++, see(s, 'ko'), (s.slow = Math.max(s.slow, 16)));
    else if (kind === 'rescue') (s.wowN++, see(s, 'rescue'), (s.slow = Math.max(s.slow, 12)));
    else if (kind === 'machine') (s.wowN++, see(s, 'machine'), (s.slow = Math.max(s.slow, 12)));
    else if (kind === 'dock') (s.wowN++, see(s, 'dock'));
    else if (kind === 'board') {
      const th = thingOf(s.W, id);
      if (th && th.k === 'crate') see(s, 'ride');
    } else if (kind === 'origin') {
      const th = thingOf(s.W, id);
      if (th && th.k === 'crate' && s.W.hero.on === th.id) (s.wowN++, see(s, 'lift'));
    }
  };
}

export const rewindone: GameDef<RewState> & { wows(s: RewState): number } = {
  id: 'rewindone',
  name: '⏪ 한 물건만 되감기',
  genes: ['rewindone', 'depth', 'collect'],
  twist: '세상 전체가 아니라 톡 한 물건 하나만 자기 시간이 거꾸로 감긴다 — 무너진 다리가 다시 서는 동안에도 다른 것은 계속 앞으로 흘러, 되돌아간 화살이 쏜 도깨비를 맞히고 거꾸로 오르는 상자가 주인공을 태워 올린다',
  rules: ['세상은 저절로 흘러가요. 물건을 톡 하면 그 물건만 시간이 거꾸로!', '다시 톡 하면 멈춰요. 모래를 아껴 꼬마 시계공을 시계 부품까지.'],
  controls: 'touch',
  origin: '오너가 고른 아이디어 (38라운드): 한 물건만 되감기',
  hint: '물건을 톡! (다시 톡 = 멈춤) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '밝은 3/4 시점 시계탑 마을 — 꼬마 시계공 부엉이의 되감기 모험',
    mood: '아침 햇살이 비치는 알록달록 장터·강가·시계탑. 멈춰 버린 시계탑 마을에서 무너지고 쏟아지는 일이 저절로 벌어지고, 톡 한 물건만 시계 문양 빛에 감싸여 지나온 길을 거꾸로 되짚는다 — 조각이 빨려 모여 착! 붙으면 마을 사람들이 박수. 판을 깰 때마다 분수가 솟고 풍차가 돌며 마을이 살아난다.',
    palette: { bg: '#bfe6ff', ink: '#2a2238', muted: '#8a7f9a', accent: '#ffb02e', hot: '#ff5a4a', soft: '#fff3dc' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.L.actors.filter((a) => a.role === R_VILL || a.role === R_RIDER).length - s.W.hurt,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      seed, variant: ((seed >>> 0) * 2654435761 >>> 0) % VARIANTS, t: 0, stage: 0, phase: 'play', pt: 0, endT: -1, hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', won: false, dead: false, again: false, tries: 0,
      gears: 0, fixed: 0, seen: new Set<string>(), events: [], banner: null, spot: null, wowN: 0, firstTap: -1, down: false, ax: 0.5, ay: 0.5, slow: 0, magnet: true, idleT: 0, lastTap: -99, sel: -1,
      cam: { x: 0, y: 0, z: 1 }, chDone: -1, film: null, ft: 0, playT: -1, hint: null, hintsHere: 0, hintN: 0, fails: 0, autoHint: false, progT: 0, restarts: 0,
    } as unknown as RewState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.slow > 0) s.slow--;
    if (s.events.length > 90 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    if (s.spot && s.t - s.spot.t > 200) s.spot = null;
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? 210 : 150) || (press && s.pt > 50)) {
        if (s.ok) {
          if (s.won || STAGES[s.stage + 1].ch !== STAGES[s.stage].ch) (s.chDone = STAGES[s.stage].ch), (s.phase = 'chapter'), (s.pt = 0);
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.phase === 'chapter') {
      // 장 끝 장면: 이번 장에 되살린 것들이 마을 전경에서 차례로 '짠' → 시계탑 바늘 한 칸 → 다음 장 실루엣
      const b = s.chDone * 6;
      for (let j = 0; j < 6; j++) if (s.pt === REV0 + j * REVD) ev(s, 'revive', FIX_POS[b + j][0], FIX_POS[b + j][1], b + j);
      if (s.pt === NOTCH_T) ev(s, 'notch', CLK[0], CLK[1], s.chDone + 1);
      if (s.chDone < 2 && s.pt === ABIL_T) ev(s, 'ability', 0.5, 0.75, s.chDone);
      // 능력이 생기는 장: 일찍 톡 하면 새 능력 카드로 건너뛴다
      if (s.chDone < 2 && press && s.pt > 60 && s.pt < ABIL_T - 1) return void (s.pt = ABIL_T - 1);
      if (s.pt >= (s.chDone < 2 ? CH_END_AB : CH_END) || (press && s.pt > (s.chDone < 2 ? ABIL_T + 40 : 60))) {
        if (s.won) s.dead = true;
        else s.stage++, newStage(s);
      }
      return;
    }
    // 키보드 H·? = 힌트
    if (hintKey.has(s)) (hintKey.delete(s), toggleHint(s));
    if (press) {
      const hud = hudHit(p!.x, p!.y);
      if (hud === 'bulb') toggleHint(s);
      else if (hud === 'again') {
        s.again = true;
        s.restarts++;
        newStage(s);
        ev(s, 'again', 0.5, 0.4);
        return;
      } else {
        // 필름 중 톡 = 건너뛰기 (누른 자리에 물건이 있으면 그것도 톡)
        if (s.film) endFilm(s);
        if (hud !== 'bar') tapAt(s, p!.x, p!.y);
      }
    }
    if (s.film) {
      // 필름: 세계는 멈춰 있고, 미리 돌려 둔 장면을 빨리 감았다가 '지이익' 되감는다
      const f = s.film, span = f.end - f.frames[0].t, a0 = Math.floor(((s.ft) / FILM_FWD) * span), a1 = Math.floor(((s.ft + 1) / FILM_FWD) * span);
      if (s.ft < FILM_FWD) for (const e of f.evs) if (e.t - f.frames[0].t > a0 && e.t - f.frames[0].t <= a1 && FILM_EV.has(e.kind)) ev(s, e.kind, e.x, e.y, e.v, e.id);
      if (s.ft === FILM_FWD) ev(s, 'filmRew', 0.5, 0.4);
      s.ft++;
      if (s.ft >= FILM_FWD + FILM_REW) endFilm(s);
      return;
    }
    // 큰 순간엔 잠깐 느려진다 (세계를 두 틱에 한 번만)
    if (!(s.slow > 0 && s.t % 2 === 0)) stepWorld(s.W, sinkOf(s));
    updateCam(s, false);
    const W = s.W, H = W.hero;
    keepHint(s);
    if (H.st === H_WAIT && W.rew < 0) s.idleT++;
    else s.idleT = 0;
    if (s.endT < 0) {
      if (H.st === H_WIN) s.endT = s.t + 70;
      else if (H.st === H_FAIL) s.endT = s.t + 80;
      else if (H.st === H_WAIT && W.sand <= 0 && H.waitT > 420) (H.st = H_FAIL), (H.why = '모래가 바닥났어요!'), (s.endT = s.t + 40);
      else if (H.st === H_WAIT && s.stage >= 2 && H.waitT > 1200) (H.st = H_FAIL), (H.why = '꼼짝 못 하겠어요!'), (s.endT = s.t + 40);
    }
    if (s.endT >= 0 && s.t >= s.endT) {
      if (H.st === H_WIN) finish(s, true, '');
      else finish(s, false, H.why || '어이쿠!');
    }
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 물건을 누르는 자리 (화면 비율) */
function tapPoint(s: RewState, th: Thing): { x: number; y: number } {
  const w = worldTap(th), c = s.cam;
  return { x: (w.x - c.x) * c.z, y: (TOPH + (w.y - c.y) * c.z) / A };
}
/** 물건을 누르는 세계 자리 */
function worldTap(th: Thing): { x: number; y: number } {
  pose(th, th.tau);
  let x = P.x, y = P.y;
  if (th.k === 'bridge') y = th.y + 0.05;
  else if (th.k === 'crate') y = P.y + 0.06;
  else if (th.k === 'gear') y = P.y - 0.05;
  else if (th.k === 'water') (x = (th.x2 + th.y2) / 2), (y = th.h - 0.02);
  else if (th.k === 'log' && th.tau < LOG_LIE) (x = th.x + Math.sin(P.a) * th.w * 0.5), (y = th.y - Math.cos(P.a) * th.w * 0.5);
  else if (th.k === 'log' || th.k === 'raft') (x = th.k === 'log' ? (th.x + th.x2) / 2 : th.x), (y = P.y - 0.01);
  else if (th.k === 'balloon') y = P.y + 0.02;
  else if (th.k === 'stack') (x = th.x + 0.1), (y = th.y - 0.08);
  else if (th.k === 'sack') y = P.y - 0.02;
  else if (th.k === 'pot' && th.n === 1) (x = th.x), (y = th.y - 0.025);
  return { x, y };
}
interface Mind { stage: number; tries: number; plan: Plan | null; i: number; up: boolean; want: number; again: boolean; rp: number; ck: number; gap: number; prevT: number }
const minds = new WeakMap<object, Mind>();
function mindOf(s: RewState): Mind {
  let m = minds.get(s);
  if (!m) minds.set(s, (m = { stage: -1, tries: -1, plan: null, i: 0, up: false, want: -1, again: false, rp: 0, ck: 0, gap: DEC, prevT: -1 }));
  if (m.stage !== s.stage || m.tries !== s.tries) (m.stage = s.stage), (m.tries = s.tries), (m.plan = null), (m.i = 0), (m.want = -1), (m.rp = 0), (m.ck = 0);
  return m;
}
/** 결과 화면·필름은 톡으로 넘긴다 (필름은 아래 띠를 톡 — 물건은 안 건드린다) */
const SKIP_FILM = { x: 0.5, y: 0.95 };
function skip(s: RewState, m: Mind): Input | null {
  if (s.phase === 'play' && s.film && s.ft > 2) {
    if (m.up) return (m.up = false), NO;
    return (m.up = true), { tap: false, dir: 0, pointer: SKIP_FILM };
  }
  if (s.phase === 'play') return null;
  if (m.up) return (m.up = false), NO;
  // 장 끝: 한 번 톡 = 새 능력 카드로 건너뛰기, 카드를 조금 본 뒤 한 번 더
  const ok = s.phase === 'chapter' ? (s.chDone < 2 ? (s.pt > 62 && s.pt < ABIL_T - 2) || s.pt > ABIL_T + 42 : s.pt > 62) : s.pt > 52;
  if (ok) return (m.up = true), { tap: false, dir: 0, pointer: { x: 0.5, y: 0.5 } };
  return NO;
}
/** 잘하는 봇: 판마다 같은 세계로 끝까지 둬 본 계획대로 톡. 멈춤은 'τ가 여기까지 오면'으로 따르고, 세계가 계획과 어긋나면 다시 계획 */
export const rewindoneSmart: Bot<RewState> = {
  name: '시계 장인',
  act(s) {
    const m = mindOf(s);
    // 내 손 빠르기 (부름 사이 틱)
    if (m.prevT >= 0 && s.t > m.prevT) m.gap = Math.max(1, Math.min(60, s.t - m.prevT));
    m.prevT = s.t;
    const sk = skip(s, m);
    if (sk) return sk;
    if (s.down || m.up) return (m.up = false), NO;
    const W = s.W;
    if (W.hero.st === H_WIN || W.hero.st === H_FAIL) return NO;
    const plan = () => {
      PACE = m.gap;
      const r = planFrom(W);
      PACE = DEC;
      return r;
    };
    if (m.again && m.plan) {
      // 늦게 눌렀다: 남은 계획이 여전히 같은 결과를 내면 그대로, 나빠지면 다시 세운다
      m.again = false;
      const o = simPlan(W, m.plan.acts, m.i);
      if (!o.win || o.hurt > m.plan.hurt || o.used > m.plan.used + 4 || o.saved < m.plan.saved) {
        m.plan = plan();
        m.i = 0;
        m.rp++;
      }
    }
    if (!m.plan) {
      // 아직 아무것도 안 건드린 세계는 판·틱만으로 정해진다 — 같은 손 빠르기면 계획을 나눠 쓴다
      const fresh = W.taps === 0 && W.used === 0, key = `${s.variant}:${s.stage}:${m.gap}:${W.t}`;
      m.plan = fresh ? planCache.get(key) ?? null : null;
      if (!m.plan) {
        m.plan = plan();
        if (fresh) planCache.set(key, m.plan);
      }
      m.i = 0;
    }
    const pl = m.plan, a = pl.acts;
    const replan = () => {
      m.plan = plan();
      m.i = 0;
      m.rp++;
    };
    if (m.i >= a.length) {
      // 계획이 끝났는데 앞으로 셈이 '이김'이 아니면 다시 (몇 번까지만)
      if (W.t - m.ck >= 30 && W.rew < 0 && W.sand > 0 && m.rp < 12) {
        m.ck = W.t;
        const o = rollout(W);
        if (!o.win || o.hurt > W.hurt) replan();
      }
      return NO;
    }
    const id = a[m.i + 1], ts = a[m.i + 2], th = thingOf(W, id);
    if (ts >= 0) {
      // 멈춤: 되감는 중이 아니면 지나간 일 · τ가 목표까지 오면 톡
      if (!th || th.st !== REW) return (m.i += 3), NO;
      if (th.tau > ts) return NO;
      m.i += 3;
      m.up = true;
      return { tap: false, dir: 0, pointer: tapPoint(s, th) };
    }
    if (W.t < a[m.i]) return NO;
    const late = W.t - a[m.i];
    m.i += 3;
    if (!th || !tappable(th)) {
      replan();
      return NO;
    }
    // 늦게 누르면(사람 속도·느린 화면) 남은 계획이 그 세계에 안 맞을 수 있다 — 누른 뒤 확인
    if (late > 0) m.again = true;
    m.up = true;
    return { tap: false, dir: 0, pointer: tapPoint(s, th) };
  },
};
/** 버릇 봇: 버릇 머리가 고른 물건을 톡 (같은 판이면 같은 결정 — 기억해 둔다) */
function habitBot(name: string, pick: (W: World) => number): Bot<RewState> {
  return {
    name,
    act(s) {
      const m = mindOf(s), sk = skip(s, m);
      if (sk) return sk;
      if (s.down || m.up) return (m.up = false), NO;
      const W = s.W;
      if (W.hero.st === H_WIN || W.hero.st === H_FAIL || W.t < m.want) return NO;
      m.want = W.t + DEC;
      const id = pick(W);
      if (id < 0) return NO;
      const th = thingOf(W, id)!;
      m.up = true;
      return { tap: false, dir: 0, pointer: tapPoint(s, th) };
    },
  };
}
/** 측정·조율용 (게임에는 안 씀) */
export const _dbg = { score2, jump: (s: RewState, st: number) => ((s.stage = st), (s.fixed = st), (s.gears = st), newStage(s)), rollout, value, tryTap, tap: (W: World, th: Thing, E: Sink) => tapThing(W, th, E), rawLevel, planFrom: (L: Level) => planFrom(newWorld(L)), planW: planFrom, simPlan, mind: (s: RewState) => minds.get(s), tapPt: (s: RewState, k: string) => tapPoint(s, s.W.th.find((q) => q.k === k)!), trialHabit, habitFirst, habitNear, starsOf, newWorld, stepWorld };
export const rewindoneHabit: Bot<RewState> = habitBot('버릇: 먼저 움직인 것부터', habitFirst);
export const rewindoneHabit2: Bot<RewState> = habitBot('버릇: 주인공에 가까운 것', habitNear);
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 (화면 위 물건 근처를 더 자주) */
export const rewindoneRandom: Bot<RewState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    m.p = { x: 0.04 + rng() * 0.92, y: 0.12 + rng() * 0.74 };
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU2 = Math.PI * 2;
const cl01 = (q: number) => Math.max(0, Math.min(1, q));
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU2);
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0.1, w), Math.max(0.1, h), Math.max(0, Math.min(r, w / 2, h / 2)));
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function rad(ctx: C2, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.2, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
}
/** 톱니바퀴 모양 (바깥 톱니 + 가운데 구멍) */
function gearPath(ctx: C2, x: number, y: number, r: number, n: number, rot: number, hole = 0.35) {
  ctx.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const a0 = rot + (k * Math.PI) / n, a1 = rot + ((k + 1) * Math.PI) / n, q = k % 2 ? r * 0.8 : r;
    ctx.lineTo(x + Math.cos(a0 + 0.06) * q, y + Math.sin(a0 + 0.06) * q);
    ctx.lineTo(x + Math.cos(a1 - 0.06) * q, y + Math.sin(a1 - 0.06) * q);
  }
  ctx.closePath();
  ctx.moveTo(x + r * hole, y);
  ctx.arc(x, y, r * hole, 0, TAU2, true);
}
function brass(ctx: C2, x: number, y: number, r: number, n: number, rot: number, glow = 0) {
  if (glow > 0) {
    ctx.fillStyle = `rgba(255,220,120,${0.3 * glow})`;
    ell(ctx, x, y, r * 1.6, r * 1.6);
    ctx.fill();
  }
  ctx.fillStyle = lin(ctx, x - r, y - r, x + r, y + r, [[0, '#ffe08a'], [0.5, '#f2b544'], [1, '#c4841c']]);
  gearPath(ctx, x, y, r, n, rot);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#8a5a10';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ell(ctx, x - r * 0.35, y - r * 0.45, r * 0.25, r * 0.12, -0.6);
  ctx.fill();
}
function shadow(ctx: C2, x: number, y: number, rx: number, a = 0.22) {
  ctx.fillStyle = `rgba(70,45,40,${a})`;
  ell(ctx, x, y, rx, rx * 0.28);
  ctx.fill();
}
/** 시계 문양: 되감는 물건 둘레에 번쩍 — 바늘이 거꾸로 돈다 */
function clockGlyph(ctx: C2, x: number, y: number, r: number, t: number, a: number) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#7fe8ff';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.shadowColor = '#5fd8ff';
  ctx.shadowBlur = r * 0.35;
  ell(ctx, x, y, r, r);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  for (let k = 0; k < 12; k++) {
    const an = (k / 12) * TAU2, q0 = k % 3 ? 0.86 : 0.78;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(an) * r * q0, y + Math.sin(an) * r * q0);
    ctx.lineTo(x + Math.cos(an) * r * 0.95, y + Math.sin(an) * r * 0.95);
    ctx.stroke();
  }
  // 거꾸로 도는 바늘
  const h1 = -t * 0.25, h2 = -t * 0.06;
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(h1) * r * 0.72, y + Math.sin(h1) * r * 0.72);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(h2) * r * 0.45, y + Math.sin(h2) * r * 0.45);
  ctx.stroke();
  // 거꾸로 화살표
  ctx.beginPath();
  ctx.arc(x, y, r * 1.12, -1.9, -0.6);
  ctx.stroke();
  const ax = x + Math.cos(-1.9) * r * 1.12, ay = y + Math.sin(-1.9) * r * 1.12;
  ctx.beginPath();
  ctx.moveTo(ax - r * 0.12, ay - r * 0.02);
  ctx.lineTo(ax + r * 0.02, ay + r * 0.12);
  ctx.lineTo(ax + r * 0.08, ay - r * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#7fe8ff';
  ctx.fill();
  ctx.restore();
}
/** 한 물건만 색을 입혀 덧그린다 (화면 밖 캔버스에 그리고 그 모양에만 색) */
let tintCv: HTMLCanvasElement | null = null;
function tinted(ctx: C2, fn: (o: C2) => void, col: string, a: number, box?: number[]) {
  if (typeof document === 'undefined') return;
  const cw = ctx.canvas.width, chh = ctx.canvas.height;
  if (!tintCv) tintCv = document.createElement('canvas');
  if (tintCv.width !== cw || tintCv.height !== chh) (tintCv.width = cw), (tintCv.height = chh);
  const o = tintCv.getContext('2d');
  if (!o) return;
  const m = ctx.getTransform();
  // 물건 둘레만 (화면 전체를 칠하면 휴대폰에서 무겁다)
  let x0 = 0, y0 = 0, x1 = cw, y1 = chh;
  if (box) {
    x0 = Math.max(0, Math.floor(m.a * box[0] + m.e) - 2);
    y0 = Math.max(0, Math.floor(m.d * box[1] + m.f) - 2);
    x1 = Math.min(cw, Math.ceil(m.a * box[2] + m.e) + 2);
    y1 = Math.min(chh, Math.ceil(m.d * box[3] + m.f) + 2);
    if (x1 <= x0 || y1 <= y0) return;
  }
  const bw = x1 - x0, bh = y1 - y0;
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-over';
  o.globalAlpha = 1;
  o.clearRect(x0, y0, bw, bh);
  o.save();
  o.beginPath();
  o.rect(x0, y0, bw, bh);
  o.clip();
  o.setTransform(m);
  fn(o);
  o.restore();
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-atop';
  o.globalAlpha = a;
  o.fillStyle = col;
  o.fillRect(x0, y0, bw, bh);
  o.globalAlpha = 1;
  o.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(tintCv, x0, y0, bw, bh, x0, y0, bw, bh);
  ctx.restore();
}
/** 먼 배경을 1/3 해상도로 그려 늘린다 — 흐린 느낌을 거의 공짜로 (filter: blur는 휴대폰·소프트웨어 그리기에서 아주 느리다) */
let softCv: HTMLCanvasElement | null = null;
function softLayer(ctx: C2, w: number, h: number, fn: (o: C2) => void) {
  if (typeof document === 'undefined') return fn(ctx);
  const m = ctx.getTransform(), k = 3, cw = Math.max(1, Math.ceil((w * m.a) / k)), chh = Math.max(1, Math.ceil((h * m.d) / k));
  if (!softCv) softCv = document.createElement('canvas');
  if (softCv.width !== cw || softCv.height !== chh) (softCv.width = cw), (softCv.height = chh);
  const o = softCv.getContext('2d');
  if (!o) return fn(ctx);
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, cw, chh);
  o.setTransform(m.a / k, 0, 0, m.d / k, 0, 0);
  fn(o);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(softCv, 0, 0, cw, chh, 0, 0, (cw * k) / m.a, (chh * k) / m.d);
  ctx.restore();
}
/** 물건(τ0..τ1 동안) 둘레 상자 — 화면 px */
function thingBox(v: View, th: Thing, t0: number, t1: number): number[] {
  let x0 = 9e9, y0 = 9e9, x1 = -9e9, y1 = -9e9;
  const tau = th.tau;
  for (let k = 0; k <= 4; k++) {
    th.tau = Math.min(th.dur, t0 + ((t1 - t0) * k) / 4);
    const c = thingCenter(th), r = th.k === 'bridge' ? 0.3 : c.r * 1.6 + 0.04;
    (x0 = Math.min(x0, v.X(c.x - r))), (x1 = Math.max(x1, v.X(c.x + r))), (y0 = Math.min(y0, v.Y(c.y - r))), (y1 = Math.max(y1, v.Y(c.y + r)));
  }
  th.tau = tau;
  return [x0, y0, x1, y1];
}
/** 작은 시계 표시: 바늘이 자기 시간만큼 돌아가 있다 (쉬는 중이면 모래시계 빛) */
function clockBadge(ctx: C2, x: number, y: number, r: number, tau: number, rest: boolean) {
  ctx.fillStyle = 'rgba(40,30,60,.35)';
  ell(ctx, x + 1, y + 2, r, r);
  ctx.fill();
  ctx.fillStyle = rest ? '#fff3c8' : '#ffffff';
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = rest ? '#ffb02e' : '#5a8ad8';
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.stroke();
  ctx.strokeStyle = '#2a2238';
  ctx.lineWidth = Math.max(1.2, r * 0.14);
  ctx.lineCap = 'round';
  const a = -Math.PI / 2 + tau * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - r * 0.45);
  ctx.stroke();
}
/** 되감는 물건이 돌아갈 길: 빛나는 길 위로 시간 가루가 제자리 쪽으로 흘러간다 */
function drawRewindPath(ctx: C2, v: View, th: Thing, t: number) {
  if (th.k === 'water' || th.tau < 4) return;
  const { X, Y, R } = v;
  const at = (q: number) => {
    const c = thingCenter({ ...th, tau: q });
    return [X(c.x), Y(c.y)];
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(127,232,255,.35)';
  ctx.lineWidth = R(0.018);
  ctx.beginPath();
  const step = Math.max(2, Math.floor(th.tau / 20));
  for (let q = th.tau; q >= 0; q -= step) {
    const [x, y] = at(q);
    if (q === th.tau) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const [ox, oy] = at(0);
  ctx.lineTo(ox, oy);
  ctx.stroke();
  // 제자리 표시
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ell(ctx, ox, oy, R(0.035), R(0.035));
  ctx.stroke();
  ctx.setLineDash([]);
  // 시간 가루
  for (let k = 0; k < 7; k++) {
    const q = (t * 0.03 + k / 7) % 1, [x, y] = at(Math.max(0, th.tau * (1 - q)));
    ctx.fillStyle = k % 2 ? '#bff6ff' : '#ffe08a';
    ell(ctx, x, y, R(0.007) * (1.2 - q * 0.6), R(0.007) * (1.2 - q * 0.6));
    ctx.fill();
  }
  ctx.restore();
}
/** 작은 모래시계 아이콘 */
function hourglass(ctx: C2, x: number, y: number, r: number, fill: number, flip: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(flip * Math.PI);
  ctx.fillStyle = '#8a5a2a';
  rr(ctx, -r * 0.75, -r * 1.12, r * 1.5, r * 0.22, r * 0.08);
  ctx.fill();
  rr(ctx, -r * 0.75, r * 0.9, r * 1.5, r * 0.22, r * 0.08);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,245,255,.85)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.9);
  ctx.lineTo(r * 0.6, -r * 0.9);
  ctx.lineTo(r * 0.1, 0);
  ctx.lineTo(r * 0.6, r * 0.9);
  ctx.lineTo(-r * 0.6, r * 0.9);
  ctx.lineTo(-r * 0.1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  ctx.fillStyle = '#ffc94a';
  const top = cl01(fill);
  ctx.beginPath();
  ctx.moveTo(-r * 0.5 * top, -r * 0.08 - r * 0.75 * top);
  ctx.lineTo(r * 0.5 * top, -r * 0.08 - r * 0.75 * top);
  ctx.lineTo(0, -r * 0.05);
  ctx.closePath();
  ctx.fill();
  const bot = 1 - top;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.88);
  ctx.lineTo(r * 0.55, r * 0.88);
  ctx.lineTo(r * 0.55 * (1 - bot * 0.7), r * 0.88 - r * 0.7 * bot);
  ctx.lineTo(-r * 0.55 * (1 - bot * 0.7), r * 0.88 - r * 0.7 * bot);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.12, 1 - press * 0.12);
  ctx.fillStyle = 'rgba(40,20,40,.25)';
  ell(ctx, k * 0.1, k * 1.25, k * 0.5, k * 0.16);
  ctx.fill();
  ctx.fillStyle = '#fff3e6';
  ctx.strokeStyle = '#6a3a4a';
  ctx.lineWidth = Math.max(1.5, k * 0.07);
  rr(ctx, -k * 0.16, -k * 0.95, k * 0.32, k * 0.95, k * 0.16);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.45, -k * 0.15, k * 0.95, k * 0.95, k * 0.3);
  ctx.fill();
  ctx.stroke();
  for (let q = 0; q < 2; q++) {
    rr(ctx, k * (0.12 + q * 0.2) - k * 0.1, -k * 0.35, k * 0.22, k * 0.4, k * 0.1);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ── 캐릭터 ──
type Mood = 'idle' | 'happy' | 'shock' | 'worry' | 'dizzy' | 'wet' | 'cheer' | 'sleep' | 'grin';
/** 꼬마 시계공 부엉이 (발 위치 x,y · u = 몸 단위 px, 키 약 11u) */
function drawOwl(ctx: C2, x: number, y: number, u: number, mood: Mood, t: number, walk: number, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const bob = walk ? Math.abs(Math.sin(t * 0.32)) * 0.5 * u : mood === 'cheer' ? Math.abs(Math.sin(t * 0.3)) * 1.6 * u : 0;
  ctx.translate(0, -bob);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 발
  const st = walk ? Math.sin(t * 0.32) : 0;
  ctx.fillStyle = '#ff9d2a';
  ell(ctx, -1.3 * u + st * 0.6 * u, -0.25 * u, 1.05 * u, 0.5 * u);
  ctx.fill();
  ell(ctx, 1.3 * u - st * 0.6 * u, -0.25 * u, 1.05 * u, 0.5 * u);
  ctx.fill();
  // 몸통
  ctx.fillStyle = lin(ctx, -3.8 * u, -8 * u, 3.8 * u, 0, [[0, '#c98d4e'], [0.6, '#a8703a'], [1, '#7e5028']]);
  ell(ctx, 0, -4.4 * u, 3.9 * u, 4.4 * u);
  ctx.fill();
  // 귀깃
  ctx.fillStyle = '#8a5a2c';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 1.9 * u, -7.6 * u);
    ctx.lineTo(sd * 3.4 * u, -9.9 * u + Math.sin(t * 0.1 + sd) * 0.2 * u);
    ctx.lineTo(sd * 3.3 * u, -6.8 * u);
    ctx.closePath();
    ctx.fill();
  }
  // 배 깃털
  ctx.fillStyle = '#f7e6c4';
  ell(ctx, 0, -3.4 * u, 2.5 * u, 2.9 * u);
  ctx.fill();
  ctx.strokeStyle = 'rgba(170,120,70,.45)';
  ctx.lineWidth = Math.max(1, 0.18 * u);
  for (let r = 0; r < 3; r++)
    for (let c = -1; c <= 1; c++) {
      ctx.beginPath();
      ctx.arc(c * 0.9 * u + (r % 2) * 0.45 * u, -4.8 * u + r * 0.95 * u, 0.42 * u, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  // 연장 띠 · 렌치
  ctx.fillStyle = '#6a3c1e';
  rr(ctx, -3.5 * u, -2.2 * u, 7 * u, 0.9 * u, 0.4 * u);
  ctx.fill();
  ctx.fillStyle = '#ffcf4a';
  rr(ctx, -0.5 * u, -2.25 * u, 1 * u, 1 * u, 0.2 * u);
  ctx.fill();
  ctx.fillStyle = '#c8ccd8';
  rr(ctx, 2.2 * u, -2.8 * u, 0.45 * u, 2 * u, 0.2 * u);
  ctx.fill();
  // 날개
  const up = mood === 'cheer' || mood === 'shock' || mood === 'dizzy';
  ctx.fillStyle = '#946033';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * 3.5 * u, -4.4 * u);
    ctx.rotate(sd * (up ? -1.1 + Math.sin(t * 0.5) * 0.25 : mood === 'worry' ? 0.35 : 0.15 + (walk ? Math.sin(t * 0.32) * 0.12 * sd : 0)));
    ell(ctx, 0, 1.3 * u, 1.05 * u, 2.3 * u);
    ctx.fill();
    ctx.restore();
  }
  // 얼굴판
  ctx.fillStyle = '#e9c48e';
  ell(ctx, -1.45 * u, -6.1 * u, 1.75 * u, 1.7 * u);
  ctx.fill();
  ell(ctx, 1.45 * u, -6.1 * u, 1.75 * u, 1.7 * u);
  ctx.fill();
  // 눈
  const ey = -6.1 * u;
  if (mood === 'happy' || mood === 'cheer') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.5, 0.4 * u);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * 1.45 * u, ey + 0.3 * u, 0.85 * u, Math.PI + 0.3, -0.3);
      ctx.stroke();
    }
  } else if (mood === 'dizzy') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.2, 0.3 * u);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = k * 0.8 + t * 0.2, q = 0.08 * k * u;
        ctx.lineTo(sd * 1.45 * u + Math.cos(a) * q, ey + Math.sin(a) * q);
      }
      ctx.stroke();
    }
  } else if (mood === 'sleep') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.5, 0.35 * u);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 1.45 * u - 0.8 * u, ey);
      ctx.lineTo(sd * 1.45 * u + 0.8 * u, ey);
      ctx.stroke();
    }
  } else {
    const big = mood === 'shock' ? 1.18 : 1, pr = mood === 'shock' ? 0.45 : mood === 'worry' ? 0.6 : 0.68;
    const lookY = mood === 'worry' ? 0.35 * u : 0;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, sd * 1.45 * u, ey, 1.25 * u * big, 1.25 * u * big);
      ctx.fill();
      ctx.strokeStyle = '#ffb02e';
      ctx.lineWidth = Math.max(1, 0.25 * u);
      ctx.stroke();
      ctx.fillStyle = '#1e1414';
      const blink = mood === 'idle' && t % 180 < 6 ? 0.15 : 1;
      ell(ctx, sd * 1.45 * u + 0.25 * u, ey + lookY, pr * u, pr * u * blink);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, sd * 1.45 * u + 0.05 * u, ey - 0.3 * u + lookY, 0.25 * u, 0.25 * u);
      ctx.fill();
    }
    if (mood === 'worry') {
      ctx.strokeStyle = '#5a3418';
      ctx.lineWidth = Math.max(1.2, 0.3 * u);
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sd * 0.6 * u, -7.5 * u);
        ctx.lineTo(sd * 2.4 * u, -7.9 * u);
        ctx.stroke();
      }
      // 땀방울
      ctx.fillStyle = '#7fd0ff';
      const dy = (t % 60) / 60;
      ell(ctx, 3.3 * u, -7 * u + dy * 2 * u, 0.4 * u, 0.6 * u);
      ctx.fill();
    }
  }
  // 부리
  ctx.fillStyle = '#ff9d2a';
  ctx.beginPath();
  if (mood === 'shock' || mood === 'cheer') {
    ctx.moveTo(-0.5 * u, -5.1 * u);
    ctx.lineTo(0.5 * u, -5.1 * u);
    ctx.lineTo(0, -4.0 * u);
  } else {
    ctx.moveTo(-0.55 * u, -5.3 * u);
    ctx.lineTo(0.55 * u, -5.3 * u);
    ctx.lineTo(0, -4.4 * u);
  }
  ctx.closePath();
  ctx.fill();
  // 모자 (초록 모자 + 고글 + 톱니 휘장)
  ctx.fillStyle = '#3aa86a';
  ctx.beginPath();
  ctx.ellipse(0, -8.1 * u, 2.6 * u, 1.3 * u, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#2a8a52';
  rr(ctx, -3 * u, -8.25 * u, 6 * u, 0.6 * u, 0.3 * u);
  ctx.fill();
  ctx.fillStyle = '#5a6a7a';
  rr(ctx, -2.2 * u, -8.85 * u, 4.4 * u, 0.55 * u, 0.25 * u);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#9ad8ff';
    ell(ctx, sd * 1.1 * u, -8.6 * u, 0.62 * u, 0.5 * u);
    ctx.fill();
    ctx.strokeStyle = '#3a4a5a';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    ctx.stroke();
  }
  brass(ctx, 0, -9.35 * u, 0.62 * u, 6, t * 0.05);
  ctx.restore();
}

interface Spec { fur: string; furD: string; belly: string; ear: 'long' | 'round' | 'point' | 'horn' | 'none'; snout: 'pig' | 'fox' | 'cat' | 'mole' | 'beaver' | 'none' | 'duck'; acc: string; s: number }
const SPECIES: Record<string, Spec> = {
  grandma: { fur: '#f5efe8', furD: '#d9cfc4', belly: '#ffffff', ear: 'long', snout: 'none', acc: 'shawl', s: 1 },
  farmer: { fur: '#f6b3b0', furD: '#e08a8a', belly: '#ffd6d3', ear: 'point', snout: 'pig', acc: 'straw', s: 1.08 },
  kid: { fur: '#f58a3a', furD: '#d0682a', belly: '#fff3e0', ear: 'point', snout: 'fox', acc: 'scarf', s: 0.82 },
  mom: { fur: '#f08a3a', furD: '#c8622a', belly: '#fff3e0', ear: 'point', snout: 'fox', acc: 'apron', s: 1 },
  cat: { fur: '#f7a64a', furD: '#d8822a', belly: '#fff2dc', ear: 'point', snout: 'cat', acc: 'bell', s: 0.72 },
  beaver: { fur: '#a8703f', furD: '#7e5028', belly: '#e8c49a', ear: 'round', snout: 'beaver', acc: 'helmet', s: 0.95 },
  mole: { fur: '#7a6a80', furD: '#5a4a60', belly: '#a898b0', ear: 'none', snout: 'mole', acc: 'lamp', s: 0.9 },
  goblin: { fur: '#7cd07a', furD: '#4ea05a', belly: '#b8f0a8', ear: 'horn', snout: 'none', acc: 'bow', s: 0.92 },
  walker: { fur: '#7fb0ff', furD: '#5a84d8', belly: '#c8dcff', ear: 'horn', snout: 'none', acc: 'club', s: 1.05 },
  duck: { fur: '#ffe05a', furD: '#f0b830', belly: '#fff3a0', ear: 'none', snout: 'duck', acc: '', s: 0.55 },
};
/** 마을 사람·도깨비 (발 위치 x,y · u 단위 px) */
function critter(ctx: C2, k: string, x: number, y: number, u: number, mood: Mood, t: number, dir = 1, arms = 0) {
  const sp = SPECIES[k] ?? SPECIES.kid;
  u *= sp.s;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const bob = mood === 'cheer' || mood === 'happy' ? Math.abs(Math.sin(t * 0.25)) * 1.2 * u : Math.sin(t * 0.06) * 0.15 * u;
  if (mood === 'dizzy' && (k === 'goblin' || k === 'walker')) {
    // 꽈당 — 뒤로 누워 버둥
    ctx.rotate(-1.35);
    ctx.translate(-3 * u, -1.5 * u);
  }
  ctx.translate(0, -bob);
  if (sp.snout === 'duck') {
    ctx.fillStyle = sp.fur;
    ell(ctx, 0, -2 * u, 3 * u, 2 * u);
    ctx.fill();
    ell(ctx, 2.2 * u, -4.2 * u, 1.6 * u, 1.6 * u);
    ctx.fill();
    ctx.fillStyle = '#ff8a2a';
    ell(ctx, 3.9 * u, -4 * u, 0.9 * u, 0.45 * u);
    ctx.fill();
    ctx.fillStyle = '#1e1414';
    ell(ctx, 2.6 * u, -4.6 * u, 0.32 * u, 0.32 * u);
    ctx.fill();
    ctx.restore();
    return;
  }
  // 꼬리
  ctx.strokeStyle = sp.furD;
  ctx.fillStyle = sp.furD;
  if (k === 'cat') {
    ctx.lineWidth = 1.1 * u;
    ctx.beginPath();
    ctx.moveTo(-2.4 * u, -1.6 * u);
    ctx.quadraticCurveTo(-5.2 * u, -2 * u + Math.sin(t * 0.12) * u, -4.4 * u, -5.4 * u);
    ctx.stroke();
  } else if (k === 'kid' || k === 'mom') {
    ctx.fillStyle = sp.fur;
    ell(ctx, -3.2 * u, -2.2 * u, 2.3 * u, 1.1 * u, -0.5 + Math.sin(t * 0.1) * 0.1);
    ctx.fill();
    ctx.fillStyle = '#fff6ea';
    ell(ctx, -5 * u, -3.2 * u, 0.8 * u, 0.6 * u, -0.5);
    ctx.fill();
  } else if (k === 'beaver') {
    ctx.fillStyle = '#6a4a3a';
    ell(ctx, -3.2 * u, -0.8 * u, 2.4 * u, 0.9 * u, 0.2);
    ctx.fill();
  }
  // 다리
  ctx.fillStyle = sp.furD;
  ell(ctx, -1.1 * u, -0.35 * u, 0.95 * u, 0.5 * u);
  ctx.fill();
  ell(ctx, 1.1 * u, -0.35 * u, 0.95 * u, 0.5 * u);
  ctx.fill();
  // 몸
  ctx.fillStyle = lin(ctx, -2.6 * u, -5 * u, 2.6 * u, 0, [[0, sp.fur], [1, sp.furD]]);
  ell(ctx, 0, -2.6 * u, 2.5 * u, 2.6 * u);
  ctx.fill();
  ctx.fillStyle = sp.belly;
  ell(ctx, 0.3 * u, -2.3 * u, 1.5 * u, 1.8 * u);
  ctx.fill();
  if (sp.acc === 'apron') {
    ctx.fillStyle = '#ffffff';
    rr(ctx, -1.4 * u, -3.4 * u, 2.8 * u, 3 * u, 0.6 * u);
    ctx.fill();
  }
  if (sp.acc === 'shawl') {
    ctx.fillStyle = '#d0608a';
    ctx.beginPath();
    ctx.moveTo(-2.6 * u, -4.4 * u);
    ctx.lineTo(2.6 * u, -4.4 * u);
    ctx.lineTo(0.2 * u, -1.4 * u);
    ctx.closePath();
    ctx.fill();
  }
  // 팔
  ctx.strokeStyle = sp.furD;
  ctx.lineWidth = 1.1 * u;
  const raise = arms || mood === 'cheer' || mood === 'shock';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 1.9 * u, -3.4 * u);
    if (raise) ctx.lineTo(sd * 3.2 * u, -5.8 * u + Math.sin(t * 0.4 + sd) * 0.4 * u);
    else ctx.lineTo(sd * 2.8 * u, -1.8 * u);
    ctx.stroke();
  }
  // 무기
  if (sp.acc === 'bow') {
    ctx.strokeStyle = '#8a5228';
    ctx.lineWidth = 0.55 * u;
    ctx.beginPath();
    ctx.arc(3.2 * u, -4 * u, 2.6 * u, -1.3, 1.3);
    ctx.stroke();
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.2 * u;
    ctx.beginPath();
    ctx.moveTo(3.2 * u + Math.cos(-1.3) * 2.6 * u, -4 * u + Math.sin(-1.3) * 2.6 * u);
    ctx.lineTo(3.2 * u + (arms ? -1.6 * u : 0), -4 * u);
    ctx.lineTo(3.2 * u + Math.cos(1.3) * 2.6 * u, -4 * u + Math.sin(1.3) * 2.6 * u);
    ctx.stroke();
  } else if (sp.acc === 'club') {
    ctx.save();
    ctx.translate(3 * u, -3.4 * u);
    ctx.rotate(-0.5 + Math.sin(t * 0.08) * 0.2);
    ctx.fillStyle = '#b5733f';
    rr(ctx, -0.6 * u, -5 * u, 1.6 * u, 5 * u, 0.8 * u);
    ctx.fill();
    ctx.fillStyle = '#e8e0d0';
    for (let q = 0; q < 3; q++) (ell(ctx, 0.2 * u, -4.2 * u + q * 1.2 * u, 0.25 * u, 0.25 * u), ctx.fill());
    ctx.restore();
  }
  // 머리
  const hy = -6.4 * u, hr = 2.3 * u;
  ctx.fillStyle = sp.fur;
  if (sp.ear === 'long') {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * 0.9 * u, hy - 1.6 * u);
      ctx.rotate(sd * 0.25 + Math.sin(t * 0.07 + sd) * 0.06);
      ctx.fillStyle = sp.fur;
      ell(ctx, 0, -2 * u, 0.85 * u, 2.4 * u);
      ctx.fill();
      ctx.fillStyle = '#ffc0cc';
      ell(ctx, 0, -1.9 * u, 0.4 * u, 1.7 * u);
      ctx.fill();
      ctx.restore();
    }
  } else if (sp.ear === 'point') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = sp.fur;
      ctx.beginPath();
      ctx.moveTo(sd * 0.6 * u, hy - 1.8 * u);
      ctx.lineTo(sd * 2.2 * u, hy - 3.6 * u);
      ctx.lineTo(sd * 2.3 * u, hy - 0.6 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = k === 'farmer' ? '#e88a88' : '#3a2a2a';
      ctx.beginPath();
      ctx.moveTo(sd * 1.1 * u, hy - 1.8 * u);
      ctx.lineTo(sd * 2.0 * u, hy - 3 * u);
      ctx.lineTo(sd * 2.0 * u, hy - 1.2 * u);
      ctx.closePath();
      ctx.fill();
    }
  } else if (sp.ear === 'round') {
    for (const sd of [-1, 1]) (ell(ctx, sd * 1.8 * u, hy - 1.7 * u, 0.8 * u, 0.8 * u), (ctx.fillStyle = sp.furD), ctx.fill());
  }
  ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [[0, sp.fur], [1, sp.furD]]);
  ell(ctx, 0, hy, hr, hr * 0.95);
  ctx.fill();
  if (sp.ear === 'horn') {
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(-0.5 * u, hy - 1.9 * u);
    ctx.lineTo(0.2 * u, hy - 3.9 * u);
    ctx.lineTo(0.8 * u, hy - 1.8 * u);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c8a040';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    ctx.stroke();
  }
  // 주둥이
  if (sp.snout === 'pig') {
    ctx.fillStyle = '#ff9a9a';
    ell(ctx, 0.9 * u, hy + 0.6 * u, 1 * u, 0.75 * u);
    ctx.fill();
    ctx.fillStyle = '#c86a6a';
    ell(ctx, 0.6 * u, hy + 0.6 * u, 0.18 * u, 0.28 * u);
    ctx.fill();
    ell(ctx, 1.2 * u, hy + 0.6 * u, 0.18 * u, 0.28 * u);
    ctx.fill();
  } else if (sp.snout === 'fox' || sp.snout === 'cat') {
    ctx.fillStyle = sp.belly;
    ell(ctx, 0.8 * u, hy + 0.8 * u, 1.2 * u, 0.8 * u);
    ctx.fill();
    ctx.fillStyle = '#3a2020';
    ell(ctx, 1.5 * u, hy + 0.45 * u, 0.32 * u, 0.24 * u);
    ctx.fill();
  } else if (sp.snout === 'mole') {
    ctx.fillStyle = '#ff9ab0';
    ell(ctx, 1.6 * u, hy + 0.4 * u, 0.6 * u, 0.5 * u);
    ctx.fill();
  } else if (sp.snout === 'beaver') {
    ctx.fillStyle = sp.belly;
    ell(ctx, 0.8 * u, hy + 0.8 * u, 1.1 * u, 0.75 * u);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    rr(ctx, 0.5 * u, hy + 1.2 * u, 0.7 * u, 0.9 * u, 0.15 * u);
    ctx.fill();
    ctx.fillStyle = '#3a2020';
    ell(ctx, 1.3 * u, hy + 0.4 * u, 0.3 * u, 0.22 * u);
    ctx.fill();
  }
  // 눈
  ctx.fillStyle = '#1e1414';
  ctx.strokeStyle = '#1e1414';
  ctx.lineWidth = Math.max(1.2, 0.3 * u);
  const ex = 0.75 * u, ey2 = hy - 0.4 * u;
  if (mood === 'happy' || mood === 'cheer') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * ex + 0.3 * u, ey2 + 0.2 * u, 0.45 * u, Math.PI + 0.3, -0.3), ctx.stroke());
  } else if (mood === 'dizzy') {
    for (const sd of [-1, 1]) {
      const cx = sd * ex + 0.3 * u;
      ctx.beginPath();
      ctx.moveTo(cx - 0.4 * u, ey2 - 0.4 * u);
      ctx.lineTo(cx + 0.4 * u, ey2 + 0.4 * u);
      ctx.moveTo(cx + 0.4 * u, ey2 - 0.4 * u);
      ctx.lineTo(cx - 0.4 * u, ey2 + 0.4 * u);
      ctx.stroke();
    }
  } else if (mood === 'sleep') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * ex, ey2), ctx.lineTo(sd * ex + 0.7 * u, ey2), ctx.stroke());
  } else {
    const r0 = mood === 'shock' ? 0.55 : 0.42;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      if (mood === 'shock') (ell(ctx, sd * ex + 0.3 * u, ey2, r0 * 1.5 * u, r0 * 1.5 * u), ctx.fill());
      ctx.fillStyle = '#1e1414';
      ell(ctx, sd * ex + 0.3 * u, ey2, r0 * u, r0 * u * (t % 200 < 6 ? 0.2 : 1));
      ctx.fill();
    }
  }
  if (sp.acc === 'shawl') {
    // 안경
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    for (const sd of [-1, 1]) (ell(ctx, sd * ex + 0.3 * u, ey2, 0.75 * u, 0.7 * u), ctx.stroke());
  }
  // 입
  ctx.strokeStyle = '#3a1a1a';
  ctx.lineWidth = Math.max(1, 0.25 * u);
  ctx.beginPath();
  if (mood === 'shock' || mood === 'wet') (ell(ctx, 0.6 * u, hy + 1.3 * u, 0.4 * u, 0.5 * u), (ctx.fillStyle = '#7a2a2a'), ctx.fill());
  else if (mood === 'grin' || sp.ear === 'horn') {
    ctx.arc(0.5 * u, hy + 0.7 * u, 0.9 * u, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(1 * u, hy + 1.4 * u);
    ctx.lineTo(1.3 * u, hy + 1.95 * u);
    ctx.lineTo(1.5 * u, hy + 1.35 * u);
    ctx.fill();
  } else (ctx.arc(0.5 * u, hy + 0.9 * u, 0.55 * u, 0.3, Math.PI - 0.3), ctx.stroke());
  // 볼
  ctx.fillStyle = 'rgba(255,120,140,.35)';
  ell(ctx, 1.9 * u, hy + 0.6 * u, 0.5 * u, 0.32 * u);
  ctx.fill();
  // 모자
  if (sp.acc === 'straw') {
    ctx.fillStyle = '#f2d06a';
    ell(ctx, 0, hy - 1.7 * u, 3.4 * u, 0.7 * u);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, hy - 1.9 * u, 1.9 * u, 1.4 * u, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#d04a3a';
    rr(ctx, -1.9 * u, hy - 2.3 * u, 3.8 * u, 0.45 * u, 0.2 * u);
    ctx.fill();
  } else if (sp.acc === 'helmet' || sp.acc === 'lamp') {
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath();
    ctx.ellipse(0, hy - 1 * u, 2.4 * u, 1.9 * u, 0, Math.PI, 0);
    ctx.fill();
    rr(ctx, -2.7 * u, hy - 1.1 * u, 5.4 * u, 0.5 * u, 0.25 * u);
    ctx.fill();
    if (sp.acc === 'lamp') {
      ctx.fillStyle = '#fff6b0';
      ell(ctx, 0, hy - 2 * u, 0.6 * u, 0.6 * u);
      ctx.fill();
    }
  } else if (sp.acc === 'scarf') {
    ctx.fillStyle = '#3a8aff';
    rr(ctx, -2 * u, hy + 1.6 * u, 4 * u, 0.8 * u, 0.4 * u);
    ctx.fill();
  } else if (sp.acc === 'bell') {
    ctx.fillStyle = '#ffcf3a';
    ell(ctx, 0.3 * u, hy + 2.3 * u, 0.45 * u, 0.45 * u);
    ctx.fill();
  }
  if (mood === 'wet') {
    ctx.fillStyle = '#7fd0ff';
    for (let q = 0; q < 3; q++) (ell(ctx, (-1.5 + q * 1.5) * u, hy - 2.4 * u + ((t * 0.08 + q * 0.4) % 1) * 3 * u, 0.25 * u, 0.4 * u), ctx.fill());
  }
  ctx.restore();
  if (mood === 'dizzy') {
    ctx.fillStyle = '#ffd23a';
    for (let q = 0; q < 3; q++) {
      const a = t * 0.12 + (q * TAU2) / 3;
      starPath(ctx, x + Math.cos(a) * 3 * u, y - 9 * u + Math.sin(a) * 0.8 * u, 0.7 * u);
      ctx.fill();
    }
  }
}

// ── 물건 그리기 (τ를 받아 같은 함수로 잔상·되감기도 그린다) ──
interface View { X: (x: number) => number; Y: (y: number) => number; R: (r: number) => number; t: number; fixed: number }
function drawPlank(ctx: C2, v: View, th: Thing, i: number, tau: number) {
  plank(th, i, tau);
  const pw = (th.x2 - th.x) / th.n;
  ctx.save();
  ctx.translate(v.X(P.x), v.Y(P.y));
  ctx.rotate(P.a);
  const w = v.R(pw * 0.96), hh = v.R(0.026);
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  rr(ctx, -w / 2 + 1, hh * 0.2 + 2, w, hh, hh * 0.3);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -hh / 2, 0, hh, [[0, '#e8a868'], [0.5, '#c07a3e'], [1, '#8a5228']]);
  rr(ctx, -w / 2, -hh / 2, w, hh * 1.3, hh * 0.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,45,15,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, -hh * 0.1);
  ctx.lineTo(w * 0.35, -hh * 0.1);
  ctx.stroke();
  ctx.fillStyle = '#5a3a2a';
  ell(ctx, -w * 0.38, 0, hh * 0.13, hh * 0.13);
  ctx.fill();
  ell(ctx, w * 0.38, 0, hh * 0.13, hh * 0.13);
  ctx.fill();
  ctx.restore();
}
function drawBridgeT(ctx: C2, v: View, th: Thing, tau: number) {
  const X = v.X, Y = v.Y, R = v.R;
  // 난간 밧줄: 판자가 다 제자리일 때만 팽팽
  const allIn = tau <= brFall(0);
  for (const xx of [th.x, th.x2]) {
    ctx.fillStyle = lin(ctx, X(xx) - R(0.01), 0, X(xx) + R(0.01), 0, [[0, '#9a5a2a'], [1, '#6a3a1a']]);
    rr(ctx, X(xx) - R(0.009), Y(th.y - 0.075), R(0.018), R(0.09), R(0.006));
    ctx.fill();
    ctx.fillStyle = '#c0803e';
    ell(ctx, X(xx), Y(th.y - 0.075), R(0.011), R(0.006));
    ctx.fill();
  }
  ctx.strokeStyle = '#d8b07a';
  ctx.lineWidth = Math.max(1.5, R(0.005));
  ctx.beginPath();
  ctx.moveTo(X(th.x), Y(th.y - 0.07));
  if (allIn) ctx.quadraticCurveTo(X((th.x + th.x2) / 2), Y(th.y - 0.045), X(th.x2), Y(th.y - 0.07));
  else {
    ctx.quadraticCurveTo(X(th.x + 0.02), Y(th.y + 0.04), X(th.x + 0.03), Y(th.y + 0.08));
    ctx.moveTo(X(th.x2), Y(th.y - 0.07));
    ctx.quadraticCurveTo(X(th.x2 - 0.02), Y(th.y + 0.04), X(th.x2 - 0.03), Y(th.y + 0.08));
  }
  ctx.stroke();
  for (let i = 0; i < th.n; i++) drawPlank(ctx, v, th, i, tau);
}
function drawPot(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const X = v.X, Y = v.Y, R = v.R, hit = potHit(th);
  if (th.n === 1) return drawPail(ctx, v, th, tau, a);
  if (th.n === 2) return drawLantern(ctx, v, th, tau, a);
  if (tau < hit) {
    pose(th, tau);
    ctx.save();
    ctx.globalAlpha *= a;
    const px = X(P.x), py = Y(P.y + 0.035);
    ctx.translate(px, py);
    ctx.rotate(P.a);
    potShape(ctx, R(0.03), 0, 0, v.t);
    ctx.restore();
    return;
  }
  // 깨진 조각 (τ가 거꾸로면 모여 붙는다)
  const q = cl01((tau - hit) / 14);
  const ex = q * (2 - q);
  ctx.save();
  ctx.globalAlpha *= a;
  const gx = X(th.x), gy = Y(th.y2);
  ctx.fillStyle = 'rgba(110,70,40,.75)';
  ell(ctx, gx, gy - R(0.004), R(0.05) * (0.4 + 0.6 * ex), R(0.012));
  ctx.fill();
  for (let k = 0; k < 7; k++) {
    const ang = -Math.PI * (0.15 + 0.7 * (k / 6)), d = R(0.055) * ex * (0.6 + hsh(k + th.id) * 0.6);
    const sx = gx + Math.cos(ang) * d * 1.3, sy = gy - R(0.015) - Math.sin(-ang) * d * 0.4 * (1 - ex) - R(0.004) * k * (1 - ex);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang * ex * 2 + k);
    ctx.fillStyle = k % 2 ? '#d86a3a' : '#b8502a';
    ctx.beginPath();
    ctx.moveTo(-R(0.012), -R(0.006));
    ctx.lineTo(R(0.011), -R(0.009));
    ctx.lineTo(R(0.006), R(0.008));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 꽃 한 송이가 바닥에
  ctx.fillStyle = '#ff5a7a';
  ell(ctx, gx + R(0.02) * ex, gy - R(0.012), R(0.009), R(0.009));
  ctx.fill();
  ctx.restore();
}
/** 물통: 기울어 쏟아지고(물덩이가 떨어져 바닥에 철썩), 되감으면 물이 거꾸로 솟아 통으로 */
function drawPail(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const { X, Y, R } = v, hit = potHit(th);
  ctx.save();
  ctx.globalAlpha *= a;
  // 선반의 통 (기울기만 τ를 따른다)
  const tip = Math.min(1, tau / POT_TT);
  ctx.save();
  ctx.translate(X(th.x), Y(th.y));
  ctx.rotate(tip * 1.6);
  ctx.fillStyle = lin(ctx, -R(0.025), 0, R(0.025), 0, [[0, '#c8884a'], [1, '#8a5228']]);
  ctx.beginPath();
  ctx.moveTo(-R(0.026), -R(0.05));
  ctx.lineTo(R(0.026), -R(0.05));
  ctx.lineTo(R(0.02), 0);
  ctx.lineTo(-R(0.02), 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a5a6a';
  ctx.lineWidth = Math.max(1.5, R(0.004));
  ctx.beginPath();
  ctx.moveTo(-R(0.025), -R(0.035));
  ctx.lineTo(R(0.025), -R(0.035));
  ctx.moveTo(-R(0.022), -R(0.012));
  ctx.lineTo(R(0.022), -R(0.012));
  ctx.stroke();
  if (tau < POT_TT * 0.6) {
    ctx.fillStyle = '#6ad0f5';
    ell(ctx, 0, -R(0.048), R(0.022), R(0.006));
    ctx.fill();
  }
  ctx.restore();
  // 물덩이 · 바닥 웅덩이
  if (tau >= POT_TT && tau < hit) {
    pose(th, tau);
    const wy = Y(P.y + 0.02), len = R(Math.min(0.12, (tau - POT_TT) * 0.006));
    ctx.fillStyle = 'rgba(100,200,250,.88)';
    rr(ctx, X(P.x) - R(0.018), wy - len, R(0.036), len + R(0.02), R(0.016));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ell(ctx, X(P.x) - R(0.006), wy - len * 0.5, R(0.004), len * 0.3);
    ctx.fill();
  } else if (tau >= hit) {
    const q = cl01((tau - hit) / 14);
    ctx.fillStyle = 'rgba(90,190,245,.85)';
    ell(ctx, X(th.x), Y(th.y2) - R(0.004), R(0.03 + 0.05 * q), R(0.009 + 0.004 * q));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ell(ctx, X(th.x) - R(0.02 * q), Y(th.y2) - R(0.006), R(0.012), R(0.003));
    ctx.fill();
  }
  ctx.restore();
}
/** 등불: 떨어져 짚더미에 불을 낸다 (되감아도 불은 그대로) */
function drawLantern(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const { X, Y, R, t } = v, hit = potHit(th);
  pose(th, tau);
  ctx.save();
  ctx.globalAlpha *= a;
  const x = X(P.x), y = tau >= hit ? Y(th.y2) - R(0.012) : Y(P.y + 0.03);
  ctx.translate(x, y);
  ctx.rotate(tau >= hit ? 1.4 : P.a);
  ctx.fillStyle = '#5a4a3a';
  rr(ctx, -R(0.016), -R(0.04), R(0.032), R(0.006), R(0.003));
  ctx.fill();
  rr(ctx, -R(0.014), -R(0.002), R(0.028), R(0.006), R(0.003));
  ctx.fill();
  const glow = tau >= hit ? 0.35 : 0.85 + Math.sin(t * 0.3) * 0.1;
  ctx.fillStyle = `rgba(255,214,100,${glow})`;
  rr(ctx, -R(0.012), -R(0.035), R(0.024), R(0.033), R(0.006));
  ctx.fill();
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-R(0.012), -R(0.035), R(0.024), R(0.033));
  ctx.restore();
}
function potShape(ctx: C2, r: number, x: number, y: number, t: number) {
  // 화분 (바닥 기준 위로)
  ctx.fillStyle = 'rgba(60,30,10,.2)';
  ell(ctx, x, y + r * 0.05, r * 0.9, r * 0.2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x - r, 0, x + r, 0, [[0, '#f08a52'], [0.6, '#d0622e'], [1, '#a84820']]);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y);
  ctx.lineTo(x + r * 0.75, y);
  ctx.lineTo(x + r, y - r * 1.4);
  ctx.lineTo(x - r, y - r * 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8743a';
  rr(ctx, x - r * 1.12, y - r * 1.6, r * 2.24, r * 0.38, r * 0.12);
  ctx.fill();
  // 꽃
  ctx.strokeStyle = '#3a9a4a';
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * r * 0.4, y - r * 1.6);
    ctx.lineTo(x + k * r * 0.6, y - r * 2.4 - Math.abs(k) * r * -0.2);
    ctx.stroke();
  }
  for (let k = -1; k <= 1; k++) {
    const fx2 = x + k * r * 0.62, fy = y - r * 2.5 + Math.abs(k) * r * 0.2 + Math.sin(t * 0.08 + k) * r * 0.05;
    ctx.fillStyle = k ? '#ffcf3a' : '#ff5a7a';
    for (let p = 0; p < 5; p++) (ell(ctx, fx2 + Math.cos((p * TAU2) / 5) * r * 0.22, fy + Math.sin((p * TAU2) / 5) * r * 0.22, r * 0.18, r * 0.18), ctx.fill());
    ctx.fillStyle = '#fff6c0';
    ell(ctx, fx2, fy, r * 0.12, r * 0.12);
    ctx.fill();
  }
}
function drawBarrel(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const X = v.X, Y = v.Y, R = v.R, n = th.path!.length / 3 - 1;
  pose(th, tau);
  const r = th.harm ? 0.034 : 0.03;
  ctx.save();
  ctx.globalAlpha *= a;
  if (tau >= n - 0.5 && th.harm) {
    // 와장창 — 판자 조각 (τ가 n을 넘은 만큼 퍼짐)
    const q = cl01((tau - n + 14) / 14);
    for (let k = 0; k < 6; k++) {
      const ang = -Math.PI * (k / 5), d = R(0.05) * q;
      ctx.save();
      ctx.translate(X(P.x) + Math.cos(ang) * d * 1.4, Y(P.y) - R(0.012) - Math.sin(-ang) * d * 0.5);
      ctx.rotate(k + q * 2);
      ctx.fillStyle = k % 2 ? '#b8743a' : '#9a5a28';
      rr(ctx, -R(0.016), -R(0.005), R(0.032), R(0.01), R(0.003));
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  const x = X(P.x), y = Y(P.y) - R(r);
  if (th.harm) shadow(ctx, x, Y(P.y), R(r * 0.9));
  else {
    // 물에 뜬 통: 물결
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1.5;
    ell(ctx, x, Y(P.y) - R(0.004), R(r * 1.3), R(r * 0.35));
    ctx.stroke();
  }
  ctx.translate(x, y);
  ctx.rotate(P.a);
  ctx.fillStyle = lin(ctx, -R(r), -R(r), R(r), R(r), [[0, '#e0a060'], [1, '#9a5a28']]);
  ell(ctx, 0, 0, R(r), R(r));
  ctx.fill();
  ctx.strokeStyle = '#6a3a1a';
  ctx.lineWidth = Math.max(1, R(0.003));
  for (let k = 0; k < 6; k++) {
    const an = (k / 6) * TAU2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(an) * R(r), Math.sin(an) * R(r));
    ctx.stroke();
  }
  ctx.strokeStyle = '#5a5a6a';
  ctx.lineWidth = Math.max(2, R(0.006));
  ell(ctx, 0, 0, R(r * 0.95), R(r * 0.95));
  ctx.stroke();
  ell(ctx, 0, 0, R(r * 0.55), R(r * 0.55));
  ctx.stroke();
  ctx.fillStyle = '#5a3418';
  ell(ctx, 0, 0, R(r * 0.18), R(r * 0.18));
  ctx.fill();
  ctx.restore();
}
function drawArrowT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(X(P.x), Y(P.y));
  ctx.rotate(P.a);
  const L = R(0.075);
  ctx.strokeStyle = '#8a5228';
  ctx.lineWidth = Math.max(2, R(0.006));
  ctx.beginPath();
  ctx.moveTo(-L, 0);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#c8ccd8';
  ctx.beginPath();
  ctx.moveTo(R(0.016), 0);
  ctx.lineTo(-R(0.004), -R(0.009));
  ctx.lineTo(-R(0.004), R(0.009));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff4a5a';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-L, 0);
    ctx.lineTo(-L - R(0.012), sd * R(0.011));
    ctx.lineTo(-L + R(0.016), sd * R(0.004));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function drawRaft(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  if (tau >= th.dur) return;
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R, w = R(th.w), x = X(P.x), y = Y(P.y);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2;
  ell(ctx, x, y + R(0.012), w * 0.58, R(0.022));
  ctx.stroke();
  ctx.translate(x, y);
  ctx.rotate(P.a);
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = lin(ctx, 0, -R(0.012), 0, R(0.03), [[0, '#d89a58'], [1, '#8a5228']]);
    rr(ctx, -w / 2, -R(0.008) + k * R(0.016), w, R(0.02), R(0.01));
    ctx.fill();
  }
  ctx.strokeStyle = '#6a3a1a';
  ctx.lineWidth = 1;
  for (let q = 1; q < 6; q++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + (q * w) / 6, -R(0.006));
    ctx.lineTo(-w / 2 + (q * w) / 6, R(0.026));
    ctx.stroke();
  }
  ctx.strokeStyle = '#f2d8a0';
  ctx.lineWidth = Math.max(1.5, R(0.004));
  for (const q of [-0.3, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(q * w, -R(0.01));
    ctx.lineTo(q * w, R(0.028));
    ctx.stroke();
  }
  // 작은 깃발
  ctx.strokeStyle = '#6a3a1a';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, 0);
  ctx.lineTo(w * 0.42, -R(0.06));
  ctx.stroke();
  ctx.fillStyle = '#ff5a5a';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, -R(0.06));
  ctx.lineTo(w * 0.42 + R(0.028), -R(0.05) + Math.sin(v.t * 0.2) * R(0.003));
  ctx.lineTo(w * 0.42, -R(0.04));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawLogT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  if (tau >= th.dur) return;
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R;
  ctx.save();
  ctx.globalAlpha *= a;
  if (tau < LOG_LIE) {
    // 나무가 밑동을 축으로 오른쪽으로 쓰러진다
    const bx = X(th.x), by = Y(th.y);
    ctx.fillStyle = '#8a5a2a';
    ell(ctx, bx, by, R(0.022), R(0.008));
    ctx.fill();
    ctx.translate(bx, by);
    ctx.rotate(P.a);
    const L = R(th.w);
    ctx.fillStyle = lin(ctx, -R(0.014), 0, R(0.014), 0, [[0, '#a8703a'], [1, '#6a4020']]);
    rr(ctx, -R(0.013), -L * 0.82, R(0.026), L * 0.84, R(0.008));
    ctx.fill();
    // 갉아 먹은 자국
    ctx.fillStyle = '#f2d8a0';
    ctx.beginPath();
    ctx.moveTo(-R(0.013), -R(0.012));
    ctx.lineTo(R(0.002), -R(0.02));
    ctx.lineTo(-R(0.013), -R(0.03));
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = ['#5cc05a', '#4aa84a', '#7ad86a'][k % 3];
      ell(ctx, (hsh(k + 9) - 0.5) * R(0.06), -L * 0.82 - R(0.01) + (hsh(k + 3) - 0.5) * R(0.05), R(0.036), R(0.032));
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  const y = Y(P.y), x0 = X(th.x - 0.02), x1 = X(th.x2);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2;
  ell(ctx, (x0 + x1) / 2, y + R(0.012), (x1 - x0) * 0.55, R(0.02));
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, y - R(0.012), 0, y + R(0.024), [[0, '#c08048'], [1, '#6a4020']]);
  rr(ctx, x0, y - R(0.012), x1 - x0, R(0.03), R(0.015));
  ctx.fill();
  ctx.fillStyle = '#f2d8a0';
  ell(ctx, x0 + R(0.004), y + R(0.003), R(0.008), R(0.014));
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,20,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + R(0.02), y);
  ctx.lineTo(x1 - R(0.04), y + R(0.002));
  ctx.stroke();
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = ['#5cc05a', '#4aa84a', '#7ad86a'][k % 3];
    ell(ctx, x1 - R(0.02) + (hsh(k + 9) - 0.3) * R(0.05), y - R(0.01) + (hsh(k + 3) - 0.5) * R(0.03), R(0.03), R(0.022));
    ctx.fill();
  }
  ctx.restore();
}
function drawBalloonT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  if (tau >= th.dur) return;
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R, x = X(P.x), y = Y(P.y);
  ctx.save();
  ctx.globalAlpha *= a;
  const by = y + R(0.12);
  ctx.strokeStyle = 'rgba(80,60,60,.7)';
  ctx.lineWidth = 1;
  const cols = ['#ff5a6a', '#ffcf3a', '#5ab8ff'];
  for (let k = 0; k < 3; k++) {
    const bx = x + (k - 1) * R(0.026) + Math.sin(v.t * 0.05 + k) * R(0.003), byy = y - R(0.01) - (k === 1 ? R(0.02) : 0);
    ctx.beginPath();
    ctx.moveTo(bx, byy + R(0.03));
    ctx.lineTo(x, by - R(0.012));
    ctx.stroke();
    ctx.fillStyle = cols[k];
    ell(ctx, bx, byy, R(0.024), R(0.03));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, bx - R(0.008), byy - R(0.01), R(0.006), R(0.009), -0.4);
    ctx.fill();
  }
  // 바구니
  ctx.fillStyle = lin(ctx, 0, by - R(0.014), 0, by + R(0.02), [[0, '#d8a050'], [1, '#9a6a28']]);
  rr(ctx, x - R(0.026), by - R(0.012), R(0.052), R(0.026), R(0.008));
  ctx.fill();
  ctx.strokeStyle = '#7a4a1a';
  ctx.lineWidth = 1;
  for (let q = 1; q < 4; q++) (ctx.beginPath(), ctx.moveTo(x - R(0.026) + q * R(0.013), by - R(0.012)), ctx.lineTo(x - R(0.026) + q * R(0.013), by + R(0.014)), ctx.stroke());
  ctx.restore();
}
function drawCrateT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R, x = X(P.x), top = Y(P.y), w = R(th.w), hh = R(th.h);
  ctx.save();
  ctx.globalAlpha *= a;
  // 밧줄 (해어지기 전엔 크레인에 매달림)
  ctx.strokeStyle = '#d8b07a';
  ctx.lineWidth = Math.max(1.5, R(0.004));
  ctx.beginPath();
  if (tau <= CR_FRAY || th.n === 1) {
    ctx.moveTo(x, Y(0.36));
    ctx.lineTo(x, top);
    if (th.n === 1) {
      // 승강기 감개: 풀리면(앞으로) 돌고, 되감으면 거꾸로 돈다
      ctx.stroke();
      brass(ctx, x, Y(0.36), R(0.026), 8, tau * 0.12);
      ctx.beginPath();
    }
  } else {
    ctx.moveTo(x, Y(0.36));
    ctx.lineTo(x + R(0.01), Y(0.36) + R(0.08));
  }
  ctx.stroke();
  ctx.translate(x, top + hh / 2);
  ctx.rotate(P.a);
  ctx.fillStyle = lin(ctx, 0, -hh / 2, 0, hh / 2, [[0, '#e8b070'], [1, '#a8682e']]);
  rr(ctx, -w / 2, -hh / 2, w, hh, R(0.008));
  ctx.fill();
  ctx.strokeStyle = '#7a4418';
  ctx.lineWidth = Math.max(2, R(0.006));
  ctx.strokeRect(-w / 2 + R(0.006), -hh / 2 + R(0.006), w - R(0.012), hh - R(0.012));
  ctx.beginPath();
  ctx.moveTo(-w / 2 + R(0.008), -hh / 2 + R(0.008));
  ctx.lineTo(w / 2 - R(0.008), hh / 2 - R(0.008));
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  rr(ctx, -w / 2 + R(0.01), -hh / 2 + R(0.008), w - R(0.02), R(0.01), R(0.004));
  ctx.fill();
  ctx.restore();
}
function drawGearT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  pose(th, tau);
  const X = v.X, Y = v.Y, R = v.R;
  ctx.save();
  ctx.globalAlpha *= a;
  shadow(ctx, X(P.x), Y(P.y), R(0.04));
  brass(ctx, X(P.x), Y(P.y) - R(0.05), R(0.05), 10, P.a);
  ctx.restore();
}
function drawWaterT(ctx: C2, v: View, th: Thing, tau: number) {
  const X = v.X, Y = v.Y, R = v.R, lv = water(th, tau), t = v.t;
  const tx = X(th.x), ty = Y(th.y);
  // 물탱크 (기둥 위)
  ctx.fillStyle = '#8a5a2a';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(tx + sd * R(0.04), ty + R(0.02));
    ctx.rotate(sd * -0.08);
    rr(ctx, -R(0.006), 0, R(0.012), Y(th.h - 0.06) - ty, R(0.004));
    ctx.fill();
    ctx.restore();
  }
  const sh = tau > 0 && tau < WAT_CRACK ? Math.sin(tau * 2.1) * R(0.004) : 0;
  ctx.fillStyle = lin(ctx, tx - R(0.06), 0, tx + R(0.06), 0, [[0, '#d89a58'], [0.5, '#b8783a'], [1, '#8a5228']]);
  rr(ctx, tx - R(0.058) + sh, ty - R(0.07), R(0.116), R(0.09), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#5a6a7a';
  rr(ctx, tx - R(0.06) + sh, ty - R(0.052), R(0.12), R(0.009), R(0.004));
  ctx.fill();
  rr(ctx, tx - R(0.06) + sh, ty - R(0.005), R(0.12), R(0.009), R(0.004));
  ctx.fill();
  ctx.fillStyle = '#c84a3a';
  ctx.beginPath();
  ctx.moveTo(tx - R(0.07) + sh, ty - R(0.068));
  ctx.lineTo(tx + sh, ty - R(0.11));
  ctx.lineTo(tx + R(0.07) + sh, ty - R(0.068));
  ctx.closePath();
  ctx.fill();
  // 쏟아지는 물줄기 (되감으면 거꾸로 솟는다)
  const flowing = tau > WAT_CRACK && tau < WAT_CRACK + WAT_FILL && th.st !== DONE && th.st !== HOLD;
  const by = Y(th.h);
  if (flowing || (th.st === REW && tau > WAT_CRACK)) {
    const dir = th.st === REW ? -1 : 1;
    const sx = tx + R(0.05), ex2 = X((th.x2 + th.y2) / 2);
    ctx.strokeStyle = 'rgba(90,190,250,.85)';
    ctx.lineWidth = R(0.016);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, ty - R(0.02));
    ctx.quadraticCurveTo(sx + R(0.06), ty, ex2, by - R(0.01));
    ctx.stroke();
    ctx.fillStyle = '#e8f8ff';
    for (let k = 0; k < 8; k++) {
      const q = (((t * 0.04 * dir + k / 8) % 1) + 1) % 1;
      const qx = (1 - q) * (1 - q) * sx + 2 * (1 - q) * q * (sx + R(0.06)) + q * q * ex2, qy = (1 - q) * (1 - q) * (ty - R(0.02)) + 2 * (1 - q) * q * ty + q * q * (by - R(0.01));
      ell(ctx, qx, qy, R(0.006), R(0.006));
      ctx.fill();
    }
  }
  // 웅덩이 물
  if (lv > 0.01) {
    const x0 = X(th.x2), x1 = X(th.y2), d = R(0.06) * lv;
    ctx.fillStyle = lin(ctx, 0, by - d, 0, by + R(0.02), [[0, 'rgba(110,210,255,.92)'], [1, 'rgba(40,140,210,.95)']]);
    rr(ctx, x0, by - d, x1 - x0, d + R(0.02), R(0.01));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ((k + 0.5) / 3) * (x1 - x0);
      ctx.beginPath();
      ctx.arc(wx, by - d + R(0.004), R(0.012) + ((t * 0.3 + k * 9) % 12), Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
}
function drawThingAt(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  switch (th.k) {
    case 'bridge':
      return drawBridgeT(ctx, v, th, tau);
    case 'pot':
      return drawPot(ctx, v, th, tau, a);
    case 'barrel':
      return drawBarrel(ctx, v, th, tau, a);
    case 'arrow':
      return drawArrowT(ctx, v, th, tau, a);
    case 'raft':
      return drawRaft(ctx, v, th, tau, a);
    case 'log':
      return drawLogT(ctx, v, th, tau, a);
    case 'balloon':
      return drawBalloonT(ctx, v, th, tau, a);
    case 'crate':
      return drawCrateT(ctx, v, th, tau, a);
    case 'gear':
      return drawGearT(ctx, v, th, tau, a);
    case 'water':
      return drawWaterT(ctx, v, th, tau);
    case 'stack':
      return drawStackT(ctx, v, th, tau, a);
    case 'ferry':
      return drawFerryT(ctx, v, th, tau, a);
    case 'sack':
      return drawSackT(ctx, v, th, tau, a);
  }
}
/** 과일 상자 탑 (상자마다 과일) */
function drawStackT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const { X, Y, R } = v;
  const stairs = tau > 3 && tau < ST_SLUMP + 4;
  ctx.save();
  ctx.globalAlpha *= a;
  const fruit = ['#ff5a4a', '#ffb02e', '#7ad04a', '#ff8ad0'];
  for (let k = 0; k < ST_N; k++) {
    stackCrate(th, k, tau);
    const cx = X(P.x), top = Y(P.y), cw = R(ST_CW), chh = R(ST_CH);
    ctx.save();
    ctx.translate(cx, top + chh / 2);
    ctx.rotate(P.a);
    ctx.fillStyle = lin(ctx, 0, -chh / 2, 0, chh / 2, [[0, '#f0be7a'], [1, '#b0703a']]);
    rr(ctx, -cw / 2, -chh / 2, cw, chh, R(0.006));
    ctx.fill();
    ctx.strokeStyle = '#7a4418';
    ctx.lineWidth = Math.max(1.5, R(0.004));
    ctx.strokeRect(-cw / 2 + R(0.005), -chh / 2 + R(0.005), cw - R(0.01), chh - R(0.01));
    for (let f = 0; f < 4; f++) {
      ctx.fillStyle = fruit[(f + k) % 4];
      ell(ctx, -cw * 0.33 + f * cw * 0.22, -chh / 2 - R(0.004), R(0.011), R(0.011));
      ctx.fill();
    }
    if (stairs) {
      // 계단일 때 윗면이 반짝 (밟을 수 있다)
      ctx.fillStyle = 'rgba(255,255,200,.55)';
      ctx.fillRect(-cw / 2 + R(0.004), -chh / 2, cw - R(0.008), R(0.005));
    }
    ctx.restore();
  }
  ctx.restore();
}
/** 줄 따라 건너는 나룻배 */
function drawFerryT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const { X, Y, R, t } = v;
  pose(th, tau);
  const x = X(P.x), y = Y(P.y), w = R(th.w);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2;
  ell(ctx, x, y + R(0.014), w * 0.6, R(0.02));
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, y - R(0.01), 0, y + R(0.03), [[0, '#e0a060'], [1, '#8a5228']]);
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - R(0.01), y - R(0.004));
  ctx.lineTo(x + w / 2 + R(0.01), y - R(0.004));
  ctx.lineTo(x + w / 2 - R(0.01), y + R(0.028));
  ctx.lineTo(x - w / 2 + R(0.01), y + R(0.028));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0c890';
  ctx.fillRect(x - w / 2, y - R(0.006), w, R(0.008));
  // 줄을 잡는 기둥 · 도르래
  ctx.fillStyle = '#6a4020';
  ctx.fillRect(x - R(0.004), y - R(0.07), R(0.008), R(0.066));
  brass(ctx, x, y - R(0.07), R(0.01), 6, -tau * 0.2);
  ctx.fillStyle = '#ff6a5a';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.35, y - R(0.006));
  ctx.lineTo(x + w * 0.35, y - R(0.05));
  ctx.lineTo(x + w * 0.35 + R(0.025), y - R(0.042) + Math.sin(t * 0.2) * R(0.003));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
/** 모래 자루 */
function drawSackT(ctx: C2, v: View, th: Thing, tau: number, a = 1) {
  const { X, Y, R } = v;
  pose(th, tau);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(X(P.x), Y(P.y));
  ctx.rotate(P.a);
  ctx.fillStyle = lin(ctx, -R(0.03), -R(0.06), R(0.03), 0, [[0, '#e8cf98'], [1, '#b0915a']]);
  ctx.beginPath();
  ctx.moveTo(-R(0.032), 0);
  ctx.quadraticCurveTo(-R(0.04), -R(0.04), -R(0.012), -R(0.058));
  ctx.lineTo(R(0.012), -R(0.058));
  ctx.quadraticCurveTo(R(0.04), -R(0.04), R(0.032), 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a6a3a';
  rr(ctx, -R(0.014), -R(0.064), R(0.028), R(0.01), R(0.004));
  ctx.fill();
  ctx.fillStyle = '#7a5a2a';
  ctx.font = `900 ${Math.max(9, R(0.022))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('모래', 0, -R(0.026));
  ctx.restore();
}
/** 저울: 받침 · 들보 · 두 접시 (자루가 올라오면 오른쪽 접시가 올라간다) */
function drawScale(ctx: C2, v: View, L: Level, W: World) {
  const { X, Y, R } = v;
  const [px, py, lx, rx, pw, yDown, yUp] = L.scale!;
  const tilt = W.tilt, ry = yDown + (yUp - yDown) * tilt, ly = 0.74 - 0.2 + 0.2 * tilt;
  // 기둥
  ctx.fillStyle = lin(ctx, X(px) - R(0.02), 0, X(px) + R(0.02), 0, [[0, '#9a6a4a'], [1, '#6a4428']]);
  ctx.fillRect(X(px) - R(0.014), Y(py), R(0.028), Y(LY3) - Y(py));
  ctx.fillStyle = '#5a3a24';
  rr(ctx, X(px) - R(0.05), Y(LY3) - R(0.02), R(0.1), R(0.02), R(0.005));
  ctx.fill();
  // 들보 (왼쪽 끝 lx, 오른쪽 끝 rx)
  const bly = py - 0.06 + (ly - 0.64) * 0.25, bry = py - 0.06 + (ry - 0.775) * 0.25;
  ctx.strokeStyle = '#8a5228';
  ctx.lineWidth = R(0.016);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(lx), Y(bly));
  ctx.lineTo(X(rx), Y(bry));
  ctx.stroke();
  brass(ctx, X(px), Y(py - 0.06 + ((bly + bry) / 2 - (py - 0.06)) * 0.5), R(0.018), 8, tilt * 2);
  // 사슬 · 접시
  ctx.strokeStyle = '#8a8a9a';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 2]);
  for (const [cx, top, bot, half] of [[lx, bly, ly, 0.06], [rx, bry, ry, pw / 2]] as [number, number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(X(cx), Y(top));
    ctx.lineTo(X(cx - half * 0.8), Y(bot));
    ctx.moveTo(X(cx), Y(top));
    ctx.lineTo(X(cx + half * 0.8), Y(bot));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = lin(ctx, 0, Y(ly), 0, Y(ly) + R(0.02), [[0, '#ffd88a'], [1, '#c88a2a']]);
  rr(ctx, X(lx - 0.06), Y(ly), R(0.12), R(0.018), R(0.008));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, Y(ry), 0, Y(ry) + R(0.024), [[0, '#ffd88a'], [1, '#c88a2a']]);
  rr(ctx, X(rx - pw / 2), Y(ry), R(pw), R(0.022), R(0.008));
  ctx.fill();
  ctx.strokeStyle = '#8a5a10';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
/** 불 (지금 시간으로 타오른다 — 되감아도 꺼지지 않는다, 물만 끈다) */
function drawFire(ctx: C2, v: View, f: number[], t: number) {
  const { X, Y, R } = v;
  const x0 = X(f[0]), x1 = X(f[1]), y = Y(f[2]);
  ctx.fillStyle = '#8a5a2a';
  for (let k = 0; k < 5; k++) (ell(ctx, x0 + ((k + 0.5) / 5) * (x1 - x0), y - R(0.008), R(0.02), R(0.008), k * 0.4), ctx.fill());
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,170,60,.25)';
  ell(ctx, (x0 + x1) / 2, y - R(0.05), (x1 - x0) * 0.7, R(0.08));
  ctx.fill();
  ctx.restore();
  for (let k = 0; k < 7; k++) {
    const fx = x0 + ((k + 0.5) / 7) * (x1 - x0), hh = R(0.05 + 0.03 * Math.abs(Math.sin(t * 0.21 + k * 1.7))), fl = Math.sin(t * 0.3 + k) * R(0.006);
    for (const [col, sc] of [['#ff5a2a', 1], ['#ffb02e', 0.7], ['#fff2a0', 0.4]] as [string, number][]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(fx - R(0.014) * sc, y);
      ctx.quadraticCurveTo(fx - R(0.016) * sc, y - hh * sc * 0.5, fx + fl, y - hh * sc);
      ctx.quadraticCurveTo(fx + R(0.016) * sc, y - hh * sc * 0.5, fx + R(0.014) * sc, y);
      ctx.closePath();
      ctx.fill();
    }
  }
}
/** 물건의 '지나온 길'(되감으면 이 길을 거꾸로 간다) — 흐린 점선 */
function drawTrail(ctx: C2, v: View, th: Thing, col: string) {
  if (th.k === 'bridge' || th.k === 'water' || th.tau < 6) return;
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const step = Math.max(3, Math.floor(th.tau / 24));
  for (let q = 0; q <= th.tau; q += step) {
    pose(th, q);
    let x = P.x, y = P.y;
    if (th.k === 'barrel') y -= 0.034;
    else if (th.k === 'gear') y -= 0.05;
    else if (th.k === 'crate') (y += th.h / 2), (x = th.x);
    else if (th.k === 'log' && q < LOG_LIE) continue;
    else if (th.k === 'pot') y += q < potTT(th) ? 0.01 : 0;
    if (q === 0) ctx.moveTo(v.X(x), v.Y(y));
    else ctx.lineTo(v.X(x), v.Y(y));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
/** 앞으로 갈 길(위험한 것) — 붉은 점선과 떨어질 자리 */
function drawFuture(ctx: C2, v: View, th: Thing) {
  if (th.st === DONE || th.st === REW) return;
  const X = v.X, Y = v.Y, R = v.R;
  if (th.k === 'arrow' && th.tau < th.n) {
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,90,80,.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let q = th.tau; q <= th.n; q += 4) {
      pose(th, q);
      if (q === th.tau) ctx.moveTo(X(P.x), Y(P.y));
      else ctx.lineTo(X(P.x), Y(P.y));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const pul = 1 + Math.sin(v.t * 0.3) * 0.15;
    ctx.strokeStyle = 'rgba(255,70,60,.85)';
    ctx.lineWidth = 2.5;
    ell(ctx, X(th.x2), Y(th.y2 + 0.035), R(0.03) * pul, R(0.01) * pul);
    ctx.stroke();
    ctx.restore();
  } else if ((th.k === 'barrel' || th.k === 'gear') && th.harm && th.tau < th.path!.length / 3 - 1 && th.st !== WAIT) {
    const n = th.path!.length / 3 - 1;
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = 'rgba(255,90,80,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let q = th.tau; q <= n; q += 5) {
      pose(th, q);
      const y = P.y - (th.k === 'gear' ? 0.05 : 0.034);
      if (q === th.tau) ctx.moveTo(X(P.x), Y(y));
      else ctx.lineTo(X(P.x), Y(y));
    }
    ctx.stroke();
    ctx.restore();
  } else if (th.k === 'pot' && th.tau < potTT(th) && th.tau > 0) {
    // 떨어질 자리
    const pul = 0.6 + Math.sin(v.t * 0.3) * 0.3;
    ctx.strokeStyle = `rgba(255,70,60,${pul})`;
    ctx.lineWidth = 2;
    ell(ctx, X(th.x), Y(th.y2), R(0.04), R(0.012));
    ctx.stroke();
  }
}

// ── 무대 ──
function drawSky(ctx: C2, v: View, w: number, ch: number) {
  const { Y, t } = v;
  const top = ch === 2 ? ['#ffe9c8', '#ffd9a8'] : ['#7ccfff', '#c6ecff'];
  ctx.fillStyle = lin(ctx, 0, 0, 0, Y(0.5), [[0, top[0]], [0.7, top[1]], [1, '#fff4dc']]);
  ctx.fillRect(-20, -20, w + 40, Y(0.6) + 20);
  if (ch === 2) return;
  // 해
  const sx = w * 0.84, sy = Y(0.07);
  ctx.fillStyle = 'rgba(255,240,170,.45)';
  ell(ctx, sx, sy, w * 0.09, w * 0.09);
  ctx.fill();
  ctx.fillStyle = '#ffe36a';
  ell(ctx, sx, sy, w * 0.045, w * 0.045);
  ctx.fill();
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 40) * 1.4 + t * 0.00012 * (1 + k * 0.3)) % 1.4) * w - w * 0.2, cy = Y(0.04 + hsh(k + 41) * 0.16), cs = w * (0.05 + hsh(k + 42) * 0.03);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ell(ctx, cx, cy, cs * 1.6, cs * 0.6);
    ctx.fill();
    ell(ctx, cx - cs * 0.6, cy - cs * 0.3, cs * 0.8, cs * 0.6);
    ctx.fill();
    ell(ctx, cx + cs * 0.5, cy - cs * 0.45, cs * 0.9, cs * 0.75);
    ctx.fill();
  }
}
/** 먼 마을(언덕 · 풍차 · 시계탑) — 복원된 만큼 살아난다 */
function drawPanorama(ctx: C2, v: View, w: number, ch: number) {
  const { X, Y, R, t, fixed } = v;
  // 무지개
  if (fixed >= 10) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    const cols = ['#ff6a6a', '#ffb04a', '#ffe36a', '#7ad86a', '#5ab8ff', '#a87aff'];
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      ctx.arc(X(0.3), Y(0.42), R(0.36 - i * 0.012), Math.PI * 1.05, Math.PI * 1.75);
      ctx.stroke();
    });
    ctx.restore();
  }
  // 언덕
  ctx.fillStyle = ch === 1 ? '#9ad87a' : '#b8e08a';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.42));
  ctx.quadraticCurveTo(X(0.18), Y(0.22), X(0.4), Y(0.36));
  ctx.quadraticCurveTo(X(0.7), Y(0.26), X(1), Y(0.34));
  ctx.lineTo(X(1), Y(0.5));
  ctx.lineTo(0, Y(0.5));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = ch === 1 ? '#7cc85e' : '#9ad07a';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.44));
  ctx.quadraticCurveTo(X(0.3), Y(0.33), X(0.55), Y(0.42));
  ctx.quadraticCurveTo(X(0.8), Y(0.36), X(1), Y(0.4));
  ctx.lineTo(X(1), Y(0.5));
  ctx.lineTo(0, Y(0.5));
  ctx.closePath();
  ctx.fill();
  // 풍차 (4판부터 돈다)
  {
    const mx = X(0.14), my = Y(0.26);
    ctx.fillStyle = '#f6efe4';
    ctx.beginPath();
    ctx.moveTo(mx - R(0.02), my + R(0.07));
    ctx.lineTo(mx + R(0.02), my + R(0.07));
    ctx.lineTo(mx + R(0.012), my);
    ctx.lineTo(mx - R(0.012), my);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d0584a';
    ctx.beginPath();
    ctx.moveTo(mx - R(0.016), my);
    ctx.lineTo(mx, my - R(0.018));
    ctx.lineTo(mx + R(0.016), my);
    ctx.fill();
    const rot = fixed >= 4 ? t * 0.03 : 0.3;
    ctx.strokeStyle = '#8a6a4a';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(a) * R(0.05), my + Math.sin(a) * R(0.05));
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,240,.9)';
      ctx.save();
      ctx.translate(mx + Math.cos(a) * R(0.03), my + Math.sin(a) * R(0.03));
      ctx.rotate(a);
      ctx.fillRect(-R(0.02), 0, R(0.04), R(0.01));
      ctx.restore();
    }
  }
  // 물레방아 (5판부터 돈다)
  {
    const mx = X(0.88), my = Y(0.36);
    ctx.fillStyle = '#f2e2c8';
    ctx.fillRect(mx - R(0.035), my - R(0.03), R(0.05), R(0.05));
    ctx.fillStyle = '#c86a4a';
    ctx.beginPath();
    ctx.moveTo(mx - R(0.042), my - R(0.03));
    ctx.lineTo(mx - R(0.01), my - R(0.055));
    ctx.lineTo(mx + R(0.022), my - R(0.03));
    ctx.closePath();
    ctx.fill();
    const wr = R(0.028), wx = mx + R(0.03), wy = my + R(0.005), rot = fixed >= 7 ? t * 0.04 : 0;
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 2;
    ell(ctx, wx, wy, wr, wr);
    ctx.stroke();
    for (let k = 0; k < 8; k++) {
      const a = rot + (k * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
      ctx.stroke();
    }
    if (fixed >= 7) {
      ctx.fillStyle = 'rgba(150,220,255,.8)';
      for (let k = 0; k < 4; k++) (ell(ctx, wx + wr * 0.9, wy + wr * 0.4 + ((t * 0.5 + k * 5) % 14), R(0.003), R(0.004)), ctx.fill());
    }
  }
  // 시계탑 (가운데 뒤)
  const tx = X(0.56), tw = R(0.11), tb = Y(0.45), tt = Y(0.08);
  ctx.fillStyle = lin(ctx, tx - tw / 2, 0, tx + tw / 2, 0, [[0, '#f2dcc0'], [1, '#d8b894']]);
  ctx.fillRect(tx - tw / 2, tt, tw, tb - tt);
  ctx.fillStyle = '#4a7ac0';
  ctx.beginPath();
  ctx.moveTo(tx - tw * 0.62, tt);
  ctx.lineTo(tx, tt - R(0.07));
  ctx.lineTo(tx + tw * 0.62, tt);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffcf3a';
  ell(ctx, tx, tt - R(0.072), R(0.006), R(0.006));
  ctx.fill();
  // 종 (11판)
  ctx.fillStyle = '#5a4a3a';
  rr(ctx, tx - R(0.022), tt + R(0.008), R(0.044), R(0.03), R(0.012));
  ctx.fill();
  if (fixed >= 15) {
    ctx.fillStyle = '#ffc94a';
    ctx.save();
    ctx.translate(tx, tt + R(0.012));
    ctx.rotate(Math.sin(t * 0.08) * 0.3);
    ctx.beginPath();
    ctx.moveTo(-R(0.012), R(0.02));
    ctx.quadraticCurveTo(-R(0.01), 0, 0, 0);
    ctx.quadraticCurveTo(R(0.01), 0, R(0.012), R(0.02));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  clockFace(ctx, tx, Y(0.17), R(0.04), t, fixed);
  cuckoo(ctx, tx, Y(0.17), R(0.04), t, fixed >= 16);
  pendulum(ctx, tx, Y(0.235), R(0.06), t, fixed >= 17);
  // 집 지붕들
  for (let k = 0; k < 7; k++) {
    const hx = X(-0.02 + k * 0.17 + (k > 3 ? 0.05 : 0)), hy = Y(0.4 + hsh(k) * 0.03), hw = R(0.07 + hsh(k + 5) * 0.03);
    if (Math.abs(hx - tx) < tw) continue;
    ctx.fillStyle = ['#ffd9b8', '#f8e6c8', '#ffe2d0'][k % 3];
    ctx.fillRect(hx - hw / 2, hy, hw, R(0.06));
    ctx.fillStyle = ['#e2685a', '#4a8ad0', '#f08a3a'][k % 3];
    ctx.beginPath();
    ctx.moveTo(hx - hw * 0.6, hy);
    ctx.lineTo(hx, hy - R(0.035));
    ctx.lineTo(hx + hw * 0.6, hy);
    ctx.closePath();
    ctx.fill();
  }
  // 열기구 (6판) · 연 (11판)
  if (fixed >= 6) {
    const bx = X(0.8) + Math.sin(t * 0.01) * R(0.02), by = Y(0.1) + Math.sin(t * 0.013) * R(0.01);
    ctx.fillStyle = '#ff6a5a';
    ell(ctx, bx, by, R(0.028), R(0.033));
    ctx.fill();
    ctx.fillStyle = '#ffd25a';
    ctx.fillRect(bx - R(0.009), by - R(0.033), R(0.018), R(0.066));
    ctx.strokeStyle = '#6a4a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - R(0.016), by + R(0.026));
    ctx.lineTo(bx - R(0.008), by + R(0.05));
    ctx.moveTo(bx + R(0.016), by + R(0.026));
    ctx.lineTo(bx + R(0.008), by + R(0.05));
    ctx.stroke();
    ctx.fillStyle = '#9a6a3a';
    ctx.fillRect(bx - R(0.009), by + R(0.05), R(0.018), R(0.012));
  }
  if (fixed >= 11)
    for (const [kx, ky, kc] of [[0.3, 0.09, '#ff5a8a'], [0.42, 0.15, '#5ab8ff']] as [number, number, string][]) {
      const x = X(kx) + Math.sin(t * 0.02 + kx * 9) * R(0.012), y = Y(ky) + Math.cos(t * 0.025 + kx * 7) * R(0.008);
      ctx.fillStyle = kc;
      ctx.beginPath();
      ctx.moveTo(x, y - R(0.02));
      ctx.lineTo(x + R(0.014), y);
      ctx.lineTo(x, y + R(0.022));
      ctx.lineTo(x - R(0.014), y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,60,.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + R(0.022));
      ctx.quadraticCurveTo(x + R(0.02), y + R(0.08), x - R(0.01), y + R(0.14));
      ctx.stroke();
    }
  // 새 떼 (9판)
  if (fixed >= 9) {
    ctx.strokeStyle = '#5a5a7a';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) {
      const bx = ((t * 0.0015 + k * 0.13) % 1.3) * w - w * 0.1, by = Y(0.1 + k * 0.025 + Math.sin(t * 0.03 + k) * 0.01), fl = Math.sin(t * 0.3 + k) * R(0.006);
      ctx.beginPath();
      ctx.moveTo(bx - R(0.01), by - fl);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + R(0.01), by - fl);
      ctx.stroke();
    }
  }
}
/** 뻐꾸기 집 (16번째 복원): 시계판 위 작은 문에서 이따금 쏙 */
function cuckoo(ctx: C2, x: number, y: number, r: number, t: number, on: boolean) {
  const out = on ? Math.max(0, Math.sin(t * 0.03)) ** 3 : 0;
  ctx.fillStyle = '#6a4a3a';
  rr(ctx, x - r * 0.26, y - r * 1.5, r * 0.52, r * 0.34, r * 0.06);
  ctx.fill();
  if (!on) return;
  ctx.fillStyle = '#5ab8ff';
  ell(ctx, x, y - r * 1.33 - out * r * 0.3, r * 0.16, r * 0.14);
  ctx.fill();
  ctx.fillStyle = '#ffb02e';
  ell(ctx, x + r * 0.17, y - r * 1.33 - out * r * 0.3, r * 0.08, r * 0.045);
  ctx.fill();
}
/** 시계추 창 (17번째 복원부터 흔들린다) */
function pendulum(ctx: C2, x: number, y: number, len: number, t: number, on: boolean) {
  ctx.fillStyle = 'rgba(60,40,30,.55)';
  rr(ctx, x - len * 0.42, y - len * 0.08, len * 0.84, len * 1.32, len * 0.12);
  ctx.fill();
  const a = on ? Math.sin(t * 0.06) * 0.42 : 0.05;
  ctx.strokeStyle = '#d8b060';
  ctx.lineWidth = Math.max(1, len * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(a) * len, y + Math.cos(a) * len);
  ctx.stroke();
  ctx.fillStyle = on ? '#ffc94a' : '#a08860';
  ell(ctx, x + Math.sin(a) * len, y + Math.cos(a) * len, len * 0.2, len * 0.2);
  ctx.fill();
}
/** 시계판 — 13번째 복원에 숫자, 14에 톱니, 18에 바늘이 다시 돈다 */
function clockFace(ctx: C2, x: number, y: number, r: number, t: number, fixed: number) {
  ctx.fillStyle = '#8a6a4a';
  ell(ctx, x, y, r * 1.12, r * 1.12);
  ctx.fill();
  ctx.fillStyle = fixed >= 13 ? '#fffbe8' : '#e8e0d0';
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.fillStyle = fixed >= 13 ? '#3a2a1a' : 'rgba(60,40,30,.25)';
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU2;
    ell(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.07, r * 0.07);
    ctx.fill();
  }
  if (fixed >= 14) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    brass(ctx, x, y, r * 0.42, 8, t * 0.02);
    ctx.restore();
  }
  const h1 = fixed >= 18 ? t * 0.01 : -1.2, h2 = fixed >= 18 ? t * 0.0009 : 0.5;
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(h1) * r * 0.75, y + Math.sin(h1) * r * 0.75);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(h2) * r * 0.5, y + Math.sin(h2) * r * 0.5);
  ctx.stroke();
}
/** 2장 강가: 집 뒤의 풀밭과 나무 */
function drawMeadow(ctx: C2, v: View, w: number) {
  const { X, Y, R, t } = v;
  ctx.fillStyle = lin(ctx, 0, Y(0.44), 0, Y(0.8), [[0, '#a8dc84'], [1, '#8fcf6a']]);
  ctx.fillRect(-10, Y(0.44), w + 20, Y(0.8) - Y(0.44));
  for (let k = 0; k < 9; k++) {
    const tx = X(-0.04 + k * 0.13 + hsh(k + 60) * 0.04), ty = Y(0.7 + hsh(k + 61) * 0.06), sz = R(0.05 + hsh(k + 62) * 0.025);
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(tx - R(0.007), ty - sz * 0.4, R(0.014), sz * 0.9);
    ctx.fillStyle = ['#5cb84a', '#4aa83e', '#6cc858'][k % 3];
    const sw = Math.sin(t * 0.02 + k) * R(0.002);
    ell(ctx, tx + sw, ty - sz * 0.8, sz * 0.75, sz * 0.62);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ell(ctx, tx - sz * 0.25 + sw, ty - sz * 1.0, sz * 0.3, sz * 0.2);
    ctx.fill();
  }
}
/** 1장 장터 · 2장 강가의 뒷줄 집들 */
function drawHouses(ctx: C2, v: View, L: Level, s: RewState) {
  const { X, Y, R, t, fixed } = v;
  const ch = L.ch;
  const base = Y(0.78);
  const cols = ch === 0 ? ['#ffb8a0', '#ffe08a', '#a8e0c8', '#c4ccff', '#ffc4dc', '#ffd0a0'] : ['#f6e6c8', '#e8f0d0', '#ffe8d0', '#e0ecf8'];
  const roofs = ['#e2584a', '#3f7fc1', '#f08a3a', '#7a5ac8', '#3aa86a'];
  const xs = ch === 0 ? [-0.02, 0.18, 0.36, 0.56, 0.74, 0.9] : [0.02, 0.26, 0.74, 0.92];
  const alley = L.deco.alley;
  for (let k = 0; k < xs.length; k++) {
    const x0 = xs[k], x1 = k + 1 < xs.length ? xs[k + 1] : 1.06;
    if (alley !== undefined && x0 < alley + 0.05 && x1 > alley - 0.05) continue;
    if (ch === 1 && L.canal && x0 < L.canal[1] + 0.02 && x1 > L.canal[0] - 0.02) continue;
    const hTop = Y(ch === 0 ? 0.42 + hsh(k + 3) * 0.06 : 0.52 + hsh(k + 3) * 0.06), xa = X(x0), xb = X(x1) - R(0.01);
    ctx.fillStyle = lin(ctx, xa, 0, xb, 0, [[0, cols[k % cols.length]], [1, shade(cols[k % cols.length], 0.88)]]);
    ctx.fillRect(xa, hTop, xb - xa, base - hTop);
    // 벽 아래 그늘
    ctx.fillStyle = 'rgba(90,50,40,.12)';
    ctx.fillRect(xa, base - R(0.03), xb - xa, R(0.03));
    // 지붕
    ctx.fillStyle = roofs[k % roofs.length];
    ctx.beginPath();
    ctx.moveTo(xa - R(0.012), hTop + R(0.004));
    ctx.lineTo(xa + R(0.02), hTop - R(0.05));
    ctx.lineTo(xb - R(0.02), hTop - R(0.05));
    ctx.lineTo(xb + R(0.012), hTop + R(0.004));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(xa + R(0.02), hTop - R(0.05), xb - xa - R(0.04), R(0.008));
    // 굴뚝 연기
    if (k % 2 === 0) {
      const cx = xb - R(0.04);
      ctx.fillStyle = '#9a5a4a';
      ctx.fillRect(cx, hTop - R(0.07), R(0.018), R(0.03));
      for (let q = 0; q < 3; q++) {
        const ph = ((t * 0.01 + q / 3 + k * 0.2) % 1);
        ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`;
        ell(ctx, cx + R(0.01) + ph * R(0.03), hTop - R(0.08) - ph * R(0.06), R(0.01 + ph * 0.012), R(0.008 + ph * 0.01));
        ctx.fill();
      }
    }
    // 창문 (2층)
    const nw = Math.max(1, Math.floor((xb - xa) / R(0.09)));
    for (let q = 0; q < nw; q++) {
      const wx = xa + ((q + 0.5) / nw) * (xb - xa), wy = hTop + R(0.04);
      if ((L.deco.balc !== undefined && Math.abs(wx - X(L.deco.balc)) < R(0.05)) || (L.deco.balc2 !== undefined && Math.abs(wx - X(L.deco.balc2)) < R(0.05))) continue;
      ctx.fillStyle = '#ffffff';
      rr(ctx, wx - R(0.025), wy - R(0.004), R(0.05), R(0.062), R(0.012));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, wy, 0, wy + R(0.05), [[0, '#8ab8e8'], [1, '#5a80b8']]);
      rr(ctx, wx - R(0.019), wy + R(0.002), R(0.038), R(0.05), R(0.01));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillRect(wx - R(0.015), wy + R(0.006), R(0.008), R(0.02));
      // 꽃상자 (2판부터 핀다)
      ctx.fillStyle = '#9a5a2a';
      rr(ctx, wx - R(0.03), wy + R(0.056), R(0.06), R(0.012), R(0.004));
      ctx.fill();
      for (let f = 0; f < 4; f++) {
        ctx.fillStyle = fixed >= 2 ? ['#ff5a7a', '#ffcf3a', '#ff8ad0', '#ffffff'][(f + q + k) % 4] : '#7a9a5a';
        ell(ctx, wx - R(0.022) + f * R(0.015), wy + R(0.052), R(fixed >= 2 ? 0.008 : 0.005), R(fixed >= 2 ? 0.008 : 0.005));
        ctx.fill();
      }
    }
    // 1층 문·차양
    if (ch === 0) {
      const dx = (xa + xb) / 2;
      ctx.fillStyle = ['#ff6a5a', '#3aa0d0', '#ffb02e', '#6ac86a'][k % 4];
      ctx.beginPath();
      ctx.moveTo(dx - R(0.06), base - R(0.11));
      ctx.lineTo(dx + R(0.06), base - R(0.11));
      ctx.lineTo(dx + R(0.07), base - R(0.08));
      ctx.lineTo(dx - R(0.07), base - R(0.08));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let q = 0; q < 4; q++) ctx.fillRect(dx - R(0.06) + q * R(0.034), base - R(0.11), R(0.017), R(0.03));
      ctx.fillStyle = '#8a5a3a';
      rr(ctx, dx - R(0.02), base - R(0.075), R(0.04), R(0.075), R(0.014));
      ctx.fill();
    }
  }
  // 깃발 줄 (5판부터)
  if (ch === 0 && fixed >= 5)
    for (const [a0, a1, yy] of [[-0.02, 0.48, 0.6], [0.52, 1.02, 0.58]] as [number, number, number][]) {
      ctx.strokeStyle = 'rgba(90,60,40,.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(a0), Y(yy));
      ctx.quadraticCurveTo(X((a0 + a1) / 2), Y(yy + 0.05), X(a1), Y(yy));
      ctx.stroke();
      for (let q = 0; q < 8; q++) {
        const u = (q + 0.5) / 8, fx2 = X(a0 + (a1 - a0) * u), fy = Y(yy) + (1 - Math.pow(2 * u - 1, 2)) * R(0.05) * 0.9;
        ctx.fillStyle = ['#ff5a5a', '#ffcf3a', '#5ab8ff', '#7ad86a'][q % 4];
        ctx.beginPath();
        ctx.moveTo(fx2 - R(0.014), fy);
        ctx.lineTo(fx2 + R(0.014), fy);
        ctx.lineTo(fx2 + Math.sin(t * 0.06 + q) * R(0.003), fy + R(0.03));
        ctx.closePath();
        ctx.fill();
      }
    }
  // 발코니 (화분 판)
  for (const bk of [L.deco.balc, L.deco.balc2]) {
    if (bk === undefined) continue;
    const bx = X(bk), by = Y(0.5);
    ctx.fillStyle = '#ffffff';
    rr(ctx, bx - R(0.05), by - R(0.09), R(0.1), R(0.09), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#4a3a5a';
    rr(ctx, bx - R(0.042), by - R(0.085), R(0.084), R(0.085), R(0.016));
    ctx.fill();
    ctx.fillStyle = '#b8783a';
    rr(ctx, bx - R(0.075), by, R(0.15), R(0.014), R(0.005));
    ctx.fill();
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 2;
    for (let q = 0; q < 7; q++) {
      ctx.beginPath();
      ctx.moveTo(bx - R(0.07) + q * R(0.023), by + R(0.014));
      ctx.lineTo(bx - R(0.07) + q * R(0.023), by + R(0.045));
      ctx.stroke();
    }
    ctx.fillRect(bx - R(0.075), by + R(0.042), R(0.15), R(0.006));
  }
  void s;
}
const shade = (hex: string, k = 0.8) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
};
/** 길(돌길·흙길)과 물길 */
function drawGround(ctx: C2, v: View, L: Level, w: number) {
  const { X, Y, R, t, fixed } = v;
  const ch = L.ch;
  if (ch === 2) return;
  const lane = LY;
  // 뒤 인도
  ctx.fillStyle = ch === 0 ? '#f2e6d2' : '#a8d880';
  ctx.fillRect(0, Y(0.78), w, Y(lane - 0.055) - Y(0.78));
  // 길
  const top = Y(lane - 0.055), bot = Y(lane + 0.07);
  ctx.fillStyle = ch === 0 ? lin(ctx, 0, top, 0, bot, [[0, '#e2cfb0'], [1, '#d2b890']]) : lin(ctx, 0, top, 0, bot, [[0, '#e8c890'], [1, '#d8b070']]);
  ctx.fillRect(0, top, w, bot - top);
  if (ch === 0) {
    ctx.strokeStyle = 'rgba(150,110,70,.28)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 4; r++) {
      const yy = top + ((r + 0.5) / 4) * (bot - top);
      for (let c = 0; c < 14; c++) {
        const xx = ((c + (r % 2) * 0.5) / 13) * w;
        rr(ctx, xx - R(0.03), yy - R(0.012), R(0.06), R(0.024), R(0.01));
        ctx.stroke();
      }
    }
  } else {
    ctx.fillStyle = 'rgba(160,110,60,.25)';
    for (let k = 0; k < 30; k++) (ell(ctx, hsh(k + 77) * w, top + hsh(k + 78) * (bot - top), R(0.006), R(0.003)), ctx.fill());
  }
  // 앞 인도·꽃밭
  ctx.fillStyle = ch === 0 ? '#e8d8bc' : '#8fd16a';
  ctx.fillRect(0, bot, w, Y(BOTY + 0.02) - bot);
  ctx.fillStyle = ch === 0 ? '#cdb894' : '#74b850';
  ctx.fillRect(0, bot, w, R(0.012));
  if (ch === 1) {
    // 풀잎
    ctx.strokeStyle = '#5aa040';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 40; k++) {
      const gx = hsh(k + 300) * w, gy = bot + R(0.03) + hsh(k + 301) * R(0.25);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.sin(t * 0.04 + k) * R(0.004), gy - R(0.014));
      ctx.stroke();
    }
  }
  // 가로등 (3판부터 불빛)
  if (ch === 0)
    for (const lx of [0.08, 0.95]) {
      const px = X(lx), py = Y(0.79);
      ctx.fillStyle = '#4a4a5a';
      ctx.fillRect(px - R(0.004), py - R(0.16), R(0.008), R(0.16));
      ctx.fillStyle = fixed >= 3 ? '#fff2a0' : '#9a9aa8';
      rr(ctx, px - R(0.014), py - R(0.19), R(0.028), R(0.03), R(0.008));
      ctx.fill();
      if (fixed >= 3) {
        ctx.fillStyle = 'rgba(255,240,150,.3)';
        ell(ctx, px, py - R(0.175), R(0.04), R(0.04));
        ctx.fill();
      }
    }
  // 물길 (도랑 · 강)
  if (L.canal) {
    const [c0, c1] = L.canal;
    const x0 = X(c0), x1 = X(c1), yTop = Y(ch === 0 ? 0.735 : 0.78), yBot = Y(BOTY + 0.02);
    if (ch === 0) {
      // 집 아래 돌 아치에서 흘러나오는 도랑
      const mx = (x0 + x1) / 2, rw = (x1 - x0) / 2 + R(0.01);
      ctx.fillStyle = '#c8b494';
      ctx.beginPath();
      ctx.moveTo(mx - rw - R(0.014), Y(0.785));
      ctx.lineTo(mx - rw - R(0.014), Y(0.735));
      ctx.ellipse(mx, Y(0.735), rw + R(0.014), R(0.055), 0, Math.PI, 0);
      ctx.lineTo(mx + rw + R(0.014), Y(0.785));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a3a4a';
      ctx.beginPath();
      ctx.moveTo(mx - rw, Y(0.785));
      ctx.lineTo(mx - rw, Y(0.74));
      ctx.ellipse(mx, Y(0.74), rw, R(0.045), 0, Math.PI, 0);
      ctx.lineTo(mx + rw, Y(0.785));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,80,.5)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + (k / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(a) * rw, Y(0.74) + Math.sin(a) * R(0.045));
        ctx.lineTo(mx + Math.cos(a) * (rw + R(0.014)), Y(0.735) + Math.sin(a) * R(0.055));
        ctx.stroke();
      }
    } else {
      // 먼 언덕에서 굽이쳐 내려오는 강
      const mx = (x0 + x1) / 2, hw = (x1 - x0) / 2, fx0 = mx + R(0.05);
      ctx.fillStyle = lin(ctx, 0, Y(0.44), 0, yTop, [[0, '#b8ecff'], [1, '#5ad0f5']]);
      ctx.beginPath();
      ctx.moveTo(fx0 - hw * 0.2, Y(0.44));
      ctx.bezierCurveTo(fx0 - hw * 0.6, Y(0.52), x0 + hw * 0.3, Y(0.66), x0, yTop);
      ctx.lineTo(x1, yTop);
      ctx.bezierCurveTo(x1 + hw * 0.1, Y(0.66), fx0 + hw * 0.5, Y(0.52), fx0 + hw * 0.2, Y(0.44));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const q = ((t * 0.004 + k / 5) % 1), yy = Y(0.46) + q * (yTop - Y(0.46)), half = hw * (0.25 + q * 0.75) * 0.5;
        ctx.beginPath();
        ctx.moveTo(mx - half * 0.5, yy);
        ctx.lineTo(mx + half * 0.3, yy);
        ctx.stroke();
      }
    }
    ctx.fillStyle = ch === 0 ? '#b8a88a' : '#a88a5a';
    ctx.fillRect(x0 - R(0.012), yTop, x1 - x0 + R(0.024), yBot - yTop);
    ctx.fillStyle = lin(ctx, 0, yTop, 0, yBot, [[0, '#5ad0f5'], [1, '#2a90d0']]);
    ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
    // 흐르는 물결 (아래로)
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 12; k++) {
      const fy = yTop + (((t * 0.9 + k * 47) % (yBot - yTop)) + (yBot - yTop)) % (yBot - yTop), fx2 = x0 + (hsh(k) * 0.8 + 0.1) * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(fx2 - R(0.012), fy);
      ctx.quadraticCurveTo(fx2, fy + R(0.006), fx2 + R(0.012), fy);
      ctx.stroke();
    }
    // 강둑 그늘 · 갈대(강가)
    ctx.fillStyle = 'rgba(30,80,120,.25)';
    ctx.fillRect(x0, yTop, R(0.012), yBot - yTop);
    if (ch === 1) {
      ctx.strokeStyle = '#4a9a3a';
      ctx.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        const rx = k % 2 ? x1 + R(0.008) : x0 - R(0.008), ry = Y(0.95 + k * 0.03);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.sin(t * 0.05 + k) * R(0.006), ry - R(0.05));
        ctx.stroke();
        ctx.fillStyle = '#8a5a2a';
        ell(ctx, rx + Math.sin(t * 0.05 + k) * R(0.006), ry - R(0.05), R(0.004), R(0.01));
        ctx.fill();
      }
      // 보 (폭포)
      ctx.fillStyle = '#e8f8ff';
      for (let k = 0; k < 8; k++) (ell(ctx, x0 + ((k + 0.5) / 8) * (x1 - x0), Y(1.17) + Math.sin(t * 0.3 + k) * 2, R(0.014), R(0.008)), ctx.fill());
      // 나룻배 (6판)
      // 물고기 (12판)
      if (fixed >= 12)
        for (let k = 0; k < 2; k++) {
          const ph = ((t * 0.012 + k * 0.5) % 1), jx = x0 + (0.3 + k * 0.4) * (x1 - x0), jy = Y(1.0 + k * 0.06) - Math.sin(ph * Math.PI) * R(0.05);
          if (ph < 0.5) {
            ctx.fillStyle = '#ff9a3a';
            ell(ctx, jx, jy, R(0.012), R(0.006), -1 + ph * 4);
            ctx.fill();
          }
        }
      if (fixed >= 8) {
        const bx = x1 - R(0.03), by = Y(0.58) + Math.sin(t * 0.05) * 2;
        ctx.fillStyle = '#c8783a';
        ctx.beginPath();
        ctx.moveTo(bx - R(0.04), by);
        ctx.lineTo(bx + R(0.04), by);
        ctx.lineTo(bx + R(0.025), by + R(0.018));
        ctx.lineTo(bx - R(0.025), by + R(0.018));
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by - R(0.05));
        ctx.lineTo(bx + R(0.03), by - R(0.01));
        ctx.closePath();
        ctx.fill();
      }
    }
    // 길이 물길을 만나는 돌 가장자리
    ctx.fillStyle = ch === 0 ? '#c8b08a' : '#b89060';
    ctx.fillRect(x0 - R(0.012), top, R(0.012), bot - top);
    ctx.fillRect(x1, top, R(0.012), bot - top);
  }
  // 마른 웅덩이 (물탱크 판)
  if (L.basin) {
    const [b0, b1] = L.basin;
    ctx.fillStyle = '#c8b090';
    rr(ctx, X(b0), Y(lane - 0.03), X(b1) - X(b0), R(0.08), R(0.02));
    ctx.fill();
    ctx.fillStyle = 'rgba(120,90,60,.3)';
    rr(ctx, X(b0) + R(0.008), Y(lane - 0.02), X(b1) - X(b0) - R(0.016), R(0.05), R(0.015));
    ctx.fill();
  }
}
/** 앞마당 장식 (화단 · 과일 수레 · 상자 더미 · 비계) */
function drawFront(ctx: C2, v: View, L: Level, W: World) {
  const { X, Y, R, t, fixed } = v;
  const inCanal = (x: number) => !!L.canal && x > L.canal[0] - 0.04 && x < L.canal[1] + 0.04;
  if (L.ch === 0) {
    // 길가 화단 (2판부터 꽃)
    for (let k = 0; k < 9; k++) {
      const fx = 0.06 + k * 0.11;
      if (inCanal(fx) || (L.deco.alley !== undefined && Math.abs(fx - L.deco.alley) < 0.08) || fx < 0.2) continue;
      const px = X(fx), py = Y(0.985);
      ctx.fillStyle = '#b8743a';
      rr(ctx, px - R(0.04), py - R(0.012), R(0.08), R(0.03), R(0.008));
      ctx.fill();
      ctx.fillStyle = '#5aa84a';
      ell(ctx, px, py - R(0.014), R(0.04), R(0.016));
      ctx.fill();
      for (let f = 0; f < 4; f++) {
        ctx.fillStyle = fixed >= 2 ? ['#ff5a7a', '#ffcf3a', '#ff8ad0', '#ffffff'][(f + k) % 4] : '#7aa85a';
        ell(ctx, px - R(0.027) + f * R(0.018), py - R(0.022) + Math.sin(t * 0.05 + f + k) * R(0.002), R(fixed >= 2 ? 0.008 : 0.005), R(fixed >= 2 ? 0.008 : 0.005));
        ctx.fill();
      }
    }
    // 과일 수레 (오른쪽 앞)
    const cx = X(0.9), cy = Y(1.14);
    ctx.fillStyle = '#9a5a2a';
    rr(ctx, cx - R(0.08), cy - R(0.05), R(0.16), R(0.05), R(0.008));
    ctx.fill();
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = ['#ff5a4a', '#ffb02e', '#7ad04a', '#ff5a4a'][k % 4];
      ell(ctx, cx - R(0.065) + k * R(0.022), cy - R(0.056) - (k % 2) * R(0.008), R(0.012), R(0.012));
      ctx.fill();
    }
    ctx.fillStyle = '#ff6a5a';
    ctx.beginPath();
    ctx.moveTo(cx - R(0.09), cy - R(0.12));
    ctx.lineTo(cx + R(0.09), cy - R(0.12));
    ctx.lineTo(cx + R(0.1), cy - R(0.09));
    ctx.lineTo(cx - R(0.1), cy - R(0.09));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let q = 0; q < 5; q++) ctx.fillRect(cx - R(0.09) + q * R(0.04), cy - R(0.12), R(0.02), R(0.03));
    ctx.fillStyle = '#6a3a1a';
    ctx.fillRect(cx - R(0.085), cy - R(0.09), R(0.006), R(0.045));
    ctx.fillRect(cx + R(0.079), cy - R(0.09), R(0.006), R(0.045));
    // 술통이 부딪칠 상자 더미
    if (L.deco.alley !== undefined) {
      const bx = X(L.deco.alley + 0.02), byy = Y(1.17);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = '#d8a060';
        rr(ctx, bx - R(0.05) + (k % 2) * R(0.05), byy - R(0.04) * (k === 2 ? 2 : 1), R(0.048), R(0.04), R(0.004));
        ctx.fill();
        ctx.strokeStyle = '#8a5228';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  } else if (L.ch === 1) {
    // 들꽃 · 울타리
    for (let k = 0; k < 14; k++) {
      const fx = hsh(k + 500), fy = 0.96 + hsh(k + 501) * 0.2;
      if (inCanal(fx)) continue;
      ctx.fillStyle = ['#ff8ab8', '#ffffff', '#ffcf3a'][k % 3];
      ell(ctx, X(fx), Y(fy), R(0.008), R(0.008));
      ctx.fill();
    }
    ctx.strokeStyle = '#b8884a';
    ctx.lineWidth = 2;
    for (const [a, b] of [[0.0, 0.2], [0.78, 1.0]] as [number, number][]) {
      if (inCanal((a + b) / 2)) continue;
      ctx.beginPath();
      ctx.moveTo(X(a), Y(0.775));
      ctx.lineTo(X(b), Y(0.775));
      ctx.stroke();
      for (let q = a; q <= b; q += 0.05) (ctx.beginPath(), ctx.moveTo(X(q), Y(0.79)), ctx.lineTo(X(q), Y(0.75)), ctx.stroke());
    }
    // 엄마 여우의 선착장
    if (L.key === 'raft' && L.canal) {
      ctx.fillStyle = '#b8783a';
      ctx.fillRect(X(L.canal[0] - 0.08), Y(LY + 0.02), R(0.1), R(0.02));
    }
  } else {
    // 시계탑 안: 높은 곳 배우의 발판 (창턱 · 비계)
    for (const a of W.ac) {
      if (a.y > 0.7 || (a.k !== 'grandma' && a.k !== 'beaver' && a.k !== 'mole')) continue;
      const px = X(a.x), py = Y(a.y);
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(px - R(0.006) - R(0.05), py, R(0.012), Y(0.95) - py);
      ctx.fillRect(px - R(0.006) + R(0.05), py, R(0.012), Y(0.95) - py);
      ctx.strokeStyle = 'rgba(120,80,50,.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - R(0.05), py + R(0.02));
      ctx.lineTo(px + R(0.05), Y(0.93));
      ctx.moveTo(px + R(0.05), py + R(0.02));
      ctx.lineTo(px - R(0.05), Y(0.93));
      ctx.stroke();
      ctx.fillStyle = lin(ctx, 0, py, 0, py + R(0.02), [[0, '#d8a060'], [1, '#9a6030']]);
      rr(ctx, px - R(0.085), py, R(0.17), R(0.02), R(0.004));
      ctx.fill();
    }
    // 걸린 등불
    for (const lx of [0.3, 0.72]) {
      const px = X(lx), py = Y(0.47) + Math.sin(t * 0.04 + lx * 9) * R(0.004);
      ctx.strokeStyle = '#6a4a3a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,130,.35)';
      ell(ctx, px, py + R(0.02), R(0.04), R(0.04));
      ctx.fill();
      ctx.fillStyle = '#ffd86a';
      rr(ctx, px - R(0.012), py, R(0.024), R(0.036), R(0.008));
      ctx.fill();
    }
  }
}
/** 1판부터 살아나는 분수 (앞마당) */
function drawFountain(ctx: C2, v: View, x: number, y: number) {
  const { X, Y, R, t, fixed } = v;
  const cx = X(x), cy = Y(y);
  ctx.fillStyle = '#d8d0c4';
  ell(ctx, cx, cy, R(0.07), R(0.022));
  ctx.fill();
  ctx.fillStyle = fixed >= 1 ? '#6ad0f5' : '#b8a890';
  ell(ctx, cx, cy - R(0.004), R(0.06), R(0.016));
  ctx.fill();
  ctx.fillStyle = '#c8c0b4';
  ctx.fillRect(cx - R(0.008), cy - R(0.05), R(0.016), R(0.048));
  ell(ctx, cx, cy - R(0.05), R(0.025), R(0.008));
  ctx.fill();
  if (fixed >= 1) {
    ctx.fillStyle = 'rgba(200,240,255,.9)';
    for (let k = 0; k < 10; k++) {
      const q = ((t * 0.03 + k / 10) % 1), a = (k / 10) * TAU2;
      ell(ctx, cx + Math.cos(a) * R(0.035) * q, cy - R(0.06) - Math.sin(q * Math.PI) * R(0.05) + q * R(0.04), R(0.005), R(0.005));
      ctx.fill();
    }
  }
}
/** 3장 시계탑 안 */
function drawTower(ctx: C2, v: View, _L: Level, w: number) {
  const { X, Y, R, t, fixed } = v;
  // 뒷벽 벽돌
  ctx.fillStyle = lin(ctx, 0, 0, 0, Y(1.2), [[0, '#f0d8b4'], [1, '#d8b88e']]);
  ctx.fillRect(-10, -10, w + 20, Y(1.25) + 10);
  ctx.strokeStyle = 'rgba(150,100,60,.18)';
  ctx.lineWidth = 1;
  for (let r = 0; r < 26; r++) {
    const yy = Y(r * 0.048);
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
    for (let c = 0; c < 9; c++) {
      const xx = ((c + (r % 2) * 0.5) / 8) * w;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + R(0.048));
      ctx.stroke();
    }
  }
  // 둥근 창 (밖의 하늘과 마을)
  for (const wx of [0.14, 0.86]) {
    const cx = X(wx), cy = Y(0.2);
    ctx.fillStyle = lin(ctx, 0, cy - R(0.07), 0, cy + R(0.07), [[0, '#8fd8ff'], [1, '#d8f2ff']]);
    ell(ctx, cx, cy, R(0.065), R(0.08));
    ctx.fill();
    ctx.fillStyle = '#9ad87a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + R(0.08), R(0.065), R(0.04), 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = R(0.012);
    ell(ctx, cx, cy, R(0.068), R(0.083));
    ctx.stroke();
    ctx.lineWidth = R(0.005);
    ctx.beginPath();
    ctx.moveTo(cx - R(0.065), cy);
    ctx.lineTo(cx + R(0.065), cy);
    ctx.moveTo(cx, cy - R(0.08));
    ctx.lineTo(cx, cy + R(0.08));
    ctx.stroke();
  }
  // 큰 시계판 뒷모습 + 큰 톱니들 (10판부터 돈다)
  const rot = fixed >= 14 ? t * 0.004 : 0;
  ctx.save();
  ctx.globalAlpha = 0.55;
  brass(ctx, X(0.32), Y(0.24), R(0.09), 14, rot);
  brass(ctx, X(0.66), Y(0.3), R(0.07), 12, -rot * 1.3 + 0.1);
  brass(ctx, X(0.5), Y(0.12), R(0.05), 10, rot * 1.8);
  ctx.restore();
  clockFace(ctx, X(0.5), Y(0.31), R(0.08), t, fixed);
  cuckoo(ctx, X(0.5), Y(0.31), R(0.08), t, fixed >= 16);
  // 큰 종 (11판부터 흔들리며 울린다)
  {
    const bx = X(0.5), by = Y(0.02), sw = fixed >= 15 ? Math.sin(t * 0.05) * 0.25 : 0;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(sw);
    ctx.fillStyle = '#6a4a3a';
    ctx.fillRect(-R(0.004), -R(0.04), R(0.008), R(0.03));
    ctx.fillStyle = lin(ctx, -R(0.04), 0, R(0.04), 0, [[0, '#ffe08a'], [0.6, '#e0a83a'], [1, '#a8741c']]);
    ctx.beginPath();
    ctx.moveTo(-R(0.02), -R(0.01));
    ctx.quadraticCurveTo(-R(0.025), R(0.04), -R(0.045), R(0.06));
    ctx.lineTo(R(0.045), R(0.06));
    ctx.quadraticCurveTo(R(0.025), R(0.04), R(0.02), -R(0.01));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  pendulum(ctx, X(0.5), Y(0.41), R(0.18), t, fixed >= 17);
  // 기둥
  ctx.fillStyle = '#c8a07a';
  for (const px of [0.02, 0.98]) ctx.fillRect(X(px) - R(0.02), 0, R(0.04), Y(1.25));
}
/** 3장: 가까운 나무 들보·기둥 (당겨 본 세계) */
function drawTowerNear(ctx: C2, v: View, _L: Level, w: number) {
  const { X, Y, R } = v;
  ctx.fillStyle = lin(ctx, 0, Y(0.3), 0, Y(0.33), [[0, '#a8744a'], [1, '#6a4428']]);
  ctx.fillRect(-10, Y(0.3), w + 20, R(0.028));
  for (const bx of [0.04, 0.96]) {
    ctx.fillStyle = lin(ctx, X(bx) - R(0.02), 0, X(bx) + R(0.02), 0, [[0, '#a8744a'], [1, '#6a4428']]);
    ctx.fillRect(X(bx) - R(0.018), Y(0.3), R(0.036), Y(1.2) - Y(0.3));
  }
}
/** 바닥 판(3/4 두께) — 3장 */
function drawFloors(ctx: C2, v: View, L: Level) {
  const { X, Y, R } = v;
  const g = L.ground;
  for (let i = 0; i < g.length; i += 3) {
    const x0 = X(g[i]), x1 = X(g[i + 1]), y = Y(g[i + 2]);
    const th = g[i + 2] < 0.8 ? R(0.05) : Y(1.21) - y;
    ctx.fillStyle = lin(ctx, 0, y, 0, y + th, [[0, '#b8784a'], [1, '#7a4a2a']]);
    ctx.fillRect(x0, y, x1 - x0, th);
    ctx.fillStyle = lin(ctx, 0, y - R(0.03), 0, y, [[0, '#e8b47a'], [1, '#d09a5e']]);
    ctx.fillRect(x0, y - R(0.03), x1 - x0, R(0.03));
    ctx.strokeStyle = 'rgba(100,60,30,.35)';
    ctx.lineWidth = 1;
    for (let q = x0 + R(0.06); q < x1; q += R(0.06)) {
      ctx.beginPath();
      ctx.moveTo(q, y - R(0.03));
      ctx.lineTo(q, y);
      ctx.stroke();
    }
    if (g[i + 2] < 0.8) {
      // 위층 난간
      ctx.strokeStyle = '#8a5a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + R(0.03), y - R(0.1));
      ctx.lineTo(x1, y - R(0.1));
      ctx.stroke();
      for (let q = x0 + R(0.03); q < x1; q += R(0.04)) {
        ctx.beginPath();
        ctx.moveTo(q, y - R(0.1));
        ctx.lineTo(q, y - R(0.03));
        ctx.stroke();
      }
    }
  }
  if (L.shaft) {
    const [s0, s1, yt, yb] = L.shaft;
    ctx.fillStyle = 'rgba(60,35,25,.55)';
    ctx.fillRect(X(s0), Y(yt), X(s1) - X(s0), Y(yb + 0.2) - Y(yt));
    // 크레인
    ctx.fillStyle = '#6a4a3a';
    ctx.fillRect(X(s0) - R(0.02), Y(0.33), X(s1) - X(s0) + R(0.12), R(0.02));
    ctx.fillRect(X(s1) + R(0.08), Y(0.33), R(0.02), Y(UP3) - Y(0.33));
    brass(ctx, X((s0 + s1) / 2), Y(0.36), R(0.016), 8, 0);
  }
}

/** 시계 부품 (목표) */
function drawPart(ctx: C2, v: View, x: number, y: number, got: boolean) {
  const { X, Y, R, t } = v;
  const bx = X(x), by = Y(y);
  ctx.fillStyle = '#9a7a5a';
  rr(ctx, bx - R(0.025), by - R(0.03), R(0.05), R(0.03), R(0.008));
  ctx.fill();
  ctx.fillStyle = '#c8a888';
  rr(ctx, bx - R(0.03), by - R(0.036), R(0.06), R(0.01), R(0.004));
  ctx.fill();
  if (got) return;
  const fy = by - R(0.07) + Math.sin(t * 0.08) * R(0.006);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,220,120,.25)';
  ell(ctx, bx, fy, R(0.05), R(0.05));
  ctx.fill();
  ctx.restore();
  brass(ctx, bx, fy, R(0.026), 8, t * 0.03, 1);
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 3; k++) {
    const a = t * 0.05 + (k * TAU2) / 3;
    starPath(ctx, bx + Math.cos(a) * R(0.04), fy + Math.sin(a) * R(0.03), R(0.006));
    ctx.fill();
  }
}

function heroMood(s: RewState): Mood {
  const H = s.W.hero, t = s.t;
  if (H.st === H_FAIL) return H.why.includes('풍덩') || H.why.includes('물') ? 'wet' : 'dizzy';
  if (H.st === H_WIN) return 'cheer';
  if (H.st === H_FALL) return 'shock';
  const e = s.events;
  for (let i = e.length - 1; i >= 0 && t - e[i].t < 50; i--) {
    const k = e[i].kind;
    if (k === 'plankMend' || k === 'catch' || k === 'ko' || k === 'rescue' || k === 'dock' || k === 'machine' || k === 'potMend') return 'cheer';
    if (k === 'stuck' || k === 'potBreak' || k === 'creak') return 'shock';
  }
  if (H.st === H_WAIT) return 'worry';
  if (H.st === H_IDLE) return 'idle';
  return 'happy';
}

// ───────────────────────────── 장 끝 장면 ─────────────────────────────
const REV0 = 26, REVD = 22, NOTCH_T = 168, CH_END = 300, ABIL_T = NOTCH_T + 30, CH_END_AB = 420;
/** 장 끝에 생기는 능력 (복원한 마을이 주는 것) */
const ABIL = [
  { name: '풍차 바람', text: '되감기가 1.5배 빨라져요', sub: '모래도 덜 들고, 늦게 눌러도 돼요' },
  { name: '쌍둥이 시계', text: '두 물건을 함께 되감아요', sub: '올라가는 동안 화살도 — 한꺼번에!' },
];
/** 능력 그림: 0 빠른 되감기(겹화살표) · 1 쌍둥이 시계 */
function abilityIcon(ctx: C2, k: number, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.fillStyle = k === 0 ? '#3aa0d8' : '#8a5ad8';
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.stroke();
  if (k === 0) {
    ctx.fillStyle = '#ffffff';
    for (let q = 0; q < 2; q++) {
      const cx = x + (q - 0.3) * r * 0.5 - Math.sin(t * 0.2) * r * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.28, y - r * 0.36);
      ctx.lineTo(cx - r * 0.24, y);
      ctx.lineTo(cx + r * 0.28, y + r * 0.36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    for (let q = 0; q < 3; q++) (ctx.beginPath(), ctx.moveTo(x + r * 0.5, y + (q - 1) * r * 0.22), ctx.lineTo(x + r * 0.72, y + (q - 1) * r * 0.22), ctx.stroke());
  } else {
    for (let q = 0; q < 2; q++) {
      const cx = x + (q ? 0.28 : -0.28) * r, cy = y + (q ? 0.12 : -0.12) * r, cr = r * 0.42;
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx, cy, cr, cr);
      ctx.fill();
      ctx.strokeStyle = '#4a2a7a';
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.stroke();
      const a = -t * (q ? 0.09 : 0.12);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * cr * 0.7, cy + Math.sin(a) * cr * 0.7);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - cr * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}
const FIX_NAME = ['분수', '꽃 화단', '가로등', '풍차', '깃발 줄', '열기구', '물레방아', '나룻배', '새 떼', '무지개', '연', '물고기', '숫자판', '큰 톱니', '종', '뻐꾸기', '시계추', '시계 바늘'];
/** 전경: 먼 마을 그림(drawPanorama)을 VZ배로 당겨 위에, 광장·강을 아래에 (화면 너비 단위 좌표) */
const VZ = 1.25, VZX = 0.96, VY0 = 0.12;
const vX = (x: number) => 0.5 + (x - 0.5) * VZX, vY = (y: number) => VY0 + y * VZ;
const FIX_POS: [number, number][] = [
  [0.5, 0.93], [0.15, 0.9], [0.3, 0.8], [vX(0.14), vY(0.26)], [0.5, 0.76], [vX(0.8), vY(0.1)],
  [vX(0.9), vY(0.36)], [0.72, 1.12], [0.5, vY(0.14)], [vX(0.19), vY(0.1)], [vX(0.36), vY(0.12)], [0.3, 1.12],
  [vX(0.56), vY(0.17)], [vX(0.56), vY(0.17)], [vX(0.56), vY(0.09)], [vX(0.56), vY(0.12)], [vX(0.56), vY(0.28)], [vX(0.56), vY(0.17)],
];
/** 큰 시계 (바늘이 장마다 한 칸 = 두 시간: 6시 → 8 → 10 → 정각 12시) — 화면 너비 단위 */
const CLK = [0.2, 1.36];
const clockHour = (k: number) => 6 + 2 * k;
function drawChapterScene(ctx: C2, s: RewState, w: number, h: number) {
  const fx = juice(s), t = s.t, ch = s.chDone, pt = s.pt;
  let shown = ch * 6;
  for (let j = 0; j < 6; j++) if (pt >= REV0 + j * REVD) shown++;
  const PV: View = { X: (x) => vX(x) * w, Y: (y) => vY(y) * w, R: (r) => r * 1.12 * w, t, fixed: shown };
  const SVV: View = { X: (x) => x * w, Y: (y) => y * w, R: (r) => r * w, t, fixed: shown };
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, sz * w)}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = '#bfe6ff';
  ctx.fillRect(-10, -10, w + 20, h + 20);
  drawSky(ctx, PV, w, 0);
  drawPanorama(ctx, PV, w, 0);
  drawVistaFront(ctx, w, h, shown, t);
  // 꼬마 시계공: 되살아날 때마다 폴짝
  {
    const ag = Math.min(...[0, 1, 2, 3, 4, 5].map((j) => (pt >= REV0 + j * REVD ? pt - (REV0 + j * REVD) : 99)));
    const jump = ag < 16 ? Math.sin((ag / 16) * Math.PI) * w * 0.04 : 0;
    drawOwl(ctx, w * 0.36, w * 1.05 - jump, w * 0.011, ag < 30 || pt > NOTCH_T ? 'cheer' : 'happy', t, 0);
  }
  // 막 되살아난 것: 빛 기둥
  for (let j = 0; j < 6; j++) {
    const ag = pt - (REV0 + j * REVD);
    if (ag < 0 || ag > 30) continue;
    const [px, py] = FIX_POS[ch * 6 + j], a = 1 - ag / 30;
    ctx.fillStyle = rad(ctx, px * w, py * w, w * 0.12, [[0, `rgba(255,250,200,${0.7 * a})`], [1, 'rgba(255,250,200,0)']]);
    ctx.fillRect(px * w - w * 0.12, py * w - w * 0.12, w * 0.24, w * 0.24);
  }
  // 제목 띠
  const a0 = Math.min(1, pt / 10);
  ctx.globalAlpha = a0;
  ctx.fillStyle = 'rgba(255,250,240,.92)';
  rr(ctx, w * 0.08, w * 0.025, w * 0.84, w * 0.12, w * 0.03);
  ctx.fill();
  ctx.strokeStyle = '#ffb02e';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.056, 900);
  ctx.fillStyle = '#5a2e7a';
  ctx.fillText(ch >= 2 ? '시계탑 마을이 다 살아났어요!' : `${ch + 1}장 · ${CH_NAME[ch]} 끝!`, w / 2, w * 0.065, w * 0.8);
  font(0.032, 800);
  ctx.fillStyle = '#8a5a3a';
  ctx.fillText(`되살린 것 ${shown} / ${STAGE_COUNT}`, w / 2, w * 0.118, w * 0.8);
  ctx.globalAlpha = 1;
  // 아래 판: 큰 시계 + 다음 장
  const py0 = h - w * 0.27;
  ctx.fillStyle = lin(ctx, 0, py0, 0, h, [[0, '#7a5236'], [1, '#4a3020']]);
  ctx.fillRect(-10, py0, w + 20, h - py0 + 10);
  ctx.fillStyle = 'rgba(255,220,160,.25)';
  ctx.fillRect(-10, py0, w + 20, 3);
  const cx = CLK[0] * w, cy = h - w * 0.14, cr = w * 0.1;
  ctx.fillStyle = '#c89a5a';
  ell(ctx, cx, cy, cr * 1.14, cr * 1.14);
  ctx.fill();
  ctx.fillStyle = '#fffbe8';
  ell(ctx, cx, cy, cr, cr);
  ctx.fill();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU2 - Math.PI / 2, mark = k === 8 || k === 10 || k === 0, got = mark && clockHour(ch + (pt >= NOTCH_T ? 1 : 0)) >= (k || 12);
    ctx.fillStyle = mark ? (got ? '#ffc93a' : '#c8402a') : '#3a2a1a';
    const rr0 = cr * (mark ? 0.11 : 0.05);
    ell(ctx, cx + Math.cos(a) * cr * 0.8, cy + Math.sin(a) * cr * 0.8, rr0, rr0);
    ctx.fill();
  }
  // 바늘: 장을 깰 때마다 한 칸(두 시간) — 셋을 다 깨면 정각(12시)
  const q = pt < NOTCH_T ? 0 : Math.min(1, (pt - NOTCH_T) / 14), ease = q >= 1 ? 1 : 1 - (1 - q) ** 3 + Math.sin(q * Math.PI) * 0.25;
  const hr = clockHour(ch) + 2 * ease, ang = (hr / 12) * TAU2 - Math.PI / 2;
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = Math.max(3, cr * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * cr * 0.7, cy + Math.sin(ang) * cr * 0.7);
  ctx.stroke();
  ctx.lineCap = 'butt';
  brass(ctx, cx, cy, cr * 0.14, 8, t * 0.02);
  // 다음 장 실루엣 (장 끝) / 끝 축하 (마지막)
  const na = Math.max(0, Math.min(1, (pt - NOTCH_T - 6) / 14));
  const bx = w * 0.36, bw = w * 0.6, by = py0 + w * 0.025, bh = w * 0.2;
  ctx.globalAlpha = 0.7 + 0.3 * na;
  ctx.fillStyle = 'rgba(255,248,236,.96)';
  rr(ctx, bx, by, bw, bh, w * 0.03);
  ctx.fill();
  ctx.textAlign = 'left';
  if (ch < 2) {
    font(0.03, 800);
    ctx.fillStyle = '#8a6a5a';
    ctx.fillText('다음 장', bx + w * 0.03, by + w * 0.035);
    font(0.046, 900);
    ctx.fillStyle = '#5a2e7a';
    ctx.fillText(`${ch + 2}장 · ${CH_NAME[ch + 1]}`, bx + w * 0.03, by + w * 0.08, bw - w * 0.06);
    font(0.028, 800);
    ctx.fillStyle = '#8a5a3a';
    ctx.fillText(CH_SUB[ch + 1], bx + w * 0.03, by + w * 0.12, bw - w * 0.06);
    // 다음 장에 되살릴 것들의 실루엣 (바늘이 움직이면 하나씩 떠오른다)
    for (let k = 0; k < 3; k++) {
      const ix = bx + w * (0.09 + k * 0.2), iy = by + w * 0.16 - Math.max(0, 1 - Math.max(0, pt - NOTCH_T - 8 - k * 6) / 10) * w * 0.02 * na, ik = (ch + 1) * 6 + (ch === 0 ? [0, 3, 5] : [1, 2, 4])[k];
      ctx.fillStyle = 'rgba(90,60,90,.12)';
      ell(ctx, ix, iy, w * 0.04, w * 0.04);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha *= 0.4 + 0.5 * na;
      tinted(ctx, (o) => fixIcon(o, ik, ix, iy, w * 0.032, t, false), '#3a2a4a', 1, [ix - w * 0.05, iy - w * 0.05, ix + w * 0.05, iy + w * 0.05]);
      ctx.restore();
    }
  } else {
    font(0.05, 900);
    ctx.fillStyle = '#c8402a';
    ctx.fillText('시계탑이 다시 째깍째깍!', bx + w * 0.03, by + w * 0.07, bw - w * 0.06);
    font(0.03, 800);
    ctx.fillStyle = '#6a4a3a';
    ctx.fillText(`모은 별 ${s.stars}개 · 점수 ${Math.round(s.pts)}`, bx + w * 0.03, by + w * 0.125, bw - w * 0.06);
    if (t % 16 === 0) for (const c of ['#ff5a7a', '#ffd25a', '#7fe8ff']) fx.burst(w * (0.15 + hsh(t) * 0.7), w * (0.2 + hsh(t + 1) * 0.3), c, 10, 4, 2.4);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  // 새 능력: 되살린 마을이 주는 힘 — 크게
  if (ch < 2 && pt >= ABIL_T) {
    const ag = pt - ABIL_T, q = Math.min(1, ag / 12), pop = ag < 12 ? 0.6 + 0.4 * (1 - (1 - q) ** 3) + Math.sin(q * Math.PI) * 0.12 : 1;
    const ab = ABIL[ch], cx = w / 2, cy = w * 0.62, cw = w * 0.84, chh = w * 0.34;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    ctx.globalAlpha = q;
    ctx.fillStyle = 'rgba(40,20,60,.35)';
    rr(ctx, -cw / 2 + 4, -chh / 2 + 6, cw, chh, w * 0.04);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -chh / 2, 0, chh / 2, [[0, '#fffaf0'], [1, '#ffe8c8']]);
    rr(ctx, -cw / 2, -chh / 2, cw, chh, w * 0.04);
    ctx.fill();
    ctx.strokeStyle = '#ffb02e';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#ff5a4a';
    rr(ctx, -w * 0.16, -chh / 2 - w * 0.03, w * 0.32, w * 0.06, w * 0.03);
    ctx.fill();
    font(0.04, 900);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('새 능력!', 0, -chh / 2 + 1);
    abilityIcon(ctx, ch, -cw / 2 + w * 0.15, w * 0.02, w * 0.085, t);
    ctx.textAlign = 'left';
    font(0.046, 900);
    ctx.fillStyle = '#5a2e7a';
    ctx.fillText(ab.name, -cw / 2 + w * 0.27, -w * 0.06, cw - w * 0.3);
    font(0.04, 900);
    ctx.fillStyle = '#c8402a';
    ctx.fillText(ab.text, -cw / 2 + w * 0.27, w * 0.0, cw - w * 0.3);
    font(0.03, 800);
    ctx.fillStyle = '#7a5a4a';
    ctx.fillText(ab.sub, -cw / 2 + w * 0.27, w * 0.055, cw - w * 0.3);
    ctx.restore();
    ctx.textAlign = 'center';
  }
  if (pt > 60) {
    font(0.024, 700);
    ctx.fillStyle = 'rgba(255,240,220,.8)';
    ctx.fillText('톡 하면 넘어가요', w * 0.66, h - w * 0.012);
  }
  ctx.restore();
  doEvents(ctx, s, SVV, w, w * 0.16 + 30, h - w * 0.28);
}
/** 장 끝 전경의 광장·강 (화면 너비 단위 좌표) */
function drawVistaFront(ctx: C2, w: number, h: number, fixed: number, t: number) {
  const X = (x: number) => x * w, R = (r: number) => r * w;
  // 광장 바닥
  ctx.fillStyle = lin(ctx, 0, R(0.74), 0, R(1.06), [[0, '#ead8b8'], [1, '#d8c09a']]);
  ctx.fillRect(-10, R(0.74), w + 20, R(0.33));
  ctx.strokeStyle = 'rgba(150,110,70,.18)';
  ctx.lineWidth = 1;
  for (let r = 0; r < 5; r++) {
    ctx.beginPath();
    ctx.moveTo(0, R(0.8 + r * 0.06));
    ctx.lineTo(w, R(0.8 + r * 0.06));
    ctx.stroke();
  }
  // 강
  ctx.fillStyle = lin(ctx, 0, R(1.06), 0, R(1.24), [[0, '#6ac4ee'], [1, '#3a8ed0']]);
  ctx.fillRect(-10, R(1.06), w + 20, h);
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) {
    const wx = ((k * 0.19 + t * 0.001) % 1.1) * w - R(0.05), wy = R(1.1 + (k % 3) * 0.04);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + R(0.03), wy - R(0.012), wx + R(0.06), wy);
    ctx.stroke();
  }
  // 깃발 줄 (5)
  ctx.strokeStyle = 'rgba(90,60,40,.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X(0.02), R(0.73));
  ctx.quadraticCurveTo(X(0.5), R(0.8), X(0.98), R(0.73));
  ctx.stroke();
  for (let q = 0; q < 12; q++) {
    const u = (q + 0.5) / 12, fx2 = X(0.02 + 0.96 * u), fy = R(0.73) + (1 - (2 * u - 1) ** 2) * R(0.035);
    if (fixed < 5 && q % 3 !== 0) continue;
    ctx.fillStyle = fixed >= 5 ? ['#ff5a5a', '#ffcf3a', '#5ab8ff', '#7ad86a'][q % 4] : '#a89a8a';
    ctx.beginPath();
    ctx.moveTo(fx2 - R(0.016), fy);
    ctx.lineTo(fx2 + R(0.016), fy);
    ctx.lineTo(fx2 + (fixed >= 5 ? Math.sin(t * 0.08 + q) * R(0.006) : 0), fy + R(fixed >= 5 ? 0.04 : 0.03));
    ctx.closePath();
    ctx.fill();
  }
  // 가로등 (3)
  for (const lx of [0.3, 0.7]) {
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(X(lx) - R(0.006), R(0.8), R(0.012), R(0.17));
    if (fixed >= 3) {
      ctx.fillStyle = rad(ctx, X(lx), R(0.79), R(0.07), [[0, 'rgba(255,240,150,.7)'], [1, 'rgba(255,240,150,0)']]);
      ctx.fillRect(X(lx) - R(0.07), R(0.72), R(0.14), R(0.14));
    }
    ctx.fillStyle = fixed >= 3 ? '#fff2a0' : '#8a8a8a';
    rr(ctx, X(lx) - R(0.018), R(0.77), R(0.036), R(0.034), R(0.008));
    ctx.fill();
  }
  // 꽃 화단 (2)
  for (const fx2 of [0.15, 0.85]) {
    ctx.fillStyle = '#9a5a2a';
    ctx.fillRect(X(fx2) - R(0.09), R(0.92), R(0.18), R(0.05));
    for (let q = 0; q < 5; q++) {
      const qx = X(fx2 - 0.07 + q * 0.035);
      if (fixed >= 2) {
        ctx.fillStyle = '#4a9a3a';
        ctx.fillRect(qx - 1, R(0.89), 2, R(0.03));
        ctx.fillStyle = ['#ff5a7a', '#ffcf3a', '#ff8ad0', '#ffffff', '#a87aff'][q];
        ell(ctx, qx, R(0.885) - Math.sin(t * 0.05 + q) * 1.5, R(0.014), R(0.014));
        ctx.fill();
      } else {
        ctx.strokeStyle = '#8a6a3a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(qx, R(0.92));
        ctx.quadraticCurveTo(qx + R(0.01), R(0.9), qx + R(0.018), R(0.91));
        ctx.stroke();
      }
    }
  }
  // 분수 (1)
  ctx.fillStyle = '#c8c0b8';
  ell(ctx, X(0.5), R(0.99), R(0.14), R(0.035));
  ctx.fill();
  ctx.fillStyle = fixed >= 1 ? '#6ad0f5' : '#a8a098';
  ell(ctx, X(0.5), R(0.985), R(0.12), R(0.025));
  ctx.fill();
  ctx.fillStyle = '#b8b0a8';
  ctx.fillRect(X(0.5) - R(0.012), R(0.92), R(0.024), R(0.065));
  if (fixed >= 1) {
    ctx.strokeStyle = 'rgba(150,220,255,.9)';
    ctx.lineWidth = Math.max(2, R(0.006));
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(0.5), R(0.92));
      ctx.quadraticCurveTo(X(0.5 + sd * 0.05), R(0.86 - Math.sin(t * 0.1) * 0.005), X(0.5 + sd * 0.1), R(0.98));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,240,255,.9)';
    for (let k = 0; k < 5; k++) (ell(ctx, X(0.5) + (k - 2) * R(0.012), R(0.9) - ((t * 0.6 + k * 7) % 20) * 0.6, R(0.006), R(0.006)), ctx.fill());
  }
  // 나룻배 (8)
  if (fixed >= 8) {
    const bx = X(0.72) + Math.sin(t * 0.02) * R(0.02), by = R(1.13) + Math.sin(t * 0.06) * 2;
    ctx.fillStyle = '#b8743a';
    ctx.beginPath();
    ctx.moveTo(bx - R(0.08), by - R(0.015));
    ctx.lineTo(bx + R(0.08), by - R(0.015));
    ctx.lineTo(bx + R(0.055), by + R(0.02));
    ctx.lineTo(bx - R(0.055), by + R(0.02));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(bx, by - R(0.015));
    ctx.lineTo(bx, by - R(0.09));
    ctx.lineTo(bx + R(0.05), by - R(0.025));
    ctx.closePath();
    ctx.fill();
  }
  // 물고기 (12)
  if (fixed >= 12)
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.015 + k * 0.33) % 1;
      if (ph > 0.5) continue;
      const jx = X(0.2 + k * 0.1), jy = R(1.12) - Math.sin(ph * 2 * Math.PI * 0.5) * R(0.07);
      ctx.fillStyle = '#ff9a3a';
      ell(ctx, jx + ph * R(0.06), jy, R(0.016), R(0.008), -1 + ph * 4);
      ctx.fill();
    }
}
function drawAll(ctx: C2, s: RewState, w: number, h: number, th: Theme) {
  lastDrawn = s;
  hookKeys(ctx.canvas as HTMLCanvasElement | undefined);
  if (!s.film || s.phase !== 'play') return drawScene(ctx, s, w, h, th);
  // 필름: 미리 돌려 둔 세계 한 장을 잠깐 빌려 그린다
  const real = s.W, f = s.film, n = f.frames.length;
  const fi = s.ft < FILM_FWD ? Math.min(n - 1, Math.floor((s.ft / FILM_FWD) * n)) : Math.max(0, n - 1 - Math.floor(((s.ft - FILM_FWD) / FILM_REW) * n));
  s.W = f.frames[fi];
  try {
    drawScene(ctx, s, w, h, th);
  } finally {
    s.W = real;
  }
}
function drawScene(ctx: C2, s: RewState, w: number, h: number, _th: Theme) {
  if (s.phase === 'chapter') return drawChapterScene(ctx, s, w, h);
  const fx = juice(s), t = s.t, L = s.L, W = s.W, H = W.hero, c = s.cam;
  // 세계(카메라로 당겨 봄) · 화면(띠·글자) · 먼 배경(조금만 따라 움직이고 흐리게)
  const X = (x: number) => (x - c.x) * c.z * w, Y = (y: number) => (TOPH + (y - c.y) * c.z) * w, R = (r: number) => r * c.z * w;
  const v: View = { X, Y, R, t, fixed: s.fixed };
  const SV: View = { X: (x) => x * w, Y: (y) => (TOPH + y) * w, R: (r) => r * w, t, fixed: s.fixed };
  const BV: View = { X: (x) => (x - c.x * 0.35) * w * 1.08, Y: (y) => (TOPH + y * 0.8 - 0.015) * w, R: (r) => r * w, t, fixed: s.fixed };
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, sz * w)}px system-ui, sans-serif`);
  ctx.fillStyle = L.ch === 2 ? '#e8cca8' : '#bfe6ff';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  // ═════════ 먼 배경 (흐리게) ═════════
  if (L.ch === 2) {
    drawTower(ctx, BV, L, w);
    ctx.fillStyle = 'rgba(255,240,220,.28)';
    ctx.fillRect(-10, -10, w + 20, h);
  } else {
    drawSky(ctx, BV, w, L.ch);
    softLayer(ctx, w, h, (o) => drawPanorama(o, BV, w, L.ch));
    ctx.fillStyle = 'rgba(235,246,255,.3)';
    ctx.fillRect(-10, -10, w + 20, BV.Y(0.5) + 10);
  }
  // ═════════ 무대 (당겨 본 세계) ═════════
  if (L.ch !== 2) {
    if (L.ch === 1) drawMeadow(ctx, v, w);
    else {
      ctx.fillStyle = '#e8d4b8';
      ctx.fillRect(-10, Y(0.48), w + 20, Y(0.8) - Y(0.48));
    }
    drawHouses(ctx, v, L, s);
    // 술통 골목: 뒤로 올라가는 비탈 + 수레
    if (L.deco.alley !== undefined) {
      const ax = L.deco.alley, top = L.deco.top;
      // 골목 안쪽: 멀리 보이는 작은 집들
      ctx.fillStyle = '#f0d8c0';
      ctx.fillRect(X(ax - 0.07), Y(0.36), R(0.14), Y(0.79) - Y(0.36));
      for (const sd of [-1, 1]) {
        const hx = X(ax + sd * 0.05);
        ctx.fillStyle = sd < 0 ? '#ffd0b0' : '#d8e8ff';
        ctx.fillRect(hx - R(0.035), Y(0.4), R(0.07), Y(0.79) - Y(0.4));
        ctx.fillStyle = sd < 0 ? '#e2685a' : '#4a8ad0';
        ctx.beginPath();
        ctx.moveTo(hx - R(0.045), Y(0.4));
        ctx.lineTo(hx, Y(0.36));
        ctx.lineTo(hx + R(0.045), Y(0.4));
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7aa0d0';
        for (let q = 0; q < 3; q++) ctx.fillRect(hx - R(0.012), Y(0.43 + q * 0.11), R(0.024), R(0.04));
      }
      ctx.fillStyle = 'rgba(90,60,40,.18)';
      ctx.fillRect(X(ax - 0.07), Y(0.36), R(0.14), Y(0.79) - Y(0.36));
      ctx.fillStyle = '#d8c4a4';
      ctx.beginPath();
      ctx.moveTo(X(ax - 0.06), Y(0.79));
      ctx.lineTo(X(ax - 0.035), Y(top));
      ctx.lineTo(X(ax + 0.035), Y(top));
      ctx.lineTo(X(ax + 0.06), Y(0.79));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,110,70,.3)';
      for (let q = 0; q < 8; q++) {
        const yy = Y(top + ((0.79 - top) * q) / 8);
        ctx.beginPath();
        ctx.moveTo(X(ax - 0.04), yy);
        ctx.lineTo(X(ax + 0.04), yy);
        ctx.stroke();
      }
      // 수레
      const cx = X(ax + 0.01), cy = Y(top);
      ctx.fillStyle = '#9a5a2a';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.25);
      rr(ctx, -R(0.06), -R(0.04), R(0.1), R(0.035), R(0.006));
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#5a3418';
      ell(ctx, cx - R(0.04), cy + R(0.005), R(0.014), R(0.014));
      ctx.fill();
    }
  }
  // 가로등 + 매단 꽃바구니 (연쇄 판)
  if (L.deco.post !== undefined) {
    const px = L.deco.post, sx = X(px + 0.06), hb = W.th.find((q) => q.k === 'pot' && q.cause >= 0);
    ctx.fillStyle = lin(ctx, sx - R(0.008), 0, sx + R(0.008), 0, [[0, '#5a5a6a'], [1, '#3a3a4a']]);
    rr(ctx, sx - R(0.007), Y(0.5), R(0.014), Y(L.heroY) - Y(0.5), R(0.004));
    ctx.fill();
    ctx.fillStyle = '#3a3a4a';
    rr(ctx, sx - R(0.016), Y(L.heroY) - R(0.012), R(0.032), R(0.014), R(0.004));
    ctx.fill();
    // 팔 · 등
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = Math.max(2, R(0.007));
    ctx.beginPath();
    ctx.moveTo(sx, Y(0.52));
    ctx.quadraticCurveTo(X(px + 0.03), Y(0.5), X(px), Y(0.52));
    ctx.stroke();
    ctx.fillStyle = s.fixed >= 3 ? '#fff2a0' : '#d8d0c0';
    rr(ctx, sx - R(0.014), Y(0.47), R(0.028), R(0.03), R(0.006));
    ctx.fill();
    // 줄 (바구니가 걸려 있는 동안)
    if (hb && hb.tau <= potTT(hb) + 1) {
      pose(hb, hb.tau);
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(px), Y(0.52));
      ctx.lineTo(X(P.x), Y(P.y - 0.015));
      ctx.stroke();
    }
  }
  if (L.ch !== 2) {
    drawGround(ctx, v, L, w);
    if (L.ch === 0) drawFountain(ctx, v, 0.12, 1.1);
  } else (drawTowerNear(ctx, v, L, w), drawFloors(ctx, v, L));
  drawFront(ctx, v, L, W);
  // 지붕 위 도깨비 자리(망루)
  for (const a of W.ac)
    if (a.role === R_ARCH && L.ch !== 2) {
      ctx.fillStyle = '#9a6a4a';
      rr(ctx, X(a.x - 0.06), Y(a.y), R(0.12), R(0.018), R(0.004));
      ctx.fill();
    }
  // 기계 · 도개교 (톱니 판)
  const mach = W.ac.find((a) => a.k === 'machine');
  if (mach) {
    const mx = X(mach.x), my = Y(mach.y), on = W.mach >= 0;
    ctx.fillStyle = lin(ctx, mx - R(0.07), 0, mx + R(0.07), 0, [[0, '#8a6a5a'], [1, '#5a4038']]);
    rr(ctx, mx - R(0.07), my - R(0.1), R(0.14), R(0.13), R(0.016));
    ctx.fill();
    ctx.fillStyle = '#3a2a24';
    ell(ctx, mx, my + R(0.04), R(0.056), R(0.056));
    ctx.fill();
    if (on) brass(ctx, mx, my + R(0.04), R(0.05), 10, t * 0.06, 0.6);
    else {
      ctx.strokeStyle = 'rgba(255,220,120,.6)';
      ctx.setLineDash([4, 4]);
      ell(ctx, mx, my + R(0.04), R(0.05), R(0.05));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    brass(ctx, mx - R(0.045), my - R(0.06), R(0.025), 8, on ? -t * 0.1 : 0);
    brass(ctx, mx + R(0.04), my - R(0.065), R(0.02), 8, on ? t * 0.12 : 0);
    ctx.fillStyle = on ? '#7aff8a' : '#ff6a5a';
    ell(ctx, mx, my - R(0.088), R(0.008), R(0.008));
    ctx.fill();
  }
  if (L.gate) {
    const [g0, g1, gy] = L.gate;
    // 구덩이
    ctx.fillStyle = 'rgba(50,30,20,.7)';
    ctx.fillRect(X(g0), Y(gy), X(g1) - X(g0), Y(1.21) - Y(gy));
    const q = W.mach >= 0 ? cl01((W.t - W.mach) / 56) : 0;
    const ang = (1 - q) * 1.35;
    ctx.save();
    ctx.translate(X(g1), Y(gy));
    ctx.rotate(ang);
    ctx.fillStyle = lin(ctx, 0, -R(0.03), 0, 0, [[0, '#d89a5e'], [1, '#8a5228']]);
    rr(ctx, -(X(g1) - X(g0)), -R(0.03), X(g1) - X(g0), R(0.03), R(0.006));
    ctx.fill();
    ctx.strokeStyle = '#5a3418';
    ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) (ctx.beginPath(), ctx.moveTo(-(X(g1) - X(g0)) * (k / 6), -R(0.03)), ctx.lineTo(-(X(g1) - X(g0)) * (k / 6), 0), ctx.stroke());
    ctx.restore();
    // 사슬
    ctx.strokeStyle = '#7a7a8a';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(X(g1), Y(gy - 0.32));
    ctx.lineTo(X(g1) - Math.cos(ang) * (X(g1) - X(g0)), Y(gy) - Math.sin(ang) * (X(g1) - X(g0)));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 목표
  drawPart(ctx, v, L.gearX, L.gearY, H.st === H_WIN);
  // 말뚝 (걸림 자리): 되감는 통나무·뗏목이 걸 수 있는 동안 빛나며 '지금 톡!'
  for (const th of W.th) {
    if (th.dock < 0 || !L.canal) continue;
    const can = th.st === REW && canDock(th);
    for (const bx of [L.canal[0] - 0.012, L.canal[1] + 0.012]) {
      const px = X(bx), py = Y(LY + 0.01);
      if (can) {
        ctx.fillStyle = `rgba(140,255,160,${0.35 + Math.sin(t * 0.5) * 0.15})`;
        ell(ctx, px, py - R(0.03), R(0.03), R(0.045));
        ctx.fill();
      }
      ctx.fillStyle = lin(ctx, px - R(0.01), 0, px + R(0.01), 0, [[0, can ? '#9af0a0' : '#a8703a'], [1, can ? '#4ac060' : '#6a4020']]);
      rr(ctx, px - R(0.009), py - R(0.06), R(0.018), R(0.07), R(0.006));
      ctx.fill();
      ctx.fillStyle = can ? '#d8ffd8' : '#c8904e';
      ell(ctx, px, py - R(0.06), R(0.009), R(0.005));
      ctx.fill();
    }
  }
  // ═════════ 물건 ═════════
  for (const th of W.th) {
    if (th.st === DONE && th.k !== 'water') continue;
    // 지나온 길 (되감을 수 있는 것)
    if (th.st !== WAIT && th.tau > 0) drawTrail(ctx, v, th, th.st === REW ? 'rgba(127,232,255,.8)' : 'rgba(255,255,255,.4)');
    drawFuture(ctx, v, th);
  }
  // 집 주인·배우(뒤쪽: 발코니·지붕·수레·물탱크)
  for (const a of W.ac) if (a.y < 0.7 && a.role !== R_RIDER && a.k !== 'machine') drawActor(ctx, v, s, a);
  // 저울 · 불 (지금 시간으로 움직이는 것)
  if (L.scale) drawScale(ctx, v, L, W);
  if (L.fire && W.fire) drawFire(ctx, v, L.fire, t);
  for (const th of W.th) {
    if (th.st === DONE && th.k !== 'water') continue;
    if ((th.st === REW || th.st === CHN) && th.k !== 'water') {
      // 되감기: 지나온 길이 필름처럼 잔상 4장으로 남고, 물건은 그 길을 따라 거꾸로 빨려 든다 (시간 빛 = 푸른색, 연쇄로 끌려가는 것은 금빛)
      drawRewindPath(ctx, v, th, t);
      if (th.k !== 'bridge')
        tinted(ctx, (o) => {
          for (let k = 4; k >= 1; k--) {
            o.globalAlpha = 0.16 + 0.1 * (4 - k);
            drawThingAt(o, v, th, Math.min(th.dur, th.tau + k * 7), 1);
          }
          o.globalAlpha = 1;
        }, th.st === CHN ? '#ffd86a' : '#6fdcff', 0.75, thingBox(v, th, th.tau, th.tau + 28));
    }
    drawThingAt(ctx, v, th, th.tau);
    if ((th.st === REW || th.st === CHN) && th.k !== 'water') tinted(ctx, (o) => drawThingAt(o, v, th, th.tau), th.st === CHN ? '#ffe08a' : '#7fe8ff', 0.42, thingBox(v, th, th.tau, th.tau));
    // 되감을 수 있는 물건: 작은 시계 (자기 시간이 앞으로 가는 중)
    if (th.st !== REW && th.st !== WAIT && th.tau > 0 && !(th.k === 'arrow' && th.tau >= th.n && th.st === HOLD)) {
      const c = thingCenter(th);
      clockBadge(ctx, X(c.x + Math.min(0.08, c.r * 0.6)), Y(c.y - Math.min(0.08, c.r * 0.6)), R(0.019), th.tau, th.st === HOLD);
    }
    // 쉬는 중 고리 (곧 다시 움직인다)
    if (th.st === HOLD && th.k !== 'arrow') {
      pose(th, th.tau);
      const cx = th.k === 'bridge' ? X((th.x + th.x2) / 2) : X(P.x), cy = th.k === 'bridge' ? Y(th.y - 0.1) : Y(P.y - 0.08);
      const max = th.tau === 0 ? th.hf : th.hs, q = Math.min(1, th.hold / max);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, R(0.022), -Math.PI / 2, -Math.PI / 2 + TAU2 * q);
      ctx.stroke();
      hourglass(ctx, cx, cy, R(0.011), q, 0);
    }
  }
  drawGoalPath(ctx, s, v);
  // ═════════ 배우 (길 위) ═════════
  for (const a of W.ac) if ((a.y >= 0.7 || a.role === R_RIDER) && a.k !== 'machine') drawActor(ctx, v, s, a);
  // 주인공
  {
    const u = R(0.0128), mood = heroMood(s), walk = H.st === H_WALK ? 1 : 0;
    const fail = H.st === H_FAIL;
    let hx = X(H.x), hy = Y(H.y), tilt = 0;
    if (H.st === H_FALL) tilt = Math.sin(t * 0.6) * 0.4;
    if (fail && mood === 'dizzy') tilt = -0.25;
    if (fail && mood === 'wet') hy = Y(Math.min(H.fallY, H.y)) + Math.sin(t * 0.1) * 2;
    shadow(ctx, hx, Y(H.y), R(0.035), fail && mood === 'wet' ? 0 : 0.22);
    if (fail && mood === 'wet') {
      // 물에 빠져 튜브 타고 둥실
      ctx.fillStyle = '#ff5a5a';
      ell(ctx, hx, hy - R(0.01), R(0.045), R(0.016));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const sd of [-1, 1]) (ell(ctx, hx + sd * R(0.03), hy - R(0.01), R(0.01), R(0.012)), ctx.fill());
    }
    drawOwl(ctx, hx, hy - (fail && mood === 'wet' ? R(0.01) : 0), u, mood, t, walk, tilt);
    if (H.st === H_WAIT && t % 90 < 50) {
      ctx.fillStyle = '#ffffff';
      rr(ctx, hx - R(0.02), hy - R(0.165), R(0.04), R(0.034), R(0.012));
      ctx.fill();
      font(0.028, 900);
      ctx.fillStyle = '#ff5a4a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', hx, hy - R(0.147));
    }
    hx += 0;
  }
  // ═════════ 되감기 빛 (시계 문양) — 둘을 함께 되감으면 둘 다 ═════════
  for (const rewTh of W.th) {
    if (rewTh.st !== REW) continue;
    const tc = thingCenter(rewTh), age = t - (fx.memo['rw' + rewTh.id] ?? t);
    const big = age < 16 ? 1.5 - age / 32 : 1;
    clockGlyph(ctx, X(tc.x), Y(tc.y), R(tc.r) * big, t, age < 16 ? 0.9 - age * 0.025 : 0.5);
    // 모래가 물건으로 흘러간다
    ctx.fillStyle = '#ffd25a';
    for (let k = 0; k < 6; k++) {
      const q = ((t * 0.035 + k / 6) % 1), sx = SV.X(0.055), sy = SV.Y(BOTY + 0.045);
      const px = sx + (X(tc.x) - sx) * q, py = sy + (Y(tc.y) - sy) * q - Math.sin(q * Math.PI) * R(0.12);
      ell(ctx, px, py, R(0.005), R(0.005));
      ctx.fill();
    }
  }
  // 두 개 함께 되감는 동안: 둘 사이에 보랏빛 시계 줄
  {
    const rs = W.th.filter((q) => q.st === REW);
    if (rs.length >= 2) {
      const a = thingCenter(rs[0]), b = thingCenter(rs[1]);
      ctx.save();
      ctx.strokeStyle = 'rgba(200,168,255,.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      ctx.moveTo(X(a.x), Y(a.y));
      ctx.quadraticCurveTo((X(a.x) + X(b.x)) / 2, Math.min(Y(a.y), Y(b.y)) - R(0.08), X(b.x), Y(b.y));
      ctx.stroke();
      ctx.restore();
    }
  }
  // 말뚝에 걸 수 있는 동안: '지금 다시 톡!' (되감기 빛 위에)
  for (const th of W.th) {
    // 글자 안내는 말뚝을 처음 배우는 판만 (그 뒤로는 말뚝이 빛나는 것만 — 답은 전구에)
    if (th.dock < 0 || !L.canal || th.st !== REW || !canDock(th) || L.key !== 'log') continue;
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lx = X((L.canal[0] + L.canal[1]) / 2), ly = Y(LY + 0.14) + Math.sin(t * 0.4) * 2, tw = ctx.measureText('지금 다시 톡!').width + R(0.05);
    ctx.fillStyle = '#2aa84a';
    rr(ctx, lx - tw / 2, ly - R(0.028), tw, R(0.056), R(0.028));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('지금 다시 톡!', lx, ly + 1);
  }
  // ═════════ 손가락 안내 ═════════
  drawGuide(ctx, s, v, font, SV);
  if (s.hint && !s.film) drawHint(ctx, s, v, font, SV);
  // ═════════ 사건 → 연출 · 소리 ═════════
  doEvents(ctx, s, v, w, SV.Y(0) + 30, SV.Y(BOTY) - 8);
  ctx.restore();
  if (s.film) drawFilm(ctx, s, w, v, font, SV);
  drawHud(ctx, s, w, h, SV, font, v);
}
/** 필름 덧칠: 빛바랜 색 · 필름 구멍 · '곧 벌어질 일' / 되감을 땐 VHS 줄무늬 · 큰일 자리에 빨간 표시 */
function drawFilm(ctx: C2, s: RewState, w: number, v: View, font: (sz: number, w?: number) => void, SV: View) {
  const f = s.film!, ft = s.ft, rew = ft >= FILM_FWD, t = s.t;
  const y0 = SV.Y(0), y1 = SV.Y(BOTY), fw = s.W.t;
  ctx.save();
  // 빛바랜 필름 색 · 가장자리 어둡게
  ctx.fillStyle = rew ? 'rgba(120,220,255,.16)' : 'rgba(255,196,120,.2)';
  ctx.fillRect(0, y0, w, y1 - y0);
  // 위·아래 가장자리만 살짝 어둡게 (화면 전체 둥근 그라데이션은 느린 폰에서 무겁다)
  ctx.fillStyle = 'rgba(60,30,20,.22)';
  ctx.fillRect(0, y0, w, w * 0.025);
  ctx.fillRect(0, y1 - w * 0.025, w, w * 0.025);
  // 필름 띠 (양옆 구멍이 흐른다: 앞으로는 천천히 위로, 되감을 땐 빠르게 아래로)
  const bw = w * 0.045, gap = w * 0.075, off = (rew ? (ft - FILM_FWD) * w * 0.05 : -ft * w * 0.012) % gap;
  for (const x0 of [0, w - bw]) {
    ctx.fillStyle = 'rgba(28,18,22,.88)';
    ctx.fillRect(x0, y0, bw, y1 - y0);
    ctx.fillStyle = 'rgba(255,240,220,.85)';
    for (let yy = y0 + off - gap; yy < y1; yy += gap) if (yy > y0 - w * 0.03) rr(ctx, x0 + bw * 0.28, Math.max(y0, yy), bw * 0.44, Math.min(w * 0.03, y1 - Math.max(y0, yy)), w * 0.006), ctx.fill();
  }
  // 긁힌 자국
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 2; k++) {
    const sx = bw + hsh(Math.floor(t / 3) + k * 7) * (w - 2 * bw);
    ctx.beginPath();
    ctx.moveTo(sx, y0);
    ctx.lineTo(sx + 2, y1);
    ctx.stroke();
  }
  // 되감기: VHS 줄무늬
  if (rew) {
    for (let k = 0; k < 5; k++) {
      const yy = y0 + ((hsh(t * 0.37 + k * 3.1) + k * 0.2) % 1) * (y1 - y0), hh = w * (0.01 + hsh(t + k) * 0.03);
      ctx.fillStyle = k % 2 ? 'rgba(255,90,200,.16)' : 'rgba(120,240,255,.22)';
      ctx.fillRect(0, yy, w, hh);
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.fillRect(0, yy + hh * 0.4, w, 1.5);
    }
  }
  // 큰일 자리: 빨간 고리·X (필름 시간이 그 자리를 지나면)
  for (const m of f.marks) {
    if (fw < m.t) continue;
    const a = rew ? Math.max(0, 1 - (ft - FILM_FWD) / (FILM_REW * 0.7)) : 1, pul = 1 + Math.sin(t * 0.3) * 0.1;
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    const x = v.X(m.x), y = v.Y(m.y), r = v.R(m.r) * pul;
    ctx.strokeStyle = '#ff3a3a';
    ctx.lineWidth = 3.5;
    ell(ctx, x, y, r, r);
    ctx.stroke();
    if (m.hero) {
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      const q = r * 0.55;
      ctx.beginPath();
      ctx.moveTo(x - q, y - q);
      ctx.lineTo(x + q, y + q);
      ctx.moveTo(x + q, y - q);
      ctx.lineTo(x - q, y + q);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.globalAlpha = 1;
  }
  // 위: 무엇을 보고 있나
  const lab = rew ? '되감는 중… 지금으로!' : f.why && fw >= (f.marks[0]?.t ?? 1e9) ? `이대로 두면 — ${f.why}` : '곧 벌어질 일';
  font(0.04, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(lab).width + w * 0.13, ly = y0 + w * 0.06;
  ctx.fillStyle = rew ? 'rgba(20,60,90,.85)' : 'rgba(60,20,20,.82)';
  rr(ctx, w / 2 - tw / 2, ly - w * 0.032, tw, w * 0.064, w * 0.032);
  ctx.fill();
  // 빨리 감기 ▶▶ / 되감기 ◀◀ (그림)
  const ix = w / 2 - tw / 2 + w * 0.05, dir = rew ? -1 : 1;
  ctx.fillStyle = rew ? '#7fe8ff' : '#ffd25a';
  for (let k = 0; k < 2; k++) {
    const cx = ix + (k - 0.5) * w * 0.022 * dir;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.012 * dir, ly - w * 0.014);
    ctx.lineTo(cx + w * 0.012 * dir, ly);
    ctx.lineTo(cx - w * 0.012 * dir, ly + w * 0.014);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(lab, w / 2 + w * 0.03, ly + 1);
  // 아래: 건너뛰기
  if (ft > 20) {
    font(0.03, 800);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText('톡 하면 바로 시작', w / 2, y1 - w * 0.03);
  }
  ctx.restore();
}
/** 막힘 힌트: 손가락이 그 물건을 누르고(때가 오면 '지금!'), 그때 물건이 있을 자리를 반투명으로, 한 줄 말 */
function drawHint(ctx: C2, s: RewState, v: View, font: (sz: number, w?: number) => void, SV: View) {
  const h = s.hint!, W = s.W, { X, Y, R, t } = v;
  const age = t - h.t, a = Math.min(1, age / 8, h.done >= 0 ? 1 - (t - h.done) / 60 : 1);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const th = h.id >= 0 ? thingOf(W, h.id) : undefined;
  const arch = !th && h.arch >= 0 ? actorOf(W, h.arch) : undefined;
  if (!h.restart && !h.none && h.done < 0 && (th || arch)) {
    const c = th ? thingCenter(th) : { x: arch!.x, y: arch!.y - 0.06, r: 0.06 };
    const waitStop = h.stop >= 0 && th && th.st === REW && th.tau > h.stop + 5;
    const wait = h.stop < 0 ? W.t < h.at - 3 : waitStop;
    // 그때의 자리 (반투명 금빛) + 점선 화살표
    if (th && h.ghost >= 0 && Math.abs(h.ghost - th.tau) > 3) {
      const keep = th.tau;
      th.tau = Math.min(th.dur, h.ghost);
      const g = thingCenter(th);
      tinted(ctx, (o) => drawThingAt(o, v, th, th.tau, 1), '#ffe066', 0.55, [X(g.x - g.r * 1.6) , Y(g.y - g.r * 1.6), X(g.x + g.r * 1.6), Y(g.y + g.r * 1.6)]);
      th.tau = keep;
      ctx.save();
      ctx.globalAlpha = a * 0.5;
      drawThingAt(ctx, v, th, Math.min(th.dur, h.ghost), 1);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,230,90,.95)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(X(c.x), Y(c.y));
      ctx.lineTo(X(g.x), Y(g.y));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,230,90,.95)';
      ell(ctx, X(g.x), Y(g.y), R(Math.min(0.09, g.r)), R(Math.min(0.09, g.r)));
      ctx.stroke();
    }
    // 누를 물건: 고리 + 손가락 (때가 오면 꾹꾹)
    const pr = (t % 40) / 40, press = !wait && pr > 0.5 && pr < 0.78 ? 1 : 0;
    ctx.strokeStyle = wait ? 'rgba(255,255,255,.85)' : `rgba(255,230,90,${1 - pr * 0.7})`;
    ctx.lineWidth = 3.5;
    const rr0 = R(Math.min(0.1, c.r * 0.7)) * (wait ? 1 : 1 + pr * 0.5);
    ell(ctx, X(c.x), Y(c.y), rr0, rr0);
    ctx.stroke();
    if (wait && h.stop < 0) {
      // 남은 때 (시계 바늘처럼 줄어든다)
      const q = cl01((h.at - W.t) / Math.max(30, h.at - (W.t - (t - h.t)))) ;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(X(c.x), Y(c.y), rr0 + 6, -Math.PI / 2, -Math.PI / 2 + TAU2 * q);
      ctx.stroke();
    }
    drawHand(ctx, X(c.x) + R(0.02), Y(c.y) + R(0.07) - press * R(0.012), R(0.06), press);
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tag = wait ? (h.stop >= 0 ? '조금 더…' : '기다렸다가') : h.stop >= 0 ? '지금 다시 톡!' : '지금 톡!';
    const tw = ctx.measureText(tag).width + R(0.04), ty = Y(c.y) - rr0 - R(0.04);
    ctx.fillStyle = wait ? 'rgba(60,40,80,.85)' : '#ff8a1a';
    rr(ctx, X(c.x) - tw / 2, ty - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tag, X(c.x), ty + 1);
  }
  // 한 줄 말 (전구와 함께, 화면 위쪽)
  const line = h.done >= 0 ? '좋아요!' : h.text;
  font(0.038, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const maxW = SV.R(0.84), tw = Math.min(maxW, ctx.measureText(line).width) + SV.R(0.12), bx = SV.X(0.5) - tw / 2, by = SV.Y(BOTY - 0.06);
  ctx.fillStyle = 'rgba(255,250,225,.96)';
  rr(ctx, bx, by - SV.R(0.038), tw, SV.R(0.076), SV.R(0.038));
  ctx.fill();
  ctx.strokeStyle = '#ffb02e';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  bulbIcon(ctx, bx + SV.R(0.045), by, SV.R(0.022), 1, t);
  ctx.fillStyle = '#4a2e1a';
  ctx.fillText(line, bx + SV.R(0.085), by + 1, maxW);
  ctx.restore();
}
/** 전구 그림 (빛 = 0~1) */
function bulbIcon(ctx: C2, x: number, y: number, r: number, glow: number, t: number) {
  if (glow > 0) {
    ctx.fillStyle = rad(ctx, x, y - r * 0.2, r * 2.4, [[0, `rgba(255,236,120,${0.55 * glow})`], [1, 'rgba(255,236,120,0)']]);
    ctx.fillRect(x - r * 2.4, y - r * 2.6, r * 4.8, r * 4.8);
    ctx.strokeStyle = `rgba(255,214,80,${0.9 * glow})`;
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const an = -Math.PI / 2 + (k - 2) * 0.62, q = 1.35 + Math.sin(t * 0.2 + k) * 0.08;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(an) * r * 1.15, y - r * 0.2 + Math.sin(an) * r * 1.15);
      ctx.lineTo(x + Math.cos(an) * r * q * 1.2, y - r * 0.2 + Math.sin(an) * r * q * 1.2);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // 유리알
  ctx.fillStyle = glow > 0 ? lin(ctx, x, y - r, x, y + r * 0.4, [[0, '#fff8c0'], [1, '#ffd23a']]) : lin(ctx, x, y - r, x, y + r * 0.4, [[0, '#ffffff'], [1, '#d8e4f0']]);
  ctx.beginPath();
  ctx.arc(x, y - r * 0.2, r * 0.85, Math.PI * 0.8, Math.PI * 0.2);
  ctx.lineTo(x + r * 0.38, y + r * 0.55);
  ctx.lineTo(x - r * 0.38, y + r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a6a2a';
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  ctx.stroke();
  // 필라멘트
  ctx.strokeStyle = glow > 0 ? '#ff8a1a' : '#9a8a7a';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.25, y + r * 0.4);
  ctx.lineTo(x - r * 0.18, y - r * 0.15);
  ctx.lineTo(x, y + r * 0.05);
  ctx.lineTo(x + r * 0.18, y - r * 0.15);
  ctx.lineTo(x + r * 0.25, y + r * 0.4);
  ctx.stroke();
  // 나사 밑동
  ctx.fillStyle = '#9aa0ae';
  rr(ctx, x - r * 0.4, y + r * 0.55, r * 0.8, r * 0.45, r * 0.12);
  ctx.fill();
  ctx.strokeStyle = '#6a7080';
  ctx.lineWidth = 1;
  for (let k = 0; k < 2; k++) (ctx.beginPath(), ctx.moveTo(x - r * 0.4, y + r * (0.7 + k * 0.15)), ctx.lineTo(x + r * 0.4, y + r * (0.7 + k * 0.15)), ctx.stroke());
  ctx.fillStyle = '#5a6070';
  ell(ctx, x, y + r * 1.05, r * 0.16, r * 0.08);
  ctx.fill();
  // 반짝
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ell(ctx, x - r * 0.32, y - r * 0.45, r * 0.14, r * 0.24, -0.5);
  ctx.fill();
}
/** ↺ 단추 그림 */
function againIcon(ctx: C2, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = '#fff2d8';
  ctx.lineWidth = Math.max(2, r * 0.2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, -Math.PI * 0.15, Math.PI * 1.45);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const ax = x + Math.cos(-Math.PI * 0.15) * r * 0.55, ay = y + Math.sin(-Math.PI * 0.15) * r * 0.55;
  ctx.fillStyle = '#fff2d8';
  ctx.beginPath();
  ctx.moveTo(ax + r * 0.28, ay - r * 0.12);
  ctx.lineTo(ax - r * 0.12, ay - r * 0.32);
  ctx.lineTo(ax - r * 0.06, ay + r * 0.18);
  ctx.closePath();
  ctx.fill();
}
/** 판 시작 뒤 잠깐: 부엉이 → 시계 부품까지 길 (막히는 곳은 빨갛게) · 필름에서 본 큰일 자리 */
function drawGoalPath(ctx: C2, s: RewState, v: View) {
  const age = s.t - s.playT;
  if (s.playT < 0 || age > 240 || s.film) return;
  const a = Math.min(1, age / 10, (240 - age) / 40), { X, Y, R, t } = v, L = s.L, H = s.W.hero;
  ctx.save();
  ctx.globalAlpha = a;
  const g = L.ground;
  const yAt = (x: number) => {
    for (let i = 0; i < g.length; i += 3) if (x >= g[i] && x <= g[i + 1]) return g[i + 2];
    return -1;
  };
  for (let x = H.x + 0.05, k = 0; x < L.gearX - 0.03; x += 0.035, k++) {
    let y = yAt(x);
    const gap = y < 0;
    if (gap) y = H.y;
    const bob = Math.sin(t * 0.15 - k * 0.6) * R(0.004);
    ctx.fillStyle = gap ? '#ff4a3a' : '#ffd23a';
    ell(ctx, X(x), Y(y - 0.012) + bob, R(0.008), R(0.008));
    ctx.fill();
  }
  for (const m of s.filmMarks ?? []) {
    const pul = 1 + Math.sin(t * 0.3) * 0.12;
    ctx.strokeStyle = 'rgba(255,58,58,.85)';
    ctx.lineWidth = 3;
    ell(ctx, X(m.x), Y(m.y), R(m.r) * pul, R(m.r) * pul);
    ctx.stroke();
  }
  ctx.restore();
}
/** 물건의 가운데·크기 (시계 문양 자리) */
function thingCenter(th: Thing): { x: number; y: number; r: number } {
  pose(th, th.tau);
  switch (th.k) {
    case 'bridge':
      return { x: (th.x + th.x2) / 2, y: th.y - 0.01, r: 0.13 };
    case 'water':
      return { x: th.x, y: th.y - 0.03, r: 0.1 };
    case 'raft':
      return { x: P.x, y: P.y, r: 0.12 };
    case 'log':
      return th.tau < LOG_LIE ? { x: th.x + Math.sin(P.a) * th.w * 0.5, y: th.y - Math.cos(P.a) * th.w * 0.5, r: 0.12 } : { x: (th.x + th.x2) / 2, y: P.y, r: 0.13 };
    case 'crate':
      return { x: P.x, y: P.y + th.h / 2, r: 0.11 };
    case 'gear':
      return { x: P.x, y: P.y - 0.05, r: 0.08 };
    case 'barrel':
      return { x: P.x, y: P.y - 0.034, r: 0.07 };
    case 'balloon':
      return { x: P.x, y: P.y + 0.05, r: 0.09 };
    case 'stack':
      return { x: P.x, y: P.y + 0.03, r: 0.12 };
    case 'ferry':
      return { x: P.x, y: th.y - 0.02, r: 0.1 };
    case 'sack':
      return { x: P.x, y: P.y - 0.03, r: 0.07 };
    case 'pot':
      return { x: P.x, y: P.y, r: 0.07 };
    default:
      return { x: P.x, y: P.y, r: 0.06 };
  }
}
function drawActor(ctx: C2, v: View, s: RewState, a: Actor) {
  const { X, Y, R, t } = v;
  const W = s.W, u = R(0.0105);
  let mood: Mood = 'idle', arms = 0;
  const recent = (k: string, id = -1) => s.events.some((e) => e.kind === k && t - e.t < 70 && (id < 0 || e.id === id));
  if (a.hurt) mood = 'wet';
  else if (a.ko) mood = 'dizzy';
  else if (a.saved) mood = 'cheer';
  else if (a.role === R_ARCH) mood = 'grin';
  else if (a.role === R_WALK) mood = 'grin';
  // 주인: 자기 물건이 움직이면 팔 벌려 기다린다, 받으면 기뻐한다
  const own = W.th.find((q) => q.owner === a.id && q.k !== 'arrow');
  if (own && a.role === R_DECO) {
    if (own.st === DONE) mood = t - a.t < 120 ? 'cheer' : 'happy';
    else if (own.tau > 0) (mood = 'shock'), (arms = 1);
  }
  if (a.k === 'cat' && a.role === R_VILL && !a.hurt) mood = s.L.key === 'water' ? 'sleep' : 'idle';
  if (a.role === R_VILL && !a.hurt && W.th.some((q) => dangerOf(q) !== null && Math.hypot(D.x - a.x, D.y - a.y) < 0.25)) mood = 'shock';
  if (a.role === R_RIDER && !a.saved && !a.hurt) mood = 'shock';
  if (a.k === 'goblin' && !a.ko && a.next - W.t < 50 && a.next - W.t > 0) arms = 1;
  if (a.k === 'kid' && a.role === R_DECO && s.L.key === 'bridge') mood = recent('plankMend') ? 'cheer' : W.th[0].tau > 20 ? 'shock' : 'happy';
  let dir = a.x > 0.5 ? -1 : 1;
  if (a.k === 'goblin' || a.k === 'walker') dir = -1;
  if (a.k === 'machine') return;
  if (a.hurt && a.role === R_RIDER) return;
  if (a.role !== R_RIDER || a.saved) shadow(ctx, X(a.x), Y(a.y), R(0.025), 0.18);
  critter(ctx, a.k, X(a.x), Y(a.y), u, mood, t + a.id * 13, dir, arms);
  // 망보는 도깨비: 깨기 전엔 '…' 말풍선 (부엉이가 타고 올라오면 깬다) — 아래층을 노리는 도깨비는 고양이 표시
  if (a.role === R_ARCH && a.alt >= 2 && !a.ko) {
    const bx = X(a.x) + R(0.035), by = Y(a.y) - R(0.13);
    if (a.shots === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      rr(ctx, bx - R(0.03), by - R(0.018), R(0.06), R(0.036), R(0.018));
      ctx.fill();
      ctx.fillStyle = '#5a4a6a';
      for (let k = 0; k < 3; k++) (ell(ctx, bx - R(0.015) + k * R(0.015), by + Math.sin(t * 0.15 + k) * R(0.003), R(0.0045), R(0.0045)), ctx.fill());
    }
    if (a.alt === 3) {
      // 노리는 곳: 아래층 고양이 (작은 과녁)
      ctx.strokeStyle = 'rgba(255,80,70,.8)';
      ctx.lineWidth = 2;
      ell(ctx, X(a.x) - R(0.04), Y(a.y) - R(0.03), R(0.012), R(0.012));
      ctx.stroke();
    }
  }
}
/** 처음 하는 사람: 손가락이 물건 위에서 톡 + 안내 한 줄 */
function drawGuide(ctx: C2, s: RewState, v: View, font: (sz: number, w?: number) => void, SV: View) {
  const { X, Y, R, t } = v;
  const W = s.W, H = W.hero;
  let target: Thing | null = null, line = '';
  // 첫 판만: 손가락이 다리 위에서 톡 (필름 끝부분부터) — 그 밖의 판은 막히면 전구
  if (s.stage === 0 && s.firstTap < 0 && s.phase === 'play' && (!s.film || s.ft > FILM_FWD - 30) && !s.hint) {
    target = W.th[0];
    line = '다리를 톡! 다리만 시간이 거꾸로';
  }
  void H;
  if (target) {
    const c = thingCenter(target), pr = (t % 50) / 50, press = pr > 0.55 && pr < 0.8 ? 1 : 0;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 - pr * 0.6})`;
    ctx.lineWidth = 3;
    ell(ctx, X(c.x), Y(c.y), R(0.03 + pr * 0.05), R(0.03 + pr * 0.05));
    ctx.stroke();
    drawHand(ctx, X(c.x) + R(0.02), Y(c.y) + R(0.075) - press * R(0.012), R(0.06), press);
  }
  if (line) {
    font(0.042, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText('👆 ' + line).width + SV.R(0.06), cy = SV.Y(0.2);
    ctx.fillStyle = 'rgba(40,30,60,.72)';
    rr(ctx, SV.X(0.5) - tw / 2, cy - SV.R(0.034), tw, SV.R(0.068), SV.R(0.034));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆 ' + line, SV.X(0.5), cy + 1);
  }
}
/** 사건 → 파티클·글자·흔들림·소리 (사건마다 소리, 큰 것은 낮게, 연쇄는 높아지게) */
/** 떠오르는 큰 글자: 화면 안으로 · 먼저 뜬 글자와 인물(머리)을 비켜서 놓는다 (위가 막히면 아래로, 둘 다 막히면 옆으로) */
function say(ctx: C2, fx: Juice, x: number, y: number, text: string, col: string, size: number, w: number, top: number, avoid: number[][], bot = 1e9) {
  const wid = (tx: string, sz: number) => {
    ctx.font = `800 ${sz}px system-ui, sans-serif`;
    const m = typeof ctx.measureText === 'function' ? ctx.measureText(tx) : null;
    return (m && m.width) || tx.length * sz * 0.9;
  };
  const hw = wid(text, size) / 2 + 6, hh = size * 0.72;
  x = Math.max(hw, Math.min(w - hw, x));
  y = Math.max(top + hh, Math.min(bot - hh, y));
  // 부딪히는 것의 위·아래 끝
  const hit = (yy: number, xx: number): number[] | null => {
    for (const p of fx.popups) if (p.life > 3 && Math.abs(p.x - xx) < wid(p.text, p.size) / 2 + 6 + hw && Math.abs(p.y - yy) < p.size * 0.72 + hh) return [p.y - p.size * 0.72, p.y + p.size * 0.72];
    for (const [ax, ay, ar] of avoid) if (Math.abs(ax - xx) < ar + hw && Math.abs(ay - yy) < ar + hh) return [ay - ar, ay + ar];
    return null;
  };
  const go = (dir: number, xx: number) => {
    let yy = y;
    for (let it = 0; it < 8; it++) {
      const h = hit(yy, xx);
      if (!h) return yy >= top + hh && yy <= bot - hh ? yy : null;
      yy = dir < 0 ? h[0] - hh - 2 : h[1] + hh + 2;
    }
    return null;
  };
  let ny = go(-1, x) ?? go(1, x);
  if (ny === null)
    for (const dx of [-1, 1, -2, 2]) {
      const xx = Math.max(hw, Math.min(w - hw, x + dx * hw * 1.1));
      if ((ny = go(-1, xx)) !== null) {
        x = xx;
        break;
      }
    }
  fx.pop(x, Math.max(top + hh, Math.min(bot - hh, ny ?? y)), text, col, size);
}
function doEvents(ctx: C2, s: RewState, v: View, w: number, top: number, bot = 1e9) {
  const fx = juice(s), { X, Y, R, t } = v;
  // 글자가 피해 갈 인물 머리 (화면 px: x, y, 반지름)
  const avoid: number[][] = [];
  if (s.phase === 'play') {
    const H = s.W.hero;
    avoid.push([X(H.x), Y(H.y - HCY), R(0.06)]);
    for (const a of s.W.ac) if (!a.ko && (a.role === R_VILL || a.role === R_RIDER)) avoid.push([X(a.x), Y(a.y - 0.05), R(0.05)]);
  }
  const pop = (x: number, y: number, text: string, col: string, size: number) => say(ctx, fx, x, y, text, col, size, w, top, avoid, bot);
  // 처음 그릴 때 밀린 옛 사건은 건너뛴다 (화면이 늦게 붙어도 글자가 한꺼번에 쏟아지지 않게)
  const seenT = fx.memo.t ?? t - 2;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Y(e.y), cx = Math.max(R(0.14), Math.min(X(1) - R(0.14), x));
    const th = e.id >= 0 ? thingOf(s.W, e.id) : undefined, big = th ? th.big : 1;
    switch (e.kind) {
      case 'rew': {
        fx.memo['rw' + e.id] = t;
        const c = th ? thingCenter(th) : { x: e.x, y: e.y, r: 0.08 };
        fx.ring(X(c.x), Y(c.y), '#7fe8ff', R(c.r * 1.5), 6);
        fx.ring(X(c.x), Y(c.y), '#ffffff', R(c.r * 0.9), 3);
        fx.burst(X(c.x), Y(c.y), '#ffd25a', 18, 4, 2.4);
        fx.burst(X(c.x), Y(c.y), '#7fe8ff', 14, 3, 2.2);
        // 둘째로 함께 되감을 땐 '두 개 함께!'가 대신 크게 뜬다
        if (s.W.th.filter((q) => q.st === REW).length < 2) pop(Math.max(R(0.14), Math.min(X(1) - R(0.14), X(c.x))), Math.max(R(0.16), Y(c.y) - R(c.r) - R(0.09)), '되감기!', '#bff6ff', s.firstTap === t ? 34 : 26);
        fx.blink('#bff0ff', s.firstTap === t ? 0.3 : 0.14);
        fx.kick(s.firstTap === t ? 6 : 3);
        fx.sound('rewind', 1.25 / big, 1);
        fx.sound('whoosh', 0.7 / big, 0.6);
        break;
      }
      case 'stop':
        pop(cx, y - R(0.06), '멈춤!', '#ffffff', 20);
        fx.ring(x, y, '#ffffff', R(0.07), 3);
        fx.sound('tick', 1, 0.8);
        fx.sound('thud', 1.6, 0.4);
        break;
      case 'dock':
        if (th?.k !== 'stack') pop(cx, y - R(0.07), '척! 걸렸다', '#fff27a', 26);
        fx.ring(x, y, '#fff27a', R(0.12), 5);
        fx.burst(x, y, '#ffffff', 16, 3.5, 2.2);
        fx.kick(4);
        fx.sound('thud', 0.9, 0.9);
        fx.sound('ding', 1.1, 0.8);
        break;
      case 'origin':
        if (th?.k !== 'bridge') pop(cx, y - R(0.07), '착!', '#fff27a', 30);
        fx.ring(x, y, '#ffd25a', R(0.1), 5);
        fx.burst(x, y, '#ffd25a', 16, 3.5, 2.4);
        fx.sound('ding', 1, 0.9);
        break;
      case 'catch': {
        pop(cx, y - R(0.08), '받았다! 고마워!', '#ffe0f0', 26);
        fx.burst(x, y, '#ff8ab8', 16, 3.5, 2.6);
        fx.burst(x, y, '#ffd25a', 12, 3, 2);
        fx.ring(x, y, '#ffd25a', R(0.12), 5);
        fx.kick(3);
        fx.sound('chime', 1, 1);
        break;
      }
      case 'ko':
        pop(cx, y - R(0.13), '뿅! 꽈당!', '#fff27a', 38);
        for (const c of ['#ffe066', '#7ad86a', '#ffffff']) fx.burst(x, y - R(0.04), c, 16, 5, 2.6);
        fx.ring(x, y - R(0.04), '#fff27a', R(0.16), 6);
        fx.blink('#fff6c8', 0.25);
        fx.kick(8);
        fx.sound('boing', 0.8, 1.2);
        fx.sound('thud', 1.2, 0.6);
        break;
      case 'rescue':
        pop(cx, y - R(0.12), '구했다!', '#ffe0f0', 34);
        fx.burst(x, y - R(0.04), '#ff8ab8', 20, 4, 2.6);
        fx.ring(x, y - R(0.04), '#ffd25a', R(0.14), 6);
        fx.kick(4);
        fx.sound('chime', 1.25, 1);
        break;
      case 'machine':
        pop(cx, y - R(0.12), '철컥! 기계가 돌아요', '#fff27a', 26);
        fx.burst(x, y, '#ffd25a', 26, 5, 2.8);
        fx.ring(x, y, '#ffd25a', R(0.18), 6);
        fx.blink('#fff6c8', 0.2);
        fx.kick(6);
        fx.sound('coin', 0.8, 1);
        fx.sound('clear', 0.8, 0.7);
        break;
      case 'plankMend': {
        const n = th ? th.n : 4, k = n - 1 - e.v;
        if (k === n - 1) pop(cx, y - R(0.08), '착!', '#fff27a', 40);
        fx.burst(x, y, '#ffd25a', 10 + k * 4, 3 + k * 0.6, 2.2);
        fx.burst(x, y + R(0.03), '#bff0ff', 8, 3, 2);
        fx.ring(x, y, '#ffd25a', R(0.06 + k * 0.02), 4);
        fx.kick(2 + k);
        fx.sound('ding', 0.9 + k * 0.14, 0.8);
        if (k === n - 1) (fx.blink('#fff6c8', 0.18), fx.sound('chime', 1.1, 0.8));
        break;
      }
      case 'potMend':
      case 'barrelMend':
        pop(cx, y - R(0.06), '착!', '#fff27a', 28);
        fx.burst(x, y - R(0.02), '#ffd25a', 18, 3.5, 2.4);
        fx.ring(x, y - R(0.02), '#ffffff', R(0.08), 4);
        fx.sound('ding', 1.3, 0.9);
        break;
      case 'logLift':
      case 'treeUp':
      case 'crateLift':
        fx.burst(x, y, '#bff0ff', 12, 3, 2.2);
        fx.sound('swell', 0.8 / big, 0.8);
        break;
      case 'creak':
        pop(cx, y - R(0.06), '삐걱…', '#ffe8c8', 18);
        fx.sound('crack', 0.6, 0.4);
        break;
      case 'plankLift':
        // 물속 판자가 거꾸로 솟는다 — 물방울이 판자를 따라 위로
        fx.burst(x, y, '#bff0ff', 14, 3, 2.4);
        fx.burst(x, y - R(0.02), '#ffffff', 8, 2, 1.8);
        fx.ring(x, y, 'rgba(191,240,255,.9)', R(0.05), 3);
        fx.sound('swell', 1.2 + e.v * 0.08, 0.5);
        break;
      case 'plankSplash':
        fx.burst(x, y, '#bff0ff', 12, 3.5, 2.4);
        fx.burst(x, y, '#ffffff', 6, 2.5, 2);
        if (e.v === 0) pop(cx, y - R(0.04), '풍덩!', '#e8f8ff', 22);
        fx.kick(2);
        fx.sound('splash', 1.15 - e.v * 0.05, 0.6);
        break;
      case 'potFall':
        fx.sound('whoosh', 1.5, 0.5);
        break;
      case 'potBreak':
        if (th && th.n === 1) {
          pop(cx, y - R(0.06), '철썩!', '#bff0ff', 26);
          fx.burst(x, y - R(0.01), '#7fd8ff', 20, 4, 2.4);
          fx.kick(3);
          fx.sound('splash', 1, 0.9);
          break;
        }
        if (th && th.n === 2) {
          pop(cx, y - R(0.08), '화르륵!', '#ffd0a0', 28);
          for (const c of ['#ff8a3a', '#ffd25a']) fx.burst(x, y - R(0.02), c, 18, 4, 2.6);
          fx.kick(4);
          fx.sound('crack', 1.4, 0.8);
          fx.sound('zap', 0.6, 0.6);
          break;
        }
        pop(cx, y - R(0.06), '쨍그랑!', '#ffd8c8', 26);
        fx.burst(x, y - R(0.01), '#d86a3a', 18, 4, 2.4);
        fx.burst(x, y - R(0.01), '#7a5a3a', 10, 3, 2);
        fx.kick(4);
        fx.sound('crack', 1.4, 0.9);
        break;
      case 'barrelSmash':
        pop(cx, y - R(0.06), '와장창!', '#ffe0c8', 24);
        fx.burst(x, y - R(0.02), '#b8743a', 18, 4, 2.6);
        fx.kick(4);
        fx.sound('crack', 0.8, 0.8);
        fx.sound('thud', 0.9, 0.7);
        break;
      case 'gearStop':
        fx.burst(x, y, '#c8a080', 10, 2.5, 2);
        fx.sound('thud', 0.7, 0.8);
        break;
      case 'arrowStick':
        fx.burst(x, y, '#c8a080', 8, 2, 1.8);
        fx.sound('thud', 1.8, 0.4);
        break;
      case 'arrowHome':
        fx.ring(x, y, '#7fe8ff', R(0.06), 3);
        fx.sound('whoosh', 1.9, 0.4);
        break;
      case 'arrowPull':
        fx.burst(x, y, '#c8a080', 6, 2, 1.6);
        fx.sound('pop', 1.6, 0.5);
        break;
      case 'gearUnstop':
        fx.burst(x, y, '#ffd25a', 10, 2.5, 2);
        fx.sound('swell', 0.7, 0.7);
        break;
      case 'revive': {
        const q = e.v % 6;
        // 하늘·탑 위의 것은 글자를 아래에 (제목 띠와 겹치지 않게)
        pop(x, y < R(0.36) ? y + R(0.09) : y - R(0.06), FIX_NAME[e.v] + '!', '#fff27a', 30);
        for (const c of ['#ffd25a', '#ffffff', ['#7fe8ff', '#ff8ab8', '#7ad86a'][q % 3]]) fx.burst(x, y, c, 16, 4.5, 2.6);
        fx.ring(x, y, '#fff27a', R(0.14), 5);
        fx.kick(3);
        fx.sound('pop', 1 + q * 0.08, 0.7);
        fx.sound('ding', 0.9 + q * 0.12, 0.9);
        break;
      }
      case 'notch':
        pop(x, y - R(0.15), e.v >= 3 ? '정각! 땡—' : '째깍! 한 칸', '#ffffff', 32);
        fx.ring(x, y, '#ffd25a', R(0.2), 7);
        for (const c of ['#ffd25a', '#ffffff']) fx.burst(x, y, c, 22, 5, 2.6);
        fx.blink('#fff6c8', 0.22);
        fx.kick(6);
        fx.sound('tick', 0.7, 1);
        fx.sound('chime', 0.75, 1.2);
        break;
      case 'stackTip':
        pop(cx, y - R(0.1), '기우뚱…', '#ffe8c8', 20);
        fx.sound('crack', 0.7, 0.5);
        break;
      case 'stackFall':
        pop(cx, y - R(0.1), '와르르!', '#ffe0c8', 30);
        for (const c of ['#c8884a', '#e8d0b0']) fx.burst(x, y, c, 16, 4.5, 2.6);
        fx.kick(7);
        fx.sound('thud', 0.55, 1.1);
        fx.sound('crack', 0.9, 0.6);
        break;
      case 'stackStairs':
        pop(cx, y - R(0.12), '계단이다!', '#fff27a', 28);
        fx.ring(x, y, '#ffd25a', R(0.14), 5);
        fx.burst(x, y, '#ffd25a', 16, 3.5, 2.4);
        fx.sound('ding', 1.2, 0.9);
        fx.sound('chime', 1.4, 0.6);
        break;
      case 'ferryGo':
        fx.burst(x, y, '#bff0ff', 10, 2.5, 2);
        fx.sound('whoosh', 0.9, 0.4);
        fx.sound('splash', 1.4, 0.3);
        break;
      case 'ferryArrive':
        fx.burst(x, y, '#bff0ff', 16, 3.5, 2.4);
        fx.kick(3);
        fx.sound('thud', 0.8, 0.7);
        fx.sound('splash', 1.1, 0.5);
        break;
      case 'sackSlip':
        pop(cx, y - R(0.08), '주르륵', '#ffe8c8', 20);
        fx.sound('whoosh', 1.2, 0.5);
        break;
      case 'sackLand':
        fx.burst(x, y, '#e8d0a0', 16, 3.5, 2.4);
        fx.kick(4);
        fx.sound('thud', 0.7, 1);
        break;
      case 'sackBack':
        fx.burst(x, y, '#bff0ff', 12, 3, 2.2);
        fx.sound('swell', 0.9, 0.7);
        break;
      case 'steam':
        pop(cx, y - R(0.12), '치이익— 불 끔!', '#ffffff', 28);
        for (const c of ['#ffffff', '#dfe8f0', '#bff0ff']) fx.burst(x, y, c, 18, 4, 3);
        fx.ring(x, y, '#ffffff', R(0.14), 5);
        fx.kick(4);
        fx.sound('splash', 1.4, 0.9);
        fx.sound('shrink', 1.2, 0.7);
        break;
      case 'guard':
        pop(cx, y - R(0.12), '어흠!', '#ffe8c8', 18);
        fx.sound('tick', 0.9, 0.5);
        break;
      case 'shove':
        pop(cx, y - R(0.12), '으앗, 밀려났다!', '#ffe8c8', 22);
        fx.burst(x, y, '#e8d0b0', 12, 3, 2.2);
        fx.kick(4);
        fx.sound('boing', 1.1, 0.7);
        break;
      case 'land':
        fx.burst(x, y, '#e8d8c0', 6, 2, 1.8);
        fx.sound('thud', 1.4, 0.4);
        break;
      case 'shoot':
        pop(cx, y - R(0.04), '슝!', '#ffe0d0', 20);
        fx.sound('zap', 1.4, 0.5);
        fx.sound('whoosh', 1.6, 0.4);
        break;
      case 'weir':
        fx.burst(x, y, '#ffffff', 20, 4, 2.6);
        fx.sound('splash', 0.7, 0.9);
        break;
      case 'treeFall':
        pop(cx, y - R(0.2), '쿵— 기우뚱', '#fff2d0', 20);
        fx.sound('crack', 0.7, 0.7);
        break;
      case 'logLand':
        fx.burst(x, y, '#bff0ff', 22, 4.5, 2.6);
        fx.kick(5);
        fx.sound('thud', 0.6, 1);
        fx.sound('splash', 0.8, 0.8);
        break;
      case 'burst':
        pop(cx, y - R(0.12), '콸콸!', '#bff0ff', 28);
        fx.burst(x, y, '#7fd8ff', 22, 4.5, 2.6);
        fx.kick(4);
        fx.sound('crack', 0.9, 0.6);
        fx.sound('splash', 0.8, 1);
        break;
      case 'crateDrop':
        fx.sound('whoosh', 0.8, 0.6);
        break;
      case 'crateLand':
        pop(cx, y - R(0.05), '쿵!', '#ffe0c8', 30);
        fx.burst(x, y, '#e8d0b0', 20, 4, 2.6);
        fx.kick(7);
        fx.sound('thud', 0.55, 1.2);
        break;
      case 'balloonGone':
      case 'lost':
        pop(cx, Math.max(R(0.2), y - R(0.06)), '아앗, 놓쳤다…', '#ffe0e0', 22);
        fx.sound('fail', 1.3, 0.5);
        break;
      case 'hurt':
        pop(cx, y - R(0.08), '아야!', '#ffd0d0', 26);
        fx.burst(x, y, '#ffffff', 12, 3, 2);
        fx.kick(5);
        fx.sound('thud', 1.1, 0.8);
        fx.sound('fail', 1.4, 0.4);
        break;
      case 'wet':
        pop(cx, y - R(0.08), '냐아아!', '#bff0ff', 26);
        fx.burst(x, y, '#7fd8ff', 14, 3, 2.2);
        fx.sound('splash', 1.3, 0.7);
        break;
      case 'bonk':
        pop(cx, y - R(0.12), s.W.hero.why || '쿵!', '#ffd0c0', 30);
        for (const c of ['#ffffff', '#ffe066']) fx.burst(x, y, c, 16, 4.5, 2.4);
        fx.ring(x, y, '#ffe066', R(0.1), 5);
        fx.kick(9);
        fx.blink('#ffb0a0', 0.2);
        fx.sound('boing', 0.7, 1);
        fx.sound('thud', 0.9, 0.9);
        break;
      case 'splash':
        pop(cx, y - R(0.1), '풍덩!', '#bff0ff', 34);
        fx.burst(x, y, '#bff0ff', 26, 5, 2.8);
        fx.burst(x, y, '#ffffff', 12, 3.5, 2);
        fx.kick(7);
        fx.sound('splash', 0.6, 1.2);
        break;
      case 'fall':
        fx.sound('whoosh', 0.6, 0.7);
        break;
      case 'stuck':
        pop(cx, y - R(0.18), '어?', '#ffffff', 22);
        fx.sound('tick', 0.8, 0.4);
        break;
      case 'board':
        fx.sound('pop', 1.4, 0.4);
        break;
      case 'go':
        fx.sound('pop', 1.2, 0.5);
        break;
      case 'gearGet':
        pop(cx, y - R(0.14), '시계 부품!', '#fff27a', 36);
        for (const c of ['#ffd25a', '#ffffff', '#ffe066']) fx.burst(x, y - R(0.07), c, 20, 5, 2.8);
        fx.ring(x, y - R(0.07), '#ffd25a', R(0.18), 6);
        fx.blink('#fff6c8', 0.25);
        fx.kick(6);
        fx.sound('coin', 1, 1);
        fx.sound('chime', 1.2, 0.8);
        break;
      case 'notyet':
        pop(cx, y - R(0.05), '아직 그대로예요', '#ffffff', 16);
        fx.sound('tick', 1.3, 0.4);
        break;
      case 'nosand':
        pop(cx, y - R(0.05), '모래가 없어요', '#ffd0c0', 18);
        fx.sound('fail', 1.6, 0.4);
        break;
      case 'empty':
        pop(cx, y - R(0.06), '모래가 다 떨어졌다!', '#ffd0c0', 20);
        fx.sound('fail', 1.4, 0.5);
        break;
      case 'miss':
        fx.ring(x, y, 'rgba(255,255,255,.8)', R(0.04), 2);
        fx.sound('tick', 1.5, 0.3);
        break;
      case 'twin': {
        // 두 개 함께 되감기: 두 물건 사이에 시계 빛줄
        const o = s.W.th.find((q) => q.st === REW && q.id !== e.id);
        if (o && th) {
          const a = thingCenter(th), b = thingCenter(o);
          fx.ring(X(a.x), Y(a.y), '#c8a8ff', R(0.12), 5);
          fx.ring(X(b.x), Y(b.y), '#c8a8ff', R(0.12), 5);
          pop((X(a.x) + X(b.x)) / 2, Math.min(Y(a.y), Y(b.y)) - R(0.08), '두 개 함께!', '#e8d8ff', 30);
        }
        fx.blink('#e8d8ff', 0.2);
        fx.sound('chime', 1.5, 0.8);
        fx.sound('rewind', 1.4, 0.6);
        break;
      }
      case 'wake':
        pop(cx, y - R(0.04), e.v === 3 ? '저기 고양이!' : '앗, 올라온다!', '#ffd0c0', 22);
        fx.ring(x, y, '#ff6a5a', R(0.07), 4);
        fx.sound('zap', 0.9, 0.5);
        fx.sound('boing', 1.6, 0.4);
        break;
      case 'ability':
        for (const c of ['#ffd25a', '#7fe8ff', '#ff8ab8', '#ffffff']) fx.burst(x, y, c, 18, 5, 2.8);
        fx.ring(x, y, '#ffd25a', R(0.3), 7);
        fx.blink('#fff6c8', 0.3);
        fx.kick(6);
        fx.sound('swell', 0.8, 1);
        fx.sound('chime', 1, 1.1);
        break;
      case 'filmGo':
        fx.sound('whoosh', 0.8, 0.5);
        fx.sound('tick', 1.6, 0.4);
        break;
      case 'filmRew':
        fx.blink('#bff0ff', 0.18);
        fx.sound('rewind', 0.9, 0.9);
        fx.sound('whoosh', 0.6, 0.6);
        break;
      case 'filmEnd':
        fx.sound('pop', 1.3, 0.6);
        break;
      case 'again':
        fx.blink('#bff0ff', 0.2);
        fx.sound('rewind', 1.1, 0.8);
        break;
      case 'hint':
        fx.ring(BULB[0] * w, BULB[1] * w, '#ffe066', w * 0.09, 5);
        fx.burst(BULB[0] * w, BULB[1] * w, '#ffe066', 12, 3, 2);
        fx.sound('chime', 1.4, 0.7);
        fx.sound('ding', 1.8, 0.4);
        break;
      case 'hintOk':
        fx.sound('ding', 1.5, 0.6);
        break;
      case 'knock':
        pop(cx, y - R(0.06), '쿵! 흔들흔들', '#ffe8c8', 20);
        fx.ring(x, y, '#ffffff', R(0.06), 3);
        fx.kick(2);
        fx.sound('thud', 1.2, 0.6);
        fx.sound('boing', 1.5, 0.4);
        break;
      case 'chain': {
        // 연쇄 되감기: 되감는 물건이 밀었던 것까지 끌고 온다 — 화면 번쩍·줄무늬·낮은 되감기 소리
        const tc = th ? thingCenter(th) : { x: e.x, y: e.y, r: 0.06 };
        pop(Math.max(R(0.16), Math.min(X(1) - R(0.16), X(tc.x))), Y(tc.y) - R(0.12), '연쇄 되감기!', '#bff6ff', 32);
        fx.ring(X(tc.x), Y(tc.y), '#7fe8ff', R(0.16), 6);
        for (const c of ['#7fe8ff', '#ffffff', '#ffd25a']) fx.burst(X(tc.x), Y(tc.y), c, 14, 4.5, 2.6);
        fx.blink('#bff0ff', 0.3);
        fx.kick(6);
        fx.sound('rewind', 0.7, 1.1);
        fx.sound('chime', 1.2, 0.8);
        break;
      }
      case 'chainHome':
        pop(cx, y - R(0.06), '착!', '#fff27a', 26);
        fx.burst(x, y, '#ffd25a', 14, 3.5, 2.2);
        fx.sound('ding', 1.4, 0.8);
        break;
      case 'clear':
        for (const c of ['#ffe066', '#ff8ab8', '#7fe8ff', '#7ad86a', '#ffffff']) fx.burst(X(0.5), Y(0.45), c, 20, 6, 3);
        fx.blink('#fff6c8', 0.22);
        fx.sound('clear', 1, 1);
        break;
      case 'fail':
        fx.kick(9);
        fx.blink('#ff9a8a', 0.2);
        fx.sound('fail', 1, 0.9);
        break;
    }
  }
  // 되감는 동안 시계가 거꾸로 째깍 · 쉬던 물건이 곧 다시 움직이면 똑딱 (사건 아닌 '지금'의 소리)
  if (s.phase === 'play' && t !== fx.memo.tk) {
    fx.memo.tk = t;
    const W = s.W;
    if (W.rew >= 0 && t % 9 === 0) fx.sound('tick', 1.8 - ((t / 9) % 4) * 0.12, 0.3);
    for (const th of W.th) if (th.st === HOLD && th.k !== 'arrow' && th.hold < 40 && th.hold % 12 === 0) fx.sound('tick', 1.1, 0.35);
  }
  if (s.phase === 'result' && s.ok && s.won && t % 14 === 0) {
    const fxx = X(0.15 + hsh(t) * 0.7), fyy = Y(0.08 + hsh(t + 1) * 0.25);
    for (const c of ['#ff5a7a', '#ffd25a', '#7fe8ff', '#7ad86a']) fx.burst(fxx, fyy, c, 10, 4, 2.4);
    fx.sound('pop', 0.7 + hsh(t + 2) * 0.6, 0.6);
  }
  fx.memo.t = t;
}

function starText(s: RewState, k: StarK): string {
  const L = s.L;
  if (k === 'goal') return '시계 부품까지 가기';
  if (k === 'sand') return `되감기 ${(L.par / 60).toFixed(1)}초 안에`;
  if (k === 'safe') return '아무도 안 다치게';
  if (k === 'taps') return L.tapsPar <= 1 ? '되감기 한 번으로' : `되감기 ${L.tapsPar}번으로`;
  const r = L.actors.find((a) => a.role === R_RIDER);
  return r && r.k === 'cat' ? '고양이 구하기' : '아이 구하기';
}
function drawHud(ctx: C2, s: RewState, w: number, h: number, v: View, font: (sz: number, w?: number) => void, wv: View) {
  const { R } = v;
  const L = s.L, W = s.W, d = STAGES[s.stage], t = s.t;
  // ── 위 띠: 판 · 부품 · 하트
  ctx.fillStyle = 'rgba(52,34,70,.9)';
  ctx.fillRect(0, 0, w, R(TOPH));
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(0, R(TOPH) - 2, w, 2);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff2d8';
  ctx.fillText(`${d.ch + 1}-${inCh(s.stage)} ${d.name}`, R(0.03), R(0.044), R(0.4));
  for (let k = 0; k < 3; k++) {
    heartPath(ctx, w - R(0.245) - k * R(0.045), R(0.042), R(0.015));
    ctx.fillStyle = k < s.hearts ? '#ff4a5a' : 'rgba(255,255,255,.18)';
    ctx.fill();
  }
  // ↺ 처음부터 · 전구(막힘 힌트): 한 번 지면 살랑, 15초 넘게 나아간 게 없으면 반짝
  againIcon(ctx, AGAIN[0] * w, AGAIN[1] * w, R(0.032));
  if (s.hint && s.hint.restart && s.phase === 'play') {
    // 지금 상태로는 못 깬다: ↺ 단추를 가리킨다
    const pr = (t % 40) / 40, press = pr > 0.5 && pr < 0.78 ? 1 : 0;
    ctx.strokeStyle = `rgba(255,230,90,${1 - pr * 0.7})`;
    ctx.lineWidth = 3;
    ell(ctx, AGAIN[0] * w, AGAIN[1] * w, R(0.04) * (1 + pr * 0.5), R(0.04) * (1 + pr * 0.5));
    ctx.stroke();
    drawHand(ctx, AGAIN[0] * w + R(0.015), AGAIN[1] * w + R(0.07) - press * R(0.01), R(0.055), press);
  }
  {
    const stall = s.phase === 'play' && !s.film && s.t - s.progT > 900, wig = s.fails > 0 && !s.hint ? Math.sin(t * 0.18) * 0.18 : 0;
    const on = !!s.hint || stall || s.fails > 0;
    const glow = s.hint ? 1 : stall ? 0.6 + Math.sin(t * 0.25) * 0.4 : s.fails > 0 ? 0.45 : 0;
    ctx.save();
    ctx.translate(BULB[0] * w, BULB[1] * w);
    ctx.rotate(wig);
    ctx.fillStyle = on ? 'rgba(255,214,80,.28)' : 'rgba(255,255,255,.12)';
    ell(ctx, 0, 0, R(0.046), R(0.046));
    ctx.fill();
    bulbIcon(ctx, 0, -R(0.006), R(0.03), glow, t);
    ctx.restore();
    if (stall && !s.hint) {
      // 말풍선: 막히면 전구
      font(0.028, 900);
      ctx.textAlign = 'right';
      const tx = BULB[0] * w - R(0.02), ty = R(0.125), tw2 = ctx.measureText('막히면 톡!').width + R(0.03);
      ctx.fillStyle = 'rgba(255,250,225,.95)';
      rr(ctx, tx - tw2 + R(0.015), ty - R(0.022), tw2, R(0.044), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#7a4a1a';
      ctx.fillText('막히면 톡!', tx, ty + 1);
    }
  }
  // 부품 수: 하트 왼쪽에 오른쪽 맞춤 (두 자리여도 하트와 안 겹치게)
  font(0.034, 900);
  ctx.fillStyle = '#ffe6a0';
  ctx.textAlign = 'right';
  const gx = w - R(0.385);
  ctx.fillText(`${s.gears}/${STAGE_COUNT}`, gx, R(0.045));
  const gw = ctx.measureText(`${s.gears}/${STAGE_COUNT}`).width || R(0.1);
  ctx.textAlign = 'left';
  brass(ctx, gx - gw - R(0.026), R(0.043), R(0.02), 8, t * 0.02);
  // ── 아래 띠: 모래시계 · 별 조건
  const by = (TOPH + BOTY) * w;
  ctx.fillStyle = lin(ctx, 0, by, 0, h, [[0, '#4a2e5e'], [1, '#2e1c40']]);
  ctx.fillRect(0, by, w, h - by);
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(0, by, w, 2);
  const sand = Math.max(0, W.sand), q = sand / L.sand, rewing = W.rew >= 0;
  const fx = juice(s), flipAge = t - (fx.memo.flip ?? -99);
  if (rewing && (fx.memo.flipId ?? -1) !== W.rew) (fx.memo.flipId = W.rew), (fx.memo.flip = t);
  if (!rewing) fx.memo.flipId = -1;
  const ry = by + R(0.045);
  hourglass(ctx, R(0.055), ry, R(0.028), q, flipAge < 14 ? flipAge / 14 : 0);
  // 복원이 준 능력 (모래 막대 오른쪽 작은 배지)
  const abil = [L.rw > RW ? 0 : -1, L.multi > 1 ? 1 : -1].filter((k) => k >= 0);
  abil.forEach((k, i) => abilityIcon(ctx, k, w - R(0.04) - (abil.length - 1 - i) * R(0.068), ry, R(0.027), t));
  const bx0 = R(0.1), bw = w - R(0.13) - abil.length * R(0.068), bh = R(0.03);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  rr(ctx, bx0, ry - bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, ry - bh / 2, 0, ry + bh / 2, [[0, '#ffe08a'], [1, '#f2a83a']]);
  rr(ctx, bx0, ry - bh / 2, Math.max(bh, bw * q), bh, bh / 2);
  ctx.fill();
  if (rewing) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    const sx = bx0 + bw * q - R(0.01) - ((t * 2) % R(0.04));
    ctx.fillRect(sx, ry - bh / 2 + 2, R(0.012), bh - 4);
  }
  // 별 기준선 (모래를 이만큼 남기면 ★)
  if (L.stars.includes('sand')) {
    const px = bx0 + bw * (1 - L.par / L.sand);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, ry - bh * 0.85);
    ctx.lineTo(px, ry + bh * 0.85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd23a';
    starPath(ctx, px, ry - bh * 0.95, R(0.012));
    ctx.fill();
  }
  font(0.03, 900);
  ctx.fillStyle = '#4a2e1a';
  ctx.textAlign = 'left';
  ctx.fillText(`모래 ${(sand / 60).toFixed(1)}초`, bx0 + R(0.012), ry + 1);
  // 별 조건 (한 줄 말)
  const live = starsLive(s), res = s.phase === 'result' && s.ok ? s.starOk : live;
  font(0.033, 800);
  let cx = R(0.03), cy = by + R(0.105);
  L.stars.forEach((k, j) => {
    const txt = starText(s, k), tw = ctx.measureText(txt).width + R(0.07);
    if (cx + tw > w - R(0.02)) (cx = R(0.03)), (cy += R(0.05));
    const on = res[j], broken = !on && ((k === 'sand' && W.used > L.par) || (k === 'taps' && W.taps > L.tapsPar) || ((k === 'safe' || k === 'rescue') && W.hurt > 0));
    ctx.fillStyle = on ? 'rgba(255,220,90,.22)' : 'rgba(0,0,0,.28)';
    rr(ctx, cx, cy - R(0.022), tw, R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = on ? '#ffcf3a' : broken ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.55)';
    starPath(ctx, cx + R(0.027), cy, R(0.017));
    ctx.fill();
    ctx.fillStyle = on ? '#fff6d0' : broken ? 'rgba(255,230,220,.5)' : '#fff0dc';
    ctx.textAlign = 'left';
    ctx.fillText(txt, cx + R(0.052), cy + 1);
    if (broken) {
      ctx.strokeStyle = 'rgba(255,150,140,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + R(0.05), cy + 1);
      ctx.lineTo(cx + tw - R(0.014), cy + 1);
      ctx.stroke();
    }
    cx += tw + R(0.016);
  });
  // ── 판 띠·결과·장 넘김
  drawCards(ctx, s, w, v, font, wv);
}
/** 지금 지켜지고 있는 별 (부품은 아직이면 꺼짐) */
function starsLive(s: RewState): boolean[] {
  const L = s.L, W = s.W, win = W.hero.st === H_WIN;
  return L.stars.map((k) => (k === 'goal' ? win : k === 'sand' ? W.used <= L.par : k === 'safe' ? W.hurt === 0 : k === 'taps' ? W.taps <= L.tapsPar : W.saved > 0));
}
/** 복원된 것 작은 그림 (결과 화면) */
function fixIcon(ctx: C2, k: number, x: number, y: number, r: number, t: number, bg = true) {
  ctx.save();
  ctx.translate(x, y);
  const pop = 1 + Math.max(0, Math.sin(t * 0.15)) * 0.08;
  ctx.scale(pop, pop);
  if (bg) {
    ctx.fillStyle = '#fff3d0';
    ell(ctx, 0, 0, r * 1.15, r * 1.15);
    ctx.fill();
    ctx.strokeStyle = '#ffb02e';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (k === 0) {
    ctx.fillStyle = '#5ac8f0';
    ell(ctx, 0, r * 0.45, r * 0.8, r * 0.25);
    ctx.fill();
    for (let q = 0; q < 5; q++) (ell(ctx, (q - 2) * r * 0.25, -r * 0.2 - Math.abs(Math.sin(t * 0.2 + q)) * r * 0.4, r * 0.1, r * 0.1), ctx.fill());
  } else if (k === 1) {
    for (let q = 0; q < 3; q++) (ctx.fillStyle = ['#ff5a7a', '#ffcf3a', '#ff8ad0'][q], ell(ctx, (q - 1) * r * 0.5, -r * 0.1, r * 0.28, r * 0.28), ctx.fill());
    ctx.fillStyle = '#9a5a2a';
    ctx.fillRect(-r * 0.75, r * 0.25, r * 1.5, r * 0.35);
  } else if (k === 2) {
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(-r * 0.06, -r * 0.3, r * 0.12, r * 1);
    ctx.fillStyle = '#fff2a0';
    rr(ctx, -r * 0.3, -r * 0.7, r * 0.6, r * 0.45, r * 0.1);
    ctx.fill();
  } else if (k === 3 || k === 6) {
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 2;
    for (let q = 0; q < (k === 3 ? 4 : 8); q++) {
      const a = t * 0.06 + (q * TAU2) / (k === 3 ? 4 : 8);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.stroke();
    }
  } else if (k === 4) {
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.4);
    ctx.quadraticCurveTo(0, r * 0.1, r * 0.85, -r * 0.4);
    ctx.stroke();
    for (let q = 0; q < 4; q++) {
      const fx2 = (q - 1.5) * r * 0.42, fy = -r * 0.3 + (1 - ((q - 1.5) / 2) ** 2) * r * 0.2;
      ctx.fillStyle = ['#ff5a5a', '#ffcf3a', '#5ab8ff', '#7ad86a'][q];
      ctx.beginPath();
      ctx.moveTo(fx2 - r * 0.16, fy);
      ctx.lineTo(fx2 + r * 0.16, fy);
      ctx.lineTo(fx2, fy + r * 0.45 + Math.sin(t * 0.2 + q) * r * 0.05);
      ctx.closePath();
      ctx.fill();
    }
  } else if (k === 5) {
    ctx.fillStyle = '#ff6a5a';
    ell(ctx, 0, -r * 0.2, r * 0.5, r * 0.55);
    ctx.fill();
    ctx.fillStyle = '#ffd25a';
    ctx.fillRect(-r * 0.15, -r * 0.75, r * 0.3, r * 1.1);
    ctx.fillStyle = '#9a6a3a';
    ctx.fillRect(-r * 0.18, r * 0.5, r * 0.36, r * 0.22);
  } else if (k === 7) {
    ctx.fillStyle = '#c8783a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.1);
    ctx.lineTo(r * 0.7, r * 0.1);
    ctx.lineTo(r * 0.45, r * 0.45);
    ctx.lineTo(-r * 0.45, r * 0.45);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.1);
    ctx.lineTo(0, -r * 0.7);
    ctx.lineTo(r * 0.45, 0);
    ctx.fill();
  } else if (k === 8) {
    ctx.strokeStyle = '#5a5a7a';
    ctx.lineWidth = 2;
    for (let q = 0; q < 3; q++) {
      const bx = (q - 1) * r * 0.5, by = (q % 2) * r * 0.3 - r * 0.1, fl = Math.sin(t * 0.3 + q) * r * 0.15;
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.2, by - fl);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + r * 0.2, by - fl);
      ctx.stroke();
    }
  } else if (k === 9) {
    ['#ff6a6a', '#ffe36a', '#7ad86a', '#5ab8ff'].forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.arc(0, r * 0.4, r * (0.85 - i * 0.15), Math.PI, 0);
      ctx.stroke();
    });
  } else if (k === 10) {
    ctx.fillStyle = '#ff5a8a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.75);
    ctx.lineTo(r * 0.5, -r * 0.1);
    ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-r * 0.5, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6a4a4a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.45);
    ctx.quadraticCurveTo(r * 0.3, r * 0.7, -r * 0.1, r * 0.9);
    ctx.stroke();
  } else if (k === 11) {
    ctx.fillStyle = '#5ac8f0';
    ell(ctx, 0, r * 0.55, r * 0.8, r * 0.18);
    ctx.fill();
    ctx.fillStyle = '#ff9a3a';
    ell(ctx, 0, -r * 0.1 - Math.abs(Math.sin(t * 0.12)) * r * 0.2, r * 0.42, r * 0.22, -0.5);
    ctx.fill();
  } else if (k === 13) brass(ctx, 0, 0, r * 0.8, 10, t * 0.05);
  else if (k === 15) cuckoo(ctx, 0, r * 0.75, r * 0.95, t * 3, true);
  else if (k === 16) pendulum(ctx, 0, -r * 0.6, r * 1.05, t * 2, true);
  else if (k === 14) {
    ctx.fillStyle = '#e0a83a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.5);
    ctx.quadraticCurveTo(-r * 0.4, r * 0.2, -r * 0.7, r * 0.5);
    ctx.lineTo(r * 0.7, r * 0.5);
    ctx.quadraticCurveTo(r * 0.4, r * 0.2, r * 0.3, -r * 0.5);
    ctx.fill();
  } else clockFace(ctx, 0, 0, r * 0.8, t * 8, k === 12 ? 13 : 18);
  ctx.restore();
}
const FIX_TEXT = [
  '분수가 다시 솟아요!', '창가 꽃이 활짝!', '가로등에 불이 켜져요!', '풍차가 돌아요!', '깃발 줄이 펄럭여요!', '열기구가 떠올라요!',
  '물레방아가 돌아요!', '나룻배가 돌아왔어요!', '새 떼가 돌아왔어요!', '무지개가 떴어요!', '연이 하늘 높이!', '물고기가 뛰어올라요!',
  '시계 숫자판이 빛나요!', '큰 톱니가 돌아요!', '종이 다시 울려요!', '뻐꾸기가 노래해요!', '시계추가 흔들려요!', '시계 바늘이 다시 가요!',
];
/** 장 안에서 몇 번째 판인가 (1부터) */
const inCh = (i: number) => STAGES.slice(0, i + 1).filter((q) => q.ch === STAGES[i].ch).length;
function drawCards(ctx: C2, s: RewState, w: number, v: View, font: (sz: number, w?: number) => void, wv: View) {
  const { R, t } = v;
  let head = '', sub = '', a = 0, age = 0;
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    if (s.ok) head = s.won ? '시계탑이 다시 움직여요!' : '시계 부품을 찾았어요!';
    else (head = '어이쿠!'), (sub = s.hearts > 0 ? `${s.why} · 하트 -1 · 다시 해 봐요` : `${s.why} · 하트가 없어요`);
  } else if (s.banner && t - s.banner.t < 170 && !s.film) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (170 - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (!head || a <= 0) return;
  const okRes = s.phase === 'result' && s.ok;
  const pop = Math.min(1, 0.55 + age / 10);
  ctx.save();
  ctx.globalAlpha = a;
  font(0.056, 900);
  const w1 = ctx.measureText(head).width;
  font(0.036, 800);
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.8) : 0) + R(0.1)), chh = (okRes ? R(0.42) : sub ? R(0.15) : R(0.09)) * pop;
  ctx.translate(w / 2, okRes ? R(0.58) : R(0.36));
  ctx.fillStyle = 'rgba(40,20,50,.35)';
  rr(ctx, -cw / 2 + 3, -chh / 2 + 5, cw, chh, R(0.035));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -chh / 2, 0, chh / 2, [[0, '#fffaf0'], [1, '#ffecd0']]);
  rr(ctx, -cw / 2, -chh / 2, cw, chh, R(0.035));
  ctx.fill();
  ctx.strokeStyle = s.phase === 'result' && !s.ok ? '#8a7aa8' : '#ffb02e';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (okRes) {
    font(0.054, 900);
    ctx.fillStyle = '#c8402a';
    ctx.fillText(head, 0, -chh / 2 + R(0.05), cw - R(0.06));
    const nS = s.starOk.length, fx = juice(s);
    for (let j = 0; j < nS; j++) {
      const ag = s.pt - (14 + j * 14), sx = (j - (nS - 1) / 2) * R(0.1), popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, -chh / 2 + R(0.12), R(0.038) * popS);
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) {
        fx.memo['st' + j] = s.t - ag;
        fx.burst(w / 2 + sx, R(0.58) - chh / 2 + R(0.12), '#ffd23a', 16, 3, 2.4);
        fx.sound('ding', 1 + j * 0.25, 0.8);
      }
    }
    // 모은 부품 줄
    for (let k = 0; k < STAGE_COUNT; k++) {
      const gx = (k - (STAGE_COUNT - 1) / 2) * R(0.044) + (Math.floor(k / 6) - 1) * R(0.012), on = k < s.gears, fresh = k === s.gears - 1;
      const gy = -chh / 2 + R(0.2);
      if (on) brass(ctx, gx, gy - (fresh ? Math.max(0, 1 - s.pt / 30) * R(0.06) : 0), R(fresh ? 0.022 : 0.017), 8, t * 0.03, fresh ? 1 : 0);
      else (ctx.strokeStyle = 'rgba(120,90,60,.35)', ctx.lineWidth = 2, ell(ctx, gx, gy, R(0.014), R(0.014)), ctx.stroke());
    }
    font(0.04, 900);
    ctx.fillStyle = '#3a8a4a';
    const ftxt = `복원: ${FIX_TEXT[s.stage]}`, fw = Math.min(cw - R(0.16), ctx.measureText(ftxt).width);
    ctx.fillText(ftxt, R(0.03), -chh / 2 + R(0.27), cw - R(0.16));
    fixIcon(ctx, s.stage, -fw / 2 - R(0.03), -chh / 2 + R(0.265), R(0.03), t);
    if (s.hintsHere > 0) {
      font(0.028, 800);
      const ht = `힌트 ${s.hintsHere}번`, hw = ctx.measureText(ht).width + R(0.08);
      ctx.fillStyle = 'rgba(255,250,225,.92)';
      rr(ctx, -hw / 2, chh / 2 + R(0.012), hw, R(0.044), R(0.022));
      ctx.fill();
      bulbIcon(ctx, -hw / 2 + R(0.028), chh / 2 + R(0.034), R(0.012), 0.6, t);
      ctx.fillStyle = '#7a5a3a';
      ctx.fillText(ht, R(0.012), chh / 2 + R(0.035));
    }
    if (!s.won) {
      const nd = STAGES[s.stage + 1];
      font(0.033, 800);
      ctx.fillStyle = '#6a4a5a';
      ctx.fillText(`다음: ${nd.name}${nd.news ? ' — 새 장치!' : ''}`, 0, -chh / 2 + R(0.33), cw - R(0.06));
      font(0.03, 700);
      ctx.fillStyle = '#9a7a8a';
      ctx.fillText(`그다음 복원: ${FIX_TEXT[s.stage + 1]}`, 0, -chh / 2 + R(0.377), cw - R(0.06));
    }
  } else {
    font(0.056, 900);
    ctx.fillStyle = s.phase === 'result' ? '#5a4a78' : '#5a2e7a';
    ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
    if (sub) {
      font(0.036, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a3a2a';
      ctx.fillText(sub, 0, R(0.038), w - R(0.08));
    }
  }
  ctx.restore();
  // 새것 스포트라이트
  if (s.spot && s.phase === 'play' && !s.film) {
    const sp = s.spot, ag = t - sp.t, aa = Math.min(1, ag / 10, (200 - ag) / 30);
    if (aa > 0 && ag >= 0) {
      ctx.save();
      ctx.globalAlpha = aa;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ell(ctx, wv.X(sp.x), wv.Y(sp.y), wv.R(sp.r) * (1 + Math.sin(t * 0.15) * 0.05), wv.R(sp.r) * (1 + Math.sin(t * 0.15) * 0.05));
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.032, 900);
      ctx.textAlign = 'center';
      const lx = Math.max(R(0.12), Math.min(w - R(0.12), wv.X(sp.x))), ly = Math.max(R(TOPH + 0.04), wv.Y(sp.y) - wv.R(sp.r) - R(0.03));
      const tw = ctx.measureText('NEW ' + sp.label).width + R(0.04);
      ctx.fillStyle = '#ff5a4a';
      rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEW ' + sp.label, lx, ly + 1);
      ctx.restore();
    }
  }
}
