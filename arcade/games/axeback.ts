/**
 * 되돌아오는 도끼 나무꾼 (32라운드: 실시간 액션 2탄) — 되돌아오는 도끼 × 가리키기 × 콤보.
 * 기준 9(손이 하는 일은 하나): 화면을 누른 채 끌면 도끼가 날아갈 곡선이 보이고(손가락 자리 = 도끼가 돌아서는 곳),
 *   떼면 도끼가 빙글빙글 날아갔다 손으로 되돌아온다. 키보드는 화살표로 커서 + 스페이스.
 * 규칙(결정적, 3줄): 도끼는 손가락 쪽으로 곧게 나가 돌아설 때 안쪽(가운데 쪽)으로 크게 휘어 돌아온다 — 옆으로 던질수록 크게 휜다.
 *   갈 때 한 번, 올 때 한 번 벤다. 오갈 때 둘 다 베고 돌아오면 '탁!' 받기 연속 +1 — 도끼가 커지고 빨라진다. 한쪽만 베면 연속이 끊긴다.
 *   도끼가 날아가 있는 동안엔 새로 못 던진다(떼어 두면 돌아오자마자 던진다). 괴물이 오두막에 닿으면 문 판자 -1, 다 깨지면 하트 -1(그 판 다시).
 * 와우: 첫 던지기에 도끼가 빙글빙글 날아가 그루터기 셋을 '퍽퍽퍽' 베고 손으로 돌아와 '탁!' — 나무 조각과 나뭇잎이 흩날린다.
 * 판 7개: 목표 = 오두막 지키기(모든 괴물 베기). 별 = 판마다 하나씩 늘어나는 쉬운 한 줄.
 * 펼쳐짐(하는 일이 바뀐다): 1판 그루터기(줄 서서 걸어옴) → 2판 덩굴(옆에서 꼬불꼬불 빠르게 — 휘어 돌아오는 길로 쓸기)
 *   → 3판 바위(도끼가 튕겨 꺾임 — 바위에 튕겨 옆줄 베기) → 4판 껍질 괴물(한 번 베면 껍질만 — 오갈 때 두 번 맞히기)
 *   → 5판 박쥐 떼(하늘을 가로질러 줄지어 옴 — 앞질러 던지기) → 6판 전나무(베면 도끼가 가던 쪽으로 쓰러져 괴물을 덮침 — 갈 때·올 때 어느 쪽에서 벨지)
 *   → 7판 고목 대장(받기 연속이 높을수록 세게 — 연속 지키기 vs 급한 졸개).
 * 웃음: 오두막에 부딪힌 괴물은 지붕에 '쾅' 박치기하고 데굴데굴, 껍질이 벗겨진 괴물은 얼굴이 빨개져 허둥지둥 달린다.
 *   지붕 위 다람쥐가 큰 순간마다 펄쩍 뛰고, 오두막이 맞으면 눈을 가린다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.52;
/** 손(도끼가 떠나고 돌아오는 곳, 땅 좌표) */
const HX = 0.5, HY = 1.05;
/** 겨눌 수 있는 곳 */
const AX0 = 0.05, AX1 = 0.95, AY0 = 0.38, AY1 = 0.99;
/** 괴물이 나오는 숲 가장자리 · 오두막 줄(여기 닿으면 쾅) · 아래 띠 */
const SPAWN_Y = 0.385, CY = 1.05, HZ = 0.39, GB = 1.31;
/** 도끼: 크기 · 속도 (받기 연속 단계마다 커지고 빨라진다) */
const LV_MAX = 5, AXE_R = 0.042, AXE_RL = 0.009, VMAX = 0.026, VMAX_L = 0.006;
/** 휘어 돌아오는 정도 (안쪽) · 나갈 때 살짝 바깥 */
const KB = 1.0, KO = 0.14;
/** 나무: 쓰러지는 시간 · 통나무 길이 · 폭 · 다시 자라기 */
const FALL = 18, LOG_L = 0.42, LOG_W = 0.058, REGROW = 480, TREE_R = 0.026;
const ROCK_PAD = 0.012, BANG_T = 26, BARE_SP = 1.8;
const RESULT_OK = 180, RESULT_FAIL = 150, CARD_T = 150, NEWS_T = 150;
const STAR_PTS = 150, CLEAR_PTS = 100, WIN_PTS = 300;

type K = 'stump' | 'vine' | 'bark' | 'bat' | 'boss';
const RAD: Record<K, number> = { stump: 0.036, vine: 0.032, bark: 0.042, bat: 0.03, boss: 0.1 };
const SPD: Record<K, number> = { stump: 0.0012, vine: 0.0021, bark: 0.0011, bat: 0.0042, boss: 0.00028 };
const KIND_NAME: Record<K, string> = { stump: '그루터기', vine: '덩굴', bark: '껍질 괴물', bat: '박쥐', boss: '고목 대장' };
/** 대장: 체력 · 껍질이 다시 자라는 시간(틱) — 껍질을 벗긴 뒤 이 안에 다시 맞혀야 아파한다 */
const BOSS_HP = 15, BOSS_ARMOR = 70;
/** 대장에게 들어가는 힘 = 1 + 도끼 단계 (받기 연속을 지킬수록 세다) */
const bossDmg = (lv: number) => 1 + lv;

type StarK = 'multi' | 'combo' | 'bounce' | 'clean' | 'bats' | 'crush' | 'noleak' | 'bossk';
interface Star { k: StarK; n: number; label: string }
/** [종류, 자리(위에서 오면 x · 옆에서 오면 y), 늦게 나오기(틱), 들어오는 쪽(0 숲 · 1 왼쪽 · 2 오른쪽)] */
type Spawn = [K, number, number, number];
interface Wave { need: number; wait: number; foes: Spawn[] }
interface StageDef {
  key: string; name: string; place: number; news: string; goal: string; hint: string; boards: number; speed: number;
  rocks?: number[][]; trees?: number[][]; pre?: number[][]; waves: Wave[]; stars: Star[];
}
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
const row = (k: K, xs: number[], d = 0, step = 0, side = 0): Spawn[] => xs.map((x, i) => [k, x, d + i * step, side]);
const col = (k: K, x: number, n: number, d = 0, gap = 40): Spawn[] => [...Array(n).keys()].map((i) => [k, x, d + i * gap, 0]);

