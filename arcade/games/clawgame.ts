/**
 * 줄줄이 인형 뽑기 (23라운드 '완전히 다른 장르') — 인형 뽑기 × 원버튼 × 연쇄.
 * 기준 9(손이 하는 일은 하나): 집게가 저절로 좌우로 오간다. 톡 = 그 자리에서 '징~' 내려가 그림자 아래 인형을 집는다.
 * 와우: 인형끼리 털실로 엮여 있어서 하나를 집으면 줄줄이 딸려 나온다 — 잘 고르면 한 번에 다섯 마리.
 *       대신 엮인 무게가 합쳐진다. 집게 힘보다 무거우면 올라가다 '툭' 미끄러진다(결정적 — 무작위 미끄러짐 없음).
 * 읽히는 결과: 집게 그림자에 걸린 인형과 딸려 올 줄이 빛나고, 그 위에 '🧸3 · 무게 5/6'(초록) 또는 '무게 8/6 툭!'(빨강)이 뜬다.
 * 첫 3초: 1판은 집게가 크고 느리고, 시작부터 곰인형(병아리 둘이 엮인) 바로 위 — 첫 톡에 곰+병아리 둘이 줄줄이 '쏙'.
 * 판: 동전 N개(= 시도 N번)로 인형 X마리 이상. 별 = ★ 목표 · ★ 동전 남김 · ★ 왕관 곰. 목표를 채우면 그 자리에서 판 끝(남은 동전은 보너스).
 *     동전을 다 써도 못 채우면 하트 -1, 같은 기계로 다시. 하트 셋을 다 쓰거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 집기·줄줄이·왕관 곰 → 2판 무게 > 힘이면 툭 → 3판 힘 동전(먼저 집으면 이번 판 힘 +3)
 *   → 4판 움직이는 바닥(바닥이 오가서 노리는 때가 바뀜) → 5판 꿈틀 상자(통통 옮겨 다님 — 집으면 진짜 고양이가 매달려 나옴, 인형 3마리 몫)
 *   → 6판 가위 꽃게(매달리면 반대쪽 실을 싹둑 — 어느 쪽을 집느냐가 수) → 7판 투명 덮개(미끄러져 오가는 덮개 위로 내리면 '텅!')
 *   → 8판 대왕 인형 산(다 섞임).
 * 웃음(기준 10): 집게에 얼굴이 있다(무표정 → 무거우면 끙 · 미끄러지면 헉 · 뽑으면 우쭐 · 덮개에 박으면 어질어질).
 *   미끄러진 인형은 엉덩방아 찧고 머리 위에 별이 돈다. 뽑힌 인형은 기계 앞에 줄 서서 차례로 꾸벅 인사.
 *   기계 옆 아이 구경꾼이 '와아!' / '에이~' / '고양이다!!'. 잡힌 고양이는 기계 지붕에 올라가 꼬리를 흔든다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 인형 자리: 10칸 (화면 가로 0~1) */
export const SLOTS = 10, SLOT0 = 0.272, SLOT_W = 0.069;
/** 집게가 오가는 범위 · 출구(왼쪽 투명 통) */
const PIT_L = 0.25, PIT_R = 0.94, CHUTE_X = 0.148;
/** 연출 시간(틱) */
const DROP = 30, CLOSE = 12, RISE = 36, SLIP_AT = 16, RELEASE = 20, RESULT = 170, RESULT_OK = 175, BONK_Z = 0.39;
const CARRY_V = 0.024, BACK_V = 0.03;
const POWER_UP = 3, BOX_R = 0.034, HOP = 96, HOP_T = 22;
/** 점수: 별이 중심 (별 하나 100점), 인형 하나 10점, 남긴 동전 하나 20점 */
const STAR_PTS = 100, DOLL_PTS = 10, COIN_PTS = 20;

export type Kind = 'chick' | 'bunny' | 'bear' | 'crown' | 'crab' | 'power' | 'box';
const KINDS: Record<string, { k: Kind; w: number; n: number }> = {
  c: { k: 'chick', w: 1, n: 1 },
  b: { k: 'bunny', w: 2, n: 1 },
  B: { k: 'bear', w: 3, n: 1 },
  K: { k: 'crown', w: 3, n: 1 },
  S: { k: 'crab', w: 1, n: 1 },
  P: { k: 'power', w: 0, n: 0 },
};
const BOX = { k: 'box' as Kind, w: 2, n: 3 };
const KNAME: Record<Kind, string> = { chick: '병아리', bunny: '토끼', bear: '곰', crown: '왕관 곰', crab: '가위 꽃게', power: '힘 동전', box: '꿈틀 상자' };

interface StageDef {
  name: string;
  coins: number;
  goal: number;
  /** 집게 힘 */
  str: number;
  /** 집게가 한 틱에 가는 거리 · 집는 반경(그림자 크기) */
  speed: number;
  grab: number;
  /** 엮인 덩어리(같은 글자 묶음 = 실로 엮임), '_' = 빈 자리. c 병아리1 · b 토끼2 · B 곰3 · K 왕관 곰3 · S 가위 꽃게1 · P 힘 동전 */
  chains: string;
  /** 1판만: 덩어리 순서를 섞지 않는다 (첫 톡 연출) */
  fixed?: boolean;
  /** 움직이는 바닥 진폭 */
  belt?: number;
  /** 투명 덮개 폭 */
  cover?: number;
  /** 꿈틀 상자(고양이) */
  box?: boolean;
  /** 이 판에 새로 나오는 것 (seen 키 · 알림) */
  news?: [string, string];
}

export const STAGES: StageDef[] = [
  { name: '곰인형 뽑기', coins: 3, goal: 4, str: 9, speed: 0.0032, grab: 0.1, chains: 'bc Bcc K cc bc', fixed: true },
  { name: '무거우면 툭', coins: 5, goal: 6, str: 5, speed: 0.0042, grab: 0.07, chains: 'cccb Bb K BB _', news: ['slip', '무게가 집게 힘보다 크면 올라가다 툭!'] },
  { name: '힘 동전', coins: 4, goal: 7, str: 5, speed: 0.0047, grab: 0.052, chains: 'P cBccc Kc bb', news: ['power', '💪 힘 동전을 먼저 뽑으면 이번 판 힘 +3'] },
  { name: '움직이는 바닥', coins: 4, goal: 8, str: 6, speed: 0.005, grab: 0.05, chains: 'ccbcc Kc Bb _', belt: 0.032, news: ['belt', '바닥이 왔다 갔다 — 그림자를 잘 보고!'] },
  { name: '꿈틀 상자', coins: 4, goal: 9, str: 6, speed: 0.0052, grab: 0.05, chains: 'cccc Kb Bb bc', box: true, news: ['box', '📦 꿈틀 상자가 통통 — 속에 뭐가 있을까?'] },
  { name: '가위 꽃게', coins: 4, goal: 8, str: 6, speed: 0.0055, grab: 0.05, chains: 'cccSBB Kc cc', news: ['crab', '✂️ 가위 꽃게는 반대쪽 실을 싹둑 끊어요'] },
  { name: '투명 덮개', coins: 4, goal: 7, str: 5, speed: 0.0058, grab: 0.05, chains: 'P ccBcc Kb bb', cover: 0.2, news: ['cover', '투명 덮개 위로 내리면 텅! 비켜날 때를 노려요'] },
  { name: '대왕 인형 산', coins: 5, goal: 11, str: 5, speed: 0.006, grab: 0.05, chains: 'P ccSBcc Kc b', belt: 0.03, box: true, news: ['finale', '대왕 인형 산 — 다 섞였어요!'] },
];
export const STAGE_COUNT = STAGES.length;

export interface Doll { id: number; kind: Kind; slot: number; w: number; n: number; gone: boolean; held: boolean; fell: number; grp: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; n?: number }
type Phase = 'aim' | 'drop' | 'close' | 'rise' | 'carry' | 'release' | 'back' | 'result';
export interface Grab { ids: number[]; weight: number; n: number; ok: boolean; bonk: boolean; x: number; cuts: [number, number][]; slipped: boolean }
export interface ClawState {
  rng: Rng; seed: number; t: number; stage: number; phase: Phase; pt: number;
  dolls: Doll[]; links: [number, number][]; cuts: { a: number; b: number; t: number }[];
  cx: number; dir: 1 | -1; cz: number; open: number;
  coins: number; got: number; crown: boolean; power: boolean; cats: number;
  belt: number; coverPh: number; boxPh: number; hops: number[];
  grab: Grab | null;
  hearts: number; stars: number; pts: number; ok: boolean; starsThis: number; won: boolean; dead: boolean;
  seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null;
  /** 이번 판에 뽑힌 인형 (기계 앞 줄) */
  line: { kind: Kind; t: number }[];
  taps: number; lastSay: { text: string; t: number; mood: string } | null;
  /** 지붕 위 고양이 수 (판이 지나도 남는다) */
  roofCats: number;
}

const ev = (s: ClawState, kind: string, x: number, y: number, text?: string, col?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, n });
function see(s: ClawState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news = { text, t: s.t };
}
function kid(s: ClawState, mood: string, text: string) {
  s.lastSay = { text, t: s.t, mood };
}

const def = (s: ClawState) => STAGES[s.stage];
/** 1판 시작 자리: 첫 곰인형 위 */
const homeX = (s: ClawState) => slotX((s.dolls.find((x) => x.kind === 'bear')?.slot ?? 1) + 0.6);
const WAIT0 = 180;
export const strength = (s: ClawState) => def(s).str + (s.power ? POWER_UP : 0);
const beltOff = (s: ClawState) => (def(s).belt ? def(s).belt! * Math.sin((s.belt * Math.PI * 2) / 270) : 0);
export const coverX = (s: ClawState) => 0.625 + 0.215 * Math.sin((s.coverPh * Math.PI * 2) / 330 + 0.6);
const slotX = (k: number) => SLOT0 + k * SLOT_W;
/** 꿈틀 상자: HOP틱마다 다음 자리로 통통 (뛰는 동안은 그 사이) */
export function boxX(s: ClawState): number {
  const n = s.hops.length, k = Math.floor(s.boxPh / HOP), f = s.boxPh % HOP;
  const a = slotX(s.hops[k % n]), b = slotX(s.hops[(k + 1) % n]);
  const p = f < HOP - HOP_T ? 0 : (f - (HOP - HOP_T)) / HOP_T;
  return a + (b - a) * (p * p * (3 - 2 * p)) + beltOff(s);
}
export const boxHop = (s: ClawState) => {
  const f = s.boxPh % HOP;
  return f < HOP - HOP_T ? 0 : Math.sin(((f - (HOP - HOP_T)) / HOP_T) * Math.PI);
};
export const dollX = (s: ClawState, d: Doll) => (d.kind === 'box' ? boxX(s) : slotX(d.slot) + beltOff(s));
export const covered = (s: ClawState, x: number) => !!def(s).cover && Math.abs(x - coverX(s)) < def(s).cover! / 2;

/** 실을 따라 딸려 오는 인형들 (가위 꽃게는 매달리면 반대쪽 실을 끊는다 — 꽃게를 바로 집으면 꽃게만) */
export function liftSet(dolls: Doll[], links: [number, number][], start: number, alive: (i: number) => boolean): { ids: number[]; cuts: [number, number][] } {
  const ids = [start], seen = new Set([start]), q = dolls[start].kind === 'crab' ? [] : [start];
  while (q.length) {
    const a = q.shift()!;
    for (const [p, r] of links) {
      const b = p === a ? r : r === a ? p : -1;
      if (b < 0 || seen.has(b) || !alive(b)) continue;
      seen.add(b);
      ids.push(b);
      if (dolls[b].kind !== 'crab') q.push(b);
    }
  }
  const cuts: [number, number][] = [];
  for (const [p, r] of links) {
    if (!alive(p) || !alive(r)) continue;
    if (seen.has(p) !== seen.has(r)) cuts.push([p, r]);
  }
  return { ids, cuts };
}

/** 지금 이 자리(x)에서 내리면 무엇을 집나 — 화면 미리 보기·봇·실제 집기가 모두 이 함수 하나를 쓴다 */
export function grabAt(s: ClawState, x: number): Grab {
  const none: Grab = { ids: [], weight: 0, n: 0, ok: true, bonk: false, x, cuts: [], slipped: false };
  if (covered(s, x)) return { ...none, bonk: true };
  const box = s.dolls.find((d) => d.kind === 'box' && !d.gone);
  let pick = -1;
  if (box && Math.abs(boxX(s) - x) <= BOX_R) pick = box.id;
  else {
    let best = def(s).grab;
    for (const d of s.dolls) {
      if (d.gone || d.kind === 'box') continue;
      const dx = Math.abs(dollX(s, d) - x);
      if (dx <= best) (best = dx), (pick = d.id);
    }
  }
  if (pick < 0) return none;
  const { ids, cuts } = liftSet(s.dolls, s.links, pick, (i) => !s.dolls[i].gone);
  const weight = ids.reduce((a, i) => a + s.dolls[i].w, 0), n = ids.reduce((a, i) => a + s.dolls[i].n, 0);
  return { ids, weight, n, ok: weight <= strength(s), bonk: false, x, cuts, slipped: false };
}

