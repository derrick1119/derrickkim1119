/**
 * 물대포 소방 고양이 (31라운드: 실시간 액션 — 첫인상·손맛·그림) — 물대포 × 가리키기 × 연쇄.
 * 조작(손이 하는 일은 하나): 누르고 있는 동안 소방차 위 고양이가 손가락 쪽으로 물대포를 쏜다(포물선 물줄기, 물방울 하나하나가
 *   날아가 떨어진다). 떼면 물탱크가 천천히 다시 찬다. 키보드는 화살표로 겨누고 스페이스를 누르는 동안 발사.
 * 규칙(결정적): 마을은 6×5 칸. 불은 붙은 칸에서 커지며 옆 칸(나무·집·창고·짚단)을 데워 옮겨 붙는다(대각선은 절반).
 *   물방울 하나는 떨어진 칸의 불을 조금 줄이고, 불 없는 칸은 적신다 — 젖은 칸은 잘 안 붙고, 젖은 칸에 떨어진 불똥은 칙 꺼진다.
 *   센 물살은 통을 민다. 굴러간 물통이 불붙은 것에 부딪히면 펑 터져 둘레 아홉 칸을 한꺼번에 끈다(연쇄).
 *   집이 다 타면 무너진다. 한 판에 집 두 채가 무너지면 하트 -1, 그 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 와우: 첫 꾹에 물줄기가 쏴아 뻗어 0.5초 만에 활활 타던 나무가 '칙!' 꺼지고 김과 무지개 물보라가 피어오른다.
 *   물통을 쏘면 데굴데굴 굴러가 불붙은 짚단에 쾅 — 물벼락이 아홉 칸을 한 번에 끈다.
 * 판 8개: 목표 = 불을 다 끄기. 별 = ★ 마을 지키기 · ★ 집 하나도 안 타게 · ★ 판마다 새 별(쉬운 말 한 줄).
 * 펼쳐짐(하는 일이 바뀐다): 1판 불 끄기 → 2판 불꽃놀이 불똥(떨어질 자리가 미리 보임 → 미리 적시기) → 3판 물통(쏘아 굴려 터뜨리기)
 *   → 4판 바람(불이 바람 쪽으로 번지고 불똥이 길 건너로 날아감, 물줄기도 휨 → 바람 위로 겨누고 길목 막기)
 *   → 5판 갇힌 동물(둘레 불을 먼저 꺼서 구하기 — 순서) → 6판 기름통(불이 닿으면 펑, 기름불엔 물이 튐 → 물살로 밀어 연못에 풍덩)
 *   → 7판 불꽃 도깨비(돌아다니며 불을 붙임 → 따라가며 맞히기) → 8판 큰 불(헛간: 오래 뿌려야 하고 불똥을 튀김 → 물 아끼기).
 * 웃음: 고양이 소방관은 쏠 때 볼이 빵빵(으랏차!), 불이 꺼지면 우쭐, 집이 타면 눈이 휘둥그레 땀 뻘뻘, 물이 바닥나면 호스를 털며 멍.
 *   길가의 강아지·토끼 주민은 꺼질 때마다 양동이를 흔들며 펄쩍. 도깨비는 맞으면 '앗 차가!' 하고 쪼그라든다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.6;
const COLS = 6, ROWS = 5, NC = COLS * ROWS;
// 칸 종류
const GRASS = 0, TREE = 1, HOUSE = 2, SHED = 3, HAY = 4, BARN = 5, POND = 6, ROAD = 7;
const FUEL = [0, 360, 620, 460, 170, 2400, 0, 0];
const FMAX = [0, 1, 1, 1, 1, 4, 0, 0];
const burnable = (k: number) => k >= TREE && k <= BARN;
/** 불: 커지는 빠르기 · 옮겨 붙는 빠르기(f=1이면 옆 칸이 2.5초에) · 붙은 직후 세기 */
const GROW = 0.005, SP = 1 / 150, IGN_F = 0.25;
/** 물: 물방울 하나가 줄이는 불 · 적시는 양 · 마르는 빠르기 · 최대 */
const WP = 0.05, WET_ADD = 0.07, WET_DRY = 1 / 600, WET_MAX = 1.2;
/** 물탱크: 크기 · 떼고 몇 틱 뒤부터 · 틱마다 차는 양 */
const TANK = 150, REFILL_WAIT = 10, REFILL = 1;
/** 물대포 노즐(평면 자리·높이) · 비행 시간 · 흩어짐 · 바람에 밀림 */
const NZ = { x: 3, y: 5.6 }, Z0 = 0.9;
const flightT = (d: number) => Math.round(12 + d * 3.2);
const JIT = 0.24, DRIFT = 0.024;
/** 통: 반지름 · 물살에 밀리는 힘 · 구름 마찰 · 최고 속도 */
const BR = 0.26, PUSH = 0.007, BFR = 0.975, BVMAX = 0.1;
/** 물통이 터지면 둘레 9칸의 불을 이만큼 줄인다 */
const BURST_P = 2.4;
/** 기름통: 불 옆에서 이만큼(틱) 데워지면 펑 */
const OIL_T = 120;
/** 불똥: 예고(틱) · 바람 불똥 간격 · 큰 불 불똥 간격 */
const EMBER_WARN = 110, SPARK_WARN = 85, SPARK_T = 130, BARN_SPARK_T = 120;
/** 갇힌 동물이 연기를 버티는 시간(틱) */
const PET_T = 300;
/** 불꽃 도깨비: 걷는 빠르기 · 불 붙이기 전 머뭇 · 체력(물방울 수) */
const IMP_V = 0.02, IMP_STAND = 50, IMP_HP = 45;
const RESULT_OK = 170, RESULT_FAIL = 150, CARD_T = 150, NEWS_T = 170, MAX_STAGE_T = 60 * 60;
const STAR_PTS = 100, HOUSE_PTS = 10, PET_PTS = 20, WIN_PTS = 200;
const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

interface StageDef {
  key: string;
  name: string;
  news: string;
  hint: string;
  star3: string;
  /** 5줄 × 6칸 ('.' 풀 · T 나무 · H 집 · S 창고 · h 짚단 · B 큰 헛간 · ~ 연못 · = 돌길) */
  map: string[];
  /** [c, r, 불 세기] */
  fires: number[][];
  /** [틱, c, r] — 하늘 불꽃놀이에서 떨어지는 불똥 */
  embers?: number[][];
  /** [x, y, 0 물통 | 1 기름통] */
  things?: number[][];
  /** [c, r, 0 아기 고양이 | 1 강아지 | 2 병아리] */
  pets?: number[][];
  wind?: number;
  /** [나오는 틱, 떠나는 틱] */
  imp?: number[];
  spd: number;
}

export const STAGES: StageDef[] = [
  {
    key: 'first', name: '첫 불', news: '', hint: '불붙은 곳을 꾹 — 손가락 쪽으로 물대포가 쏴아!', star3: '나무 반 넘게 지키기',
    map: ['T.H..T', '.T..TT', 'H..H..', '.TT..T', 'T....T'],
    fires: [[2, 3, 0.8], [4, 1, 0.5], [0, 0, 0.3]],
    spd: 0.5,
  },
  {
    key: 'ember', name: '불꽃놀이', news: '새것: 불똥 — 빨간 동그라미에 떨어져요. 미리 적시면 칙!', hint: '빨간 동그라미 = 불똥 떨어질 자리. 미리 적셔 두면 그냥 꺼져요', star3: '불똥 두 개 미리 막기',
    map: ['TT.H.T', 'H...T.', '.T...H', 'T.H.T.', '.T...T'],
    fires: [[4, 1, 0.6]],
    embers: [[70, 1, 2], [190, 5, 4], [310, 4, 3], [430, 5, 0], [550, 1, 4]],
    spd: 0.7,
  },
  {
    key: 'barrel', name: '물통', news: '새것: 물통 — 쏘면 굴러가요. 불에 부딪히면 펑!', hint: '물통 옆구리를 쏘면 반대쪽으로 굴러가요 — 불붙은 짚단에 쾅!', star3: '물통으로 불 끄기',
    map: ['H.hhT.', '.Thh.H', 'T.....', '.H..TT', 'T.....'],
    fires: [[2, 0, 0.6], [3, 0, 0.6], [2, 1, 0.6], [3, 1, 0.6]],
    embers: [[330, 4, 3], [470, 0, 2]],
    things: [[2.5, 2.55, 0], [4.45, 2.5, 0]],
    spd: 1,
  },
  {
    key: 'wind', name: '바람', news: '새것: 바람 — 불이 바람 쪽으로 번지고 물줄기도 휘어요', hint: '바람 부는 쪽 불부터! 불똥이 길 건너로 날아가요', star3: '길 건너로 불 안 넘기기',
    map: ['TT=TH.', 'hT=hTH', 'TT=T.T', '.h=HT.', 'TT=T.T'],
    fires: [[0, 1, 0.8], [1, 2, 0.7], [1, 4, 0.6], [1, 0, 0.5]],
    embers: [[420, 0, 3]],
    wind: 1,
    spd: 0.9,
  },
  {
    key: 'pet', name: '갇힌 동물', news: '새것: 갇힌 동물 — 둘레 불을 다 끄면 뛰어나와요', hint: '동물 둘레 불부터 끄면 소방차로 달려와요', star3: '동물 모두 구하기',
    map: ['T.H.TT', 'TTh.T.', '.H..TH', 'T.TT..', '.T..h.'],
    fires: [[1, 1, 0.3], [4, 2, 0.4], [2, 3, 0.3], [4, 0, 1], [5, 0, 1], [0, 3, 1], [1, 4, 1]],
    embers: [[300, 0, 0], [450, 4, 4]],
    pets: [[1, 1, 0], [5, 2, 1], [3, 3, 2]],
    spd: 0.9,
  },
  {
    key: 'oil', name: '기름통', news: '새것: 기름통 — 불이 닿으면 펑! 물살로 밀어 연못에 풍덩', hint: '기름불에 물을 뿌리면 튀어요 — 기름통은 미리 밀어 내요', star3: '기름통 안 터지게',
    map: ['H.T.TH', '.TT..T', '~..T.H', '.T..T.', 'T....T'],
    fires: [[2, 1, 0.3], [4, 3, 0.3], [2, 0, 1], [5, 1, 1], [0, 4, 1], [5, 4, 1]],
    embers: [[220, 1, 3], [400, 3, 2]],
    things: [[1.5, 2.45, 1], [3.5, 3.5, 1], [2.5, 2.5, 0]],
    spd: 0.9,
  },
  {
    key: 'imp', name: '불꽃 도깨비', news: '새것: 불꽃 도깨비 — 돌아다니며 불을 붙여요. 물을 맞혀요!', hint: '도깨비가 가는 곳을 따라가며 맞혀요 — 맞으면 쪼그라들어요', star3: '도깨비 잡기',
    map: ['TH.T.T', '.T.H.T', 'T.T...', '.H.TT.', 'T....T'],
    fires: [[5, 0, 0.4], [0, 2, 0.8], [4, 3, 0.8]],
    embers: [[300, 1, 1], [480, 3, 0], [600, 5, 1]],
    imp: [60, 960],
    spd: 0.9,
  },
  {
    key: 'big', name: '큰 불', news: '새것: 큰 불 — 오래 뿌려야 꺼지고 불똥을 튀겨요', hint: '물이 바닥나기 전에 손을 떼요 — 물통도 써요', star3: '물 바닥나지 않게',
    map: ['T.TT.H', 'H.B.T.', '.T..TT', 'T.H.h.', '.T...T'],
    fires: [[2, 1, 3.6], [4, 1, 0.7], [0, 3, 0.7], [4, 3, 0.8]],
    things: [[1.5, 2.5, 0], [3.5, 2.5, 0]],
    spd: 0.9,
  },
];
export const STAGE_COUNT = STAGES.length;
const KCH: Record<string, number> = { '.': GRASS, T: TREE, H: HOUSE, S: SHED, h: HAY, B: BARN, '~': POND, '=': ROAD };

interface Cell { k: number; fuel: number; max: number; f: number; heat: number; wet: number; oil: boolean; burnt: boolean; hitT: number; spark: number; outT: number; splat: number; v: number }
interface Thing { id: number; k: number; x: number; y: number; vx: number; vy: number; alive: boolean; heat: number; spin: number; hitT: number; endT: number; end: number }
interface Drop { t0: number; T: number; tx: number; ty: number; lx: number; ly: number; hh: number; jx: number; jy: number }
interface Ember { c: number; r: number; sx: number; sy: number; sky: boolean; t0: number; land: number }
interface Imp { x: number; y: number; vx: number; vy: number; tc: number; stand: number; hp: number; stun: number; st: number; leaving: boolean; face: number; hitT: number; t0: number; leaveAt: number; endT: number }
interface Pet { c: number; r: number; kind: number; st: number; smoke: number; t: number }
interface Landed { x: number; y: number; t: number; hot: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
interface Sched { tick: number; kind: number; c: number; r: number }

export interface FireState {
  rng: Rng; seed: number; flips: boolean[];
  t: number; stage: number; phase: 'play' | 'result'; pt: number; stageT: number; freeze: number; slow: number;
  cells: Cell[]; things: Thing[]; drops: Drop[]; embers: Ember[]; landed: Landed[]; imp: Imp | null; pets: Pet[];
  sched: Sched[]; si: number; wind: number; road: number;
  tank: number; relT: number; sprayT: number; down: boolean; aim: { x: number; y: number } | null;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string;
  houses: number; trees: number; lost: number; limit: number; prewet: number; barrelOut: number; crossed: boolean; booms: number; impCaught: boolean; dry: boolean; petsSaved: number;
  outs: number; combo: number; lastOut: number; firstPressT: number; firstOutT: number; presses: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  dead: boolean; won: boolean; again: boolean; tries: number; tid: number; stageStars: number[];
}

const ev = (s: FireState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: FireState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

// ───────── 화면 배치 (가로 0~1, 세로 0~A) — 저녁 마을을 앞에서 비스듬히 내려다본다: 뒤가 좁고 앞이 넓다 ─────────
const GY0 = 0.36, GKY = 0.136, SB = 0.8, SF = 0.98, HZ = 0.14;
const scl = (y: number) => SB + (SF - SB) * (y / ROWS);
const PX = (x: number, y: number) => 0.5 + (x / COLS - 0.5) * scl(y);
const PY = (y: number) => GY0 + y * GKY;
const PZ = (y: number, z: number) => PY(y) - z * HZ * scl(y);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function toPlane(sx: number, sy: number) {
  const y = clamp((sy - GY0) / GKY, -0.6, ROWS - 0.02);
  return { x: clamp(((sx - 0.5) / scl(y) + 0.5) * COLS, -0.4, COLS + 0.4), y };
}
const cellOf = (x: number, y: number) => (x < 0 || x >= COLS || y < 0 || y >= ROWS ? -1 : Math.floor(y) * COLS + Math.floor(x));

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
/** 바람이 부는 쪽 길 건너 칸인가 (4판 ★) */
const farSide = (s: FireState, i: number) => s.road >= 0 && s.wind !== 0 && (s.wind > 0 ? i % COLS > s.road : i % COLS < s.road);

function ignite(s: FireState, i: number, f: number, why: string) {
  const a = s.cells[i];
  if (!burnable(a.k) || a.burnt || a.f > 0) return;
  a.f = f;
  a.heat = 0;
  if (farSide(s, i)) s.crossed = true;
  ev(s, why === 'imp' ? 'implight' : why === 'ember' ? 'emberhit' : 'ignite', (i % COLS) + 0.5, ((i / COLS) | 0) + 0.5);
  if (why === 'spread') see(s, 'spread', '불은 옆 나무·집으로 옮겨 붙어요 — 길목을 먼저 막아요');
}

function extinguish(s: FireState, i: number, byBarrel: boolean) {
  const a = s.cells[i];
  a.f = 0;
  a.heat = 0;
  a.oil = false;
  a.wet = Math.max(a.wet, 0.5);
  a.outT = s.t;
  s.outs++;
  s.combo = s.t - s.lastOut < 110 ? s.combo + 1 : 1;
  s.lastOut = s.t;
  if (byBarrel) s.barrelOut++;
  if (s.firstOutT < 0) (s.firstOutT = s.t), (s.freeze = Math.max(s.freeze, 4));
  else s.freeze = Math.max(s.freeze, 2);
  ev(s, byBarrel ? 'hissb' : 'hiss', (i % COLS) + 0.5, ((i / COLS) | 0) + 0.5, s.combo >= 2 ? `칙! 연속 ${s.combo}` : '칙!', s.combo);
  see(s, 'out', '불이 꺼지면 칙! 꺼진 자리는 젖어서 잘 안 붙어요');
}

function burnDown(s: FireState, i: number) {
  const a = s.cells[i];
  a.f = 0;
  a.fuel = 0;
  a.burnt = true;
  a.oil = false;
  const x = (i % COLS) + 0.5, y = ((i / COLS) | 0) + 0.5;
  if (a.k === HOUSE) {
    s.lost++;
    s.freeze = Math.max(s.freeze, 3);
    ev(s, 'collapse', x, y, '와르르…');
    see(s, 'collapse', '집이 다 타면 무너져요 — 두 채 무너지면 그 판 다시');
  } else ev(s, 'ash', x, y);
  for (const p of s.pets) if (p.st === 0 && p.r * COLS + p.c === i) (p.st = 2), (p.t = s.t), ev(s, 'flee', x, y, '콜록콜록…');
}

function spawnEmber(s: FireState, c: number, r: number, sx: number, sy: number, sky: boolean, warn: number) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
  if (s.embers.some((e) => e.c === c && e.r === r)) return;
  s.embers.push({ c, r, sx, sy, sky, t0: s.t, land: s.t + warn });
  see(s, 'ember', '빨간 동그라미 = 불똥 떨어질 자리 — 미리 적시면 칙!');
}

function emberLand(s: FireState, e: Ember) {
  const i = e.r * COLS + e.c, a = s.cells[i], x = e.c + 0.5, y = e.r + 0.5;
  if (!burnable(a.k) || a.burnt) return void ev(s, 'puff', x, y, '피식');
  if (a.f > 0) return void (a.f = Math.min(FMAX[a.k], a.f + 0.2));
  if (a.wet > 0.12) {
    a.wet = Math.max(0, a.wet - 0.15);
    s.prewet++;
    ev(s, 'fizzle', x, y, '미리 막았다!');
    see(s, 'prewet', '미리 적신 칸에 떨어진 불똥은 칙 꺼져요');
    return;
  }
  ignite(s, i, 0.4, 'ember');
}

function emit(s: FireState) {
  const ax = s.aim!.x, ay = s.aim!.y;
  const jx = (s.rng() - 0.5) * JIT, jy = (s.rng() - 0.5) * JIT, tx = ax + jx, ty = ay + jy;
  const dist = Math.hypot(tx - NZ.x, ty - NZ.y), T = flightT(dist);
  s.drops.push({ t0: s.t, T, tx, ty, lx: tx + s.wind * DRIFT * T, ly: ty, hh: 0.45 + dist * 0.2, jx, jy });
}

function pushThing(s: FireState, b: Thing, lx: number, ly: number) {
  const sdx = lx - NZ.x, sdy = ly - NZ.y, sl = Math.hypot(sdx, sdy) || 1;
  const dx = sdx / sl + (b.x - lx) * 2.2, dy = sdy / sl + (b.y - ly) * 2.2, l = Math.hypot(dx, dy) || 1;
  b.vx += (dx / l) * PUSH;
  b.vy += (dy / l) * PUSH;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > BVMAX) (b.vx *= BVMAX / sp), (b.vy *= BVMAX / sp);
  if (s.t - b.hitT > 30) ev(s, 'shove', b.x, b.y, b.k === 1 ? '데굴!' : '데굴데굴!');
  b.hitT = s.t;
  see(s, 'barrel', '물통을 쏘면 굴러가요 — 불붙은 것에 부딪히면 펑!');
}

