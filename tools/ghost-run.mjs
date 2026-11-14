// 고스트 대본 실행기 (Node 와 브라우저 양쪽에서 쓴다). 명령 설명은 tools/ghosts.mjs 맨 위.
import { World, T } from '../js/world.js';

const DT = 1 / 120;

// world 를 넘기면 그 세계를 이어서 몰고, upto 를 주면 그 명령 수까지만 실행한다 (스크린샷용)
export function runGhost(level, steps, { verbose = false, strict = true, world = null, upto = Infinity } = {}) {
  const w = world || new World(level);
  let dir = 0, jumpT = 0, lightT = 0, total = 0;
  const b = w.bulb;
  const pos = () => `x=${(b.x / T).toFixed(2)} y=${(b.y / T).toFixed(2)} vx=${b.vx.toFixed(0)} vy=${b.vy.toFixed(0)} ${b.on ? 'on' : 'off'}${b.cracked ? ' CRACKED' : ''}${b.grounded ? ' g' : ''}`;
  let fail = null;
  const tick = () => {
    w.input.ax = dir; w.input.jump = jumpT > 0; w.input.light = lightT > 0;
    w.step(DT);
    jumpT -= DT; lightT -= DT; total += DT;
    for (const e of w.events) {
      if (e.type === 'shatter' && !fail) fail = `깨짐(${e.cause})`;
      if (e.type === 'crack' && strict && !fail) fail = '금이 감';
    }
    w.events.length = 0;
  };
  const waitFor = (cond, limit = 9) => {
    let t = 0;
    while (!cond()) {
      tick(); t += DT;
      if (fail) return false;
      if (w.state === 'clear') return cond();
      if (t > limit) { fail = '시간 초과'; return false; }
    }
    return true;
  };

  for (let i = 0; i < steps.length && i < upto && !fail; i++) {
    const s = steps[i];
    let m;
    if (s === 'R') dir = 1;
    else if (s === 'L') dir = -1;
    else if (s === 'N') dir = 0;
    else if (s === 'J') { jumpT = 0.45; tick(); }
    else if (s === 'j') { jumpT = 0.05; tick(); }
    else if ((m = /^J([\d.]+)$/.exec(s))) { jumpT = +m[1]; tick(); }
    else if (s === 'on' || s === 'off') {
      const want = s === 'on';
      if (b.on !== want) { lightT = 0.03; waitFor(() => b.on === want, 1); lightT = 0; tick(); }
    } else if ((m = /^>([\d.]+)$/.exec(s))) waitFor(() => b.x / T >= +m[1]);
    else if ((m = /^<([\d.]+)$/.exec(s))) waitFor(() => b.x / T <= +m[1]);
    else if ((m = /^y>([\d.]+)$/.exec(s))) waitFor(() => b.y / T >= +m[1]);
    else if ((m = /^y<([\d.]+)$/.exec(s))) waitFor(() => b.y / T <= +m[1]);
    else if (s === 'G') { tick(); waitFor(() => b.grounded); }
    else if (s === 'A') { tick(); waitFor(() => b.vy >= 0); }
    else if ((m = /^W([\d.]+)$/.exec(s))) { const end = total + +m[1]; waitFor(() => total >= end, +m[1] + 1); }
    else if (s === 'stop') {
      const keep = dir;
      waitFor(() => { dir = Math.abs(b.vx) < 14 ? 0 : b.vx > 0 ? -1 : 1; return Math.abs(b.vx) < 14 && b.grounded; }, 4);
      dir = 0; void keep;
    } else if ((m = /^F(\d)$/.exec(s))) waitFor(() => w.got >= +m[1], 4);
    else if ((m = /^K(\d)$/.exec(s))) waitFor(() => w.lanterns.filter((l) => l.lit).length >= +m[1], 4);
    else if (s[0] === '?') { const f = new Function('w', 'b', 'T', 'return ' + s.slice(1)); waitFor(() => f(w, b, T), 14); }
    else throw new Error(`알 수 없는 명령: ${s}`);
    if (verbose) console.log(`  ${String(i).padStart(3)} ${s.padEnd(7)} ${pos()}${fail ? '   ← ' + fail : ''}`);
    if (fail) { fail = `${i}번째 명령 "${s}" 에서 ${fail} (${pos()})`; break; }
    if (w.state === 'clear') break;
  }
  if (!fail && w.state !== 'clear' && upto === Infinity) {
    // 대본이 끝난 뒤 조금 더 굴려 본다
    waitFor(() => w.state === 'clear', 3);
    if (w.state !== 'clear') fail = `출구에 닿지 못함 (${pos()})`;
  }
  return { ok: !fail, fail, time: w.time, got: w.got, flowers: w.flowers.length, cracks: w.cracks, breaks: w.breaks, toggles: w.toggles };
}