function newStage(s: ClawState) {
  const d = def(s), r = mulberry32(s.seed * 31 + s.stage * 1013 + 7);
  let groups = d.chains.split(' ');
  if (!d.fixed)
    for (let i = groups.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [groups[i], groups[j]] = [groups[j], groups[i]];
    }
  let used = groups.reduce((a, g) => a + g.length, 0);
  while (used < SLOTS) groups.splice(Math.floor(r() * (groups.length + 1)), 0, '_'), used++;
  groups = groups.filter((g) => g.length);
  s.dolls = [];
  s.links = [];
  let slot = 0, gi = 0;
  for (const g of groups) {
    let prev = -1;
    gi++;
    for (const ch of g) {
      if (ch !== '_') {
        const k = KINDS[ch], id = s.dolls.length;
        s.dolls.push({ id, kind: k.k, slot, w: k.w, n: k.n, gone: false, held: false, fell: -999, grp: gi });
        if (prev >= 0) s.links.push([prev, id]);
        prev = id;
      }
      slot++;
    }
  }
  s.hops = [];
  if (d.box) {
    s.dolls.push({ id: s.dolls.length, kind: 'box', slot: -1, w: BOX.w, n: BOX.n, gone: false, held: false, fell: -999, grp: -1 });
    let k = Math.floor(r() * 3);
    for (let i = 0; i < 7; i++) s.hops.push(k), (k = (k + 3 + Math.floor(r() * 2)) % SLOTS);
  }
  s.cuts = [];
  s.coins = d.coins;
  s.got = 0;
  s.crown = false;
  s.power = false;
  s.belt = 0;
  s.coverPh = 0;
  s.boxPh = 0;
  s.grab = null;
  s.line = [];
  s.phase = 'aim';
  s.pt = 0;
  s.cz = 0;
  s.open = 1;
  s.dir = 1;
  // 1판: 곰인형(병아리 둘이 엮인) 바로 위에서 시작 — 첫 톡에 줄줄이
  s.cx = d.fixed ? homeX(s) : PIT_L;
  if (d.news) see(s, d.news[0], d.news[1]);
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`);
}

function endStage(s: ClawState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.grab = null;
  if (ok) {
    const st = 1 + (s.coins >= 1 ? 1 : 0) + (s.crown ? 1 : 0);
    s.starsThis = st;
    s.stars += st;
    s.pts += st * STAR_PTS + s.coins * COIN_PTS;
    if (s.stage + 1 >= STAGES.length) s.won = true;
    ev(s, 'clear', 0.5, 0.6, `${s.stage + 1}판 통과!`);
    kid(s, 'wow', st === 3 ? '별 셋이다!!' : '와아! 통과!');
  } else {
    s.hearts--;
    s.starsThis = 0;
    ev(s, 'fail', 0.5, 0.6, '동전이 다 떨어졌어요');
    kid(s, 'aww', '에이~ 한 번 더!');
  }
}

function deliver(s: ClawState, g: Grab) {
  let n = 0;
  for (const i of g.ids) {
    const d = s.dolls[i];
    d.held = false;
    d.gone = true;
    n += d.n;
    if (d.kind === 'crown') s.crown = true;
    if (d.kind === 'power') s.power = true;
    if (d.kind === 'box') s.cats++, s.roofCats++;
    s.line.push({ kind: d.kind, t: s.t + 14 + s.line.length * 4 });
  }
  s.got += n;
  s.pts += n * DOLL_PTS;
  ev(s, 'deliver', CHUTE_X, 0.8, n ? `쏙! +${n}` : '쏙!', '#ffe36e', n);
  if (g.ids.some((i) => s.dolls[i].kind === 'power')) ev(s, 'power', CHUTE_X, 0.7, `힘 +${POWER_UP}! 💪${strength(s)}`, '#ffd43b'), kid(s, 'wow', '집게가 세졌다!');
  else if (g.ids.some((i) => s.dolls[i].kind === 'box')) kid(s, 'laugh', '고양이다!!');
  else if (n >= 5) kid(s, 'wow', `와아아! ${n}마리!`);
  else if (n >= 1) kid(s, 'wow', s.crown && g.ids.some((i) => s.dolls[i].kind === 'crown') ? '왕관 곰이다!' : '와아!');
}

export const clawgame: GameDef<ClawState> = {
  id: 'clawgame',
  name: '줄줄이 인형 뽑기',
  genes: ['claw', 'onebutton', 'chain'],
  twist: '인형끼리 털실로 엮여 있어 하나를 집으면 줄줄이 딸려 나온다 — 한 번에 다섯 마리도 나오지만, 엮인 무게가 합쳐져 집게 힘을 넘으면 올라가다 툭 미끄러진다',
  rules: ['집게가 오갈 때 톡 = 내리기. 그림자 아래 인형을 집어요 (실로 엮인 인형은 줄줄이!)', '엮인 무게를 합쳐 집게 힘보다 무거우면 툭 미끄러져요. 동전을 다 쓰기 전에 목표 마릿수!'],
  controls: 'tap',
  hint: '톡 = 집게 내리기 / 스페이스',
  aspect: A,
  art: {
    concept: '한밤 오락실의 인형 뽑기 기계',
    mood: '네온이 번지는 오락실 구석, 사탕색 인형 뽑기 기계. 유리에 불빛이 비치고 털실로 엮인 인형들이 소복이 쌓였다. 얼굴 달린 은빛 집게가 끙끙대고, 옆에서 아이가 유리에 코를 박고 구경한다.',
    palette: { bg: '#1b1033', ink: '#fff4fb', muted: '#8f79b8', accent: '#46f0ff', hot: '#ff4f9a', soft: '#3a2266' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'aim', pt: 0,
      dolls: [], links: [], cuts: [], cx: 0.5, dir: 1, cz: 0, open: 1,
      coins: 0, got: 0, crown: false, power: false, cats: 0, belt: 0, coverPh: 0, boxPh: 0, hops: [],
      grab: null, hearts: 3, stars: 0, pts: 0, ok: false, starsThis: 0, won: false, dead: false,
      seen: new Set<string>(), events: [], news: null, line: [], taps: 0, lastSay: null, roofCats: 0,
    } as ClawState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    const d = def(s);
    switch (s.phase) {
      case 'result':
        if (s.pt >= (s.ok ? RESULT_OK : RESULT)) {
          if (s.ok) {
            if (s.won) s.dead = true;
            else s.stage++, newStage(s);
          } else if (s.hearts <= 0) s.dead = true;
          else newStage(s);
        }
        return;
      case 'aim': {
        if (inp.tap && s.coins > 0) {
          s.coins--;
          s.taps++;
          s.grab = grabAt(s, s.cx);
          s.phase = 'drop';
          s.pt = 0;
          ev(s, 'coin', s.cx, 0.3, '징~', '#cfe8ff');
          return;
        }
        // 1판 첫 톡 전 3초: 집게가 곰인형(병아리 둘이 엮인) 위에서 살랑살랑 기다린다 — 첫 톡에 줄줄이 '쏙'
        if (d.fixed && s.taps === 0 && s.pt < WAIT0) s.cx = homeX(s) + 0.012 * Math.sin(s.pt * 0.07);
        else s.cx += s.dir * d.speed;
        if (s.cx > PIT_R) (s.cx = PIT_R), (s.dir = -1);
        if (s.cx < PIT_L) (s.cx = PIT_L), (s.dir = 1);
        s.belt++;
        s.coverPh++;
        s.boxPh++;
        return;
      }
      case 'drop': {
        const g = s.grab!, p = Math.min(1, s.pt / DROP);
        s.cz = p * p * (3 - 2 * p);
        if (g.bonk && s.cz >= BONK_Z) {
          ev(s, 'bonk', s.cx, 0.6, '텅!', '#bdf3ff');
          kid(s, 'aww', '덮개잖아~');
          see(s, 'cover', '투명 덮개 위로 내리면 텅! 비켜날 때를 노려요');
          s.phase = 'rise';
          s.pt = RISE - Math.round(RISE * BONK_Z);
          return;
        }
        if (s.pt >= DROP) (s.phase = 'close'), (s.pt = 0);
        return;
      }
      case 'close': {
        const g = s.grab!;
        s.open = Math.max(0, 1 - s.pt / CLOSE);
        if (s.pt < CLOSE) return;
        if (!g.ids.length) {
          ev(s, 'empty', s.cx, 0.87, '허탕~', '#ffffff');
          kid(s, 'aww', '아깝다~');
        } else {
          for (const i of g.ids) s.dolls[i].held = true;
          for (const [a, b] of g.cuts) {
            s.cuts.push({ a, b, t: s.t });
            s.links = s.links.filter(([p, q]) => !(p === a && q === b));
          }
          if (g.cuts.length) ev(s, 'snip', dollX(s, s.dolls[g.cuts[0][0]]) / 2 + dollX(s, s.dolls[g.cuts[0][1]]) / 2, 0.87, '싹둑!', '#ff8a8a'), see(s, 'crab', '✂️ 가위 꽃게는 반대쪽 실을 싹둑 끊어요');
          if (g.ids.length >= 2) see(s, 'thread', '실로 엮인 인형은 줄줄이 딸려 와요!');
          if (g.n >= 5) see(s, 'five', '한 번에 다섯 마리!');
          if (s.dolls[g.ids[0]].kind === 'box') see(s, 'cat', '상자 속엔 진짜 고양이! (인형 3마리 몫)');
          ev(s, 'grab', s.cx, 0.87, g.ok ? (g.ids.length > 1 ? `줄줄이 ${g.ids.length}!` : `${KNAME[s.dolls[g.ids[0]].kind]}!`) : `무게 ${g.weight} > 힘 ${strength(s)}`, g.ok ? '#b6ff9e' : '#ffb0b0', g.ids.length);
        }
        s.phase = 'rise';
        s.pt = 0;
        return;
      }
      case 'rise': {
        const g = s.grab!;
        s.cz = Math.max(0, 1 - s.pt / RISE);
        if (g.ids.length && !g.ok && !g.slipped && s.pt >= SLIP_AT) {
          g.slipped = true;
          for (const i of g.ids) (s.dolls[i].held = false), (s.dolls[i].fell = s.t);
          ev(s, 'slip', s.cx, 0.42 + s.cz * 0.49, '툭!', '#ff8a8a');
          kid(s, 'aww', '에이~ 무거워!');
          see(s, 'slip', '무게가 집게 힘보다 크면 올라가다 툭!');
        }
        if (s.pt < RISE) return;
        s.cz = 0;
        if (g.ids.length && g.ok) (s.phase = 'carry'), (s.pt = 0);
        else if (s.coins <= 0) endStage(s, false);
        else (s.phase = 'aim'), (s.pt = 0), (s.open = 1);
        return;
      }
      case 'carry':
        s.cx = Math.max(CHUTE_X, s.cx - CARRY_V);
        if (s.cx <= CHUTE_X) (s.phase = 'release'), (s.pt = 0);
        return;
      case 'release': {
        const g = s.grab!;
        s.open = Math.min(1, s.pt / 8);
        if (s.pt === 8) {
          deliver(s, g);
          if (!s.seen.has('grab')) see(s, 'grab', '집게 그림자 아래 인형을 집어요');
        }
        if (s.pt < RELEASE) return;
        if (s.got >= d.goal) endStage(s, true);
        else if (s.coins <= 0) endStage(s, false);
        else (s.phase = 'back'), (s.pt = 0);
        return;
      }
      case 'back':
        s.cx = Math.min(PIT_L, s.cx + BACK_V);
        if (s.cx >= PIT_L) (s.phase = 'aim'), (s.pt = 0), (s.dir = 1);
        return;
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
/** 판 끝까지 내다보기: 남은 인형 집합 · 힘 동전 · 남은 동전으로 할 수 있는 모든 순서를 따져 별·점수가 가장 큰 첫 수 (실을 따라 딸려 오는 집합 단위) */
export function plan(s: ClawState): { mask: number; val: number } {
  const d = def(s), D = s.dolls, n = D.length;
  const memo = new Map<string, { val: number; mask: number }>();
  const links = s.links;
  const rec = (rem: number, power: boolean, coins: number, got: number, crown: boolean): { val: number; mask: number } => {
    if (got >= d.goal) return { val: (1 + (coins >= 1 ? 1 : 0) + (crown ? 1 : 0)) * STAR_PTS + coins * COIN_PTS + got * DOLL_PTS, mask: 0 };
    if (coins <= 0) return { val: -1000 + got * DOLL_PTS, mask: 0 };
    const key = `${rem}|${power ? 1 : 0}|${coins}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let best = { val: -1000 + got * DOLL_PTS, mask: 0 };
    const tried = new Set<number>(), str = d.str + (power ? POWER_UP : 0);
    for (let i = 0; i < n; i++) {
      if (!(rem & (1 << i))) continue;
      const L = liftSet(D, links, i, (j) => !!(rem & (1 << j)));
      let m = 0, wt = 0, cnt = 0, cr = false, pw = false;
      for (const j of L.ids) (m |= 1 << j), (wt += D[j].w), (cnt += D[j].n), (cr ||= D[j].kind === 'crown'), (pw ||= D[j].kind === 'power');
      if (tried.has(m) || wt > str) continue;
      tried.add(m);
      const r = rec(rem & ~m, power || pw, coins - 1, got + cnt, crown || cr);
      if (r.val > best.val) best = { val: r.val, mask: m };
    }
    memo.set(key, best);
    return best;
  };
  let rem = 0;
  for (const x of D) if (!x.gone) rem |= 1 << x.id;
  return rec(rem, s.power, s.coins, s.got, s.crown);
}

const brain = new WeakMap<object, { key: string; mask: number }>();
const NO: Input = { tap: false, dir: 0 };
const TAP: Input = { tap: true, dir: 0 };
const maskOf = (ids: number[]) => ids.reduce((a, i) => a | (1 << i), 0);