function land(s: FireState, dp: Drop) {
  const lx = dp.lx, ly = dp.ly, i = cellOf(lx, ly);
  const hot = i >= 0 && s.cells[i].f > 0;
  s.landed.push({ x: lx, y: ly, t: s.t, hot });
  if (s.landed.length > 50) s.landed.shift();
  for (const b of s.things) if (b.alive && Math.hypot(b.x - lx, b.y - ly) < 0.5) pushThing(s, b, lx, ly);
  const im = s.imp;
  if (im && im.st === 0 && !im.leaving && Math.hypot(im.x - lx, im.y - ly) < 0.45) {
    im.hp--;
    im.stun = 5;
    const sdx = lx - NZ.x, sdy = ly - NZ.y, sl = Math.hypot(sdx, sdy) || 1;
    im.vx += (sdx / sl) * 0.008;
    im.vy += (sdy / sl) * 0.008;
    if (s.t - im.hitT > 40) ev(s, 'imphit', im.x, im.y, ['앗 차가!', '으앗!', '그만해!'][s.t % 3]);
    im.hitT = s.t;
    if (im.hp <= 0) (im.st = 1), (im.endT = s.t), (s.impCaught = true), (s.freeze = Math.max(s.freeze, 5)), (s.slow = Math.max(s.slow, 24)), ev(s, 'catch', im.x, im.y, '도깨비 잡았다!');
  }
  if (i < 0) return;
  const a = s.cells[i];
  if (a.k === POND) return;
  a.hitT = s.t;
  if (a.f > 0) {
    if (a.oil) {
      // 기름불에 물 = 튄다: 둘레를 데운다
      a.splat++;
      const c = i % COLS, r = (i / COLS) | 0;
      for (const [dc, dr] of N8) {
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
        const b = s.cells[rr * COLS + cc];
        if (!burnable(b.k) || b.burnt || b.f > 0) continue;
        if (b.wet > 0) b.wet = Math.max(0, b.wet - 0.035);
        else b.heat += 0.035;
      }
      a.f -= WP * 0.4;
      if (a.f <= 0) extinguish(s, i, false);
      else if (a.splat % 10 === 1) ev(s, 'splat', lx, ly, '앗, 튄다!');
      see(s, 'oilfire', '기름불에 물을 뿌리면 튀어요 — 물통으로 꺼요');
    } else {
      a.f -= WP;
      if (a.f <= 0) extinguish(s, i, false);
    }
    a.wet = Math.min(WET_MAX, a.wet + 0.02);
  } else if (burnable(a.k) || a.k === GRASS || a.k === ROAD) {
    a.wet = Math.min(WET_MAX, a.wet + WET_ADD);
    a.heat = Math.max(0, a.heat - 0.05);
  }
}

/** 통 하나를 한 틱 굴린다 (진짜 판과 봇의 내다보기가 같은 규칙). 0 그대로 · 1 불붙은 것에 부딪힘 · 2 연못 · 3 튕김 */
function rollTick(cells: Cell[], b: { x: number; y: number; vx: number; vy: number }, hit: { i: number }): number {
  const sp = Math.hypot(b.vx, b.vy);
  if (sp < 0.0008) return (b.vx = b.vy = 0), 0;
  let nx = b.x + b.vx, ny = b.y + b.vy, out = 0;
  if (nx < BR) (nx = BR), (b.vx = Math.abs(b.vx) * 0.4), (out = 3);
  if (nx > COLS - BR) (nx = COLS - BR), (b.vx = -Math.abs(b.vx) * 0.4), (out = 3);
  if (ny < BR) (ny = BR), (b.vy = Math.abs(b.vy) * 0.4), (out = 3);
  if (ny > ROWS - BR) (ny = ROWS - BR), (b.vy = -Math.abs(b.vy) * 0.4), (out = 3);
  const ci = cellOf(nx, ny);
  if (ci >= 0 && cells[ci].k === POND) return (b.x = nx), (b.y = ny), (hit.i = ci), 2;
  // 앞머리가 닿는 칸
  const ux = b.vx / (Math.hypot(b.vx, b.vy) || 1), uy = b.vy / (Math.hypot(b.vx, b.vy) || 1);
  const li = cellOf(nx + ux * BR, ny + uy * BR);
  if (li >= 0) {
    const a = cells[li];
    if (burnable(a.k) && !a.burnt) {
      hit.i = li;
      if (a.f > 0) return 1;
      const lc = li % COLS, lr = (li / COLS) | 0;
      if (lc !== Math.floor(b.x + ux * BR)) b.vx = -b.vx * 0.45;
      if (lr !== Math.floor(b.y + uy * BR)) b.vy = -b.vy * 0.45;
      if (lc === Math.floor(b.x + ux * BR) && lr === Math.floor(b.y + uy * BR)) (b.vx = -b.vx * 0.45), (b.vy = -b.vy * 0.45);
      b.vx *= BFR;
      b.vy *= BFR;
      return 3;
    }
  }
  b.x = nx;
  b.y = ny;
  b.vx *= BFR;
  b.vy *= BFR;
  return out;
}

function burst(s: FireState, i: number, b: Thing) {
  const c = i % COLS, r = (i / COLS) | 0;
  let n = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      const j = rr * COLS + cc, a = s.cells[j];
      if (a.f > 0) {
        a.f = a.oil ? 0 : a.f - BURST_P;
        if (a.f <= 0) extinguish(s, j, true), n++;
      }
      a.wet = WET_MAX;
      a.heat = 0;
    }
  b.alive = false;
  b.end = 1;
  b.endT = s.t;
  s.freeze = Math.max(s.freeze, 5);
  s.slow = Math.max(s.slow, 24);
  ev(s, 'burst', c + 0.5, r + 0.5, n > 1 ? `물벼락! ${n}곳 한꺼번에` : '물벼락!', n);
  see(s, 'burst', '물통이 터지면 둘레 아홉 칸이 한꺼번에 꺼져요');
}

function boom(s: FireState, b: Thing) {
  const c = clamp(Math.floor(b.x), 0, COLS - 1), r = clamp(Math.floor(b.y), 0, ROWS - 1);
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      const j = rr * COLS + cc, a = s.cells[j];
      if (!burnable(a.k) || a.burnt) continue;
      if (a.f <= 0) ignite(s, j, 0.8, 'boom');
      a.f = Math.max(a.f, 0.8);
      a.oil = true;
    }
  b.alive = false;
  b.end = 3;
  b.endT = s.t;
  s.booms++;
  s.freeze = Math.max(s.freeze, 5);
  s.slow = Math.max(s.slow, 24);
  ev(s, 'boom', b.x, b.y, '펑!! 기름불');
  see(s, 'oilfire', '기름불에 물을 뿌리면 튀어요 — 물통으로 꺼요');
}

function thingsTick(s: FireState) {
  const hit = { i: -1 };
  for (const b of s.things) {
    if (!b.alive) continue;
    const sp = Math.hypot(b.vx, b.vy);
    b.spin += sp * 9;
    const out = rollTick(s.cells, b, hit);
    if (out === 2) {
      b.alive = false;
      b.end = 2;
      b.endT = s.t;
      ev(s, 'plop', b.x, b.y, b.k === 1 ? '풍덩! 기름통 안전' : '풍덩!');
      continue;
    }
    if (out === 1) {
      if (b.k === 0) burst(s, hit.i, b);
      else boom(s, b);
      continue;
    }
    if (out === 3 && sp > 0.025) ev(s, 'bonk', b.x, b.y, '쿵!');
    if (b.k === 1) {
      // 기름통: 둘레 9칸에 불이 있으면 데워진다
      const c = clamp(Math.floor(b.x), 0, COLS - 1), r = clamp(Math.floor(b.y), 0, ROWS - 1);
      let near = false;
      for (let dr = -1; dr <= 1 && !near; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const cc = c + dc, rr = r + dr;
          if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && s.cells[rr * COLS + cc].f > 0) near = true;
        }
      b.heat = near ? b.heat + 1 / OIL_T : Math.max(0, b.heat - 1 / 400);
      if (b.heat > 0.3) see(s, 'oilhot', '기름통이 달아올라요! 밀어 내거나 둘레 불을 꺼요');
      if (b.heat >= 1) boom(s, b);
    }
  }
}

function fireTick(s: FireState) {
  const d = STAGES[s.stage], cells = s.cells;
  for (let i = 0; i < NC; i++) {
    const a = cells[i];
    if (a.f <= 0) continue;
    const c = i % COLS, r = (i / COLS) | 0;
    const src = SP * d.spd * Math.min(1.5, a.f) * (a.k === HAY ? 1.7 : a.k === BARN ? 0.7 : 1) * (a.oil ? 1.5 : 1);
    for (const [dc, dr] of N8) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      const b = cells[rr * COLS + cc];
      if (!burnable(b.k) || b.burnt || b.f > 0) continue;
      let wg = dc && dr ? 0.5 : 1;
      if (s.wind) wg *= Math.max(0.2, 1 + 1.3 * s.wind * dc);
      const dh = src * wg;
      if (b.wet > 0) b.wet = Math.max(0, b.wet - dh * 1.2);
      else b.heat += dh;
    }
    // 바람 불똥: 바람 아래로 두 칸
    if (s.wind && a.f >= 0.6 && ++a.spark >= SPARK_T) {
      a.spark = 0;
      spawnEmber(s, c + 2 * Math.sign(s.wind), r + Math.floor(s.rng() * 3) - 1, c + 0.5, r + 0.5, false, SPARK_WARN);
      see(s, 'spark', '바람에 불똥이 날아가요 — 떨어질 자리를 미리 적셔요');
    }
    // 큰 불 불똥: 둘레 두 칸 안 아무 데나
    if (a.k === BARN && a.f >= 1 && ++a.spark >= BARN_SPARK_T) {
      a.spark = 0;
      const opts: number[] = [];
      for (let j = 0; j < NC; j++) {
        const q = cells[j], dc = (j % COLS) - c, dr = ((j / COLS) | 0) - r;
        if (j !== i && Math.max(Math.abs(dc), Math.abs(dr)) <= 2 && burnable(q.k) && !q.burnt && q.f <= 0) opts.push(j);
      }
      if (opts.length) {
        const j = opts[Math.floor(s.rng() * opts.length)];
        spawnEmber(s, j % COLS, (j / COLS) | 0, c + 0.5, r + 0.5, false, SPARK_WARN);
      }
    }
  }
  for (let i = 0; i < NC; i++) {
    const a = cells[i];
    if (a.f > 0) {
      a.f = Math.min(FMAX[a.k], a.f + GROW * (a.k === BARN ? 2 : 1));
      a.fuel -= a.f;
      if (a.fuel <= 0) burnDown(s, i);
    } else if (burnable(a.k) && !a.burnt) {
      if (a.heat >= 1) ignite(s, i, IGN_F, 'spread');
      else a.heat *= 0.999;
    }
    if (a.wet > 0) a.wet = Math.max(0, a.wet - WET_DRY);
  }
}

function pickImpTarget(s: FireState, im: Imp) {
  const opts: { j: number; d: number }[] = [];
  for (let j = 0; j < NC; j++) {
    const q = s.cells[j];
    if (!burnable(q.k) || q.burnt || q.f > 0 || j === im.tc) continue;
    opts.push({ j, d: Math.hypot((j % COLS) + 0.5 - im.x, ((j / COLS) | 0) + 0.5 - im.y) });
  }
  if (!opts.length) return -1;
  opts.sort((a, b) => a.d - b.d || a.j - b.j);
  return opts[Math.floor(s.rng() * Math.min(3, opts.length))].j;
}

function impTick(s: FireState) {
  const im = s.imp;
  if (!im || im.st !== 0) return;
  if (s.stageT >= im.leaveAt && !im.leaving) (im.leaving = true), ev(s, 'impgone', im.x, im.y, '메롱~ 다음에 또!');
  if (im.leaving) {
    im.y -= 0.035;
    im.x += 0.01 * im.face;
    if (im.y < -2) (im.st = 2), (im.endT = s.t);
    return;
  }
  if (im.stun > 0) {
    im.stun--;
    im.x = clamp(im.x + im.vx, 0.2, COLS - 0.2);
    im.y = clamp(im.y + im.vy, 0.2, ROWS - 0.2);
    im.vx *= 0.85;
    im.vy *= 0.85;
    im.stand = Math.max(0, im.stand - 2);
    return;
  }
  im.vx = im.vy = 0;
  if (im.tc < 0 || s.cells[im.tc].burnt || s.cells[im.tc].f > 0) im.tc = pickImpTarget(s, im);
  if (im.tc < 0) return void (im.leaving = true);
  const tx = (im.tc % COLS) + 0.5, ty = ((im.tc / COLS) | 0) + 0.5, dx = tx - im.x, dy = ty - im.y, dd = Math.hypot(dx, dy);
  if (dd > 0.08) {
    const st = Math.min(dd, IMP_V);
    im.x += (dx / dd) * st;
    im.y += (dy / dd) * st;
    if (Math.abs(dx) > 0.02) im.face = dx > 0 ? 1 : -1;
    im.stand = 0;
  } else if (++im.stand >= IMP_STAND) {
    const a = s.cells[im.tc];
    if (a.wet > 0.12) (a.wet = Math.max(0, a.wet - 0.25)), ev(s, 'impfizz', im.x, im.y, '어라? 젖었잖아!');
    else ignite(s, im.tc, 0.5, 'imp');
    im.stand = 0;
    im.tc = pickImpTarget(s, im);
  }
}

function petTick(s: FireState) {
  for (const p of s.pets) {
    if (p.st !== 0) continue;
    const i = p.r * COLS + p.c, own = s.cells[i].f > 0;
    let near = own;
    for (const [dc, dr] of N8) {
      const cc = p.c + dc, rr = p.r + dr;
      if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && s.cells[rr * COLS + cc].f > 0) near = true;
    }
    if (near) {
      p.smoke += (own ? 2 : 1) / PET_T;
      if (p.smoke >= 1) (p.st = 2), (p.t = s.t), ev(s, 'flee', p.c + 0.5, p.r + 0.5, '콜록콜록… 혼자 도망!');
    } else if (s.stageT > 40) {
      p.st = 1;
      p.t = s.t;
      s.petsSaved++;
      s.freeze = Math.max(s.freeze, 2);
      ev(s, 'rescue', p.c + 0.5, p.r + 0.5, '구했다!');
      see(s, 'rescue', '구했다! 동물이 소방차로 달려와요');
    }
  }
}

function newStage(s: FireState) {
  const d = STAGES[s.stage], flip = s.flips[s.stage];
  const fc = (c: number) => (flip ? COLS - 1 - c : c), fxp = (x: number) => (flip ? COLS - x : x);
  s.cells = [];
  s.road = -1;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const k = KCH[d.map[r][fc(c)]] ?? GRASS;
      if (k === ROAD) s.road = c;
      s.cells.push({ k, fuel: FUEL[k], max: FUEL[k], f: 0, heat: 0, wet: 0, oil: false, burnt: false, hitT: -99, spark: ((r * COLS + c) * 53) % SPARK_T, outT: -999, splat: 0, v: hsh(r * 13 + c * 7 + s.stage * 31) });
    }
  for (const [c, r, f] of d.fires) s.cells[r * COLS + fc(c)].f = f;
  s.sched = (d.embers ?? []).map(([tick, c, r]) => ({ tick, kind: 0, c: fc(c), r }));
  if (d.imp) s.sched.push({ tick: d.imp[0], kind: 2, c: 0, r: 0 });
  s.sched.sort((a, b) => a.tick - b.tick);
  s.si = 0;
  s.things = (d.things ?? []).map(([x, y, k], id) => ({ id, k, x: fxp(x), y, vx: 0, vy: 0, alive: true, heat: 0, spin: 0, hitT: -99, endT: 0, end: 0 }));
  s.pets = (d.pets ?? []).map(([c, r, kind]) => ({ c: fc(c), r, kind, st: 0, smoke: 0, t: 0 }));
  s.wind = (d.wind ?? 0) * (flip ? -1 : 1);
  s.drops = [];
  s.embers = [];
  s.landed = [];
  s.imp = null;
  s.tank = TANK;
  s.relT = 99;
  s.sprayT = 0;
  s.stageT = 0;
  s.phase = 'play';
  s.pt = 0;
  s.houses = s.cells.filter((a) => a.k === HOUSE).length;
  s.trees = s.cells.filter((a) => a.k === TREE).length;
  s.limit = Math.min(2, s.houses);
  s.lost = 0;
  s.prewet = 0;
  s.barrelOut = 0;
  s.crossed = false;
  s.booms = 0;
  s.impCaught = false;
  s.dry = false;
  s.petsSaved = 0;
  s.combo = 0;
  s.starOk = [false, false, false];
  if (d.key) s.seen.add(d.key);
}

function star3(s: FireState): boolean {
  switch (STAGES[s.stage].key) {
    case 'first': return s.cells.filter((a) => a.k === TREE && !a.burnt).length * 2 > s.trees;
    case 'ember': return s.prewet >= 2;
    case 'barrel': return s.barrelOut >= 1;
    case 'wind': return !s.crossed;
    case 'pet': return s.pets.every((p) => p.st === 1);
    case 'oil': return s.booms === 0;
    case 'imp': return s.impCaught;
    case 'big': return !s.dry;
  }
  return false;
}
/** 별 셋째 줄이 판 도중에 이미 틀렸나 (아래 띠에 ✗) */
function star3Bad(s: FireState): boolean {
  switch (STAGES[s.stage].key) {
    case 'first': return s.cells.filter((a) => a.k === TREE && a.burnt).length * 2 >= s.trees;
    case 'wind': return s.crossed;
    case 'pet': return s.pets.some((p) => p.st === 2);
    case 'oil': return s.booms > 0;
    case 'imp': return !!s.imp && s.imp.st === 2;
    case 'big': return s.dry;
  }
  return false;
}

