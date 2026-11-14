// 저장: 브라우저 localStorage (막혀 있으면 메모리에만)
import { SAVE_KEY } from './config.js';

function blank() {
  return { v: 1, lumen: 0, meta: {}, unlocked: 1, best: {}, runs: 0, lang: null, sound: true, tips: {} };
}

export function loadSave() {
  const s = blank();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') Object.assign(s, d);
    }
  } catch (e) { /* 저장소를 쓸 수 없는 환경 */ }
  if (!s.meta || typeof s.meta !== 'object') s.meta = {};
  if (!s.best || typeof s.best !== 'object') s.best = {};
  if (!s.tips || typeof s.tips !== 'object') s.tips = {};
  s.lumen = Math.max(0, Math.floor(+s.lumen || 0));
  s.unlocked = Math.max(1, Math.floor(+s.unlocked || 1));
  return s;
}

export function writeSave(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) { /* 무시 */ }
}
