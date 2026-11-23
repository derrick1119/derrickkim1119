import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { World } from '../src/core/world.js';
import { defaultState } from '../src/core/state.js';
import { seededRng } from '../src/core/rng.js';

const always = (v) => () => v;
const LAYOUT = { w: 390, h: 760, top: 110, groundY: 600, ufoX: 195, ufoY: 300, ufoR: 46 };

/** 표본을 다 연 시험용 게임과 세계. 지구인은 한동안 고개를 들지 않는다. */
function setup({ gameRng = always(0.999), patch = (s) => s } = {}) {
  const s = defaultState();
  for (const id of ['dandelion', 'firefly', 'balloon', 'kite', 'chicken', 'cow', 'drone', 'weather', 'satellite', 'meteor']) s.unlocked.specimens[id] = true;
  s.stats.discoveries = 1; // 첫 판 보호(맑은 날 고정 등)를 끈다
  const g = new Game(patch(s), { rng: gameRng, now: () => 1 });
  const w = new World(g, { rng: seededRng(11) });
  w.setLayout(LAYOUT);
  for (const h of w.humans) h.t = 999;
  w.specimens = [];
  w.covers = [];
  w.sources = [];
  w.weather = { kind: 'clear', t: 999 };
  return { g, w };
}

/** 표본 하나를 원하는 자리에 둔다. */
function place(w, kind, x, y, extra = {}) {
  const sp = w._spawn(kind);
  w.specimens = w.specimens.filter((o) => o === sp);
  Object.assign(sp, { x, y, ax: x, ay: y, shiny: false, age: 1 }, extra);
  return sp;
}

test('시선은 구간이다: 기체가 시선 밖이면 시선 중에 빔을 쏴도 들키지 않는다', () => {
  const { g, w } = setup({ gameRng: always(0) });
  const h = w.humans[0];
  h.state = 'look';
  h.t = 5;
  h.gw = 40;
  h.gx = 40; // 왼쪽 끝 하늘을 본다
  w.ufoX = w.ufoTarget = 300;
  const sp = place(w, 'dandelion', 120, 250);
  const r = w.tap(sp.x, sp.y);
  assert.equal(r.result.report, null);
  assert.ok(r.result.gain > 0);
  assert.equal(g.phase, 'play');
});

test('시선이 기체를 덮으면 빔을 쏠 때 들킬 수 있다', () => {
  const { g, w } = setup({ gameRng: always(0) });
  const h = w.humans[0];
  Object.assign(h, { state: 'look', t: 5, gw: 40, gx: 195 });
  const sp = place(w, 'dandelion', 120, 250);
  const r = w.tap(sp.x, sp.y);
  assert.equal(r.result.report.cause, 'gaze_farmer');
  assert.equal(g.phase, 'discovered');
  assert.ok(h.spotted);
});

test('구름 뒤에 숨으면 시선이 덮어도 들키지 않는다', () => {
  const { g, w } = setup({ gameRng: always(0) });
  Object.assign(w.humans[0], { state: 'look', t: 5, gw: 40, gx: 195 });
  w.covers.push({ id: 1, kind: 'cloud', x: 195, y: 300, rx: 110, ry: 50, vx: 0, vy: 0, age: 5, a: 1 });
  w.update(0.016);
  assert.ok(w.hidden, '숨었다');
  assert.deepEqual(w.seers(), []);
  const sp = place(w, 'dandelion', 120, 250);
  const r = w.tap(sp.x, sp.y);
  assert.equal(r.result.report, null);
  assert.equal(g.phase, 'play');
});

test('빈 곳을 끌면 기체가 옆으로 움직인다(가로 범위 안에서)', () => {
  const { w } = setup();
  const before = w.ufoTarget;
  w.pointerDown(100, 500);
  w.pointerMove(160, 500);
  assert.ok(Math.abs(w.ufoTarget - (before + 60)) < 1e-6);
  w.pointerMove(5000, 500);
  const [, right] = w.lane;
  assert.equal(w.ufoTarget, right);
  assert.equal(w.pointerUp(5000, 500), null);
  for (let i = 0; i < 60; i++) w.update(0.016);
  assert.ok(Math.abs(w.ufoX - right) < 2);
});

test('기체를 톡 치면 간지럼(끌지 않았을 때만)', () => {
  const { w } = setup();
  const r = w.tap(w.ufoX, LAYOUT.ufoY);
  assert.equal(r.type, 'ufo');
  w.pointerDown(w.ufoX, LAYOUT.ufoY);
  w.pointerMove(w.ufoX + 40, LAYOUT.ufoY);
  assert.equal(w.pointerUp(w.ufoX + 40, LAYOUT.ufoY), null, '끌었으면 간지럼이 아니다');
});

