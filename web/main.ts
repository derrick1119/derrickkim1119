import { puzzleNumber, TIER_LABEL } from '../engine/daily.ts';
import { generate } from '../engine/generator.ts';
import { nextStep, type Step } from '../engine/deducer.ts';
import { buildModel, givenState, satisfiesAll, type Model } from '../engine/model.ts';
import { getRules } from '../engine/rules/index.ts';
import type { Puzzle, RuleSet, Tier } from '../engine/types.ts';

/** date === '' 이면 플레이테스트 퍼즐 (기록·연속에 반영 안 함) */
type DailyPuzzle = Puzzle & { date: string };
/** UI 칸 상태: 0 미정, 1 칠함, 2 점(빈칸 확정) */
type Mark = 0 | 1 | 2;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const boardEl = $('board');
const hintEl = $('hint-msg');
const timerEl = $('timer');

const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : d;
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* 저장 불가 환경에서도 게임은 동작 */
    }
  },
};

function localISO(d = new Date()): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().slice(0, 10);
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Progress {
  marks: Mark[];
  elapsed: number;
  hints: number;
  solved: boolean;
}

let puzzle: DailyPuzzle;
let rules: RuleSet;
let model: Model;
let marks: Mark[] = [];
let cells: HTMLButtonElement[] = [];
let undo: { cell: number; prev: Mark }[] = [];
let elapsed = 0;
let hints = 0;
let solved = false;
let started = false;
let focusIdx = 0;
let pinnedClue: number | null = null;
let hintStep: Step | null = null;

const isClue = (i: number) => puzzle.clues[i] !== null;

function save() {
  store.set(`progress:${puzzle.id}`, { marks, elapsed, hints, solved } satisfies Progress);
}

function engineState(): Int8Array {
  const st = givenState(model);
  marks.forEach((m, i) => {
    if (isClue(i)) return;
    st[i] = m === 1 ? 1 : m === 2 ? 0 : -1;
  });
  return st;
}

/* ---------- 렌더링 ---------- */

function buildBoard() {
  const { width: w, height: h } = puzzle;
  boardEl.style.setProperty('--n', String(w));
  boardEl.replaceChildren();
  cells = [];
  for (let i = 0; i < w * h; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.setAttribute('role', 'gridcell');
    b.tabIndex = i === focusIdx ? 0 : -1;
    b.dataset.i = String(i);
    if (isClue(i)) {
      b.classList.add('clue');
      b.textContent = String(puzzle.clues[i]);
    }
    cells.push(b);
    boardEl.append(b);
  }
}

function ringStatus(i: number): 'ok' | 'done' | 'bad' {
  const clue = puzzle.clues[i]!;
  let filled = 0, open = 0;
  for (const c of rules.clueScope(i, puzzle.width, puzzle.height)) {
    if (marks[c] === 1) filled++;
    else if (marks[c] === 0 && !isClue(c)) open++;
  }
  if (filled > clue || filled + open < clue) return 'bad';
  return filled === clue ? 'done' : 'ok';
}

function render() {
  const { width: w, height: h } = puzzle;
  const scope = pinnedClue !== null ? new Set(rules.clueScope(pinnedClue, w, h)) : null;
  const hintTargets = new Set(hintStep?.cells ?? []);
  const hintCtx = new Set<number>();
  if (hintStep) {
    for (const ci of hintStep.constraints) {
      const c = model.cons[ci];
      if (c.anchor !== undefined) hintCtx.add(c.anchor);
      c.cells.forEach((x) => hintCtx.add(x));
    }
  }
  // 단서 외 제약(맞닿기 금지, 2×2 금지 등)을 넘어선 칠한 칸 — 규칙과 무관하게 모델에서 판정
  const violating = new Set<number>();
  for (const c of model.cons) {
    if (c.kind === 'echo' || c.kind === 'clue-cell') continue;
    const on = c.cells.filter((x) => marks[x] === 1);
    if (on.length > c.max) on.forEach((x) => violating.add(x));
  }
  cells.forEach((b, i) => {
    const m = marks[i];
    const x = i % w, y = Math.floor(i / w);
    b.classList.toggle('filled', m === 1);
    b.classList.toggle('dot', m === 2);
    b.classList.toggle('in-ring', !!scope?.has(i));
    b.classList.toggle('ring-src', pinnedClue === i);
    b.classList.toggle('hint-target', hintTargets.has(i));
    b.classList.toggle('hint-ctx', hintCtx.has(i) && !hintTargets.has(i));
    const bad = violating.has(i);
    if (isClue(i)) {
      const st = ringStatus(i);
      b.classList.toggle('done', st === 'done');
      b.classList.toggle('bad', st === 'bad');
      b.setAttribute('aria-label', `${y + 1}행 ${x + 1}열, 숫자 ${puzzle.clues[i]}`);
    } else {
      b.classList.toggle('bad', bad);
      const label = m === 1 ? '칠함' : m === 2 ? '빈칸' : '미정';
      b.setAttribute('aria-label', `${y + 1}행 ${x + 1}열, ${label}`);
    }
  });
  ($('btn-undo') as HTMLButtonElement).disabled = solved || undo.length === 0;
  ($('btn-hint') as HTMLButtonElement).disabled = solved;
  boardEl.classList.toggle('solved', solved);
}

