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
const RZ = [0, 0.034, 0.051, 0.073, 0.1, 0.135];
const SIZE_WORD = ['', '콩알만 한', '조그만', '보통', '커다란', '집채만 한'];

// ───────────────────────────── 물건 ─────────────────────────────
type Cls = 'animal' | 'hole' | 'gate' | 'keeper' | 'hat' | 'pond' | 'log' | 'iron' | 'roller' | 'prop';
type Kind =
  | 'elephant' | 'rabbit' | 'mouse' | 'piglet' | 'hippo' | 'giraffe' | 'turtle' | 'panda' | 'penguin' | 'lion'
  | 'hole' | 'gate' | 'keeper' | 'hat' | 'pond' | 'log' | 'iron'
  | 'apple' | 'melon' | 'boulder'
  | 'acorn' | 'pumpkin' | 'bucket' | 'hay' | 'coconut' | 'rock' | 'puddle' | 'popcorn' | 'statue' | 'icecream' | 'drum';
interface KD { name: string; c: Cls; swim?: boolean; tall?: number; roar?: boolean; say?: string; skill?: string }
const K: Record<Kind, KD> = {
  elephant: { name: '코끼리', c: 'animal', say: '뿌우!', skill: '작아지면 쥐구멍으로 쏙!' },
  rabbit: { name: '토끼', c: 'animal', say: '깡총!', skill: '커지면 무거운 문도 쾅!' },
  mouse: { name: '생쥐', c: 'animal', say: '찍!', skill: '원래는 콩알만 해요' },
  piglet: { name: '돼지', c: 'animal', say: '꿀꿀!', skill: '사육사 아저씨를 제일 무서워해요' },
  hippo: { name: '하마', c: 'animal', swim: true, say: '하암~', skill: '물속을 첨벙첨벙 헤엄쳐요' },
  giraffe: { name: '기린', c: 'animal', tall: 2, say: '음메?', skill: '목이 길어 키가 크기보다 둘 더 커요' },
  turtle: { name: '거북', c: 'animal', swim: true, say: '느릿~', skill: '연못을 헤엄쳐 건너요' },
  panda: { name: '판다', c: 'animal', say: '냠냠', skill: '키가 연못보다 크면 첨벙첨벙 건너요' },
  penguin: { name: '펭귄', c: 'animal', swim: true, say: '꽥!', skill: '물속에선 누구보다 빨라요' },
  lion: { name: '사자', c: 'animal', roar: true, say: '어흥!', skill: '사육사보다 커지면 어흥! 멀리서도 쫓아내요' },
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
  statue: { name: '꽃 화분', c: 'prop' },
  icecream: { name: '아이스크림', c: 'prop' },
  drum: { name: '북', c: 'prop' },
};
/** 장마다 구멍의 생김새: 벽돌 쥐구멍 · 바위 굴 · 개찰구 */
const HOLE_NAME = ['쥐구멍', '바위 굴', '개찰구'];
/** 도감에 오르는 동물 (판을 깨면 그 판에서 탈출한 동물이 채워진다) */
const DEX: Kind[] = ['elephant', 'rabbit', 'mouse', 'piglet', 'giraffe', 'turtle', 'panda', 'hippo', 'penguin', 'lion'];

// ───────────────────────────── 판 ─────────────────────────────
/** 옆에서 본 길(산책로) — 동물은 왼쪽 우리에서 오른쪽 출구로 걷는다. y는 가로 폭 단위 */
const GY = 1.0;
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
    things: [W('elephant', 4), O('hole', 1, 0.56), T('mouse', 1, 0.42, 1.2), T('acorn', 1, 0.8, 0.84)],
  },
  {
    name: '무거운 문', ch: 0, news: '우리 문 — 크면 힘이 세져서 쾅 밀어 열어요', hint: '토끼 톡 → 호박 톡', par: 1, spot: 1,
    things: [W('rabbit', 2), O('gate', 4, 0.58), T('pumpkin', 4, 0.32, 0.84), T('acorn', 1, 0.5, 1.24), T('bucket', 2, 0.84, 0.84)],
  },
  {
    name: '구멍과 문', ch: 0, news: '무엇이든 바꿀 수 있어요 — 동물끼리도, 구멍과 문도!', hint: '두 마리 모두 지나가려면?', par: 1,
    things: [W('mouse', 1), W('piglet', 3), O('hole', 1, 0.45), O('gate', 3, 0.77), T('hay', 2, 0.62, 0.84), T('acorn', 1, 0.3, 1.24)],
  },
  {
    name: '사육사 아저씨', ch: 0, news: '사육사 — 자기보다 작은 동물은 잡고, 큰 동물을 보면 도망가요', hint: '사육사도 크기를 바꿀 수 있어요', par: 1, spot: 2,
    things: [W('piglet', 2), O('hole', 1, 0.45), O('keeper', 3, 0.78), T('acorn', 1, 0.36, 1.24), T('pumpkin', 4, 0.62, 0.83)],
  },
  {
    name: '데굴데굴 사과', ch: 0, news: '사과 — 커지면 무거워서 비탈을 데굴데굴 굴러가요', hint: '굴러간 사과가 사육사를 쾅!', par: 1, spot: 5,
    things: [
      W('mouse', 1), W('rabbit', 2), O('gate', 3, 0.4), O('keeper', 3, 0.64), O('hole', 2, 0.87),
      T('apple', 1, 0.8, 0.7, { trk: [[0.8, 0.7], [0.72, 0.86], [0.64, GY], [0.58, 1.14], [0.47, 1.27]] }),
      T('pumpkin', 4, 0.22, 0.84),
    ],
  },
  // ── 2장 큰 동물 숲 ──
  {
    name: '목이 걸려요', ch: 1, news: '기린 — 목이 길어 키가 크기보다 둘 더 커요. 낮은 굴에 걸려요', hint: '굴도 크기를 바꿀 수 있어요', par: 1, spot: 0,
    things: [W('giraffe', 3), O('hole', 2, 0.48), O('gate', 3, 0.79), T('rock', 5, 0.3, 0.82), T('coconut', 1, 0.5, 1.24)],
  },
  {
    name: '첨벙첨벙 연못', ch: 1, news: '연못 — 키가 연못보다 크면 첨벙첨벙 건너요. 거북은 헤엄쳐요', hint: '한 번에 두 가지가 바뀌어요', par: 1, spot: 3,
    things: [W('turtle', 2), W('panda', 3), O('pond', 3, 0.46), O('gate', 3, 0.8), T('puddle', 1, 0.2, 1.24), T('rock', 4, 0.64, 0.83)],
  },
  {
    name: '통나무 다리', ch: 1, news: '나뭇가지 — 연못만큼 커지면 쿵 쓰러져 다리가 돼요', hint: '나뭇가지 톡 → 큰 것 톡', par: 1, spot: 2,
    things: [W('panda', 4), O('pond', 4, 0.5), T('log', 1, 0.68, GY - 0.02, { ref: 1 }), O('hole', 2, 0.88), T('rock', 3, 0.3, 0.83), T('coconut', 1, 0.2, 1.24)],
  },
  {
    name: '수박 징검다리', ch: 1, news: '수박 — 굴러서 연못에 풍덩! 연못만큼 크면 징검다리가 돼요', hint: '수박을 크게!', par: 1, spot: 4,
    things: [
      W('turtle', 2), W('giraffe', 2), O('pond', 4, 0.48), O('hole', 4, 0.82),
      T('melon', 1, 0.66, 0.7, { trk: [[0.66, 0.7], [0.57, 0.86], [0.49, GY]] }), T('rock', 5, 0.22, 0.82), T('coconut', 1, 0.36, 1.24),
    ],
  },
  {
    name: '맡겼다 돌려받기', ch: 1, news: '하마 — 헤엄을 잘 쳐요', hint: '작아져서 지나간 뒤, 다시 커지기', par: 2,
    things: [W('giraffe', 4), W('hippo', 2), O('hole', 3, 0.36), O('pond', 4, 0.6), O('keeper', 3, 0.86), T('coconut', 1, 0.24, 1.24), T('rock', 5, 0.74, 0.82)],
  },
  // ── 3장 정문 광장 ──
  {
    name: '사육사 모자', ch: 2, news: '모자 — 사육사만큼 커지면 폭! 사육사를 덮어요', hint: '모자 톡 → 큰 것 톡', par: 1, spot: 3,
    things: [W('penguin', 2), O('gate', 3, 0.4), O('keeper', 3, 0.64), T('hat', 1, 0.64, 0.7, { ref: 2 }), O('hole', 2, 0.87), T('statue', 5, 0.24, 0.82), T('popcorn', 1, 0.46, 1.24)],
  },
  {
    name: '어흥 사자', ch: 2, news: '사자 — 사육사보다 커지면 어흥! 멀리 있는 사육사도 도망가요', hint: '우리 안의 사자를 보세요', par: 1, spot: 5,
    things: [W('rabbit', 2), W('penguin', 2), O('gate', 4, 0.4), O('keeper', 3, 0.64), O('hole', 2, 0.87), T('lion', 1, 0.5, 0.8), T('drum', 4, 0.24, 0.83), T('icecream', 1, 0.36, 1.24)],
  },
  {
    name: '누름판 정문', ch: 2, news: '누름판 — 그 위의 것이 커다래지면 쇠창살 정문이 올라가요', hint: '누름판 위의 팝콘을 보세요', par: 1, spot: 4,
    things: [W('penguin', 2), W('lion', 4), O('hole', 2, 0.42), O('iron', 0, 0.8, { ref: 4 }), T('popcorn', 1, 0.6, 0.82), T('statue', 5, 0.2, 0.82), T('icecream', 2, 0.46, 1.24)],
  },
  {
    name: '사육사 둘', ch: 2, news: '사육사가 둘! 한 번에 둘 다 쫓을 수 있을까?', hint: '우리 안의 사자를 기억하나요?', par: 2,
    things: [
      W('penguin', 2), W('rabbit', 2), O('gate', 3, 0.32), O('keeper', 2, 0.54), T('hat', 1, 0.54, 0.7, { ref: 3 }), O('keeper', 4, 0.74), O('hole', 2, 0.9),
      T('lion', 1, 0.42, 0.8), T('statue', 5, 0.18, 0.82),
    ],
  },
  {
    name: '대탈출', ch: 2, news: '', hint: '모두 함께 정문 밖으로!', par: 3,
    things: [
      W('elephant', 4), W('mouse', 1), W('lion', 2), O('hole', 1, 0.3), O('pond', 3, 0.5), O('keeper', 3, 0.7), O('iron', 0, 0.88, { ref: 9 }),
      T('apple', 1, 0.8, 0.68, { trk: [[0.8, 0.68], [0.74, 0.86], [0.7, GY], [0.62, 1.14], [0.5, 1.27]] }), T('statue', 5, 0.18, 0.82), T('popcorn', 1, 0.48, 0.82),
    ],
  },
];
export const STAGE_COUNT = STAGES.length;
const SWAP_T = 9, RESULT_T = 210, FAIL_T = 120, CLEAR_PTS = 100, STAR_PTS = 100, HEART_PTS = 100;
const budgetOf = (d: StageDef) => Math.max(4, d.par + 3);
const josa = (w: string) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '을' : '를');
/** 별 조건(쉬운 말, 판마다 하나씩 늘어난다): 1판 탈출 · 2판 +한 번만 · 3판부터 +n번 안에 */
function starsOf(i: number): { label: string; short: string; max: number }[] {
  const d = STAGES[i], ws = d.things.filter((t) => t.walk), who = ws.length > 1 ? '' : K[ws[0].k].name;
  const n = ['', '한', '두', '세', '네', '다섯', '여섯'];
  const out = [{ label: who ? `${who}${josa(who)} 출구로` : '모두 출구로', short: who ? `${who} 탈출` : '모두 탈출', max: 99 }];
  if (i >= 2) out.push({ label: `${n[d.par + 1]} 번 안에 바꾸기`, short: `${n[d.par + 1]} 번 안에`, max: d.par + 1 });
  if (i >= 1) out.push({ label: d.par === 1 ? '한 번만 바꾸기' : `${n[d.par]} 번 안에 바꾸기`, short: d.par === 1 ? '한 번만' : `${n[d.par]} 번 안에`, max: d.par });
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
    case 'hole': return 0.05;
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
  let x = 0.25, ph = 0;
  for (const o of th) {
    if (!o.walk) continue;
    o.qi = w.walkers.length;
    if (o.qi > 0) x -= ph + half(o) + 0.03;
    else x -= half(o);
    o.s = x - PATH[0][0];
    ph = half(o);
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
    case 'gate': return o.open > 0;
    case 'keeper': return !onDuty(w, o);
    case 'pond': return !!K[wk.k].swim || heightOf(wk) > o.z || bridged(w, o) || filled(w, o);
    case 'iron': return pressed(w, o);
    default: return true;
  }
}
function contact(w: World, o: Th, wk: Th) {
  if (o.c === 'gate' && !o.open && wk.z >= o.z) (o.open = 1), lg(w, 'gate', o.id, wk.id);
  else if (o.c === 'keeper' && onDuty(w, o)) {
    if (wk.z > o.z) (o.open = 1), lg(w, 'flee', o.id, wk.id);
    else (wk.st = 3), (w.fail = 1), lg(w, 'caught', o.id, wk.id);
  }
}
const vmaxOf = (o: Th) => 0.24 + 0.04 * o.z;

/** 동물 하나: 앞의 막힌 곳(또는 앞 동물)까지 걷는다 */
function walkerTick(w: World, wk: Th, ahead: Th | null) {
  if (wk.st >= 2) return;
  let lim = w.path.L + 1, blk = -1, fwd = -1;
  for (const id of w.obs) {
    const o = w.th[id];
    if (wk.s > o.at + depth(o) + half(wk)) continue;
    // 몸 가운데가 이미 지나갔으면 지나간 것 — 커져서 꼬리가 끼면 앞으로 쑥 밀려 나온다
    if (wk.s >= o.at) {
      if (!passable(w, o, wk)) fwd = Math.max(fwd, o.at + depth(o) + half(wk) + 0.004);
      continue;
    }
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
  if (fwd > wk.s && fwd <= lim) {
    wk.s = Math.min(fwd, wk.s + 0.5 * TK);
    wk.v = 0;
    wk.st = 0;
    wk.blk = blk;
    syncXY(w, wk);
    return;
  }
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
    if (wk.s <= lim + 0.0004) (wk.st = 1), blk >= 0 && w.t > 5 && lg(w, 'squeeze', wk.id, blk);
  } else {
    wk.v = 0;
    if (was === 0 && blk >= 0) lg(w, 'bonk', wk.id, blk);
    wk.st = 1;
  }
  wk.blk = blk;
  if (wk.s >= w.path.L) (wk.st = 2), lg(w, 'out', wk.id);
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
  const step = Math.max(r.tv, 0.2) * TK;
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
  r.tv = Math.min(0.85 + 0.08 * r.z, Math.max(0.2, r.tv) + 2.4 * TK);
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
  // 사자: 사육사보다 크면 어흥! — 멀리 있어도 그 사육사는 도망간다
  for (const ln of w.th) {
    if (!K[ln.k].roar || (ln.walk && ln.st >= 2)) continue;
    for (const kp of w.th) if (kp.c === 'keeper' && onDuty(w, kp) && ln.z > kp.z) (kp.open = 1), lg(w, 'roar', kp.id, ln.id);
  }
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
  /** 다리·모자·누름판 상태(바뀌는 순간을 잡으려고) */
  flags: boolean[];
  /** 판마다 가장 많이 딴 별 · 별 더 따기 횟수 */
  best: number[]; replays: number;
}
const thName = (w: World, o: Th) => (o.c === 'hole' ? HOLE_NAME[w.ch] : K[o.k].name);
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
  s.flags = s.w.th.map((o) => (o.c === 'pond' ? bridged(s.w, o) : o.c === 'keeper' ? !onDuty(s.w, o) : o.c === 'iron' ? pressed(s.w, o) : false));
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
  // 같은 판을 다시 깨면 늘어난 별만 더한다
  const best = s.best[s.stage];
  s.pts += best === undefined ? CLEAR_PTS + s.got * STAR_PTS : Math.max(0, s.got - best) * STAR_PTS;
  s.best[s.stage] = Math.max(best ?? 0, s.got);
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
/** 결과 카드의 '별 더 따기'·'다음 판' 단추 */
export const REPLAY: [number, number, number, number] = [0.3, 1.255, 0.34, 0.075];
export const NEXT: [number, number, number, number] = [0.7, 1.255, 0.34, 0.075];
/** 톡 했을 때 그 물건의 가운데(가로 폭 단위) — 그림·봇·맞히기가 같은 것을 쓴다 */
export function hitCenter(w: World, o: Th): P2 {
  const r = RZ[Math.max(1, o.z)];
  switch (o.c) {
    case 'hole': return [o.x, GY - blockH(o.z) * 0.5];
    case 'gate': return [o.x, GY - doorH(o.z) * 0.5];
    case 'pond': return [o.x, GY + 0.035];
    case 'keeper': return [o.x, GY - keeperH(o.z) * 0.5];
    case 'hat': {
      const kp = w.th[o.ref];
      return [kp.x + 0.01, GY - keeperH(kp.z) - Math.max(0.02, RZ[o.z] * 0.6)];
    }
    case 'log': return [o.x, GY - 0.04];
    default: return o.walk ? [o.x, GY - r * 0.95] : [o.x, o.y - r * 0.85];
  }
}
/** 구멍(굴) 높이 · 벽 높이 · 문 높이 · 사육사 키 (가로 폭 단위) */
/** 키 칸 → 반지름(기린은 키가 6·7까지) */
const HZ = (z: number) => RZ[Math.min(5, Math.max(1, z))] + Math.max(0, z - 5) * 0.036;
export const holeH = (z: number) => HZ(z) * 2.1;
export const blockH = (z: number) => Math.max(0.15, holeH(z) + 0.05);
export const doorH = (z: number) => 0.05 + 0.028 * z;
export const keeperH = (z: number) => RZ[z] * 2.4;
function pick(s: SwapState, x: number, y: number): number {
  let best = -1, bs = 1e9;
  for (const o of s.w.th) {
    if (!swappable(o)) continue;
    // 1판 첫 톡(코끼리가 이미 반짝): 아무 데나 톡 해도 가장 가까운 것과 뿅 — 첫 손길이 곧 가장 시원한 순간
    if (s.lock && o.id === s.sel) continue;
    const [cx, cy] = hitCenter(s.w, o), r = Math.max(0.07, RZ[Math.max(1, o.z)] * 1.05), d = Math.hypot(x - cx, y - cy);
    if (d > r + 0.09 && !s.lock) continue;
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
  // 첫 뿅부터는 안내 띠·NEW 표시를 걷어 장면이 잘 보이게
  if (s.banner && s.t - s.banner.t < 200) s.banner.t = s.t - 200;
  s.spot = null;
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
          const subj = big.z >= 5 || small.z > 1 ? big : small, [bx, by] = hitCenter(w, subj);
          wow(s, big.z >= 5 ? `${SIZE_WORD[5]} ${thName(w, big)}!` : small.z <= 1 ? `${SIZE_WORD[1]} ${thName(w, small)}!` : `뿅! ${thName(w, big)} 쑥!`, bx, Math.min(0.72, by - RZ[subj.z] * 2 - 0.16));
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
      case 'roar': see(s, 'roar'), wow(s, '어흥! 사육사 도망!', A_!.x, GY - 0.2); break;
    }
  }
  w.log.length = 0;
  // 상태가 바뀌어 생긴 큰 순간: 다리가 놓임 · 모자가 사육사를 덮음 · 누름판이 눌림
  for (const o of w.th) {
    const on = o.c === 'pond' ? bridged(w, o) : o.c === 'keeper' ? !o.open && !onDuty(w, o) : o.c === 'iron' ? pressed(w, o) : false;
    const was = s.flags[o.id] ?? false;
    if (on !== was) {
      s.flags[o.id] = on;
      if (on && w.t > 1) {
        const k = o.c === 'pond' ? 'bridge' : o.c === 'keeper' ? 'cover' : 'press';
        ev(s, k, o.id);
        see(s, k);
        wow(s, k === 'bridge' ? '쿵! 통나무 다리!' : k === 'cover' ? '폭! 모자에 쏙!' : '철컥! 정문이 열려요!', o.x, GY - 0.22);
      } else if (!on && w.t > 1) ev(s, o.c === 'iron' ? 'unpress' : 'undo', o.id);
    }
  }
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
      firstTap: -1, firstBig: -1, wowN: 0, seen: new Set<string>(), events: [], banner: null, spot: null, big: null, flags: [], best: [], replays: 0,
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
      const replay = fresh && s.pt > 60 && s.got < s.ofStars && !s.won && inBox(p!.x, p!.y * A, REPLAY);
      if (replay) (s.replays++, newStage(s, false), ev(s, 'retry'));
      else if (s.pt >= RESULT_T + (s.got < s.ofStars ? 90 : 0) || (fresh && s.pt > 60)) {
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
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const OUT = '#4a2a12';
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number, k = 0.45, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, q = i % 2 ? r * k : r;
    if (i) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function stroke(ctx: C2, col: string, lw: number) {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}
const BGC = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}