/** 잘하는 봇: 판 끝까지 내다본 첫 수(어느 줄을 먼저)를 정하고, 그림자 미리 보기가 그 줄을 가리킬 때 톡 */
export const clawgameSmart: Bot<ClawState> = {
  name: '뽑기 고수',
  act(s) {
    if (s.phase !== 'aim') return NO;
    const key = `${s.stage}:${s.hearts}:${s.coins}:${s.got}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, mask: plan(s).mask }));
    if (!m.mask) return NO;
    const g = grabAt(s, s.cx);
    return !g.bonk && g.ok && g.ids.length && maskOf(g.ids) === m.mask ? TAP : NO;
  },
};

const dumbAt = new WeakMap<object, number>();
/** 못하는 봇: 아무 때나 톡 (미리 보기를 안 본다) */
export const clawgameRandom: Bot<ClawState> = {
  name: '아무 때나 톡',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 10 + Math.floor(rng() * 80);
    if (s.t < next) return NO;
    dumbAt.set(s, s.t + 20 + Math.floor(rng() * 110));
    return TAP;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 화면 배치 (가로 0~1, 세로 0~A) */
const RAIL_Y = 0.268, HUB0 = 0.345, DOLL_CY = 0.872, TIP_FLOOR = 0.9;
const GL = { x0: 0.058, x1: 0.942, y0: 0.232, y1: 0.998 };
const BKW = { x0: 0.14, x1: 0.86, y0: 0.262, y1: 0.79 };
const CH = { x0: 0.068, x1: 0.228, top: 0.735 };
const LINE_Y = 1.36, KID = { x: 0.872, y: 1.222 }, FLAP = { x: 0.148, y: 1.15 };
const DR: Record<Kind, number> = { chick: 0.038, bunny: 0.041, bear: 0.047, crown: 0.048, crab: 0.04, power: 0.038, box: 0.045 };
const clawScale = (s: ClawState) => Math.max(1, Math.min(1.4, def(s).grab / 0.05));
const tipLen = (sc: number) => 0.064 * sc;
const hubY = (s: ClawState, cz: number) => HUB0 + cz * (TIP_FLOOR - tipLen(clawScale(s)) - HUB0);
const slotY = (k: number) => DOLL_CY + (hsh(k * 3 + 1) - 0.5) * 0.012;
const floorY = (s: ClawState, d: Doll) => (d.kind === 'box' ? DOLL_CY - 0.006 - boxHop(s) * 0.075 : slotY(d.slot));
const FONT = "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
const WCOL = ['#7ee081', '#7ee081', '#ffd166', '#ff9f5a', '#ff6b6b'];
const YARN = ['#ff4f6a', '#3fb6ff', '#c77dff', '#ff9a1f', '#2fd3b0'];
const yarnCol = (dl: Doll) => YARN[(dl.grp + 10) % YARN.length];

type Face = 'calm' | 'happy' | 'dizzy' | 'scared' | 'bow';
type ClawMood = 'idle' | 'focus' | 'strain' | 'shock' | 'proud' | 'dizzy' | 'sad';

/** 집게에 매달린 k번째 인형의 자리 (실을 따라 하나씩 바닥에서 떨어져 올라온다) */
function hangPos(s: ClawState, ids: number[], k: number, cx: number, cz: number) {
  const tip = hubY(s, cz) + tipLen(clawScale(s)), lp = 1 - cz, n = ids.length, d = s.dolls[ids[k]];
  const fx0 = dollX(s, d), fy0 = floorY(s, d);
  const b = k === 0 ? clamp01(0.35 + lp * 5) : clamp01(lp * n * 1.4 - (k - 1));
  const sway = k ? Math.sin(s.t * 0.13 + k * 0.9) * 0.006 * k + (s.phase === 'carry' ? 0.007 * k : 0) : 0;
  const hx = cx + sway, hy = k === 0 ? tip - 0.02 : tip + 0.022 + k * 0.068;
  return { x: fx0 + (hx - fx0) * b, y: Math.min(fy0, fy0 + (hy - fy0) * b) };
}

function clawMood(s: ClawState): ClawMood {
  const g = s.grab, recent = (k: string, n: number) => s.events.some((e) => e.kind === k && s.t - e.t < n);
  if (s.phase === 'result') return s.ok ? 'proud' : 'sad';
  if (s.phase === 'aim') {
    if (recent('bonk', 80)) return 'dizzy';
    if (recent('slip', 70)) return 'shock';
    if (recent('empty', 50)) return 'sad';
    return 'idle';
  }
  if (!g) return 'idle';
  if (s.phase === 'drop' || s.phase === 'close') return 'focus';
  if (s.phase === 'rise') {
    if (g.bonk) return 'dizzy';
    if (!g.ids.length) return 'sad';
    if (g.slipped) return 'shock';
    return !g.ok || g.weight >= strength(s) - 1 ? 'strain' : 'proud';
  }
  return 'proud';
}

function eyes(ctx: CanvasRenderingContext2D, ex: number, ey: number, sp: number, er: number, face: Face, t = 0) {
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const x = ex + sx * sp;
    if (face === 'dizzy') {
      ctx.strokeStyle = '#2a1830';
      ctx.lineWidth = Math.max(1, er * 0.55);
      ctx.beginPath();
      for (let a = 0; a < 9; a++) {
        const rr = er * (0.25 + a * 0.12), an = a * 0.9 + t * 0.2 * sx;
        a ? ctx.lineTo(x + Math.cos(an) * rr, ey + Math.sin(an) * rr) : ctx.moveTo(x + Math.cos(an) * rr, ey + Math.sin(an) * rr);
      }
      ctx.stroke();
    } else if (face === 'happy' || face === 'bow') {
      ctx.strokeStyle = '#2a1830';
      ctx.lineWidth = Math.max(1.2, er * 0.6);
      ctx.beginPath();
      ctx.arc(x, ey + er * 0.4, er * 0.95, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (face === 'scared') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, ey, er * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1830';
      ctx.beginPath();
      ctx.arc(x, ey + er * 0.2, er * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#2a1830';
      ctx.beginPath();
      ctx.arc(x, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - er * 0.3, ey - er * 0.35, er * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function ball(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, light: string, dark: string) {
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.08);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, pose: 'cling' | 'sit') {
  ctx.save();
  ctx.translate(x, y);
  // 꼬리
  ctx.strokeStyle = '#e8892e';
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (pose === 'cling') ctx.moveTo(0, r * 1.2), ctx.quadraticCurveTo(r * 1.1 * Math.sin(t * 0.2), r * 1.9, r * 0.6, r * 2.2);
  else ctx.moveTo(r * 0.6, r * 0.7), ctx.quadraticCurveTo(r * 1.5, r * 0.5, r * (1.2 + 0.3 * Math.sin(t * 0.08)), -r * 0.2);
  ctx.stroke();
  // 몸
  if (pose === 'cling') ball(ctx, 0, r * 0.75, r * 0.62, r * 0.75, '#ffc27a', '#d9731f');
  else ball(ctx, 0, r * 0.55, r * 0.8, r * 0.6, '#ffc27a', '#d9731f');
  // 줄무늬
  ctx.strokeStyle = 'rgba(160,70,10,.55)';
  ctx.lineWidth = r * 0.12;
  for (const k of [0, 1]) (ctx.beginPath(), ctx.arc(0, r * (0.55 + k * 0.3), r * 0.5, Math.PI * 0.2, Math.PI * 0.8), ctx.stroke());
  // 머리 + 귀
  ctx.fillStyle = '#e8892e';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * r * 0.62, -r * 0.35);
    ctx.lineTo(sx * r * 0.52, -r * 1.05);
    ctx.lineTo(sx * r * 0.12, -r * 0.62);
    ctx.fill();
  }
  ball(ctx, 0, -r * 0.25, r * 0.72, r * 0.6, '#ffd08f', '#e0802a');
  ctx.fillStyle = '#ffb3c1';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sx * r * 0.5, -r * 0.5), ctx.lineTo(sx * r * 0.45, -r * 0.88), ctx.lineTo(sx * r * 0.22, -r * 0.6), ctx.fill());
  // 앞발 (매달리면 위로)
  ctx.fillStyle = '#fff1dc';
  if (pose === 'cling') for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * r * 0.42, -r * 0.95, r * 0.18, r * 0.14, 0, 0, Math.PI * 2), ctx.fill());
  else for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * r * 0.3, r * 1.05, r * 0.2, r * 0.13, 0, 0, Math.PI * 2), ctx.fill());
  // 얼굴
  const blink = pose === 'sit' && Math.sin(t * 0.05) > 0.96;
  if (pose === 'cling') eyes(ctx, 0, -r * 0.3, r * 0.27, r * 0.12, 'scared');
  else if (blink) eyes(ctx, 0, -r * 0.3, r * 0.27, r * 0.12, 'happy');
  else {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#7ed957';
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.27, -r * 0.3, r * 0.13, r * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1c1c';
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.27, -r * 0.3, r * 0.04, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#ff7f9a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.07, -r * 0.14);
  ctx.lineTo(r * 0.07, -r * 0.14);
  ctx.lineTo(0, -r * 0.06);
  ctx.fill();
  ctx.strokeStyle = '#5a2c10';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  if (pose === 'cling') ctx.arc(0, r * 0.02, r * 0.1, 0, Math.PI * 2);
  else ctx.moveTo(-r * 0.12, -r * 0.02), ctx.quadraticCurveTo(-r * 0.05, r * 0.04, 0, -r * 0.05), ctx.quadraticCurveTo(r * 0.05, r * 0.04, r * 0.12, -r * 0.02);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 0.8;
  for (const sx of [-1, 1]) for (const dy of [-0.05, 0.03]) (ctx.beginPath(), ctx.moveTo(sx * r * 0.3, -r * 0.1 + dy * r), ctx.lineTo(sx * r * 0.85, -r * 0.14 + dy * r * 2), ctx.stroke());
  ctx.restore();
}

/** 인형 하나 (가운데 x,y · 반지름 r px). 털 뭉치 질감 = 방사 그라디언트 + 바느질 선 */
function drawDoll(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, r: number, o: { face?: Face; tilt?: number; squash?: number; glow?: string | null; t?: number; peek?: boolean } = {}) {
  const face = o.face ?? 'calm', t = o.t ?? 0;
  ctx.save();
  if (o.glow) {
    const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.9);
    g.addColorStop(0, o.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(x, y + r * 0.9);
  if (o.tilt) ctx.rotate(o.tilt);
  if (o.squash) ctx.scale(1 + o.squash * 0.4, 1 - o.squash);
  ctx.translate(0, -r * 0.9);
  const mouth = (my: number, wdt: number) => {
    ctx.strokeStyle = '#3a1f24';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (face === 'scared' || face === 'dizzy') ctx.ellipse(0, my + r * 0.04, wdt * 0.45, wdt * 0.55, 0, 0, Math.PI * 2);
    else ctx.arc(0, my - wdt * 0.4, wdt, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  };
  const blush = (bx: number, by: number) => {
    ctx.fillStyle = 'rgba(255,120,150,.45)';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * bx, by, r * 0.13, r * 0.08, 0, 0, Math.PI * 2), ctx.fill());
  };
  if (kind === 'bear' || kind === 'crown') {
    const L = kind === 'crown' ? '#ffe08a' : '#d79a5e', Dk = kind === 'crown' ? '#b37a17' : '#7a4520', M = kind === 'crown' ? '#fff3c8' : '#f2cfa6';
    ball(ctx, 0, r * 0.45, r * 0.78, r * 0.6, L, Dk);
    for (const sx of [-1, 1]) ball(ctx, sx * r * 0.72, r * 0.38, r * 0.2, r * 0.3, L, Dk), ball(ctx, sx * r * 0.42, r * 0.92, r * 0.24, r * 0.15, M, Dk);
    ball(ctx, 0, r * 0.52, r * 0.36, r * 0.32, M, L);
    for (const sx of [-1, 1]) ball(ctx, sx * r * 0.5, -r * 0.8, r * 0.24, r * 0.24, L, Dk), ball(ctx, sx * r * 0.5, -r * 0.78, r * 0.12, r * 0.12, M, L);
    ball(ctx, 0, -r * 0.28, r * 0.68, r * 0.6, L, Dk);
    ball(ctx, 0, -r * 0.1, r * 0.3, r * 0.21, M, L);
    ctx.fillStyle = '#3a1f24';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.17, r * 0.11, r * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, 0, -r * 0.36, r * 0.26, r * 0.085, face, t);
    blush(r * 0.42, -r * 0.14);
    if (face !== 'calm') mouth(-r * 0.0, r * 0.1);
    // 바느질
    ctx.strokeStyle = 'rgba(80,40,10,.35)';
    ctx.setLineDash([r * 0.08, r * 0.07]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.lineTo(0, r * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
    if (kind === 'crown') {
      const cy = -r * 0.82;
      const cg = ctx.createLinearGradient(0, cy - r * 0.4, 0, cy + r * 0.1);
      cg.addColorStop(0, '#fff7b0');
      cg.addColorStop(1, '#e0a400');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-r * 0.38, cy + r * 0.1);
      ctx.lineTo(-r * 0.42, cy - r * 0.28);
      ctx.lineTo(-r * 0.2, cy - r * 0.08);
      ctx.lineTo(0, cy - r * 0.42);
      ctx.lineTo(r * 0.2, cy - r * 0.08);
      ctx.lineTo(r * 0.42, cy - r * 0.28);
      ctx.lineTo(r * 0.38, cy + r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a06c00';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ff4f9a';
      ctx.beginPath();
      ctx.arc(0, cy - r * 0.02, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      const sp = 0.5 + 0.5 * Math.sin(t * 0.15);
      ctx.fillStyle = `rgba(255,255,255,${sp})`;
      ctx.beginPath();
      ctx.arc(r * 0.3, cy - r * 0.3, r * 0.06 * (1 + sp), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'chick') {
    ctx.strokeStyle = '#e0a400';
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.lineCap = 'round';
    for (const a of [-0.4, 0, 0.4]) (ctx.beginPath(), ctx.moveTo(0, -r * 0.72), ctx.lineTo(Math.sin(a) * r * 0.32, -r * 0.72 - Math.cos(a) * r * 0.3), ctx.stroke());
    ball(ctx, 0, r * 0.1, r * 0.88, r * 0.82, '#fff6a8', '#f0b419');
    for (const sx of [-1, 1]) ball(ctx, sx * r * 0.78, r * 0.2, r * 0.22, r * 0.32, '#ffe46b', '#d99a0a');
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, -r * 0.02);
    ctx.lineTo(r * 0.16, -r * 0.02);
    ctx.lineTo(0, r * 0.18);
    ctx.closePath();
    ctx.fill();
    eyes(ctx, 0, -r * 0.22, r * 0.3, r * 0.09, face, t);
    blush(r * 0.48, r * 0.05);
    ctx.fillStyle = '#ff9a3c';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * r * 0.3, r * 0.9, r * 0.17, r * 0.08, 0, 0, Math.PI * 2), ctx.fill());
  } else if (kind === 'bunny') {
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * r * 0.26, -r * 0.82);
      ctx.rotate(sx * (0.16 + 0.05 * Math.sin(t * 0.1 + sx)));
      ball(ctx, 0, -r * 0.2, r * 0.17, r * 0.46, '#ffffff', '#e7a9c4');
      ctx.fillStyle = '#ffb6cf';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.18, r * 0.08, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ball(ctx, 0, r * 0.48, r * 0.66, r * 0.52, '#ffffff', '#e2a2c0');
    for (const sx of [-1, 1]) ball(ctx, sx * r * 0.38, r * 0.92, r * 0.2, r * 0.13, '#ffffff', '#e2a2c0');
    ball(ctx, 0, -r * 0.2, r * 0.64, r * 0.56, '#ffffff', '#e8acc8');
    ctx.fillStyle = '#ff7fa8';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.08, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, 0, -r * 0.27, r * 0.26, r * 0.085, face, t);
    blush(r * 0.4, -r * 0.05);
    if (face !== 'calm') mouth(r * 0.06, r * 0.09);
  } else if (kind === 'crab') {
    // 가위 꽃게: 두 팔을 번쩍 든 V자 — 끝에 은빛 가위가 싹둑싹둑 (이웃 인형에 가려지지 않게 머리 위로)
    ctx.strokeStyle = '#d0402c';
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sx * r * 0.55, r * 0.15), ctx.quadraticCurveTo(sx * r * 0.95, -r * 0.2, sx * r * 0.62, -r * 0.82), ctx.stroke());
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * r * 0.62, -r * 0.82);
      const snip = 0.22 + 0.2 * Math.sin(t * 0.3 + sx);
      for (const k of [-1, 1]) {
        ctx.save();
        ctx.rotate(-Math.PI / 2 + sx * 0.25 + k * snip);
        const bg = ctx.createLinearGradient(0, -r * 0.1, 0, r * 0.1);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(1, '#7f93ab');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-r * 0.05, -r * 0.1);
        ctx.lineTo(r * 0.72, 0);
        ctx.lineTo(-r * 0.05, r * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4f5d70';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#2b3445';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#c43d2a';
    ctx.lineWidth = Math.max(1, r * 0.1);
    for (const sx of [-1, 1]) for (const k of [0, 1]) (ctx.beginPath(), ctx.moveTo(sx * r * 0.5, r * 0.5), ctx.lineTo(sx * r * (0.85 + k * 0.12), r * (0.9 - k * 0.12)), ctx.stroke());
    ball(ctx, 0, r * 0.3, r * 0.82, r * 0.6, '#ff8f6b', '#c42a18');
    for (const sx of [-1, 1]) {
      ctx.strokeStyle = '#c42a18';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.22, 0);
      ctx.lineTo(sx * r * 0.26, -r * 0.3);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(0, -r * 0.36);
    for (const sx of [-1, 1]) ball(ctx, sx * r * 0.26, 0, r * 0.18, r * 0.18, '#ffffff', '#dddddd');
    eyes(ctx, 0, 0, r * 0.26, r * 0.085, face, t);
    ctx.restore();
    blush(r * 0.45, r * 0.32);
    mouth(r * 0.4, r * 0.1);
  } else if (kind === 'power') {
    const cg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.05);
    cg.addColorStop(0, '#fff8c4');
    cg.addColorStop(0.6, '#ffd23f');
    cg.addColorStop(1, '#c98a00');
    ctx.fillStyle = '#a86f00';
    ctx.beginPath();
    ctx.ellipse(r * 0.08, r * 0.05, r * 0.95, r * 0.98, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,0,.8)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#8a5200';
    ctx.font = `900 ${Math.round(r * 0.85)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+3', 0, r * 0.04);
    const sp = 0.5 + 0.5 * Math.sin(t * 0.12);
    ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * sp})`;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.55);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, rr = k % 2 ? r * 0.07 : r * 0.26 * sp + r * 0.08;
      ctx.lineTo(-r * 0.55 + Math.cos(a) * rr, -r * 0.55 + Math.sin(a) * rr);
    }
    ctx.fill();
  } else if (kind === 'box') {
    // 골판지 상자 + 틈으로 빛나는 눈 (고양이가 숨어 있다)
    const wob = Math.sin(t * 0.6) * (Math.sin(t * 0.05) > 0.4 ? 0.12 : 0.02);
    ctx.rotate(wob);
    ctx.fillStyle = '#9b6a32';
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 0.55);
    ctx.lineTo(r * 1.05, -r * 0.72);
    ctx.lineTo(r * 1.05, r * 0.72);
    ctx.lineTo(r * 0.85, r * 0.9);
    ctx.fill();
    const bg = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.9);
    bg.addColorStop(0, '#e4b77a');
    bg.addColorStop(1, '#b8823f');
    ctx.fillStyle = bg;
    ctx.fillRect(-r * 0.9, -r * 0.55, r * 1.75, r * 1.45);
    ctx.fillStyle = '#f0cf98';
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.55);
    ctx.lineTo(-r * 0.7, -r * 0.72);
    ctx.lineTo(r * 1.05, -r * 0.72);
    ctx.lineTo(r * 0.85, -r * 0.55);
    ctx.fill();
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(-r * 0.75, -r * 0.5, r * 1.5, r * 0.18);
    if (o.peek !== false && Math.sin(t * 0.07) > -0.6) {
      ctx.fillStyle = '#c6ff6a';
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * r * 0.22, -r * 0.41, r * 0.08, r * 0.05, 0, 0, Math.PI * 2), ctx.fill());
    }
    ctx.fillStyle = 'rgba(255,240,200,.7)';
    ctx.fillRect(-r * 0.1, -r * 0.32, r * 0.2, r * 1.22);
    ctx.fillStyle = '#6b3e12';
    ctx.font = `900 ${Math.round(r * 0.8)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', -r * 0.48, r * 0.25);
  }
  ctx.restore();
}

