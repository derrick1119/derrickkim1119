/**
 * 타일 섬 (19라운드 메뉴 1) — 타일 놓기 × 꾸미기·디오라마 · 원버튼.
 * 기준 9(조작 최소): 섬 둘레의 빈칸을 빛나는 표시가 저절로 돈다. 원하는 칸에 왔을 때 탭하면 지금 타일이 '쿵' 떨어진다.
 * 와우: 떨어진 타일이 이웃과 어울리면 저절로 변신한다 — 집+숲 = 연기 오두막(굴뚝 연기·주민), 집 셋 = 마을 광장, 숲+물 = 폭포, 물 셋 = 호수(돛단배)…
 * 첫 3초: 숲 두 칸만 있는 섬. 첫 타일은 집 — 어디에 떨어져도 숲 옆이라 굴뚝에서 연기가 오르고 주민이 걸어 나온다.
 * 목표·보상: 계절(판)마다 타일 8개로 '아름다움 +목표'를 채우면 별 1~3개. 못 채우면 하트 −1, 그 계절만 처음부터(하트 3개).
 *           1계절은 목표가 낮아 거의 못 진다. 6계절(1년 봄 → 2년 여름)을 마치면 끝 — 키운 섬의 아름다움이 점수.
 * 고민 거리: 지금 타일 + 다음 3개가 보인다. 좋은 자리(숲 옆·집 둘 옆)는 하나뿐이라 '지금 쓸까, 다음 집에게 남길까'.
 * 하는 일이 바뀐다: 2계절 물(폭포·논·호수 — 물길 잇기) → 3계절 눈산이 바다에서 솟음(다리 놓아 잇기·산장) →
 *                  4계절 꽃밭(서로 다른 이웃 사이에) → 5계절 사막이 솟음(물 대면 오아시스, 밭은 마름) → 6계절 등대(바다로 튀어나온 끝에).
 * 웃음(오너 추가 기준): 옆 칸에 타일이 쿵 하면 주민이 눈이 커져 펄쩍('!'), 오리는 엉덩이만 내놓고 거꾸로 첨벙, 사슴은 깡충.
 *                  변신이 생기면 근처 주민이 막춤, 계절 완성엔 다 같이 춤, 실패하면 데굴데굴 구르며 머리 위에 별이 돈다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, R = 5, N = 2 * R + 1, NN = N * N, CENTER = R * N + R;
/** 떨어지는 시간 · 표시 한 바퀴(틱) · 한 칸 머무는 최소/최대 · 계절 사이 쉼 */
const DROP = 16, LAP = 170, SMIN = 10, SMAX = 18, PAUSE = 130;
/** 타일 종류 */
const FOR = 1, HOU = 2, FLD = 3, WAT = 4, MTN = 5, SND = 6, FLW = 7, LHT = 8;
/** 변신(이웃 조합) 비트 */
const COT = 1, PLZ = 2, LDG = 4, PAD = 8, DRY = 16, FAL = 32, LAK = 64, OAS = 128, GRV = 256, BLM = 512, LIT = 1024, BRG = 2048;

export const KIND = [
  { e: '', name: '' },
  { e: '🌲', name: '숲' },
  { e: '🏠', name: '집' },
  { e: '🌾', name: '밭' },
  { e: '💧', name: '물' },
  { e: '🏔️', name: '눈산' },
  { e: '🏜️', name: '사막' },
  { e: '🌷', name: '꽃밭' },
  { e: '🗼', name: '등대' },
];
export const COMBOS = [
  { bit: COT, id: 'cottage', name: '연기 오두막', col: '#ffe8cc', pts: '+2' },
  { bit: PLZ, id: 'plaza', name: '마을 광장', col: '#ffd43b', pts: '+2씩' },
  { bit: GRV, id: 'grove', name: '사슴 숲', col: '#8ce99a', pts: '+1씩' },
  { bit: FAL, id: 'falls', name: '폭포', col: '#a5d8ff', pts: '+3' },
  { bit: PAD, id: 'paddy', name: '물댄 논', col: '#b2f2bb', pts: '+3' },
  { bit: LAK, id: 'lake', name: '호수', col: '#74c0fc', pts: '+2씩' },
  { bit: LDG, id: 'lodge', name: '눈산 산장', col: '#e7f5ff', pts: '+3' },
  { bit: BRG, id: 'bridge', name: '섬 잇기', col: '#ffffff', pts: '+5' },
  { bit: BLM, id: 'bloom', name: '꽃 잔치', col: '#faa2c1', pts: '' },
  { bit: OAS, id: 'oasis', name: '오아시스', col: '#96f2d7', pts: '+4' },
  { bit: DRY, id: 'dry', name: '마른 밭', col: '#e8a87c', pts: '−2' },
  { bit: LIT, id: 'light', name: '등대 불빛', col: '#fff3bf', pts: '' },
];

interface Season { n: number; goal: number; w: [number, number][]; intro?: number; land?: number }
const BASE: [number, number][] = [[HOU, 3], [FOR, 3], [FLD, 2], [WAT, 3]];
export const SEASONS: Season[] = [
  { n: 8, goal: 6, w: [[HOU, 4], [FOR, 3], [FLD, 2]] },
  { n: 8, goal: 18, w: BASE, intro: WAT },
  { n: 8, goal: 24, w: BASE, land: MTN },
  { n: 8, goal: 24, w: [...BASE, [FLW, 2]], intro: FLW },
  { n: 8, goal: 28, w: [...BASE, [FLW, 1]], land: SND },
  { n: 8, goal: 30, w: [...BASE, [FLW, 1], [LHT, 1]], intro: LHT },
];
const SEASON_NAME = ['봄', '여름', '가을', '겨울'];
const INTRO: Record<number, string> = {
  [WAT]: '새 타일 💧 물 — 숲 옆이면 폭포, 셋 이으면 호수!',
  [MTN]: '새 땅! 눈산이 솟았어요 — 다리로 이으면 +5, 옆에 집은 산장',
  [FLW]: '새 타일 🌷 꽃밭 — 서로 다른 이웃이 많을수록 +2씩',
  [SND]: '새 땅! 사막 — 물을 대면 오아시스, 밭은 말라요',
  [LHT]: '새 타일 🗼 등대 — 바다에 닿은 면마다 +2',
};

/** 이웃 표 (위·아래·왼쪽·오른쪽, 판 밖은 -1) */
const NBR = new Int16Array(NN * 4).fill(-1);
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++)
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy], k) => {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && X < N && Y >= 0 && Y < N) NBR[(y * N + x) * 4 + k] = Y * N + X;
    });

const comp = new Int16Array(NN), csz = new Int16Array(NN), q = new Int16Array(NN), reach = new Uint8Array(NN), FORMS = new Int32Array(NN);

/** 섬의 아름다움 (봇이 내다볼 때도 같은 함수). forms를 주면 칸마다 변신 비트를 채운다 */
export function beauty(g: Int8Array, forms: Int32Array | null): number {
  comp.fill(-1);
  let nc = 0;
  for (let c = 0; c < NN; c++) {
    const k = g[c];
    if ((k === FOR || k === HOU || k === WAT) && comp[c] < 0) {
      let qh = 0, qt = 0;
      q[qt++] = c;
      comp[c] = nc;
      while (qh < qt) {
        const u = q[qh++];
        for (let d = 0; d < 4; d++) {
          const v = NBR[u * 4 + d];
          if (v >= 0 && comp[v] < 0 && g[v] === k) (comp[v] = nc), (q[qt++] = v);
        }
      }
      csz[nc++] = qt;
    }
  }
  reach.fill(0);
  if (g[CENTER]) {
    let qh = 0, qt = 0;
    q[qt++] = CENTER;
    reach[CENTER] = 1;
    while (qh < qt) {
      const u = q[qh++];
      for (let d = 0; d < 4; d++) {
        const v = NBR[u * 4 + d];
        if (v >= 0 && !reach[v] && g[v]) (reach[v] = 1), (q[qt++] = v);
      }
    }
  }
  let total = 0, bm = false, bs = false;
  for (let c = 0; c < NN; c++) {
    const k = g[c];
    if (!k) {
      if (forms) forms[c] = 0;
      continue;
    }
    let f = 0, v = 0, adj = 0, sea = 0;
    for (let d = 0; d < 4; d++) {
      const n = NBR[c * 4 + d];
      if (n < 0 || !g[n]) sea++;
      else adj |= 1 << g[n];
    }
    if (k === FOR) {
      if (csz[comp[c]] >= 3) (f |= GRV), (v += 1);
    } else if (k === HOU) {
      if (adj & (1 << FOR)) (f |= COT), (v += 2);
      if (adj & (1 << MTN)) (f |= LDG), (v += 3);
      if (csz[comp[c]] >= 3) (f |= PLZ), (v += Math.min(5, csz[comp[c]] - 1));
    } else if (k === FLD) {
      v = 1;
      if (adj & (1 << WAT)) (f |= PAD), (v += 3);
      else if (adj & (1 << SND)) (f |= DRY), (v -= 2);
    } else if (k === WAT) {
      v = 1;
      if (adj & (1 << FOR)) (f |= FAL), (v += 2);
      if (csz[comp[c]] >= 3) (f |= LAK), (v += Math.min(5, csz[comp[c]] - 1));
      if (adj & (1 << SND)) (f |= OAS), (v += 4);
    } else if (k === FLW) {
      let n = 0;
      for (let b = 1; b <= 8; b++) if (adj & (1 << b)) n++;
      v = 2 * n;
      if (n >= 3) f |= BLM;
    } else if (k === LHT) {
      v = 2 * sea;
      if (sea >= 2) f |= LIT;
    } else if (k === MTN) bm ||= !!reach[c];
    else if (k === SND) bs ||= !!reach[c];
    total += v;
    if (forms) forms[c] = f;
  }
  if (bm) total += 5;
  if (bs) total += 5;
  if (forms) for (let c = 0; c < NN; c++) if ((g[c] === MTN && bm) || (g[c] === SND && bs)) forms[c] |= BRG;
  return total;
}

