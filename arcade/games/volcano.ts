/**
 * 화산섬 키우기 2 (20라운드 다듬기, 오너가 19라운드에서 고름) — 농사·수확 × 꾹 눌렀다 떼기 × 꾸미기.
 * 기준 9(손이 하는 일은 하나): 꾹 누르면 화산에 용암이 차오르고, 떼면 분화구 주둥이가 그 순간 가리키는 쪽으로 흐른다.
 *   주둥이는 천천히 돈다(누르는 동안엔 반 속도) → '언제 뗄지'가 방향, '얼마나 누를지'가 용암 혀의 길이. 누르는 동안 흐를 자리가 그대로 미리 보인다.
 * 와우: 용암이 바다에 닿으면 '치익' 김이 오르며 새 땅이 되고, 식은 땅엔 풀 → 숲 → 동물이 차례로 자란다.
 * 고민(다듬은 판의 핵심): '얼마나'가 '어느 쪽'만큼 중요하다.
 *   · 섬은 둥근 접시 위 디오라마 — 용암을 너무 많이 쏟으면 접시 밖으로 넘쳐 탁자가 탄다(그날 생명 −).
 *   · 떠내려온 🥥 코코넛·⛵ 이사 배: 새 땅이 '딱 닿으면' 야자수·새 집 선물, 덮어 버리면 코코넛 구이·배가 뒤집혀 손해.
 *   · 바닷가 마을·숲 옆을 지날 땐 혀가 길수록 옆으로 번져 덮는다. → 대부분의 분출에서 '중간쯤'이 최선.
 * 판 = 하루. 해 질 때까지 섬 넓이·생명 목표를 채우면 별 1~3개, 못 채우면 하트 -1 그날 다시. 7일째까지 키운 섬이 점수.
 * 펼쳐짐: 풀·숲·동물·🥥 코코넛·넘침(1일) → 마을·⛵ 이사 배(2일) → 작은 섬(3일, 이으면 내 섬) → 두 번째 분화구(4일, 반대쪽으로도)
 *        → 비구름(5일, 그 아래론 용암이 못 감·풀이 빨리 자람) → 바람(6일, 주둥이가 거꾸로) · 섬 모양 보너스(곶 끝 등대 · 오목한 만의 항구 · 바다를 감싸면 온천).
 * 휴대폰(폭 340px): 판을 15×15 네모에서 지름 12칸 둥근 접시로 줄이고, 카메라가 섬 크기를 따라 당겨 찍는다(칸 폭 ≈ 화면의 10%).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const N = 17, C = 8, CI = C * N + C, NN = N * N, A = 1.1;
/** 접시 반지름 (날마다) — 섬이 자라면 더 큰 접시로 옮겨 준다. 그래서 바다 띠는 늘 2~3칸, 카메라는 첫날 크게 당겨 찍는다 */
const PLATE = [5.5, 5.9, 6.3, 6.6, 6.9, 7.1, 7.3];
const DAY = 1200, NIGHT = 110, DAYS = 7, FULL = 90, COOL = 70, SPIN = (Math.PI * 2) / 500, HOLD_SPIN = 0.5, VMIN = 1.5, VMAX = 13;
const SEA = 0, LAVA = 1, ROCK = 2, GRASS = 3, FOREST = 4, ANIMAL = 5, HOUSE = 6, CRATER = 7, VENT = 8, PALM = 9;
/** 바다 위 용암 혀의 폭 (클수록 가늘고 길다) */
const SEAW = 2.5, LANDW = 6;
/** 넘친 자리로 한 칸 더 쏟아질 때마다 붙는 우선값 (작을수록 남은 용암이 다 넘친다) */
const FALL = 0.5;
const LIGHT = 1, HARBOR = 2, SPRING = 3, PIER = 4;
const LIFE = [0, 0, 0, 1, 2, 4, 6, 0, 0, 5];
const FEAT_LIFE = [0, 8, 8, 4, 8];
/** 바다 손님: 코코넛 · 이사 배. 덮으면 그날 생명에서 이만큼 빠진다 */
const COCO = 1, BOAT = 2;
const VIS_PEN = [0, 4, 8];
/** 접시 밖으로 넘친 칸마다 그날 생명 − */
const SPILL = 4;
/** 자라는 데 드는 양: 식은 땅 → 풀(혼자 6초) → 숲(혼자 12초) → 동물(숲이 셋 이상 모이면 13초) */
const G_GRASS = 360, G_FOREST = 700, G_ANIMAL = 800;
const ERUPTS = [3, 3, 3, 3, 3, 3, 3];
/** 날마다 해 질 녘 목표 ★·★★·★★★ (섬 넓이 칸 · 생명 — 별은 둘 다 넘어야) */
const GOAL_A = [[36, 46, 54], [60, 70, 78], [78, 88, 96], [92, 102, 110], [104, 114, 122], [114, 124, 132], [122, 132, 140]];
const GOAL_L = [[0, 50, 90], [150, 190, 230], [250, 290, 330], [330, 370, 410], [390, 430, 470], [430, 470, 510], [460, 500, 540]];

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
/** 둥근 접시 (디오라마 받침). 밖은 허공 — 용암이 가면 넘친다 */
function setPlate(I: Isle, rb: number) {
  I.rb = rb;
  for (let k = 0; k < NN; k++) (I.dish[k] = dist(k) <= rb ? 1 : 0), I.dish[k] && (I.burn[k] = 0);
  for (let k = 0; k < NN; k++) I.rim[k] = I.dish[k] && NB4[k].some((n) => !I.dish[n]) ? 1 : 0;
}
const maxH = (k: number) => (dist(k) < 1.5 ? 4 : dist(k) < 3 ? 3 : 2);
const ANIMALS = ['🦌', '🐇', '🐿️', '🦊', '🐑', '🦔'];
const hsh = (k: number) => ((Math.imul(k + 1, 2654435761) >>> 0) % 10007) / 10007;