/** 판 7개. 좌표는 뒤집기 전 — 2판부터 판마다(다시 할 때도) 시드로 좌우를 뒤집는다 */
export const STAGES: StageDef[] = [
  {
    key: 'stump', name: '오두막 앞마당', place: 0, news: '', goal: '오두막 지키기', boards: 5, speed: 0.75,
    hint: '도끼는 갈 때 한 번, 올 때 한 번 베요',
    pre: [[0.5, 0.6], [0.5, 0.71], [0.5, 0.82]],
    waves: [
      { need: 0, wait: 1e9, foes: [] },
      { need: 1, wait: 420, foes: row('stump', [0.3, 0.43, 0.57, 0.7]) },
      { need: 1, wait: 480, foes: [...col('stump', 0.28, 3, 0, 45), ...col('stump', 0.72, 3, 20, 45)] },
      { need: 1, wait: 480, foes: [['stump', 0.5, 0, 0], ['stump', 0.38, 25, 0], ['stump', 0.62, 25, 0], ['stump', 0.26, 50, 0], ['stump', 0.74, 50, 0]] },
    ],
    stars: [],
  },
  {
    key: 'vine', name: '덩굴 오솔길', place: 0, news: '덩굴 — 옆에서 꼬불꼬불 빠르게 와요', goal: '오두막 지키기', boards: 5, speed: 0.64,
    hint: '옆으로 던질수록 크게 휘어 돌아와요',
    waves: [
      { need: 0, wait: 1e9, foes: row('stump', [0.3, 0.43, 0.57, 0.7]) },
      { need: 2, wait: 420, foes: row('vine', [0.5, 0.5, 0.5], 0, 30, 1) },
      { need: 2, wait: 420, foes: [...row('vine', [0.5, 0.5, 0.5], 0, 30, 2), ...row('stump', [0.36, 0.64], 30, 0)] },
      { need: 1, wait: 420, foes: [...col('stump', 0.3, 3, 0, 40), ...col('stump', 0.7, 3, 0, 40)] },
    ],
    stars: [S('multi', 3, '한 번 던져 셋 베기')],
  },
  {
    key: 'rock', name: '이끼 바위 언덕', place: 1, news: '바위 — 도끼가 튕겨 꺾여요', goal: '오두막 지키기', boards: 3, speed: 1.1,
    hint: '바위에 맞히면 도끼가 꺾여 옆줄을 베요',
    rocks: [[0.36, 0.7, 0.05], [0.64, 0.7, 0.05], [0.5, 0.52, 0.045]],
    waves: [
      { need: 0, wait: 1e9, foes: [...col('stump', 0.12, 3, 0, 40), ...col('stump', 0.88, 3, 20, 40)] },
      { need: 2, wait: 300, foes: [...row('vine', [0.5, 0.5, 0.5], 0, 28, 1), ...row('stump', [0.2, 0.8], 40)] },
      { need: 2, wait: 300, foes: [...col('stump', 0.15, 3, 0, 38), ...row('vine', [0.55, 0.55, 0.55], 30, 28, 2)] },
      { need: 2, wait: 300, foes: [...row('stump', [0.14, 0.26, 0.74, 0.86]), ...col('stump', 0.86, 2, 60, 40)] },
      { need: 1, wait: 300, foes: [...row('vine', [0.5, 0.5, 0.5], 0, 28, 1), ...row('vine', [0.58, 0.58, 0.58], 20, 28, 2), ...col('stump', 0.12, 2, 40, 40)] },
    ],
    stars: [S('bounce', 3, '바위에 튕겨 셋 베기'), S('combo', 3, '도끼 세 번 연속 받기')],
  },
  {
    key: 'bark', name: '껍질 숲', place: 1, news: '껍질 괴물 — 처음 베면 껍질만 벗겨져요', goal: '오두막 지키기', boards: 3, speed: 1.15,
    hint: '갈 때 껍질, 올 때 몸통 — 한 번 던져 두 번 맞혀요',
    waves: [
      { need: 0, wait: 1e9, foes: [...row('bark', [0.32, 0.5, 0.68]), ...row('stump', [0.2, 0.8], 40)] },
      { need: 2, wait: 260, foes: [...col('bark', 0.3, 3, 0, 50), ...row('vine', [0.55, 0.55], 40, 30, 2)] },
      { need: 2, wait: 260, foes: [...col('bark', 0.7, 2, 0, 50), ...col('bark', 0.42, 2, 25, 50), ...row('stump', [0.15, 0.85], 60)] },
      { need: 2, wait: 260, foes: [...row('bark', [0.26, 0.42, 0.58, 0.74]), ...row('vine', [0.5, 0.5, 0.5], 50, 28, 1)] },
      { need: 2, wait: 260, foes: [...col('bark', 0.5, 3, 0, 45), ...row('stump', [0.2, 0.32, 0.68, 0.8], 30)] },
      { need: 1, wait: 260, foes: [...row('bark', [0.15, 0.85]), ...row('vine', [0.6, 0.6, 0.6], 0, 28, 2), ...col('bark', 0.36, 2, 40, 45)] },
    ],
    stars: [S('clean', 3, '껍질 괴물 셋을 한 번에 끝내기'), S('combo', 7, '도끼 일곱 번 연속 받기')],
  },
  {
    key: 'bat', name: '박쥐 골짜기', place: 2, news: '박쥐 떼 — 하늘을 가로질러 줄지어 와요', goal: '오두막 지키기', boards: 3, speed: 1.15,
    hint: '박쥐가 갈 길 앞에 미리 던져요',
    waves: [
      { need: 0, wait: 1e9, foes: [...row('stump', [0.3, 0.43, 0.57, 0.7]), ...row('bat', [0.5, 0.5, 0.5, 0.5, 0.5], 60, 11, 1)] },
      { need: 2, wait: 320, foes: [...row('bat', [0.46, 0.46, 0.46, 0.46, 0.46], 0, 11, 2), ...col('bark', 0.3, 2, 30, 50)] },
      { need: 2, wait: 320, foes: [...row('bat', [0.52, 0.52, 0.52, 0.52], 0, 11, 1), ...row('vine', [0.62, 0.62, 0.62], 20, 28, 2), ...row('stump', [0.4, 0.6], 40)] },
      { need: 2, wait: 320, foes: [...row('bat', [0.44, 0.44, 0.44, 0.44, 0.44], 0, 11, 2), ...row('bat', [0.56, 0.56, 0.56, 0.56], 90, 11, 1)] },
      { need: 1, wait: 320, foes: [...row('stump', [0.2, 0.35, 0.5, 0.65, 0.8]), ...row('bat', [0.5, 0.5, 0.5, 0.5, 0.5], 40, 11, 1)] },
    ],
    stars: [S('bats', 4, '박쥐 넷을 한 번에 베기'), S('combo', 5, '도끼 다섯 번 연속 받기')],
  },
  {
    key: 'tree', name: '전나무 숲', place: 2, news: '전나무 — 베면 도끼가 가던 쪽으로 쓰러져요', goal: '오두막 지키기', boards: 3, speed: 1.15,
    hint: '올 때 베면 오두막 쪽으로 쓰러져 괴물을 덮쳐요',
    trees: [[0.17, 0.56], [0.5, 0.5], [0.83, 0.56], [0.33, 0.78], [0.67, 0.78]],
    waves: [
      { need: 0, wait: 1e9, foes: [...row('stump', [0.26, 0.38, 0.62, 0.74]), ...row('stump', [0.3, 0.7], 50)] },
      { need: 2, wait: 320, foes: [...col('bark', 0.24, 2, 0, 45), ...col('stump', 0.76, 3, 0, 40)] },
      { need: 2, wait: 320, foes: [...row('stump', [0.2, 0.33, 0.46]), ...row('vine', [0.6, 0.6, 0.6], 30, 28, 2)] },
      { need: 2, wait: 320, foes: [...row('stump', [0.54, 0.67, 0.8]), ...row('bat', [0.5, 0.5, 0.5, 0.5], 30, 11, 1)] },
      { need: 1, wait: 320, foes: row('stump', [0.15, 0.29, 0.43, 0.57, 0.71, 0.85]) },
    ],
    stars: [S('crush', 3, '쓰러진 나무로 셋 덮치기'), S('multi', 4, '한 번 던져 넷 베기')],
  },
  {
    key: 'boss', name: '고목 대장', place: 3, news: '고목 대장 — 한 번 던져 두 번 맞혀야 아파해요', goal: '대장 쓰러뜨리기', boards: 3, speed: 1.2,
    hint: '받기 연속을 쌓은 뒤 대장을 오갈 때 두 번 — 크게 들어가요',
    waves: [
      { need: 0, wait: 1e9, foes: [['boss', 0.5, 0, 0], ...row('stump', [0.3, 0.7], 40)] },
      { need: 2, wait: 420, foes: [...row('bat', [0.5, 0.5, 0.5, 0.5], 0, 11, 1), ...row('vine', [0.6, 0.6], 30, 28, 2)] },
      { need: 2, wait: 420, foes: [...row('bark', [0.25, 0.75]), ...row('bat', [0.46, 0.46, 0.46, 0.46], 40, 11, 2)] },
      { need: 2, wait: 420, foes: [...row('vine', [0.5, 0.5, 0.5], 0, 28, 1), ...row('vine', [0.56, 0.56, 0.56], 20, 28, 2)] },
      { need: 2, wait: 420, foes: [...row('stump', [0.2, 0.35, 0.65, 0.8]), ...row('bat', [0.5, 0.5, 0.5, 0.5], 30, 11, 1)] },
      { need: 2, wait: 420, foes: [...row('bark', [0.3, 0.5, 0.7]), ...row('vine', [0.55, 0.55, 0.55], 20, 28, 2)] },
    ],
    stars: [S('bossk', 3, '대장을 세 번 만에 쓰러뜨리기'), S('noleak', 0, '판자 하나도 안 깨지기')],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Foe {
  id: number; k: K; hp: number;
  /** 걸어갈 길(꺾은선) · 속도 · 이 길의 0 지점을 지난 세계 시각 · 꼬불꼬불(폭·잦기·위상) */
  wp: number[]; len: number; sp: number; t0: number; wig: number; wf: number; ph: number;
  x: number; y: number; ux: number; uy: number;
  st: 0 | 1; stT: number; inId: number; outId: number; backId: number; bare: boolean; stripId: number; pre: boolean;
  summonT: number; seed: number; born: number; hitT: number; armT: number;
}
interface Rock { x: number; y: number; r: number }
interface Tree { x: number; y: number; st: 0 | 1 | 2; dx: number; dy: number; ft: number; by: number; chain: number; t: number }
interface Flight { xs: number[]; ys: number[]; n: number; turn: number; bounce: number[] }
interface Axe { fl: Flight; i: number; id: number; lv: number; r: number; outN: number; backN: number; kills: number; bats: number; spin: number; bounceK: number; outIds: number[]; backIds: number[]; cleanN: number }
interface Cut { k: K; x: number; y: number; a: number; t: number; seed: number; how: 0 | 1 | 2; bare: boolean }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }

export interface AxeState {
  rng: Rng; seed: number; t: number; wt: number; stT: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  boards: number; down: boolean; lock: boolean; aim: { x: number; y: number } | null; queue: { x: number; y: number } | null;
  axe: Axe | null; throws: number; combo: number; comboBest: number; freeze: number; slowT: number;
  foes: Foe[]; rocks: Rock[]; trees: Tree[]; nid: number; wave: number; waveT: number; flip: boolean;
  best: number; bounceK: number; clean: number; batBest: number; crushBest: number; leaks: number; bossT: number; bossHits: number; cleanBest: number; chainN: Record<number, number>;
  throwKills: Record<number, number>; firstThrow: number; firstBig: number; firstPress: number; catches: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { x: number; y: number; t: number; label: string; r: number } | null;
  events: Ev[]; cuts: Cut[];
  // 연출용 (시뮬레이션 결과와 무관)
  mood: number; moodT: number; cam: number; trail: number[]; catchT: number; throwT: number; bangT: number; squirT: number; lastLv: number;
}

const ev = (s: AxeState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: AxeState, key: string, text: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lvOf = (combo: number) => Math.min(LV_MAX, combo);
const axeR = (lv: number) => AXE_R + AXE_RL * lv;

// ───────────────────────────── 도끼 길 ─────────────────────────────

/** 점과 선분 사이 거리 */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const u = L2 > 1e-12 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
  return Math.hypot(px - ax - dx * u, py - ay - dy * u);
}

/**
 * (fx,fy)에서 손으로 돌아오는 길: 처음엔 온 길을 되짚다가(ix,iy = 들어온 방향) 안쪽(가운데 쪽)으로 크게 휘어 손으로.
 * 옆으로 멀수록 크게 휜다. 3차 베지어 [F, C2a, C2b, H]의 조절점 넷을 돌려준다.
 */
function backCtrl(fx: number, fy: number, ix: number, iy: number) {
  const dx = fx - HX, dy = fy - HY, L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L;
  const sg = clamp(dx / 0.3, -1, 1), rx = -uy, ry = ux;
  return [fx - ix * 0.32 * L, fy - iy * 0.32 * L, HX + dx * 0.5 - rx * sg * KB * L, HY + dy * 0.5 - ry * sg * KB * L];
}
function cubicPts(out: number[], ax: number, ay: number, c: number[], N: number) {
  const [bx, by, cx, cy] = c;
  for (let i = 1; i <= N; i++) {
    const t = i / N, a = (1 - t) ** 3, b = 3 * (1 - t) * (1 - t) * t, d = 3 * (1 - t) * t * t, e = t * t * t;
    out.push(a * ax + b * bx + d * cx + e * HX, a * ay + b * by + d * cy + e * HY);
  }
}
function quadPts(out: number[], ax: number, ay: number, cx: number, cy: number, bx: number, by: number, N: number) {
  for (let i = 1; i <= N; i++) {
    const t = i / N, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    out.push(a * ax + b * cx + c * bx, a * ay + b * cy + c * by);
  }
}
function rockHit(rocks: Rock[], x: number, y: number) {
  for (const r of rocks) if (Math.hypot(x - r.x, y - r.y) < r.r + ROCK_PAD) return r;
  return null;
}
/** 튕긴 뒤 날아가는 짧은 길: 판 밖으로 나가지 않게 줄인다 */
function bounceLeg(out: number[], qx: number, qy: number, rx: number, ry: number, len: number, rocks: Rock[]) {
  let ex = qx, ey = qy;
  const N = Math.max(4, Math.round(len / 0.012));
  for (let i = 1; i <= N; i++) {
    const x = qx + (rx * len * i) / N, y = qy + (ry * len * i) / N;
    if (x < 0.03 || x > 0.97 || y < 0.36 || y > 1.02) break;
    if (i > 2 && rockHit(rocks, x, y)) break;
    out.push(x, y);
    ex = x;
    ey = y;
  }
  return [ex, ey];
}
function reflect(dx: number, dy: number, nx: number, ny: number) {
  const d = dx * nx + dy * ny;
  return [dx - 2 * d * nx, dy - 2 * d * ny];
}

/**
 * 던지기 한 번의 길을 틱마다의 자리로 만든다(미리 보기·봇·실제가 모두 이 함수 하나).
 * 나갈 때: 손 → 손가락 자리(살짝 바깥으로 휨) · 돌아올 때: 안쪽으로 크게 휘어 손으로.
 * 바위에 닿으면 반사되어 짧게 튕겨 나간 뒤 그 자리에서 손으로 휘어 돌아온다(최대 두 번).
 */
function buildFlight(rocks: Rock[], px: number, py: number, lv: number): Flight {
  px = clamp(px, AX0, AX1);
  py = clamp(py, AY0, AY1);
  let dx = px - HX, dy = py - HY, L = Math.hypot(dx, dy);
  if (L < 0.12) {
    const k = 0.12 / (L || 1e-6);
    (dx = L > 1e-6 ? dx * k : 0), (dy = L > 1e-6 ? dy * k : -0.12), (L = 0.12);
    (px = HX + dx), (py = HY + dy);
  }
  const ux = dx / L, uy = dy / L, rx = -uy, ry = ux, sg = clamp(dx / 0.3, -1, 1);
  const c1x = HX + dx * 0.5 + rx * sg * KO * L, c1y = HY + dy * 0.5 + ry * sg * KO * L;
  const dense: number[] = [HX, HY];
  const N = 40;
  let turnAt = -1, bounces = 0, ex = px, ey = py, inx = px - c1x, iny = py - c1y;
  const bIdx: number[] = [];
  // 나가는 길
  quadPts(dense, HX, HY, c1x, c1y, px, py, N);
  for (let i = 2; i < dense.length; i += 2) {
    const r = rockHit(rocks, dense[i], dense[i + 1]);
    if (!r) continue;
    const qx = dense[i - 2], qy = dense[i - 1], ix = dense[i] - qx, iy = dense[i + 1] - qy, il = Math.hypot(ix, iy) || 1e-6;
    const nx = (qx - r.x) / (Math.hypot(qx - r.x, qy - r.y) || 1), ny = (qy - r.y) / (Math.hypot(qx - r.x, qy - r.y) || 1);
    const [bx, by] = reflect(ix / il, iy / il, nx, ny);
    let rem = 0;
    for (let j = i; j + 2 < dense.length; j += 2) rem += Math.hypot(dense[j + 2] - dense[j], dense[j + 3] - dense[j + 1]);
    dense.length = i;
    bIdx.push(i / 2 - 1);
    [ex, ey] = bounceLeg(dense, qx, qy, bx, by, clamp(0.12 + rem * 0.6, 0.14, 0.34), rocks);
    (inx = bx), (iny = by);
    bounces++;
    break;
  }
  if (!bounces) (ex = px), (ey = py);
  turnAt = dense.length / 2 - 1;
  // 돌아오는 길
  const il0 = Math.hypot(inx, iny) || 1e-6;
  const back: number[] = [];
  cubicPts(back, ex, ey, backCtrl(ex, ey, inx / il0, iny / il0), Math.round(N * 1.3));
  let sx = ex, sy = ey;
  for (let i = 0; i < back.length; i += 2) {
    const r = bounces < 2 && i >= 4 ? rockHit(rocks, back[i], back[i + 1]) : null;
    if (r) {
      const qx = i ? back[i - 2] : sx, qy = i ? back[i - 1] : sy, ix = back[i] - qx, iy = back[i + 1] - qy, il = Math.hypot(ix, iy) || 1e-6;
      const dd = Math.hypot(qx - r.x, qy - r.y) || 1;
      const [bx, by] = reflect(ix / il, iy / il, (qx - r.x) / dd, (qy - r.y) / dd);
      bIdx.push(dense.length / 2 - 1);
      const [fx, fy] = bounceLeg(dense, qx, qy, bx, by, 0.14, rocks);
      bounces++;
      cubicPts(dense, fx, fy, backCtrl(fx, fy, bx, by), Math.round(N * 0.9));
      sx = fx;
      sy = fy;
      break;
    }
    dense.push(back[i], back[i + 1]);
  }
  // 틱마다 자리: 돌아서는 곳 근처에서 느려진다(빙글 멈칫)
  const M = dense.length / 2, cum = new Float64Array(M);
  for (let i = 1; i < M; i++) cum[i] = cum[i - 1] + Math.hypot(dense[i * 2] - dense[i * 2 - 2], dense[i * 2 + 1] - dense[i * 2 - 1]);
  const total = cum[M - 1], La = cum[turnAt], vmax = VMAX + VMAX_L * lv;
  const xs: number[] = [HX], ys: number[] = [HY];
  let d = 0, j = 0, turn = -1;
  const bounce: number[] = [];
  let bk = 0;
  while (d < total) {
    const g = clamp(Math.abs(d - La) / 0.2, 0, 1), sm = g * g * (3 - 2 * g);
    d = Math.min(total, d + vmax * (0.3 + 0.7 * sm));
    while (j < M - 2 && cum[j + 1] < d) j++;
    const seg = cum[j + 1] - cum[j] || 1e-9, u = clamp((d - cum[j]) / seg, 0, 1);
    xs.push(dense[j * 2] + (dense[j * 2 + 2] - dense[j * 2]) * u);
    ys.push(dense[j * 2 + 1] + (dense[j * 2 + 3] - dense[j * 2 + 1]) * u);
    if (turn < 0 && d >= La) turn = xs.length - 1;
    while (bk < bIdx.length && cum[bIdx[bk]] <= d) bounce.push(xs.length - 1), bk++;
  }
  if (turn < 0) turn = xs.length - 1;
  return { xs, ys, n: xs.length, turn, bounce };
}

const flightCache = new WeakMap<object, Map<string, Flight>>();
function flightFor(s: AxeState, px: number, py: number, lv: number) {
  let m = flightCache.get(s.rocks);
  if (!m) flightCache.set(s.rocks, (m = new Map()));
  const key = `${lv}:${Math.round(clamp(px, AX0, AX1) * 400)}:${Math.round(clamp(py, AY0, AY1) * 400)}`;
  let f = m.get(key);
  if (!f) {
    f = buildFlight(s.rocks, Math.round(clamp(px, AX0, AX1) * 400) / 400, Math.round(clamp(py, AY0, AY1) * 400) / 400, lv);
    if (m.size > 4000) m.clear();
    m.set(key, f);
  }
  return f;
}

// ───────────────────────────── 괴물 ─────────────────────────────

const P0 = { x: 0, y: 0, ux: 0, uy: 1, end: false };
function pathAt(wp: number[], d: number) {
  for (let i = 0; i + 3 < wp.length; i += 2) {
    const dx = wp[i + 2] - wp[i], dy = wp[i + 3] - wp[i + 1], L = Math.hypot(dx, dy) || 1e-6;
    const last = i + 4 >= wp.length;
    if (d <= L || last) {
      const u = Math.min(1, Math.max(0, d / L));
      P0.x = wp[i] + dx * u;
      P0.y = wp[i + 1] + dy * u;
      P0.ux = dx / L;
      P0.uy = dy / L;
      P0.end = last && d >= L;
      return P0;
    }
    d -= L;
  }
  P0.x = wp[0];
  P0.y = wp[1];
  P0.end = true;
  return P0;
}
/** 세계 시각 T에서 괴물이 있을 자리 (봇의 내다보기도 이 함수) */
function foeAt(f: Foe, T: number) {
  const d = Math.max(0, T - f.t0) * f.sp, p = pathAt(f.wp, d);
  if (f.wig) {
    const fade = Math.min(1, d / 0.06, Math.max(0, f.len - d) / 0.1), o = f.wig * Math.sin(d * f.wf + f.ph) * fade;
    p.x += -p.uy * o;
    p.y += p.ux * o;
  }
  p.end = d >= f.len;
  return p;
}
const remain = (f: Foe, T: number) => f.len - Math.max(0, T - f.t0) * f.sp;
/** 아직 숲에서 안 나옴 (처음부터 서 있는 괴물은 늘 보인다) */
const hidden = (f: Foe, T: number) => T < f.t0 && !f.pre;

/** 괴물이 노리는 오두막 창문 자리 */
const winX = (x: number) => (x < 0.5 ? clamp(0.31 + (x - 0.3) * 0.25, 0.22, 0.4) : clamp(0.69 + (x - 0.7) * 0.25, 0.6, 0.78));

function pathLen(wp: number[]) {
  let L = 0;
  for (let i = 0; i + 3 < wp.length; i += 2) L += Math.hypot(wp[i + 2] - wp[i], wp[i + 3] - wp[i + 1]);
  return L;
}
/** 바위를 돌아가는 길 */
function detour(s: AxeState, wp: number[]) {
  for (let pass = 0; pass < 2; pass++)
    for (const r of s.rocks)
      for (let i = 0; i + 3 < wp.length; i += 2) {
        const ax = wp[i], ay = wp[i + 1], bx = wp[i + 2], by = wp[i + 3];
        if (segDist(r.x, r.y, ax, ay, bx, by) > r.r + 0.05) continue;
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L;
        const side = (r.x - ax) * nx + (r.y - ay) * ny > 0 ? -1 : 1;
        wp.splice(i + 2, 0, r.x + nx * side * (r.r + 0.075), r.y + ny * side * (r.r + 0.075));
        break;
      }
  return wp;
}

function addFoe(s: AxeState, k: K, a: number, delay: number, side: number, mul: number) {
  const fl = (x: number) => (s.flip ? 1 - x : x);
  const sd = side === 1 ? (s.flip ? 2 : 1) : side === 2 ? (s.flip ? 1 : 2) : 0;
  let wp: number[];
  const j = () => (s.stage ? (s.rng() - 0.5) * 0.03 : 0);
  if (k === 'boss') wp = [0.5, 0.43, 0.5, CY - 0.03];
  else if (k === 'bat') {
    const y = clamp(a + j(), 0.42, 0.7), L = sd === 1;
    wp = L ? [-0.07, y, 0.84, y + 0.08, 0.68, CY] : [1.07, y, 0.16, y + 0.08, 0.32, CY];
  } else if (sd) {
    const y = clamp(a + j(), 0.45, 0.72), L = sd === 1;
    wp = L ? [-0.05, y, 0.26, y + 0.2, 0.3, CY] : [1.05, y, 0.74, y + 0.2, 0.7, CY];
  } else {
    const x = clamp(fl(a) + j(), 0.08, 0.92);
    wp = detour(s, [x, SPAWN_Y, winX(x), CY]);
  }
  const sp = SPD[k] * mul;
  const f: Foe = {
    id: ++s.nid, k, hp: k === 'boss' ? BOSS_HP : k === 'bark' ? 2 : 1, wp, len: pathLen(wp), sp, t0: s.wt + delay,
    wig: k === 'vine' ? 0.035 : k === 'bat' ? 0.028 : 0, wf: k === 'vine' ? 26 : 13, ph: s.rng() * 6.28,
    x: wp[0], y: wp[1], ux: 0, uy: 1, st: 0, stT: 0, inId: -1, outId: -1, backId: -1, bare: false, stripId: -1, pre: false,
    summonT: s.wt + 200, seed: Math.floor(s.rng() * 1e6), born: s.t, hitT: -99, armT: -1,
  };
  s.foes.push(f);
  return f;
}

function spawnWave(s: AxeState) {
  const d = STAGES[s.stage], w = d.waves[s.wave];
  for (const [k, a, delay, side] of w.foes) addFoe(s, k, a, delay, side, d.speed);
  s.wave++;
  s.waveT = 0;
}

function newStage(s: AxeState) {
  const d = STAGES[s.stage];
  s.flip = s.stage > 0 && s.rng() < 0.5;
  const F = (x: number) => (s.flip ? 1 - x : x);
  s.boards = d.boards;
  s.foes = [];
  s.rocks = (d.rocks ?? []).map(([x, y, r]) => ({ x: F(x), y, r }));
  s.trees = (d.trees ?? []).map(([x, y]) => ({ x: F(x), y, st: 0, dx: 0, dy: 0, ft: 0, by: 0, chain: 0, t: -999 }));
  s.axe = null;
  s.queue = null;
  s.down = false;
  s.aim = null;
  s.combo = 0;
  s.comboBest = 0;
  s.freeze = 0;
  s.slowT = 0;
  s.wave = 0;
  s.waveT = 0;
  s.stT = 0;
  s.best = 0;
  s.bounceK = 0;
  s.clean = 0;
  s.batBest = 0;
  s.crushBest = 0;
  s.leaks = 0;
  s.bossT = -1;
  s.bossHits = 0;
  s.cleanBest = 0;
  s.chainN = {};
  s.throwKills = {};
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.cuts = [];
  if (see(s, d.key, '')) {
    if (d.rocks) s.spot = { x: F(d.rocks[2][0]), y: d.rocks[2][1], t: s.t, label: '바위', r: 0.09 };
    if (d.trees) s.spot = { x: F(d.trees[1][0]), y: d.trees[1][1] - 0.08, t: s.t, label: '전나무', r: 0.12 };
  }
  for (const [x, y] of d.pre ?? []) {
    const f = addFoe(s, 'stump', x, 0, 0, d.speed);
    f.wp = [x, y, winX(x), CY];
    f.len = pathLen(f.wp);
    f.t0 = s.wt + 70;
    f.pre = true;
  }
  spawnWave(s);
}

function starVal(s: AxeState, st: Star) {
  switch (st.k) {
    case 'multi': return s.best;
    case 'combo': return s.comboBest;
    case 'bounce': return s.bounceK;
    case 'clean': return s.clean;
    case 'bats': return s.batBest;
    case 'crush': return s.crushBest;
    case 'noleak': return s.leaks;
    case 'bossk': return s.bossHits;
  }
}
const starMet = (s: AxeState, st: Star) => (st.k === 'noleak' ? s.leaks === 0 : st.k === 'bossk' ? s.bossT >= 0 && s.bossHits <= st.n : starVal(s, st) >= st.n);

function endStage(s: AxeState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  s.aim = null;
  s.queue = null;
  if (s.axe) ev(s, 'catch', HX, HY, 0, 'end');
  s.axe = null;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, ...d.stars.map((q) => starMet(s, q))];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += CLEAR_PTS + s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 6;
    s.moodT = 999;
    s.squirT = s.t;
    ev(s, 'clear', 0.5, 0.8);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 5;
    s.moodT = 999;
    ev(s, 'fail', HX, HY, 0, why);
  }
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────

