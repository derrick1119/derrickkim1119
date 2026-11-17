// 저장: 마지막 등불, 피운 빛꽃, 설정 (저장소가 막힌 곳에서도 그냥 돌아가게)
const KEY = 'thelamp.unlitwood.v1';
export function loadSave() {
  const d = { progress: null, lang: null, mute: false, quality: 'auto', done: false, best: null };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') Object.assign(d, s); } catch (e) { /* 없음 */ }
  return d;
}
export function storeSave(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* 없음 */ } }
