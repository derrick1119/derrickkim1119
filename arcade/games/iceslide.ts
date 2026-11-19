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
      { wait: 480, foes: train('gob', 'T', 0.72, 0, 2) },
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
    stars: [S('snow', 3, '눈덩이로 셋 빠뜨리기'), S('strokes', 10, '열 번만 긋고 지키기')],
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
  if (e.st !== FLEE && Math.hypot(e.x - LAN.x, e.y - LAN.y) < LAN.r + e.r) {
    if (!e.light) steal(s, e);
    else {
      // 불빛을 든 채 미끄러져 와 부딪히면 등불 받침에 튕겨 난다
      const dx = e.x - LAN.x, dy = e.y - LAN.y, d = Math.hypot(dx, dy) || 1;
      e.x = LAN.x + (dx / d) * (LAN.r + e.r);
      e.y = LAN.y + (dy / d) * (LAN.r + e.r);
      const vn = (e.vx * dx + e.vy * dy) / d;
      if (vn < 0) (e.vx -= (1 + WALL_E) * vn * (dx / d)), (e.vy -= (1 + WALL_E) * vn * (dy / d));
    }
  }
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
/** 눈송이 아이콘 (여섯 갈래) */
function flake(ctx: C2, x: number, y: number, r: number, col: string, lw: number) {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3, cx = Math.cos(a), cy = Math.sin(a);
    ctx.moveTo(x, y);
    ctx.lineTo(x + cx * r, y + cy * r);
    const bx = x + cx * r * 0.55, by = y + cy * r * 0.55;
    for (const sd of [-1, 1]) {
      const a2 = a + sd * 0.7;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a2) * r * 0.32, by + Math.sin(a2) * r * 0.32);
    }
  }
  ctx.stroke();
}
/** 작은 불꽃 방울 (등불의 불빛 하나) */
function flamePath(ctx: C2, x: number, y: number, r: number, t: number, seed: number) {
  const wob = Math.sin(t * 0.25 + seed) * r * 0.12;
  ctx.beginPath();
  ctx.moveTo(x + wob, y - r * 1.5);
  ctx.bezierCurveTo(x + r * 0.95, y - r * 0.55, x + r * 0.85, y + r * 0.75, x, y + r * 0.8);
  ctx.bezierCurveTo(x - r * 0.85, y + r * 0.75, x - r * 0.95, y - r * 0.55, x + wob, y - r * 1.5);
  ctx.closePath();
}
const OUT = '#1b1736';

// ── 장소별 팔레트: 0 마을 광장 · 1 장터 · 2 호숫가 종탑 ──
const PAL = [
  { sky: ['#070b24', '#16245a', '#36508e'], hz: '120,150,220', far: ['#3b4f8a', '#6d84c0'], wall: ['#3a3152', '#4a3c5c', '#2f3b5e'], roof: '#232843', stone: ['#59627f', '#646d8b', '#6f7896', '#5e6683'], mortar: '#2c3149', moon: '#fff4d6' },
  { sky: ['#0f0a26', '#2c1d55', '#664a86'], hz: '200,140,190', far: ['#4a3f7e', '#8a74b8'], wall: ['#4c3348', '#5a3a4a', '#3e3657'], roof: '#2a2140', stone: ['#62607a', '#6e6a84', '#7a7590', '#68647e'], mortar: '#302c44', moon: '#ffe8cc' },
  { sky: ['#041520', '#0d3446', '#2a6676'], hz: '120,220,210', far: ['#2a5a70', '#5d97a8'], wall: ['#2f3e52', '#3b4458', '#2b3a4c'], roof: '#1c2a38', stone: ['#56687a', '#617386', '#6c7f92', '#5b6d80'], mortar: '#27323f', moon: '#e9fbff' },
];

interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; floor: HTMLCanvasElement; wins: number[][]; chim: number[][] }
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
function pine(g: C2, x: number, base: number, ht: number, col: string, seed: number) {
  const tiers = 4;
  g.fillStyle = '#2a1d16';
  g.fillRect(x - ht * 0.03, base - ht * 0.12, ht * 0.06, ht * 0.12);
  for (let k = 0; k < tiers; k++) {
    const ty = base - ht * 0.1 - k * ht * 0.21, wd = ht * (0.36 - k * 0.07);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x - wd, ty);
    g.lineTo(x, ty - ht * 0.34);
    g.lineTo(x + wd, ty);
    g.closePath();
    g.fill();
    // 가지 위 눈
    g.fillStyle = 'rgba(240,247,255,.92)';
    g.beginPath();
    g.moveTo(x - wd * 0.92, ty - ht * 0.015);
    g.quadraticCurveTo(x - wd * 0.4, ty - ht * 0.09 - hsh(seed + k) * ht * 0.03, x, ty - ht * 0.33);
    g.quadraticCurveTo(x + wd * 0.2, ty - ht * 0.16, x + wd * 0.75, ty - ht * 0.03);
    g.quadraticCurveTo(x + wd * 0.2, ty - ht * 0.07, x - wd * 0.92, ty - ht * 0.015);
    g.fill();
  }
}
/** 눈 덮인 집 한 채 (창문 자리를 wins에 모은다) */
function house(g: C2, x: number, base: number, wd: number, ht: number, roofH: number, wall: string, roof: string, seed: number, wins: number[][], chim: number[][]) {
  // 벽
  g.fillStyle = lin(g, x, base - ht, x + wd, base, [0, wall], [1, '#1d1a30']);
  g.fillRect(x, base - ht, wd, ht);
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.lineWidth = 1;
  for (let yy = base - ht + 6; yy < base; yy += 7) {
    g.beginPath();
    g.moveTo(x, yy);
    g.lineTo(x + wd, yy);
    g.stroke();
  }
  // 굴뚝
  if (hsh(seed + 3) < 0.7) {
    const cx = x + wd * (0.25 + hsh(seed + 4) * 0.5), cw = Math.max(5, wd * 0.12);
    g.fillStyle = '#4a3a3a';
    g.fillRect(cx, base - ht - roofH * 0.95, cw, roofH * 0.6);
    g.fillStyle = '#f2f7ff';
    rr(g, cx - 1.5, base - ht - roofH * 0.95 - 3, cw + 3, 5, 2.5);
    g.fill();
    chim.push([cx + cw / 2, base - ht - roofH * 0.95 - 3]);
  }
  // 지붕
  const ov = wd * 0.08;
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(x - ov, base - ht);
  g.lineTo(x + wd / 2, base - ht - roofH);
  g.lineTo(x + wd + ov, base - ht);
  g.closePath();
  g.fill();
  // 지붕 위 두꺼운 눈 (아래로 흘러내린 고드름 같은 덩이)
  g.fillStyle = lin(g, 0, base - ht - roofH, 0, base - ht, [0, '#ffffff'], [1, '#d6e4fb']);
  g.beginPath();
  g.moveTo(x - ov - 2, base - ht + 2);
  g.lineTo(x + wd / 2, base - ht - roofH - 3);
  g.lineTo(x + wd + ov + 2, base - ht + 2);
  for (let k = 8; k >= 0; k--) {
    const px = x - ov + ((wd + ov * 2) * k) / 8, dr = 2 + hsh(seed * 7 + k) * 4;
    g.quadraticCurveTo(px + (wd + ov * 2) / 16, base - ht + dr + 3, px, base - ht + 2);
  }
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(150,175,230,.35)';
  g.beginPath();
  g.moveTo(x + wd / 2, base - ht - roofH - 3);
  g.lineTo(x + wd + ov + 2, base - ht + 2);
  g.lineTo(x + wd / 2 + 4, base - ht - 2);
  g.closePath();
  g.fill();
  // 창문
  const nw = Math.max(1, Math.floor(wd / 22)), wy = base - ht * 0.62, ww = Math.min(11, wd / (nw * 2.2)), wh = ww * 1.25;
  for (let k = 0; k < nw; k++) {
    const wx = x + (wd * (k + 0.5)) / nw - ww / 2;
    const lit = hsh(seed + k * 13) < 0.82;
    g.fillStyle = lit ? radg(g, wx + ww / 2, wy + wh / 2, 0, ww * 2.2, [0, 'rgba(255,200,110,.45)'], [1, 'rgba(255,200,110,0)']) : 'rgba(0,0,0,0)';
    g.fillRect(wx - ww * 1.5, wy - wh, ww * 4, wh * 3);
    g.fillStyle = lit ? lin(g, wx, wy, wx, wy + wh, [0, '#ffe7a8'], [1, '#ffb259']) : '#232a44';
    g.fillRect(wx, wy, ww, wh);
    g.strokeStyle = '#2a1d1d';
    g.lineWidth = 1.4;
    g.strokeRect(wx, wy, ww, wh);
    g.beginPath();
    g.moveTo(wx + ww / 2, wy);
    g.lineTo(wx + ww / 2, wy + wh);
    g.moveTo(wx, wy + wh / 2);
    g.lineTo(wx + ww, wy + wh / 2);
    g.stroke();
    g.fillStyle = '#f2f7ff';
    rr(g, wx - 1.5, wy + wh - 1, ww + 3, 3, 1.5);
    g.fill();
    if (lit) wins.push([wx, wy, ww, wh]);
  }
  // 문
  if (wd > 30 && hsh(seed + 9) < 0.6) {
    const dx = x + wd * 0.5 - 4;
    g.fillStyle = '#5a3a26';
    rr(g, dx, base - 13, 8, 13, 3);
    g.fill();
    g.fillStyle = '#ffd36b';
    g.fillRect(dx + 5.5, base - 7, 1.5, 1.5);
  }
}
/** 장터 노점 (줄무늬 차양 + 종이 등) */
function stall(g: C2, x: number, base: number, wd: number, ht: number, c1: string, seed: number) {
  g.fillStyle = '#4a3328';
  g.fillRect(x + 2, base - ht, 3, ht);
  g.fillRect(x + wd - 5, base - ht, 3, ht);
  g.fillStyle = '#6b4a34';
  g.fillRect(x, base - ht * 0.38, wd, ht * 0.38);
  g.fillStyle = '#ffcf7a';
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.arc(x + 6 + k * ((wd - 12) / 3), base - ht * 0.42, 2.4, 0, TAU);
    g.fill();
  }
  const n = 6, aw = wd / n;
  for (let k = 0; k < n; k++) {
    g.fillStyle = k % 2 ? '#f6efe6' : c1;
    g.beginPath();
    g.moveTo(x + k * aw, base - ht);
    g.lineTo(x + (k + 1) * aw, base - ht);
    g.lineTo(x + (k + 1) * aw, base - ht + 7);
    g.quadraticCurveTo(x + (k + 0.5) * aw, base - ht + 11, x + k * aw, base - ht + 7);
    g.closePath();
    g.fill();
  }
  g.fillStyle = '#f4f8ff';
  rr(g, x - 2, base - ht - 5, wd + 4, 7, 3.5);
  g.fill();
  void seed;
}
/** 종탑 */
function tower(g: C2, x: number, base: number, wd: number, ht: number, wall: string, roof: string) {
  g.fillStyle = lin(g, x, 0, x + wd, 0, [0, wall], [1, '#151a2a']);
  g.fillRect(x, base - ht, wd, ht);
  g.fillStyle = '#ffd98a';
  rr(g, x + wd * 0.3, base - ht * 0.82, wd * 0.4, wd * 0.5, wd * 0.2);
  g.fill();
  g.fillStyle = '#7a5520';
  ell(g, x + wd / 2, base - ht * 0.82 + wd * 0.32, wd * 0.12, wd * 0.12);
  g.fill();
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(x - 4, base - ht);
  g.lineTo(x + wd / 2, base - ht - wd * 1.1);
  g.lineTo(x + wd + 4, base - ht);
  g.closePath();
  g.fill();
  g.fillStyle = '#f4f8ff';
  g.beginPath();
  g.moveTo(x - 5, base - ht + 2);
  g.lineTo(x + wd / 2, base - ht - wd * 1.1 - 2);
  g.lineTo(x + wd * 0.62, base - ht - wd * 0.6);
  g.quadraticCurveTo(x + wd * 0.3, base - ht - 2, x - 5, base - ht + 2);
  g.fill();
  g.strokeStyle = '#d9c38a';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x + wd / 2, base - ht - wd * 1.1);
  g.lineTo(x + wd / 2, base - ht - wd * 1.4);
  g.stroke();
}
function mountains(g: C2, w: number, base: number, amp: number, col: string, snow: string, seed: number, n: number) {
  const pts: number[][] = [];
  for (let k = 0; k <= n; k++) pts.push([(k / n) * w, base - amp * (0.35 + hsh(seed + k * 3.7) * 0.65)]);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, base + 4);
  for (let k = 0; k < pts.length; k++) {
    const [x, y] = pts[k];
    if (k === 0) g.lineTo(x, y);
    else {
      const [px, py] = pts[k - 1], mx = (px + x) / 2, my = Math.min(py, y) - amp * 0.1 * hsh(seed + k);
      g.lineTo(mx, my - amp * 0.18);
      g.lineTo(x, y);
    }
  }
  g.lineTo(w, base + 4);
  g.closePath();
  g.fill();
  // 눈 덮인 봉우리
  g.fillStyle = snow;
  for (let k = 1; k < pts.length; k++) {
    const [px, py] = pts[k - 1], [x, y] = pts[k], mx = (px + x) / 2, my = Math.min(py, y) - amp * 0.1 * hsh(seed + k) - amp * 0.18;
    const cap = amp * 0.16;
    g.beginPath();
    g.moveTo(mx, my);
    g.lineTo(mx - cap * 1.1, my + cap);
    g.lineTo(mx - cap * 0.4, my + cap * 0.7);
    g.lineTo(mx, my + cap * 1.05);
    g.lineTo(mx + cap * 0.5, my + cap * 0.65);
    g.lineTo(mx + cap * 1.0, my + cap * 0.95);
    g.closePath();
    g.fill();
  }
}