function killFoe(s: AxeState, f: Foe, how: 0 | 1 | 2, a: number, throwId: number) {
  const i = s.foes.indexOf(f);
  if (i >= 0) s.foes.splice(i, 1);
  const n = (s.throwKills[throwId] = (s.throwKills[throwId] ?? 0) + 1);
  s.best = Math.max(s.best, n);
  s.pts += 10 * n;
  s.cuts.push({ k: f.k, x: f.x, y: f.y, a, t: s.t, seed: f.seed, how, bare: f.bare });
  if (s.cuts.length > 30) s.cuts.shift();
  if (n >= 3 && s.firstBig < 0) s.firstBig = s.t;
  return n;
}

function hitFoe(s: AxeState, f: Foe, leg: number, dx: number, dy: number) {
  const ax = s.axe!;
  f.hitT = s.t;
  if (leg) (f.backId = ax.id), ax.backN++, ax.backIds.push(f.id);
  else (f.outId = ax.id), ax.outN++, ax.outIds.push(f.id);
  const a = Math.atan2(dy, dx), after = ax.fl.bounce.length && ax.i >= ax.fl.bounce[0];
  if (f.k === 'boss') {
    if (s.wt >= f.armT) {
      // 껍질만 벗겨진다 — 다시 자라기 전에 또 맞혀야 아파한다
      f.armT = s.wt + BOSS_ARMOR;
      ev(s, 'bstrip', f.x, f.y);
      s.freeze = Math.max(s.freeze, 2);
      return;
    }
    f.armT = -1;
    const dmg = bossDmg(ax.lv);
    f.hp -= dmg;
    s.bossHits++;
    s.pts += 15 * dmg;
    // 뒤로 밀림
    const d = Math.max(0, s.wt - f.t0) * f.sp;
    f.t0 += Math.min(d, 0.035) / f.sp;
    ev(s, 'bosshit', f.x, f.y, dmg, String(Math.max(0, f.hp)));
    s.freeze = Math.max(s.freeze, 3);
    if (f.hp <= 0) {
      s.bossT = s.pt / 60;
      killFoe(s, f, 0, a, ax.id);
      ev(s, 'bossdown', f.x, f.y);
      for (const g of [...s.foes]) killFoe(s, g, 2, -Math.PI / 2, -1);
      s.slowT = 50;
    }
    return;
  }
  if (f.k === 'bark' && !f.bare) {
    f.bare = true;
    f.stripId = ax.id;
    f.hp = 1;
    // 껍질이 벗겨지면 빨개져서 허둥지둥 빨리 달린다
    const d = Math.max(0, s.wt - f.t0) * f.sp;
    f.sp *= BARE_SP;
    f.t0 = s.wt - d / f.sp;
    s.pts += 5;
    ev(s, 'strip', f.x, f.y);
    s.freeze = Math.max(s.freeze, 2);
    return;
  }
  if (f.k === 'bark' && f.stripId === ax.id) s.clean++, ax.cleanN++, (s.cleanBest = Math.max(s.cleanBest, ax.cleanN)), ev(s, 'clean', f.x, f.y, ax.cleanN);
  if (f.k === 'bat') ax.bats++, (s.batBest = Math.max(s.batBest, ax.bats));
  if (after) ax.bounceK++, s.bounceK++;
  ax.kills++;
  const n = killFoe(s, f, 0, a, ax.id);
  ev(s, 'cut', f.x, f.y, n, f.k);
  s.freeze = Math.max(s.freeze, n >= 3 ? 4 : 2);
  if (n >= 3) s.slowT = Math.max(s.slowT, 22);
}

