// 캐스트 ③ 비 오는 밤 개구리 검객 '도롱' vs 물방울 도깨비
const C3 = {
  frog: { f: '#93d24c', s: '#5f9f33' },
  frogD: { f: '#76b83c', s: '#4d8a2a' },
  belly: { f: '#f3f0bd', s: '#d6cf8c' },
  straw: { f: '#e9c675', s: '#b8913f' },
  teal: { f: '#36d8ca', s: '#16a3a0' },
  blade: { f: '#eef2fa', s: '#a9b4ca' },
  lacq: { f: '#4b3a54', s: '#2f2338' },
  pink: '#ff94ae',
  leaf: { f: '#5cb85a', s: '#3b8a3f' },
};
let SEED = 7;
const rnd = () => ((SEED = (SEED * 16807) % 2147483647) / 2147483647);
// 칼 (+x 칼끝, 원점=코등이)
function frogSword(lw, glint, hiltOnly) {
  let s = '';
  s += part(rr(-24, -3.2, 22, 6.4, 3), { f: '#2f3b6a', s: '#1d2547', lw, sh: [0, -1.6] });
  for (let i = 0; i < 3; i++) s += `<path d="M${-21 + i * 6},-3l3,3l-3,3l-3,-3Z" fill="#e9e3d0" opacity=".85"/>`;
  if (hiltOnly) return s + part(ell(0, 0, 3.4, 7), { f: '#c9a24a', s: '#9a7728', lw, sh: [-1, -1.5] });
  s += part(poly([[2, -3], [54, -3.4], [62, 0, 1], [54, 2.2], [2, 2.6]]), { ...C3.blade, lw, sh: [0, -1.6], hd: poly([[4, -2.6], [54, -3], [58, -1.4], [4, -1]]), ho: 0.9, x: `<path d="M4,0.6L56,0.3" stroke="#c8d0e0" stroke-width=".6"/>` });
  s += part(ell(0, 0, 3.4, 7), { f: '#c9a24a', s: '#9a7728', lw, sh: [-1, -1.5] });
  if (glint) s += `<path d="M52,-8l1,4.6l4.6,1.2l-4.6,1.2l-1,4.6l-1,-4.6l-4.6,-1.2l4.6,-1.2Z" fill="#fff"/>`;
  return s;
}
function hand(cx, cy, r, lw, rot = 0) {
  // 개구리 손: 둥근 발가락 끝
  let s = '';
  [[-0.9, -1.05], [-0.3, -1.3], [0.35, -1.25], [0.9, -0.95]].forEach(([dx, dy]) => (s += part(ell(cx + dx * r, cy + dy * r, r * 0.42, r * 0.42), { ...C3.frog, lw: lw * 0.8, sh: [-0.6, -0.6] })));
  s += part(ell(cx, cy, r, r * 0.9), { ...C3.frog, lw, sh: [-1.2, -1.2] });
  return rot ? g(s, `rotate(${rot},${cx},${cy})`) : s;
}
function dorong(o = {}) {
  const lw = o.lw ?? 1.5;
  const aim = o.pose === 'aim';
  let s = '';
  const tails = aim
    ? [[[-8, -48], [-26, -55], [-46, -49], [-64, -56]], [[-8, -45], [-26, -40], [-43, -35], [-60, -39]]]
    : [[[-10, -49], [-24, -56], [-38, -50], [-50, -58]], [[-10, -46], [-22, -38], [-32, -28], [-44, -24]]];
  tails.forEach((t, i) => (s += part(ribbon(t, 10, 8, 0.7), { ...C3.teal, lw, sh: [1, -3], hd: ribbon(t.map((p) => [p[0], p[1] - 2.4]), 3, 2, 0.2), h: '#c8fff8', ho: i ? 0.35 : 0.5 })));
  // 다리 (개구리 다리 + 발가락 패드)
  const foot = (x, flip) => {
    let f = '';
    // 접힌 허벅지
    f += part(smooth([[x - 9 * flip, -24], [x + 5 * flip, -27], [x + 11 * flip, -16], [x + 7 * flip, -6], [x - 5 * flip, -8]]), { ...C3.frog, lw, sh: [-2, -2], hd: ell(x - 1 * flip, -21, 4, 2), h: '#e4ffa8', ho: 0.4 });
    // 벌어진 발가락 + 둥근 패드
    [-28, 8, 42].forEach((a) => {
      const r = ((a + (flip < 0 ? 180 - 2 * a : 0)) * Math.PI) / 180;
      const ax = x + 2 * flip, ay = -3.5;
      const ex = ax + Math.cos(flip < 0 ? Math.PI - (a * Math.PI) / 180 : (a * Math.PI) / 180) * 11, ey = ay + Math.sin((a * Math.PI) / 180) * 5 + 1;
      f += part(taperD([[ax, ay], [ex, ey]], 4.4, { a: 0.01, b: 0.01, min: 0.75 }), { ...C3.frog, lw: lw * 0.8, sh: [-0.8, -0.8] });
      f += part(ell(ex, ey, 3, 2.6), { ...C3.frog, lw: lw * 0.8, sh: [-0.8, -0.8], hd: ell(ex - 0.8, ey - 0.9, 1.1, 0.7), h: '#e4ffa8', ho: 0.7 });
    });
    f += part(ell(x + 2 * flip, -4, 7, 4), { ...C3.frog, lw, sh: [-1.4, -1.4] });
    return f;
  };
  if (aim) s += g(foot(-14, -1), 'translate(-6,0)') + g(foot(14, 1), 'translate(8,0)');
  else s += foot(-12, -1) + foot(12, 1);
  // 칼집 (기본: 왼쪽 허리)
  if (!aim) s += g(part(rr(-2, -3.4, 46, 6.8, 3.2), { ...C3.lacq, lw, sh: [0, -1.6], hd: rr(2, -2.6, 38, 1.4, 0.7), h: '#9a86b0', ho: 0.6 }) + part(rr(40, -3.8, 6, 7.6, 2), { f: '#c9a24a', s: '#9a7728', lw }) + frogSword(lw, false, true), 'translate(-6,-27) rotate(146)');
  // 몸
  let b = '';
  b += part(smooth([[-15, -50], [15, -50], [20, -34], [19, -20], [10, -12], [0, -11], [-10, -12], [-19, -20], [-20, -34]]), {
    ...C3.frog,
    lw,
    sh: [-4, -3],
    x: `<ellipse cx="1" cy="-26" rx="12" ry="13" fill="${C3.belly.s}"/><ellipse cx="-0.6" cy="-27.6" rx="11" ry="11.6" fill="${C3.belly.f}"/>` + ts([[-6, -21], [0, -19.5], [6, -21]], 1, C3.belly.s),
  });
  // 띠 (끈)
  b += part(smooth([[-20, -32], [0, -29], [20, -32], [20, -27.5], [0, -24.5], [-20, -27.5]]), { f: '#6a4b8a', s: '#4b3366', lw, sh: [0, -1.6] });
  b += part(poly([[-8, -28], [-14, -18], [-10, -17], [-5, -26]]), { f: '#6a4b8a', s: '#4b3366', lw: lw * 0.8 });
  s += aim ? g(b, 'translate(0,3)') : b;
  // 목도리
  s += part(smooth([[-18, -53], [0, -49.5], [18, -53], [20, -45], [0, -40], [-20, -45]]), { ...C3.teal, lw, sh: [0, -3.2], hd: smooth([[-14, -50], [0, -47.5], [14, -50], [12, -48.4], [0, -46], [-12, -48.4]]), h: '#c8fff8', ho: 0.6 });
  s += part(ell(-16, -45, 5.8, 5), { ...C3.teal, lw, sh: [-1.5, -1.6] });
  // 머리
  let h = '';
  const eyeBul = (x) => part(ell(x, -84, 13.5, 13), { ...C3.frog, lw, sh: [-3, -2.4] });
  h += eyeBul(-19) + eyeBul(19);
  h += part(ell(0, -69, 33, 23), {
    ...C3.frog,
    lw: lw * 1.1,
    sh: [-5, -4],
    hd: smooth([[-26, -76], [-16, -84], [-4, -86], [-14, -80], [-24, -70]]),
    h: '#e4ffa8',
    ho: 0.55,
    x: `<ellipse cx="0" cy="-52" rx="22" ry="8" fill="${C3.belly.s}"/><ellipse cx="0" cy="-53.4" rx="21" ry="7" fill="${C3.belly.f}"/>`,
  });
  // 눈 (뚱한 개구리 눈, 금빛 고리)
  const E = (x, sl) =>
    aim
      ? eye(x, -84, 8.2, 8.8, { lid: 0.34, slope: sl, look: [1.6, 0.4], lw: lw * 0.9, base: '#1d1a2c', iris: '#f2c25a' })
      : eye(x, -84.5, 8.4, 9.6, { look: [0.4, 0.2], lw: lw * 0.9, base: '#1d1a2c', iris: '#f7cc63' });
  h += E(-19, 0.25) + E(19, -0.25);
  // 볼 + 입
  h += `<ellipse cx="-22" cy="-62" rx="5.6" ry="3.2" fill="${C3.pink}" opacity=".7"/><ellipse cx="22" cy="-62" rx="5.6" ry="3.2" fill="${C3.pink}" opacity=".7"/>`;
  h += `<path d="M-24,-63.6l1.4,-1.8M-21.4,-63.6l1.4,-1.8M20,-63.6l1.4,-1.8M22.6,-63.6l1.4,-1.8" stroke="#fff" stroke-width=".8" stroke-linecap="round" opacity=".85"/>`;
  if (aim) h += ts([[-9, -61], [0, -61.6], [9, -60.4]], 2, INK, { a: 0.2, b: 0.2 });
  else h += ts([[-14, -63], [-6, -58.5], [0, -58], [6, -58.5], [14, -63]], 2.2, INK, { a: 0.15, b: 0.15 }) + `<path d="M-4,-58.4Q0,-55 4,-58.4Z" fill="#ff8aa4" stroke="${INK}" stroke-width=".8"/>`;
  h += `<circle cx="-4" cy="-71" r="1.1" fill="${C3.frog.s}"/><circle cx="4" cy="-71" r="1.1" fill="${C3.frog.s}"/>`;
  // 삿갓: 챙이 눈 위에 걸침
  const hat = (tilt) => {
    let t = '';
    t += `<path d="M-30,-99C-26,-91 -16,-86 -12,-74M30,-99C26,-91 16,-86 12,-74" fill="none" stroke="#7a5a2a" stroke-width="${lw * 0.6}" opacity=".0"/>`;
    t += part(smooth([[-39, -98], [-20, -106], [0, -126, 1], [20, -106], [39, -98], [20, -94], [0, -92.5], [-20, -94]]), {
      ...C3.straw,
      lw: lw * 1.1,
      sh: [-5, -2.4],
      hd: 'M-30,-99L0,-123L-4,-112L-22,-99Z',
      h: '#fff1c4',
      ho: 0.55,
      x:
        Array.from({ length: 9 }, (_, i) => `<path d="M0,-126L${-36 + i * 9},-93" stroke="#b08a3c" stroke-width=".9"/>`).join('') +
        [0.35, 0.62, 0.85].map((k) => `<path d="M${-39 * k},${-126 + 32 * k}Q0,${-126 + 38 * k} ${39 * k},${-126 + 32 * k}" fill="none" stroke="#b08a3c" stroke-width=".8"/>`).join(''),
    });
    t += part(rr(-2.4, -130, 4.8, 6, 2), { ...C3.lacq, lw: lw * 0.8 });
    return g(t, `rotate(${tilt},0,-96)`);
  };
  h += aim ? hat(6) : g(hat(-7), 'translate(0,-5)');
  s += g(h, aim ? 'translate(3,4) rotate(-5,0,-50)' : '');
  // 팔
  if (aim) {
    s += part(taperD([[-14, -44], [-24, -38], [-30, -30]], 8, { a: 0.01, b: 0.01, min: 0.8 }), { ...C3.frog, lw, sh: [-1.5, -1.5] }) + hand(-31, -28, 5, lw, 200);
    s += part(taperD([[14, -44], [24, -42], [32, -40]], 8, { a: 0.01, b: 0.01, min: 0.8 }), { ...C3.frog, lw, sh: [-1.5, -1.5] });
    s += g(frogSword(lw, true), 'translate(36,-42) rotate(-64)');
    s += hand(35, -40, 5.2, lw, 30);
  } else {
    s += part(taperD([[-14, -46], [-22, -38], [-18, -30]], 8, { a: 0.01, b: 0.01, min: 0.8 }), { ...C3.frog, lw, sh: [-1.5, -1.5] }) + hand(-17, -28, 5, lw, 160);
    // 오른손 흔들기
    s += part(taperD([[14, -46], [24, -50], [30, -60]], 8, { a: 0.01, b: 0.01, min: 0.8 }), { ...C3.frog, lw, sh: [-1.5, -1.5] }) + hand(31, -64, 5.4, lw, 10);
  }
  return s;
}