/* ---------- 조작 ---------- */

function setMark(i: number, next: Mark) {
  if (solved || isClue(i) || marks[i] === next) return;
  if (!started) startTimer();
  undo.push({ cell: i, prev: marks[i] });
  marks[i] = next;
  hintStep = null;
  hintEl.textContent = '';
  checkWin();
  save();
  render();
}

function cycle(i: number) {
  setMark(i, ((marks[i] + 1) % 3) as Mark);
}

function checkWin() {
  if (!satisfiesAll(model, engineState())) return;
  solved = true;
  stopTimer();
  marks = marks.map((m, i) => (isClue(i) ? 0 : m === 1 ? 1 : 2));
  recordWin();
  setTimeout(showWin, 650);
}

function focusCell(i: number) {
  cells[focusIdx].tabIndex = -1;
  focusIdx = i;
  cells[i].tabIndex = 0;
  cells[i].focus();
}

boardEl.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>('.cell');
  if (!t) return;
  const i = Number(t.dataset.i);
  focusIdx = i;
  if (isClue(i)) {
    pinnedClue = pinnedClue === i ? null : i;
    render();
  } else cycle(i);
});
boardEl.addEventListener('contextmenu', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>('.cell');
  if (!t) return;
  e.preventDefault();
  const i = Number(t.dataset.i);
  setMark(i, marks[i] === 2 ? 0 : 2);
});
boardEl.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>('.cell');
  const i = t ? Number(t.dataset.i) : null;
  const next = i !== null && isClue(i) ? i : null;
  if (next !== pinnedClue && (next !== null || pinnedClue !== null)) {
    pinnedClue = next;
    render();
  }
});
boardEl.addEventListener('keydown', (e) => {
  const { width: w, height: h } = puzzle;
  const x = focusIdx % w, y = Math.floor(focusIdx / w);
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
  };
  if (moves[e.key]) {
    e.preventDefault();
    const [dx, dy] = moves[e.key];
    const nx = Math.min(w - 1, Math.max(0, x + dx)), ny = Math.min(h - 1, Math.max(0, y + dy));
    focusCell(ny * w + nx);
    pinnedClue = isClue(focusIdx) ? focusIdx : null;
    render();
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (isClue(focusIdx)) {
      pinnedClue = pinnedClue === focusIdx ? null : focusIdx;
      render();
    } else cycle(focusIdx);
  } else if (e.key === 'x' || e.key === 'X' || e.key === '.') {
    setMark(focusIdx, 2);
  } else if (e.key === 'f' || e.key === 'F') {
    setMark(focusIdx, 1);
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    setMark(focusIdx, 0);
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    doUndo();
  }
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
  if (solved || !marks.some((m) => m !== 0)) return;
  if (!confirm('처음부터 다시 풀까요? (시간은 유지됩니다)')) return;
  marks = marks.map(() => 0);
  undo = [];
  hintStep = null;
  hintEl.textContent = '';
  save();
  render();
});

/* ---------- 설명형 힌트 ---------- */

$('btn-hint').addEventListener('click', () => {
  if (solved) return;
  if (!started) startTimer();
  // 1) 틀린 표시가 있으면 그걸 먼저 알려준다
  const wrong = marks.findIndex((m, i) => !isClue(i) && m !== 0 && String(m === 1 ? 1 : 0) !== puzzle.solution[i]);
  hints++;
  if (wrong >= 0) {
    hintStep = { technique: 'single', cells: [wrong], value: 0, constraints: [] };
    hintEl.textContent = marks[wrong] === 1
      ? '반짝이는 칸은 칠하면 안 되는 칸이에요.'
      : '반짝이는 칸은 사실 칠해야 하는 칸이에요.';
    save();
    render();
    return;
  }
  const step = nextStep(model, engineState());
  if (!step) return;
  hintStep = step;
  hintEl.textContent = explain(step);
  save();
  render();
});

