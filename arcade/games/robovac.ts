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
 *   → 8판 방 둘(문틈으로 건너가기 + 지금까지 나온 것 모두).
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
 *  가구(막힘): B 책장 · S 소파 · T 탁자 · P 화분 · A 안락의자 · V 텔레비전 · W 벽 · L 스탠드 · D 서랍장
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
    map: ['BB..PSS', 'ddddddd', 'd.....d', 'd..T..d', 'd.....d', 'd.....d', 'd.....d', 'R.ff.f.'],
    slack: 14,
  },
  {
    key: 'sock', news: '🧦 양말을 밟으면 그 자리에 딱 멈춰요', hint: '양말 = 중간에 멈추는 자리. 줄 한가운데를 노려요',
    map: ['RL..Pfd', 'd.....d', 'd.....d', 'd....fd', 'xdddddd', '......d', '..TT..d', '.SSTSSd'],
    slack: 9,
  },
  {
    key: 'hair', news: '🧶 털 뭉치는 두 번 지나가야 깨끗해요', hint: '털 뭉치는 갔다가 되돌아오면 깨끗',
    map: ['dP.Vffd', 'h.....h', 'h.....h', 'h...TAh', 'd...P.d', 'h.....h', 'd.....h', 'Rdddddh'],
    slack: 4,
  },
  {
    key: 'dog', news: '🐶 자는 강아지에 부딪히면 한 칸 밀려나요', hint: '강아지를 밀어 새 벽을 만들어요',
    map: ['BBRV.DD', 'ddddddd', 'L.d...d', '..dTT.d', '..d...d', '..d...d', 'SSgdddd', '......f'],
    slack: 3,
  },
  {
    key: 'charge', news: '🔋 충전 칸을 지나면 밀기 +2', hint: '밀기가 모자라요 — 충전 칸을 들러 가요',
    map: ['dP.BBdd', 'd.....d', 'd....fd', 'dA....d', 'd..T..d', 'ddddddR', 'd....fd', 'dcdddcd'],
    slack: 0, lim: 5,
  },
  {
    key: 'milk', news: '🥛 우유를 밟으면 다음 쿠션을 폴짝 넘어요', hint: '우유 → 미끄덩 → 쿠션을 폴짝, 한 칸 더',
    map: ['..BB.VD', 'ddddRdd', 'f...P.d', '....T.d', '....o.m', 'f.....d', '..o...o', 'ddddddd'],
    slack: 3,
  },
  {
    key: 'bin', news: '🗑️ 먼지통이 꽉 차면 비우는 자리를 지나요', hint: '먼지통 7칸 — 꽉 차면 🗑️을 지나 비워요',
    map: ['d.SS..V', 'dA.....', 't.....f', 'd....A.', 'd.....f', 'd......', 'ddddddR', 'ddddddd'],
    slack: 3, cap: 7,
  },
  {
    key: 'door', news: '🚪 방이 둘 — 문틈으로 건너가요', hint: '문틈과 줄을 맞춰야 건너가요',
    map: ['SSDWdRV', 'f.dWd.f', '..dWddd', '.TdWTTd', 'xddW..d', 'ddddddd', '...W.SS', '..fW...'],
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
    if (S.left <= 0) continue;
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
  ev(s, 'go', s.D.pos, m.steps.length >= 3 ? '위이잉~' : '윙');
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
      if (before === 2) ev(s, 'hair', st2.at, '한 번 더!'), see(s, 'hair1', '🧶 털 뭉치는 한 번 더 지나가야 해요');
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
