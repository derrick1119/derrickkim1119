import { puzzleNumber, TIER_LABEL } from '../../engine/daily.ts';
import { nextStep, type Step } from '../../engine/deducer.ts';
import { buildModel, givenState, satisfiesAll, type Model } from '../../engine/model.ts';
import { hashString } from '../../engine/rng.ts';
import type { RuleSet, Tier } from '../../engine/types.ts';
import { ATOMS } from '../../fusion/atoms.ts';
import { FUSION_LAUNCH } from '../../fusion/daily.ts';
import { generateFusion } from '../../fusion/generator.ts';
import { atomsOf, buildFusionRules, parseFusionId, type FusionPuzzle, type FusionSpec } from '../../fusion/spec.ts';

type Mark = 0 | 1 | 2; // 미정 / 칠함 / 점
type Mode = { kind: 'daily'; date: string } | { kind: 'gallery'; id: string; index: number } | { kind: 'play'; id: string };
interface Discovery { id: string; name: string; fitness: number; synergy: number; necessityMin: number; ingredients: { id: string; name: string; origin: string }[] }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const boardEl = $('board'), hintEl = $('hint-msg'), timerEl = $('timer');
const store = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem('fx:' + k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem('fx:' + k, JSON.stringify(v)); } catch { /* 저장 불가여도 동작 */ }
  },
};
const localISO = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const number = (date: string) => puzzleNumber(date) - puzzleNumber(FUSION_LAUNCH) + 1;

let mode: Mode;
let puzzle: FusionPuzzle & { date?: string; name?: string };
let spec: FusionSpec;
let rules: RuleSet;
let model: Model;
let marks: Mark[] = [];
let cells: HTMLButtonElement[] = [];
let rowEdges: HTMLElement[] = [], colEdges: HTMLElement[] = [];
let undo: { cell: number; prev: Mark }[] = [];
let elapsed = 0, hints = 0, solved = false, started = false, focusIdx = 0;
let pinned: number | null = null;
let hintStep: Step | null = null;

const W = () => puzzle.width, H = () => puzzle.height;
const isNumberClue = () => !!spec.cell && spec.cell !== 'givens';
const locked = (i: number) => puzzle.clues[i] !== null;
const progressKey = () => `progress:${puzzle.id}`;
const save = () => store.set(progressKey(), { marks, elapsed, hints, solved });

function lockedMark(i: number): Mark {
  if (!locked(i)) return 0;
  if (isNumberClue()) return 0;
  return puzzle.clues[i] === 1 ? 1 : 2;
}

function engineState(): Int8Array {
  const st = givenState(model);
  marks.forEach((m, i) => { if (!locked(i)) st[i] = m === 1 ? 1 : m === 2 ? 0 : -1; });
  return st;
}

/* ---------- 렌더링 ---------- */

function buildBoard() {
  const w = W(), h = H(), edges = !!puzzle.edges;
  boardEl.style.setProperty('--cols', String(edges ? w + 1 : w));
  boardEl.classList.toggle('with-edges', edges);
  boardEl.replaceChildren();
  cells = []; rowEdges = []; colEdges = [];
  const label = (v: number | null) => {
    const e = document.createElement('div');
    e.className = 'edge';
    e.textContent = v === null ? '' : String(v);
    return e;
  };
  if (edges) {
    const c = document.createElement('div');
    c.className = 'corner';
    boardEl.append(c);
    puzzle.edges!.cols.forEach((v, x) => {
      const e = label(v);
      e.setAttribute('aria-label', v === null ? '' : `${x + 1}열 칠한 칸 ${v}개`);
      colEdges.push(e);
      boardEl.append(e);
    });
  }
  for (let y = 0; y < h; y++) {
    if (edges) {
      const v = puzzle.edges!.rows[y];
      const e = label(v);
      e.setAttribute('aria-label', v === null ? '' : `${y + 1}행 칠한 칸 ${v}개`);
      rowEdges.push(e);
      boardEl.append(e);
    }
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell';
      b.setAttribute('role', 'gridcell');
      b.tabIndex = i === focusIdx ? 0 : -1;
      b.dataset.i = String(i);
      if (locked(i)) {
        b.classList.add('locked');
        if (isNumberClue()) {
          b.classList.add('clue');
          b.textContent = String(puzzle.clues[i]);
        }
      }
      cells.push(b);
      boardEl.append(b);
    }
  }
}

