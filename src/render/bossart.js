// 고개마다의 두목과 소품 그림: 구미호의 꼬리, 구렁이·이무기, 역신, 염라대왕의 면류관, 종·여의주·업경대
// (인형 좌표: 발밑이 y = 0, 머리가 y ≈ -45. 다른 인형 그림과 같은 종이 오림 방식)
import { TAU, INK, RED, OCHRE, ell, rr, line, path, poly } from './draw.js';
import { part, curve, rope, E, R, P, dk, lt, fox, HATS, WHITE, BLACK, WOOD, WOODD } from './figures.js';

const BRASS = '#c9962e', BRONZE = '#6f8a78', BRONZED = '#4f6a5c';

// ── 구미호: 여우 몸에 꼬리 n 개 (끝이 붉다). 꼬리 수마다 그림을 따로 굽는다 ──
export function gumiho(g, o = {}) {
  const n = o.tails === undefined ? 9 : o.tails, fur = '#e0b060';   // 누런 털의 여우 (흰 여우에 붉은 무늬는 쓰지 않는다)
  // 꼬리는 두세 다발로 묶여 한쪽(왼쪽 위)으로 휘어 흐른다 (공작 꼬리처럼 고르게 펼치지 않는다)
  const nb = Math.min(3, n), base = [-1.05, -0.62, -0.22];
  for (let i = n - 1; i >= 0; i--) {
    const b = Math.min(nb - 1, Math.floor(i * nb / n)), inB = [...Array(n).keys()].filter(k => Math.min(nb - 1, Math.floor(k * nb / n)) === b), j = inB.indexOf(i);
    const a = base[b + (3 - nb)] + (j - (inB.length - 1) / 2) * 0.11, far = b === 0 && nb === 3, len = 40 - b * 2 + j * 1.6;
    g.save(); g.translate(0, -9); g.rotate(a);
    part(g, p => { p.moveTo(-3, 0); p.bezierCurveTo(-10, -14, -14, -len * 0.75, -8, -len); p.bezierCurveTo(0, -len * 0.75, 8, -14, 3, 0); p.closePath(); }, far ? dk(fur, 0.1) : j % 2 ? fur : dk(fur, 0.04), P(-1, -len - 2, 11, -len - 2, 11, 1, 1.6, 1), { k: 0.1, lw: 1.1 });
    part(g, p => { p.moveTo(-11.4, -len * 0.7); p.quadraticCurveTo(-11, -len * 0.86, -8, -len); p.quadraticCurveTo(-3.4, -len * 0.84, -2.6, -len * 0.7); p.quadraticCurveTo(-7, -len * 0.75, -11.4, -len * 0.7); p.closePath(); }, '#fbf7ec', null, { lw: 0.8 });
    g.restore();
  }
  fox(g, Object.assign({ noTail: true, fur, tip: '#fbf7ec' }, o));
  // 이마의 붉은 점과 목의 구슬 (여우 구슬)
  ell(g, 0, -18.2, 2.3, 2.3, '#8fd3e8', INK, 0.8); ell(g, -0.7, -18.9, 0.8, 0.8, '#eef9ff');
}

