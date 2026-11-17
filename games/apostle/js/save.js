// 저장: 어디까지 왔는지, 길마다 남긴 아이들의 수, 설정 (저장소가 막힌 곳에서도 그냥 돌아가게)
const KEY = 'thelamp.apostle.v1';
export function loadSave() {
  const d = { stage: 0, results: [null, null, null, null], lang: null, mute: false, quality: 'auto', ended: false };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') Object.assign(d, s); } catch (e) { /* 없음 */ }
  return d;
}
export function storeSave(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* 없음 */ } }
