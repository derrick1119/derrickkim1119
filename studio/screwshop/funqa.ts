/**
 * FUN QA 측정기 (M0 기준선) — 봇 세 종류로 판별 한 번 도전을 돌려 지표를 뽑는다 → studio/screwshop/reports/funqa.json
 *   npx tsx studio/screwshop/funqa.ts [시드 수=12]
 * 봇: 장인(본 것만으로 몇 수 앞 탐색) · 버릇(맞는 색부터) · 아무 나사나 톡(처음 하는 사람 대역)
 *   · 막 누르기(뺄 수 있는 나사 아무거나 빠르게 — 오너 2026-11-14 "이거 그냥 막 누르면 되는 게임 아니야??")
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Bot, Input } from './core.ts';
import { mulberry32 } from './rng.ts';
import { STAGES, apply, cloneSim, freeM, jackEarly, logLate, paintStage, peek, poseOf, stuckM, viewOf, screwshop as g, screwshopHabit, screwshopRandom, screwshopSmart, startStage, starsOf, type Level, type ShopState, type Sim, type StageDef } from './game.ts';

export interface Try { ok: boolean; stars: number; sec: number; peak: number; best: number; shot: number; taps: number; /** 끝난 판(되짚기·F13용) */ s: ShopState }

/** k판을 한 번 도전(첫 결과가 나올 때까지) */
export function tryStage(bot: Bot<ShopState>, seed: number, k: number, maxSec = 600, hand = seed, hint = false): Try {
  const s = g.create(seed);
  if (k) startStage(s, k);
  if (hint) (s.sf = 3), (s.hint = true); // 💡 귀띔을 켠 판(✏️ S012): 손가락 = 장인 수 · 그 판 ★ 최대 2
  const rng = mulberry32(hand ^ 0x9e3779b9), t0 = s.t; // hand: 같은 판을 다른 손으로 (🧪 S003)
  while (s.phase !== 'result' && s.t - t0 < maxSec * 60) g.step(s, bot.act(s, rng));
  const ok = s.phase === 'result' && s.ok;
  return { ok, stars: ok ? starsOf(STAGES[k], s.S) : 0, sec: (s.t - t0) / 60, peak: s.S.peak, best: s.S.best, shot: s.S.shot, taps: s.S.taps, s };
}

const NO: Input = { tap: false, dir: 0, pointer: null };
/** 막 누르기: 생각 없이 뺄 수 있는(안 막힌) 나사 아무거나 톡 — 미리 보기·색·빈칸을 안 본다 */
export const screwshopMash: Bot<ShopState> = {
  name: '막 누르기',
  act(s, rng) {
    if (s.phase !== 'play' || s.down || s.t < s.cool || s.t - s.lastTap < 12) return NO;
    const L = s.L, f = freeM(L, s.S), list: number[] = [];
    for (let i = 0; i < L.N; i++) if ((f >> i) & 1) list.push(i);
    if (!list.length) return NO;
    const i = list[Math.floor(rng() * list.length)];
    return { tap: false, dir: 0, pointer: { x: L.px[i], y: L.py[i] / (g.aspect ?? 1.45) } };
  },
};

/**
 * 미리 보기 따라 하기 (🧪 M0.1 F4): 누르고 있을 때 화면에 보이는 것만으로 한 수 앞을 고른다 — 쏙/빈칸, 상자 닫힘, ⚠ 영영 가림, 새로 풀리는 나사, 🔨 쾅.
 * 본 적 있는 나사만. 동점이면 무작위. 이 봇이 ★3을 쉽게 따면 '미리 보기가 정답 안내'라는 뜻이다.
 */
export const screwshopPreview: Bot<ShopState> = {
  name: '미리 보기 따라 하기',
  act(s, rng) {
    if (s.phase !== 'play' || s.down || s.t < s.cool || s.t - s.lastTap < 24 || s.t - s.startT < 30) return NO;
    const V = viewOf(s), f = freeM(s.L, s.S) & s.known;
    let best = -1e9, pick: number[] = [];
    for (let i = 0; i < V.N; i++) {
      if (!((f >> i) & 1)) continue;
      const S2 = cloneSim(s.S), rec: { k: string }[] = [], free0 = freeM(V, s.S);
      apply(V, S2, i, rec as never);
      let v = S2.fail ? -1e6 : 0;
      v += rec.filter((e) => e.k === 'box').length * 10 - rec.filter((e) => e.k === 'slot').length * 12 + rec.filter((e) => e.k === 'done').length * 4;
      v -= stuckM(V, S2.gone) ? 60 : 0;
      const freed = freeM(V, S2) & ~free0 & ~S2.gone;
      for (let j = 0; j < V.N; j++) if ((freed >> j) & 1) v += 2;
      if (S2.n === V.N) v += 1000;
      if (v > best + 1e-9) (best = v), (pick = [i]);
      else if (Math.abs(v - best) < 1e-9) pick.push(i);
    }
    if (!pick.length) return NO;
    const i = pick[Math.floor(rng() * pick.length)];
    return { tap: false, dir: 0, pointer: { x: s.L.px[i], y: s.L.py[i] / (g.aspect ?? 1.45) } };
  },
};