function fell(s: AxeState, tr: Tree, dx: number, dy: number, chain: number) {
  const L = Math.hypot(dx, dy) || 1e-6;
  tr.st = 1;
  tr.dx = dx / L;
  tr.dy = dy / L;
  tr.ft = 0;
  tr.by = chain;
  tr.t = s.t;
  if (!s.chainN[chain]) s.chainN[chain] = 0;
  ev(s, 'chop', tr.x, tr.y);
}

function crush(s: AxeState, tr: Tree) {
  tr.st = 2;
  tr.ft = 0;
  const ex = tr.x + tr.dx * LOG_L, ey = tr.y + tr.dy * LOG_L * 0.8;
  let n = 0;
  for (const f of [...s.foes]) {
    if (f.st !== 0 || hidden(f, s.wt) || f.k === 'bat' || f.k === 'boss') continue;
    if (segDist(f.x, f.y, tr.x, tr.y, ex, ey) > LOG_W + RAD[f.k]) continue;
    n++;
    killFoe(s, f, 1, Math.atan2(tr.dy, tr.dx), tr.by);
  }
  s.chainN[tr.by] = (s.chainN[tr.by] ?? 0) + n;
  s.crushBest = Math.max(s.crushBest, s.chainN[tr.by]);
  ev(s, 'crush', (tr.x + ex) / 2, (tr.y + ey) / 2, n, String(s.chainN[tr.by]));
  if (n >= 3) s.slowT = Math.max(s.slowT, 26);
  // 도미노: 쓰러진 자리의 다른 나무도 같은 쪽으로
  for (const o of s.trees) if (o.st === 0 && segDist(o.x, o.y, tr.x, tr.y, ex, ey) < TREE_R + LOG_W) fell(s, o, tr.dx, tr.dy, tr.by);
}

