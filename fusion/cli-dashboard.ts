/**
 * 계기판 아티팩트 생성 (실험 0003). 사이클마다 돌려 `fusion/reports/dashboard.html`을 만들고,
 * 운영자가 그 파일을 아티팩트(slug는 STATE.md)로 다시 게시한다.
 *
 *   npx tsx fusion/cli-dashboard.ts [--cycle 0003]
 */
import { build } from 'esbuild';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ATOMS } from './atoms.ts';
import type { AbDecision, AbRound, Baseline } from './cli-ab.ts';
import { ruleExamples } from './examples.ts';
import { FUN_LABEL, FUN_PARTS, type FunReport } from './fun.ts';
import { allSpecs, atomsOf, fusionId, parseFusionId } from './spec.ts';

const root = import.meta.dirname;
const read = <T>(p: string, d: T): T => (existsSync(join(root, p)) ? (JSON.parse(readFileSync(join(root, p), 'utf8')) as T) : d);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');

const state = readFileSync(join(root, 'STATE.md'), 'utf8');
const field = (k: string) => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(state)?.[1].trim() ?? '?';
const status = field('상태');
const lastCycle = field('마지막 사이클');
const fails = field('연속 실패');
const cycleArg = process.argv.includes('--cycle') ? process.argv[process.argv.indexOf('--cycle') + 1] : /^(\d{4})/.exec(lastCycle)?.[1] ?? '????';

interface Disc { id: string; name: string; fitness: number; synergy: number; necessityMin: number; ingredients: { id: string; name: string; origin: string }[] }
const ledger = read<{ tested: Record<string, unknown> }>('ledger.json', { tested: {} }).tested;
const discoveries = read<Disc[]>('discoveries/index.json', []);
const fun = read<Record<string, FunReport>>('reports/fun.json', {});
const cur = read<AbRound | null>('ab/current.json', null);
const baseline = read<Baseline | null>('ab/baseline.json', null);
const history = read<AbDecision[]>('ab/history.json', []);
const specs = allSpecs();
const tested = specs.filter((s) => ledger[fusionId(s)]);
const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

// 진척 기록: 사이클마다 한 줄 (같은 사이클은 덮어씀)
const progress = read<{ cycle: string; tested: number; total: number; discoveries: number }[]>('reports/progress.json', []);
const row = { cycle: cycleArg, tested: tested.length, total: specs.length, discoveries: discoveries.length };
const at = progress.findIndex((p) => p.cycle === cycleArg);
if (at >= 0) progress[at] = row;
else progress.push(row);
writeFileSync(join(root, 'reports', 'progress.json'), JSON.stringify(progress, null, 1) + '\n');

// 원자별 기여
const atomRows = Object.values(ATOMS).map((a) => {
  const t = tested.filter((s) => atomsOf(s).some((x) => x.id === a.id)).length;
  const d = discoveries.filter((x) => x.ingredients.some((i) => i.id === a.id)).length;
  return { a, t, d, rate: t ? d / t : 0 };
}).sort((x, y) => y.rate - x.rate || y.d - x.d);

const pct = (x: number) => `${Math.round(x * 100)}%`;
const f3 = (x: number | undefined) => (x === undefined ? '–' : x.toFixed(3));

function chips(id: string) {
  return atomsOf(parseFusionId(id)!).map((a) => `<li title="${esc(a.origin)}">${esc(a.name)}</li>`).join('');
}

function sideCard(key: 'A' | 'B', s: AbRound['A'], other: AbRound['A'], kind: AbRound['kind']) {
  const bars = FUN_PARTS.map((k) => {
    const v = s.fun.parts[k], o = other.fun.parts[k];
    return `<div class="bar"><span>${FUN_LABEL[k]}</span><i style="--v:${(v * 100).toFixed(0)}%" class="${v > o + 0.03 ? 'up' : ''}"></i><b>${v.toFixed(2)}</b></div>`;
  }).join('');
  const role = kind === 'challengers' ? `쉬운 후보 ${key === 'A' ? 1 : 2} · 이해도 ${s.fun.parts.clarity.toFixed(2)}` : key === 'A' ? '기존 아이디어 · 지금 데일리 규칙' : '새 아이디어 · 도전자';
  return `<article class="side side-${key}">
  <header><span class="tag">${key}</span><div><p class="eyebrow">${role}</p><h3>${esc(s.name)}</h3></div></header>
  <ul class="chips">${chips(s.id)}</ul>
  <p class="score"><b>${s.fun.fun.toFixed(3)}</b> <span>재미 ± ${s.fun.se.toFixed(3)} · 퍼즐 ${s.fun.n}개</span></p>
  <div class="bars">${bars}</div>
  <div class="player" data-player="${key}"></div>
</article>`;
}

