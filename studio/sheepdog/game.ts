/**
 * 양치기 멍멍 (23라운드: 완전히 다른 장르) — 몰이 × 가리키기(톡) × 턴제화.
 * 기준 9(손이 하는 일은 하나): 목장을 톡 = 강아지가 그 자리로 달려가 '멍!'. 누르고 있는 동안 짖는 원과 양마다 갈 자리가 흐리게 보이고, 떼면 짖는다.
 * 와우: 톡 한 곳에서 '멍!' 하면 양 떼가 반대쪽으로 우르르 달아난다 — 그런데 까만 양 한 마리는 거꾸로 강아지 쪽으로 온다.
 * 규칙(결정적): 짖은 곳에서 가까운 원 안의 양은 곧장 멀어지는 쪽으로 멀리(0.26), 바깥 원 안의 양은 조금(0.14) 달아난다.
 *   함께 놀란 양들은 무리의 평균 방향으로 살짝 쏠린다(뭉침). 울타리·생울타리·다리 난간에 막히면 미끄러지듯 비켜 간다.
 *   울타리 안에 들어간 양은 다시 나오지 않는다. 흰 양을 모두 넣으면 문이 '딸깍' 닫힌다.
 * 판 구조: 판마다 양을 모두 울타리에 넣는다. ★ 다 넣음 · ★ 멍멍을 정해진 수 이하로 · ★ 보너스(꽃밭 안 밟기 / 까만 양도 넣기).
 *   실패(양이 개울에 풍덩 · 늑대에게 잡힘 · 멍멍을 다 씀) = 웃긴 장면 1초 남짓 뒤 그 판만 처음부터(스튜디오 C002: 하트 없음, GDD §4.4).
 *   별은 판마다 셋을 따로 기록해 최고 기록에 합친다(★2·★3을 다른 시도에서 따도 된다, GDD §4.3). 8판을 마치면 끝.
 *   판 배치는 고정(LAYOUT_SEED) — 다시 해도 같은 판이라 배운 게 통한다(GDD §4.5). 언제든 ↺ 다시(Input.retry).
 * 펼쳐짐(하는 일이 바뀐다): 1판 몰기·꽃밭 → 2판 까만 양(거꾸로 와서 '당겨' 온다) → 3판 개울·다리(줄 세워 좁은 길로)
 *   → 4판 기절 염소(놀라면 '꽥' 쓰러져 생울타리 틈을 막는다 — 염소 몰래 짖기) → 5판 늑대(멍멍 한 번은 늑대 쫓기에)
 *   → 6판 바람 언덕(양이 바람 쪽으로 더 밀린다 — 비껴 짖기) → 7판 울타리 둘(리본 색대로 나눠 넣기) → 8판 밤(손전등 둘레만 보인다 + 늑대).
 * 웃음: 놀란 양이 뛰다 데굴 넘어짐 · 염소가 뻣뻣하게 옆으로 쿵 · 한참 안 누르면 강아지가 제 꼬리를 쫓아 뱅뱅 ·
 *   다 넣으면 양들이 울타리 안에서 폴짝폴짝 · 언덕 위 목동 할아버지가 모자를 흔들거나 이마를 짚는다(졸기도 한다).
 */
import type { Cue } from './sfx.ts';
import { mulberry32, type Rng } from './rng.ts';
import type { Bot, GameDef, Input, Theme } from './core.ts';
import { juice, type PopOpt } from './juice.ts';
import { drawIcon, type IconKind } from './art.ts';

const A = 1.36;
// ───────── 목장 좌표: x 0~1 (왼→오), y 0~1 (먼 언덕 → 가까운 쪽) ─────────
/** 양 몸 반지름(부딪힘) · 울타리 두께의 반 */
const SR = 0.026, WT = 0.008;
/** 짖는 원: 가까운 원(멀리 달아남) · 바깥 원(조금) */
export const R_IN = 0.13, R_OUT = 0.26, D_IN = 0.26, D_OUT = 0.14;
/** 함께 놀란 양이 무리 평균 방향으로 쏠리는 정도 */
const COH = 0.6;
const STEP = 0.01, BLACK_STOP = 0.045;
const WOLF_STEP = 0.13, WOLF_CATCH = 0.075, GOAT_R = 0.03, FAINT = 3;
const DOG_SPEED = 0.05, FLEE_T = 40, RESULT_FAIL = 60;
/** 통과 결과 카드는 이만큼 지난 뒤부터 '다음'을 받는다(별이 켜지는 동안 실수로 넘기지 않게) */
export const RESULT_MIN = 20;
/** 까만 양이 강아지 쪽으로 온 짖기는 결과를 이만큼(약 0.5초) 늦게 낸다 — '?!'가 통과 축하에 묻히지 않게 (C006, FUN QA C005) */
export const COME_HOLD = 30;
/** 이번 짖기에 까만 양이 거꾸로 왔나 */
export const blackCame = (s: DogState) => !!s.rec && s.rec.scare.some((v, i) => v === 3 && s.F.black[i]);
/** 까만 양이 온 짖기가 판을 끝내는가 — 그때만 0.5초 멈춘다(C006 FUN QA: 당길 때마다 멈추면 입력이 막힌다) */
export const comeHold = (s: DogState) => blackCame(s) && allIn(s.F, s.S, STAGES[s.stage]);
/** 판을 깰 만큼 다 들었나: 흰 양 모두 + (까만 양 필수 판이면) 까만 양도 (📐 C014) */
export const allIn = (F: Field, S: Sim, d: StageDef | undefined) => F.black.every((b, i) => (b && !d?.needBlack) || S.pen[i] >= 0);
const STAR_PTS = 100, WIN_PTS = 100;

interface Seg { x0: number; y0: number; x1: number; y1: number }
interface Pen { x0: number; y0: number; x1: number; y1: number; gx0: number; gx1: number; tag: number; mat?: number }
interface River { y0: number; y1: number; bx0: number; bx1: number }
interface FlowerBed { x: number; y: number; r: number }
type Bonus = 'flower' | 'black' | 'clover';

/** 판 하나의 변하지 않는 것들 (봇이 내다볼 때도 같은 것) */
interface Field {
  n: number; black: boolean[]; tag: number[];
  walls: Seg[]; hedges: Seg[]; fences: Seg[]; block: Seg[][]; pens: Pen[]; river: River | null; flowers: FlowerBed[]; clovers: FlowerBed[];
  goat: { x: number; y: number } | null; den: [number, number] | null; wind: [number, number]; night: boolean;
  dist: Float32Array[];
}
/** 판의 움직이는 것들 (복사해서 내다본다) */
interface Sim {
  x: number[]; y: number[]; pen: number[]; fell: number[]; fh: number[]; ch: number[];
  goatF: number; wx: number; wy: number; used: number; caught: number; dx: number; dy: number;
}
/** 한 번 짖은 결과 (연출·미리 보기용) */
interface Rec {
  path: (number[] | null)[]; penAt: number[]; fellAt: number[]; scare: number[]; trip: boolean[];
  goatFaint: boolean; wolf: 0 | 1 | 2; wolfPath: number[] | null; caught: number; flowerNew: number[]; cloverNew: number[]; inNew: number[];
}

/** needBlack (📐 C014, F01): 까만 양까지 울타리에 넣어야 통과 — 1-4부터 하나의 규칙 '양을 모두'. 🖤 보너스는 없어진다 */
interface StageDef { key: string; name: string; news: string; max: number; par: number; bonus: Bonus; needBlack?: boolean; build(r: Rng): Layout }
interface Layout {
  pens: Pen[]; river?: River; hedges?: Seg[]; fences?: Seg[]; flowers: FlowerBed[]; clovers?: FlowerBed[]; sheep: { x: number; y: number; black?: boolean; tag?: number }[];
  goat?: { x: number; y: number }; den?: [number, number]; wind?: [number, number]; night?: boolean;
}

const jit = (r: Rng, a: number) => (r() - 0.5) * 2 * a;
const PEN0 = (): Pen => ({ x0: 0.31, y0: 0.04, x1: 0.69, y1: 0.22, gx0: 0.38, gx1: 0.62, tag: 0 });
const flock = (r: Rng, cx: number, cy: number, offs: number[][], j = 0.012) => offs.map(([dx, dy]) => ({ x: cx + dx + jit(r, j), y: cy + dy + jit(r, j) }));
const FIVE = [[-0.075, 0], [0.075, 0], [0, -0.04], [-0.04, 0.065], [0.045, 0.065]];

/** 공장 프로토타입 판 8개(P1~P8). C003부터 W1은 CONTENT.md 표대로 다시 짰고, P4~P8은 W2~W5에서 쓴다(LATER) */
const PROTO: StageDef[] = [
  {
    key: 'start', name: '첫 울타리', news: '🐑 양 뒤를 톡 — 짖으면 양이 반대쪽으로!', max: 9, par: 1, bonus: 'flower',
    build: (r) => ({
      pens: [{ x0: 0.2, y0: 0.04, x1: 0.8, y1: 0.26, gx0: 0.2, gx1: 0.8, tag: 0, mat: 0.15 }],
      flowers: [{ x: 0.25, y: 0.35, r: 0.05 }, { x: 0.75, y: 0.35, r: 0.05 }],
      sheep: flock(r, 0.5 + jit(r, 0.015), 0.32, [[-0.075, 0], [0.075, 0], [0, -0.03], [-0.04, 0.04], [0.045, 0.04]], 0.006),
    }),
  },
  {
    key: 'black', name: '까만 양', news: '🖤 까만 양 — 짖으면 거꾸로 강아지에게 와요!', max: 9, par: 3, bonus: 'black',
    build: (r) => {
      const left = r() < 0.5, bx = left ? 0.24 : 0.76;
      return {
        pens: [{ ...PEN0(), x0: 0.28, x1: 0.72, gx0: 0.32, gx1: 0.68, mat: 0.14 }],
        flowers: [{ x: left ? 0.8 : 0.2, y: 0.32, r: 0.06 }],
        sheep: [...flock(r, 0.5 + jit(r, 0.02), 0.29, [[-0.07, 0], [0.07, 0], [0, -0.025], [-0.035, 0.035], [0.04, 0.035]], 0.006), { x: bx + jit(r, 0.03), y: 0.56 + jit(r, 0.03), black: true }],
      };
    },
  },
  {
    key: 'river', name: '개울과 다리', news: '🌉 개울 — 빠지면 풍덩! 다리로 건너요', max: 8, par: 4, bonus: 'flower',
    build: (r) => ({
      pens: [PEN0()],
      river: { y0: 0.4, y1: 0.5, bx0: 0.41, bx1: 0.59 },
      flowers: [{ x: 0.26 + jit(r, 0.02), y: 0.31, r: 0.06 }, { x: 0.74 + jit(r, 0.02), y: 0.31, r: 0.06 }],
      sheep: flock(r, 0.5 + jit(r, 0.06), 0.68, [[-0.12, 0], [0.12, 0], [0, -0.03], [-0.05, 0.08], [0.06, 0.08]]),
    }),
  },
  {
    key: 'goat', name: '기절 염소', news: '🐐 염소 — 놀라면 꽥! 쓰러져 길을 막아요', max: 9, par: 4, bonus: 'flower',
    build: (r) => {
      const side = r() < 0.5 ? -1 : 1;
      return {
        pens: [PEN0()],
        hedges: [{ x0: 0, y0: 0.42, x1: 0.33, y1: 0.42 }, { x0: 0.67, y0: 0.42, x1: 1, y1: 0.42 }],
        goat: { x: 0.5 + 0.07 * side, y: 0.42 },
        flowers: [{ x: 0.5 - 0.2 * side, y: 0.33, r: 0.055 }],
        sheep: flock(r, 0.5 + jit(r, 0.06), 0.68, FIVE),
      };
    },
  },
  {
    key: 'wolf', name: '늑대', news: '🐺 늑대 — 멍멍마다 한 걸음씩 다가와요!', max: 9, par: 5, bonus: 'flower',
    build: (r) => ({
      pens: [PEN0()],
      den: [0.035, 0.66],
      flowers: [{ x: 0.24 + jit(r, 0.02), y: 0.33, r: 0.06 }, { x: 0.76 + jit(r, 0.02), y: 0.33, r: 0.06 }],
      sheep: flock(r, 0.6 + jit(r, 0.03), 0.66 + jit(r, 0.03), [[-0.16, 0.02], [0.14, 0], [0, -0.06], [-0.07, 0.1], [0.08, 0.12]]),
    }),
  },
  {
    key: 'wind', name: '바람 언덕', news: '🌬️ 바람 — 양이 바람 쪽으로 더 밀려요', max: 10, par: 7, bonus: 'black',
    build: (r) => {
      const dir = r() < 0.5 ? 1 : -1;
      return {
        pens: [PEN0()],
        river: { y0: 0.4, y1: 0.5, bx0: 0.41, bx1: 0.59 },
        wind: [0.06 * dir, 0],
        flowers: [{ x: 0.5 + 0.3 * dir, y: 0.28, r: 0.06 }],
        sheep: [...flock(r, 0.5 - 0.08 * dir + jit(r, 0.04), 0.68, FIVE), { x: 0.5 - 0.2 * dir + jit(r, 0.03), y: 0.88 + jit(r, 0.02), black: true }],
      };
    },
  },
  {
    key: 'twopens', name: '울타리 둘', news: '🎀 울타리 둘 — 리본 색과 같은 울타리로!', max: 11, par: 6, bonus: 'flower',
    build: (r) => {
      const offs = [[-0.15, -0.02], [-0.05, 0.03], [0.05, -0.03], [0.15, 0.02], [-0.09, 0.1], [0.09, 0.1]];
      const tags = r() < 0.5 ? [1, 2, 1, 2, 1, 2] : [1, 1, 2, 2, 2, 1];
      return {
        pens: [
          { x0: 0.04, y0: 0.04, x1: 0.4, y1: 0.22, gx0: 0.11, gx1: 0.33, tag: 1 },
          { x0: 0.6, y0: 0.04, x1: 0.96, y1: 0.22, gx0: 0.67, gx1: 0.89, tag: 2 },
        ],
        flowers: [{ x: 0.5, y: 0.2, r: 0.065 }],
        sheep: offs.map(([dx, dy], k) => ({ x: 0.5 + dx + jit(r, 0.015), y: 0.58 + dy + jit(r, 0.015), tag: tags[k] })),
      };
    },
  },
  {
    key: 'night', name: '밤 목장', news: '🔦 밤 — 손전등 둘레만 보여요. 늑대 조심!', max: 10, par: 6, bonus: 'black',
    build: (r) => {
      const left = r() < 0.5;
      return {
        pens: [PEN0()],
        den: [left ? 0.965 : 0.035, 0.6],
        night: true,
        flowers: [],
        sheep: [...flock(r, 0.5 + jit(r, 0.04), 0.62, [[-0.12, 0], [0.12, 0], [0, -0.04], [-0.06, 0.08], [0.07, 0.08]]), { x: (left ? 0.62 : 0.38) + jit(r, 0.03), y: 0.88 + jit(r, 0.02), black: true }],
      };
    },
  },
];
const P = (key: string) => PROTO.find((d) => d.key === key)!;
/** 앞이 다 열린 울타리 (W1 앞쪽 판: 문 옆 짧은 벽에 양이 눌려 꼼짝 못 하던 문제, C003) */
const WIDE = (mat = 0.12): Pen => ({ ...PEN0(), x0: 0.3, x1: 0.7, gx0: 0.3, gx1: 0.7, mat });
const RIVER = (bx0 = 0.41, bx1 = 0.59): River => ({ y0: 0.4, y1: 0.5, bx0, bx1 });
/** W1 아침 들판 (CONTENT.md W1, C003): 몰기 → 🖤 당기기 → 🌉 줄 세우기. 소개 판은 1-1·1-2·1-4·1-6 */
export const STAGES: StageDef[] = [
  P('start'),
  {
    key: 'preview', name: '미리 보기', news: '👆 누르고 있으면 양이 갈 자리가 보여요', max: 9, par: 1, bonus: 'flower',
    // 📐 C003: 1-1을 뒤집은 모양 — 두 무리가 앞마당 양끝, 꽃밭은 가운데. 가운데 아래서 짖으면 다 쏙, 옆에서 짖으면 꽃밭을 가로지른다
    build: (r) => ({
      pens: [{ x0: 0.2, y0: 0.04, x1: 0.8, y1: 0.26, gx0: 0.2, gx1: 0.8, tag: 0, mat: 0.15 }],
      flowers: [{ x: 0.5, y: 0.4, r: 0.07 }],
      sheep: [[0.27, 0.33], [0.33, 0.37], [0.3, 0.39], [0.67, 0.37], [0.73, 0.33]].map(([x, y]) => ({ x: x + jit(r, 0.006), y: y + jit(r, 0.006) })),
    }),
  },
  {
    key: 'scatter', name: '흩어진 양', news: '🐑 가까이서 짖으면 멀리, 바깥 원은 조금!', max: 7, par: 3, bonus: 'clover', // 📐 C015: max 9 → 7, 🍀 왼쪽 위로(습관 0.40·보너스 0.15·폭 0.17)
    build: (r) => ({
      pens: [WIDE()],
      flowers: [],
      clovers: [{ x: 0.22, y: 0.42, r: 0.05 }],
      // C012 M1-7 ② 2차(📐 C012 우선순위: 막힘 0 > ±3px 박사 ★3 ≥ 0.7 > 그리디 par+1(정확·정수 px)). 손 떨림 ★3 0.98·그리디 4(par+1)·정수 px 4·par 이하 0
      sheep: [[0.272, 0.568], [0.358, 0.6], [0.692, 0.534], [0.701, 0.523], [0.528, 0.633]].map(([x, y]) => (r(), r(), { x, y })),
    }),
  },
  {
    ...P('black'),
    news: '🖤 까만 양도 넣어야 통과예요!', // 📐 C014(F01): 1-4부터 까만 양 필수 — 놀람(거꾸로 옴)은 여전히 미리 말하지 않는다(📐 C007)
    needBlack: true, bonus: 'flower', par: 2, // 🖤 보너스 → 🌼 꽃밭(까만 양 반대쪽 0.8|0.2, 0.32, r 0.06), par 3 → 2(박사 2)
    // 📐 C003: 꽃밭은 🌼 판에만 · C005(FUN QA C003): 까만 양을 흰 무리 바로 옆으로 — 첫 짖기에 '?!'을 꼭 겪게(순진 근사 0.30 → 목표 0.9)
    build: (r) => {
      const L = P('black').build(r), b = L.sheep.find((q) => q.black)!;
      (b.x = b.x < 0.5 ? 0.36 : 0.64), (b.y = 0.47);
      return L;
    },
  },
  {
    key: 'pull', name: '끌어오기', news: '🖤 까만 양을 부르면 흰 양은 달아나요', max: 9, par: 4, bonus: 'clover', needBlack: true,
    // C014 F01-a(📐 C014): 까만 양까지 넣어야 통과 · 보너스는 par 길 밖 🍀(울타리 오른쪽 위) — 끌어오기와 다툰다(★2 vs ★3). 까만 양이 흰 무리 바로 위(길목)
    build: () => ({
      pens: [WIDE()],
      flowers: [],
      clovers: [{ x: 0.711, y: 0.369, r: 0.045 }],
      sheep: [...[[0.481, 0.728], [0.475, 0.759], [0.471, 0.729], [0.528, 0.721]].map(([x, y]) => ({ x, y })), { x: 0.523, y: 0.609, black: true }],
    }),
  },
  {
    ...P('river'),
    news: '🌉 옆에서 짖어 한 줄로 → 다리로',
    // C004 (FUN QA C003): 무리 폭을 다리 폭에 맞춘다 (가로 ±0.12 → ±0.065) — '양 뒤에서 문 쪽' 습관이 매번 풍덩하던 절벽
    build: (r) => ({ ...P('river').build(r), sheep: flock(r, 0.5 + jit(r, 0.06), 0.68, [[-0.065, 0], [0.065, 0], [0, -0.03], [-0.05, 0.08], [0.06, 0.08]]) }),
  },
  {
    // 📐 C004 ⑥ 대비책(C005): 🖤 판으로 바꿔 보니 박사가 까만 양을 먼저 넣은 뒤 흰 양에 멍멍을 다 써서(8판 시드 모두 9번) 🏅가 안 나왔다
    //   → 정한 대비책 '좁은 다리 + 🍀'. 클로버는 다리→문 지름길 밖(저절로 따지지 않게, 📐 C003)
    key: 'narrow', name: '좁은 다리', news: '🌉 좁은 다리 — 한 줄로 세워 건너요', max: 9, par: 5, bonus: 'clover', // 📐 C015: 🍀를 다리 위 지름길 → 개울 아래 왼쪽(par 길 밖), par 4 → 5(박사 4, 폭 0.39)
    build: (r) => {
      r(); // 예전 까만 양 자리를 정하던 난수 — 배치 시드(LAYOUT_SEED)를 그대로 쓰려고 하나 버린다
      return {
        pens: [PEN0()],
        river: RIVER(0.43, 0.57),
        flowers: [],
        // 클로버를 지름길 밖(0.5±0.2, 0.3)에 두면 박사가 par도 🍀도 못 땄다(C005 시드 12개) → 다리 위로 되돌림. '저절로 따지는 🍀'는 ❌로 공개(M1-7)
        clovers: [{ x: 0.35, y: 0.75, r: 0.04 }],
        sheep: flock(r, 0.5 + jit(r, 0.05), 0.7, FIVE),
      };
    },
  },
  {
    key: 'fest', name: '아침 축제', news: '🎉 아침 축제 — 오늘 배운 걸 다 써요!', max: 14, par: 6, bonus: 'clover', needBlack: true, // 🧪 C015 ①: max 12 → 14(끝판 실패가 지루한 '멍멍 다 씀' — 별은 그대로) · 📐 C015: 까만 양 필수(1-4부터 하나의 규칙) · 🍀 문 오른쪽 아래(0.69, 0.30) · par 7 → 6(박사 6)
    build: (r) => {
      const side = r() < 0.5 ? -1 : 1;
      return {
        pens: [PEN0()],
        river: RIVER(),
        flowers: [],
        clovers: [{ x: 0.69, y: 0.3, r: 0.045 }], // 🎨 C015 ⚠️: (0.68, 0.28)은 울타리 기둥과 3px — 기둥 장식처럼 읽힘 → 아래로(0.70·0.30은 박사 ★2)
        sheep: [
          // 📐 C005 (가): 흰 양 7마리 그대로, 무리 폭을 다리 폭에 맞춰 세 줄로(±0.15 → ±0.065) — 어려움은 '섞는 순서'에서, 손끝 정밀에서가 아니라
          ...flock(r, 0.5 + jit(r, 0.03), 0.66, [[-0.03, -0.035], [0.03, -0.035], [-0.065, 0.03], [0, 0.03], [0.065, 0.03], [-0.035, 0.1], [0.035, 0.1]]),
          { x: 0.5 + 0.3 * side + jit(r, 0.02), y: 0.86 + jit(r, 0.02), black: true },
        ],
      };
    },
  },
];
/** 다음 월드에서 쓸 프로토타입 판 (P4 염소 · P5 늑대 · P6 바람 · P7 울타리 둘 · P8 밤) */
export const LATER: StageDef[] = PROTO.filter((d) => !STAGES.some((w) => w.key === d.key));
export const STAGE_COUNT = STAGES.length;
/** 판마다 고정 배치 시드 (C002: 숙련 봇이 별 셋을 모두 딸 수 있는 배치로 골랐다 — tests/studio-sheepdog.test.ts가 지킨다) */
export const LAYOUT_SEED = [1, 1, 1, 1, 2, 1, 19, 20];
/** 별 비트: 1 다 넣기 · 2 멍멍 par 이하 · 4 보너스 */
/** 판 보너스(★3): 🌼 꽃밭 안 밟기 · 🖤 까만 양도 넣기 · 🍀 흰 양이 클로버 지나가기 (GDD §4.3) */
function bonusMet(F: Field, S: Sim, d: StageDef) {
  if (d.bonus === 'black') return F.black.some((b, i) => b && S.pen[i] >= 0);
  if (d.bonus === 'clover') return S.ch.some((v) => v);
  return !S.fh.some((v) => v);
}
const BONUS_LABEL: Record<Bonus, string> = { flower: '꽃밭 안 밟기', black: '까만 양도', clover: '클로버 밟기' };
/** 🏅 '한 번에!' (📐 C003·C004): 한 시도에 ★★★(깃발 도움 없이) = gold, 나눠 모은 ★★★ = grey, 아니면 none. 별 수에는 안 센다 */
export const medalOf = (s: DogState): 'gold' | 'grey' | 'none' =>
  s.phase === 'result' && s.ok && s.got === 7 && !s.helped ? 'gold' : s.best[s.stage] === 7 ? 'grey' : 'none';
