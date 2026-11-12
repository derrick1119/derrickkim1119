/**
 * 고양이 청소기 (24라운드: 새 장르) — 상자 밀기 퍼즐(미끄럼) × 땅따먹기 × 스와이프.
 * 기준 9(손이 하는 일은 하나): 한 번 밀면(스와이프·화살표) 로봇 청소기가 그 방향으로 벽이나 가구에 닿을 때까지 쭉 미끄러진다.
 *   청소기 둘레 네 방향에 '여기까지 가요' 화살표와 치울 먼지 수가 늘 보인다 — 밀기 전에 결과가 읽힌다.
 * 규칙(결정적, 2줄): 밀면 멈출 때까지 쭉 간다. 지나간 칸은 깨끗해진다. 먼지를 모두 치우면 통과.
 * 와우: 첫 밀기에 청소기가 '위이잉~' 거실을 가로질러 먼지 한 줄을 싹 지운다. 위에 탄 고양이는 근엄한 표정으로 '흥'.
 * 판(방) 8개: 목표 = 먼지를 모두 치우기. 별 = ★ 다 치움 · ★ 밀기 N번 이하 · ★ 생선 과자 줍기.
 *   실패 = 밀기를 다 씀(또는 꼼짝 못 함) → 하트 -1, 같은 방 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 미끄럼 청소·생선 과자 → 2판 양말(밟으면 딱 멈춤 = 중간 정지) → 3판 털 뭉치(두 번 지나가야 깨끗)
 *   → 4판 자는 강아지(부딪히면 한 칸 밀려나 방 모양이 바뀜) → 5판 충전 칸(지나가면 밀기 +2 — 들렀다 가기)
 *   → 6판 쏟은 우유(밟으면 바퀴가 미끄덩 — 다음 쿠션을 폴짝 넘어 한 칸 더) → 7판 먼지통(꽉 차면 비우는 자리를 지나야 더 담음)
 *   → 8판 방 둘(칸막이 화단의 문틈과 줄을 맞춰 건너가기 + 양말).
 * 판 지도는 손으로 고른 8장(시드로 좌우 뒤집기·생선 과자 자리)이고, 너비 우선 풀이기로 최소 밀기 수(★ 기준)를 판마다 잰다.
 * 웃음: 벽에 쿵 하면 근엄하던 고양이가 앞으로 미끄러져 납작. 강아지는 깨서 청소기를 쫓아오다 꽈당.
 *   쥐구멍의 생쥐가 청소기 소리에 쏙 숨고, 다 치우면 고양이가 소파로 폴짝 올라가 만족스러운 하품.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 방: 가로 C칸 × 세로 RW칸 (0행 = 뒷벽 쪽) */
const C = 7, RW = 8, NC = C * RW;
type Dir = 'up' | 'right' | 'down' | 'left';
const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const DX: Record<Dir, number> = { up: 0, right: 1, down: 0, left: -1 };
const DY: Record<Dir, number> = { up: -1, right: 0, down: 1, left: 0 };
const FLOOR = 0, BLOCK = 1, LOW = 2;
/** 한 틱에 가는 칸 수 (6칸 ≈ 0.4초 '위이잉~') */
const SPEED = 0.24;
const RESULT_OK = 220, RESULT_FAIL = 160, CARD_T = 150, NEWS_T = 170;
const STAR_PTS = 100, LEFT_PTS = 5, WIN_PTS = 300;

/**
 * 판 지도 (7칸 × 8줄). 0행이 뒷벽 쪽.
 *  .  바닥   d 먼지   h 털 뭉치(두 번)   R 청소기 시작   f 생선 과자 후보(시드로 하나)
 *  x  양말(밟으면 멈춤)   g 자는 강아지   m 우유   c 충전 칸(+2)   t 먼지 비우는 자리   o 쿠션(낮음)
 *  가구(막힘): B 책장 · S 소파 · T 탁자 · P 화분 · A 안락의자 · V 텔레비전 · W 칸막이 화단 · L 스탠드 · D 서랍장
 */
export interface StageDef {
  key: string;
  news: string;
  hint: string;
  map: string[];
  /** 밀기 수: 최소 수(별 기준) + slack. lim이 있으면 그대로(충전 판) */
  slack: number;
  lim?: number;
  /** 먼지통 용량 (0 = 무제한) */
  cap?: number;
}

