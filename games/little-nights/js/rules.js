// THE LAMP: 작은 밤들 — 규칙 (화면 없이 동작: 게임, 풀이기, 스테이지 생성기가 같이 쓴다)
//
// 한 턴에 한 가지: 한 칸 굴러가기(U R D L) 또는 불을 켜고 끄기(T).
//   · 전구의 빛은 두 칸까지 번진다. 벽과 상자는 빛을 막는다.
//   · 낮의 돌은 빛이 닿는 동안에만, 밤의 돌은 빛이 닿지 않는 동안에만 딛을 수 있다.
//   · 빛꽃은 빛이 닿으면 핀다. 등불은 불 켠 전구가 곁에 서면 켜지고, 제 옆 칸을 영영 밝힌다.
//   · 그림자는 빛이 닿지 않으면 한 턴에 한 칸씩 다가온다. 빛 속에서는 가라앉아 움직이지 못한다.
//   · 나방은 불이 켜져 있으면 날아든다. 물리면 금이 가고, 금 간 채로 또 물리면 깨진다.

export const LIGHT_R = 2;
export const LANTERN_R = 1;
export const MOTH_SENSE = 5;

export const T_VOID = 0, T_FLOOR = 1, T_WALL = 2, T_DAY = 3, T_NIGHT = 4, T_LANTERN = 5;
export const ACTIONS = ['U', 'R', 'D', 'L', 'T'];
const DX = { U: 0, R: 1, D: 0, L: -1 }, DY = { U: -1, R: 0, D: 1, L: 0 };
const ORDER = ['U', 'R', 'D', 'L'];

// 지도 기호:  # 벽   . 바닥   (빈칸) 허공   D 낮의 돌   N 밤의 돌   L 등불   * 빛꽃
//            S 시작   E 출구(소켓)   s 그림자   w 나방   c 상자
export function parseLevel(def) {
  const rows = def.rows, H = rows.length, W = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const L = {
    id: def.id, def, W, H, type: new Uint8Array(W * H), start: 0, exit: -1,
    lanterns: [], flowers: [], shadows: [], moths: [], crates: [],
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = rows[y][x] || ' ', i = y * W + x;
      let t = T_FLOOR;
      if (c === ' ' || c === '~') t = T_VOID;
      else if (c === '#') t = T_WALL;
      else if (c === 'D') t = T_DAY;
      else if (c === 'N') t = T_NIGHT;
      else if (c === 'L') { t = T_LANTERN; L.lanterns.push(i); }
      else if (c === '*') L.flowers.push(i);
      else if (c === 'S') L.start = i;
      else if (c === 'E') L.exit = i;
      else if (c === 's') L.shadows.push(i);
      else if (c === 'w') L.moths.push(i);
      else if (c === 'c') L.crates.push(i);
      L.type[i] = t;
    }
  }
  return L;
}

export function initialState(L) {
  return { p: L.start, on: true, cr: false, lan: 0, fl: 0, crates: L.crates.slice(), sh: L.shadows.slice(), mo: L.moths.slice(), t: 0 };
}

export function stateKey(s) {
  return s.p + (s.on ? 'o' : 'x') + (s.cr ? 'c' : '-') + s.lan + ',' + s.fl + '|' + s.crates.join('.') + '|' + s.sh.join('.') + '|' + s.mo.join('.');
}

function hasCrate(s, i) {
  for (let k = 0; k < s.crates.length; k++) if (s.crates[k] === i) return true;
  return false;
}

// 어디에 빛이 닿는가
export function litMap(L, s) {
  const { W, H, type } = L, N = W * H, lit = new Uint8Array(N);
  const flood = (src, radius) => {
    lit[src] = 1;
    let frontier = [src];
    const seen = new Uint8Array(N);
    seen[src] = 1;
    for (let d = 0; d < radius; d++) {
      const next = [];
      for (const i of frontier) {
        const x = i % W, y = (i / W) | 0;
        for (let k = 0; k < 4; k++) {
          const nx = x + DX[ORDER[k]], ny = y + DY[ORDER[k]];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (seen[j]) continue;
          seen[j] = 1;
          if (type[j] === T_WALL || hasCrate(s, j)) continue; // 빛을 막는다
          lit[j] = 1;
          next.push(j);
        }
      }
      frontier = next;
    }
  };
  if (s.on) flood(s.p, LIGHT_R);
  for (let k = 0; k < L.lanterns.length; k++) if (s.lan & (1 << k)) flood(L.lanterns[k], LANTERN_R);
  return lit;
}

