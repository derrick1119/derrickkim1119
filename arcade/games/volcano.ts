/**
 * 화산섬 키우기 (19라운드 디오라마 메뉴 4번) — 농사·수확 × 꾹 눌렀다 떼기 × 꾸미기.
 * 기준 9(손이 하는 일은 하나): 꾹 누르면 화산에 용암이 차오르고, 떼면 분화구 주둥이가 그 순간 가리키는 쪽으로 흐른다.
 *   주둥이는 천천히 돈다 → '언제 뗄지'가 방향, '얼마나 누를지'가 양. 누르는 동안 흐를 자리가 미리 보인다.
 * 와우: 용암이 바다에 닿으면 '치익' 김이 오르며 새 땅이 되고, 식은 땅엔 풀 → 숲 → 동물이 차례로 자란다.
 * 고민: 세게 터뜨릴수록 새 땅은 넓지만 가는 길(골짜기)도 넓어져 이미 자란 숲·마을을 덮는다. 섬이 클수록 바다까지 멀다.
 * 판 = 하루. 해 질 때까지 섬 넓이·생명 목표를 채우면 별 1~3개, 못 채우면 하트 -1 그날 다시. 7일째까지 키운 섬이 점수.
 * 펼쳐짐: 풀·숲·동물(1일) → 마을(2일, 덮으면 큰 손해·집이 퍼짐) → 비구름(3일, 그 아래론 용암이 못 감·풀이 빨리 자람)
 *        → 두 번째 분화구(4일, 반대쪽으로도 흐름) → 작은 섬(5일, 이으면 내 섬) → 바람(6일, 주둥이가 거꾸로)
 *        · 섬 모양 보너스(곶 끝 등대 · 오목한 만의 항구 · 바다를 감싸면 온천).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const N = 15, C = 7, CI = C * N + C, NN = N * N, A = 1.1;
const DAY = 1200, NIGHT = 110, DAYS = 7, FULL = 90, COOL = 70, SPIN = (Math.PI * 2) / 500, VMIN = 2, VMAX = 12;
const SEA = 0, LAVA = 1, ROCK = 2, GRASS = 3, FOREST = 4, ANIMAL = 5, HOUSE = 6, CRATER = 7, VENT = 8;
const LIGHT = 1, HARBOR = 2, SPRING = 3;
const LIFE = [0, 0, 0, 1, 2, 4, 6, 0, 0];
const FEAT_LIFE = [0, 8, 8, 4];
/** 자라는 데 드는 양: 식은 땅 → 풀(혼자 6초) → 숲(혼자 12초) → 동물(숲이 셋 이상 모이면 13초). 덮인 숲은 하루가 넘게 걸려야 되돌아온다 */
const G_GRASS = 360, G_FOREST = 700, G_ANIMAL = 800;
const ERUPTS = [3, 3, 4, 4, 4, 4, 4];
/** 날마다 해 질 녘 목표 ★·★★·★★★ (섬 넓이 칸 · 생명 — 별은 둘 다 넘어야). 앞서 키워 둔 섬이 다음 날을 쉽게 한다 */
const GOAL_A = [[30, 46, 52], [50, 68, 80], [72, 92, 110], [105, 118, 128], [125, 138, 148], [140, 152, 160], [155, 162, 168]];
const GOAL_L = [[20, 50, 70], [120, 155, 185], [240, 285, 320], [360, 410, 455], [450, 500, 545], [520, 565, 610], [580, 625, 670]];

const NB4: number[][] = [], NB8: number[][] = [];
for (let k = 0; k < NN; k++) {
  const x = k % N, y = (k / N) | 0, a: number[] = [], b: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if ((!dx && !dy) || X < 0 || Y < 0 || X >= N || Y >= N) continue;
      b.push(Y * N + X);
      if (!dx || !dy) a.push(Y * N + X);
    }
  NB4.push(a);
  NB8.push(b);
}
const dist = (k: number) => Math.hypot((k % N) - C, ((k / N) | 0) - C);
const maxH = (k: number) => (dist(k) < 1.5 ? 4 : dist(k) < 3 ? 3 : 2);
const ANIMALS = ['🦌', '🐇', '🐿️', '🦊', '🐑', '🦔'];
const hsh = (k: number) => ((Math.imul(k + 1, 2654435761) >>> 0) % 10007) / 10007;

export interface Isle { kind: Uint8Array; g: Float32Array; h: Uint8Array; feat: Uint8Array; islet: Uint8Array; vent: number; linked: boolean }
interface Ev { t: number; kind: string; k: number; text?: string }
interface Note { t: number; text: string; color: string }
export interface VolcanoState {
  rng: Rng; t: number; day: number; dayT: number; phase: 'day' | 'night'; pause: number; retry: boolean; won: boolean;
  isle: Isle; jit: Float32Array; spin0: number; spinDir: number;
  left: number; erupts: number; charge: number; pending: { i: number; at: number }[]; flowNew: number; flowLost: number; fast: boolean;
  areaGoal: number; lifeGoal: number; startLife: number; area: number; life: number; main: Uint8Array; open: Uint8Array;
  hearts: number; stars: number; cleared: number; dayStars: number;
  seen: Set<string>; events: Ev[]; notes: Note[]; dead: boolean;
}

const ev = (s: VolcanoState, kind: string, k: number, text?: string) => s.events.push({ t: s.t, kind, k, text });
const note = (s: VolcanoState, text: string, color = '#ffffff') => s.notes.push({ t: s.t, text, color });
function see(s: VolcanoState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  note(s, text, '#ffe08a');
}

/** 주둥이 방향 (격자 각도). 하루 시작 각도에서 일정하게 돈다 — 봇도 같은 함수로 앞을 내다본다 */
export const thetaAt = (s: VolcanoState, dayT: number) => s.spin0 + s.spinDir * SPIN * dayT;
/** 누른 시간 → 용암 양 (바다 한 칸 = 1, 땅 위로 흐르는 칸 = 0.25) */
export const vol = (hold: number) => VMIN + (VMAX - VMIN) * Math.min(1, hold / FULL);
/** 비구름 (3일째부터): 섬 위를 천천히 떠돈다 */
export function rainAt(day: number, dayT: number) {
  if (day < 2) return null;
  const a = dayT * 0.0045 + day * 1.7, rho = 4.4 + 1.2 * Math.sin(dayT * 0.011 + day);
  return { x: C + 0.5 + rho * Math.cos(a), y: C + 0.5 + rho * Math.sin(a), r: 2.1 };
}
function rainMask(day: number, dayT: number): Uint8Array | null {
  const c = rainAt(day, dayT);
  if (!c) return null;
  const m = new Uint8Array(NN);
  for (let k = 0; k < NN; k++) if (Math.hypot((k % N) + 0.5 - c.x, ((k / N) | 0) + 0.5 - c.y) < c.r) m[k] = 1;
  return m;
}

export interface Flow { cells: number[]; cum: number[] }
/**
 * 용암이 덮을 차례: src에서 th쪽으로. 땅 위는 좁은 골짜기(옆으로 갈수록 크게 손해), 바다에선 부채꼴로 넓게.
 * 이어진 칸만 따라가며 우선값이 낮은 칸부터 — 그래서 양이 많을수록 앞 순서를 그대로 이어 더 넓게 덮는다(미리 보기 = 실제).
 */
export function flowOrder(I: Isle, src: number, th: number, block: Uint8Array | null, maxV: number): Flow {
  const ux = Math.cos(th), uy = Math.sin(th), sx = src % N, sy = (src / N) | 0;
  const key: number[] = [], val: number[] = [], seen = new Uint8Array(NN);
  seen[src] = 1;
  const push = (k: number) => {
    const dx = (k % N) - sx, dy = ((k / N) | 0) - sy, al = dx * ux + dy * uy, pe = Math.abs(dy * ux - dx * uy);
    const f = (al >= 0 ? al : -5 * al) + (I.kind[k] === SEA ? 1 : 5) * pe;
    let n = key.length;
    key.push(f);
    val.push(k);
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (key[p] <= f) break;
      key[n] = key[p];
      val[n] = val[p];
      n = p;
    }
    key[n] = f;
    val[n] = k;
  };
  const pop = () => {
    const top = val[0], lk = key.pop()!, lv = val.pop()!;
    if (key.length) {
      let n = 0;
      for (;;) {
        let c = 2 * n + 1;
        if (c >= key.length) break;
        if (c + 1 < key.length && key[c + 1] < key[c]) c++;
        if (key[c] >= lk) break;
        key[n] = key[c];
        val[n] = val[c];
        n = c;
      }
      key[n] = lk;
      val[n] = lv;
    }
    return top;
  };
  const open = (k: number) => {
    if (seen[k]) return;
    seen[k] = 1;
    const kd = I.kind[k];
    if (kd !== CRATER && kd !== VENT && !(block && block[k])) push(k);
  };
  for (const n of NB4[src]) open(n);
  const cells: number[] = [], cum: number[] = [];
  let v = 0;
  while (key.length) {
    const k = pop(), c = I.kind[k] === SEA ? 1 : 0.25;
    if (v + c > maxV) break;
    v += c;
    cells.push(k);
    cum.push(v);
    for (const n of NB4[k]) open(n);
  }
  return { cells, cum };
}

/** 섬 넓이·생명을 센다 (분화구와 이어진 땅만), 열린 바다 표시 */
function stats(s: VolcanoState) {
  const I = s.isle, K = I.kind, main = s.main, open = s.open;
  main.fill(0);
  open.fill(0);
  const q: number[] = [CI];
  main[CI] = 1;
  for (let h = 0; h < q.length; h++) for (const n of NB4[q[h]]) if (!main[n] && K[n] !== SEA) (main[n] = 1), q.push(n);
  let life = 0;
  for (const k of q) life += LIFE[K[k]] + FEAT_LIFE[I.feat[k]];
  const o: number[] = [];
  for (let k = 0; k < NN; k++) {
    const x = k % N, y = (k / N) | 0;
    if ((x === 0 || y === 0 || x === N - 1 || y === N - 1) && K[k] === SEA) (open[k] = 1), o.push(k);
  }
  for (let h = 0; h < o.length; h++) for (const n of NB4[o[h]]) if (!open[n] && K[n] === SEA) (open[n] = 1), o.push(n);
  for (let k = 0; k < NN; k++) if (K[k] === SEA && I.feat[k] && NB4[k].some((n) => main[n])) life += FEAT_LIFE[I.feat[k]];
  s.area = q.length;
  s.life = life;
  if (!I.linked && s.phase === 'day') {
    let k = -1;
    for (let i = 0; i < NN; i++) if (I.islet[i] && main[i]) k = i;
    if (k >= 0) {
      I.linked = true;
      ev(s, 'link', k, '섬이 이어졌어요! 🎉');
      see(s, 'link', '🏝️ 작은 섬이 이어졌어요 — 그 섬 생명도 내 것!');
    }
  }
}

