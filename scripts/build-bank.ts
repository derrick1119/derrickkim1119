/**
 * 데일리 퍼즐 은행을 채운다. 이미 존재하는 날짜 파일은 절대 덮어쓰지 않는다
 * (플레이어가 이미 푼 퍼즐이 바뀌면 안 됨).
 *
 *   npm run bank -- --days 60 [--from 2026-11-05] [--rules echo]
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDays, LAUNCH_DATE, WEEKDAY_PLAN, weekday } from '../engine/daily.ts';
import { generate, BANK_ATTEMPTS } from '../engine/generator.ts';
import { hashString } from '../engine/rng.ts';
import { getRules } from '../engine/rules/index.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const days = Number(arg('days', '60'));
const from = arg('from', LAUNCH_DATE);
const rulesId = arg('rules', 'echo');
const rules = getRules(rulesId);

const dir = join(import.meta.dirname, '..', 'web', 'public', 'puzzles');
mkdirSync(dir, { recursive: true });

let made = 0;
for (let i = 0; i < days; i++) {
  const date = addDays(from, i);
  const file = join(dir, `${date}.json`);
  if (existsSync(file)) continue;
  const plan = WEEKDAY_PLAN[weekday(date)];
  const seed = hashString(`${rulesId}:${date}`);
  const p = generate(rules, { width: plan.size, height: plan.size, seed, target: plan.tier, attempts: BANK_ATTEMPTS });
  if (!p) throw new Error(`generation failed for ${date}`);
  if (p.difficulty.tier !== plan.tier) console.warn(`${date}: wanted ${plan.tier}, got ${p.difficulty.tier}`);
  writeFileSync(file, JSON.stringify({ date, ...p }) + '\n');
  made++;
}

const dates = readdirSync(dir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .map((f) => f.slice(0, 10))
  .sort();
writeFileSync(join(dir, 'index.json'), JSON.stringify({ launch: LAUNCH_DATE, dates }, null, 0) + '\n');
console.log(`bank: +${made} new, ${dates.length} total (${dates[0]} … ${dates.at(-1)})`);
