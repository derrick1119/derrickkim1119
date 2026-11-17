// 자동 플레이: 대본대로 실제 규칙 위에서 움직여 본다 (브라우저에서도 쓴다)
//   R L N        방향 (오른쪽 / 왼쪽 / 멈춤)
//   J j J0.2     점프 (길게 / 짧게 / 누르는 시간)
//   on off       전구 켜기 / 끄기        flash0.4  잠깐 켰다 끄기
//   G+ G-        상자 잡기 / 놓기
//   >x <x        그 x 를 지날 때까지      A  땅에 닿을 때까지
//   W0.5         기다리기 (초)            ?식  식이 참이 될 때까지 (w: 세계, p: 주인공)
import { World, DT } from '../js/world.js';

export function runGhost(level, script, opt = {}) {
  const w = opt.world || new World(level);
  const inp = { ax: 0, jump: false, light: false, grab: false };
  const log = [];
  let jumpT = 0, pulse = 0, offAt = -1, cracks = 0, deaths = 0, fail = null;
  const tick = () => {
    if (offAt >= 0 && w.t >= offAt) { offAt = -1; if (w.p.lit) pulse = 1; }
    inp.light = pulse > 0; if (pulse > 0) pulse--;
    if (jumpT > 0) { jumpT -= DT; if (jumpT <= 0) inp.jump = false; }
    w.step(inp, DT);
    for (const e of w.events) {
      if (e.type === 'crack') { cracks++; log.push(`  ! crack(${e.cause}) x=${w.p.x.toFixed(2)} t=${w.t.toFixed(2)}`); }
      if (e.type === 'shatter') { deaths++; log.push(`  ! shatter(${e.cause}) x=${w.p.x.toFixed(2)} t=${w.t.toFixed(2)}`); }
      if (opt.onEvent) opt.onEvent(e, w);
    }
    if (!opt.keepEvents) w.events.length = 0;
  };
  const until = (fn, what, max = 40) => {
    let n = Math.round(max / DT);
    while (!fn()) { tick(); if (--n <= 0 || (opt.strict !== false && deaths)) { fail = `${what} — 멈춤 (x=${w.p.x.toFixed(2)} y=${w.p.y.toFixed(2)} t=${w.t.toFixed(2)})`; return false; } }
    return true;
  };
  const n = opt.upto ?? script.length;
  for (let i = 0; i < n && !fail; i++) {
    const c = script[i], p = w.p;
    if (c === 'R') inp.ax = 1; else if (c === 'L') inp.ax = -1; else if (c === 'N') inp.ax = 0;
    else if (c[0] === 'J' || c[0] === 'j') {
      if (inp.jump) { inp.jump = false; tick(); }
      inp.jump = true; jumpT = c.length > 1 ? +c.slice(1) : (c[0] === 'J' ? 0.5 : 0.06);
      tick();
    }
    else if (c === 'on') { if (!p.lit) { pulse = 1; tick(); } }
    else if (c === 'off') { if (p.lit) { pulse = 1; tick(); } }
    else if (c.startsWith('flash')) { if (!p.lit) { pulse = 1; tick(); } offAt = w.t + (+c.slice(5) || 0.3); }
    else if (c === 'G+') inp.grab = true; else if (c === 'G-') inp.grab = false;
    else if (c[0] === '>') { const x = +c.slice(1); until(() => w.p.x >= x, c); }
    else if (c[0] === '<') { const x = +c.slice(1); until(() => w.p.x <= x, c); }
    else if (c === 'A') until(() => w.p.ground, c, 6);
    else if (c[0] === 'W') { const t1 = w.t + +c.slice(1); until(() => w.t >= t1, c); }
    else if (c[0] === '?') { const f = new Function('w', 'p', 'return ' + c.slice(1)); until(() => f(w, w.p), c); }
    else fail = '모르는 명령: ' + c;
    if (opt.verbose) log.push(`${String(i).padStart(3)} ${c.padEnd(28)} x=${w.p.x.toFixed(2)} y=${w.p.y.toFixed(2)} t=${w.t.toFixed(2)} ${w.p.lit ? '☀' : '·'}${w.p.cracked ? ' 금' : ''}`);
    if (fail) log.push(`  ✗ [${i}] ${fail}`);
  }
  return { ok: !fail, fail, world: w, t: w.t, cracks, deaths, flowers: w.bloomed, ended: w.ended, log };
}