function doThrow(s: AxeState, x: number, y: number) {
  const lv = lvOf(s.combo), fl = buildFlight(s.rocks, x, y, lv);
  s.axe = { fl, i: 0, id: ++s.throws, lv, r: axeR(lv), outN: 0, backN: 0, kills: 0, bats: 0, spin: 0, bounceK: 0, outIds: [], backIds: [], cleanN: 0 };
  if (s.firstThrow < 0) s.firstThrow = s.t;
  s.throwT = s.t;
  s.mood = 2;
  s.moodT = 24;
  ev(s, 'throw', HX, HY, lv);
}

/** 갈 때 하나, 올 때 또 하나 — 서로 다른 괴물을 베었나 (같은 괴물 두 번은 안 친다) */
const twoWay = (o: number[], b: number[]) => o.length > 0 && b.length > 0 && (o.length > 1 || b.length > 1 || o[0] !== b[0]);

function catchAxe(s: AxeState) {
  const a = s.axe!;
  s.axe = null;
  s.catches++;
  s.catchT = s.t;
  if (twoWay(a.outIds, a.backIds)) {
    s.combo++;
    s.comboBest = Math.max(s.comboBest, s.combo);
    s.pts += 5 * s.combo;
    s.mood = 3;
    s.moodT = 40;
    ev(s, 'catch', HX, HY, s.combo, 'good');
    if (s.combo === 3 && see(s, 'big', '받기 연속 3 — 도끼가 커지고 빨라졌어요!')) s.squirT = s.t;
    if (s.combo >= 3) s.squirT = s.t;
  } else {
    const lost = s.combo;
    s.combo = 0;
    s.mood = lost >= 2 ? 4 : 0;
    s.moodT = 30;
    ev(s, 'catch', HX, HY, lost, a.outN + a.backN > 0 ? 'one' : 'miss');
  }
  if (s.queue) {
    const q = s.queue;
    s.queue = null;
    doThrow(s, q.x, q.y);
  }
}

