// 캐스트 ② 먹물 붓 닌자 '한획' vs 종이 요괴
const C2 = {
  ink: { f: '#3a3a4a', s: '#25252f' },
  inner: { f: '#8d8c9c', s: '#696878' },
  teal: { f: '#36d8ca', s: '#16a3a0' },
  hair: { f: '#2d2f46', s: '#1b1b2b' },
  skin: { f: '#ffe4cc', s: '#f3bd99' },
  sash: { f: '#f1e8d3', s: '#cfc2a3' },
  bamboo: { f: '#dcbb7c', s: '#af8b4e' },
  pants: { f: '#5b5a6c', s: '#41404f' },
  wrapc: { f: '#eee6d4', s: '#c7bb9f' },
  paperW: { f: '#f7f1e2', s: '#dacfb5' },
  paperB: { f: '#bccbeb', s: '#8e9ecd' },
  paperK: { f: '#dcbd8e', s: '#b39062' },
  tali: { f: '#f6dc7a', s: '#d9b64f' },
  pink: '#ff8fab',
};
const INK2 = '#26233a';
// 큰 붓 (+x 방향이 붓끝). 길이 152
function bigBrush(lw, o = {}) {
  let s = '';
  s += `<path d="M2,0C-6,-2 -10,6 -4,9C2,12 6,4 2,0" fill="none" stroke="${INK}" stroke-width="${lw * 2.4}"/><path d="M2,0C-6,-2 -10,6 -4,9C2,12 6,4 2,0" fill="none" stroke="#8b5a3a" stroke-width="${lw * 1.1}"/>`;
  s += part(rr(0, -4.2, 104, 8.4, 4), {
    ...C2.bamboo,
    lw,
    sh: [0, -2.4],
    hd: rr(3, -3.2, 98, 2, 1),
    h: '#fff4d6',
    ho: 0.6,
    x: [32, 68].map((x) => `<path d="M${x},-4.4v8.8" stroke="${INK}" stroke-width="${lw * 0.9}"/><path d="M${x + 1.4},-4.4v8.8" stroke="#f3dca6" stroke-width="${lw * 0.6}"/>`).join(''),
  });
  s += part(rr(100, -5.6, 13, 11.2, 2.2), { f: '#3b3644', s: '#25212c', lw, sh: [0, -2], x: `<path d="M104,-5.6v11.2M108,-5.6v11.2" stroke="#6e6680" stroke-width="${lw * 0.6}"/>` });
  // 붓털: 밑은 흰 털, 끝은 먹, 맨 끝에 청록 먹 한 방울
  const head = smooth([[112, -6.5], [124, -10.5], [138, -7], [152, 0, 1], [138, 7], [124, 10.5], [112, 6.5]]);
  s += part(head, {
    f: '#f4ecd6',
    s: '#d6c9a6',
    lw: lw * 1.05,
    sh: [0, -2.6],
    x:
      `<path d="M126,-14C134,-8 136,8 126,14L160,14L160,-14Z" fill="${INK2}"/>` +
      `<path d="M126,-14C134,-8 136,8 126,14" fill="none" stroke="#4b4760" stroke-width="2"/>` +
      `<path d="M134,-8L152,-0.5L134,-4Z" fill="#5d6a86" opacity=".7"/>` +
      ts([[114, -3], [124, -5], [132, -3]], 1, '#bba985') +
      ts([[114, 2], [126, 3], [134, 1]], 1, '#bba985'),
  });
  s += `<path d="M146,-1.6Q152,0 146,1.6" fill="none" stroke="${C2.teal.f}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (o.drop) s += part('M154,0C158,2 160,6 157,9C154,11 150,8 152,4Z', { ...C2.teal, lw: lw * 0.8, sh: [-1, -1], hd: ell(154.5, 5, 1, 1.4), ho: 0.9 });
  return s;
}
function hanhoek(o = {}) {
  const lw = o.lw ?? 1.5;
  const aim = o.pose === 'aim';
  let s = '';
  const tails = aim
    ? [[[-8, -60], [-26, -67], [-46, -61], [-64, -68]], [[-8, -57], [-26, -52], [-43, -47], [-60, -51]]]
    : [[[-10, -61], [-24, -68], [-38, -62], [-50, -70]], [[-10, -58], [-22, -50], [-32, -40], [-44, -36]]];
  tails.forEach((t, i) => (s += part(ribbon(t, 11, 8.5, 0.7), { ...C2.teal, lw, sh: [1, -3.2], hd: ribbon(t.map((p) => [p[0], p[1] - 2.5]), 3, 2, 0.2), h: '#c8fff8', ho: i ? 0.35 : 0.5 })));
  // 등에 멘 큰 붓
  if (!aim) s += g(bigBrush(lw), 'translate(-36,-8) rotate(-52)');
  // 뒷머리
  const hairBack = smooth([[-30, -86], [-28, -106], [0, -116], [28, -106], [30, -86], [30, -70], [27, -63, 1], [22, -67], [-22, -67], [-27, -63, 1], [-30, -70]]);
  let head = part(hairBack, { ...C2.hair, lw: lw * 1.1, sh: [-4, -3], hd: 'M-27,-96C-24,-104 -18,-109 -12,-112C-18,-106 -22,-100 -24,-92Z', h: '#7d88c0', ho: 0.5 });
  // 다리
  const leg = (x, rot, cx, cy) => {
    let l = part(rr(x, -24, 13, 20, 5.5), { ...C2.wrapc, lw, sh: [-2, -1], x: `<path d="M${x},-17l13,-3.4M${x},-11l13,-3.4" stroke="${C2.wrapc.s}" stroke-width="1.6"/>` });
    l += part(ell(x + 6.5 + (x < 0 ? -2 : 2), -3, 9.2, 5), { f: '#4a4658', s: '#2f2c3a', lw, sh: [-1.5, -1.5], hd: ell(x + 4 + (x < 0 ? -2 : 2), -5.6, 4, 1.3), h: '#a9a3c4', ho: 0.5 });
    l += `<path d="M${x + 1 + (x < 0 ? -2 : 2)},-3.6h11" stroke="#c9a46a" stroke-width="1.6"/>`;
    return g(l, `rotate(${rot},${cx},${cy})`);
  };
  s += aim ? leg(-19, 26, -12, -20) + leg(6, -18, 12, -20) : leg(-17.5, 0, 0, 0) + leg(4.5, 0, 0, 0);
  // 하카마풍 짧은 바지
  let body = '';
  body += part(smooth([[-20, -34], [20, -34], [24, -18, 1], [3, -17], [0, -21], [-3, -17], [-24, -18, 1]]), { ...C2.pants, lw, sh: [-3, -2], x: ts([[-10, -32], [-12, -24], [-14, -18]], 1.6, '#34333f') + ts([[10, -32], [12, -24], [14, -18]], 1.6, '#34333f') });
  // 저고리
  const jacket = smooth([[-15, -61], [15, -61], [20, -46], [22, -30], [0, -27], [-22, -30], [-20, -46]]);
  body += part(jacket, {
    ...C2.ink,
    lw,
    sh: [-4, -3],
    hd: smooth([[-15, -56], [-12, -58], [-14, -44], [-18, -36], [-18, -44]]),
    h: '#8d8db0',
    ho: 0.4,
    x:
      `<path d="M-9,-61L3,-42L9,-61Z" fill="${C2.inner.f}"/>` +
      `<path d="M-10,-61L4,-40" stroke="#f1e8d3" stroke-width="2.6"/>` +
      ts([[-11, -61], [-2, -50], [5, -40]], 2.2, INK, { a: 0.1, b: 0.3 }) +
      ts([[11, -61], [7, -53], [4, -46]], 2.2, INK, { a: 0.1, b: 0.3 }),
  });
  // 붓 멜빵(끈)
  if (!aim) body += part(poly([[-17, -58], [-13, -60], [21, -34], [17, -32]]), { f: '#7a5236', s: '#5a3a26', lw: lw * 0.8, sh: [-1, -1] });
  // 허리띠 + 엔소(먹 동그라미)
  body += part(smooth([[-22, -36], [0, -33.5], [22, -36], [22.5, -27], [0, -24.5], [-22.5, -27]]), { ...C2.sash, lw, sh: [-1, -2] });
  body += `<path d="M5,-30.5a4.6,4 0 1 1 -2,-4.2" fill="none" stroke="${INK2}" stroke-width="1.8" stroke-linecap="round"/>`;
  body += part(poly([[-8, -29], [-15, -18], [-11, -17], [-6, -27]]), { ...C2.sash, lw: lw * 0.8, sh: [-1, -1] });
  s += aim ? g(body, 'translate(0,3)') : body;
  // 넓은 소매
  const sleeve = (pts, inner, hand) =>
    part(smooth(pts), { ...C2.ink, lw, sh: [-2.5, -2] }) + (inner ? `<path d="${inner}" fill="${C2.inner.s}" stroke="${INK}" stroke-width="${lw * 0.8}"/>` : '') + part(ell(hand[0], hand[1], 5.4, 5.4), { ...C2.skin, lw, sh: [-1.5, -1.5] });
  if (!aim) {
    s += sleeve([[-14, -59], [-23, -55], [-32, -38], [-30, -31], [-19, -33], [-18, -46]], 'M-31,-34Q-25,-29 -19,-34Q-25,-36 -31,-34Z', [-25, -30]);
    s += sleeve([[14, -59], [23, -55], [32, -38], [30, -31], [19, -33], [18, -46]], 'M31,-34Q25,-29 19,-34Q25,-36 31,-34Z', [25, -30]);
  }
  // 목도리
  s += part(smooth([[-20, -65], [0, -61], [20, -65], [22, -56], [0, -50.5], [-22, -56]]), { ...C2.teal, lw, sh: [0, -3.4], hd: smooth([[-16, -62], [0, -59], [16, -62], [14, -60], [0, -57.5], [-14, -60]]), h: '#c8fff8', ho: 0.6 });
  s += part(ell(-17, -56, 6.2, 5.4), { ...C2.teal, lw, sh: [-1.6, -1.8] });
  // 얼굴
  head += part(ell(0, -83, 26.5, 24.5), { ...C2.skin, lw, sh: [-3.4, -2.4] });
  // 옆머리
  head += part(smooth([[-27.5, -92], [-21, -94], [-20.5, -80], [-21, -70], [-24, -61, 1], [-28.5, -72]]), { ...C2.hair, lw, sh: [-1.5, -1.5], hd: ts([[-25, -90], [-24, -80], [-24, -72]], 1.6, '#000').match(/d="([^"]*)"/)[1], h: '#7d88c0', ho: 0.5 });
  head += part(smooth([[27.5, -92], [21, -94], [20.5, -80], [21, -70], [24, -61, 1], [28.5, -72]]), { ...C2.hair, lw, sh: [-1.5, -1.5] });
  // 앞머리 (뭉툭한 뱅)
  const bang = poly([[-28, -92], [-27, -104], [-18, -112], [0, -115], [18, -112], [27, -104], [28, -92], [22, -95], [17, -89], [11, -94], [5, -90], [-1, -94], [-7, -89], [-13, -94], [-19, -89], [-23, -94]]);
  head += part(smooth([[-28, -92, 1], [-27, -104], [-15, -113], [0, -115.5], [15, -113], [27, -104], [28, -92, 1], [22, -95, 1], [17, -89.5, 1], [11, -94, 1], [5, -90, 1], [-1, -94, 1], [-7, -89.5, 1], [-13, -94, 1], [-19, -89.5, 1], [-23, -94, 1]]), {
    ...C2.hair,
    lw: lw * 1.05,
    sh: [-3, -2],
    hd: 'M-24,-100C-16,-107 -6,-109.5 0,-109.5C6,-109.5 16,-107 24,-100L22,-97.5L19,-101L15,-98.5L12,-103L8,-100L4,-104L0,-101L-4,-104L-8,-100L-12,-103L-15,-98.5L-19,-101L-22,-97.5Z',
    h: '#7d88c0',
    ho: 0.55,
    x: ts([[-16, -110], [-12, -100], [-12, -93]], 1.2, '#11111c', { op: 0.6 }) + ts([[6, -113], [8, -102], [6, -93]], 1.2, '#11111c', { op: 0.6 }),
  });
  // 쪽머리 + 청록 끈 + 작은 붓 비녀
  head += g(bigBrush(lw * 2.6).replace(/stroke-width="[\d.]+"/g, (m) => m), 'translate(-17,-114) rotate(-24) scale(.24)');
  head += part(ell(2, -118, 10, 8.5), { ...C2.hair, lw, sh: [-2, -2], hd: ell(-1, -121, 4, 1.6), h: '#7c86b8', ho: 0.6 });
  head += part(rr(-7, -113.5, 18, 4.4, 2), { ...C2.teal, lw: lw * 0.8, sh: [0, -1.4] });
  // 눈
  if (aim) {
    head += eye(-10.5, -79.5, 6.2, 7.6, { lid: 0.32, slope: 0.22, look: [1.4, -0.4], lw: lw * 0.9, base: '#1d1b28', iris: '#45cfc4' });
    head += eye(10.5, -79.5, 6.2, 7.6, { lid: 0.32, slope: -0.22, look: [1.4, -0.4], lw: lw * 0.9, base: '#1d1b28', iris: '#45cfc4' });
    head += ts([[-16, -90.5], [-10, -89.5], [-5, -87.5]], 2.2, C2.hair.f) + ts([[16, -90.5], [10, -89.5], [5, -87.5]], 2.2, C2.hair.f);
    head += `<path d="M-3,-67.6Q0,-69 3,-67.6" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
  } else {
    head += eye(-10.5, -79.5, 6.2, 7.8, { look: [0.4, 0.4], lw: lw * 0.9, base: '#1d1b28', iris: '#45cfc4' });
    head += eye(10.5, -79.5, 6.2, 7.8, { look: [0.4, 0.4], lw: lw * 0.9, base: '#1d1b28', iris: '#45cfc4' });
    head += ts([[-17.2, -83], [-19.5, -85.5]], 1.8, INK, { a: 0.1, b: 0.6 }) + ts([[17.2, -83], [19.5, -85.5]], 1.8, INK, { a: 0.1, b: 0.6 });
    head += `<path d="M-3.6,-68.4Q-1.8,-66 0,-68Q1.8,-66 3.6,-68.4" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  head += `<ellipse cx="-17.5" cy="-70.5" rx="4.6" ry="2.6" fill="${C2.pink}" opacity=".55"/><ellipse cx="17.5" cy="-70.5" rx="4.6" ry="2.6" fill="${C2.pink}" opacity=".55"/>`;
  // 볼에 먹 한 점 (살짝 번진)
  head += `<path d="M14.6,-73.6c1.8,-1.6 4.6,-0.6 4.4,1.6c-0.2,2.2 -3.4,2.6 -4.6,1.2c-0.9,-0.9 -0.6,-2 0.2,-2.8Z" fill="${INK2}"/><circle cx="20.4" cy="-75" r=".7" fill="${INK2}"/><circle cx="13.2" cy="-70.3" r=".5" fill="${INK2}"/>`;
  s += g(head, aim ? 'translate(2,2) rotate(-6,0,-60)' : '');
  if (aim) {
    // 두 손으로 붓을 창처럼
    s += part(smooth([[-14, -56], [-20, -50], [-12, -40], [-2, -38], [2, -43], [-8, -48]]), { ...C2.ink, lw, sh: [-2.5, -2] });
    s += g(bigBrush(lw, { drop: true }), 'translate(-27.5,4.7) rotate(-54)');
    s += part(ell(1, -40, 5.4, 5.4), { ...C2.skin, lw, sh: [-1.5, -1.5] });
    s += part(smooth([[13, -57], [22, -54], [26, -46], [21, -42], [14, -46]]), { ...C2.ink, lw, sh: [-2.5, -2] });
    s += part(ell(17, -51, 5.4, 5.4), { ...C2.skin, lw, sh: [-1.5, -1.5] });
  }
  return s;
}

// 종이 요괴 — 가위로 오린 직선 테두리, 접힌 자국, 부적 얼굴
function paperDoll(type, o = {}) {
  const lw = o.lw ?? 1.4;
  const pc = { sword: C2.paperW, bow: C2.paperB, umbrella: C2.paperK }[type];
  let s = '';
  // 바닥에서 살짝 뜬 종이 그림자
  const bodyPts = [[-7, -47], [7, -47], [21, -43], [27.5, -33], [17, -31], [20.5, -8], [8.5, -8], [8.5, -1.5], [3, -1.5], [3, -8], [-3, -8], [-3, -1.5], [-8.5, -1.5], [-8.5, -8], [-20.5, -8], [-17, -31], [-27.5, -33], [-21, -43]];
  const d = poly(bodyPts);
  let x = '';
  x += `<path d="M0,-50V0" stroke="${pc.s}" stroke-width="1.2"/><path d="M-30,-50H0V0H-30Z" fill="${pc.s}" opacity=".35"/>`;
  x += `<path d="M-30,-25L30,-27" stroke="${pc.s}" stroke-width="1"/><path d="M-30,-24.2L30,-26.2" stroke="#fff" stroke-width=".7" opacity=".7"/>`;
  for (let i = 0; i < 6; i++) x += `<path d="M${-18 + i * 7},${-44 + (i % 3) * 9}q3,1 5,-1" stroke="${pc.s}" stroke-width=".5" fill="none" opacity=".8"/>`;
  if (type === 'sword') x += `<path d="M-12,-20h24M-10,-16h20" stroke="#5b6aa8" stroke-width="1.4" stroke-dasharray="3 2"/>`;
  if (type === 'bow') x += `<path d="M-14,-40l6,5l6,-5l6,5l6,-5l6,5" fill="none" stroke="#5b6aa8" stroke-width="1.2"/>`;
  if (type === 'umbrella') x += `<circle cx="-8" cy="-20" r="2" fill="#7a5a36" opacity=".6"/><circle cx="7" cy="-36" r="1.6" fill="#7a5a36" opacity=".5"/>`;
  s += part(d, { ...pc, lw, sh: [-1.5, -1.5], x });
  // 부적 머리 (접힌 귀퉁이)
  const tilt = { sword: -5, bow: 4, umbrella: -2 }[type];
  let h = '';
  h += part(poly([[-14.5, -82], [7, -82], [14.5, -74.5], [14.5, -45], [-14.5, -45]]), {
    ...C2.tali,
    lw,
    sh: [-2, -1.4],
    x: `<path d="M-12,-79.5h18l6,6v26h-24Z" fill="none" stroke="#5b6aa8" stroke-width=".9"/>` + `<path d="M-6,-77.5h12M-4,-75.5h8" stroke="#5b6aa8" stroke-width=".9" opacity=".7"/>`,
    hd: 'M-12.5,-80L-12.5,-48L-10.5,-48L-10.5,-80Z',
    h: '#fff6cf',
    ho: 0.7,
  });
  h += part(poly([[7, -82], [7, -74.5], [14.5, -74.5]]), { f: '#fff1b8', s: '#e9cf7a', lw: lw * 0.7 });
  // 부적에 그린 얼굴
  const inkEye = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK2}" stroke-width="1.5"/><circle cx="${cx + 0.4}" cy="${cy + 0.5}" r="${r * 0.48}" fill="${INK2}"/>`;
  if (type === 'sword') {
    h += inkEye(-6, -62, 3.8) + inkEye(6, -62, 3.8);
    h += ts([[-11, -69], [-6, -68.4], [-2, -66]], 2, INK2) + ts([[11, -69], [6, -68.4], [2, -66]], 2, INK2);
    h += `<path d="M-4.5,-53.5l2.2,-2.2l2.3,2.2l2.3,-2.2l2.2,2.2" fill="none" stroke="${INK2}" stroke-width="1.3" stroke-linejoin="round"/>`;
  } else if (type === 'bow') {
    h += inkEye(-6, -62, 3.8);
    h += ts([[2, -62], [6, -63.8], [10, -62]], 2, INK2);
    h += `<path d="M-3.5,-54Q0,-51.6 3.5,-54" fill="none" stroke="${INK2}" stroke-width="1.3" stroke-linecap="round"/>`;
  } else {
    h += inkEye(-6, -61, 3.5) + inkEye(6, -61, 3.5);
    h += ts([[-10, -66], [-6, -68.5], [-2.5, -69]], 1.6, INK2) + ts([[10, -66], [6, -68.5], [2.5, -69]], 1.6, INK2);
    h += `<ellipse cx="0" cy="-53.6" rx="2" ry="1.6" fill="${INK2}"/>`;
  }
  h += `<ellipse cx="-9.5" cy="-56" rx="3" ry="1.7" fill="${C2.pink}" opacity=".55"/><ellipse cx="9.5" cy="-56" rx="3" ry="1.7" fill="${C2.pink}" opacity=".55"/>`;
  // 머리 장식
  if (type === 'bow') h += part(poly([[-18, -79], [0, -97], [18, -79], [12, -79], [0, -89], [-12, -79]]), { f: '#f7f1e2', s: '#dacfb5', lw, sh: [-1.5, -1] }) + part(poly([[-18, -79], [18, -79], [16, -75], [-16, -75]]), { f: '#e8ddc2', s: '#c9bb98', lw: lw * 0.8 });
  if (type === 'sword') h += part(poly([[-3, -82], [3, -82], [2, -89], [-2, -89]]), { f: '#5b6aa8', s: '#3f4b82', lw: lw * 0.7 }) + `<path d="M-2,-89l-5,-4M2,-89l5,-4" stroke="${INK2}" stroke-width="1.2"/>`;
  s += g(h, `rotate(${tilt},0,-48)`);
  // 무기
  if (type === 'sword') {
    let sw = part(poly([[0, -3], [42, -3.6], [50, 0, 1], [42, 3.6], [0, 3]]), { f: '#ffffff', s: '#dcd6c6', lw, sh: [0, -1.4], x: `<path d="M0,0L50,0" stroke="#cfc6b0" stroke-width=".9"/><path d="M0,-3L50,0L0,3" fill="#e9e3d3" opacity=".7"/>` });
    sw += part(poly([[-2, -6], [2, -6], [2, 6], [-2, 6]]), { f: '#5b6aa8', s: '#3f4b82', lw: lw * 0.8 });
    sw += part(poly([[-12, -2.4], [-2, -2.4], [-2, 2.4], [-12, 2.4]]), { ...C2.paperK, lw: lw * 0.8 });
    s += g(sw, 'translate(-22,-38) rotate(-72)');
  } else if (type === 'bow') {
    s += `<path d="M-28,-64L-28,-14" stroke="#f7f1e2" stroke-width="1"/>`;
    s += part(taperD([[-27, -66], [-38, -52], [-40, -40], [-38, -28], [-27, -13]], 6, { a: 0.15, b: 0.15, min: 0.5 }), { ...C2.paperW, lw: lw * 0.9, sh: [1, -1], x: [0, 1, 2, 3, 4, 5].map((i) => `<path d="M-42,${-60 + i * 8}l8,4" stroke="#b9ad8e" stroke-width=".7"/>`).join('') });
    s += part(poly([[-48, -41.4], [-22, -41.4], [-22, -38.6], [-48, -38.6]]), { ...C2.paperW, lw: lw * 0.7 });
    s += part(poly([[-48, -44], [-54, -40, 1], [-48, -36]]), { f: '#5b6aa8', s: '#3f4b82', lw: lw * 0.8 });
    s += part(poly([[-26, -40], [-20, -45], [-18, -40], [-20, -35]]), { ...C2.paperB, lw: lw * 0.7 });
  } else {
    // 종이 우산 방패
    let u = '';
    u += part(ell(0, 0, 24, 22), {
      f: '#9b74c8',
      s: '#7553a0',
      lw: lw * 1.1,
      sh: [-4, -3],
      x:
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return `<path d="M0,0L${24 * Math.cos(a)},${22 * Math.sin(a)}" stroke="#5f3f8a" stroke-width="1"/>`;
        }).join('') +
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2, b = a + Math.PI / 6;
          return `<path d="M0,0L${24 * Math.cos(a)},${22 * Math.sin(a)}L${24 * Math.cos(b)},${22 * Math.sin(b)}Z" fill="#b597dc" opacity=".55"/>`;
        }).join('') +
        `<ellipse cx="0" cy="0" rx="17" ry="15.5" fill="none" stroke="#f7f1e2" stroke-width="1.6" stroke-dasharray="3 2.4"/>`,
      hd: 'M-18,-10C-12,-18 -4,-20 2,-20C-6,-16 -12,-12 -16,-6Z',
      ho: 0.5,
    });
    u += part(ell(0, 0, 4, 4), { f: '#3b3644', s: '#25212c', lw: lw * 0.8 });
    s += g(u, 'translate(-8,-33)');
  }
  return s;
}

