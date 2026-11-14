/**
 * 동물 뒤집기 대결 (27라운드: 전략이 깊은 검증된 캐주얼 뼈대 × 공장의 와우) — 뒤집기 대결 × 가리키기(톡) × 턴제.
 * 뼈대: 오래 검증된 '뒤집기' 보드게임. 내 돌을 놓아 상대 돌을 내 돌 사이에(가로·세로·대각선) 끼우면 끼인 돌이 모두 내 색으로 뒤집힌다.
 *   놓을 수 있는 곳은 뒤집을 수 있는 곳뿐, 둘 곳이 없으면 한 번 쉬고, 둘 다 못 두면 끝 — 돌이 많은 쪽이 이긴다.
 * 조작(기준 9): 칸을 꾹(뒤집힐 돌이 들썩이고 수가 뜬다) → 떼면 '쾅' 발 도장. 칸 밖에서 떼면 취소. 키보드는 화살표 커서 + 스페이스.
 * 세계: 공원 벤치 위 보드게임 디오라마. 나(강아지)와 판마다 다른 동물 상대. 돌은 앞뒤가 강아지 발/상대 발 도장.
 * 상대(결정적 AI, s.rng로 동점만 깬다): 성격마다 다른 평가 함수 — 성격은 판 시작에 상대가 직접 말해 준다(버릇을 알면 덫을 놓을 수 있다).
 * 와우(비틀기): 🦴 뼈다귀 칸에 두면 강아지가 신나서 한 번 더 둔다 — 두 번 연달아 두면 상대가 막을 틈 없이 귀퉁이를 뺏는다.
 * 판 8개 = 상대 8마리 (6×6). 목표 = 이기기. 별 = ★ 이기기 · ★ M개 이상 차이 · ★ 판마다 다른 조건
 *   (토끼 돌 4개 이하로 몰기 / 뼈다귀 다 먹기 / 귀퉁이 N개 / 황금 칸 다 / 곰을 한 번 쉬게 하기 / 꿀 칸 다). 지면 하트 -1, 그 상대와 다시.
 * 상대 성격: 토끼(구석 옆에 숨음·적게 뒤집음) · 너구리(가장 많이 뒤집기) · 거북(자리 값) · 고슴도치(내 둘 곳 줄이기) · 다람쥐(귀퉁이·가장자리)
 *   · 곰(왕창·풍선·귀퉁이) · 부엉이(두 수 앞, 강아지는 많이 뒤집을 거라 봄) · 여우(두 수 앞 최악 가정 + 둘 곳 수).
 * 펼쳐짐(하는 일이 바뀐다): 1판 겁쟁이 토끼(꾹·도미노·🚩 귀퉁이) → 2판 욕심쟁이 너구리 🦴 뼈다귀(언제 먹어 두 번 둘까)
 *   → 3판 귀퉁이 거북 🪨 바위(줄이 끊기고 바위 옆이 새 귀퉁이) + 🪶 깃털(판마다 한 번 무르기)
 *   → 4판 막기 고슴도치 ⭐ 황금 칸(2개로 셈 — 끝까지 지키기) → 5판 가장자리 다람쥐 🕳️ 구멍 판(귀퉁이가 여기저기)
 *   → 6판 힘센 곰 🎈 풍선 칸(펑! 둘레가 다 뒤집힘 — 먼저 터뜨리기, 곰을 쉬게 하기) → 7판 두 수 앞 부엉이 🍯 꿀 칸(절대 안 뒤집히는 돌)
 *   → 8판 여우 챔피언(전부).
 * 쾌감: 끼인 돌이 도미노처럼 착착착 차례로 뒤집히고, 많이 뒤집을수록 글자·흔들림·숫자가 커지며 큰 도미노는 잠깐 느려진다.
 * 웃음: 상대 동물은 크게 뒤집히면 발을 동동 구르며 씩씩, 귀퉁이를 뺏기면 털이 곤두서고, 지면 박수를 쳐 준다.
 *   강아지는 꾹 누르면 혀를 내밀고 집중, 크게 뒤집으면 꼬리를 붕붕, 뼈다귀를 먹으면 냠냠, 지면 어질어질.
 *   벤치 등받이의 비둘기 둘은 큰 도미노에 놀라 푸드덕 날아오른다.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
export const SZ = 6, NC = 36;
export const ME = 1, OP = 2, ROCK = 3, HOLE = 4;
const STAR_PTS = 100, WIN_PTS = 100, DIFF_PTS = 3;
const PLACE_T = 6, FLIP_T = 9, GAP = 3, RESULT_OK = 130, RESULT_FAIL = 130, NEWS_T = 200, SETTLE_T = 40;

// ───────────────────────────── 판 ─────────────────────────────
export type Persona = 'rabbit' | 'raccoon' | 'turtle' | 'hedgehog' | 'squirrel' | 'bear' | 'owl' | 'fox';
export type Goal = 'corner' | 'bone' | 'gold' | 'pass' | 'honey' | 'crush';
export interface StageDef {
  key: string; who: Persona; name: string; emoji: string; say: string; news: string; tip: string;
  rocks: number; gold: number; bones: number; honey: number; balloons: number; shape: boolean;
  /** ★2: M개 이상 차이로 이기기 · ★3 조건 (corner는 gk개 이상, 0이면 판의 귀퉁이 수로 정함) · 상대가 생각하는 틱 */
  M: number; goal: Goal; gk: number; think: number;
}
export const STAGES: StageDef[] = [
  { key: 'rabbit', who: 'rabbit', name: '겁쟁이 토끼', emoji: '🐰', say: '무서워… 구석 옆에 숨을래', news: '🐾 반짝이는 칸을 꾹 → 떼면 쾅! 끼인 돌이 뒤집혀요', tip: '🐰 토끼 돌을 4개 이하로 몰면 ★', rocks: 0, gold: 0, bones: 0, honey: 0, balloons: 0, shape: false, M: 20, goal: 'crush', gk: 4, think: 16 },
  { key: 'raccoon', who: 'raccoon', name: '욕심쟁이 너구리', emoji: '🦝', say: '난 제일 많이 뒤집는 데만 둬!', news: '🦴 뼈다귀 칸에 두면 냠! 한 번 더 둬요', tip: '🦴 뼈다귀로 두 번 연달아 — 너구리가 못 막아요', rocks: 0, gold: 0, bones: 2, honey: 0, balloons: 0, shape: false, M: 6, goal: 'bone', gk: 0, think: 10 },
  { key: 'turtle', who: 'turtle', name: '귀퉁이 거북', emoji: '🐢', say: '귀퉁이는 내 거야… 느릿느릿', news: '🪨 바위 — 줄이 끊겨요 · 바위 옆 가장자리도 귀퉁이', tip: '🚩 귀퉁이 옆 칸에 두면 거북이 귀퉁이를 가져가요', rocks: 2, gold: 0, bones: 0, honey: 0, balloons: 0, shape: false, M: 6, goal: 'corner', gk: 3, think: 18 },
  { key: 'hedgehog', who: 'hedgehog', name: '막기 대장 고슴도치', emoji: '🦔', say: '네가 둘 곳을 꽁꽁 막을 거야!', news: '⭐ 황금 칸 돌은 2개로 세요', tip: '⭐ 황금 칸은 끝까지 지켜야 내 것', rocks: 0, gold: 2, bones: 0, honey: 0, balloons: 0, shape: false, M: 8, goal: 'gold', gk: 0, think: 12 },
  { key: 'squirrel', who: 'squirrel', name: '가장자리 다람쥐', emoji: '🐿️', say: '가장자리에 도토리 숨겨야지~', news: '🕳️ 구멍 난 판 — 귀퉁이가 여기저기!', tip: '🚩 깃발 칸이 귀퉁이 — 구멍 옆도 귀퉁이예요', rocks: 0, gold: 0, bones: 0, honey: 0, balloons: 0, shape: true, M: 8, goal: 'corner', gk: 0, think: 10 },
  { key: 'bear', who: 'bear', name: '힘센 곰', emoji: '🐻', say: '크게 크게! 한 번에 왕창!', news: '🎈 풍선 칸에 두면 펑! 둘레 돌이 다 뒤집혀요', tip: '🙊 곰이 둘 곳을 없애면 곰은 한 번 쉬어요', rocks: 0, gold: 0, bones: 0, honey: 0, balloons: 2, shape: false, M: 8, goal: 'pass', gk: 0, think: 10 },
  { key: 'owl', who: 'owl', name: '두 수 앞 부엉이', emoji: '🦉', say: '부엉… 두 수 앞을 보고 있지', news: '🍯 꿀 칸 돌은 끈적 — 절대 안 뒤집혀요', tip: '🍯 꿀 칸은 먼저 차지하는 쪽 것', rocks: 0, gold: 0, bones: 0, honey: 2, balloons: 0, shape: false, M: 6, goal: 'honey', gk: 0, think: 16 },
  { key: 'fox', who: 'fox', name: '여우 챔피언', emoji: '🦊', say: '후후, 다 계산해 뒀지', news: '🏆 결승 — 바위·황금·뼈다귀가 다 나와요', tip: '🦊 여우는 내가 둘 곳을 줄이려 해요', rocks: 2, gold: 2, bones: 1, honey: 0, balloons: 0, shape: false, M: 6, goal: 'gold', gk: 0, think: 12 },
];
export const STAGE_COUNT = STAGES.length;

export interface Level {
  stage: number; init: Int8Array; shape: string;
  gold: Uint8Array; honey: Uint8Array; bones: number[]; balloons: number[];
  /** 귀퉁이(어느 줄로도 끼일 수 없는 자리) · 가장자리 · 자리 값 · X·C 자리가 기대는 귀퉁이 */
  corner: Uint8Array; corners: number[]; edge: Uint8Array; w8: Int16Array; assoc: Int16Array;
  /** 칸마다 8방향 줄 (바위·구멍·판 끝에서 끊김) · 둘레 8칸 */
  ray: Int16Array; rs: Int16Array; rl: Int8Array; nb: Int16Array[];
  M: number; gk: number;
  habit: { stars: number; win: boolean; diff: number };
}
export interface Sim {
  b: Int8Array; turn: number; end: boolean;
  /** 남은 뼈다귀·풍선 (비트) · 강아지가 먹은 뼈다귀 · 쉰 횟수 · 둔 수 */
  bone: number; ball: number; ate: number; opPass: number; myPass: number; n: number;
}
export interface Rec { c: number; who: number; fl: number[]; blast: number[]; bone: boolean; again: boolean; pass: number }

const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
const openAt = (b: Int8Array, x: number, y: number) => x >= 0 && y >= 0 && x < SZ && y < SZ && b[y * SZ + x] < ROCK;
const CENTER = [14, 15, 20, 21];

function geometry(init: Int8Array) {
  const ray: number[] = [], rs = new Int16Array(NC * 8), rl = new Int8Array(NC * 8), nb: Int16Array[] = [];
  for (let c = 0; c < NC; c++) {
    const x = c % SZ, y = (c / SZ) | 0, ns: number[] = [];
    for (let d = 0; d < 8; d++) {
      rs[c * 8 + d] = ray.length;
      let k = 0, px = x + DX[d], py = y + DY[d];
      while (openAt(init, px, py)) ray.push(py * SZ + px), k++, (px += DX[d]), (py += DY[d]);
      rl[c * 8 + d] = k;
      if (openAt(init, x + DX[d], y + DY[d])) ns.push((y + DY[d]) * SZ + x + DX[d]);
    }
    nb.push(Int16Array.from(ns));
  }
  const corner = new Uint8Array(NC), edge = new Uint8Array(NC), w8 = new Int16Array(NC), assoc = new Int16Array(NC).fill(-1);
  for (let c = 0; c < NC; c++) {
    if (init[c] >= ROCK) continue;
    let blocked = 0;
    for (let d = 0; d < 4; d++) if (rl[c * 8 + d] === 0 || rl[c * 8 + d + 4] === 0) blocked++;
    if (blocked === 4) corner[c] = 1;
    if (blocked > 0) edge[c] = 1;
  }
  for (let c = 0; c < NC; c++) {
    if (init[c] >= ROCK) continue;
    if (corner[c]) {
      w8[c] = 60;
      continue;
    }
    let w = edge[c] ? 8 : 0;
    for (let d = 0; d < 8; d++) {
      if (!rl[c * 8 + d]) continue;
      const q = ray[rs[c * 8 + d]];
      if (!corner[q]) continue;
      const v = d % 2 ? (edge[c] ? -14 : -28) : -10;
      if (v < w || assoc[c] < 0) (w = Math.min(w, v)), (assoc[c] = q);
    }
    w8[c] = w;
  }
  const corners = [...Array(NC).keys()].filter((c) => corner[c]);
  return { ray: Int16Array.from(ray), rs, rl, nb, corner, corners, edge, w8, assoc };
}

/** c에 who가 두면 뒤집히는 수 (out이 있으면 그 칸들, 줄마다 가까운 것부터) */
export function flipsAt(L: Level, b: Int8Array, c: number, who: number, out: number[] | null): number {
  if (b[c] !== 0) return 0;
  const opp = 3 - who;
  let tot = 0;
  for (let d = 0; d < 8; d++) {
    const k0 = c * 8 + d, st = L.rs[k0], len = L.rl[k0];
    let k = 0;
    while (k < len) {
      const q = L.ray[st + k];
      if (b[q] !== opp || L.honey[q]) break;
      k++;
    }
    if (k > 0 && k < len && b[L.ray[st + k]] === who) {
      tot += k;
      if (out) for (let j = 0; j < k; j++) out.push(L.ray[st + j]);
    }
  }
  return tot;
}
function canPlace(L: Level, b: Int8Array, c: number, who: number): boolean {
  if (b[c] !== 0) return false;
  const opp = 3 - who;
  for (let d = 0; d < 8; d++) {
    const k0 = c * 8 + d, st = L.rs[k0], len = L.rl[k0];
    let k = 0;
    while (k < len) {
      const q = L.ray[st + k];
      if (b[q] !== opp || L.honey[q]) break;
      k++;
    }
    if (k > 0 && k < len && b[L.ray[st + k]] === who) return true;
  }
  return false;
}
export function movesOf(L: Level, S: Sim, who: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < NC; c++) if (canPlace(L, S.b, c, who)) out.push(c);
  return out;
}
export function countMoves(L: Level, b: Int8Array, who: number): number {
  let n = 0;
  for (let c = 0; c < NC; c++) if (canPlace(L, b, c, who)) n++;
  return n;
}
function hasMove(L: Level, b: Int8Array, who: number): boolean {
  for (let c = 0; c < NC; c++) if (canPlace(L, b, c, who)) return true;
  return false;
}
/** 풍선이 터지면 뒤집히는 둘레 칸 (out이 있으면 그 칸들) */
function blastAt(L: Level, S: Sim, c: number, who: number, out: number[] | null): number {
  const bi = L.balloons.indexOf(c);
  if (bi < 0 || !((S.ball >> bi) & 1)) return 0;
  let n = 0;
  for (const q of L.nb[c]) if (S.b[q] === 3 - who && !L.honey[q]) n++, out?.push(q);
  return n;
}

export function newSim(L: Level): Sim {
  const S: Sim = { b: L.init.slice(), turn: ME, end: false, bone: (1 << L.bones.length) - 1, ball: (1 << L.balloons.length) - 1, ate: 0, opPass: 0, myPass: 0, n: 0 };
  if (!hasMove(L, S.b, ME)) hasMove(L, S.b, OP) ? (S.turn = OP) : (S.end = true);
  return S;
}
export const cloneSim = (S: Sim): Sim => ({ ...S, b: S.b.slice() });

/** 한 수 두기 (부를 쪽이 canPlace 확인). 뒤집기 → 풍선 → 뼈다귀 → 다음 차례(쉼·끝) */
export function play(L: Level, S: Sim, c: number, rec?: Rec): void {
  const who = S.turn, b = S.b, fl: number[] = [];
  flipsAt(L, b, c, who, fl);
  const isBlast = blastAt(L, S, c, who, null) > 0 || L.balloons.indexOf(c) >= 0;
  b[c] = who;
  for (const q of fl) b[q] = who;
  const blast: number[] = [];
  if (isBlast) {
    const bi = L.balloons.indexOf(c);
    if ((S.ball >> bi) & 1) {
      S.ball &= ~(1 << bi);
      for (const q of L.nb[c]) if (b[q] === 3 - who && !L.honey[q]) (b[q] = who), blast.push(q);
    }
  }
  let again = false, bone = false;
  const ki = L.bones.indexOf(c);
  if (ki >= 0 && (S.bone >> ki) & 1) {
    S.bone &= ~(1 << ki);
    bone = true;
    if (who === ME) (S.ate++, (again = true));
  }
  S.n++;
  const first = again ? who : 3 - who;
  let pass = 0;
  if (hasMove(L, b, first)) S.turn = first;
  else if (hasMove(L, b, 3 - first)) {
    S.turn = 3 - first;
    if (!again) {
      pass = first;
      if (first === OP) S.opPass++;
      else S.myPass++;
    }
  } else (S.end = true), (S.turn = 0);
  if (rec) (rec.c = c), (rec.who = who), (rec.fl = fl), (rec.blast = blast), (rec.bone = bone), (rec.again = again), (rec.pass = pass);
}

