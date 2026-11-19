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

interface Sim { waste: number; two: boolean; kills: number; outN: number; backN: number; strips: number; clean: number; bounceK: number; bats: number; crush: number; boss: number; urg: number; killed: Set<number>; n: number; trees: number }
/** 미리 보기 표시: 어느 괴물을 어느 길에서 (0 베기 · 1 껍질 · 2 대장 껍질 · 3 대장 아픔) */
interface Mark { id: number; leg: number; kind: number; n: number }
interface FallMark { x: number; y: number; dx: number; dy: number; n: number }
/** 던지기 한 번을 내다본다 (괴물은 지금 길대로 걷는다고 본다) */
function simThrow(s: AxeState, pr: Pred[], fl: Flight, lv: number, marks?: Mark[], fallsOut?: FallMark[]): Sim {
  const r = axeR(lv), res: Sim = { waste: 0, two: false, kills: 0, outN: 0, backN: 0, strips: 0, clean: 0, bounceK: 0, bats: 0, crush: 0, boss: 0, urg: 0, killed: new Set(), n: fl.n, trees: 0 };
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
    if (res.crush === c0) res.waste++;
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
      if (st.k === 'crush') v += (sim.crush >= st.n ? 160 : 25 * sim.crush) - 30 * sim.waste;
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
const OUT = '#2b160c';
/** 나무꾼 발 자리 · 울타리 줄 · 오두막 지붕 꼭대기 */
const FEET_Y = 1.115, FENCE_Y = 1.078, RIDGE_Y = 1.15;

// ── 판별 노을 팔레트: 0 금빛 · 1 분홍 · 2 보랏빛 · 3 핏빛 ──
interface Pal { sky: string[]; sun: string; glow: string; far: string; far2: string; mid: string; rim: string; g: string[]; path: string; mist: string }
const PAL: Pal[] = [
  { sky: ['#33245e', '#8e4a86', '#f08a5c', '#ffd27e'], sun: '#fff2c0', glow: '255,196,120', far: '#7b4f86', far2: '#5c3a72', mid: '#2a2a40', rim: '#ffab66', g: ['#7c8a48', '#8c9a46', '#9fad4c'], path: '#c39560', mist: '255,190,150' },
  { sky: ['#2a2058', '#7d3f80', '#e2706e', '#f8b47c'], sun: '#ffe4b6', glow: '255,170,140', far: '#6f4580', far2: '#4f3268', mid: '#26243c', rim: '#ff9472', g: ['#6c7c48', '#7e9046', '#90a04c'], path: '#b28660', mist: '240,170,170' },
  { sky: ['#1c1846', '#53347a', '#b45a80', '#ec8e6c'], sun: '#ffdcb0', glow: '255,150,140', far: '#523c74', far2: '#3b2c5c', mid: '#1d1c33', rim: '#ff8070', g: ['#58704a', '#68804a', '#78904e'], path: '#9c7656', mist: '200,150,200' },
  { sky: ['#180e2c', '#481c46', '#a23c4c', '#e8683c'], sun: '#ffc888', glow: '255,120,80', far: '#4c2a4c', far2: '#33203e', mid: '#18122a', rim: '#ff7040', g: ['#545a3e', '#646844', '#747648'], path: '#8c6a4c', mist: '230,130,110' },
];

interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; ground: HTMLCanvasElement; cabin: HTMLCanvasElement }
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
/** 전나무 한 그루 (톱니 층) — 노을 쪽(왼쪽) 가장자리에 빛 테 */
function fir(g: C2, x: number, by: number, H: number, W: number, col: string, rim: string | null, seed: number, tiers = 5) {
  const top = by - H, ys: number[] = [], ws: number[] = [];
  for (let i = 0; i < tiers; i++) {
    ys.push(top + H * 0.8 * ((i + 1) / tiers));
    ws.push(W * 0.5 * (0.32 + 0.68 * ((i + 1) / tiers)) * (0.9 + 0.2 * hsh(seed + i)));
  }
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, top);
  for (let i = 0; i < tiers; i++) {
    g.lineTo(x + ws[i], ys[i]);
    if (i < tiers - 1) g.lineTo(x + ws[i] * 0.42, ys[i] - H * 0.03);
  }
  g.lineTo(x + W * 0.06, ys[tiers - 1]);
  g.lineTo(x + W * 0.06, by);
  g.lineTo(x - W * 0.06, by);
  g.lineTo(x - W * 0.06, ys[tiers - 1]);
  for (let i = tiers - 1; i >= 0; i--) {
    g.lineTo(x - ws[i], ys[i]);
    if (i > 0) g.lineTo(x - ws[i - 1] * 0.42, ys[i - 1] - H * 0.03);
  }
  g.closePath();
  g.fill();
  if (!rim) return;
  g.strokeStyle = rim;
  g.lineWidth = Math.max(1, W * 0.04);
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < tiers; i++) {
    g.moveTo(x - (i ? ws[i - 1] * 0.42 : 0), i ? ys[i - 1] - H * 0.03 : top);
    g.lineTo(x - ws[i], ys[i]);
  }
  g.stroke();
}
function getBg(w: number, h: number, place: number, sc: number): Bg {
  const key = `${w}x${h}:${place}:${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const P = PAL[place], hz = HZ * w, R = (r: number) => r * w;
  const sunX = w * 0.27, sunY = hz - R(0.15);
  const sky = layer(w, hz + R(0.02), sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, hz, [0, P.sky[0]], [0.42, P.sky[1]], [0.78, P.sky[2]], [1, P.sky[3]]);
    g.fillRect(0, 0, w, hz + R(0.02));
    for (let k = 0; k < 40; k++) {
      g.globalAlpha = (0.2 + hsh(k * 3.1) * 0.6) * (1 - (hsh(k + 99) * 0.5));
      g.fillStyle = '#fff4e0';
      g.beginPath();
      g.arc(hsh(k) * w, hsh(k + 99) * hz * 0.4, k % 7 ? 0.7 : 1.3, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = radg(g, sunX, sunY, R(0.05), R(0.62), [0, `rgba(${P.glow},.6)`], [0.35, `rgba(${P.glow},.2)`], [1, `rgba(${P.glow},0)`]);
    g.fillRect(0, 0, w, hz + R(0.02));
    g.fillStyle = radg(g, sunX - R(0.02), sunY - R(0.02), R(0.01), R(0.1), [0, '#ffffff'], [0.5, P.sun], [1, '#ffb070']);
    g.beginPath();
    g.arc(sunX, sunY, R(0.095), 0, TAU);
    g.fill();
    // 노을 구름 (아래쪽이 빛을 받는다)
    for (let k = 0; k < 7; k++) {
      const cx = hsh(k * 5 + 1) * w * 1.1 - w * 0.05, cy = hz * (0.18 + hsh(k * 7 + 2) * 0.55), cw = R(0.12 + hsh(k + 3) * 0.16);
      for (let j = 0; j < 4; j++) {
        const ox = (j - 1.5) * cw * 0.45, oy = Math.sin(j * 2.1 + k) * cw * 0.06;
        g.fillStyle = `rgba(${P.glow},.45)`;
        ell(g, cx + ox, cy + oy + R(0.006), cw * 0.42, cw * 0.11);
        g.fill();
        g.fillStyle = k % 2 ? 'rgba(70,36,86,.55)' : 'rgba(96,48,104,.5)';
        ell(g, cx + ox, cy + oy - R(0.002), cw * 0.42, cw * 0.1);
        g.fill();
      }
    }
    // 먼 산
    g.fillStyle = P.far2;
    g.beginPath();
    g.moveTo(0, hz + R(0.02));
    for (let x = 0; x <= w; x += 4) g.lineTo(x, hz - R(0.1) - Math.sin(x / w * 5.2 + 1) * R(0.035) - Math.sin(x / w * 13 + place) * R(0.012));
    g.lineTo(w, hz + R(0.02));
    g.closePath();
    g.fill();
    g.fillStyle = `rgba(${P.mist},.18)`;
    g.fillRect(0, hz - R(0.12), w, R(0.14));
  });
  const FW = w * 1.25;
  const far = layer(FW, R(0.2), sc, (g) => {
    const by = R(0.19);
    const nearSun = (x: number) => Math.abs(x - R(0.15) - sunX) < R(0.12);
    for (let k = 0; k < 46; k++) {
      const x = hsh(k * 1.7 + place) * FW, H = R((nearSun(x) ? 0.04 : 0.07) + hsh(k * 2.3) * (nearSun(x) ? 0.025 : 0.06));
      fir(g, x, by - R(0.012) * hsh(k), H, H * 0.42, P.far, null, k, 4);
    }
    for (let k = 0; k < 30; k++) {
      const x = hsh(k * 3.3 + 7) * FW, H = R((nearSun(x) ? 0.05 : 0.09) + hsh(k * 4.1) * (nearSun(x) ? 0.03 : 0.07));
      fir(g, x, by + R(0.004), H, H * 0.44, P.far2, null, k + 50, 5);
    }
    g.fillStyle = lin(g, 0, by - R(0.08), 0, by, [0, `rgba(${P.mist},0)`], [1, `rgba(${P.mist},.35)`]);
    g.fillRect(0, by - R(0.08), FW, R(0.09));
  });
  const MW = w * 1.3;
  const mid = layer(MW, R(0.34), sc, (g) => {
    const by = R(0.33);
    const xs = [0.02, 0.09, 0.15, 0.24, 0.31, 0.4, 0.47, 0.55, 0.63, 0.7, 0.79, 0.86, 0.94, 1.02, 1.1, 1.18, 1.26];
    xs.forEach((u, k) => {
      // 해 쪽(0.2~0.38)은 낮게 비워 노을 해가 보이게
      const gap = u * w - R(0.15) > w * 0.17 && u * w - R(0.15) < w * 0.4;
      const H = R((gap ? 0.07 : 0.13) + hsh(k * 5.5 + place) * (gap ? 0.04 : 0.1)), x = u * w + hsh(k) * R(0.03);
      fir(g, x, by, H, H * 0.46, P.mid, P.rim, k * 11 + 3, 6);
    });
    // 숲 가장자리 덤불 (괴물이 여기서 나온다)
    for (let k = 0; k < 40; k++) {
      const x = (k / 40) * MW + hsh(k + 5) * R(0.02), r = R(0.022 + hsh(k * 3) * 0.02);
      g.fillStyle = '#1e2a26';
      g.beginPath();
      g.arc(x, by - r * 0.5, r, 0, TAU);
      g.fill();
      g.fillStyle = `rgba(${P.glow},.28)`;
      g.beginPath();
      g.arc(x - r * 0.3, by - r * 0.9, r * 0.45, Math.PI, TAU);
      g.fill();
    }
  });
  const ground = layer(w, h - hz, sc, (g) => {
    const gh = (GB - HZ) * w + R(0.25);
    g.fillStyle = lin(g, 0, 0, 0, gh, [0, P.g[0]], [0.45, P.g[1]], [1, P.g[2]]);
    g.fillRect(0, 0, w, h - hz);
    g.fillStyle = lin(g, 0, 0, 0, R(0.14), [0, `rgba(${P.mist},.42)`], [1, `rgba(${P.mist},0)`]);
    g.fillRect(0, 0, w, R(0.14));
    g.fillStyle = lin(g, 0, 0, 0, R(0.05), [0, 'rgba(20,16,30,.5)'], [1, 'rgba(20,16,30,0)']);
    g.fillRect(0, 0, w, R(0.05));
    // 노을빛 웅덩이
    g.fillStyle = radg(g, sunX, R(0.05), R(0.02), R(0.7), [0, `rgba(${P.glow},.32)`], [1, `rgba(${P.glow},0)`]);
    g.fillRect(0, 0, w, h - hz);
    // 오솔길: 오두막 → 숲
    const pathPt = (u: number) => [w * (0.5 - 0.07 * Math.sin(u * 3.0)) , (1.2 - HZ) * w * (1 - u)];
    g.fillStyle = P.path;
    g.beginPath();
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, [px, py] = pathPt(u), wd = R(0.13 - 0.1 * u);
      if (i) g.lineTo(px + wd, py);
      else g.moveTo(px + wd, py);
    }
    for (let i = 20; i >= 0; i--) {
      const u = i / 20, [px, py] = pathPt(u), wd = R(0.13 - 0.1 * u);
      g.lineTo(px - wd, py);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(70,40,20,.35)';
    g.lineWidth = 2;
    g.stroke();
    for (let k = 0; k < 26; k++) {
      const u = hsh(k * 9.1), [px, py] = pathPt(u), wd = R(0.13 - 0.1 * u);
      g.fillStyle = k % 3 ? 'rgba(255,230,190,.35)' : 'rgba(80,50,30,.35)';
      ell(g, px + (hsh(k * 3.7) - 0.5) * wd * 1.6, py, R(0.006) * (1 - u * 0.5), R(0.0035) * (1 - u * 0.5));
      g.fill();
    }
    // 풀 무더기
    for (let k = 0; k < 300; k++) {
      const u = Math.pow(hsh(k * 1.31), 0.8), x = hsh(k * 2.71) * w, y = u * gh, sz = R(0.008 + 0.012 * u);
      const tone = hsh(k * 5.3);
      g.strokeStyle = tone < 0.4 ? 'rgba(40,60,30,.5)' : tone < 0.8 ? 'rgba(150,170,80,.45)' : `rgba(${P.glow},.4)`;
      g.lineWidth = 1 + u;
      g.beginPath();
      for (let j = -1; j <= 1; j++) {
        g.moveTo(x + j * sz * 0.3, y);
        g.quadraticCurveTo(x + j * sz * 0.5, y - sz * 0.6, x + j * sz * 0.8 + sz * 0.2, y - sz);
      }
      g.stroke();
    }
    // 들꽃 · 돌멩이 · 버섯
    for (let k = 0; k < 46; k++) {
      const u = hsh(k * 4.4 + 1), x = hsh(k * 6.6) * w, y = (0.05 + u * 0.95) * gh, r = R(0.004 + 0.004 * u);
      if (Math.abs(x - w * 0.5) < R(0.14) && y > gh * 0.7) continue;
      g.fillStyle = ['#fff6dc', '#ffd84a', '#ff9ab0', '#c6a8ff'][k % 4];
      for (let j = 0; j < 5; j++) {
        g.beginPath();
        g.arc(x + Math.cos(j * 1.256) * r, y + Math.sin(j * 1.256) * r * 0.6, r * 0.7, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#e8a030';
      g.beginPath();
      g.arc(x, y, r * 0.5, 0, TAU);
      g.fill();
    }
    for (let k = 0; k < 14; k++) {
      const u = hsh(k * 8.8 + 3), x = hsh(k * 2.2 + 9) * w, y = (0.1 + u * 0.85) * gh, r = R(0.008 + 0.01 * u);
      g.fillStyle = 'rgba(30,24,30,.35)';
      ell(g, x + r * 0.2, y + r * 0.35, r * 1.1, r * 0.4);
      g.fill();
      g.fillStyle = lin(g, x - r, y - r, x + r, y + r, [0, '#c8c0c8'], [1, '#6a6070']);
      ell(g, x, y, r, r * 0.65);
      g.fill();
    }
    for (const [mx, my] of [[0.06, 0.25], [0.93, 0.32], [0.09, 0.6], [0.95, 0.66], [0.04, 0.45]]) {
      const x = mx * w, y = my * gh, r = R(0.016);
      g.fillStyle = '#f6ead2';
      g.fillRect(x - r * 0.25, y - r * 0.7, r * 0.5, r * 0.75);
      g.fillStyle = lin(g, x, y - r * 1.3, x, y - r * 0.5, [0, '#ff5a46'], [1, '#c02a28']);
      ell(g, x, y - r * 0.75, r, r * 0.55);
      g.fill();
      g.fillStyle = '#fff3e0';
      for (let j = 0; j < 3; j++) {
        g.beginPath();
        g.arc(x + (j - 1) * r * 0.45, y - r * 0.9 + (j % 2) * r * 0.15, r * 0.14, 0, TAU);
        g.fill();
      }
    }
    // 가장자리 숲 그늘
    g.fillStyle = lin(g, 0, 0, w, 0, [0, 'rgba(20,14,34,.42)'], [0.13, 'rgba(20,14,34,0)'], [0.87, 'rgba(20,14,34,0)'], [1, 'rgba(20,14,34,.42)']);
    g.fillRect(0, 0, w, h - hz);
  });
  const cabin = layer(w, R(0.25), sc, (g) => {
    // 지붕(모임지붕) — 꼭대기 y0, 처마 y1
    const y0 = R(0.03), y1 = R(0.15), xl0 = w * 0.27, xr0 = w * 0.73, xl1 = w * 0.1, xr1 = w * 0.9;
    // 통나무 벽 (처마 아래)
    g.fillStyle = '#5e3a22';
    g.fillRect(xl1 + R(0.02), y1 - R(0.01), xr1 - xl1 - R(0.04), R(0.12));
    for (let j = 0; j < 4; j++) {
      const yy = y1 + R(0.005) + j * R(0.026);
      g.fillStyle = lin(g, 0, yy, 0, yy + R(0.024), [0, '#9a6438'], [0.5, '#7a4a28'], [1, '#4e2e18']);
      rr(g, xl1 + R(0.02), yy, xr1 - xl1 - R(0.04), R(0.023), R(0.011));
      g.fill();
    }
    // 창문 불빛
    for (const wx of [0.3, 0.7]) {
      const x = wx * w;
      g.fillStyle = radg(g, x, y1 + R(0.05), R(0.01), R(0.12), [0, 'rgba(255,210,120,.5)'], [1, 'rgba(255,210,120,0)']);
      g.fillRect(x - R(0.12), y1 - R(0.05), R(0.24), R(0.2));
      g.fillStyle = '#3a2214';
      rr(g, x - R(0.05), y1 + R(0.015), R(0.1), R(0.08), R(0.01));
      g.fill();
      g.fillStyle = lin(g, 0, y1 + R(0.02), 0, y1 + R(0.09), [0, '#fff0b0'], [1, '#ffb050']);
      rr(g, x - R(0.042), y1 + R(0.022), R(0.084), R(0.07), R(0.006));
      g.fill();
      g.fillStyle = '#3a2214';
      g.fillRect(x - R(0.004), y1 + R(0.022), R(0.008), R(0.07));
      g.fillRect(x - R(0.042), y1 + R(0.05), R(0.084), R(0.007));
    }
    // 지붕
    g.fillStyle = '#4a2418';
    g.beginPath();
    g.moveTo(xl0, y0);
    g.lineTo(xr0, y0);
    g.lineTo(xr1, y1);
    g.lineTo(xl1, y1);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    const rows = 6;
    for (let r0 = 0; r0 < rows; r0++) {
      const yy = y0 + ((y1 - y0) * r0) / rows, hh = (y1 - y0) / rows + R(0.004), u = r0 / rows;
      const xa = xl0 + (xl1 - xl0) * u - R(0.02), xb = xr0 + (xr1 - xr0) * u + R(0.02), sw = R(0.045 + 0.008 * u);
      for (let x = xa + (r0 % 2) * sw * 0.5; x < xb; x += sw) {
        const tone = hsh(x * 0.37 + r0 * 13);
        g.fillStyle = lin(g, 0, yy, 0, yy + hh, [0, tone < 0.5 ? '#a04a32' : '#8e3e2a'], [1, '#5e2618']);
        rr(g, x, yy, sw - R(0.004), hh, R(0.01));
        g.fill();
        g.fillStyle = 'rgba(255,190,140,.25)';
        g.fillRect(x + R(0.004), yy + R(0.002), sw - R(0.012), R(0.003));
      }
    }
    // 이끼
    for (let k = 0; k < 9; k++) {
      const x = w * (0.2 + hsh(k * 3.3) * 0.6), y = y0 + (y1 - y0) * (0.2 + hsh(k * 5.1) * 0.7), r = R(0.012 + hsh(k) * 0.016);
      g.fillStyle = 'rgba(110,150,60,.75)';
      ell(g, x, y, r * 1.4, r * 0.6);
      g.fill();
      g.fillStyle = 'rgba(170,200,90,.6)';
      ell(g, x - r * 0.3, y - r * 0.2, r * 0.6, r * 0.25);
      g.fill();
    }
    // 노을빛 (왼쪽 위에서)
    g.fillStyle = lin(g, xl1, y0, xr1, y1, [0, `rgba(${P.glow},.28)`], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(20,0,20,.25)']);
    g.fillRect(0, 0, w, y1);
    g.restore();
    g.strokeStyle = OUT;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(xl0, y0);
    g.lineTo(xr0, y0);
    g.lineTo(xr1, y1);
    g.lineTo(xl1, y1);
    g.closePath();
    g.stroke();
    // 용마루 통나무
    g.fillStyle = lin(g, 0, y0 - R(0.012), 0, y0 + R(0.012), [0, '#c08250'], [1, '#6a3c1e']);
    rr(g, xl0 - R(0.02), y0 - R(0.012), xr0 - xl0 + R(0.04), R(0.024), R(0.012));
    g.fill();
    g.stroke();
    for (const ex of [xl0 - R(0.02), xr0 + R(0.02)]) {
      g.fillStyle = '#e0b880';
      ell(g, ex, y0, R(0.012), R(0.012));
      g.fill();
      g.stroke();
    }
    // 처마 그림자
    g.fillStyle = 'rgba(20,8,10,.45)';
    g.fillRect(xl1 + R(0.02), y1, xr1 - xl1 - R(0.04), R(0.01));
  });
  const out = { sky, far, mid, ground, cabin };
  BG.set(key, out);
  return out;
}

// ── 캐릭터 ──
function eyes(ctx: C2, k: number, xs: number[], y: number, r: number, mood: number, lx: number, ly: number, iris = '#24140a') {
  for (const ex of xs) {
    if (mood === 3) {
      // 기쁨 ^ ^
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1.2, k * 0.022);
      ctx.beginPath();
      ctx.arc(ex, y + r * 0.3, r * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    if (mood === 5) {
      // 어질어질
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1, k * 0.016);
      ctx.beginPath();
      for (let a = 0; a < TAU * 2; a += 0.3) {
        const q = (a / (TAU * 2)) * r;
        if (a) ctx.lineTo(ex + Math.cos(a) * q, y + Math.sin(a) * q);
        else ctx.moveTo(ex, y);
      }
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ell(ctx, ex, y, r * 0.85, mood === 4 ? r * 1.15 : r);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1, k * 0.014);
    ctx.stroke();
    const pr = mood === 4 ? r * 0.32 : r * 0.55;
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(ex + lx * r * 0.32, y + ly * r * 0.32, pr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + lx * r * 0.32 - pr * 0.35, y + ly * r * 0.32 - pr * 0.4, pr * 0.35, 0, TAU);
    ctx.fill();
    if (mood === 1) {
      // 힘줌: 눈꺼풀 반쯤
      ctx.fillStyle = '#f2c094';
      ctx.beginPath();
      ctx.ellipse(ex, y - r * 0.15, r * 0.95, r * 0.75, 0, Math.PI, TAU);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.9, y - r * 0.15);
      ctx.lineTo(ex + r * 0.9, y - r * 0.15);
      ctx.stroke();
    }
  }
}

/** 도끼: (0,0)이 손잡이 끝(grip) 또는 가운데(center), ang 방향으로 손잡이 → 도끼날 */
function drawAxe(ctx: C2, x: number, y: number, L: number, ang: number, lv: number, center: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (center) ctx.translate(-L * 0.55, 0);
  const gold = lv >= 3;
  if (lv >= 5) {
    ctx.shadowColor = '#ffd25a';
    ctx.shadowBlur = L * 0.4;
  }
  ctx.lineJoin = 'round';
  // 손잡이
  ctx.fillStyle = lin(ctx, 0, -L * 0.05, 0, L * 0.05, [0, '#e8b070'], [0.5, '#b0743c'], [1, '#6e4220']);
  rr(ctx, 0, -L * 0.05, L * 0.98, L * 0.1, L * 0.05);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, L * 0.045);
  ctx.stroke();
  ctx.fillStyle = '#9a2a1e';
  rr(ctx, L * 0.02, -L * 0.055, L * 0.22, L * 0.11, L * 0.04);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = Math.max(1, L * 0.02);
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(L * (0.02 + i * 0.055), -L * 0.05);
    ctx.lineTo(L * (0.04 + i * 0.055), L * 0.05);
    ctx.stroke();
  }
  // 도끼날
  ctx.beginPath();
  ctx.moveTo(L * 0.8, -L * 0.07);
  ctx.lineTo(L * 0.72, -L * 0.3);
  ctx.quadraticCurveTo(L * 0.9, -L * 0.56, L * 1.16, -L * 0.36);
  ctx.lineTo(L * 1.02, -L * 0.07);
  ctx.lineTo(L * 1.02, L * 0.09);
  ctx.lineTo(L * 0.8, L * 0.09);
  ctx.closePath();
  ctx.fillStyle = gold ? lin(ctx, L * 0.7, -L * 0.5, L * 1.1, L * 0.1, [0, '#fff6c0'], [0.45, '#ffd04a'], [1, '#c07a14']) : lin(ctx, L * 0.7, -L * 0.5, L * 1.1, L * 0.1, [0, '#ffffff'], [0.4, '#c9d2de'], [1, '#6b7586']);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, L * 0.045);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = Math.max(1, L * 0.035);
  ctx.beginPath();
  ctx.moveTo(L * 0.76, -L * 0.33);
  ctx.quadraticCurveTo(L * 0.92, -L * 0.5, L * 1.11, -L * 0.36);
  ctx.stroke();
  ctx.restore();
}

/** 수염 꼬마 나무꾼. pose: 0 어깨에 도끼 · 1 겨눔 · 2 던짐 · 3 기다림 · 4 받음 · 5 쾅 놀람 · 6 어질 · 7 만세 */
function drawJack(ctx: C2, x: number, y: number, k: number, pose: number, t: number, lv: number, ax: number, ay: number, axeIn: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,10,20,.38)';
  ell(ctx, 0, 0, k * 0.3, k * 0.075);
  ctx.fill();
  const br = Math.sin(t * 0.08) * k * 0.01, hop = pose === 7 ? -Math.abs(Math.sin(t * 0.18)) * k * 0.12 : pose === 4 ? -k * 0.03 : 0;
  const lean = pose === 1 ? -0.06 : pose === 2 ? 0.1 : pose === 6 ? Math.sin(t * 0.12) * 0.12 : 0;
  ctx.translate(0, hop);
  ctx.rotate(lean);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.4, k * 0.025);
  // 다리 · 장화
  const step = pose === 3 ? Math.sin(t * 0.3) * k * 0.015 : 0;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#35538a';
    rr(ctx, sx * k * 0.085 - k * 0.055, -k * 0.24, k * 0.11, k * 0.2 + sx * step, k * 0.04);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = lin(ctx, 0, -k * 0.07, 0, 0, [0, '#7a4a28'], [1, '#3e2210']);
    rr(ctx, sx * k * 0.09 - k * 0.07 + sx * k * 0.015, -k * 0.075 + sx * step, k * 0.14, k * 0.075, k * 0.035);
    ctx.fill();
    ctx.stroke();
  }
  // 몸통: 빨간 체크 셔츠
  const top = -k * 0.53 + br;
  ctx.save();
  rr(ctx, -k * 0.18, top, k * 0.36, -k * 0.2 - top, k * 0.11);
  ctx.fillStyle = '#d63c2c';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(110,16,14,.55)';
  for (let i = -3; i <= 3; i++) ctx.fillRect(i * k * 0.1 - k * 0.025, top, k * 0.05, k * 0.4);
  for (let i = 0; i < 4; i++) ctx.fillRect(-k * 0.2, top + i * k * 0.1 + k * 0.02, k * 0.4, k * 0.045);
  ctx.strokeStyle = 'rgba(255,170,140,.4)';
  ctx.lineWidth = Math.max(0.8, k * 0.008);
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * k * 0.1 + k * 0.05, top);
    ctx.lineTo(i * k * 0.1 + k * 0.05, -k * 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = lin(ctx, -k * 0.18, 0, k * 0.18, 0, [0, 'rgba(255,200,140,.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(30,0,20,.3)']);
  ctx.fillRect(-k * 0.2, top, k * 0.4, k * 0.4);
  ctx.restore();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.4, k * 0.025);
  rr(ctx, -k * 0.18, top, k * 0.36, -k * 0.2 - top, k * 0.11);
  ctx.stroke();
  ctx.fillStyle = '#5a3418';
  rr(ctx, -k * 0.185, -k * 0.27, k * 0.37, k * 0.05, k * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd25a';
  rr(ctx, -k * 0.03, -k * 0.275, k * 0.06, k * 0.06, k * 0.012);
  ctx.fill();
  ctx.stroke();
  // 팔 (뒤쪽 팔 먼저)
  const sL = { x: -k * 0.15, y: top + k * 0.08 }, sR = { x: k * 0.15, y: top + k * 0.08 };
  const aimA = Math.atan2(ay, ax);
  let hL = { x: -k * 0.22, y: -k * 0.3 }, hR = { x: k * 0.2, y: top - k * 0.02 };
  let axeAng = -2.3, holdAxe = axeIn;
  if (pose === 1) (hR = { x: k * 0.1 - Math.cos(aimA) * k * 0.12, y: -k * 0.98 }), (hL = { x: Math.cos(aimA) * k * 0.3, y: top + Math.sin(aimA) * k * 0.25 }), (axeAng = aimA + Math.PI + 0.5);
  if (pose === 2) (hR = { x: Math.cos(aimA) * k * 0.34, y: top + Math.sin(aimA) * k * 0.3 }), (hL = { x: -k * 0.26, y: -k * 0.32 }), (holdAxe = false);
  if (pose === 3) (hR = { x: k * 0.27, y: top - k * 0.05 }), (hL = { x: -k * 0.27, y: top - k * 0.05 });
  if (pose === 4) (hR = { x: k * 0.2, y: -k * 1.0 }), (hL = { x: -k * 0.28, y: top - k * 0.1 }), (axeAng = -1.75);
  if (pose === 5) (hR = { x: k * 0.2, y: -k * 0.82 }), (hL = { x: -k * 0.2, y: -k * 0.82 }), (axeAng = -2.0);
  if (pose === 6) (hR = { x: k * 0.24, y: -k * 0.24 }), (hL = { x: -k * 0.24, y: -k * 0.24 }), (axeAng = 0.6);
  if (pose === 7) (hR = { x: k * 0.26, y: -k * 1.0 }), (hL = { x: -k * 0.26, y: -k * 1.0 }), (axeAng = -1.6);
  const arm = (s0: { x: number; y: number }, h0: { x: number; y: number }) => {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.115;
    ctx.beginPath();
    ctx.moveTo(s0.x, s0.y);
    ctx.lineTo(h0.x, h0.y);
    ctx.stroke();
    ctx.strokeStyle = '#c23426';
    ctx.lineWidth = k * 0.075;
    ctx.stroke();
    ctx.fillStyle = '#f4c49a';
    ctx.beginPath();
    ctx.arc(h0.x, h0.y, k * 0.048, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, k * 0.02);
    ctx.stroke();
  };
  if (holdAxe && (pose === 0 || pose === 1)) drawAxe(ctx, hR.x, hR.y, k * (0.5 + 0.06 * lv), axeAng, lv, false);
  arm(sL, hL);
  arm(sR, hR);
  if (holdAxe && pose !== 0 && pose !== 1) drawAxe(ctx, hR.x, hR.y, k * (0.5 + 0.06 * lv), axeAng, lv, false);
  // 머리
  const hy = -k * 0.71 + br;
  ctx.fillStyle = radg(ctx, -k * 0.05, hy - k * 0.05, k * 0.02, k * 0.2, [0, '#ffe0c0'], [1, '#e8a87c']);
  ctx.beginPath();
  ctx.arc(0, hy, k * 0.175, 0, TAU);
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, k * 0.025);
  ctx.strokeStyle = OUT;
  ctx.stroke();
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#eeb088';
    ell(ctx, sx * k * 0.175, hy + k * 0.01, k * 0.035, k * 0.045);
    ctx.fill();
    ctx.stroke();
  }
  // 수염 (턱에서 가슴까지 복슬복슬)
  ctx.fillStyle = '#c0662a';
  ctx.beginPath();
  const bp = [[-0.14, 0.02], [-0.15, 0.08], [-0.12, 0.14], [-0.065, 0.185], [0, 0.2], [0.065, 0.185], [0.12, 0.14], [0.15, 0.08], [0.14, 0.02]];
  for (const [bx, by] of bp) {
    ctx.moveTo(bx * k + k * 0.055, hy + by * k);
    ctx.arc(bx * k, hy + by * k, k * 0.055, 0, TAU);
  }
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, hy + k * 0.08, k * 0.125, k * 0.09, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7a3a14';
  ctx.lineWidth = Math.max(1, k * 0.015);
  for (let i = 0; i < 7; i++) {
    const bx = (hsh(i * 3.1) - 0.5) * k * 0.24, by = hy + k * (0.05 + hsh(i * 7.7) * 0.15);
    ctx.beginPath();
    ctx.arc(bx, by, k * 0.025, 0.3, 2.6);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,190,120,.35)';
  ell(ctx, -k * 0.06, hy + k * 0.05, k * 0.05, k * 0.03);
  ctx.fill();
  // 볼 · 코 · 콧수염
  ctx.fillStyle = 'rgba(255,120,120,.5)';
  for (const sx of [-1, 1]) {
    ell(ctx, sx * k * 0.105, hy - k * 0.005, k * 0.035, k * 0.022);
    ctx.fill();
  }
  const mood = pose === 1 ? 1 : pose === 4 || pose === 7 ? 3 : pose === 5 ? 4 : pose === 6 ? 5 : 0;
  const ll = Math.hypot(ax, ay) || 1, lx = pose === 3 || pose === 1 ? ax / ll : 0, ly = pose === 3 || pose === 1 ? ay / ll : 0.2;
  eyes(ctx, k, [-k * 0.065, k * 0.065], hy - k * 0.045, k * 0.042, mood, lx, ly);
  ctx.strokeStyle = '#8a4418';
  ctx.lineWidth = k * 0.025;
  for (const sx of [-1, 1]) {
    const tilt = mood === 1 ? 0.35 : mood === 4 ? -0.4 : -0.1;
    ctx.beginPath();
    ctx.moveTo(sx * k * 0.03, hy - k * 0.1 + (mood === 1 ? k * 0.012 : 0));
    ctx.lineTo(sx * k * 0.1, hy - k * 0.1 - tilt * k * 0.04 * sx * sx);
    ctx.stroke();
  }
  ctx.fillStyle = '#ea8f72';
  ctx.beginPath();
  ctx.arc(0, hy + k * 0.005, k * 0.032, 0, TAU);
  ctx.fill();
  ctx.lineWidth = Math.max(1, k * 0.012);
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.fillStyle = '#a8501c';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * k * 0.045, hy + k * 0.04, k * 0.05, k * 0.022, sx * 0.3, 0, TAU);
    ctx.fill();
  }
  // 입
  ctx.fillStyle = '#5a1a14';
  if (pose === 2 || pose === 5 || pose === 7) {
    ell(ctx, 0, hy + k * 0.085, k * 0.035, k * (pose === 5 ? 0.04 : 0.03));
    ctx.fill();
  } else if (pose === 1) {
    ctx.fillStyle = '#ff7a8a';
    ell(ctx, k * 0.025, hy + k * 0.08, k * 0.018, k * 0.014);
    ctx.fill();
  } else if (pose === 4) {
    ctx.beginPath();
    ctx.arc(0, hy + k * 0.07, k * 0.04, 0.1, Math.PI - 0.1);
    ctx.fill();
  }
  // 털모자
  ctx.fillStyle = lin(ctx, 0, hy - k * 0.3, 0, hy - k * 0.1, [0, '#ffc64a'], [1, '#d48a1a']);
  ctx.beginPath();
  ctx.moveTo(-k * 0.18, hy - k * 0.09);
  ctx.quadraticCurveTo(-k * 0.17, hy - k * 0.3, 0, hy - k * 0.3);
  ctx.quadraticCurveTo(k * 0.17, hy - k * 0.3, k * 0.18, hy - k * 0.09);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, k * 0.025);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,80,10,.5)';
  ctx.lineWidth = Math.max(1, k * 0.012);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * k * 0.06, hy - k * 0.12);
    ctx.quadraticCurveTo(i * k * 0.055, hy - k * 0.24, i * k * 0.03, hy - k * 0.29);
    ctx.stroke();
  }
  ctx.fillStyle = '#c9761a';
  rr(ctx, -k * 0.19, hy - k * 0.135, k * 0.38, k * 0.06, k * 0.03);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.4, k * 0.025);
  ctx.stroke();
  ctx.fillStyle = '#fff3dc';
  ctx.beginPath();
  ctx.arc(k * 0.02 + Math.sin(t * 0.07) * k * 0.01, hy - k * 0.32, k * 0.055, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (pose === 5) {
    ctx.fillStyle = '#8fd8ff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * k * 0.2, hy - k * 0.16);
      ctx.quadraticCurveTo(sx * k * 0.25, hy - k * 0.08, sx * k * 0.2, hy - k * 0.06);
      ctx.quadraticCurveTo(sx * k * 0.16, hy - k * 0.09, sx * k * 0.2, hy - k * 0.16);
      ctx.fill();
    }
  }
  if (pose === 6)
    for (let i = 0; i < 3; i++) {
      const a = t * 0.12 + (i * TAU) / 3;
      ctx.fillStyle = '#ffe36a';
      starPath(ctx, Math.cos(a) * k * 0.22, hy - k * 0.33 + Math.sin(a) * k * 0.06, k * 0.045);
      ctx.fill();
    }
  ctx.restore();
}

/** 나무 괴물 몸 (발 자리가 원점, k = 키). mood: 0 보통 · 1 화남 · 4 놀람 · 5 납작 · 6 부끄러움 */
function drawFoeBody(ctx: C2, kd: K, k: number, t: number, seed: number, bare: boolean, mood: number, armor: number) {
  const ph = hsh(seed) * 10, walk = Math.sin(t * 0.25 + ph);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  const lw = Math.max(1.2, k * 0.035);
  ctx.lineWidth = lw;
  if (kd === 'bat') {
    const fl = Math.sin(t * 0.5 + ph), wy = -k * 0.5;
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * k * 0.12, wy);
      ctx.scale(sx, 0.35 + 0.65 * Math.abs(fl));
      ctx.rotate(-0.25 * fl);
      ctx.fillStyle = lin(ctx, 0, -k * 0.2, k * 0.5, k * 0.1, [0, '#7a3a5a'], [1, '#3a1c38']);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(k * 0.18, -k * 0.32, k * 0.52, -k * 0.12);
      ctx.quadraticCurveTo(k * 0.4, -k * 0.02, k * 0.42, k * 0.08);
      ctx.quadraticCurveTo(k * 0.28, k * 0.0, k * 0.24, k * 0.12);
      ctx.quadraticCurveTo(k * 0.14, k * 0.02, 0, k * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,160,180,.35)';
      ctx.lineWidth = Math.max(1, k * 0.02);
      ctx.beginPath();
      ctx.moveTo(0, k * 0.02);
      ctx.lineTo(k * 0.45, -k * 0.1);
      ctx.moveTo(k * 0.1, k * 0.02);
      ctx.lineTo(k * 0.26, k * 0.08);
      ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUT;
    ctx.fillStyle = radg(ctx, -k * 0.05, wy - k * 0.05, k * 0.02, k * 0.2, [0, '#6a4a7a'], [1, '#2e1a3a']);
    ell(ctx, 0, wy, k * 0.17, k * 0.16);
    ctx.fill();
    ctx.stroke();
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#3a2048';
      ctx.beginPath();
      ctx.moveTo(sx * k * 0.06, wy - k * 0.12);
      ctx.lineTo(sx * k * 0.14, wy - k * 0.27);
      ctx.lineTo(sx * k * 0.15, wy - k * 0.09);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd84a';
      ell(ctx, sx * k * 0.065, wy - k * 0.02, k * 0.045, k * 0.04);
      ctx.fill();
      ctx.fillStyle = '#1a0a10';
      ell(ctx, sx * k * 0.06, wy - k * 0.015, k * 0.018, k * 0.03);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * k * 0.035, wy + k * 0.07);
      ctx.lineTo(sx * k * 0.02, wy + k * 0.12);
      ctx.lineTo(sx * k * 0.005, wy + k * 0.07);
      ctx.fill();
    }
    return;
  }
  if (kd === 'vine') {
    // 꼬불꼬불 몸통은 drawVine이 그린다 — 여기선 꽃봉오리 머리
    const hy = -k * 0.45;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.sin(t * 0.1 + ph) * 0.15;
      ctx.fillStyle = i % 2 ? '#ff6a8a' : '#e83a6a';
      ctx.save();
      ctx.translate(Math.cos(a) * k * 0.2, hy + Math.sin(a) * k * 0.2);
      ctx.rotate(a);
      ell(ctx, 0, 0, k * 0.13, k * 0.075);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = radg(ctx, -k * 0.04, hy - k * 0.04, k * 0.02, k * 0.2, [0, '#c6f07a'], [1, '#5aa03a']);
    ctx.beginPath();
    ctx.arc(0, hy, k * 0.17, 0, TAU);
    ctx.fill();
    ctx.stroke();
    eyes(ctx, k, [-k * 0.06, k * 0.06], hy - k * 0.03, k * 0.05, mood === 4 ? 4 : 0, 0, 0.5);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-k * 0.1, hy - k * 0.1);
    ctx.lineTo(-k * 0.02, hy - k * 0.07);
    ctx.moveTo(k * 0.1, hy - k * 0.1);
    ctx.lineTo(k * 0.02, hy - k * 0.07);
    ctx.stroke();
    ctx.fillStyle = '#5a1020';
    ctx.beginPath();
    ctx.moveTo(-k * 0.07, hy + k * 0.05);
    ctx.quadraticCurveTo(0, hy + k * 0.14, k * 0.07, hy + k * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * k * 0.045, hy + k * 0.055);
      ctx.lineTo(sx * k * 0.03, hy + k * 0.09);
      ctx.lineTo(sx * k * 0.015, hy + k * 0.06);
      ctx.fill();
    }
    return;
  }
  if (kd === 'boss') {
    const sway = Math.sin(t * 0.05 + ph) * 0.03;
    ctx.save();
    ctx.rotate(sway);
    // 뿌리 다리
    for (let i = -2; i <= 2; i++) {
      const lift = Math.max(0, Math.sin(t * 0.08 + i * 1.7)) * k * 0.03;
      ctx.fillStyle = '#4a321e';
      ctx.beginPath();
      ctx.moveTo(i * k * 0.07, -k * 0.12);
      ctx.quadraticCurveTo(i * k * 0.14, -k * 0.04 - lift, i * k * 0.17, -lift);
      ctx.lineTo(i * k * 0.12, -lift);
      ctx.quadraticCurveTo(i * k * 0.09, -k * 0.06, i * k * 0.04, -k * 0.14);
      ctx.fill();
      ctx.stroke();
    }
    // 줄기
    ctx.fillStyle = lin(ctx, -k * 0.2, 0, k * 0.2, 0, [0, '#8a6440'], [0.5, '#5e4028'], [1, '#3a2614']);
    ctx.beginPath();
    ctx.moveTo(-k * 0.2, -k * 0.1);
    ctx.quadraticCurveTo(-k * 0.15, -k * 0.5, -k * 0.13, -k * 0.72);
    ctx.lineTo(k * 0.13, -k * 0.72);
    ctx.quadraticCurveTo(k * 0.15, -k * 0.5, k * 0.2, -k * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(30,16,8,.55)';
    ctx.lineWidth = Math.max(1, k * 0.012);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * k * 0.05, -k * 0.12);
      ctx.bezierCurveTo(i * k * 0.06 + k * 0.02, -k * 0.3, i * k * 0.04 - k * 0.02, -k * 0.5, i * k * 0.035, -k * 0.7);
      ctx.stroke();
    }
    // 껍질 갑옷 (벗겨지면 맨살이 빛난다)
    if (armor > 0) {
      ctx.fillStyle = 'rgba(255,230,180,.85)';
      ell(ctx, 0, -k * 0.32, k * 0.12, k * 0.14);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,220,${0.4 + 0.3 * Math.sin(t * 0.5)})`;
      ell(ctx, 0, -k * 0.32, k * 0.08, k * 0.1);
      ctx.fill();
    } else
      for (let i = 0; i < 5; i++) {
        const px = (i % 2 ? 1 : -1) * k * 0.06, py = -k * (0.2 + i * 0.07);
        ctx.fillStyle = i % 2 ? '#3e2a18' : '#4a3220';
        rr(ctx, px - k * 0.08, py - k * 0.035, k * 0.16, k * 0.07, k * 0.03);
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = Math.max(1, k * 0.012);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,190,140,.3)';
        ctx.beginPath();
        ctx.moveTo(px - k * 0.06, py - k * 0.03);
        ctx.lineTo(px + k * 0.06, py - k * 0.03);
        ctx.stroke();
      }
    // 얼굴
    const fy = -k * 0.58;
    ctx.fillStyle = '#24140a';
    for (const sx of [-1, 1]) {
      ell(ctx, sx * k * 0.055, fy, k * 0.04, k * 0.035);
      ctx.fill();
      ctx.fillStyle = mood === 4 ? '#ffffff' : '#ffb347';
      ctx.shadowColor = '#ff8a2a';
      ctx.shadowBlur = k * 0.05;
      ell(ctx, sx * k * 0.055, fy, k * 0.02, k * 0.018);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#24140a';
    }
    ctx.strokeStyle = '#24140a';
    ctx.lineWidth = k * 0.02;
    ctx.beginPath();
    ctx.moveTo(-k * 0.11, fy - k * 0.06);
    ctx.lineTo(-k * 0.02, fy - k * 0.03);
    ctx.moveTo(k * 0.11, fy - k * 0.06);
    ctx.lineTo(k * 0.02, fy - k * 0.03);
    ctx.stroke();
    ctx.fillStyle = '#1a0c06';
    ell(ctx, 0, fy + k * 0.08, k * 0.06, mood === 4 ? k * 0.045 : k * 0.025);
    ctx.fill();
    // 이끼 수염
    ctx.fillStyle = '#5f8a3a';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * k * 0.025 - k * 0.02, fy + k * 0.1);
      ctx.quadraticCurveTo(i * k * 0.03, fy + k * 0.2 + Math.sin(t * 0.08 + i) * k * 0.01, i * k * 0.025 + k * 0.02, fy + k * 0.1);
      ctx.fill();
    }
    // 가지 팔
    for (const sx of [-1, 1]) {
      const sw2 = Math.sin(t * 0.07 + sx) * 0.15;
      ctx.save();
      ctx.translate(sx * k * 0.12, -k * 0.55);
      ctx.rotate(sx * (-0.6 + sw2));
      ctx.strokeStyle = OUT;
      ctx.lineWidth = k * 0.06;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(sx * k * 0.2, -k * 0.05);
      ctx.lineTo(sx * k * 0.28, -k * 0.12);
      ctx.moveTo(sx * k * 0.2, -k * 0.05);
      ctx.lineTo(sx * k * 0.3, k * 0.0);
      ctx.stroke();
      ctx.strokeStyle = '#5e4028';
      ctx.lineWidth = k * 0.035;
      ctx.stroke();
      ctx.restore();
    }
    // 머리 잎 왕관
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI, cr = k * 0.17;
      ctx.fillStyle = i % 2 ? '#2e5a2e' : '#3e7a36';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * cr * 1.3, -k * 0.74 + Math.sin(a) * cr * 0.9, k * 0.09, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#4e8a3e';
    ctx.beginPath();
    ctx.arc(0, -k * 0.86, k * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,170,110,.35)';
    ctx.beginPath();
    ctx.arc(-k * 0.08, -k * 0.9, k * 0.06, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  // 그루터기 · 껍질 괴물
  const big = kd === 'bark', bw = k * (big ? 0.36 : 0.31), bh = k * (big ? 0.6 : 0.52), by = -k * 0.08 - Math.abs(walk) * k * (bare ? 0.08 : 0.04);
  // 뿌리 발
  for (let i = -1; i <= 1; i++) {
    const lift = Math.max(0, Math.sin(t * (bare ? 0.5 : 0.25) + ph + i * 2.1)) * k * 0.05;
    ctx.fillStyle = bare ? '#c89070' : '#5a3a20';
    ctx.beginPath();
    ctx.moveTo(i * bw * 0.4 - k * 0.03, by);
    ctx.quadraticCurveTo(i * bw * 0.6, -lift - k * 0.02, i * bw * 0.75 + k * 0.03, -lift);
    ctx.lineTo(i * bw * 0.55, -lift);
    ctx.quadraticCurveTo(i * bw * 0.4, by + k * 0.03, i * bw * 0.4 + k * 0.03, by);
    ctx.fill();
    ctx.stroke();
  }
  // 몸통 (원기둥)
  const top = by - bh;
  ctx.fillStyle = bare ? lin(ctx, -bw, 0, bw, 0, [0, '#ffd8b8'], [0.5, '#f0b890'], [1, '#c88866']) : lin(ctx, -bw, 0, bw, 0, [0, '#a87444'], [0.45, '#7a5030'], [1, '#4a2e18']);
  ctx.beginPath();
  ctx.moveTo(-bw, top);
  ctx.lineTo(-bw * 1.05, by - k * 0.03);
  ctx.quadraticCurveTo(0, by + k * 0.05, bw * 1.05, by - k * 0.03);
  ctx.lineTo(bw, top);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!bare) {
    ctx.strokeStyle = 'rgba(40,20,8,.55)';
    ctx.lineWidth = Math.max(1, k * 0.018);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * bw * 0.38, top + k * 0.05);
      ctx.bezierCurveTo(i * bw * 0.42 + k * 0.02, top + bh * 0.4, i * bw * 0.36 - k * 0.02, top + bh * 0.7, i * bw * 0.4, by - k * 0.02);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = 'rgba(180,110,80,.45)';
    ctx.lineWidth = Math.max(1, k * 0.012);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * bw * 0.4, top + k * 0.06);
      ctx.lineTo(i * bw * 0.42, by - k * 0.04);
      ctx.stroke();
    }
  }
  if (big && !bare) {
    // 두꺼운 껍질 판
    for (let i = 0; i < 6; i++) {
      const px = ((i % 3) - 1) * bw * 0.62, py = top + bh * (0.25 + Math.floor(i / 3) * 0.42);
      ctx.fillStyle = i % 2 ? '#3a2614' : '#46301a';
      rr(ctx, px - bw * 0.3, py - bh * 0.14, bw * 0.6, bh * 0.3, k * 0.04);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1, k * 0.02);
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,160,70,.6)';
      ell(ctx, px - bw * 0.1, py - bh * 0.12, bw * 0.15, bh * 0.04);
      ctx.fill();
    }
  }
  // 나이테 윗면
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUT;
  ctx.fillStyle = bare ? '#ffe6cc' : '#e2bc84';
  ell(ctx, 0, top, bw, bw * 0.38);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = bare ? 'rgba(220,150,120,.7)' : 'rgba(150,100,50,.7)';
  ctx.lineWidth = Math.max(0.8, k * 0.012);
  for (const q of [0.72, 0.46, 0.22]) {
    ell(ctx, 0, top, bw * q, bw * 0.38 * q);
    ctx.stroke();
  }
  // 새싹
  if (!bare) {
    const sw = Math.sin(t * 0.09 + ph) * 0.3;
    ctx.save();
    ctx.translate(bw * 0.2, top - k * 0.02);
    ctx.rotate(sw);
    ctx.strokeStyle = '#4a7a2a';
    ctx.lineWidth = Math.max(1.2, k * 0.025);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -k * 0.12);
    ctx.stroke();
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#7cc84a';
      ctx.beginPath();
      ctx.ellipse(sx * k * 0.05, -k * 0.12, k * 0.055, k * 0.025, sx * 0.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1, k * 0.015);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 얼굴
  const fy = top + bh * 0.42;
  const md = bare ? 6 : mood;
  eyes(ctx, k, [-bw * 0.36, bw * 0.36], fy, k * (big ? 0.07 : 0.075), md === 6 ? 0 : md === 4 ? 4 : md === 5 ? 5 : 0, 0, md === 6 ? 0.8 : 0.4);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.4, k * 0.03);
  if (md !== 6 && md !== 5) {
    ctx.beginPath();
    ctx.moveTo(-bw * 0.62, fy - k * 0.1);
    ctx.lineTo(-bw * 0.12, fy - k * 0.06);
    ctx.moveTo(bw * 0.62, fy - k * 0.1);
    ctx.lineTo(bw * 0.12, fy - k * 0.06);
    ctx.stroke();
  }
  if (md === 6) {
    ctx.fillStyle = 'rgba(255,80,90,.6)';
    for (const sx of [-1, 1]) {
      ell(ctx, sx * bw * 0.55, fy + k * 0.06, k * 0.05, k * 0.025);
      ctx.fill();
    }
    ctx.strokeStyle = OUT;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) ctx.lineTo(-k * 0.06 + i * k * 0.04, fy + k * 0.11 + (i % 2) * k * 0.02);
    ctx.stroke();
    ctx.fillStyle = '#8fd8ff';
    ctx.beginPath();
    ctx.arc(bw * 0.9, top + k * 0.06, k * 0.03, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = '#3a140c';
    ctx.beginPath();
    ctx.moveTo(-bw * 0.4, fy + k * 0.08);
    ctx.quadraticCurveTo(0, fy + k * (mood === 4 ? 0.22 : 0.17), bw * 0.4, fy + k * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff6e6';
    for (let i = 0; i < 3; i++) {
      const tx = -bw * 0.25 + i * bw * 0.25;
      ctx.beginPath();
      ctx.moveTo(tx - k * 0.02, fy + k * 0.09);
      ctx.lineTo(tx, fy + k * 0.125);
      ctx.lineTo(tx + k * 0.02, fy + k * 0.09);
      ctx.fill();
    }
  }
  // 잔가지 팔
  for (const sx of [-1, 1]) {
    const wv = Math.sin(t * 0.2 + ph + sx) * 0.4 + (bare ? 0.8 : 0);
    ctx.save();
    ctx.translate(sx * bw, top + bh * 0.55);
    ctx.rotate(sx * (-0.4 - wv * 0.5));
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.5, k * 0.045);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sx * k * 0.16, -k * 0.04);
    ctx.lineTo(sx * k * 0.21, -k * 0.1);
    ctx.moveTo(sx * k * 0.16, -k * 0.04);
    ctx.lineTo(sx * k * 0.23, -k * 0.01);
    ctx.stroke();
    ctx.strokeStyle = bare ? '#d89a78' : '#7a5030';
    ctx.lineWidth = Math.max(1, k * 0.022);
    ctx.stroke();
    ctx.restore();
  }
}