function c2HeroCard() {
  let s = stdFilters();
  s += `<rect width="370" height="250" fill="${lg([[0, '#f1ead9'], [1, '#e2d7bf']])}"/>`;
  // 배경: 먹 번짐 + 큰 획
  s += `<path d="${taperD([[20, 70], [120, 40], [250, 52], [350, 30]], 46, { a: 0.2, b: 0.5 })}" fill="#cfc5ad" opacity=".55"/>`;
  s += `<circle cx="300" cy="70" r="46" fill="none" stroke="#d6ccb3" stroke-width="10" stroke-dasharray="230 60" transform="rotate(-30 300 70)"/>`;
  [[176, 40, 5], [188, 30, 2], [168, 54, 1.6], [338, 196, 4], [350, 184, 1.8], [24, 150, 3], [16, 162, 1.4]].forEach(([x, y, r]) => (s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#bdb196" opacity=".7"/>`));
  s += `<rect width="370" height="250" filter="url(#grain)" opacity=".5" style="mix-blend-mode:multiply"/>`;
  s += `<ellipse cx="94" cy="234" rx="54" ry="8" fill="#4a4258" opacity=".22"/><ellipse cx="262" cy="224" rx="62" ry="8" fill="#4a4258" opacity=".22"/>`;
  s += g(hanhoek({ lw: 1.35 }), 'translate(92,232) scale(1.45)');
  s += g(hanhoek({ pose: 'aim', lw: 1.35 }), 'translate(262,222) scale(1.42)');
  return svgWrap(370, 250, s) + `<div class="chip" style="left:12px;top:12px">한획 · 기본</div><div class="chip" style="left:196px;top:12px">겨눔</div>`;
}
function c2Enemy(type) {
  let s = stdFilters();
  s += `<rect width="118" height="146" fill="${lg([[0, '#efe7d4'], [1, '#e0d4ba']])}"/>`;
  s += `<rect width="118" height="146" filter="url(#grain)" opacity=".45" style="mix-blend-mode:multiply"/>`;
  s += `<ellipse cx="58" cy="104" rx="30" ry="5" fill="#4a4258" opacity=".2"/>`;
  s += g(paperDoll(type, { lw: 1.35 }), 'translate(60,102) scale(1.08)');
  return svgWrap(118, 146, s);
}

// 느린 시간: 세상이 수묵화로, 주인공의 획만 청록 먹
function inkStroke(pts, w, col) {
  let s = '';
  const smp = sample(pts, false, 14), N = normals(smp), L = smp.length - 1;
  s += `<path d="${taperD(pts, w, { a: 0.06, b: 0.5, min: 0.05, prof: (t) => (t < 0.05 ? 0.6 + t * 8 : 1 - 0.75 * Math.pow(t, 1.6)) })}" fill="${col}" opacity=".92"/>`;
  // 마른 붓 자국 (끝쪽 갈라짐)
  for (let k = -3; k <= 3; k++) {
    if (!k) continue;
    const off = k * w * 0.13;
    const start = Math.floor(L * (0.42 + Math.abs(k) * 0.05)), end = Math.floor(L * (0.97 - Math.abs(k) * 0.04));
    const seg = smp.slice(start, end).map((p, i) => [p[0] + N[start + i][0] * off, p[1] + N[start + i][1] * off]);
    if (seg.length > 2) s += `<path d="${poly(seg, false)}" fill="none" stroke="${col}" stroke-width="${w * 0.1}" stroke-linecap="round" stroke-dasharray="${8 + Math.abs(k) * 3} ${2 + Math.abs(k)}" opacity=".85"/>`;
  }
  // 비백(획 속 하얀 결)
  [-0.18, 0.22].forEach((k, j) => {
    const a0 = Math.floor(L * (0.12 + j * 0.1)), a1 = Math.floor(L * (0.7 + j * 0.08));
    const seg = smp.slice(a0, a1).map((p, i) => [p[0] + N[a0 + i][0] * w * k, p[1] + N[a0 + i][1] * w * k]);
    s += `<path d="${poly(seg, false)}" fill="none" stroke="#eee7d6" stroke-width="${w * 0.07}" stroke-dasharray="14 5 6 4" opacity=".75"/>`;
  });
  // 획 시작의 먹 고임
  s += `<ellipse cx="${pts[0][0]}" cy="${pts[0][1]}" rx="${w * 0.62}" ry="${w * 0.55}" fill="${col}"/>`;
  return s;
}
function c2Scene() {
  let s = stdFilters();
  const W = 238, H = 244;
  s += `<rect width="${W}" height="${H}" fill="#eee7d6"/>`;
  // 먼 산 (먹 번짐)
  const ridge = (pts, top, op, blur) => `<path d="${smooth(pts.concat([[W + 20, H], [-20, H]]), true, 0.6)}" fill="${lg([[0, '#2b2838', op], [0.35, '#2b2838', op * 0.35], [1, '#2b2838', 0]], 0, top, 0, top + 90, 1)}" ${blur ? `filter="url(#blur2)"` : ''}/>`;
  s += ridge([[-20, 70], [30, 40], [60, 52], [96, 26], [140, 58], [180, 44], [258, 64]], 26, 0.32, 1);
  s += ridge([[-20, 104], [40, 82], [86, 96], [130, 76], [170, 92], [258, 80]], 76, 0.5, 1);
  s += `<path d="M-10,116C60,104 160,120 250,108" stroke="#eee7d6" stroke-width="16" opacity=".8" filter="url(#blur4)"/>`;
  // 소나무 가지 (오른쪽 위)
  s += ts([[248, 6], [210, 20], [182, 18], [160, 30]], 6, '#2b2838', { a: 0.05, b: 0.4 });
  s += ts([[214, 18], [204, 6], [190, 2]], 3, '#2b2838', { a: 0.1, b: 0.5 });
  [[176, 22], [196, 14], [160, 32], [222, 22], [186, 4]].forEach(([x, y]) => {
    for (let i = -4; i <= 4; i++) s += ts([[x, y], [x + Math.cos(-1.6 + i * 0.32) * 13, y + Math.sin(-1.6 + i * 0.32) * 9 + 9]], 1.4, '#2b2838', { a: 0.05, b: 0.6, op: 0.85 });
  });
  // 땅: 마른 붓 몇 획
  s += `<path d="${taperD([[-10, 130], [80, 126], [160, 132], [250, 126]], 3, { a: 0.1, b: 0.3 })}" fill="#2b2838" opacity=".35"/>`;
  s += `<path d="${taperD([[10, 236], [90, 232], [150, 238]], 5, { a: 0.1, b: 0.3 })}" fill="#2b2838" opacity=".25"/>`;
  [[24, 196], [204, 214], [70, 150], [220, 150]].forEach(([x, y]) => {
    for (let i = 0; i < 4; i++) s += ts([[x + i * 3, y], [x + i * 3 + (i - 1.5) * 3, y - 9 - (i % 2) * 4]], 1.6, '#2b2838', { a: 0.05, b: 0.6, op: 0.6 });
  });
  s += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".6" style="mix-blend-mode:multiply"/>`;
  // 공중에 멈춘 먹 방울
  [[40, 64, 2.2], [150, 160, 1.6], [196, 120, 2], [92, 186, 1.4], [120, 70, 1.6]].forEach(([x, y, r]) => (s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b2838" opacity=".75"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#fff" opacity=".7"/>`));
  // 적: 모두 먹 그림
  const P0 = [114, 178], dir = [0.68, -0.733];
  const at = (t) => [P0[0] + dir[0] * t, P0[1] + dir[1] * t];
  const T = [44, 80, 116].map(at), E = at(150);
  s += `<g filter="url(#inkgray)">`;
  s += g(paperDoll('sword', { lw: 3 }), 'translate(56,160) scale(.42)');
  s += g(paperDoll('bow', { lw: 3.2 }), 'translate(96,114) scale(.38)');
  [['sword', T[0]], ['umbrella', T[1]], ['bow', T[2]]].forEach(([k, p]) => (s += g(paperDoll(k, { lw: 3 }), `translate(${p[0] - 2},${p[1] + 15}) scale(.42)`)));
  s += `</g>`;
  T.forEach((p) => (s += `<path d="M${p[0] - 13},${p[1] + 15}a13,3.8 0 1 0 6,-3.6" fill="none" stroke="#14a99e" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>`));
  s += `<path d="M30,150A26,26 0 0 0 82,150Z" fill="#ff3b4a" opacity=".14"/><path d="M30,150A26,26 0 0 0 82,150" fill="none" stroke="#ff4a55" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  // 청록 먹 획 (주인공의 한 획)
  s += inkStroke([[112, 214], [113, 192], [118, 176], P0.map((v, i) => v + dir[i] * 20), at(80), E], 8, '#14a99e');
  [[E[0] + 8, E[1] - 6, 1.6], [E[0] + 2, E[1] - 12, 1.1], [E[0] + 12, E[1] + 2, 0.9], [150, 150, 1]].forEach(([x, y, r]) => (s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#14a99e"/>`));
  s += `<ellipse cx="112" cy="238" rx="18" ry="3.6" fill="#2b2838" opacity=".25"/>`;
  s += g(hanhoek({ pose: 'aim', lw: 3.2 }), 'translate(106,236) scale(.4)');
  return svgWrap(W, H, s);
}
function c2Cut() {
  let s = stdFilters();
  const W = 126, H = 244;
  s += `<rect width="${W}" height="${H}" fill="${lg([[0, '#3d3a6e'], [0.6, '#8a6f9a'], [1, '#e8b98a']])}"/>`;
  // 종이 등롱
  [[26, 30, 1], [100, 46, 0.8]].forEach(([x, y, k]) => {
    s += `<circle cx="${x}" cy="${y + 10 * k}" r="${22 * k}" fill="#ffd98a" opacity=".25" filter="url(#blur4)"/>`;
    s += `<path d="M${x},0V${y}" stroke="${INK}" stroke-width="1"/>`;
    s += part(ell(x, y + 10 * k, 9 * k, 11 * k), { f: '#ffe7a8', s: '#f0be62', lw: 1.2, sh: [-2, -1], x: `<path d="M${x - 9 * k},${y + 6 * k}h${18 * k}M${x - 9 * k},${y + 14 * k}h${18 * k}" stroke="#d9a54c" stroke-width=".8"/>` });
  });
  s += `<path d="M0,196H126V244H0Z" fill="#6d5a6e"/><path d="M0,196H126" stroke="${INK}" stroke-width="1.2"/>`;
  s += `<ellipse cx="62" cy="204" rx="34" ry="5" fill="#2a2333" opacity=".4"/>`;
  const art = g(paperDoll('sword', { lw: 1.4 }), 'translate(62,202) scale(1.12)');
  s += split(art, 62, 150, -32, 'translate(10,-18) rotate(16,62,150)', 'translate(-3,2) rotate(-5,62,200)', { edge: '#fffaf0', ew: 1.6 });
  // 종잇조각 팔랑
  const scraps = [[30, 120, 20], [96, 108, -30], [104, 146, 60], [40, 100, -50], [20, 150, 10], [86, 84, 35]];
  scraps.forEach(([x, y, r], i) => (s += g(part(poly([[-4, -3], [4, -2.4], [3, 3], [-3.4, 2.6]]), { f: i % 2 ? '#f6dc7a' : '#f7f1e2', s: i % 2 ? '#d9b64f' : '#dacfb5', lw: 0.9, sh: [-1, -1] }), `translate(${x},${y}) rotate(${r}) scale(${0.9 + (i % 3) * 0.2})`)));
  [[30, 120], [96, 108], [104, 146]].forEach(([x, y]) => (s += `<path d="M${x - 8},${y - 6}q4,-4 7,-1" fill="none" stroke="#fff" stroke-width=".8" opacity=".6"/>`));
  s += slash([[4, 192], [62, 150], [124, 108]], 2.4, '#fff');
  s += `<text x="12" y="88" font-size="20" font-weight="bold" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke" font-family="WenQuanYi Zen Hei">싹둑!</text>`;
  return svgWrap(W, H, s);
}
function c2Sil() {
  let s = stdFilters();
  const items = [[hanhoek({ lw: 2 }), 0.22], [hanhoek({ pose: 'aim', lw: 2 }), 0.22], [paperDoll('sword'), 0.3], [paperDoll('bow'), 0.3], [paperDoll('umbrella'), 0.3]];
  items.forEach(([a, k], i) => (s += g(g(a, `translate(${36 + i * 46},33) scale(${k})`), '', 'filter="url(#sil)" opacity=".85"')));
  return svgWrap(260, 34, s);
}
render2();
function render2() {
  sheet({
    sil: c2Sil(),
    bg: '#ece4d2',
    bgGrad: 'linear-gradient(#f3ecdc,#e6dcc6)',
    fg: '#2a2638',
    accent: '#139a92',
    card: '#e9e0cb',
    line: 'rgba(40,30,60,.12)',
    chipBg: 'rgba(42,38,56,.85)',
    chipFg: '#e8fffb',
    capBg: 'rgba(42,38,56,.88)',
    capFg: '#f3ecdc',
    proBg: '#139a92',
    proFg: '#fff',
    conBg: '#6b6580',
    conFg: '#fff',
    kicker: 'CAST ②',
    title: '먹물 붓 닌자',
    titleSmall: '한획 vs 종이 요괴',
    sub: '키만 한 붓을 멘 꼬마 닌자 — 느린 시간엔 세상이 수묵화가 된다',
    hero: c2HeroCard(),
    enemies: [
      { svg: c2Enemy('sword'), name: '종이칼 졸개', note: '접은 칼 휘두름' },
      { svg: c2Enemy('bow'), name: '종이활 졸개', note: '종이 화살 조준' },
      { svg: c2Enemy('umbrella'), name: '우산 졸개', note: '종이 우산 막기' },
    ],
    scene: c2Scene(),
    sceneCap: '느린 시간 — 세상이 먹 그림이 된다',
    cut: c2Cut(),
    cutCap: '싹둑! 두 쪽 팔랑',
    pro: '느린 시간 = 수묵화. 한 장면만 봐도 다른 게임과 구별',
    con: '흑백 화면이 길면 칙칙 — 색 대비 설계가 관건',
  });
}