function explain(s: Step): string {
  const act = s.value === 1 ? '칠해야' : '비어 있어야';
  if (s.technique === 'single') {
    const c = model.cons[s.constraints[0]];
    if (c.kind === 'echo') {
      const n = puzzle.clues[c.anchor!]!;
      const ring = puzzle.rules === 'echo' ? '고리' : '세는 칸';
      if (n === 0) return `숫자 0이 세는 칸에는 칠한 칸이 하나도 없어야 해요. 반짝이는 칸은 모두 비어 있어야 합니다.`;
      return s.value === 0
        ? `테두리 표시된 숫자 ${n}의 ${ring}에는 이미 ${n}개가 칠해졌어요. 나머지 칸은 비어 있어야 합니다.`
        : `숫자 ${n}의 ${ring}에서 아직 정하지 않은 칸을 모두 칠해야 ${n}개를 채울 수 있어요.`;
    }
    if (c.kind === 'no-2x2') return '2×2 네 칸을 모두 칠할 수는 없어요. 반짝이는 칸은 비어 있어야 합니다.';
    return '칠한 칸 바로 옆(상하좌우)은 칠할 수 없어요.';
  }
  if (s.technique === 'pair') {
    const nums = s.constraints
      .map((ci) => model.cons[ci])
      .filter((c) => c.kind === 'echo')
      .map((c) => puzzle.clues[c.anchor!]);
    const who = nums.length === 2 ? `숫자 ${nums[0]}과(와) ${nums[1]}이 세는 칸` : '표시된 두 조건';
    return `${who}를 함께 보세요. 겹치는 부분에 들어갈 수 있는 개수를 따져보면, 반짝이는 칸은 ${act} 합니다.`;
  }
  const opposite = s.value === 1 ? '비워' : '칠해';
  return `반짝이는 칸을 ${opposite} 본다고 가정해보세요. ${s.depth}수 안에 모순이 생깁니다. 그러니 이 칸은 ${act} 해요.`;
}

/* ---------- 타이머 ---------- */

let tick: number | undefined;
function startTimer() {
  if (solved) return;
  started = true;
  clearInterval(tick);
  tick = window.setInterval(() => {
    if (document.hidden) return;
    elapsed++;
    timerEl.textContent = fmtTime(elapsed);
    if (elapsed % 5 === 0) save();
  }, 1000);
}
function stopTimer() {
  clearInterval(tick);
  timerEl.textContent = fmtTime(elapsed);
}

/* ---------- 기록 · 공유 ---------- */

interface Stats { solvedDates: string[] }

function recordWin() {
  save();
  if (!puzzle.date || puzzle.date !== localISO()) return; // 지난 퍼즐은 연속 기록에 안 들어감
  const st = store.get<Stats>('stats', { solvedDates: [] });
  if (!st.solvedDates.includes(puzzle.date)) st.solvedDates.push(puzzle.date);
  store.set('stats', st);
  renderStreak();
}

