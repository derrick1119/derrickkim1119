/**
 * ↔️ 크기 바꾸기 (38라운드 — 오너가 고른 아이디어) — 크기 바꾸기 × 가리키기 × 도감.
 * 손짓은 '톡 → 톡' 하나: 무엇이든(동물·과일·바위·우리 문·쥐구멍·사육사·모자·연못·나뭇가지…) 하나를 톡 하면 반짝 들리고,
 *   다른 하나를 톡 하면 두 물건 사이로 빛줄기가 오가며 '뿅!' — 두 크기가 서로 바뀐다(개미만 한 코끼리, 집채만 한 생쥐).
 * 크기를 따라 힘·무게·속도가 바뀐다(결정적 1/60 시뮬): 작으면 구멍·굴로 쏙, 크면 무거운 문을 쾅 밀고 연못을 첨벙첨벙 건넌다.
 *   사육사는 자기보다 작은 동물을 잡고, 더 큰 동물을 보면 '으악!' 도망간다. 커진 사과·수박은 비탈을 데굴데굴 굴러
 *   사육사를 쓰러뜨리거나 연못에 풍덩 징검다리가 되고, 커진 나뭇가지는 통나무 다리, 커진 모자는 사육사를 폭 덮는다.
 * 판 15개(장 셋: 아기 동물 마을 → 큰 동물 숲 → 정문 광장) · 정해진 동물을 모두 출구로. 바꾸기 적을수록 별.
 *   탈출한 동물은 도감(사진·이름·특기)에 채워지고 출구 밖 언덕에 모인다. 다음에 풀릴 친구는 실루엣으로 미리 보인다.
 * 실패: 사육사에게 잡히거나, '뿅'을 다 쓰고 막히면 하트 -1(그 판 다시). 하트 셋을 다 잃으면 끝.
 *   아무것도 안 누르면 동물은 막힌 곳에서 낑낑댈 뿐 — 잃는 것 없음(처음 놓인 판은 늘 안전).
 */
import { mulberry32 } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const TK = 1 / 60;
/** 크기 1~5의 반지름(가로 폭 단위): 콩알 · 작음 · 보통 · 큼 · 집채 */
const RZ = [0, 0.03, 0.046, 0.066, 0.09, 0.122];
const SIZE_WORD = ['', '콩알만 한', '조그만', '보통', '커다란', '집채만 한'];

// ───────────────────────────── 물건 ─────────────────────────────
type Cls = 'animal' | 'hole' | 'gate' | 'keeper' | 'hat' | 'pond' | 'log' | 'iron' | 'roller' | 'prop';
type Kind =
  | 'elephant' | 'rabbit' | 'mouse' | 'piglet' | 'hippo' | 'giraffe' | 'turtle' | 'panda' | 'kangaroo' | 'penguin' | 'lion'
  | 'hole' | 'gate' | 'keeper' | 'hat' | 'pond' | 'log' | 'iron'
  | 'apple' | 'melon' | 'boulder'
  | 'acorn' | 'pumpkin' | 'bucket' | 'hay' | 'coconut' | 'rock' | 'puddle' | 'popcorn' | 'statue' | 'icecream' | 'drum';
interface KD { name: string; c: Cls; swim?: boolean; tall?: number; hop?: boolean; say?: string; skill?: string }
const K: Record<Kind, KD> = {
  elephant: { name: '코끼리', c: 'animal', say: '뿌우!', skill: '작아지면 쥐구멍으로 쏙!' },
  rabbit: { name: '토끼', c: 'animal', say: '깡총!', skill: '커지면 무거운 문도 쾅!' },
  mouse: { name: '생쥐', c: 'animal', say: '찍!', skill: '원래는 콩알만 해요' },
  piglet: { name: '아기 돼지', c: 'animal', say: '꿀꿀!', skill: '사육사 아저씨를 제일 무서워해요' },
  hippo: { name: '아기 하마', c: 'animal', say: '하암~', skill: '크기를 잠깐 맡겼다 돌려받아요' },
  giraffe: { name: '기린', c: 'animal', tall: 2, say: '음메?', skill: '목이 길어 키가 크기보다 둘 더 커요' },
  turtle: { name: '거북', c: 'animal', swim: true, say: '느릿~', skill: '연못을 헤엄쳐 건너요' },
  panda: { name: '판다', c: 'animal', say: '냠냠', skill: '키가 연못보다 크면 첨벙첨벙 건너요' },
  kangaroo: { name: '캥거루', c: 'animal', hop: true, say: '뿅뿅!', skill: '자기보다 작은 문·사육사·연못은 깡충 뛰어넘어요' },
  penguin: { name: '펭귄', c: 'animal', swim: true, say: '꽥!', skill: '연못을 헤엄쳐 건너요' },
  lion: { name: '사자', c: 'animal', say: '어흥!', skill: '정문을 연 마지막 주인공' },
  hole: { name: '쥐구멍', c: 'hole' },
  gate: { name: '우리 문', c: 'gate' },
  keeper: { name: '사육사', c: 'keeper' },
  hat: { name: '사육사 모자', c: 'hat' },
  pond: { name: '연못', c: 'pond' },
  log: { name: '나뭇가지', c: 'log' },
  iron: { name: '쇠창살 정문', c: 'iron' },
  apple: { name: '사과', c: 'roller' },
  melon: { name: '수박', c: 'roller' },
  boulder: { name: '바위', c: 'roller' },
  acorn: { name: '도토리', c: 'prop' },
  pumpkin: { name: '호박', c: 'prop' },
  bucket: { name: '양동이', c: 'prop' },
  hay: { name: '건초', c: 'prop' },
  coconut: { name: '코코넛', c: 'prop' },
  rock: { name: '바위', c: 'prop' },
  puddle: { name: '물웅덩이', c: 'prop' },
  popcorn: { name: '팝콘', c: 'prop' },
  statue: { name: '동상', c: 'prop' },
  icecream: { name: '아이스크림', c: 'prop' },
  drum: { name: '북', c: 'prop' },
};
/** 장마다 구멍의 생김새: 벽돌 쥐구멍 · 바위 굴 · 개찰구 */
const HOLE_NAME = ['쥐구멍', '바위 굴', '개찰구'];
/** 도감에 오르는 동물 (판을 깨면 그 판에서 탈출한 동물이 채워진다) */
const DEX: Kind[] = ['elephant', 'rabbit', 'piglet', 'mouse', 'hippo', 'giraffe', 'turtle', 'panda', 'penguin', 'kangaroo', 'lion'];