function endStage(s: FireState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  if (ok) {
    s.starOk = [true, s.lost === 0, star3(s)];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.stageStars[s.stage] = Math.max(s.stageStars[s.stage] ?? 0, s.got);
    s.pts += s.got * STAR_PTS + (s.houses - s.lost) * HOUSE_PTS + s.petsSaved * PET_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.freeze = Math.max(s.freeze, 6);
    s.slow = Math.max(s.slow, 30);
    ev(s, 'clear', 3, 2.5, s.won ? '마을을 다 지켰다!' : '불 다 껐다!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 3, 2.5, why);
  }
}

export const firecat: GameDef<FireState> = {
  id: 'firecat',
  name: '물대포 소방 고양이',
  genes: ['hosespray', 'pointer', 'chain'],
  twist: '물줄기가 손가락을 따라 포물선으로 휘어 떨어지고(바람에 휜다), 센 물살이 물통을 굴려 불붙은 곳에 부딪히면 펑 — 아홉 칸이 한꺼번에 꺼지는 연쇄, 미리 적신 칸엔 불똥이 칙 꺼진다',
  rules: [
    '꾹 누르는 동안 손가락 쪽으로 물대포! 불은 옆으로 번지고, 미리 적신 곳엔 불이 안 붙어요.',
    '물통을 쏘면 굴러가 불에 펑 — 둘레가 한꺼번에 꺼져요. 집 두 채가 무너지면 그 판 다시.',
  ],
  controls: 'touch',
  hint: '꾹 누르는 동안 물대포(손가락을 따라가요) / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '저녁 마을 디오라마 — 고양이 소방관의 물대포',
    mood: '노을이 지는 보랏빛 저녁 마을, 축제 불꽃놀이 불똥이 지붕에 떨어진다. 빨간 소방차 위 노란 헬멧 고양이가 물대포를 쏘면 물방울이 반짝이며 포물선을 그리고, 불이 꺼진 자리에선 하얀 김과 작은 무지개가 피어오른다. 불빛이 둘레를 붉게 물들인다.',
    palette: { bg: '#231942', ink: '#fff6e8', muted: '#c9b8e6', accent: '#5cc8ff', hot: '#ff6a3d', soft: '#ffd59a' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const flips = STAGES.map(() => rng() < 0.5);
    const s = {
      rng, seed, flips, t: 0, stage: 0, phase: 'play', pt: 0, stageT: 0, freeze: 0, slow: 0,
      cells: [], things: [], drops: [], embers: [], landed: [], imp: null, pets: [], sched: [], si: 0, wind: 0, road: -1,
      tank: TANK, relT: 99, sprayT: 0, down: false, aim: null,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '',
      houses: 0, trees: 0, lost: 0, limit: 2, prewet: 0, barrelOut: 0, crossed: false, booms: 0, impCaught: false, dry: false, petsSaved: 0,
      outs: 0, combo: 0, lastOut: -999, firstPressT: -1, firstOutT: -1, presses: 0,
      seen: new Set<string>(), newsQ: [], news: null, events: [], dead: false, won: false, again: false, tries: 0, tid: 0, stageStars: [],
    } as FireState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null;
    if (p && s.phase === 'play') {
      if (!s.down) {
        s.presses++;
        if (s.firstPressT < 0) s.firstPressT = s.t;
      }
      s.down = true;
      s.aim = toPlane(p.x, p.y * A);
    } else s.down = false;
    if (s.freeze > 0) return void s.freeze--;
    // 큰 순간은 잠깐 느리게 (두 틱에 한 번만 흐른다)
    if (s.slow > 0 && s.slow-- % 2 === 1) return;
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    const play = s.phase === 'play';
    if (play) s.stageT++;
    // 물대포: 누르는 동안 한 틱에 물방울 하나
    if (play && s.down && s.aim) {
      s.relT = 0;
      if (s.tank >= 1) {
        s.tank -= 1;
        emit(s);
        s.sprayT++;
        see(s, 'spray', '꾹 누르는 동안 물대포 — 떼면 물탱크가 다시 차요');
        if (s.tank < 1) (s.dry = true), ev(s, 'dry', NZ.x, NZ.y - 0.8, '물이 바닥!'), see(s, 'dry', '물이 바닥나면 손을 떼요 — 떼면 다시 차요');
      }
    } else {
      s.sprayT = 0;
      if (++s.relT > REFILL_WAIT) s.tank = Math.min(TANK, s.tank + REFILL);
    }
    for (let k = s.drops.length - 1; k >= 0; k--) {
      const dp = s.drops[k];
      if (s.t >= dp.t0 + dp.T) s.drops.splice(k, 1), land(s, dp);
    }
    if (play)
      while (s.si < s.sched.length && s.sched[s.si].tick <= s.stageT) {
        const e = s.sched[s.si++];
        if (e.kind === 0) spawnEmber(s, e.c, e.r, e.c + 0.5 + (s.rng() - 0.5) * 2, -2.6, true, EMBER_WARN);
        else if (e.kind === 2) {
          const d = STAGES[s.stage], side = s.rng() < 0.5 ? -1 : 1;
          s.imp = { x: side < 0 ? 0.3 : COLS - 0.3, y: 0.4, vx: 0, vy: 0, tc: -1, stand: 0, hp: IMP_HP, stun: 0, st: 0, leaving: false, face: -side, hitT: -99, t0: s.t, leaveAt: d.imp![1], endT: 0 };
          ev(s, 'impin', s.imp.x, s.imp.y, '히히히! 불장난이다!');
          see(s, 'impseen', '불꽃 도깨비 — 물을 맞히면 쪼그라들어요');
        }
      }
    for (let k = s.embers.length - 1; k >= 0; k--) if (s.t >= s.embers[k].land) emberLand(s, s.embers.splice(k, 1)[0]);
    fireTick(s);
    thingsTick(s);
    impTick(s);
    petTick(s);
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.lost >= s.limit) return endStage(s, false, `집이 ${s.lost}채 무너졌어요`);
    const fire = s.cells.some((a) => a.f > 0);
    const busy = s.si < s.sched.length || s.embers.length > 0 || fire || (s.imp !== null && s.imp.st === 0) || s.pets.some((q) => q.st === 0);
    if ((!busy && s.stageT > 90) || s.stageT > MAX_STAGE_T) endStage(s, true, '');
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 평면 (x, y)에 물이 떨어지게 겨눈 입력 (바람에 밀리는 만큼 바람 위로) */
function aimAt(s: FireState, x: number, y: number): Input {
  let ax = x;
  if (s.wind) ax = x - s.wind * DRIFT * flightT(Math.hypot(x - NZ.x, y - NZ.y));
  const yy = clamp(y, -0.5, ROWS - 0.05), xx = clamp(ax, -0.35, COLS + 0.35);
  return { tap: false, dir: 0, pointer: { x: clamp(PX(xx, yy), 0, 1), y: clamp(PY(yy) / A, 0, 1) } };
}
const ccx = (i: number) => (i % COLS) + 0.5, ccy = (i: number) => ((i / COLS) | 0) + 0.5;

/** 통을 (x, y)에 물을 맞혀 밀면 어디로 굴러가나 (8방울 맞는다고 보고 굴린다) */
function predictRoll(s: FireState, b: Thing, lx: number, ly: number) {
  const q = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
  const sdx = lx - NZ.x, sdy = ly - NZ.y, sl = Math.hypot(sdx, sdy) || 1;
  const dx = sdx / sl + (b.x - lx) * 2.2, dy = sdy / sl + (b.y - ly) * 2.2, l = Math.hypot(dx, dy) || 1;
  q.vx += (dx / l) * PUSH * 8;
  q.vy += (dy / l) * PUSH * 8;
  const sp = Math.hypot(q.vx, q.vy);
  if (sp > BVMAX) (q.vx *= BVMAX / sp), (q.vy *= BVMAX / sp);
  const hit = { i: -1 };
  for (let k = 0; k < 220; k++) {
    const o = rollTick(s.cells, q, hit);
    if (o === 1 || o === 2) return { out: o, i: hit.i, x: q.x, y: q.y };
    if (q.vx === 0 && q.vy === 0) break;
  }
  return { out: 0, i: -1, x: q.x, y: q.y };
}
/** 물통이 i 칸에서 터지면 얼마나 좋은가 */
function burstValue(s: FireState, i: number) {
  const c = i % COLS, r = (i / COLS) | 0;
  let v = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      const a = s.cells[rr * COLS + cc];
      if (a.f > 0) v += (a.oil ? 3 : Math.min(a.f, BURST_P)) * (a.k === HOUSE ? 2 : 1);
    }
  return v;
}
function minFireDist(s: FireState, x: number, y: number) {
  let best = 9;
  for (let j = 0; j < NC; j++) if (s.cells[j].f > 0) best = Math.min(best, Math.max(Math.abs(ccx(j) - x), Math.abs(ccy(j) - y)));
  return best;
}

/** 소방 반장: 집·동물·기름통 쪽 위협이 큰 불부터, 불똥 자리는 미리 적시고, 물통은 굴려 쓰고, 물은 바닥나기 전에 쉰다 */
function plan(s: FireState, prev: { x: number; y: number } | null): { x: number; y: number; v: number } | null {
  const d = STAGES[s.stage], cells = s.cells;
  let best: { x: number; y: number; v: number } | null = null;
  const consider = (x: number, y: number, v: number) => {
    if (prev && Math.hypot(prev.x - x, prev.y - y) < 0.3) v *= 1.15; // 하던 일을 잇는 편이 물이 덜 샌다
    if (!best || v > best.v) best = { x, y, v };
  };
  for (let i = 0; i < NC; i++) {
    const a = cells[i];
    if (a.f <= 0 || a.oil) continue;
    const c = i % COLS, r = (i / COLS) | 0;
    let v = a.k === HOUSE ? 70 + 90 * (1 - a.fuel / a.max) : a.k === BARN ? 26 + 6 * a.f : 10 + 6 * a.f;
    for (const [dc, dr] of N8) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      const j = rr * COLS + cc, b = cells[j];
      if (!burnable(b.k) || b.burnt || b.f > 0) continue;
      let wg = dc && dr ? 0.5 : 1;
      if (s.wind) wg *= Math.max(0.2, 1 + 1.3 * s.wind * dc);
      const dry = b.wet > 0.3 ? 0.35 : 1;
      v += (b.k === HOUSE ? 40 : b.k === BARN ? 8 : 5) * wg * dry * (0.5 + b.heat);
    }
    for (const p of s.pets) if (p.st === 0 && Math.abs(p.c - c) <= 1 && Math.abs(p.r - r) <= 1) v += 45 * (0.6 + p.smoke);
    for (const b of s.things) if (b.alive && b.k === 1 && Math.max(Math.abs(b.x - ccx(i)), Math.abs(b.y - ccy(i))) < 1.6) v += 40 + 60 * b.heat;
    if (s.wind && a.f >= 0.45) v += 22 + (farSide(s, i + 2 * Math.sign(s.wind)) && c + 2 * Math.sign(s.wind) >= 0 && c + 2 * Math.sign(s.wind) < COLS ? 35 : 0);
    if (a.k === BARN) v += 20;
    v *= 30 / (30 + a.f / WP);
    consider(ccx(i), ccy(i), v);
  }
  // 불똥 떨어질 자리 미리 적시기
  for (const e of s.embers) {
    const i = e.r * COLS + e.c, a = cells[i];
    if (!burnable(a.k) || a.burnt || a.f > 0) continue;
    const left = e.land - s.t, T = flightT(Math.hypot(ccx(i) - NZ.x, ccy(i) - NZ.y));
    if (left < T + 2 || a.wet - left * WET_DRY > 0.32) continue;
    let v = a.k === HOUSE ? 85 : 32;
    if (d.key === 'ember' && s.prewet < 2) v += 40;
    if (farSide(s, i)) v += 60;
    if (s.pets.some((p) => p.st === 0 && p.r * COLS + p.c === i)) v += 40;
    for (const b of s.things) if (b.alive && b.k === 1 && Math.max(Math.abs(b.x - ccx(i)), Math.abs(b.y - ccy(i))) < 1.6) v += 50;
    consider(ccx(i), ccy(i), v);
  }
  // 데워지는 칸 미리 적시기
  for (let i = 0; i < NC; i++) {
    const a = cells[i];
    if (!burnable(a.k) || a.burnt || a.f > 0 || a.heat < 0.4 || a.wet > 0.25) continue;
    let v = (a.k === HOUSE ? 55 : 6) * a.heat;
    if (farSide(s, i)) v += 30;
    if (s.pets.some((p) => p.st === 0 && p.r * COLS + p.c === i)) v += 30;
    consider(ccx(i), ccy(i), v);
  }
  // 물통 굴리기 · 기름통 밀어내기
  for (const b of s.things) {
    if (!b.alive || Math.hypot(b.vx, b.vy) > 0.03) continue;
    let bp: { x: number; y: number; v: number } | null = null;
    const md0 = minFireDist(s, b.x, b.y);
    if (b.k === 1 && md0 > 1.6 && !s.embers.some((e) => Math.max(Math.abs(e.c + 0.5 - b.x), Math.abs(e.r + 0.5 - b.y)) < 1.6)) continue;
    for (let k = 0; k < 12; k++) {
      const an = (k / 12) * Math.PI * 2, lx = b.x + Math.cos(an) * 0.3, ly = b.y + Math.sin(an) * 0.3;
      const pr = predictRoll(s, b, lx, ly);
      let v = -1;
      if (b.k === 0) {
        if (pr.out === 1) {
          const bv = burstValue(s, pr.i);
          if (bv >= 1.1) v = 22 * bv;
        }
      } else if (pr.out === 2) v = 110 + 60 * b.heat;
      else if (pr.out === 0) {
        const md = minFireDist(s, pr.x, pr.y);
        if (md >= 2 && md > md0 + 0.5) v = 60 + 40 * b.heat + 10 * Math.min(3, md);
      }
      if (v > 0 && (!bp || v > bp.v)) bp = { x: lx, y: ly, v };
    }
    if (bp) consider(bp.x, bp.y, bp.v);
  }
  // 도깨비: 가는 쪽을 앞질러 맞힌다
  const im = s.imp;
  if (im && im.st === 0 && !im.leaving) {
    let px = im.x, py = im.y;
    if (im.tc >= 0 && im.stun <= 0) {
      const T = flightT(Math.hypot(im.x - NZ.x, im.y - NZ.y)), tx = ccx(im.tc), ty = ccy(im.tc), dd = Math.hypot(tx - im.x, ty - im.y);
      const go = Math.min(dd, IMP_V * T);
      if (dd > 0) (px += ((tx - im.x) / dd) * go), (py += ((ty - im.y) / dd) * go);
    }
    consider(px, py, 75 + (d.key === 'imp' ? 30 : 0));
  }
  return best;
}

const smartMem = new WeakMap<object, { tgt: { x: number; y: number; v: number } | null; until: number; st: number; rest: boolean }>();
export const firecatSmart: Bot<FireState> = {
  name: '소방 반장',
  act(s) {
    if (s.phase !== 'play') return NO;
    let m = smartMem.get(s);
    if (!m) smartMem.set(s, (m = { tgt: null, until: -1, st: -1, rest: false }));
    if (s.t >= m.until || m.st !== s.stage * 10 + s.hearts || (s.imp && s.imp.st === 0)) {
      m.tgt = plan(s, m.tgt);
      m.until = s.t + 6;
      m.st = s.stage * 10 + s.hearts;
    }
    const tg = m.tgt;
    if (!tg || tg.v < 6) return NO;
    // 물 관리: 바닥나기 전에 손을 떼고, 넉넉히 찰 때까지 쉰다 (조금씩 톡톡 끊어 쏘지 않는다)
    if (s.tank < 5) m.rest = true;
    if (m.rest && s.tank >= 45) m.rest = false;
    if (m.rest) return NO;
    if (!s.down && s.tank < 28 && tg.v < 70) return NO;
    return aimAt(s, tg.x, tg.y);
  },
};

/** 버릇 봇 1: 늘 가장 큰 불에 뿌린다 (물이 바닥나면 다 찰 때까지 쉰다) */
const habitMem = new WeakMap<object, { wait: boolean }>();
function habitAct(s: FireState, pick: (s: FireState) => number): Input {
  if (s.phase !== 'play') return NO;
  let m = habitMem.get(s);
  if (!m) habitMem.set(s, (m = { wait: false }));
  if (s.tank < 1) m.wait = true;
  if (m.wait && s.tank >= TANK * 0.6) m.wait = false;
  if (m.wait) return NO;
  const i = pick(s);
  return i < 0 ? NO : aimAt(s, ccx(i), ccy(i));
}
export const firecatHabit: Bot<FireState> = {
  name: '늘 가장 큰 불에',
  act: (s) =>
    habitAct(s, (st) => {
      let bi = -1;
      for (let i = 0; i < NC; i++) if (st.cells[i].f > 0 && (bi < 0 || st.cells[i].f > st.cells[bi].f + 1e-9)) bi = i;
      return bi;
    }),
};
/** 버릇 봇 2 (판 설계에 안 쓴 독립 버릇): 늘 소방차에서 가장 가까운 불부터 */
export const firecatNearest: Bot<FireState> = {
  name: '늘 가까운 불부터',
  act: (s) =>
    habitAct(s, (st) => {
      let bi = -1, bd = 99;
      for (let i = 0; i < NC; i++) {
        if (st.cells[i].f <= 0) continue;
        const dd = Math.hypot(ccx(i) - NZ.x, ccy(i) - NZ.y);
        if (dd < bd - 1e-9) (bd = dd), (bi = i);
      }
      return bi;
    }),
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 못하는 봇: 아무 데나, 아무 때나 꾹 (잠깐 쏘다 말다) */
export const firecatRandom: Bot<FireState> = {
  name: '아무 데나 쏴아',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 20 + Math.floor(rng() * 90);
    m.x = 0.05 + rng() * 0.9;
    m.y = (GY0 + rng() * (PY(ROWS) - GY0)) / A;
    m.hold = 15 + Math.floor(rng() * 70);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
function hsh(k: number) {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function mix(a: string, b: string, u: number) {
  const p = (c: string, k: number) => parseInt(c.slice(1 + k * 2, 3 + k * 2), 16);
  const q = [0, 1, 2].map((k) => Math.round(p(a, k) + (p(b, k) - p(a, k)) * clamp(u, 0, 1)));
  return `rgb(${q[0]},${q[1]},${q[2]})`;
}
function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.15, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.75, y - r * 1.15, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function dropPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.4);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 0.2, x + r, y + r, x, y + r);
  ctx.bezierCurveTo(x - r, y + r, x - r * 0.9, y - r * 0.2, x, y - r * 1.4);
  ctx.closePath();
}
function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}
function circ(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string | CanvasGradient) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
  ctx.fill();
}

