// DOM 을 짧게 만드는 도우미. 글자는 항상 textContent 로만 넣는다.
import { ICONS } from './icons.js';

/**
 * 요소를 만든다. h('button', { class: 'btn', onClick: fn }, '확인')
 * props: class · text · style(객체, CSS 변수 가능) · dataset · on이벤트 · 그 밖은 속성
 */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') setStyle(el, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  add(el, kids);
  return el;
}

export function add(el, kids) {
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    if (Array.isArray(kid)) add(el, kid);
    else el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function setStyle(el, style) {
  for (const [k, v] of Object.entries(style)) {
    if (k.startsWith('--')) el.style.setProperty(k, String(v));
    else el.style[k] = v;
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** 선 아이콘(SVG). 이름은 icons.js 의 키. */
export function icon(name, size = 22) {
  const span = document.createElement('span');
  span.className = 'ico';
  span.setAttribute('aria-hidden', 'true');
  span.style.width = span.style.height = `${size}px`;
  // ICONS 는 이 저장소 안의 고정 문자열이라 innerHTML 로 넣어도 안전하다.
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return span;
}

/** 캔버스에서 구운 그림을 넣는 img. */
export function img(src, size, cls = '') {
  return h('img', { class: `pic ${cls}`.trim(), src, width: size, height: size, alt: '', draggable: 'false' });
}

/** 연구비 표기: ◈ 1,240 */
export function grantTag(text, cls = '') {
  return h('span', { class: `grant ${cls}`.trim() }, icon('grant', 15), h('b', { text }));
}
