/**
 * 빙판 마법 소동 (32라운드: 실시간 액션 2탄) — 빙판 칠하기 × 가리키기 × 연쇄.
 * 기준 9(손이 하는 일은 하나): 누른 채 끌면 손가락이 지나간 바닥이 반짝 얼음 미끄럼길이 된다(얼음 게이지가 길이만큼 줄고, 떼면 천천히 찬다).
 *   키보드는 화살표로 커서 + 스페이스(누르는 동안 칠하기).
 * 규칙(결정적): 얼음 위의 도깨비는 발이 미끄러져 방향을 못 바꾸고, 그은 쪽(얼음의 결)으로 쭉쭉 빨라지며 미끄러진다.
 *   얼음이 끝나도 남은 힘만큼 더 미끄러진다. 연못·구멍에 닿으면 퐁당, 벽·기둥엔 쾅(어질어질), 다른 도깨비를 들이받으면 그 도깨비도 넘어져 밀려난다.
 *   도깨비가 등불에 닿으면 불빛 하나를 훔쳐 달아난다(달아나는 도깨비를 빠뜨리면 불빛을 되찾는다). 불빛을 다 잃으면 하트 -1·그 판 다시.
 * 와우: 첫 손짓에 얼음길이 반짝 깔리고, 메롱 하던 도깨비 셋이 줄줄이 미끄러져 '퐁! 퐁! 퐁!' 연못에 빠진다.
 * 판 8개: 목표 = 등불 지키기(모든 도깨비를 빠뜨리거나 쫓아내기). 별 = 1판 하나 · 2판 둘 · 3판부터 셋(판마다 다른 쉬운 한 줄).
 * 펼쳐짐(하는 일이 바뀐다): 1판 도깨비(연못 쪽으로 긋기) → 2판 도깨비 떼(한 줄로 길게 그어 줄줄이) → 3판 화롯불(곁의 얼음이 금방 녹음 → 오기 직전에)
 *   → 4판 눈덩이(얼음 위에서 빨라짐 → 눈덩이 볼링) → 5판 스파이크 신발(안 미끄러짐 → 다른 도깨비로 들이받기)
 *   → 6판 뚱보(무거워 남을 밀어냄 → 뚱보 볼링) → 7판 망치(앞의 얼음을 깸 → 발밑에 바로) → 8판 도깨비 대장(두 번 빠뜨려야).
 * 웃음: 미끄러지는 도깨비는 팔을 허우적대며 '으아아', 벽에 쾅 하면 납작해졌다 별이 돈다, 빠지면 두 발만 동동 → 뽀글뽀글.
 *   꼬마 눈 마법사는 큰 털모자를 흔들며 지팡이로 얼음을 뿌리고, 퐁당마다 폴짝 뛴다. 창문 속 마을 사람들이 큰 순간마다 고개를 내민다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 땅 좌표: 가로 0~1, 깊이 0(먼 쪽)~GH(가까운 쪽). 화면엔 3/4 시점으로 눌러(SQ) 그리고, 먼 쪽은 살짝 좁게(P0) */
const GH = 1.3, FY0 = 0.39, SQ = 0.7, P0 = 0.86;
/** 얼음 칸 */
const NX = 24, CELL = 1 / NX, NY = Math.ceil(GH / CELL);
/** 붓 반지름 · 길이당 얼음 값 · 게이지 최대 · 얼음 수명 · 화롯불 곁 녹는 배수 */
const BR = 0.055, COST = 52, GMAX = 100, ICE_LIFE = 270, HEAT_RATE = 7;
/** 물리 (틱당) */
const RUN = 0.0034, ACC = 0.14, SLOPE = 0.0011, VMAX = 0.021, ICE_FR = 0.997, GROUND_FR = 0.9, STOPV = 0.0026, SLIP_KEEP = 0.45;
const WALL_E = 0.45, BONK_V = 0.0075, KNOCK_V = 0.0075, E_COL = 0.85, GETUP = 30, DIZZY_T = 70, SMASH_T = 30, TAUNT_T = 300;
const BALL_V = 0.0036, COMBO_T = 80;
const LAN = { x: 0.5, y: 1.12, r: 0.055 };
const RESULT_OK = 180, RESULT_FAIL = 150, CARD_T = 150, NEWS_T = 150;
const STAR_PTS = 150, WIN_PTS = 300;

const ENTER = 0, RUNS = 1, SLIDE = 2, DIZZY = 3, SMASH = 4, FLEE = 5, TAUNT = 6, CLIMB = 7;

type K = 'gob' | 'spike' | 'fat' | 'hammer' | 'boss' | 'ball';
const RADK: Record<K, number> = { gob: 0.03, spike: 0.03, fat: 0.043, hammer: 0.031, boss: 0.05, ball: 0.032 };
const MASS: Record<K, number> = { gob: 1, spike: 1.2, fat: 3, hammer: 1.2, boss: 4, ball: 2.5 };
const SPDK: Record<K, number> = { gob: 1, spike: 0.95, fat: 0.72, hammer: 0.85, boss: 0.72, ball: 1 };
const SLOPEK: Record<K, number> = { gob: 1, spike: 1, fat: 1.3, hammer: 1, boss: 0.55, ball: 1.35 };
const PTS: Record<K, number> = { gob: 10, spike: 20, fat: 20, hammer: 20, boss: 80, ball: 0 };
const KIND_NAME: Record<K, string> = { gob: '도깨비', spike: '스파이크 도깨비', fat: '뚱보 도깨비', hammer: '망치 도깨비', boss: '도깨비 대장', ball: '눈덩이' };

type StarK = 'combo' | 'nolose' | 'strokes' | 'snow' | 'spike' | 'fat' | 'hammer';
interface Star { k: StarK; n: number; label: string }
/** [종류, 들어오는 쪽(T 위 · L 왼쪽 · R 오른쪽), 자리, 늦춤(틱)] */
type Spawn = [K, 'T' | 'L' | 'R', number, number];
interface Wave { wait: number; foes: Spawn[] }
interface StageDef {
  key: string; name: string; place: number; news: string; hint: string; goal: string;
  lights: number; regen: number; speed: number;
  ponds: number[][]; obs?: number[][]; heats?: number[][]; balls?: { every: number; xs: number[] }; taunt?: number[][];
  waves: Wave[]; stars: Star[];
}
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
/** 떼: 같은 문으로 dt틱 간격으로 n마리 */
const train = (k: K, side: 'T' | 'L' | 'R', pos: number, d0: number, n: number, dt = 16): Spawn[] => [...Array(n).keys()].map((i) => [k, side, pos, d0 + i * dt]);