/** 놓을 수 있는 칸: 땅에 닿은 빈 바다 칸 */
export function frontier(g: Int8Array, out: number[] = []): number[] {
  out.length = 0;
  for (let c = 0; c < NN; c++) {
    if (g[c]) continue;
    for (let d = 0; d < 4; d++) {
      const n = NBR[c * 4 + d];
      if (n >= 0 && g[n]) {
        out.push(c);
        break;
      }
    }
  }
  return out;
}

interface Tile { k: number; born: number; form: number; formT: number }
interface Ev { t: number; kind: string; c: number; text?: string; col?: string; n?: number }
export interface IsleState {
  rng: Rng; t: number; season: number; hearts: number; stars: number; starLog: number[];
  g: Int8Array; tiles: (Tile | null)[]; snap: { g: Int8Array; tiles: (Tile | null)[] } | null;
  front: number[]; ang: number[]; cur: number; curT: number; step: number; heading: number;
  deck: number[]; need: number; placed: number; goal: number; base: number; beauty: number; lastGain: number;
  falling: { c: number; k: number; t0: number } | null;
  pause: number; outcome: '' | 'clear' | 'fail'; dayStart: number;
  book: Set<string>; seen: Set<string>; events: Ev[]; dead: boolean; done: boolean;
}

const ev = (s: IsleState, kind: string, c: number, text?: string, col?: string, n?: number) => s.events.push({ t: s.t, kind, c, text, col, n });
function see(s: IsleState, key: string, text?: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (text) ev(s, 'new', -1, text);
}
const cx = (c: number) => c % N, cy = (c: number) => (c / N) | 0;

/** 표시가 도는 순서: 섬 한가운데를 기준으로 화면에서 시계 방향 */
function refreshFront(s: IsleState) {
  frontier(s.g, s.front);
  let su = 0, sv = 0, n = 0;
  for (let c = 0; c < NN; c++) if (s.g[c]) (su += cx(c) - cy(c)), (sv += (cx(c) + cy(c)) * 0.58), n++;
  const mu = su / n, mv = sv / n;
  const pairs = s.front.map((c) => [c, Math.atan2((cx(c) + cy(c)) * 0.58 - mv, cx(c) - cy(c) - mu)] as [number, number]).sort((a, b) => a[1] - b[1]);
  s.front = pairs.map((p) => p[0]);
  s.ang = pairs.map((p) => p[1]);
  const i = s.ang.findIndex((a) => a > s.heading + 1e-6);
  s.cur = i < 0 ? 0 : i;
  s.curT = 0;
  s.step = Math.max(SMIN, Math.min(SMAX, Math.round(LAP / Math.max(1, s.front.length))));
}

function genDeck(s: IsleState): number[] {
  const sp = SEASONS[s.season], tot = sp.w.reduce((a, x) => a + x[1], 0), out: number[] = [];
  for (let i = 0; i < sp.n; i++) {
    let r = s.rng() * tot;
    for (const [k, wt] of sp.w) if ((r -= wt) < 0) {
      out.push(k);
      break;
    }
  }
  if (s.season === 0) {
    out[0] = HOU; // 첫 3초: 숲 옆에 집 → 연기·주민
    for (let i = 1, hs = out.filter((k) => k === HOU).length; hs < 3 && i < out.length; i++) if (out[i] !== HOU && i % 2 === 1) (out[i] = HOU), hs++;
  }
  if (sp.intro && !out.slice(0, 2).includes(sp.intro)) out[1] = sp.intro;
  // 등대는 한 계절에 둘까지
  for (let i = 0, nl = 0; i < out.length; i++) if (out[i] === LHT && ++nl > 2) out[i] = FOR;
  return out;
}

/** 새 땅(눈산·사막): 섬에서 한 칸 떨어진 바다에 두 칸짜리 섬이 솟는다 */
function raiseLand(s: IsleState, k: number) {
  const land: number[] = [];
  for (let c = 0; c < NN; c++) if (s.g[c]) land.push(c);
  const cands: [number, number][] = [];
  const ok = (c: number) => {
    if (s.g[c] || cx(c) < 1 || cy(c) < 1 || cx(c) > N - 2 || cy(c) > N - 2) return false;
    for (let d = 0; d < 4; d++) if (s.g[NBR[c * 4 + d]]) return false;
    return true;
  };
  const dist = (c: number) => Math.min(...land.map((l) => Math.abs(cx(l) - cx(c)) + Math.abs(cy(l) - cy(c))));
  for (let c = 0; c < NN; c++)
    for (const c2 of [NBR[c * 4], NBR[c * 4 + 2]]) {
      if (c2 < 0 || !ok(c) || !ok(c2)) continue;
      if (Math.min(dist(c), dist(c2)) === 2) cands.push([c, c2]);
    }
  if (!cands.length) return;
  const [a, b] = cands[Math.floor(s.rng() * cands.length)];
  for (const c of [a, b]) (s.g[c] = k), (s.tiles[c] = { k, born: s.t, form: 0, formT: s.t });
  ev(s, 'rise', a, INTRO[k], k === MTN ? '#e7f5ff' : '#ffe8a3');
  see(s, `k${k}`);
}

function newSeason(s: IsleState, retry: boolean) {
  const sp = SEASONS[s.season];
  if (!retry) {
    if (sp.land) raiseLand(s, sp.land);
    s.snap = { g: s.g.slice(), tiles: s.tiles.map((t) => t && { ...t }) };
  }
  s.base = s.beauty = beauty(s.g, FORMS);
  for (let c = 0; c < NN; c++) if (s.tiles[c]) s.tiles[c]!.form = FORMS[c];
  s.deck = genDeck(s);
  s.need = sp.n;
  s.goal = sp.goal;
  s.placed = 0;
  s.outcome = '';
  s.dayStart = s.t;
  s.lastGain = 0;
  if (sp.intro && !s.seen.has(`k${sp.intro}`)) see(s, `k${sp.intro}`, INTRO[sp.intro]);
  refreshFront(s);
  ev(s, 'season', -1, `${Math.floor(s.season / 4) + 1}년 ${SEASON_NAME[s.season % 4]}${retry ? ' 다시' : ''} — 아름다움 +${sp.goal}`);
}

function land(s: IsleState) {
  const { c, k } = s.falling!;
  s.falling = null;
  s.g[c] = k;
  s.tiles[c] = { k, born: s.t, form: 0, formT: s.t };
  const before = s.beauty;
  s.beauty = beauty(s.g, FORMS);
  s.lastGain = s.beauty - before;
  ev(s, 'land', c, `${s.lastGain >= 0 ? '+' : ''}${s.lastGain}`, undefined, s.lastGain);
  let shown = 0;
  for (const cb of COMBOS) {
    let at = -1;
    for (let i = 0; i < NN; i++) {
      const t = s.tiles[i];
      if (t && FORMS[i] & cb.bit && !(t.form & cb.bit) && (at < 0 || i === c)) at = i;
    }
    if (at < 0) continue;
    const first = !s.book.has(cb.id);
    s.book.add(cb.id);
    see(s, `c:${cb.id}`);
    ev(s, first ? 'discover' : 'combo', at, `${cb.name}!${cb.pts ? ' ' + cb.pts : ''}`, cb.col, shown++);
  }
  for (let i = 0; i < NN; i++) {
    const t = s.tiles[i];
    if (!t) continue;
    if (FORMS[i] & ~t.form) t.formT = s.t;
    t.form = FORMS[i];
  }
  s.placed++;
  refreshFront(s);
  if (s.placed >= s.need || !s.deck.length || !s.front.length) endSeason(s);
}

const starsFor = (gain: number, goal: number) => (gain >= goal * 1.8 ? 3 : gain >= goal * 1.35 ? 2 : gain >= goal ? 1 : 0);

