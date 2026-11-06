/**
 * 규칙 옆 미니 그림 SVG (실험 0008·0009). 계기판 플레이어와 교차점 제품이 함께 쓴다.
 * 숫자 규칙: 세는 칸(주황 테두리)과 그중 칠한 칸, 판 규칙: 4×4 예시 정답. CSS 클래스 ex-* 는 각 페이지가 칠한다.
 */
import type { RuleExample } from './examples.ts';

export function exampleSvg(ex: RuleExample | undefined): SVGSVGElement | null {
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