function streak(): number {
  const { solvedDates } = store.get<Stats>('stats', { solvedDates: [] });
  const set = new Set(solvedDates);
  let n = 0;
  const d = new Date();
  if (!set.has(localISO(d))) d.setDate(d.getDate() - 1);
  while (set.has(localISO(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function renderStreak() {
  const s = streak();
  $('streak').textContent = s > 0 ? `🔥 ${s}일 연속` : '';
}

function shareText(): string {
  const tierEmoji = { easy: '🟩', medium: '🟨', hard: '🟧', expert: '🟥' }[puzzle.difficulty.tier];
  const url = location.origin + location.pathname;
  if (!puzzle.date) {
    return `플레이테스트 ${puzzle.rules} ${tierEmoji} ${TIER_LABEL[puzzle.difficulty.tier]}\n⏱ ${fmtTime(elapsed)} · 💡 ${hints}\n${location.href}`;
  }
  return `메아리 #${puzzleNumber(puzzle.date)} ${tierEmoji} ${TIER_LABEL[puzzle.difficulty.tier]}\n⏱ ${fmtTime(elapsed)} · 💡 ${hints}\n${url}`;
}

function showWin() {
  const dlg = $<HTMLDialogElement>('win');
  $('win-text').textContent = `${fmtTime(elapsed)} 만에, 힌트 ${hints}번으로 풀었어요.`;
  $('share-text').textContent = shareText();
  dlg.showModal();
}
$('btn-close').addEventListener('click', () => $<HTMLDialogElement>('win').close());
$('btn-share').addEventListener('click', async () => {
  const text = shareText();
  try {
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      $('btn-share').textContent = '복사됨 ✓';
    }
  } catch {
    /* 공유 취소 */
  }
});

/* ---------- 불러오기 ---------- */

const TIER_SIZE: Record<Tier, number> = { easy: 6, medium: 7, hard: 7, expert: 8 };

/** ?play=<규칙id>&seed=<n>&tier=<난이도>[&size=<n>] — 아무 규칙이나 즉석 생성해 플레이 (오너 플레이테스트용) */
async function loadPlaytest(params: URLSearchParams): Promise<DailyPuzzle> {
  const id = params.get('play')!;
  const tier = (params.get('tier') ?? 'medium') as Tier;
  if (!(tier in TIER_SIZE)) throw new Error(`unknown tier: ${tier}`);
  const seed = Number(params.get('seed') ?? 1) >>> 0;
  const size = Math.min(10, Math.max(4, Number(params.get('size') ?? TIER_SIZE[tier]) || TIER_SIZE[tier]));
  const r = getRules(id);
  $('meta').textContent = '퍼즐 생성 중…';
  await new Promise((res) => setTimeout(res, 30)); // 문구를 먼저 그린다
  const t0 = performance.now();
  const p = generate(r, { width: size, height: size, seed, target: tier });
  if (!p) throw new Error('generation failed');
  const ms = Math.round(performance.now() - t0);
  $('archive').closest('label')!.hidden = true;
  $('meta').dataset.genMs = String(ms);
  return { ...p, date: '' };
}

async function load() {
  // 쿼리가 막힌 환경(아티팩트 프레임 등)에선 #play=…&seed=… 해시도 받는다
  const hash = location.hash.slice(1);
  const params = new URLSearchParams(location.search || (hash.includes('=') ? hash : ''));
  addEventListener('hashchange', () => location.reload());
  if (params.has('play')) {
    puzzle = await loadPlaytest(params);
  } else {
    puzzle = await loadDaily(params);
  }
  rules = getRules(puzzle.rules);
  model = buildModel(puzzle, rules);
  if (!puzzle.date) document.title = `플레이테스트 · ${rules.name}`;

  $('rules-list').replaceChildren(
    ...rules.rules.map((r) => {
      const li = document.createElement('li');
      li.textContent = r;
      return li;
    }),
  );
  const firstVisit = !store.get('seen-rules', false);
  $<HTMLDetailsElement>('rules').open = firstVisit || !puzzle.date;
  store.set('seen-rules', true);

  const n = puzzle.width * puzzle.height;
  const prog = store.get<Progress | null>(`progress:${puzzle.id}`, null);
  marks = prog?.marks?.length === n ? prog.marks : new Array<Mark>(n).fill(0);
  elapsed = prog?.elapsed ?? 0;
  hints = prog?.hints ?? 0;
  solved = prog?.solved ?? false;
  started = false;

  const tierLabel = TIER_LABEL[puzzle.difficulty.tier];
  $('meta').textContent = puzzle.date
    ? `#${puzzleNumber(puzzle.date)} · ${puzzle.date.replace(/-/g, '.')} · ${tierLabel} · ${puzzle.width}×${puzzle.height}`
    : `플레이테스트 · ${puzzle.rules} · seed ${puzzle.seed} · ${tierLabel} · ${puzzle.width}×${puzzle.height}`;
  timerEl.textContent = fmtTime(elapsed);
  focusIdx = 0;
  buildBoard();
  render();
  renderStreak();
  if (solved) hintEl.textContent = puzzle.date
    ? `이미 ${fmtTime(elapsed)}에 풀었어요. 내일 또 만나요!`
    : `이미 ${fmtTime(elapsed)}에 풀었어요. 주소의 seed를 바꾸면 새 퍼즐이 나와요.`;
}

async function loadDaily(params: URLSearchParams): Promise<DailyPuzzle> {
  const idx: { dates: string[] } = await fetch('puzzles/index.json').then((r) => r.json());
  const today = localISO();
  const available = idx.dates.filter((d) => d <= today);
  const fallback = available.at(-1) ?? idx.dates[0];
  let date = params.get('d') ?? fallback;
  if (!idx.dates.includes(date) || (date > today && !params.has('preview'))) date = fallback;

  const sel = $<HTMLSelectElement>('archive');
  sel.replaceChildren(
    ...[...(available.length ? available : [date])].reverse().map((d) => {
      const o = document.createElement('option');
      o.value = d;
      o.textContent = `#${puzzleNumber(d)} · ${d.slice(5).replace('-', '/')}`;
      o.selected = d === date;
      return o;
    }),
  );
  sel.onchange = () => {
    const u = new URL(location.href);
    u.searchParams.set('d', sel.value);
    location.href = u.toString();
  };

  return fetch(`puzzles/${date}.json`).then((r) => r.json());
}

load().catch((err) => {
  hintEl.textContent = '퍼즐을 불러오지 못했어요. 잠시 후 다시 시도해주세요.';
  console.error(err);
});