/** 덩굴 몸통: 머리 뒤로 꼬불꼬불 잎 달린 줄기 */
function drawVine(ctx: C2, x: number, y: number, k: number, ux: number, uy: number, t: number, seed: number) {
  const pts: number[] = [];
  for (let i = 0; i <= 8; i++) {
    const d = i * k * 0.12, o = Math.sin(t * 0.3 + i * 0.9 + seed) * k * 0.08 * Math.min(1, i / 2);
    pts.push(x - ux * d - uy * o, y - k * 0.12 - uy * d * 0.8 + ux * o);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [c, lw] of [[OUT, k * 0.16], ['#3e8a32', k * 0.1], ['#7cc85a', k * 0.035]] as [string, number][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) (i ? ctx.lineTo(pts[i], pts[i + 1]) : ctx.moveTo(pts[i], pts[i + 1]));
    ctx.stroke();
  }
  for (let i = 2; i < pts.length - 2; i += 4) {
    const sx = (i / 2) % 2 ? 1 : -1;
    ctx.fillStyle = '#5ab04a';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1, k * 0.02);
    ctx.save();
    ctx.translate(pts[i], pts[i + 1]);
    ctx.rotate(Math.atan2(uy, ux) + sx * 1.3);
    ell(ctx, k * 0.08, 0, k * 0.08, k * 0.035);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawRock(ctx: C2, x: number, y: number, r: number, flash: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,10,24,.4)';
  ell(ctx, r * 0.15, r * 0.1, r * 1.25, r * 0.42);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 1.1, 0);
  ctx.bezierCurveTo(-r * 1.2, -r * 0.9, -r * 0.4, -r * 1.35, r * 0.25, -r * 1.2);
  ctx.bezierCurveTo(r * 0.95, -r * 1.05, r * 1.2, -r * 0.4, r * 1.08, 0);
  ctx.quadraticCurveTo(0, r * 0.35, -r * 1.1, 0);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -r, -r * 1.2, r, r * 0.2, [0, '#d8cbd0'], [0.45, '#8e8496'], [1, '#4c4258']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#6a9a3a';
  ell(ctx, -r * 0.2, -r * 1.15, r * 0.9, r * 0.35);
  ctx.fill();
  ctx.fillStyle = '#9ac85a';
  ell(ctx, -r * 0.35, -r * 1.22, r * 0.45, r * 0.15);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,190,140,.3)';
  ell(ctx, -r * 0.6, -r * 0.6, r * 0.3, r * 0.5);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,30,50,.6)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -r * 0.8);
  ctx.lineTo(r * 0.45, -r * 0.45);
  ctx.lineTo(r * 0.35, -r * 0.2);
  ctx.stroke();
  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fff6c0';
    ell(ctx, 0, -r * 0.6, r * 1.1, r * 0.75);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 전나무 (쓰러지는 중이면 밑동을 축으로 dir 쪽으로 눕는다) */