const ready = (s: ShopState) => s.phase === 'play' && !s.down && s.t >= s.cool && s.t - s.lastTap >= 24 && s.t - s.startT >= 30;
const tapI = (s: ShopState, i: number): Input => ({ tap: false, dir: 0, pointer: { x: s.L.px[i], y: s.L.py[i] / (g.aspect ?? 1.45) } });
const knownFree = (s: ShopState) => {
  const f = freeM(s.L, s.S) & s.known, o: number[] = [];
  for (let i = 0; i < s.L.N; i++) if ((f >> i) & 1) o.push(i);
  return o;
};
/** 버릇 ② 위에서부터 (MILESTONES M1′): 뺄 수 있는 나사 중 가장 위 */
export const screwshopTop: Bot<ShopState> = {
  name: '버릇: 위에서부터',
  act(s) {
    if (!ready(s)) return NO;
    const o = knownFree(s);
    return o.length ? tapI(s, o.reduce((a, b) => (s.L.py[b] < s.L.py[a] ? b : a))) : NO;
  },
};
/** 버릇 ③ ✨ 최다: 빼면 새로 풀리는(✨) 나사가 가장 많은 것 — 같으면 맞는 색 */
export const screwshopReveal: Bot<ShopState> = {
  name: '버릇: ✨ 최다',
  act(s) {
    if (!ready(s)) return NO;
    const V = viewOf(s), free0 = freeM(V, s.S);
    let best = -1, bi = -1;
    for (const i of knownFree(s)) {
      const S2 = cloneSim(s.S);
      apply(V, S2, i);
      let v = 0;
      const nf = freeM(V, S2) & ~free0 & ~S2.gone;
      for (let j = 0; j < V.N; j++) if ((nf >> j) & 1) v += 10;
      if (s.S.box.includes(V.col[i])) v += 1;
      if (v > best) (best = v), (bi = i);
    }
    return bi >= 0 ? tapI(s, bi) : NO;
  },
};
/** 손가락 → 막 누르기 (🧪 F2 개정): 1판 손가락 첫 톡만 따르고 나머지는 막 누름 — 사람의 '막 누르기'에 가장 가깝다 */
export const screwshopFingerMash: Bot<ShopState> = {
  name: '손가락 → 막 누르기',
  act(s, rng) {
    const d = STAGES[s.stage];
    if (d.first !== undefined && s.S.taps === 0) return ready(s) ? tapI(s, d.first) : NO;
    return screwshopMash.act(s, rng);
  },
};

/** 처음 하는 사람 (M1′ 완료 기준 ④): 70%는 '맞는 색 먼저' 버릇, 30%는 뺄 수 있는 아무 나사 */
export const screwshopNewbie: Bot<ShopState> = {
  name: '처음 하는 사람',
  act(s, rng) {
    if (!ready(s)) return NO;
    if (rng() < 0.3) {
      const o = knownFree(s);
      return o.length ? tapI(s, o[Math.floor(rng() * o.length)]) : NO;
    }
    return screwshopHabit.act(s, rng);
  },
};

/**
 * 🧪 F13 되짚기 정확도 (S003 제안 · 📐 S004): 진 판에서 실패 카드가 짚은 톡에 PNR이 들었나.
 * PNR = 그 톡 전에는 (전지 탐색으로) 아직 깰 수 있었고, 그 톡 뒤로는 무엇을 해도 못 깨게 된 톡. 게임의 되짚기와 따로 센다.
 */
export function pnrHit(s: ShopState) {
  const L: Level = s.L, memo = new Map<string, boolean>();
  const win = (S: Sim): boolean => {
    if (S.fail) return false;
    if (S.n === L.N) return true;
    const key = `${S.gone}|${S.box}|${S.bn}|${S.qi}|${S.slots}|${S.key}|${L.tmr.some(Boolean) ? S.taps : 0}`, m = memo.get(key);
    if (m !== undefined) return m;
    const f = freeM(L, S);
    let ok = false;
    for (let i = 0; i < L.N && !ok; i++) if ((f >> i) & 1) { const S2 = cloneSim(S); apply(L, S2, i); ok = win(S2); }
    memo.set(key, ok);
    return ok;
  };
  let pnr = s.hist.length - 1;
  while (pnr >= 0 && !win(s.hist[pnr].S0)) pnr--;
  return !!s.blame && s.blame.t.includes(pnr);
}

export const BOTS = { smart: screwshopSmart, habit: screwshopHabit, top: screwshopTop, reveal: screwshopReveal, random: screwshopRandom, mash: screwshopMash, finger: screwshopFingerMash, preview: screwshopPreview };