export interface Isle { kind: Uint8Array; g: Float32Array; h: Uint8Array; feat: Uint8Array; islet: Uint8Array; vis: Uint8Array; dish: Uint8Array; rim: Uint8Array; burn: Uint8Array; rb: number; vent: number; linked: boolean }
interface Ev { t: number; kind: string; k: number; text?: string }
interface Note { t: number; text: string; color: string }
export interface VolcanoState {
  rng: Rng; t: number; day: number; dayT: number; phase: 'day' | 'night'; pause: number; retry: boolean; won: boolean;
  isle: Isle; jit: Float32Array; ang: number; spinDir: number; idle: number;
  left: number; erupts: number; charge: number; pending: { i: number; at: number }[]; flowNew: number; flowLost: number; flowSpill: number; flowGift: number; fast: boolean;
  areaGoal: number; lifeGoal: number; area: number; life: number; pen: number; main: Uint8Array; open: Uint8Array;
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

/** 누른 시간 → 용암 양 (바다·허공 한 칸 = 1, 땅 위로 흐르는 칸 = 0.25) */
export const vol = (hold: number) => VMIN + (VMAX - VMIN) * Math.min(1, hold / FULL);
/** 비구름 (5일째부터): 섬 위를 천천히 떠돈다 */
export function rainAt(day: number, dayT: number) {
  if (day < 4) return null;
  const a = dayT * 0.0045 + day * 1.7, rho = PLATE[day] * 0.62 + 1.1 * Math.sin(dayT * 0.011 + day);
  return { x: C + 0.5 + rho * Math.cos(a), y: C + 0.5 + rho * Math.sin(a), r: 2.0 };
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
 * 용암이 덮을 차례: src에서 th쪽으로. 땅 위는 좁은 골짜기(옆으로 갈수록 크게 손해), 바다에선 부채꼴로 넓게, 접시 끝을 넘으면 넘친다.
 * 이어진 칸만 따라가며 우선값이 낮은 칸부터 — 그래서 양이 많을수록 앞 순서를 그대로 이어 더 길게 덮는다(미리 보기 = 실제).
 */
export function flowOrder(I: Isle, src: number, th: number, block: Uint8Array | null, maxV: number): Flow {
  const ux = Math.cos(th), uy = Math.sin(th), sx = src % N, sy = (src / N) | 0;
  const key: number[] = [], val: number[] = [], seen = new Uint8Array(NN);
  seen[src] = 1;
  const push = (k: number, extra = 0) => {
    const dx = (k % N) - sx, dy = ((k / N) | 0) - sy, al = dx * ux + dy * uy, pe = Math.abs(dy * ux - dx * uy);
    const f = (al >= 0 ? al : -5 * al) + (I.kind[k] === SEA ? SEAW : LANDW) * pe + extra;
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
    if (!I.dish[k]) return void push(k); // 접시 밖: 넘침 (그 너머로는 안 번진다)
    const kd = I.kind[k];
    if (kd !== CRATER && kd !== VENT && !(block && block[k])) push(k);
  };
  for (const n of NB4[src]) open(n);
  const cells: number[] = [], cum: number[] = [];
  let v = 0;
  const fall = new Uint8Array(NN);
  while (key.length) {
    const k = pop(), c = I.kind[k] === SEA ? 1 : 0.25;
    if (v + c > maxV) break;
    v += c;
    cells.push(k);
    cum.push(v);
    if (I.dish[k]) for (const n of NB4[k]) open(n);
    // 접시 끝을 넘은 용암은 폭포처럼 계속 주르륵 — 넘친 자리로 남은 양이 거의 다 쏟아진다
    else push(k, FALL * ++fall[k]);
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
  for (let h = 0; h < q.length; h++) for (const n of NB4[q[h]]) if (!main[n] && I.dish[n] && K[n] !== SEA) (main[n] = 1), q.push(n);
  let life = 0;
  for (const k of q) life += LIFE[K[k]] + FEAT_LIFE[I.feat[k]];
  const o: number[] = [];
  for (let k = 0; k < NN; k++) if (I.rim[k] && K[k] === SEA) (open[k] = 1), o.push(k);
  for (let h = 0; h < o.length; h++) for (const n of NB4[o[h]]) if (!open[n] && I.dish[n] && K[n] === SEA) (open[n] = 1), o.push(n);
  for (let k = 0; k < NN; k++) if (I.dish[k] && K[k] === SEA && I.feat[k] && NB4[k].some((n) => main[n])) life += FEAT_LIFE[I.feat[k]];
  s.area = q.length;
  s.life = life - s.pen;
  if (!I.linked && s.phase === 'day') {
    let k = -1;
    for (let i = 0; i < NN; i++) if (I.islet[i] && main[i]) k = i;
    if (k >= 0) {
      I.linked = true;
      ev(s, 'link', k, '섬이 이어졌어요! 🎉');
      see(s, 'link', '🏝️ 작은 섬이 이어졌어요!');
    }
  }
}

/** 섬 모양 보너스: 바다를 감싸면 온천, 뾰족한 곶 끝에 등대, 마을이 있으면 오목한 만에 항구 */
function features(s: VolcanoState) {
  stats(s);
  const I = s.isle, K = I.kind, F = I.feat;
  let spring = -1, lights = 0, harbors = 0, houses = 0;
  for (let k = 0; k < NN; k++) {
    if (!I.dish[k]) continue;
    if (K[k] === SEA && !s.open[k] && !F[k] && !I.vis[k] && NB4[k].some((n) => s.main[n])) (F[k] = SPRING), (spring = k);
    if (F[k] === LIGHT) lights++;
    if (F[k] === HARBOR) harbors++;
    if (K[k] === HOUSE) houses++;
  }
  if (spring >= 0) ev(s, 'feat', spring, '♨️ 온천! +4'), see(s, 'spring', '♨️ 바다를 감싸면 온천이 솟아요');
  if (lights < (s.day >= 3 ? 2 : 1)) {
    let best = -1, bd = 0;
    for (let k = 0; k < NN; k++) {
      if (!s.main[k] || F[k] || (K[k] !== ROCK && K[k] !== GRASS && K[k] !== FOREST)) continue;
      const d = dist(k);
      if (d < 3.6 || d <= bd) continue;
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
      if (!I.dish[k] || K[k] !== SEA || !s.open[k] || F[k] || I.vis[k]) continue;
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
      if (nk === FOREST || nk === ANIMAL || nk === PALM) forest8++;
    }
    for (const n of NB4[k]) if ((K[n] >= GRASS && K[n] <= HOUSE) || K[n] === PALM) life4++;
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

/** 바다에서 가장 가까운 땅까지 칸 수 (손님·작은 섬 자리 고르기) */
function seaFar(I: Isle) {
  const far = new Int16Array(NN).fill(99), q: number[] = [];
  for (let k = 0; k < NN; k++) if (I.dish[k] && I.kind[k] !== SEA) (far[k] = 0), q.push(k);
  for (let h = 0; h < q.length; h++) for (const n of NB4[q[h]]) if (I.dish[n] && far[n] > far[q[h]] + 1) (far[n] = far[q[h]] + 1), q.push(n);
  return far;
}

/** 바다 손님 하나 띄우기 (육지에서 2~3칸 떨어진 바다, 다른 손님과 떨어져서) */
function spawn(s: VolcanoState, v: number, prefer = -1) {
  const I = s.isle, far = seaFar(I), opts: number[] = [];
  for (let k = 0; k < NN; k++) {
    if (!I.dish[k] || I.kind[k] !== SEA || I.feat[k] || I.vis[k] || far[k] < 2 || far[k] > 3) continue;
    let near = false;
    for (let j = 0; j < NN && !near; j++) if (I.vis[j] && Math.abs((j % N) - (k % N)) <= 2 && Math.abs(((j / N) | 0) - ((k / N) | 0)) <= 2) near = true;
    if (!near) opts.push(k);
  }
  if (!opts.length) return false;
  let k = opts[Math.floor(s.rng() * opts.length)];
  if (prefer >= 0) {
    // 첫날 첫 코코넛: 화면 앞쪽(주둥이가 곧 가리킬 쪽)에
    let bd = 1e9;
    for (const o of opts) {
      const d = Math.hypot((o % N) - (prefer % N), ((o / N) | 0) - ((prefer / N) | 0));
      if (d < bd) (bd = d), (k = o);
    }
  }
  I.vis[k] = v;
  ev(s, 'arrive', k);
  if (v === COCO) see(s, 'coco', '🥥 코코넛이 떠왔어요 — 새 땅을 딱 닿게!');
  else see(s, 'boat', '⛵ 이사 배 — 딱 닿으면 주민이 와요 (덮으면 풍덩!)');
  return true;
}
function topUp(s: VolcanoState, all: boolean) {
  const I = s.isle, cc = 2, bc = s.day >= 3 ? 2 : s.day >= 1 ? 1 : 0;
  for (;;) {
    let c = 0, b = 0;
    for (let k = 0; k < NN; k++) (I.vis[k] === COCO && c++), (I.vis[k] === BOAT && b++);
    const ok = (b < bc && spawn(s, BOAT)) || (c < cc && spawn(s, COCO));
    if (!ok || !all) return;
  }
}

/** 새 땅이 손님에게 딱 닿았다: 코코넛 → 야자수(+게), 배 → 부두 + 새 집 */
function gift(s: VolcanoState, k: number) {
  const I = s.isle, K = I.kind, v = I.vis[k];
  I.vis[k] = 0;
  s.flowGift++;
  if (v === COCO) {
    (K[k] = PALM), (I.h[k] = 1), (I.g[k] = 0), (I.feat[k] = 0);
    ev(s, 'palm', k, '🌴 야자수 쑥!');
    see(s, 'palm', '🌴 딱 닿은 코코넛은 야자수가 돼요');
    return;
  }
  I.feat[k] = PIER;
  let best = -1, bd = 1e9;
  for (let n = 0; n < NN; n++) {
    if (!s.main[n] || I.feat[n] || K[n] < ROCK || K[n] > ANIMAL || dist(n) < 1.5) continue;
    const d = Math.hypot((n % N) - (k % N), ((n / N) | 0) - ((k / N) | 0)) + (K[n] === ANIMAL ? 3 : K[n] === FOREST ? 1 : 0);
    if (d < bd) (bd = d), (best = n);
  }
  if (best >= 0) (K[best] = HOUSE), (I.g[best] = 0), ev(s, 'build', best);
  ev(s, 'dock', k, '⛵ 이사 왔어요!');
  see(s, 'dock', '🏠 배가 닿으면 주민이 이사 와요');
}

function lavaAt(s: VolcanoState, k: number) {
  const I = s.isle;
  if (!I.dish[k]) {
    s.flowSpill++;
    s.pen += SPILL;
    I.burn[k] = Math.min(9, I.burn[k] + 1);
    ev(s, 'spill', k, s.flowSpill === 1 ? '주르륵~ 앗 뜨거 탁자!' : undefined);
    see(s, 'spill', '🫗 접시 밖으로 넘치면 탁자가 타요!');
    return;
  }
  const was = I.kind[k];
  if (was === CRATER || was === VENT) return;
  let lost = LIFE[was] + FEAT_LIFE[I.feat[k]] * (s.main[k] || was === SEA ? 1 : 0);
  const vis = I.vis[k];
  if (vis) {
    s.pen += VIS_PEN[vis];
    lost += VIS_PEN[vis];
    I.vis[k] = 0;
    ev(s, vis === COCO ? 'roast' : 'capsize', k, vis === COCO ? '코코넛 구이!' : '앗 뜨거!!');
  }
  if (was === SEA) {
    I.h[k] = 1;
    s.flowNew++;
    ev(s, s.flowNew === 1 ? 'hiss' : 'steam', k, s.flowNew === 1 ? '치익!' : undefined);
  } else I.h[k] = Math.min(I.h[k] + 1, maxH(k));
  if (lost > 0) (s.flowLost += lost), vis || ev(s, was === HOUSE ? 'house' : 'bury', k, was === HOUSE ? '🏠 집이 덮였어요!' : `-${lost}`);
  // 웃음: 덮이는 동물·주민은 펄쩍 뛰어 데굴데굴 달아난다
  if (was === ANIMAL) ev(s, 'flee', k, ANIMALS[Math.floor(hsh(k * 7) * ANIMALS.length)]);
  if (was === PALM) ev(s, 'flee', k, '🦀');
  if (was === HOUSE) ev(s, 'flee', k, '🏃');
  I.kind[k] = LAVA;
  I.g[k] = 0;
  I.feat[k] = 0;
  I.islet[k] = 0;
  // 새 땅 옆에 떠 있던 손님은 '딱 닿음' (곧 덮일 거라면 아직)
  for (const n of NB4[k]) if (I.vis[n] && I.kind[n] === SEA && !s.pending.some((p) => p.i === n)) gift(s, n);
}

function erupt(s: VolcanoState, hold: number) {
  const V = vol(hold), th = s.ang, block = rainMask(s.day, s.dayT);
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
  s.flowSpill = 0;
  s.flowGift = 0;
  ev(s, 'erupt', CI, hold >= FULL ? '콰르릉!!' : hold > 45 ? '콰르릉!' : hold > 20 ? '부글' : '뿌웅~');
}

function newDay(s: VolcanoState) {
  const d = s.day, I = s.isle, K = I.kind;
  if (PLATE[d] > I.rb) {
    const first = I.rb === 0;
    setPlate(I, PLATE[d]);
    if (!first) ev(s, 'plate', CI, '🍽️ 더 큰 접시로!'), see(s, 'plate', '🍽️ 섬이 자라서 접시도 커졌어요');
  }
  stats(s);
  if (d === 1) {
    // 마을: 바닷가 풀밭에 주민이 배를 타고 온다
    let best = -1, bv = -1;
    for (let k = 0; k < NN; k++) {
      if (!s.main[k] || K[k] < ROCK || K[k] > ANIMAL || I.feat[k] || dist(k) < 2 || !NB4[k].some((n) => K[n] === SEA)) continue;
      const v = LIFE[K[k]] + dist(k) * 0.4 + hsh(k) * 0.3;
      if (v > bv) (bv = v), (best = k);
    }
    if (best >= 0) {
      K[best] = HOUSE;
      I.g[best] = 0;
      const nb = NB4[best].find((n) => K[n] >= ROCK && K[n] <= ANIMAL && dist(n) >= 1.5);
      if (nb !== undefined) (K[nb] = HOUSE), (I.g[nb] = 200);
      ev(s, 'village', best, '⛵ 주민이 왔어요!');
      see(s, 'village', '🏠 마을이 생겼어요 — 덮으면 큰 손해!');
    }
  }
  if (d === 2) {
    // 작은 섬: 섬에서 가장 먼 바다에
    const far = seaFar(I);
    let best = -1, bv = -1;
    for (let k = 0; k < NN; k++) {
      if (!I.dish[k] || K[k] !== SEA || far[k] < 2 || I.feat[k]) continue;
      const v = Math.min(far[k], 3) + hsh(k * 7 + d) * 0.9;
      if (v > bv) (bv = v), (best = k);
    }
    if (best >= 0) {
      for (const k of [best, ...NB4[best]]) {
        if (!I.dish[k] || K[k] !== SEA || (k !== best && far[k] < 2)) continue;
        (K[k] = k === best ? ANIMAL : hsh(k) < 0.5 ? FOREST : GRASS), (I.h[k] = k === best ? 2 : 1), (I.islet[k] = 1), (I.g[k] = 0), (I.vis[k] = 0);
      }
      ev(s, 'islet', best, '작은 섬!');
      see(s, 'islet', '🏝️ 작은 섬 — 딱 닿게 이으면 내 섬!');
    }
  }
  if (d === 3 && I.vent < 0) {
    let best = -1, bv = -1;
    for (let k = 0; k < NN; k++) {
      const dd = dist(k);
      if (!s.main[k] || dd < 2.2 || dd > 3.8 || I.feat[k] || K[k] < LAVA || K[k] > ANIMAL) continue;
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
  if (d >= 4) see(s, 'rain', '🌧️ 비구름 아래론 용암이 못 가요');
  s.spinDir = d >= 5 ? -1 : 1;
  if (d >= 5) see(s, 'wind', '🍃 바람이 바뀌어 주둥이가 거꾸로 돌아요');
  s.ang = d === 0 ? Math.PI / 4 - SPIN * 80 : s.rng() * Math.PI * 2;
  if (d === 0) spawn(s, COCO, (C + 4) * N + C + 4);
  topUp(s, true);
  s.areaGoal = GOAL_A[d][0];
  s.lifeGoal = GOAL_L[d][0];
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
  s.pen = 0;
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
    if (s.day === DAYS - 1) note(s, `🏝️ ${DAYS}일 만에 섬 완성! ★ ${s.stars}`, '#ffe08a');
  } else {
    s.hearts--;
    s.retry = true;
    ev(s, 'fail', CI, `${s.area < s.areaGoal ? '넓이가' : '생명이'} 모자라요 · 하트 -1`);
    if (s.hearts <= 0) s.dead = true;
  }
}

export const volcano: GameDef<VolcanoState> = {
  id: 'volcano',
  name: '화산섬 키우기 2',
  genes: ['farm', 'hold', 'decorate'],
  twist: '꾹 누른 만큼 길어지는 용암 혀가 떼는 순간 돌아가는 분화구 쪽으로 흘러 바다를 메워 새 땅이 된다 — 모자라면 못 닿고, 넘치면 숲·마을·코코넛을 덮거나 접시 밖으로 흘러 탁자를 태운다',
  rules: [
    '꾹 누른 만큼 용암이 차고, 떼면 화살표 쪽으로 그만큼 흘러요 (스페이스도 돼요).',
    '바다에 닿은 용암은 새 땅. 🥥·⛵엔 딱 닿게 — 숲·마을·손님을 덮거나 접시 밖으로 넘치면 손해!',
    '해 질 때까지 넓이·생명 목표를 채우면 다음 날, 7일째까지.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 용암 모으기(누른 만큼 멀리), 떼면 분출 / 스페이스',
  aspect: A,
  art: {
    concept: '둥근 접시 위에 떠 있는 작은 화산섬 디오라마',
    mood: '나무 받침 위 둥근 물접시에 흙층 절벽을 드러낸 장난감 화산섬. 표정 있는 화산이 끙 힘주면 주황 용암이 혀처럼 뻗어 바다에 닿을 때 하얀 김을 뿜고, 식은 검은 땅에 연두 풀과 숲, 사슴과 토끼, 빨간 지붕 마을, 떠내려온 코코넛과 돛단배가 차례로 들어선다. 해가 지면 창문과 등대와 용암이 빛난다.',
    palette: { bg: '#0d2238', ink: '#fff8ee', muted: '#6d8aa3', accent: '#ff8a2a', hot: '#ff4d5e', soft: '#1d4a66' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const I: Isle = { kind: new Uint8Array(NN), g: new Float32Array(NN), h: new Uint8Array(NN), feat: new Uint8Array(NN), islet: new Uint8Array(NN), vis: new Uint8Array(NN), dish: new Uint8Array(NN), rim: new Uint8Array(NN), burn: new Uint8Array(NN), rb: 0, vent: -1, linked: false };
    const jit = new Float32Array(NN);
    for (let k = 0; k < NN; k++) {
      jit[k] = 0.75 + rng() * 0.5;
      // 처음 섬: 뒤쪽 절반은 풀밭과 작은 숲(사슴 한 마리), 앞쪽은 검은 용암 바위 — 첫 분출은 앞(화면 아래)으로
      const dx = (k % N) - C, dy = ((k / N) | 0) - C, d = Math.hypot(dx, dy), edge = 2.8 + rng() * 0.5;
      if (d > edge) continue;
      I.kind[k] = d < 0.5 ? CRATER : d < 1.4 || dx + dy > 0 ? ROCK : d >= 2.2 && dx + dy <= -3 ? FOREST : GRASS;
      I.h[k] = d < 0.5 ? 5 : d < 1.5 ? 3 : 2;
      I.g[k] = I.kind[k] === GRASS ? 80 + rng() * 260 : I.kind[k] === FOREST ? rng() * 300 : rng() * 140;
    }
    // 뒤쪽 숲 한가운데엔 처음부터 사슴 한 마리
    let deer = -1;
    for (let k = 0; k < NN; k++) if (I.kind[k] === FOREST && (deer < 0 || (k % N) + ((k / N) | 0) < (deer % N) + ((deer / N) | 0))) deer = k;
    if (deer >= 0) I.kind[deer] = ANIMAL;
    const s: VolcanoState = {
      rng, t: 0, day: 0, dayT: 0, phase: 'day', pause: 0, retry: false, won: false, isle: I, jit, ang: 0, spinDir: 1, idle: 0,
      left: 0, erupts: 0, charge: 0, pending: [], flowNew: 0, flowLost: 0, flowSpill: 0, flowGift: 0, fast: false,
      areaGoal: 0, lifeGoal: 0, area: 0, life: 0, pen: 0, main: new Uint8Array(NN), open: new Uint8Array(NN),
      hearts: 3, stars: 0, cleared: 0, dayStars: 0, seen: new Set<string>(), events: [], notes: [], dead: false,
    };
    newDay(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 100) s.events = s.events.filter((e) => s.t - e.t <= 100);
    if (s.notes.length && s.t - s.notes[0].t > 400) s.notes = s.notes.filter((e) => s.t - e.t <= 400);
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
    // 주둥이는 돈다 — 누르는 동안엔 화산이 끙 힘주느라 반 속도
    s.ang += s.spinDir * SPIN * (s.charge > 0 ? HOLD_SPIN : 1);
    s.idle = s.charge > 0 || s.pending.length ? 0 : s.idle + 1;
    while (s.pending.length && s.pending[0].at <= s.t) {
      lavaAt(s, s.pending.shift()!.i);
      if (!s.pending.length) {
        stats(s);
        const parts = [s.flowNew ? `새 땅 +${s.flowNew}` : '바다까지 못 갔어요'];
        if (s.flowLost) parts.push(`덮임 -${s.flowLost}`);
        if (s.flowSpill) parts.push(`넘침 -${s.flowSpill * SPILL}`);
        ev(s, 'sum', CI, parts.join(' · '));
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
      if (s.dayT % 360 === 180) topUp(s, false);
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
/** 말풍선 (주민·뱃사람·화산의 한마디) */
function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, hot = false) {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size * 0.9;
  ctx.fillStyle = hot ? 'rgba(255,236,230,.95)' : 'rgba(255,255,255,.94)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - size * 0.85, tw, size * 1.5, size * 0.6);
  ctx.moveTo(x - 3, y + size * 0.6);
  ctx.lineTo(x, y + size * 1.1);
  ctx.lineTo(x + 4, y + size * 0.6);
  ctx.fill();
  ctx.fillStyle = hot ? '#c0262e' : '#3a2a2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - size * 0.1);
}

function drawVolcano(ctx: CanvasRenderingContext2D, s: VolcanoState, w: number, h: number, th: Theme) {
  const fx = juice(s), I = s.isle, K = I.kind, M = fx.memo, R = (x: number) => x * w;
  const top = Math.max(60, R(0.18)), bot = h - Math.max(36, R(0.1));
  // ── 카메라: 접시 크기를 따라 당겨 찍는다. 첫날 시작은 화산 얼굴을 크게 잡고 뒤로 빠지며 섬을 보여 준다.
  //    누르면 살짝 다가가고, 용암이 흐르는 동안엔 그쪽으로 기운다 ──
  let tR = I.rb + 0.6, tx = C + 0.5, ty = C + 0.5;
  if (s.charge > 0) tR *= 0.97;
  if (s.pending.length) {
    const k = s.pending[0].i;
    tx += ((k % N) + 0.5 - tx) * 0.12;
    ty += (((k / N) | 0) + 0.5 - ty) * 0.12;
  }
  if (M.camR === undefined) (M.camR = s.t < 40 ? 3.1 : tR), (M.camX = tx), (M.camY = ty);
  M.camR += (tR - M.camR) * 0.045;
  M.camX += (tx - M.camX) * 0.06;
  M.camY += (ty - M.camY) * 0.06;
  const span = M.camR * Math.SQRT2;
  const TW = Math.min((w * 0.95) / span, (bot - top - 10) / (span * 0.5 + 1.45)), TH = TW * 0.5, HZ = TW * 0.22, D = TW * 0.9;
  const OX = w / 2, OY = (top + bot) / 2 + TW * 0.1, cu = M.camX - M.camY, cv = M.camX + M.camY;
  const P = (gx: number, gy: number, z: number): [number, number] => [OX + ((gx - gy - cu) * TW) / 2, OY + ((gx + gy - cv) * TH) / 2 - z];
  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const emoji = (e: string, x: number, y: number, size: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(e, x, y);
  };
  const zOf = (k: number) => (!I.dish[k] ? -D : K[k] === SEA ? 0 : I.h[k] * HZ);
  const CONE = TW * 1.55;
  const night = s.phase === 'night' ? Math.min(1, (NIGHT - s.pause) / 25, s.pause / 25 + 0.2) : 0;
  const f = s.phase === 'night' ? 1 : s.dayT / DAY;
  const dusk = Math.max(night * 0.32, f > 0.82 ? ((f - 0.82) / 0.18) * 0.3 : f < 0.06 ? ((0.06 - f) / 0.06) * 0.18 : 0);
  const recent = (kinds: string[], age: number) => {
    let a = 999;
    for (const e of s.events) if (kinds.includes(e.kind)) a = Math.min(a, s.t - e.t);
    return a < age ? a : -1;
  };
  const far = seaFar(I);
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  let a = SKY[0], b = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) if (f >= SKY[i][0] && f <= SKY[i + 1][0]) (a = SKY[i]), (b = SKY[i + 1]);
  const u = (f - a[0]) / Math.max(1e-6, b[0] - a[0]);
  const yTable = OY - w * 0.13;
  const sg = ctx.createLinearGradient(0, 0, 0, yTable);
  sg.addColorStop(0, mix(mix(a[1], b[1], u), '#141c48', night));
  sg.addColorStop(1, mix(mix(a[2], b[2], u), '#34407a', night));
  ctx.fillStyle = sg;
  ctx.fillRect(-12, -12, w + 24, yTable + 12);
  if (night > 0.2)
    for (let k = 0; k < 40; k++) {
      ctx.globalAlpha = (night - 0.2) * (0.4 + 0.6 * Math.abs(Math.sin(s.t / 30 + k)));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hsh(k * 3) * w, top + hsh(k * 5 + 1) * (yTable - top), 1.6, 1.6);
    }
  ctx.globalAlpha = 1;
  {
    const sx = w * (0.08 + 0.84 * (s.phase === 'night' ? 0.5 : f)), sy = top + R(0.17) - Math.sin(Math.PI * (s.phase === 'night' ? 0.5 : f)) * R(0.1);
    const sun = s.phase === 'night' ? '#f4f1d0' : mix('#fff4b0', '#ff9a50', Math.abs(f - 0.5) * 2);
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, R(0.11));
    gl.addColorStop(0, sun);
    gl.addColorStop(0.28, sun);
    gl.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.11), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 11) * w + s.t * (0.08 + k * 0.03)) % (w + 120)) - 60, cy = top + R(0.03) + hsh(k + 3) * R(0.12);
    ctx.fillStyle = `rgba(255,255,255,${0.55 - night * 0.4})`;
    for (let p = 0; p < 4; p++) {
      ctx.beginPath();
      ctx.ellipse(cx + p * R(0.035) - R(0.05), cy - (p % 2) * R(0.012), R(0.04), R(0.02), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 나무 탁자 (디오라마가 놓인 곳) ──
  const tg = ctx.createLinearGradient(0, yTable, 0, h);
  tg.addColorStop(0, mix('#c89a66', '#3a2a1e', night * 0.7));
  tg.addColorStop(1, mix('#8a5a34', '#20140c', night * 0.7));
  ctx.fillStyle = tg;
  ctx.fillRect(-12, yTable, w + 24, h - yTable + 12);
  ctx.strokeStyle = `rgba(70,40,20,${0.25 - night * 0.1})`;
  ctx.lineWidth = 1;
  for (let k = 1; k < 7; k++) {
    const y = yTable + (h - yTable) * (k / 7) ** 1.4;
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.lineTo(w + 12, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,240,210,.18)';
  ctx.fillRect(-12, yTable, w + 24, 2);
  // ── 둥근 나무 접시 (받침) ──
  const [pcx, pcy] = P(C + 0.5, C + 0.5, -D), prx = 0.707 * (I.rb + 0.6) * TW, pry = prx / 2, pd = TW * 0.28;
  ctx.fillStyle = 'rgba(40,20,0,.32)';
  ctx.beginPath();
  ctx.ellipse(pcx + 6, pcy + pd + 6, prx * 1.03, pry * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mix('#7a4a28', '#24160c', night * 0.6);
  ctx.beginPath();
  ctx.ellipse(pcx, pcy + pd, prx, pry, 0, 0, Math.PI);
  ctx.lineTo(pcx - prx, pcy);
  ctx.ellipse(pcx, pcy, prx, pry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mix('#b47c4a', '#3a2616', night * 0.6);
  ctx.beginPath();
  ctx.ellipse(pcx, pcy, prx, pry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,180,.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(pcx, pcy, prx - 2, pry - 1, 0, 0, Math.PI * 2);
  ctx.stroke();
  // 넘친 용암 자국: 받침이 시커멓게 타고 연기가 오른다 (웃음)
  const rimPt = (k: number, z: number): [number, number] => {
    const dx = (k % N) + 0.5 - (C + 0.5), dy = ((k / N) | 0) + 0.5 - (C + 0.5), l = Math.hypot(dx, dy) || 1, r = I.rb + 0.35;
    return P(C + 0.5 + (dx / l) * r, C + 0.5 + (dy / l) * r, z);
  };
  for (let k = 0; k < NN; k++) {
    if (!I.burn[k]) continue;
    const [bx, by] = rimPt(k, -D);
    ctx.fillStyle = 'rgba(30,15,10,.7)';
    ctx.beginPath();
    ctx.ellipse(bx, by, TW * (0.22 + 0.04 * I.burn[k]), TW * (0.1 + 0.02 * I.burn[k]), 0, 0, Math.PI * 2);
    ctx.fill();
    const ph = ((s.t + k * 13) % 80) / 80;
    ctx.fillStyle = `rgba(90,90,95,${0.4 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(ph * 5 + k) * 3, by - ph * TW * 0.9, 2 + ph * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // ── 미리 보기(누르는 중): 덮일 칸 · 딱 닿을 손님 · 넘칠 자리 · 혀끝 ──
  const preview = new Uint8Array(NN), touch = new Uint8Array(NN);
  let pvNew = 0, pvLost = 0, pvSpill = 0, tipK = -1, spillK = -1;
  if (s.charge > 0 && s.phase === 'day') {
    const V = vol(s.charge), thn = s.ang, block = rainMask(s.day, s.dayT);
    const runs: Flow[] = [flowOrder(I, CI, thn, block, V)];
    if (I.vent >= 0) runs.push(flowOrder(I, I.vent, thn + Math.PI, block, V * 0.6));
    runs.forEach((fl, ri) => {
      for (const k of fl.cells) {
        if (!I.dish[k]) {
          pvSpill++;
          if (spillK < 0) spillK = k;
          continue;
        }
        if (ri === 0) tipK = k;
        if (preview[k]) continue;
        preview[k] = 1;
        if (K[k] === SEA) pvNew++;
        pvLost += LIFE[K[k]] + FEAT_LIFE[I.feat[k]] + VIS_PEN[I.vis[k]];
      }
    });
    for (let k = 0; k < NN; k++) if (preview[k]) for (const n of NB4[k]) if ((I.vis[n] || (I.islet[n] && !I.linked)) && !preview[n]) touch[n] = 1;
  }
  // 성공한 밤: 다 같이 춤 / 실패한 밤: 화산이 훌쩍
  const dance = s.phase === 'night' && !s.retry, sad = s.phase === 'night' && s.retry;
  const shout = (x: number, y: number, t: string, col = '#e8202a') => {
    ctx.font = `900 ${Math.max(13, TW * 0.4)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(t, x, y);
    ctx.fillStyle = col;
    ctx.fillText(t, x, y);
  };
  const says: [number, number, string, boolean][] = [];
  // ── 섬: 뒤에서 앞으로 ──
  const rain = rainAt(s.day, s.phase === 'night' ? 0 : s.dayT);
  const lights: [number, number, number][] = [];
  let conePos: [number, number] = P(C + 0.5, C + 0.5, I.h[CI] * HZ);
  for (let sum = 0; sum <= 2 * (N - 1); sum++)
    for (let i = Math.max(0, sum - N + 1); i <= Math.min(N - 1, sum); i++) {
      const j = sum - i, k = j * N + i, kd = K[k];
      if (!I.dish[k]) continue;
      const lz = j + 1 < N ? zOf(k + N) : -D, rz = i + 1 < N ? zOf(k + 1) : -D;
      if (kd === SEA) {
        // 바다 칸: 얕을수록 옥빛. 접시 끝은 물기둥 단면(물고기가 보인다)
        const dep = far[k];
        const sc = dep <= 1 ? '#63d8df' : dep === 2 ? '#3fb6e4' : '#2b90d4';
        poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], mix(sc, '#123a66', night));
        for (const [side, nz] of [[0, lz], [1, rz]] as [number, number][]) {
          if (nz > -D * 0.5) continue;
          const pA = side === 0 ? [i, j + 1] : [i + 1, j], pB = [i + 1, j + 1];
          const wg = ctx.createLinearGradient(0, P(pA[0], pA[1], 0)[1], 0, P(pA[0], pA[1], -D)[1]);
          wg.addColorStop(0, mix(side ? '#2f8fcc' : '#3aa6e0', '#10325a', night));
          wg.addColorStop(1, mix(side ? '#0b3460' : '#0e3d70', '#06182e', night));
          poly([P(pA[0], pA[1], 0), P(pB[0], pB[1], 0), P(pB[0], pB[1], -D), P(pA[0], pA[1], -D)], wg);
          poly([P(pA[0], pA[1], -D * 0.75), P(pB[0], pB[1], -D * 0.75), P(pB[0], pB[1], -D), P(pA[0], pA[1], -D)], mix(side ? '#b8955e' : '#d6b375', '#4a3c28', night));
          ctx.strokeStyle = `rgba(220,245,255,${0.6 - night * 0.3})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(...P(pA[0], pA[1], 0));
          ctx.lineTo(...P(pB[0], pB[1], 0));
          ctx.stroke();
          if (hsh(k * 3 + side) < 0.35) {
            const q = (hsh(k) + s.t * 0.004 * (side ? 1 : -1) + 4) % 1, [fx0, fy0] = P(pA[0] + (pB[0] - pA[0]) * q, pA[1] + (pB[1] - pA[1]) * q, -D * (0.3 + 0.3 * hsh(k + 7)));
            ctx.fillStyle = `rgba(255,${170 + (k % 5) * 15},110,${0.8 - night * 0.4})`;
            ctx.beginPath();
            ctx.ellipse(fx0, fy0, TW * 0.09, TW * 0.045, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // 파도 거품: 땅과 맞닿은 가장자리
        const o = 0.1 * (1 + Math.sin(s.t / 15 + k));
        ctx.strokeStyle = `rgba(255,255,255,${(0.55 + 0.3 * Math.sin(s.t / 15 + k)) * (1 - night * 0.5)})`;
        ctx.lineWidth = Math.max(1.2, TW * 0.05);
        for (const n of NB4[k]) {
          if (!I.dish[n] || K[n] === SEA) continue;
          const ni = n % N, nj = (n / N) | 0;
          ctx.beginPath();
          if (nj === j - 1) (ctx.moveTo(...P(i, j + o, 0)), ctx.lineTo(...P(i + 1, j + o, 0)));
          else if (nj === j + 1) (ctx.moveTo(...P(i, j + 1 - o, 0)), ctx.lineTo(...P(i + 1, j + 1 - o, 0)));
          else if (ni === i - 1) (ctx.moveTo(...P(i + o, j, 0)), ctx.lineTo(...P(i + o, j + 1, 0)));
          else (ctx.moveTo(...P(i + 1 - o, j, 0)), ctx.lineTo(...P(i + 1 - o, j + 1, 0)));
          ctx.stroke();
        }
        if (dep >= 2 && hsh(k * 13) < 0.3) {
          const [x, y] = P(i + 0.5, j + 0.5, 0), al = 0.5 * Math.max(0, Math.sin(s.t / 22 + k * 1.3));
          ctx.strokeStyle = `rgba(255,255,255,${al})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x - TW * 0.15, y);
          ctx.quadraticCurveTo(x, y - TW * 0.06, x + TW * 0.15, y);
          ctx.stroke();
        }
        if (I.feat[k] === HARBOR || I.feat[k] === PIER) drawHarbor(i, j, k);
        else if (I.feat[k] === SPRING) drawSpring(i, j, k);
        if (preview[k]) drawPreview(i, j, 0, k);
        if (I.vis[k]) drawVisitor(i, j, k);
        continue;
      }
      const z = zOf(k);
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
        if (!rocky) poly([P(pA[0], pA[1], z), P(pB[0], pB[1], z), P(pB[0], pB[1], z - 2.5), P(pA[0], pA[1], z - 2.5)], mix('#5b9a38', '#1e3418', night * 0.6));
      }
      const v = hsh(k) * 0.12;
      let topC: string;
      if (isLava) topC = mix('#ffb03a', '#3e3540', 1 - heat);
      else if (kd === ROCK) topC = mix(mix('#4c4552', '#6a6070', v * 4), '#8f9a6a', Math.min(1, I.g[k] / G_GRASS) * 0.5);
      else if (kd === GRASS) topC = mix('#86cf5a', '#a8dc6a', v * 4);
      else if (kd === FOREST || kd === ANIMAL) topC = mix('#5fae48', '#4a9a3e', v * 4);
      else if (kd === HOUSE) topC = mix('#a9d872', '#c8e48a', v * 4);
      else if (kd === PALM) topC = mix('#f0d890', '#e6c87a', v * 4);
      else topC = '#4a4250';
      topC = mix(topC, '#141a30', night * 0.55);
      const corners = [P(i, j, z), P(i + 1, j, z), P(i + 1, j + 1, z), P(i, j + 1, z)];
      if (isLava) (ctx.shadowColor = '#ff6a00'), (ctx.shadowBlur = 10 * heat);
      poly(corners, topC);
      ctx.shadowBlur = 0;
      const [cx, cy] = P(i + 0.5, j + 0.5, z);
      if (isLava) {
        ctx.strokeStyle = `rgba(255,240,150,${0.8 * heat})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const ph = s.t / 9 + k;
        ctx.moveTo(...P(i + 0.2, j + 0.3 + 0.1 * Math.sin(ph), z));
        ctx.lineTo(...P(i + 0.5, j + 0.5, z));
        ctx.lineTo(...P(i + 0.8, j + 0.6 + 0.1 * Math.cos(ph), z));
        ctx.stroke();
        lights.push([cx, cy, 0.8 * heat]);
      } else if (kd === ROCK && I.g[k] < 80) {
        ctx.strokeStyle = `rgba(255,120,40,${0.6 * (1 - I.g[k] / 80)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(...P(i + 0.25, j + 0.4, z));
        ctx.lineTo(...P(i + 0.55, j + 0.55, z));
        ctx.lineTo(...P(i + 0.6, j + 0.8, z));
        ctx.stroke();
      } else if (kd === GRASS) {
        ctx.strokeStyle = mix('#4f9a30', '#1a3014', night * 0.6);
        ctx.lineWidth = 1.2;
        for (let t = 0; t < 4; t++) {
          const [gx, gy] = P(i + 0.15 + hsh(k + t * 31) * 0.7, j + 0.15 + hsh(k * 3 + t) * 0.7, z), gs = TW * 0.08;
          ctx.beginPath();
          ctx.moveTo(gx - gs * 0.6, gy);
          ctx.lineTo(gx - gs * 0.2, gy - gs * 1.4);
          ctx.moveTo(gx + gs * 0.4, gy);
          ctx.lineTo(gx + gs * 0.7, gy - gs * 1.2);
          ctx.stroke();
        }
        if (hsh(k + 9) < 0.35) ((ctx.fillStyle = mix('#ffe066', '#554422', night)), ctx.fillRect(cx + TW * 0.08, cy - 2, TW * 0.07, TW * 0.07));
      }
      if (kd === FOREST || kd === ANIMAL) {
        const grown = kd === FOREST ? Math.min(1, 0.5 + I.g[k] / 240) : 1;
        const spots = kd === ANIMAL ? [[0.25, 0.28], [0.72, 0.36]] : [[0.3, 0.3], [0.72, 0.42], [0.4, 0.74]];
        for (let t = 0; t < spots.length; t++) {
          const [tx0, ty0] = P(i + spots[t][0], j + spots[t][1], z);
          tree(tx0, ty0, TW * 0.21 * grown * (0.85 + hsh(k + t) * 0.3), hsh(k * 5 + t) < 0.45);
        }
        if (kd === ANIMAL) {
          const [ax, ay] = P(i + 0.55 + 0.12 * Math.sin(s.t / 50 + k), j + 0.66, z);
          // 평소엔 깡총, 용암이 올 자리면 '!' 하고 제자리 펄쩍펄쩍, 성공한 밤엔 다 같이 춤
          const scared = !!preview[k];
          const hop = scared ? Math.abs(Math.sin(s.t / 3 + k)) * TW * 0.25 : dance ? Math.abs(Math.sin(s.t / 6)) * TW * 0.22 : Math.abs(Math.sin(s.t / 9 + k)) * TW * 0.06;
          ctx.save();
          ctx.translate(ax, ay - hop);
          if (dance && Math.floor(s.t / 12 + k) % 2) ctx.scale(-1, 1);
          if (dance) ctx.rotate(Math.sin(s.t / 6) * 0.3);
          emoji(ANIMALS[Math.floor(hsh(k * 7) * ANIMALS.length)], 0, 0, TW * (scared ? 0.78 : 0.68));
          ctx.restore();
          if (scared) shout(ax, ay - hop - TW * 0.7, '!');
        }
      }
      if (kd === PALM) drawPalm(cx, cy, k);
      if (kd === HOUSE) drawHouse(cx, cy, k);
      if (kd === CRATER || kd === VENT) {
        drawCrater(cx, cy, kd === VENT ? 0.6 : 1);
        if (kd === CRATER) conePos = [cx, cy];
      }
      if (I.feat[k] === LIGHT) drawLight(cx, cy);
      if (I.islet[k] && !I.linked) {
        ctx.strokeStyle = `rgba(255,224,138,${0.5 + 0.4 * Math.sin(s.t / 8)})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        poly(corners, 'rgba(255,224,138,.1)');
        ctx.beginPath();
        ctx.moveTo(...corners[0]);
        for (const c of corners) ctx.lineTo(...c);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        if (touch[k]) ring(cx, cy, '#7dff8a');
      }
      if (preview[k]) drawPreview(i, j, z, k);
    }
  // ── 비구름 ──
  if (rain && s.phase === 'day') {
    const [gx, gy] = P(rain.x, rain.y, 0), [cx, cy] = P(rain.x, rain.y, HZ * 12);
    ctx.fillStyle = 'rgba(20,40,70,.22)';
    ctx.beginPath();
    ctx.ellipse(gx, gy, rain.r * TW * 0.72, rain.r * TW * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,215,255,.65)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 18; k++) {
      const ox = (hsh(k * 3) - 0.5) * rain.r * TW * 1.2, ph = (s.t * 4 + hsh(k) * 100) % Math.max(1, gy - cy);
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + ph);
      ctx.lineTo(cx + ox - 1.5, cy + ph + TW * 0.2);
      ctx.stroke();
    }
    for (let p = 0; p < 6; p++) {
      ctx.fillStyle = p < 3 ? mix('#8f9bb0', '#3a4055', night) : mix('#c9d2e0', '#4a5068', night);
      ctx.beginPath();
      ctx.ellipse(cx + ((p % 3) - 1) * TW * 0.7, cy - (p >= 3 ? TW * 0.25 : 0) + (p % 2) * 3, TW * 0.6, TW * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 주둥이 화살표 ──
  if (s.phase === 'day' && s.left > 0 && !s.pending.length) {
    const thn = s.ang, zc = I.h[CI] * HZ + 2, dx = Math.cos(thn), dy = Math.sin(thn);
    const g0 = C + 0.5, col = s.charge > 0 ? '#ffdd55' : '#ffffff', pulse = 1 + 0.06 * Math.sin(s.t / 6);
    ctx.lineCap = 'round';
    for (const [c, lw] of [['rgba(30,10,0,.55)', TW * 0.16], [col, TW * 0.08]] as [string, number][]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.setLineDash([TW * 0.12, TW * 0.16]);
      ctx.lineDashOffset = -s.t * 0.6;
      ctx.beginPath();
      ctx.moveTo(...P(g0 + dx * 1.0, g0 + dy * 1.0, zc));
      ctx.lineTo(...P(g0 + dx * 2.2, g0 + dy * 2.2, zc));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    const tip = P(g0 + dx * 2.9 * pulse, g0 + dy * 2.9 * pulse, zc), l = P(g0 + dx * 2.15 - dy * 0.6, g0 + dy * 2.15 + dx * 0.6, zc), r = P(g0 + dx * 2.15 + dy * 0.6, g0 + dy * 2.15 - dx * 0.6, zc);
    ctx.shadowColor = '#ff8a2a';
    ctx.shadowBlur = 12;
    poly([tip, l, r], col);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(40,15,0,.8)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(...tip);
    ctx.lineTo(...l);
    ctx.lineTo(...r);
    ctx.closePath();
    ctx.stroke();
    if (I.vent >= 0) {
      const vx = (I.vent % N) + 0.5, vy = ((I.vent / N) | 0) + 0.5, zv = I.h[I.vent] * HZ + 2;
      const t2 = P(vx - dx * 1.5, vy - dy * 1.5, zv), l2 = P(vx - dx * 1.0 + dy * 0.35, vy - dy * 1.0 - dx * 0.35, zv), r2 = P(vx - dx * 1.0 - dy * 0.35, vy - dy * 1.0 + dx * 0.35, zv);
      poly([t2, l2, r2], 'rgba(255,221,85,.9)');
    }
  }
  // ── 분출 불꽃 ──
  if (s.pending.length)
    for (const src of I.vent >= 0 ? [CI, I.vent] : [CI]) {
      const [cx, cy] = P((src % N) + 0.5, ((src / N) | 0) + 0.5, I.h[src] * HZ + CONE * (src === CI ? 1 : 0.6) + 2);
      for (let k = 0; k < 16; k++) {
        const ph = ((s.t * 2 + k * 13) % 40) / 40, an = -Math.PI / 2 + (hsh(k + s.t) - 0.5) * 1.6, sp = TW * 1.6 * (0.5 + hsh(k * 3));
        const x = cx + Math.cos(an) * sp * ph, y = cy + Math.sin(an) * sp * ph + ph * ph * TW * 2.2;
        ctx.fillStyle = ph < 0.5 ? '#ffe27a' : '#ff6a2a';
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath();
        ctx.arc(x, y, TW * 0.08 * (1 - ph) + 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  // ── 김(치익)·넘친 용암 폭포·달아나는 동물·뒤집힌 배·구운 코코넛 ──
  for (const e of s.events) {
    const age = s.t - e.t, i = e.k % N, j = (e.k / N) | 0;
    if (e.kind === 'steam' || e.kind === 'hiss') {
      const [x, y] = P(i + 0.5, j + 0.5, HZ);
      for (let p = 0; p < 3; p++) {
        const aa = age + p * 9;
        ctx.fillStyle = `rgba(245,248,255,${Math.max(0, 0.75 - aa / 95)})`;
        ctx.beginPath();
        ctx.arc(x + Math.sin(aa / 12 + p * 2) * TW * 0.12 + (p - 1) * TW * 0.12, y - aa * TW * 0.014, TW * 0.09 + aa * TW * 0.003, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (e.kind === 'spill' && age < 90) {
      // 접시 끝에서 탁자로 주르륵 — 떨어지는 용암 줄기와 탁자 위 웅덩이
      const [x0, y0] = rimPt(e.k, 0), [x1, y1] = rimPt(e.k, -D - pd);
      const fl = Math.min(1, age / 12);
      ctx.strokeStyle = `rgba(255,${130 + 60 * Math.sin(s.t / 3)},40,${1 - age / 90})`;
      ctx.shadowColor = '#ff5a00';
      ctx.shadowBlur = 10;
      ctx.lineWidth = TW * 0.16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + (x0 - OX) * 0.05, (y0 + y1) / 2, x0 + (x1 - x0) * fl, y0 + (y1 + TW * 0.2 - y0) * fl);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = `rgba(255,110,30,${1 - age / 90})`;
      ctx.beginPath();
      ctx.ellipse(x1, y1 + TW * 0.2, TW * 0.3 * fl, TW * 0.12 * fl, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      for (let p = 0; p < 3; p++) {
        const ph = ((age + p * 11) % 40) / 40;
        ctx.fillStyle = `rgba(80,80,85,${0.5 * (1 - ph)})`;
        ctx.beginPath();
        ctx.arc(x1 + (p - 1) * TW * 0.15, y1 - ph * TW, TW * 0.08 + ph * TW * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (age > 80) continue;
    if (e.kind === 'flee') {
      const [x0, y0] = P(i + 0.5, j + 0.5, zOf(e.k)), dir = x0 >= OX ? 1 : -1, x = x0 + dir * age * TW * 0.04, y = y0 - age * TW * 0.08 + age * age * TW * 0.0016;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dir * age * 0.32);
      if (dir > 0) ctx.scale(-1, 1);
      ctx.globalAlpha = Math.min(1, (80 - age) / 20);
      emoji(e.text!, 0, TW * 0.3, TW * 0.7);
      ctx.restore();
      if (age < 32) shout(x, y - TW * 0.5, e.text === '🏃' ? '으악!' : e.text === '🦀' ? '앗 뜨거!' : '!!');
    } else if (e.kind === 'hiss') {
      // 치익: 놀란 물고기가 바다에서 튀어 오른다
      const [x0, y0] = P(i + 0.5, j + 0.5, 0), fx1 = x0 + age * TW * 0.025 + TW * 0.4, fy1 = y0 - age * TW * 0.075 + age * age * TW * 0.0017;
      if (fy1 < y0 + 4) {
        ctx.save();
        ctx.translate(fx1, fy1);
        ctx.rotate(-0.6 + age * 0.04);
        emoji('🐟', 0, TW * 0.3, TW * 0.6);
        ctx.restore();
        if (age < 35) shout(fx1, fy1 - TW * 0.35, '!?');
      }
    } else if (e.kind === 'capsize') {
      // 이사 배가 용암에 닿아 뒤집히고, 뱃사람 둘이 '앗 뜨거!!' 하며 튀어 올라 첨벙 — 헤엄쳐 달아난다
      const [x0, y0] = P(i + 0.5, j + 0.5, HZ);
      ctx.save();
      ctx.translate(x0, y0 - Math.max(0, 20 - age) * TW * 0.02);
      ctx.rotate(Math.min(Math.PI, age * 0.15));
      ctx.globalAlpha = Math.max(0, 1 - age / 60);
      boat(0, 0, 1, false);
      ctx.restore();
      ctx.globalAlpha = 1;
      for (const sd of [-1, 1]) {
        const tt = Math.min(age, 34), x = x0 + sd * tt * TW * 0.05, y = y0 - tt * TW * 0.09 + tt * tt * TW * 0.0027;
        if (age < 34) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(sd * age * 0.4);
          person(0, 0, sd < 0 ? '#3a6fd8' : '#d84a6a', true);
          ctx.restore();
        } else {
          const sw = age - 34, hx = x + sd * sw * TW * 0.03, hy = y + Math.sin(sw / 3) * 1.5;
          ctx.fillStyle = '#ffd9b0';
          ctx.beginPath();
          ctx.arc(hx, hy, TW * 0.07, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.8)';
          ctx.beginPath();
          ctx.ellipse(hx, hy + TW * 0.05, TW * 0.14, TW * 0.05, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (age < 40) shout(x0, y0 - TW * 1.1, '앗 뜨거!!');
    } else if (e.kind === 'roast') {
      // 코코넛 구이: 펑 튀어 올라 빙글빙글 연기를 뿜는다
      const [x0, y0] = P(i + 0.5, j + 0.5, HZ), x = x0 + age * TW * 0.02, y = y0 - age * TW * 0.07 + age * age * TW * 0.0013;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(age * 0.3);
      ctx.globalAlpha = Math.max(0, 1 - age / 70);
      emoji('🥥', 0, TW * 0.25, TW * 0.6);
      ctx.restore();
      ctx.fillStyle = `rgba(60,55,55,${Math.max(0, 0.5 - age / 140)})`;
      ctx.beginPath();
      ctx.arc(x - TW * 0.1, y + TW * 0.2, TW * 0.12 + age * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
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
        const [x, y] = P((k % N) + 0.5, ((k / N) | 0) + 0.5, zOf(k) + TW * 1.1);
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
  // ── 주민·뱃사람 말풍선 (한 번에 둘까지) ──
  for (const [x, y, t, hot] of says.slice(0, 2)) bubble(ctx, x, y, t, Math.max(12, TW * 0.34), hot);
  // ── 화산 얼굴 (주인공): 누르면 끙 힘주고, 쏟을 땐 입을 떡, 선물엔 우쭐, 사고엔 '앗…', 심심하면 하품 ──
  drawFace();
  // ── 연출 ──
  const seenT = M.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const i = e.k % N, j = (e.k / N) | 0, [x, y] = I.dish[e.k] ? P(i + 0.5, j + 0.5, zOf(e.k) + 4) : rimPt(e.k, 0);
    if (e.kind === 'erupt') {
      const yt = y - CONE * (e.k === CI ? 1 : 0.6);
      // 웃음: 아주 살짝 누르면 '뿌웅~' 하고 방귀 같은 연기만 퐁
      if (e.text === '뿌웅~') fx.burst(x, yt, '#bdb6b0', 16, 2, 4), fx.ring(x, yt, '#d8d2cc', TW * 1.2, 3), fx.pop(x, yt - 18, e.text, '#e8e2dc', 18);
      else fx.burst(x, yt, '#ff8a2a', 30, 4.5, 3), fx.burst(x, yt, '#ffe27a', 14, 3, 2), fx.ring(x, y, '#ffb347', TW * 2.4, 5), fx.kick(e.text === '부글' ? 4 : 9), fx.blink('#ff7a2a', 0.18), e.text && fx.pop(x, yt - 18, e.text, '#ffd27a', 19);
    }
    if (e.kind === 'hiss') fx.pop(x, y - 14, e.text!, '#ffffff', 20), fx.burst(x, y, '#e8f4ff', 18, 3, 3), fx.ring(x, y, '#ffffff', TW * 1.5, 3), fx.kick(4);
    if (e.kind === 'steam') fx.burst(x, y, '#dff0ff', 4, 1.6, 2);
    if (e.kind === 'bury') fx.burst(x, y, '#5a4a44', 10, 2.5, 2.5), Number(e.text) <= -3 && fx.pop(x, y - 8, e.text!, '#ff8080', 14);
    if (e.kind === 'house') fx.burst(x, y, '#ff5a5a', 22, 3.5, 3), fx.pop(x, y - 12, e.text!, '#ff6b6b', 16), fx.kick(10), fx.blink('#ff3030', 0.2);
    if (e.kind === 'spill') fx.burst(x, y, '#ff7a2a', 12, 2.5, 2.5), e.text && (fx.pop(x, y - 16, e.text, '#ffb08a', 16), fx.kick(6));
    if (e.kind === 'roast') fx.burst(x, y, '#7a5030', 16, 3, 2.5), fx.pop(x, y - 18, `🔥 ${e.text} -${VIS_PEN[COCO]}`, '#ffb08a', 16), fx.kick(5);
    if (e.kind === 'capsize') fx.burst(x, y, '#d8f2ff', 24, 3.5, 3), fx.ring(x, y, '#ffffff', TW * 1.6, 4), fx.pop(x, y - 24, `⛵ 풍덩! -${VIS_PEN[BOAT]}`, '#ff9a9a', 16), fx.kick(8);
    if (e.kind === 'palm') fx.burst(x, y - 6, '#9be36a', 22, 3, 2.5), fx.ring(x, y, '#c8ff9a', TW * 1.6, 4), fx.pop(x, y - 24, e.text!, '#d8ffb0', 17);
    if (e.kind === 'dock') fx.burst(x, y - 6, '#ffe08a', 22, 3, 2.5), fx.ring(x, y, '#ffe08a', TW * 1.8, 4), fx.pop(x, y - 24, e.text!, '#ffe08a', 17);
    if (e.kind === 'arrive') fx.ring(x, y, '#ffffff', TW * 0.9, 2), fx.burst(x, y, '#e8f8ff', 8, 1.6, 2);
    if (e.kind === 'plate') fx.ring(OX, OY, '#ffe08a', w * 0.5, 6), fx.blink('#fff6c8', 0.25), fx.pop(w / 2, OY - TW * 2.5, e.text!, '#ffe08a', 20);
    if (e.kind === 'sum') fx.pop(w / 2, OY - span * TW * 0.25 - 8, e.text!, '#fff4c8', 15);
    if (e.kind === 'sprout') fx.burst(x, y - 4, '#9be36a', 5, 1.4, 1.6);
    if (e.kind === 'animal') fx.burst(x, y - 4, '#fff1a8', 8, 1.8, 1.8), fx.ring(x, y, '#c8ff9a', TW * 0.8, 2);
    if (e.kind === 'build') fx.burst(x, y - 4, '#ffd27a', 10, 2, 2), fx.pop(x, y - 10, '🏠', '#ffffff', 14);
    if (e.kind === 'feat' || e.kind === 'link' || e.kind === 'village' || e.kind === 'islet') fx.ring(x, y, '#ffe08a', TW * 2, 4), fx.burst(x, y - 4, '#ffe08a', 24, 3, 2.5), fx.pop(x, y - 16, e.text!, '#ffe08a', 16);
    if (e.kind === 'clear') fx.burst(w / 2, h * 0.35, '#ffd23f', 60, 6, 3), fx.blink('#fff6c8', 0.25), fx.pop(w / 2, h * 0.33, e.text!, '#ffe27a', 24);
    if (e.kind === 'fail') fx.kick(10), fx.blink('#ff4d5e', 0.25), fx.pop(w / 2, h * 0.36, e.text!, '#ff8a8a', 18);
    if (e.kind === 'tap') fx.pop(x, y - CONE - 10, e.text!, '#ffffff', 15);
    if (e.kind === 'ff') fx.pop(w / 2, bot - 26, e.text!, '#cfe8ff', 14);
  }
  M.t = s.t;
  // ── 누르는 중: 혀끝 길이·얻고 잃는 것 · 넘침 경고 · 게이지 ──
  if (s.charge > 0 && s.phase === 'day') {
    const p = Math.min(1, s.charge / FULL);
    if (s.t % 6 === 0) fx.kick(1 + p * 2.5);
    const lab = (x: number, y: number, t: string, col: string, size: number) => {
      ctx.font = `900 ${size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.strokeText(t, x, y);
      ctx.fillStyle = col;
      ctx.fillText(t, x, y);
    };
    if (tipK >= 0) {
      const [x, y] = P((tipK % N) + 0.5, ((tipK / N) | 0) + 0.5, zOf(tipK) + 2), pulse = 0.6 + 0.4 * Math.sin(s.t / 3);
      ctx.fillStyle = `rgba(255,240,150,${pulse})`;
      ctx.shadowColor = '#ffb030';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, TW * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      lab(x, y - TW * 0.25, `+${pvNew}🏝️`, '#fff2b0', Math.max(15, TW * 0.42));
      if (pvLost) lab(x, y - TW * 0.25 - Math.max(15, TW * 0.42) * 1.05, `-${pvLost}`, '#ff9a8a', Math.max(14, TW * 0.38));
    }
    if (spillK >= 0) {
      const [x0, y0] = rimPt(spillK, 0), [, y1] = rimPt(spillK, -D - pd);
      ctx.strokeStyle = `rgba(255,70,40,${0.6 + 0.3 * Math.sin(s.t / 3)})`;
      ctx.lineWidth = TW * 0.14;
      ctx.setLineDash([TW * 0.12, TW * 0.08]);
      ctx.lineDashOffset = -s.t;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0, y1 + TW * 0.2);
      ctx.stroke();
      ctx.setLineDash([]);
      lab(x0, y1 + TW * 0.2 + Math.max(15, TW * 0.4) + 4, `넘쳐요! -${pvSpill * SPILL}`, '#ff6b5a', Math.max(15, TW * 0.4));
    }
    const gx = w - 14, gy0 = top + 40, gh = (bot - top) * 0.42;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.roundRect(gx - 8, gy0, 16, gh, 8);
    ctx.fill();
    const gg = ctx.createLinearGradient(0, gy0 + gh, 0, gy0);
    gg.addColorStop(0, '#ffd23f');
    gg.addColorStop(1, '#ff3a1a');
    ctx.fillStyle = gg;
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 8 + p * 10;
    ctx.beginPath();
    ctx.roundRect(gx - 6, gy0 + gh - (gh - 4) * p - 2, 12, Math.max(4, (gh - 4) * p), 6);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  // ── HUD (위 띠: 날·별·하트·목표 / 아래 띠: 남은 분출·하루 시계) ──
  ctx.fillStyle = 'rgba(8,22,40,.8)';
  ctx.fillRect(0, 0, w, top);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  const hf = Math.max(15, R(0.046));
  ctx.font = `900 ${hf}px system-ui, sans-serif`;
  ctx.fillText(`${s.phase === 'night' ? '🌙' : '☀️'} ${s.day + 1}일째 / ${DAYS}`, 8, top * 0.22);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`★ ${s.stars}`, w * 0.6, top * 0.22);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 8, top * 0.22);
  const bar = (x: number, label: string, v: number, goals: number[], col: string) => {
    const bw = w * 0.455, by = top * 0.43, bh = Math.max(16, top * 0.27), ok = v >= goals[0], max = goals[2] * 1.08, lo = Math.max(0, goals[0] * 0.55);
    const at = (q: number) => bw * Math.max(0, Math.min(1, (q - lo) / Math.max(1, max - lo)));
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath();
    ctx.roundRect(x, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = ok ? '#5fcf5a' : col;
    ctx.beginPath();
    ctx.roundRect(x, by, Math.max(bh, at(v)), bh, bh / 2);
    ctx.fill();
    ctx.font = `900 12px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      if (!goals[i]) continue;
      const gx = x + at(goals[i]);
      ctx.fillStyle = 'rgba(10,20,40,.75)';
      ctx.fillRect(gx - 1, by, 2, bh);
      ctx.fillStyle = v >= goals[i] ? '#ffd23f' : 'rgba(255,255,255,.55)';
      ctx.fillText('★', gx, by + bh + 7);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 12px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${label} ${Math.max(0, v)}/${goals[0]}${ok ? ' ✓' : ''}`, x + 6, by + bh / 2 + 1);
  };
  bar(w * 0.03, '🏝️', s.area, GOAL_A[s.day], '#4fb3e8');
  bar(w * 0.515, '🌱', s.life, GOAL_L[s.day], '#e8b04f');
  ctx.fillStyle = 'rgba(8,22,40,.8)';
  ctx.fillRect(0, bot, w, h - bot);
  ctx.textAlign = 'left';
  ctx.font = `${Math.max(17, R(0.05))}px system-ui, sans-serif`;
  for (let k = 0; k < ERUPTS[s.day]; k++) {
    ctx.globalAlpha = k < s.left ? 1 : 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🌋', 6 + k * Math.max(21, R(0.064)), bot + (h - bot) / 2 + 1);
  }
  ctx.globalAlpha = 1;
  const sx0 = w * 0.36, sw = w * 0.6, sy = bot + (h - bot) * 0.66;
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
  ctx.font = `${Math.max(14, R(0.042))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(s.phase === 'night' ? '🌙' : '☀️', sx0 + sw * f, sy);
  ctx.font = `700 12px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText(s.left > 0 ? (s.pending.length ? '용암이 흐르는 중…' : '해 질 때까지') : '분출 끝 — 자라는 중', sx0 + sw / 2, bot + (h - bot) * 0.27);
  // 새 소식 띠 (한 번에 둘, 차례로)
  {
    let ny = top + 14, shown = 0, slot = -1e9;
    ctx.textAlign = 'center';
    for (const n of s.notes) {
      const start = Math.max(n.t, slot + 70);
      slot = start;
      const age = s.t - start;
      if (age < 0 || age > 200 || shown >= 2) continue;
      const al = Math.min(1, (200 - age) / 30, age / 8 + 0.01);
      ctx.globalAlpha = al;
      ctx.font = `800 13px system-ui, sans-serif`;
      const tw = ctx.measureText(n.text).width + 18;
      ctx.fillStyle = 'rgba(10,20,40,.7)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2, ny - 10, tw, 21, 10);
      ctx.fill();
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, w / 2, ny + 1);
      ny += 24;
      shown++;
    }
    ctx.globalAlpha = 1;
  }
  if (s.day === 0 && s.erupts === 0 && s.charge === 0 && s.t > 10) {
    ctx.font = `900 ${Math.max(15, R(0.046))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const ty = bot - 16, msg = '👆 꾹 누른 만큼 멀리 — 떼면 콸콸!';
    ctx.strokeText(msg, w / 2, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(msg, w / 2, ty);
  }

  function ring(x: number, y: number, col: string) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, TW * 0.42 * (1 + 0.08 * Math.sin(s.t / 4)), TW * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
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
  /** 작은 사람 (원점 = 발), 팔 들기 */
  function person(x: number, y: number, col: string, arms: boolean) {
    const u = TW * 0.05;
    ctx.fillStyle = col;
    ctx.fillRect(x - u, y - u * 3.6, u * 2.2, u * 3.2);
    if (arms) {
      ctx.strokeStyle = '#ffd9b0';
      ctx.lineWidth = Math.max(1, u * 0.8);
      ctx.beginPath();
      ctx.moveTo(x - u, y - u * 3.2);
      ctx.lineTo(x - u * 2.6, y - u * 5.6);
      ctx.moveTo(x + u * 1.2, y - u * 3.2);
      ctx.lineTo(x + u * 2.8, y - u * 5.6);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd9b0';
    ctx.beginPath();
    ctx.arc(x + u * 0.1, y - u * 4.8, u * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawHouse(x: number, y: number, k: number) {
    const sz = TW * 0.3, wh = TW * 0.3, roof = ['#e0533d', '#3d7fe0', '#e09a3d', '#9a4de0'][Math.floor(hsh(k * 11) * 4)];
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
    for (let p = 0; p < 3; p++) {
      const ph = ((s.t + p * 30 + k * 7) % 90) / 90;
      ctx.fillStyle = `rgba(230,230,235,${0.5 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + sz * 0.5 + ph * 5, y - wh - sz * 1.2 - ph * TW * 0.5, TW * 0.05 + ph * TW * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    // 주민: 평소엔 산책, 용암이 올 자리면 '!' 하고 동동, 성공한 밤엔 만세 점프, 실패한 밤엔 데굴데굴
    const scared = !!preview[k];
    for (let p = 0; p < 2; p++) {
      const an = s.t / (scared ? 8 : sad ? 10 : 40 + p * 13) + k + p * 3, px = x + Math.cos(an) * TW * 0.36, py0 = y + 3 + Math.sin(an) * TH * 0.3;
      const jump = scared ? Math.abs(Math.sin(s.t / 3 + p)) * TW * 0.18 : dance ? Math.abs(Math.sin(s.t / 6 + p * 1.5)) * TW * 0.2 : 0, py = py0 - jump;
      ctx.save();
      ctx.translate(px, py);
      if (sad) ctx.rotate(s.t / 4 + p);
      person(0, 0, ['#3a6fd8', '#d84a6a'][p], dance || scared);
      ctx.restore();
    }
    if (scared) says.unshift([x, y - wh - sz * 1.6, '안 돼~!', true]);
    else if (dance && hsh(k) < 0.5) says.push([x, y - wh - sz * 1.6, '만세!', false]);
    else if (recent(['dock'], 90) >= 0 && I.g[k] < 120) says.push([x, y - wh - sz * 1.6, '이사 왔어요~', false]);
    else if (recent(['erupt'], 70) >= 0 && s.events.some((e) => e.kind === 'erupt' && e.text === '뿌웅~' && s.t - e.t < 70)) says.push([x, y - wh - sz * 1.6, '킁킁… 누구야?', false]);
  }
  function boat(x: number, y: number, sc: number, crew: boolean) {
    const u = TW * 0.4 * sc;
    poly([[x - u, y - u * 0.25], [x + u, y - u * 0.25], [x + u * 0.7, y + u * 0.2], [x - u * 0.7, y + u * 0.2]], mix('#9a5a2a', '#3a2010', night * 0.5));
    poly([[x - u, y - u * 0.25], [x + u, y - u * 0.25], [x + u * 0.85, y - u * 0.1], [x - u * 0.85, y - u * 0.1]], mix('#c8844a', '#4a2a14', night * 0.5));
    ctx.strokeStyle = '#5a3a20';
    ctx.lineWidth = Math.max(1, u * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y - u * 0.25);
    ctx.lineTo(x, y - u * 1.6);
    ctx.stroke();
    poly([[x + u * 0.05, y - u * 1.55], [x + u * 0.05, y - u * 0.4], [x + u * 0.8, y - u * 0.4]], mix('#ffffff', '#9aa0b0', night * 0.5));
    poly([[x, y - u * 1.6], [x, y - u * 1.35], [x - u * 0.35, y - u * 1.47]], '#e0453a');
    if (crew) {
      const wave = Math.sin(s.t / 6) > 0;
      person(x - u * 0.45, y - u * 0.2, '#3a6fd8', wave);
      person(x - u * 0.15, y - u * 0.2, '#d84a6a', !wave);
    }
  }
  function drawVisitor(i: number, j: number, k: number) {
    const [x, y0] = P(i + 0.5, j + 0.5, 0), bob = Math.sin(s.t / 14 + k) * TW * 0.05, y = y0 + bob;
    const doomed = !!preview[k], ok = !!touch[k];
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y0 + TW * 0.04, TW * (0.3 + 0.05 * Math.sin(s.t / 10 + k)), TW * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (I.vis[k] === COCO) {
      ctx.save();
      ctx.translate(x, y + TW * 0.12);
      ctx.rotate(Math.sin(s.t / 20 + k) * 0.25 + (doomed ? Math.sin(s.t) * 0.3 : 0));
      emoji('🥥', 0, 0, TW * 0.62);
      ctx.restore();
    } else {
      boat(x, y, 1, true);
      if (doomed) says.unshift([x, y - TW * 0.95, '안 돼!!', true]);
      else if (ok) says.unshift([x, y - TW * 0.95, '여기 여기!', false]);
    }
    if (ok) ring(x, y0, '#7dff8a'), shout(x + TW * 0.35, y - TW * 0.45, '✓', '#2fbf4a');
    if (doomed) {
      const pulse = 0.6 + 0.4 * Math.sin(s.t / 4);
      ctx.strokeStyle = `rgba(255,40,40,${pulse})`;
      ctx.lineWidth = 3;
      const r = TW * 0.22;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r - TW * 0.2);
      ctx.lineTo(x + r, y + r - TW * 0.2);
      ctx.moveTo(x + r, y - r - TW * 0.2);
      ctx.lineTo(x - r, y + r - TW * 0.2);
      ctx.stroke();
    }
  }
  function drawPalm(x: number, y: number, k: number) {
    const hgt = TW * 0.85, lean = (hsh(k) - 0.5) * TW * 0.3;
    ctx.fillStyle = 'rgba(0,30,10,.25)';
    ctx.beginPath();
    ctx.ellipse(x + TW * 0.1, y + 1, TW * 0.3, TW * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mix('#9a6a3a', '#3a2614', night * 0.6);
    ctx.lineWidth = TW * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.2, y - hgt * 0.6, x + lean, y - hgt);
    ctx.stroke();
    ctx.lineCap = 'butt';
    const tx0 = x + lean, ty0 = y - hgt, sway = Math.sin(s.t / 25 + k) * 0.12;
    for (let q = 0; q < 5; q++) {
      const an = -Math.PI / 2 + (q - 2) * 0.75 + sway, lx = Math.cos(an) * TW * 0.42, ly = Math.sin(an) * TW * 0.22;
      ctx.strokeStyle = mix(q % 2 ? '#3fae4a' : '#5cc85a', '#12301a', night * 0.6);
      ctx.lineWidth = TW * 0.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx0, ty0);
      ctx.quadraticCurveTo(tx0 + lx * 0.6, ty0 + ly - TW * 0.1, tx0 + lx, ty0 + ly + TW * 0.14);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.fillStyle = '#6a4024';
    ctx.beginPath();
    ctx.arc(tx0 - 2, ty0 + 3, TW * 0.05, 0, Math.PI * 2);
    ctx.arc(tx0 + 3, ty0 + 4, TW * 0.05, 0, Math.PI * 2);
    ctx.fill();
    // 게: 옆으로 종종종, 성공한 밤엔 집게 들고 춤
    const cxp = x + Math.sin(s.t / 18 + k) * TW * 0.25, hop = dance ? Math.abs(Math.sin(s.t / 5)) * TW * 0.15 : 0;
    emoji('🦀', cxp, y + TW * 0.12 - hop, TW * 0.5);
    if (preview[k]) shout(cxp, y - TW * 0.4, '!');
  }
  function drawCrater(x: number, y: number, sc: number) {
    // 원뿔 화산: 아래 넓고 위 좁은 산, 꼭대기에 용암 웅덩이. 누를수록 볼이 빨개지고 부풀며 용암 줄기가 산허리로 번진다
    const p = Math.min(1, s.charge / FULL), flow = s.pending.length > 0, Hc = CONE * sc, bw = TW * 0.95 * sc, tw = TW * 0.36 * sc, ty = y - Hc;
    const swell = s.charge > 0 ? 1 + p * 0.07 + Math.sin(s.t * 0.9) * 0.02 * p : 1;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 2, bw * 1.1, bw * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
    const red = sc === 1 ? p * p * 0.45 : 0;
    body.addColorStop(0, mix(mix('#7a6a70', '#c0504a', red), '#2a2430', night * 0.6));
    body.addColorStop(0.45, mix(mix('#5a4c56', '#a03a36', red), '#201a24', night * 0.6));
    body.addColorStop(1, mix(mix('#33282f', '#601e20', red), '#120e14', night * 0.6));
    ctx.beginPath();
    ctx.moveTo(x - bw * swell, y);
    ctx.quadraticCurveTo(x, y + bw * 0.42, x + bw * swell, y);
    ctx.lineTo(x + tw * swell, ty);
    ctx.lineTo(x - tw * swell, ty);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1.4;
    for (const q of [-0.55, 0.15, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(x + tw * q, ty + 2);
      ctx.lineTo(x + bw * q * 1.1, y + 1);
      ctx.stroke();
    }
    const streak = flow ? 1 : p;
    if (streak > 0) {
      ctx.strokeStyle = `rgba(255,${120 + 80 * streak},40,${0.5 + 0.5 * streak})`;
      ctx.shadowColor = '#ff5a00';
      ctx.shadowBlur = 8;
      ctx.lineWidth = TW * 0.07;
      for (const q of [-0.6, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(x + tw * q, ty + 1);
        ctx.quadraticCurveTo(x + tw * q * 2, ty + Hc * 0.4 * streak, x + bw * q * 0.95, ty + Hc * 0.9 * streak);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    for (let q = 0; q < 4; q++) {
      const ph = ((s.t * (1 + p) + q * 25) % 100) / 100;
      ctx.fillStyle = `rgba(${flow ? '90,80,80' : '210,210,215'},${(0.35 + p * 0.3) * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(ph * 4 + q) * TW * 0.15 + ph * TW * 0.3, ty - 4 - ph * TW * 2 * sc, (TW * 0.1 + ph * TW * 0.25) * sc, 0, Math.PI * 2);
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
    ctx.ellipse(x, ty + (1 - p), tw * (0.7 + p * 0.25), tw * 0.34 * (0.7 + p * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (p > 0)
      for (let q = 0; q < 5; q++) {
        const ph = ((s.t * 3 + q * 17) % 30) / 30;
        ctx.fillStyle = `rgba(255,240,160,${1 - ph})`;
        ctx.beginPath();
        ctx.arc(x + (hsh(q + Math.floor(s.t / 10)) - 0.5) * tw, ty - ph * TW * 0.25 * (1 + p * 2), TW * 0.04 * (1 + p * 1.5), 0, Math.PI * 2);
        ctx.fill();
      }
    lights.push([x, ty, 0.6 + p * 0.4]);
  }
  function drawFace() {
    const [cx0, cy0] = conePos, p = Math.min(1, s.charge / FULL), flow = s.pending.length > 0;
    const shake = s.charge > 0 ? Math.sin(s.t * 1.7) * (0.5 + p * 2) : 0, hop = dance ? Math.abs(Math.sin(s.t / 6)) * 3 : 0;
    const fx0 = cx0 + shake, fy = cy0 - CONE * 0.52 - hop, ex = TW * 0.26, er = TW * 0.14;
    const oops = recent(['house', 'capsize', 'roast', 'spill'], 80), smug = recent(['palm', 'dock', 'link'], 80), relief = recent(['sum'], 50);
    const yawn = !flow && s.charge === 0 && s.phase === 'day' && s.left > 0 && s.idle > 300 && s.idle % 420 < 100 ? s.idle % 420 : -1;
    const look = P(C + 0.5 + Math.cos(s.ang), C + 0.5 + Math.sin(s.ang), I.h[CI] * HZ), lx = (look[0] - cx0) / TW, ly = (look[1] - cy0) / TW;
    const mood = s.charge > 0 ? 'strain' : dance ? 'dance' : sad ? 'sad' : oops >= 0 ? 'oops' : flow ? 'flow' : smug >= 0 ? 'smug' : relief >= 0 ? 'relief' : yawn >= 0 ? 'yawn' : s.t % 170 < 7 ? 'blink' : 'idle';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a1a1a';
    ctx.lineWidth = Math.max(1.8, TW * 0.06);
    const arc = (x: number, y: number, up: boolean) => {
      ctx.beginPath();
      ctx.arc(x, y + (up ? er * 0.4 : -er * 0.4), er * 0.9, up ? Math.PI * 1.15 : Math.PI * 0.15, up ? Math.PI * 1.85 : Math.PI * 0.85);
      ctx.stroke();
    };
    for (const sd of [-1, 1]) {
      const x = fx0 + sd * ex, y = fy;
      if (mood === 'strain') {
        ctx.beginPath();
        ctx.moveTo(x - sd * er, y - er * 0.8);
        ctx.lineTo(x + sd * er * 0.6, y);
        ctx.lineTo(x - sd * er, y + er * 0.8);
        ctx.stroke();
      } else if (mood === 'flow' || mood === 'dance' || mood === 'relief' || mood === 'smug') {
        arc(x, y, true);
        if (mood === 'smug') {
          // 우쭐: 눈썹이 쓱 올라간다
          ctx.beginPath();
          ctx.moveTo(x - er, y - er * 1.5 - (sd > 0 ? er * 0.4 : 0));
          ctx.lineTo(x + er, y - er * 1.7 - (sd > 0 ? er * 0.4 : 0));
          ctx.stroke();
        }
      } else if (mood === 'sad') arc(x, y, false);
      else if (mood === 'blink' || mood === 'yawn') {
        ctx.beginPath();
        ctx.moveTo(x - er, y);
        ctx.lineTo(x + er, y);
        ctx.stroke();
      } else {
        // 평소: 주둥이 쪽을 본다 / 앗…: 동그래진 눈, 작은 눈동자가 딴 데를 본다
        const big = mood === 'oops' ? 1.25 : 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, y, er * big, er * 1.15 * big, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a1010';
        ctx.beginPath();
        if (mood === 'oops') ctx.arc(x - er * 0.55, y - er * 0.4, er * 0.32, 0, Math.PI * 2);
        else ctx.arc(x + lx * er * 0.5, y + ly * er * 0.6, er * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      if (mood === 'strain' || mood === 'dance' || mood === 'smug') {
        ctx.fillStyle = `rgba(255,90,90,${mood === 'strain' ? 0.35 + p * 0.5 : 0.45})`;
        ctx.beginPath();
        ctx.ellipse(x + sd * er * 0.9, y + er * 1.6, er * 0.8, er * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#5a1010';
    ctx.lineWidth = Math.max(1.6, TW * 0.05);
    ctx.beginPath();
    if (mood === 'flow') (ctx.ellipse(fx0, fy + er * 2.4, er * 0.9, er * 1.1, 0, 0, Math.PI * 2), ctx.fill());
    else if (mood === 'yawn') (ctx.ellipse(fx0, fy + er * 2.4, er * 0.8 * (0.5 + 0.5 * Math.sin((yawn / 100) * Math.PI)), er * 1.2 * (0.5 + 0.5 * Math.sin((yawn / 100) * Math.PI)), 0, 0, Math.PI * 2), ctx.fill());
    else if (mood === 'strain') (ctx.moveTo(fx0 - er, fy + er * 2.2), ctx.lineTo(fx0 + er, fy + er * 2.2), ctx.stroke());
    else if (mood === 'sad') (ctx.arc(fx0, fy + er * 3, er * 0.8, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
    else if (mood === 'oops') {
      ctx.moveTo(fx0 - er, fy + er * 2.3);
      for (let q = 1; q <= 4; q++) ctx.lineTo(fx0 - er + (q * er) / 2, fy + er * 2.3 + (q % 2 ? -er * 0.3 : 0));
      ctx.stroke();
    } else if (mood === 'dance' || mood === 'smug') (ctx.arc(fx0, fy + er * 1.6, er * 1.1, 0.1, Math.PI - 0.1), ctx.fill());
    else (ctx.arc(fx0, fy + er * 1.6, er * 0.7, 0.3, Math.PI - 0.3), ctx.stroke());
    const say = (t: string, al: number) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, al));
      ctx.font = `900 ${Math.max(13, TW * 0.36)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.strokeText(t, fx0 + ex * 1.9, fy - er * 1.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(t, fx0 + ex * 1.9, fy - er * 1.6);
      ctx.globalAlpha = 1;
    };
    if (mood === 'strain' && p > 0.6) {
      // 진땀, 꽉 차면 귀에서 김이 칙칙
      const ph = (s.t % 30) / 30;
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.arc(fx0 + ex * 2, fy - er + ph * TW * 0.3, TW * 0.06, 0, Math.PI * 2);
      ctx.fill();
      if (p >= 1) {
        for (const sd of [-1, 1]) {
          const q = ((s.t * 2) % 24) / 24;
          ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - q)})`;
          ctx.beginPath();
          ctx.arc(fx0 + sd * (ex * 2.2 + q * TW * 0.4), fy - q * TW * 0.3, TW * 0.06 + q * TW * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        say('끄으응!!', 1);
      }
    }
    if (mood === 'oops') {
      const ph = ((s.t + 8) % 40) / 40;
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.ellipse(fx0 + ex * 1.9, fy - er * 0.5 + ph * TW * 0.2, TW * 0.05, TW * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      say('앗… 미안', 1 - oops / 80);
    }
    if (mood === 'smug') say('헤헤', 1 - smug / 80);
    if (mood === 'relief' && relief > 5) say('후련~', 1 - relief / 50);
    if (mood === 'yawn') say('하암~', Math.sin((yawn / 100) * Math.PI) * 1.5);
    if (sad)
      for (const sd of [-1, 1]) {
        const ph = ((s.t + (sd > 0 ? 10 : 0)) % 24) / 24;
        ctx.fillStyle = '#7fc8ff';
        ctx.beginPath();
        ctx.arc(fx0 + sd * ex, fy + er + ph * TW * 0.4, TW * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.lineCap = 'butt';
    // 갈매기: 분화구 가에 앉아 졸다가, 꾹 누르면 '깍!' 하고 날아가고, 조용해지면 돌아온다
    const sitX = cx0 - TW * 0.42, sitY = cy0 - CONE - TW * 0.02;
    let gx = sitX, gy = sitY, flying = false, startle = -1;
    if (s.charge > 0) (flying = true), (startle = s.charge), (gx = sitX - s.charge * TW * 0.05), (gy = sitY - s.charge * TW * 0.035);
    else if (flow || s.idle < 120) (flying = true), (gx = -40), (gy = -40);
    else if (s.idle < 200) {
      const q = 1 - (s.idle - 120) / 80;
      (flying = true), (gx = sitX - q * TW * 4), (gy = sitY - q * TW * 2.4);
    }
    if (gx > -20) {
      const u = TW * 0.12, flap = flying ? Math.sin(s.t / 2) * u * 1.2 : 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(gx, gy, u * 1.3, u * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx - u * 1.0, gy - u * 0.55, u * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb030';
      poly([[gx - u * 1.5, gy - u * 0.6], [gx - u * 2.1, gy - u * 0.4], [gx - u * 1.5, gy - u * 0.3]], '#ffb030');
      ctx.fillStyle = '#222';
      ctx.fillRect(gx - u * 1.15, gy - u * 0.75, Math.max(1.5, u * 0.22), Math.max(1.5, u * 0.22));
      ctx.strokeStyle = '#9aa4b4';
      ctx.lineWidth = Math.max(1.5, u * 0.35);
      ctx.beginPath();
      if (flying) (ctx.moveTo(gx - u * 0.6, gy - flap), ctx.lineTo(gx + u * 0.2, gy), ctx.lineTo(gx + u * 1.0, gy - flap));
      else (ctx.moveTo(gx - u * 0.3, gy - u * 0.1), ctx.lineTo(gx + u * 1.4, gy + u * 0.15));
      ctx.stroke();
      if (startle >= 0 && startle < 40) shout(gx, gy - u * 1.6, '깍!', '#333333');
      if (!flying && s.idle > 300 && s.idle % 420 >= 100 && s.idle % 420 < 200) shout(gx + u, gy - u * 1.4, 'z', '#7a8aa0');
    }
  }
  function drawLight(x: number, y: number) {
    const hgt = TW * 1.1, bw = TW * 0.14;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 1, bw * 2, bw * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    poly([[x - bw, y], [x + bw, y], [x + bw * 0.6, y - hgt], [x - bw * 0.6, y - hgt]], mix('#ffffff', '#8a8a9a', night * 0.5));
    for (let q = 0; q < 3; q++) {
      const y0 = y - hgt * (0.2 + q * 0.3), y1 = y0 - hgt * 0.12, f0 = 1 - (0.2 + q * 0.3) * 0.4, f1 = f0 - 0.05;
      poly([[x - bw * f0, y0], [x + bw * f0, y0], [x + bw * f1, y1], [x - bw * f1, y1]], '#e0453a');
    }
    ctx.fillStyle = dusk > 0.1 ? '#fff3a0' : '#ffe9a0';
    ctx.shadowColor = '#ffe080';
    ctx.shadowBlur = 6 + dusk * 14;
    ctx.fillRect(x - bw * 0.7, y - hgt - bw * 1.4, bw * 1.4, bw * 1.4);
    ctx.shadowBlur = 0;
    poly([[x - bw, y - hgt - bw * 1.4], [x + bw, y - hgt - bw * 1.4], [x, y - hgt - bw * 2.6]], '#c0392b');
  }
  function drawHarbor(i: number, j: number, k: number) {
    const [x, y] = P(i + 0.5, j + 0.5, 0);
    poly([P(i + 0.25, j + 0.1, 3), P(i + 0.75, j + 0.1, 3), P(i + 0.75, j + 0.9, 3), P(i + 0.25, j + 0.9, 3)], mix('#a8743e', '#3a2a1a', night * 0.5));
    ctx.strokeStyle = 'rgba(60,30,10,.6)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 5; q++) {
      ctx.beginPath();
      ctx.moveTo(...P(i + 0.25, j + 0.1 + q * 0.16, 3));
      ctx.lineTo(...P(i + 0.75, j + 0.1 + q * 0.16, 3));
      ctx.stroke();
    }
    const bob = Math.sin(s.t / 14 + k) * 1.5;
    boat(x + TW * 0.3, y + bob, 0.75, I.feat[k] === PIER);
  }
  function drawSpring(i: number, j: number, k: number) {
    poly([P(i + 0.12, j + 0.12, 1), P(i + 0.88, j + 0.12, 1), P(i + 0.88, j + 0.88, 1), P(i + 0.12, j + 0.88, 1)], mix('#7de8d8', '#2a5a60', night * 0.5));
    const [x, y] = P(i + 0.5, j + 0.5, 1);
    for (let p = 0; p < 3; p++) {
      const ph = ((s.t + p * 20 + k * 5) % 60) / 60;
      ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + (p - 1) * TW * 0.15 + Math.sin(ph * 6) * 2, y - ph * TW * 0.5, TW * 0.07 + ph * TW * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    emoji('🐒', x + TW * 0.1, y + TW * 0.1, TW * 0.45);
  }
  function drawPreview(i: number, j: number, z: number, k: number) {
    const pulse = 0.5 + 0.5 * Math.sin(s.t / 4);
    const pts = [P(i, j, z + 1), P(i + 1, j, z + 1), P(i + 1, j + 1, z + 1), P(i, j + 1, z + 1)];
    poly(pts, `rgba(255,${K[k] === SEA ? 160 : 80},30,${0.5 + 0.2 * pulse})`);
    ctx.strokeStyle = `rgba(255,240,180,${0.5 + 0.3 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const q of pts) ctx.lineTo(...q);
    ctx.closePath();
    ctx.stroke();
    if (LIFE[K[k]] || I.feat[k]) {
      const [x, y] = P(i + 0.5, j + 0.5, z + 2), r = TW * 0.13;
      ctx.strokeStyle = `rgba(255,40,40,${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = Math.max(2, TW * 0.07);
      ctx.beginPath();
      ctx.moveTo(x - r, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r);
      ctx.lineTo(x - r, y + r);
      ctx.stroke();
    }
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
interface Plan { press: number; hold: number; n: number; day: number; v: number; dt: number }
const plans = new WeakMap<object, Plan>();
const OFF: Input = { tap: false, dir: 0 };
const tag = (s: VolcanoState) => s.day * 10 + s.hearts;

/** 못하는 봇: 아무 때나 누르고 아무만큼 누른다 */
export const volcanoRandom: Bot<VolcanoState> = {
  name: '아무렇게나',
  act(s, rng) {
    if (s.phase !== 'day' || s.left <= 0 || s.pending.length) return OFF;
    let m = plans.get(s);
    if (!m || m.n !== s.erupts || m.day !== tag(s)) plans.set(s, (m = { press: s.dayT + 20 + Math.floor(rng() * 150), hold: 8 + Math.floor(rng() * 90), n: s.erupts, day: tag(s), v: 0, dt: 0 }));
    if (s.charge === 0) return { tap: false, dir: 0, hold: s.dayT >= m.press };
    return { tap: false, dir: 0, hold: s.charge < m.hold };
  },
};

const mark = new Uint32Array(NN), mark2 = new Uint32Array(NN);
let stamp = 0;
function worth(I: Isle, k: number) {
  const kd = I.kind[k], g = I.g[k];
  let v = kd === ROCK ? 0.15 + (g / G_GRASS) * 0.6 : kd === GRASS ? 1 + g / G_FOREST : kd === FOREST ? 2 + (g / G_ANIMAL) * 1.5 : kd === ANIMAL ? 4 : kd === HOUSE ? 14 : kd === PALM ? 6 : 0;
  if (I.islet[k] && !I.linked) v *= 1.5;
  return v + (I.feat[k] ? 9 : 0);
}
/** 한 번의 분출을 흉내 내 값을 매긴다: 새 땅(바다 칸) + 딱 닿은 손님 − 덮이는 생명 − 넘친 용암 */
function judge(s: VolcanoState, f1: Flow, V1: number, f2: Flow | null, V2: number) {
  stamp++;
  const I = s.isle;
  let gain = 0, loss = 0, spill = 0, gift = 0;
  const run = (fl: Flow, V: number) => {
    for (let n = 0; n < fl.cells.length && fl.cum[n] <= V; n++) {
      const k = fl.cells[n];
      if (mark[k] === stamp) continue;
      mark[k] = stamp;
      if (!I.dish[k]) spill++;
      else if (I.kind[k] === SEA) {
        gain += 1;
        if (I.feat[k]) loss += 8;
        if (I.vis[k]) loss += VIS_PEN[I.vis[k]] * 2;
      } else loss += worth(I, k);
    }
  };
  const touch = (fl: Flow, V: number) => {
    for (let n = 0; n < fl.cells.length && fl.cum[n] <= V; n++) {
      const k = fl.cells[n];
      if (!I.dish[k]) continue;
      for (const q of NB4[k]) {
        if (mark[q] === stamp || mark2[q] === stamp) continue;
        if (I.vis[q]) (mark2[q] = stamp), (gift += I.vis[q] === COCO ? 12 : 20), I.vis[q] === COCO && (gain += 1);
        else if (I.islet[q] && !I.linked) (mark2[q] = stamp), (gift += 18);
      }
    }
  };
  run(f1, V1);
  if (f2) run(f2, V2);
  touch(f1, V1);
  if (f2) touch(f2, V2);
  // 오늘 ★ 넓이까지 모자란 땅은 아주 값지게, ★★★까지는 값지게, 그 너머도 앞날의 생명(칸마다 4)으로.
  // 덮인 생명은 다시 자라지만, 늦게 덮을수록 해 질 녘까지 돌아올 시간이 없다
  const ga = GOAL_A[s.day], g1 = Math.min(gain, Math.max(0, ga[0] - s.area)), g3 = Math.min(gain - g1, Math.max(0, ga[2] - s.area - g1));
  const late = 0.8 + (1.4 * s.dayT) / DAY;
  return g1 * 8 + g3 * 4 + (gain - g1 - g3) * 2.5 + gift - loss * late - spill * SPILL * late;
}
const HOLDS = [8, 13, 19, 26, 33, 41, 50, 60, 72, 90];
/** 앞으로 주둥이가 가리킬 각도마다 흐름을 한 번 계산하고, 누를 시간마다 '언제 눌러야 그 각도에서 떼게 되는지'를 거꾸로 맞춘다 */
function plan(s: VolcanoState, holds = HOLDS) {
  const now = s.dayT, span = Math.max(40, Math.min(500, (DAY - now - 150) / Math.max(1, s.left)));
  let best: Plan = { press: now + 60, hold: 0, n: s.erupts, day: tag(s), v: s.area >= GOAL_A[s.day][0] ? 0 : -1e9, dt: 0 };
  for (let dt = 6; dt <= span; dt += 3) {
    const th = s.ang + s.spinDir * SPIN * dt, block = rainMask(s.day, now + dt + 20);
    const f1 = flowOrder(s.isle, CI, th, block, VMAX), f2 = s.isle.vent >= 0 ? flowOrder(s.isle, s.isle.vent, th + Math.PI, block, VMAX * 0.6) : null;
    for (const H of holds) {
      const wait = Math.round(dt - H * HOLD_SPIN);
      if (wait < 2 || now + wait + H > DAY - 20) continue;
      const V = vol(H), v = judge(s, f1, V, f2, V * 0.6) - (wait + H) * 0.004;
      if (v > best.v) best = { press: now + wait, hold: H, n: s.erupts, day: tag(s), v, dt };
    }
  }
  return best;
}

function holdBot(s: VolcanoState, make: () => Plan): Input {
  if (s.phase !== 'day' || s.left <= 0 || s.pending.length) return OFF;
  let m = plans.get(s);
  if (s.charge > 0) return { tap: false, dir: 0, hold: s.charge < (m?.hold ?? 40) - 1 };
  if (!m || m.n !== s.erupts || m.day !== tag(s) || m.press < s.dayT - 3 || (!m.hold && s.dayT >= m.press)) plans.set(s, (m = make()));
  return { tap: false, dir: 0, hold: m.hold > 0 && s.dayT + 1 >= m.press };
}

/** 잘하는 봇: 앞으로 주둥이가 가리킬 방향 × 누를 시간 10가지를 흉내 내서, 새 땅·선물은 많고 덮이는 생명·넘침은 적은 분출을 골라 그대로 누르고 뗀다 */
export const volcanoSmart: Bot<VolcanoState> = {
  name: '화산 장인',
  act: (s) => holdBot(s, () => plan(s)),
};

/** 비교용(계기판 미등록): 방향은 장인처럼 잘 고르고, 누르는 양만 아무렇게나 — '얼마나'가 결과를 얼마나 바꾸는지 잰다 */
export const volcanoAimOnly: Bot<VolcanoState> = {
  name: '방향만 장인',
  act(s, rng) {
    return holdBot(s, () => {
      const b = plan(s);
      if (!b.hold) return b;
      const ok = HOLDS.filter((H) => Math.round(b.dt - H * HOLD_SPIN) >= 2 && s.dayT + Math.round(b.dt - H * HOLD_SPIN) + H <= DAY - 20);
      const H = ok.length ? ok[Math.floor(rng() * ok.length)] : b.hold;
      return { ...b, hold: H, press: s.dayT + Math.round(b.dt - H * HOLD_SPIN) };
    });
  },
};