/** 무게 표: 인형 머리 위에 실로 매단 작은 카드 */
function weightTag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, wt: number, kind: Kind, hi: boolean) {
  const tw = w * 0.04, th = w * 0.04, ty = y;
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, ty + th / 2);
  ctx.lineTo(x, ty + th / 2 + w * 0.012);
  ctx.stroke();
  ctx.fillStyle = hi ? '#ffffff' : 'rgba(255,255,255,.88)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, ty - th / 2, tw, th, w * 0.008);
  ctx.fill();
  ctx.strokeStyle = kind === 'power' ? '#e0a400' : WCOL[Math.min(4, wt)];
  ctx.lineWidth = hi ? 2.2 : 1.6;
  ctx.stroke();
  ctx.fillStyle = kind === 'power' ? '#a86f00' : '#2a1830';
  ctx.font = `900 ${Math.round(w * 0.037)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind === 'power' ? '힘' : String(wt), x, ty + 0.5);
}

/** 털실 (처진 곡선) */
function yarn(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, sag: number, col: string, wd: number, glow: boolean) {
  ctx.save();
  if (glow) (ctx.shadowColor = col), (ctx.shadowBlur = 8);
  ctx.strokeStyle = 'rgba(60,0,30,.45)';
  ctx.lineWidth = wd + 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = wd;
  ctx.stroke();
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = Math.max(0.8, wd * 0.35);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawClaw(ctx: CanvasRenderingContext2D, s: ClawState, w: number, cx: number, cz: number, open: number, mood: ClawMood, held: () => void) {
  const X = (x: number) => x * w, R = (r: number) => r * w, sc = clawScale(s), hy = hubY(s, cz), t = s.t;
  const hx = X(cx), hpx = R(hy);
  // 케이블
  ctx.strokeStyle = '#2b2440';
  ctx.lineWidth = R(0.007);
  ctx.beginPath();
  ctx.moveTo(hx, R(RAIL_Y + 0.02));
  ctx.lineTo(hx, hpx - R(0.03 * sc));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,230,255,.6)';
  ctx.lineWidth = R(0.002);
  ctx.beginPath();
  ctx.moveTo(hx - R(0.001), R(RAIL_Y + 0.02));
  ctx.lineTo(hx - R(0.001), hpx - R(0.03 * sc));
  ctx.stroke();
  const metal = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#f6f9ff');
    g.addColorStop(0.45, '#a9b4c8');
    g.addColorStop(0.7, '#6d7890');
    g.addColorStop(1, '#d9e1f0');
    return g;
  };
  const arm = (side: number, back: boolean) => {
    const sp = (0.012 + open * 0.03) * sc, L = tipLen(sc);
    ctx.strokeStyle = back ? '#5d6680' : metal(hx - R(0.05 * sc), 0, hx + R(0.05 * sc), 0);
    ctx.lineWidth = R(0.0105 * sc);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + side * R(0.012 * sc), hpx + R(0.012 * sc));
    ctx.quadraticCurveTo(hx + side * R(sp + 0.026 * sc), hpx + R(L * 0.45), hx + side * R(sp + 0.004), hpx + R(L * 0.92));
    ctx.lineTo(hx + side * R(sp - 0.008 * sc), hpx + R(L));
    ctx.stroke();
    if (!back) {
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = R(0.003 * sc);
      ctx.beginPath();
      ctx.moveTo(hx + side * R(0.012 * sc), hpx + R(0.014 * sc));
      ctx.quadraticCurveTo(hx + side * R(sp + 0.022 * sc), hpx + R(L * 0.45), hx + side * R(sp + 0.001), hpx + R(L * 0.88));
      ctx.stroke();
    }
  };
  // 뒤 다리 → 매달린 인형 → 몸통(얼굴) → 앞 다리
  ctx.save();
  ctx.translate(hx, hpx + R(0.012 * sc));
  ctx.scale(0.6, 1);
  ctx.translate(-hx, -hpx - R(0.012 * sc));
  arm(1, true);
  ctx.restore();
  held();
  arm(-1, false);
  arm(1, false);
  // 몸통: 은빛 돔 + 얼굴
  const r = R(0.04 * sc);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(hx, hpx + r * 0.75, r * 0.95, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const dg = ctx.createRadialGradient(hx - r * 0.4, hpx - r * 0.5, r * 0.1, hx, hpx, r * 1.1);
  dg.addColorStop(0, '#ffffff');
  dg.addColorStop(0.5, '#c3cde0');
  dg.addColorStop(1, '#5c6782');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.ellipse(hx, hpx, r * 1.12, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a5370';
  ctx.fillRect(hx - r * 1.05, hpx + r * 0.42, r * 2.1, r * 0.22);
  ctx.fillStyle = mood === 'strain' ? '#ff5c7a' : '#ff4f9a';
  ctx.beginPath();
  ctx.arc(hx, hpx - r * 0.98, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  // 얼굴
  const ey = hpx - r * 0.12, sp = r * 0.42, er = r * 0.17, jitter = mood === 'strain' ? Math.sin(t * 1.7) * r * 0.05 : 0;
  ctx.save();
  ctx.translate(jitter, 0);
  if (mood === 'strain') {
    ctx.strokeStyle = '#1d1730';
    ctx.lineWidth = Math.max(1.4, r * 0.11);
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + sx * (sp + er), ey - er);
      ctx.lineTo(hx + sx * (sp - er * 0.6), ey);
      ctx.lineTo(hx + sx * (sp + er), ey + er);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx - r * 0.32, ey + r * 0.24, r * 0.64, r * 0.18);
    ctx.strokeStyle = '#1d1730';
    ctx.lineWidth = 1;
    ctx.strokeRect(hx - r * 0.32, ey + r * 0.24, r * 0.64, r * 0.18);
    for (let k = 1; k < 4; k++) (ctx.beginPath(), ctx.moveTo(hx - r * 0.32 + k * r * 0.16, ey + r * 0.24), ctx.lineTo(hx - r * 0.32 + k * r * 0.16, ey + r * 0.42), ctx.stroke());
    // 땀
    ctx.fillStyle = '#8fe3ff';
    const dy = ((t * 0.6) % 14) * r * 0.04;
    ctx.beginPath();
    ctx.ellipse(hx + r * 1.05, hpx - r * 0.5 + dy, r * 0.11, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'proud') {
    eyes(ctx, hx, ey, sp, er, 'happy');
    ctx.strokeStyle = '#1d1730';
    ctx.lineWidth = Math.max(1.4, r * 0.1);
    ctx.beginPath();
    ctx.arc(hx + r * 0.08, ey + r * 0.2, r * 0.22, Math.PI * 0.1, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,160,.55)';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(hx + sx * r * 0.72, ey + r * 0.2, r * 0.16, r * 0.09, 0, 0, Math.PI * 2), ctx.fill());
  } else if (mood === 'shock') {
    eyes(ctx, hx, ey - r * 0.04, sp, er * 1.05, 'scared');
    ctx.fillStyle = '#1d1730';
    ctx.beginPath();
    ctx.ellipse(hx, ey + r * 0.34, r * 0.13, r * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'dizzy') {
    eyes(ctx, hx, ey, sp, er * 1.1, 'dizzy', t);
    for (let k = 0; k < 3; k++) {
      const a = t * 0.15 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#ffe14d';
      ctx.font = `900 ${Math.round(r * 0.55)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', hx + Math.cos(a) * r * 1.3, hpx - r * 1.15 + Math.sin(a) * r * 0.35);
    }
  } else if (mood === 'sad') {
    ctx.strokeStyle = '#1d1730';
    ctx.lineWidth = Math.max(1.4, r * 0.1);
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(hx + sx * sp, ey + er * 0.6, er, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
    ctx.beginPath();
    ctx.arc(hx, ey + r * 0.48, r * 0.16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    // 무표정·집중: 그림자 쪽을 내려다본다
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(hx + sx * sp, ey, er * 1.15, er * (mood === 'focus' ? 0.9 : 1.25), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d1730';
      ctx.beginPath();
      ctx.arc(hx + sx * sp + s.dir * er * 0.25, ey + er * 0.35, er * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mood === 'focus') {
      ctx.strokeStyle = '#1d1730';
      ctx.lineWidth = Math.max(1.2, r * 0.09);
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(hx + sx * (sp - er), ey - er * 1.3), ctx.lineTo(hx + sx * (sp + er), ey - er * 0.9), ctx.stroke());
    }
    ctx.strokeStyle = '#1d1730';
    ctx.lineWidth = Math.max(1.2, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.14, ey + r * 0.36);
    ctx.lineTo(hx + r * 0.14, ey + r * 0.36);
    ctx.stroke();
  }
  ctx.restore();
}

function drawKid(ctx: CanvasRenderingContext2D, s: ClawState, w: number, mood: string, look: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const jump = mood === 'wow' ? Math.abs(Math.sin(t * 0.25)) * R(0.02) : mood === 'laugh' ? Math.abs(Math.sin(t * 0.4)) * R(0.01) : 0;
  const x = X(KID.x), y = Y(KID.y) - jump, r = R(0.07);
  ctx.save();
  // 몸 (줄무늬 티)
  const bodyTop = y + r * 0.8;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - r * 0.95, bodyTop, r * 1.9, r * 2.4, r * 0.5);
  ctx.clip();
  ctx.fillStyle = '#2ec4b6';
  ctx.fillRect(x - r, bodyTop, r * 2, r * 2.4);
  ctx.fillStyle = '#e8fffb';
  for (let k = 0; k < 6; k++) ctx.fillRect(x - r, bodyTop + r * (0.25 + k * 0.42), r * 2, r * 0.17);
  ctx.restore();
  // 팔
  ctx.strokeStyle = '#ffd2b0';
  ctx.lineWidth = r * 0.32;
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    // 손 끝: 구경(기계에 두 손을 대고 들여다봄) · 와아(만세) · 에이(머리 감싸기) · 깔깔(배 잡기)
    const [qx, qy, hx2, hy2] =
      mood === 'wow' ? [1.5, -0.4, 1.2, -1.5 + Math.sin(t * 0.3 + sx) * 0.15]
      : mood === 'aww' ? [1.4, -0.3, 0.75, -1.55]
      : mood === 'laugh' ? [1.3, 0.9, 0.3, 1.0]
      : [1.25, 1.0, 0.16, 0.42 + Math.sin(t * 0.08) * 0.04];
    ctx.strokeStyle = '#ffd2b0';
    ctx.beginPath();
    ctx.moveTo(x + sx * r * 0.8, bodyTop + r * 0.35);
    ctx.quadraticCurveTo(x + sx * r * qx, bodyTop + r * qy, x + sx * r * hx2, bodyTop + r * hy2);
    ctx.stroke();
    ball(ctx, x + sx * r * hx2, bodyTop + r * hy2, r * 0.22, r * 0.22, '#ffe8d6', '#f0b48a');
  }
  // 머리
  ball(ctx, x, y, r, r * 0.95, '#ffe3cc', '#f0b48a');
  ctx.fillStyle = '#4a2c1c';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.45, r * 0.98, r * 0.6, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, y - r * 0.95);
  ctx.quadraticCurveTo(x + r * 0.2, y - r * 1.45, x + r * 0.35, y - r * 1.05);
  ctx.fill();
  // 얼굴
  const ey = y - r * 0.05, sp = r * 0.36;
  if (mood === 'laugh' || (mood === 'watch' && Math.sin(t * 0.045) > 0.985)) eyes(ctx, x, ey, sp, r * 0.11, 'happy');
  else if (mood === 'aww') {
    ctx.strokeStyle = '#2a1830';
    ctx.lineWidth = Math.max(1.4, r * 0.08);
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x + sx * sp - r * 0.12, ey - r * 0.04 * sx), ctx.lineTo(x + sx * sp + r * 0.12, ey + r * 0.04 * sx), ctx.stroke());
  } else {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + sx * sp, ey, r * 0.17, r * (mood === 'wow' ? 0.22 : 0.19), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1830';
      ctx.beginPath();
      ctx.arc(x + sx * sp + look * r * 0.07, ey - r * 0.04, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + sx * sp + look * r * 0.07 - r * 0.03, ey - r * 0.08, r * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,110,130,.45)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(x + sx * r * 0.6, y + r * 0.22, r * 0.17, r * 0.1, 0, 0, Math.PI * 2), ctx.fill());
  ctx.fillStyle = '#7a2a3a';
  ctx.strokeStyle = '#7a2a3a';
  ctx.lineWidth = Math.max(1.4, r * 0.07);
  ctx.beginPath();
  if (mood === 'wow') ctx.ellipse(x, y + r * 0.42, r * 0.17, r * 0.22, 0, 0, Math.PI * 2), ctx.fill();
  else if (mood === 'laugh') ctx.arc(x, y + r * 0.3, r * 0.25, 0, Math.PI), ctx.fill();
  else if (mood === 'aww') ctx.arc(x, y + r * 0.55, r * 0.18, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke();
  else ctx.arc(x, y + r * 0.28, r * 0.12, Math.PI * 0.15, Math.PI * 0.85), ctx.stroke();
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: ClawState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t, d = def(s);
  const font = (sz: number, wt = 800) => (ctx.font = `${wt} ${Math.round(R(sz))}px ${FONT}`);
  const aim = s.phase === 'aim';
  const pre = aim ? grabAt(s, s.cx) : null;
  const hiSet = new Set(pre ? pre.ids : []);
  const preCol = pre ? (pre.bonk ? '#8fefff' : !pre.ids.length ? '#c8c0dc' : pre.ok ? '#7dff8a' : '#ff6b7a') : '#ffffff';
  ctx.save();
  fx.begin(ctx);
  // ── 오락실 방: 벽 · 다른 기계 불빛 ──
  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, '#2a1650');
  wall.addColorStop(0.75, th.bg);
  wall.addColorStop(1, '#0d0820');
  ctx.fillStyle = wall;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  for (let k = 0; k < 14; k++) {
    const bx = X(hsh(k) * 1.1 - 0.05), by = Y(0.02 + hsh(k + 30) * 0.12), br = R(0.03 + hsh(k + 60) * 0.05);
    const cols = ['255,79,154', '70,240,255', '255,216,74', '160,120,255'];
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, `rgba(${cols[k % 4]},${0.28 + 0.12 * Math.sin(t * 0.03 + k)})`);
    g.addColorStop(1, `rgba(${cols[k % 4]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  // 바닥 카펫 (오락실 별무늬)
  const fl = ctx.createLinearGradient(0, Y(1.2), 0, h);
  fl.addColorStop(0, '#1b1442');
  fl.addColorStop(1, '#0e0a26');
  ctx.fillStyle = fl;
  ctx.fillRect(-10, Y(1.2), w + 20, h - Y(1.2) + 10);
  for (let k = 0; k < 34; k++) {
    const px = X(hsh(k + 200)), py = Y(1.215 + hsh(k + 300) * 0.28), cols = ['#ff4f9a', '#46f0ff', '#ffd84a', '#9b7bff'];
    ctx.fillStyle = cols[k % 4];
    ctx.globalAlpha = 0.35;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(hsh(k + 400) * 6);
    if (k % 3 === 0) ctx.fillRect(-R(0.008), -R(0.003), R(0.016), R(0.006));
    else if (k % 3 === 1) (ctx.beginPath(), ctx.moveTo(0, -R(0.008)), ctx.lineTo(R(0.007), R(0.005)), ctx.lineTo(-R(0.007), R(0.005)), ctx.fill());
    else (ctx.beginPath(), ctx.arc(0, 0, R(0.005), 0, Math.PI * 2), ctx.fill());
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // 기계 그림자
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath();
  ctx.ellipse(X(0.5), Y(1.21), R(0.52), R(0.03), 0, 0, Math.PI * 2);
  ctx.fill();
  // ── 기계 몸통: 옆면(두께) → 앞면 ──
  ctx.fillStyle = '#7d0f45';
  ctx.beginPath();
  ctx.moveTo(X(0.972), Y(0.118));
  ctx.lineTo(X(0.996), Y(0.1));
  ctx.lineTo(X(0.996), Y(1.187));
  ctx.lineTo(X(0.972), Y(1.205));
  ctx.fill();
  ctx.fillStyle = '#ff9ccb';
  ctx.beginPath();
  ctx.moveTo(X(0.028), Y(0.118));
  ctx.lineTo(X(0.052), Y(0.1));
  ctx.lineTo(X(0.996), Y(0.1));
  ctx.lineTo(X(0.972), Y(0.118));
  ctx.fill();
  const body = ctx.createLinearGradient(X(0.03), 0, X(0.97), 0);
  body.addColorStop(0, '#d61f72');
  body.addColorStop(0.12, '#ff6fae');
  body.addColorStop(0.22, '#f0408b');
  body.addColorStop(0.85, '#d61f72');
  body.addColorStop(1, '#a3145a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(X(0.028), Y(0.118), R(0.944), Y(1.205) - Y(0.118), [R(0.03), R(0.03), R(0.008), R(0.008)]);
  ctx.fill();
  // ── 간판 (네온 글씨 + 쫓아가는 전구) ──
  {
    const my0 = 0.13, my1 = 0.214;
    const mg = ctx.createLinearGradient(0, Y(my0), 0, Y(my1));
    mg.addColorStop(0, '#2b0f4a');
    mg.addColorStop(1, '#170828');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.roundRect(X(0.06), Y(my0), R(0.88), Y(my1) - Y(my0), R(0.02));
    ctx.fill();
    for (let k = 0; k < 22; k++) {
      const on = (k + Math.floor(t / 8)) % 3 === 0, bx = X(0.075 + k * 0.0405);
      for (const by of [my0 + 0.008, my1 - 0.008]) {
        ctx.fillStyle = on ? '#fff3a8' : '#7a5a2a';
        if (on) (ctx.shadowColor = '#ffd84a'), (ctx.shadowBlur = R(0.015));
        ctx.beginPath();
        ctx.arc(bx, Y(by), R(0.0055), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    font(0.05, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const flick = Math.sin(t * 0.7) > 0.97 ? 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = flick;
    ctx.shadowColor = '#ff4f9a';
    ctx.shadowBlur = R(0.03);
    ctx.fillStyle = '#ff8fd0';
    ctx.fillText('줄줄이 인형 뽑기', X(0.5), Y((my0 + my1) / 2 + 0.002));
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe9f6';
    ctx.globalAlpha = flick * 0.75;
    ctx.fillText('줄줄이 인형 뽑기', X(0.5), Y((my0 + my1) / 2 + 0.002));
    ctx.restore();
  }
  // ── 유리 안: 뒷벽 · 옆벽 · 바닥 (3/4 시점) ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(GL.x0), Y(GL.y0), R(GL.x1 - GL.x0), Y(GL.y1) - Y(GL.y0));
  ctx.clip();
  const bw = ctx.createLinearGradient(0, Y(GL.y0), 0, Y(GL.y1));
  bw.addColorStop(0, '#5a2a8c');
  bw.addColorStop(0.6, '#8a3aa8');
  bw.addColorStop(1, '#3a1660');
  ctx.fillStyle = '#3c1866';
  ctx.fillRect(X(GL.x0), Y(GL.y0), R(GL.x1 - GL.x0), Y(GL.y1) - Y(GL.y0));
  // 옆벽 (원근)
  for (const [ax, bx] of [[GL.x0, BKW.x0], [GL.x1, BKW.x1]] as const) {
    const sg = ctx.createLinearGradient(X(ax), 0, X(bx), 0);
    sg.addColorStop(0, '#2a0f4a');
    sg.addColorStop(1, '#4e2280');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(X(ax), Y(GL.y0));
    ctx.lineTo(X(bx), Y(BKW.y0));
    ctx.lineTo(X(bx), Y(BKW.y1));
    ctx.lineTo(X(ax), Y(GL.y1));
    ctx.fill();
  }
  ctx.fillStyle = bw;
  ctx.fillRect(X(BKW.x0), Y(BKW.y0), R(BKW.x1 - BKW.x0), Y(BKW.y1) - Y(BKW.y0));
  // 뒷벽 무늬: 별·하트 벽지
  ctx.fillStyle = 'rgba(255,200,255,.13)';
  font(0.03, 900);
  ctx.textAlign = 'center';
  for (let r0 = 0; r0 < 6; r0++)
    for (let c0 = 0; c0 < 8; c0++) {
      const px = BKW.x0 + 0.045 + c0 * 0.09 + (r0 % 2) * 0.045, py = BKW.y0 + 0.07 + r0 * 0.09;
      if (px < BKW.x1 - 0.02) ctx.fillText(r0 % 2 ? '♥' : '★', X(px), Y(py));
    }
  // 뒷벽 포스터 둘: 왕관 곰(별 하나 더) · 줄줄이 (규칙을 그림으로) + 꼬마전구 줄
  {
    const poster = (x0: number, y0: number, pw: number, ph: number, tilt: number, title: string, draw: (cx: number, cy: number) => void) => {
      ctx.save();
      ctx.translate(X(x0 + pw / 2), Y(y0 + ph / 2));
      ctx.rotate(tilt);
      ctx.globalAlpha = 0.55; // 뒷벽 그림 — 앞의 진짜 인형보다 흐리게
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(-R(pw / 2) + 3, -R(ph / 2) + 4, R(pw), R(ph));
      const pg = ctx.createLinearGradient(0, -R(ph / 2), 0, R(ph / 2));
      pg.addColorStop(0, '#fff3fa');
      pg.addColorStop(1, '#ffd6ec');
      ctx.fillStyle = pg;
      ctx.fillRect(-R(pw / 2), -R(ph / 2), R(pw), R(ph));
      ctx.strokeStyle = '#ff7cc0';
      ctx.lineWidth = 2;
      ctx.strokeRect(-R(pw / 2) + 3, -R(ph / 2) + 3, R(pw) - 6, R(ph) - 6);
      ctx.fillStyle = '#c2185b';
      font(0.032, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 0, -R(ph / 2) + R(0.026), R(pw - 0.02));
      draw(0, R(0.012));
      ctx.fillStyle = '#e04a8a';
      ctx.beginPath();
      ctx.arc(0, -R(ph / 2) + 2, R(0.007), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    poster(0.17, 0.44, 0.2, 0.17, -0.06, '★ 왕관 곰', (cx, cy) => drawDoll(ctx, 'crown', cx, cy + R(0.01), R(0.042), { face: 'happy', t }));
    poster(0.63, 0.44, 0.2, 0.17, 0.05, '줄줄이!', (cx, cy) => {
      for (let k = 0; k < 3; k++) drawDoll(ctx, 'chick', cx + (k - 1) * R(0.052), cy + R(0.012) + (k === 1 ? -R(0.008) : 0), R(0.024), { face: 'happy', t: t + k * 20 });
      for (let k = 0; k < 2; k++) yarn(ctx, cx + (k - 1) * R(0.052) + R(0.008), cy + R(0.022), cx + k * R(0.052) - R(0.008), cy + R(0.022), R(0.01), '#ff4f6a', R(0.004), false);
    });
    for (let k = 0; k <= 16; k++) {
      const bx = BKW.x0 + 0.01 + k * ((BKW.x1 - BKW.x0 - 0.02) / 16), by = BKW.y0 + 0.05 + Math.sin((k / 16) * Math.PI * 3) ** 2 * -0.025 + 0.025;
      const on = (k + Math.floor(t / 14)) % 2 === 0, cl = ['#ffd84a', '#46f0ff', '#ff7cc0'][k % 3];
      ctx.fillStyle = on ? cl : 'rgba(255,255,255,.2)';
      if (on) (ctx.shadowColor = cl), (ctx.shadowBlur = R(0.015));
      ctx.beginPath();
      ctx.arc(X(bx), Y(by), R(0.006), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  // 위에서 내리쬐는 조명
  const sp = ctx.createRadialGradient(X(0.55), Y(0.3), R(0.02), X(0.55), Y(0.75), R(0.6));
  sp.addColorStop(0, 'rgba(255,240,210,.32)');
  sp.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(X(GL.x0), Y(GL.y0), R(GL.x1 - GL.x0), Y(GL.y1) - Y(GL.y0));
  // 레일 (뒤)
  ctx.fillStyle = '#8c95ad';
  ctx.fillRect(X(BKW.x0), Y(BKW.y0 + 0.004), R(BKW.x1 - BKW.x0), R(0.006));
  for (const ax of [0.1, 0.9]) {
    ctx.strokeStyle = '#7c859d';
    ctx.lineWidth = R(0.006);
    ctx.beginPath();
    ctx.moveTo(X(ax), Y(RAIL_Y));
    ctx.lineTo(X(ax < 0.5 ? BKW.x0 : BKW.x1), Y(BKW.y0 + 0.007));
    ctx.stroke();
  }
  // 바닥 (인형 더미 아래 판)
  const fg = ctx.createLinearGradient(0, Y(BKW.y1), 0, Y(GL.y1));
  fg.addColorStop(0, '#4a1d70');
  fg.addColorStop(1, '#2a0e46');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(X(BKW.x0), Y(BKW.y1));
  ctx.lineTo(X(BKW.x1), Y(BKW.y1));
  ctx.lineTo(X(GL.x1), Y(GL.y1));
  ctx.lineTo(X(GL.x0), Y(GL.y1));
  ctx.fill();
  // ── 출구 통 (뒤판 + 구멍) ──
  ctx.fillStyle = 'rgba(160,230,255,.12)';
  ctx.fillRect(X(CH.x0), Y(CH.top), R(CH.x1 - CH.x0), Y(GL.y1) - Y(CH.top));
  const hole = ctx.createRadialGradient(X((CH.x0 + CH.x1) / 2), Y(CH.top), R(0.01), X((CH.x0 + CH.x1) / 2), Y(CH.top), R(0.1));
  hole.addColorStop(0, '#05010c');
  hole.addColorStop(1, '#2a0f40');
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.ellipse(X((CH.x0 + CH.x1) / 2), Y(CH.top), R((CH.x1 - CH.x0) / 2), R(0.018), 0, 0, Math.PI * 2);
  ctx.fill();
  // ── 인형 더미 (털 뭉치들) — 뒤쪽 ──
  const PAST = ['#ffc6e0', '#c9b8ff', '#a8ecff', '#fff0a8', '#ffd1b0', '#b9ffd0'];
  const fluff = (front: boolean) => {
    for (let k = 0; k < 64; k++) {
      const fy = 0.84 + hsh(k + 99) * 0.15;
      if (front !== fy > 0.925) continue;
      const fx0 = 0.24 + hsh(k) * 0.71, fr = R(0.02 + hsh(k + 7) * 0.02);
      ball(ctx, X(fx0), Y(fy), fr, fr * 0.9, '#ffffff', PAST[k % PAST.length]);
      ctx.fillStyle = 'rgba(40,0,60,.18)';
      ctx.beginPath();
      ctx.ellipse(X(fx0), Y(fy) + fr * 0.6, fr * 0.9, fr * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  fluff(false);
  // ── 투명 덮개 그림자 ──
  if (d.cover) {
    ctx.fillStyle = 'rgba(120,230,255,.12)';
    ctx.beginPath();
    ctx.ellipse(X(coverX(s)), Y(0.93), R(d.cover / 2), R(0.02), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ── 집게 그림자 점 + 내려갈 자리 안내선 ──
  const sc = clawScale(s);
  if (aim || s.phase === 'drop') {
    const shx = X(s.cx), shy = Y(0.918);
    ctx.fillStyle = 'rgba(15,0,30,.45)';
    ctx.beginPath();
    ctx.ellipse(shx, shy, R(0.036 * sc), R(0.012), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = preCol;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(shx, shy, R(0.036 * sc), R(0.012), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([R(0.008), R(0.01)]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.beginPath();
    ctx.moveTo(shx, Y(hubY(s, s.cz) + tipLen(sc)));
    ctx.lineTo(shx, shy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  // ── 바닥의 털실 ──
  const pos = (dl: Doll) => ({ x: X(dollX(s, dl)), y: Y(floorY(s, dl)) });
  const fallY = (dl: Doll) => {
    const ag = t - dl.fell;
    const g = s.grab;
    if (ag >= 26 || !g || !g.slipped || !g.ids.includes(dl.id)) return null;
    const k = g.ids.indexOf(dl.id), hp = hangPos(s, g.ids, k, g.x, 1 - SLIP_AT / RISE), fy = floorY(s, dl);
    const p = ag / 18;
    const y = p < 1 ? hp.y + (fy - hp.y) * p * p : fy - Math.abs(Math.sin((ag - 18) * 0.4)) * 0.02 * (1 - (ag - 18) / 8);
    return { x: hp.x + (dollX(s, dl) - hp.x) * Math.min(1, p), y };
  };
  // ── 바닥 인형 ──
  const top = (k: Kind) => (k === 'box' ? 2 : k === 'crab' ? 1 : 0);
  const floorDolls = s.dolls.filter((dl) => !dl.gone && !dl.held).sort((a, b) => top(a.kind) - top(b.kind) || a.slot - b.slot);
  for (const dl of floorDolls) {
    const f = fallY(dl), x = f ? f.x : dollX(s, dl), y = f ? f.y : floorY(s, dl), r = R(DR[dl.kind]);
    const ag = t - dl.fell, dizzy = ag < 150;
    const hi = hiSet.has(dl.id);
    ctx.fillStyle = 'rgba(20,0,40,.3)';
    ctx.beginPath();
    ctx.ellipse(X(dollX(s, dl)), Y(floorY(s, dl)) + r * 0.95, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    const squash = f && ag >= 18 && ag < 26 ? 0.25 * (1 - (ag - 18) / 8) : 0;
    const idle = Math.sin(t * 0.05 + dl.slot * 1.3) * 0.03;
    drawDoll(ctx, dl.kind, X(x), Y(y), r, { face: dizzy ? 'dizzy' : hi ? (pre!.ok ? 'happy' : 'scared') : 'calm', tilt: dizzy ? Math.sin(ag * 0.2) * 0.15 : idle, squash, glow: hi ? (pre!.ok ? 'rgba(125,255,138,.7)' : 'rgba(255,90,110,.7)') : null, t: t + dl.id * 17 });
    if (dizzy && !f) {
      for (let k = 0; k < 3; k++) {
        const a = t * 0.18 + (k * Math.PI * 2) / 3;
        ctx.fillStyle = '#ffe14d';
        font(0.022, 900);
        ctx.textAlign = 'center';
        ctx.fillText('★', X(x) + Math.cos(a) * r * 0.9, Y(y) - r * 1.25 + Math.sin(a) * r * 0.25);
      }
    }
  }
  // 털실: 인형 배 앞으로 지나가게 (덩어리마다 다른 색 — 어디까지 엮였는지 한눈에)
  const dpos = (dl: Doll) => {
    const f = fallY(dl);
    return f ? { x: X(f.x), y: Y(f.y) } : pos(dl);
  };
  for (const [a, b] of s.links) {
    const da = s.dolls[a], db = s.dolls[b];
    if (da.gone || db.gone || da.held || db.held) continue;
    const ra = R(DR[da.kind]), rb = R(DR[db.kind]), pa = dpos(da), pb = dpos(db);
    const hi = hiSet.has(a) && hiSet.has(b);
    const col = hi ? (pre!.ok ? '#c8ff9e' : '#ff6b7a') : yarnCol(da);
    // 배 한가운데를 꿰어 지나가는 화환처럼 (가운데 → 가운데)
    yarn(ctx, pa.x, pa.y + ra * 0.42, pb.x, pb.y + rb * 0.42, R(0.022), col, hi ? R(0.009) : R(0.0072), hi);
    ctx.fillStyle = col;
    for (const [kx, ky] of [[pa.x, pa.y + ra * 0.42], [pb.x, pb.y + rb * 0.42]]) (ctx.beginPath(), ctx.arc(kx, ky, R(0.0085), 0, Math.PI * 2), ctx.fill());
  }
  // 끊긴 실 (싹둑)
  for (const c of s.cuts) {
    const ag = t - c.t;
    if (ag > 40) continue;
    const da = s.dolls[c.a], db = s.dolls[c.b], keep = da.held || da.gone ? db : da;
    const p = pos(keep), dir = keep === da ? 1 : -1, rk = R(DR[keep.kind]);
    ctx.globalAlpha = 1 - ag / 40;
    yarn(ctx, p.x + dir * rk * 0.25, p.y + rk * 0.45, p.x + dir * R(0.035), p.y + rk * 0.45 + R(0.015 + ag * 0.0006), R(0.01), yarnCol(keep), R(0.006), false);
    ctx.globalAlpha = 1;
  }
  // 무게 표 (머리 위 한 줄 — 숫자가 나란히 읽힌다)
  for (const dl of floorDolls) {
    if (fallY(dl)) continue;
    const x = X(dollX(s, dl)), y = Y(floorY(s, dl)) - R(DR[dl.kind]) - R(dl.kind === 'bunny' ? 0.05 : 0.036);
    weightTag(ctx, x, y, w, dl.w, dl.kind, hiSet.has(dl.id));
  }
  fluff(true);
  // ── 투명 덮개 (미끄러지며 오간다) ──
  if (d.cover) {
    const cx0 = X(coverX(s) - d.cover / 2), cw = R(d.cover), cy0 = Y(0.6), cy1 = Y(0.935);
    const cg = ctx.createLinearGradient(cx0, 0, cx0 + cw, 0);
    cg.addColorStop(0, 'rgba(180,240,255,.28)');
    cg.addColorStop(0.3, 'rgba(180,240,255,.1)');
    cg.addColorStop(1, 'rgba(180,240,255,.22)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.roundRect(cx0, cy0, cw, cy1 - cy0, R(0.012));
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,250,255,.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.moveTo(cx0 + cw * 0.12, cy0 + R(0.01));
    ctx.lineTo(cx0 + cw * 0.22, cy0 + R(0.01));
    ctx.lineTo(cx0 + cw * 0.08, cy1 - R(0.02));
    ctx.lineTo(cx0 + cw * 0.02, cy1 - R(0.02));
    ctx.fill();
    ctx.fillStyle = 'rgba(220,250,255,.9)';
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.fillText('덮개', cx0 + cw / 2, cy0 + R(0.03));
  }
  // ── 레일(앞) + 운반대 ──
  {
    const rg = ctx.createLinearGradient(0, Y(RAIL_Y - 0.009), 0, Y(RAIL_Y + 0.009));
    rg.addColorStop(0, '#f2f6ff');
    rg.addColorStop(0.5, '#97a2bb');
    rg.addColorStop(1, '#58617a');
    ctx.fillStyle = rg;
    ctx.fillRect(X(GL.x0), Y(RAIL_Y - 0.008), R(GL.x1 - GL.x0), R(0.016));
    const cxp = X(s.cx), cw = R(0.135), ch = R(0.04);
    const cg = ctx.createLinearGradient(0, Y(RAIL_Y - 0.02), 0, Y(RAIL_Y + 0.02));
    cg.addColorStop(0, '#e6ecf8');
    cg.addColorStop(1, '#6b7590');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.roundRect(cxp - cw / 2, Y(RAIL_Y) - ch / 2, cw, ch, R(0.008));
    ctx.fill();
    ctx.fillStyle = '#1a1030';
    ctx.beginPath();
    ctx.roundRect(cxp - cw * 0.38, Y(RAIL_Y) - ch * 0.36, cw * 0.76, ch * 0.72, R(0.005));
    ctx.fill();
    const str = strength(s);
    ctx.fillStyle = s.power ? '#ffd43b' : '#ff6b8a';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = R(0.012);
    font(0.037, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`힘 ${str}`, cxp, Y(RAIL_Y) + 0.5);
    ctx.shadowBlur = 0;
  }
  // ── 집게 + 매달린 인형 ──
  {
    const g = s.grab, heldIds = g && g.ids.length ? g.ids.filter((i) => s.dolls[i].held) : [];
    const mood = clawMood(s);
    drawClaw(ctx, s, w, s.cx, s.cz, s.open, mood, () => {
      if (!g || !heldIds.length) return;
      const ps = g.ids.map((_, k) => hangPos(s, g.ids, k, s.cx, s.cz));
      // 매달린 줄의 실
      for (const [a, b] of s.links) {
        const ka = g.ids.indexOf(a), kb = g.ids.indexOf(b);
        if (ka < 0 || kb < 0 || !s.dolls[a].held) continue;
        yarn(ctx, X(ps[ka].x), Y(ps[ka].y), X(ps[kb].x), Y(ps[kb].y), R(0.006), yarnCol(s.dolls[a]), R(0.0065), false);
      }
      for (let k = g.ids.length - 1; k >= 0; k--) {
        const dl = s.dolls[g.ids[k]];
        if (!dl.held) continue;
        const r = R(DR[dl.kind]);
        if (dl.kind === 'box' && s.phase !== 'close') {
          drawCat(ctx, X(ps[k].x), Y(ps[k].y) + r * 0.45, r * 1.3, t, 'cling');
          // 빈 상자는 아래로 툭
          continue;
        }
        drawDoll(ctx, dl.kind, X(ps[k].x), Y(ps[k].y), r, { face: g.ok ? (k === 0 ? 'happy' : 'scared') : 'scared', tilt: Math.sin(t * 0.13 + k) * 0.12, t: t + dl.id * 17 });
      }
    });
    // 출구로 쏙 떨어지는 인형들
    if (s.phase === 'release' && g && s.pt >= 8) {
      const p = (s.pt - 8) / (RELEASE - 8);
      g.ids.forEach((id, k) => {
        const dl = s.dolls[id], r = R(DR[dl.kind]) * (1 - p * 0.4);
        const hp = hangPos(s, g.ids, k, s.cx, 0);
        ctx.globalAlpha = 1 - p * 0.6;
        if (dl.kind === 'box') drawCat(ctx, X(CHUTE_X + (k % 2 ? 0.02 : -0.02)), Y(hp.y + (CH.top + 0.06 - hp.y) * p * p), r, t, 'cling');
        else drawDoll(ctx, dl.kind, X(CHUTE_X + (hp.x - CHUTE_X) * 0.3), Y(hp.y + (CH.top + 0.1 - hp.y) * p * p), r, { face: 'happy', tilt: p * 2 * (k % 2 ? 1 : -1), t });
        ctx.globalAlpha = 1;
      });
    }
  }
  // ── 출구 통 앞판 ──
  {
    const cg = ctx.createLinearGradient(X(CH.x0), 0, X(CH.x1), 0);
    cg.addColorStop(0, 'rgba(190,240,255,.32)');
    cg.addColorStop(0.5, 'rgba(190,240,255,.12)');
    cg.addColorStop(1, 'rgba(190,240,255,.26)');
    ctx.fillStyle = cg;
    ctx.fillRect(X(CH.x0), Y(CH.top + 0.012), R(CH.x1 - CH.x0), Y(GL.y1) - Y(CH.top + 0.012));
    ctx.strokeStyle = 'rgba(220,250,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(X((CH.x0 + CH.x1) / 2), Y(CH.top), R((CH.x1 - CH.x0) / 2), R(0.018), 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeRect(X(CH.x0), Y(CH.top), R(CH.x1 - CH.x0), Y(GL.y1) - Y(CH.top));
    ctx.fillStyle = '#ffe36e';
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('출구', X((CH.x0 + CH.x1) / 2), Y(CH.top + 0.09));
    const bob = Math.sin(t * 0.12) * R(0.006);
    ctx.fillText('▼', X((CH.x0 + CH.x1) / 2), Y(CH.top + 0.14) + bob);
  }
  // ── 유리: 반사 띠 ──
  {
    const gx0 = X(GL.x0), gy0 = Y(GL.y0), gh = Y(GL.y1) - gy0;
    const band = (x0: number, wd: number, a: number) => {
      const g = ctx.createLinearGradient(X(x0), 0, X(x0 + wd), 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X(x0 + 0.18), gy0);
      ctx.lineTo(X(x0 + 0.18 + wd), gy0);
      ctx.lineTo(X(x0 + wd), gy0 + gh);
      ctx.lineTo(X(x0), gy0 + gh);
      ctx.fill();
    };
    band(0.1, 0.09, 0.1);
    band(0.24, 0.035, 0.08);
    band(0.66, 0.06, 0.05);
    const top = ctx.createLinearGradient(0, gy0, 0, gy0 + R(0.05));
    top.addColorStop(0, 'rgba(255,255,255,.18)');
    top.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = top;
    ctx.fillRect(gx0, gy0, R(GL.x1 - GL.x0), R(0.05));
    // 네온 불빛이 유리에 비침
    const nr = ctx.createRadialGradient(X(0.9), Y(0.98), 0, X(0.9), Y(0.98), R(0.3));
    nr.addColorStop(0, 'rgba(70,240,255,.12)');
    nr.addColorStop(1, 'rgba(70,240,255,0)');
    ctx.fillStyle = nr;
    ctx.fillRect(gx0, gy0, R(GL.x1 - GL.x0), gh);
  }
  ctx.restore();
  // ── 네온 테두리 ──
  {
    const pulse = 0.75 + 0.25 * Math.sin(t * 0.06);
    ctx.save();
    ctx.shadowColor = '#ff4f9a';
    ctx.shadowBlur = R(0.03) * pulse;
    ctx.strokeStyle = '#ff7cc0';
    ctx.lineWidth = R(0.009);
    ctx.beginPath();
    ctx.roundRect(X(GL.x0 - 0.008), Y(GL.y0 - 0.008), R(GL.x1 - GL.x0 + 0.016), Y(GL.y1 + 0.008) - Y(GL.y0 - 0.008), R(0.02));
    ctx.stroke();
    ctx.shadowColor = '#46f0ff';
    ctx.shadowBlur = R(0.015);
    ctx.strokeStyle = 'rgba(160,250,255,.85)';
    ctx.lineWidth = R(0.003);
    ctx.beginPath();
    ctx.roundRect(X(GL.x0), Y(GL.y0), R(GL.x1 - GL.x0), Y(GL.y1) - Y(GL.y0), R(0.014));
    ctx.stroke();
    ctx.restore();
  }
  // ── 아래 받침: 선반 · 동전 · 버튼 · 출구 문 ──
  {
    const ly = 1.0;
    ctx.fillStyle = '#ff94c6';
    ctx.beginPath();
    ctx.moveTo(X(0.028), Y(ly));
    ctx.lineTo(X(0.972), Y(ly));
    ctx.lineTo(X(0.985), Y(ly + 0.036));
    ctx.lineTo(X(0.015), Y(ly + 0.036));
    ctx.fill();
    const pg = ctx.createLinearGradient(0, Y(ly + 0.036), 0, Y(1.205));
    pg.addColorStop(0, '#c41a68');
    pg.addColorStop(1, '#8a0f48');
    ctx.fillStyle = pg;
    ctx.fillRect(X(0.015), Y(ly + 0.036), R(0.97), Y(1.205) - Y(ly + 0.036));
    // 출구 문 (덜렁)
    const lastOut = s.line.length ? s.line[s.line.length - 1].t : -999, swing = Math.max(0, 1 - Math.abs(t - lastOut) / 18);
    ctx.fillStyle = '#12051f';
    ctx.beginPath();
    ctx.roundRect(X(0.058), Y(1.056), R(0.18), R(0.11), R(0.012));
    ctx.fill();
    ctx.save();
    ctx.translate(X(0.148), Y(1.056));
    ctx.scale(1, Math.cos(swing * 1.1));
    ctx.fillStyle = 'rgba(255,170,220,.35)';
    ctx.fillRect(-R(0.088), 0, R(0.176), R(0.105));
    ctx.restore();
    ctx.fillStyle = '#ffd6ea';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillText('PUSH', X(0.148), Y(1.112));
    // 동전 접시
    ctx.fillStyle = '#5a0a32';
    ctx.beginPath();
    ctx.roundRect(X(0.3), Y(1.06), R(0.2), R(0.06), R(0.012));
    ctx.fill();
    for (let k = 0; k < d.coins; k++) {
      const used = k >= s.coins, cx2 = X(0.33 + (k % 5) * 0.036), cy2 = Y(1.09);
      ctx.fillStyle = used ? 'rgba(255,255,255,.12)' : '#ffd23f';
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, R(0.015), R(0.015), 0, 0, Math.PI * 2);
      ctx.fill();
      if (!used) (ctx.strokeStyle = '#b07a10'), (ctx.lineWidth = 1.2), ctx.stroke();
    }
    ctx.fillStyle = '#ffe9f6';
    font(0.03, 900);
    ctx.fillText('동전', X(0.4), Y(1.148));
    // 큰 버튼 (누를 수 있을 때 반짝)
    const can = aim && s.coins > 0, pr = s.phase === 'drop' && s.pt < 8 ? 0.4 : 0;
    const bx = X(0.64), by = Y(1.018);
    ctx.fillStyle = '#5a0a32';
    ctx.beginPath();
    ctx.ellipse(bx, by + R(0.012), R(0.052), R(0.022), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    if (can) (ctx.shadowColor = '#ff3b5c'), (ctx.shadowBlur = R(0.03) * (0.6 + 0.4 * Math.sin(t * 0.2)));
    const bgp = ctx.createRadialGradient(bx - R(0.015), by - R(0.015) + pr * R(0.01), R(0.004), bx, by, R(0.05));
    bgp.addColorStop(0, '#ffb3c0');
    bgp.addColorStop(1, '#e0143c');
    ctx.fillStyle = bgp;
    ctx.beginPath();
    ctx.ellipse(bx, by - R(0.008) + pr * R(0.012), R(0.045), R(0.024), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    font(0.034, 900);
    ctx.fillText('톡!', bx, Y(1.075));
  }
  // ── 기계 위·선반의 고양이 (잡힌 고양이는 선반에 앉아 꼬리를 흔든다) ──
  for (let k = 0; k < Math.min(2, s.roofCats); k++) drawCat(ctx, X(0.47 + k * 0.08), Y(1.006), R(0.032), t + k * 40, 'sit');
  // ── 기계 앞: 뽑힌 인형 줄 (차례로 꾸벅) ──
  {
    const n = s.line.length, spx = Math.min(0.074, 0.64 / Math.max(1, n));
    s.line.forEach((it, k) => {
      const ag = t - it.t;
      if (ag < 0) return;
      const lx = 0.075 + k * spx, r = R(DR[it.kind] * 0.9);
      let x = lx, y = LINE_Y;
      if (ag < 24) {
        const p = ag / 24;
        x = FLAP.x + (lx - FLAP.x) * p;
        y = FLAP.y + (LINE_Y - FLAP.y) * p - Math.sin(p * Math.PI) * 0.05;
      }
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(X(x), Y(ag < 24 ? y + 0.01 : LINE_Y) + r * 0.95, r * 0.85, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      const ph = (t * 0.045 - k * 0.55) % (Math.PI * 2), bow = ag > 24 ? Math.max(0, Math.sin(ph)) ** 4 : 0;
      if (it.kind === 'box') drawCat(ctx, X(x), Y(y) - r * 0.2, r * 1.05, t + k * 9, 'sit');
      else drawDoll(ctx, it.kind, X(x), Y(y), r, { face: bow > 0.3 ? 'bow' : 'happy', squash: bow * 0.22, tilt: ag < 24 ? Math.sin(ag * 0.5) * 0.3 : 0, t: t + k * 13 });
    });
  }
  // ── 아이 구경꾼 ──
  const say = s.lastSay && t - s.lastSay.t < 95 ? s.lastSay : null;
  const kidMood = say ? say.mood : 'watch';
  drawKid(ctx, s, w, kidMood, Math.max(-1, Math.min(1, (s.cx - KID.x) * 3)));
  if (say) {
    const ag = t - say.t, a = Math.min(1, ag / 6, (95 - ag) / 12);
    ctx.globalAlpha = a;
    font(0.04, 900);
    // 아이 얼굴 왼쪽에 말풍선 (꼬리가 얼굴을 가리킨다) — 기계 버튼·글자와 안 겹치게
    const tw = ctx.measureText(say.text).width + R(0.04), bx = X(KID.x - 0.09) - tw, by = Y(KID.y - 0.005);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx, by - R(0.028), tw, R(0.056), R(0.028));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx + tw - R(0.01), by - R(0.014));
    ctx.lineTo(X(KID.x - 0.06), by + R(0.004));
    ctx.lineTo(bx + tw - R(0.01), by + R(0.016));
    ctx.fill();
    ctx.fillStyle = say.mood === 'aww' ? '#7a3a5a' : '#c2185b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(say.text, bx + tw / 2, by + 0.5);
    ctx.globalAlpha = 1;
  }
  // ── 미리 보기: 지금 내리면? (딸려 올 마릿수 · 무게/힘) ──
  if (pre && s.coins > 0) {
    let txt: string;
    if (pre.bonk) txt = '덮개! 텅';
    else if (!pre.ids.length) txt = '허탕';
    else if (s.dolls[pre.ids[0]].kind === 'box') txt = `📦 ? · 무게 ${pre.weight}/${strength(s)}`;
    else txt = pre.ok ? `${pre.n ? `${pre.n}마리` : '힘 +3'} · 무게 ${pre.weight}/${strength(s)}` : `무게 ${pre.weight}/${strength(s)} 툭!`;
    const xs = pre.ids.map((i) => dollX(s, s.dolls[i]));
    const mx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : s.cx;
    font(0.038, 900);
    const tw = ctx.measureText(txt).width + R(0.04), px = Math.max(X(GL.x0 + 0.01), Math.min(X(GL.x1 - 0.01) - tw, X(mx) - tw / 2)), py = Y(0.722);
    ctx.fillStyle = 'rgba(20,6,40,.82)';
    ctx.beginPath();
    ctx.roundRect(px, py - R(0.026), tw, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = preCol;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = preCol;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, px + tw / 2, py + 0.5);
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'coin') fx.kick(1.2), fx.pop(x + (e.x > 0.6 ? -R(0.1) : R(0.1)), Y(0.315), e.text!, e.col!, 15);
    if (e.kind === 'grab') fx.burst(x, y, '#ffd1ea', 14, 2.6, 2.4), fx.pop(x, Y(0.8), e.text!, e.col!, (e.n ?? 1) >= 3 ? 20 : 16), fx.kick((e.n ?? 1) >= 3 ? 4 : 2);
    if (e.kind === 'snip') fx.burst(x, y, '#ff8a8a', 16, 3, 2), fx.pop(x, y - R(0.06), e.text!, e.col!, 17), fx.ring(x, y, '#ffffff', R(0.06), 3);
    if (e.kind === 'slip') fx.kick(8), fx.burst(x, y, '#ffb0c8', 20, 4, 2.6), fx.pop(x, y - R(0.04), e.text!, e.col!, 24), fx.blink('#ff4f6a', 0.12);
    if (e.kind === 'bonk') fx.kick(7), fx.ring(x, y, '#bdf3ff', R(0.08), 4), fx.burst(x, y, '#e0fbff', 14, 3.4, 2), fx.pop(x, y - R(0.05), e.text!, e.col!, 24);
    if (e.kind === 'empty') fx.pop(x, y - R(0.08), e.text!, e.col!, 16), fx.burst(x, y, '#ffffff', 6, 1.6, 1.6);
    if (e.kind === 'deliver') fx.ring(x, Y(CH.top), '#ffe36e', R(0.12), 5), fx.burst(x, Y(CH.top), '#ffe36e', 22, 4, 2.6), fx.burst(x, Y(CH.top), '#ff8fd0', 14, 3.4, 2.2), fx.pop(x, Y(CH.top - 0.06), e.text!, e.col!, (e.n ?? 1) >= 3 ? 24 : 18), fx.kick((e.n ?? 1) >= 5 ? 7 : 3), (e.n ?? 0) >= 5 && fx.blink('#fff3c8', 0.3);
    if (e.kind === 'power') fx.blink('#ffd43b', 0.3), fx.pop(X(0.5), Y(RAIL_Y + 0.07), e.text!, e.col!, 22), fx.ring(X(s.cx), Y(RAIL_Y), '#ffd43b', R(0.15), 5);
    if (e.kind === 'clear') fx.burst(X(0.3), Y(0.55), '#ffe36e', 40, 6, 3.2), fx.burst(X(0.7), Y(0.55), '#ff8fd0', 40, 6, 3.2), fx.burst(X(0.5), Y(0.5), '#46f0ff', 30, 5, 3), fx.ring(X(0.5), Y(0.55), '#ffe36e', R(0.45), 7), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = t;
  ctx.restore();

  // ═════════ HUD (화면 위 띠) ═════════
  {
    const hb = ctx.createLinearGradient(0, 0, 0, Y(0.118));
    hb.addColorStop(0, 'rgba(12,4,28,.94)');
    hb.addColorStop(1, 'rgba(12,4,28,.78)');
    ctx.fillStyle = hb;
    ctx.fillRect(0, 0, w, Y(0.112));
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    font(0.042, 900);
    ctx.fillText(`${s.stage + 1}판 · ${d.name}`, X(0.03), Y(0.032), X(0.62));
    ctx.textAlign = 'right';
    font(0.044, 900);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k < s.hearts ? '#ff4f6a' : 'rgba(255,255,255,.18)';
      ctx.fillText('♥', X(0.97 - k * 0.055), Y(0.034));
    }
    // 둘째 줄: 목표 진행 · 동전 · 별 셋
    const gy = Y(0.083);
    ctx.textAlign = 'left';
    font(0.038, 900);
    const goalTxt = `인형 ${Math.min(s.got, 99)}/${d.goal}`;
    ctx.fillStyle = s.got >= d.goal ? '#7dff8a' : '#ffe9f6';
    ctx.fillText(goalTxt, X(0.03), gy);
    const gw = ctx.measureText(goalTxt).width;
    // 동전
    const cx3 = X(0.03) + gw + R(0.04);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(cx3, gy, R(0.014), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b07a10';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = s.coins ? '#ffe9a8' : '#ff8a8a';
    ctx.fillText(`×${s.coins}`, cx3 + R(0.022), gy);
    // 별 칩
    const chips: [string, boolean, boolean][] = [
      ['목표', s.got >= d.goal || (s.phase === 'result' && s.ok), false],
      ['동전 남김', s.coins >= 1, s.coins < 1],
      ['왕관 곰', s.crown, false],
    ];
    font(0.036, 900);
    let rx = X(0.975);
    for (let k = chips.length - 1; k >= 0; k--) {
      const [lab, on, lost] = chips[k], tw = ctx.measureText(lab).width + R(0.05);
      rx -= tw;
      ctx.fillStyle = on ? 'rgba(255,209,102,.22)' : 'rgba(255,255,255,.07)';
      ctx.beginPath();
      ctx.roundRect(rx, gy - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.strokeStyle = on ? '#ffd166' : lost ? 'rgba(255,120,120,.5)' : 'rgba(255,255,255,.25)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = on ? '#ffd166' : lost ? '#ff8a8a' : 'rgba(255,255,255,.5)';
      ctx.textAlign = 'left';
      ctx.fillText(`${lost ? '✗' : '★'}${lab}`, rx + R(0.012), gy + 0.5);
      rx -= R(0.008);
    }
  }
  // 새것 알림 (간판 위 리본)
  if (s.news && t - s.news.t < 230) {
    // 투명하게 사라지면 간판 글씨와 겹쳐 보여서, 세로로 접히며 열리고 닫힌다
    const age = t - s.news.t, a = Math.min(1, age / 8, (230 - age) / 12);
    ctx.save();
    ctx.translate(0, Y(0.172));
    ctx.scale(1, Math.max(0.01, a));
    ctx.translate(0, -Y(0.172));
    font(0.037, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 간판 전체를 덮는 전광판 (간판 글씨와 겹치지 않게)
    const tx = s.news.text, by = Y(0.172), slide = Math.max(0, 12 - age) * R(0.03);
    const pg = ctx.createLinearGradient(0, Y(0.128), 0, Y(0.216));
    pg.addColorStop(0, '#0e3346');
    pg.addColorStop(1, '#08202e');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(X(0.055), Y(0.127), R(0.89), Y(0.217) - Y(0.127), R(0.02));
    ctx.fill();
    ctx.save();
    ctx.shadowColor = '#46f0ff';
    ctx.shadowBlur = R(0.02);
    ctx.strokeStyle = '#46f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.roundRect(X(0.07), by - R(0.022), R(0.11), R(0.044), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#1a0838';
    font(0.032, 900);
    ctx.fillText('NEW', X(0.125), by + 0.5);
    ctx.fillStyle = '#ffffff';
    font(0.038, 900);
    ctx.textAlign = 'left';
    ctx.fillText(tx, X(0.195) + slide, by + 0.5, R(0.73));
    ctx.restore();
  }
  // 첫 3초 안내: 집게 옆 말풍선
  if (s.stage === 0 && s.taps === 0 && aim) {
    const pul = 1 + 0.06 * Math.sin(t * 0.18);
    ctx.save();
    ctx.translate(X(Math.min(0.72, s.cx + 0.2)), Y(0.42));
    ctx.scale(pul, pul);
    font(0.044, 900);
    const tx = '👆 톡! 집게 내리기', tw = ctx.measureText(tx).width + R(0.05);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -R(0.032), tw, R(0.064), R(0.032));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-tw / 2 + R(0.02), -R(0.01));
    ctx.lineTo(-tw / 2 - R(0.03), -R(0.04));
    ctx.lineTo(-tw / 2 + R(0.03), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#c2185b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tx, 0, 0.5);
    ctx.restore();
  }
  // 판 시작 카드
  const stEv = s.events.find((e) => e.kind === 'stage');
  if (stEv && s.stage > 0 && aim && t - stEv.t < 110) {
    const ag = t - stEv.t, a = Math.min(1, ag / 8, (110 - ag) / 15);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,6,40,.85)';
    ctx.beginPath();
    ctx.roundRect(X(0.14), Y(0.5), R(0.72), R(0.12), R(0.03));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    font(0.052, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${s.stage + 1}판 · ${d.name}`, X(0.5), Y(0.535));
    ctx.fillStyle = '#ffe36e';
    font(0.038, 800);
    ctx.fillText(`동전 ${d.coins}개로 인형 ${d.goal}마리`, X(0.5), Y(0.588));
    ctx.globalAlpha = 1;
  }
  // 판 결과 카드
  if (s.phase === 'result') {
    const ag = s.pt, sc2 = Math.min(1, 0.6 + ag / 12);
    ctx.save();
    ctx.translate(X(0.5), Y(0.55));
    ctx.scale(sc2, sc2);
    ctx.fillStyle = 'rgba(20,6,40,.9)';
    ctx.beginPath();
    ctx.roundRect(-R(0.42), -R(0.1), R(0.84), R(0.2), R(0.04));
    ctx.fill();
    ctx.strokeStyle = s.ok ? '#ffd166' : '#ff8a9a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (s.ok) {
      ctx.fillStyle = '#ffd166';
      font(0.056, 900);
      ctx.fillText(s.won ? '8판 다 뽑았다! 🎉' : `${s.stage + 1}판 통과!`, 0, -R(0.055));
      for (let k = 0; k < 3; k++) {
        const at = 8 + k * 12, a2 = ag - at;
        if (a2 < 0) continue;
        const got = k < s.starsThis, pop = a2 < 8 ? 1.8 - 0.8 * (a2 / 8) : 1;
        ctx.save();
        ctx.translate((k - 1) * R(0.085), R(0.01));
        ctx.scale(pop, pop);
        ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.15)';
        font(0.06, 900);
        ctx.fillText('★', 0, 0);
        ctx.restore();
      }
      font(0.034, 800);
      ctx.fillStyle = '#ffe9f6';
      ctx.fillText(`목표 ✓ · 동전 ${s.coins}개 남김 ${s.coins ? '✓' : '✗'} · 왕관 곰 ${s.crown ? '✓' : '✗'}`, 0, R(0.068), R(0.8));
    } else {
      ctx.fillStyle = '#ffb0bc';
      font(0.05, 900);
      ctx.fillText('동전이 다 떨어졌어요', 0, -R(0.035));
      font(0.038, 800);
      ctx.fillStyle = '#ffe9f6';
      ctx.fillText(s.hearts > 0 ? '하트 -1 · 같은 기계로 다시!' : '끝 — 잘 뽑았어요!', 0, R(0.04));
    }
    ctx.restore();
  }
}