type Ev = { k: string; p?: number; s?: number; pose?: number };
/** 꾹 미리 보기가 이 톡에 원인 c의 경고를 띄우나(🧪 S008 m1b warnFor와 같은 식) */
function warnOf(L: Level, d: StageDef, h: ShopState['hist'][number], c: string, past: ShopState['hist'] = []) {
  const p = peek(L, h.S0, h.s), r = p.rec as unknown as Ev[], S2 = p.S, pl = L.pl;
  const first = r.find((e) => e.k === 'box' || e.k === 'slot'), toSlot = first?.k === 'slot' || !!S2.fail;
  const chainSlot = r.some((e) => e.k === 'slot' && e.s !== h.s), cover = p.cover !== 0, stuck = stuckM(L, S2.gone) !== 0;
  const hit = (k: string, q?: number) => r.some((b) => b.k === k && b.p === q);
  const air = r.some((e) => e.k === 'hang' && pl[e.p!].ham && e.pose! >= 1 && !hit('bonk', e.p)) || r.some((e) => e.k === 'fall' && pl[e.p!].kind === 'spring' && pl[e.p!].tgt !== undefined && !hit('boing', e.p));
  const log = (r.some((e) => e.k === 'fall' && pl[e.p!].heavy) && !(d.H !== undefined ? r.filter((e) => e.k === 'box').length >= d.H : r.some((e) => e.k === 'crash'))) || logLate(L, past, p.rec); // ✏️ S013: '🪵 통나무가 먼저 떨어져 → 빈칸' 알약
  const wi = r.findIndex((e) => e.k === 'wind'), wind = wi >= 0 && (d.H !== undefined ? r : r.slice(wi)).some((e) => e.k === 'slot'); // 🔑 알약 '빈칸 M'(한 방 판은 톡 전체 · ✏️ S012)
  const by: Record<string, boolean> = { '①색': toSlot, '②진자': cover, '②못': cover || stuck, '①연쇄': chainSlot, '③통나무': log, '③허공': air, '③뿅': jackEarly(L, h.S0.gone, h.s, p.rec), '④태엽': wind }; // ③뿅: '🤡 뿅에 맡겨요' 알약(✏️ S014)
  return by[c] ?? (toSlot || cover || stuck || chainSlot || air || log || wind);
}
/** 🎯 과녁 알약(drawPreview와 같은 식): 아직 쉬는 망치 · 스프링이 칠 나사 k */
function targetOf(L: Level, g0: number, k: number) {
  return L.pl.some((P, p) => (P.ham && poseOf(L, p, g0) === 0 && L.hamT[p].some((c) => c[0] === k)) || (P.kind === 'spring' && P.tgt !== undefined && !!(L.pm[p] & ~g0) && (() => {
    let b = -1, bd = 9;
    for (const i of L.ps[P.tgt]) if (!((g0 >> i) & 1) && Math.hypot(L.px[i] - P.cx, L.py[i] - P.cy) < bd) (bd = Math.hypot(L.px[i] - P.cx, L.py[i] - P.cy)), (b = i);
    return b === k;
  })()));
}
/**
 * F16 v2.1(🧪 S011 · 📋 S012): 막 누르기 실패 카드가 짚은 원인 톡(마지막 톡 제외 · ④는 🔑 톡 · ③은 과녁을 손으로 뺀 톡 더함)에 꾹 미리 보기 경고가 떴던 비율.
 *   v2.1: 망치가 이미 매달린 뒤의 과녁 톡은 🎯 대신 ①색('→ 빈칸')으로 센다 · 짝 pair = ③허공 실패 중 경고 뜬 💨 톡이 카드에 있는 비율(실패 10건 이상인 판 ≥ .8)
 */
