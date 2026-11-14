// THE LAMP: 작은 밤들 — 풀이기 (너비 우선 탐색). 스테이지 검증, 최소 턴 계산, 게임 안의 힌트에 쓴다.
import { step, initialState, stateKey, ACTIONS, allFlowers } from './rules.js';

// opts.from      시작 상태 (없으면 스테이지 처음)
// opts.max       살펴볼 상태 수 한도
// opts.noToggle  스위치 없이 풀리는지 볼 때
// opts.wantFull  빛꽃을 모두 피우는 길까지 찾을지
// 돌려주는 값: { any, full, states, capped }  — any/full 은 { turns, path } 또는 null
export function solve(L, opts = {}) {
  const start = opts.from || initialState(L);
  const max = opts.max || 400000, wantFull = opts.wantFull !== false;
  const full = allFlowers(L);
  const acts = opts.noToggle ? ACTIONS.filter((a) => a !== 'T') : ACTIONS;
  const states = [start], parent = [-1], act = [''], depth = [0];
  const seen = new Set([stateKey(start)]);
  let any = null, fullSol = null, capped = false;
  const pathTo = (i, last) => {
    const out = [last];
    for (let k = i; parent[k] >= 0; k = parent[k]) out.push(act[k]);
    return out.reverse().join('');
  };
  for (let h = 0; h < states.length; h++) {
    const s = states[h];
    if (any && (!wantFull || fullSol)) break;
    for (const a of acts) {
      const r = step(L, s, a);
      if (!r.ok || r.fail) continue;
      if (r.win) {
        const turns = depth[h] + 1;
        if (!any) any = { turns, path: pathTo(h, a) };
        if (!fullSol && r.s.fl === full) fullSol = { turns, path: pathTo(h, a) };
        continue;
      }
      const k = stateKey(r.s);
      if (seen.has(k)) continue;
      seen.add(k);
      states.push(r.s); parent.push(h); act.push(a); depth.push(depth[h] + 1);
    }
    if (states.length > max) { capped = true; break; }
  }
  if (!wantFull) fullSol = null;
  return { any, full: fullSol, states: states.length, capped };
}

// 풀이를 그대로 따라가며 무슨 일이 일어나는지 센다
export function replay(L, path) {
  let s = initialState(L);
  const c = { turns: 0, toggles: 0, pushes: 0, lanterns: 0, falls: 0, cracks: 0, blooms: 0, win: false, fail: false, ok: true };
  for (const a of path) {
    const r = step(L, s, a);
    if (!r.ok) { c.ok = false; break; }
    c.turns++;
    for (const e of r.ev) {
      if (e.type === 'toggle') c.toggles++;
      else if (e.type === 'push') c.pushes++;
      else if (e.type === 'lantern') c.lanterns++;
      else if (e.type === 'shadowFall') c.falls++;
      else if (e.type === 'crack') c.cracks++;
      else if (e.type === 'bloom') c.blooms++;
    }
    s = r.s;
    if (r.fail) { c.fail = true; break; }
    if (r.win) { c.win = true; break; }
  }
  c.state = s;
  return c;
}