/** 섬 모양 보너스: 바다를 감싸면 온천, 뾰족한 곶 끝에 등대, 마을이 있으면 오목한 만에 항구 */
function features(s: VolcanoState) {
  stats(s);
  const I = s.isle, K = I.kind, F = I.feat;
  let spring = -1, lights = 0, harbors = 0, houses = 0;
  for (let k = 0; k < NN; k++) {
    if (K[k] === SEA && !s.open[k] && !F[k] && NB4[k].some((n) => s.main[n])) (F[k] = SPRING), (spring = k);
    if (F[k] === LIGHT) lights++;
    if (F[k] === HARBOR) harbors++;
    if (K[k] === HOUSE) houses++;
  }
  if (spring >= 0) ev(s, 'feat', spring, '♨️ 온천! +4'), see(s, 'spring', '♨️ 용암으로 바다를 감싸면 온천이 솟아요');
  if (lights < (s.day >= 3 ? 2 : 1)) {
    let best = -1, bd = 0;
    for (let k = 0; k < NN; k++) {
      if (!s.main[k] || F[k] || (K[k] !== ROCK && K[k] !== GRASS && K[k] !== FOREST)) continue;
      const d = dist(k);
      if (d < 3.5 || d <= bd) continue;
      let land = 0;
      for (const n of NB8[k]) if (K[n] !== SEA) land++;
      if (land > 3) continue;
      let near = false;
      for (let j = 0; j < NN; j++) if (F[j] === LIGHT && Math.hypot((j % N) - (k % N), ((j / N) | 0) - ((k / N) | 0)) < 4) near = true;
      if (!near) (best = k), (bd = d);
    }
    if (best >= 0) (F[best] = LIGHT), ev(s, 'feat', best, '🗼 등대! +8'), see(s, 'light', '🗼 뾰족한 곶 끝에 등대가 서요');
  }
  if (houses > 0 && harbors === 0) {
    for (let k = 0; k < NN; k++) {
      if (K[k] !== SEA || !s.open[k] || F[k]) continue;
      let land = 0;
      for (const n of NB4[k]) if (s.main[n]) land++;
      if (land >= 3) {
        F[k] = HARBOR;
        ev(s, 'feat', k, '⚓ 항구! +8');
        see(s, 'harbor', '⚓ 오목한 만에 항구가 생겨요');
        break;
      }
    }
  }
  stats(s);
}

/** 식은 용암 → 풀 → 숲 → 동물. 이웃이 푸를수록 빨리, 비구름 아래선 더 빨리. 마을은 옆 풀밭으로 퍼진다 */
function grow(s: VolcanoState, dt: number) {
  const I = s.isle, K = I.kind, G = I.g, rain = rainMask(s.day, s.dayT);
  let houses = 0;
  for (let k = 0; k < NN; k++) if (K[k] === HOUSE) houses++;
  const maxHouses = 2 + 2 * (s.day - 1);
  for (let k = 0; k < NN; k++) {
    const kd = K[k];
    if (kd === SEA || kd >= CRATER) continue;
    const wet = rain && rain[k] ? 2.2 : 1;
    if (kd === LAVA) {
      G[k] += dt * (wet > 1 ? 6 : 1);
      if (G[k] >= COOL) (K[k] = ROCK), (G[k] = 0);
      continue;
    }
    if (kd === HOUSE) {
      G[k] += dt;
      if (G[k] >= 420) {
        G[k] = 0;
        if (houses < maxHouses) {
          const opts = NB4[k].filter((n) => K[n] >= GRASS && K[n] <= ANIMAL && !I.feat[n]);
          if (opts.length) {
            const n = opts[Math.floor(s.rng() * opts.length)];
            (K[n] = HOUSE), (G[n] = 0), houses++;
            ev(s, 'build', n);
          }
        }
      }
      continue;
    }
    let life4 = 0, forest8 = 0;
    for (const n of NB8[k]) {
      const nk = K[n];
      if (nk === FOREST || nk === ANIMAL) forest8++;
    }
    for (const n of NB4[k]) if (K[n] >= GRASS && K[n] <= HOUSE) life4++;
    const r = s.jit[k] * wet * dt;
    if (kd === ROCK) {
      G[k] += r * (1 + 0.6 * life4);
      if (G[k] >= G_GRASS) (K[k] = GRASS), (G[k] = 0), see(s, 'grass', '🌱 식은 용암에 풀이 돋아요');
    } else if (kd === GRASS) {
      G[k] += r * (1 + 0.25 * forest8);
      if (G[k] >= G_FOREST) (K[k] = FOREST), (G[k] = 0), ev(s, 'sprout', k), see(s, 'forest', '🌳 풀밭이 숲이 돼요');
    } else if (kd === FOREST) {
      if (forest8 >= 3) G[k] += r;
      if (G[k] >= G_ANIMAL) (K[k] = ANIMAL), (G[k] = 0), ev(s, 'animal', k), see(s, 'animal', '🦌 숲이 모이면 동물이 와요');
    }
  }
}

function lavaAt(s: VolcanoState, k: number) {
  const I = s.isle, was = I.kind[k];
  if (was === CRATER || was === VENT) return;
  const lost = LIFE[was] + FEAT_LIFE[I.feat[k]] * (s.main[k] || was === SEA ? 1 : 0);
  if (was === SEA) {
    I.h[k] = 1;
    s.flowNew++;
    ev(s, s.flowNew === 1 ? 'hiss' : 'steam', k, s.flowNew === 1 ? '치익!' : undefined);
  } else I.h[k] = Math.min(I.h[k] + 1, maxH(k));
  if (lost > 0) (s.flowLost += lost), ev(s, was === HOUSE ? 'house' : 'bury', k, was === HOUSE ? '🏠 집이 덮였어요!' : `-${lost}`);
  // 웃음: 덮이는 동물·주민은 펄쩍 뛰어 데굴데굴 달아난다
  if (was === ANIMAL) ev(s, 'flee', k, ANIMALS[Math.floor(hsh(k * 7) * ANIMALS.length)]);
  if (was === HOUSE) ev(s, 'flee', k, '🏃');
  I.kind[k] = LAVA;
  I.g[k] = 0;
  I.feat[k] = 0;
  I.islet[k] = 0;
}

function erupt(s: VolcanoState, hold: number) {
  const V = vol(hold), th = thetaAt(s, s.dayT), block = rainMask(s.day, s.dayT);
  const main = flowOrder(s.isle, CI, th, block, V), used = new Set(main.cells);
  const all = main.cells.map((i, n) => ({ i, at: s.t + 3 + Math.floor(n * 1.5) }));
  if (s.isle.vent >= 0) {
    const f2 = flowOrder(s.isle, s.isle.vent, th + Math.PI, block, V * 0.6);
    f2.cells.forEach((i, n) => used.has(i) || all.push({ i, at: s.t + 8 + Math.floor(n * 1.5) }));
    ev(s, 'erupt', s.isle.vent);
  }
  all.sort((a, b) => a.at - b.at);
  s.pending = all;
  s.left--;
  s.erupts++;
  s.flowNew = 0;
  s.flowLost = 0;
  ev(s, 'erupt', CI, hold >= FULL ? '콰르릉!!' : hold > 45 ? '콰르릉!' : hold > 24 ? '부글' : '뿌웅~');
}

function newDay(s: VolcanoState) {
  const d = s.day, I = s.isle, K = I.kind;
  stats(s);
  if (d === 1) {
    // 마을: 바닷가 풀밭에 주민이 배를 타고 온다
    let best = -1, bv = -1;
    for (let k = 0; k < NN; k++) {
      if (!s.main[k] || K[k] < ROCK || K[k] > ANIMAL || I.feat[k] || dist(k) < 2.4 || !NB4[k].some((n) => K[n] === SEA)) continue;
      const v = LIFE[K[k]] + dist(k) * 0.4 + hsh(k) * 0.3;
      if (v > bv) (bv = v), (best = k);
    }
    if (best >= 0) {
      K[best] = HOUSE;
      I.g[best] = 0;
      const nb = NB4[best].find((n) => K[n] >= ROCK && K[n] <= ANIMAL && dist(n) >= 2);
      if (nb !== undefined) (K[nb] = HOUSE), (I.g[nb] = 200);
      ev(s, 'village', best, '⛵ 주민이 왔어요!');
      see(s, 'village', '🏠 마을이 생겼어요 — 덮으면 큰 손해, 풀밭으로 퍼져요');
    }
  }
  if (d === 3 && I.vent < 0) {
    let best = -1, bv = -1;
    for (let k = 0; k < NN; k++) {
      const dd = dist(k);
      if (!s.main[k] || dd < 2.8 || dd > 4.4 || I.feat[k] || K[k] < LAVA || K[k] > ANIMAL) continue;
      if (NB8[k].some((n) => K[n] === HOUSE)) continue;
      const v = -LIFE[K[k]] + hsh(k + d);
      if (v > bv) (bv = v), (best = k);
    }
    if (best >= 0) {
      (K[best] = VENT), (I.h[best] = 3), (I.vent = best);
      ev(s, 'erupt', best, '새 분화구!');
      see(s, 'vent', '🌋 두 번째 분화구 — 반대쪽으로도 흘러요');
    }
  }
  if (d === 4) {
    // 작은 섬: 섬에서 멀리 떨어진 바다에
    const far = new Int16Array(NN).fill(99), q: number[] = [];
    for (let k = 0; k < NN; k++) if (K[k] !== SEA) (far[k] = 0), q.push(k);
    for (let h = 0; h < q.length; h++) for (const n of NB4[q[h]]) if (far[n] > far[q[h]] + 1) (far[n] = far[q[h]] + 1), q.push(n);
    let best = -1, bv = -1;
    for (let k = 0; k < NN; k++) {
      const x = k % N, y = (k / N) | 0;
      if (x < 2 || y < 2 || x > N - 3 || y > N - 3 || far[k] < 3 || far[k] > 5) continue;
      const v = far[k] + hsh(k * 7) * 0.5;
      if (v > bv) (bv = v), (best = k);
    }
    if (best >= 0) {
      for (const k of [best, ...NB4[best]]) (K[k] = k === best ? ANIMAL : hsh(k) < 0.5 ? FOREST : GRASS), (I.h[k] = k === best ? 2 : 1), (I.islet[k] = 1), (I.g[k] = 0);
      ev(s, 'islet', best, '작은 섬!');
      see(s, 'islet', '🏝️ 작은 섬 — 용암 길로 이으면 내 섬이 돼요 (덮지는 말고!)');
    }
  }
  if (d >= 2) see(s, 'rain', '🌧️ 비구름 — 그 아래론 용암이 못 가고 풀이 빨리 자라요');
  s.spinDir = d >= 5 ? -1 : 1;
  if (d >= 5) see(s, 'wind', '🍃 바람이 바뀌었어요 — 주둥이가 거꾸로 돌아요');
  s.spin0 = d === 0 ? Math.PI / 4 - SPIN * 110 : s.rng() * Math.PI * 2;
  stats(s);
  s.areaGoal = GOAL_A[d][0];
  s.lifeGoal = GOAL_L[d][0];
  s.startLife = s.life;
  startDay(s);
  note(s, `☀️ ${d + 1}일째 — 넓이 ${s.areaGoal} · 생명 ${s.lifeGoal}`, '#ffffff');
}
function startDay(s: VolcanoState) {
  s.left = ERUPTS[s.day];
  s.dayT = 0;
  s.phase = 'day';
  s.charge = 0;
  s.pending = [];
  s.fast = false;
  stats(s);
}

