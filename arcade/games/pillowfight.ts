/**
 * 베개 싸움 (24라운드: 새 장르) — 자동 전투 × 가리키기(톡) × 턴제화.
 * 기준 9(손이 하는 일은 하나): 침실의 반짝이는 자리를 톡 = 다음 아이가 그 자리로 폴짝. 누르고 있는 동안
 *   그 자리에서 던질 화살표·맞힐 상대(빨강)·나를 맞힐 상대(주황)가 보이고, 떼면 놓인다.
 * 와우: 잠옷 입은 우리 편을 톡톡 놓으면 불이 꺼지고 베개 싸움이 저절로 벌어진다 — 깃털이 펑펑, 마지막엔 아빠가 문을 연다.
 * 규칙(결정적, 칸 정수): 아이는 박자마다 화살표 방향 줄에서 가장 가까운 상대에게 베개를 던진다(바닥 2칸, 침대·옷장 위 3칸).
 *   맞으면 하트 -1, 셋 맞으면 '졌다~' 하고 눕는다. 놓자마자 한 번 '기습 베개'를 던진다(상대는 불 꺼진 뒤부터 던진다).
 * 판: 우리 편 손패 3~5명을 다 놓으면 불이 꺼지고 자동 싸움. 상대를 다 눕히면 통과.
 *   ★ 이김 · ★ 우리 편 아무도 안 누움 · ★ 보너스(곰 인형 지키기 / N박자 안에). 지면 하트 -1, 그 판 다시. 하트 셋 또는 8판이면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 침대(높은 곳)·곰 인형 → 2판 이불 방어(대신 맞아 주기) → 3판 쌍둥이(나란히 = 같이 던짐)
 *   → 4판 큰 베개 형(두 칸 꿰뚫기 — 겹친 줄 찾기) → 5판 아빠 순찰(문 앞 칸은 3박자마다 걸림) → 6판 쿠션 요새(바닥 베개를 막음 — 높은 데서 넘겨 던지기)
 *   → 7판 졸린 아이(한 박자씩 꾸벅) → 8판 강아지 난입(발자국 길 위의 아이를 핥아 박자를 멈춤).
 * 웃음: 맞으면 깃털이 펑 터지고 머리가 산발, 진 아이는 '쿨쿨' 자는 척, 이긴 편은 침대에서 방방. 끝에 아빠가 문을 열면 모두 이불 속으로 쏙.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.46;
export const COLS = 5, ROWS = 5, NC = COLS * ROWS;
/** 던지는 거리: 바닥 · 높은 곳 */
export const RANGE = 2, RANGE_HI = 3;
const MAXB = 12, DAD_EVERY = 3;
/** 칸 성질 */
const SPOT = 1, HIGH = 2, FORT = 4, DOOR = 8, TOY = 16, TEDDY = 32, BED = 64, WARD = 128;
/** 시간(틱) */
const HOP = 10, FLY = 15, LOCK = 30, LIGHTS = 50, BEAT = 50, FIRST_BEAT = 6, END_T = 118, RESULT_OK = 150, RESULT_FAIL = 130, NEWS_T = 200;
const STAR_PTS = 100, WIN_PTS = 100;

export type Kind = 'kid' | 'tiny' | 'blanket' | 'twin' | 'big' | 'sleepy';
const HP: Record<Kind, number> = { kid: 3, tiny: 1, blanket: 3, twin: 3, big: 3, sleepy: 3 };
/** 위 · 오른쪽 · 아래 · 왼쪽 */
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

type Foe = [number, number, 'v' | '<' | '>' | '^', Kind];
interface StageDef {
  key: string; name: string; news: string; tip: string;
  /** 5줄 × 5칸. '.' 바닥 · 'o' 방석(자리) · 'B' 침대(자리, 높음) · 'W' 옷장 위(자리, 높음) · 'F' 쿠션 요새 · 'd' 문 앞 자리 · ':' 문 앞 바닥 · 't' 곰 인형 · 'x' 장난감 상자 */
  map: string[];
  foes: Foe[];
  hand: Kind[];
  bonus: 'teddy' | 'fast';
  fast?: number;
  /** 강아지 발자국 길 [c, r] */
  route?: [number, number][];
}

