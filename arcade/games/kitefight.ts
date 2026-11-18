/**
 * 연싸움 하늘 (31라운드: 실시간 액션 — 첫인상·손맛·그림) — 연싸움 × 가리키기(누르는 동안 따라가기) × 콤보.
 * 조작(손가락 하나, 하는 일 하나): 누르고 있는 동안 연이 손가락 쪽으로 바람을 타고 날아간다(관성·처짐). 떼면 마지막 자리에 머문다
 *   (그래서 톡 = '저기로 휙', 꾹 끌기 = '따라 휘두르기'). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 연줄은 아이 손에서 연까지 휘어진 여러 마디 줄이다. 두 줄이 엇갈린 자리에서 그 자리가 더 빨리 움직이는 줄이
 *   상대 줄을 벤다(내 줄은 연 가까이일수록 빠르다). 상대 줄이 더 빠르면(달려드는 연) 내 줄이 닳는다. 다 닳으면 하트 -1, 그 판 다시.
 * 와우: 첫 손짓에 연이 솟구치며 X자로 엇갈린 두 줄을 '팅! 팅!' — 두 연이 빙글빙글 떨어지고 화면이 잠깐 느려진다.
 * 판 7개(목표 = 연 N개 끊기 · ★ 끊기 · ★ 내 줄 반 넘게 남기기 · ★ 판마다 다른 한 줄):
 *   1 떠도는 연(휘둘러 베기) → 2 사나운 연(빨간 화살표로 달려듦 — 비키거나 먼저 베기) → 3 바람(방향이 바뀌고 연들이 한쪽에 몰림 —
 *   바람 따라 휘두르면 더 빠름, 한 번에 여럿) → 4 유리 가루 줄(닿기만 해도 내 줄이 닳음 — 한 번에 확) → 5 두 줄 연(V자 두 줄을
 *   한 번에) → 6 새 떼(부딪히면 연이 빙글 — 길 고르기) → 7 용 연 대장(세 번 베어야 함, 화나면 달려듦).
 * 웃음: 줄이 끊긴 상대 아이는 엉덩방아 + 어질어질 별, 떨어지는 연은 X 눈으로 빙글빙글, 내 줄이 끊기면 곰돌이가 뒤로 벌러덩.
 *   언덕의 구경꾼(오리·고슴도치)이 팅! 할 때마다 폴짝, 내 줄이 위험하면 두 손으로 얼굴을 가린다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.55;
/** 내 손(곰돌이가 쥔 얼레) */
const HX = 0.5, HY = 1.205;
/** 연이 날 수 있는 하늘 */
const SX0 = 0.05, SX1 = 0.95, SY0 = 0.15, SY1 = 1.0;
/** 줄 마디 수 (내 줄 · 상대 줄) */
const KN = 10, EN = 8;
/** 내 연: 최고 속도 · 손가락 쪽으로 끄는 힘 · 공기 저항 */
const VMAX = 0.021, K_ACC = 0.0095, DAMP = 0.12;
/** 벰: 엇갈린 자리가 V0보다 빠르면 (속도-V0)×CUTK만큼 상대 줄이 닳는다(1이면 끊김). 닳는 건 엇갈림이 풀리면 서서히 돌아온다 */
const V0 = 0.009, CUTK = 95, SAW_DECAY = 0.03;
/** 내 줄이 닳는 정도: 상대가 더 빠를 때 · 유리 가루 줄에 닿아 있는 틱마다 · 유리 줄은 GLASS_HP배 질기다 */
const WEARK = 2.4, WEAR_CAP = 0.013, V0E = 0.004, GLASS_WEAR = 0.013, GLASS_HP = 1.3;
/** 유리 가루는 줄 아래쪽(손에서 GLASS_TOP까지)에만 발려 있어 거기선 안 끊긴다 — 연 가까이 맨 끝을 베야 한다 */
const GLASS_TOP = 0.62;
/** 당기기 중인 상대 줄은 엇갈린 자리가 어디든 줄 전체가 이 속도로 미끄러진다 (당겨 끊기) */
const PULL_V = 0.026;
/** ★ '두 개 한 번에'를 몇 번 */
const DOUBLES = 3;
const CHAIN_T = 32, RISE_T = 60, WARN_T = 50, DART_T = 34, TIRED_T = 80, TWIN_T = 14;
/** 팽팽한 줄: 사나운 연·두 줄 연·용 연은 줄을 팽팽히 당겼다(빨강) 늦췄다 한다. 팽팽한 줄은 PULL_V로 당겨져 닿으면 내가 베인다.
 *  늘어진 줄이 YANK_AT틱 넘게 엇갈려 있으면 '홱!' 바로 팽팽해진다 */
const YANK_AT = 40, TENSE_ON = 120, TENSE_OFF = 110;
const RESULT_OK = 190, RESULT_FAIL = 165, CARD_T = 150, SPOT_T = 180;
/** 별 하나 = STAR_PTS × 판 번호 (뒤 판일수록 크다) */
const STAR_PTS = 50, CUT_PTS = 10, WIN_PTS = 300, HEART_PTS = 150;
const BIRD_V = 0.0065, BIRD_R = 0.052, BIRD_WARN = 75;
/** 상대 아이들의 손 자리 (0~3 언덕 위 · 4 용 연 대장) */
const KIDS = [
  { x: 0.075, y: 1.13 },
  { x: 0.245, y: 1.09 },
  { x: 0.755, y: 1.09 },
  { x: 0.925, y: 1.13 },
  { x: 0.86, y: 1.0 },
];

type Kind = 'drift' | 'dart' | 'glass' | 'twin' | 'dragon';
type Star3 = 'double' | 'nohurt' | 'doubles' | 'noglass' | 'twinonce' | 'nobird' | 'nodragon';
type KSt = 'rise' | 'fly' | 'warn' | 'dart' | 'tired' | 'fall' | 'gone';

interface Line {
  ax: number; ay: number; x: number[]; y: number[]; px: number[]; py: number[];
  /** 닳은 정도(1이면 끊김) */
  saw: number; cut: boolean; cutT: number; cx: number; cy: number; cj: number;
  /** 지금 엇갈려 있나 · 누가 이기나(1 내가 벤다, -1 내가 닳는다, 0 그냥 엇갈림) */
  touch: number; adv: number; mx: number; my: number;
  /** 용 연: 한 번 벤 뒤 엇갈림이 풀릴 때까지 잠금 */
  lock: boolean; side: number;
}
interface Kite {
  id: number; kind: Kind; kid: number; kid2: number; pal: number;
  x: number; y: number; vx: number; vy: number; hx: number; hy: number; ph: number; amp: number;
  st: KSt; stT: number; dartIn: number; d0x: number; d0y: number; d1x: number; d1y: number;
  hp: number; lines: Line[]; rot: number; spin: number; tumble: number; swing: boolean; firstCutT: number; trail: number[]; fallT: number; tense: boolean; tenseT: number;
  /** 용 연: 베인 뒤 번쩍이는 동안은 안 베인다 */
  guard: number;
}
interface Flock { id: number; x: number; y: number; dir: number; warn: number; hit: boolean }
interface Ev { t: number; kind: string; x: number; y: number; n: number; text?: string; col?: string }
interface StageDef {
  key: string; name: string; news: string; goal: number; max: number; queue: Kind[];
  star3: Star3; s3: string; wind: 0 | 1 | 2; birds: boolean; boss?: boolean; hint: string;
}

export const STAGES: StageDef[] = [
  {
    key: 'drift', name: '첫 연싸움', news: '', goal: 5, max: 3, queue: ['drift', 'drift', 'drift', 'drift', 'drift', 'drift', 'drift', 'drift'],
    star3: 'double', s3: '한 번에 두 개 끊기', wind: 1, birds: false, hint: '엇갈린 줄 위로 휙 — 빨리 스칠수록 잘 끊겨요',
  },
  {
    key: 'dart', name: '사나운 연', news: '빨간 눈 연이 화살표 길로 달려들어요!', goal: 6, max: 3, queue: ['dart', 'drift', 'drift', 'dart', 'drift', 'drift', 'dart', 'drift', 'dart'],
    star3: 'nohurt', s3: '한 번도 안 긁히기', wind: 1, birds: false, hint: '빨간 화살표 길에서 내 줄을 비키거나, 먼저 베요',
  },
  {
    key: 'wind', name: '바람이 바뀌어요', news: '바람 따라 휘두르면 더 빨라요 — 연들이 한쪽에 몰려요', goal: 8, max: 4, queue: ['drift', 'drift', 'dart', 'drift', 'drift', 'dart', 'drift', 'drift', 'dart', 'drift', 'drift'],
    star3: 'doubles', s3: '두 개 한 번에 끊기를 세 번', wind: 2, birds: false, hint: '바람에 연들이 몰릴 때 두 줄을 한 번에 — 바람 쪽으로 휙!',
  },
  {
    key: 'glass', name: '유리 가루 줄', news: '반짝이 줄은 닿기만 해도 내 줄이 닳아요 — 한 번에 확!', goal: 7, max: 4, queue: ['glass', 'dart', 'dart', 'glass', 'drift', 'dart', 'glass', 'dart', 'dart', 'drift'],
    star3: 'noglass', s3: '반짝이 가루에 한 번도 안 닿기', wind: 1, birds: false, hint: '반짝이 줄은 연 가까이에서 빠르게 한 번에',
  },
  {
    key: 'twin', name: '두 줄 연', news: '줄이 둘인 연 — 둘 다 끊어야 떨어져요', goal: 6, max: 3, queue: ['twin', 'dart', 'dart', 'twin', 'glass', 'dart', 'twin', 'dart', 'drift'],
    star3: 'twinonce', s3: '두 줄을 한 번에 끊기', wind: 1, birds: false, hint: 'V자 두 줄 아래를 가로로 쭉 — 두 줄이 한 번에!',
  },
  {
    key: 'birds', name: '새 떼', news: '새 떼에 부딪히면 연이 빙글 — 피해 가요', goal: 7, max: 4, queue: ['dart', 'dart', 'glass', 'dart', 'drift', 'dart', 'glass', 'dart', 'dart'],
    star3: 'nobird', s3: '새에 한 번도 안 부딪히기', wind: 1, birds: true, hint: '느낌표 쪽에서 새 떼가 와요 — 그 높이를 비워요',
  },
  {
    key: 'dragon', name: '용 연 대장', news: '용 연은 세 번 베어야 떨어져요 — 화나면 달려들어요', goal: 1, max: 3, boss: true, queue: ['dragon', 'dart', 'drift', 'glass', 'dart', 'drift', 'dart'],
    star3: 'nodragon', s3: '용 연에게 한 번도 안 긁히기', wind: 2, birds: false, hint: '용이 쉴 때(헥헥) 세 번 베어요',
  },
];
export const STAGE_COUNT = STAGES.length;

export interface KiteState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  kx: number; ky: number; kvx: number; kvy: number; tx: number; ty: number; down: boolean; tumble: number; spin: number; rot: number;
  my: Line; hp: number; kites: Kite[]; queue: Kind[]; nextId: number; spawnIn: number;
  wind: number; windTo: number; windNext: number; flocks: Flock[]; flockIn: number;
  cuts: number; chain: number; chainT: number; bestChain: number; doubles: number; hurtDart: number; hurtDragon: number; hurt: number; birdHits: number;
  glassCut: number; glassTouch: number; twinOnce: boolean; dragonDown: boolean; lastCutT: number; hurtT: number; snapT: number; snapX: number; snapY: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; again: boolean; won: boolean; dead: boolean;
  freeze: number; slow: number; seen: Set<string>; events: Ev[]; firstPress: number; presses: number;
  kidT: number[]; spot: { id: number; t: number; text: string } | null; spotDone: Set<string>;
}

const ev = (s: KiteState, kind: string, x: number, y: number, n = 0, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, n, text, col });
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const live = (e: Kite) => e.st !== 'fall' && e.st !== 'gone';
/** 엇갈린 채 머뭇거리면 당겨서 써는 연 (떠돌이·유리 줄은 안 당긴다) */
const canYank = (e: Kite) => e.kind === 'dart' || e.kind === 'twin' || e.kind === 'dragon';

function mkLine(ax: number, ay: number, kx: number, ky: number, n: number, side = 0): Line {
  const x: number[] = [], y: number[] = [];
  for (let i = 0; i <= n; i++) x.push(ax + (kx - ax) * (i / n)), y.push(ay + (ky - ay) * (i / n));
  return { ax, ay, x, y, px: x.slice(), py: y.slice(), saw: 0, cut: false, cutT: -1, cx: 0, cy: 0, cj: 0, touch: 0, adv: 0, mx: 0, my: 0, lock: false, side };
}

/** 줄 마디를 연 쪽으로 끌어 당긴다: 곧은 줄 + 아래로 처짐 + 바람 쪽 휨, 마디마다 조금 늦게 따라온다(휘어진 채찍 모양) */
function lineUpdate(L: Line, kx: number, ky: number, sag: number, wind: number, follow: number) {
  const n = L.x.length - 1;
  for (let i = 0; i <= n; i++) (L.px[i] = L.x[i]), (L.py[i] = L.y[i]);
  L.x[0] = L.ax;
  L.y[0] = L.ay;
  L.x[n] = kx;
  L.y[n] = ky;
  const len = Math.hypot(kx - L.ax, ky - L.ay);
  for (let i = 1; i < n; i++) {
    const f = i / n, bow = 4 * f * (1 - f);
    const tx = L.ax + (kx - L.ax) * f + wind * 0.05 * bow * len, ty = L.ay + (ky - L.ay) * f + sag * len * bow;
    const fo = follow * (0.55 + 0.45 * (1 - f));
    L.x[i] += (tx - L.x[i]) * fo;
    L.y[i] += (ty - L.y[i]) * fo;
  }
}

let X_A = 0, X_B = 0;
/** 두 선분이 만나면 true, 매개변수는 X_A(첫 선분)·X_B(둘째) */
function segX(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy, den = rx * sy - ry * sx;
  if (den > -1e-12 && den < 1e-12) return false;
  const qx = cx - ax, qy = cy - ay, a = (qx * sy - qy * sx) / den, b = (qx * ry - qy * rx) / den;
  if (a < 0 || a > 1 || b < 0 || b > 1) return false;
  X_A = a;
  X_B = b;
  return true;
}

/** 내 줄과 상대 줄이 엇갈린 자리 (여럿이면 내 연에 가장 가까운 것) */
function crossing(M: Line, L: Line): { i: number; a: number; j: number; b: number } | null {
  let best: { i: number; a: number; j: number; b: number } | null = null, bv = -1;
  let lx0 = 9, lx1 = -9, ly0 = 9, ly1 = -9;
  for (let j = 0; j < L.x.length; j++) (lx0 = Math.min(lx0, L.x[j])), (lx1 = Math.max(lx1, L.x[j])), (ly0 = Math.min(ly0, L.y[j])), (ly1 = Math.max(ly1, L.y[j]));
  for (let i = KN - 1; i >= 0; i--) {
    const x0 = M.x[i], y0 = M.y[i], x1 = M.x[i + 1], y1 = M.y[i + 1];
    if (Math.max(x0, x1) < lx0 || Math.min(x0, x1) > lx1 || Math.max(y0, y1) < ly0 || Math.min(y0, y1) > ly1) continue;
    for (let j = 0; j < L.x.length - 1; j++) {
      if (segX(x0, y0, x1, y1, L.x[j], L.y[j], L.x[j + 1], L.y[j + 1]) && i + X_A > bv) (bv = i + X_A), (best = { i, a: X_A, j, b: X_B });
    }
    if (best) return best;
  }
  return best;
}

function pickHome(s: KiteState, kind: Kind, kid: number): [number, number] {
  let best: [number, number] = [0.5, 0.4], bd = -1;
  for (let k = 0; k < 14; k++) {
    let hx: number, hy: number;
    if (kind === 'twin') (hx = 0.36 + s.rng() * 0.28), (hy = 0.2 + s.rng() * 0.14);
    else if (kind === 'dragon') (hx = 0.3 + s.rng() * 0.4), (hy = 0.28 + s.rng() * 0.12);
    else {
      const ax = KIDS[kid].x, cross = s.rng() < 0.6;
      hx = cross ? (ax < 0.5 ? 0.45 + s.rng() * 0.4 : 0.15 + s.rng() * 0.4) : ax < 0.5 ? 0.12 + s.rng() * 0.35 : 0.53 + s.rng() * 0.35;
      hy = 0.22 + s.rng() * 0.48;
    }
    let dmin = Math.hypot(hx - s.kx, hy - s.ky) * 0.7;
    for (const e of s.kites) if (live(e)) dmin = Math.min(dmin, Math.hypot(hx - e.hx, hy - e.hy));
    if (dmin > bd) (bd = dmin), (best = [hx, hy]);
    if (dmin > 0.22) break;
  }
  return best;
}