test('의심 게이지: 시선 안에 오래 있으면 가만히 있어도 들킨다', () => {
  const { g, w } = setup({ gameRng: always(0.999) });
  const h = w.humans[0];
  Object.assign(h, { type: 'streamer', state: 'look', t: 30, gw: 50, gx: 195, lookDur: 30 });
  for (let i = 0; i < 400 && g.phase === 'play'; i++) w.update(0.02);
  assert.equal(g.phase, 'discovered');
  assert.equal(g.state.lastReport.cause, 'gaze_streamer');
});

test('의심 게이지는 시선을 벗어나면 줄어든다', () => {
  const { g, w } = setup();
  Object.assign(w.humans[0], { state: 'look', t: 30, gw: 40, gx: 195, lookDur: 30 });
  for (let i = 0; i < 40; i++) w.update(0.02);
  const s1 = w.suspicion;
  assert.ok(s1 > 0.1);
  w.ufoX = w.ufoTarget = 350;
  for (let i = 0; i < 40; i++) w.update(0.02);
  assert.ok(w.suspicion < s1);
  assert.equal(g.phase, 'play');
});

test('소는 꾹 눌러야 들어 올린다. 톡 치면 안 오고, 중간에 떼면 떨어진다', () => {
  const { g, w } = setup();
  const cow = place(w, 'cow', 200, LAYOUT.groundY - 4, { mode: 'ground' });
  const hints = [];
  w.on('hint', (e) => hints.push(e.key));
  w.tap(cow.x, cow.y - 14);
  assert.equal(cow.state, 'live');
  assert.deepEqual(hints, ['holdCow']);
  // 끝까지 누르면 들어 올린다
  w.pointerDown(cow.x, cow.y - 14);
  for (let i = 0; i < 50 && cow.state === 'live'; i++) w.update(0.02);
  assert.equal(cow.state, 'beam');
  assert.equal(g.run.specimens, 1);
  // 중간에 떼면 떨어진다(처음 한 번은 가르쳐 주기만)
  const cow2 = place(w, 'cow', 200, LAYOUT.groundY - 4, { mode: 'ground' });
  const drops = [];
  w.on('drop', (e) => drops.push(e));
  w.pointerDown(cow2.x, cow2.y - 14);
  for (let i = 0; i < 10; i++) w.update(0.02);
  w.pointerUp(cow2.x, cow2.y - 14);
  assert.equal(drops.length, 1);
  assert.equal(cow2.state, 'live');
  assert.equal(g.phase, 'play');
});

test('풍선을 톡 치면 터진다(두 번째부터는 들킬 수 있다)', () => {
  const { g, w } = setup({ gameRng: always(0) });
  const pops = [];
  w.on('pop', (sp) => pops.push(sp));
  const b1 = place(w, 'balloon', 200, 250);
  w.tap(b1.x, b1.y);
  assert.equal(pops.length, 1);
  assert.equal(g.phase, 'play', '처음 터뜨렸을 때는 가르쳐 주기만');
  const b2 = place(w, 'balloon', 200, 250);
  w.tap(b2.x, b2.y);
  assert.equal(g.phase, 'discovered');
  assert.equal(g.state.lastReport.cause, 'balloon_pop');
});

test('풍선은 살살 꾹 누르면 데려온다', () => {
  const { g, w } = setup();
  const b = place(w, 'balloon', 200, 250);
  w.pointerDown(b.x, b.y);
  for (let i = 0; i < 30 && b.state === 'live'; i++) w.update(0.02);
  assert.equal(b.state, 'beam');
  assert.equal(g.run.specimens, 1);
});

test('연줄을 끊고 데려가면 보너스, 그냥 당기면 줄다리기 사건이 날 수 있다', () => {
  const { g, w } = setup();
  const kite = place(w, 'kite', 200, 220, { dir: 1 });
  // 연에서 땅 쪽으로 내려가는 줄을 가로로 긋는다
  const midY = (220 + LAYOUT.groundY) / 2;
  w.pointerDown(150, midY);
  w.pointerMove(320, midY);
  w.pointerUp(320, midY);
  assert.ok(kite.cut, '줄이 끊겼다');
  const r = w.tap(kite.x, kite.y);
  assert.ok(r.tags.includes('cut'));

  const { g: g2, w: w2 } = setup({ gameRng: always(0) });
  const k2 = place(w2, 'kite', 200, 220, { dir: 1 });
  w2.tap(k2.x, k2.y);
  assert.equal(g2.state.lastReport.cause, 'kite_tangle');
  void g;
});