// ───────────────────────────── 판 ─────────────────────────────
/** 옆에서 본 길(산책로) — 동물은 왼쪽 우리에서 오른쪽 출구로 걷는다. y는 가로 폭 단위 */
const GY = 0.9;
type P2 = [number, number];
interface TD { k: Kind; z: number; x: number; y: number; walk?: boolean; trk?: P2[]; ref?: number }
/** 소품(길 밖 아무 데나) */
const T = (k: Kind, z: number, x: number, y: number, o: Partial<TD> = {}): TD => ({ k, z, x, y, ...o });
/** 길 위의 장애물 */
const O = (k: Kind, z: number, x: number, o: Partial<TD> = {}): TD => ({ k, z, x, y: GY, ...o });
/** 탈출할 동물 (앞에 선 것부터) */
const W = (k: Kind, z: number): TD => ({ k, z, x: 0, y: GY, walk: true });
interface StageDef {
  name: string; ch: number; news: string; hint: string; par: number; things: TD[];
  /** NEW 스포트라이트를 비출 물건 번호 */
  spot?: number;
  /** 1판: 처음부터 반짝 골라져 있는 물건(첫 톡 한 번에 '뿅') */
  pre?: number;
}
const PATH: P2[] = [[-0.06, GY], [1.1, GY]];
export const CHAPTERS = ['아기 동물 마을', '큰 동물 숲', '정문 광장'];