function spawn(s: KiteState, kind: Kind, at?: [number, number], flying = false): boolean {
  const used = new Set<number>();
  for (const e of s.kites) if (live(e)) used.add(e.kid), used.add(e.kid2);
  let kid: number, kid2 = -1;
  if (kind === 'dragon') kid = 4;
  else if (kind === 'twin') {
    if (used.has(0) || used.has(3)) return false;
    (kid = 0), (kid2 = 3);
  } else {
    const free = [0, 1, 2, 3].filter((k) => !used.has(k));
    if (!free.length) return false;
    kid = free[Math.floor(s.rng() * free.length)];
  }
  const [hx, hy] = at ?? pickHome(s, kind, kid);
  const sx = flying ? hx : kind === 'twin' ? 0.5 : KIDS[kid].x, sy = flying ? hy : KIDS[kid].y - 0.04;
  const e: Kite = {
    id: s.nextId++, kind, kid, kid2, pal: kind === 'dragon' ? 4 : kid, x: sx, y: sy, vx: 0, vy: 0, hx, hy, ph: s.rng() * 6.28, amp: kind === 'dragon' ? 0.12 : kind === 'twin' ? 0.05 : 0.06 + s.rng() * 0.04,
    st: flying ? 'fly' : 'rise', stT: 0, dartIn: kind === 'dragon' ? 150 : 110 + Math.floor(s.rng() * 90), d0x: 0, d0y: 0, d1x: 0, d1y: 0,
    hp: kind === 'dragon' ? 3 : 1, lines: [], rot: 0, spin: 0, tumble: 0, swing: false, firstCutT: -1, trail: [], fallT: 0, tense: false, tenseT: 50 + Math.floor(s.rng() * 70), guard: 0,
  };
  if (kind === 'twin') e.lines.push(mkLine(KIDS[0].x, KIDS[0].y, sx - 0.035, sy, EN, -1), mkLine(KIDS[3].x, KIDS[3].y, sx + 0.035, sy, EN, 1));
  else e.lines.push(mkLine(KIDS[kid].x, KIDS[kid].y, sx, sy, EN));
  s.kites.push(e);
  const d = STAGES[s.stage];
  if (kind === d.key || (kind === 'dart' && d.key === 'dart') || (kind === 'dragon' && d.boss)) {
    if (!s.spotDone.has(kind)) {
      s.spotDone.add(kind);
      s.spot = { id: e.id, t: s.t, text: kind === 'dart' ? '사나운 연' : kind === 'glass' ? '반짝이 줄' : kind === 'twin' ? '두 줄 연' : kind === 'dragon' ? '용 연 대장' : '' };
    }
  }
  return true;
}

function newStage(s: KiteState) {
  const d = STAGES[s.stage];
  s.kites = [];
  s.flocks = [];
  s.queue = [...d.queue];
  (s.kx = HX), (s.ky = 0.97), (s.kvx = 0), (s.kvy = 0), (s.tx = HX), (s.ty = 0.97), (s.tumble = 0), (s.spin = 0), (s.rot = 0);
  s.my = mkLine(HX, HY, s.kx, s.ky, KN);
  s.hp = 1;
  s.cuts = s.chain = s.bestChain = s.doubles = s.hurtDart = s.hurtDragon = s.hurt = s.birdHits = s.glassCut = s.glassTouch = 0;
  (s.chainT = -99), (s.twinOnce = false), (s.dragonDown = false), (s.lastCutT = -999), (s.hurtT = -999), (s.snapT = -1);
  s.phase = 'play';
  s.pt = 0;
  s.wind = d.wind === 2 ? 0.7 : d.wind === 1 ? 0.25 : 0;
  s.windTo = s.wind;
  s.windNext = 260 + Math.floor(s.rng() * 60);
  s.flockIn = 150;
  s.spawnIn = 40;
  s.spot = null;
  s.spotDone = new Set();
  s.kidT = [-999, -999, -999, -999, -999];
  if (s.stage === 0) {
    // 첫인상: X자로 엇갈린 두 줄이 하늘 한가운데를 가로지른다 — 어느 쪽이든 위로 휙 하면 팅
    spawn(s, 'drift', [0.29, 0.43], true);
    spawn(s, 'drift', [0.71, 0.36], true);
    s.kites[0].kid = 3;
    s.kites[0].pal = 3;
    s.kites[0].lines = [mkLine(KIDS[3].x, KIDS[3].y, 0.29, 0.43, EN)];
    s.kites[1].kid = 0;
    s.kites[1].pal = 0;
    s.kites[1].lines = [mkLine(KIDS[0].x, KIDS[0].y, 0.71, 0.36, EN)];
    s.queue.splice(0, 2);
    s.spawnIn = 90;
  } else {
    for (let k = 0; k < 2 && s.queue.length; k++) if (spawn(s, s.queue[0])) s.queue.shift();
  }
  if (!s.seen.has(d.key)) s.seen.add(d.key);
}

/** 스크린샷·점검용: k번째 판(0부터)으로 바로 간다 */
export function __jump(s: KiteState, k: number) {
  s.stage = k;
  newStage(s);
}

function star3(s: KiteState): boolean {
  switch (STAGES[s.stage].star3) {
    case 'double': return s.bestChain >= 2;
    case 'doubles': return s.doubles >= DOUBLES;
    case 'nohurt': return s.hurtDart <= 0.001;
    case 'noglass': return s.glassTouch === 0;
    case 'twinonce': return s.twinOnce;
    case 'nobird': return s.birdHits === 0;
    case 'nodragon': return s.hurtDragon <= 0.001;
  }
}
/** 지금 ★3 상태: 1 받음 · 0 아직 · -1 놓침 */
export function star3Now(s: KiteState): number {
  const k = STAGES[s.stage].star3;
  if (k === 'nohurt') return s.hurtDart > 0.001 ? -1 : 1;
  if (k === 'nodragon') return s.hurtDragon > 0.001 ? -1 : 1;
  if (k === 'nobird') return s.birdHits ? -1 : 1;
  if (k === 'noglass') return s.glassTouch ? -1 : 1;
  return star3(s) ? 1 : 0;
}

function endStage(s: KiteState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    s.starOk = [true, s.hp > 0.5, star3(s)];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS * (s.stage + 1);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    ev(s, 'clear', 0.5, 0.5, s.got);
  } else {
    s.hearts--;
    ev(s, 'fail', 0.5, 0.5);
  }
}

function cutLine(s: KiteState, e: Kite, L: Line, px: number, py: number, cj: number) {
  L.cut = true;
  L.cutT = s.t;
  L.cx = px;
  L.cy = py;
  L.cj = cj;
  L.touch = 0;
  if (e.kind === 'twin') {
    // 시간은 물리 틱(s.pt)으로 잰다 — 멈칫·느려짐 동안은 세지 않는다
    if (e.firstCutT < 0) (e.firstCutT = s.pt), (e.swing = true), (e.amp = 0.1);
    else if (s.pt - e.firstCutT <= TWIN_T) s.twinOnce = true;
  }
  if (e.lines.some((l) => !l.cut)) {
    ev(s, 'snip', px, py, 1, '툭!', '#ffffff');
    s.freeze = Math.max(s.freeze, 2);
    return;
  }
  e.st = 'fall';
  e.stT = 0;
  e.fallT = 0;
  e.spin = (e.vx >= 0 ? 1 : -1) * (0.18 + s.rng() * 0.08);
  e.vx = clamp(s.kvx * 0.5, -0.01, 0.01);
  e.vy = -0.004;
  s.kidT[e.kid] = s.t;
  if (e.kid2 >= 0) s.kidT[e.kid2] = s.t;
  s.cuts++;
  if (e.kind === 'glass') s.glassCut++;
  if (e.kind === 'dragon') s.dragonDown = true;
  s.chain = s.pt - s.chainT <= CHAIN_T ? s.chain + 1 : 1;
  s.chainT = s.pt;
  s.bestChain = Math.max(s.bestChain, s.chain);
  if (s.chain === 2) s.doubles++;
  s.lastCutT = s.t;
  s.pts += CUT_PTS * s.chain * (e.kind === 'dragon' ? 5 : 1);
  if (s.chain >= 2 && !s.seen.has('chain')) s.seen.add('chain');
  ev(s, 'cut', px, py, s.chain, e.kind === 'dragon' ? '용 연 격파!' : '팅!', e.kind);
  s.freeze = Math.max(s.freeze, s.chain >= 2 ? 4 : 3);
  if (s.chain >= 2 || e.kind === 'dragon') s.slow = Math.max(s.slow, 30 + 10 * Math.min(3, s.chain));
}

function startDart(s: KiteState, e: Kite) {
  const fr = 0.5;
  let qx = HX + (s.kx - HX) * fr, qy = HY + (s.ky - HY) * fr;
  let dx = qx - e.x, dy = qy - e.y, L = Math.hypot(dx, dy);
  if (L < 0.12) {
    qx = HX + (s.kx - HX) * 0.45;
    qy = HY + (s.ky - HY) * 0.45;
    (dx = qx - e.x), (dy = qy - e.y), (L = Math.hypot(dx, dy) || 1);
  }
  const len = Math.min(e.kind === 'dragon' ? 0.6 : 0.5, L + 0.2);
  e.st = 'warn';
  e.stT = 0;
  e.d0x = e.x;
  e.d0y = e.y;
  e.d1x = clamp(e.x + (dx / L) * len, SX0, SX1);
  e.d1y = clamp(e.y + (dy / L) * len, SY0, 0.95);
  ev(s, 'warn', e.x, e.y, 0, '!', '#ff5a4f');
}

function moveKite(s: KiteState, e: Kite) {
  e.stT++;
  if (e.guard > 0) e.guard--;
  const ox = e.x, oy = e.y;
  if (e.kind === 'dragon') {
    e.trail.push(e.x, e.y);
    if (e.trail.length > 64) e.trail.splice(0, 2);
  }
  if (e.st === 'fall') {
    e.fallT++;
    e.vx = e.vx * 0.97 + Math.sin(e.fallT * 0.09 + e.ph) * 0.0005;
    e.vy = Math.min(0.0042, e.vy + 0.00025);
    e.x += e.vx;
    e.y += e.vy;
    e.rot += e.spin;
    e.spin *= 0.985;
    if (e.y > 1.3) e.st = 'gone';
    return;
  }
  if (e.tumble > 0) {
    e.tumble--;
    e.rot += 0.25;
    e.vx *= 0.95;
    e.vy = e.vy * 0.95 + 0.0002;
  } else if (e.st === 'rise') {
    const p = Math.min(1, e.stT / RISE_T), q = 1 - (1 - p) ** 3;
    const sx = e.kind === 'twin' ? 0.5 : KIDS[e.kid].x, sy = (e.kind === 'twin' ? 1.05 : KIDS[e.kid].y) - 0.04;
    e.x = sx + (e.hx - sx) * q;
    e.y = sy + (e.hy - sy) * q;
    if (p >= 1) (e.st = 'fly'), (e.stT = 0), (e.tense = false), (e.tenseT = 50 + Math.floor(s.rng() * 70));
  } else if (e.st === 'warn') {
    // 뒤로 살짝 물러섰다가 (준비 동작)
    const bx = e.d0x - (e.d1x - e.d0x) * 0.06, by = e.d0y - (e.d1y - e.d0y) * 0.06;
    e.x += (bx - e.x) * 0.1;
    e.y += (by - e.y) * 0.1;
    if (e.stT >= (e.kind === 'dragon' && e.hp < 3 ? WARN_T - 14 : WARN_T)) (e.st = 'dart'), (e.stT = 0), (e.d0x = e.x), (e.d0y = e.y);
  } else if (e.st === 'dart') {
    const p = Math.min(1, e.stT / DART_T), q = p * p * (3 - 2 * p);
    e.x = e.d0x + (e.d1x - e.d0x) * q;
    e.y = e.d0y + (e.d1y - e.d0y) * q;
    if (p >= 1) (e.st = 'tired'), (e.stT = 0), (e.hx = clamp(e.d1x, 0.12, 0.88)), (e.hy = clamp(e.d1y, 0.22, 0.72));
  } else {
    const tired = e.st === 'tired';
    const w1 = (e.swing ? 0.03 : 0.011) + (e.id % 3) * 0.003, amp = tired ? e.amp * 0.3 : e.amp;
    const tx = e.hx + Math.sin(s.t * w1 + e.ph) * amp + s.wind * 0.17, ty = e.hy + Math.sin(s.t * w1 * 1.37 + e.ph * 2) * amp * 0.5 + (tired ? 0.05 : 0);
    e.vx += (tx - e.x) * 0.004 - e.vx * 0.08;
    e.vy += (ty - e.y) * 0.004 - e.vy * 0.08;
    const sp = Math.hypot(e.vx, e.vy), cap = e.swing ? 0.007 : e.kind === 'dragon' ? 0.008 : 0.0045;
    if (sp > cap) (e.vx *= cap / sp), (e.vy *= cap / sp);
    e.x += e.vx;
    e.y += e.vy;
    if (tired && e.stT >= TIRED_T) (e.st = 'fly'), (e.stT = 0), (e.dartIn = e.kind === 'dragon' ? 120 + Math.floor(s.rng() * 50) : 170 + Math.floor(s.rng() * 90));
    if (e.st === 'fly' && (e.kind === 'dart' || e.kind === 'dragon') && s.phase === 'play' && --e.dartIn <= 0) startDart(s, e);
  }
  if (e.tumble > 0) (e.x += e.vx), (e.y += e.vy);
  e.x = clamp(e.x, 0.03, 0.97);
  e.y = clamp(e.y, 0.12, 1.08);
  if (e.st !== 'warn' && e.tumble <= 0) e.rot += (clamp((e.x - ox) * 30, -0.5, 0.5) - e.rot) * 0.1;
  if (e.st === 'dart' || e.st === 'rise') (e.vx = e.x - ox), (e.vy = e.y - oy);
  // 줄 당기기: 팽팽 ↔ 늘어짐. 달려들 땐 늘 팽팽, 지치면 늘어짐
  if (canYank(e)) {
    const was = e.tense;
    if (e.st === 'warn' || e.st === 'dart') e.tense = true;
    else if (e.st === 'tired' || e.st === 'rise' || e.tumble > 0) (e.tense = false), (e.tenseT = Math.max(e.tenseT, 30));
    else if (!e.tense && s.phase === 'play' && e.lines.some((L) => !L.cut && L.touch >= YANK_AT)) (e.tense = true), (e.tenseT = TENSE_ON), ev(s, 'yank', e.x, e.y, 0, '홱!', '#ff7a5a');
    else if (--e.tenseT <= 0) (e.tense = !e.tense), (e.tenseT = (e.tense ? TENSE_ON : TENSE_OFF) + Math.floor(s.rng() * 50));
    if (e.tense && !was) ev(s, 'tense', e.x, e.y);
  }
  for (const L of e.lines) if (!L.cut) lineUpdate(L, e.x + L.side * 0.035, e.y + 0.012, e.tense ? 0.025 : e.st === 'tired' ? 0.16 : 0.11, s.wind, 0.32);
}