export const STAGES: StageDef[] = [
  {
    key: 'pond', name: '광장 입구', place: 0, news: '', goal: '등불 지키기', lights: 8, regen: 0.5, speed: 0.8,
    hint: '도깨비 밑에서 연못 쪽으로 쭉 그어요',
    ponds: [[0.8, 0.5, 0.12], [0.2, 0.86, 0.085]],
    taunt: [[0.2, 0.5], [0.32, 0.5], [0.44, 0.5]],
    waves: [
      { wait: 420, foes: [] },
      { wait: 400, foes: [['gob', 'T', 0.3, 0], ['gob', 'T', 0.64, 50]] },
      { wait: 440, foes: [['gob', 'L', 0.36, 0], ['gob', 'R', 0.4, 50]] },
    ],
    stars: [],
  },
  {
    key: 'crowd', name: '눈사람 골목', place: 0, news: '도깨비 떼 — 줄줄이 몰려와요', goal: '등불 지키기', lights: 9, regen: 0.25, speed: 0.9,
    hint: '떼가 지나갈 자리에 미리 길게 그어 두어요',
    ponds: [[0.16, 0.6, 0.1], [0.84, 0.64, 0.1]], obs: [[0.5, 0.52, 0.045, 0]],
    waves: [
      { wait: 460, foes: train('gob', 'T', 0.28, 0, 3) },
      { wait: 460, foes: train('gob', 'L', 0.3, 0, 3) },
      { wait: 480, foes: train('gob', 'T', 0.72, 0, 3) },
    ],
    stars: [S('combo', 3, '한 번에 셋 빠뜨리기')],
  },
  {
    key: 'heat', name: '화롯불 장터', place: 1, news: '화롯불 — 곁의 얼음은 금방 녹아요', goal: '등불 지키기', lights: 4, regen: 0.14, speed: 1,
    hint: '입구는 화롯불이라 녹아요 — 광장 안쪽에 그어요',
    ponds: [[0.12, 0.6, 0.09], [0.88, 0.62, 0.095], [0.5, 0.78, 0.075]],
    obs: [[0.16, 0.13, 0.034, 1], [0.84, 0.13, 0.034, 1]], heats: [[0.16, 0.13, 0.24], [0.84, 0.13, 0.24]],
    waves: [
      { wait: 440, foes: [...train('gob', 'T', 0.26, 0, 3), ...train('gob', 'T', 0.74, 50, 2)] },
      { wait: 440, foes: [...train('gob', 'L', 0.26, 0, 2), ...train('gob', 'R', 0.28, 30, 3)] },
      { wait: 480, foes: [...train('gob', 'T', 0.5, 0, 3), ['gob', 'L', 0.32, 40], ['gob', 'R', 0.3, 70]] },
    ],
    stars: [S('combo', 3, '한 번에 셋 빠뜨리기'), S('strokes', 6, '여섯 번만 긋고 지키기')],
  },
  {
    key: 'ball', name: '눈길 언덕', place: 1, news: '눈덩이 — 등불로 굴러와요! 얼음으로 방향을 틀어요', goal: '등불 지키기', lights: 4, regen: 0.14, speed: 1,
    hint: '눈덩이를 얼음길로 틀어 도깨비 무리에 볼링!',
    ponds: [[0.14, 0.72, 0.1], [0.86, 0.72, 0.1]], balls: { every: 150, xs: [0.3, 0.7, 0.5] },
    waves: [
      { wait: 480, foes: [...train('gob', 'L', 0.42, 20, 3, 20), ...train('gob', 'R', 0.42, 60, 3, 20)] },
      { wait: 480, foes: [...train('gob', 'T', 0.22, 0, 3), ...train('gob', 'T', 0.78, 40, 3)] },
      { wait: 520, foes: [...train('gob', 'L', 0.3, 0, 3), ...train('gob', 'R', 0.55, 50, 3)] },
    ],
    stars: [S('snow', 3, '눈덩이로 셋 빠뜨리기'), S('strokes', 8, '여덟 번만 긋고 지키기')],
  },
  {
    key: 'spike', name: '대장간 앞', place: 1, news: '스파이크 신발 — 얼음에서 안 미끄러져요', goal: '등불 지키기', lights: 4, regen: 0.14, speed: 1.05,
    hint: '옆 도깨비를 미끄러뜨려 스파이크를 들이받아요',
    ponds: [[0.16, 0.55, 0.1], [0.84, 0.55, 0.1], [0.5, 0.88, 0.07]], balls: { every: 420, xs: [0.5, 0.35, 0.65] },
    waves: [
      { wait: 500, foes: [['gob', 'T', 0.3, 0], ['spike', 'T', 0.41, 0], ['gob', 'T', 0.52, 0], ['gob', 'T', 0.75, 60]] },
      { wait: 500, foes: [['gob', 'L', 0.26, 0], ['spike', 'L', 0.36, 0], ['gob', 'R', 0.3, 40], ['spike', 'R', 0.4, 40], ['gob', 'R', 0.5, 40]] },
      { wait: 540, foes: [...train('gob', 'T', 0.72, 0, 3), ['gob', 'T', 0.24, 50], ['spike', 'T', 0.35, 50], ['gob', 'T', 0.46, 50], ['spike', 'L', 0.4, 90], ['gob', 'L', 0.3, 90]] },
    ],
    stars: [S('spike', 3, '스파이크 도깨비 셋 빠뜨리기'), S('combo', 3, '한 번에 셋 빠뜨리기')],
  },
  {
    key: 'fat', name: '방앗간 마당', place: 2, news: '뚱보 도깨비 — 얼음에선 쌩, 앞의 것을 밀어내요', goal: '등불 지키기', lights: 4, regen: 0.14, speed: 1.05,
    hint: '뚱보 쪽에서 시작해 떼를 지나 연못으로 그어요',
    ponds: [[0.15, 0.74, 0.1], [0.85, 0.74, 0.1], [0.5, 0.4, 0.08]], obs: [[0.3, 0.56, 0.04, 2], [0.7, 0.56, 0.04, 2]],
    waves: [
      { wait: 520, foes: [['fat', 'T', 0.2, 0], ['gob', 'T', 0.3, 0], ['gob', 'T', 0.39, 0], ['gob', 'T', 0.7, 50], ['gob', 'T', 0.8, 50]] },
      { wait: 520, foes: [['gob', 'L', 0.24, 0], ['fat', 'L', 0.34, 0], ['gob', 'L', 0.44, 0], ['gob', 'R', 0.3, 40], ['gob', 'R', 0.4, 40], ['fat', 'R', 0.5, 40]] },
      { wait: 540, foes: [['gob', 'T', 0.6, 0], ['gob', 'T', 0.7, 0], ['fat', 'T', 0.8, 0], ['fat', 'T', 0.2, 60], ['gob', 'T', 0.3, 60], ['gob', 'T', 0.4, 60]] },
    ],
    stars: [S('fat', 3, '뚱보로 셋 밀어 빠뜨리기'), S('combo', 3, '한 번에 셋 빠뜨리기')],
  },
  {
    key: 'hammer', name: '얼음 호숫가', place: 2, news: '망치 도깨비 — 앞의 얼음을 깨부숴요', goal: '등불 지키기', lights: 4, regen: 0.15, speed: 1.08,
    hint: '망치 도깨비는 발밑에서 바로 그어요',
    ponds: [[0.16, 0.5, 0.1], [0.84, 0.5, 0.1], [0.3, 0.92, 0.07], [0.7, 0.92, 0.07]],
    waves: [
      { wait: 480, foes: [['hammer', 'T', 0.35, 0], ...train('gob', 'T', 0.35, 22, 3)] },
      { wait: 480, foes: [['hammer', 'L', 0.32, 0], ...train('gob', 'L', 0.32, 22, 2), ['hammer', 'R', 0.36, 40], ...train('gob', 'R', 0.36, 62, 2)] },
      { wait: 520, foes: [['hammer', 'T', 0.65, 0], ...train('gob', 'T', 0.65, 22, 3), ['hammer', 'L', 0.5, 70], ['gob', 'T', 0.3, 90], ['spike', 'T', 0.4, 90]] },
    ],
    stars: [S('hammer', 2, '망치 도깨비 둘 빠뜨리기'), S('nolose', 0, '불빛 하나도 안 잃기')],
  },
  {
    key: 'boss', name: '종탑 광장', place: 2, news: '도깨비 대장 — 두 번 빠뜨려야 해요', goal: '대장 이기기', lights: 4, regen: 0.16, speed: 1.08,
    hint: '대장은 무거워요 — 길게 그어야 끝까지 미끄러져요',
    ponds: [[0.15, 0.62, 0.11], [0.85, 0.62, 0.11], [0.5, 0.36, 0.08]], balls: { every: 320, xs: [0.3, 0.7] },
    waves: [
      { wait: 520, foes: [['boss', 'T', 0.5, 0], ...train('gob', 'L', 0.35, 30, 3), ...train('gob', 'R', 0.35, 60, 2)] },
      { wait: 520, foes: [...train('gob', 'T', 0.3, 0, 4), ['gob', 'T', 0.6, 40], ['fat', 'T', 0.7, 40], ['gob', 'R', 0.4, 60], ['gob', 'R', 0.5, 60]] },
      { wait: 560, foes: [['hammer', 'L', 0.4, 0], ...train('gob', 'L', 0.4, 22, 2), ...train('gob', 'T', 0.65, 30, 4), ['gob', 'R', 0.45, 60]] },
    ],
    stars: [S('combo', 4, '한 번에 넷 빠뜨리기'), S('nolose', 0, '불빛 하나도 안 잃기')],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Ent {
  id: number; k: K; x: number; y: number; vx: number; vy: number; r: number;
  st: number; tm: number; hp: number; light: boolean; by: string; byT: number; fx: number; ax: number; ay: number;
  // 연출 (시뮬레이션 결과와 무관)
  seed: number; walk: number; slipT: number; bonkT: number; hitT: number; born: number;
}
interface Pond { x: number; y: number; r: number }
interface Obs { x: number; y: number; r: number; k: number }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string; k?: K }
interface Sink { x: number; y: number; k: K; t: number; px: number; py: number; pr: number; light: boolean; seed: number }

export interface IceState {
  rng: Rng; seed: number; t: number; wt: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  lights: number; maxLights: number; g: number; flip: boolean;
  ice: Float32Array; gxv: Float32Array; gyv: Float32Array; melt: Float32Array; wet: Uint8Array;
  ponds: Pond[]; obs: Obs[]; heats: Pond[];
  ents: Ent[]; nid: number; wave: number; waveT: number; pend: { at: number; sp: Spawn }[]; ballT: number; ballI: number;
  down: boolean; lx: number; ly: number; strokeLen: number; strokes: number; painting: boolean;
  freeze: number; slowT: number;
  dunks: number; combo: { n: number; t: number }; best: number; lost: number; regain: number;
  snowD: number; spikeD: number; fatD: number; hamD: number; bossHits: number; bonks: number;
  firstPress: number; firstBig: number; firstStroke: boolean;
  seen: Set<string>; spotted: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  events: Ev[]; sinks: Sink[]; sim: boolean;
  // 연출용
  camX: number; mood: number; moodT: number; brush: { x: number; y: number; t: number }[]; cheerT: number; emptyT: number;
}

const ev = (s: IceState, kind: string, x: number, y: number, n?: number, text?: string, k?: K) => {
  if (!s.sim) s.events.push({ t: s.t, kind, x, y, n, text, k });
};
function see(s: IceState, key: string, text: string) {
  if (s.sim || !key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ───────────────────────────── 좌표 ─────────────────────────────
const psc = (gy: number) => P0 + (1 - P0) * clamp(gy / GH, -0.3, 1.2);
/** 땅 → 화면(가로 폭 = 1 단위) */
const gsx = (gx: number, gy: number) => 0.5 + (gx - 0.5) * psc(gy);
const gsy = (gy: number) => FY0 + gy * SQ;
/** 화면(가로 폭 = 1 단위) → 땅 */
function toGround(sx: number, sy: number) {
  const gy = (sy - FY0) / SQ;
  return { x: 0.5 + (sx - 0.5) / psc(gy), y: gy };
}
const cellAt = (x: number, y: number) => {
  if (x < 0 || x >= 1 || y < 0 || y >= GH) return -1;
  return Math.floor(y / CELL) * NX + Math.floor(x * NX);
};

// ───────────────────────────── 시뮬레이션 ─────────────────────────────

/** 붓 한 번 찍기: 반지름 안의 칸을 얼음으로, 결 = (ux, uy) */
function stamp(s: IceState, x: number, y: number, ux: number, uy: number) {
  const i0 = Math.max(0, Math.floor((x - BR) * NX)), i1 = Math.min(NX - 1, Math.floor((x + BR) * NX));
  const j0 = Math.max(0, Math.floor((y - BR) / CELL)), j1 = Math.min(NY - 1, Math.floor((y + BR) / CELL));
  for (let j = j0; j <= j1; j++) {
    const cy = (j + 0.5) * CELL;
    if (cy >= GH) continue;
    for (let i = i0; i <= i1; i++) {
      const cx = (i + 0.5) * CELL, dx = cx - x, dy = cy - y;
      if (dx * dx + dy * dy > BR * BR) continue;
      const idx = j * NX + i;
      if (s.wet[idx]) continue;
      s.ice[idx] = ICE_LIFE;
      s.gxv[idx] = ux;
      s.gyv[idx] = uy;
    }
  }
}

/** (x0,y0)→(x1,y1)을 칠한다. 게이지가 모자라면 갈 수 있는 데까지만. 칠한 길이를 돌려준다 */
function paintSeg(s: IceState, x0: number, y0: number, x1: number, y1: number): number {
  x0 = clamp(x0, 0.005, 0.995);
  x1 = clamp(x1, 0.005, 0.995);
  y0 = clamp(y0, 0.005, GH - 0.005);
  y1 = clamp(y1, 0.005, GH - 0.005);
  let len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1e-6 || s.g <= 0) return 0;
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  len = Math.min(len, s.g / COST);
  s.g = Math.max(0, s.g - len * COST);
  const n = Math.max(1, Math.ceil(len / 0.018));
  for (let k = 0; k <= n; k++) stamp(s, x0 + ux * len * (k / n), y0 + uy * len * (k / n), ux, uy);
  return len;
}

function iceAhead(s: IceState, e: Ent) {
  const sp = Math.hypot(e.vx, e.vy);
  if (sp < 1e-5) return false;
  const c = cellAt(e.x + (e.vx / sp) * 0.06, e.y + (e.vy / sp) * 0.06);
  return c >= 0 && s.ice[c] > 0;
}
function smashIce(s: IceState, e: Ent) {
  const cx = e.x + e.ax * 0.06, cy = e.y + e.ay * 0.06;
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const dx = (i + 0.5) * CELL - cx, dy = (j + 0.5) * CELL - cy;
      if (dx * dx + dy * dy < 0.12 * 0.12) s.ice[j * NX + i] = 0;
    }
  ev(s, 'smash', cx, cy);
}

function doSlip(s: IceState, e: Ent) {
  e.st = SLIDE;
  e.vx *= SLIP_KEEP;
  e.vy *= SLIP_KEEP;
  e.slipT = s.t;
  ev(s, 'slip', e.x, e.y, 0, '', e.k);
}

/** 걷는 방향: 목표 쪽으로, 앞을 막는 연못·기둥은 옆으로 돌아간다 */
function steer(s: IceState, e: Ent, dt: number) {
  const d = STAGES[s.stage];
  let tx: number, ty: number, spd = RUN * SPDK[e.k] * d.speed;
  if (e.st === FLEE) {
    const ex = e.x < 0.5 ? -0.12 : 1.12;
    if (Math.abs(ex - e.x) < e.y + 0.12) (tx = ex), (ty = e.y);
    else (tx = e.x), (ty = -0.12);
    spd *= 1.25;
  } else (tx = LAN.x), (ty = LAN.y);
  let dx = tx - e.x, dy = ty - e.y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  dx /= dist;
  dy /= dist;
  // 앞을 막는 둥근 것(연못·기둥·화로) — 가까이 오면 접선으로 비켜 간다
  let bx = 0, by = 0, bd = 1e9;
  const test = (cx: number, cy: number, cr: number) => {
    const qx = cx - e.x, qy = cy - e.y, along = qx * dx + qy * dy;
    if (along <= 0 || along > dist) return;
    const perp = Math.abs(qx * dy - qy * dx), need = cr + e.r + 0.02;
    if (perp > need) return;
    const gap = Math.hypot(qx, qy) - cr;
    if (gap > 0.2 || gap > bd) return;
    bd = gap;
    const cd = Math.hypot(qx, qy), th = Math.asin(Math.min(1, need / Math.max(cd, need))), side = qx * dy - qy * dx > 0 ? 1 : -1;
    const ba = Math.atan2(qy, qx) + side * th;
    bx = Math.cos(ba);
    by = Math.sin(ba);
  };
  for (const p of s.ponds) test(p.x, p.y, p.r);
  for (const o of s.obs) test(o.x, o.y, o.r);
  if (bd < 1e9) (dx = bx), (dy = by);
  const k = Math.min(1, ACC * dt);
  e.vx += (dx * spd - e.vx) * k;
  e.vy += (dy * spd - e.vy) * k;
}

function walls(s: IceState, e: Ent): boolean {
  let imp = 0;
  if (e.x < e.r) (e.x = e.r), e.vx < 0 && ((imp = Math.max(imp, -e.vx)), (e.vx = -e.vx * WALL_E));
  if (e.x > 1 - e.r) (e.x = 1 - e.r), e.vx > 0 && ((imp = Math.max(imp, e.vx)), (e.vx = -e.vx * WALL_E));
  if (e.y < e.r) (e.y = e.r), e.vy < 0 && ((imp = Math.max(imp, -e.vy)), (e.vy = -e.vy * WALL_E));
  if (e.y > GH - e.r) (e.y = GH - e.r), e.vy > 0 && ((imp = Math.max(imp, e.vy)), (e.vy = -e.vy * WALL_E));
  for (const o of s.obs) {
    const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), want = o.r + e.r;
    if (d >= want || d < 1e-9) continue;
    const nx = dx / d, ny = dy / d;
    e.x = o.x + nx * want;
    e.y = o.y + ny * want;
    const vn = e.vx * nx + e.vy * ny;
    if (vn < 0) {
      imp = Math.max(imp, -vn);
      e.vx -= (1 + WALL_E) * vn * nx;
      e.vy -= (1 + WALL_E) * vn * ny;
    }
  }
  return imp > BONK_V;
}

