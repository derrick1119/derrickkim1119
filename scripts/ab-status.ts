/**
 * A|B 라운드 대기 상태 점검 (사이클 3½단계에서 판정이 없을 때 실행).
 *   npm run ab:status
 * 24시간 넘게 열린 라운드는 STATE '오너에게'에 한 번만 리마인드하고 rounds.json에 remindedAt을 남긴다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addReminder, needsReminder, roundAgeHours } from './lib/ab.ts';

const root = join(import.meta.dirname, '..');
const roundsPath = join(root, 'factory/ab/rounds.json');
const statePath = join(root, 'factory/STATE.md');
const data = JSON.parse(readFileSync(roundsPath, 'utf8'));
const r = data.rounds.at(-1);
const now = new Date();
const age = roundAgeHours(r, now);
console.log(`${r.round}라운드: ${r.winner ?? '대기 중'}, 열린 지 ${age === null ? '?' : age.toFixed(1)}시간`);
if (needsReminder(r, now)) {
  writeFileSync(statePath, addReminder(readFileSync(statePath, 'utf8'), r, age!));
  r.remindedAt = now.toISOString();
  writeFileSync(roundsPath, JSON.stringify(data, null, 2) + '\n');
  console.log('리마인드 추가 (한 번만)');
}
