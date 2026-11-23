// collection 기능의 화면(패널·HUD·보고서 단계). hooks.js 에 등록한다.
//   · 관측실 탭: 피포의 방(진열 선반 → 작은 보정), 반짝이 도감, 셀카 앨범
//   · 계기판 사진기 버튼: 찰칵 → 엽서 틀에 넣어 앨범(IndexedDB, 저장본 밖)에 남긴다
//   · 반짝이 표본 알림(첫 발견 보상)
import '../../features/collection/index.js';
import { SPECIMENS } from '../../data/content.js';
import { formatSize, formatInt } from '../../core/format.js';
import { t, getLang } from '../../i18n/index.js';
import { iconURL } from '../../render/iconcache.js';
import { rrect, star, label, FONT_DISPLAY, FONT_BODY } from '../../render/draw.js';
import { h, icon, img, grantTag } from '../dom.js';
import { addIcons } from '../icons.js';
import { registerPanel, registerHud, registerBind } from '../hooks.js';
import {
  SHELF_MAX,
  ALBUM_MAX,
  ALBUM_GOALS,
  STAGE_IDS,
  PHOTO_COOLDOWN,
  SHINY_DISPLAY_MULT,
  ROOM_BONUS,
} from '../../features/collection/rules.js';

addIcons({
  room: '<path d="M4 10.5 12 4l8 6.5V20H4v-9.5z"/><path d="M7.5 14h9M7.5 17.5h9"/>',
  camera:
    '<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.4"/>',
  sparkle:
    '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/><path d="M19 15.5c.2 1.3.9 2 2.2 2.2-1.3.2-2 .9-2.2 2.2-.2-1.3-.9-2-2.2-2.2 1.3-.2 2-.9 2.2-2.2z"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/><path d="M10.5 11v5.5M13.5 11v5.5"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19.5h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  photo: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>',
});

const fxOf = (ui) => ui.game.fx?.collection || null;
const specName = (id) => t(`specimen.${id}.name`);
const num = (v) => String(Math.round(v * 100) / 100);

/** 진열 효과 한 줄. */
function bonusText(key, v) {
  const a = Math.abs(v);
  let n;
  if (key === 'noticeTime' || key === 'comboWindow') n = num(a);
  else n = num(a * 100);
  return t(`collection.bonus.${key}`, { v: n });
}

// ───────── 소리 ─────────
// 효과음 목록에 없는 소리는 오디오 엔진의 합성 도구로 직접 낸다(없으면 가까운 효과음으로).

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
function play(ui, fn, fallback) {
  const a = ui.audio;
  if (!a?.sfxOn || !a.ready) return;
  try {
    if (typeof a._tone === 'function' && typeof a._noise === 'function') fn(a);
    else a.sfx(fallback);
  } catch {
    /* 소리 하나 실패해도 무시 */
  }
}
const shutterSound = (ui) =>
  play(
    ui,
    (a) => {
      a._noise({ dur: 0.035, gain: 0.5, freq: 4200, q: 0.7, type: 'highpass' });
      a._tone({ freq: 1500, type: 'square', dur: 0.025, gain: 0.05 });
      a._noise({ at: 0.08, dur: 0.06, gain: 0.38, freq: 2400, q: 0.7, type: 'highpass' });
    },
    'click',
  );
const shinySound = (ui) =>
  play(
    ui,
    (a) => {
      [88, 92, 95, 100, 104].forEach((n, i) => a._tone({ freq: NOTE(n), type: 'sine', at: i * 0.055, dur: 0.26, gain: 0.13 }));
      a._noise({ at: 0.1, dur: 0.4, gain: 0.05, freq: 7000, q: 0.5, type: 'highpass' });
    },
    'achievement',
  );
const placeSound = (ui) =>
  play(
    ui,
    (a) => {
      a._tone({ freq: 220, to: 140, type: 'triangle', dur: 0.09, gain: 0.22 });
      a._tone({ freq: NOTE(84), type: 'sine', at: 0.06, dur: 0.18, gain: 0.12 });
    },
    'buy',
  );

// ───────── 앨범 보관함(저장본 밖) ─────────
// IndexedDB 에 사진(Blob)을 둔다. 못 쓰면 localStorage(data URL), 그것도 안 되면 이번 실행 동안만 기억한다.

const DB_NAME = 'shh-ufo-album';
const DB_STORE = 'photos';
const LS_KEY = 'shh-ufo:album:v1';
const DATA_URL_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

const album = {
  items: [], // 최신이 앞. { id, t, stage, gen, size, bomb, fav, blob, url }
  mode: 'mem', // 'idb' | 'ls' | 'mem'
  ready: false,
  ver: 0,
  db: null,
  loading: null,
};
const bump = () => {
  album.ver++;
};