function physics(s: KiteState) {
  const d = STAGES[s.stage];
  // 바람
  if (d.wind === 2 && s.phase === 'play' && --s.windNext <= 0) {
    s.windTo = s.windTo > 0 ? -0.8 : 0.8;
    s.windNext = 300 + Math.floor(s.rng() * 120);
    ev(s, 'gust', s.windTo > 0 ? 0.1 : 0.9, 0.5, s.windTo > 0 ? 1 : -1, s.windTo > 0 ? '바람 → ' : ' ← 바람');
    if (!s.seen.has('gust')) s.seen.add('gust');
  }
  s.wind += clamp(s.windTo - s.wind, -0.01, 0.01);
  // 내 연
  const snapped = s.phase === 'result' && !s.ok;
  if (snapped) {
    s.kvx = s.kvx * 0.98 + s.wind * 0.0002;
    s.kvy = Math.min(0.004, s.kvy + 0.0002);
    s.rot += 0.2;
  } else if (s.tumble > 0) {
    s.tumble--;
    s.kvy += 0.0003;
    s.kvx *= 0.96;
    s.kvy *= 0.96;
    s.spin *= 0.95;
    s.rot += s.spin;
  } else {
    s.kvx += (s.tx - s.kx) * K_ACC - s.kvx * DAMP + s.wind * 0.00005;
    s.kvy += (s.ty - s.ky) * K_ACC - s.kvy * DAMP;
    const sp = Math.hypot(s.kvx, s.kvy), vm = VMAX * (1 + 0.32 * s.wind * (sp > 1e-6 ? s.kvx / sp : 0));
    if (sp > vm) (s.kvx *= vm / sp), (s.kvy *= vm / sp);
    if (!s.down) s.tx = clamp(s.tx + s.wind * 0.00025, SX0, SX1);
    s.rot += (clamp(s.kvx * 28, -0.55, 0.55) - s.rot) * 0.18;
  }
  s.kx += s.kvx;
  s.ky += s.kvy;
  if (!snapped) {
    if (s.kx < SX0 || s.kx > SX1) (s.kx = clamp(s.kx, SX0, SX1)), (s.kvx *= -0.3);
    if (s.ky < SY0 || s.ky > SY1) (s.ky = clamp(s.ky, SY0, SY1)), (s.kvy *= -0.3);
  }
  const msp = Math.hypot(s.kvx, s.kvy);
  if (!snapped) lineUpdate(s.my, s.kx, s.ky + 0.014, 0.1 * (1 - Math.min(1, msp / VMAX) * 0.75), s.wind, 0.34);
  // 상대 연
  for (const e of s.kites) moveKite(s, e);
  s.kites = s.kites.filter((e) => e.st !== 'gone');
  // 새 떼
  if (d.birds && s.phase === 'play' && --s.flockIn <= 0 && s.flocks.length < 1) {
    const dir = s.rng() < 0.5 ? 1 : -1;
    // 새 떼는 대개 내 연 높이로 온다 (느낌표를 보고 위아래로 비켜야 한다)
    let y = clamp(s.ky + (s.rng() - 0.5) * 0.16, 0.22, 0.9);
    if (s.rng() < 0.25) y = 0.25 + s.rng() * 0.6;
    s.flocks.push({ id: s.t, x: dir > 0 ? -0.12 : 1.12, y, dir, warn: BIRD_WARN, hit: false });
    s.flockIn = 170 + Math.floor(s.rng() * 90);
    ev(s, 'flock', dir > 0 ? 0.04 : 0.96, y, dir);
  }
  for (const f of s.flocks) {
    if (f.warn > 0) {
      f.warn--;
      continue;
    }
    f.x += f.dir * BIRD_V;
    f.y += Math.sin(s.t * 0.05 + f.id) * 0.0006;
    for (let b = 0; b < 5; b++) {
      const bx = birdX(f, b), by = birdY(f, b);
      if (!f.hit && s.tumble <= 0 && !snapped && Math.hypot(bx - s.kx, by - s.ky) < BIRD_R && s.phase === 'play') {
        f.hit = true;
        s.tumble = 55;
        s.spin = 0.35 * f.dir;
        s.kvx += f.dir * 0.012;
        s.kvy -= 0.005;
        s.hp -= 0.06;
        s.birdHits++;
        ev(s, 'bird', s.kx, s.ky, f.dir, '푸드득!');
      }
      for (const e of s.kites) if (live(e) && e.tumble <= 0 && e.st !== 'rise' && Math.hypot(bx - e.x, by - e.y) < BIRD_R) (e.tumble = 50), (e.vx += f.dir * 0.008), (e.st = e.st === 'warn' || e.st === 'dart' ? 'tired' : e.st), (e.stT = 0), ev(s, 'ebird', e.x, e.y, f.dir);
    }
  }
  s.flocks = s.flocks.filter((f) => f.x > -0.4 && f.x < 1.4);
}

export const birdX = (f: Flock, b: number) => f.x - f.dir * [0, 1, 1, 2, 2][b] * 0.045;
export const birdY = (f: Flock, b: number) => f.y + [0, -1, 1, -2, 2][b] * 0.03;

/** 엇갈린 줄마다: 더 빨리 움직이는 쪽이 벤다 */
function fight(s: KiteState) {
  const M = s.my;
  for (const e of s.kites) {
    if (!live(e)) continue;
    for (const L of e.lines) {
      if (L.cut) continue;
      // 막 띄우는 연(아래에서 솟는 중)은 아직 싸움에 끼지 않는다
      const c = e.st === 'rise' ? null : crossing(M, L);
      if (!c) {
        L.touch = 0;
        L.adv = 0;
        L.lock = false;
        L.saw = Math.max(0, L.saw - SAW_DECAY);
        continue;
      }
      L.touch++;
      const mvx = (M.x[c.i] - M.px[c.i]) * (1 - c.a) + (M.x[c.i + 1] - M.px[c.i + 1]) * c.a;
      const mvy = (M.y[c.i] - M.py[c.i]) * (1 - c.a) + (M.y[c.i + 1] - M.py[c.i + 1]) * c.a;
      const evx = (L.x[c.j] - L.px[c.j]) * (1 - c.b) + (L.x[c.j + 1] - L.px[c.j + 1]) * c.b;
      const evy = (L.y[c.j] - L.py[c.j]) * (1 - c.b) + (L.y[c.j + 1] - L.py[c.j + 1]) * c.b;
      const sm = Math.hypot(mvx, mvy), se = e.tense ? Math.max(Math.hypot(evx, evy), PULL_V) : Math.hypot(evx, evy);
      const px = M.x[c.i] + (M.x[c.i + 1] - M.x[c.i]) * c.a, py = M.y[c.i] + (M.y[c.i + 1] - M.y[c.i]) * c.a;
      L.mx = px;
      L.my = py;
      const glass = e.kind === 'glass';
      if (glass && c.j + c.b < EN * GLASS_TOP) {
        s.hp -= GLASS_WEAR;
        s.glassTouch++;
        if (L.touch % 4 === 1) ev(s, 'glass', px, py);
      }
      if (sm >= se) {
        const dm = glass && c.j + c.b < EN * GLASS_TOP ? 0 : (Math.max(0, sm - V0) * CUTK) / (glass ? GLASS_HP : 1);
        L.adv = dm > 0 ? 1 : 0;
        if (dm > 0 && !L.lock && e.guard <= 0) {
          L.saw += dm;
          if (L.touch % 2 === 1) ev(s, 'saw', px, py, Math.min(1, L.saw));
          if (L.saw >= 1) {
            if (e.kind === 'dragon' && e.hp > 1) {
              e.hp--;
              L.saw = 0;
              L.lock = true;
              L.touch = -50;
              s.lastCutT = s.t;
              s.pts += CUT_PTS * 3;
              ev(s, 'notch', px, py, 3 - e.hp, '크앙!', 'dragon');
              s.freeze = Math.max(s.freeze, 4);
              // 크앙! 반대편 하늘로 물러나며 잠깐 줄이 늘어진다(그 사이에 비켜야 한다) — 곧 팽팽히 당기고 달려든다
              (e.st = 'fly'), (e.stT = 0), (e.dartIn = 120), (e.tense = false), (e.tenseT = 45), (e.guard = 150);
              (e.hx = s.kx < 0.5 ? 0.62 + s.rng() * 0.2 : 0.18 + s.rng() * 0.2), (e.hy = 0.24 + s.rng() * 0.12);
            } else cutLine(s, e, L, px, py, c.j + c.b);
          }
        }
      } else {
        L.adv = -1;
        const wd = e.st === 'rise' || e.tumble > 0 ? 0 : Math.min(WEAR_CAP, Math.max(0, se - V0E) * WEARK);
        if (wd > 0) {
          s.hp -= wd;
          s.hurt += wd;
          s.hurtT = s.t;
          if (e.kind === 'dart') s.hurtDart += wd;
          if (e.kind === 'dragon') s.hurtDragon += wd;
          if (L.touch % 3 === 1) ev(s, 'hurt', px, py, wd);
        } else L.adv = 0;
      }
      if (s.hp <= 0) {
        s.hp = 0;
        s.snapT = s.t;
        s.snapX = px;
        s.snapY = py;
        s.kvx += (evx - mvx) * 0.6;
        ev(s, 'snap', px, py, 0, '툭…');
        s.freeze = 6;
        s.slow = 40;
        endStage(s, false, '내 줄이 끊겼어요');
        return;
      }
    }
  }
}

export const kitefight: GameDef<KiteState> = {
  id: 'kitefight',
  name: '연싸움 하늘',
  genes: ['kitecut', 'pointer', 'combo'],
  twist: '연줄 자체가 칼날 — 엇갈린 자리가 더 빨리 움직이는 줄이 이겨서, 상대 연이 쉴 때 휙 휘둘러 여러 줄을 한 번에 끊고, 달려드는 연 앞에서는 내 줄을 비켜야 한다',
  rules: [
    '누르고 있으면 내 연이 손가락 쪽으로 날아가요 (떼면 그 자리에 머물러요).',
    '줄이 엇갈린 자리에서 더 빨리 움직이는 줄이 이겨요 — 휙 스치면 상대 줄이 팅!',
    '달려드는 연에 내 줄이 닳아요. 다 닳으면 하트 -1.',
  ],
  controls: 'touch',
  hint: '누르는 동안 연이 손가락을 따라가요 — 휙 휘둘러 줄을 엇갈리게! / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '노을 언덕의 연싸움 — 동물 아이들의 하늘 놀이',
    mood: '해가 지는 언덕, 보랏빛에서 주황으로 번지는 하늘에 구름이 겹겹이 흐르고, 언덕마다 동물 아이들이 얼레를 쥐고 서 있다. 알록달록 얼굴 달린 연들이 리본 꼬리를 흔들고, 줄이 끊기면 실밥과 반짝이가 터지며 연이 빙글빙글 떨어진다.',
    palette: { bg: '#2a2156', ink: '#fff6e8', muted: '#c9a9d8', accent: '#ffd25e', hot: '#ff5a4f', soft: '#ffb98a' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      kx: HX, ky: 0.97, kvx: 0, kvy: 0, tx: HX, ty: 0.97, down: false, tumble: 0, spin: 0, rot: 0,
      my: mkLine(HX, HY, HX, 0.97, KN), hp: 1, kites: [], queue: [], nextId: 1, spawnIn: 0,
      wind: 0, windTo: 0, windNext: 0, flocks: [], flockIn: 0,
      cuts: 0, chain: 0, chainT: -99, bestChain: 0, doubles: 0, hurtDart: 0, hurtDragon: 0, hurt: 0, birdHits: 0, glassCut: 0, glassTouch: 0, twinOnce: false, dragonDown: false,
      lastCutT: -999, hurtT: -999, snapT: -1, snapX: 0, snapY: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', again: false, won: false, dead: false,
      freeze: 0, slow: 0, seen: new Set<string>(), events: [], firstPress: -1, presses: 0, kidT: [], spot: null, spotDone: new Set<string>(),
    } as KiteState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    if (s.dead) return;
    s.t++;
    const p = inp.pointer ?? null;
    if (p && s.phase === 'play') {
      if (!s.down) (s.presses++), s.firstPress < 0 && (s.firstPress = s.t);
      s.down = true;
      s.tx = clamp(p.x, SX0, SX1);
      s.ty = clamp(p.y * A, SY0, SY1);
    } else s.down = false;
    if (s.events.length > 40) s.events = s.events.filter((e) => s.t - e.t < 90);
    if (s.freeze > 0) return void s.freeze--;
    if (s.slow > 0 && --s.slow % 2 === 1) return;
    s.pt++;
    physics(s);
    if (s.phase === 'play') {
      fight(s);
      if (s.phase === 'play') {
        const d = STAGES[s.stage];
        const alive = s.kites.filter(live).length;
        if (--s.spawnIn <= 0 && alive < d.max) {
          if (!s.queue.length) s.queue.push(...((s.stage ? ['dart', 'dart', 'drift'] : ['drift']) as Kind[]));
          if (spawn(s, s.queue[0])) s.queue.shift(), (s.spawnIn = 55);
          else s.spawnIn = 10;
        }
        if (d.boss ? s.dragonDown : s.cuts >= d.goal) endStage(s, true, '');
      }
    } else if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
      if (s.ok) {
        if (s.won) s.dead = true;
        else (s.again = false), s.stage++, newStage(s);
      } else if (s.hearts <= 0) s.dead = true;
      else (s.again = true), newStage(s);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const press = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0, 1), y: clamp(y / A, 0, 1) } });

/** 상대 연이 k틱 뒤에 있을 자리 (달려들기는 화살표 길대로) */
function futureKite(e: Kite, k: number): [number, number] {
  if (e.tumble > 0) return [e.x + e.vx * k, e.y + e.vy * k];
  if (e.st === 'warn' || e.st === 'dart') {
    const left = e.st === 'warn' ? (e.kind === 'dragon' && e.hp < 3 ? WARN_T - 14 : WARN_T) - e.stT : 0;
    const tt = e.st === 'warn' ? k - left : e.stT + k;
    if (tt <= 0) return [e.x, e.y];
    const p = Math.min(1, tt / DART_T), q = p * p * (3 - 2 * p);
    const x0 = e.st === 'warn' ? e.x : e.d0x, y0 = e.st === 'warn' ? e.y : e.d0y;
    return [x0 + (e.d1x - x0) * q, y0 + (e.d1y - y0) * q];
  }
  if (e.st === 'rise') {
    const p = Math.min(1, (e.stT + k) / RISE_T), q = 1 - (1 - p) ** 3;
    const sx = e.kind === 'twin' ? 0.5 : KIDS[e.kid].x, sy = (e.kind === 'twin' ? 1.05 : KIDS[e.kid].y) - 0.04;
    return [sx + (e.hx - sx) * q, sy + (e.hy - sy) * q];
  }
  return [e.x + e.vx * k, e.y + e.vy * k];
}

/** k틱 뒤에 줄이 팽팽할까 */
function tenseAt(e: Kite, k: number): boolean {
  if (!canYank(e)) return false;
  if (e.st === 'warn' || e.st === 'dart') return true;
  if (e.st === 'tired') return e.stT + k >= TIRED_T && e.tenseT <= k;
  if (e.st === 'rise' || e.tumble > 0) return false;
  return k < e.tenseT ? e.tense : !e.tense;
}

interface Pred { v: number; cuts: number; first: number; hurt: number; glass: number; bird: number; chain: number }
const W_OF: Record<Star3, { hurt: number; bird: number; chain: number; glassV: number; twin: number; glass?: number }> = {
  double: { hurt: 3, bird: 1, chain: 0.9, glassV: 1, twin: 0.5 },
  nohurt: { hurt: 12, bird: 1, chain: 0.4, glassV: 1, twin: 0.5 },
  doubles: { hurt: 3, bird: 1, chain: 1.3, glassV: 1, twin: 0.5 },
  noglass: { hurt: 3, bird: 1, chain: 0.4, glassV: 1.2, twin: 0.5, glass: 150 },
  twinonce: { hurt: 3, bird: 1, chain: 0.4, glassV: 1, twin: 2.2 },
  nobird: { hurt: 3, bird: 9, chain: 0.4, glassV: 1, twin: 0.5 },
  nodragon: { hurt: 12, bird: 1, chain: 0.4, glassV: 1, twin: 0.5 },
};

/** 손가락을 (tx,ty)에 두면 H틱 동안 무슨 일이 생길까 — 줄은 곧은 줄로, 상대 연은 지금 움직임대로 어림한다 */
function predict(s: KiteState, tx: number, ty: number, H: number): Pred {
  const d = STAGES[s.stage], W = W_OF[d.star3];
  let x = s.kx, y = s.ky, vx = s.kvx, vy = s.kvy, tum = s.tumble;
  const lines: { e: Kite; L: Line; rem: number; done: boolean; at: number; ct: number }[] = [];
  for (const e of s.kites) if (live(e)) for (const L of e.lines) if (!L.cut) lines.push({ e, L, rem: 1 - L.saw, done: false, at: -1, ct: L.touch });
  let v = 0, cuts = 0, first = -1, hurt = 0, glass = 0, bird = 0;
  const cutT: number[] = [];
  for (let k = 1; k <= H; k++) {
    if (tum > 0) (tum--), (vy += 0.0003), (vx *= 0.96), (vy *= 0.96);
    else {
      vx += (tx - x) * K_ACC - vx * DAMP + s.wind * 0.00005;
      vy += (ty - y) * K_ACC - vy * DAMP;
      const sp = Math.hypot(vx, vy), vm = VMAX * (1 + 0.32 * s.wind * (sp > 1e-6 ? vx / sp : 0));
      if (sp > vm) (vx *= vm / sp), (vy *= vm / sp);
    }
    x = clamp(x + vx, SX0, SX1);
    y = clamp(y + vy, SY0, SY1);
    const sm0 = Math.hypot(vx, vy);
    for (const q of lines) {
      if (q.done || !live(q.e) || (q.e.st === 'rise' && q.e.stT + k < RISE_T)) continue;
      const [ex, ey] = futureKite(q.e, k), [qx, qy] = futureKite(q.e, k - 1);
      const ox = q.L.side * 0.035;
      if (!segX(HX, HY, x, y, q.L.ax, q.L.ay, ex + ox, ey)) {
        q.rem = Math.min(1, q.rem + SAW_DECAY);
        q.ct = 0;
        continue;
      }
      q.ct++;
      const tense = tenseAt(q.e, k) || (canYank(q.e) && q.ct >= YANK_AT);
      const sm = X_A * sm0, se = tense ? PULL_V : X_B * Math.hypot(ex - qx, ey - qy) + (q.e.st === 'fly' ? 0.0015 : 0);
      const gl = q.e.kind === 'glass';
      if (gl && X_B < GLASS_TOP) glass += GLASS_WEAR;
      if (sm >= se) {
        if ((!gl || X_B >= GLASS_TOP) && q.e.guard - k <= 0) q.rem -= (Math.max(0, sm - V0) * CUTK) / (gl ? GLASS_HP : 1);
        if (q.rem <= 0) {
          q.done = true;
          q.at = k;
          cuts++;
          cutT.push(k);
          if (first < 0) first = k;
          const e = q.e;
          if (e.kind === 'dragon') v += 1.6;
          else if (e.kind === 'twin') {
            v += 0.7;
            const other = lines.find((o) => o.e === e && o !== q);
            if ((other && other.done && k - other.at <= TWIN_T) || (e.firstCutT >= 0 && !other && s.pt - e.firstCutT + k <= TWIN_T)) v += W.twin;
          } else v += (gl ? W.glassV : 1) + (e.st === 'warn' ? 0.6 : 0);
        }
      } else if (q.e.st !== 'rise') hurt += Math.min(WEAR_CAP, Math.max(0, se - V0E) * WEARK) * (q.e.kind === 'dart' || q.e.kind === 'dragon' ? 1 : 0.5);
    }
    if (!bird && tum <= 0)
      for (const f of s.flocks) {
        const fx = f.x + f.dir * BIRD_V * Math.max(0, k - f.warn);
        for (let b = 0; b < 5; b++) if (Math.hypot(fx - f.dir * [0, 1, 1, 2, 2][b] * 0.045 - x, f.y + [0, -1, 1, -2, 2][b] * 0.03 - y) < BIRD_R + 0.025) bird = 1;
      }
  }
  let chain = 1, best = cuts ? 1 : 0;
  for (let k = 1; k < cutT.length; k++) (chain = cutT[k] - cutT[k - 1] <= CHAIN_T ? chain + 1 : 1), (best = Math.max(best, chain));
  const val = v + (best >= 2 ? W.chain * (best - 1) : 0) - hurt * W.hurt - glass * (W.glass ?? 3) - bird * W.bird - (first > 0 ? first * 0.004 : 0);
  return { v: val, cuts, first, hurt, glass, bird, chain: best };
}