// 딛을 수 있는 바닥이 있는가 (상자·등불 같은 물건은 따로 본다)
export function floorAt(L, lit, i) {
  const t = L.type[i];
  if (t === T_FLOOR) return true;
  if (t === T_DAY) return lit[i] === 1;
  if (t === T_NIGHT) return lit[i] === 0;
  return false;
}

// 어떤 칸 from 에서 시작해 걸어서 닿는 거리 (그림자용: 바닥만, 물건은 못 지난다)
function walkDist(L, s, lit, from) {
  const { W, H } = L, N = W * H, dist = new Int16Array(N).fill(-1);
  dist[from] = 0;
  const q = [from];
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[ORDER[k]], ny = y + DY[ORDER[k]];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (dist[j] >= 0 || !floorAt(L, lit, j) || hasCrate(s, j)) continue;
      dist[j] = dist[i] + 1;
      q.push(j);
    }
  }
  return dist;
}

// 날아서 닿는 거리 (나방용: 허공도 건넌다. 벽·상자·등불은 못 지난다)
function flyDist(L, s, from) {
  const { W, H, type } = L, N = W * H, dist = new Int16Array(N).fill(-1);
  dist[from] = 0;
  const q = [from];
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[ORDER[k]], ny = y + DY[ORDER[k]];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (dist[j] >= 0 || type[j] === T_WALL || type[j] === T_LANTERN || hasCrate(s, j)) continue;
      dist[j] = dist[i] + 1;
      q.push(j);
    }
  }
  return dist;
}

