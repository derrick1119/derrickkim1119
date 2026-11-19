/**
 * 팽이 전사 핀볼 (32라운드: 실시간 액션 2탄) — 팽이 튕기기 × 가리키기 × 콤보.
 * 조작(손가락 하나, 하는 일 하나): 화면을 꾹 누르면 팽이 전사가 손가락 반대쪽으로 끌려 당겨지며 윙윙 돌기 시작한다(누를수록
 *   회전 게이지가 차고 바람 무늬·잔상이 짙어진다. 손가락 쪽으로 첫 번째 벽까지 갈 길이 보인다). 떼는 순간 손가락 쪽으로 '슝!'
 *   키보드는 화살표로 커서 + 스페이스(누르는 동안 돌리기, 떼면 발사).
 * 규칙(결정적, 고정 간격 물리):
 *   - 회전(S, 0~1)이 곧 빠르기이자 힘이다. 굴러가는 동안 회전이 조금씩 깎이고, 벽에 튕기면 조금, 병정을 치면 그 무게만큼 깎인다.
 *     회전이 바닥나면 비틀비틀 쓰러졌다가 그 자리에서 다시 일어난다(다음 발사는 멈춘 자리에서). 굴러가는 동안엔 다시 못 쏜다.
 *   - 맞은 장난감은 힘(회전)만큼 핀볼처럼 날아가 벽에 튕기고, 날아가며 부딪친 장난감을 또 쓰러뜨린다(연쇄). 무거운 태엽 로봇은
 *     회전이 반 넘게 남아 있어야 쓰러지고, 모자라면 팽이가 '쾅' 튕겨 나온다.
 *   - 장난감들은 침대 밑에서 나와 쿠키 상자 진지로 행진한다(팽이가 멈춰 있어도). 진지에 닿으면 하트 쿠키 하나를 뺏긴다.
 *     하트 셋을 다 뺏기면 그 판 다시(기회 셋을 다 쓰거나 7판을 마치면 끝).
 * 고민: 오래 돌리면(1초) 세고 오래 달리지만 그동안 병정이 다가오고, 짧게 톡 쏘면 약하지만 금방 다시 쏠 수 있다.
 *   어느 각도로 벽을 몇 번 튕겨 줄 선 병정을 옆에서 쓸지, 무거운 것을 회전이 남았을 때 먼저 칠지, 북에 튕겨 회전을 다시 채울지.
 * 와우: 첫 발사에 팽이가 벽을 '탕탕' 튕기며 한 줄로 선 병정들을 옆에서 쓸어, 날아간 병정이 이웃을 도미노처럼 와르르 넘어뜨린다.
 * 판 7개: 목표 = 진지 지키기(나온 장난감을 모두 쓰러뜨리기). 별(쉬운 말) = 1판 하나 · 2판 둘 · 3판부터 셋 — 판마다 하나씩 는다.
 * 펼쳐짐(하는 일이 바뀐다): 1 장난감 병정(줄을 옆에서 쓸기) → 2 태엽 로봇(세게 돌려 먼저 치기) → 3 장난감 북(튕기면 회전이 다시 참
 *   → 북을 거쳐 가는 길) → 4 가시 병정(팽이로 치면 회전이 확 깎임 → 병정을 날려 맞히기) → 5 블록 탑(치면 무너져 줄 선 병정을 덮침)
 *   → 6 딸기잼(팽이가 확 느려지지만 병정도 발이 묶임 → 비켜 가거나 묶인 줄을 노리기) → 7 큰 태엽 로봇 대장(세게 네 번).
 * 웃음: 날아가는 병정은 모자가 벗겨지고 눈이 X, 로봇은 '삐빅?!' 하고 태엽이 거꾸로 돈다. 팽이는 회전이 다하면 눈이 빙글빙글
 *   비틀비틀 털썩, 가시에 찔리면 '따끔!' 펄쩍. 진지 옆 곰 인형이 큰 순간마다 만세, 쿠키를 뺏기면 두 손으로 얼굴을 가린다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 경기장(바닥) 평면: 가로 XL~XR, 세로 YT(침대 쪽) ~ YB(쿠키 진지 쪽). 물리는 이 평면에서 등방으로 */
const XL = 0.06, XR = 0.94, YT = 0, YB = 1;
/** 화면 배치(가로 폭 단위): 평면 y → 화면 OY + y·KY (3/4 시점이라 세로가 눌림). 아래 띠는 GB부터 */
const OY = 0.35, KY = 0.8, GB = 1.3;
/** 팽이: 반지름 · 빠르기(회전 0 → 1) */
const TR = 0.045, VMIN = 0.005, VMAX = 0.027;
/** 돌리기: 톡 = S0, CH틱이면 가득 · 이 아래로 떨어지면 비틀비틀 · 쓰러져 있는 시간 */
const S0 = 0.3, CH = 48, S_STOP = 0.12, WOB = 22;
/** 회전이 깎이는 양: 틱마다 DR0 + DR1·S · 벽에 튕길 때 · 잼 위에서 틱마다 */
const DR0 = 0.005, DR1 = 0.004, WALL_COST = 0.025, JAM_DR = 0.014;
/** 날아가는 장난감: 힘 1의 빠르기 · 날아가는 빠르기 = FLY0 + FLY1·힘 · 중력(높이) */
const FLY_REF = 0.03, FLY0 = 0.009, FLY1 = 0.021, G = 0.0011;
/** 장난감 북(범퍼): 반지름 · 튕기면 회전 + */
const BR = 0.05, BUMP_S = 0.24;
/** 블록 탑: 반지름 · 무너지는 길이 · 덮는 반폭 · 무너지는 데 걸리는 틱 */
const TWR = 0.04, TOWER_L = 0.32, TOWER_W = 0.06, TOWER_T = 10;
const RESULT_OK = 180, RESULT_FAIL = 150, CARD_T = 150, NEWS_T = 150;
const STAR_PTS = 100, CLEAR_PTS = 50, WIN_PTS = 300;
const COOKIES = 3, LIVES = 3;

type K = 'sol' | 'bot' | 'spk' | 'boss';
const RAD: Record<K, number> = { sol: 0.032, bot: 0.04, spk: 0.036, boss: 0.075 };
const SPD: Record<K, number> = { sol: 0.0013, bot: 0.001, spk: 0.0012, boss: 0.0006 };
/** 쓰러뜨리는 데 필요한 힘(팽이 회전 / 날아온 것의 빠르기) */
const WGT: Record<K, number> = { sol: 0.08, bot: 0.5, spk: 0.8, boss: 0.45 };
/** 팽이가 칠 때 깎이는 회전 */
const COST: Record<K, number> = { sol: 0.035, bot: 0.12, spk: 0.32, boss: 0.1 };
const PTS: Record<K, number> = { sol: 10, bot: 25, spk: 30, boss: 200 };
const BOSS_HP = 4;
/** 배우는 판은 너그럽게: [행진 빠르기 배수, 최소 회전] (1판·2판·그 뒤) */
const EASE = [[0.36, 0.75], [0.66, 0.5], [1, S0]];

type StarK = 'clear' | 'nolose' | 'multi' | 'bump' | 'spkfly' | 'tower' | 'shots' | 'bossfly';
interface Star { k: StarK; n: number; label: string }
/** [종류, x, y] — y가 0보다 작으면 침대 밑에서 걸어 나온다 */
type Spawn = [K, number, number];
interface Wave { need: number; wait: number; foes: Spawn[] }
interface StageDef {
  key: string; name: string; news: string; hint: string; goal: string;
  start: [number, number]; bumpers?: number[][]; towers?: number[][]; jams?: number[][];
  waves: Wave[]; stars: Star[];
}
const st = (k: StarK, n: number, label: string): Star => ({ k, n, label });
const row = (k: K, y: number, xs: number[]): Spawn[] => xs.map((x) => [k, x, y]);
const col = (k: K, x: number, ys: number[]): Spawn[] => ys.map((y) => [k, x, y]);

/** 판 7개. 좌표는 뒤집기 전 — 2판부터 판마다(다시 할 때도) 시드로 좌우를 뒤집고 살짝 흔든다 */
export const STAGES: StageDef[] = [
  {
    key: 'sol', name: '침대 앞 러그', news: '', goal: '진지 지키기',
    hint: '줄 선 병정은 옆에서 치면 도미노처럼 넘어가요', start: [0.5, 0.86],
    waves: [
      { need: 0, wait: 1e9, foes: [...row('sol', 0.44, [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]), ...row('sol', 0.35, [0.26, 0.38, 0.5, 0.62, 0.74])] },
      { need: 0, wait: 1e9, foes: [...col('sol', 0.3, [-0.04, -0.14]), ...col('sol', 0.7, [-0.04, -0.14])] },
      { need: 0, wait: 1e9, foes: row('sol', -0.04, [0.22, 0.36, 0.5, 0.64, 0.78]) },
    ],
    stars: [st('clear', 0, '진지 지키기')],
  },
  {
    key: 'bot', name: '장난감 상자 옆', news: '태엽 로봇 — 회전이 반 넘게 남아야 쓰러져요', goal: '진지 지키기',
    hint: '로봇은 세게 돌려서 먼저! 약하면 쾅 튕겨 나와요', start: [0.5, 0.86],
    waves: [
      { need: 0, wait: 1e9, foes: [...row('sol', 0.2, [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]), ['bot', 0.5, 0.06]] },
      { need: 1, wait: 680, foes: [['bot', 0.28, -0.05], ['bot', 0.72, -0.05], ...row('sol', -0.17, [0.34, 0.66])] },
      { need: 1, wait: 680, foes: [...row('sol', -0.04, [0.2, 0.34, 0.5, 0.66, 0.8]), ['bot', 0.48, -0.2]] },
    ],
    stars: [st('clear', 0, '진지 지키기'), st('multi', 5, '한 번에 다섯 쓰러뜨리기')],
  },
  {
    key: 'drum', name: '북 치는 마루', news: '장난감 북 — 튕기면 회전이 다시 차요', goal: '진지 지키기',
    hint: '북에 맞고 튕기면 회전이 다시 차요 — 북을 거쳐 가요', start: [0.5, 0.86],
    bumpers: [[0.24, 0.5], [0.76, 0.5], [0.5, 0.3]],
    waves: [
      { need: 0, wait: 1e9, foes: [...row('sol', 0.08, [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]), ['bot', 0.5, -0.04]] },
      { need: 1, wait: 620, foes: [...col('sol', 0.14, [-0.04, -0.14, -0.24, -0.34]), ...col('sol', 0.86, [-0.04, -0.14, -0.24, -0.34]), ['bot', 0.5, -0.1]] },
      { need: 1, wait: 620, foes: [...row('bot', -0.04, [0.3, 0.7]), ...row('sol', -0.15, [0.2, 0.36, 0.5, 0.64, 0.8])] },
    ],
    stars: [st('clear', 0, '진지 지키기'), st('nolose', 0, '하트 안 잃기'), st('bump', 3, '한 번에 북 세 번 튕기기')],
  },
  {
    key: 'spk', name: '밤송이 언덕', news: '가시 병정 — 팽이로 치면 회전이 확 깎여요', goal: '진지 지키기',
    hint: '가시 병정은 다른 병정을 날려서 맞혀요', start: [0.5, 0.86],
    bumpers: [[0.5, 0.56]],
    waves: [
      { need: 0, wait: 1e9, foes: [['spk', 0.5, 0.1], ...row('sol', 0.22, [0.26, 0.38, 0.62, 0.74])] },
      { need: 1, wait: 620, foes: [['spk', 0.3, -0.05], ['spk', 0.7, -0.05], ...row('sol', 0.05, [0.18, 0.42, 0.58, 0.82]), ['bot', 0.5, -0.2]] },
      { need: 1, wait: 620, foes: [...row('sol', -0.04, [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]), ...row('spk', -0.16, [0.38, 0.62]), ['bot', 0.2, -0.24]] },
    ],
    stars: [st('clear', 0, '진지 지키기'), st('spkfly', 2, '날린 병정으로 가시 병정 둘'), st('nolose', 0, '하트 안 잃기')],
  },
  {
    key: 'tower', name: '블록 마을', news: '블록 탑 — 치면 무너져 병정을 덮쳐요', goal: '진지 지키기',
    hint: '탑을 치면 친 쪽으로 무너져요 — 줄 선 쪽으로 넘겨요', start: [0.5, 0.86],
    towers: [[0.18, 0.36], [0.82, 0.36], [0.5, 0.58]],
    waves: [
      { need: 0, wait: 1e9, foes: [...row('sol', 0.18, [0.3, 0.42, 0.54, 0.66]), ...row('sol', 0.3, [0.36, 0.5, 0.64])] },
      { need: 1, wait: 620, foes: [...row('sol', -0.04, [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]), ['bot', 0.3, -0.16], ['spk', 0.7, -0.16]] },
      { need: 1, wait: 620, foes: [...col('sol', 0.25, [-0.04, -0.14, -0.24]), ...col('sol', 0.75, [-0.04, -0.14, -0.24]), ['bot', 0.5, -0.1], ['spk', 0.5, -0.26]] },
    ],
    stars: [st('clear', 0, '진지 지키기'), st('tower', 3, '무너진 탑으로 셋 덮치기'), st('multi', 6, '한 번에 여섯 쓰러뜨리기')],
  },
  {
    key: 'jam', name: '잼 엎지른 밤', news: '딸기잼 — 팽이도 병정도 발이 묶여요', goal: '진지 지키기',
    hint: '잼 위에선 팽이가 확 느려져요 — 묶인 병정 줄을 노려요', start: [0.5, 0.86],
    jams: [[0.3, 0.46, 0.13, 0.08], [0.72, 0.62, 0.12, 0.08]], bumpers: [[0.84, 0.3]],
    waves: [
      { need: 0, wait: 1e9, foes: [...row('sol', 0.12, [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]), ['bot', 0.3, 0.0]] },
      { need: 1, wait: 620, foes: [...row('sol', -0.04, [0.24, 0.36, 0.48, 0.6, 0.72]), ['spk', 0.5, -0.15], ['bot', 0.78, -0.15]] },
      { need: 1, wait: 620, foes: [...col('sol', 0.3, [-0.04, -0.14, -0.24, -0.34]), ...col('sol', 0.7, [-0.04, -0.14, -0.24, -0.34]), ['bot', 0.5, -0.2]] },
    ],
    stars: [st('clear', 0, '진지 지키기'), st('shots', 8, '팽이 여덟 번 안에 지키기'), st('nolose', 0, '하트 안 잃기')],
  },
  {
    key: 'boss', name: '태엽 대장', news: '큰 로봇 대장 — 세게 네 번 쳐야 해요', goal: '대장 이기기',
    hint: '대장은 회전이 반 넘을 때만 아파해요 — 북으로 채워요', start: [0.5, 0.86],
    bumpers: [[0.2, 0.62], [0.8, 0.62]],
    waves: [
      { need: 0, wait: 1e9, foes: [['boss', 0.5, 0.04], ...row('sol', 0.2, [0.26, 0.38, 0.62, 0.74])] },
      { need: 2, wait: 600, foes: [...row('sol', -0.04, [0.2, 0.32, 0.68, 0.8]), ['spk', 0.5, -0.12], ['bot', 0.3, -0.2]] },
      { need: 2, wait: 600, foes: [...row('sol', -0.04, [0.18, 0.3, 0.42, 0.58, 0.7, 0.82]), ['bot', 0.7, -0.2]] },
    ],
    stars: [st('clear', 0, '대장 이기기'), st('nolose', 0, '하트 안 잃기'), st('bossfly', 1, '날린 병정으로 대장 치기')],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Foe {
  id: number; k: K; x: number; y: number; lane: number; vx: number; vy: number; stun: number; hp: number;
  // 연출 (시뮬레이션 결과와 무관)
  seed: number; ph: number; hurtT: number;
}
/** 쓰러져 날아가는 장난감 (날아가며 부딪친 것을 또 쓰러뜨린다) */
interface Flyer { id: number; k: K; x: number; y: number; vx: number; vy: number; z: number; vz: number; t: number; hit: number[]; seed: number; spin: number }
interface Tower { id: number; x: number; y: number; st: number; t: number; dx: number; dy: number; n: number; ft: number }
interface Bumper { x: number; y: number }
interface Jam { x: number; y: number; rx: number; ry: number }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; k?: string; a?: number }
/** 바닥에 남는 연출 (마찰 자국 · 내려앉은 장난감 · 무너진 블록) — 시뮬레이션과 무관 */
interface Mark { x: number; y: number; a: number; t: number; p: number }
interface Debris { k: string; x: number; y: number; a: number; t: number; seed: number; face: number }

type Mode = 'ready' | 'charge' | 'run' | 'wob';
export interface SpinState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  lives: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  cookies: number; lost: number;
  // 팽이
  x: number; y: number; vx: number; vy: number; S: number; mode: Mode; mt: number; hold: number; aim: number; lock: boolean; finger: { x: number; y: number } | null;
  // 판
  foes: Foe[]; flyers: Flyer[]; towers: Tower[]; bumpers: Bumper[]; jams: Jam[]; nid: number; wave: number; waveT: number;
  // 기록 (별·봇)
  runKO: number; runBump: number; best: number; bumpBest: number; spkFly: number; towerBest: number; bossFly: number; shots: number; kos: number;
  freeze: number; slowT: number; sim: boolean;
  firstPress: number; firstBig: number; launches: number;
  seen: Set<string>; spotted: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { x: number; y: number; t: number; label: string } | null;
  events: Ev[];
  // 연출용 (시뮬레이션 결과와 무관)
  marks: Mark[]; debris: Debris[]; trail: { x: number; y: number; S: number }[]; camX: number; phase2: number; spinPh: number; bearT: number; bearMood: number; face: number; faceT: number;
}

