/**
 * 교차점 데일리 은행. 오너가 A|B로 고른 기준선(fusion/ab/baseline.json) 규칙으로 퍼즐을 만든다.
 * 퍼즐 파일에 조합 id가 들어 있어서, 챔피언이 바뀌어도 지난 날짜 퍼즐은 그대로 플레이된다.
 * 기존 날짜 파일은 절대 덮어쓰지 않는다.
 *
 *   npm run fusion:bank -- [--days 60]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDays, weekday } from '../engine/daily.ts';
import { hashString } from '../engine/rng.ts';
import { FUSION_LAUNCH, FUSION_WEEKDAY } from './daily.ts';
import { generateFusion } from './generator.ts';
import { fitsBoard, parseFusionId } from './spec.ts';

const args = process.argv.slice(2);
const days = Number(args.includes('--days') ? args[args.indexOf('--days') + 1] : '60');
const dir = join(import.meta.dirname, '..', 'web', 'public', 'fusion', 'daily');
const discoveries: { id: string; name: string }[] = JSON.parse(readFileSync(join(import.meta.dirname, 'discoveries', 'index.json'), 'utf8'));
const baselinePath = join(import.meta.dirname, 'ab', 'baseline.json');
const baseline: { id: string; name: string } | null = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : null;
if (!discoveries.length) throw new Error('발견이 아직 없습니다. npm run fusion:search 먼저.');

let made = 0;
for (let i = 0; i < days; i++) {
  const date = addDays(FUSION_LAUNCH, i);
  const file = join(dir, `${date}.json`);
  if (existsSync(file)) continue;
  const plan = FUSION_WEEKDAY[weekday(date)];
  // 오너가 A|B로 고른 기준선(실험 0003)이 우선, 판에 안 맞으면 판 크기에 맞는 가장 높은 발견
  const champ = [baseline, ...discoveries].find((d) => d && fitsBoard(parseFusionId(d.id)!, plan.size, plan.size))!;
  const spec = parseFusionId(champ.id)!;
  const p = generateFusion(spec, { width: plan.size, height: plan.size, seed: hashString(`fusion:${date}`), target: plan.tier, attempts: 60 });
  if (!p) throw new Error(`generation failed ${date} ${champ.id}`);
  if (p.difficulty.tier !== plan.tier) console.warn(`${date}: wanted ${plan.tier}, got ${p.difficulty.tier}`);
  writeFileSync(file, JSON.stringify({ date, name: champ.name, ...p }) + '\n');
  made++;
}
const dates = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 10)).sort();
writeFileSync(join(dir, 'index.json'), JSON.stringify({ launch: FUSION_LAUNCH, dates }) + '\n');
console.log(`fusion bank: +${made}, total ${dates.length} (${dates[0]} … ${dates.at(-1)}) · baseline ${baseline?.id ?? discoveries[0].id}`);
