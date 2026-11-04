/**
 * 규칙 세트의 "퍼즐로서의 품질"을 숫자로 측정한다. 공장 루프의 핵심 계기판.
 *   npm run evaluate -- [--rules echo] [--n 15]
 * 지표 정의는 scripts/lib/evaluate.ts 참고.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRules } from '../engine/rules/index.ts';
import { evaluateRules } from './lib/evaluate.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const rulesId = arg('rules', 'echo');
const report = { ...evaluateRules(getRules(rulesId), Number(arg('n', '15'))), generatedAt: new Date().toISOString() };
const dir = join(import.meta.dirname, '..', 'factory', 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${rulesId}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
