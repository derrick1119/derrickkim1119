// 업그레이드 · 공방 아이콘 (64×64 캔버스에 직접 그린다)
const TAU = Math.PI * 2;

const COLORS = { weapon: '#ffd27a', dark: '#a9c9ff', passive: '#f1e7d3', evo: '#fff3c9', bonus: '#ffd27a' };

function star(c, x, y, r1, r2, n, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = rot + (i / (n * 2)) * TAU;
    if (i) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}

function flame(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y - 20 * s);
  c.bezierCurveTo(x + 16 * s, y - 4 * s, x + 14 * s, y + 16 * s, x, y + 18 * s);
  c.bezierCurveTo(x - 14 * s, y + 16 * s, x - 16 * s, y - 4 * s, x, y - 20 * s);
  c.closePath();
}

function drop(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y - 20 * s);
  c.quadraticCurveTo(x + 18 * s, y + 2 * s, x, y + 16 * s);
  c.quadraticCurveTo(x - 18 * s, y + 2 * s, x, y - 20 * s);
  c.closePath();
}

function lantern(c, x, y, s) {
  c.beginPath();
  c.moveTo(x - 11 * s, y - 12 * s); c.lineTo(x, y - 22 * s); c.lineTo(x + 11 * s, y - 12 * s);
  c.closePath(); c.fill();
  c.strokeRect(x - 9 * s, y - 12 * s, 18 * s, 26 * s);
  c.fillRect(x - 11 * s, y + 14 * s, 22 * s, 4 * s);
}