function moveAxe(s: AxeState, dt: number) {
  const a = s.axe!, fl = a.fl;
  const i0 = a.i, i1 = Math.min(fl.n - 1, i0 + dt);
  const at = (i: number) => {
    const k = Math.floor(i), u = i - k, k2 = Math.min(fl.n - 1, k + 1);
    return [fl.xs[k] + (fl.xs[k2] - fl.xs[k]) * u, fl.ys[k] + (fl.ys[k2] - fl.ys[k]) * u];
  };
  const [x0, y0] = at(i0), [x1, y1] = at(i1);
  a.i = i1;
  a.spin += dt * (0.55 + 0.06 * a.lv);
  for (const b of fl.bounce) if (b > i0 && b <= i1) ev(s, 'bounce', fl.xs[b], fl.ys[b]);
  const leg = i1 >= fl.turn ? 1 : 0, dx = x1 - x0, dy = y1 - y0;
  for (const f of [...s.foes]) {
    if (f.st !== 0 || hidden(f, s.wt)) continue;
    // 한 번 벤 괴물은 도끼가 몸을 빠져나갔다 다시 들어와야 또 벤다 (돌아서는 곳에 세워 두 번 베기 금지)
    if (segDist(f.x, f.y, x0, y0, x1, y1) > a.r + RAD[f.k]) {
      if (f.inId === a.id) f.inId = -1;
      continue;
    }
    if (f.inId === a.id) continue;
    f.inId = a.id;
    if (leg ? f.backId === a.id : f.outId === a.id) continue;
    hitFoe(s, f, leg, dx, dy);
    if (s.phase !== 'play' || !s.axe) return;
  }
  for (const tr of s.trees) {
    if (tr.st !== 0) continue;
    if (segDist(tr.x, tr.y, x0, y0, x1, y1) > a.r * 0.7 + TREE_R) continue;
    fell(s, tr, dx, dy, a.id);
  }
  if (i1 >= fl.n - 1) catchAxe(s);
}

function world(s: AxeState, dt: number) {
  if (dt <= 0) return;
  s.wt += dt;
  s.stT += dt;
  s.waveT += dt;
  const d = STAGES[s.stage];
  for (const f of [...s.foes]) {
    if (f.st === 1) {
      f.stT += dt;
      if (f.stT >= BANG_T) s.foes.splice(s.foes.indexOf(f), 1);
      continue;
    }
    const p = foeAt(f, s.wt);
    f.x = p.x;
    f.y = p.y;
    f.ux = p.ux;
    f.uy = p.uy;
    if (!hidden(f, s.wt) && f.k !== 'stump' && see(s, f.k, '')) s.spot = { x: f.x, y: f.y, t: s.t, label: KIND_NAME[f.k], r: f.k === 'boss' ? 0.2 : 0.09 };
    if (p.end) {
      // 오두막에 닿음: 쾅!
      f.st = 1;
      f.stT = 0;
      const hit = f.k === 'boss' ? s.boards : 1;
      s.boards = Math.max(0, s.boards - hit);
      s.leaks += hit;
      s.bangT = s.t;
      s.mood = 4;
      s.moodT = 50;
      ev(s, 'bang', f.x, f.y, s.boards, f.k);
      if (s.boards <= 0) return endStage(s, false, f.k === 'boss' ? '대장이 오두막에 닿았어요' : '오두막 문이 부서졌어요');
    }
    if (f.k === 'boss' && s.wt >= f.summonT && !hidden(f, s.wt)) {
      f.summonT = s.wt + 300;
      for (const sx of [-1, 1]) {
        const g = addFoe(s, 'stump', 0.5, 0, 0, d.speed * 1.1);
        g.wp = detour(s, [clamp(f.x + sx * 0.13, 0.1, 0.9), f.y + 0.02, winX(f.x + sx * 0.2), CY]);
        g.len = pathLen(g.wp);
        g.t0 = s.wt + 10;
      }
      ev(s, 'summon', f.x, f.y);
    }
  }
  if (s.axe) {
    moveAxe(s, dt);
    if (s.phase !== 'play') return;
  }
  for (const tr of s.trees) {
    if (tr.st === 1) {
      tr.ft += dt;
      if (tr.ft >= FALL) crush(s, tr);
    } else if (tr.st === 2) {
      tr.ft += dt;
      if (tr.ft >= REGROW) (tr.st = 0), (tr.t = s.t), ev(s, 'grow', tr.x, tr.y);
    }
  }
  if (s.wave < d.waves.length) {
    const w = d.waves[s.wave], alive = s.foes.filter((f) => f.st === 0).length;
    if ((alive === 0 && s.waveT >= 60) || (alive <= w.need && s.waveT >= 150) || s.waveT >= w.wait) spawnWave(s);
  } else if (!s.foes.length && !s.axe && !s.trees.some((t) => t.st === 1)) endStage(s, true, '');
}

function cosmetic(s: AxeState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  const want = s.aim ? (s.aim.x - 0.5) * 0.6 : s.axe ? (s.axe.fl.xs[Math.floor(s.axe.i)] - 0.5) * 0.4 : 0;
  s.cam += (want - s.cam) * 0.05;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.cuts = s.cuts.filter((c) => s.t - c.t < 70);
  if (s.axe) {
    const k = Math.floor(s.axe.i);
    s.trail.push(s.axe.fl.xs[k], s.axe.fl.ys[k]);
    if (s.trail.length > 24) s.trail.splice(0, 2);
  } else if (s.trail.length) s.trail.splice(0, 2);
  if (s.spot && s.t - s.spot.t > 110) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
  s.lastLv = lvOf(s.combo);
}

export const axeback: GameDef<AxeState> = {
  id: 'axeback',
  name: '되돌아오는 도끼 나무꾼',
  genes: ['axethrow', 'pointer', 'combo'],
  twist: '도끼가 손가락 쪽으로 곧게 나갔다가 안쪽으로 크게 휘어 돌아오며 오갈 때 두 번 베는데, 갈 때·올 때 둘 다 베고 돌아와야 받기 연속이 쌓여 도끼가 커지고 빨라진다 — 급한 괴물 하나를 먼저 칠지, 두 길에 다 걸리게 기다릴지',
  rules: [
    '누른 채 끌면 도끼 길이 보이고, 떼면 날아갔다 손으로 돌아와요. 갈 때 한 번, 올 때 한 번 베요.',
    '갈 때 하나, 올 때 또 하나 베고 돌아오면 받기 연속! 도끼가 커지고 빨라져요. 못 하면 끊겨요.',
    '괴물이 오두막에 닿으면 문 판자 -1, 다 깨지면 하트 -1(그 판 다시). 다 베면 다음 판!',
  ],
  controls: 'touch',
  hint: '누른 채 끌어 겨누고, 떼면 도끼가 날아갔다 돌아와요 / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '해 질 녘 숲속 오두막의 수염 꼬마 나무꾼 — 따뜻한 그림책 디오라마',
    mood: '노을빛 하늘 아래 전나무 실루엣이 겹겹이 서 있고, 반딧불이 깜빡이며 오두막 굴뚝에서 연기가 오른다. 도끼가 빙글빙글 날며 나무 괴물들을 베면 나무 조각과 나뭇잎이 흩날리고, 돌아온 도끼를 받으면 "탁!"',
    palette: { bg: '#2a1c3a', ink: '#fff3dc', muted: '#c9a98a', accent: '#ffcf5a', hot: '#ff6a4a', soft: '#4a3050' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, wt: 0, stT: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, won: false, dead: false, again: false, tries: 0,
      boards: 5, down: false, lock: false, aim: null, queue: null, axe: null, throws: 0, combo: 0, comboBest: 0, freeze: 0, slowT: 0,
      foes: [], rocks: [], trees: [], nid: 0, wave: 0, waveT: 0, flip: false,
      best: 0, bounceK: 0, clean: 0, batBest: 0, crushBest: 0, leaks: 0, bossT: -1, bossHits: 0, cleanBest: 0, chainN: {}, throwKills: {},
      firstThrow: -1, firstBig: -1, firstPress: -1, catches: 0,
      seen: new Set<string>(), newsQ: [], news: null, spot: null, events: [], cuts: [],
      mood: 0, moodT: 0, cam: 0, trail: [], catchT: -999, throwT: -999, bangT: -999, squirT: -999, lastLv: 0,
    } as unknown as AxeState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    if (s.phase === 'play') {
      if (p) {
        if (!s.down && !s.lock) {
          s.down = true;
          if (s.firstPress < 0) s.firstPress = s.t;
        }
        if (s.down) s.aim = { x: clamp(p.x, AX0, AX1), y: clamp(p.y * A, AY0, AY1) };
      } else {
        if (s.down && s.aim) {
          const far = Math.hypot(s.aim.x - HX, s.aim.y - HY) >= 0.1;
          if (!far) ev(s, 'cancel', HX, HY);
          else if (s.axe) s.queue = { ...s.aim };
          else doThrow(s, s.aim.x, s.aim.y);
        }
        s.down = false;
        s.lock = false;
        s.aim = null;
      }
    } else {
      s.down = false;
      s.aim = null;
      s.lock = !!p;
    }
    let dt = 1;
    if (s.freeze > 0) (s.freeze--, (dt = 0));
    else if (s.slowT > 0) (s.slowT--, (dt = 0.4));
    if (s.phase === 'result') {
      s.pt++;
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
    world(s, dt);
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
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });

interface Pred { f: Foe; xs: Float32Array; ys: Float32Array; vis: Uint8Array; ttc: number }
const HOR = 90;
/** 지금부터 HOR틱 동안 괴물마다 있을 자리 (던지기까지 delay틱) */
function predict(s: AxeState, delay: number): Pred[] {
  const out: Pred[] = [];
  for (const f of s.foes) {
    if (f.st !== 0) continue;
    const xs = new Float32Array(HOR), ys = new Float32Array(HOR), vis = new Uint8Array(HOR);
    for (let k = 0; k < HOR; k++) {
      const T = s.wt + delay + k, p = foeAt(f, T);
      xs[k] = p.x;
      ys[k] = p.y;
      vis[k] = !hidden(f, T) && !p.end ? 1 : 0;
    }
    out.push({ f, xs, ys, vis, ttc: Math.max(0, s.wt - f.t0 > 0 ? remain(f, s.wt) / f.sp : (f.t0 - s.wt) + f.len / f.sp) });
  }
  return out;
}

interface Sim { two: boolean; kills: number; outN: number; backN: number; strips: number; clean: number; bounceK: number; bats: number; crush: number; boss: number; urg: number; killed: Set<number>; n: number; trees: number }
/** 미리 보기 표시: 어느 괴물을 어느 길에서 (0 베기 · 1 껍질 · 2 대장 껍질 · 3 대장 아픔) */
interface Mark { id: number; leg: number; kind: number; n: number }
interface FallMark { x: number; y: number; dx: number; dy: number; n: number }
/** 던지기 한 번을 내다본다 (괴물은 지금 길대로 걷는다고 본다) */
function simThrow(s: AxeState, pr: Pred[], fl: Flight, lv: number, marks?: Mark[], fallsOut?: FallMark[]): Sim {
  const r = axeR(lv), res: Sim = { two: false, kills: 0, outN: 0, backN: 0, strips: 0, clean: 0, bounceK: 0, bats: 0, crush: 0, boss: 0, urg: 0, killed: new Set(), n: fl.n, trees: 0 };
  const hp = pr.map((p) => (p.f.k === 'boss' ? p.f.hp : p.f.k === 'bark' && !p.f.bare ? 2 : 1));
  const inside = pr.map(() => false), strippedNow = pr.map(() => false), outHit = pr.map(() => false), backHit = pr.map(() => false);
  const b0 = fl.bounce.length ? fl.bounce[0] : 1e9;
  const falls: { k: number; x: number; y: number; dx: number; dy: number }[] = [];
  /** 껍질이 벗겨진 뒤엔 빨리 달린다: [벗긴 틱, 그때 간 거리] */
  const boost: (number[] | null)[] = pr.map(() => null);
  const T0 = s.wt + 4, oIds: number[] = [], bIds: number[] = [];
  const arm = pr.map((p) => (p.f.k === 'boss' ? p.f.armT - T0 : 0));
  const treeUsed = new Set<number>();
  for (let k = 1; k < fl.n && k < HOR; k++) {
    const x0 = fl.xs[k - 1], y0 = fl.ys[k - 1], x1 = fl.xs[k], y1 = fl.ys[k], leg = k >= fl.turn ? 1 : 0;
    // 빠른 거르기: 이 틱의 도끼 근처만
    for (let j = 0; j < pr.length; j++) {
      if (hp[j] <= 0 || !pr[j].vis[k]) continue;
      const P = pr[j], rr2 = r + RAD[P.f.k];
      let fx = P.xs[k], fy = P.ys[k];
      const bo = boost[j];
      if (bo) {
        const q = pathAt(P.f.wp, bo[1] + (k - bo[0]) * P.f.sp * BARE_SP);
        if (q.end) continue;
        (fx = q.x), (fy = q.y);
      }
      if (Math.abs(fx - x1) > rr2 + 0.06 || Math.abs(fy - y1) > rr2 + 0.06 || segDist(fx, fy, x0, y0, x1, y1) > rr2) {
        inside[j] = false;
        continue;
      }
      if (inside[j]) continue;
      inside[j] = true;
      if (leg ? backHit[j] : outHit[j]) continue;
      if (leg) (backHit[j] = true), res.backN++, bIds.push(j);
      else (outHit[j] = true), res.outN++, oIds.push(j);
      if (P.f.k === 'boss') {
        if (k >= arm[j]) {
          arm[j] = k + BOSS_ARMOR;
          res.strips++;
          marks?.push({ id: P.f.id, leg, kind: 2, n: 0 });
          continue;
        }
        arm[j] = -1;
        const dm = bossDmg(lv);
        hp[j] -= dm;
        res.boss += dm;
        marks?.push({ id: P.f.id, leg, kind: 3, n: dm });
        continue;
      }
      if (P.f.k === 'bark' && hp[j] === 2) {
        hp[j] = 1;
        strippedNow[j] = true;
        boost[j] = [k, Math.max(0, T0 + k - P.f.t0) * P.f.sp];
        marks?.push({ id: P.f.id, leg, kind: 1, n: 0 });
        res.strips++;
        res.urg += urgency(P.ttc) * 0.4;
        continue;
      }
      hp[j] = 0;
      res.kills++;
      res.killed.add(P.f.id);
      res.urg += urgency(P.ttc);
      marks?.push({ id: P.f.id, leg, kind: 0, n: res.kills });
      if (strippedNow[j]) res.clean++;
      if (P.f.k === 'bat') res.bats++;
      if (k >= b0) res.bounceK++;
    }
    for (let t = 0; t < s.trees.length; t++) {
      const tr = s.trees[t];
      if (tr.st !== 0 || treeUsed.has(t)) continue;
      if (segDist(tr.x, tr.y, x0, y0, x1, y1) > r * 0.7 + TREE_R) continue;
      treeUsed.add(t);
      const L = Math.hypot(x1 - x0, y1 - y0) || 1e-6;
      falls.push({ k: k + FALL, x: tr.x, y: tr.y, dx: (x1 - x0) / L, dy: (y1 - y0) / L });
      res.trees++;
    }
  }
  res.two = twoWay(oIds, bIds);
  for (const fa of falls) {
    const kk = Math.min(HOR - 1, fa.k), ex = fa.x + fa.dx * LOG_L, ey = fa.y + fa.dy * LOG_L * 0.8, c0 = res.crush;
    for (let j = 0; j < pr.length; j++) {
      const P = pr[j];
      if (hp[j] <= 0 || P.f.k === 'bat' || P.f.k === 'boss' || !P.vis[kk]) continue;
      if (segDist(P.xs[kk], P.ys[kk], fa.x, fa.y, ex, ey) > LOG_W + RAD[P.f.k]) continue;
      hp[j] = 0;
      res.kills++;
      res.crush++;
      res.killed.add(P.f.id);
      res.urg += urgency(P.ttc);
      marks?.push({ id: P.f.id, leg: 2, kind: 0, n: res.kills });
    }
    fallsOut?.push({ x: fa.x, y: fa.y, dx: fa.dx, dy: fa.dy, n: res.crush - c0 });
  }
  return res;
}
const urgency = (ttc: number) => (ttc < 260 ? (260 - ttc) / 260 : 0);

function candidates(s: AxeState, pr: Pred[]) {
  const out: number[] = [];
  for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 5; gy++) out.push(0.08 + gx * 0.12, 0.42 + gy * 0.13);
  for (const P of pr) {
    for (const k of [12, 28]) {
      if (!P.vis[k]) continue;
      const x = P.xs[k], y = P.ys[k], dx = x - HX, dy = y - HY, L = Math.hypot(dx, dy) || 1e-6;
      out.push(x, y, x + (dx / L) * 0.1, y + (dy / L) * 0.1, x - (dy / L) * 0.09, y + (dx / L) * 0.09, x + (dy / L) * 0.09, y - (dx / L) * 0.09);
    }
  }
  for (const r of s.rocks) for (const o of [-0.035, 0, 0.035]) out.push(r.x + o, r.y + 0.02);
  for (const t of s.trees)
    if (t.st === 0) {
      out.push(t.x, t.y);
      for (let k = 0; k < 8; k++) for (const r of [0.12, 0.24]) out.push(t.x + Math.cos((k * Math.PI) / 4) * r, t.y + Math.sin((k * Math.PI) / 4) * r * 0.8);
    }
  return out;
}