function endSeason(s: IsleState) {
  const gain = s.beauty - s.base, st = starsFor(gain, s.goal);
  if (st > 0) {
    s.stars += st;
    s.starLog.push(st);
    s.outcome = 'clear';
    ev(s, 'clear', -1, `${SEASON_NAME[s.season % 4]} 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, undefined, st);
  } else {
    s.hearts--;
    s.outcome = 'fail';
    ev(s, 'fail', -1, `아름다움 ${gain}/${s.goal} — 하트 −1${s.hearts > 0 ? ', 이 계절 다시!' : ''}`);
  }
  s.pause = PAUSE;
}

export const isle: GameDef<IsleState> = {
  id: 'isle',
  name: '타일 섬',
  genes: ['tiles', 'decorate', 'onebutton'],
  twist: '섬 둘레를 저절로 도는 표시가 원하는 빈칸에 올 때 탭하면 다음 타일이 쿵 떨어지고, 어울리는 이웃끼리 저절로 변신한다(집+숲=연기 오두막, 숲+물=폭포, 집 셋=마을 광장)',
  rules: [
    '빛나는 칸이 섬 둘레를 돌아요. 원하는 칸에 오면 탭(스페이스) — 타일이 쿵!',
    '어울리는 이웃끼리 변신해 섬이 예뻐져요: 집+숲=오두막, 집 셋=광장, 숲+물=폭포…',
    '계절마다 아름다움 목표를 채우면 별. 못 채우면 하트 −1, 그 계절만 다시.',
  ],
  controls: 'tap',
  hint: '탭 = 빛나는 칸에 타일 떨어뜨리기 / 스페이스',
  aspect: A,
  art: {
    concept: '바다 위 작은 섬 디오라마',
    mood: '흙층이 보이는 두툼한 땅 조각이 파란 바다에 떠 있다. 숲·밭·집·연못이 계절 색으로 물들고, 저녁이면 창마다 불이 켜지고 굴뚝 연기가 오른다.',
    palette: { bg: '#1b6c96', ink: '#ffffff', muted: '#9cc9dc', accent: '#ffd43b', hot: '#ff6b6b', soft: '#e3f4fb' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s: IsleState = {
      rng: mulberry32(seed), t: 0, season: 0, hearts: 3, stars: 0, starLog: [], g: new Int8Array(NN), tiles: Array(NN).fill(null), snap: null,
      front: [], ang: [], cur: 0, curT: 0, step: SMAX, heading: -Math.PI / 2, deck: [], need: 0, placed: 0, goal: 0, base: 0, beauty: 0, lastGain: 0,
      falling: null, pause: 0, outcome: '', dayStart: 0, book: new Set(), seen: new Set(), events: [], dead: false, done: false,
    };
    for (const c of [CENTER, CENTER + 1]) (s.g[c] = FOR), (s.tiles[c] = { k: FOR, born: -100, form: 0, formT: -100 });
    newSeason(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length > 40 || (s.events.length && s.t - s.events[0].t > 150)) s.events = s.events.filter((e) => s.t - e.t < 150);
    if (s.pause > 0) {
      if (--s.pause > 0) return;
      if (s.outcome === 'clear') {
        if (s.season + 1 >= SEASONS.length) return void (s.done = true);
        s.season++;
        newSeason(s, false);
      } else {
        // 실패: 이 계절 시작 때 섬으로 되돌리고 다시
        s.g = s.snap!.g.slice();
        s.tiles = s.snap!.tiles.map((t) => t && { ...t });
        if (s.hearts <= 0) {
          s.beauty = beauty(s.g, null);
          return void (s.dead = true);
        }
        newSeason(s, true);
      }
      return;
    }
    if (s.falling) {
      if (s.t - s.falling.t0 >= DROP) land(s);
      return;
    }
    if (inp.tap && s.deck.length && s.front.length) {
      const c = s.front[s.cur];
      s.heading = s.ang[s.cur];
      s.falling = { c, k: s.deck.shift()!, t0: s.t };
      ev(s, 'drop', c);
      return;
    }
    if (++s.curT >= s.step) {
      s.cur = (s.cur + 1) % s.front.length;
      s.curT = 0;
      s.heading = s.ang[s.cur];
    }
  },
  over: (s) => s.dead || s.done,
  score: (s) => s.beauty + s.stars * 5,
  draw(ctx, s, w, h, th: Theme) {
    drawIsle(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const GRASS = ['#a6dc7a', '#74c95a', '#dcbb62', '#eef3f6'];
const LIP = ['#7cbc52', '#4f9e3b', '#b8923a', '#c3d2db'];
const SEA = [['#86d6ee', '#2f93c4'], ['#5fcbec', '#1677b0'], ['#6aa8c6', '#2a5e84'], ['#93b6cb', '#3a5e7c']];
const TREE = [['#45a956', '#2e7f3e'], ['#2f9447', '#1e6a31'], ['#f59f00', '#d9480f'], ['#3f7f66', '#2b5b49']];
const SHIRT = ['#e03131', '#1971c2', '#f08c00', '#7048e8', '#2f9e44', '#e64980'];
interface Light { x: number; y: number; r: number; col: string; a: number; beam?: number }

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, hw: number, hh: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - hh);
  ctx.lineTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x - hw, y);
  ctx.closePath();
}
function poly(ctx: CanvasRenderingContext2D, ...p: number[]) {
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.closePath();
}
function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, sea: number, sway: number, seed: number) {
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  oval(ctx, x + sz * 0.1, y + sz * 0.02, sz * 0.3, sz * 0.11);
  ctx.fill();
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - sz * 0.05, y - sz * 0.26, sz * 0.1, sz * 0.28);
  const [c1, c2] = TREE[sea];
  const layers = [[0.2, 0.42, 0.55], [0.48, 0.32, 0.5]];
  layers.forEach(([b, hwid, ht], i) => {
    const by = y - sz * b, bw = sz * hwid, tx = x + sway * (i + 1), ty = by - sz * ht;
    ctx.fillStyle = sea === 2 && (seed + i) % 2 ? '#e8590c' : c2;
    poly(ctx, x - bw, by, x, by + bw * 0.22, tx, ty);
    ctx.fill();
    ctx.fillStyle = sea === 2 && (seed + i) % 2 ? '#fab005' : c1;
    poly(ctx, x, by + bw * 0.22, x + bw, by, tx, ty);
    ctx.fill();
    if (sea === 3) {
      ctx.fillStyle = '#ffffff';
      poly(ctx, tx - bw * 0.35, ty + sz * ht * 0.35, tx, ty, tx + bw * 0.35, ty + sz * ht * 0.35, tx, ty + sz * ht * 0.25);
      ctx.fill();
    }
  });
  if (sea === 0) {
    ctx.fillStyle = '#ffc9e3';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(x + Math.sin(seed + k * 2.1) * sz * 0.22, y - sz * (0.35 + k * 0.17), sz * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 주민: 평소엔 아장아장, 옆에 타일이 쿵 하면 펄쩍(눈이 커지고 '!'), 변신·계절 완성엔 막춤, 실패하면 데굴데굴 */
function person(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, col: string, t: number, o: Look) {
  const jump = o.startle < 36, dance = !jump && (o.mood === 'dance' || o.party < 80), roll = !jump && o.mood === 'roll';
  let lift = Math.abs(Math.sin(t / 5)) * sz * 0.25, ang = 0;
  if (jump) lift = Math.sin((o.startle / 36) * Math.PI) * sz * 4.5;
  else if (dance) (lift = Math.abs(Math.sin(t / 6)) * sz * 1.6), (ang = Math.sin(t / 6) * 0.45);
  else if (roll) (ang = t / 3.2), (lift = sz * 0.3), (x += Math.sin(t / 22) * sz * 2.2);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  oval(ctx, x, y, sz * 0.7 * (1 - Math.min(0.6, lift / (sz * 8))), sz * 0.25);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - lift - sz * 1.15);
  ctx.rotate(ang);
  // 팔
  const arm = jump ? -sz * 1.0 : dance ? -sz * 0.5 + Math.sin(t / 3) * sz * 0.5 : roll ? -sz * 0.2 : sz * 0.35;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1, sz * 0.22);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-sz * 0.35, 0);
  ctx.lineTo(-sz * 0.85, dance ? -arm : arm);
  ctx.moveTo(sz * 0.35, 0);
  ctx.lineTo(sz * 0.85, arm);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = col;
  oval(ctx, 0, sz * 0.25, sz * 0.45, sz * 0.7);
  ctx.fill();
  ctx.fillStyle = '#ffd8b5';
  ctx.beginPath();
  ctx.arc(0, -sz * 0.75, sz * 0.48, 0, Math.PI * 2);
  ctx.fill();
  // 얼굴
  ctx.fillStyle = '#212529';
  ctx.strokeStyle = '#212529';
  ctx.lineWidth = Math.max(0.6, sz * 0.12);
  for (const ex of [-1, 1]) {
    const px = ex * sz * 0.19, py = -sz * 0.78;
    if (jump) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py - sz * 0.05, sz * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#212529';
      ctx.beginPath();
      ctx.arc(px, py - sz * 0.05, sz * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (dance) {
      ctx.beginPath();
      ctx.arc(px, py + sz * 0.05, sz * 0.12, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (roll) {
      ctx.beginPath();
      ctx.moveTo(px - sz * 0.1, py - sz * 0.1);
      ctx.lineTo(px + sz * 0.1, py + sz * 0.1);
      ctx.moveTo(px + sz * 0.1, py - sz * 0.1);
      ctx.lineTo(px - sz * 0.1, py + sz * 0.1);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, sz * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (jump) {
    ctx.beginPath();
    ctx.arc(0, -sz * 0.45, sz * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (jump && o.startle < 26) {
    ctx.font = `900 ${Math.max(10, sz * 2.2)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeText('!', x, y - lift - sz * 3.4);
    ctx.fillStyle = '#ffe066';
    ctx.fillText('!', x, y - lift - sz * 3.4);
  }
  if (roll) {
    ctx.fillStyle = '#ffe066';
    for (let k = 0; k < 3; k++) {
      const a = t / 8 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * sz * 0.9, y - sz * 2.9 + Math.sin(a) * sz * 0.3, Math.max(0.8, sz * 0.16), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 오리: 물에 둥둥, 옆에 타일이 쿵 하면 엉덩이만 내놓고 거꾸로 첨벙 */
function duck(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, t: number, o: Look) {
  const bob = Math.sin(t / 14 + o.seed) * sz * 0.12;
  if (o.startle < 60) {
    const k = Math.sin(t / 2) * sz * 0.35;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    oval(ctx, x, y, sz * (0.8 + o.startle / 50), sz * (0.3 + o.startle / 140));
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    poly(ctx, x - sz * 0.45, y, x + sz * 0.45, y, x + sz * 0.1, y - sz * 0.75);
    ctx.fill();
    ctx.strokeStyle = '#ff922b';
    ctx.lineWidth = Math.max(1, sz * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - sz * 0.05, y - sz * 0.6);
    ctx.lineTo(x - sz * 0.35 + k, y - sz * 1.15);
    ctx.moveTo(x + sz * 0.2, y - sz * 0.6);
    ctx.lineTo(x + sz * 0.45 - k, y - sz * 1.15);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#ffffff';
  oval(ctx, x, y + bob, sz * 0.6, sz * 0.32);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + sz * 0.42, y - sz * 0.35 + bob, sz * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff922b';
  poly(ctx, x + sz * 0.62, y - sz * 0.38 + bob, x + sz * 0.9, y - sz * 0.3 + bob, x + sz * 0.62, y - sz * 0.25 + bob);
  ctx.fill();
  ctx.fillStyle = '#212529';
  ctx.beginPath();
  ctx.arc(x + sz * 0.48, y - sz * 0.42 + bob, Math.max(0.5, sz * 0.06), 0, Math.PI * 2);
  ctx.fill();
}

function house(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, sea: number, form: number, o: Look) {
  const bw = sz * 0.5, bh = sz * 0.29, wh = sz * 0.48, rh = sz * 0.46;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  oval(ctx, x + sz * 0.12, y + bh * 0.4, bw * 1.25, bh * 1.05);
  ctx.fill();
  poly(ctx, x - bw, y, x, y + bh, x, y + bh - wh, x - bw, y - wh);
  ctx.fillStyle = '#f1e2c6';
  ctx.fill();
  poly(ctx, x, y + bh, x + bw, y, x + bw, y - wh, x, y + bh - wh);
  ctx.fillStyle = '#d3bb93';
  ctx.fill();
  // 문 · 창
  ctx.fillStyle = '#7a4527';
  poly(ctx, x + bw * 0.35, y + bh * 0.65, x + bw * 0.62, y + bh * 0.38, x + bw * 0.62, y + bh * 0.38 - wh * 0.55, x + bw * 0.35, y + bh * 0.65 - wh * 0.55);
  ctx.fill();
  const wx = x - bw * 0.5, wy = y + bh * 0.5 - wh * 0.62, lit = o.dusk > 0.12;
  ctx.fillStyle = lit ? '#ffe08a' : '#58708a';
  poly(ctx, wx - bw * 0.16, wy - bh * 0.16, wx + bw * 0.16, wy + bh * 0.16, wx + bw * 0.16, wy + bh * 0.16 - wh * 0.32, wx - bw * 0.16, wy - bh * 0.16 - wh * 0.32);
  ctx.fill();
  if (lit) o.lights?.push({ x: wx, y: wy - wh * 0.16, r: sz * 0.45, col: '#ffcf6b', a: Math.min(1, o.dusk * 2.2) });
  // 지붕 (모임지붕)
  const ax = x, ay = y - wh - rh, ov = 1.12, roof = form & LDG ? ['#5c7cfa', '#4263eb'] : form & PLZ ? ['#f76707', '#d9480f'] : ['#e03131', '#b02525'];
  poly(ctx, x - bw * ov, y - wh, x, y - bh * ov - wh, x + bw * ov, y - wh, ax, ay);
  ctx.fillStyle = roof[1];
  ctx.fill();
  poly(ctx, x - bw * ov, y - wh, x, y + bh * ov - wh, ax, ay);
  ctx.fillStyle = roof[1];
  ctx.fill();
  poly(ctx, x, y + bh * ov - wh, x + bw * ov, y - wh, ax, ay);
  ctx.fillStyle = roof[0];
  ctx.fill();
  if (sea === 3 || form & LDG) {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    poly(ctx, ax, ay, x - bw * 0.55, y - wh - rh * 0.45 + bh * 0.3, x, y - wh - rh * 0.4 + bh * 0.55, x + bw * 0.55, y - wh - rh * 0.45 + bh * 0.3);
    ctx.fill();
  }
  // 굴뚝 + 연기 (숲 옆 = 장작)
  const chx = x + bw * 0.42, chy = y - wh - rh * 0.35;
  ctx.fillStyle = '#8d5a3b';
  ctx.fillRect(chx - sz * 0.05, chy - sz * 0.2, sz * 0.1, sz * 0.22);
  ctx.fillStyle = '#5c3a26';
  ctx.fillRect(chx - sz * 0.06, chy - sz * 0.22, sz * 0.12, sz * 0.04);
  if (form & COT) {
    const age = o.t - o.formT;
    for (let k = 0; k < 4; k++) {
      const ph = ((o.t + k * 22 + o.seed * 5) % 88) / 88;
      if (age < k * 22) continue;
      ctx.globalAlpha = (1 - ph) * 0.65;
      ctx.fillStyle = o.dusk > 0.3 ? '#cfd4e6' : '#f8f9fa';
      ctx.beginPath();
      ctx.arc(chx + Math.sin(ph * 5 + o.seed) * sz * 0.08 + ph * sz * 0.25, chy - sz * 0.24 - ph * sz * 0.9, sz * (0.06 + ph * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

interface Look { t: number; sea: number; form: number; formT: number; seed: number; dusk: number; lights: Light[] | null; startle: number; party: number; mood: '' | 'dance' | 'roll' }
const CALM = { startle: 999, party: 999, mood: '' as const };

/** 타일 한 칸: 두께 있는 흙 덩어리 + 윗면 + 장식 */
function drawTile(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, tw: number, o: Look) {
  const hw = tw / 2, hh = tw * 0.29, d = tw * 0.24, f = o.form, sea = o.sea;
  let top = GRASS[sea], lip = LIP[sea], sl = ['#8a5a33', '#5e3b20'], sr = ['#a86d3d', '#7a4c29'];
  if (k === SND) (top = '#f3d9a4'), (lip = '#ddb978'), (sl = ['#c99a5b', '#9c7240']), (sr = ['#ddb070', '#b98848']);
  if (k === MTN) (top = '#c1c9d1'), (lip = '#98a3ae'), (sl = ['#6f7b87', '#525c66']), (sr = ['#8c98a4', '#6b7682']);
  if (k === LHT) (top = '#cfc6b4'), (lip = '#a89f8c');
  if (k === HOU && f & PLZ) top = '#ead7a6';
  if (k === FLD) top = f & PAD ? '#94d89a' : f & DRY ? '#c9a27a' : sea === 3 ? '#e8edf0' : '#e8c66a';
  // 옆면 (흙층)
  for (const [side, cols] of [[-1, sl], [1, sr]] as [number, string[]][]) {
    const g = ctx.createLinearGradient(0, y, 0, y + hh + d);
    g.addColorStop(0, cols[0]);
    g.addColorStop(1, cols[1]);
    ctx.fillStyle = g;
    poly(ctx, x + side * hw, y, x, y + hh, x, y + hh + d, x + side * hw, y + d);
    ctx.fill();
    ctx.fillStyle = lip;
    poly(ctx, x + side * hw, y, x, y + hh, x, y + hh + d * 0.24, x + side * hw, y + d * 0.24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,.28)';
    ctx.lineWidth = Math.max(0.6, tw * 0.015);
    ctx.beginPath();
    ctx.moveTo(x + side * hw, y + d * 0.62);
    ctx.lineTo(x, y + hh + d * 0.62);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,220,.22)';
    for (let p = 0; p < 2; p++) {
      const a = 0.25 + 0.45 * (((o.seed * 7 + p * 13 + (side + 1) * 5) % 10) / 10);
      ctx.beginPath();
      ctx.arc(x + side * hw * (1 - a), y + hh * a + d * (0.42 + 0.3 * p), tw * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 윗면
  diamond(ctx, x, y, hw, hh);
  ctx.fillStyle = top;
  ctx.fill();
  const hl = ctx.createLinearGradient(x - hw, y - hh, x + hw * 0.5, y + hh);
  hl.addColorStop(0, 'rgba(255,255,255,.22)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = Math.max(0.6, tw * 0.015);
  ctx.beginPath();
  ctx.moveTo(x - hw, y);
  ctx.lineTo(x, y - hh);
  ctx.lineTo(x + hw, y);
  ctx.stroke();
  const t = o.t, sway = Math.sin(t / 34 + o.seed) * tw * 0.012;
  if (k === FOR) {
    for (const [dx, dy, sc] of [[0, -0.5, 0.36], [-0.48, 0, 0.4], [0.46, -0.04, 0.38], [0.02, 0.42, 0.42]]) tree(ctx, x + dx * hw, y + dy * hh, tw * sc, sea, sway, o.seed + dx * 3);
    if (f & GRV) {
      // 사슴이 나무 사이를 거닌다
      const ph = Math.sin(t / 70 + o.seed), dx = x + ph * hw * 0.35, dy = y + hh * 0.18 - (o.startle < 30 ? Math.sin((o.startle / 30) * Math.PI) * tw * 0.25 : o.party < 80 ? Math.abs(Math.sin(t / 5)) * tw * 0.06 : 0), dir = Math.cos(t / 70 + o.seed) > 0 ? 1 : -1, sz = tw * 0.07;
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      oval(ctx, dx, dy + sz * 0.9, sz * 1.1, sz * 0.3);
      ctx.fill();
      ctx.strokeStyle = '#7a4a26';
      ctx.lineWidth = Math.max(1, sz * 0.25);
      ctx.beginPath();
      for (const lx of [-0.6, 0.6]) ctx.moveTo(dx + lx * sz, dy), ctx.lineTo(dx + lx * sz, dy + sz * 0.9);
      ctx.stroke();
      ctx.fillStyle = '#b8743b';
      oval(ctx, dx, dy - sz * 0.1, sz, sz * 0.5);
      ctx.fill();
      oval(ctx, dx + dir * sz * 0.95, dy - sz * 0.8, sz * 0.38, sz * 0.32);
      ctx.fill();
      ctx.strokeStyle = '#5c3a1e';
      ctx.lineWidth = Math.max(0.8, sz * 0.15);
      ctx.beginPath();
      ctx.moveTo(dx + dir * sz * 0.9, dy - sz * 1.05);
      ctx.lineTo(dx + dir * sz * 0.7, dy - sz * 1.6);
      ctx.stroke();
    }
  } else if (k === HOU) {
    if (f & PLZ) {
      // 광장: 줄 깃발 + 가로등
      ctx.strokeStyle = 'rgba(80,50,30,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - hw * 0.85, y - tw * 0.22);
      ctx.quadraticCurveTo(x, y + hh * 0.6, x + hw * 0.85, y - tw * 0.22);
      ctx.stroke();
      for (let i = 1; i < 6; i++) {
        const a = i / 6, fx = x - hw * 0.85 + a * hw * 1.7, fy = y - tw * 0.22 + 4 * a * (1 - a) * (hh * 0.6 + tw * 0.22) * 0.5;
        ctx.fillStyle = SHIRT[(i + o.seed) % SHIRT.length];
        poly(ctx, fx - tw * 0.03, fy, fx + tw * 0.03, fy, fx, fy + tw * 0.06);
        ctx.fill();
      }
      const lx = x - hw * 0.62, ly = y + hh * 0.2;
      ctx.fillStyle = '#495057';
      ctx.fillRect(lx - 1, ly - tw * 0.32, 2, tw * 0.32);
      ctx.fillStyle = '#fff3bf';
      ctx.beginPath();
      ctx.arc(lx, ly - tw * 0.33, tw * 0.035, 0, Math.PI * 2);
      ctx.fill();
      o.lights?.push({ x: lx, y: ly - tw * 0.33, r: tw * 0.5, col: '#ffe066', a: 0.25 + o.dusk });
    }
    house(ctx, x + hw * 0.05, y - hh * 0.05, tw * 0.62, sea, f, o);
    if (f & COT || f & PLZ) {
      // 주민: 문에서 걸어 나와 집 둘레를 돈다
      const n = f & PLZ ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const age = t - o.formT, out = Math.min(1, age / 45), a = (t + i * 140) / (60 + i * 20) + o.seed + i * 3;
        const px = x + hw * 0.3 + (Math.cos(a) * hw * 0.66 - hw * 0.3) * out, py = y + hh * 0.42 + (Math.sin(a) * hh * 0.5 - hh * 0.42 + hh * 0.2) * out;
        person(ctx, px, py, tw * 0.085, SHIRT[(o.seed + i) % SHIRT.length], t + i * 7, o);
      }
    }
  } else if (k === FLD) {
    const rows = 5, rowCol = f & PAD ? '#4caf50' : f & DRY ? '#9c7550' : sea === 3 ? '#c8d3da' : sea === 2 ? '#c98a1b' : '#b8962e';
    for (let r = 1; r < rows; r++) {
      const b = r / rows;
      const x0 = x - hw + b * hw + 0.08 * hw, y0 = y + b * hh - 0.08 * hh, x1 = x + b * hw - 0.08 * hw, y1 = y - hh + b * hh + 0.08 * hh;
      ctx.strokeStyle = rowCol;
      ctx.lineWidth = Math.max(1, tw * 0.035);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      if (!(f & DRY) && sea !== 3)
        for (let k2 = 0; k2 < 4; k2++) {
          const a = (k2 + 0.5) / 4, px = x0 + (x1 - x0) * a, py = y0 + (y1 - y0) * a - tw * 0.03 + Math.sin(t / 25 + r + k2) * tw * 0.006;
          ctx.fillStyle = f & PAD ? '#2b8a3e' : '#f5d042';
          oval(ctx, px, py, tw * 0.022, tw * 0.034);
          ctx.fill();
        }
    }
    if (f & PAD) {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 20 + o.seed);
      ctx.fillStyle = '#e7f5ff';
      for (let k2 = 0; k2 < 3; k2++) ctx.fillRect(x - hw * 0.4 + k2 * hw * 0.35, y - hh * 0.1 + k2 * hh * 0.15, tw * 0.06, 1.2);
      ctx.globalAlpha = 1;
    }
    if (f & DRY) {
      ctx.strokeStyle = 'rgba(90,50,20,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - hw * 0.4, y);
      ctx.lineTo(x - hw * 0.1, y + hh * 0.15);
      ctx.lineTo(x + hw * 0.1, y - hh * 0.2);
      ctx.lineTo(x + hw * 0.4, y + hh * 0.05);
      ctx.stroke();
    }
    if (sea !== 3 && !(f & DRY)) {
      // 허수아비
      const sx = x + hw * 0.4, sy = y - hh * 0.1;
      ctx.strokeStyle = '#7a4a26';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - tw * 0.2);
      ctx.moveTo(sx - tw * 0.07, sy - tw * 0.14);
      ctx.lineTo(sx + tw * 0.07, sy - tw * 0.14);
      ctx.stroke();
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(sx, sy - tw * 0.22, tw * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (k === WAT) {
    const py = y + hh * 0.06;
    diamond(ctx, x, py, hw * 0.74, hh * 0.74);
    const wg = ctx.createLinearGradient(x, py - hh, x, py + hh);
    wg.addColorStop(0, sea === 3 ? '#a5d8ff' : '#74c0fc');
    wg.addColorStop(1, sea === 3 ? '#4dabf7' : '#1c7ed6');
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,40,60,.35)';
    ctx.lineWidth = Math.max(1, tw * 0.02);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = Math.max(0.8, tw * 0.015);
    for (let k2 = 0; k2 < 3; k2++) {
      const ph = (t / 90 + k2 / 3 + o.seed * 0.13) % 1, lx = x - hw * 0.35 + ph * hw * 0.7, ly = py - hh * 0.3 + k2 * hh * 0.25;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
      ctx.beginPath();
      ctx.moveTo(lx - tw * 0.05, ly);
      ctx.lineTo(lx + tw * 0.05, ly);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (f & FAL) {
      // 바위 턱에서 떨어지는 폭포
      const rx = x - hw * 0.1, ry = y - hh * 0.55;
      ctx.fillStyle = '#868e96';
      poly(ctx, rx - tw * 0.16, ry + tw * 0.02, rx - tw * 0.12, ry - tw * 0.2, rx + tw * 0.02, ry - tw * 0.26, rx + tw * 0.16, ry - tw * 0.14, rx + tw * 0.16, ry + tw * 0.04);
      ctx.fill();
      ctx.fillStyle = '#adb5bd';
      poly(ctx, rx - tw * 0.12, ry - tw * 0.2, rx + tw * 0.02, ry - tw * 0.26, rx + tw * 0.16, ry - tw * 0.14, rx, ry - tw * 0.12);
      ctx.fill();
      ctx.fillStyle = 'rgba(231,245,255,.9)';
      ctx.fillRect(rx - tw * 0.06, ry - tw * 0.16, tw * 0.12, tw * 0.22);
      ctx.fillStyle = '#74c0fc';
      for (let k2 = 0; k2 < 3; k2++) ctx.fillRect(rx - tw * 0.045 + k2 * tw * 0.035, ry - tw * 0.16 + ((t * 0.8 + k2 * 5) % (tw * 0.2)), 1.5, tw * 0.05);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let k2 = 0; k2 < 4; k2++) {
        ctx.beginPath();
        ctx.arc(rx + (k2 - 1.5) * tw * 0.05, ry + tw * 0.07 + Math.sin(t / 6 + k2) * 1.5, tw * (0.035 + 0.01 * Math.sin(t / 9 + k2)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!(f & LAK)) duck(ctx, x + hw * 0.22, py + hh * 0.18, tw * 0.1, t, o);
    if (f & LAK) {
      const bx = x + Math.sin(t / 90 + o.seed) * hw * 0.3, by = py + hh * 0.15 + Math.cos(t / 90 + o.seed) * hh * 0.15, sz = tw * 0.12;
      ctx.fillStyle = '#8d5a3b';
      ctx.beginPath();
      ctx.moveTo(bx - sz, by);
      ctx.lineTo(bx + sz, by);
      ctx.lineTo(bx + sz * 0.6, by + sz * 0.4);
      ctx.lineTo(bx - sz * 0.6, by + sz * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      poly(ctx, bx, by - sz * 1.4, bx, by - sz * 0.05, bx + sz * 0.8, by - sz * 0.1);
      ctx.fill();
    }
    if (f & OAS) {
      const px = x - hw * 0.55, pyy = y + hh * 0.05;
      ctx.strokeStyle = '#8d5a3b';
      ctx.lineWidth = Math.max(1.2, tw * 0.03);
      ctx.beginPath();
      ctx.moveTo(px, pyy);
      ctx.quadraticCurveTo(px + tw * 0.06, pyy - tw * 0.2, px + tw * 0.02, pyy - tw * 0.36);
      ctx.stroke();
      ctx.strokeStyle = '#37b24d';
      ctx.lineWidth = Math.max(1.5, tw * 0.035);
      for (let k2 = 0; k2 < 5; k2++) {
        const a = -Math.PI / 2 + (k2 - 2) * 0.7 + Math.sin(t / 30 + k2) * 0.05;
        ctx.beginPath();
        ctx.moveTo(px + tw * 0.02, pyy - tw * 0.36);
        ctx.quadraticCurveTo(px + tw * 0.02 + Math.cos(a) * tw * 0.12, pyy - tw * 0.36 + Math.sin(a) * tw * 0.12 - tw * 0.03, px + tw * 0.02 + Math.cos(a) * tw * 0.2, pyy - tw * 0.36 + Math.sin(a) * tw * 0.12 + tw * 0.04);
        ctx.stroke();
      }
    }
  } else if (k === MTN) {
    const px = x + hw * 0.05, py = y - tw * 0.82;
    // 뒤 봉우리
    ctx.fillStyle = '#7d8995';
    poly(ctx, x - hw * 0.9, y - hh * 0.1, x - hw * 0.35, y - tw * 0.55, x + hw * 0.1, y - hh * 0.3);
    ctx.fill();
    ctx.fillStyle = '#f1f3f5';
    poly(ctx, x - hw * 0.35, y - tw * 0.55, x - hw * 0.52, y - tw * 0.4, x - hw * 0.38, y - tw * 0.43, x - hw * 0.22, y - tw * 0.4);
    ctx.fill();
    ctx.fillStyle = '#76838f';
    poly(ctx, x - hw * 0.85, y + hh * 0.05, x + hw * 0.05, y + hh * 0.72, px, py);
    ctx.fill();
    ctx.fillStyle = '#a7b2bd';
    poly(ctx, x + hw * 0.05, y + hh * 0.72, x + hw * 0.88, y + hh * 0.02, px, py);
    ctx.fill();
    const sh = 0.42, lx = px + (x - hw * 0.85 - px) * sh, ly = py + (y + hh * 0.05 - py) * sh, rx = px + (x + hw * 0.88 - px) * sh, ry = py + (y + hh * 0.02 - py) * sh, mx = px + (x + hw * 0.05 - px) * sh, my = py + (y + hh * 0.72 - py) * sh;
    ctx.fillStyle = '#ffffff';
    poly(ctx, px, py, lx, ly, (lx + mx) / 2, my - tw * 0.04, mx, my + tw * 0.03, px, py);
    ctx.fill();
    ctx.fillStyle = '#dbe4ec';
    poly(ctx, px, py, mx, my + tw * 0.03, (mx + rx) / 2, ry + tw * 0.05, rx, ry);
    ctx.fill();
    tree(ctx, x + hw * 0.6, y + hh * 0.25, tw * 0.22, 3, sway, 1);
  } else if (k === SND) {
    ctx.strokeStyle = 'rgba(190,140,70,.6)';
    ctx.lineWidth = Math.max(1, tw * 0.025);
    for (let k2 = 0; k2 < 2; k2++) {
      ctx.beginPath();
      ctx.moveTo(x - hw * 0.6 + k2 * hw * 0.3, y + hh * (0.1 + k2 * 0.3));
      ctx.quadraticCurveTo(x + k2 * hw * 0.2, y - hh * (0.35 - k2 * 0.3), x + hw * 0.55, y + hh * (0.05 + k2 * 0.25));
      ctx.stroke();
    }
    const cxp = x + hw * 0.15, cyp = y - hh * 0.1, cs = tw * 0.2;
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    oval(ctx, cxp + cs * 0.2, cyp + cs * 0.05, cs * 0.35, cs * 0.12);
    ctx.fill();
    ctx.fillStyle = '#2f9e44';
    ctx.beginPath();
    ctx.roundRect(cxp - cs * 0.12, cyp - cs, cs * 0.24, cs, cs * 0.12);
    ctx.roundRect(cxp - cs * 0.42, cyp - cs * 0.72, cs * 0.18, cs * 0.4, cs * 0.09);
    ctx.roundRect(cxp + cs * 0.24, cyp - cs * 0.85, cs * 0.18, cs * 0.45, cs * 0.09);
    ctx.fill();
    ctx.fillRect(cxp - cs * 0.3, cyp - cs * 0.42, cs * 0.2, cs * 0.1);
    ctx.fillRect(cxp + cs * 0.1, cyp - cs * 0.5, cs * 0.2, cs * 0.1);
  } else if (k === FLW) {
    const cols = ['#ff6b9d', '#ffd43b', '#ffffff', '#da77f2', '#ff922b', '#f03e3e'];
    for (let k2 = 0; k2 < 16; k2++) {
      const a = ((k2 * 37 + o.seed * 11) % 100) / 100, b = ((k2 * 61 + o.seed * 7) % 100) / 100;
      const px = x - hw + a * hw + b * hw, py = y - a * hh + b * hh;
      ctx.fillStyle = '#2b8a3e';
      ctx.fillRect(px - 0.5, py - tw * 0.05, 1, tw * 0.05);
      ctx.fillStyle = cols[k2 % cols.length];
      ctx.beginPath();
      ctx.arc(px, py - tw * 0.055 + Math.sin(t / 20 + k2) * 0.6, tw * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
    if (f & BLM)
      for (let k2 = 0; k2 < 2; k2++) {
        // 나비
        const a = t / 25 + k2 * 3 + o.seed, bx = x + Math.cos(a) * hw * 0.5, by = y - tw * 0.18 + Math.sin(a * 1.7) * hh * 0.4, flap = Math.abs(Math.sin(t / 3 + k2)) * tw * 0.04 + 1;
        ctx.fillStyle = k2 ? '#fcc419' : '#e599f7';
        oval(ctx, bx - flap * 0.6, by, flap * 0.7, tw * 0.03);
        ctx.fill();
        oval(ctx, bx + flap * 0.6, by, flap * 0.7, tw * 0.03);
        ctx.fill();
      }
  } else if (k === LHT) {
    const bx = x, by = y + hh * 0.1, tb = tw * 0.13, tt = tw * 0.08, ht = tw * 0.72;
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    oval(ctx, bx + tw * 0.08, by, tw * 0.2, tw * 0.07);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a0 = i / 4, a1 = (i + 1) / 4, w0 = tb + (tt - tb) * a0, w1 = tb + (tt - tb) * a1;
      ctx.fillStyle = i % 2 ? '#ffffff' : '#e03131';
      poly(ctx, bx - w0, by - ht * a0, bx + w0, by - ht * a0, bx + w1, by - ht * a1, bx - w1, by - ht * a1);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    poly(ctx, bx, by, bx + tb, by, bx + tt, by - ht, bx, by - ht);
    ctx.fill();
    ctx.fillStyle = '#fff3bf';
    ctx.fillRect(bx - tt, by - ht - tw * 0.1, tt * 2, tw * 0.1);
    ctx.fillStyle = '#c92a2a';
    poly(ctx, bx - tt * 1.3, by - ht - tw * 0.1, bx + tt * 1.3, by - ht - tw * 0.1, bx, by - ht - tw * 0.22);
    ctx.fill();
    o.lights?.push({ x: bx, y: by - ht - tw * 0.05, r: tw * 0.7, col: '#fff3bf', a: 0.45 + o.dusk, beam: f & LIT ? t / 40 + o.seed : undefined });
  }
}

const shown = (s: IsleState) => s.season % 4;

function drawIsle(ctx: CanvasRenderingContext2D, s: IsleState, w: number, h: number, th: Theme) {
  const fx = juice(s), m = fx.memo, sea = shown(s), t = s.t;
  const HUD = w * 0.15, PANEL = w * 0.3, top = HUD, bot = h - PANEL, areaH = bot - top;
  ctx.save();
  fx.begin(ctx);
  // 하늘빛 (계절 안에서 아침 → 저녁, 계절을 마치면 밤 불꽃)
  const prog = s.need ? s.placed / s.need : 0;
  const duskT = s.pause > 0 && s.outcome === 'clear' ? 0.42 : s.pause > 0 ? 0.32 : Math.max(0, (prog - 0.45) / 0.55) * 0.36;
  m.dusk = m.dusk === undefined ? duskT : m.dusk + (duskT - m.dusk) * 0.04;
  const dusk = m.dusk;
  // 바다
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, SEA[sea][0]);
  bg.addColorStop(1, SEA[sea][1]);
  ctx.fillStyle = bg;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 구름 그림자 · 물결
  for (let k = 0; k < 3; k++) {
    const x = ((t * 0.15 + k * 170) % (w + 200)) - 100, y = top + areaH * (0.15 + 0.33 * k);
    ctx.fillStyle = 'rgba(10,40,70,.07)';
    oval(ctx, x, y, w * 0.22, w * 0.07);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 46; k++) {
    const bx = ((k * 7919) % 997) / 997 * w, by = ((k * 104729) % 991) / 991 * h, ph = Math.sin(t / 40 + k);
    ctx.globalAlpha = 0.15 + 0.25 * Math.abs(ph);
    ctx.beginPath();
    ctx.moveTo(bx - 6 + ph * 3, by);
    ctx.quadraticCurveTo(bx + ph * 3, by - 3, bx + 6 + ph * 3, by);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 카메라: 섬 + 놓을 칸이 다 들어오게 (부드럽게 줌)
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  const fit = (c: number) => {
    const u = cx(c) - cy(c), v = cx(c) + cy(c);
    (u0 = Math.min(u0, u)), (u1 = Math.max(u1, u)), (v0 = Math.min(v0, v)), (v1 = Math.max(v1, v));
  };
  for (let c = 0; c < NN; c++) if (s.g[c]) fit(c);
  for (const c of s.front) fit(c);
  const twT = Math.min(w * 0.22, (0.94 * w) / ((u1 - u0 + 2) / 2), areaH / ((v1 - v0 + 2) * 0.29 + 0.24 + 0.75));
  const ucT = (u0 + u1) / 2, vcT = (v0 + v1) / 2;
  if (m.tw === undefined) (m.tw = twT), (m.uc = ucT), (m.vc = vcT);
  m.tw += (twT - m.tw) * 0.06;
  m.uc += (ucT - m.uc) * 0.06;
  m.vc += (vcT - m.vc) * 0.06;
  const tw = m.tw, hw = tw / 2, hh = tw * 0.29, d = tw * 0.24, oy = top + areaH / 2 + tw * 0.3;
  const X = (c: number) => w / 2 + (cx(c) - cy(c) - m.uc) * hw, Y = (c: number) => oy + (cx(c) + cy(c) - m.vc) * hh;
  const order: number[] = [];
  for (let c = 0; c < NN; c++) if (s.g[c]) order.push(c);
  order.sort((a, b) => cx(a) + cy(a) - (cx(b) + cy(b)) || cx(a) - cx(b));
  const rise = (c: number) => {
    const tl = s.tiles[c]!;
    return (tl.k === MTN || tl.k === SND) && t - tl.born < 50 ? (1 - (t - tl.born) / 50) ** 2 : 0;
  };
  // 거품 테두리 + 바다에 지는 그림자
  for (const c of order) {
    const x = X(c), y = Y(c) + d;
    ctx.fillStyle = 'rgba(8,40,70,.28)';
    diamond(ctx, x + tw * 0.14, y + hh * 0.35, hw * 1.02, hh * 1.02);
    ctx.fill();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t / 25 + c);
    ctx.fillStyle = '#e7f5ff';
    diamond(ctx, x, y, hw * (1.1 + 0.03 * Math.sin(t / 20 + c)), hh * (1.1 + 0.03 * Math.sin(t / 20 + c)));
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 놓을 수 있는 칸 (바다 위 점선)
  const playing = !s.pause && !s.falling && s.front.length > 0;
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  for (const c of s.front) {
    diamond(ctx, X(c), Y(c) + d, hw * 0.82, hh * 0.82);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // 표시: 지금 칸 + 다음 두 칸 (도는 방향)
  const curC = playing ? s.front[s.cur] : -1;
  if (playing) {
    for (let k = 2; k >= 1; k--) {
      const c = s.front[(s.cur + k) % s.front.length];
      ctx.fillStyle = `rgba(255,236,150,${0.22 / k})`;
      diamond(ctx, X(c), Y(c) + d, hw * 0.6, hh * 0.6);
      ctx.fill();
    }
    const pulse = 0.5 + 0.5 * Math.sin(t / 5);
    ctx.save();
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(255,224,102,${0.35 + 0.2 * pulse})`;
    diamond(ctx, X(curC), Y(curC) + d, hw * 0.95, hh * 0.95);
    ctx.fill();
    ctx.strokeStyle = '#fff9db';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  // 타일 (뒤에서 앞으로). 주민·동물 반응: 옆 칸에 쿵 → 펄쩍, 근처 변신 → 막춤, 계절 완성 → 다 같이 춤, 실패 → 데굴데굴
  const lights: Light[] = [], mood = s.pause > 0 ? (s.outcome === 'clear' ? 'dance' : 'roll') : '';
  const near = (c: number, kind: string, within: number, others: boolean) => {
    let best = 999;
    for (const e of s.events)
      if ((e.kind === kind || (kind === 'combo' && e.kind === 'discover')) && e.c >= 0 && t - e.t < within && (!others || e.c !== c) && Math.abs(cx(e.c) - cx(c)) + Math.abs(cy(e.c) - cy(c)) <= 1)
        best = Math.min(best, t - e.t);
    return best;
  };
  for (const c of order) {
    const tl = s.tiles[c]!, r = rise(c), age = t - tl.born;
    const bounce = tl.k !== MTN && tl.k !== SND && age >= 0 && age < 12 ? -Math.sin((age / 12) * Math.PI) * tw * 0.07 : 0;
    if (r > 0) ctx.globalAlpha = 1 - r;
    drawTile(ctx, tl.k, X(c), Y(c) + r * tw * 0.8 + bounce, tw, { t, sea, form: tl.form, formT: tl.formT, seed: c % 13, dusk, lights, startle: near(c, 'land', 60, true), party: near(c, 'combo', 90, false), mood });
    ctx.globalAlpha = 1;
  }
  // 떨어지는 타일
  if (s.falling) {
    const p = Math.min(1, (t - s.falling.t0) / DROP), c = s.falling.c, x = X(c), y = Y(c) - (1 - p) ** 2 * h * 0.55;
    ctx.fillStyle = `rgba(0,30,60,${0.15 + 0.3 * p})`;
    oval(ctx, x, Y(c) + d + hh * 0.3, hw * (0.5 + 0.5 * p), hh * (0.5 + 0.5 * p));
    ctx.fill();
    drawTile(ctx, s.falling.k, x, y, tw, { t, sea, form: 0, formT: t, seed: c % 13, dusk, lights: null, ...CALM });
  }
  // 저녁빛 + 불빛
  if (dusk > 0.01) {
    ctx.fillStyle = `rgba(28,18,72,${dusk})`;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    const gl = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    gl.addColorStop(0, `rgba(255,140,80,${dusk * 0.45})`);
    gl.addColorStop(1, 'rgba(255,140,80,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, w, h * 0.5);
  }
  for (const L of lights) {
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
    g.addColorStop(0, L.col);
    g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.globalAlpha = Math.min(1, L.a) * 0.55;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(L.x, L.y, L.r, 0, Math.PI * 2);
    ctx.fill();
    if (L.beam !== undefined) {
      ctx.globalAlpha = 0.18 + dusk * 0.4;
      ctx.fillStyle = '#fff3bf';
      const a = L.beam, len = tw * 2.6;
      ctx.beginPath();
      ctx.moveTo(L.x, L.y);
      ctx.lineTo(L.x + Math.cos(a - 0.14) * len, L.y + Math.sin(a - 0.14) * len * 0.55);
      ctx.lineTo(L.x + Math.cos(a + 0.14) * len, L.y + Math.sin(a + 0.14) * len * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // 계절 날씨 (꽃잎·반짝임·낙엽·눈)
  const wcol = ['#ffc9e3', '#fff9db', '#f08c00', '#ffffff'][sea];
  for (let k = 0; k < 22; k++) {
    const bx = (((k * 7919) % 997) / 997) * w + Math.sin(t / 50 + k) * 12, by = ((((k * 104729) % 991) / 991) * h + t * (0.25 + (k % 3) * 0.12)) % h;
    ctx.globalAlpha = sea === 1 ? 0.25 + 0.3 * Math.abs(Math.sin(t / 15 + k)) : 0.7;
    ctx.fillStyle = wcol;
    ctx.beginPath();
    ctx.arc(bx, by, sea === 1 ? 1.2 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 표시 위에 떠 있는 '지금 타일' + 얻을 아름다움 (가려지지 않게 타일 위에 테두리를 한 번 더)
  if (playing && s.deck.length) {
    const x = X(curC), base = Y(curC) + d, y = Math.max(top + tw * 0.62 + 16, Y(curC) - tw * 1.0) + Math.sin(t / 9) * tw * 0.05;
    if (m.pc !== curC || m.pp !== s.placed + s.season * 100) {
      const g = s.g.slice();
      g[curC] = s.deck[0];
      m.pg = beauty(g, null) - s.beauty;
      m.pc = curC;
      m.pp = s.placed + s.season * 100;
    }
    ctx.save();
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#fff3bf';
    ctx.lineWidth = 2;
    diamond(ctx, x, base, hw * 0.95, hh * 0.95);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,249,219,.85)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + hh * 0.8 + d);
    ctx.lineTo(x, base - hh * 0.3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff3bf';
    poly(ctx, x - tw * 0.07, base - hh * 0.55, x + tw * 0.07, base - hh * 0.55, x, base - hh * 0.2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.shadowColor = 'rgba(255,230,120,.9)';
    ctx.shadowBlur = 14;
    drawTile(ctx, s.deck[0], x, y, tw * 0.8, { t, sea, form: 0, formT: t, seed: 3, dusk: 0, lights: null, ...CALM });
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.5;
    diamond(ctx, x, y, tw * 0.4, tw * 0.8 * 0.29);
    ctx.stroke();
    const gain = m.pg, big = gain >= 6, gt = `${gain >= 0 ? '+' : ''}${gain}`, gy = y - tw * 0.62;
    ctx.font = `900 ${Math.max(13, Math.min(22, tw * (big ? 0.36 : 0.3)))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bw2 = ctx.measureText(gt).width + 12, bh2 = Math.max(17, Math.min(26, tw * 0.4));
    ctx.fillStyle = big ? '#f59f00' : gain <= 0 ? 'rgba(120,40,50,.85)' : 'rgba(8,40,64,.85)';
    if (big) (ctx.shadowColor = '#ffd43b'), (ctx.shadowBlur = 14);
    ctx.beginPath();
    ctx.roundRect(x - bw2 / 2, gy - bh2 / 2, bw2, bh2, bh2 / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = big ? '#ffffff' : gain <= 0 ? '#ffc9c9' : '#ffffff';
    ctx.fillText(gt, x, gy + 1);
  }
  // 사건 → 연출
  const seenT = m.t ?? -1, P = (c: number): [number, number] => (c < 0 ? [w / 2, top + areaH * 0.42] : [X(c), Y(c)]);
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const [x, y] = P(e.c);
    if (e.kind === 'drop') fx.ring(x, y + d, '#fff9db', hw, 2);
    if (e.kind === 'land') {
      const n = e.n ?? 0;
      fx.burst(x, y + d * 0.5, '#c8a27a', 14, 2.5, 2.5);
      fx.burst(x, y + d, '#e7f5ff', 10, 2, 2);
      fx.ring(x, y + d * 0.5, '#ffffff', hw * 1.4, 3);
      fx.kick(n >= 6 ? 7 : 3);
      fx.pop(x, y - tw * 0.4, e.text!, n >= 6 ? '#ffd43b' : n <= 0 ? '#ffa8a8' : '#ffffff', n >= 6 ? 22 : 17);
      if (n >= 6) fx.burst(x, y - tw * 0.3, '#ffd43b', 18, 4, 2.5);
    }
    if (e.kind === 'combo' || e.kind === 'discover') {
      const k = e.n ?? 0, first = e.kind === 'discover';
      fx.burst(x, y - tw * 0.2, e.col!, first ? 40 : 22, first ? 5 : 3.5, 3);
      fx.ring(x, y, e.col!, tw * (first ? 1.6 : 1), first ? 6 : 4);
      fx.pop(Math.max(w * 0.22, Math.min(w * 0.78, x)), y - tw * 0.4 - 24 - 19 * k, first ? `✨ ${e.text}` : e.text!, e.col!, first ? 18 : 15);
      if (first) fx.blink(e.col!, 0.22), fx.kick(6);
    }
    if (e.kind === 'rise') {
      fx.ring(x, y + d, '#e7f5ff', tw * 1.8, 6);
      fx.burst(x, y + d, '#a5d8ff', 40, 5, 3);
      fx.kick(10);
      fx.pop(w / 2, top + areaH * 0.9, e.text!, e.col!, 15);
    }
    if (e.kind === 'new') fx.pop(w / 2, top + areaH * 0.9, e.text!, th.accent, 15);
    if (e.kind === 'season') fx.pop(w / 2, top + areaH * 0.08, e.text!, '#ffffff', 18);
    if (e.kind === 'clear') {
      for (let k = 0; k < 3 + (e.n ?? 0); k++) {
        const fxp = w * (0.1 + 0.8 * ((k * 37) % 10) / 10), fyp = top + areaH * (0.42 + 0.4 * ((k * 53) % 10) / 10);
        fx.burst(fxp, fyp, SHIRT[k % SHIRT.length], 30, 4.5, 2.5);
        fx.ring(fxp, fyp, SHIRT[(k + 2) % SHIRT.length], 50, 3);
      }
      fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') fx.kick(10), fx.blink(th.hot, 0.25);
  }
  m.t = t;
  // 계절 끝 배너 (쉬는 동안 계속 보이게)
  if (s.done || s.dead) {
    ctx.save();
    ctx.translate(w / 2, top + areaH * 0.16);
    ctx.fillStyle = s.done ? 'rgba(255,244,200,.95)' : 'rgba(255,225,225,.95)';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(-w * 0.4, -w * 0.09, w * 0.8, w * 0.18, w * 0.04);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = s.done ? '#7a4b00' : '#a61e4d';
    ctx.font = `900 ${w * 0.058}px system-ui, sans-serif`;
    ctx.fillText(s.done ? '🏝️ 섬 완성!' : '하트를 다 썼어요', 0, -w * 0.035);
    ctx.font = `800 ${w * 0.038}px system-ui, sans-serif`;
    ctx.fillText(`아름다움 ${s.beauty} · ★${s.stars} · 도감 ${s.book.size}/${COMBOS.length}`, 0, w * 0.045);
    ctx.restore();
  } else if (s.pause > 0 && s.outcome) {
    const age = PAUSE - s.pause, sc = Math.min(1, age / 12) * (1 + 0.08 * Math.max(0, 1 - age / 20)), clear = s.outcome === 'clear';
    const st = clear ? s.starLog[s.starLog.length - 1] : 0, gain = s.beauty - s.base;
    ctx.save();
    ctx.translate(w / 2, top + areaH * 0.2);
    ctx.scale(sc, sc);
    ctx.fillStyle = clear ? 'rgba(255,244,200,.95)' : 'rgba(255,225,225,.95)';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(-w * 0.36, -w * 0.09, w * 0.72, w * 0.18, w * 0.04);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = clear ? '#7a4b00' : '#a61e4d';
    ctx.font = `900 ${w * 0.06}px system-ui, sans-serif`;
    ctx.fillText(clear ? `${SEASON_NAME[sea]} 완성!` : '조금 모자라요…', 0, -w * 0.035);
    ctx.font = `900 ${w * 0.05}px system-ui, sans-serif`;
    if (clear) {
      for (let i = 0; i < 3; i++) {
        const pop = Math.min(1, Math.max(0, (age - 14 - i * 9) / 8));
        ctx.fillStyle = i < st && pop > 0 ? '#f59f00' : 'rgba(122,75,0,.25)';
        ctx.fillText('★', (i - 1) * w * 0.07, w * 0.045 - (i < st ? Math.sin(pop * Math.PI) * 6 : 0));
      }
    } else {
      ctx.font = `800 ${w * 0.036}px system-ui, sans-serif`;
      ctx.fillText(`아름다움 ${gain}/${s.goal} · 하트 −1${s.hearts > 0 ? ' · 다시 꾸며요' : ''}`, 0, w * 0.045);
    }
    ctx.restore();
  }
  // 첫 안내
  if (s.season === 0 && s.placed < 3 && !s.pause) {
    const msg = s.placed === 0 ? '👆 빛나는 칸이 섬을 돌아요 — 원하는 칸에서 탭!' : '아래 다음 타일을 보고 자리를 골라요';
    ctx.font = `800 ${w * 0.038}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw2 = ctx.measureText(msg).width + 20, yy = bot - w * 0.06;
    ctx.fillStyle = `rgba(8,30,50,${0.6 + 0.1 * Math.sin(t / 10)})`;
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, yy - w * 0.035, tw2, w * 0.07, w * 0.035);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(msg, w / 2, yy);
  }
  ctx.restore();
  drawHud(ctx, s, w, h, HUD, PANEL, th);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight = 800) {
  let sz = size;
  do ctx.font = `${weight} ${sz}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxW && (sz -= 0.5) > 8);
  ctx.fillText(text, x, y);
}

function tip(s: IsleState, k: number): string {
  const n = s.season;
  if (k === FOR) return '집 옆에 두면 연기 오두막' + (n >= 1 ? ' · 물 옆이면 폭포' : '') + ' · 숲 셋이면 사슴';
  if (k === HOU) return '숲 옆 +2 · 집 셋을 이으면 광장 +2씩' + (n >= 2 ? ' · 눈산 옆 산장 +3' : '');
  if (k === FLD) return n >= 1 ? '물 옆이면 물댄 논 +3' + (n >= 4 ? ' · 사막 옆은 말라요 −2' : '') : '혼자선 +1 — 좋은 자리는 집에게 양보';
  if (k === WAT) return '숲 옆 폭포 +3 · 밭 옆 논 · 셋 이으면 호수' + (n >= 4 ? ' · 사막 옆 오아시스' : '');
  if (k === FLW) return '서로 다른 이웃 종류마다 +2';
  if (k === LHT) return '바다에 닿은 면마다 +2 — 튀어나온 끝에!';
  return '';
}

function drawHud(ctx: CanvasRenderingContext2D, s: IsleState, w: number, h: number, HUD: number, PANEL: number, th: Theme) {
  const sea = shown(s), gain = s.beauty - s.base, goal = s.goal || 1;
  // 위 띠: 계절 · 별 · 하트 · 아름다움 막대
  ctx.fillStyle = 'rgba(6,28,46,.78)';
  ctx.fillRect(0, 0, w, HUD);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${w * 0.042}px system-ui, sans-serif`;
  ctx.fillText(`${Math.floor(s.season / 4) + 1}년 ${SEASON_NAME[sea]}`, w * 0.03, HUD * 0.3);
  ctx.font = `700 ${w * 0.032}px system-ui, sans-serif`;
  ctx.fillStyle = th.muted;
  ctx.fillText(`계절 ${s.season + 1}/${SEASONS.length} · 도감 ${s.book.size}/${COMBOS.length}`, w * 0.25, HUD * 0.3);
  ctx.textAlign = 'right';
  ctx.font = `900 ${w * 0.04}px system-ui, sans-serif`;
  ctx.fillStyle = th.accent;
  ctx.fillText(`★${s.stars}`, w * 0.8, HUD * 0.3);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w * 0.97, HUD * 0.3);
  const bx = w * 0.03, bw = w * 0.94, by = HUD * 0.55, bh = HUD * 0.33, full = goal * 1.9;
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, bh / 2);
  ctx.fill();
  const fr = Math.max(0, Math.min(1, gain / full));
  const gg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  gg.addColorStop(0, '#69db7c');
  gg.addColorStop(1, '#ffd43b');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.roundRect(bx, by, Math.max(bh, bw * fr), bh, bh / 2);
  ctx.fill();
  ctx.font = `900 ${bh * 0.62}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  [1, 1.35, 1.8].forEach((mul, i) => {
    const x = bx + bw * ((goal * mul) / full);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x - 1, by, 2, bh);
    ctx.fillStyle = gain >= goal * mul ? '#fff3bf' : 'rgba(255,255,255,.55)';
    ctx.fillText('★'.repeat(i + 1), x, by - bh * 0.05 + bh * 0.5);
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0b2a40';
  ctx.font = `900 ${bh * 0.68}px system-ui, sans-serif`;
  ctx.fillText(`아름다움 ${gain >= 0 ? '+' : ''}${gain} / ${goal}`, bx + bh * 0.5, by + bh * 0.52);
  // 아래 판: 지금 타일 + 다음 3개 + 도움말
  const py = h - PANEL;
  ctx.fillStyle = 'rgba(6,28,46,.82)';
  ctx.fillRect(0, py, w, PANEL);
  ctx.textAlign = 'center';
  ctx.fillStyle = th.muted;
  ctx.font = `800 ${w * 0.03}px system-ui, sans-serif`;
  const look = { t: s.t, sea, form: 0, formT: s.t, seed: 2, dusk: 0, lights: null, ...CALM };
  if (s.deck.length) {
    ctx.fillText('지금', w * 0.13, py + PANEL * 0.12);
    ctx.fillStyle = 'rgba(255,224,102,.16)';
    ctx.beginPath();
    ctx.roundRect(w * 0.03, py + PANEL * 0.2, w * 0.2, PANEL * 0.52, 10);
    ctx.fill();
    drawTile(ctx, s.deck[0], w * 0.13, py + PANEL * 0.5, w * 0.12, look);
    for (let i = 1; i < 4; i++) {
      const x = w * (0.2 + 0.13 * i);
      if (i === 1) (ctx.fillStyle = th.muted), ctx.fillText('다음 →', x + w * 0.06, py + PANEL * 0.12);
      if (!s.deck[i]) continue;
      ctx.globalAlpha = 1 - (i - 1) * 0.18;
      drawTile(ctx, s.deck[i], x, py + PANEL * 0.52, w * 0.085, look);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${w * 0.05}px system-ui, sans-serif`;
    ctx.fillText(`${s.deck.length}`, w * 0.9, py + PANEL * 0.42);
    ctx.font = `700 ${w * 0.028}px system-ui, sans-serif`;
    ctx.fillStyle = th.muted;
    ctx.fillText('남은 타일', w * 0.9, py + PANEL * 0.6);
    ctx.fillStyle = '#ffffff';
    const k = s.deck[0];
    fitText(ctx, `${KIND[k].e} ${KIND[k].name} — ${tip(s, k)}`, w / 2, py + PANEL * 0.86, w * 0.94, w * 0.036);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${w * 0.045}px system-ui, sans-serif`;
    const st = s.outcome === 'clear' ? s.starLog[s.starLog.length - 1] : 0;
    ctx.fillText(s.done || s.dead ? `점수 ${s.beauty + s.stars * 5}` : s.outcome === 'clear' ? `${'★'.repeat(st)}${'☆'.repeat(3 - st)} 다음 계절로…` : s.outcome === 'fail' ? '이 계절을 다시 꾸며요' : '…', w / 2, py + PANEL * 0.45);
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
/** 봇: 아무 때나 탭 (어디에 떨어질지 모름) */
export const isleRandom: Bot<IsleState> = { name: '아무 때나', act: (_s, rng) => ({ tap: rng() < 0.04, dir: 0 }) };

const plans = new WeakMap<IsleState, { key: string; c: number }>();
/** 지금 타일을 놓을 칸마다 아름다움을 재고, 다음 타일의 가장 좋은 자리까지 한 수 더 내다본다 */
function plan(s: IsleState): number {
  const g = s.g.slice(), base = s.beauty, cur = s.deck[0], nxt = s.deck[1], n = s.front.length, f2: number[] = [];
  let best = -1e9, bc = s.front[s.cur];
  for (let i = 0; i < n; i++) {
    const c = s.front[i];
    g[c] = cur;
    const e0 = beauty(g, null);
    let v1 = 0;
    if (nxt) {
      let b1 = -1e9;
      for (const c2 of frontier(g, f2)) {
        g[c2] = nxt;
        b1 = Math.max(b1, beauty(g, null) - e0);
        g[c2] = 0;
      }
      v1 = b1 > -1e9 ? b1 : 0;
    }
    g[c] = 0;
    const val = e0 - base + 0.8 * v1 - 0.02 * ((i - s.cur + n) % n);
    if (val > best) (best = val), (bc = c);
  }
  return bc;
}
export const isleSmart: Bot<IsleState> = {
  name: '섬 건축가',
  act(s) {
    if (s.pause || s.falling || !s.deck.length || !s.front.length) return { tap: false, dir: 0 };
    const key = `${s.season}:${s.hearts}:${s.placed}:${s.deck.length}`;
    let p = plans.get(s);
    if (!p || p.key !== key) plans.set(s, (p = { key, c: plan(s) }));
    return { tap: s.front[s.cur] === p.c, dir: 0 };
  },
};