function render() {
  const w = W(), h = H();
  const scope = pinned !== null && isNumberClue() ? new Set(rules.clueScope(pinned, w, h)) : null;
  const target = new Set(hintStep?.cells ?? []);
  const ctx = new Set<number>();
  const ctxEdges = new Set<number>();
  hintStep?.constraints.forEach((ci) => {
    const c = model.cons[ci];
    if (c.anchor !== undefined && c.anchor < 0) ctxEdges.add(c.anchor);
    else if (c.anchor !== undefined) ctx.add(c.anchor);
    c.cells.forEach((x) => ctx.add(x));
  });

  // 제약 기반 위반 표시 (규칙별 UI 코드 없이)
  const st = engineState();
  const badCells = new Set<number>(), badAnchors = new Set<number>(), doneAnchors = new Set<number>();
  for (const c of model.cons) {
    if (c.kind === 'clue-cell' || c.kind === 'givens') continue;
    let filled = 0, open = 0;
    for (const x of c.cells) st[x] === 1 ? filled++ : st[x] === -1 && open++;
    const over = filled > c.max, under = filled + open < c.min;
    if (c.anchor !== undefined) {
      if (over || under) badAnchors.add(c.anchor);
      else if (filled === c.max && filled >= c.min) doneAnchors.add(c.anchor);
    }
    if (over && c.anchor === undefined) c.cells.forEach((x) => st[x] === 1 && badCells.add(x));
    if (under && c.anchor === undefined && open === 0) c.cells.forEach((x) => st[x] === 0 && !locked(x) && badCells.add(x));
  }

  cells.forEach((b, i) => {
    const m = locked(i) ? lockedMark(i) : marks[i];
    const x = i % w, y = Math.floor(i / w);
    b.classList.toggle('filled', m === 1);
    b.classList.toggle('dot', m === 2);
    b.classList.toggle('in-scope', !!scope?.has(i));
    b.classList.toggle('scope-src', pinned === i && isNumberClue());
    b.classList.toggle('hint-target', target.has(i));
    b.classList.toggle('hint-ctx', ctx.has(i) && !target.has(i));
    if (locked(i) && isNumberClue()) {
      b.classList.toggle('bad', badAnchors.has(i));
      b.classList.toggle('done', !badAnchors.has(i) && doneAnchors.has(i));
      b.setAttribute('aria-label', `${y + 1}행 ${x + 1}열, 숫자 ${puzzle.clues[i]}`);
    } else {
      b.classList.toggle('bad', badCells.has(i));
      const s = m === 1 ? '칠함' : m === 2 ? '빈칸' : '미정';
      b.setAttribute('aria-label', `${y + 1}행 ${x + 1}열, ${s}${locked(i) ? ' (고정)' : ''}`);
    }
  });
  rowEdges.forEach((e, y) => {
    e.classList.toggle('bad', badAnchors.has(-(y + 1)));
    e.classList.toggle('done', doneAnchors.has(-(y + 1)) && !badAnchors.has(-(y + 1)));
    e.classList.toggle('hint-ctx', ctxEdges.has(-(y + 1)));
  });
  colEdges.forEach((e, x) => {
    const a = -(1000 + x + 1);
    e.classList.toggle('bad', badAnchors.has(a));
    e.classList.toggle('done', doneAnchors.has(a) && !badAnchors.has(a));
    e.classList.toggle('hint-ctx', ctxEdges.has(a));
  });

  // 연결성 같은 전역 규칙 위반은 문장으로 알린다
  if (!hintStep && !solved) {
    const broken = spec.globals.map((g) => ATOMS[g]).filter((a) => a.globalCheck && !a.globalCheck(st, w, h));
    hintEl.classList.toggle('warn', broken.length > 0);
    if (broken.length) hintEl.textContent = `규칙 위반: ${broken.map((a) => a.name).join(', ')}`;
    else if (hintEl.classList.contains('warn') || hintEl.dataset.auto) hintEl.textContent = '';
    hintEl.dataset.auto = broken.length ? '1' : '';
  }
  ($('btn-undo') as HTMLButtonElement).disabled = solved || undo.length === 0;
  ($('btn-hint') as HTMLButtonElement).disabled = solved;
  boardEl.classList.toggle('solved', solved);
}

/* ---------- 조작 ---------- */

function setMark(i: number, next: Mark) {
  if (solved || locked(i) || marks[i] === next) return;
  if (!started) startTimer();
  undo.push({ cell: i, prev: marks[i] });
  marks[i] = next;
  hintStep = null;
  hintEl.textContent = '';
  hintEl.classList.remove('warn');
  checkWin();
  save();
  render();
}
const cycle = (i: number) => setMark(i, ((marks[i] + 1) % 3) as Mark);