function drawTree(ctx: C2, x: number, y: number, H: number, ang: number, dx: number, dy: number, logL: number, t: number, P: Pal) {
  const tx = x + dx * logL * Math.sin(ang), ty = y - H * Math.cos(ang) + dy * logL * 0.8 * Math.sin(ang);
  const len = Math.hypot(tx - x, ty - y) || 1, rot = Math.atan2(tx - x, -(ty - y));
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,10,24,.35)';
  ell(ctx, (dx * logL * Math.sin(ang)) / 2, H * 0.03, H * 0.18 + Math.abs(dx) * logL * Math.sin(ang) * 0.5, H * 0.06);
  ctx.fill();
  ctx.rotate(rot);
  ctx.scale(1, len / H);
  const sw = ang === 0 ? Math.sin(t * 0.04 + x) * 0.02 : 0;
  ctx.rotate(sw);
  ctx.fillStyle = '#5a3a20';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  rr(ctx, -H * 0.04, -H * 0.25, H * 0.08, H * 0.25, H * 0.02);
  ctx.fill();
  ctx.stroke();
  const ga = ctx.globalAlpha;
  fir(ctx, 0, -H * 0.15, H * 0.85, H * 0.66, '#1f402a', P.rim, 7, 5);
  ctx.globalAlpha = ga * 0.55;
  fir(ctx, -H * 0.03, -H * 0.18, H * 0.74, H * 0.42, '#3e7444', null, 9, 5);
  ctx.globalAlpha = ga * 0.35;
  fir(ctx, -H * 0.06, -H * 0.24, H * 0.6, H * 0.2, '#8ab060', null, 11, 4);
  ctx.globalAlpha = ga;
  ctx.restore();
}

