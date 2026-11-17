// THE LAMP: 빛의 사도 — 네 개의 길
// 타일: 0 빈 곳, 1 흙·돌, 2 나무, 3 창살
function make(id, w, h, theme, fn) {
  const tiles = new Uint8Array(w * h);
  const L = { id, w, h, theme, tiles, vessels: [], day: [], night: [], crystals: [], gates: [], lichens: [], ropes: [], slabs: [], shrines: [], creatures: [], whispers: [], figures: [], arches: [] };
  const B = {
    set: (x, y, v = 1) => { if (x >= 0 && x < w && y >= 0 && y < h) tiles[y * w + x] = v; },
    col: (x0, x1, top, bot = h - 1, v = 1) => { for (let x = x0; x <= x1; x++) for (let y = top; y <= bot; y++) B.set(x, y, v); },
    clear: (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) B.set(x, y, 0); },
    vessel: (kind, x, y, o = {}) => L.vessels.push({ kind, x, y, ...o }),
    day: (x0, x1, y) => { for (let x = x0; x <= x1; x++) L.day.push({ x, y }); },
    night: (x0, x1, y) => { for (let x = x0; x <= x1; x++) L.night.push({ x, y }); },
    crystal: (id, x, y) => L.crystals.push({ id, x, y }),
    // 문: 수정이나 이끼가 켜지면 열린다. 위에 아치를 얹어 넘어갈 수 없게 한다.
    gate: (id, x, y, hgt = 3, arch = true) => { L.gates.push({ id, x, y: y - hgt, w: 1, h: hgt }); if (arch) { B.col(x - 1, x + 1, Math.max(0, y - hgt - 7), y - hgt - 1); L.arches.push({ x0: x - 1, x1: x + 1, y: y - hgt }); } },
    trap: (id, x, y, wd = 2) => { for (let i = 0; i < wd; i++) B.set(x + i, y, 0); L.gates.push({ id, x, y, w: wd, h: 1, trap: true }); },
    lichen: (id, x, y) => L.lichens.push({ id, x, y }),
    // 밧줄에 매달린 통나무 다리: 틈 안쪽 양 끝에 턱을 두어 떨어지면 길과 같은 높이에 걸린다
    bridge: (x0, x1, y, hangY, ropeX) => {
      B.set(x0, y + 1); B.set(x1, y + 1);
      L.slabs.push({ x: x0, y: hangY, w: x1 - x0 + 1, h: 1, restY: y });
      L.ropes.push({ x: ropeX, y0: y - 1.6, y1: y, slab: L.slabs.length - 1 });
    },
    shrine: (x, y) => L.shrines.push({ x, y }),
    cr: (kind, x, y, o = {}) => { L.creatures.push({ kind, x, y, ...o }); return L.creatures.length - 1; },
    whisper: (x0, x1, key, o = {}) => L.whispers.push({ x0, x1, key, ...o }),
    figure: (who, x, y, o = {}) => L.figures.push({ who, x, y, ...o }),
  };
  fn(B, L);
  return L;
}

