// 그래픽 방식: 도트(기본) · 붓(예전). 주소에 ?gfx=paint 를 붙이면 예전 붓 그림으로 본다
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const GFX = { pixel: !(q && q.get('gfx') === 'paint') };