// 한 턴 진행. 할 수 없는 행동이면 { ok:false, why } 를 돌려준다.
export function step(L, s, a) {
  const { W, H, type } = L;
  const ev = [];
  const n = { p: s.p, on: s.on, cr: s.cr, lan: s.lan, fl: s.fl, crates: s.crates, sh: s.sh, mo: s.mo, t: s.t + 1 };
  const lit0 = litMap(L, s);

  if (a === 'T') {
    n.on = !s.on;
    const lit1 = litMap(L, n);
    if (!floorAt(L, lit1, n.p)) return { ok: false, why: 'floor' }; // 발밑이 꺼진다
    ev.push({ type: 'toggle', on: n.on });
  } else {
    const x = s.p % W, y = (s.p / W) | 0, nx = x + DX[a], ny = y + DY[a];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return { ok: false, why: 'edge' };
    const j = ny * W + nx;
    if (type[j] === T_WALL || type[j] === T_LANTERN) return { ok: false, why: 'wall' };
    if (!floorAt(L, lit0, j)) return { ok: false, why: 'void' };
    const ci = s.crates.indexOf(j);
    if (ci >= 0) {
      // 상자 밀기: 그 너머가 빈 맨바닥이어야 한다
      const bx = nx + DX[a], by = ny + DY[a];
      if (bx < 0 || by < 0 || bx >= W || by >= H) return { ok: false, why: 'crate' };
      const b = by * W + bx;
      if (type[b] !== T_FLOOR || b === L.exit || hasCrate(s, b) || s.sh.indexOf(b) >= 0 || L.flowers.indexOf(b) >= 0) return { ok: false, why: 'crate' };
      n.crates = s.crates.slice();
      n.crates[ci] = b;
      ev.push({ type: 'push', k: ci, from: j, to: b });
    }
    n.p = j;
    const lit1 = litMap(L, n);
    if (!floorAt(L, lit1, j)) return { ok: false, why: 'void' };
    ev.push({ type: 'move', from: s.p, to: j, dir: a });
    if (j === L.exit) {
      // 꽃은 도착하는 순간의 빛으로도 핀다
      n.fl = bloom(L, n, lit1, ev);
      ev.push({ type: 'win' });
      return { ok: true, s: n, ev, win: true, fail: false };
    }
  }

  // 등불: 불 켠 전구가 곁에 서면 켜진다. 금도 낫는다.
  if (n.on) {
    const x = n.p % W, y = (n.p / W) | 0;
    for (let k = 0; k < L.lanterns.length; k++) {
      if (n.lan & (1 << k)) continue;
      const q = L.lanterns[k], qx = q % W, qy = (q / W) | 0;
      if (Math.abs(qx - x) + Math.abs(qy - y) === 1) {
        n.lan |= 1 << k;
        ev.push({ type: 'lantern', k, healed: n.cr });
        n.cr = false;
      }
    }
  }
  const lit = litMap(L, n);
  n.fl = bloom(L, n, lit, ev);

  let fail = false;
  const bite = (who, k) => {
    ev.push({ type: 'bite', who, k });
    if (n.cr) { fail = true; ev.push({ type: 'shatter' }); } else { n.cr = true; ev.push({ type: 'crack' }); }
  };

  // 그림자
  if (n.sh.length) {
    const sh = n.sh.slice();
    let dist = null;
    for (let k = 0; k < sh.length && !fail; k++) {
      const q = sh[k];
      if (q < 0) continue;
      if (!floorAt(L, lit, q)) { sh[k] = -1; ev.push({ type: 'shadowFall', k, at: q }); continue; } // 딛고 선 돌이 사라졌다
      if (lit[q]) continue; // 빛 속에서는 가라앉아 있다
      if (q === n.p) { sh[k] = -1; bite('shadow', k); continue; }
      if (!dist) dist = walkDist(L, n, lit, n.p);
      if (dist[q] < 0) continue;
      let best = -1, bd = dist[q];
      const x = q % W, y = (q / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[ORDER[d]], ny = y + DY[ORDER[d]];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (dist[j] < 0 || dist[j] >= bd || sh.indexOf(j) >= 0) continue;
        bd = dist[j]; best = j;
      }
      if (best < 0) continue;
      ev.push({ type: 'shadowMove', k, from: q, to: best });
      if (best === n.p) { sh[k] = -1; bite('shadow', k); } else sh[k] = best;
    }
    n.sh = sh;
  }

  // 나방
  if (n.mo.length && !fail) {
    const mo = n.mo.slice();
    let toBulb = null;
    for (let k = 0; k < mo.length && !fail; k++) {
      const q = mo[k], home = L.moths[k];
      let target = null;
      if (n.on) {
        if (!toBulb) toBulb = flyDist(L, n, n.p);
        if (toBulb[q] >= 0 && toBulb[q] <= MOTH_SENSE) target = toBulb;
      }
      if (!target) { if (q === home) continue; target = flyDist(L, n, home); }
      if (target[q] <= 0) { if (target === toBulb) { mo[k] = home; bite('moth', k); ev.push({ type: 'mothMove', k, from: q, to: home }); } continue; }
      let best = -1, bd = target[q];
      const x = q % W, y = (q / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[ORDER[d]], ny = y + DY[ORDER[d]];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (target[j] < 0 || target[j] >= bd || mo.indexOf(j) >= 0) continue;
        bd = target[j]; best = j;
      }
      if (best < 0) continue;
      if (target === toBulb && best === n.p) {
        ev.push({ type: 'mothMove', k, from: q, to: best, back: home });
        mo[k] = home;
        bite('moth', k);
      } else {
        ev.push({ type: 'mothMove', k, from: q, to: best });
        mo[k] = best;
      }
    }
    n.mo = mo;
  }

  return { ok: true, s: n, ev, win: false, fail };
}

function bloom(L, n, lit, ev) {
  let fl = n.fl;
  for (let k = 0; k < L.flowers.length; k++) {
    if (!(fl & (1 << k)) && lit[L.flowers[k]]) { fl |= 1 << k; ev.push({ type: 'bloom', k }); }
  }
  return fl;
}

export function allFlowers(L) { return (1 << L.flowers.length) - 1; }