// 물방울 도깨비 (반투명 젤리)
function dropGob(type, o = {}) {
  const lw = o.lw ?? 1.4;
  const col = { leaf: ['#9ab4ff', '#4f66e6', '#3a4bc0'], bow: ['#b2a2ff', '#6650dd', '#4c39b4'], shield: ['#8fd0ff', '#3f7fe0', '#2f5fba'] }[type];
  const fat = type === 'shield' ? 1.15 : 1;
  let s = '';
  // 바닥 그림자 + 빛 맺힘(투명한 몸 통과)
  s += `<ellipse cx="0" cy="-1" rx="${20 * fat}" ry="3.6" fill="${col[2]}" opacity=".35"/><ellipse cx="3" cy="-1.4" rx="${8 * fat}" ry="1.6" fill="#e0ecff" opacity=".7"/>`;
  // 뿔
  const horn = (x, rot) => part(smooth([[x - 3.4, -54], [x + 3.4, -54], [x + 1, -64, 1]]), { f: '#ffeab0', s: '#e3b866', lw: lw * 0.9, sh: [-1, -1] });
  const body = smooth([[1, -80, 1], [9 * fat, -64], [19 * fat, -46], [22 * fat, -26], [17 * fat, -8], [0, -3], [-17 * fat, -8], [-22 * fat, -26], [-19 * fat, -46], [-8 * fat, -64]]);
  if (type !== 'bow') s += g(horn(-11 * fat, 0), `rotate(-24,${-11 * fat},-54)`) + g(horn(11 * fat, 0), `rotate(24,${11 * fat},-54)`);
  else s += g(horn(-12, 0), 'rotate(-30,-12,-52)');
  // 뒤로 비치는 무기 손잡이 등
  const grad = lg([[0, col[0]], [1, col[1]]]);
  s += `<path d="${body}" fill="${INK}" stroke="${INK}" stroke-width="${lw * 1.9}" transform="translate(${lw * 0.35},${lw * 0.6})" stroke-linejoin="round"/><path d="${body}" fill="${INK}" stroke="${INK}" stroke-width="${lw}" stroke-linejoin="round"/>`;
  const c = clip(body);
  s += `<g clip-path="${c}">`;
  s += `<path d="${body}" fill="${o.bg || '#2a3456'}"/>`;
  s += `<path d="${body}" fill="${col[2]}" opacity=".88"/>`;
  s += `<path d="${body}" fill="${grad}" opacity=".9" transform="translate(-4,-3)"/>`;
  s += `<ellipse cx="${6 * fat}" cy="-14" rx="${12 * fat}" ry="7" fill="#dff0ff" opacity=".28"/>`;
  s += `<circle cx="${-9 * fat}" cy="-18" r="2.2" fill="none" stroke="#e6f2ff" stroke-width=".8" opacity=".7"/><circle cx="${-5 * fat}" cy="-12" r="1.3" fill="none" stroke="#e6f2ff" stroke-width=".7" opacity=".6"/>`;
  s += `<path d="${smooth([[-15 * fat, -46], [-6, -62], [-2, -70], [-8, -58], [-13 * fat, -42]])}" fill="#fff" opacity=".75"/>`;
  s += `<ellipse cx="${-14 * fat}" cy="-30" rx="2" ry="5" fill="#fff" opacity=".55" transform="rotate(12 ${-14 * fat} -30)"/>`;
  s += `</g>`;
  // 얼굴
  let f = '';
  const wEye = (x, y, lx) => `<ellipse cx="${x}" cy="${y}" rx="5.2" ry="6" fill="#fff" stroke="${INK}" stroke-width="${lw * 0.9}"/><ellipse cx="${x + lx}" cy="${y + 1}" rx="2.6" ry="3.4" fill="${INK}"/><circle cx="${x + lx - 0.9}" cy="${y - 0.4}" r="1" fill="#fff"/>`;
  if (type === 'leaf') {
    f += wEye(-7, -36, 1.2) + wEye(7, -36, 1.2);
    f += ts([[-12, -44], [-7, -43], [-3, -40.5]], 1.8, INK) + ts([[12, -44], [7, -43], [3, -40.5]], 1.8, INK);
    f += `<path d="M-7,-26Q0,-21 7,-26Z" fill="#2a1f45" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/><path d="M3,-25.4l1.4,2.6l1.2,-3Z" fill="#fff"/>`;
  } else if (type === 'bow') {
    f += wEye(-7, -36, 1.4);
    f += ts([[3, -36], [7, -37.6], [11, -36]], 2, INK);
    f += `<path d="M-6,-26Q0,-22.5 6,-26" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/><path d="M-3.4,-25.2l1.2,2.2l1,-2.6Z" fill="#fff"/>`;
  } else {
    f += wEye(-8, -38, 0.4) + wEye(8, -38, -0.4);
    f += ts([[-13, -44], [-8, -47], [-4, -47.6]], 1.6, INK) + ts([[13, -44], [8, -47], [4, -47.6]], 1.6, INK);
    f += `<ellipse cx="0" cy="-27" rx="3" ry="2.4" fill="#2a1f45" stroke="${INK}" stroke-width="1"/>`;
  }
  f += `<ellipse cx="-12" cy="-28" rx="3.6" ry="2" fill="#ffb3d0" opacity=".55"/><ellipse cx="12" cy="-28" rx="3.6" ry="2" fill="#ffb3d0" opacity=".55"/>`;
  s += f;
  // 젤리 팔 + 무기
  const nub = (x, y) => part(ell(x, y, 4.6, 4.2), { f: col[0], s: col[1], lw: lw * 0.9, sh: [-1, -1], hd: ell(x - 1.4, y - 1.4, 1.4, 1), ho: 0.8 });
  if (type === 'leaf') {
    let lf = part(smooth([[0, 0], [14, -6], [36, -5], [56, 0, 1], [36, 5], [14, 6]]), { ...C3.leaf, lw, sh: [0, -2], x: `<path d="M0,0L54,0" stroke="#2f7034" stroke-width="1"/>` + [10, 20, 30, 40].map((x) => `<path d="M${x},0l5,-3.6M${x},0l5,3.6" stroke="#2f7034" stroke-width=".6"/>`).join(''), hd: smooth([[6, -2], [20, -4.6], [40, -3], [20, -2.4]]), h: '#c8f0a0', ho: 0.6 });
    lf += part(rr(-8, -1.6, 9, 3.2, 1.4), { f: '#7a5a36', s: '#5a3f24', lw: lw * 0.8 });
    s += g(lf, `translate(-22,-22) rotate(-108)`);
    s += nub(-20, -22) + nub(20, -22);
  } else if (type === 'bow') {
    s += `<path d="M-30,-58L-30,-14" stroke="#e8f0ff" stroke-width=".9"/>`;
    s += part(taperD([[-29, -60], [-39, -48], [-41, -36], [-39, -24], [-29, -12]], 5, { a: 0.15, b: 0.15, min: 0.5 }), { f: '#9a6b44', s: '#6e4a2c', lw: lw * 0.9, sh: [1, -1], x: `<path d="M-41,-44l-4,-3M-40,-28l-4,2" stroke="#6e4a2c" stroke-width="1.4"/>` });
    s += `<path d="M-50,-37.4L-24,-36.6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M-50,-37.4L-24,-36.6" stroke="#3f8a4a" stroke-width="1.2" stroke-linecap="round"/><path d="M-50,-38.6L-24,-38.2" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M-50,-38.6L-24,-38.2" stroke="#4fae5a" stroke-width=".9" stroke-linecap="round"/>`;
    s += nub(-29, -37) + nub(18, -24);
    // 나뭇잎 모자
    s += g(part(smooth([[-12, 0], [0, -9], [12, 0], [0, 3]]), { ...C3.leaf, lw, sh: [-1.5, -1.5], x: `<path d="M-12,0L12,0" stroke="#2f7034" stroke-width=".8"/>` }), 'translate(6,-72) rotate(18)');
  } else {
    s += nub(-20, -26) + nub(20, -26);
    let L = '';
    L += part(ell(0, 0, 24, 22), {
      ...C3.leaf,
      lw: lw * 1.1,
      sh: [-4, -3],
      x:
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2 + 0.3;
          return `<path d="M0,0Q${12 * Math.cos(a + 0.12)},${11 * Math.sin(a + 0.12)} ${23 * Math.cos(a)},${21 * Math.sin(a)}" fill="none" stroke="#2f7034" stroke-width="1"/>`;
        }).join('') + `<path d="M0,0L24,-6L24,6Z" fill="${o.bg || '#2a3456'}"/>`,
      hd: 'M-18,-8C-14,-16 -6,-19 0,-19C-8,-15 -14,-10 -16,-4Z',
      h: '#c8f0a0',
      ho: 0.5,
    });
    L += part(ell(0, 0, 3.4, 3.4), { f: '#c8e88a', s: '#8ab84e', lw: lw * 0.8 });
    L += `<circle cx="-8" cy="8" r="2.2" fill="#e8f4ff" stroke="${INK}" stroke-width=".7"/><circle cx="-8.6" cy="7.4" r=".7" fill="#fff"/>`;
    s += g(L, `translate(-12,-30) rotate(-8)`);
  }
  return s;
}