export function countOf(L: Level, b: Int8Array, who: number) {
  let n = 0;
  for (let c = 0; c < NC; c++) if (b[c] === who) n += L.gold[c] ? 2 : 1;
  return n;
}
export const cornersOf = (L: Level, b: Int8Array, who: number) => L.corners.reduce((a, c) => a + (b[c] === who ? 1 : 0), 0);
/** ★3 조건 지금 상태: [지금 값, 목표 값] */
export function goalOf(L: Level, S: Sim): [number, number] {
  const d = STAGES[L.stage];
  const cnt = (m: Uint8Array) => {
    let k = 0, n = 0;
    for (let c = 0; c < NC; c++) if (m[c]) (n++, S.b[c] === ME && k++);
    return [k, n] as [number, number];
  };
  switch (d.goal) {
    case 'corner': return [cornersOf(L, S.b, ME), L.gk];
    case 'bone': return [S.ate, L.bones.length];
    case 'gold': return cnt(L.gold);
    case 'honey': return cnt(L.honey);
    case 'pass': return [Math.min(1, S.opPass), 1];
    case 'crush': return [countOf(L, S.b, OP) <= L.gk ? 1 : 0, 1];
  }
}
export const goalDone = (L: Level, S: Sim) => {
  const [a, b] = goalOf(L, S);
  return a >= b;
};
export function starsOf(L: Level, S: Sim): number {
  const me = countOf(L, S.b, ME), op = countOf(L, S.b, OP);
  if (me <= op) return 0;
  return 1 + (me - op >= L.M ? 1 : 0) + (goalDone(L, S) ? 1 : 0);
}

// ───────────────────────────── 상대 동물의 머리 (결정적, 동점만 rng) ─────────────────────────────
/** 누구 돌이든 그 자리의 값 (귀퉁이가 이미 찼으면 옆 칸은 위험하지 않다) */
const dynW = (L: Level, b: Int8Array, c: number) => {
  const a = L.assoc[c];
  return a >= 0 && b[a] !== 0 ? 3 : L.w8[c];
};
function posFor(L: Level, b: Int8Array, who: number) {
  let v = 0;
  for (let c = 0; c < NC; c++) {
    const x = b[c];
    if (x !== ME && x !== OP) continue;
    const w = dynW(L, b, c) + (L.honey[c] ? 16 : 0) + (L.gold[c] ? 10 : 0) + 1;
    v += x === who ? w : -w;
  }
  return v;
}
/** 상대가 c에 두는 수의 값 (성격마다 다르다, 클수록 좋아함) */
export function aiValue(L: Level, S: Sim, c: number, P: Persona): number {
  const b = S.b, fl = flipsAt(L, b, c, OP, null), bl = blastAt(L, S, c, OP, null);
  switch (P) {
    case 'rabbit': // 겁쟁이: 구석 옆에 숨고, 조금만 뒤집고, 귀퉁이·가장자리는 무서워한다
      return (L.assoc[c] >= 0 ? 30 : 0) - fl * 3 - (L.corner[c] ? 80 : 0) - (L.edge[c] ? 10 : 0);
    case 'raccoon': // 욕심쟁이: 가장 많이 뒤집는 칸
      return fl + bl + (L.assoc[c] >= 0 && b[L.assoc[c]] === 0 ? 2.5 : 0);
    case 'turtle': // 귀퉁이 거북: 자리 값(귀퉁이 최고, 귀퉁이 옆은 피함) + 조금 뒤집기
      return dynW(L, b, c) + fl * 0.6 + (L.gold[c] ? 8 : 0) + (L.honey[c] ? 10 : 0);
    case 'hedgehog': { // 막기 대장: 강아지가 둘 곳 수를 가장 적게
      const S2 = cloneSim(S);
      play(L, S2, c);
      const mob = S2.end ? 0 : countMoves(L, S2.b, ME);
      return -mob * 4 + dynW(L, b, c) * 0.8 + (S2.turn === OP ? 25 : 0) + fl * 0.2 + (L.gold[c] ? 12 : 0);
    }
    case 'squirrel': // 가장자리 다람쥐: 귀퉁이(도토리 숨길 구석)부터, 그다음 가장자리, 조용히(적게) 뒤집기
      return (L.edge[c] ? 20 : 0) + (L.corner[c] ? 80 : 0) - fl * 1.5 + (L.assoc[c] >= 0 && b[L.assoc[c]] === 0 ? -25 : 0);
    case 'bear': // 힘센 곰: 왕창 뒤집기(풍선 최고) + 귀퉁이
      return fl * 2 + bl * 3 + (L.corner[c] ? 60 : 0);
    case 'owl':
    case 'fox': { // 두 수 앞: 내가 두고 → 강아지가 받아치면?
      const S2 = cloneSim(S);
      play(L, S2, c);
      const val = (T: Sim) => {
        if (T.end) {
          const d = countOf(L, T.b, OP) - countOf(L, T.b, ME);
          return d > 0 ? 5000 + d : d === 0 ? 0 : -5000 + d;
        }
        let v = posFor(L, T.b, OP);
        if (P === 'fox') v += 5 * (countMoves(L, T.b, OP) - countMoves(L, T.b, ME)) + (T.turn === OP ? 12 : 0);
        return v;
      };
      if (S2.end || S2.turn === OP) return val(S2) + (S2.turn === OP ? 15 : 0);
      // 여우: 강아지가 가장 아프게 받아친다고 본다 · 부엉이: 강아지가 가장 많이 뒤집는 데 둘 거라고 본다
      let worst = 1e9, most = -1;
      for (let q = 0; q < NC; q++) {
        if (!canPlace(L, S2.b, q, ME)) continue;
        const S3 = cloneSim(S2);
        play(L, S3, q);
        const v = val(S3);
        if (P === 'fox') worst = Math.min(worst, v);
        else {
          const n = flipsAt(L, S2.b, q, ME, null);
          if (n > most || (n === most && v < worst)) (most = n), (worst = v);
        }
      }
      return worst;
    }
  }
}
export function aiPick(L: Level, S: Sim, P: Persona, rng: Rng): number {
  let best = -1e18, list: number[] = [];
  for (let c = 0; c < NC; c++) {
    if (!canPlace(L, S.b, c, OP)) continue;
    const v = aiValue(L, S, c, P);
    if (v > best + 1e-6) (best = v), (list = [c]);
    else if (v > best - 1e-6) list.push(c);
  }
  if (!list.length) return -1;
  return list.length === 1 ? list[0] : list[Math.floor(rng() * list.length)];
}

// ───────────────────────────── 강아지 쪽 수 읽기 (잘하는 봇) ─────────────────────────────
const LOSS = -5000;
function terminal(L: Level, S: Sim) {
  const d = countOf(L, S.b, ME) - countOf(L, S.b, OP);
  if (d <= 0) return LOSS + (d === 0 ? 500 : 0) + d * 10;
  return starsOf(L, S) * 1000 + d * 10;
}
function evalMe(L: Level, S: Sim): number {
  const b = S.b, d = STAGES[L.stage];
  let v = 0, cm = 0, me = 0, op = 0;
  for (let c = 0; c < NC; c++) {
    const x = b[c];
    if (x !== ME && x !== OP) continue;
    let w = dynW(L, b, c);
    if (L.honey[c]) w += d.goal === 'honey' ? 40 : 16;
    if (L.gold[c]) w += d.goal === 'gold' ? 24 : 10;
    if (x === ME) (v += w), me++, L.corner[c] && cm++;
    else (v -= w), op++;
  }
  if (d.goal === 'corner') v += Math.min(cm, L.gk) * 25;
  if (d.goal === 'crush') v -= op * 10;
  const mm = countMoves(L, b, ME), mo = countMoves(L, b, OP);
  v += (mm - mo) * 5;
  if (mo === 0) v += d.goal === 'pass' ? 90 : 12;
  v += S.ate * (d.goal === 'bone' ? 150 : 45) + S.opPass * (d.goal === 'pass' ? 260 : 25);
  if (me + op > 24) v += (me - op) * 3;
  return v;
}
function order(L: Level, S: Sim, who: number): number[] {
  const ms = movesOf(L, S, who);
  const key = (c: number) => dynW(L, S.b, c) + (who === ME && L.bones.indexOf(c) >= 0 && (S.bone >> L.bones.indexOf(c)) & 1 ? 40 : 0) + (L.gold[c] ? 10 : 0) + (L.honey[c] ? 12 : 0);
  return ms.sort((a, b) => key(b) - key(a));
}
let nodes = 0;
function search(L: Level, S: Sim, depth: number, alpha: number, beta: number): number {
  nodes++;
  if (S.end) return terminal(L, S);
  if (depth <= 0) return evalMe(L, S);
  const who = S.turn, ms = order(L, S, who);
  if (who === ME) {
    let v = -1e9;
    for (const m of ms) {
      const S2 = cloneSim(S);
      play(L, S2, m);
      v = Math.max(v, search(L, S2, depth - 1, alpha, beta));
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return v;
  }
  let v = 1e9;
  for (const m of ms) {
    const S2 = cloneSim(S);
    play(L, S2, m);
    v = Math.min(v, search(L, S2, depth - 1, alpha, beta));
    if (v < beta) beta = v;
    if (alpha >= beta) break;
  }
  return v;
}
const empties = (S: Sim) => {
  let n = 0;
  for (let c = 0; c < NC; c++) if (S.b[c] === 0) n++;
  return n;
};
export const EXACT = 10, DEPTH = 5;
/** 잘하는 봇의 수: 끝이 가까우면 끝까지(별 조건까지) 읽고, 아니면 4수 앞을 본다 */
export function smartPick(L: Level, S: Sim): number {
  const e = empties(S), depth = e <= EXACT ? 99 : DEPTH;
  let best = -1e18, pick = -1;
  for (const m of order(L, S, ME)) {
    const S2 = cloneSim(S);
    play(L, S2, m);
    const v = search(L, S2, depth - 1, best, 1e9);
    if (v > best) (best = v), (pick = m);
  }
  return pick;
}
export const searchNodes = () => nodes;
/** 버릇 하나(측정용): 가장 많이 뒤집는 칸 (같으면 읽는 순서로 첫 칸) */
export function greedyPick(L: Level, S: Sim): number {
  let best = 0, pick = -1;
  for (let c = 0; c < NC; c++) {
    const n = flipsAt(L, S.b, c, ME, null) + (S.b[c] === 0 && canPlace(L, S.b, c, ME) ? blastAt(L, S, c, ME, null) : 0);
    if (n > best) (best = n), (pick = c);
  }
  return pick;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function runVs(L: Level, pickMe: (S: Sim) => number, r: Rng): Sim {
  const S = newSim(L), P = STAGES[L.stage].who;
  for (let g = 0; g < 80 && !S.end; g++) play(L, S, S.turn === ME ? pickMe(S) : aiPick(L, S, P, r));
  return S;
}
function habitRun(L: Level, r: Rng) {
  const S = runVs(L, (T) => greedyPick(L, T), r);
  const diff = countOf(L, S.b, ME) - countOf(L, S.b, OP);
  return { stars: starsOf(L, S), win: diff > 0, diff };
}
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = runVs(L, (T) => {
      const ms = movesOf(L, T, ME);
      return ms[Math.floor(r() * ms.length)];
    }, r);
    if (countOf(L, S.b, ME) > countOf(L, S.b, OP)) ok++;
  }
  return ok / n;
}

function finishLevel(stage: number, init: Int8Array, shape: string, marks: { gold?: number[]; honey?: number[]; bones?: number[]; balloons?: number[] }): Level {
  const g = geometry(init), d = STAGES[stage];
  const gold = new Uint8Array(NC), honey = new Uint8Array(NC);
  for (const c of marks.gold ?? []) gold[c] = 1;
  for (const c of marks.honey ?? []) honey[c] = 1;
  const gk = d.goal === 'corner' ? d.gk || Math.ceil(g.corners.length * 0.6) : d.gk;
  return { stage, init, shape, gold, honey, bones: marks.bones ?? [], balloons: marks.balloons ?? [], ...g, M: d.M, gk, habit: { stars: 0, win: false, diff: 0 } };
}
function baseBoard(): Int8Array {
  const b = new Int8Array(NC);
  b[14] = OP, b[21] = OP, b[15] = ME, b[20] = ME;
  return b;
}
/** 1판: 첫 수에 셋이 착착착 뒤집히게 (손으로 만든 시작) */
function firstLevel(): Level {
  const b = new Int8Array(NC);
  // 가운데 줄: _ O O O M _ · 아래 줄: _ _ M O _ _
  b[13] = OP, b[14] = OP, b[15] = OP, b[16] = ME, b[20] = ME, b[21] = OP;
  return finishLevel(0, b, '', {});
}
const ring = (c: number) => Math.max(Math.abs((c % SZ) - 2.5), Math.abs(((c / SZ) | 0) - 2.5)) - 0.5;
function makeLevel(stage: number, r: Rng): Level | null {
  const d = STAGES[stage], init = baseBoard();
  let shape = '';
  if (d.shape) {
    shape = r() < 0.5 ? 'octa' : 'notch';
    const holes = shape === 'octa' ? [0, 5, 30, 35] : [2, 3, 33, 32, 12, 18, 17, 23];
    for (const c of holes) init[c] = HOLE;
  }
  const isCornerCell = (c: number) => c === 0 || c === 5 || c === 30 || c === 35;
  const used = new Set<number>(CENTER);
  const pickPairs = (n: number, ok: (c: number) => boolean) => {
    const out: number[] = [];
    const cand = shuffle([...Array(NC).keys()].filter((c) => init[c] === 0 && !used.has(c) && !used.has(35 - c) && ok(c) && ok(35 - c) && c < 35 - c), r);
    for (const c of cand) {
      if (out.length >= n) break;
      if (used.has(c) || used.has(35 - c)) continue;
      out.push(c);
      used.add(c);
      if (out.length < n) out.push(35 - c), used.add(35 - c);
    }
    return out.length >= n ? out : null;
  };
  // 바위 (판 모양을 바꾸므로 먼저)
  if (d.rocks) {
    const rk = pickPairs(d.rocks, (c) => !isCornerCell(c) && ring(c) >= 1);
    if (!rk) return null;
    for (const c of rk) init[c] = ROCK;
  }
  const g0 = geometry(init), G0 = { ...g0, honey: new Uint8Array(NC) } as unknown as Level;
  const notCorner = (c: number) => !g0.corner[c];
  // 첫 수에 바로 먹히는 자리는 안 된다 (장치는 판 중간에 다투게)
  const late = (c: number) => notCorner(c) && ring(c) >= 1 && !canPlace(G0, init, c, ME) && !canPlace(G0, init, c, OP);
  const gold = d.gold ? pickPairs(d.gold, notCorner) : [];
  const honey = d.honey ? pickPairs(d.honey, late) : [];
  const bones = d.bones ? pickPairs(d.bones, (c) => late(c) && ring(c) >= 2) : [];
  const balloons = d.balloons ? pickPairs(d.balloons, late) : [];
  if (!gold || !honey || !bones || !balloons) return null;
  return finishLevel(stage, init, shape, { gold, honey, bones, balloons });
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  if (stage === 0) pick = firstLevel();
  else {
    for (let tries = 0, c = 0; c < 6 && tries < 40; tries++) {
      const L = makeLevel(stage, r);
      if (!L) continue;
      c++;
      L.habit = habitRun(L, r);
      let v: number;
      if (stage === 1) v = -Math.abs(randomPass(L, r, 16) - 0.85) + (L.habit.stars < 3 ? 0.05 : 0);
      else v = (L.habit.stars < 3 ? 2 : 0) + (L.habit.win ? 0 : 0.3) + r() * 0.1;
      if (v > bv) (bv = v), (pick = L);
    }
  }
  if (!pick) pick = firstLevel();
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick);
  return pick;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; n?: number }