function bonk(s: IceState, e: Ent) {
  if (e.k === 'ball') return;
  e.st = DIZZY;
  e.tm = DIZZY_T;
  e.bonkT = s.t;
  s.bonks++;
  ev(s, 'bonk', e.x, e.y, 0, '', e.k);
  see(s, 'bonk', '');
}

function steal(s: IceState, e: Ent) {
  s.lights--;
  s.lost++;
  e.light = true;
  e.st = FLEE;
  const dx = e.x - LAN.x, dy = e.y - LAN.y, d = Math.hypot(dx, dy) || 1;
  e.vx = (dx / d) * RUN;
  e.vy = (dy / d) * RUN;
  ev(s, 'steal', e.x, e.y, s.lights, '', e.k);
  if (s.lights <= 0) endStage(s, false, '등불이 꺼졌어요');
}

function dunk(s: IceState, e: Ent, p: Pond) {
  if (!s.sim) s.sinks.push({ x: e.x, y: e.y, k: e.k, t: s.t, px: p.x, py: p.y, pr: p.r, light: e.light, seed: e.seed });
  if (e.k === 'ball') {
    ev(s, 'ballsplash', e.x, e.y);
    return;
  }
  const n = s.t - s.combo.t <= COMBO_T ? s.combo.n + 1 : 1;
  s.combo = { n, t: s.t };
  s.best = Math.max(s.best, n);
  s.dunks++;
  s.pts += PTS[e.k] * n;
  if (e.light) {
    s.lights = Math.min(s.maxLights, s.lights + 1);
    s.regain++;
    ev(s, 'regain', e.x, e.y);
  }
  const src = s.t - e.byT < 150 ? e.by : '';
  if (src === 'ball') s.snowD++;
  if (src === 'fat') s.fatD++;
  if (e.k === 'spike') s.spikeD++;
  if (e.k === 'hammer') s.hamD++;
  if (src) see(s, 'chain', '');
  s.freeze = Math.max(s.freeze, n >= 2 ? 3 : 2);
  if (n >= 3) s.slowT = 26;
  if (s.firstBig < 0 && n >= 2 && s.firstPress >= 0) s.firstBig = s.t;
  ev(s, 'splash', e.x, e.y, n, src, e.k);
}