const ev = (s: SpinState, kind: string, x: number, y: number, n?: number, k?: string, a?: number) => {
  if (!s.sim) s.events.push({ t: s.t, kind, x, y, n, k, a });
};
function see(s: SpinState, key: string, text: string) {
  if (s.sim || !key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const speedOf = (S: number) => VMIN + (VMAX - VMIN) * clamp(S, 0, 1);
const spinOf = (hold: number, stage: number) => clamp(Math.max(EASE[Math.min(stage, 2)][1], S0 + (1 - S0) * (hold / CH)), 0, 1);
const KIND_NAME: Record<K, string> = { sol: '장난감 병정', bot: '태엽 로봇', spk: '가시 병정', boss: '로봇 대장' };

// ───────────────────────────── 시뮬레이션 ─────────────────────────────

function inJam(s: SpinState, x: number, y: number) {
  for (const j of s.jams) {
    const u = (x - j.x) / j.rx, v = (y - j.y) / j.ry;
    if (u * u + v * v < 1) return true;
  }
  return false;
}

/** 장난감 하나를 쓰러뜨린다: 진지에서 빼고 날아가는 것으로 바꾼다 */
function knock(s: SpinState, f: Foe, dx: number, dy: number, power: number, by: 'top' | 'fly' | 'tower') {
  const i = s.foes.indexOf(f);
  if (i >= 0) s.foes.splice(i, 1);
  const d = Math.hypot(dx, dy) || 1, sp = FLY0 + FLY1 * clamp(power, 0, 1.2);
  s.flyers.push({
    id: f.id, k: f.k, x: f.x, y: f.y, vx: (dx / d) * sp, vy: (dy / d) * sp, z: 0.004, vz: 0.012 + 0.012 * clamp(power, 0, 1), t: 0, hit: [], seed: f.seed,
    spin: (dx >= 0 ? 1 : -1) * (0.25 + 0.3 * power),
  });
  s.runKO++;
  s.kos++;
  s.best = Math.max(s.best, s.runKO);
  s.pts += PTS[f.k] * Math.min(s.runKO, 8);
  if (!s.sim) {
    s.freeze = Math.max(s.freeze, by === 'top' ? (s.runKO >= 3 ? 4 : 3) : 2);
    if (s.runKO === 5) s.slowT = 36;
    if (s.runKO === 3 && s.firstBig < 0 && s.firstPress >= 0) s.firstBig = s.t;
  }
  ev(s, 'ko', f.x, f.y, s.runKO, f.k, by === 'top' ? 0 : by === 'fly' ? 1 : 2);
}

function topple(s: SpinState, tw: Tower, dx: number, dy: number) {
  if (tw.st !== 0) return;
  const d = Math.hypot(dx, dy) || 1;
  tw.st = 1;
  tw.t = 0;
  tw.dx = dx / d;
  tw.dy = dy / d;
  ev(s, 'topple', tw.x, tw.y, 0, '', Math.atan2(tw.dy, tw.dx));
}

/** 팽이를 n쪽 벽(법선)에서 튕긴다: k = 2면 완전 반사, 0.5면 살짝 꺾임 */
function deflect(s: SpinState, nx: number, ny: number, k: number) {
  const vn = s.vx * nx + s.vy * ny;
  if (vn <= 0) return;
  s.vx -= k * vn * nx;
  s.vy -= k * vn * ny;
}
function renorm(s: SpinState) {
  const v = Math.hypot(s.vx, s.vy) || 1, sp = speedOf(s.S);
  s.vx = (s.vx / v) * sp;
  s.vy = (s.vy / v) * sp;
}

function topStep(s: SpinState, dt: number) {
  const sub = 2, h = dt / sub;
  for (let q = 0; q < sub && s.mode === 'run'; q++) {
    s.x += s.vx * h;
    s.y += s.vy * h;
    // 벽 (탕!)
    let wall = 0;
    if (s.x < XL + TR) (s.x = XL + TR), (s.vx = Math.abs(s.vx)), (wall = 1);
    if (s.x > XR - TR) (s.x = XR - TR), (s.vx = -Math.abs(s.vx)), (wall = 2);
    if (s.y < YT + TR) (s.y = YT + TR), (s.vy = Math.abs(s.vy)), (wall = 3);
    if (s.y > YB - TR) (s.y = YB - TR), (s.vy = -Math.abs(s.vy)), (wall = 4);
    if (wall) {
      ev(s, 'wall', s.x + (wall === 1 ? -TR : wall === 2 ? TR : 0), s.y + (wall === 3 ? -TR : wall === 4 ? TR : 0), wall, '', s.S);
      s.S -= WALL_COST;
    }
    // 북 (둥!)
    for (const b of s.bumpers) {
      const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy);
      if (d < BR + TR && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        deflect(s, nx, ny, 2);
        s.x = b.x - nx * (BR + TR + 0.001);
        s.y = b.y - ny * (BR + TR + 0.001);
        s.S = Math.min(1, s.S + BUMP_S);
        s.runBump++;
        s.bumpBest = Math.max(s.bumpBest, s.runBump);
        ev(s, 'drum', b.x, b.y, s.runBump);
      }
    }
    // 블록 탑
    for (const tw of s.towers) {
      if (tw.st !== 0) continue;
      const dx = tw.x - s.x, dy = tw.y - s.y, d = Math.hypot(dx, dy);
      if (d < TWR + TR && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        topple(s, tw, s.vx + nx * 0.004, s.vy + ny * 0.004);
        deflect(s, nx, ny, 1.4);
        s.S -= 0.03;
        s.x = tw.x - nx * (TWR + TR + 0.001);
        s.y = tw.y - ny * (TWR + TR + 0.001);
      }
    }
    // 장난감
    for (let i = 0; i < s.foes.length; i++) {
      const f = s.foes[i], r = RAD[f.k], dx = f.x - s.x, dy = f.y - s.y, d = Math.hypot(dx, dy);
      if (d >= r + TR || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, P = s.S, v = Math.hypot(s.vx, s.vy) || 1;
      const sep = () => ((s.x = f.x - nx * (r + TR + 0.001)), (s.y = f.y - ny * (r + TR + 0.001)));
      if (f.k === 'sol') {
        knock(s, f, s.vx / v * 0.55 + nx * 0.85, s.vy / v * 0.55 + ny * 0.85, P, 'top');
        s.S -= COST.sol;
        deflect(s, nx, ny, 0.5);
        i--;
      } else if (f.k === 'bot' || f.k === 'spk') {
        s.S -= COST[f.k];
        if (P >= WGT[f.k]) {
          knock(s, f, s.vx / v * 0.5 + nx * 0.9, s.vy / v * 0.5 + ny * 0.9, P, 'top');
          deflect(s, nx, ny, 0.8);
          i--;
        } else {
          // 가시 병정은 꿈쩍 않고, 로봇은 조금 밀려 어질어질
          if (f.k === 'bot') (f.vx = nx * 0.006), (f.vy = ny * 0.006), (f.stun = 40);
          f.hurtT = s.t;
          deflect(s, nx, ny, 2);
          sep();
          ev(s, f.k === 'spk' ? 'spike' : 'clang', (s.x + f.x) / 2, (s.y + f.y) / 2, 0, f.k);
        }
      } else {
        // 대장: 회전이 반 넘으면 아파하고, 아니면 쾅 튕겨 나온다
        if (P >= WGT.boss) {
          f.hp--;
          s.S -= COST.boss;
          f.hurtT = s.t;
          ev(s, 'bosshit', f.x, f.y, f.hp);
          if (f.hp <= 0) {
            knock(s, f, nx, ny, 1, 'top');
            deflect(s, nx, ny, 1);
            i--;
            continue;
          }
          f.vx = nx * 0.004;
          f.vy = ny * 0.004;
          f.stun = 30;
        } else {
          s.S -= 0.05;
          ev(s, 'clang', (s.x + f.x) / 2, (s.y + f.y) / 2, 0, 'boss');
        }
        deflect(s, nx, ny, 2);
        sep();
      }
    }
  }
  if (s.mode !== 'run') return;
  if (inJam(s, s.x, s.y)) {
    s.S -= JAM_DR * dt;
    if (!s.sim && s.t % 6 === 0) ev(s, 'goo', s.x, s.y);
  }
  s.S -= (DR0 + DR1 * s.S) * dt;
  if (s.S < S_STOP) {
    s.mode = 'wob';
    s.mt = 0;
    s.S = Math.max(0, s.S);
    s.vx *= 0.3;
    s.vy *= 0.3;
    ev(s, 'stop', s.x, s.y);
    return;
  }
  renorm(s);
}

function flyerStep(s: SpinState, dt: number) {
  for (let i = 0; i < s.flyers.length; i++) {
    const f = s.flyers[i], r = RAD[f.k] * 0.9;
    f.t += dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.z += f.vz * dt;
    f.vz -= G * dt;
    const fr = Math.pow(0.986, dt);
    f.vx *= fr;
    f.vy *= fr;
    if (f.x < XL + r) (f.x = XL + r), (f.vx = Math.abs(f.vx) * 0.8), ev(s, 'fwall', f.x - r, f.y);
    if (f.x > XR - r) (f.x = XR - r), (f.vx = -Math.abs(f.vx) * 0.8), ev(s, 'fwall', f.x + r, f.y);
    if (f.y < YT + r) (f.y = YT + r), (f.vy = Math.abs(f.vy) * 0.8);
    if (f.y > YB - r) (f.y = YB - r), (f.vy = -Math.abs(f.vy) * 0.8);
    const sp = Math.hypot(f.vx, f.vy), pw = sp / FLY_REF;
    for (const b of s.bumpers) {
      const dx = f.x - b.x, dy = f.y - b.y, d = Math.hypot(dx, dy);
      if (d < BR + r && d > 1e-6) {
        const nx = dx / d, ny = dy / d, vn = f.vx * nx + f.vy * ny;
        if (vn < 0) (f.vx -= 2 * vn * nx), (f.vy -= 2 * vn * ny), (f.vx *= 1.1), (f.vy *= 1.1), ev(s, 'drum', b.x, b.y, 0);
        f.x = b.x + nx * (BR + r + 0.001);
        f.y = b.y + ny * (BR + r + 0.001);
      }
    }
    for (const tw of s.towers) {
      if (tw.st !== 0) continue;
      const dx = tw.x - f.x, dy = tw.y - f.y, d = Math.hypot(dx, dy);
      if (d < TWR + r && pw > 0.12) {
        topple(s, tw, f.vx, f.vy);
        f.vx *= 0.5;
        f.vy *= 0.5;
      }
    }
    if (pw > 0.06) {
      for (let j = 0; j < s.foes.length; j++) {
        const e = s.foes[j], dx = e.x - f.x, dy = e.y - f.y, d = Math.hypot(dx, dy);
        if (d >= r + RAD[e.k] || d < 1e-6 || f.hit.includes(e.id)) continue;
        const nx = dx / d, ny = dy / d;
        f.hit.push(e.id);
        if (e.k === 'boss') {
          if (pw >= 0.25) {
            e.hp--;
            e.hurtT = s.t;
            s.bossFly++;
            ev(s, 'bosshit', e.x, e.y, e.hp, 'fly');
            if (e.hp <= 0) {
              knock(s, e, nx, ny, 0.9, 'fly');
              j--;
            }
          } else ev(s, 'clang', e.x, e.y, 0, 'boss');
          const vn = f.vx * nx + f.vy * ny;
          if (vn > 0) (f.vx -= 2 * vn * nx), (f.vy -= 2 * vn * ny);
          f.vx *= 0.6;
          f.vy *= 0.6;
          continue;
        }
        const need = e.k === 'spk' ? 0.15 : WGT[e.k];
        if (pw >= need) {
          if (e.k === 'spk') (s.spkFly++), ev(s, 'spkfly', e.x, e.y);
          knock(s, e, f.vx / sp * 0.6 + nx * 0.8, f.vy / sp * 0.6 + ny * 0.8, pw * 0.8, 'fly');
          j--;
          f.vx = (f.vx - nx * sp * 0.35) * 0.62;
          f.vy = (f.vy - ny * sp * 0.35) * 0.62;
        } else {
          e.vx = nx * 0.004;
          e.vy = ny * 0.004;
          e.stun = 30;
          e.hurtT = s.t;
          const vn = f.vx * nx + f.vy * ny;
          if (vn > 0) (f.vx -= 2 * vn * nx), (f.vy -= 2 * vn * ny);
          f.vx *= 0.5;
          f.vy *= 0.5;
          ev(s, 'clang', e.x, e.y, 0, e.k);
        }
      }
    }
    if (f.z <= 0 && f.vz < 0) {
      if (f.vz < -0.009) (f.z = 0), (f.vz = -f.vz * 0.35), (f.vx *= 0.6), (f.vy *= 0.6);
      else {
        s.flyers.splice(i, 1);
        i--;
        if (!s.sim) {
          s.debris.push({ k: f.k, x: f.x, y: f.y, a: f.spin * 3, t: s.t, seed: f.seed, face: f.vx >= 0 ? 1 : -1 });
          if (s.debris.length > 40) s.debris.shift();
        }
      }
    }
  }
}

function towerStep(s: SpinState, dt: number) {
  for (const tw of s.towers) {
    if (tw.st !== 1) continue;
    tw.t += dt;
    if (tw.t < TOWER_T) continue;
    tw.st = 2;
    tw.ft = s.t;
    // 친 쪽으로 무너져 그 길 위의 장난감을 덮친다
    let n = 0;
    for (let j = 0; j < s.foes.length; j++) {
      const e = s.foes[j], qx = e.x - tw.x, qy = e.y - tw.y, u = qx * tw.dx + qy * tw.dy;
      if (u < -0.02 || u > TOWER_L) continue;
      if (Math.abs(qx * tw.dy - qy * tw.dx) > TOWER_W + RAD[e.k] * 0.6) continue;
      if (e.k === 'boss') {
        e.hp--;
        e.hurtT = s.t;
        ev(s, 'bosshit', e.x, e.y, e.hp);
        if (e.hp > 0) continue;
      }
      knock(s, e, tw.dx + (qx * 0.5), tw.dy + (qy * 0.5), 0.6, 'tower');
      j--;
      n++;
    }
    tw.n = n;
    s.towerBest = Math.max(s.towerBest, n);
    ev(s, 'crash', tw.x + tw.dx * TOWER_L * 0.6, tw.y + tw.dy * TOWER_L * 0.6, n, '', Math.atan2(tw.dy, tw.dx));
  }
}

function foeStep(s: SpinState, dt: number) {
  const ease = EASE[Math.min(s.stage, 2)][0];
  const topStill = s.mode !== 'run';
  for (let i = 0; i < s.foes.length; i++) {
    const f = s.foes[i], r = RAD[f.k];
    if (f.stun > 0) {
      f.stun -= dt;
      if (f.y < 0.03) f.vy = Math.max(0, f.vy);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= Math.pow(0.88, dt);
      f.vy *= Math.pow(0.88, dt);
    } else {
      const slow = inJam(s, f.x, f.y) ? 0.3 : 1;
      f.y += SPD[f.k] * ease * slow * dt;
      f.x += clamp(f.lane - f.x, -0.0007, 0.0007) * dt;
      f.ph += dt * slow;
    }
    // 북·탑·멈춘 팽이는 비켜 간다
    const avoid = (ox: number, oy: number, R: number) => {
      const dx = f.x - ox, dy = f.y - oy, d = Math.hypot(dx, dy);
      if (d < R + r && f.y < oy + 0.01) {
        let side = dx >= 0 ? 1 : -1;
        if (ox + side * (R + 2 * r) > XR - r || ox + side * (R + 2 * r) < XL + r) side = -side;
        f.x += side * 0.002 * dt;
        f.lane = clamp(f.x + side * 0.01, XL + r, XR - r);
        if (f.y > 0.05) f.y -= SPD[f.k] * ease * dt * 0.7;
      }
    };
    for (const b of s.bumpers) avoid(b.x, b.y, BR + 0.006);
    for (const tw of s.towers) if (tw.st === 0) avoid(tw.x, tw.y, TWR + 0.006);
    if (topStill) avoid(s.x, s.y, TR + 0.004);
    f.x = clamp(f.x, XL + r, XR - r);
    if (f.y > YB - r * 0.6) {
      // 진지에 닿았다: 하트 쿠키를 뺏긴다
      s.foes.splice(i, 1);
      i--;
      const n = f.k === 'boss' ? COOKIES : 1;
      s.cookies -= n;
      s.lost += n;
      ev(s, 'steal', f.x, YB, s.cookies, f.k);
    }
  }
}

/** 한 틱의 세계 (봇이 앞날을 내다볼 때도 똑같이 쓴다 — sim이면 연출·파도 없음) */
function world(s: SpinState, dt: number) {
  if (s.mode === 'run') topStep(s, dt);
  else if (s.mode === 'wob') {
    s.mt += dt;
    if (s.mt >= WOB) (s.mode = 'ready'), (s.mt = 0), ev(s, 'up', s.x, s.y);
  }
  flyerStep(s, dt);
  towerStep(s, dt);
  foeStep(s, dt);
}

function launch(s: SpinState) {
  // 맨 처음 한 번은 톡 쳐도 가득 (첫 손짓에 와르르)
  const S = s.launches === 0 && s.stage === 0 ? 1 : spinOf(s.hold, s.stage);
  s.S = S;
  s.mode = 'run';
  s.mt = 0;
  s.vx = Math.cos(s.aim) * speedOf(S);
  s.vy = Math.sin(s.aim) * speedOf(S);
  s.runKO = 0;
  s.runBump = 0;
  s.shots++;
  s.launches++;
  ev(s, 'launch', s.x, s.y, S, '', s.aim);
}

function spawnWave(s: SpinState) {
  const d = STAGES[s.stage], w = d.waves[s.wave], flip = s.stage > 0 && s.rng() < 0.5;
  const J = () => (s.stage ? (s.rng() - 0.5) * 0.03 : 0);
  for (const [k, x0, y0] of w.foes) {
    const x = clamp((flip ? 1 - x0 : x0) + J(), XL + RAD[k], XR - RAD[k]), y = y0 + J() * 0.5;
    s.foes.push({ id: ++s.nid, k, x, y, lane: x, vx: 0, vy: 0, stun: 0, hp: k === 'boss' ? BOSS_HP : 1, seed: Math.floor(s.rng() * 1e6), ph: s.rng() * 40, hurtT: -99 });
    see(s, k, '');
    if (!s.spotted.has(k)) {
      s.spotted.add(k);
      if (s.t > 0) s.spot = { x, y: Math.max(0.12, y), t: s.t, label: KIND_NAME[k] };
    }
  }
  s.wave++;
  s.waveT = 0;
  ev(s, 'wave', 0.5, 0, s.wave);
}

function newStage(s: SpinState) {
  const d = STAGES[s.stage], flip = s.stage > 0 && s.rng() < 0.5, F = (x: number) => (flip ? 1 - x : x);
  s.x = d.start[0];
  s.y = d.start[1];
  s.vx = s.vy = 0;
  s.S = 0;
  s.mode = 'ready';
  s.mt = 0;
  s.hold = 0;
  s.aim = -Math.PI / 2 - 0.5;
  s.lock = !!s.finger;
  s.cookies = COOKIES;
  s.lost = 0;
  s.foes = [];
  s.flyers = [];
  s.bumpers = (d.bumpers ?? []).map(([x, y]) => ({ x: F(x), y }));
  s.towers = (d.towers ?? []).map(([x, y]) => ({ id: ++s.nid, x: F(x), y, st: 0, t: 0, dx: 0, dy: 0, n: 0, ft: 0 }));
  s.jams = (d.jams ?? []).map(([x, y, rx, ry]) => ({ x: F(x), y, rx, ry }));
  s.wave = 0;
  s.waveT = 0;
  s.runKO = s.runBump = s.best = s.bumpBest = s.spkFly = s.towerBest = s.bossFly = s.shots = 0;
  s.freeze = s.slowT = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.marks = [];
  s.debris = [];
  s.trail = [];
  if (!s.seen.has(d.key)) {
    s.seen.add(d.key);
    if (d.news) s.newsQ.push(d.news);
  }
  for (const [key, list, label] of [['drum', s.bumpers, '장난감 북'], ['tower', s.towers, '블록 탑'], ['jam', s.jams, '딸기잼']] as [string, { x: number; y: number }[], string][]) {
    if (!list.length) continue;
    s.seen.add(key);
    if (!s.spotted.has(key)) (s.spotted.add(key), (s.spot = { x: list[0].x, y: list[0].y, t: s.t, label }));
  }
  // 1판 첫 줄은 처음부터 서 있다(첫 발사에 바로 와르르) · 2판부터는 카드를 읽을 틈을 두고 침대 밑에서 나온다
  if (s.stage === 0) spawnWave(s);
}

function starMet(s: SpinState, x: Star) {
  switch (x.k) {
    case 'clear': return true;
    case 'nolose': return s.lost === 0;
    case 'multi': return s.best >= x.n;
    case 'bump': return s.bumpBest >= x.n;
    case 'spkfly': return s.spkFly >= x.n;
    case 'tower': return s.towerBest >= x.n;
    case 'shots': return s.shots <= x.n;
    case 'bossfly': return s.bossFly >= x.n;
  }
}
function starNow(s: SpinState, x: Star): string {
  const v = x.k === 'multi' ? s.best : x.k === 'bump' ? s.bumpBest : x.k === 'spkfly' ? s.spkFly : x.k === 'tower' ? s.towerBest : x.k === 'shots' ? s.shots : -1;
  if (x.k === 'shots') return `${v}/${x.n}`;
  return v > 0 && v < x.n ? `${v}/${x.n}` : '';
}

function endStage(s: SpinState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (s.mode === 'charge') (s.mode = 'ready'), (s.hold = 0);
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((x) => starMet(s, x));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.bearT = s.t;
    s.bearMood = 2;
    ev(s, 'clear', 0.5, 0.6);
  } else {
    s.lives--;
    s.tries++;
    s.bearT = s.t;
    s.bearMood = 3;
    ev(s, 'fail', s.x, s.y, 0, why);
  }
}

function cosmetic(s: SpinState) {
  s.camX += (s.x - 0.5 - s.camX) * 0.06;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.marks = s.marks.filter((m) => s.t - m.t < 300);
  s.debris = s.debris.filter((d) => s.t - d.t < 150);
  if (s.mode === 'run') {
    s.trail.push({ x: s.x, y: s.y, S: s.S });
    if (s.trail.length > 10) s.trail.shift();
    if (s.S > 0.45 && s.t % 2 === 0) {
      s.marks.push({ x: s.x, y: s.y, a: Math.atan2(s.vy, s.vx), t: s.t, p: s.S });
      if (s.marks.length > 120) s.marks.shift();
    }
  } else if (s.trail.length) s.trail.shift();
  const spin = s.mode === 'run' ? s.S : s.mode === 'charge' ? spinOf(s.hold, s.stage) : s.mode === 'wob' ? 0.1 * (1 - s.mt / WOB) : 0.02;
  s.spinPh += spin * 0.9 + 0.01;
  if (s.spot && s.t - s.spot.t > 110) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

export const topspin: GameDef<SpinState> = {
  id: 'topspin',
  name: '팽이 전사 핀볼',
  genes: ['spintop', 'pointer', 'combo'],
  twist: '팽이의 회전이 곧 빠르기이자 힘이라, 오래 돌려 세게 쏘면 벽을 탕탕 튕기며 줄 선 병정을 도미노처럼 쓸지만 그동안 병정이 다가온다 — 부딪칠 때마다 깎이는 회전을 북으로 다시 채우며 무거운 것부터 칠지 고르는 실시간 핀볼',
  rules: [
    '꾹 누르면 팽이가 윙윙 돌아요(오래 누를수록 세게). 떼면 손가락 쪽으로 슝! 벽에 튕기며 장난감을 쓰러뜨려요.',
    '부딪칠 때마다 회전이 깎이고, 멈추면 그 자리에서 다시 쏴요. 무거운 로봇은 세게 돌 때만 쓰러져요.',
    '장난감이 쿠키 진지에 닿으면 하트 -1. 하트 셋을 잃으면 그 판 다시, 다 쓰러뜨리면 다음 판!',
  ],
  controls: 'touch',
  hint: '꾹 눌러 돌리고, 떼면 그쪽으로 슝! / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '밤 조명이 비치는 아이 방 바닥의 장난감 경기장',
    mood: '창밖엔 별, 스탠드 불빛이 나무 마루와 둥근 러그를 따뜻하게 비춘다. 침대 밑에서 태엽 병정들이 줄지어 걸어 나오고, 얼굴 달린 빨간 팽이 전사가 윙윙 돌며 블록 벽을 탕탕 튕겨 병정들을 핀볼처럼 날린다. 쿠키 상자 진지 옆에서 곰 인형이 응원한다.',
    palette: { bg: '#161a33', ink: '#fff3dc', muted: '#9aa0c8', accent: '#ffc95a', hot: '#ff5a4e', soft: '#2a2f55' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
      lives: LIVES, stars: 0, got: 0, starOk: [false, false, false], pts: 0, won: false, dead: false, again: false, tries: 0, cookies: COOKIES, lost: 0,
      x: 0.5, y: 0.86, vx: 0, vy: 0, S: 0, mode: 'ready', mt: 0, hold: 0, aim: -Math.PI / 2, lock: false, finger: null,
      foes: [], flyers: [], towers: [], bumpers: [], jams: [], nid: 0, wave: 0, waveT: 0,
      runKO: 0, runBump: 0, best: 0, bumpBest: 0, spkFly: 0, towerBest: 0, bossFly: 0, shots: 0, kos: 0, freeze: 0, slowT: 0, sim: false,
      firstPress: -1, firstBig: -1, launches: 0,
      seen: new Set<string>(), spotted: new Set<string>(), newsQ: [], news: null, spot: null, events: [],
      marks: [], debris: [], trail: [], camX: 0, phase2: 0, spinPh: 0, bearT: -999, bearMood: 0, face: 0, faceT: 0,
    } as SpinState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    s.finger = p ? { x: p.x, y: (p.y * A - OY) / KY } : null;
    if (s.phase === 'play') {
      if (s.finger) {
        if (s.mode === 'ready' && !s.lock) {
          s.mode = 'charge';
          s.hold = 0;
          if (s.firstPress < 0) s.firstPress = s.t;
          ev(s, 'press', s.x, s.y);
        }
        if (s.mode === 'charge') {
          const dx = s.finger.x - s.x, dy = s.finger.y - s.y;
          if (Math.hypot(dx, dy) > 0.035) s.aim = Math.atan2(dy, dx);
          s.hold++;
          if (s.hold === CH) ev(s, 'full', s.x, s.y);
        }
      } else {
        if (s.mode === 'charge') launch(s);
        s.lock = false;
      }
    } else s.lock = !!s.finger;
    if (s.phase === 'result') {
      s.pt++;
      cosmetic(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.lives <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    let dt = 1;
    if (s.freeze > 0) (s.freeze--, (dt = 0));
    else if (s.slowT > 0) (s.slowT--, (dt = 0.4));
    if (dt > 0) world(s, dt);
    // 파도: 앞 파도가 거의 끝났거나 오래 지나면 다음 파도가 침대 밑에서 나온다
    const d = STAGES[s.stage];
    s.waveT += dt;
    if (s.wave === 0 && s.pt >= 40) spawnWave(s);
    else if (s.wave > 0 && s.wave < d.waves.length) {
      const w = d.waves[s.wave];
      if ((s.foes.length <= w.need && s.waveT >= 40) || s.waveT >= w.wait) spawnWave(s);
    }
    if (s.cookies <= 0) endStage(s, false, '쿠키를 다 뺏겼어요');
    else if (s.wave >= d.waves.length && !s.foes.length && !s.flyers.length && !s.towers.some((tw) => tw.st === 1)) endStage(s, true, '');
    cosmetic(s);
    s.pt++;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 평면 (x, y)를 가리키는 입력 (캔버스 0~1로) */
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0, 1), y: clamp((OY + y * KY) / A, 0, 1) } });
/** 팽이에서 ang 쪽을 가리키는 입력 (캔버스 안에 들어오도록 거리를 줄인다) */
function aimAt(s: SpinState, ang: number): Input {
  for (let d = 0.22; d > 0.04; d -= 0.03) {
    const x = s.x + Math.cos(ang) * d, y = s.y + Math.sin(ang) * d, cy = (OY + y * KY) / A;
    if (x >= 0.005 && x <= 0.995 && cy >= 0.005 && cy <= 0.995) return at(x, y);
  }
  return at(s.x + Math.cos(ang) * 0.05, s.y + Math.sin(ang) * 0.05);
}

function cloneSim(s: SpinState): SpinState {
  const c = Object.assign({}, s);
  c.sim = true;
  c.rng = () => 0.5;
  c.foes = s.foes.map((f) => ({ ...f }));
  c.flyers = s.flyers.map((f) => ({ ...f, hit: [...f.hit] }));
  c.towers = s.towers.map((t) => ({ ...t }));
  c.events = [];
  return c;
}

interface Plan { ang: number; hold: number; v: number; ko: number }
/** 한 번 쏘아 보고(돌리는 동안 다가오는 것까지) 얻는 값 */
function tryShot(s: SpinState, ang: number, hold: number, maxRun: number): Plan {
  const c = cloneSim(s), d = STAGES[s.stage];
  c.mode = 'charge';
  for (let i = 0; i < hold; i++) world(c, 1);
  c.hold = hold;
  c.aim = ang;
  launch(c);
  let t = 0;
  for (; t < maxRun && (c.mode as Mode) === 'run'; t++) world(c, 1);
  for (let i = 0; i < 16; i++) world(c, 1);
  let v = c.pts - s.pts;
  v -= 600 * (c.lost - s.lost);
  // 남은 장난감: 진지에 가까울수록 위험
  for (const f of c.foes) {
    const q = clamp((f.y - 0.45) / 0.55, 0, 1);
    v -= (f.k === 'boss' ? 260 : 70) * q * q * q;
    if (f.k === 'boss') v -= 40 * f.hp;
  }
  const ko = c.kos - s.kos;
  // 판 목표
  for (const x of d.stars) {
    if (starMet(s, x)) {
      if (x.k === 'shots') v -= ko === 0 ? 80 : 0;
      continue;
    }
    if (x.k === 'multi' && c.best >= x.n) v += 260;
    if (x.k === 'bump') v += c.bumpBest >= x.n ? 220 : c.runBump * 25;
    if (x.k === 'spkfly') v += (c.spkFly - s.spkFly) * 140;
    if (x.k === 'tower') v += c.towerBest >= x.n ? 240 : 0;
    if (x.k === 'bossfly') v += (c.bossFly - s.bossFly) * 200;
    if (x.k === 'shots') v += ko === 0 ? -150 : 0;
  }
  v -= 0.35 * (hold + t);
  return { ang, hold, v, ko };
}

const planMem = new WeakMap<object, { plan: Plan | null; id: number }>();
/**
 * 봇: 팽이가 서 있으면 여러 각도·세기로 쏘아 본다(같은 물리로 앞날을 그대로 돌려 봄). 쓰러뜨린 점수(연속 배수 포함)·뺏길 쿠키·
 * 진지에 가까운 장난감·판 별 목표를 따져 가장 좋은 것을 골라 그만큼 꾹 누르고 뗀다.
 */
export const topspinSmart: Bot<SpinState> = {
  name: '쏘아 보고 고르기',
  act(s) {
    if (s.phase !== 'play') return NO;
    let m = planMem.get(s);
    if (!m) planMem.set(s, (m = { plan: null, id: -1 }));
    if (s.mode === 'charge' && m.plan && m.id === s.launches) {
      if (s.hold >= m.plan.hold) return NO;
      return aimAt(s, m.plan.ang);
    }
    if (s.mode !== 'ready' || s.lock) return NO;
    const live = s.foes.filter((f) => f.y > -0.02);
    if (!live.length) return NO;
    // 먼저 넓게(각도 24 × 세기 2) — 그다음 좋은 셋 둘레를 촘촘히
    const holds = s.stage === 0 ? [3, 30] : [3, 24, 48];
    const cand: Plan[] = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2 + 0.07;
      for (const hd of holds) cand.push(tryShot(s, a, hd, 140));
    }
    for (const f of live) {
      const a = Math.atan2(f.y - s.y, f.x - s.x);
      cand.push(tryShot(s, a, 48, 140));
    }
    cand.sort((p, q) => q.v - p.v);
    const top3 = cand.slice(0, 3);
    let best = cand[0];
    for (const c of top3)
      for (const da of [-0.06, 0.06]) {
        const r = tryShot(s, c.ang + da, c.hold, 140);
        if (r.v > best.v) best = r;
      }
    m.plan = best;
    m.id = s.launches;
    return aimAt(s, best.ang);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 아무 데나 아무만큼 꾹 눌렀다 뗀다 */
export const topspinRandom: Bot<SpinState> = {
  name: '아무 데나 슝',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0.5, y: 0.5 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.x = rng();
    m.y = (OY + rng() * KY) / A;
    m.hold = 2 + Math.floor(rng() * 50);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

/** 버릇 봇: 늘 끝까지 돌려서 가장 가까운 장난감에 똑바로 */
export const topspinHabit: Bot<SpinState> = {
  name: '늘 최대로, 가장 가까운 적에 직선',
  act(s) {
    if (s.phase !== 'play' || s.lock) return NO;
    if (s.mode !== 'ready' && s.mode !== 'charge') return NO;
    let best: Foe | null = null, bd = 1e9;
    for (const f of s.foes) {
      if (f.y < -0.02) continue;
      const d = Math.hypot(f.x - s.x, f.y - s.y);
      if (d < bd) (bd = d), (best = f);
    }
    if (!best) return NO;
    if (s.mode === 'charge' && s.hold >= CH) return NO;
    return aimAt(s, Math.atan2(best.y - s.y, best.x - s.x));
  },
};

/** 독립 버릇 봇: 늘 진지에 가장 가까운 장난감을 짧게 톡 (돌리기·튕기기 계산 없음) */
export const topspinHabit2: Bot<SpinState> = {
  name: '늘 진지에 가장 가까운 적에 짧게',
  act(s) {
    if (s.phase !== 'play' || s.lock) return NO;
    if (s.mode !== 'ready' && s.mode !== 'charge') return NO;
    let best: Foe | null = null;
    for (const f of s.foes) if (f.y > -0.02 && (!best || f.y > best.y)) best = f;
    if (!best) return NO;
    if (s.mode === 'charge' && s.hold >= 6) return NO;
    return aimAt(s, Math.atan2(best.y - s.y, best.x - s.x));
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
type C2 = CanvasRenderingContext2D;
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
const OUT = '#1d1230';
function stroke(ctx: C2, lw: number, col = OUT) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ── 배경 (미리 그려 두는 층) ──
interface Bg { room: HTMLCanvasElement; bedTop: HTMLCanvasElement; bedFront: HTMLCanvasElement; floor: HTMLCanvasElement }
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
/** 침대·벽 높이 (가로 폭 단위): 벽 0.085~WALL_B · 이불 윗면 ~BED_F · 이불 자락 ~GAP0 · 침대 밑 어둠 ~OY */
const WALL_B = 0.215, BED_F = 0.268, GAP0 = 0.312;
const BLOCK_COLS = ['#c9534a', '#e2a943', '#4a86c8', '#58a85e', '#b26ad0'];

/** 3/4 시점 블록 하나 (윗면 + 앞면) — 장난감 나무 블록 */
function block(g: C2, x: number, y: number, bw: number, bd: number, bh: number, col: string, mark: number) {
  // 앞면
  g.fillStyle = lin(g, 0, y, 0, y + bh, [0, col], [1, shade(col, -0.35)]);
  rr(g, x, y, bw, bh, bw * 0.12);
  g.fill();
  stroke(g, 1.2);
  // 윗면
  g.fillStyle = lin(g, 0, y - bd, 0, y, [0, shade(col, 0.35)], [1, shade(col, 0.12)]);
  rr(g, x, y - bd, bw, bd + bw * 0.06, bw * 0.12);
  g.fill();
  stroke(g, 1.2);
  // 앞면 무늬 (동그라미·세모·별)
  const cx = x + bw / 2, cy = y + bh * 0.52, r = Math.min(bw, bh) * 0.24;
  g.fillStyle = 'rgba(255,248,230,.55)';
  if (mark % 3 === 0) (g.beginPath(), g.arc(cx, cy, r, 0, TAU));
  else if (mark % 3 === 1) {
    g.beginPath();
    g.moveTo(cx, cy - r);
    g.lineTo(cx + r, cy + r * 0.8);
    g.lineTo(cx - r, cy + r * 0.8);
    g.closePath();
  } else starPath(g, cx, cy, r * 1.1);
  g.fill();
}
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  if (k > 0) (r += (255 - r) * k), (gg += (255 - gg) * k), (b += (255 - b) * k);
  else (r *= 1 + k), (gg *= 1 + k), (b *= 1 + k);
  return `rgb(${Math.round(r)},${Math.round(gg)},${Math.round(b)})`;
}

function getBg(w: number, h: number, sc: number): Bg {
  const key = `${w}x${h}:${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w;
  // 벽 (시차: 가로로 조금 더 넓게)
  const RW = w * 1.12;
  const room = layer(RW, R(WALL_B) + 4, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, R(WALL_B), [0, '#151a3c'], [1, '#232a58']);
    g.fillRect(0, 0, RW, R(WALL_B) + 4);
    // 벽지: 작은 별·달 무늬
    for (let k = 0; k < 46; k++) {
      const x = hsh(k * 3.3) * RW, y = R(0.09) + hsh(k * 7.1) * R(0.12);
      g.fillStyle = 'rgba(160,170,240,.13)';
      if (k % 4) starPath(g, x, y, R(0.008));
      else (g.beginPath(), g.arc(x, y, R(0.006), 0, TAU));
      g.fill();
    }
    // 창문 (밤하늘·달·별)
    const wx = R(0.1), wy = R(0.098), ww = R(0.3), wh = R(0.14);
    g.fillStyle = lin(g, 0, wy, 0, wy + wh, [0, '#070b26'], [0.6, '#16255a'], [1, '#2d4486']);
    g.fillRect(wx, wy, ww, wh);
    for (let k = 0; k < 26; k++) {
      g.globalAlpha = 0.4 + hsh(k + 3) * 0.6;
      g.fillStyle = k % 5 ? '#e6ebff' : '#ffe9b0';
      g.beginPath();
      g.arc(wx + hsh(k * 1.7) * ww, wy + hsh(k * 2.9) * wh * 0.85, k % 6 ? 0.7 : 1.3, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    const mx = wx + ww * 0.72, my = wy + wh * 0.34, mr = R(0.03);
    g.fillStyle = radg(g, mx, my, mr * 0.6, mr * 3.5, [0, 'rgba(255,240,200,.35)'], [1, 'rgba(255,240,200,0)']);
    g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#fff3cc';
    g.beginPath();
    g.arc(mx, my, mr, 0, TAU);
    g.fill();
    g.fillStyle = '#16255a';
    g.beginPath();
    g.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.85, 0, TAU);
    g.fill();
    // 먼 지붕들
    g.fillStyle = '#0b1230';
    g.beginPath();
    g.moveTo(wx, wy + wh);
    for (let k = 0; k <= 8; k++) {
      const x0 = wx + (k / 8) * ww, hh = R(0.015) + hsh(k + 40) * R(0.03);
      g.lineTo(x0, wy + wh - hh);
      g.lineTo(x0 + ww / 16, wy + wh - hh - R(0.012));
      g.lineTo(x0 + ww / 8, wy + wh - hh);
    }
    g.lineTo(wx + ww, wy + wh);
    g.closePath();
    g.fill();
    for (let k = 0; k < 6; k++) {
      g.fillStyle = 'rgba(255,214,120,.8)';
      g.fillRect(wx + hsh(k + 50) * ww * 0.95, wy + wh - R(0.012) - hsh(k + 51) * R(0.02), R(0.006), R(0.006));
    }
    // 창틀 · 십자
    g.strokeStyle = '#6a4a35';
    g.lineWidth = R(0.012);
    g.strokeRect(wx, wy, ww, wh);
    g.lineWidth = R(0.007);
    g.beginPath();
    g.moveTo(wx + ww / 2, wy);
    g.lineTo(wx + ww / 2, wy + wh);
    g.moveTo(wx, wy + wh / 2);
    g.lineTo(wx + ww, wy + wh / 2);
    g.stroke();
    g.strokeStyle = 'rgba(255,220,170,.25)';
    g.lineWidth = 1;
    g.strokeRect(wx - R(0.004), wy - R(0.004), ww + R(0.008), wh + R(0.008));
    // 커튼 (주름)
    for (const [cx0, dir] of [[wx - R(0.03), 1], [wx + ww + R(0.03), -1]] as [number, number][]) {
      const cw = R(0.07);
      g.fillStyle = lin(g, cx0, 0, cx0 + dir * cw, 0, [0, '#3a3f8a'], [0.5, '#5258a8'], [1, '#2c3070']);
      g.beginPath();
      g.moveTo(cx0, R(0.088));
      g.lineTo(cx0 + dir * cw, R(0.088));
      g.quadraticCurveTo(cx0 + dir * cw * 0.55, R(0.17), cx0 + dir * cw * 0.85, R(WALL_B));
      g.lineTo(cx0, R(WALL_B));
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(20,16,50,.45)';
      g.lineWidth = 1.2;
      for (let j = 1; j < 4; j++) {
        g.beginPath();
        g.moveTo(cx0 + dir * cw * (j / 4) * 0.9, R(0.09));
        g.quadraticCurveTo(cx0 + dir * cw * (j / 4) * 0.6, R(0.16), cx0 + dir * cw * (j / 4) * 0.8, R(WALL_B));
        g.stroke();
      }
    }
    g.fillStyle = '#6a4a35';
    rr(g, wx - R(0.05), R(0.084), ww + R(0.1), R(0.009), R(0.004));
    g.fill();
    // 책장 (오른쪽)
    const bx = R(0.62), bw = R(0.36), by = R(0.09);
    g.fillStyle = '#3d2a22';
    g.fillRect(bx, by, bw, R(WALL_B) - by + 4);
    g.fillStyle = '#2a1c17';
    g.fillRect(bx + R(0.01), by + R(0.008), bw - R(0.02), R(WALL_B) - by);
    const shelfY = [by + R(0.058), by + R(0.118)];
    for (const sy of shelfY) {
      g.fillStyle = '#5a3d2e';
      g.fillRect(bx, sy, bw, R(0.008));
    }
    const books = ['#a94a3c', '#3c7488', '#c4983f', '#6a4c9c', '#4f8a52', '#b8644a', '#41558f'];
    for (let r0 = 0; r0 < 2; r0++) {
      let xx = bx + R(0.016);
      const base = shelfY[r0];
      for (let k = 0; xx < bx + bw - R(0.03) && k < 14; k++) {
        const bw2 = R(0.014 + hsh(k + r0 * 20) * 0.012), bh = R(0.036 + hsh(k * 3 + r0) * 0.014);
        if (r0 === 1 && k === 5) {
          // 지구본
          g.fillStyle = '#3c7aa8';
          g.beginPath();
          g.arc(xx + R(0.02), base - R(0.024), R(0.019), 0, TAU);
          g.fill();
          g.fillStyle = '#5aa86a';
          ell(g, xx + R(0.015), base - R(0.028), R(0.008), R(0.006));
          g.fill();
          g.fillStyle = '#8a6a3a';
          g.fillRect(xx + R(0.016), base - R(0.004), R(0.008), R(0.004));
          xx += R(0.045);
          continue;
        }
        const tilt = k === 9 ? 0.25 : 0;
        g.save();
        g.translate(xx, base);
        g.rotate(tilt);
        g.fillStyle = books[(k + r0 * 3) % books.length];
        g.fillRect(0, -bh, bw2, bh);
        g.fillStyle = 'rgba(255,240,200,.35)';
        g.fillRect(bw2 * 0.15, -bh * 0.8, bw2 * 0.7, R(0.003));
        g.fillRect(bw2 * 0.15, -bh * 0.3, bw2 * 0.7, R(0.003));
        g.restore();
        xx += bw2 + R(0.002) + (tilt ? R(0.008) : 0);
      }
    }
    // 스탠드 (책장 위, 따뜻한 빛)
    const lx = R(0.9), ly = by - R(0.002);
    g.fillStyle = radg(g, lx, ly - R(0.02), R(0.01), R(0.2), [0, 'rgba(255,214,140,.38)'], [1, 'rgba(255,214,140,0)']);
    g.fillRect(lx - R(0.25), 0, R(0.5), R(WALL_B));
    g.fillStyle = '#c99a5a';
    g.fillRect(lx - R(0.003), ly - R(0.025), R(0.006), R(0.025));
    g.fillStyle = lin(g, 0, ly - R(0.05), 0, ly - R(0.022), [0, '#ffe7b0'], [1, '#ffbf62']);
    g.beginPath();
    g.moveTo(lx - R(0.018), ly - R(0.048));
    g.lineTo(lx + R(0.018), ly - R(0.048));
    g.lineTo(lx + R(0.03), ly - R(0.022));
    g.lineTo(lx - R(0.03), ly - R(0.022));
    g.closePath();
    g.fill();
    // 액자 (왼쪽 끝: 아이가 그린 팽이 그림)
    const fx0 = R(0.47), fy0 = R(0.105);
    g.fillStyle = '#7a5838';
    g.fillRect(fx0, fy0, R(0.1), R(0.075));
    g.fillStyle = '#efe4c8';
    g.fillRect(fx0 + R(0.008), fy0 + R(0.008), R(0.084), R(0.059));
    g.fillStyle = '#e0503c';
    g.beginPath();
    g.moveTo(fx0 + R(0.05), fy0 + R(0.06));
    g.lineTo(fx0 + R(0.03), fy0 + R(0.035));
    g.lineTo(fx0 + R(0.07), fy0 + R(0.035));
    g.closePath();
    g.fill();
    g.fillStyle = '#f2b640';
    g.fillRect(fx0 + R(0.03), fy0 + R(0.03), R(0.04), R(0.006));
    g.strokeStyle = '#3a6ad0';
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(fx0 + R(0.05), fy0 + R(0.045), R(0.03), -2.6, -0.6);
    g.stroke();
  });
  // 침대: 이불 윗면 + 침대 밑 어둠
  const bedTop = layer(w, R(OY) + 2, sc, (g) => {
    g.fillStyle = lin(g, 0, R(WALL_B - 0.02), 0, R(BED_F), [0, '#3c4aa0'], [1, '#5565c0']);
    g.beginPath();
    g.moveTo(-2, R(WALL_B - 0.004));
    g.quadraticCurveTo(w * 0.5, R(WALL_B - 0.02), w + 2, R(WALL_B - 0.004));
    g.lineTo(w + 2, R(BED_F));
    g.lineTo(-2, R(BED_F));
    g.closePath();
    g.fill();
    // 퀼트 조각 (윗면)
    for (let k = 0; k < 9; k++) {
      const x0 = (k / 9) * w, col = ['#6676cc', '#4b59b0', '#7a6fc8', '#5868bc'][k % 4];
      g.fillStyle = col;
      g.globalAlpha = 0.6;
      g.fillRect(x0 + 1, R(WALL_B + 0.012), w / 9 - 2, R(BED_F - WALL_B - 0.016));
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,240,210,.35)';
      g.setLineDash([2, 2]);
      g.lineWidth = 1;
      g.strokeRect(x0 + 2, R(WALL_B + 0.014), w / 9 - 4, R(BED_F - WALL_B - 0.02));
      g.setLineDash([]);
    }
    // 베개 끝 · 잠자는 토끼 인형 자리 (그림은 따로)
    g.fillStyle = '#e8e0f4';
    ell(g, R(0.17), R(WALL_B + 0.006), R(0.1), R(0.016));
    g.fill();
    // 침대 밑 어둠
    g.fillStyle = lin(g, 0, R(GAP0), 0, R(OY), [0, '#04030c'], [1, '#100c22']);
    g.fillRect(0, R(GAP0 - 0.01), w, R(OY - GAP0) + 2.5);
  });
  const bedFront = layer(w, R(OY) + 2, sc, (g) => {
    // 이불 자락 (앞으로 늘어진 면) + 물결 단
    g.fillStyle = lin(g, 0, R(BED_F), 0, R(GAP0), [0, '#4757b4'], [1, '#2f3c88']);
    g.beginPath();
    g.moveTo(-2, R(BED_F));
    g.lineTo(w + 2, R(BED_F));
    g.lineTo(w + 2, R(GAP0 - 0.006));
    const n = 14;
    for (let k = n; k >= 0; k--) {
      const x = (k / n) * w;
      g.quadraticCurveTo(x + w / n / 2, R(GAP0 + 0.008), x, R(GAP0 - 0.006));
    }
    g.closePath();
    g.fill();
    // 단 (크림색 레이스)
    g.strokeStyle = '#efe0b8';
    g.lineWidth = R(0.007);
    g.beginPath();
    g.moveTo(-2, R(GAP0 - 0.006));
    for (let k = 0; k < n; k++) {
      const x = (k / n) * w;
      g.quadraticCurveTo(x + w / n / 2, R(GAP0 + 0.008), x + w / n, R(GAP0 - 0.006));
    }
    g.stroke();
    // 접힌 주름
    g.strokeStyle = 'rgba(15,18,60,.45)';
    g.lineWidth = 1.5;
    for (let k = 1; k < 7; k++) {
      const x = (k / 7) * w + Math.sin(k) * R(0.02);
      g.beginPath();
      g.moveTo(x, R(BED_F + 0.004));
      g.quadraticCurveTo(x + R(0.01), R(BED_F + 0.025), x - R(0.005), R(GAP0 - 0.004));
      g.stroke();
    }
    // 모서리 굵은 선 (이불이 꺾이는 곳)
    g.strokeStyle = 'rgba(190,200,255,.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-2, R(BED_F));
    g.lineTo(w + 2, R(BED_F));
    g.stroke();
    // 침대 다리 (나무)
    for (const lx of [R(0.012), w - R(0.042)]) {
      g.fillStyle = lin(g, lx, 0, lx + R(0.03), 0, [0, '#7a5232'], [1, '#4a301e']);
      rr(g, lx, R(GAP0 - 0.01), R(0.03), R(OY - GAP0) + R(0.012), R(0.006));
      g.fill();
      stroke(g, 1.2);
    }
  });
  // 바닥: 나무 마루 + 둥근 러그 + 달빛·스탠드 빛 + 양옆 블록 벽
  const floor = layer(w, h, sc, (g) => {
    const top = R(OY);
    // 마루 (세로로 길게 놓인 판자, 이음매 엇갈림)
    const pw = R(0.085);
    for (let i = -1; i * pw < w + pw; i++) {
      const x0 = i * pw;
      const base = ['#6a4630', '#734d34', '#61402c', '#6e4a31'][((i % 4) + 4) % 4];
      g.fillStyle = lin(g, 0, top, 0, h, [0, shade(base, -0.25)], [1, base]);
      g.fillRect(x0, top, pw, h - top);
      // 결
      g.strokeStyle = 'rgba(40,22,12,.35)';
      g.lineWidth = 1;
      for (let j = 0; j < 3; j++) {
        const xx = x0 + pw * (0.2 + j * 0.3) + hsh(i * 9 + j) * pw * 0.1;
        g.beginPath();
        g.moveTo(xx, top);
        for (let yy = top; yy < h; yy += R(0.06)) g.quadraticCurveTo(xx + Math.sin(yy * 0.05 + i + j) * pw * 0.12, yy + R(0.03), xx, yy + R(0.06));
        g.stroke();
      }
      // 옹이
      if (hsh(i * 3.7) > 0.5) {
        const ky = top + hsh(i * 5.1) * (h - top);
        g.strokeStyle = 'rgba(40,22,12,.4)';
        ell(g, x0 + pw * 0.5, ky, pw * 0.12, R(0.012));
        g.stroke();
      }
      // 판자 사이 틈 · 이음매
      g.fillStyle = 'rgba(20,10,6,.6)';
      g.fillRect(x0, top, 1.2, h - top);
      const off = hsh(i * 2.3) * R(0.4);
      for (let yy = top + off; yy < h; yy += R(0.45)) g.fillRect(x0, yy, pw, 1.2);
    }
    // 러그 (둥근 꼬임 러그)
    const cx = w / 2, cy = R(OY + 0.52 * KY), rx = R(0.52), ry = R(0.52 * KY * 0.92);
    g.fillStyle = 'rgba(10,6,20,.35)';
    ell(g, cx, cy + R(0.012), rx * 1.01, ry * 1.01);
    g.fill();
    const rings = ['#3d5f6c', '#8a7a62', '#6e4a48', '#47557a', '#8a7a62', '#3d5f6c', '#7a6040'];
    for (let k = 0; k < rings.length; k++) {
      const q = 1 - k / rings.length;
      g.fillStyle = rings[k];
      ell(g, cx, cy, rx * q, ry * q);
      g.fill();
      // 꼬임 결
      g.strokeStyle = 'rgba(0,0,0,.14)';
      g.lineWidth = 1;
      g.setLineDash([2, 3]);
      ell(g, cx, cy, rx * (q - 0.07), ry * (q - 0.07));
      g.stroke();
      g.setLineDash([]);
    }
    // 가운데 별 무늬
    g.fillStyle = 'rgba(255,230,160,.18)';
    starPath(g, cx, cy, R(0.06));
    g.fill();
    // 창문 달빛 (푸른 평행사변형)
    g.fillStyle = 'rgba(140,170,255,.10)';
    g.beginPath();
    g.moveTo(R(0.12), top);
    g.lineTo(R(0.4), top);
    g.lineTo(R(0.62), top + R(0.5));
    g.lineTo(R(0.3), top + R(0.5));
    g.closePath();
    g.fill();
    // 밤 색 덧칠 + 스탠드 빛 웅덩이
    g.fillStyle = 'rgba(16,18,58,.38)';
    g.fillRect(0, top, w, h - top);
    g.globalCompositeOperation = 'screen';
    g.fillStyle = radg(g, R(0.82), R(0.62), R(0.02), R(0.75), [0, 'rgba(255,190,110,.38)'], [0.5, 'rgba(255,170,90,.12)'], [1, 'rgba(255,170,90,0)']);
    g.fillRect(0, top, w, h - top);
    g.globalCompositeOperation = 'source-over';
    // 침대 밑 그림자
    g.fillStyle = lin(g, 0, top, 0, top + R(0.06), [0, 'rgba(4,2,12,.7)'], [1, 'rgba(4,2,12,0)']);
    g.fillRect(0, top, w, R(0.06));
    // 양옆 블록 벽 (경기장 벽)
    const bw = R(XL) + 1, bd = R(0.026), bh = R(0.03);
    const n = 9;
    for (const side of [0, 1]) {
      const x0 = side ? R(XR) - 1 : -1;
      for (let k = 0; k < n; k++) {
        const yy = R(OY + ((k + 0.5) / n) * KY * 1.02) - bh * 0.4;
        block(g, x0, yy, bw, bd, bh, BLOCK_COLS[(k + side * 2) % BLOCK_COLS.length], k + side);
      }
    }
    // 가장자리 비네트
    g.fillStyle = radg(g, w / 2, R(0.8), R(0.35), R(0.95), [0, 'rgba(0,0,0,0)'], [1, 'rgba(4,2,16,.45)']);
    g.fillRect(0, top, w, h - top);
  });
  const bg = { room, bedTop, bedFront, floor };
  BG.set(key, bg);
  return bg;
}

// ── 팽이 전사 ──
interface TopLook { spin: number; ph: number; tilt: number; face: number; sq: number; t: number; alpha: number; tail: number; wob: number }
/** 팽이 전사 (발끝 = 0,0). k = 팽이 반지름(px). face: 0 보통 · 1 힘줌 · 2 신남 · 3 아얏 · 4 어질 · 5 뿌듯 · 6 울상 */
function drawTop(ctx: C2, x: number, y: number, k: number, o: TopLook) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = o.alpha;
  // 바닥 그림자
  ctx.fillStyle = 'rgba(6,4,20,.42)';
  ell(ctx, 0, 0, k * 1.05, k * 0.36);
  ctx.fill();
  if (o.spin > 0.25) {
    // 바닥에 비친 회전 빛
    ctx.fillStyle = radg(ctx, 0, 0, 0, k * 1.6, [0, `rgba(255,200,120,${0.25 * o.spin})`], [1, 'rgba(255,200,120,0)']);
    ell(ctx, 0, 0, k * 1.7, k * 0.6);
    ctx.fill();
  }
  ctx.rotate(o.tilt);
  ctx.scale(1 + o.sq * 0.25, 1 - o.sq * 0.25);
  const sp = clamp(o.spin, 0, 1), blur = clamp((sp - 0.35) / 0.5, 0, 1);
  // 쇠 끝 (발)
  ctx.fillStyle = lin(ctx, -k * 0.2, 0, k * 0.2, 0, [0, '#8a8fa8'], [0.5, '#eef1ff'], [1, '#6a6f88']);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(k * 0.17, -k * 0.36);
  ctx.lineTo(-k * 0.17, -k * 0.36);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.4);
  // 아랫몸 (원뿔)
  ctx.fillStyle = lin(ctx, -k, 0, k, 0, [0, '#7e1a20'], [0.35, '#d83c34'], [0.62, '#ff7a5a'], [1, '#8a1e22']);
  ctx.beginPath();
  ctx.moveTo(-k * 0.26, -k * 0.32);
  ctx.quadraticCurveTo(0, -k * 0.24, k * 0.26, -k * 0.32);
  ctx.lineTo(k * 1.12, -k * 0.78);
  ctx.lineTo(-k * 1.12, -k * 0.78);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.6);
  // 원뿔의 홈 (돌면 흐려짐)
  ctx.strokeStyle = `rgba(90,10,16,${0.5 * (1 - clamp((o.spin - 0.35) / 0.5, 0, 1))})`;
  ctx.lineWidth = 1.2;
  for (let j = 0; j < 5; j++) {
    const a = o.ph * 0.7 + (j * TAU) / 5, c = Math.cos(a);
    if (Math.sin(a) < 0) continue;
    ctx.beginPath();
    ctx.moveTo(c * k * 0.24, -k * 0.32);
    ctx.lineTo(c * k * 1.08, -k * 0.78);
    ctx.stroke();
  }
  // 테 (금빛 띠) — 무늬가 돌다가 빨리 돌면 흐려진다
  const ry = k * 0.36, y0 = -k * 0.78, y1 = -k * 0.95;
  ctx.fillStyle = lin(ctx, -k, 0, k, 0, [0, '#a8741c'], [0.4, '#ffd35a'], [0.6, '#fff0a8'], [1, '#a8741c']);
  ctx.beginPath();
  ctx.ellipse(0, y0, k * 1.08, ry, 0, 0, Math.PI);
  ctx.lineTo(-k * 1.08, y1);
  ctx.ellipse(0, y1, k * 1.08, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.6);
  // 띠 무늬 (앞쪽 절반만)
  if (blur < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - blur;
    for (let i = 0; i < 10; i++) {
      const a0 = o.ph + (i * TAU) / 10, a1 = a0 + TAU / 20;
      const s0 = Math.sin(a0), s1 = Math.sin(a1);
      if (s0 < 0 && s1 < 0) continue;
      const c0 = Math.cos(a0) * k * 1.08, c1 = Math.cos(a1) * k * 1.08;
      ctx.fillStyle = i % 2 ? '#2a6ad0' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(c0, y0 + Math.max(0, s0) * ry);
      ctx.lineTo(c1, y0 + Math.max(0, s1) * ry);
      ctx.lineTo(c1, y1 + Math.max(0, s1) * ry);
      ctx.lineTo(c0, y1 + Math.max(0, s0) * ry);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  if (blur > 0) {
    // 빨리 돌면 줄무늬가 녹아 고리가 된다
    ctx.save();
    ctx.globalAlpha *= blur * 0.85;
    ctx.strokeStyle = 'rgba(160,200,255,.9)';
    ctx.lineWidth = Math.max(1, k * 0.05);
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.ellipse(0, y0 - (j + 0.5) * (k * 0.045), k * 1.06, ry, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 윗면 (원반)
  ctx.fillStyle = lin(ctx, 0, y1 - ry, 0, y1 + ry, [0, '#ffe3c0'], [1, '#f2a46a']);
  ell(ctx, 0, y1, k * 1.08, ry);
  ctx.fill();
  stroke(ctx, 1.4);
  // 윗면의 소용돌이 무늬 (돌면 흐려짐)
  ctx.save();
  ell(ctx, 0, y1, k * 1.0, ry * 0.92);
  ctx.clip();
  ctx.strokeStyle = `rgba(214,70,50,${0.8 * (1 - blur) + 0.15})`;
  ctx.lineWidth = k * 0.14;
  for (let j = 0; j < 3; j++) {
    const a = o.ph * 1 + (j * TAU) / 3;
    ctx.beginPath();
    for (let u = 0; u <= 1.001; u += 0.1) {
      const r0 = 0.15 + u * 0.85, aa = a + u * 2.2;
      const px = Math.cos(aa) * k * 1.0 * r0, py = y1 + Math.sin(aa) * ry * r0;
      if (u === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  if (blur > 0.2) {
    ctx.fillStyle = `rgba(255,190,140,${blur * 0.7})`;
    ell(ctx, 0, y1, k * 1.08, ry);
    ctx.fill();
  }
  ctx.restore();
  // 머리 (둥근 돔)
  const hy = -k * 1.42, hr = k * 0.8;
  ctx.fillStyle = radg(ctx, -hr * 0.35, hy - hr * 0.35, hr * 0.1, hr * 1.3, [0, '#ffb08a'], [0.5, '#f0603e'], [1, '#a82a26']);
  ctx.beginPath();
  ctx.ellipse(0, hy, hr * 1.02, hr * 0.92, 0, Math.PI * 0.94, Math.PI * 2.06);
  ctx.ellipse(0, y1 - ry * 0.2, hr * 1.02, ry * 0.7, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.6);
  // 머리띠 (전사) + 휘날리는 끈
  ctx.fillStyle = '#2a64c8';
  ctx.beginPath();
  ctx.ellipse(0, hy - hr * 0.28, hr * 0.98, hr * 0.26, 0, Math.PI * 0.05, Math.PI * 0.95);
  ctx.ellipse(0, hy - hr * 0.52, hr * 0.92, hr * 0.22, 0, Math.PI * 0.95, Math.PI * 0.05, true);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.2);
  {
    const tx = -o.tail, wav = Math.sin(o.t * 0.5) * k * 0.12;
    for (const [len, off] of [[1.0, 0], [0.8, 0.14]] as [number, number][]) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = k * 0.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hr * 0.75 * Math.sign(tx || 1), hy - hr * 0.4);
      ctx.quadraticCurveTo(hr * (0.9 + 0.5 * len) * Math.sign(tx || 1), hy - hr * (0.4 - off) + wav, hr * (1.0 + len * (0.6 + 0.8 * Math.abs(tx))) * Math.sign(tx || 1), hy - hr * (0.2 - off * 2) + wav * 1.8);
      ctx.stroke();
      ctx.strokeStyle = '#3a7ae0';
      ctx.lineWidth = k * 0.12;
      ctx.stroke();
    }
  }
  // 손잡이 (머리 꼭지)
  ctx.fillStyle = lin(ctx, -k * 0.15, 0, k * 0.15, 0, [0, '#a8741c'], [0.5, '#ffe07a'], [1, '#8a5a12']);
  rr(ctx, -k * 0.13, hy - hr * 1.12, k * 0.26, hr * 0.32, k * 0.06);
  ctx.fill();
  stroke(ctx, 1.2);
  ctx.fillStyle = radg(ctx, -k * 0.05, hy - hr * 1.2, 0, k * 0.2, [0, '#fff6c8'], [1, '#f2b23a']);
  ctx.beginPath();
  ctx.arc(0, hy - hr * 1.17, k * 0.17, 0, TAU);
  ctx.fill();
  stroke(ctx, 1.2);
  // 얼굴
  drawTopFace(ctx, 0, hy + hr * 0.12, hr, o.face, o.t);
  // 바람 무늬 (회전이 셀수록 짙게)
  if (sp > 0.2) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let j = 0; j < 4; j++) {
      const a = -o.ph * 0.7 + (j * TAU) / 4, rr0 = k * (1.45 + 0.2 * (j % 2));
      ctx.strokeStyle = `rgba(230,245,255,${0.55 * sp})`;
      ctx.lineWidth = Math.max(1.2, k * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, -k * 0.95, rr0, rr0 * 0.36, 0, a, a + 1.1 + sp * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
function drawTopFace(ctx: C2, x: number, y: number, r: number, face: number, t: number) {
  const ex = r * 0.38, ey = y - r * 0.08, er = r * 0.25;
  const blink = face === 0 && t % 170 < 6;
  ctx.lineCap = 'round';
  if (face === 4) {
    // 어질어질: 빙글빙글 눈
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + sx * ex, ey, er, 0, TAU);
      ctx.fill();
      stroke(ctx, 1.2);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let u = 0; u < 1; u += 0.05) {
        const a = u * 12 + t * 0.3 * sx, q = u * er * 0.85;
        const px = x + sx * ex + Math.cos(a) * q, py = ey + Math.sin(a) * q;
        if (u === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let u = -1; u <= 1.001; u += 0.25) ctx.lineTo(x + u * r * 0.3, y + r * 0.42 + Math.sin(u * 6 + t * 0.4) * r * 0.06);
    ctx.stroke();
    return;
  }
  if (face === 5 || blink) {
    // ^^ 눈
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.6, r * 0.12);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      if (blink) (ctx.moveTo(x + sx * ex - er * 0.8, ey), ctx.lineTo(x + sx * ex + er * 0.8, ey));
      else ctx.arc(x + sx * ex, ey + er * 0.3, er * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else if (face === 3) {
    // > <
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.6, r * 0.12);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * ex - sx * er * 0.8, ey - er * 0.7);
      ctx.lineTo(x + sx * ex + sx * er * 0.5, ey);
      ctx.lineTo(x + sx * ex - sx * er * 0.8, ey + er * 0.7);
      ctx.stroke();
    }
  } else {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + sx * ex, ey, er * 0.9, er * (face === 1 ? 0.75 : 1.05), 0, 0, TAU);
      ctx.fill();
      stroke(ctx, 1.2);
      ctx.fillStyle = '#1a1030';
      ctx.beginPath();
      ctx.arc(x + sx * ex + er * 0.15, ey + er * 0.1, er * 0.55, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + sx * ex + er * 0.32, ey - er * 0.15, er * 0.22, 0, TAU);
      ctx.fill();
      if (face === 1 || face === 2) {
        // 눈썹 (힘줌)
        ctx.strokeStyle = OUT;
        ctx.lineWidth = Math.max(1.8, r * 0.13);
        ctx.beginPath();
        ctx.moveTo(x + sx * (ex + er * 1.0), ey - er * 1.35);
        ctx.lineTo(x + sx * (ex - er * 0.6), ey - er * 0.95);
        ctx.stroke();
      }
      if (face === 6) {
        ctx.fillStyle = '#7ac8ff';
        ell(ctx, x + sx * ex, ey + er * 1.4, er * 0.25, er * 0.4);
        ctx.fill();
      }
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,140,150,.55)';
  for (const sx of [-1, 1]) {
    ell(ctx, x + sx * r * 0.62, y + r * 0.22, r * 0.14, r * 0.09);
    ctx.fill();
  }
  // 입
  ctx.strokeStyle = OUT;
  ctx.fillStyle = '#5a1020';
  ctx.lineWidth = Math.max(1.4, r * 0.1);
  const my = y + r * 0.34;
  ctx.beginPath();
  if (face === 1) {
    // 이 악물기
    rr(ctx, x - r * 0.24, my - r * 0.08, r * 0.48, r * 0.16, r * 0.05);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.24, my);
    ctx.lineTo(x + r * 0.24, my);
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (face === 2 || face === 5) {
    ctx.moveTo(x - r * 0.3, my - r * 0.06);
    ctx.quadraticCurveTo(x, my + r * 0.36, x + r * 0.3, my - r * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (face === 3) {
    ell(ctx, x, my + r * 0.04, r * 0.12, r * 0.14);
    ctx.fill();
    ctx.stroke();
  } else if (face === 6) {
    ctx.arc(x, my + r * 0.16, r * 0.18, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.arc(x, my - r * 0.08, r * 0.2, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
}

// ── 장난감들 ──
interface FoeLook { ph: number; t: number; hurt: number; ko: boolean; stun: boolean; seed: number; hp: number; key: number }
/** 태엽 장난감 병정 (발 = 0,0). k = 키 */
function drawSoldier(ctx: C2, k: number, o: FoeLook) {
  const step = Math.sin(o.ph * 0.22), bob = o.ko ? 0 : Math.abs(step) * k * 0.025;
  ctx.translate(0, -bob);
  // 다리 (행진)
  for (const sx of [-1, 1]) {
    const lift = o.ko || o.stun ? 0 : Math.max(0, step * sx) * k * 0.07;
    ctx.fillStyle = '#2c4a9a';
    rr(ctx, sx * k * 0.085 - k * 0.055, -k * 0.3 - lift, k * 0.11, k * 0.24, k * 0.03);
    ctx.fill();
    stroke(ctx, 1.2);
    ctx.fillStyle = '#16121e';
    rr(ctx, sx * k * 0.085 - k * 0.065, -k * 0.085 - lift, k * 0.13, k * 0.085, k * 0.03);
    ctx.fill();
    stroke(ctx, 1.1);
  }
  // 태엽 (등 뒤, 돌아간다)
  {
    const kw = Math.abs(Math.cos(o.key)) * k * 0.13 + k * 0.02;
    ctx.fillStyle = '#c9a64a';
    ctx.fillRect(-k * 0.2 - k * 0.07, -k * 0.53, k * 0.08, k * 0.03);
    ctx.fillStyle = lin(ctx, 0, -k * 0.62, 0, -k * 0.44, [0, '#ffe08a'], [1, '#a8781c']);
    ell(ctx, -k * 0.3, -k * 0.58, kw * 0.5, k * 0.055);
    ctx.fill();
    stroke(ctx, 1);
    ell(ctx, -k * 0.3, -k * 0.47, kw * 0.5, k * 0.055);
    ctx.fill();
    stroke(ctx, 1);
  }
  // 몸통 (빨간 웃옷)
  ctx.fillStyle = lin(ctx, -k * 0.18, 0, k * 0.18, 0, [0, '#a82a2a'], [0.45, '#e84a3c'], [1, '#9a2222']);
  rr(ctx, -k * 0.18, -k * 0.64, k * 0.36, k * 0.38, k * 0.07);
  ctx.fill();
  stroke(ctx, 1.5);
  // 흰 띠 (X)
  ctx.strokeStyle = '#f6efe0';
  ctx.lineWidth = k * 0.045;
  ctx.beginPath();
  ctx.moveTo(-k * 0.15, -k * 0.6);
  ctx.lineTo(k * 0.13, -k * 0.32);
  ctx.moveTo(k * 0.15, -k * 0.6);
  ctx.lineTo(-k * 0.13, -k * 0.32);
  ctx.stroke();
  ctx.fillStyle = '#f2c24a';
  ctx.beginPath();
  ctx.arc(0, -k * 0.46, k * 0.03, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#16121e';
  ctx.fillRect(-k * 0.18, -k * 0.33, k * 0.36, k * 0.05);
  // 팔 (흔들기) · 장난감 총 (어깨에)
  const sw = o.ko || o.stun ? 0.8 : step * 0.35;
  ctx.save();
  ctx.translate(-k * 0.19, -k * 0.6);
  ctx.rotate(0.25 + sw);
  ctx.fillStyle = '#d43c34';
  rr(ctx, -k * 0.045, 0, k * 0.09, k * 0.26, k * 0.04);
  ctx.fill();
  stroke(ctx, 1.1);
  ctx.fillStyle = '#f6efe0';
  ctx.beginPath();
  ctx.arc(0, k * 0.27, k * 0.045, 0, TAU);
  ctx.fill();
  stroke(ctx, 1);
  ctx.restore();
  ctx.save();
  ctx.translate(k * 0.19, -k * 0.6);
  ctx.rotate(-0.2);
  ctx.fillStyle = '#8a5a32';
  rr(ctx, -k * 0.02, -k * 0.38, k * 0.045, k * 0.5, k * 0.02);
  ctx.fill();
  stroke(ctx, 1);
  ctx.fillStyle = '#c8cfe0';
  ctx.fillRect(-k * 0.015, -k * 0.46, k * 0.03, k * 0.09);
  ctx.fillStyle = '#d43c34';
  rr(ctx, -k * 0.045, 0, k * 0.09, k * 0.22, k * 0.04);
  ctx.fill();
  stroke(ctx, 1.1);
  ctx.restore();
  // 머리
  const hy = -k * 0.75, hr = k * 0.135;
  ctx.fillStyle = radg(ctx, -hr * 0.3, hy - hr * 0.3, 0, hr * 1.2, [0, '#ffe2c8'], [1, '#e8a882']);
  ctx.beginPath();
  ctx.arc(0, hy, hr, 0, TAU);
  ctx.fill();
  stroke(ctx, 1.4);
  ctx.fillStyle = 'rgba(255,110,120,.6)';
  for (const sx of [-1, 1]) (ell(ctx, sx * hr * 0.6, hy + hr * 0.3, hr * 0.22, hr * 0.14), ctx.fill());
  if (o.ko) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    for (const sx of [-1, 1]) {
      const cx = sx * hr * 0.38, cy = hy - hr * 0.05, q = hr * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx - q, cy - q);
      ctx.lineTo(cx + q, cy + q);
      ctx.moveTo(cx + q, cy - q);
      ctx.lineTo(cx - q, cy + q);
      ctx.stroke();
    }
    ctx.fillStyle = '#5a1020';
    ell(ctx, 0, hy + hr * 0.5, hr * 0.18, hr * 0.22);
    ctx.fill();
  } else {
    ctx.fillStyle = OUT;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * hr * 0.38, hy - hr * 0.05, hr * (o.stun ? 0.08 : 0.14), 0, TAU);
      ctx.fill();
    }
    // 콧수염
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = Math.max(1.4, hr * 0.2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.42, hy + hr * 0.42);
    ctx.quadraticCurveTo(-hr * 0.2, hy + hr * 0.22, 0, hy + hr * 0.36);
    ctx.quadraticCurveTo(hr * 0.2, hy + hr * 0.22, hr * 0.42, hy + hr * 0.42);
    ctx.stroke();
  }
  // 높은 모자 (벗겨지면 안 그림)
  if (!o.ko) {
    ctx.fillStyle = lin(ctx, -k * 0.13, 0, k * 0.13, 0, [0, '#16121e'], [0.5, '#3a3248'], [1, '#16121e']);
    rr(ctx, -k * 0.125, hy - hr - k * 0.22, k * 0.25, k * 0.24, k * 0.03);
    ctx.fill();
    stroke(ctx, 1.3);
    ctx.fillStyle = '#f2c24a';
    ctx.fillRect(-k * 0.13, hy - hr - k * 0.005, k * 0.26, k * 0.035);
    starPath(ctx, 0, hy - hr - k * 0.1, k * 0.045);
    ctx.fill();
    ctx.fillStyle = '#e8463c';
    ell(ctx, 0, hy - hr - k * 0.25, k * 0.05, k * 0.07);
    ctx.fill();
    stroke(ctx, 1);
  }
}
/** 태엽 로봇 (양철) */
function drawRobot(ctx: C2, k: number, o: FoeLook, boss: boolean) {
  const rock = o.ko || o.stun ? 0 : Math.sin(o.ph * 0.18) * 0.06;
  ctx.rotate(rock);
  const body = boss ? ['#8a2a1e', '#e0603a', '#ffb070'] : ['#3a5478', '#7fa4c8', '#d6e6f4'];
  // 발
  for (const sx of [-1, 1]) {
    const lift = o.ko || o.stun ? 0 : Math.max(0, Math.sin(o.ph * 0.18) * sx) * k * 0.05;
    ctx.fillStyle = '#2a3446';
    rr(ctx, sx * k * 0.13 - k * 0.09, -k * 0.12 - lift, k * 0.18, k * 0.12, k * 0.03);
    ctx.fill();
    stroke(ctx, 1.3);
  }
  // 태엽 (등)
  {
    const kw = Math.abs(Math.cos(o.key)) * k * 0.2 + k * 0.03;
    ctx.fillStyle = lin(ctx, 0, -k * 0.6, 0, -k * 0.35, [0, '#ffe08a'], [1, '#a8781c']);
    ctx.fillRect(k * 0.24, -k * 0.47, k * 0.1, k * 0.04);
    ell(ctx, k * 0.38, -k * 0.55, kw * 0.5, k * 0.075);
    ctx.fill();
    stroke(ctx, 1.1);
    ell(ctx, k * 0.38, -k * 0.39, kw * 0.5, k * 0.075);
    ctx.fill();
    stroke(ctx, 1.1);
  }
  // 몸통
  ctx.fillStyle = lin(ctx, -k * 0.26, 0, k * 0.26, 0, [0, body[0]], [0.4, body[1]], [0.7, body[2]], [1, body[0]]);
  rr(ctx, -k * 0.26, -k * 0.58, k * 0.52, k * 0.48, k * 0.08);
  ctx.fill();
  stroke(ctx, 1.6);
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  for (const [rx, ry] of [[-0.2, -0.52], [0.2, -0.52], [-0.2, -0.16], [0.2, -0.16]]) (ctx.beginPath(), ctx.arc(rx * k, ry * k, k * 0.018, 0, TAU), ctx.fill());
  // 가슴 계기판
  ctx.fillStyle = '#fff4d6';
  ctx.beginPath();
  ctx.arc(0, -k * 0.34, k * 0.09, 0, TAU);
  ctx.fill();
  stroke(ctx, 1.2);
  ctx.strokeStyle = '#d43c34';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.34);
  const na = o.stun || o.ko ? o.t * 0.5 : -0.8 + Math.sin(o.t * 0.05) * 0.3;
  ctx.lineTo(Math.cos(na) * k * 0.07, -k * 0.34 + Math.sin(na) * k * 0.07);
  ctx.stroke();
  // 팔 (용수철)
  for (const sx of [-1, 1]) {
    ctx.strokeStyle = '#c8cfe0';
    ctx.lineWidth = k * 0.04;
    ctx.beginPath();
    for (let u = 0; u <= 1.001; u += 0.1) {
      const ax = sx * (k * 0.28 + u * k * 0.14), ay = -k * 0.48 + u * k * 0.2 + Math.sin(u * 18) * k * 0.025;
      if (u === 0) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
    }
    ctx.stroke();
    ctx.fillStyle = '#2a3446';
    ctx.beginPath();
    ctx.arc(sx * k * 0.43, -k * 0.27, k * 0.055, sx > 0 ? -0.5 : Math.PI - 0.5 + 1, sx > 0 ? 4 : Math.PI + 4);
    ctx.fill();
    stroke(ctx, 1);
  }
  // 머리
  const hy = -k * 0.78;
  ctx.fillStyle = lin(ctx, -k * 0.22, 0, k * 0.22, 0, [0, body[0]], [0.45, body[1]], [0.75, body[2]], [1, body[0]]);
  rr(ctx, -k * 0.22, hy - k * 0.2, k * 0.44, k * 0.38, k * 0.08);
  ctx.fill();
  stroke(ctx, 1.6);
  // 안테나
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, hy - k * 0.2);
  ctx.lineTo(0, hy - k * 0.32);
  ctx.stroke();
  const blink = Math.floor(o.t / 20) % 2;
  ctx.fillStyle = radg(ctx, 0, hy - k * 0.35, 0, k * 0.08, [0, blink ? '#fff0b0' : '#ff8a7a'], [1, blink ? '#ff5a4e' : '#a82a26']);
  ctx.beginPath();
  ctx.arc(0, hy - k * 0.35, k * 0.045, 0, TAU);
  ctx.fill();
  stroke(ctx, 1);
  if (boss) {
    // 왕관
    ctx.fillStyle = lin(ctx, 0, hy - k * 0.36, 0, hy - k * 0.2, [0, '#fff3a0'], [1, '#d49a1a']);
    ctx.beginPath();
    ctx.moveTo(-k * 0.18, hy - k * 0.2);
    ctx.lineTo(-k * 0.2, hy - k * 0.36);
    ctx.lineTo(-k * 0.09, hy - k * 0.27);
    ctx.lineTo(0, hy - k * 0.4);
    ctx.lineTo(k * 0.09, hy - k * 0.27);
    ctx.lineTo(k * 0.2, hy - k * 0.36);
    ctx.lineTo(k * 0.18, hy - k * 0.2);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 1.3);
  }
  // 눈 (램프)
  for (const sx of [-1, 1]) {
    const ex = sx * k * 0.1, ey = hy - k * 0.03;
    ctx.fillStyle = '#1a1424';
    ctx.beginPath();
    ctx.arc(ex, ey, k * 0.075, 0, TAU);
    ctx.fill();
    if (o.ko) {
      ctx.strokeStyle = '#ffe07a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.04, ey - k * 0.04);
      ctx.lineTo(ex + k * 0.04, ey + k * 0.04);
      ctx.moveTo(ex + k * 0.04, ey - k * 0.04);
      ctx.lineTo(ex - k * 0.04, ey + k * 0.04);
      ctx.stroke();
    } else if (o.stun) {
      ctx.strokeStyle = '#ffe07a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let u = 0; u < 1; u += 0.08) {
        const a = u * 11 + o.t * 0.3, q = u * k * 0.06;
        if (u === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex + Math.cos(a) * q, ey + Math.sin(a) * q);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = radg(ctx, ex, ey, 0, k * 0.07, [0, '#fffbe0'], [0.6, boss ? '#ff6a4a' : '#ffd34a'], [1, boss ? '#a8201a' : '#d49a1a']);
      ctx.beginPath();
      ctx.arc(ex, ey, k * 0.055, 0, TAU);
      ctx.fill();
    }
    if (boss && !o.ko) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ex + sx * k * 0.08, ey - k * 0.1);
      ctx.lineTo(ex - sx * k * 0.06, ey - k * 0.06);
      ctx.stroke();
    }
  }
  // 입 (그릴)
  ctx.fillStyle = '#1a1424';
  rr(ctx, -k * 0.1, hy + k * 0.07, k * 0.2, k * 0.06, k * 0.02);
  ctx.fill();
  ctx.strokeStyle = '#c8cfe0';
  ctx.lineWidth = 1;
  for (let j = 1; j < 4; j++) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.1 + j * k * 0.05, hy + k * 0.07);
    ctx.lineTo(-k * 0.1 + j * k * 0.05, hy + k * 0.13);
    ctx.stroke();
  }
}
/** 가시 병정 (밤송이 옷) */
function drawSpiky(ctx: C2, k: number, o: FoeLook) {
  const step = Math.sin(o.ph * 0.22);
  for (const sx of [-1, 1]) {
    const lift = o.ko ? 0 : Math.max(0, step * sx) * k * 0.06;
    ctx.fillStyle = '#3a2a1a';
    rr(ctx, sx * k * 0.1 - k * 0.06, -k * 0.16 - lift, k * 0.12, k * 0.16, k * 0.04);
    ctx.fill();
    stroke(ctx, 1.1);
  }
  const cy = -k * 0.45, r = k * 0.3, wig = o.hurt > 0 ? Math.sin(o.t * 1.3) * 0.08 : 0;
  // 가시
  ctx.fillStyle = '#6e8a32';
  ctx.beginPath();
  for (let j = 0; j < 22; j++) {
    const a = (j / 22) * TAU + wig, a2 = a + TAU / 44, q = r * (1.32 + 0.08 * Math.sin(j * 3.1));
    ctx.lineTo(Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
    ctx.lineTo(Math.cos(a2) * q, cy + Math.sin(a2) * q);
  }
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.3);
  ctx.fillStyle = radg(ctx, -r * 0.3, cy - r * 0.35, r * 0.1, r * 1.1, [0, '#c8d86a'], [0.6, '#7a9a38'], [1, '#4a6420']);
  ctx.beginPath();
  ctx.arc(0, cy, r, 0, TAU);
  ctx.fill();
  stroke(ctx, 1.4);
  ctx.strokeStyle = 'rgba(40,60,10,.5)';
  ctx.lineWidth = 1;
  for (let j = 0; j < 9; j++) {
    const a = j * 0.9 + 0.4, q = r * (0.5 + hsh(j + o.seed) * 0.35);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * q, cy + Math.sin(a) * q);
    ctx.lineTo(Math.cos(a) * (q + r * 0.12), cy + Math.sin(a) * (q + r * 0.12));
    ctx.stroke();
  }
  // 얼굴 (밤 속 알맹이)
  ctx.fillStyle = radg(ctx, 0, cy + r * 0.1, 0, r * 0.6, [0, '#e8b47a'], [1, '#a8683a']);
  ell(ctx, 0, cy + r * 0.12, r * 0.52, r * 0.46);
  ctx.fill();
  stroke(ctx, 1.2);
  if (o.ko) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    for (const sx of [-1, 1]) {
      const ex = sx * r * 0.2, ey = cy + r * 0.05, q = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(ex - q, ey - q);
      ctx.lineTo(ex + q, ey + q);
      ctx.moveTo(ex + q, ey - q);
      ctx.lineTo(ex - q, ey + q);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = OUT;
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * r * 0.2, cy + r * 0.06, r * 0.075, 0, TAU), ctx.fill());
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.36, cy - r * 0.12);
      ctx.lineTo(sx * r * 0.08, cy - r * 0.04);
      ctx.stroke();
    }
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, cy + r * 0.32);
    ctx.lineTo(r * 0.12, cy + r * 0.28);
    ctx.stroke();
  }
  // 투구 (뾰족)
  ctx.fillStyle = lin(ctx, -r * 0.4, 0, r * 0.4, 0, [0, '#3a5420'], [0.5, '#6e9a3a'], [1, '#3a5420']);
  ctx.beginPath();
  ctx.ellipse(0, cy - r * 0.62, r * 0.42, r * 0.3, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.2);
  ctx.fillStyle = '#c8cfe0';
  ctx.beginPath();
  ctx.moveTo(-r * 0.07, cy - r * 0.9);
  ctx.lineTo(0, cy - r * 1.25);
  ctx.lineTo(r * 0.07, cy - r * 0.9);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1);
}
const FOE_H: Record<K, number> = { sol: 0.105, bot: 0.12, spk: 0.1, boss: 0.22 };
function drawFoeAt(ctx: C2, kind: K, k: number, o: FoeLook) {
  if (kind === 'sol') drawSoldier(ctx, k, o);
  else if (kind === 'spk') drawSpiky(ctx, k, o);
  else drawRobot(ctx, k, o, kind === 'boss');
}

/** 장난감 북 (범퍼) */
function drawDrum(ctx: C2, x: number, y: number, r: number, hit: number, t: number) {
  const sq = hit * 0.18, ry = r * 0.42, hgt = r * 0.62 * (1 - sq);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + sq * 0.6, 1);
  ctx.fillStyle = 'rgba(6,4,20,.42)';
  ell(ctx, 0, 0, r * 1.15, ry * 1.1);
  ctx.fill();
  // 옆면
  ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#8a1a24'], [0.35, '#e0404a'], [0.6, '#ff7a6a'], [1, '#8a1a24']);
  ctx.beginPath();
  ctx.ellipse(0, -ry * 0.2, r, ry, 0, 0, Math.PI);
  ctx.lineTo(-r, -hgt);
  ctx.ellipse(0, -hgt, r, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.6);
  // 지그재그 줄
  ctx.strokeStyle = '#f6efe0';
  ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.beginPath();
  for (let j = 0; j <= 8; j++) {
    const a = Math.PI - (j / 8) * Math.PI, px = Math.cos(a) * r * 0.97;
    const top = j % 2 === 0;
    const py = top ? -hgt + Math.sin(a) * ry * 0.95 : -ry * 0.2 + Math.sin(a) * ry * 0.95;
    if (j === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // 금테 (아래·위)
  ctx.strokeStyle = '#f2c24a';
  ctx.lineWidth = Math.max(1.6, r * 0.09);
  ctx.beginPath();
  ctx.ellipse(0, -ry * 0.2, r, ry, 0, 0.05, Math.PI - 0.05);
  ctx.stroke();
  // 가죽 윗면
  ctx.fillStyle = hit > 0.1 ? `rgb(255,255,${Math.round(220 + 35 * hit)})` : lin(ctx, 0, -hgt - ry, 0, -hgt + ry, [0, '#fff8e6'], [1, '#e8d4a8']);
  ell(ctx, 0, -hgt, r, ry);
  ctx.fill();
  ctx.strokeStyle = '#f2c24a';
  ctx.lineWidth = Math.max(1.6, r * 0.09);
  ctx.stroke();
  stroke(ctx, 1);
  // 가운데 별 (튕기면 회전 +)
  ctx.fillStyle = hit > 0.1 ? '#ff9a3a' : '#e0503c';
  ctx.save();
  ctx.translate(0, -hgt);
  ctx.scale(1, 0.42);
  starPath(ctx, 0, 0, r * 0.38 * (1 + hit * 0.4));
  ctx.restore();
  ctx.fill();
  if (hit > 0.05) {
    ctx.strokeStyle = `rgba(255,255,255,${hit})`;
    ctx.lineWidth = 2;
    ell(ctx, 0, -hgt, r * (1.1 + (1 - hit) * 0.6), ry * (1.1 + (1 - hit) * 0.6));
    ctx.stroke();
  }
  // 반짝
  ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(t * 0.08)})`;
  ell(ctx, -r * 0.45, -hgt - ry * 0.3, r * 0.18, ry * 0.2);
  ctx.fill();
  ctx.restore();
}

/** 블록 탑 (3단) — 넘어지는 중이면 u(0~1)만큼 기운다 */
function drawTower(ctx: C2, x: number, y: number, s0: number, u: number, dx: number, seed: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(6,4,20,.42)';
  ell(ctx, 0, 0, s0 * 0.9, s0 * 0.34);
  ctx.fill();
  const ang = u * u * (Math.PI / 2) * (dx >= 0 ? 1 : -1);
  for (let j = 0; j < 3; j++) {
    const by = -s0 * 0.78 * (j + 1);
    ctx.save();
    ctx.rotate(ang * (1 + j * 0.15));
    ctx.translate(Math.sin(j * 2 + seed) * s0 * 0.06, 0);
    block(ctx, -s0 * 0.5, by, s0, s0 * 0.32, s0 * 0.62, BLOCK_COLS[(j + seed) % BLOCK_COLS.length], j + seed);
    ctx.restore();
  }
  ctx.restore();
}

/** 딸기잼 웅덩이 + 엎어진 병 */
function drawJam(ctx: C2, x: number, y: number, rx: number, ry: number, t: number, seed: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let j = 0; j <= 18; j++) {
    const a = (j / 18) * TAU, q = 1 + 0.12 * Math.sin(j * 2.3 + seed) + 0.03 * Math.sin(t * 0.03 + j);
    const px = Math.cos(a) * rx * q, py = Math.sin(a) * ry * q;
    if (j === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = radg(ctx, -rx * 0.2, -ry * 0.3, rx * 0.1, rx * 1.2, [0, '#ff6a80'], [0.6, '#c8243a'], [1, '#7a1020']);
  ctx.fill();
  stroke(ctx, 1.4, '#4a0818');
  // 윤기
  ctx.fillStyle = 'rgba(255,220,230,.45)';
  ell(ctx, -rx * 0.3, -ry * 0.35, rx * 0.3, ry * 0.18, -0.1);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,240,.75)';
  ell(ctx, -rx * 0.42, -ry * 0.4, rx * 0.08, ry * 0.08);
  ctx.fill();
  // 딸기 씨 · 덩어리
  ctx.fillStyle = 'rgba(255,200,120,.7)';
  for (let j = 0; j < 9; j++) {
    const a = hsh(j + seed) * TAU, q = 0.2 + hsh(j * 3 + seed) * 0.6;
    ell(ctx, Math.cos(a) * rx * q, Math.sin(a) * ry * q, 1.2, 0.8);
    ctx.fill();
  }
  // 엎어진 병 (가장자리)
  ctx.translate(rx * 0.92, -ry * 0.7);
  ctx.rotate(-0.4);
  const jw = rx * 0.32, jh = rx * 0.42;
  ctx.fillStyle = 'rgba(200,230,255,.35)';
  rr(ctx, -jw / 2, -jh, jw, jh, jw * 0.2);
  ctx.fill();
  stroke(ctx, 1.2);
  ctx.fillStyle = '#c8243a';
  rr(ctx, -jw / 2 + 1.5, -jh * 0.55, jw - 3, jh * 0.55 - 1.5, jw * 0.15);
  ctx.fill();
  ctx.fillStyle = '#f2e6c8';
  rr(ctx, -jw / 2, -jh * 0.7, jw, jh * 0.25, 1);
  ctx.fill();
  ctx.fillStyle = '#e04050';
  rr(ctx, -jw * 0.55, -jh * 1.12, jw * 1.1, jh * 0.16, 2);
  ctx.fill();
  stroke(ctx, 1);
  ctx.restore();
}

/** 쿠키 상자 진지 (가운데 깡통 + 하트 쿠키 셋) */
function drawFort(ctx: C2, w: number, cookies: number, t: number, hurt: number) {
  const R = (v: number) => v * w, cx = w / 2, by = R(OY + YB * KY);
  // 양옆 낮은 블록 담
  const bw = R(0.072), bd = R(0.03), bh = R(0.04);
  for (let j = 0; j < 12; j++) {
    const x0 = j < 6 ? R(0.0) + j * bw : w - (12 - j) * bw;
    if (x0 + bw > cx - R(0.14) && x0 < cx + R(0.14)) continue;
    block(ctx, x0, by + R(0.012), bw, bd, bh, BLOCK_COLS[(j * 2 + 1) % BLOCK_COLS.length], j);
  }
  // 깡통
  const tr = R(0.13), ty = by + R(0.035), tryy = tr * 0.36, th = R(0.065);
  const shake = hurt > 0 ? Math.sin(t * 1.5) * hurt * R(0.008) : 0;
  ctx.save();
  ctx.translate(cx + shake, 0);
  ctx.fillStyle = 'rgba(6,4,20,.45)';
  ell(ctx, 0, ty + th * 0.15, tr * 1.1, tryy * 1.1);
  ctx.fill();
  ctx.fillStyle = lin(ctx, -tr, 0, tr, 0, [0, '#1e3a78'], [0.4, '#3c6ac8'], [0.65, '#6a9ae8'], [1, '#1e3a78']);
  ctx.beginPath();
  ctx.ellipse(0, ty, tr, tryy, 0, 0, Math.PI);
  ctx.lineTo(-tr, ty - th);
  ctx.ellipse(0, ty - th, tr, tryy, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1.8);
  // 깡통 무늬 (눈꽃·별)
  ctx.fillStyle = 'rgba(255,240,200,.55)';
  for (let j = 0; j < 5; j++) {
    const a = Math.PI * (0.15 + j * 0.175), px = Math.cos(a) * tr * 0.92, py = ty - th * 0.5 + Math.sin(a) * tryy * 0.9;
    starPath(ctx, px, py, R(0.011));
    ctx.fill();
  }
  ctx.strokeStyle = '#f2c24a';
  ctx.lineWidth = R(0.007);
  ctx.beginPath();
  ctx.ellipse(0, ty - th * 0.1, tr, tryy, 0, 0.05, Math.PI - 0.05);
  ctx.stroke();
  // 열린 윗면 (안쪽)
  ctx.fillStyle = lin(ctx, 0, ty - th - tryy, 0, ty - th + tryy, [0, '#0e1c40'], [1, '#2a4a8a']);
  ell(ctx, 0, ty - th, tr, tryy);
  ctx.fill();
  ctx.strokeStyle = '#f2c24a';
  ctx.lineWidth = R(0.008);
  ctx.stroke();
  // 하트 쿠키 셋
  for (let j = 0; j < COOKIES; j++) {
    const px = (j - 1) * tr * 0.55, py = ty - th - tryy * 0.1 + (j === 1 ? -tryy * 0.25 : 0);
    if (j < cookies) {
      const bob = Math.sin(t * 0.05 + j) * R(0.002);
      ctx.fillStyle = lin(ctx, 0, py - R(0.03), 0, py + R(0.02), [0, '#e8b070'], [1, '#a8682e']);
      heartPath(ctx, px, py - R(0.012) + bob, R(0.026));
      ctx.fill();
      stroke(ctx, 1.4);
      ctx.fillStyle = '#ff7a9a';
      heartPath(ctx, px, py - R(0.014) + bob, R(0.017));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ell(ctx, px - R(0.008), py - R(0.02) + bob, R(0.004), R(0.003));
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(200,150,90,.6)';
      for (let q = 0; q < 4; q++) (ell(ctx, px + (hsh(q + j * 5) - 0.5) * R(0.03), py - R(0.004) + hsh(q * 2 + j) * R(0.008), R(0.004), R(0.003)), ctx.fill());
    }
  }
  // 뚜껑 (옆에 기대 둠)
  ctx.fillStyle = lin(ctx, 0, ty - th, 0, ty, [0, '#4a7ad8'], [1, '#1e3a78']);
  ell(ctx, -tr * 1.18, ty - th * 0.45, tr * 0.18, th * 0.62, 0.15);
  ctx.fill();
  stroke(ctx, 1.4);
  ctx.restore();
}

/** 곰 인형 (구경꾼): mood 0 보통 · 1 걱정 · 2 만세 · 3 얼굴 가림 */
function drawBear(ctx: C2, x: number, y: number, k: number, mood: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const br = Math.sin(t * 0.05) * k * 0.015, jump = mood === 2 ? Math.abs(Math.sin(t * 0.25)) * k * 0.12 : 0;
  ctx.fillStyle = 'rgba(6,4,20,.42)';
  ell(ctx, 0, 0, k * 0.5, k * 0.13);
  ctx.fill();
  ctx.translate(0, -jump);
  const fur = (x0: number, y0: number, r0: number) => {
    ctx.fillStyle = radg(ctx, x0 - r0 * 0.3, y0 - r0 * 0.3, r0 * 0.1, r0 * 1.2, [0, '#d8a46a'], [1, '#8a5a30']);
    ctx.beginPath();
    ctx.arc(x0, y0, r0, 0, TAU);
    ctx.fill();
    stroke(ctx, 1.4);
  };
  // 다리 (앉아 있음)
  fur(-k * 0.24, -k * 0.1, k * 0.14);
  fur(k * 0.24, -k * 0.1, k * 0.14);
  ctx.fillStyle = '#f2d6a8';
  for (const sx of [-1, 1]) (ell(ctx, sx * k * 0.26, -k * 0.08, k * 0.07, k * 0.08), ctx.fill());
  // 몸
  ctx.fillStyle = radg(ctx, -k * 0.1, -k * 0.4, k * 0.05, k * 0.4, [0, '#d8a46a'], [1, '#8a5a30']);
  ell(ctx, 0, -k * 0.34 + br, k * 0.3, k * 0.3);
  ctx.fill();
  stroke(ctx, 1.5);
  ctx.fillStyle = '#f2d6a8';
  ell(ctx, 0, -k * 0.3 + br, k * 0.17, k * 0.18);
  ctx.fill();
  // 리본
  ctx.fillStyle = '#e04a5a';
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.56);
  ctx.lineTo(-k * 0.12, -k * 0.62);
  ctx.lineTo(-k * 0.12, -k * 0.5);
  ctx.closePath();
  ctx.moveTo(0, -k * 0.56);
  ctx.lineTo(k * 0.12, -k * 0.62);
  ctx.lineTo(k * 0.12, -k * 0.5);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1);
  // 머리
  const hy = -k * 0.78 + br;
  fur(-k * 0.2, hy - k * 0.2, k * 0.09);
  fur(k * 0.2, hy - k * 0.2, k * 0.09);
  fur(0, hy, k * 0.26);
  ctx.fillStyle = '#f2d6a8';
  ell(ctx, 0, hy + k * 0.08, k * 0.12, k * 0.09);
  ctx.fill();
  ctx.fillStyle = OUT;
  ell(ctx, 0, hy + k * 0.04, k * 0.04, k * 0.03);
  ctx.fill();
  if (mood !== 3) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      if (mood === 2) {
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.6;
        ctx.arc(sx * k * 0.1, hy - k * 0.04, k * 0.035, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        ctx.arc(sx * k * 0.1, hy - k * 0.04, k * (mood === 1 ? 0.04 : 0.032), 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (mood === 2) (ctx.arc(0, hy + k * 0.1, k * 0.06, 0.1, Math.PI - 0.1), ctx.fillStyle = '#7a2030', ctx.fill());
  else if (mood === 1) ell(ctx, 0, hy + k * 0.14, k * 0.03, k * 0.035);
  else ctx.arc(0, hy + k * 0.08, k * 0.04, 0.3, Math.PI - 0.3);
  ctx.stroke();
  // 팔
  const armA = mood === 2 ? -2.4 + Math.sin(t * 0.4) * 0.3 : mood === 3 ? -2.0 : mood === 1 ? -1.6 : 0.4 + Math.sin(t * 0.04) * 0.1;
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * k * 0.26, -k * 0.46 + br);
    ctx.rotate(sx * -armA + (sx > 0 ? 0 : 0));
    ctx.scale(sx, 1);
    ctx.fillStyle = radg(ctx, 0, 0, 0, k * 0.25, [0, '#d8a46a'], [1, '#8a5a30']);
    ell(ctx, k * 0.02, k * 0.14, k * 0.08, k * 0.15);
    ctx.fill();
    stroke(ctx, 1.3);
    ctx.restore();
  }
  ctx.restore();
}

/** 손가락 그림 (첫 안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.08);
  ctx.fillStyle = '#ffe3c8';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  rr(ctx, -k * 0.12, -k * 0.05, k * 0.24, k * 0.55, k * 0.12);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.3, k * 0.28, k * 0.6, k * 0.5, k * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,150,150,.5)';
  ell(ctx, 0, k * 0.02, k * 0.07, k * 0.05);
  ctx.fill();
  ctx.restore();
}

const KIND_COL: Record<K, string[]> = { sol: ['#e84a3c', '#2c4a9a', '#f2c24a'], bot: ['#7fa4c8', '#ffd34a', '#d6e6f4'], spk: ['#7a9a38', '#c8d86a', '#a8683a'], boss: ['#e0603a', '#ffd34a', '#fff3a0'] };
const recentSay = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
const depthK = (y: number) => 0.86 + 0.24 * clamp(y, 0, 1);

/** 첫 벽까지의 길 (미리 보기) — 벽만 보고, 장난감은 무시 */
function previewPath(x: number, y: number, ang: number, len: number) {
  const pts: number[][] = [[x, y]];
  let dx = Math.cos(ang), dy = Math.sin(ang), left = len, px = x, py = y;
  for (let b = 0; b < 2 && left > 0; b++) {
    let tm = left;
    if (dx > 0) tm = Math.min(tm, (XR - TR - px) / dx);
    if (dx < 0) tm = Math.min(tm, (XL + TR - px) / dx);
    if (dy > 0) tm = Math.min(tm, (YB - TR - py) / dy);
    if (dy < 0) tm = Math.min(tm, (YT + TR - py) / dy);
    tm = Math.max(0, tm);
    px += dx * tm;
    py += dy * tm;
    left -= tm;
    pts.push([px, py]);
    if (left <= 0) break;
    if (px >= XR - TR - 1e-6 || px <= XL + TR + 1e-6) dx = -dx;
    if (py >= YB - TR - 1e-6 || py <= YT + TR + 1e-6) dy = -dy;
    left = Math.min(left, 0.2);
  }
  return pts;
}
/** 회전 S로 쏘면 (부딪침 없이) 굴러갈 거리 */
function runLen(S: number) {
  let d = 0;
  for (let q = S; q >= S_STOP; q -= DR0 + DR1 * q) d += speedOf(q);
  return d;
}

function topFace(s: SpinState) {
  const fx = juice(s), t = s.t;
  if (s.phase === 'result') return s.ok ? 5 : 6;
  if (t - (fx.memo.ouchT ?? -99) < 24) return 3;
  if (s.mode === 'wob') return 4;
  if (s.mode === 'charge') return 1;
  if (t - (fx.memo.bigT ?? -99) < 70) return 5;
  if (s.mode === 'run') return s.S > 0.4 ? 2 : 0;
  return 0;
}

function drawAll(ctx: C2, s: SpinState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => (OY + y * KY) * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const bg = getBg(Math.round(w), Math.round(h), Math.min(3, Math.max(1, Math.round(sc))));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const charge = s.mode === 'charge' && s.phase === 'play';
  const cS = charge ? (s.launches === 0 && s.stage === 0 ? 1 : spinOf(s.hold, s.stage)) : 0;

  // ── 사건 → 연출 (상태는 건드리지 않는다) ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    x = clamp(x, w * 0.14, w * 0.86);
    y = clamp(y, R(0.4), R(1.18));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < (size + q.size) * 0.6); k++) y += y < R(0.7) ? size + 2 : -(size + 2);
    y = clamp(y, R(0.4), R(1.18));
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, text, col, size);
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.kind) {
      case 'press':
        fx.ring(ex, ey - R(0.04), 'rgba(255,255,255,.8)', R(0.07), 2);
        break;
      case 'full':
        fx.ring(ex, ey - R(0.05), '#ffd34a', R(0.1), 3);
        fx.burst(ex, ey - R(0.05), '#fff3a0', 10, 2.4, 1.6);
        say(ex, ey - R(0.13), '최대!', '#ffe27a', 15);
        break;
      case 'launch': {
        const P = e.n ?? 0.5, a = e.a ?? 0;
        fx.ring(ex, ey - R(0.03), '#e8f6ff', R(0.06 + P * 0.06), 3);
        for (let j = 0; j < 8 + P * 10; j++) fx.burst(ex - Math.cos(a) * R(0.03), ey - Math.sin(a) * R(0.024), j % 2 ? '#d8c8b0' : '#ffffff', 1, 1.5 + P * 2.5, 1.6);
        fx.kick(2 + P * 4);
        if (P > 0.55) say(ex + Math.cos(a) * R(0.08), ey + Math.sin(a) * R(0.06) - R(0.08), P > 0.9 ? '슈웅!!' : '슝!', '#ffffff', 15 + P * 8);
        fx.memo.launchT = t;
        break;
      }
      case 'wall': {
        const P = e.a ?? 0.5;
        fx.burst(ex, ey - R(0.025), '#ffd27a', 6 + Math.round(P * 10), 2 + P * 3, 1.8);
        fx.burst(ex, ey - R(0.025), '#ffffff', 3 + Math.round(P * 5), 1.5 + P * 2.5, 1.3);
        fx.kick(1 + P * 4);
        if (P > 0.35 && t - (fx.memo.tangT ?? -99) > 10) (fx.memo.tangT = t), say(ex, ey - R(0.08), '탕!', '#ffe9a8', 14 + P * 8);
        fx.memo['wf' + (e.n ?? 0)] = t;
        fx.memo['wfy' + (e.n ?? 0)] = e.n === 3 || e.n === 4 ? e.x : e.y;
        break;
      }
      case 'fwall':
        fx.burst(ex, ey - R(0.04), '#ffe2b0', 4, 2, 1.4);
        break;
      case 'ko': {
        const n = e.n ?? 1, col = KIND_COL[(e.k as K) ?? 'sol'];
        for (let j = 0; j < 3; j++) fx.burst(ex, ey - R(0.05), col[j], 4 + Math.min(n, 6), 2.5 + Math.min(n, 6) * 0.4, 2.2);
        fx.ring(ex, ey - R(0.04), n >= 3 ? '#ffd34a' : '#ffffff', R(0.05 + Math.min(n, 8) * 0.008), 3);
        fx.kick(Math.min(10, 2 + n * 1.1));
        const pts = PTS[(e.k as K) ?? 'sol'] * Math.min(n, 8);
        if (n < 3) say(ex, ey - R(0.12), n >= 2 ? `+${pts} ×2` : `+${pts}`, '#ffffff', 14);
        if (n >= 3) (fx.memo.bigT = t), (fx.memo.bigN = n), (fx.memo.bigX = ex), (fx.memo.bigY = ey), (fx.memo.bearT = t);
        if (n === 5 || n === 8) fx.blink('#fff6d0', 0.3);
        if (e.a === 2) fx.burst(ex, ey - R(0.02), '#c89a5a', 6, 2.5, 2.4);
        break;
      }
      case 'clang':
        fx.burst(ex, ey - R(0.05), '#e8eef8', 10, 3, 1.8);
        fx.burst(ex, ey - R(0.05), '#ffd27a', 6, 2.5, 1.5);
        fx.kick(5);
        say(ex, ey - R(0.12), e.k === 'boss' ? '쾅! 약해!' : '쾅!', '#d8e4ff', 17);
        if (e.k === 'bot' && t - (fx.memo.bipT ?? -99) > 30) (fx.memo.bipT = t), say(ex + R(0.06), ey - R(0.2), '삐빅?!', '#ffe27a', 13);
        fx.memo.ouchT = t;
        break;
      case 'spike':
        fx.burst(ex, ey - R(0.05), '#c8d86a', 12, 3.2, 2);
        fx.burst(ex, ey - R(0.05), '#ffffff', 6, 2.5, 1.5);
        fx.kick(6);
        fx.blink('#c8ff9a', 0.12);
        say(ex, ey - R(0.13), '따끔!', '#e8ffb0', 19);
        fx.memo.ouchT = t;
        break;
      case 'spkfly':
        say(ex, ey - R(0.16), '콕! 가시 쓰러짐', '#e8ffb0', 14);
        break;
      case 'drum':
        fx.ring(ex, ey - R(0.03), '#ffd34a', R(0.11), 4);
        fx.burst(ex, ey - R(0.04), '#ffe9a8', 10, 3, 1.8);
        fx.kick(3);
        if (e.n) say(ex, ey - R(0.1), e.n >= 2 ? `둥! ×${e.n}` : '둥!', '#ffe27a', 17);
        if (e.n) say(ex, ey - R(0.16), '회전 +', '#9ff0ff', 13);
        fx.memo['dr' + Math.round(e.x * 100) + ':' + Math.round(e.y * 100)] = t;
        break;
      case 'topple':
        say(ex, ey - R(0.18), '기우뚱…', '#ffe9c8', 13);
        break;
      case 'crash': {
        const n = e.n ?? 0;
        fx.burst(ex, ey - R(0.02), '#e8c89a', 18, 3.5, 2.4);
        for (const c of BLOCK_COLS) fx.burst(ex, ey - R(0.03), c, 3, 3, 2.2);
        fx.kick(7);
        say(ex, ey - R(0.12), n >= 2 ? `와르르! ${n} 덮침` : '와르르!', '#ffd34a', 18);
        break;
      }
      case 'steal':
        fx.blink('#ff6a5a', 0.25);
        fx.kick(9);
        fx.burst(ex, R(OY + KY * 1.02), '#e8b070', 16, 3.4, 2.4);
        fx.burst(ex, R(OY + KY * 1.02), '#ff7a9a', 8, 3, 2);
        say(ex, R(OY + KY * 0.94), '냠! 하트 -1', '#ffb3a8', 18);
        fx.memo.stealT = t;
        fx.memo.bearT2 = t;
        break;
      case 'stop':
        fx.burst(ex, ey, '#d8c8b0', 8, 1.6, 2);
        say(ex, ey - R(0.13), '빙글… 털썩', '#e8e0ff', 13);
        break;
      case 'up':
        fx.burst(ex, ey, '#ffffff', 5, 1.4, 1.4);
        break;
      case 'bosshit':
        fx.burst(ex, ey - R(0.12), '#ffd34a', 22, 4.5, 2.8);
        fx.burst(ex, ey - R(0.12), '#ff6a4a', 14, 3.5, 2.4);
        fx.ring(ex, ey - R(0.1), '#ffd34a', R(0.16), 5);
        fx.kick(10);
        fx.blink('#fff0c0', 0.25);
        say(ex, ey - R(0.26), (e.n ?? 0) > 0 ? `으악! 남은 힘 ${e.n}` : '대장 쓰러짐!', '#ffd0a8', 19);
        break;
      case 'goo':
        if (t - (fx.memo.gooT ?? -99) > 18) (fx.memo.gooT = t), fx.burst(ex, ey, '#ff6a80', 4, 1.2, 2), say(ex, ey - R(0.1), '찐득', '#ffb0c0', 12);
        break;
      case 'wave':
        if ((e.n ?? 0) > 1) say(w / 2, R(OY + 0.05), '침대 밑에서 또 온다!', '#c8d0ff', 13);
        break;
      case 'clear':
        fx.burst(w * 0.3, Y(0.6), '#ffd34a', 36, 6, 3);
        fx.burst(w * 0.7, Y(0.6), '#9ff0ff', 36, 6, 3);
        fx.ring(w / 2, Y(0.6), '#ffd34a', R(0.45), 7);
        fx.blink('#fff6c8', 0.22);
        break;
      case 'fail':
        fx.kick(6);
        break;
    }
  }
  fx.memo.t = t;

  ctx.save();
  fx.begin(ctx);
  // ── 방 (시차) · 침대 ──
  ctx.fillStyle = '#121633';
  ctx.fillRect(-20, -20, w + 40, h + 40);
  const cam = s.camX;
  ctx.drawImage(bg.room, -R(0.06) - cam * R(0.05), 0, bg.room.width / sc, bg.room.height / sc);
  ctx.drawImage(bg.bedTop, 0, 0, w, R(OY) + 2);
  // 침대 위 잠든 고양이 (큰 순간엔 깬다)
  {
    const wake = Math.max(0, 70 - (t - (fx.memo.bigT ?? -99))) / 70;
    const cx2 = X(0.8), cy2 = R(WALL_B + 0.03), k = R(0.07);
    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.fillStyle = 'rgba(6,4,20,.3)';
    ell(ctx, 0, k * 0.08, k * 0.8, k * 0.18);
    ctx.fill();
    ctx.fillStyle = radg(ctx, -k * 0.2, -k * 0.2, k * 0.1, k, [0, '#f2b878'], [1, '#c87a3a']);
    ell(ctx, 0, -k * 0.12 - wake * k * 0.1, k * 0.62, k * 0.3);
    ctx.fill();
    stroke(ctx, 1.3);
    const hx = -k * 0.48, hy = -k * 0.22 - wake * k * 0.32;
    ctx.beginPath();
    ctx.arc(hx, hy, k * 0.24, 0, TAU);
    ctx.fill();
    stroke(ctx, 1.3);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + sx * k * 0.08, hy - k * 0.18);
      ctx.lineTo(hx + sx * k * 0.2, hy - k * 0.34);
      ctx.lineTo(hx + sx * k * 0.22, hy - k * 0.1);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, 1.1);
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      if (wake > 0.2) (ctx.arc(hx + sx * k * 0.09, hy, k * 0.045, 0, TAU), (ctx.fillStyle = OUT), ctx.fill());
      else (ctx.arc(hx + sx * k * 0.09, hy, k * 0.05, 0.2, Math.PI - 0.2), ctx.stroke());
    }
    ctx.strokeStyle = '#c87a3a';
    ctx.lineWidth = k * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(k * 0.55, -k * 0.1);
    ctx.quadraticCurveTo(k * 0.85, -k * 0.2 + Math.sin(t * 0.06) * k * 0.15, k * 0.7, -k * 0.42);
    ctx.stroke();
    ctx.restore();
    if (wake < 0.05 && t % 140 < 70) {
      font(0.032, 800);
      ctx.fillStyle = 'rgba(220,226,255,.8)';
      ctx.textAlign = 'center';
      ctx.fillText('z', cx2 - R(0.08), cy2 - R(0.06) - (t % 140) * 0.1);
    }
    if (wake > 0.6) {
      font(0.032, 900);
      ctx.fillStyle = '#fff3c4';
      ctx.textAlign = 'center';
      ctx.fillText('야옹!', cx2 - R(0.07), cy2 - R(0.07));
    }
  }
  // 침대 밑: 나올 장난감의 반짝이는 눈 · 다리
  const under = s.foes.filter((f) => f.y < 0.004);
  for (const f of under) {
    const k = R(FOE_H[f.k]) * depthK(0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, R(GAP0 - 0.004), w, R(OY) - R(GAP0 - 0.004) + R(0.01));
    ctx.clip();
    ctx.translate(X(f.x), Y(f.y));
    drawFoeAt(ctx, f.k, k, { ph: f.ph, t, hurt: 0, ko: false, stun: false, seed: f.seed, hp: f.hp, key: t * 0.15 + f.seed });
    ctx.restore();
  }
  ctx.drawImage(bg.bedFront, 0, 0, w, R(OY) + 2);
  for (const f of under) {
    const ex = X(f.x), ey = R(GAP0 + 0.018), bl = (t + f.seed) % 120 < 6;
    if (bl) continue;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = f.k === 'spk' ? '#c8ff7a' : f.k === 'sol' ? '#fff3c4' : '#ffd34a';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ell(ctx, ex + sx * R(0.012), ey, R(0.006), R(0.004));
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  // ── 바닥 ──
  ctx.drawImage(bg.floor, 0, 0, w, h);
  // 벽에 튕긴 곳: 블록이 번쩍
  for (const side of [1, 2]) {
    const age = t - (fx.memo['wf' + side] ?? -99);
    if (age > 12) continue;
    const yy = Y(fx.memo['wfy' + side] ?? 0.5), xx = side === 1 ? R(XL) : R(XR);
    ctx.fillStyle = radg(ctx, xx, yy - R(0.02), 0, R(0.08), [0, `rgba(255,230,160,${0.7 * (1 - age / 12)})`], [1, 'rgba(255,230,160,0)']);
    ctx.fillRect(xx - R(0.08), yy - R(0.1), R(0.16), R(0.16));
  }
  // 잼
  s.jams.forEach((j, i) => drawJam(ctx, X(j.x), Y(j.y), R(j.rx), R(j.ry) * KY, t, i * 7 + 3));
  // 마찰 자국 (불꽃 튄 자리)
  for (const m of s.marks) {
    const age = t - m.t, a = Math.max(0, 1 - age / 300);
    ctx.strokeStyle = age < 14 ? `rgba(255,${180 + age * 4},90,${0.9 * a})` : `rgba(20,10,8,${0.35 * a * m.p})`;
    ctx.lineWidth = R(0.012) * m.p;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(m.x) - Math.cos(m.a) * R(0.012), Y(m.y) - Math.sin(m.a) * R(0.01));
    ctx.lineTo(X(m.x) + Math.cos(m.a) * R(0.012), Y(m.y) + Math.sin(m.a) * R(0.01));
    ctx.stroke();
  }
  // 쓰러져 누운 장난감 (잠깐 남았다 사라짐)
  for (const db of s.debris) {
    const age = t - db.t, a = Math.min(1, (150 - age) / 40);
    if (a <= 0) continue;
    const k = R(FOE_H[db.k as K]) * depthK(db.y);
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    ctx.translate(X(db.x), Y(db.y));
    ctx.fillStyle = 'rgba(6,4,20,.35)';
    ell(ctx, 0, 0, k * 0.4, k * 0.1);
    ctx.fill();
    ctx.rotate(db.face * Math.PI / 2 * 0.95);
    ctx.translate(0, k * 0.08);
    drawFoeAt(ctx, db.k as K, k, { ph: 0, t, hurt: 0, ko: true, stun: false, seed: db.seed, hp: 0, key: db.seed });
    ctx.restore();
    if (age < 100 && age % 50 < 25) {
      ctx.fillStyle = '#fff3a0';
      for (let j = 0; j < 3; j++) {
        const an = t * 0.12 + (j * TAU) / 3;
        starPath(ctx, X(db.x) + Math.cos(an) * k * 0.35, Y(db.y) - k * 0.3 + Math.sin(an) * k * 0.12, R(0.008));
        ctx.fill();
      }
    }
  }
  // 무너진 블록
  for (const tw of s.towers) {
    if (tw.st !== 2) continue;
    const age = t - tw.ft, a = Math.min(1, (200 - age) / 50);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    for (let j = 0; j < 3; j++) {
      const u = 0.25 + j * 0.3, bx = X(tw.x + tw.dx * TOWER_L * u), by = Y(tw.y + tw.dy * TOWER_L * u), s0 = R(0.05);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(hsh(tw.id + j) - 0.5);
      block(ctx, -s0 / 2, -s0 * 0.5, s0, s0 * 0.32, s0 * 0.6, BLOCK_COLS[(j + tw.id) % BLOCK_COLS.length], j + tw.id);
      ctx.restore();
    }
    ctx.restore();
  }
  // 위험 표시: 진지에 가까운 장난감 발밑 빨간 고리
  for (const f of s.foes) {
    if (f.y < 0.72) continue;
    const u = clamp((f.y - 0.72) / 0.26, 0, 1), pulse = 0.5 + 0.5 * Math.sin(t * 0.3);
    ctx.strokeStyle = `rgba(255,80,70,${0.35 + 0.5 * u * pulse})`;
    ctx.lineWidth = 2;
    ell(ctx, X(f.x), Y(f.y), R(RAD[f.k]) * 1.3, R(RAD[f.k]) * 0.5);
    ctx.stroke();
  }
  // ── 미리 보기 (꾹 누르는 동안): 첫 벽까지의 길 ──
  let firstHit: Foe | null = null;
  if (charge) {
    const pts = previewPath(s.x, s.y, s.aim, Math.min(runLen(cS), 1.6));
    const a = 0.55 + 0.35 * Math.sin(t * 0.3);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      ctx.strokeStyle = 'rgba(10,6,24,.4)';
      ctx.lineWidth = R(0.022);
      ctx.beginPath();
      ctx.moveTo(X(x0), Y(y0) - R(0.01));
      ctx.lineTo(X(x1), Y(y1) - R(0.01));
      ctx.stroke();
      ctx.strokeStyle = i === 1 ? `rgba(255,240,200,${a})` : `rgba(255,240,200,${a * 0.45})`;
      ctx.lineWidth = R(0.008 + cS * 0.006);
      ctx.setLineDash([R(0.022), R(0.016)]);
      ctx.lineDashOffset = -t * (1 + cS * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (i < pts.length - 1) {
        ctx.fillStyle = '#ffe27a';
        starPath(ctx, X(x1), Y(y1) - R(0.01), R(0.018));
        ctx.fill();
        stroke(ctx, 1);
      }
    }
    // 처음 부딪칠 장난감 (길 위)
    const [x0, y0] = pts[0], [x1, y1] = pts[1], L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    let bu = 1e9;
    for (const f of s.foes) {
      if (f.y < 0) continue;
      const qx = f.x - x0, qy = f.y - y0, u = qx * ux + qy * uy;
      if (u < 0 || u > L) continue;
      if (Math.abs(qx * uy - qy * ux) < RAD[f.k] + TR && u < bu) (bu = u), (firstHit = f);
    }
    ctx.restore();
  }
  // ── 서 있는 것들: 발 y 순서로 ──
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  for (const b of s.bumpers) {
    const hit = Math.max(0, 1 - (t - (fx.memo['dr' + Math.round(b.x * 100) + ':' + Math.round(b.y * 100)] ?? -99)) / 14);
    items.push({ y: b.y, draw: () => drawDrum(ctx, X(b.x), Y(b.y), R(BR) * 1.05, hit, t) });
  }
  for (const tw of s.towers) {
    if (tw.st === 2) continue;
    const u = tw.st === 1 ? clamp(tw.t / TOWER_T, 0, 1) : 0;
    items.push({ y: tw.y, draw: () => drawTower(ctx, X(tw.x), Y(tw.y), R(0.056), u, tw.dx, tw.id) });
  }
  for (const f of s.foes) {
    if (f.y < 0.004) continue;
    items.push({
      y: f.y,
      draw: () => {
        const k = R(FOE_H[f.k]) * depthK(f.y), hurt = Math.max(0, 1 - (t - f.hurtT) / 20);
        ctx.save();
        ctx.translate(X(f.x), Y(f.y));
        ctx.fillStyle = 'rgba(6,4,20,.42)';
        ell(ctx, 0, 0, R(RAD[f.k]) * 1.05, R(RAD[f.k]) * 0.4);
        ctx.fill();
        if (hurt > 0) ctx.translate(Math.sin(t * 2.2) * k * 0.05 * hurt, 0);
        if (f === firstHit) {
          ctx.shadowColor = '#fff1b0';
          ctx.shadowBlur = 10;
        }
        drawFoeAt(ctx, f.k, k, { ph: f.ph, t, hurt, ko: false, stun: f.stun > 0, seed: f.seed, hp: f.hp, key: (f.stun > 0 ? -1 : 1) * t * 0.15 + f.seed });
        ctx.restore();
        if (f.k === 'boss') {
          for (let j = 0; j < BOSS_HP; j++) {
            const px = X(f.x) + (j - (BOSS_HP - 1) / 2) * R(0.03), py = Y(f.y) - k * 1.18;
            heartPath(ctx, px, py, R(0.011));
            ctx.fillStyle = j < f.hp ? '#ff6a4a' : 'rgba(255,255,255,.18)';
            ctx.fill();
            stroke(ctx, 1.2);
          }
        }
        if (f.stun > 0 && f.k !== 'boss') {
          ctx.fillStyle = '#fff3a0';
          for (let j = 0; j < 3; j++) {
            const an = t * 0.15 + (j * TAU) / 3;
            starPath(ctx, X(f.x) + Math.cos(an) * k * 0.25, Y(f.y) - k * 1.05 + Math.sin(an) * k * 0.08, R(0.009));
            ctx.fill();
          }
        }
      },
    });
  }
  // 팽이 전사
  const sq = Math.max(0, 1 - (t - (fx.memo.ouchT ?? -99)) / 12) * 0.6 + (charge ? 0.08 + 0.1 * cS : 0);
  const look = (alpha: number, spin: number): TopLook => {
    const v = Math.hypot(s.vx, s.vy), wobA = s.mode === 'wob' ? Math.min(1, s.mt / WOB) : 0;
    const tilt = s.mode === 'run' ? clamp((s.vx / (v || 1)) * 0.22 * clamp(s.S * 1.5, 0, 1), -0.25, 0.25) + Math.sin(t * (0.6 - s.S * 0.3)) * (0.04 + 0.2 * clamp(0.35 - s.S, 0, 0.35))
      : s.mode === 'wob' ? Math.sin(t * 0.5) * (0.25 + wobA * 0.5) * (1 - wobA * 0.3) + (wobA > 0.7 ? (wobA - 0.7) * 3 : 0)
      : charge ? Math.sin(t * 1.3) * 0.03 * cS - Math.cos(s.aim) * 0.12 * cS : Math.sin(t * 0.08) * 0.03;
    return { spin, ph: s.spinPh, tilt, face: topFace(s), sq, t, alpha, tail: s.mode === 'run' ? clamp(s.vx / VMAX, -1, 1) : charge ? -Math.cos(s.aim) * cS : 0.3 * Math.sin(t * 0.03), wob: wobA };
  };
  const topK = R(TR) * 1.12 * depthK(s.y);
  const pull = charge ? cS * R(0.03) : 0;
  const tpx = X(s.x) - Math.cos(s.aim) * pull, tpy = Y(s.y) - Math.sin(s.aim) * pull * KY;
  const topSpin = s.mode === 'run' ? s.S : charge ? cS : s.mode === 'wob' ? 0.12 * (1 - s.mt / WOB) : 0.05;
  items.push({
    y: s.y + 0.0001,
    draw: () => {
      // 잔상 (빨리 돌며 달릴 때)
      if (s.mode === 'run') s.trail.forEach((q, i) => i % 2 === 0 && i < s.trail.length - 1 && drawTop(ctx, X(q.x), Y(q.y), topK, { ...look(0.12 + 0.05 * i, q.S), face: topFace(s) }));
      // 누르는 동안: 회전 게이지 고리
      if (charge) {
        const cx2 = tpx, cy2 = tpy - topK * 0.9, rr2 = topK * 1.9;
        ctx.strokeStyle = 'rgba(10,6,24,.5)';
        ctx.lineWidth = R(0.014);
        ell(ctx, cx2, cy2, rr2, rr2 * 0.5);
        ctx.stroke();
        ctx.strokeStyle = cS >= 0.999 ? '#ff7a3a' : cS > 0.5 ? '#ffd34a' : '#7ad8ff';
        ctx.lineWidth = R(0.01);
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, rr2, rr2 * 0.5, 0, -Math.PI / 2, -Math.PI / 2 + TAU * cS);
        ctx.stroke();
      }
      drawTop(ctx, tpx, tpy, topK, look(1, topSpin));
      // 멈춰 서 있을 때: '여기를 꾹' 반짝 고리
      if (s.mode === 'ready' && s.phase === 'play') {
        const pu = 0.5 + 0.5 * Math.sin(t * 0.15);
        ctx.strokeStyle = `rgba(255,240,180,${0.35 + 0.35 * pu})`;
        ctx.lineWidth = 2;
        ell(ctx, X(s.x), Y(s.y), topK * (1.3 + pu * 0.2), topK * (0.46 + pu * 0.07));
        ctx.stroke();
      }
    },
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // ── 날아가는 장난감 (공중이라 맨 위에) ──
  for (const f of s.flyers) {
    const k = R(FOE_H[f.k]) * depthK(f.y), gx = X(f.x), gy = Y(f.y), zz = R(f.z) * 1.6;
    ctx.fillStyle = `rgba(6,4,20,${0.35 * Math.max(0.2, 1 - f.z * 8)})`;
    ell(ctx, gx, gy, R(RAD[f.k]) * 0.9, R(RAD[f.k]) * 0.34);
    ctx.fill();
    // 꼬리 줄
    const sp = Math.hypot(f.vx, f.vy);
    if (sp > 0.006) {
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy - zz - k * 0.4);
      ctx.lineTo(gx - f.vx * w * 4, gy - zz - k * 0.4 - f.vy * w * 4 * KY + f.vz * w * 3);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(gx, gy - zz - k * 0.45);
    ctx.rotate(f.t * f.spin);
    ctx.translate(0, k * 0.45);
    drawFoeAt(ctx, f.k, k, { ph: 0, t, hurt: 1, ko: true, stun: false, seed: f.seed, hp: 0, key: t * 0.6 });
    ctx.restore();
    // 날아간 모자
    if (f.k === 'sol' && f.t < 50) {
      ctx.save();
      ctx.translate(gx + f.t * 0.6 * Math.sign(f.vx || 1), gy - zz - k * 1.1 - f.t * 0.8 + f.t * f.t * 0.02);
      ctx.rotate(f.t * 0.3);
      ctx.fillStyle = '#16121e';
      rr(ctx, -k * 0.11, -k * 0.2, k * 0.22, k * 0.22, k * 0.03);
      ctx.fill();
      ctx.fillStyle = '#e8463c';
      ell(ctx, 0, -k * 0.23, k * 0.045, k * 0.06);
      ctx.fill();
      ctx.restore();
    }
  }
  // 진지 (가장 가까운 앞쪽)
  const hurtF = Math.max(0, 1 - (t - (fx.memo.stealT ?? -99)) / 30);
  drawFort(ctx, w, s.cookies, t, hurtF);
  // 곰 인형 구경꾼
  {
    const near = s.foes.some((f) => f.y > 0.8);
    const mood = s.phase === 'result' ? (s.ok ? 2 : 3) : t - (fx.memo.bearT2 ?? -99) < 80 ? 3 : t - (fx.memo.bearT ?? -99) < 70 ? 2 : near ? 1 : 0;
    drawBear(ctx, X(0.9), R(OY + KY * 1.12), R(0.13), mood, t);
    if (mood === 2 && t - (fx.memo.bearT ?? -99) < 40) {
      font(0.032, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff3c4';
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.lineWidth = 3;
      ctx.strokeText('와아!', X(0.86), R(OY + KY * 0.97));
      ctx.fillText('와아!', X(0.86), R(OY + KY * 0.97));
    }
  }
  // 첫 안내: 손가락 그림 하나 (왼쪽 위 벽 쪽을 꾹)
  if (s.stage === 0 && s.launches === 0 && s.phase === 'play' && !charge) {
    const tx = X(0.24), ty = Y(0.62), cyc = (t % 80) / 80, press = cyc < 0.5 ? cyc * 2 : 1 - (cyc - 0.5) * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.moveTo(X(s.x), Y(s.y) - R(0.03));
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - press * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tx, ty, R(0.03 + press * 0.03), 0, TAU);
    ctx.stroke();
    drawHand(ctx, tx, ty + R(0.005), R(0.085), press);
    ctx.restore();
  }
  // 굴러가는 동안 누르면: '멈추면 다시!'
  if (s.finger && (s.mode === 'run' || s.mode === 'wob') && s.phase === 'play') {
    font(0.034, 900);
    const txt = '멈추면 다시 쏴요', tw2 = ctx.measureText(txt).width + R(0.04), bx = clamp(X(s.x), tw2 / 2 + 4, w - tw2 / 2 - 4), by = Y(s.y) - R(0.13);
    ctx.fillStyle = 'rgba(14,10,36,.8)';
    rr(ctx, bx - tw2 / 2, by - R(0.022), tw2, R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = '#e8ecff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, bx, by + 1);
  }
  // 누르는 동안: 처음 맞을 것이 무거우면 '약해요/쓰러져요'
  if (charge && firstHit && (firstHit.k === 'bot' || firstHit.k === 'spk' || firstHit.k === 'boss')) {
    const f = firstHit, ok = cS >= WGT[f.k] + 0.03, k = R(FOE_H[f.k]) * depthK(f.y);
    font(0.034, 900);
    const txt = f.k === 'spk' ? (ok ? '가시도 쓰러져요!' : '따끔! 회전이 깎여요') : ok ? '쓰러져요!' : '약해요 — 더 돌려요';
    const tw2 = ctx.measureText(txt).width + R(0.04), bx = clamp(X(f.x), tw2 / 2 + 4, w - tw2 / 2 - 4), by = Y(f.y) - k * 1.3;
    ctx.fillStyle = ok ? 'rgba(30,110,60,.9)' : 'rgba(140,30,30,.9)';
    rr(ctx, bx - tw2 / 2, by - R(0.022), tw2, R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, bx, by + 1);
  }
  // 새것 스포트라이트
  if (s.spot) {
    const age = t - s.spot.t;
    if (age < 110) {
      const a = Math.min(1, age / 10, (110 - age) / 20), cx2 = X(s.spot.x), cy2 = Y(s.spot.y) - R(0.05), r0 = R(0.1);
      ctx.save();
      ctx.fillStyle = `rgba(4,4,16,${0.45 * a})`;
      ctx.beginPath();
      ctx.rect(-20, R(0.085), w + 40, R(GB) - R(0.085));
      ctx.arc(cx2, cy2, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,74,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx2, cy2, r0 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.04, 900);
      const label = `NEW  ${s.spot.label}`, tw2 = ctx.measureText(label).width + R(0.04), lx = clamp(cx2, tw2 / 2 + 6, w - tw2 / 2 - 6);
      const ly = cy2 + r0 + R(0.04);
      ctx.fillStyle = '#ffd84a';
      rr(ctx, lx - tw2 / 2, ly - R(0.026), tw2, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#1a1424';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // 떠다니는 먼지 (스탠드 빛 속)
  for (let j = 0; j < 10; j++) {
    const xx = X(0.55 + hsh(j) * 0.45) + Math.sin(t * 0.01 + j) * R(0.03), yy = R(0.12) + ((hsh(j + 9) * R(1.1) + t * 0.08 * (0.5 + hsh(j + 2))) % R(1.1));
    ctx.fillStyle = `rgba(255,230,170,${0.2 + 0.25 * Math.abs(Math.sin(t * 0.02 + j))})`;
    ctx.beginPath();
    ctx.arc(xx, yy, 1.2, 0, TAU);
    ctx.fill();
  }
  // 와르르 순간엔 화면 가장자리가 잠깐 어두워진다 (느린 시간)
  if (s.slowT > 0) {
    ctx.fillStyle = radg(ctx, w / 2, R(0.75), R(0.3), R(0.95), [0, 'rgba(0,0,0,0)'], [1, `rgba(10,4,30,${0.4 * Math.min(1, s.slowT / 12)})`]);
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
  ctx.restore();
  // 큰 순간 띠: 'N 와르르!'
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 56) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN, sc2 = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (56 - age) / 16);
    const bx = clamp(fx.memo.bigX, w * 0.32, w * 0.68), by = clamp(fx.memo.bigY - R(0.22), R(0.42), R(1.05));
    const txt = n >= 8 ? `${n}개 와르르르!!` : n >= 5 ? `${n}개 와르르!` : `${n}개 쓰러뜨림!`, size = Math.min(34, 19 + n * 2.2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.06);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw2 = ctx.measureText(txt).width, rx = tw2 / 2 + 18, ry = size * 0.78;
    ctx.translate(clamp(bx, rx * 1.12 * sc2 + 4, w - rx * 1.12 * sc2 - 4) - bx, 0);
    ctx.fillStyle = 'rgba(30,14,60,.9)';
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const an = (i / 20) * TAU, q = i % 2 ? 0.86 : 1.12;
      const px = Math.cos(an) * rx * q, py = Math.sin(an) * ry * q;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd34a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1a0a30';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#fff6c2'], [0.55, '#ffd23f'], [1, '#ff8a2e']);
    ctx.fillText(txt, 0, 2);
    ctx.restore();
  }

  // ═════════════ 위 띠 ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(14,12,40,.95)'], [1, 'rgba(24,20,58,.9)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(255,201,90,.5)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  {
    const cx = R(0.055), cy = hb / 2;
    ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe08a'], [1, '#c8902a']);
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.03), 0, TAU);
    ctx.fill();
    stroke(ctx, 2);
    ctx.fillStyle = '#2a1a08';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff6e0';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.1), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.036, 700);
    ctx.fillStyle = '#9aa0cc';
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  }
  {
    const cy = hb / 2;
    ctx.textAlign = 'right';
    font(0.042, 900);
    const stt = String(s.stars), sw = ctx.measureText(stt).width;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText(stt, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.025), cy, R(0.02));
    ctx.fill();
    stroke(ctx, 1.2);
    // 남은 기회 = 작은 팽이
    for (let j = 0; j < LIVES; j++) {
      const px = w - R(0.03) - sw - R(0.085) - j * R(0.05), on = LIVES - 1 - j < s.lives;
      ctx.save();
      ctx.globalAlpha = on ? 1 : 0.25;
      ctx.translate(px, cy + R(0.014));
      ctx.fillStyle = on ? '#e0453a' : '#8890b0';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R(0.017), -R(0.017));
      ctx.lineTo(-R(0.017), -R(0.017));
      ctx.closePath();
      ctx.fill();
      stroke(ctx, 1);
      ctx.fillStyle = on ? '#ffd35a' : '#aab0c8';
      ell(ctx, 0, -R(0.019), R(0.018), R(0.006));
      ctx.fill();
      stroke(ctx, 1);
      ctx.fillStyle = on ? '#f0603e' : '#8890b0';
      ctx.beginPath();
      ctx.arc(0, -R(0.026), R(0.01), Math.PI, 0);
      ctx.fill();
      stroke(ctx, 1);
      ctx.restore();
    }
  }
  // 판 카드 (벽 띠 안 — 놀이터를 가리지 않는다)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '모든 장난감을 물리쳤다!' : `${d.goal} 성공!`;
      else (head = `으앗… ${s.why}`), (sub = s.lives > 0 ? '기회 -1 · 같은 판 다시' : '끝 — 팽이 전사가 쉬러 가요');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : '꾹 눌러 돌리고, 떼면 슝!';
    }
    if (head) {
      const cy = R(0.18), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.045, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.04), Math.max(w1, w2) + R(0.1)) * unroll, ch = sub || (s.phase === 'result' && s.ok) ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - ch / 2 + 4, cw, ch, R(0.025));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#fff3dc'], [1, '#f0d8a8']);
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.025));
      ctx.fill();
      stroke(ctx, 2, '#8a5a2c');
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.045, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#8a5a0a' : '#9a2a20') : '#2a1a0c';
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.025));
        const n = d.stars.length;
        for (let j = 0; j < n; j++) {
          const ag = s.pt - (12 + j * 12);
          const sx = w / 2 + (j - (n - 1) / 2) * R(0.075), sy = cy + R(0.032);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.027) * (ag < 0 ? 1 : pop));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,60,20,.18)';
          ctx.fill();
          stroke(ctx, 1.5, ag >= 0 && s.starOk[j] ? '#7a4a08' : 'rgba(90,60,20,.4)');
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.025) : 0), w - R(0.08));
        if (sub) {
          font(0.036, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#a2281e' : '#4a3418';
          ctx.fillText(sub, w / 2, cy + R(0.032), w - R(0.08));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 회전 게이지 · 하트 · 별 · 안내 ═════════════
  {
    const ty = R(GB);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, 'rgba(20,16,50,.97)'], [1, 'rgba(10,8,28,.98)']);
    rr(ctx, 0, ty, w, h - ty + 4, R(0.025));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,201,90,.45)';
    ctx.fillRect(R(0.02), ty, w - R(0.04), 1.5);
    const r1 = ty + R(0.042);
    {
      // 소용돌이 아이콘
      const ix = R(0.045);
      ctx.strokeStyle = '#ffd34a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let u = 0; u < 1; u += 0.05) {
        const a = u * 11 + s.spinPh * 0.5, q = u * R(0.02);
        if (u === 0) ctx.moveTo(ix, r1);
        else ctx.lineTo(ix + Math.cos(a) * q, r1 + Math.sin(a) * q);
      }
      ctx.stroke();
      const gx = R(0.08), gw = w - R(0.08) - R(0.26), gh = R(0.032);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
      ctx.fill();
      const fr = clamp(charge ? cS : s.mode === 'run' ? s.S : 0, 0, 1);
      if (fr > 0.005) {
        ctx.fillStyle = lin(ctx, gx, 0, gx + gw, 0, [0, '#4ac8ff'], [0.5, '#ffd34a'], [1, '#ff6a3a']);
        rr(ctx, gx, r1 - gh / 2, Math.max(gh, gw * fr), gh, gh / 2);
        ctx.fill();
      }
      // 눈금: 로봇(0.5) · 가시(0.8)
      for (const [v, lab] of [[WGT.bot, '로봇'], [WGT.spk, '가시']] as [number, string][]) {
        if (s.stage < 1 && lab === '로봇') continue;
        if (s.stage < 3 && lab === '가시') continue;
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gx + gw * v, r1 - gh / 2 - 2);
        ctx.lineTo(gx + gw * v, r1 + gh / 2 + 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,220,150,.55)';
      ctx.lineWidth = 1.5;
      rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
      ctx.stroke();
      font(0.034, 900);
      ctx.textAlign = 'center';
      const lab = charge ? (cS >= 0.999 ? '회전 최대!' : '윙윙… 회전 모으는 중') : s.mode === 'run' ? '회전' : s.mode === 'wob' ? '비틀비틀…' : '꾹 눌러 돌리기';
      ctx.fillStyle = fr > 0.45 ? '#2a1606' : '#e8ecff';
      ctx.fillText(lab, gx + gw / 2, r1 + 1, gw - R(0.02));
      // 진지 하트
      const hx0 = w - R(0.235);
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e8ecff';
      ctx.fillText('진지', hx0, r1 + 1);
      for (let j = 0; j < COOKIES; j++) {
        const hx = hx0 + R(0.09) + j * R(0.045);
        heartPath(ctx, hx, r1, R(0.016));
        ctx.fillStyle = j < s.cookies ? lin(ctx, hx, r1 - R(0.02), hx, r1 + R(0.02), [0, '#ff8a95'], [1, '#d62b3d']) : 'rgba(255,255,255,.12)';
        ctx.fill();
        stroke(ctx, 1.2, j < s.cookies ? OUT : 'rgba(255,255,255,.3)');
      }
    }
    // 별 (쉬운 말, 판마다 하나씩 는다)
    const r2 = ty + R(0.1);
    {
      const labels = d.stars.map((x) => x.label + (s.phase === 'play' && !starMet(s, x) && x.k !== 'nolose' && starNow(s, x) ? ` ${starNow(s, x)}` : ''));
      const ok = s.phase === 'result' && s.ok ? s.starOk : d.stars.map((x) => x.k !== 'clear' && x.k !== 'nolose' && x.k !== 'shots' && starMet(s, x));
      const bad = d.stars.map((x) => (x.k === 'nolose' && s.lost > 0) || (x.k === 'shots' && s.shots > x.n));
      font(0.034, 800);
      const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
      const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (labels.length - 1), scl = Math.min(1, (w - R(0.03)) / tot);
      let xx = (w - tot * scl) / 2;
      for (let j = 0; j < labels.length; j++) {
        const pw = ws[j] * scl;
        ctx.fillStyle = ok[j] ? 'rgba(255,216,74,.22)' : bad[j] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.07)';
        rr(ctx, xx, r2 - R(0.025), pw, R(0.05), R(0.025));
        ctx.fill();
        ctx.strokeStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.28)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        starPath(ctx, xx + R(0.026) * scl + 2, r2, R(0.014));
        ctx.fillStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.55)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = ok[j] ? '#fff6dc' : bad[j] ? 'rgba(255,255,255,.35)' : '#e6ecff';
        font(0.034, 800);
        ctx.fillText(labels[j], xx + R(0.05) * scl, r2 + 1, pw - R(0.058) * scl);
        xx += pw + gap * scl;
      }
    }
    {
      let hint = d.hint;
      const first = s.stage === 0 && s.launches === 0 && s.phase === 'play';
      if (first) hint = '👆 꾹 눌러 돌리고, 떼면 그쪽으로 슝!';
      else if (charge) hint = cS >= 0.999 ? '최대! 떼면 쏜살같이 날아가요' : '오래 누를수록 세게 돌아요 — 떼면 슝!';
      else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판을 지켰어요!' : `별 ${s.got}개! 다음 판엔 새 장난감이 나와요`) : '진지에 가까운 장난감부터 쓰러뜨려요';
      font(first ? 0.04 : 0.035, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
      ctx.fillText(hint, w / 2, ty + R(0.163), w - R(0.04));
    }
  }
  void th;
}