/** HUD(DOM)가 그릴 것 — 결과 카드와 같은 소스에서 (🎨 C008: 칩 문구와 카드 캡션이 갈리지 않게) */
export function goalLabels(d: StageDef) {
  return ['다 넣기', `멍멍 ${d.par}번`, BONUS_LABEL[d.bonus]];
}
export interface HudState { stage: number; name: string; stars: number; max: number; par: number; used: number; sheepIn: number; sheepN: number; blackIn: number; blackN: number; goals: { label: string; st: 'on' | 'had' | 'off' | 'wait' }[]; hint: string | null; news: string | null; card: boolean }
/** 지금 화면에서 울타리에 든 양인가 — 달아나는 동안엔 길에서 울타리에 닿은 양만 (🎨 C011: 양 수가 짖는 틱에 미리 5/5로 튐 → 쏙!과 함께 하나씩) */
function inNow(s: DogState, i: number) {
  const fl = s.phase === 'flee' && s.rec ? s.rec : null, pa = fl?.path[i];
  if (s.S.pen[i] < 0) return false;
  if (!fl || !pa || fl.penAt[i] < 0) return true;
  return ease(Math.min(1, s.pt / FLEE_T)) * (pa.length / 2 - 1) >= fl.penAt[i];
}
export function hudState(s: DogState): HudState {
  const d = STAGES[s.stage], F = s.F, S = s.S, allIn = s.phase === 'result' && s.ok, bonusOk = bonusMet(F, S, d);
  const now: (boolean | null)[] = [
    allIn ? true : null,
    S.used > d.par ? false : allIn ? true : null,
    d.bonus === 'flower' && !bonusOk ? false : bonusOk && (allIn || d.bonus !== 'flower') ? true : allIn ? false : null,
  ];
  const goals = goalLabels(d).map((label, k) => {
    const st = now[k], had = ((s.best[s.stage] >> k) & 1) === 1;
    return { label, st: st === true ? ('on' as const) : had ? ('had' as const) : st === false ? ('off' as const) : ('wait' as const) };
  });
  // 안내문 줄은 없앴다(🎨 §12-5, C009): 1-1·1-2는 캔버스 손 아이콘, 깃발 말은 할아버지 말풍선으로
  // 📐 C014: 흰 양만 다 들고 까만 양이 남으면 할아버지 말풍선이 그동안 내내 말한다(🧪 C014: 알림 줄로는 3초 늦고, 판에 바로 들어가면 빠졌다)
  const wantBlack = !!d.needBlack && s.phase === 'aim' && F.black.every((b, i) => b || S.pen[i] >= 0) && F.black.some((b, i) => b && S.pen[i] < 0);
  const hint = wantBlack ? '🖤 까만 양도 넣어야 통과 — 짖는 쪽으로 와요' : s.flags.length && s.phase === 'aim' && s.t - s.startT >= INTRO_T ? `할아버지 깃발 ${s.flags.length === 2 ? '①' : '②'} 자리에서 짖어 보렴` : null;
  const nW = F.black.filter((b) => !b).length;
  return {
    stage: s.stage, name: d.name, stars: s.stars, max: d.max, par: d.par, used: S.used,
    sheepIn: F.black.filter((b, i) => !b && inNow(s, i)).length, sheepN: nW, goals, hint,
    // 까만 양 필수 판(📐 C014): 알약 끝에 까만 양 칸 — 아니면 0
    blackN: d.needBlack ? F.black.filter((b) => b).length : 0, blackIn: d.needBlack ? F.black.filter((b, i) => b && inNow(s, i)).length : 0,
    // 까만 양 필수 말풍선이 떠야 할 때는 같은 뜻의 까만 양 설명(BLACK_TIP)보다 먼저 (말풍선은 news ?? hint 순)
    news: s.news && s.t - s.news.t < NEWS_T + 20 && !(wantBlack && s.news.text === BLACK_TIP) ? s.news.text : null, card: allIn,
  };
}
export const starCount = (mask: number) => (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1);

// ───────── 부딪힘 ─────────
function pushSeg(p: number[], g: Seg, rad: number) {
  const vx = g.x1 - g.x0, vy = g.y1 - g.y0, L2 = vx * vx + vy * vy;
  let u = L2 > 0 ? ((p[0] - g.x0) * vx + (p[1] - g.y0) * vy) / L2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const cx = g.x0 + vx * u, cy = g.y0 + vy * u, dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy);
  if (d >= rad) return;
  if (d < 1e-9) return void (p[1] = cy + rad);
  p[0] = cx + (dx / d) * rad;
  p[1] = cy + (dy / d) * rad;
}
function pushCircle(p: number[], x: number, y: number, rad: number) {
  const dx = p[0] - x, dy = p[1] - y, d = Math.hypot(dx, dy);
  if (d >= rad) return;
  if (d < 1e-9) return void (p[1] = y + rad);
  p[0] = x + (dx / d) * rad;
  p[1] = y + (dy / d) * rad;
}
const goatSeg = (F: Field): Seg => ({ x0: F.goat!.x - 0.07, y0: F.goat!.y, x1: F.goat!.x + 0.07, y1: F.goat!.y });
function collide(F: Field, goatF: number, tag: number, p: number[]) {
  for (let it = 0; it < 2; it++) {
    for (const g of F.walls) pushSeg(p, g, SR + WT);
    if (tag) for (const g of F.block[tag]) pushSeg(p, g, SR + WT);
    if (F.goat) goatF > 0 ? pushSeg(p, goatSeg(F), SR + 0.014) : pushCircle(p, F.goat.x, F.goat.y, SR + GOAT_R);
  }
  p[0] = Math.max(0.03, Math.min(0.97, p[0]));
  p[1] = Math.max(topOf(F), Math.min(0.975, p[1]));
}
/** 목장 위 경계 (📐 C012 ⓐ): 울타리 뒤 가로대 + 양 몸 두께. 0.025였을 때는 경계가 울타리 밀어내기를 이겨 양이 가로대 뒤로 끼었다(🧪 C011 1-5) */
export const topOf = (F: Field) => Math.max(0.025, Math.min(...F.pens.map((p) => p.y0)) + SR + WT);
const wet = (F: Field, x: number, y: number) => !!F.river && y > F.river.y0 && y < F.river.y1 && !(x > F.river.bx0 && x < F.river.bx1);
function penOf(F: Field, tag: number, x: number, y: number) {
  for (let k = 0; k < F.pens.length; k++) {
    const p = F.pens[k];
    if ((!p.tag || p.tag === tag) && x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1) return k;
  }
  return -1;
}

/** 문 앞 흙자리: 여기 멈춘 양은 알아서 쏙 들어간다. 문기둥에 몸이 걸친 양도(C003: 기둥에 걸려 영영 못 들어가던 버그) */
const MAT = 0.1, POST = SR;
function matOf(F: Field, tag: number, x: number, y: number) {
  for (let k = 0; k < F.pens.length; k++) {
    const p = F.pens[k];
    if ((!p.tag || p.tag === tag) && x > p.gx0 - POST && x < p.gx1 + POST && y >= p.y1 && y < p.y1 + (p.mat ?? MAT)) return k;
  }
  return -1;
}

function makeField(L: Layout): Field {
  const walls: Seg[] = [];
  for (const p of L.pens) {
    walls.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y0 }, { x0: p.x0, y0: p.y0, x1: p.x0, y1: p.y1 }, { x0: p.x1, y0: p.y0, x1: p.x1, y1: p.y1 });
    walls.push({ x0: p.x0, y0: p.y1, x1: p.gx0, y1: p.y1 }, { x0: p.gx1, y0: p.y1, x1: p.x1, y1: p.y1 });
  }
  if (L.river) {
    const rv = L.river;
    walls.push({ x0: rv.bx0, y0: rv.y0 - 0.012, x1: rv.bx0, y1: rv.y1 + 0.012 }, { x0: rv.bx1, y0: rv.y0 - 0.012, x1: rv.bx1, y1: rv.y1 + 0.012 });
  }
  for (const h of L.hedges ?? []) walls.push(h);
  for (const h of L.fences ?? []) walls.push(h);
  // 리본 색이 다른 울타리의 문은 그 양에게 벽이다
  const block: Seg[][] = [[], [], []];
  for (const p of L.pens) if (p.tag) for (let tg = 1; tg <= 2; tg++) if (tg !== p.tag) block[tg].push({ x0: p.gx0, y0: p.y1, x1: p.gx1, y1: p.y1 });
  const F: Field = {
    n: L.sheep.length, black: L.sheep.map((q) => !!q.black), tag: L.sheep.map((q) => q.tag ?? 0),
    walls, hedges: L.hedges ?? [], fences: L.fences ?? [], block, pens: L.pens, river: L.river ?? null, flowers: L.flowers, clovers: L.clovers ?? [],
    goat: L.goat ?? null, den: L.den ?? null, wind: L.wind ?? [0, 0], night: !!L.night, dist: [],
  };
  for (let tg = 0; tg <= 2; tg++) F.dist.push(distField(F, tg));
  return F;
}

// ───────── 짖기 한 번 (결정적, 봇이 내다볼 때도 같은 함수) ─────────
function cloneSim(a: Sim): Sim {
  return { ...a, x: a.x.slice(), y: a.y.slice(), pen: a.pen.slice(), fell: a.fell.slice(), fh: a.fh.slice(), ch: a.ch.slice() };
}
const hash2 = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 울타리 안의 빈자리 (들어간 양이 걸어가 서는 곳) */
function slotFor(F: Field, S: Sim, k: number, x: number, y: number, i: number): [number, number] {
  const p = F.pens[k];
  let best: [number, number] = [x, y], bd = 1e9;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 4; c++) {
      const sx = p.x0 + ((c + 0.5 + (r ? 0.35 : -0.1)) / 4) * (p.x1 - p.x0), sy = p.y0 + ((r + 0.5) / 2) * (p.y1 - p.y0);
      let taken = false;
      for (let j = 0; j < F.n; j++) if (j !== i && S.pen[j] === k && Math.abs(S.x[j] - sx) < 0.02 && Math.abs(S.y[j] - sy) < 0.02) taken = true;
      const d = (sx - x) ** 2 + (sy - y) ** 2 + (taken ? 10 : 0);
      if (d < bd) (bd = d), (best = [sx, sy]);
    }
  return best;
}

/** 짖으면 누가 놀라나? (아무도 없으면 강아지는 킁킁 냄새만 맡고 멍멍을 안 쓴다) */
export function anyone(F: Field, S: Sim, px: number, py: number) {
  for (let i = 0; i < F.n; i++) if (S.pen[i] < 0 && !S.fell[i] && Math.hypot(S.x[i] - px, S.y[i] - py) < R_OUT) return true;
  if (F.den && Math.hypot(S.wx - px, S.wy - py) < R_OUT) return true;
  return !!F.goat && Math.hypot(F.goat.x - px, F.goat.y - py) < R_OUT;
}

export function resolve(F: Field, S: Sim, px: number, py: number, rec?: Rec) {
  S.used++;
  const n = F.n;
  if (F.goat && Math.hypot(F.goat.x - px, F.goat.y - py) < R_OUT) {
    S.goatF = FAINT;
    if (rec) rec.goatFaint = true;
  }
  const ux = new Array<number>(n).fill(0), uy = new Array<number>(n).fill(0), amt = new Array<number>(n).fill(0);
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) {
    if (S.pen[i] >= 0 || S.fell[i]) continue;
    const dx = S.x[i] - px, dy = S.y[i] - py, d = Math.hypot(dx, dy);
    if (d >= R_OUT) continue;
    const far = d < R_IN ? D_IN : D_OUT;
    if (rec) rec.scare[i] = F.black[i] ? 3 : d < R_IN ? 2 : 1;
    if (F.black[i]) {
      if (d < 1e-6) continue;
      ux[i] = -dx / d;
      uy[i] = -dy / d;
      amt[i] = Math.max(0, d - BLACK_STOP);
    } else {
      ux[i] = d < 1e-6 ? 0 : dx / d;
      uy[i] = d < 1e-6 ? -1 : dy / d;
      amt[i] = far;
      mx += ux[i];
      my += uy[i];
    }
  }
  const ml = Math.hypot(mx, my);
  if (ml > 1e-6) (mx /= ml), (my /= ml);
  const before = S.pen.slice(), x0 = S.x.slice(), y0 = S.y.slice();
  const p = [0, 0];
  for (let i = 0; i < n; i++) {
    if (amt[i] <= 0) continue;
    let vx = ux[i], vy = uy[i];
    if (!F.black[i]) {
      vx += COH * mx;
      vy += COH * my;
      const vl = Math.hypot(vx, vy) || 1;
      vx /= vl;
      vy /= vl;
    }
    const tx = vx * amt[i] + F.wind[0], ty = vy * amt[i] + F.wind[1];
    const L = Math.hypot(tx, ty), steps = Math.max(1, Math.ceil(L / STEP)), sx = tx / steps, sy = ty / steps;
    const path = rec ? [S.x[i], S.y[i]] : null;
    let x = S.x[i], y = S.y[i];
    for (let k = 0; k < steps; k++) {
      p[0] = x + sx;
      p[1] = y + sy;
      collide(F, S.goatF, F.tag[i], p);
      x = p[0];
      y = p[1];
      if (path) path.push(x, y);
      for (let f = 0; f < F.flowers.length; f++)
        if (!S.fh[f] && Math.hypot(x - F.flowers[f].x, y - F.flowers[f].y) < F.flowers[f].r) {
          S.fh[f] = 1;
          if (rec) rec.flowerNew.push(f);
        }
      for (let c = 0; c < F.clovers.length; c++)
        if (!S.ch[c] && !F.black[i] && Math.hypot(x - F.clovers[c].x, y - F.clovers[c].y) < F.clovers[c].r + SR) { // 몸이 닿으면 (📐 C003: 애매하면 플레이어 편)
          S.ch[c] = 1;
          if (rec) rec.cloverNew.push(c);
        }
      if (wet(F, x, y)) {
        S.fell[i] = 1;
        if (rec) rec.fellAt[i] = path!.length / 2 - 1;
        break;
      }
      if (S.pen[i] < 0) {
        const k2 = penOf(F, F.tag[i], x, y);
        if (k2 >= 0) {
          S.pen[i] = k2;
          if (rec) rec.penAt[i] = path!.length / 2 - 1;
        } else {
          // 앞마당(문 앞 흙자리)은 울타리 땅이다 — 지나가기만 해도 쏙 (GDD §10-1, C003: 문 앞을 미끄러져 지나치던 양)
          const km = matOf(F, F.tag[i], x, y);
          if (km >= 0) {
            S.pen[i] = km;
            if (rec) rec.penAt[i] = path!.length / 2 - 1;
            break;
          }
        }
      }
    }
    S.x[i] = x;
    S.y[i] = y;
    if (rec) rec.path[i] = path;
    if (rec && rec.scare[i] === 2 && !S.fell[i] && S.pen[i] < 0 && hash2(i + 1, S.used) < 0.35) rec.trip[i] = true;
  }
  // 겹친 양은 살짝 비켜 선다 (밖에 있는 양끼리)
  for (let it = 0; it < 3; it++)
    for (let i = 0; i < n; i++) {
      if (S.pen[i] >= 0 || S.fell[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (S.pen[j] >= 0 || S.fell[j]) continue;
        let dx = S.x[j] - S.x[i], dy = S.y[j] - S.y[i];
        const d = Math.hypot(dx, dy);
        if (d >= SR * 2) continue;
        if (d < 1e-6) (dx = 1), (dy = 0);
        else (dx /= d), (dy /= d);
        const o = (SR * 2 - Math.max(d, 1e-6)) / 2;
        for (const [k, sg] of [[i, -1], [j, 1]] as const) {
          p[0] = S.x[k] + dx * o * sg;
          p[1] = S.y[k] + dy * o * sg;
          collide(F, S.goatF, F.tag[k], p);
          if (wet(F, p[0], p[1])) continue;
          S.x[k] = p[0];
          S.y[k] = p[1];
          const k2 = penOf(F, F.tag[k], p[0], p[1]);
          if (k2 >= 0) S.pen[k] = k2;
        }
      }
    }
  // 문 앞 흙자리에서 놀란 양은 쏙 들어간다
  for (let i = 0; i < n; i++) if (amt[i] > 0 && S.pen[i] < 0 && !S.fell[i]) {
    const k = matOf(F, F.tag[i], S.x[i], S.y[i]);
    if (k >= 0) {
      if (rec && rec.path[i]) rec.penAt[i] = rec.path[i]!.length / 2 - 1;
      S.pen[i] = k;
    }
  }
  // 새로 들어간 양은 울타리 안 빈자리로 걸어간다
  for (let i = 0; i < n; i++) {
    if (rec && !S.fell[i] && (S.x[i] !== x0[i] || S.y[i] !== y0[i])) {
      const pa = rec.path[i] ?? [x0[i], y0[i]];
      const lx = pa[pa.length - 2], ly = pa[pa.length - 1];
      if (lx !== S.x[i] || ly !== S.y[i]) pa.push(S.x[i], S.y[i]);
      rec.path[i] = pa;
    }
    if (before[i] < 0 && S.pen[i] >= 0) {
      const [sx, sy] = slotFor(F, S, S.pen[i], S.x[i], S.y[i], i);
      S.x[i] = sx;
      S.y[i] = sy;
      if (rec) {
        const pa = rec.path[i] ?? [x0[i], y0[i]];
        if (rec.penAt[i] < 0) rec.penAt[i] = pa.length / 2 - 1;
        pa.push(sx, sy);
        rec.path[i] = pa;
        rec.inNew.push(i);
      }
    }
  }
  // 늑대: 원 안에서 짖으면 굴로 깨갱, 아니면 가장 가까운 양에게 한 걸음
  if (F.den) {
    const wx0 = S.wx, wy0 = S.wy;
    if (Math.hypot(S.wx - px, S.wy - py) < R_OUT) {
      S.wx = F.den[0];
      S.wy = F.den[1];
      if (rec) rec.wolf = 2;
    } else {
      let bi = -1, bd = 1e9;
      for (let i = 0; i < n; i++) {
        if (S.pen[i] >= 0 || S.fell[i]) continue;
        const d = Math.hypot(S.x[i] - S.wx, S.y[i] - S.wy);
        if (d < bd) (bd = d), (bi = i);
      }
      if (bi >= 0) {
        if (bd - WOLF_STEP < WOLF_CATCH) {
          S.caught = bi;
          S.wx = S.x[bi] - ((S.x[bi] - S.wx) / bd) * 0.04;
          S.wy = S.y[bi] - ((S.y[bi] - S.wy) / bd) * 0.04;
        } else {
          S.wx += ((S.x[bi] - S.wx) / bd) * WOLF_STEP;
          S.wy += ((S.y[bi] - S.wy) / bd) * WOLF_STEP;
        }
        if (rec) rec.wolf = 1;
      }
    }
    if (rec) (rec.wolfPath = [wx0, wy0, S.wx, S.wy]), (rec.caught = S.caught);
  }
  if (S.goatF > 0) S.goatF--;
  S.dx = px;
  S.dy = py;
}

function newRec(n: number): Rec {
  return {
    path: new Array(n).fill(null), penAt: new Array(n).fill(-1), fellAt: new Array(n).fill(-1), scare: new Array(n).fill(0), trip: new Array(n).fill(false),
    goatFaint: false, wolf: 0, wolfPath: null, caught: -1, flowerNew: [], cloverNew: [], inNew: [],
  };
}

// ───────── 거리 지도 (잘하는 봇이 '울타리까지 얼마나 남았나'를 재는 데 쓴다) ─────────
const G = 40;
function distField(F: Field, tag: number): Float32Array {
  const D = new Float32Array(G * G).fill(1e9), ok = new Uint8Array(G * G), p = [0, 0];
  const heap: number[] = [];
  const push = (v: number, i: number) => {
    heap.push(v * 4096 + i);
    let k = heap.length - 1;
    while (k > 0) {
      const q = (k - 1) >> 1;
      if (heap[q] <= heap[k]) break;
      [heap[q], heap[k]] = [heap[k], heap[q]];
      k = q;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const a = 2 * k + 1, b = a + 1;
        let m = k;
        if (a < heap.length && heap[a] < heap[m]) m = a;
        if (b < heap.length && heap[b] < heap[m]) m = b;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  for (let j = 0; j < G; j++)
    for (let i = 0; i < G; i++) {
      const cx = (i + 0.5) / G, cy = (j + 0.5) / G;
      if (wet(F, cx, cy)) continue;
      p[0] = cx;
      p[1] = cy;
      for (const g of F.walls) pushSeg(p, g, SR + WT - 0.006);
      if (tag) for (const g of F.block[tag]) pushSeg(p, g, SR + WT - 0.006);
      if (Math.abs(p[0] - cx) > 1e-9 || Math.abs(p[1] - cy) > 1e-9) continue;
      ok[j * G + i] = 1;
      if (penOf(F, tag, cx, cy) >= 0 || matOf(F, tag, cx, cy) >= 0) (D[j * G + i] = 0), push(0, j * G + i);
    }
  while (heap.length) {
    const top = pop(), c = top % 4096, v = (top - c) / 4096;
    if (v > D[c] + 1e-6) continue;
    const i = c % G, j = (c - i) / G;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= G || b >= G || !ok[b * G + a]) continue;
        if (di && dj && (!ok[j * G + a] || !ok[b * G + i])) continue;
        const nv = D[c] + (di && dj ? 1.4142 : 1);
        if (nv < D[b * G + a]) (D[b * G + a] = nv), push(nv, b * G + a);
      }
  }
  for (let k = 0; k < D.length; k++) D[k] = D[k] < 1e8 ? D[k] / G : 1e9;
  return D;
}
function dget(F: Field, tag: number, x: number, y: number) {
  const D = F.dist[tag], i = Math.max(0, Math.min(G - 1, Math.floor(x * G))), j = Math.max(0, Math.min(G - 1, Math.floor(y * G)));
  if (D[j * G + i] < 1e8) return D[j * G + i];
  let m = 1e9;
  for (let dj = -2; dj <= 2; dj++)
    for (let di = -2; di <= 2; di++) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= G || b >= G) continue;
      const v = D[b * G + a] + Math.hypot(di, dj) / G;
      if (v < m) m = v;
    }
  return m < 1e8 ? m : 3;
}

// ───────── 상태 ─────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
export interface DogState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'aim' | 'run' | 'flee' | 'result'; pt: number;
  F: Field; S: Sim; S0: Sim; rec: Rec | null; layouts: Record<number, Layout>;
  /** 강아지 화면 위치(목장 좌표) · 달려가는 출발점·도착점 · 달리는 틱 수 */
  dogX: number; dogY: number; fromX: number; fromY: number; toX: number; toY: number; runN: number;
  down: boolean; ax: number; ay: number; idle: number; tries: number;
  /** stars = 판별 최고 별(best 비트)의 합 · got = 이번 시도의 별 비트 · gain = 이번 시도로 새로 늘어난 별 수 */
  best: number[]; stars: number; got: number; gain: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean;
  /** 개울 판 도움 깃발(목장 좌표, 박사의 첫 수부터) · 이 판에서 풍덩한 횟수 · 이 시도에서 깃발대로 짖었나(🏅 안 줌) (C004) */
  flags: [number, number][]; splashes: number; outs: number; helped: boolean; // outs: 멍멍 다 씀 실패 수(깃발 셈은 FLAG_ANY_FAIL 판만, PM C016)
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsStage: number; newsQ: { key: string; text: string; tip: boolean }[]; startT: number; clearT: number;
}