function knock(s: IceState, e: Ent, by: Ent) {
  if (e.k === 'ball') return;
  if (e.st === RUNS || e.st === DIZZY || e.st === SMASH || e.st === TAUNT || e.st === FLEE) e.st = SLIDE;
  e.hitT = s.t;
  e.by = by.k === 'ball' || by.k === 'fat' ? by.k : by.by && s.t - by.byT < 150 ? by.by : by.k;
  e.byT = s.t;
}

function ballStep(s: IceState, e: Ent, dt: number, ci: number, onIce: boolean): boolean {
  if (e.st === ENTER) {
    e.y += e.vy * dt;
    e.walk += e.vy * dt;
    if (e.y > e.r) e.st = SLIDE;
    return true;
  }
  if (onIce) {
    const k = SLOPEK.ball * SLOPE * dt;
    e.vx += s.gxv[ci] * k;
    e.vy += s.gyv[ci] * k;
    const sp = Math.hypot(e.vx, e.vy), vm = VMAX * 1.1;
    if (sp > vm) (e.vx *= vm / sp), (e.vy *= vm / sp);
    e.r = Math.min(0.046, e.r + 0.00005 * dt);
  } else {
    // 광장 가운데(등불 쪽)가 낮아 그쪽으로 데굴데굴 — 빠를 땐 천천히 꺾인다
    const dx = LAN.x - e.x, dy = LAN.y - e.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, 0.012 * dt);
    e.vx += ((dx / d) * BALL_V - e.vx) * k;
    e.vy += ((dy / d) * BALL_V - e.vy) * k;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.walk += Math.hypot(e.vx, e.vy) * dt;
  for (const p of s.ponds) if (Math.hypot(e.x - p.x, e.y - p.y) < p.r - e.r * 0.25) return dunk(s, e, p), false;
  if (Math.hypot(e.x - LAN.x, e.y - LAN.y) < LAN.r + e.r) {
    s.lights--;
    s.lost++;
    ev(s, 'smother', e.x, e.y, s.lights, '', 'ball');
    if (s.lights <= 0) endStage(s, false, '눈덩이가 등불을 덮쳤어요');
    return false;
  }
  const hitWall = e.x < e.r || e.x > 1 - e.r || e.y > GH - e.r || e.y < e.r * 0.5;
  const hitObs = s.obs.some((o) => Math.hypot(e.x - o.x, e.y - o.y) < o.r + e.r);
  if (hitWall || hitObs) {
    ev(s, 'poof', clamp(e.x, 0, 1), clamp(e.y, 0, GH), 0, '', 'ball');
    return false;
  }
  return true;
}