function getBg(w: number, h: number, place: number, sc: number): Bg {
  const key = `${w}x${h}:${place}:${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const P = PAL[place], hz = FY0 * w;
  const sky = layer(w, hz + w * 0.02, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, hz, [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, hz + w * 0.02);
    if (place === 2) {
      // 오로라
      for (let k = 0; k < 3; k++) {
        g.fillStyle = lin(g, 0, w * 0.05, 0, w * 0.26, [0, 'rgba(120,255,200,0)'], [0.5, `rgba(${k ? '140,255,210' : '120,200,255'},${0.16 - k * 0.04})`], [1, 'rgba(120,255,200,0)']);
        g.beginPath();
        g.moveTo(0, w * (0.12 + k * 0.03));
        for (let x = 0; x <= w; x += w / 12) g.lineTo(x, w * (0.1 + k * 0.03) + Math.sin(x / w * 6 + k) * w * 0.035);
        for (let x = w; x >= 0; x -= w / 12) g.lineTo(x, w * (0.2 + k * 0.03) + Math.sin(x / w * 5 + k * 2) * w * 0.03);
        g.closePath();
        g.fill();
      }
    }
    for (let k = 0; k < 80; k++) {
      g.globalAlpha = 0.25 + hsh(k * 3.1) * 0.65;
      g.fillStyle = k % 7 ? '#e3eaff' : '#fff0c0';
      g.beginPath();
      g.arc(hsh(k) * w, hsh(k + 99) * hz * 0.75, k % 9 ? 0.7 : 1.4, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    const mx = w * (place === 1 ? 0.24 : 0.78), my = w * 0.15, mr = w * 0.055;
    g.fillStyle = radg(g, mx, my, mr * 0.6, mr * 4, [0, 'rgba(255,245,215,.32)'], [1, 'rgba(255,245,215,0)']);
    g.fillRect(0, 0, w, hz);
    g.fillStyle = radg(g, mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mr, [0, '#ffffff'], [0.7, P.moon], [1, '#d8e2f0']);
    g.beginPath();
    g.arc(mx, my, mr, 0, TAU);
    g.fill();
    // 초승달로 깎기
    g.fillStyle = P.sky[1];
    g.globalAlpha = 0.92;
    g.beginPath();
    g.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.88, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    // 지평선 빛
    g.fillStyle = lin(g, 0, hz * 0.6, 0, hz, [0, `rgba(${P.hz},0)`], [1, `rgba(${P.hz},.28)`]);
    g.fillRect(0, hz * 0.6, w, hz * 0.4 + w * 0.02);
  });
  const far = layer(w * 1.12, hz, sc, (g) => {
    mountains(g, w * 1.12, hz - w * 0.02, w * 0.17, P.far[0], 'rgba(235,242,255,.85)', place * 11 + 1, 7);
    g.globalAlpha = 0.9;
    mountains(g, w * 1.12, hz + w * 0.005, w * 0.1, P.far[1], 'rgba(250,252,255,.95)', place * 11 + 5, 10);
    g.globalAlpha = 1;
    // 먼 산 아래 안개
    g.fillStyle = lin(g, 0, hz - w * 0.06, 0, hz, [0, `rgba(${P.hz},0)`], [1, `rgba(${P.hz},.35)`]);
    g.fillRect(0, hz - w * 0.06, w * 1.12, w * 0.06);
  });
  const wins: number[][] = [], chim: number[][] = [];
  const mid = layer(w * 1.16, hz + w * 0.03, sc, (g) => {
    const base = hz + w * 0.015, W = w * 1.16;
    if (place === 2) {
      // 얼어붙은 호수 띠
      g.fillStyle = lin(g, 0, base - w * 0.07, 0, base, [0, '#9fd3e6'], [1, '#d9f3ff']);
      g.fillRect(0, base - w * 0.06, W, w * 0.06);
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = 1;
      for (let k = 0; k < 9; k++) {
        g.beginPath();
        g.moveTo(hsh(k + 40) * W, base - w * 0.05 + hsh(k + 41) * w * 0.04);
        g.lineTo(hsh(k + 40) * W + w * 0.08, base - w * 0.05 + hsh(k + 41) * w * 0.04);
        g.stroke();
      }
      for (const px of [0.05, 0.18, 0.9, 1.05]) pine(g, px * W, base - w * 0.045, w * (0.15 + hsh(px * 9) * 0.05), '#183a3e', px * 100);
      tower(g, W * 0.6, base - w * 0.04, w * 0.075, w * 0.2, P.wall[2], P.roof);
      house(g, W * 0.28, base - w * 0.04, w * 0.14, w * 0.075, w * 0.06, P.wall[0], P.roof, 51, wins, chim);
      house(g, W * 0.72, base - w * 0.04, w * 0.13, w * 0.07, w * 0.055, P.wall[1], P.roof, 57, wins, chim);
      pine(g, W * 0.44, base - w * 0.03, w * 0.13, '#1d4448', 7);
    } else {
      const cols = place === 0 ? [0.1, 0.17, 0.12, 0.2, 0.13, 0.16, 0.14] : [0.16, 0.13, 0.18, 0.12, 0.17, 0.14];
      let x = -w * 0.03;
      cols.forEach((cw, k) => {
        const wd = cw * w, ht = w * (0.07 + hsh(k * 3 + place) * 0.06), rh = w * (0.04 + hsh(k * 5 + place) * 0.035);
        house(g, x, base - w * 0.005, wd - 2, ht, rh, P.wall[k % 3], P.roof, k * 17 + place * 5, wins, chim);
        x += wd + w * 0.012;
      });
      if (place === 0) for (const px of [0.33, 0.78]) pine(g, px * W, base, w * 0.14, '#1d3a3a', px * 50);
      if (place === 1) {
        // 노점 줄과 종이 등 줄
        stall(g, W * 0.12, base, w * 0.15, w * 0.07, '#d9483b', 1);
        stall(g, W * 0.42, base, w * 0.14, w * 0.065, '#3b6fd9', 2);
        stall(g, W * 0.72, base, w * 0.15, w * 0.07, '#2f9a5a', 3);
        g.strokeStyle = 'rgba(30,20,30,.7)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(0, base - w * 0.13);
        g.quadraticCurveTo(W / 2, base - w * 0.08, W, base - w * 0.13);
        g.stroke();
        for (let k = 1; k < 14; k++) {
          const u = k / 14, lx = u * W, ly = base - w * 0.13 + Math.sin(u * Math.PI) * w * 0.025 + 3;
          g.fillStyle = radg(g, lx, ly, 0, 9, [0, 'rgba(255,170,90,.6)'], [1, 'rgba(255,170,90,0)']);
          g.fillRect(lx - 9, ly - 9, 18, 18);
          g.fillStyle = k % 3 ? '#ff7a4a' : '#ffcf5a';
          ell(g, lx, ly, 3, 3.8);
          g.fill();
        }
      }
    }
    // 광장 뒤 낮은 눈 담
    g.fillStyle = lin(g, 0, base - w * 0.012, 0, base + w * 0.03, [0, '#f4f8ff'], [1, '#b9cbee']);
    g.beginPath();
    g.moveTo(0, base + w * 0.03);
    for (let k = 0; k <= 24; k++) g.lineTo((k / 24) * W, base - w * 0.004 - hsh(k + place * 30) * w * 0.012);
    g.lineTo(W, base + w * 0.03);
    g.closePath();
    g.fill();
  });
  const floor = layer(w, h, sc, (g) => {
    const Y = (gy: number) => gsy(gy) * w, X = (gx: number, gy: number) => gsx(gx, gy) * w;
    // 바깥 눈더미 (좌우)
    g.fillStyle = lin(g, 0, Y(0), 0, Y(GH), [0, '#cfdcf6'], [1, '#eef4ff']);
    g.fillRect(0, Y(-0.02), w, Y(GH) - Y(-0.02) + w * 0.06);
    // 돌바닥
    g.save();
    g.beginPath();
    g.moveTo(X(0, 0), Y(0));
    g.lineTo(X(1, 0), Y(0));
    g.lineTo(X(1, GH), Y(GH));
    g.lineTo(X(0, GH), Y(GH));
    g.closePath();
    g.fillStyle = P.mortar;
    g.fill();
    g.clip();
    let row = 0;
    for (let gy = 0; gy < GH + 0.05; gy += 0.052, row++) {
      const off = row % 2 ? 0.037 : 0;
      for (let gx = -0.04 + off; gx < 1.05; gx += 0.074) {
        const sd = row * 31 + Math.round(gx * 100), jx = (hsh(sd) - 0.5) * 0.01;
        const cx = X(gx + jx, gy + 0.026), cy = Y(gy + 0.026), ps = psc(gy);
        const sw = 0.066 * ps * w, sh = 0.044 * SQ * w;
        g.fillStyle = P.stone[Math.floor(hsh(sd + 5) * 4)];
        rr(g, cx - sw / 2, cy - sh / 2, sw, sh, sh * 0.4);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.1)';
        rr(g, cx - sw / 2 + 1, cy - sh / 2 + 0.8, sw - 2, sh * 0.35, sh * 0.2);
        g.fill();
        g.fillStyle = 'rgba(0,0,20,.18)';
        rr(g, cx - sw / 2 + 1, cy + sh * 0.18, sw - 2, sh * 0.3, sh * 0.2);
        g.fill();
        if (hsh(sd + 9) < 0.07) {
          g.fillStyle = 'rgba(240,246,255,.85)';
          ell(g, cx + (hsh(sd + 2) - 0.5) * sw * 0.4, cy, sw * 0.32, sh * 0.32);
          g.fill();
        }
      }
    }
    // 등불 둘레 둥근 무늬 돌 (광장의 중심)
    for (let ring = 0; ring < 3; ring++) {
      const rg = 0.13 + ring * 0.07, n = 14 + ring * 6;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + ring * 0.2, gx = LAN.x + Math.cos(a) * rg, gy = LAN.y + Math.sin(a) * rg * 0.9;
        if (gy > GH) continue;
        const ps = psc(gy);
        g.fillStyle = ring === 1 ? '#8a7f9a' : '#7b8aa8';
        ell(g, X(gx, gy), Y(gy), 0.024 * ps * w, 0.016 * SQ * w);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.14)';
        ell(g, X(gx, gy), Y(gy) - 1, 0.016 * ps * w, 0.008 * SQ * w);
        g.fill();
      }
    }
    // 가장자리 눈이 바닥으로 흘러든 자국
    for (let k = 0; k < 26; k++) {
      const gy = hsh(k + 300) * GH, sd = k % 2 ? 1 : 0, gx = sd ? 1 - hsh(k + 301) * 0.05 : hsh(k + 301) * 0.05;
      g.fillStyle = 'rgba(236,244,255,.9)';
      ell(g, X(gx, gy), Y(gy), w * (0.025 + hsh(k + 302) * 0.03), w * 0.012);
      g.fill();
    }
    // 먼 쪽 어둠 · 가까운 쪽 밝음 · 가로등 빛 웅덩이 · 달빛 · 가장자리 그늘
    g.fillStyle = lin(g, 0, Y(0), 0, Y(GH), [0, 'rgba(10,14,40,.42)'], [0.5, 'rgba(10,14,40,.08)'], [1, 'rgba(10,14,40,0)']);
    g.fillRect(0, Y(0), w, Y(GH) - Y(0));
    for (const lx of [0.035, 0.965]) {
      g.fillStyle = radg(g, lx * w, Y(1.12), 0, w * 0.3, [0, 'rgba(255,200,120,.3)'], [1, 'rgba(255,200,120,0)']);
      g.fillRect(0, Y(0.6), w, Y(GH) - Y(0.6));
    }
    g.fillStyle = radg(g, w * 0.62, Y(0.45), 0, w * 0.45, [0, 'rgba(190,215,255,.12)'], [1, 'rgba(190,215,255,0)']);
    g.fillRect(0, Y(0), w, Y(GH) - Y(0));
    g.fillStyle = radg(g, w / 2, Y(0.7), w * 0.35, w * 0.85, [0, 'rgba(6,8,26,0)'], [1, 'rgba(6,8,26,.38)']);
    g.fillRect(0, Y(0), w, Y(GH) - Y(0));
    g.restore();
    // 좌우 눈 둑 (벽)
    for (const sd of [0, 1]) {
      g.fillStyle = lin(g, 0, Y(0), 0, Y(GH), [0, '#dbe6fa'], [1, '#ffffff']);
      g.beginPath();
      const ex = (gy: number) => X(sd, gy);
      g.moveTo(ex(-0.02), Y(-0.02));
      for (let gy = -0.02; gy <= GH + 0.02; gy += 0.05) {
        const bump = (Math.sin(gy * 23 + sd * 3) * 0.5 + 0.5) * w * 0.012 + w * 0.01;
        g.lineTo(ex(gy) + (sd ? -bump : bump), Y(gy));
      }
      g.lineTo(sd ? w : 0, Y(GH + 0.02));
      g.lineTo(sd ? w : 0, Y(-0.02));
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(120,150,210,.45)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let gy = -0.02; gy <= GH + 0.02; gy += 0.05) {
        const bump = (Math.sin(gy * 23 + sd * 3) * 0.5 + 0.5) * w * 0.012 + w * 0.01;
        const px = ex(gy) + (sd ? -bump : bump);
        if (gy === -0.02) g.moveTo(px, Y(gy));
        else g.lineTo(px, Y(gy));
      }
      g.stroke();
      // 울타리 말뚝
      for (let k = 0; k < 7; k++) {
        const gy = 0.1 + k * 0.19, px = X(sd, gy) + (sd ? 1 : -1) * w * 0.035, ph = w * 0.05 * psc(gy);
        g.fillStyle = '#6a4a32';
        rr(g, px - 2, Y(gy) - ph, 4, ph, 1.5);
        g.fill();
        g.fillStyle = '#f6f9ff';
        ell(g, px, Y(gy) - ph, 3.4, 2.2);
        g.fill();
      }
    }
    // 앞쪽 눈 둑
    g.fillStyle = lin(g, 0, Y(GH) - w * 0.01, 0, Y(GH) + w * 0.03, [0, '#ffffff'], [1, '#c9d8f4']);
    g.beginPath();
    g.moveTo(0, Y(GH) + w * 0.04);
    for (let k = 0; k <= 20; k++) g.lineTo((k / 20) * w, Y(GH) - w * 0.006 - hsh(k + 77) * w * 0.012);
    g.lineTo(w, Y(GH) + w * 0.04);
    g.closePath();
    g.fill();
  });
  const bg = { sky, far, mid, floor, wins, chim };
  BG.set(key, bg);
  return bg;
}

// ── 도깨비 ──
const SKIN: Record<K, [string, string, string]> = {
  gob: ['#ff8a6e', '#e2523f', '#9c2a26'],
  spike: ['#86d873', '#4fa24a', '#2a6a2e'],
  fat: ['#b48af0', '#8257cf', '#4f2f8f'],
  hammer: ['#7ab8ff', '#3f84e0', '#22489a'],
  boss: ['#ff6a72', '#d22f3e', '#7a1424'],
  ball: ['#ffffff', '#ffffff', '#ffffff'],
};
const GSIZE: Record<K, number> = { gob: 1, spike: 1, fat: 1.12, hammer: 1.03, boss: 1.5, ball: 1 };
const WIDE: Record<K, number> = { gob: 1, spike: 1, fat: 1.45, hammer: 1, boss: 1.12, ball: 1 };
/** 자세: 0 걷기 · 1 메롱 · 2 미끄러짐(허우적) · 3 넘어져 구름 · 4 어질어질 · 5 망치 들기 · 6 불빛 들고 달아남 · 7 연못에서 고개 · 8 놀람(빠지기 직전) */
interface GPose { p: number; ph: number; u: number; face: number; hurt: number; look: number; spin: number }

function limb(ctx: C2, x0: number, y0: number, x1: number, y1: number, wd: number, col: string) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = wd + 2.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = wd;
  ctx.stroke();
}
function hammerTool(ctx: C2, hx: number, hy: number, ang: number, k: number) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  ctx.fillStyle = '#8a5a2b';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  rr(ctx, -k * 0.025, -k * 0.42, k * 0.05, k * 0.46, k * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lin(ctx, -k * 0.16, 0, k * 0.16, 0, [0, '#c98a4a'], [0.5, '#f0b874'], [1, '#a8652e']);
  rr(ctx, -k * 0.16, -k * 0.56, k * 0.32, k * 0.17, k * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9aa4b8';
  ctx.fillRect(-k * 0.12, -k * 0.56, k * 0.035, k * 0.17);
  ctx.fillRect(k * 0.085, -k * 0.56, k * 0.035, k * 0.17);
  ctx.restore();
}
function drawGoblin(ctx: C2, x: number, y: number, k: number, kind: K, pz: GPose, t: number, seed: number) {
  const [c0, c1, c2] = SKIN[kind], wf = WIDE[kind];
  const p = pz.p, ph = pz.ph;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pz.face, 1);
  // 자세별 몸 기울기·높이
  let lean = 0, lift = 0, sq = 1;
  if (p === 0 || p === 6) (lean = 0.12), (lift = Math.abs(Math.sin(ph)) * k * 0.05);
  if (p === 1) (lean = Math.sin(t * 0.25 + seed) * 0.18), (lift = Math.abs(Math.sin(t * 0.25 + seed)) * k * 0.04);
  if (p === 2) (lean = -0.32 + Math.sin(t * 0.6 + seed) * 0.06), (lift = k * 0.02);
  if (p === 3) lean = pz.spin;
  if (p === 4) (sq = 0.82), (lean = Math.sin(t * 0.12 + seed) * 0.1);
  if (p === 5) (lean = -0.12 * pz.u), (sq = 1 + 0.06 * pz.u);
  if (p === 8) (sq = 1.1), (lift = k * 0.06);
  const bump = pz.hurt > 0 ? 1 + 0.18 * pz.hurt : 1;
  ctx.translate(0, -lift);
  ctx.rotate(lean);
  ctx.scale(bump * (2 - sq), sq / bump);
  const bw = 0.33 * k * wf, bh = 0.42 * k, by = -0.52 * k;
  // 다리
  if (p === 2) {
    limb(ctx, -bw * 0.4, -0.16 * k, bw * 0.55, -0.02 * k, k * 0.1, c1);
    limb(ctx, bw * 0.3, -0.16 * k, bw * 1.0, -0.06 * k, k * 0.1, c1);
  } else if (p === 4) {
    limb(ctx, -bw * 0.4, -0.14 * k, -bw * 0.9, -0.02 * k, k * 0.1, c1);
    limb(ctx, bw * 0.4, -0.14 * k, bw * 0.9, -0.02 * k, k * 0.1, c1);
  } else if (p !== 7) {
    const sw = p === 0 || p === 6 ? Math.sin(ph) * k * 0.09 : 0;
    limb(ctx, -bw * 0.38, -0.16 * k, -bw * 0.38 + sw, -0.02 * k, k * 0.1, c1);
    limb(ctx, bw * 0.38, -0.16 * k, bw * 0.38 - sw, -0.02 * k, k * 0.1, c1);
  }
  // 발 (스파이크는 쇠 신발)
  if (p !== 7) {
    const feet = p === 2 ? [[bw * 0.6, -0.02 * k], [bw * 1.05, -0.06 * k]] : p === 4 ? [[-bw * 0.95, -0.02 * k], [bw * 0.95, -0.02 * k]] : [[-bw * 0.38 + (p === 0 || p === 6 ? Math.sin(ph) * k * 0.09 : 0), -0.01 * k], [bw * 0.38 - (p === 0 || p === 6 ? Math.sin(ph) * k * 0.09 : 0), -0.01 * k]];
    for (const [fx2, fy2] of feet) {
      if (kind === 'spike') {
        ctx.fillStyle = '#7d8799';
        ell(ctx, fx2 + k * 0.02, fy2, k * 0.085, k * 0.05);
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = '#dfe6f2';
        for (let j = -1; j <= 1; j++) {
          ctx.beginPath();
          ctx.moveTo(fx2 + j * k * 0.045 - k * 0.015, fy2 + k * 0.035);
          ctx.lineTo(fx2 + j * k * 0.045, fy2 + k * 0.075);
          ctx.lineTo(fx2 + j * k * 0.045 + k * 0.015, fy2 + k * 0.035);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = c1;
        ell(ctx, fx2 + k * 0.025, fy2, k * 0.07, k * 0.04);
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    }
  }
  // 뒤쪽 팔
  const sh = by + bh * 0.05;
  const armL: number[] = p === 2 ? [-bw * 1.0, by - bh * 0.95 + Math.sin(t * 0.9 + seed) * k * 0.08] : p === 5 || p === 6 ? [-bw * 0.4, by - bh * 1.1] : p === 1 ? [-bw * 0.7, by - bh * 0.55] : p === 4 ? [-bw * 1.05, by + bh * 0.4] : p === 7 ? [-bw * 1.1, by - bh * 0.5 + Math.sin(t * 0.8) * k * 0.06] : [-bw * 0.95 - Math.sin(ph) * k * 0.05, by + bh * 0.35];
  limb(ctx, -bw * 0.75, sh, armL[0], armL[1], k * 0.085, c1);
  // 몸 (콩 모양 한 덩이)
  ctx.beginPath();
  ctx.moveTo(0, by - bh);
  ctx.bezierCurveTo(bw * 1.08, by - bh, bw * 1.12, by + bh * 0.95, 0, by + bh * 0.98);
  ctx.bezierCurveTo(-bw * 1.12, by + bh * 0.95, -bw * 1.08, by - bh, 0, by - bh);
  ctx.closePath();
  ctx.fillStyle = radg(ctx, -bw * 0.35, by - bh * 0.45, k * 0.03, k * 0.62, [0, c0], [0.55, c1], [1, c2]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 호랑이 무늬 반바지
  ctx.fillStyle = '#ffcb3d';
  ctx.fillRect(-bw * 1.3, by + bh * 0.42, bw * 2.6, bh * 0.7);
  ctx.fillStyle = '#3a2410';
  for (let j = -3; j <= 3; j++) {
    ctx.beginPath();
    ctx.moveTo(j * bw * 0.34 - k * 0.02, by + bh * 0.42);
    ctx.lineTo(j * bw * 0.34 + k * 0.03, by + bh * 0.62);
    ctx.lineTo(j * bw * 0.34 + k * 0.005, by + bh * 0.42);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(-bw * 1.3, by + bh * 0.42, bw * 2.6, k * 0.02);
  // 달빛 테두리
  ctx.strokeStyle = 'rgba(190,220,255,.55)';
  ctx.lineWidth = k * 0.05;
  ctx.beginPath();
  ctx.ellipse(bw * 0.15, by - bh * 0.1, bw * 1.02, bh * 1.02, 0, -1.2, 0.3);
  ctx.stroke();
  if (kind === 'fat') {
    ctx.fillStyle = 'rgba(255,240,255,.28)';
    ell(ctx, bw * 0.15, by + bh * 0.1, bw * 0.55, bh * 0.4);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, by - bh);
  ctx.bezierCurveTo(bw * 1.08, by - bh, bw * 1.12, by + bh * 0.95, 0, by + bh * 0.98);
  ctx.bezierCurveTo(-bw * 1.12, by + bh * 0.95, -bw * 1.08, by - bh, 0, by - bh);
  ctx.strokeStyle = 'rgba(235,245,255,.55)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  // 뿔
  const horns = kind === 'gob' || kind === 'fat' ? [[0.1, 0]] : [[-0.42, -0.25], [0.5, 0.25]];
  for (const [hx, hr] of horns) {
    const hk = kind === 'boss' ? 1.4 : 1;
    ctx.save();
    ctx.translate(bw * hx, by - bh * 0.93);
    ctx.rotate(hr);
    ctx.beginPath();
    ctx.moveTo(-k * 0.055 * hk, 0);
    ctx.quadraticCurveTo(-k * 0.02 * hk, -k * 0.16 * hk, k * 0.04 * hk, -k * 0.2 * hk);
    ctx.quadraticCurveTo(k * 0.02 * hk, -k * 0.09 * hk, k * 0.055 * hk, 0);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -k * 0.2, 0, 0, [0, '#fff8e6'], [1, '#e8cf9a']);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  if (kind === 'boss') {
    ctx.fillStyle = lin(ctx, 0, by - bh * 1.2, 0, by - bh * 0.85, [0, '#fff3a0'], [1, '#e0a020']);
    ctx.beginPath();
    ctx.moveTo(-bw * 0.42, by - bh * 0.86);
    ctx.lineTo(-bw * 0.48, by - bh * 1.22);
    ctx.lineTo(-bw * 0.2, by - bh * 1.05);
    ctx.lineTo(0, by - bh * 1.3);
    ctx.lineTo(bw * 0.2, by - bh * 1.05);
    ctx.lineTo(bw * 0.48, by - bh * 1.22);
    ctx.lineTo(bw * 0.42, by - bh * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#e8424f';
    ell(ctx, 0, by - bh * 1.05, k * 0.02, k * 0.02);
    ctx.fill();
  }
  // 얼굴
  const ey = by - bh * 0.3, ex = bw * 0.36, er = k * 0.085, lk = pz.look * k * 0.015;
  if (p === 4) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(sx * ex + Math.cos(a + t * 0.3) * er * (a / 9), ey + Math.sin(a + t * 0.3) * er * (a / 9));
      ctx.stroke();
    }
  } else {
    const big = p === 2 || p === 3 || p === 8 ? 1.25 : 1;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, sx * ex + k * 0.02, ey, er * 0.9 * big, er * big);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#15102a';
      const pr = p === 2 || p === 8 ? er * 0.32 : er * 0.48;
      ell(ctx, sx * ex + k * 0.035 + lk, ey + (p === 2 ? -er * 0.2 : er * 0.1), pr, pr);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, sx * ex + k * 0.035 + lk - pr * 0.35, ey - pr * 0.3 + (p === 2 ? -er * 0.2 : er * 0.1), pr * 0.35, pr * 0.35);
      ctx.fill();
    }
    // 눈썹: 장난 (안쪽이 내려감), 놀라면 위로
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.04;
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      const up = p === 2 || p === 3 || p === 8 ? -er * 0.7 : 0;
      ctx.beginPath();
      ctx.moveTo(sx * ex + k * 0.02 - sx * er * 0.2, ey - er * 1.25 + up + (p === 2 || p === 8 ? 0 : er * 0.25));
      ctx.lineTo(sx * ex + k * 0.02 + sx * er * 0.9, ey - er * 1.45 + up);
      ctx.stroke();
    }
  }
  // 입
  const my = by + bh * 0.08;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  if (p === 2 || p === 3 || p === 8) {
    ctx.fillStyle = '#5a1020';
    ell(ctx, k * 0.03, my + k * 0.01, k * 0.07, k * 0.085);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7a8a';
    ell(ctx, k * 0.03, my + k * 0.055, k * 0.045, k * 0.03);
    ctx.fill();
  } else if (p === 4) {
    ctx.beginPath();
    for (let j = 0; j <= 6; j++) ctx.lineTo(-k * 0.09 + j * k * 0.035, my + (j % 2 ? k * 0.02 : -k * 0.01));
    ctx.stroke();
  } else {
    ctx.fillStyle = '#5a1020';
    ctx.beginPath();
    ctx.moveTo(-bw * 0.5, my - k * 0.02);
    ctx.quadraticCurveTo(k * 0.02, my + k * 0.13, bw * 0.62, my - k * 0.03);
    ctx.quadraticCurveTo(k * 0.02, my + k * 0.03, -bw * 0.5, my - k * 0.02);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (const fxp of [-bw * 0.22, bw * 0.3]) {
      ctx.beginPath();
      ctx.moveTo(fxp - k * 0.025, my + k * 0.01);
      ctx.lineTo(fxp, my + k * 0.06);
      ctx.lineTo(fxp + k * 0.025, my + k * 0.012);
      ctx.fill();
    }
    if (p === 1) {
      ctx.fillStyle = '#ff6f8a';
      ell(ctx, k * 0.06, my + k * 0.08, k * 0.045, k * 0.06);
      ctx.fill();
      ctx.stroke();
    }
  }
  // 볼 터치
  ctx.fillStyle = 'rgba(255,120,140,.35)';
  ell(ctx, -ex - k * 0.04, ey + er * 1.3, k * 0.05, k * 0.03);
  ctx.fill();
  ell(ctx, ex + k * 0.07, ey + er * 1.3, k * 0.05, k * 0.03);
  ctx.fill();
  // 앞쪽 팔 (+ 들고 있는 것)
  const armR: number[] = p === 2 ? [bw * 1.05, by - bh * 1.0 + Math.sin(t * 0.9 + seed + 2) * k * 0.08] : p === 5 || p === 6 ? [bw * 0.45, by - bh * 1.12] : p === 1 ? [bw * 0.75, by - bh * 0.55] : p === 4 ? [bw * 1.05, by + bh * 0.4] : p === 7 ? [bw * 1.1, by - bh * 0.5 + Math.sin(t * 0.8 + 1) * k * 0.06] : [bw * 0.95 + Math.sin(ph) * k * 0.05, by + bh * 0.35];
  limb(ctx, bw * 0.75, sh, armR[0], armR[1], k * 0.085, c1);
  if (kind === 'hammer' && p !== 7) {
    if (p === 5) hammerTool(ctx, 0, by - bh * 1.1, -0.5 - 1.6 * pz.u, k * 1.25);
    else if (p === 2 || p === 3 || p === 8) hammerTool(ctx, bw * 1.2, by - bh * 0.6, 1.8 + Math.sin(t * 0.5) * 0.5, k);
    else hammerTool(ctx, armR[0], armR[1], 0.5, k);
  }
  if (kind === 'boss' && p !== 7) {
    // 방망이
    ctx.save();
    ctx.translate(armR[0], armR[1]);
    ctx.rotate(p === 2 ? 2.2 : 0.3);
    ctx.fillStyle = lin(ctx, -k * 0.06, 0, k * 0.06, 0, [0, '#b07a3c'], [1, '#6f4520']);
    ctx.beginPath();
    ctx.moveTo(-k * 0.025, 0);
    ctx.lineTo(-k * 0.06, -k * 0.42);
    ctx.quadraticCurveTo(0, -k * 0.5, k * 0.06, -k * 0.42);
    ctx.lineTo(k * 0.025, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#e8edf5';
    for (let j = 0; j < 4; j++) {
      ell(ctx, (j % 2 ? 1 : -1) * k * 0.03, -k * (0.18 + j * 0.06), k * 0.015, k * 0.015);
      ctx.fill();
    }
    ctx.restore();
  }
  if (p === 6) {
    // 훔친 불빛
    const ox = (armL[0] + armR[0]) / 2, oy = Math.min(armL[1], armR[1]) - k * 0.1;
    ctx.fillStyle = radg(ctx, ox, oy, 0, k * 0.35, [0, 'rgba(255,220,120,.85)'], [1, 'rgba(255,200,90,0)']);
    ell(ctx, ox, oy, k * 0.35, k * 0.35);
    ctx.fill();
    flamePath(ctx, ox, oy, k * 0.09, t, seed);
    ctx.fillStyle = lin(ctx, ox, oy - k * 0.14, ox, oy + k * 0.08, [0, '#fff6c8'], [1, '#ff9a2e']);
    ctx.fill();
  }
  // 땀방울
  if (p === 2 || p === 5) {
    ctx.fillStyle = '#bfefff';
    for (let j = 0; j < 2; j++) {
      const dt2 = (t * 0.06 + j * 0.5 + seed * 0.01) % 1;
      ctx.globalAlpha = 1 - dt2;
      ell(ctx, -bw * (1.1 + dt2 * 0.5) + j * bw * 2.2, by - bh * (0.7 - dt2 * 0.3), k * 0.025, k * 0.035);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // 어질어질 별
  if (p === 4) {
    for (let j = 0; j < 3; j++) {
      const a = t * 0.12 + (j * TAU) / 3;
      ctx.fillStyle = '#ffe36b';
      starPath(ctx, x + Math.cos(a) * k * 0.3, y - k * 0.95 + Math.sin(a) * k * 0.08, k * 0.07);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// ── 꼬마 눈 마법사 ──
/** mood: 0 보통 · 1 마법 부리는 중 · 2 신남(폴짝) · 3 걱정 · 4 울상 */
function drawWizard(ctx: C2, x: number, y: number, k: number, mood: number, t: number, aimX: number, aimY: number, glow: number) {
  const jump = mood === 2 ? Math.abs(Math.sin(t * 0.18)) * k * 0.14 : 0, breath = Math.sin(t * 0.06) * k * 0.012;
  ctx.fillStyle = 'rgba(10,14,40,.35)';
  ell(ctx, x, y, k * 0.32, k * 0.08);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - jump);
  // 부츠
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#5a3a26';
    rr(ctx, sx * k * 0.1 - k * 0.07, -k * 0.09, k * 0.14, k * 0.09, k * 0.04);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f4f8ff';
    rr(ctx, sx * k * 0.1 - k * 0.075, -k * 0.11, k * 0.15, k * 0.035, k * 0.017);
    ctx.fill();
  }
  // 코트 (통통한 종 모양)
  ctx.beginPath();
  ctx.moveTo(-k * 0.2, -k * 0.5 + breath);
  ctx.quadraticCurveTo(-k * 0.3, -k * 0.2, -k * 0.27, -k * 0.09);
  ctx.quadraticCurveTo(0, -k * 0.04, k * 0.27, -k * 0.09);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.2, k * 0.2, -k * 0.5 + breath);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -k * 0.3, -k * 0.5, k * 0.3, 0, [0, '#a8dcff'], [0.6, '#5aa8ef'], [1, '#2f6fbf']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f4f8ff';
  rr(ctx, -k * 0.28, -k * 0.13, k * 0.56, k * 0.06, k * 0.03);
  ctx.fill();
  ctx.fillStyle = '#ffd36b';
  for (let j = 0; j < 3; j++) {
    ell(ctx, 0, -k * (0.42 - j * 0.1) + breath, k * 0.018, k * 0.018);
    ctx.fill();
  }
  // 목도리
  ctx.fillStyle = '#e8424f';
  rr(ctx, -k * 0.19, -k * 0.56 + breath, k * 0.38, k * 0.08, k * 0.04);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.save();
  ctx.translate(k * 0.12, -k * 0.52 + breath);
  ctx.rotate(0.5 + Math.sin(t * 0.15) * 0.15);
  ctx.fillStyle = '#e8424f';
  rr(ctx, 0, 0, k * 0.07, k * 0.2, k * 0.03);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(k * 0.005, k * 0.08, k * 0.06, k * 0.025);
  ctx.restore();
  // 얼굴
  const hy = -k * 0.72 + breath;
  ctx.fillStyle = radg(ctx, -k * 0.05, hy - k * 0.05, k * 0.02, k * 0.22, [0, '#ffe6d6'], [1, '#f5bea0']);
  ell(ctx, 0, hy, k * 0.19, k * 0.17);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,110,120,.45)';
  ell(ctx, -k * 0.11, hy + k * 0.06, k * 0.045, k * 0.028);
  ctx.fill();
  ell(ctx, k * 0.11, hy + k * 0.06, k * 0.045, k * 0.028);
  ctx.fill();
  const lx = clamp((aimX - x) / (k * 3), -1, 1) * k * 0.02;
  for (const sx of [-1, 1]) {
    if (mood === 2) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx * k * 0.07, hy + k * 0.01, k * 0.035, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1b1736';
      ell(ctx, sx * k * 0.07 + lx, hy, k * 0.03, mood === 3 ? k * 0.045 : k * 0.04);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, sx * k * 0.07 + lx - k * 0.01, hy - k * 0.015, k * 0.011, k * 0.011);
      ctx.fill();
    }
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (mood === 3 || mood === 4) ctx.arc(0, hy + k * 0.11, k * 0.04, Math.PI * 1.15, Math.PI * 1.85);
  else if (mood === 2) {
    ctx.fillStyle = '#7a1f2a';
    ctx.arc(0, hy + k * 0.06, k * 0.05, 0, Math.PI);
    ctx.fill();
  } else ctx.arc(0, hy + k * 0.05, k * 0.035, 0.2, Math.PI - 0.2);
  ctx.stroke();
  if (mood === 3) {
    ctx.fillStyle = '#bfefff';
    ell(ctx, k * 0.2, hy - k * 0.06, k * 0.025, k * 0.04);
    ctx.fill();
  }
  // 큰 털모자 (방울이 통통)
  const bob = Math.sin(t * 0.1) * 0.08 + (mood === 2 ? Math.sin(t * 0.36) * 0.2 : 0);
  ctx.save();
  ctx.translate(0, hy - k * 0.1);
  ctx.beginPath();
  ctx.moveTo(-k * 0.22, 0);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.3, k * 0.08 + bob * k, -k * 0.42);
  ctx.quadraticCurveTo(k * 0.12, -k * 0.2, k * 0.22, 0);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -k * 0.2, -k * 0.4, k * 0.2, 0, [0, '#6f8cff'], [1, '#2a3fb0']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd36b';
  for (const [sx, sy] of [[-0.06, -0.12], [0.06, -0.22], [-0.01, -0.3]]) {
    starPath(ctx, sx * k, sy * k, k * 0.025);
    ctx.fill();
  }
  // 털 테두리 (몽글몽글)
  for (let j = 0; j < 7; j++) {
    ctx.fillStyle = j % 2 ? '#ffffff' : '#eef3ff';
    ell(ctx, -k * 0.21 + j * k * 0.07, k * 0.01, k * 0.055, k * 0.05);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(27,23,54,.5)';
  ctx.lineWidth = 1;
  rr(ctx, -k * 0.27, -k * 0.04, k * 0.54, k * 0.1, k * 0.05);
  ctx.stroke();
  ctx.fillStyle = radg(ctx, k * 0.06 + bob * k, -k * 0.46, 0, k * 0.08, [0, '#ffffff'], [1, '#d9e4ff']);
  ell(ctx, k * 0.08 + bob * k, -k * 0.44, k * 0.07, k * 0.07);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  // 팔 + 지팡이 (손가락 쪽으로 기운다)
  const ang = mood === 1 ? clamp(Math.atan2(aimY - (y - k * 0.6), aimX - x), -2.6, -0.4) : mood === 2 ? -1.9 : -1.2;
  const hx = k * 0.2, hy2 = -k * 0.42 + breath;
  ctx.save();
  ctx.translate(hx, hy2);
  ctx.rotate(ang + Math.PI / 2);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, k * 0.22);
  ctx.lineTo(0, -k * 0.45);
  ctx.stroke();
  ctx.strokeStyle = '#a8763c';
  ctx.lineWidth = k * 0.032;
  ctx.stroke();
  // 얼음 수정
  const cg = 0.5 + 0.5 * glow;
  ctx.fillStyle = radg(ctx, 0, -k * 0.52, 0, k * (0.15 + 0.15 * glow), [0, `rgba(170,240,255,${0.7 * cg})`], [1, 'rgba(170,240,255,0)']);
  ell(ctx, 0, -k * 0.52, k * (0.15 + 0.15 * glow), k * (0.15 + 0.15 * glow));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.64);
  ctx.lineTo(k * 0.055, -k * 0.52);
  ctx.lineTo(0, -k * 0.43);
  ctx.lineTo(-k * 0.055, -k * 0.52);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -k * 0.05, -k * 0.64, k * 0.05, -k * 0.43, [0, '#ffffff'], [0.5, '#9fe8ff'], [1, '#3fa8e0']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.restore();
  // 벙어리장갑 손
  limb(ctx, k * 0.17, -k * 0.46 + breath, hx, hy2, k * 0.07, '#5aa8ef');
  ctx.fillStyle = '#e8424f';
  ell(ctx, hx, hy2, k * 0.045, k * 0.045);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  const lh = mood === 2 ? [-k * 0.3, -k * 0.75] : [-k * 0.26, -k * 0.3];
  limb(ctx, -k * 0.17, -k * 0.46 + breath, lh[0], lh[1], k * 0.07, '#5aa8ef');
  ctx.fillStyle = '#e8424f';
  ell(ctx, lh[0], lh[1], k * 0.045, k * 0.045);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ── 등불 ──
function drawLantern(ctx: C2, x: number, y: number, k: number, lights: number, maxL: number, t: number, hurtT: number) {
  ctx.fillStyle = 'rgba(10,14,40,.4)';
  ell(ctx, x, y + k * 0.01, k * 0.36, k * 0.1);
  ctx.fill();
  const tier = (ty: number, rx: number, hh: number) => {
    ctx.fillStyle = lin(ctx, x - rx, 0, x + rx, 0, [0, '#8792ad'], [0.45, '#b7c0d6'], [1, '#5d6681']);
    ctx.beginPath();
    ctx.ellipse(x, ty, rx, rx * 0.3, 0, 0, Math.PI);
    ctx.lineTo(x - rx, ty - hh);
    ctx.ellipse(x, ty - hh, rx, rx * 0.3, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#f6f9ff';
    ell(ctx, x, ty - hh, rx * 1.02, rx * 0.32);
    ctx.fill();
    ctx.strokeStyle = 'rgba(27,23,54,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  tier(y, k * 0.3, k * 0.1);
  tier(y - k * 0.1, k * 0.2, k * 0.08);
  // 기둥
  ctx.fillStyle = lin(ctx, x - k * 0.04, 0, x + k * 0.04, 0, [0, '#3a3f55'], [0.4, '#6a7290'], [1, '#262a3c']);
  rr(ctx, x - k * 0.035, y - k * 0.72, k * 0.07, k * 0.56, k * 0.02);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#2a2e40';
  rr(ctx, x - k * 0.06, y - k * 0.5, k * 0.12, k * 0.035, k * 0.015);
  ctx.fill();
  // 등 상자
  const ly = y - k * 0.86, on = lights / maxL, sh = hurtT > 0 ? Math.sin(t * 1.4) * k * 0.02 * hurtT : 0;
  ctx.save();
  ctx.translate(sh, 0);
  ctx.fillStyle = radg(ctx, x, ly, 0, k * (0.4 + 0.5 * on), [0, `rgba(255,214,120,${0.25 + 0.35 * on})`], [1, 'rgba(255,200,100,0)']);
  ell(ctx, x, ly, k * (0.4 + 0.5 * on), k * (0.4 + 0.5 * on));
  ctx.fill();
  ctx.fillStyle = '#2a2e40';
  ctx.beginPath();
  ctx.moveTo(x - k * 0.1, ly + k * 0.14);
  ctx.lineTo(x + k * 0.1, ly + k * 0.14);
  ctx.lineTo(x + k * 0.13, ly - k * 0.1);
  ctx.lineTo(x - k * 0.13, ly - k * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = on > 0 ? lin(ctx, x, ly - k * 0.1, x, ly + k * 0.14, [0, '#fff3c0'], [1, '#ffab3d']) : '#3a3f55';
  ctx.beginPath();
  ctx.moveTo(x - k * 0.075, ly + k * 0.11);
  ctx.lineTo(x + k * 0.075, ly + k * 0.11);
  ctx.lineTo(x + k * 0.1, ly - k * 0.07);
  ctx.lineTo(x - k * 0.1, ly - k * 0.07);
  ctx.closePath();
  ctx.fill();
  if (on > 0) {
    flamePath(ctx, x, ly + k * 0.03, k * 0.035 * (0.7 + 0.3 * on), t, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.strokeStyle = '#2a2e40';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, ly - k * 0.07);
  ctx.lineTo(x, ly + k * 0.11);
  ctx.stroke();
  // 지붕
  ctx.fillStyle = '#2a2e40';
  ctx.beginPath();
  ctx.moveTo(x - k * 0.17, ly - k * 0.1);
  ctx.lineTo(x, ly - k * 0.24);
  ctx.lineTo(x + k * 0.17, ly - k * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f6f9ff';
  ctx.beginPath();
  ctx.moveTo(x - k * 0.18, ly - k * 0.1);
  ctx.quadraticCurveTo(x - k * 0.08, ly - k * 0.2, x, ly - k * 0.25);
  ctx.quadraticCurveTo(x + k * 0.06, ly - k * 0.18, x + k * 0.14, ly - k * 0.12);
  ctx.quadraticCurveTo(x, ly - k * 0.14, x - k * 0.18, ly - k * 0.1);
  ctx.fill();
  ctx.restore();
  // 불빛 방울: 등 둘레를 천천히 도는 꽃불들 (남은 불빛이 늘 보이게)
  for (let j = 0; j < maxL; j++) {
    const a = t * 0.012 + (j * TAU) / maxL, ox = x + Math.cos(a) * k * 0.36, oy = ly + k * 0.1 + Math.sin(a) * k * 0.1;
    const lit = j < lights, r = k * 0.045;
    if (lit) {
      ctx.fillStyle = radg(ctx, ox, oy, 0, r * 3, [0, 'rgba(255,210,110,.55)'], [1, 'rgba(255,190,90,0)']);
      ell(ctx, ox, oy, r * 3, r * 3);
      ctx.fill();
      flamePath(ctx, ox, oy, r, t, j * 2.1);
      ctx.fillStyle = lin(ctx, ox, oy - r * 1.5, ox, oy + r, [0, '#fff8d0'], [0.5, '#ffcf4a'], [1, '#ff8a2a']);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,50,10,.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(70,74,100,.6)';
      ell(ctx, ox, oy, r * 0.7, r * 0.7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,210,240,.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawBall(ctx: C2, x: number, y: number, rad: number, roll: number, ang: number, onIce: boolean) {
  ctx.fillStyle = 'rgba(10,14,40,.35)';
  ell(ctx, x, y, rad * 1.05, rad * 0.32);
  ctx.fill();
  const cy = y - rad * 0.95;
  ctx.fillStyle = radg(ctx, x - rad * 0.35, cy - rad * 0.4, rad * 0.1, rad * 1.1, [0, '#ffffff'], [0.65, '#e3ecfb'], [1, '#9db4dc']);
  ell(ctx, x, cy, rad, rad);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,150,200,.45)';
  ctx.lineWidth = rad * 0.12;
  for (let j = 0; j < 4; j++) {
    const a = roll / rad + j * 1.6, px = x + Math.cos(ang) * Math.sin(a) * rad * 0.7, py = cy + Math.cos(a) * rad * 0.5;
    if (Math.cos(a) < -0.2) continue;
    ctx.beginPath();
    ctx.arc(px, py, rad * 0.16, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,80,130,.7)';
  ctx.lineWidth = 1.5;
  ell(ctx, x, cy, rad, rad);
  ctx.stroke();
  if (onIce) {
    ctx.fillStyle = '#ffffff';
    starPath(ctx, x + rad * 0.5, cy - rad * 0.55, rad * 0.22);
    ctx.fill();
  }
}

/** 장애물: 0 눈사람 · 1 화로 · 2 돌기둥 */
function drawObs(ctx: C2, x: number, y: number, rad: number, k: number, t: number, cheer: number) {
  ctx.fillStyle = 'rgba(10,14,40,.35)';
  ell(ctx, x, y, rad * 1.2, rad * 0.4);
  ctx.fill();
  if (k === 0) {
    const r1 = rad * 1.1, r2 = rad * 0.8, r3 = rad * 0.6;
    const ball = (cx: number, cy: number, r: number) => {
      ctx.fillStyle = radg(ctx, cx - r * 0.35, cy - r * 0.35, r * 0.1, r, [0, '#ffffff'], [1, '#c8d6f0']);
      ell(ctx, cx, cy, r, r);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,80,130,.6)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    };
    ball(x, y - r1, r1);
    ball(x, y - r1 * 2 - r2 * 0.6, r2);
    const hy = y - r1 * 2 - r2 * 1.4 - r3 * 0.5 - cheer * r3 * 0.3;
    ball(x, hy, r3);
    // 팔 (신나면 번쩍)
    ctx.strokeStyle = '#5a3a26';
    ctx.lineWidth = 2;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * r2 * 0.8, y - r1 * 2 - r2 * 0.6);
      ctx.lineTo(x + sx * r2 * 1.8, y - r1 * 2 - r2 * (0.6 + 1.2 * cheer) - r2 * 0.4);
      ctx.stroke();
    }
    ctx.fillStyle = '#1b1736';
    for (const sx of [-1, 1]) {
      ell(ctx, x + sx * r3 * 0.35, hy - r3 * 0.15, r3 * 0.12, r3 * 0.12);
      ctx.fill();
    }
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath();
    ctx.moveTo(x, hy + r3 * 0.05);
    ctx.lineTo(x + r3 * 0.9, hy + r3 * 0.2);
    ctx.lineTo(x, hy + r3 * 0.3);
    ctx.fill();
    ctx.fillStyle = '#2a2e40';
    rr(ctx, x - r3 * 0.6, hy - r3 * 1.5, r3 * 1.2, r3 * 0.8, r3 * 0.1);
    ctx.fill();
    ctx.fillRect(x - r3 * 0.9, hy - r3 * 0.8, r3 * 1.8, r3 * 0.18);
    ctx.fillStyle = '#e8424f';
    ctx.fillRect(x - r3 * 0.6, hy - r3 * 0.95, r3 * 1.2, r3 * 0.15);
  } else if (k === 1) {
    // 화로: 다리 셋 + 쇠 그릇 + 불꽃
    ctx.strokeStyle = '#2a2a33';
    ctx.lineWidth = 2.5;
    for (const sx of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * rad * 0.5, y - rad * 1.2);
      ctx.lineTo(x + sx * rad * 1.0, y - (sx ? 0 : rad * 0.2));
      ctx.stroke();
    }
    ctx.fillStyle = lin(ctx, x - rad * 1.2, 0, x + rad * 1.2, 0, [0, '#3a3a48'], [0.5, '#6a6a7c'], [1, '#2a2a33']);
    ctx.beginPath();
    ctx.ellipse(x, y - rad * 1.5, rad * 1.25, rad * 0.4, 0, 0, Math.PI);
    ctx.lineTo(x - rad * 0.9, y - rad * 1.1);
    ctx.quadraticCurveTo(x, y - rad * 0.6, x + rad * 0.9, y - rad * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ff6a2a';
    ell(ctx, x, y - rad * 1.5, rad * 1.1, rad * 0.33);
    ctx.fill();
    for (let j = 0; j < 3; j++) {
      const fx2 = x + (j - 1) * rad * 0.5, fh = rad * (1.3 + 0.4 * Math.sin(t * 0.3 + j * 2));
      ctx.beginPath();
      ctx.moveTo(fx2 - rad * 0.35, y - rad * 1.5);
      ctx.quadraticCurveTo(fx2 - rad * 0.2, y - rad * 1.5 - fh * 0.6, fx2 + Math.sin(t * 0.2 + j) * rad * 0.2, y - rad * 1.5 - fh);
      ctx.quadraticCurveTo(fx2 + rad * 0.25, y - rad * 1.5 - fh * 0.5, fx2 + rad * 0.35, y - rad * 1.5);
      ctx.fillStyle = j === 1 ? '#ffd36b' : '#ff8a3a';
      ctx.fill();
    }
    for (let j = 0; j < 4; j++) {
      const u = (t * 0.02 + j * 0.25) % 1;
      ctx.fillStyle = `rgba(255,200,90,${1 - u})`;
      ell(ctx, x + Math.sin(j * 3 + u * 5) * rad * 0.8, y - rad * 1.6 - u * rad * 4, 1.4, 1.4);
      ctx.fill();
    }
  } else {
    // 돌기둥 (맷돌 모양)
    const hh = rad * 2.2;
    ctx.fillStyle = lin(ctx, x - rad, 0, x + rad, 0, [0, '#7e88a3'], [0.45, '#aab3c9'], [1, '#596280']);
    ctx.beginPath();
    ctx.ellipse(x, y - rad * 0.15, rad, rad * 0.32, 0, 0, Math.PI);
    ctx.lineTo(x - rad, y - hh);
    ctx.ellipse(x, y - hh, rad, rad * 0.32, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(30,30,50,.35)';
    ctx.beginPath();
    ctx.moveTo(x - rad, y - hh * 0.5);
    ctx.quadraticCurveTo(x, y - hh * 0.5 + rad * 0.3, x + rad, y - hh * 0.5);
    ctx.stroke();
    ctx.fillStyle = '#f6f9ff';
    ell(ctx, x, y - hh, rad * 1.05, rad * 0.36);
    ctx.fill();
  }
}

/** 김 나는 따뜻한 연못 */
function drawPond(ctx: C2, x: number, y: number, rx: number, ry: number, t: number, seed: number, flash: number) {
  // 돌 테두리
  ctx.fillStyle = 'rgba(10,14,40,.45)';
  ell(ctx, x, y + ry * 0.12, rx * 1.18, ry * 1.2);
  ctx.fill();
  const n = Math.max(10, Math.round(rx / 4.5));
  for (let j = 0; j < n; j++) {
    const a = (j / n) * TAU, sx = x + Math.cos(a) * rx * 1.08, sy = y + Math.sin(a) * ry * 1.1;
    ctx.fillStyle = j % 3 === 0 ? '#7a84a2' : j % 3 === 1 ? '#8d97b4' : '#6a7392';
    ell(ctx, sx, sy, rx * 0.16, ry * 0.2);
    ctx.fill();
    ctx.fillStyle = 'rgba(246,249,255,.9)';
    ell(ctx, sx, sy - ry * 0.07, rx * 0.12, ry * 0.09);
    ctx.fill();
  }
  // 물
  ctx.save();
  ell(ctx, x, y, rx, ry);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y - ry, 0, y + ry, [0, '#0c3a52'], [0.5, '#16627a'], [1, '#2a8fa0']);
  ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  // 달빛 반사
  ctx.fillStyle = 'rgba(220,245,255,.22)';
  ell(ctx, x + rx * 0.25, y - ry * 0.3, rx * 0.35, ry * 0.12);
  ctx.fill();
  // 물결
  for (let j = 0; j < 3; j++) {
    const u = ((t * 0.008 + j / 3 + seed) % 1);
    ctx.strokeStyle = `rgba(200,240,255,${0.35 * (1 - u)})`;
    ctx.lineWidth = 1.2;
    ell(ctx, x + Math.sin(seed * 9 + j) * rx * 0.3, y + Math.cos(seed * 7 + j) * ry * 0.2, rx * (0.1 + u * 0.6), ry * (0.1 + u * 0.6));
    ctx.stroke();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.4 * flash})`;
    ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(160,230,255,.5)';
  ctx.lineWidth = 1.2;
  ell(ctx, x, y, rx, ry);
  ctx.stroke();
}
/** 연못 위 김 (따뜻한 물이라 안 언다) */
function drawSteam(ctx: C2, x: number, y: number, rx: number, ry: number, t: number, seed: number) {
  for (let j = 0; j < 4; j++) {
    const u = ((t * 0.006 + j / 4 + seed) % 1), px = x + Math.sin(seed * 13 + j * 2.3) * rx * 0.55 + Math.sin(t * 0.02 + j) * rx * 0.1;
    ctx.fillStyle = `rgba(230,240,255,${0.16 * Math.sin(u * Math.PI)})`;
    ell(ctx, px, y - u * ry * 3.2, rx * (0.18 + u * 0.22), ry * (0.3 + u * 0.3));
    ctx.fill();
  }
}

