// 자동 플레이: 대본대로 실제 규칙 위에서 움직여 본다 (브라우저에서도 쓴다)
//   R L N        좌우 (오른쪽 / 왼쪽 / 멈춤)        U D V   위 / 아래 / 놓기 (빛 알갱이의 비행, 활의 조준, 검의 미끄러짐)
//   J j J0.2     점프 (길게 / 짧게 / 누르는 시간)      IJ:식   식이 참일 때만 점프
//   F:x,y        빛 알갱이로 (x,y) 까지 날아가기
//   X            하는 일 (등불 켜고 끄기 · 검 휘두르기 · 활 쏘기)      P   깃들기 / 나오기
//   on off       등불을 그 상태로
//   >x <x        사도가 그 x 를 지날 때까지       ^y vy   그 y 보다 위로 / 아래로 갈 때까지
//   A            깃든 몸이 땅에 닿을 때까지       W0.5    기다리기 (초)
//   ?식          식이 참이 될 때까지 (w 세계, S 상태, v 깃든 몸, a 사도의 자리, L 길)
import { World, DT } from '../js/world.js';

export function runGhost(level, script, opt = {}) {
  const w = opt.world || new World(level);
  const inp = { ax: 0, ay: 0, jump: false, act: false, pos: false };
  const log = [], out = [];
  let jumpT = 0, tapX = 0, tapP = 0, hurts = 0, fades = 0, fail = null;
  const tick = () => {
    inp.act = tapX > 0; if (tapX > 0) tapX--;
    inp.pos = tapP > 0; if (tapP > 0) tapP--;
    if (jumpT > 0) { jumpT -= DT; if (jumpT <= 0) inp.jump = false; }
    w.step(inp, DT);
    for (const e of w.events) {
      if (e.type === 'hurt') { hurts++; log.push(`  ! 다침 x=${w.pos().x.toFixed(2)} t=${w.S.t.toFixed(2)}`); }
      if (e.type === 'fade') { fades++; log.push(`  ! 꺼짐 x=${w.pos().x.toFixed(2)} t=${w.S.t.toFixed(2)}`); }
      if (e.type === 'putOut') { out.push(`${e.kind}:${e.cause}`); log.push(`  · 꺼뜨림 ${e.kind}(${e.cause}) x=${e.x.toFixed(1)}`); }
      if (opt.onEvent) opt.onEvent(e, w);
    }
    if (!opt.keepEvents) w.events.length = 0;
  };
  const where = () => { const a = w.pos(); return `x=${a.x.toFixed(2)} y=${a.y.toFixed(2)} t=${w.S.t.toFixed(2)}`; };
  const until = (fn, what, max = 30) => {
    let n = Math.round(max / DT);
    while (!fn()) { tick(); if (--n <= 0 || (opt.strict !== false && fades)) { fail = `${what} — 멈춤 (${where()})`; return false; } }
    return true;
  };
  const n = opt.upto ?? script.length;
  for (let i = 0; i < n && !fail; i++) {
    const c = script[i];
    if (c === 'R') inp.ax = 1; else if (c === 'L') inp.ax = -1; else if (c === 'N') inp.ax = 0;
    else if (c === 'U') inp.ay = -1; else if (c === 'D') inp.ay = 1; else if (c === 'V') inp.ay = 0;
    else if (c[0] === 'J' || c[0] === 'j') { if (inp.jump) { inp.jump = false; tick(); } inp.jump = true; jumpT = c.length > 1 ? +c.slice(1) : (c[0] === 'J' ? 0.5 : 0.06); tick(); }
    else if (c.startsWith('IJ:')) { const f = new Function('w', 'S', 'v', 'a', 'L', 'return ' + c.slice(3)); if (f(w, w.S, w.host, w.pos(), w.L)) { if (inp.jump) { inp.jump = false; tick(); } inp.jump = true; jumpT = 0.5; tick(); } }
    else if (c.startsWith('F:')) {      // 빛 알갱이로 그 자리까지 날아간다
      const [x, y] = c.slice(2).split(',').map(Number);
      until(() => { const p = w.pos(), dx = x - p.x, dy = y - p.y; inp.ax = Math.abs(dx) > 0.15 ? Math.sign(dx) : 0; inp.ay = Math.abs(dy) > 0.15 ? Math.sign(dy) : 0; return Math.hypot(dx, dy) < 0.6; }, c, 12);
      inp.ax = 0; inp.ay = 0;
    }
    else if (c === 'X') { tapX = 1; tick(); tick(); }
    else if (c === 'P') { tapP = 1; tick(); tick(); }
    else if (c === 'on' || c === 'off') { const v = w.host; if (v && v.kind === 'lantern' && v.on !== (c === 'on')) { tapX = 1; tick(); tick(); } }
    else if (c[0] === '>') { const x = +c.slice(1); until(() => w.pos().x >= x, c); }
    else if (c[0] === '<') { const x = +c.slice(1); until(() => w.pos().x <= x, c); }
    else if (c[0] === '^') { const y = +c.slice(1); until(() => w.pos().y <= y, c); }
    else if (c[0] === 'v') { const y = +c.slice(1); until(() => w.pos().y >= y, c); }
    else if (c === 'A') until(() => w.host && w.host.ground, c, 6);
    else if (c[0] === 'W') { const t1 = w.S.t + +c.slice(1); until(() => w.S.t >= t1, c); }
    else if (c[0] === '?') { const f = new Function('w', 'S', 'v', 'a', 'L', 'return ' + c.slice(1)); until(() => f(w, w.S, w.host, w.pos(), w.L), c); }
    else fail = '모르는 명령: ' + c;
    if (opt.verbose) { const v = w.host; log.push(`${String(i).padStart(3)} ${c.padEnd(30)} ${where()} ${v ? v.kind + (v.kind === 'lantern' ? (v.on ? '☀' : '·') : '') + (v.stuck ? ' 박힘' : '') : '빛알'} ♥${w.S.pips}`); }
    if (fail) log.push(`  ✗ [${i}] ${fail}`);
  }
  return { ok: !fail, fail, world: w, t: w.playT, hurts, fades, out, alive: w.alive, total: w.total, done: w.S.done, log };
}