/** 한 수의 연출: 놓인 칸, 차례로 뒤집히는 칸(dl = 뒤집히는 틱), 풍선으로 뒤집히는 칸(bt 틱) */
interface Anim { who: number; c: number; fl: number[]; dl: number[]; blast: number[]; bt: number; t0: number; dur: number; ready: number; bone: boolean; again: boolean; pass: number; big: boolean }
export interface DuelState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim;
  down: boolean; ax: number; ay: number; hover: number; holdT: number; btn: boolean; lastTap: number; taps: number;
  anim: Anim | null; thinkUntil: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mood: string; moodT: number; foe: string; foeT: number; birdT: number; birdN: number;
  /** 🪶 깃털(판마다 1번 무르기): 남은 수 · 바로 전 내 수 직전 상태 */
  feather: number; prev: Sim | null; featherT: number;
  /** 상대 말풍선 */
  sayText: string; sayT: number; sayDur: number; passT: number;
  retry: boolean; diff: number; me: number; op: number;
}

const ev = (s: DuelState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, n });
function tip(s: DuelState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: DuelState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: DuelState, m: string) => ((s.mood = m), (s.moodT = s.t));
const setFoe = (s: DuelState, m: string) => ((s.foe = m), (s.foeT = s.t));
const foeSay = (s: DuelState, text: string, dur = 90) => ((s.sayText = text), (s.sayT = s.t), (s.sayDur = dur));

// 화면 배치 (가로 0~1, 세로 0~A)
export const CW = 0.142, CH = CW * 0.86, BX0 = 0.5 - 3 * CW, BY0 = 0.382;
export const cellX = (c: number) => BX0 + ((c % SZ) + 0.5) * CW;
export const cellY = (c: number) => BY0 + (((c / SZ) | 0) + 0.5) * CH;
/** 깃털 단추 */
const FX = 0.885, FY = 1.205, FR = 0.06;
function cellAt(L: Level, x: number, y: number) {
  const gx = Math.floor((x - BX0) / CW), gy = Math.floor((y - BY0) / CH);
  if (gx < 0 || gy < 0 || gx >= SZ || gy >= SZ) return -1;
  const c = gy * SZ + gx;
  return L.init[c] === HOLE ? -1 : c;
}