function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 - press * 0.08, 1 - press * 0.08);
  ctx.fillStyle = '#ffe2c8';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-k * 0.06, 0);
  ctx.quadraticCurveTo(-k * 0.08, -k * 0.38, 0, -k * 0.4);
  ctx.quadraticCurveTo(k * 0.08, -k * 0.38, k * 0.06, -k * 0.12);
  ctx.lineTo(k * 0.2, -k * 0.1);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.05, k * 0.27, k * 0.15);
  ctx.quadraticCurveTo(k * 0.22, k * 0.42, 0, k * 0.42);
  ctx.quadraticCurveTo(-k * 0.2, k * 0.4, -k * 0.2, k * 0.15);
  ctx.quadraticCurveTo(-k * 0.2, k * 0.0, -k * 0.06, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** 누르는 동안 미리 보기: 지금 얼음대로 두면 미끄러지는 것들이 어디로 가나 (같은 물리, 90틱) */
interface PPath { pts: number[][]; end: string; k: K }
const PREV = new WeakMap<object, { t: number; paths: PPath[] }>();
function preview(s: IceState): PPath[] {
  const c = PREV.get(s);
  if (c && s.t - c.t < 4 && s.t >= c.t) return c.paths;
  const w = cloneSim(s);
  const tr = new Map<number, PPath & { slid: boolean; light: boolean }>();
  for (const e of w.ents) tr.set(e.id, { pts: [[e.x, e.y]], end: '', k: e.k, slid: e.st === SLIDE && e.k !== 'ball', light: e.light });
  for (let k = 0; k < 90 && w.phase === 'play'; k++) {
    w.t++;
    world(w, 1);
    const alive = new Set<number>();
    for (const e of w.ents) {
      alive.add(e.id);
      const q = tr.get(e.id);
      if (!q || q.end) continue;
      if (e.st === SLIDE && (e.k !== 'ball' || (cellAt(e.x, e.y) >= 0 && w.ice[cellAt(e.x, e.y)] > 0))) q.slid = true;
      if (k % 3 === 2) q.pts.push([e.x, e.y]);
      if (!q.slid) continue;
      if (e.bonkT === w.t) (q.end = 'bonk'), q.pts.push([e.x, e.y]);
      else if (e.light && !q.light) (q.end = 'steal'), q.pts.push([e.x, e.y]);
      else if (e.st !== SLIDE && e.k !== 'ball') (q.end = 'stop'), q.pts.push([e.x, e.y]);
    }
    for (const [id, q] of tr)
      if (!alive.has(id) && !q.end) {
        const l = q.pts[q.pts.length - 1];
        q.end = q.slid && l[0] > 0 && l[0] < 1 && l[1] > 0 && l[1] < GH ? (s.ponds.some((p) => Math.hypot(p.x - l[0], p.y - l[1]) < p.r + 0.05) ? 'pond' : 'gone') : 'gone';
        if (q.k === 'ball' && Math.hypot(l[0] - LAN.x, l[1] - LAN.y) < 0.12) q.end = 'steal';
      }
  }
  const paths = [...tr.values()].filter((q) => q.slid && q.pts.length > 1 && q.end !== 'gone');
  PREV.set(s, { t: s.t, paths });
  return paths;
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
const GOB_H = 0.125, WIZ = { x: 0.29, y: 1.24 };

function gpose(s: IceState, e: Ent): GPose {
  const face = e.fx || 1, hurt = Math.max(0, 1 - (s.t - e.hitT) / 10);
  const look = clamp((LAN.x - e.x) * 4, -1, 1) * face;
  let p = 0, u = 0, spin = 0;
  if (e.st === TAUNT) p = 1;
  else if (e.st === SLIDE) {
    const c = cellAt(e.x, e.y);
    const onIce = c >= 0 && s.ice[c] > 0;
    if (onIce || s.t - e.hitT > 30) p = 2;
    else (p = 3), (spin = Math.sin((s.t - e.hitT) * 0.5) * 0.6 + (s.t - e.hitT) * 0.25 * face);
    if (e.k !== 'spike' && p === 3 && onIce) p = 2;
    // 연못 바로 앞: 눈이 휘둥그레
    if (s.ponds.some((q) => Math.hypot(q.x - e.x, q.y - e.y) < q.r + 0.05)) p = 8;
  } else if (e.st === DIZZY) p = 4;
  else if (e.st === SMASH) (p = 5), (u = 1 - e.tm / SMASH_T);
  else if (e.st === FLEE) p = 6;
  else if (e.st === CLIMB) p = 7;
  return { p, ph: e.walk * 90, u, face, hurt, look, spin };
}

function drawAll(ctx: C2, s: IceState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage], P = PAL[d.place];
  const X = (gx: number, gy: number) => gsx(gx, gy) * w, Y = (gy: number) => gsy(gy) * w, R = (r: number) => r * w;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const bg = getBg(Math.round(w), Math.round(h), d.place, Math.min(3, Math.max(1, Math.round(sc))));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const seenT = fx.memo.t ?? -1;
  // 사건 기억 (연출용)
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    if (e.kind === 'splash' || e.kind === 'regain' || e.kind === 'bossdunk') fx.memo.happyT = t;
    if (e.kind === 'splash' && (e.n ?? 1) >= 2) fx.memo.cheerT = t;
    if (e.kind === 'steal' || e.kind === 'smother') (fx.memo.sadT = t), (fx.memo.lanT = t);
    if (e.kind === 'splash') for (const p of s.ponds) if (Math.hypot(p.x - e.x, p.y - e.y) < p.r + 0.06) fx.memo['pf' + Math.round(p.x * 100)] = t;
  }
  // 카메라: 손가락(붓) 쪽으로 살짝 — 배경만 시차로 움직인다
  const camT = s.down ? clamp(s.lx - 0.5, -0.5, 0.5) : 0;
  fx.memo.cam = (fx.memo.cam ?? 0) + (camT - (fx.memo.cam ?? 0)) * 0.05;
  const cam = fx.memo.cam;

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 먼 산 · 마을 (시차) ──
  ctx.fillStyle = P.sky[0];
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.drawImage(bg.sky, 0, 0, w, bg.sky.height / Math.min(3, Math.max(1, Math.round(sc))));
  const lsc = Math.min(3, Math.max(1, Math.round(sc)));
  ctx.drawImage(bg.far, -R(0.06) - cam * R(0.03), 0, bg.far.width / lsc, bg.far.height / lsc);
  // 먼 눈송이
  for (let j = 0; j < 26; j++) {
    const sp = 0.25 + hsh(j) * 0.25, yy = ((hsh(j + 3) * h * 0.4 + t * sp) % (Y(0) + 10)) - 5, xx = ((hsh(j + 7) * w + Math.sin(t * 0.015 + j) * R(0.02) - cam * R(0.02)) % w + w) % w;
    ctx.fillStyle = 'rgba(230,238,255,.55)';
    ctx.fillRect(xx, yy, 1.4, 1.4);
  }
  const midX = -R(0.08) - cam * R(0.07);
  ctx.drawImage(bg.mid, midX, 0, bg.mid.width / lsc, bg.mid.height / lsc);
  // 굴뚝 연기
  for (const [cx, cy] of bg.chim) {
    for (let j = 0; j < 3; j++) {
      const u = (t * 0.006 + j / 3 + cx * 0.01) % 1;
      ctx.fillStyle = `rgba(210,220,245,${0.22 * (1 - u)})`;
      ell(ctx, midX + cx + Math.sin(u * 4 + cx) * 4 + u * 8, cy - u * R(0.08), 3 + u * 7, 3 + u * 6);
      ctx.fill();
    }
  }
  // 창문 속 마을 사람들: 큰 순간마다 고개를 내밀고 만세
  const cheer = Math.max(0, 1 - (t - (fx.memo.cheerT ?? -999)) / 80);
  if (cheer > 0)
    bg.wins.forEach(([wx, wy, ww, wh], j) => {
      if (hsh(j * 7.7) < 0.45) return;
      const pop = Math.min(1, cheer * 3) * wh * 0.55, hx = midX + wx + ww / 2, hy = wy + wh - pop + Math.sin(t * 0.4 + j) * 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(midX + wx, wy, ww, wh);
      ctx.clip();
      ctx.fillStyle = '#3a2430';
      ell(ctx, hx, hy, ww * 0.28, ww * 0.28);
      ctx.fill();
      ctx.fillRect(hx - ww * 0.3, hy + ww * 0.2, ww * 0.6, wh);
      ctx.strokeStyle = '#3a2430';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx - ww * 0.25, hy + ww * 0.3);
      ctx.lineTo(hx - ww * 0.45, hy - ww * 0.3);
      ctx.moveTo(hx + ww * 0.25, hy + ww * 0.3);
      ctx.lineTo(hx + ww * 0.45, hy - ww * 0.3);
      ctx.stroke();
      ctx.restore();
    });
  // ── 광장 바닥 ──
  ctx.drawImage(bg.floor, 0, 0, w, h);
  // 등불 둘레 따뜻한 빛
  const on = s.lights / Math.max(1, s.maxLights);
  ctx.fillStyle = radg(ctx, X(LAN.x, LAN.y), Y(LAN.y), 0, R(0.18 + 0.22 * on), [0, `rgba(255,196,110,${0.18 + 0.3 * on})`], [1, 'rgba(255,190,100,0)']);
  ell(ctx, X(LAN.x, LAN.y), Y(LAN.y), R(0.18 + 0.22 * on), R(0.18 + 0.22 * on) * SQ);
  ctx.fill();
  // 화롯불 곁 (얼음이 금방 녹는 자리)
  for (const hz of s.heats) {
    const flick = 0.85 + 0.15 * Math.sin(t * 0.2 + hz.x * 9);
    ctx.fillStyle = radg(ctx, X(hz.x, hz.y), Y(hz.y), 0, R(hz.r), [0, `rgba(255,150,70,${0.42 * flick})`], [0.7, `rgba(255,120,60,${0.16 * flick})`], [1, 'rgba(255,120,60,0)']);
    ell(ctx, X(hz.x, hz.y), Y(hz.y), R(hz.r) * psc(hz.y), R(hz.r) * SQ);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,170,90,${0.45 * flick})`;
    ctx.setLineDash([R(0.012), R(0.012)]);
    ctx.lineDashOffset = -t * 0.3;
    ctx.lineWidth = 1.5;
    ell(ctx, X(hz.x, hz.y), Y(hz.y), R(hz.r) * psc(hz.y), R(hz.r) * SQ);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // ── 얼음 ──
  const cwp = CELL * w;
  const iceCells: number[] = [];
  for (let idx = 0; idx < s.ice.length; idx++) if (s.ice[idx] > 0) iceCells.push(idx);
  const cellXY = (idx: number) => {
    const i = idx % NX, j = (idx - i) / NX, cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
    return [X(cx, cy), Y(cy), psc(cy), cx, cy, i, j];
  };
  for (const pass of [0, 1]) {
    for (const idx of iceCells) {
      const [sx, sy, ps] = cellXY(idx), a = Math.min(1, s.ice[idx] / 45);
      if (pass === 0) {
        ctx.fillStyle = `rgba(60,130,200,${0.85 * a})`;
        ell(ctx, sx, sy + 2, cwp * ps * 0.8, cwp * SQ * 0.8);
      } else {
        ctx.fillStyle = s.melt[idx] > 1 ? `rgba(196,232,250,${0.9 * a})` : `rgba(214,246,255,${a})`;
        ell(ctx, sx, sy, cwp * ps * 0.78, cwp * SQ * 0.78);
      }
      ctx.fill();
    }
  }
  // 얼음 위 반사광 · 결(그은 방향) 화살 · 반짝이
  ctx.lineCap = 'round';
  for (const idx of iceCells) {
    const [sx, sy, ps, , , i, j] = cellXY(idx), a = Math.min(1, s.ice[idx] / 45), gx = s.gxv[idx], gy = s.gyv[idx];
    const hv = hsh(idx * 1.37);
    if (hv < 0.22) {
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * a})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx - cwp * 0.3 * ps, sy + cwp * 0.12);
      ctx.lineTo(sx + cwp * 0.1 * ps, sy - cwp * 0.18);
      ctx.stroke();
    }
    if ((gx || gy) && (i + j) % 2 === 0) {
      const ph = ((t * 0.035 + hv) % 1) - 0.5, ux = gx * ps, uy = gy * SQ, n = Math.hypot(ux, uy) || 1, ax = ux / n, ay = uy / n;
      const cx = sx + ax * ph * cwp * 0.9, cy = sy + ay * ph * cwp * 0.9, L = cwp * 0.32;
      ctx.strokeStyle = `rgba(70,160,230,${0.85 * a * (1 - Math.abs(ph) * 1.4)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - ax * L - ay * L * 0.8, cy - ay * L + ax * L * 0.8);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - ax * L + ay * L * 0.8, cy - ay * L - ax * L * 0.8);
      ctx.stroke();
    }
    const tw = Math.sin(t * 0.15 + hv * 40);
    if (hv > 0.85 && tw > 0.6) {
      ctx.fillStyle = `rgba(255,255,255,${(tw - 0.6) * 2.4 * a})`;
      starPath(ctx, sx + (hv - 0.9) * cwp * 3, sy - cwp * 0.1, cwp * 0.18);
      ctx.fill();
    }
    // 녹는 중: 물웅덩이 테두리
    if (s.ice[idx] < 45) {
      ctx.strokeStyle = `rgba(120,190,240,${0.4 * (1 - a)})`;
      ctx.lineWidth = 1;
      ell(ctx, sx, sy, cwp * ps * 0.6, cwp * SQ * 0.5);
      ctx.stroke();
    }
  }
  // ── 연못 · 빠진 것 ──
  s.ponds.forEach((p, k) => {
    const fl = Math.max(0, 1 - (t - (fx.memo['pf' + Math.round(p.x * 100)] ?? -99)) / 14);
    drawPond(ctx, X(p.x, p.y), Y(p.y), R(p.r) * psc(p.y), R(p.r) * SQ, t, k * 0.37 + 0.1, fl);
  });
  for (const k of s.sinks) {
    const age = t - k.t, sx = X(k.x, k.y), sy = Y(k.y), ps = psc(k.y), kk = R(GOB_H) * ps * GSIZE[k.k];
    if (k.k !== 'ball' && age > 3 && age < 52) {
      // 두 발만 동동
      const sink = Math.max(0, (age - 28) / 24), kick = Math.sin(age * 0.9) * kk * 0.12;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - kk, sy - kk * 1.5, kk * 2, kk * 1.5 - kk * 0.02);
      ctx.clip();
      const [, c1] = SKIN[k.k];
      for (const sd of [-1, 1]) {
        const lx = sx + sd * kk * 0.12 + (sd > 0 ? kick : -kick) * 0.5, top = sy - kk * (0.5 - sink * 0.5);
        limb(ctx, lx, sy + kk * 0.1, lx + sd * kick * 0.3, top, kk * 0.11, c1);
        ctx.fillStyle = c1;
        ell(ctx, lx + sd * kick * 0.3, top - kk * 0.02, kk * 0.07, kk * 0.045, sd * 0.4);
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,250,255,.8)';
      ctx.lineWidth = 1.5;
      ell(ctx, sx, sy, kk * 0.3, kk * 0.1);
      ctx.stroke();
    }
    if (age < 26) {
      // 물보라 왕관
      const u = age / 26, big = k.k === 'ball' || k.k === 'boss' || k.k === 'fat' ? 1.4 : 1;
      for (let j = 0; j < 10; j++) {
        const a = -Math.PI * (0.1 + 0.8 * (j / 9)), v = kk * (0.9 + hsh(k.seed + j) * 0.7) * big;
        const px = sx + Math.cos(a) * v * u * 1.2, py = sy - Math.sin(-a) * v * u * 2.2 + u * u * v * 1.6;
        ctx.fillStyle = `rgba(${j % 2 ? '255,255,255' : '160,230,255'},${1 - u})`;
        ell(ctx, px, py, kk * 0.06 * big, kk * 0.08 * big);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(230,250,255,${0.85 * (1 - u)})`;
      ctx.beginPath();
      ctx.moveTo(sx - kk * 0.25 * big, sy);
      ctx.quadraticCurveTo(sx, sy - kk * 1.3 * big * Math.sin(u * Math.PI), sx + kk * 0.25 * big, sy);
      ctx.fill();
    }
    if (age > 35 && age < 115)
      for (let j = 0; j < 3; j++) {
        const u = ((age - 35) / 80 + j * 0.3) % 1;
        ctx.strokeStyle = `rgba(220,250,255,${0.7 * (1 - u)})`;
        ctx.lineWidth = 1.2;
        ell(ctx, sx + Math.sin(j * 2 + age * 0.1) * kk * 0.2, sy - u * kk * 0.5, kk * 0.05, kk * 0.05);
        ctx.stroke();
      }
  }
  // ── 미리 보기 (누르는 동안): 미끄러질 길 끝에 퐁 · 쾅 · 등불! ──
  if (s.down && s.phase === 'play') {
    for (const q of preview(s)) {
      const col = q.end === 'pond' ? '159,240,255' : q.end === 'steal' ? '255,110,90' : q.end === 'bonk' ? '255,216,107' : '230,236,255';
      ctx.strokeStyle = `rgba(${col},.85)`;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([R(0.014), R(0.012)]);
      ctx.lineDashOffset = -t * 0.8;
      ctx.beginPath();
      q.pts.forEach(([gx, gy], i) => (i ? ctx.lineTo(X(gx, gy), Y(gy)) : ctx.moveTo(X(gx, gy), Y(gy))));
      ctx.stroke();
      ctx.setLineDash([]);
      const [ex, ey] = q.pts[q.pts.length - 1], sx = X(ex, ey), sy = Y(ey) - R(0.02);
      if (q.end === 'pond' || q.end === 'steal' || q.end === 'bonk') {
        const pulse = 1 + 0.12 * Math.sin(t * 0.4);
        ctx.fillStyle = `rgba(${col},.95)`;
        ell(ctx, sx, sy, R(0.03) * pulse, R(0.03) * pulse);
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        font(0.034, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = OUT;
        ctx.fillText(q.end === 'pond' ? '퐁' : q.end === 'bonk' ? '쾅' : '!', sx, sy + 1);
      }
    }
  }
  // ── 서 있는 것들 (발 깊이 순서) ──
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  s.obs.forEach((o, k) =>
    items.push({ y: o.y, draw: () => drawObs(ctx, X(o.x, o.y), Y(o.y), R(o.r) * psc(o.y), o.k, t + k * 20, o.k === 0 ? Math.max(0, 1 - (t - (fx.memo.happyT ?? -99)) / 40) : 0) }),
  );
  const lanHurt = Math.max(0, 1 - (t - (fx.memo.lanT ?? -99)) / 30);
  items.push({ y: LAN.y, draw: () => drawLantern(ctx, X(LAN.x, LAN.y), Y(LAN.y), R(0.24), s.lights, s.maxLights, t, lanHurt) });
  // 마법사
  const happy = t - (fx.memo.happyT ?? -999) < 45, sad = t - (fx.memo.sadT ?? -999) < 60;
  const danger = s.ents.some((e) => e.k !== 'ball' && e.st !== FLEE && Math.hypot(e.x - LAN.x, e.y - LAN.y) < 0.24);
  const wmood = s.phase === 'result' ? (s.ok ? 2 : 4) : s.down ? 1 : happy ? 2 : sad ? 4 : danger ? 3 : 0;
  const aimX = s.down ? X(s.lx, s.ly) : X(0.5, 0.6), aimY = s.down ? Y(s.ly) : Y(0.6);
  items.push({ y: WIZ.y, draw: () => drawWizard(ctx, X(WIZ.x, WIZ.y), Y(WIZ.y), R(0.17), wmood, t, aimX, aimY, s.down ? 1 : 0) });
  for (const e of s.ents) {
    items.push({
      y: e.y,
      draw: () => {
        const ps = psc(e.y), sx = X(e.x, e.y), sy = Y(e.y);
        if (e.k === 'ball') {
          const c = cellAt(e.x, e.y);
          drawBall(ctx, sx, sy, R(e.r) * ps * 1.3, e.walk * w, Math.atan2(e.vy, e.vx), c >= 0 && s.ice[c] > 0);
          return;
        }
        const kk = R(GOB_H) * ps * GSIZE[e.k];
        if (e.st === CLIMB) {
          // 대장이 연못에서 고개를 내밀고 부르르
          ctx.save();
          ctx.beginPath();
          ctx.rect(sx - kk, sy - kk * 2, kk * 2, kk * 2 - 2);
          ctx.clip();
          drawGoblin(ctx, sx + Math.sin(t * 1.3) * kk * 0.04, sy + kk * 0.55, kk, e.k, gpose(s, e), t, e.seed);
          ctx.restore();
          ctx.strokeStyle = 'rgba(220,250,255,.8)';
          ctx.lineWidth = 2;
          ell(ctx, sx, sy, kk * 0.45, kk * 0.14);
          ctx.stroke();
          return;
        }
        let z = 0, alpha = 1;
        if (e.st === ENTER) alpha = Math.min(1, (t - e.born) / 12);
        // 그림자
        ctx.fillStyle = 'rgba(10,14,40,.4)';
        ell(ctx, sx, sy, kk * 0.32 * WIDE[e.k], kk * 0.09);
        ctx.fill();
        // 미끄러질 때 꼬리 흔적 · 얼음 반사
        const sp = Math.hypot(e.vx, e.vy);
        if (e.st === SLIDE && sp > 0.006) {
          const ux = e.vx / sp, uy = e.vy / sp;
          ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.lineWidth = 2;
          for (let j = -1; j <= 1; j++) {
            const ox = -uy * j * kk * 0.18, oy = ux * j * kk * 0.05;
            ctx.beginPath();
            ctx.moveTo(sx - ux * kk * 0.3 + ox, sy - kk * (0.35 + j * 0.12) + oy);
            ctx.lineTo(sx - ux * kk * (0.3 + sp * 40) + ox, sy - uy * SQ * kk * sp * 30 - kk * (0.35 + j * 0.12) + oy);
            ctx.stroke();
          }
          z = 0;
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        const bonkSq = Math.max(0, 1 - (t - e.bonkT) / 12);
        if (bonkSq > 0) {
          ctx.translate(sx, sy);
          ctx.scale(1 + 0.35 * bonkSq, 1 - 0.35 * bonkSq);
          ctx.translate(-sx, -sy);
        }
        drawGoblin(ctx, sx, sy - z, kk, e.k, gpose(s, e), t, e.seed);
        ctx.restore();
        // 메롱 말풍선
        if (e.st === TAUNT && Math.floor((t + e.seed % 60) / 50) % 2 === 0) {
          font(0.032, 900);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const bx = sx, by2 = sy - kk * 1.35, tw = ctx.measureText('메롱~').width + 10;
          ctx.fillStyle = 'rgba(255,255,255,.95)';
          rr(ctx, bx - tw / 2, by2 - 9, tw, 18, 9);
          ctx.fill();
          ctx.strokeStyle = OUT;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#c0283a';
          ctx.fillText('메롱~', bx, by2 + 1);
        }
        // 등불 가까이 걸어오면 머리 위 '!'
        if ((e.st === RUNS || e.st === SMASH) && Math.hypot(e.x - LAN.x, e.y - LAN.y) < 0.26 && s.phase === 'play') {
          const pulse = 1 + 0.15 * Math.sin(t * 0.6);
          ctx.save();
          ctx.translate(sx + kk * 0.3, sy - kk * 1.25);
          ctx.scale(pulse, pulse);
          ctx.fillStyle = '#ff4a3d';
          ell(ctx, 0, 0, R(0.02), R(0.02));
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          font(0.03, 900);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('!', 0, 1);
          ctx.restore();
        }
      },
    });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // 연못 김
  s.ponds.forEach((p, k) => drawSteam(ctx, X(p.x, p.y), Y(p.y), R(p.r) * psc(p.y), R(p.r) * SQ, t, k * 0.37 + 0.1));
  // ── 마법: 지팡이에서 붓 끝까지 반짝이 줄 + 붓 자국 반짝이 ──
  if (s.down && s.phase === 'play') {
    const k = R(0.17), wx = X(WIZ.x, WIZ.y), wy = Y(WIZ.y) - k * 0.72, ex = X(s.lx, s.ly), ey = Y(s.ly);
    const ang = clamp(Math.atan2(ey - (wy + k * 0.12), ex - (wx + k * 0.2)), -2.6, -0.4);
    const cx0 = wx + k * 0.2 + Math.cos(ang) * k * 0.52, cy0 = wy + k * 0.3 + Math.sin(ang) * k * 0.52;
    const mx = (cx0 + ex) / 2, my = Math.min(cy0, ey) - R(0.12);
    ctx.strokeStyle = s.g > 0 ? 'rgba(170,240,255,.55)' : 'rgba(255,170,160,.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = -t * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx0, cy0);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let j = 0; j < 5; j++) {
      const u = ((t * 0.04 + j / 5) % 1), px = (1 - u) * (1 - u) * cx0 + 2 * u * (1 - u) * mx + u * u * ex, py = (1 - u) * (1 - u) * cy0 + 2 * u * (1 - u) * my + u * u * ey;
      ctx.fillStyle = '#ffffff';
      starPath(ctx, px, py, R(0.009) + j % 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ell(ctx, ex, ey, R(0.04), R(0.04) * SQ);
    ctx.stroke();
  }
  for (const b of s.brush) {
    const age = t - b.t, a = 1 - age / 40;
    if (a <= 0) continue;
    const bx = X(b.x, b.y) + Math.sin(b.t * 7) * R(0.02), by = Y(b.y) - age * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    starPath(ctx, bx, by, R(0.012) * (0.6 + a));
    ctx.fill();
  }
  // 첫 안내: 손가락이 도깨비 줄 밑에서 연못 쪽으로 쭉
  if (s.stage === 0 && !s.firstStroke && s.phase === 'play' && !s.down) {
    const cyc = (t % 100) / 100, u = clamp((cyc - 0.15) / 0.55, 0, 1), press = cyc < 0.15 ? cyc / 0.15 : cyc < 0.75 ? 1 : 1 - (cyc - 0.75) / 0.25;
    const ax = 0.12, ay = 0.5, bx = 0.66, by = 0.5, hx = X(ax + (bx - ax) * u, ay), hy = Y(ay);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.moveTo(X(ax, ay), Y(ay) + R(0.035));
    ctx.lineTo(X(bx, by), Y(by) + R(0.035));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.moveTo(X(bx, by) + R(0.035), Y(by) + R(0.035));
    ctx.lineTo(X(bx, by) - R(0.005), Y(by) + R(0.01));
    ctx.lineTo(X(bx, by) - R(0.005), Y(by) + R(0.06));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.4 + press * 0.5})`;
    ctx.lineWidth = 3;
    ell(ctx, hx, hy + R(0.035), R(0.03 + (1 - press) * 0.02), R(0.03 + (1 - press) * 0.02) * SQ);
    ctx.stroke();
    ctx.shadowColor = 'rgba(255,255,255,.8)';
    ctx.shadowBlur = 8;
    drawHand(ctx, hx + R(0.025), hy + R(0.1), R(0.15), press);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // 새것 스포트라이트
  if (s.spot && t >= s.spot.t) {
    const e = s.ents.find((q) => q.id === s.spot!.id), age = t - s.spot.t;
    if (e && e.st !== ENTER && age < 110) {
      const a = Math.min(1, age / 10, (110 - age) / 20), kk = e.k === 'ball' ? R(e.r) * 2.5 : R(GOB_H) * GSIZE[e.k], cx = X(e.x, e.y), cy = Y(e.y) - kk * 0.5, r0 = kk * 0.95;
      ctx.save();
      ctx.fillStyle = `rgba(4,6,20,${0.5 * a})`;
      ctx.beginPath();
      ctx.rect(-20, -20, w + 40, Y(GH) + 20);
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,74,${a})`;
      ctx.lineWidth = 3;
      ell(ctx, cx, cy, r0 + Math.sin(t * 0.3) * 2, r0 + Math.sin(t * 0.3) * 2);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.04, 900);
      const label = `NEW  ${s.spot.label}`, tw = ctx.measureText(label).width + R(0.04), lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6), ly = cy - r0 - R(0.04) < Y(0.05) ? cy + r0 + R(0.04) : cy - r0 - R(0.04);
      ctx.fillStyle = '#ffd84a';
      rr(ctx, lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#1a1424';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // ── 사건 연출 ──
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const half = ctx.measureText(text).width / 2 + 8;
    x = clamp(x, Math.min(w / 2, half), Math.max(w / 2, w - half));
    y = clamp(y, Y(-0.05), Y(GH) - 10);
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 36 && Math.abs(q.x - x) < w * 0.28 && Math.abs(q.y - y) < (size + q.size) * 0.6); k++) y -= size + 4;
    rec.push({ x, y, t, size });
    if (rec.length > 12) rec.shift();
    fx.pop(x, y, text, col, size);
  };
  const LX = X(LAN.x, LAN.y), LY = Y(LAN.y) - R(0.2);
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x, e.y), ey = Y(e.y);
    switch (e.kind) {
      case 'splash': {
        const n = e.n ?? 1, big = e.k === 'fat' || e.k === 'boss' ? 1.4 : 1;
        fx.burst(ex, ey - R(0.02), '#bff0ff', Math.min(40, 14 + n * 4), 3.6 + n * 0.4, 2.6 * big);
        fx.burst(ex, ey - R(0.02), '#ffffff', 10 + n * 2, 2.6, 1.8);
        fx.ring(ex, ey, '#9fe8ff', R(0.08 + n * 0.015), 4);
        fx.kick(2 + Math.min(8, n * 1.6));
        if (n >= 3) fx.blink('#dff8ff', Math.min(0.4, 0.12 + n * 0.04));
        if (n < 3) say(ex, ey - R(0.12), n === 2 ? '퐁퐁!' : '퐁!', n === 2 ? '#fff27a' : '#e8fbff', 16 + n * 3);
        if (e.text === 'ball') say(ex, ey - R(0.2), '눈덩이 볼링!', '#ffffff', 15);
        if (e.text === 'fat') say(ex, ey - R(0.2), '뚱보 밀기!', '#e6d2ff', 15);
        if (n >= 3) (fx.memo.bigT = t), (fx.memo.bigN = n), (fx.memo.bigX = ex), (fx.memo.bigY = ey), (fx.popups = fx.popups.filter((q) => !q.text.startsWith('퐁')));
        break;
      }
      case 'slip':
        if (t - (fx.memo.slipSay ?? -99) > 40 && e.k !== 'ball') (fx.memo.slipSay = t), say(ex, ey - R(0.16), hsh(t) < 0.5 ? '어어어?' : '으아아!', '#dff6ff', 13);
        fx.burst(ex, ey - R(0.01), '#ffffff', 5, 1.6, 1.4);
        break;
      case 'bonk':
        fx.burst(ex, ey - R(0.05), '#ffe36b', 14, 3.4, 2.2);
        fx.burst(ex, ey - R(0.02), '#ffffff', 10, 2.6, 2.6);
        fx.kick(6);
        say(ex, ey - R(0.14), '쾅!', '#ffd86b', 20);
        break;
      case 'thud':
        if ((e.n ?? 0) >= 4) {
          fx.burst(ex, ey - R(0.05), '#fff3c0', 8, 2.6, 1.8);
          fx.ring(ex, ey - R(0.04), '#ffffff', R(0.06), 3);
          say(ex, ey - R(0.12), (e.n ?? 0) >= 7 ? '쿵!' : '콩!', '#ffffff', 14 + Math.min(6, e.n ?? 0));
          fx.kick(2 + (e.n ?? 0) * 0.5);
        }
        break;
      case 'steal':
        fx.blink('#ff5a4a', 0.25);
        fx.kick(8);
        fx.burst(LX, LY, '#ffcf5a', 18, 3.4, 2.4);
        if (t - (fx.memo.stealSay ?? -99) > 45) (fx.memo.stealSay = t), say(ex, ey - R(0.16), '히히, 불빛 내 거!', '#ffb3a6', 15), say(LX, LY - R(0.06), '불빛 -1', '#ff8a7a', 18);
        break;
      case 'smother':
        fx.blink('#dbe8ff', 0.3);
        fx.kick(8);
        fx.burst(LX, LY + R(0.08), '#ffffff', 26, 4, 3);
        say(LX, LY - R(0.06), '퍽! 불빛 -1', '#ff9a8a', 18);
        break;
      case 'regain':
        fx.burst(LX, LY, '#ffd84a', 24, 4, 2.6);
        fx.ring(LX, LY, '#ffd84a', R(0.12), 5);
        say(LX, LY - R(0.08), '불빛을 되찾았다!', '#ffe27a', 17);
        break;
      case 'escape':
        say(ex, ey - R(0.1), '놓쳤다…', '#c8cde8', 13);
        break;
      case 'smash':
        fx.burst(ex, ey - R(0.02), '#dff8ff', 20, 3.6, 2.4);
        fx.burst(ex, ey - R(0.02), '#9fdcff', 10, 2.4, 3);
        fx.kick(5);
        say(ex, ey - R(0.12), '쨍그랑!', '#bff0ff', 18);
        break;
      case 'windup':
        say(ex, ey - R(0.18), '영차!', '#ffffff', 13);
        break;
      case 'ballsplash':
        fx.burst(ex, ey - R(0.02), '#ffffff', 30, 4.4, 3);
        fx.ring(ex, ey, '#bff0ff', R(0.12), 5);
        fx.kick(5);
        say(ex, ey - R(0.12), '첨벙!', '#e8fbff', 18);
        break;
      case 'poof':
        fx.burst(ex, ey - R(0.03), '#ffffff', 22, 3.6, 3);
        say(ex, ey - R(0.1), '퍽!', '#ffffff', 15);
        break;
      case 'climb':
        fx.burst(ex, ey - R(0.05), '#bff0ff', 16, 3, 2);
        say(ex, ey - R(0.18), '부르르! 아직이다!', '#ffd0c8', 15);
        break;
      case 'bossdunk':
        fx.burst(ex, ey - R(0.02), '#bff0ff', 40, 5, 3);
        fx.ring(ex, ey, '#9fe8ff', R(0.16), 6);
        fx.kick(10);
        fx.blink('#dff8ff', 0.35);
        say(ex, ey - R(0.14), '첨버엉! 한 번 더!', '#fff27a', 22);
        break;
      case 'empty':
        say(ex, ey - R(0.08), '얼음이 바닥!', '#ffb3a8', 14);
        break;
      case 'wave':
        say(w / 2, Y(0.05), '도깨비들이 또 와요!', '#ffe9a8', 15);
        break;
      case 'clear':
        for (let j = 0; j < 4; j++) fx.burst(w * (0.2 + j * 0.2), Y(0.5 + (j % 2) * 0.2), j % 2 ? '#9fe8ff' : '#ffd84a', 30, 5.5, 2.8);
        fx.ring(w / 2, Y(0.8), '#ffffff', R(0.45), 6);
        fx.blink('#eaf8ff', 0.25);
        fx.memo.cheerT = t;
        break;
      case 'fail':
        fx.kick(7);
        break;
    }
  }
  fx.memo.t = t;
  // 붓질 중 얼음 가루
  if (s.down && s.g > 0 && s.brush.length && t % 3 === 0) {
    const b = s.brush[s.brush.length - 1];
    if (t - b.t < 3) fx.burst(X(b.x, b.y), Y(b.y), '#e8fbff', 3, 1.6, 1.6);
  }
  // ── 가까운 것: 가로등 · 굵은 눈송이 ──
  for (const [lx, sd] of [[0.035, -1], [0.965, 1]] as [number, number][]) {
    const px = lx * w - cam * R(0.04) * sd * 0, by = Y(GH) + R(0.02), top = by - R(0.36);
    ctx.fillStyle = radg(ctx, px, top + R(0.02), 0, R(0.16), [0, 'rgba(255,214,140,.35)'], [1, 'rgba(255,214,140,0)']);
    ell(ctx, px, top + R(0.02), R(0.16), R(0.16));
    ctx.fill();
    ctx.fillStyle = '#1e2234';
    rr(ctx, px - R(0.008), top, R(0.016), by - top, R(0.006));
    ctx.fill();
    ctx.fillStyle = '#2a2e40';
    rr(ctx, px - R(0.026), top - R(0.04), R(0.052), R(0.05), R(0.01));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, top - R(0.035), 0, top + R(0.005), [0, '#fff3c0'], [1, '#ffb050']);
    rr(ctx, px - R(0.019), top - R(0.034), R(0.038), R(0.036), R(0.008));
    ctx.fill();
    ctx.fillStyle = '#f6f9ff';
    ell(ctx, px, top - R(0.042), R(0.032), R(0.012));
    ctx.fill();
  }
  for (let j = 0; j < 22; j++) {
    const sp = 0.6 + hsh(j + 50) * 0.7, yy = ((hsh(j + 53) * h + t * sp) % (Y(GH) + 20)) - 10, xx = ((hsh(j + 57) * w + Math.sin(t * 0.02 + j) * R(0.04) - cam * R(0.12)) % w + w) % w;
    const r = j % 4 ? 1.6 : 2.6;
    ctx.fillStyle = `rgba(255,255,255,${j % 4 ? 0.7 : 0.9})`;
    ell(ctx, xx, yy, r, r);
    ctx.fill();
  }
  ctx.restore();

  // 큰 순간 띠: 얼음 판 위 'N마리 줄줄이 퐁당!'
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 56) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN, sc2 = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (56 - age) / 16);
    const bx = clamp(fx.memo.bigX, w * 0.3, w * 0.7), by = clamp(fx.memo.bigY - R(0.2), Y(0.05), Y(1.05));
    const txt = n >= 5 ? `${n}마리 줄줄이 퐁당!` : `${['', '', '', '셋', '넷'][n]} 퐁당!`, size = Math.min(34, 20 + n * 3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.06);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width, pw = tw + 34, phh = size * 1.45, fit = Math.min(1, (w * 0.86) / (pw * sc2));
    ctx.scale(fit, fit);
    ctx.fillStyle = 'rgba(8,20,50,.5)';
    rr(ctx, -pw / 2 + 3, -phh / 2 + 4, pw, phh, phh * 0.35);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -phh / 2, 0, phh / 2, [0, '#e9fbff'], [0.5, '#9fdcff'], [1, '#4aa3e0']);
    rr(ctx, -pw / 2, -phh / 2, pw, phh, phh * 0.35);
    ctx.fill();
    ctx.strokeStyle = '#1b3a6a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // 고드름
    ctx.fillStyle = '#e9fbff';
    for (let i = 0; i < 6; i++) {
      const ix = -pw / 2 + pw * (0.12 + i * 0.15), il = 5 + hsh(i + fx.memo.bigT) * 8;
      ctx.beginPath();
      ctx.moveTo(ix - 3, phh / 2 - 1);
      ctx.lineTo(ix, phh / 2 + il);
      ctx.lineTo(ix + 3, phh / 2 - 1);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#123060';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#ffffff'], [0.6, '#fff4a8'], [1, '#ffcf3a']);
    ctx.fillText(txt, 0, 2);
    for (let i = 0; i < 3; i++) {
      const an = t * 0.08 + (i * TAU) / 3;
      flake(ctx, Math.cos(an) * (pw / 2 + 6), Math.sin(an) * (phh / 2 + 6), 6, '#ffffff', 1.6);
    }
    ctx.restore();
  }

  // ═════════════ HUD ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(10,16,44,.92)'], [1, 'rgba(18,28,66,.82)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(160,230,255,.45)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  {
    const cx = R(0.055), cy = hb / 2;
    ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#e9fbff'], [1, '#5fb4ef']);
    ell(ctx, cx, cy, R(0.031), R(0.031));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#12306a';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f2f8ff';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.1), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.036, 700);
    ctx.fillStyle = '#9fb0dc';
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
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
  // 판 카드 (하늘 띠 안 — 광장을 가리지 않는다)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '마을의 밤을 다 지켰다!' : `${d.goal} 성공!`;
      else (head = `으앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 꼬마 마법사가 코코아 마시러 가요');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : d.hint;
    }
    if (head) {
      const cy = R(0.2), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.045, 900);
      const w1 = ctx.measureText(head).width;
      font(0.034, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.05), Math.max(w1, w2) + R(0.1)) * unroll, ch = sub || (s.phase === 'result' && s.ok) ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - ch / 2 + 4, cw, ch, R(0.03));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#f4fbff'], [1, '#cfe6fb']);
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.03));
      ctx.fill();
      ctx.strokeStyle = '#3a6aa8';
      ctx.lineWidth = 2;
      ctx.stroke();
      // 판 위 눈
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) {
        ell(ctx, w / 2 - cw / 2 + cw * (0.08 + i * 0.14), cy - ch / 2 + 1, cw * 0.08, R(0.012));
        ctx.fill();
      }
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.045, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#1f5aa8' : '#a8282a') : '#12306a';
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.025), w - R(0.1));
        const nst = s.starOk.length > 0 ? 1 + d.stars.length : 1;
        for (let j = 0; j < nst; j++) {
          const ag = s.pt - (12 + j * 12), sx = w / 2 + (j - (nst - 1) / 2) * R(0.07), sy = cy + R(0.03);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.026) * (ag < 0 ? 1 : pop));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(40,70,120,.2)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#7a4a08' : 'rgba(40,70,120,.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.025) : 0), w - R(0.1));
        if (sub) {
          font(0.034, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#b8352a' : '#2a4a7a';
          ctx.fillText(sub, w / 2, cy + R(0.032), w - R(0.1));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 얼음 게이지 · 불빛 · 별 · 안내 ═════════════
  {
    const ty = Y(GH) + R(0.008);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, 'rgba(14,22,56,.97)'], [1, 'rgba(8,12,34,.99)']);
    rr(ctx, 0, ty, w, h - ty + 4, R(0.025));
    ctx.fill();
    ctx.fillStyle = 'rgba(160,230,255,.45)';
    ctx.fillRect(R(0.02), ty, w - R(0.04), 1.5);
    const r1 = ty + R(0.042);
    {
      flake(ctx, R(0.04), r1, R(0.017), '#bff0ff', 2);
      const gx = R(0.07), gw = w * 0.52, gh = R(0.03);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
      ctx.fill();
      const fr = clamp(s.g / GMAX, 0, 1), low = s.g < 15;
      ctx.fillStyle = low ? lin(ctx, gx, 0, gx + gw, 0, [0, '#ff7a6a'], [1, '#ffb36b']) : lin(ctx, gx, 0, gx + gw, 0, [0, '#3fa8f0'], [1, '#e9fbff']);
      if (fr > 0.005) {
        rr(ctx, gx, r1 - gh / 2, gw * fr, gh, gh / 2);
        ctx.fill();
      }
      if (s.down && s.g > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(t * 0.5)})`;
        rr(ctx, gx, r1 - gh / 2, gw * fr, gh, gh / 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(160,220,255,.6)';
      ctx.lineWidth = 1.5;
      rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
      ctx.stroke();
      font(0.033, 900);
      ctx.textAlign = 'center';
      if (fr > 0.3) {
        ctx.fillStyle = '#0b2440';
        ctx.fillText('얼음', gx + (gw * fr) / 2, r1 + 1);
      } else {
        ctx.fillStyle = '#ffb3a8';
        ctx.fillText(low ? '얼음 바닥 — 떼면 차요' : '얼음', gx + gw / 2 + R(0.03), r1 + 1, gw - R(0.02));
      }
      // 불빛
      const fx0 = gx + gw + R(0.03);
      font(0.033, 800);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe9b8';
      ctx.fillText('불빛', fx0, r1 + 1);
      const fw = ctx.measureText('불빛').width, n = s.maxLights, room = w - (fx0 + fw + R(0.03)), stp = Math.min(R(0.04), room / Math.max(1, n));
      for (let j = 0; j < n; j++) {
        const lx = fx0 + fw + R(0.025) + j * stp, lit = j < s.lights;
        if (lit) {
          flamePath(ctx, lx, r1 + R(0.004), R(0.011), t, j);
          ctx.fillStyle = lin(ctx, lx, r1 - R(0.02), lx, r1 + R(0.012), [0, '#fff6c8'], [1, '#ff8a2a']);
          ctx.fill();
          ctx.strokeStyle = 'rgba(120,50,10,.7)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255,255,255,.14)';
          ell(ctx, lx, r1 + R(0.004), R(0.008), R(0.008));
          ctx.fill();
        }
      }
    }
    // 별 (쉬운 말)
    const r2 = ty + R(0.1);
    {
      const labels = [d.goal, ...d.stars.map((q) => {
        const pr = s.phase === 'play' ? starNow(s, q) : '';
        return q.label + (pr && (q.k === 'strokes' || !starMet(s, q)) ? ` ${pr}` : '');
      })];
      const ok = s.phase === 'result' && s.ok ? s.starOk : [false, ...d.stars.map((q) => q.k !== 'nolose' && q.k !== 'strokes' && starMet(s, q))];
      const bad = [false, ...d.stars.map((q) => (q.k === 'nolose' && s.lost > 0) || (q.k === 'strokes' && s.strokes > q.n))];
      font(0.033, 800);
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
        ctx.fillStyle = ok[j] ? '#fff6dc' : bad[j] ? 'rgba(255,255,255,.35)' : '#e6efff';
        font(0.033, 800);
        ctx.fillText(labels[j], xx + R(0.05) * scl, r2 + 1, pw - R(0.058) * scl);
        xx += pw + gap * scl;
      }
    }
    // 안내 한 줄
    {
      let hint = d.hint;
      const first = s.stage === 0 && !s.firstStroke && s.phase === 'play';
      if (first) hint = '누른 채 도깨비 밑에서 연못 쪽으로 쭉!';
      else if (s.down && s.phase === 'play') hint = s.g > 0 ? '그은 쪽으로 미끄러져요 — 점선 끝이 퐁이면 성공!' : '얼음이 바닥 — 떼면 천천히 차요';
      else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판을 지켰어요!' : `별 ${s.got}개! 다음 판엔 새것이 나와요`) : '도깨비가 가는 길을 미리 읽어 보세요';
      font(first ? 0.04 : 0.034, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = first ? '#ffffff' : '#bfefff';
      ctx.fillText(hint, w / 2, ty + R(0.163), w - R(0.04));
    }
  }
  void th;
}