/** 한 마리 한 틱. false = 사라짐(빠짐·달아남) */
function entStep(s: IceState, e: Ent, dt: number): boolean {
  const ci = cellAt(e.x, e.y), onIce = ci >= 0 && s.ice[ci] > 0;
  if (e.k === 'ball') return ballStep(s, e, dt, ci, onIce);
  const slip = e.k !== 'spike';
  switch (e.st) {
    case ENTER:
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.walk += RUN * dt;
      if (e.x > e.r && e.x < 1 - e.r && e.y > e.r) e.st = RUNS;
      return true;
    case CLIMB:
      e.tm -= dt;
      if (e.tm <= 0) {
        const p = s.ponds.reduce((a, q) => (Math.hypot(q.x - e.x, q.y - e.y) < Math.hypot(a.x - e.x, a.y - e.y) ? q : a), s.ponds[0]);
        const dx = LAN.x - p.x, dy = LAN.y - p.y, d = Math.hypot(dx, dy) || 1;
        e.x = p.x + (dx / d) * (p.r + e.r + 0.01);
        e.y = p.y + (dy / d) * (p.r + e.r + 0.01);
        e.vx = e.vy = 0;
        e.st = DIZZY;
        e.tm = 60;
        ev(s, 'climb', e.x, e.y, 0, '', e.k);
      }
      return true;
    case TAUNT:
      if (onIce && slip) {
        doSlip(s, e);
        break;
      }
      e.tm += dt;
      if (s.firstPress >= 0 || e.tm > TAUNT_T) e.st = RUNS;
      break;
    case RUNS:
    case FLEE:
      if (onIce && slip) {
        doSlip(s, e);
        break;
      }
      if (e.k === 'hammer' && e.st === RUNS && iceAhead(s, e)) {
        const sp = Math.hypot(e.vx, e.vy) || 1;
        e.st = SMASH;
        e.tm = SMASH_T;
        e.ax = e.vx / sp;
        e.ay = e.vy / sp;
        e.fx = e.vx >= 0 ? 1 : -1;
        ev(s, 'windup', e.x, e.y, 0, '', e.k);
        break;
      }
      steer(s, e, dt);
      break;
    case SMASH:
      if (onIce) {
        doSlip(s, e);
        break;
      }
      e.vx *= 0.6;
      e.vy *= 0.6;
      e.tm -= dt;
      if (e.tm <= 0) {
        smashIce(s, e);
        e.st = RUNS;
      }
      break;
    case SLIDE:
      if (onIce) {
        const k = SLOPEK[e.k] * SLOPE * dt, f = 1 - (1 - ICE_FR) * dt;
        e.vx = (e.vx + s.gxv[ci] * k) * f;
        e.vy = (e.vy + s.gyv[ci] * k) * f;
        const sp = Math.hypot(e.vx, e.vy), vm = VMAX * (e.k === 'fat' ? 1.15 : e.k === 'boss' ? 0.8 : 1);
        if (sp > vm) (e.vx *= vm / sp), (e.vy *= vm / sp);
      } else {
        const f = 1 - (1 - GROUND_FR) * dt;
        e.vx *= f;
        e.vy *= f;
        if (e.vx * e.vx + e.vy * e.vy < STOPV * STOPV) (e.st = DIZZY), (e.tm = GETUP);
      }
      break;
    case DIZZY:
      if (onIce && slip) {
        doSlip(s, e);
        break;
      }
      e.vx *= 0.8;
      e.vy *= 0.8;
      e.tm -= dt;
      if (e.tm <= 0) e.st = e.light ? FLEE : RUNS;
      break;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.walk += Math.hypot(e.vx, e.vy) * dt;
  if (Math.abs(e.vx) > 0.0005) e.fx = e.vx > 0 ? 1 : -1;
  if (e.st === FLEE) {
    if (e.x < -0.08 || e.x > 1.08 || e.y < -0.08) {
      ev(s, 'escape', clamp(e.x, 0, 1), clamp(e.y, 0, GH), 0, '', e.k);
      return false;
    }
  } else if (walls(s, e) && e.st === SLIDE) bonk(s, e);
  for (const p of s.ponds)
    if (Math.hypot(e.x - p.x, e.y - p.y) < p.r - e.r * 0.25) {
      if (e.k === 'boss' && e.hp > 1) {
        e.hp--;
        s.bossHits++;
        e.st = CLIMB;
        e.tm = 70;
        e.x = p.x;
        e.y = p.y;
        e.vx = e.vy = 0;
        ev(s, 'bossdunk', p.x, p.y, 0, '', e.k);
        s.freeze = Math.max(s.freeze, 4);
        return true;
      }
      dunk(s, e, p);
      return false;
    }
  if (e.st !== FLEE && Math.hypot(e.x - LAN.x, e.y - LAN.y) < LAN.r + e.r) steal(s, e);
  return true;
}

function collide(s: IceState) {
  const es = s.ents;
  for (let i = 0; i < es.length; i++) {
    const a = es[i];
    if (a.st === ENTER || a.st === CLIMB) continue;
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j];
      if (b.st === ENTER || b.st === CLIMB) continue;
      const dx = b.x - a.x, rr = a.r + b.r;
      if (dx > rr || dx < -rr) continue;
      const dy = b.y - a.y;
      if (dy > rr || dy < -rr) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 < 1e-12) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ma = MASS[a.k], mb = MASS[b.k], ov = rr - d;
      a.x -= nx * ov * (mb / (ma + mb));
      a.y -= ny * ov * (mb / (ma + mb));
      b.x += nx * ov * (ma / (ma + mb));
      b.y += ny * ov * (ma / (ma + mb));
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel >= 0) continue;
      const J = (-(1 + E_COL) * rel) / (1 / ma + 1 / mb);
      a.vx -= (J / ma) * nx;
      a.vy -= (J / ma) * ny;
      b.vx += (J / mb) * nx;
      b.vy += (J / mb) * ny;
      if (-rel > KNOCK_V) {
        knock(s, a, b);
        knock(s, b, a);
        ev(s, 'thud', (a.x + b.x) / 2, (a.y + b.y) / 2, Math.min(9, Math.round(-rel * 600)));
      }
    }
  }
}

function spawn(s: IceState, sp: Spawn) {
  const [k, side0, pos0] = sp;
  const side = s.flip ? (side0 === 'L' ? 'R' : side0 === 'R' ? 'L' : 'T') : side0;
  const pos = clamp((s.flip && side0 === 'T' ? 1 - pos0 : pos0) + (s.stage ? (s.rng() - 0.5) * 0.05 : 0), 0.08, side === 'T' ? 0.92 : 0.9);
  const r = RADK[k], spd = RUN * SPDK[k] * STAGES[s.stage].speed;
  const x = side === 'T' ? pos : side === 'L' ? -r - 0.02 : 1 + r + 0.02, y = side === 'T' ? -r - 0.02 : pos;
  const e: Ent = {
    id: ++s.nid, k, x, y, vx: side === 'L' ? spd : side === 'R' ? -spd : 0, vy: side === 'T' ? (k === 'ball' ? BALL_V : spd) : 0, r,
    st: ENTER, tm: 0, hp: k === 'boss' ? 2 : 1, light: false, by: '', byT: -999, fx: side === 'R' ? -1 : 1, ax: 0, ay: 1,
    seed: Math.floor(s.rng() * 1e6), walk: 0, slipT: -999, bonkT: -999, hitT: -999, born: s.t,
  };
  s.ents.push(e);
  if (k !== 'gob' && k !== 'ball' && !s.spotted.has(k)) (s.spotted.add(k), (s.spot = { id: e.id, t: s.t + 30, label: KIND_NAME[k] }));
  if (k === 'ball' && !s.spotted.has(k)) (s.spotted.add(k), (s.spot = { id: e.id, t: s.t + 40, label: KIND_NAME[k] }));
}

function startWave(s: IceState) {
  const d = STAGES[s.stage], w = d.waves[s.wave];
  for (const sp of w.foes) s.pend.push({ at: s.wt + sp[3] + (s.stage ? Math.floor(s.rng() * 10) : 0), sp });
  s.wave++;
  s.waveT = 0;
  if (s.wave > 1) ev(s, 'wave', 0.5, 0.2, s.wave);
}

function world(s: IceState, dt: number) {
  if (dt <= 0) return;
  s.wt += dt;
  s.waveT += dt;
  const ice = s.ice, melt = s.melt;
  for (let i = 0; i < ice.length; i++) if (ice[i] > 0) ice[i] = Math.max(0, ice[i] - dt * melt[i]);
  for (let i = s.ents.length - 1; i >= 0; i--) {
    if (i >= s.ents.length) continue;
    if (!entStep(s, s.ents[i], dt)) s.ents.splice(i, 1);
    if (s.phase !== 'play') return;
  }
  collide(s);
  if (s.sim) return;
  const d = STAGES[s.stage];
  for (let i = s.pend.length - 1; i >= 0; i--)
    if (s.pend[i].at <= s.wt) {
      spawn(s, s.pend[i].sp);
      s.pend.splice(i, 1);
    }
  if (d.balls) {
    s.ballT -= dt;
    if (s.ballT <= 0) {
      const xs = d.balls.xs, x0 = xs[s.ballI++ % xs.length];
      spawn(s, ['ball', 'T', x0, 0]);
      s.ballT = d.balls.every;
    }
  }
  const alive = s.ents.reduce((a, e) => a + (e.k === 'ball' ? 0 : 1), 0) + s.pend.length;
  if (s.wave < d.waves.length) {
    if ((alive === 0 && s.waveT >= 50) || s.waveT >= d.waves[s.wave - 1].wait) startWave(s);
  } else if (alive === 0) endStage(s, true, '');
}

function newStage(s: IceState) {
  const d = STAGES[s.stage];
  s.flip = s.stage > 0 && s.rng() < 0.5;
  const F = (x: number) => (s.flip ? 1 - x : x);
  s.ponds = d.ponds.map(([x, y, r]) => ({ x: F(x), y, r }));
  s.obs = (d.obs ?? []).map(([x, y, r, k]) => ({ x: F(x), y, r, k }));
  s.heats = (d.heats ?? []).map(([x, y, r]) => ({ x: F(x), y, r }));
  s.ice.fill(0);
  s.wet.fill(0);
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL, idx = j * NX + i;
      s.melt[idx] = s.heats.some((h) => Math.hypot(cx - h.x, cy - h.y) < h.r) ? HEAT_RATE : 1;
      if (s.ponds.some((p) => Math.hypot(cx - p.x, cy - p.y) < p.r - 0.01)) s.wet[idx] = 1;
    }
  s.lights = s.maxLights = d.lights;
  s.g = GMAX;
  s.ents = [];
  s.pend = [];
  s.wave = 0;
  s.waveT = 0;
  s.ballT = d.key === 'ball' ? 50 : 240;
  s.ballI = 0;
  s.down = false;
  s.painting = false;
  s.strokes = 0;
  s.freeze = 0;
  s.slowT = 0;
  s.dunks = 0;
  s.combo = { n: 0, t: -999 };
  s.best = 0;
  s.lost = 0;
  s.regain = 0;
  s.snowD = s.spikeD = s.fatD = s.hamD = s.bossHits = s.bonks = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.sinks = [];
  s.seen.add(d.key);
  for (const [x, y] of d.taunt ?? []) {
    s.ents.push({
      id: ++s.nid, k: 'gob', x, y, vx: 0, vy: 0, r: RADK.gob, st: TAUNT, tm: 0, hp: 1, light: false, by: '', byT: -999, fx: 1, ax: 1, ay: 0,
      seed: Math.floor(s.rng() * 1e6), walk: 0, slipT: -999, bonkT: -999, hitT: -999, born: s.t,
    });
  }
  startWave(s);
}

