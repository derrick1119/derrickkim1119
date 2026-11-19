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
import { STAGES, apply, geometry, setLevel, visibleM, cloneSim, freeM, jackEarly, logLate, paintStage, peek, poseOf, stuckM, viewOf, screwshop as g, screwshopHabit, screwshopRandom, screwshopSmart, screwshopBlind, startStage, starsOf, dead3, gapOf, starText, gaugeOf, setLearn, starKinds, TRAY_WARN, planMove, habitPick, bestMove, type Plan, type Level, type ShopState, type Sim, type StageDef, type Src } from './game.ts';

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
/** 버릇 ④ 장치는 맨 나중(📋 S023 · ✏️ S025 · A 통일 반증): 장치 나사(🔑 · 🌀 · 🪵 · 🔨 · 🤡 판자)는 남은 게 그것뿐일 때 — 그 밖에는 맞는 색 · 위부터.
 *  ★3이 '한 번에 쏙 N'으로 하나가 되면 '아껴 뒀다 한 방'이 새 버릇이 될 수 있다 */
export const screwshopSave: Bot<ShopState> = {
  name: '버릇: 장치는 맨 나중',
  act(s) {
    if (!ready(s)) return NO;
    const L = s.L, dev = (i: number) => !!((L.keyM >> i) & 1) || ((p) => p.kind === 'spring' || !!p.heavy || !!p.ham)(L.pl[L.owner[i]]) || (!!L.jack && L.owner[i] === L.jack[0]);
    let best = -1, bv = 1e9;
    for (const i of knownFree(s)) { const v = (dev(i) ? 100 : 0) + (s.S.box.includes(L.col[i]) ? 0 : 10) + L.py[i]; if (v < bv) (bv = v), (best = i); }
    return best >= 0 ? tapI(s, best) : NO;
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
 * ✏️ S064(M3′ W1 · 🧪 S063 F28 → 📋 F30 · F31): 규칙을 모르는 처음 봇이 사람 속도(1.2초에 한 톡 · 판 시작 1.5초 쉼)로
 * 1-1부터 이어 하다 첫 '넘침' 실패까지(막힘 실패는 그 판 다시 ≤ 5). 쟁반 경고 그림(TRAY_WARN칸부터)이 없는 빌드면 0.
 * saw = 첫 넘침 전에 경고 칸 수에 닿은 손 · pre = 지는 톡 바로 앞이 경고 칸 수였던 손 · first = 처음 4칸이 된 판
 */
export function trayRead(hands = 48) {
  const W = TRAY_WARN ?? 99, first: Record<string, number> = {};
  let fails = 0, saw = 0, pre = 0, saw4 = 0, pre4 = 0, none = 0, n4 = 0, drop = 0;
  for (let i = 0; i < hands; i++) {
    const seed = 1 + i * 13, rng = mulberry32(seed ^ 0x9e3779b9), s = g.create(seed);
    setLearn(s, 0), startStage(s, 0);
    let top = 0, tries = 0, seen4 = false;
    for (let guard = 0; guard < 60 * 60 * 90; guard++) {
      if (s.phase === 'result') {
        if (s.ok) { if (s.stage >= STAGES.length - 1) break; startStage(s, s.stage + 1), (tries = 0); continue; }
        const last = s.hist[s.hist.length - 1];
        if (s.S.fail === 1) { fails++, (saw += +(top >= W)), (pre += +(last.S0.slots.length >= W)), (saw4 += +(top >= 4)), (pre4 += +(last.S0.slots.length >= 4)); break; }
        if (++tries > 5) break;
        startStage(s, s.stage);
        continue;
      }
      const wait = s.phase === 'play' && (s.t - s.lastTap < 72 || s.t - s.startT < 90);
      g.step(s, wait ? NO : screwshopNewbie.act(s, rng));
      const n = s.S.slots.length;
      if (!s.S.fail) top = Math.max(top, n);
      if (n >= 4 && !seen4) (seen4 = true), (first[STAGES[s.stage].slot] = (first[STAGES[s.stage].slot] ?? 0) + 1), !s.S.fail && (n4++, (drop += +(s.w4 > 0))); // F30: 처음 4칸(지지 않은 톡)에 턱 나사 떨어짐(w4)이 걸렸나
    }
    if (!(s.phase === 'result' && !s.ok && s.S.fail === 1)) none++;
  }
  const r2 = (x: number) => +(x / Math.max(1, fails)).toFixed(2);
  return { hands, fails, none, warn: TRAY_WARN ?? null, f30: +(drop / Math.max(1, n4)).toFixed(2), f31saw: r2(saw), f31pre: r2(pre), reach4: r2(saw4), pre4: r2(pre4), first4: first };
}

/** ✏️ S067(M3″ W1 · 🧪 S066 lib): 알고 서툰 봇 — e 몫은 뺄 수 있는 아무 나사, 나머지는 장인 수(별 조건을 앎) */
export const knowE = (e: number): Bot<ShopState> => {
  const memo = new WeakMap<object, { key: string; m: number }>();
  return { name: `알고 서툰 ε${e}`, act(s, rng) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.S.gone}`;
    let m = memo.get(s);
    if (!m || m.key !== key) {
      let mv = -1;
      if (rng() < e) { const o = knownFree(s); if (o.length) mv = o[Math.floor(rng() * o.length)]; } else mv = planMove(s);
      memo.set(s, (m = { key, m: mv < 0 ? habitPick(s.L, s.S, s.known) : mv }));
    }
    return m.m >= 0 ? tapI(s, m.m) : NO;
  } };
};
/** ✏️ S067(📐 S066 run.ts mkExpert): 캐주얼 — mix 몫은 장인 수(deaf면 별 조건 모름), 나머지는 '맞는 색' 버릇 */
const deafD = (d: StageDef): Plan => ({ ...d, H: undefined, T: undefined, C: 99, P: 9 });
export const casual = (mix: number, deaf = false): Bot<ShopState> => ({ name: `캐주얼(${deaf ? '모름' : '앎'} ${mix})`, act(s, rng) {
  if (!ready(s)) return NO;
  if (rng() >= mix) { const m = habitPick(s.L, s.S, s.known); return m >= 0 ? tapI(s, m) : NO; }
  let m = bestMove(viewOf(s), s.S, deaf ? deafD(STAGES[s.stage]) : STAGES[s.stage]);
  if (m < 0) m = habitPick(s.L, s.S);
  return m >= 0 ? tapI(s, m) : NO;
} });
/** 한 번 도전(tryStage와 같은 손) + '★3!' 알림(s.sg 3번 비트)이 뜬 순간 별이 3개가 아니었나(bad) */
function runA(bot: Bot<ShopState>, seed: number, k: number, hand: number) {
  const s = g.create(seed), d = STAGES[k];
  if (k) startStage(s, k);
  const rng = mulberry32(hand ^ 0x9e3779b9), t0 = s.t;
  let a = 0, bad = 0;
  while (s.phase !== 'result' && s.t - t0 < 600 * 60) { const sg = s.sg; g.step(s, bot.act(s, rng)); if (s.sg & 8 & ~sg) (a = 1), (bad = +(starsOf(d, s.S) < 3)); }
  const st = s.phase === 'result' && s.ok ? starsOf(d, s.S) : 0;
  return { st, a, bad };
}
/** M3″ L1 잠금 문턱: 월드 1 → 2 · 2 → 3(월드마다 · 오너 '매 챕터에서') */
export const LOCK = [15, 15];
/**
 * ✏️ S067(M3″ W1 · 📋 S066 F36~F39): 별이 닿나 · 잠금이 막나 · 칩이 이웃 판과 같나 · 거짓 '★3!'
 * 48손(24씨앗 × 손 묶음 0 · 7) · 판마다 3번(손 = 씨앗 + (묶음 + 번째) × 100003 · 🧪 lib once와 같음). 원래 칸과 따로 둔다.
 */
export function starFloor(seeds = 24) {
  const H = Array.from({ length: seeds }, (_, i) => 1000 + i * 7).flatMap((sd) => [0, 7].map((hb) => [sd, hb])), K = STAGES.length, n = H.length;
  const know = knowE(0.3), casK = casual(0.5), casD = casual(0.3, true), r2 = (x: number) => +x.toFixed(2);
  const tries = (bot: Bot<ShopState>, k: number, m: number) => H.map(([sd, hb]) => Array.from({ length: m }, (_, j) => runA(bot, sd, k, sd + (hb + j) * 100003)));
  const firstClear = (r: { st: number }[]) => r.find((x) => x.st > 0)?.st ?? 0;
  const per: [string, number, number, number][] = [], wNew: number[][][] = [], wCas: number[][] = [], wHab: number[][] = [];
  let clr = 0, bad = 0, alerts = 0, missAfter = 0;
  for (let k = 0; k < K; k++) {
    const kn = tries(know, k, 3), w = k < 20, nb = tries(screwshopNewbie, k, w ? 3 : 1), ck = tries(casK, k, 1);
    for (const r of kn) for (const x of r) (clr += +(x.st > 0)), (bad += x.bad), (alerts += x.a), (missAfter += +(x.a && !x.bad && x.st > 0 && x.st < 3));
    per.push([STAGES[k].slot, r2(kn.filter((r) => r.some((x) => x.st === 3)).length / n), r2(ck.filter((r) => r[0].st === 3).length / n), r2(nb.filter((r) => r[0].st >= 2).length / n)]);
    if (w) (wNew[k] = nb.map((r) => [Math.max(...r.map((x) => x.st)), firstClear(r)])), (wCas[k] = tries(casD, k, 3).map(firstClear)), (wHab[k] = tries(screwshopHabit, k, 3).map(firstClear));
  }
  const avg = (j: 1 | 2 | 3) => r2(per.reduce((a, p) => a + p[j], 0) / K), lo = per.reduce((a, p) => (p[1] < a[1] ? p : a));
  const blk = (f: (k: number, h: number) => number) => [[0, 10], [10, 20]].map(([a, z], w) => r2(H.filter((_, h) => { let t = 0; for (let k = a; k < z; k++) t += f(k, h); return t < LOCK[w]; }).length / n));
  const z = { shot: 0, taps: 0, streak: 0, bonks: 0, peak: 0, best: 0 } as Sim, chip = STAGES.map((d) => { const t = starText(d, z); return [t.c2, starKinds(d)[1], t.c3]; });
  let c2 = 0, kind3 = 0, num3 = 0, any = 0;
  chip.forEach((c, i) => { if (!i) return; const p = chip[i - 1], a = c[0] !== p[0], b = c[1] !== p[1], u = !b && c[2] !== p[2]; (c2 += +a), (kind3 += +b), (num3 += +u), (any += +(a || b || u)); });
  return {
    hands: n,
    /** F36 ★3 바닥: 알고 서툰(ε.3) 같은 판 3번 안 ★3 평균 · 판 최저 · 캐주얼 앎 첫 번 ★3 · 처음 첫 번 ★2 이상 */
    f36: { know3: avg(1), know3min: [lo[0], lo[1]], cas1: avg(2), new2: avg(3) },
    /** F37 잠금 막힘(월드 1 → 2 · 2 → 3): 처음 봇 세 번 중 최고 · 깬 대로 · 캐주얼(모름 3할 · 깬 대로) · 버릇(깬 대로) */
    f37: { lock: LOCK, best3: blk((k, h) => wNew[k][h][0]), asIs: blk((k, h) => wNew[k][h][1]), cas: blk((k, h) => wCas[k][h]), habit: blk((k, h) => wHab[k][h]) },
    /** F38 별 칩 이웃 바뀜(27쌍): ★2 말 · ★3 종류 · ★2나 ★3 칩 글 · ★3 숫자만 */
    f38: { pairs: K - 1, c2, kind3, any, num3 },
    /** F39 거짓 ★3: 알고 서툰 도전 중 '★3!' 알림이 뜬 판(alerts) 가운데 그 순간 별이 3개가 아니던 판(bad · 0이어야) · 알림 뒤 ★2를 잃고 깬 판(같이 봄) */
    f39: { tries: K * n * 3, clr, alerts, bad, rate: r2(bad / Math.max(1, alerts)), missAfter },
    per,
  };
}

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

export const BOTS = { smart: screwshopSmart, habit: screwshopHabit, top: screwshopTop, reveal: screwshopReveal, save: screwshopSave, random: screwshopRandom, mash: screwshopMash, finger: screwshopFingerMash, preview: screwshopPreview };

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
/** 장식 표기(📋 S017 규칙 · 📐C S020 목록): 판 id → '장식'으로 적은 장치(판당 하나 · core · 판박이 가른 장치 · 소개 장치 아님) — f19low에서 빼고 decor로 따로 적는다 */
export const DECOR: Record<number, string> = { 15: '🪟', 17: '🪟', 22: '🪟', 23: '🪟', 16: '📌', 19: '📌', 14: '🔨', 28: '🪟' }; // 28: 📋 S020 허락(3-7 🪟 장식 · 어느 쪽이든)
/** 월드 2·3 소개 판(📋 S019 — 3-6은 ❓ 자리였고 ❓가 M5로 가서 비소개) */
export const INTRO = ['2-1', '2-2', '2-6', '3-1', '3-2'];
/** 장치 끄기(✏️ S017 · 🧪 S017 보완 1): Level을 고치지 않고 판 정의(toy · 깃발)에서 그 장치를 지운 뒤 판 모양을 다시 셈한다 —
 *  hid · known · hamT · 자세가 같이 다시 셈해진다(S017 전 🪟 끄기는 hid를 안 바꿔 빈 동작이었다). 칠(col · queue · pal)은 켠 판 그대로 —
 *  다시 칠하면 낙차에 '칠이 달라진 몫'이 섞인다(3-1은 끈 판을 칠할 수도 없다) */
const src = (d: StageDef, f: (P: Src) => Src): StageDef => ({ ...d, toy: () => d.toy().map(f) });
export const OFF: Record<string, (d: StageDef) => StageDef> = {
  '🤡': (d) => ({ ...d, jack: undefined }),
  '🪵': (d) => src(d, (P) => ({ ...P, heavy: false })),
  '🌀': (d) => src(d, (P) => (P.kind === 'spring' ? { ...P, kind: 'wood', tgt: undefined } : P)),
  '⏰': (d) => src(d, (P) => ({ ...P, tick: undefined })),
  '🔑': (d) => ({ ...d, wind: false }),
  '🪟': (d) => src(d, (P) => (P.kind === 'glass' ? { ...P, kind: 'wood' } : P)),
  '🔨': (d) => src(d, (P) => ({ ...P, ham: undefined })),
  '🐹': (d) => ({ ...d, thump: false }),
  '📌': (d) => src(d, (P) => (P.kind === 'nail' ? { ...P, kind: 'wood', nail: undefined } : P)),
};
/** 장치를 끈 판으로 시작한 상태 — 칠은 켠 판(같은 씨앗) 그대로 */
export function offState(k: number, dev: string, seed: number): ShopState {
  const s0 = g.create(seed);
  if (k) startStage(s0, k);
  const L0 = s0.L, d1 = OFF[dev](STAGES[k]), G = geometry(d1.toy());
  G.wind = !!d1.wind;
  if (d1.thump) G.thump = true;
  if (d1.jack) G.jack = d1.jack;
  setLevel(seed, k, { ...G, col: L0.col, queue: L0.queue, boxes: L0.boxes, pal: L0.pal });
  try {
    const s = g.create(seed);
    if (k) startStage(s, k);
    return s;
  } finally {
    setLevel(seed, k);
  }
}
/** F19 식: 장치를 끈 판에서 장인 ★3 낙차(켬 − 끔) */
export function f19(k: number, dev: string, seeds = 24) {
  const d = STAGES[k];
  let on = 0, off = 0;
  for (let i = 0; i < seeds; i++) {
    const seed = 1000 + i * 7, a = tryStage(screwshopSmart, seed, k).s;
    on += +(a.ok && starsOf(d, a.S) === 3);
    const s = offState(k, dev, seed);
    const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t;
    while (s.phase !== 'result' && s.t - t0 < 600 * 60) g.step(s, screwshopSmart.act(s, rng));
    off += +(s.ok && starsOf(d, s.S) === 3);
  }
  return +((on - off) / seeds).toFixed(2);
}
/** 🪟 처음 봇 몫(🧪 S017 · 📋 S017): 처음 봇 첫 시도 클리어 낙차(켬 − 끔). rng 봇이라 96시드로 센다 */
export function f19n(k: number, dev: string, seeds = 96) {
  let on = 0, off = 0;
  for (let i = 0; i < seeds; i++) {
    const seed = 1000 + i * 7;
    on += +tryStage(screwshopNewbie, seed, k).ok;
    const s = offState(k, dev, seed), rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t;
    while (s.phase !== 'result' && s.t - t0 < 600 * 60) g.step(s, screwshopNewbie.act(s, rng));
    off += +(s.phase === 'result' && s.ok);
  }
  return +((on - off) / seeds).toFixed(2);
}
/** 🪟 미리 보기 봇 몫(🧪 S018 q18/p.mts · 📋 S018): 미리 보기 봇(보임 · 한 수 앞) ★2 이상 낙차(켬 − 끔). 48시드 · .05~.15면 96시드로 판정 */
export function f19p(k: number, dev: string, seeds = 48) {
  const d = STAGES[k];
  let on = 0, off = 0;
  for (let i = 0; i < seeds; i++) {
    const seed = 1000 + i * 7, a = tryStage(BOTS.preview, seed, k);
    on += +(a.ok && a.stars >= 2);
    const s = offState(k, dev, seed), rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t;
    while (s.phase !== 'result' && s.t - t0 < 600 * 60) g.step(s, BOTS.preview.act(s, rng));
    off += +(s.phase === 'result' && s.ok && starsOf(d, s.S) >= 2);
  }
  return +((on - off) / seeds).toFixed(2);
}
/** 유리 밑 보이는 나사(📋 S017 새 판 gate ≥ 3 · 🧪 S017 h.mts): 쉬는 자세에서 유리를 나무로 바꾸면 안 보이게 되는 나사 수 */
export function seen(k: number) {
  const pc = (x: number) => x.toString(2).split('1').length - 1, s = g.create(1000);
  if (k) startStage(s, k);
  const a = s.L, b = offState(k, '🪟', 1000).L;
  return pc(visibleM(a, 0)) - pc(visibleM(b, 0));
}
/** 판에 들어 있는 장치 수(판자 단위) — 판박이 v2 · 장치 F19 일괄이 쓴다 */
export const cnt = (k: number) => { const L = paintStage(k, 1); return Object.fromEntries(Object.keys(OFF).map((e) => [e, e === '🤡' ? +!!L.jack : e === '🪵' ? L.pl.filter((P) => P.heavy).length : e === '🌀' ? L.pl.filter((P) => P.kind === 'spring').length : e === '⏰' ? L.tmr.filter((t) => t > 0).length : e === '🔑' ? +!!L.wind : e === '🪟' ? L.pl.filter((P) => P.kind === 'glass').length : e === '🔨' ? L.pl.filter((P) => P.ham).length : e === '📌' ? L.pl.filter((P) => P.kind === 'nail').length : +!!L.thump])) as Record<string, number>; };
/** 판박이 v2 같은 종류(🧪 S020 · 📋 S020 — M2 같이 보는 칸 · M3 gate): 같은 월드 · core · first 짝이 장치 종류(장식 뺌)는 같고 수만 다르면 [자리, 자리, 장치 수] */
export function twinsSame(rows: { slot: string; k: number; big: ReturnType<typeof bigOf> }[]) {
  const out: [string, string, string][] = [];
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      if (a.slot[0] !== b.slot[0] || a.big.core !== b.big.core || a.big.first !== b.big.first) continue;
      const ca = cnt(a.k), cb = cnt(b.k), kinds = (c: Record<string, number>, k: number) => Object.keys(c).filter((e) => c[e] && DECOR[STAGES[k].id] !== e).join();
      if (kinds(ca, a.k) !== kinds(cb, b.k)) continue;
      const diff = kinds(ca, a.k).split(',').filter((e) => e && ca[e] !== cb[e]);
      if (diff.length) out.push([a.slot, b.slot, diff.map((e) => `${e} ${ca[e]}/${cb[e]}`).join(' · ')]);
    }
  return out;
}
/** 판박이 v2(🧪 S015 · 📋 S016 gate): 같은 월드 · core 같은 짝이 first로 갈렸으면 그 first 장치의 F19 ≥ .4, m 차 1로만 갈렸으면 한쪽에만 있는 장치 중 하나의 F19 ≥ .4 — 걸린 짝 [자리, 자리, 까닭] */
export function twins2(rows: { slot: string; k: number; big: ReturnType<typeof bigOf> }[]) {
  // 장치 수(판자 단위): 같은 종류라도 한쪽이 더 많으면 '덧붙인 장치'(2-10의 둘째 🌀 문 같은 것)
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
export const NEWS: Record<string, (r: ShopState['hist'][number]['rec'], L: Level) => boolean> = {
  crab: (r) => after(r, 'crash') >= 2, // 📐C S021: '등딱지가 다리를 와르르' = 와르르로 다리 둘 이상 튐
  dolphin: (r) => r.filter((e) => e.k === 'bonk').length >= 2, // 📐A S020: 🔨 돌고래 도미노 '쾅 → 쾅'
  lighthouse: (r) => r.some((e) => e.k === 'bonk') && r.filter((e) => e.k === 'boing').length >= 2,
  popcorn: (r) => after(r, 'jack') >= 0 && r.some((e) => e.k === 'crash') && after(r, 'crash') >= 1,
  coaster: (r) => r.some((e) => e.k === 'tick') && after(r, 'crash') >= 2,
  showcase: (r) => after(r, 'jack') >= 3,
  jackbox: (r) => after(r, 'jack') >= 2,
  range: (r, L) => r.some((e) => e.k === 'boing' && L.tmr[e.s] > 0), // 🧪 S016: '총이 떨어지면 ⏰를 탕' = 띠용이 ⏰ 나사를 친 톡
  cablecar: (r) => { const i = r.findIndex((e) => e.k === 'bonk'); return i >= 0 && r.slice(i).some((e) => e.k === 'wind'); }, // 📐C S017: '칸 쾅 → 🔑 드르륵' = 한 톡 안에서 쾅 뒤에 드르륵
};
export function newsOf(k: number, seeds = 24) {
  const f = NEWS[STAGES[k].key];
  if (!f) return undefined;
  const rate = (bot: Bot<ShopState>) => { let c = 0; for (let i = 0; i < seeds; i++) for (let j = 0; j < 3; j++) { const seed = 1000 + i * 7; const t = tryStage(bot, seed, k, 600, seed + j * 100003).s; c += +t.hist.some((h) => f(h.rec, t.L)); } return +(c / seeds / 3).toFixed(2); };
  return { newbie: rate(screwshopNewbie), mash: rate(screwshopMash), smart: rate(screwshopSmart) }; // 🧪 S016: 장인도 그 순간을 보는가
}
/** 판박이(🧪 S014 · 📋 S015): 같은 월드 · 장인 큰 순간 장치 줄이 같은 두 판은 장인 최대 연쇄 또는 장인 첫 톡 장치가 달라야 한다 → 걸린 짝 [자리, 자리] */
export const twinsOf = (rows: { slot: string; big: ReturnType<typeof bigOf> }[]) => rows.flatMap((a, i) => rows.slice(i + 1).filter((b) => a.slot[0] === b.slot[0] && a.big.core === b.big.core && a.big.m === b.big.m && a.big.first === b.big.first).map((b) => [a.slot, b.slot]));
/** 한 판만 빠르게 (테스트용): 봇별 클리어·★3 */
/** ✏️ S023(M2′ G6 · 📐 S022 starRead · 🧪 S022 F25 · F27): 별이 와닿나 — ★3 종류 · 조건 지식 몫 K · 판 중 ✗ · 첫 나옴 노출 */
export const kindOf = (_d: StageDef) => '한 방'; // ✏️ S067(M3″ S1): 모든 판 ★3 = 한 번에 H
/** [★2 조건, ★3 = 별 3개] — ✏️ S067(🧪 S066 🔴②): ★3 칸은 ★3 조건만이 아니라 별 3개 */
const sat = (d: StageDef, S: Sim) => [S.peak <= gapOf(d), starsOf(d, S) === 3];
const deadOf = dead3;
export function starOf(k: number, seeds = 24, sm?: ShopState[]) {
  const d = STAGES[k], ids = Array.from({ length: seeds }, (_, i) => 1000 + i * 7);
  const rate = (st: ShopState[]) => [0, 1].map((j) => +(st.filter((s) => s.phase === 'result' && s.ok && sat(d, s.S)[j]).length / st.length).toFixed(2));
  const smart = rate(sm ?? ids.map((x) => tryStage(screwshopSmart, x, k).s)), blind = rate(ids.map((x) => tryStage(screwshopBlind, x, k).s));
  let miss = 0, known = 0, seen = 0, falseDead = 0;
  for (const seed of ids) { // 🧪 S025 🔴: 판 중 ✗(못 땀)가 뜬 뒤에도 장인이 ★3을 따면 오판
    const s = g.create(seed); if (k) startStage(s, k);
    const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t; let dead = false;
    while (s.phase !== 'result' && s.t - t0 < 600 * 60) { g.step(s, screwshopSmart.act(s, rng)); if (s.phase === 'play') dead ||= deadOf(d, s.L, s.S); }
    falseDead += +(dead && s.phase === 'result' && s.ok && sat(d, s.S)[1]);
  }
  for (const seed of ids) { // 처음 봇: 결과 전에 ★ 칩 글 · 게이지가 움직였나(F25 노출) · 놓친 ★3을 판 중 ✗로 알았나
    const s = g.create(seed); if (k) startStage(s, k);
    const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t, c0 = JSON.stringify([starText(d, s.S).c2, starText(d, s.S).c3, gaugeOf(d, s.S)]);
    let dead = false, moved = false;
    while (s.phase !== 'result' && s.t - t0 < 600 * 60) {
      g.step(s, screwshopNewbie.act(s, rng));
      if (s.phase === 'play') (dead ||= deadOf(d, s.L, s.S)), (moved ||= JSON.stringify([starText(d, s.S).c2, starText(d, s.S).c3, gaugeOf(d, s.S)]) !== c0);
    }
    seen += +moved;
    if (s.phase === 'result' && s.ok && !sat(d, s.S)[1]) (miss++, (known += +dead));
  }
  return { kind: kindOf(d), smart, blind, k2: +(smart[0] - blind[0]).toFixed(2), k3: +(smart[1] - blind[1]).toFixed(2), seen: +(seen / seeds).toFixed(2), miss, known, falseDead };
}
export function starRead(rows: { slot: string; star: ReturnType<typeof starOf> }[]) {
  const first = new Map<string, [string, number]>(), mid: Record<string, [number, number]> = {};
  for (const r of rows) { if (!first.has(r.star.kind)) first.set(r.star.kind, [r.slot, r.star.seen]); const m = (mid[r.star.kind] ??= [0, 0]); (m[0] += r.star.known), (m[1] += r.star.miss); }
  return {
    kinds: first.size, changes: rows.filter((r, i) => i && r.star.kind !== rows[i - 1].star.kind).length, live3: STAGES.filter((d) => gaugeOf(d, { shot: 0, taps: 0, streak: 0, bonks: 0 } as Sim) !== gaugeOf(d, { shot: 1, taps: 1, streak: 1, bonks: 1 } as Sim)).length, // ✏️ S026: 칩 게이지가 판 중에 움직이는 판(쾅 판 = 쾅 진행)
    f25: [...first].map(([kd, [slot, v]]) => [kd, slot, v]), knownMid: Object.entries(mid).map(([kd, [a, n]]) => [kd, n ? +(a / n).toFixed(2) : null, n]),
    falseDead: rows.filter((r) => r.star.falseDead).map((r) => [r.slot, r.star.falseDead]), // 0이어야(✗ 오판)
    kHigh: rows.flatMap((r) => [[r.slot, '★2', r.star.k2], [r.slot, '★3', r.star.k3]]).filter((x) => (x[2] as number) >= 0.5),
  };
}

/** ✏️ S024(🧪 S024 ⑩): 단계별 배우기 짚기 도달률 — 처음 봇이 빈 저장으로 1-1부터 배움을 이어 가며, 배우는 판에서 짚기(그 별이 움직인 순간 한 줄)를 실제로 본 비율 */
export function ladder(seeds = 24, n = 5) {
  const hit = Array(n).fill(0), cnt = Array(n).fill(0), kind: string[] = Array(n).fill('');
  for (let i = 0; i < seeds; i++) {
    let learn = 0;
    for (let k = 0; k < n; k++) {
      const seed = 1000 + i * 7, s = g.create(seed); if (k) startStage(s, k);
      setLearn(s, learn);
      if (s.teach) cnt[k]++, (kind[k] = `★${s.teach} ${starKinds(STAGES[k])[s.teach - 2]}`);
      const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t;
      while (s.phase !== 'result' && s.t - t0 < 600 * 60) g.step(s, screwshopNewbie.act(s, rng));
      if (s.teach) hit[k] += +s.taught;
      learn = s.learn;
    }
  }
  return { stages: STAGES.slice(0, n).map((d, k) => [d.slot, kind[k], cnt[k] ? +(hit[k] / cnt[k]).toFixed(2) : null]), hit: +(hit.reduce((a, b) => a + b, 0) / Math.max(1, cnt.reduce((a, b) => a + b, 0))).toFixed(2) };
}

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
      // 📋 S017: 장치 F19 일괄(들어 있는 장치마다 끄기 낙차) · 카드 짝 3손(막 누르기 100시드 × 3손)
      // 📋 S019 FUN 개정: 월드 2·3 비소개 판은 24시드 막 누르기 클리어 ≥ .1이면 100시드로 ≤ .15를 판정
      if (/^[23]-/.test(STAGES[k].slot) && !INTRO.includes(STAGES[k].slot) && (row.mash as { clear: number }).clear >= 0.1) row.mash100 = +(Array.from({ length: 100 }, (_, i) => tryStage(screwshopMash, 1000 + i * 7, k).ok).filter(Boolean).length / 100).toFixed(2);
      row.f19 = Object.fromEntries(Object.entries(cnt(k)).filter(([, n]) => n > 0).map(([e]) => [e, f19(k, e, seeds)]));
      if (cnt(k)['🪟']) (row.seen = seen(k)), (row.f19n = f19n(k, '🪟', 4 * seeds)), (row.f19p = f19p(k, '🪟', 2 * seeds)); // 📋 S017 · S018: 🪟 = max(장인, 미리 보기 ★2+ 48시드) · 처음 봇은 같이 보는 지표 · 유리 밑 보이는 나사
      row.f16x3 = (({ airFails, pair, n, v21 }) => ({ airFails, pair, n, v21 }))(f16(k, 100, 3));
      row.star = starOf(k, seeds, keep[k].sm); // ✏️ S023(M2′ G6)
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
    ...(seeds >= 24 ? { ladder: ladder(seeds), starRead: starRead(stages as { slot: string; star: ReturnType<typeof starOf> }[]), twins2: twins2(stages.map((r, k) => ({ slot: r.slot as string, k, big: r.big as ReturnType<typeof bigOf> }))), twinsSame: twinsSame(stages.map((r, k) => ({ slot: r.slot as string, k, big: r.big as ReturnType<typeof bigOf> }))), skeletons: skeletons(), big96: stages.filter((r) => r.big96 !== undefined).map((r) => [r.slot, r.big96]), n3: stages.filter((r) => (r.big as ReturnType<typeof bigOf>).n3 !== undefined).map((r) => [r.slot, (r.big as ReturnType<typeof bigOf>).n3]), news: stages.filter((r) => r.news).map((r) => [r.slot, (r.news as { newbie: number }).newbie, (r.news as { mash: number }).mash, (r.news as { smart: number }).smart]),
      /** 📋 S017: 장치 F19 < .4 [자리, 장치, 낙차] — 판정은 M1′ 8판(id < 8) 밖만, M1′ 판은 f19m1(같이 보는 지표). 🪟는 max(장인, 처음 봇 96시드 f19n) · 카드 짝 3손(허공 ≥ 10) 최저 · .8 밑 판 */
      ...((low) => ({ f19low: low.filter((x) => (x[3] as number) >= 8 && DECOR[x[3] as number] !== x[1]).map((x) => x.slice(0, 3)), decor: low.filter((x) => DECOR[x[3] as number] === x[1]).map((x) => x.slice(0, 3)), f19m1: low.filter((x) => (x[3] as number) < 8).map((x) => x.slice(0, 3)) }))(stages.flatMap((r) => Object.entries((r.f19 ?? {}) as Record<string, number>).map(([e, v]) => [e, e === '🪟' ? Math.max(v, (r.f19p as number) ?? 0) : v] as const).filter(([, v]) => v < 0.4).map(([e, v]) => [r.slot, e, v, r.id]))),
      /** 📋 S017 · S018: 🪟 판 [자리, 유리 밑 보이는 나사, 장인 F19, 미리 보기 ★2+ 낙차(48시드), 처음 봇(96시드 · 같이 보는 지표)] · glassDecide = '🪟 결정 판'(보이는 나사 ≥ 3 · 장인 ≥ .4 · 미리 보기 ≥ .1 셋 다 · M1′ 밖) */
      /** 📋 S019: 막 누르기 클리어 100시드 [자리, 24시드, 100시드] · .15 넘는 판 */
      mash100: stages.filter((r) => r.mash100 !== undefined).map((r) => [r.slot, (r.mash as { clear: number }).clear, r.mash100]),
      mash100low: stages.filter((r) => (r.mash100 as number) > 0.15).map((r) => [r.slot, r.mash100]),
      glass: stages.filter((r) => r.seen !== undefined).map((r) => [r.slot, r.seen, (r.f19 as Record<string, number>)['🪟'], r.f19p, r.f19n]),
      glassDecide: stages.filter((r) => r.seen !== undefined && (r.id as number) >= 8 && (r.seen as number) >= 3 && (r.f19 as Record<string, number>)['🪟'] >= 0.4 && (r.f19p as number) >= 0.1).map((r) => r.slot),
      pairMin3: Math.min(...stages.map((r) => r.f16x3 as { airFails: number; pair: number | null }).filter((f) => f && f.airFails >= 10).map((f) => f.pair!)),
      pair3low: stages.filter((r) => { const f = r.f16x3 as { airFails: number; pair: number | null }; return f && f.airFails >= 10 && f.pair! < 0.8; }).map((r) => [r.slot, (r.f16x3 as { pair: number }).pair]) } : {}),
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
  const build = /빌드 (M[\d.′″]+(?:-S\d+)?)/.exec(readFileSync(join(import.meta.dirname, 'index.html'), 'utf8'))?.[1] ?? '?'; // 🧪: 'M0' 고정 → 실제 빌드
  const tray = n >= 24 ? trayRead() : undefined; // ✏️ S064(M3′ F30 · F31): 원래 칸과 따로 둔다(원래 칸 바이트 같음을 보려고)
  const stars = n >= 24 ? starFloor(n) : undefined; // ✏️ S067(M3″ F36~F39): 위와 같은 까닭으로 따로
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify({ at: new Date().toISOString().slice(0, 10), build, ...rep, tray, stars }, null, 1) + '\n');
  console.log(JSON.stringify(rep.summary), `${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const r of rep.stages) console.log(r.stage, r.name, ...Object.keys(BOTS).map((b) => `${b} ${JSON.stringify(r[b])}`));
  if (tray) console.log('tray', JSON.stringify(tray));
  if (stars) console.log('stars', JSON.stringify({ ...stars, per: undefined }));
}