export const STAGES: StageDef[] = [
  // ── 1장 아기 동물 마을 ──
  {
    name: '쥐구멍', ch: 0, news: '', hint: '반짝이는 코끼리 — 생쥐를 톡!', par: 1, pre: 0,
    things: [W('elephant', 4), O('hole', 1, 0.56), T('mouse', 1, 0.78, 0.7), T('acorn', 1, 0.3, 1.14)],
  },
  {
    name: '무거운 문', ch: 0, news: '우리 문 — 크면 힘이 세져서 쾅 밀어 열어요', hint: '토끼 톡 → 호박 톡', par: 1, spot: 1,
    things: [W('rabbit', 2), O('gate', 4, 0.58), T('pumpkin', 4, 0.3, 0.64), T('acorn', 1, 0.8, 1.14), T('bucket', 2, 0.84, 0.66)],
  },
  {
    name: '구멍과 문', ch: 0, news: '무엇이든 바꿀 수 있어요 — 구멍도, 문도!', hint: '두 마리 모두 지나가려면?', par: 1,
    things: [W('mouse', 1), W('piglet', 3), O('hole', 1, 0.45), O('gate', 3, 0.77), T('hay', 2, 0.62, 0.64), T('acorn', 1, 0.25, 1.14)],
  },
  {
    name: '사육사 아저씨', ch: 0, news: '사육사 — 자기보다 작은 동물은 잡고, 큰 동물을 보면 도망가요', hint: '사육사도 크기를 바꿀 수 있어요', par: 1, spot: 2,
    things: [W('piglet', 2), O('hole', 1, 0.45), O('keeper', 3, 0.78), T('acorn', 1, 0.3, 1.14), T('pumpkin', 4, 0.62, 0.62)],
  },
  {
    name: '데굴데굴 사과', ch: 0, news: '사과 — 커지면 무거워서 비탈을 데굴데굴 굴러가요', hint: '굴러간 사과가 사육사를 쾅!', par: 1, spot: 5,
    things: [
      W('mouse', 1), W('rabbit', 2), O('gate', 3, 0.4), O('keeper', 3, 0.64), O('hole', 2, 0.87),
      T('apple', 1, 0.86, 0.46, { trk: [[0.86, 0.46], [0.79, 0.58], [0.69, 0.75], [0.64, GY], [0.58, 1.06], [0.47, 1.2]] }),
      T('pumpkin', 4, 0.22, 0.64),
    ],
  },
  // ── 2장 큰 동물 숲 ──
  {
    name: '목이 걸려요', ch: 1, news: '기린 — 목이 길어 키가 크기보다 둘 더 커요. 낮은 굴에 걸려요', hint: '굴도 크기를 바꿀 수 있어요', par: 1, spot: 0,
    things: [W('giraffe', 3), O('hole', 2, 0.48), O('gate', 3, 0.79), T('rock', 5, 0.3, 0.62), T('coconut', 1, 0.84, 1.14)],
  },
  {
    name: '첨벙첨벙 연못', ch: 1, news: '연못 — 키가 연못보다 크면 첨벙첨벙 건너요. 거북은 헤엄쳐요', hint: '한 번에 두 가지가 바뀌어요', par: 1, spot: 3,
    things: [W('turtle', 2), W('panda', 3), O('pond', 3, 0.46), O('gate', 3, 0.8), T('puddle', 1, 0.2, 1.16), T('rock', 4, 0.64, 0.62)],
  },
  {
    name: '통나무 다리', ch: 1, news: '나뭇가지 — 연못보다 크면 쿵 쓰러져 다리가 돼요', hint: '나뭇가지 톡 → 큰 것 톡', par: 1, spot: 2,
    things: [W('panda', 4), O('pond', 4, 0.5), T('log', 1, 0.34, GY - 0.02, { ref: 1 }), O('hole', 2, 0.84), T('rock', 3, 0.7, 0.6), T('coconut', 1, 0.2, 1.15)],
  },
  {
    name: '수박 징검다리', ch: 1, news: '수박 — 굴러서 연못에 풍덩! 연못만큼 크면 징검다리가 돼요', hint: '수박을 크게!', par: 1, spot: 4,
    things: [
      W('turtle', 2), W('giraffe', 2), O('pond', 4, 0.48), O('hole', 4, 0.82),
      T('melon', 1, 0.66, 0.46, { trk: [[0.66, 0.46], [0.6, 0.6], [0.53, 0.78], [0.49, GY]] }), T('rock', 5, 0.22, 0.62), T('coconut', 1, 0.86, 1.14),
    ],
  },
  {
    name: '숲의 사육사', ch: 1, news: '', hint: '누구 크기를 누구에게 맡길까?', par: 2,
    things: [
      W('giraffe', 4), W('turtle', 2), O('hole', 3, 0.38), O('pond', 3, 0.6), O('keeper', 3, 0.84),
      T('coconut', 1, 0.22, 1.14), T('rock', 5, 0.7, 0.6), T('puddle', 2, 0.6, 1.16),
    ],
  },
  // ── 3장 정문 광장 ──
  {
    name: '사육사 모자', ch: 2, news: '모자 — 사육사만큼 커지면 폭! 사육사를 덮어요', hint: '모자 톡 → 큰 것 톡', par: 1, spot: 3,
    things: [W('penguin', 2), O('gate', 3, 0.4), O('keeper', 3, 0.64), T('hat', 1, 0.64, 0.7, { ref: 2 }), O('hole', 2, 0.87), T('statue', 5, 0.24, 0.6), T('popcorn', 1, 0.82, 1.14)],
  },
  {
    name: '깡충 캥거루', ch: 2, news: '캥거루 — 자기보다 작은 문·사육사·연못은 깡충 뛰어넘어요 (열지는 않아요)', hint: '캥거루가 뛰어넘으면 문은 그대로!', par: 2, spot: 0,
    things: [W('kangaroo', 2), W('penguin', 2), O('gate', 3, 0.42), O('keeper', 3, 0.66), O('hole', 2, 0.88), T('drum', 4, 0.24, 0.62), T('icecream', 1, 0.8, 1.14)],
  },
  {
    name: '누름판 정문', ch: 2, news: '누름판 — 그 위의 것이 커다래지면 쇠창살 정문이 올라가요', hint: '누름판 위의 팝콘을 보세요', par: 1, spot: 4,
    things: [W('penguin', 2), W('lion', 4), O('hole', 2, 0.42), O('iron', 0, 0.8, { ref: 4 }), T('popcorn', 1, 0.62, 0.6), T('statue', 5, 0.2, 0.62), T('icecream', 2, 0.86, 1.14)],
  },
  {
    name: '사육사 둘', ch: 2, news: '사육사가 둘! 크기는 한 번에 한 곳에만', hint: '누가 먼저 지나가야 할까?', par: 2,
    things: [
      W('panda', 3), W('rabbit', 2), O('gate', 4, 0.36), O('keeper', 3, 0.58), T('hat', 1, 0.58, 0.7, { ref: 3 }), O('keeper', 2, 0.82),
      T('statue', 5, 0.2, 0.6), T('popcorn', 1, 0.75, 0.58), T('icecream', 2, 0.5, 1.14),
    ],
  },
  {
    name: '대탈출', ch: 2, news: '', hint: '모두 함께 정문 밖으로!', par: 3,
    things: [
      W('lion', 3), W('mouse', 1), W('elephant', 4), O('hole', 1, 0.36), O('keeper', 3, 0.6), O('iron', 0, 0.84, { ref: 7 }),
      T('apple', 1, 0.78, 0.46, { trk: [[0.78, 0.46], [0.72, 0.6], [0.64, 0.78], [0.6, GY], [0.55, 1.06], [0.42, 1.2]] }), T('popcorn', 2, 0.44, 0.6), T('statue', 5, 0.18, 0.6),
    ],
  },
];
export const STAGE_COUNT = STAGES.length;
const SWAP_T = 9, RESULT_T = 210, FAIL_T = 120, CLEAR_PTS = 100, STAR_PTS = 100, HEART_PTS = 100;
const budgetOf = (d: StageDef) => Math.max(4, d.par + 3);
const josa = (w: string) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '을' : '를');
/** 별 조건(쉬운 말, 판마다 하나씩 늘어난다): 1판 탈출 · 2판 +한 번만 · 3판부터 +n번 안에 */
function starsOf(i: number): { label: string; max: number }[] {
  const d = STAGES[i], ws = d.things.filter((t) => t.walk), who = ws.length > 1 ? '' : K[ws[0].k].name;
  const n = ['', '한', '두', '세', '네', '다섯', '여섯'];
  const out = [{ label: who ? `${who}${josa(who)} 출구로` : '모두 출구로', max: 99 }];
  if (i >= 2) out.push({ label: `${n[d.par + 1]} 번 안에 바꾸기`, max: d.par + 1 });
  if (i >= 1) out.push({ label: d.par === 1 ? '한 번만 바꾸기' : `${n[d.par]} 번 안에 바꾸기`, max: d.par });
  return out;
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
interface Th {
  id: number; k: Kind; c: Cls; z: number; x: number; y: number;
  walk: boolean; s: number; v: number; st: number; blk: number; qi: number; hop: number;
  at: number;
  /** 문: 1 밀어 엶 · 2 부서짐 / 사육사: 1 도망 · 2 기절 */
  open: number;
  trk: number; ts: number; tv: number; roll: number; rot: number;
  ref: number; fill: number;
}
interface Track { pts: P2[]; cum: number[]; L: number; hits: { ts: number; id: number }[]; pond: number }
interface Path { pts: P2[]; cum: number[]; L: number }
interface WEv { k: string; a: number; b: number; n: number }
export interface World {
  th: Th[]; path: Path; tracks: Track[]; obs: number[]; walkers: number[]; rollers: number[]; ch: number;
  t: number; pend: { a: number; b: number; t: number } | null; swaps: number; fail: number; quiet: boolean; log: WEv[];
}

function mkPath(pts: P2[]): Path {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
function at(p: { pts: P2[]; cum: number[]; L: number }, s: number): P2 {
  const { pts, cum } = p;
  if (s <= 0) return pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (s <= cum[i] || i === pts.length - 1) {
      const u = Math.min(1, (s - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]));
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
    }
  }
  return pts[pts.length - 1];
}
function project(p: { pts: P2[]; cum: number[] }, x: number, y: number): { s: number; d: number } {
  let best = { s: 0, d: 1e9 };
  for (let i = 1; i < p.pts.length; i++) {
    const [ax, ay] = p.pts[i - 1], [bx, by] = p.pts[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(ax + dx * u - x, ay + dy * u - y);
    if (d < best.d) best = { s: p.cum[i - 1] + u * Math.sqrt(l2), d };
  }
  return best;
}
/** 동물의 몸 반 길이(옆모습) */
const half = (o: Th) => RZ[o.z] * 0.86;
/** 길 위 장애물의 반 길이 */
export function depth(o: Th) {
  switch (o.c) {
    case 'pond': return 0.04 + 0.022 * o.z;
    case 'keeper': return RZ[o.z] * 0.5;
    case 'hole': return 0.036;
    case 'iron': return 0.03;
    default: return 0.02;
  }
}
const GAP = 0.016;

function mkWorld(d: StageDef, quiet = false): World {
  const path = mkPath(PATH);
  const th: Th[] = d.things.map((t, id) => ({
    id, k: t.k, c: K[t.k].c, z: t.z, x: t.x, y: t.y, walk: !!t.walk, s: 0, v: 0, st: 0, blk: -1, qi: 0, hop: 0,
    at: 0, open: 0, trk: -1, ts: 0, tv: 0, roll: 0, rot: 0, ref: t.ref ?? -1, fill: -1,
  }));
  const w: World = { th, path, tracks: [], obs: [], walkers: [], rollers: [], ch: d.ch, t: 0, pend: null, swaps: 0, fail: 0, quiet, log: [] };
  // 동물: 앞에 선 것부터 우리 안에 줄 선다
  let xs = 0.22 + 0.06;
  for (const o of th) {
    if (!o.walk) continue;
    o.qi = w.walkers.length;
    o.s = xs - 0.06 - half(o) + 0.06;
    o.s = (w.walkers.length ? xs : 0.22) - (w.walkers.length ? half(o) : 0);
    xs = o.s - half(o) - 0.03;
    o.s -= PATH[0][0];
    w.walkers.push(o.id);
  }
  for (const o of th) if (o.c === 'hole' || o.c === 'gate' || o.c === 'keeper' || o.c === 'pond' || o.c === 'iron') (o.at = o.x - PATH[0][0]), w.obs.push(o.id);
  w.obs.sort((a, b) => th[a].at - th[b].at);
  // 굴러가는 것: 비탈 길(트랙)과 그 길이 지나는 문·사육사·연못
  d.things.forEach((t, id) => {
    if (K[t.k].c !== 'roller' || !t.trk) return;
    const tp = mkPath(t.trk), tr: Track = { ...tp, hits: [], pond: -1 };
    for (const o of th) {
      if (o.c !== 'keeper' && o.c !== 'gate' && o.c !== 'pond') continue;
      const pr = project(tp, o.x, GY);
      if (o.c === 'pond') {
        if (pr.d < 0.05 && pr.s > tp.L - 0.02) tr.pond = o.id;
      } else if (pr.d < 0.06) tr.hits.push({ ts: pr.s, id: o.id });
    }
    tr.hits.sort((a, b) => a.ts - b.ts);
    th[id].trk = w.tracks.length;
    w.tracks.push(tr);
    w.rollers.push(id);
  });
  for (const id of w.walkers) syncXY(w, th[id]);
  return w;
}
function syncXY(w: World, o: Th) {
  const p = at(w.path, o.s);
  o.x = p[0];
  o.y = p[1];
}
function cloneWorld(w: World): World {
  return { ...w, th: w.th.map((o) => ({ ...o })), pend: w.pend && { ...w.pend }, log: [], quiet: true };
}
const lg = (w: World, k: string, a = -1, b = -1, n = 0) => {
  if (!w.quiet) w.log.push({ k, a, b, n });
};

/** 키(구멍·연못에 쓰는 높이): 크기, 기린은 +2 */
export const heightOf = (o: Th) => o.z + (K[o.k].tall ?? 0);
const hops = (wk: Th, o: Th) => !!K[wk.k].hop && wk.z > o.z && (o.c === 'gate' || o.c === 'keeper' || o.c === 'pond');
function hatOf(w: World, kp: Th) {
  for (const h of w.th) if (h.c === 'hat' && h.ref === kp.id) return h;
  return null;
}
/** 사육사가 지금 잡을 수 있나: 도망·기절 아님, 모자에 덮이지 않음 */
export function onDuty(w: World, kp: Th) {
  if (kp.open) return false;
  const h = hatOf(w, kp);
  return !(h && h.z >= kp.z);
}
export const bridged = (w: World, p: Th) => w.th.some((l) => l.c === 'log' && l.ref === p.id && l.z >= p.z);
export const filled = (w: World, p: Th) => p.fill >= 0 && w.th[p.fill].z >= p.z;
export const pressed = (w: World, g: Th) => g.ref >= 0 && w.th[g.ref].z >= 4;

function passable(w: World, o: Th, wk: Th): boolean {
  switch (o.c) {
    case 'hole': return heightOf(wk) <= o.z;
    case 'gate': return o.open > 0 || hops(wk, o);
    case 'keeper': return !onDuty(w, o) || hops(wk, o);
    case 'pond': return !!K[wk.k].swim || heightOf(wk) > o.z || bridged(w, o) || filled(w, o) || hops(wk, o);
    case 'iron': return pressed(w, o);
    default: return true;
  }
}
function contact(w: World, o: Th, wk: Th) {
  if (o.c === 'gate' && !o.open && !hops(wk, o) && wk.z >= o.z) (o.open = 1), lg(w, 'gate', o.id, wk.id);
  else if (o.c === 'keeper' && onDuty(w, o) && !hops(wk, o)) {
    if (wk.z > o.z) (o.open = 1), lg(w, 'flee', o.id, wk.id);
    else (wk.st = 3), (w.fail = 1), lg(w, 'caught', o.id, wk.id);
  }
}
const vmaxOf = (o: Th) => 0.24 + 0.04 * o.z;

/** 동물 하나: 앞의 막힌 곳(또는 앞 동물)까지 걷는다 */
function walkerTick(w: World, wk: Th, ahead: Th | null) {
  if (wk.st >= 2) return;
  let lim = w.path.L + 1, blk = -1;
  for (const id of w.obs) {
    const o = w.th[id];
    if (wk.s > o.at + depth(o) + half(wk)) continue;
    const cp = o.at - depth(o) - half(wk) - GAP;
    if (wk.s >= cp - 0.003) {
      contact(w, o, wk);
      if (wk.st === 3) return;
    }
    if (!passable(w, o, wk)) {
      lim = cp;
      blk = id;
      break;
    }
  }
  if (ahead) {
    const q = ahead.s - half(ahead) - half(wk) - 0.012;
    if (q < lim) (lim = q), (blk = -2);
  }
  const was = wk.st;
  if (wk.s < lim - 0.0004) {
    wk.v = Math.min(vmaxOf(wk), wk.v + 1.6 * TK);
    wk.s = Math.min(lim, wk.s + wk.v * TK);
    wk.st = 0;
    if (wk.s >= lim - 0.0004 && blk !== -1) {
      // 막힌 곳에 닿는 바로 그 틱에 문·사육사를 건드린다(한 틱 '막힘'으로 멈춘 척하지 않게)
      if (blk >= 0) contact(w, w.th[blk], wk);
      if (wk.st === 3) return;
      if (blk >= 0 && passable(w, w.th[blk], wk)) wk.st = 0;
      else (wk.v = 0), (wk.st = 1), blk >= 0 && lg(w, 'bonk', wk.id, blk);
    }
  } else if (wk.s > lim + 0.0004) {
    // 커져서 끼었으면 밀려 나온다
    wk.s = Math.max(lim, wk.s - 0.5 * TK);
    wk.v = 0;
    wk.st = 0;
    if (wk.s <= lim + 0.0004) (wk.st = 1), blk >= 0 && lg(w, 'squeeze', wk.id, blk);
  } else {
    wk.v = 0;
    if (was === 0 && blk >= 0) lg(w, 'bonk', wk.id, blk);
    wk.st = 1;
  }
  wk.blk = blk;
  if (wk.s >= w.path.L) (wk.st = 2), lg(w, 'out', wk.id);
  if (wk.hop > 0) wk.hop--;
  if (K[wk.k].hop && wk.st === 0 && wk.hop <= 0) {
    for (const id of w.obs) {
      const o = w.th[id];
      if (hops(wk, o) && wk.s > o.at - depth(o) - half(wk) - 0.03 && wk.s < o.at) (wk.hop = 34), lg(w, 'hop', wk.id, id);
    }
  }
  syncXY(w, wk);
}
function rollerTick(w: World, r: Th) {
  if (r.roll === 3) return;
  const tr = w.tracks[r.trk];
  if (r.z < 3 || tr.L < 0.01) {
    if (r.roll === 1) (r.roll = 2), (r.tv = 0), lg(w, 'rollstop', r.id);
    return;
  }
  if (r.ts >= tr.L - 1e-6) return;
  const step = Math.max(r.tv, 0.08) * TK;
  for (const h of tr.hits) {
    if (r.ts > h.ts) continue;
    const o = w.th[h.id];
    const blocks = (o.c === 'keeper' && onDuty(w, o)) || (o.c === 'gate' && !o.open);
    if (!blocks) continue;
    const cp = h.ts - RZ[r.z] * 0.7 - 0.015;
    if (r.ts + step < cp) break;
    if (r.z >= o.z) {
      o.open = 2;
      lg(w, o.c === 'keeper' ? 'knock' : 'smash', o.id, r.id);
      r.tv *= 0.6;
      continue;
    }
    if (r.roll === 1) lg(w, 'thunk', r.id, o.id);
    r.roll = 2;
    r.tv = 0;
    return;
  }
  if (r.roll !== 1) (r.roll = 1), lg(w, 'roll', r.id);
  r.tv = Math.min(0.55 + 0.06 * r.z, r.tv + 1.1 * TK);
  r.ts = Math.min(tr.L, r.ts + r.tv * TK);
  r.rot += (r.tv * TK) / RZ[r.z];
  const p = at(tr, r.ts);
  r.x = p[0];
  r.y = p[1];
  if (r.ts >= tr.L - 1e-6) {
    if (tr.pond >= 0) (r.roll = 3), (w.th[tr.pond].fill = r.id), lg(w, 'splash', r.id, tr.pond);
    else (r.roll = 2), lg(w, 'rest', r.id);
    r.tv = 0;
  }
}
export function settled(w: World) {
  if (w.pend) return false;
  for (const id of w.walkers) if (w.th[id].st === 0) return false;
  for (const id of w.rollers) if (w.th[id].roll === 1) return false;
  return true;
}
export const allOut = (w: World) => w.walkers.every((id) => w.th[id].st === 2);
function doSwap(w: World, a: number, b: number) {
  const A_ = w.th[a], B_ = w.th[b], za = A_.z, zb = B_.z;
  A_.z = zb;
  B_.z = za;
  lg(w, 'swap', a, b, za * 10 + zb);
}
export function tick(w: World) {
  w.t++;
  if (w.pend && w.t >= w.pend.t) {
    doSwap(w, w.pend.a, w.pend.b);
    w.pend = null;
  }
  for (const id of w.rollers) rollerTick(w, w.th[id]);
  let ahead: Th | null = null;
  for (const id of w.walkers) {
    const wk = w.th[id];
    walkerTick(w, wk, ahead);
    if (w.fail) return;
    if (wk.st !== 2) ahead = wk;
  }
}
/** 지금 바꿀 수 있는 물건: 나간 동물·도망간 사육사·쇠창살은 빼고 */
export const swappable = (o: Th) => !(o.walk && o.st >= 2) && !(o.c === 'keeper' && o.open === 1) && o.c !== 'iron';

// ───────────────────────────── 플래너 (잘하는 봇·미리 보기) ─────────────────────────────
function sig(w: World): string {
  let k = '';
  for (const o of w.th) {
    k += o.z;
    if (o.walk) k += `w${o.st}${o.st === 1 ? o.blk : Math.round(o.s * 40)}`;
    else if (o.c === 'gate' || o.c === 'keeper') k += o.open;
    else if (o.c === 'roller') k += `r${o.roll}${Math.round(o.ts * 40)}`;
    else if (o.c === 'pond') k += `p${o.fill}`;
    k += ',';
  }
  return k;
}
/** 멈출 때까지(또는 깸·실패) 돌린다 */
export function runSettle(w: World, max = 1500) {
  for (let i = 0; i < max && !w.fail && !allOut(w); i++) {
    tick(w);
    if (i > 2 && settled(w)) break;
  }
}
const pairsOf = (w: World): [number, number][] => {
  const ids = w.th.filter(swappable).map((o) => o.id), out: [number, number][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (w.th[ids[i]].z !== w.th[ids[j]].z) out.push([ids[i], ids[j]]);
  return out;
};
const planMem = new Map<string, [number, number][] | null>();
/** 가장 적게 바꿔 모두 탈출하는 순서 (너비 우선 + 물리 시뮬). 못 찾으면 null */
export function solve(stage: number, w0: World, left: number): [number, number][] | null {
  const key = `${stage}|${left}|${sig(w0)}`;
  if (planMem.has(key)) return planMem.get(key)!;
  const root = cloneWorld(w0);
  runSettle(root);
  let res: [number, number][] | null = null;
  if (allOut(root) && !root.fail) res = [];
  else if (!root.fail) {
    let layer: { w: World; seq: [number, number][] }[] = [{ w: root, seq: [] }];
    const seen = new Set<string>([sig(root)]);
    for (let dep = 1; dep <= Math.min(left, 4) && !res && layer.length; dep++) {
      const next: typeof layer = [];
      for (const n of layer) {
        for (const [a, b] of pairsOf(n.w)) {
          const c = cloneWorld(n.w);
          doSwap(c, a, b);
          runSettle(c);
          if (c.fail) continue;
          if (allOut(c)) {
            res = [...n.seq, [a, b]];
            break;
          }
          const k = sig(c);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push({ w: c, seq: [...n.seq, [a, b]] });
        }
        if (res) break;
      }
      layer = next;
    }
  }
  planMem.set(key, res);
  return res;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; k: string; a: number; b: number; n: number }
export interface SwapState {
  seed: number; t: number; stage: number; w: World; phase: 'play' | 'result' | 'fail'; pt: number; why: string;
  hearts: number; pts: number; got: number; ofStars: number; starOk: boolean[]; sel: number; lock: boolean; down: boolean;
  dex: number[]; newDex: Kind[]; again: boolean; tries: number; dead: boolean; won: boolean; calm: number;
  firstTap: number; firstBig: number; wowN: number; seen: Set<string>; events: Ev[];
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  big: { text: string; t: number; x: number; y: number } | null;
}
const see = (s: SwapState, key: string) => (key && !s.seen.has(key) ? (s.seen.add(key), true) : false);
function wow(s: SwapState, text: string, x: number, y: number) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, t: s.t, x, y };
}
const ev = (s: SwapState, k: string, a = -1, b = -1, n = 0) => s.events.push({ t: s.t, k, a, b, n });

