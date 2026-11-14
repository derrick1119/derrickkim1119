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
import { STAGES, apply, cloneSim, freeM, stuckM, viewOf, screwshop as g, screwshopHabit, screwshopRandom, screwshopSmart, startStage, starsOf, type ShopState } from './game.ts';

export interface Try { ok: boolean; stars: number; sec: number; peak: number; best: number; shot: number }

/** k판을 한 번 도전(첫 결과가 나올 때까지) */
export function tryStage(bot: Bot<ShopState>, seed: number, k: number, maxSec = 600): Try {
  const s = g.create(seed);
  if (k) startStage(s, k);
  const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t;
  while (s.phase !== 'result' && s.t - t0 < maxSec * 60) g.step(s, bot.act(s, rng));
  const ok = s.phase === 'result' && s.ok;
  return { ok, stars: ok ? starsOf(STAGES[k], s.S) : 0, sec: (s.t - t0) / 60, peak: s.S.peak, best: s.S.best, shot: s.S.shot };
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

export const BOTS = { smart: screwshopSmart, habit: screwshopHabit, random: screwshopRandom, mash: screwshopMash, preview: screwshopPreview };

export function measure(seeds = 12) {
  const stages = STAGES.map((d, k) => {
    const row: Record<string, unknown> = { stage: k + 1, name: `${d.emoji} ${d.name}` };
    for (const [name, bot] of Object.entries(BOTS)) {
      const r = Array.from({ length: seeds }, (_, i) => tryStage(bot, 1000 + i * 7, k));
      row[name] = {
        clear: +(r.filter((x) => x.ok).length / seeds).toFixed(2),
        star3: +(r.filter((x) => x.stars === 3).length / seeds).toFixed(2),
        stars: +(r.reduce((a, x) => a + x.stars, 0) / seeds).toFixed(2),
        sec: +(r.reduce((a, x) => a + x.sec, 0) / seeds).toFixed(1),
        /** 한 방: 톡 한 번에 빠진 나사 수 최대(판 평균) */
        shot: +(r.reduce((a, x) => a + x.shot, 0) / seeds).toFixed(2),
      };
    }
    return row;
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
    /** 🧪 F4: 미리 보기 따라 하기 ★3 (3~8판 평균, 낮을수록 미리 보기가 정답 안내가 아니다) */
    previewStar3_38: +(stages.slice(2).reduce((a, r) => a + (r.preview as Record<string, number>).star3, 0) / (stages.length - 2)).toFixed(2),
    /** 한 방 최대 판 평균: 장인 / 막 누르기 (M1′ ②: 장인 ≥ 3 · 막 누르기 ≤ 1.5) */
    smartShot: avg('smart', 'shot'), mashShot: avg('mash', 'shot'),
    smartSec: avg('smart', 'sec'),
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