function checkWin() {
  if (!satisfiesAll(model, engineState())) return;
  solved = true;
  stopTimer();
  marks = marks.map((m, i) => (locked(i) ? 0 : m === 1 ? 1 : 2));
  recordWin();
  setTimeout(showWin, 600);
}

const cellOf = (e: Event) => (e.target as HTMLElement).closest<HTMLButtonElement>('.cell');
boardEl.addEventListener('click', (e) => {
  const t = cellOf(e);
  if (!t) return;
  const i = Number(t.dataset.i);
  focusIdx = i;
  if (locked(i)) {
    pinned = pinned === i ? null : i;
    render();
  } else cycle(i);
});
boardEl.addEventListener('contextmenu', (e) => {
  const t = cellOf(e);
  if (!t) return;
  e.preventDefault();
  const i = Number(t.dataset.i);
  setMark(i, marks[i] === 2 ? 0 : 2);
});
boardEl.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse' || !isNumberClue()) return;
  const t = cellOf(e);
  const i = t ? Number(t.dataset.i) : null;
  const next = i !== null && locked(i) ? i : null;
  if (next !== pinned) { pinned = next; render(); }
});
boardEl.addEventListener('keydown', (e) => {
  const w = W(), h = H();
  const x = focusIdx % w, y = Math.floor(focusIdx / w);
  const mv: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (mv[e.key]) {
    e.preventDefault();
    const nx = Math.min(w - 1, Math.max(0, x + mv[e.key][0])), ny = Math.min(h - 1, Math.max(0, y + mv[e.key][1]));
    cells[focusIdx].tabIndex = -1;
    focusIdx = ny * w + nx;
    cells[focusIdx].tabIndex = 0;
    cells[focusIdx].focus();
    pinned = locked(focusIdx) ? focusIdx : null;
    render();
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (locked(focusIdx)) { pinned = pinned === focusIdx ? null : focusIdx; render(); } else cycle(focusIdx);
  } else if (e.key === 'x' || e.key === 'X' || e.key === '.') setMark(focusIdx, 2);
  else if (e.key === 'f' || e.key === 'F') setMark(focusIdx, 1);
  else if (e.key === 'Backspace' || e.key === 'Delete') setMark(focusIdx, 0);
  else if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); }
});

function doUndo() {
  const u = undo.pop();
  if (!u || solved) return;
  marks[u.cell] = u.prev;
  hintStep = null;
  save();
  render();
}
$('btn-undo').addEventListener('click', doUndo);
$('btn-reset').addEventListener('click', () => {
  if (solved || !marks.some((m) => m !== 0) || !confirm('처음부터 다시 풀까요? (시간은 유지됩니다)')) return;
  marks = marks.map(() => 0);
  undo = [];
  hintStep = null;
  hintEl.textContent = '';
  save();
  render();
});

/* ---------- 설명형 힌트: 어떤 재료끼리 맞물렸는지 말해준다 ---------- */

$('btn-hint').addEventListener('click', () => {
  if (solved) return;
  if (!started) startTimer();
  hints++;
  hintEl.classList.remove('warn');
  hintEl.dataset.auto = '';
  const wrong = marks.findIndex((m, i) => !locked(i) && m !== 0 && String(m === 1 ? 1 : 0) !== puzzle.solution[i]);
  if (wrong >= 0) {
    hintStep = { technique: 'single', cells: [wrong], value: 0, constraints: [] };
    hintEl.textContent = marks[wrong] === 1 ? '반짝이는 칸은 칠하면 안 되는 칸이에요.' : '반짝이는 칸은 사실 칠해야 하는 칸이에요.';
  } else {
    const step = nextStep(model, engineState());
    if (!step) return;
    hintStep = step;
    hintEl.textContent = explain(step);
  }
  save();
  render();
});

const atomOf = (ci: number) => ATOMS[model.cons[ci].kind];

function explain(s: Step): string {
  const act = s.value === 1 ? '칠해야' : '비어 있어야';
  if (s.technique === 'single') {
    const c = model.cons[s.constraints[0]];
    const a = atomOf(s.constraints[0]);
    const clue = c.anchor !== undefined && c.anchor >= 0 ? puzzle.clues[c.anchor] : null;
    return a ? a.hint(s.value, clue) : `반짝이는 칸은 ${act} 해요.`;
  }
  if (s.technique === 'pair') {
    const [a, b] = s.constraints.map(atomOf);
    if (a && b && a.id !== b.id)
      return `교차점이에요! ‘${a.name}’와(과) ‘${b.name}’가 겹치는 칸을 함께 따져보면, 반짝이는 칸은 ${act} 합니다.`;
    return `‘${a?.name ?? '규칙'}’ 조건 두 개가 겹치는 부분을 비교해보세요. 반짝이는 칸은 ${act} 합니다.`;
  }
  return `반짝이는 칸을 ${s.value === 1 ? '비워' : '칠해'} 본다고 가정해보세요. ${s.depth}수 안에 규칙끼리 충돌합니다. 그러니 이 칸은 ${act} 해요.`;
}