export function f16(k: number, seeds = 100, hands = 1) {
  const d = STAGES[k];
  let fails = 0, n = 0, w = 0, af = 0, aw = 0, last1 = 0;
  const by: Record<string, [number, number]> = {}; // 원인별 [톡, 경고]
  for (let i = 0; i < seeds; i++) for (let j = 0; j < hands; j++) {
    const seed = 1000 + i * 7, s = tryStage(screwshopMash, seed, k, 600, seed + j * 100003).s, b = s.blame, L = s.L, H = s.hist;
    if (s.ok || !b) continue;
    fails++;
    last1 += +b.t.every((t) => t === H.length - 1); // 카드가 마지막 톡만 짚음(📋 S013: n < 10인 새 판의 판정 칸 ≤ .8)
    const c = b.c, P = L.pl[b.k], tg = c !== '③허공' ? [] : P.ham ? L.hamT[b.k].map((q) => q[0]) : P.tgt !== undefined ? L.ps[P.tgt] : [];
    const ok = (t: number) => warnOf(L, d, H[t], c, H.slice(0, t)) || (c === '③허공' && (targetOf(L, H[t].S0.gone, H[t].s) || (tg.includes(H[t].s) && poseOf(L, b.k, H[t].S0.gone) >= 1 && warnOf(L, d, H[t], '①색'))));
    const taps = new Set(c === '④태엽' ? [] : b.t.filter((t) => t !== H.length - 1));
    if (c === '④태엽') { const wt = H.findIndex((h) => h.rec.some((e) => e.k === 'wind')); if (wt >= 0) taps.add(wt); }
    if (c === '③허공') {
      const ht = H.findIndex((h, t) => t <= Math.min(...b.t) && tg.includes(h.s));
      if (ht >= 0) taps.add(ht);
      af++, (aw += +b.t.some((t) => t !== H.length - 1 && warnOf(L, d, H[t], '③허공'))); // 원인 톡(마지막 톡 제외)에 '💨' 경고
    }
    const o = (by[c] ??= [0, 0]);
    for (const t of taps) { const x = +ok(t); n++, (w += x), o[0]++, (o[1] += x); }
  }
  return { fails, n, v21: n ? +(w / n).toFixed(2) : null, airFails: af, pair: af ? +(aw / af).toFixed(2) : null, onlyLast: fails ? +(last1 / fails).toFixed(2) : null, by };
}
/** F15ᵗ(🧪 S011 · 📋 S012, 🐹 쿵 판): ① 쿵 빼기 장인 ★3 낙차(F19 식, ≥ .4) ② 판당 쿵 덜컹 나사 장인 ÷ 처음 봇(≥ 2×) · 빈 쿵 비율(처음 봇) */
export function f15t(k: number, seeds = 24) {
  const run = (bot: Bot<ShopState>, seed: number, off: boolean) => {
    const s = g.create(seed);
    if (k) startStage(s, k);
    if (off) s.L = { ...s.L, thump: false };
    const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t;
    while (s.phase !== 'result' && s.t - t0 < 600 * 60) g.step(s, bot.act(s, rng));
    let th = 0, dk = 0, empty = 0;
    for (const h of s.hist) { const i = h.rec.findIndex((e) => e.k === 'thump'); if (i < 0) continue; const f = h.rec.slice(i).filter((e) => e.k === 'fall').length; th++, (dk += f), (empty += +!f); }
    return { s3: +(s.ok && starsOf(STAGES[k], s.S) === 3), dk, th, empty };
  };
  const sum = (bot: Bot<ShopState>, off: boolean) => Array.from({ length: seeds }, (_, i) => run(bot, 1000 + i * 7, off)).reduce((a, x) => ({ s3: a.s3 + x.s3, dk: a.dk + x.dk, th: a.th + x.th, empty: a.empty + x.empty }));
  const on = sum(screwshopSmart, false), off = sum(screwshopSmart, true), nb = sum(screwshopNewbie, false);
  return { drop: +((on.s3 - off.s3) / seeds).toFixed(2), ratio: nb.dk ? +(on.dk / nb.dk).toFixed(1) : null, smartDk: +(on.dk / seeds).toFixed(2), newbieDk: +(nb.dk / seeds).toFixed(2), newbieEmpty: nb.th ? +(nb.empty / nb.th).toFixed(2) : null };
}
/** 빈 장치(📋 S013 · 소개 판 gate ≥ 1): 처음 봇(3손)이 🤡 뿅을 낸 톡마다 뿅 뒤에 튄 나사 수 — 평균 · 빈(0) 비율 */
export function devChain(k: number, seeds = 24) {
  let fires = 0, pops = 0, empty = 0;
  for (let i = 0; i < seeds; i++)
    for (let j = 0; j < 3; j++) {
      const seed = 1000 + i * 7, s = tryStage(screwshopNewbie, seed, k, 600, seed + j * 100003).s;
      for (const h of s.hist) {
        const ji = h.rec.findIndex((e) => e.k === 'jack');
        if (ji < 0) continue;
        const n = h.rec.slice(ji).filter((e) => e.k === 'out').length;
        fires++, (pops += n), (empty += +!n);
      }
    }
  return { fires, avg: fires ? +(pops / fires).toFixed(2) : 0, empty: fires ? +(empty / fires).toFixed(2) : null };
}
/** 대표 순간(🧪 S014 · 📋 S015 F23 바닥 · 판박이): 장인 최대 연쇄 m → 큰 순간 = 한 톡 연쇄 ≥ max(2, m − 1). 처음 봇 · 막 누르기(3손)의 큰 순간 비율 · 장인 큰 순간의 장치 줄(core) · 장인 첫 톡 판자 장치(first) */
export function bigOf(k: number, seeds = 24, got: { sm?: ShopState[]; nb?: ShopState['hist'][]; mash0?: ShopState['hist'][] } = {}) {
  const pops = (h: ShopState['hist'][number]) => h.rec.filter((e) => e.k === 'out' && e.pop).length;
  const top = (h: ShopState['hist']) => h.reduce((b, x) => (pops(x) > pops(b) ? x : b), h[0]);
  const mode = (a: string[]) => { const c: Record<string, number> = {}; for (const x of a) c[x] = (c[x] ?? 0) + 1; return Object.entries(c).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0][0]; };
  const dev = (L: Level, i: number) => { const p = L.owner[i], P = L.pl[p]; return (P.ham ? '🔨' : '') + (P.heavy ? '🪵' : '') + (P.key !== undefined ? '🔑' : '') + (P.kind === 'nail' ? '📌' : P.kind === 'spring' ? '🌀' : P.kind === 'glass' ? '🪟' : '') + (P.tick ? '⏰' : '') + (L.jack?.[0] === p ? '🤡' : '') || '·'; };
  const DI: Record<string, string> = { bonk: '🔨', crash: '🪵', wind: '🔑', boing: '🌀', tick: '⏰', jack: '🤡', thump: '🐹' };
  const sm = got.sm ?? Array.from({ length: seeds }, (_, i) => tryStage(screwshopSmart, 1000 + i * 7, k).s), m = Math.max(0, ...sm.flatMap((s) => s.hist.map(pops))), big = Math.max(2, m - 1);
  // measure()가 이미 돌린 판(장인 · 처음 봇 3손 · 막 누르기 첫 손)은 다시 돌리지 않는다(✏️ S015 테스트 시간) — 같은 시드 · 같은 손이라 값이 같다
  const rate = (bot: Bot<ShopState>, done?: ShopState['hist'][], per = 3, thr = big) => { let c = 0; for (let i = 0; i < seeds; i++) for (let j = 0; j < 3; j++) { const seed = 1000 + i * 7, h = done && done.length === seeds * per && j < per ? done[i * per + j] : tryStage(bot, seed, k, 600, seed + j * 100003).s.hist; c += +(h.length > 0 && pops(top(h)) >= thr); } return +(c / seeds / 3).toFixed(2); };
  const core = mode(sm.map((s) => (s.hist.length ? top(s.hist).rec.flatMap((e) => DI[e.k] ?? []).filter((x, i, a) => x !== a[i - 1]).join('') : '') || '·'));
  // 📋 S015: m ≥ 5 쿵 · 한 방 판은 문턱 m − 1이 곧 장인 수순 → 문턱 3 값(n3)을 같이 본다
  return { m, big, newbie: rate(screwshopNewbie, got.nb), mash: rate(screwshopMash, got.mash0, 1), core, first: mode(sm.filter((s) => s.hist.length).map((s) => dev(s.L, s.hist[0].s))), ...(m >= 5 ? { n3: rate(screwshopNewbie, got.nb, 3, 3) } : {}) };
}
/** 장치 끄기(🧪 S015 m3.mts 'f19'와 같은 식): 판 Level에서 그 장치만 없앤다 */
export const OFF: Record<string, (L: Level) => Level> = {
  '🤡': (L) => ({ ...L, jack: undefined }),
  '🪵': (L) => ({ ...L, pl: L.pl.map((P) => ({ ...P, heavy: false })) }),
  '🌀': (L) => ({ ...L, pl: L.pl.map((P) => (P.kind === 'spring' ? { ...P, kind: undefined as never, tgt: undefined } : P)) }),
  '⏰': (L) => ({ ...L, tmr: L.tmr.map(() => 0) }),
  '🔑': (L) => ({ ...L, wind: false }),
  '🪟': (L) => ({ ...L, pl: L.pl.map((P) => (P.kind === 'glass' ? { ...P, kind: undefined as never } : P)) }),
  '🔨': (L) => ({ ...L, pl: L.pl.map((P) => ({ ...P, ham: undefined })), hamT: L.hamT.map((a) => a.map(() => [])) }), // 📐A S016: geometry가 미리 셈한 hamT도 비워야 쾅이 멎는다
  '🐹': (L) => ({ ...L, thump: false }),
};
/** F19 식: 장치를 끈 판에서 장인 ★3 낙차(켬 − 끔) */
export function f19(k: number, dev: string, seeds = 24) {
  const d = STAGES[k];
  let on = 0, off = 0;
  for (let i = 0; i < seeds; i++) {
    const seed = 1000 + i * 7, a = tryStage(screwshopSmart, seed, k).s;
    on += +(a.ok && starsOf(d, a.S) === 3);
    const s = g.create(seed);
    if (k) startStage(s, k);
    s.L = OFF[dev](s.L);
    const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t;
    while (s.phase !== 'result' && s.t - t0 < 600 * 60) g.step(s, screwshopSmart.act(s, rng));
    off += +(s.ok && starsOf(d, s.S) === 3);
  }
  return +((on - off) / seeds).toFixed(2);
}
/** 판박이 v2(🧪 S015 · 📋 S016 gate): 같은 월드 · core 같은 짝이 first로 갈렸으면 그 first 장치의 F19 ≥ .4, m 차 1로만 갈렸으면 한쪽에만 있는 장치 중 하나의 F19 ≥ .4 — 걸린 짝 [자리, 자리, 까닭] */
export function twins2(rows: { slot: string; k: number; big: ReturnType<typeof bigOf> }[]) {
  // 장치 수(판자 단위): 같은 종류라도 한쪽이 더 많으면 '덧붙인 장치'(2-10의 둘째 🌀 문 같은 것)
  const cnt = (k: number) => { const L = paintStage(k, 1); return Object.fromEntries(Object.keys(OFF).map((e) => [e, e === '🤡' ? +!!L.jack : e === '🪵' ? L.pl.filter((P) => P.heavy).length : e === '🌀' ? L.pl.filter((P) => P.kind === 'spring').length : e === '⏰' ? L.tmr.filter((t) => t > 0).length : e === '🔑' ? +!!L.wind : e === '🪟' ? L.pl.filter((P) => P.kind === 'glass').length : e === '🔨' ? L.pl.filter((P) => P.ham).length : +!!L.thump])) as Record<string, number>; };
  const out: [string, string, string][] = [];
  rows.forEach((a, i) => rows.slice(i + 1).forEach((b) => {
    if (a.slot[0] !== b.slot[0] || a.big.core !== b.big.core) return;
    const dm = Math.abs(a.big.m - b.big.m);
    if (a.big.first !== b.big.first) {
      const ok = [a, b].some((x) => [...x.big.first].some((e) => OFF[e] && f19(x.k, e) >= 0.4));
      if (!ok && dm < 2) out.push([a.slot, b.slot, `first ${a.big.first}/${b.big.first} 장치 F19 < .4`]);
    } else if (dm === 1) {
      const ca = cnt(a.k), cb = cnt(b.k), only = Object.keys(OFF).flatMap((e) => (ca[e] > cb[e] ? [[a.k, e] as const] : cb[e] > ca[e] ? [[b.k, e] as const] : []));
      if (!only.some(([k, e]) => f19(k, e) >= 0.4)) out.push([a.slot, b.slot, `m ${a.big.m}/${b.big.m} · 한쪽 장치 F19 < .4`]);
    }
  }));
  return out;
}
/** 같은 뼈대(🧪 S015 · 📋 S016 gate): 실린 두 판의 같은 좌표 판자(cx · cy · hx · hy · a) 수가 작은 판의 절반 이상인 짝 [자리, 자리, 같은 수, 작은 판 판자 수] */
export function skeletons() {
  const key = (P: { cx: number; cy: number; hx: number; hy: number; a: number }) => [P.cx, P.cy, P.hx, P.hy, P.a].map((v) => v.toFixed(3)).join(',');
  const K = STAGES.map((d) => d.toy().map(key));
  const out: [string, string, number, number][] = [];
  K.forEach((a, i) => K.slice(i + 1).forEach((b, j) => { const sb = new Set(b), same = a.filter((x) => sb.has(x)).length, n = Math.min(a.length, b.length); if (same * 2 >= n) out.push([STAGES[i].slot, STAGES[i + 1 + j].slot, same, n]); }));
  return out;
}
/** news 순간(🧪 S015 news.mts · 📋 S016 같이 봄): news 문장이 말하는 톡을 처음 봇(3손) · 막 누르기(3손)가 보는 비율 — 판 key별 정의(📐가 새 판에 더한다) */
const after = (r: ShopState['hist'][number]['rec'], k: string) => { const i = r.findIndex((e) => e.k === k); return i < 0 ? -1 : r.slice(i).filter((e) => e.k === 'out' && e.pop).length; };
export const NEWS: Record<string, (r: ShopState['hist'][number]['rec']) => boolean> = {
  dolphin: (r) => after(r, 'crash') >= 2,
  lighthouse: (r) => r.some((e) => e.k === 'bonk') && r.filter((e) => e.k === 'boing').length >= 2,
  popcorn: (r) => after(r, 'jack') >= 0 && r.some((e) => e.k === 'crash') && after(r, 'crash') >= 1,
  coaster: (r) => r.some((e) => e.k === 'tick') && after(r, 'crash') >= 2,
  showcase: (r) => after(r, 'jack') >= 3,
  jackbox: (r) => after(r, 'jack') >= 2,
};
export function newsOf(k: number, seeds = 24) {
  const f = NEWS[STAGES[k].key];
  if (!f) return undefined;
  const rate = (bot: Bot<ShopState>) => { let c = 0; for (let i = 0; i < seeds; i++) for (let j = 0; j < 3; j++) { const seed = 1000 + i * 7; c += +tryStage(bot, seed, k, 600, seed + j * 100003).s.hist.some((h) => f(h.rec)); } return +(c / seeds / 3).toFixed(2); };
  return { newbie: rate(screwshopNewbie), mash: rate(screwshopMash) };
}
/** 판박이(🧪 S014 · 📋 S015): 같은 월드 · 장인 큰 순간 장치 줄이 같은 두 판은 장인 최대 연쇄 또는 장인 첫 톡 장치가 달라야 한다 → 걸린 짝 [자리, 자리] */
export const twinsOf = (rows: { slot: string; big: ReturnType<typeof bigOf> }[]) => rows.flatMap((a, i) => rows.slice(i + 1).filter((b) => a.slot[0] === b.slot[0] && a.big.core === b.big.core && a.big.m === b.big.m && a.big.first === b.big.first).map((b) => [a.slot, b.slot]));
/** 한 판만 빠르게 (테스트용): 봇별 클리어·★3 */
export function measureStage(k: number, seeds: number, bots: (keyof typeof BOTS)[]) {
  return Object.fromEntries(bots.map((b) => {
    const r = Array.from({ length: seeds }, (_, i) => tryStage(BOTS[b], 1000 + i * 7, k));
    return [b, { clear: r.filter((x) => x.ok).length / seeds, star3: r.filter((x) => x.stars === 3).length / seeds }];
  })) as Record<string, { clear: number; star3: number }>;
}