test('닭은 처음 누르면 달아나고, 달아나는 중에 잡으면 보너스', () => {
  const { w } = setup();
  const ch = place(w, 'chicken', 200, LAYOUT.groundY - 4, { mode: 'ground' });
  const first = w.tap(ch.x, ch.y - 14);
  assert.equal(first.type, 'flee');
  assert.ok(ch.flee > 0);
  w.update(0.1);
  const second = w.tap(ch.x, ch.y - 14);
  assert.equal(second.type, 'specimen');
  assert.ok(second.tags.includes('caught'));
});

test('반딧불 셋을 재빨리 모으면 반딧불 콤보, 유성은 일찍 잡으면 완벽', () => {
  const { w } = setup();
  w.specimens = [];
  const first = w._spawn('firefly');
  // 무리를 직접 만든다(_spawn 에 kind 를 넘기면 무리를 만들지 않는다)
  const g = 999;
  w.groups.set(g, { n: 3, got: 0, t: 0 });
  const flies = [first, w._spawn('firefly'), w._spawn('firefly')];
  flies.forEach((f, i) => Object.assign(f, { group: g, x: 80 + i * 110, y: 240, shiny: false }));
  let last = null;
  for (const f of flies) last = w.tap(f.x, f.y);
  assert.ok(last.tags.includes('swarm'));

  const m = place(w, 'meteor', 200, 200, { age: 0.3 });
  const r = w.tap(m.x, m.y);
  assert.ok(r.tags.includes('perfect'));
});

test('반짝이 표본은 더 크게 자란다', () => {
  const { g, w } = setup();
  const a = place(w, 'dandelion', 100, 250);
  const ra = w.tap(a.x, a.y);
  g.run.combo = 0;
  const b = place(w, 'dandelion', 300, 250, { shiny: true });
  const rb = w.tap(b.x, b.y);
  assert.ok(rb.tags.includes('shiny'));
  assert.ok(rb.result.gain > ra.result.gain * 3.5);
});

test('아슬아슬: 시선 가장자리 바로 밖에서 빔을 쏘면 보너스', () => {
  const { g, w } = setup();
  const h = w.humans[0];
  // 기체 몸통 반지름 = 46 * 0.45 ≈ 20.7, 시선 반폭 40 → 여유 10px
  Object.assign(h, { state: 'look', t: 5, gw: 40, gx: 195 - 40 - 20.7 - 10 });
  let near = 0;
  w.on('nearMiss', () => near++);
  const sp = place(w, 'dandelion', 300, 250);
  const before = g.run.size;
  w.tap(sp.x, sp.y);
  assert.equal(near, 1);
  assert.equal(g.state.stats.nearMisses, 1);
  assert.ok(g.run.size > before);
});

test('두 시선이 동시에 기체를 보면 동시 목격(바이럴)', () => {
  const { g, w } = setup({ gameRng: always(0) });
  Object.assign(w.humans[0], { state: 'look', t: 5, gw: 40, gx: 195 });
  w.sources.push({ id: 5, kind: 'window', cause: 'window_peek', phase: 'on', t: 2, gx: 200, gw: 40, vx: 0, ox: 0, oy: 0 });
  const sp = place(w, 'dandelion', 120, 250);
  w.tap(sp.x, sp.y);
  assert.equal(g.state.lastReport.cause, 'viral');
});

test('변명이 통하면 세계가 이어진다', () => {
  const { g, w } = setup({ gameRng: always(0) });
  Object.assign(w.humans[0], { state: 'look', t: 5, gw: 40, gx: 195 });
  const sp = place(w, 'dandelion', 120, 250);
  w.tap(sp.x, sp.y);
  assert.equal(g.phase, 'discovered');
  assert.ok(g.canExcuse);
  const res = g.excuse('balloon');
  assert.ok(res.ok && res.success);
  w.recover();
  assert.equal(g.phase, 'play');
  assert.equal(sp.state, 'fade');
  assert.equal(w.humans[0].state, 'walk');
  assert.equal(g.uniqueCauses, 0, '도감에서도 지워진다');
  assert.ok(!g.canExcuse, '대원마다 한 번');
});

test('뇌우: 번개가 칠 때 숨지 않으면 들킬 수 있다', () => {
  const { g, w } = setup({ gameRng: always(0) });
  w.weather = { kind: 'storm', t: 999 };
  w.flashT = 0.5;
  let warned = false;
  w.on('lightningWarn', () => (warned = true));
  for (let i = 0; i < 40 && g.phase === 'play'; i++) w.update(0.02);
  assert.ok(warned);
  assert.equal(g.state.lastReport.cause, 'lightning');
});
