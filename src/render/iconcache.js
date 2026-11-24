// 캔버스 그림을 DOM 용 이미지(data URL)로 굽는다. 한 번 구운 것은 다시 쓰지 않는다.
import { CAUSE_BY_ID, WATCHERS } from '../data/content.js';
import { C } from './draw.js';
import { drawUfo, UFO_HALF_WIDTH } from './ufo.js';
import { drawWatcher } from './people.js';
import { drawSpecimen } from './specimens.js';
import { drawEmblem } from './emblems.js';

const cache = new Map();
/** 3D 아이콘 촬영기(3D 장면이 켜지면 등록된다). (kind, id, px) => HTMLCanvasElement | null */
let render3d = null;

/** 3D 촬영기를 등록한다. 등록 전에 2D 로 그려 둔 아이콘은 버리고 새로 찍는다. */
export function setIconRenderer(fn) {
  render3d = fn;
  cache.clear();
}
/** 표본마다 꼬리·줄 때문에 중심이 어긋나는 만큼 보정한다. [dy, 배율] */
const SPECIMEN_FIT = {
  dandelion: [-1, 1.3],
  firefly: [1, 1.5],
  balloon: [-2, 1.06],
  kite: [-4, 1.0],
  chicken: [1, 1.15],
  cow: [-0.5, 0.94],
  drone: [1, 0.95],
  weather: [0, 0.95],
  satellite: [3.5, 0.93],
  meteor: [3, 1.15],
};

function paintIcon(ctx, kind, id, size) {
  const c = size / 2;
  ctx.save();
  switch (kind) {
    case 'specimen': {
      const [dy, k] = SPECIMEN_FIT[id] || [0, 1];
      const s = (size / 46) * k;
      ctx.translate(c, c + dy * s);
      ctx.scale(s, s);
      drawSpecimen(ctx, id, 0.4, 1);
      break;
    }
    case 'watcher': {
      if (id === 'balloonist') {
        const s = size / 118;
        ctx.translate(c, size * 0.975);
        ctx.scale(s, s);
      } else if (id === 'astronaut') {
        const s = size / 66;
        ctx.translate(c, size * 0.56);
        ctx.scale(s, s);
      } else {
        // 개·낚싯대·쇠스랑·배낭처럼 한쪽으로 튀어나온 것을 감안해 가운데로 옮긴다
        const SHIFT = { walker: 9, fisher: 7, farmer: 3, camper: 2 };
        const s = (size / 74) * (WATCHERS[id]?.scale ? 1.08 : 1);
        ctx.translate(c + (SHIFT[id] || 0) * s, size * 0.975);
        ctx.scale(s, s);
      }
      drawWatcher(ctx, id, { t: 0.2, dir: 1, walk: 0, look: 1 });
      break;
    }
    case 'emblem': {
      const s = size / 44;
      ctx.translate(c, c);
      ctx.scale(s, s);
      drawEmblem(ctx, id, 0.3);
      break;
    }
    case 'form': {
      const s = size / (UFO_HALF_WIDTH[id] * 2 + 10);
      ctx.translate(c, c + 4 * s + (id === 0 ? 4 * s : 6 * s));
      ctx.scale(s, s);
      drawUfo(ctx, { form: id, t: 0.6, mood: 'idle', lit: 1, beam: 0 });
      break;
    }
    case 'cosmetic':
      paintCosmetic(ctx, String(id), size);
      break;
  }
  ctx.restore();
}

/** 2D 대체 그림의 꾸미기 색 견본(3D 를 못 쓸 때만). [주색, 보조색] */
const COSMETIC_SWATCH = {
  'outfit:none': ['#dc84ff', '#ff8a3c'],
  'outfit:cadet': ['#c27a45', '#fff1d8'],
  'outfit:agent': ['#1b1733', '#ffffff'],
  'outfit:star': ['#2a2f8f', '#ffc444'],
  'outfit:bunny': ['#fffafc', '#ff9cc8'],
  'outfit:raincoat': ['#ffd13a', '#3b4f9e'],
  'outfit:chef': ['#ffffff', '#ff8a3c'],
  'outfit:astro': ['#ffffff', '#5f86ff'],
  'paint:navy': ['#352c94', '#ffc444'],
  'paint:sunset': ['#ff8466', '#fff1d6'],
  'paint:mint': ['#8ff2b4', '#ff7fcf'],
  'paint:galaxy': ['#3a2088', '#d48cff'],
  'paint:gold': ['#ffc23a', '#262a78'],
  'beam:cyan': ['#5ff0ff', '#c6fdff'],
  'beam:pink': ['#ff78d8', '#ffd0f2'],
  'beam:gold': ['#ffc93c', '#fff0b8'],
  'beam:rainbow': ['#ff8af0', '#8ad8ff'],
};