// ── 구렁이 / 이무기: 똬리 튼 몸 위로 목을 세웠다. imugi 는 뿔과 수염, 등지느러미가 돋았다 ──
export function serpent(g, o = {}) {
  const C = o.imugi ? '#3f6f8a' : '#7d6a3a', B = o.imugi ? '#cfe3e6' : '#dcc98a', S = o.imugi ? '#27485c' : '#3a2e1a';
  const ring = (x, y, rx, ry) => {
    part(g, E(x, y, rx, ry), C, E(x + rx * 0.3, y + ry * 0.5, rx, ry), { k: 0.24, lw: 1.3 });
    part(g, p => { p.ellipse(x, y + ry * 0.42, rx * 0.82, ry * 0.46, 0, 0, Math.PI); }, B, null, { lw: 0.8 });
    for (let i = -2; i <= 2; i++) poly(g, [x + i * rx * 0.34, y - ry * 0.72, x + i * rx * 0.34 + rx * 0.1, y - ry * 0.3, x + i * rx * 0.34, y + ry * 0.06, x + i * rx * 0.34 - rx * 0.1, y - ry * 0.3], S);
  };
  // 꼬리 끝
  rope(g, p => { p.moveTo(17, -4); p.quadraticCurveTo(29, -6, 27, -17); }, C, 3.4);
  if (o.imugi) { const loop = p => { p.moveTo(-14, -14); p.bezierCurveTo(-34, -30, -30, -58, -13, -58); p.bezierCurveTo(-4, -58, -2, -46, -6, -36); }; curve(g, loop, INK, 11.6); curve(g, loop, dk(C, 0.12), 9); for (const [x, y, a2] of [[-27, -36, -1.3], [-26, -47, -0.9], [-19, -57, -0.3]]) { g.save(); g.translate(x, y); g.rotate(a2); poly(g, [-2.2, 0, 0, -6, 2.2, 0], '#8fd3e8', INK, 0.9); g.restore(); } }
  ring(0, -6.5, 21, 8.6); ring(-1, -17, 16.6, 7.4); ring(1, -26.4, 12, 6);
  // 세운 목
  const neck = p => { p.moveTo(3, -29); p.bezierCurveTo(13, -38, 9, -50, -3, -52); };
  curve(g, neck, INK, 12.6); curve(g, neck, C, 10); curve(g, p => { p.moveTo(5.4, -31); p.bezierCurveTo(13.6, -39, 10.6, -47.6, 1, -50.6); }, B, 3.4);
  if (o.imugi) for (const [x, y, a] of [[10.6, -36.6, 0.9], [11, -43.6, 0.3], [6.6, -50.4, -0.5]]) { g.save(); g.translate(x, y); g.rotate(a); poly(g, [-2.4, 0, 0, -6.4, 2.4, 0], '#8fd3e8', INK, 0.9); g.restore(); }
  // 머리
  part(g, p => { p.moveTo(2.6, -47.4); p.quadraticCurveTo(1.6, -58.6, -8.6, -59); p.quadraticCurveTo(-19, -58.6, -21.6, -52.4); p.quadraticCurveTo(-19.6, -47, -9, -46.4); p.quadraticCurveTo(-2, -45.6, 2.6, -47.4); p.closePath(); }, C, P(-22, -51.6, 3, -51.6, 3, -45, -22, -45), { k: 0.22, lw: 1.3 });
  part(g, p => { p.moveTo(-20.6, -51); p.quadraticCurveTo(-12, -49.4, -3, -49.6); p.quadraticCurveTo(-10, -45.8, -19.6, -47.6); p.closePath(); }, B, null, { lw: 0.8 });
  if (o.blink) curve(g, p => { p.moveTo(-13.4, -54.4); p.lineTo(-8.6, -53.6); }, INK, 1.5);
  else { part(g, p => { p.moveTo(-14.4, -54.6); p.quadraticCurveTo(-11, -57.6, -7.6, -54); p.quadraticCurveTo(-11, -52.6, -14.4, -54.6); p.closePath(); }, '#f6c84a', null, { lw: 0.9 }); ell(g, -11, -54.6, 0.75, 1.5, INK); }
  line(g, [-15.4, -56.6, -7, -55.6], S, 1.5); ell(g, -19.4, -53.6, 0.7, 0.5, INK);
  // 갈라진 혀
  curve(g, p => { p.moveTo(-21, -50.4); p.lineTo(-26.4, -49.4); p.lineTo(-29.6, -51.6); }, RED, 1.2); curve(g, p => { p.moveTo(-26.4, -49.4); p.lineTo(-29.6, -47.6); }, RED, 1.2);
}