function newStage(s: SwapState, again: boolean) {
  const d = STAGES[s.stage];
  s.w = mkWorld(d);
  s.phase = 'play';
  s.pt = 0;
  s.sel = d.pre ?? -1;
  s.lock = d.pre !== undefined && !again;
  if (again) s.sel = -1;
  s.again = again;
  s.calm = 0;
  s.starOk = starsOf(s.stage).map(() => false);
  s.got = 0;
  s.ofStars = s.starOk.length;
  s.newDex = [];
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch;
  s.banner = again ? { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, t: s.t } : { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판 ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
  s.spot = !again && d.spot !== undefined ? { id: d.spot, t: s.t, label: d.news.split(' — ')[0] } : null;
  if (!again) {
    see(s, `stage${s.stage}`);
    if (d.news) see(s, `news:${d.news.split(' — ')[0]}`);
    if (first) see(s, `ch${d.ch}`);
  }
  ev(s, again ? 'again' : 'stage');
}
function clearStage(s: SwapState) {
  const st = starsOf(s.stage);
  s.starOk = st.map((q) => s.w.swaps <= q.max);
  s.got = s.starOk.filter(Boolean).length;
  s.pts += CLEAR_PTS + s.got * STAR_PTS;
  s.phase = 'result';
  s.pt = 0;
  s.sel = -1;
  s.newDex = [];
  for (const id of s.w.walkers) {
    const k = s.w.th[id].k, i = DEX.indexOf(k);
    if (i >= 0) {
      if (!s.dex[i]) s.newDex.push(k), see(s, `dex:${k}`);
      s.dex[i]++;
    }
  }
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += s.hearts * HEART_PTS);
  ev(s, 'clear', s.got);
}
function failStage(s: SwapState, why: string) {
  s.phase = 'fail';
  s.pt = 0;
  s.why = why;
  s.sel = -1;
  s.hearts--;
  s.tries++;
  ev(s, 'fail', s.w.walkers.find((id) => s.w.th[id].st === 3) ?? -1);
}

