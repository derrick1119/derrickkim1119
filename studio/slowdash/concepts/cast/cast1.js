// 캐스트 ① 태엽 시계 닌자 '초침' vs 태엽 병정
const C1 = {
  navy: { f: '#3a4785', s: '#252f5e' },
  navyD: { f: '#272f57', s: '#191f3f' },
  teal: { f: '#36d8ca', s: '#16a3a0' },
  gold: { f: '#f7c64a', s: '#c98a22' },
  skin: { f: '#ffe4cc', s: '#f3bd99' },
  band: { f: '#59628a', s: '#3b4266' },
  wrap: { f: '#d5dbee', s: '#9ea9cb' },
  blade: { f: '#6c8ef0', s: '#3d58b8' },
  hair: '#1c2040',
};
function gearD(cx, cy, r, n = 8, hole = 0.38) {
  const pts = [];
  for (let i = 0; i < n * 4; i++) {
    const a = (i / (n * 4)) * Math.PI * 2;
    const rr2 = i % 4 < 2 ? r : r * 0.78;
    pts.push([cx + rr2 * Math.cos(a), cy + rr2 * Math.sin(a)]);
  }
  return poly(pts) + ell(cx, cy, r * hole, r * hole);
}
// 시곗바늘 칼 (축=원점, +x 방향이 칼끝)
function clockBlade(lw, glint = false) {
  let s = '';
  s += part(rr(-31, -3.8, 28, 7.6, 3.4), { f: '#2b3157', s: '#1b1f3c', lw, sh: [0, -2] });
  for (let i = 0; i < 4; i++) s += `<path d="M${-27 + i * 6},-3.2l3,3.2l-3,3.2l-3,-3.2Z" fill="#c9a24a" opacity=".85"/>`;
  s += `<g fill-rule="evenodd">` + part(ell(-34, 0, 4.6, 4.6) + ell(-34, 0, 2, 2), { f: C1.gold.f, s: C1.gold.s, lw, sh: [-1, -1.5] }) + `</g>`;
  const blade = poly([[2, -3.4], [48, -1.9], [52, -2.6], [52, 2.6], [48, 1.9], [2, 3.4]]);
  s += part(blade, { f: C1.blade.f, s: C1.blade.s, lw, sh: [0, -1.6], hd: poly([[4, -3], [48, -1.6], [48, -0.6], [4, -1.2]]), ho: 0.7 });
  const ring = ell(58, 0, 6.6, 6.6) + ell(58, 0, 3.6, 3.6);
  s += `<g fill-rule="evenodd">` + part(ring, { f: C1.blade.f, s: C1.blade.s, lw, sh: [-1, -1.6] }) + `</g>`;
  s += part(poly([[63.5, -2.4], [82, 0, 1], [63.5, 2.4]]), { f: C1.blade.f, s: C1.blade.s, lw, sh: [0, -1.4], hd: poly([[64, -2], [80, -0.2], [64, -0.6]]), ho: 0.75 });
  s += part(ell(0, 0, 7, 7), { f: C1.gold.f, s: C1.gold.s, lw, sh: [-1.5, -2], hd: ell(-2, -2.5, 2.6, 1.6), ho: 0.8 });
  s += `<circle cx="0" cy="0" r="2.6" fill="${C1.navyD.f}"/>`;
  if (glint) s += `<path d="M74,-7l1.2,5.5l5.5,1.5l-5.5,1.5l-1.2,5.5l-1.2,-5.5l-5.5,-1.5l5.5,-1.5Z" fill="#fff"/>`;
  return s;
}
function watchEmblem(cx, cy, lw) {
  let s = '';
  s += part(rr(cx - 1.6, cy - 11.6, 3.2, 4, 1), { f: C1.gold.f, s: C1.gold.s, lw: lw * 0.7, sh: [-0.5, -0.5] });
  s += `<g fill-rule="evenodd">` + part(ell(cx, cy - 12.5, 2.6, 2.6) + ell(cx, cy - 12.5, 1.1, 1.1), { f: C1.gold.f, s: C1.gold.s, lw: lw * 0.7, sh: [-0.5, -0.6] }) + `</g>`;
  s += part(ell(cx, cy, 7.6, 7.6), { f: C1.gold.f, s: C1.gold.s, lw: lw * 0.8, sh: [-1.4, -1.6], hd: ell(cx - 2.6, cy - 3.6, 2.6, 1.6), ho: 0.85 });
  s += `<circle cx="${cx}" cy="${cy}" r="5.2" fill="#fff6dc"/>`;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r1 = i % 3 ? 4.3 : 3.6;
    s += `<line x1="${cx + Math.cos(a) * r1}" y1="${cy + Math.sin(a) * r1}" x2="${cx + Math.cos(a) * 4.9}" y2="${cy + Math.sin(a) * 4.9}" stroke="${C1.navyD.f}" stroke-width="${i % 3 ? 0.35 : 0.7}"/>`;
  }
  s += `<path d="M${cx},${cy}L${cx - 2.6},${cy - 1.6}M${cx},${cy}L${cx + 1.4},${cy - 3.6}" stroke="${C1.navyD.f}" stroke-width="0.8" stroke-linecap="round"/>`;
  s += `<path d="M${cx},${cy}L${cx + 0.4},${cy + 4.3}" stroke="${C1.teal.s}" stroke-width="0.5" stroke-linecap="round"/>`;
  return s;
}
function chochim(o = {}) {
  const lw = o.lw ?? 1.5;
  const aim = o.pose === 'aim';
  let s = '';
  // 목도리 꼬리 (실루엣 서명)
  const tails = aim
    ? [
        [[-8, -60], [-26, -67], [-46, -61], [-64, -68]],
        [[-8, -57], [-26, -52], [-43, -47], [-60, -51]],
      ]
    : [
        [[-10, -61], [-26, -66], [-42, -58], [-56, -64]],
        [[-10, -58], [-24, -50], [-36, -40], [-50, -38]],
      ];
  tails.forEach((t, i) => {
    s += part(ribbon(t, 11, 8.5, 0.7), { ...C1.teal, lw, sh: [1, -3.2], hd: ribbon(t.map((p) => [p[0], p[1] - 2.5]), 3, 2, 0.2), h: '#c8fff8', ho: i ? 0.35 : 0.5 });
  });
  // 등의 칼
  if (!aim) s += g(clockBlade(lw), 'translate(24,-74) rotate(136)');
  // 다리
  const leg = (x, rot, cx, cy) => {
    let l = part(rr(x, -23, 13, 19, 5.5), { ...C1.navy, lw, sh: [-2, -1], x: `<path d="M${x},-15l13,-4v3l-13,4Z M${x},-9l13,-4v3l-13,4Z" fill="${C1.wrap.f}"/><path d="M${x},-12l13,-4v1.2l-13,4Z M${x},-6l13,-4v1.2l-13,4Z" fill="${C1.wrap.s}"/>` });
    l += part(ell(x + 6.5 + (x < 0 ? -2 : 2), -3, 9.5, 5.2), { ...C1.navyD, lw, sh: [-1.5, -1.5], hd: ell(x + 4 + (x < 0 ? -2 : 2), -5.5, 4, 1.4), h: '#7d8cc8', ho: 0.6 });
    return g(l, `rotate(${rot},${cx},${cy})`);
  };
  if (aim) {
    s += leg(-19, 26, -12, -20);
    s += leg(6, -18, 12, -20);
  } else {
    s += leg(-17.5, 0, 0, 0);
    s += leg(4.5, 0, 0, 0);
  }
  // 몸
  let body = '';
  const bodyD = smooth([[-15, -61], [15, -61], [20, -46], [22, -27], [16, -16], [0, -14.5], [-16, -16], [-22, -27], [-20, -46]]);
  body += part(bodyD, {
    ...C1.navy,
    lw,
    sh: [-4, -3],
    hd: smooth([[-15, -56], [-12, -58], [-14, -40], [-17, -30], [-18, -42]]),
    h: '#7180c4',
    ho: 0.45,
    x:
      `<path d="M-9,-60L0,-43L9,-60Z" fill="${C1.navyD.s}"/>` +
      ts([[-11, -61], [-4, -50], [1, -42]], 2.4, INK, { a: 0.1, b: 0.3 }) +
      ts([[11, -61], [4, -50], [-1, -42]], 2.4, INK, { a: 0.1, b: 0.3 }) +
      ts([[-16, -44], [-12, -40], [-10, -36]], 1.3, '#1a2048', { a: 0.3, b: 0.3 }) +
      ts([[17, -46], [14, -41], [13, -37]], 1.3, '#1a2048', { a: 0.3, b: 0.3 }) +
      ts([[-12, -22], [-6, -19.5], [0, -19]], 1.2, '#1a2048', { a: 0.3, b: 0.3 }),
  });
  // 허리띠 + 톱니 버클
  body += part(smooth([[-22, -35], [0, -32.5], [22, -35], [22.5, -26], [0, -23.5], [-22.5, -26]]), { f: '#8b5a3a', s: '#62392a', lw, sh: [-1, -2] });
  body += part(gearD(0, -29, 6.4, 8, 0.32), { ...C1.gold, lw: lw * 0.8, sh: [-1.2, -1.4] });
  s += aim ? g(body, 'translate(0,3)') : body;
  // 팔
  const sleeve = (pts, hand) =>
    part(smooth(pts), { ...C1.navy, lw, sh: [-2.5, -2], x: '' }) + part(ell(hand[0], hand[1], 5.6, 5.6), { ...C1.skin, lw, sh: [-1.5, -1.5] });
  if (aim) {
    s += sleeve([[-14, -55], [-22, -52], [-32, -42], [-34, -36], [-27, -36], [-18, -46]], [-33, -35]);
  } else {
    s += sleeve([[-14, -58], [-22, -55], [-29, -41], [-28, -34], [-21, -36], [-17, -48]], [-25.5, -31.5]);
    s += part(smooth([[13, -58], [21, -55], [22, -46], [14, -40], [8, -42], [12, -48]]), { ...C1.navy, lw, sh: [-2.5, -2] });
    s += part(ell(8, -44, 5.4, 5), { ...C1.skin, lw, sh: [-1.5, -1.5] });
    s += part(rr(3.6, -58.5, 3.8, 13, 1.9), { ...C1.skin, lw: lw * 0.8, sh: [-1, -1] }) + part(rr(7.4, -57.5, 3.8, 12, 1.9), { ...C1.skin, lw: lw * 0.8, sh: [-1, -1] });
    s += ts([[3.5, -44.5], [8, -42.5], [12.5, -44.5]], 1.2, C1.skin.s);
  }
  // 목 감싼 목도리
  s += part(smooth([[-20, -65], [0, -61], [20, -65], [22, -56], [0, -50.5], [-22, -56]]), {
    ...C1.teal,
    lw,
    sh: [0, -3.4],
    hd: smooth([[-16, -62], [0, -59], [16, -62], [14, -60], [0, -57.5], [-14, -60]]),
    h: '#c8fff8',
    ho: 0.6,
  });
  s += part(ell(-17, -56, 6.2, 5.4), { ...C1.teal, lw, sh: [-1.6, -1.8] });
  // 머리 (두건)
  const H = aim ? 'translate(2,2) rotate(-6,0,-60)' : '';
  let h = '';
  h += part(ribbon([[22, -103], [33, -110], [44, -114]], 6.5, 5, 0.8), { ...C1.band, lw, sh: [0, -1.6] });
  h += part(ribbon([[22, -100], [34, -101], [45, -98]], 6.5, 5, 0.8), { ...C1.band, lw, sh: [0, -1.6] });
  h += part(ell(0, -86, 31.5, 29.5), {
    ...C1.navy,
    lw: lw * 1.1,
    sh: [-5, -4.5],
    hd: smooth([[-24, -96], [-14, -109], [-2, -113], [-10, -108], [-20, -98]]),
    h: '#8291d6',
    ho: 0.55,
  });
  // 얼굴 창
  const faceD = smooth([[-23.5, -95], [0, -97.5], [23.5, -95], [25.5, -80], [19, -65], [0, -59.5], [-19, -65], [-25.5, -80]]);
  h += part(faceD, {
    ...C1.skin,
    lw,
    sh: [-3, -2.6],
    x:
      `<path d="M-26,-97C-14,-90 14,-90 26,-97L26,-86C14,-82 -14,-82 -26,-86Z" fill="${C1.skin.s}" opacity=".7"/>` +
      `<path d="M-14,-96 L-10,-86 L-6,-95 L-1,-88 L3,-96 L8,-87 L12,-96Z" fill="${C1.hair}"/>`,
  });
  // 이마 띠 + 회중시계
  h += part(smooth([[-28.5, -101], [0, -107], [28.5, -101], [29, -93, 1], [0, -98.5], [-29, -93, 1]].map((p, i) => (i === 3 || i === 5 ? [p[0], p[1], 1] : i === 0 || i === 2 ? [p[0], p[1], 1] : p))), {
    ...C1.band,
    lw,
    sh: [0, -2.2],
    hd: smooth([[-24, -101], [0, -106], [24, -101], [0, -104.5]]),
    h: '#a6aed4',
    ho: 0.5,
  });
  h += watchEmblem(0, -101.5, lw);
  // 눈
  if (aim) {
    h += eye(-10.5, -79.5, 6.4, 7.8, { lid: 0.3, slope: 0.22, look: [1.4, -0.4], lw: lw * 0.9 });
    h += eye(10.5, -79.5, 6.4, 7.8, { lid: 0.3, slope: -0.22, look: [1.4, -0.4], lw: lw * 0.9 });
    h += ts([[-16, -90], [-10, -89.5], [-5, -87]], 2.4, C1.hair, { a: 0.2, b: 0.3 });
    h += ts([[16, -90], [10, -89.5], [5, -87]], 2.4, C1.hair, { a: 0.2, b: 0.3 });
    h += ts([[-3, -68], [0.5, -68.6], [3.5, -68]], 1.8, INK, { a: 0.3, b: 0.3 });
  } else {
    h += eye(-10.5, -79.5, 6.4, 8, { look: [0.4, 0.4], lw: lw * 0.9 });
    h += eye(10.5, -79.5, 6.4, 8, { look: [0.4, 0.4], lw: lw * 0.9 });
    h += `<path d="M-3.4,-68.6Q0,-65 3.4,-68.6Q0,-66.8 -3.4,-68.6Z" fill="${INK}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  }
  h += `<ellipse cx="-18" cy="-70" rx="4.8" ry="2.7" fill="#ff8fab" opacity=".55"/><ellipse cx="18" cy="-70" rx="4.8" ry="2.7" fill="#ff8fab" opacity=".55"/>`;
  h += `<path d="M-19.5,-71l1.2,-1.6M-17.3,-71l1.2,-1.6M16.5,-71l1.2,-1.6M18.7,-71l1.2,-1.6" stroke="#fff" stroke-width=".7" stroke-linecap="round" opacity=".8"/>`;
  s += g(h, H);
  // 겨눔: 앞으로 뻗은 손 + 칼
  if (aim) {
    s += part(smooth([[13, -56], [21, -55], [33, -48], [37, -42], [31, -39], [20, -46]]), { ...C1.navy, lw, sh: [-2.5, -2] });
    s += g(clockBlade(lw, true), 'translate(39,-43) rotate(-66)');
    s += part(ell(37.5, -41.5, 5.8, 5.8), { ...C1.skin, lw, sh: [-1.5, -1.5] });
  }
  return s;
}

// 태엽 병정
function soldier(type, o = {}) {
  const lw = o.lw ?? 1.5;
  const col = { sword: { f: '#4d84e6', s: '#335fb5' }, bow: { f: '#62b25a', s: '#3e8740' }, shield: { f: '#9a6ad0', s: '#7148a4' } }[type];
  let s = '';
  // 등의 태엽 열쇠
  let key = '';
  key += part(rr(6, -3, 22, 6, 2.4), { f: '#f0b947', s: '#bd8224', lw, sh: [0, -2] });
  key += `<g fill-rule="evenodd">` + part(ell(31, -9.5, 7, 8) + ell(31, -10.5, 2.6, 3), { f: '#f0b947', s: '#bd8224', lw, sh: [-1.6, -2], hd: ell(28.5, -13, 2.4, 1.6), ho: 0.8 }) + `</g>`;
  key += `<g fill-rule="evenodd">` + part(ell(31, 9.5, 7, 8) + ell(31, 10.5, 2.6, 3), { f: '#f0b947', s: '#bd8224', lw, sh: [-1.6, -2] }) + `</g>`;
  key += part(ell(31, 0, 4.2, 4.2), { f: '#f0b947', s: '#bd8224', lw, sh: [-1, -1.2] });
  s += g(key, `translate(4,-38) rotate(${o.keyRot ?? -14})`);
  // 다리
  for (const x of [-10, 2]) {
    s += part(rr(x, -19, 8.5, 16, 3.5), { f: '#f4efe4', s: '#c8bfae', lw, sh: [-1.6, -1] });
    s += part(ell(x + 4.2 + (x < 0 ? -1.5 : 1.5), -3.2, 7.2, 4.6), { f: '#43333c', s: '#291e25', lw, sh: [-1.4, -1.4], hd: ell(x + 2.5 + (x < 0 ? -1.5 : 1.5), -5.4, 3, 1.1), ho: 0.5 });
  }
  // 몸통
  const bodyD = smooth([[-14, -47.5], [14, -47.5], [17.5, -36], [17.5, -24], [12, -16.5], [0, -15.5], [-12, -16.5], [-17.5, -24], [-17.5, -36]]);
  s += part(bodyD, {
    ...col,
    lw,
    sh: [-3.4, -2.4],
    x:
      `<path d="M-14,-47L13,-22L13,-18L-14,-43Z" fill="#f4efe4"/><path d="M14,-47L-13,-22L-13,-18L14,-43Z" fill="#f4efe4"/>` +
      `<path d="M-17,-25h35v5h-35Z" fill="#2e2430"/><path d="M-3,-25.5h6v6h-6Z" fill="${C1.gold.f}" stroke="${INK}" stroke-width=".8"/>`,
    hd: smooth([[-13, -44], [-9, -46], [-12, -34], [-15, -30], [-15.5, -38]]),
    ho: 0.35,
  });
  s += `<circle cx="0" cy="-33.5" r="2.4" fill="${C1.gold.f}" stroke="${INK}" stroke-width=".9"/>`;
  // 팔(나무 못 관절)
  const arm = (pts, hand, joint) =>
    part(smooth(pts), { ...col, lw, sh: [-2, -1.6] }) +
    part(ell(hand[0], hand[1], 4.6, 4.6), { f: '#ffffff', s: '#d6d2e4', lw, sh: [-1.2, -1.2] }) +
    `<circle cx="${joint[0]}" cy="${joint[1]}" r="3" fill="#e7c28c" stroke="${INK}" stroke-width=".9"/><circle cx="${joint[0]}" cy="${joint[1]}" r="1.4" fill="none" stroke="#b98a52" stroke-width=".6"/>`;
  // 머리
  let head = part(ell(0, -59, 15.5, 14.5), {
    f: '#ffdcbc',
    s: '#efb48f',
    lw,
    sh: [-3, -2.6],
    hd: ell(-6, -66, 5, 2.6),
    ho: 0.55,
  });
  const btnEye = (x, y) => `<circle cx="${x}" cy="${y}" r="3.3" fill="${INK}"/><circle cx="${x - 1.1}" cy="${y - 1.2}" r="1.1" fill="#fff"/>`;
  head += `<circle cx="-10.5" cy="-53.5" r="3.6" fill="#ff9db4" opacity=".8"/><circle cx="10.5" cy="-53.5" r="3.6" fill="#ff9db4" opacity=".8"/>`;
  if (type === 'sword') {
    head += btnEye(-6, -59.5) + btnEye(6, -59.5);
    head += ts([[-10, -64.5], [-6, -66], [-2.5, -65]], 1.8, INK) + ts([[10, -64.5], [6, -66], [2.5, -65]], 1.8, INK);
    head += part('M0,-53.5C-3,-56 -7,-56 -10,-52.5C-7,-53.5 -4,-52.5 0,-51.5C4,-52.5 7,-53.5 10,-52.5C7,-56 3,-56 0,-53.5Z', { f: '#7a4a2e', s: '#5a321e', lw: lw * 0.7, sh: [0, -1] });
  } else if (type === 'bow') {
    head += btnEye(-6, -59.5);
    head += ts([[3, -59], [6, -60.6], [9.5, -59]], 2, INK, { a: 0.3, b: 0.3 });
    head += `<path d="M-2.5,-52.5Q0,-50.5 2.5,-52.5" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/><path d="M1,-51.6q1.2,2.8 2.6,0" fill="#ff8fa6" stroke="${INK}" stroke-width=".7"/>`;
  } else {
    head += btnEye(-6, -58.5) + btnEye(6, -58.5);
    head += ts([[-10, -63], [-6, -65.5], [-3, -66.5]], 1.6, INK) + ts([[10, -63], [6, -65.5], [3, -66.5]], 1.6, INK);
    head += `<ellipse cx="0" cy="-52" rx="2" ry="1.6" fill="${INK}"/>`;
    head += `<path d="M13,-68q2.4,3.6 0,5q-2.4,-1.4 0,-5Z" fill="#cfefff" stroke="${INK}" stroke-width=".7"/>`;
  }
  // 모자
  let hat = '';
  if (type === 'sword') {
    hat += part(smooth([[-12.5, -69, 1], [12.5, -69, 1], [14.5, -89, 1], [0, -91.5], [-14.5, -89, 1]]), { f: '#7d50ad', s: '#563582', lw, sh: [-3, -1.5], hd: 'M-11,-72L-12.5,-87L-9,-88L-8,-72Z', ho: 0.3 });
    hat += part(smooth([[-14.5, -71], [0, -67.5], [14.5, -71], [14, -66.5], [0, -63.5], [-14, -66.5]]), { f: '#2a2233', s: '#17121d', lw, sh: [0, -1.5] });
    hat += part(ell(0, -80, 3.6, 3.6), { ...C1.gold, lw: lw * 0.8, sh: [-0.8, -0.8] });
    hat += part(smooth([[-4, -90], [-6, -97], [-2, -103], [3, -101], [5, -95], [4, -90]]), { f: '#ffffff', s: '#d9d4e8', lw, sh: [-1.6, -1.2] });
  } else if (type === 'bow') {
    hat += part(smooth([[-16.5, -68, 1], [16.5, -68, 1], [9, -82], [4, -95], [10, -103], [16, -101], [3, -103, 1], [-3, -92], [-8, -80]]), { f: '#79c55c', s: '#4a923a', lw, sh: [-3, -1.6], hd: 'M-11,-71L-5,-86L-2,-85L-7,-71Z', ho: 0.35 });
    hat += part(smooth([[-17.5, -70], [0, -66.5], [17.5, -70], [16, -65.5], [0, -63], [-16, -65.5]]), { f: '#4a923a', s: '#336c28', lw, sh: [0, -1.5] });
    hat += part(ell(17, -101.5, 4.4, 4.4), { f: '#ffe7a6', s: '#e6b860', lw, sh: [-1, -1] });
  } else {
    hat += `<g fill-rule="evenodd">` + part(ell(-17, -76, 3.6, 4.2) + ell(-17, -76, 1.4, 2), { f: '#cdd5e4', s: '#8d98b0', lw: lw * 0.8 }) + part(ell(17, -76, 3.6, 4.2) + ell(17, -76, 1.4, 2), { f: '#cdd5e4', s: '#8d98b0', lw: lw * 0.8 }) + `</g>`;
    hat += part(smooth([[-15, -70, 1], [15, -70, 1], [14.5, -84, 1], [0, -86.5], [-14.5, -84, 1]]), { f: '#d3dbe8', s: '#8f9bb3', lw, sh: [-4, -1], hd: 'M-10,-72L-11,-83L-7,-84L-6.5,-72Z', ho: 0.8 });
    hat += part(smooth([[-17, -71], [0, -68], [17, -71], [16.5, -66.5], [0, -64], [-16.5, -66.5]]), { f: '#b8c2d4', s: '#7c879f', lw, sh: [0, -1.5] });
    hat += part(rr(-3, -91, 6, 5, 2), { f: '#3b3140', s: '#241c28', lw: lw * 0.8 });
  }
  // 무기 + 팔
  if (type === 'sword') {
    s += arm([[12, -45], [18, -42], [22, -32], [19, -27], [14, -32], [11, -40]], [19.5, -27], [14, -44]);
    s += head + hat;
    let sw = part(rr(-2.6, -46, 5.2, 40, 2.4), { f: '#ecd09e', s: '#c69c62', lw, sh: [-1.6, 0], x: `<path d="M0,-40v30" stroke="#b98a52" stroke-width=".7" opacity=".7"/>` });
    sw += part(rr(-8, -7, 16, 4.6, 2), { f: '#8b5a3a', s: '#62392a', lw, sh: [0, -1.2] });
    sw += part(rr(-2.4, -3, 4.8, 9, 2), { f: '#5b3a28', s: '#3c2519', lw });
    s += g(sw, 'translate(-21,-31) rotate(-24)');
    s += arm([[-12, -45], [-18, -42], [-23, -34], [-21, -29], [-15, -33], [-11, -40]], [-21, -30], [-14, -44]);
  } else if (type === 'bow') {
    s += arm([[12, -45], [18, -42], [22, -32], [19, -27], [14, -32], [11, -40]], [19.5, -27], [14, -44]);
    s += head + hat;
    s += `<path d="M-27,-70L-27,-14" stroke="#f4efe4" stroke-width="1.1"/>`;
    s += part(taperD([[-26, -71], [-36, -56], [-38, -42], [-36, -28], [-26, -13]], 6, { a: 0.15, b: 0.15, min: 0.5 }), { f: '#d6a868', s: '#a8773f', lw: lw * 0.9, sh: [1, -1] });
    // 고무 흡착 화살
    s += part(rr(-48, -44.2, 28, 3.6, 1.6), { f: '#f6e3b8', s: '#d2b67c', lw: lw * 0.8, sh: [0, -1] });
    s += part(smooth([[-48, -48.5, 1], [-52.5, -46], [-52.5, -38.5], [-48, -36, 1]]), { f: '#6b4f8a', s: '#4b3566', lw: lw * 0.8, sh: [-1, -1] });
    s += arm([[-12, -45], [-18, -43], [-26, -42], [-28, -39], [-17, -37], [-11, -40]], [-27, -42.5], [-14, -44]);
  } else {
    s += arm([[12, -45], [18, -42], [22, -32], [19, -27], [14, -32], [11, -40]], [19.5, -27], [14, -44]);
    s += head + hat;
    s += `<g fill-rule="evenodd">`;
    s += part(ell(-10, -33, 18, 20), {
      f: '#d9e0ec',
      s: '#9aa5bd',
      lw: lw * 1.1,
      sh: [-4, -3],
      hd: smooth([[-22, -40], [-16, -48], [-10, -50], [-16, -46], [-20, -38]]),
      h: '#fff',
      ho: 0.9,
      x: `<ellipse cx="-10" cy="-33" rx="13" ry="14.5" fill="none" stroke="#a9b3c8" stroke-width="1.2"/>`,
    });
    s += `</g>`;
    s += part(ell(-10, -33, 5, 4.4), { f: '#3b3140', s: '#241c28', lw, sh: [-1, -1.2], hd: ell(-11.5, -34.5, 1.8, 1), ho: 0.6 });
  }
  return s;
}

function c1HeroCard() {
  let s = stdFilters();
  s += `<rect width="370" height="250" fill="${lg([[0, '#2c3470'], [1, '#4b4f94']])}"/>`;
  // 배경 큰 시계판 문양
  s += `<g opacity=".16" stroke="#cfd6ff" fill="none"><circle cx="185" cy="130" r="112" stroke-width="2"/><circle cx="185" cy="130" r="98" stroke-width="1"/>`;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, r1 = i % 5 ? 104 : 92;
    s += `<line x1="${185 + Math.cos(a) * r1}" y1="${130 + Math.sin(a) * r1}" x2="${185 + Math.cos(a) * 110}" y2="${130 + Math.sin(a) * 110}" stroke-width="${i % 5 ? 1 : 3}"/>`;
  }
  s += `</g>`;
  s += `<path d="M185,130L185,30" stroke="#5ff0e2" stroke-width="2" opacity=".35"/>`;
  s += `<rect width="370" height="250" filter="url(#grain)" opacity=".5" style="mix-blend-mode:overlay"/>`;
  s += `<ellipse cx="96" cy="234" rx="56" ry="9" fill="#141838" opacity=".45"/><ellipse cx="262" cy="234" rx="66" ry="9" fill="#141838" opacity=".45"/>`;
  s += g(chochim({ lw: 1.35 }), 'translate(90,232) scale(1.45)');
  s += g(chochim({ pose: 'aim', lw: 1.35 }), 'translate(262,232) scale(1.45)');
  return svgWrap(370, 250, s) + `<div class="chip" style="left:12px;top:12px">초침 · 기본</div><div class="chip" style="left:196px;top:12px">겨눔</div>`;
}
function c1Enemy(type) {
  let s = stdFilters();
  s += `<rect width="118" height="146" fill="${lg([[0, '#33397a'], [1, '#4a4a8e']])}"/>`;
  s += `<ellipse cx="56" cy="104" rx="30" ry="6" fill="#141838" opacity=".4"/>`;
  s += g(soldier(type, { lw: 1.4 }), 'translate(54,104) scale(1.02)');
  return svgWrap(118, 146, s);
}

// 느린 시간 장면: 세상은 청회색, 시계탑 초침만 청록으로 멈춤
function c1Scene() {
  let s = stdFilters();
  s += `<filter id="c1slow" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${slowMatrix(0.22, [0.82, 0.92, 1.12], [0.0, 0.02, 0.07])}"/></filter>`;
  const W = 238, H = 244;
  let w = '';
  w += `<rect width="${W}" height="${H}" fill="${lg([[0, '#2c3480'], [0.42, '#7a62a8'], [0.43, '#5b4f86'], [1, '#3c3566']])}"/>`;
  w += `<circle cx="198" cy="24" r="22" fill="#fff3c4" opacity=".25" filter="url(#blur4)"/><circle cx="198" cy="24" r="12" fill="#fff6d8"/>`;
  for (let i = 0; i < 14; i++) w += `<circle cx="${(i * 71) % 230 + 6}" cy="${(i * 37) % 60 + 4}" r="${i % 3 ? 0.7 : 1.1}" fill="#fff" opacity=".8"/>`;
  // 먼 지붕들 + 창문 불빛
  const roofs = [[86, 72, 34, 26], [118, 64, 30, 34], [146, 74, 40, 24], [182, 60, 28, 38], [208, 70, 36, 28]];
  roofs.forEach(([x, y, ww, hh], i) => {
    w += `<path d="M${x},${y + hh}V${y + 8}L${x + ww / 2},${y - 8}L${x + ww},${y + 8}V${y + hh}Z" fill="${i % 2 ? '#4a3f78' : '#55468a'}" stroke="${INK}" stroke-width="1"/>`;
    w += `<path d="M${x - 3},${y + 9}L${x + ww / 2},${y - 10}L${x + ww + 3},${y + 9}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M${x - 3},${y + 9}L${x + ww / 2},${y - 10}L${x + ww + 3},${y + 9}" fill="none" stroke="#6d5aa8" stroke-width="1.6" stroke-linejoin="round"/>`;
    w += `<rect x="${x + ww / 2 - 4}" y="${y + 6}" width="8" height="9" rx="1.5" fill="#ffd27a" stroke="${INK}" stroke-width=".8"/><path d="M${x + ww / 2},${y + 6}v9M${x + ww / 2 - 4},${y + 10.5}h8" stroke="${INK}" stroke-width=".6"/>`;
  });
  // 시계탑
  w += part(rr(16, 30, 64, 120, 3), { f: '#b98f72', s: '#8e6a55', lw: 1.3, sh: [-5, 0], x: [50, 62, 74, 86].map((y) => `<path d="M16,${y + 40}h64" stroke="#7d5c49" stroke-width=".8"/>`).join('') });
  w += part('M10,34L48,-6L86,34Z', { f: '#5d4f8f', s: '#433770', lw: 1.3, sh: [-4, 0] });
  w += part(ell(48, 50, 26, 26), { f: '#f7ecd2', s: '#d9c8a6', lw: 1.6, sh: [-3, -3] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    w += `<line x1="${48 + Math.cos(a) * 19}" y1="${50 + Math.sin(a) * 19}" x2="${48 + Math.cos(a) * 23}" y2="${50 + Math.sin(a) * 23}" stroke="${INK}" stroke-width="${i % 3 ? 1 : 2}"/>`;
  }
  w += `<path d="M48,50L37,44M48,50L55,35" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  // 지붕 위 평평한 돌 테라스 (원근 타일)
  w += `<path d="M0,104H238V244H0Z" fill="${lg([[0, '#5a5290'], [1, '#433b70']])}"/>`;
  for (let r = 0, y = 112; y < 250; r++, y += 10 + r * 3) w += `<path d="M0,${y}H238" stroke="#342d5c" stroke-width="${1 + r * 0.2}"/><path d="M0,${y + 1.4}H238" stroke="#6f66a8" stroke-width=".7"/>`;
  for (let i = -6; i <= 6; i++) w += `<path d="M${119 + i * 22},104L${119 + i * 62},244" stroke="#342d5c" stroke-width="1.1"/>`;
  w += `<path d="M0,98H238V107H0Z" fill="#6b5ea0" stroke="${INK}" stroke-width="1.2"/><path d="M0,100H238" stroke="#9184c8" stroke-width="1.2"/>`;
  // 공중에 멈춘 먼지 톱니
  [[30, 196, 3.4], [214, 182, 2.6], [96, 128, 2.2], [150, 214, 2.8]].forEach(([x, y, r]) => (w += `<path d="${gearD(x, y, r, 6)}" fill="#cfc8ee" fill-rule="evenodd" opacity=".6"/>`));
  // 위험 병정 (회색 세계 쪽)
  w += g(soldier('sword', { lw: 3 }), 'translate(56,158) scale(.42)');
  w += g(soldier('bow', { lw: 3.2 }), 'translate(96,112) scale(.4)');
  let s2 = s + `<g filter="url(#c1slow)">${w}</g>`;
  // 멈춘 초침 (유일하게 색이 남은 세계)
  s2 += `<circle cx="48" cy="50" r="5" fill="none" stroke="#5ff0e2" stroke-width="1" opacity=".7"/><path d="M48,58L48,27" stroke="#5ff0e2" stroke-width="5" opacity=".35" filter="url(#blur2)"/><path d="M48,58L48,27" stroke="#5ff0e2" stroke-width="1.6" stroke-linecap="round"/><circle cx="48" cy="50" r="2" fill="#5ff0e2"/>`;
  // 빨강 = 위험: 칼 반경 반달
  s2 += `<path d="M30,148A26,26 0 0 0 82,148Z" fill="#ff3b4a" opacity=".16"/><path d="M30,148A26,26 0 0 0 82,148" fill="none" stroke="#ff4a55" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  // 길 + 겨눈 적
  const P0 = [114, 178], dir = [0.68, -0.733];
  const at = (t) => [P0[0] + dir[0] * t, P0[1] + dir[1] * t];
  const T = [44, 80, 116].map(at), E = at(150);
  T.forEach((p) => (s2 += `<ellipse cx="${p[0]}" cy="${p[1] + 14}" rx="13" ry="3.6" fill="none" stroke="#5ff0e2" stroke-width="1.1" opacity=".8"/>`));
  const path = [[112, 214], [113, 196], P0, at(60), at(110), E];
  s2 += `<path d="${smooth([[112, 214], [113, 192], P0, E], false, 0.4)}" fill="none" stroke="#5ff0e2" stroke-width="9" opacity=".28" filter="url(#blur2)" stroke-linecap="round" stroke-linejoin="round"/>`;
  [['sword', T[0]], ['shield', T[1]], ['bow', T[2]]].forEach(([k, p]) => (s2 += g(soldier(k, { lw: 3 }), `translate(${p[0] - 2},${p[1] + 14}) scale(.42)`)));
  s2 += `<path d="M112,214L113,${P0[1] + 6}Q${P0[0]},${P0[1]} ${P0[0] + 4},${P0[1] - 5}L${E[0]},${E[1]}" fill="none" stroke="#5ff0e2" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  s2 += `<path d="M112,214L113,${P0[1] + 6}Q${P0[0]},${P0[1]} ${P0[0] + 4},${P0[1] - 5}L${E[0]},${E[1]}" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`;
  s2 += `<circle cx="${E[0]}" cy="${E[1]}" r="3.4" fill="#fff" stroke="#5ff0e2" stroke-width="1.4"/>`;
  s2 += `<ellipse cx="112" cy="238" rx="18" ry="4" fill="#141838" opacity=".5"/>`;
  s2 += g(chochim({ pose: 'aim', lw: 3.2 }), 'translate(108,238) scale(.4)');
  s2 += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".35" style="mix-blend-mode:overlay"/>`;
  // HUD 아주 얇게
  return svgWrap(W, H, s2);
}
function c1Cut() {
  let s = stdFilters();
  const W = 126, H = 244;
  s += `<rect width="${W}" height="${H}" fill="${lg([[0, '#3a3a86'], [1, '#5a4c92']])}"/>`;
  s += `<circle cx="96" cy="34" r="30" fill="#ffd27a" opacity=".12" filter="url(#blur8)"/>`;
  s += `<path d="M0,190H126V244H0Z" fill="#4b4378"/><path d="M0,186H126V194H0Z" fill="#6b5ea0" stroke="${INK}" stroke-width="1"/>`;
  s += `<ellipse cx="62" cy="200" rx="34" ry="6" fill="#141838" opacity=".45"/>`;
  const art = g(soldier('sword', { lw: 1.45 }), 'translate(60,198) scale(1.05)');
  // 튀어나오는 톱니·용수철 (몸 안쪽에서)
  let pop = '';
  pop += part(gearD(40, 146, 6, 8, 0.35), { ...C1.gold, lw: 1.2, sh: [-1.5, -1.5] }).replace(/^/, '<g fill-rule="evenodd">') + '</g>';
  pop += `<g fill-rule="evenodd">` + part(gearD(30, 150, 5, 7, 0.35), { ...C1.gold, lw: 1.1, sh: [-1, -1] }) + part(gearD(108, 112, 4.2, 6, 0.35), { ...C1.gold, lw: 1, sh: [-1, -1] }) + `</g>`;
  let sp = '';
  for (let i = 0; i < 5; i++) sp += `<ellipse cx="${60 + i * 1.6}" cy="${154 - i * 4.4}" rx="6" ry="2.4" fill="none" stroke="${INK}" stroke-width="2.6" transform="rotate(-12 ${60 + i * 1.6} ${154 - i * 4.4})"/><ellipse cx="${60 + i * 1.6}" cy="${154 - i * 4.4}" rx="6" ry="2.4" fill="none" stroke="#e8edf7" stroke-width="1.2" transform="rotate(-12 ${60 + i * 1.6} ${154 - i * 4.4})"/>`;
  const [U, Dn] = split(art, 60, 160, -24, 'translate(9,-24) rotate(13,60,160)', 'translate(-3,2) rotate(-4,60,190)', { parts: true });
  s += Dn + sp + U + pop;
  // 날아가는 태엽 열쇠
  let key = part(rr(6, -3, 16, 6, 2.4), { f: '#f0b947', s: '#bd8224', lw: 1.3, sh: [0, -2] });
  key += `<g fill-rule="evenodd">` + part(ell(26, -8, 6, 7) + ell(26, -9, 2.2, 2.6), { f: '#f0b947', s: '#bd8224', lw: 1.3, sh: [-1.6, -2] }) + part(ell(26, 8, 6, 7) + ell(26, 9, 2.2, 2.6), { f: '#f0b947', s: '#bd8224', lw: 1.3, sh: [-1.6, -2] }) + `</g>`;
  s += g(key, 'translate(80,58) rotate(-62)');
  s += `<path d="M86,96q8,-10 12,-24" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>`;
  s += slash([[6, 196], [60, 160], [122, 120]], 2.4, '#bff');
  s += `<text x="16" y="44" font-size="22" font-weight="bold" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke" font-family="WenQuanYi Zen Hei">툭!</text>`;
  return svgWrap(W, H, s);
}
function c1Sil() {
  let s = stdFilters();
  const items = [[chochim({ lw: 2 }), 0.23], [chochim({ pose: 'aim', lw: 2 }), 0.23], [soldier('sword'), 0.28], [soldier('bow'), 0.28], [soldier('shield'), 0.28]];
  items.forEach(([a, k], i) => (s += g(g(a, `translate(${36 + i * 46},33) scale(${k})`), '', 'filter="url(#sil2)" opacity=".85"')));
  return svgWrap(260, 34, s);
}
render1();
function render1() {
  sheet({
    sil: c1Sil(),
    bg: '#191c3f',
    bgGrad: 'linear-gradient(#1b1f47,#14163a)',
    fg: '#eef0ff',
    accent: '#5ff0e2',
    card: '#2a2f66',
    line: 'rgba(255,255,255,.08)',
    chipBg: 'rgba(15,18,48,.7)',
    chipFg: '#dff',
    capBg: 'rgba(12,14,40,.85)',
    proBg: '#1f8f88',
    proFg: '#fff',
    conBg: '#4a4f7a',
    conFg: '#fff',
    kicker: 'CAST ①',
    title: '태엽 시계 닌자',
    titleSmall: '초침 vs 태엽 병정',
    sub: '시계가 멈춘 밤, 혼자 움직이는 꼬마 닌자 — 장난감 병정을 똑딱!',
    hero: c1HeroCard(),
    enemies: [
      { svg: c1Enemy('sword'), name: '칼 병정', note: '나무칼 휘두름' },
      { svg: c1Enemy('bow'), name: '활 병정', note: '흡착 화살 조준' },
      { svg: c1Enemy('shield'), name: '방패 병정', note: '냄비뚜껑 막기' },
    ],
    scene: c1Scene(),
    sceneCap: '느린 시간 — 시계가 멈춘다',
    cut: c1Cut(),
    cutCap: '툭! 톱니가 퐁',
    pro: '시계가 멈춤 = 느린 시간. 설명 없이 바로 이해된다',
    con: '태엽 장난감 병정은 익숙한 소재 — 첫 놀라움이 약함',
  });
}