function newStage(s: DuelState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  s.anim = null;
  s.thinkUntil = 0;
  s.hover = -1;
  s.prev = null;
  s.feather = s.stage >= 2 ? 1 : 0;
  s.featherT = -99;
  s.retry = s.tips.has('try:' + s.stage);
  s.tips.add('try:' + s.stage);
  s.phase = 'play';
  s.pt = 0;
  s.startT = s.t;
  s.got = 0;
  recount(s);
  setMood(s, 'idle');
  setFoe(s, 'idle');
  if (!s.seen.has(d.key)) {
    s.seen.add(d.key);
    s.newsQ.unshift(d.news);
    s.news = null;
  }
  if (s.stage === 2) see(s, 'feather', '🪶 깃털 — 방금 둔 수를 판마다 한 번 무를 수 있어요');
  foeSay(s, s.retry ? '또 해 보자고? 흥!' : d.say, 170);
  ev(s, 'stage', 0.5, 0.7, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}
function recount(s: DuelState) {
  s.me = countOf(s.L, s.S.b, ME);
  s.op = countOf(s.L, s.S.b, OP);
}

function finish(s: DuelState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S, d = STAGES[s.stage];
  recount(s);
  s.diff = s.me - s.op;
  if (s.ok) {
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + Math.min(30, s.diff) * DIFF_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.7, `${d.emoji} 이겼다! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'proud');
    setFoe(s, s.op === 0 ? 'dizzy' : 'clap');
    foeSay(s, s.op === 0 ? '으앙… 하나도 안 남았어!' : s.diff >= 16 ? '와… 졌다 졌어! 짝짝짝' : '잘했어! 짝짝짝', 140);
    if (s.op === 0) see(s, 'wipe', '💥 상대 돌을 하나도 안 남기고 다 뒤집었어요!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.7, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
    setFoe(s, 'gloat');
    foeSay(s, '내가 이겼지롱~', 120);
  }
}

/** 내 손가락: 칸을 꾹 → 떼면 둔다 */
function releaseAt(s: DuelState, x: number, y: number, c: number) {
  s.taps++;
  s.lastTap = s.t;
  const L = s.L, S = s.S;
  if (Math.hypot(x - FX, (y - FY) * 1.2) < FR * 1.3 && s.stage >= 2) return undoMove(s);
  if (c < 0) return void (y > BY0 - 0.02 && y < BY0 + SZ * CH + 0.02 && ev(s, 'say', x, y, '칸을 꾹!', '#fff3df'));
  if (busy(s) || S.turn !== ME) return void ev(s, 'say', cellX(c), cellY(c) - 0.04, `${STAGES[s.stage].emoji} 차례예요 — 잠깐!`, '#ffe9c4');
  if (L.init[c] === ROCK) return void ev(s, 'nope', cellX(c), cellY(c) - 0.04, '🪨 바위예요', '#ffd8cc');
  if (S.b[c] !== 0) return void ev(s, 'nope', cellX(c), cellY(c) - 0.04, '이미 돌이 있어요', '#ffd8cc');
  if (!canPlace(L, S.b, c, ME)) {
    ev(s, 'nope', cellX(c), cellY(c) - 0.04, '끼울 돌이 없어요', '#ffd8cc');
    tip(s, 'nope', '상대 돌을 내 돌 사이에 끼울 수 있는 칸만 반짝여요');
    setMood(s, 'huh');
    return;
  }
  doMove(s, c);
}

function undoMove(s: DuelState) {
  if (s.feather <= 0 || !s.prev) return void ev(s, 'say', FX - 0.12, FY - 0.08, s.feather <= 0 ? '깃털을 다 썼어요' : '무를 수가 없어요', '#ffe9c4');
  if (busy(s) || s.S.turn !== ME) return void ev(s, 'say', FX - 0.12, FY - 0.08, '내 차례에 써요', '#ffe9c4');
  s.anim = null;
  s.S = s.prev;
  s.prev = null;
  s.feather--;
  s.events = s.events.filter((e) => (e.v ?? e.t) <= s.t);
  s.featherT = s.t;
  s.thinkUntil = 0;
  recount(s);
  ev(s, 'undo', FX, FY, '살랑~ 물렀어요', '#e6f4ff');
  see(s, 'featherUse', '🪶 살랑~ 한 수 물렀어요 (판마다 한 번)');
  setMood(s, 'wow');
  setFoe(s, 'huh');
  foeSay(s, '어? 방금 그거 무른 거야?', 70);
}

const distC = (a: number, b: number) => Math.max(Math.abs((a % SZ) - (b % SZ)), Math.abs(((a / SZ) | 0) - ((b / SZ) | 0)));
function doMove(s: DuelState, c: number) {
  const L = s.L, S = s.S, who = S.turn;
  if (who === ME) s.prev = cloneSim(S);
  const cornersBefore = cornersOf(L, S.b, who);
  const rec = {} as Rec;
  play(L, S, c, rec);
  recount(s);
  const t0 = s.t, n = rec.fl.length;
  const fl = rec.fl.map((q, i) => ({ q, i, k: distC(q, c) })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.q);
  // 도미노: 가까운 것부터 한 알씩 (크면 조금 느리게 + 끝에서 잠깐 멈춤)
  const big = n >= 6 || rec.blast.length >= 3, gap = n >= 6 ? GAP + 1 : GAP;
  const dl = fl.map((_, i) => PLACE_T + 2 + i * gap);
  const last = dl.length ? dl[dl.length - 1] : PLACE_T;
  const bt = rec.blast.length ? last + 7 : -1, endT = Math.max(last, bt), stop = big ? 8 : 0;
  s.anim = { who, c, fl, dl, blast: rec.blast, bt, t0, ready: endT + 4 + stop, dur: endT + FLIP_T + 2 + stop, bone: rec.bone, again: rec.again, pass: rec.pass, big };
  const x = cellX(c), y = cellY(c), mine = who === ME;
  ev(s, 'stamp', x, y, undefined, mine ? '#ffe2a8' : '#c9c2ff', t0 + PLACE_T, n);
  fl.forEach((q, i) => ev(s, 'flip', cellX(q), cellY(q), String(i + 1), mine ? '#fff1c8' : '#ddd6ff', t0 + dl[i] + 5, i + 1));
  ev(s, 'total', x, y - 0.07, n >= 6 ? `+${n} 도미노!!` : n >= 3 ? `+${n} 착착착!` : n >= 2 ? `착착 +${n}` : '착!', mine ? '#ffe066' : '#c8bcff', t0 + last + 10, n);
  if (rec.blast.length) {
    ev(s, 'blast', x, y, '펑!', '#ffb3c8', t0 + bt, rec.blast.length);
    see(s, 'balloonPop', mine ? '🎈 펑! 둘레의 상대 돌이 한꺼번에 뒤집혔어요' : '🎈 앗, 상대가 풍선을 먼저 터뜨렸어요!');
  } else if (L.balloons.indexOf(c) >= 0) ev(s, 'blast', x, y, '펑!', '#ffb3c8', t0 + PLACE_T + 4, 0);
  if (rec.bone) {
    if (mine) {
      ev(s, 'bone', x, y, '냠! 한 번 더!', '#fff1a8', t0 + PLACE_T + 2);
      see(s, 'boneEat', '🦴 냠! 뼈다귀를 먹으면 바로 한 번 더 둬요');
    } else {
      ev(s, 'boneLost', x, y, '뼈다귀를 깔고 앉았다!', '#ffd8cc', t0 + PLACE_T + 2);
      see(s, 'boneLost', '🦴 상대가 뼈다귀 칸을 막으면 뼈다귀가 사라져요');
    }
  }
  if (L.corner[c]) {
    ev(s, 'corner', x, y, mine ? '🚩 귀퉁이!' : '귀퉁이 뺏김…', mine ? '#fff1a8' : '#ffc8c0', t0 + PLACE_T + 3);
    if (mine) see(s, 'corner', '🚩 귀퉁이 돌은 어느 줄로도 끼일 수 없어 절대 안 뒤집혀요');
  }
  if (L.gold[c] && mine) see(s, 'gold', '⭐ 황금 칸 돌은 2개로 세요 — 뒤집히면 상대 것!');
  if (L.honey[c]) ev(s, 'honey', x, y, mine ? '끈적~ 내 꿀 돌!' : '끈적… 뺏겼다', mine ? '#ffe08a' : '#ffd8cc', t0 + PLACE_T + 3), mine && see(s, 'honeyGot', '🍯 꿀 칸 돌은 끝까지 안 뒤집혀요');
  if (n > 0) see(s, 'flip', '🐾 끼인 돌이 착착 뒤집혔어요!');
  if (n >= 5 && mine) see(s, 'domino', '🔥 한 번에 5개 넘게 — 도미노 대박!');
  // 기분
  const lostCorner = !mine && cornersOf(L, S.b, OP) > cornersBefore;
  if (mine) {
    if (n >= 5 || rec.blast.length >= 2) setMood(s, 'wow'), setFoe(s, 'mad'), (s.birdT = t0 + last), (s.birdN = n);
    else if (L.corner[c]) setMood(s, 'proud'), setFoe(s, 'mad');
    else if (n >= 3) setMood(s, 'wow'), setFoe(s, 'huh');
    else setMood(s, 'idle'), setFoe(s, 'idle');
    if (n >= 5) foeSay(s, n >= 7 ? '으아아! 발 동동!' : '흥! 씩씩…', 70);
    else if (L.corner[c]) foeSay(s, '내 귀퉁이…!', 60);
    if (rec.bone) setMood(s, 'chomp');
  } else {
    if (n >= 5 || lostCorner) setMood(s, 'shock'), setFoe(s, 'smug'), foeSay(s, lostCorner ? '귀퉁이 접수~' : '후후, 왕창!', 60);
    else setFoe(s, 'idle');
  }
}

/** 연출 중이라 다음 수를 못 두는가 (뒤집기가 다 시작되면 다음 수를 받는다) */
const busy = (s: DuelState) => !!s.anim && s.t - s.anim.t0 < s.anim.ready;
function animate(s: DuelState) {
  const a = s.anim;
  if (!a) return;
  const u = s.t - a.t0;
  if (u >= a.dur) s.anim = null;
  if (u === a.ready) afterMove(s, a);
}
function afterMove(s: DuelState, a: Anim) {
  const S = s.S, d = STAGES[s.stage];
  if (a.pass === OP) {
    if (s.t - s.passT > 90) ev(s, 'pass', 0.5, 0.47, `🙊 ${d.emoji} 둘 곳이 없어요 — 쉬어요!`, '#fff1a8'), (s.passT = s.t);
    see(s, 'opPass', '🙊 상대가 둘 곳이 없으면 쉬고, 나는 한 번 더 둬요');
    setFoe(s, 'sweat');
    foeSay(s, '둘 데가 없잖아…!', 70);
  } else if (a.pass === ME) {
    if (s.t - s.passT > 90) ev(s, 'pass', 0.5, 1.1, '🐶 둘 곳이 없어 한 번 쉬어요', '#ffd8cc'), (s.passT = s.t);
    see(s, 'myPass', '🐶 둘 곳이 없으면 한 번 쉬어요 — 상대가 또 둬요');
    setMood(s, 'huh');
  }
  if (S.end) {
    s.phase = 'settle';
    s.pt = 0;
    recount(s);
    s.ok = s.me > s.op;
    s.why = s.me === s.op ? '비겼어요! 한 판 더' : '졌어요…';
    if (!s.ok) ev(s, 'jam', 0.5, 0.7, s.me === s.op ? '무승부!' : '아이고…', '#ffb4a8');
  }
}

export const flipduel: GameDef<DuelState> = {
  id: 'flipduel',
  name: '동물 뒤집기 대결',
  genes: ['reversi', 'pointer', 'turnbased'],
  twist: '🦴 뼈다귀 칸에 두면 강아지가 신나서 한 번 더 둔다 — 두 번 연달아 두면 상대가 막을 틈 없이 귀퉁이를 뺏는다(상대가 먼저 깔고 앉으면 사라진다)',
  rules: ['상대 돌을 내 돌 사이에 끼우는 칸을 꾹 → 떼면 쾅! 끼인 돌이 모두 뒤집힌다.', '판이 차거나 둘 다 못 두면 끝 — 돌이 많은 쪽이 이긴다.'],
  controls: 'touch',
  hint: '반짝이는 칸을 꾹 → 떼면 쾅! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '공원 벤치 위 동물 보드게임',
    mood: '햇살 드는 공원 벤치 위 나무 보드판, 강아지와 동물 친구들이 발 도장 돌을 뒤집으며 겨룬다 — 나뭇잎 그림자와 판 두께, 돌의 반짝임, 등받이 위 비둘기 구경꾼.',
    palette: { bg: '#bfe3c8', ink: '#2d2a26', muted: '#6f7f6a', accent: '#ffb84d', hot: '#ff6b5e', soft: '#fff6e4' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, hover: -1, holdT: 0, btn: false, lastTap: -99, taps: 0, anim: null, thinkUntil: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      mood: 'idle', moodT: 0, foe: 'idle', foeT: 0, birdT: -99, birdN: 0, feather: 0, prev: null, featherT: -99,
      sayText: '', sayT: -99, sayDur: 0, passT: -999, retry: false, diff: 0, me: 0, op: 0,
    } as unknown as DuelState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 80 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    animate(s);
    const calm = s.mood === 'dizzy' || s.mood === 'proud' ? 110 : 60;
    if (s.mood !== 'idle' && s.t - s.moodT > calm && s.phase === 'play') s.mood = s.down && s.hover >= 0 ? 'focus' : 'idle';
    if (s.foe !== 'idle' && s.t - s.foeT > (s.foe === 'mad' ? 80 : 70) && s.phase === 'play') s.foe = 'idle';
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      if (s.pt >= SETTLE_T) finish(s);
      return;
    }
    const L = s.L, S = s.S;
    // 상대 차례: 잠깐 생각하고 둔다
    if (!busy(s) && S.turn === OP && !S.end) {
      if (!s.thinkUntil) (s.thinkUntil = s.t + STAGES[s.stage].think), setFoe(s, 'think');
      else if (s.t >= s.thinkUntil) {
        s.thinkUntil = 0;
        const c = aiPick(L, S, STAGES[s.stage].who, s.rng);
        if (c >= 0) doMove(s, c);
      }
    }
    // 내 손가락
    if (p) {
      const c = cellAt(L, p.x, p.y * A);
      if (press) (s.holdT = 0), (s.btn = Math.hypot(p.x - FX, (p.y * A - FY) * 1.2) < FR * 1.3);
      else s.holdT++;
      s.hover = c;
      if (c >= 0 && !busy(s) && S.turn === ME && canPlace(L, S.b, c, ME)) {
        if (s.mood === 'idle') setMood(s, 'focus');
        see(s, 'preview', '👀 꾹 누르고 있으면 뒤집힐 돌이 들썩여요 — 떼면 쾅!');
      }
    }
    if (release && s.t - s.startT >= 8) {
      const c = s.hover;
      s.hover = -1;
      releaseAt(s, s.ax, s.ay * A, c);
    } else if (release) s.hover = -1;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (c: number): Input => ({ tap: false, dir: 0, pointer: { x: cellX(c), y: cellY(c) / A } });
const ready = (s: DuelState, gap: number) => s.phase === 'play' && !busy(s) && !s.down && s.S.turn === ME && !s.S.end && s.t - s.lastTap >= gap && s.t - s.startT >= 30;
/** 봇: 4수 앞(끝이 가까우면 끝까지, 별 조건까지) 읽고 둔다 — 귀퉁이·둘 곳 수·뼈다귀·황금·꿀을 따진다 */
export const flipduelSmart: Bot<DuelState> = {
  name: '수 읽는 강아지',
  act(s) {
    if (!ready(s, 10)) return NO;
    const c = smartPick(s.L, s.S);
    return c >= 0 ? at(c) : NO;
  },
};
/** 버릇 봇(측정용): 늘 가장 많이 뒤집는 칸 */
export const flipduelHabit: Bot<DuelState> = {
  name: '버릇: 가장 많이 뒤집기',
  act(s) {
    if (!ready(s, 10)) return NO;
    const c = greedyPick(s.L, s.S);
    return c >= 0 ? at(c) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 칸이나 (대개 반짝이는 칸 중 아무거나, 가끔 엉뚱한 칸·화면 아무 데나) */
export const flipduelRandom: Bot<DuelState> = {
  name: '아무 칸이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 20 + Math.floor(rng() * 60);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.L, S = s.S, q = rng();
    const legal = S.turn === ME ? movesOf(L, S, ME) : [];
    let c = -1;
    if (q < 0.65 && legal.length) c = legal[Math.floor(rng() * legal.length)];
    else if (q < 0.85) {
      const em: number[] = [];
      for (let k = 0; k < NC; k++) if (S.b[k] === 0) em.push(k);
      if (em.length) c = em[Math.floor(rng() * em.length)];
    }
    if (c < 0) m.p = { x: rng(), y: rng() };
    else {
      const pp = at(c).pointer!;
      m.p = { x: pp.x + (rng() - 0.5) * 0.03, y: pp.y + (rng() - 0.5) * 0.03 };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
type F = (v: number) => number;
const cl01 = (q: number) => Math.max(0, Math.min(1, q));
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
interface Look { fur: string; fur2: string; ear: string; inner: string; muzzle: string; nose: string; paw: string; toe: 'paw' | 'hand' | 'bird' | 'claw' }
const LOOK: Record<string, Look> = {
  dog: { fur: '#eab676', fur2: '#c98d4c', ear: '#a8662c', inner: '#c98d4c', muzzle: '#fff1dc', nose: '#2b2321', paw: '#b06d2c', toe: 'paw' },
  rabbit: { fur: '#f7f2f6', fur2: '#ddd2dc', ear: '#f7f2f6', inner: '#ffb3c9', muzzle: '#ffffff', nose: '#ff8fab', paw: '#ffc4d6', toe: 'paw' },
  raccoon: { fur: '#a6a5b1', fur2: '#7f7e8c', ear: '#7f7e8c', inner: '#3e3b48', muzzle: '#f1eef4', nose: '#26232c', paw: '#d4d6e2', toe: 'hand' },
  turtle: { fur: '#98d06c', fur2: '#6fa548', ear: '#98d06c', inner: '#98d06c', muzzle: '#c4ea9e', nose: '#3f6b2a', paw: '#bff0a3', toe: 'claw' },
  hedgehog: { fur: '#f0d6ae', fur2: '#d5b282', ear: '#e0bd8f', inner: '#c79c6c', muzzle: '#fff0da', nose: '#2b2321', paw: '#f5d6ad', toe: 'paw' },
  squirrel: { fur: '#d17d3c', fur2: '#a95f27', ear: '#d17d3c', inner: '#f6c99a', muzzle: '#f8dcb6', nose: '#4a2a18', paw: '#ffc694', toe: 'hand' },
  bear: { fur: '#90603a', fur2: '#6e4526', ear: '#90603a', inner: '#c4916a', muzzle: '#dcb791', nose: '#2b1d14', paw: '#e8bd92', toe: 'paw' },
  owl: { fur: '#8f6e4c', fur2: '#6d5236', ear: '#6d5236', inner: '#8f6e4c', muzzle: '#ecd8b2', nose: '#f0a43a', paw: '#ffe08a', toe: 'bird' },
  fox: { fur: '#f28b3b', fur2: '#cf6a22', ear: '#f28b3b', inner: '#3a2a22', muzzle: '#fff5ea', nose: '#2b2321', paw: '#ffb27a', toe: 'paw' },
};
const ME_FACE = '#fff3d2', ME_SIDE = '#caa064', OP_FACE = '#3a3352', OP_SIDE = '#1e1931';
const COLS = '#6fa85a', COLS2 = '#78b262';

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

/** 발 도장 (x,y 가운데, s 크기) — 종류마다 발가락 모양이 다르다 */
function drawPaw(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, toe: Look['toe']) {
  ctx.fillStyle = col;
  if (toe === 'bird') {
    ctx.strokeStyle = col;
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.45);
    ctx.lineTo(x, y - s * 0.05);
    ctx.moveTo(x, y + s * 0.05);
    ctx.lineTo(x - s * 0.38, y - s * 0.4);
    ctx.moveTo(x, y + s * 0.05);
    ctx.lineTo(x + s * 0.38, y - s * 0.4);
    ctx.moveTo(x, y + s * 0.02);
    ctx.lineTo(x, y - s * 0.5);
    ctx.stroke();
    ctx.lineCap = 'butt';
    return;
  }
  ell(ctx, x, y + s * 0.16, s * 0.34, s * 0.27);
  ctx.fill();
  const toes = toe === 'hand' ? 5 : toe === 'claw' ? 3 : 4;
  for (let k = 0; k < toes; k++) {
    const q = k / (toes - 1) - 0.5, ang = q * (toe === 'hand' ? 2.0 : 1.7) - Math.PI / 2;
    const dd = s * (toe === 'hand' ? 0.46 : 0.44), tx = x + Math.cos(ang) * dd, ty = y + s * 0.12 + Math.sin(ang) * dd;
    if (toe === 'hand') ell(ctx, tx, ty, s * 0.07, s * 0.15, ang + Math.PI / 2);
    else ell(ctx, tx, ty, s * (toe === 'claw' ? 0.11 : 0.13), s * (toe === 'claw' ? 0.16 : 0.15), ang + Math.PI / 2);
    ctx.fill();
  }
}

/** 두께 있는 돌 하나. sq = 세로로 눌린 정도(뒤집기 중), lift = 떠오른 높이 px */
function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, side: number, sq: number, lift: number, foe: Look, alpha = 1) {
  const q = Math.max(0.05, sq), ry = rx * 0.74 * q, thk = rx * 0.24;
  ctx.globalAlpha = alpha * Math.max(0.15, 0.4 - lift / (rx * 6));
  ctx.fillStyle = '#10200c';
  ell(ctx, x + rx * 0.08, y + rx * 0.3, rx * (1.02 - lift / (rx * 8)), rx * 0.6);
  ctx.fill();
  ctx.globalAlpha = alpha;
  const cy = y - lift, mine = side === ME;
  // 옆면 (두께)
  ctx.fillStyle = mine ? ME_SIDE : OP_SIDE;
  ell(ctx, x, cy + thk * q, rx, ry);
  ctx.fill();
  ctx.fillRect(x - rx, cy, rx * 2, thk * q);
  // 윗면
  const g = ctx.createRadialGradient(x - rx * 0.35, cy - ry * 0.45, rx * 0.1, x, cy, rx * 1.1);
  g.addColorStop(0, mine ? '#ffffff' : '#6a6190');
  g.addColorStop(0.45, mine ? ME_FACE : OP_FACE);
  g.addColorStop(1, mine ? '#efd49c' : '#2a2440');
  ctx.fillStyle = g;
  ell(ctx, x, cy, rx, ry);
  ctx.fill();
  ctx.strokeStyle = mine ? 'rgba(255,255,255,.7)' : 'rgba(180,170,230,.45)';
  ctx.lineWidth = 1;
  ell(ctx, x, cy, rx * 0.86, ry * 0.86);
  ctx.stroke();
  if (q > 0.25) {
    ctx.save();
    ctx.translate(x, cy);
    ctx.scale(1, 0.74 * q);
    drawPaw(ctx, 0, -rx * 0.06, rx * 0.62, mine ? '#b77634' : foe.paw, mine ? 'paw' : foe.toe);
    ctx.restore();
  }
  // 반짝
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ell(ctx, x - rx * 0.4, cy - ry * 0.45, rx * 0.2, ry * 0.12, -0.4);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** 칸마다 지금 보이는 돌: 연출 중이면 아직 안 뒤집힌 돌은 옛 색, 뒤집히는 중이면 눌림·뜀 */
function shown(s: DuelState, c: number): { side: number; sq: number; lift: number; pop: number } {
  const S = s.S, a = s.anim, v = S.b[c];
  if (!a || (v !== ME && v !== OP)) return { side: v, sq: 1, lift: 0, pop: 0 };
  const u = s.t - a.t0;
  if (c === a.c) {
    if (u >= PLACE_T) return { side: v, sq: 1, lift: 0, pop: Math.max(0, 1 - (u - PLACE_T) / 8) };
    const q = u / PLACE_T;
    return { side: v, sq: 1, lift: (1 - q * q) * 40, pop: 0 };
  }
  let st = -1;
  const i = a.fl.indexOf(c);
  if (i >= 0) st = a.dl[i];
  else if (a.blast.includes(c)) st = a.bt;
  if (st < 0) return { side: v, sq: 1, lift: 0, pop: 0 };
  if (u < st) return { side: 3 - v, sq: 1, lift: 0, pop: 0 };
  if (u >= st + FLIP_T) return { side: v, sq: 1, lift: 0, pop: Math.max(0, 1 - (u - st - FLIP_T) / 6) };
  const th = ((u - st) / FLIP_T) * Math.PI;
  return { side: th < Math.PI / 2 ? 3 - v : v, sq: Math.abs(Math.cos(th)), lift: Math.sin(th) * 16, pop: 0 };
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: DuelState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // 큰 도미노가 끝나는 순간 화면이 그 칸 쪽으로 살짝 당겨진다 (잠깐 멈춤)
  const a = s.anim;
  if (a && a.big) {
    const u = t - a.t0, st = a.ready - 12;
    if (u >= st && u < a.ready + 4) {
      const k = 1 + 0.035 * Math.sin(cl01((u - st) / 16) * Math.PI);
      ctx.translate(X(cellX(a.c)), Y(cellY(a.c)));
      ctx.scale(k, k);
      ctx.translate(-X(cellX(a.c)), -Y(cellY(a.c)));
    }
  }
  drawPark(ctx, s, w, X, Y, R, t);
  const FU = 0.092, FYH = BY0 - 0.014 - 1.5 * FU;
  drawFoe(ctx, s, X(0.5), Y(FYH), R(FU), t, true);
  drawSeat(ctx, w, X, Y, R);
  drawBoard(ctx, s, X, Y, R, t, font);
  drawFoe(ctx, s, X(0.5), Y(FYH), R(FU), t, false);
  drawFront(ctx, w, X, Y, R, t);
  drawPuppy(ctx, s, X(0.125), Y(1.215), R(0.078), t);
  drawScore(ctx, s, X, Y, R, t, font);
  if (s.stage >= 2) drawFeather(ctx, s, X, Y, R, t, font);
  drawBubble(ctx, s, w, X, Y, R, t, font);
  // 가장자리 살짝 어둡게 (작은 세계처럼)
  const vg = ctx.createRadialGradient(w / 2, Y(0.72), R(0.45), w / 2, Y(0.72), R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,30,10,.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.14), Math.min(Y(1.25), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    if (y < Y(0.13)) y += (size + 5) * 3;
    rec.push({ x, y, t });
    if (rec.length > 14) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined && e.kind !== 'clear' ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y), n = e.n ?? 1;
    if (e.kind === 'stamp') fx.ring(x, y, e.col!, R(0.06), 3), fx.burst(x, y + R(0.02), '#e9dcb8', 8, 1.8, 1.8), fx.kick(1.2 + Math.min(4, n) * 0.4);
    if (e.kind === 'flip') {
      const k = Math.min(8, n);
      fx.burst(x, y, e.col!, 6 + k, 1.6 + k * 0.25, 1.6 + k * 0.12);
      fx.pop(x, y - R(0.035), e.text!, n >= 5 ? '#ffd166' : n >= 3 ? '#fff1a8' : '#ffffff', 13 + Math.min(14, k * 2));
      fx.kick(0.8 + k * 0.45);
    }
    if (e.kind === 'total') {
      const k = Math.min(10, n);
      say(x, y - R(0.03), e.text!, e.col!, n <= 1 ? 16 : 18 + k * 2.2);
      fx.ring(x, y + R(0.07), e.col!, R(0.08 + 0.02 * k), 3 + k * 0.4);
      if (n >= 6) fx.blink('#fff1c0', 0.12 + 0.02 * k), fx.kick(5 + k * 0.6), fx.burst(x, y + R(0.07), '#ffe066', 20 + k * 3, 4, 2.6);
    }
    if (e.kind === 'blast') {
      fx.burst(x, y, '#ff8fb1', 30, 5, 3.2), fx.burst(x, y, '#ffffff', 16, 3.5, 2), fx.ring(x, y, '#ffc2d6', R(0.2), 6), fx.kick(9), fx.blink('#ffe1ea', 0.22);
      for (let k = 0; k < 10; k++) fx.burst(x + Math.cos(k) * R(0.05), y + Math.sin(k) * R(0.04), ['#ff6b8b', '#ffd166', '#7ad3ff', '#9be37a'][k % 4], 2, 5, 2.4);
      say(x, y - R(0.06), e.text!, e.col!, 30);
    }
    if (e.kind === 'bone') fx.burst(x, y, '#fff7e0', 18, 3, 2.4), fx.ring(x, y, '#ffe9a8', R(0.1), 4), say(x, y - R(0.07), e.text!, e.col!, 20), fx.kick(3);
    if (e.kind === 'boneLost') fx.burst(x, y, '#e8dcc8', 10, 2, 2), say(x, y - R(0.06), e.text!, e.col!, 14);
    if (e.kind === 'corner') fx.ring(x, y, e.col!, R(0.11), 5), fx.burst(x, y, '#ffe066', 14, 3, 2.2), say(x, y - R(0.07), e.text!, e.col!, 17), fx.kick(3);
    if (e.kind === 'honey') fx.burst(x, y, '#ffc84a', 14, 2.4, 2.6), say(x, y - R(0.06), e.text!, e.col!, 15);
    if (e.kind === 'pass') say(x, y, e.text!, e.col!, 16), fx.burst(x, y, '#fff1a8', 12, 2.5, 2);
    if (e.kind === 'nope') say(x, y, e.text!, e.col!, 14), fx.kick(1.5);
    if (e.kind === 'say') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'undo') {
      fx.ring(x, y, '#e6f4ff', R(0.09), 4);
      for (let k = 0; k < 6; k++) fx.burst(x, y, '#ffffff', 2, 3, 2.5);
      say(x - R(0.12), y - R(0.08), e.text!, e.col!, 15);
    }
    if (e.kind === 'jam') fx.kick(7), fx.blink(th.hot, 0.2), say(X(0.25), Y(1.08), e.text!, e.col!, 18);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.66), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.66), '#ff9ad5', 30, 5, 3), fx.ring(X(0.5), Y(0.66), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.3), fx.kick(6);
      for (let c = 0; c < NC; c++) if (s.S.b[c] === ME && hsh(c + s.stage) < 0.35) fx.burst(X(cellX(c)), Y(cellY(c)), '#fff3c8', 5, 3, 2);
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  // 비둘기 푸드덕 (큰 도미노)
  if (s.birdT >= 0 && (fx.memo.bird ?? -1) !== s.birdT && t >= s.birdT) (fx.memo.bird = s.birdT), say(X(0.17), Y(0.16), '구구구?!', '#ffffff', 13), fx.burst(X(0.17), Y(0.17), '#e8e8f0', 8, 2.4, 2);
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font);
}

// ═════════════ 공원 배경 · 벤치 ═════════════
function drawPark(ctx: CanvasRenderingContext2D, s: DuelState, w: number, X: F, Y: F, R: F, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0.36));
  sky.addColorStop(0, '#9fd6ff');
  sky.addColorStop(0.7, '#d8f0ff');
  sky.addColorStop(1, '#fff1d0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, Y(0.4));
  // 해
  const sun = ctx.createRadialGradient(X(0.86), Y(0.09), 2, X(0.86), Y(0.09), R(0.25));
  sun.addColorStop(0, 'rgba(255,250,210,.95)');
  sun.addColorStop(0.2, 'rgba(255,240,170,.55)');
  sun.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, Y(0.4));
  // 구름
  for (let k = 0; k < 3; k++) {
    const cx = ((k * 0.41 + t * 0.00012 * (1 + k * 0.4)) % 1.3) - 0.15, cy = 0.085 + k * 0.035;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let j = 0; j < 4; j++) {
      ell(ctx, X(cx + j * 0.035), Y(cy - (j % 2) * 0.012), R(0.035 + (j % 2) * 0.01), R(0.02 + (j % 2) * 0.008));
      ctx.fill();
    }
  }
  // 먼 나무들
  for (let k = 0; k < 9; k++) {
    const x = k * 0.125 - 0.02 + hsh(k) * 0.04, y = 0.27 + hsh(k + 9) * 0.03, r = 0.075 + hsh(k + 3) * 0.035;
    ctx.fillStyle = k % 2 ? '#5f9e4c' : '#4e8c40';
    ell(ctx, X(x), Y(y), R(r), R(r * 0.9));
    ctx.fill();
    ctx.fillStyle = 'rgba(180,230,120,.35)';
    ell(ctx, X(x - r * 0.3), Y(y - r * 0.35), R(r * 0.5), R(r * 0.35));
    ctx.fill();
  }
  ctx.fillStyle = '#8cc46a';
  ctx.fillRect(0, Y(0.3), w, Y(0.1));
  // 등받이 (나무 판 셋 + 쇠 받침)
  for (let k = 0; k < 3; k++) {
    const y = 0.15 + k * 0.058, hh = 0.045;
    const g = ctx.createLinearGradient(0, Y(y), 0, Y(y + hh));
    g.addColorStop(0, '#e0a868');
    g.addColorStop(0.5, '#c98d52');
    g.addColorStop(1, '#9e6534');
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(0, Y(y + hh), w, R(0.008));
    ctx.fillStyle = g;
    ctx.fillRect(0, Y(y), w, R(hh));
    ctx.strokeStyle = 'rgba(110,60,25,.35)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 5; j++) {
      const gx = hsh(j + k * 7) * w;
      ctx.beginPath();
      ctx.moveTo(gx, Y(y + hh * 0.3));
      ctx.quadraticCurveTo(gx + R(0.08), Y(y + hh * (0.2 + hsh(j) * 0.5)), gx + R(0.18), Y(y + hh * 0.6));
      ctx.stroke();
    }
  }
  for (const x of [0.035, 0.965]) {
    ctx.fillStyle = '#3c4048';
    rr(ctx, X(x) - R(0.012), Y(0.13), R(0.024), Y(0.38) - Y(0.13), R(0.01));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(X(x) - R(0.008), Y(0.14), R(0.005), Y(0.36) - Y(0.14));
  }
  // 비둘기 둘 (등받이 위)
  drawPigeon(ctx, X(0.1), Y(0.152), R(0.045), s, t, 0);
  drawPigeon(ctx, X(0.25), Y(0.152), R(0.04), s, t, 1);
  // 나비
  {
    const bx = X(0.3 + 0.25 * Math.sin(t * 0.007) + 0.05 * Math.sin(t * 0.031)), by = Y(0.12 + 0.03 * Math.sin(t * 0.011)), fl = Math.abs(Math.sin(t * 0.35));
    ctx.fillStyle = '#ffb3d1';
    ell(ctx, bx - R(0.009) * fl, by, R(0.009) * fl + 1, R(0.008));
    ctx.fill();
    ell(ctx, bx + R(0.009) * fl, by, R(0.009) * fl + 1, R(0.008));
    ctx.fill();
    ctx.fillStyle = '#5a3a3a';
    ctx.fillRect(bx - 0.6, by - R(0.006), 1.2, R(0.012));
  }
}
function drawPigeon(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: DuelState, t: number, k: number) {
  const fly = s.birdT >= 0 && t >= s.birdT && t < s.birdT + 50 ? Math.sin(((t - s.birdT) / 50) * Math.PI) : 0;
  const bob = Math.abs(Math.sin(t * 0.06 + k * 2)) * u * 0.08;
  const yy = y - fly * u * 1.6 - (fly ? 0 : bob);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ell(ctx, x, y + 1, u * 0.5 * (1 - fly * 0.5), u * 0.1);
  ctx.fill();
  ctx.save();
  ctx.translate(x, yy);
  if (k) ctx.scale(-1, 1);
  // 날개 (날면 퍼덕)
  const fl = fly ? Math.sin(t * 0.9) * 0.9 : 0;
  ctx.fillStyle = '#8b90a3';
  ctx.save();
  ctx.translate(-u * 0.05, -u * 0.38);
  ctx.rotate(-0.3 - fl);
  ell(ctx, -u * 0.18, 0, u * 0.32, u * 0.14);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#a9aec0';
  ell(ctx, 0, -u * 0.32, u * 0.36, u * 0.27);
  ctx.fill();
  ctx.fillStyle = '#7fc8b8';
  ell(ctx, u * 0.18, -u * 0.42, u * 0.12, u * 0.14);
  ctx.fill();
  ctx.fillStyle = '#9ba0b4';
  ell(ctx, u * 0.27, -u * 0.62, u * 0.15, u * 0.14);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, u * 0.32, -u * 0.65, u * 0.045, u * 0.045);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ell(ctx, u * 0.33, -u * 0.65, u * 0.024, u * 0.024 * (fly ? 1.4 : 1));
  ctx.fill();
  ctx.fillStyle = '#e8a06a';
  ctx.beginPath();
  ctx.moveTo(u * 0.4, -u * 0.62);
  ctx.lineTo(u * 0.52, -u * 0.58);
  ctx.lineTo(u * 0.4, -u * 0.56);
  ctx.fill();
  ctx.fillStyle = '#e07a6a';
  if (!fly) ctx.fillRect(-u * 0.04, -u * 0.08, u * 0.04, u * 0.08), ctx.fillRect(u * 0.06, -u * 0.08, u * 0.04, u * 0.08);
  ctx.restore();
}
function drawSeat(ctx: CanvasRenderingContext2D, w: number, X: F, Y: F, R: F) {
  // 앉는 판 (벤치 위, 보드판이 놓인 곳)
  const y0 = BY0 - 0.05, y1 = 1.155;
  for (let k = 0; k < 5; k++) {
    const a = y0 + ((y1 - y0) * k) / 5, b = y0 + ((y1 - y0) * (k + 1)) / 5 - 0.008;
    const g = ctx.createLinearGradient(0, Y(a), 0, Y(b));
    g.addColorStop(0, k % 2 ? '#d9a266' : '#dfab70');
    g.addColorStop(1, k % 2 ? '#c08548' : '#c78c4f');
    ctx.fillStyle = g;
    ctx.fillRect(0, Y(a), w, Y(b) - Y(a));
    ctx.fillStyle = 'rgba(90,50,20,.35)';
    ctx.fillRect(0, Y(b), w, R(0.008));
    ctx.strokeStyle = 'rgba(120,70,30,.22)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      const gy = Y(a + (b - a) * (0.3 + j * 0.2));
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(X(0.3), gy - 2, X(0.6), gy + 2, w, gy - 1);
      ctx.stroke();
    }
  }
}
function drawFront(ctx: CanvasRenderingContext2D, w: number, X: F, Y: F, R: F, t: number) {
  // 벤치 앞 모서리(두께) · 쇠 다리 · 풀밭
  const y = Y(1.155);
  const g = ctx.createLinearGradient(0, y, 0, y + R(0.03));
  g.addColorStop(0, '#b57a42');
  g.addColorStop(1, '#7e4e26');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, R(0.03));
  const gr = ctx.createLinearGradient(0, y + R(0.03), 0, Y(1.3));
  gr.addColorStop(0, '#5b8f3e');
  gr.addColorStop(0.3, '#7cbf55');
  gr.addColorStop(1, '#8fd062');
  ctx.fillStyle = gr;
  ctx.fillRect(0, y + R(0.03), w, Y(1.45) - y);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(0, y + R(0.03), w, R(0.02));
  for (const x of [0.045, 0.955]) {
    ctx.fillStyle = '#3c4048';
    ctx.fillRect(X(x) - R(0.014), y + R(0.02), R(0.028), R(0.11));
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ell(ctx, X(x), y + R(0.13), R(0.04), R(0.01));
    ctx.fill();
  }
  // 풀잎
  ctx.strokeStyle = '#5e9e3c';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 26; k++) {
    const gx = X(hsh(k * 3) * 1.0), gy = y + R(0.045 + hsh(k * 5) * 0.08), sw = Math.sin(t * 0.03 + k) * 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + sw, gy - R(0.012), gx + sw * 1.5, gy - R(0.024));
    ctx.stroke();
  }
  // 작은 꽃
  for (let k = 0; k < 4; k++) {
    const fx0 = X(0.3 + k * 0.16 + hsh(k) * 0.05), fy = y + R(0.08 + hsh(k + 2) * 0.04);
    ctx.fillStyle = ['#ffd6e8', '#fff3a8', '#ffffff', '#d6e8ff'][k];
    for (let j = 0; j < 5; j++) {
      ell(ctx, fx0 + Math.cos(j * 1.256) * R(0.006), fy + Math.sin(j * 1.256) * R(0.005), R(0.005), R(0.004));
      ctx.fill();
    }
    ctx.fillStyle = '#ffb84d';
    ell(ctx, fx0, fy, R(0.003), R(0.003));
    ctx.fill();
  }
}

// ═════════════ 판 ═════════════
function drawBoard(ctx: CanvasRenderingContext2D, s: DuelState, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const L = s.L, S = s.S, d = STAGES[s.stage], foe = LOOK[d.who];
  const bx0 = X(BX0 - 0.024), by0 = Y(BY0 - 0.022), bw = R(SZ * CW + 0.048), bh = R(SZ * CH + 0.044), thk = R(0.03);
  // 그림자
  ctx.fillStyle = 'rgba(40,20,5,.35)';
  rr(ctx, bx0 + R(0.012), by0 + R(0.03), bw, bh + thk, R(0.03));
  ctx.fill();
  // 두께 (앞면)
  const fg = ctx.createLinearGradient(0, by0 + bh - R(0.02), 0, by0 + bh + thk);
  fg.addColorStop(0, '#8a5228');
  fg.addColorStop(1, '#5e3416');
  ctx.fillStyle = fg;
  rr(ctx, bx0, by0 + R(0.01), bw, bh + thk - R(0.01), R(0.028));
  ctx.fill();
  // 윗면 테두리
  const tg = ctx.createLinearGradient(bx0, by0, bx0 + bw, by0 + bh);
  tg.addColorStop(0, '#d79a5a');
  tg.addColorStop(0.5, '#b97a3e');
  tg.addColorStop(1, '#a86a32');
  ctx.fillStyle = tg;
  rr(ctx, bx0, by0, bw, bh, R(0.028));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,190,.55)';
  ctx.lineWidth = 1.5;
  rr(ctx, bx0 + 1.5, by0 + 1.5, bw - 3, bh - 3, R(0.026));
  ctx.stroke();
  // 판 안 (펠트)
  ctx.fillStyle = '#4f7d3e';
  ctx.fillRect(X(BX0) - 2, Y(BY0) - 2, R(SZ * CW) + 4, R(SZ * CH) + 4);
  const cw = R(CW), ch = R(CH);
  for (let c = 0; c < NC; c++) {
    const gx = c % SZ, gy = (c / SZ) | 0, x0 = X(BX0) + gx * cw, y0 = Y(BY0) + gy * ch;
    if (L.init[c] === HOLE) {
      // 구멍: 벤치 나무가 비쳐 보이는 깊은 칸
      ctx.fillStyle = '#3a2412';
      ctx.fillRect(x0, y0, cw, ch);
      const hg = ctx.createLinearGradient(0, y0, 0, y0 + ch);
      hg.addColorStop(0, 'rgba(0,0,0,.6)');
      hg.addColorStop(0.35, 'rgba(120,75,35,.6)');
      hg.addColorStop(1, 'rgba(200,140,80,.7)');
      ctx.fillStyle = hg;
      ctx.fillRect(x0 + 2, y0 + 2, cw - 4, ch - 4);
      continue;
    }
    ctx.fillStyle = (gx + gy) % 2 ? COLS : COLS2;
    if (L.gold[c]) {
      const gg = ctx.createLinearGradient(x0, y0, x0 + cw, y0 + ch);
      gg.addColorStop(0, '#ffe27a');
      gg.addColorStop(0.5, '#f5b83a');
      gg.addColorStop(1, '#d98f1c');
      ctx.fillStyle = gg;
    }
    ctx.fillRect(x0 + 1, y0 + 1, cw - 2, ch - 2);
    ctx.fillStyle = 'rgba(0,0,0,.13)';
    ctx.fillRect(x0 + 1, y0 + 1, cw - 2, 3);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(x0 + 1, y0 + ch - 3, cw - 2, 2);
    if (L.gold[c]) {
      ctx.font = `${Math.max(14, cw * 0.42)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      if (S.b[c] === 0) ctx.fillText('⭐', x0 + cw / 2, y0 + ch / 2);
      const tw = (t * 0.02 + c * 0.37) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.8 * Math.sin(tw * Math.PI)})`;
      ell(ctx, x0 + cw * (0.2 + 0.6 * hsh(c)), y0 + ch * 0.25, 2, 2);
      ctx.fill();
    }
    if (L.honey[c]) {
      // 꿀 웅덩이
      const hx = x0 + cw / 2, hy = y0 + ch / 2;
      const hg = ctx.createRadialGradient(hx - cw * 0.1, hy - ch * 0.1, 2, hx, hy, cw * 0.48);
      hg.addColorStop(0, '#ffe08a');
      hg.addColorStop(0.7, '#f0a52a');
      hg.addColorStop(1, 'rgba(220,130,20,.9)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const an = (k / 12) * TAU, rad = cw * (0.42 + 0.05 * Math.sin(k * 2.3 + c));
        ctx.lineTo(hx + Math.cos(an) * rad, hy + Math.sin(an) * rad * 0.8);
      }
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ell(ctx, hx - cw * 0.16, hy - ch * 0.16, cw * 0.1, ch * 0.05, -0.4);
      ctx.fill();
      if (S.b[c] === 0) {
        ctx.font = `${Math.max(13, cw * 0.34)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🍯', hx, hy);
      }
    }
    // 🚩 귀퉁이 표시 (돌이 없을 때 또렷이)
    if (L.corner[c]) {
      const fxx = x0 + cw * 0.8, fyy = y0 + ch * 0.2, on = S.b[c] === 0;
      ctx.globalAlpha = on ? 1 : 0.55;
      ctx.strokeStyle = '#5a3a22';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fxx, fyy + ch * 0.3);
      ctx.lineTo(fxx, fyy - ch * 0.1);
      ctx.stroke();
      const wv = Math.sin(t * 0.12 + c) * 1.5;
      ctx.fillStyle = S.b[c] === ME ? '#ffd166' : S.b[c] === OP ? '#9a8fd0' : '#ff5a5a';
      ctx.beginPath();
      ctx.moveTo(fxx, fyy - ch * 0.1);
      ctx.lineTo(fxx - cw * 0.2, fyy + wv * 0.3);
      ctx.lineTo(fxx, fyy + ch * 0.1);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // 바위
  for (let c = 0; c < NC; c++) if (L.init[c] === ROCK) drawRock(ctx, X(cellX(c)), Y(cellY(c)), cw, c);
  // 뼈다귀 (남아 있는 것)
  L.bones.forEach((c, k) => {
    if (!((S.bone >> k) & 1) || S.b[c] !== 0) return;
    drawBone(ctx, X(cellX(c)), Y(cellY(c)) + Math.sin(t * 0.1 + k) * 1.5, cw * 0.36, 0.5 + Math.sin(t * 0.05 + k) * 0.08);
  });
  // ═════ 둘 수 있는 칸 · 미리 보기 ═════
  const myTurn = s.phase === 'play' && S.turn === ME && !busy(s);
  const press = myTurn && s.down && s.hover >= 0 && canPlace(L, S.b, s.hover, ME) ? s.hover : -1;
  const pre: number[] = [], bl: number[] = [];
  if (press >= 0) flipsAt(L, S.b, press, ME, pre), blastAt(L, S, press, ME, bl);
  if (myTurn) {
    for (let c = 0; c < NC; c++) {
      if (!canPlace(L, S.b, c, ME)) continue;
      const x = X(cellX(c)), y = Y(cellY(c)), pulse = 0.5 + 0.5 * Math.sin(t * 0.12 + c * 0.6);
      ctx.fillStyle = `rgba(255,246,190,${0.16 + 0.14 * pulse})`;
      ctx.fillRect(x - cw / 2 + 2, y - ch / 2 + 2, cw - 4, ch - 4);
      ctx.strokeStyle = `rgba(255,248,200,${0.55 + 0.35 * pulse})`;
      ctx.lineWidth = 2;
      ell(ctx, x, y, cw * 0.28, ch * 0.24);
      ctx.stroke();
      if (c !== press) {
        ctx.globalAlpha = 0.3;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 0.74);
        drawPaw(ctx, 0, -cw * 0.02, cw * 0.24, '#fff6d0', 'paw');
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }
  } else if (s.down && s.hover >= 0 && s.phase === 'play') {
    // 상대 차례에 누르고 있음: 흐릿한 X
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    const x = X(cellX(s.hover)), y = Y(cellY(s.hover));
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 6);
    ctx.lineTo(x + 6, y + 6);
    ctx.moveTo(x + 6, y - 6);
    ctx.lineTo(x - 6, y + 6);
    ctx.stroke();
  }
  // ═════ 돌 ═════
  const rx = cw * 0.39;
  for (let c = 0; c < NC; c++) {
    const v = S.b[c];
    if (v !== ME && v !== OP) continue;
    const sh = shown(s, c);
    let x = X(cellX(c)), y = Y(cellY(c)), lift = sh.lift;
    const tremble = pre.includes(c) || bl.includes(c);
    if (tremble) (lift += 3 + Math.abs(Math.sin(t * 0.5 + c)) * 4), (x += Math.sin(t * 0.9 + c) * 1.2);
    const pop = sh.pop;
    drawStone(ctx, x, y, rx * (1 + pop * 0.18), sh.side, sh.sq, lift, foe);
    if (tremble) {
      ctx.strokeStyle = '#ffb84d';
      ctx.lineWidth = 2.5;
      ell(ctx, x, y - lift, rx * 1.05, rx * 0.8);
      ctx.stroke();
    }
    if (L.honey[c] && sh.sq > 0.5) {
      // 꿀 돌: 끈적한 꿀 띠
      ctx.fillStyle = 'rgba(255,190,50,.85)';
      ell(ctx, x, y - lift + rx * 0.5, rx * 0.9, rx * 0.22);
      ctx.fill();
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = 'rgba(255,190,50,.9)';
        ell(ctx, x - rx * 0.5 + k * rx * 0.5, y - lift + rx * 0.62 + Math.sin(t * 0.05 + k) * 1.5, rx * 0.08, rx * 0.14);
        ctx.fill();
      }
    }
    if (L.gold[c] && sh.sq > 0.5) {
      ctx.font = `${Math.max(12, cw * 0.24)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('⭐', x + rx * 0.72, y - lift - rx * 0.55);
    }
  }
  // 놓기 미리 보기: 반투명 돌 + 뒤집힐 수
  if (press >= 0) {
    const x = X(cellX(press)), y = Y(cellY(press)), bob = Math.abs(Math.sin(t * 0.18)) * 5;
    drawStone(ctx, x, y, rx, ME, 1, 8 + bob, foe, 0.72);
    const n = pre.length + bl.length, extra = L.bones.indexOf(press) >= 0 && (S.bone >> L.bones.indexOf(press)) & 1 ? ' 🦴한 번 더' : bl.length ? ' 🎈펑' : '';
    const txt = `+${n}${extra}`;
    font(0.05 + Math.min(0.02, n * 0.003), 900);
    const tw = ctx.measureText(txt).width + R(0.04), by = y - ch * 0.95 - bob;
    const lx = Math.max(tw / 2 + 4, Math.min(X(1) - tw / 2 - 4, x));
    ctx.fillStyle = 'rgba(60,35,10,.88)';
    rr(ctx, lx - tw / 2, by - R(0.03), tw, R(0.06), R(0.03));
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = n >= 5 ? '#ffd166' : '#fff6e0';
    ctx.fillText(txt, lx, by + 1);
  }
  // 마지막 수 표시 (작은 점)
  if (s.anim && s.anim.c >= 0 && S.b[s.anim.c] > 0 && s.t - s.anim.t0 > PLACE_T) {
    const x = X(cellX(s.anim.c)), y = Y(cellY(s.anim.c));
    ctx.fillStyle = s.anim.who === ME ? 'rgba(255,120,60,.9)' : 'rgba(150,230,255,.9)';
    ell(ctx, x, y - rx * 0.95, 3, 3);
    ctx.fill();
  }
  // 풍선 (판 위에 둥실)
  L.balloons.forEach((c, k) => {
    if (!((S.ball >> k) & 1)) return;
    const x = X(cellX(c)), y = Y(cellY(c)), sw = Math.sin(t * 0.04 + k * 2) * cw * 0.08, by = y - ch * 0.75 + Math.sin(t * 0.06 + k) * 2;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sw, y - ch * 0.3, x + sw, by + cw * 0.22);
    ctx.stroke();
    const bg = ctx.createRadialGradient(x + sw - cw * 0.08, by - cw * 0.08, 1, x + sw, by, cw * 0.28);
    bg.addColorStop(0, '#ffd0de');
    bg.addColorStop(0.4, k % 2 ? '#ff6b8b' : '#ff5a7a');
    bg.addColorStop(1, '#c23a5a');
    ctx.fillStyle = bg;
    ell(ctx, x + sw, by, cw * 0.2, cw * 0.24);
    ctx.fill();
    ctx.fillStyle = '#c23a5a';
    ctx.beginPath();
    ctx.moveTo(x + sw - 3, by + cw * 0.25);
    ctx.lineTo(x + sw + 3, by + cw * 0.25);
    ctx.lineTo(x + sw, by + cw * 0.2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ell(ctx, x + sw - cw * 0.07, by - cw * 0.09, cw * 0.04, cw * 0.06, -0.4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ell(ctx, x, y + ch * 0.2, cw * 0.14, ch * 0.06);
    ctx.fill();
  });
  // 나뭇잎 그늘 (살랑살랑)
  ctx.fillStyle = 'rgba(20,50,10,.07)';
  for (let k = 0; k < 4; k++) {
    const lx = X(BX0 + (0.15 + 0.6 * hsh(k * 7) + 0.03 * Math.sin(t * 0.01 + k)) * SZ * CW), ly = Y(BY0 + hsh(k * 3 + 1) * SZ * CH);
    ell(ctx, lx, ly, R(0.09), R(0.05), k);
    ctx.fill();
  }
}
function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, c: number) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ell(ctx, x + cw * 0.04, y + cw * 0.16, cw * 0.44, cw * 0.2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - cw * 0.15, y - cw * 0.2, 2, x, y, cw * 0.5);
  g.addColorStop(0, '#d8d6d0');
  g.addColorStop(0.5, '#9b978e');
  g.addColorStop(1, '#5f5c56');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k <= 10; k++) {
    const an = (k / 10) * TAU, rad = cw * (0.4 + 0.06 * hsh(k + c * 11));
    ctx.lineTo(x + Math.cos(an) * rad, y - cw * 0.05 + Math.sin(an) * rad * (an > 0 && an < Math.PI ? 0.55 : 0.75));
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(110,170,70,.8)';
  ell(ctx, x + cw * 0.12, y - cw * 0.28, cw * 0.14, cw * 0.06, 0.3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, x - cw * 0.16, y - cw * 0.22, cw * 0.08, cw * 0.04, -0.5);
  ctx.fill();
}
function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ell(ctx, 2, s * 0.5, s * 0.9, s * 0.2);
  ctx.fill();
  ctx.rotate(rot);
  ctx.fillStyle = '#fff8ea';
  ctx.strokeStyle = '#c9b48f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-s * 0.7, -s * 0.13, s * 1.4, s * 0.26, s * 0.1);
  ctx.fill();
  ctx.stroke();
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      ell(ctx, sx * s * 0.72, sy * s * 0.16, s * 0.2, s * 0.2);
      ctx.fill();
      ctx.stroke();
    }
  ctx.fillRect(-s * 0.7, -s * 0.12, s * 1.4, s * 0.24);
  ctx.restore();
}

// ═════════════ 동물 ═════════════
/** 상대 동물 (머리·몸은 판 뒤, 앞발은 판 위 테두리에). back=true면 몸·머리, false면 앞발만 */
function drawFoe(ctx: CanvasRenderingContext2D, s: DuelState, x: number, y: number, u: number, t: number, back: boolean) {
  const d = STAGES[s.stage], k = d.who, lk = LOOK[k], m = s.foe, age = t - s.foeT;
  const stomp = m === 'mad' ? Math.abs(Math.sin(age * 0.45)) * u * 0.18 * Math.max(0.3, 1 - age / 80) : 0;
  const hop = m === 'clap' ? Math.abs(Math.sin(age * 0.22)) * u * 0.12 : m === 'smug' ? Math.sin(Math.min(age, 20) / 20 * Math.PI) * u * 0.12 : 0;
  const shake = m === 'shock' || m === 'sweat' ? Math.sin(age * 1.3) * u * 0.04 * Math.max(0, 1 - age / 40) : 0;
  const yy = y - stomp - hop, xx = x + shake;
  const edgeY = y + u * 1.5; // 판 위 테두리
  if (!back) {
    // 앞발: 화나면 동동, 박수면 짝짝, 생각하면 하나는 턱에
    const clap = m === 'clap' ? Math.abs(Math.sin(age * 0.35)) : 0;
    for (const sd of [-1, 1]) {
      let px = x + sd * u * (1.05 - clap * 0.85), py = edgeY - u * 0.05;
      if (m === 'mad') py -= Math.max(0, Math.sin(age * 0.45 + (sd > 0 ? Math.PI / 2 : 0))) * u * 0.35;
      if (m === 'clap') py -= u * 0.35;
      if (m === 'think' && sd > 0) (px = x + u * 0.45), (py = yy + u * 0.75);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      if (m !== 'clap' && !(m === 'think' && sd > 0)) (ell(ctx, px + 2, edgeY + u * 0.06, u * 0.3, u * 0.08), ctx.fill());
      ctx.fillStyle = k === 'owl' ? lk.fur2 : lk.fur;
      ell(ctx, px, py, u * 0.36, u * 0.26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (k !== 'owl' && k !== 'turtle') {
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        for (let j = -1; j <= 1; j++) (ell(ctx, px + j * u * 0.1, py - u * 0.12, u * 0.04, u * 0.05), ctx.fill());
      }
    }
    if (m === 'clap' && Math.sin(age * 0.35) > 0.95 && age % 12 < 2) {
      const fx = juice(s);
      fx.pop(x + (hsh(age) - 0.5) * u * 2, yy - u * 1.1, '짝!', '#fff1a8', 14);
    }
    if (m === 'mad' && age % 14 === 0 && age < 70) juice(s).burst(x + (age % 28 ? u : -u), edgeY, '#e8d6b0', 5, 2, 1.6);
    return;
  }
  // 몸통 (판 뒤에서 위쪽만 보인다)
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ell(ctx, x, edgeY - u * 0.05, u * 1.25, u * 0.25);
  ctx.fill();
  ctx.save();
  ctx.translate(xx, yy);
  // 뒤쪽 장식: 다람쥐 꼬리 · 고슴도치 가시 · 거북 등딱지 · 여우 꼬리
  if (k === 'squirrel' || k === 'fox') {
    const sw = Math.sin(t * 0.06) * u * 0.15 + (m === 'mad' ? Math.sin(age) * u * 0.1 : 0);
    ctx.fillStyle = k === 'fox' ? lk.fur : '#b8692f';
    ctx.beginPath();
    ctx.moveTo(u * 0.7, u * 1.3);
    ctx.quadraticCurveTo(u * 2.0 + sw, u * 0.9, u * 1.6 + sw, -u * 0.6);
    ctx.quadraticCurveTo(u * 1.4 + sw, -u * 1.0, u * 1.1 + sw, -u * 0.5);
    ctx.quadraticCurveTo(u * 1.4, u * 0.4, u * 0.6, u * 1.0);
    ctx.fill();
    if (k === 'fox') {
      ctx.fillStyle = '#fff5ea';
      ell(ctx, u * 1.35 + sw, -u * 0.62, u * 0.22, u * 0.2);
      ctx.fill();
    }
  }
  if (k === 'hedgehog') {
    const up = m === 'mad' || m === 'shock' ? 1.25 : 1;
    ctx.fillStyle = '#6d5038';
    ctx.beginPath();
    for (let j = 0; j <= 16; j++) {
      const an = Math.PI * (1.02 + (j / 16) * 0.96) - Math.PI * 0.01, rad = u * (j % 2 ? 1.25 : 1.6 * up);
      ctx.lineTo(Math.cos(an) * rad * 1.05, u * 0.2 + Math.sin(an) * rad);
    }
    ctx.lineTo(u * 1.3, u * 1.3);
    ctx.lineTo(-u * 1.3, u * 1.3);
    ctx.fill();
    ctx.fillStyle = '#8a6a4b';
    for (let j = 0; j < 9; j++) {
      const an = Math.PI * (1.1 + (j / 8) * 0.8);
      ell(ctx, Math.cos(an) * u * 1.05, u * 0.2 + Math.sin(an) * u * 1.05, u * 0.07, u * 0.2, an + Math.PI / 2);
      ctx.fill();
    }
  }
  if (k === 'turtle') {
    const sg = ctx.createRadialGradient(-u * 0.3, u * 0.5, u * 0.2, 0, u * 0.9, u * 1.5);
    sg.addColorStop(0, '#9cc45e');
    sg.addColorStop(1, '#4d7428');
    ctx.fillStyle = sg;
    ell(ctx, 0, u * 1.05, u * 1.45, u * 0.95);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,70,20,.6)';
    ctx.lineWidth = 2;
    for (let j = -1; j <= 1; j++) {
      ctx.beginPath();
      ctx.arc(j * u * 0.7, u * 0.85, u * 0.32, 0, TAU);
      ctx.stroke();
    }
  }
  // 몸
  ctx.fillStyle = lk.fur2;
  ell(ctx, 0, u * 1.25, u * 1.05, u * 0.75);
  ctx.fill();
  ctx.fillStyle = k === 'owl' ? '#cdb48a' : lk.muzzle;
  ell(ctx, 0, u * 1.25, u * 0.55, u * 0.5);
  ctx.fill();
  if (k === 'fox') {
    // 챔피언 메달
    ctx.fillStyle = '#e04848';
    ctx.fillRect(-u * 0.12, u * 0.75, u * 0.08, u * 0.35);
    ctx.fillRect(u * 0.04, u * 0.75, u * 0.08, u * 0.35);
    ctx.fillStyle = '#ffd54a';
    ell(ctx, 0, u * 1.15, u * 0.16, u * 0.16);
    ctx.fill();
  }
  drawHead(ctx, 0, 0, u, k, m, age, t, s.thinkUntil > 0 ? 1 : 0);
  ctx.restore();
  // 생각 중 …
  if (s.thinkUntil > 0 && s.phase === 'play') {
    for (let j = 0; j < 3; j++) {
      const on = Math.floor(t / 8) % 4 > j;
      ctx.fillStyle = on ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.4)';
      ell(ctx, x - u * 1.25 - j * u * 0.28, y - u * 0.9 - j * u * 0.12, u * (0.08 + j * 0.03), u * (0.08 + j * 0.03));
      ctx.fill();
    }
  }
}

/** 동물 머리 (가운데 x,y, 반지름 u). 기분마다 눈·눈썹·입이 다르다 */
function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, k: string, m: string, age: number, t: number, look: number) {
  const lk = LOOK[k];
  const sad = m === 'sad' || m === 'dizzy';
  // 귀
  ctx.fillStyle = lk.ear;
  if (k === 'rabbit') {
    const droop = m === 'shock' || m === 'sweat' || sad ? 0.6 : 0;
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(x + sd * u * 0.38, y - u * 0.7);
      ctx.rotate(sd * (0.18 + droop) + Math.sin(t * 0.07 + sd) * 0.05);
      ctx.fillStyle = lk.ear;
      ell(ctx, 0, -u * 0.6, u * 0.24, u * 0.68);
      ctx.fill();
      ctx.fillStyle = lk.inner;
      ell(ctx, 0, -u * 0.6, u * 0.12, u * 0.52);
      ctx.fill();
      ctx.restore();
    }
  } else if (k === 'dog') {
    const flap = m === 'wow' || m === 'proud' || m === 'chomp' ? Math.sin(t * 0.5) * 0.25 : 0;
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(x + sd * u * 0.78, y - u * 0.45);
      ctx.rotate(sd * (0.35 + flap) + (sad ? sd * 0.3 : 0));
      ctx.fillStyle = lk.ear;
      ell(ctx, 0, u * 0.42, u * 0.3, u * 0.58);
      ctx.fill();
      ctx.restore();
    }
  } else if (k === 'fox' || k === 'squirrel') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = lk.ear;
      ctx.beginPath();
      ctx.moveTo(x + sd * u * 0.25, y - u * 0.75);
      ctx.lineTo(x + sd * u * 0.75, y - u * (k === 'fox' ? 1.55 : 1.35));
      ctx.lineTo(x + sd * u * 0.9, y - u * 0.35);
      ctx.fill();
      ctx.fillStyle = k === 'fox' ? lk.inner : '#f6c99a';
      ctx.beginPath();
      ctx.moveTo(x + sd * u * 0.5, y - u * 1.0);
      ctx.lineTo(x + sd * u * 0.74, y - u * (k === 'fox' ? 1.5 : 1.3));
      ctx.lineTo(x + sd * u * 0.8, y - u * 0.75);
      ctx.fill();
    }
  } else if (k === 'owl') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = lk.ear;
      ctx.beginPath();
      ctx.moveTo(x + sd * u * 0.35, y - u * 0.8);
      ctx.lineTo(x + sd * u * 0.85, y - u * 1.3);
      ctx.lineTo(x + sd * u * 0.85, y - u * 0.55);
      ctx.fill();
    }
  } else if (k !== 'turtle') {
    const er = k === 'hedgehog' ? 0.2 : 0.32;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = lk.ear;
      ell(ctx, x + sd * u * 0.68, y - u * 0.72, u * er, u * er);
      ctx.fill();
      ctx.fillStyle = lk.inner;
      ell(ctx, x + sd * u * 0.68, y - u * 0.72, u * er * 0.55, u * er * 0.55);
      ctx.fill();
    }
  }
  // 머리
  const hg = ctx.createRadialGradient(x - u * 0.3, y - u * 0.4, u * 0.1, x, y, u * 1.05);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(0.18, lk.fur);
  hg.addColorStop(1, lk.fur2);
  ctx.fillStyle = hg;
  ell(ctx, x, y, u * (k === 'owl' ? 1.02 : 0.95), u * (k === 'turtle' ? 0.82 : 0.88));
  ctx.fill();
  // 얼굴 무늬
  if (k === 'raccoon') {
    ctx.fillStyle = lk.inner;
    ctx.beginPath();
    ctx.ellipse(x - u * 0.36, y - u * 0.08, u * 0.32, u * 0.22, 0.2, 0, TAU);
    ctx.ellipse(x + u * 0.36, y - u * 0.08, u * 0.32, u * 0.22, -0.2, 0, TAU);
    ctx.fill();
  }
  if (k === 'owl') {
    ctx.fillStyle = lk.muzzle;
    ell(ctx, x - u * 0.38, y - u * 0.05, u * 0.42, u * 0.44);
    ctx.fill();
    ell(ctx, x + u * 0.38, y - u * 0.05, u * 0.42, u * 0.44);
    ctx.fill();
  }
  if (k === 'fox') {
    ctx.fillStyle = lk.muzzle;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.9, y + u * 0.05);
    ctx.quadraticCurveTo(x, y + u * 1.0, x + u * 0.9, y + u * 0.05);
    ctx.quadraticCurveTo(x, y + u * 0.3, x - u * 0.9, y + u * 0.05);
    ctx.fill();
  }
  if (k === 'dog' || k === 'bear' || k === 'rabbit' || k === 'raccoon' || k === 'hedgehog' || k === 'squirrel') {
    ctx.fillStyle = lk.muzzle;
    ell(ctx, x, y + u * 0.38, u * 0.45, u * 0.33);
    ctx.fill();
  }
  if (k === 'dog') {
    ctx.fillStyle = lk.ear;
    ell(ctx, x + u * 0.42, y - u * 0.3, u * 0.22, u * 0.2);
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 눈
  const ex = u * 0.34, ey = y - u * 0.08, lx = look ? u * 0.08 : 0, ly = look ? -u * 0.08 : 0;
  const blink = (t + k.length * 37) % 190 < 6 && m === 'idle';
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const cx = x + sd * ex;
    if (k === 'owl') {
      ctx.fillStyle = '#ffd23f';
      ell(ctx, cx, ey, u * 0.24, u * 0.24);
      ctx.fill();
    }
    ctx.strokeStyle = '#2a1f1a';
    ctx.fillStyle = '#2a1f1a';
    ctx.lineWidth = Math.max(1.5, u * 0.09);
    if (m === 'dizzy') {
      ctx.beginPath();
      for (let j = 0; j < 14; j++) {
        const an = j * 0.75 + t * 0.2 * sd, rd = u * 0.015 * j;
        ctx.lineTo(cx + Math.cos(an) * rd, ey + Math.sin(an) * rd);
      }
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (blink || m === 'proud' || m === 'clap' || m === 'chomp') {
      ctx.beginPath();
      ctx.arc(cx, ey + u * 0.05, u * 0.13, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (m === 'smug' || m === 'gloat') {
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.14, ey);
      ctx.lineTo(cx + u * 0.14, ey);
      ctx.stroke();
      ell(ctx, cx + u * 0.03, ey + u * 0.05, u * 0.07, u * 0.05);
      ctx.fill();
    } else if (m === 'shock' || m === 'wow') {
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx, ey, u * 0.17, u * 0.2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#2a1f1a';
      ell(ctx, cx, ey + u * 0.02, u * (m === 'wow' ? 0.11 : 0.05), u * (m === 'wow' ? 0.13 : 0.05));
      ctx.fill();
      if (m === 'wow') {
        ctx.fillStyle = '#ffffff';
        ell(ctx, cx - u * 0.04, ey - u * 0.04, u * 0.04, u * 0.04);
        ctx.fill();
      }
    } else {
      ell(ctx, cx + lx, ey + ly, u * 0.09, u * (m === 'focus' ? 0.07 : 0.11));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx + lx - u * 0.03, ey + ly - u * 0.04, u * 0.03, u * 0.03);
      ctx.fill();
    }
    // 눈썹
    ctx.strokeStyle = 'rgba(40,25,15,.85)';
    ctx.lineWidth = Math.max(1.5, u * 0.07);
    if (m === 'mad' || m === 'focus') {
      ctx.beginPath();
      ctx.moveTo(cx - sd * u * 0.18, ey - u * 0.3);
      ctx.lineTo(cx + sd * u * 0.12, ey - u * (m === 'mad' ? 0.18 : 0.22));
      ctx.stroke();
    } else if (m === 'sweat' || m === 'sad' || m === 'huh') {
      if (m === 'huh' && sd < 0) continue;
      ctx.beginPath();
      ctx.moveTo(cx - sd * u * 0.16, ey - u * 0.2);
      ctx.lineTo(cx + sd * u * 0.12, ey - u * 0.3);
      ctx.stroke();
    }
  }
  // 코·입 (부엉이는 부리)
  if (k === 'owl') {
    ctx.fillStyle = lk.nose;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.1, y + u * 0.15);
    ctx.lineTo(x + u * 0.1, y + u * 0.15);
    ctx.lineTo(x, y + u * (m === 'shock' || m === 'mad' ? 0.45 : 0.38));
    ctx.fill();
  } else {
    const ny = y + (k === 'turtle' ? u * 0.2 : u * 0.26);
    ctx.fillStyle = lk.nose;
    ell(ctx, x, ny, u * (k === 'rabbit' ? 0.07 : 0.12), u * (k === 'rabbit' ? 0.06 : 0.09));
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,15,.85)';
    ctx.lineWidth = Math.max(1.2, u * 0.06);
    const my = ny + u * 0.14;
    ctx.beginPath();
    if (m === 'shock') ell(ctx, x, my + u * 0.06, u * 0.09, u * 0.12), (ctx.fillStyle = '#5a2a2a'), ctx.fill();
    else if (m === 'mad' || m === 'sweat') {
      ctx.moveTo(x - u * 0.15, my + u * 0.08);
      ctx.quadraticCurveTo(x, my - u * 0.02, x + u * 0.15, my + u * 0.08);
      ctx.stroke();
    } else if (m === 'sad' || m === 'dizzy') {
      ctx.moveTo(x - u * 0.15, my + u * 0.05);
      for (let j = 1; j <= 4; j++) ctx.lineTo(x - u * 0.15 + j * u * 0.075, my + (j % 2 ? 0 : u * 0.05));
      ctx.stroke();
    } else if (m === 'clap' || m === 'wow' || m === 'proud' || m === 'gloat' || m === 'smug') {
      ctx.fillStyle = '#7a2a2a';
      ctx.moveTo(x - u * 0.18, my - u * 0.02);
      ctx.quadraticCurveTo(x, my + u * 0.25, x + u * 0.18, my - u * 0.02);
      ctx.closePath();
      ctx.fill();
      if (k === 'dog') {
        ctx.fillStyle = '#ff7b8a';
        ell(ctx, x, my + u * 0.12, u * 0.08, u * 0.07);
        ctx.fill();
      }
    } else if (m === 'focus' && k === 'dog') {
      ctx.moveTo(x - u * 0.12, my);
      ctx.quadraticCurveTo(x, my + u * 0.06, x + u * 0.12, my);
      ctx.stroke();
      ctx.fillStyle = '#ff7b8a';
      ell(ctx, x + u * 0.08, my + u * 0.1, u * 0.06, u * 0.09, -0.3);
      ctx.fill();
    } else {
      ctx.moveTo(x - u * 0.13, my);
      ctx.quadraticCurveTo(x - u * 0.06, my + u * 0.08, x, my);
      ctx.quadraticCurveTo(x + u * 0.06, my + u * 0.08, x + u * 0.13, my);
      ctx.stroke();
    }
    if (k === 'rabbit' || k === 'raccoon' || k === 'fox' || k === 'squirrel') {
      ctx.strokeStyle = 'rgba(60,50,50,.45)';
      ctx.lineWidth = 1;
      for (const sd of [-1, 1])
        for (let j = 0; j < 2; j++) {
          ctx.beginPath();
          ctx.moveTo(x + sd * u * 0.3, ny + j * u * 0.08);
          ctx.lineTo(x + sd * u * 0.72, ny - u * 0.06 + j * u * 0.14);
          ctx.stroke();
        }
    }
  }
  ctx.lineCap = 'butt';
  // 볼터치
  ctx.fillStyle = m === 'mad' ? 'rgba(255,60,60,.5)' : 'rgba(255,120,140,.35)';
  ell(ctx, x - u * 0.55, y + u * 0.22, u * 0.13, u * 0.08);
  ctx.fill();
  ell(ctx, x + u * 0.55, y + u * 0.22, u * 0.13, u * 0.08);
  ctx.fill();
  // 기분 표시: 💢 · 땀 · ? · 별
  if (m === 'mad' && age < 80) {
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 2.5;
    const ax = x + u * 0.75, ay = y - u * 0.75, z = u * 0.16 * (1 + 0.2 * Math.sin(age * 0.6));
    for (let j = 0; j < 4; j++) {
      const an = (j / 4) * TAU + 0.785;
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(an) * z * 0.4, ay + Math.sin(an) * z * 0.4);
      ctx.lineTo(ax + Math.cos(an) * z * 1.2, ay + Math.sin(an) * z * 1.2);
      ctx.stroke();
    }
    // 김
    for (let j = 0; j < 2; j++) {
      const q = ((age * 0.03 + j * 0.5) % 1);
      ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - q)})`;
      ell(ctx, x + (j ? 1 : -1) * u * 0.9, y - u * 0.6 - q * u * 0.6, u * (0.1 + q * 0.12), u * (0.08 + q * 0.1));
      ctx.fill();
    }
  }
  if (m === 'sweat' || m === 'shock' || m === 'huh') {
    const q = (age % 40) / 40;
    ctx.fillStyle = '#8fd3ff';
    ctx.beginPath();
    const sx = x + u * 0.8, sy = y - u * 0.3 + q * u * 0.4;
    ctx.moveTo(sx, sy - u * 0.16);
    ctx.quadraticCurveTo(sx + u * 0.1, sy, sx, sy + u * 0.05);
    ctx.quadraticCurveTo(sx - u * 0.1, sy, sx, sy - u * 0.16);
    ctx.fill();
  }
  if (m === 'huh') {
    ctx.font = `900 ${Math.max(13, u * 0.6)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('?', x - u * 0.85, y - u * 0.75);
  }
  if (m === 'dizzy') {
    for (let j = 0; j < 3; j++) {
      const an = t * 0.12 + (j * TAU) / 3;
      ctx.font = `${Math.max(12, u * 0.35)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('⭐', x + Math.cos(an) * u * 0.9, y - u * 0.85 + Math.sin(an) * u * 0.25);
    }
  }
  if (k === 'fox') {
    ctx.font = `${Math.max(13, u * 0.55)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👑', x - u * 0.05, y - u * 1.0);
  }
}

/** 강아지 (아래 왼쪽, 벤치 앞에서 고개를 내밀고 있다) */
function drawPuppy(ctx: CanvasRenderingContext2D, s: DuelState, x: number, y: number, u: number, t: number) {
  const m = s.mood, age = t - s.moodT;
  const jump = m === 'wow' || m === 'proud' ? Math.abs(Math.sin(age * 0.25)) * u * 0.25 * Math.max(0, 1 - age / 60) : m === 'chomp' ? Math.abs(Math.sin(age * 0.6)) * u * 0.08 : 0;
  const tilt = m === 'dizzy' ? Math.sin(age * 0.15) * 0.35 : m === 'huh' ? -0.15 : m === 'shock' ? Math.sin(age * 1.4) * 0.06 * Math.max(0, 1 - age / 30) : 0;
  // 꼬리 (신나면 붕붕)
  const wag = Math.sin(t * (m === 'wow' || m === 'proud' || m === 'chomp' ? 0.9 : 0.15)) * (m === 'wow' || m === 'proud' ? 0.7 : 0.3);
  ctx.save();
  ctx.translate(x + u * 1.1, y + u * 0.5);
  ctx.rotate(-0.8 + wag);
  ctx.strokeStyle = LOOK.dog.fur2;
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 0.26;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(u * 0.25, -u * 0.5, u * 0.1, -u * 0.95);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
  // 몸 (벤치 앞 풀밭에 앉음)
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ell(ctx, x + u * 0.2, y + u * 1.15, u * 1.2, u * 0.22);
  ctx.fill();
  ctx.fillStyle = LOOK.dog.fur2;
  ell(ctx, x + u * 0.25, y + u * 0.75, u * 0.9, u * 0.55);
  ctx.fill();
  ctx.fillStyle = LOOK.dog.muzzle;
  ell(ctx, x + u * 0.1, y + u * 0.8, u * 0.45, u * 0.4);
  ctx.fill();
  // 빨간 목걸이 + 방울
  ctx.strokeStyle = '#e8453c';
  ctx.lineWidth = u * 0.14;
  ctx.beginPath();
  ctx.arc(x, y - jump + u * 0.05, u * 0.62, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();
  ctx.fillStyle = '#ffd54a';
  ell(ctx, x, y - jump + u * 0.7, u * 0.11, u * 0.11);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - jump);
  ctx.rotate(tilt);
  drawHead(ctx, 0, 0, u, 'dog', m, age, t, 0);
  // 냠냠: 입에 뼈다귀
  if (m === 'chomp' && age < 60) drawBone(ctx, u * 0.05, u * 0.42, u * 0.42, 0.1 + Math.sin(age * 0.6) * 0.15);
  ctx.restore();
  // 앞발 (벤치 모서리 위)
  for (const sd of [-0.45, 0.45]) {
    const press = s.down && sd > 0 && s.hover >= 0 ? u * 0.12 : 0;
    ctx.fillStyle = LOOK.dog.fur;
    ell(ctx, x + sd * u + u * 0.35, y + u * 0.5 - press, u * 0.26, u * 0.18);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,70,30,.35)';
    for (let j = -1; j <= 1; j++) (ell(ctx, x + sd * u + u * 0.35 + j * u * 0.09, y + u * 0.42 - press, u * 0.035, u * 0.04), ctx.fill());
  }
}

// ═════════════ 점수 줄다리기 · 깃털 · 말풍선 ═════════════
function drawScore(ctx: CanvasRenderingContext2D, s: DuelState, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const d = STAGES[s.stage], foe = LOOK[d.who];
  const x0 = X(0.285), x1 = X(0.755), y = Y(1.222), bh = R(0.036);
  const me = s.me, op = s.op, tot = Math.max(1, me + op), q = me / tot;
  const myTurn = s.S.turn === ME && s.phase === 'play' && !s.S.end;
  // 차례 표시
  font(0.034, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const turnTxt = s.phase !== 'play' ? '' : myTurn ? (busy(s) ? '' : '🐶 내 차례!') : `${d.emoji} 차례…`;
  if (turnTxt) {
    const tw = ctx.measureText(turnTxt).width + R(0.04);
    ctx.fillStyle = myTurn ? 'rgba(255,209,102,.95)' : 'rgba(60,50,80,.8)';
    rr(ctx, (x0 + x1) / 2 - tw / 2, y - R(0.07), tw, R(0.042), R(0.021));
    ctx.fill();
    ctx.fillStyle = myTurn ? '#4a2a08' : '#efe8ff';
    ctx.fillText(turnTxt, (x0 + x1) / 2, y - R(0.049) + (myTurn ? Math.sin(t * 0.15) * 1 : 0));
  }
  ctx.fillStyle = 'rgba(40,25,10,.55)';
  rr(ctx, x0 - R(0.055), y - bh / 2 - 3, x1 - x0 + R(0.11), bh + 6, (bh + 6) / 2);
  ctx.fill();
  const g1 = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
  g1.addColorStop(0, '#fff6dc');
  g1.addColorStop(1, '#e6c07a');
  ctx.fillStyle = g1;
  rr(ctx, x0, y - bh / 2, (x1 - x0) * q, bh, bh / 2);
  ctx.fill();
  const g2 = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
  g2.addColorStop(0, '#6a6190');
  g2.addColorStop(1, '#2c2542');
  ctx.fillStyle = g2;
  rr(ctx, x0 + (x1 - x0) * q, y - bh / 2, (x1 - x0) * (1 - q), bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0 + (x1 - x0) * q - 1, y - bh / 2 - 2, 2, bh + 4);
  // 양 끝 돌 + 수
  drawStone(ctx, x0 - R(0.025), y + 2, R(0.03), ME, 1, 0, foe);
  drawStone(ctx, x1 + R(0.025), y + 2, R(0.03), OP, 1, 0, foe);
  font(0.04, 900);
  ctx.fillStyle = '#5a3208';
  ctx.textAlign = 'left';
  ctx.fillText(String(me), x0 + R(0.012), y + 1);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#efe8ff';
  ctx.fillText(String(op), x1 - R(0.012), y + 1);
}
function drawFeather(ctx: CanvasRenderingContext2D, s: DuelState, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const x = X(FX), y = Y(FY), r = R(FR), on = s.feather > 0 && !!s.prev && s.S.turn === ME && !busy(s) && s.phase === 'play';
  const used = s.feather <= 0, pr = s.down && s.btn ? 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ell(ctx, x + 2, y + r * 0.85, r * 0.95, r * 0.28);
  ctx.fill();
  ctx.fillStyle = used ? '#7d7a72' : '#7a4a22';
  ell(ctx, x, y + r * 0.18, r, r * 0.86);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4 + pr, 2, x, y + pr, r);
  g.addColorStop(0, used ? '#c8c4ba' : '#ffe9c0');
  g.addColorStop(1, used ? '#99958b' : '#d9a25e');
  ctx.fillStyle = g;
  ell(ctx, x, y + pr, r, r * 0.86);
  ctx.fill();
  if (on) {
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 0.15)})`;
    ctx.lineWidth = 2;
    ell(ctx, x, y + pr, r * 1.08, r * 0.94);
    ctx.stroke();
  }
  ctx.font = `${Math.max(16, r * 0.95)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = used ? 0.45 : 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🪶', x, y - r * 0.05 + pr + (on ? Math.sin(t * 0.1) * 1.5 : 0));
  ctx.globalAlpha = 1;
  font(0.026, 900);
  ctx.fillStyle = used ? 'rgba(255,255,255,.6)' : '#4a2a08';
  ctx.fillText(used ? '다 씀' : '무르기', x, y + r * 0.6 + pr);
}
function drawBubble(ctx: CanvasRenderingContext2D, s: DuelState, w: number, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const age = t - s.sayT;
  if (!s.sayText || age > s.sayDur) return;
  const a = Math.min(1, age / 6, (s.sayDur - age) / 12), pop = 1 + Math.max(0, 6 - age) * 0.03;
  font(0.036, 800);
  const words = s.sayText.split(' ');
  let lines = [s.sayText];
  const maxW = R(0.34);
  if (ctx.measureText(s.sayText).width > maxW && words.length > 1) {
    let best = 1, bd = 1e9;
    for (let k = 1; k < words.length; k++) {
      const l1 = words.slice(0, k).join(' '), l2 = words.slice(k).join(' ');
      const dd = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);
      if (dd < bd) (bd = dd), (best = k);
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + R(0.04), lh = R(0.042), bh = lines.length * lh + R(0.022);
  const bx = Math.min(w - tw - 4, X(0.6)), by = Y(0.132);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(bx + tw / 2, by + bh / 2);
  ctx.scale(pop, pop);
  ctx.translate(-(bx + tw / 2), -(by + bh / 2));
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  rr(ctx, bx + 2, by + 3, tw, bh, R(0.025));
  ctx.fill();
  ctx.fillStyle = '#fffdf6';
  rr(ctx, bx, by, tw, bh, R(0.025));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx + R(0.02), by + bh - 2);
  ctx.lineTo(bx - R(0.03), by + bh + R(0.03));
  ctx.lineTo(bx + R(0.06), by + bh - 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,30,.35)';
  ctx.lineWidth = 1;
  rr(ctx, bx, by, tw, bh, R(0.025));
  ctx.stroke();
  ctx.fillStyle = '#3a2a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, k) => ctx.fillText(l, bx + tw / 2, by + R(0.011) + lh * (k + 0.5)));
  ctx.restore();
}

// ═════════════ HUD ═════════════
function goalLabel(s: DuelState): string {
  const L = s.L, S = s.S, d = STAGES[s.stage], [a, b] = goalOf(L, S);
  switch (d.goal) {
    case 'corner': return `🚩 귀퉁이 ${a}/${b}`;
    case 'bone': return `🦴 다 먹기 ${a}/${b}`;
    case 'gold': return `⭐ 황금 ${a}/${b}`;
    case 'honey': return `🍯 꿀 칸 ${a}/${b}`;
    case 'pass': return `🙊 쉬게 하기 ${a}/${b}`;
    case 'crush': return `${d.emoji} 돌 ${L.gk}개 이하`;
  }
}
function drawHud(ctx: CanvasRenderingContext2D, s: DuelState, d: StageDef, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  const t = s.t, S = s.S, L = s.L;
  const hb = R(0.066);
  ctx.fillStyle = 'rgba(40,58,30,.88)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e4';
  let title = `${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`;
  const stt = `★ ${s.stars}`, hearts = '♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts));
  const right = ctx.measureText(stt).width + ctx.measureText(hearts).width + R(0.09);
  let fs = 0.04;
  while (ctx.measureText(title).width > w - right - R(0.04) && fs > 0.032) font((fs -= 0.001), 900);
  if (ctx.measureText(title).width > w - right - R(0.04)) title = `${s.stage + 1}/${STAGES.length} ${d.emoji} ${d.name}`;
  ctx.fillText(title, R(0.03), hb * 0.52);
  font(0.04, 900);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = '#ff6b5e';
  ctx.fillText(hearts, w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let f2 = 0.036;
    font(f2, 900);
    while (ctx.measureText(tx).width > w - R(0.05) && f2 > 0.03) font((f2 -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.098) - drop;
    ctx.fillStyle = 'rgba(50,40,20,.92)';
    rr(ctx, w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,120,.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6e0';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 80 && s.phase === 'play') {
      const a = Math.min(1, age / 8, (80 - age) / 16), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(40,25,10,.6)';
      ctx.fillRect(0, Y(0.93), w, R(0.15));
      ctx.save();
      ctx.translate(w / 2, Y(0.992));
      ctx.scale(sc, sc);
      font(0.064, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(40,25,10,.8)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.036, 800);
      const sub = s.stage === 0 ? '돌을 끼워 뒤집어요 — 많은 쪽이 이겨요' : `${d.emoji} "${d.say}"`;
      ctx.strokeText(sub, 0, R(0.055));
      ctx.fillText(sub, 0, R(0.055));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  drawSpot(ctx, s, w, X, Y, R, font);
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(50,35,10,.75)' : 'rgba(70,20,30,.75)';
    ctx.fillRect(0, Y(0.55), w, R(0.3));
    ctx.textAlign = 'center';
    font(s.ok ? 0.058 : 0.05, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '🏆 공원 챔피언! 🎉' : `${d.emoji} ${d.name}에게 이겼다!`) : s.why, w / 2, Y(0.605));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.7));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.7), '#ffe066', 14, 3, 2.4);
      }
    }
    font(0.036, 800);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🐶 ${s.me} : ${s.op} ${d.emoji}` + (s.ok ? ` · ${s.diff}개 차` : ''), w / 2, Y(0.775));
    if (!s.ok) {
      font(0.034, 800);
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 같은 상대와 다시 한 판' : '하트를 다 썼어요 — 끝', w / 2, Y(0.825));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y0 = Y(1.285);
    const bg = ctx.createLinearGradient(0, y0, 0, Y(A));
    bg.addColorStop(0, 'rgba(35,50,25,.0)');
    bg.addColorStop(0.22, 'rgba(35,50,25,.85)');
    bg.addColorStop(1, 'rgba(30,42,20,.94)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, y0, w, Y(A) - y0);
    const y2 = Y(1.327), res = s.phase === 'result' && s.ok, fin = s.phase !== 'play';
    const diff = s.me - s.op, gd = goalDone(L, S);
    const chips = [
      { txt: '이기기', st: res ? true : fin && !s.ok ? false : null },
      { txt: `${L.M}개 차`, st: res ? s.diff >= L.M : fin && !s.ok ? false : diff >= L.M ? 'on' : null },
      { txt: goalLabel(s), st: res ? gd : fin && !s.ok ? false : gd ? 'on' : null },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.35)' : st === 'on' ? 'rgba(160,230,120,.25)' : st === false ? 'rgba(0,0,0,.35)' : 'rgba(255,245,225,.12)';
      rr(ctx, gx + 2, y2 - R(0.027), gw - 4, R(0.054), R(0.027));
      ctx.fill();
      let f3 = 0.032;
      font(f3, 800);
      const label = `${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`;
      while (ctx.measureText(label).width > gw - 10 && f3 > 0.028) font((f3 -= 0.001), 800);
      ctx.textAlign = 'center';
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : st === 'on' ? '#d8ffc0' : '#fff6e0';
      ctx.fillText(label, gx + gw / 2, y2 + 1);
    });
    const y3 = Y(1.405);
    let tp = '👆 반짝이는 칸을 꾹 → 떼면 쾅! 끼인 돌이 뒤집혀요';
    if (s.phase === 'result') tp = s.ok ? '다음 상대가 벤치에 앉아요!' : '같은 상대와 다시 — 귀퉁이와 둘 곳 수를 노려요';
    else if (s.phase === 'settle') tp = '판이 끝났어요 — 돌을 세는 중…';
    else if (S.turn === OP) tp = `${d.emoji} ${d.say}`;
    else if (s.down && s.hover >= 0 && canPlace(L, S.b, s.hover, ME)) tp = '떼면 쾅! · 다른 칸으로 밀어서 떼면 그 칸에';
    else if (s.stage > 0 || S.n > 2) tp = d.tip;
    ctx.textAlign = 'center';
    let f4 = 0.034;
    font(f4, 800);
    while (ctx.measureText(tp).width > w - R(0.04) && f4 > 0.03) font((f4 -= 0.001), 800);
    ctx.fillStyle = 'rgba(245,240,220,.95)';
    ctx.fillText(tp, w / 2, y3);
  }
  // 첫 판 첫 수: 손가락으로 가장 많이 뒤집는 칸 가리키기
  if (s.stage === 0 && S.n === 0 && s.phase === 'play' && t - s.startT > 30 && !s.down) {
    const c = greedyPick(L, S);
    if (c >= 0) {
      const bob = Math.sin(t * 0.15) * R(0.012);
      ctx.font = `${Math.max(20, R(0.075))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(cellX(c)) + R(0.02), Y(cellY(c) + 0.07) + bob);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.5;
      ell(ctx, X(cellX(c)), Y(cellY(c)), R(CW * 0.48) + Math.sin(t * 0.15) * 2, R(CH * 0.5));
      ctx.stroke();
      font(0.032, 900);
      ctx.fillStyle = '#fff6d0';
      ctx.fillText('여기를 꾹 → 착착착!', X(cellX(c)) + R(0.12), Y(cellY(c) - 0.075));
    }
  }
  ctx.textBaseline = 'alphabetic';
}

/** 새 장치 스포트라이트: 그 판을 처음 할 때, 판 소개 뒤 2초쯤 장치에 빛을 비춘다 */
function drawSpot(ctx: CanvasRenderingContext2D, s: DuelState, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  if (s.retry || s.phase !== 'play') return;
  const age = s.t - s.startT;
  if (age < 80 || age > 215) return;
  const L = s.L, key = STAGES[s.stage].key;
  let cells: number[] = [], label = '';
  if (key === 'raccoon') (cells = L.bones), (label = '🦴 뼈다귀 칸 — 여기 두면 한 번 더!');
  else if (key === 'turtle') (cells = [...Array(NC).keys()].filter((c) => L.init[c] === ROCK)), (label = '🪨 바위 — 줄이 끊겨요 · 옆 칸이 귀퉁이 🚩');
  else if (key === 'hedgehog') (cells = [...Array(NC).keys()].filter((c) => L.gold[c])), (label = '⭐ 황금 칸 — 돌 2개로 세요');
  else if (key === 'squirrel') (cells = L.corners.slice(0, 8)), (label = '🚩 구멍 옆도 귀퉁이 — 절대 안 뒤집혀요');
  else if (key === 'bear') (cells = L.balloons), (label = '🎈 풍선 칸 — 두면 펑! 둘레가 다 뒤집혀요');
  else if (key === 'owl') (cells = [...Array(NC).keys()].filter((c) => L.honey[c])), (label = '🍯 꿀 칸 — 여기 돌은 절대 안 뒤집혀요');
  else if (key === 'fox') (cells = [...[...Array(NC).keys()].filter((c) => L.gold[c]), ...L.bones]), (label = '🏆 결승 — ⭐ 황금 칸과 🦴 뼈다귀를 노려요');
  if (!cells.length || !label) return;
  const a = Math.min(1, (age - 80) / 10, (215 - age) / 18), r = R(CW * 0.62) * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20,14,6,.6)';
  ctx.beginPath();
  ctx.rect(0, R(0.066), w, Y(1.285) - R(0.066));
  for (const c of cells) {
    ctx.moveTo(X(cellX(c)) + r, Y(cellY(c)));
    ctx.arc(X(cellX(c)), Y(cellY(c)), r, 0, TAU, true);
  }
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff1a8';
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 5]);
  ctx.lineDashOffset = -age;
  for (const c of cells) {
    ctx.beginPath();
    ctx.arc(X(cellX(c)), Y(cellY(c)), r, 0, TAU);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  font(0.034, 900);
  let fs = 0.034;
  while (ctx.measureText(label).width > w - R(0.1) && fs > 0.03) font((fs -= 0.001), 900);
  const tw = ctx.measureText(label).width + R(0.05), ly = Y(BY0 + SZ * CH * 0.5), lx = w / 2;
  ctx.fillStyle = 'rgba(70,40,10,.96)';
  rr(ctx, lx - tw / 2, ly - R(0.03), tw, R(0.06), R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(label, lx, ly + 1);
  font(0.03, 900);
  const nb = 'NEW!', nw2 = ctx.measureText(nb).width + R(0.03);
  ctx.fillStyle = '#ff5a6e';
  rr(ctx, lx - tw / 2 - R(0.01), ly - R(0.055), nw2, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw2 / 2, ly - R(0.034));
  ctx.restore();
}