function candidates(s: KiteState): [number, number][] {
  const out: [number, number][] = [[s.tx, s.ty]];
  for (const e of s.kites) {
    if (!live(e)) continue;
    const [ex, ey] = futureKite(e, 10);
    for (const L of e.lines) {
      if (L.cut) continue;
      const kx = ex + L.side * 0.035, dx = kx - L.ax, dy = ey - L.ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const side = Math.sign((s.kx - L.ax) * uy - (s.ky - L.ay) * ux) || 1;
      for (const f of [0.72, 0.9]) {
        const qx = L.ax + dx * f, qy = L.ay + dy * f;
        for (const o of [0.16, 0.28]) out.push([qx - uy * side * o, qy + ux * side * o]);
      }
      out.push([kx + ux * 0.1 - uy * side * 0.12, ey + uy * 0.1 + ux * side * 0.12]);
    }
    // 두 줄 연: 꼭짓점 바로 아래를 가로로 쭉 (두 줄을 한 번에)
    if (e.kind === 'twin') for (const dy of [0.05, 0.1]) out.push([ex + (s.kx < ex ? 0.3 : -0.3), ey + dy]);
    // 연을 지나 멀리 (여러 줄을 한 번에 꿰는 길)
    const ddx = ex - s.kx, ddy = ey - s.ky, dl = Math.hypot(ddx, ddy) || 1;
    out.push([ex + (ddx / dl) * 0.25, ey + (ddy / dl) * 0.25]);
  }
  out.push([0.5, 0.32], [0.22, 0.5], [0.78, 0.5], [0.5, 0.8], [0.2, 0.85], [0.8, 0.85]);
  return out.map(([x, y]) => [clamp(x, SX0, SX1), clamp(y, SY0, SY1)]);
}

const brain = new WeakMap<object, { tx: number; ty: number; until: number; key: string; fresh: boolean }>();
function threatKey(s: KiteState) {
  let k = `${s.stage}:${s.hearts}`;
  for (const e of s.kites) if (e.st === 'warn' || e.st === 'dart') k += `w${e.id}`;
  for (const f of s.flocks) k += `f${f.id}`;
  return k;
}

/** 봇: 손가락 둘 자리 후보마다 앞으로 40틱을 어림해 보고(벨 줄·긁힐 줄·새 떼), 가장 좋은 곳으로 휙 */
export const kitefightSmart: Bot<KiteState> = {
  name: '연싸움 고수',
  act(s) {
    if (s.phase !== 'play' || s.tumble > 0) return NO;
    let m = brain.get(s);
    const key = threatKey(s);
    if (!m || s.t >= m.until || m.key !== key) {
      let best: [number, number] = [s.tx, s.ty], bv = -1e9, bp: Pred | null = null;
      // 세 개 한 번에가 목표인 판: 아직 못 했으면 하나둘 베기는 아끼고 연들이 모이길 기다린다 (위험하면 벤다)
      const patient = STAGES[s.stage].star3 === 'doubles' && s.doubles < DOUBLES && s.pt < 1500;
      for (const [x, y] of candidates(s)) {
        const p = predict(s, x, y, 42);
        const v = p.v - (patient && p.cuts && p.chain < 2 ? 1.15 * p.cuts : 0);
        if (v > bv) (bv = v), (best = [x, y]), (bp = p);
      }
      // 두 줄 연 판: 아직 ★을 못 땄고 위험이 없으면, 꼭짓점 아래 한쪽에 섰다가 가로로 쭉 그어 두 줄을 한 번에
      if (STAGES[s.stage].star3 === 'twinonce' && !s.twinOnce && (!bp || (bp.hurt < 0.01 && bp.chain < 2))) {
        const tw = s.kites.find((e) => e.kind === 'twin' && e.st === 'fly' && e.firstCutT < 0 && (!e.tense || e.tenseT < 40));
        if (tw) {
          const sd = s.kx < tw.x ? -1 : 1, ax = clamp(tw.x + sd * 0.3, SX0, SX1), ay = clamp(tw.y + 0.07, SY0, SY1);
          const there = Math.hypot(s.kx - ax, s.ky - ay) < 0.06 && !tw.tense;
          const goal: [number, number] = there ? [clamp(tw.x - sd * 0.32, SX0, SX1), ay] : [ax, ay];
          const p = predict(s, goal[0], goal[1], 42);
          if (p.hurt < 0.01 && p.bird === 0) (best = goal), (bp = p);
        }
      }
      const stay = best[0] === s.tx && best[1] === s.ty;
      brain.set(s, (m = { tx: best[0], ty: best[1], until: s.t + (bp && bp.cuts ? Math.min(36, bp.first + 8) : 15), key, fresh: !stay }));
    }
    if (m.fresh) {
      m.fresh = false;
      return press(m.tx, m.ty);
    }
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; until: number; x: number; y: number }>();
/** 봇: 아무 데나 아무 때나 누르고 끈다 */
export const kitefightRandom: Bot<KiteState> = {
  name: '아무렇게나 휘휘',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 50), until: 0, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.x = rng();
      m.y = (0.1 + rng() * 0.62) * A;
      m.until = s.t + 3 + Math.floor(rng() * 40);
      m.next = s.t + 25 + Math.floor(rng() * 80);
    }
    return s.t < m.until ? press(m.x, m.y) : NO;
  },
};

/** 버릇 봇: 늘 가장 가까운 상대 연 쪽으로 — 그 연을 지나 조금 더 (연을 꿰뚫고 지나가기) */
export const kitefightHabit: Bot<KiteState> = {
  name: '가장 가까운 연 쪽으로',
  act(s) {
    let best: Kite | null = null, bd = 9;
    for (const e of s.kites)
      if (live(e) && e.st !== 'rise') {
        const dd = Math.hypot(e.x - s.kx, e.y - s.ky);
        if (dd < bd) (bd = dd), (best = e);
      }
    if (!best) return NO;
    const dx = best.x - s.kx, dy = best.y - s.ky, l = Math.hypot(dx, dy) || 1;
    return press(best.x + (dx / l) * 0.15, best.y + (dy / l) * 0.15);
  },
};