// ── 1. 꺼진 숲길: 등불 ─────────────────────────────────────────
const forest = make('forest', 120, 22, 'forest', (B, L) => {
  B.col(0, 1, 3); B.col(2, 17, 14); B.col(11, 12, 13, 13);
  L.start = { x: 3.6, y: 12.5 };
  B.figure('day', 2.7, 14);
  B.vessel('lantern', 6.5, 14);
  B.whisper(2, 9, 'w_enter');
  // 낮의 돌 다리
  B.day(18, 21, 14); B.col(22, 29, 14);
  B.whisper(13, 17.5, 'w_day');
  // 밤의 돌 계단
  B.night(28, 28, 13); B.night(29, 29, 12); B.col(30, 33, 11);
  B.whisper(23, 29, 'w_night');
  B.col(34, 79, 14);
  B.shrine(36.5, 14);
  // 첫 어둑이와 수정 문
  B.whisper(38, 43, 'w_flash');
  B.cr('dusky', 44.5, 14, { hostile: true });
  B.crystal('a', 49.5, 13.3); B.gate('a', 53, 14);
  // 바위 밑 굴: 등불만 지나갈 수 있다. 안에는 잠든 어둑이 둘, 굴 끝에는 나방.
  B.col(58, 72, 6, 12);
  B.cr('dusky', 62.5, 14, { sleep: true, leash: 1.2 }); B.cr('dusky', 66.5, 14, { sleep: true, leash: 1.2 });
  B.cr('moth', 73, 10.5);
  B.shrine(77.5, 14);
  // 낮의 돌에서 밤의 돌로: 공중에서 끈다
  B.day(80, 82, 14); B.night(83, 85, 14); B.col(86, 119, 14);
  B.whisper(76, 80, 'w_switch');
  B.cr('dusky', 91.5, 14, { hostile: true });
  // 기둥 위의 수정
  B.night(99, 99, 13); B.night(100, 100, 12); B.col(101, 103, 11);
  B.crystal('b', 102.5, 10.3); B.gate('b', 107, 14);
  // 훔쳐 간 가로등. 꺼진 등 밑에서 새끼들이 자고 있다.
  L.goal = { x: 113.5, y: 14 };
  for (const x of [112.3, 113.1, 114.7]) B.cr('little', x, 14, { sleep: true, burrow: 117.3, leash: 2.8 });
  B.figure('night', 116.4, 14, { flee: true });
  B.col(118, 119, 3);
});

// ── 2. 버려진 성: 검 (그리고 등불) ───────────────────────────────
const castle = make('castle', 114, 24, 'castle', (B, L) => {
  B.col(0, 1, 3); B.col(2, 9, 14);
  L.start = { x: 3.6, y: 12.5 };
  B.vessel('sword', 5.5, 14);
  B.whisper(2, 9, 'w_sword');
  // 밧줄을 끊으면 다리가 내려온다
  B.bridge(10, 13, 14, 8, 8.6);
  // 나무 벽: 검이 박힌다
  B.col(14, 49, 14); B.col(24, 49, 8); B.col(22, 23, 8, 13, 2);
  B.whisper(15, 21.5, 'w_wood');
  B.shrine(26.5, 8);
  B.cr('dusky', 32.5, 8, { hostile: true, leash: 3 }); B.cr('dusky', 38.5, 8, { hostile: true, leash: 3 });
  B.crystal('a', 42.5, 7.3); B.gate('a', 45, 8);
  // 안뜰: 등불이 놓여 있다. 검을 벽에 박아 두면 등불의 디딤판이 된다.
  B.col(50, 62, 14);
  B.vessel('lantern', 53.5, 14);
  B.whisper(50, 58, 'w_ledge');
  B.col(63, 71, 11); B.col(62, 62, 11, 13, 2);
  B.cr('moth', 64.5, 7.5);
  // 등불을 가운데 기둥에 세워 두고, 검이 건넌다
  B.col(75, 76, 11); B.day(72, 74, 11); B.day(77, 79, 11);
  B.whisper(66, 71.5, 'w_park');
  B.col(80, 83, 11); B.col(89, 113, 11);
  B.shrine(81.5, 11);
  B.bridge(84, 88, 11, 6, 82.7);
  // 지키는 것. 위로는 밤의 돌 계단 — 어둠 속에서만 있는 길.
  B.col(95, 101, 6, 8);
  B.col(90, 90, 10, 10);
  B.night(92, 92, 8); B.night(93, 93, 7); B.night(94, 94, 6);
  const brood = [99.7, 100.3, 100.9].map((x) => B.cr('little', x, 11, { still: true, burrow: 104.4, leash: 0.4 }));
  B.cr('guardian', 98.4, 11, { hp: 2, brood });
  L.goal = { x: 107.5, y: 11 };
  B.figure('night', 110.4, 11, { flee: true });
  B.col(112, 113, 3);
});