export const STAGES: StageDef[] = [
  {
    key: '', news: '', hint: '화살표 끝 = 멈출 자리 · 숫자 = 치울 먼지',
    map: ['BB..PSS', 'ddddddd', 'd.....f', 'd..T...', 'd.....f', 'd......', 'd.....f', 'Rdddddd'],
    slack: 11,
  },
  {
    key: 'sock', news: '🧦 양말을 밟으면 그 자리에 딱 멈춰요', hint: '양말 = 중간에 멈추는 자리. 줄 한가운데를 노려요',
    map: ['RBB.LBB', 'dx....d', 'd.L.A.d', 'd.T...d', 'xdddddd', '......f', '......f', 'A.....f'],
    slack: 9,
  },
  {
    key: 'hair', news: '🧶 털 뭉치는 두 번 지나가야 깨끗해요', hint: '털 뭉치는 갔다가 되돌아오면 깨끗',
    map: ['.SSV..h', '...P..h', '....f.d', '......d', '....f.h', 'TT.P.Lh', '...f..h', 'Rhdhhdd'],
    slack: 4,
  },
  {
    key: 'dog', news: '🐶 자는 강아지에 부딪히면 한 칸 밀려나요', hint: '강아지를 밀어 새 벽을 만들어요',
    map: ['SSD.VVf', '.d....f', '.d.A..f', '.d....R', '.d....d', '.d....d', '.d.TT.d', '.gddddd'],
    slack: 3,
  },
  {
    key: 'charge', news: '🔋 충전 칸을 지나면 밀기 +2', hint: '밀기가 모자라요 — 충전 칸을 들러 가요',
    map: ['dBBP.DD', 'ddcdRdd', 'd...f.d', 'd...f.d', 'd.Pc.fd', 'd..SS.d', 'TT....d', '......d'],
    slack: 0, lim: 5,
  },
  {
    key: 'milk', news: '🥛 우유를 밟으면 다음 쿠션을 폴짝 넘어요', hint: '우유 → 미끄덩 → 쿠션을 폴짝, 한 칸 더',
    map: ['BB.VDDf', 'f...Rdd', 'A.....d', 'd.....d', 'd....om', 'd.P...o', 'ddddddd', 'f....SS'],
    slack: 3,
  },
  {
    key: 'bin', news: '🗑️ 먼지통이 꽉 차면 비우는 자리를 지나요', hint: '먼지통 7칸 — 꽉 차면 🗑️을 지나 비워요',
    map: ['..VdSSB', '...dfff', '...d...', 't..d...', '...d...', '...d...', '.TTd...', 'dddRddd'],
    slack: 3, cap: 7,
  },
  {
    key: 'door', news: '🚪 방이 둘 — 문틈으로 건너가요', hint: '문틈과 줄을 맞춰야 건너가요',
    map: ['SSDWdRV', '..dWd.f', '..dWddd', '.TdWTTd', 'xddW..d', 'ddddddd', 'f..W.SS', '..fW...'],
    slack: 3,
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
export interface Room {
  kind: Uint8Array;
  glyph: string[];
  sock: Uint8Array;
  milk: Uint8Array;
  trash: Uint8Array;
  chg: number[];
  fishAt: number;
  cap: number;
}
export interface Dyn { pos: number; dust: Int8Array; dogs: number[]; fish: boolean; chg: number; bin: number; left: number; used: number }
export interface Step { at: number; got: number; hop?: boolean; fish?: boolean; chg?: boolean; trash?: boolean; full?: boolean; wet?: boolean; sock?: boolean }
export interface Move {
  dir: Dir; steps: Step[];
  /** 멈춘 까닭: wall 가구·벽 · sock 양말 · push 강아지 밀기 · dog 강아지가 못 움직임 · hop 폴짝 */
  end: 'wall' | 'sock' | 'push' | 'dog' | 'hop';
  push?: { dog: number; from: number; to: number };
  cleaned: number; changed: boolean;
}

const nb = (i: number, d: Dir) => {
  const c = (i % C) + DX[d], r = Math.floor(i / C) + DY[d];
  return c < 0 || c >= C || r < 0 || r >= RW ? -1 : r * C + c;
};
const cloneDyn = (D: Dyn): Dyn => ({ ...D, dust: D.dust.slice(), dogs: D.dogs.slice() });
const special = (R: Room, i: number) => R.sock[i] || R.milk[i] || R.trash[i] || R.chg.includes(i) || i === R.fishAt;
function dogCan(R: Room, D: Dyn, i: number) {
  return i >= 0 && R.kind[i] === FLOOR && !special(R, i) && !D.dogs.includes(i);
}

function enter(R: Room, D: Dyn, p: number): Step {
  const st: Step = { at: p, got: 0 };
  if (R.trash[p] && D.bin > 0) (D.bin = 0), (st.trash = true);
  if (D.dust[p] > 0) {
    if (R.cap && D.bin >= R.cap) st.full = true;
    else D.dust[p]--, D.bin++, (st.got = 1);
  }
  if (p === R.fishAt && !D.fish) (D.fish = true), (st.fish = true);
  const ci = R.chg.indexOf(p);
  if (ci >= 0 && !((D.chg >> ci) & 1)) (D.chg |= 1 << ci), (D.left += 2), (st.chg = true);
  if (R.milk[p]) st.wet = true;
  if (R.sock[p]) st.sock = true;
  return st;
}

/** 한 번 밀기: 멈출 때까지 쭉 (D를 바꾼다). 봇의 내다보기·미리 보기·진짜 판이 모두 이 함수 하나를 쓴다 */
export function slide(R: Room, D: Dyn, dir: Dir): Move {
  const steps: Step[] = [];
  let p = D.pos, wet = false, cleaned = 0, end: Move['end'] = 'wall', push: Move['push'];
  for (;;) {
    const n = nb(p, dir);
    if (n < 0 || R.kind[n] === BLOCK) break;
    const dg = D.dogs.indexOf(n);
    if (dg >= 0) {
      const n2 = nb(n, dir);
      if (dogCan(R, D, n2)) (D.dogs[dg] = n2), (push = { dog: dg, from: n, to: n2 }), (end = 'push');
      else end = 'dog';
      break;
    }
    if (R.kind[n] === LOW) {
      const n2 = nb(n, dir);
      if (wet && n2 >= 0 && R.kind[n2] === FLOOR && !D.dogs.includes(n2)) {
        p = n2;
        const st = enter(R, D, p);
        st.hop = true;
        steps.push(st);
        cleaned += st.got;
        end = 'hop';
      }
      break;
    }
    p = n;
    const st = enter(R, D, p);
    steps.push(st);
    cleaned += st.got;
    if (st.wet) wet = true;
    if (st.sock) {
      end = 'sock';
      break;
    }
  }
  D.pos = p;
  const changed = steps.length > 0 || !!push;
  if (changed) D.used++, D.left--;
  return { dir, steps, end, push, cleaned, changed };
}

const dustLeft = (D: Dyn) => {
  let n = 0;
  for (let i = 0; i < NC; i++) n += D.dust[i];
  return n;
};
const clean = (D: Dyn) => D.dust.every((v) => v === 0);
const keyOf = (D: Dyn) => `${D.pos},${D.dogs.join('.')},${D.fish ? 1 : 0},${D.chg},${D.bin},${D.left > 0 ? 1 : 0}|${D.dust.join('')}`;

/** 가장 적은 밀기로 다 치우는 길 (너비 우선). wantFish면 생선 과자도. 못 찾으면 null */
export function solve(R: Room, D0: Dyn, wantFish: boolean, maxStates = 60000): Dir[] | null {
  const done = (D: Dyn) => clean(D) && (!wantFish || R.fishAt < 0 || D.fish);
  if (done(D0)) return [];
  const states: Dyn[] = [D0], par: number[] = [-1], how: Dir[] = ['up'];
  const seen = new Set<string>([keyOf(D0)]);
  for (let h = 0; h < states.length; h++) {
    const S = states[h];
    // 다 치우면 판이 바로 끝난다 — 그 뒤로는 생선 과자를 주울 수 없다
    if (S.left <= 0 || (h > 0 && clean(S))) continue;
    for (const d of DIRS) {
      const D = cloneDyn(S), m = slide(R, D, d);
      if (!m.changed) continue;
      const k = keyOf(D);
      if (seen.has(k)) continue;
      seen.add(k);
      states.push(D);
      par.push(h);
      how.push(d);
      if (done(D)) {
        const path: Dir[] = [];
        for (let q = states.length - 1; q > 0; q = par[q]) path.push(how[q]);
        return path.reverse();
      }
    }
    if (states.length > maxStates) return null;
  }
  return null;
}

/** 판 지도 → 방·처음 상태 (시드: 좌우 뒤집기 · 생선 과자 자리) */
export function build(def: StageDef, flip: boolean, pick: number): { R: Room; D: Dyn } {
  const R: Room = { kind: new Uint8Array(NC), glyph: Array(NC).fill('.'), sock: new Uint8Array(NC), milk: new Uint8Array(NC), trash: new Uint8Array(NC), chg: [], fishAt: -1, cap: def.cap ?? 0 };
  const D: Dyn = { pos: 0, dust: new Int8Array(NC), dogs: [], fish: false, chg: 0, bin: 0, left: 99, used: 0 };
  const fish: number[] = [];
  for (let r = 0; r < RW; r++)
    for (let c = 0; c < C; c++) {
      const ch = def.map[r][flip ? C - 1 - c : c], i = r * C + c;
      if (ch === 'd') D.dust[i] = 1;
      else if (ch === 'h') D.dust[i] = 2;
      else if (ch === 'R') D.pos = i;
      else if (ch === 'f') fish.push(i);
      else if (ch === 'x') R.sock[i] = 1;
      else if (ch === 'g') D.dogs.push(i);
      else if (ch === 'm') R.milk[i] = 1;
      else if (ch === 'c') R.chg.push(i);
      else if (ch === 't') R.trash[i] = 1;
      else if (ch === 'o') (R.kind[i] = LOW), (R.glyph[i] = 'o');
      else if (ch !== '.') (R.kind[i] = BLOCK), (R.glyph[i] = ch);
    }
  if (fish.length) R.fishAt = fish[pick % fish.length];
  return { R, D };
}

/** 판의 밀기 수와 별 기준: 최소 수(먼지만) · 최소 수(생선 과자까지) */
export function measure(def: StageDef, R: Room, D: Dyn) {
  const lim = def.lim ?? 99;
  const D0 = { ...cloneDyn(D), left: lim };
  const a = solve(R, D0, false), b = solve(R, D0, true);
  const optClean = a ? a.length : 99, optFish = b ? b.length : 99;
  const par = Math.max(optClean + 1, optFish < 99 ? optFish : 0);
  return { optClean, optFish, par, lim: def.lim ?? par + def.slack };
}

// ───────────────────────────── 판 진행 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
interface Slide { m: Move; D2: Dyn; k: number; prog: number }
interface DogFx { t: number; dir: Dir; moved: boolean }

export interface VacState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  jit: { flip: boolean; pick: number }[];
  memo: ({ par: number; lim: number; optClean: number } | null)[];
  R: Room; D: Dyn; par: number; lim: number; dust0: number;
  mv: Slide | null; face: Dir; idleT: number; firstMove: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number;
  ok: boolean; why: string; again: boolean; won: boolean; dead: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  // 연출 (시뮬레이션 결과와 무관)
  cleanT: Int32Array; bumpT: number; bumpDir: Dir; bumps: number; dogFx: DogFx[]; wet: number; fishT: number; hissT: number;
}

const ev = (s: VacState, kind: string, i: number, text?: string, n?: number, dt = 0) =>
  s.events.push({ t: s.t + dt, kind, x: (i % C) + 0.5, y: Math.floor(i / C) + 0.5, text, n });
function see(s: VacState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

function newStage(s: VacState) {
  const def = STAGES[s.stage], jt = s.jit[s.stage];
  const { R, D } = build(def, jt.flip, jt.pick);
  let mm = s.memo[s.stage];
  if (!mm) s.memo[s.stage] = mm = measure(def, R, D);
  s.R = R;
  s.D = { ...D, left: mm.lim, used: 0 };
  s.par = mm.par;
  s.lim = mm.lim;
  s.dust0 = dustLeft(D);
  s.phase = 'play';
  s.pt = 0;
  s.mv = null;
  s.idleT = s.t;
  s.face = 'up';
  s.starOk = [false, false, false];
  s.cleanT.fill(-9999);
  s.dogFx = D.dogs.map(() => ({ t: -9999, dir: 'up' as Dir, moved: false }));
  s.wet = 0;
  // 판의 새것은 판 카드 셋째 줄에 바로 보인다 (알림 띠 대기열에는 넣지 않는다)
  if (def.key) s.seen.add(def.key);
}

function endStage(s: VacState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    s.starOk = [true, s.D.used <= s.par, s.D.fish];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + Math.max(0, s.D.left) * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', s.D.pos, s.won ? '집 청소 끝! 🏠' : '청소 끝!');
  } else {
    s.hearts--;
    ev(s, 'fail', s.D.pos, why);
  }
}

const stuck = (R: Room, D: Dyn) => DIRS.every((d) => !slide(R, cloneDyn(D), d).changed);

/** 밀기: 같은 함수로 결과를 먼저 계산해 두고, 청소기가 칸에 닿을 때마다 그 칸의 일을 진짜 상태에 적용한다 */
function push(s: VacState, dir: Dir) {
  const D2 = cloneDyn(s.D), m = slide(s.R, D2, dir);
  s.face = dir;
  if (!m.changed) {
    // 제자리 쿵 — 밀기는 안 쓴다
    s.bumpT = s.t;
    s.bumpDir = dir;
    if (m.end === 'dog') {
      const dg = s.D.dogs.indexOf(nb(s.D.pos, dir));
      if (dg >= 0) s.dogFx[dg] = { t: s.t, dir, moved: false };
      ev(s, 'grr', nb(s.D.pos, dir), '끄응… (못 비켜요)');
    } else ev(s, 'nomove', s.D.pos, '쿵!');
    return;
  }
  s.D.used++;
  s.D.left--;
  s.firstMove = true;
  s.mv = { m, D2, k: 0, prog: 0 };
  s.wet = 0;
  if (m.steps.length >= 3) ev(s, 'go', s.D.pos, '위이잉~');
}

const stepLen = (st: Step | undefined) => (st && st.hop ? 2 : 1);
function advance(s: VacState) {
  const mv = s.mv!;
  mv.prog += SPEED;
  while (mv.k < mv.m.steps.length && mv.prog >= stepLen(mv.m.steps[mv.k])) {
    const st2 = mv.m.steps[mv.k], before = s.D.dust[st2.at];
    mv.prog -= stepLen(st2);
    enter(s.R, s.D, st2.at);
    s.D.pos = st2.at;
    if (st2.got) {
      s.cleanT[st2.at] = s.t;
      if (before === 2) ev(s, 'hair', st2.at, '한 번 더!');
      else ev(s, 'dust', st2.at);
    }
    if (st2.wet) (s.wet = 1), ev(s, 'milk', st2.at, '미끄덩~');
    if (st2.fish) (s.fishT = s.t), ev(s, 'fish', st2.at, '냠! 🐟'), see(s, 'fish', '🐟 생선 과자를 주우면 보너스 ★');
    if (st2.chg) ev(s, 'chg', st2.at, '밀기 +2 ⚡');
    if (st2.trash) ev(s, 'trash', st2.at, '먼지통 비움!');
    if (st2.full && !mv.m.steps.slice(0, mv.k).some((q) => q.full)) ev(s, 'full', st2.at, '먼지통 꽉 찼어요!');
    if (st2.hop) ev(s, 'hop', st2.at, '폴짝!');
    mv.k++;
  }
  if (mv.k < mv.m.steps.length) return;
  // 도착: 멈춘 까닭에 따라
  const m = mv.m;
  if (m.push) {
    s.D.dogs[m.push.dog] = m.push.to;
    s.dogFx[m.push.dog] = { t: s.t, dir: m.dir, moved: true };
    ev(s, 'push', m.push.to, '멍?!');
  } else if (m.end === 'dog') {
    const dg = s.D.dogs.indexOf(nb(s.D.pos, m.dir));
    if (dg >= 0) s.dogFx[dg] = { t: s.t, dir: m.dir, moved: false };
    ev(s, 'grr', s.D.pos, '끄응…');
  } else if (m.end === 'sock') ev(s, 'sock', s.D.pos, '끼익! 🧦');
  else if (m.end === 'wall') {
    s.bumpT = s.t;
    s.bumpDir = m.dir;
    s.bumps++;
    ev(s, 'bump', s.D.pos, '쿵!');
    if (s.bumps === 1 || s.bumps % 4 === 0) ev(s, 'hmph', s.D.pos, '흥.', 0, 30);
  }
  if (m.cleaned > 0) ev(s, 'sum', s.D.pos, `먼지 +${m.cleaned}`, m.cleaned);
  s.D = mv.D2;
  s.mv = null;
  s.idleT = s.t;
  if (clean(s.D)) return endStage(s, true, '');
  if (s.D.left <= 0) return endStage(s, false, '밀기를 다 썼어요');
  if (stuck(s.R, s.D)) return endStage(s, false, '꼼짝 못 해요!');
}

const NAME = '고양이 청소기';
export const robovac: GameDef<VacState> = {
  id: 'robovac',
  name: NAME,
  genes: ['pushbox', 'territory', 'swipe'],
  twist: '한 번 밀면 로봇 청소기가 벽이나 가구에 닿을 때까지 쭉 미끄러지며 지나간 칸의 먼지를 쓸어 담는다 — 네 방향 모두 "여기까지 가서 먼지 몇 개"가 늘 보여서, 근엄한 고양이를 태운 한붓그리기가 된다',
  rules: ['밀면 청소기가 멈출 때까지 쭉 가요. 지나간 칸은 깨끗해져요.', '먼지를 모두 치우면 통과! 화살표 끝 = 멈출 자리, 숫자 = 치울 먼지.'],
  controls: 'swipe',
  hint: '쓱 밀기(스와이프) / 화살표 키',
  aspect: A,
  art: {
    concept: '거실 디오라마 — 고양이를 태운 로봇 청소기',
    mood: '오후 햇살이 창으로 비스듬히 드는 아늑한 거실. 나무결 마루와 러그 위에 먼지가 반짝이고, 청소기가 지나간 자리는 반질반질 빛난다. 위에 탄 회색 고양이는 근엄하고, 쥐구멍의 생쥐와 소파 옆 강아지가 구경한다.',
    palette: { bg: '#2a1c14', ink: '#fff7ea', muted: '#d8c2a4', accent: '#ffcf5a', hot: '#ff7a5c', soft: '#f3e3c7' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const jit = STAGES.map(() => ({ flip: rng() < 0.5, pick: Math.floor(rng() * 6) }));
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, jit, memo: STAGES.map(() => null),
      R: null as unknown as Room, D: null as unknown as Dyn, par: 0, lim: 0, dust0: 0,
      mv: null, face: 'up', idleT: 0, firstMove: false,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', again: false, won: false, dead: false,
      seen: new Set<string>(), newsQ: [], news: null, events: [],
      cleanT: new Int32Array(NC), bumpT: -9999, bumpDir: 'up', bumps: 0, dogFx: [], wet: 0, fishT: -9999, hissT: -9999,
    } as VacState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
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
    if (s.mv) return advance(s);
    if (inp.move && s.D.left > 0) push(s, inp.move);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0 };
const THINK = 24;
const plans = new WeakMap<object, { keys: string[]; path: Dir[]; i: number }>();

/** 봇: 멈출 때마다 너비 우선으로 끝까지 내다보고(생선 과자까지 가장 적은 밀기) 그 길을 따라 민다 */
export const robovacSmart: Bot<VacState> = {
  name: '청소 박사',
  act(s) {
    if (s.phase !== 'play' || s.mv || s.t - s.idleT < THINK || s.D.left <= 0) return NO;
    const k = keyOf(s.D) + '#' + s.stage;
    let p = plans.get(s);
    if (!p || p.keys[p.i] !== k) {
      let path = solve(s.R, s.D, true) ?? solve(s.R, s.D, false);
      if (!path || !path.length) {
        // 못 끝내는 판: 가장 많이 치우는 쪽
        let bd: Dir = 'up', bv = -1;
        for (const d of DIRS) {
          const m = slide(s.R, cloneDyn(s.D), d);
          const v = m.changed ? m.cleaned * 10 + m.steps.length : -1;
          if (v > bv) (bv = v), (bd = d);
        }
        path = [bd];
      }
      const keys: string[] = [];
      const D = cloneDyn(s.D);
      for (const d of path) keys.push(keyOf(D) + '#' + s.stage), slide(s.R, D, d);
      plans.set(s, (p = { keys, path, i: 0 }));
    }
    return { tap: false, dir: 0, move: p.path[p.i++] };
  },
};

const dumbMem = new WeakMap<object, number>();
/** 봇: 아무 쪽으로, 아무 때나 민다 */
export const robovacRandom: Bot<VacState> = {
  name: '아무 쪽으로 쓱',
  act(s, rng) {
    if (s.phase !== 'play' || s.mv) return NO;
    const next = dumbMem.get(s) ?? s.t + 20 + Math.floor(rng() * 50);
    if (s.t < next) return (dumbMem.set(s, next), NO);
    dumbMem.set(s, s.t + 20 + Math.floor(rng() * 60));
    return { tap: false, dir: 0, move: DIRS[Math.floor(rng() * 4)] };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
/** 화면 배치 (가로 0~1, 세로 0~A): 앞에서 비스듬히 내려다본 거실 — 뒤가 좁고 앞이 넓다 */
const SB = 0.86, SF = 1.0, CW = 0.13, CH = 0.102, FY0 = 0.31, HUDH = 0.085, BAND = 1.168;
const scl = (gy: number) => SB + (SF - SB) * (gy / RW);
const PXg = (gx: number, gy: number) => 0.5 + (gx - C / 2) * CW * scl(gy);
const PYg = (gy: number) => FY0 + CH * (SB * gy + ((SF - SB) * gy * gy) / (2 * RW));
const FY1 = PYg(RW);
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const RUG = [
  ['#c8553d', '#f2d0a4', '#8f3b2b'],
  ['#3d7a8c', '#f4e3c3', '#2a5866'],
  ['#d99a2b', '#fff1cf', '#9c6a14'],
  ['#7a5aa6', '#f1e2ff', '#523a78'],
];
const BOOK = ['#d9534f', '#f0ad4e', '#5bc0de', '#5cb85c', '#8e6cc1', '#f7f1e3', '#3a6ea5', '#e57fa5'];
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
const PREV = new WeakMap<object, { key: string; res: Move[] }>();

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** 고양이 (청소기 위·소파 위). mood: 0 근엄 · 1 달리는 중(눈 가늘게) · 2 납작(><) · 3 냠(^^) · 4 하품 · 5 깜짝 */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, squish: number, sdx: number, sdy: number, t: number) {
  const k = u * 0.37;
  ctx.save();
  ctx.translate(x + sdx * u * 0.32 * squish, y + sdy * u * 0.18 * squish);
  ctx.rotate(sdx * 0.25 * squish);
  ctx.scale(1 + 0.45 * squish, 1 - 0.52 * squish);
  if (mood === 1) ctx.rotate(-sdx * 0.08);
  // 꼬리
  ctx.strokeStyle = '#7d838c';
  ctx.lineWidth = k * 0.24;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(k * 0.75, -k * 0.25);
  ctx.quadraticCurveTo(k * 1.35, -k * 0.1 + Math.sin(t * 0.08) * k * 0.15, k * 1.05, -k * 0.75 + Math.sin(t * 0.08) * k * 0.2);
  ctx.stroke();
  // 몸통
  const g = ctx.createLinearGradient(0, -k * 1.2, 0, 0);
  g.addColorStop(0, '#b3b9c2');
  g.addColorStop(1, '#868c95');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.55, k * 0.98, k * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,64,72,.5)';
  ctx.lineWidth = Math.max(1, k * 0.06);
  for (const sx of [-0.55, -0.2, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(sx * k, -k * 1.05);
    ctx.quadraticCurveTo(sx * k * 1.1, -k * 0.75, sx * k * 0.95, -k * 0.55);
    ctx.stroke();
  }
  ctx.fillStyle = '#f4f4f2';
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.42, k * 0.42, k * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * k * 0.28, -k * 0.08, k * 0.2, k * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 머리
  const hy = -k * 1.32, hr = k * 0.62;
  for (const sx of [-1, 1]) {
    const back = mood === 1 ? 0.5 : mood === 5 ? -0.15 : 0;
    ctx.save();
    ctx.translate(sx * hr * 0.62, hy - hr * 0.62);
    ctx.rotate(sx * (0.25 + back));
    ctx.fillStyle = '#9aa0a9';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.32, hr * 0.15);
    ctx.lineTo(0, -hr * 0.55);
    ctx.lineTo(hr * 0.32, hr * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2b0b8';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.17, hr * 0.08);
    ctx.lineTo(0, -hr * 0.34);
    ctx.lineTo(hr * 0.17, hr * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const hg = ctx.createRadialGradient(-hr * 0.3, hy - hr * 0.35, hr * 0.1, 0, hy, hr * 1.1);
  hg.addColorStop(0, '#c7ccd3');
  hg.addColorStop(1, '#8b919a');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, hy, hr * 1.08, hr * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  // 이마 줄무늬
  ctx.strokeStyle = 'rgba(60,64,72,.6)';
  ctx.lineWidth = Math.max(1, k * 0.07);
  for (const sx of [-0.22, 0, 0.22]) {
    ctx.beginPath();
    ctx.moveTo(sx * hr, hy - hr * 0.85);
    ctx.lineTo(sx * hr * 0.8, hy - hr * 0.5);
    ctx.stroke();
  }
  // 주둥이
  ctx.fillStyle = '#f4f4f2';
  ctx.beginPath();
  ctx.ellipse(-hr * 0.2, hy + hr * 0.35, hr * 0.3, hr * 0.24, 0, 0, Math.PI * 2);
  ctx.ellipse(hr * 0.2, hy + hr * 0.35, hr * 0.3, hr * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e88a98';
  ctx.beginPath();
  ctx.moveTo(-hr * 0.1, hy + hr * 0.16);
  ctx.lineTo(hr * 0.1, hy + hr * 0.16);
  ctx.lineTo(0, hy + hr * 0.27);
  ctx.closePath();
  ctx.fill();
  // 눈
  const ex = hr * 0.42, ey = hy - hr * 0.05, er = hr * 0.2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = Math.max(1.2, k * 0.1);
  if (mood === 2) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * ex - sx * er, ey - er);
      ctx.lineTo(sx * ex + sx * er * 0.6, ey);
      ctx.lineTo(sx * ex - sx * er, ey + er);
      ctx.stroke();
    }
  } else if (mood === 3 || mood === 4) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      if (mood === 3) ctx.arc(sx * ex, ey + er * 0.4, er, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(sx * ex, ey - er * 0.3, er, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else if (mood === 5) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(sx * ex, ey, er * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d1d1d';
      ctx.beginPath();
      ctx.arc(sx * ex, ey, er * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 근엄: 반쯤 감긴 호박색 눈 + 처진 눈꺼풀 + 안쪽으로 기운 줄
    const open = mood === 1 ? 0.35 : 0.62;
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx * ex - er * 1.4, ey - er * (open - 0.5) * 2 - er * 0.1, er * 2.8, er * 2);
      ctx.clip();
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.ellipse(sx * ex, ey, er * 1.15, er * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d1d1d';
      ctx.beginPath();
      ctx.ellipse(sx * ex, ey + er * 0.1, er * 0.28, er * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(sx * ex - sx * er * 1.25, ey - er * (open - 0.5) * 2 - er * 0.35 - er * 0.25);
      ctx.lineTo(sx * ex + sx * er * 1.2, ey - er * (open - 0.5) * 2 - er * 0.1 + er * 0.2);
      ctx.stroke();
    }
  }
  // 입
  ctx.lineWidth = Math.max(1, k * 0.07);
  if (mood === 4) {
    ctx.fillStyle = '#7a2a35';
    ctx.beginPath();
    ctx.ellipse(0, hy + hr * 0.5, hr * 0.26, hr * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef8fa0';
    ctx.beginPath();
    ctx.ellipse(0, hy + hr * 0.66, hr * 0.15, hr * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 2 || mood === 5) {
    ctx.beginPath();
    ctx.ellipse(0, hy + hr * 0.45, hr * 0.1, hr * 0.13, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-hr * 0.2, hy + hr * 0.38);
    ctx.quadraticCurveTo(-hr * 0.1, hy + hr * 0.46, 0, hy + hr * 0.3);
    ctx.quadraticCurveTo(hr * 0.1, hy + hr * 0.46, hr * 0.2, hy + hr * 0.38);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1;
  for (const sx of [-1, 1])
    for (let q = 0; q < 3; q++) {
      ctx.beginPath();
      ctx.moveTo(sx * hr * 0.4, hy + hr * 0.35 + q * hr * 0.08);
      ctx.lineTo(sx * hr * 1.35, hy + hr * 0.2 + q * hr * 0.2);
      ctx.stroke();
    }
  ctx.restore();
}

/** 로봇 청소기 (원판). 위에 고양이 */
function drawRobot(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: VacState, t: number, hopZ: number, catOn: boolean) {
  const r = u * 0.43, ry = r * 0.6, hgt = u * 0.13, moving = !!s.mv;
  ctx.fillStyle = 'rgba(40,20,8,.3)';
  ctx.beginPath();
  ctx.ellipse(x + u * 0.05, y + u * 0.04, r * 1.08, ry * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  const yy = y - hopZ;
  // 옆면
  const sg = ctx.createLinearGradient(x - r, 0, x + r, 0);
  sg.addColorStop(0, '#2a2e35');
  sg.addColorStop(0.5, '#4d545e');
  sg.addColorStop(1, '#23272d');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(x, yy, r, ry, 0, 0, Math.PI);
  ctx.lineTo(x - r, yy - hgt);
  ctx.ellipse(x, yy - hgt, r, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  // 범퍼 띠
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = Math.max(1, u * 0.02);
  ctx.beginPath();
  ctx.ellipse(x, yy - hgt * 0.45, r * 0.995, ry, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  // 윗면
  const tg = ctx.createRadialGradient(x - r * 0.35, yy - hgt - ry * 0.4, r * 0.1, x, yy - hgt, r * 1.05);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(0.6, '#e4e8ed');
  tg.addColorStop(1, '#b9c0c9');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(x, yy - hgt, r, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,50,60,.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, yy - hgt, r * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();
  // 불빛
  const led = moving ? '#56f0ff' : s.D.left <= 2 ? '#ffb347' : '#6dff8a';
  ctx.save();
  ctx.shadowColor = led;
  ctx.shadowBlur = u * 0.12;
  ctx.fillStyle = led;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.62, yy - hgt - ry * 0.05, u * 0.035, u * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 솔 (움직일 때 뱅글뱅글)
  if (moving)
    for (const sx of [-1, 1]) {
      const bx = x + sx * r * 0.82, by = yy + ry * 0.55;
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 1.2;
      for (let q = 0; q < 3; q++) {
        const a = t * 0.9 * sx + (q * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a) * u * 0.11, by + Math.sin(a) * u * 0.06);
        ctx.stroke();
      }
    }
  if (moving) {
    const mx = -DX[s.face], my = -DY[s.face];
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = Math.max(1.5, u * 0.03);
    ctx.lineCap = 'round';
    for (let q = -1; q <= 1; q++) {
      const ox = x + (my !== 0 ? q * r * 0.6 : 0) + mx * r * 1.05, oy = yy - hgt * 0.5 + (mx !== 0 ? q * ry * 0.6 : 0) + my * ry * 1.05;
      const len = u * (0.35 + 0.15 * Math.sin(t * 0.7 + q));
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + mx * len, oy + my * len * 0.75);
      ctx.stroke();
    }
  }
  if (s.wet && moving) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let q = 0; q < 3; q++) {
      ctx.beginPath();
      ctx.arc(x - r * 0.5 + q * r * 0.5, yy + ry * 0.8 + ((t * 2 + q * 5) % 10) * 0.5, u * 0.025, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (!catOn) return;
  // 고양이: 근엄 · 달림 · 납작 · 냠
  const bump = s.t - s.bumpT, sq = bump >= 0 && bump < 42 ? Math.max(0, 1 - Math.max(0, bump - 14) / 28) ** 1.3 * (bump < 4 ? bump / 4 : 1) : 0;
  const dx = DX[s.bumpDir], dy = DY[s.bumpDir];
  let mood = moving ? 1 : 0;
  if (sq > 0.25) mood = 2;
  if (s.t - s.fishT < 45) mood = 3;
  if (s.phase === 'result' && !s.ok) mood = 2;
  const dogAwake = s.dogFx.some((f) => s.t - f.t < 30);
  if (dogAwake && !moving) mood = 5;
  drawCat(ctx, x, yy - hgt - ry * 0.15, u, mood, sq, dx, dy, t);
  if (sq > 0.3)
    for (let q = 0; q < 3; q++) {
      const a = t * 0.2 + (q * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      star(ctx, x + dx * u * 0.3 + Math.cos(a) * u * 0.28, yy - hgt - u * 0.55 + dy * u * 0.1 + Math.sin(a) * u * 0.08, u * 0.07);
      ctx.fill();
    }
}

/** 강아지. pose 0 쿨쿨 · 1 깜짝(앉음) · 2 달림 · 3 꽈당 */
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, pose: number, face: number, t: number) {
  const k = u * 0.38;
  ctx.fillStyle = 'rgba(40,20,8,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + k * 0.1, k * 1.25, k * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  if (pose === 3) ctx.rotate(0.9 + Math.sin(t * 0.5) * 0.05);
  const body = '#ecc792', dark = '#a8693c';
  if (pose === 0) {
    // 동그랗게 말려 잔다
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -k * 0.35, k * 1.1, k * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,90,40,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e8505b';
    ctx.beginPath();
    ctx.ellipse(-k * 0.28, -k * 0.42, k * 0.1, k * 0.3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,100,50,.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(k * 0.15, -k * 0.35, k * 0.45, 0.5, Math.PI * 1.6);
    ctx.stroke();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-k * 0.65, -k * 0.42, k * 0.48, k * 0.4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(-k * 0.45, -k * 0.62, k * 0.18, k * 0.34, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = Math.max(1, k * 0.08);
    ctx.beginPath();
    ctx.arc(-k * 0.72, -k * 0.45, k * 0.1, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.arc(-k * 1.08, -k * 0.38, k * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 앉음 / 달림 / 넘어짐
    const run = pose === 2 ? Math.sin(t * 0.8) : 0;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -k * 0.55, k * 0.75, k * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade('#ecc792', -0.1);
    for (const lx of [-0.4, 0.35]) {
      ctx.beginPath();
      ctx.ellipse(lx * k + run * k * 0.15 * (lx > 0 ? 1 : -1), -k * 0.08, k * 0.16, k * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e8505b';
    ctx.beginPath();
    ctx.ellipse(-k * 0.35, -k * 0.82, k * 0.32, k * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd25a';
    ctx.beginPath();
    ctx.arc(-k * 0.45, -k * 0.72, k * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-k * 0.55, -k * 1.1, k * 0.5, k * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,90,40,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(-k * 0.2, -k * 1.15, k * 0.17, k * 0.36, 0.3 + run * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-k * 0.68, -k * 1.18, k * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.arc(-k * 0.7, -k * 1.17, pose === 3 ? k * 0.04 : k * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-k * 1.02, -k * 1.0, k * 0.09, 0, Math.PI * 2);
    ctx.fill();
    if (pose !== 3) {
      ctx.fillStyle = '#ff7a8a';
      ctx.beginPath();
      ctx.ellipse(-k * 0.9, -k * 0.8 + run * k * 0.05, k * 0.08, k * 0.14, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = body;
    ctx.lineWidth = k * 0.18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(k * 0.6, -k * 0.7);
    ctx.lineTo(k * 0.95, -k * 1.05 + Math.sin(t * 0.9) * k * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: VacState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, R = s.R, D = s.D;
  const X = (x: number) => x * w, Y = (y: number) => y * w, U = (r: number) => r * w;
  const SX = (gx: number, gy: number) => X(PXg(gx, gy)), SY = (gy: number) => Y(PYg(gy));
  const cu = (gy: number) => U(CW * scl(gy));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, U(sz))}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), Math.max(Y(HUDH) + 42, y), text, col, size);
  };
  const quad = (pts: number[][]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.closePath();
  };
  const cellQuad = (gx0: number, gy0: number, gx1: number, gy1: number) =>
    quad([[SX(gx0, gy0), SY(gy0)], [SX(gx1, gy0), SY(gy0)], [SX(gx1, gy1), SY(gy1)], [SX(gx0, gy1), SY(gy1)]]);
  /** 바닥 위 원 (원근으로 납작) */
  const gEllipse = (gx: number, gy: number, rx: number, ryy: number) => {
    ctx.beginPath();
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * Math.PI * 2, px = gx + Math.cos(a) * rx, py = gy + Math.sin(a) * ryy;
      if (k) ctx.lineTo(SX(px, py), SY(py));
      else ctx.moveTo(SX(px, py), SY(py));
    }
    ctx.closePath();
  };
  /** 상자: 바닥 사각형(gx0..gx1, gy0..gy1)을 높이 z0..z1(칸 너비 단위)로 세운다 */
  const box = (gx0: number, gy0: number, gx1: number, gy1: number, z0: number, z1: number, col: string, topCol?: string) => {
    const P = (gx: number, gy: number, z: number) => [SX(gx, gy), SY(gy) - z * cu(gy)];
    const mid = (gx0 + gx1) / 2;
    ctx.fillStyle = shade(col, -0.28);
    if (mid < C / 2 - 0.05) quad([P(gx1, gy0, z0), P(gx1, gy1, z0), P(gx1, gy1, z1), P(gx1, gy0, z1)]), ctx.fill();
    else if (mid > C / 2 + 0.05) quad([P(gx0, gy0, z0), P(gx0, gy1, z0), P(gx0, gy1, z1), P(gx0, gy0, z1)]), ctx.fill();
    ctx.fillStyle = col;
    quad([P(gx0, gy1, z0), P(gx1, gy1, z0), P(gx1, gy1, z1), P(gx0, gy1, z1)]);
    ctx.fill();
    ctx.fillStyle = topCol ?? shade(col, 0.22);
    quad([P(gx0, gy0, z1), P(gx1, gy0, z1), P(gx1, gy1, z1), P(gx0, gy1, z1)]);
    ctx.fill();
  };
  const P3 = (gx: number, gy: number, z: number) => [SX(gx, gy), SY(gy) - z * cu(gy)];

  ctx.save();
  fx.begin(ctx);
  // ── 바깥 (따뜻한 어둠) ──
  {
    const g = ctx.createRadialGradient(w / 2, Y(0.6), U(0.1), w / 2, Y(0.6), U(0.95));
    g.addColorStop(0, '#4a3324');
    g.addColorStop(1, '#1f140d');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, h + 20);
  }
  const bl = [SX(0, 0), SY(0)], br = [SX(C, 0), SY(0)], fl = [SX(0, RW), SY(RW)], fr = [SX(C, RW), SY(RW)];
  const wallTop = Y(HUDH + 0.022);
  // ── 디오라마 받침 (앞면 두께) ──
  {
    const th0 = U(0.034);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(w / 2, fl[1] + th0 + U(0.012), U(0.5), U(0.03), 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(0, fl[1], 0, fl[1] + th0);
    g.addColorStop(0, '#7a4a2a');
    g.addColorStop(1, '#4e2e1a');
    ctx.fillStyle = g;
    quad([[fl[0] - U(0.012), fl[1]], [fr[0] + U(0.012), fr[1]], [fr[0] + U(0.012), fr[1] + th0], [fl[0] - U(0.012), fl[1] + th0]]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,170,.25)';
    ctx.fillRect(fl[0], fl[1] + 1, fr[0] - fl[0], 1.5);
  }
  // ── 뒷벽: 벽지 · 걸레받이 · 창문 · 액자 ──
  {
    const g = ctx.createLinearGradient(0, wallTop, 0, bl[1]);
    g.addColorStop(0, '#efd9b6');
    g.addColorStop(1, '#f7e8cc');
    ctx.fillStyle = g;
    ctx.fillRect(bl[0], wallTop, br[0] - bl[0], bl[1] - wallTop);
    ctx.fillStyle = 'rgba(214,170,120,.25)';
    for (let k = 0; k < 22; k++) {
      const x = bl[0] + ((br[0] - bl[0]) * (k + 0.5)) / 22;
      ctx.fillRect(x - U(0.004), wallTop, U(0.008), bl[1] - wallTop);
    }
    ctx.fillStyle = 'rgba(190,120,80,.18)';
    for (let k = 0; k < 11; k++)
      for (let q = 0; q < 4; q++) {
        const x = bl[0] + ((br[0] - bl[0]) * (k + (q % 2) * 0.5 + 0.25)) / 11, y = wallTop + U(0.03 + q * 0.045);
        if (y > bl[1] - U(0.04)) continue;
        ctx.beginPath();
        ctx.arc(x, y, U(0.005), 0, Math.PI * 2);
        ctx.fill();
      }
    // 걸레받이
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(bl[0], bl[1] - U(0.022), br[0] - bl[0], U(0.022));
    ctx.fillStyle = 'rgba(120,80,40,.25)';
    ctx.fillRect(bl[0], bl[1] - U(0.022), br[0] - bl[0], U(0.004));
    // 창문 (오른쪽)
    const wx0 = X(0.6), wx1 = X(0.82), wy0 = wallTop + U(0.03), wy1 = bl[1] - U(0.07);
    const sky = ctx.createLinearGradient(0, wy0, 0, wy1);
    sky.addColorStop(0, '#8fd0ff');
    sky.addColorStop(1, '#ffe7b8');
    ctx.fillStyle = sky;
    ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 2; k++) {
      const cx = wx0 + ((t * 0.08 + k * 60) % ((wx1 - wx0) + 40)) - 20, cy = wy0 + U(0.03 + k * 0.035);
      ctx.beginPath();
      ctx.arc(cx, cy, U(0.012), 0, Math.PI * 2);
      ctx.arc(cx + U(0.014), cy - U(0.004), U(0.014), 0, Math.PI * 2);
      ctx.arc(cx + U(0.03), cy, U(0.011), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = U(0.01);
    ctx.strokeRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    ctx.beginPath();
    ctx.moveTo((wx0 + wx1) / 2, wy0);
    ctx.lineTo((wx0 + wx1) / 2, wy1);
    ctx.moveTo(wx0, (wy0 + wy1) / 2);
    ctx.lineTo(wx1, (wy0 + wy1) / 2);
    ctx.stroke();
    ctx.fillStyle = '#f3e1c4';
    ctx.fillRect(wx0 - U(0.012), wy1, wx1 - wx0 + U(0.024), U(0.012));
    // 창틀의 작은 새: 청소기가 쿵 하면 퍼드덕
    {
      const fl2 = s.t - s.bumpT < 40 ? Math.sin(((s.t - s.bumpT) / 40) * Math.PI) : 0, bx = wx1 - U(0.035), by = wy1 - U(0.012) - fl2 * U(0.04) + Math.abs(Math.sin(t * 0.05)) * U(0.003);
      ctx.fillStyle = '#ff9a5a';
      ctx.beginPath();
      ctx.ellipse(bx, by, U(0.014), U(0.011), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx - U(0.011), by - U(0.008), U(0.008), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3a2a';
      ctx.beginPath();
      ctx.arc(bx - U(0.013), by - U(0.009), U(0.0022), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd25a';
      ctx.beginPath();
      ctx.moveTo(bx - U(0.019), by - U(0.008));
      ctx.lineTo(bx - U(0.026), by - U(0.005));
      ctx.lineTo(bx - U(0.019), by - U(0.004));
      ctx.fill();
      if (fl2 > 0.1) {
        ctx.fillStyle = '#e07a3a';
        ctx.beginPath();
        ctx.ellipse(bx + U(0.004), by - U(0.01), U(0.012), U(0.005), -0.8 + Math.sin(t) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 액자 (생선 그림)
    const px0 = X(0.2), py0 = wallTop + U(0.04);
    ctx.fillStyle = '#a0683c';
    ctx.fillRect(px0, py0, U(0.11), U(0.08));
    ctx.fillStyle = '#d9f0f7';
    ctx.fillRect(px0 + U(0.008), py0 + U(0.008), U(0.094), U(0.064));
    ctx.fillStyle = '#ff9a5a';
    ctx.beginPath();
    ctx.ellipse(px0 + U(0.052), py0 + U(0.04), U(0.024), U(0.013), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px0 + U(0.074), py0 + U(0.04));
    ctx.lineTo(px0 + U(0.09), py0 + U(0.028));
    ctx.lineTo(px0 + U(0.09), py0 + U(0.052));
    ctx.fill();
    // 시계
    const ckx = X(0.43), cky = wallTop + U(0.055), ckr = U(0.026);
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.arc(ckx, cky, ckr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5236';
    ctx.lineWidth = U(0.005);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ckx, cky);
    ctx.lineTo(ckx + Math.cos(t * 0.004) * ckr * 0.55, cky + Math.sin(t * 0.004) * ckr * 0.55);
    ctx.moveTo(ckx, cky);
    ctx.lineTo(ckx + Math.cos(t * 0.05) * ckr * 0.8, cky + Math.sin(t * 0.05) * ckr * 0.8);
    ctx.stroke();
  }
  // 쥐구멍 (뒷벽 걸레받이, 가구가 없는 칸 앞) — 생쥐가 빼꼼, 청소기가 달리면 쏙
  {
    let mc = -1;
    for (const c of [1, 2, 4, 5, 3, 0, 6]) if (R.kind[c] === FLOOR) (mc = c), (mc = c);
    const mx = mc >= 0 ? SX(mc + 0.5, 0) : X(0.5), my = bl[1];
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath();
    ctx.moveTo(mx - U(0.02), my);
    ctx.lineTo(mx - U(0.02), my - U(0.012));
    ctx.arc(mx, my - U(0.012), U(0.02), Math.PI, 0);
    ctx.lineTo(mx + U(0.02), my);
    ctx.closePath();
    ctx.fill();
    const near = s.mv ? 1 : 0, peek = near ? 0 : Math.min(1, Math.max(0, ((t % 400) - 40) / 30)) * (t % 400 < 330 ? 1 : 0);
    if (peek > 0) {
      const hx = mx + U(0.004), hy = my - U(0.008) + (1 - peek) * U(0.02);
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx - U(0.03), my - U(0.05), U(0.06), U(0.05));
      ctx.clip();
      ctx.fillStyle = '#b8b2ad';
      ctx.beginPath();
      ctx.arc(hx - U(0.011), hy - U(0.012), U(0.007), 0, Math.PI * 2);
      ctx.arc(hx + U(0.011), hy - U(0.012), U(0.007), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx, hy, U(0.013), U(0.011), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb3c0';
      ctx.beginPath();
      ctx.arc(hx, hy + U(0.006), U(0.0035), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(hx - U(0.005), hy - U(0.002), U(0.0022), 0, Math.PI * 2);
      ctx.arc(hx + U(0.005), hy - U(0.002), U(0.0022), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mx - U(0.005), my - U(0.012), U(0.0025), 0, Math.PI * 2);
      ctx.arc(mx + U(0.005), my - U(0.012), U(0.0025), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 옆벽 (잘라 낸 디오라마 상자) ──
  for (const sd of [-1, 1]) {
    const b = sd < 0 ? bl : br, f = sd < 0 ? fl : fr, ow = U(0.03) * sd;
    const g = ctx.createLinearGradient(b[0], 0, f[0], 0);
    g.addColorStop(0, '#e2c69e');
    g.addColorStop(1, '#cfae84');
    ctx.fillStyle = g;
    quad([[b[0], wallTop], [b[0], b[1]], [f[0], f[1]], [f[0], f[1] - U(0.05)]]);
    ctx.fill();
    ctx.fillStyle = '#8a5a36';
    quad([[b[0], wallTop], [b[0] + ow, wallTop - U(0.006)], [f[0] + ow, f[1] - U(0.055)], [f[0], f[1] - U(0.05)]]);
    ctx.fill();
    ctx.fillStyle = '#6a4228';
    quad([[f[0], f[1] - U(0.05)], [f[0] + ow, f[1] - U(0.055)], [f[0] + ow, f[1] + U(0.034)], [f[0], f[1] + U(0.034)]]);
    ctx.fill();
  }
  // ── 마루 (원근 판자) ──
  {
    ctx.save();
    quad([bl, br, fr, fl]);
    ctx.clip();
    ctx.fillStyle = '#c38a55';
    ctx.fillRect(0, bl[1] - 2, w, fl[1] - bl[1] + 4);
    const NPL = 14;
    for (let p = 0; p < NPL; p++) {
      const g0 = (p * C) / NPL, g1 = ((p + 1) * C) / NPL;
      let y0 = 0;
      let seg = 0;
      while (y0 < RW) {
        const len = 2.2 + hsh(p * 13 + seg * 7) * 2.6, y1 = Math.min(RW, y0 + (seg === 0 ? len * (0.3 + 0.7 * hsh(p * 3)) : len));
        const v = hsh(p * 31 + seg * 17);
        ctx.fillStyle = `hsl(${27 + v * 6}, ${46 + v * 10}%, ${52 + v * 9}%)`;
        cellQuad(g0 + 0.01, y0 + 0.01, g1 - 0.01, y1 - 0.01);
        ctx.fill();
        // 나무결
        ctx.strokeStyle = 'rgba(110,60,25,.16)';
        ctx.lineWidth = 1;
        for (let q = 0; q < 2; q++) {
          const gx = g0 + (g1 - g0) * (0.3 + q * 0.4);
          ctx.beginPath();
          ctx.moveTo(SX(gx, y0 + 0.1), SY(y0 + 0.1));
          ctx.bezierCurveTo(SX(gx + 0.05, y0 + (y1 - y0) * 0.3), SY(y0 + (y1 - y0) * 0.3), SX(gx - 0.05, y0 + (y1 - y0) * 0.6), SY(y0 + (y1 - y0) * 0.6), SX(gx, y1 - 0.1), SY(y1 - 0.1));
          ctx.stroke();
        }
        y0 = y1;
        seg++;
      }
    }
    // 러그 (판마다 색)
    const rc = RUG[s.stage % RUG.length], rx0 = 1.0, rx1 = 6.0, ry0 = 2.0, ry1 = 6.0;
    ctx.fillStyle = 'rgba(40,20,8,.18)';
    cellQuad(rx0 - 0.05, ry0 + 0.05, rx1 + 0.05, ry1 + 0.12);
    ctx.fill();
    ctx.fillStyle = rc[0];
    cellQuad(rx0, ry0, rx1, ry1);
    ctx.fill();
    ctx.strokeStyle = rc[1];
    ctx.lineWidth = U(0.006);
    cellQuad(rx0 + 0.18, ry0 + 0.18, rx1 - 0.18, ry1 - 0.18);
    ctx.stroke();
    ctx.fillStyle = rc[2];
    for (let k = 0; k < 4; k++) {
      const cx = rx0 + 0.9 + k * 1.07, cy = (ry0 + ry1) / 2;
      ctx.beginPath();
      ctx.moveTo(SX(cx, cy - 0.5), SY(cy - 0.5));
      ctx.lineTo(SX(cx + 0.35, cy), SY(cy));
      ctx.lineTo(SX(cx, cy + 0.5), SY(cy + 0.5));
      ctx.lineTo(SX(cx - 0.35, cy), SY(cy));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = rc[1];
    ctx.lineWidth = 1;
    for (let k = 0; k <= 30; k++) {
      const gx = rx0 + ((rx1 - rx0) * k) / 30;
      for (const [gy, d] of [[ry0, -1], [ry1, 1]] as [number, number][]) {
        ctx.beginPath();
        ctx.moveTo(SX(gx, gy), SY(gy));
        ctx.lineTo(SX(gx, gy + d * 0.12), SY(gy + d * 0.12));
        ctx.stroke();
      }
    }
    // 칸 이음 (흐릿하게 — 어디서 멈출지 읽히게)
    ctx.strokeStyle = 'rgba(70,35,10,.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < C; c++) ctx.moveTo(SX(c, 0), SY(0)), ctx.lineTo(SX(c, RW), SY(RW));
    for (let r = 1; r < RW; r++) ctx.moveTo(SX(0, r), SY(r)), ctx.lineTo(SX(C, r), SY(r));
    ctx.stroke();
    // 먼지 칸은 칙칙, 치운 칸은 반질반질
    for (let i = 0; i < NC; i++) {
      const c = i % C, r = Math.floor(i / C);
      if (R.kind[i] !== FLOOR) continue;
      if (D.dust[i] > 0) {
        ctx.fillStyle = 'rgba(95,80,65,.2)';
        cellQuad(c, r, c + 1, r + 1);
        ctx.fill();
      } else if (s.cleanT[i] > -9999) {
        // 치운 칸: 반질반질 (막 치운 칸은 더 환하게 + 반짝)
        const age = t - s.cleanT[i];
        ctx.fillStyle = `rgba(255,246,220,${0.14 + 0.3 * Math.max(0, 1 - age / 45)})`;
        cellQuad(c + 0.02, r + 0.02, c + 0.98, r + 0.98);
        ctx.fill();
        const sg = ctx.createLinearGradient(SX(c, r), SY(r), SX(c + 1, r + 1), SY(r + 1));
        sg.addColorStop(0.35, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,.2)');
        sg.addColorStop(0.65, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        cellQuad(c + 0.02, r + 0.02, c + 0.98, r + 0.98);
        ctx.fill();
        const tw = age < 60 ? 1 - age / 60 : Math.max(0, Math.sin(t * 0.05 + i * 2.3) - 0.85) * 4;
        if (tw > 0.02) {
          ctx.fillStyle = `rgba(255,255,255,${tw})`;
          star(ctx, SX(c + 0.3 + 0.4 * hsh(i * 3), r + 0.35), SY(r + 0.35), cu(r) * 0.08 * (0.6 + tw * 0.6));
          ctx.fill();
        }
      }
    }
    // 창문 햇살
    const lg = ctx.createLinearGradient(X(0.75), bl[1], X(0.35), fl[1]);
    lg.addColorStop(0, 'rgba(255,240,200,.28)');
    lg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = lg;
    quad([[X(0.6), bl[1]], [X(0.82), bl[1]], [X(0.62), Y(PYg(5.5))], [X(0.3), Y(PYg(5.5))]]);
    ctx.fill();
    // 바닥 가장자리 그늘
    const eg = ctx.createLinearGradient(0, bl[1], 0, bl[1] + U(0.05));
    eg.addColorStop(0, 'rgba(60,30,10,.3)');
    eg.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, bl[1], w, U(0.05));
    ctx.restore();
  }
  // ── 바닥에 놓인 것: 그림자 · 우유 · 충전 칸 · 비우는 자리 · 양말 · 먼지 · 생선 과자 ──
  for (let i = 0; i < NC; i++) {
    const c = i % C, r = Math.floor(i / C);
    if (R.kind[i] === BLOCK && R.glyph[i] !== 'W') {
      ctx.fillStyle = 'rgba(50,25,8,.22)';
      cellQuad(c - 0.1, r + 0.2, c + 0.95, r + 1.08);
      ctx.fill();
    }
  }
  for (let i = 0; i < NC; i++) {
    const c = i % C, r = Math.floor(i / C), cx = c + 0.5, cy = r + 0.5, u = cu(cy);
    if (R.milk[i]) {
      ctx.fillStyle = '#fbfbf7';
      gEllipse(cx, cy + 0.05, 0.38, 0.3);
      ctx.fill();
      gEllipse(cx + 0.2, cy + 0.22, 0.16, 0.12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      gEllipse(cx - 0.1, cy - 0.04, 0.12, 0.06);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,190,200,.6)';
      ctx.lineWidth = 1;
      gEllipse(cx, cy + 0.05, 0.38, 0.3);
      ctx.stroke();
      // 넘어진 컵
      const gx = SX(cx - 0.28, cy - 0.28), gy = SY(cy - 0.28);
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(-0.4);
      ctx.fillStyle = 'rgba(220,240,255,.85)';
      ctx.fillRect(-u * 0.1, -u * 0.07, u * 0.22, u * 0.14);
      ctx.strokeStyle = 'rgba(120,150,170,.8)';
      ctx.strokeRect(-u * 0.1, -u * 0.07, u * 0.22, u * 0.14);
      ctx.restore();
    }
    const ci = R.chg.indexOf(i);
    if (ci >= 0) {
      const used = (D.chg >> ci) & 1;
      ctx.fillStyle = used ? '#5a5f66' : '#2f3a36';
      cellQuad(c + 0.12, r + 0.15, c + 0.88, r + 0.88);
      ctx.fill();
      ctx.strokeStyle = used ? '#80868c' : `rgba(110,255,150,${0.6 + 0.3 * Math.sin(t * 0.12)})`;
      ctx.lineWidth = U(0.006);
      ctx.stroke();
      ctx.save();
      if (!used) (ctx.shadowColor = '#6dff8a'), (ctx.shadowBlur = u * 0.25);
      ctx.fillStyle = used ? '#9aa0a6' : '#7dff9c';
      const bx = SX(cx, cy), by = SY(cy), q = u * 0.2;
      ctx.beginPath();
      ctx.moveTo(bx + q * 0.2, by - q * 0.9);
      ctx.lineTo(bx - q * 0.5, by + q * 0.1);
      ctx.lineTo(bx - q * 0.02, by + q * 0.1);
      ctx.lineTo(bx - q * 0.25, by + q * 0.9);
      ctx.lineTo(bx + q * 0.5, by - q * 0.15);
      ctx.lineTo(bx + q * 0.02, by - q * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (R.trash[i]) {
      ctx.fillStyle = '#6b7f8c';
      cellQuad(c + 0.1, r + 0.12, c + 0.9, r + 0.9);
      ctx.fill();
      ctx.strokeStyle = '#d6e4ec';
      ctx.lineWidth = U(0.005);
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      // 작은 쓰레기통
      const bx = SX(cx, cy - 0.1), by = SY(cy - 0.1);
      ctx.fillStyle = '#9fb3bf';
      ctx.beginPath();
      ctx.moveTo(bx - u * 0.17, by - u * 0.32);
      ctx.lineTo(bx + u * 0.17, by - u * 0.32);
      ctx.lineTo(bx + u * 0.13, by + u * 0.05);
      ctx.lineTo(bx - u * 0.13, by + u * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c8d6de';
      ctx.fillRect(bx - u * 0.2, by - u * 0.37, u * 0.4, u * 0.06);
      ctx.strokeStyle = 'rgba(60,80,90,.6)';
      ctx.lineWidth = 1;
      for (const q of [-0.07, 0, 0.07]) {
        ctx.beginPath();
        ctx.moveTo(bx + q * u, by - u * 0.26);
        ctx.lineTo(bx + q * u * 0.8, by);
        ctx.stroke();
      }
    }
    if (R.sock[i]) {
      const bx = SX(cx, cy), by = SY(cy);
      ctx.strokeStyle = 'rgba(255,110,110,.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      gEllipse(cx, cy + 0.04, 0.4, 0.36);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(1.5, 1.5);
      ctx.rotate(-0.35);
      ctx.fillStyle = 'rgba(40,20,8,.2)';
      ctx.fillRect(-u * 0.24, -u * 0.04, u * 0.48, u * 0.16);
      ctx.fillStyle = '#fbf6ee';
      ctx.beginPath();
      ctx.roundRect(-u * 0.26, -u * 0.12, u * 0.36, u * 0.17, u * 0.06);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(u * 0.0, -u * 0.12, u * 0.16, u * 0.3, u * 0.08);
      ctx.fill();
      ctx.fillStyle = '#e8505b';
      for (const q of [-0.2, -0.12]) ctx.fillRect(q * u, -u * 0.12, u * 0.04, u * 0.17);
      ctx.fillRect(0, u * 0.05, u * 0.16, u * 0.04);
      ctx.fillStyle = '#e8505b';
      ctx.beginPath();
      ctx.arc(u * 0.08, u * 0.15, u * 0.07, 0, Math.PI);
      ctx.fill();
      ctx.restore();
    }
    if (D.dust[i] > 0) {
      const bx = SX(cx, cy + 0.04), by = SY(cy + 0.04);
      if (D.dust[i] >= 2) {
        // 털 뭉치
        ctx.fillStyle = 'rgba(40,20,8,.25)';
        ctx.beginPath();
        ctx.ellipse(bx + u * 0.03, by + u * 0.08, u * 0.24, u * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        const fg = ctx.createRadialGradient(bx - u * 0.06, by - u * 0.1, u * 0.02, bx, by - u * 0.04, u * 0.24);
        fg.addColorStop(0, '#f2c79a');
        fg.addColorStop(1, '#b97a46');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(bx, by - u * 0.05, u * 0.21, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(110,60,25,.7)';
        ctx.lineWidth = 1;
        for (let q = 0; q < 5; q++) {
          const a = q * 1.3 + i;
          ctx.beginPath();
          ctx.arc(bx + Math.cos(a) * u * 0.05, by - u * 0.05 + Math.sin(a) * u * 0.04, u * (0.08 + q * 0.025), a, a + 2.2);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(240,200,150,.9)';
        for (let q = 0; q < 4; q++) {
          const a = q * 1.6 + i * 0.7;
          ctx.beginPath();
          ctx.moveTo(bx + Math.cos(a) * u * 0.18, by - u * 0.05 + Math.sin(a) * u * 0.15);
          ctx.quadraticCurveTo(bx + Math.cos(a) * u * 0.32, by - u * 0.05 + Math.sin(a + 0.4) * u * 0.25, bx + Math.cos(a + 0.3) * u * 0.34, by - u * 0.05 + Math.sin(a + 0.3) * u * 0.18);
          ctx.stroke();
        }
      } else {
        // 먼지 뭉치: 납작하고 보송한 회색 솜뭉치 (몽글몽글 원 여러 개) + 티끌
        const fz = (ox: number, oy: number, rr: number, seed: number) => {
          const px = SX(cx + ox, cy + oy), py = SY(cy + oy) - rr * 0.35;
          ctx.fillStyle = 'rgba(40,20,8,.22)';
          ctx.beginPath();
          ctx.ellipse(px + rr * 0.1, py + rr * 0.55, rr * 1.35, rr * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          const puffs = 6;
          for (let q = 0; q < puffs; q++) {
            const a = (q / puffs) * Math.PI * 2 + seed, qx = px + Math.cos(a) * rr * 0.62, qy = py + Math.sin(a) * rr * 0.3, qr = rr * (0.5 + 0.18 * hsh(seed * 5 + q));
            const dg = ctx.createRadialGradient(qx - qr * 0.3, qy - qr * 0.4, qr * 0.1, qx, qy, qr);
            dg.addColorStop(0, '#d9d2c8');
            dg.addColorStop(1, '#8a8178');
            ctx.fillStyle = dg;
            ctx.beginPath();
            ctx.arc(qx, qy, qr, 0, Math.PI * 2);
            ctx.fill();
          }
          const cg = ctx.createRadialGradient(px - rr * 0.25, py - rr * 0.35, rr * 0.05, px, py - rr * 0.1, rr * 0.7);
          cg.addColorStop(0, '#ece6de');
          cg.addColorStop(1, '#a39a90');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(px, py - rr * 0.12, rr * 0.62, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(235,228,220,.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let q = 0; q < 3; q++) {
            const a = -2.4 + q * 0.9 + seed, l = rr * 0.95;
            ctx.moveTo(px + Math.cos(a) * rr * 0.55, py + Math.sin(a) * rr * 0.4);
            ctx.quadraticCurveTo(px + Math.cos(a) * l, py + Math.sin(a) * l * 0.7 - rr * 0.15, px + Math.cos(a + 0.35) * l * 1.08, py + Math.sin(a + 0.35) * l * 0.75);
          }
          ctx.stroke();
          ctx.fillStyle = 'rgba(70,58,48,.6)';
          for (let q = 0; q < 3; q++) {
            ctx.beginPath();
            ctx.arc(px + (hsh(seed + q * 5) - 0.5) * rr * 1.2, py + (hsh(seed * 2 + q) - 0.2) * rr * 0.5, Math.max(0.8, rr * 0.08), 0, Math.PI * 2);
            ctx.fill();
          }
        };
        fz((hsh(i * 7) - 0.5) * 0.16, (hsh(i * 11) - 0.5) * 0.1, u * 0.17, i);
        fz(0.27 * (hsh(i * 13) < 0.5 ? -1 : 1), 0.2, u * 0.085, i + 50);
        const tw = Math.sin(t * 0.09 + i * 1.7);
        if (tw > 0.55) {
          ctx.fillStyle = `rgba(255,255,255,${(tw - 0.55) * 2})`;
          star(ctx, SX(cx + (hsh(i) - 0.5) * 0.4, cy - 0.15), SY(cy - 0.15), u * 0.07);
          ctx.fill();
        }
      }
    }
    if (i === R.fishAt && !D.fish) {
      const bob = Math.sin(t * 0.1 + i) * u * 0.04, bx = SX(cx, cy), by = SY(cy) - u * 0.12 + bob;
      ctx.fillStyle = 'rgba(40,20,8,.22)';
      ctx.beginPath();
      ctx.ellipse(SX(cx, cy), SY(cy) + u * 0.04, u * 0.2, u * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = '#ffd27a';
      ctx.shadowBlur = u * 0.25;
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.ellipse(bx, by, u * 0.17, u * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.moveTo(bx + u * 0.13, by);
      ctx.lineTo(bx + u * 0.27, by - u * 0.1);
      ctx.lineTo(bx + u * 0.27, by + u * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c96a18';
      ctx.lineWidth = 1.2;
      for (const q of [-0.04, 0.03]) {
        ctx.beginPath();
        ctx.arc(bx + q * u, by, u * 0.07, -1, 1);
        ctx.stroke();
      }
      ctx.fillStyle = '#3a2210';
      ctx.beginPath();
      ctx.arc(bx - u * 0.1, by - u * 0.02, u * 0.022, 0, Math.PI * 2);
      ctx.fill();
      if ((t + i * 9) % 50 < 25) {
        ctx.fillStyle = '#fff6c8';
        star(ctx, bx + u * 0.18, by - u * 0.15, u * 0.06);
        ctx.fill();
      }
    }
  }

  // ── 세워진 것들 (뒤에서 앞으로): 가구 · 쿠션 · 강아지 · 청소기 ──
  const items: { y: number; f: () => void }[] = [];
  const done = new Uint8Array(NC);
  for (let i = 0; i < NC; i++) {
    if (done[i] || R.kind[i] === FLOOR) continue;
    const c0 = i % C, r = Math.floor(i / C), gl = R.glyph[i];
    let c1 = c0;
    if (gl !== 'W' && gl !== 'o' && gl !== 'P' && gl !== 'L' && gl !== 'A')
      while (c1 + 1 < C && R.glyph[r * C + c1 + 1] === gl && !done[r * C + c1 + 1]) c1++;
    for (let c = c0; c <= c1; c++) done[r * C + c] = 1;
    const x0 = c0, x1 = c1 + 1, n = c1 - c0 + 1;
    items.push({
      y: r + 0.5,
      f: () => {
        if (gl === 'B') {
          box(x0 + 0.04, r + 0.1, x1 - 0.04, r + 0.6, 0, 1.75, '#8b5a36', '#a87148');
          const gy = r + 0.6;
          for (let sh = 0; sh < 3; sh++) {
            const z0 = 0.08 + sh * 0.56;
            let gx = x0 + 0.12;
            let q = 0;
            while (gx < x1 - 0.16) {
              const bw = 0.07 + hsh(i * 13 + sh * 7 + q) * 0.07, bh = 0.32 + hsh(i * 5 + sh * 3 + q * 2) * 0.16;
              ctx.fillStyle = BOOK[Math.floor(hsh(i + sh * 11 + q * 3) * BOOK.length)];
              quad([P3(gx, gy, z0), P3(gx + bw, gy, z0), P3(gx + bw, gy, z0 + bh), P3(gx, gy, z0 + bh)]);
              ctx.fill();
              gx += bw + 0.012;
              q++;
            }
            ctx.fillStyle = '#c08a5a';
            quad([P3(x0 + 0.04, gy, z0 + 0.5), P3(x1 - 0.04, gy, z0 + 0.5), P3(x1 - 0.04, gy, z0 + 0.56), P3(x0 + 0.04, gy, z0 + 0.56)]);
            ctx.fill();
          }
        } else if (gl === 'A') {
          const col = '#e07a5f';
          box(x0 + 0.1, r + 0.14, x1 - 0.1, r + 0.4, 0, 0.72, shade(col, -0.12));
          box(x0 + 0.1, r + 0.26, x1 - 0.1, r + 0.9, 0, 0.3, col);
          const a2 = P3(x0 + 0.28, r + 0.42, 0.3), b2 = P3(x1 - 0.28, r + 0.86, 0.3);
          ctx.fillStyle = shade(col, 0.2);
          ctx.beginPath();
          ctx.roundRect(a2[0], a2[1], b2[0] - a2[0], b2[1] - a2[1], U(0.01));
          ctx.fill();
          box(x0 + 0.06, r + 0.22, x0 + 0.26, r + 0.92, 0, 0.46, shade(col, -0.04));
          box(x1 - 0.26, r + 0.22, x1 - 0.06, r + 0.92, 0, 0.46, shade(col, -0.04));
          for (const lx of [x0 + 0.12, x1 - 0.18]) box(lx, r + 0.86, lx + 0.06, r + 0.92, -0.06, 0, '#5a3a22');
        } else if (gl === 'S') {
          const col = '#3f8f8c';
          box(x0 + 0.06, r + 0.08, x1 - 0.06, r + 0.36, 0, 0.82, shade(col, -0.12));
          box(x0 + 0.06, r + 0.2, x1 - 0.06, r + 0.92, 0, 0.32, col);
          for (let k = 0; k < n; k++) {
            ctx.fillStyle = shade(col, 0.18);
            const a = P3(x0 + 0.2 + k, r + 0.38, 0.32), b = P3(x0 + 0.92 + k - (k === n - 1 ? 0.12 : 0), r + 0.88, 0.32);
            ctx.beginPath();
            ctx.roundRect(a[0], a[1], b[0] - a[0], b[1] - a[1] + U(0.004), U(0.01));
            ctx.fill();
          }
          box(x0 + 0.04, r + 0.16, x0 + 0.2, r + 0.94, 0, 0.5, shade(col, -0.05));
          box(x1 - 0.2, r + 0.16, x1 - 0.04, r + 0.94, 0, 0.5, shade(col, -0.05));
          {
            const pc = P3(x0 + 0.42, r + 0.42, 0.5);
            ctx.fillStyle = '#ffcf5a';
            ctx.beginPath();
            ctx.roundRect(pc[0] - cu(r) * 0.14, pc[1] - cu(r) * 0.1, cu(r) * 0.28, cu(r) * 0.26, cu(r) * 0.06);
            ctx.fill();
          }
        } else if (gl === 'T') {
          for (const [lx, ly] of [[x0 + 0.14, r + 0.28], [x1 - 0.2, r + 0.28], [x0 + 0.14, r + 0.8], [x1 - 0.2, r + 0.8]]) box(lx, ly, lx + 0.06, ly + 0.06, 0, 0.36, '#6e4426');
          box(x0 + 0.08, r + 0.2, x1 - 0.08, r + 0.88, 0.36, 0.44, '#a86d3f', '#c99262');
          const m = P3(x0 + 0.35 + (n > 1 ? 0.6 : 0), r + 0.5, 0.44), uu = cu(r + 0.5);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(m[0] - uu * 0.07, m[1] - uu * 0.14, uu * 0.14, uu * 0.14, uu * 0.02);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, uu * 0.025);
          ctx.beginPath();
          ctx.arc(m[0] + uu * 0.08, m[1] - uu * 0.08, uu * 0.035, -1.4, 1.4);
          ctx.stroke();
          ctx.fillStyle = '#7a4a2a';
          ctx.beginPath();
          ctx.ellipse(m[0], m[1] - uu * 0.14, uu * 0.06, uu * 0.02, 0, 0, Math.PI * 2);
          ctx.fill();
          if ((t + i * 20) % 120 < 80) {
            ctx.strokeStyle = 'rgba(255,255,255,.5)';
            ctx.beginPath();
            ctx.moveTo(m[0], m[1] - uu * 0.18);
            ctx.quadraticCurveTo(m[0] + uu * 0.05, m[1] - uu * 0.26, m[0], m[1] - uu * 0.34 - Math.sin(t * 0.05) * uu * 0.03);
            ctx.stroke();
          }
          if (n > 1) {
            const b = P3(x0 + 0.45, r + 0.55, 0.44);
            ctx.fillStyle = '#5b8def';
            ctx.fillRect(b[0] - uu * 0.14, b[1] - uu * 0.06, uu * 0.28, uu * 0.06);
            ctx.fillStyle = '#f0ad4e';
            ctx.fillRect(b[0] - uu * 0.12, b[1] - uu * 0.11, uu * 0.24, uu * 0.05);
          }
        } else if (gl === 'P') {
          box(x0 + 0.26, r + 0.32, x1 - 0.26, r + 0.78, 0, 0.42, '#c8693f', '#8a4a2a');
          const base = P3(x0 + 0.5, r + 0.55, 0.42), uu = cu(r + 0.5);
          for (let k = 0; k < 7; k++) {
            const a = -Math.PI / 2 + (k - 3) * 0.42 + Math.sin(t * 0.03 + k + i) * 0.05, len = uu * (0.45 + 0.2 * hsh(i * 3 + k));
            ctx.fillStyle = k % 2 ? '#4f9a4a' : '#6cbf5c';
            ctx.save();
            ctx.translate(base[0], base[1]);
            ctx.rotate(a + Math.PI / 2);
            ctx.beginPath();
            ctx.ellipse(0, -len * 0.55, uu * 0.1, len * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else if (gl === 'V') {
          box(x0 + 0.04, r + 0.25, x1 - 0.04, r + 0.85, 0, 0.36, '#6b4a33');
          box(x0 + 0.14, r + 0.42, x1 - 0.14, r + 0.52, 0.36, 1.08, '#24262c', '#3a3d45');
          const a = P3(x0 + 0.2, r + 0.52, 0.42), b = P3(x1 - 0.2, r + 0.52, 1.02);
          const sg = ctx.createLinearGradient(0, b[1], 0, a[1]);
          sg.addColorStop(0, '#6fd3f5');
          sg.addColorStop(1, '#2a7fb8');
          ctx.fillStyle = sg;
          ctx.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]);
          // 화면 속 물고기 (고양이 TV)
          const fx0 = a[0] + ((t * 0.6) % (b[0] - a[0])), fy0 = (a[1] + b[1]) / 2 + Math.sin(t * 0.05) * (a[1] - b[1]) * 0.15;
          ctx.fillStyle = '#ffb347';
          ctx.beginPath();
          ctx.ellipse(fx0, fy0, U(0.01), U(0.006), 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (gl === 'L') {
          const bse = P3(x0 + 0.5, r + 0.55, 0), top = P3(x0 + 0.5, r + 0.55, 1.15), uu = cu(r + 0.5);
          ctx.fillStyle = '#4a3a30';
          ctx.beginPath();
          ctx.ellipse(bse[0], bse[1], uu * 0.16, uu * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#4a3a30';
          ctx.lineWidth = Math.max(1.5, uu * 0.04);
          ctx.beginPath();
          ctx.moveTo(bse[0], bse[1]);
          ctx.lineTo(top[0], top[1]);
          ctx.stroke();
          const gg = ctx.createRadialGradient(top[0], top[1], 0, top[0], top[1], uu * 0.9);
          gg.addColorStop(0, 'rgba(255,220,140,.4)');
          gg.addColorStop(1, 'rgba(255,220,140,0)');
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(top[0], top[1], uu * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffe3a3';
          ctx.beginPath();
          ctx.moveTo(top[0] - uu * 0.14, top[1] - uu * 0.22);
          ctx.lineTo(top[0] + uu * 0.14, top[1] - uu * 0.22);
          ctx.lineTo(top[0] + uu * 0.24, top[1] + uu * 0.06);
          ctx.lineTo(top[0] - uu * 0.24, top[1] + uu * 0.06);
          ctx.closePath();
          ctx.fill();
        } else if (gl === 'D') {
          box(x0 + 0.05, r + 0.22, x1 - 0.05, r + 0.8, 0, 0.85, '#9c6b45');
          const gy = r + 0.8;
          for (let k = 0; k < 3; k++) {
            const z = 0.08 + k * 0.26;
            ctx.strokeStyle = 'rgba(60,30,10,.5)';
            ctx.lineWidth = 1;
            quad([P3(x0 + 0.12, gy, z), P3(x1 - 0.12, gy, z), P3(x1 - 0.12, gy, z + 0.22), P3(x0 + 0.12, gy, z + 0.22)]);
            ctx.stroke();
            for (let q = 0; q < n; q++) {
              const kn = P3(x0 + 0.5 + q, gy, z + 0.11);
              ctx.fillStyle = '#ffd88a';
              ctx.beginPath();
              ctx.arc(kn[0], kn[1], Math.max(1.5, cu(gy) * 0.03), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          const v = P3(x0 + 0.35, r + 0.5, 0.85), uu = cu(r + 0.5);
          ctx.fillStyle = '#8fd0e8';
          ctx.beginPath();
          ctx.ellipse(v[0], v[1] - uu * 0.1, uu * 0.07, uu * 0.11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ff7aa2';
          ctx.beginPath();
          ctx.arc(v[0], v[1] - uu * 0.27, uu * 0.06, 0, Math.PI * 2);
          ctx.fill();
        } else if (gl === 'W') {
          // 칸막이 화단: 하얀 화분 상자에 잎이 무성 — 칸 하나를 꽉 막는다
          box(x0 + 0.08, r + 0.06, x1 - 0.08, r + 0.94, 0, 0.36, '#f4efe4', '#5a3d28');
          const gy = r + 0.94;
          ctx.fillStyle = 'rgba(120,150,170,.35)';
          quad([P3(x0 + 0.08, gy, 0.12), P3(x1 - 0.08, gy, 0.12), P3(x1 - 0.08, gy, 0.18), P3(x0 + 0.08, gy, 0.18)]);
          ctx.fill();
          for (let k = 0; k < 5; k++) {
            const lx = x0 + 0.22 + (k % 2) * 0.56, ly = r + 0.12 + k * 0.19, base = P3(lx, ly, 0.36), uu = cu(ly);
            for (let q = 0; q < 4; q++) {
              const a = -Math.PI / 2 + (q - 1.5) * 0.55 + Math.sin(t * 0.03 + k + q + i) * 0.06, len = uu * (0.32 + 0.14 * hsh(i * 5 + k * 3 + q));
              ctx.fillStyle = (q + k) % 2 ? '#4f9a4a' : '#73c463';
              ctx.save();
              ctx.translate(base[0], base[1]);
              ctx.rotate(a + Math.PI / 2);
              ctx.beginPath();
              ctx.ellipse(0, -len * 0.5, uu * 0.085, len * 0.5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
            if ((k + i) % 3 === 0) {
              ctx.fillStyle = '#ff8fb1';
              ctx.beginPath();
              ctx.arc(base[0], base[1] - uu * 0.36, uu * 0.05, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (gl === 'o') {
          box(x0 + 0.14, r + 0.24, x1 - 0.14, r + 0.86, 0, 0.2, '#e98aa3', '#f6b9c8');
          const m = P3(x0 + 0.5, r + 0.55, 0.2);
          ctx.fillStyle = '#c8607e';
          ctx.beginPath();
          ctx.arc(m[0], m[1], Math.max(1.5, cu(r) * 0.04), 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.setLineDash([3, 2]);
          ctx.lineWidth = 1;
          quad([P3(x0 + 0.2, r + 0.3, 0.2), P3(x1 - 0.2, r + 0.3, 0.2), P3(x1 - 0.2, r + 0.8, 0.2), P3(x0 + 0.2, r + 0.8, 0.2)]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else box(x0 + 0.1, r + 0.2, x1 - 0.1, r + 0.85, 0, 0.6, '#9c6b45');
      },
    });
  }
  // 강아지
  D.dogs.forEach((p, k) => {
    const f = s.dogFx[k] ?? { t: -9999, dir: 'up' as Dir, moved: false }, a = t - f.t;
    let gx = (p % C) + 0.5, gy = Math.floor(p / C) + 0.5, pose = 0;
    if (a < 12 && f.moved) (gx -= DX[f.dir] * (1 - a / 12)), (gy -= DY[f.dir] * (1 - a / 12));
    if (a < 28) pose = 1;
    else if (a < 72 && f.moved) {
      pose = 2;
      const rx = (D.pos % C) + 0.5, ry = Math.floor(D.pos / C) + 0.5, dd = Math.hypot(rx - gx, ry - gy) || 1, run = Math.sin(((a - 28) / 44) * Math.PI) * Math.min(0.6, dd * 0.4);
      gx += ((rx - gx) / dd) * run;
      gy += ((ry - gy) / dd) * run;
    } else if (a < 115 && f.moved) pose = 3;
    if (pose === 3 && (fx.memo['trip' + k] ?? -1) !== f.t) (fx.memo['trip' + k] = f.t), say(SX(gx, gy), SY(gy) - cu(gy) * 0.6, '꽈당!', '#ffe0b0', 14), fx.burst(SX(gx, gy), SY(gy), '#fff27a', 10, 2.4, 2);
    const face = (D.pos % C) + 0.5 < gx ? 1 : -1;
    items.push({
      y: gy + 0.01,
      f: () => {
        drawDog(ctx, SX(gx, gy + 0.15), SY(gy + 0.15), cu(gy), pose, face, t);
        if (pose === 0) {
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          font(0.034, 900);
          ctx.textAlign = 'center';
          const zz = (t * 0.5 + k * 30) % 60;
          ctx.globalAlpha = Math.sin((zz / 60) * Math.PI);
          ctx.fillText('z', SX(gx, gy) + cu(gy) * 0.1 + zz * 0.3, SY(gy) - cu(gy) * 0.35 - zz * 0.4);
          ctx.globalAlpha = 1;
        }
        if (pose === 3)
          for (let q = 0; q < 3; q++) {
            const aa = t * 0.15 + (q * Math.PI * 2) / 3;
            ctx.fillStyle = '#fff27a';
            star(ctx, SX(gx, gy) + Math.cos(aa) * cu(gy) * 0.3, SY(gy) - cu(gy) * 0.4 + Math.sin(aa) * cu(gy) * 0.1, cu(gy) * 0.06);
            ctx.fill();
          }
      },
    });
  });
  // 청소기 (미끄러지는 자리 · 폴짝)
  let rgx = (D.pos % C) + 0.5, rgy = Math.floor(D.pos / C) + 0.5, hopZ = 0;
  if (s.mv && s.mv.k < s.mv.m.steps.length) {
    const st = s.mv.m.steps[s.mv.k], L = stepLen(st), f = Math.min(1, s.mv.prog / L), tx = (st.at % C) + 0.5, ty = Math.floor(st.at / C) + 0.5;
    rgx += (tx - rgx) * f;
    rgy += (ty - rgy) * f;
    if (st.hop) hopZ = Math.sin(f * Math.PI) * 0.7;
  }
  // 다 치우면 고양이가 소파로 폴짝 → 하품
  let sofa: { gx: number; gy: number } | null = null;
  for (let i = 0; i < NC; i++) if (R.glyph[i] === 'S' || R.glyph[i] === 'A') sofa = sofa ?? { gx: (i % C) + 0.62, gy: Math.floor(i / C) + 0.55 };
  const catJump = s.phase === 'result' && s.ok && sofa ? Math.min(1, s.pt / 34) : 0;
  items.push({
    y: rgy + 0.02,
    f: () => {
      const u = cu(rgy);
      drawRobot(ctx, SX(rgx, rgy), SY(rgy + 0.08), u, s, t, hopZ * u, catJump === 0);
      if (R.cap) {
        // 먼지통 눈금
        const bx = SX(rgx, rgy), by = SY(rgy) - u * 1.18 - hopZ * u, n = R.cap, bw = u * 0.12, bh = u * 0.12;
        ctx.fillStyle = 'rgba(40,20,8,.75)';
        ctx.beginPath();
        ctx.roundRect(bx - (n * bw) / 2 - 3, by - 3, n * bw + 6, bh + 6, 4);
        ctx.fill();
        for (let k = 0; k < n; k++) {
          ctx.fillStyle = k < D.bin ? (D.bin >= n ? '#ff6b5a' : '#d9b48a') : 'rgba(255,255,255,.25)';
          ctx.fillRect(bx - (n * bw) / 2 + k * bw + 1, by, bw - 2, bh);
        }
      }
    },
  });
  if (catJump > 0 && sofa) {
    const sf = sofa;
    items.push({
      y: Math.max(rgy, sf.gy) + 0.05,
      f: () => {
        const u0 = cu(rgy), u1 = cu(sf.gy);
        const x0 = SX(rgx, rgy), y0 = SY(rgy + 0.08) - u0 * 0.2, x1 = SX(sf.gx, sf.gy), y1 = SY(sf.gy) - u1 * 0.32;
        const f = catJump, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * u0 * 1.2;
        const yawn = s.pt > 50 && s.pt < 140;
        drawCat(ctx, x, y, u0 + (u1 - u0) * f, f < 1 ? 5 : yawn ? 4 : 3, 0, 0, 0, t);
      },
    });
  }
  // ── 미리 보기: 네 방향 '여기까지 가요' + 치울 먼지 수 ──
  const preview = (pass: number) => {
    if (s.phase === 'play' && !s.mv && D.left > 0) {
      const key = `${s.stage}:${keyOf(D)}`;
      let c = PREV.get(s);
      if (!c || c.key !== key) PREV.set(s, (c = { key, res: DIRS.map((d) => slide(R, cloneDyn(D), d)) }));
      const first = s.stage === 0 && !s.firstMove;
      const pulse = first ? 0.5 + 0.5 * Math.sin(t * 0.15) : 0;
      const ox = rgx, oy = rgy;
      for (const m of c.res) {
        if (!m.changed) continue;
        const e = m.steps.length ? m.steps[m.steps.length - 1].at : D.pos;
        const ex = (e % C) + 0.5, ey = Math.floor(e / C) + 0.5;
        const dx = DX[m.dir], dy = DY[m.dir];
        const sx0 = SX(ox + dx * 0.42, oy + dy * 0.42), sy0 = SY(oy + dy * 0.42), sx1 = SX(ex, ey), sy1 = SY(ey);
        if (m.steps.length && pass === 0) {
          ctx.strokeStyle = 'rgba(40,20,8,.35)';
          ctx.lineWidth = U(0.014) + 2;
          ctx.setLineDash([U(0.018), U(0.012)]);
          ctx.beginPath();
          ctx.moveTo(sx0, sy0 + 1.5);
          ctx.lineTo(sx1, sy1 + 1.5);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${0.85 + pulse * 0.15})`;
          ctx.lineWidth = U(0.011);
          ctx.lineDashOffset = -t * 0.6;
          ctx.beginPath();
          ctx.moveTo(sx0, sy0);
          ctx.lineTo(sx1, sy1);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
          // 멈출 자리: 유령 고리
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          gEllipse(ex, ey + 0.05, 0.3, 0.3);
          ctx.stroke();
        }
        if (pass === 0) continue;
        if (m.steps.length) {
          const ang = Math.atan2(sy1 - sy0, sx1 - sx0), ah = U(0.026) * (1 + pulse * 0.3);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(sx1 + Math.cos(ang) * ah * 0.6, sy1 + Math.sin(ang) * ah * 0.6);
          ctx.lineTo(sx1 + Math.cos(ang + 2.5) * ah, sy1 + Math.sin(ang + 2.5) * ah);
          ctx.lineTo(sx1 + Math.cos(ang - 2.5) * ah, sy1 + Math.sin(ang - 2.5) * ah);
          ctx.closePath();
          ctx.fill();
        }
        // 꼬리표: 치울 먼지 수 (+ 생선·충전·강아지·양말·폴짝)
        const icons = (m.steps.some((q) => q.fish) ? '🐟' : '') + (m.steps.some((q) => q.chg) ? '⚡' : '') + (m.steps.some((q) => q.trash) ? '🗑️' : '') + (m.push ? '🐶' : '') + (m.end === 'sock' ? '🧦' : '') + (m.end === 'hop' ? '↷' : '');
        const label = `${m.cleaned}`;
        font(0.04, 900);
        const iw = icons ? ctx.measureText(icons).width + U(0.008) : 0, lw = ctx.measureText(label).width;
        const bw = lw + iw + U(0.05), bh = U(0.05);
        let bx = sx1 + dx * U(0.055), by = sy1 - cu(ey) * 0.55 + dy * U(0.03);
        if (m.dir === 'down') by = sy1 + U(0.01);
        bx = Math.max(bw / 2 + 2, Math.min(w - bw / 2 - 2, bx));
        ctx.fillStyle = m.cleaned > 0 ? 'rgba(255,207,90,.96)' : 'rgba(60,40,28,.82)';
        ctx.beginPath();
        ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,30,10,.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // 먼지 아이콘 (작은 솜털)
        const dx0 = bx - bw / 2 + U(0.02);
        ctx.fillStyle = m.cleaned > 0 ? '#8f877e' : '#a89a8a';
        ctx.beginPath();
        ctx.arc(dx0, by + U(0.004), U(0.009), 0, Math.PI * 2);
        ctx.arc(dx0 + U(0.008), by - U(0.004), U(0.008), 0, Math.PI * 2);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = m.cleaned > 0 ? '#3a2412' : '#f3e3c7';
        ctx.fillText(label, dx0 + U(0.017), by + 1);
        if (icons) {
          ctx.fillStyle = '#ffffff';
          ctx.fillText(icons, dx0 + U(0.017) + lw + U(0.006), by + 1);
        }
      }
    }
  };
  preview(0);
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  preview(1);

  // 창문 햇살 속 먼지 티끌
  for (let k = 0; k < 14; k++) {
    const a = (t * 0.003 + hsh(k) * 7) % 1, x = X(0.55 + 0.25 * hsh(k + 3) - a * 0.3), y = Y(0.33 + a * 0.5 + 0.05 * Math.sin(t * 0.01 + k));
    ctx.fillStyle = `rgba(255,245,210,${0.5 * Math.sin(a * Math.PI)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > s.t) continue;
    const x = SX(e.x, e.y), y = SY(e.y), u = cu(e.y);
    if (e.kind === 'go') fx.burst(x, y, '#e6ddd2', 10, 2.6, 2.2), say(x, y - u * 0.9, e.text!, '#e9fbff', 15), fx.kick(1.5);
    if (e.kind === 'dust') fx.burst(x, y - u * 0.05, '#bfb6ac', 7, 1.8, 2.2), fx.burst(x, y - u * 0.1, '#ffffff', 3, 1.2, 1.4);
    if (e.kind === 'hair') fx.burst(x, y, '#d9a06a', 14, 2.6, 2.4), say(x, y - u * 0.6, e.text!, '#ffd9b0', 13);
    if (e.kind === 'sum') fx.ring(x, y, '#ffcf5a', u * 0.9, 3), say(x, y - u * 1.25, e.text!, '#ffe08a', e.n! >= 5 ? 18 : 15);
    if (e.kind === 'bump') {
      const bx = x + DX[s.bumpDir] * u * 0.5, by = y - u * 0.15 + DY[s.bumpDir] * u * 0.35;
      fx.kick(5), fx.burst(bx, by, '#ffffff', 6, 2.2, 1.8), say(x + u * 0.5, y - u * 0.95, e.text!, '#ffffff', 15);
    }
    if (e.kind === 'nomove') fx.kick(2.5), say(x, y - u * 0.75, e.text!, '#ffe3cc', 13);
    if (e.kind === 'hmph') say(x + u * 0.5, y - u * 1.3, e.text!, '#e8ecf2', 15);
    if (e.kind === 'sock') fx.kick(3), fx.burst(x, y, '#ff8a8a', 10, 2.2, 2), say(x, y - u * 0.8, e.text!, '#ffd0d0', 15);
    if (e.kind === 'push') fx.kick(4), fx.burst(x, y - u * 0.2, '#ecc792', 14, 3, 2.4), fx.ring(x, y, '#ffffff', u * 0.8, 3), say(x, y - u * 0.9, e.text!, '#fff0c0', 17);
    if (e.kind === 'grr') say(x, y - u * 0.8, e.text!, '#ffe0c0', 13), fx.kick(2);
    if (e.kind === 'fish') fx.burst(x, y, '#ff9f43', 22, 3.6, 2.6), fx.ring(x, y, '#ffd27a', u * 1.1, 4), say(x, y - u * 1.0, e.text!, '#ffcf5a', 17);
    if (e.kind === 'chg') fx.burst(x, y, '#7dff9c', 24, 3.8, 2.6), fx.ring(x, y, '#7dff9c', u * 1.2, 5), fx.blink('#c8ffd8', 0.18), say(x, y - u * 1.0, e.text!, '#9dffb5', 18);
    if (e.kind === 'trash') fx.burst(x, y, '#9fb3bf', 20, 3.2, 2.4), say(x, y - u * 1.0, e.text!, '#d6ecf7', 15);
    if (e.kind === 'full') fx.kick(2), say(x, y - u * 1.0, e.text!, '#ffb3a8', 15);
    if (e.kind === 'milk') fx.burst(x, y, '#ffffff', 16, 3, 2.4), say(x, y - u * 0.8, e.text!, '#ffffff', 14);
    if (e.kind === 'hop') fx.ring(x, y, '#ffffff', u * 0.9, 4), fx.burst(x, y, '#ffffff', 12, 3, 2.2), say(x, y - u * 1.0, e.text!, '#e9fbff', 16);
    if (e.kind === 'clear') {
      fx.burst(w * 0.3, Y(0.6), '#ffcf5a', 40, 6, 3.2), fx.burst(w * 0.7, Y(0.6), '#7fd8d4', 40, 6, 3.2), fx.burst(w * 0.5, Y(0.75), '#ffffff', 40, 6, 3);
      fx.ring(w / 2, Y(0.68), '#ffcf5a', U(0.45), 7), fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  // 소파 위 하품
  if (s.phase === 'result' && s.ok && s.pt === 60) say(sofa ? SX(sofa.gx, sofa.gy) : SX(rgx, rgy), (sofa ? SY(sofa.gy) : SY(rgy)) - U(0.12), '하암~ 😌', '#fff3d6', 16);
  fx.memo.t = s.t;
  ctx.restore();

  drawHud(ctx, s, w, h, th, font);
}

function drawHud(ctx: CanvasRenderingContext2D, s: VacState, w: number, h: number, th: Theme, font: (sz: number, wgt?: number) => string) {
  const U = (r: number) => r * w, Y = (y: number) => y * w, X = (x: number) => x * w, D = s.D, def = STAGES[s.stage], fx = juice(s);
  // ═════════════ 위 띠 ═════════════
  const hb = U(HUDH);
  ctx.fillStyle = 'rgba(42,26,16,.92)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.046, 900);
  const ttl = `🧹 ${s.stage + 1}번째 방`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, U(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, U(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffcf5a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - U(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - U(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 (받침 아래)
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(FY1 + 0.07) + drop;
    ctx.fillStyle = 'rgba(42,26,16,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - U(0.026), tw2, U(0.052), U(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(58,36,22,.96)');
    g.addColorStop(1, 'rgba(34,21,13,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [U(0.03), U(0.03), 0, 0]);
    ctx.fill();
    // 밀기 남은 수: 발자국 (★ 선까지 쓰면 별)
    const r1 = Y(ty + 0.045);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff3e0';
    font(0.038, 900);
    ctx.fillText('밀기', X(0.03), r1);
    const total = D.used + Math.max(0, D.left), dx0 = X(0.135), avail = X(0.62), dstep = Math.min(U(0.05), avail / Math.max(1, total));
    for (let k = 0; k < total; k++) {
      const cx = dx0 + k * dstep + (k >= s.par ? U(0.014) : 0), used = k < D.used, extra = k >= s.lim;
      const rr = Math.min(U(0.017), dstep * 0.42);
      ctx.beginPath();
      ctx.arc(cx, r1, rr, 0, Math.PI * 2);
      if (used) {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = extra ? '#7dff9c' : k < s.par ? '#ffcf5a' : '#d9b98a';
        ctx.fill();
      }
    }
    if (s.par < total) {
      const lx = dx0 + s.par * dstep - dstep / 2 + U(0.007);
      ctx.strokeStyle = '#ffcf5a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, r1 - U(0.024));
      ctx.lineTo(lx, r1 + U(0.022));
      ctx.stroke();
      ctx.fillStyle = '#ffcf5a';
      font(0.03, 900);
      ctx.textAlign = 'center';
      ctx.fillText('★', lx, r1 - U(0.036));
    }
    ctx.textAlign = 'right';
    font(0.036, 800);
    ctx.fillStyle = D.left > 0 ? '#f3e3c7' : '#ffb3a8';
    ctx.fillText(`${Math.max(0, D.left)}번 남음`, X(0.97), r1);
    // 별 목표 셋
    const left = dustLeft(D), cleaned = s.dust0 - left;
    const okk = s.phase === 'result' && s.ok ? s.starOk : [left === 0, D.used <= s.par, D.fish];
    const bad = [s.phase === 'result' && !s.ok, D.used > s.par, false];
    const labels = [`먼지 ${cleaned}/${s.dust0}`, `밀기 ≤${s.par}`, '🐟 생선 과자'];
    const r2 = Y(ty + 0.125), cw2 = U(0.3);
    for (let k = 0; k < 3 && s.phase === 'play'; k++) {
      const cx1 = X(0.03) + k * (cw2 + U(0.017));
      ctx.fillStyle = okk[k] ? 'rgba(255,207,90,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - U(0.028), cw2, U(0.056), U(0.028));
      ctx.fill();
      ctx.strokeStyle = okk[k] ? '#ffcf5a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffcf5a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + U(0.03), r2 + U(0.002));
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#fff3e0';
      font(0.036, 800);
      ctx.textAlign = 'left';
      if (k === 2) ctx.fillStyle = okk[k] ? '#fff6dc' : '#ffffff';
      ctx.fillText(labels[k], cx1 + U(0.056), r2 + U(0.002), cw2 - U(0.064));
    }
    // 안내 한 줄
    let hint = def.hint;
    const first = s.stage === 0 && !s.firstMove && s.phase === 'play';
    if (first) hint = '👆 아무 쪽으로 쓱 밀어 보세요 — 화살표 끝까지 쭉!';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '온 집이 반짝반짝! 고양이가 만족했어요' : `★ ${s.got}개! 다음 방엔 새것이 나와요`) : '화살표 끝 = 멈출 자리 · 숫자 = 치울 먼지';
    else if (R_full(s)) hint = '먼지통이 꽉 찼어요 — 🗑️ 자리를 지나 비워요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.041 : 0.037, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.205), w - U(0.05));
    // 맨 아래: 남은 먼지 막대 (땅따먹기 — 반질반질해진 만큼)
    const r4 = Y(ty + 0.275), bw = U(0.86), bx = X(0.07);
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.beginPath();
    ctx.roundRect(bx, r4 - U(0.012), bw, U(0.024), U(0.012));
    ctx.fill();
    const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    pg.addColorStop(0, '#ffe8a8');
    pg.addColorStop(1, '#ffcf5a');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(bx, r4 - U(0.012), Math.max(U(0.024), (bw * cleaned) / Math.max(1, s.dust0)), U(0.024), U(0.012));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.03, 900);
    ctx.textAlign = 'right';
    ctx.fillText('✨', bx + bw + U(0.035), r4);
  }
  // 판 카드: 시작(뒷벽 위) · 청소 끝 · 실패(아래 띠 위)
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '집 청소 끝! 🏠' : '청소 끝!'), (sub = `밀기 ${D.used}번${s.starOk[1] ? ' ✓' : ` (≤${s.par} ✗)`} · 생선 과자 ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffcf5a');
      else (head = `윙… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 방 다시' : '끝 — 고양이가 낮잠 자러 가요'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T && D.used === 0) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}번째 방` : `${s.stage + 1}번째 방`;
      sub = `먼지 ${s.dust0}개 · 밀기 ${s.lim}번 · ★ ${s.par}번 이하`;
      nw = def.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = s.phase === 'result' ? Y(BAND + 0.115) : Y(nw ? 0.17 : 0.185), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(42,26,16,.93)';
      ctx.beginPath();
      ctx.roundRect(-U(nw ? 0.45 : 0.4), -U(0.055), U(nw ? 0.9 : 0.8), U(ch), U(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = U(0.056), x0 = -(hw + U(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -U(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + U(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -U(0.018));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, U(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - U(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -U(0.018), U(0.76));
      ctx.fillStyle = '#fff7ea';
      font(0.036, 800);
      ctx.fillText(sub, 0, U(0.03), U(0.76));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.037, 900);
        ctx.fillText(nw, 0, U(0.077), U(0.86));
      }
      ctx.restore();
    }
  }
}
const R_full = (s: VacState) => s.R.cap > 0 && s.D.bin >= s.R.cap && dustLeft(s.D) > 0;