/** 지금 해가 지면 받을 별 */
export const starsNow = (s: VolcanoState) => [0, 1, 2].filter((i) => s.area >= GOAL_A[s.day][i] && s.life >= GOAL_L[s.day][i]).length;

function endDay(s: VolcanoState) {
  stats(s);
  const pass = s.area >= s.areaGoal && s.life >= s.lifeGoal;
  s.phase = 'night';
  s.pause = NIGHT;
  if (pass) {
    const st = starsNow(s);
    s.stars += st;
    s.cleared++;
    s.dayStars = st;
    s.retry = false;
    ev(s, 'clear', CI, `${s.day + 1}일째 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.hearts--;
    s.retry = true;
    ev(s, 'fail', CI, `${s.area < s.areaGoal ? '넓이' : '생명'}가 모자라요 · 하트 -1`);
    if (s.hearts <= 0) s.dead = true;
  }
}

export const volcano: GameDef<VolcanoState> = {
  id: 'volcano',
  name: '화산섬 키우기',
  genes: ['farm', 'hold', 'decorate'],
  twist: '꾹 누른 만큼 차오른 용암이 떼는 순간 돌아가는 분화구가 가리키는 쪽으로 흘러 바다를 메워 새 땅이 된다 — 그런데 가는 길에 자란 숲·마을도 함께 덮는다',
  rules: [
    '꾹 누르면 용암이 차오르고, 떼면 화살표 쪽으로 흘러요 (스페이스도 돼요).',
    '바다에 닿은 용암은 새 땅 — 풀·숲·동물이 자라요. 가는 길의 숲과 마을은 덮여요!',
    '해 질 때까지 넓이·생명 목표를 채우면 다음 날, 7일째까지.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 용암 모으기, 떼면 분출 / 스페이스',
  aspect: A,
  art: {
    concept: '바다 위에 떠 있는 작은 화산섬 디오라마',
    mood: '두께 있는 흙층 절벽 위로 화산이 솟은 장난감 같은 섬. 용암은 주황빛으로 번지며 바다에 닿을 때 하얀 김을 뿜고, 식은 검은 땅에 연두 풀과 숲, 사슴과 토끼, 빨간 지붕 마을이 차례로 들어선다. 해가 지면 창문과 등대와 용암이 빛난다.',
    palette: { bg: '#0d2238', ink: '#fff8ee', muted: '#6d8aa3', accent: '#ff8a2a', hot: '#ff4d5e', soft: '#1d4a66' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const I: Isle = { kind: new Uint8Array(NN), g: new Float32Array(NN), h: new Uint8Array(NN), feat: new Uint8Array(NN), islet: new Uint8Array(NN), vent: -1, linked: false };
    const jit = new Float32Array(NN);
    for (let k = 0; k < NN; k++) {
      jit[k] = 0.75 + rng() * 0.5;
      const dx = (k % N) - C, dy = ((k / N) | 0) - C, d = Math.hypot(dx, dy), edge = 2.2 + rng() * 0.6;
      if (d > edge) continue;
      I.kind[k] = d < 0.5 ? CRATER : d >= 1.4 && dx + dy <= -1 ? GRASS : ROCK;
      I.h[k] = d < 0.5 ? 5 : d < 1.5 ? 3 : 2;
      I.g[k] = I.kind[k] === GRASS ? 250 + rng() * 350 : rng() * 140;
    }
    const s: VolcanoState = {
      rng, t: 0, day: 0, dayT: 0, phase: 'day', pause: 0, retry: false, won: false, isle: I, jit, spin0: 0, spinDir: 1,
      left: 0, erupts: 0, charge: 0, pending: [], flowNew: 0, flowLost: 0, fast: false,
      areaGoal: 0, lifeGoal: 0, startLife: 0, area: 0, life: 0, main: new Uint8Array(NN), open: new Uint8Array(NN),
      hearts: 3, stars: 0, cleared: 0, dayStars: 0, seen: new Set<string>(), events: [], notes: [], dead: false,
    };
    newDay(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 100) s.events = s.events.filter((e) => s.t - e.t <= 100);
    if (s.notes.length && s.t - s.notes[0].t > 200) s.notes = s.notes.filter((e) => s.t - e.t <= 200);
    if (s.dead) return;
    if (s.phase === 'night') {
      if (--s.pause > 0) return;
      if (s.retry) {
        // 그날 다시: 섬은 그대로 하룻밤 더 자란 채로, 같은 목표에 분출을 새로 받는다
        startDay(s);
        note(s, `🔁 ${s.day + 1}일째 다시 — 넓이 ${s.areaGoal} · 생명 ${s.lifeGoal}`, '#ffd0d0');
      } else if (++s.day >= DAYS) (s.dead = true), (s.won = true);
      else newDay(s);
      return;
    }
    const down = !!inp.hold, can = s.left > 0 && s.pending.length === 0;
    if (down && can) s.charge++;
    else if (s.charge > 0) {
      if (can && s.charge >= 6) erupt(s, s.charge);
      else if (can) ev(s, 'tap', CI, '꾹 눌러야 해요!');
      s.charge = 0;
    }
    while (s.pending.length && s.pending[0].at <= s.t) {
      lavaAt(s, s.pending.shift()!.i);
      if (!s.pending.length) {
        stats(s);
        ev(s, 'sum', CI, s.flowNew ? `새 땅 +${s.flowNew}${s.flowLost ? ` · 덮임 -${s.flowLost}` : ''}` : `바다까지 못 갔어요${s.flowLost ? ` · 덮임 -${s.flowLost}` : ''}`);
        if (s.flowNew) see(s, 'land', '🌋 바다에 닿은 용암이 새 땅이 됐어요');
      }
    }
    const sub = s.left === 0 && s.pending.length === 0 && s.charge === 0 ? 3 : 1;
    if (sub === 3 && !s.fast) (s.fast = true), ev(s, 'ff', CI, '⏩ 해 질 녘까지 빨리 감기');
    for (let n = 0; n < sub; n++) {
      s.dayT++;
      if (s.dayT % 3 === 0) grow(s, 3);
      if (s.dayT % 30 === 0) features(s);
      else if (s.dayT % 6 === 0) stats(s);
      if (s.dayT >= DAY) {
        endDay(s);
        break;
      }
    }
  },
  over: (s) => s.dead,
  /** 별 하나 10점, 7일을 다 버텨 섬을 완성하면 30점 더 */
  score: (s) => s.stars * 10 + (s.won ? 30 : 0),
  draw(ctx, s, w, h, th: Theme) {
    drawVolcano(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const rgb = (c: string) => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.slice(4, -1).split(',').map(Number));
function mix(a: string, b: string, t: number) {
  const A1 = rgb(a), B1 = rgb(b), u = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(A1[0] + (B1[0] - A1[0]) * u)},${Math.round(A1[1] + (B1[1] - A1[1]) * u)},${Math.round(A1[2] + (B1[2] - A1[2]) * u)})`;
}
const SKY: [number, string, string][] = [
  [0, '#5868a8', '#ffc29a'],
  [0.18, '#5fb2ee', '#cdeeff'],
  [0.6, '#4aa6ec', '#c4eaff'],
  [0.86, '#6a5aa8', '#ffa070'],
  [1, '#2a2d66', '#ee7a5c'],
];

function drawVolcano(ctx: CanvasRenderingContext2D, s: VolcanoState, w: number, h: number, th: Theme) {
  const fx = juice(s), I = s.isle, K = I.kind, R = (x: number) => x * w;
  const TW = (w * 0.9) / N, TH = TW * 0.5, HZ = TW * 0.22, D = TW * 1.2, OX = w / 2;
  const top = R(0.15), bot = h - R(0.1);
  const OY = top + (bot - top - (N * TH + D + TW * 0.5)) * 0.78;
  const P = (gx: number, gy: number, z: number): [number, number] => [OX + ((gx - gy) * TW) / 2, OY + ((gx + gy) * TH) / 2 - z];
  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const zOf = (k: number) => (K[k] === SEA ? 0 : I.h[k] * HZ);
  const CONE = TW * 1.15;
  const night = s.phase === 'night' ? Math.min(1, (NIGHT - s.pause) / 25, s.pause / 25 + 0.2) : 0;
  const f = s.phase === 'night' ? 1 : s.dayT / DAY;
  const dusk = Math.max(night * 0.45, f > 0.82 ? ((f - 0.82) / 0.18) * 0.3 : f < 0.06 ? ((0.06 - f) / 0.06) * 0.18 : 0);
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  let a = SKY[0], b = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) if (f >= SKY[i][0] && f <= SKY[i + 1][0]) (a = SKY[i]), (b = SKY[i + 1]);
  const u = (f - a[0]) / Math.max(1e-6, b[0] - a[0]);
  const sg = ctx.createLinearGradient(0, 0, 0, h);
  sg.addColorStop(0, mix(mix(a[1], b[1], u), '#0a1030', night));
  sg.addColorStop(0.55, mix(mix(a[2], b[2], u), '#1d2a58', night));
  sg.addColorStop(1, mix('#1a5c8c', '#0a1834', night));
  ctx.fillStyle = sg;
  ctx.fillRect(-12, -12, w + 24, h + 24);
  if (night > 0.2)
    for (let k = 0; k < 40; k++) {
      ctx.globalAlpha = (night - 0.2) * (0.4 + 0.6 * Math.abs(Math.sin(s.t / 30 + k)));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hsh(k * 3) * w, top + hsh(k * 5 + 1) * (OY - top + 20), 1.6, 1.6);
    }
  ctx.globalAlpha = 1;
  // 해(또는 달)
  {
    const sx = w * (0.08 + 0.84 * (s.phase === 'night' ? 0.5 : f)), sy = top + R(0.2) - Math.sin(Math.PI * (s.phase === 'night' ? 0.5 : f)) * R(0.13);
    const sun = s.phase === 'night' ? '#f4f1d0' : mix('#fff4b0', '#ff9a50', Math.abs(f - 0.5) * 2);
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, R(0.12));
    gl.addColorStop(0, sun);
    gl.addColorStop(0.25, sun);
    gl.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  // 먼 구름과 새
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 11) * w + s.t * (0.08 + k * 0.03)) % (w + 120)) - 60, cy = top + R(0.04) + hsh(k + 3) * R(0.16);
    ctx.fillStyle = `rgba(255,255,255,${0.55 - night * 0.4})`;
    for (let p = 0; p < 4; p++) {
      ctx.beginPath();
      ctx.ellipse(cx + p * R(0.035) - R(0.05), cy - (p % 2) * R(0.012), R(0.04), R(0.02), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (night < 0.5) {
    ctx.strokeStyle = 'rgba(40,50,70,.6)';
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 3; k++) {
      const bx = ((s.t * 0.5 + k * 37 + hsh(k) * 200) % (w + 80)) - 40, by = top + R(0.07) + k * 9 + Math.sin(s.t / 20 + k) * 3, fl = Math.sin(s.t / 6 + k) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by - fl);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 5, by - fl);
      ctx.stroke();
    }
  }
  // ── 판 그림자·바다 단면 ──
  const L0 = P(0, N, 0), F0 = P(N, N, 0), R0 = P(N, 0, 0), T00 = P(0, 0, 0);
  ctx.fillStyle = 'rgba(0,20,40,.3)';
  ctx.beginPath();
  ctx.ellipse(OX, F0[1] + D + TW * 0.9, N * TW * 0.42, TW * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // 나무 받침대 (디오라마 진열대)
  {
    const pd = TW * 0.45, ex = TW * 0.28, dy0 = D, L1: [number, number] = [L0[0] - ex, L0[1] + dy0], F1: [number, number] = [F0[0], F0[1] + dy0 + ex * 0.5], R1: [number, number] = [R0[0] + ex, R0[1] + dy0];
    const T1: [number, number] = [T00[0], T00[1] + dy0 - ex * 0.5];
    poly([T1, R1, F1, L1], mix('#a8754a', '#3a2818', night * 0.6));
    poly([L1, F1, [F1[0], F1[1] + pd], [L1[0], L1[1] + pd]], mix('#8a5a34', '#2a1c10', night * 0.6));
    poly([F1, R1, [R1[0], R1[1] + pd], [F1[0], F1[1] + pd]], mix('#6e4626', '#20140c', night * 0.6));
    ctx.strokeStyle = 'rgba(255,220,170,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L1[0], L1[1]);
    ctx.lineTo(F1[0], F1[1]);
    ctx.lineTo(R1[0], R1[1]);
    ctx.stroke();
  }
  const wg = ctx.createLinearGradient(0, F0[1] - TH * N * 0.5, 0, F0[1] + D);
  wg.addColorStop(0, mix('#2a8fd0', '#123a66', night));
  wg.addColorStop(1, mix('#0d3b6b', '#06182e', night));
  poly([L0, F0, [F0[0], F0[1] + D], [L0[0], L0[1] + D]], wg);
  poly([F0, R0, [R0[0], R0[1] + D], [F0[0], F0[1] + D]], wg);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  poly([F0, R0, [R0[0], R0[1] + D], [F0[0], F0[1] + D]], 'rgba(0,0,0,.18)');
  poly([[L0[0], L0[1] + D * 0.78], [F0[0], F0[1] + D * 0.78], [F0[0], F0[1] + D], [L0[0], L0[1] + D]], mix('#d6b375', '#5a4a30', night));
  poly([[F0[0], F0[1] + D * 0.78], [R0[0], R0[1] + D * 0.78], [R0[0], R0[1] + D], [F0[0], F0[1] + D]], mix('#b8955e', '#4a3c28', night));
  // 단면 속 물고기·물방울
  for (let k = 0; k < 5; k++) {
    const q = (hsh(k + 40) + s.t * 0.0012 * (k % 2 ? 1 : -1) + 2) % 1, left = k % 2 === 0;
    const A0 = left ? L0 : F0, B0 = left ? F0 : R0;
    const fx0 = A0[0] + (B0[0] - A0[0]) * q, fy0 = A0[1] + (B0[1] - A0[1]) * q + D * (0.3 + 0.3 * hsh(k + 7));
    ctx.fillStyle = `rgba(255,${180 + k * 10},120,${0.7 - night * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(fx0, fy0, 3, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 바다 윗면
  const T0 = P(0, 0, 0);
  const sea = ctx.createLinearGradient(T0[0], T0[1], F0[0], F0[1]);
  sea.addColorStop(0, mix('#59c3ec', '#1c3f6e', night));
  sea.addColorStop(1, mix('#2a8fd2', '#102e58', night));
  poly([T0, R0, F0, L0], sea);
  ctx.strokeStyle = `rgba(255,255,255,${0.5 - night * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(L0[0], L0[1]);
  ctx.lineTo(F0[0], F0[1]);
  ctx.lineTo(R0[0], R0[1]);
  ctx.stroke();
  // 물결 반짝임
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 34; k++) {
    const gx = hsh(k * 13) * N, gy = hsh(k * 17 + 5) * N, cell = Math.floor(gy) * N + Math.floor(gx);
    if (K[cell] !== SEA) continue;
    const [x, y] = P(gx, gy, 0), al = 0.5 * Math.max(0, Math.sin(s.t / 22 + k * 1.3));
    ctx.strokeStyle = `rgba(255,255,255,${al})`;
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.quadraticCurveTo(x, y - 2, x + 4, y);
    ctx.stroke();
  }
  // 얕은 물(땅 옆 바다)·파도 거품
  for (let k = 0; k < NN; k++) {
    if (K[k] !== SEA) continue;
    let land = 0;
    for (const n of NB8[k]) if (K[n] !== SEA) land++;
    if (!land) continue;
    const i = k % N, j = (k / N) | 0;
    ctx.globalAlpha = Math.min(0.55, land * 0.12);
    poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], '#7fe3e0');
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 1.6;
  for (let k = 0; k < NN; k++) {
    if (K[k] === SEA) continue;
    const i = k % N, j = (k / N) | 0, al = 0.45 + 0.35 * Math.sin(s.t / 15 + k);
    ctx.strokeStyle = `rgba(255,255,255,${al * (1 - night * 0.5)})`;
    const edges: [number, number, number, number, number][] = [[i, j - 1, i, j, 1], [i + 1, j, i + 1, j + 1, 2], [i, j + 1, i + 1, j + 1, 3], [i - 1, j, i, j + 1, 4]];
    for (const [ni, nj] of edges) {
      if (ni < 0 || nj < 0 || ni >= N || nj >= N || K[nj * N + ni] !== SEA) continue;
      const o = 0.12 * (1 + Math.sin(s.t / 15 + k));
      ctx.beginPath();
      if (nj === j - 1) (ctx.moveTo(...P(i, j - o, 0)), ctx.lineTo(...P(i + 1, j - o, 0)));
      else if (ni === i + 1) (ctx.moveTo(...P(i + 1 + o, j, 0)), ctx.lineTo(...P(i + 1 + o, j + 1, 0)));
      else if (nj === j + 1) (ctx.moveTo(...P(i, j + 1 + o, 0)), ctx.lineTo(...P(i + 1, j + 1 + o, 0)));
      else (ctx.moveTo(...P(i - o, j, 0)), ctx.lineTo(...P(i - o, j + 1, 0)));
      ctx.stroke();
    }
  }
  // ── 미리 보기(누르는 중) ──
  const preview = new Uint8Array(NN);
  let pvNew = 0, pvLost = 0;
  if (s.charge > 0 && s.phase === 'day') {
    const V = vol(s.charge), thn = thetaAt(s, s.dayT), block = rainMask(s.day, s.dayT);
    const runs: [Flow, number][] = [[flowOrder(I, CI, thn, block, V), V]];
    if (I.vent >= 0) runs.push([flowOrder(I, I.vent, thn + Math.PI, block, V * 0.6), V * 0.6]);
    for (const [fl] of runs)
      for (const k of fl.cells) {
        if (preview[k]) continue;
        preview[k] = 1;
        if (K[k] === SEA) pvNew++;
        pvLost += LIFE[K[k]] + FEAT_LIFE[I.feat[k]];
      }
  }
  // 성공한 밤: 다 같이 춤 / 실패한 밤: 화산이 훌쩍
  const dance = s.phase === 'night' && !s.retry ? 1 : 0, sad = s.phase === 'night' && s.retry;
  const shout = (x: number, y: number, t: string) => {
    ctx.font = `900 ${TW * 0.45}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(t, x, y);
    ctx.fillStyle = '#e8202a';
    ctx.fillText(t, x, y);
  };
  // ── 섬: 뒤에서 앞으로 ──
  const rain = rainAt(s.day, s.phase === 'night' ? 0 : s.dayT);
  const lights: [number, number, number][] = [];
  for (let sum = 0; sum <= 2 * (N - 1); sum++)
    for (let i = Math.max(0, sum - N + 1); i <= Math.min(N - 1, sum); i++) {
      const j = sum - i, k = j * N + i, kd = K[k];
      if (kd === SEA) {
        if (I.feat[k] === HARBOR) drawHarbor(i, j, k);
        else if (I.feat[k] === SPRING) drawSpring(i, j, k);
        if (preview[k]) drawPreview(i, j, 0, k);
        continue;
      }
      const z = zOf(k);
      const lz = j + 1 < N ? zOf(k + N) : -D, rz = i + 1 < N ? zOf(k + 1) : -D;
      const isLava = kd === LAVA, rocky = kd === ROCK || kd === CRATER || kd === VENT || isLava;
      const heat = isLava ? 1 - I.g[k] / COOL : 0;
      const soil = rocky ? mix(isLava ? mix('#5a4048', '#ff6a2a', heat) : '#5a5058', '#22202c', night * 0.6) : mix('#a2714a', '#3c2c24', night * 0.6);
      const soil2 = rocky ? mix(isLava ? mix('#463238', '#e0461a', heat) : '#473f48', '#1a1822', night * 0.6) : mix('#875a3a', '#30231c', night * 0.6);
      for (const [side, nz] of [[0, lz], [1, rz]] as [number, number][]) {
        if (nz >= z) continue;
        const pA = side === 0 ? [i, j + 1] : [i + 1, j], pB = [i + 1, j + 1];
        for (let zz = z, band = 0; zz > nz + 0.01; zz -= HZ, band++) {
          const lo = Math.max(nz, zz - HZ);
          poly([P(pA[0], pA[1], zz), P(pB[0], pB[1], zz), P(pB[0], pB[1], lo), P(pA[0], pA[1], lo)], lo < 0 ? mix(lo < -D * 0.7 ? '#b8955e' : band % 2 ? '#6a4a34' : '#5a3e2c', '#1a1410', night * 0.6) : band % 2 ? soil2 : soil);
          if (side === 1) poly([P(pA[0], pA[1], zz), P(pB[0], pB[1], zz), P(pB[0], pB[1], lo), P(pA[0], pA[1], lo)], 'rgba(0,0,0,.2)');
        }
        if (!rocky) poly([P(pA[0], pA[1], z), P(pB[0], pB[1], z), P(pB[0], pB[1], z - 2), P(pA[0], pA[1], z - 2)], mix('#5b9a38', '#1e3418', night * 0.6));
      }
      // 윗면
      const v = hsh(k) * 0.12;
      let topC: string;
      if (isLava) topC = mix('#ffb03a', '#3e3540', 1 - heat);
      else if (kd === ROCK) topC = mix(mix('#4c4552', '#6a6070', v * 4), '#8f9a6a', Math.min(1, I.g[k] / G_GRASS) * 0.5);
      else if (kd === GRASS) topC = mix('#86cf5a', '#a8dc6a', v * 4);
      else if (kd === FOREST || kd === ANIMAL) topC = mix('#5fae48', '#4a9a3e', v * 4);
      else if (kd === HOUSE) topC = mix('#a9d872', '#c8e48a', v * 4);
      else topC = '#4a4250';
      topC = mix(topC, '#141a30', night * 0.55);
      const corners = [P(i, j, z), P(i + 1, j, z), P(i + 1, j + 1, z), P(i, j + 1, z)];
      if (isLava) {
        ctx.shadowColor = '#ff6a00';
        ctx.shadowBlur = 10 * heat;
      }
      poly(corners, topC);
      ctx.shadowBlur = 0;
      const [cx, cy] = P(i + 0.5, j + 0.5, z);
      if (isLava) {
        ctx.strokeStyle = `rgba(255,240,150,${0.8 * heat})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const ph = s.t / 9 + k;
        ctx.moveTo(...P(i + 0.2, j + 0.3 + 0.1 * Math.sin(ph), z));
        ctx.lineTo(...P(i + 0.5, j + 0.5, z));
        ctx.lineTo(...P(i + 0.8, j + 0.6 + 0.1 * Math.cos(ph), z));
        ctx.stroke();
        lights.push([cx, cy, 0.8 * heat]);
      } else if (kd === ROCK && I.g[k] < 80) {
        ctx.strokeStyle = `rgba(255,120,40,${0.6 * (1 - I.g[k] / 80)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(...P(i + 0.25, j + 0.4, z));
        ctx.lineTo(...P(i + 0.55, j + 0.55, z));
        ctx.lineTo(...P(i + 0.6, j + 0.8, z));
        ctx.stroke();
      } else if (kd === GRASS) {
        ctx.strokeStyle = mix('#4f9a30', '#1a3014', night * 0.6);
        ctx.lineWidth = 1;
        for (let t = 0; t < 3; t++) {
          const [gx, gy] = P(i + 0.2 + hsh(k + t * 31) * 0.6, j + 0.2 + hsh(k * 3 + t) * 0.6, z);
          ctx.beginPath();
          ctx.moveTo(gx - 1.5, gy);
          ctx.lineTo(gx - 0.5, gy - 3);
          ctx.moveTo(gx + 1, gy);
          ctx.lineTo(gx + 1.5, gy - 2.5);
          ctx.stroke();
        }
        if (hsh(k + 9) < 0.3) ((ctx.fillStyle = mix('#ffe066', '#554422', night)), ctx.fillRect(cx + 2, cy - 1, 2, 2));
      }
      if (kd === FOREST || kd === ANIMAL) {
        const grown = kd === FOREST ? Math.min(1, 0.45 + I.g[k] / 200) : 1;
        const spots = kd === ANIMAL ? [[0.28, 0.3], [0.72, 0.38]] : [[0.3, 0.3], [0.7, 0.42], [0.42, 0.72]];
        for (let t = 0; t < spots.length; t++) {
          const [tx, ty] = P(i + spots[t][0], j + spots[t][1], z);
          tree(tx, ty, TW * 0.2 * grown * (0.85 + hsh(k + t) * 0.3), hsh(k * 5 + t) < 0.45);
        }
        if (kd === ANIMAL) {
          const [ax, ay] = P(i + 0.55 + 0.12 * Math.sin(s.t / 50 + k), j + 0.65, z);
          // 평소엔 깡총, 용암이 올 자리면 '!' 하고 제자리 펄쩍펄쩍, 성공한 밤엔 다 같이 춤
          const scared = !!preview[k], party = dance > 0;
          const hop = scared ? Math.abs(Math.sin(s.t / 3 + k)) * 7 : party ? Math.abs(Math.sin(s.t / 6)) * 7 : Math.abs(Math.sin(s.t / 9 + k)) * 2;
          ctx.save();
          ctx.translate(ax, ay - hop);
          if (party && Math.floor(s.t / 12 + k) % 2) ctx.scale(-1, 1);
          if (party) ctx.rotate(Math.sin(s.t / 6) * 0.3);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ffffff';
          ctx.font = `${TW * (scared ? 0.55 : 0.44)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(ANIMALS[Math.floor(hsh(k * 7) * ANIMALS.length)], 0, 0);
          ctx.restore();
          if (scared) shout(ax, ay - hop - TW * 0.5, '!');
        }
      }
      if (kd === HOUSE) drawHouse(cx, cy, k);
      if (kd === CRATER || kd === VENT) drawCrater(cx, cy, kd === VENT ? 0.6 : 1);
      if (I.feat[k] === LIGHT) drawLight(cx, cy, k);
      if (I.islet[k] && !I.linked) {
        ctx.strokeStyle = `rgba(255,224,138,${0.5 + 0.4 * Math.sin(s.t / 8)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        poly(corners, 'rgba(255,224,138,.08)');
        ctx.beginPath();
        ctx.moveTo(...corners[0]);
        for (const c of corners) ctx.lineTo(...c);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (preview[k]) drawPreview(i, j, z, k);
    }
  // ── 비구름 ──
  if (rain && s.phase === 'day') {
    const [gx, gy] = P(rain.x, rain.y, 0), [cx, cy] = P(rain.x, rain.y, HZ * 13);
    ctx.fillStyle = 'rgba(20,40,70,.22)';
    ctx.beginPath();
    ctx.ellipse(gx, gy, rain.r * TW * 0.72, rain.r * TW * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,215,255,.6)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 16; k++) {
      const ox = (hsh(k * 3) - 0.5) * rain.r * TW * 1.2, ph = (s.t * 4 + hsh(k) * 100) % (gy - cy);
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + ph);
      ctx.lineTo(cx + ox - 1.5, cy + ph + 6);
      ctx.stroke();
    }
    for (let p = 0; p < 6; p++) {
      ctx.fillStyle = p < 3 ? mix('#8f9bb0', '#3a4055', night) : mix('#c9d2e0', '#4a5068', night);
      ctx.beginPath();
      ctx.ellipse(cx + (p % 3 - 1) * TW * 0.7, cy - (p >= 3 ? TW * 0.25 : 0) + (p % 2) * 3, TW * 0.6, TW * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 주둥이 화살표 ──
  if (s.phase === 'day' && s.left > 0 && !s.pending.length) {
    const thn = thetaAt(s, s.dayT), zc = I.h[CI] * HZ + 2, dx = Math.cos(thn), dy = Math.sin(thn);
    const g0 = C + 0.5, col = s.charge > 0 ? '#ffdd55' : '#ffffff';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -s.t * 0.5;
    ctx.beginPath();
    ctx.moveTo(...P(g0 + dx * 0.7, g0 + dy * 0.7, zc));
    ctx.lineTo(...P(g0 + dx * 2.6, g0 + dy * 2.6, zc));
    ctx.stroke();
    ctx.setLineDash([]);
    const tip = P(g0 + dx * 3.1, g0 + dy * 3.1, zc), l = P(g0 + dx * 2.5 - dy * 0.45, g0 + dy * 2.5 + dx * 0.45, zc), r = P(g0 + dx * 2.5 + dy * 0.45, g0 + dy * 2.5 - dx * 0.45, zc);
    ctx.shadowColor = '#ff8a2a';
    ctx.shadowBlur = 10;
    poly([tip, l, r], col);
    ctx.shadowBlur = 0;
    if (I.vent >= 0) {
      const vx = (I.vent % N) + 0.5, vy = ((I.vent / N) | 0) + 0.5, zv = I.h[I.vent] * HZ + 2;
      const t2 = P(vx - dx * 1.7, vy - dy * 1.7, zv), l2 = P(vx - dx * 1.2 + dy * 0.35, vy - dy * 1.2 - dx * 0.35, zv), r2 = P(vx - dx * 1.2 - dy * 0.35, vy - dy * 1.2 + dx * 0.35, zv);
      poly([t2, l2, r2], 'rgba(255,221,85,.85)');
    }
  }
  // ── 분출 불꽃 ──
  if (s.pending.length) {
    for (const src of I.vent >= 0 ? [CI, I.vent] : [CI]) {
      const [cx, cy] = P((src % N) + 0.5, ((src / N) | 0) + 0.5, I.h[src] * HZ + CONE * (src === CI ? 1 : 0.6) + 2);
      for (let k = 0; k < 14; k++) {
        const ph = ((s.t * 2 + k * 13) % 40) / 40, an = -Math.PI / 2 + (hsh(k + s.t) - 0.5) * 1.6, sp = TW * 1.6 * (0.5 + hsh(k * 3));
        const x = cx + Math.cos(an) * sp * ph, y = cy + Math.sin(an) * sp * ph + ph * ph * TW * 2.2;
        ctx.fillStyle = ph < 0.5 ? '#ffe27a' : '#ff6a2a';
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath();
        ctx.arc(x, y, 2.4 * (1 - ph) + 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  // ── 김(치익) ──
  for (const e of s.events) {
    if (e.kind !== 'steam' && e.kind !== 'hiss') continue;
    const age = s.t - e.t, i = e.k % N, j = (e.k / N) | 0;
    const [x, y] = P(i + 0.5, j + 0.5, HZ);
    for (let p = 0; p < 3; p++) {
      const aa = age + p * 9;
      ctx.fillStyle = `rgba(245,248,255,${Math.max(0, 0.75 - aa / 95)})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(aa / 12 + p * 2) * 4 + (p - 1) * 4, y - aa * 0.45, 3 + aa * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 화산 얼굴 (웃음): 눈은 주둥이 쪽을 보고, 누르면 끙 힘주고, 쏟을 땐 입을 떡, 성공하면 활짝, 실패하면 훌쩍 ──
  {
    const [cx0, cy0] = P(C + 0.5, C + 0.5, I.h[CI] * HZ), p = Math.min(1, s.charge / FULL), flow = s.pending.length > 0;
    const shake = s.charge > 0 ? Math.sin(s.t * 1.7) * (0.5 + p * 1.5) : 0, hop = dance ? Math.abs(Math.sin(s.t / 6)) * 3 : 0;
    const fx0 = cx0 + shake, fy = cy0 - CONE * 0.52 - hop, ex = TW * 0.2, er = TW * 0.115;
    const sinceSum = (() => { let a = 999; for (const e of s.events) if (e.kind === 'sum') a = Math.min(a, s.t - e.t); return a; })();
    const thn = thetaAt(s, s.dayT), look = P(C + 0.5 + Math.cos(thn), C + 0.5 + Math.sin(thn), I.h[CI] * HZ), lx = (look[0] - cx0) / TW, ly = (look[1] - cy0) / TW;
    ctx.lineCap = 'round';
    const lid = (x: number, y: number, up: boolean) => {
      ctx.strokeStyle = '#2a1a1a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, y + (up ? 1.5 : -1.5), er * 0.9, up ? Math.PI * 1.15 : Math.PI * 0.15, up ? Math.PI * 1.85 : Math.PI * 0.85);
      ctx.stroke();
    };
    for (const sd of [-1, 1]) {
      const x = fx0 + sd * ex, y = fy;
      if (s.charge > 0) {
        // 끙: > <
        ctx.strokeStyle = '#2a1a1a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - sd * er, y - er * 0.8);
        ctx.lineTo(x + sd * er * 0.6, y);
        ctx.lineTo(x - sd * er, y + er * 0.8);
        ctx.stroke();
      } else if (flow || dance || sinceSum < 50) lid(x, y, true);
      else if (sad) lid(x, y, false);
      else if (s.t % 170 < 7) {
        ctx.strokeStyle = '#2a1a1a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - er, y);
        ctx.lineTo(x + er, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, y, er, er * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1010';
        ctx.beginPath();
        ctx.arc(x + lx * er * 0.5, y + ly * er * 0.6, er * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      if (s.charge > 0 || dance) {
        ctx.fillStyle = `rgba(255,90,90,${0.35 + p * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(x + sd * er * 0.9, y + er * 1.6, er * 0.8, er * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 입
    ctx.strokeStyle = '#2a1a1a';
    ctx.fillStyle = '#5a1010';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (flow) (ctx.ellipse(fx0, fy + er * 2.4, er * 0.9, er * 1.1, 0, 0, Math.PI * 2), ctx.fill());
    else if (s.charge > 0) (ctx.moveTo(fx0 - er, fy + er * 2.2), ctx.lineTo(fx0 + er, fy + er * 2.2), ctx.stroke());
    else if (sad) (ctx.arc(fx0, fy + er * 3, er * 0.8, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
    else if (dance) (ctx.arc(fx0, fy + er * 1.6, er * 1.1, 0.1, Math.PI - 0.1), ctx.fill());
    else (ctx.arc(fx0, fy + er * 1.6, er * 0.7, 0.3, Math.PI - 0.3), ctx.stroke());
    if (s.charge > 0 && p > 0.6) {
      // 진땀
      const ph = (s.t % 30) / 30;
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.arc(fx0 + ex * 2, fy - er + ph * 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sad)
      for (const sd of [-1, 1]) {
        const ph = ((s.t + (sd > 0 ? 10 : 0)) % 24) / 24;
        ctx.fillStyle = '#7fc8ff';
        ctx.beginPath();
        ctx.arc(fx0 + sd * ex, fy + er + ph * 12, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    if (sinceSum < 45 && sinceSum > 5 && !flow) {
      ctx.globalAlpha = 1 - sinceSum / 45;
      ctx.font = `800 ${TW * 0.42}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('후련~', fx0 + ex * 1.8, fy - er * 2 - sinceSum * 0.3);
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'butt';
  }
  // ── 달아나는 동물·주민, 뛰어오르는 물고기 ──
  for (const e of s.events) {
    if (e.kind !== 'flee' && e.kind !== 'hiss') continue;
    const age = s.t - e.t, i = e.k % N, j = (e.k / N) | 0, [x0, y0] = P(i + 0.5, j + 0.5, zOf(e.k));
    if (age > 80) continue;
    ctx.save();
    if (e.kind === 'flee') {
      const dir = x0 >= OX ? 1 : -1, x = x0 + dir * age * 1.1, y = y0 - age * 2.4 + age * age * 0.045;
      ctx.translate(x, y);
      ctx.rotate(dir * age * 0.32);
      if (dir > 0) ctx.scale(-1, 1);
      ctx.globalAlpha = Math.min(1, (80 - age) / 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${TW * 0.6}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.text!, 0, 0);
      ctx.restore();
      if (age < 30) shout(x, y - TW * 0.4, e.text === '🏃' ? '으악!' : '!!');
      continue;
    }
    // 치익: 놀란 물고기가 바다에서 튀어 오른다
    const fx1 = x0 + age * 0.6 + TW * 0.4, fy1 = y0 - age * 2.2 + age * age * 0.05;
    if (fy1 < y0 + 4) {
      ctx.translate(fx1, fy1);
      ctx.rotate(-0.6 + age * 0.04);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${TW * 0.55}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐟', 0, 0);
      ctx.restore();
      if (age < 35) shout(fx1, fy1 - TW * 0.35, '!?');
    } else ctx.restore();
  }
  ctx.globalAlpha = 1;
  // ── 밤·노을 ──
  if (dusk > 0.01) {
    ctx.fillStyle = `rgba(14,18,52,${dusk})`;
    ctx.fillRect(-12, -12, w + 24, h + 24);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, al] of lights) {
      const gl = ctx.createRadialGradient(x, y, 0, x, y, TW * 1.3);
      gl.addColorStop(0, `rgba(255,120,40,${al * dusk * 0.9})`);
      gl.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(x - TW * 1.3, y - TW * 1.3, TW * 2.6, TW * 2.6);
    }
    for (let k = 0; k < NN; k++) {
      if (K[k] === HOUSE) {
        const [x, y] = P((k % N) + 0.5, ((k / N) | 0) + 0.5, zOf(k));
        const gl = ctx.createRadialGradient(x, y - 4, 0, x, y - 4, TW * 0.9);
        gl.addColorStop(0, `rgba(255,210,120,${dusk * 0.9})`);
        gl.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(x - TW, y - TW - 4, TW * 2, TW * 2);
      }
      if (I.feat[k] === LIGHT) {
        const [x, y] = P((k % N) + 0.5, ((k / N) | 0) + 0.5, zOf(k) + TW * 0.9);
        const an = s.t / 25;
        ctx.fillStyle = `rgba(255,240,170,${dusk * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, TW * 4, an - 0.18, an + 0.18);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // ── 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const i = e.k % N, j = (e.k / N) | 0, [x, y] = P(i + 0.5, j + 0.5, zOf(e.k) + 4);
    if (e.kind === 'erupt') fx.burst(x, y - 6, '#ff8a2a', 30, 4.5, 3), fx.burst(x, y - 6, '#ffe27a', 14, 3, 2), fx.ring(x, y, '#ffb347', TW * 2.4, 5), fx.kick(e.text === '부글' ? 4 : 9), fx.blink('#ff7a2a', 0.18), e.text && fx.pop(x, y - 26, e.text, '#ffd27a', 18);
    if (e.kind === 'hiss') fx.pop(x, y - 14, e.text!, '#ffffff', 20), fx.burst(x, y, '#e8f4ff', 18, 3, 3), fx.ring(x, y, '#ffffff', TW * 1.5, 3), fx.kick(4);
    if (e.kind === 'steam') fx.burst(x, y, '#dff0ff', 4, 1.6, 2);
    if (e.kind === 'bury') fx.burst(x, y, '#5a4a44', 10, 2.5, 2.5), e.text !== '-1' && e.text !== '-2' && fx.pop(x, y - 8, e.text!, '#ff8080', 13);
    if (e.kind === 'house') fx.burst(x, y, '#ff5a5a', 22, 3.5, 3), fx.pop(x, y - 12, e.text!, '#ff6b6b', 16), fx.kick(10), fx.blink('#ff3030', 0.2);
    if (e.kind === 'sum') fx.pop(w / 2, OY - R(0.02), e.text!, '#fff4c8', 17);
    if (e.kind === 'sprout') fx.burst(x, y - 4, '#9be36a', 5, 1.4, 1.6);
    if (e.kind === 'animal') fx.burst(x, y - 4, '#fff1a8', 8, 1.8, 1.8), fx.ring(x, y, '#c8ff9a', TW * 0.8, 2);
    if (e.kind === 'build') fx.burst(x, y - 4, '#ffd27a', 10, 2, 2), fx.pop(x, y - 10, '🏠', '#ffffff', 12);
    if (e.kind === 'feat' || e.kind === 'link' || e.kind === 'village' || e.kind === 'islet') fx.ring(x, y, '#ffe08a', TW * 2, 4), fx.burst(x, y - 4, '#ffe08a', 24, 3, 2.5), fx.pop(x, y - 16, e.text!, '#ffe08a', 15);
    if (e.kind === 'clear') fx.burst(w / 2, h * 0.35, '#ffd23f', 60, 6, 3), fx.blink('#fff6c8', 0.25), fx.pop(w / 2, h * 0.33, e.text!, '#ffe27a', 24);
    if (e.kind === 'fail') fx.kick(10), fx.blink('#ff4d5e', 0.25), fx.pop(w / 2, h * 0.36, e.text!, '#ff8a8a', 18);
    if (e.kind === 'tap') fx.pop(x, y - 22, e.text!, '#ffffff', 14);
    if (e.kind === 'ff') fx.pop(w / 2, bot - R(0.06), e.text!, '#cfe8ff', 13);
  }
  fx.memo.t = s.t;
  // 누르는 중: 부글부글 + 예상
  if (s.charge > 0 && s.phase === 'day') {
    const p = Math.min(1, s.charge / FULL);
    if (s.t % 6 === 0) fx.kick(1 + p * 2.5);
    const [cx, cy] = P(C + 0.5, C + 0.5, I.h[CI] * HZ);
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const msg = `새 땅 +${pvNew}${pvLost ? `  덮임 -${pvLost}` : ''}`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeText(msg, cx, cy - TW * 1.3);
    ctx.fillStyle = pvLost > 4 ? '#ffb0a0' : '#fff2b0';
    ctx.fillText(msg, cx, cy - TW * 1.3);
    // 게이지
    const gx = w - R(0.06), gy0 = top + R(0.08), gh = R(0.42);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.roundRect(gx - 7, gy0, 14, gh, 7);
    ctx.fill();
    const gg = ctx.createLinearGradient(0, gy0 + gh, 0, gy0);
    gg.addColorStop(0, '#ffd23f');
    gg.addColorStop(1, '#ff3a1a');
    ctx.fillStyle = gg;
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 8 + p * 10;
    ctx.beginPath();
    ctx.roundRect(gx - 5, gy0 + gh - (gh - 4) * p - 2, 10, (gh - 4) * p, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  // ── HUD ──
  ctx.fillStyle = 'rgba(8,22,40,.72)';
  ctx.fillRect(0, 0, w, top);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${R(0.043)}px system-ui, sans-serif`;
  ctx.fillText(`${s.phase === 'night' ? '🌙' : '☀️'} ${s.day + 1}일째 / ${DAYS}`, 10, R(0.035));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`★ ${s.stars}`, w * 0.55, R(0.035));
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, R(0.035));
  const bar = (x: number, label: string, v: number, goals: number[], col: string) => {
    const bw = w * 0.44, by = R(0.07), bh = R(0.045), ok = v >= goals[0], max = goals[2] * 1.1, lo = goals[0] * 0.55;
    const at = (q: number) => bw * Math.max(0, Math.min(1, (q - lo) / (max - lo)));
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.roundRect(x, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = ok ? '#7ee07a' : col;
    ctx.beginPath();
    ctx.roundRect(x, by, Math.max(bh, at(v)), bh, bh / 2);
    ctx.fill();
    ctx.font = `900 ${R(0.026)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const gx = x + at(goals[i]);
      ctx.fillStyle = 'rgba(10,20,40,.7)';
      ctx.fillRect(gx - 1, by, 2, bh);
      ctx.fillStyle = v >= goals[i] ? '#ffd23f' : 'rgba(255,255,255,.55)';
      ctx.fillText('★', gx, by + bh + R(0.016));
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${R(0.03)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${label} ${v}/${goals[0]}${ok ? ' ✓' : ''}`, x + 6, by + bh / 2 + 1);
  };
  bar(w * 0.04, '🏝️ 넓이', s.area, GOAL_A[s.day], '#4fb3e8');
  bar(w * 0.52, '🌱 생명', s.life, GOAL_L[s.day], '#e8b04f');
  ctx.fillStyle = 'rgba(8,22,40,.72)';
  ctx.fillRect(0, bot, w, h - bot);
  ctx.textAlign = 'left';
  ctx.font = `${R(0.045)}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < ERUPTS[s.day]; k++) {
    ctx.globalAlpha = k < s.left ? 1 : 0.22;
    ctx.fillText('🌋', 8 + k * R(0.06), bot + (h - bot) / 2);
  }
  ctx.globalAlpha = 1;
  const sx0 = w * 0.36, sw = w * 0.6, sy = bot + (h - bot) / 2;
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.beginPath();
  ctx.roundRect(sx0, sy - 3, sw, 6, 3);
  ctx.fill();
  const sg2 = ctx.createLinearGradient(sx0, 0, sx0 + sw, 0);
  sg2.addColorStop(0, '#ffd27a');
  sg2.addColorStop(1, '#ff6a50');
  ctx.fillStyle = sg2;
  ctx.beginPath();
  ctx.roundRect(sx0, sy - 3, sw * f, 6, 3);
  ctx.fill();
  ctx.font = `${R(0.04)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(s.phase === 'night' ? '🌙' : '☀️', sx0 + sw * f, sy);
  ctx.font = `700 ${R(0.026)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText(s.left > 0 ? (s.pending.length ? '용암이 흐르는 중…' : '해 질 때까지') : '분출 끝 — 자라는 중', sx0 + sw / 2, sy + R(0.03));
  // 새 소식 띠 (하늘 자리)
  let ny = top + R(0.035);
  ctx.textAlign = 'center';
  for (const n of s.notes.slice(-3)) {
    const age = s.t - n.t, al = Math.min(1, (200 - age) / 30, age / 8);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    ctx.font = `800 ${R(0.034)}px system-ui, sans-serif`;
    const tw = ctx.measureText(n.text).width + 18;
    ctx.fillStyle = 'rgba(10,20,40,.62)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, ny - R(0.025), tw, R(0.05), R(0.025));
    ctx.fill();
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, w / 2, ny + 1);
    ny += R(0.058);
  }
  ctx.globalAlpha = 1;
  if (s.day === 0 && s.erupts === 0 && s.t > 15 && s.charge === 0) {
    ctx.font = `900 ${R(0.046)}px system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    const ty = bot - R(0.05);
    ctx.strokeText('👆 꾹 누르면 부글부글, 떼면 용암이 쏟아져요!', w / 2, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆 꾹 누르면 부글부글, 떼면 용암이 쏟아져요!', w / 2, ty);
  }

  function tree(x: number, y: number, sz: number, pine: boolean) {
    ctx.fillStyle = 'rgba(0,30,10,.3)';
    ctx.beginPath();
    ctx.ellipse(x + sz * 0.3, y, sz * 0.7, sz * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix('#7a4e2c', '#2a1c14', night * 0.6);
    ctx.fillRect(x - sz * 0.12, y - sz * 0.8, sz * 0.24, sz * 0.8);
    if (pine) {
      poly([[x, y - sz * 2.4], [x - sz * 0.75, y - sz * 0.55], [x + sz * 0.75, y - sz * 0.55]], mix('#2f7d3a', '#0f2a16', night * 0.6));
      poly([[x, y - sz * 2.4], [x, y - sz * 0.55], [x + sz * 0.75, y - sz * 0.55]], 'rgba(0,0,0,.15)');
    } else {
      ctx.fillStyle = mix('#3f9a3e', '#12301a', night * 0.6);
      ctx.beginPath();
      ctx.arc(x, y - sz * 1.35, sz * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mix('#6cc95a', '#1d4424', night * 0.6);
      ctx.beginPath();
      ctx.arc(x - sz * 0.2, y - sz * 1.55, sz * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawHouse(x: number, y: number, k: number) {
    const sz = TW * 0.22, wh = TW * 0.22, roof = ['#e0533d', '#3d7fe0', '#e09a3d', '#9a4de0'][Math.floor(hsh(k * 11) * 4)];
    const lit = dusk > 0.1 || s.phase === 'night';
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 1, sz * 1.3, sz * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    poly([[x - sz, y - sz * 0.5], [x, y], [x, y - wh], [x - sz, y - sz * 0.5 - wh]], mix('#fbe9cf', '#6a5a48', night * 0.5));
    poly([[x, y], [x + sz, y - sz * 0.5], [x + sz, y - sz * 0.5 - wh], [x, y - wh]], mix('#e2c9a6', '#54463a', night * 0.5));
    poly([[x - sz * 1.15, y - sz * 0.5 - wh], [x, y - wh + 1], [x, y - wh - sz * 1.3]], mix(roof, '#301818', night * 0.4));
    poly([[x, y - wh + 1], [x + sz * 1.15, y - sz * 0.5 - wh], [x, y - wh - sz * 1.3]], mix(roof, '#000000', 0.3 + night * 0.3));
    ctx.fillStyle = lit ? '#ffd86a' : '#4a6a8a';
    ctx.fillRect(x - sz * 0.65, y - sz * 0.25 - wh * 0.7, sz * 0.35, wh * 0.35);
    ctx.fillStyle = '#6a4024';
    ctx.fillRect(x + sz * 0.35, y - sz * 0.2 - wh * 0.6, sz * 0.3, wh * 0.6);
    // 굴뚝 연기
    for (let p = 0; p < 3; p++) {
      const ph = ((s.t + p * 30 + k * 7) % 90) / 90;
      ctx.fillStyle = `rgba(230,230,235,${0.5 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + sz * 0.5 + ph * 5, y - wh - sz * 1.2 - ph * 14, 1.5 + ph * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // 주민: 평소엔 산책, 용암이 올 자리면 '!' 하고 동동, 성공한 밤엔 만세 점프, 실패한 밤엔 데굴데굴
    const scared = !!preview[k];
    for (let p = 0; p < 2; p++) {
      const an = s.t / (scared ? 8 : sad ? 10 : 40 + p * 13) + k + p * 3, px = x + Math.cos(an) * TW * 0.36, py0 = y + 3 + Math.sin(an) * TH * 0.3;
      const jump = scared ? Math.abs(Math.sin(s.t / 3 + p)) * 5 : dance ? Math.abs(Math.sin(s.t / 6 + p * 1.5)) * 6 : 0, py = py0 - jump;
      ctx.save();
      ctx.translate(px, py);
      if (sad) ctx.rotate(s.t / 4 + p);
      ctx.fillStyle = ['#3a6fd8', '#d84a6a'][p];
      ctx.fillRect(-1, -4, 2.2, 3.5);
      if (dance || scared) {
        ctx.strokeStyle = '#ffd9b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-1, -3.5);
        ctx.lineTo(-3, -6.5);
        ctx.moveTo(1.2, -3.5);
        ctx.lineTo(3.2, -6.5);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd9b0';
      ctx.beginPath();
      ctx.arc(0.1, -5.2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (scared && p === 0) shout(px, py - 7, '!');
    }
  }
  function drawCrater(x: number, y: number, sc: number) {
    // 원뿔 화산: 아래 넓고 위 좁은 산, 꼭대기에 용암 웅덩이. 누를수록 용암 줄기가 산허리로 번진다
    const p = Math.min(1, s.charge / FULL), flow = s.pending.length > 0, Hc = CONE * sc, bw = TW * 0.66 * sc, tw = TW * 0.3 * sc, ty = y - Hc;
    const swell = s.charge > 0 ? 1 + p * 0.06 + Math.sin(s.t * 0.9) * 0.015 * p : 1;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 2, bw * 1.1, bw * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
    body.addColorStop(0, mix('#7a6a70', '#2a2430', night * 0.6));
    body.addColorStop(0.45, mix('#5a4c56', '#201a24', night * 0.6));
    body.addColorStop(1, mix('#33282f', '#120e14', night * 0.6));
    ctx.beginPath();
    ctx.moveTo(x - bw * swell, y);
    ctx.quadraticCurveTo(x, y + bw * 0.42, x + bw * swell, y);
    ctx.lineTo(x + tw * swell, ty);
    ctx.lineTo(x - tw * swell, ty);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    // 산허리 골
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1.2;
    for (const q of [-0.55, 0.15, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(x + tw * q, ty + 2);
      ctx.lineTo(x + bw * q * 1.1, y + 1);
      ctx.stroke();
    }
    // 용암 줄기 (누를수록·흐를수록)
    const streak = flow ? 1 : p;
    if (streak > 0) {
      ctx.strokeStyle = `rgba(255,${120 + 80 * streak},40,${0.5 + 0.5 * streak})`;
      ctx.shadowColor = '#ff5a00';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      for (const q of [-0.35, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(x + tw * q, ty + 1);
        ctx.quadraticCurveTo(x + tw * q * 2, ty + Hc * 0.4 * streak, x + bw * q * 0.9, ty + Hc * 0.85 * streak);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    // 연기 기둥
    for (let q = 0; q < 4; q++) {
      const ph = ((s.t * (1 + p) + q * 25) % 100) / 100;
      ctx.fillStyle = `rgba(${flow ? '90,80,80' : '210,210,215'},${(0.35 + p * 0.3) * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(ph * 4 + q) * 5 + ph * 10, ty - 4 - ph * TW * 2 * sc, (3 + ph * 8) * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = mix('#2a2026', '#100c10', night * 0.5);
    ctx.beginPath();
    ctx.ellipse(x, ty, tw * swell * 1.05, tw * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    const glow = 0.35 + p * 0.65 + (flow ? 0.5 : 0);
    const mg = ctx.createRadialGradient(x, ty, 0, x, ty, tw);
    mg.addColorStop(0, `rgba(255,230,120,${Math.min(1, glow)})`);
    mg.addColorStop(0.6, `rgba(255,110,30,${Math.min(1, glow)})`);
    mg.addColorStop(1, 'rgba(120,20,10,1)');
    ctx.shadowColor = '#ff5a00';
    ctx.shadowBlur = 8 + glow * 14;
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(x, ty + (1 - p) * 1, tw * (0.7 + p * 0.25), tw * 0.34 * (0.7 + p * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (p > 0)
      for (let q = 0; q < 4; q++) {
        const ph = ((s.t * 3 + q * 17) % 30) / 30;
        ctx.fillStyle = `rgba(255,240,160,${1 - ph})`;
        ctx.beginPath();
        ctx.arc(x + (hsh(q + Math.floor(s.t / 10)) - 0.5) * tw, ty - ph * 6 * (1 + p * 2), 1 + p * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    lights.push([x, ty, 0.6 + p * 0.4]);
  }
  function drawLight(x: number, y: number, k: number) {
    const hgt = TW * 0.9, bw = TW * 0.12;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 1, bw * 2, bw * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    poly([[x - bw, y], [x + bw, y], [x + bw * 0.6, y - hgt], [x - bw * 0.6, y - hgt]], mix('#ffffff', '#8a8a9a', night * 0.5));
    for (let b = 0; b < 3; b++) {
      const y0 = y - hgt * (0.2 + b * 0.3), y1 = y0 - hgt * 0.12, f0 = 1 - (0.2 + b * 0.3) * 0.4, f1 = f0 - 0.05;
      poly([[x - bw * f0, y0], [x + bw * f0, y0], [x + bw * f1, y1], [x - bw * f1, y1]], '#e0453a');
    }
    ctx.fillStyle = dusk > 0.1 ? '#fff3a0' : '#ffe9a0';
    ctx.shadowColor = '#ffe080';
    ctx.shadowBlur = 6 + dusk * 14;
    ctx.fillRect(x - bw * 0.7, y - hgt - bw * 1.4, bw * 1.4, bw * 1.4);
    ctx.shadowBlur = 0;
    poly([[x - bw, y - hgt - bw * 1.4], [x + bw, y - hgt - bw * 1.4], [x, y - hgt - bw * 2.6]], '#c0392b');
    void k;
  }
  function drawHarbor(i: number, j: number, k: number) {
    const [x, y] = P(i + 0.5, j + 0.5, 0);
    poly([P(i + 0.25, j + 0.1, 2), P(i + 0.75, j + 0.1, 2), P(i + 0.75, j + 0.9, 2), P(i + 0.25, j + 0.9, 2)], mix('#a8743e', '#3a2a1a', night * 0.5));
    ctx.strokeStyle = 'rgba(60,30,10,.6)';
    ctx.lineWidth = 0.8;
    for (let q = 1; q < 5; q++) {
      ctx.beginPath();
      ctx.moveTo(...P(i + 0.25, j + 0.1 + q * 0.16, 2));
      ctx.lineTo(...P(i + 0.75, j + 0.1 + q * 0.16, 2));
      ctx.stroke();
    }
    const bob = Math.sin(s.t / 14 + k) * 1.5, bx = x + TW * 0.3, by = y + bob;
    poly([[bx - 6, by - 2], [bx + 6, by - 2], [bx + 4, by + 1.5], [bx - 4, by + 1.5]], '#8a4a24');
    poly([[bx, by - 13], [bx, by - 3], [bx + 6, by - 3]], '#ffffff');
    ctx.strokeStyle = '#5a3a20';
    ctx.beginPath();
    ctx.moveTo(bx, by - 13);
    ctx.lineTo(bx, by - 2);
    ctx.stroke();
  }
  function drawSpring(i: number, j: number, k: number) {
    poly([P(i + 0.15, j + 0.15, 1), P(i + 0.85, j + 0.15, 1), P(i + 0.85, j + 0.85, 1), P(i + 0.15, j + 0.85, 1)], mix('#7de8d8', '#2a5a60', night * 0.5));
    const [x, y] = P(i + 0.5, j + 0.5, 1);
    for (let p = 0; p < 3; p++) {
      const ph = ((s.t + p * 20 + k * 5) % 60) / 60;
      ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + (p - 1) * 4 + Math.sin(ph * 6) * 2, y - ph * 14, 2 + ph * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawPreview(i: number, j: number, z: number, k: number) {
    const pulse = 0.5 + 0.5 * Math.sin(s.t / 4);
    const pts = [P(i, j, z + 1), P(i + 1, j, z + 1), P(i + 1, j + 1, z + 1), P(i, j + 1, z + 1)];
    poly(pts, `rgba(255,${K[k] === SEA ? 160 : 80},30,${0.5 + 0.2 * pulse})`);
    ctx.strokeStyle = `rgba(255,240,180,${0.5 + 0.3 * pulse})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const q of pts) ctx.lineTo(...q);
    ctx.closePath();
    ctx.stroke();
    if (LIFE[K[k]] || I.feat[k]) {
      const [x, y] = P(i + 0.5, j + 0.5, z + 2);
      ctx.strokeStyle = `rgba(255,40,40,${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 4);
      ctx.lineTo(x + 4, y + 4);
      ctx.moveTo(x + 4, y - 4);
      ctx.lineTo(x - 4, y + 4);
      ctx.stroke();
    }
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const plans = new WeakMap<object, { press: number; hold: number; made: number; n: number; day: number }>();
const OFF: Input = { tap: false, dir: 0 };

/** 못하는 봇: 아무 때나 누르고 아무만큼 누른다 */
export const volcanoRandom: Bot<VolcanoState> = {
  name: '아무렇게나',
  act(s, rng) {
    if (s.phase !== 'day' || s.left <= 0 || s.pending.length) return OFF;
    let m = plans.get(s);
    if (!m || m.n !== s.erupts || m.day !== s.day * 10 + s.hearts) plans.set(s, (m = { press: s.dayT + 20 + Math.floor(rng() * 150), hold: 8 + Math.floor(rng() * 90), made: s.dayT, n: s.erupts, day: s.day * 10 + s.hearts }));
    if (s.charge === 0) return { tap: false, dir: 0, hold: s.dayT >= m.press };
    return { tap: false, dir: 0, hold: s.charge < m.hold };
  },
};

const mark = new Uint32Array(NN);
let stamp = 0;
function worth(I: Isle, k: number) {
  const kd = I.kind[k], g = I.g[k];
  let v = kd === ROCK ? 0.15 + (g / G_GRASS) * 0.6 : kd === GRASS ? 1 + g / G_FOREST : kd === FOREST ? 2 + (g / G_ANIMAL) * 1.5 : kd === ANIMAL ? 4 : kd === HOUSE ? 14 : 0;
  if (I.islet[k] && !I.linked) v *= 1.5;
  return v + (I.feat[k] ? 9 : 0);
}
/** 한 번의 분출을 흉내 내 값을 매긴다: 새 땅(바다 칸) − 덮이는 생명 */
function judge(s: VolcanoState, f1: Flow, V1: number, f2: Flow | null, V2: number) {
  stamp++;
  const I = s.isle;
  let gain = 0, loss = 0;
  const run = (fl: Flow, V: number) => {
    for (let n = 0; n < fl.cells.length && fl.cum[n] <= V; n++) {
      const k = fl.cells[n];
      if (mark[k] === stamp) continue;
      mark[k] = stamp;
      if (I.kind[k] === SEA) {
        gain += 1;
        if (I.feat[k]) loss += 8;
        if (!I.linked && NB4[k].some((q) => I.islet[q])) gain += 5;
      } else loss += worth(I, k);
    }
  };
  run(f1, V1);
  if (f2) run(f2, V2);
  // 오늘 ★ 넓이까지 모자란 땅은 아주 값지게, ★★★까지는 값지게, 그 너머도 앞날의 생명(칸마다 4)으로.
  // 덮인 생명은 다시 자라지만, 늦게 덮을수록 해 질 녘까지 돌아올 시간이 없다
  const ga = GOAL_A[s.day], g1 = Math.min(gain, Math.max(0, ga[0] - s.area)), g3 = Math.min(gain - g1, Math.max(0, ga[2] - s.area - g1));
  return g1 * 8 + g3 * 4 + (gain - g1 - g3) * 2.5 - loss * (0.8 + (1.4 * s.dayT) / DAY);
}
const HOLDS = [15, 27, 39, 51, 63, 75, 90];
function plan(s: VolcanoState) {
  const now = s.dayT, span = Math.max(40, Math.min(500, (DAY - now - 150) / Math.max(1, s.left)));
  // 넓이 목표를 채웠고 다 손해면 기다린다 (1초 뒤 다시 본다)
  let best = { press: now + 60, hold: 0, made: now, n: s.erupts, day: s.day * 10 + s.hearts, v: s.area >= GOAL_A[s.day][2] ? 0 : -1e9 };
  for (let r = now + 12; r <= now + span; r += 4) {
    const th = thetaAt(s, r), block = rainMask(s.day, r);
    const f1 = flowOrder(s.isle, CI, th, block, VMAX), f2 = s.isle.vent >= 0 ? flowOrder(s.isle, s.isle.vent, th + Math.PI, block, VMAX * 0.6) : null;
    for (const H of HOLDS) {
      if (r - H < now) continue;
      const V = vol(H), v = judge(s, f1, V, f2, V * 0.6) - (r - now) * 0.004;
      if (v > best.v) best = { press: r - H, hold: H, made: now, n: s.erupts, day: s.day * 10 + s.hearts, v };
    }
  }
  return best;
}

/** 잘하는 봇: 앞으로 주둥이가 가리킬 방향 × 누를 시간 7가지를 흉내 내서, 새 땅은 많고 덮이는 생명은 적은 분출을 골라 그대로 누르고 뗀다 */
export const volcanoSmart: Bot<VolcanoState> = {
  name: '화산 장인',
  act(s) {
    if (s.phase !== 'day' || s.left <= 0 || s.pending.length) return OFF;
    let m = plans.get(s);
    if (s.charge > 0) return { tap: false, dir: 0, hold: s.charge < (m?.hold ?? 40) - 1 };
    if (!m || m.n !== s.erupts || m.day !== s.day * 10 + s.hearts || m.press < s.dayT - 3 || (!m.hold && s.dayT >= m.press)) plans.set(s, (m = plan(s)));
    return { tap: false, dir: 0, hold: m.hold > 0 && s.dayT + 1 >= m.press };
  },
};