// ── 역신: 마마를 몰고 다니는 손님 (호구별성) ──
// 쪽빛 단령에 사모를 쓴 창백한 손님. 소매 속에 두 손을 모아 공손한 척하지만, 얼굴에 붉은 마마 자국이 돋고
// 둘레에는 붉은 반점이 떠다닌다 (가시 왕관·초록 눈·단추 망토는 서양 괴물처럼 보여 쓰지 않는다)
export function plagueSpirit(g, o = {}) {
  const C = '#3e4a78', D = '#28304f', L2 = '#5a6aa0', F = '#e8e4cc', POX = '#c0473a';
  // 마마 기운: 발치의 붉은 아지랑이와 둘레를 떠도는 붉은 반점
  { const gr = g.createRadialGradient(0, -6, 2, 0, -6, 22); gr.addColorStop(0, 'rgba(214,96,80,0.32)'); gr.addColorStop(1, 'rgba(214,96,80,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, -4, 24, 9, 0, 0, TAU); g.fill(); }
  for (const [x, y, r] of [[-20, -30, 1.6], [-23, -16, 1.2], [21, -36, 1.4], [24, -20, 1.8], [-17, -44, 1], [18, -48, 1.1], [-25, -6, 1.3], [22, -6, 1]]) { ell(g, x, y, r + 1, r + 1, 'rgba(214,96,80,0.25)'); ell(g, x, y, r, r, POX, '#6a1f1a', 0.4); ell(g, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.3, '#f0b0a0'); }
  // 단령 아랫자락: 옆이 트여 밝은 속옷이 비치고, 아래로 넓게 퍼진다 (발은 보이지 않고 떠 있다)
  const robe = p => { p.moveTo(-9.8, -30); p.quadraticCurveTo(-13.4, -16, -15.4, -1.6); p.quadraticCurveTo(-8, 1.4, 0, 0.6); p.quadraticCurveTo(8, 1.4, 15.4, -1.6); p.quadraticCurveTo(13.4, -16, 9.8, -30); p.closePath(); };
  part(g, robe, C, P(3, -31, 17, -31, 17, 2, 6, 2), { k: 0.26, hi: P(-9.4, -28, -7.6, -28, -12.4, -2, -14.4, -2), hic: L2, lw: 1.3 });
  for (const s2 of [-1, 1]) { path(g, P(s2 * 12.6, -10, s2 * 14.6, -1.8, s2 * 11, -0.6), '#c9cfe0', INK, 0.7); line(g, [s2 * 12.4, -10.4, s2 * 13.4, -1.4], D, 0.8); }   // 옆트임 사이로 비치는 속옷
  for (const [x0, x1] of [[-5, -7.6], [-1.4, -1.8], [3, 4.4], [6.8, 9.6]]) curve(g, q => { q.moveTo(x0, -16); q.quadraticCurveTo((x0 + x1) / 2 + 0.6, -8, x1, 0); }, D, 0.9);   // 자락 주름
  // 몸통과 둥근 깃 (단령)
  const torso = p => { p.moveTo(-10, -40); p.quadraticCurveTo(-11.6, -33, -10.4, -26); p.lineTo(10.4, -26); p.quadraticCurveTo(11.6, -33, 10, -40); p.quadraticCurveTo(0, -42.4, -10, -40); p.closePath(); };
  part(g, torso, C, P(3, -43, 13, -43, 13, -25, 5, -25), { k: 0.26, hi: E(-6, -36, 2.4, 3.6), hic: L2, lw: 1.2 });
  part(g, p => { p.moveTo(-5.6, -40.8); p.quadraticCurveTo(0, -35.6, 5.6, -40.8); p.quadraticCurveTo(0, -38, -5.6, -40.8); p.closePath(); }, '#f3ecdd', null, { lw: 0.8 });
  curve(g, p => { p.moveTo(-6.8, -40.6); p.quadraticCurveTo(0, -33.6, 6.8, -40.6); }, D, 1.6);
  // 흉배: 쪽빛 바탕에 흰 학 한 마리와 구름 (금실 테)
  rr(g, -5.4, -36.4, 10.8, 8.8, 0.8, '#d9a441', INK, 0.8); rr(g, -4.4, -35.4, 8.8, 6.8, 0.5, '#22385c');
  path(g, p => { p.moveTo(-3.4, -31.4); p.quadraticCurveTo(-1.4, -34, 0.6, -32.2); p.quadraticCurveTo(2.4, -34.6, 3.6, -32.6); p.quadraticCurveTo(1.6, -31.6, 0.4, -30.6); p.quadraticCurveTo(-1.6, -31, -3.4, -31.4); p.closePath(); }, '#fbf7ec', null, 0);
  ell(g, 2.8, -33.6, 0.45, 0.45, POX); curve(g, p => { p.moveTo(-3, -29.6); p.quadraticCurveTo(-2, -30.6, -1, -29.6); p.quadraticCurveTo(0, -28.8, 1.2, -29.8); }, '#9ab0d0', 0.5);
  // 각대: 검은 띠에 금빛 장식
  part(g, p => { p.moveTo(-11, -27.6); p.quadraticCurveTo(0, -24.6, 11, -27.6); p.lineTo(11.4, -24.8); p.quadraticCurveTo(0, -21.6, -11.4, -24.8); p.closePath(); }, '#2b2a30', null, { lw: 0.8 }); for (const x of [-7, -2.4, 2.4, 7]) { ell(g, x, -24.8 + Math.abs(x) * 0.06, 1.2, 1, '#d9a441', INK, 0.4); ell(g, x - 0.3, -25.1 + Math.abs(x) * 0.06, 0.35, 0.3, '#fff6d0'); }
  // 넓은 소매: 어깨에서 내려와 배 앞에서 모아 두 손을 감췄다 (공손한 척 손을 모은 자세)
  for (const s2 of [-1, 1]) { const sl = p => { p.moveTo(s2 * 9.6, -39.6); p.quadraticCurveTo(s2 * 17.6, -37, s2 * 17.4, -26); p.quadraticCurveTo(s2 * 17.6, -14.6, s2 * 13, -11.6); p.quadraticCurveTo(s2 * 6, -9.6, s2 * 0.4, -12.8); p.lineTo(s2 * 0.4, -18.4); p.quadraticCurveTo(s2 * 7.6, -20.6, s2 * 9.6, -26); p.closePath(); };
    part(g, sl, C, s2 > 0 ? P(12, -40, 20, -40, 20, -10, 10, -10) : null, { k: 0.3, hi: s2 < 0 ? P(-10, -38.6, -12, -38, -16.4, -26, -15, -24.6) : null, hic: L2, lw: 1.2 });
    curve(g, p => { p.moveTo(s2 * 12.4, -33.6); p.quadraticCurveTo(s2 * 14.6, -27, s2 * 13, -20); }, D, 0.9); }
  part(g, p => { p.moveTo(-4.6, -18.2); p.quadraticCurveTo(0, -20.4, 4.6, -18.2); p.lineTo(4.6, -13); p.quadraticCurveTo(0, -11, -4.6, -13); p.closePath(); }, '#1c2238', null, { lw: 0.9 });   // 모은 소매 속의 어둠
  // 얼굴: 창백한 탈 같은 얼굴에 얽은 마마 자국, 가늘게 뜬 금빛 눈, 엷은 웃음과 가는 수염
  const face = p => { p.moveTo(-8.6, -50); p.quadraticCurveTo(-9.4, -60.6, 0, -60.8); p.quadraticCurveTo(9.4, -60.6, 8.6, -50); p.quadraticCurveTo(7, -41.4, 0, -40.6); p.quadraticCurveTo(-7, -41.4, -8.6, -50); p.closePath(); };
  part(g, face, F, P(3.4, -62, 11, -62, 11, -40, 0.6, -40, 5.6, -47), { k: 0.16, hi: E(-3.6, -56.4, 2.6, 1.6), hic: '#fbf8ea', lw: 1.3 });
  g.save(); g.beginPath(); face(g); g.clip(); for (const s2 of [-1, 1]) { const gr = g.createLinearGradient(s2 * 8.6, -47, s2 * 4.2, -47); gr.addColorStop(0, 'rgba(80,100,80,0.28)'); gr.addColorStop(1, 'rgba(80,100,80,0)'); g.fillStyle = gr; g.fillRect(-10, -56, 20, 16); }
  for (const [x, y, r] of [[-5.6, -45.6, 1], [-3.2, -43, 0.8], [5.4, -44.6, 1.1], [6.6, -49, 0.7], [-7, -50.6, 0.8], [2.4, -57.4, 0.8], [-4, -57, 0.9], [0.6, -47.4, 0.6], [4, -41.8, 0.7], [-1.6, -53.6, 0.5]]) { ell(g, x, y, r + 0.4, r + 0.4, 'rgba(192,71,58,0.35)'); ell(g, x, y, r, r, POX); ell(g, x - r * 0.35, y - r * 0.35, r * 0.32, r * 0.32, '#f2c2b4'); }
  g.restore();
  for (const s2 of [-1, 1]) { if (o.blink) curve(g, p => { p.moveTo(s2 * 1.8, -51.2); p.quadraticCurveTo(s2 * 4.6, -50, s2 * 7, -51.8); }, INK, 1.3);
    else { part(g, p => { p.moveTo(s2 * 1.6, -51); p.quadraticCurveTo(s2 * 4.6, -54, s2 * 7.4, -52.2); p.quadraticCurveTo(s2 * 4.6, -50.2, s2 * 1.6, -51); p.closePath(); }, '#2a2a22', null, { lw: 0.8 }); ell(g, s2 * 4.6, -51.9, 1, 0.9, '#e0a040'); ell(g, s2 * 4.4, -52.1, 0.3, 0.3, '#fff6d0'); }
    path(g, p => { p.moveTo(s2 * 1.4, -54.6); p.quadraticCurveTo(s2 * 4.6, -56.2, s2 * 7.6, -55.4); p.quadraticCurveTo(s2 * 4.6, -55.4, s2 * 1.4, -53.8); p.closePath(); }, '#2b2a30');   // 가늘게 치뜬 눈썹
    curve(g, p => { p.moveTo(s2 * 0.6, -44.4); p.quadraticCurveTo(s2 * 3.6, -44.8, s2 * 5.4, -42.6); }, '#3a3a30', 0.7); }   // 가는 팔자 수염
  curve(g, p => { p.moveTo(0.6, -51.4); p.quadraticCurveTo(1.6, -48.6, 0.6, -47.4); p.quadraticCurveTo(-0.2, -47, -0.8, -47.4); }, '#9a8a70', 0.8);
  curve(g, p => { p.moveTo(-3.4, -43.6); p.quadraticCurveTo(0, -42, 3.4, -43.6); }, '#6a2a2a', 1);   // 엷은 웃음
  // 사모: 둥근 검은 모정에 양옆으로 뻗은 날개 (말총 결이 비친다)
  for (const s2 of [-1, 1]) { const wg = p => { p.moveTo(s2 * 6, -65.4); p.quadraticCurveTo(s2 * 14, -69.6, s2 * 21.6, -68.6); p.quadraticCurveTo(s2 * 23.6, -65.2, s2 * 21.6, -63.2); p.quadraticCurveTo(s2 * 14, -63.4, s2 * 6, -62.4); p.closePath(); };
    part(g, wg, '#24232a', null, { hi: p => { p.moveTo(s2 * 8, -65.6); p.quadraticCurveTo(s2 * 14, -68.4, s2 * 20.6, -67.8); p.lineTo(s2 * 20.4, -67); p.quadraticCurveTo(s2 * 14, -67.4, s2 * 8, -64.8); p.closePath(); }, hic: '#5a5866', lw: 0.9 });
    g.save(); g.beginPath(); wg(g); g.clip(); g.strokeStyle = 'rgba(140,138,160,0.35)'; g.lineWidth = 0.3; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(s2 * (7 + k * 2), -70); g.lineTo(s2 * (7 + k * 2), -62); g.stroke(); } g.restore(); }
  part(g, p => { p.moveTo(-9.2, -57.6); p.lineTo(-8.8, -62.2); p.quadraticCurveTo(0, -64.8, 8.8, -62.2); p.lineTo(9.2, -57.6); p.quadraticCurveTo(0, -59.6, -9.2, -57.6); p.closePath(); }, '#24232a', R(2, -65, 8, 8), { hi: R(-7.6, -61.6, 3, 1), hic: '#4a4858', lw: 1 });
  part(g, p => { p.moveTo(-6.4, -62.4); p.quadraticCurveTo(-6.6, -70, 0, -70.4); p.quadraticCurveTo(6.6, -70, 6.4, -62.4); p.closePath(); }, '#2e2d36', R(1.6, -71, 6, 9), { hi: E(-2.6, -67.4, 1.6, 1.2), hic: '#5a5866', lw: 1 });
}

// ── 염라대왕의 면류관: 검은 평천판에 구슬 줄을 늘어뜨렸다 (인형의 모자로 쓴다) ──
HATS.myeonryu = g => {
  part(g, R(-7.4, -57, 14.8, 7.6), '#24232a', R(1.6, -57, 6, 7.6), { lw: 1.1 }); rr(g, -7.8, -51.4, 15.6, 2.6, 1, BRASS, INK, 0.8);
  g.save(); g.translate(0, -58.6); g.rotate(-0.06);
  part(g, R(-17.6, -2.6, 35.2, 4.2), '#1f1e25', R(-17.6, -0.2, 35.2, 2), { lw: 1.2 }); rr(g, -17.6, -2.6, 35.2, 1.2, 0.5, BRASS);
  // 관 위에 얹은 경책 (시왕도의 염라대왕)
  part(g, R(-7, -8.6, 14, 6), '#f3ecdd', R(0, -8.6, 7, 6), { k: 0.14, lw: 1 }); rr(g, -7, -8.6, 2.6, 6, 0.5, '#2f4d7e', INK, 0.6); for (const y of [-6.6, -4.6]) line(g, [-2.6, y, 5, y], '#8a8474', 0.6);
  for (const x of [-15, -11, -7, 7, 11, 15]) { line(g, [x, 1.6, x, 11], '#3a3640', 0.6); for (let k = 0; k < 3; k++) ell(g, x, 4 + k * 3, 1.05, 1.05, [RED, '#f6efdc', '#3f8a6a'][k], INK, 0.4); }
  g.restore();
  for (const s of [-1, 1]) curve(g, p => { p.moveTo(s * 9.4, -50); p.quadraticCurveTo(s * 11.4, -45, s * 10.6, -39); }, '#3a3640', 0.7);   // 관끈: 얼굴 밖(귀 옆)으로 가는 검은 끈 (얼굴을 가로지르는 붉은 줄은 상처처럼 보인다)
};

// ── 소품 ──
// 종: 나무 틀에 건 범종과 당목
export function bell(g) {
  for (const x of [-21, 21]) { part(g, R(x - 2.6, -62, 5.2, 62), WOODD, R(x + 0.4, -62, 2.2, 62), { lw: 1.2 }); part(g, R(x - 5, -3, 10, 4), dk(WOODD, 0.2), null, { lw: 1 }); }
  part(g, R(-26, -66, 52, 5.6), WOOD, R(-26, -63, 52, 2.6), { lw: 1.2 }); part(g, P(-29, -66, 0, -75, 29, -66), '#3a3640', P(0, -75, 29, -66, 0, -66), { lw: 1.2 });
  line(g, [0, -60.6, 0, -55], INK, 2.2); ell(g, 0, -55.6, 3, 2.2, BRONZED, INK, 1);
  part(g, p => { p.moveTo(-9.6, -53); p.quadraticCurveTo(-14.6, -36, -15.6, -17); p.lineTo(15.6, -17); p.quadraticCurveTo(14.6, -36, 9.6, -53); p.quadraticCurveTo(0, -56.6, -9.6, -53); p.closePath(); }, BRONZE, P(3, -57, 17, -57, 17, -16, 5, -16), { k: 0.24, hi: P(-11.6, -48, -9.6, -48, -12, -20, -14, -20), hk: 0.3, lw: 1.4 });
  rr(g, -16.6, -19.6, 33.2, 4, 1.4, BRONZED, INK, 1); for (const y of [-47, -43.6]) curve(g, p => { p.moveTo(-10.6, y); p.quadraticCurveTo(0, y + 2.6, 10.6, y); }, BRONZED, 1);
  ell(g, 0, -31, 4.6, 4.6, lt(BRONZE, 0.3), INK, 1); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(g, [Math.cos(a) * 1.6, -31 + Math.sin(a) * 1.6, Math.cos(a) * 4, -31 + Math.sin(a) * 4], BRONZED, 0.7); }
  // 당목 (종을 치는 통나무)
  line(g, [-21, -62, -27, -34], '#d9c39a', 1); line(g, [-21, -62, -33, -34], '#d9c39a', 1); part(g, R(-38, -36.6, 20, 6), WOOD, R(-38, -33.6, 20, 3), { lw: 1.1 }); rr(g, -19.6, -37.2, 2.6, 7.2, 1, BRASS, INK, 0.7);
}
// 여의주: 불꽃에 싸인 푸른 구슬
export function pearl(g) {
  for (const [a, l] of [[-0.7, 15], [0, 20], [0.7, 15], [-1.5, 10], [1.5, 10]]) { g.save(); g.translate(0, -24); g.rotate(a); part(g, p => { p.moveTo(-4, -8); p.quadraticCurveTo(-5, -8 - l * 0.6, 1.6, -9 - l); p.quadraticCurveTo(1, -8 - l * 0.5, 4, -8); p.closePath(); }, '#ffb347', null, { lw: 1 }); g.restore(); }
  g.globalAlpha = 0.35; ell(g, 0, -24, 15, 15, '#bfe9f6'); g.globalAlpha = 1;
  part(g, E(0, -24, 10.6, 10.6), '#4fb3d9', E(3.4, -21, 9, 9), { k: 0.24, hi: E(-3.6, -28, 3.4, 2.4), hic: '#eefaff', lw: 1.4 });
  curve(g, p => { p.moveTo(-5.6, -20); p.quadraticCurveTo(0, -15.6, 6, -21); }, '#bfe9f6', 1);
}
// 업경대: 불꽃 무늬 틀에 건 둥근 거울
export function mirror(g) {
  part(g, P(-13, 0, -9, -8, 9, -8, 13, 0), '#7a1f1c', P(0, -8, 9, -8, 13, 0, 0, 0), { lw: 1.2 }); part(g, R(-2.6, -22, 5.2, 14), '#7a1f1c', R(0.4, -22, 2.2, 14), { lw: 1.1 }); rr(g, -6, -10.6, 12, 3.2, 1.2, BRASS, INK, 0.8);
  for (let i = 0; i < 9; i++) { const a = -2.2 + i / 8 * 4.4; g.save(); g.translate(Math.sin(a) * 17, -38 - Math.cos(a) * 17); g.rotate(a); poly(g, [-3.2, 0, 0, -8, 3.2, 0], i % 2 ? '#ff9a2e' : '#c8402f', INK, 0.9); g.restore(); }
  part(g, E(0, -38, 17.6, 17.6), '#7a1f1c', E(4, -34, 16, 16), { lw: 1.4 }); ell(g, 0, -38, 14.6, 14.6, BRASS, INK, 1);
  part(g, E(0, -38, 12.4, 12.4), '#dfe8ea', E(4, -34, 11, 11), { k: 0.14, hi: P(-9, -44, -4, -48, 4, -32, -1, -29), hic: '#ffffff', lw: 1 });
}