// ───────────────────────────── 톡 ─────────────────────────────
export const RETRY: [number, number, number, number] = [0.085, 1.445, 0.15, 0.09];
/** 톡 했을 때 그 물건의 가운데(가로 폭 단위) — 그림·봇·맞히기가 같은 것을 쓴다 */
export function hitCenter(w: World, o: Th): P2 {
  const r = RZ[Math.max(1, o.z)];
  switch (o.c) {
    case 'hole': return [o.x, o.y - Math.max(0.03, r * 0.95)];
    case 'gate': return [o.x, o.y - 0.03 - o.z * 0.012];
    case 'arch': return [o.x, o.y - 0.06 - o.z * 0.012];
    case 'pond': return [o.x, o.y];
    case 'keeper': return [o.x, o.y - r * 0.9];
    case 'hat': {
      const kp = w.th[o.ref];
      return [kp.x + 0.035, kp.y - RZ[kp.z] * 2.25 - 0.012];
    }
    case 'log': return [o.x, o.y];
    default: {
      if (o.walk) {
        const p = at(w.path, o.s);
        return [p[0] + laneOf(o), p[1] - r * 0.9];
      }
      return [o.x, o.y - r * 0.85];
    }
  }
}
export const laneOf = (o: Th) => (o.qi % 2 ? 1 : -1) * Math.min(1, o.qi) * 0.05 * (o.st === 1 ? 1 : 0.6);
function pick(s: SwapState, x: number, y: number): number {
  let best = -1, bs = 1e9;
  for (const o of s.w.th) {
    if (!swappable(o)) continue;
    const [cx, cy] = hitCenter(s.w, o), r = Math.max(0.07, RZ[Math.max(1, o.z)] * 1.05), d = Math.hypot(x - cx, y - cy);
    if (d > r + 0.09) continue;
    const sc = d - r * 0.6;
    if (sc < bs) (bs = sc), (best = o.id);
  }
  return best;
}
const inBox = (x: number, y: number, b: [number, number, number, number]) => Math.abs(x - b[0]) <= b[2] / 2 && Math.abs(y - b[1]) <= b[3] / 2;
function tapAt(s: SwapState, x: number, y: number) {
  if (inBox(x, y, RETRY)) {
    if (s.w.swaps > 0 || s.sel >= 0) newStage(s, true), ev(s, 'retry');
    return;
  }
  const id = pick(s, x, y);
  if (id < 0) return;
  if (s.w.pend) return;
  if (s.sel < 0) {
    s.sel = id;
    ev(s, 'sel', id);
    see(s, 'select');
    return;
  }
  if (s.sel === id) {
    if (!s.lock) (s.sel = -1), ev(s, 'desel', id);
    return;
  }
  if (s.w.swaps >= budgetOf(STAGES[s.stage])) {
    ev(s, 'nomore', id);
    return;
  }
  s.w.swaps++;
  s.w.pend = { a: s.sel, b: id, t: s.w.t + SWAP_T };
  ev(s, 'beam', s.sel, id);
  s.sel = -1;
  s.lock = false;
  see(s, 'swap');
}