/** 판 시작 큰 글씨를 캔버스 하늘 띠에 둘지 (🎨 C015: 위 줄이 캔버스 밖 하늘에 있는 세로 화면만 — main.ts가 정한다) */
let introTop = false;
export const setIntroTop = (on: boolean) => void (introTop = on);
/** 효과음 신호 — 브라우저 플레이어(main.ts)만 꽂는다. 봇·테스트에선 아무것도 안 한다 (C010 M1-6) */
let cue: (c: Cue, v?: number, last?: boolean) => void = () => {};
export const setCue = (f: typeof cue) => void (cue = f);
const ev = (s: DogState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
/** 규칙 도움말 (새것 수에는 안 센다) */
function tip(s: DogState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push({ key, text, tip: true });
}
function see(s: DogState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push({ key, text, tip: false });
}
const NEWS_T = 200;
/** 판 시작 큰 글씨가 떠 있는 틱 */
const INTRO_T = 90;

function newStage(s: DogState) {
  const d = STAGES[s.stage];
  // 판이 바뀌면 앞 판에서 못 보여 준 알림은 버리고(나중에 그 요소를 만나면 다시 뜨게 '본 것'에서도 뺀다), 이 판 알림을 바로 띄운다
  // (C007, FUN QA C005·C006: 알림이 200틱씩 줄 서서 7판에 3판 알림이 뜨던 문제)
  if (s.newsStage !== s.stage) {
    for (const q of s.newsQ) (q.tip ? s.tips : s.seen).delete(q.key);
    s.newsQ = [];
    s.news = null;
    s.newsStage = s.stage;
  }
  let L = s.layouts[s.stage];
  if (!L) s.layouts[s.stage] = L = d.build(mulberry32((LAYOUT_SEED[s.stage] * 31 + s.stage * 7919 + 17) >>> 0));
  s.F = makeField(L);
  const n = s.F.n;
  s.S = {
    x: L.sheep.map((q) => q.x), y: L.sheep.map((q) => q.y), pen: new Array(n).fill(-1), fell: new Array(n).fill(0), fh: L.flowers.map(() => 0), ch: (L.clovers ?? []).map(() => 0),
    goatF: 0, wx: L.den ? L.den[0] : 0, wy: L.den ? L.den[1] : 0, used: 0, caught: -1, dx: 0.5, dy: 0.93,
  };
  s.S0 = cloneSim(s.S);
  s.rec = null;
  s.phase = 'aim';
  s.pt = 0;
  s.dogX = s.fromX = s.toX = 0.5;
  s.dogY = s.fromY = s.toY = 0.93;
  s.idle = 0;
  s.startT = s.t;
  s.got = 0;
  s.helped = false;
  // 개울 판 도움 깃발 (C004 📐): 풍덩을 FLAG_AFTER번 하면 다시 할 때 박사의 첫 두 자리에 ①② 깃발
  s.flags = [];
  const after = FLAG_AFTER[d.key];
  if (after && s.splashes + (FLAG_ANY_FAIL.has(d.key) ? s.outs : 0) >= after) s.flags = flagsFor(s.F, s.S, d);
  see(s, d.key, d.news);
  if (d.bonus === 'flower' && L.flowers.length) see(s, 'flower', '🌼 꽃밭 — 안 밟고 넣으면 별 하나 더');
  if (d.bonus === 'clover' && L.clovers?.length) see(s, 'clover', '🍀 클로버 — 흰 양이 지나가면 별 하나 더');
  ev(s, 'stage', 0.5, 0.6, `1-${s.stage + 1} ${d.name}`, '#fff6d6');
}

/** 몇 번째 풍덩 뒤에 깃발을 띄우나 (📐 C004: 소개 판 1-6은 첫 풍덩, 연습 판은 한 번 스스로 떠올릴 기회를 남긴다) */
const FLAG_AFTER: Record<string, number> = { river: 1, narrow: 2, fest: 1 }; // 📐 C006: 1-8 두 번째 풍덩(졸업 판은 한 번 더 혼자) → PM C016 ⓐ: 1-8은 첫 실패(멍멍 다 씀 포함) 뒤 — 두 번째면 조심 평균 5.0번, 첫 실패면 3.55번(선 ≤ 4)
/**
 * 깃발 ①② = 박사의 첫 두 수. 📐 C016 (나): 1-7은 🍀를 뺀 박사(빔 8)의 par 길 — 깃발이 🍀 정답 표지판이 되지 않게(🧪 C015, 조심 깬 시도 중 🍀 1.0 → 0.10).
 * 시작 상태가 늘 같으니 판·배치마다 한 번만 계산해 둔다(📐: 빔 8 두 번 160~260ms).
 */
const FLAG_NO_BONUS = new Set(['narrow']);
const flagCache = new Map<string, [number, number][]>();
export function flagsFor(F: Field, S: Sim, d: StageDef): [number, number][] {
  const key = `${d.key}|${d.par}|${S.x.join()}|${S.y.join()}|${JSON.stringify(F.clovers)}`;
  const hit = flagCache.get(key);
  if (hit) return hit.map((p) => [p[0], p[1]] as [number, number]);
  const nb = FLAG_NO_BONUS.has(d.key), fd: StageDef = nb ? { ...d, bonus: 'flower' } : d, w = nb ? 8 : BEAM;
  const p1 = plan(F, S, fd, DEPTH, w), S2 = cloneSim(S), out: [number, number][] = [p1];
  resolve(F, S2, p1[0], p1[1]);
  if (!ended(F, S2, fd)) out.push(plan(F, S2, fd, DEPTH, w));
  flagCache.set(key, out);
  return out.map((p) => [p[0], p[1]] as [number, number]);
}
/** 풍덩만이 아니라 '멍멍 다 씀' 실패(outs)도 깃발 셈에 넣는 판 (PM C016 F01-c ⓐ: 1-8 첫 실패 뒤) */
const FLAG_ANY_FAIL = new Set(['fest']);
/** 깃발 ① 근처(이 거리 안)에서 짖으면 깃발 자리로 붙여서 짖는다 — 0.015 차이에 결과가 갈리는 판이라 */
export const FLAG_SNAP = 0.04;

function finish(s: DogState, ok: boolean, why = '') {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    const bonus = bonusMet(s.F, s.S, d);
    const mask = 1 | (s.S.used <= d.par ? 2 : 0) | (bonus ? 4 : 0), before = s.best[s.stage];
    s.got = mask;
    s.splashes = s.outs = 0;
    s.best[s.stage] = before | mask;
    s.gain = starCount(s.best[s.stage]) - starCount(before);
    s.stars = s.best.reduce((a, m) => a + starCount(m), 0);
    s.pts += s.gain * STAR_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1 && !s.won) (s.won = true), (s.pts += WIN_PTS);
    const st = starCount(mask);
    ev(s, 'clear', 0.5, 0.5, `${s.stage + 1}판 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
  } else {
    s.tries++;
    ev(s, 'fail', 0.5, 0.5, why, '#ffd0c8');
  }
}

/** 지금 가리킨 자리(화면 0~1, y는 0~1) → 목장 좌표. 목장 밖이면 null */
const FY0 = 0.305, FH = 0.775, FXW = 0.92;
const scl = (fy: number) => 0.8 + 0.25 * fy;
const SX = (fx: number, fy: number) => 0.5 + (fx - 0.5) * FXW * scl(fy);
const SY = (fy: number) => FY0 + fy * FH;
/** 줄이기 설정(prefers-reduced-motion) — 브라우저에서만 */
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** 미리 보기 쪽지 한 조각 (아이콘 + 글) */
interface Part { icon?: IconKind; text: string }
const HUD_FONT = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
/** 1-1·1-2 첫 톡 손 안내: 양 무리 뒤(필드 좌표)와 1-2 '꾹' 고리 진행 k(1 이상이면 미리 보기 맛보기, 94틱 주기) */
function handHint(s: DogState): { fx: number; fy: number; k: number } | null {
  if (s.stage > 1 || s.S.used !== 0 || s.phase !== 'aim' || s.down || s.tries !== 0) return null;
  let cx = 0, cy = 0;
  for (let i = 0; i < s.F.n; i++) (cx += s.S.x[i] / s.F.n), (cy += s.S.y[i] / s.F.n);
  return { fx: cx, fy: cy + 0.15, k: s.stage === 1 ? (s.t % 94) / 70 : 0 };
}
/** 손 아이콘(hud.ts ICON.hand와 같은 24 격자 경로) — 그릴 때 처음 만든다 */
let HAND_P: Path2D | null = null;
const HAND_D = 'M9 13V5.5a1.6 1.6 0 0 1 3.2 0V11l.1-1.2a1.5 1.5 0 0 1 3 .2v1.5a1.5 1.5 0 0 1 3 .1V15c0 3.6-2.4 6-5.6 6h-1.2c-2 0-3.4-.9-4.6-2.6L4.6 15a1.6 1.6 0 0 1 2.6-1.9z';
function toField(x: number, y: number): [number, number] | null {
  const fy = (y - FY0) / FH;
  if (fy < -0.03 || fy > 1.03) return null;
  const fx = 0.5 + (x - 0.5) / (FXW * scl(fy));
  if (fx < -0.03 || fx > 1.03) return null;
  return [Math.max(0.02, Math.min(0.98, fx)), Math.max(0.02, Math.min(0.98, fy))];
}
/** 지금 누른 자리(목장 좌표). 깃발 ① 근처면 깃발 자리로 붙는다 — 미리 보기와 실제 짖기가 늘 같은 자리 (C004 FUN QA: 숨은 규칙이 되지 않게) */
function aimPoint(s: DogState): [number, number] | null {
  const f = toField(s.ax, s.ay * A);
  if (f && s.flags.length && Math.hypot(f[0] - s.flags[0][0], f[1] - s.flags[0][1]) < FLAG_SNAP) return [s.flags[0][0], s.flags[0][1]];
  return f;
}
const inAnyPen = (F: Field, x: number, y: number) => F.pens.some((p) => x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1);

function bark(s: DogState, fx: number, fy: number) {
  s.phase = 'run';
  s.pt = 0;
  s.fromX = s.dogX;
  s.fromY = s.dogY;
  s.toX = fx;
  s.toY = fy;
  s.runN = Math.max(6, Math.min(22, Math.round(Math.hypot(fx - s.dogX, fy - s.dogY) / DOG_SPEED)));
  s.idle = 0;
}

/** 도움말을 줄 세우지 않고 지금 바로 띄운다(한 번만) */
function tipNow(s: DogState, key: string, text: string) {
  if (s.tips.has(key)) return;
  s.tips.add(key);
  s.news = { text, t: s.t };
}
export const BLACK_TIP = '🖤 까만 양만 거꾸로 — 짖는 쪽으로!';

function afterFlee(s: DogState) {
  const d = STAGES[s.stage], F = s.F, S = s.S;
  // 📐 C007: 까만 양 설명은 '?!' 웃음이 다 닿은 뒤에(짖은 틱이 아니라 그 짖기의 연출이 끝난 때)
  if (blackCame(s)) tipNow(s, 'blackcome', BLACK_TIP);
  const fell = S.fell.findIndex((v) => v);
  // 풍덩 이벤트(빠진 양 자리) — '풍덩한 짖기에는 풍덩 연출'을 테스트로 본다 (🧪 C006 → C010 M1-6 ③)
  if (fell >= 0) return ev(s, 'splash', S.x[fell], S.y[fell], undefined, undefined, fell), s.splashes++, finish(s, false, F.black[fell] ? '까만 양이 개울에 풍덩!' : '양이 개울에 풍덩!');
  if (S.caught >= 0) return finish(s, false, '늑대가 양을 물어 갔어요!');
  if (allIn(F, S, d)) return finish(s, true);
  // PM C016 ⓐ: '멍멍 다 씀'도 센다 — 깃발 셈에는 FLAG_ANY_FAIL 판(1-8)만 든다(🧪 C015 캐주얼 3.8. 조심 손 실패는 풍덩이 더 많다)
  if (S.used >= d.max) return s.outs++, finish(s, false, '멍멍을 다 썼어요… 목이 쉬었어요');
  s.phase = 'aim';
  s.pt = 0;
}

/** 판 고르기·측정용: 그 판을 처음부터 (하트·점수는 그대로) */
export function jumpTo(s: DogState, stage: number) {
  s.stage = Math.max(0, Math.min(STAGES.length - 1, stage));
  s.tries = 0;
  s.splashes = s.outs = 0;
  newStage(s);
}

export const sheepdog: GameDef<DogState> = {
  id: 'sheepdog',
  name: '양치기 멍멍',
  genes: ['herd', 'pointer', 'turnbased'],
  twist: '톡 한 곳으로 강아지가 달려가 \'멍!\' 하면 양 떼가 반대쪽으로 우르르 달아나는데, 까만 양 한 마리는 거꾸로 강아지 쪽으로 온다 — 누르고 있으면 양마다 갈 자리가 미리 보여서, 어디서 짖을지가 수가 된다',
  rules: ['목장을 톡 = 강아지가 달려가 \'멍!\' — 원 안의 양은 반대쪽으로 달아나요. 가까울수록 멀리!', '양을 모두 울타리에 넣으면 통과. 누르고 있으면 양이 갈 자리가 보여요.'],
  controls: 'touch',
  hint: '목장을 누르면 갈 자리가 보이고, 떼면 멍! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '해 질 녘 언덕 목장 디오라마',
    mood: '노을빛이 비스듬히 드는 언덕 목장 — 뭉게뭉게 양털에 긴 그림자, 바람에 흔들리는 풀, 나무 울타리. 판이 지날수록 해가 기울어 밤이 오고, 언덕 위에서 목동 할아버지가 구경한다.',
    palette: { bg: '#2b3b2a', ink: '#fffaf0', muted: '#c9d6b8', accent: '#ffc857', hot: '#ff6b5a', soft: '#f3e3c0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'aim', pt: 0, rec: null, layouts: {},
      dogX: 0.5, dogY: 0.93, fromX: 0.5, fromY: 0.93, toX: 0.5, toY: 0.93, runN: 1,
      down: false, ax: 0, ay: 0, idle: 0, tries: 0,
      flags: [], splashes: 0, outs: 0, helped: false,
      best: STAGES.map(() => 0), stars: 0, got: 0, gain: 0, pts: 0, ok: false, why: '', won: false, dead: false,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsStage: -1, newsQ: [], startT: 0, clearT: 0,
    } as unknown as DogState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!.text, t: s.t };
    if (s.events.length > 40 || (s.events.length && s.t - s.events[0].t > 150)) s.events = s.events.filter((e) => s.t - e.t < 150);
    // ↺ 다시: 언제든 지금 판을 처음부터 (통과 화면에서 누르면 별 더 따기)
    if (inp.retry && s.phase !== 'run' && s.phase !== 'flee') {
      s.tries++;
      s.down = false;
      return newStage(s);
    }
    if (s.phase === 'result') {
      // 실패하면 1초 뒤 그 판만 다시(잃는 것 없음). 통과하면 결과 카드에서 '다음'을 누를 때까지 기다린다 (C008 M1-5a: 3초 뒤 저절로 넘어가지 않는다)
      if (!s.ok && s.pt >= RESULT_FAIL) newStage(s);
      else if (s.ok && inp.next && s.pt >= RESULT_MIN) {
        if (s.won && s.stage === STAGES.length - 1) s.dead = true;
        else s.stage++, (s.tries = 0), (s.splashes = s.outs = 0), newStage(s);
      }
      return;
    }
    if (s.phase === 'run') {
      const q = Math.min(1, s.pt / s.runN);
      s.dogX = s.fromX + (s.toX - s.fromX) * q;
      s.dogY = s.fromY + (s.toY - s.fromY) * q;
      if (s.pt >= s.runN) {
        if (!anyone(s.F, s.S, s.toX, s.toY)) {
          s.phase = 'aim';
          s.pt = 0;
          s.S.dx = s.toX;
          s.S.dy = s.toY;
          ev(s, 'sniff', s.toX, s.toY, '킁킁… 아무도 없네', '#f3f0d8');
          tip(s, 'sniff', '아무도 없으면 안 짖어요 (멍멍 안 씀)');
          return;
        }
        const rec = newRec(s.F.n), S = s.S, penned0 = S.pen.filter((v) => v >= 0).length;
        resolve(s.F, S, s.toX, s.toY, rec);
        s.rec = rec;
        s.phase = 'flee';
        s.pt = 0;
        ev(s, 'bark', s.toX, s.toY, '멍!', '#ffffff');
        if (rec.goatFaint) ev(s, 'faint', s.F.goat!.x, s.F.goat!.y, '꽥!', '#fff3a0');
        if (rec.wolf === 2) ev(s, 'yelp', rec.wolfPath![0], rec.wolfPath![1], '깨갱!', '#e8ecff');
        if (rec.scare.some((v, i) => v === 3 && rec.path[i])) {
          const i = rec.scare.findIndex((v) => v === 3);
          ev(s, 'come', s.S.x[i], s.S.y[i], '?!', '#ffe0f0', i);
        }
        if (rec.cloverNew.length) ev(s, 'clover', s.F.clovers[rec.cloverNew[0]].x, s.F.clovers[rec.cloverNew[0]].y, '클로버!', '#d8ffc0');
        if (rec.flowerNew.length) ev(s, 'trample', s.F.flowers[rec.flowerNew[0]].x, s.F.flowers[rec.flowerNew[0]].y, '앗, 꽃밭!', '#ffd6ec');
        if (S.pen.filter((v) => v >= 0).length > penned0) tip(s, 'pen', '들어간 양은 다시 안 나와요');
      }
      return;
    }
    if (s.phase === 'flee') {
      if (s.pt >= FLEE_T + (comeHold(s) ? COME_HOLD : 0)) afterFlee(s);
      return;
    }
    // 겨누기: 누르는 동안 미리 보기, 떼면 짖는다
    s.idle++;
    if (!release) return;
    const f = aimPoint(s);
    if (!f) return void ev(s, 'nope', Math.max(0.15, Math.min(0.85, s.ax)), Math.max(0.4, Math.min(1.05, s.ay * A)), '목장 안을 톡!', '#ffe3d6');
    if (inAnyPen(s.F, f[0], f[1])) return void ev(s, 'nope', f[0], f[1], '울타리 안이에요', '#ffe3d6');
    if (s.flags.length) {
      if (f[0] === s.flags[0][0] && f[1] === s.flags[0][1]) s.flags.shift(), (s.helped = true);
      else s.flags = []; // 깃발 밖에서 짖으면 이 시도의 깃발은 거둔다(판이 달라져 거짓 안내가 되니까)
    }
    bark(s, f[0], f[1]);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 잘하는 봇이 보는 판의 값: 들어간 양 · 울타리까지 남은 길 · 늑대와의 거리 · 별 */
function value(F: Field, S: Sim, d: StageDef): number {
  if (S.fell.some((v) => v) || S.caught >= 0) return -1e7;
  let whitesIn = 0, nW = 0, v = 0, wolfD = 9;
  const need = (i: number) => !F.black[i] || !!d.needBlack; // 📐 C014: 까만 양 필수 판은 까만 양도 흰 양과 같은 무게
  for (let i = 0; i < F.n; i++) {
    if (need(i)) nW++;
    if (S.pen[i] >= 0) {
      if (need(i)) whitesIn++;
      else if (d.bonus === 'black') v += 900;
      continue;
    }
    const dd = dget(F, F.tag[i], S.x[i], S.y[i]);
    if (need(i)) v -= dd * 1500;
    else if (d.bonus === 'black') v -= dd * 700;
    if (F.den) wolfD = Math.min(wolfD, Math.hypot(S.x[i] - S.wx, S.y[i] - S.wy));
  }
  if (whitesIn === nW) {
    const bonus = bonusMet(F, S, d);
    return 1e6 + ((S.used <= d.par ? 1 : 0) + (bonus ? 1 : 0)) * 1e5 - S.used * 1000;
  }
  if (S.used >= d.max) return -1e7;
  v += whitesIn * 1100;
  if (d.bonus === 'flower' && S.fh.some((x) => x)) v -= 700;
  if (d.bonus === 'clover' && S.ch.some((x) => x)) v += 700;
  if (F.den) v -= Math.max(0, 0.36 - wolfD) * 4000;
  v -= S.goatF * 60 + S.used * 120;
  // 까만 양을 먼저 넣었으면 '별 둘은 이미 손에' — 남은 흰 양을 넣는 데 들 멍멍을 어림해 끝난 판과 견준다
  if (d.bonus === 'black' && F.black.some((b, i) => b && S.pen[i] >= 0)) {
    const rem = Math.ceil((nW - whitesIn) / 2.5);
    return 1e6 + (2 + (S.used + rem <= d.par ? 1 : 0)) * 1e5 - (S.used + rem) * 1000 - 6e4 + v;
  }
  return v;
}
/** 측정용(funqa 정답 폭, 📐 C015): 순수 시뮬 — 박사 계획 · 끝남 · 복사 · 판 값 · 보너스 (게임 동작은 안 바꾼다) */
export const pure = { plan: (F: Field, S: Sim, d: StageDef, depth?: number, width?: number) => plan(F, S, d, depth, width), ended, cloneSim, value, bonusMet };
/** 판이 끝난 상태인가 (실패 · 흰 양 다 들어감 · 멍멍 다 씀) */
function ended(F: Field, S: Sim, d: StageDef) {
  return S.fell.some((v) => v) || S.caught >= 0 || S.used >= d.max || allIn(F, S, d);
}

/** 짖을 자리 후보: 양마다 '울타리 반대쪽' 뒤에서, 까만 양은 앞에서, 늑대 위, 그리고 목장 격자 */
function candidates(F: Field, S: Sim, d: StageDef): number[] {
  const out: number[] = [];
  const add = (x: number, y: number) => {
    if (x < 0.02 || x > 0.98 || y < 0.02 || y > 0.98 || inAnyPen(F, x, y)) return;
    out.push(x, y);
  };
  const grad = (i: number): [number, number] => {
    const x = S.x[i], y = S.y[i], tg = F.tag[i], e = 0.03;
    let gx = dget(F, tg, x - e, y) - dget(F, tg, x + e, y), gy = dget(F, tg, x, y - e) - dget(F, tg, x, y + e);
    const l = Math.hypot(gx, gy);
    if (l < 1e-6) {
      const pn = F.pens.find((q) => !q.tag || q.tag === tg) ?? F.pens[0];
      (gx = (pn.gx0 + pn.gx1) / 2 - x), (gy = pn.y1 - y);
      const l2 = Math.hypot(gx, gy) || 1;
      return [gx / l2, gy / l2];
    }
    return [gx / l, gy / l];
  };
  let cx = 0, cy = 0, cn = 0;
  for (let i = 0; i < F.n; i++) {
    if (S.pen[i] >= 0 || S.fell[i]) continue;
    const [gx, gy] = grad(i);
    if (F.black[i]) {
      if (d.bonus !== 'black') continue;
      for (const k of [0.1, 0.17, 0.24]) for (const a of [-0.35, 0, 0.35]) add(S.x[i] + (gx * Math.cos(a) - gy * Math.sin(a)) * k, S.y[i] + (gx * Math.sin(a) + gy * Math.cos(a)) * k);
      continue;
    }
    cx += S.x[i];
    cy += S.y[i];
    cn++;
    for (const k of [0.04, 0.09, 0.15, 0.21]) for (const a of [-0.5, 0, 0.5]) add(S.x[i] - (gx * Math.cos(a) - gy * Math.sin(a)) * k, S.y[i] - (gx * Math.sin(a) + gy * Math.cos(a)) * k);
  }
  if (cn) {
    (cx /= cn), (cy /= cn);
    for (const k of [0.08, 0.14, 0.2]) for (const [ax, ay] of [[0, 1], [0.5, 0.85], [-0.5, 0.85]]) add(cx + ax * k, cy + ay * k);
  }
  if (F.den) for (const [ox, oy] of [[0, 0], [0.12, 0], [-0.12, 0], [0, 0.12], [0, -0.12], [0.18, 0.1], [-0.18, 0.1]]) add(S.wx + ox, S.wy + oy);
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) add(0.1 + a * 0.16, 0.12 + b * 0.16);
  return out;
}

/** 몇 수 앞까지 내다보고(빔 탐색) 가장 좋은 첫 자리. 판이 끝나는 수(별 수)를 찾으면 그쪽을 고른다 */
const DEPTH = 3, BEAM = 4, TOP3 = 1e6 + 3e5 - 1e4;
function plan(F: Field, S0: Sim, d: StageDef, maxDepth = DEPTH, width = BEAM): [number, number] {
  interface Node { S: Sim; root: number; v: number }
  const roots: { x: number; y: number; v: number }[] = [];
  let beam: Node[] = [{ S: S0, root: -1, v: 0 }];
  for (let depth = 0; depth < maxDepth && beam.length; depth++) {
    const kids: Node[] = [];
    for (const nd of beam) {
      const cs = candidates(F, nd.S, d);
      for (let k = 0; k < cs.length; k += 2) {
        if (!anyone(F, nd.S, cs[k], cs[k + 1])) continue;
        const S = cloneSim(nd.S);
        resolve(F, S, cs[k], cs[k + 1]);
        // 아무 양도 안 움직이는 짖기(벽에 눌린 양 바로 뒤 등)는 버린다 — 같은 자리를 영영 되풀이하지 않게 (C003)
        let moved = 0;
        for (let i = 0; i < F.n; i++) moved += Math.abs(S.x[i] - nd.S.x[i]) + Math.abs(S.y[i] - nd.S.y[i]) + (S.pen[i] !== nd.S.pen[i] ? 1 : 0);
        if (moved < 0.01) continue;
        const v = value(F, S, d) - depth * 5;
        let root = nd.root;
        if (root < 0) (root = roots.length), roots.push({ x: cs[k], y: cs[k + 1], v });
        else if (v > roots[root].v) roots[root].v = v;
        if (!ended(F, S, d)) kids.push({ S, root, v });
      }
    }
    // 첫 수로 별 셋이면 더 볼 것 없다. 아니면 좋은 갈래 몇 개만 더 깊이
    if (roots.some((r) => r.v >= TOP3)) break;
    kids.sort((a, b) => b.v - a.v);
    const pick: Node[] = [], used = new Set<number>();
    for (const k of kids) {
      if (pick.length >= width) break;
      if (used.has(k.root) && pick.length < width - 1) continue;
      used.add(k.root);
      pick.push(k);
    }
    beam = pick;
  }
  let best = roots[0];
  for (const r of roots) if (r.v > best.v) best = r;
  return [best.x, best.y];
}

const brain = new WeakMap<object, { key: string; p: [number, number] }>();
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 봇: 통과 결과 카드에서는 '다음' */
const NEXT: Input = { tap: false, dir: 0, pointer: null, next: true };
/** 목장 좌표 (fx, fy)를 누르는 입력 (봇·테스트용) */
export const at = (fx: number, fy: number): Input => ({ tap: false, dir: 0, pointer: { x: SX(fx, fy), y: SY(fy) / A } });

/** 봇: 세 수 앞까지 시뮬레이션해 짖을 자리를 고른다 */
export const sheepdogSmart: Bot<DogState> = {
  name: '양치기 박사',
  act(s) {
    if (s.phase === 'result' && s.ok) return NEXT;
    if (s.phase !== 'aim' || s.down) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.used}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, p: plan(s.F, s.S, STAGES[s.stage]) }));
    return at(m.p[0], m.p[1]);
  },
};

const greedyBrain = new WeakMap<object, { key: string; p: [number, number] }>();
/** 봇: 사람 근사(C003, FUN QA 제안) — 미리 보기로 여러 자리를 눌러 보고 '한 수 뒤'가 가장 좋은 자리에서 짖는다. 앞을 내다보지 않는다 */
export const sheepdogGreedy: Bot<DogState> = {
  name: '미리 보고 한 수',
  act(s) {
    if (s.phase === 'result' && s.ok) return NEXT;
    if (s.phase !== 'aim' || s.down) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.used}`;
    let m = greedyBrain.get(s);
    if (!m || m.key !== key) greedyBrain.set(s, (m = { key, p: plan(s.F, s.S, STAGES[s.stage], 1) }));
    return at(m.p[0], m.p[1]);
  },
};