// ── 3. 별 보는 절벽: 활 ────────────────────────────────────────
const cliff = make('cliff', 114, 24, 'cliff', (B, L) => {
  B.col(0, 1, 3); B.col(2, 12, 14);
  L.start = { x: 3.6, y: 12.5 };
  B.vessel('bow', 5.5, 14);
  B.whisper(2, 9, 'w_bow');
  // 멀리 매달린 수정 두 개를 쏘면 낮의 돌 다리가 놓인다
  B.day(13, 20, 14); B.crystal('x', 15, 13.4); B.crystal('x', 19, 13.4);
  B.col(21, 60, 14);
  // 나무 벽에 화살을 꽂아 디딤판으로
  B.col(35, 60, 10); B.col(34, 34, 10, 13, 2);
  B.whisper(24, 33, 'w_peg');
  B.shrine(37.5, 10);
  // 켜진 채 버려진 등불, 그리고 반딧불이 이끼: 어두워야 모인다
  B.vessel('lantern', 44.5, 10, { on: true });
  B.cr('dusky', 39.6, 10, { leash: 2 }); B.cr('dusky', 49.8, 10, { leash: 2 });
  B.lichen('c', 47, 9.6); B.gate('c', 53, 10);
  B.whisper(41, 50, 'w_lichen');
  // 건너편 말뚝의 밧줄. 그 사이에 나방이 떠 있다.
  B.col(67, 81, 10);
  B.bridge(61, 66, 10, 5, 68.6);
  B.cr('moth', 63.5, 9.3);
  B.shrine(70.5, 10);
  // 나무 굴뚝: 화살을 번갈아 꽂으며 오른다
  B.col(82, 85, 10); B.col(82, 82, 4, 7, 2); B.col(85, 85, 4, 9, 2);
  B.col(86, 113, 4);
  B.whisper(76, 84, 'w_shaft');
  B.shrine(88.5, 4);
  // 지키는 것. 가만히 어둠 속에 서 있으면 반딧불이가 바닥문을 연다.
  B.lichen('d', 92.5, 3.6);
  B.clear(94, 103, 5, 6); B.trap('d', 94, 4); B.clear(101, 103, 4, 4);
  B.set(102, 6); B.set(103, 5); B.set(103, 6);
  B.col(96, 101, 0, 1);
  const brood = [99.7, 100.3].map((x) => B.cr('little', x, 4, { still: true, burrow: 102.5, leash: 0.4 }));
  B.cr('guardian', 98.5, 4, { hp: 2, brood });
  L.goal = { x: 108.5, y: 4 };
  B.figure('note', 110.3, 4);
  B.col(112, 113, 0);
});

// ── 4. 밤의 정원: 무엇에 깃들지 고른다 ───────────────────────────
const garden = make('garden', 84, 22, 'garden', (B, L) => {
  B.col(0, 1, 3); B.col(2, 21, 14);
  L.start = { x: 3.6, y: 12.5 };
  B.vessel('lantern', 5.5, 14); B.vessel('sword', 8.5, 14); B.vessel('bow', 11.5, 14);
  B.whisper(2, 12, 'w_choose');
  // 수정 위에서 자는 어둑이
  B.crystal('a', 16.5, 13.3); B.gate('a', 20, 14);
  B.cr('dusky', 16.5, 14, { sleep: true, leash: 3 });
  for (const x of [12.6, 13.6, 18.4]) B.cr('little', x, 14, { leash: 1.6 });
  // 위는 낮의 돌(나방이 산다), 아래는 밤꽃 길
  B.day(22, 31, 14); B.night(22, 30, 16); B.col(31, 31, 15); B.col(32, 83, 14);
  B.cr('moth', 26.5, 11.6);
  B.shrine(34.5, 14);
  for (const x of [38.5, 41.5, 44.5, 47.5]) B.cr('dusky', x, 14, { leash: 1.4 });
  // 지키는 것과 그 밑의 길
  B.lichen('b', 51.5, 13.6);
  B.clear(53, 62, 15, 16); B.trap('b', 53, 14); B.clear(60, 62, 14, 14);
  B.set(61, 16); B.set(62, 15); B.set(62, 16);
  B.col(55, 60, 9, 11);
  const brood = [58.7, 59.3, 59.9].map((x) => B.cr('little', x, 14, { still: true, burrow: 61.5, leash: 0.4 }));
  B.cr('guardian', 57.5, 14, { hp: 3, brood });
  // 큰 등
  L.goal = { x: 70.5, y: 14, great: true };
  B.figure('night', 73.4, 14); B.figure('day', 67.2, 14, { late: true });
  B.col(82, 83, 3);
});

export const LEVELS = [forest, castle, cliff, garden];
export const TOTAL_STARS = LEVELS.reduce((n, l) => n + l.creatures.length, 0);
