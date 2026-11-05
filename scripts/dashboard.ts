/**
 * 계기판 생성: 저장소의 상태·보고서·일지로 dashboard-dist/ 를 만든다 (index.html + play/ = 빌드된 게임).
 *   npm run build && npm run dashboard
 * 사이클 마지막에 이 폴더를 계기판 아티팩트로 다시 게시한다 (CLAUDE.md "한 사이클" 12단계).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { getRules } from '../engine/rules/index.ts';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const json = (p: string) => JSON.parse(read(p));
const now = new Date();

// 상태
const state = read('factory/STATE.md');
const pick = (re: RegExp) => re.exec(state)?.[1]?.trim() ?? '?';
const st = { status: pick(/상태:\s*(\S+)/), lastCycle: pick(/마지막 사이클:\s*(\d+)/), fails: pick(/연속 실패:\s*(\d+)/) };

// 일정: 매 6시간 22분(UTC 0,6,12,18시) — 예약 작업과 같은 식
const kst = (d: Date) => {
  const k = new Date(d.getTime() + 9 * 3600_000);
  const wd = '일월화수목금토'[k.getUTCDay()];
  const hm = `${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}`;
  return { long: `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일(${wd}) ${hm}`, short: `${k.getUTCMonth() + 1}/${k.getUTCDate()} ${hm}` };
};
const slots: Date[] = [];
for (let t = new Date(now); slots.length < 4; ) {
  t = new Date(t.getTime() + 60_000);
  if (t.getUTCHours() % 6 === 0 && t.getUTCMinutes() === 22) slots.push(new Date(t));
  else t.setUTCSeconds(0, 0);
}
const open = read('factory/BACKLOG.md').split('\n').filter((l) => l.startsWith('- [ ]'))
  .map((l) => (/\*\*(.+?)\*\*/.exec(l)?.[1] ?? l.slice(6, 50)).replace(/[*`]/g, ''));
const schedule = slots.map((d, i) => ({
  cycle: String(Number(st.lastCycle) + 1 + i).padStart(4, '0'),
  kst: kst(d).long,
  short: kst(d).short,
  task: open[i] ?? '새 가설',
}));

// A|B
const rounds = json('factory/ab/rounds.json');
const round = rounds.rounds.at(-1);
const ab = existsSync(join(root, 'factory/reports/ab.json')) ? json('factory/reports/ab.json') : null;
const all = ab ? [ab.a, ...ab.candidates] : [];
const funOf = (id: string) => {
  const r = all.find((x: { id: string }) => x.id === id);
  const t = r ? ['medium', 'hard', 'expert'].map((k) => r.tiers[k]) : [];
  const avg = (k: string) => (t.length ? t.reduce((s, x) => s + x[k], 0) / t.length : 0);
  return { fun: r?.fun ?? 0, tension: avg('tension'), spread: avg('spread'), aha: avg('aha'), fitness: r?.fitness ?? 0 };
};
const sideOf = (id: string, title: string) => ({ id, title, rules: getRules(id).rules, ...funOf(id) });
const A = sideOf(round.a, round.a === 'echo' ? '메아리 (현재 제품)' : (round.aName ?? round.a));
const B = sideOf(round.b, round.bName ?? round.b);
const pct = (x: number, y: number) => `${x > y ? '+' : ''}${Math.round(((x - y) / Math.max(1e-9, y)) * 100)}%`;
const why = [
  `단순함 게이트 통과: B의 숫자는 숫자 칸에서 뻗은 대각선 두 줄만 셉니다. 1라운드(메아리 vs 마름모 메아리)는 "규칙 이해가 어렵다"는 피드백으로 무효 처리했어요.`,
  `기계 판정: 재미 B ${B.fun.toFixed(3)} vs A ${A.fun.toFixed(3)} (${pct(B.fun, A.fun)}), fitness B ${B.fitness.toFixed(3)} vs A ${A.fitness.toFixed(3)} (${pct(B.fitness, A.fitness)}).`,
  `긴장은 '확정할 수 있는 칸이 2개 이하인 순간'의 비율, 퍼짐은 다음 추론이 판의 먼 곳에서 나오는 정도, 아하는 어려운 추론 한 번이 풀어주는 칸 수입니다. 기계는 재미를 대신 잴 뿐이라 최종 판정은 직접 풀어본 감각으로 해주세요.`,
  `B를 고르면 데일리 규칙이 B로 바뀝니다. 이미 만들어 둔 날짜의 퍼즐은 바꾸지 않는 규칙이 있어, 은행의 마지막 날짜 다음 날부터 B 퍼즐이 나갑니다.`,
];

// 후보 표
const candidates = all.map((r: any) => ({
  id: r.id,
  role: r.id === round.a ? 'A' : r.id === round.b ? 'B' : '',
  fun: r.fun, funSd: r.funSd, fitness: r.fitness,
  minHit: Math.min(...Object.values(r.tiers).map((t: any) => t.hitRate)),
  hardMs: r.tiers.hard.genMs, eligible: r.eligible,
})).sort((x: any, y: any) => y.fun - x.fun);

// 제품
const dates: string[] = json('web/public/puzzles/index.json').dates;
// 메아리 번들 = fusion(발견 공장) 청크를 뺀 JS 전부
const assets = existsSync(join(root, 'dist/assets'))
  ? readdirSync(join(root, 'dist/assets')).filter((f) => f.endsWith('.js') && !f.startsWith('fusion'))
  : [];
const gzBytes = assets.reduce((a, f) => a + gzipSync(readFileSync(join(root, 'dist/assets', f))).length, 0);
const gz = assets.length ? (gzBytes / 1024).toFixed(2) + 'KB' : '?';
const product = {
  facts: [['데일리 은행', `${dates[0].slice(5)} → ${dates.at(-1)!.slice(5)} (${dates.length}일)`], ['JS gzip', `${gz} / 30KB`], ['챔피언', rounds.champion]],
  note: '은행이 30일 아래로 내려가면 공장이 자동으로 90일치를 추가합니다.',
};

// 일지 (최근 5개)
const journal = read('factory/JOURNAL.md').split('\n## ').slice(1, 6).map((sec) => {
  const [head, ...lines] = sec.split('\n');
  const m = /^(\d{4})\s*—\s*\S+\s*·\s*(.+)$/.exec(head.trim());
  const res = lines.find((l) => l.startsWith('- **결과**'))?.replace(/^- \*\*결과\*\*:\s*/, '') ?? '';
  return { n: m?.[1] ?? '', title: m?.[2] ?? head, result: res.replace(/[*`]/g, '') };
});

const data = { generatedAt: kst(now).long, state: st, schedule, ab: { round, a: A, b: B, why }, candidates, product, journal };
const out = join(root, 'dashboard-dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const html = read('scripts/dashboard/template.html').replace('/*DATA*/', JSON.stringify(data).replace(/</g, '\\u003c'));
writeFileSync(join(out, 'index.html'), html);
// play/ = 플레이테스트용 메아리만 (발견 공장 제품·데일리 은행은 뺀다 — 계기판은 #play= 모드만 쓴다)
if (existsSync(join(root, 'dist'))) {
  cpSync(join(root, 'dist'), join(out, 'play'), {
    recursive: true,
    filter: (src) => !/[\\/](fusion[^\\/]*|puzzles)$/.test(src),
  });
}
console.log(`dashboard-dist/ written (${schedule[0].kst} 다음 실행, A=${A.id} B=${B.id})`);
