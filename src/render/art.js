// 그림체: 'paper' (종이 인형, 기본) / 'illust' (일러스트 그림체 시험판)
// 주소에 ?art=illust 를 붙이거나, 첫 화면의 그림체 단추로 바꾼다 (바꾸면 그림을 새로 굽기 위해 다시 불러온다)
let mode = 'paper';
try {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('art') : null;
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('gogae.art') : null;
  mode = (q || saved) === 'illust' ? 'illust' : 'paper';
} catch (e) { /* 노드에서 돌 때는 종이 인형 */ }
export const ART = { mode, illust: mode === 'illust' };
export function setArt(m) {
  try { localStorage.setItem('gogae.art', m); } catch (e) { /* 무시 */ }
  const u = new URL(location.href); u.searchParams.delete('art'); location.replace(u.toString());
}
