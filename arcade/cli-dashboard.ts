/**
 * 아케이드 공장 계기판 (실험 0011). A|B 두 게임을 페이지 안에서 바로 플레이할 수 있게 묶는다.
 *   npx tsx arcade/evaluate.ts && npx tsx arcade/cli-dashboard.ts --cycle 0011
 * → arcade/reports/dashboard.html (아티팩트로 게시, slug는 arcade/STATE.md)
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GENE_KIND_LABEL, GENES, type GeneKind } from './core.ts';
import { ideaText, suggest, usage } from './ideas.ts';
import type { ArcadeReport } from './evaluate.ts';
import { GAMES } from './registry.ts';

const root = import.meta.dirname;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const cycle = process.argv.includes('--cycle') ? process.argv[process.argv.indexOf('--cycle') + 1] : '????';
const evals: Record<string, ArcadeReport> = JSON.parse(readFileSync(join(root, 'reports', 'eval.json'), 'utf8'));
const ab: { champion: string | null; graduated?: { id: string; name: string; at: string; round: number; studio: string; play: string }[]; discarded?: { id: string; name: string }[]; rounds: { round: number; openedAt: string; A: string; B: string | null; winner: string | null; note?: string }[] } = JSON.parse(readFileSync(join(root, 'ab.json'), 'utf8'));
const cur = ab.rounds.at(-1)!;
// 아이디어 메뉴 (오너 선택 2026-11-08): 라운드 사이에 만들기 전 한 줄 기획을 먼저 보여 준다
const menu: { round: number; why: string; picked: number[] | null; items: { no: number; emoji: string; name: string; from: string; wow: string; first: string; depth: string }[] } | null = (() => {
  try { return JSON.parse(readFileSync(join(root, 'menu.json'), 'utf8')); } catch { return null; }
})();
const menuOpen = !!menu && !menu.picked && !!cur.winner;
const nameOf = (id: string) => GAMES.find((e) => e.game.id === id)?.game.name ?? ab.graduated?.find((g) => g.id === id)?.name ?? ab.discarded?.find((g) => g.id === id)?.name ?? id;
const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const LABEL: Record<string, string> = { skill: '실력이 통하나', onboarding: '처음 해도 버티나', session: '한 판 길이', simplicity: '단순함', unfold: '판이 펼쳐지나' };

function card(key: 'A' | 'B', id: string, other: string | null) {
  const g = GAMES.find((e) => e.game.id === id)!.game, r = evals[id], o = other ? evals[other] : null;
  const bars = Object.entries(r.parts).map(([k, v]) => {
    const up = !!o && v > ((o.parts as Record<string, number>)[k] ?? 0) + 0.03;
    return `<div class="bar"><span>${LABEL[k]}</span><i style="--v:${Math.round(v * 100)}%" class="${up ? 'up' : ''}"></i><b>${v.toFixed(2)}</b></div>`;
  }).join('');
  const genes = g.genes.map((x) => `<li><b>${esc(GENES[x].from)}</b></li>`).join('<li class="x" aria-hidden="true">×</li>');
  const role = !other ? `💡 ${esc(g.origin ?? '한 게임')}` : !ab.champion ? `새 게임 ${key === 'A' ? 1 : 2}` : key === 'A' ? '지금 챔피언' : '도전자';
  return `<article class="side side-${key}">
  <header><span class="tag">${key}</span><div><p class="eyebrow">${role}</p><h3>${esc(g.name)}</h3></div></header>
  <ul class="genes">${genes}</ul>
  <p class="twist">${esc(g.twist)}</p>
  ${artLine(id)}
  <ol class="rules">${g.rules.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  <div class="game" data-game="${id}"></div>
  <details class="metrics"><summary>봇 측정: 재미 추정 <b>${r.fun.toFixed(2)}</b></summary>
    <div class="bars">${bars}</div>
    <p class="muted">못하는 봇 ${r.dumb.sec}초·${r.dumb.score}점 / 잘하는 봇 ${r.smart.sec}초·${r.smart.score}점 (${r.n}판 중앙값)${r.reveals ? ` · 새로 나온 것 30초 ${r.reveals[0]} → 1분 ${r.reveals[1]} → 2분 ${r.reveals[2]}가지` : ''}${r.dumbReveals ? ` · 처음 하는 사람(못하는 봇)은 30초 ${r.dumbReveals[0]} · 끝날 때 ${r.dumbReveals[1]}가지${r.dumbReveals[0] < 2 ? ' ⚠ 처음엔 펼쳐짐이 잘 안 보임' : ''}` : ''}</p>
  </details>
</article>`;
}

const benchGames = GAMES.filter((e) => e.game.id !== cur.A && e.game.id !== cur.B), ideaOnly = benchGames.length > 0 && benchGames.every((e) => e.game.origin);
const bench = benchGames.map(({ game: g }) => {
  const r = evals[g.id];
  return `<article class="side bench">
  <header><div><p class="eyebrow">${g.origin ? '💡 오너 아이디어' : '다음 라운드 후보'} · 봇 재미 추정 ${r.fun.toFixed(2)}</p><h3>${esc(g.name)}</h3></div></header>
  ${g.origin ? `<p class="muted">${esc(g.origin)}</p>` : ''}
  <ul class="genes">${g.genes.map((x) => `<li><b>${esc(GENES[x].from)}</b></li>`).join('<li class="x" aria-hidden="true">×</li>')}</ul>
  <p class="twist">${esc(g.twist)}</p>
  ${artLine(g.id)}
  <ol class="rules">${g.rules.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  <div class="game" data-game="${g.id}"></div>
  <p class="muted">못하는 봇 ${r.dumb.sec}초·${r.dumb.score}점 / 잘하는 봇 ${r.smart.sec}초·${r.smart.score}점</p>
</article>`;
}).join('');

/** 디자인 컨셉 줄: 팔레트 색 점 + 컨셉 이름 + 분위기 (오너 요청 2026-11-07) */
function artLine(id: string) {
  const a = GAMES.find((e) => e.game.id === id)?.game.art;
  if (!a) return '';
  const dots = [a.palette.bg, a.palette.ink, a.palette.accent, a.palette.hot].map((c) => `<i style="background:${c}"></i>`).join('');
  return `<p class="art"><span class="swatch" aria-hidden="true">${dots}</span><b>${esc(a.concept)}</b> ${esc(a.mood)}</p>`;
}