/** 시뮬 사건 → 게임 사건(연출·큰 순간·새것) */
function absorb(s: SwapState) {
  const w = s.w;
  for (const e of w.log) {
    ev(s, e.k, e.a, e.b, e.n);
    const A_ = e.a >= 0 ? w.th[e.a] : null;
    switch (e.k) {
      case 'swap': {
        const za = Math.floor(e.n / 10), zb = e.n % 10, B_ = w.th[e.b];
        if (Math.abs(za - zb) >= 2) {
          const big = A_!.z > B_.z ? A_! : B_, small = big === A_ ? B_ : A_!;
          const [bx, by] = hitCenter(w, big);
          wow(s, big.z >= 5 ? `${SIZE_WORD[5]} ${K[big.k].name}!` : small.z <= 1 ? `${SIZE_WORD[1]} ${K[small.k].name}!` : `뿅! ${K[big.k].name} 쑥!`, bx, by - 0.05);
        }
        break;
      }
      case 'flee': see(s, 'flee'), wow(s, '으악! 사육사 도망!', A_!.x, A_!.y - 0.12); break;
      case 'knock': see(s, 'knock'), wow(s, '쾅! 사육사 꽈당!', A_!.x, A_!.y - 0.12); break;
      case 'smash': see(s, 'smash'), wow(s, '와장창!', A_!.x, A_!.y - 0.1); break;
      case 'gate': see(s, 'gate'); break;
      case 'roll': see(s, 'roll'); break;
      case 'splash': see(s, 'splash'); break;
      case 'hop': see(s, 'hop'); break;
      case 'out': see(s, 'out'); break;
    }
  }
  w.log.length = 0;
}