interface Pick { x: number; y: number; v: number; sim: Sim }
function judge(s: AxeState, sim: Sim, objectives: boolean): number {
  const d = STAGES[s.stage];
  let v = sim.kills * 10 + sim.urg * 70 + sim.strips * 6 + sim.boss * 30;
  for (let n = 1; n <= sim.kills; n++) v += 4 * n;
  const both = sim.two;
  if (both) v += 30 + 14 * Math.min(s.combo, 6);
  else if (s.combo > 0) v -= 14 * Math.min(s.combo, 6) + 8;
  if (!sim.kills && !sim.strips && !sim.boss) v -= 40;
  if (objectives)
    for (const st of d.stars) {
      if (starMet(s, st)) continue;
      if (st.k === 'multi' && sim.kills >= st.n) v += 120;
      if (st.k === 'bounce') v += 45 * sim.bounceK;
      if (st.k === 'clean') v += 45 * sim.clean;
      if (st.k === 'bats') v += sim.bats >= st.n ? 160 : 8 * sim.bats;
      if (st.k === 'crush') v += sim.crush >= st.n ? 160 : 25 * sim.crush;
      if (st.k === 'combo' && both) v += 25;
      if (st.k === 'bossk' && s.bossHits <= st.n && sim.boss > 0) {
        const left = bossHp(s) - sim.boss, hitsLeft = st.n - s.bossHits - 1;
        v += left <= 0 ? 400 : left <= hitsLeft * bossDmg(LV_MAX) && sim.boss >= 5 ? 60 : -300;
      }
    }
  // 판 별: 셋 이상 한 번에
  v -= sim.n * 0.15;
  return v;
}

const bossHp = (s: AxeState) => s.foes.find((f) => f.k === 'boss')?.hp ?? 0;
/** 아직 못 딴 별 중 기다리면 노릴 수 있는 것 (나무 덮치기 · 박쥐 한 번에) */
function wantsWait(s: AxeState, sim: Sim) {
  for (const st of STAGES[s.stage].stars) {
    if (starMet(s, st)) continue;
    if (st.k === 'crush' && s.trees.some((t) => t.st === 0) && sim.crush < st.n) return true;
    if (st.k === 'bats' && s.foes.some((f) => f.k === 'bat' && f.st === 0) && sim.bats < st.n) return true;
  }
  return false;
}
const botMem = new WeakMap<object, { since: number; next: number }>();
/**
 * 잘하는 봇: 후보 자리를 모두 던져 본다(같은 길 함수 + 괴물 내다보기) — 벨 수 · 급한 괴물 · 오갈 때 둘 다(받기 연속) · 판 별.
 * 급한 괴물이 없으면 더 좋은 줄이 설 때까지 조금 기다린다.
 */
export const axebackSmart: Bot<AxeState> = {
  name: '두 길 다 베기',
  act(s) {
    if (s.phase !== 'play' || s.down || s.lock || s.axe) return NO;
    let m = botMem.get(s);
    if (!m) botMem.set(s, (m = { since: s.t, next: 0 }));
    if (s.t < m.next) return NO;
    const live = s.foes.filter((f) => f.st === 0 && !hidden(f, s.wt + 30));
    if (!live.length) {
      m.since = s.t;
      return NO;
    }
    const pr = predict(s, 4), lv = lvOf(s.combo), cs = candidates(s, pr);
    let best: Pick | null = null;
    const minTtc = Math.min(...pr.filter((p) => !hidden(p.f, s.wt + 30)).map((p) => p.ttc));
    const urgent = pr.filter((p) => p.ttc < 150 && !hidden(p.f, s.wt));
    let bestU: Pick | null = null, bestUv = -1e9;
    for (let i = 0; i < cs.length; i += 2) {
      const fl = flightFor(s, cs[i], cs[i + 1], lv), sim = simThrow(s, pr, fl, lv), v = judge(s, sim, true);
      const pk = { x: cs[i], y: cs[i + 1], v, sim };
      if (!best || v > best.v) best = pk;
      if (urgent.length) {
        const nU = urgent.filter((p) => sim.killed.has(p.f.id) || (p.f.k === 'boss' && sim.boss > 0)).length;
        if (nU && nU * 1000 + v > bestUv) (bestUv = nU * 1000 + v), (bestU = pk);
      }
    }
    if (!best) return NO;
    const waited = s.t - m.since;
    const pick = minTtc < 110 && bestU ? bestU : best;
    const both = pick.sim.two;
    const good = both || pick.sim.kills >= 3 || pick.sim.boss >= 2 || (s.combo === 0 && pick.sim.kills >= 2);
    const hold = wantsWait(s, pick.sim) && waited < 80 && minTtc > 160;
    if (minTtc < 110 || (good && !hold) || waited > (s.combo >= 2 ? 90 : 60)) {
      m.since = s.t + 60;
      return at(pick.x, pick.y);
    }
    m.next = s.t + 6;
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 눌렀다 뗀다 */
export const axebackRandom: Bot<AxeState> = {
  name: '아무 데나 휙',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0.5, y: 0.5 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 110);
    m.x = 0.05 + rng() * 0.9;
    m.y = (AY0 + rng() * (0.95 - AY0)) / A;
    m.hold = 2 + Math.floor(rng() * 30);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

/** 버릇 봇: 도끼가 손에 오면 늘 오두막에 가장 가까운 괴물에게 곧장 (두 길·기다리기·판 별 없음) */
export const axebackHabit: Bot<AxeState> = {
  name: '늘 가장 가까운 괴물에게 곧장',
  act(s) {
    if (s.phase !== 'play' || s.down || s.lock || s.axe) return NO;
    let best: Foe | null = null, bd = 1e9;
    for (const f of s.foes) {
      if (f.st !== 0 || hidden(f, s.wt)) continue;
      const d = remain(f, s.wt);
      if (d < bd) (bd = d), (best = f);
    }
    return best ? at(best.x, best.y) : NO;
  },
};

/** 독립 버릇 봇: 도끼가 손에 오면 늘 가장 앞선 괴물의 조금 너머로 (되짚어 오는 길에 한 번 더 베려는 버릇) */
export const axebackHabit2: Bot<AxeState> = {
  name: '늘 가장 앞선 괴물 조금 너머로',
  act(s) {
    if (s.phase !== 'play' || s.down || s.lock || s.axe) return NO;
    let best: Foe | null = null, bd = 1e9;
    for (const f of s.foes) {
      if (f.st !== 0 || hidden(f, s.wt)) continue;
      const d = remain(f, s.wt);
      if (d < bd) (bd = d), (best = f);
    }
    if (!best) return NO;
    const dx = best.x - HX, dy = best.y - HY, L = Math.hypot(dx, dy) || 1e-6;
    return at(best.x + (dx / L) * 0.12, best.y + (dy / L) * 0.12);
  },
};

/** 참고용 욕심 봇: 도끼가 손에 오면 바로, 미리 보기 숫자가 가장 큰 자리로 (받기 연속·급한 괴물·판 별·기다리기 없음) */
export const axebackGreedy: Bot<AxeState> = {
  name: '늘 가장 많이 베는 곳으로 바로',
  act(s) {
    if (s.phase !== 'play' || s.down || s.lock || s.axe) return NO;
    if (!s.foes.some((f) => f.st === 0 && !hidden(f, s.wt))) return NO;
    const pr = predict(s, 4), lv = lvOf(s.combo), cs = candidates(s, pr);
    let bx = 0.5, by = 0.6, bv = -1;
    for (let i = 0; i < cs.length; i += 2) {
      const sim = simThrow(s, pr, flightFor(s, cs[i], cs[i + 1], lv), lv), v = sim.kills + sim.strips * 0.5 + sim.boss * 0.5;
      if (v > bv) (bv = v), (bx = cs[i]), (by = cs[i + 1]);
    }
    return at(bx, by);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: AxeState, w: number, h: number, th: Theme) {
  const X = (x: number) => x * w, Y = (y: number) => y * w;
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#5d7a3a';
  ctx.fillRect(0, Y(HZ), w, Y(GB) - Y(HZ));
  for (const f of s.foes) {
    ctx.fillStyle = f.k === 'bark' ? (f.bare ? '#f0c49a' : '#4e321d') : f.k === 'vine' ? '#4f9a3a' : f.k === 'bat' ? '#3a2a4a' : '#7a5232';
    ctx.beginPath();
    ctx.arc(X(f.x), Y(f.y), RAD[f.k] * w, 0, 7);
    ctx.fill();
  }
  if (s.axe) {
    const k = Math.floor(s.axe.i);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(X(s.axe.fl.xs[k]), Y(s.axe.fl.ys[k]), s.axe.r * w, 0, 7);
    ctx.fill();
  }
}