// ── 장마다 색 ──
interface Pal { sky: [string, string, string]; far: string; hill: [string, string]; lawn: [string, string]; walk: [string, string]; edge: [string, string]; fg: [string, string]; tree: [string, string]; trunk: string }
const PAL: Pal[] = [
  { sky: ['#6fcaff', '#bfeaff', '#fff5d2'], far: '#b9e6a2', hill: ['#a8e07a', '#86cc58'], lawn: ['#9fdc6a', '#7cc64e'], walk: ['#f6e1ad', '#e4c487'], edge: ['#c08f55', '#8e6236'], fg: ['#93d861', '#6bbd43'], tree: ['#6cc24f', '#4ea63a'], trunk: '#8a5a32' },
  { sky: ['#ffc977', '#ffe6ad', '#fff3d6'], far: '#f0cf8a', hill: ['#e6c66a', '#cfa94a'], lawn: ['#d9cc68', '#bfb24c'], walk: ['#ecc08e', '#d39a62'], edge: ['#a3633a', '#7a4524'], fg: ['#c9d05c', '#a6b941'], tree: ['#8fbf45', '#6fa233'], trunk: '#7a4a2a' },
  { sky: ['#82d4ff', '#cdefff', '#fff1e4'], far: '#c9dff0', hill: ['#9fdc6a', '#7fc650'], lawn: ['#a3dc72', '#82c656'], walk: ['#efe3d0', '#d6c4a8'], edge: ['#a8957c', '#80705c'], fg: ['#9fdc6a', '#76c24a'], tree: ['#5fbf58', '#43a142'], trunk: '#86603a' },
];

