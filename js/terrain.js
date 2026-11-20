/* 데이 & 나이트 — 지형과 세 구역
 *
 * 풍경은 뒤에서 앞으로 겹쳐진 언덕 겹들이고, 인물은 능선 위를 걷는다.
 * 지형은 움직이지 않는다. 바뀌는 것은 "빛"이다.
 *
 *   밤이 오면 낮은 등불 안으로 오므라든다. 등불 둘레의 동그란 빛(bubble) 안은 낮,
 *   밖은 밤, 그 가장자리의 얇은 띠는 황혼이다.
 *
 *   - 낮에만 있는 것 : 낮의 길(구름), 깨어난 '빛 먹는 그을음'
 *   - 밤에만 있는 것 : 그을음(두려움), 그림자 다리, 밤의 섬
 *   - 황혼(가장자리) : 낮의 것도 밤의 것도 디딜 수 있고, 아무것도 막지 않는다.
 *                      걸어 둔 등불의 가장자리는 그 자체가 길이 된다 (황혼 걸음).
 *
 * DOM 에 의존하지 않으므로 Node 에서도 그대로 돌려 볼 수 있다.
 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U;

  const STEP = 4;          // 능선 표본 간격(px)
  const ABSENT = 4000;     // 겹이 없는 곳의 y
  const FLOOR_Y = 704;     // 이보다 아래는 걸을 수 없다 (화면 밖)
  const MAX_RISE = 17;     // 한 표본 사이에 오를 수 있는 최대 높이 (절벽 판정)
  const CROSS_TOL = 7;     // 두 능선이 "만난다"고 보는 높이 차
  const HIDE_TOL = 2;      // 앞 겹이 이만큼 이상 높으면 뒤 겹은 가려진 것
  const RIM = 15;          // 황혼 띠의 반 두께
  const FOOT = 8;          // 구역을 재는 높이 (발 조금 위)

  class Layer {
    constructor(def, index) {
      this.def = def;
      this.id = def.id;
      this.index = index;
      this.kind = def.kind || 'hill';        // 'hill' 부드러운 곡선 | 'poly' 꺾은선(지붕, 계단)
      this.pts = (def.pts || [[0, ABSENT], [1, ABSENT]]).map((p) => [p[0], p[1]]);
      this.walk = def.walk !== false;
      this.water = !!def.water;              // 배만 다니는 물결
      this.zone = def.zone || null;          // 'day' | 'night' | 'dusk' : 그 구역(과 황혼)에서만 실재한다
      this.needs = def.needs || null;        // 이 깃발이 서야 놓이는 다리
      this.thin = !!def.thin;                // 뒤를 가리지 않는 얇은 띠 (다리)
      this.thick = def.thick || 0;           // 0 = 바닥까지 채워진 언덕, 그 밖 = 떠 있는 섬의 두께
      this.style = def.style || 'hill';
      this.tone = def.tone;
      this.dynamic = !!def.dynamic;          // 빛의 가장자리처럼 매번 다시 놓이는 겹
      this.x0 = this.pts[0][0];
      this.x1 = this.pts[this.pts.length - 1][0];
      this.ys = null;
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
      const p = this.pts;
      if (x < this.x0 || x > this.x1) return ABSENT;
      let lo = 0, hi = p.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= x) lo = m; else hi = m; }
      const a = p[lo], b = p[hi];
      const h = b[0] - a[0];
      if (h <= 0) return a[1];
      const t = (x - a[0]) / h;
      if (this.kind === 'poly') return a[1] + (b[1] - a[1]) * t;
      const pa = p[lo - 1] || a, pb = p[hi + 1] || b;
      const ma = (b[1] - pa[1]) / Math.max(1, b[0] - pa[0]);
      const mb = (pb[1] - a[1]) / Math.max(1, pb[0] - a[0]);
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * h * ma +
             (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * h * mb;
    }
  }

  class Terrain {
    constructor(def) {
      this.width = def.width;
      const defs = def.layers.concat([
        // 걸어 둔 등불의 가장자리: 아래쪽 호(늘어진 다리)와 위쪽 호(둥근 지붕)
        { id: 'arc_dn', zone: 'dusk', thin: true, dynamic: true },
        { id: 'arc_up', zone: 'dusk', thin: true, dynamic: true },
      ]);
      this.layers = defs.map((l, i) => new Layer(l, i));
      this.byId = {};
      for (const l of this.layers) this.byId[l.id] = l;
      this.N = Math.ceil(this.width / STEP) + 1;
      for (const l of this.layers) {
        l.ys = new Float32Array(this.N);
        if (l.dynamic) l.ys.fill(ABSENT);
        else for (let i = 0; i < this.N; i++) l.ys[i] = l.y(i * STEP);
      }
      this.bubbles = [];     // [{x, y, r, focus}] 빛의 원들 (세계 좌표)
      this.allDay = true;    // 해가 떠 있는 동안에는 온 세상이 낮
      this.blocks = [];      // [{layer, x0, x1, when: 'night' | 'day', dense, always}]
      this.flags = {};
      this.arc = null;
      this.version = 0;
    }

    layer(id) { return typeof id === 'string' ? this.byId[id] : id; }

    /* ───────── 빛과 구역 ───────── */
    setLight(bubbles, allDay) {
      this.bubbles = bubbles;
      this.allDay = !!allDay;
      this.version++;
    }

    /** (x, y)가 낮인가, 황혼인가, 밤인가 */
    zoneAt(x, y) {
      if (this.allDay) return 'day';
      let z = 'night';
      for (const b of this.bubbles) {
        const d = Math.hypot(x - b.x, y - b.y);
        if (d < b.r - RIM) return 'day';
        if (d <= b.r + RIM) z = 'dusk';
      }
      return z;
    }

    /** 종이나 거울이 모아 준 센 빛 안인가 (짙은 그을음은 여기서만 흩어진다) */
    inFocus(x, y) {
      if (this.allDay) return true;
      for (const b of this.bubbles) if (b.focus && Math.hypot(x - b.x, y - b.y) < b.r - RIM) return true;
      return false;
    }

    /** 걸어 둔 등불의 가장자리를 길로 놓는다. r 이 작으면 거둔다. */
    setArc(cx, cy, r) {
      const dn = this.byId.arc_dn.ys, up = this.byId.arc_up.ys;
      dn.fill(ABSENT); up.fill(ABSENT);
      this.arc = r > 40 ? { x: cx, y: cy, r } : null;
      if (this.arc) {
        const a = Math.max(0, Math.ceil((cx - r) / STEP)), b = Math.min(this.N - 1, Math.floor((cx + r) / STEP));
        for (let i = a; i <= b; i++) {
          const dx = i * STEP - cx, s2 = r * r - dx * dx;
          if (s2 <= 0) continue;
          const s = Math.sqrt(s2);
          dn[i] = cy + s; up[i] = cy - s;
        }
      }
      this.version++;
    }

    setBlocks(list) { this.blocks = list.map((b) => Object.assign({}, b, { layer: this.layer(b.layer) })); this.version++; }

    /* ───────── 능선 ───────── */
    yAt(layer, x) {
      layer = this.layer(layer);
      const f = U.clamp(x / STEP, 0, this.N - 1);
      const i = Math.floor(f), j = Math.min(this.N - 1, i + 1);
      const a = layer.ys[i], b = layer.ys[j];
      if (a >= ABSENT || b >= ABSENT) return Math.min(a, b);
      return a + (b - a) * (f - i);
    }

    /** 앞쪽 겹에 가려졌는가 (구역을 타는 겹과 얇은 다리는 아무것도 가리지 않는다) */
    hiddenAt(layer, i) {
      if (layer.thin) return false;
      const y = layer.ys[i];
      for (let k = layer.index + 1; k < this.layers.length; k++) {
        const f = this.layers[k];
        if (f.thin || f.zone) continue;
        if (f.covers(i * STEP, y, f.ys[i])) return true;
      }
      return false;
    }

    /**
     * 그 자리에 설 수 있는가.
     * mode: { water 배, star 별이 보임, shadow 그림자 걸음, dusk 황혼 걸음, shy 빛 속에 서지 못함(나이트) }
     */
    standable(layer, i, mode) {
      if (!layer.walk) return false;
      if (layer.water !== !!mode.water) return false;
      const y = layer.ys[i];
      if (y >= FLOOR_Y) return false;
      if (layer.needs && !this.flags[layer.needs]) return false;
      const x = i * STEP;
      const z = this.zoneAt(x, y - FOOT);
      if (mode.water) return z === 'night' && !!mode.star;      // 배는 별이 보이는 어둠 속으로만 나아간다
      if (layer.zone === 'dusk') { if (!mode.dusk) return false; }
      else if (layer.zone === 'night') { if (z === 'day' || !mode.shadow) return false; }
      else if (layer.zone === 'day') { if (z === 'night') return false; }
      if (mode.shy && z === 'day') return false;
      for (const b of this.blocks) {
        if (b.layer !== layer || x < b.x0 || x > b.x1) continue;
        if (b.dense) { if (!this.inFocus(x, y - FOOT)) return false; }
        else if (b.always || (b.when === 'night' ? z === 'night' : z === 'day')) return false;
      }
      return !this.hiddenAt(layer, i);
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
        for (let d = -1; d <= 1; d += 2) {
          const j = i + d;
          if (j < 0 || j >= N) continue;
          const m = li * N + j;
          if (prev[m] !== -2) continue;
          if (Math.abs(ly.ys[j] - y) > MAX_RISE) continue;
          if (!can(li, j)) continue;
          prev[m] = n; queue[tail++] = m;
        }
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
    nearest(r, wx, wy, prefer) {
      let best = -1, bd = Infinity;
      const N = this.N;
      for (let q = 0; q < r.count; q++) {
        const n = r.nodes[q];
        const li = Math.floor(n / N), i = n % N;
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
  }

  DN.Terrain = Terrain;
  DN.Layer = Layer;
  DN.T = { STEP, ABSENT, FLOOR_Y, MAX_RISE, CROSS_TOL, HIDE_TOL, RIM, FOOT };
})(typeof globalThis !== 'undefined' ? globalThis : window);