function idbOpen() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbDo(mode, fn) {
  return new Promise((resolve, reject) => {
    try {
      const tx = album.db.transaction(DB_STORE, mode);
      const store = tx.objectStore(DB_STORE);
      const out = fn(store);
      tx.oncomplete = () => resolve(out?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/** 저장된 기록 하나를 검증한다(다른 앱·확장 프로그램이 건드렸을 수도 있다). */
function cleanRecord(r) {
  if (!r || typeof r !== 'object' || typeof r.id !== 'string' || r.id.length > 40) return null;
  let blob = null;
  let url = null;
  if (typeof Blob !== 'undefined' && r.blob instanceof Blob && /^image\/(jpeg|png|webp)$/.test(r.blob.type)) {
    blob = r.blob;
    url = URL.createObjectURL(blob);
  } else if (typeof r.data === 'string' && r.data.length < 400000 && DATA_URL_RE.test(r.data)) {
    url = r.data;
  } else return null;
  const n = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    id: r.id,
    t: n(r.t, 0),
    stage: STAGE_IDS.includes(r.stage) ? r.stage : STAGE_IDS[0],
    gen: Math.max(1, Math.floor(n(r.gen, 1))),
    size: Math.max(0, n(r.size, 30)),
    bomb: r.bomb === true,
    fav: r.fav === true,
    blob,
    url,
  };
}

function lsWrite() {
  try {
    const rows = album.items.map(({ blob, url, ...rest }) => ({ ...rest, data: url }));
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

function loadAlbum() {
  if (album.loading) return album.loading;
  album.loading = (async () => {
    let items = [];
    album.db = await idbOpen();
    if (album.db) {
      try {
        const rows = await idbDo('readonly', (s) => s.getAll());
        items = (rows || []).map(cleanRecord).filter(Boolean);
        album.mode = 'idb';
      } catch {
        album.db = null;
      }
    }
    if (!album.db) {
      try {
        const rows = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        items = (Array.isArray(rows) ? rows : []).map(cleanRecord).filter(Boolean);
        localStorage.setItem(`${LS_KEY}:probe`, '1');
        localStorage.removeItem(`${LS_KEY}:probe`);
        album.mode = 'ls';
      } catch {
        album.mode = 'mem';
      }
    }
    items.sort((a, b) => b.t - a.t);
    album.items = items.slice(0, ALBUM_MAX * 2);
    album.ready = true;
    bump();
    return album;
  })();
  return album.loading;
}

const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });

function dataURLToBlob(url) {
  const [head, b64] = url.split(',');
  const type = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

const forget = (item) => {
  if (item.blob && item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
};

/**
 * 사진을 넣는다. 꽉 찼으면 즐겨찾기하지 않은 가장 오래된 사진부터 밀어낸다.
 * @returns {Promise<{ok: boolean, reason?: 'full', item?: object}>}
 */
async function addPhoto(blob, meta) {
  await loadAlbum();
  if (album.items.length >= ALBUM_MAX && !album.items.some((i) => !i.fav)) return { ok: false, reason: 'full' };
  const item = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    t: Date.now(),
    stage: meta.stage,
    gen: meta.gen,
    size: meta.size,
    bomb: !!meta.bomb,
    fav: false,
    blob: null,
    url: null,
  };
  if (album.mode === 'ls') item.url = await blobToDataURL(blob);
  else {
    item.blob = blob;
    item.url = URL.createObjectURL(blob);
  }
  album.items.unshift(item);
  const dropped = [];
  while (album.items.length > ALBUM_MAX) {
    let k = -1;
    for (let i = album.items.length - 1; i >= 0; i--) {
      if (!album.items[i].fav) {
        k = i;
        break;
      }
    }
    if (k < 0) break;
    dropped.push(...album.items.splice(k, 1));
  }
  if (album.mode === 'idb') {
    try {
      await idbDo('readwrite', (s) => {
        s.put(record(item));
        for (const d of dropped) s.delete(d.id);
      });
    } catch {
      album.mode = 'mem'; // 저장 공간이 모자라는 등: 이번 실행 동안만 기억한다
    }
  } else if (album.mode === 'ls' && !lsWrite()) {
    album.mode = 'mem';
  }
  dropped.forEach(forget);
  bump();
  return { ok: true, item };
}

/** 앨범 보관함(점검·연기 시험용). */
export const albumStore = { state: album, load: loadAlbum, add: (blob, meta) => addPhoto(blob, meta), setFav: (item, fav) => setFav(item, fav), remove: (item) => removePhoto(item) };

const record = (i) => ({ id: i.id, t: i.t, stage: i.stage, gen: i.gen, size: i.size, bomb: i.bomb, fav: i.fav, blob: i.blob });

async function setFav(item, fav) {
  item.fav = fav;
  if (album.mode === 'idb') await idbDo('readwrite', (s) => s.put(record(item))).catch(() => {});
  else if (album.mode === 'ls') lsWrite();
  bump();
}

async function removePhoto(item) {
  album.items = album.items.filter((i) => i !== item);
  if (album.mode === 'idb') await idbDo('readwrite', (s) => s.delete(item.id)).catch(() => {});
  else if (album.mode === 'ls') lsWrite();
  forget(item);
  bump();
}

// ───────── 엽서 만들기 ─────────

const PC_W = 320;
const PC_H = 432;
const PH_X = 12;
const PH_Y = 12;
const PH_W = 296;
const PH_H = 318;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('image'));
    im.src = src;
  });
}

/** 셔터를 누른 순간의 화면을 붙잡는다(동기). 3D 장면이면 3D 그림 + 그 위 2D 효과 층, 2D 장면이면 캔버스 그대로. */
function grabScene(ui) {
  const sc = ui.scene;
  const w = sc.w || sc.canvas.clientWidth || 390;
  const h = sc.h || sc.canvas.clientHeight || 760;
  const k = Math.min(2, 720 / w);
  const W = Math.round(w * k);
  const H = Math.round(h * k);
  let glUrl = null;
  const is3d = typeof sc.capture === 'function';
  if (is3d) glUrl = sc.capture(W, 0.92);
  const ov = document.createElement('canvas');
  ov.width = W;
  ov.height = H;
  try {
    ov.getContext('2d').drawImage(sc.canvas, 0, 0, W, H);
  } catch {
    /* 그릴 수 없으면 효과 층 없이 */
  }
  return {
    w,
    h,
    k,
    W,
    H,
    is3d,
    glUrl,
    ov,
    ufo: { x: sc.ufo?.x ?? w / 2, y: sc.ufo?.y ?? h * 0.4, r: sc.home?.r ?? 50 },
    groundY: sc.groundY ?? h * 0.75,
  };
}

async function develop(g) {
  const out = document.createElement('canvas');
  out.width = g.W;
  out.height = g.H;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#7fb8f0';
  ctx.fillRect(0, 0, g.W, g.H);
  if (g.is3d) {
    if (!g.glUrl) return null;
    ctx.drawImage(await loadImage(g.glUrl), 0, 0, g.W, g.H);
  }
  ctx.drawImage(g.ov, 0, 0);
  return out;
}

/** 사진에 담을 영역(CSS px): 기체 윗부분이 잘리지 않게, 땅과 지구인이 아래쪽에 보이게. */
function cropRegion(g) {
  const rw = g.w;
  const rh = Math.min(g.h, (rw * PH_H) / PH_W);
  let top = g.groundY + 40 - rh;
  top = Math.min(top, g.ufo.y - g.ufo.r * 1.3 - 18);
  top = Math.min(Math.max(top, 0), g.h - rh);
  return { x: 0, y: top, w: rw, h: rh };
}

function drawStamp(ctx, x, y, w, hgt, stageId) {
  const cv = document.createElement('canvas');
  const s = 2;
  cv.width = w * s;
  cv.height = hgt * s;
  const c = cv.getContext('2d');
  c.scale(s, s);
  c.fillStyle = '#fffdf6';
  c.fillRect(0, 0, w, hgt);
  // 톱니 가장자리
  c.globalCompositeOperation = 'destination-out';
  const r = 2.6;
  for (let px = 4; px < w; px += 7.4) {
    c.beginPath();
    c.arc(px, 0, r, 0, Math.PI * 2);
    c.arc(px, hgt, r, 0, Math.PI * 2);
    c.fill();
  }
  for (let py = 4; py < hgt; py += 7.4) {
    c.beginPath();
    c.arc(0, py, r, 0, Math.PI * 2);
    c.arc(w, py, r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  // 그림: 하늘 + 작은 UFO + 별
  const ix = 6;
  const iy = 6;
  const iw = w - 12;
  const ih = hgt - 12;
  const night = stageId === 'orbit' || stageId === 'observatory';
  const g = c.createLinearGradient(0, iy, 0, iy + ih);
  g.addColorStop(0, night ? '#3b3f9e' : '#59c9ff');
  g.addColorStop(1, night ? '#1d2160' : '#c9f0ff');
  c.fillStyle = g;
  c.fillRect(ix, iy, iw, ih);
  c.fillStyle = '#ffe45c';
  star(c, ix + iw * 0.22, iy + ih * 0.24, 4.5, 1.6, 5);
  c.fill();
  c.fillStyle = '#ffffff';
  star(c, ix + iw * 0.8, iy + ih * 0.16, 3, 1, 4, 0);
  c.fill();
  const cx = ix + iw / 2;
  const cy = iy + ih * 0.56;
  c.lineWidth = 1.6;
  c.strokeStyle = '#1f2350';
  c.fillStyle = '#bdf8ff';
  c.beginPath();
  c.ellipse(cx, cy - 3, 7.5, 7, 0, Math.PI, 0);
  c.fill();
  c.stroke();
  c.fillStyle = '#b79cff';
  c.beginPath();
  c.ellipse(cx, cy, 17, 5.5, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#6ff2ff';
  for (const dx of [-9, 0, 9]) {
    c.beginPath();
    c.arc(cx + dx, cy + 0.6, 1.5, 0, Math.PI * 2);
    c.fill();
  }
  // 빔
  c.fillStyle = 'rgba(255, 243, 168, 0.75)';
  c.beginPath();
  c.moveTo(cx - 4, cy + 5);
  c.lineTo(cx + 4, cy + 5);
  c.lineTo(cx + 9, iy + ih);
  c.lineTo(cx - 9, iy + ih);
  c.closePath();
  c.fill();
  c.lineWidth = 1.2;
  c.strokeStyle = 'rgba(31,35,80,0.55)';
  c.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
  c.font = `9px ${FONT_DISPLAY}`;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#1f2350';
  c.fillText('UFO', ix + iw - 3, iy + ih - 3);
  ctx.save();
  ctx.translate(x + w / 2, y + hgt / 2);
  ctx.rotate(0.07);
  ctx.shadowColor = 'rgba(17,20,58,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.drawImage(cv, -w / 2, -hgt / 2, w, hgt);
  ctx.restore();
}

function drawPostmark(ctx, x, y, text) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.22);
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = '#2d3478';
  ctx.fillStyle = '#2d3478';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `10px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EARTH', 0, -12);
  ctx.font = `9.5px ${FONT_BODY}`;
  ctx.fillText(text, 0, 2);
  star(ctx, 0, 14, 4, 1.6, 5);
  ctx.fill();
  // 물결 소인
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const yy = -10 + i * 10;
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const xx = -38 - k * 2.4;
      const wy = yy + Math.sin(k * 0.7) * 2.4;
      if (k === 0) ctx.moveTo(xx, wy);
      else ctx.lineTo(xx, wy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawBombStamp(ctx, x, y) {
  const text = t('collection.album.bomb');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.2);
  ctx.globalAlpha = 0.9;
  ctx.font = `34px ${FONT_DISPLAY}`;
  const tw = Math.max(120, ctx.measureText(text).width + 34);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#d8362f';
  rrect(ctx, -tw / 2, -30, tw, 60, 10);
  ctx.stroke();
  ctx.lineWidth = 2;
  rrect(ctx, -tw / 2 + 6, -24, tw - 12, 48, 7);
  ctx.stroke();
  ctx.fillStyle = '#d8362f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 2);
  ctx.restore();
}

function dateText(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** 붙잡은 화면을 엽서로 꾸민다. */
function composePostcard(scene, g, meta) {
  const cv = document.createElement('canvas');
  cv.width = PC_W;
  cv.height = PC_H;
  const ctx = cv.getContext('2d');
  // 종이
  const paper = ctx.createLinearGradient(0, 0, 0, PC_H);
  paper.addColorStop(0, '#fffcf3');
  paper.addColorStop(1, '#f6e6c2');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, PC_W, PC_H);
  ctx.fillStyle = 'rgba(160, 120, 60, 0.06)';
  for (let i = 0; i < 90; i++) ctx.fillRect((i * 97) % PC_W, (i * 53) % PC_H, 2, 2);
  // 사진
  const r = cropRegion(g);
  ctx.save();
  rrect(ctx, PH_X, PH_Y, PH_W, PH_H, 10);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(scene, r.x * g.k, r.y * g.k, r.w * g.k, r.h * g.k, PH_X, PH_Y, PH_W, PH_H);
  // 사진 위 은은한 빛 번짐(필름 느낌)
  const sheen = ctx.createLinearGradient(PH_X, PH_Y, PH_X + PH_W, PH_Y + PH_H);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,190,120,0.1)');
  ctx.fillStyle = sheen;
  ctx.fillRect(PH_X, PH_Y, PH_W, PH_H);
  if (meta.bomb) drawBombStamp(ctx, PH_X + PH_W / 2, PH_Y + PH_H * 0.42);
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1f2350';
  rrect(ctx, PH_X, PH_Y, PH_W, PH_H, 10);
  ctx.stroke();
  // 우표
  drawStamp(ctx, PC_W - 66, 2, 56, 66, meta.stage);
  // 글
  const ty = PH_Y + PH_H;
  label(ctx, t(`stage.${meta.stage}`), 18, ty + 26, { size: 22, fill: '#ffffff', stroke: '#11143a', lw: 6, align: 'left' });
  ctx.font = `14px ${FONT_BODY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1f2350';
  ctx.fillText(`${t('collection.album.pilot', { n: meta.gen })} · ${formatSize(meta.size)}`, 18, ty + 54);
  ctx.font = `12px ${FONT_BODY}`;
  ctx.fillStyle = '#565e92';
  ctx.fillText(`${t('collection.album.postcard')} · ${dateText(meta.t)}`, 18, ty + 76);
  drawPostmark(ctx, PC_W - 52, ty + 50, dateText(meta.t).slice(2));
  // 테두리
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(31,35,80,0.25)';
  ctx.strokeRect(1, 1, PC_W - 2, PC_H - 2);
  return cv;
}

const toJpeg = (cv) =>
  new Promise((resolve) => {
    if (cv.toBlob) cv.toBlob((b) => resolve(b), 'image/jpeg', 0.75);
    else resolve(dataURLToBlob(cv.toDataURL('image/jpeg', 0.75)));
  });

// ───────── 사진기 ─────────

const cams = new WeakMap(); // ui → { btn, readyAt, busy }
const camOf = (ui) => {
  let c = cams.get(ui);
  if (!c) {
    c = { btn: null, readyAt: 0, busy: false, shownState: '' };
    cams.set(ui, c);
  }
  return c;
};
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/** 재사용 대기 남은 초(벽시계 기준: 느린 기기에서 프레임 시간이 잘려도 8초는 8초). */
const camWait = (cam) => Math.max(0, (cam.readyAt - nowMs()) / 1000);

/** 지금 사진기를 쓸 수 있는 장면인지(관측 중, 창·패널·연출이 없을 때). */
const camUsable = (ui) =>
  ui.started && !ui.titleCb && ui.game.phase === 'play' && !ui.game.busy && !ui.modals.active && !ui.transitioning && !ui.panel;

function shutterFlash(ui) {
  const el = h('div', { class: 'cam-flash', 'aria-hidden': 'true' });
  ui.root.append(el);
  setTimeout(() => el.remove(), 600);
}

/** 찍은 엽서가 관측실 탭으로 날아간다. */
function flyToRoom(ui, url) {
  const tab = ui.tabButtons?.room;
  if (!tab || !Element.prototype.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const stage = ui.stage.getBoundingClientRect();
  const to = tab.getBoundingClientRect();
  const el = h('img', { class: 'cam-fly', src: url, alt: '', 'aria-hidden': 'true' });
  ui.root.append(el);
  const fx = stage.width / 2;
  const fy = stage.height * 0.42;
  const tx = to.left - stage.left + to.width / 2;
  const ty = to.top - stage.top + to.height / 2;
  const anim = el.animate(
    [
      { transform: `translate(${fx}px, ${fy}px) translate(-50%, -50%) rotate(-8deg) scale(0.3)`, opacity: 0 },
      { transform: `translate(${fx}px, ${fy}px) translate(-50%, -50%) rotate(-4deg) scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${fx}px, ${fy}px) translate(-50%, -50%) rotate(3deg) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${tx}px, ${ty}px) translate(-50%, -50%) rotate(12deg) scale(0.12)`, opacity: 0.6 },
    ],
    { duration: 1100, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' },
  );
  anim.onfinish = () => {
    el.remove();
    tab.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
  };
}

async function takePhoto(ui) {
  const cam = camOf(ui);
  const { game, world } = ui;
  const fx = fxOf(ui);
  if (!fx || !camUsable(ui)) return;
  if (cam.busy || camWait(cam) > 0) {
    ui.audio.sfx('deny');
    ui.toast(t('collection.album.wait', { s: Math.max(1, Math.ceil(camWait(cam))) }), 'info');
    return;
  }
  // 즐겨찾기로 꽉 찬 앨범에는 넣을 자리가 없다(찍히는 위험도 지지 않게 먼저 알린다)
  if (album.ready && album.items.length >= ALBUM_MAX && album.items.every((i) => i.fav)) {
    ui.audio.sfx('deny');
    ui.toast(t('collection.album.full'), 'warn');
    return;
  }
  cam.readyAt = nowMs() + PHOTO_COOLDOWN * 1000;
  cam.busy = true;
  const meta = { stage: game.form.stage, gen: game.state.gen, size: game.run.size, t: Date.now(), bomb: false };
  let grab = null;
  try {
    grab = grabScene(ui);
  } catch (err) {
    console.warn('사진기', err);
  }
  shutterFlash(ui);
  shutterSound(ui);
  ui.haptics.fire('tap');
  // 하늘을 보던 지구인이 사진에 찍혔다! (은폐 중에는 아무도 못 본다)
  const sources = Array.isArray(world.sources) ? world.sources.filter((s) => s.phase === 'on').length : 0;
  const watching = (world.watchers?.length || 0) + sources;
  if (fx.rollPhotobomb({ watching, cloaked: game.cloaked })) {
    const rep = game.incident('photobomb', { photo: true });
    if (rep) meta.bomb = true;
  }
  try {
    const scene = grab ? await develop(grab) : null;
    if (!scene) throw new Error('capture');
    const card = composePostcard(scene, grab, meta);
    const blob = await toJpeg(card);
    if (!blob) throw new Error('encode');
    const res = await addPhoto(blob, meta);
    if (!res.ok) {
      ui.toast(t('collection.album.full'), 'warn');
      return;
    }
    fx.recordPhoto(meta.stage);
    if (!meta.bomb && game.phase === 'play') {
      ui.toast(t('collection.album.saved'), 'good');
      flyToRoom(ui, res.item.url);
    }
    if (album.mode === 'mem' && !cam.memWarned) {
      cam.memWarned = true;
      ui.toast(t('collection.album.noStore'), 'warn');
    }
    ui.refreshPanel(true);
    ui.save();
  } catch (err) {
    console.warn('사진기', err);
    ui.toast(t('collection.album.failed'), 'warn');
    cam.readyAt = nowMs() + 1000;
  } finally {
    cam.busy = false;
  }
}

registerHud({
  id: 'camera',
  order: 80,
  mount(ui, host) {
    const cam = camOf(ui);
    const btn = h(
      'button',
      { class: 'icon-btn round cam-btn off', type: 'button', 'aria-label': t('collection.album.shoot'), 'aria-hidden': 'true', tabindex: '-1', onClick: () => takePhoto(ui) },
      icon('camera', 22),
      h('i', { class: 'cam-wait', 'aria-hidden': 'true' }),
    );
    // 계기판 윗줄 오른쪽(설정 버튼 옆)에 둔다: 하늘(표본이 떠다니는 곳)을 가리지 않는다.
    // 계기판 모양이 바뀌어 그 자리가 없으면 계기판 아래 오른쪽에 띄운다.
    const hud = host.parentElement || host;
    const right = hud.querySelector('.hud-right');
    if (right && right.lastElementChild) right.insertBefore(btn, right.lastElementChild);
    else {
      btn.classList.add('floating');
      hud.append(btn);
    }
    cam.btn = btn;
    cam.shownState = '';
    cam.shown = false;
  },
  update(ui) {
    const cam = camOf(ui);
    const btn = cam.btn;
    if (!btn) return;
    // 숨길 때도 자리는 남겨 둔다(계기판 윗줄이 들썩이지 않게)
    const show = camUsable(ui) && !!fxOf(ui);
    if (cam.shown !== show) {
      cam.shown = show;
      btn.classList.toggle('off', !show);
      btn.setAttribute('aria-hidden', String(!show));
      btn.tabIndex = show ? 0 : -1;
    }
    const left = camWait(cam);
    const wait = left > 0 || cam.busy;
    const p = wait ? `${Math.round((1 - left / PHOTO_COOLDOWN) * 100)}%` : '100%';
    const st = `${wait}|${p}`;
    if (st !== cam.shownState) {
      cam.shownState = st;
      btn.classList.toggle('wait', wait);
      btn.style.setProperty('--p', p);
    }
  },
});

// ───────── 관측실 ─────────

const rooms = new WeakMap(); // ui → { just: 막 올린 자리 }
const roomOf = (ui) => {
  let r = rooms.get(ui);
  if (!r) {
    r = { just: -1 };
    rooms.set(ui, r);
  }
  return r;
};

function secHead(iconName, title, badge) {
  return h('h3', { class: 'sec' }, icon(iconName, 18), h('span', { text: title }), badge ? h('small', { text: badge }) : null);
}

function roomHero(ui) {
  const game = ui.game;
  const fx = fxOf(ui);
  const latest = album.items[0];
  return h(
    'div',
    { class: 'room-hero', 'aria-hidden': 'true' },
    h('div', { class: 'room-window', dataset: { stage: game.form.stage } }, h('i', { class: 'room-glint' })),
    h('div', { class: 'room-plaque', text: t('collection.room.plaque') }),
    latest
      ? h('div', { class: 'room-pin' }, h('img', { src: latest.url, alt: '', draggable: 'false' }))
      : h('div', { class: 'room-poster' }, h('i', { class: 'room-planet' }), h('i', { class: 'room-star s1' }), h('i', { class: 'room-star s2' })),
    h('div', { class: 'room-floor' }, h('i', { class: 'room-rug' })),
    h('div', { class: 'room-desk' }, img(iconURL('form', game.formIndex, 96), 96, 'room-ship'), h('i', { class: 'room-stand' })),
    h(
      'div',
      { class: 'room-stats' },
      h('span', { class: 'chip shiny-chip' }, icon('sparkle', 14), t('collection.dex.total', { n: Object.keys(fx.dex()).length, max: SPECIMENS.length })),
      h('span', { class: 'chip' }, icon('photo', 14), t('collection.album.count', { n: album.items.length, max: ALBUM_MAX })),
    ),
  );
}

function shelfSlot(ui, index) {
  const fx = fxOf(ui);
  const slots = fx.slots();
  const shelf = fx.shelf();
  const room = roomOf(ui);
  if (index < slots) {
    const e = shelf[index];
    if (!e) {
      return h(
        'button',
        { class: 'slot empty', type: 'button', 'aria-label': t('collection.room.add'), onClick: () => openPicker(ui, index) },
        h('span', { class: 'slot-plus' }, icon('plus', 22)),
        h('span', { class: 'slot-tag', text: t('collection.room.empty') }),
      );
    }
    const just = room.just === index;
    if (just) room.just = -1;
    return h(
      'button',
      {
        class: `slot filled ${e.shiny ? 'shiny' : ''} ${just ? 'just' : ''}`.trim(),
        type: 'button',
        'aria-label': `${specName(e.id)}${e.shiny ? ` (${t('collection.shiny.tag')})` : ''}`,
        onClick: () => openPicker(ui, index),
      },
      h('span', { class: 'slot-dome' }, img(iconURL('specimen', e.id, 56), 56)),
      e.shiny ? h('i', { class: 'slot-spark' }, icon('sparkle', 14)) : null,
      h('span', { class: 'slot-tag', text: specName(e.id) }),
    );
  }
  if (index === slots) {
    const cost = fx.nextSlotCost();
    const can = cost !== null && ui.game.state.grant >= cost;
    return h(
      'button',
      {
        class: `slot buy ${can ? 'can' : ''}`.trim(),
        type: 'button',
        'aria-label': t('collection.room.buySlot'),
        onClick: () => {
          if (!fx.buySlot()) {
            ui.audio.sfx('deny');
            ui.toast(t('toast.needGrant'), 'warn');
            return;
          }
          ui.audio.sfx('buy');
          ui.haptics.fire('good');
          ui.toast(t('collection.room.slotBought', { n: fx.slots() }), 'good');
          ui.refreshPanel(true);
          ui.save();
        },
      },
      h('span', { class: 'slot-lock' }, icon('lock', 20)),
      h('span', { class: 'slot-tag', text: t('collection.room.buySlot') }),
      grantTag(formatInt(cost)),
    );
  }
  return h('div', { class: 'slot locked', 'aria-label': t('collection.room.locked') }, h('span', { class: 'slot-lock' }, icon('lock', 18)));
}

function shelfSection(ui) {
  const fx = fxOf(ui);
  const rows = [];
  for (let r = 0; r < SHELF_MAX / 4; r++) {
    const cells = [];
    for (let i = 0; i < 4; i++) cells.push(shelfSlot(ui, r * 4 + i));
    rows.push(h('div', { class: 'shelf' }, h('div', { class: 'shelf-slots' }, cells), h('i', { class: 'shelf-plank', 'aria-hidden': 'true' })));
  }
  return h(
    'section',
    { class: 'room-sec' },
    secHead('room', t('collection.room.shelf'), t('collection.room.slots', { n: fx.slots(), max: SHELF_MAX })),
    h('p', { class: 'panel-hint', text: t('collection.room.hint') }),
    h('div', { class: 'shelves' }, rows),
  );
}

function bonusSection(ui) {
  const fx = fxOf(ui);
  const b = fx.bonuses();
  const active = b.items.filter((i) => i.active);
  const list = active.map((i) =>
    h(
      'li',
      { class: `bonus-row ${i.shiny ? 'shiny' : ''}`.trim() },
      img(iconURL('specimen', i.id, 30), 30),
      h('span', { class: 'bonus-name', text: specName(i.id) }),
      h('b', { class: 'bonus-val', text: bonusText(i.key, i.v) }),
      i.shiny ? h('span', { class: 'chip shiny-chip mini' }, `×${SHINY_DISPLAY_MULT}`) : null,
    ),
  );
  const sets = b.sets.map((s) =>
    h(
      'li',
      { class: `set-row ${s.done ? 'on' : ''}`.trim() },
      h(
        'span',
        { class: 'set-icons' },
        s.kinds.map((k) => img(iconURL('specimen', k, 26, !fx.isCollected(k)), 26, fx.shelf().some((e) => e && e.id === k) ? 'got' : 'miss')),
      ),
      h('span', { class: 'set-text' }, h('b', { text: t(`collection.set.${s.id}`) }), h('small', { text: bonusText(s.key, s.v) })),
      h('span', { class: `chip ${s.done ? 'safe' : ''}`.trim(), text: s.done ? t('collection.room.setOn') : t('collection.room.setNeed', { have: s.have, need: s.need }) }),
    ),
  );
  return h(
    'section',
    { class: 'room-sec' },
    secHead('star', t('collection.room.bonusTitle')),
    active.length ? h('ul', { class: 'bonus-list' }, list) : h('p', { class: 'panel-hint', text: t('collection.room.bonusNone') }),
    h('h4', { class: 'room-sub', text: t('collection.room.setTitle') }),
    h('ul', { class: 'set-list' }, sets),
  );
}

function dexSection(ui) {
  const fx = fxOf(ui);
  const dex = fx.dex();
  const cells = SPECIMENS.map((sp) => {
    const e = dex[sp.id];
    if (!e) {
      return h(
        'div',
        { class: 'dex-cell unknown' },
        img(iconURL('specimen', sp.id, 44, true), 44),
        h('b', { text: t('collection.dex.unknown') }),
      );
    }
    return h(
      'div',
      { class: 'dex-cell found' },
      h('span', { class: 'dex-pic' }, img(iconURL('specimen', sp.id, 44), 44)),
      h('b', { text: t('collection.dex.count', { n: formatInt(e.n) }) }),
      h('small', { text: t('collection.dex.gen', { n: e.gen }) }),
    );
  });
  return h(
    'section',
    { class: 'room-sec' },
    secHead('sparkle', t('collection.dex.title'), t('collection.dex.total', { n: Object.keys(dex).length, max: SPECIMENS.length })),
    h('p', { class: 'panel-hint', text: t('collection.dex.hint') }),
    h('div', { class: 'dex-grid' }, cells),
  );
}

function albumSection(ui) {
  const fx = fxOf(ui);
  const a = fx.album();
  const goals = ALBUM_GOALS.map((g) => {
    const done = a.got.includes(g.id);
    const have = g.stat === 'shots' ? a.shots : a.stages.length;
    return h(
      'span',
      { class: `chip ${done ? 'safe' : ''}`.trim() },
      done ? icon('check', 13) : null,
      `${t(`collection.album.goal.${g.id}`)}${done ? '' : ` ${Math.min(have, g.need)}/${g.need}`}`,
    );
  });
  let body;
  if (!album.ready) body = h('p', { class: 'panel-hint center', text: '…' });
  else if (!album.items.length) body = h('p', { class: 'album-empty' }, icon('camera', 26), h('span', { text: t('collection.album.empty') }));
  else {
    body = h(
      'div',
      { class: 'album-grid' },
      album.items.map((item, i) =>
        h(
          'button',
          {
            class: `polaroid ${item.fav ? 'fav' : ''} ${item.bomb ? 'bomb' : ''}`.trim(),
            type: 'button',
            style: { '--tilt': `${((i * 37) % 7) - 3}deg` },
            'aria-label': `${t(`stage.${item.stage}`)} ${dateText(item.t)}`,
            onClick: () => openPhoto(ui, item),
          },
          h('img', { src: item.url, alt: '', draggable: 'false', loading: 'lazy' }),
          item.fav ? h('i', { class: 'polaroid-fav' }, icon('star', 14)) : null,
        ),
      ),
    );
  }
  return h(
    'section',
    { class: 'room-sec' },
    secHead('camera', t('collection.album.title'), t('collection.album.count', { n: album.items.length, max: ALBUM_MAX })),
    h('div', { class: 'chips album-goals' }, goals),
    body,
  );
}

function renderRoom(ui) {
  if (!fxOf(ui)?.shelf) return [h('p', { class: 'panel-hint center', text: '…' })];
  loadAlbum();
  return [roomHero(ui), shelfSection(ui), bonusSection(ui), dexSection(ui), albumSection(ui)];
}

function roomSignature(ui) {
  const fx = fxOf(ui);
  if (!fx?.shelf) return 'none';
  const g = ui.game;
  const shelf = fx
    .shelf()
    .map((e) => (e ? `${e.id}${e.shiny ? '*' : ''}` : '-'))
    .join(',');
  const dex = Object.entries(fx.dex())
    .map(([k, e]) => `${k}${e.n}`)
    .join(',');
  const cost = fx.nextSlotCost();
  const can = cost !== null && g.state.grant >= cost;
  const kinds = Object.keys(g.state.stats.bySpecimen || {}).length;
  const a = fx.album();
  return [fx.slots(), shelf, dex, can, kinds, album.ver, album.ready, g.formIndex, a.got.length, a.stages.length, getLang()].join('|');
}

/** 빈 자리가 있고 올릴 만한 표본이 있으면 탭에 점. */
function roomDot(ui) {
  const fx = fxOf(ui);
  if (!fx?.shelf) return false;
  const shelf = fx.shelf();
  if (!shelf.some((e) => !e)) return false;
  return SPECIMENS.some((s) => fx.isCollected(s.id) && !shelf.some((e) => e && e.id === s.id));
}

function openPicker(ui, index) {
  const fx = fxOf(ui);
  if (!fx) return;
  ui.audio.sfx('open');
  const current = fx.shelf()[index];
  const kinds = SPECIMENS.filter((s) => fx.isCollected(s.id));
  let entry = null;
  const choose = (id, shiny) => {
    if (!fx.display(index, id, shiny)) {
      ui.audio.sfx('deny');
      return;
    }
    placed(id);
  };
  const placed = (id) => {
    roomOf(ui).just = index;
    placeSound(ui);
    ui.haptics.fire('good');
    ui.toast(t('collection.room.placed', { name: specName(id) }), 'good');
    entry?.close();
    ui.refreshPanel(true);
    ui.save();
  };
  const rows = kinds.map((sp) => {
    const shinyHave = fx.shinyCount(sp.id) > 0;
    const elsewhere = fx.shelf().some((e, i) => e && e.id === sp.id && i !== index);
    const here = current && current.id === sp.id;
    const b = ROOM_BONUS[sp.id];
    const choice = (shiny) => {
      const on = here && !!current.shiny === shiny;
      return h(
        'button',
        {
          class: `btn ${shiny ? 'primary shiny-btn' : 'ghost'} pick-btn ${on ? 'on' : ''}`.trim(),
          type: 'button',
          'aria-pressed': String(on),
          onClick: () => (on ? entry?.close() : choose(sp.id, shiny)),
        },
        shiny ? icon('sparkle', 16) : null,
        t(shiny ? 'collection.room.pickShiny' : 'collection.room.pickNormal'),
      );
    };
    return h(
      'article',
      { class: `pick-row ${here ? 'here' : ''} ${elsewhere ? 'elsewhere' : ''}`.trim() },
      img(iconURL('specimen', sp.id, 48), 48),
      h(
        'div',
        { class: 'pick-body' },
        h('h4', { text: specName(sp.id) }),
        b ? h('small', { text: bonusText(b.key, b.v) }) : null,
        b && shinyHave ? h('small', { class: 'pick-shiny' }, icon('sparkle', 12), bonusText(b.key, b.v * SHINY_DISPLAY_MULT)) : null,
      ),
      elsewhere
        ? h(
            'button',
            {
              class: 'btn ghost pick-btn',
              type: 'button',
              onClick: () => {
                // 다른 자리에 있던 것을 이 자리로 옮긴다(반짝이 여부는 그대로)
                const from = fx.shelf().findIndex((e) => e && e.id === sp.id);
                const was = fx.shelf()[from];
                if (from < 0 || !was) return;
                fx.clearSlot(from);
                if (!fx.display(index, sp.id, was.shiny)) {
                  fx.display(from, sp.id, was.shiny);
                  ui.audio.sfx('deny');
                  return;
                }
                if (current) fx.display(from, current.id, current.shiny);
                placed(sp.id);
              },
            },
            h('span', { class: 'pick-move' }, h('small', { text: t('collection.room.onShelf') }), t('collection.room.move')),
          )
        : h('div', { class: 'pick-actions' }, choice(false), shinyHave ? choice(true) : null),
    );
  });
  const body = h(
    'div',
    { class: 'room-picker' },
    h(
      'header',
      { class: 'modal-head' },
      h('h2', { text: t('collection.room.pickTitle') }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), onClick: () => entry?.close() }, icon('close', 20)),
    ),
    kinds.length ? h('p', { class: 'panel-hint', text: t('collection.room.pickHint') }) : h('p', { class: 'panel-hint', text: t('collection.room.pickNone') }),
    h('div', { class: 'pick-list' }, rows),
    current
      ? h(
          'button',
          {
            class: 'btn danger wide',
            type: 'button',
            onClick: () => {
              fx.clearSlot(index);
              ui.audio.sfx('click');
              ui.toast(t('collection.room.removed'), 'info');
              entry?.close();
              ui.refreshPanel(true);
              ui.save();
            },
          },
          t('collection.room.remove'),
        )
      : null,
  );
  entry = ui.modals.open(body, { cls: 'modal-room', label: t('collection.room.pickTitle') });
}

// ───────── 사진 보기 ─────────

async function sharePhoto(ui, item) {
  const name = `shh-ufo-${dateText(item.t).replace(/\./g, '')}-${item.id.slice(-4)}.jpg`;
  const blob = item.blob || dataURLToBlob(item.url);
  try {
    if (typeof File === 'function' && navigator.share && navigator.canShare) {
      const file = new File([blob], name, { type: 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: t('collection.album.shareTitle') });
        return;
      }
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  // 공유 시트가 없으면 내려받기
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name, hidden: '' });
  ui.root.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  ui.toast(t('collection.album.downloaded'), 'good');
}

function openPhoto(ui, item) {
  ui.audio.sfx('open');
  let entry = null;
  let armed = false;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
  const favBtn = h('button', {
    class: `btn ${item.fav ? 'primary' : 'ghost'} photo-fav`,
    type: 'button',
    'aria-pressed': String(item.fav),
    onClick: async () => {
      await setFav(item, !item.fav);
      favBtn.className = `btn ${item.fav ? 'primary' : 'ghost'} photo-fav`;
      favBtn.setAttribute('aria-pressed', String(item.fav));
      favBtn.lastChild.textContent = t(item.fav ? 'collection.album.unfav' : 'collection.album.fav');
      ui.audio.sfx('click');
      ui.refreshPanel(true);
    },
  }, icon('star', 18), h('span', { text: t(item.fav ? 'collection.album.unfav' : 'collection.album.fav') }));
  const delLabel = h('span', { text: t('collection.album.remove') });
  const delBtn = h(
    'button',
    {
      class: 'btn danger photo-del',
      type: 'button',
      onClick: async () => {
        if (!armed) {
          armed = true;
          delLabel.textContent = t('collection.album.removeSure');
          delBtn.classList.add('armed');
          ui.audio.sfx('deny');
          return;
        }
        await removePhoto(item);
        ui.audio.sfx('click');
        ui.toast(t('collection.album.removed'), 'info');
        entry?.close();
        ui.refreshPanel(true);
      },
    },
    icon('trash', 18),
    delLabel,
  );
  const body = h(
    'div',
    { class: 'photo-view' },
    h(
      'header',
      { class: 'modal-head' },
      h('h2', { text: t(`stage.${item.stage}`) }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), onClick: () => entry?.close() }, icon('close', 20)),
    ),
    h('div', { class: `photo-frame ${item.bomb ? 'bomb' : ''}`.trim() }, h('img', { class: 'photo-big', src: item.url, alt: '', draggable: 'false' })),
    h('div', { class: 'photo-actions' }, favBtn, h('button', { class: 'btn photo-share', type: 'button', onClick: () => sharePhoto(ui, item) }, icon(canShare ? 'share' : 'download', 18), h('span', { text: t(canShare ? 'collection.album.share' : 'collection.album.download') })), delBtn),
  );
  entry = ui.modals.open(body, { cls: 'modal-photo', label: t('collection.album.title') });
}

registerPanel({
  id: 'room',
  icon: 'room',
  order: 60,
  label: () => t('collection.room.tab'),
  title: () => t('collection.room.title'),
  render: (ui) => renderRoom(ui),
  signature: (ui) => roomSignature(ui),
  dot: (ui) => roomDot(ui),
});

// ───────── 알림 ─────────

registerBind({
  id: 'collection',
  order: 60,
  bind(ui) {
    const { game } = ui;
    loadAlbum().then(() => ui.refreshPanel(true));
    game.on('shinyFound', ({ id, first, reward }) => {
      shinySound(ui);
      if (first) {
        ui.haptics.fire('good');
        ui.toast(t('collection.shiny.first', { name: specName(id) }), 'grant', reward > 0 ? grantTag(`+${formatInt(reward)}`) : null);
        setTimeout(() => ui.audio.sfx('achievement'), 260);
      } else {
        ui.toast(t('collection.shiny.found', { name: specName(id) }), 'good');
      }
    });
    game.on('albumGoal', ({ id, reward }) => {
      ui.toast(t('collection.album.goalDone', { name: t(`collection.album.goal.${id}`) }), 'grant', grantTag(`+${formatInt(reward)}`));
      ui.audio.sfx('achievement');
    });
  },
});
