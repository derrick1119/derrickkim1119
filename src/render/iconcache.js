// 캔버스 그림을 DOM 용 이미지(data URL)로 굽는다. 한 번 구운 것은 다시 쓰지 않는다.
import { CAUSE_BY_ID, WATCHERS } from '../data/content.js';
import { C } from './draw.js';
import { drawUfo, UFO_HALF_WIDTH } from './ufo.js';
import { drawWatcher } from './people.js';
import { drawSpecimen } from './specimens.js';
import { drawEmblem } from './emblems.js';

const cache = new Map();
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
  }
  ctx.restore();
}

/**
 * 아이콘 이미지 주소.
 * @param {'specimen'|'watcher'|'emblem'|'form'} kind
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
  ctx.scale(scale, scale);
  paintIcon(ctx, kind, id, size);
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