// ───────────────────────────── 게임 ─────────────────────────────
const game: GameDef<SwapState> & { wows(s: SwapState): number } = {
  id: 'sizeswap',
  name: '↔️ 크기 바꾸기',
  genes: ['sizeswap', 'pointer', 'collect'],
  twist: '두 물건을 차례로 톡 하면 크기가 서로 뿅 바뀌는데, 크기를 따라 힘·무게까지 바뀐다 — 개미만 해진 코끼리는 쥐구멍으로 쏙, 쥐구멍과 우리 문을 바꾸면 구멍은 대문만 해지고 문은 콩알만 해진다',
  rules: [
    '하나 톡 → 다른 하나 톡 하면 두 크기가 뿅! 서로 바뀌어요. 무엇이든 돼요.',
    '작으면 구멍으로 쏙, 크면 문을 쾅. 사육사는 자기보다 작은 동물만 잡아요.',
    '동물을 모두 출구로! 적게 바꿀수록 별. 잡히거나 막히면 하트 -1.',
  ],
  controls: 'touch',
  hint: '물건 톡 → 다른 물건 톡 = 크기 바꾸기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 가득한 3/4 시점 동물원 디오라마 — 손그림 동물들이 크기를 뿅뿅 바꿔 탈출하고, 사육사는 웃기게 당황한다',
    mood: '연둣빛 잔디와 하얀 울타리의 아기 동물 마을, 노란 풀과 아카시아의 큰 동물 숲, 분수와 풍선이 있는 정문 광장. 빛줄기가 오가면 코끼리가 개미만 해지고 생쥐가 집채만 해져 쿵 내려앉는다.',
    palette: { bg: '#9fdc6a', ink: '#3a2a14', muted: '#7a6a4a', accent: '#ffcf3a', hot: '#ff5f3a', soft: '#fff6dc' },
  },
  guard: (s) => (s.phase === 'play' ? s.w.walkers.filter((id) => s.w.th[id].st !== 3).length : s.w.walkers.length),
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: s.ofStars } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      seed, t: 0, stage: 0, w: null as unknown as World, phase: 'play', pt: 0, why: '', hearts: 3, pts: 0, got: 0, ofStars: 1, starOk: [false],
      sel: -1, lock: false, down: false, dex: DEX.map(() => 0), newDex: [], again: false, tries: 0, dead: false, won: false, calm: 0,
      firstTap: -1, firstBig: -1, wowN: 0, seen: new Set<string>(), events: [], banner: null, spot: null, big: null,
    } as SwapState;
    newStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, fresh = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'play') {
      if (fresh) {
        if (s.firstTap < 0) s.firstTap = s.t;
        tapAt(s, p!.x, p!.y * A);
      }
      tick(s.w);
      absorb(s);
      s.calm = settled(s.w) ? s.calm + 1 : 0;
      if (s.w.fail) failStage(s, '사육사에게 잡혔어요!');
      else if (allOut(s.w)) clearStage(s);
      else if (s.calm > 20 && s.w.swaps >= budgetOf(STAGES[s.stage])) failStage(s, '뿅을 다 썼는데 막혔어요');
    } else if (s.phase === 'result') {
      s.pt++;
      if (s.pt >= RESULT_T || (fresh && s.pt > 60)) {
        if (s.won) s.dead = true;
        else (s.stage++), newStage(s, false);
      }
    } else {
      s.pt++;
      if (s.pt >= FAIL_T) {
        if (s.hearts <= 0) s.dead = true;
        else newStage(s, true);
      }
    }
    if (s.events.length > 80) s.events = s.events.filter((e) => s.t - e.t < 90);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const sizeswap = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at01 = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapThing = (s: SwapState, id: number) => at01(...hitCenter(s.w, s.w.th[id]));