let abHtml = '<p class="muted">진행 중인 A|B가 없습니다. 다음 사이클에 새 후보를 고릅니다.</p>';
if (cur) {
  const pending = cur.status === 'pending';
  const verdict = cur.machinePick === '동률' ? '두 안의 차이가 오차 범위 안이라 기계 판정은 동률입니다.' : `기계 판정은 <b>${cur.machinePick}</b>입니다 (차이 ${cur.diff > 0 ? '+' : ''}${cur.diff.toFixed(3)}, z = ${cur.z}).`;
  abHtml = `<div class="ab-head">
  <span class="pill ${pending ? 'wait' : 'done'}">${pending ? '오너 선택 대기' : '결정됨'}</span>
  <p>${pending && cur.kind === 'challengers' ? '지난 라운드 피드백(“너무 복잡해서 이해하기 어렵다”)을 반영해, 규칙이 두 줄뿐인 쉬운 후보 둘을 골랐습니다. 지금 규칙은 이해도 미달이라 이번엔 빠졌습니다. <b>채팅에 “A” 또는 “B”라고 답해 주세요.</b> 고른 쪽이 새 데일리 규칙(기준선)이 됩니다.' : pending ? '두 퍼즐을 직접 풀어 보고, <b>채팅에 “A” 또는 “B”라고 답해 주세요.</b> 고른 쪽이 다음 데일리 규칙(기준선)이 되고, 공장은 그 기준선에 도전할 새 아이디어를 찾습니다.' : '이 라운드는 결정됐습니다. 다음 사이클에 새 도전자를 고릅니다.'} ${verdict} 재미 점수는 풀이 기록에서 뽑은 추정치라서, 최종 판단은 직접 풀어 본 느낌으로 해 주세요.</p>
</div>
<div class="ab">${sideCard('A', cur.A, cur.B, cur.kind)}${sideCard('B', cur.B, cur.A, cur.kind)}</div>`;
}

const discRows = discoveries.map((d, i) => {
  const mark = d.id === cur?.A.id ? '<span class="mini a">A</span>' : d.id === cur?.B.id ? '<span class="mini b">B</span>' : '';
  return `<tr><td class="num">${i + 1}</td><td>${esc(d.name)} ${mark}</td><td class="ing">${d.ingredients.map((x) => esc(x.name)).join(' × ')}</td><td class="num">${f3(d.fitness)}</td><td class="num">${f3(fun[d.id]?.fun)}</td><td class="num">${f3(fun[d.id]?.parts.clarity)}</td><td class="num">${d.synergy.toFixed(2)}</td><td class="num">${d.necessityMin.toFixed(2)}</td></tr>`;
}).join('');

const atomTable = atomRows.map(({ a, t, d, rate }) => `<tr><td>${esc(a.name)}</td><td class="ing">${esc(a.origin)}</td><td class="num">${t}</td><td class="num">${d}</td><td class="num"><span class="meter" style="--v:${(rate * 100).toFixed(0)}%"></span>${pct(rate)}</td></tr>`).join('');

const maxD = Math.max(1, ...progress.map((p) => p.discoveries));
const step = 84, bw = 40, top = 24, chartH = 140, chartW = Math.max(360, 60 + progress.length * step);
const chart = `<svg viewBox="0 0 ${chartW} ${top + chartH + 40}" role="img" aria-label="사이클별 누적 발견 수">
${[0, 0.5, 1].map((g) => `<line x1="30" x2="${chartW}" y1="${top + chartH * (1 - g)}" y2="${top + chartH * (1 - g)}" class="grid"/><text x="24" y="${top + 4 + chartH * (1 - g)}" class="ax" text-anchor="end">${Math.round(maxD * g)}</text>`).join('')}
${progress.map((p, i) => {
  const x = 50 + i * step, hgt = (p.discoveries / maxD) * chartH, cx = x + bw / 2;
  return `<rect x="${x}" y="${top + chartH - hgt}" width="${bw}" height="${hgt}" rx="3" class="${i === progress.length - 1 ? 'last' : 'col'}"/><text x="${cx}" y="${top + chartH - hgt - 6}" class="val" text-anchor="middle">${p.discoveries}</text><text x="${cx}" y="${top + chartH + 18}" class="ax" text-anchor="middle">${p.cycle}</text><text x="${cx}" y="${top + chartH + 33}" class="ax" text-anchor="middle">${p.tested}개 시험</text>`;
}).join('')}
</svg>`;

const journal = readFileSync(join(root, 'JOURNAL.md'), 'utf8').split(/^## /m).slice(1, 4).map((e) => {
  const [title, ...lines] = e.trim().split('\n');
  return `<article class="entry"><h4>${md(title)}</h4><ul>${lines.filter((l) => l.startsWith('- ')).map((l) => `<li>${md(l.slice(2))}</li>`).join('')}</ul></article>`;
}).join('');

