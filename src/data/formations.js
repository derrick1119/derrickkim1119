// 진형: 싸움터에 세운 부대들의 모양을 읽어 힘을 준다 (조선의 진법에서 따왔다).
// 일자진은 처음부터 알고, 나머지는 진법서(보물)를 얻어야 쓸 수 있다. 영웅·잠깐 불려 온 부대·말뚝은 모양에 세지 않는다(방원진은 영웅을 가운데로 삼는다).
//   need : 모양을 이루는 데 드는 부대 수        fx : 힘 (dmg 전군 피해 · melee 근접 피해 · guard 받는 피해 감소 · spd 이동 · range 원거리 사거리 · heal 치유 · charge 돌격 피해)
//   shape: 부대 무게중심들(p: [{x,y}], 영웅 h)을 보고 모양이 섰는지 가린다. 적은 오른쪽에서 온다
const spread = (a, k) => Math.max(...a.map(p => p[k])) - Math.min(...a.map(p => p[k]));
const byY = a => a.slice().sort((p, q) => p.y - q.y);
export const FORMS = {
  ilja: { name: '일자진', need: 3, how: '부대를 세로로 한 줄로 세운다', bonus: '원거리 사거리 +15%, 받는 피해 -10%', fx: { range: 0.15, guard: 0.1 },
    shape: p => spread(p, 'x') <= 80 && spread(p, 'y') >= 200 },
  jangsa: { name: '장사진', need: 3, how: '부대를 앞뒤로 길게 늘어세운다', bonus: '이동 +25%, 돌격 피해 +30%', fx: { spd: 0.25, charge: 0.3 },
    shape: p => spread(p, 'y') <= 80 && spread(p, 'x') >= 220 },
  hakik: { name: '학익진', need: 5, how: '양 끝 부대를 앞으로 내밀어 날개를 펼친다', bonus: '전군 피해 +20%', fx: { dmg: 0.2 },
    shape: p => { const s = byY(p), mid = s.slice(1, -1), mx = mid.reduce((a, q) => a + q.x, 0) / mid.length; return spread(p, 'y') >= 240 && s[0].x >= mx + 60 && s[s.length - 1].x >= mx + 60; } },
  eorin: { name: '어린진', need: 4, how: '가운데 부대를 앞세우고 양옆을 뒤로 물린다', bonus: '근접 피해 +15%, 받는 피해 -15%', fx: { melee: 0.15, guard: 0.15 },
    shape: p => { const s = byY(p), ends = [s[0], s[s.length - 1]], mid = s.slice(1, -1), mx = Math.max(...mid.map(q => q.x)); return spread(p, 'y') >= 160 && mx >= ends[0].x + 60 && mx >= ends[1].x + 60; } },
  bangwon: { name: '방원진', need: 4, how: '영웅을 가운데 두고 부대들이 둥글게 감싼다', bonus: '받는 피해 -20%, 치유 +30%', fx: { guard: 0.2, heal: 0.3 },
    shape: (p, h) => { if (!h) return false; const q = new Set(); for (const s of p) { const dx = s.x - h.x, dy = s.y - h.y, d = Math.hypot(dx, dy); if (d > 190 || d < 40) return false; q.add((dx >= 0 ? 1 : 0) + (dy >= 0 ? 2 : 0)); } return q.size >= 3; } },
};
// 여럿이 함께 서면 더 어려운 모양을 먼저 본다
export const FORM_ORDER = ['hakik', 'eorin', 'bangwon', 'ilja', 'jangsa'];
export const FORM_START = ['ilja'];
// 안내용 작은 그림: 부대 자리 (-1~1, 적은 오른쪽). 방원진의 가운데 점은 영웅
export const FORM_DIAG = { ilja: [[0, -1], [0, -0.33], [0, 0.33], [0, 1]], jangsa: [[-1, 0], [-0.33, 0], [0.33, 0], [1, 0]], hakik: [[0.7, -1], [-0.2, -0.5], [-0.6, 0], [-0.2, 0.5], [0.7, 1]], eorin: [[-0.6, -0.9], [0.5, -0.3], [0.5, 0.3], [-0.6, 0.9]], bangwon: [[0, -0.9], [0.8, 0], [0, 0.9], [-0.8, 0], [0, 0, 1]] };