/** 독립 버릇 봇: 같은 높이에서 왼쪽·오른쪽 끝을 번갈아 크게 휘두른다 (와이퍼) */
export const kitefightWiper: Bot<KiteState> = {
  name: '좌우로 크게 휘휘',
  act(s) {
    const left = Math.floor(s.t / 55) % 2 === 0;
    return press(left ? 0.1 : 0.9, 0.5);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
/** 아이별 색: 0 여우 · 1 토끼 · 2 너구리 · 3 고양이 · 4 호랑이 대장(용 연) */
interface Pal { a: string; b: string; d: string; line: string; fur: string; fur2: string; ear: string }
const PALS: Pal[] = [
  { a: '#ff8a3d', b: '#ffe6bf', d: '#9a3f12', line: '#ffd2a3', fur: '#f08a3c', fur2: '#fff3e2', ear: '#5a2a12' },
  { a: '#ff74a8', b: '#fff1f7', d: '#9c2f60', line: '#ffc6dc', fur: '#f6eef3', fur2: '#ffd3e4', ear: '#ff9cc2' },
  { a: '#22b5ae', b: '#d8fff8', d: '#0f5856', line: '#a6efe6', fur: '#9097a8', fur2: '#eef0f5', ear: '#3b3f4d' },
  { a: '#9a64ff', b: '#ffe27a', d: '#4a2a9c', line: '#d5c2ff', fur: '#e8b45a', fur2: '#fff3d4', ear: '#a8742a' },
  { a: '#e83c34', b: '#ffd34d', d: '#6e140f', line: '#ffa58f', fur: '#f39a2b', fur2: '#fff2da', ear: '#3a1a08' },
];
const ME_FUR = '#b97a43', ME_FUR2 = '#f7dcb4';
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const hillL = (x: number) => 1.135 + 1.2 * (x - 0.26) ** 2;
const hillR = (x: number) => hillL(1 - x);
const hillC = (x: number) => 1.247 + 1.6 * (x - 0.5) ** 2;
const farRidge = (x: number) => 1.02 + 0.022 * Math.sin(x * 5 + 1) + 0.01 * Math.sin(x * 17);
const midRidge = (x: number) => 1.075 + 0.02 * Math.sin(x * 8 + 0.5) - 0.035 * Math.exp(-(((x - 0.86) / 0.07) ** 2));

interface Fib { x: number; y: number; vx: number; vy: number; a: number; va: number; len: number; col: string; life: number }
const COS = new WeakMap<object, { fib: Fib[]; lt: number; cloud: number; seenEv: number }>();

/** 점들을 부드러운 곡선으로 (중점 2차 곡선) */
function smooth(ctx: CanvasRenderingContext2D, xs: number[], ys: number[]) {
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < xs.length - 1; i++) ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
  ctx.lineTo(xs[xs.length - 1], ys[ys.length - 1]);
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.75, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}

/** 구름 한 덩이 (아래가 노을빛으로 밝다) */
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  const P = [[-1.15, 0.12, 0.5], [-0.55, -0.18, 0.72], [0.12, -0.38, 0.86], [0.78, -0.12, 0.66], [1.3, 0.16, 0.44]];
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, y - r * 1.2, 0, y + r * 0.5);
  g.addColorStop(0, '#b77bb4');
  g.addColorStop(0.55, '#ef9fae');
  g.addColorStop(1, '#ffd9ab');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (const [dx, dy, rr] of P) {
    ctx.moveTo(x + dx * r + rr * r, y + dy * r);
    ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
  }
  ctx.moveTo(x + 1.55 * r, y + 0.22 * r);
  ctx.ellipse(x + 0.08 * r, y + 0.22 * r, 1.47 * r, 0.3 * r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,236,196,.75)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(x + 0.08 * r, y + 0.22 * r, 1.4 * r, 0.27 * r, 0, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.beginPath();
  ctx.arc(x + 0.02 * r, y - 0.55 * r, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** 리본 꼬리: 줄기 + 나비 매듭 (흔들림) */
function tail(ctx: CanvasRenderingContext2D, x0: number, y0: number, dx: number, dy: number, len: number, t: number, ph: number, col: string, bow: string, wd: number, bows = 3) {
  const px = -dy, py = dx, n = 12, xs: number[] = [], ys: number[] = [];
  for (let k = 0; k <= n; k++) {
    const f = k / n, wv = Math.sin(t * 0.22 + ph - f * 5.5) * len * 0.13 * f;
    xs.push(x0 + dx * len * f + px * wv);
    ys.push(y0 + dy * len * f + py * wv);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = wd;
  ctx.lineCap = 'round';
  smooth(ctx, xs, ys);
  ctx.stroke();
  for (let b = 1; b <= bows; b++) {
    const k = Math.round((b / (bows + 0.4)) * n), bx = xs[k], by = ys[k], sz = wd * 2.6 * (1 - b * 0.12);
    const ang = Math.atan2(ys[k + 1] - ys[k - 1], xs[k + 1] - xs[k - 1]) + Math.PI / 2;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang + Math.sin(t * 0.2 + b + ph) * 0.3);
    ctx.fillStyle = bow;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-sz, -sz * 0.6);
    ctx.lineTo(-sz, sz * 0.6);
    ctx.closePath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sz, -sz * 0.6);
    ctx.lineTo(sz, sz * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.arc(0, 0, sz * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 눈 한 쌍 + 입. mood: 0 보통 · 1 우쭐(^^) · 2 놀람 · 3 화남 · 4 어질(X) · 5 힘줌 · 6 헥헥 */
function face(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, mood: number, t: number, look = 0, mouth = true) {
  const ex = r * 0.34, er = r * 0.17;
  for (const sd of [-1, 1]) {
    const x = cx + sd * ex;
    if (mood === 4) {
      ctx.strokeStyle = '#2a1830';
      ctx.lineWidth = Math.max(1.2, r * 0.07);
      ctx.beginPath();
      ctx.moveTo(x - er * 0.8, cy - er * 0.8);
      ctx.lineTo(x + er * 0.8, cy + er * 0.8);
      ctx.moveTo(x + er * 0.8, cy - er * 0.8);
      ctx.lineTo(x - er * 0.8, cy + er * 0.8);
      ctx.stroke();
      continue;
    }
    if (mood === 1 || mood === 5) {
      ctx.strokeStyle = '#2a1830';
      ctx.lineWidth = Math.max(1.3, r * 0.08);
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (mood === 1) ctx.arc(x, cy + er * 0.3, er * 0.9, Math.PI * 1.15, Math.PI * 1.85);
      else (ctx.moveTo(x - er, cy - er * 0.2 * sd), ctx.lineTo(x + er, cy + er * 0.2 * sd));
      ctx.stroke();
      continue;
    }
    const blink = mood === 0 && (t + Math.floor(cx)) % 190 < 6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, cy, er * (mood === 2 ? 1.25 : 1), blink ? er * 0.18 : er * (mood === 2 ? 1.35 : 1.15), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(42,24,48,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!blink) {
      ctx.fillStyle = mood === 3 ? '#c4161c' : '#2a1830';
      ctx.beginPath();
      ctx.arc(x + look * er * 0.35, cy + er * 0.12, er * (mood === 2 ? 0.45 : 0.62), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + look * er * 0.35 - er * 0.22, cy - er * 0.18, er * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mood === 3 || mood === 6) {
      ctx.strokeStyle = '#2a1830';
      ctx.lineWidth = Math.max(1.4, r * 0.09);
      ctx.beginPath();
      if (mood === 3) (ctx.moveTo(x - sd * er * 1.1, cy - er * 1.8), ctx.lineTo(x + sd * er * 0.9, cy - er * 1.05));
      else (ctx.moveTo(x - er, cy - er * 1.5), ctx.lineTo(x + er, cy - er * 1.7));
      ctx.stroke();
    }
  }
  if (!mouth) return;
  const my = cy + r * 0.32;
  ctx.strokeStyle = '#2a1830';
  ctx.fillStyle = '#7a1f2a';
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.beginPath();
  if (mood === 2 || mood === 4) (ctx.ellipse(cx, my + r * 0.03, r * 0.1, r * 0.13, 0, 0, Math.PI * 2), ctx.fill());
  else if (mood === 3 || mood === 5) {
    ctx.moveTo(cx - r * 0.16, my + r * 0.04);
    for (let k = 1; k <= 4; k++) ctx.lineTo(cx - r * 0.16 + k * r * 0.08, my + (k % 2 ? -1 : 1) * r * 0.04);
    ctx.stroke();
  } else if (mood === 6) (ctx.ellipse(cx, my + r * 0.04, r * 0.12, r * 0.08, 0, 0, Math.PI * 2), ctx.fill());
  else (ctx.arc(cx, my - r * 0.06, r * 0.15, 0.2, Math.PI - 0.2), ctx.stroke());
  if (mood === 1 || mood === 0) {
    ctx.fillStyle = 'rgba(255,110,140,.45)';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(cx + sd * r * 0.58, cy + r * 0.2, r * 0.13, r * 0.08, 0, 0, Math.PI * 2), ctx.fill());
  }
}

/** 내 방패연: 가운데 방구멍(입), 꼭지 동그라미, 대나무 살, 양쪽 아래 리본 꼬리 */
function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, mood: number, t: number, tdx: number, tdy: number, glow: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const c = Math.cos(-rot), sn = Math.sin(-rot), lx = tdx * c - tdy * sn, ly = tdx * sn + tdy * c;
  tail(ctx, -r * 0.62, r * 0.95, lx, ly, r * 2.3, t, 0, '#ffd23f', '#ff4f5e', Math.max(1.6, r * 0.09), 2);
  tail(ctx, r * 0.62, r * 0.95, lx, ly, r * 2.5, t, 1.7, '#ffd23f', '#3fa7ff', Math.max(1.6, r * 0.09), 2);
  if (glow > 0) {
    ctx.fillStyle = `rgba(255,236,150,${0.35 * glow})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(40,16,50,.28)';
  ctx.beginPath();
  ctx.roundRect(-r * 0.8 + r * 0.12, -r + r * 0.16, r * 1.6, r * 2, r * 0.14);
  ctx.fill();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#fffdf4');
  g.addColorStop(1, '#f1dcbc');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-r * 0.8, -r, r * 1.6, r * 2, r * 0.14);
  ctx.arc(0, r * 0.32, r * 0.3, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  // 머릿단 · 양 옆 색 띠
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-r * 0.8, -r, r * 1.6, r * 2, r * 0.14);
  ctx.clip();
  ctx.fillStyle = '#3f7ff0';
  ctx.fillRect(-r * 0.8, -r, r * 1.6, r * 0.22);
  ctx.fillStyle = '#ff5462';
  ctx.fillRect(-r * 0.8, r * 0.78, r * 1.6, r * 0.22);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(-r * 0.8, -r, r * 0.5, r * 2);
  ctx.restore();
  // 꼭지 (빨강·파랑 반달)
  ctx.fillStyle = '#ff5462';
  ctx.beginPath();
  ctx.arc(0, -r * 0.5, r * 0.2, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#3f7ff0';
  ctx.beginPath();
  ctx.arc(0, -r * 0.5, r * 0.2, 0, Math.PI);
  ctx.fill();
  // 대나무 살
  ctx.strokeStyle = 'rgba(120,76,36,.55)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r);
  ctx.lineTo(-r * 0.24, r * 0.15);
  ctx.moveTo(r * 0.8, -r);
  ctx.lineTo(r * 0.24, r * 0.15);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r * 0.02);
  ctx.moveTo(-r * 0.8, -r * 0.78);
  ctx.lineTo(r * 0.8, -r * 0.78);
  ctx.stroke();
  // 테두리 · 방구멍 테
  ctx.strokeStyle = '#5b3420';
  ctx.lineWidth = Math.max(1.4, r * 0.07);
  ctx.beginPath();
  ctx.roundRect(-r * 0.8, -r, r * 1.6, r * 2, r * 0.14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, r * 0.32, r * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  face(ctx, 0, -r * 0.08, r * 0.95, mood, t, 0, false);
  ctx.restore();
}

/** 상대 가오리연 (떠돌이·사나운·유리), 두 줄 연(넓은 날개), 얼굴과 긴 꼬리 */
function drawRay(ctx: CanvasRenderingContext2D, e: Kite, x: number, y: number, r: number, t: number, mood: number, tdx: number, tdy: number) {
  const P = PALS[e.pal];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(e.rot);
  const c = Math.cos(-e.rot), sn = Math.sin(-e.rot), lx = tdx * c - tdy * sn, ly = tdx * sn + tdy * c;
  const glass = e.kind === 'glass', dart = e.kind === 'dart', twin = e.kind === 'twin';
  if (twin) {
    tail(ctx, -r * 1.3, r * 0.45, lx, ly, r * 1.6, t, e.ph, P.b, P.a, Math.max(1.4, r * 0.07), 2);
    tail(ctx, r * 1.3, r * 0.45, lx, ly, r * 1.6, t, e.ph + 2, P.b, P.a, Math.max(1.4, r * 0.07), 2);
  } else tail(ctx, 0, r * 0.95, lx, ly, r * 3.1, t, e.ph, glass ? '#bff4ff' : P.b, glass ? '#7fe2ff' : P.a, Math.max(1.5, r * 0.08), 3);
  const shape = () => {
    ctx.beginPath();
    if (twin) {
      ctx.moveTo(0, -r * 0.75);
      ctx.quadraticCurveTo(r * 0.7, -r * 0.35, r * 1.6, r * 0.5);
      ctx.quadraticCurveTo(r * 0.7, r * 0.18, 0, r * 0.38);
      ctx.quadraticCurveTo(-r * 0.7, r * 0.18, -r * 1.6, r * 0.5);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.35, 0, -r * 0.75);
    } else if (dart) {
      ctx.moveTo(0, -r * 1.12);
      ctx.lineTo(r * 1.05, -r * 0.08);
      for (let k = 1; k <= 3; k++) ctx.lineTo(r * 1.05 * (1 - k / 3.4) + (k % 2 ? r * 0.12 : 0), -r * 0.08 + (r * 1.08 * k) / 3.4);
      ctx.lineTo(0, r * 1.02);
      for (let k = 3; k >= 1; k--) ctx.lineTo(-r * 1.05 * (1 - k / 3.4) - (k % 2 ? r * 0.12 : 0), -r * 0.08 + (r * 1.08 * k) / 3.4);
      ctx.lineTo(-r * 1.05, -r * 0.08);
      ctx.closePath();
    } else {
      ctx.moveTo(0, -r * 1.05);
      ctx.quadraticCurveTo(r * 0.55, -r * 0.62, r * 1.02, -r * 0.08);
      ctx.quadraticCurveTo(r * 0.5, r * 0.5, 0, r * 1.0);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.5, -r * 1.02, -r * 0.08);
      ctx.quadraticCurveTo(-r * 0.55, -r * 0.62, 0, -r * 1.05);
    }
  };
  ctx.save();
  ctx.translate(r * 0.12, r * 0.16);
  ctx.fillStyle = 'rgba(40,16,50,.26)';
  shape();
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  if (glass) (g.addColorStop(0, '#f2fdff'), g.addColorStop(0.5, '#9fe6ff'), g.addColorStop(1, '#4fb7e6'));
  else (g.addColorStop(0, P.b), g.addColorStop(0.35, P.a), g.addColorStop(1, P.d));
  ctx.fillStyle = g;
  shape();
  ctx.fill();
  // 무늬: 가운데 띠 / 유리 면 / 날개 줄
  ctx.save();
  shape();
  ctx.clip();
  if (glass) {
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.08);
    ctx.lineTo(0, r * 0.3);
    ctx.lineTo(r, -r * 0.08);
    ctx.moveTo(0, -r * 1.05);
    ctx.lineTo(0, r);
    ctx.moveTo(-r * 0.5, -r * 0.6);
    ctx.lineTo(r * 0.5, r * 0.5);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const a = (t * 0.05 + k * 2.1) % 6.28, sx = Math.cos(a) * r * 0.5, sy = Math.sin(a * 1.3) * r * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 0.2 + k * 2)})`;
      starPath(ctx, sx, sy, r * 0.16);
      ctx.fill();
    }
  } else if (twin) {
    ctx.fillStyle = P.b;
    ctx.fillRect(-r * 1.6, r * 0.05, r * 3.2, r * 0.12);
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.fillRect(-r * 1.6, -r * 0.8, r * 1.6, r * 1.6);
  } else {
    ctx.fillStyle = P.b;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.lineTo(r * 0.24, -r * 0.08);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.24, -r * 0.08);
    ctx.closePath();
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fillRect(-r * 1.1, -r * 1.1, r * 1.1, r * 1.1);
    if (dart) {
      ctx.fillStyle = 'rgba(70,0,10,.35)';
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sd * r * 0.35, r * 0.25);
        ctx.lineTo(sd * r * 0.8, r * 0.05);
        ctx.lineTo(sd * r * 0.55, r * 0.35);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  if (e.tense && live(e)) {
    ctx.strokeStyle = 'rgba(255,60,50,.55)';
    ctx.lineWidth = Math.max(4, r * 0.22);
    ctx.lineJoin = 'round';
    shape();
    ctx.stroke();
  }
  ctx.strokeStyle = glass ? '#2a7fa8' : P.d;
  ctx.lineWidth = Math.max(1.4, r * 0.08);
  ctx.lineJoin = 'round';
  shape();
  ctx.stroke();
  if (dart) {
    // 사나운 연: 뿔 둘 + 눈가리개
    ctx.fillStyle = '#7a1018';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * r * 0.12, -r * 0.92);
      ctx.lineTo(sd * r * 0.42, -r * 1.42);
      ctx.lineTo(sd * r * 0.36, -r * 0.72);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,8,24,.78)';
    ctx.beginPath();
    ctx.roundRect(-r * 0.72, -r * 0.36, r * 1.44, r * 0.36, r * 0.16);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(110,70,40,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (twin) (ctx.moveTo(-r * 1.5, r * 0.45), ctx.lineTo(r * 1.5, r * 0.45), ctx.moveTo(0, -r * 0.7), ctx.lineTo(0, r * 0.38));
  else (ctx.moveTo(-r * 1.0, -r * 0.08), ctx.lineTo(r * 1.0, -r * 0.08));
  ctx.stroke();
  face(ctx, 0, twin ? -r * 0.12 : -r * 0.18, r * (twin ? 0.85 : 0.9), mood, t);
  ctx.restore();
}

/** 용 연: 머리 + 꼬리를 따라오는 마디들 */
function drawDragon(ctx: CanvasRenderingContext2D, e: Kite, X: (x: number) => number, Y: (y: number) => number, r: number, t: number, mood: number) {
  const segs: number[][] = [];
  for (let k = 1; k <= 7; k++) {
    const i = e.trail.length - 2 - k * 7;
    if (i < 0) break;
    segs.push([X(e.trail[i]), Y(e.trail[i + 1]) + Math.sin(t * 0.15 - k) * r * 0.25]);
  }
  for (let k = segs.length - 1; k >= 0; k--) {
    const [sx, sy] = segs[k], rr = r * (0.78 - k * 0.07);
    if (k === segs.length - 1) {
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - rr * 1.6, sy - rr * 1.1);
      ctx.lineTo(sx - rr * 0.8, sy);
      ctx.lineTo(sx - rr * 1.6, sy + rr * 1.1);
      ctx.closePath();
      ctx.fill();
    }
    const g = ctx.createRadialGradient(sx - rr * 0.3, sy - rr * 0.3, rr * 0.1, sx, sy, rr);
    g.addColorStop(0, k % 2 ? '#ffe47a' : '#ff7a5a');
    g.addColorStop(1, k % 2 ? '#d89a12' : '#b8221b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a0f0c';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(sx - rr * 0.4, sy - rr * 0.85);
    ctx.lineTo(sx, sy - rr * 1.45);
    ctx.lineTo(sx + rr * 0.4, sy - rr * 0.85);
    ctx.fill();
  }
  const hx = X(e.x), hy = Y(e.y), dir = e.vx < -0.0005 ? -1 : 1;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(e.st === 'fall' ? e.rot : clamp(e.vy * 20, -0.4, 0.4) * dir);
  ctx.scale(dir, 1);
  // 뿔 · 수염
  ctx.fillStyle = '#ffd34d';
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 1.2;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.2 + sd * r * 0.25, -r * 0.75);
    ctx.quadraticCurveTo(-r * 0.6 + sd * r * 0.3, -r * 1.6, -r * 0.9 + sd * r * 0.2, -r * 1.5);
    ctx.quadraticCurveTo(-r * 0.4 + sd * r * 0.3, -r * 1.1, r * 0.1 + sd * r * 0.25, -r * 0.7);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 1.6;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.9, r * 0.15 * sd);
    ctx.quadraticCurveTo(r * 1.5, r * 0.6 * sd + Math.sin(t * 0.2) * r * 0.2, r * 1.2, r * 1.1 * sd);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, '#ff8a6a');
  g.addColorStop(1, '#a8160f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.0, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.75, r * 0.2, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a0a08';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.0, r * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(r * 0.6, r * 0.45);
  ctx.lineTo(r * 0.72, r * 0.68);
  ctx.lineTo(r * 0.85, r * 0.45);
  ctx.lineTo(r * 0.98, r * 0.62);
  ctx.lineTo(r * 1.08, r * 0.4);
  ctx.fill();
  face(ctx, r * 0.05, -r * 0.18, r * 0.95, mood, t, 1, false);
  ctx.restore();
}

