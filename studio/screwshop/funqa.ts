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
import { STAGES, apply, cloneSim, freeM, stuckM, viewOf, screwshop as g, screwshopHabit, screwshopRandom, screwshopSmart, startStage, starsOf, type Level, type ShopState, type Sim } from './game.ts';

export interface Try { ok: boolean; stars: number; sec: number; peak: number; best: number; shot: number; taps: number; /** 끝난 판(되짚기·F13용) */ s: ShopState }

/** k판을 한 번 도전(첫 결과가 나올 때까지) */
export function tryStage(bot: Bot<ShopState>, seed: number, k: number, maxSec = 600, hand = seed): Try {
  const s = g.create(seed);
  if (k) startStage(s, k);
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

/** 한 판만 빠르게 (테스트용): 봇별 클리어·★3 */
export function measureStage(k: number, seeds: number, bots: (keyof typeof BOTS)[]) {
  return Object.fromEntries(bots.map((b) => {
    const r = Array.from({ length: seeds }, (_, i) => tryStage(BOTS[b], 1000 + i * 7, k));
    return [b, { clear: r.filter((x) => x.ok).length / seeds, star3: r.filter((x) => x.stars === 3).length / seeds }];
  })) as Record<string, { clear: number; star3: number }>;
}

export function measure(seeds = 12) {
  const stages = STAGES.map((d, k) => {
    const row: Record<string, unknown> = { stage: k + 1, name: `${d.emoji} ${d.name}` };
    for (const [name, bot] of Object.entries(BOTS)) {
      const r = Array.from({ length: seeds }, (_, i) => tryStage(bot, 1000 + i * 7, k));
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
    let first = 0, three = 0, fails = 0, hit = 0;
    for (let i = 0; i < seeds; i++) {
      const tries = [0, 1, 2].map((j) => tryStage(screwshopNewbie, 1000 + i * 7, k, 600, 1000 + i * 7 + j * 100003)); // 같은 판 다시 3번
      first += +tries[0].ok;
      three += +tries.some((x) => x.ok);
      for (const x of tries) if (!x.ok && x.s.blame) (fails++, (hit += +pnrHit(x.s)));
    }
    row.newbie = { clear1: +(first / seeds).toFixed(2), clear3: +(three / seeds).toFixed(2), fails, f13: fails ? +(hit / fails).toFixed(2) : null };
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
    /** 🧪 F13 되짚기 정확도: 3~8판 중 처음 봇 실패 10건 이상인 판의 최저 (M1′ ① ≥ 0.8) */
    f13_38min: Math.min(...stages.slice(2).map((r) => r.newbie as Record<string, number>).filter((n) => n.fails >= 10).map((n) => n.f13)),
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
