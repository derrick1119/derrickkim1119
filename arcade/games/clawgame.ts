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
export const SLOTS = 10, SLOT0 = 0.338, SLOT_W = 0.0635;
/** 집게가 오가는 범위 · 출구(왼쪽 투명 통) */
const PIT_L = 0.3, PIT_R = 0.948, CHUTE_X = 0.165;
/** 연출 시간(틱) */
const DROP = 30, CLOSE = 12, RISE = 36, SLIP_AT = 16, RELEASE = 20, RESULT = 170, RESULT_OK = 175, BONK_Z = 0.42;
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
  { name: '움직이는 바닥', coins: 4, goal: 8, str: 6, speed: 0.005, grab: 0.05, chains: 'ccbcc Kc Bb _', belt: 0.04, news: ['belt', '바닥이 왔다 갔다 — 그림자를 잘 보고!'] },
  { name: '꿈틀 상자', coins: 4, goal: 9, str: 6, speed: 0.0052, grab: 0.05, chains: 'cccc Kb Bb bc', box: true, news: ['box', '📦 꿈틀 상자가 통통 — 속에 뭐가 있을까?'] },
  { name: '가위 꽃게', coins: 4, goal: 8, str: 6, speed: 0.0055, grab: 0.05, chains: 'cccSBB Kc cc', news: ['crab', '✂️ 가위 꽃게는 반대쪽 실을 싹둑 끊어요'] },
  { name: '투명 덮개', coins: 4, goal: 7, str: 5, speed: 0.0058, grab: 0.05, chains: 'P ccBcc Kb bb', cover: 0.2, news: ['cover', '투명 덮개 위로 내리면 텅! 비켜날 때를 노려요'] },
  { name: '대왕 인형 산', coins: 5, goal: 11, str: 5, speed: 0.006, grab: 0.05, chains: 'P ccSBcc Kc b', belt: 0.035, box: true, news: ['finale', '대왕 인형 산 — 다 섞였어요!'] },
];
export const STAGE_COUNT = STAGES.length;

export interface Doll { id: number; kind: Kind; slot: number; w: number; n: number; gone: boolean; held: boolean; fell: number; hue: number }
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
  line: { kind: Kind; t: number; hue: number }[];
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
  let slot = 0;
  for (const g of groups) {
    let prev = -1;
    for (const ch of g) {
      if (ch !== '_') {
        const k = KINDS[ch], id = s.dolls.length;
        s.dolls.push({ id, kind: k.k, slot, w: k.w, n: k.n, gone: false, held: false, fell: -999, hue: Math.floor(r() * 360) });
        if (prev >= 0) s.links.push([prev, id]);
        prev = id;
      }
      slot++;
    }
  }
  s.hops = [];
  if (d.box) {
    s.dolls.push({ id: s.dolls.length, kind: 'box', slot: -1, w: BOX.w, n: BOX.n, gone: false, held: false, fell: -999, hue: 30 });
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
  s.cx = d.fixed ? slotX(1) : PIT_L;
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
    s.line.push({ kind: d.kind, t: s.t + 14 + s.line.length * 4, hue: d.hue });
  }
  s.got += n;
  s.pts += n * DOLL_PTS;
  ev(s, 'deliver', CHUTE_X, 0.86, n ? `쏙! +${n}` : '쏙!', '#ffe36e', n);
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
        s.cx += s.dir * d.speed;
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
          ev(s, 'bonk', s.cx, 0.33 + BONK_Z * 0.55, '텅!', '#bdf3ff');
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
          ev(s, 'empty', s.cx, 0.9, '허탕~', '#ffffff');
          kid(s, 'aww', '아깝다~');
        } else {
          for (const i of g.ids) s.dolls[i].held = true;
          for (const [a, b] of g.cuts) {
            s.cuts.push({ a, b, t: s.t });
            s.links = s.links.filter(([p, q]) => !(p === a && q === b));
          }
          if (g.cuts.length) ev(s, 'snip', dollX(s, s.dolls[g.cuts[0][0]]) / 2 + dollX(s, s.dolls[g.cuts[0][1]]) / 2, 0.9, '싹둑!', '#ff8a8a'), see(s, 'crab', '✂️ 가위 꽃게는 반대쪽 실을 싹둑 끊어요');
          if (g.ids.length >= 2) see(s, 'thread', '실로 엮인 인형은 줄줄이 딸려 와요!');
          if (g.n >= 5) see(s, 'five', '한 번에 다섯 마리!');
          if (s.dolls[g.ids[0]].kind === 'box') see(s, 'cat', '상자 속엔 진짜 고양이! (인형 3마리 몫)');
          ev(s, 'grab', s.cx, 0.9, g.ok ? (g.ids.length > 1 ? `줄줄이 ${g.ids.length}!` : '잡았다!') : `무게 ${g.weight} > 힘 ${strength(s)}`, g.ok ? '#b6ff9e' : '#ffb0b0', g.ids.length);
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
          ev(s, 'slip', s.cx, 0.33 + s.cz * 0.55, '툭!', '#ff8a8a');
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
function drawAll(ctx: CanvasRenderingContext2D, s: ClawState, w: number, h: number, th: Theme) {
  const fx = juice(s);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