/** 꾸미기 2D 대체 그림: 의상 = 보라 피포 얼굴 + 모자 색, 도색 = 그 색 접시, 빔 = 그 색 빛기둥. */
function paintCosmetic(ctx, id, size) {
  const [a, b] = COSMETIC_SWATCH[id] || ['#8a6ad8', '#ffffff'];
  const kind = id.split(':')[0];
  const c = size / 2;
  ctx.lineWidth = Math.max(1.5, size * 0.035);
  ctx.strokeStyle = '#2b1a5e';
  if (kind === 'outfit') {
    ctx.fillStyle = '#dc84ff';
    ctx.beginPath();
    ctx.ellipse(c, c + size * 0.06, size * 0.34, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (id !== 'outfit:none') {
      ctx.fillStyle = a;
      ctx.beginPath();
      ctx.ellipse(c, c - size * 0.06, size * 0.36, size * 0.2, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.arc(c, c - size * 0.2, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2a1660';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(c + s * size * 0.12, c + size * 0.08, size * 0.05, size * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'paint') {
    ctx.fillStyle = 'rgba(198,246,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(c, c - size * 0.04, size * 0.17, size * 0.17, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = a;
    ctx.beginPath();
    ctx.ellipse(c, c + size * 0.06, size * 0.42, size * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = b;
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.beginPath();
    ctx.ellipse(c, c + size * 0.04, size * 0.34, size * 0.07, 0, Math.PI, 0, true);
    ctx.stroke();
  } else {
    const g = ctx.createLinearGradient(0, size * 0.3, 0, size * 0.95);
    if (id === 'beam:rainbow') ['#ff7a9a', '#ffd25a', '#7dffb0', '#6ac8ff', '#c08aff'].forEach((col, i) => g.addColorStop(i / 4, col));
    else {
      g.addColorStop(0, b);
      g.addColorStop(1, a);
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(c - size * 0.08, size * 0.32);
    ctx.lineTo(c + size * 0.08, size * 0.32);
    ctx.lineTo(c + size * 0.3, size * 0.94);
    ctx.lineTo(c - size * 0.3, size * 0.94);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#352c94';
    ctx.beginPath();
    ctx.ellipse(c, size * 0.3, size * 0.36, size * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

const sprites = new Map();
/**
 * 3D 모델을 찍은 그림을 캔버스 그대로 돌려준다(미니게임처럼 캔버스에 직접 그릴 때). 3D 를 못 쓰면 null.
 * @param {'specimen'|'watcher'|'form'} kind
 * @param {object} [opts] 표정·자세(studio.js renderIcon3d 참고)
 */
export function spriteCanvas(kind, id, px, opts = null) {
  if (!render3d) return null;
  const key = `${kind}:${id}:${px}:${opts ? JSON.stringify(opts) : ''}`;
  if (sprites.has(key)) return sprites.get(key);
  let cv = null;
  try {
    cv = render3d(kind, id, px, opts || undefined);
  } catch (err) {
    console.warn('3D 그림을 찍지 못했습니다.', err);
  }
  sprites.set(key, cv);
  return cv;
}

/**
 * 아이콘 이미지 주소.
 * @param {'specimen'|'watcher'|'emblem'|'form'|'cosmetic'} kind  cosmetic: id = 'outfit:bunny' | 'paint:galaxy' | 'beam:rainbow'
 * @param {string|number} id
 * @param {number} [size] CSS 픽셀 한 변
 * @param {boolean} [silhouette] 잠긴 항목용 실루엣
 */
export function iconURL(kind, id, size = 56, silhouette = false) {
  const key = `${kind}:${id}:${size}:${silhouette ? 1 : 0}`;
  let url = cache.get(key);
  if (url) return url;
  const scale = 2;
  const cv = document.createElement('canvas');
  cv.width = size * scale;
  cv.height = size * scale;
  const ctx = cv.getContext('2d');
  let shot = null;
  if (render3d && kind !== 'emblem') {
    try {
      shot = render3d(kind, id, size * scale);
    } catch (err) {
      console.warn('3D 아이콘을 찍지 못해 2D 로 그립니다.', err);
      shot = null;
    }
  }
  if (shot) ctx.drawImage(shot, 0, 0, size * scale, size * scale);
  ctx.scale(scale, scale);
  if (!shot) paintIcon(ctx, kind, id, size);
  if (silhouette) {
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = C.inkSoft;
    ctx.fillRect(0, 0, size, size);
  }
  url = cv.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** 사건 id 에 맞는 아이콘(사건이 어디서 왔는지에 따라 고른다). */
export function causeIconURL(causeId, size = 56, silhouette = false) {
  const c = CAUSE_BY_ID[causeId];
  if (!c) return iconURL('emblem', 'none', size, silhouette);
  if (c.kind === 'specimen') return iconURL('specimen', c.ref, size, silhouette);
  if (c.kind === 'gaze') return iconURL('watcher', c.ref, size, silhouette);
  if (c.kind === 'mission') return iconURL('emblem', c.ref, size, silhouette);
  return iconURL('emblem', c.id, size, silhouette);
}