/**
 * 사람 근사 봇 (C004, FUN QA C003 모형). 박사·그리디는 '사람 상한'이라 캐주얼 절벽을 못 잡는다.
 *   순진: 미리 보기 없이 흰 양(또는 무리 가운데) 뒤에서 문 쪽으로 대충 누른다.
 *   조심: 같은 습관인데, 누르고 있는 동안 미리 보기에 풍덩이 보이면 다른 자리로 N번까지 다시 겨눈다. 깃발이 있으면 깃발을 따른다.
 */
function naiveAim(F: Field, S: Sim, rng: Rng, d?: StageDef): [number, number] {
  const ws: number[] = [];
  for (let i = 0; i < F.n; i++) if (!F.black[i] && S.pen[i] < 0 && !S.fell[i]) ws.push(i);
  const pn = F.pens[0], gx = (pn.gx0 + pn.gx1) / 2, gy = pn.y1;
  // 📐 C014: 까만 양은 거꾸로 오니 '양과 문 사이'에서 부른다
  const bi = d?.needBlack ? F.black.findIndex((b, i) => b && S.pen[i] < 0 && !S.fell[i]) : -1;
  if (bi >= 0 && (!ws.length || rng() < 2 / (ws.length + 1))) {
    const dx = gx - S.x[bi], dy = gy - S.y[bi], l = Math.hypot(dx, dy) || 1, dist = 0.08 + rng() * 0.1;
    return [S.x[bi] + (dx / l) * dist + (rng() - 0.5) * 0.06, S.y[bi] + (dy / l) * dist + (rng() - 0.5) * 0.06];
  }
  if (!ws.length) return [0.5, 0.5];
  let cx = 0, cy = 0;
  if (rng() < 0.5) {
    for (const i of ws) (cx += S.x[i]), (cy += S.y[i]);
    (cx /= ws.length), (cy /= ws.length);
  } else {
    const i = ws[Math.floor(rng() * ws.length)];
    (cx = S.x[i]), (cy = S.y[i]);
  }
  let dx = cx - gx, dy = cy - gy;
  const l = Math.hypot(dx, dy) || 1;
  (dx /= l), (dy /= l);
  const a = (rng() - 0.5) * 0.9, dist = 0.05 + rng() * 0.13;
  const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a);
  return [cx + rx * dist + (rng() - 0.5) * 0.06, cy + ry * dist + (rng() - 0.5) * 0.06];
}
function humanBot(name: string, looks: number): Bot<DogState> {
  return {
    name,
    act(s, rng) {
      if (s.phase === 'result' && s.ok) return NEXT;
      if (s.phase !== 'aim' || s.down) return NO;
      if (looks > 0 && s.flags.length) return at(s.flags[0][0], s.flags[0][1]);
      let p = naiveAim(s.F, s.S, rng, STAGES[s.stage]);
      for (let k = 1; k < looks; k++) {
        const S2 = cloneSim(s.S);
        if (anyone(s.F, S2, p[0], p[1])) resolve(s.F, S2, p[0], p[1]);
        if (!S2.fell.some((v) => v)) break;
        p = naiveAim(s.F, s.S, rng, STAGES[s.stage]);
      }
      return at(Math.max(0.02, Math.min(0.98, p[0])), Math.max(0.02, Math.min(0.98, p[1])));
    },
  };
}
export const sheepdogNaive = humanBot('순진(미리 보기 없음)', 0);
export const sheepdogCareful = humanBot('조심(풍덩이 보이면 6번까지 다시 겨눔 · 깃발 따름)', 6);

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 목장 아무 데나 톡 (가끔 화면 아무 데나) */
export const sheepdogRandom: Bot<DogState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.phase === 'result' && s.ok) return NEXT;
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    if (rng() < 0.1) m.p = { x: rng(), y: rng() };
    else {
      const fx = 0.02 + rng() * 0.96, fy = 0.02 + rng() * 0.96;
      m.p = { x: SX(fx, fy), y: SY(fy) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

/** 미리 보기용: 지금 상태에서 (fx, fy)에 짖으면? */
export function preview(s: DogState, fx: number, fy: number) {
  const S = cloneSim(s.S), rec = newRec(s.F.n);
  resolve(s.F, S, fx, fy, rec);
  return { S, rec };
}

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b), k = Math.max(0, Math.min(1, t));
  return '#' + p.map((v, j) => Math.round(v + (q[j] - v) * k).toString(16).padStart(2, '0')).join('');
};
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);
function pathAt(pa: number[], q: number): [number, number] {
  const m = pa.length / 2;
  if (m <= 1) return [pa[0], pa[1]];
  const f = Math.max(0, Math.min(1, q)) * (m - 1), i = Math.min(m - 2, Math.floor(f)), r = f - i;
  return [pa[i * 2] + (pa[i * 2 + 2] - pa[i * 2]) * r, pa[i * 2 + 1] + (pa[i * 2 + 3] - pa[i * 2 + 1]) * r];
}
/** 월드마다 시간대(SKY 줄 번호): W1 아침 0 → W2 한낮 · W3 오후 · W4 노을 · W5 밤 (GDD §5) */
export const WORLD_TIME = [0, 1, 3, 5, 7];
/** 시간대 키: 하늘 위·아래, 해, 먼 언덕, 가까운 언덕, 먼 풀, 가까운 풀 */
export const SKY: string[][] = [
  ['#8ecff0', '#ffe9c4', '#fff4cf', '#a3d29c', '#84c172', '#b4dc74', '#72ae4c'], // 🎨 C007 W1 아침 키
  ['#76bce8', '#fde5b4', '#fff0b0', '#9cc588', '#80b569', '#a2d068', '#67a543'],
  ['#71b0df', '#fcd8a0', '#ffe49c', '#93bd80', '#79ad62', '#9cca63', '#62a040'],
  ['#6ea3d6', '#fbc88a', '#ffd488', '#8bb179', '#71a45c', '#95c05f', '#5d983d'],
  ['#7090cb', '#f8b27a', '#ffc078', '#85a372', '#6a9757', '#8db35b', '#588e3b'],
  ['#6676b6', '#f2986c', '#ffa868', '#7c916a', '#628252', '#84a356', '#527f39'],
  ['#4d5797', '#e78464', '#ff9462', '#6e7c62', '#576d4c', '#768e52', '#486e35'],
  ['#141c46', '#323a74', '#eef0ff', '#2a3848', '#24313d', '#3b5b3e', '#2b4631'],
];
type SheepMood = 'calm' | 'scared' | 'happy' | 'swim' | 'dark';
interface SheepLook { black: boolean; tag: number; face: number; run: number; t: number; mood: SheepMood; hop: number; roll: number; alpha?: number }
const RIB = ['', '#e8414f', '#3a86ff'];