/** 불꽃: 출렁이는 혀 여러 개 (바깥 빨강 → 주황 → 속 노랑·흰빛) */
function drawFlames(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, f: number, t: number, seed: number, wind: number, oil = false) {
  const lvl = Math.min(1.4, 0.35 + f * 0.65), n = f > 1.5 ? 5 : 4;
  const glow = ctx.createRadialGradient(x, y - size * 0.3, 0, x, y - size * 0.3, size * 1.3);
  glow.addColorStop(0, oil ? 'rgba(255,90,40,.5)' : 'rgba(255,170,60,.45)');
  glow.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.3, size * 1.3, 0, Math.PI * 2);
  ctx.fill();
  const layers: [string, string, number][] = oil
    ? [['#5a1a10', '#ff4a1a', 1], ['#c8321a', '#ff8a2a', 0.72], ['#ff7a2a', '#ffd040', 0.45]]
    : [['#d8321e', '#ff7a2a', 1], ['#ff6a1e', '#ffc040', 0.72], ['#ffb43a', '#fff4c0', 0.45]];
  for (const [c0, c1, k] of layers) {
    for (let j = 0; j < n; j++) {
      const ph = seed * 7 + j * 1.9;
      const off = (j - (n - 1) / 2) * size * 0.26 * k;
      const fh = size * lvl * k * (0.85 + 0.3 * Math.sin(t * 0.23 + ph) + (j === Math.floor(n / 2) ? 0.35 : 0));
      const fw = size * 0.24 * k * (1 + 0.15 * Math.sin(t * 0.17 + ph * 2));
      const sway = Math.sin(t * 0.15 + ph) * size * 0.12 + wind * size * 0.35;
      const bx = x + off, g = ctx.createLinearGradient(0, y, 0, y - fh);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - fw, y);
      ctx.bezierCurveTo(bx - fw * 1.1, y - fh * 0.45, bx + sway * 0.5 - fw * 0.3, y - fh * 0.7, bx + sway, y - fh);
      ctx.bezierCurveTo(bx + sway * 0.5 + fw * 0.4, y - fh * 0.65, bx + fw * 1.1, y - fh * 0.4, bx + fw, y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** 나무 (둥근 잎 덩어리 · 소나무). ch = 탄 정도 0~1 */
function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, v: number, ch: number, down: boolean, t: number, sway: number) {
  ell(ctx, x + u * 0.08, y, u * 0.34, u * 0.11, 'rgba(20,8,30,.32)');
  if (down) {
    ctx.strokeStyle = '#2a2020';
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 0.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + u * 0.02, y - u * 0.5);
    ctx.moveTo(x + u * 0.01, y - u * 0.32);
    ctx.lineTo(x - u * 0.16, y - u * 0.5);
    ctx.moveTo(x + u * 0.02, y - u * 0.42);
    ctx.lineTo(x + u * 0.17, y - u * 0.58);
    ctx.stroke();
    ell(ctx, x, y - u * 0.02, u * 0.24, u * 0.07, '#3a3436');
    for (let k = 0; k < 3; k++) circ(ctx, x + (k - 1) * u * 0.1, y - u * 0.03, u * 0.018 * (1 + Math.sin(t * 0.2 + k)), '#ff7a3a');
    return;
  }
  const H = u * (0.95 + v * 0.18), sw = sway * u * 0.06;
  const tg = ctx.createLinearGradient(x - u * 0.06, 0, x + u * 0.06, 0);
  tg.addColorStop(0, '#7a5236');
  tg.addColorStop(1, '#4a2f20');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.07, y);
  ctx.lineTo(x - u * 0.045, y - H * 0.5);
  ctx.lineTo(x + u * 0.045, y - H * 0.5);
  ctx.lineTo(x + u * 0.07, y);
  ctx.closePath();
  ctx.fill();
  const dark = mix('#24563f', '#2a201c', ch), midc = mix('#357a4e', '#3b2a22', ch), lite = mix('#68b062', '#5a3a28', ch), rim = mix('#ffb070', '#ff7a3a', ch);
  if (v < 0.33) {
    // 소나무
    for (let k = 0; k < 3; k++) {
      const ty = y - H * (0.3 + k * 0.24), wdt = u * (0.36 - k * 0.08), hh = H * 0.36;
      const g = ctx.createLinearGradient(x - wdt, 0, x + wdt, 0);
      g.addColorStop(0, midc);
      g.addColorStop(0.7, dark);
      g.addColorStop(1, dark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - wdt, ty);
      ctx.quadraticCurveTo(x + sw * (k + 1) * 0.5, ty - hh * 0.2, x + sw * (k + 1), ty - hh);
      ctx.quadraticCurveTo(x + sw * (k + 1) * 0.5, ty - hh * 0.2, x + wdt, ty);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rim;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, u * 0.025);
      ctx.beginPath();
      ctx.moveTo(x + sw * (k + 1), ty - hh);
      ctx.lineTo(x - wdt * 0.9, ty - u * 0.01);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    return;
  }
  const blobs: [number, number, number, string][] = [
    [-0.15, 0.6, 0.22, dark],
    [0.15, 0.58, 0.21, dark],
    [0.0, 0.66, 0.25, midc],
    [-0.08, 0.86, 0.21, midc],
    [0.1, 0.84, 0.18, midc],
  ];
  for (const [ox, oy, rr, col] of blobs) circ(ctx, x + ox * u + sw * oy, y - H * oy, u * rr, col);
  // 잎 하이라이트 · 노을 테두리 빛
  ctx.globalAlpha = 0.8;
  circ(ctx, x - u * 0.1 + sw, y - H * 0.92, u * 0.1, lite);
  circ(ctx, x + u * 0.04 + sw * 0.8, y - H * 0.76, u * 0.08, lite);
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1, u * 0.03);
  ctx.beginPath();
  ctx.arc(x + sw, y - H * 0.72, u * 0.3, -0.9, 0.4);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

const WALL = ['#f3e1c0', '#ead2b8', '#eee7d5', '#f2d3c2'];
const ROOF = ['#c8513f', '#4e6fae', '#5f8b4e', '#a9663a'];
/** 집 (앞에서 내려다본 박공 지붕). ch = 탄 정도, fire = 불 세기 */
function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, v: number, ch: number, down: boolean, t: number, fire: number, kind: number) {
  const big = kind === BARN, shed = kind === SHED;
  const bw = u * (big ? 0.95 : shed ? 0.66 : 0.78), bh = u * (big ? 0.52 : shed ? 0.36 : 0.45), rh = u * (big ? 0.36 : 0.32);
  const dx = u * 0.12, dy = -u * 0.2, e = u * 0.05;
  ell(ctx, x + u * 0.1, y - u * 0.02, bw * 0.66, u * 0.13, 'rgba(20,8,30,.34)');
  if (down) {
    ell(ctx, x, y - u * 0.03, bw * 0.55, u * 0.1, '#353036');
    ctx.strokeStyle = '#211a1c';
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 0.06;
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.4, y - u * 0.02);
    ctx.lineTo(x - bw * 0.38, y - bh * 0.9);
    ctx.moveTo(x + bw * 0.35, y - u * 0.02);
    ctx.lineTo(x + bw * 0.3, y - bh * 0.6);
    ctx.moveTo(x - bw * 0.45, y - bh * 0.7);
    ctx.lineTo(x + bw * 0.4, y - bh * 0.15);
    ctx.stroke();
    for (let k = 0; k < 4; k++) circ(ctx, x + (k - 1.5) * u * 0.12, y - u * 0.04, u * 0.02 * (1 + Math.sin(t * 0.18 + k * 2)), '#ff8a3a');
    return;
  }
  const wall = WALL[Math.floor(v * 4)], roof = big ? '#b8372e' : shed ? '#8a5a3a' : ROOF[Math.floor((v * 7) % 4)];
  const W0 = big ? '#c94a3a' : shed ? '#b07a4e' : wall;
  const wallC = mix(W0.length === 7 ? W0 : '#f3e1c0', '#2a2224', ch * 0.85), sideC = mix(W0.length === 7 ? W0 : '#f3e1c0', '#1a1418', 0.35 + ch * 0.6), roofC = mix(roof, '#241c1c', ch * 0.8);
  // 옆벽 (오른쪽, 뒤로)
  ctx.fillStyle = sideC;
  ctx.beginPath();
  ctx.moveTo(x + bw / 2, y);
  ctx.lineTo(x + bw / 2 + dx, y + dy);
  ctx.lineTo(x + bw / 2 + dx, y + dy - bh);
  ctx.lineTo(x + bw / 2, y - bh);
  ctx.closePath();
  ctx.fill();
  // 지붕 두 면 (용마루가 뒤로)
  const ridge = { x, y: y - bh - rh };
  ctx.fillStyle = mix(roof, '#1a1214', 0.35 + ch * 0.5);
  ctx.beginPath();
  ctx.moveTo(ridge.x, ridge.y);
  ctx.lineTo(x + bw / 2 + e, y - bh + e * 0.5);
  ctx.lineTo(x + bw / 2 + e + dx, y - bh + e * 0.5 + dy);
  ctx.lineTo(ridge.x + dx, ridge.y + dy);
  ctx.closePath();
  ctx.fill();
  const rg = ctx.createLinearGradient(x - bw / 2, ridge.y, x, y - bh);
  rg.addColorStop(0, mix(roof, '#ffffff', 0.18 * (1 - ch)));
  rg.addColorStop(1, roofC);
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(x - bw / 2 - e, y - bh + e * 0.5);
  ctx.lineTo(ridge.x, ridge.y);
  ctx.lineTo(ridge.x + dx, ridge.y + dy);
  ctx.lineTo(x - bw / 2 - e + dx, y - bh + e * 0.5 + dy);
  ctx.closePath();
  ctx.fill();
  // 기와 줄
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    const q = k / 4;
    ctx.beginPath();
    ctx.moveTo(x - bw / 2 - e + (ridge.x - x + bw / 2 + e) * q, y - bh + e * 0.5 + (ridge.y - y + bh - e * 0.5) * q);
    ctx.lineTo(x - bw / 2 - e + (ridge.x - x + bw / 2 + e) * q + dx, y - bh + e * 0.5 + (ridge.y - y + bh - e * 0.5) * q + dy);
    ctx.stroke();
  }
  // 굴뚝
  if (!shed) {
    const cx0 = x + bw * 0.22 + dx * 0.5, cy0 = y - bh - rh * 0.45 + dy * 0.5;
    ctx.fillStyle = mix('#9a5a46', '#221a1a', ch);
    ctx.fillRect(cx0 - u * 0.04, cy0 - u * 0.16, u * 0.08, u * 0.16);
    ctx.fillStyle = mix('#7a4434', '#1a1212', ch);
    ctx.fillRect(cx0 - u * 0.05, cy0 - u * 0.18, u * 0.1, u * 0.035);
  }
  // 앞면 (박공)
  const fg = ctx.createLinearGradient(0, y - bh - rh, 0, y);
  fg.addColorStop(0, mix(W0, '#ffffff', 0.12 * (1 - ch)));
  fg.addColorStop(1, wallC);
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, y);
  ctx.lineTo(x - bw / 2, y - bh);
  ctx.lineTo(ridge.x, ridge.y + u * 0.02);
  ctx.lineTo(x + bw / 2, y - bh);
  ctx.lineTo(x + bw / 2, y);
  ctx.closePath();
  ctx.fill();
  // 처마 선
  ctx.strokeStyle = mix(roof, '#000000', 0.35);
  ctx.lineWidth = Math.max(1.5, u * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - bw / 2 - e, y - bh + e * 0.5);
  ctx.lineTo(ridge.x, ridge.y);
  ctx.lineTo(x + bw / 2 + e, y - bh + e * 0.5);
  ctx.stroke();
  // 창 · 문 (불이 나면 창이 주황으로 일렁)
  const flick = fire > 0 ? 0.6 + 0.4 * Math.sin(t * 0.5 + v * 9) : 0;
  const win = fire > 0 ? `rgb(255,${Math.round(120 + 80 * flick)},40)` : ch > 0.6 ? '#3a2a24' : '#ffd77a';
  if (big) {
    ctx.fillStyle = mix('#f4efe6', '#3a3030', ch);
    const dw = bw * 0.34, dh = bh * 0.72;
    ctx.fillRect(x - dw / 2, y - dh, dw, dh);
    ctx.strokeStyle = mix('#8a2a22', '#201818', ch);
    ctx.lineWidth = Math.max(1.5, u * 0.03);
    ctx.strokeRect(x - dw / 2, y - dh, dw, dh);
    ctx.beginPath();
    ctx.moveTo(x - dw / 2, y - dh);
    ctx.lineTo(x + dw / 2, y);
    ctx.moveTo(x + dw / 2, y - dh);
    ctx.lineTo(x - dw / 2, y);
    ctx.stroke();
    ctx.fillStyle = win;
    ctx.fillRect(x - u * 0.06, y - bh - rh * 0.55, u * 0.12, u * 0.1);
  } else {
    const ww = u * 0.13, wy = y - bh * 0.72;
    for (const sd of shed ? [] : [-1, 1]) {
      const wx = x + sd * bw * 0.27 - ww / 2;
      ctx.fillStyle = win;
      ctx.fillRect(wx, wy, ww, ww * 0.9);
      if (fire <= 0 && ch < 0.5) {
        ctx.fillStyle = 'rgba(255,240,180,.35)';
        ctx.fillRect(wx - 1, wy - 1, ww + 2, ww * 0.9 + 2);
      }
      ctx.strokeStyle = mix('#ffffff', '#2a2020', ch);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(wx, wy, ww, ww * 0.9);
      ctx.beginPath();
      ctx.moveTo(wx + ww / 2, wy);
      ctx.lineTo(wx + ww / 2, wy + ww * 0.9);
      ctx.moveTo(wx, wy + ww * 0.45);
      ctx.lineTo(wx + ww, wy + ww * 0.45);
      ctx.stroke();
    }
    ctx.fillStyle = mix(shed ? '#6a4026' : '#7a4a2e', '#1a1212', ch);
    const dw = u * (shed ? 0.2 : 0.14), dh = bh * (shed ? 0.7 : 0.58);
    ctx.beginPath();
    ctx.roundRect(x - dw / 2, y - dh, dw, dh, [u * 0.05, u * 0.05, 0, 0]);
    ctx.fill();
    if (shed) {
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - dw / 2, y - dh);
      ctx.lineTo(x + dw / 2, y);
      ctx.moveTo(x + dw / 2, y - dh);
      ctx.lineTo(x - dw / 2, y);
      ctx.stroke();
    }
    circ(ctx, x + dw * 0.25, y - dh * 0.45, Math.max(1, u * 0.012), '#ffd77a');
  }
  // 그을음
  if (ch > 0.05) {
    ctx.globalAlpha = Math.min(0.6, ch);
    ctx.fillStyle = '#140c10';
    for (let k = 0; k < 3; k++) ell(ctx, x + (hsh(k + v * 40) - 0.5) * bw * 0.7, y - bh * (0.4 + hsh(k * 3 + v) * 0.6), u * 0.12, u * 0.08, '#140c10');
    ctx.globalAlpha = 1;
  }
}