export function measure(seeds = 12) {
  const keep: { sm?: ShopState[]; mash0?: ShopState['hist'][]; nb: ShopState['hist'][] }[] = STAGES.map(() => ({ nb: [] }));
  const stages = STAGES.map((d, k) => {
    const row: Record<string, unknown> = { stage: k + 1, slot: d.slot, id: d.id, name: `${d.emoji} ${d.name}` };
    for (const [name, bot] of Object.entries(BOTS)) {
      const r = Array.from({ length: seeds }, (_, i) => tryStage(bot, 1000 + i * 7, k));
      if (name === 'smart') keep[k].sm = r.map((x) => x.s);
      if (name === 'mash') keep[k].mash0 = r.map((x) => x.s.hist);
      row[name] = {
        clear: +(r.filter((x) => x.ok).length / seeds).toFixed(2),
        star3: +(r.filter((x) => x.stars === 3).length / seeds).toFixed(2),
        stars: +(r.reduce((a, x) => a + x.stars, 0) / seeds).toFixed(2),
        ge2: +(r.filter((x) => x.stars >= 2).length / seeds).toFixed(2),
        sec: +(r.reduce((a, x) => a + x.sec, 0) / seeds).toFixed(1),
        /** 사람 시간 추정(초): 장인 톡 수 × 5초 + 연출 6초 (MILESTONES: 판당 60~120초) — 장인 행에서만 의미 */
        human: +(r.reduce((a, x) => a + x.taps * 5 + 6, 0) / seeds).toFixed(0),
        /** 한 방: 톡 한 번에 빠진 나사 수 최대(판 평균) */
        shot: +(r.reduce((a, x) => a + x.shot, 0) / seeds).toFixed(2),
      };
    }
    return row;
  });
  // 처음 하는 사람: 판마다 다시 3번 안에 깨는 비율 (시드마다 다른 손) + 진 판의 되짚기 정확도 F13
  stages.forEach((row, k) => {
    let first = 0, three = 0, fails = 0, hit = 0, hinted = 0, hint3 = 0;
    for (let i = 0; i < seeds; i++) {
      const tries = [0, 1, 2].map((j) => tryStage(screwshopNewbie, 1000 + i * 7, k, 600, 1000 + i * 7 + j * 100003)); // 같은 판 다시 3번
      keep[k].nb.push(...tries.map((x) => x.s.hist));
      first += +tries[0].ok;
      three += +tries.some((x) => x.ok);
      if (!tries.some((x) => x.ok)) { // 💡 귀띔 봇(📋 M2 ③): 3번 지면 귀띔을 켜고 손가락(장인 수)을 따른다
        const h = tryStage(screwshopSmart, 1000 + i * 7, k, 600, 1000 + i * 7, true);
        hinted += +h.ok;
        hint3 += +(h.s.got === 3);
      } else hinted++;
      for (const x of tries) if (!x.ok && x.s.blame) (fails++, (hit += +pnrHit(x.s)));
    }
    row.newbie = { clear1: +(first / seeds).toFixed(2), clear3: +(three / seeds).toFixed(2), fails, f13: fails ? +(hit / fails).toFixed(2) : null, hint: +(hinted / seeds).toFixed(2), hint3 };
  });
  stages.forEach((row, k) => {
    row.f16 = f16(k); // F16 v2.1 + 카드 짝(막 누르기 100시드 — 🧪 m1b와 같은 손)
    if (STAGES[k].thump) row.f15t = f15t(k, seeds);
    if (STAGES[k].jack) row.dev = devChain(k, seeds); // 빈 장치(🤡)
    row.big = bigOf(k, seeds, keep[k]); // 대표 순간(F23 바닥 · 판박이)
    if (seeds >= 24) { // 📋 S016: 바닥 ±.03 판 96손 · news 순간(테스트의 measure(6)에서는 돌지 않는다)
      const b = row.big as ReturnType<typeof bigOf>;
      if (b.newbie >= 0.22 && b.newbie <= 0.28) row.big96 = bigOf(k, 96).newbie;
      const nw = newsOf(k, seeds);
      if (nw) row.news = nw;
    }
  });
  const avg = (bot: string, key: string) => +(stages.reduce((a, r) => a + (r[bot] as Record<string, number>)[key], 0) / stages.length).toFixed(2);
  const summary = {
    smartStars: avg('smart', 'stars'), habitStars: avg('habit', 'stars'), randomStars: avg('random', 'stars'),
    smartStar3: avg('smart', 'star3'), habitStar3: avg('habit', 'star3'),
    randomClear1: (stages[0].random as Record<string, number>).clear,
    /** 막 누르기 클리어율: 1·2판 / 3~8판 평균 (낮을수록 '생각해야 깨진다') */
    mashClear12: +((stages.slice(0, 2).reduce((a, r) => a + (r.mash as Record<string, number>).clear, 0)) / 2).toFixed(2),
    mashClear38: +((stages.slice(2).reduce((a, r) => a + (r.mash as Record<string, number>).clear, 0)) / (stages.length - 2)).toFixed(2),
    mashStars: avg('mash', 'stars'),
    /** 버릇 3종 ★3 판별 최고 (2판 / 3~8판 최고) — M1′ ① */
    habit3Star3_2: Math.max(...['habit', 'top', 'reveal'].map((b) => (stages[1][b] as Record<string, number>).star3)),
    habit3Star3_38max: Math.max(...stages.slice(2).flatMap((r) => ['habit', 'top', 'reveal'].map((b) => (r[b] as Record<string, number>).star3))),
    /** 손가락 → 막 누르기 1·2판 ★2 이상 (≤ 0.2) */
    fingerGe2_1: (stages[0].finger as Record<string, number>).ge2, fingerGe2_2: (stages[1].finger as Record<string, number>).ge2,
    /** 🧪 F4: 미리 보기 따라 하기 ★3 (3~8판 평균, 낮을수록 미리 보기가 정답 안내가 아니다) */
    previewStar3_38: +(stages.slice(2).reduce((a, r) => a + (r.preview as Record<string, number>).star3, 0) / (stages.length - 2)).toFixed(2),
    /** 한 방 최대 판 평균: 장인 / 막 누르기 (M1′ ②: 장인 ≥ 3 · 막 누르기 ≤ 1.5) */
    smartShot: avg('smart', 'shot'), mashShot: avg('mash', 'shot'),
    smartSec: avg('smart', 'sec'),
    /** 처음 하는 사람: 다시 3번 안에 클리어 — 1~3판 최저 / 1~8판 평균 (M1′ ④: ≥ 0.9 / ≥ 0.75) */
    newbie3_13: Math.min(...stages.slice(0, 3).map((r) => (r.newbie as Record<string, number>).clear3)),
    newbie3_avg: +(stages.reduce((a, r) => a + (r.newbie as Record<string, number>).clear3, 0) / stages.length).toFixed(2),
    /** 💡 귀띔 봇 판별 클리어 최저(📋 M2 ③ ≥ .95) · 귀띔 쓴 판 ★3 수(0이어야) */
    hintMin: Math.min(...stages.map((r) => (r.newbie as Record<string, number>).hint)),
    hint3: stages.reduce((a, r) => a + (r.newbie as Record<string, number>).hint3, 0),
    /** 🧪 F13 되짚기 정확도: 3~8판 중 처음 봇 실패 10건 이상인 판의 최저 (M1′ ① ≥ 0.8) */
    f13_38min: Math.min(...stages.slice(2).map((r) => r.newbie as Record<string, number>).filter((n) => n.fails >= 10).map((n) => n.f13)),
    /** F16 v2.1 · 카드 짝: 막 누르기 실패 10건 이상인 판의 최저(📋 S012 ③ 각 ≥ .8) */
    f16min: Math.min(...stages.map((r) => r.f16 as ReturnType<typeof f16>).filter((f) => f.fails >= 10 && f.v21 !== null).map((f) => f.v21!)),
    pairMin: Math.min(...stages.map((r) => r.f16 as ReturnType<typeof f16>).filter((f) => f.airFails >= 10).map((f) => f.pair!)),
    /** 빈 장치(🤡 판): [자리, 처음 봇 뿅 연쇄 평균, 빈 뿅 비율] · F16 n < 10 판의 '마지막 톡만' 최고 */
    dev: stages.filter((r) => r.dev).map((r) => [r.slot, (r.dev as ReturnType<typeof devChain>).avg, (r.dev as ReturnType<typeof devChain>).empty]),
    onlyLastSmallN: Math.max(0, ...stages.map((r) => r.f16 as ReturnType<typeof f16>).filter((x) => x.n < 10 && x.fails >= 10).map((x) => x.onlyLast ?? 0)),
    /** F23 바닥(📋 S015 새 판 gate ≥ .25): M1′ 8판 밖에서 처음 봇 큰 순간이 .25 밑인 판 [자리, 값] · 판박이 짝 */
    f23low: stages.filter((r) => (r.id as number) >= 8 && (r.big as ReturnType<typeof bigOf>).newbie < 0.25).map((r) => [r.slot, (r.big as ReturnType<typeof bigOf>).newbie]),
    twins: twinsOf(stages as { slot: string; big: ReturnType<typeof bigOf> }[]),
    /** 📋 S016: 판박이 v2 · 같은 뼈대 · 바닥 96손 · m ≥ 5 문턱 3 · news 순간(24시드 이상에서만) */
    ...(seeds >= 24 ? { twins2: twins2(stages.map((r, k) => ({ slot: r.slot as string, k, big: r.big as ReturnType<typeof bigOf> }))), skeletons: skeletons(), big96: stages.filter((r) => r.big96 !== undefined).map((r) => [r.slot, r.big96]), n3: stages.filter((r) => (r.big as ReturnType<typeof bigOf>).n3 !== undefined).map((r) => [r.slot, (r.big as ReturnType<typeof bigOf>).n3]), news: stages.filter((r) => r.news).map((r) => [r.slot, (r.news as { newbie: number }).newbie, (r.news as { mash: number }).mash]) } : {}),
    /** F15ᵗ(쿵 판): [자리, 쿵 빼기 낙차, 덜컹 배율] */
    f15t: stages.filter((r) => r.f15t).map((r) => [r.slot, (r.f15t as ReturnType<typeof f15t>).drop, (r.f15t as ReturnType<typeof f15t>).ratio]),
    /** 사람 시간 추정(초): 판별 장인 톡 × 5 + 6 */
    humanSec: stages.map((r) => (r.smart as Record<string, number>).human),
    /** 숙련 격차: 장인 평균 별 / 무작위 평균 별 */
    skillGap: +(avg('smart', 'stars') / Math.max(0.05, avg('random', 'stars'))).toFixed(2),
  };
  return { seeds, summary, stages };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2] ?? 12), t0 = Date.now(), rep = measure(n);
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  const build = /빌드 (M[\d.′]+(?:-S\d+)?)/.exec(readFileSync(join(import.meta.dirname, 'index.html'), 'utf8'))?.[1] ?? '?'; // 🧪: 'M0' 고정 → 실제 빌드
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify({ at: new Date().toISOString().slice(0, 10), build, ...rep }, null, 1) + '\n');
  console.log(JSON.stringify(rep.summary), `${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const r of rep.stages) console.log(r.stage, r.name, ...Object.keys(BOTS).map((b) => `${b} ${JSON.stringify(r[b])}`));
}
