/* 데이 & 나이트 — 지형
 *
 * 세계는 뒤에서 앞으로 겹쳐진 "언덕 겹"들로 이루어진다. 각 겹은 능선 곡선 하나를 가지며
 * 능선 아래는 화면 바닥까지 채워져 뒤쪽 겹을 가린다.
 *
 *  - 인물은 능선 위를 걷는다. 앞쪽 겹에 가려진 곳은 걸을 수 없다.
 *  - 두 능선이 만나는 곳에서 다른 겹으로 건너갈 수 있다.
 *  - 플레이어는 겹의 "손잡이(knob)"를 위아래로 끌어 능선 모양을 바꾼다.
 *    단, 누군가 서 있는 자리의 땅은 움직일 수 없다.
 *
 * DOM 에 의존하지 않으므로 Node 에서도 그대로 돌려 레벨을 검증할 수 있다.
 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U;

  const STEP = 4;          // 능선 표본 간격(px)
  const ABSENT = 4000;     // 겹이 없는 곳의 y
  const FLOOR_Y = 704;     // 이보다 아래의 능선은 걸을 수 없다 (화면 밖)
  const MAX_RISE = 17;     // 한 표본 사이에 오를 수 있는 최대 높이 (절벽 판정)
  const CROSS_TOL = 7;     // 두 능선이 "만난다"고 보는 높이 차
  const HIDE_TOL = 2;      // 앞 겹이 이만큼 이상 높으면 뒤 겹은 가려진 것

  class Layer {
    constructor(def, index) {
      this.def = def;
      this.id = def.id;
      this.index = index;
      this.kind = def.kind || 'hill';        // 'hill' 부드러운 곡선 | 'poly' 꺾은선(지붕) | 'step' 계단
      this.pts = def.pts.map((p) => [p[0], p[1]]);
      this.walk = def.walk !== false;
      this.water = !!def.water;              // 배만 다닐 수 있는 물결
      this.shadow = !!def.shadow;            // 등불을 꺼야 걸을 수 있는 그림자 길
      this.thin = !!def.thin || this.shadow; // 뒤를 가리지 않는 얇은 띠
      this.thick = def.thick || 0;           // 0 = 바닥까지 채워진 언덕, 그 밖 = 떠 있는 섬의 두께
      this.style = def.style || 'hill';
      this.tone = def.tone;
      this.knobs = (def.knobs || []).map((k, i) => ({
        i, c: k.c, w: k.w, lo: k.lo, hi: k.hi, v: k.v || 0, v0: k.v || 0,
        flat: k.flat === undefined ? (this.kind === 'hill' ? 0.25 : 1) : k.flat,
        hint: k.hint !== false,
      }));
      this.x0 = this.pts[0][0];
      this.x1 = this.pts[this.pts.length - 1][0];
      this.ys = null;
    }

    bell(k, x) {
      const t = Math.abs(x - k.c) / k.w;
      if (t >= 1) return 0;
      if (t <= k.flat) return 1;
      const u = (t - k.flat) / (1 - k.flat);
      return 0.5 * (1 + Math.cos(Math.PI * u));
    }

    baseY(x) {
      const p = this.pts;
      if (x < this.x0 || x > this.x1) return ABSENT;
      // 구간 찾기
      let lo = 0, hi = p.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= x) lo = m; else hi = m; }
      if (this.kind === 'step') return p[lo][1];
      const a = p[lo], b = p[hi];
      const h = b[0] - a[0];
      if (h <= 0) return a[1];
      const t = (x - a[0]) / h;
      if (this.kind === 'poly') return a[1] + (b[1] - a[1]) * t;   // 꺾은선 (지붕, 계단)
      const pa = p[lo - 1] || a, pb = p[hi + 1] || b;
      const ma = (b[1] - pa[1]) / Math.max(1, b[0] - pa[0]);
      const mb = (pb[1] - a[1]) / Math.max(1, pb[0] - a[0]);
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * h * ma +
             (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * h * mb;
    }

    /** 떠 있는 섬의 두께 (양 끝은 둥글게 얇아진다) */
    thickAt(x) {
      if (!this.thick) return Infinity;
      const d = Math.min(x - this.x0, this.x1 - x);
      return this.thick * Math.sqrt(U.clamp(d / 70, 0, 1));
    }

    /** 이 겹이 (x, y) 지점을 덮고 있는가 */
    covers(x, y, top) {
      return top < y - HIDE_TOL && (!this.thick || y < top + this.thickAt(x));
    }

    y(x) {
      let y = this.baseY(x);
      if (y >= ABSENT) return ABSENT;
      for (const k of this.knobs) if (k.v !== 0) y += k.v * this.bell(k, x);
      return y;
    }

    /** x 에서 가장 영향력이 큰 손잡이 */
    knobAt(x, minBell) {
      let best = null, bb = minBell === undefined ? 0.12 : minBell;
      for (const k of this.knobs) {
        if (k.lo === k.hi) continue;
        const b = this.bell(k, x);
        if (b > bb) { bb = b; best = k; }
      }
      return best;
    }
  }

  class Terrain {
    constructor(def) {
      this.width = def.width;
      this.layers = def.layers.map((l, i) => new Layer(l, i));
      this.byId = {};
      for (const l of this.layers) this.byId[l.id] = l;
      this.N = Math.ceil(this.width / STEP) + 1;
      for (const l of this.layers) l.ys = new Float32Array(this.N);
      this.blocked = this.layers.map(() => new Uint8Array(this.N));
      this.version = 0;
      this.resampleAll();
    }

    layer(id) { return typeof id === 'string' ? this.byId[id] : id; }

    resample(layer) {
      const ys = layer.ys;
      for (let i = 0; i < this.N; i++) ys[i] = layer.y(i * STEP);
      this.version++;
    }
    resampleAll() { for (const l of this.layers) this.resample(l); }

    /** 표본 보간으로 얻는 능선 높이 (그리기·이동에 쓰는 값) */
    yAt(layer, x) {
      layer = this.layer(layer);
      const f = U.clamp(x / STEP, 0, this.N - 1);
      const i = Math.floor(f), j = Math.min(this.N - 1, i + 1);
      const a = layer.ys[i], b = layer.ys[j];
      if (layer.kind === 'step') return a;
      if (a >= ABSENT || b >= ABSENT) return Math.min(a, b);
      return a + (b - a) * (f - i);
    }

    /** 앞쪽 겹에 가려졌는가 */
    hiddenAt(layer, i) {
      const y = layer.ys[i];
      for (let k = layer.index + 1; k < this.layers.length; k++) {
        const f = this.layers[k];
        if (f.thin) continue;
        if (f.covers(i * STEP, y, f.ys[i])) return true;
      }
      return false;
    }

    /** mode: {water, dark}. water=배, dark=등불이 꺼져 그림자 길을 걸을 수 있음 */
    standable(layer, i, mode) {
      if (!layer.walk) return false;
      if (layer.water !== !!mode.water) return false;
      if (layer.shadow && !mode.dark) return false;
      const y = layer.ys[i];
      if (y >= FLOOR_Y) return false;
      if (!mode.water && this.blocked[layer.index][i]) return false;
      return !this.hiddenAt(layer, i);
    }

    setBlocks(list) {
      for (const b of this.blocked) b.fill(0);
      for (const it of list) {
        const l = this.layer(it.layer);
        if (!l) continue;
        const a = Math.max(0, Math.floor(it.x0 / STEP)), b = Math.min(this.N - 1, Math.ceil(it.x1 / STEP));
        for (let i = a; i <= b; i++) this.blocked[l.index][i] = 1;
      }
    }

    node(layer, x) { return this.layer(layer).index * this.N + U.clamp(Math.round(x / STEP), 0, this.N - 1); }
    nodeLayer(n) { return this.layers[Math.floor(n / this.N)]; }
    nodeX(n) { return (n % this.N) * STEP; }
    nodeY(n) { return this.nodeLayer(n).ys[n % this.N]; }

    /** 시작점에서 걸어서 닿을 수 있는 모든 곳 (너비 우선) */
    reach(layer, x, mode) {
      mode = mode || {};
      const N = this.N, L = this.layers.length;
      const prev = new Int32Array(N * L).fill(-2);
      const ok = new Int8Array(N * L); // 0 모름, 1 가능, -1 불가
      const can = (li, i) => {
        const n = li * N + i;
        if (ok[n] === 0) ok[n] = this.standable(this.layers[li], i, mode) ? 1 : -1;
        return ok[n] === 1;
      };
      const start = this.node(layer, x);
      ok[start] = 1; // 지금 서 있는 곳은 언제나 허용
      prev[start] = -1;
      const queue = new Int32Array(N * L);
      let head = 0, tail = 0;
      queue[tail++] = start;
      while (head < tail) {
        const n = queue[head++];
        const li = Math.floor(n / N), i = n % N;
        const ly = this.layers[li], y = ly.ys[i];
        // 같은 겹 좌우
        for (let d = -1; d <= 1; d += 2) {
          const j = i + d;
          if (j < 0 || j >= N) continue;
          const m = li * N + j;
          if (prev[m] !== -2) continue;
          if (Math.abs(ly.ys[j] - y) > MAX_RISE) continue;
          if (!can(li, j)) continue;
          prev[m] = n; queue[tail++] = m;
        }
        // 다른 겹으로 건너가기
        for (let k = 0; k < L; k++) {
          if (k === li) continue;
          const m = k * N + i;
          if (prev[m] !== -2) continue;
          if (Math.abs(this.layers[k].ys[i] - y) > CROSS_TOL) continue;
          if (!can(k, i)) continue;
          prev[m] = n; queue[tail++] = m;
        }
      }
      return { prev, start, count: tail, nodes: queue };
    }

    reachable(r, layer, x) { return r.prev[this.node(layer, x)] !== -2; }

    /** 닿을 수 있는 곳 가운데 (wx, wy)에 가장 가까운 지점 */
    nearest(r, wx, wy, only, prefer) {
      let best = -1, bd = Infinity;
      const N = this.N;
      for (let q = 0; q < r.count; q++) {
        const n = r.nodes[q];
        const li = Math.floor(n / N), i = n % N;
        if (only && this.layers[li] !== only) continue;
        const dx = i * STEP - wx, dy = this.layers[li].ys[i] - wy;
        let d = dx * dx + dy * dy;
        if (prefer && this.layers[li] === prefer) d -= 30;   // 두 겹이 겹친 곳에서는 누른 겹을 고른다
        if (d < bd) { bd = d; best = n; }
      }
      return { node: best, dist: Math.sqrt(Math.max(0, bd)) };
    }

    path(r, node) {
      const out = [];
      let n = node;
      while (n >= 0) { out.push(n); n = r.prev[n]; }
      out.reverse();
      return out;
    }

    /** (wx, wy)에서 보이는 겹 = 그 점을 덮고 있는 가장 앞쪽 겹 */
    hit(wx, wy) {
      for (let k = this.layers.length - 1; k >= 0; k--) {
        const l = this.layers[k];
        if (l.thin) continue;
        const y = this.yAt(l, wx);
        if (y < ABSENT && wy >= y - 6 && (!l.thick || wy <= y + l.thickAt(wx) + 6)) return l;
      }
      return null;
    }

    /** 손잡이가 누군가의 발밑 땅을 움직이는가 */
    underfoot(layer, knob, agents) {
      for (const a of agents) {
        if (a.rides) continue; // 배는 물결과 함께 움직인다
        if (a.layer === layer && layer.bell(knob, a.x) > 0.02) return true;
      }
      return false;
    }

    /** 이 배치에서 모든 인물이 여전히 보이는가 (앞 언덕이 인물을 덮지 않는가) */
    agentsVisible(agents) {
      for (const a of agents) {
        if (!a.layer) continue;
        const y = this.yAt(a.layer, a.x);
        for (let k = a.layer.index + 1; k < this.layers.length; k++) {
          const f = this.layers[k];
          if (f.thin) continue;
          if (f.covers(a.x, y, this.yAt(f, a.x))) return false;
        }
      }
      return true;
    }

    /** 손잡이를 v 로 옮긴다. 제약에 걸리면 허용되는 데까지만 옮기고 실제 값을 돌려준다. */
    drag(layer, knob, v, agents) {
      layer = this.layer(layer);
      agents = agents || [];
      if (this.underfoot(layer, knob, agents)) return knob.v;
      const from = knob.v;
      const want = U.clamp(v, knob.lo, knob.hi);
      if (want === from) return from;
      const apply = (val) => { knob.v = val; this.resample(layer); };
      apply(want);
      if (this.agentsVisible(agents)) return want;
      // 이분법으로 허용 한계 찾기
      let good = from, bad = want;
      for (let it = 0; it < 7; it++) {
        const mid = (good + bad) / 2;
        apply(mid);
        if (this.agentsVisible(agents)) good = mid; else bad = mid;
      }
      apply(good);
      return good;
    }

    resetKnobs() {
      for (const l of this.layers) for (const k of l.knobs) k.v = k.v0;
      this.resampleAll();
    }
  }

  DN.Terrain = Terrain;
  DN.Layer = Layer;
  DN.T = { STEP, ABSENT, FLOOR_Y, MAX_RISE, CROSS_TOL, HIDE_TOL };
})(typeof globalThis !== 'undefined' ? globalThis : window);