function starMet(s: IceState, st: Star) {
  switch (st.k) {
    case 'combo': return s.best >= st.n;
    case 'nolose': return s.lost === 0;
    case 'strokes': return s.strokes <= st.n;
    case 'snow': return s.snowD >= st.n;
    case 'spike': return s.spikeD >= st.n;
    case 'fat': return s.fatD >= st.n;
    case 'hammer': return s.hamD >= st.n;
  }
}
function starNow(s: IceState, st: Star): string {
  const v = st.k === 'combo' ? s.best : st.k === 'snow' ? s.snowD : st.k === 'spike' ? s.spikeD : st.k === 'fat' ? s.fatD : st.k === 'hammer' ? s.hamD : st.k === 'strokes' ? s.strokes : -1;
  if (st.k === 'strokes') return `${v}/${st.n}`;
  return v > 0 && v < st.n ? `${v}/${st.n}` : '';
}

function endStage(s: IceState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.ok = ok;
  if (s.sim) return;
  s.pt = 0;
  s.why = why;
  s.down = false;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, ...d.stars.map((q) => starMet(s, q))];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + 50 + s.lights * 15;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 2;
    s.moodT = 999;
    ev(s, 'clear', 0.5, 0.8);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'fail', LAN.x, LAN.y, 0, why);
  }
}

