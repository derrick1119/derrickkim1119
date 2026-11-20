// 공용 그림 도구: 굵기 변하는 외곽선 + 2단 셀 명암 + 하이라이트
const INK = '#1b1630';
let UID = 0;
let DEFS = [];
const f = (p) => `${(+p[0]).toFixed(2)},${(+p[1]).toFixed(2)}`;
const uid = (p = 'i') => `${p}${UID++}`;

function ell(cx, cy, rx, ry = rx) {
  return `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0Z`;
}
function rr(x, y, w, h, r) {
  return `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
}
function poly(pts, close = true) {
  return 'M' + pts.map(f).join('L') + (close ? 'Z' : '');
}
// Catmull-Rom → cubic bezier. 점에 세 번째 값 1을 주면 뾰족한 모서리.
function bez(pts, closed = true, t = 1) {
  const n = pts.length;
  const g = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = [];
  const cnt = closed ? n : n - 1;
  for (let i = 0; i < cnt; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + ((p2[0] - p0[0]) / 6) * t, p1[1] + ((p2[1] - p0[1]) / 6) * t];
    const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - ((p3[0] - p1[0]) / 6) * t, p2[1] - ((p3[1] - p1[1]) / 6) * t];
    segs.push([p1, c1, c2, p2]);
  }
  return segs;
}
function smooth(pts, closed = true, t = 1) {
  const s = bez(pts, closed, t);
  return 'M' + f(s[0][0]) + s.map((q) => `C${f(q[1])} ${f(q[2])} ${f(q[3])}`).join('') + (closed ? 'Z' : '');
}
function sample(pts, closed = false, per = 12) {
  const out = [];
  for (const [a, b, c, d] of bez(pts, closed)) {
    for (let k = 0; k < per; k++) {
      const t = k / per, u = 1 - t;
      out.push([
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ]);
    }
  }
  const last = closed ? pts[0] : pts[pts.length - 1];
  out.push([last[0], last[1]]);
  return out;
}
function normals(s) {
  return s.map((p, i) => {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L];
  });
}
// 붓 터치처럼 양끝이 가늘어지는 선(채운 도형)
function taperD(pts, w, o = {}) {
  const a = o.a ?? 0.3, b = o.b ?? 0.35, min = o.min ?? 0.08;
  const s = sample(pts, false, o.per || 10), N = normals(s);
  const L = s.length - 1;
  const left = [], right = [];
  s.forEach((p, i) => {
    const t = i / L;
    let k = Math.min(1, t / a) ** 0.6 * Math.min(1, (1 - t) / b) ** 0.6;
    if (o.prof) k = o.prof(t);
    const ww = (w / 2) * Math.max(min, k);
    left.push([p[0] + N[i][0] * ww, p[1] + N[i][1] * ww]);
    right.push([p[0] - N[i][0] * ww, p[1] - N[i][1] * ww]);
  });
  return poly(left.concat(right.reverse()));
}
function ts(pts, w, color = INK, o = {}) {
  return `<path d="${taperD(pts, w, o)}" fill="${color}" ${o.op ? `opacity="${o.op}"` : ''}/>`;
}
// 리본(목도리 꼬리): 폭 w0→w1, 끝에 V자 홈
function ribbon(pts, w0, w1, notch = 0.6) {
  const s = sample(pts, false, 10), N = normals(s);
  const L = s.length - 1, left = [], right = [];
  s.forEach((p, i) => {
    const t = i / L;
    const ww = (w0 + (w1 - w0) * t) / 2 * (0.85 + 0.15 * Math.sin(t * Math.PI));
    left.push([p[0] + N[i][0] * ww, p[1] + N[i][1] * ww]);
    right.push([p[0] - N[i][0] * ww, p[1] - N[i][1] * ww]);
  });
  const e = s[L], pe = s[L - 2];
  const dx = e[0] - pe[0], dy = e[1] - pe[1], d = Math.hypot(dx, dy) || 1;
  const nb = [e[0] - (dx / d) * w1 * notch, e[1] - (dy / d) * w1 * notch];
  return poly(left.concat([nb], right.reverse()));
}
function clipHalf(pts, fn) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const A = pts[i], B = pts[(i + 1) % pts.length];
    const fa = fn(A[0], A[1]), fb = fn(B[0], B[1]);
    if (fa >= 0) out.push(A);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
    }
  }
  return out;
}
function ellPts(cx, cy, rx, ry, n = 48, rot = 0) {
  const p = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a);
    p.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return p;
}
function clip(d) {
  const id = uid('c');
  DEFS.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
  return `url(#${id})`;
}
function lg(stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, units = '') {
  const id = uid('g');
  DEFS.push(
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${units ? 'gradientUnits="userSpaceOnUse"' : ''}>` +
      stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" ${a !== undefined ? `stop-opacity="${a}"` : ''}/>`).join('') +
      `</linearGradient>`
  );
  return `url(#${id})`;
}
function rg(stops, cx = 0.5, cy = 0.5, r = 0.5, units = '', fx, fy) {
  const id = uid('g');
  DEFS.push(
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" ${fx !== undefined ? `fx="${fx}" fy="${fy}"` : ''} ${units ? 'gradientUnits="userSpaceOnUse"' : ''}>` +
      stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" ${a !== undefined ? `stop-opacity="${a}"` : ''}/>`).join('') +
      `</radialGradient>`
  );
  return `url(#${id})`;
}
// 셀 명암 부품: 바깥 외곽선(오른쪽 아래 두껍게) + 그림자색 위에 기본색을 왼쪽 위로 밀어 얹음 + 하이라이트
function part(d, o) {
  const lw = o.lw ?? 2;
  const sh = o.sh ?? [-3, -3];
  const out = o.noOut
    ? ''
    : `<path d="${d}" fill="${o.ol || INK}" stroke="${o.ol || INK}" stroke-width="${lw * 1.9}" stroke-linejoin="round" transform="translate(${lw * 0.35},${lw * 0.6})"/>` +
      `<path d="${d}" fill="${o.ol || INK}" stroke="${o.ol || INK}" stroke-width="${lw}" stroke-linejoin="round"/>`;
  const c = clip(d);
  const hl = o.hd ? `<path d="${o.hd}" fill="${o.h || '#fff'}" opacity="${o.ho ?? 0.55}"/>` : '';
  return (
    out +
    `<g clip-path="${c}"><path d="${d}" fill="${o.s || o.f}"/>` +
    (o.s ? `<path d="${d}" fill="${o.f}" transform="translate(${sh[0]},${sh[1]})"/>` : '') +
    (o.x || '') +
    hl +
    `</g>`
  );
}
function g(body, tr = '', extra = '') {
  return `<g ${tr ? `transform="${tr}"` : ''} ${extra}>${body}</g>`;
}
// 공통 필터들
function stdFilters() {
  return `
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.2 1.05"/></filter>
  <filter id="blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="blur4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="sil" x="-10%" y="-10%" width="120%" height="120%"><feFlood flood-color="#10101e"/><feComposite in2="SourceAlpha" operator="in"/></filter>
  <filter id="sil2" x="-10%" y="-10%" width="120%" height="120%"><feFlood flood-color="#e9e6f5"/><feComposite in2="SourceAlpha" operator="in"/></filter>
  <filter id="slowgray" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.25 0.45 0.12 0 0.02  0.25 0.47 0.13 0 0.04  0.27 0.5 0.16 0 0.09  0 0 0 1 0"/></filter>
  <filter id="inkgray" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.3 0.55 0.15 0 -0.02  0.3 0.55 0.15 0 -0.02  0.3 0.55 0.15 0 0  0 0 0 1 0"/></filter>
  `;
}
function svgWrap(w, h, body, cls = '') {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${DEFS.join('')}</defs>${body}</svg>`;
  DEFS = [];
  return s;
}
// 반짝이는 큰 눈. lid: 위 눈꺼풀이 덮는 비율(겨눔), slope: 눈꼬리 기울기
function eye(cx, cy, rx, ry, o = {}) {
  let pts = ellPts(cx, cy, rx, ry, 56);
  const lid = o.lid || 0, slope = o.slope || 0;
  const ly = (x) => cy - ry + lid * 2 * ry + slope * (x - cx);
  if (lid) pts = clipHalf(pts, (x, y) => y - ly(x));
  const d = poly(pts);
  const c = clip(d);
  const lx = (o.look || [0, 0])[0], lyy = (o.look || [0, 0])[1];
  const iris = o.iris || '#3fd9cf';
  const base = o.base || '#1d1b3a';
  const grad = lg([[0, base], [0.55, base], [1, iris]]);
  let s = `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${o.lw || 1.6}" stroke-linejoin="round"/>`;
  s += `<g clip-path="${c}">`;
  if (o.sclera) s += `<path d="${d}" fill="${o.sclera}"/>`;
  const ir = o.sclera ? 0.62 : 1.05;
  s += `<ellipse cx="${cx + lx}" cy="${cy + lyy + (o.sclera ? 0 : ry * 0.05)}" rx="${rx * ir}" ry="${ry * ir}" fill="${grad}"/>`;
  if (o.sclera) s += `<ellipse cx="${cx + lx}" cy="${cy + lyy}" rx="${rx * 0.34}" ry="${ry * 0.36}" fill="${base}"/>`;
  if (o.ring) s += `<ellipse cx="${cx + lx}" cy="${cy + lyy + ry * 0.1}" rx="${rx * 0.62}" ry="${ry * 0.6}" fill="none" stroke="${o.ring}" stroke-width="${rx * 0.16}" opacity=".8"/>`;
  s += `<ellipse cx="${cx + lx - rx * 0.3}" cy="${cy + lyy - ry * 0.32 + (lid ? lid * ry * 0.9 : 0)}" rx="${rx * 0.36}" ry="${ry * 0.3}" fill="#fff"/>`;
  s += `<circle cx="${cx + lx + rx * 0.34}" cy="${cy + lyy + ry * 0.38}" r="${rx * 0.15}" fill="#fff" opacity=".9"/>`;
  s += `</g>`;
  // 위 속눈썹 라인(두꺼운 붓터치)
  if (lid) {
    const x0 = cx - rx * 1.05, x1 = cx + rx * 1.1;
    s += ts([[x0, ly(x0) + 0.5], [cx, ly(cx) - 0.4], [x1, ly(x1) - 0.6]], (o.lw || 1.6) * 2.2, INK, { a: 0.15, b: 0.25 });
  } else {
    s += ts(ellPts(cx, cy, rx, ry, 24).filter((p, i) => i >= 13 && i <= 23).concat([[cx + rx * 1.02, cy - ry * 0.1]]), (o.lw || 1.6) * 2.1, INK, { a: 0.2, b: 0.2 });
  }
  return s;
}
const $ = (sel) => document.querySelector(sel);
// 반으로 갈라진 컷: art(카드 좌표) 를 (cx,cy) 지나는 ang° 직선으로 자른다
function split(art, cx, cy, ang, A, B, o = {}) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, R = 400;
  const p1 = [cx - dx * R, cy - dy * R], p2 = [cx + dx * R, cy + dy * R];
  const up = poly([p1, p2, [p2[0] - nx * R, p2[1] - ny * R], [p1[0] - nx * R, p1[1] - ny * R]]);
  const dn = poly([p1, p2, [p2[0] + nx * R, p2[1] + ny * R], [p1[0] + nx * R, p1[1] + ny * R]]);
  const mid = uid('m');
  DEFS.push(`<mask id="${mid}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1400" height="1400"><g filter="url(#sil2)">${art}</g></mask>`);
  const edge = (side) =>
    `<path d="M${f(p1)}L${f(p2)}" stroke="${o.edge || '#f1d6a6'}" stroke-width="${o.ew || 3}" transform="translate(${side * nx * (o.ew || 3) * 0.5},${side * ny * (o.ew || 3) * 0.5})" mask="url(#${mid})"/>`;
  const U = g(`<g clip-path="${clip(up)}">${art}${edge(-1)}</g>`, A), Dn = g(`<g clip-path="${clip(dn)}">${art}${edge(1)}</g>`, B);
  return o.parts ? [U, Dn] : U + Dn;
}
// 칼빛 한 줄 (흰 심 + 옅은 번짐)
function slash(pts, w, glow = '#ffffff', o = {}) {
  return (
    `<path d="${taperD(pts, w * 3.2, { a: 0.35, b: 0.45 })}" fill="${glow}" opacity="${o.go ?? 0.22}" filter="url(#blur2)"/>` +
    `<path d="${taperD(pts, w, { a: 0.3, b: 0.5, min: 0.02 })}" fill="#fff"/>`
  );
}
function slowMatrix(keep = 0.28, tint = [0.86, 0.93, 1.08], add = [0, 0.02, 0.06]) {
  const k = 1 - keep, L = [0.3, 0.59, 0.11];
  const rows = [0, 1, 2].map((c) => {
    const r = L.map((l, j) => l * k * tint[c] + (j === c ? keep : 0));
    return r.map((v) => v.toFixed(4)).join(' ') + ` 0 ${add[c]}`;
  });
  return rows.join('  ') + '  0 0 0 1 0';
}