/* ---------- 타이머 · 기록 · 공유 ---------- */

let tick: number | undefined;
function startTimer() {
  if (solved) return;
  started = true;
  clearInterval(tick);
  tick = window.setInterval(() => {
    if (document.hidden) return;
    elapsed++;
    timerEl.textContent = fmt(elapsed);
    if (elapsed % 5 === 0) save();
  }, 1000);
}
function stopTimer() {
  clearInterval(tick);
  timerEl.textContent = fmt(elapsed);
}

function recordWin() {
  save();
  if (mode.kind !== 'daily' || mode.date !== localISO()) return;
  const st = store.get<{ solvedDates: string[] }>('stats', { solvedDates: [] });
  if (!st.solvedDates.includes(mode.date)) st.solvedDates.push(mode.date);
  store.set('stats', st);
  renderStreak();
}
function renderStreak() {
  const set = new Set(store.get<{ solvedDates: string[] }>('stats', { solvedDates: [] }).solvedDates);
  let n = 0;
  const d = new Date();
  if (!set.has(localISO(d))) d.setDate(d.getDate() - 1);
  while (set.has(localISO(d))) { n++; d.setDate(d.getDate() - 1); }
  $('streak').textContent = n > 0 ? `🔥 ${n}일 연속` : '';
}
function shareText() {
  const t = puzzle.difficulty.tier;
  const emoji = { easy: '🟩', medium: '🟨', hard: '🟧', expert: '🟥' }[t];
  const head = mode.kind === 'daily' ? `교차점 #${number(mode.date)}` : '교차점 · 발견 박물관';
  return `${head} ${emoji} ${TIER_LABEL[t]}\n🧪 ${rules.name}\n⏱ ${fmt(elapsed)} · 💡 ${hints}\n${location.origin + location.pathname}`;
}
function showWin() {
  $('win-text').textContent = `${fmt(elapsed)} 만에, 힌트 ${hints}번으로 풀었어요.`;
  $('share-text').textContent = shareText();
  $<HTMLDialogElement>('win').showModal();
}
$('btn-close').addEventListener('click', () => $<HTMLDialogElement>('win').close());
$('btn-share').addEventListener('click', async () => {
  const text = shareText();
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); $('btn-share').textContent = '복사됨 ✓'; }
  } catch { /* 취소 */ }
});

/* ---------- 불러오기 ---------- */

function showDiscovery(label: string) {
  $('disc-label').textContent = label;
  $('disc-name').textContent = rules.name;
  const chips = $('disc-chips');
  chips.replaceChildren();
  atomsOf(spec).forEach((a, k) => {
    if (k > 0) {
      const x = document.createElement('li');
      x.className = 'x';
      x.textContent = '×';
      x.setAttribute('aria-hidden', 'true');
      chips.append(x);
    }
    const li = document.createElement('li');
    li.innerHTML = `${a.name} <small>· ${a.origin}</small>`;
    chips.append(li);
  });
  $('rules-list').replaceChildren(...rules.rules.map((r) => Object.assign(document.createElement('li'), { textContent: r })));
}

function startPuzzle(p: FusionPuzzle & { date?: string }, label: string, meta: string) {
  puzzle = p;
  spec = parseFusionId(p.rules)!;
  rules = buildFusionRules(spec);
  model = buildModel(p, rules);
  const prog = store.get<{ marks: Mark[]; elapsed: number; hints: number; solved: boolean } | null>(progressKey(), null);
  const n = p.width * p.height;
  marks = prog?.marks?.length === n ? prog.marks : new Array<Mark>(n).fill(0);
  elapsed = prog?.elapsed ?? 0;
  hints = prog?.hints ?? 0;
  solved = prog?.solved ?? false;
  started = false;
  undo = [];
  hintStep = null;
  pinned = null;
  focusIdx = 0;
  clearInterval(tick);
  timerEl.textContent = fmt(elapsed);
  $('meta').textContent = meta;
  showDiscovery(label);
  buildBoard();
  hintEl.textContent = solved ? `이미 ${fmt(elapsed)}에 풀었어요.` : '';
  render();
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('current', (c as HTMLElement).dataset.id === p.rules));
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json() as Promise<T>;
}

