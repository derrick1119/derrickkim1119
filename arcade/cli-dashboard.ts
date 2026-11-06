/**
 * 아케이드 공장 계기판 (실험 0011). A|B 두 게임을 페이지 안에서 바로 플레이할 수 있게 묶는다.
 *   npx tsx arcade/evaluate.ts && npx tsx arcade/cli-dashboard.ts --cycle 0011
 * → arcade/reports/dashboard.html (아티팩트로 게시, slug는 arcade/STATE.md)
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GENES } from './core.ts';
import type { ArcadeReport } from './evaluate.ts';
import { GAMES } from './registry.ts';

const root = import.meta.dirname;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const cycle = process.argv.includes('--cycle') ? process.argv[process.argv.indexOf('--cycle') + 1] : '????';
const evals: Record<string, ArcadeReport> = JSON.parse(readFileSync(join(root, 'reports', 'eval.json'), 'utf8'));
const ab: { champion: string | null; rounds: { round: number; openedAt: string; A: string; B: string; winner: string | null; note?: string }[] } = JSON.parse(readFileSync(join(root, 'ab.json'), 'utf8'));
const cur = ab.rounds.at(-1)!;
const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const LABEL: Record<string, string> = { skill: '실력이 통하나', onboarding: '처음 해도 버티나', session: '한 판 길이', simplicity: '단순함' };

function card(key: 'A' | 'B', id: string, other: string) {
  const g = GAMES.find((e) => e.game.id === id)!.game, r = evals[id], o = evals[other];
  const bars = Object.entries(r.parts).map(([k, v]) => {
    const up = v > (o.parts as Record<string, number>)[k] + 0.03;
    return `<div class="bar"><span>${LABEL[k]}</span><i style="--v:${Math.round(v * 100)}%" class="${up ? 'up' : ''}"></i><b>${v.toFixed(2)}</b></div>`;
  }).join('');
  const genes = g.genes.map((x) => `<li><b>${esc(GENES[x].from)}</b></li>`).join('<li class="x" aria-hidden="true">×</li>');
  const role = cur.round === 1 && !ab.champion ? `새 게임 ${key === 'A' ? 1 : 2}` : key === 'A' ? '지금 챔피언' : '도전자';
  return `<article class="side side-${key}">
  <header><span class="tag">${key}</span><div><p class="eyebrow">${role}</p><h3>${esc(g.name)}</h3></div></header>
  <ul class="genes">${genes}</ul>
  <p class="twist">${esc(g.twist)}</p>
  <ol class="rules">${g.rules.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  <div class="game" data-game="${id}"></div>
  <details class="metrics"><summary>봇 측정: 재미 추정 <b>${r.fun.toFixed(2)}</b></summary>
    <div class="bars">${bars}</div>
    <p class="muted">못하는 봇 ${r.dumb.sec}초·${r.dumb.score}점 / 잘하는 봇 ${r.smart.sec}초·${r.smart.score}점 (${r.n}판 중앙값)</p>
  </details>
</article>`;
}

const bench = GAMES.filter((e) => e.game.id !== cur.A && e.game.id !== cur.B).map(({ game: g }) => {
  const r = evals[g.id];
  return `<article class="side bench">
  <header><div><p class="eyebrow">다음 라운드 후보 · 봇 재미 추정 ${r.fun.toFixed(2)}</p><h3>${esc(g.name)}</h3></div></header>
  <ul class="genes">${g.genes.map((x) => `<li><b>${esc(GENES[x].from)}</b></li>`).join('<li class="x" aria-hidden="true">×</li>')}</ul>
  <p class="twist">${esc(g.twist)}</p>
  <ol class="rules">${g.rules.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  <div class="game" data-game="${g.id}"></div>
  <p class="muted">못하는 봇 ${r.dumb.sec}초·${r.dumb.score}점 / 잘하는 봇 ${r.smart.sec}초·${r.smart.score}점</p>
</article>`;
}).join('');

const css = readFileSync(join(root, 'dashboard.css'), 'utf8');
const bundle = (await build({ entryPoints: [join(root, 'play.ts')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2022' })).outputFiles[0].text;
const geneList = Object.values(GENES).map((g) => `<li><b>${esc(g.from)}</b> ${esc(g.what)}</li>`).join('');
const done = ab.rounds.filter((r) => r.winner);

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>게임 발견 공장</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<main>
<header class="top">
  <div><p class="eyebrow">아는 장르 × 아는 장르 + 한 번 비틀기</p><h1>게임 발견 공장</h1></div>
  <p class="meta"><span class="pill ok">RUNNING</span> 사이클 ${esc(cycle)} · ${now} 갱신</p>
</header>

<section aria-labelledby="ab-h">
  <h2 id="ab-h">A|B ${cur.round}라운드 — 직접 해보고 골라 주세요</h2>
  <p class="lead">${cur.winner ? `결정됨: <b>${esc(cur.winner)}</b>` : '두 게임을 한 판씩 해 보고, <b>채팅에 “A” 또는 “B”라고 답해 주세요.</b> 고른 쪽이 챔피언이 되고, 공장은 그 챔피언에 도전할 새 조합을 만듭니다. 둘 다 별로면 이유를 한 줄 적어 주세요. 그게 다음 게임의 설계 기준이 됩니다.'}</p>
  <div class="ab">${card('A', cur.A, cur.B)}${card('B', cur.B, cur.A)}</div>
</section>

${bench ? `<section aria-labelledby="bench-h">
  <h2 id="bench-h">다음 라운드 후보</h2>
  <p class="lead">1라운드 결과가 나오면 챔피언과 겨룰 후보입니다. 미리 해 보셔도 됩니다.</p>
  <div class="ab">${bench}</div>
</section>` : ''}

<section aria-labelledby="how-h" class="two">
  <div>
    <h2 id="how-h">공장이 하는 일</h2>
    <ol class="how">
      <li>성공한 캐주얼 게임이 쓴 공식처럼, <b>아는 장르 두세 개를 섞고 한 번 비튼다.</b> 장르를 통째로 베끼지 않고 핵심 재미 한 조각씩만 가져온다.</li>
      <li>게임을 실제로 만들고, <b>못하는 봇과 잘하는 봇</b>이 수십 판씩 해 본다. 실력이 결과를 바꾸는지, 처음 해도 바로 죽지 않는지, 한 판이 적당히 짧은지 잰다.</li>
      <li>기계 점수가 좋은 것을 오너에게 A|B로 올린다. <b>진짜 재미는 오너의 선택으로만 정한다.</b></li>
    </ol>
  </div>
  <div>
    <h2>재료 (장르 조각)</h2>
    <ul class="genelist">${geneList}</ul>
  </div>
</section>

<section aria-labelledby="hist-h">
  <h2 id="hist-h">기록</h2>
  <ul class="hist">
    <li><b>2026-11-06</b> 오너 결정: 논리 퍼즐 라인(교차점) 폐기. 성공한 캐주얼 게임들처럼 기존 장르를 조합·변형해 새 게임을 만드는 공장으로 전환.</li>
    ${done.map((r) => `<li><b>${r.round}라운드</b> ${esc(r.A)} vs ${esc(r.B)} → ${esc(r.winner!)}</li>`).join('')}
  </ul>
</section>
</main>
<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
writeFileSync(join(root, 'reports', 'dashboard.html'), html);
console.log(`dashboard: ${(html.length / 1024).toFixed(1)} KB · 라운드 ${cur.round} (${cur.A} vs ${cur.B})`);