/** 동물 아이: sp 0 여우 1 토끼 2 너구리 3 고양이 4 호랑이 5 곰돌이 · pose 0 서기 1 당기기 2 만세 3 엉덩방아 4 얼굴 가림 */
function drawKid(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, sp: number, pose: number, t: number, hx: number, hy: number, mood: number) {
  const fur = sp === 5 ? ME_FUR : PALS[sp].fur, fur2 = sp === 5 ? ME_FUR2 : PALS[sp].fur2, ear = sp === 5 ? '#7a4a22' : PALS[sp].ear;
  const ink = '#3a2230';
  ctx.fillStyle = 'rgba(30,20,40,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, sz * 0.32, sz * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  const breathe = 1 + Math.sin(t * 0.08 + sp) * 0.025;
  let jump = 0;
  if (pose === 2) jump = -Math.abs(Math.sin(t * 0.25)) * sz * 0.25;
  if (pose === 3) ctx.rotate(-1.1 * (sp % 2 ? -1 : 1));
  ctx.translate(0, jump);
  ctx.scale(1, breathe);
  const lw = Math.max(1.2, sz * 0.045);
  ctx.lineWidth = lw;
  ctx.strokeStyle = ink;
  // 다리
  ctx.fillStyle = fur;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * sz * 0.12, -sz * 0.05 + (pose === 3 ? -sz * 0.15 : 0), sz * 0.09, sz * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // 몸
  const bg = ctx.createLinearGradient(-sz * 0.3, 0, sz * 0.3, 0);
  bg.addColorStop(0, fur);
  bg.addColorStop(1, fur2);
  ctx.fillStyle = sp === 1 ? fur : bg;
  ctx.beginPath();
  ctx.ellipse(0, -sz * 0.3, sz * 0.25, sz * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = sp === 1 ? '#ffffff' : fur2;
  ctx.beginPath();
  ctx.ellipse(0, -sz * 0.24, sz * 0.14, sz * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  if (sp === 5) {
    // 곰돌이 목도리
    ctx.fillStyle = '#ff5462';
    ctx.beginPath();
    ctx.roundRect(-sz * 0.22, -sz * 0.5, sz * 0.44, sz * 0.08, sz * 0.04);
    ctx.fill();
    ctx.fillRect(sz * 0.08, -sz * 0.47, sz * 0.07, sz * 0.18);
  }
  // 팔 (얼레 쪽으로)
  const shY = -sz * 0.42;
  let ax: number, ay: number;
  if (pose === 2) (ax = 0), (ay = -sz * 1.15);
  else if (pose === 4) (ax = 0), (ay = -sz * 0.72);
  else if (pose === 3) (ax = sz * 0.1), (ay = -sz * 0.7);
  else (ax = (hx - x) * 0.9), (ay = (hy - y - jump) / breathe);
  ctx.strokeStyle = fur;
  ctx.lineWidth = sz * 0.1;
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const tx = pose === 2 ? sd * sz * 0.3 : pose === 4 ? sd * sz * 0.2 : ax + sd * sz * 0.05, ty = pose === 2 ? ay : pose === 4 ? ay : ay;
    ctx.beginPath();
    ctx.moveTo(sd * sz * 0.18, shY);
    ctx.quadraticCurveTo(sd * sz * 0.28, (shY + ty) / 2, tx, ty);
    ctx.stroke();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  // 얼레
  if (pose === 0 || pose === 1) {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.fillStyle = '#a8703a';
    ctx.beginPath();
    ctx.roundRect(-sz * 0.12, -sz * 0.06, sz * 0.24, sz * 0.12, sz * 0.03);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sp === 5 ? '#fff6dc' : PALS[sp].line;
    ctx.fillRect(-sz * 0.07, -sz * 0.05, sz * 0.14, sz * 0.1);
    ctx.restore();
  }
  // 머리
  const hy0 = -sz * 0.68;
  ctx.fillStyle = fur;
  const earP = (ex: number, ey: number, w2: number, h2: number, rot: number) => {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(rot);
    ctx.beginPath();
    if (sp === 0 || sp === 3) (ctx.moveTo(-w2, h2 * 0.3), ctx.lineTo(0, -h2), ctx.lineTo(w2, h2 * 0.3), ctx.closePath());
    else ctx.ellipse(0, 0, w2, h2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  for (const sd of [-1, 1]) {
    if (sp === 1) earP(sd * sz * 0.1, hy0 - sz * 0.3, sz * 0.07, sz * 0.2, sd * 0.15);
    else if (sp === 0 || sp === 3) earP(sd * sz * 0.15, hy0 - sz * 0.18, sz * 0.09, sz * 0.13, sd * 0.25);
    else earP(sd * sz * 0.17, hy0 - sz * 0.16, sz * 0.08, sz * 0.08, 0);
  }
  ctx.fillStyle = ear;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (sp === 1) ctx.ellipse(sd * sz * 0.1, hy0 - sz * 0.3, sz * 0.035, sz * 0.13, sd * 0.15, 0, Math.PI * 2);
    else ctx.arc(sd * sz * 0.16, hy0 - sz * 0.15, sz * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(sz * 0.08, hy0 - sz * 0.08, sz * 0.02, 0, hy0, sz * 0.26);
  hg.addColorStop(0, fur2);
  hg.addColorStop(1, fur);
  ctx.fillStyle = sp === 1 ? '#fbf6f9' : hg;
  ctx.beginPath();
  ctx.ellipse(0, hy0, sz * 0.25, sz * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (sp === 2) {
    ctx.fillStyle = '#3b3f4d';
    ctx.beginPath();
    ctx.ellipse(0, hy0 + sz * 0.01, sz * 0.2, sz * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (sp === 4) {
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = lw * 1.2;
    for (const sd of [-1, 0, 1]) (ctx.beginPath(), ctx.moveTo(sd * sz * 0.08, hy0 - sz * 0.21), ctx.lineTo(sd * sz * 0.06, hy0 - sz * 0.13), ctx.stroke());
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
  }
  // 주둥이
  ctx.fillStyle = sp === 0 || sp === 3 || sp === 4 ? '#fff6ea' : fur2;
  ctx.beginPath();
  ctx.ellipse(0, hy0 + sz * 0.09, sz * 0.1, sz * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(0, hy0 + sz * 0.065, sz * 0.035, sz * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pose === 4) {
    // 두 손으로 눈 가림
    ctx.fillStyle = fur;
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * sz * 0.09, hy0 - sz * 0.01, sz * 0.075, 0, Math.PI * 2), ctx.fill(), ctx.stroke());
  } else {
    face(ctx, 0, hy0 - sz * 0.02, sz * 0.36, mood, t, 0, false);
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    if (mood === 2 || mood === 4 || pose === 3) (ctx.fillStyle = '#7a1f2a'), ctx.ellipse(0, hy0 + sz * 0.13, sz * 0.03, sz * 0.035, 0, 0, Math.PI * 2), ctx.fill();
    else if (pose === 2 || mood === 1) (ctx.fillStyle = '#7a1f2a'), ctx.arc(0, hy0 + sz * 0.1, sz * 0.05, 0, Math.PI), ctx.fill();
    else (ctx.arc(-sz * 0.025, hy0 + sz * 0.1, sz * 0.025, 0, Math.PI), ctx.arc(sz * 0.025, hy0 + sz * 0.1, sz * 0.025, 0, Math.PI), ctx.stroke());
  }
  ctx.restore();
  if (pose === 3) {
    // 어질어질 별
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3, sx = x - sz * 0.45 * (sp % 2 ? -1 : 1) + Math.cos(a) * sz * 0.3, sy = y - sz * 0.35 + Math.sin(a) * sz * 0.1;
      ctx.fillStyle = '#ffe14d';
      starPath(ctx, sx, sy, sz * 0.08);
      ctx.fill();
    }
  }
}

/** 작은 새 (부딪히면 연이 빙글) */
function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number, t: number, k: number) {
  const flap = Math.sin(t * 0.45 + k * 1.3);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = '#4a2f62';
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.1);
  ctx.quadraticCurveTo(-r * 0.6, -r * 1.2 * flap, -r * 1.2, -r * 0.9 * flap);
  ctx.quadraticCurveTo(-r * 0.5, -r * 0.2, r * 0.2, -r * 0.05);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
  g.addColorStop(0, '#6b4a8a');
  g.addColorStop(1, '#ffb08a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.75, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a1830';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffb12e';
  ctx.beginPath();
  ctx.moveTo(r * 0.7, -r * 0.08);
  ctx.lineTo(r * 1.05, r * 0.05);
  ctx.lineTo(r * 0.7, r * 0.16);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.12, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1830';
  ctx.beginPath();
  ctx.arc(r * 0.42, -r * 0.11, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 손가락 안내 그림 */
function drawFinger(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, press: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(press ? 0.9 : 1, press ? 0.9 : 1);
  ctx.fillStyle = 'rgba(40,16,50,.3)';
  ctx.beginPath();
  ctx.roundRect(-s * 0.18 + 3, -s * 0.05 + 4, s * 0.36, s * 0.95, s * 0.18);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3a2230';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-s * 0.4, s * 0.38, s * 0.8, s * 0.6, s * 0.22);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-s * 0.16, -s * 0.05, s * 0.32, s * 0.8, s * 0.16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd9e0';
  ctx.beginPath();
  ctx.roundRect(-s * 0.1, 0, s * 0.2, s * 0.18, s * 0.08);
  ctx.fill();
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: KiteState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  let cs = COS.get(s);
  if (!cs) COS.set(s, (cs = { fib: [], lt: s.t, cloud: 0, seenEv: -1 }));
  const dt = clamp(s.t - cs.lt, 0, 4);
  cs.lt = s.t;
  cs.cloud += dt * (0.00004 + s.wind * 0.00016);
  const par = s.kx - 0.5;

  ctx.save();
  fx.begin(ctx);
  // 크게 벤 순간: 그 자리로 살짝 다가간다 (느려진 동안)
  if (s.slow > 0 && s.t - s.lastCutT < 70) {
    const z = 1 + 0.045 * Math.min(1, s.slow / 20), cx = X(s.my.x[KN]), cy = Y(s.my.y[KN]);
    ctx.translate(cx, cy);
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);
  }
  // ═════════════ 하늘 ═════════════
  const sky = ctx.createLinearGradient(0, 0, 0, Y(1.1));
  sky.addColorStop(0, '#1d1644');
  sky.addColorStop(0.26, '#3f2c78');
  sky.addColorStop(0.5, '#87488c');
  sky.addColorStop(0.68, '#d45f7c');
  sky.addColorStop(0.84, '#ff9460');
  sky.addColorStop(1, '#ffd283');
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  for (let k = 0; k < 28; k++) {
    const sx = hsh(k) * w, sy = hsh(k + 50) * Y(0.42);
    ctx.globalAlpha = (0.2 + 0.55 * Math.abs(Math.sin(t / 45 + k))) * (1 - sy / Y(0.45));
    ctx.fillStyle = '#fff6e0';
    ctx.fillRect(sx - par * 4, sy, k % 4 ? 1.4 : 2.2, k % 4 ? 1.4 : 2.2);
  }
  ctx.globalAlpha = 1;
  // 해 · 빛살
  {
    const sx = X(0.7) - par * R(0.02), sy = Y(1.0);
    const gl = ctx.createRadialGradient(sx, sy, R(0.05), sx, sy, R(0.75));
    gl.addColorStop(0, 'rgba(255,226,160,.7)');
    gl.addColorStop(0.35, 'rgba(255,160,110,.25)');
    gl.addColorStop(1, 'rgba(255,140,110,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, w, Y(1.2));
    ctx.fillStyle = 'rgba(255,236,190,.07)';
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI + 0.18 + k * 0.35 + Math.sin(t * 0.004 + k) * 0.04;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - 0.05) * R(1.3), sy + Math.sin(a - 0.05) * R(1.3));
      ctx.lineTo(sx + Math.cos(a + 0.05) * R(1.3), sy + Math.sin(a + 0.05) * R(1.3));
      ctx.fill();
    }
    const dg = ctx.createRadialGradient(sx - R(0.03), sy - R(0.03), R(0.01), sx, sy, R(0.12));
    dg.addColorStop(0, '#fffbe8');
    dg.addColorStop(0.6, '#ffe08a');
    dg.addColorStop(1, '#ffad5e');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  // 먼 구름 · 먼 새
  for (let k = 0; k < 4; k++) {
    const cx = ((((hsh(k + 7) + cs.cloud * (0.6 + k * 0.1)) % 1) + 1) % 1) * 1.5 - 0.25 - par * 0.03;
    cloud(ctx, X(cx), Y(0.2 + hsh(k + 9) * 0.5), R(0.055 + hsh(k + 3) * 0.03), 0.5);
  }
  ctx.strokeStyle = 'rgba(60,30,80,.45)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    const bx = X((((0.2 + k * 0.31 + t * 0.00025) % 1.2) + 1.2) % 1.2 - 0.1), by = Y(0.55 + k * 0.07 + Math.sin(t * 0.02 + k) * 0.01), f = Math.sin(t * 0.3 + k) * 2;
    ctx.beginPath();
    ctx.moveTo(bx - 4, by - f);
    ctx.quadraticCurveTo(bx - 2, by - 2, bx, by);
    ctx.quadraticCurveTo(bx + 2, by - 2, bx + 4, by - f);
    ctx.stroke();
  }
  // ═════════════ 먼 언덕 · 마을 ═════════════
  {
    const g = ctx.createLinearGradient(0, Y(0.98), 0, Y(1.15));
    g.addColorStop(0, '#8a4f86');
    g.addColorStop(1, '#5a3270');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, h);
    for (let k = 0; k <= 30; k++) ctx.lineTo(X(k / 30) - par * R(0.015), Y(farRidge(k / 30)));
    ctx.lineTo(w + 10, h);
    ctx.fill();
    for (const [hx0, sc] of [[0.1, 1], [0.17, 0.8], [0.44, 0.9], [0.5, 1.1], [0.95, 0.85]] as number[][]) {
      const bx = X(hx0) - par * R(0.015), by = Y(farRidge(hx0)) + 2, bw = R(0.028 * sc), bh = R(0.02 * sc);
      ctx.fillStyle = '#4b2a5e';
      ctx.fillRect(bx - bw / 2, by - bh, bw, bh);
      ctx.beginPath();
      ctx.moveTo(bx - bw * 0.65, by - bh);
      ctx.lineTo(bx, by - bh * 1.8);
      ctx.lineTo(bx + bw * 0.65, by - bh);
      ctx.fill();
      ctx.fillStyle = (t + hx0 * 900) % 300 < 280 ? '#ffd27a' : '#c9925a';
      ctx.fillRect(bx - bw * 0.15, by - bh * 0.7, bw * 0.3, bh * 0.35);
    }
    const g2 = ctx.createLinearGradient(0, Y(1.02), 0, Y(1.2));
    g2.addColorStop(0, '#5d3768');
    g2.addColorStop(1, '#3a2150');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(-10, h);
    for (let k = 0; k <= 40; k++) ctx.lineTo(X(k / 40) - par * R(0.03), Y(midRidge(k / 40)));
    ctx.lineTo(w + 10, h);
    ctx.fill();
    for (let k = 0; k < 11; k++) {
      const tx = (k + 0.5) / 11 + (hsh(k + 30) - 0.5) * 0.05;
      if (Math.abs(tx - 0.86) < 0.07) continue;
      const bx = X(tx) - par * R(0.03), by = Y(midRidge(tx)) + 3, th2 = R(0.04 + hsh(k) * 0.03), tw2 = th2 * 0.42;
      for (let l = 0; l < 3; l++) {
        const ly = by - th2 * (0.25 + l * 0.28), lw2 = tw2 * (1 - l * 0.25);
        ctx.fillStyle = '#2f1d45';
        ctx.beginPath();
        ctx.moveTo(bx - lw2, ly + th2 * 0.12);
        ctx.lineTo(bx, ly - th2 * 0.4);
        ctx.lineTo(bx + lw2, ly + th2 * 0.12);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,170,120,.35)';
        ctx.beginPath();
        ctx.moveTo(bx, ly - th2 * 0.4);
        ctx.lineTo(bx + lw2, ly + th2 * 0.12);
        ctx.lineTo(bx + lw2 * 0.55, ly + th2 * 0.12);
        ctx.fill();
      }
    }
  }
  // 가까운 구름 (먼 언덕 앞, 연 뒤)
  for (let k = 0; k < 3; k++) {
    const cx = ((((hsh(k + 17) + cs.cloud * (1.6 + k * 0.3)) % 1) + 1) % 1) * 1.7 - 0.35 - par * 0.07;
    cloud(ctx, X(cx), Y(0.28 + hsh(k + 19) * 0.5), R(0.1 + hsh(k + 23) * 0.04), 0.6);
  }
  // 바람 줄무늬
  if (Math.abs(s.wind) > 0.3) {
    ctx.strokeStyle = 'rgba(255,240,220,.22)';
    ctx.lineWidth = 1.4;
    const n = Math.round(Math.abs(s.wind) * 7);
    for (let k = 0; k < n; k++) {
      const ph = ((t * 0.012 * Math.abs(s.wind) + hsh(k + 60)) % 1) * 1.4 - 0.2, xx = s.wind > 0 ? ph : 1 - ph, yy = 0.2 + hsh(k + 70) * 0.75;
      ctx.beginPath();
      ctx.moveTo(X(xx), Y(yy));
      ctx.quadraticCurveTo(X(xx - Math.sign(s.wind) * 0.06), Y(yy - 0.008), X(xx - Math.sign(s.wind) * 0.13), Y(yy));
      ctx.stroke();
    }
  }
  // ═════════════ 옆 언덕 · 아이들 ═════════════
  const hill = (f: (x: number) => number, x0: number, x1: number, top: string, bot: string) => {
    const g = ctx.createLinearGradient(0, Y(1.1), 0, Y(1.45));
    g.addColorStop(0, top);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(x0), h + 10);
    for (let k = 0; k <= 24; k++) ctx.lineTo(X(x0 + ((x1 - x0) * k) / 24), Y(f(x0 + ((x1 - x0) * k) / 24)));
    ctx.lineTo(X(x1), h + 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,150,.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const xx = x0 + ((x1 - x0) * k) / 24;
      k ? ctx.lineTo(X(xx), Y(f(xx)) + 1) : ctx.moveTo(X(xx), Y(f(xx)) + 1);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,70,40,.5)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 10; k++) {
      const gx = x0 + (x1 - x0) * (0.05 + 0.9 * hsh(k * 3 + x0 * 10)), gy = f(gx) + 0.02 + hsh(k + 9) * 0.06;
      if (gy > 1.36) continue;
      ctx.beginPath();
      ctx.moveTo(X(gx) - 3, Y(gy));
      ctx.lineTo(X(gx) - 1, Y(gy) - 5);
      ctx.moveTo(X(gx), Y(gy));
      ctx.lineTo(X(gx) + 2, Y(gy) - 6);
      ctx.stroke();
    }
  };
  const used = new Map<number, Kite>();
  for (const e of s.kites) if (live(e)) used.set(e.kid, e), e.kid2 >= 0 && used.set(e.kid2, e);
  const kidPose = (k: number): [number, number] => {
    const e = used.get(k), since = s.t - s.kidT[k];
    if (since < 110) return [3, 4];
    if (!e) return [0, 0];
    if (e.st === 'warn' || e.st === 'dart' || e.tense) return [1, 3];
    if (e.st === 'tired') return [0, 6];
    return [0, 0];
  };
  // 용 연 대장 (가운데 뒤 언덕 위)
  if (d.boss) {
    const [pz, md] = kidPose(4);
    drawKid(ctx, X(KIDS[4].x), Y(midRidge(0.86)) + 1, R(0.12), 4, pz, t, X(KIDS[4].x) - R(0.02), Y(KIDS[4].y), md);
  }
  hill(hillL, -0.02, 0.62, '#89ad5a', '#3d5f36');
  hill(hillR, 0.38, 1.02, '#86aa58', '#3a5a34');
  const sp4 = [0, 1, 2, 3];
  for (const k of sp4) {
    const fy = k === 0 || k === 1 ? hillL(KIDS[k].x) : hillR(KIDS[k].x), [pz, md] = kidPose(k);
    drawKid(ctx, X(KIDS[k].x), Y(fy) + 1, R(0.1), k, pz, t, X(KIDS[k].x), Y(KIDS[k].y), md);
  }
  // 가운데 언덕 (나)
  hill(hillC, 0.12, 0.88, '#9cc062', '#46703a');
  ctx.fillStyle = '#ffe9a0';
  for (let k = 0; k < 14; k++) {
    const fx0 = 0.2 + hsh(k + 80) * 0.6, fy0 = hillC(fx0) + 0.015 + hsh(k + 90) * 0.08;
    if (fy0 > 1.355) continue;
    ctx.fillStyle = k % 3 ? '#ffe9a0' : '#ff9ec4';
    ctx.beginPath();
    ctx.arc(X(fx0), Y(fy0), 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // 바람 깃발
  {
    const px0 = X(0.41), py0 = Y(hillC(0.41));
    ctx.strokeStyle = '#6a4424';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.lineTo(px0, py0 - R(0.07));
    ctx.stroke();
    const wd = s.wind >= 0 ? 1 : -1, ln = R(0.035 + Math.abs(s.wind) * 0.02);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(px0, py0 - R(0.07));
    ctx.quadraticCurveTo(px0 + wd * ln * 0.5, py0 - R(0.07) + Math.sin(t * 0.3) * 3, px0 + wd * ln, py0 - R(0.06));
    ctx.lineTo(px0, py0 - R(0.05));
    ctx.fill();
  }
  // 구경꾼: 오리(왼쪽) · 고슴도치(오른쪽)
  const recentCut = s.t - s.lastCutT < 70, danger = s.phase === 'play' && (s.hp < 0.35 || s.kites.some((e) => e.st === 'warn'));
  {
    const jx = X(0.33), jy = Y(hillC(0.33)) + 1, sz = R(0.066), jmp = recentCut ? -Math.abs(Math.sin(t * 0.3)) * sz * 0.5 : 0;
    ctx.fillStyle = 'rgba(30,20,40,.3)';
    ctx.beginPath();
    ctx.ellipse(jx, jy, sz * 0.5, sz * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(jx, jy + jmp);
    ctx.fillStyle = '#ffd84a';
    ctx.strokeStyle = '#7a5208';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, -sz * 0.35, sz * 0.45, sz * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sz * 0.18, -sz * 0.85, sz * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff9a2e';
    ctx.beginPath();
    ctx.ellipse(sz * 0.48, -sz * 0.8, sz * 0.14, sz * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    if (danger && !recentCut) {
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.ellipse(sz * 0.2, -sz * 0.9, sz * 0.2, sz * 0.12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else face(ctx, sz * 0.18, -sz * 0.9, sz * 0.45, recentCut ? 1 : 0, t, 1, false);
    ctx.strokeStyle = '#7a5208';
    ctx.beginPath();
    const wa = recentCut ? -0.9 + Math.sin(t * 0.5) * 0.4 : 0.3;
    ctx.ellipse(-sz * 0.3, -sz * 0.4, sz * 0.22, sz * 0.1, wa, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  {
    const jx = X(0.67), jy = Y(hillC(0.67)) + 1, sz = R(0.066), jmp = recentCut ? -Math.abs(Math.sin(t * 0.3 + 1)) * sz * 0.4 : 0;
    ctx.fillStyle = 'rgba(30,20,40,.3)';
    ctx.beginPath();
    ctx.ellipse(jx, jy, sz * 0.55, sz * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(jx, jy + jmp);
    ctx.fillStyle = '#7a5434';
    ctx.beginPath();
    for (let k = 0; k <= 9; k++) {
      const a = Math.PI + (k / 9) * Math.PI, rr = k % 2 ? sz * 0.5 : sz * 0.66;
      k ? ctx.lineTo(Math.cos(a) * rr, -sz * 0.05 + Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, -sz * 0.05 + Math.sin(a) * rr);
    }
    ctx.fill();
    ctx.fillStyle = '#f2d2a6';
    ctx.strokeStyle = '#5a3a20';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-sz * 0.25, -sz * 0.25, sz * 0.25, sz * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a1830';
    ctx.beginPath();
    ctx.arc(-sz * 0.48, -sz * 0.22, sz * 0.05, 0, Math.PI * 2);
    ctx.fill();
    if (danger && !recentCut) {
      ctx.fillStyle = '#f2d2a6';
      ctx.beginPath();
      ctx.arc(-sz * 0.22, -sz * 0.3, sz * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else face(ctx, -sz * 0.25, -sz * 0.3, sz * 0.38, recentCut ? 1 : 0, t, -1, false);
    ctx.restore();
  }
  // 내 곰돌이
  {
    const snapped = s.phase === 'result' && !s.ok;
    const pose = snapped ? 3 : s.phase === 'result' && s.ok ? 2 : recentCut ? 2 : 1;
    const mood = snapped ? 4 : s.t - s.hurtT < 20 ? 2 : recentCut ? 1 : Math.hypot(s.kvx, s.kvy) > VMAX * 0.7 ? 5 : s.hp < 0.35 ? 6 : 0;
    drawKid(ctx, X(HX), Y(hillC(0.5)) + 1, R(0.118), 5, pose, t, X(HX), Y(HY), mood);
  }
  // ═════════════ 줄 ═════════════
  const lineOf = (L: Line, k0 = 0, k1 = L.x.length - 1) => {
    const xs: number[] = [], ys: number[] = [];
    for (let i = k0; i <= k1; i++) xs.push(X(L.x[i])), ys.push(Y(L.y[i]));
    return [xs, ys];
  };
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.35);
  for (const e of s.kites) {
    const P = PALS[e.pal];
    for (const L of e.lines) {
      if (L.cut) {
        // 끊긴 아래 토막: 손에서 축 처져 떨어진다
        const age = s.t - L.cutT, a = Math.max(0, 1 - age / 100);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.strokeStyle = P.line;
        ctx.lineWidth = 1.4;
        const ex = X(L.cx), ey = Y(L.cy + Math.min(0.25, age * 0.004)), ax = X(L.ax), ay = Y(L.ay);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo((ax + ex) / 2, Math.max(ay, ey) + R(0.06), ex, ey);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      if (!live(e)) continue;
      const [xs, ys] = lineOf(L);
      const preTense = canYank(e) && !e.tense && e.st === 'fly' && e.tenseT < 36;
      if (e.tense) {
        ctx.strokeStyle = `rgba(255,70,70,${0.25 + 0.2 * pulse})`;
        ctx.lineWidth = 5;
        smooth(ctx, xs, ys);
        ctx.stroke();
      }
      if (e.kind === 'glass') {
        const k1 = Math.round(EN * GLASS_TOP);
        const [gx, gy] = lineOf(L, 0, k1);
        ctx.strokeStyle = 'rgba(150,240,255,.45)';
        ctx.lineWidth = 5;
        smooth(ctx, gx, gy);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 6; k++) {
          const f = ((t * 0.01 + k / 6) % 1) * GLASS_TOP * EN, i = Math.floor(f), u = f - i;
          const px = X(L.x[i] + (L.x[i + 1] - L.x[i]) * u), py = Y(L.y[i] + (L.y[i + 1] - L.y[i]) * u);
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.3 + k);
          starPath(ctx, px, py, 2.6);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = e.tense ? '#ff5a4f' : preTense && t % 10 < 5 ? '#ff9a8a' : P.line;
      ctx.lineWidth = e.tense ? 2 : 1.6;
      smooth(ctx, xs, ys);
      ctx.stroke();
    }
  }
  // 내 줄
  const snapped = s.phase === 'result' && !s.ok;
  {
    const M = s.my;
    if (snapped) {
      const age = s.t - s.snapT, a = Math.max(0, 1 - age / 120);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#fff3d6';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(X(HX), Y(HY));
      ctx.quadraticCurveTo(X((HX + s.snapX) / 2), Y(Math.max(HY, s.snapY) + 0.05), X(s.snapX), Y(s.snapY + Math.min(0.3, age * 0.004)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      const [xs, ys] = lineOf(M);
      const sp = Math.hypot(s.kvx, s.kvy);
      if (sp > 0.008) {
        ctx.strokeStyle = `rgba(255,240,200,${Math.min(0.3, sp * 12)})`;
        ctx.lineWidth = 1.4;
        const pxs = M.px.map((v) => X(v)), pys = M.py.map((v) => Y(v));
        for (let i = 0; i < pxs.length; i++) (pxs[i] += (pxs[i] - xs[i]) * 2.5), (pys[i] += (pys[i] - ys[i]) * 2.5);
        smooth(ctx, pxs, pys);
        ctx.stroke();
      }
      const hurtNow = s.t - s.hurtT < 8;
      ctx.strokeStyle = hurtNow ? 'rgba(255,80,80,.55)' : 'rgba(255,236,190,.35)';
      ctx.lineWidth = 4.5;
      smooth(ctx, xs, ys);
      ctx.stroke();
      ctx.strokeStyle = hurtNow ? '#ffb0a0' : '#fff8e6';
      ctx.lineWidth = 1.9;
      if (s.hp < 0.35 && t % 20 < 10) ctx.setLineDash([6, 3]);
      smooth(ctx, xs, ys);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // 엇갈린 자리 표시: 금빛 고리(내가 벤다, 차오름) · 빨강(내가 닳는다) · 흰 고리(그냥 엇갈림)
  if (s.phase === 'play')
    for (const e of s.kites) {
      if (!live(e)) continue;
      for (const L of e.lines) {
        if (L.cut || L.touch <= 0) continue;
        const px = X(L.mx), py = Y(L.my);
        if (L.adv < 0) {
          ctx.strokeStyle = '#ff4a3a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(px, py, R(0.026) + pulse * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(px - 5, py - 5);
          ctx.lineTo(px + 5, py + 5);
          ctx.moveTo(px + 5, py - 5);
          ctx.lineTo(px - 5, py + 5);
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, R(0.022), 0, Math.PI * 2);
          ctx.stroke();
          if (L.saw > 0.02) {
            ctx.strokeStyle = '#ffd23f';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(px, py, R(0.022), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, L.saw));
            ctx.stroke();
          }
          if (canYank(e) && !e.tense && L.touch > 8) {
            // 머뭇거리면 홱 당긴다 — 남은 시간 고리
            ctx.strokeStyle = 'rgba(255,90,80,.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, R(0.034), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, L.touch / YANK_AT));
            ctx.stroke();
          }
        }
      }
    }
  // ═════════════ 상대 연 ═════════════
  for (const e of s.kites) {
    const P = PALS[e.pal], r = R(e.kind === 'twin' ? 0.046 : e.kind === 'dragon' ? 0.064 : 0.05);
    const falling = e.st === 'fall';
    const mood = falling ? 4 : e.tumble > 0 ? 2 : e.st === 'tired' ? 6 : e.st === 'warn' || e.st === 'dart' || e.tense || e.kind === 'dart' ? 3 : 0;
    const shake = e.st === 'warn' ? Math.sin(t * 1.7) * R(0.006) : 0;
    const kx = X(e.x) + shake, ky = Y(e.y);
    // 달려들기 예고: 빨간 점선 화살표
    if (e.st === 'warn' && s.phase === 'play') {
      ctx.strokeStyle = `rgba(255,70,60,${0.5 + 0.4 * pulse})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -t * 0.8;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(X(e.d1x), Y(e.d1y));
      ctx.stroke();
      ctx.setLineDash([]);
      const an = Math.atan2(e.d1y - e.y, e.d1x - e.x);
      ctx.fillStyle = '#ff4a3a';
      ctx.beginPath();
      ctx.moveTo(X(e.d1x) + Math.cos(an) * 9, Y(e.d1y) + Math.sin(an) * 9);
      ctx.lineTo(X(e.d1x) + Math.cos(an + 2.5) * 9, Y(e.d1y) + Math.sin(an + 2.5) * 9);
      ctx.lineTo(X(e.d1x) + Math.cos(an - 2.5) * 9, Y(e.d1y) + Math.sin(an - 2.5) * 9);
      ctx.fill();
    }
    if (e.st === 'dart') {
      ctx.strokeStyle = 'rgba(255,220,200,.5)';
      ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(kx - e.vx * w * 6 + k * 6, ky - e.vy * w * 6 + k * 4);
        ctx.lineTo(kx - e.vx * w * 14 + k * 6, ky - e.vy * w * 14 + k * 4);
        ctx.stroke();
      }
    }
    if (falling) {
      // 위 토막: 연에 매달려 하늘하늘
      ctx.strokeStyle = P.line;
      ctx.lineWidth = 1.3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(kx, ky + r * 0.6);
      for (let k = 1; k <= 6; k++) ctx.lineTo(kx + Math.sin(t * 0.2 + k) * r * 0.25 * k * 0.3 - e.vx * w * k * 2, ky + r * 0.6 + k * r * 0.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const tdx = -e.vx * 40 + s.wind * -0.3, tdy = 1;
    const tl = Math.hypot(tdx, tdy);
    if (e.kind === 'dragon' && e.guard > 0 && live(e)) {
      ctx.fillStyle = `rgba(255,220,90,${0.18 + 0.15 * pulse})`;
      ctx.beginPath();
      ctx.arc(kx, ky, r * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.kind === 'dragon') drawDragon(ctx, e, X, Y, r, t, mood);
    else drawRay(ctx, e, kx, ky, r, t, mood, tdx / tl, tdy / tl);
    if (e.st === 'warn' && s.phase === 'play') {
      const bx = kx, by = ky - r * 2.1;
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(bx, by, R(0.026), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      font(0.038, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', bx, by + 1);
    }
    if (e.kind === 'dragon' && live(e)) {
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k < e.hp ? '#ff4a3a' : 'rgba(255,255,255,.25)';
        heartPath(ctx, kx - R(0.03) + k * R(0.03), ky - r * 2.2, R(0.011));
        ctx.fill();
      }
    }
    // NEW 스포트라이트
    if (s.spot && s.spot.id === e.id && s.t - s.spot.t < SPOT_T && live(e)) {
      const age = s.t - s.spot.t;
      ctx.strokeStyle = `rgba(255,226,90,${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(kx, ky, r * 2 + Math.max(0, 20 - age) * 2, 0, Math.PI * 2);
      ctx.stroke();
      font(0.036, 900);
      const tx = `NEW ${s.spot.text}`, tw = ctx.measureText(tx).width + 14, by = ky + r * 2.2 + 12;
      ctx.fillStyle = 'rgba(40,20,60,.85)';
      ctx.beginPath();
      ctx.roundRect(kx - tw / 2, by - 10, tw, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#ffe25a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tx, kx, by + 1);
    }
  }
  // 새 떼 (+ 오는 쪽 느낌표)
  for (const f of s.flocks) {
    if (f.warn > 0) {
      const ex = f.dir > 0 ? R(0.05) : w - R(0.05), ey = Y(f.y);
      ctx.globalAlpha = 0.6 + 0.4 * pulse;
      ctx.fillStyle = '#ff9f2e';
      ctx.beginPath();
      ctx.arc(ex, ey, R(0.032), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', ex, ey + 1);
      ctx.strokeStyle = 'rgba(255,190,110,.6)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(ex + f.dir * R(0.05), ey);
      ctx.lineTo(ex + f.dir * R(0.45), ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      continue;
    }
    for (let b = 0; b < 5; b++) drawBird(ctx, X(birdX(f, b)), Y(birdY(f, b)), R(0.022), f.dir, t, b + f.id);
  }
  // ═════════════ 내 연 ═════════════
  {
    const kx = X(s.kx), ky = Y(s.ky) + (s.down ? 0 : Math.sin(t * 0.07) * 1.5), r = R(0.058);
    const mood = snapped ? 4 : s.tumble > 0 ? 4 : s.t - s.hurtT < 16 ? 2 : s.t - s.lastCutT < 45 ? 1 : Math.hypot(s.kvx, s.kvy) > VMAX * 0.75 ? 5 : 0;
    const tdx = -s.kvx * 40 - s.wind * 0.3, tdy = 1, tl = Math.hypot(tdx, tdy);
    // 손가락 겨눔 (누르는 동안)
    if (s.down && !snapped) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(s.tx), Y(s.ty), R(0.03) + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawShield(ctx, kx, ky, r, s.rot, mood, t, tdx / tl, tdy / tl, Math.max(0, 1 - (s.t - s.lastCutT) / 40));
  }
  // ═════════════ 사건 연출 ═════════════
  const seenT = fx.memo.t ?? -1;
  for (const ev0 of s.events) {
    if (ev0.t <= seenT) continue;
    const x = X(ev0.x), y = Y(ev0.y), c = ev0.n;
    const P = ev0.col && ev0.col in { drift: 1, dart: 1, glass: 1, twin: 1, dragon: 1 } ? null : null;
    void P;
    if (ev0.kind === 'cut') {
      const big = Math.min(4, c), col = ev0.col === 'glass' ? '#9ff0ff' : ev0.col === 'dragon' ? '#ffd34d' : '#ffe9a8';
      fx.burst(x, y, '#ffffff', 14 + big * 6, 3.4 + big, 2.4);
      fx.burst(x, y, col, 12 + big * 4, 2.6 + big * 0.6, 2.8);
      fx.ring(x, y, '#fff6c8', R(0.08 + 0.035 * big), 4 + big);
      fx.kick(4 + big * 2.5);
      fx.pop(x, y - R(0.06), ev0.text ?? '팅!', '#ffffff', 18 + big * 4);
      if (c >= 2) fx.pop(w / 2, Y(0.62), `${c}개 한 번에!`, '#ffe25a', 24 + big * 4), fx.blink('#fff1c4', 0.16 + 0.05 * big);
      if (ev0.col === 'dragon') fx.blink('#ffd34d', 0.3), fx.kick(14), fx.burst(x, y, '#ff5a3a', 40, 6, 3.2);
      for (let k = 0; k < 10 + big * 3; k++) {
        const a = hsh(t + k) * Math.PI * 2, v = 1.5 + hsh(t * 3 + k) * 3;
        cs.fib.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, a: hsh(k + t) * 6, va: (hsh(k * 7 + t) - 0.5) * 0.5, len: 4 + hsh(k + 3 * t) * 7, col: k % 3 ? '#fff6dc' : col, life: 50 });
      }
    }
    if (ev0.kind === 'snip') fx.burst(x, y, '#ffffff', 12, 3, 2), fx.ring(x, y, '#ffffff', R(0.06), 3), fx.kick(3), fx.pop(x, y - R(0.05), '툭! 하나 더!', '#ffe9a8', 15);
    if (ev0.kind === 'notch') fx.burst(x, y, '#ffd34d', 30, 5, 3), fx.burst(x, y, '#ff5a3a', 20, 4, 2.6), fx.ring(x, y, '#ffd34d', R(0.12), 5), fx.kick(9), fx.pop(x, y - R(0.07), `크앙! ${c}/3`, '#ffd34d', 22), fx.blink('#ffb08a', 0.15);
    if (ev0.kind === 'saw') fx.burst(x, y, t % 2 ? '#ffd23f' : '#ff9a3c', 3, 2.2, 1.6);
    if (ev0.kind === 'hurt') fx.burst(x, y, '#ff4a3a', 6, 2.4, 2), fx.kick(2.5), fx.pop(x, y - R(0.04), '긁!', '#ffb0a0', 14);
    if (ev0.kind === 'glass') fx.burst(x, y, '#bff4ff', 5, 2, 1.6), fx.pop(x, y - R(0.04), '사각!', '#bff4ff', 13);
    if (ev0.kind === 'snap') fx.burst(x, y, '#fff3d6', 30, 5, 2.8), fx.ring(x, y, '#ffb0a0', R(0.15), 6), fx.kick(12), fx.blink('#ffd0b0', 0.22), fx.pop(x, y - R(0.06), '툭…', '#ffd0c0', 26);
    if (ev0.kind === 'warn') fx.ring(x, y, '#ff4a3a', R(0.07), 3);
    if (ev0.kind === 'yank') fx.ring(x, y, '#ff7a5a', R(0.06), 3), fx.pop(x, y - R(0.06), '홱!', '#ffb08a', 16);
    if (ev0.kind === 'gust') fx.pop(w / 2, Y(0.22), ev0.text ?? '바람', '#ffffff', 22), fx.kick(2);
    if (ev0.kind === 'bird') fx.burst(x, y, '#ffffff', 16, 3.4, 2.4), fx.burst(x, y, '#b9a2d6', 10, 3, 2.2), fx.kick(6), fx.pop(x, y - R(0.06), '푸드득!', '#ffffff', 18);
    if (ev0.kind === 'ebird') fx.burst(x, y, '#ffffff', 8, 2.6, 2);
    if (ev0.kind === 'clear') {
      for (const [cx, col] of [[0.25, '#ffe25a'], [0.5, '#ff7fb0'], [0.75, '#7fe2ff']] as [number, string][]) fx.burst(X(cx), Y(0.45), col, 34, 6, 3.2);
      fx.ring(w / 2, Y(0.45), '#ffe25a', R(0.5), 7);
      fx.blink('#fff1c4', 0.22);
    }
    if (ev0.kind === 'fail') fx.kick(6);
  }
  fx.memo.t = s.t;
  // 실밥
  ctx.lineCap = 'round';
  for (const f of cs.fib) {
    for (let k = 0; k < dt; k++) (f.x += f.vx), (f.y += f.vy), (f.vx *= 0.95), (f.vy = f.vy * 0.95 + 0.06), (f.a += f.va), f.life--;
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 25));
    ctx.strokeStyle = f.col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(f.x - Math.cos(f.a) * f.len * 0.5, f.y - Math.sin(f.a) * f.len * 0.5);
    ctx.quadraticCurveTo(f.x + Math.sin(f.a) * 2, f.y - Math.cos(f.a) * 2, f.x + Math.cos(f.a) * f.len * 0.5, f.y + Math.sin(f.a) * f.len * 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  cs.fib = cs.fib.filter((f) => f.life > 0);
  if (cs.fib.length > 140) cs.fib.splice(0, cs.fib.length - 140);
  // 첫 판 손가락 안내
  if (s.stage === 0 && s.firstPress < 0 && s.phase === 'play') {
    const p = (t % 100) / 100, q = p < 0.75 ? p / 0.75 : 1;
    const fx0 = X(0.5 + Math.sin(q * Math.PI) * 0.06), fy0 = Y(0.94 - q * 0.62);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.moveTo(X(0.5), Y(0.94));
    ctx.quadraticCurveTo(X(0.6), Y(0.63), X(0.5), Y(0.32));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = p < 0.85 ? 1 : (1 - p) / 0.15;
    drawFinger(ctx, fx0 + R(0.02), fy0 + R(0.02), R(0.075), p < 0.1);
    ctx.globalAlpha = 1;
  }
  // 느려진 순간 테두리 어둡게
  if (s.slow > 0) {
    const vg = ctx.createRadialGradient(w / 2, h * 0.45, R(0.4), w / 2, h * 0.45, R(1.0));
    vg.addColorStop(0, 'rgba(20,8,30,0)');
    vg.addColorStop(1, `rgba(20,8,30,${Math.min(0.45, s.slow / 60)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
  ctx.restore();
  drawHud(ctx, s, w, h, th, font, R, Y);
}

function drawHud(ctx: CanvasRenderingContext2D, s: KiteState, w: number, h: number, th: Theme, font: (sz: number, wgt?: number) => string, R: (r: number) => number, Y: (y: number) => number) {
  const d = STAGES[s.stage], t = s.t;
  ctx.textBaseline = 'middle';
  // ═════════════ 위 띠 ═════════════
  const hb = R(0.1);
  {
    const g = ctx.createLinearGradient(0, 0, 0, hb);
    g.addColorStop(0, 'rgba(26,16,48,.92)');
    g.addColorStop(1, 'rgba(40,24,70,.78)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hb);
    ctx.fillStyle = 'rgba(255,210,140,.35)';
    ctx.fillRect(0, hb - 1.5, w, 1.5);
    // 판 알약
    font(0.04, 900);
    const st = `${s.stage + 1}판`, sw = ctx.measureText(st).width;
    ctx.fillStyle = '#ffd25e';
    ctx.beginPath();
    ctx.roundRect(R(0.025), hb * 0.2, sw + R(0.075), hb * 0.6, hb * 0.3);
    ctx.fill();
    ctx.fillStyle = '#3a1f10';
    ctx.textAlign = 'left';
    ctx.fillText(st, R(0.045), hb * 0.52);
    font(0.034, 800);
    ctx.fillStyle = 'rgba(58,31,16,.7)';
    ctx.fillText(`/${STAGE_COUNT}`, R(0.045) + sw + 1, hb * 0.55);
    // 가운데: 끊은 연 / 목표
    const cx = w / 2;
    if (d.boss) {
      const dr = s.kites.find((e) => e.kind === 'dragon');
      const hp = s.dragonDown ? 0 : dr ? dr.hp : 3;
      font(0.04, 900);
      ctx.fillStyle = '#ffe9c4';
      ctx.textAlign = 'right';
      ctx.fillText('용 연', cx - R(0.01), hb * 0.52);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k < hp ? '#ff5a4f' : 'rgba(255,255,255,.2)';
        heartPath(ctx, cx + R(0.035) + k * R(0.05), hb * 0.52, R(0.017));
        ctx.fill();
      }
    } else {
      // 작은 연 그림
      ctx.save();
      ctx.translate(cx - R(0.1), hb * 0.5);
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath();
      ctx.moveTo(0, -R(0.026));
      ctx.lineTo(R(0.02), 0);
      ctx.lineTo(0, R(0.026));
      ctx.lineTo(-R(0.02), 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      font(0.052, 900);
      ctx.textAlign = 'left';
      const pop = s.t - s.lastCutT < 12 ? 1 + (12 - (s.t - s.lastCutT)) * 0.03 : 1;
      ctx.save();
      ctx.translate(cx - R(0.065), hb * 0.52);
      ctx.scale(pop, pop);
      ctx.fillStyle = s.cuts >= d.goal ? '#ffe25a' : '#ffffff';
      ctx.fillText(`${Math.min(s.cuts, d.goal)}`, 0, 0);
      const cw = ctx.measureText(`${Math.min(s.cuts, d.goal)}`).width;
      font(0.038, 800);
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.fillText(` / ${d.goal}`, cw, R(0.004));
      ctx.restore();
    }
    // 오른쪽: 하트 · 별
    for (let k = 0; k < 3; k++) {
      const hx = w - R(0.2) + k * R(0.055), hy = hb * 0.5;
      heartPath(ctx, hx, hy, R(0.019));
      ctx.fillStyle = k < s.hearts ? '#ff4f6a' : 'rgba(255,255,255,.16)';
      ctx.fill();
      if (k < s.hearts) {
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath();
        ctx.arc(hx - R(0.008), hy - R(0.008), R(0.005), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    starPath(ctx, w - R(0.3), hb * 0.5, R(0.02));
    ctx.fillStyle = '#ffd25e';
    ctx.fill();
    font(0.038, 900);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe9c4';
    ctx.fillText(`${s.stars}`, w - R(0.275), hb * 0.53);
  }
  // ═════════════ 아래 띠: 내 줄 · ★ · 안내 ═════════════
  {
    const ty = Y(1.36), g = ctx.createLinearGradient(0, ty, 0, h);
    g.addColorStop(0, 'rgba(44,26,74,.95)');
    g.addColorStop(1, 'rgba(24,14,44,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, ty, w, h - ty + 4, [R(0.035), R(0.035), 0, 0]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,210,140,.3)';
    ctx.fillRect(R(0.035), ty, w - R(0.07), 1.2);
    // 내 줄 막대 (얼레 그림 + 실 모양)
    const r1 = ty + R(0.042), bx0 = R(0.2), bx1 = w - R(0.13), bh = R(0.026);
    ctx.save();
    ctx.translate(R(0.05), r1);
    ctx.fillStyle = '#c4874a';
    ctx.beginPath();
    ctx.roundRect(-R(0.022), -R(0.018), R(0.044), R(0.036), 3);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(-R(0.012), -R(0.015), R(0.024), R(0.03));
    ctx.strokeStyle = '#6a4424';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-R(0.022), -R(0.018), R(0.044), R(0.036));
    ctx.restore();
    font(0.036, 900);
    ctx.textAlign = 'left';
    const low = s.hp < 0.35 && s.phase === 'play';
    ctx.fillStyle = low && t % 20 < 10 ? '#ff8a7a' : '#ffe9c4';
    ctx.fillText('내 줄', R(0.085), r1 + 1);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.roundRect(bx0, r1 - bh / 2, bx1 - bx0, bh, bh / 2);
    ctx.fill();
    const fw = (bx1 - bx0) * clamp(s.hp, 0, 1);
    if (fw > 1) {
      const bg = ctx.createLinearGradient(0, r1 - bh / 2, 0, r1 + bh / 2);
      bg.addColorStop(0, low ? '#ff9a8a' : '#fff6dc');
      bg.addColorStop(1, low ? '#d8392f' : '#e8c48a');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(bx0, r1 - bh / 2, fw, bh, bh / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,110,60,.45)';
      ctx.lineWidth = 1;
      for (let x = bx0 + 4; x < bx0 + fw - 2; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, r1 + bh / 2 - 2);
        ctx.lineTo(x + 4, r1 - bh / 2 + 2);
        ctx.stroke();
      }
    }
    if (s.t - s.hurtT < 10) {
      ctx.strokeStyle = '#ff4a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx0 - 1, r1 - bh / 2 - 1, bx1 - bx0 + 2, bh + 2, bh / 2 + 1);
      ctx.stroke();
    }
    // 반 표시 ★
    const hx = (bx0 + bx1) / 2;
    ctx.strokeStyle = 'rgba(255,226,90,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, r1 - bh / 2 - 2);
    ctx.lineTo(hx, r1 + bh / 2 + 2);
    ctx.stroke();
    starPath(ctx, bx1 + R(0.05), r1, R(0.022));
    ctx.fillStyle = s.hp > 0.5 ? '#ffd25e' : 'rgba(255,255,255,.2)';
    ctx.fill();
    starPath(ctx, hx, r1 - bh / 2 - R(0.012), R(0.012));
    ctx.fillStyle = '#ffd25e';
    ctx.fill();
    // ★3 알약
    const r2 = ty + R(0.1), st3 = s.phase === 'result' && s.ok ? (s.starOk[2] ? 1 : -1) : star3Now(s);
    font(0.037, 900);
    const txt = d.s3, tw = Math.min(w - R(0.1), ctx.measureText(txt).width + R(0.11));
    const px0 = w / 2 - tw / 2;
    ctx.fillStyle = st3 > 0 ? 'rgba(255,210,94,.22)' : st3 < 0 ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.roundRect(px0, r2 - R(0.027), tw, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = st3 > 0 ? '#ffd25e' : st3 < 0 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    starPath(ctx, px0 + R(0.035), r2, R(0.017));
    ctx.fillStyle = st3 > 0 ? '#ffd25e' : 'rgba(255,255,255,.4)';
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = st3 > 0 ? '#fff3c8' : st3 < 0 ? 'rgba(255,255,255,.45)' : '#f2e6ff';
    ctx.fillText(txt, px0 + R(0.065), r2 + 1, tw - R(0.08));
    if (st3 < 0) {
      ctx.strokeStyle = 'rgba(255,140,130,.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px0 + R(0.06), r2);
      ctx.lineTo(px0 + tw - R(0.02), r2);
      ctx.stroke();
    }
    if (d.star3 === 'doubles' && st3 === 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffe25a';
      ctx.fillText(`${s.doubles}/${DOUBLES}`, px0 + tw + R(0.08), r2 + 1);
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && s.firstPress < 0;
    if (first) hint = '꾹 누르고 위로 휙! 줄이 엇갈리면 팅';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '하늘의 연싸움 대장!' : '다음 판엔 새것이 나와요') : s.hearts > 0 ? '같은 판 다시! 빨강 줄은 피해요' : '오늘 연싸움은 여기까지';
    else if (s.kites.some((e) => live(e) && e.lines.some((L) => !L.cut && L.adv < 0))) hint = '빨강 줄에 닿았어요 — 얼른 비켜요!';
    font(first ? 0.04 : 0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe2a8';
    ctx.fillText(hint, w / 2, ty + R(0.158), w - R(0.05));
  }
  // ═════════════ 판 카드 · 결과 ═════════════
  {
    let lines: [string, string, number][] = [], age = 0, a = 1, col = '#ffe25a', stars = false;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) {
        lines = [[s.won ? '모든 판 끝!' : `${s.stage + 1}판 끝!`, '#ffe25a', 0.06]];
        stars = true;
      } else {
        lines = [['툭… 내 줄이 끊겼어요', '#ffb3a8', 0.05], [s.hearts > 0 ? '하트 하나 쓰고 같은 판 다시' : '끝 — 그래도 멋진 연싸움!', '#ffe9d6', 0.038]];
        col = '#ffb3a8';
      }
    } else if (s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      lines = [[`${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`, '#ffffff', 0.048]];
      if (d.news) lines.push([`NEW  ${d.news}`, '#ffe25a', 0.037]);
      lines.push([d.boss ? '★ 용 연 떨어뜨리기 · ★ 내 줄 반 넘게' : `★ 연 ${d.goal}개 끊기 · ★ 내 줄 반 넘게`, '#f2e6ff', 0.036], [`★ ${d.s3}`, '#ffd25e', 0.036]);
    }
    if (lines.length) {
      const sc = Math.min(1, 0.6 + age / 10), lh = R(0.056), ch = lines.length * lh + (stars ? R(0.105) : 0) + R(0.025), cy = s.phase === 'result' ? Y(0.36) : R(0.11) + ch / 2;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(30,16,52,.9)';
      ctx.beginPath();
      ctx.roundRect(-R(0.45), -ch / 2, R(0.9), ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      let yy = -ch / 2 + R(0.015) + lh / 2;
      for (const [tx, c2, sz] of lines) {
        font(sz, 900);
        ctx.fillStyle = c2;
        if (tx.startsWith('NEW')) {
          const body = tx.slice(5), bw = ctx.measureText(body).width, nw = R(0.1), tot = Math.min(R(0.86), bw + nw + 6), x0 = -tot / 2;
          ctx.fillStyle = '#ff5a4f';
          ctx.beginPath();
          ctx.roundRect(x0, yy - R(0.02), nw, R(0.04), R(0.02));
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          font(0.03, 900);
          ctx.fillText('NEW', x0 + nw / 2, yy + 1);
          font(sz, 900);
          ctx.fillStyle = c2;
          ctx.textAlign = 'left';
          ctx.fillText(body, x0 + nw + 6, yy + 1, R(0.86) - nw - 6);
          ctx.textAlign = 'center';
        } else ctx.fillText(tx, 0, yy + 1, R(0.84));
        yy += lh;
      }
      if (stars) {
        const lab = [d.boss ? '용 연' : `${d.goal}개`, '줄 반', d.s3.length > 9 ? d.s3.slice(0, 9) + '…' : d.s3];
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (14 + k * 12);
          const sx = (k - 1) * R(0.27), sy = yy - lh / 2 + R(0.035);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          if (pop > 0) {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.scale(pop, pop);
            starPath(ctx, 0, 0, R(0.03));
            ctx.fillStyle = s.starOk[k] ? '#ffd25e' : 'rgba(255,255,255,.14)';
            ctx.fill();
            ctx.strokeStyle = s.starOk[k] ? '#fff3b0' : 'rgba(255,255,255,.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          }
          font(0.03, 800);
          ctx.fillStyle = s.starOk[k] ? '#fff3c8' : 'rgba(255,255,255,.45)';
          ctx.fillText(lab[k], sx, sy + R(0.045));
        }
      }
      ctx.restore();
    }
  }
  void th;
}