function c3HeroCard() {
  let s = stdFilters();
  s += `<rect width="370" height="250" fill="${lg([[0, '#22305a'], [1, '#3b5280']])}"/>`;
  s += `<circle cx="300" cy="40" r="80" fill="#ffd28a" opacity=".12" filter="url(#blur8)"/>`;
  // 비 (평소: 사선 빗줄기)
  SEED = 11;
  for (let i = 0; i < 60; i++) {
    const x = rnd() * 400, y = rnd() * 250, l = 6 + rnd() * 10;
    s += `<path d="M${x},${y}l${-l * 0.25},${l}" stroke="#bcd6ff" stroke-width="${0.6 + rnd() * 0.6}" opacity="${0.25 + rnd() * 0.3}" stroke-linecap="round"/>`;
  }
  s += `<rect width="370" height="250" filter="url(#grain)" opacity=".4" style="mix-blend-mode:overlay"/>`;
  // 물웅덩이 + 파문
  [[92, 234, 62], [262, 234, 70]].forEach(([x, y, r]) => {
    s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="10" fill="#1a2546" opacity=".55"/>`;
    s += `<ellipse cx="${x + r * 0.5}" cy="${y + 2}" rx="${r * 0.3}" ry="3" fill="none" stroke="#9cc0ff" stroke-width=".8" opacity=".5"/>`;
  });
  s += g(dorong({ lw: 1.35 }), 'translate(92,232) scale(1.42)');
  s += g(dorong({ pose: 'aim', lw: 1.35 }), 'translate(262,232) scale(1.42)');
  return svgWrap(370, 250, s) + `<div class="chip" style="left:12px;top:12px">도롱 · 기본</div><div class="chip" style="left:196px;top:12px">겨눔</div>`;
}
function c3Enemy(type) {
  let s = stdFilters();
  s += `<rect width="118" height="146" fill="${lg([[0, '#22305a'], [1, '#34497a']])}"/>`;
  SEED = type.length * 13;
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 130, y = rnd() * 110, l = 5 + rnd() * 7;
    s += `<path d="M${x},${y}l${-l * 0.25},${l}" stroke="#bcd6ff" stroke-width=".7" opacity=".35" stroke-linecap="round"/>`;
  }
  s += g(dropGob(type, { lw: 1.4, bg: '#2c3c66' }), `translate(${type === 'bow' ? 66 : 60},104) scale(1.1)`);
  return svgWrap(118, 146, s);
}

function c3Scene() {
  let s = stdFilters();
  s += `<filter id="c3slow" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${slowMatrix(0.25, [0.84, 0.94, 1.1], [0, 0.02, 0.06])}"/></filter>`;
  const W = 238, H = 244;
  let w = '';
  w += `<rect width="${W}" height="${H}" fill="${lg([[0, '#1d2a50'], [0.45, '#33467a'], [0.46, '#2a3a66'], [1, '#22305a']])}"/>`;
  // 먼 기와지붕 + 등롱
  const roof = (x, y, ww) =>
    `<path d="M${x},${y + 30}V${y + 8}H${x + ww}V${y + 30}Z" fill="#202b4e" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M${x - 10},${y + 8}Q${x + ww / 2},${y + 2} ${x + ww + 10},${y + 8}Q${x + ww - 4},${y - 6} ${x + ww / 2},${y - 8}Q${x + 4},${y - 6} ${x - 10},${y + 8}Z" fill="#2b375f" stroke="${INK}" stroke-width="1.2"/>` +
    `<rect x="${x + ww / 2 - 6}" y="${y + 14}" width="12" height="10" fill="#ffcf7a" stroke="${INK}" stroke-width=".8"/><path d="M${x + ww / 2},${y + 14}v10M${x + ww / 2 - 6},${y + 19}h12" stroke="#a87a3a" stroke-width=".7"/>`;
  w += roof(20, 52, 60) + roof(140, 46, 70);
  [[100, 64], [218, 70]].forEach(([x, y]) => {
    w += `<circle cx="${x}" cy="${y}" r="16" fill="#ffc870" opacity=".3" filter="url(#blur4)"/><path d="M${x},${y - 20}V${y - 7}" stroke="${INK}" stroke-width="1"/>`;
    w += part(ell(x, y, 5.5, 7), { f: '#ffe1a0', s: '#f0b45a', lw: 1, sh: [-1.4, -1] });
  });
  // 젖은 돌바닥
  w += `<path d="M0,96H238V244H0Z" fill="${lg([[0, '#33456f'], [1, '#26365e']])}"/>`;
  for (let r = 0, y = 104; y < 250; r++, y += 9 + r * 3) {
    w += `<path d="M0,${y}H238" stroke="#24335a" stroke-width="${0.8 + r * 0.2}"/><path d="M0,${y + 1.2}H238" stroke="#4a5f92" stroke-width=".6" opacity=".6"/>`;
    for (let x = (r % 2) * 14 - 10; x < 250; x += 30 + r * 6) w += `<path d="M${x},${y}l${(x - 119) * 0.08},${9 + r * 3}" stroke="#24335a" stroke-width=".8"/>`;
  }
  // 물웅덩이: 등롱 반사 + 멈춘 파문
  [[60, 206, 34, 8], [186, 176, 28, 6], [150, 226, 22, 5]].forEach(([x, y, rx, ry]) => {
    w += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#3d5590"/><ellipse cx="${x - rx * 0.2}" cy="${y}" rx="${rx * 0.3}" ry="${ry * 0.4}" fill="#ffd48a" opacity=".35"/>`;
    w += `<ellipse cx="${x + 4}" cy="${y}" rx="${rx * 0.45}" ry="${ry * 0.45}" fill="none" stroke="#bcd6ff" stroke-width=".9" opacity=".8"/><ellipse cx="${x + 4}" cy="${y}" rx="${rx * 0.75}" ry="${ry * 0.75}" fill="none" stroke="#bcd6ff" stroke-width=".6" opacity=".5"/>`;
  });
  // 갈대
  [[6, 244], [14, 244], [228, 240], [220, 244]].forEach(([x, y], i) => (w += ts([[x, y], [x + (i % 2 ? 3 : -2), y - 30], [x + (i % 2 ? 8 : -6), y - 52]], 3, '#1a2a2a', { a: 0.05, b: 0.6 })));
  w += g(dropGob('leaf', { lw: 3, bg: '#33456f' }), 'translate(56,160) scale(.42)');
  w += g(dropGob('bow', { lw: 3.2, bg: '#33456f' }), 'translate(96,112) scale(.38)');
  s += `<g filter="url(#c3slow)">${w}</g>`;
  // 길 정의
  const P0 = [114, 178], dir = [0.68, -0.733];
  const at = (t) => [P0[0] + dir[0] * t, P0[1] + dir[1] * t];
  const T = [44, 80, 116].map(at), E = at(150);
  const segs = [[[112, 214], [113, 184]], [[113, 184], P0], [P0, E]];
  const distSeg = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  // 공중에 멈춘 빗방울 (뒤쪽 = 작고 흐림)
  SEED = 5;
  let rain = '', rainLit = '';
  for (let i = 0; i < 190; i++) {
    const p = [rnd() * W, rnd() * (H - 10)], z = rnd();
    const r = 0.9 + z * 1.6;
    const d = Math.min(...segs.map(([a, b]) => distSeg(p, a, b)));
    if (d < 6 + r) continue;
    if (Math.hypot(p[0] - 108, p[1] - 222) < 16) continue;
    const lit = d < 17;
    const fill = lit ? '#9ffcf2' : z > 0.55 ? '#cfe2ff' : '#9fbcf0';
    const trail = z > 0.5 ? `<path d="M${p[0] + r * 0.9},${p[1] - r * 0.2}C${p[0] + r},${p[1] + r} ${p[0] - r * 0.4},${p[1] + r * 1.1} ${p[0] - r * 0.7},${p[1] + r * 0.6}" fill="none" stroke="${lit ? '#2aa69e' : '#5f7fc0'}" stroke-width="${r * 0.45}" opacity=".9"/>` : '';
    const str = `<path d="M${p[0]},${p[1] - r * 1.9}C${p[0] + r * 0.9},${p[1] - r * 0.4} ${p[0] + r},${p[1] + r} ${p[0]},${p[1] + r}C${p[0] - r},${p[1] + r} ${p[0] - r * 0.9},${p[1] - r * 0.4} ${p[0]},${p[1] - r * 1.9}Z" fill="${fill}" opacity="${lit ? 0.95 : 0.35 + z * 0.5}" ${z > 0.7 ? `stroke="#0f1830" stroke-width=".5"` : ''}/>` + trail + (z > 0.4 ? `<circle cx="${p[0] - r * 0.3}" cy="${p[1] - r * 0.1}" r="${r * 0.3}" fill="#fff" opacity=".9"/>` : '');
    if (lit) rainLit += str;
    else rain += str;
  }
  s += rain;
  // 웅덩이 위에 멈춘 물 왕관
  {
    const x = 186, y = 176;
    let cr = `M${x - 13},${y}`;
    for (let i = 0; i <= 6; i++) cr += `L${x - 13 + i * 4.33},${y - (i % 2 ? 10 + (i % 3) * 2 : 4)}`;
    cr += `L${x + 13},${y}Z`;
    s += `<path d="${cr}" fill="#bcd6ff" opacity=".45" stroke="#e6f0ff" stroke-width=".8" stroke-linejoin="round"/>`;
    [[-9, -17, 1.4], [-1, -21, 1.8], [7, -18, 1.3], [12, -13, 1]].forEach(([dx, dy, r]) => (s += `<circle cx="${x + dx}" cy="${y + dy}" r="${r}" fill="#e6f0ff"/><circle cx="${x + dx - r * 0.3}" cy="${y + dy - r * 0.3}" r="${r * 0.35}" fill="#fff"/>`));
  }
  // 앞쪽 큰 물방울 (가장 가까이 매달린 것)
  [[18, 30, 4.2], [224, 120, 3.6], [30, 120, 3.2], [206, 214, 4.4], [150, 24, 3]].forEach(([x, y, r]) => {
    s += `<path d="M${x},${y - r * 1.9}C${x + r * 0.9},${y - r * 0.4} ${x + r},${y + r} ${x},${y + r}C${x - r},${y + r} ${x - r * 0.9},${y - r * 0.4} ${x},${y - r * 1.9}Z" fill="${rg([[0, '#ffffff', 0.15], [0.7, '#9fc4ff', 0.35], [1, '#e6f0ff', 0.9]], 0.5, 0.6, 0.6)}" stroke="#e6f0ff" stroke-width=".7"/>`;
    s += `<ellipse cx="${x - r * 0.35}" cy="${y - r * 0.2}" rx="${r * 0.28}" ry="${r * 0.4}" fill="#fff"/><ellipse cx="${x + r * 0.3}" cy="${y + r * 0.55}" rx="${r * 0.35}" ry="${r * 0.15}" fill="#ffd48a" opacity=".8"/>`;
  });
  s += `<path d="M30,150A26,26 0 0 0 82,150Z" fill="#ff3b4a" opacity=".16"/><path d="M30,150A26,26 0 0 0 82,150" fill="none" stroke="#ff4a55" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  T.forEach((p) => (s += `<ellipse cx="${p[0]}" cy="${p[1] + 15}" rx="12" ry="3.4" fill="none" stroke="#5ff0e2" stroke-width="1.1" opacity=".8"/>`));
  s += `<path d="M112,214L113,${P0[1] + 6}Q${P0[0]},${P0[1]} ${P0[0] + 4},${P0[1] - 5}L${E[0]},${E[1]}" fill="none" stroke="#5ff0e2" stroke-width="10" opacity=".22" filter="url(#blur2)" stroke-linecap="round"/>`;
  [['leaf', T[0]], ['shield', T[1]], ['bow', T[2]]].forEach(([k, p]) => (s += g(dropGob(k, { lw: 3, bg: '#33456f' }), `translate(${p[0] - 1},${p[1] + 15}) scale(.42)`)));
  s += `<path d="M112,214L113,${P0[1] + 6}Q${P0[0]},${P0[1]} ${P0[0] + 4},${P0[1] - 5}L${E[0]},${E[1]}" fill="none" stroke="#5ff0e2" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M112,214L113,${P0[1] + 6}Q${P0[0]},${P0[1]} ${P0[0] + 4},${P0[1] - 5}L${E[0]},${E[1]}" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<circle cx="${E[0]}" cy="${E[1]}" r="3.4" fill="#fff" stroke="#5ff0e2" stroke-width="1.4"/>`;
  s += `<g filter="url(#blur2)" opacity=".5">${rainLit}</g>` + rainLit;
  s += `<ellipse cx="110" cy="238" rx="18" ry="3.8" fill="#121a33" opacity=".5"/>`;
  s += g(dorong({ pose: 'aim', lw: 3.2 }), 'translate(106,238) scale(.4)');
  s += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".3" style="mix-blend-mode:overlay"/>`;
  return svgWrap(W, H, s);
}
function c3Cut() {
  let s = stdFilters();
  const W = 126, H = 244;
  s += `<rect width="${W}" height="${H}" fill="${lg([[0, '#22305a'], [1, '#3a5080']])}"/>`;
  SEED = 3;
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 150, y = rnd() * 200, l = 6 + rnd() * 9;
    s += `<path d="M${x},${y}l${-l * 0.25},${l}" stroke="#bcd6ff" stroke-width=".8" opacity=".35" stroke-linecap="round"/>`;
  }
  s += `<path d="M0,196H126V244H0Z" fill="#2c3d68"/><path d="M0,196H126" stroke="${INK}" stroke-width="1"/>`;
  s += `<ellipse cx="62" cy="206" rx="40" ry="7" fill="#3d5590"/><ellipse cx="62" cy="206" rx="26" ry="4.4" fill="none" stroke="#bcd6ff" stroke-width="1" opacity=".8"/><ellipse cx="62" cy="206" rx="36" ry="6.2" fill="none" stroke="#bcd6ff" stroke-width=".7" opacity=".5"/>`;
  // 퐁: 물 왕관 + 흩어지는 물방울
  const cx = 62, cy = 150;
  let crown = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r = i % 2 ? 15 : 27 + (i % 4) * 3;
    crown.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]);
  }
  s += `<path d="${smooth(crown)}" fill="#8fb0ff" opacity=".35"/>`;
  s += `<path d="${smooth(crown)}" fill="none" stroke="#dfeaff" stroke-width="1.4" opacity=".7"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="10" fill="#fff" opacity=".35" filter="url(#blur2)"/>`;
  SEED = 9;
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.2, d = 30 + rnd() * 16, r = 2.6 + rnd() * 2.6;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.95;
    const ang = (a * 180) / Math.PI + 90;
    s += g(part(`M0,${-r * 2}C${r * 0.9},${-r * 0.5} ${r},${r} 0,${r}C${-r},${r} ${-r * 0.9},${-r * 0.5} 0,${-r * 2}Z`, { f: '#9ab4ff', s: '#4f66e6', lw: 1, sh: [-r * 0.4, -r * 0.4], hd: ell(-r * 0.3, -r * 0.1, r * 0.32, r * 0.32), ho: 0.95 }), `translate(${x},${y}) rotate(${ang + 180})`);
    s += `<path d="M${cx + Math.cos(a) * (d - 9)},${cy + Math.sin(a) * (d - 9)}L${cx + Math.cos(a) * (d - 15)},${cy + Math.sin(a) * (d - 15)}" stroke="#dfeaff" stroke-width=".9" stroke-linecap="round" opacity=".6"/>`;
  }
  [[54, 146], [70, 146]].forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="5.4" fill="#fff" stroke="${INK}" stroke-width="1.2"/><path d="M${x},${y}m-0.6,0a0.6,0.6 0 1 1 1.2,0a1.8,1.8 0 1 1 -3.6,0a3,3 0 1 1 6,0" fill="none" stroke="${INK}" stroke-width="1"/>`));
  // 날아가는 뿔 둘 + 떨어지는 갈댓잎
  const horn = (x, y, r) => g(part(smooth([[-3.4, 4], [3.4, 4], [1, -7, 1]]), { f: '#ffeab0', s: '#e3b866', lw: 1.1, sh: [-1, -1] }), `translate(${x},${y}) rotate(${r})`);
  s += horn(34, 92, -40) + horn(96, 96, 35);
  let lf = part(smooth([[0, 0], [14, -6], [36, -5], [56, 0, 1], [36, 5], [14, 6]]), { ...C3.leaf, lw: 1.3, sh: [0, -2], x: `<path d="M0,0L54,0" stroke="#2f7034" stroke-width="1"/>` });
  s += g(lf, 'translate(70,186) rotate(-160) scale(.8)');
  s += slash([[4, 186], [62, 150], [124, 112]], 2.4, '#fff');
  s += `<text x="14" y="62" font-size="22" font-weight="bold" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke" font-family="WenQuanYi Zen Hei">퐁!</text>`;
  return svgWrap(W, H, s);
}
function c3Sil() {
  let s = stdFilters();
  const items = [[dorong({ lw: 2 }), 0.23], [dorong({ pose: 'aim', lw: 2 }), 0.23], [dropGob('leaf'), 0.3], [dropGob('bow'), 0.3], [dropGob('shield'), 0.3]];
  items.forEach(([a, k], i) => (s += g(g(a, `translate(${36 + i * 46},33) scale(${k})`), '', 'filter="url(#sil2)" opacity=".85"')));
  return svgWrap(260, 34, s);
}
render3();
function render3() {
  sheet({
    sil: c3Sil(),
    bg: '#16203d',
    bgGrad: 'linear-gradient(#1a2648,#121a33)',
    fg: '#eaf2ff',
    accent: '#5ff0e2',
    card: '#26345e',
    line: 'rgba(255,255,255,.08)',
    chipBg: 'rgba(10,16,36,.7)',
    chipFg: '#dff',
    capBg: 'rgba(8,12,30,.85)',
    proBg: '#1f8f88',
    proFg: '#fff',
    conBg: '#4a5a80',
    conFg: '#fff',
    kicker: 'CAST ③',
    title: '빗속의 개구리 검객',
    titleSmall: '도롱 vs 물방울 도깨비',
    sub: '삿갓 쓴 청개구리 — 누르면 빗방울이 공중에 멈춘다',
    hero: c3HeroCard(),
    enemies: [
      { svg: c3Enemy('leaf'), name: '잎칼 도깨비', note: '갈댓잎 휘두름' },
      { svg: c3Enemy('bow'), name: '솔잎활 도깨비', note: '솔잎 화살 조준' },
      { svg: c3Enemy('shield'), name: '연잎 도깨비', note: '연잎 우산 막기' },
    ],
    scene: c3Scene(),
    sceneCap: '느린 시간 — 빗방울이 멈춰 매달린다',
    cut: c3Cut(),
    cutCap: '퐁! 물방울로 흩어짐',
    pro: '멈춘 빗방울 = 느린 시간. 한눈에 "와" 하는 장면',
    con: '빗방울·투명 젤리는 그리기 비쌈 — 휴대폰 성능 관리 필요',
  });
}