function cosmetic(s: IceState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.sinks = s.sinks.filter((k) => s.t - k.t < 120);
  s.brush = s.brush.filter((b) => s.t - b.t < 40);
  if (s.spot && s.t - s.spot.t > 110) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

function blank(seed: number): IceState {
  return {
    rng: mulberry32(seed), seed, t: 0, wt: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
    hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, won: false, dead: false, again: false, tries: 0,
    lights: 0, maxLights: 0, g: GMAX, flip: false,
    ice: new Float32Array(NX * NY), gxv: new Float32Array(NX * NY), gyv: new Float32Array(NX * NY), melt: new Float32Array(NX * NY), wet: new Uint8Array(NX * NY),
    ponds: [], obs: [], heats: [], ents: [], nid: 0, wave: 0, waveT: 0, pend: [], ballT: 0, ballI: 0,
    down: false, lx: 0, ly: 0, strokeLen: 0, strokes: 0, painting: false, freeze: 0, slowT: 0,
    dunks: 0, combo: { n: 0, t: -999 }, best: 0, lost: 0, regain: 0, snowD: 0, spikeD: 0, fatD: 0, hamD: 0, bossHits: 0, bonks: 0,
    firstPress: -1, firstBig: -1, firstStroke: false,
    seen: new Set<string>(), spotted: new Set<string>(), newsQ: [], news: null, spot: null, events: [], sinks: [], sim: false,
    camX: 0, mood: 0, moodT: 0, brush: [], cheerT: -999, emptyT: -999,
  };
}

/** 손가락 입력 한 틱 (게임·봇 시뮬레이션 공용) */
function handInput(s: IceState, p: { x: number; y: number } | null) {
  if (p) {
    const q = toGround(p.x, p.y * A);
    if (!s.down) {
      s.down = true;
      s.lx = q.x;
      s.ly = q.y;
      s.strokeLen = 0;
      s.painting = false;
      if (s.firstPress < 0) s.firstPress = s.t;
      return;
    }
    const mv = Math.hypot(q.x - s.lx, q.y - s.ly);
    if (mv > 0.004) {
      const g0 = s.g, len = paintSeg(s, s.lx, s.ly, q.x, q.y);
      if (len > 0) {
        s.strokeLen += len;
        if (!s.painting && s.strokeLen > 0.03) (s.painting = true), s.strokes++;
        if (!s.sim) s.brush.push({ x: q.x, y: q.y, t: s.t });
        if (s.strokeLen > 0.15) s.firstStroke = true;
      } else if (g0 <= 0 && !s.sim && s.t - s.emptyT > 50) (s.emptyT = s.t), ev(s, 'empty', q.x, q.y);
      s.lx = q.x;
      s.ly = q.y;
    }
  } else if (s.down) {
    s.down = false;
    // 톡(거의 안 끌고 뗌) = 작은 얼음 웅덩이 (결 없음 — 올라선 도깨비는 가던 대로 미끄러진다)
    if (s.strokeLen < 0.03 && s.g >= 4) {
      s.g -= 4;
      stamp(s, clamp(s.lx, 0.01, 0.99), clamp(s.ly, 0.01, GH - 0.01), 0, 0);
      if (!s.painting) s.strokes++;
      if (!s.sim) s.brush.push({ x: s.lx, y: s.ly, t: s.t });
    }
    s.painting = false;
  }
}

export const iceslide: GameDef<IceState> = {
  id: 'iceslide',
  name: '빙판 마법 소동',
  genes: ['icepaint', 'pointer', 'chain'],
  twist: '손가락이 지나간 자리가 그은 쪽으로 기운 얼음 미끄럼길이 되어, 올라선 도깨비는 방향을 못 바꾸고 쭉 미끄러진다 — 미끄러진 도깨비가 다른 도깨비를 들이받아 줄줄이 연못에 퐁당, 손가락 한 번이 볼링이 된다',
  rules: [
    '누른 채 그으면 그 자리가 얼음 미끄럼길! 올라선 도깨비는 그은 쪽으로 쭉 미끄러져요.',
    '연못에 빠뜨리면 퐁당! 벽엔 쾅, 다른 도깨비를 들이받으면 같이 밀려나요.',
    '도깨비가 등불에 닿으면 불빛 -1. 다 꺼지면 하트 -1(그 판 다시).',
  ],
  controls: 'touch',
  hint: '누른 채 그으면 얼음 미끄럼길! / 화살표로 움직이고 스페이스 누른 채',
  aspect: A,
  art: {
    concept: '눈 내리는 밤 마을 광장의 꼬마 눈 마법사 — 겨울 동화 디오라마',
    mood: '먼 눈산과 눈 쌓인 지붕, 노랗게 새는 창문 불빛 아래 돌바닥 광장. 손가락이 지나간 자리에 반짝 얼음길이 깔리고, 통통한 도깨비들이 허우적대며 미끄러져 김 나는 연못에 퐁당 빠진다.',
    palette: { bg: '#121a3a', ink: '#f2f6ff', muted: '#8f9cc6', accent: '#9fe8ff', hot: '#ff8a4c', soft: '#26315e' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = blank(seed);
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    if (s.phase === 'play') {
      handInput(s, p);
      if (!s.down) s.g = Math.min(GMAX, s.g + STAGES[s.stage].regen);
    } else s.down = false;
    let dt = 1;
    if (s.freeze > 0) (s.freeze--, (dt = 0));
    else if (s.slowT > 0) (s.slowT--, (dt = 0.4));
    if (s.phase === 'result') {
      s.pt++;
      world(s, 1);
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
/** 땅 좌표 → 포인터(캔버스 0~1) */
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: gsx(x, y), y: gsy(y) / A } });
const REACT_B = 3;
/** 봇 손 빠르기(땅 단위/틱) — 사람 손으로 한 번 쓱 긋는 빠르기 */
const BOT_V = 0.03;
interface Plan { x0: number; y0: number; ux: number; uy: number; len: number; prog: number }

function cloneSim(s: IceState): IceState {
  return {
    ...s,
    ents: s.ents.map((e) => ({ ...e })),
    ice: s.ice.slice(), gxv: s.gxv.slice(), gyv: s.gyv.slice(),
    combo: { ...s.combo }, events: [], sinks: [], brush: [], pend: [], sim: true, down: false,
  };
}
interface Outcome { orphan: number; pts: number; dunks: number; lost: number; regain: number; best: number; snowD: number; spikeD: number; fatD: number; hamD: number; bossHits: number; bonks: number; ok: boolean }
/** 지금부터 H틱: plan대로 그으면 어떻게 되나 (같은 물리) */
function simulate(s: IceState, plan: Plan | null, H: number): Outcome {
  const w = cloneSim(s);
  let prog = 0;
  for (let k = 0; k < H; k++) {
    if (plan && k % REACT_B === 0 && prog < plan.len) {
      const p2 = Math.min(plan.len, prog + BOT_V * REACT_B);
      paintSeg(w, plan.x0 + plan.ux * prog, plan.y0 + plan.uy * prog, plan.x0 + plan.ux * p2, plan.y0 + plan.uy * p2);
      prog = p2;
    }
    w.t++;
    world(w, 1);
    if (w.phase !== 'play') break;
  }
  // 들이받을 짝이 곁에 없는 스파이크 = 곧 불빛을 훔친다
  let orphan = 0;
  for (const e of w.ents)
    if (e.k === 'spike' && e.st !== SLIDE && !w.ents.some((o) => o.k !== 'spike' && o.st !== SLIDE && o.st !== FLEE && Math.hypot(o.x - e.x, o.y - e.y) < 0.3)) orphan++;
  return {
    orphan,
    pts: w.pts - s.pts, dunks: w.dunks - s.dunks, lost: w.lost - s.lost, regain: w.regain - s.regain, best: w.best,
    snowD: w.snowD - s.snowD, spikeD: w.spikeD - s.spikeD, fatD: w.fatD - s.fatD, hamD: w.hamD - s.hamD, bossHits: w.bossHits - s.bossHits, bonks: w.bonks - s.bonks,
    ok: w.phase === 'play' || w.ok,
  };
}
function value(s: IceState, o: Outcome) {
  const d = STAGES[s.stage];
  let v = o.pts * 2 + o.dunks * 40 - o.lost * 700 + o.regain * 500 + o.bossHits * 300 + o.bonks * 6 - o.orphan * 380;
  for (const st of d.stars) {
    if (starMet(s, st) && st.k !== 'nolose' && st.k !== 'strokes') continue;
    if (st.k === 'combo' && o.best >= st.n) v += 450;
    if (st.k === 'snow') v += o.snowD * 260;
    if (st.k === 'spike') v += o.spikeD * 260;
    if (st.k === 'fat') v += o.fatD * 260;
    if (st.k === 'hammer') v += o.hamD * 260;
    if (st.k === 'nolose') v -= o.lost * 500;
  }
  if (!o.ok) v -= 5000;
  return v;
}

/** 후보 긋기: 미끄러질 수 있는 것마다 — 바로 발밑에서 연못 쪽으로 · 앞길에 미리 까는 덫 · 둘을 한 줄로 꿰어 연못으로 */
function cands(s: IceState): (Plan & { pre: number })[] {
  const out: (Plan & { pre: number })[] = [];
  const Lmax = Math.min(0.8, (s.g - 0.5) / COST);
  if (Lmax < 0.1) return out;
  const live = s.ents.filter((e) => e.st !== ENTER && e.st !== CLIMB);
  const add = (px: number, py: number, tx: number, ty: number, len: number, base: number, back = 0.035) => {
    const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy);
    if (d < 0.05) return;
    const ux = dx / d, uy = dy / d, x0 = px - ux * back, y0 = py - uy * back;
    if (x0 < 0 || x0 > 1 || y0 < 0 || y0 > GH) return;
    const L = clamp(len + back, 0.1, Lmax);
    // 미끄러진 길이 등불을 지나가면 버린다
    const qx = LAN.x - x0, qy = LAN.y - y0, al = qx * ux + qy * uy;
    if (al > 0 && al < L + 0.2 && Math.abs(qx * uy - qy * ux) < LAN.r + 0.05) return;
    // 길 위에(지금·곧) 걸리는 것 수
    let caught = 0;
    for (const o of live) {
      if (o.k === 'spike' && o.st !== SLIDE) continue;
      for (const tau of [4, 16, 32, 50]) {
        const ox = o.x + o.vx * tau - x0, oy = o.y + o.vy * tau - y0, u = ox * ux + oy * uy;
        if (u < -0.02 || u > L) continue;
        if (Math.abs(ox * uy - oy * ux) < BR * 0.9) {
          caught += tau < 20 ? 1 : 0.7;
          break;
        }
      }
    }
    out.push({ x0, y0, ux, uy, len: L, prog: -1, pre: base + caught * 10 - L * 4 });
  };
  for (const e of live) {
    if (e.k === 'spike' || (e.st === SLIDE && e.k !== 'ball')) continue;
    const px = e.x + e.vx * 5, py = e.y + e.vy * 5;
    if (px < 0.03 || px > 0.97 || py < 0.03 || py > GH - 0.03) continue;
    const urgent = Math.hypot(e.x - LAN.x, e.y - LAN.y) < 0.35 ? 20 : 0;
    for (const p of s.ponds) {
      add(px, py, p.x, p.y, Math.hypot(p.x - px, p.y - py) - p.r * 0.55 - 0.05, urgent + (e.light ? 30 : 0));
      // 덫: 앞길(곧 지나갈 자리)에 미리
      if (e.k !== 'hammer')
        for (const tau of [24, 48]) {
          const qx = e.x + e.vx * tau, qy = e.y + e.vy * tau;
          if (qx < 0.05 || qx > 0.95 || qy < 0.05 || qy > GH - 0.05) continue;
          add(qx, qy, p.x, p.y, Math.hypot(p.x - qx, p.y - qy) - p.r * 0.55 - 0.03, urgent * 0.5, 0.09);
        }
    }
    // 눈덩이는 옆으로 틀기만 해도 등불을 비켜 간다
    if (e.k === 'ball') {
      for (const sx of [-1, 1]) add(px, py, px + sx, py + 0.25, 0.3, urgent);
      // 볼링: 무리가 곧 있을 자리로, 그 너머에 연못이 있으면 연못까지
      for (const o of live) {
        if (o === e || o.k === 'ball') continue;
        for (const tau of [15, 35]) {
          const ox = o.x + o.vx * tau, oy = o.y + o.vy * tau, dx = ox - px, dy = oy - py, d = Math.hypot(dx, dy);
          if (d < 0.05 || d > 0.6) continue;
          const ux = dx / d, uy = dy / d;
          let far = d + 0.15;
          for (const p of s.ponds) {
            const qx = p.x - px, qy = p.y - py, al = qx * ux + qy * uy;
            if (al > d && al < d + 0.45 && Math.abs(qx * uy - qy * ux) < p.r * 0.9) far = Math.max(far, al - p.r * 0.4);
          }
          add(px, py, px + ux, py + uy, far, urgent + 14);
        }
      }
    }
    // 둘을 한 줄로: e에서 o를 지나 그 너머 연못까지
    for (const o of live) {
      if (o === e || o.k === 'ball') continue;
      const ox = o.x + o.vx * 10, oy = o.y + o.vy * 10, dx = ox - px, dy = oy - py, d = Math.hypot(dx, dy);
      if (d < 0.04 || d > 0.5) continue;
      const ux = dx / d, uy = dy / d;
      for (const p of s.ponds) {
        const qx = p.x - px, qy = p.y - py, al = qx * ux + qy * uy;
        if (al < d || Math.abs(qx * uy - qy * ux) > p.r * 0.85) continue;
        add(px, py, px + ux, py + uy, al - p.r * 0.5, urgent + 12 + (o.k === 'spike' ? 20 : 0) + (e.k === 'fat' || e.k === 'ball' ? 10 : 0));
      }
      // 무거운 것(뚱보·눈덩이·대장)으로 들이받기, 스파이크 판엔 스파이크를 들이받기
      if (e.k === 'fat' || e.k === 'ball' || e.k === 'boss' || o.k === 'spike')
        add(px, py, ox, oy, d + 0.14, urgent + (o.k === 'spike' ? 15 : 5));
    }
  }
  return out;
}

const smartMem = new WeakMap<object, { plan: Plan | null; next: number; since: number; key: string }>();
function runPlan(m: { plan: Plan | null }): Input {
  const P = m.plan!;
  if (P.prog < 0) {
    P.prog = 0;
    return at(P.x0, P.y0);
  }
  if (P.prog >= P.len) {
    m.plan = null;
    return NO;
  }
  P.prog = Math.min(P.len, P.prog + BOT_V * REACT_B);
  return at(P.x0 + P.ux * P.prog, P.y0 + P.uy * P.prog);
}

/**
 * 봇: 후보 긋기(도깨비마다 연못 쪽·들이받을 것 쪽)를 미리 그어 보고(같은 물리로 100틱) 가장 이득인 것을 긋는다.
 * 별 목표(한 번에 셋·눈덩이·뚱보·스파이크·망치)·불빛 잃기·얼음 값을 따진다. 이득이 작으면 기다리며 게이지를 모은다.
 */
export const iceslideSmart: Bot<IceState> = {
  name: '내다보고 긋기',
  act(s) {
    let m = smartMem.get(s);
    if (!m) smartMem.set(s, (m = { plan: null, next: 0, since: 0, key: '' }));
    if (s.phase !== 'play') {
      m.plan = null;
      return NO;
    }
    if (m.plan) return runPlan(m);
    if (s.down) return NO;
    if (s.t < m.next) return NO;
    m.next = s.t + 6;
    const cs = cands(s);
    if (!cs.length) return NO;
    cs.sort((a, b) => b.pre - a.pre);
    const H = 130, base = value(s, simulate(s, null, H)), d = STAGES[s.stage];
    let best: Plan | null = null, bv = 0;
    const strokesStar = d.stars.some((q) => q.k === 'strokes'), gw = clamp(0.3 / d.regen, 0.8, 2.4) * (s.g < 40 ? 1.4 : 1);
    for (const c of cs.slice(0, 9)) {
      const v = value(s, simulate(s, c, H)) - base - c.len * COST * gw - (strokesStar ? 140 : 0);
      if (v > bv) (bv = v), (best = c);
    }
    const thr = s.g > 92 ? 25 : 55;
    if (!best || bv < thr) return NO;
    m.plan = { ...best, prog: -1 };
    return runPlan(m);
  },
};

const dumbMem = new WeakMap<object, { next: number; plan: Plan | null; v: number }>();
/** 봇: 아무 때나 아무 데나 아무 쪽으로 쓱 긋는다 */
export const iceslideRandom: Bot<IceState> = {
  name: '아무 데나 쓱',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 30 + Math.floor(rng() * 60), plan: null, v: 0.02 }));
    if (m.plan) {
      const P = m.plan;
      if (P.prog < 0) return (P.prog = 0), at(P.x0, P.y0);
      if (P.prog >= P.len) return (m.plan = null), NO;
      P.prog = Math.min(P.len, P.prog + m.v);
      return at(P.x0 + P.ux * P.prog, P.y0 + P.uy * P.prog);
    }
    if (s.t < m.next || s.phase !== 'play') return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    const a = rng() * Math.PI * 2;
    m.plan = { x0: 0.08 + rng() * 0.84, y0: 0.08 + rng() * (GH - 0.25), ux: Math.cos(a), uy: Math.sin(a), len: 0.1 + rng() * 0.45, prog: -1 };
    m.v = 0.012 + rng() * 0.025;
    return NO;
  },
};