const css = readFileSync(join(root, 'dashboard.css'), 'utf8');
const bundle = (await build({ entryPoints: [join(root, 'play.ts')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2022' })).outputFiles[0].text;
const used = usage();
const ideas = suggest(6, now.slice(0, 10));
const geneList = (Object.keys(GENE_KIND_LABEL) as GeneKind[]).map((k) => {
  const xs = Object.values(GENES).filter((g) => g.kind === k).sort((a, b) => used[b.id] - used[a.id]);
  return `<details class="genegroup"${k === 'core' ? '' : ''}><summary><b>${GENE_KIND_LABEL[k]}</b> ${xs.length}개 · 써 본 것 ${xs.filter((g) => used[g.id]).length}</summary>
  <ul class="genelist">${xs.map((g) => `<li class="${used[g.id] ? 'used' : ''}"><b>${esc(g.from)}</b> ${esc(g.what)}${used[g.id] ? ` <span class="n">×${used[g.id]}</span>` : ''}</li>`).join('')}</ul></details>`;
}).join('');
const ideaList = ideas.map((i) => `<li>${esc(ideaText(i))} <span class="muted">새 재료 ${i.fresh}개</span></li>`).join('');
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
${menuOpen ? `<h2 id="ab-h">${menu!.round}라운드 아이디어 메뉴 — 만들 것을 골라 주세요</h2>
  <p class="lead">${cur.round}라운드는 ${cur.winner === 'none' ? '<b>둘 다 탈락</b>' : `<b>${esc(nameOf(cur.winner))}</b> 승`}. 이번엔 만들기 전에 기획부터 보여 드립니다. <b>채팅에 번호 1~2개를 적어 주세요</b>(예: “3, 6”). 고른 것만 만들어 다음 라운드로 올립니다. 다 별로면 이유를 한 줄 적어 주세요.</p>
  <div class="ab">${menu!.items.map((m) => `<article class="side bench">
    <header><span class="tag">${m.no}</span><div><p class="eyebrow">${esc(m.from)}</p><h3>${m.emoji} ${esc(m.name)}</h3></div></header>
    <p class="twist"><b>와우</b> ${esc(m.wow)}</p>
    <p class="muted"><b>첫 3초</b> ${esc(m.first)}</p>
    <p class="muted"><b>안 질리는 이유</b> ${esc(m.depth)}</p>
  </article>`).join('')}</div>` : cur.winner ? `<h2 id="ab-h">${cur.round + 1}라운드 준비 중</h2>
  <p class="lead">${cur.round}라운드는 ${cur.winner === 'none' ? '<b>둘 다 탈락</b>' : `<b>${esc(nameOf(cur.winner))}</b> 승`}. 공장이 새 게임을 만들고 있습니다. 준비되면 알려 드립니다.</p>` : !cur.B ? `<h2 id="ab-h">${cur.round}라운드 — 한 판 해 보고 “좋아” / “별로”</h2>
  <p class="lead">이번 라운드는 오너가 준 아이디어로 만든 게임 하나입니다. 한 판 해 보고 <b>채팅에 “좋아” 또는 “별로”라고 답해 주세요.</b> 별로면 이유를 한 줄 적어 주세요. 좋으면 이 게임이 챔피언이 되고, 다음 게임이 여기에 도전합니다.</p>
  <div class="ab one">${card('A', cur.A, null)}</div>` : `<h2 id="ab-h">A|B ${cur.round}라운드 — 직접 해보고 골라 주세요</h2>
  <p class="lead">두 게임을 한 판씩 해 보고, <b>채팅에 “A” 또는 “B”라고 답해 주세요.</b> 고른 쪽이 챔피언이 되고, 공장은 그 챔피언에 도전할 새 조합을 만듭니다. 둘 다 별로면 이유를 한 줄 적어 주세요. 그게 다음 게임의 설계 기준이 됩니다.</p>
  <div class="ab">${card('A', cur.A, cur.B)}${card('B', cur.B, cur.A)}</div>`}
</section>

${bench ? `<section aria-labelledby="bench-h">
  <h2 id="bench-h">${ideaOnly ? '💡 오너 아이디어로 만든 게임' : '다음 라운드 후보'}</h2>
  <p class="lead">${ideaOnly ? (cur.winner ? `다음 라운드(${cur.round + 1}라운드)에 올라갈 게임입니다. 새 게임이 준비되는 동안 먼저 해 보셔도 됩니다.` : `${cur.round}라운드 답과 별개로 먼저 해 보세요. ${cur.round}라운드가 끝나면 이긴 쪽과 이 게임으로 다음 라운드를 엽니다(둘 다 별로면 이 게임과 새 게임 하나로).`) : '이번 라운드가 끝나면 챔피언과 겨룰 수 있는 후보입니다. 미리 해 보셔도 됩니다.'}</p>
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
    <h2>재료 (장르 조각) ${Object.keys(GENES).length}개</h2>
    ${geneList}
    <h2 class="sub">다음 조합 후보 (안 써 본 재료 우선)</h2>
    <ol class="how">${ideaList}</ol>
  </div>
</section>

${(ab.graduated ?? []).length ? `<section aria-labelledby="grad-h">
  <h2 id="grad-h">🎓 졸업한 게임 — 스튜디오에서 상용화 중</h2>
  <ul class="hist">${(ab.graduated ?? []).map((g) => `<li><b>${esc(g.name)}</b> (${esc(g.at)}, ${g.round}라운드 최종 선택) · <a href="${esc(g.play.replace('https://derrick1119.github.io/derrickkim1119/', '../'))}">플레이</a> · <code>${esc(g.studio)}</code></li>`).join('')}</ul>
</section>` : ''}

<section aria-labelledby="hist-h">
  <h2 id="hist-h">기록</h2>
  <ul class="hist">
    <li><b>2026-11-06</b> 오너 결정: 논리 퍼즐 라인(교차점) 폐기. 성공한 캐주얼 게임들처럼 기존 장르를 조합·변형해 새 게임을 만드는 공장으로 전환.</li>
    ${done.map((r) => `<li><b>${r.round}라운드</b> → ${r.winner === 'none' ? '둘 다 탈락' : esc(nameOf(r.winner!))}</li>`).join('')}
    ${(ab.discarded ?? []).length ? `<li><b>2026-11-07</b> 오너 결정: 선택받지 못한 게임 ${ab.discarded!.length}개 폐기 — 계기판엔 지금 라운드와 졸업한 게임만 둔다.</li>` : ''}
  </ul>
</section>
</main>
<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
writeFileSync(join(root, 'reports', 'dashboard.html'), html);
// 오너 요청(2026-11-07): 승인 창 없이 언제든 열 수 있게 GitHub Pages에도 싣는다 → /arcade/
mkdirSync(join(root, '..', 'web', 'public', 'arcade'), { recursive: true });
writeFileSync(join(root, '..', 'web', 'public', 'arcade', 'index.html'), html);
console.log(`dashboard: ${(html.length / 1024).toFixed(1)} KB · 라운드 ${cur.round} (${cur.B ? `${cur.A} vs ${cur.B}` : `${cur.A} 한 게임`})`);