function drawSheep(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, o: SheepLook) {
  const wool = o.black ? '#4b4549' : '#f8f4ea', sh = o.black ? '#2a252a' : '#d6ccb9', hi = o.black ? '#6d646b' : '#fffbea', fc = o.black ? '#1c181b' : '#3a3234';
  const OL = o.black ? '#17131a' : '#5e5142', ow = olw(z), lf = o.face; // 외곽선(🎨 C007 §4.0) · 빛은 늘 화면 왼쪽 위
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.mood !== 'swim') {
    ctx.fillStyle = SHADE;
    ctx.beginPath();
    ctx.ellipse(x + z * 0.45, y + z * 0.06, z * 1.45 * (1 - o.hop / (z * 4)), z * 0.42, 0.05, 0, TAU);
    ctx.fill();
  }
  ctx.translate(x, y - o.hop);
  if (o.mood === 'swim') ctx.translate(0, z * 0.55 + Math.sin(o.t * 0.15) * z * 0.12);
  if (o.roll) {
    ctx.translate(0, -z * 0.7);
    ctx.rotate(o.roll);
    ctx.translate(0, z * 0.7);
  }
  ctx.scale(o.face, 1);
  // 다리 (뛰면 바쁘게)
  if (o.mood !== 'swim') {
    ctx.strokeStyle = fc;
    ctx.lineWidth = z * 0.2;
    ctx.lineCap = 'round';
    const legs = [[-0.52, 0], [-0.2, Math.PI], [0.28, Math.PI], [0.58, 0]];
    for (const [lx, ph] of legs) {
      const sw = o.run ? Math.sin(o.t * 0.85 + ph) * z * 0.28 * o.run : 0;
      ctx.beginPath();
      ctx.moveTo(lx * z, -z * 0.45);
      ctx.lineTo(lx * z + sw, -z * 0.02 - (o.run ? Math.max(0, -Math.cos(o.t * 0.85 + ph)) * z * 0.12 : 0));
      ctx.stroke();
    }
  }
  // 양털: 그늘 뭉치 → 밝은 뭉치 → 반짝
  const P = [[-0.62, -0.78, 0.42], [-0.32, -1.1, 0.46], [0.12, -1.16, 0.48], [0.5, -0.92, 0.42], [0.42, -0.55, 0.4], [0, -0.5, 0.44], [-0.42, -0.5, 0.4], [-0.05, -0.82, 0.55]];
  // 외곽선: 그늘 뭉치와 같은 원을 ow만큼 키워 먼저 칠한다 — 바깥 둘레만, 안쪽 겹친 선은 안 생긴다 (유령 양은 빼고)
  if (o.alpha === undefined) {
    ctx.fillStyle = OL;
    for (const [px, py, pr] of P) (ctx.beginPath(), ctx.arc(px * z + z * 0.06 * lf, py * z + z * 0.08, pr * z * 1.04 + ow, 0, TAU), ctx.fill());
  }
  ctx.fillStyle = sh;
  for (const [px, py, pr] of P) (ctx.beginPath(), ctx.arc(px * z + z * 0.06 * lf, py * z + z * 0.08, pr * z * 1.04, 0, TAU), ctx.fill());
  const g = ctx.createRadialGradient(-z * 0.35 * lf, -z * 1.15, z * 0.1, 0, -z * 0.75, z * 1.25);
  g.addColorStop(0, hi);
  g.addColorStop(0.55, wool);
  g.addColorStop(1, sh);
  ctx.fillStyle = g;
  for (const [px, py, pr] of P) (ctx.beginPath(), ctx.arc(px * z, py * z, pr * z * 0.94, 0, TAU), ctx.fill());
  ctx.fillStyle = o.black ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.75)';
  for (const [px, py, pr] of [[-0.35, -1.18, 0.18], [0.05, -1.25, 0.16], [-0.62, -0.9, 0.13]]) (ctx.beginPath(), ctx.arc(px * z * lf, py * z, pr * z, 0, TAU), ctx.fill());
  // 리본 (등 위에 큼직하게)
  if (o.tag) {
    const rx = -z * 0.05, ry = -z * 1.38;
    ctx.fillStyle = RIB[o.tag];
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 1.2;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + sd * z * 0.42, ry - z * 0.26);
      ctx.lineTo(rx + sd * z * 0.42, ry + z * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(rx, ry, z * 0.13, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  // 머리
  const hx = z * 0.92, hy = -z * 0.88 + (o.mood === 'calm' ? Math.sin(o.t * 0.05) * z * 0.05 : 0);
  ctx.fillStyle = fc;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(o.mood === 'scared' ? -0.25 : o.mood === 'calm' ? 0.25 : 0);
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-z * 0.12, -z * 0.05 + sd * z * 0.22, z * 0.26, z * 0.1, sd * (o.mood === 'scared' ? -0.9 : 0.5), 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(z * 0.08, 0, z * 0.32, z * 0.4, 0.35, 0, TAU);
  ctx.fill();
  ctx.fillStyle = wool;
  for (const [px, py, pr] of [[-0.12, -0.36, 0.17], [0.06, -0.42, 0.15], [-0.25, -0.22, 0.13]]) (ctx.beginPath(), ctx.arc(px * z, py * z, pr * z, 0, TAU), ctx.fill());
  // 눈·입
  const ex = z * 0.12, ey = -z * 0.08;
  if (o.mood === 'happy') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, z * 0.08);
    ctx.beginPath();
    ctx.arc(ex, ey + z * 0.04, z * 0.09, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    const big = o.mood === 'scared' ? 1.5 : 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, z * 0.11 * big, z * (o.mood === 'calm' ? 0.06 : 0.11) * big, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = o.mood === 'dark' ? '#fff3a0' : '#111111';
    ctx.beginPath();
    ctx.arc(ex + z * 0.03, ey + (o.mood === 'calm' ? z * 0.01 : 0), z * (o.mood === 'scared' ? 0.045 : 0.055), 0, TAU);
    ctx.fill();
  }
  if (o.mood === 'scared') {
    ctx.fillStyle = '#ffb3c0';
    ctx.beginPath();
    ctx.ellipse(z * 0.22, z * 0.22, z * 0.07, z * 0.09, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath();
    ctx.moveTo(z * 0.12, z * 0.24);
    ctx.lineTo(z * 0.24 + (o.mood === 'calm' ? Math.sin(o.t * 0.3) * z * 0.04 : 0), z * 0.22);
    ctx.stroke();
  }
  ctx.restore();
  if (o.mood === 'scared') {
    // 땀방울
    ctx.fillStyle = 'rgba(160,220,255,.95)';
    ctx.beginPath();
    ctx.moveTo(-z * 0.2, -z * 1.75);
    ctx.quadraticCurveTo(-z * 0.05, -z * 1.45, -z * 0.2, -z * 1.4);
    ctx.quadraticCurveTo(-z * 0.35, -z * 1.45, -z * 0.2, -z * 1.75);
    ctx.fill();
  }
  ctx.restore();
}

type DogMood = 'idle' | 'run' | 'bark' | 'proud' | 'surprise' | 'dizzy' | 'spin' | 'sniff';
/** 그림자 색: 시간대 토큰 (🎨 C007: 아침은 청록, 검정·풀색 금지) — drawAll 맨 앞에서 정한다 */
let SHADE = 'rgba(30,45,15,.30)';
/** 외곽선 두께 (🎨 C007 §4.0): 몸 단위 z에 비례, 1.5~2.5px */
const olw = (z: number) => Math.max(1.5, Math.min(2.5, z * 0.08));
interface DogPose { sx?: number; sy?: number; lift?: number; age?: number }
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, face: number, mood: DogMood, t: number, o: DogPose = {}) {
  const fur = '#e39a4c', furD = '#b86e2c', cream = '#fff3df', OL = '#5a2e0e', ow = olw(z);
  const sx = o.sx ?? 1, sy = o.sy ?? 1, lift = o.lift ?? 0, age = o.age ?? 99;
  ctx.save();
  // 그림자는 바닥에 남고, 몸이 뜨면 작아진다
  const shk = Math.max(0.5, 1 - lift / (4 * z));
  ctx.fillStyle = SHADE;
  ctx.beginPath();
  ctx.ellipse(x + z * 0.4 * face, y + z * 0.05, z * 1.35 * shk, z * 0.36 * shk, 0, 0, TAU);
  ctx.fill();
  ctx.translate(x, y - lift);
  ctx.scale(sx, sy);
  if (mood === 'spin') ctx.scale(Math.cos(t * 0.35) >= 0 ? 1 : -1, 1);
  else ctx.scale(face, 1);
  const lf = mood === 'spin' ? 1 : face; // 빛은 늘 화면 왼쪽 위 — face로 뒤집힌 x를 되돌린다
  if (mood === 'bark') ctx.translate(0, -Math.abs(Math.sin(t * 0.6)) * z * 0.15);
  const run = mood === 'run' || mood === 'spin' ? 1 : 0;
  ctx.lineJoin = 'round';
  // 다리: 외곽선 색으로 굵게 먼저, 그 위에 크림
  ctx.lineCap = 'round';
  for (const [col, lw] of [[OL, z * 0.24 + 2 * ow], [cream, z * 0.24]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    for (const [lx, ph] of [[-0.55, 0], [-0.3, Math.PI], [0.35, Math.PI], [0.6, 0]]) {
      const sw = run ? Math.sin(t * 0.9 + ph) * z * 0.3 : 0;
      ctx.beginPath();
      ctx.moveTo(lx * z, -z * 0.4);
      ctx.lineTo(lx * z + sw, -z * 0.04);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2 * ow;
  // 꼬리 (살랑살랑, 뿌듯하면 프로펠러)
  const wag = Math.sin(t * (mood === 'proud' ? 1.15 : mood === 'spin' ? 0.7 : 0.35)) * 0.5;
  ctx.save();
  ctx.translate(-z * 0.85, -z * 0.7);
  ctx.rotate(-0.9 + wag);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.3, z * 0.17, z * 0.38, 0, 0, TAU);
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.55, z * 0.12, z * 0.15, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 몸
  const bs = mood === 'surprise' ? [0.94, 1.08] : mood === 'proud' ? [1, 1.04] : [1, 1];
  const g = ctx.createLinearGradient(0, -z * 1.05, 0, -z * 0.3);
  g.addColorStop(0, mix(fur, '#fff2b0', 0.2));
  g.addColorStop(1, furD);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.65, z * 0.92 * bs[0], z * 0.42 * bs[1], 0, 0, TAU);
  ctx.stroke();
  ctx.fill();
  const bh = ctx.createRadialGradient(-z * 0.35 * lf, -z * 0.9, 0, -z * 0.35 * lf, -z * 0.9, z * 0.6);
  bh.addColorStop(0, mix(fur, '#fff2b0', 0.35));
  bh.addColorStop(1, 'rgba(255,242,176,0)');
  ctx.fillStyle = bh;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.65, z * 0.92 * bs[0], z * 0.42 * bs[1], 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(z * 0.25, -z * 0.45, z * 0.5, z * 0.2, 0, 0, TAU);
  ctx.fill();
  // 목걸이
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.ellipse(z * 0.62, -z * 0.82, z * 0.12, z * 0.3, 0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(z * 0.72, -z * 0.6, z * 0.07, 0, TAU);
  ctx.fill();
  // 머리 (×1.25 — 390px에서 표정이 읽히게, 🎨 C007)
  const up = mood === 'bark' || mood === 'proud' ? -0.35 : mood === 'sniff' ? 0.45 : mood === 'surprise' ? -0.12 : 0;
  ctx.save();
  ctx.translate(z * 0.84, -z * 1.2 + (mood === 'sniff' ? z * 0.35 : 0));
  ctx.rotate(up);
  ctx.scale(1.25, 1.25);
  ctx.lineWidth = (2 * ow) / 1.25;
  // 귀
  for (const [ex, flop] of [[-0.25, mood === 'run' ? 0.5 : mood === 'surprise' ? -0.35 : 0.1], [0.12, mood === 'surprise' ? -0.35 : 0.15]]) {
    ctx.fillStyle = furD;
    ctx.beginPath();
    ctx.moveTo(ex * z - z * 0.14, -z * 0.25);
    ctx.lineTo(ex * z + Math.sin(t * 0.4) * z * 0.04 - flop * z, -z * 0.78);
    ctx.lineTo(ex * z + z * 0.16, -z * 0.28);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = '#f7b7a3';
    ctx.beginPath();
    ctx.moveTo(ex * z - z * 0.07, -z * 0.3);
    ctx.lineTo(ex * z - flop * z * 0.8, -z * 0.62);
    ctx.lineTo(ex * z + z * 0.08, -z * 0.32);
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(-z * 0.1 * lf, -z * 0.15, z * 0.05, 0, 0, z * 0.5);
  hg.addColorStop(0, mix(fur, '#fff2b0', 0.3));
  hg.addColorStop(1, furD);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, 0, z * 0.45, 0, TAU);
  ctx.stroke();
  ctx.fill();
  // 주둥이
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(z * 0.32, z * 0.12, z * 0.28, z * 0.2, 0, 0, TAU);
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = '#2a1a14';
  ctx.beginPath();
  ctx.ellipse(z * 0.56, z * 0.04, z * 0.09, z * 0.07, 0, 0, TAU);
  ctx.fill();
  // 입
  if (mood === 'bark') {
    ctx.fillStyle = '#7a1f2b';
    ctx.beginPath();
    ctx.ellipse(z * 0.38, z * 0.27, z * 0.2, z * 0.14 + Math.abs(Math.sin(t * 0.6)) * z * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.ellipse(z * 0.38, z * 0.36, z * 0.11, z * 0.06, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 'surprise') {
    ctx.fillStyle = '#5a1a22';
    ctx.beginPath();
    ctx.ellipse(z * 0.36, z * 0.3, z * 0.06, z * 0.08, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 'proud') {
    ctx.strokeStyle = '#3b1a10';
    ctx.lineWidth = Math.max(1.2, z * 0.05);
    ctx.beginPath();
    ctx.arc(z * 0.36, z * 0.22, z * 0.09, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,179,160,.9)';
    ctx.beginPath();
    ctx.ellipse(z * 0.16, z * 0.14, z * 0.09, z * 0.06, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 'dizzy') {
    ctx.fillStyle = '#ff7f96';
    ctx.save();
    ctx.translate(z * 0.42, z * 0.33);
    ctx.rotate(0.7);
    ctx.beginPath();
    ctx.ellipse(0, 0, z * 0.07, z * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (mood === 'idle' || mood === 'run' || mood === 'spin') {
    ctx.fillStyle = '#ff7f96';
    ctx.beginPath();
    ctx.ellipse(z * 0.34, z * 0.3 + Math.sin(t * 0.5) * z * 0.03, z * 0.08, z * 0.14, 0.2, 0, TAU);
    ctx.fill();
  }
  // 눈
  ctx.fillStyle = '#1a1110';
  ctx.strokeStyle = '#1a1110';
  if (mood === 'proud') {
    ctx.lineWidth = Math.max(1.8, z * 0.08) / 1.25;
    ctx.beginPath();
    ctx.arc(z * 0.1, -z * 0.02, z * 0.1, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (mood === 'dizzy') {
    ctx.lineWidth = Math.max(1.2, z * 0.07) / 1.25;
    ctx.beginPath();
    for (let a = 0; a < 9; a += 0.4) ctx.lineTo(z * 0.1 + Math.cos(a + t * 0.3) * a * z * 0.016, -z * 0.06 + Math.sin(a + t * 0.3) * a * z * 0.016);
    ctx.stroke();
  } else if (mood === 'bark') {
    ctx.lineWidth = Math.max(1.8, z * 0.08) / 1.25;
    ctx.beginPath();
    ctx.moveTo(z * 0.02, -z * 0.13);
    ctx.lineTo(z * 0.18, -z * 0.06);
    ctx.lineTo(z * 0.02, z * 0.01);
    ctx.stroke();
  } else if (mood === 'surprise') {
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, z * 0.035) / 1.25;
    ctx.beginPath();
    ctx.arc(z * 0.1, -z * 0.06, z * 0.15, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1110';
    ctx.beginPath();
    ctx.arc(z * 0.12, -z * 0.06, z * 0.055, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(z * 0.135, -z * 0.08, z * 0.025, 0, TAU);
    ctx.fill();
  } else if (mood === 'idle' && t % 150 < 5) {
    ctx.lineWidth = Math.max(1.5, z * 0.06) / 1.25;
    ctx.beginPath();
    ctx.moveTo(z * 0.02, -z * 0.06);
    ctx.lineTo(z * 0.18, -z * 0.06);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(z * 0.1, -z * 0.06, z * 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(z * 0.13, -z * 0.09, z * 0.04, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // 놀람: 머리 위 '!' 아이콘 (벡터, 글자 아님) — 0→1.3→1로 튀어나온다
  if (mood === 'surprise') {
    const k = age < 4 ? (age / 4) * 1.3 : age < 8 ? 1.3 - ((age - 4) / 4) * 0.3 : 1;
    ctx.save();
    ctx.translate(z * 0.1, -z * 2.75); // 머리 뒤쪽 위 — 까만 양 위 '?!'와 붙어 '?!!'로 읽히지 않게 (FUN QA C007)
    ctx.scale(k, k);
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#3b2a1e';
    ctx.lineWidth = Math.max(1.5, z * 0.05);
    ctx.beginPath();
    ctx.roundRect(-z * 0.08, -z * 0.3, z * 0.16, z * 0.45, z * 0.06);
    ctx.stroke();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, z * 0.3, z * 0.09, 0, TAU);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawGoat(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, faint: number, age: number, t: number) {
  const body = '#f4ecdb', sh = '#b9a888';
  ctx.save();
  ctx.fillStyle = SHADE;
  ctx.beginPath();
  ctx.ellipse(x + z * 0.4, y + z * 0.05, z * (faint ? 1.7 : 1.25), z * 0.38, 0, 0, TAU);
  ctx.fill();
  ctx.translate(x, y);
  // 뻣뻣하게 쿵: 쓰러지는 데 10틱, 쓰러진 동안 네 다리가 하늘로 (부르르)
  const fall = faint ? Math.min(1, age / 10) : 0;
  ctx.translate(0, -z * 0.55);
  ctx.rotate(Math.PI * fall * fall + (fall >= 1 ? Math.sin(t * 0.9) * 0.03 : 0));
  ctx.translate(0, z * 0.55 - (fall >= 1 ? z * 0.45 : 0));
  // 다리 (뻣뻣)
  ctx.strokeStyle = '#8c7f6a';
  ctx.lineWidth = z * 0.16;
  ctx.lineCap = 'round';
  for (const lx of [-0.5, -0.25, 0.3, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(lx * z, -z * 0.5);
    ctx.lineTo(lx * z + (faint ? 0 : Math.sin(t * 0.05 + lx) * z * 0.03), 0);
    ctx.stroke();
  }
  // 몸
  const g = ctx.createLinearGradient(0, -z * 1.2, 0, -z * 0.4);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, sh);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-z * 0.75, -z * 1.05, z * 1.5, z * 0.62, z * 0.25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,70,40,.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 갈색 얼룩
  ctx.fillStyle = '#9a6a3c';
  ctx.beginPath();
  ctx.ellipse(-z * 0.3, -z * 0.85, z * 0.28, z * 0.18, 0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(z * 0.35, -z * 0.95, z * 0.18, z * 0.1, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-z * 0.78, -z * 0.95, z * 0.1, z * 0.16, -0.6, 0, TAU);
  ctx.fill();
  // 머리
  ctx.save();
  ctx.translate(z * 0.82, -z * 1.18);
  ctx.rotate(faint ? 0.3 : Math.sin(t * 0.04) * 0.15 + 0.2);
  ctx.strokeStyle = '#7d7466';
  ctx.lineWidth = z * 0.1;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * z * 0.08, -z * 0.22);
    ctx.quadraticCurveTo(sd * z * 0.05 - z * 0.25, -z * 0.6, -z * 0.35 + sd * z * 0.06, -z * 0.42);
    ctx.stroke();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(z * 0.08, 0, z * 0.24, z * 0.32, 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(-z * 0.2, -z * 0.05, z * 0.18, z * 0.07, 0.5, 0, TAU);
  ctx.fill();
  // 수염
  ctx.fillStyle = '#d8ccb0';
  ctx.beginPath();
  ctx.moveTo(z * 0.12, z * 0.25);
  ctx.lineTo(z * 0.2, z * 0.55);
  ctx.lineTo(z * 0.26, z * 0.24);
  ctx.fill();
  if (faint) {
    ctx.strokeStyle = '#3a2c25';
    ctx.lineWidth = Math.max(1.2, z * 0.06);
    for (const [a, b] of [[-1, 1], [1, -1]]) (ctx.beginPath(), ctx.moveTo(z * 0.05 + a * z * 0.06, -z * 0.12 - z * 0.06), ctx.lineTo(z * 0.05 + b * z * 0.06, -z * 0.12 + z * 0.06), ctx.stroke());
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.ellipse(z * 0.3, z * 0.2, z * 0.05, z * 0.1, 0.4, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath();
    ctx.ellipse(z * 0.08, -z * 0.1, z * 0.08, z * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(z * 0.03, -z * 0.115, z * 0.1, z * 0.035);
  }
  ctx.restore();
  ctx.restore();
  if (faint && fall >= 1) {
    // 머리 위 어질어질 별
    ctx.fillStyle = '#ffe066';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      ctx.beginPath();
      ctx.arc(x - z * 0.9 + Math.cos(a) * z * 0.45, y - z * 1.2 + Math.sin(a) * z * 0.15, z * 0.1, 0, TAU);
      ctx.fill();
    }
  }
}

function drawWolf(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, face: number, mood: 'sneak' | 'yelp' | 'grin', t: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,30,10,.32)';
  ctx.beginPath();
  ctx.ellipse(x + z * 0.4, y + z * 0.05, z * 1.4, z * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const run = mood === 'yelp' ? 1 : 0.4;
  ctx.strokeStyle = '#5a5f6b';
  ctx.lineWidth = z * 0.18;
  ctx.lineCap = 'round';
  for (const [lx, ph] of [[-0.6, 0], [-0.35, Math.PI], [0.35, Math.PI], [0.6, 0]]) {
    ctx.beginPath();
    ctx.moveTo(lx * z, -z * 0.45);
    ctx.lineTo(lx * z + Math.sin(t * 0.7 + ph) * z * 0.25 * run, -z * 0.02);
    ctx.stroke();
  }
  // 꼬리: 슬금슬금이면 들고, 깨갱이면 다리 사이로
  ctx.fillStyle = '#7b8090';
  ctx.save();
  ctx.translate(-z * 0.9, -z * 0.7);
  ctx.rotate(mood === 'yelp' ? 0.9 : -0.5 + Math.sin(t * 0.1) * 0.15);
  ctx.beginPath();
  ctx.ellipse(-z * 0.3, 0, z * 0.42, z * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, -z * 1.1, 0, -z * 0.35);
  g.addColorStop(0, '#9aa0ad');
  g.addColorStop(1, '#5e6370');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.68, z * 0.95, z * 0.38, mood === 'sneak' ? 0.08 : 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d9dce3';
  ctx.beginPath();
  ctx.ellipse(z * 0.35, -z * 0.5, z * 0.4, z * 0.15, 0, 0, TAU);
  ctx.fill();
  // 머리
  ctx.save();
  ctx.translate(z * 0.9, -z * (mood === 'sneak' ? 0.8 : 1.05));
  ctx.fillStyle = '#878c99';
  for (const ex of [-0.15, 0.12]) {
    ctx.beginPath();
    ctx.moveTo(ex * z - z * 0.13, -z * 0.2);
    ctx.lineTo(ex * z + (mood === 'yelp' ? -z * 0.3 : 0), -z * (mood === 'yelp' ? 0.35 : 0.62));
    ctx.lineTo(ex * z + z * 0.13, -z * 0.22);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, z * 0.36, z * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(z * 0.15, -z * 0.12);
  ctx.lineTo(z * 0.7, z * 0.05);
  ctx.lineTo(z * 0.15, z * 0.2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(z * 0.68, z * 0.03, z * 0.07, 0, TAU);
  ctx.fill();
  if (mood === 'yelp') {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(1.2, z * 0.07);
    ctx.beginPath();
    ctx.moveTo(-z * 0.02, -z * 0.1);
    ctx.lineTo(z * 0.12, -z * 0.04);
    ctx.lineTo(-z * 0.02, z * 0.02);
    ctx.stroke();
    ctx.fillStyle = 'rgba(150,210,255,.9)';
    ctx.beginPath();
    ctx.ellipse(-z * 0.05, z * 0.15, z * 0.05, z * 0.09, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.ellipse(z * 0.05, -z * 0.05, z * 0.09, z * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(z * 0.04, -z * 0.11, z * 0.03, z * 0.12);
    // 씨익
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath();
    ctx.moveTo(z * 0.25, z * 0.14);
    for (let k = 1; k <= 4; k++) ctx.lineTo(z * (0.25 + k * 0.08), z * (0.14 + (k % 2 ? 0.05 : 0)));
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

type GrandpaMood = 'watch' | 'cheer' | 'facepalm' | 'doze';
function drawGrandpa(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, mood: GrandpaMood, t: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,30,10,.3)';
  ctx.beginPath();
  ctx.ellipse(x + z * 0.3, y, z * 0.7, z * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.translate(x, y);
  // 지팡이
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = z * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(z * 0.55, 0);
  ctx.lineTo(z * 0.55, -z * 1.7);
  ctx.arc(z * 0.4, -z * 1.7, z * 0.15, 0, Math.PI, true);
  ctx.stroke();
  // 다리·몸
  ctx.fillStyle = '#3d5a80';
  ctx.fillRect(-z * 0.25, -z * 0.6, z * 0.2, z * 0.6);
  ctx.fillRect(z * 0.05, -z * 0.6, z * 0.2, z * 0.6);
  ctx.fillStyle = '#5b8c5a';
  ctx.beginPath();
  ctx.roundRect(-z * 0.35, -z * 1.35, z * 0.7, z * 0.8, z * 0.2);
  ctx.fill();
  // 팔
  ctx.strokeStyle = '#5b8c5a';
  ctx.lineWidth = z * 0.16;
  const wave = Math.sin(t * 0.4);
  if (mood === 'cheer') {
    ctx.beginPath();
    ctx.moveTo(-z * 0.3, -z * 1.2);
    ctx.lineTo(-z * 0.55 + wave * z * 0.1, -z * 1.75);
    ctx.stroke();
  } else if (mood === 'facepalm') {
    ctx.beginPath();
    ctx.moveTo(-z * 0.3, -z * 1.2);
    ctx.quadraticCurveTo(-z * 0.4, -z * 1.55, -z * 0.05, -z * 1.72);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(z * 0.3, -z * 1.2);
  ctx.lineTo(z * 0.52, -z * 1.0);
  ctx.stroke();
  // 머리
  const nod = mood === 'doze' ? 0.35 : mood === 'watch' ? Math.sin(t * 0.03) * 0.06 : 0;
  ctx.save();
  ctx.translate(0, -z * 1.6);
  ctx.rotate(nod);
  ctx.fillStyle = '#f2c9a5';
  ctx.beginPath();
  ctx.arc(0, 0, z * 0.3, 0, TAU);
  ctx.fill();
  // 수염
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-z * 0.26, z * 0.02);
  ctx.quadraticCurveTo(0, z * 0.6, z * 0.26, z * 0.02);
  ctx.quadraticCurveTo(0, z * 0.18, -z * 0.26, z * 0.02);
  ctx.fill();
  ctx.fillStyle = '#c97b63';
  ctx.beginPath();
  ctx.arc(z * 0.02, z * 0.0, z * 0.06, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#3a2a20';
  ctx.lineWidth = Math.max(1, z * 0.05);
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (mood === 'cheer' || mood === 'doze') ctx.arc(sd * z * 0.11, -z * 0.06, z * 0.05, Math.PI * 1.1, Math.PI * 1.9);
    else ctx.arc(sd * z * 0.11, -z * 0.07, z * 0.03, 0, TAU);
    ctx.stroke();
  }
  // 밀짚모자 (환호하면 손에)
  const hatUp = mood === 'cheer' ? 1 : 0;
  ctx.restore();
  ctx.save();
  if (hatUp) ctx.translate(-z * 0.55 + wave * z * 0.1, -z * 1.95);
  else ctx.translate(0, -z * 1.82), ctx.rotate(nod);
  ctx.fillStyle = '#e9c46a';
  ctx.beginPath();
  ctx.ellipse(0, 0, z * 0.5, z * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f4d58d';
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.1, z * 0.28, z * 0.2, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-z * 0.28, -z * 0.12, z * 0.56, z * 0.06);
  ctx.restore();
  ctx.restore();
}

let darkCv: HTMLCanvasElement | null = null;

function drawAll(ctx: CanvasRenderingContext2D, s: DogState, w: number, _h: number, _th: Theme) {
  const fx = juice(s), t = s.t, F = s.F, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const PX = (fx0: number, fy0: number) => X(SX(fx0, fy0)), PY = (fy0: number) => Y(SY(fy0));
  // 시간대는 판 번호가 아니라 월드로 (C007 M1-4, 🎨): W1 '아침 들판'은 8판 모두 아침 키 하나. 밤 판만 밤 키
  const tod = F.night ? SKY.length - 1 : WORLD_TIME[0], pal = SKY[tod], night = F.night, dusk = F.night ? 1 : tod / 7;
  SHADE = tod === 0 ? 'rgba(36,74,62,.30)' : tod >= 7 ? 'rgba(5,8,25,.45)' : tod >= 4 ? 'rgba(60,30,40,.34)' : 'rgba(30,45,15,.30)';
  const wind = F.wind[0];
  /** pin: 겹침 피하기에서 빼고 그 자리에 고정(뒤에 오는 글자가 피해 간다) — 🎨 C007 '?!' */
  // 팝 글자 (🎨 C010 4그룹 A 소리 · B 보상 · C 경고 · D 안내 — 겹침·개수 규칙은 juice.pop)
  const say = (x: number, y: number, text: string, size: number, o: PopOpt) => fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), Math.max(R(0.19), y), text, '#fff6e4', size, o);
  const flee = s.phase === 'flee' && s.rec ? s.rec : null, q = flee ? Math.min(1, s.pt / FLEE_T) : 1;
  /** 양 i가 지금 화면 어디에 (목장 좌표) */
  const sheepAt = (i: number): [number, number] => {
    const p: [number, number] = flee && flee.path[i] ? pathAt(flee.path[i]!, ease(q)) : [S.x[i], S.y[i]];
    // 풍덩한 양은 개울 가운데서 허우적 (C006 FUN QA: 둑 선에 서 있어 안 빠진 것처럼 보였다)
    if (S.fell[i] && F.river && (!flee || !flee.path[i] || q > 0.6)) p[1] = (F.river.y0 + F.river.y1) / 2;
    return p;
  };
  ctx.save();
  fx.begin(ctx);
  // ═════════ 하늘 ═════════
  const HZ = SY(0) - 0.03;
  const sky = ctx.createLinearGradient(0, 0, 0, Y(HZ));
  sky.addColorStop(0, pal[0]);
  sky.addColorStop(1, pal[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(HZ) + 30);
  if (night)
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(255,255,240,${0.35 + 0.55 * Math.abs(Math.sin(t / 40 + k))})`;
      ctx.fillRect(hsh(k) * w, Y(0.09 + hsh(k + 40) * 0.2), 1.6, 1.6);
    }
  {
    // 해 (판마다 낮아진다) · 밤엔 달
    // 아침(tod 0)은 왼쪽 언덕 뒤로 반쯤 떠오르는 해 — 알림띠 아래, 할아버지·헛간과 안 겹치게 (🎨 C007)
    const morning = tod === 0;
    const sx = morning ? X(0.3) : X(0.2 + 0.05 * dusk), sy = morning ? Y(0.215) : Y(night ? 0.14 : 0.13 + 0.12 * dusk);
    ctx.save();
    ctx.shadowColor = night ? '#cfd8ff' : morning ? '#ffe7a3' : mix('#fff2a8', '#ff7a4a', dusk);
    ctx.shadowBlur = R(morning ? 0.14 : 0.12);
    ctx.fillStyle = pal[2];
    ctx.beginPath();
    ctx.arc(sx, sy, R(night ? 0.04 : morning ? 0.055 : 0.05), 0, TAU);
    ctx.fill();
    ctx.restore();
    if (night) {
      ctx.fillStyle = pal[0];
      ctx.beginPath();
      ctx.arc(sx + R(0.018), sy - R(0.01), R(0.036), 0, TAU);
      ctx.fill();
    } else {
      // 비스듬한 햇살
      ctx.save();
      ctx.globalAlpha = morning ? 0.1 : 0.12 + 0.1 * dusk;
      ctx.fillStyle = morning ? '#fff6d0' : mix('#fff6c8', '#ffb070', dusk);
      for (let k = 0; k < 4; k++) {
        const a0 = 0.15 + k * 0.17 + Math.sin(t * 0.01 + k) * 0.02;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a0) * w * 1.6, sy + Math.sin(a0) * w * 1.6);
        ctx.lineTo(sx + Math.cos(a0 + 0.05) * w * 1.6, sy + Math.sin(a0 + 0.05) * w * 1.6);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx0 = ((k * 0.31 + t * 0.00005 * (1 + (k % 2)) + (wind ? t * 0.0004 * Math.sign(wind) : 0)) % 1.4 + 1.4) % 1.4 - 0.2, cy0 = 0.12 + (k % 3) * 0.035;
    ctx.fillStyle = night ? 'rgba(120,130,180,.35)' : mix('#ffffff', '#ffc2a0', dusk * 0.8);
    ctx.globalAlpha = night ? 1 : 0.85;
    for (const [dx, dy, rr] of [[0, 0, 0.035], [0.035, 0.006, 0.026], [-0.035, 0.008, 0.024], [0.012, -0.013, 0.026]]) (ctx.beginPath(), ctx.arc(X(cx0 + dx), Y(cy0 + dy), R(rr), 0, TAU), ctx.fill());
    ctx.globalAlpha = 1;
  }
  // 새 (V)
  if (!night) {
    ctx.strokeStyle = 'rgba(40,40,60,.55)';
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 3; k++) {
      const bx = ((t * 0.0012 + k * 0.13) % 1.3) - 0.15, by = 0.15 + k * 0.025 + Math.sin(t * 0.02 + k) * 0.006, fl = Math.sin(t * 0.25 + k) * R(0.008);
      ctx.beginPath();
      ctx.moveTo(X(bx) - R(0.012), Y(by) - fl);
      ctx.lineTo(X(bx), Y(by));
      ctx.lineTo(X(bx) + R(0.012), Y(by) - fl);
      ctx.stroke();
    }
  }
  // 먼 언덕 두 겹 + 헛간·나무
  const hill = (base: number, amp: number, col: string, ph: number) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-10, Y(HZ + 0.06));
    for (let x = -0.02; x <= 1.03; x += 0.02) ctx.lineTo(X(x), Y(base - amp * (0.5 + 0.5 * Math.sin(x * 5.2 + ph)) - amp * 0.4 * Math.sin(x * 11 + ph * 2)));
    ctx.lineTo(w + 10, Y(HZ + 0.06));
    ctx.fill();
  };
  hill(0.27, 0.05, night ? '#26304a' : mix(pal[3], pal[1], 0.35), 1.3);
  // 헛간
  {
    const bx = X(0.8), by = Y(0.255), bz = R(0.05);
    ctx.fillStyle = night ? '#3a2830' : '#b5403a';
    ctx.fillRect(bx - bz, by - bz * 0.9, bz * 2, bz * 0.9);
    ctx.fillStyle = night ? '#2a1c22' : '#8e2f2b';
    ctx.beginPath();
    ctx.moveTo(bx - bz * 1.15, by - bz * 0.85);
    ctx.lineTo(bx, by - bz * 1.6);
    ctx.lineTo(bx + bz * 1.15, by - bz * 0.85);
    ctx.fill();
    ctx.fillStyle = night ? '#ffd27a' : '#f4e3c3';
    ctx.fillRect(bx - bz * 0.3, by - bz * 0.6, bz * 0.6, bz * 0.6);
    ctx.strokeStyle = night ? '#3a2830' : '#b5403a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - bz * 0.3, by - bz * 0.6);
    ctx.lineTo(bx + bz * 0.3, by);
    ctx.moveTo(bx + bz * 0.3, by - bz * 0.6);
    ctx.lineTo(bx - bz * 0.3, by);
    ctx.stroke();
  }
  // 아침 안개 (🎨 C007): 먼 언덕 아래를 엷게 덮는다
  if (tod === 0) {
    const mist = ctx.createLinearGradient(0, Y(0.2), 0, Y(0.31));
    mist.addColorStop(0, 'rgba(240,248,255,0)');
    mist.addColorStop(0.6, 'rgba(240,248,255,.38)');
    mist.addColorStop(1, 'rgba(240,248,255,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, Y(0.2), w, Y(0.11));
  }
  hill(0.3, 0.035, night ? '#1f2a38' : pal[4], 4.1);
  // 언덕 위 동그란 나무들
  for (let k = 0; k < 7; k++) {
    const tx = 0.05 + hsh(k + 3) * 0.9;
    if (Math.abs(tx - 0.8) < 0.08) continue;
    const ty = 0.29 - 0.02 * hsh(k + 9), tz = R(0.022 + 0.012 * hsh(k));
    ctx.fillStyle = night ? '#1a2430' : mix(pal[4], '#2f5a2a', 0.5);
    ctx.fillRect(X(tx) - tz * 0.15, Y(ty) - tz * 0.5, tz * 0.3, tz * 0.6);
    ctx.fillStyle = night ? '#1f2c3a' : mix(pal[4], '#3d7a35', 0.45);
    ctx.beginPath();
    ctx.arc(X(tx), Y(ty) - tz, tz, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,.18)';
    ctx.beginPath();
    ctx.arc(X(tx) - tz * 0.35, Y(ty) - tz * 1.3, tz * 0.45, 0, TAU);
    ctx.fill();
  }
  // ═════════ 목장 바닥 ═════════
  const ground = ctx.createLinearGradient(0, Y(HZ), 0, Y(SY(1)));
  ground.addColorStop(0, pal[5]);
  ground.addColorStop(1, pal[6]);
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(-10, Y(HZ + 0.02));
  for (let x = -0.02; x <= 1.03; x += 0.04) ctx.lineTo(X(x), Y(HZ + 0.012 + 0.008 * Math.sin(x * 7 + 1)));
  ctx.lineTo(w + 10, Y(SY(1) + 0.02));
  ctx.lineTo(-10, Y(SY(1) + 0.02));
  ctx.fill();
  // 잔디 깎은 줄무늬 (원근)
  for (let k = 0; k < 10; k++) {
    if (k % 2) continue;
    const y0 = k / 10, y1 = (k + 1) / 10;
    ctx.fillStyle = 'rgba(255,255,220,.07)';
    ctx.beginPath();
    ctx.moveTo(PX(-0.1, y0), PY(y0));
    ctx.lineTo(PX(1.1, y0), PY(y0));
    ctx.lineTo(PX(1.1, y1), PY(y1));
    ctx.lineTo(PX(-0.1, y1), PY(y1));
    ctx.fill();
  }
  // 언덕 굴곡: 볕 드는 둔덕과 그늘진 골
  for (let k = 0; k < 4; k++) {
    const yc = 0.12 + k * 0.25, amp = 0.05;
    const g = ctx.createLinearGradient(0, PY(yc - amp), 0, PY(yc + amp));
    g.addColorStop(0, 'rgba(255,250,200,0)');
    g.addColorStop(0.45, k % 2 ? 'rgba(30,60,20,.10)' : 'rgba(255,245,190,.13)');
    g.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(PX(-0.1, yc - amp), PY(yc - amp));
    for (let x = -0.1; x <= 1.1; x += 0.05) ctx.lineTo(PX(x, yc - amp + 0.02 * Math.sin(x * 6 + k)), PY(yc - amp + 0.02 * Math.sin(x * 6 + k)));
    for (let x = 1.1; x >= -0.1; x -= 0.05) ctx.lineTo(PX(x, yc + amp + 0.02 * Math.sin(x * 6 + k)), PY(yc + amp + 0.02 * Math.sin(x * 6 + k)));
    ctx.fill();
  }
  // 얼룩 (풀빛 차이)
  for (let k = 0; k < 14; k++) {
    const gx = hsh(k + 101), gy = hsh(k + 202);
    ctx.fillStyle = k % 2 ? 'rgba(40,80,20,.08)' : 'rgba(255,255,200,.07)';
    ctx.beginPath();
    ctx.ellipse(PX(gx, gy), PY(gy), R(0.08) * scl(gy), R(0.03) * scl(gy), 0, 0, TAU);
    ctx.fill();
  }
  // ── 개울 ──
  if (F.river) {
    const rv = F.river;
    const band = (y0: number, y1: number) => {
      ctx.beginPath();
      ctx.moveTo(PX(-0.1, y0), PY(y0));
      for (let x = -0.1; x <= 1.1; x += 0.05) ctx.lineTo(PX(x, y0 + 0.006 * Math.sin(x * 13)), PY(y0 + 0.006 * Math.sin(x * 13)));
      for (let x = 1.1; x >= -0.1; x -= 0.05) ctx.lineTo(PX(x, y1 + 0.006 * Math.sin(x * 11 + 2)), PY(y1 + 0.006 * Math.sin(x * 11 + 2)));
      ctx.closePath();
    };
    ctx.fillStyle = night ? '#4a4a3a' : '#a88a5c';
    band(rv.y0 - 0.018, rv.y1 + 0.022);
    ctx.fill();
    const wg = ctx.createLinearGradient(0, PY(rv.y0), 0, PY(rv.y1));
    wg.addColorStop(0, night ? '#1e3a5c' : '#3f8fcf');
    wg.addColorStop(1, night ? '#2a5480' : '#6cc0ea');
    ctx.fillStyle = wg;
    band(rv.y0, rv.y1);
    ctx.fill();
    ctx.save();
    band(rv.y0, rv.y1);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 9; k++) {
      const yy = rv.y0 + ((k * 0.37) % 1) * (rv.y1 - rv.y0), xo = ((t * 0.003 + k * 0.29) % 1.3) - 0.15;
      ctx.beginPath();
      ctx.moveTo(PX(xo, yy), PY(yy));
      ctx.lineTo(PX(xo + 0.06, yy), PY(yy));
      ctx.stroke();
    }
    ctx.restore();
    // 돌
    for (let k = 0; k < 8; k++) {
      const sx0 = hsh(k + 50), sy0 = k % 2 ? rv.y0 - 0.008 : rv.y1 + 0.01;
      if (sx0 > rv.bx0 - 0.04 && sx0 < rv.bx1 + 0.04) continue;
      ctx.fillStyle = night ? '#5a5a60' : '#9a9a92';
      ctx.beginPath();
      ctx.ellipse(PX(sx0, sy0), PY(sy0), R(0.016), R(0.008), 0, 0, TAU);
      ctx.fill();
    }
    // 다리 판자
    const by0 = rv.y0 - 0.016, by1 = rv.y1 + 0.016;
    ctx.fillStyle = '#6b4520';
    ctx.beginPath();
    ctx.moveTo(PX(rv.bx0, by1), PY(by1));
    ctx.lineTo(PX(rv.bx1, by1), PY(by1));
    ctx.lineTo(PX(rv.bx1, by1), PY(by1) + R(0.018));
    ctx.lineTo(PX(rv.bx0, by1), PY(by1) + R(0.018));
    ctx.fill();
    ctx.fillStyle = night ? '#7a5a3a' : '#c08a4e';
    ctx.beginPath();
    ctx.moveTo(PX(rv.bx0, by0), PY(by0));
    ctx.lineTo(PX(rv.bx1, by0), PY(by0));
    ctx.lineTo(PX(rv.bx1, by1), PY(by1));
    ctx.lineTo(PX(rv.bx0, by1), PY(by1));
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,40,15,.55)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 8; k++) {
      const yy = by0 + (k / 8) * (by1 - by0);
      ctx.beginPath();
      ctx.moveTo(PX(rv.bx0, yy), PY(yy));
      ctx.lineTo(PX(rv.bx1, yy), PY(yy));
      ctx.stroke();
    }
  }
  // ── 문 앞 앞마당 = 울타리 땅 (C006 M1-3, GDD §10-1: 그림이 곧 규칙 — 울타리 안과 같은 짚 바닥 + 낮은 나무 테두리) ──
  for (const p of F.pens) {
    const m = p.mat ?? MAT, y0 = p.y1, y1 = p.y1 + m;
    ctx.fillStyle = night ? 'rgba(120,100,60,.5)' : 'rgba(230,200,120,.55)';
    ctx.beginPath();
    ctx.moveTo(PX(p.gx0 + 0.01, y0), PY(y0));
    ctx.lineTo(PX(p.gx1 - 0.01, y0), PY(y0));
    ctx.quadraticCurveTo(PX(p.gx1, y1), PY(y1), PX((p.gx0 + p.gx1) / 2, y1 + 0.01), PY(y1 + 0.01));
    ctx.quadraticCurveTo(PX(p.gx0, y1), PY(y1), PX(p.gx0 + 0.01, y0), PY(y0));
    ctx.fill();
    // 낮은 테두리(점선 나무 말뚝) — 여기까지가 울타리 땅
    ctx.strokeStyle = night ? 'rgba(160,120,80,.7)' : 'rgba(150,100,50,.85)';
    ctx.lineWidth = Math.max(1.5, R(0.006));
    ctx.setLineDash([R(0.012), R(0.008)]);
    ctx.beginPath();
    ctx.moveTo(PX(p.gx0 + 0.01, y0), PY(y0));
    ctx.quadraticCurveTo(PX(p.gx0, y1), PY(y1), PX((p.gx0 + p.gx1) / 2, y1 + 0.01), PY(y1 + 0.01));
    ctx.quadraticCurveTo(PX(p.gx1, y1), PY(y1), PX(p.gx1 - 0.01, y0), PY(y0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(200,160,80,.35)';
    for (let k = 0; k < 8; k++) {
      const hx = p.gx0 + 0.03 + hsh(k + p.gx0 * 100) * (p.gx1 - p.gx0 - 0.06), hy = y0 + 0.015 + hsh(k + 7) * (m - 0.03);
      ctx.beginPath();
      ctx.ellipse(PX(hx, hy), PY(hy), R(0.006), R(0.004), 0, 0, TAU);
      ctx.fill();
    }
    // 울타리 안 짚더미 바닥
    ctx.fillStyle = night ? 'rgba(120,100,60,.4)' : 'rgba(230,200,120,.45)';
    ctx.beginPath();
    ctx.moveTo(PX(p.x0, p.y0), PY(p.y0));
    ctx.lineTo(PX(p.x1, p.y0), PY(p.y0));
    ctx.lineTo(PX(p.x1, p.y1), PY(p.y1));
    ctx.lineTo(PX(p.x0, p.y1), PY(p.y1));
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,160,80,.5)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 16; k++) {
      const hx = p.x0 + 0.02 + hsh(k + 300 + p.x0 * 10) * (p.x1 - p.x0 - 0.04), hy = p.y0 + 0.02 + hsh(k + 400) * (p.y1 - p.y0 - 0.04);
      ctx.beginPath();
      ctx.moveTo(PX(hx, hy), PY(hy));
      ctx.lineTo(PX(hx, hy) + R(0.014), PY(hy) - R(0.004));
      ctx.stroke();
    }
    if (p.tag) {
      // 리본 깃발
      const fxp = PX(p.gx1 + 0.02, p.y1), fyp = PY(p.y1);
      ctx.strokeStyle = '#6b4520';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fxp, fyp);
      ctx.lineTo(fxp, fyp - R(0.1));
      ctx.stroke();
      ctx.fillStyle = RIB[p.tag];
      ctx.beginPath();
      ctx.moveTo(fxp, fyp - R(0.1));
      ctx.lineTo(fxp + R(0.05), fyp - R(0.085) + Math.sin(t * 0.15) * R(0.005));
      ctx.lineTo(fxp, fyp - R(0.065));
      ctx.fill();
    }
  }
  // ── 꽃밭 ──
  F.flowers.forEach((f, k) => {
    const hit = S.fh[k] && !(flee && flee.flowerNew.includes(k) && q < 0.3);
    ctx.fillStyle = hit ? 'rgba(110,80,40,.35)' : 'rgba(60,110,30,.3)';
    ctx.beginPath();
    ctx.ellipse(PX(f.x, f.y), PY(f.y), R(f.r) * scl(f.y), R(f.r * 0.8) * FH * scl(f.y), 0, 0, TAU);
    ctx.fill();
    const cols = ['#ff7eb3', '#ffd166', '#ffffff', '#c77dff', '#ff9f68'];
    for (let j = 0; j < 9; j++) {
      const a = hsh(j + k * 13) * TAU, rr = Math.sqrt(hsh(j + k * 17 + 5)) * f.r * 0.85, px = f.x + Math.cos(a) * rr, py = f.y + Math.sin(a) * rr * 0.8;
      const sx = PX(px, py), sy = PY(py), fz = R(0.009) * scl(py);
      if (hit) {
        ctx.fillStyle = 'rgba(120,90,50,.6)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, fz * 1.4, fz * 0.5, 0.3, 0, TAU);
        ctx.fill();
        continue;
      }
      const sway = Math.sin(t * 0.05 + j) * fz * 0.4 + wind * fz * 8;
      ctx.strokeStyle = '#3f7a2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + sway, sy - fz * 2.2);
      ctx.stroke();
      ctx.fillStyle = cols[(j + k) % cols.length];
      for (let pp = 0; pp < 5; pp++) (ctx.beginPath(), ctx.arc(sx + sway + Math.cos((pp * TAU) / 5) * fz * 0.7, sy - fz * 2.2 + Math.sin((pp * TAU) / 5) * fz * 0.7, fz * 0.55, 0, TAU), ctx.fill());
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(sx + sway, sy - fz * 2.2, fz * 0.35, 0, TAU);
      ctx.fill();
    }
  });
  // ── 클로버 (C003, 🍀 보너스: 흰 양이 지나가면 별) ──
  F.clovers.forEach((c, k) => {
    const got = S.ch[k] && !(flee && flee.cloverNew.includes(k) && q < 0.5);
    // 🎨 C015 ⚠️: 연두 후광은 풀과 대비 1.02~1.08이라 밟을 범위가 안 읽힘 → 크림 후광 + 크림 1.5px 점선 테
    ctx.fillStyle = got ? 'rgba(255,224,102,.32)' : 'rgba(255,246,228,.4)';
    ctx.beginPath();
    ctx.ellipse(PX(c.x, c.y), PY(c.y), R(c.r) * scl(c.y), R(c.r * 0.8) * FH * scl(c.y), 0, 0, TAU);
    ctx.fill();
    if (!got) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,246,228,.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.restore();
    }
    for (let j = 0; j < 7; j++) {
      const a = hsh(j + k * 29 + 3) * TAU, rr = Math.sqrt(hsh(j + k * 31 + 7)) * c.r * 0.8, px = c.x + Math.cos(a) * rr, py = c.y + Math.sin(a) * rr * 0.8;
      const sx = PX(px, py), sy = PY(py), fz = R(0.008) * scl(py), bob = Math.sin(t * 0.06 + j) * fz * 0.3;
      ctx.fillStyle = got ? '#ffe066' : j % 3 ? '#4caf50' : '#2e8b3a';
      for (let l = 0; l < 3; l++) {
        const la = (l * TAU) / 3 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(sx + Math.cos(la) * fz * 0.75, sy - fz * 1.6 + bob + Math.sin(la) * fz * 0.75, fz * 0.62, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = '#2e6b2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - fz * 1.4 + bob);
      ctx.stroke();
    }
  });
  // ── 풀포기 (바람에 살랑) ──
  ctx.strokeStyle = mix(pal[6], '#1d3a12', 0.35);
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 70; k++) {
    const gx = hsh(k + 500) * 1.1 - 0.05, gy = hsh(k + 600);
    if (F.river && gy > F.river.y0 - 0.02 && gy < F.river.y1 + 0.02) continue;
    if (F.pens.some((p) => gx > p.x0 - 0.02 && gx < p.x1 + 0.02 && gy > p.y0 - 0.02 && gy < p.y1 + (p.mat ?? MAT))) continue;
    const sx = PX(gx, gy), sy = PY(gy), gz = R(0.013) * scl(gy);
    const sw = Math.sin(t * 0.05 + k * 1.7) * gz * 0.35 + wind * gz * (9 + 4 * Math.sin(t * 0.13 + k));
    ctx.beginPath();
    for (let b = -1; b <= 1; b++) {
      ctx.moveTo(sx + b * gz * 0.3, sy);
      ctx.quadraticCurveTo(sx + b * gz * 0.4 + sw * 0.4, sy - gz * 0.7, sx + b * gz * 0.6 + sw, sy - gz * (1.1 - Math.abs(b) * 0.25));
    }
    ctx.stroke();
  }
  // 늑대 굴 (덤불)
  if (F.den) {
    const dx0 = F.den[0] < 0.5 ? -0.03 : 1.03, dy0 = F.den[1];
    for (let k = 0; k < 5; k++) {
      const bx = dx0 + (F.den[0] < 0.5 ? 1 : -1) * (k % 2) * 0.03, by = dy0 - 0.08 + k * 0.04, bz = R(0.045) * scl(by);
      ctx.fillStyle = night ? '#13201a' : '#2e5a2a';
      ctx.beginPath();
      ctx.arc(PX(bx, by), PY(by) - bz * 0.6, bz, 0, TAU);
      ctx.fill();
      ctx.fillStyle = night ? '#1a2a22' : '#3f7a35';
      ctx.beginPath();
      ctx.arc(PX(bx, by) - bz * 0.3, PY(by) - bz * 0.9, bz * 0.55, 0, TAU);
      ctx.fill();
    }
  }
  // 들판 장식: 짚더미 · 팻말 · 나비 (부딪히지 않는 가장자리)
  {
    const hx = PX(0.04, 0.95), hy = PY(0.95), hz = R(0.05);
    ctx.fillStyle = SHADE;
    ctx.beginPath();
    ctx.ellipse(hx + hz * 0.4, hy, hz * 1.2, hz * 0.3, 0, 0, TAU);
    ctx.fill();
    const hg = ctx.createLinearGradient(hx - hz, 0, hx + hz, 0);
    hg.addColorStop(0, night ? '#7a6a3a' : '#f2d27a');
    hg.addColorStop(1, night ? '#4a3e20' : '#c99a3e');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(hx, hy - hz * 0.55, hz, hz * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,100,30,.6)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.ellipse(hx, hy - hz * 0.55, hz * (0.9 - k * 0.2), hz * (0.5 - k * 0.1), 0, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    const sx = PX(0.97, 0.9), sy = PY(0.9), sz = R(0.045);
    ctx.fillStyle = '#7a4f24';
    ctx.fillRect(sx - 1.5, sy - sz * 1.4, 3, sz * 1.4);
    ctx.fillStyle = night ? '#6e573c' : '#c8925a';
    ctx.beginPath();
    ctx.roundRect(sx - sz * 0.95, sy - sz * 1.7, sz * 1.1, sz * 0.6, 3);
    ctx.fill();
    // 🎨 C010: '🐑→' 글자 → 판 안 왼쪽에 양, 오른쪽에 화살표
    drawIcon(ctx, 'sheep', sx - sz * 0.62, sy - sz * 1.4, sz * 0.55);
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - sz * 0.3, sy - sz * 1.4), ctx.lineTo(sx - sz * 0.02, sy - sz * 1.4);
    ctx.moveTo(sx - sz * 0.12, sy - sz * 1.52), ctx.lineTo(sx - sz * 0.02, sy - sz * 1.4), ctx.lineTo(sx - sz * 0.12, sy - sz * 1.28);
    ctx.stroke();
    if (!night)
      for (let k = 0; k < 2; k++) {
        const bx = 0.15 + 0.7 * hsh(k + 40) + Math.sin(t * 0.011 + k * 3) * 0.12, by = 0.5 + 0.35 * hsh(k + 41) + Math.cos(t * 0.017 + k) * 0.06;
        const fl = Math.abs(Math.sin(t * 0.35 + k)) * R(0.012) + 1;
        ctx.fillStyle = k ? '#ffe066' : '#ffffff';
        ctx.beginPath();
        ctx.ellipse(PX(bx, by) - fl * 0.6, PY(by) - R(0.07), fl, R(0.008), -0.5, 0, TAU);
        ctx.ellipse(PX(bx, by) + fl * 0.6, PY(by) - R(0.07), fl, R(0.008), 0.5, 0, TAU);
        ctx.fill();
      }
  }
  // ═════════ 서 있는 것들 (먼 것부터) ═════════
  const items: { d: number; f: () => void }[] = [];
  const postH = (fy0: number) => R(0.068) * scl(fy0);
  const fenceCol = night ? ['#5a4630', '#3e2f20', '#6e573c'] : ['#a8743c', '#7a4f24', '#c8925a'];
  const drawFenceRun = (x0: number, y0: number, x1: number, y1: number, hgt = 1, posts = true) => {
    const L = Math.hypot(x1 - x0, (y1 - y0) * 0.9), n = Math.max(1, Math.round(L / 0.09));
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const fxk = x0 + ((x1 - x0) * k) / n, fyk = y0 + ((y1 - y0) * k) / n;
      pts.push([PX(fxk, fyk), PY(fyk), postH(fyk) * hgt]);
    }
    // 그림자
    ctx.strokeStyle = 'rgba(20,40,10,.25)';
    ctx.lineWidth = R(0.012);
    ctx.beginPath();
    ctx.moveTo(pts[0][0] + R(0.02), pts[0][1] + R(0.004));
    ctx.lineTo(pts[n][0] + R(0.02), pts[n][1] + R(0.004));
    ctx.stroke();
    // 가로대 둘
    for (const hh of [0.42, 0.82]) {
      ctx.strokeStyle = fenceCol[1];
      ctx.lineWidth = R(0.014) * scl(y0);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] - pts[0][2] * hh + 1.2);
      for (const p of pts) ctx.lineTo(p[0], p[1] - p[2] * hh + 1.2);
      ctx.stroke();
      ctx.strokeStyle = fenceCol[0];
      ctx.lineWidth = R(0.009) * scl(y0);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] - pts[0][2] * hh);
      for (const p of pts) ctx.lineTo(p[0], p[1] - p[2] * hh);
      ctx.stroke();
    }
    if (posts)
      for (const [px, py, ph] of pts) {
        const pw = R(0.015) * (ph / R(0.068));
        ctx.fillStyle = fenceCol[1];
        ctx.fillRect(px - pw / 2, py - ph, pw, ph);
        ctx.fillStyle = fenceCol[0];
        ctx.fillRect(px - pw / 2, py - ph, pw * 0.55, ph);
        ctx.fillStyle = fenceCol[2];
        ctx.beginPath();
        ctx.ellipse(px, py - ph, pw * 0.6, pw * 0.3, 0, 0, TAU);
        ctx.fill();
      }
  };
  /** 울타리 줄 하나를 깊이 조각으로 나눠 넣는다 (세로 줄은 조각마다) */
  const addFence = (g: Seg, hgt = 1) => {
    if (Math.abs(g.x1 - g.x0) < 1e-6 && Math.abs(g.y1 - g.y0) < 1e-6) return;
    if (Math.abs(g.y1 - g.y0) < 0.01) return void items.push({ d: Math.max(g.y0, g.y1) + 0.001, f: () => drawFenceRun(g.x0, g.y0, g.x1, g.y1, hgt) });
    const n = Math.max(1, Math.round(Math.abs(g.y1 - g.y0) / 0.06));
    for (let k = 0; k < n; k++) {
      const a = k / n, b = (k + 1) / n;
      const xa = g.x0 + (g.x1 - g.x0) * a, ya = g.y0 + (g.y1 - g.y0) * a, xb = g.x0 + (g.x1 - g.x0) * b, yb = g.y0 + (g.y1 - g.y0) * b;
      items.push({ d: Math.max(ya, yb) + 0.001, f: () => drawFenceRun(xa, ya, xb, yb, hgt) });
    }
  };
  const clearAge = s.phase === 'result' && s.ok ? s.pt : -1;
  for (const p of F.pens) {
    addFence({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y0 });
    addFence({ x0: p.x0, y0: p.y0, x1: p.x0, y1: p.y1 });
    addFence({ x0: p.x1, y0: p.y0, x1: p.x1, y1: p.y1 });
    addFence({ x0: p.x0, y0: p.y1, x1: p.gx0, y1: p.y1 });
    addFence({ x0: p.gx1, y0: p.y1, x1: p.x1, y1: p.y1 });
    // 문 두 짝: 열려 있다가 다 넣으면 '딸깍'
    const close = clearAge >= 0 ? Math.min(1, clearAge / 16) : 0, L = (p.gx1 - p.gx0) / 2;
    for (const sd of [1, -1]) {
      const hx = sd > 0 ? p.gx0 : p.gx1, th0 = (close * close * Math.PI) / 2;
      const ex = hx + sd * Math.sin(th0) * L, ey = p.y1 - Math.cos(th0) * L * 0.9;
      items.push({ d: p.y1 + 0.002, f: () => drawFenceRun(hx, p.y1, ex, ey, 0.85) });
    }
  }
  for (const g of F.fences) addFence(g);
  if (F.river) {
    const rv = F.river;
    addFence({ x0: rv.bx0, y0: rv.y0 - 0.012, x1: rv.bx0, y1: rv.y1 + 0.012 }, 0.6);
    addFence({ x0: rv.bx1, y0: rv.y0 - 0.012, x1: rv.bx1, y1: rv.y1 + 0.012 }, 0.6);
  }
  for (const hg of F.hedges)
    items.push({
      d: hg.y0,
      f: () => {
        const n = Math.max(2, Math.round(Math.abs(hg.x1 - hg.x0) / 0.035));
        for (let k = 0; k <= n; k++) {
          const hx = hg.x0 + ((hg.x1 - hg.x0) * k) / n, sx = PX(hx, hg.y0), sy = PY(hg.y0), bz = R(0.03) * scl(hg.y0);
          ctx.fillStyle = SHADE;
          ctx.beginPath();
          ctx.ellipse(sx + bz * 0.5, sy + bz * 0.1, bz * 1.1, bz * 0.35, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = night ? '#1c3020' : '#2f6b2c';
          ctx.beginPath();
          ctx.arc(sx, sy - bz * 0.8, bz * (1 + 0.15 * hsh(k)), 0, TAU);
          ctx.fill();
          ctx.fillStyle = night ? '#24402a' : '#4b9440';
          ctx.beginPath();
          ctx.arc(sx - bz * 0.25, sy - bz * 1.15, bz * 0.6, 0, TAU);
          ctx.fill();
          if (k % 3 === 1) {
            ctx.fillStyle = '#ff6b8a';
            ctx.beginPath();
            ctx.arc(sx + bz * 0.3, sy - bz * 1.0, bz * 0.13, 0, TAU);
            ctx.fill();
          }
        }
      },
    });
  // 양
  const doneHop = s.phase === 'result' && s.ok;
  for (let i = 0; i < F.n; i++) {
    const [sx0, sy0] = sheepAt(i);
    const pa = flee?.path[i];
    let face = sx0 < 0.5 ? 1 : -1, run = 0, mood: SheepMood = 'calm', roll = 0, hop = 0;
    if (pa && q < 1) {
      const [nx] = pathAt(pa, Math.min(1, ease(q) + 0.05));
      face = nx >= sx0 ? 1 : -1;
      run = Math.max(0, 1 - q * 1.1);
      mood = flee!.scare[i] === 3 ? 'happy' : 'scared';
      if (flee!.trip[i] && q > 0.55) roll = Math.min(1, (q - 0.55) / 0.4) * TAU * (face > 0 ? 1 : -1);
    }
    if (S.pen[i] >= 0) {
      mood = 'happy';
      const ag = doneHop ? s.pt : t - s.startT;
      hop = doneHop ? Math.abs(Math.sin(ag * 0.22 + i * 1.3)) * R(0.03) : (t + i * 37) % 160 < 14 ? Math.sin((((t + i * 37) % 160) / 14) * Math.PI) * R(0.012) : 0;
      // 딸깍 폴짝 (ART §7, C011 ③-d): 막 들어간 양은 250ms(15틱) 동안 0.4z 높이로 한 번 뛴다
      const inT = fx.memo[`inT${i}`], dIn = inT === undefined ? 99 : t - inT;
      if (dIn < 15) hop = Math.max(hop, Math.sin((Math.PI * dIn) / 15) * 0.4 * R(0.044) * scl(sy0));
      if (!pa || q >= 1) face = Math.sin(t * 0.01 + i) > 0 ? 1 : -1;
    }
    if (S.fell[i] && (!pa || q > 0.6)) mood = 'swim';
    // 허우적 (🎨 C012 ⓔ, 허들 ③): 풍덩한 틱부터 18틱 — 두 번 솟고(0.3z, 줄이기 ½) ±10° 번갈아 기울며 다리를 휘젓는다
    const fT = fx.memo[`fellT${i}`], fl = fT === undefined || !S.fell[i] ? 99 : t - fT;
    if (fl < 18) {
      const zz = R(0.044) * scl(sy0);
      hop = Math.abs(Math.sin((Math.PI * fl) / 9)) * 0.3 * zz * (REDUCED ? 0.5 : 1);
      roll = REDUCED ? 0 : (Math.floor(fl / 4.5) % 2 ? 1 : -1) * 0.17;
      run = 1;
    }
    if (S.caught === i && (s.phase === 'result' || q > 0.8)) mood = 'scared';
    if (!pa && mood === 'calm' && s.phase === 'run' && Math.hypot(s.toX - S.x[i], s.toY - S.y[i]) < R_OUT) mood = 'scared';
    const z = R(0.044) * scl(sy0);
    let dx0 = sx0;
    if (S.fell[i] && s.phase === 'result') dx0 += Math.sin(s.pt * 0.05) * 0.01 + s.pt * 0.0006;
    const mark = d.needBlack && F.black[i] && S.used === 0 && s.phase === 'aim' && t - s.startT < INTRO_T && S.pen[i] < 0;
    if (mark) {
      const ag = t - s.startT; // 🎨 C014: 까만 양 필수 표시 — 첫 짖기 전까지만(그 뒤는 HUD 알약이 맡는다)
      if (ag % 30 < 12 && ag < 60) hop = Math.max(hop, Math.sin((Math.PI * (ag % 30)) / 12) * R(0.03));
      items.push({ d: sy0 - 0.001, f: () => {
        ctx.lineWidth = 3.5, ctx.strokeStyle = '#7a3e1d', ctx.beginPath(), ctx.ellipse(PX(dx0, sy0), PY(sy0) + z * 0.3, z * 1.3, z * 0.5, 0, 0, TAU), ctx.stroke();
        ctx.lineWidth = 2.5, ctx.strokeStyle = '#ffc857', ctx.stroke();
      } });
    }
    // 🎨 C015: 거꾸로 끌려와 강아지 0.15 안에 든 까만 양은 강아지 바로 위 레이어에(그림 순서만, 시뮬은 그대로 — 🧪 C014 '강아지에 가림')
    const front = F.black[i] && S.pen[i] < 0 && s.rec?.scare[i] === 3 && Math.hypot(sx0 - s.dogX, sy0 - s.dogY) < 0.15;
    items.push({ d: front ? Math.max(sy0, s.dogY + 0.002) : sy0, f: () => drawSheep(ctx, PX(dx0, sy0), PY(sy0), z, { black: F.black[i], tag: F.tag[i], face, run, t: t + i * 9, mood, hop, roll }) });
  }
  // 염소
  if (F.goat) {
    const gt = F.goat, faint = S.goatF > 0 || (flee?.goatFaint ?? false);
    const fAge = faint ? (s.phase === 'flee' && flee?.goatFaint ? s.pt : 30) : 0;
    items.push({ d: gt.y, f: () => drawGoat(ctx, PX(gt.x, gt.y), PY(gt.y), R(0.056) * scl(gt.y), faint ? 1 : 0, fAge, t) });
    if (faint && S.goatF > 0)
      items.push({
        d: 2,
        f: () => {
          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`💫${S.goatF}`, PX(gt.x, gt.y), PY(gt.y) - R(0.075));
        },
      });
  }
  // 늑대
  if (F.den) {
    let wx = S.wx, wy = S.wy, mood: 'sneak' | 'yelp' | 'grin' = 'sneak';
    if (flee && flee.wolfPath) {
      const wq = flee.wolf === 2 ? ease(q) : ease(Math.min(1, q * 1.3));
      wx = flee.wolfPath[0] + (flee.wolfPath[2] - flee.wolfPath[0]) * wq;
      wy = flee.wolfPath[1] + (flee.wolfPath[3] - flee.wolfPath[1]) * wq;
      if (flee.wolf === 2) mood = 'yelp';
    }
    if (S.caught >= 0) mood = 'grin';
    let nearX = 0.5;
    for (let i = 0; i < F.n; i++) if (S.pen[i] < 0) nearX = S.x[i];
    const face = flee?.wolf === 2 ? (F.den[0] < 0.5 ? -1 : 1) : nearX >= wx ? 1 : -1;
    items.push({ d: wy, f: () => drawWolf(ctx, PX(wx, wy), PY(wy), R(0.05) * scl(wy), face, mood, t) });
  }
  // 강아지
  {
    let mood: DogMood = 'idle';
    const anyIn = flee ? flee.inNew.length > 0 : false;
    if (s.phase === 'run') mood = 'run';
    else if (s.phase === 'flee') mood = s.pt < 22 ? 'bark' : flee?.scare.some((v, i) => v === 3 && S.pen[i] < 0) ? 'surprise' : anyIn ? 'proud' : 'idle'; // 🎨 C014: 까만 양이 들면 놀람 대신 뿌듯
    else if (s.phase === 'result') mood = s.ok ? 'proud' : 'dizzy';
    const fellT = Math.max(-1, ...F.black.map((_, i) => (S.fell[i] ? fx.memo[`fellT${i}`] ?? -1 : -1)));
    if (fellT >= 0 && t - fellT < 24 && (s.phase === 'flee' || (s.phase === 'result' && !s.ok))) mood = 'surprise'; // 🎨 C012 ⓔ
    else if (s.idle > 300 && s.stage + s.S.used > 0) mood = 'spin';
    if (s.events.some((e) => e.kind === 'sniff' && t - e.t < 40)) mood = 'sniff';
    let face: number = 1;
    if (s.phase === 'run') face = s.toX >= s.fromX ? 1 : -1;
    else {
      let cx = 0, cn = 0;
      for (let i = 0; i < F.n; i++) if (S.pen[i] < 0) (cx += S.x[i]), cn++;
      face = (cn ? cx / cn : 0.5) >= s.dogX ? 1 : -1;
    }
    let ox = 0, oy = 0;
    const pose: DogPose = { lift: s.phase === 'run' ? R(Math.abs(Math.sin(s.pt * 0.5)) * 0.012) : 0 };
    if (mood === 'spin') (ox = Math.cos(t * 0.35) * 0.02), (oy = Math.sin(t * 0.35) * 0.012);
    if (mood === 'bark') {
      const ag = s.pt;
      pose.sy = ag < 3 ? 0.9 : ag < 10 ? 1 + 0.15 * Math.sin(((ag - 3) / 7) * Math.PI) : 1;
      pose.sx = 1 / Math.sqrt(pose.sy);
    }
    // 1-4 판이 끝나는 짖기: 까만 양이 오면 뒤로 폴짝 → 놀란 채 굳음 → 결과에선 뿌듯하게 제자리로 (🎨 C007 ②-d, 그림만 — 시뮬 위치는 그대로)
    const bi = flee ? flee.scare.findIndex((v, i) => v === 3 && F.black[i]) : -1;
    if (bi >= 0 && s.phase === 'flee' && comeHold(s) && s.pt >= 32) {
      const dir = Math.sign(sheepAt(bi)[0] - s.dogX) || 1, u = s.pt - 32;
      face = dir;
      mood = 'surprise';
      pose.age = u;
      if (u < 5) (pose.sx = 1.15), (pose.sy = 0.85);
      else if (u < 17) {
        ox = -dir * 0.08 * ease(Math.min(1, (u - 5) / 12));
        pose.lift = Math.sin((Math.PI * Math.min(12, u - 5)) / 12) * R(0.03);
        pose.sx = u < 11 ? 0.92 : 1;
        pose.sy = u < 11 ? 1.12 : 1.04;
      } else {
        ox = -dir * 0.08 + (u >= 22 ? Math.sin(t * 1.7) * 0.002 : 0);
        if (u < 22) (pose.sx = 1.18 - ((u - 17) / 5) * 0.18), (pose.sy = 0.82 + ((u - 17) / 5) * 0.18);
      }
    } else if (s.phase === 'result' && s.ok && s.rec && s.rec.scare.some((v, i) => v === 3 && F.black[i]) && F.black.every((b, i) => b || S.pen[i] >= 0)) {
      const bj = s.rec.scare.findIndex((v, i) => v === 3 && F.black[i]);
      const dir = Math.sign(S.x[bj] - s.dogX) || 1;
      ox = -dir * 0.08 * Math.max(0, 1 - s.pt / 14);
    }
    if (mood === 'surprise' && pose.age === undefined && flee) pose.age = s.pt - 22;
    const dz = R(0.06) * scl(s.dogY);
    items.push({ d: s.dogY, f: () => drawDog(ctx, PX(s.dogX + ox, s.dogY + oy), PY(s.dogY + oy), dz, face, mood, t, pose) });
  }
  // ── 도움 깃발 ①② (C004) — 🎨 C016: 깊이 정렬에 넣어 양 위·강아지 뒤에. 밑동이 강아지 몸 안이면 깃대만 길게(천은 귀 위), 천·숫자는 강아지 반대쪽으로 ──
  // 깃발 ① 깜빡임 (🎨 C011 ③-b, 🧪 C009 ②): 말풍선이 뜨는 틱(판 시작 + INTRO_T)부터 30틱마다 3번, 앞 12틱 동안 발밑 기준 1→1.35→1 + 천에 흰빛
  const fa = t - s.startT - INTRO_T, blink = fa >= 0 && fa < 90 && fa % 30 < 12 ? Math.sin((Math.PI * (fa % 30)) / 12) : 0;
  s.flags.forEach(([qx, qy], k) => items.push({ d: qy, f: () => {
    const sx = PX(qx, qy), sy = PY(qy), hgt = R(0.09) * scl(qy), first = k === 0, wave = Math.sin(t * 0.12 + k) * R(0.004), bl = first ? blink : 0;
    const ddx = sx - PX(s.dogX, s.dogY), ddy = PY(s.dogY) - sy, behind = Math.abs(ddx) < R(0.11) && ddy >= 0 && ddy < R(0.15);
    const pole = behind ? R(0.17) * scl(qy) : hgt, dir = behind ? Math.sign(qx - s.dogX) || 1 : 1, top = sy - pole;
    ctx.save();
    if (bl && !REDUCED) ctx.translate(sx, sy), ctx.scale(1 + 0.35 * bl, 1 + 0.35 * bl), ctx.translate(-sx, -sy);
    ctx.globalAlpha = first ? 1 : 0.5;
    ctx.fillStyle = 'rgba(40,30,10,.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, R(0.012), R(0.005), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, top);
    ctx.stroke();
    ctx.fillStyle = first ? '#ff5a4f' : '#ffb3a8';
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.lineTo(sx + dir * hgt * 0.55, top + hgt * 0.2 + wave);
    ctx.lineTo(sx, top + hgt * 0.4);
    ctx.fill();
    if (bl) (ctx.fillStyle = `rgba(255,255,255,${0.5 * bl})`), ctx.fill();
    // 🎨 C016 ⚠️: 깃발 ②(반투명 천)의 숫자는 불투명 갈색 — 흰 반투명 글자는 대비 1.4:1이었다
    ctx.globalAlpha = 1;
    ctx.fillStyle = first ? '#ffffff' : '#7a3e1d';
    ctx.font = `900 ${Math.round(hgt * 0.3)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(k === 0 && s.flags.length === 2 ? '1' : '2', sx + dir * hgt * 0.2, top + hgt * 0.2);
    ctx.restore();
  } }));
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  // 짖는 소리 물결 (짖은 직후)
  if (s.phase === 'flee' && s.pt < 26) {
    const bx = PX(s.dogX, s.dogY), by = PY(s.dogY) - R(0.06);
    ctx.strokeStyle = `rgba(255,255,255,${0.8 - s.pt / 32})`;
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) {
      const rr = R(0.04 + k * 0.03 + s.pt * 0.006);
      ctx.beginPath();
      ctx.ellipse(bx, by + R(0.04), rr * 1.3, rr * 0.75, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    // 바닥 원 (짖는 원이 퍼진다)
    const gr = Math.min(1, s.pt / 14);
    ctx.strokeStyle = `rgba(255,250,210,${0.7 * (1 - s.pt / 26)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(PX(s.dogX, s.dogY), PY(s.dogY), R(R_OUT * FXW) * scl(s.dogY) * gr, R(R_OUT * FH) * gr, 0, 0, TAU);
    ctx.stroke();
  }
  // 바람 줄기
  if (wind) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 9; k++) {
      const yy = 0.36 + hsh(k + 70) * 0.7, ph = ((t * 0.012 * Math.sign(wind) + hsh(k + 80)) % 1 + 1) % 1, xx = ph * 1.4 - 0.2;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
      ctx.beginPath();
      ctx.moveTo(X(xx), Y(yy));
      ctx.quadraticCurveTo(X(xx + 0.05 * Math.sign(wind)), Y(yy - 0.01), X(xx + 0.1 * Math.sign(wind)), Y(yy));
      ctx.stroke();
      ctx.fillStyle = k % 2 ? '#ffb3c6' : '#c7f0a0';
      ctx.fillRect(X(xx + 0.12 * Math.sign(wind)), Y(yy - 0.004 + Math.sin(t * 0.2 + k) * 0.006), 3, 2);
    }
    ctx.globalAlpha = 1;
  }
  // 목동 할아버지 (언덕 위 구경꾼)
  {
    const lastFail = s.phase === 'result' && !s.ok, cheer = s.phase === 'result' && s.ok;
    const mood: GrandpaMood = cheer ? 'cheer' : lastFail ? 'facepalm' : s.idle > 480 ? 'doze' : 'watch';
    const gx = X(0.075), gy = Y(SY(0) + 0.02);
    drawGrandpa(ctx, gx, gy, R(0.05), mood, t);
    if (mood === 'doze') {
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('z', gx + R(0.03), gy - R(0.13) - ((t * 0.3) % 12));
    }
  }
  // ═════════ 미리 보기 (누르고 있는 동안) ═════════
  let pvNote: Part[] = [], warn = false;
  // 1-2 '꾹' 고리가 다 차면 0.4초 동안 미리 보기를 반투명으로 맛보인다 (🎨 C009: 고리만으로는 '미리 보기'가 안 전해짐)
  const hh = handHint(s), ghost = !!hh && hh.k >= 1;
  if (s.phase === 'aim' && (s.down || ghost)) {
    const f = s.down ? aimPoint(s) : ([hh!.fx, hh!.fy] as [number, number]);
    if (!s.down) ctx.globalAlpha = 0.5;
    const snapped = !!f && s.flags.length > 0 && f[0] === s.flags[0][0] && f[1] === s.flags[0][1];
    if (f && !inAnyPen(F, f[0], f[1])) {
      const [pxf, pyf] = f, cx = PX(pxf, pyf), cy = PY(pyf);
      const some = anyone(F, S, pxf, pyf);
      for (const [rr, lab] of [[R_OUT, '조금'], [R_IN, '멀리']] as const) {
        // 원 안에 아무도 없으면 회색 원 — 떼도 멍멍을 안 쓴다는 걸 미리 보여 준다 (C006 M1-3, GDD §10-2)
        ctx.fillStyle = !some ? 'rgba(120,120,120,.14)' : rr === R_IN ? 'rgba(255,230,120,.16)' : 'rgba(255,255,255,.1)';
        ctx.strokeStyle = !some ? 'rgba(190,190,190,.8)' : 'rgba(255,255,255,.75)';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy, R(rr * FXW) * scl(pyf), R(rr * FH), 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lab, cx, cy + R(rr * FH) - R(0.02));
      }
      if (some) {
        const pv = preview(s, pxf, pyf);
        let inN = 0, bad: Part | null = null;
        for (let i = 0; i < F.n; i++) {
          const pa = pv.rec.path[i];
          if (!pa) continue;
          const ok = pv.S.pen[i] >= 0 && S.pen[i] < 0, fell = pv.S.fell[i] > 0;
          if (ok && !F.black[i]) inN++;
          if (fell) bad = { icon: 'drop', text: '풍덩!' };
          const col = fell ? '#ff5a5a' : ok ? '#b6ff7a' : F.black[i] ? '#ffb3e0' : '#ffffff';
          ctx.strokeStyle = 'rgba(0,0,0,.35)';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          const line = () => {
            ctx.beginPath();
            const m = pa.length / 2, stepK = Math.max(1, Math.floor(m / 8));
            for (let k = 0; k < m; k += stepK) ctx.lineTo(PX(pa[k * 2], pa[k * 2 + 1]), PY(pa[k * 2 + 1]) - R(0.02));
            ctx.lineTo(PX(pa[m * 2 - 2], pa[m * 2 - 1]), PY(pa[m * 2 - 1]) - R(0.02));
            ctx.stroke();
          };
          line();
          ctx.strokeStyle = col;
          ctx.lineWidth = 2.5;
          line();
          const ex = PX(pa[pa.length - 2], pa[pa.length - 1]), ey = PY(pa[pa.length - 1]) - R(0.02);
          const m = pa.length / 2, k0 = Math.max(0, m - 3), ax = PX(pa[k0 * 2], pa[k0 * 2 + 1]), ay = PY(pa[k0 * 2 + 1]) - R(0.02), an = Math.atan2(ey - ay, ex - ax);
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(an) * 6, ey + Math.sin(an) * 6);
          ctx.lineTo(ex + Math.cos(an + 2.5) * 7, ey + Math.sin(an + 2.5) * 7);
          ctx.lineTo(ex + Math.cos(an - 2.5) * 7, ey + Math.sin(an - 2.5) * 7);
          ctx.fill();
          if (fell) {
            ctx.font = `${R(0.04)}px system-ui, sans-serif`;
            ctx.fillStyle = '#ffffff';
            drawIcon(ctx, 'drop', ex, ey - 10, 16);
          }
        }
        if (pv.rec.goatFaint && F.goat) {
          ctx.font = `${R(0.045)}px system-ui, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('💫', PX(F.goat.x, F.goat.y), PY(F.goat.y) - R(0.08));
          if (!bad) bad = { text: '염소 꽥!' };
        }
        if (F.den && pv.rec.wolfPath) {
          const [a0, b0, a1, b1] = pv.rec.wolfPath;
          ctx.strokeStyle = pv.rec.wolf === 2 ? 'rgba(200,220,255,.9)' : 'rgba(255,90,90,.95)';
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(PX(a0, b0), PY(b0) - R(0.02));
          ctx.lineTo(PX(a1, b1), PY(b1) - R(0.02));
          ctx.stroke();
          ctx.setLineDash([]);
          if (pv.S.caught >= 0) bad = { text: '늑대에게 잡혀요!' };
        }
        warn = !!bad;
        pvNote = bad ? [bad] : inN ? [{ icon: 'sheep', text: `${inN}마리 쏙!` }] : [];
        if (pv.rec.flowerNew.length && d.bonus === 'flower') pvNote.push({ icon: 'flower', text: '밟아요' });
        if (pv.rec.cloverNew.length && d.bonus === 'clover') pvNote.push({ icon: 'clover', text: '지나가요' });
      } else pvNote = [{ text: '킁? 아무도 없어요 — 멍멍 안 써요' }];
      if (snapped) pvNote.unshift({ icon: 'flag', text: '깃발 자리' });
      // 발자국 표시 (🎨 C010: 🐾 → 그린 발바닥)
      drawIcon(ctx, 'paw', cx, cy, 18);
      if (pvNote.length) {
        // 🎨 C010 D 안내: 잉크 알약 α.9(풍덩·늑대는 #9a2f22) + 크림 14px/800, 높이 28, 아이콘 16px
        ctx.font = `800 14px ${HUD_FONT}`;
        const sep = ctx.measureText(' · ').width, ws = pvNote.map((q) => (q.icon ? 21 : 0) + ctx.measureText(q.text).width);
        const tw = ws.reduce((a, b) => a + b, 0) + sep * (pvNote.length - 1) + 20, bx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx)), by = Math.max(Y(0.4), cy - R(0.25 * FH) - R(0.04));
        ctx.fillStyle = warn ? '#9a2f22' : 'rgba(59,42,30,.9)';
        ctx.beginPath();
        ctx.roundRect(bx - tw / 2, by - 14, tw, 28, 14);
        ctx.fill();
        ctx.fillStyle = '#fff6e4';
        ctx.textAlign = 'left';
        let px = bx - tw / 2 + 10;
        pvNote.forEach((q, k) => {
          if (k) (ctx.fillText(' · ', px, by + 1), (px += sep));
          if (q.icon) drawIcon(ctx, q.icon, px + 8, by, 16), (px += 21);
          ctx.fillStyle = '#fff6e4';
          ctx.fillText(q.text, px, by + 1);
          px += ctx.measureText(q.text).width;
        });
        ctx.textAlign = 'center';
      }
    }
    ctx.globalAlpha = 1;
  }
  // 1-1·1-2 첫 톡 안내: 양 뒤쪽에 그린 손 (C009: 이모지 대신 벡터, 1-2는 '꾹' 고리가 차오른다)
  if (hh) {
    const hx = PX(hh.fx, hh.fy), py = PY(hh.fy), hold = s.stage === 1, k = hh.k;
    const bob = hold ? Math.min(1, k * 3) * R(0.012) : Math.abs(Math.sin(t * 0.12)) * R(0.02);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = hold ? 'rgba(255,255,255,.45)' : `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 0.12)})`;
    ctx.beginPath();
    ctx.ellipse(hx, py, R(0.05), R(0.025), 0, 0, TAU);
    ctx.stroke();
    if (hold && k > 0) {
      ctx.strokeStyle = '#ffc857';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(hx, py, R(0.05), R(0.025), 0, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, k));
      ctx.stroke();
    }
    const z = R(0.075) / 24;
    ctx.save();
    ctx.translate(hx - 10.6 * z, py - 3.6 * z + bob);
    ctx.scale(z, z);
    ctx.fillStyle = '#fff6e4';
    ctx.strokeStyle = '#7a3e1d';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    const HAND = (HAND_P ??= new Path2D(HAND_D));
    ctx.fill(HAND);
    ctx.stroke(HAND);
    ctx.restore();
  }
  // ═════════ 밤: 손전등 둘레만 ═════════
  if (night) {
    if (!darkCv) darkCv = document.createElement('canvas');
    const dc = darkCv, cw = ctx.canvas.width, chh = ctx.canvas.height, k = cw / w;
    if (dc.width !== cw || dc.height !== chh) (dc.width = cw), (dc.height = chh);
    const dctx = dc.getContext('2d')!;
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.clearRect(0, 0, cw, chh);
    dctx.fillStyle = 'rgba(6,10,30,.82)';
    dctx.fillRect(0, Y(SY(0) - 0.02) * k, cw, chh);
    dctx.globalCompositeOperation = 'destination-out';
    const hole = (x: number, y: number, r: number) => {
      const g = dctx.createRadialGradient(x * k, y * k, r * 0.4 * k, x * k, y * k, r * k);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath();
      dctx.ellipse(x * k, y * k, r * k, r * 0.7 * k, 0, 0, TAU);
      dctx.fill();
    };
    hole(PX(s.dogX, s.dogY), PY(s.dogY), R(0.34));
    const p0 = F.pens[0];
    hole(PX((p0.x0 + p0.x1) / 2, p0.y1), PY(p0.y1) - R(0.03), R(0.24));
    if (s.down) {
      const f = aimPoint(s);
      if (f) hole(PX(f[0], f[1]), PY(f[1]), R(0.16));
    }
    dctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(dc, 0, 0);
    ctx.restore();
    // 어둠 속 눈빛 (양은 노란 점 둘, 늑대는 붉은 점 둘)
    const lit = (fx0: number, fy0: number) => Math.hypot((PX(fx0, fy0) - PX(s.dogX, s.dogY)) / R(0.34), (PY(fy0) - PY(s.dogY)) / R(0.34 * 0.7)) < 0.8;
    for (let i = 0; i < F.n; i++) {
      const [a, b] = sheepAt(i);
      if (S.pen[i] >= 0 || lit(a, b)) continue;
      const z = R(0.044) * scl(b), blink = (t + i * 50) % 200 < 6;
      if (blink) continue;
      ctx.fillStyle = F.black[i] ? 'rgba(255,240,150,.95)' : 'rgba(255,255,220,.9)';
      const ex = PX(a, b) + z * 0.95 * (a < 0.5 ? 1 : -1), ey = PY(b) - z * 0.95;
      ctx.beginPath();
      ctx.arc(ex - z * 0.1, ey, Math.max(1.5, z * 0.08), 0, TAU);
      ctx.arc(ex + z * 0.12, ey, Math.max(1.5, z * 0.08), 0, TAU);
      ctx.fill();
      if (!F.black[i]) {
        ctx.fillStyle = 'rgba(240,240,255,.12)';
        ctx.beginPath();
        ctx.ellipse(PX(a, b), PY(b) - z * 0.8, z * 1.0, z * 0.6, 0, 0, TAU);
        ctx.fill();
      }
    }
    if (F.den && !lit(S.wx, S.wy)) {
      const z = R(0.05) * scl(S.wy);
      ctx.fillStyle = 'rgba(255,80,60,.95)';
      ctx.beginPath();
      ctx.arc(PX(S.wx, S.wy) + z * 0.8, PY(S.wy) - z * 0.85, Math.max(1.6, z * 0.09), 0, TAU);
      ctx.arc(PX(S.wx, S.wy) + z * 1.05, PY(S.wy) - z * 0.85, Math.max(1.6, z * 0.09), 0, TAU);
      ctx.fill();
    }
    // 반딧불
    for (let k2 = 0; k2 < 10; k2++) {
      const a = hsh(k2 + 900) + Math.sin(t * 0.01 + k2) * 0.04, b = 0.1 + hsh(k2 + 950) * 0.85 + Math.cos(t * 0.013 + k2) * 0.03;
      ctx.fillStyle = `rgba(220,255,120,${0.3 + 0.6 * Math.abs(Math.sin(t * 0.05 + k2))})`;
      ctx.beginPath();
      ctx.arc(PX(a, b), PY(b) - R(0.05), 1.8, 0, TAU);
      ctx.fill();
    }
  } else {
    // 빛 덧칠: 해 쪽은 따뜻하게, 반대편은 살짝 차갑게 (아침은 금빛 → 푸른 그늘, 🎨 C007)
    const lg = ctx.createLinearGradient(0, Y(0.3), w, Y(1.1));
    lg.addColorStop(0, tod === 0 ? 'rgba(255,226,160,.12)' : `rgba(255,200,120,${0.08 + 0.18 * dusk})`);
    lg.addColorStop(1, tod === 0 ? 'rgba(70,120,160,.07)' : `rgba(60,30,90,${0.05 + 0.2 * dusk})`);
    ctx.fillStyle = lg;
    ctx.fillRect(0, Y(HZ), w, Y(SY(1) - HZ + 0.01));
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, Y(0.7), R(0.35), w / 2, Y(0.7), R(0.85));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,20,10,.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, Y(0.08), w, Y(SY(1) - 0.08));
  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = PX(e.x, e.y), y = PY(e.y);
    if (e.kind === 'bark') cue('bark', 1 + (((e.t * 7919) % 101) - 50) / 1000), fx.ring(x, y, '#ffffff', R(0.16), 4, 0, 0.5), fx.ring(x, y, '#ffffff', R(0.2), 3, 5, 0.5), fx.kick(4), // 🎨 ART §7 짖기 충격파: 바닥 타원 2겹(두 번째 80ms 늦게) (C011 ③-c)
      say(x, y - R(0.1), '멍!', 26, { g: 'A', rot: -0.14 }), fx.burst(x, y - R(0.04), '#fff6d0', 10, 2.6, 2);
    if (e.kind === 'faint') fx.burst(x, y - R(0.04), '#ffe066', 18, 3, 2.6), fx.kick(3), say(x, y - R(0.1), '꽥!', 15, { g: 'A' });
    if (e.kind === 'yelp') say(x, y - R(0.1), '깨갱!', 15, { g: 'A' });
    // 강아지 머리 위는 벡터 '!'(drawDog surprise)가 맡는다 — 글자는 까만 양 위 하나만 (🎨 C007)
    if (e.kind === 'come') cue('baaBlack'), say(PX(e.x, e.y), PY(e.y) - R(0.09), '?!', 16, { g: 'C', bg: '#ffc857', id: `come${e.v}`, who: e.v }), fx.ring(PX(e.x, e.y), PY(e.y), '#ffe0f0', R(0.07), 3);
    if (e.kind === 'clover') fx.burst(x, y - R(0.02), '#ffe066', 18, 3, 2.2), say(x, y - R(0.06), '클로버!', 15, { g: 'B', icon: 'clover' });
    if (e.kind === 'trample') fx.burst(x, y - R(0.02), '#ff9ec7', 22, 3.4, 2.4), say(x, y - R(0.06), '앗, 꽃밭!', 16, { g: 'C', bg: '#ffe0ef', life: 54 });
    if (e.kind === 'sniff') say(x, y - R(0.08), e.text!, 14, { g: 'D' });
    if (e.kind === 'nope') say(X(e.x), Y(e.y), e.text!, 14, { g: 'D' }), fx.kick(1.5);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18), (fx.popups.length = 0); // 🎨 C010: 다시 한 판에 지난 말풍선이 남지 않게
    if (e.kind === 'clear') {
      const p0 = F.pens[0], gx0 = PX((p0.gx0 + p0.gx1) / 2, p0.y1), gy0 = PY(p0.y1), rx0 = PX((p0.x0 + p0.x1) / 2, p0.y0), ry0 = PY(p0.y0) - 18;
      fx.burst(gx0, gy0 - R(0.05), '#ffe066', 40, 6, 3.2), fx.burst(gx0, gy0 - R(0.05), '#ff8fb1', 30, 5, 3), fx.ring(gx0, gy0, '#ffe066', R(0.3), 6), fx.blink('#fff6c8', 0.25);
      say(rx0, ry0, '딸깍!', 15, { g: 'B', icon: 'starW', id: 'in0' }); // 🎨 C010: 쏙 알약 자리(뒤 가로대 위)를 고쳐 쓴다
    }
    if (e.kind === 'fail') for (const p of fx.popups) if (p.g === 'C') p.life = Math.min(p.life, S.fell.some((v) => v) ? 14 : 8); // 🎨 C010: 실패 카드에 말풍선이 닿지 않게 (풍덩은 카드가 뜨는 12틱 무렵까지, C012)
    if (e.kind === 'fail') fx.kick(3), fx.blink('#fff6d6', 0.12); // C002: 실패는 벌이 아니다 — 빨간 번쩍·큰 흔들림 없음
  }
  fx.memo.t = s.t;
  // C 말풍선은 대상 양 머리 위 6px에 매 프레임 따라붙는다 (🎨 C010)
  for (const p of fx.popups) if (p.who !== undefined && p.who < F.n) { const [a, b] = sheepAt(p.who); p.x = Math.max(w * 0.14, Math.min(w * 0.86, PX(a, b))); p.y = PY(b) - R(0.07) - 6 - 14; }
  // 양 하나하나의 순간 (들어감 · 풍덩 · 데굴)
  if (flee) {
    const key = s.S.used * 100;
    for (let i = 0; i < F.n; i++) {
      const pa = flee.path[i];
      if (!pa) continue;
      const m = pa.length / 2, idx = ease(q) * (m - 1);
      const mk = (name: string) => {
        const k2 = name + i;
        if ((fx.memo[k2] ?? -1) === key) return false;
        fx.memo[k2] = key;
        return true;
      };
      // 양털 (ART §7, C011 ③-d): 놀란 양마다 흰 털뭉치 5개(줄이기 설정이면 2개)
      if (flee.scare[i] > 0 && q < 0.08 && mk('wool')) {
        const [a, b] = sheepAt(i);
        fx.burst(PX(a, b), PY(b) - R(0.03), '#ffffff', REDUCED ? 2 : 5, 2.2, 4);
      }
      if (flee.penAt[i] >= 0 && idx >= flee.penAt[i] && mk('in')) {
        fx.memo[`inT${i}`] = t;
        const [a, b] = pathAt(pa, flee.penAt[i] / Math.max(1, m - 1));
        fx.burst(PX(a, b), PY(b) - R(0.03), '#ffffff', 12, 2.6, 2.6);
        fx.ring(PX(a, b), PY(b) - R(0.02), '#e8ffd0', R(0.05), 2);
        const pn = F.pens[Math.max(0, S.pen[i])], rx = PX((pn.x0 + pn.x1) / 2, pn.y0), ry = PY(pn.y0) - 18; // 🎨 C010: 그 울타리 뒤 가로대 위 18px 가운데
        // 🧪 C010: 까만 양이 들어가면 그 '?!'를 거둔다(쏙! 알약에 깔림)
        for (const p of fx.popups) if (p.id === `come${i}`) p.life = Math.min(p.life, 6);
        if (F.black[i]) cue('click', 1), say(rx, ry, d.needBlack ? '까만 양 쏙!' : '까만 양도 쏙!', 15, { g: 'B', icon: 'black', id: 'inB' }); // 🎨 C014
        else if ((fx.memo.inPop ?? -1) !== key) {
          fx.memo.inPop = key;
          const nIn = flee.inNew.filter((j) => !F.black[j]).length;
          cue('click', nIn, F.black.every((bk, j) => bk || S.pen[j] >= 0));
          say(rx, ry, nIn > 1 ? `쏙! ×${nIn}` : '쏙!', 15, { g: 'B', icon: 'sheep', id: `in${S.pen[i]}` });
        }
      }
      // 판이 끝나는 짖기의 0.5초 멈춤: 까만 양 머리 위에 '?!'를 다시 크게 (허들 ②)
      // 🎨 C014: 까만 양이 울타리에 든 짖기(필수 판의 마지막 짖기)엔 '?!'를 다시 띄우지 않는다 — '까만 양 쏙!'을 가렸다
      if (flee.scare[i] === 3 && s.pt >= FLEE_T && comeHold(s) && S.pen[i] < 0 && mk('come2')) {
        const [a, b] = sheepAt(i);
        fx.ring(PX(a, b), PY(b), '#ffe0f0', R(0.09), 4);
        say(PX(a, b), PY(b) - R(0.09), '?!', 16, { g: 'C', bg: '#ffc857', id: `come${i}`, who: i });
      }
      if (flee.scare[i] === 3 && q > 0.75 && !S.fell[i] && !comeHold(s) && mk('love')) {
        const [a, b] = sheepAt(i);
        say(PX(a, b), PY(b) - R(0.1), '', 12, { g: 'A', icon: 'heart' });
      }
      // 빠지는 칸은 경로의 마지막 칸이라 q = 1이 되기 한 칸 앞에서 터뜨린다 (C006 FUN QA: q = 1 틱엔 이미 결과 화면이라 178번 중 161번 안 보였다)
      if (flee.fellAt[i] >= 0 && idx >= flee.fellAt[i] - 1.5 && mk('fell')) {
        const [a, b] = pathAt(pa, flee.fellAt[i] / Math.max(1, m - 1));
        fx.burst(PX(a, b), PY(b), '#bfe9ff', 30, 4.5, 3), fx.ring(PX(a, b), PY(b), '#ffffff', R(0.08), 3), fx.kick(3), cue('splash');
        fx.ring(PX(a, b), PY(b), '#ffffff', R(0.05), 2, 4, 0.35), fx.ring(PX(a, b), PY(b), '#ffffff', R(0.05), 2, 13, 0.35);
        fx.memo[`fellT${i}`] = t;
        say(PX(a, b), PY(b) - R(0.09), '풍덩!', 16, { g: 'C', bg: '#d8f3ff', id: `fell${i}`, who: i, life: 60 });
      }
      if (flee.trip[i] && q > 0.6 && mk('trip')) {
        const [a, b] = sheepAt(i);
        fx.burst(PX(a, b), PY(b), '#d9c9a0', 8, 2, 2);
        say(PX(a, b), PY(b) - R(0.1), '데굴~', 15, { g: 'A' });
      }
      if (flee.scare[i] === 2 && q < 0.1 && (fx.memo.baa ?? -1) !== key && mk('baa')) {
        fx.memo.baa = key;
        cue('baa'); // 🎨 C010: '매애애!' 글자는 없애고 소리가 대신한다
      }
    }
    if (flee.caught >= 0 && q > 0.75) {
      const k2 = 'caught';
      if ((fx.memo[k2] ?? -1) !== key) {
        fx.memo[k2] = key;
        const i = flee.caught;
        fx.kick(3), fx.blink('#e8ecff', 0.12);
        say(PX(S.x[i], S.y[i]), PY(S.y[i]) - R(0.1), '앙!', 15, { g: 'A' });
      }
    }
  }
  ctx.restore();

  // 도움 깃발 ①②는 깊이 정렬(items) 안에서 그린다 — 🎨 C016 ❌: 맨 위에 그리면 강아지 주둥이·눈을 덮었다
  // ═════════ HUD ═════════
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  // 위 줄(판·별)과 새것 알림은 DOM(hud.ts)이 맡는다 (C009 M1-5b, 🎨 §12-3·4)
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < INTRO_T && s.phase === 'aim' && S.used === 0) { // 짖으면 바로 걷는다(C011: 1-4 첫 짖기의 ?!·멍!과 겹침)
      const a = Math.min(1, age / 8, (INTRO_T - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(introTop ? 0.17 : 0.81)); // 🎨 C015: 세로 화면은 캔버스 하늘 띠(Y 0.17, 들판 0.305 위) — 양·클로버·개울을 덮지 않게 · 데스크톱 0.86 → 0.83 → 0.81(🎨 C016: 부제가 강아지 귀 끝에 닿음)
      ctx.scale(sc, sc);
      font(0.075, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#7a3e1d'; // 🎨 C009: 흰 글씨 + 초록 외곽은 강아지와 겹쳐 안 읽힘 → 크림 + 갈색 6px
      const big = `1-${s.stage + 1} ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6e4';
      ctx.fillText(big, 0, 0);
      font(0.04, 800);
      // 🧪 C009: '멍멍 9번 안에'가 칩 '멍멍 1번'과 같이 떠 헷갈림 · 📐·🎨 C014: 까만 양 필수 판은 '양 N마리 넣기 · 까만 양도!'(뒷부분 금색)
      const sub = d.needBlack ? `양 ${F.black.filter((b) => !b).length}마리 넣기 · ` : `흰 양 ${F.black.filter((b) => !b).length}마리 넣기`, tail = d.needBlack ? '까만 양도!' : '';
      ctx.lineWidth = 4; // 🎨 C010: 부제는 6px 외곽에 글자 속이 막혀 4px
      const w1 = ctx.measureText(sub).width, w2 = ctx.measureText(tail).width, x0 = -(w1 + w2) / 2;
      ctx.textAlign = 'left';
      ctx.strokeText(sub, x0, R(0.06));
      ctx.fillText(sub, x0, R(0.06));
      if (tail) ctx.strokeText(tail, x0 + w1, R(0.06)), (ctx.fillStyle = '#ffc857'), ctx.fillText(tail, x0 + w1, R(0.06));
      ctx.textAlign = 'center';
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 실패: 위쪽 크림 알약 카드 (C008, 🎨 §12-7 — 빨강 없음). 통과는 DOM 결과 카드(ui.ts)가 맡는다
  const splashFail = s.phase === 'result' && !s.ok && S.fell.some((v) => v), cardFrom = splashFail ? 12 : 0; // 🎨 C012 ⓔ: 허우적이 끝까지 보이게 (다시 시작 60틱은 그대로, 📐 C003)
  if (s.phase === 'result' && !s.ok && s.pt >= cardFrom) {
    const a = Math.min(1, (s.pt - cardFrom) / 8), cw = Math.min(w - R(0.08), R(0.86)), cx0 = (w - cw) / 2, cy0 = Y(0.34), ch = R(0.15);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#c98a4a'; // 두께는 결과 카드와 같은 색 (🎨 C008)
    ctx.beginPath();
    ctx.roundRect(cx0, cy0 + 6, cw, ch, R(0.04));
    ctx.fill();
    ctx.fillStyle = '#fff6e4';
    ctx.strokeStyle = '#7a3e1d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx0, cy0, cw, ch, R(0.04));
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.05, 900);
    ctx.fillStyle = '#3b2a1e';
    ctx.fillText(s.why, w / 2, cy0 + ch * 0.38);
    font(0.038, 800);
    ctx.fillStyle = '#6b5444';
    ctx.fillText('멍… 괜찮아, 같은 판 한 번 더!', w / 2, cy0 + ch * 0.74);
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 멍멍 · 별 목표 · 안내 ═════════
  // 디오라마 앞면: 풀 가장자리 · 흙 층 · 돌
  {
    const y0 = Y(SY(1)), y1 = Y(SY(1) + 0.04);
    const sg = ctx.createLinearGradient(0, y0, 0, y1);
    sg.addColorStop(0, night ? '#3a2c22' : '#7a5232');
    sg.addColorStop(0.5, night ? '#2c2018' : '#5e3d22');
    sg.addColorStop(1, night ? '#1c140e' : '#3e2814');
    ctx.fillStyle = sg;
    ctx.fillRect(0, y0, w, y1 - y0);
    ctx.fillStyle = night ? 'rgba(90,80,70,.6)' : 'rgba(150,130,110,.75)';
    for (let k = 0; k < 16; k++) {
      ctx.beginPath();
      ctx.ellipse(hsh(k + 700) * w, y0 + (0.3 + 0.5 * hsh(k + 710)) * (y1 - y0), R(0.012 + 0.01 * hsh(k)), R(0.006), 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = mix(pal[6], '#1d3a12', 0.25);
    ctx.beginPath();
    ctx.moveTo(0, y0 - 2);
    for (let x = 0; x <= 1.0001; x += 0.025) ctx.lineTo(X(x), y0 + R(0.008) + R(0.006) * Math.sin(x * 40));
    ctx.lineTo(w, y0 - 2);
    ctx.fill();
    // 앞쪽 큰 풀잎 (흔들흔들)
    ctx.strokeStyle = mix(pal[6], '#0f2a08', 0.3);
    ctx.lineWidth = 2;
    for (let k = 0; k < 26; k++) {
      const gx = X(hsh(k + 800)), gz = R(0.03 + 0.025 * hsh(k + 810)), sw = Math.sin(t * 0.04 + k) * gz * 0.25 + wind * gz * 6;
      ctx.beginPath();
      ctx.moveTo(gx, y0 + 2);
      ctx.quadraticCurveTo(gx + sw * 0.3, y0 - gz * 0.6, gx + sw + (k % 2 ? 4 : -4), y0 - gz);
      ctx.stroke();
    }
  }
  const by = Y(SY(1) + 0.04);
  ctx.fillStyle = night ? 'rgba(12,18,40,.92)' : '#4a3322'; // 🎨 C007 ④-a: 불투명 탁자색 — 캔버스 아래 빈 띠(body)와 이어진다
  ctx.fillRect(0, by, w, Y(A) - by + 2);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(0, by, w, 1.5);
  // 멍멍·양 알약, 별 목표 칩, 안내 줄은 DOM(hud.ts)이 맡는다 (C009 M1-5b, 🎨 §12-5)
}