async function renderMuseum(discoveries: Discovery[]) {
  $('cards').replaceChildren(
    ...discoveries.map((d, k) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.dataset.id = d.id;
      const pct = (v: number) => `${Math.round(v * 100)}%`;
      card.innerHTML = `
        <h3><span class="rank">#${k + 1}</span>${d.name}</h3>
        <ul class="chips">${d.ingredients.map((a, i) => `${i ? '<li class="x" aria-hidden="true">×</li>' : ''}<li>${a.name}</li>`).join('')}</ul>
        <div class="meters">
          <span>융합도</span><span class="meter"><i style="width:${pct(d.synergy)}"></i></span><span>${pct(d.synergy)}</span>
          <span>필수성</span><span class="meter"><i style="width:${pct(d.necessityMin)}"></i></span><span>${pct(d.necessityMin)}</span>
        </div>
        <div class="plays">
          <button type="button" data-i="0">쉬움</button><button type="button" data-i="1">보통</button><button type="button" data-i="2">어려움</button>
        </div>`;
      card.querySelectorAll<HTMLButtonElement>('.plays button').forEach((b) =>
        b.addEventListener('click', () => {
          const u = new URL(location.href);
          u.search = `?g=${d.id}&i=${b.dataset.i}`;
          history.pushState(null, '', u);
          void route();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }),
      );
      return card;
    }),
  );
}

let dailyIndex: { dates: string[] } = { dates: [] };

async function route() {
  const q = new URLSearchParams(location.search);
  const today = localISO();
  if (q.has('play')) {
    // 플레이테스트: 아무 조합이나 즉석 생성
    const id = q.get('play')!;
    const sp = parseFusionId(id);
    if (!sp) throw new Error(`알 수 없는 조합: ${id}`);
    const tier = (q.get('tier') ?? 'medium') as Tier;
    const size = Number(q.get('size') ?? 6);
    const seed = Number(q.get('seed') ?? 1);
    const p = generateFusion(sp, { width: size, height: size, seed: hashString(`${id}:${seed}`), target: tier, attempts: 40 });
    if (!p) throw new Error('이 조합으로는 퍼즐을 만들지 못했어요.');
    mode = { kind: 'play', id };
    startPuzzle(p, '플레이테스트', `플레이테스트 · seed ${seed} · ${TIER_LABEL[p.difficulty.tier]} · ${size}×${size}`);
    return;
  }
  if (q.has('g')) {
    const id = q.get('g')!;
    const i = Number(q.get('i') ?? 0);
    const g = await json<{ puzzles: FusionPuzzle[] }>(`fusion/gallery/${id}.json`);
    const p = g.puzzles[Math.min(i, g.puzzles.length - 1)];
    mode = { kind: 'gallery', id, index: i };
    startPuzzle(p, '발견 박물관', `발견 박물관 · ${TIER_LABEL[p.difficulty.tier]} · ${p.width}×${p.height}`);
    return;
  }
  const avail = dailyIndex.dates.filter((d) => d <= today);
  const fallback = avail.at(-1) ?? dailyIndex.dates[0];
  let date = q.get('d') ?? fallback;
  if (!dailyIndex.dates.includes(date) || (date > today && !q.has('preview'))) date = fallback;
  const p = await json<FusionPuzzle & { date: string }>(`fusion/daily/${date}.json`);
  mode = { kind: 'daily', date };
  startPuzzle(p, '오늘의 발견', `#${number(date)} · ${date.replace(/-/g, '.')} · ${TIER_LABEL[p.difficulty.tier]} · ${p.width}×${p.height}`);
  const sel = $<HTMLSelectElement>('archive');
  sel.replaceChildren(...[...(avail.length ? avail : [date])].reverse().map((d) =>
    Object.assign(document.createElement('option'), { value: d, textContent: `#${number(d)} · ${d.slice(5).replace('-', '/')}`, selected: d === date }),
  ));
}

async function main() {
  const [idx, discoveries] = await Promise.all([
    json<{ dates: string[] }>('fusion/daily/index.json'),
    json<Discovery[]>('fusion/discoveries.json'),
  ]);
  dailyIndex = idx;
  $('archive').addEventListener('change', (e) => {
    const u = new URL(location.href);
    u.search = `?d=${(e.target as HTMLSelectElement).value}`;
    location.href = u.toString();
  });
  window.addEventListener('popstate', () => void route());
  await renderMuseum(discoveries);
  $<HTMLDetailsElement>('rules').open = !store.get('seen-rules', false);
  store.set('seen-rules', true);
  await route();
  renderStreak();
}

main().catch((err) => {
  hintEl.textContent = '퍼즐을 불러오지 못했어요. 잠시 후 다시 시도해주세요.';
  console.error(err);
});
