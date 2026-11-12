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
/** 별 하나의 점수 (뒤 판일수록 크다) · 다 깼을 때 */
const starPts = (stage: number) => 100 + 25 * stage, WIN_PTS = 100;

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
    map: ['.....', '.....', 'o..o.', '.B.t.', '.B.Wo'],
    foes: [[1, 1, 'v', 'kid'], [3, 1, 'v', 'blanket']],
    hand: ['blanket', 'kid', 'kid'], bonus: 'teddy',
  },
  {
    key: 'twin', name: '쌍둥이', news: '👯 쌍둥이 — 나란히 놓으면 같이 던져요(2번 맞힘)', tip: '👯 두 번째 쌍둥이는 첫째 바로 옆에!',
    map: ['.....', '.....', 'oo.oo', 'BB.o.', 'BB.o.'],
    foes: [[1, 0, 'v', 'kid'], [0, 1, 'v', 'blanket'], [3, 1, 'v', 'kid']],
    hand: ['twin', 'twin', 'kid', 'kid'], bonus: 'fast', fast: 3,
  },
  {
    key: 'big', name: '큰 베개 형', news: '💪 큰 베개 형 — 두 박자에 한 번, 앞 두 칸을 같이 맞혀요', tip: '💪 상대가 한 줄로 겹친 곳에 큰 형을!',
    map: ['.....', '.....', 'o.o.o', 'B.o.t', 'B...W'],
    foes: [[0, 0, 'v', 'kid'], [0, 1, 'v', 'kid'], [2, 1, 'v', 'blanket'], [4, 1, 'v', 'kid']],
    hand: ['big', 'kid', 'blanket', 'kid'], bonus: 'teddy',
  },
  {
    key: 'dad', name: '아빠 순찰', news: '🚪 아빠 순찰 — 문 앞 칸은 3박자마다 걸려요!', tip: '🚪 문 앞 빛 칸은 3박자째에 아빠한테 딱!',
    map: ['..:..', '..:..', 'ood.o', 'BBdo.', '....W'],
    foes: [[2, 1, 'v', 'kid'], [0, 1, 'v', 'blanket'], [1, 0, 'v', 'kid'], [4, 1, 'v', 'kid']],
    hand: ['kid', 'big', 'blanket', 'kid'], bonus: 'fast', fast: 3,
  },
  {
    key: 'fort', name: '쿠션 요새', news: '🏰 쿠션 요새 — 바닥에서 던진 베개를 막아요. 높은 데선 넘겨요!', tip: '🏰 요새 너머는 침대·옷장 위에서!',
    map: ['.....', '.....', 'oFoFo', 'tB.Wo', '.B.W.'],
    foes: [[0, 1, 'v', 'kid'], [1, 0, 'v', 'kid'], [3, 1, 'v', 'blanket'], [4, 1, 'v', 'big']],
    hand: ['kid', 'blanket', 'kid', 'big', 'kid'], bonus: 'teddy',
  },
  {
    key: 'sleepy', name: '졸린 아이', news: '😪 졸린 아이 — 한 박자씩 꾸벅 졸아요', tip: '😪 졸린 상대 줄은 덜 위험해요',
    map: ['.....', '.....', 'oo.oo', 'BB.t.', 'BB..W'],
    foes: [[1, 0, 'v', 'kid'], [0, 1, 'v', 'sleepy'], [3, 1, 'v', 'sleepy'], [4, 1, 'v', 'blanket']],
    hand: ['sleepy', 'kid', 'kid', 'blanket'], bonus: 'teddy',
  },
  {
    key: 'dog', name: '강아지 난입', news: '🐶 강아지 — 발자국 칸의 아이를 핥아 박자를 멈춰요', tip: '🐶 발자국 길 위에 서면 간질간질 — 못 던져요',
    map: ['.....', '.....', 'ooooo', 'BB.WW', 'BBo..'],
    foes: [[0, 0, 'v', 'blanket'], [1, 1, 'v', 'kid'], [3, 1, 'v', 'kid'], [4, 0, 'v', 'sleepy']],
    hand: ['kid', 'twin', 'twin', 'big', 'blanket'], bonus: 'fast', fast: 4,
    route: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [3, 2], [2, 2], [1, 2]],
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
  /** 불을 끈 틱 (-1 = 아직 켜짐) */
  offT: number;
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
  s.offT = -1;
  s.dadT = 0;
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
  if (s.result > 0) {
    s.stars += s.got;
    s.pts += s.got * starPts(s.stage);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 2, 3, `${s.stage + 1}판 통과! ${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}`, '#fff1a8', s.got);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 2, 3, s.why, '#ffd0c8');
  }
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
  const S = s.S, th = s.fly;
  const tedBefore = S.ted, shBefore = S.kids.map((k) => k.sh);
  const fell = applyThrows(S, th);
  const byTarget = new Map<number, Throw[]>();
  for (const x of th) {
    if (x.tk >= 0) s.hitAt[x.tk] = s.t;
    const c = x.to % COLS, r = Math.floor(x.to / COLS);
    if (x.tk === -1) ev(s, 'fort', c, r, '퐁!', '#ffe8f0');
    else if (x.tk === -2) ev(s, 'teddy', c, r, '솜 펑!', '#ffd6e8');
    else byTarget.set(x.tk, [...(byTarget.get(x.tk) ?? []), x]);
  }
  for (const [tk, xs] of byTarget) {
    const k = S.kids[tk], n = xs.length, blocked = shBefore[tk] > 0;
    const text = blocked ? (n > 1 ? '이불 방어! 퍽!' : '이불 방어!') : xs.some((x) => x.joint) ? '퍽퍽!' : xs.some((x) => x.pierce) && n === 1 ? '꿰뚫기!' : n > 1 ? `퍽×${n}!` : '퍽!';
    ev(s, 'hit', k.c, k.r, text, blocked ? '#cfe8ff' : '#ffffff', tk);
  }
  if (tedBefore && !S.ted) tip(s, 'tedlost', '🧸 곰 인형 앞에 우리 편을 세우면 막아 줘요');
  for (const i of fell) {
    const k = S.kids[i];
    ev(s, 'fell', k.c, k.r, k.team ? '졌다~' : '으앙 졌다~', k.team ? '#ffe0a0' : '#ffd0c8', i);
  }
  if (th.some((x) => x.joint)) tip(s, 'joint', '👯 나란히 선 쌍둥이는 한 상대에게 같이 던져요');
  if (th.some((x) => x.pierce)) tip(s, 'pierce', '💪 큰 베개는 뒤에 선 아이까지 맞혀요');
  if (th.some((x) => x.tk === -1)) tip(s, 'fortblock', '🏰 바닥에서 던지면 요새에 막혀요 — 침대·옷장 위로!');
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
const PXf = (u: number, v: number) => 0.5 + (u - 0.5) * (WB + (WF - WB) * v);
const PYf = (v: number) => FY0 + FH * v;
const SCf = (v: number) => 0.84 + 0.22 * v;
const RAISE_BED = 0.045, RAISE_WARD = 0.08;
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
        s.offT = s.t;
        ev(s, 'lights', 2, 3, '불 끈다~ 하나 둘 셋!', '#fff6d6');
      }
    } else if (s.fly.length === 0 && s.phase === 'place' && s.hitT > 0 && s.t === s.hitT) {
      // 기습 베개가 없던 아이 (앞에 아무도 없음) — 다 놓았으면 불 끄기
      if (s.S.hi >= s.F.def.hand.length) {
        s.phase = 'lights';
        s.pt = 0;
        s.offT = s.t;
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
/** 남은 손패를 하나씩 '지금 가장 좋은 자리'에 놓아 끝까지 본 값 (빔 탐색의 중간 평가) */
function rollout(F: Field, S0: Sim): number {
  let S = S0;
  while (S.hi < F.def.hand.length && outcome(F, S) === 0) {
    let best: Sim | null = null, bv = -Infinity;
    for (const p of freeSpots(F, S)) {
      const S1 = cloneSim(S), i = placeKid(F, S1, p);
      applyThrows(S1, openerThrows(F, S1, i));
      const v = finalValue(F, S1);
      if (v > bv) (bv = v), (best = S1);
    }
    if (!best) break;
    S = best;
  }
  return finalValue(F, S);
}
/** 빔 탐색: 남은 손패를 어디에 놓을지 — 후보마다 나머지를 욕심껏 채워 끝까지 싸워 본다 (같은 판·같은 수 → 같은 답) */
export function planSpots(F: Field, S0: Sim, beamW = 6): number[] {
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
        const done = outcome(F, S1) > 0 || S1.hi >= F.def.hand.length;
        next.push({ S: S1, seq: [...b.seq, p], v: done ? finalValue(F, S1) : rollout(F, S1), done });
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
    if (!m || m.key !== key) brain.set(s, (m = { key, seq: planSpots(s.F, s.S, 4) }));
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
export function stageProbe(stage: number, mirror: boolean, rng: Rng | null, beamW = 6): { win: boolean; stars: number; beats: number } {
  const F = makeField(STAGES[stage], mirror), S = startSim(F);
  if (rng) {
    while (S.hi < F.def.hand.length && outcome(F, S) === 0) {
      const fr = freeSpots(F, S);
      const i = placeKid(F, S, fr[Math.floor(rng() * fr.length)]);
      applyThrows(S, openerThrows(F, S, i));
    }
  } else {
    for (const p of planSpots(F, S, beamW)) {
      if (outcome(F, S) !== 0) break;
      const i = placeKid(F, S, p);
      applyThrows(S, openerThrows(F, S, i));
    }
  }
  const o = fightOut(F, S), st = starsOf(F, S, o > 0);
  return { win: o > 0, stars: st.filter(Boolean).length, beats: S.beat };
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
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const ease = (q: number) => 1 - Math.pow(1 - clamp01(q), 2.2);
const KIND_NAME: Record<Kind, string> = { kid: '꼬마', tiny: '꼬맹이', blanket: '이불', twin: '쌍둥이', big: '큰 형', sleepy: '졸린 애' };
const KIND_NOTE: Record<Kind, string> = { kid: '앞으로 퍽!', tiny: '하트 하나', blanket: '첫 베개를 막아요', twin: '나란히 = 같이 던짐', big: '두 칸 꿰뚫기·느림', sleepy: '한 박자씩 꾸벅' };
const SKIN = ['#ffdcc2', '#f6c9a2', '#e9b38a', '#ffe4cf'];
const HAIR = ['#4a2f22', '#2b2220', '#c98a3a', '#7a4a2a', '#e0b060'];
/** 팀·종류별 잠옷 색 [밝은, 어두운, 무늬] */
const PJ: Record<string, [string, string, string]> = {
  '0kid': ['#7cc0ff', '#4a8ad8', '#ffe680'], '0tiny': ['#7cc0ff', '#4a8ad8', '#ffe680'], '0blanket': ['#7cc0ff', '#4a8ad8', '#ffe680'],
  '0twin': ['#8ee0d0', '#4fae9c', '#ffffff'], '0big': ['#5a7ee8', '#3a56b0', '#ffe680'], '0sleepy': ['#b2b8ff', '#7c84d8', '#fff6c0'],
  '1kid': ['#ff8f80', '#d65a50', '#fff1ea'], '1tiny': ['#ffb08a', '#d77a52', '#fff1ea'], '1blanket': ['#ff8f80', '#d65a50', '#fff1ea'],
  '1twin': ['#ff9fb8', '#d6688a', '#fff1ea'], '1big': ['#e8665a', '#a83c34', '#fff1ea'], '1sleepy': ['#ffa8c8', '#d0709a', '#fff1ea'],
};
type Mood = 'idle' | 'throw' | 'hit' | 'win' | 'doze' | 'lick' | 'scared';
interface Look { team: 0 | 1; kind: Kind; mood: Mood; t: number; sh: number; messy: number; seed: number; arm: number; front: boolean; alpha?: number }

function drawPillow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, col = '#fffaf2') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.roundRect(-s * 0.95 + s * 0.08, -s * 0.62 + s * 0.1, s * 1.9, s * 1.24, s * 0.45);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, col === '#fffaf2' ? '#e4dccd' : mix(col, '#000000', 0.18));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-s * 0.95, -s * 0.62, s * 1.9, s * 1.24, s * 0.45);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,100,80,.35)';
  ctx.lineWidth = Math.max(0.8, s * 0.08);
  ctx.stroke();
  // 모서리 술
  ctx.fillStyle = '#efe6d6';
  for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) (ctx.beginPath(), ctx.arc(px * s * 0.92, py * s * 0.58, s * 0.14, 0, TAU), ctx.fill());
  ctx.restore();
}
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, full: boolean, col = '#ff5d7a') {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(x - s * 1.25, y - s * 0.05, x - s * 0.6, y - s * 0.95, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 0.95, x + s * 1.25, y - s * 0.05, x, y + s * 0.85);
  ctx.closePath();
  if (full) {
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,10,30,.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(40,40,70,.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
/** 머리카락 (산발 정도 messy 0~3) */
function drawHair(ctx: CanvasRenderingContext2D, hz: number, col: string, messy: number, front: boolean, seed: number, t: number) {
  ctx.fillStyle = col;
  if (front) {
    ctx.beginPath();
    ctx.arc(0, 0, hz * 1.04, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(hz * 0.6, -hz * 0.25, hz * 0.1, -hz * 0.45);
    ctx.quadraticCurveTo(-hz * 0.4, -hz * 0.2, -hz * 1.02, -hz * 0.05);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, hz * 1.04, Math.PI * 0.9, Math.PI * 2.1);
    ctx.quadraticCurveTo(hz * 0.9, hz * 0.6, 0, hz * 0.72);
    ctx.quadraticCurveTo(-hz * 0.9, hz * 0.6, -hz * 1.0, hz * 0.2);
    ctx.fill();
  }
  // 산발: 맞을수록 삐죽삐죽
  const n = Math.min(9, messy * 3);
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, hz * 0.2);
  for (let k = 0; k < n; k++) {
    const a = Math.PI * (1.08 + (0.84 * (k + 0.5)) / n) + (hsh(seed * 7 + k) - 0.5) * 0.3, L = hz * (0.45 + 0.4 * hsh(seed + k * 3)) + Math.sin(t * 0.2 + k) * hz * 0.05;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * hz * 0.85, Math.sin(a) * hz * 0.85);
    ctx.quadraticCurveTo(Math.cos(a + 0.25) * (hz + L * 0.6), Math.sin(a + 0.25) * (hz + L * 0.6), Math.cos(a) * (hz + L), Math.sin(a) * (hz + L));
    ctx.stroke();
  }
}
function drawFace(ctx: CanvasRenderingContext2D, hz: number, mood: Mood, t: number, seed: number) {
  const ey = hz * 0.05, ex = hz * 0.38;
  ctx.strokeStyle = '#3a2420';
  ctx.fillStyle = '#3a2420';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.1, hz * 0.13);
  const blink = (t + seed * 37) % 190 < 6;
  if (mood === 'hit' || mood === 'lick') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * ex - hz * 0.14, ey - hz * 0.12);
      ctx.lineTo(sd * ex + hz * 0.08 * sd, ey);
      ctx.lineTo(sd * ex - hz * 0.14, ey + hz * 0.12);
      ctx.stroke();
    }
  } else if (mood === 'win') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * ex, ey + hz * 0.06, hz * 0.14, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
  } else if (mood === 'doze' || blink) {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * ex - hz * 0.13, ey), ctx.lineTo(sd * ex + hz * 0.13, ey), ctx.stroke());
  } else {
    const big = mood === 'scared' ? 1.5 : 1;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#2a1a18';
      ctx.beginPath();
      ctx.ellipse(sd * ex, ey, hz * 0.11 * big, hz * 0.15 * big, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sd * ex + hz * 0.04, ey - hz * 0.05, hz * 0.045 * big, 0, TAU);
      ctx.fill();
    }
    if (mood === 'throw') {
      // 힘줌 눈썹
      ctx.lineWidth = Math.max(1.1, hz * 0.11);
      for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * (ex + hz * 0.18), ey - hz * 0.32), ctx.lineTo(sd * (ex - hz * 0.12), ey - hz * 0.2), ctx.stroke());
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,120,140,.45)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * hz * 0.6, hz * 0.32, hz * 0.17, hz * 0.1, 0, 0, TAU), ctx.fill());
  // 입
  ctx.lineWidth = Math.max(1, hz * 0.1);
  ctx.strokeStyle = '#7a2a28';
  if (mood === 'throw' || mood === 'win' || mood === 'lick') {
    ctx.fillStyle = '#7a2a28';
    ctx.beginPath();
    ctx.ellipse(0, hz * 0.42, hz * 0.2, hz * (mood === 'throw' ? 0.16 : 0.2), 0, 0, Math.PI);
    ctx.fill();
    if (mood === 'lick') (ctx.fillStyle = '#ff8aa0'), ctx.beginPath(), ctx.ellipse(0, hz * 0.52, hz * 0.1, hz * 0.07, 0, 0, TAU), ctx.fill();
  } else if (mood === 'hit' || mood === 'scared') {
    ctx.fillStyle = '#7a2a28';
    ctx.beginPath();
    ctx.ellipse(0, hz * 0.45, hz * 0.1, hz * 0.14, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 'doze') {
    ctx.beginPath();
    ctx.arc(0, hz * 0.42, hz * 0.07, 0, TAU);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, hz * 0.3, hz * 0.17, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}
/** 잠옷 입은 아이 (발 위치 x,y · 크기 z) */
function drawKid(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, o: Look) {
  const sz = o.kind === 'big' ? 1.22 : o.kind === 'tiny' ? 0.82 : 1;
  const [pj, pjd, pat] = PJ[`${o.team}${o.kind}`];
  const skin = SKIN[o.seed % SKIN.length], hair = HAIR[(o.seed * 3 + o.team) % HAIR.length];
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.translate(x, y);
  ctx.scale(sz, sz);
  const shake = o.mood === 'hit' ? Math.sin(o.t * 1.7) * z * 0.12 : o.mood === 'lick' ? Math.sin(o.t * 0.9) * z * 0.06 : 0;
  ctx.translate(shake, 0);
  // 다리 · 슬리퍼
  ctx.fillStyle = pjd;
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.roundRect(sd * z * 0.24 - z * 0.15, -z * 0.62, z * 0.3, z * 0.58, z * 0.12), ctx.fill());
  ctx.fillStyle = o.team ? '#ffd166' : '#ffb3d1';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * z * 0.26, -z * 0.05, z * 0.22, z * 0.11, 0, 0, TAU), ctx.fill());
  // 이불 망토
  if (o.kind === 'blanket' && o.sh > 0) {
    const qc = o.team ? ['#a6d86a', '#ffe08a', '#7ec4e8'] : ['#ffcf5a', '#ff9eb5', '#9ad0ff'];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-z * 0.5, -z * 1.62);
    ctx.quadraticCurveTo(0, -z * 1.78, z * 0.5, -z * 1.62);
    ctx.lineTo(z * 0.86, -z * 0.3);
    ctx.quadraticCurveTo(0, -z * 0.12, -z * 0.86, -z * 0.3);
    ctx.closePath();
    ctx.clip();
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 5; gx++) (ctx.fillStyle = qc[(gx + gy * 2) % 3]), ctx.fillRect(-z * 0.9 + gx * z * 0.36, -z * 1.8 + gy * z * 0.32, z * 0.37, z * 0.33);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.setLineDash([z * 0.08, z * 0.08]);
    ctx.lineWidth = 1;
    for (let gx = 1; gx < 5; gx++) (ctx.beginPath(), ctx.moveTo(-z * 0.9 + gx * z * 0.36, -z * 1.8), ctx.lineTo(-z * 0.9 + gx * z * 0.36, 0), ctx.stroke());
    ctx.setLineDash([]);
    ctx.restore();
  }
  // 몸 (잠옷)
  const g = ctx.createLinearGradient(-z * 0.5, 0, z * 0.5, 0);
  g.addColorStop(0, pj);
  g.addColorStop(1, pjd);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-z * 0.5, -z * 1.52, z * 1.0, z * 1.0, z * 0.32);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-z * 0.5, -z * 1.52, z * 1.0, z * 1.0, z * 0.32);
  ctx.clip();
  if (o.team === 1) {
    ctx.fillStyle = pat;
    ctx.globalAlpha *= 0.7;
    for (let k = 0; k < 4; k++) ctx.fillRect(-z * 0.6, -z * 1.4 + k * z * 0.26, z * 1.2, z * 0.09);
  } else {
    ctx.fillStyle = pat;
    for (const [px, py] of [[-0.25, -1.25], [0.2, -1.0], [-0.1, -0.75], [0.3, -1.38]]) {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? z * 0.05 : z * 0.11;
        ctx.lineTo(px * z + Math.cos(a) * rr, py * z + Math.sin(a) * rr);
      }
      ctx.fill();
    }
  }
  ctx.restore();
  // 단추 (앞모습)
  if (o.front) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.arc(0, -z * (1.32 - k * 0.24), z * 0.05, 0, TAU), ctx.fill());
  }
  // 팔 + 베개
  const ps = o.kind === 'big' ? z * 0.55 : z * 0.36;
  ctx.strokeStyle = pj;
  ctx.lineCap = 'round';
  ctx.lineWidth = z * 0.24;
  const sway = o.mood === 'idle' ? Math.sin(o.t * 0.06 + o.seed) * 0.1 : 0;
  if (o.mood === 'win') {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * z * 0.42, -z * 1.35), ctx.lineTo(sd * z * 0.85, -z * 2.25 + Math.sin(o.t * 0.4) * z * 0.15), ctx.stroke());
    drawPillow(ctx, z * 0.9, -z * 2.45 + Math.sin(o.t * 0.4) * z * 0.15, ps, Math.sin(o.t * 0.3) * 0.5);
  } else {
    ctx.beginPath();
    ctx.moveTo(-z * 0.42, -z * 1.35);
    ctx.lineTo(-z * 0.66, -z * 0.82 + sway * z);
    ctx.stroke();
    const arm = o.arm; // 0 옆에 들고 · 1 머리 위로
    const hx = z * (0.68 - 0.3 * arm), hy = -z * (0.95 + 1.55 * arm);
    ctx.beginPath();
    ctx.moveTo(z * 0.42, -z * 1.35);
    ctx.lineTo(hx, hy - sway * z);
    ctx.stroke();
    if (arm >= 0) drawPillow(ctx, hx + z * 0.18, hy - z * 0.1 - sway * z, ps, arm > 0.3 ? -0.4 - arm * 0.3 : 1.35);
  }
  // 머리
  const hz = z * 0.56, hy0 = -z * 2.0;
  ctx.save();
  ctx.translate(0, hy0);
  if (o.mood === 'doze') ctx.rotate(0.28 * Math.sin(o.t * 0.05));
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, 0, hz, 0, TAU);
  ctx.fill();
  if (o.front) {
    drawHair(ctx, hz, hair, o.messy, true, o.seed, o.t);
    drawFace(ctx, hz, o.mood, o.t, o.seed);
  } else {
    // 뒷모습: 귀 + 뒤통수 머리 + 가마
    ctx.fillStyle = skin;
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * hz * 0.98, hz * 0.1, hz * 0.18, hz * 0.24, 0, 0, TAU), ctx.fill());
    drawHair(ctx, hz, hair, o.messy, false, o.seed, o.t);
    ctx.strokeStyle = mix(hair, '#000000', 0.35);
    ctx.lineWidth = Math.max(1, hz * 0.08);
    ctx.beginPath();
    ctx.arc(hz * 0.1, -hz * 0.35, hz * 0.18, 0, Math.PI * 1.5);
    ctx.stroke();
  }
  // 종류별 꾸밈
  if (o.kind === 'sleepy') {
    ctx.fillStyle = o.team ? '#ffd0e4' : '#cfd6ff';
    ctx.beginPath();
    ctx.moveTo(-hz * 1.0, -hz * 0.35);
    ctx.quadraticCurveTo(-hz * 0.2, -hz * 1.9, hz * 1.35, -hz * 1.0 + Math.sin(o.t * 0.05) * hz * 0.15);
    ctx.quadraticCurveTo(hz * 0.4, -hz * 0.85, hz * 1.0, -hz * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hz * 1.38, -hz * 1.0 + Math.sin(o.t * 0.05) * hz * 0.15, hz * 0.22, 0, TAU);
    ctx.fill();
    ctx.fillRect(-hz * 1.02, -hz * 0.48, hz * 2.04, hz * 0.2);
  }
  if (o.kind === 'twin') {
    ctx.fillStyle = o.team ? '#ff4f8a' : '#ffd23f';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * hz * 0.75, -hz * 0.75);
      ctx.lineTo(sd * hz * 1.25, -hz * 1.05);
      ctx.lineTo(sd * hz * 1.25, -hz * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (o.kind === 'big' && o.front) {
    ctx.strokeStyle = '#3a2420';
    ctx.lineWidth = Math.max(1.4, hz * 0.14);
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * hz * 0.18, -hz * 0.28), ctx.lineTo(sd * hz * 0.6, -hz * 0.36), ctx.stroke());
  }
  ctx.restore();
  ctx.restore();
}
/** 누워서 쿨쿨 (진 아이) — roll 0→1: 데굴 굴러 이불 속으로 */
function drawLying(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, team: 0 | 1, kind: Kind, seed: number, t: number, roll: number, messy: number) {
  const [pj, pjd] = PJ[`${team}${kind}`];
  const skin = SKIN[seed % SKIN.length], hair = HAIR[(seed * 3 + team) % HAIR.length];
  const q = ease(roll);
  if (q < 1) {
    // 데굴: 서 있던 아이가 옆으로 굴러 눕는다
    ctx.save();
    ctx.translate(x - z * 0.4 * q, y - z * 0.6 * Math.sin(q * Math.PI));
    ctx.rotate(-q * Math.PI * 1.5);
    ctx.fillStyle = pj;
    ctx.beginPath();
    ctx.roundRect(-z * 0.5, -z * 1.3, z, z, z * 0.3);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -z * 1.75, z * 0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bw = z * 1.7, bh = z * 0.62, x0 = x - bw * 0.15;
  ctx.fillStyle = 'rgba(20,10,30,.25)';
  ctx.beginPath();
  ctx.ellipse(x0, y, bw * 0.62, bh * 0.4, 0, 0, TAU);
  ctx.fill();
  // 베개
  ctx.fillStyle = '#fffaf2';
  ctx.beginPath();
  ctx.roundRect(x0 - bw * 0.62, y - bh * 0.95, z * 0.78, bh * 0.85, z * 0.2);
  ctx.fill();
  // 머리 (베개 위, 얼굴이 위를 본다)
  const hz = z * 0.46, hx = x0 - bw * 0.3, hy = y - bh * 0.72;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, hz, 0, TAU);
  ctx.fill();
  // 머리카락: 베개 쪽으로 (산발이면 삐침 두어 가닥)
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx, hy, hz * 1.04, Math.PI * 0.55, Math.PI * 1.45);
  ctx.quadraticCurveTo(hx - hz * 0.1, hy, hx - hz * 0.3, hy + hz * 0.98);
  ctx.fill();
  if (messy) {
    ctx.strokeStyle = hair;
    ctx.lineWidth = Math.max(1.2, hz * 0.18);
    for (let k = 0; k < Math.min(3, messy + 1); k++) {
      const a = Math.PI * (0.8 + k * 0.2);
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a) * hz, hy + Math.sin(a) * hz);
      ctx.lineTo(hx + Math.cos(a) * hz * 1.45, hy + Math.sin(a) * hz * 1.45 - hz * 0.1);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#3a2420';
  ctx.lineWidth = Math.max(1, hz * 0.14);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(hx + hz * 0.15, hy + sd * hz * 0.32, hz * 0.14, -Math.PI / 2 + 0.3, Math.PI / 2 - 0.3), ctx.stroke());
  ctx.beginPath();
  ctx.arc(hx + hz * 0.62, hy, hz * 0.1, 0, TAU);
  ctx.stroke();
  // 이불 (팀 색 퀼트) — 턱까지 덮고 쿨쿨
  const breathe = Math.sin(t * 0.06 + seed) * z * 0.04;
  const g = ctx.createLinearGradient(0, y - bh, 0, y);
  g.addColorStop(0, mix(pj, '#ffffff', 0.3));
  g.addColorStop(1, pjd);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0 - bw * 0.12, y + z * 0.02);
  ctx.quadraticCurveTo(x0 - bw * 0.16, y - bh * 1.1 - breathe, x0 + bw * 0.2, y - bh * 0.95 - breathe);
  ctx.quadraticCurveTo(x0 + bw * 0.62, y - bh * 0.85, x0 + bw * 0.6, y + z * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x0 + bw * 0.15, y - bh * 0.85 - breathe);
  ctx.lineTo(x0 + bw * 0.15, y);
  ctx.moveTo(x0 + bw * 0.4, y - bh * 0.8 - breathe);
  ctx.lineTo(x0 + bw * 0.4, y);
  ctx.stroke();
  ctx.setLineDash([]);
  // 쿨쿨 Zz
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.015 + seed * 0.3 + k * 0.5) % 1;
    ctx.globalAlpha = 0.95 * (1 - ph);
    ctx.font = `900 ${Math.max(12, z * (0.5 + 0.2 * k))}px system-ui, sans-serif`;
    ctx.fillText('z', hx + z * 0.2 + ph * z * 0.7, hy - z * 0.6 - ph * z * 0.9);
  }
  ctx.globalAlpha = 1;
}
/** 이불 속에 쏙 (아빠가 들어왔을 때) */
function drawHiding(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, team: 0 | 1, kind: Kind, seed: number, t: number) {
  const [pj, pjd] = PJ[`${team}${kind}`];
  const sz = kind === 'big' ? 1.2 : 1;
  const w2 = z * 0.95 * sz, h2 = z * 1.15 * sz, tr = Math.sin(t * 0.9 + seed) * z * 0.04;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, w2 * 1.05, z * 0.3, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y - h2, x, y);
  g.addColorStop(0, mix(pj, '#ffffff', 0.35));
  g.addColorStop(1, pjd);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w2 + tr, y);
  ctx.quadraticCurveTo(x - w2 * 1.05 + tr, y - h2 * 1.1, x + tr, y - h2);
  ctx.quadraticCurveTo(x + w2 * 1.05 + tr, y - h2 * 1.1, x + w2 + tr, y);
  ctx.closePath();
  ctx.fill();
  // 이불 틈으로 빼꼼
  ctx.fillStyle = '#20182a';
  ctx.beginPath();
  ctx.ellipse(x + tr, y - h2 * 0.62, w2 * 0.55, z * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  const look = Math.sin(t * 0.05 + seed) * z * 0.06;
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(x + tr + sd * z * 0.18 + look, y - h2 * 0.62, z * 0.075, 0, TAU), ctx.fill());
}
function drawTeddy(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, torn: boolean, t: number) {
  const fur = '#c98a52';
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, z * 0.75, z * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  if (torn) ctx.rotate(0.35);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.5, z * 0.55, z * 0.5, 0, 0, TAU);
  ctx.fill();
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * z * 0.42, -z * 0.12, z * 0.2, z * 0.15, 0, 0, TAU), ctx.fill());
  ctx.fillStyle = '#f2d2a8';
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.45, z * 0.3, z * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.arc(0, -z * 1.18, z * 0.42, 0, TAU);
  ctx.fill();
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.34, -z * 1.52, z * 0.16, 0, TAU), ctx.fill());
  ctx.fillStyle = '#f2d2a8';
  ctx.beginPath();
  ctx.ellipse(0, -z * 1.06, z * 0.18, z * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(0, -z * 1.1, z * 0.06, 0, TAU);
  ctx.fill();
  if (torn) {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = Math.max(1, z * 0.07);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * z * 0.17 - z * 0.06, -z * 1.3);
      ctx.lineTo(sd * z * 0.17 + z * 0.06, -z * 1.2);
      ctx.moveTo(sd * z * 0.17 + z * 0.06, -z * 1.3);
      ctx.lineTo(sd * z * 0.17 - z * 0.06, -z * 1.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) (ctx.beginPath(), ctx.arc(z * (0.3 + 0.12 * Math.cos(k * 1.7)), -z * (0.7 + 0.1 * Math.sin(k * 2.3)), z * 0.11, 0, TAU), ctx.fill());
  } else {
    ctx.fillStyle = '#2a1a10';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.16, -z * 1.26, z * 0.055, 0, TAU), ctx.fill());
    ctx.fillStyle = '#ff6f91';
    ctx.beginPath();
    ctx.moveTo(-z * 0.2, -z * 0.82);
    ctx.lineTo(z * 0.2, -z * 0.72 + Math.sin(t * 0.05) * z * 0.02);
    ctx.lineTo(z * 0.2, -z * 0.92);
    ctx.lineTo(-z * 0.2, -z * 0.72);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, lick: boolean, face: number) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y, z * 0.85, z * 0.24, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - Math.abs(Math.sin(t * 0.3)) * z * 0.12);
  ctx.scale(face, 1);
  const fur = '#f2d4a4', sp = '#b9773e';
  // 꼬리 (살랑살랑)
  ctx.strokeStyle = fur;
  ctx.lineWidth = z * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-z * 0.55, -z * 0.55);
  ctx.quadraticCurveTo(-z * 0.85, -z * 0.95, -z * 0.75 + Math.sin(t * 0.8) * z * 0.25, -z * 1.15);
  ctx.stroke();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.45, z * 0.62, z * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = sp;
  ctx.beginPath();
  ctx.ellipse(-z * 0.15, -z * 0.58, z * 0.25, z * 0.16, 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = fur;
  for (const lx of [-0.4, -0.15, 0.2, 0.42]) ctx.fillRect(lx * z - z * 0.07, -z * 0.25, z * 0.14, z * 0.25);
  // 머리
  ctx.beginPath();
  ctx.arc(z * 0.58, -z * 0.82, z * 0.36, 0, TAU);
  ctx.fill();
  ctx.fillStyle = sp;
  ctx.beginPath();
  ctx.ellipse(z * 0.36, -z * 0.72, z * 0.13, z * 0.28, 0.3 + Math.sin(t * 0.3) * 0.15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(z * 0.68, -z * 0.9, z * 0.055, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(z * 0.92, -z * 0.8, z * 0.07, 0, TAU);
  ctx.fill();
  if (lick) {
    ctx.fillStyle = '#ff7a95';
    ctx.beginPath();
    ctx.ellipse(z * 0.95, -z * 0.62 + Math.sin(t * 1.2) * z * 0.05, z * 0.09, z * 0.16, 0.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, dark: number, startle: number) {
  const col = mix('#3b3550', '#1a1626', dark), up = startle > 0 ? z * 0.25 * startle : 0;
  ctx.save();
  ctx.translate(x, y);
  // 꼬리
  ctx.strokeStyle = col;
  ctx.lineWidth = z * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(z * 0.4, -z * 0.12);
  ctx.quadraticCurveTo(z * 1.0, -z * 0.1, z * 0.95 + Math.sin(t * 0.04) * z * 0.2, -z * 0.7 - (startle > 0 ? z * 0.4 : 0));
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.45 - up * 0.5, z * 0.48 * (1 + startle * 0.15), z * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -z * 1.05 - up, z * 0.36, 0, TAU);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * z * 0.32, -z * 1.18 - up);
    ctx.lineTo(sd * z * 0.3, -z * 1.55 - up);
    ctx.lineTo(sd * z * 0.08, -z * 1.35 - up);
    ctx.closePath();
    ctx.fill();
  }
  // 눈 (어두우면 빛난다, 놀라면 동그랗게)
  ctx.fillStyle = dark > 0.3 ? '#e8ff6a' : '#ffd84a';
  if (dark > 0.3) (ctx.shadowColor = '#e8ff6a'), (ctx.shadowBlur = z * 0.6);
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * z * 0.14, -z * 1.07 - up, z * 0.08, z * (startle > 0 ? 0.11 : (t % 240) < 8 ? 0.01 : 0.07), 0, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}
function drawDad(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, q: number) {
  // 문간에 선 아빠 (빛을 등진 실루엣 + 안경 반짝)
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = q;
  ctx.fillStyle = '#2a2440';
  ctx.beginPath();
  ctx.roundRect(-z * 0.75, -z * 3.0, z * 1.5, z * 2.2, z * 0.5);
  ctx.fill();
  ctx.fillRect(-z * 0.55, -z * 1.0, z * 0.4, z * 1.0);
  ctx.fillRect(z * 0.15, -z * 1.0, z * 0.4, z * 1.0);
  // 가운 띠
  ctx.fillStyle = '#5a4a7a';
  ctx.fillRect(-z * 0.75, -z * 1.75, z * 1.5, z * 0.16);
  // 팔 (문틀 짚기)
  ctx.strokeStyle = '#2a2440';
  ctx.lineWidth = z * 0.32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(z * 0.6, -z * 2.7);
  ctx.lineTo(z * 1.15, -z * 3.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-z * 0.6, -z * 2.6);
  ctx.lineTo(-z * 0.85, -z * 1.7);
  ctx.stroke();
  // 머리
  ctx.fillStyle = '#3a3050';
  ctx.beginPath();
  ctx.arc(0, -z * 3.45, z * 0.55, 0, TAU);
  ctx.fill();
  // 안경 반짝
  ctx.strokeStyle = '#fff6c0';
  ctx.lineWidth = Math.max(1.2, z * 0.08);
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.2, -z * 3.45, z * 0.15, 0, TAU), ctx.stroke());
  ctx.fillStyle = 'rgba(255,250,210,.85)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.2 + z * 0.05, -z * 3.5, z * 0.05, 0, TAU), ctx.fill());
  // 콧수염
  ctx.fillStyle = '#1a1424';
  ctx.beginPath();
  ctx.ellipse(-z * 0.13, -z * 3.18, z * 0.16, z * 0.07, 0.3, 0, TAU);
  ctx.ellipse(z * 0.13, -z * 3.18, z * 0.16, z * 0.07, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
  void t;
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function drawAll(ctx: CanvasRenderingContext2D, s: PillowState, w: number, _h: number, th: Theme) {
  const fx = juice(s), t = s.t, F = s.F, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  /** 칸 좌표(소수 열 cu, 소수 줄 rv) → 화면 px · 높이 lift(w 단위) */
  const P = (cu: number, rv: number, lift = 0): [number, number] => [X(PXf(cu / COLS, rv / ROWS)), Y(PYf(rv / ROWS) - lift * SCf(rv / ROWS))];
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), Math.max(R(0.14), y), text, col, size);
  };
  const feetPx = (c: number, r: number): [number, number] => {
    const [a, b] = feet(F, c, r);
    return [X(a), Y(b)];
  };
  const zOf = (r: number) => R(0.059) * SCf((r + 0.5) / ROWS);
  // 불: 0 켜짐 → 1 꺼짐
  const dark = s.offT < 0 ? 0 : clamp01((t - s.offT - 14) / 22);
  const doorQ = s.phase === 'end' ? clamp01((s.pt - 50) / 10) : s.phase === 'result' ? 1 - clamp01((s.pt - 110) / 15) : 0;
  const peekQ = s.dadT && t - s.dadT < 50 && (s.phase === 'battle' || s.phase === 'end') ? Math.sin(clamp01((t - s.dadT) / 50) * Math.PI) : 0;
  const hiding = (s.phase === 'end' && s.pt >= 58) || s.phase === 'result';
  const totalHits = S.kids.reduce((a, k) => a + k.hitN, 0);

  ctx.save();
  fx.begin(ctx);
  // ═════════ 벽 · 천장 ═════════
  const WT = 0.085, CEIL = 0.15;
  ctx.fillStyle = '#141633';
  ctx.fillRect(-10, -10, w + 20, Y(A) + 20);
  // 비스듬한 천장 (다락방) + 야광별
  {
    const g = ctx.createLinearGradient(0, Y(WT), 0, Y(CEIL + 0.02));
    g.addColorStop(0, mix('#3a3f78', '#171a3a', dark));
    g.addColorStop(1, mix('#5a5f9e', '#232650', dark));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, Y(WT));
    ctx.lineTo(w, Y(WT));
    ctx.lineTo(X(0.9), Y(CEIL));
    ctx.lineTo(X(0.1), Y(CEIL));
    ctx.closePath();
    ctx.fill();
  }
  // 뒷벽
  {
    const g = ctx.createLinearGradient(0, Y(CEIL), 0, Y(FY0));
    g.addColorStop(0, mix('#6f78c8', '#2a2f62', dark));
    g.addColorStop(1, mix('#8d96dc', '#363c78', dark));
    ctx.fillStyle = g;
    ctx.fillRect(X(0.1), Y(CEIL), X(0.8), Y(FY0 - CEIL));
    // 벽지 무늬 (작은 달·별)
    ctx.fillStyle = `rgba(255,255,255,${0.12 - dark * 0.06})`;
    for (let k = 0; k < 22; k++) {
      const px = 0.12 + ((k * 0.137) % 0.76), py = CEIL + 0.02 + ((k * 0.071) % 0.2);
      ctx.beginPath();
      ctx.arc(X(px), Y(py), R(0.005), 0, TAU);
      ctx.fill();
    }
    // 걸레받이 · 허리 몰딩
    ctx.fillStyle = mix('#f4e6cc', '#5a5070', dark);
    ctx.fillRect(X(0.1), Y(FY0 - 0.018), X(0.8), Y(0.018));
    ctx.fillStyle = mix('#a8b0ea', '#3a4080', dark);
    ctx.fillRect(X(0.1), Y(0.31), X(0.8), Y(0.007));
  }
  // 옆벽 (상자 같은 방)
  for (const sd of [-1, 1]) {
    const g = ctx.createLinearGradient(sd < 0 ? 0 : w, 0, sd < 0 ? X(0.1) : X(0.9), 0);
    g.addColorStop(0, mix('#4b528e', '#1d2048', dark));
    g.addColorStop(1, mix('#6a72b8', '#2a2f62', dark));
    ctx.fillStyle = g;
    ctx.beginPath();
    const ex = sd < 0 ? 0 : w, ix = sd < 0 ? X(0.1) : X(0.9), fx0 = sd < 0 ? X(PXf(0, 1)) : X(PXf(1, 1));
    ctx.moveTo(ex, Y(WT));
    ctx.lineTo(ix, Y(CEIL));
    ctx.lineTo(ix, Y(FY0));
    ctx.lineTo(fx0, Y(PYf(1)));
    ctx.lineTo(ex, Y(PYf(1)));
    ctx.closePath();
    ctx.fill();
  }
  // 야광별 (천장·벽 윗부분) — 불이 꺼지면 빛난다
  {
    const glow = 0.35 + 0.65 * dark;
    ctx.save();
    ctx.fillStyle = mix('#e8f0c8', '#d8ff9a', dark);
    ctx.shadowColor = '#c8ff80';
    ctx.shadowBlur = R(0.02) * dark;
    for (let k = 0; k < 13; k++) {
      const px = 0.06 + hsh(k + 3) * 0.88, py = WT + 0.008 + hsh(k + 30) * (CEIL - WT - 0.006) + (k > 8 ? 0.02 + hsh(k) * 0.04 : 0);
      const rr = R(0.008 + 0.006 * hsh(k + 60)) * (1 + 0.15 * Math.sin(t * 0.05 + k) * dark);
      ctx.globalAlpha = glow * (0.75 + 0.25 * Math.sin(t * 0.04 + k * 1.3));
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const a = -Math.PI / 2 + (j * Math.PI) / 5, r0 = j % 2 ? rr * 0.45 : rr;
        ctx.lineTo(X(px) + Math.cos(a) * r0, Y(py) + Math.sin(a) * r0);
      }
      ctx.fill();
    }
    // 초승달 스티커
    ctx.globalAlpha = glow;
    ctx.beginPath();
    ctx.arc(X(0.78), Y(0.112), R(0.017), 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = mix('#3a3f78', '#171a3a', dark);
    ctx.beginPath();
    ctx.arc(X(0.787), Y(0.106), R(0.015), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 창문 (밤하늘·달·커튼) + 고양이 구경꾼
  const winX0 = 0.15, winX1 = 0.33, winY0 = 0.19, winY1 = 0.3;
  {
    const g = ctx.createLinearGradient(0, Y(winY0), 0, Y(winY1));
    g.addColorStop(0, '#0e1440');
    g.addColorStop(1, '#2a3a8a');
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(X(winX0) - 3, Y(winY0) - 3, X(winX1 - winX0) + 6, Y(winY1 - winY0) + 6);
    ctx.fillStyle = g;
    ctx.fillRect(X(winX0), Y(winY0), X(winX1 - winX0), Y(winY1 - winY0));
    ctx.fillStyle = '#fff8d0';
    ctx.shadowColor = '#fff4b0';
    ctx.shadowBlur = R(0.03);
    ctx.beginPath();
    ctx.arc(X(0.28), Y(0.22), R(0.016), 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) ctx.fillRect(X(winX0 + 0.01 + hsh(k + 90) * 0.16), Y(winY0 + 0.01 + hsh(k + 95) * 0.08), 1.5, 1.5);
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(X((winX0 + winX1) / 2) - 1.5, Y(winY0), 3, Y(winY1 - winY0));
    ctx.fillRect(X(winX0), Y((winY0 + winY1) / 2) - 1.5, X(winX1 - winX0), 3);
    // 커튼
    for (const sd of [-1, 1]) {
      const cx0 = sd < 0 ? X(winX0) - R(0.02) : X(winX1) + R(0.02);
      ctx.fillStyle = mix('#ff9eb5', '#7a4a6a', dark);
      ctx.beginPath();
      ctx.moveTo(cx0, Y(winY0 - 0.015));
      ctx.lineTo(cx0 - sd * R(0.045), Y(winY0 - 0.015));
      ctx.quadraticCurveTo(cx0 - sd * R(0.02), Y(winY1 - 0.03), cx0 - sd * R(0.035), Y(winY1 + 0.012));
      ctx.lineTo(cx0 + sd * R(0.012), Y(winY1 + 0.012));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = mix('#f4e6cc', '#6a6080', dark);
    ctx.fillRect(X(winX0) - R(0.015), Y(winY1) + 2, X(winX1 - winX0) + R(0.03), R(0.012));
    const lastHit = Math.max(-999, ...s.hitAt);
    drawCat(ctx, X(0.205), Y(winY1) + 2, R(0.03), t, dark, t - lastHit < 25 ? 1 - (t - lastHit) / 25 : 0);
  }
  // 그림 (크레용 집)
  {
    const px = 0.66, py = 0.2;
    ctx.fillStyle = mix('#ffffff', '#8a86a8', dark);
    ctx.save();
    ctx.translate(X(px + 0.05), Y(py + 0.04));
    ctx.rotate(0.04);
    ctx.fillRect(-R(0.055), -R(0.045), R(0.11), R(0.09));
    ctx.strokeStyle = mix('#ff6b5a', '#7a4a5a', dark);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-R(0.03), R(0.02));
    ctx.lineTo(-R(0.03), -R(0.005));
    ctx.lineTo(0, -R(0.028));
    ctx.lineTo(R(0.03), -R(0.005));
    ctx.lineTo(R(0.03), R(0.02));
    ctx.stroke();
    ctx.fillStyle = mix('#ffd23f', '#7a7050', dark);
    ctx.beginPath();
    ctx.arc(R(0.035), -R(0.028), R(0.008), 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = mix('#ff6b5a', '#5a3a4a', dark);
    ctx.beginPath();
    ctx.arc(X(px + 0.05), Y(py), 2, 0, TAU);
    ctx.fill();
  }
  // 문 (가운데) — 아빠가 들어오는 곳
  const dX0 = 0.435, dX1 = 0.565, dY0 = 0.205;
  const openQ = Math.max(doorQ, peekQ * 0.35);
  {
    ctx.fillStyle = mix('#e8dcc8', '#5a5070', dark);
    ctx.fillRect(X(dX0) - 4, Y(dY0) - 4, X(dX1 - dX0) + 8, Y(FY0 - dY0) + 4);
    if (openQ > 0) {
      const hg = ctx.createLinearGradient(0, Y(dY0), 0, Y(FY0));
      hg.addColorStop(0, '#fff2c0');
      hg.addColorStop(1, '#ffd890');
      ctx.fillStyle = hg;
      ctx.fillRect(X(dX0), Y(dY0), X(dX1 - dX0), Y(FY0 - dY0));
    }
    // 문짝 (열리면 좁아진다)
    const dw = X(dX1 - dX0) * (1 - openQ * 0.82);
    const g = ctx.createLinearGradient(X(dX0), 0, X(dX0) + dw, 0);
    g.addColorStop(0, mix('#c8925a', '#4a3a40', dark * (1 - openQ)));
    g.addColorStop(1, mix('#a8743e', '#3a2c34', dark * (1 - openQ)));
    ctx.fillStyle = g;
    ctx.fillRect(X(dX0), Y(dY0), dw, Y(FY0 - dY0));
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(X(dX0) + dw * 0.15, Y(dY0 + 0.02), dw * 0.7, Y(0.07));
    ctx.strokeRect(X(dX0) + dw * 0.15, Y(dY0 + 0.11), dw * 0.7, Y(0.07));
    ctx.fillStyle = '#ffd36e';
    ctx.beginPath();
    ctx.arc(X(dX0) + dw * 0.85, Y(0.31), R(0.007), 0, TAU);
    ctx.fill();
    if (doorQ > 0.3) drawDad(ctx, X(0.515), Y(FY0), R(0.052), t, clamp01((doorQ - 0.3) / 0.5));
    // 문 밑 틈 빛 (아빠 순찰 판: 빛 줄)
    if (!openQ && F.door) {
      ctx.fillStyle = `rgba(255,224,140,${0.5 + 0.3 * Math.sin(t * 0.08)})`;
      ctx.fillRect(X(dX0), Y(FY0) - 2, X(dX1 - dX0), 2.5);
    }
  }
  // 스탠드 (오른쪽 뒤 구석) — 불빛이 번진다
  const lampX = 0.86, lampY = 0.255;
  {
    ctx.strokeStyle = mix('#5a4a3a', '#2a2228', dark * 0.6);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(X(lampX), Y(lampY + 0.02));
    ctx.lineTo(X(lampX), Y(FY0 + 0.01));
    ctx.stroke();
    ctx.fillStyle = mix('#5a4a3a', '#2a2228', dark * 0.6);
    ctx.beginPath();
    ctx.ellipse(X(lampX), Y(FY0 + 0.012), R(0.03), R(0.008), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.moveTo(X(lampX - 0.028), Y(lampY + 0.03));
    ctx.lineTo(X(lampX + 0.028), Y(lampY + 0.03));
    ctx.lineTo(X(lampX + 0.017), Y(lampY - 0.012));
    ctx.lineTo(X(lampX - 0.017), Y(lampY - 0.012));
    ctx.closePath();
    ctx.fill();
  }
  // ═════════ 바닥 ═════════
  {
    const [ax, ay] = P(0, 0), [bx, by] = P(COLS, 0), [cx, cy] = P(COLS, ROWS), [ex, ey] = P(0, ROWS);
    const g = ctx.createLinearGradient(0, ay, 0, cy);
    g.addColorStop(0, mix('#b98552', '#4a3a48', dark));
    g.addColorStop(1, mix('#d9a56a', '#5e4a56', dark));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.closePath();
    ctx.fill();
    // 마루 널판
    ctx.strokeStyle = `rgba(90,50,20,${0.22 - dark * 0.08})`;
    ctx.lineWidth = 1;
    for (let k = 1; k < 10; k++) {
      const [x0, y0] = P(k / 2, 0), [x1, y1] = P(k / 2, ROWS);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    for (let r = 0; r < ROWS * 2; r++) {
      const sh0 = (r * 0.37) % 1;
      for (let k = 0; k < 5; k++) {
        const cu = ((k + sh0) * COLS) / 5, [x0, y0] = P(cu, r / 2), [, y1] = P(cu, r / 2 + 0.5);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y1);
        ctx.stroke();
      }
    }
    // 동그란 러그
    const [rx, ry] = P(2.5, 2.6);
    ctx.fillStyle = mix('#ffb8c8', '#6a4a6a', dark);
    ctx.beginPath();
    ctx.ellipse(rx, ry, R(0.36), R(0.17), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = mix('#fff0f4', '#8a6a8a', dark);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(rx, ry, R(0.32), R(0.145), 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = mix('#ffd6e0', '#7a5a7a', dark);
    ctx.beginPath();
    ctx.ellipse(rx, ry, R(0.2), R(0.09), 0, 0, TAU);
    ctx.fill();
  }
  // 문 앞 칸 (빛 줄) — 아빠 순찰
  if (F.door) {
    for (let i = 0; i < NC; i++) {
      if (!(F.cell[i] & DOOR)) continue;
      const c = i % COLS, r = Math.floor(i / COLS);
      const a = P(c + 0.06, r + 0.04), b = P(c + 0.94, r + 0.04), cc = P(c + 0.94, r + 0.96), dd = P(c + 0.06, r + 0.96);
      ctx.fillStyle = `rgba(255,214,120,${0.22 + 0.1 * Math.sin(t * 0.08 + r) + (peekQ > 0 ? 0.4 * peekQ : 0)})`;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.lineTo(...cc);
      ctx.lineTo(...dd);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,160,.6)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // 강아지 발자국 길
  if (F.route.length) {
    ctx.fillStyle = `rgba(120,70,40,${0.55 - dark * 0.15})`;
    const seen = new Set<number>();
    for (const ci of F.route) {
      if (seen.has(ci)) continue;
      seen.add(ci);
      const [px, py] = P((ci % COLS) + 0.86, Math.floor(ci / COLS) + 0.5);
      for (const [ox, oy] of [[-0.014, 0.012], [0.014, -0.01]]) {
        const bx = px + R(ox), by0 = py + R(oy);
        ctx.beginPath();
        ctx.ellipse(bx, by0, R(0.008), R(0.006), 0, 0, TAU);
        ctx.fill();
        for (const tx of [-1, 0, 1]) (ctx.beginPath(), ctx.arc(bx + tx * R(0.007), by0 - R(0.009) + Math.abs(tx) * R(0.002), R(0.0032), 0, TAU), ctx.fill());
      }
    }
  }
  // ═════════ 줄마다 (먼 줄 → 가까운 줄): 가구 → 아이 ═════════
  const occ = occOf(S);
  const groups = (flag: number) => {
    const done = new Set<number>(), out: { c0: number; c1: number; r0: number; r1: number }[] = [];
    for (let i = 0; i < NC; i++) {
      if (!(F.cell[i] & flag) || done.has(i)) continue;
      const c = i % COLS, r = Math.floor(i / COLS);
      let c1 = c, r1 = r;
      while (c1 + 1 < COLS && F.cell[r * COLS + c1 + 1] & flag && !done.has(r * COLS + c1 + 1)) c1++;
      while (r1 + 1 < ROWS && [...Array(c1 - c + 1).keys()].every((k) => F.cell[(r1 + 1) * COLS + c + k] & flag)) r1++;
      for (let rr = r; rr <= r1; rr++) for (let cc = c; cc <= c1; cc++) done.add(rr * COLS + cc);
      out.push({ c0: c, c1, r0: r, r1 });
    }
    return out;
  };
  const beds = groups(BED), wards = groups(WARD);
  const box = (c0: number, r0: number, c1: number, r1: number, lift: number, top: string, front: string, side: string) => {
    const tl = P(c0, r0, lift), tr = P(c1, r0, lift), br = P(c1, r1, lift), bl = P(c0, r1, lift), fl = P(c0, r1), fr = P(c1, r1);
    // 그림자
    ctx.fillStyle = 'rgba(20,10,30,.28)';
    const s0 = P(c0 - 0.05, r0 + 0.1), s1 = P(c1 + 0.12, r0 + 0.1), s2 = P(c1 + 0.12, r1 + 0.12), s3 = P(c0 - 0.05, r1 + 0.12);
    ctx.beginPath();
    ctx.moveTo(...s0);
    ctx.lineTo(...s1);
    ctx.lineTo(...s2);
    ctx.lineTo(...s3);
    ctx.closePath();
    ctx.fill();
    // 옆면 (가운데에서 먼 쪽이 보인다)
    const mid = (c0 + c1) / 2;
    if (mid < COLS / 2 - 0.3) {
      const a = P(c1, r0, lift), b = P(c1, r1, lift), cc = P(c1, r1), dd = P(c1, r0);
      ctx.fillStyle = side;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.lineTo(...cc);
      ctx.lineTo(...dd);
      ctx.closePath();
      ctx.fill();
    } else if (mid > COLS / 2 + 0.3) {
      const a = P(c0, r0, lift), b = P(c0, r1, lift), cc = P(c0, r1), dd = P(c0, r0);
      ctx.fillStyle = side;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.lineTo(...cc);
      ctx.lineTo(...dd);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(...bl);
    ctx.lineTo(...br);
    ctx.lineTo(...fr);
    ctx.lineTo(...fl);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(...tl);
    ctx.lineTo(...tr);
    ctx.lineTo(...br);
    ctx.lineTo(...bl);
    ctx.closePath();
    ctx.fill();
    return { tl, tr, br, bl, fl, fr };
  };
  const quadPath = (pts: [number, number][]) => {
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const q of pts.slice(1)) ctx.lineTo(...q);
    ctx.closePath();
  };
  const drawBed = (b: { c0: number; c1: number; r0: number; r1: number }, team: number) => {
    const c0 = b.c0 + 0.04, c1 = b.c1 + 0.96, r0 = b.r0 + 0.02, r1 = b.r1 + 0.98;
    const quilt = team ? ['#ffb3a0', '#ff8f80'] : ['#9fd2ff', '#6fb0f0'];
    // 머리판
    const hb0 = P(c0, r0, RAISE_BED + 0.04), hb1 = P(c1, r0, RAISE_BED + 0.04), hb2 = P(c1, r0), hb3 = P(c0, r0);
    ctx.fillStyle = mix('#b8784a', '#4a3440', dark * 0.8);
    quadPath([hb0, hb1, hb2, hb3]);
    ctx.fill();
    ctx.fillStyle = mix('#d89a62', '#5a4450', dark * 0.8);
    quadPath([hb0, hb1, P(c1, r0, RAISE_BED + 0.03), P(c0, r0, RAISE_BED + 0.03)]);
    ctx.fill();
    const q = box(c0, r0, c1, r1, RAISE_BED, mix('#fff6ea', '#7a7088', dark), mix('#a86a3e', '#3e2c38', dark * 0.8), mix('#8a5630', '#33242e', dark * 0.8));
    // 이불 (가까운 쪽 2/3)
    const rm = r0 + (r1 - r0) * 0.3;
    const qa = P(c0 - 0.03, rm, RAISE_BED + 0.012), qb = P(c1 + 0.03, rm, RAISE_BED + 0.012), qc = P(c1 + 0.03, r1 + 0.02, RAISE_BED + 0.008), qd = P(c0 - 0.03, r1 + 0.02, RAISE_BED + 0.008);
    const g = ctx.createLinearGradient(0, qa[1], 0, qd[1]);
    g.addColorStop(0, mix(quilt[0], '#3a3a60', dark * 0.6));
    g.addColorStop(1, mix(quilt[1], '#2a2a50', dark * 0.6));
    ctx.fillStyle = g;
    quadPath([qa, qb, qc, qd]);
    ctx.fill();
    // 이불 앞으로 늘어진 자락
    const qe = P(c1 + 0.03, r1 + 0.02, RAISE_BED * 0.35), qf = P(c0 - 0.03, r1 + 0.02, RAISE_BED * 0.35);
    ctx.fillStyle = mix(quilt[1], '#202048', dark * 0.6);
    quadPath([qd, qc, qe, qf]);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.35 - dark * 0.15})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let k = 1; k < (c1 - c0) * 2; k++) {
      const a = P(c0 + k * 0.5, rm, RAISE_BED + 0.012), bb = P(c0 + k * 0.5, r1, RAISE_BED + 0.008);
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...bb);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // 베개
    for (let cc = b.c0; cc <= b.c1; cc++) {
      const [px, py] = P(cc + 0.5, r0 + 0.12, RAISE_BED + 0.012);
      ctx.fillStyle = mix('#ffffff', '#8a86a8', dark);
      ctx.beginPath();
      ctx.ellipse(px, py, R(0.05) * SCf(r0 / ROWS), R(0.018), 0, 0, TAU);
      ctx.fill();
    }
    void q;
  };
  const drawWard = (b: { c0: number; c1: number; r0: number; r1: number }) => {
    const c0 = b.c0 + 0.06, c1 = b.c1 + 0.94, r0 = b.r0 + 0.04, r1 = b.r1 + 0.96;
    const q = box(c0, r0, c1, r1, RAISE_WARD, mix('#e8c08a', '#5a4a50', dark * 0.85), mix('#c48a50', '#43323c', dark * 0.85), mix('#9a6a3c', '#362832', dark * 0.85));
    // 서랍 선 · 손잡이
    ctx.strokeStyle = 'rgba(60,30,10,.35)';
    ctx.lineWidth = 1.2;
    for (let k = 1; k < 3; k++) {
      const a = P(c0, r1, (RAISE_WARD * k) / 3), bb = P(c1, r1, (RAISE_WARD * k) / 3);
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...bb);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd36e';
    for (let k = 0; k < 3; k++) {
      const [hx, hy] = P((c0 + c1) / 2, r1, (RAISE_WARD * (k + 0.5)) / 3);
      ctx.beginPath();
      ctx.arc(hx, hy, R(0.006), 0, TAU);
      ctx.fill();
    }
    void q;
  };
  const drawFort = (c: number, r: number) => {
    const cols = ['#ffb8d0', '#b8e0ff', '#fff0a0', '#c8f0c0'];
    for (let k = 0; k < 4; k++) {
      const [px, py] = P(c + 0.5 + (k % 2 ? 0.06 : -0.04), r + 0.5, 0.016 + k * 0.03);
      const ww = R(0.078) * SCf(r / ROWS) * (1 - k * 0.1);
      if (!k) (ctx.fillStyle = 'rgba(20,10,30,.25)'), ctx.beginPath(), ctx.ellipse(px + 3, py + R(0.02), ww * 1.1, R(0.02), 0, 0, TAU), ctx.fill();
      ctx.fillStyle = mix(cols[(k + c) % 4], '#3a3a5a', dark * 0.55);
      ctx.beginPath();
      ctx.roundRect(px - ww, py - R(0.026), ww * 2, R(0.036), R(0.017));
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,80,.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.arc(px, py - R(0.008), R(0.004), 0, TAU);
      ctx.fill();
    }
    const [fx0, fy0] = P(c + 0.5, r + 0.5, 0.135);
    ctx.strokeStyle = '#7a5a3a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 + R(0.015));
    ctx.lineTo(fx0, fy0 - R(0.035));
    ctx.stroke();
    ctx.fillStyle = '#ff5d7a';
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 - R(0.035));
    ctx.lineTo(fx0 + R(0.034) * (1 + 0.12 * Math.sin(t * 0.1)), fy0 - R(0.026));
    ctx.lineTo(fx0, fy0 - R(0.017));
    ctx.closePath();
    ctx.fill();
  };
  const drawToy = (c: number, r: number) => {
    box(c + 0.2, r + 0.25, c + 0.8, r + 0.8, 0.04, mix('#ffe08a', '#5a5060', dark), mix('#ff8a6a', '#4a3a48', dark), mix('#d8664a', '#3a2c38', dark));
    const [px, py] = P(c + 0.5, r + 0.4, 0.05);
    ctx.fillStyle = mix('#6ad0ff', '#3a4a6a', dark);
    ctx.fillRect(px - R(0.02), py - R(0.02), R(0.022), R(0.022));
    ctx.fillStyle = mix('#a6e86a', '#4a5a4a', dark);
    ctx.beginPath();
    ctx.arc(px + R(0.014), py - R(0.012), R(0.012), 0, TAU);
    ctx.fill();
  };
  const freeSet = new Set(s.phase === 'place' ? freeSpots(F, S) : []);
  const drawCushion = (i: number) => {
    const c = i % COLS, r = Math.floor(i / COLS);
    const [px, py] = P(c + 0.5, r + 0.62);
    const sc = SCf((r + 0.5) / ROWS), cw = R(0.058) * sc, ch = R(0.026) * sc;
    const col = ['#ffc8d8', '#c8e8ff', '#fff0b0', '#d8f5c8'][(c * 3 + r) % 4];
    ctx.fillStyle = 'rgba(20,10,30,.22)';
    ctx.beginPath();
    ctx.ellipse(px + 2, py + ch * 0.55, cw * 1.05, ch * 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = mix(mix(col, '#c09080', 0.25), '#3a3050', dark * 0.6);
    ctx.beginPath();
    ctx.ellipse(px, py + ch * 0.25, cw, ch, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = mix(col, '#4a4060', dark * 0.6);
    ctx.beginPath();
    ctx.ellipse(px, py, cw * 0.96, ch * 0.92, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.arc(px, py, R(0.005), 0, TAU);
    ctx.fill();
  };
  /** 빈 자리 반짝 (놓을 수 있는 곳) */
  const sparkle = (i: number) => {
    const c = i % COLS, r = Math.floor(i / COLS);
    const [fx0, fy0] = feetPx(c, r);
    const a = 0.45 + 0.35 * Math.sin(t * 0.12 + i);
    ctx.strokeStyle = `rgba(255,236,150,${a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(fx0, fy0, R(0.05) * SCf(r / ROWS), R(0.02) * SCf(r / ROWS), 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,246,200,${a})`;
    const sy = fy0 - R(0.035) - Math.sin(t * 0.1 + i) * R(0.006);
    ctx.beginPath();
    for (let j = 0; j < 8; j++) {
      const an = (j * Math.PI) / 4, rr = j % 2 ? R(0.004) : R(0.012);
      ctx.lineTo(fx0 + Math.cos(an) * rr, sy + Math.sin(an) * rr);
    }
    ctx.fill();
  };
  // 아이의 그리기 상태
  const flyIdx = new Set(s.fly.map((x) => x.from));
  const result = s.result;
  const kidAt = (i: number) => {
    const k = S.kids[i];
    let [x, y] = feetPx(k.c, k.r);
    let hop = 0;
    if (i === s.placedI && t - s.placedT < HOP && s.phase === 'place') {
      // 손패에서 폴짝 날아와 앉는다
      const q = (t - s.placedT) / HOP, sx = X(0.18), sy = Y(1.25);
      x = sx + (x - sx) * q;
      y = sy + (y - sy) * q;
      hop = Math.sin(q * Math.PI) * R(0.12);
    }
    return [x, y - hop];
  };
  const moodOf = (i: number): { mood: Mood; arm: number; front: boolean; bounce: number } => {
    const k = S.kids[i];
    let front = k.team === 1, mood: Mood = 'idle', arm = 0, bounce = 0;
    const sinceHit = t - s.hitAt[i];
    if (s.phase === 'end' && s.pt < 58) {
      if ((result > 0 && k.team === 0) || (result < 0 && k.team === 1)) (mood = 'win'), (front = true), (bounce = Math.abs(Math.sin(s.pt * 0.25)) * R(0.05));
      else (mood = 'hit'), (front = true);
      return { mood, arm, front, bounce };
    }
    if (flyIdx.has(i) && t >= s.flyT - 8 && t < s.hitT) {
      mood = 'throw';
      arm = t < s.flyT ? clamp01((t - s.flyT + 8) / 8) : 1 - clamp01((t - s.flyT) / 6);
      if (k.team === 0) front = false;
    }
    if (sinceHit < 24) (mood = 'hit'), (front = true);
    if (s.phase === 'battle' && S.beat > 0 && t - s.flyT < BEAT) {
      const r = rests(F, S, i, S.beat);
      if (r === 1) mood = 'doze';
      if (r === 3) (mood = 'lick'), (front = true);
    }
    if (k.kind === 'sleepy' && mood === 'idle' && s.phase === 'battle' && S.beat % 2 === 1 && t - s.flyT > 20) mood = 'doze';
    return { mood, arm, front, bounce };
  };
  const drawRowThings = (r: number) => {
    // 바닥 것들
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, f = F.cell[i];
      if (f & SPOT && !(f & HIGH)) drawCushion(i);
      if (f & TOY) drawToy(c, r);
      if (f & FORT) drawFort(c, r);
    }
    for (const b of beds) if (b.r0 === r) drawBed(b, b.r1 <= 1 ? 1 : 0);
    for (const b of wards) if (b.r0 === r) drawWard(b);
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (freeSet.has(i) && !s.down) sparkle(i);
      if (i === F.teddy) {
        const [tx, ty] = P(c + 0.5, r + 0.62);
        drawTeddy(ctx, tx, ty, zOf(r) * 0.8, S.ted <= 0, t);
        if (S.ted > 0 && !hiding) drawHeart(ctx, tx, ty - zOf(r) * 1.75 - Math.abs(Math.sin(t * 0.08)) * R(0.008), R(0.012), true, '#ff9ec7');
      }
    }
    // 아이들
    for (let c = 0; c < COLS; c++) {
      for (let i = 0; i < S.kids.length; i++) {
        const k = S.kids[i];
        if (k.c !== c || k.r !== r || k.out === 2) continue;
        if (i === s.placedI && t - s.placedT < HOP && s.phase === 'place') continue;
        const [x, y] = kidAt(i), z = zOf(r);
        if (hiding && (k.out === 0 || k.out === 1)) {
          drawHiding(ctx, x, y, z, k.team, k.kind, i, t);
          continue;
        }
        if (k.out === 1) {
          drawLying(ctx, x, y, z, k.team, k.kind, i, t, clamp01((t - s.hitAt[i]) / 16), Math.min(3, k.hitN));
          continue;
        }
        const m = moodOf(i);
        ctx.fillStyle = 'rgba(20,10,30,.28)';
        ctx.beginPath();
        ctx.ellipse(x, y, z * 0.62, z * 0.2, 0, 0, TAU);
        ctx.fill();
        drawKid(ctx, x, y - m.bounce, z, { team: k.team, kind: k.kind, mood: m.mood, t, sh: k.sh, messy: Math.min(3, k.hitN), seed: i + s.stage * 3, arm: m.arm, front: m.front });
      }
    }
  };
  for (let r = 0; r < ROWS; r++) drawRowThings(r);
  // 강아지 (발자국 길을 박자마다 한 칸씩 — 그 칸 아이를 핥는다). 작은 구경꾼이라 맨 위에 그린다
  if (F.route.length && !hiding) {
    const b0 = Math.max(0, S.beat - 1), cur = F.route[b0 % F.route.length], prev = F.route[Math.max(0, b0 - 1) % F.route.length];
    const q = s.phase === 'battle' && S.beat > 1 ? clamp01((t - s.flyT + 12) / 12) : 1;
    const dc = (cur % COLS) * q + (prev % COLS) * (1 - q), dr = Math.floor(cur / COLS) * q + Math.floor(prev / COLS) * (1 - q);
    const lickNow = s.phase === 'battle' && occ[cur] >= 0 && t - s.flyT < 40;
    const [gx, gy] = P(dc + 0.86, dr + 0.62);
    drawDog(ctx, gx, gy, zOf(Math.round(dr)) * 0.95, t, lickNow, -1);
    if (lickNow) {
      ctx.fillStyle = '#ff9ec7';
      drawHeart(ctx, gx - R(0.04), gy - R(0.09) - (t - s.flyT) * 0.4, R(0.01), true, '#ff9ec7');
    }
  }
  // 아빠한테 걸린 아이: 문 쪽으로 질질 끌려 나간다
  if (s.dadT && t - s.dadT < 40)
    S.kids.forEach((k, i) => {
      if (k.out !== 2) return;
      const q = ease((t - s.dadT) / 40), [x0, y0] = feetPx(k.c, k.r), x1 = X(0.5), y1 = Y(FY0 + 0.01);
      drawKid(ctx, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, zOf(k.r) * (1 - 0.3 * q), { team: k.team, kind: k.kind, mood: 'scared', t, sh: k.sh, messy: Math.min(3, k.hitN), seed: i + s.stage * 3, arm: 0, front: true, alpha: 1 - q * 0.7 });
    });
  // 손패에서 날아오는 중인 아이 (맨 위에)
  if (s.phase === 'place' && s.placedI >= 0 && t - s.placedT < HOP) {
    const k = S.kids[s.placedI], [x, y] = kidAt(s.placedI);
    drawKid(ctx, x, y, zOf(k.r), { team: 0, kind: k.kind, mood: 'win', t, sh: k.sh, messy: 0, seed: s.placedI + s.stage * 3, arm: 0, front: true });
  }
  // ═════════ 불 끄기: 어둠 + 스탠드·달빛 번짐 ═════════
  if (dark > 0) {
    ctx.fillStyle = `rgba(10,12,48,${0.48 * dark})`;
    ctx.fillRect(0, Y(WT), w, Y(PYf(1) - WT + 0.002));
  }
  {
    // 스탠드 불빛 (늘 번진다 — 어두울수록 또렷)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(X(lampX), Y(lampY + 0.02), R(0.01), X(lampX), Y(lampY + 0.08), R(0.42));
    lg.addColorStop(0, `rgba(255,214,140,${0.35 + 0.25 * dark})`);
    lg.addColorStop(0.35, `rgba(255,170,90,${0.1 + 0.12 * dark})`);
    lg.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, Y(WT), w, Y(PYf(1) - WT));
    // 달빛 줄기 (창문 → 바닥)
    if (dark > 0) {
      ctx.fillStyle = `rgba(150,180,255,${0.1 * dark})`;
      ctx.beginPath();
      ctx.moveTo(X(winX0), Y(winY1));
      ctx.lineTo(X(winX1), Y(winY1));
      ctx.lineTo(X(0.52), Y(0.8));
      ctx.lineTo(X(0.26), Y(0.86));
      ctx.closePath();
      ctx.fill();
    }
    // 문이 열리면 복도 불빛이 쏟아진다
    if (openQ > 0) {
      const a = openQ * (doorQ > 0 ? 0.55 : 0.4);
      ctx.fillStyle = `rgba(255,220,140,${a})`;
      ctx.beginPath();
      ctx.moveTo(X(dX0), Y(FY0));
      ctx.lineTo(X(dX1), Y(FY0));
      ctx.lineTo(X(0.5 + 0.2 * openQ), Y(PYf(1)));
      ctx.lineTo(X(0.5 - 0.2 * openQ), Y(PYf(1)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // 떠다니는 깃털 (맞을수록 많아진다)
  {
    const n = Math.min(40, totalHits * 3);
    for (let k = 0; k < n; k++) {
      const x0 = 0.08 + hsh(k + 200) * 0.84, sp = 0.0006 + hsh(k + 300) * 0.0008;
      const y0 = WT + 0.04 + ((hsh(k + 400) + t * sp) % 1) * (PYf(1) - WT - 0.06);
      const sw = Math.sin(t * 0.03 + k * 1.7) * 0.02;
      ctx.save();
      ctx.translate(X(x0 + sw), Y(y0));
      ctx.rotate(Math.sin(t * 0.03 + k) * 0.8);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, R(0.011), R(0.0045), 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,190,220,.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-R(0.013), 0);
      ctx.lineTo(R(0.011), 0);
      ctx.stroke();
      ctx.restore();
    }
  }
  // ═════════ 머리 위 하트 · 화살표 (또렷하게) ═════════
  const lane = (k: Kid, col: string, alpha: number) => {
    // 던지는 줄: 화살표 쪽으로 사거리만큼 작은 갈매기표
    const high = F.cell[k.r * COLS + k.c] & HIGH, Rg = high ? RANGE_HI : RANGE;
    for (let j = 1; j <= Rg; j++) {
      const c = k.c + DX[k.dir] * j, r = k.r + DY[k.dir] * j;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
      const [px, py] = P(c + 0.5, r + 0.5);
      ctx.globalAlpha = alpha * (1 - j * 0.15);
      ctx.fillStyle = col;
      ctx.beginPath();
      const dy = DY[k.dir], sz = R(0.016);
      ctx.moveTo(px - sz, py - dy * sz * 0.5);
      ctx.lineTo(px, py + dy * sz * 0.5);
      ctx.lineTo(px + sz, py - dy * sz * 0.5);
      ctx.lineTo(px + sz, py - dy * sz * 0.5 - dy * R(0.008));
      ctx.lineTo(px, py + dy * sz * 0.5 - dy * R(0.008));
      ctx.lineTo(px - sz, py - dy * sz * 0.5 - dy * R(0.008));
      ctx.closePath();
      ctx.fill();
      if (F.cell[r * COLS + c] & FORT && !high) break;
    }
    ctx.globalAlpha = 1;
  };
  if (s.phase === 'place' && !hiding) for (const k of S.kids) if (k.team === 1 && !k.out) lane(k, '#ff8a6a', 0.55);
  if (!hiding)
    S.kids.forEach((k, i) => {
      if (k.out || (i === s.placedI && t - s.placedT < HOP && s.phase === 'place')) return;
      const [x, y] = kidAt(i), z = zOf(k.r) * (k.kind === 'big' ? 1.22 : k.kind === 'tiny' ? 0.82 : 1);
      const hy = y - z * 3.05, hs = R(0.011);
      const maxHp = HP[k.kind], n = maxHp + (k.kind === 'blanket' ? 1 : 0);
      let x0 = x - ((n - 1) * hs * 2.3) / 2;
      if (k.kind === 'blanket') {
        ctx.fillStyle = k.sh > 0 ? '#9ad0ff' : 'rgba(40,40,70,.5)';
        ctx.beginPath();
        ctx.roundRect(x0 - hs, hy - hs * 0.9, hs * 2, hs * 1.8, hs * 0.4);
        ctx.fill();
        ctx.strokeStyle = k.sh > 0 ? '#ffffff' : 'rgba(255,255,255,.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        x0 += hs * 2.3;
      }
      for (let j = 0; j < maxHp; j++) drawHeart(ctx, x0 + j * hs * 2.3, hy, hs, j < k.hp, k.team ? '#ff5d7a' : '#5db8ff');
      // 화살표 (발 앞)
      const [ax, ay] = P(k.c + 0.5 + DX[k.dir] * 0.42, k.r + 0.55 + DY[k.dir] * 0.42, raiseOf(F.cell[k.r * COLS + k.c]));
      ctx.fillStyle = k.team ? 'rgba(255,120,100,.95)' : 'rgba(120,200,255,.95)';
      ctx.strokeStyle = 'rgba(20,20,40,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const dy = DY[k.dir], dxx = DX[k.dir], sz = R(0.016);
      ctx.moveTo(ax + dxx * sz, ay + dy * sz * 0.7);
      ctx.lineTo(ax - dy * sz - dxx * sz * 0.4, ay - dy * sz * 0.4 + dxx * sz * 0.7);
      ctx.lineTo(ax + dy * sz - dxx * sz * 0.4, ay - dy * sz * 0.4 - dxx * sz * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 졸린 아이 Zz · 핥이는 중
      if (s.phase === 'battle' && (rests(F, S, i, S.beat) === 1 || (k.kind === 'sleepy' && S.beat % 2 === 1 && t - s.flyT > 20))) {
        ctx.fillStyle = '#e0e6ff';
        ctx.font = `900 ${Math.max(12, R(0.036))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('zZ', x + z * 0.9, y - z * 2.6 - Math.sin(t * 0.08) * 3);
      }
    });
  // ═════════ 날아가는 베개 ═════════
  if (s.fly.length && t >= s.flyT) {
    const q = clamp01((t - s.flyT) / (s.hitT - s.flyT));
    s.fly.forEach((x, n) => {
      const k = S.kids[x.from];
      const [sx, sy0] = kidAt(x.from), z = zOf(k.r);
      const sy = sy0 - z * 2.6;
      const tc = x.to % COLS, tr = Math.floor(x.to / COLS);
      let [ex, ey] = x.tk >= 0 ? feetPx(tc, tr) : P(tc + 0.5, tr + 0.6, x.tk === -1 ? 0.06 : 0);
      ey -= x.tk >= 0 ? zOf(tr) * 1.7 : R(0.04);
      if (x.joint) ex += (n % 2 ? 1 : -1) * R(0.012);
      const qq = x.pierce ? clamp01(q * 1.15 - 0.15) : q;
      const px = sx + (ex - sx) * qq, py = sy + (ey - sy) * qq - Math.sin(qq * Math.PI) * (R(0.06) + Math.abs(ey - sy) * 0.25);
      drawPillow(ctx, px, py, R(0.026) * (k.kind === 'big' ? 1.5 : 1), qq * TAU * 1.3 + n, k.team ? '#ffe8e0' : '#fffaf2');
      // 꼬리 깃털
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let j = 1; j < 4; j++) {
        const q2 = Math.max(0, qq - j * 0.06), x2 = sx + (ex - sx) * q2, y2 = sy + (ey - sy) * q2 - Math.sin(q2 * Math.PI) * (R(0.06) + Math.abs(ey - sy) * 0.25);
        ctx.beginPath();
        ctx.arc(x2, y2, R(0.004) * (4 - j), 0, TAU);
        ctx.fill();
      }
    });
  }
  // ═════════ 누르고 있는 동안: 미리 보기 ═════════
  let pvNote = '', pvBad = false;
  if (s.phase === 'place' && s.down && S.hi < F.def.hand.length) {
    const cell = s.hover;
    if (cell >= 0) {
      const c = cell % COLS, r = Math.floor(cell / COLS);
      const S1 = cloneSim(S), i = placeKid(F, S1, cell), nk = S1.kids[i];
      const [gx, gy] = feetPx(c, r), z = zOf(r);
      // 고른 자리 고리
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(gx, gy, R(0.06) * SCf(r / ROWS), R(0.025) * SCf(r / ROWS), 0, 0, TAU);
      ctx.stroke();
      drawKid(ctx, gx, gy, z, { team: 0, kind: nk.kind, mood: 'throw', t, sh: nk.sh, messy: 0, seed: i + s.stage * 3, arm: 0.8, front: false, alpha: 0.75 });
      lane(nk, '#ffffff', 0.9);
      const th0 = openerThrows(F, S1, i);
      const occ1 = occOf(S1);
      // 내가(우리 쌍둥이가) 맞힐 상대: 빨강
      const hitCells = new Set<number>();
      for (const x of th0) {
        hitCells.add(x.to);
        const tc = x.to % COLS, tr = Math.floor(x.to / COLS);
        const [hx, hy] = x.tk >= 0 ? feetPx(tc, tr) : P(tc + 0.5, tr + 0.6);
        const zz = zOf(tr);
        ctx.strokeStyle = x.tk === -1 ? '#ffd0e0' : '#ff3b4f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(hx, hy - zz * 1.2, zz * 1.05, zz * 1.55, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 2;
        const [fx1, fy1] = x.from === i ? [gx, gy] : feetPx(S1.kids[x.from].c, S1.kids[x.from].r);
        ctx.beginPath();
        ctx.moveTo(fx1, fy1 - z * 2.4);
        ctx.quadraticCurveTo((fx1 + hx) / 2, Math.min(fy1, hy) - z * 3.2, hx, hy - zz * 1.8);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // 나를 맞힐 상대: 주황
      let threats = 0, guards = false;
      S1.kids.forEach((k, j) => {
        if (k.team !== 1 || k.out) return;
        const tg = scan(F, S1, occ1, k);
        const before = scan(F, S, occOf(S), k);
        if (before && before.tk === -2 && (!tg || tg.tk !== -2)) guards = true;
        if (!tg || tg.tk !== i) return;
        threats++;
        const [ex, ey] = feetPx(k.c, k.r), zz = zOf(k.r);
        ctx.strokeStyle = '#ffa63b';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.ellipse(ex, ey - zz * 1.2, zz * 1.35, zz * 1.9, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.max(12, R(0.036))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚠️', ex + zz * 1.25, ey - zz * 2.9);
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex, ey - zz * 2.2);
        ctx.lineTo(gx, gy - z * 1.6);
        ctx.stroke();
        ctx.setLineDash([]);
        void j;
      });
      const hits = th0.filter((x) => x.tk >= 0).length;
      const parts: string[] = [];
      if (th0.some((x) => x.tk === -1)) parts.push('🏰 요새에 막혀요');
      else if (!hits) parts.push('앞에 아무도 없어요');
      else parts.push(th0.some((x) => x.joint) ? '👯 같이 퍽퍽!' : th0.some((x) => x.pierce) ? '💪 두 명 퍽!' : '🎯 퍽!');
      parts.push(threats ? `🟠 ${threats}명이 날 맞혀요` : '🛡️ 안전');
      if (guards) parts.push('🧸 지켜요');
      if (F.cell[cell] & DOOR) parts.push('🚪 3박자째 걸려요');
      if (F.route.includes(cell)) parts.push('🐶 핥여요');
      pvNote = parts.join(' · ');
      pvBad = !hits || threats > 1 || !!(F.cell[cell] & DOOR);
      void hitCells;
    } else pvNote = '반짝이는 자리 쪽으로!';
  }
  // 1판 첫 톡 안내: 침대 위 손가락
  if (s.stage === 0 && s.phase === 'place' && S.hi === 0 && !s.down && t - s.startT > 20) {
    const bedSpot = F.spots.find((p) => F.cell[p] & BED && Math.floor(p / COLS) === 3) ?? F.spots[0];
    const [bx, by] = feetPx(bedSpot % COLS, Math.floor(bedSpot / COLS));
    const bob = Math.abs(Math.sin(t * 0.1)) * R(0.02);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.1);
    ctx.beginPath();
    ctx.ellipse(bx, by, R(0.07), R(0.03), 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${R(0.075)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', bx + R(0.02), by + R(0.05) + bob);
  }
  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const cellXY = (): [number, number] => feetPx(Math.round(e.x), Math.round(e.y));
    if (e.kind === 'hit') {
      const [x, y] = cellXY(), z = zOf(Math.round(e.y));
      fx.burst(x, y - z * 1.8, '#ffffff', 22, 4.2, 3);
      fx.burst(x, y - z * 1.8, '#fff0d8', 10, 2.5, 2.2);
      fx.ring(x, y - z * 1.6, e.col === '#cfe8ff' ? '#9ad0ff' : '#ffffff', R(0.09), 3);
      fx.kick(e.text === '퍽!' ? 3 : 5);
      say(x, y - z * 3.4, e.text!, e.col!, 20);
    }
    if (e.kind === 'fort') {
      const [x, y] = P(e.x + 0.5, e.y + 0.6, 0.06);
      fx.burst(x, y, '#ffd0e0', 10, 2.2, 2);
      say(x, y - R(0.05), e.text!, e.col!, 16);
    }
    if (e.kind === 'teddy') {
      const [x, y] = P(e.x + 0.5, e.y + 0.6);
      fx.burst(x, y - R(0.05), '#ffffff', 26, 3.4, 3.2);
      fx.kick(4);
      say(x, y - R(0.12), e.text!, e.col!, 18);
    }
    if (e.kind === 'fell') {
      const [x, y] = cellXY(), z = zOf(Math.round(e.y));
      fx.burst(x, y - z, '#ffffff', 30, 5, 3.2);
      fx.ring(x, y - z, '#ffe8a0', R(0.12), 4);
      fx.kick(6);
      say(x, y - z * 3.8, e.text!, e.col!, 18);
    }
    if (e.kind === 'hop') {
      const [x, y] = cellXY();
      fx.ring(x, y, '#fff6c0', R(0.06), 3);
    }
    if (e.kind === 'none' || e.kind === 'twinjoin' || e.kind === 'lick' || e.kind === 'doze' || e.kind === 'caught') {
      const [x, y] = cellXY(), z = zOf(Math.round(e.y));
      say(x, y - z * 3.6, e.text!, e.col!, e.kind === 'twinjoin' ? 18 : 14);
      if (e.kind === 'twinjoin') fx.burst(x, y - z * 2, '#ffd6f0', 18, 3, 2.4);
      if (e.kind === 'caught') fx.blink('#fff2c0', 0.25), fx.kick(5);
    }
    if (e.kind === 'nope') say(X(e.x), Y(e.y), e.text!, e.col!, 15), fx.kick(1.5);
    if (e.kind === 'lights') fx.blink('#000020', 0.35);
    if (e.kind === 'peek') say(X(0.5), Y(0.22), e.text!, e.col!, 18), fx.blink('#fff2c0', 0.18);
    if (e.kind === 'door') fx.blink('#fff2c0', 0.4), fx.kick(4);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.15);
    if (e.kind === 'clear') {
      for (const k of S.kids) if (k.team === 0 && !k.out) {
        const [x, y] = feetPx(k.c, k.r);
        fx.burst(x, y - R(0.06), '#ffe066', 16, 4, 2.6);
      }
      fx.burst(w / 2, Y(0.7), '#ffffff', 40, 6, 3);
    }
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = s.t;
  // 불 끄기 큰 글씨
  if (s.phase === 'lights') {
    const a = Math.min(1, s.pt / 6, (LIGHTS + 10 - s.pt) / 12);
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `900 ${R(0.062)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(10,10,40,.8)';
    const msg = s.pt < 22 ? '불 끈다~ 하나, 둘…' : '딸깍! 베개 싸움 시작!';
    ctx.strokeText(msg, w / 2, Y(0.64));
    ctx.fillStyle = '#fff6d6';
    ctx.fillText(msg, w / 2, Y(0.64));
    ctx.globalAlpha = 1;
  }
  // 끝: 이김/짐 큰 글씨 · 아빠 말풍선
  if (s.phase === 'end') {
    if (s.pt < 56) {
      const a = clamp01((s.pt - 6) / 8);
      ctx.globalAlpha = a;
      ctx.font = `900 ${R(0.07)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20,20,50,.75)';
      const msg = result > 0 ? '이겼다~! 방방!' : '졌다~ 쿨쿨…';
      ctx.strokeText(msg, w / 2, Y(0.64));
      ctx.fillStyle = result > 0 ? '#fff1a8' : '#ffd0c8';
      ctx.fillText(msg, w / 2, Y(0.64));
      ctx.globalAlpha = 1;
    } else {
      const a = clamp01((s.pt - 56) / 6);
      ctx.globalAlpha = a;
      const txt = '얘들아! 안 자고 뭐 해?!';
      ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`;
      const tw = ctx.measureText(txt).width + R(0.05), bx = w / 2, by = Y(0.135);
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.roundRect(bx - tw / 2, by - R(0.035), tw, R(0.07), R(0.03));
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx - R(0.02), by + R(0.03));
      ctx.lineTo(bx + R(0.02), by + R(0.07));
      ctx.lineTo(bx + R(0.03), by + R(0.03));
      ctx.fill();
      ctx.fillStyle = '#3a2440';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, bx, by + 1);
      ctx.globalAlpha = 1;
      if (s.pt >= 60) {
        ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
        ctx.fillStyle = '#e6ecff';
        ctx.fillText('(모두 이불 속으로 쏙!)', w / 2, Y(0.62));
      }
    }
  }
  ctx.restore();

  // ═════════ HUD ═════════
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const hb = R(WT);
  ctx.fillStyle = 'rgba(14,16,44,.92)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `🛏️ ${s.stage + 1}판`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.037, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT} · ${d.name}`, R(0.03) + tw1, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd36e';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  const pressing = s.phase === 'place' && s.down;
  // 새것 알림 (누르는 동안엔 미리 보기 말에 자리를 내준다)
  if (s.news && s.t - s.news.t < NEWS_T + 20 && !pressing) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.034) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = hb + R(0.04) - drop;
    ctx.fillStyle = 'rgba(40,30,80,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,110,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff6d6';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase === 'place' && !pressing) {
      const a = Math.min(1, age / 8, (90 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(0.27));
      ctx.scale(sc, sc);
      font(0.07, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20,20,50,.75)';
      const big = `${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.04, 800);
      const sub = `우리 편 ${F.def.hand.length}명 · 상대 ${F.foes.length}명`;
      ctx.strokeText(sub, 0, R(0.055));
      ctx.fillText(sub, 0, R(0.055));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 미리 보기 말
  if (pvNote) {
    font(0.037, 900);
    ctx.textAlign = 'center';
    const tw = Math.min(w - 8, ctx.measureText(pvNote).width + R(0.05));
    const by = Y(0.135);
    ctx.fillStyle = pvBad ? 'rgba(150,40,50,.94)' : 'rgba(30,40,90,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, by - R(0.03), tw, R(0.06), R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pvNote, w / 2, by + 1);
  }
  // ═════════ 디오라마 앞면 + 아래 띠 ═════════
  {
    const y0 = Y(PYf(1)), y1 = Y(PYf(1) + 0.035);
    const sg = ctx.createLinearGradient(0, y0, 0, y1);
    sg.addColorStop(0, '#8a5a36');
    sg.addColorStop(1, '#4a2c18');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(X(PXf(0, 1)), y0);
    ctx.lineTo(X(PXf(1, 1)), y0);
    ctx.lineTo(w, y1);
    ctx.lineTo(0, y1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,180,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(PXf(0, 1)), y0 + 0.5);
    ctx.lineTo(X(PXf(1, 1)), y0 + 0.5);
    ctx.stroke();
  }
  const by = Y(PYf(1) + 0.035);
  ctx.fillStyle = 'rgba(22,20,52,.97)';
  ctx.fillRect(0, by, w, Y(A) - by + 2);
  // 손패 (다음 아이) · 싸움 중엔 박자
  {
    const cy = by + R(0.072);
    if (s.phase === 'place') {
      let x = R(0.03);
      for (let j = S.hi; j < F.def.hand.length; j++) {
        const kind = F.def.hand[j], cur = j === S.hi;
        const cw = cur ? R(0.44) : R(0.11), ch = cur ? R(0.12) : R(0.1);
        ctx.fillStyle = cur ? 'rgba(255,214,110,.2)' : 'rgba(255,255,255,.07)';
        ctx.strokeStyle = cur ? '#ffd36e' : 'rgba(255,255,255,.25)';
        ctx.lineWidth = cur ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(x, cy - ch / 2, cw, ch, R(0.02));
        ctx.fill();
        ctx.stroke();
        drawKid(ctx, x + (cur ? R(0.065) : cw / 2), cy + ch / 2 - R(0.012), R(cur ? 0.04 : 0.03), { team: 0, kind, mood: cur ? 'win' : 'idle', t, sh: kind === 'blanket' ? 1 : 0, messy: 0, seed: j + 7, arm: 0, front: true });
        if (cur) {
          ctx.textAlign = 'left';
          font(0.038, 900);
          ctx.fillStyle = '#fff6d6';
          ctx.fillText(`다음: ${KIND_NAME[kind]}`, x + R(0.13), cy - R(0.02));
          font(0.032, 700);
          ctx.fillStyle = '#d8dcff';
          ctx.fillText(KIND_NOTE[kind], x + R(0.13), cy + R(0.025));
        }
        x += cw + R(0.015);
      }
    } else {
      ctx.textAlign = 'left';
      font(0.042, 900);
      ctx.fillStyle = '#fff6d6';
      const b = S.beat;
      const lab = s.phase === 'lights' ? '💡 딸깍 — 불 끈다!' : `🔔 박자 ${b}`;
      ctx.fillText(lab, R(0.03), cy);
      const dot0 = R(0.03) + ctx.measureText(lab).width + R(0.05);
      if (s.phase === 'battle') {
        // 박자 점
        for (let k = 0; k < Math.max(6, b + 1); k++) {
          const px = dot0 + k * R(0.045);
          if (px > w - R(0.2)) break;
          ctx.fillStyle = k < b ? '#ffd36e' : 'rgba(255,255,255,.2)';
          ctx.beginPath();
          ctx.arc(px, cy, R(0.012), 0, TAU);
          ctx.fill();
          if (F.door && (k + 1) % DAD_EVERY === 0) {
            ctx.fillStyle = '#ffffff';
            font(0.03, 900);
            ctx.textAlign = 'center';
            ctx.fillText('🚪', px, cy - R(0.03));
            ctx.textAlign = 'left';
            font(0.042, 900);
          }
        }
      }
      const out0 = S.kids.filter((k) => k.team === 0 && k.out).length, caught = S.kids.filter((k) => k.out === 2).length;
      ctx.textAlign = 'right';
      font(0.036, 800);
      ctx.fillStyle = '#d8dcff';
      ctx.fillText(caught ? `벌 서기 ${caught}명` : out0 ? `우리 편 ${out0}명 쿨쿨` : '우리 편 멀쩡!', w - R(0.03), cy);
    }
  }
  // 별 목표 셋
  {
    const y2 = by + R(0.17), gw = (w - R(0.06)) / 3;
    const ended = s.phase === 'end' || s.phase === 'result', won = ended && result > 0;
    const safeNow = !S.kids.some((k) => k.team === 0 && k.out);
    const bonusNow = d.bonus === 'teddy' ? S.ted > 0 : S.beat <= (d.fast ?? 3);
    const goals: [string, boolean | null][] = [
      ['다 눕히기', won ? true : ended ? false : null],
      ['아무도 안 눕기', !safeNow ? false : won ? true : null],
      [d.bonus === 'teddy' ? '🧸 인형 지키기' : `⚡ ${d.fast}박자 안에`, !bonusNow ? false : won ? true : null],
    ];
    goals.forEach(([txt, st], k) => {
      const gx = R(0.03) + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.3)' : st === false ? 'rgba(120,120,140,.25)' : 'rgba(255,255,255,.08)';
      ctx.strokeStyle = st === true ? '#ffd166' : st === false ? 'rgba(200,200,220,.4)' : 'rgba(255,230,180,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.026), gw - 4, R(0.052), R(0.026));
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      font(0.035, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
  }
  // 안내 한 줄
  {
    const y3 = by + R(0.238);
    let tip = '👆 누르면 누구를 맞히고 누구에게 맞는지 보여요';
    if (s.stage === 0 && S.hi === 0) tip = d.tip;
    else if (s.phase === 'place' && S.hi === 0 && t - s.startT < 400) tip = d.tip;
    else if (s.phase === 'place' && s.down) tip = '🔴 맞힐 상대 · 🟠 나를 맞힐 상대 — 떼면 폴짝!';
    else if (s.phase === 'battle' || s.phase === 'lights') tip = d.key === 'dad' ? '🚪 3박자마다 아빠가 문틈을 봐요 — 빛 칸은 딱!' : d.key === 'dog' ? '🐶 강아지가 발자국 칸을 따라 핥아요' : '🪶 불 꺼진 방에서 베개 싸움 중…';
    else if (s.phase === 'result') tip = result > 0 ? '다음 판으로!' : '같은 판을 다시 — 이번엔 꾹 눌러 보고 놓아요';
    ctx.textAlign = 'center';
    font(0.035, 800);
    ctx.fillStyle = '#fff6d6';
    let fs = 0.035;
    while (ctx.measureText(tip).width > w - R(0.04) && fs > 0.033) font((fs -= 0.001), 800);
    ctx.fillText(tip, w / 2, y3);
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = result > 0 ? 'rgba(30,30,70,.82)' : 'rgba(70,20,40,.82)';
    ctx.beginPath();
    ctx.roundRect(R(0.1), Y(0.5), R(0.8), R(0.26), R(0.04));
    ctx.fill();
    ctx.textAlign = 'center';
    font(result > 0 ? 0.06 : 0.048, 900);
    ctx.fillStyle = result > 0 ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(result > 0 ? (s.won ? '베개 싸움 챔피언! 🎉' : `${s.stage + 1}판 통과!`) : s.why, w / 2, Y(0.56));
    if (result > 0) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = s.gotStars[k];
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.3)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.11), Y(0.65));
        if (got && (fx.memo['star' + k] ?? -1) < s.endT) (fx.memo['star' + k] = s.endT), fx.burst(w / 2 + (k - 1) * R(0.11), Y(0.65), '#ffe066', 14, 3, 2.4);
      }
      font(0.034, 800);
      ctx.fillStyle = '#e6ecff';
      ctx.fillText(`별 하나 ${starPts(s.stage)}점`, w / 2, Y(0.72));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 판을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.66));
    }
    ctx.globalAlpha = 1;
  }
}