const histRows = history.length
  ? history.map((h) => `<tr><td class="num">${h.round}</td><td>${h.at}</td><td>${esc(h.A)}</td><td>${esc(h.B)}</td><td>${h.machinePick}</td><td><b>${h.ownerPick === 'none' ? '둘 다 아님' : h.ownerPick}</b>${h.note ? `<br><span class="muted">${esc(h.note)}</span>` : ''}</td></tr>`).join('')
  : '<tr><td colspan="6" class="muted">아직 오너 선택 기록이 없습니다. 첫 선택부터 재미 지표 가중치 보정에 씁니다.</td></tr>';

const bundle = (await build({ entryPoints: [join(root, 'dashboard', 'player.ts')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2022' })).outputFiles[0].text;
const abData = cur
  ? JSON.stringify({ A: cur.A, B: cur.B, examples: { ...ruleExamples(parseFusionId(cur.A.id)!), ...ruleExamples(parseFusionId(cur.B.id)!) } }).replace(/</g, '\\u003c')
  : '{}';
const css = readFileSync(join(root, 'dashboard', 'style.css'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>발견 공장 계기판</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<main>
<header class="top">
  <div><p class="eyebrow">교차점 · 발견 공장</p><h1>발견 공장 계기판</h1></div>
  <p class="meta"><span class="pill ${status === 'RUNNING' ? 'ok' : 'bad'}">${esc(status)}</span> 사이클 ${esc(cycleArg)} · ${now} 갱신</p>
</header>

<section class="tiles" aria-label="요약">
  <div class="tile"><p>시험한 조합</p><b>${tested.length}<small> / ${specs.length}</small></b><span class="meter wide" style="--v:${((tested.length / specs.length) * 100).toFixed(1)}%"></span></div>
  <div class="tile"><p>발견</p><b>${discoveries.length}</b><span class="sub">fitness 1위 ${esc(discoveries[0]?.name ?? '–')}</span></div>
  <div class="tile"><p>기준선 (데일리 규칙)</p><b class="name">${esc(baseline?.name ?? '–')}</b><span class="sub">${baseline ? `${esc(baseline.since)}부터` : ''}</span></div>
  <div class="tile"><p>연속 실패</p><b>${esc(fails)}</b><span class="sub">3이면 공장이 멈춥니다</span></div>
</section>

<section id="ab" aria-labelledby="ab-h">
  <h2 id="ab-h">A|B 라운드 ${cur?.round ?? '–'}</h2>
  ${abHtml}
</section>

<section aria-labelledby="disc-h">
  <h2 id="disc-h">발견 순위</h2>
  <p class="muted">fitness = 생성 품질(적중률·단서 밀도·융합도·필수성). 재미 = 이해도(규칙 수·낯섦, 가중치 2)와 풀이 흐름(아하·열쇠·맞물림·고른 재료·머릿속 부담·간결함)의 가중 기하평균. 이해도 0.7 미만은 A|B에 오르지 않습니다.</p>
  <div class="scroll"><table><thead><tr><th>#</th><th>이름</th><th>재료</th><th>fitness</th><th>재미</th><th>이해도</th><th>융합도</th><th>필수성</th></tr></thead><tbody>${discRows}</tbody></table></div>
</section>

<div class="two">
<section aria-labelledby="prog-h"><h2 id="prog-h">누적 발견</h2><div class="chart">${chart}</div></section>
<section aria-labelledby="atom-h"><h2 id="atom-h">원자별 발견율</h2>
  <div class="scroll"><table><thead><tr><th>원자</th><th>출처</th><th>시험</th><th>발견</th><th>발견율</th></tr></thead><tbody>${atomTable}</tbody></table></div>
</section>
</div>

<section aria-labelledby="hist-h"><h2 id="hist-h">A|B 이력</h2>
  <div class="scroll"><table><thead><tr><th>라운드</th><th>날짜</th><th>A</th><th>B</th><th>기계 추천</th><th>오너 선택</th></tr></thead><tbody>${histRows}</tbody></table></div>
</section>

<section aria-labelledby="j-h"><h2 id="j-h">최근 일지</h2><div class="journal">${journal}</div></section>
</main>
<script id="ab-data" type="application/json">${abData}</script>
<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
writeFileSync(join(root, 'reports', 'dashboard.html'), html);
console.log(`dashboard: ${(html.length / 1024).toFixed(1)} KB · 사이클 ${cycleArg} · 시험 ${tested.length}/${specs.length} · 발견 ${discoveries.length}`);