/** 장마다 굳은 배경(하늘·먼 풍경·언덕·산책로·앞 잔디) — 한 번만 그려 두고 쓴다 */
function getBg(ch: number, w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${ch}|${w}x${h}@${sc}`;
  const hit = BGC.get(key);
  if (hit) return hit;
  const P = PAL[ch], R = (v: number) => v * w;
  const c = layer(w, h, sc, (g) => {
    // 하늘
    g.fillStyle = lin(g, 0, 0, 0, R(0.72), [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, R(0.76));
    g.fillStyle = radg(g, R(0.84), R(0.2), 0, R(0.5), [0, 'rgba(255,252,220,.95)'], [0.25, 'rgba(255,246,200,.4)'], [1, 'rgba(255,246,200,0)']);
    g.fillRect(0, 0, w, R(0.8));
    // 먼 산/건물
    g.fillStyle = P.far;
    g.beginPath();
    g.moveTo(0, R(0.72));
    for (let x = 0; x <= 1.001; x += 0.02) g.lineTo(R(x), R(0.57 - 0.05 * Math.sin(x * 5 + ch) - 0.025 * Math.sin(x * 13 + ch * 2)));
    g.lineTo(w, R(0.72));
    g.fill();
    if (ch === 2) {
      // 정문 광장: 먼 곳의 동물원 건물 지붕들
      for (let i = 0; i < 5; i++) {
        const bx = R(0.06 + i * 0.22), by = R(0.57 + hsh(i) * 0.03), bw = R(0.14), bh = R(0.08);
        g.fillStyle = ['#f6d7b0', '#ffe4c4', '#f0c8a0'][i % 3];
        g.fillRect(bx - bw / 2, by - bh, bw, bh + R(0.1));
        g.fillStyle = ['#e0675a', '#5aa0e0', '#f0a030'][i % 3];
        g.beginPath();
        g.moveTo(bx - bw * 0.62, by - bh);
        g.lineTo(bx, by - bh - R(0.06));
        g.lineTo(bx + bw * 0.62, by - bh);
        g.fill();
        g.fillStyle = 'rgba(80,120,170,.6)';
        for (let k = 0; k < 2; k++) g.fillRect(bx - bw * 0.3 + k * bw * 0.4, by - bh * 0.6, bw * 0.18, bh * 0.3);
      }
    }
    // 언덕 두 겹
    for (const [yy, col, amp, ph] of [[0.65, P.hill[0], 0.035, 1], [0.72, P.hill[1], 0.025, 4]] as [number, string, number, number][]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, R(GY));
      for (let x = 0; x <= 1.001; x += 0.02) g.lineTo(R(x), R(yy - amp * Math.sin(x * 6 + ph) - amp * 0.5 * Math.sin(x * 15 + ph * 2)));
      g.lineTo(w, R(GY));
      g.closePath();
      g.fill();
    }
    // 뒤 잔디(산책로 뒤) + 깎은 줄
    g.fillStyle = lin(g, 0, R(0.74), 0, R(GY), [0, P.lawn[0]], [1, P.lawn[1]]);
    g.beginPath();
    g.moveTo(0, R(0.78));
    for (let x = 0; x <= 1.001; x += 0.05) g.lineTo(R(x), R(0.765 - 0.012 * Math.sin(x * 9 + ch)));
    g.lineTo(w, R(GY));
    g.lineTo(0, R(GY));
    g.fill();
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(255,255,230,.08)';
      g.fillRect(0, R(0.79 + i * 0.032), w, R(0.014));
    }
    // 먼 나무들(장마다 모양)
    for (let i = 0; i < 7; i++) {
      const tx = R(0.04 + i * 0.155 + hsh(i + 40) * 0.05), ty = R(0.69 + hsh(i + 41) * 0.05), tr = R(0.035 + hsh(i + 42) * 0.02);
      g.fillStyle = P.trunk;
      g.fillRect(tx - tr * 0.12, ty - tr * 0.6, tr * 0.24, tr * 0.8);
      if (ch === 1) {
        // 아카시아: 납작한 우산 모양
        g.fillStyle = i % 2 ? P.tree[0] : P.tree[1];
        ell(g, tx, ty - tr * 0.9, tr * 1.6, tr * 0.42);
        g.fill();
        g.fillStyle = 'rgba(255,240,180,.3)';
        ell(g, tx - tr * 0.3, ty - tr * 1.05, tr * 0.9, tr * 0.18);
        g.fill();
      } else {
        g.fillStyle = i % 2 ? P.tree[0] : P.tree[1];
        g.beginPath();
        g.arc(tx, ty - tr * 1.05, tr, 0, TAU);
        g.arc(tx - tr * 0.65, ty - tr * 0.65, tr * 0.7, 0, TAU);
        g.arc(tx + tr * 0.65, ty - tr * 0.65, tr * 0.7, 0, TAU);
        g.fill();
        g.fillStyle = 'rgba(255,255,220,.3)';
        g.beginPath();
        g.arc(tx - tr * 0.3, ty - tr * 1.35, tr * 0.42, 0, TAU);
        g.fill();
      }
    }
    // 뒤 울타리(관람로) — 아기 동물 마을은 흰 울타리, 숲은 통나무, 광장은 쇠 난간
    const fy = R(0.775);
    for (let x = 0.01; x < 1; x += 0.045) {
      g.fillStyle = ch === 0 ? '#ffffff' : ch === 1 ? '#a87444' : '#6f7d8c';
      rr(g, R(x) - R(0.006), fy - R(0.05), R(0.012), R(0.055), R(0.004));
      g.fill();
    }
    g.fillStyle = ch === 0 ? '#f4f4f4' : ch === 1 ? '#946238' : '#5f6d7c';
    g.fillRect(0, fy - R(0.04), w, R(0.008));
    g.fillRect(0, fy - R(0.02), w, R(0.008));

    // ── 산책로(옆에서 본 길): 윗면 + 앞면 두께 ──
    const top = R(GY - 0.05), fr = R(GY + 0.05), bot = R(GY + 0.11);
    g.fillStyle = 'rgba(40,60,20,.25)';
    g.fillRect(0, bot, w, R(0.02));
    g.fillStyle = lin(g, 0, top, 0, fr, [0, P.walk[1]], [0.5, P.walk[0]], [1, P.walk[0]]);
    g.fillRect(0, top, w, fr - top);
    // 윗면 무늬: 아기 마을 모래 자갈 · 숲 흙 · 광장 돌바닥
    for (let i = 0; i < 70; i++) {
      const px = R(hsh(i + 60)), py = top + (fr - top) * (0.15 + 0.75 * hsh(i + 61));
      if (ch === 2) continue;
      g.fillStyle = `rgba(120,80,40,${0.08 + 0.1 * hsh(i + 62)})`;
      ell(g, px, py, R(0.006 + 0.004 * hsh(i + 63)), R(0.003));
      g.fill();
    }
    if (ch === 2) {
      g.strokeStyle = 'rgba(120,100,80,.28)';
      g.lineWidth = 1;
      for (let row = 0; row < 3; row++) {
        const yy = top + (fr - top) * (row / 3);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(w, yy);
        g.stroke();
        for (let x = (row % 2) * 0.03; x < 1.05; x += 0.06) {
          g.beginPath();
          g.moveTo(R(x), yy);
          g.lineTo(R(x) - R(0.006), yy + (fr - top) / 3);
          g.stroke();
        }
      }
    }
    // 앞면(두께)
    g.fillStyle = lin(g, 0, fr, 0, bot, [0, P.edge[0]], [1, P.edge[1]]);
    g.fillRect(0, fr, w, bot - fr);
    g.fillStyle = 'rgba(255,255,255,.28)';
    g.fillRect(0, fr, w, R(0.006));
    if (ch === 0) {
      // 나무 판자 모서리
      g.strokeStyle = 'rgba(70,40,15,.35)';
      g.lineWidth = 1;
      for (let x = 0; x < 1.05; x += 0.085) {
        g.beginPath();
        g.moveTo(R(x), fr);
        g.lineTo(R(x), bot);
        g.stroke();
      }
    } else {
      // 돌 쌓기
      g.strokeStyle = 'rgba(60,35,20,.3)';
      g.lineWidth = 1;
      for (let row = 0; row < 2; row++) {
        const yy = fr + (bot - fr) * (row / 2);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(w, yy);
        g.stroke();
        for (let x = row * 0.04; x < 1.05; x += 0.08) {
          g.beginPath();
          g.moveTo(R(x), yy);
          g.lineTo(R(x), yy + (bot - fr) / 2);
          g.stroke();
        }
      }
    }
    // ── 앞 잔디 ──
    g.fillStyle = lin(g, 0, bot, 0, R(1.4), [0, P.fg[0]], [1, P.fg[1]]);
    g.fillRect(0, bot, w, R(1.4) - bot);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(255,255,230,.07)';
      g.fillRect(0, R(1.14 + i * 0.05), w, R(0.025));
    }
    // 앞 잔디 위 꽃·풀
    for (let i = 0; i < 26; i++) {
      const fx = R(0.66 * hsh(i + 80)), fy2 = R(1.15 + 0.22 * hsh(i + 81)), k = R(0.008 + 0.005 * hsh(i + 82));
      if (ch === 1) {
        g.strokeStyle = 'rgba(120,110,40,.6)';
        g.lineWidth = 1.2;
        g.beginPath();
        for (const a of [-0.4, 0, 0.4]) {
          g.moveTo(fx, fy2);
          g.lineTo(fx + Math.sin(a) * k * 3, fy2 - Math.cos(a) * k * 3);
        }
        g.stroke();
      } else {
        g.fillStyle = ['#ffffff', '#ffd84a', '#ff9ec4', '#b9a2ff'][i % 4];
        for (let q = 0; q < 5; q++) {
          ell(g, fx + Math.cos((q * TAU) / 5) * k, fy2 + Math.sin((q * TAU) / 5) * k, k * 0.75, k * 0.75);
          g.fill();
        }
        g.fillStyle = '#ffb020';
        ell(g, fx, fy2, k * 0.55, k * 0.55);
        g.fill();
      }
    }
    // ── 출구 밖 들판(탈출한 친구들이 모이는 곳): 오른쪽 앞 ──
    const mx = R(0.69), my = R(GY + 0.13);
    g.fillStyle = lin(g, 0, my, 0, R(1.39), [0, '#c4f08a'], [1, '#a2df6a']);
    g.beginPath();
    g.moveTo(mx + R(0.03), my);
    g.quadraticCurveTo(mx - R(0.02), R(1.25), mx, R(1.39));
    g.lineTo(w, R(1.39));
    g.lineTo(w, my);
    g.closePath();
    g.fill();
    for (let i = 0; i < 9; i++) {
      g.fillStyle = ['#ffffff', '#ffd84a', '#ff9ec4'][i % 3];
      ell(g, R(0.74 + 0.25 * hsh(i + 140)), R(1.17 + 0.2 * hsh(i + 141)), R(0.006), R(0.006));
      g.fill();
    }
    for (let y2 = 1.14; y2 < 1.39; y2 += 0.055) {
      g.fillStyle = '#c99a62';
      rr(g, R(0.69 + (y2 - 1.14) * -0.08) - R(0.006), R(y2) - R(0.035), R(0.012), R(0.04), R(0.004));
      g.fill();
    }
    g.fillStyle = '#ffffff';
    rr(g, R(0.79), my + R(0.008), R(0.16), R(0.032), R(0.01));
    g.fill();
    g.fillStyle = '#3e9a43';
    g.font = `800 ${Math.max(9, R(0.021))}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('탈출한 친구들', R(0.87), my + R(0.024));
    // ── 왼쪽 우리(동물이 사는 곳) ──
    const pr = R(0.29);
    g.fillStyle = 'rgba(0,0,0,.12)';
    g.fillRect(0, top - R(0.01), pr, R(0.012));
    // 우리 집
    const hx = R(0.07), hy = R(GY - 0.05);
    g.fillStyle = ch === 0 ? '#e8584a' : ch === 1 ? '#c98a4a' : '#5a9be0';
    g.fillRect(hx - R(0.065), hy - R(0.12), R(0.13), R(0.12));
    g.fillStyle = ch === 0 ? '#b8392e' : ch === 1 ? '#8e5a2a' : '#3a6fb0';
    g.beginPath();
    g.moveTo(hx - R(0.085), hy - R(0.12));
    g.lineTo(hx, hy - R(0.19));
    g.lineTo(hx + R(0.085), hy - R(0.12));
    g.fill();
    g.fillStyle = '#4a2a12';
    rr(g, hx - R(0.025), hy - R(0.07), R(0.05), R(0.07), R(0.02));
    g.fill();
    g.fillStyle = '#fff6dc';
    rr(g, hx - R(0.05), hy - R(0.165), R(0.1), R(0.03), R(0.01));
    g.fill();
    g.fillStyle = '#4a2a12';
    g.font = `800 ${Math.max(9, R(0.022))}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('우리', hx, hy - R(0.15));
    // ── 오른쪽 출구 아치 ──
    const ex = R(0.965);
    for (const sd of [-1, 1]) {
      g.fillStyle = lin(g, ex + sd * R(0.04) - R(0.012), 0, ex + sd * R(0.04) + R(0.012), 0, [0, '#c9a06a'], [1, '#9a7040']);
      rr(g, ex + sd * R(0.04) - R(0.012), R(GY - 0.27), R(0.024), R(0.27), R(0.006));
      g.fill();
    }
  });
  BGC.set(key, c);
  return c;
}

// ── 동물(옆모습, 오른쪽을 본다) ──
type Face = 'idle' | 'shock' | 'strain' | 'happy' | 'scared' | 'dizzy' | 'proud';
interface Look { t: number; ph: number; face: Face; sq: number; lift: number; walk: number; tall: number; swim: number; seed: number }
const SKIN: Record<string, { a: string; b: string; belly: string; dark: string }> = {
  elephant: { a: '#c3cedb', b: '#8f9db0', belly: '#d8e0ea', dark: '#6c7a8e' },
  mouse: { a: '#d4c3b2', b: '#a08c7a', belly: '#f1e6da', dark: '#7a6656' },
  rabbit: { a: '#ffffff', b: '#dfe3ec', belly: '#ffffff', dark: '#b8bfcc' },
  piglet: { a: '#ffd0da', b: '#f59ab0', belly: '#ffe2e8', dark: '#d97690' },
  hippo: { a: '#b8aad6', b: '#8676a8', belly: '#dccbe6', dark: '#655789' },
  giraffe: { a: '#ffd85a', b: '#efb23a', belly: '#fff0b8', dark: '#c47a2c' },
  turtle: { a: '#b6e48a', b: '#86c45c', belly: '#e6f5b8', dark: '#4f8a35' },
  panda: { a: '#ffffff', b: '#e3e6ee', belly: '#ffffff', dark: '#2d2d38' },
  penguin: { a: '#3b4560', b: '#232a3c', belly: '#ffffff', dark: '#151a28' },
  lion: { a: '#ffcf62', b: '#e7a33a', belly: '#ffe6a8', dark: '#b9701e' },
};
function eyeAt(ctx: C2, x: number, y: number, s: number, face: Face, L: Look) {
  const blink = face === 'idle' && (L.t + L.seed * 53) % 200 < 6;
  ctx.lineCap = 'round';
  if (face === 'happy' || face === 'proud' || blink) {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.2, s * 0.45);
    ctx.beginPath();
    if (blink) (ctx.moveTo(x - s, y), ctx.lineTo(x + s, y));
    else ctx.arc(x, y + s * 0.5, s, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    return;
  }
  if (face === 'strain') {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.2, s * 0.42);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.7);
    ctx.lineTo(x + s * 0.6, y);
    ctx.lineTo(x - s, y + s * 0.7);
    ctx.stroke();
    return;
  }
  if (face === 'dizzy') {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1, s * 0.3);
    ctx.beginPath();
    for (let q = 0; q < 12; q++) {
      const a = q * 0.8 + L.t * 0.3, r2 = s * 0.12 + q * s * 0.09;
      q ? ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    return;
  }
  const big = face === 'shock' || face === 'scared' ? 1.35 : 1;
  ctx.fillStyle = '#ffffff';
  ell(ctx, x, y, s * 1.05 * big, s * 1.2 * big);
  ctx.fill();
  stroke(ctx, '#2a1608', Math.max(0.8, s * 0.22));
  ctx.fillStyle = '#2a1608';
  const pr = face === 'shock' || face === 'scared' ? 0.45 : 0.78;
  ell(ctx, x + s * 0.18, y + s * 0.05, s * pr, s * pr * 1.12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, x + s * 0.38, y - s * 0.3, s * 0.3, s * 0.3);
  ctx.fill();
}
function mouthAt(ctx: C2, x: number, y: number, s: number, face: Face) {
  ctx.strokeStyle = '#5a2a14';
  ctx.lineWidth = Math.max(1, s * 0.3);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (face === 'shock' || face === 'scared') {
    ctx.fillStyle = '#7a2a1a';
    ell(ctx, x, y + s * 0.3, s * 0.55, s * 0.75);
    ctx.fill();
    return;
  }
  if (face === 'happy' || face === 'proud') {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.8, 0.1, Math.PI - 0.1);
    ctx.fill();
    return;
  }
  if (face === 'strain') (ctx.moveTo(x - s * 0.6, y + s * 0.2), ctx.lineTo(x + s * 0.6, y));
  else ctx.arc(x, y - s * 0.2, s * 0.6, 0.3, Math.PI - 0.3);
  ctx.stroke();
}
function blush(ctx: C2, x: number, y: number, s: number) {
  ctx.fillStyle = 'rgba(255,120,140,.45)';
  ell(ctx, x, y, s * 1.2, s * 0.7);
  ctx.fill();
}
/** 다리 하나(둥근 막대) */
function leg(ctx: C2, x: number, y0: number, len: number, wd: number, ang: number, col: string, hoof?: string) {
  ctx.save();
  ctx.translate(x, y0);
  ctx.rotate(ang);
  ctx.fillStyle = col;
  rr(ctx, -wd / 2, 0, wd, len, wd * 0.45);
  ctx.fill();
  stroke(ctx, OUT, Math.max(1, wd * 0.16));
  if (hoof) {
    ctx.fillStyle = hoof;
    rr(ctx, -wd / 2, len - wd * 0.42, wd, wd * 0.42, wd * 0.2);
    ctx.fill();
  }
  ctx.restore();
}
/** 동물 하나: (x, y)는 발밑, r은 크기 반지름(px) */
function drawAnimal(ctx: C2, k: Kind, x: number, y: number, r: number, L: Look) {
  const S = SKIN[k] ?? SKIN.mouse, lw = Math.max(1.2, r * 0.07);
  ctx.save();
  ctx.translate(x, y - L.lift);
  ctx.scale(1 + L.sq, 1 - L.sq);
  const sw = Math.sin(L.ph) * 0.42 * L.walk, bob = Math.abs(Math.sin(L.ph)) * r * 0.05 * L.walk;
  ctx.translate(0, -bob);
  const body = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.fillStyle = lin(ctx, 0, cy - ry, 0, cy + ry, [0, S.a], [1, S.b]);
    ell(ctx, cx, cy, rx, ry);
    ctx.fill();
    stroke(ctx, OUT, lw);
  };
  const face = L.face;
  switch (k) {
    case 'penguin': {
      // 서 있는 몸
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#ff9a2a';
        ell(ctx, sd * r * 0.22 + r * 0.1 + (sd > 0 ? sw : -sw) * r * 0.2, -r * 0.05, r * 0.24, r * 0.1);
        ctx.fill();
      }
      ctx.fillStyle = lin(ctx, -r * 0.6, 0, r * 0.6, 0, [0, S.b], [1, S.a]);
      ell(ctx, 0, -r * 0.95, r * 0.62, r * 0.98);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#ffffff';
      ell(ctx, r * 0.2, -r * 0.82, r * 0.4, r * 0.75);
      ctx.fill();
      // 날개
      ctx.save();
      ctx.translate(-r * 0.15, -r * 1.05);
      ctx.rotate(0.25 + Math.sin(L.t * 0.25) * 0.15 * (L.walk + 0.3));
      ctx.fillStyle = S.b;
      ell(ctx, 0, r * 0.35, r * 0.16, r * 0.45);
      ctx.fill();
      ctx.restore();
      // 부리
      ctx.fillStyle = '#ffa53a';
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 1.55);
      ctx.lineTo(r * 0.9, -r * 1.45);
      ctx.lineTo(r * 0.5, -r * 1.38);
      ctx.fill();
      eyeAt(ctx, r * 0.32, -r * 1.62, r * 0.1, face, L);
      blush(ctx, r * 0.36, -r * 1.36, r * 0.1);
      break;
    }
    case 'turtle': {
      for (const [lx, far] of [[-0.55, 1], [0.45, 1], [-0.45, 0], [0.55, 0]] as [number, number][]) leg(ctx, r * lx, -r * 0.35, r * 0.36, r * 0.26, (far ? -sw : sw) * 0.6, far ? S.b : S.a);
      // 머리·목
      ctx.fillStyle = S.a;
      rr(ctx, r * 0.55, -r * 0.62, r * 0.55, r * 0.24, r * 0.12);
      ctx.fill();
      ell(ctx, r * 1.12, -r * 0.62, r * 0.32, r * 0.27);
      ctx.fill();
      stroke(ctx, OUT, lw);
      eyeAt(ctx, r * 1.18, -r * 0.7, r * 0.1, face, L);
      mouthAt(ctx, r * 1.3, -r * 0.54, r * 0.09, face);
      // 등껍질
      ctx.fillStyle = lin(ctx, 0, -r * 1.25, 0, -r * 0.3, [0, '#6fcf55'], [1, '#2f8a35']);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.4, r * 0.98, r * 0.82, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = 'rgba(220,255,180,.55)';
      ctx.lineWidth = Math.max(1, r * 0.06);
      for (const [hx, hy] of [[-0.45, -0.62], [0.05, -0.85], [0.5, -0.6], [-0.1, -0.5]]) {
        ctx.beginPath();
        for (let q = 0; q < 6; q++) {
          const a = (q * TAU) / 6;
          ctx[q ? 'lineTo' : 'moveTo'](r * hx + Math.cos(a) * r * 0.2, r * hy + Math.sin(a) * r * 0.17);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.fillStyle = '#c9ef98';
      rr(ctx, -r * 1.0, -r * 0.46, r * 2.0, r * 0.14, r * 0.07);
      ctx.fill();
      break;
    }
    default: {
      const g = k === 'giraffe', legLen = g ? r * 0.95 : k === 'piglet' || k === 'hippo' ? r * 0.38 : r * 0.48;
      const by = -legLen - r * 0.55, legW = k === 'elephant' || k === 'hippo' ? r * 0.36 : g ? r * 0.18 : r * 0.24;
      const hoof = g ? '#6a3a1a' : k === 'piglet' ? '#b85a70' : k === 'elephant' ? '#eef2f6' : k === 'panda' ? undefined : undefined;
      const legCol = k === 'panda' ? S.dark : undefined;
      // 꼬리
      ctx.strokeStyle = k === 'mouse' ? '#e0a0a0' : k === 'piglet' ? S.b : S.dark;
      ctx.lineWidth = Math.max(1, r * (k === 'mouse' ? 0.07 : 0.08));
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (k === 'mouse') (ctx.moveTo(-r * 0.85, by + r * 0.2), ctx.bezierCurveTo(-r * 1.5, by + r * 0.4, -r * 1.7, by - r * 0.5, -r * 1.35, by - r * 0.6));
      else if (k === 'piglet') {
        ctx.moveTo(-r * 0.92, by - r * 0.1);
        for (let q = 0; q <= 14; q++) {
          const a = q * 0.75, rd = r * 0.05 + q * r * 0.012;
          ctx.lineTo(-r * 1.1 + Math.cos(a) * rd, by - r * 0.2 + Math.sin(a) * rd);
        }
      } else if (k !== 'rabbit' && k !== 'panda') (ctx.moveTo(-r * 0.9, by - r * 0.1), ctx.quadraticCurveTo(-r * 1.25, by + r * 0.1, -r * 1.2, by + r * 0.5));
      ctx.stroke();
      if (k === 'lion' || k === 'elephant' || k === 'giraffe') {
        ctx.fillStyle = k === 'lion' ? '#a8521a' : S.dark;
        ell(ctx, -r * 1.2, by + r * 0.55, r * 0.1, r * 0.14);
        ctx.fill();
      }
      // 먼 다리
      leg(ctx, -r * 0.45, by + r * 0.3, legLen + r * 0.2, legW, -sw, legCol ?? S.b, hoof);
      leg(ctx, r * 0.42, by + r * 0.3, legLen + r * 0.2, legW, sw, legCol ?? S.b, hoof);
      // 몸
      if (k === 'rabbit') body(-r * 0.05, by + r * 0.05, r * 0.88, r * 0.66);
      else if (k === 'mouse') body(0, by + r * 0.12, r * 0.92, r * 0.6);
      else body(0, by, r * (g ? 0.92 : 1.0), r * (g ? 0.6 : 0.72));
      if (k === 'panda') {
        ctx.fillStyle = S.dark;
        ctx.beginPath();
        ctx.ellipse(r * 0.2, by - r * 0.1, r * 0.34, r * 0.66, 0.15, 0, TAU);
        ctx.fill();
      }
      if (g) {
        ctx.fillStyle = S.dark;
        for (const [px, py, pr] of [[-0.5, -0.1, 0.18], [-0.1, 0.12, 0.2], [0.35, -0.12, 0.17], [-0.2, -0.38, 0.13], [0.55, 0.2, 0.13]]) {
          ell(ctx, r * px, by + r * py, r * pr, r * pr * 0.8, px);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ell(ctx, -r * 0.2, by - r * 0.38, r * 0.45, r * 0.16, -0.1);
      ctx.fill();
      // 가까운 다리
      leg(ctx, -r * 0.6, by + r * 0.35, legLen + r * 0.2, legW, sw, legCol ?? S.a, hoof);
      leg(ctx, r * 0.55, by + r * 0.35, legLen + r * 0.2, legW, -sw, legCol ?? S.a, hoof);
      if (k === 'rabbit') {
        ctx.fillStyle = '#ffffff';
        ell(ctx, -r * 0.92, by - r * 0.1, r * 0.22, r * 0.2);
        ctx.fill();
        stroke(ctx, OUT, lw * 0.8);
      }
      // 머리 위치
      let hx = r * 0.78, hy = by - r * 0.5, hr = r * 0.58;
      if (k === 'mouse') (hx = r * 0.8), (hy = by - r * 0.15), (hr = r * 0.5);
      if (k === 'piglet') (hy = by - r * 0.35), (hr = r * 0.56);
      if (g) {
        // 긴 목: 키(크기+2)만큼 위로
        const top = -L.tall + r * 0.3;
        hx = r * 0.95;
        hy = top;
        hr = r * 0.4;
        ctx.fillStyle = lin(ctx, r * 0.4, 0, r * 0.95, 0, [0, S.b], [1, S.a]);
        ctx.beginPath();
        ctx.moveTo(r * 0.35, by - r * 0.2);
        ctx.lineTo(r * 0.72, top + r * 0.1);
        ctx.lineTo(r * 1.08, top + r * 0.15);
        ctx.lineTo(r * 0.85, by + r * 0.05);
        ctx.closePath();
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = S.dark;
        for (let q = 0; q < 4; q++) {
          const u = (q + 0.5) / 4;
          ell(ctx, lerp(r * 0.62, r * 0.88, u), lerp(by - r * 0.1, top + r * 0.2, u), r * 0.09, r * 0.12);
          ctx.fill();
        }
        // 갈기
        ctx.strokeStyle = '#a0521a';
        ctx.lineWidth = Math.max(1.5, r * 0.09);
        ctx.beginPath();
        ctx.moveTo(r * 0.38, by - r * 0.25);
        ctx.lineTo(r * 0.72, top + r * 0.12);
        ctx.stroke();
      }
      if (k === 'lion') {
        // 갈기
        ctx.fillStyle = lin(ctx, hx, hy - hr * 1.4, hx, hy + hr * 1.4, [0, '#e2852e'], [1, '#a8521a']);
        ctx.beginPath();
        for (let q = 0; q < 16; q++) {
          const a = (q * TAU) / 16, rd = hr * (q % 2 ? 1.25 : 1.5);
          ctx[q ? 'lineTo' : 'moveTo'](hx - r * 0.06 + Math.cos(a) * rd, hy + Math.sin(a) * rd);
        }
        ctx.closePath();
        ctx.fill();
        stroke(ctx, OUT, lw);
      }
      // 귀(머리 뒤)
      if (k === 'elephant') {
        ctx.save();
        ctx.translate(hx - hr * 0.45, hy + hr * 0.05);
        ctx.rotate(Math.sin(L.t * 0.08 + L.seed) * 0.12);
        ctx.fillStyle = lin(ctx, 0, -hr, 0, hr, [0, S.a], [1, S.b]);
        ell(ctx, 0, 0, hr * 0.78, hr * 0.95);
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = '#f5c2cf';
        ell(ctx, hr * 0.08, hr * 0.05, hr * 0.5, hr * 0.68);
        ctx.fill();
        ctx.restore();
      }
      if (k === 'rabbit') {
        for (const [ax, rot] of [[-0.25, -0.35], [0.12, -0.12]]) {
          ctx.save();
          ctx.translate(hx + hr * ax, hy - hr * 0.7);
          ctx.rotate(rot + Math.sin(L.t * 0.06 + ax * 9) * 0.06);
          ctx.fillStyle = S.a;
          ell(ctx, 0, -hr * 0.85, hr * 0.27, hr * 0.92);
          ctx.fill();
          stroke(ctx, OUT, lw);
          ctx.fillStyle = '#ffc0cf';
          ell(ctx, 0, -hr * 0.85, hr * 0.13, hr * 0.68);
          ctx.fill();
          ctx.restore();
        }
      }
      if (k === 'mouse') {
        for (const ax of [-0.35, 0.2]) {
          ctx.fillStyle = S.a;
          ell(ctx, hx + hr * ax, hy - hr * 0.85, hr * 0.5, hr * 0.5);
          ctx.fill();
          stroke(ctx, OUT, lw);
          ctx.fillStyle = '#ffbfc9';
          ell(ctx, hx + hr * ax, hy - hr * 0.85, hr * 0.32, hr * 0.32);
          ctx.fill();
        }
      }
      if (k === 'panda' || k === 'hippo' || k === 'lion') {
        for (const ax of [-0.45, 0.25]) {
          ctx.fillStyle = k === 'panda' ? S.dark : k === 'lion' ? '#e7a33a' : S.b;
          ell(ctx, hx + hr * ax, hy - hr * 0.82, hr * 0.26, hr * 0.26);
          ctx.fill();
          stroke(ctx, OUT, lw * 0.8);
        }
      }
      // 머리
      if (k === 'hippo') {
        ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, S.a], [1, S.b]);
        rr(ctx, hx - hr * 0.8, hy - hr * 0.85, hr * 2.0, hr * 1.55, hr * 0.7);
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = S.dark;
        for (const nx of [0.75, 1.0]) (ell(ctx, hx + hr * nx, hy - hr * 0.35, hr * 0.08, hr * 0.06), ctx.fill());
      } else if (k === 'mouse') {
        ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, S.a], [1, S.b]);
        ctx.beginPath();
        ctx.ellipse(hx, hy, hr, hr * 0.85, 0, Math.PI * 0.5, Math.PI * 1.5);
        ctx.quadraticCurveTo(hx + hr * 1.5, hy - hr * 0.2, hx + hr * 1.35, hy + hr * 0.15);
        ctx.quadraticCurveTo(hx + hr * 0.9, hy + hr * 0.85, hx, hy + hr * 0.85);
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = '#ff8fa3';
        ell(ctx, hx + hr * 1.38, hy + hr * 0.08, hr * 0.14, hr * 0.12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,50,30,.6)';
        ctx.lineWidth = Math.max(0.8, r * 0.025);
        ctx.beginPath();
        for (const dy of [-0.05, 0.12]) (ctx.moveTo(hx + hr * 1.1, hy + hr * dy), ctx.lineTo(hx + hr * 1.75, hy + hr * (dy * 2 - 0.05)));
        ctx.stroke();
      } else {
        ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, S.a], [1, S.b]);
        if (g) ell(ctx, hx, hy, hr * 1.05, hr * 0.72);
        else ell(ctx, hx, hy, hr, hr * 0.94);
        ctx.fill();
        stroke(ctx, OUT, lw);
      }
      if (g) {
        // 뿔(오시콘)
        ctx.strokeStyle = '#c47a2c';
        ctx.lineWidth = Math.max(1.5, r * 0.07);
        ctx.fillStyle = '#7a3a12';
        for (const ox of [-0.35, 0.05]) {
          ctx.beginPath();
          ctx.moveTo(hx + hr * ox, hy - hr * 0.55);
          ctx.lineTo(hx + hr * ox - hr * 0.08, hy - hr * 1.15);
          ctx.stroke();
          ell(ctx, hx + hr * ox - hr * 0.08, hy - hr * 1.18, hr * 0.13, hr * 0.13);
          ctx.fill();
        }
        ctx.fillStyle = '#fff0b8';
        ell(ctx, hx + hr * 0.7, hy + hr * 0.15, hr * 0.42, hr * 0.32);
        ctx.fill();
      }
      if (k === 'panda') {
        ctx.fillStyle = S.dark;
        ell(ctx, hx + hr * 0.28, hy - hr * 0.08, hr * 0.26, hr * 0.32, -0.4);
        ctx.fill();
      }
      if (k === 'lion') {
        ctx.fillStyle = '#ffe6a8';
        ell(ctx, hx + hr * 0.55, hy + hr * 0.25, hr * 0.42, hr * 0.32);
        ctx.fill();
        ctx.fillStyle = '#6a3410';
        ell(ctx, hx + hr * 0.9, hy + hr * 0.05, hr * 0.12, hr * 0.09);
        ctx.fill();
      }
      if (k === 'piglet') {
        ctx.fillStyle = '#ffb3c4';
        ell(ctx, hx + hr * 0.95, hy + hr * 0.1, hr * 0.26, hr * 0.32);
        ctx.fill();
        stroke(ctx, OUT, lw * 0.8);
        ctx.fillStyle = '#c45a74';
        for (const ny of [-0.06, 0.24]) (ell(ctx, hx + hr * 1.0, hy + hr * ny, hr * 0.05, hr * 0.07), ctx.fill());
        ctx.fillStyle = S.b;
        ctx.beginPath();
        ctx.moveTo(hx - hr * 0.3, hy - hr * 0.75);
        ctx.lineTo(hx + hr * 0.05, hy - hr * 1.15);
        ctx.lineTo(hx + hr * 0.25, hy - hr * 0.62);
        ctx.fill();
      }
      if (k === 'rabbit') {
        ctx.fillStyle = '#ff9fb2';
        ell(ctx, hx + hr * 0.9, hy + hr * 0.05, hr * 0.12, hr * 0.1);
        ctx.fill();
      }
      // 코끼리 코
      if (k === 'elephant') {
        const sway = Math.sin(L.t * 0.07 + L.seed) * 0.15 + (face === 'happy' ? -0.5 : 0);
        ctx.strokeStyle = S.b;
        ctx.lineWidth = hr * 0.42;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + hr * 0.6, hy + hr * 0.2);
        ctx.quadraticCurveTo(hx + hr * 1.35, hy + hr * 0.5, hx + hr * (1.3 + sway * 0.3), hy + hr * (1.2 + sway));
        ctx.stroke();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.strokeStyle = S.a;
        ctx.lineWidth = hr * 0.26;
        ctx.stroke();
      }
      // 얼굴
      const ex = hx + hr * (g ? 0.3 : k === 'hippo' ? 0.25 : 0.38), ey = hy - hr * (k === 'hippo' ? 0.5 : 0.12);
      eyeAt(ctx, ex, ey, Math.max(1.2, hr * (k === 'mouse' ? 0.2 : 0.18)), face, L);
      blush(ctx, ex - hr * 0.05, ey + hr * 0.42, Math.max(1, hr * 0.14));
      if (k !== 'elephant') mouthAt(ctx, hx + hr * (k === 'hippo' ? 0.85 : k === 'piglet' ? 0.62 : 0.68), hy + hr * (k === 'hippo' ? 0.35 : 0.42), Math.max(1, hr * 0.12), face);
    }
  }
  // 땀(낑낑)
  if (face === 'strain' || face === 'scared') {
    ctx.fillStyle = '#7fd4ff';
    const sx = r * 0.3, sy = -r * 2.0 + Math.sin(L.t * 0.3) * r * 0.05;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.18);
    ctx.quadraticCurveTo(sx + r * 0.12, sy, sx, sy + r * 0.06);
    ctx.quadraticCurveTo(sx - r * 0.12, sy, sx, sy - r * 0.18);
    ctx.fill();
  }
  ctx.restore();
}

// ── 사육사(사람, 왼쪽을 본다) ──
type KMode = 'duty' | 'alarm' | 'flee' | 'knock' | 'grin' | 'cover';
function drawKeeper(ctx: C2, x: number, y: number, r: number, mode: KMode, t: number, cap: boolean, seed: number) {
  const lw = Math.max(1.2, r * 0.07);
  ctx.save();
  ctx.translate(x, y);
  if (mode === 'knock') {
    // 벌러덩 누워 빙글빙글 별
    ctx.rotate(-Math.PI / 2 + 0.08);
    ctx.translate(-r * 0.2, r * 0.0);
  }
  const run = mode === 'flee' ? Math.sin(t * 0.6) : 0, lookL = mode === 'duty' ? Math.sin(t * 0.03 + seed) > -0.2 : true;
  ctx.scale(lookL ? 1 : -1, 1);
  // 다리
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * r * 0.16, -r * 0.95);
    ctx.rotate(run * 0.6 * sd);
    ctx.fillStyle = '#c9a66a';
    rr(ctx, -r * 0.13, 0, r * 0.26, r * 0.9, r * 0.1);
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.fillStyle = '#6a3a1a';
    rr(ctx, -r * 0.2, r * 0.78, r * 0.34, r * 0.17, r * 0.07);
    ctx.fill();
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, -r * 1.85, 0, -r * 0.85, [0, '#5fbf5a'], [1, '#3e9a43']);
  rr(ctx, -r * 0.42, -r * 1.85, r * 0.84, r * 1.0, r * 0.3);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.fillStyle = '#7a4a1a';
  ctx.fillRect(-r * 0.42, -r * 1.02, r * 0.84, r * 0.1);
  ctx.fillStyle = '#ffe14a';
  ctx.fillRect(-r * 0.05, -r * 1.02, r * 0.1, r * 0.1);
  // 주머니·명찰
  ctx.fillStyle = '#ffffff';
  rr(ctx, r * 0.05, -r * 1.6, r * 0.22, r * 0.12, r * 0.03);
  ctx.fill();
  // 팔 + 잠자리채
  const armUp = mode === 'flee' || mode === 'alarm';
  ctx.save();
  ctx.translate(-r * 0.3, -r * 1.65);
  ctx.rotate(armUp ? 2.6 + Math.sin(t * 0.5) * 0.3 : mode === 'grin' ? 1.2 : 0.75 + Math.sin(t * 0.05) * 0.05);
  ctx.fillStyle = '#5fbf5a';
  rr(ctx, -r * 0.1, 0, r * 0.2, r * 0.62, r * 0.09);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.fillStyle = '#ffd7b0';
  ell(ctx, 0, r * 0.66, r * 0.11, r * 0.11);
  ctx.fill();
  if (mode !== 'flee' && mode !== 'knock') {
    // 잠자리채: 손에서 앞으로
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.66);
    ctx.lineTo(0, r * 1.7);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ell(ctx, 0, r * 2.0, r * 0.32, r * 0.3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fill();
  }
  ctx.restore();
  // 머리
  const hy = -r * 2.08;
  ctx.fillStyle = '#ffd7b0';
  ell(ctx, 0, hy, r * 0.4, r * 0.4);
  ctx.fill();
  stroke(ctx, OUT, lw);
  // 콧수염·코
  ctx.fillStyle = '#6a3a1a';
  ell(ctx, -r * 0.22, hy + r * 0.14, r * 0.17, r * 0.07, 0.2);
  ctx.fill();
  ctx.fillStyle = '#f2b08a';
  ell(ctx, -r * 0.33, hy + r * 0.02, r * 0.09, r * 0.09);
  ctx.fill();
  const L: Look = { t, ph: 0, face: mode === 'flee' || mode === 'alarm' ? 'scared' : mode === 'knock' ? 'dizzy' : mode === 'grin' ? 'happy' : 'idle', sq: 0, lift: 0, walk: 0, tall: 0, swim: 0, seed };
  ctx.save();
  ctx.scale(-1, 1);
  eyeAt(ctx, r * 0.12, hy - r * 0.06, Math.max(1, r * 0.07), L.face, L);
  ctx.restore();
  if (mode === 'flee' || mode === 'alarm') {
    ctx.fillStyle = '#7a2a1a';
    ell(ctx, -r * 0.2, hy + r * 0.25, r * 0.08, r * 0.1);
    ctx.fill();
  }
  if (cap) drawHatShape(ctx, -r * 0.02, hy - r * 0.28, r * 0.52, 0);
  ctx.restore();
  if (mode === 'knock') {
    // 머리 위 별
    for (let q = 0; q < 3; q++) {
      const a = t * 0.12 + (q * TAU) / 3;
      ctx.fillStyle = '#ffe14a';
      starPath(ctx, x - r * 1.9 + Math.cos(a) * r * 0.4, y - r * 0.5 + Math.sin(a) * r * 0.15, Math.max(3, r * 0.15));
      ctx.fill();
    }
  }
}
/** 사육사 모자(사파리 모자): (x, y)는 모자 아래 가운데, s는 반 폭 */
function drawHatShape(ctx: C2, x: number, y: number, s: number, tilt: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const lw = Math.max(1.2, s * 0.08);
  ctx.fillStyle = lin(ctx, 0, -s, 0, 0, [0, '#f2dc9e'], [1, '#cdb46e']);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.62, s * 0.7, 0, Math.PI, 0);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.fillStyle = '#3e9a43';
  ctx.fillRect(-s * 0.62, -s * 0.18, s * 1.24, s * 0.16);
  ctx.fillStyle = lin(ctx, 0, -s * 0.1, 0, s * 0.15, [0, '#e8cf88'], [1, '#bfa55e']);
  ell(ctx, 0, 0, s, s * 0.18);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.restore();
}

// ── 길 위 장애물 ──
/** 구멍(굴): 장마다 벽돌 쥐구멍 · 바위 굴 · 개찰구 */
function drawHole(ctx: C2, ch: number, cx: number, gy: number, z: number, R: (v: number) => number, glow: number) {
  const bw = R(0.1), bh = R(blockH(z)), oh = R(holeH(z)), x0 = cx - bw / 2, top = gy - bh, dep = R(0.05);
  // 윗면(안쪽으로)
  ctx.fillStyle = ch === 0 ? '#d97a5a' : ch === 1 ? '#a89a8a' : '#7fb35e';
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x0 + dep * 0.5, top - dep * 0.55);
  ctx.lineTo(x0 + bw + dep * 0.5, top - dep * 0.55);
  ctx.lineTo(x0 + bw, top);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  // 옆면(오른쪽)
  ctx.fillStyle = ch === 0 ? '#a8492e' : ch === 1 ? '#6f6458' : '#4f8a3a';
  ctx.beginPath();
  ctx.moveTo(x0 + bw, top);
  ctx.lineTo(x0 + bw + dep * 0.5, top - dep * 0.55);
  ctx.lineTo(x0 + bw + dep * 0.5, gy - dep * 0.55);
  ctx.lineTo(x0 + bw, gy);
  ctx.closePath();
  ctx.fill();
  // 앞면
  const face = ctx.createLinearGradient(0, top, 0, gy);
  if (ch === 0) (face.addColorStop(0, '#ef8a63'), face.addColorStop(1, '#c75f3e'));
  else if (ch === 1) (face.addColorStop(0, '#c9bba8'), face.addColorStop(1, '#8e8170'));
  else (face.addColorStop(0, '#8ccd66'), face.addColorStop(1, '#5a9e3e'));
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.rect(x0, top, bw, bh);
  // 굴(아치) — 높이가 곧 크기
  const ow = Math.min(bw * 0.86, Math.max(R(0.045), oh * 0.92));
  ctx.moveTo(cx - ow / 2, gy);
  ctx.lineTo(cx - ow / 2, gy - oh + ow / 2);
  ctx.arc(cx, gy - oh + ow / 2, ow / 2, Math.PI, 0);
  ctx.lineTo(cx + ow / 2, gy);
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.save();
  ctx.clip('evenodd');
  if (ch === 0) {
    ctx.strokeStyle = 'rgba(120,40,20,.45)';
    ctx.lineWidth = 1;
    const bhh = R(0.022);
    for (let yy = gy, row = 0; yy > top; yy -= bhh, row++) {
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + bw, yy);
      ctx.stroke();
      for (let xx = x0 + ((row % 2) * R(0.025)); xx < x0 + bw; xx += R(0.05)) {
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy - bhh);
        ctx.stroke();
      }
    }
  } else if (ch === 1) {
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    for (let q = 0; q < 6; q++) (ell(ctx, x0 + bw * hsh(q + z * 7), top + bh * hsh(q + 3), R(0.012), R(0.008)), ctx.fill());
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    for (let q = 0; q < 10; q++) (ell(ctx, x0 + bw * hsh(q + 11), top + bh * hsh(q + 13), R(0.008), R(0.008)), ctx.fill());
  }
  ctx.restore();
  ctx.beginPath();
  ctx.rect(x0, top, bw, bh);
  stroke(ctx, OUT, 1.6);
  // 굴 안 어둠
  ctx.fillStyle = lin(ctx, 0, gy - oh, 0, gy, [0, '#2a1608'], [1, '#4a2a12']);
  ctx.beginPath();
  ctx.moveTo(cx - ow / 2, gy);
  ctx.lineTo(cx - ow / 2, gy - oh + ow / 2);
  ctx.arc(cx, gy - oh + ow / 2, ow / 2, Math.PI, 0);
  ctx.lineTo(cx + ow / 2, gy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = glow > 0 ? `rgba(255,220,80,${0.5 + 0.5 * glow})` : ch === 0 ? '#8a5a2a' : '#5a4a3a';
  ctx.lineWidth = Math.max(2, R(0.008));
  ctx.stroke();
  if (ch === 2) {
    // 개찰구 표지
    ctx.fillStyle = '#ffffff';
    rr(ctx, cx - R(0.03), top + R(0.008), R(0.06), R(0.022), R(0.006));
    ctx.fill();
    ctx.fillStyle = '#3a6fb0';
    ctx.font = `800 ${Math.max(8, R(0.016))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('입장', cx, top + R(0.019));
  }
}
/** 우리 문: 크면 높고 두껍고 쇠띠 · 열리면 안쪽으로 젖혀짐 · 부서지면 판자 조각 */
function drawGate(ctx: C2, cx: number, gy: number, z: number, R: (v: number) => number, ang: number, broken: boolean, ch: number) {
  const dh = R(doorH(z)), dw = R(0.04 + 0.008 * z), ph = Math.max(dh + R(0.03), R(0.12));
  // 기둥 둘(뒤·앞)
  for (const sd of [-1, 1]) {
    const px = cx + sd * (dw / 2 + R(0.012));
    ctx.fillStyle = lin(ctx, px - R(0.01), 0, px + R(0.01), 0, [0, ch === 2 ? '#9aa6b2' : '#b07a48'], [1, ch === 2 ? '#6c7884' : '#7a4e28']);
    rr(ctx, px - R(0.01), gy - ph, R(0.02), ph, R(0.004));
    ctx.fill();
    stroke(ctx, OUT, 1.3);
    ctx.fillStyle = ch === 2 ? '#c4ccd4' : '#d8a46a';
    ell(ctx, px, gy - ph, R(0.012), R(0.006));
    ctx.fill();
  }
  if (broken) {
    ctx.fillStyle = '#b07a48';
    for (let q = 0; q < 4; q++) {
      ctx.save();
      ctx.translate(cx - dw + q * dw * 0.6, gy - R(0.006));
      ctx.rotate(-0.3 + q * 0.25);
      rr(ctx, -R(0.025), -R(0.006), R(0.05), R(0.012), R(0.004));
      ctx.fill();
      stroke(ctx, OUT, 1);
      ctx.restore();
    }
    return;
  }
  // 문짝: 안쪽(뒤)으로 젖혀질수록 가로가 좁아지고 위로 물러난다
  const k = Math.cos(ang), back = Math.sin(ang) * R(0.03);
  ctx.save();
  ctx.translate(cx + dw / 2, gy - back);
  ctx.scale(Math.max(0.08, k), 1);
  const x0 = -dw;
  ctx.fillStyle = lin(ctx, x0, 0, 0, 0, [0, ang > 0.2 ? '#a06a38' : '#d9a066'], [1, ang > 0.2 ? '#7a4e28' : '#b27840']);
  rr(ctx, x0, -dh, dw, dh, R(0.006));
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  ctx.strokeStyle = 'rgba(90,50,20,.45)';
  ctx.lineWidth = 1;
  for (let q = 1; q < 3; q++) {
    ctx.beginPath();
    ctx.moveTo(x0 + (dw * q) / 3, -dh + 2);
    ctx.lineTo(x0 + (dw * q) / 3, -2);
    ctx.stroke();
  }
  // 쇠띠·자물쇠: 크기만큼
  ctx.fillStyle = '#6f7a86';
  const bands = Math.max(1, z - 1);
  for (let q = 0; q < bands; q++) {
    const yy = -dh * ((q + 0.6) / (bands + 0.2));
    ctx.fillRect(x0, yy - R(0.004), dw, R(0.008));
    ctx.fillStyle = '#c4ccd4';
    ell(ctx, x0 + R(0.008), yy, R(0.003), R(0.003));
    ctx.fill();
    ctx.fillStyle = '#6f7a86';
  }
  if (z >= 4) {
    ctx.fillStyle = '#ffcf3a';
    rr(ctx, x0 - R(0.006), -dh * 0.5, R(0.022), R(0.026), R(0.004));
    ctx.fill();
    stroke(ctx, OUT, 1);
  }
  ctx.restore();
}
/** 연못: 길을 끊고 물이 찬다 — 크면 길고 깊다 */
function drawPond(ctx: C2, ch: number, cx: number, gy: number, z: number, R: (v: number) => number, t: number, P: Pal) {
  const hl = R(0.04 + 0.022 * z), top = gy - R(0.05), fr = gy + R(0.05), bot = gy + R(0.11), deep = fr + R(0.03 + 0.032 * z);
  // 길 앞면을 파내고 유리 수조처럼 물 깊이를 보인다
  ctx.fillStyle = P.fg[0];
  ctx.fillRect(cx - hl, fr, hl * 2, Math.max(bot, deep) - fr + R(0.01));
  ctx.fillStyle = lin(ctx, 0, top, 0, deep, [0, '#7ad8ff'], [0.4, '#3fb0ea'], [1, '#1f78c0']);
  ctx.beginPath();
  ctx.moveTo(cx - hl, top + R(0.012));
  ctx.lineTo(cx + hl, top + R(0.012));
  ctx.lineTo(cx + hl, deep - R(0.02));
  ctx.quadraticCurveTo(cx + hl, deep, cx + hl - R(0.02), deep);
  ctx.lineTo(cx - hl + R(0.02), deep);
  ctx.quadraticCurveTo(cx - hl, deep, cx - hl, deep - R(0.02));
  ctx.closePath();
  ctx.fill();
  stroke(ctx, '#1a5a8a', 1.6);
  // 물 표면(윗면)
  ctx.fillStyle = 'rgba(200,240,255,.75)';
  ell(ctx, cx, top + R(0.05), hl * 0.96, R(0.03));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 1.2;
  for (let q = 0; q < 3; q++) {
    const u = ((t * 0.01 + q / 3) % 1), rx = hl * (0.25 + 0.6 * u);
    ctx.globalAlpha = 1 - u;
    ell(ctx, cx + Math.sin(q * 2.1) * hl * 0.3, top + R(0.05), rx, rx * 0.22);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 수조 안: 물풀·물고기·거품
  ctx.strokeStyle = '#2f9a5a';
  ctx.lineWidth = Math.max(1.5, R(0.005));
  for (let q = 0; q < 3; q++) {
    const qx = cx - hl * 0.7 + q * hl * 0.7;
    ctx.beginPath();
    ctx.moveTo(qx, deep - 2);
    ctx.quadraticCurveTo(qx + Math.sin(t * 0.05 + q) * R(0.01), deep - R(0.03), qx, deep - R(0.05));
    ctx.stroke();
  }
  if (z >= 2) {
    const fx = cx + Math.sin(t * 0.02) * hl * 0.6, fy = (fr + deep) / 2;
    ctx.fillStyle = '#ffa53a';
    ell(ctx, fx, fy, R(0.012), R(0.007));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx - R(0.01) * Math.sign(Math.cos(t * 0.02)), fy);
    ctx.lineTo(fx - R(0.02) * Math.sign(Math.cos(t * 0.02)), fy - R(0.007));
    ctx.lineTo(fx - R(0.02) * Math.sign(Math.cos(t * 0.02)), fy + R(0.007));
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let q = 0; q < 3; q++) {
    const by = deep - ((t * 0.6 + q * 40) % (deep - fr));
    ell(ctx, cx - hl * 0.4 + q * hl * 0.4, by, R(0.004), R(0.004));
    ctx.fill();
  }
  // 수련잎
  ctx.fillStyle = '#5cc25a';
  ell(ctx, cx + hl * 0.45, top + R(0.04), R(0.02), R(0.008));
  ctx.fill();
  // 둑(양쪽 돌)
  for (const sd of [-1, 1]) {
    ctx.fillStyle = ch === 1 ? '#a89a8a' : '#c8c0b0';
    ell(ctx, cx + sd * hl, gy + R(0.01), R(0.016), R(0.04));
    ctx.fill();
    stroke(ctx, OUT, 1.2);
  }
}
/** 쇠창살 정문 + 누름판 사슬 */
function drawIron(ctx: C2, cx: number, gy: number, lift: number, R: (v: number) => number) {
  const ph = R(0.3), hw = R(0.05);
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ell(ctx, cx, gy + R(0.005), hw * 1.6, R(0.012));
  ctx.fill();
  // 창살
  const by = gy - lift;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - hw, gy - ph, hw * 2, ph);
  ctx.clip();
  ctx.strokeStyle = '#5a6470';
  ctx.lineWidth = Math.max(2, R(0.008));
  for (let q = 0; q < 5; q++) {
    const bx = cx - hw + (q + 0.5) * (hw * 2) / 5;
    ctx.beginPath();
    ctx.moveTo(bx, by - ph);
    ctx.lineTo(bx, by - R(0.008));
    ctx.stroke();
    ctx.fillStyle = '#5a6470';
    ctx.beginPath();
    ctx.moveTo(bx - R(0.006), by - R(0.012));
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + R(0.006), by - R(0.012));
    ctx.fill();
  }
  for (const yy of [0.25, 0.6]) {
    ctx.fillStyle = '#6f7a86';
    ctx.fillRect(cx - hw, by - ph * yy, hw * 2, R(0.008));
  }
  ctx.restore();
  // 돌기둥 둘 + 가로 들보
  for (const sd of [-1, 1]) {
    ctx.fillStyle = lin(ctx, cx + sd * hw - R(0.018), 0, cx + sd * hw + R(0.018), 0, [0, '#d8d0c4'], [1, '#9a9080']);
    rr(ctx, cx + sd * hw - R(0.018), gy - ph - R(0.02), R(0.036), ph + R(0.02), R(0.006));
    ctx.fill();
    stroke(ctx, OUT, 1.5);
  }
  ctx.fillStyle = lin(ctx, 0, gy - ph - R(0.05), 0, gy - ph, [0, '#e8e0d4'], [1, '#b0a694']);
  rr(ctx, cx - hw - R(0.03), gy - ph - R(0.05), hw * 2 + R(0.06), R(0.04), R(0.008));
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  ctx.fillStyle = '#ffcf3a';
  ctx.font = `900 ${Math.max(9, R(0.022))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('정문', cx, gy - ph - R(0.03));
}
/** 누름판(받침대 위) */
function drawPlate(ctx: C2, x: number, y: number, on: number, R: (v: number) => number) {
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ell(ctx, x, y + R(0.03), R(0.07), R(0.014));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y, 0, y + R(0.03), [0, '#d8d0c4'], [1, '#9a9080']);
  rr(ctx, x - R(0.06), y, R(0.12), R(0.03), R(0.006));
  ctx.fill();
  stroke(ctx, OUT, 1.4);
  ctx.fillStyle = on > 0.5 ? '#7ae06a' : '#ff8a5a';
  rr(ctx, x - R(0.05), y - R(0.008) + on * R(0.006), R(0.1), R(0.012), R(0.004));
  ctx.fill();
  stroke(ctx, OUT, 1.2);
}
/** 굴러가는 것 · 소품 */
function drawThing(ctx: C2, k: Kind, x: number, y: number, r: number, rot: number, t: number) {
  const lw = Math.max(1.2, r * 0.07);
  ctx.save();
  ctx.translate(x, y);
  switch (k) {
    case 'apple': {
      ctx.translate(0, -r);
      ctx.rotate(rot);
      ctx.fillStyle = radg(ctx, -r * 0.35, -r * 0.35, r * 0.1, r * 1.2, [0, '#ff8a7a'], [0.5, '#e8382a'], [1, '#a81c14']);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.bezierCurveTo(r * 0.6, -r * 1.15, r * 1.25, -r * 0.3, r * 0.85, r * 0.55);
      ctx.bezierCurveTo(r * 0.6, r * 1.05, -r * 0.6, r * 1.05, -r * 0.85, r * 0.55);
      ctx.bezierCurveTo(-r * 1.25, -r * 0.3, -r * 0.6, -r * 1.15, 0, -r * 0.7);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = '#6a3a1a';
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.65);
      ctx.lineTo(r * 0.08, -r * 1.05);
      ctx.stroke();
      ctx.fillStyle = '#5cc25a';
      ell(ctx, r * 0.32, -r * 0.95, r * 0.26, r * 0.12, -0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ell(ctx, -r * 0.4, -r * 0.25, r * 0.16, r * 0.26, 0.4);
      ctx.fill();
      break;
    }
    case 'melon': {
      ctx.translate(0, -r);
      ctx.rotate(rot);
      ctx.fillStyle = radg(ctx, -r * 0.3, -r * 0.3, r * 0.1, r * 1.1, [0, '#9be06a'], [1, '#2f8a35']);
      ell(ctx, 0, 0, r, r * 0.92);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#1f5a24';
      ctx.lineWidth = Math.max(2, r * 0.16);
      for (let q = -2; q <= 2; q++) {
        ctx.beginPath();
        ctx.moveTo(q * r * 0.42, -r);
        ctx.quadraticCurveTo(q * r * 0.42 + r * 0.15, 0, q * r * 0.42, r);
        ctx.stroke();
      }
      ctx.restore();
      ell(ctx, 0, 0, r, r * 0.92);
      stroke(ctx, OUT, lw);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ell(ctx, -r * 0.4, -r * 0.4, r * 0.2, r * 0.12, -0.6);
      ctx.fill();
      break;
    }
    case 'acorn': {
      ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#d9893a'], [1, '#9a5a20']);
      ell(ctx, 0, -r * 0.8, r * 0.72, r * 0.82);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#7a4a22';
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.25, r * 0.85, r * 0.5, 0, Math.PI, 0);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = '#5a3412';
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.7);
      ctx.lineTo(r * 0.1, -r * 1.95);
      ctx.stroke();
      break;
    }
    case 'pumpkin': {
      ctx.fillStyle = lin(ctx, 0, -r * 1.7, 0, 0, [0, '#ffb04a'], [1, '#e86a10']);
      for (const [ox, wd] of [[-0.55, 0.55], [0.55, 0.55], [0, 0.6]] as [number, number][]) {
        ell(ctx, r * ox, -r * 0.8, r * wd, r * 0.8);
        ctx.fill();
        stroke(ctx, '#a84a0a', lw);
      }
      ctx.fillStyle = '#5a8a2a';
      rr(ctx, -r * 0.1, -r * 1.85, r * 0.2, r * 0.3, r * 0.06);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ell(ctx, -r * 0.2, -r * 1.2, r * 0.18, r * 0.1, -0.4);
      ctx.fill();
      break;
    }
    case 'bucket': {
      ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#8fd0ff'], [1, '#3a8ad0']);
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 1.5);
      ctx.lineTo(r * 0.85, -r * 1.5);
      ctx.lineTo(r * 0.65, 0);
      ctx.lineTo(-r * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#2a6aa8';
      ell(ctx, 0, -r * 1.5, r * 0.85, r * 0.18);
      ctx.fill();
      ctx.strokeStyle = '#6f7a86';
      ctx.lineWidth = Math.max(1.2, r * 0.08);
      ctx.beginPath();
      ctx.arc(0, -r * 1.5, r * 0.8, Math.PI, 0);
      ctx.stroke();
      break;
    }
    case 'hay': {
      ctx.fillStyle = lin(ctx, 0, -r * 1.4, 0, 0, [0, '#ffe68a'], [1, '#d9a83a']);
      rr(ctx, -r * 1.05, -r * 1.35, r * 2.1, r * 1.35, r * 0.35);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = 'rgba(160,110,20,.6)';
      ctx.lineWidth = 1;
      for (let q = 0; q < 6; q++) {
        ctx.beginPath();
        ctx.moveTo(-r + q * r * 0.4, -r * 1.2);
        ctx.lineTo(-r + q * r * 0.4 + r * 0.15, -r * 0.15);
        ctx.stroke();
      }
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-r * 1.05, -r * 0.8, r * 2.1, r * 0.12);
      break;
    }
    case 'coconut': {
      ctx.fillStyle = radg(ctx, -r * 0.3, -r * 1.2, r * 0.1, r * 1.1, [0, '#a8743a'], [1, '#5a3412']);
      ell(ctx, 0, -r * 0.88, r * 0.9, r * 0.86);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#3a2008';
      for (const [ox, oy] of [[-0.2, -1.0], [0.15, -1.05], [0, -0.78]]) (ell(ctx, r * ox, r * oy, r * 0.09, r * 0.09), ctx.fill());
      break;
    }
    case 'rock': {
      ctx.fillStyle = lin(ctx, 0, -r * 1.7, 0, 0, [0, '#d8d4cc'], [1, '#8a8278']);
      ctx.beginPath();
      ctx.moveTo(-r * 1.05, 0);
      ctx.quadraticCurveTo(-r * 1.15, -r * 1.2, -r * 0.3, -r * 1.55);
      ctx.quadraticCurveTo(r * 0.6, -r * 1.75, r * 1.0, -r * 0.9);
      ctx.quadraticCurveTo(r * 1.2, -r * 0.2, r * 0.95, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ell(ctx, -r * 0.35, -r * 1.25, r * 0.3, r * 0.14, -0.3);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,140,60,.6)';
      ell(ctx, r * 0.4, -r * 0.2, r * 0.3, r * 0.12);
      ctx.fill();
      break;
    }
    case 'puddle': {
      ctx.fillStyle = lin(ctx, 0, -r * 0.4, 0, r * 0.2, [0, '#9be4ff'], [1, '#3fa0e0']);
      ell(ctx, 0, -r * 0.1, r * 1.3, r * 0.42);
      ctx.fill();
      stroke(ctx, '#2a78b0', lw);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 1.2;
      const u = (t * 0.012) % 1;
      ctx.globalAlpha = 1 - u;
      ell(ctx, r * 0.2, -r * 0.12, r * 0.9 * u + 2, r * 0.3 * u + 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'popcorn': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 1.4);
      ctx.lineTo(r * 0.8, -r * 1.4);
      ctx.lineTo(r * 0.6, 0);
      ctx.lineTo(-r * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#e8382a';
      for (let q = -2; q <= 2; q += 2) ctx.fillRect(q * r * 0.28 - r * 0.14, -r * 1.5, r * 0.28, r * 1.6);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 1.4);
      ctx.lineTo(r * 0.8, -r * 1.4);
      ctx.lineTo(r * 0.6, 0);
      ctx.lineTo(-r * 0.6, 0);
      ctx.closePath();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#fff6d0';
      for (const [ox, oy] of [[-0.5, -1.5], [0, -1.65], [0.5, -1.5], [-0.25, -1.75], [0.28, -1.8]]) {
        ell(ctx, r * ox, r * oy, r * 0.28, r * 0.25);
        ctx.fill();
        stroke(ctx, '#e0c070', 1);
      }
      break;
    }
    case 'statue': {
      // 꽃 화분
      ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#e8865a'], [1, '#b8552e']);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 1.0);
      ctx.lineTo(r * 0.9, -r * 1.0);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#c8603a';
      rr(ctx, -r, -r * 1.12, r * 2, r * 0.2, r * 0.06);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#4ea63a';
      ell(ctx, 0, -r * 1.4, r * 0.95, r * 0.42);
      ctx.fill();
      for (let q = 0; q < 5; q++) {
        const fx = -r * 0.7 + q * r * 0.35, fy = -r * (1.55 + 0.2 * Math.sin(q * 2.1)) + Math.sin(t * 0.04 + q) * r * 0.03;
        ctx.fillStyle = ['#ff6a8a', '#ffd23a', '#c08aff', '#ff8a3a', '#5ad0ff'][q];
        for (let p = 0; p < 5; p++) (ell(ctx, fx + Math.cos((p * TAU) / 5) * r * 0.12, fy + Math.sin((p * TAU) / 5) * r * 0.12, r * 0.1, r * 0.1), ctx.fill());
        ctx.fillStyle = '#fff6b0';
        ell(ctx, fx, fy, r * 0.07, r * 0.07);
        ctx.fill();
      }
      break;
    }
    case 'icecream': {
      ctx.fillStyle = lin(ctx, -r * 0.4, 0, r * 0.4, 0, [0, '#f2c27a'], [1, '#c8853a']);
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 1.0);
      ctx.lineTo(r * 0.45, -r * 1.0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      for (const [oy, col] of [[-1.15, '#ffb3c9'], [-1.55, '#bfe8ff']] as [number, string][]) {
        ctx.fillStyle = col;
        ell(ctx, 0, r * oy, r * 0.52, r * 0.42);
        ctx.fill();
        stroke(ctx, OUT, lw);
      }
      ctx.fillStyle = '#e8382a';
      ell(ctx, r * 0.05, -r * 2.0, r * 0.12, r * 0.12);
      ctx.fill();
      break;
    }
    case 'drum': {
      ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#ff6a5a'], [1, '#c0302a']);
      rr(ctx, -r * 0.95, -r * 1.3, r * 1.9, r * 1.3, r * 0.2);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#ffcf3a';
      ctx.fillRect(-r * 0.95, -r * 1.3, r * 1.9, r * 0.14);
      ctx.fillRect(-r * 0.95, -r * 0.14, r * 1.9, r * 0.14);
      ctx.fillStyle = '#fff6e6';
      ell(ctx, 0, -r * 1.3, r * 0.95, r * 0.22);
      ctx.fill();
      stroke(ctx, OUT, lw);
      break;
    }
  }
  ctx.restore();
}
/** 나뭇가지(서 있을 때) / 통나무 다리(누웠을 때) */
function drawLog(ctx: C2, x: number, gy: number, len: number, ang: number, R: (v: number) => number) {
  const th = Math.max(R(0.014), len * 0.12);
  ctx.save();
  ctx.translate(x, gy);
  ctx.rotate(ang);
  ctx.fillStyle = lin(ctx, 0, -th, 0, th, [0, '#b07a48'], [1, '#7a4e28']);
  rr(ctx, 0, -th, len, th * 2, th);
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  ctx.strokeStyle = 'rgba(70,40,15,.45)';
  ctx.lineWidth = 1;
  for (let q = 1; q < 4; q++) {
    ctx.beginPath();
    ctx.moveTo((len * q) / 4, -th * 0.6);
    ctx.lineTo((len * q) / 4 + th, th * 0.4);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8c08a';
  ell(ctx, len, 0, th * 0.45, th);
  ctx.fill();
  stroke(ctx, OUT, 1.2);
  ctx.fillStyle = '#5cc25a';
  ell(ctx, len * 0.55, -th * 1.2, th * 0.8, th * 0.4, -0.3);
  ctx.fill();
  ctx.restore();
}

// ── 화면 상태(연출만, 시뮬레이션과 무관) ──
interface Vis {
  w: World | null; ev: number;
  sz: number[]; sv: number[]; land: number[]; landDone: boolean[]; face: number[]; faceK: Face[]; bonk: number[]; bubT: string[];
  ang: number[]; flee: number[]; knock: number[]; logA: number[]; step: number[];
  beam: { a: number; b: number; t: number } | null; chain: number; lift: number[]; caught: { k: number; wk: number; t: number } | null;
  roar: { from: number; to: number; t: number }[]; starT: number; pops: { x: number; y: number; t: number }[]; react: ({ t: number; text: string } | null)[]; card: string; dings: number; chimed: boolean;
}
const VIS = new WeakMap<object, Vis>();
function visOf(s: SwapState): Vis {
  let v = VIS.get(s);
  if (!v) VIS.set(s, (v = { w: null, ev: -1, sz: [], sv: [], land: [], landDone: [], face: [], faceK: [], bonk: [], bubT: [], ang: [], flee: [], knock: [], logA: [], step: [], beam: null, chain: 0, lift: [], caught: null, roar: [], starT: 0, pops: [], react: [], card: '', dings: 0, chimed: false }));
  if (v.w !== s.w) {
    const n = s.w.th.length;
    v.w = s.w;
    // 이전 판의 사건은 새 판 물건 번호와 안 맞으니 건너뛴다
    v.ev = Math.max(v.ev, s.t - 1);
    v.sz = s.w.th.map((o) => RZ[Math.max(1, o.z)]);
    v.sv = Array(n).fill(0);
    v.land = Array(n).fill(-999);
    v.landDone = Array(n).fill(true);
    v.face = Array(n).fill(-999);
    v.faceK = Array(n).fill('idle');
    v.bonk = Array(n).fill(-999);
    v.bubT = Array(n).fill('');
    v.ang = Array(n).fill(0);
    v.flee = Array(n).fill(-999);
    v.knock = Array(n).fill(-999);
    v.logA = s.w.th.map((o) => (o.c === 'log' && bridged(s.w, s.w.th[o.ref]) ? 1 : 0));
    v.step = Array(n).fill(0);
    v.lift = Array(n).fill(0);
    v.beam = null;
    v.chain = 0;
    v.caught = null;
    v.roar = [];
    v.react = Array(n).fill(null);
  }
  return v;
}
/** 막힌 동물의 말풍선 */
function bonkText(wk: Th, o: Th): string {
  if (o.c === 'hole') return wk.k === 'giraffe' ? '목이 걸려!' : '너무 커!';
  if (o.c === 'gate') return '너무 무거워!';
  if (o.c === 'pond') return '너무 깊어!';
  if (o.c === 'iron') return '꽉 닫혔어!';
  return '';
}

function drawAll(ctx: C2, s: SwapState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), v = visOf(s), W_ = s.w, t = s.t, d = STAGES[s.stage], P = PAL[d.ch];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const cen = (o: Th) => hitCenter(W_, o);

  // ── 사건 → 연출·소리 ──
  for (const e of s.events) {
    if (e.t <= v.ev) continue;
    const A_ = e.a >= 0 && e.a < W_.th.length ? W_.th[e.a] : null, B_ = e.b >= 0 && e.b < W_.th.length ? W_.th[e.b] : null;
    switch (e.k) {
      case 'stage':
        fx.sound('chime', 1, 0.6);
        v.chain = 0;
        break;
      case 'again':
        fx.sound('whoosh', 0.8, 0.6);
        v.chain = 0;
        break;
      case 'sel': {
        if (!A_) break;
        const [cx, cy] = cen(A_);
        fx.sound('tick', 1.5 - 0.18 * A_.z, 1);
        fx.sound('pop', 1.4 - 0.12 * A_.z, 0.5);
        fx.ring(X(cx), Y(cy), '#ffe14a', R(Math.max(0.07, RZ[Math.max(1, A_.z)] * 1.3)), 3);
        fx.burst(X(cx), Y(cy), '#fff6a0', 10, 2.5, 2);
        break;
      }
      case 'desel':
        fx.sound('tick', 0.7, 0.7);
        break;
      case 'beam':
        v.beam = { a: e.a, b: e.b, t: e.t };
        fx.sound('zap', 1, 0.8);
        fx.sound('whoosh', 1.4, 0.5);
        break;
      case 'swap': {
        if (!A_ || !B_) break;
        v.beam = null;
        const za = Math.floor(e.n / 10), zb = e.n % 10;
        for (const [o, z0] of [[A_, za], [B_, zb]] as [Th, number][]) {
          const [cx, cy] = cen(o);
          v.face[o.id] = t;
          v.faceK[o.id] = 'shock';
          if (o.z > z0) {
            // 커지는 쪽: 쑥 솟았다가 쿵 내려앉는다
            v.land[o.id] = t;
            v.landDone[o.id] = false;
            fx.sound('swell', 1.5 - 0.2 * o.z, 1);
            fx.burst(X(cx), Y(cy), '#ffe98a', 14 + o.z * 4, 3 + o.z, 2.6);
          } else if (o.z < z0) {
            fx.sound('shrink', 0.8 + 0.25 * (5 - o.z), 1);
            fx.burst(X(cx), Y(cy), '#bfe8ff', 18, 3.5, 2.2);
            if (!s.big || t - s.big.t > 5) fx.pop(X(cx), Y(cy) - R(0.04), '뿅!', '#bfe8ff', Math.max(16, R(0.06)));
          }
        }
        for (const o of [A_, B_]) if (K[o.k].c === 'animal' || o.c === 'keeper') v.react[o.id] = { t, text: o.c === 'keeper' ? (o.z < (o === A_ ? za : zb) ? '어어?!' : '으하하!') : o.z > (o === A_ ? za : zb) ? `${K[o.k].say ?? ''}?!` : '어라?' };
        const [ax, ay] = cen(A_), [bx, by] = cen(B_);
        fx.ring(X((ax + bx) / 2), Y((ay + by) / 2), '#ffffff', R(0.12), 4);
        fx.blink('#fff6c0', 0.18);
        break;
      }
      case 'gate':
        if (A_) {
          fx.sound('crack', 0.8, 0.9);
          fx.sound('thud', 1.1, 0.8);
          fx.burst(X(A_.x), Y(GY - 0.03), '#d8b080', 16, 3.5, 2.5);
          fx.pop(X(A_.x), Y(GY - doorH(A_.z) - 0.05), '쾅!', '#ffe14a', Math.max(18, R(0.065)));
          fx.kick(6);
          if (B_) (v.face[B_.id] = t), (v.faceK[B_.id] = 'proud');
        }
        break;
      case 'flee':
      case 'roar':
        if (A_) {
          v.flee[A_.id] = t;
          fx.sound('boing', 1.7, 0.9);
          fx.sound('whoosh', 1.2, 0.7);
          fx.pop(X(A_.x), Y(GY - keeperH(A_.z) - 0.06), '으악!', '#ffffff', Math.max(16, R(0.06)));
          if (e.k === 'roar' && B_) {
            v.roar.push({ from: B_.id, to: A_.id, t });
            fx.sound('thud', 0.5, 1);
            v.face[B_.id] = t;
            v.faceK[B_.id] = 'proud';
            const [lx, ly] = cen(B_);
            fx.pop(X(lx), Y(ly) - R(0.08), '어흥!', '#ffcf3a', Math.max(20, R(0.08)));
            fx.kick(8);
          }
        }
        break;
      case 'knock':
        if (A_) {
          v.knock[A_.id] = t;
          fx.sound('thud', 0.6, 1.2);
          fx.sound('crack', 1.2, 0.8);
          fx.sound('chime', 1.4, 0.5);
          fx.kick(12);
          fx.burst(X(A_.x), Y(GY - 0.06), '#ffe14a', 22, 5, 3);
          fx.pop(X(A_.x), Y(GY - 0.2), '꽈당!', '#ffffff', Math.max(20, R(0.075)));
        }
        break;
      case 'smash':
        if (A_) {
          fx.sound('crack', 0.7, 1.2);
          fx.sound('thud', 0.7, 1);
          fx.kick(10);
          fx.burst(X(A_.x), Y(GY - 0.05), '#c08a50', 24, 5, 3);
          fx.pop(X(A_.x), Y(GY - 0.18), '와장창!', '#ffffff', Math.max(18, R(0.07)));
        }
        break;
      case 'thunk':
        if (A_) fx.sound('thud', 1.4, 0.6), fx.pop(X(A_.x), Y(A_.y - 0.08), '툭', '#ffffff', 14);
        break;
      case 'roll':
        if (A_) fx.sound('whoosh', 0.7, 0.9), fx.pop(X(A_.x), Y(A_.y - RZ[A_.z] * 2 - 0.03), '데굴데굴!', '#ffffff', Math.max(14, R(0.042)));
        break;
      case 'splash':
        if (A_ && B_) {
          fx.sound('splash', 1 - 0.08 * A_.z, 1.2);
          fx.kick(7);
          fx.burst(X(B_.x), Y(GY - 0.02), '#9be4ff', 30, 5, 3);
          fx.pop(X(B_.x), Y(GY - 0.16), filled(W_, B_) ? '풍덩! 징검다리!' : '풍덩!', '#ffffff', Math.max(16, R(0.06)));
        }
        break;
      case 'rest':
        if (A_) fx.sound('thud', 1.3, 0.5);
        break;
      case 'bonk':
        if (A_ && B_) {
          v.bonk[A_.id] = t;
          v.bubT[A_.id] = bonkText(A_, B_);
          fx.sound('boing', 1.4 - 0.15 * A_.z, 0.6);
          v.face[A_.id] = t;
          v.faceK[A_.id] = B_.c === 'gate' || B_.c === 'iron' ? 'strain' : 'shock';
        }
        break;
      case 'squeeze':
        if (A_) (v.bonk[A_.id] = t), (v.bubT[A_.id] = '끼었어!'), fx.sound('boing', 0.9, 0.6);
        break;
      case 'out':
        if (A_) {
          v.chain++;
          fx.sound('coin', 0.9 + 0.12 * v.chain, 1);
          fx.sound('chime', 1 + 0.1 * v.chain, 0.5);
          for (let q = 0; q < 4; q++) fx.burst(X(0.94), Y(GY - 0.1 - q * 0.04), ['#ff6a8a', '#ffd23a', '#5ad0ff', '#7ae06a'][q], 10, 4, 2.6);
          fx.pop(X(0.86), Y(GY - 0.24), `${K[A_.k].name} 탈출!`, '#ffe14a', Math.max(16, R(0.058)));
        }
        break;
      case 'caught':
        if (A_ && B_) {
          v.caught = { k: A_.id, wk: B_.id, t };
          fx.sound('fail', 1, 1);
          fx.sound('whoosh', 0.6, 0.8);
          fx.pop(X(A_.x), Y(GY - keeperH(A_.z) - 0.07), '잡았다!', '#ff8a5a', Math.max(18, R(0.07)));
          fx.kick(6);
        }
        break;
      case 'bridge':
        if (A_) {
          fx.sound('thud', 0.7, 1.1);
          fx.sound('crack', 1.3, 0.6);
          fx.kick(8);
          fx.burst(X(A_.x), Y(GY - 0.01), '#c8a070', 22, 4, 2.6);
        }
        break;
      case 'cover':
        if (A_) {
          fx.sound('pop', 0.6, 1);
          fx.sound('thud', 1.0, 0.8);
          fx.burst(X(A_.x), Y(GY - 0.06), '#f2dc9e', 18, 4, 2.6);
        }
        break;
      case 'press':
        fx.sound('ding', 1, 0.9);
        fx.sound('rewind', 0.8, 0.8);
        fx.kick(4);
        break;
      case 'unpress':
        fx.sound('thud', 0.8, 0.8);
        break;
      case 'nomore':
        fx.sound('fail', 1.4, 0.5);
        fx.pop(X(0.5), Y(0.5), '뿅을 다 썼어요', '#ffffff', 16);
        break;
      case 'retry':
        fx.sound('whoosh', 0.9, 0.8);
        break;
      case 'clear':
        v.starT = e.t;
        fx.sound('clear', 1, 1);
        break;
      case 'fail':
        fx.sound('thud', 0.8, 0.8);
        break;
    }
  }
  v.ev = Math.max(v.ev, ...s.events.map((e) => e.t), v.ev);
  const card = s.phase === 'play' ? '' : `${s.phase}${s.stage}${s.tries}${s.replays}`;
  if (card && s.pt >= 18 && v.card !== card) (v.card = card), (fx.popups.length = 0), (fx.particles.length = 0), (fx.rings.length = 0);
  // 별 하나씩 '띵' (프레임이 틱을 건너뛰어도 한 번씩)
  if (s.phase === 'result') {
    for (let q = 0; q < s.got; q++) if (t - v.starT >= 34 + q * 14 && v.dings <= q) (v.dings = q + 1), fx.sound('ding', 1 + q * 0.18, 0.9), fx.burst(X(0.5 + (q - (s.ofStars - 1) / 2) * 0.15), Y(0.41), '#ffe14a', 14, 4, 2.6);
    if (s.newDex.length && t - v.starT >= 80 && !v.chimed) (v.chimed = true), fx.sound('chime', 1.2, 0.9);
  } else (v.dings = 0), (v.chimed = false);

  // ── 크기 용수철(뿅 하고 넘쳤다 돌아옴) ──
  for (const o of W_.th) {
    const i = o.id, tgt = RZ[Math.max(1, o.z)];
    v.sv[i] = v.sv[i] * 0.72 + (tgt - v.sz[i]) * 0.3;
    v.sz[i] += v.sv[i];
    if (!v.landDone[i] && t - v.land[i] >= 11) {
      // 커진 쪽이 쿵 내려앉는 순간
      v.landDone[i] = true;
      const [cx] = cen(o), gy = o.walk || o.c === 'keeper' ? GY : o.y;
      fx.sound('thud', 1.3 - 0.18 * o.z, 0.6 + 0.12 * o.z);
      fx.kick(2 + o.z * 2.2);
      fx.ring(X(cx), Y(gy), 'rgba(255,255,255,.8)', R(RZ[o.z] * 2.2), 3);
      fx.burst(X(cx), Y(gy), '#e8d0a0', 8 + o.z * 4, 2 + o.z * 0.8, 2.4);
      if (o.z >= 4 && (!s.big || t - s.big.t > 25)) fx.pop(X(cx), Y(gy) - R(RZ[o.z] * 2.2), '쿵!', '#ffffff', Math.max(18, R(0.06 + o.z * 0.006)));
    }
  }
  for (const id of W_.rollers) {
    const r = W_.th[id];
    if (r.roll === 1 && t % 8 === 0) fx.sound('thud', 0.9 - 0.08 * r.z, 0.3), fx.burst(X(r.x), Y(r.y), '#e0c898', 3, 1.4, 2);
  }
  const zr = (o: Th) => v.sz[o.id];
  const landLift = (o: Th) => {
    const u = (t - v.land[o.id]) / 11;
    return u >= 0 && u < 1 ? R(0.05) * Math.sin(u * Math.PI) : 0;
  };

  // ── 배경 ──
  ctx.drawImage(getBg(d.ch, Math.round(w), Math.round(h), Math.min(3, Math.max(1, Math.round(sc)))), 0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  drawLife(ctx, s, w, t, d.ch, R);

  // ── 비탈(굴러가는 것의 길) ──
  for (const id of W_.rollers) {
    const tr = W_.tracks[W_.th[id].trk];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(120,80,30,.25)';
    ctx.lineWidth = R(0.05);
    ctx.beginPath();
    tr.pts.forEach(([px, py], j) => ctx[j ? 'lineTo' : 'moveTo'](X(px), Y(py) + R(0.012)));
    ctx.stroke();
    ctx.strokeStyle = d.ch === 1 ? '#d9a868' : '#d8b886';
    ctx.lineWidth = R(0.036);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = R(0.008);
    ctx.stroke();
    // 출발점의 나무(사과) / 언덕(수박)
    const [sx, sy] = tr.pts[0];
    if (W_.th[id].k === 'apple') {
      ctx.fillStyle = P.trunk;
      rr(ctx, X(sx) + R(0.02), Y(sy) - R(0.12), R(0.024), R(0.13), R(0.008));
      ctx.fill();
      ctx.fillStyle = P.tree[0];
      ctx.beginPath();
      ctx.arc(X(sx) + R(0.032), Y(sy) - R(0.17), R(0.07), 0, TAU);
      ctx.arc(X(sx) - R(0.02), Y(sy) - R(0.13), R(0.05), 0, TAU);
      ctx.arc(X(sx) + R(0.09), Y(sy) - R(0.13), R(0.05), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8382a';
      for (const [ax, ay] of [[0.0, -0.18], [0.07, -0.2], [0.1, -0.12]]) (ell(ctx, X(sx) + R(ax), Y(sy) + R(ay), R(0.008), R(0.008)), ctx.fill());
    } else {
      ctx.fillStyle = P.hill[0];
      ell(ctx, X(sx), Y(sy) + R(0.01), R(0.08), R(0.025));
      ctx.fill();
    }
  }

  // ── 길 밖 소품(뒤쪽) · 누름판 · 우리 안 사자 ──
  const things = W_.th.filter((o) => !o.walk && (o.c === 'prop' || o.c === 'roller' || o.c === 'animal'));
  const backs = things.filter((o) => o.y < GY - 0.02).sort((a, b) => a.y - b.y), fronts = things.filter((o) => o.y >= GY - 0.02).sort((a, b) => a.y - b.y);
  const irons = W_.th.filter((o) => o.c === 'iron');
  for (const ir of irons) {
    const pz = W_.th[ir.ref], on = pressed(W_, ir) ? 1 : 0;
    // 사슬
    ctx.strokeStyle = '#6f7a86';
    ctx.lineWidth = Math.max(1.5, R(0.005));
    ctx.setLineDash([R(0.01), R(0.006)]);
    ctx.beginPath();
    ctx.moveTo(X(pz.x + 0.06), Y(pz.y + 0.015));
    ctx.quadraticCurveTo(X((pz.x + ir.x) / 2), Y(Math.max(pz.y, GY - 0.3) + 0.08), X(ir.x - 0.07), Y(GY - 0.3));
    ctx.stroke();
    ctx.setLineDash([]);
    drawPlate(ctx, X(pz.x), Y(pz.y), on, R);
  }
  const drawProp = (o: Th) => {
    const sel = s.sel === o.id, rpx = R(zr(o)), lift = (sel ? R(0.018) + Math.sin(t * 0.2) * R(0.004) : 0) + landLift(o);
    const onPlate = irons.some((ir) => ir.ref === o.id);
    const gy = Y(o.y) - (onPlate ? R(0.008) - (pressed(W_, irons.find((ir) => ir.ref === o.id)!) ? R(0.006) : 0) : 0);
    if (sel) glowUnder(ctx, X(o.x), gy, rpx, t);
    ctx.fillStyle = 'rgba(30,40,10,.22)';
    ell(ctx, X(o.x), gy + 1, rpx * 1.1, rpx * 0.28);
    ctx.fill();
    if (o.k === 'lion') {
      // 우리 안 사자: 작을 땐 철창, 커지면 철창이 와르르
      const L: Look = { t, ph: 0, face: t - v.face[o.id] < 60 ? v.faceK[o.id] : o.z >= 4 ? 'proud' : 'idle', sq: 0, lift, walk: 0, tall: 0, swim: 0, seed: o.id };
      drawAnimal(ctx, 'lion', X(o.x), gy, rpx, L);
      drawCage(ctx, X(o.x), gy, R(0.06), o.z >= 3, t);
      return;
    }
    if (K[o.k].c === 'animal') {
      const L: Look = { t, ph: 0, face: t - v.face[o.id] < 60 ? v.faceK[o.id] : 'idle', sq: 0, lift, walk: 0, tall: R(holeH(Math.min(7, heightOf(o)))), swim: 0, seed: o.id };
      drawAnimal(ctx, o.k, X(o.x), gy, rpx, L);
      return;
    }
    drawThing(ctx, o.k, X(o.x), gy - lift, rpx, o.rot, t);
  };
  for (const o of backs) drawProp(o);

  // ── 길 위: 연못 → 굴·문·정문 → 다리 ──
  const obs = W_.obs.map((id) => W_.th[id]);
  for (const o of obs) if (o.c === 'pond') drawPond(ctx, d.ch, X(o.x), Y(GY), o.z, (r) => R(r * 1) * 1, t, P);
  // 연못에 빠져 징검다리가 된 것
  for (const o of W_.rollers.map((id) => W_.th[id])) if (o.roll === 3) drawThing(ctx, o.k, X(o.x), Y(GY + 0.04), R(zr(o)), o.rot, t);
  for (const o of W_.th) {
    if (o.c !== 'log') continue;
    const p = W_.th[o.ref], on = bridged(W_, p);
    v.logA[o.id] += ((on ? 1 : 0) - v.logA[o.id]) * 0.18;
    const a = v.logA[o.id], hl = 0.04 + 0.022 * p.z;
    const lenUp = R(Math.max(0.05, zr(o) * 3.2)), lenBr = X(o.x) - X(p.x - hl) + R(0.025);
    const sel = s.sel === o.id;
    if (sel) glowUnder(ctx, X(o.x), Y(GY), R(0.05), t);
    drawLog(ctx, X(o.x), Y(GY) - R(0.006) - (sel ? R(0.012) : 0), lerp(lenUp, lenBr, a), lerp(-Math.PI / 2 + 0.28, -Math.PI, a), R);
  }

  // 사육사 상태 → 그림 모드
  const kMode = (o: Th): KMode => {
    if (v.caught && v.caught.k === o.id) return 'grin';
    if (o.open === 2) return 'knock';
    if (o.open === 1) return 'flee';
    const hat = W_.th.find((h) => h.c === 'hat' && h.ref === o.id);
    if (hat && hat.z >= o.z) return 'cover';
    const near = W_.walkers.some((id) => {
      const wk = W_.th[id];
      return wk.st < 2 && o.x - wk.x < 0.2 && o.x - wk.x > 0 && wk.z <= o.z;
    });
    return near ? 'alarm' : 'duty';
  };
  // 그리기 순서: 길 위의 것은 x 순서
  type Item = { x: number; f: () => void };
  const items: Item[] = [];
  for (const o of obs) {
    if (o.c === 'hole') items.push({ x: o.x - 0.001, f: () => drawHole(ctx, d.ch, X(o.x), Y(GY), Math.max(1, Math.round(zr(o) === RZ[o.z] ? o.z : o.z)), R, s.sel === o.id ? 0.6 + 0.4 * Math.sin(t * 0.2) : 0) });
    if (o.c === 'gate') {
      const tgtA = o.open ? 1.35 : 0;
      v.ang[o.id] += (tgtA - v.ang[o.id]) * 0.16;
      items.push({ x: o.x - 0.001, f: () => {
        if (s.sel === o.id) glowUnder(ctx, X(o.x), Y(GY), R(0.05), t);
        drawGate(ctx, X(o.x), Y(GY) - (s.sel === o.id ? R(0.012) : 0), o.z, R, v.ang[o.id], o.open === 2, d.ch);
      } });
    }
    if (o.c === 'iron') {
      const tgt = pressed(W_, o) ? R(0.22) : 0;
      v.lift[o.id] += (tgt - v.lift[o.id]) * 0.12;
      items.push({ x: o.x - 0.001, f: () => drawIron(ctx, X(o.x), Y(GY), v.lift[o.id], R) });
    }
    if (o.c === 'keeper') {
      items.push({ x: o.x, f: () => {
        const m = kMode(o), hat = W_.th.find((h) => h.c === 'hat' && h.ref === o.id);
        let kx = X(o.x), ky = Y(GY);
        if (m === 'flee') {
          const u = t - v.flee[o.id];
          kx += R(u * 0.008) + R(0.01) * Math.sin(u * 0.5);
          ky -= Math.abs(Math.sin(u * 0.3)) * R(0.03);
          if (kx > w + R(0.1)) return;
        }
        const kr = R(zr(o)), sel = s.sel === o.id;
        if (sel) glowUnder(ctx, kx, ky, kr, t);
        ctx.fillStyle = 'rgba(30,40,10,.22)';
        ell(ctx, kx, ky + 1, kr * 0.9, kr * 0.25);
        ctx.fill();
        if (m === 'cover' && hat) {
          // 커다란 모자가 사육사를 폭 덮음: 다리만 버둥
          const hs = R(zr(hat)) * 1.25;
          for (const sd of [-1, 1]) {
            ctx.fillStyle = '#6a3a1a';
            rr(ctx, kx + sd * kr * 0.2 - kr * 0.1 + Math.sin(t * 0.4 + sd) * kr * 0.05, ky - kr * 0.25, kr * 0.2, kr * 0.25, kr * 0.06);
            ctx.fill();
          }
          drawHatShape(ctx, kx + Math.sin(t * 0.15) * R(0.004), ky - kr * 0.2, hs, Math.sin(t * 0.1) * 0.05);
          if ((t >> 6) % 3 === 0) bubble(ctx, kx, ky - hs * 1.1, '어? 깜깜해!', R, 0);
          return;
        }
        drawKeeper(ctx, kx, ky - (sel ? R(0.015) : 0) - landLift(o), kr, m, t, !hat, o.id);
        if (hat && m !== 'flee') {
          const hs = R(zr(hat)) * 1.15, hsel = s.sel === hat.id;
          if (hsel) glowUnder(ctx, kx, ky - R(keeperH(o.z)) - R(0.01), hs, t);
          if (m === 'knock') drawHatShape(ctx, kx - kr * 2.1, ky - hs * 0.1, hs, -0.6);
          else drawHatShape(ctx, kx - kr * 0.01, ky - R(keeperH(o.z)) + kr * 0.12 - (hsel ? R(0.015) : 0) - landLift(hat), hs, -0.08);
        }
        if (m === 'alarm' && (t >> 4) % 2 === 0) bubble(ctx, kx, ky - R(keeperH(o.z)) - R(0.05), '!', R, 0);
      } });
    }
  }
  // 모자: 사육사가 도망간 뒤엔 바닥에
  for (const o of W_.th) {
    if (o.c !== 'hat') continue;
    const kp = W_.th[o.ref];
    if (kp.open !== 1) continue;
    items.push({ x: kp.x, f: () => drawHatShape(ctx, X(kp.x), Y(GY) - R(0.004), R(zr(o)) * 1.15, 0.1) });
  }
  // 동물
  const holes = obs.filter((o) => o.c === 'hole'), bubs: [number, number, string][] = [];
  for (const id of W_.walkers) {
    const o = W_.th[id];
    if (o.st === 2 && o.x > 1.08) continue;
    items.push({ x: o.x + 0.0005, f: () => drawWalker(o) });
  }
  const drawWalker = (o: Th) => {
    const rpx = R(zr(o)), sel = s.sel === o.id;
    let x = X(o.x), y = Y(GY);
    const caught = v.caught && v.caught.wk === o.id;
    const pond = obs.find((p) => p.c === 'pond' && Math.abs(o.x - p.x) < 0.04 + 0.022 * p.z);
    const inWater = pond && !bridged(W_, pond) && !filled(W_, pond);
    const swim = inWater && !!K[o.k].swim;
    let lift = (sel ? R(0.02) + Math.sin(t * 0.2) * R(0.005) : 0) + landLift(o);
    if (caught) {
      const kp = W_.th[v.caught!.k], u = clamp((t - v.caught!.t) / 20, 0, 1);
      x = lerp(x, X(kp.x) - R(0.05), u);
      lift += R(0.12) * u + Math.sin(t * 0.5) * R(0.006);
    }
    if (swim) lift -= R(0.02);
    let face: Face = t - v.face[o.id] < 60 ? v.faceK[o.id] : o.st === 1 ? (W_.th[o.blk]?.c === 'gate' || W_.th[o.blk]?.c === 'iron' ? 'strain' : 'idle') : o.x > 0.8 ? 'happy' : 'idle';
    if (caught) face = 'scared';
    const L: Look = { t, ph: (o.s / Math.max(0.02, zr(o))) * 1.6, face, sq: o.st === 1 && o.blk >= 0 ? Math.max(0, 0.08 - (t - v.bonk[o.id]) * 0.006) : 0, lift, walk: o.st === 0 ? 1 : 0, tall: R(holeH(Math.min(7, heightOf(o)))), swim: swim ? 1 : 0, seed: o.id };
    // 큰 발걸음: 쿵 쿵
    if (o.st === 0 && o.z >= 4) {
      const stepK = Math.floor(L.ph / Math.PI);
      if (stepK !== v.step[o.id]) {
        v.step[o.id] = stepK;
        fx.sound('thud', 1.6 - 0.15 * o.z, 0.25 + 0.05 * o.z);
        if (o.z >= 5) fx.kick(2);
        fx.burst(x - rpx * 0.4, y, '#e0c898', 4, 1.6, 2);
      }
    }
    if (sel) glowUnder(ctx, x, y, rpx, t);
    if (!caught && !swim) {
      ctx.fillStyle = 'rgba(30,40,10,.25)';
      ell(ctx, x, y + 1, rpx * 1.15, rpx * 0.28);
      ctx.fill();
    }
    // 굴을 지나는 중이면 굴 구멍 모양으로 잘라 그린다(벽 안으로 쏙)
    const hole = holes.find((hh) => Math.abs(o.x - hh.x) < 0.05 + zr(o) * 1.3);
    ctx.save();
    if (hole && o.x > hole.x - 0.05 - zr(o) * 0.9) {
      const bw = R(0.1), bh = R(blockH(hole.z)), oh = R(holeH(hole.z)), hx0 = X(hole.x) - bw / 2;
      const ow = Math.min(bw * 0.86, Math.max(R(0.045), oh * 0.92));
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.rect(hx0, Y(GY) - bh, bw, bh);
      ctx.rect(X(hole.x) - ow / 2, Y(GY) - oh, ow, oh);
      ctx.clip('evenodd');
    }
    drawAnimal(ctx, o.k, x, y, rpx, L);
    ctx.restore();
    if (inWater && !caught) {
      // 물에 잠긴 부분
      const hl = R(0.04 + 0.022 * pond!.z);
      ctx.save();
      ctx.beginPath();
      ctx.rect(X(pond!.x) - hl, Y(GY - 0.005), hl * 2, R(0.2));
      ctx.clip();
      ctx.fillStyle = 'rgba(60,170,230,.55)';
      ctx.fillRect(x - rpx * 1.6, Y(GY) - R(0.01) - (swim ? R(0.01) : 0), rpx * 3.2, R(0.2));
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.5;
      ell(ctx, x, Y(GY) - R(0.008), rpx * (1.1 + 0.15 * Math.sin(t * 0.2)), R(0.008));
      ctx.stroke();
      if (o.st === 0 && t % 12 === 0) fx.burst(x + rpx * 0.6, Y(GY) - R(0.01), '#bfeaff', 3, 1.5, 1.6), fx.sound('splash', 1.6 - 0.1 * o.z, 0.25);
    }
    // 막혔을 때 말풍선(가끔 다시) — 맨 위에 그리려고 모아 둔다
    if (o.st === 1 && o.blk >= 0 && v.bubT[o.id] && (t - v.bonk[o.id]) % 300 < 150 && s.phase === 'play') {
      const top = Y(GY) - Math.max(R(holeH(Math.min(7, heightOf(o)))), rpx * 2.1) - lift;
      bubs.push([x, top - R(0.02), v.bubT[o.id]]);
    }
  };
  items.sort((a, b) => a.x - b.x);
  for (const it of items) it.f();
  // 사자 어흥: 충격파
  for (const rq of v.roar) {
    const u = (t - rq.t) / 40;
    if (u > 1) continue;
    const [lx, ly] = cen(W_.th[rq.from]);
    for (let q = 0; q < 3; q++) {
      ctx.strokeStyle = `rgba(255,210,80,${(1 - u) * (0.8 - q * 0.2)})`;
      ctx.lineWidth = R(0.012) * (1 - u);
      ctx.beginPath();
      ctx.arc(X(lx), Y(ly), R(0.08 + u * 0.5 + q * 0.06), -0.6, 0.6);
      ctx.stroke();
    }
  }
  // 앞쪽 소품·굴러가는 것
  for (const o of fronts) if (!(o.c === 'roller' && o.roll === 3)) drawProp(o);
  // 출구 밖 들판: 도감에 모은 친구들 + 이번 판에 탈출한 친구가 뛰논다
  const meadow: Kind[] = DEX.filter((_, i) => s.dex[i] > 0);
  for (const id of W_.walkers) if (W_.th[id].st === 2 && !meadow.includes(W_.th[id].k)) meadow.push(W_.th[id].k);
  meadow.forEach((k, i) => {
    const col = i % 4, row = Math.floor(i / 4), mx = 0.745 + col * 0.066 + (row % 2) * 0.03, my = 1.27 + row * 0.055;
    const hop = Math.max(0, Math.sin(t * 0.09 + i * 1.7)) * R(0.012);
    const L: Look = { t, ph: 0, face: 'happy', sq: 0, lift: hop, walk: 0, tall: R(0.07), swim: 0, seed: i };
    ctx.fillStyle = 'rgba(30,60,10,.2)';
    ell(ctx, X(mx), Y(my) + 1, R(0.024), R(0.007));
    ctx.fill();
    drawAnimal(ctx, k, X(mx), Y(my), R(k === 'giraffe' ? 0.016 : 0.022), L);
  });
  for (const [bx, by, tx] of bubs) bubble(ctx, bx, by, tx, R, 1);
  // 바뀐 직후 한마디
  for (const o of W_.th) {
    const rq = v.react[o.id];
    if (!rq || t - rq.t > 55 || (o.walk && o.st === 2) || !rq.text) continue;
    const [cx, cy] = cen(o), top = o.walk || o.c === 'keeper' ? Y(GY) - Math.max(R(holeH(Math.min(7, heightOf(o)))), R(zr(o)) * 2.2) : Y(cy) - R(zr(o)) * 1.3;
    bubble(ctx, X(cx), Math.min(top, Y(cy)) - R(0.025) - landLift(o), rq.text, R, 0);
  }

  // ── 고른 것: 빛줄기·크기 칸 ──
  if (s.phase === 'play' && s.sel >= 0) {
    for (const o of W_.th) {
      if (!swappable(o) || o.id === s.sel) continue;
      const [cx, cy] = cen(o), rr2 = R(Math.max(0.055, zr(o) * 1.05));
      ctx.strokeStyle = `rgba(255,255,255,${0.45 + 0.35 * Math.sin(t * 0.18 + o.id)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([R(0.012), R(0.008)]);
      ell(ctx, X(cx), Y(cy), rr2, rr2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const o of W_.th) if (swappable(o)) sizePips(ctx, o, X(cen(o)[0]), Y(cen(o)[1]) + R(Math.max(0.05, zr(o) * 1.05)) + R(0.018), R, o.id === s.sel);
  }
  if (s.phase === 'play' && s.sel >= 0 && s.stage < 4) {
    const o = W_.th[s.sel], [cx, cy] = cen(o);
    bubble(ctx, X(cx), Y(cy) - R(Math.max(0.06, zr(o) * 1.4)) - R(0.03), '이제 바꿀 것을 톡!', R, 0);
  }
  if (v.beam) {
    const A_ = W_.th[v.beam.a], B_ = W_.th[v.beam.b], u = clamp((t - v.beam.t) / SWAP_T, 0, 1);
    const [ax, ay] = cen(A_), [bx, by] = cen(B_), dx = bx - ax, dy = by - ay, dl = Math.max(1e-6, Math.hypot(dx, dy));
    const bend = Math.min(0.16, 0.35 * dl) * (dx >= 0 ? 1 : -1), mx = (ax + bx) / 2 + (dy / dl) * bend, my = (ay + by) / 2 - Math.abs(dx / dl) * bend - 0.04;
    const pt = (q: number): P2 => [(1 - q) ** 2 * ax + 2 * (1 - q) * q * mx + q * q * bx, (1 - q) ** 2 * ay + 2 * (1 - q) * q * my + q * q * by];
    ctx.lineCap = 'round';
    for (const [col, lw2] of [['rgba(255,230,120,.35)', R(0.05)], ['rgba(255,240,170,.7)', R(0.024)], ['#ffffff', R(0.009)]] as [string, number][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw2;
      ctx.beginPath();
      ctx.moveTo(X(ax), Y(ay));
      ctx.quadraticCurveTo(X(mx), Y(my), X(bx), Y(by));
      ctx.stroke();
    }
    for (const [q, col] of [[u, '#ffe14a'], [1 - u, '#7fe0ff']] as [number, string][]) {
      for (let k2 = 0; k2 < 4; k2++) {
        const [px, py] = pt(clamp(q - (q === u ? 1 : -1) * k2 * 0.06, 0, 1));
        ctx.fillStyle = col;
        ctx.globalAlpha = 1 - k2 * 0.22;
        starPath(ctx, X(px), Y(py), R(0.034 - k2 * 0.006), 0.4, 4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  // 큰 순간 글자
  if (s.big && t - s.big.t < 70) {
    const u = (t - s.big.t) / 70, sc2 = u < 0.15 ? ease(u / 0.15) * 1.15 : 1.15 - 0.15 * ease((u - 0.15) / 0.2);
    ctx.save();
    ctx.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
    font(0.068, 900);
    const tw0 = ctx.measureText(s.big.text).width, fit = Math.min(1, R(0.9) / Math.max(1, tw0 * 1.15)), half2 = (tw0 * fit * 1.15) / 2;
    ctx.translate(clamp(X(s.big.x), R(0.03) + half2, R(0.97) - half2), Y(clamp(s.big.y, 0.36, 1.2)) - R(0.04) * u);
    ctx.scale(sc2 * fit, sc2 * fit);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = R(0.018);
    ctx.strokeStyle = '#4a2a12';
    ctx.lineJoin = 'round';
    ctx.strokeText(s.big.text, 0, 0);
    ctx.fillStyle = '#ffe14a';
    ctx.fillText(s.big.text, 0, 0);
    ctx.restore();
  }
  ctx.restore();

  drawHud(ctx, s, v, w, h, R, font);
}

/** 살아 있는 배경: 구름·새·관람객·나비·깃발 */
function drawLife(ctx: C2, s: SwapState, w: number, t: number, ch: number, R: (v: number) => number) {
  void w;
  // 구름
  for (let i = 0; i < 4; i++) {
    const cx = ((hsh(i) * 1.3 + t * 0.00012 * (1 + i * 0.3)) % 1.3) - 0.15, cy = 0.36 + hsh(i + 9) * 0.14, cw = 0.07 + hsh(i + 5) * 0.05;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    for (const [dx, dy, q] of [[-0.5, 0.1, 0.42], [0, -0.15, 0.58], [0.5, 0.1, 0.45], [0.2, 0.18, 0.42]]) {
      ctx.moveTo(R(cx + dx * cw + q * cw), R(cy + dy * cw));
      ctx.arc(R(cx + dx * cw), R(cy + dy * cw), R(q * cw), 0, TAU);
    }
    ctx.fill();
  }
  // 새 두 마리
  for (let i = 0; i < 2; i++) {
    const bx = ((t * 0.0011 * (1 + i * 0.4) + i * 0.5) % 1.2) - 0.1, by = 0.42 + 0.03 * Math.sin(t * 0.03 + i * 3) + i * 0.06, fl = Math.sin(t * 0.4 + i) * 0.5;
    ctx.strokeStyle = '#4a3a5a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(R(bx - 0.016), R(by - 0.008 * fl));
    ctx.quadraticCurveTo(R(bx - 0.006), R(by - 0.01), R(bx), R(by));
    ctx.quadraticCurveTo(R(bx + 0.006), R(by - 0.01), R(bx + 0.016), R(by - 0.008 * fl));
    ctx.stroke();
  }
  // 뒤 관람로의 구경꾼(풍선 든 아이·어른) — 천천히 걸어간다
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? -1 : 1, px = (((hsh(i + 30) + dir * t * 0.0009 * (0.7 + 0.3 * hsh(i))) % 1.2) + 1.2) % 1.2 - 0.1, py = 0.765;
    const k = R(0.022 + (i % 2) * 0.008), bob = Math.abs(Math.sin(t * 0.15 + i)) * k * 0.12;
    const x = R(px), y = R(py) - bob;
    ctx.fillStyle = ['#ff7a8a', '#5aa0e0', '#ffcf3a', '#8a6ad0'][i];
    rr(ctx, x - k * 0.45, y - k * 1.55, k * 0.9, k * 1.0, k * 0.3);
    ctx.fill();
    ctx.fillStyle = '#ffd7b0';
    ell(ctx, x, y - k * 1.9, k * 0.38, k * 0.38);
    ctx.fill();
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.arc(x, y - k * 2.0, k * 0.38, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#3a3a5a';
    ctx.fillRect(x - k * 0.3, y - k * 0.6, k * 0.22, k * 0.6);
    ctx.fillRect(x + k * 0.08, y - k * 0.6, k * 0.22, k * 0.6);
    if (i % 2 === 0) {
      // 풍선
      const bxp = x + dir * k * 0.9, byp = y - k * 3.6 + Math.sin(t * 0.05 + i) * k * 0.2;
      ctx.strokeStyle = 'rgba(80,60,40,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + dir * k * 0.45, y - k * 1.3);
      ctx.lineTo(bxp, byp + k * 0.5);
      ctx.stroke();
      ctx.fillStyle = ['#ff5a6a', '#ffd23a'][i / 2];
      ell(ctx, bxp, byp, k * 0.45, k * 0.55);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ell(ctx, bxp - k * 0.15, byp - k * 0.2, k * 0.1, k * 0.15);
      ctx.fill();
    }
  }
  // 출구 깃발 + 표지
  const ex = R(0.965), top = R(GY - 0.27);
  ctx.fillStyle = '#ffffff';
  rr(ctx, ex - R(0.055), top - R(0.04), R(0.11), R(0.045), R(0.01));
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  ctx.fillStyle = '#e8382a';
  ctx.font = `900 ${Math.max(11, R(0.028))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('출구', ex, top - R(0.017));
  ctx.fillStyle = ch === 1 ? '#ff8a3a' : '#ff5a6a';
  ctx.beginPath();
  ctx.moveTo(ex + R(0.04), top - R(0.05));
  for (let q = 0; q <= 6; q++) ctx.lineTo(ex + R(0.04) + R(0.01) * q, top - R(0.05) - R(0.04) + Math.sin(t * 0.15 + q) * R(0.004) * q);
  ctx.lineTo(ex + R(0.04) + R(0.06), top - R(0.05) - R(0.015));
  ctx.lineTo(ex + R(0.04), top - R(0.05) - R(0.03));
  ctx.fill();
  // 앞 잔디의 꼬마 구경꾼: 오리 가족(마을) · 미어캣(숲) · 비둘기(광장) — 왔다 갔다
  for (let i = 0; i < 3; i++) {
    const per = 1400, u = ((t + i * 18) % per) / per, dir = u < 0.5 ? 1 : -1, px = 0.05 + 0.5 * (u < 0.5 ? u * 2 : 2 - u * 2) - i * 0.045 * dir;
    const x = R(px), y = R(1.33 + (i % 2) * 0.012), k = R(i ? 0.012 : 0.016), bob = Math.abs(Math.sin(t * 0.25 + i)) * k * 0.25;
    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(30,50,10,.2)';
    ell(ctx, 0, bob + 1, k * 1.1, k * 0.3);
    ctx.fill();
    if (ch === 1) {
      ctx.fillStyle = '#d8a868';
      ell(ctx, 0, -k * 1.1, k * 0.45, k * 1.05);
      ctx.fill();
      stroke(ctx, OUT, 1);
      ctx.fillStyle = '#3a2a14';
      ell(ctx, k * 0.12, -k * 1.85, k * 0.07, k * 0.07);
      ctx.fill();
    } else {
      ctx.fillStyle = ch === 0 ? (i ? '#ffe14a' : '#ffffff') : '#b8c0cc';
      ell(ctx, 0, -k * 0.6, k, k * 0.62);
      ctx.fill();
      stroke(ctx, OUT, 1);
      ell(ctx, k * 0.75, -k * 1.2, k * 0.42, k * 0.42);
      ctx.fill();
      stroke(ctx, OUT, 1);
      ctx.fillStyle = '#ff9a2a';
      ctx.beginPath();
      ctx.moveTo(k * 1.1, -k * 1.25);
      ctx.lineTo(k * 1.45, -k * 1.15);
      ctx.lineTo(k * 1.1, -k * 1.05);
      ctx.fill();
      ctx.fillStyle = '#2a1608';
      ell(ctx, k * 0.88, -k * 1.32, k * 0.07, k * 0.07);
      ctx.fill();
    }
    ctx.restore();
  }
  // 나비
  for (let i = 0; i < 2; i++) {
    const u = t * 0.006 + i * 3.1, bx = R(0.5 + 0.4 * Math.sin(u * (1 + i * 0.3)) * (i ? -1 : 1)), by = R(1.2 + 0.08 * Math.sin(u * 1.7 + i));
    const fl = Math.abs(Math.sin(t * 0.35 + i * 2)), k = R(0.014);
    ctx.fillStyle = i ? '#ffb0d8' : '#fff27a';
    for (const sd of [-1, 1]) (ell(ctx, bx + sd * k * 0.7 * (0.3 + fl), by - k * 0.2, k * 0.7 * (0.3 + fl), k * 0.75), ctx.fill());
    ctx.fillStyle = '#5a3a1a';
    ell(ctx, bx, by, k * 0.18, k * 0.6);
    ctx.fill();
  }
  void s;
}
/** 고른 것 밑 금빛 동그라미 + 반짝이 */
function glowUnder(ctx: C2, x: number, y: number, r: number, t: number) {
  ctx.fillStyle = radg(ctx, x, y - r, 0, r * 2.4, [0, 'rgba(255,240,150,.55)'], [1, 'rgba(255,240,150,0)']);
  ctx.fillRect(x - r * 2.5, y - r * 3.5, r * 5, r * 5);
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 3;
  ell(ctx, x, y + 1, r * 1.35 + 3, r * 0.38 + 2);
  ctx.stroke();
  for (let q = 0; q < 4; q++) {
    const a = t * 0.08 + (q * TAU) / 4;
    ctx.fillStyle = '#fff6a0';
    starPath(ctx, x + Math.cos(a) * (r * 1.5 + 6), y - r + Math.sin(a) * (r * 1.2 + 4), 3 + (q % 2) * 1.5, 0.4, 4);
    ctx.fill();
  }
}
function drawCage(ctx: C2, x: number, y: number, r: number, broken: boolean, t: number) {
  ctx.strokeStyle = '#6f7a86';
  ctx.lineWidth = Math.max(2, r * 0.07);
  if (broken) {
    for (let q = 0; q < 4; q++) {
      ctx.save();
      ctx.translate(x - r * 1.6 + q * r, y - r * 0.05);
      ctx.rotate(-0.8 + q * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.8, 0);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  for (let q = 0; q < 5; q++) {
    const bx = x - r + (q * r * 2) / 4;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.lineTo(bx, y - r * 1.7);
    ctx.stroke();
  }
  ctx.fillStyle = '#8a95a2';
  rr(ctx, x - r * 1.15, y - r * 1.85, r * 2.3, r * 0.22, r * 0.08);
  ctx.fill();
  ctx.fillStyle = '#fff6dc';
  rr(ctx, x - r * 0.75, y - r * 2.45, r * 1.5, r * 0.5, r * 0.12);
  ctx.fill();
  stroke(ctx, OUT, 1.2);
  ctx.fillStyle = '#d9480f';
  ctx.font = `900 ${Math.max(9, r * 0.36)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('사자', x, y - r * 2.2 + Math.sin(t * 0.1) * 0.5);
}
/** 말풍선 */
function bubble(ctx: C2, x: number, y: number, text: string, R: (v: number) => number, kind: number) {
  ctx.font = `800 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width, bw = tw + R(0.032), bh = Math.max(18, R(0.05));
  const bx = clamp(x - bw / 2, R(0.01), R(0.99) - bw);
  ctx.fillStyle = kind ? '#ffffff' : '#fff1a8';
  rr(ctx, bx, y - bh, bw, bh, bh * 0.45);
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  ctx.beginPath();
  ctx.moveTo(x - R(0.01), y - 1);
  ctx.lineTo(x, y + R(0.014));
  ctx.lineTo(x + R(0.01), y - 1);
  ctx.fill();
  ctx.fillStyle = '#3a2a14';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, y - bh / 2 + 1);
}
/** 크기 칸(점 다섯) — 무엇을 고르고 있을 때만 */
function sizePips(ctx: C2, o: Th, x: number, y: number, R: (v: number) => number, hot: boolean) {
  const n = 5, gap = R(0.017), r0 = R(0.0055);
  ctx.fillStyle = 'rgba(40,25,10,.55)';
  rr(ctx, x - gap * 2.5 - r0 * 1.5, y - r0 * 2, gap * 5 + r0, r0 * 4, r0 * 2);
  ctx.fill();
  for (let q = 0; q < n; q++) {
    ctx.fillStyle = q < o.z ? (hot ? '#ffe14a' : '#ffffff') : 'rgba(255,255,255,.22)';
    ell(ctx, x - gap * 2 + q * gap, y, r0, r0);
    ctx.fill();
  }
}
/** 손가락(안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.15);
  ctx.rotate(-0.35);
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, k * 0.2, k * 1.25, k * 0.4, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, k * 0.08);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, 0);
  ctx.lineTo(-k * 0.12, k * 0.55);
  ctx.quadraticCurveTo(-k * 0.45, k * 0.42, -k * 0.38, k * 0.62);
  ctx.lineTo(-k * 0.12, k * 1.05);
  ctx.quadraticCurveTo(k * 0.1, k * 1.25, k * 0.42, k * 1.05);
  ctx.quadraticCurveTo(k * 0.55, k * 0.75, k * 0.48, k * 0.5);
  ctx.quadraticCurveTo(k * 0.45, k * 0.38, k * 0.32, k * 0.4);
  ctx.quadraticCurveTo(k * 0.3, k * 0.3, k * 0.18, k * 0.32);
  ctx.quadraticCurveTo(k * 0.15, k * 0.24, k * 0.1, k * 0.26);
  ctx.lineTo(k * 0.1, 0);
  ctx.quadraticCurveTo(-k * 0.01, -k * 0.14, -k * 0.12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/** 도감 사진(동그라미 안 동물) / 실루엣 */
const SIL = new Map<string, HTMLCanvasElement>();
function portrait(ctx: C2, k: Kind, x: number, y: number, rad: number, mode: 'color' | 'sil' | 'lock', t: number) {
  ctx.save();
  ctx.fillStyle = mode === 'color' ? lin(ctx, 0, y - rad, 0, y + rad, [0, '#fff6dc'], [1, '#ffe2a8']) : mode === 'sil' ? '#cfe8ff' : '#d8d2c6';
  ell(ctx, x, y, rad, rad);
  ctx.fill();
  stroke(ctx, mode === 'sil' ? '#3d8df5' : OUT, mode === 'sil' ? 2.2 : 1.5);
  ell(ctx, x, y, rad - 1, rad - 1);
  ctx.clip();
  const ar = rad * (k === 'giraffe' ? 0.42 : k === 'penguin' ? 0.62 : 0.6), fy = y + rad * (k === 'giraffe' ? 0.95 : 0.78);
  const L: Look = { t, ph: 0, face: 'happy', sq: 0, lift: 0, walk: 0, tall: rad * 1.7, swim: 0, seed: 1 };
  if (mode === 'color') drawAnimal(ctx, k, x - rad * 0.12, fy, ar, L);
  else {
    const key = `${k}|${Math.round(rad)}|${mode}`;
    let c = SIL.get(key);
    if (!c && typeof document !== 'undefined') {
      c = document.createElement('canvas');
      const S2 = Math.ceil(rad * 2 * 2);
      c.width = S2;
      c.height = S2;
      const g = c.getContext('2d')!;
      g.scale(2, 2);
      drawAnimal(g, k, rad - rad * 0.12, rad + rad * (k === 'giraffe' ? 0.95 : 0.78), ar, L);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = mode === 'sil' ? '#2a4a7a' : '#a89e90';
      g.fillRect(0, 0, S2, S2);
      SIL.set(key, c);
    }
    if (c) ctx.drawImage(c, x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.restore();
  if (mode !== 'color') {
    ctx.fillStyle = mode === 'sil' ? '#ffffff' : '#7a7064';
    ctx.font = `900 ${Math.max(12, rad * 0.8)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (mode === 'lock') ctx.fillText('?', x, y + 1);
  }
}
/** 다음에 풀릴 새 친구 (지금 판 다음부터) */
function nextNew(s: SwapState): Kind | null {
  for (let i = s.stage + (s.phase === 'result' ? 1 : 0); i < STAGES.length; i++) {
    for (const t of STAGES[i].things) if (t.walk && DEX.includes(t.k) && !s.dex[DEX.indexOf(t.k)] && !(i === s.stage && s.newDex.includes(t.k))) return t.k;
  }
  return null;
}

function drawHud(ctx: C2, s: SwapState, v: Vis, w: number, h: number, R: (v: number) => number, font: (sz: number, wgt?: number) => void) {
  const t = s.t, d = STAGES[s.stage], st = starsOf(s.stage), budget = budgetOf(d);
  // ── 위 띠 ──
  ctx.fillStyle = 'rgba(60,35,15,.25)';
  rr(ctx, R(0.015), R(0.018), R(0.97), R(0.145), R(0.03));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, R(0.01), 0, R(0.15), [0, '#fffaf0'], [1, '#ffeccb']);
  rr(ctx, R(0.015), R(0.01), R(0.97), R(0.145), R(0.03));
  ctx.fill();
  stroke(ctx, '#c08a50', 2);
  // 하트
  for (let i = 0; i < 3; i++) {
    const on = i < s.hearts, hx = R(0.06 + i * 0.058), hy = R(0.05);
    const broken = !on && s.phase === 'fail' && i === s.hearts && s.pt < 60;
    ctx.fillStyle = on || broken ? '#ff4a6a' : 'rgba(120,90,70,.25)';
    heartPath(ctx, hx + (broken ? Math.sin(t * 1.3) * R(0.006) : 0), hy, R(0.021));
    ctx.fill();
    if (on) stroke(ctx, '#a8203a', 1.4);
  }
  // 판 이름
  ctx.fillStyle = '#4a2a12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.04, 900);
  ctx.fillText(`${d.ch + 1}-${s.stage + 1 - STAGES.findIndex((q) => q.ch === d.ch)} ${d.name}`, R(0.5), R(0.05));
  // 남은 뿅(반짝이)
  const left = Math.max(0, budget - s.w.swaps);
  ctx.fillStyle = '#b8780e';
  font(0.03, 900);
  ctx.textAlign = 'right';
  ctx.fillText('뿅', R(0.955 - budget * 0.04), R(0.052));
  ctx.textAlign = 'center';
  for (let i = 0; i < budget; i++) {
    const on = i < left, bx = R(0.95 - i * 0.04), by = R(0.05);
    ctx.fillStyle = on ? '#ffcf3a' : 'rgba(120,90,70,.22)';
    starPath(ctx, bx, by, R(on ? 0.02 + 0.002 * Math.sin(t * 0.15 + i) : 0.015), 0.42, 4);
    ctx.fill();
    if (on) stroke(ctx, '#b8780e', 1.2);
  }
  // 별 조건 칩(쉬운 말)
  ctx.font = `800 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
  let labels = st.map((q) => q.label), ws = labels.map((l) => ctx.measureText(l).width + R(0.06));
  let tot = ws.reduce((a, b) => a + b, 0) + R(0.012) * (ws.length - 1);
  if (tot > R(0.95)) {
    // 좁으면 짧은 말로
    labels = st.map((q) => q.short);
    ws = labels.map((l) => ctx.measureText(l).width + R(0.06));
    tot = ws.reduce((a, b) => a + b, 0) + R(0.012) * (ws.length - 1);
  }
  let cx = R(0.5) - tot / 2;
  st.forEach((q, i) => {
    const ok = s.phase === 'result' ? s.starOk[i] : s.w.swaps <= q.max, cw = ws[i], cy = R(0.112);
    ctx.fillStyle = ok ? '#fff3c4' : '#ece4d6';
    rr(ctx, cx, cy - R(0.024), cw, R(0.048), R(0.024));
    ctx.fill();
    stroke(ctx, ok ? '#e0a020' : '#c8bca8', 1.4);
    ctx.fillStyle = ok ? '#ffb020' : '#c8bca8';
    starPath(ctx, cx + R(0.026), cy, R(0.015));
    ctx.fill();
    ctx.fillStyle = ok ? '#4a2a12' : '#a09480';
    ctx.textAlign = 'left';
    ctx.fillText(labels[i], cx + R(0.046), cy + 1);
    cx += cw + R(0.012);
  });

  // ── 아래 띠: 다시 · 도감 ──
  const by0 = R(1.39);
  ctx.fillStyle = lin(ctx, 0, by0, 0, h, [0, '#8a5a32'], [1, '#6a4020']);
  ctx.fillRect(0, by0, w, h - by0);
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(0, by0, w, R(0.005));
  const [rx, ry, rw, rh] = RETRY;
  const canRetry = s.phase === 'play' && (s.w.swaps > 0 || s.sel >= 0);
  ctx.fillStyle = canRetry ? '#fff3c4' : 'rgba(255,243,196,.45)';
  rr(ctx, R(rx - rw / 2), R(ry - rh / 2), R(rw), R(rh), R(0.02));
  ctx.fill();
  stroke(ctx, '#4a2a12', 1.5);
  ctx.fillStyle = '#4a2a12';
  font(0.034, 900);
  ctx.textAlign = 'center';
  ctx.fillText('↺ 다시', R(rx), R(ry) + 1);
  const nx = nextNew(s);
  ctx.fillStyle = '#ffe9c4';
  font(0.028, 800);
  ctx.textAlign = 'left';
  ctx.fillText(`도감 ${s.dex.filter(Boolean).length}/${DEX.length}`, R(0.18), R(1.408));
  DEX.forEach((k, i) => {
    const px = R(0.205 + i * 0.077), py = R(1.452), got = s.dex[i] > 0;
    const pulse = !got && k === nx ? 1 + 0.06 * Math.sin(t * 0.15) : 1;
    portrait(ctx, k, px, py, R(0.032) * pulse, got ? 'color' : k === nx ? 'sil' : 'lock', t);
  });
  void v;

  // ── 판 시작 띠(안내) ──
  if (s.banner && t - s.banner.t < 230 && s.phase === 'play') {
    const u = (t - s.banner.t) / 230, a = u < 0.08 ? u / 0.08 : u > 0.85 ? (1 - u) / 0.15 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    const by = R(0.2) + (1 - ease(Math.min(1, u * 8))) * -R(0.04);
    ctx.font = `800 ${Math.max(12, R(0.033))}px system-ui, sans-serif`;
    // 길면 '—'에서 두 줄로
    let lines = [s.banner.sub];
    if (ctx.measureText(s.banner.sub).width > R(0.9) && s.banner.sub.includes(' — ')) {
      const [a1, b1] = s.banner.sub.split(' — ');
      lines = [a1, b1];
    }
    const subW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const bw = Math.min(R(0.97), Math.max(R(0.6), subW + R(0.06))), bh = R(0.075) + lines.length * R(0.04);
    ctx.fillStyle = 'rgba(60,35,15,.3)';
    rr(ctx, R(0.5) - bw / 2, by + R(0.006), bw, bh, R(0.03));
    ctx.fill();
    ctx.fillStyle = '#fff6dc';
    rr(ctx, R(0.5) - bw / 2, by, bw, bh, R(0.03));
    ctx.fill();
    stroke(ctx, '#e0a020', 2);
    ctx.fillStyle = '#4a2a12';
    ctx.textAlign = 'center';
    font(0.04, 900);
    ctx.fillText(s.banner.head, R(0.5), by + R(0.033));
    ctx.fillStyle = s.banner.sub.startsWith('NEW') ? '#d9480f' : '#6a4a2a';
    ctx.font = `800 ${Math.max(12, Math.min(R(0.033), (R(0.033) * (R(0.95))) / Math.max(1, subW)))}px system-ui, sans-serif`;
    lines.forEach((l, i) => ctx.fillText(l, R(0.5), by + R(0.076) + i * R(0.04)));
    ctx.restore();
  }
  // ── NEW 스포트라이트 ──
  if (s.spot && s.phase === 'play' && t - s.spot.t < 300) {
    const o = s.w.th[s.spot.id], [cx, cy] = hitCenter(s.w, o), u = (t - s.spot.t) / 300;
    const rad = R(Math.max(0.08, RZ[Math.max(1, o.z)] * 1.5)) * (1 + 0.08 * Math.sin(t * 0.2));
    ctx.save();
    ctx.globalAlpha = u > 0.85 ? (1 - u) / 0.15 : 1;
    ctx.strokeStyle = '#ffcf3a';
    ctx.lineWidth = 3;
    ctx.setLineDash([R(0.016), R(0.01)]);
    ctx.lineDashOffset = -t * 0.6;
    ell(ctx, R(cx), R(cy), rad, rad);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    const lab = `NEW ${s.spot.label}`, lw2 = ctx.measureText(lab).width + R(0.03);
    const lx = clamp(R(cx) - lw2 / 2, R(0.01), R(0.99) - lw2), ly = R(cy) - rad - R(0.05);
    ctx.fillStyle = '#d9480f';
    rr(ctx, lx, ly, lw2, R(0.042), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(lab, lx + lw2 / 2, ly + R(0.022));
    ctx.restore();
  }
  // ── 손가락 안내(1·2판, 아직 안 바꿨을 때) ──
  if (s.phase === 'play' && s.stage <= 1 && s.w.swaps === 0) {
    const tgts = s.stage === 0 ? [2] : [0, 2];
    const cyc = 70, k2 = Math.floor(t / cyc) % tgts.length, ph = (t % cyc) / cyc;
    const want = s.stage === 1 && s.sel === 0 ? 2 : tgts[k2];
    const o = s.w.th[want], [cx, cy] = hitCenter(s.w, o);
    const press = ph > 0.45 && ph < 0.65 ? 1 : 0;
    if (press) {
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2.5;
      ell(ctx, R(cx), R(cy), R(0.03) + ph * R(0.03), R(0.03) + ph * R(0.03));
      ctx.stroke();
    }
    const off = R(Math.max(0.03, RZ[Math.max(1, o.z)] * 0.9));
    drawHand(ctx, R(cx) + off * 0.5, R(cy) + off, R(0.07), press);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4a2a12';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tip = s.stage === 0 ? '톡!' : s.sel === 0 ? '이제 호박 톡!' : want === 0 ? '하나 톡' : '다른 하나 톡';
    ctx.strokeText(tip, R(cx) + R(0.1) + off * 0.5, R(cy) + off + R(0.05));
    ctx.fillText(tip, R(cx) + R(0.1) + off * 0.5, R(cy) + off + R(0.05));
  }
  // ── 결과·실패 카드 ──
  if (s.phase === 'result') drawResult(ctx, s, v, w, h, R, font);
  if (s.phase === 'fail' && s.pt > 28) {
    const u = clamp((s.pt - 28) / 14, 0, 1);
    ctx.save();
    ctx.globalAlpha = u;
    ctx.fillStyle = 'rgba(40,20,10,.18)';
    ctx.fillRect(0, R(0.16), w, R(1.23));
    const cy = R(0.3) + (1 - ease(u)) * R(0.06);
    ctx.fillStyle = '#fff6dc';
    rr(ctx, R(0.12), cy, R(0.76), R(0.25), R(0.04));
    ctx.fill();
    stroke(ctx, '#c08a50', 2.5);
    ctx.fillStyle = '#d9480f';
    ctx.textAlign = 'center';
    font(0.06, 900);
    ctx.fillText(s.why.includes('잡혔') ? '잡혔다!' : '꽉 막혔어요!', R(0.5), cy + R(0.06));
    ctx.fillStyle = '#4a2a12';
    font(0.034, 800);
    ctx.fillText(s.why, R(0.5), cy + R(0.12));
    ctx.fillText(s.hearts > 0 ? `하트 -1 · 다시 해 봐요!` : '하트를 다 썼어요', R(0.5), cy + R(0.18));
    ctx.restore();
  }
}
function drawResult(ctx: C2, s: SwapState, v: Vis, w: number, h: number, R: (v: number) => number, font: (sz: number, wgt?: number) => void) {
  void h;
  const u = clamp((s.pt - 16) / 18, 0, 1);
  if (u <= 0) return;
  const t = s.t;
  ctx.save();
  ctx.globalAlpha = u;
  ctx.fillStyle = 'rgba(40,20,10,.4)';
  ctx.fillRect(0, R(0.16), w, R(1.23));
  const y0 = R(0.24) + (1 - ease(u)) * R(0.08), cw = R(0.86), ch = R(1.08), x0 = R(0.07);
  ctx.fillStyle = 'rgba(40,20,10,.3)';
  rr(ctx, x0, y0 + R(0.01), cw, ch, R(0.05));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ch, [0, '#fffaf0'], [1, '#ffe9c4']);
  rr(ctx, x0, y0, cw, ch, R(0.05));
  ctx.fill();
  stroke(ctx, '#c08a50', 3);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d9480f';
  font(0.068, 900);
  ctx.fillText(s.won ? '동물원 대탈출 성공!' : '탈출 성공!', R(0.5), y0 + R(0.07));
  // 별
  for (let i = 0; i < s.ofStars; i++) {
    const k = t - v.starT - (34 + i * 14), sx = R(0.5) + (i - (s.ofStars - 1) / 2) * R(0.15), sy = y0 + R(0.17);
    const on = s.starOk[i] && k >= 0, pop = on ? (k < 8 ? 1 + 0.4 * Math.sin((k / 8) * Math.PI) : 1) : 1;
    ctx.fillStyle = on ? '#ffcf3a' : '#e3d6c0';
    starPath(ctx, sx, sy, R(0.055) * pop);
    ctx.fill();
    stroke(ctx, on ? '#b8780e' : '#c8bca8', 2);
  }
  ctx.fillStyle = '#6a4a2a';
  font(0.034, 800);
  ctx.fillText(`바꾼 횟수 ${s.w.swaps}번${s.got < s.ofStars ? ` · 별 셋은 ${starsOf(s.stage)[s.ofStars - 1].max}번` : ''}`, R(0.5), y0 + R(0.255));
  // 도감 사진(폴라로이드)
  const nk = s.newDex[0] ?? s.w.th[s.w.walkers[0]].k, isNew = s.newDex.length > 0, py = y0 + R(0.3);
  ctx.save();
  ctx.translate(R(0.5), py + R(0.2));
  ctx.rotate(-0.04);
  ctx.fillStyle = 'rgba(40,20,10,.25)';
  rr(ctx, -R(0.2) + R(0.008), -R(0.2) + R(0.01), R(0.4), R(0.46), R(0.01));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, -R(0.2), -R(0.2), R(0.4), R(0.46), R(0.01));
  ctx.fill();
  stroke(ctx, '#d8ccb8', 1.5);
  ctx.fillStyle = lin(ctx, 0, -R(0.18), 0, R(0.16), [0, '#9fdcff'], [0.65, '#d8f4ff'], [0.66, '#9fdc6a'], [1, '#7cc64e']);
  ctx.fillRect(-R(0.18), -R(0.18), R(0.36), R(0.34));
  const L: Look = { t, ph: t * 0.1, face: 'happy', sq: 0, lift: Math.abs(Math.sin(t * 0.1)) * R(0.01), walk: 0, tall: R(0.27), swim: 0, seed: 2 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(-R(0.18), -R(0.18), R(0.36), R(0.34));
  ctx.clip();
  if (s.won) {
    // 마지막: 모두 함께 단체 사진
    DEX.forEach((k, i) => {
      const row = i < 5 ? 1 : 0, col = row ? i : i - 5, gx = -R(0.14) + col * R(0.07) + (row ? 0 : R(0.035)), gy = row ? R(0.13) : R(0.04);
      drawAnimal(ctx, k, gx, gy, R(k === 'giraffe' ? 0.022 : 0.03), { ...L, ph: i, lift: Math.abs(Math.sin(t * 0.1 + i)) * R(0.008), seed: i });
    });
  } else drawAnimal(ctx, nk, -R(0.02), R(0.12), R(nk === 'giraffe' ? 0.06 : 0.085), L);
  ctx.restore();
  ctx.fillStyle = '#4a2a12';
  font(0.04, 900);
  ctx.fillText(s.won ? '모두 함께 찰칵!' : K[nk].name, 0, R(0.205));
  ctx.restore();
  if (isNew) {
    const k2 = t - v.starT - 80, pop = k2 >= 0 && k2 < 10 ? 1 + 0.3 * Math.sin((k2 / 10) * Math.PI) : 1;
    ctx.save();
    ctx.translate(R(0.74), py + R(0.03));
    ctx.rotate(0.2);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#ff4a6a';
    rr(ctx, -R(0.09), -R(0.03), R(0.18), R(0.06), R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.032, 900);
    ctx.fillText('새 친구!', 0, 1);
    ctx.restore();
  }
  ctx.fillStyle = '#6a4a2a';
  font(0.032, 800);
  ctx.fillText(s.won ? '동물원 친구 열 마리가 모두 밖으로!' : isNew ? `특기: ${K[nk].skill}` : '또 만났어요! 도감 사진 한 장 더', R(0.5), py + R(0.515));
  // 다음 친구 실루엣
  const nx = nextNew(s);
  if (nx && !s.won) {
    const ny = y0 + R(0.92);
    portrait(ctx, nx, R(0.3), ny, R(0.055), 'sil', t);
    ctx.fillStyle = '#3d6fb0';
    ctx.textAlign = 'left';
    font(0.034, 900);
    ctx.fillText('다음에 만날 친구는…?', R(0.38), ny);
    ctx.textAlign = 'center';
  } else if (s.won) {
    ctx.fillStyle = '#3d6fb0';
    font(0.036, 900);
    ctx.fillText(`도감 ${s.dex.filter(Boolean).length}/${DEX.length} — 모두 탈출!`, R(0.5), y0 + R(0.92));
  }
  if (s.pt > 60) {
    const btn = (b: [number, number, number, number], label: string, hot: boolean) => {
      ctx.fillStyle = hot ? '#ffcf3a' : '#fff3c4';
      rr(ctx, R(b[0] - b[2] / 2), R(b[1] - b[3] / 2), R(b[2]), R(b[3]), R(0.03));
      ctx.fill();
      stroke(ctx, '#4a2a12', 2);
      ctx.fillStyle = '#4a2a12';
      font(0.034, 900);
      ctx.fillText(label, R(b[0]), R(b[1]) + 1);
    };
    if (s.won) {
      ctx.fillStyle = '#4a2a12';
      font(0.036, 900);
      ctx.fillText('끝까지 탈출했어요!', R(0.5), R(NEXT[1]));
    } else if (s.got < s.ofStars) {
      btn(REPLAY, '↺ 별 더 따기', false);
      btn(NEXT, '다음 판 ▶', true);
    } else btn([0.5, NEXT[1], 0.5, NEXT[3]], '다음 판 ▶', true);
  }
  // 장이 끝나면: 다음 장 미리 보기 띠
  const nd = STAGES[s.stage + 1];
  if (nd && nd.ch !== STAGES[s.stage].ch) {
    ctx.save();
    ctx.translate(R(0.5), y0 - R(0.012));
    ctx.rotate(-0.03);
    ctx.fillStyle = '#3d8df5';
    rr(ctx, -R(0.4), -R(0.03), R(0.8), R(0.06), R(0.03));
    ctx.fill();
    stroke(ctx, '#1c5aa8', 2);
    ctx.fillStyle = '#ffffff';
    font(0.032, 900);
    ctx.fillText(`${STAGES[s.stage].ch + 1}장 끝! 다음은 ${CHAPTERS[nd.ch]}`, 0, 1);
    ctx.restore();
  }
  ctx.restore();
}

/** 분석용 그림 모음(동물·소품 한눈에) */
export function __gallery(ctx: C2, ks: Kind[], props: Kind[]) {
  ks.forEach((k, i) => {
    const x = 80 + (i % 5) * 290, y = 260 + Math.floor(i / 5) * 260;
    for (const [j, f] of (['idle', 'shock', 'strain', 'happy'] as Face[]).entries()) {
      const L: Look = { t: 30, ph: j, face: f, sq: 0, lift: 0, walk: j === 0 ? 0 : 1, tall: 170, swim: 0, seed: i };
      if (j === 0) drawAnimal(ctx, k, x + 40, y, 45, L);
      else drawAnimal(ctx, k, x + 110 + j * 45, y - 120, 16, L);
    }
  });
  props.forEach((k, i) => drawThing(ctx, k, 60 + i * 110, 680, 34, 0, 10));
  drawKeeper(ctx, 1420, 250, 50, 'duty', 10, true, 1);
  drawKeeper(ctx, 1420, 500, 50, 'alarm', 10, false, 1);
}