// ── 주모와 고운 여인 ──
// 쪽머리: 가르마를 타 뒤로 쪽을 찌고 비녀를 꽂았다 (인형의 모자로 쓴다)
HATS.jjok = g => {
  // 이마 위로 빗어 넘긴 머리 (가운데 가르마)
  part(g, p => { p.moveTo(-10.4, -40.6); p.quadraticCurveTo(-11.4, -55.4, 0, -55.4); p.quadraticCurveTo(11.4, -55.4, 10.4, -40.6); p.quadraticCurveTo(6, -48.6, 0, -49.4); p.quadraticCurveTo(-6, -48.6, -10.4, -40.6); p.closePath(); }, BLACK, P(2, -56, 12, -56, 12, -40, 6, -46), { k: 0.2, lw: 1.1 });
  line(g, [0, -55, 0, -49.6], '#55535e', 0.7);
  // 쪽은 목덜미 뒤에 쪘다: 앞에서는 턱 아래로 살짝 보이고, 비녀 양끝만 머리 밖으로 나온다
  line(g, [-17.6, -28.4, -11.6, -29.4], INK, 2.2); line(g, [-17.6, -28.4, -11.6, -29.4], BRASS, 1.1); ell(g, -18, -28.3, 1.4, 1.4, '#c8402f', INK, 0.5);
  line(g, [11.6, -29.4, 15.6, -28.8], INK, 2.2); line(g, [11.6, -29.4, 15.6, -28.8], BRASS, 1.1);
};
// 손에 든 술병
export function bottleItem(g) {
  part(g, p => { p.moveTo(14, -30); p.lineTo(17, -30); p.lineTo(17, -26.6); p.quadraticCurveTo(21.6, -24, 21, -18.6); p.quadraticCurveTo(20.4, -15.6, 15.5, -15.6); p.quadraticCurveTo(10.6, -15.6, 10, -18.6); p.quadraticCurveTo(9.4, -24, 14, -26.6); p.closePath(); }, WHITE, R(16, -31, 6, 16), { k: 0.12, lw: 1 });
  rr(g, 13.4, -31.6, 4.2, 2, 0.6, '#8a2a26', INK, 0.6); line(g, [11.6, -20.6, 19.4, -20.6], '#2f4d7e', 0.9);
}
// 치마 밑으로 삐져나온 꼬리 셋
export function foxTails(g) {
  for (const [a, x] of [[-1.25, -6], [-0.95, -5], [1.15, 6]]) { g.save(); g.translate(x, -3); g.rotate(a); part(g, p => { p.moveTo(-2.4, 0); p.bezierCurveTo(-7, -8, -6, -17, 0, -23); p.bezierCurveTo(6, -17, 7, -8, 2.4, 0); p.closePath(); }, '#e0b060', null, { lw: 1 }); part(g, p => { p.moveTo(-3.2, -16); p.quadraticCurveTo(0, -18.6, 0, -23); p.quadraticCurveTo(0, -18.6, 3.2, -16); p.quadraticCurveTo(0, -17.6, -3.2, -16); p.closePath(); }, '#fbf7ec', null, { lw: 0.7 }); g.restore(); }
}