const ICONS = {
  spark(c) {
    star(c, 36, 28, 17, 5, 4); c.fill();
    c.beginPath(); c.arc(18, 46, 4, 0, TAU); c.fill();
    c.beginPath(); c.arc(10, 54, 2.4, 0, TAU); c.fill();
  },
  halo(c) {
    c.beginPath(); c.arc(32, 32, 19, 0, TAU); c.stroke();
    for (let i = 0; i < 3; i++) {
      const a = -1.2 + i * (TAU / 3);
      c.beginPath(); c.arc(32 + Math.cos(a) * 19, 32 + Math.sin(a) * 19, 5.5, 0, TAU); c.fill();
    }
    c.beginPath(); c.arc(32, 32, 3, 0, TAU); c.fill();
  },
  lance(c) {
    c.lineWidth = 8; c.beginPath(); c.moveTo(12, 52); c.lineTo(52, 12); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(8, 40); c.lineTo(26, 22); c.moveTo(40, 56); c.lineTo(56, 40); c.stroke();
  },
  trail(c) {
    flame(c, 44, 26, 0.8); c.fill();
    flame(c, 26, 38, 0.55); c.fill();
    flame(c, 13, 48, 0.35); c.fill();
  },
  flare(c) {
    star(c, 32, 32, 26, 7, 8); c.fill();
  },
  echo(c) {
    c.setLineDash([5, 4]); c.lineWidth = 3;
    lantern(c, 32, 34, 1);
    c.setLineDash([]);
    c.beginPath(); c.arc(32, 36, 4, 0, TAU); c.fill();
  },
  moonbolt(c) {
    c.beginPath(); c.arc(26, 30, 17, 0.6, TAU - 0.6); c.arc(34, 30, 13, TAU - 0.9, 0.9, true); c.closePath(); c.fill();
    c.lineWidth = 4; c.beginPath(); c.moveTo(36, 46); c.lineTo(56, 26); c.stroke();
    c.beginPath(); c.moveTo(58, 24); c.lineTo(46, 26); c.lineTo(56, 36); c.closePath(); c.fill();
  },
  wick(c) {
    c.lineWidth = 3;
    lantern(c, 32, 36, 0.8);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      c.beginPath(); c.moveTo(32 + Math.cos(a) * 22, 30 + Math.sin(a) * 22); c.lineTo(32 + Math.cos(a) * 29, 30 + Math.sin(a) * 29); c.stroke();
    }
  },
  tank(c) {
    drop(c, 32, 34, 1.15); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(30, 28, 4, 16); c.fillRect(24, 34, 16, 4);
    c.globalCompositeOperation = 'source-over';
  },
  boots(c) {
    c.beginPath();
    c.moveTo(22, 10); c.lineTo(36, 10); c.lineTo(36, 36); c.quadraticCurveTo(54, 38, 54, 50); c.lineTo(54, 54); c.lineTo(22, 54);
    c.closePath(); c.fill();
    c.lineWidth = 3; c.beginPath(); c.moveTo(6, 22); c.lineTo(16, 22); c.moveTo(4, 34); c.lineTo(16, 34); c.moveTo(8, 46); c.lineTo(16, 46); c.stroke();
  },
  magnet(c) {
    c.lineWidth = 11; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(16, 12); c.lineTo(16, 34); c.arc(32, 34, 16, Math.PI, 0, true); c.lineTo(48, 12); c.stroke();
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(8, 16, 16, 3); c.fillRect(40, 16, 16, 3);
    c.globalCompositeOperation = 'source-over';
  },
  trim(c) {
    drop(c, 32, 34, 1.15); c.lineWidth = 3.5; c.stroke();
    c.fillRect(24, 34, 16, 4);
  },
  heat(c) {
    flame(c, 32, 32, 1.35); c.fill();
    c.globalCompositeOperation = 'destination-out';
    flame(c, 32, 42, 0.6); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  hands(c) {
    c.lineWidth = 6; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(12, 16); c.lineTo(28, 32); c.lineTo(12, 48); c.stroke();
    c.beginPath(); c.moveTo(34, 16); c.lineTo(50, 32); c.lineTo(34, 48); c.stroke();
  },
  dusk(c) {
    c.beginPath(); c.arc(32, 40, 16, Math.PI, 0); c.closePath(); c.fill();
    c.fillRect(8, 44, 48, 3.5);
    c.fillRect(16, 51, 32, 3);
    c.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      c.beginPath(); c.moveTo(32 + Math.cos(a) * 21, 40 + Math.sin(a) * 21); c.lineTo(32 + Math.cos(a) * 27, 40 + Math.sin(a) * 27); c.stroke();
    }
  },
  shade(c) {
    c.beginPath();
    c.moveTo(32, 8); c.lineTo(52, 16); c.lineTo(52, 32); c.quadraticCurveTo(50, 50, 32, 58); c.quadraticCurveTo(14, 50, 12, 32); c.lineTo(12, 16);
    c.closePath(); c.lineWidth = 4; c.stroke();
    c.beginPath(); c.moveTo(32, 16); c.lineTo(32, 50); c.stroke();
  },
  luck(c) {
    for (const [x, y] of [[23, 23], [41, 23], [23, 41], [41, 41]]) { c.beginPath(); c.arc(x, y, 10, 0, TAU); c.fill(); }
    c.lineWidth = 4; c.beginPath(); c.moveTo(32, 32); c.quadraticCurveTo(44, 50, 52, 58); c.stroke();
  },
  sunspark(c) {
    star(c, 32, 32, 28, 15, 12); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(32, 32, 9, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    star(c, 32, 32, 8, 3, 4); c.fill();
  },
  corona(c) {
    c.lineWidth = 5; c.beginPath(); c.arc(32, 32, 14, 0, TAU); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); c.arc(32, 32, 24, 0, TAU); c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      c.beginPath(); c.arc(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24, 3.6, 0, TAU); c.fill();
    }
  },
  supernova(c) {
    star(c, 32, 32, 30, 6, 12); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 15, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'source-over';
  },
  refill(c) { drop(c, 32, 34, 1.2); c.fill(); },
  lumen(c) {
    c.beginPath(); c.moveTo(32, 6); c.lineTo(54, 26); c.lineTo(32, 58); c.lineTo(10, 26); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(10, 26); c.lineTo(54, 26); c.moveTo(32, 6); c.lineTo(24, 26); c.lineTo(32, 58); c.lineTo(40, 26); c.closePath(); c.stroke();
    c.globalCompositeOperation = 'source-over';
  },
  reroll(c) {
    c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.arc(32, 32, 18, 0.5, Math.PI * 1.5); c.stroke();
    c.beginPath(); c.moveTo(32, 4); c.lineTo(44, 14); c.lineTo(32, 24); c.closePath(); c.fill();
  },
  revive(c) {
    flame(c, 32, 30, 1.2); c.fill();
    c.lineWidth = 3; c.beginPath(); c.arc(32, 36, 25, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
  },
};

// 공방 항목이 쓰는 아이콘
const META_ICON = { glass: 'tank', wick: 'wick', hand: 'heat', feet: 'boots', ember: 'magnet', reroll: 'reroll', purse: 'lumen', revive: 'revive' };

export function iconCanvas(id, family = 'passive', px = 64) {
  const c = document.createElement('canvas');
  const d = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * d);
  c.style.width = c.style.height = px + 'px';
  const g = c.getContext('2d');
  g.scale((px * d) / 64, (px * d) / 64);
  const col = COLORS[family] || COLORS.passive;
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 4; g.lineJoin = 'round'; g.lineCap = 'round';
  g.shadowColor = col; g.shadowBlur = 10;
  const fn = ICONS[id] || ICONS[META_ICON[id]] || ICONS.spark;
  fn(g);
  return c;
}