const habitMem = new WeakMap<object, { plan: Plan | null; next: number }>();
function habitRun(s: IceState, pick: (s: IceState) => Plan | null): Input {
  let m = habitMem.get(s);
  if (!m) habitMem.set(s, (m = { plan: null, next: 0 }));
  if (s.phase !== 'play') return (m.plan = null), NO;
  if (m.plan) return runPlan(m);
  if (s.down || s.t < m.next) return NO;
  m.next = s.t + 6;
  const P = pick(s);
  if (!P) return NO;
  m.plan = P;
  return runPlan(m);
}
/** 버릇 봇: 늘 등불에 가장 가까운 도깨비를, 그 도깨비에게 가장 가까운 연못 쪽으로 긋는다 (기다리기·여럿 잡기·별 목표 없음) */
export const iceslideHabit: Bot<IceState> = {
  name: '늘 가장 가까운 적을 가까운 연못으로',
  act: (s) =>
    habitRun(s, (s) => {
      let e: Ent | null = null, bd = 1e9;
      for (const q of s.ents) {
        if (q.st === ENTER || q.st === CLIMB || q.st === SLIDE || q.k === 'ball' || q.k === 'spike') continue;
        const d = Math.hypot(q.x - LAN.x, q.y - LAN.y);
        if (d < bd) (bd = d), (e = q);
      }
      if (!e || s.g < 20) return null;
      const p = s.ponds.reduce((a, q) => (Math.hypot(q.x - e!.x, q.y - e!.y) - q.r < Math.hypot(a.x - e!.x, a.y - e!.y) - a.r ? q : a), s.ponds[0]);
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      return { x0: e.x - ux * 0.035, y0: e.y - uy * 0.035, ux, uy, len: clamp(d - p.r * 0.5, 0.1, (s.g - 0.5) / COST), prog: -1 };
    }),
};
/** 독립 버릇 봇: 늘 등불 바로 앞 같은 자리에, 가장 가까운 연못 쪽으로 긋는 덫 (얼음이 녹으면 또) */
export const iceslideHabit2: Bot<IceState> = {
  name: '늘 등불 앞에 같은 덫',
  act: (s) =>
    habitRun(s, (s) => {
      const tx = LAN.x, ty = LAN.y - 0.24, c = cellAt(tx, ty);
      if (c >= 0 && s.ice[c] > 60) return null;
      const p = s.ponds.reduce((a, q) => (Math.hypot(q.x - tx, q.y - ty) < Math.hypot(a.x - tx, a.y - ty) ? q : a), s.ponds[0]);
      const dx = p.x - tx, dy = p.y - ty, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const len = clamp(d - p.r * 0.5 + 0.12, 0.1, 0.7);
      if (s.g < len * COST + 2) return null;
      return { x0: tx - ux * 0.12, y0: ty - uy * 0.12, ux, uy, len, prog: -1 };
    }),
};

// ───────────────────────────── 그리기 (임시) ─────────────────────────────
type C2 = CanvasRenderingContext2D;
function drawAll(ctx: C2, s: IceState, w: number, h: number, th: Theme) {
  const fx = juice(s);
  const X = (gx: number, gy: number) => gsx(gx, gy) * w, Y = (gy: number) => gsy(gy) * w, R = (r: number) => r * w;
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = '#121a3a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3a4466';
  ctx.beginPath();
  ctx.moveTo(X(0, 0), Y(0));
  ctx.lineTo(X(1, 0), Y(0));
  ctx.lineTo(X(1, GH), Y(GH));
  ctx.lineTo(X(0, GH), Y(GH));
  ctx.fill();
  for (const h2 of s.heats) {
    ctx.fillStyle = 'rgba(255,140,60,.25)';
    ctx.beginPath();
    ctx.ellipse(X(h2.x, h2.y), Y(h2.y), R(h2.r) * psc(h2.y), R(h2.r) * SQ, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const v = s.ice[j * NX + i];
      if (v <= 0) continue;
      ctx.fillStyle = `rgba(190,240,255,${Math.min(1, v / 60) * 0.7})`;
      const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
      ctx.fillRect(X(cx, cy) - R(CELL) / 2, Y(cy) - (R(CELL) * SQ) / 2, R(CELL), R(CELL) * SQ);
    }
  for (const p of s.ponds) {
    ctx.fillStyle = '#1b5d7a';
    ctx.beginPath();
    ctx.ellipse(X(p.x, p.y), Y(p.y), R(p.r) * psc(p.y), R(p.r) * SQ, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const o of s.obs) {
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(X(o.x, o.y), Y(o.y), R(o.r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd36b';
  ctx.beginPath();
  ctx.arc(X(LAN.x, LAN.y), Y(LAN.y), R(LAN.r), 0, Math.PI * 2);
  ctx.fill();
  for (const e of s.ents) {
    ctx.fillStyle = e.k === 'ball' ? '#fff' : e.k === 'spike' ? '#5c5' : e.k === 'fat' ? '#a5f' : e.k === 'hammer' ? '#59f' : e.k === 'boss' ? '#f33' : '#f84';
    if (e.st === SLIDE) ctx.fillStyle = '#ff0';
    if (e.st === DIZZY) ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(X(e.x, e.y), Y(e.y), R(e.r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`${s.stage + 1} 불빛 ${s.lights} 하트 ${s.hearts} 별 ${s.stars} g ${s.g.toFixed(0)} pts ${s.pts}`, 8, 20);
  void th;
}