export const STAGES: StageDef[] = [
  {
    key: 'start', name: '첫 베개 싸움', news: '🛏️ 침대 위에선 한 칸 더 멀리 던져요!', tip: '👆 침대를 톡 — 앞의 상대에게 퍽!',
    map: ['x...x', '.....', '...o.', '.B.t.', '.B.W.'],
    foes: [[1, 1, 'v', 'tiny'], [3, 1, 'v', 'kid']],
    hand: ['kid', 'kid', 'kid'], bonus: 'teddy',
  },
  {
    key: 'blanket', name: '이불 방어', news: '🧣 이불 두른 아이 — 첫 베개를 한 번 막아요', tip: '🧣 이불 아이를 앞에 세우면 대신 맞아 줘요',
    map: ['.....', '.....', '.o.o.', '..o..', 'BB.ot'],
    foes: [[1, 0, 'v', 'kid'], [3, 1, 'v', 'blanket'], [2, 1, 'v', 'kid']],
    hand: ['blanket', 'kid', 'kid'], bonus: 'teddy',
  },
  {
    key: 'twin', name: '쌍둥이', news: '👯 쌍둥이 — 나란히 놓으면 같이 던져요(2번 맞힘)', tip: '👯 두 번째 쌍둥이는 첫째 바로 옆에!',
    map: ['.....', '.....', 'o.o.o', '.o.o.', 'oBB.o'],
    foes: [[0, 0, 'v', 'kid'], [2, 0, 'v', 'blanket'], [4, 1, 'v', 'kid'], [1, 1, '>', 'kid']],
    hand: ['twin', 'twin', 'kid', 'kid'], bonus: 'fast', fast: 3,
  },
  {
    key: 'big', name: '큰 베개 형', news: '💪 큰 베개 형 — 두 박자에 한 번, 앞 두 칸을 같이 맞혀요', tip: '💪 상대가 한 줄로 겹친 곳에 큰 형을!',
    map: ['.....', '.....', 'o.o..', '..o.o', 'Bo..o'],
    foes: [[0, 0, 'v', 'kid'], [0, 1, 'v', 'kid'], [2, 1, 'v', 'blanket'], [4, 0, 'v', 'big'], [3, 1, '<', 'kid']],
    hand: ['big', 'kid', 'blanket', 'kid'], bonus: 'teddy',
  },
  {
    key: 'dad', name: '아빠 순찰', news: '🚪 아빠 순찰 — 문 앞 칸은 3박자마다 걸려요!', tip: '🚪 문 앞 빛 칸은 3박자째에 아빠한테 딱!',
    map: ['..:..', '..:..', 'o.d.o', '.od..', 'BBd.o'],
    foes: [[2, 0, 'v', 'kid'], [0, 0, 'v', 'blanket'], [4, 1, 'v', 'kid'], [1, 1, 'v', 'kid'], [3, 0, '<', 'kid']],
    hand: ['kid', 'twin', 'twin', 'big', 'blanket'], bonus: 'fast', fast: 3,
  },
  {
    key: 'fort', name: '쿠션 요새', news: '🏰 쿠션 요새 — 바닥에서 던진 베개를 막아요. 높은 데선 넘겨요!', tip: '🏰 요새 너머는 침대·옷장 위에서!',
    map: ['.....', '.....', '.FoF.', 'o..o.', 'BB.WW'],
    foes: [[1, 0, 'v', 'kid'], [3, 1, 'v', 'blanket'], [0, 1, 'v', 'big'], [4, 0, 'v', 'kid'], [2, 1, 'v', 'kid']],
    hand: ['kid', 'blanket', 'kid', 'big', 'kid'], bonus: 'teddy',
  },
  {
    key: 'sleepy', name: '졸린 아이', news: '😪 졸린 아이 — 한 박자씩 꾸벅 졸아요', tip: '😪 졸린 상대 줄은 덜 위험해요',
    map: ['.....', '.....', 'o.o.o', '.o.o.', 'BB.Wt'],
    foes: [[0, 0, 'v', 'sleepy'], [1, 1, 'v', 'kid'], [2, 0, 'v', 'big'], [3, 1, 'v', 'sleepy'], [4, 0, 'v', 'blanket']],
    hand: ['sleepy', 'kid', 'twin', 'twin', 'blanket'], bonus: 'teddy',
  },
  {
    key: 'dog', name: '강아지 난입', news: '🐶 강아지 — 발자국 칸의 아이를 핥아 박자를 멈춰요', tip: '🐶 발자국 길 위에 서면 간질간질 — 못 던져요',
    map: ['.....', '.....', 'o.o.o', 'o.o.o', 'BB.WW'],
    foes: [[0, 0, 'v', 'blanket'], [1, 1, 'v', 'kid'], [2, 0, 'v', 'big'], [3, 1, 'v', 'kid'], [4, 0, 'v', 'sleepy']],
    hand: ['kid', 'twin', 'twin', 'big', 'blanket'], bonus: 'fast', fast: 4,
    route: [[0, 2], [1, 3], [2, 2], [3, 3], [4, 2], [3, 3], [2, 2], [1, 3]],
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────── 판 (변하지 않는 것) ─────────
interface Field {
  def: StageDef; cell: number[]; spots: number[]; teddy: number; route: number[]; door: boolean; mirror: boolean;
  foes: { c: number; r: number; dir: number; kind: Kind }[];
}
function makeField(d: StageDef, mirror: boolean): Field {
  const cell = new Array(NC).fill(0);
  let teddy = -1, door = false;
  const mc = (c: number) => (mirror ? COLS - 1 - c : c);
  for (let r = 0; r < ROWS; r++)
    for (let c0 = 0; c0 < COLS; c0++) {
      const ch = d.map[r][c0], i = r * COLS + mc(c0);
      const f = ch === 'o' ? SPOT : ch === 'B' ? SPOT | HIGH | BED : ch === 'W' ? SPOT | HIGH | WARD : ch === 'F' ? FORT : ch === 'd' ? SPOT | DOOR : ch === ':' ? DOOR : ch === 't' ? TEDDY : ch === 'x' ? TOY : 0;
      cell[i] = f;
      if (ch === 't') teddy = i;
      if (f & DOOR) door = true;
    }
  const dirOf = (ch: string) => {
    const d0 = ch === '^' ? 0 : ch === '>' ? 1 : ch === 'v' ? 2 : 3;
    return mirror && (d0 === 1 || d0 === 3) ? 4 - d0 : d0;
  };
  const foes = d.foes.map(([c, r, ch, kind]) => ({ c: mc(c), r, dir: dirOf(ch), kind }));
  for (const f of foes) cell[f.r * COLS + f.c] &= ~SPOT;
  const spots: number[] = [];
  for (let i = 0; i < NC; i++) if (cell[i] & SPOT) spots.push(i);
  const route = (d.route ?? []).map(([c, r]) => r * COLS + mc(c));
  return { def: d, cell, spots, teddy, route, door, mirror, foes };
}

// ───────── 싸움 (움직이는 것, 복사해서 내다본다) ─────────
export interface Kid { team: 0 | 1; c: number; r: number; dir: number; kind: Kind; hp: number; sh: number; out: 0 | 1 | 2; pair: number; hitN: number }
interface Sim { kids: Kid[]; ted: number; beat: number; hi: number; caught: number }
/** 베개 하나 (from 아이 → to 칸). tk: 맞는 아이(-2 곰 인형, -1 요새에 막힘) */
export interface Throw { from: number; to: number; tk: number; joint: boolean; pierce: boolean }

const cloneSim = (S: Sim): Sim => ({ kids: S.kids.map((k) => ({ ...k })), ted: S.ted, beat: S.beat, hi: S.hi, caught: S.caught });
function occOf(S: Sim): Int8Array {
  const o = new Int8Array(NC).fill(-1);
  S.kids.forEach((k, i) => {
    if (!k.out) o[k.r * COLS + k.c] = i;
  });
  return o;
}
const rangeOf = (F: Field, k: Kid) => (F.cell[k.r * COLS + k.c] & HIGH ? RANGE_HI : RANGE);
/** 화살표 줄에서 가장 가까운 상대 — {칸, 맞는 아이, 거리} · 요새에 막히면 tk -1 · 없으면 null */
function scan(F: Field, S: Sim, occ: Int8Array, k: Kid, from = 1, reach = 0): { cell: number; tk: number; d: number } | null {
  const high = F.cell[k.r * COLS + k.c] & HIGH, R = reach || (high ? RANGE_HI : RANGE);
  for (let i = from; i <= R; i++) {
    const c = k.c + DX[k.dir] * i, r = k.r + DY[k.dir] * i;
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    const ci = r * COLS + c;
    if (F.cell[ci] & FORT && !high) return { cell: ci, tk: -1, d: i };
    const o = occ[ci];
    if (o >= 0 && S.kids[o].team !== k.team) return { cell: ci, tk: o, d: i };
    if (k.team === 1 && ci === F.teddy && S.ted > 0) return { cell: ci, tk: -2, d: i };
  }
  return null;
}
function mateOf(S: Sim, i: number): number {
  const k = S.kids[i];
  if (k.kind !== 'twin' || k.out) return -1;
  for (let j = 0; j < S.kids.length; j++) {
    const m = S.kids[j];
    if (j !== i && m.kind === 'twin' && m.team === k.team && m.pair === k.pair && !m.out && m.r === k.r && Math.abs(m.c - k.c) === 1) return j;
  }
  return -1;
}
/** 이번 박자에 쉬는가 (졸린 아이: 짝수 박자 꾸벅 · 큰 형: 홀수 박자 숨 고르기 · 강아지가 핥음). beat 0 = 기습 베개 */
function rests(F: Field, S: Sim, i: number, beat: number): 0 | 1 | 2 | 3 {
  if (beat === 0) return 0;
  const k = S.kids[i];
  if (F.route.length && F.route[(beat - 1) % F.route.length] === k.r * COLS + k.c) return 3;
  if (k.kind === 'sleepy' && beat % 2 === 0) return 1;
  if (k.kind === 'big' && beat % 2 === 1) return 2;
  return 0;
}
/** 한 아이(또는 쌍둥이 짝)의 베개들 */
function throwsOf(F: Field, S: Sim, occ: Int8Array, i: number, beat: number, out: Throw[], done: Uint8Array) {
  if (done[i]) return;
  done[i] = 1;
  const k = S.kids[i];
  const m = mateOf(S, i);
  if (m >= 0 && !rests(F, S, m, beat)) {
    done[m] = 1;
    const a = scan(F, S, occ, k), b = scan(F, S, occ, S.kids[m]);
    const ta = a && a.tk !== -1 ? a : null, tb = b && b.tk !== -1 ? b : null;
    const t = ta && tb ? (tb.d < ta.d || (tb.d === ta.d && S.kids[m].c < k.c) ? tb : ta) : ta ?? tb;
    if (t) {
      out.push({ from: i, to: t.cell, tk: t.tk, joint: true, pierce: false });
      out.push({ from: m, to: t.cell, tk: t.tk, joint: true, pierce: false });
    } else {
      if (a) out.push({ from: i, to: a.cell, tk: -1, joint: false, pierce: false });
      if (b) out.push({ from: m, to: b.cell, tk: -1, joint: false, pierce: false });
    }
    return;
  }
  const t = scan(F, S, occ, k);
  if (!t) return;
  out.push({ from: i, to: t.cell, tk: t.tk, joint: false, pierce: false });
  if (k.kind === 'big' && t.tk !== -1) {
    // 큰 베개: 맞힌 칸 바로 뒤 한 칸도 (요새는 못 뚫는다)
    const t2 = scan(F, S, occ, k, t.d + 1, t.d + 1);
    if (t2 && t2.tk !== -1) out.push({ from: i, to: t2.cell, tk: t2.tk, joint: false, pierce: true });
  }
}
/** 박자 하나의 베개 목록 (모두 동시에) */
function beatThrows(F: Field, S: Sim, beat: number): Throw[] {
  const occ = occOf(S), out: Throw[] = [], done = new Uint8Array(S.kids.length);
  for (let i = 0; i < S.kids.length; i++) if (!S.kids[i].out && !rests(F, S, i, beat)) throwsOf(F, S, occ, i, beat, out, done);
  return out;
}
/** 기습 베개: 방금 놓인 아이 하나(쌍둥이 짝이면 둘이 같이) */
function openerThrows(F: Field, S: Sim, i: number): Throw[] {
  const out: Throw[] = [];
  throwsOf(F, S, occOf(S), i, 0, out, new Uint8Array(S.kids.length));
  return out;
}
/** 맞히기 — 동시에. 이불이 먼저 막는다. 돌려주는 값: 새로 누운 아이들 */
function applyThrows(S: Sim, th: Throw[]): number[] {
  const fell: number[] = [];
  for (const x of th) {
    if (x.tk === -2) S.ted = Math.max(0, S.ted - 1);
    if (x.tk < 0) continue;
    const k = S.kids[x.tk];
    if (k.sh > 0) k.sh--;
    else k.hp--;
    k.hitN++;
  }
  for (let i = 0; i < S.kids.length; i++) {
    const k = S.kids[i];
    if (!k.out && k.hp <= 0) (k.out = 1), fell.push(i);
  }
  return fell;
}
/** 아빠 순찰: 문 앞 칸에 서 있는 아이는 걸린다 */
function dadCatch(F: Field, S: Sim): number[] {
  const got: number[] = [];
  S.kids.forEach((k, i) => {
    if (!k.out && F.cell[k.r * COLS + k.c] & DOOR) (k.out = 2), got.push(i), k.team === 0 && S.caught++;
  });
  return got;
}
const dadBeat = (F: Field, b: number) => F.door && b > 0 && b % DAD_EVERY === 0;
/** 1 이김 · -1 짐 · 0 아직 */
function outcome(F: Field, S: Sim): number {
  let foes = 0, ours = 0;
  for (const k of S.kids) if (!k.out) k.team ? foes++ : ours++;
  if (!foes) return 1;
  if (!ours && S.hi >= F.def.hand.length) return -1;
  return 0;
}
/** 누가 누구든 맞힐 수 있나 (아니면 영원히 그대로 — 비김 = 짐) */
function anyTarget(F: Field, S: Sim): boolean {
  const occ = occOf(S);
  for (const k of S.kids) {
    if (k.out) continue;
    const t = scan(F, S, occ, k);
    if (t && t.tk !== -1) return true;
    if (k.kind === 'twin') {
      // 쌍둥이 짝은 짝의 줄로도 던진다
      const i = S.kids.indexOf(k), m = mateOf(S, i);
      if (m >= 0) {
        const t2 = scan(F, S, occ, S.kids[m]);
        if (t2 && t2.tk !== -1) return true;
      }
    }
  }
  return false;
}
function placeKid(F: Field, S: Sim, cell: number): number {
  const kind = F.def.hand[S.hi];
  // 쌍둥이 짝 번호: 손패에서 몇 번째 쌍둥이 쌍인가
  let pair = 0;
  for (let j = 0; j < S.hi; j++) if (F.def.hand[j] === 'twin') pair++;
  S.kids.push({ team: 0, c: cell % COLS, r: Math.floor(cell / COLS), dir: 0, kind, hp: HP[kind], sh: kind === 'blanket' ? 1 : 0, out: 0, pair: Math.floor(pair / 2), hitN: 0 });
  S.hi++;
  return S.kids.length - 1;
}
function freeSpots(F: Field, S: Sim): number[] {
  const occ = occOf(S);
  return F.spots.filter((p) => occ[p] < 0 && !S.kids.some((k) => k.r * COLS + k.c === p));
}
function startSim(F: Field): Sim {
  const kids: Kid[] = F.foes.map((f) => ({ team: 1, c: f.c, r: f.r, dir: f.dir, kind: f.kind, hp: HP[f.kind], sh: f.kind === 'blanket' ? 1 : 0, out: 0, pair: 9, hitN: 0 }));
  return { kids, ted: F.teddy >= 0 ? 1 : 0, beat: 0, hi: 0, caught: 0 };
}
/** 남은 싸움을 끝까지 (봇·미리 보기용). 결과: 1/-1 */
function fightOut(F: Field, S: Sim): number {
  let o = outcome(F, S);
  while (!o) {
    if (S.beat >= MAXB || !anyTarget(F, S)) return -1;
    S.beat++;
    applyThrows(S, beatThrows(F, S, S.beat));
    if (dadBeat(F, S.beat)) dadCatch(F, S);
    o = outcome(F, S);
  }
  return o;
}
/** 별 (이겼을 때만): [이김, 아무도 안 누움, 보너스] */
function starsOf(F: Field, S: Sim, won: boolean): [boolean, boolean, boolean] {
  if (!won) return [false, false, false];
  const safe = !S.kids.some((k) => k.team === 0 && k.out);
  const bonus = F.def.bonus === 'teddy' ? S.ted > 0 : S.beat <= (F.def.fast ?? 3);
  return [true, safe, bonus];
}

// ───────── 상태 ─────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
export interface PillowState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'place' | 'lights' | 'battle' | 'end' | 'result'; pt: number;
  F: Field; S: Sim; mirrors: Record<number, boolean>;
  down: boolean; ax: number; ay: number; hover: number; queued: number; lock: number; idle: number;
  /** 날아가는 베개들 · 떠난 틱 · 맞는 틱 · 몇 번째 박자(0 = 기습) */
  fly: Throw[]; flyT: number; hitT: number; flyBeat: number; placedT: number; placedI: number;
  /** 아이별 마지막으로 맞은 틱 · 쉰 이유 */
  hitAt: number[]; restAt: number[];
  result: number; why: string; got: number; gotStars: [boolean, boolean, boolean];
  hearts: number; stars: number; pts: number; tries: number; won: boolean; dead: boolean;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; endT: number; dadT: number;
}
const ev = (s: PillowState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: PillowState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: PillowState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

function newStage(s: PillowState) {
  const d = STAGES[s.stage];
  if (s.mirrors[s.stage] === undefined) s.mirrors[s.stage] = mulberry32((s.seed * 31 + s.stage * 7919 + 17) >>> 0)() < 0.5;
  s.F = makeField(d, s.mirrors[s.stage]);
  s.S = startSim(s.F);
  s.phase = 'place';
  s.pt = 0;
  s.fly = [];
  s.flyT = s.hitT = -1;
  s.hover = s.queued = -1;
  s.lock = 0;
  s.idle = 0;
  s.hitAt = s.S.kids.map(() => -999);
  s.restAt = s.S.kids.map(() => 0);
  s.result = 0;
  s.startT = s.t;
  s.placedT = -999;
  s.placedI = -1;
  see(s, d.key, d.news);
  if (d.bonus === 'teddy' && s.stage === 0) tip(s, 'teddy', '🧸 곰 인형이 안 맞으면 별 하나 더');
  ev(s, 'stage', 2, 3, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function endFight(s: PillowState, res: number, why: string) {
  s.phase = 'end';
  s.pt = 0;
  s.result = res;
  s.why = why;
  s.endT = s.t;
  s.fly = [];
  const st = starsOf(s.F, s.S, res > 0);
  s.gotStars = st;
  s.got = st.filter(Boolean).length;
}
function finish(s: PillowState) {
  s.phase = 'result';
  s.pt = 0;
  const d = STAGES[s.stage];
  if (s.result > 0) {
    s.stars += s.got;
    s.pts += s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 2, 3, `${s.stage + 1}판 통과! ${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`, '#fff1a8', s.got);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 2, 3, s.why, '#ffd0c8');
  }
  void d;
}

/** 놓기: 아이를 자리에 두고 기습 베개를 예약한다 */
function place(s: PillowState, cell: number) {
  const i = placeKid(s.F, s.S, cell);
  s.hitAt.push(-999);
  s.restAt.push(0);
  s.placedT = s.t;
  s.placedI = i;
  s.fly = openerThrows(s.F, s.S, i);
  s.flyT = s.t + HOP;
  s.hitT = s.t + HOP + FLY;
  s.flyBeat = 0;
  s.lock = s.t + LOCK;
  s.idle = 0;
  ev(s, 'hop', cell % COLS, Math.floor(cell / COLS));
  if (!s.fly.length) ev(s, 'none', cell % COLS, Math.floor(cell / COLS), '앞에 아무도 없네…', '#e6ecff');
  const k = s.S.kids[i];
  if (k.kind === 'twin' && mateOf(s.S, i) >= 0) ev(s, 'twinjoin', k.c, k.r, '쌍둥이 합체!', '#ffe0f6');
  if (s.F.cell[cell] & DOOR) tip(s, 'door', '🚪 문 앞 칸 — 3박자째에 아빠한테 걸려요!');
}
/** 베개가 닿는 순간 */
function land(s: PillowState) {
  const F = s.F, S = s.S, th = s.fly;
  const tedBefore = S.ted;
  const fell = applyThrows(S, th);
  for (const x of th) {
    if (x.tk >= 0) s.hitAt[x.tk] = s.t;
    const c = x.to % COLS, r = Math.floor(x.to / COLS);
    if (x.tk === -1) ev(s, 'fort', c, r, '퐁', '#ffe8f0');
    else if (x.tk === -2) ev(s, 'teddy', c, r, '솜 펑!', '#ffd6e8');
    else ev(s, 'hit', c, r, S.kids[x.tk].sh > 0 || (S.kids[x.tk].kind === 'blanket' && S.kids[x.tk].hitN === 1 && S.kids[x.tk].hp === HP.blanket) ? '이불 방어!' : x.joint ? '퍽퍽!' : x.pierce ? '퍽!!' : '퍽!', '#ffffff', x.tk);
  }
  if (tedBefore && !S.ted) tip(s, 'tedlost', '🧸 곰 인형 앞에 우리 편을 세우면 막아 줘요');
  for (const i of fell) {
    const k = S.kids[i];
    ev(s, 'fell', k.c, k.r, k.team ? '졌다~' : '으앙 졌다~', k.team ? '#ffe0a0' : '#ffd0c8', i);
  }
  if (th.some((x) => x.joint)) tip(s, 'joint', '👯 나란히 선 쌍둥이는 한 상대에게 같이 던져요');
  if (th.some((x) => x.pierce)) tip(s, 'pierce', '💪 큰 베개는 뒤에 선 아이까지 맞혀요');
  s.fly = [];
}

function nextBeat(s: PillowState) {
  const F = s.F, S = s.S;
  if (S.beat >= MAXB || !anyTarget(F, S)) return endFight(s, -1, S.kids.some((k) => k.team === 0 && !k.out) ? '서로 못 맞혀요 — 아빠 발소리!' : '우리 편이 다 졌다~');
  S.beat++;
  for (let i = 0; i < S.kids.length; i++) {
    const r = S.kids[i].out ? 0 : rests(F, S, i, S.beat);
    s.restAt[i] = r ? s.t : s.restAt[i];
    if (r === 3) ev(s, 'lick', S.kids[i].c, S.kids[i].r, '히히 간지러!', '#fff0c8', i);
    else if (r === 1) ev(s, 'doze', S.kids[i].c, S.kids[i].r, '쿨…', '#d8e0ff', i);
  }
  s.fly = beatThrows(F, S, S.beat);
  s.flyT = s.t;
  s.hitT = s.t + FLY;
  s.flyBeat = S.beat;
  ev(s, 'beat', 2, 3, '', '', S.beat);
}

/** 화면 좌표 → 칸 (화면 x 0~1, y 0~A) */
const FY0 = 0.4, FH = 0.72, WB = 0.8, WF = 0.98;
const vOf = (r: number) => r / ROWS;
const PXf = (u: number, v: number) => 0.5 + (u - 0.5) * (WB + (WF - WB) * v);
const PYf = (v: number) => FY0 + FH * v;
const SCf = (v: number) => 0.84 + 0.22 * v;
const RAISE_BED = 0.045, RAISE_WARD = 0.13;
const raiseOf = (f: number) => (f & WARD ? RAISE_WARD : f & BED ? RAISE_BED : 0);
/** 칸 c,r에 선 아이의 발 위치 (화면 0~1 · 0~A) */
function feet(F: Field, c: number, r: number): [number, number] {
  const v = (r + 0.55) / ROWS, u = (c + 0.5) / COLS;
  return [PXf(u, v), PYf(v) - raiseOf(F.cell[r * COLS + c]) * SCf(v)];
}
/** 가리킨 곳에서 가장 가까운 빈 자리 (없으면 -1) */
function spotAt(s: PillowState, x: number, y: number): number {
  const free = freeSpots(s.F, s.S);
  let best = -1, bd = 0.1;
  for (const p of free) {
    const [fx, fy] = feet(s.F, p % COLS, Math.floor(p / COLS));
    const d = Math.hypot(fx - x, (fy - 0.045) - y);
    if (d < bd) (bd = d), (best = p);
  }
  return best;
}

export const pillowfight: GameDef<PillowState> = {
  id: 'pillowfight',
  name: '베개 싸움',
  genes: ['autobattle', 'pointer', 'turnbased'],
  twist: '잠옷 입은 우리 편을 침실 자리에 톡톡 놓기만 하면 불이 꺼지고 베개 싸움이 저절로 벌어진다 — 누르고 있으면 그 자리에서 누구를 맞히고 누구에게 맞을지가 빨강·주황으로 보여서, 어디에 세울지가 수가 된다',
  rules: ['반짝이는 자리를 톡 = 우리 편이 폴짝. 박자마다 화살표 줄의 가장 가까운 상대에게 베개 퍽!', '바닥에선 2칸, 침대·옷장 위에선 3칸까지. 셋 맞으면 눕고, 상대를 다 눕히면 이겨요.'],
  controls: 'touch',
  hint: '자리를 누르면 누구를 맞힐지 보이고, 떼면 놓여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '한밤의 아이 방 베개 싸움 디오라마',
    mood: '야광별이 붙은 천장, 스탠드 불빛이 번지는 아이 방 — 불이 꺼지면 깃털이 눈처럼 날리고, 문틈 복도 불빛 너머로 아빠 발소리가 들린다.',
    palette: { bg: '#1d2140', ink: '#fff8ec', muted: '#c4c8e8', accent: '#ffd36e', hot: '#ff6b7a', soft: '#f6e7d0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'place', pt: 0, mirrors: {},
      down: false, ax: 0, ay: 0, hover: -1, queued: -1, lock: 0, idle: 0,
      fly: [], flyT: -1, hitT: -1, flyBeat: 0, placedT: -999, placedI: -1, hitAt: [], restAt: [],
      result: 0, why: '', got: 0, gotStars: [false, false, false],
      hearts: 3, stars: 0, pts: 0, tries: 0, won: false, dead: false,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, endT: 0, dadT: 0,
    } as unknown as PillowState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 50 || (s.events.length && s.t - s.events[0].t > 150)) s.events = s.events.filter((e) => s.t - e.t < 150);
    // 날아가던 베개가 닿는다
    if (s.fly.length && s.t >= s.hitT) {
      land(s);
      if (s.phase === 'battle' && dadBeat(s.F, s.S.beat)) {
        s.dadT = s.t;
        const got = dadCatch(s.F, s.S);
        ev(s, 'peek', 2, 0, got.length ? '누구야!' : '쉿… 아빠다', '#fff2c0');
        for (const i of got) ev(s, 'caught', s.S.kids[i].c, s.S.kids[i].r, '딱 걸렸다!', '#ffe0a0', i);
      }
      const o = outcome(s.F, s.S);
      if (o > 0) return endFight(s, 1, '');
      if (o < 0) return endFight(s, -1, '우리 편이 다 졌다~');
      if (s.phase === 'place' && s.S.hi >= s.F.def.hand.length) {
        s.phase = 'lights';
        s.pt = 0;
        ev(s, 'lights', 2, 3, '불 끈다~ 하나 둘 셋!', '#fff6d6');
      }
    } else if (s.fly.length === 0 && s.phase === 'place' && s.hitT > 0 && s.t === s.hitT) {
      // 기습 베개가 없던 아이 (앞에 아무도 없음) — 다 놓았으면 불 끄기
      if (s.S.hi >= s.F.def.hand.length) {
        s.phase = 'lights';
        s.pt = 0;
        ev(s, 'lights', 2, 3, '불 끈다~ 하나 둘 셋!', '#fff6d6');
      }
    }
    if (s.phase === 'result') {
      if (s.pt >= (s.result > 0 ? RESULT_OK : RESULT_FAIL)) {
        if (s.result > 0) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'end') {
      if (s.pt === 52) ev(s, 'door', 2, 0, '얘들아! 안 자고 뭐 해?!', '#fff6d6');
      if (s.pt >= END_T) finish(s);
      return;
    }
    if (s.phase === 'lights') {
      if (s.pt >= LIGHTS) (s.phase = 'battle'), (s.pt = 0);
      return;
    }
    if (s.phase === 'battle') {
      if (!s.fly.length && (s.pt - FIRST_BEAT) % BEAT === 0 && s.pt >= FIRST_BEAT) nextBeat(s);
      return;
    }
    // 놓기: 누르는 동안 미리 보기, 떼면 놓는다
    s.idle++;
    if (p) s.hover = spotAt(s, p.x, p.y * A);
    if (release) {
      const cell = spotAt(s, s.ax, s.ay * A);
      if (cell < 0) {
        ev(s, 'nope', Math.max(0.15, Math.min(0.85, s.ax)), Math.max(0.45, Math.min(1.05, s.ay * A)), '반짝이는 자리를 톡!', '#ffe3d6');
        s.hover = -1;
        return;
      }
      if (s.t < s.lock) s.queued = cell;
      else place(s, cell);
      s.hover = -1;
      return;
    }
    if (s.queued >= 0 && s.t >= s.lock && !s.fly.length) {
      const q = s.queued;
      s.queued = -1;
      if (freeSpots(s.F, s.S).includes(q) && s.S.hi < s.F.def.hand.length) place(s, q);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 다 놓은 뒤 끝까지 싸워 본 값 */
function finalValue(F: Field, S0: Sim): number {
  const S = cloneSim(S0), o = fightOut(F, S);
  let ourHp = 0, foeHp = 0;
  for (const k of S.kids) k.team ? (foeHp += k.out ? 0 : k.hp + k.sh) : (ourHp += k.out ? 0 : k.hp);
  if (o > 0) {
    const [, safe, bonus] = starsOf(F, S, true);
    return 1e7 + (safe ? 3e6 : 0) + (bonus ? 3e6 : 0) + ourHp * 1e4 - S.beat * 100;
  }
  return -foeHp * 1e4 + ourHp * 100;
}
/** 빔 탐색: 남은 손패를 어디에 놓을지 (같은 판·같은 수 → 같은 답) */
export function planSpots(F: Field, S0: Sim, beamW = 10): number[] {
  type Node = { S: Sim; seq: number[]; v: number; done: boolean };
  let beam: Node[] = [{ S: S0, seq: [], v: 0, done: false }];
  for (let j = S0.hi; j < F.def.hand.length; j++) {
    const next: Node[] = [];
    for (const b of beam) {
      if (b.done) {
        next.push(b);
        continue;
      }
      for (const p of freeSpots(F, b.S)) {
        const S1 = cloneSim(b.S), i = placeKid(F, S1, p);
        applyThrows(S1, openerThrows(F, S1, i));
        const won = outcome(F, S1) > 0, last = S1.hi >= F.def.hand.length;
        next.push({ S: S1, seq: [...b.seq, p], v: finalValue(F, S1) + (won || last ? 0 : 0), done: won || last });
      }
    }
    next.sort((a, b) => b.v - a.v);
    beam = next.slice(0, beamW);
  }
  return beam[0]?.seq ?? [];
}

const brain = new WeakMap<object, { key: string; seq: number[] }>();
const NO: Input = { tap: false, dir: 0, pointer: null };
const atCell = (F: Field, cell: number): Input => {
  const [x, y] = feet(F, cell % COLS, Math.floor(cell / COLS));
  return { tap: false, dir: 0, pointer: { x, y: (y - 0.045) / A } };
};

/** 봇: 남은 손패 전체를 빔 탐색으로 내다보고(기습 베개·싸움 끝까지 시뮬레이션) 자리를 고른다 */
export const pillowfightSmart: Bot<PillowState> = {
  name: '베개 대장',
  act(s) {
    if (s.phase !== 'place' || s.down || s.t < s.lock || s.fly.length || s.queued >= 0) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.hi}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, seq: planSpots(s.F, s.S) }));
    const cell = m.seq[0];
    if (cell === undefined) return NO;
    return atCell(s.F, cell);
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 방 아무 데나 톡 (가끔 화면 아무 데나) */
export const pillowfightRandom: Bot<PillowState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    if (rng() < 0.1) m.p = { x: rng(), y: rng() };
    else {
      const u = rng(), v = rng();
      m.p = { x: PXf(u, v), y: (PYf(v) - 0.03) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

/** 측정·도움용: 판 i를 아무 자리에 놓았을 때 / 잘 놓았을 때 */
export function stageProbe(stage: number, mirror: boolean, rng: Rng | null): { win: boolean; stars: number; beats: number } {
  const F = makeField(STAGES[stage], mirror), S = startSim(F);
  if (rng) {
    while (S.hi < F.def.hand.length && outcome(F, S) === 0) {
      const fr = freeSpots(F, S);
      const i = placeKid(F, S, fr[Math.floor(rng() * fr.length)]);
      applyThrows(S, openerThrows(F, S, i));
    }
  } else {
    for (const p of planSpots(F, S)) {
      if (outcome(F, S) !== 0) break;
      const i = placeKid(F, S, p);
      applyThrows(S, openerThrows(F, S, i));
    }
  }
  const o = fightOut(F, S), st = starsOf(F, S, o > 0);
  return { win: o > 0, stars: st.filter(Boolean).length, beats: S.beat };
}

// ───────────────────────────── 그리기 ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: PillowState, w: number, _h: number, th: Theme) {
  const fx = juice(s);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, w * A);
  ctx.restore();
}

/** 측정·도움용: 판 하나의 모든 놓는 순서를 다 해 본다 → [이긴 비율, 별 분포, 최고 별, 빔 탐색 별] */
export function stageExhaust(stage: number, mirror = false) {
  const F = makeField(STAGES[stage], mirror), S0 = startSim(F);
  const dist = [0, 0, 0, 0];
  let n = 0, wins = 0, best = 0, bestSeq: number[] = [];
  const rec = (S: Sim, seq: number[]) => {
    if (S.hi >= F.def.hand.length || outcome(F, S) !== 0) {
      const S1 = cloneSim(S), o = fightOut(F, S1), st = starsOf(F, S1, o > 0).filter(Boolean).length;
      n++;
      if (o > 0) wins++;
      dist[st]++;
      if (st > best) (best = st), (bestSeq = seq);
      return;
    }
    for (const p of freeSpots(F, S)) {
      const S1 = cloneSim(S), i = placeKid(F, S1, p);
      applyThrows(S1, openerThrows(F, S1, i));
      rec(S1, [...seq, p]);
    }
  };
  rec(S0, []);
  return { n, win: wins / n, dist: dist.map((x) => x / n), best, bestSeq, F };
}
export function stageAscii(stage: number): string {
  const F = makeField(STAGES[stage], false);
  const rows: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, f = F.foes.find((q) => q.r === r && q.c === c);
      const fl = F.cell[i];
      const base = fl & WARD ? 'W' : fl & BED ? 'B' : fl & FORT ? 'F' : fl & TEDDY ? 't' : fl & DOOR ? (fl & SPOT ? 'd' : ':') : fl & SPOT ? 'o' : fl & TOY ? 'x' : '.';
      line += f ? `${'^>v<'[f.dir]}${f.kind[0]}${base} ` : ` ${base}  `;
    }
    rows.push(line);
  }
  return rows.join('\n');
}
