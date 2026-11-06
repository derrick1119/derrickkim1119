/**
 * 계기판 아티팩트 안에서 A·B 퍼즐을 직접 풀어보는 작은 플레이어 (실험 0003).
 * 데이터는 페이지의 <script id="ab-data" type="application/json">에 들어 있다.
 * 교차점 제품 번들과 별개 — `fusion/cli-dashboard.ts`가 esbuild로 묶어 페이지에 인라인한다.
 */
import type { RuleExample } from '../examples.ts';
import { atomsOf, buildFusionRules, parseFusionId, type FusionPuzzle } from '../spec.ts';

interface Side { id: string; name: string; puzzles: (FusionPuzzle & { tier: string })[] }
const TIER: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움', expert: '전문가' };
const data = JSON.parse(document.getElementById('ab-data')!.textContent!) as { A: Side; B: Side; examples?: Record<string, RuleExample> };

/** 실험 0008: 규칙 옆 미니 그림. 숫자 규칙은 세는 칸, 판 규칙은 4×4 예시 정답 */
function exampleSvg(ex: RuleExample | undefined): SVGSVGElement | null {
  if (!ex || ex.kind === 'none') return null;
  const NS = 'http://www.w3.org/2000/svg', c = 12, pad = ex.kind === 'grid' && ex.edges ? c : 0;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ex.w * c + pad} ${ex.h * c + pad}`);
  svg.setAttribute('class', 'p-ex');
  svg.setAttribute('aria-hidden', 'true');
  const scope = ex.kind === 'scope' ? new Set(ex.cells) : null;
  const filled = ex.kind === 'scope' ? new Set(ex.filled) : null;
  for (let i = 0; i < ex.w * ex.h; i++) {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', String(pad + (i % ex.w) * c + 1));
    r.setAttribute('y', String(pad + Math.floor(i / ex.w) * c + 1));
    r.setAttribute('width', String(c - 2));
    r.setAttribute('height', String(c - 2));
    r.setAttribute('rx', '2');
    const cls = ex.kind === 'scope'
      ? i === ex.center ? 'ex-num' : `${filled!.has(i) ? 'ex-fill' : 'ex-off'}${scope!.has(i) ? ' ex-scope' : ''}`
      : ex.sol[i] === '1' ? 'ex-fill' : 'ex-off';
    r.setAttribute('class', cls);
    svg.append(r);
  }
  const label = (x: number, y: number, t: string, cls: string) => {
    const e = document.createElementNS(NS, 'text');
    e.setAttribute('x', String(x));
    e.setAttribute('y', String(y));
    e.setAttribute('class', cls);
    e.textContent = t;
    svg.append(e);
  };
  if (ex.kind === 'scope') label((ex.center % ex.w) * c + c / 2, Math.floor(ex.center / ex.w) * c + c / 2 + 3, String(ex.cells.filter((k) => filled!.has(k)).length), 'ex-t');
  if (ex.kind === 'grid' && ex.edges) {
    ex.edges.cols.forEach((v, x) => label(pad + x * c + c / 2, c - 3, String(v), 'ex-e'));
    ex.edges.rows.forEach((v, y) => label(c / 2, pad + y * c + c / 2 + 3, String(v), 'ex-e'));
  }
  return svg;
}
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

function mountSide(key: 'A' | 'B', side: Side) {
  const root = document.querySelector<HTMLElement>(`[data-player="${key}"]`);
  if (!root) return;
  const spec = parseFusionId(side.id)!;
  const rules = buildFusionRules(spec);
  const numberClue = !!spec.cell && spec.cell !== 'givens';
  const ruleList = el('ol', 'p-rules');
  for (const a of atomsOf(spec)) {
    const li = el('li');
    const pic = exampleSvg(data.examples?.[a.id]);
    if (pic) li.append(pic);
    li.append(el('span', '', a.rule));
    ruleList.append(li);
  }
  const tabs = el('div', 'p-tabs');
  const board = el('div', 'p-board');
  board.setAttribute('role', 'grid');
  board.setAttribute('aria-label', `${key}안 퍼즐`);
  const status = el('p', 'p-status');
  status.setAttribute('aria-live', 'polite');
  const bar = el('div', 'p-bar');
  const check = el('button', 'p-btn', '맞는지 확인');
  const reset = el('button', 'p-btn ghost', '처음부터');
  check.type = reset.type = 'button';
  bar.append(check, reset);
  root.append(ruleList, tabs, board, bar, status);

  let pz: FusionPuzzle, marks: number[], cells: HTMLButtonElement[], t0 = 0, done = false, focus = 0, pinned: number | null = null;
  const locked = (i: number) => pz.clues[i] !== null;
  const filled = (i: number) => (locked(i) ? !numberClue && pz.clues[i] === 1 : marks[i] === 1);

  function paint() {
    const scope = pinned === null ? null : new Set(rules.clueScope(pinned, pz.width, pz.height));
    cells.forEach((b, i) => {
      b.classList.toggle('filled', filled(i));
      b.classList.toggle('dot', locked(i) ? !numberClue && pz.clues[i] === 0 : marks[i] === 2);
      b.classList.toggle('scope', !!scope?.has(i));
      b.classList.toggle('pinned', pinned === i);
      b.tabIndex = i === focus ? 0 : -1;
    });
  }
  function solved() {
    return cells.every((_, i) => (filled(i) ? '1' : '0') === pz.solution[i]);
  }
  function after() {
    paint();
    if (!done && solved()) {
      done = true;
      status.textContent = `풀었어요! ${fmt(performance.now() - t0)} 걸렸습니다.`;
      status.className = 'p-status ok';
    }
  }
  function load(k: number) {
    pz = side.puzzles[k];
    marks = Array(pz.width * pz.height).fill(0);
    done = false;
    pinned = null;
    focus = 0;
    t0 = performance.now();
    status.textContent = '칸을 누르면 칠함 → 점(빈칸 표시) → 지움 순서로 바뀝니다.';
    status.className = 'p-status';
    tabs.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
    const edges = pz.edges;
    board.style.setProperty('--cols', String(edges ? pz.width + 1 : pz.width));
    board.replaceChildren();
    cells = [];
    if (edges) {
      board.append(el('div', 'p-edge'));
      edges.cols.forEach((v) => board.append(el('div', 'p-edge', v === null ? '' : String(v))));
    }
    for (let y = 0; y < pz.height; y++) {
      if (edges) board.append(el('div', 'p-edge', edges.rows[y] === null ? '' : String(edges.rows[y])));
      for (let x = 0; x < pz.width; x++) {
        const i = y * pz.width + x;
        const b = el('button', 'p-cell');
        b.type = 'button';
        b.setAttribute('role', 'gridcell');
        b.setAttribute('aria-label', `${y + 1}행 ${x + 1}열${locked(i) && numberClue ? `, 숫자 ${pz.clues[i]}` : ''}`);
        if (locked(i)) {
          b.classList.add('locked');
          if (numberClue) (b.classList.add('clue'), (b.textContent = String(pz.clues[i])));
        }
        b.addEventListener('click', () => {
          focus = i;
          if (locked(i)) pinned = numberClue && pinned !== i ? i : null;
          else if (!done) marks[i] = (marks[i] + 1) % 3;
          after();
        });
        b.addEventListener('keydown', (e) => {
          const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -pz.width, ArrowDown: pz.width }[e.key];
          if (d === undefined) return;
          e.preventDefault();
          const n = i + d;
          if (n < 0 || n >= cells.length || (Math.abs(d) === 1 && Math.floor(n / pz.width) !== y)) return;
          focus = n;
          paint();
          cells[n].focus();
        });
        cells.push(b);
        board.append(b);
      }
    }
    paint();
  }
  side.puzzles.forEach((p, k) => {
    const b = el('button', 'p-tab', TIER[p.tier] ?? p.tier);
    b.type = 'button';
    b.addEventListener('click', () => load(k));
    tabs.append(b);
  });
  check.addEventListener('click', () => {
    if (done) return;
    const wrong = cells.filter((_, i) => !locked(i) && marks[i] !== 0 && (marks[i] === 1 ? '1' : '0') !== pz.solution[i]).length;
    const left = cells.filter((_, i) => !locked(i) && marks[i] === 0).length;
    status.className = 'p-status' + (wrong ? ' bad' : '');
    status.textContent = wrong ? `표시한 칸 중 ${wrong}칸이 정답과 달라요.` : `지금까지 틀린 칸은 없어요. 남은 칸 ${left}개.`;
  });
  reset.addEventListener('click', () => load([...tabs.children].findIndex((b) => b.getAttribute('aria-pressed') === 'true')));
  load(0);
}

mountSide('A', data.A);
mountSide('B', data.B);