function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.1);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.07;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, 0);
  ctx.lineTo(-k * 0.12, k * 0.55);
  ctx.quadraticCurveTo(-k * 0.45, k * 0.42, -k * 0.38, k * 0.62);
  ctx.lineTo(-k * 0.12, k * 1.05);
  ctx.quadraticCurveTo(k * 0.1, k * 1.25, k * 0.42, k * 1.05);
  ctx.quadraticCurveTo(k * 0.55, k * 0.75, k * 0.48, k * 0.5);
  ctx.quadraticCurveTo(k * 0.45, k * 0.38, k * 0.32, k * 0.4);
  ctx.quadraticCurveTo(k * 0.3, k * 0.3, k * 0.18, k * 0.32);
  ctx.quadraticCurveTo(k * 0.15, k * 0.24, k * 0.1, k * 0.26);
  ctx.lineTo(k * 0.1, 0);
  ctx.quadraticCurveTo(-k * 0.01, -k * 0.14, -k * 0.12, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function drawSquirrel(ctx: C2, x: number, y: number, k: number, t: number, cheer: number, cover: number) {
  ctx.save();
  ctx.translate(x, y - (cheer > 0 ? Math.abs(Math.sin(cheer * 0.25)) * k * 0.5 : 0));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, k * 0.05);
  // 꼬리
  const sw = Math.sin(t * 0.08) * 0.2;
  ctx.fillStyle = '#c86a2a';
  ctx.beginPath();
  ctx.moveTo(k * 0.15, -k * 0.1);
  ctx.bezierCurveTo(k * 0.7, -k * 0.2 + sw * k, k * 0.6, -k * 1.0, k * 0.25, -k * 0.95);
  ctx.bezierCurveTo(k * 0.55, -k * 0.75, k * 0.35, -k * 0.35, k * 0.05, -k * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,140,.5)';
  ell(ctx, k * 0.4, -k * 0.6, k * 0.08, k * 0.2, 0.4);
  ctx.fill();
  // 몸
  ctx.fillStyle = '#b25a24';
  ell(ctx, 0, -k * 0.25, k * 0.2, k * 0.26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f6dcb0';
  ell(ctx, -k * 0.04, -k * 0.2, k * 0.1, k * 0.16);
  ctx.fill();
  // 머리
  ctx.fillStyle = '#b25a24';
  ctx.beginPath();
  ctx.arc(-k * 0.05, -k * 0.6, k * 0.17, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, -k * 0.72);
  ctx.lineTo(-k * 0.1, -k * 0.9);
  ctx.lineTo(-k * 0.0, -k * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (cover > 0) {
    ctx.fillStyle = '#c86a2a';
    ell(ctx, -k * 0.1, -k * 0.63, k * 0.12, k * 0.06);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#1a0a04';
    ctx.beginPath();
    ctx.arc(-k * 0.12, -k * 0.63, k * 0.035, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-k * 0.13, -k * 0.645, k * 0.012, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#3a1a0a';
  ctx.beginPath();
  ctx.arc(-k * 0.21, -k * 0.57, k * 0.025, 0, TAU);
  ctx.fill();
  // 도토리
  ctx.fillStyle = '#c08a40';
  ell(ctx, -k * 0.18, -k * 0.32, k * 0.07, k * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6a4220';
  ell(ctx, -k * 0.18, -k * 0.38, k * 0.08, k * 0.035);
  ctx.fill();
  ctx.restore();
}

const FOE_H: Record<K, number> = { stump: 0.135, vine: 0.115, bark: 0.155, bat: 0.11, boss: 0.38 };
const JACK_H = 0.2, TREE_H = 0.33;
const depth = (y: number) => 0.8 + 0.3 * clamp((y - HZ) / (1.12 - HZ), 0, 1);
const fenceMem = new WeakMap<object, { broken: boolean[]; max: number; stage: number; tries: number }>();
const recentSay = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();

/** 울타리 판자 자리 (가운데 나무꾼 자리는 비운다) */
function plankXs(n: number) {
  const out: number[] = [];
  const left = Math.ceil(n / 2), right = n - left;
  for (let i = 0; i < left; i++) out.push(0.4 - (i * 0.24) / Math.max(1, left - 1 || 1) - (left === 1 ? 0.08 : 0));
  for (let i = 0; i < right; i++) out.push(0.6 + (i * 0.24) / Math.max(1, right - 1 || 1) + (right === 1 ? 0.08 : 0));
  return out.sort((a, b) => a - b);
}

function drawAll(ctx: C2, s: AxeState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], P = PAL[d.place], t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const bg = getBg(Math.round(w), Math.round(h), d.place, Math.min(3, Math.max(1, Math.round(sc))));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const cam = s.cam, lv = lvOf(s.combo), play = s.phase === 'play';
  const aiming = play && s.down && s.aim;
  let marks: Mark[] = [], falls: FallMark[] = [], prevSim: Sim | null = null, prevFl: Flight | null = null;
  if (aiming) {
    prevFl = flightFor(s, s.aim!.x, s.aim!.y, lv);
    prevSim = simThrow(s, predict(s, 0), prevFl, lv, marks, falls);
  }
  // 울타리 판자 (연출용 기억)
  let fm = fenceMem.get(s);
  if (!fm || fm.stage !== s.stage || fm.tries !== s.tries || fm.max !== d.boards) fenceMem.set(s, (fm = { broken: plankXs(d.boards).map(() => false), max: d.boards, stage: s.stage, tries: s.tries }));
  const pxs = plankXs(d.boards);

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 먼 숲 · 숲 가장자리 (시차) ──
  ctx.fillStyle = P.sky[0];
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.drawImage(bg.sky, 0, 0, w, Y(HZ) + R(0.02));
  ctx.drawImage(bg.far, -R(0.12) - cam * R(0.05), Y(HZ) - R(0.19), bg.far.width / sc, bg.far.height / sc);
  ctx.drawImage(bg.ground, 0, Y(HZ), w, h - Y(HZ));
  ctx.drawImage(bg.mid, -R(0.15) - cam * R(0.11), Y(HZ) - R(0.33) + R(0.012), bg.mid.width / sc, bg.mid.height / sc);
  // 노을 빛줄기
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 3; j++) {
    const a = 0.025 + 0.015 * Math.sin(t * 0.01 + j * 2);
    ctx.fillStyle = `rgba(${P.glow},${a})`;
    ctx.beginPath();
    const x0 = X(0.18 + j * 0.13) - cam * R(0.05);
    ctx.moveTo(x0, Y(HZ) - R(0.02));
    ctx.lineTo(x0 + R(0.06), Y(HZ) - R(0.02));
    ctx.lineTo(x0 + R(0.5), Y(1.2));
    ctx.lineTo(x0 + R(0.3), Y(1.2));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // ── 땅 위: 통나무 · 그루터기 · 위험 표시 ──
  for (const tr of s.trees) {
    if (tr.st !== 2) continue;
    const a = clamp(1 - (tr.ft - 150) / 60, 0, 1);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      drawTree(ctx, X(tr.x), Y(tr.y), R(TREE_H) * depth(tr.y), Math.PI / 2, tr.dx, tr.dy, R(LOG_L), t, P);
      ctx.restore();
    }
    // 밑동 + 새싹
    ctx.fillStyle = '#e2bc84';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ell(ctx, X(tr.x), Y(tr.y), R(0.028), R(0.012));
    ctx.fill();
    ctx.stroke();
    const grow = clamp((tr.ft - 200) / (REGROW - 200), 0, 1);
    if (grow > 0) {
      ctx.strokeStyle = '#4a8a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(tr.x), Y(tr.y));
      ctx.lineTo(X(tr.x), Y(tr.y) - R(0.04) * grow);
      ctx.stroke();
      ctx.fillStyle = '#7cc84a';
      ell(ctx, X(tr.x) + R(0.01), Y(tr.y) - R(0.04) * grow, R(0.012) * grow, R(0.006) * grow);
      ctx.fill();
    }
  }
  // 오두막 (지붕 · 굴뚝 · 다람쥐)
  const cabY = Y(RIDGE_Y) - R(0.03);
  ctx.drawImage(bg.cabin, 0, cabY, w, bg.cabin.height / sc);
  {
    const chx = X(0.69), chy = Y(RIDGE_Y) - R(0.05);
    for (let j = 0; j < 7; j++) {
      const u = ((t * 0.006 + j / 7) % 1), px = chx + Math.sin(u * 6 + j) * R(0.02) + u * R(0.08), py = chy - R(0.02) - u * R(0.3);
      ctx.fillStyle = `rgba(230,210,220,${0.35 * (1 - u)})`;
      ctx.beginPath();
      ctx.arc(px, py, R(0.015 + u * 0.04), 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = lin(ctx, chx - R(0.035), 0, chx + R(0.035), 0, [0, '#a8a0a8'], [1, '#5e5664']);
    rr(ctx, chx - R(0.035), chy, R(0.07), R(0.09), R(0.008));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,30,40,.5)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(chx - R(0.035), chy + j * R(0.022) + R(0.02));
      ctx.lineTo(chx + R(0.035), chy + j * R(0.022) + R(0.02));
      ctx.stroke();
    }
    ctx.fillStyle = '#4a4250';
    rr(ctx, chx - R(0.042), chy - R(0.012), R(0.084), R(0.018), R(0.006));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    const cheer = t - s.squirT < 60 ? t - s.squirT : 0, cover = t - s.bangT < 60 ? 1 : 0;
    drawSquirrel(ctx, X(0.25), Y(RIDGE_Y) + R(0.02), R(0.065), t, cheer, cover);
    if (cheer > 0 && cheer < 40) {
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(40,10,20,.7)';
      ctx.strokeText('우와!', X(0.25), Y(RIDGE_Y) - R(0.08));
      ctx.fillStyle = '#fff3c4';
      ctx.fillText('우와!', X(0.25), Y(RIDGE_Y) - R(0.08));
    }
  }
  // 울타리
  {
    const fy = Y(FENCE_Y);
    ctx.lineCap = 'round';
    for (const [x0, x1] of [[0.08, 0.43], [0.57, 0.92]]) {
      for (const dy of [-R(0.04), -R(0.018)]) {
        ctx.strokeStyle = OUT;
        ctx.lineWidth = R(0.016);
        ctx.beginPath();
        ctx.moveTo(X(x0), fy + dy);
        ctx.lineTo(X(x1), fy + dy);
        ctx.stroke();
        ctx.strokeStyle = '#a0703e';
        ctx.lineWidth = R(0.009);
        ctx.stroke();
      }
    }
    pxs.forEach((px, i) => {
      const broken = fm!.broken[i], x = X(px), pw = R(0.05), ph = broken ? R(0.025) : R(0.075);
      ctx.fillStyle = 'rgba(20,10,20,.3)';
      ell(ctx, x, fy + R(0.004), pw * 0.6, R(0.008));
      ctx.fill();
      ctx.fillStyle = broken ? '#6a4628' : lin(ctx, x - pw / 2, 0, x + pw / 2, 0, [0, '#e2b07a'], [1, '#9a6438']);
      ctx.beginPath();
      ctx.moveTo(x - pw / 2, fy);
      ctx.lineTo(x - pw / 2, fy - ph);
      if (broken) {
        ctx.lineTo(x - pw * 0.2, fy - ph + R(0.008));
        ctx.lineTo(x, fy - ph - R(0.004));
        ctx.lineTo(x + pw * 0.25, fy - ph + R(0.01));
      } else ctx.lineTo(x, fy - ph - R(0.018));
      ctx.lineTo(x + pw / 2, fy - ph);
      ctx.lineTo(x + pw / 2, fy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (!broken) {
        ctx.fillStyle = '#5a5060';
        for (const ny of [0.04, 0.018]) {
          ctx.beginPath();
          ctx.arc(x, fy - R(ny), R(0.004), 0, TAU);
          ctx.fill();
        }
      }
    });
  }
  // 겨눈 길: 땅에 도끼 폭 띠
  if (prevFl) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.axe ? 'rgba(255,240,210,.06)' : 'rgba(255,240,210,.11)';
    ctx.lineWidth = 2 * axeR(lv) * w;
    ctx.beginPath();
    for (let i = 0; i < prevFl.n; i++) (i ? ctx.lineTo(X(prevFl.xs[i]), Y(prevFl.ys[i])) : ctx.moveTo(X(prevFl.xs[i]), Y(prevFl.ys[i])));
    ctx.stroke();
    for (const fa of falls) {
      const ex = fa.x + fa.dx * LOG_L, ey = fa.y + fa.dy * LOG_L * 0.8;
      ctx.strokeStyle = fa.n >= 2 ? 'rgba(255,190,90,.45)' : 'rgba(200,150,100,.3)';
      ctx.lineWidth = R(LOG_W * 2);
      ctx.beginPath();
      ctx.moveTo(X(fa.x), Y(fa.y));
      ctx.lineTo(X(ex), Y(ey));
      ctx.stroke();
      ctx.setLineDash([R(0.015), R(0.01)]);
      ctx.strokeStyle = '#ffd890';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  // 위험: 울타리에 거의 닿은 괴물 → 빨간 길
  for (const f of s.foes) {
    if (f.st !== 0 || hidden(f, s.wt) || f.k === 'boss') continue;
    const rem = remain(f, s.wt);
    if (rem > 0.16) continue;
    const a = 0.4 + 0.3 * Math.sin(t * 0.4);
    ctx.strokeStyle = `rgba(255,70,50,${a})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(X(f.x), Y(f.y));
    ctx.lineTo(X(f.wp[f.wp.length - 2]), Y(f.wp[f.wp.length - 1]));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,70,50,${a * 0.5})`;
    ell(ctx, X(f.x), Y(f.y), R(0.045), R(0.018));
    ctx.fill();
  }
  // 도끼 그림자 (땅)
  if (s.axe) {
    const k = Math.min(s.axe.fl.n - 1, Math.floor(s.axe.i)), ax0 = s.axe.fl.xs[k], ay0 = s.axe.fl.ys[k];
    ctx.fillStyle = 'rgba(20,10,20,.32)';
    ell(ctx, X(ax0), Y(ay0), R(s.axe.r * 0.9), R(s.axe.r * 0.35));
    ctx.fill();
  }
  // ── 서 있는 것들: 깊이(발 y) 순서로 ──
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  const bounceT = fx.memo.bounceT ?? -99;
  for (const r of s.rocks) items.push({ y: r.y, draw: () => drawRock(ctx, X(r.x), Y(r.y), R(r.r) * 1.05, Math.max(0, 1 - (t - bounceT) / 10) * (Math.hypot((fx.memo.bounceX ?? 0) - r.x, (fx.memo.bounceY ?? 0) - r.y) < r.r + 0.05 ? 1 : 0)) });
  for (const tr of s.trees) {
    if (tr.st === 2) continue;
    const ang = tr.st === 1 ? Math.min(1, (tr.ft / FALL) ** 2) * (Math.PI / 2) : 0;
    const grow = tr.st === 0 && t - tr.t < 20 ? (t - tr.t) / 20 : 1;
    items.push({ y: tr.y, draw: () => drawTree(ctx, X(tr.x), Y(tr.y), R(TREE_H) * depth(tr.y) * grow, ang, tr.dx, tr.dy, R(LOG_L), t, P) });
  }
  const targeted = new Set(marks.map((m) => m.id));
  const drawFoe = (f: Foe) => {
    const k = R(FOE_H[f.k]) * depth(f.y), hid = hidden(f, s.wt);
    if (hid && !f.pre) return;
    const em = clamp((s.wt - f.t0) / 18, 0, 1), emerging = !f.pre && f.k !== 'bat' && em < 1 && f.wp[1] <= SPAWN_Y + 0.01;
    let fxp = X(f.x), fyp = Y(f.y);
    const air = f.k === 'bat' ? R(0.07) + Math.sin(t * 0.2 + f.seed) * R(0.008) : 0;
    let mood = 0;
    if (f.st === 1) {
      // 쾅! 울타리에 박치기하고 데굴데굴
      const u = f.stT / BANG_T;
      fyp += -Math.sin(u * Math.PI) * R(0.06) + u * R(0.02);
      fxp += Math.sin(u * 12) * R(0.01);
      mood = 4;
    }
    ctx.save();
    ctx.translate(fxp, fyp);
    if (f.k === 'bat' || f.k !== 'vine') {
      ctx.fillStyle = 'rgba(20,10,20,.35)';
      ell(ctx, 0, 0, k * (f.k === 'boss' ? 0.32 : f.k === 'bat' ? 0.18 : 0.3), k * (f.k === 'bat' ? 0.05 : 0.08));
      ctx.fill();
    }
    if (f.st === 1) {
      ctx.rotate(Math.sin((f.stT / BANG_T) * 9) * 0.4);
      ctx.globalAlpha = clamp(1 - (f.stT - BANG_T * 0.6) / (BANG_T * 0.4), 0, 1);
    }
    if (emerging) ctx.translate(0, (1 - em) * k * 0.4);
    const hitAge = t - f.hitT;
    if (hitAge < 8) ctx.translate(Math.sin(hitAge * 2.5) * k * 0.06, 0);
    if (targeted.has(f.id) && aiming) {
      ctx.shadowColor = '#fff1b0';
      ctx.shadowBlur = k * 0.25;
    }
    if (f.k === 'vine') {
      ctx.translate(-fxp, -fyp);
      drawVine(ctx, fxp, fyp, k, f.ux, f.uy, t, f.seed % 7);
      ctx.translate(fxp, fyp);
    }
    ctx.translate(0, -air);
    const face = f.ux < -0.2 ? -1 : 1;
    ctx.scale(face, 1);
    drawFoeBody(ctx, f.k, k, t, f.seed, f.bare, mood || (hitAge < 12 ? 4 : 0), f.k === 'boss' && s.wt < f.armT ? 1 : 0);
    ctx.shadowBlur = 0;
    if (hitAge < 5) {
      ctx.globalAlpha = 0.6 * (1 - hitAge / 5);
      ctx.fillStyle = '#ffffff';
      ell(ctx, 0, -k * 0.4, k * 0.35, k * 0.4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 대장 체력 (잎사귀 줄)
    if (f.k === 'boss') {
      const bw2 = R(0.22), bx = fxp - bw2 / 2, by2 = fyp - k * 1.08;
      ctx.fillStyle = 'rgba(20,10,20,.6)';
      rr(ctx, bx - 3, by2 - 3, bw2 + 6, R(0.022) + 6, R(0.012));
      ctx.fill();
      ctx.fillStyle = lin(ctx, bx, 0, bx + bw2, 0, [0, '#7cc84a'], [1, '#3e8a32']);
      rr(ctx, bx, by2, (bw2 * Math.max(0, f.hp)) / BOSS_HP, R(0.022), R(0.01));
      ctx.fill();
      if (s.wt < f.armT) {
        font(0.032, 900);
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(40,10,10,.8)';
        ctx.strokeText('지금! 한 번 더', fxp, by2 - R(0.03));
        ctx.fillStyle = '#ffe36a';
        ctx.fillText('지금! 한 번 더', fxp, by2 - R(0.03));
      }
    }
    if (f.st === 0 && !hid && f.k !== 'boss' && remain(f, s.wt) < 0.16) {
      const pulse = 1 + 0.15 * Math.sin(t * 0.6);
      ctx.save();
      ctx.translate(fxp + k * 0.25, fyp - air - k * 1.05);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ff4a3d';
      ctx.beginPath();
      ctx.arc(0, 0, R(0.02), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.03, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, 1);
      ctx.restore();
    }
  };
  for (const f of s.foes) items.push({ y: f.y + (f.k === 'bat' ? 0.05 : 0), draw: () => drawFoe(f) });
  // 베인 괴물: 윗동이 날아가고 아랫동이 남았다 사라진다
  for (const c of s.cuts) {
    const age = t - c.t;
    items.push({
      y: c.y,
      draw: () => {
        const k = R(FOE_H[c.k]) * depth(c.y), cx = X(c.x), cy = Y(c.y) - (c.k === 'bat' ? R(0.07) : 0);
        if (c.how === 1) {
          const sq = Math.max(0.2, 1 - age / 5);
          ctx.save();
          ctx.globalAlpha = clamp(1 - (age - 40) / 25, 0, 1);
          ctx.translate(cx, cy);
          ctx.scale(1 + (1 - sq) * 0.6, sq);
          drawFoeBody(ctx, c.k, k, 0, c.seed, c.bare, 5, 0);
          ctx.restore();
          return;
        }
        if (c.how === 2) {
          ctx.save();
          ctx.globalAlpha = clamp(1 - age / 25, 0, 1);
          ctx.translate(cx, cy - age * 1.5);
          ctx.scale(1 - age / 40, 1 - age / 40);
          drawFoeBody(ctx, c.k, k, t, c.seed, c.bare, 4, 0);
          ctx.restore();
          return;
        }
        const cutY = -k * (c.k === 'boss' ? 0.5 : 0.45), dir = Math.cos(c.a) >= 0 ? 1 : -1;
        // 아랫동
        ctx.save();
        ctx.globalAlpha = clamp(1 - (age - 18) / 20, 0, 1);
        ctx.translate(cx, cy + Math.max(0, age - 18) * 0.4);
        ctx.beginPath();
        ctx.rect(-k, cutY, k * 2, k * 2);
        ctx.clip();
        drawFoeBody(ctx, c.k, k, 0, c.seed, c.bare, 4, 0);
        ctx.restore();
        if (age < 26 && c.k !== 'bat' && c.k !== 'vine') {
          ctx.globalAlpha = clamp(1 - (age - 18) / 8, 0, 1);
          ctx.fillStyle = '#f2d29a';
          ell(ctx, cx, cy + cutY, k * 0.3, k * 0.1);
          ctx.fill();
          ctx.strokeStyle = 'rgba(150,100,50,.8)';
          ctx.lineWidth = 1;
          ell(ctx, cx, cy + cutY, k * 0.16, k * 0.05);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // 윗동 (빙글 날아간다)
        ctx.save();
        ctx.globalAlpha = clamp(1 - age / 45, 0, 1);
        ctx.translate(cx + dir * age * R(0.004), cy - age * R(0.008) + age * age * R(0.00035));
        ctx.rotate(dir * age * 0.15);
        ctx.beginPath();
        ctx.rect(-k, -k * 2, k * 2, k * 2 + cutY);
        ctx.clip();
        drawFoeBody(ctx, c.k, k, 0, c.seed, c.bare, 4, 0);
        ctx.restore();
        // 베인 자리 하얀 줄
        if (age < 6) {
          ctx.strokeStyle = `rgba(255,255,255,${1 - age / 6})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx - k * 0.45, cy + cutY + k * 0.05);
          ctx.lineTo(cx + k * 0.45, cy + cutY - k * 0.05);
          ctx.stroke();
        }
      },
    });
  }
  // 나무꾼
  {
    const since = t - s.throwT, caught = t - s.catchT;
    let pose = 0;
    if (s.phase === 'result') pose = s.ok ? 7 : 6;
    else if (s.mood === 4) pose = 5;
    else if (s.down) pose = s.axe ? 3 : 1;
    else if (since < 14) pose = 2;
    else if (s.axe) pose = 3;
    else if (caught < 22) pose = 4;
    const k = R(JACK_H);
    let ax = 0, ay = -1;
    if (s.aim) (ax = s.aim.x - HX), (ay = s.aim.y - HY);
    else if (s.axe) {
      const kk = Math.min(s.axe.fl.n - 1, Math.floor(s.axe.i));
      (ax = s.axe.fl.xs[kk] - HX), (ay = s.axe.fl.ys[kk] - HY);
    }
    items.push({ y: FEET_Y, draw: () => drawJack(ctx, X(HX), Y(FEET_Y), k, pose, t, lv, ax, ay, !s.axe && pose !== 2) });
  }
  // 숲 가장자리 앞 덤불 (괴물이 뒤에서 나온다)
  items.push({
    y: SPAWN_Y + 0.012,
    draw: () => {
      for (let k = 0; k < 22; k++) {
        const x = (k / 21) * w + Math.sin(k * 3.1) * R(0.02) - cam * R(0.11) * 0.6, r = R(0.026 + hsh(k * 7) * 0.016), by = Y(HZ) + R(0.012);
        ctx.fillStyle = '#26342a';
        ctx.beginPath();
        ctx.arc(x, by - r * 0.4, r, Math.PI, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(${P.glow},.25)`;
        ctx.beginPath();
        ctx.arc(x - r * 0.3, by - r * 0.8, r * 0.4, Math.PI, TAU);
        ctx.fill();
      }
    },
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // ── 날아가는 도끼: 꼬리 흔적 + 빙글빙글 ──
  if (s.axe) {
    const a = s.axe, k = Math.min(a.fl.n - 1, Math.floor(a.i)), u = k / Math.max(1, a.fl.n - 1);
    const z = R(0.05 + 0.035 * Math.sin(u * Math.PI));
    const L = R(0.085 + 0.016 * a.lv), gold = a.lv >= 3;
    if (s.trail.length >= 4) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const n = s.trail.length / 2;
      for (let i = 1; i < n; i++) {
        const q = i / n;
        ctx.strokeStyle = gold ? `rgba(255,214,90,${0.5 * q})` : `rgba(255,255,255,${0.45 * q})`;
        ctx.lineWidth = R(a.r) * 1.4 * q;
        ctx.beginPath();
        ctx.moveTo(X(s.trail[i * 2 - 2]), Y(s.trail[i * 2 - 1]) - z);
        ctx.lineTo(X(s.trail[i * 2]), Y(s.trail[i * 2 + 1]) - z);
        ctx.stroke();
      }
      ctx.restore();
    }
    const px = X(a.fl.xs[k]), py = Y(a.fl.ys[k]) - z;
    // 빙글 잔상 고리
    ctx.strokeStyle = gold ? 'rgba(255,220,120,.5)' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, L * 0.75, a.spin, a.spin + 2.2);
    ctx.stroke();
    for (let g = 2; g >= 1; g--) {
      ctx.globalAlpha = 0.18 * (3 - g);
      drawAxe(ctx, px, py, L, a.spin - g * 0.45, a.lv, true);
    }
    ctx.globalAlpha = 1;
    drawAxe(ctx, px, py, L, a.spin, a.lv, true);
  }
  // ── 겨눈 길: 점선(갈 때 주황 · 올 때 하늘색) · 벨 차례 번호 ──
  if (prevFl && prevSim && s.aim) {
    const fl = prevFl, pulse = 0.5 + 0.5 * Math.sin(t * 0.4);
    ctx.save();
    ctx.globalAlpha = s.axe ? 0.55 : 1;
    for (let i = 2; i < fl.n; i += 2) {
      const leg = i >= fl.turn, x = X(fl.xs[i]), y = Y(fl.ys[i]) - R(0.03);
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(x, y, R(0.009), 0, TAU);
      ctx.fill();
      ctx.fillStyle = leg ? '#8fe6ff' : '#ffc24a';
      ctx.beginPath();
      ctx.arc(x, y, R(0.0062), 0, TAU);
      ctx.fill();
    }
    // 화살촉 (나가는 쪽 · 돌아오는 쪽)
    for (const fr of [0.25, 0.75]) {
      const i = Math.min(fl.n - 2, Math.max(1, Math.floor(fl.n * fr))), x0 = X(fl.xs[i]), y0 = Y(fl.ys[i]) - R(0.03), an = Math.atan2(fl.ys[i + 1] - fl.ys[i], fl.xs[i + 1] - fl.xs[i]);
      ctx.save();
      ctx.translate(x0, y0);
      ctx.rotate(an);
      ctx.fillStyle = fr < 0.5 ? '#ffc24a' : '#8fe6ff';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(R(0.022), 0);
      ctx.lineTo(-R(0.012), -R(0.014));
      ctx.lineTo(-R(0.012), R(0.014));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    for (const b of fl.bounce) {
      ctx.fillStyle = '#ffffff';
      starPath(ctx, X(fl.xs[b]), Y(fl.ys[b]) - R(0.03), R(0.022) * (0.8 + 0.3 * pulse));
      ctx.fill();
    }
    // 돌아서는 곳: 유령 도끼
    ctx.globalAlpha *= 0.55;
    drawAxe(ctx, X(fl.xs[fl.turn]), Y(fl.ys[fl.turn]) - R(0.03), R(0.08 + 0.016 * lv), t * 0.3, lv, true);
    ctx.globalAlpha = s.axe ? 0.55 : 1;
    // 벨 차례 번호
    const per = new Map<number, number>();
    for (const m of marks) {
      const f = s.foes.find((q) => q.id === m.id);
      if (!f) continue;
      const nth = per.get(m.id) ?? 0;
      per.set(m.id, nth + 1);
      const k = R(FOE_H[f.k]) * depth(f.y), bx = X(f.x) + (nth ? R(0.05) : 0), by = Y(f.y) - k * (f.k === 'boss' ? 1.2 : 1.12) - (f.k === 'bat' ? R(0.07) : 0);
      const col = m.leg === 2 ? '#c88a4a' : m.leg ? '#3ab8ea' : '#ff9a2a';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bx, by, R(0.022), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.03, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const txt = m.kind === 0 ? String(m.n) : m.kind === 3 ? `-${m.n}` : '껍';
      ctx.fillText(txt, bx, by + 1);
    }
    // 길 라벨: 갈 때 · 올 때 → 받기 연속
    const tx = clamp(X(fl.xs[fl.turn]), R(0.2), w - R(0.2)), ty = clamp(Y(fl.ys[fl.turn]) - R(0.1), Y(HZ) + R(0.03), Y(0.95));
    const oN = prevSim.outN, bN = prevSim.backN;
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const l1 = `갈 때 ${oN} · 올 때 ${bN}`;
    const l2 = prevSim.two ? '받기 연속 +1!' : s.combo > 0 ? '연속 끊겨요' : '';
    const bw3 = Math.max(ctx.measureText(l1).width, l2 ? ctx.measureText(l2).width : 0) + R(0.05);
    ctx.fillStyle = 'rgba(30,14,28,.82)';
    rr(ctx, tx - bw3 / 2, ty - R(0.026), bw3, l2 ? R(0.09) : R(0.052), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#ffe6c0';
    ctx.fillText(l1, tx, ty);
    if (l2) {
      ctx.fillStyle = prevSim.two ? '#ffd84a' : '#ff9a8a';
      ctx.fillText(l2, tx, ty + R(0.04));
    }
    if (s.axe) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('돌아오면 바로 던져요', X(HX), Y(0.98));
    }
    // 손가락 자리
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(s.aim.x), Y(s.aim.y), R(0.022 + 0.006 * pulse), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  // 반딧불 · 떨어지는 잎
  for (let j = 0; j < 10; j++) {
    const xx = (hsh(j + 20) * w + Math.sin(t * 0.011 + j) * R(0.06) - cam * R(0.04) + w) % w, yy = Y(HZ) + hsh(j + 21) * R(0.75) + Math.sin(t * 0.017 + j * 3) * R(0.03);
    const gl = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.03 + j));
    ctx.fillStyle = radg(ctx, xx, yy, 0, R(0.02), [0, `rgba(255,240,150,${0.75 * gl})`], [1, 'rgba(255,240,150,0)']);
    ctx.beginPath();
    ctx.arc(xx, yy, R(0.02), 0, TAU);
    ctx.fill();
  }
  for (let j = 0; j < 6; j++) {
    const sp = 0.3 + hsh(j) * 0.3, yy = ((hsh(j + 3) * h + t * sp) % (h * 0.9)), xx = hsh(j + 7) * w + Math.sin(t * 0.02 + j) * R(0.05);
    ctx.save();
    ctx.translate(xx, yy);
    ctx.rotate(Math.sin(t * 0.03 + j * 2) * 1.2);
    ctx.fillStyle = j % 2 ? 'rgba(240,140,60,.8)' : 'rgba(200,90,50,.75)';
    ctx.beginPath();
    ctx.moveTo(-R(0.013), 0);
    ctx.quadraticCurveTo(0, -R(0.007), R(0.013), 0);
    ctx.quadraticCurveTo(0, R(0.007), -R(0.013), 0);
    ctx.fill();
    ctx.restore();
  }
  // 가까운 나무 기둥 (화면 가장자리, 시차가 가장 크다)
  for (const [bx, wd] of [[-0.035, 0.07], [1.035, 0.07]]) {
    const xx = X(bx) - cam * R(0.2);
    ctx.fillStyle = lin(ctx, xx - R(wd) / 2, 0, xx + R(wd) / 2, 0, [0, '#120c1c'], [0.6, '#24182a'], [1, '#0e0a16']);
    ctx.fillRect(xx - R(wd) / 2, -10, R(wd), Y(GB) + 10);
    ctx.fillStyle = `rgba(${P.glow},.22)`;
    ctx.fillRect(xx + (bx < 0.5 ? R(wd) * 0.3 : -R(wd) * 0.5), -10, R(0.006), Y(GB) + 10);
  }
  // 고사리 (아래 모서리)
  for (const [bx, sd] of [[0.0, 1], [1.0, -1]]) {
    for (let f = 0; f < 3; f++) {
      const ang = sd * (0.5 + f * 0.35) - (sd > 0 ? Math.PI / 2 : Math.PI / 2) + Math.sin(t * 0.03 + f) * 0.04, len = R(0.14 - f * 0.02);
      const x0 = X(bx), y0 = Y(GB) + R(0.01);
      ctx.strokeStyle = '#1c3020';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      const ex = x0 + Math.cos(ang) * len, ey = y0 + Math.sin(ang) * len;
      ctx.quadraticCurveTo(x0 + Math.cos(ang) * len * 0.6, y0 + Math.sin(ang) * len * 0.3, ex, ey);
      ctx.stroke();
      for (let q = 1; q < 8; q++) {
        const u = q / 8, qx = x0 + (ex - x0) * u, qy = y0 + (ey - y0) * u - Math.sin(u * Math.PI) * len * 0.12, ll = R(0.025) * (1 - u * 0.7);
        ctx.fillStyle = '#244a2a';
        for (const sg of [-1, 1]) {
          ell(ctx, qx + Math.cos(ang + sg * 1.2) * ll * 0.5, qy + Math.sin(ang + sg * 1.2) * ll * 0.5, ll * 0.6, ll * 0.22, ang + sg * 1.2);
          ctx.fill();
        }
      }
    }
  }
  // 느려짐(큰 순간): 가장자리가 어둑하고 바람결
  if (s.slowT > 0 || s.freeze > 0) {
    const a = Math.min(1, s.slowT / 10) * 0.35;
    ctx.fillStyle = radg(ctx, w / 2, Y(0.75), R(0.3), R(1.0), [0, 'rgba(0,0,0,0)'], [1, `rgba(30,10,30,${a})`]);
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
  // 첫 안내: 손가락 하나 + 유령 길
  if (s.stage === 0 && s.firstThrow < 0 && play && !s.down) {
    const tgt = { x: 0.5, y: 0.5 }, gf = flightFor(s, tgt.x, tgt.y, 0);
    const cyc = (t % 100) / 100, press = cyc < 0.4 ? cyc / 0.4 : cyc < 0.6 ? 1 : 1 - (cyc - 0.6) / 0.4;
    ctx.save();
    for (let i = 2; i < gf.n; i += 3) {
      const leg = i >= gf.turn;
      ctx.fillStyle = leg ? 'rgba(143,230,255,.7)' : 'rgba(255,194,74,.8)';
      ctx.beginPath();
      ctx.arc(X(gf.xs[i]), Y(gf.ys[i]) - R(0.03), R(0.007), 0, TAU);
      ctx.fill();
    }
    const tx = X(tgt.x), ty = Y(tgt.y);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - press * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tx, ty, R(0.03 + press * 0.03), 0, TAU);
    ctx.stroke();
    ctx.translate(tx, ty);
    ctx.rotate(Math.PI + 0.25);
    drawHand(ctx, 0, R(0.01), R(0.085), press);
    ctx.restore();
  }
  // 새것 스포트라이트
  if (s.spot) {
    const age = t - s.spot.t, sp = s.spot;
    const f = s.foes.find((q) => KIND_NAME[q.k] === sp.label && q.st === 0 && !hidden(q, s.wt));
    const cx = X(f ? f.x : sp.x), cy = Y(f ? f.y : sp.y) - R(f ? FOE_H[f.k] * 0.5 + (f.k === 'bat' ? 0.07 : 0) : 0.05), r0 = R(sp.r);
    if (age < 110) {
      const a = Math.min(1, age / 10, (110 - age) / 20);
      ctx.save();
      ctx.fillStyle = `rgba(16,6,20,${0.5 * a})`;
      ctx.beginPath();
      ctx.rect(-20, -20, w + 40, Y(GB) + 20);
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,74,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.04, 900);
      const label = `NEW  ${sp.label}`, tw = ctx.measureText(label).width + R(0.04), lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6), ly = cy - r0 - R(0.04) < Y(0.3) ? cy + r0 + R(0.04) : cy - r0 - R(0.04);
      ctx.fillStyle = '#ffd84a';
      rr(ctx, lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#2a1424';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    x = clamp(x, w * 0.14, w * 0.86);
    y = clamp(y, Y(HZ) + R(0.02), Y(1.12));
    const busy = () => rec!.some((q) => t - q.t < 36 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < (size + q.size) * 0.6);
    for (let k = 0; k < 6 && busy(); k++) y -= size + 4;
    if (y < Y(HZ) - R(0.04)) for (y = Y(HZ) + R(0.02); busy() && y < Y(1.05); ) y += size + 4;
    rec.push({ x, y, t, size });
    if (rec.length > 12) rec.shift();
    fx.pop(x, y, text, col, size);
  };
  const chips = (x: number, y: number, n: number, sp: number) => {
    fx.burst(x, y, '#c08a50', n, sp, 2.4);
    fx.burst(x, y, '#7cc84a', Math.ceil(n * 0.6), sp * 0.9, 2.2);
    fx.burst(x, y, '#f2d29a', Math.ceil(n * 0.4), sp * 1.2, 1.6);
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    if (e.kind === 'throw') {
      say(X(HX) + R(0.1), Y(HY) - R(0.16), '휙!', '#fff3dc', 15 + (e.n ?? 0) * 2);
      fx.burst(X(HX), Y(FEET_Y), '#d8c8a0', 6, 1.6, 2);
    }
    if (e.kind === 'cut') {
      const n = e.n ?? 1;
      chips(ex, ey - R(0.05), 8 + n * 3, 3 + n * 0.4);
      fx.ring(ex, ey - R(0.05), '#fff6dc', R(0.06 + n * 0.012), 3);
      fx.kick(2.5 + Math.min(6, n) * 1.2);
      if (n >= 2) fx.blink('#fff6dc', Math.min(0.3, 0.06 * n));
      say(ex, ey - R(0.14), n >= 2 ? `퍽! +${n * 10}` : `퍽! +10`, n >= 3 ? '#ffd84a' : '#ffffff', 14 + Math.min(5, n) * 2);
      if (n >= 3) (fx.memo.bigT = t), (fx.memo.bigN = n), (fx.memo.bigX = ex), (fx.memo.bigY = ey), (fx.memo.bigK = 0);
    }
    if (e.kind === 'strip') {
      fx.burst(ex, ey - R(0.06), '#46301a', 16, 3.6, 3);
      fx.burst(ex, ey - R(0.06), '#7cc84a', 6, 2.4, 2);
      fx.kick(3);
      say(ex, ey - R(0.16), '껍질 벗김!', '#ffd0a8', 15);
    }
    if (e.kind === 'clean') say(ex, ey - R(0.22), '두 번 베기!', '#ffd84a', 17);
    if (e.kind === 'bounce') {
      fx.burst(ex, ey - R(0.04), '#fff3b0', 12, 3.2, 1.8);
      fx.ring(ex, ey - R(0.04), '#ffffff', R(0.05), 3);
      fx.kick(3);
      say(ex, ey - R(0.1), '팅!', '#fff3b0', 16);
      (fx.memo.bounceT = t), (fx.memo.bounceX = e.x), (fx.memo.bounceY = e.y);
    }
    if (e.kind === 'catch') {
      const n = e.n ?? 0;
      if (e.text === 'good') {
        fx.ring(X(HX), Y(HY) - R(0.12), n >= 3 ? '#ffd84a' : '#ffffff', R(0.08 + Math.min(6, n) * 0.012), 4);
        fx.burst(X(HX), Y(HY) - R(0.12), n >= 3 ? '#ffd84a' : '#fff3dc', 10 + Math.min(8, n) * 2, 3, 2);
        fx.kick(2 + Math.min(5, n));
        say(X(HX), Y(HY) - R(0.24), '탁!', '#ffffff', 22);
        say(X(HX) + R(0.17), Y(HY) - R(0.12), `받기 ×${n}`, n >= 5 ? '#ffd84a' : '#fff0c8', Math.min(26, 15 + n * 1.5));
        if (n === 3 || n === 5) (fx.memo.bigT = t), (fx.memo.bigN = n), (fx.memo.bigX = X(HX)), (fx.memo.bigY = Y(0.82)), (fx.memo.bigK = 1), fx.blink('#ffe9a0', 0.25);
      } else if (e.text !== 'end') {
        say(X(HX), Y(HY) - R(0.22), '탁', '#e8dcc8', 15);
        if (n >= 2) say(X(HX) + R(0.15), Y(HY) - R(0.1), '연속 끊김…', '#c8b8c8', 13);
      }
    }
    if (e.kind === 'bang') {
      fx.kick(9);
      fx.blink('#ff8a5a', 0.18);
      fx.burst(ex, ey, '#9a6438', 16, 3.6, 3);
      fx.burst(ex, ey, '#e2b07a', 8, 3, 2.4);
      say(ex, ey - R(0.1), '쾅!', '#ffb08a', 24);
      // 가까운 판자가 부러진다
      let bi = -1, bd = 1e9;
      pxs.forEach((px, i) => {
        if (!fm!.broken[i] && Math.abs(px - e.x) < bd) (bd = Math.abs(px - e.x)), (bi = i);
      });
      if (bi >= 0) fm.broken[bi] = true;
    }
    if (e.kind === 'chop') {
      chips(ex, ey - R(0.04), 10, 3);
      fx.kick(3);
      say(ex, ey - R(0.2), '딱! 우지끈…', '#ffe6c0', 15);
    }
    if (e.kind === 'crush') {
      const n = e.n ?? 0;
      fx.kick(8 + n * 2);
      fx.burst(ex, ey, '#c8b090', 22, 4, 3.4);
      fx.burst(ex, ey, '#7cc84a', 10, 3, 2.4);
      say(ex, ey - R(0.08), n ? `쿵! ${n}마리 납작` : '쿵!', n >= 2 ? '#ffd84a' : '#ffe6c0', 18 + n * 2);
      if (n >= 2) (fx.memo.bigT = t), (fx.memo.bigN = n), (fx.memo.bigX = ex), (fx.memo.bigY = ey), (fx.memo.bigK = 2);
    }
    if (e.kind === 'bstrip') {
      fx.burst(ex, ey - R(0.12), '#3e2a18', 20, 4, 3.4);
      fx.kick(4);
      say(ex, ey - R(0.4), '껍질 벗김! 한 번 더!', '#ffe36a', 16);
    }
    if (e.kind === 'bosshit') {
      const n = e.n ?? 1;
      fx.kick(5 + n * 2);
      fx.blink('#fff0c0', 0.12 + n * 0.04);
      chips(ex, ey - R(0.15), 14 + n * 4, 4);
      say(ex, ey - R(0.38), `-${n}`, n >= 4 ? '#ffd84a' : '#ffb0a0', 20 + n * 3);
    }
    if (e.kind === 'bossdown') {
      fx.kick(16);
      fx.blink('#fff3c4', 0.5);
      chips(ex, ey - R(0.15), 40, 6);
      fx.ring(ex, ey - R(0.1), '#ffd84a', R(0.4), 7);
      (fx.memo.bigT = t), (fx.memo.bigN = 0), (fx.memo.bigX = ex), (fx.memo.bigY = ey), (fx.memo.bigK = 3);
    }
    if (e.kind === 'summon') say(ex, ey - R(0.38), '끼이익!', '#e8c8a8', 14);
    if (e.kind === 'grow') fx.burst(ex, ey - R(0.05), '#7cc84a', 8, 2, 2);
    if (e.kind === 'cancel') say(X(HX), Y(HY) - R(0.22), '너무 가까워요', '#e8dcc8', 13);
    if (e.kind === 'clear') {
      fx.burst(w * 0.3, Y(0.7), '#ffd84a', 30, 6, 3);
      fx.burst(w * 0.7, Y(0.7), '#7cc84a', 30, 6, 3);
      fx.burst(w * 0.5, Y(0.6), '#ff9a5a', 20, 5, 3);
      fx.ring(w / 2, Y(0.75), '#ffd84a', R(0.45), 7);
      fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') fx.kick(7);
  }
  fx.memo.t = t;
  ctx.restore();
  // 큰 순간 띠: 나무 팻말
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 56) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN, kind = fx.memo.bigK ?? 0, sc2 = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (56 - age) / 16);
    const bx = clamp(fx.memo.bigX, w * 0.3, w * 0.7), by = clamp(fx.memo.bigY - R(0.2), Y(0.3), Y(1.0));
    const txt = kind === 1 ? (n >= 5 ? '황금 도끼!' : '도끼가 커졌다!') : kind === 2 ? `나무로 ${n}마리!` : kind === 3 ? '대장을 쓰러뜨렸다!' : n >= 5 ? `${n}마리 싹둑!` : `${n}마리 한 번에!`;
    const size = Math.min(34, kind ? 26 : 20 + n * 3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.05);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width, pw = tw + 30, ph = size * 1.5;
    ctx.fillStyle = 'rgba(20,8,10,.4)';
    rr(ctx, -pw / 2 + 4, -ph / 2 + 5, pw, ph, 8);
    ctx.fill();
    ctx.fillStyle = kind === 1 ? lin(ctx, 0, -ph / 2, 0, ph / 2, [0, '#ffe68a'], [1, '#d4941e']) : lin(ctx, 0, -ph / 2, 0, ph / 2, [0, '#c8925a'], [1, '#8a5a30']);
    rr(ctx, -pw / 2, -ph / 2, pw, ph, 8);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,30,10,.35)';
    ctx.lineWidth = 1.5;
    for (const ly of [-ph * 0.18, ph * 0.18]) {
      ctx.beginPath();
      ctx.moveTo(-pw / 2 + 6, ly);
      ctx.lineTo(pw / 2 - 6, ly + 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#5a5060';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * (pw / 2 - 8), 0, 3, 0, TAU);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#2b160c';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#ffffff'], [0.55, '#fff0b0'], [1, '#ffc64a']);
    ctx.fillText(txt, 0, 2);
    if (n >= 3 || kind)
      for (let i = 0; i < 3; i++) {
        const an = t * 0.08 + (i * TAU) / 3;
        ctx.fillStyle = '#fff3b0';
        starPath(ctx, Math.cos(an) * (pw / 2 + 6), Math.sin(an) * (ph / 2 + 6), 5);
        ctx.fill();
      }
    ctx.restore();
  }

  // ═════════════ 위 띠 ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(40,18,36,.94)'], [1, 'rgba(56,26,44,.88)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(255,200,110,.55)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  {
    const cx = R(0.055), cy = hb / 2;
    ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#e8b070'], [1, '#9a6234']);
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.03), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90,50,20,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.019), 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#2a1408';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff3dc';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.1), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.036, 700);
    ctx.fillStyle = '#c9a98a';
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  }
  {
    const cy = hb / 2;
    ctx.textAlign = 'right';
    font(0.042, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.025), cy, R(0.02));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      const hx = w - R(0.03) - sw - R(0.08) - j * R(0.05);
      heartPath(ctx, hx, cy, R(0.017));
      ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#d62b3d']) : 'rgba(255,255,255,.12)';
      ctx.fill();
      ctx.strokeStyle = 2 - j < s.hearts ? OUT : 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
  // 판 카드 (하늘 띠 안 — 놀이터를 가리지 않는다)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '숲을 다 지켜 냈다!' : `${d.goal} 성공!`;
      else (head = `으앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 나무꾼이 낮잠 자러 가요');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : '도끼는 갈 때 한 번, 올 때 한 번';
    }
    if (head) {
      const cy = Y(0.175), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.045, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.06), Math.max(w1, w2) + R(0.1)) * unroll, ch = sub || (s.phase === 'result' && s.ok) ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - ch / 2 + 4, cw, ch, R(0.02));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#f2d0a0'], [1, '#d4a46c']);
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.02));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,70,30,.3)';
      ctx.lineWidth = 1;
      for (let j = 1; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 - cw / 2 + 4, cy - ch / 2 + (ch * j) / 3);
        ctx.lineTo(w / 2 + cw / 2 - 4, cy - ch / 2 + (ch * j) / 3 + 1);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.045, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#6a3a08' : '#8a2418') : '#3a1c08';
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.022), w - R(0.1));
        const nS = 1 + d.stars.length;
        for (let j = 0; j < nS; j++) {
          const ag = s.pt - (12 + j * 12);
          const sx = w / 2 + (j - (nS - 1) / 2) * R(0.07), sy = cy + R(0.03);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.026) * (ag < 0 ? 1 : pop));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,60,20,.2)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#6a3a08' : 'rgba(90,60,20,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.025) : 0), w - R(0.1));
        if (sub) {
          font(0.036, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#9a2a14' : '#4a2a10';
          ctx.fillText(sub, w / 2, cy + R(0.032), w - R(0.1));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 울타리 · 받기 연속 · 별 · 안내 ═════════════
  {
    const ty = Y(GB);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, 'rgba(52,26,40,.97)'], [1, 'rgba(30,14,26,.99)']);
    rr(ctx, 0, ty, w, h - ty + 4, R(0.025));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,110,.5)';
    ctx.fillRect(R(0.02), ty, w - R(0.04), 1.5);
    const r1 = ty + R(0.042);
    // 울타리 판자
    {
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe6c8';
      ctx.fillText('울타리', R(0.03), r1 + 1);
      const lw0 = ctx.measureText('울타리').width;
      for (let j = 0; j < d.boards; j++) {
        const px = R(0.045) + lw0 + j * R(0.034), ok = j < s.boards;
        ctx.fillStyle = ok ? lin(ctx, px, 0, px + R(0.024), 0, [0, '#e8b47a'], [1, '#a06a3a']) : 'rgba(255,255,255,.1)';
        ctx.beginPath();
        ctx.moveTo(px, r1 + R(0.022));
        ctx.lineTo(px, r1 - R(0.012));
        ctx.lineTo(px + R(0.012), r1 - R(0.024));
        ctx.lineTo(px + R(0.024), r1 - R(0.012));
        ctx.lineTo(px + R(0.024), r1 + R(0.022));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ok ? OUT : 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    }
    // 받기 연속
    {
      const n = s.combo, x1 = w - R(0.03);
      font(0.05, 900);
      ctx.textAlign = 'right';
      const big = `×${n}`;
      const bw4 = ctx.measureText(big).width;
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUT;
      ctx.strokeText(big, x1, r1 + 1);
      ctx.fillStyle = n >= 5 ? '#ffd84a' : n >= 3 ? '#ffe9a8' : '#fff3dc';
      ctx.fillText(big, x1, r1 + 1);
      for (let j = LV_MAX - 1; j >= 0; j--) {
        const ix = x1 - bw4 - R(0.045) - (LV_MAX - 1 - j) * R(0.048);
        if (j < n) {
          ctx.fillStyle = radg(ctx, ix, r1, 0, R(0.03), [0, n >= 3 ? 'rgba(255,214,90,.55)' : 'rgba(255,240,210,.35)'], [1, 'rgba(255,214,90,0)']);
          ctx.beginPath();
          ctx.arc(ix, r1, R(0.03), 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = j < n ? 1 : 0.3;
        drawAxe(ctx, ix - R(0.004), r1 + R(0.012), R(0.042), -1.1, j < n ? (n >= 3 ? 3 : 0) : 0, true);
      }
      ctx.globalAlpha = 1;
      font(0.034, 800);
      ctx.fillStyle = '#ffe6c8';
      ctx.fillText('받기', x1 - bw4 - R(0.045) - LV_MAX * R(0.048) + R(0.015), r1 + 1);
    }
    // 별 줄 (쉬운 말, 판마다 하나씩 늘어난다)
    const r2 = ty + R(0.1);
    {
      const left = (st: Star) => {
        if (st.k === 'noleak' || starMet(s, st)) return '';
        if (st.k === 'bossk') return s.bossHits ? ` ${s.bossHits}번째` : '';
        const v = starVal(s, st);
        return v > 0 ? ` ${v}/${st.n}` : '';
      };
      const all: { label: string; ok: boolean; bad: boolean }[] = [{ label: d.goal, ok: s.phase === 'result' && s.ok, bad: false }];
      for (const st of d.stars) {
        const met = starMet(s, st), bad = (st.k === 'noleak' && s.leaks > 0) || (st.k === 'bossk' && s.bossHits >= st.n && s.bossT < 0);
        all.push({ label: st.label + (s.phase === 'play' ? left(st) : ''), ok: s.phase === 'result' && s.ok ? s.starOk[all.length] : met && st.k !== 'noleak' && st.k !== 'bossk', bad });
      }
      font(0.034, 800);
      const ws = all.map((q) => ctx.measureText(q.label).width + R(0.07));
      const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (all.length - 1), scale = Math.min(1, (w - R(0.03)) / tot);
      let xx = (w - tot * scale) / 2;
      all.forEach((q, j) => {
        const pw = ws[j] * scale;
        ctx.fillStyle = q.ok ? 'rgba(255,216,74,.22)' : q.bad ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.07)';
        rr(ctx, xx, r2 - R(0.025), pw, R(0.05), R(0.025));
        ctx.fill();
        ctx.strokeStyle = q.ok ? '#ffd84a' : q.bad ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.28)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        starPath(ctx, xx + R(0.026) * scale + 2, r2, R(0.014));
        ctx.fillStyle = q.ok ? '#ffd84a' : q.bad ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.55)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = q.ok ? '#fff6dc' : q.bad ? 'rgba(255,255,255,.35)' : '#f2e6ff';
        font(0.034, 800);
        ctx.fillText(q.label, xx + R(0.05) * scale, r2 + 1, pw - R(0.058) * scale);
        xx += pw + gap * scale;
      });
    }
    // 안내 한 줄
    {
      let hint = d.hint;
      const first = s.stage === 0 && s.firstThrow < 0 && play;
      if (first) hint = '누른 채 끌었다 떼면 도끼가 날아가요';
      else if (aiming && prevSim) hint = s.axe ? '떼어 두면 돌아오자마자 던져요' : prevSim.two ? '떼면 휙! 갈 때 하나, 올 때 또 하나 — 받기 연속!' : '떼면 휙! 숫자 차례로 베요';
      else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판을 지켜 냈어요!' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '빨간 ! 괴물부터 베요';
      else if (s.stage === 0 && s.catches === 1 && s.combo === 0) hint = '갈 때 하나, 올 때 또 하나 베면 받기 연속!';
      font(first ? 0.04 : 0.035, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = first ? '#ffffff' : '#ffe0a8';
      ctx.fillText(hint, w / 2, ty + R(0.163), w - R(0.04));
    }
  }
  void th;
}