/** 한 쌍을 바꾸는 톡 (지금 골라진 것에 맞춰) */
function tapPair(s: SwapState, a: number, b: number): Input {
  if (s.sel < 0) return tapThing(s, a);
  if (s.sel === a) return tapThing(s, b);
  if (s.sel === b) return tapThing(s, a);
  return tapThing(s, s.sel); // 엉뚱한 것이 골라져 있으면 먼저 내려놓기
}
const ready = (s: SwapState, calm: number) => s.phase === 'play' && !s.down && !s.w.pend && s.calm >= calm;

/** 잘하는 봇: 바꿀 쌍마다 물리를 끝까지 돌려 보고(너비 우선), 가장 적게 바꿔 모두 탈출하는 순서대로 */
export const sizeswapSmart: Bot<SwapState> = {
  name: '물리를 돌려 보고 바꾸기',
  act(s) {
    if (!ready(s, 8)) return NO;
    const plan = solve(s.stage, s.w, budgetOf(STAGES[s.stage]) - s.w.swaps);
    if (!plan || !plan.length) return plan ? NO : at01(RETRY[0], RETRY[1]);
    return tapPair(s, plan[0][0], plan[0][1]);
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const sizeswapRandom: Bot<SwapState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.x = 0.04 + rng() * 0.92;
        m.y = 0.13 + rng() * 0.8;
      } else m.next = s.t + 14 + Math.floor(rng() * 50);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

/** 주인공: 막혀 있는 동물 중 가장 앞선 것(없으면 아직 안 나간 첫 동물) */
function hero(s: SwapState): Th | null {
  let best: Th | null = null;
  for (const id of s.w.walkers) {
    const o = s.w.th[id];
    if (o.st === 2 || o.st === 3) continue;
    if (!best || (o.st === 1 && (best.st !== 1 || o.s > best.s))) best = o;
  }
  return best;
}
/** 버릇 봇 1: 늘 주인공과 (주인공 말고) 가장 큰 것을 바꾼다 */
export const sizeswapHabit: Bot<SwapState> = {
  name: '늘 주인공과 가장 큰 것 바꾸기',
  act(s) {
    if (!ready(s, 8)) return NO;
    const hr = hero(s);
    if (!hr) return NO;
    const [hx, hy] = hitCenter(s.w, hr);
    let best: Th | null = null, bd = 1e9;
    for (const o of s.w.th) {
      if (o === hr || !swappable(o)) continue;
      const [x, y] = hitCenter(s.w, o), d = Math.hypot(x - hx, y - hy);
      if (!best || o.z > best.z || (o.z === best.z && d < bd)) (best = o), (bd = d);
    }
    return best ? tapPair(s, hr.id, best.id) : NO;
  },
};
/** 버릇 봇 2: 늘 화면에서 가장 가까운 두 개(크기가 다른 것)를 바꾼다 */
export const sizeswapHabit2: Bot<SwapState> = {
  name: '늘 가장 가까운 두 개 바꾸기',
  act(s) {
    if (!ready(s, 8)) return NO;
    let pair: [number, number] | null = null, bd = 1e9;
    const ids = s.w.th.filter(swappable).map((o) => o.id);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = s.w.th[ids[i]], b = s.w.th[ids[j]];
        if (a.z === b.z) continue;
        const [ax, ay] = hitCenter(s.w, a), [bx, by] = hitCenter(s.w, b), d = Math.hypot(ax - bx, ay - by);
        if (d < bd) (bd = d), (pair = [a.id, b.id]);
      }
    return pair ? tapPair(s, pair[0], pair[1]) : NO;
  },
};
void mulberry32;
/** 분석·테스트용 (판 바로 가기 · 시뮬 복제) */
export const __jump = (s: SwapState, i: number) => ((s.stage = i), newStage(s, false));
export const cloneW = cloneWorld, pairs = pairsOf, swapNow = doSwap;

// ───────────────────────────── 그리기 ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: SwapState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s);
  ctx.fillStyle = '#9fdc6a';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  for (const o of s.w.th) {
    const [x, y] = hitCenter(s.w, o);
    ctx.fillStyle = o.walk ? '#c66' : '#666';
    ctx.beginPath();
    ctx.arc(x * w, y * w, RZ[Math.max(1, o.z)] * w, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
