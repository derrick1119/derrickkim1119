// 저장: 브라우저 localStorage (막혀 있으면 메모리에만)
const SAVE_KEY = 'thelamp.littlenights.v1';

export function loadSave() {
  const s = { v: 1, levels: {}, lang: null, sound: true };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const d = JSON.parse(raw); if (d && typeof d === 'object') Object.assign(s, d); }
  } catch (e) { /* 저장소를 쓸 수 없는 환경 */ }
  if (!s.levels || typeof s.levels !== 'object') s.levels = {};
  return s;
}

export function writeSave(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* 무시 */ }
}