/** 짚단 더미 */
function drawHay(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, ch: number, down: boolean, t: number) {
  ell(ctx, x + u * 0.06, y, u * 0.38, u * 0.1, 'rgba(20,8,30,.32)');
  if (down) {
    ell(ctx, x, y - u * 0.03, u * 0.3, u * 0.09, '#3a3432');
    for (let k = 0; k < 3; k++) circ(ctx, x + (k - 1) * u * 0.12, y - u * 0.04, u * 0.02 * (1 + Math.sin(t * 0.2 + k)), '#ff8a3a');
    return;
  }
  const bale = (bx: number, by: number, r: number) => {
    const g = ctx.createLinearGradient(bx, by - r, bx, by + r);
    g.addColorStop(0, mix('#ffe08a', '#3a2a20', ch));
    g.addColorStop(1, mix('#c8932e', '#221812', ch));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(bx - r * 1.1, by - r, r * 2.2, r * 2, r * 0.5);
    ctx.fill();
    ctx.fillStyle = mix('#f2c460', '#2a2018', ch);
    ell(ctx, bx + r * 1.0, by, r * 0.42, r * 0.95, mix('#f6cf6c', '#2a2018', ch));
    ctx.strokeStyle = mix('#b88426', '#1a1210', ch);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(bx + r * 1.0, by, r * 0.25, r * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  bale(x - u * 0.14, y - u * 0.12, u * 0.12);
  bale(x + u * 0.12, y - u * 0.12, u * 0.12);
  bale(x, y - u * 0.34, u * 0.12);
}

/** 물통(파란 나무통) · 기름통(빨간 드럼). heat가 차면 달아올라 덜덜 */
function drawBarrel(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, k: number, spin: number, heat: number, t: number, lean: number) {
  const r = u * 0.2, hgt = u * 0.44, sh = heat > 0.4 ? Math.sin(t * 1.7) * u * 0.02 * heat : 0;
  ell(ctx, x + u * 0.05, y, r * 1.25, r * 0.42, 'rgba(20,8,30,.35)');
  ctx.save();
  ctx.translate(x + sh, y);
  ctx.rotate(lean);
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  if (k === 0) {
    g.addColorStop(0, '#2a6fb0');
    g.addColorStop(0.35, '#5cb4ff');
    g.addColorStop(1, '#1d4f86');
  } else {
    g.addColorStop(0, mix('#8a1e1e', '#ff5a2a', heat));
    g.addColorStop(0.35, mix('#d8443a', '#ffb050', heat));
    g.addColorStop(1, mix('#5a1010', '#c8301a', heat));
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r, -hgt);
  ctx.quadraticCurveTo(-r * 1.15, -hgt / 2, -r, 0);
  ctx.ellipse(0, 0, r, r * 0.32, 0, Math.PI, 0, true);
  ctx.quadraticCurveTo(r * 1.15, -hgt / 2, r, -hgt);
  ctx.closePath();
  ctx.fill();
  // 띠 (굴러가면 돈다)
  const band = k === 0 ? '#c9d6e2' : '#ffd23a';
  for (const by of [-hgt * 0.2, -hgt * 0.8]) {
    ctx.strokeStyle = band;
    ctx.lineWidth = Math.max(1.5, u * 0.035);
    ctx.beginPath();
    ctx.ellipse(0, by, r * 1.06, r * 0.3, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  // 무늬: 물방울 / 불꽃 경고
  const off = Math.sin(spin) * r * 0.45;
  if (Math.cos(spin) > -0.3) {
    ctx.fillStyle = k === 0 ? '#ffffff' : '#1a1a1a';
    if (k === 0) dropPath(ctx, off, -hgt * 0.5, r * 0.3);
    else {
      ctx.beginPath();
      ctx.moveTo(off, -hgt * 0.7);
      ctx.lineTo(off + r * 0.36, -hgt * 0.28);
      ctx.lineTo(off - r * 0.36, -hgt * 0.28);
      ctx.closePath();
      ctx.fillStyle = '#ffd23a';
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(off - r * 0.04, -hgt * 0.6, r * 0.08, hgt * 0.17);
      circ(ctx, off, -hgt * 0.36, r * 0.05, '#1a1a1a');
    }
    if (k === 0) ctx.fill();
  }
  // 뚜껑
  ell(ctx, 0, -hgt, r, r * 0.32, k === 0 ? '#3f86c8' : mix('#a82a22', '#ff7a3a', heat));
  ell(ctx, -r * 0.2, -hgt - r * 0.05, r * 0.35, r * 0.1, 'rgba(255,255,255,.35)');
  ctx.restore();
  if (k === 1 && heat > 0.15) {
    ctx.globalAlpha = Math.min(1, heat);
    const gl = ctx.createRadialGradient(x, y - hgt / 2, 0, x, y - hgt / 2, u * 0.5);
    gl.addColorStop(0, 'rgba(255,120,40,.6)');
    gl.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(x, y - hgt / 2, u * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** 고양이 소방관 (노란 헬멧). mood 0 진지 · 1 쏘는 중(으랏차) · 2 우쭐 · 3 깜짝(집이 탐) · 4 물 바닥(멍) */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, t: number, lookX: number, lookY: number) {
  const breathe = Math.sin(t * 0.08) * u * 0.03, jig = mood === 1 ? Math.sin(t * 1.9) * u * 0.025 : 0, hop = mood === 2 ? -Math.abs(Math.sin(t * 0.22)) * u * 0.18 : 0;
  ctx.save();
  ctx.translate(x + jig, y + hop);
  // 꼬리
  ctx.strokeStyle = '#e8892e';
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 0.22;
  ctx.beginPath();
  ctx.moveTo(-u * 0.5, -u * 0.35);
  const tw = Math.sin(t * 0.09) * u * 0.25;
  ctx.bezierCurveTo(-u * 1.1, -u * 0.4, -u * 1.0 + tw, -u * 1.1, -u * 0.75 + tw, -u * 1.25);
  ctx.stroke();
  ctx.strokeStyle = '#b8601e';
  ctx.lineWidth = u * 0.07;
  for (const q of [0.45, 0.7]) {
    ctx.beginPath();
    ctx.arc(-u * (0.9 + q * 0.1) + tw * q, -u * (0.5 + q * 0.6), u * 0.12, 0.5, 2.2);
    ctx.stroke();
  }
  // 몸통 (방화복: 겨자색 + 반사띠)
  const bg = ctx.createLinearGradient(-u * 0.6, -u * 1.0, u * 0.6, 0);
  bg.addColorStop(0, '#f2c14e');
  bg.addColorStop(1, '#c48a22');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-u * 0.55, 0);
  ctx.quadraticCurveTo(-u * 0.62, -u * 0.75 + breathe, -u * 0.25, -u * 0.95 + breathe);
  ctx.lineTo(u * 0.25, -u * 0.95 + breathe);
  ctx.quadraticCurveTo(u * 0.62, -u * 0.75 + breathe, u * 0.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,40,0,.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#e8eef2';
  ctx.fillRect(-u * 0.56, -u * 0.32, u * 1.12, u * 0.1);
  ctx.fillStyle = '#9aa8b2';
  ctx.fillRect(-u * 0.56, -u * 0.25, u * 1.12, u * 0.025);
  // 머리
  const hy = -u * 1.38 + breathe;
  // 귀
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#f0a04a';
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.62, hy - u * 0.05);
    ctx.lineTo(sd * u * 0.78, hy - u * 0.62 + (mood === 3 ? -u * 0.08 : 0));
    ctx.lineTo(sd * u * 0.28, hy - u * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb0a8';
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.6, hy - u * 0.12);
    ctx.lineTo(sd * u * 0.7, hy - u * 0.5);
    ctx.lineTo(sd * u * 0.38, hy - u * 0.36);
    ctx.closePath();
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(-u * 0.25, hy - u * 0.25, u * 0.1, 0, hy, u * 0.8);
  hg.addColorStop(0, '#ffc27a');
  hg.addColorStop(0.7, '#f0963a');
  hg.addColorStop(1, '#c86a1e');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, hy, u * 0.72 * (mood === 1 ? 1.04 : 1), u * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,50,0,.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 뺨 털 · 주둥이
  ell(ctx, -u * 0.2, hy + u * 0.22, u * 0.24, u * 0.17, '#fff3e0');
  ell(ctx, u * 0.2, hy + u * 0.22, u * 0.24, u * 0.17, '#fff3e0');
  ell(ctx, -u * 0.45, hy + u * 0.12, u * 0.12, u * 0.07, 'rgba(255,120,120,.4)');
  ell(ctx, u * 0.45, hy + u * 0.12, u * 0.12, u * 0.07, 'rgba(255,120,120,.4)');
  // 눈 (겨누는 쪽을 본다)
  const lx = clamp(lookX, -1, 1) * u * 0.06, ly = clamp(lookY, -1, 1) * u * 0.05;
  for (const sd of [-1, 1]) {
    const ex = sd * u * 0.26, ey = hy - u * 0.04;
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1.4, u * 0.07);
    ctx.lineCap = 'round';
    if (mood === 1) {
      ctx.beginPath();
      ctx.moveTo(ex - u * 0.1, ey - sd * 0 - u * 0.06);
      ctx.lineTo(ex + sd * u * 0.06, ey);
      ctx.lineTo(ex - u * 0.1, ey + u * 0.06);
      if (sd > 0) {
        ctx.moveTo(ex + u * 0.1, ey - u * 0.06);
        ctx.lineTo(ex - u * 0.06, ey);
        ctx.lineTo(ex + u * 0.1, ey + u * 0.06);
      }
      ctx.stroke();
    } else if (mood === 2) {
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.04, u * 0.1, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 4 || mood === 5) {
      ctx.lineWidth = Math.max(1, u * 0.04);
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k * 0.7 + t * 0.25, rr = (k / 12) * u * 0.12;
        ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      ctx.stroke();
    } else {
      const big = mood === 3 ? 1.25 : 1;
      ell(ctx, ex, ey, u * 0.13 * big, u * 0.15 * big, '#ffffff');
      ell(ctx, ex + lx, ey + ly, u * 0.085 * (mood === 3 ? 0.6 : 1), u * 0.11 * (mood === 3 ? 0.6 : 1), '#2a1a10');
      circ(ctx, ex + lx - u * 0.03, ey + ly - u * 0.04, u * 0.03, '#ffffff');
    }
  }
  // 코 · 입
  ctx.fillStyle = '#ff7a8a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.06, hy + u * 0.1);
  ctx.lineTo(u * 0.06, hy + u * 0.1);
  ctx.lineTo(0, hy + u * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a2a1a';
  ctx.lineWidth = Math.max(1, u * 0.04);
  if (mood === 1 || mood === 3) {
    ctx.fillStyle = '#7a2a2a';
    ctx.beginPath();
    ctx.ellipse(0, hy + u * 0.28, u * 0.1, u * (mood === 1 ? 0.09 : 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-u * 0.12, hy + u * 0.22);
    ctx.quadraticCurveTo(-u * 0.06, hy + u * (mood === 2 ? 0.32 : 0.27), 0, hy + u * 0.18);
    ctx.quadraticCurveTo(u * 0.06, hy + u * (mood === 2 ? 0.32 : 0.27), u * 0.12, hy + u * 0.22);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1])
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.32, hy + u * (0.16 + k * 0.07));
      ctx.lineTo(sd * u * 0.78, hy + u * (0.1 + k * 0.12));
      ctx.stroke();
    }
  // 그을음 (실패: 얼굴이 새까매지고 머리에서 연기 폴폴)
  if (mood === 5) {
    ctx.globalAlpha = 0.55;
    ell(ctx, -u * 0.32, hy + u * 0.18, u * 0.2, u * 0.12, '#2a1a1a');
    ell(ctx, u * 0.28, hy - u * 0.2, u * 0.16, u * 0.1, '#2a1a1a');
    ell(ctx, u * 0.05, hy + u * 0.32, u * 0.14, u * 0.07, '#2a1a1a');
    ctx.globalAlpha = 1;
    for (let k = 0; k < 3; k++) {
      const age = (t * 0.7 + k * 20) % 60;
      ctx.globalAlpha = 0.6 * (1 - age / 60);
      circ(ctx, u * 0.4 + Math.sin(age * 0.1 + k) * u * 0.15, hy - u * 1.0 - age * u * 0.02, u * (0.1 + age * 0.004), '#6a6470');
    }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      starPath(ctx, Math.cos(a) * u * 0.7, hy - u * 0.95 + Math.sin(a) * u * 0.15, u * 0.12);
      ctx.fill();
    }
  }
  // 땀 (깜짝)
  if (mood === 3) {
    ctx.fillStyle = '#9fe3ff';
    dropPath(ctx, u * 0.7, hy - u * 0.2 + (t % 30) * u * 0.008, u * 0.09);
    ctx.fill();
  }
  // 헬멧 (실패하면 비뚤어진다)
  const hy2 = hy - u * 0.32;
  if (mood === 5) ctx.rotate(-0.25);
  const hm = ctx.createLinearGradient(0, hy2 - u * 0.5, 0, hy2 + u * 0.2);
  hm.addColorStop(0, '#fff07a');
  hm.addColorStop(0.5, '#ffcc2a');
  hm.addColorStop(1, '#d89a10');
  ctx.fillStyle = '#c8880e';
  ctx.beginPath();
  ctx.ellipse(0, hy2 + u * 0.1, u * 0.86, u * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hm;
  ctx.beginPath();
  ctx.ellipse(0, hy2, u * 0.62, u * 0.46, 0, Math.PI, 0);
  ctx.lineTo(u * 0.62, hy2 + u * 0.06);
  ctx.lineTo(-u * 0.62, hy2 + u * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b07a08';
  ctx.lineWidth = Math.max(1, u * 0.04);
  ctx.beginPath();
  ctx.moveTo(0, hy2 - u * 0.46);
  ctx.lineTo(0, hy2 + u * 0.04);
  ctx.stroke();
  // 헬멧 앞 방패 배지
  ctx.fillStyle = '#d8323a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.17, hy2 - u * 0.2);
  ctx.lineTo(u * 0.17, hy2 - u * 0.2);
  ctx.lineTo(u * 0.15, hy2 + u * 0.02);
  ctx.lineTo(0, hy2 + u * 0.1);
  ctx.lineTo(-u * 0.15, hy2 + u * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff6d0';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#fff6d0';
  dropPath(ctx, 0, hy2 - u * 0.06, u * 0.06);
  ctx.fill();
  ell(ctx, -u * 0.3, hy2 - u * 0.28, u * 0.14, u * 0.07, 'rgba(255,255,255,.55)');
  ctx.restore();
}

/** 길가 구경꾼: 강아지(양동이) · 토끼. mood 0 구경 · 1 만세 · 2 걱정 */
function drawFolk(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, kind: number, mood: number, t: number, face: number) {
  const hop = mood === 1 ? -Math.abs(Math.sin(t * 0.25 + kind)) * u * 0.5 : 0, sh = mood === 2 ? Math.sin(t * 0.9) * u * 0.04 : 0;
  ell(ctx, x, y, u * 0.55, u * 0.15, 'rgba(10,5,20,.35)');
  ctx.save();
  ctx.translate(x + sh, y + hop);
  ctx.scale(face, 1);
  const fur = kind === 0 ? ['#d9a066', '#a8703a'] : ['#f4f0ec', '#c8bcb4'];
  const g = ctx.createLinearGradient(0, -u * 1.6, 0, 0);
  g.addColorStop(0, fur[0]);
  g.addColorStop(1, fur[1]);
  // 몸
  ctx.fillStyle = kind === 0 ? '#4a7ac8' : '#c85a8a';
  ctx.beginPath();
  ctx.roundRect(-u * 0.35, -u * 0.85, u * 0.7, u * 0.85, u * 0.25);
  ctx.fill();
  // 팔 (만세면 위로)
  ctx.strokeStyle = fur[0];
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 0.16;
  ctx.beginPath();
  const up = mood === 1;
  ctx.moveTo(-u * 0.3, -u * 0.65);
  ctx.lineTo(-u * 0.55, up ? -u * 1.35 : -u * 0.3);
  ctx.moveTo(u * 0.3, -u * 0.65);
  ctx.lineTo(u * 0.55, up ? -u * 1.35 : -u * 0.3);
  ctx.stroke();
  // 양동이
  const bx = u * 0.55, by = up ? -u * 1.45 : -u * 0.25;
  ctx.fillStyle = '#9aa6b0';
  ctx.beginPath();
  ctx.moveTo(bx - u * 0.2, by - u * 0.22);
  ctx.lineTo(bx + u * 0.2, by - u * 0.22);
  ctx.lineTo(bx + u * 0.15, by + u * 0.12);
  ctx.lineTo(bx - u * 0.15, by + u * 0.12);
  ctx.closePath();
  ctx.fill();
  ell(ctx, bx, by - u * 0.22, u * 0.2, u * 0.06, '#5cb4ff');
  // 머리
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 1.18, u * 0.42, u * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 0) {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#8a5a2e';
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.38, -u * 1.1, u * 0.13, u * 0.28, sd * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ell(ctx, u * 0.12, -u * 1.05, u * 0.2, u * 0.14, '#f6dcc0');
    circ(ctx, u * 0.22, -u * 1.1, u * 0.06, '#2a1a10');
  } else {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = fur[0];
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.15, -u * 1.75, u * 0.1, u * 0.35, sd * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb6c6';
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.15, -u * 1.75, u * 0.05, u * 0.25, sd * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    circ(ctx, u * 0.12, -u * 1.08, u * 0.045, '#ff8aa8');
  }
  for (const sd of [-1, 1]) {
    if (mood === 1) {
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = Math.max(1, u * 0.06);
      ctx.beginPath();
      ctx.arc(sd * u * 0.15, -u * 1.22, u * 0.07, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else circ(ctx, sd * u * 0.15, -u * 1.22, u * (mood === 2 ? 0.07 : 0.055), '#2a1a10');
  }
  if (mood === 2) {
    ctx.fillStyle = '#9fe3ff';
    dropPath(ctx, -u * 0.38, -u * 1.35, u * 0.07);
    ctx.fill();
  }
  ctx.restore();
}

/** 불꽃 도깨비: 웃는 불꽃 덩어리. sz = 남은 체력 비율 */
function drawImp(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, sz: number, t: number, face: number, hit: boolean, leaving: boolean) {
  const k = 0.55 + 0.45 * sz, r = u * 0.3 * k, bob = Math.sin(t * 0.3) * u * 0.04;
  ell(ctx, x, y, r * 1.1, r * 0.35, 'rgba(255,120,40,.35)');
  ctx.save();
  ctx.translate(x, y - r * 1.2 + bob);
  ctx.scale(face, 1);
  const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
  gl.addColorStop(0, 'rgba(255,170,60,.5)');
  gl.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(0, r * 0.3, r * 0.1, 0, 0, r * 1.4);
  g.addColorStop(0, '#fff2a0');
  g.addColorStop(0.5, '#ffa02a');
  g.addColorStop(1, '#e8401e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.4);
  ctx.bezierCurveTo(-r * 1.3, -r * 0.4, -r * 0.5, -r * 0.8, -r * 0.4, -r * 1.5 - Math.sin(t * 0.4) * r * 0.2);
  ctx.bezierCurveTo(-r * 0.1, -r * 1.0, r * 0.1, -r * 1.2, r * 0.3, -r * 1.9 + Math.sin(t * 0.37) * r * 0.25);
  ctx.bezierCurveTo(r * 0.6, -r * 1.0, r * 1.3, -r * 0.6, r, r * 0.4);
  ctx.quadraticCurveTo(0, r * 1.0, -r, r * 0.4);
  ctx.closePath();
  ctx.fill();
  // 눈 · 입
  for (const sd of [-1, 1]) {
    if (hit) {
      ctx.strokeStyle = '#4a1a10';
      ctx.lineWidth = Math.max(1.2, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(sd * r * 0.38 - r * 0.12, -r * 0.2);
      ctx.lineTo(sd * r * 0.38 + r * 0.12 * sd, -r * 0.1);
      ctx.lineTo(sd * r * 0.38 - r * 0.12, 0);
      ctx.stroke();
    } else {
      ell(ctx, sd * r * 0.36, -r * 0.1, r * 0.2, r * 0.24, '#ffffff');
      circ(ctx, sd * r * 0.36 + r * 0.06, -r * 0.06, r * 0.1, '#3a1208');
    }
  }
  ctx.fillStyle = '#7a1a10';
  ctx.beginPath();
  ctx.arc(0, r * 0.22, r * 0.32, 0.1, Math.PI - 0.1);
  ctx.fill();
  if (leaving) {
    ctx.fillStyle = '#ff7a9a';
    ctx.beginPath();
    ctx.ellipse(r * 0.05, r * 0.5, r * 0.12, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 갇힌 동물 (지붕·나무 위). kind 0 아기 고양이 · 1 강아지 · 2 병아리 */
function drawPet(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, kind: number, smoke: number, t: number, happy: boolean) {
  const wave = Math.sin(t * 0.3) * 0.5, r = u * 0.22;
  const col = kind === 0 ? ['#d8d2cc', '#8a827c'] : kind === 1 ? ['#e0b07a', '#9a6a3a'] : ['#ffe45a', '#e0a020'];
  ell(ctx, x, y + r * 0.9, r * 1.1, r * 0.3, 'rgba(0,0,0,.25)');
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.3);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, col[0]);
  g.addColorStop(1, col[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.05, r, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 0)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = col[1];
      ctx.beginPath();
      ctx.moveTo(x + sd * r * 0.85, y - r * 0.3);
      ctx.lineTo(x + sd * r * 0.75, y - r * 1.3);
      ctx.lineTo(x + sd * r * 0.25, y - r * 0.85);
      ctx.closePath();
      ctx.fill();
    }
  else if (kind === 1)
    for (const sd of [-1, 1]) ell(ctx, x + sd * r * 0.95, y - r * 0.1, r * 0.3, r * 0.55, col[1]);
  else {
    ctx.fillStyle = '#ff9a2a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.2, y + r * 0.1);
    ctx.lineTo(x + r * 0.2, y + r * 0.1);
    ctx.lineTo(x, y + r * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  for (const sd of [-1, 1]) {
    if (happy) {
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath();
      ctx.arc(x + sd * r * 0.38, y - r * 0.05, r * 0.16, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ell(ctx, x + sd * r * 0.38, y - r * 0.1, r * 0.2, r * 0.26, '#ffffff');
      circ(ctx, x + sd * r * 0.38, y - r * 0.05, r * 0.12, '#2a1a10');
    }
  }
  if (!happy && smoke > 0.3) {
    ctx.fillStyle = '#9fe3ff';
    dropPath(ctx, x - r * 0.5, y + r * 0.2 + (t % 25) * r * 0.03, r * 0.13);
    ctx.fill();
  }
  // 손 흔들기 (도와줘!)
  if (!happy) {
    ctx.strokeStyle = col[0];
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.35;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.8, y + r * 0.1);
    ctx.lineTo(x + r * 1.4, y - r * (0.7 + wave * 0.6));
    ctx.stroke();
  }
}

const STEAM = new WeakMap<object, { x: number; y: number; t: number; s: number; vx: number }[]>();
const AIMSM = new WeakMap<object, { a: number; px: number; py: number }>();

function drawAll(ctx: CanvasRenderingContext2D, s: FireState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const SX = (x: number, y: number) => X(PX(x, y)), SY = (y: number, z = 0) => Y(PZ(y, z));
  const cu = (y: number) => R(scl(y) / COLS);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const cells = s.cells;
  let glow = 0;
  for (const a of cells) glow += Math.min(2, a.f);
  const windDraw = s.wind;

  ctx.save();
  fx.begin(ctx);
  // ═════ 하늘 (노을) ═════
  {
    const g = ctx.createLinearGradient(0, 0, 0, Y(GY0 + 0.02));
    g.addColorStop(0, '#1b1640');
    g.addColorStop(0.42, '#46306e');
    g.addColorStop(0.75, '#b85e7c');
    g.addColorStop(1, '#f4a35e');
    ctx.fillStyle = g;
    ctx.fillRect(-12, -12, w + 24, Y(GY0 + 0.02) + 12);
    for (let k = 0; k < 34; k++) {
      const sx = hsh(k) * w, sy = Y(0.1 + hsh(k + 99) * 0.12), tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.03 + k * 1.7));
      ctx.globalAlpha = tw * (1 - (sy / Y(0.25)) * 0.6);
      circ(ctx, sx, sy, k % 7 ? 0.9 : 1.6, '#fff6e0');
    }
    ctx.globalAlpha = 1;
    // 지는 해
    const sunx = X(0.8), suny = Y(0.315);
    const sg = ctx.createRadialGradient(sunx, suny, 0, sunx, suny, R(0.16));
    sg.addColorStop(0, 'rgba(255,236,170,.95)');
    sg.addColorStop(0.25, 'rgba(255,190,110,.6)');
    sg.addColorStop(1, 'rgba(255,140,90,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sunx - R(0.16), suny - R(0.16), R(0.32), R(0.32));
    circ(ctx, sunx, suny, R(0.045), '#ffe6a8');
    // 구름 (천천히 흐른다)
    for (let k = 0; k < 4; k++) {
      const cw = R(0.22 + hsh(k + 5) * 0.12), cx0 = ((hsh(k + 11) * 1.4 + t * 0.00012 * (1 + k * 0.4)) % 1.4) * w - R(0.2), cy0 = Y(0.15 + k * 0.035);
      ctx.fillStyle = k % 2 ? 'rgba(255,170,150,.28)' : 'rgba(190,140,200,.3)';
      ctx.beginPath();
      ctx.ellipse(cx0, cy0, cw * 0.5, R(0.014), 0, 0, Math.PI * 2);
      ctx.ellipse(cx0 + cw * 0.15, cy0 - R(0.01), cw * 0.3, R(0.016), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 먼 산 · 가까운 언덕 (집 불빛)
    ctx.fillStyle = '#4a3672';
    ctx.beginPath();
    ctx.moveTo(-10, Y(GY0));
    for (let k = 0; k <= 12; k++) ctx.lineTo(X(k / 12), Y(0.27 + 0.03 * Math.sin(k * 1.7) + 0.02 * hsh(k)));
    ctx.lineTo(w + 10, Y(GY0));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#33305a';
    ctx.beginPath();
    ctx.moveTo(-10, Y(GY0 + 0.01));
    for (let k = 0; k <= 20; k++) ctx.lineTo(X(k / 20), Y(0.31 + 0.015 * Math.sin(k * 0.9 + 1)));
    ctx.lineTo(w + 10, Y(GY0 + 0.01));
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 7; k++) {
      const hx = X(0.06 + k * 0.145 + hsh(k) * 0.03), hy = Y(0.31 + 0.015 * Math.sin((k * 0.145 + 0.06) * 20 * 0.9 + 1)) + R(0.004);
      ctx.fillStyle = '#26244a';
      ctx.fillRect(hx - R(0.012), hy - R(0.016), R(0.024), R(0.016));
      ctx.beginPath();
      ctx.moveTo(hx - R(0.016), hy - R(0.016));
      ctx.lineTo(hx, hy - R(0.028));
      ctx.lineTo(hx + R(0.016), hy - R(0.016));
      ctx.fill();
      circ(ctx, hx, hy - R(0.008), R(0.004), '#ffd77a');
    }
    // 불빛이 지평선을 물들인다
    if (glow > 0) {
      const fg = ctx.createLinearGradient(0, Y(0.2), 0, Y(GY0));
      fg.addColorStop(0, 'rgba(255,90,40,0)');
      fg.addColorStop(1, `rgba(255,110,50,${Math.min(0.35, glow * 0.06)})`);
      ctx.fillStyle = fg;
      ctx.fillRect(0, Y(0.2), w, Y(GY0 - 0.2));
    }
    // 축제 불꽃놀이 (불똥 판엔 진짜로 불똥을 떨군다)
    const shows = d.key === 'ember' || s.embers.some((e) => e.sky);
    for (let k = 0; k < 3; k++) {
      const per = 150 + k * 37, age = (t + k * 61) % per, n0 = Math.floor((t + k * 61) / per);
      if (!shows && k > 0) continue;
      if (age > 60) continue;
      const bx = X(0.15 + 0.7 * hsh(n0 * 3 + k)), by = Y(0.12 + 0.07 * hsh(n0 * 5 + k)), rr = R(0.05) * Math.min(1, age / 18);
      const col = ['#ffd84a', '#ff7ab0', '#7ae0ff'][(n0 + k) % 3];
      ctx.globalAlpha = Math.max(0, 1 - age / 60) * (shows ? 1 : 0.5);
      for (let q = 0; q < 12; q++) {
        const a = (q / 12) * Math.PI * 2;
        circ(ctx, bx + Math.cos(a) * rr, by + Math.sin(a) * rr + age * 0.15, R(0.004), col);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ═════ 땅 ═════
  {
    const g = ctx.createLinearGradient(0, Y(GY0), 0, Y(1.36));
    g.addColorStop(0, '#3f5a3e');
    g.addColorStop(1, '#5c7d44');
    ctx.fillStyle = g;
    ctx.fillRect(-12, Y(GY0), w + 24, Y(1.36 - GY0) + 12);
    // 칸 (살짝 다른 풀빛) · 젖은 칸은 짙고 반짝
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const a = cells[r * COLS + c];
        const quad = () => {
          ctx.beginPath();
          ctx.moveTo(SX(c, r), SY(r));
          ctx.lineTo(SX(c + 1, r), SY(r));
          ctx.lineTo(SX(c + 1, r + 1), SY(r + 1));
          ctx.lineTo(SX(c, r + 1), SY(r + 1));
          ctx.closePath();
        };
        if (a.k === POND) {
          quad();
          ctx.fillStyle = '#4a6a3e';
          ctx.fill();
          const px = SX(c + 0.5, r + 0.5), py = SY(r + 0.5), uu = cu(r + 0.5);
          const pg = ctx.createRadialGradient(px - uu * 0.1, py - uu * 0.05, 0, px, py, uu * 0.5);
          pg.addColorStop(0, '#7ad0e8');
          pg.addColorStop(1, '#2a6a90');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.ellipse(px, py, uu * 0.46, R(GKY) * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.2;
          for (let q = 0; q < 2; q++) {
            ctx.beginPath();
            ctx.ellipse(px, py, uu * (0.15 + ((t * 0.004 + q * 0.5) % 1) * 0.3), R(GKY) * (0.06 + ((t * 0.004 + q * 0.5) % 1) * 0.25), 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ell(ctx, px + uu * 0.22, py + R(0.01), uu * 0.09, R(0.012), '#5fae5a');
          continue;
        }
        if (a.k === ROAD) {
          quad();
          ctx.fillStyle = '#8a7a6a';
          ctx.fill();
          for (let q = 0; q < 6; q++) {
            const sx = c + 0.2 + (q % 2) * 0.5 + hsh(q + r * 7) * 0.1, sy = r + 0.15 + Math.floor(q / 2) * 0.33;
            ell(ctx, SX(sx, sy), SY(sy), cu(sy) * 0.13, R(GKY) * 0.1, (q + r) % 2 ? '#a8988a' : '#9a8a7a');
          }
          continue;
        }
        quad();
        const hv = hsh(r * 17 + c * 5 + s.stage * 3);
        ctx.fillStyle = `hsl(${96 + hv * 14}, ${30 + hv * 6}%, ${33 + ((r + c) % 2) * 1.5 + hv * 2}%)`;
        ctx.fill();
        if (!a.burnt && a.k !== GRASS)
          // 물체 둘레 흙바닥
          ell(ctx, SX(c + 0.5, r + 0.62), SY(r + 0.62), cu(r + 0.6) * 0.42, R(GKY) * 0.28, 'rgba(120,96,70,.35)');
        if (!a.burnt && a.k === GRASS && hv > 0.45)
          for (let q = 0; q < 4; q++) {
            const fx0 = c + 0.2 + hsh(q * 13 + c * 7 + r) * 0.6, fy0 = r + 0.2 + hsh(q * 7 + r * 5 + c) * 0.6;
            circ(ctx, SX(fx0, fy0), SY(fy0), 1.6, ['#ffd0e0', '#fff3a0', '#c8e8ff'][(q + c) % 3]);
          }
        const px0 = SX(c + 0.5, r + 0.55), py0 = SY(r + 0.55), uu0 = cu(r + 0.5);
        if (a.burnt) {
          const bg2 = ctx.createRadialGradient(px0, py0, 0, px0, py0, uu0 * 0.55);
          bg2.addColorStop(0, 'rgba(30,24,28,.85)');
          bg2.addColorStop(1, 'rgba(30,24,28,0)');
          ctx.fillStyle = bg2;
          ctx.beginPath();
          ctx.ellipse(px0, py0, uu0 * 0.55, R(GKY) * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (a.wet > 0.04) {
          // 젖은 자리: 물웅덩이 (젖은 만큼 커진다)
          const wr = Math.min(1, a.wet);
          const pg2 = ctx.createRadialGradient(px0, py0, 0, px0, py0, uu0 * (0.25 + 0.3 * wr));
          pg2.addColorStop(0, `rgba(90,170,220,${0.55 * wr + 0.1})`);
          pg2.addColorStop(0.7, `rgba(60,130,190,${0.35 * wr})`);
          pg2.addColorStop(1, 'rgba(60,130,190,0)');
          ctx.fillStyle = pg2;
          ctx.beginPath();
          ctx.ellipse(px0, py0, uu0 * (0.25 + 0.3 * wr), R(GKY) * (0.2 + 0.25 * wr), 0, 0, Math.PI * 2);
          ctx.fill();
          ell(ctx, px0 - uu0 * 0.08, py0 - R(GKY) * 0.06, uu0 * 0.12 * wr, R(GKY) * 0.03, 'rgba(230,248,255,.5)');
          for (let q = 0; q < 3; q++) {
            const sx = c + 0.25 + hsh(q + r * 11 + c) * 0.5, sy = r + 0.3 + hsh(q * 3 + c * 5 + r) * 0.5;
            ctx.globalAlpha = wr * (0.5 + 0.5 * Math.sin(t * 0.2 + q * 2 + c));
            ctx.fillStyle = '#ffffff';
            starPath(ctx, SX(sx, sy), SY(sy), 2.2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        // 풀 포기
        if (!a.burnt && a.k === GRASS)
          for (let q = 0; q < 3; q++) {
            const sx = c + 0.15 + hsh(q * 7 + c * 3 + r * 11) * 0.7, sy = r + 0.15 + hsh(q * 5 + c + r * 3) * 0.7;
            ctx.strokeStyle = 'rgba(140,190,100,.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(SX(sx, sy) - 2, SY(sy));
            ctx.lineTo(SX(sx, sy) - 1 + windDraw * 2, SY(sy) - 4);
            ctx.moveTo(SX(sx, sy) + 1, SY(sy));
            ctx.lineTo(SX(sx, sy) + 2 + windDraw * 2, SY(sy) - 5);
            ctx.stroke();
          }
      }
    // 뒤 울타리
    ctx.strokeStyle = '#7a5a3e';
    ctx.lineWidth = R(0.006);
    ctx.beginPath();
    ctx.moveTo(SX(-0.3, -0.05), SY(-0.05) - R(0.02));
    ctx.lineTo(SX(COLS + 0.3, -0.05), SY(-0.05) - R(0.02));
    ctx.moveTo(SX(-0.3, -0.05), SY(-0.05) - R(0.035));
    ctx.lineTo(SX(COLS + 0.3, -0.05), SY(-0.05) - R(0.035));
    ctx.stroke();
    for (let k = 0; k <= 12; k++) {
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(SX(-0.25 + k * 0.54, -0.05) - R(0.004), SY(-0.05) - R(0.045), R(0.008), R(0.045));
    }
    // 축제 등불 줄 (울타리 위로 늘어진다)
    ctx.strokeStyle = 'rgba(40,30,30,.7)';
    ctx.lineWidth = 1;
    const ly0 = SY(-0.05) - R(0.07);
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const q = k / 40, x = X(-0.02 + q * 1.04), sag = Math.abs(Math.sin(q * Math.PI * 3)) * R(0.025);
      if (k) ctx.lineTo(x, ly0 + sag);
      else ctx.moveTo(x, ly0 + sag);
    }
    ctx.stroke();
    const LCOL = ['#ff6a5a', '#ffd25a', '#7ad8ff', '#ff9ad0'];
    for (let k = 0; k < 15; k++) {
      const q = (k + 0.5) / 15, x = X(-0.02 + q * 1.04), y = ly0 + Math.abs(Math.sin(q * Math.PI * 3)) * R(0.025) + R(0.012);
      const col = LCOL[k % 4], fl = 0.75 + 0.25 * Math.sin(t * 0.08 + k * 1.3);
      const lg = ctx.createRadialGradient(x, y, 0, x, y, R(0.035));
      lg.addColorStop(0, `rgba(255,220,150,${0.35 * fl})`);
      lg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - R(0.035), y - R(0.035), R(0.07), R(0.07));
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, R(0.009), R(0.012), 0, 0, Math.PI * 2);
      ctx.fill();
      ell(ctx, x - R(0.003), y - R(0.004), R(0.003), R(0.004), 'rgba(255,255,255,.7)');
    }
    // 앞 찻길
    const ry = SY(ROWS) + R(0.012);
    ctx.fillStyle = '#c8b89a';
    ctx.fillRect(-12, SY(ROWS), w + 24, R(0.014));
    const ag = ctx.createLinearGradient(0, ry, 0, Y(1.36));
    ag.addColorStop(0, '#4a4658');
    ag.addColorStop(1, '#3a3648');
    ctx.fillStyle = ag;
    ctx.fillRect(-12, ry, w + 24, Y(1.36) - ry + 2);
    ctx.fillStyle = 'rgba(255,230,160,.55)';
    for (let k = 0; k < 7; k++) ctx.fillRect(X(-0.05 + k * 0.17), Y(1.315), R(0.08), R(0.008));
  }

  // ═════ 불똥 떨어질 자리 (빨간 동그라미) ═════
  for (const e of s.embers) {
    const left = (e.land - t) / (e.land - e.t0), px = SX(e.c + 0.5, e.r + 0.5), py = SY(e.r + 0.5), uu = cu(e.r + 0.5);
    const a = cells[e.r * COLS + e.c], wet = a.wet > 0.12;
    ctx.strokeStyle = wet ? '#9fe8ff' : '#ff4a3a';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.beginPath();
    ctx.ellipse(px, py, uu * (0.25 + 0.25 * left), R(GKY) * (0.2 + 0.2 * left), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 0.4);
    ell(ctx, px, py, uu * 0.42, R(GKY) * 0.36, wet ? '#7adcff' : '#ff3a2a');
    ctx.globalAlpha = 1;
  }

  // ═════ 물체들 (뒤에서 앞으로) ═════
  const items: { y: number; f: () => void }[] = [];
  const objH = (k: number, u: number) => (k === TREE ? u * 0.75 : k === HAY ? u * 0.32 : k === BARN ? u * 0.72 : u * 0.55);
  for (let i = 0; i < NC; i++) {
    const a = cells[i];
    if (!burnable(a.k)) continue;
    const c = i % COLS, r = (i / COLS) | 0, by = r + 0.62;
    items.push({
      y: by,
      f: () => {
        const x = SX(c + 0.5, by), y = SY(by), u = cu(by), ch = a.max ? 1 - a.fuel / a.max : 0;
        // 곧 붙을 것 같은 칸: 뜨겁게 일렁
        if (a.f <= 0 && !a.burnt && a.heat > 0.45) {
          ctx.globalAlpha = Math.min(0.6, (a.heat - 0.45) * 1.4) * (0.6 + 0.4 * Math.sin(t * 0.35 + i));
          ell(ctx, x, y - objH(a.k, u) * 0.4, u * 0.5, objH(a.k, u) * 0.7, '#ff6a2a');
          ctx.globalAlpha = 1;
        }
        if (a.k === TREE) drawTree(ctx, x, y, u, a.v, ch, a.burnt, t + i * 7, Math.sin(t * 0.04 + i) * 0.5 + windDraw * 1.5);
        else if (a.k === HAY) drawHay(ctx, x, y, u, ch, a.burnt, t);
        else drawHouse(ctx, x, y, u, a.v, ch, a.burnt, t, a.f, a.k);
        if (a.f > 0) {
          const fy = y - objH(a.k, u) * (a.k === TREE ? 0.75 : 0.85);
          drawFlames(ctx, x, fy + u * 0.12, u * (0.42 + 0.22 * Math.min(1, a.f)) * (a.k === BARN ? 1.2 + a.f * 0.12 : 1), a.f, t, i, windDraw, a.oil);
          // 집이 타면: 남은 몸 고리 (위험 경고)
          if (a.k === HOUSE) {
            const life = a.fuel / a.max, rx = x + u * 0.38, ry = y - u * 0.95;
            circ(ctx, rx, ry, u * 0.15, 'rgba(30,10,20,.8)');
            ctx.strokeStyle = life > 0.5 ? '#ffd23a' : '#ff3a2a';
            ctx.lineWidth = Math.max(2.5, u * 0.05);
            ctx.beginPath();
            ctx.arc(rx, ry, u * 0.12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.max(12, u * 0.2)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', rx, ry + 1);
          }
        }
        // 물이 맞는 중이면 김
        if (t - a.hitT < 6 && a.f > 0) {
          ctx.globalAlpha = 0.55;
          for (let q = 0; q < 3; q++) circ(ctx, x + (hsh(q + t) - 0.5) * u * 0.5, y - objH(a.k, u) * 0.8 - ((t * 2 + q * 9) % 20), u * (0.08 + q * 0.03), '#f4f6ff');
          ctx.globalAlpha = 1;
        }
      },
    });
  }
  for (const b of s.things) {
    if (!b.alive) continue;
    items.push({ y: b.y + 0.05, f: () => drawBarrel(ctx, SX(b.x, b.y), SY(b.y), cu(b.y), b.k, b.spin, b.heat, t, clamp(b.vx * 6, -0.4, 0.4)) });
  }
  for (const p of s.pets) {
    if (p.st === 2) continue;
    const by = p.r + 0.63, i = p.r * COLS + p.c, a = cells[i];
    items.push({
      y: by + 0.01,
      f: () => {
        let x = SX(p.c + 0.5, by), y = SY(by) - objH(a.k, cu(by)) * 1.05;
        const happy = p.st === 1;
        if (happy) {
          const q = clamp((t - p.t) / 70, 0, 1), tx = X(0.235 + s.pets.filter((o) => o.st === 1 && o.t < p.t).length * 0.05), ty = Y(1.205);
          x = x + (tx - x) * q;
          y = y + (ty - y) * q - Math.sin(q * Math.PI) * R(0.12);
        }
        drawPet(ctx, x, y, cu(by), p.kind, p.smoke, t + p.kind * 9, happy);
        if (!happy) {
          // 연기 버팀 막대
          const bw = cu(by) * 0.5, bx = x - bw / 2, byy = y - cu(by) * 0.32;
          ctx.fillStyle = 'rgba(20,10,30,.75)';
          ctx.beginPath();
          ctx.roundRect(bx - 1, byy - 1, bw + 2, 7, 3);
          ctx.fill();
          ctx.fillStyle = p.smoke < 0.5 ? '#7ae07a' : p.smoke < 0.8 ? '#ffd23a' : '#ff4a3a';
          ctx.beginPath();
          ctx.roundRect(bx, byy, bw * (1 - p.smoke), 5, 2.5);
          ctx.fill();
        }
      },
    });
  }
  const im = s.imp;
  if (im && (im.st === 0 || t - im.endT < 40)) {
    items.push({
      y: im.y + 0.02,
      f: () => {
        if (im.st === 1) {
          const q = (t - im.endT) / 40;
          ctx.globalAlpha = 1 - q;
          circ(ctx, SX(im.x, im.y), SY(im.y) - cu(im.y) * 0.3 - q * R(0.06), cu(im.y) * (0.2 + q * 0.4), '#f4f6ff');
          ctx.globalAlpha = 1;
          return;
        }
        drawImp(ctx, SX(im.x, im.y), SY(im.y) - (im.leaving ? 0 : 0), cu(im.y), im.hp / IMP_HP, t, im.face, t - im.hitT < 14, im.leaving);
        if (im.st === 0 && !im.leaving && im.tc >= 0 && im.stand > 0) {
          // 불 붙이기 직전: 손에 불씨
          const q = im.stand / IMP_STAND;
          ctx.strokeStyle = '#ffb43a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(SX(im.x, im.y), SY(im.y) - cu(im.y) * 0.4, cu(im.y) * 0.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * q);
          ctx.stroke();
        }
      },
    });
  }
  items.sort((p, q) => p.y - q.y);
  for (const it of items) it.f();

  // 연기 (불타는 칸·다 탄 칸에서 바람 쪽으로)
  for (let i = 0; i < NC; i++) {
    const a = cells[i];
    if (a.f <= 0 && !(a.burnt && t - a.outT < 9999)) continue;
    if (a.f <= 0 && !a.burnt) continue;
    const c = i % COLS, r = (i / COLS) | 0, x = SX(c + 0.5, r + 0.5), y = SY(r + 0.5) - cu(r + 0.5) * 0.7, n = a.f > 0 ? 4 : 2;
    for (let q = 0; q < n; q++) {
      const life = 90, age = (t + q * (life / n) + i * 13) % life, k = age / life;
      const sx2 = x + windDraw * k * R(0.12) + Math.sin(k * 5 + i) * R(0.01), sy2 = y - k * R(0.2), sr = R(0.02 + k * 0.04);
      const sg2 = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, sr);
      const sc = a.f > 0 ? '58,48,70' : '150,144,160';
      sg2.addColorStop(0, `rgba(${sc},${(a.f > 0 ? 0.42 : 0.22) * Math.sin(k * Math.PI)})`);
      sg2.addColorStop(1, `rgba(${sc},0)`);
      ctx.fillStyle = sg2;
      ctx.beginPath();
      ctx.arc(sx2, sy2, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 날아오는 불똥 (꼬리 달린 빛 덩어리)
  for (const e of s.embers) {
    const q = clamp((t - e.t0) / (e.land - e.t0), 0, 1);
    const ex = e.sx + (e.c + 0.5 - e.sx) * q, ey = e.sy + (e.r + 0.5 - e.sy) * q, ez = e.sky ? 3.4 * (1 - q) : 2.2 * 4 * q * (1 - q) + 0.6 * (1 - q);
    const px = SX(ex, ey), py = SY(ey, ez);
    for (let k = 1; k <= 5; k++) {
      const q2 = Math.max(0, q - k * 0.025), ex2 = e.sx + (e.c + 0.5 - e.sx) * q2, ey2 = e.sy + (e.r + 0.5 - e.sy) * q2, ez2 = e.sky ? 3.4 * (1 - q2) : 2.2 * 4 * q2 * (1 - q2) + 0.6 * (1 - q2);
      ctx.globalAlpha = 0.5 - k * 0.08;
      circ(ctx, SX(ex2, ey2), SY(ey2, ez2), R(0.008) * (1 - k * 0.12), '#ff9a3a');
    }
    ctx.globalAlpha = 1;
    const eg = ctx.createRadialGradient(px, py, 0, px, py, R(0.025));
    eg.addColorStop(0, '#fffbe0');
    eg.addColorStop(0.4, '#ffb43a');
    eg.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(px, py, R(0.025), 0, Math.PI * 2);
    ctx.fill();
  }

  // ═════ 물대포 물줄기 ═════
  const cannon = { x: X(0.5), y: Y(1.035) };
  let am = AIMSM.get(s);
  if (!am) AIMSM.set(s, (am = { a: -Math.PI / 2, px: 0, py: 0 }));
  if (s.down && s.aim) {
    const tx = SX(s.aim.x, s.aim.y), ty = SY(s.aim.y) - R(0.25);
    const want = clamp(Math.atan2(ty - cannon.y, tx - cannon.x), -Math.PI + 0.25, -0.25);
    am.a += (want - am.a) * 0.35;
    am.px = s.aim.x;
    am.py = s.aim.y;
  } else am.a += (-Math.PI / 2 - am.a) * 0.05;
  const tipLen = R(0.072), tip = { x: cannon.x + Math.cos(am.a) * tipLen, y: cannon.y + Math.sin(am.a) * tipLen };
  {
    // 물줄기 등뼈(겨눈 자리 기준 — 매끈하다)와 실제 물방울(흩어짐)을 따로 계산
    const pts: { x: number; y: number; u: number; t0: number; dx: number; dy: number }[] = [];
    for (const dp of s.drops) {
      const u = clamp((t - dp.t0) / dp.T, 0, 1);
      const x = NZ.x + (dp.tx - NZ.x) * u + (dp.lx - dp.tx) * u * u, y = NZ.y + (dp.ly - NZ.y) * u, z = Z0 * (1 - u) + dp.hh * 4 * u * (1 - u);
      const bx = x - dp.jx * u, by = y - dp.jy * u;
      let px = SX(bx, by), py = SY(by, z);
      const ax = SX(x, y), ay = SY(y, z);
      if (u < 0.2) {
        const k = u / 0.2;
        px = tip.x + (px - tip.x) * k;
        py = tip.y + (py - tip.y) * k;
      }
      pts.push({ x: px, y: py, u, t0: dp.t0, dx: ax - px, dy: ay - py });
    }
    pts.sort((p, q) => q.t0 - p.t0);
    if (s.down && s.tank >= 1 && pts.length && pts[0].u < 0.2) pts.unshift({ x: tip.x, y: tip.y, u: 0, t0: pts[0].t0 + 1, dx: 0, dy: 0 });
    // 굵은 물기둥: 바깥 물빛 → 하얀 속 → 반짝 줄 (끊긴 데는 끊어서)
    const passes: [string, number][] = [['rgba(60,150,230,.28)', 1.5], ['rgba(170,225,255,.7)', 1], ['rgba(255,255,255,.95)', 0.38]];
    for (const [col, k] of passes) {
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        if (p.t0 - q.t0 > 2) continue;
        ctx.lineWidth = k * (R(0.034) * (1 - p.u * 0.6) + 1.2);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
    // 물기둥 위를 흐르는 반짝 줄무늬
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if ((p.t0 + Math.floor(t / 2)) % 5 || p.u > 0.8) continue;
      ell(ctx, p.x, p.y - R(0.004), R(0.006), R(0.0025), 'rgba(255,255,255,.95)');
    }
    // 끝으로 갈수록 흩어지는 물방울
    for (const p of pts) {
      if (p.u < 0.35) continue;
      const k = (p.u - 0.35) / 0.65;
      for (let q = 0; q < 3; q++) {
        const ox = p.dx * (0.6 + q * 0.4) + (hsh(p.t0 * 3 + q) - 0.5) * R(0.025) * k, oy = p.dy * (0.6 + q * 0.4) + (hsh(p.t0 * 7 + q) - 0.5) * R(0.015) * k;
        const rr = R(0.006) * (1 - k * 0.4) + 0.8;
        circ(ctx, p.x + ox, p.y + oy, rr, 'rgba(200,238,255,.92)');
        circ(ctx, p.x + ox - rr * 0.3, p.y + oy - rr * 0.3, rr * 0.35, '#ffffff');
      }
      if ((p.t0 + t) % 11 === 0) {
        ctx.fillStyle = '#ffffff';
        starPath(ctx, p.x + p.dx, p.y + p.dy, R(0.01));
        ctx.fill();
      }
    }
    // 노즐 물보라
    if (s.down && s.tank >= 1) {
      for (let q = 0; q < 4; q++) {
        const a = am.a + (hsh(t * 5 + q) - 0.5) * 1.2, d2 = R(0.01 + hsh(t * 3 + q) * 0.02);
        circ(ctx, tip.x + Math.cos(a) * d2, tip.y + Math.sin(a) * d2, R(0.004), 'rgba(230,248,255,.9)');
      }
    }
    // 떨어진 자리: 물보라 왕관
    for (const l of s.landed) {
      const age = t - l.t;
      if (age > 14) continue;
      const px = SX(l.x, l.y), py = SY(l.y), k = age / 14;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = l.hot ? '#ffffff' : '#bfefff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, py, R(0.012 + k * 0.03), R(0.005 + k * 0.012), 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let q = 0; q < 3; q++) {
        const a = -Math.PI / 2 + (q - 1) * 0.7 + (hsh(l.t + q) - 0.5) * 0.4;
        circ(ctx, px + Math.cos(a) * R(0.03) * k, py + Math.sin(a) * R(0.035) * k + k * k * R(0.03), R(0.004), '#e6f8ff');
      }
      ctx.globalAlpha = 1;
    }
    // 무지개 물보라 (쏘는 중 · 물이 떨어지는 자리 위)
    if (s.sprayT > 10 && s.landed.length) {
      const l = s.landed[s.landed.length - 1];
      const px = SX(l.x, l.y), py = SY(l.y) - R(0.01), rr = R(0.075);
      const rb = ['#ff5a5a', '#ffa83a', '#ffe64a', '#6ae06a', '#5ab4ff', '#9a7aff'];
      ctx.globalAlpha = Math.min(0.32, (s.sprayT - 10) * 0.02);
      ctx.lineWidth = R(0.006);
      for (let k = 0; k < rb.length; k++) {
        ctx.strokeStyle = rb[k];
        ctx.beginPath();
        ctx.arc(px, py, rr - k * R(0.006), Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.3;
      circ(ctx, px, py - R(0.02), R(0.05), 'rgba(235,250,255,.6)');
      ctx.globalAlpha = 1;
    }
  }
  // 김 (불이 꺼질 때 피어오름)
  let steam = STEAM.get(s);
  if (!steam) STEAM.set(s, (steam = []));
  for (const p of steam) {
    const age = t - p.t;
    if (age < 0 || age > 70) continue;
    const k = age / 70;
    ctx.globalAlpha = 0.6 * (1 - k);
    circ(ctx, p.x + p.vx * age, p.y - age * R(0.0018) * p.s, R(0.02 + k * 0.05) * p.s, '#f4f6ff');
  }
  ctx.globalAlpha = 1;
  STEAM.set(
    s,
    steam.filter((p) => t - p.t <= 70 && t >= p.t),
  );

  // 통이 굴러갈 길 미리 보기 (겨눈 자리가 통 옆이면)
  if (s.down && s.aim && s.phase === 'play') {
    for (const b of s.things) {
      if (!b.alive || Math.hypot(b.x - s.aim.x, b.y - s.aim.y) > 0.65) continue;
      const q = { x: b.x, y: b.y, vx: b.vx, vy: b.vy }, hit = { i: -1 };
      const sdx = s.aim.x - NZ.x, sdy = s.aim.y - NZ.y, sl = Math.hypot(sdx, sdy) || 1;
      const dx = sdx / sl + (b.x - s.aim.x) * 2.2, dy = sdy / sl + (b.y - s.aim.y) * 2.2, l = Math.hypot(dx, dy) || 1;
      if (Math.hypot(q.vx, q.vy) < 0.02) (q.vx += (dx / l) * PUSH * 8), (q.vy += (dy / l) * PUSH * 8);
      ctx.strokeStyle = b.k === 0 ? 'rgba(160,230,255,.85)' : 'rgba(255,210,90,.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(SX(q.x, q.y), SY(q.y));
      let out = 0;
      for (let k = 0; k < 200; k++) {
        out = rollTick(cells, q, hit);
        if (k % 3 === 0) ctx.lineTo(SX(q.x, q.y), SY(q.y));
        if (out === 1 || out === 2 || (q.vx === 0 && q.vy === 0)) break;
      }
      ctx.lineTo(SX(q.x, q.y), SY(q.y));
      ctx.stroke();
      ctx.setLineDash([]);
      if (out === 1 && hit.i >= 0) {
        const hx = SX(ccx(hit.i), ccy(hit.i)), hy = SY(ccy(hit.i));
        ctx.strokeStyle = b.k === 0 ? '#9ff0ff' : '#ff5a3a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(hx, hy, cu(ccy(hit.i)) * 1.4, R(GKY) * 1.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // ═════ 소방차 · 고양이 · 구경꾼 ═════
  {
    const tx0 = X(0.29), tx1 = X(0.71), ty0 = Y(1.105), ty1 = Y(1.3), rf0 = Y(1.04);
    ell(ctx, X(0.5), Y(1.315), R(0.25), R(0.03), 'rgba(10,5,20,.45)');
    // 바퀴
    for (const sd of [-1, 1]) {
      ell(ctx, X(0.5 + sd * 0.18), Y(1.3), R(0.045), R(0.03), '#1a1820');
      ell(ctx, X(0.5 + sd * 0.18), Y(1.296), R(0.022), R(0.014), '#6a6a78');
    }
    // 지붕 (위에서 보이는 면)
    ctx.fillStyle = '#b8262e';
    ctx.beginPath();
    ctx.moveTo(X(0.32), rf0);
    ctx.lineTo(X(0.68), rf0);
    ctx.lineTo(tx1, ty0);
    ctx.lineTo(tx0, ty0);
    ctx.closePath();
    ctx.fill();
    // 사다리
    ctx.strokeStyle = '#d8dee6';
    ctx.lineWidth = R(0.006);
    ctx.beginPath();
    for (const sd of [-1, 1]) {
      ctx.moveTo(X(0.5 + sd * 0.12), ty0 - R(0.004));
      ctx.lineTo(X(0.5 + sd * 0.1), rf0 + R(0.004));
    }
    for (let k = 0; k < 5; k++) {
      const yy = ty0 - (ty0 - rf0) * (k + 0.5) / 5, hw = 0.12 - 0.02 * ((k + 0.5) / 5);
      ctx.moveTo(X(0.5 - hw), yy);
      ctx.lineTo(X(0.5 + hw), yy);
    }
    ctx.stroke();
    // 경광등 (빨강·파랑 번갈아)
    for (const sd of [-1, 1]) {
      const on = (Math.floor(t / 14) % 2 === 0) === sd > 0;
      const lx = X(0.5 + sd * 0.14), ly = rf0 - R(0.006);
      ctx.fillStyle = sd > 0 ? (on ? '#ff3a3a' : '#7a1a1a') : on ? '#3a8aff' : '#1a2a6a';
      ctx.beginPath();
      ctx.roundRect(lx - R(0.025), ly - R(0.012), R(0.05), R(0.018), R(0.006));
      ctx.fill();
      if (on) {
        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, R(0.1));
        lg.addColorStop(0, sd > 0 ? 'rgba(255,60,60,.45)' : 'rgba(60,140,255,.45)');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(lx - R(0.1), ly - R(0.1), R(0.2), R(0.2));
      }
    }
    // 뒷면
    const bg = ctx.createLinearGradient(0, ty0, 0, ty1);
    bg.addColorStop(0, '#e8434a');
    bg.addColorStop(1, '#a81e28');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(tx0, ty0, tx1 - tx0, ty1 - ty0, [R(0.012), R(0.012), R(0.02), R(0.02)]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(tx0 + R(0.01), ty0 + R(0.004), tx1 - tx0 - R(0.02), R(0.006));
    // 물탱크 창 (물 높이가 보인다)
    const gx0 = X(0.33), gx1 = X(0.67), gy0 = Y(1.128), gh = R(0.05), lvl = s.tank / TANK, low = lvl < 0.2;
    ctx.fillStyle = '#1a2a3a';
    ctx.beginPath();
    ctx.roundRect(gx0, gy0, gx1 - gx0, gh, gh / 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(gx0 + 2, gy0 + 2, gx1 - gx0 - 4, gh - 4, gh / 2 - 2);
    ctx.clip();
    const wg = ctx.createLinearGradient(0, gy0, 0, gy0 + gh);
    wg.addColorStop(0, low ? '#ff9a8a' : '#9fe8ff');
    wg.addColorStop(1, low ? '#d8403a' : '#2a8ad8');
    ctx.fillStyle = wg;
    const wx1 = gx0 + 2 + (gx1 - gx0 - 4) * lvl;
    ctx.beginPath();
    ctx.moveTo(gx0, gy0 + gh);
    ctx.lineTo(gx0, gy0);
    for (let k = 0; k <= 6; k++) ctx.lineTo(wx1 + Math.sin(t * 0.3 + k) * 2, gy0 + (gh * k) / 6);
    ctx.lineTo(gx0, gy0 + gh);
    ctx.closePath();
    ctx.fill();
    if (!s.down && lvl < 1)
      for (let k = 0; k < 4; k++) circ(ctx, gx0 + 6 + ((t * 0.8 + k * 23) % Math.max(8, wx1 - gx0 - 8)), gy0 + gh * (0.3 + 0.4 * hsh(k)), 1.5, 'rgba(255,255,255,.7)');
    ctx.restore();
    ctx.strokeStyle = low && t % 20 < 10 ? '#ff5a4a' : '#d8dee6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(gx0, gy0, gx1 - gx0, gh, gh / 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    dropPath(ctx, gx0 - R(0.025), gy0 + gh * 0.55, R(0.012));
    ctx.fill();
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.tank < 1 ? (s.down ? '물 바닥!' : '채우는 중') : `물 ${Math.round(lvl * 100)}%`, X(0.5), gy0 + gh / 2 + 1);
    // 문짝 · 범퍼 · 등
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = 1;
    for (const sd of [-1, 1])
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(X(0.5 + sd * 0.045), Y(1.195 + k * 0.016));
        ctx.lineTo(X(0.5 + sd * 0.16), Y(1.195 + k * 0.016));
        ctx.stroke();
      }
    ctx.fillStyle = '#d8dee6';
    ctx.beginPath();
    ctx.roundRect(tx0 - R(0.008), ty1 - R(0.02), tx1 - tx0 + R(0.016), R(0.022), R(0.008));
    ctx.fill();
    for (const sd of [-1, 1]) {
      circ(ctx, X(0.5 + sd * 0.185), Y(1.205), R(0.013), '#ffb43a');
      circ(ctx, X(0.5 + sd * 0.185), Y(1.24), R(0.013), '#ff3a3a');
      ell(ctx, X(0.5 + sd * 0.185) - R(0.004), Y(1.236), R(0.005), R(0.004), 'rgba(255,255,255,.6)');
    }
    // 호스 감개 (쏘는 동안 돈다)
    {
      const hx0 = X(0.5), hy0 = Y(1.228), hr = R(0.034), rot = am.a * 3 + (s.down ? t * 0.4 : 0);
      circ(ctx, hx0, hy0, hr, '#3a3a48');
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = R(0.007);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(hx0, hy0, hr * (0.45 + k * 0.17), rot + k, rot + k + 4.2);
        ctx.stroke();
      }
      circ(ctx, hx0, hy0, hr * 0.22, '#c8ccd6');
    }
    // 번호판
    ctx.fillStyle = '#f4f0e0';
    ctx.beginPath();
    ctx.roundRect(X(0.465), Y(1.27), R(0.07), R(0.022), R(0.004));
    ctx.fill();
    ctx.fillStyle = '#c8262e';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillText('119', X(0.5), Y(1.282));
    // 물대포 받침 · 고양이 · 물대포
    const mood = s.phase === 'result' ? (s.ok ? 2 : 5) : s.down && s.tank < 1 ? 4 : cells.some((a) => a.k === HOUSE && a.f > 0 && a.fuel / a.max < 0.6) ? 3 : s.down ? 1 : t - s.lastOut < 50 ? 2 : 0;
    const catU = R(0.056);
    drawCat(ctx, X(0.395), Y(1.1), catU, mood, t, (tip.x - X(0.395)) / R(0.2), (tip.y - Y(1.0)) / R(0.2));
    ell(ctx, cannon.x, cannon.y + R(0.012), R(0.03), R(0.013), '#4a4a58');
    ctx.save();
    ctx.translate(cannon.x, cannon.y);
    ctx.rotate(am.a);
    const cg = ctx.createLinearGradient(0, -R(0.016), 0, R(0.016));
    cg.addColorStop(0, '#fff0a0');
    cg.addColorStop(0.5, '#e0a830');
    cg.addColorStop(1, '#8a5a10');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.roundRect(-R(0.014), -R(0.017), tipLen + R(0.006), R(0.034), R(0.01));
    ctx.fill();
    ctx.fillStyle = '#c88a20';
    ctx.fillRect(tipLen - R(0.01), -R(0.021), R(0.016), R(0.042));
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(0, -R(0.011), tipLen - R(0.012), R(0.005));
    ctx.restore();
    circ(ctx, cannon.x, cannon.y, R(0.016), '#6a6a78');
    // 고양이 앞발 (손잡이 쥠)
    circ(ctx, cannon.x - R(0.022), cannon.y + R(0.008), R(0.013), '#f6b46a');
    // 구경꾼
    const cheer = t - s.lastOut < 60 || (s.phase === 'result' && s.ok), worry = mood === 3;
    drawFolk(ctx, X(0.115), Y(1.3), R(0.055), 0, cheer ? 1 : worry ? 2 : 0, t, 1);
    drawFolk(ctx, X(0.885), Y(1.3), R(0.055), 1, cheer ? 1 : worry ? 2 : 0, t + 20, -1);
    // 구한 동물들 (소방차 옆에 앉음)
    let k2 = 0;
    for (const p of s.pets)
      if (p.st === 1 && t - p.t > 70) drawPet(ctx, X(0.235 + k2++ * 0.05), Y(1.205) - Math.abs(Math.sin(t * 0.12 + k2)) * R(0.01), R(0.11), p.kind, 0, t + p.kind * 5, true);
  }

  // 저녁 그늘 (먼 쪽이 어둡다) · 가장자리 어둡게
  {
    const eg = ctx.createLinearGradient(0, Y(GY0), 0, Y(1.05));
    eg.addColorStop(0, 'rgba(40,20,70,.32)');
    eg.addColorStop(1, 'rgba(40,20,70,0)');
    ctx.fillStyle = eg;
    ctx.fillRect(-12, Y(GY0), w + 24, Y(1.05 - GY0));
    const vg = ctx.createRadialGradient(w / 2, Y(0.75), R(0.45), w / 2, Y(0.75), R(1.0));
    vg.addColorStop(0, 'rgba(20,10,40,0)');
    vg.addColorStop(1, 'rgba(20,10,40,.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(-12, -12, w + 24, h + 24);
  }
  // ═════ 불빛 (둘레를 붉게) ═════
  if (glow > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < NC; i++) {
      const a = cells[i];
      if (a.f <= 0) continue;
      const x = SX(ccx(i), ccy(i)), y = SY(ccy(i)) - cu(ccy(i)) * 0.3, rr = cu(ccy(i)) * (1.1 + Math.min(2, a.f) * 0.5) * (1 + 0.05 * Math.sin(t * 0.3 + i));
      const lg = ctx.createRadialGradient(x, y, 0, x, y, rr);
      lg.addColorStop(0, `rgba(255,110,40,${0.22 * Math.min(1.5, a.f)})`);
      lg.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.restore();
  }

  // 1판 첫 꾹 전: 손가락 그림 + 한 줄
  if (s.stage === 0 && s.firstPressT < 0 && s.phase === 'play') {
    let fi = -1;
    for (let i = 0; i < NC; i++) if (cells[i].f > 0 && (fi < 0 || ccy(i) > ccy(fi))) fi = i;
    if (fi >= 0) {
      const px = SX(ccx(fi), ccy(fi)), py = SY(ccy(fi)) - cu(ccy(fi)) * 0.3, pulse = (t % 50) / 50;
      ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, R(0.03 + pulse * 0.07), 0, Math.PI * 2);
      ctx.stroke();
      const hx = px + R(0.035), hy = py + R(0.05) + Math.sin(t * 0.15) * R(0.008);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(-0.4);
      ctx.fillStyle = '#ffe0c8';
      ctx.strokeStyle = '#5a3a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-R(0.012), -R(0.06), R(0.024), R(0.07), R(0.012));
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-R(0.03), -R(0.005), R(0.062), R(0.05), R(0.018));
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      font(0.042, 900);
      ctx.textAlign = 'center';
      const msg = '꾹 누르면 물대포!', mw = ctx.measureText(msg).width + R(0.04), my = py - R(0.15);
      ctx.fillStyle = 'rgba(30,20,50,.9)';
      ctx.beginPath();
      ctx.roundRect(clamp(px - mw / 2, 4, w - mw - 4), my - R(0.027), mw, R(0.054), R(0.027));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(msg, clamp(px, mw / 2 + 4, w - mw / 2 - 4), my + 1);
    }
  }

  // NEW 스포트라이트 (판의 새것)
  if (s.phase === 'play' && s.stageT < CARD_T + 90 && d.key && d.key !== 'first') {
    const spots: { x: number; y: number; r: number }[] = [];
    if (d.key === 'barrel' || d.key === 'oil') for (const b of s.things) if (b.alive && (d.key === 'barrel' ? b.k === 0 : b.k === 1)) spots.push({ x: SX(b.x, b.y), y: SY(b.y) - cu(b.y) * 0.2, r: cu(b.y) * 0.45 });
    if (d.key === 'pet') for (const p of s.pets) if (p.st === 0) spots.push({ x: SX(p.c + 0.5, p.r + 0.63), y: SY(p.r + 0.63) - cu(p.r + 0.63) * 0.7, r: cu(p.r) * 0.4 });
    if (d.key === 'imp' && s.imp && s.imp.st === 0) spots.push({ x: SX(s.imp.x, s.imp.y), y: SY(s.imp.y) - cu(s.imp.y) * 0.4, r: cu(s.imp.y) * 0.5 });
    if (d.key === 'big') for (let i = 0; i < NC; i++) if (cells[i].k === BARN) spots.push({ x: SX(ccx(i), ccy(i)), y: SY(ccy(i)) - cu(ccy(i)) * 0.4, r: cu(ccy(i)) * 0.7 });
    if (d.key === 'ember') for (const e of s.embers) spots.push({ x: SX(e.c + 0.5, e.r + 0.5), y: SY(e.r + 0.5), r: cu(e.r) * 0.5 });
    for (const sp of spots) {
      const pul = 1 + 0.12 * Math.sin(t * 0.25);
      ctx.strokeStyle = '#fff27a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r * pul, 0, Math.PI * 2);
      ctx.stroke();
      font(0.032, 900);
      const tw = ctx.measureText('NEW').width + R(0.02), ty = sp.y - sp.r * pul - R(0.022);
      ctx.fillStyle = '#ff4a6a';
      ctx.beginPath();
      ctx.roundRect(sp.x - tw / 2, ty - R(0.019), tw, R(0.036), R(0.012));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEW', sp.x, ty);
    }
    if (d.key === 'wind') {
      // 바람 화살 (하늘을 가로질러)
      const dir = Math.sign(s.wind);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        const ph = ((t * 2 + k * 60) % 180) / 180, xx = dir > 0 ? X(-0.1 + ph * 1.2) : X(1.1 - ph * 1.2), yy = Y(0.22 + k * 0.04);
        ctx.beginPath();
        ctx.moveTo(xx - dir * R(0.08), yy);
        ctx.quadraticCurveTo(xx - dir * R(0.03), yy - R(0.015), xx, yy);
        ctx.stroke();
      }
    }
  }

  // ═════ 사건 연출 ═════
  const seenT = fx.memo.t ?? -1;
  const pop = (x: number, y: number, text: string, col: string, size: number) => fx.pop(clamp(x, w * 0.16, w * 0.84), Math.max(Y(0.47), y), text, col, size);
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = SX(e.x, e.y), y = SY(e.y) - cu(e.y) * 0.5;
    const puff = (n: number, sz: number) => {
      for (let k = 0; k < n; k++) steam!.push({ x: x + (hsh(e.t + k) - 0.5) * R(0.06), y, t: t + k * 2, s: sz * (0.7 + hsh(k + e.t * 3) * 0.6), vx: (hsh(k * 7 + e.t) - 0.5) * 0.3 + windDraw * 0.4 });
    };
    if (e.kind === 'hiss') {
      const n = e.n ?? 1, first = s.outs <= 1;
      fx.burst(x, y, '#ffffff', 14 + n * 3, 3 + n * 0.3, 2.4);
      fx.burst(x, y, '#9fe3ff', 10, 2.6, 2);
      fx.ring(x, y, '#ffffff', R(0.06 + Math.min(0.08, n * 0.012)), 3);
      fx.kick(first ? 5 : 1.5 + Math.min(4, n * 0.7));
      puff(first ? 7 : 4, first ? 1.5 : 1);
      if (first) fx.blink('#e8f8ff', 0.22), pop(x, y - R(0.06), '칙! 꺼졌다!', '#ffffff', 22);
      else pop(x, y - R(0.05), e.text!, n >= 3 ? '#ffe66a' : '#e8f8ff', Math.min(26, 15 + n * 2));
    }
    if (e.kind === 'hissb') fx.burst(x, y, '#ffffff', 12, 3, 2.2), puff(3, 1.1);
    if (e.kind === 'burst') {
      fx.burst(x, y, '#5cc8ff', 40, 5.5, 3.2);
      fx.burst(x, y, '#ffffff', 30, 4.5, 2.6);
      fx.ring(x, y, '#bff3ff', R(0.2), 6);
      fx.ring(x, y, '#ffffff', R(0.12), 4);
      fx.kick(9);
      fx.blink('#d8f4ff', 0.3);
      puff(10, 1.6);
      pop(x, y - R(0.08), e.text!, '#9ff0ff', 24);
    }
    if (e.kind === 'collapse') fx.burst(x, y, '#2a2028', 30, 4, 3), fx.burst(x, y, '#ff8a3a', 22, 4, 2.4), fx.kick(10), fx.blink(th.hot, 0.2), pop(x, y - R(0.06), e.text!, '#ffb3a0', 20);
    if (e.kind === 'ignite') fx.burst(x, y, '#ffa03a', 6, 1.6, 1.8);
    if (e.kind === 'emberhit') fx.burst(x, y, '#ff8a3a', 14, 2.6, 2.2), fx.kick(2), pop(x, y - R(0.05), '앗, 불똥!', '#ffc08a', 15);
    if (e.kind === 'fizzle') fx.burst(x, y, '#ffffff', 16, 2.6, 2.2), fx.ring(x, y, '#9fe8ff', R(0.07), 3), puff(4, 1), fx.kick(2), pop(x, y - R(0.05), e.text!, '#9ff0ff', 17);
    if (e.kind === 'puff') fx.burst(x, y, '#ffb06a', 5, 1.2, 1.4);
    if (e.kind === 'boom') fx.burst(x, y, '#ff7a2a', 50, 6, 3.4), fx.burst(x, y, '#2a1a1a', 20, 4, 3), fx.ring(x, y, '#ffb43a', R(0.2), 6), fx.kick(13), fx.blink('#ffb35a', 0.35), pop(x, y - R(0.08), e.text!, '#ffb34a', 24);
    if (e.kind === 'splat') fx.burst(x, y, '#ff8a2a', 10, 3, 2), pop(x, y - R(0.05), e.text!, '#ffb07a', 14);
    if (e.kind === 'plop') fx.burst(x, y, '#7ad0ff', 22, 3.4, 2.4), fx.ring(x, y, '#bff3ff', R(0.08), 3), fx.kick(3), pop(x, y - R(0.05), e.text!, '#bff3ff', 17);
    if (e.kind === 'shove') pop(x, y - R(0.05), e.text!, '#dff6ff', 14);
    if (e.kind === 'bonk') fx.kick(2), pop(x, y - R(0.04), e.text!, '#ffe0b0', 13);
    if (e.kind === 'rescue') fx.burst(x, y, '#ff8ab0', 22, 3.6, 2.6), fx.burst(x, y, '#ffffff', 10, 2.4, 2), fx.kick(3), pop(x, y - R(0.07), e.text!, '#ffb3cf', 20);
    if (e.kind === 'flee') fx.burst(x, y, '#8a8494', 12, 2, 2.4), pop(x, y - R(0.06), e.text!, '#cfc8d8', 14);
    if (e.kind === 'imphit') fx.burst(x, y, '#ffffff', 6, 2, 1.8), pop(x, y - R(0.06), e.text!, '#ffe0a0', 14);
    if (e.kind === 'catch') fx.burst(x, y, '#ffffff', 36, 5, 3), fx.burst(x, y, '#ffb43a', 20, 4, 2.4), fx.ring(x, y, '#ffffff', R(0.14), 5), fx.kick(8), fx.blink('#fff6d0', 0.25), puff(8, 1.4), pop(x, y - R(0.08), e.text!, '#ffe66a', 22);
    if (e.kind === 'impgone' || e.kind === 'impin' || e.kind === 'impfizz') pop(x, y - R(0.07), e.text!, '#ffc08a', 15);
    if (e.kind === 'implight') fx.burst(x, y, '#ffa03a', 10, 2.4, 2), pop(x, y - R(0.06), '히히!', '#ffb07a', 14);
    if (e.kind === 'dry') fx.kick(2), pop(X(0.5), Y(1.0), e.text!, '#ffb3a8', 16);
    if (e.kind === 'clear') {
      for (let k = 0; k < 5; k++) fx.burst(X(0.15 + k * 0.175), Y(0.5 + (k % 2) * 0.15), ['#ffe066', '#9ff0ff', '#ff9ec4'][k % 3], 30, 5.5, 3);
      fx.ring(X(0.5), Y(0.7), '#ffe066', R(0.45), 7);
      fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') fx.kick(7), fx.blink('#ffe0b0', 0.12);
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════════ HUD ═════════════
  ctx.textBaseline = 'middle';
  // 위 띠
  {
    const hb = R(0.085);
    const g = ctx.createLinearGradient(0, 0, 0, hb);
    g.addColorStop(0, 'rgba(36,24,64,.95)');
    g.addColorStop(1, 'rgba(24,16,44,.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, hb, [0, 0, R(0.03), R(0.03)]);
    ctx.fill();
    // 판 번호 동그라미
    const bx = R(0.055), byc = hb / 2;
    circ(ctx, bx, byc, R(0.03), '#ff6a3d');
    ctx.fillStyle = '#ffffff';
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), bx, byc + 1);
    ctx.textAlign = 'left';
    font(0.042, 900);
    ctx.fillText(d.name, R(0.1), byc + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.032, 800);
    ctx.fillStyle = th.muted;
    ctx.fillText(`/${STAGE_COUNT}`, R(0.105) + nw, byc + 2);
    // 집 아이콘 (무너지면 회색, 타면 빨갛게 깜빡)
    const hs = s.cells.map((a, i) => ({ a, i })).filter((q) => q.a.k === HOUSE);
    let hx = R(0.43);
    for (const { a } of hs) {
      const st = a.burnt ? 2 : a.f > 0 ? 1 : 0, sz = R(0.022);
      ctx.fillStyle = st === 2 ? '#5a5466' : st === 1 ? (t % 16 < 8 ? '#ff4a3a' : '#ffb43a') : '#ffe7b8';
      ctx.beginPath();
      ctx.moveTo(hx - sz, byc + sz * 0.9);
      ctx.lineTo(hx - sz, byc - sz * 0.1);
      ctx.lineTo(hx, byc - sz);
      ctx.lineTo(hx + sz, byc - sz * 0.1);
      ctx.lineTo(hx + sz, byc + sz * 0.9);
      ctx.closePath();
      ctx.fill();
      if (st === 2) {
        ctx.strokeStyle = '#ff6a5a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx - sz * 0.7, byc - sz * 0.5);
        ctx.lineTo(hx + sz * 0.7, byc + sz * 0.7);
        ctx.stroke();
      }
      hx += R(0.055);
    }
    // 하트 · 별
    ctx.textAlign = 'right';
    font(0.04, 900);
    const stt = String(s.stars), sw2 = ctx.measureText(stt).width;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText(stt, w - R(0.03), byc + 1);
    starPath(ctx, w - R(0.05) - sw2, byc, R(0.02));
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      heartPath(ctx, w - R(0.1) - sw2 - k * R(0.052), byc, R(0.019));
      ctx.fillStyle = k < s.hearts ? '#ff5a6a' : 'rgba(255,255,255,.18)';
      ctx.fill();
    }
  }
  // 새것 알림 띠
  if (s.news && s.t - s.news.t < NEWS_T && s.phase === 'play' && s.pt >= CARD_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(0.125) + drop;
    ctx.fillStyle = 'rgba(30,20,56,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = '#ffd59a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 끝 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '마을을 다 지켰다!' : '불 다 껐다!'), (sub = `${s.lost ? `집 ${s.lost}채 무너짐` : '집 하나도 안 탐'} · 별 ${s.got}개`), (col = '#ffd84a');
      else (head = s.why), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 고양이 소방관, 수고했어요!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}판 ${d.name}` : `${s.stage + 1}판 · ${d.name}`;
      sub = `불을 다 끄면 끝 · 집 ${s.limit}채 무너지면 다시`;
      nw = d.news || `새 별: ${d.star3}`;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(0.2), ch = nw ? 0.16 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.shadowColor = 'rgba(0,0,0,.4)';
      ctx.shadowBlur = R(0.03);
      ctx.shadowOffsetY = R(0.008);
      ctx.fillStyle = 'rgba(30,20,56,.94)';
      ctx.beginPath();
      ctx.roundRect(-R(0.45), -R(0.06), R(0.9), R(ch), R(0.04));
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.05, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.058), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.02));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pp = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.02));
          ctx.scale(pp, pp);
          starPath(ctx, 0, 0, R(0.025));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.02), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.02), R(0.84));
      ctx.fillStyle = '#fff6e8';
      font(0.037, 800);
      ctx.fillText(sub, 0, R(0.028), R(0.84));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, R(0.072), R(0.86));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 별 셋 · 안내 ═════════════
  {
    const ty = 1.36, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(36,24,64,.97)');
    g.addColorStop(1, 'rgba(20,14,38,.99)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    const res = s.phase === 'result' && s.ok;
    const k3 = d.key;
    const prog =
      k3 === 'first'
        ? `${s.cells.filter((a) => a.k === TREE && !a.burnt).length}/${s.trees}그루`
        : k3 === 'ember'
          ? `${Math.min(2, s.prewet)}/2`
          : k3 === 'barrel'
            ? `${Math.min(1, s.barrelOut)}/1`
            : k3 === 'pet'
              ? `${s.petsSaved}/${s.pets.length}`
              : k3 === 'big'
                ? `물 ${Math.round((s.tank / TANK) * 100)}%`
                : '';
    const okNow = [res ? s.starOk[0] : false, res ? s.starOk[1] : false, res ? s.starOk[2] : (k3 === 'ember' && s.prewet >= 2) || (k3 === 'barrel' && s.barrelOut >= 1) || (k3 === 'imp' && s.impCaught)];
    const bad = [s.phase === 'result' && !s.ok, s.lost > 0, star3Bad(s)];
    const labels = ['마을 지키기', '집 하나도 안 타게', d.star3];
    const right = [`집 ${s.houses - s.lost}/${s.houses}`, s.lost ? '' : '지키는 중', prog];
    for (let k = 0; k < 3; k++) {
      const ry = Y(ty + 0.038 + k * 0.052), x0 = R(0.03), x1 = w - R(0.03);
      ctx.fillStyle = okNow[k] ? 'rgba(255,216,74,.2)' : bad[k] ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.06)';
      ctx.beginPath();
      ctx.roundRect(x0, ry - R(0.022), x1 - x0, R(0.044), R(0.022));
      ctx.fill();
      starPath(ctx, x0 + R(0.03), ry, R(0.017));
      ctx.fillStyle = okNow[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.4)';
      ctx.fill();
      if (bad[k]) {
        ctx.strokeStyle = '#ff7a6a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + R(0.016), ry - R(0.014));
        ctx.lineTo(x0 + R(0.044), ry + R(0.014));
        ctx.stroke();
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = okNow[k] ? '#fff2c0' : bad[k] ? 'rgba(255,255,255,.4)' : '#f4ecff';
      font(0.037, 900);
      ctx.fillText(labels[k], x0 + R(0.06), ry + 1);
      if (right[k]) {
        ctx.textAlign = 'right';
        font(0.034, 800);
        ctx.fillStyle = bad[k] ? 'rgba(255,255,255,.35)' : '#c9b8e6';
        ctx.fillText(right[k], x1 - R(0.02), ry + 1);
      }
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && s.firstPressT < 0 && s.phase === 'play';
    if (first) hint = '불붙은 나무를 꾹 — 물대포가 쏴아!';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 불을 껐어요! 고양이 소방관 최고' : `별 ${s.got}개! 다음 판엔 새것이 나와요`) : '물이 바닥나기 전에 떼고, 번지는 길목부터!';
    else if (s.down && s.tank < 1) hint = '물이 바닥! 손을 떼면 다시 차요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.04 : 0.036, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.205), w - R(0.05));
  }
}
