/**
 * 꼬마 마녀 조합 연구소 (34라운드: 완전히 다른 장르 — 조합 발견) — 조합 발견 × 연쇄 × 가리키기(톡).
 * 놀이: 햇살 드는 다락방 연구소. 선반의 재료(처음엔 물·불·흙·바람 병)를 톡·톡 두 번 고르면 가운데 솥에 퐁당 —
 *   보글보글 끓다 '펑!' 새것(구름 강아지·용암 거북·민들레 요정…)이 태어나 선반에 오르고, 다음 재료가 된다(연쇄 발견).
 *   모든 것에는 '재료 점'(물·불·흙·바람)이 있고 섞으면 점이 더해진다 — 단서 쪽지("○ + ? = 무지개")의 빈칸을 점으로 셈해 추리한다.
 *   없는 조합이면 검댕 연기에 마녀가 콜록. 시간 제한 없음 — 톡 하나에 솥이 저절로 끓고 결과가 펼쳐진다.
 * 판·목표: 판마다 목표 하나(그림 쪽지) + 단서 한 줄. 물약 병(= 섞을 수 있는 횟수, 지킬 것 guard) 안에 목표를 만들면 판 끝.
 *   병을 다 쓰거나 재료가 모자라 더는 못 만들면 하트 -1 · 그 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 별(쉬운 말, 1판 하나 · 판마다 하나씩): 목표 만들기 · ○번 안에 만들기 · 새것 ○개 발견하기 · 손님에게 보여 주기 · 하나도 안 터뜨리기.
 * 펼쳐짐(판마다 하는 일이 바뀐다): 1 섞어 보기(새것 둘) → 2 만든 것도 재료(연쇄 · 단서 쪽지) → 3 손님 마녀의 주문(둘을 함께 채우는 길 찾기)
 *   → 4 금 간 병(한 번 쓰면 사라짐 — 나누는 순서) → 5 펑! 솥(없는 조합은 터져 재료 하나가 깨짐) → 6 큰 솥(셋까지 · 둘이면 솥을 톡)
 *   → 7 거꾸로 단서(그림자 + 불 = 고래 → 그림자는?) → 8 마지막(다 섞어서 별빛 고래).
 * 웃음: 실패하면 검댕 연기에 얼굴이 새까매진 마녀가 콜록콜록, 펑! 솥은 모자가 날아가고 깨진 병 조각이 데굴데굴.
 *   새로 태어난 생물은 솥에서 튀어나와 다락방을 한 바퀴 뛰어다니며 제 소리('뭉게!')를 내고 선반으로 폴짝. 창틀 부엉이가 큰 순간마다 눈이 휘둥그레.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.56;

// ───────────────────────────── 세계: 재료 점 [물, 불, 흙, 바람] ─────────────────────────────
export interface Item { id: string; name: string; d: number[]; say: string; col: string; base?: boolean }
const it = (id: string, name: string, d: number[], say: string, col: string, base = false): Item => ({ id, name, d, say, col, base });
export const ITEMS: Item[] = [
  it('water', '물', [1, 0, 0, 0], '찰랑', '#3f9cf5', true),
  it('fire', '불', [0, 1, 0, 0], '화르륵', '#ff6a2a', true),
  it('earth', '흙', [0, 0, 1, 0], '폭신', '#a8703a', true),
  it('wind', '바람', [0, 0, 0, 1], '휘잉', '#5fd0b8', true),
  it('pup', '구름 강아지', [1, 1, 0, 0], '뭉게!', '#dff0ff'),
  it('frog', '진흙 개구리', [1, 0, 1, 0], '개굴!', '#8cc04a'),
  it('fish', '방울 물고기', [1, 0, 0, 1], '뽀글!', '#4cc4f0'),
  it('turtle', '용암 거북', [0, 1, 1, 0], '후끈!', '#e8603a'),
  it('moth', '불꽃 나비', [0, 1, 0, 1], '팔랑!', '#ffae2e'),
  it('fairy', '민들레 요정', [0, 0, 1, 1], '후~!', '#fff3c0'),
  it('jelly', '물방울 해파리', [2, 0, 0, 0], '출렁!', '#9fd6ff'),
  it('mole', '바위 두더지', [0, 0, 2, 0], '쿵!', '#9a7656'),
  it('rainbow', '무지개', [1, 1, 0, 1], '반짝!', '#ff7aa8'),
  it('duck', '온천 오리', [1, 1, 1, 0], '꽥~!', '#ffd84a'),
  it('deer', '꽃사슴', [1, 0, 1, 1], '사뿐!', '#e8a060'),
  it('dragon', '꼬마 용', [0, 1, 1, 1], '크앙!', '#6cc070'),
  it('sheep', '비구름 양', [2, 0, 0, 1], '주룩!', '#b8c8e0'),
  it('cat', '별빛 고양이', [1, 1, 1, 1], '냐옹~', '#5a5ad0'),
  it('whale', '무지개 고래', [2, 1, 0, 1], '푸우~', '#4a8ae8'),
  it('unicorn', '무지개 유니콘', [1, 1, 1, 2], '히힝!', '#ffffff'),
  it('starwhale', '별빛 고래', [2, 1, 1, 1], '우우웅~', '#6a58d8'),
];
const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const dkey = (d: number[]) => d.join('');
const BY_KEY: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [dkey(i.d), i]));
const fromKey = (k: string) => [...k].map(Number);
const addD = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
const inside = (a: number[], b: number[]) => a.every((v, i) => v <= b[i]);
const dsize = (d: number[]) => d[0] + d[1] + d[2] + d[3];
export const CREATURES = ITEMS.filter((i) => !i.base).length;
const W = 'water', F = 'fire', E = 'earth', WI = 'wind';

// ───────────────────────────── 판 ─────────────────────────────
type StarK = 'goal' | 'within' | 'new' | 'guest' | 'noboom';
interface Star { k: StarK; n: number; label: string }
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
export interface StageDef {
  key: string; name: string; shelf: string[]; goal: string | null; need?: number;
  /** 단서 쪽지: [보이는 재료, 숨은 재료] → "보이는 + ? = 목표" */
  clue?: [string, string];
  /** 거꾸로 단서: "그림자(목표) + other = result" */
  rev?: { other: string; result: string };
  guest?: string; bottles: number; once?: boolean; boom?: boolean; triple?: boolean;
  stars: Star[]; news: string; tip: string;
}
export const STAGES: StageDef[] = [
  { key: 'mix', name: '첫 실험', shelf: [W, F, E, WI], goal: null, need: 2, bottles: 6, stars: [S('goal', 0, '새것 둘 만들기')], news: '병 둘을 톡·톡 → 솥에서 새것이 태어나요', tip: '병 둘을 톡·톡 하면 새것이 태어나요' },
  { key: 'chain', name: '무지개', shelf: [W, F, WI], goal: 'rainbow', clue: ['pup', WI], bottles: 7, stars: [S('goal', 0, '무지개 만들기'), S('within', 3, '세 번 안에 만들기')], news: '만든 것도 재료! 단서 쪽지를 봐요', tip: '단서: 구름 강아지 + 바람 = 무지개' },
  { key: 'guest', name: '꼬마 용', shelf: [W, F, E, WI], goal: 'dragon', clue: ['turtle', WI], guest: 'moth', bottles: 6, stars: [S('goal', 0, '꼬마 용 만들기'), S('guest', 0, '손님에게 불꽃 나비 보여 주기'), S('within', 2, '두 번 안에 만들기')], news: '손님 마녀가 불꽃 나비를 보고 싶대요', tip: '점을 세요 — 불꽃 나비에도 용의 점이 있어요' },
  { key: 'once', name: '별빛 고양이', shelf: [W, F, E, WI, 'pup'], goal: 'cat', clue: ['pup', 'fairy'], once: true, bottles: 4, stars: [S('goal', 0, '별빛 고양이 만들기'), S('within', 2, '두 번 안에 만들기'), S('new', 2, '새것 둘 발견하기')], news: '금 간 병 — 한 번 넣으면 사라져요', tip: '하나씩만 있어요 — 나누는 순서를 생각해요' },
  { key: 'boom', name: '무지개 고래', shelf: [W, F, E, WI, 'fish'], goal: 'whale', clue: ['rainbow', W], boom: true, bottles: 5, stars: [S('goal', 0, '무지개 고래 만들기'), S('noboom', 0, '하나도 안 터뜨리기'), S('within', 2, '두 번 안에 만들기')], news: '펑! 솥 — 없는 조합은 터져서 병이 깨져요', tip: '터지면 나중에 넣은 병이 깨져요' },
  { key: 'triple', name: '무지개 유니콘', shelf: [W, F, E, WI, 'fairy'], goal: 'unicorn', clue: ['rainbow', 'fairy'], triple: true, boom: true, bottles: 4, stars: [S('goal', 0, '유니콘 만들기'), S('within', 2, '두 번 안에 만들기'), S('new', 2, '새것 둘 발견하기')], news: '큰 솥 — 셋까지 넣어요 · 둘이면 솥을 톡!', tip: '셋을 넣으면 한 번에 점 셋이 더해져요' },
  { key: 'reverse', name: '그림자', shelf: [W, F, E, WI], goal: 'sheep', rev: { other: F, result: 'whale' }, triple: true, boom: true, bottles: 4, stars: [S('goal', 0, '그림자 만들기'), S('within', 1, '한 번에 만들기'), S('noboom', 0, '하나도 안 터뜨리기')], news: '거꾸로 단서 — 그림자 + 불 = 고래, 그림자는?', tip: '고래의 점에서 불 점을 빼 봐요' },
  { key: 'final', name: '별빛 고래', shelf: [W, W, F, E, WI], goal: 'starwhale', clue: ['whale', E], guest: 'deer', once: true, triple: true, boom: true, bottles: 4, stars: [S('goal', 0, '별빛 고래 만들기'), S('guest', 0, '손님에게 꽃사슴 보여 주기'), S('within', 3, '세 번 안에 만들기')], news: '마지막 — 금 간 병 · 큰 솥 · 펑! 솥 · 손님 모두', tip: '꽃사슴도 별빛 고래의 반쪽이에요' },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 상태 ─────────────────────────────
export interface Slot { id: string; uid: number; made: number }
type Phase = 'intro' | 'play' | 'brew' | 'pop' | 'result';
export interface Pour { slot: number; id: string; t: number; uid: number }
export interface Pop { kind: 'new' | 'known' | 'fail' | 'goal'; id: string | null; sum: number[]; t: number; end: number; slot: number; boom: boolean; lost: string | null; lostSlot: number; inputs: string[]; isNew: boolean; guest: boolean; bye: string | null }
interface Ev { n: number; t: number; kind: string; x: number; y: number; text?: string; id?: string; v?: number }
export interface LabState {
  rng: Rng; seed: number; t: number; stage: number; phase: Phase; pt: number;
  shelf: (Slot | null)[]; pot: Pour[]; uid: number; brewAt: number;
  bottles: number; mixes: number; newN: number; booms: number; fails: number; guestOk: boolean;
  codex: Set<string>; bad: Set<string>; order: string[];
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; again: boolean; tries: number;
  pop: Pop | null; firstTap: number; wowN: number; mixN: number; lastMade: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[]; evN: number;
  down: boolean; px: number; py: number;
}

const ev = (s: LabState, kind: string, x: number, y: number, text?: string, id?: string, v?: number) => s.events.push({ n: ++s.evN, t: s.t, kind, x, y, text, id, v });
function see(s: LabState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}

// 화면 배치 (가로 0~1, 세로 0~A, 가로 폭 단위)
export const POT_X = 0.5, POT_Y = 0.62;
const SLOT_X = [0.18, 0.5, 0.82], SLOT_BASE = [0.965, 1.21], SLOT_W = 0.3;
export const slotXY = (i: number): [number, number] => [SLOT_X[i % 3], SLOT_BASE[Math.floor(i / 3)]];
function hitSlot(x: number, y: number): number {
  for (let i = 0; i < 6; i++) {
    const [sx, sy] = slotXY(i);
    if (Math.abs(x - sx) < SLOT_W / 2 && y > sy - 0.165 && y < sy + 0.095) return i;
  }
  return -1;
}
const hitPot = (x: number, y: number) => Math.abs(x - POT_X) < 0.19 && y > POT_Y - 0.16 && y < POT_Y + 0.17;

const INTRO_T = 120, INTRO_MIN = 30, BREW_T = 30, RESULT_OK = 180, RESULT_FAIL = 150;
const POP_T = { new: 92, known: 34, fail: 58, goal: 104 } as const;
const NEW_PTS = 20, STAR_PTS = 100, CLEAR_PTS = 50, WIN_PTS = 300;

const cap = (d: StageDef) => (d.triple ? 3 : 2);
const goalKey = (d: StageDef) => (d.goal ? dkey(BY_ID[d.goal].d) : '');

function newStage(s: LabState) {
  const d = STAGES[s.stage];
  const ids = [...d.shelf];
  // 1판 첫판은 물·불을 늘 같은 자리에(첫인상 손가락), 나머지는 판마다 자리를 섞는다
  if (s.stage > 0 || s.again)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(s.rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  s.shelf = [null, null, null, null, null, null];
  ids.forEach((id, i) => (s.shelf[i] = { id, uid: ++s.uid, made: -1 }));
  s.pot = [];
  s.bottles = d.bottles;
  s.mixes = 0;
  s.newN = 0;
  s.booms = 0;
  s.fails = 0;
  s.guestOk = false;
  s.pop = null;
  s.lastMade = -1;
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  s.phase = s.stage === 0 && !s.again ? 'play' : 'intro';
  s.pt = 0;
  for (const id of d.shelf) s.codex.add(id);
  see(s, d.key, s.stage === 0 ? '' : d.news);
  ev(s, 'stage', 0.5, 0.5, `${s.stage + 1}판 · ${d.name}`);
}

/** 플레이어가 아는 것: 도감(만들어 본 것) + 이 판의 쪽지에 나온 것 */
export function knownKeys(s: LabState): Set<string> {
  const d = STAGES[s.stage], k = new Set<string>();
  for (const id of s.codex) k.add(dkey(BY_ID[id].d));
  for (const id of [d.goal, d.guest, d.clue?.[0], d.clue?.[1], d.rev?.other, d.rev?.result]) if (id) k.add(dkey(BY_ID[id].d));
  return k;
}

/** 지금 선반으로 목표에 닿을 수 있나 (전지적: 실제 세계로, 남은 병 수 안에) */
function reachable(s: LabState): boolean {
  const d = STAGES[s.stage];
  if (!d.goal) return s.bottles >= (d.need ?? 0) - s.newN;
  const g = BY_ID[d.goal].d, keys = s.shelf.filter((x): x is Slot => !!x).map((x) => dkey(BY_ID[x.id].d)).filter((k) => inside(fromKey(k), g));
  return reach(keys, g, s.bottles, !!d.triple, !!d.once, new Map());
}
function reach(keys: string[], g: number[], left: number, triple: boolean, once: boolean, memo: Map<string, boolean>): boolean {
  if (left <= 0) return false;
  const mk = [...keys].sort().join('|') + '#' + left;
  const hit = memo.get(mk);
  if (hit !== undefined) return hit;
  let ok = false;
  const gk = dkey(g);
  combos(keys.length, triple, once, (idx) => {
    if (ok) return;
    const sum = idx.reduce((a, i) => addD(a, fromKey(keys[i])), [0, 0, 0, 0]), k = dkey(sum);
    if (!inside(sum, g) || !BY_KEY[k]) return;
    if (k === gk) return void (ok = true);
    let nk: string[];
    if (once) (nk = keys.filter((_, i) => !idx.includes(i))), nk.push(k);
    else {
      if (keys.includes(k)) return;
      nk = [...keys, k];
    }
    if (reach(nk, g, left - 1, triple, once, memo)) ok = true;
  });
  memo.set(mk, ok);
  return ok;
}
/** 고를 수 있는 조합 (둘, 큰 솥이면 셋까지). 금 간 병은 같은 것을 두 번 못 쓴다 */
function combos(n: number, triple: boolean, once: boolean, f: (idx: number[]) => void) {
  for (let i = 0; i < n; i++)
    for (let j = once ? i + 1 : i; j < n; j++) {
      f([i, j]);
      if (triple) for (let k = once ? j + 1 : j; k < n; k++) f([i, j, k]);
    }
}

function tapSlot(s: LabState, i: number) {
  const d = STAGES[s.stage], sl = s.shelf[i];
  if (!sl) return;
  if (s.firstTap < 0) s.firstTap = s.t;
  s.pot.push({ slot: i, id: sl.id, t: s.t, uid: sl.uid });
  ev(s, 'pour', slotXY(i)[0], slotXY(i)[1] - 0.08, BY_ID[sl.id].name, sl.id, i);
  if (d.once) {
    s.shelf[i] = null;
    see(s, 'once', '');
  }
  if (s.pot.length >= cap(d)) startBrew(s);
}
function startBrew(s: LabState) {
  s.phase = 'brew';
  s.pt = 0;
  s.brewAt = s.t;
  s.bottles--;
  s.mixes++;
  ev(s, 'brew', POT_X, POT_Y);
}

function placeOnShelf(s: LabState, id: string): { slot: number; bye: string | null } {
  const d = STAGES[s.stage];
  if (!d.once) {
    const at = s.shelf.findIndex((x) => x?.id === id);
    if (at >= 0) return { slot: at, bye: null };
  }
  let slot = s.shelf.findIndex((x) => !x), bye: string | null = null;
  if (slot < 0) {
    // 선반이 꽉 차면 가장 오래된 새것이 창밖으로 (처음 재료는 남긴다)
    let best = -1, bt = 1e9;
    s.shelf.forEach((x, k) => x && x.made >= 0 && x.made < bt && ((bt = x.made), (best = k)));
    if (best < 0) best = 5;
    bye = s.shelf[best]!.id;
    slot = best;
    see(s, 'full', '선반이 꽉 차면 오래된 새것이 창밖으로 날아가요');
  }
  s.shelf[slot] = { id, uid: ++s.uid, made: s.t };
  s.lastMade = slot;
  return { slot, bye };
}

function resolve(s: LabState) {
  const d = STAGES[s.stage];
  const sum = s.pot.reduce((a, p) => addD(a, BY_ID[p.id].d), [0, 0, 0, 0]), key = dkey(sum), item = BY_KEY[key];
  const inputs = s.pot.map((p) => p.id);
  s.mixN++;
  let pop: Pop;
  if (item) {
    const isNew = !s.codex.has(item.id);
    if (isNew) (s.codex.add(item.id), s.order.push(item.id), s.newN++, (s.pts += NEW_PTS), s.wowN++);
    const guest = !!d.guest && item.id === d.guest && !s.guestOk;
    if (guest) (s.guestOk = true), s.wowN++;
    const goal = item.id === d.goal || (!d.goal && s.newN >= (d.need ?? 2));
    let slot = -1, bye: string | null = null;
    if (item.id !== d.goal) ({ slot, bye } = placeOnShelf(s, item.id));
    pop = { kind: item.id === d.goal ? 'goal' : isNew ? 'new' : 'known', id: item.id, sum, t: s.t, end: 0, slot, boom: false, lost: null, lostSlot: -1, inputs, isNew, guest, bye };
    if (goal && item.id !== d.goal) pop.kind = 'new';
    if (pop.kind === 'goal') s.wowN++;
    if (dsize(sum) >= 4 && pop.kind !== 'goal' && isNew) s.wowN++;
    if (pop.kind === 'known') see(s, 'known', '');
  } else {
    s.bad.add(key);
    s.fails++;
    let lost: string | null = null, lostSlot = -1;
    if (d.boom) {
      s.booms++;
      see(s, 'boomed', '');
      const last = s.pot[s.pot.length - 1];
      if (!d.once && s.shelf[last.slot]?.uid === last.uid) (lost = last.id), (lostSlot = last.slot), (s.shelf[last.slot] = null);
      else if (d.once) lost = last.id;
    } else see(s, 'soot', '');
    pop = { kind: 'fail', id: null, sum, t: s.t, end: 0, slot: -1, boom: !!d.boom, lost, lostSlot, inputs, isNew: false, guest: false, bye: null };
  }
  pop.end = s.t + (pop.kind === 'new' ? POP_T.new : pop.kind === 'known' ? POP_T.known : pop.kind === 'fail' ? POP_T.fail + (pop.boom ? 8 : 0) : POP_T.goal);
  s.pop = pop;
  s.pot = [];
  s.phase = 'pop';
  s.pt = 0;
  ev(s, pop.kind, POT_X, POT_Y - 0.1, item?.name ?? '', item?.id, pop.slot);
}

function afterPop(s: LabState) {
  const d = STAGES[s.stage], p = s.pop!;
  const done = d.goal ? p.kind === 'goal' : s.newN >= (d.need ?? 2);
  if (done) return finish(s, true);
  if (s.bottles <= 0) return finish(s, false, '물약을 다 썼어요');
  if (!reachable(s)) return finish(s, false, '재료가 모자라요');
  s.phase = 'play';
  s.pt = 0;
}

const starMet = (s: LabState, q: Star) => (q.k === 'goal' ? true : q.k === 'within' ? s.mixes <= q.n : q.k === 'new' ? s.newN >= q.n : q.k === 'guest' ? s.guestOk : s.booms === 0);
function finish(s: LabState, ok: boolean, why = '') {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS;
    if (s.stage === STAGE_COUNT - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.5);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'stagefail', 0.5, 0.5, why);
  }
}

// ───────────────────────────── 게임 ─────────────────────────────
const game: GameDef<LabState> & { wows(s: LabState): number } = {
  id: 'alchemylab',
  name: '꼬마 마녀 조합 연구소',
  genes: ['alchemy', 'chain', 'pointer'],
  twist: '태어난 생물이 곧 다음 재료다 — 생물마다 몸에 재료 점이 있고 섞으면 점이 더해지니, 단서 쪽지의 빈칸을 점으로 셈해 중간 생물부터 만들어 두고, 손님 주문과 목표가 함께 채워지는 길을 찾는다',
  rules: ['병 둘을 톡·톡 → 솥이 끓어 새것이 태어나요. 새것도 재료가 돼요.', '섞으면 재료 점이 더해져요 — 단서 쪽지를 보고 목표를 만들어요.', '물약 병을 다 쓰면 하트 -1, 그 판 다시.'],
  controls: 'touch',
  hint: '병을 톡·톡 (큰 솥은 솥을 톡) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 드는 나무 다락방 연구소의 꼬마 마녀 — 솥에서 귀여운 생물이 펑펑 태어나는 그림책 조합 놀이',
    mood: '둥근 창으로 햇살이 비스듬히 들고 먼지가 반짝이는 꿀빛 나무 다락방. 들보에 약초 다발이 걸리고 책이 쌓였다. 큰 모자 꼬마 마녀가 국자로 솥을 저으면 보글보글 끓다 펑! 구름 강아지·용암 거북·민들레 요정이 튀어나와 방을 한 바퀴 뛰고 선반으로 폴짝 오른다.',
    palette: { bg: '#f6dfb4', ink: '#4a2c1a', muted: '#9a7454', accent: '#ffc83a', hot: '#ff5a6e', soft: '#fff3dc' },
  },
  guard: (s) => s.bottles,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      shelf: [], pot: [], uid: 0, brewAt: 0,
      bottles: 0, mixes: 0, newN: 0, booms: 0, fails: 0, guestOk: false,
      codex: new Set<string>(), bad: new Set<string>(), order: [],
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, ok: false, why: '', won: false, dead: false, again: false, tries: 0,
      pop: null, firstTap: -1, wowN: 0, mixN: 0, lastMade: -1,
      seen: new Set<string>(), newsQ: [], news: null, events: [], evN: 0,
      down: false, px: 0.5, py: 0.5,
    } as LabState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    if (p) (s.px = p.x), (s.py = p.y * A);
    if (s.events.length > 40) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.newsQ.length && (!s.news || s.t - s.news.t > 150)) s.news = { text: s.newsQ.shift()!, t: s.t };
    const d = STAGES[s.stage];
    switch (s.phase) {
      case 'intro':
        if (s.pt >= INTRO_T || (press && s.pt >= INTRO_MIN)) (s.phase = 'play'), (s.pt = 0);
        return;
      case 'play': {
        if (!press) return;
        const x = s.px, y = s.py;
        const k = hitSlot(x, y);
        if (k >= 0 && s.shelf[k]) return tapSlot(s, k);
        if (hitPot(x, y) && d.triple && s.pot.length >= 2) return startBrew(s);
        if (hitPot(x, y) && s.pot.length < 2) ev(s, 'hint', POT_X, POT_Y - 0.2, s.pot.length ? '병을 하나 더 톡!' : '선반의 병을 톡!');
        return;
      }
      case 'brew':
        if (s.t - s.brewAt >= BREW_T) resolve(s);
        return;
      case 'pop':
        if (s.pop && s.t >= s.pop.end) afterPop(s);
        return;
      case 'result':
        if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
          if (s.ok) {
            if (s.won) s.dead = true;
            else (s.again = false), s.stage++, newStage(s);
          } else if (s.hearts <= 0) s.dead = true;
          else (s.again = true), newStage(s);
        }
        return;
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const alchemylab = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapAt = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapSlotIn = (i: number) => {
  const [x, y] = slotXY(i);
  return tapAt(x, y - 0.08);
};
const tapPot = () => tapAt(POT_X, POT_Y);

/** 생각하는 봇의 믿음: 만들어 본 것·쪽지에 나온 것은 있다, 해 보고 안 된 것은 없다. 처음 보는 점 조합은 — 점이 겹치지 않으면 거의 있고, 겹치면 셋에 하나꼴 */
const P_DISTINCT = 0.95, P_REPEAT = 0.3;
interface PCtx { new0: number; d: StageDef; g: number[]; gk: string; guestK: string; known: Set<string>; bad: Set<string>; codexK: Set<string>; memo: Map<string, number>; triple: boolean; once: boolean; boom: boolean; wantNew: number; mix0: number }
function pExist(c: PCtx, k: string) {
  if (c.known.has(k)) return 1;
  if (c.bad.has(k)) return 0;
  return fromKey(k).every((v) => v <= 1) ? P_DISTINCT : P_REPEAT;
}
function termValue(c: PCtx, mixes: number, newN: number, guest: boolean, booms: number) {
  let st = 0;
  for (const q of c.d.stars) st += q.k === 'goal' ? 1 : q.k === 'within' ? +(mixes <= q.n) : q.k === 'new' ? +(newN >= q.n) : q.k === 'guest' ? +guest : +(booms === 0);
  return st * 100 + newN * 20 - mixes * 3;
}
/** 선반 열쇠: 'b'(처음 재료) 또는 'm'(만든 것, 만든 순서대로) + 점 열쇠. 선반은 6칸 — 꽉 차면 가장 오래된 만든 것이 나간다 */
const kd = (x: string) => fromKey(x.slice(1));
function addKey(c: PCtx, keys: string[], k: string): string[] {
  const nk = [...keys, 'm' + k];
  if (!c.once && nk.length > 6) {
    const i = nk.findIndex((x) => x[0] === 'm');
    nk.splice(i, 1);
  }
  return nk;
}
/** 기댓값 탐색: keys = 선반, left = 남은 병, found = 이 판에 새로 찾은 것 */
function pvalue(c: PCtx, keys: string[], left: number, mixes: number, found: string[], guest: boolean, booms: number, depth: number): number {
  const newN = c.new0 + found.length;
  if (!c.d.goal && newN >= (c.d.need ?? 2)) return termValue(c, mixes, newN, guest, booms);
  if (left <= 0 || depth <= 0) return -400 + newN * 20;
  const mk = `${keys.filter((x) => x[0] === 'b').sort().join('|')}/${keys.filter((x) => x[0] === 'm').join('|')}#${left}#${[...found].sort().join(',')}#${+guest}#${booms}#${mixes}`;
  const hit = c.memo.get(mk);
  if (hit !== undefined) return hit;
  let best = -400 + newN * 20;
  combos(keys.length, c.triple, c.once, (idx) => {
    const v = actValue(c, keys, idx, left, mixes, found, guest, booms, depth);
    if (v > best) best = v;
  });
  c.memo.set(mk, best);
  return best;
}
function actValue(c: PCtx, keys: string[], idx: number[], left: number, mixes: number, found: string[], guest: boolean, booms: number, depth: number, root = false): number {
  const sum = idx.reduce((a, i) => addD(a, kd(keys[i])), [0, 0, 0, 0]), k = dkey(sum);
  let p = pExist(c, k);
  // 깊은 수에서는 우연 가지를 치지 않는다: 점이 안 겹치는 처음 조합은 있다고, 겹치는 건 없다고 본다 (지금 고르는 수만 기댓값으로)
  if (!root && p < 1) p = p >= 0.5 ? 1 : 0;
  if (p <= 0) return -1e9;
  const toGoal = c.d.goal ? inside(sum, c.g) : true;
  const isNew = !c.codexK.has(k) && !found.includes(k);
  const forGuest = k === c.guestK && !guest;
  const explore = isNew && c.new0 + found.length < c.wantNew && dsize(sum) <= (c.d.goal ? dsize(c.g) : 2);
  if (!toGoal && !forGuest && !explore) return -1e9;
  if (!c.once && k !== c.gk && keys.some((x) => x.slice(1) === k)) return -1e9;
  // 성공
  let ok: number;
  const f2 = isNew ? [...found, k] : found, g2 = guest || forGuest;
  if (k === c.gk) ok = termValue(c, mixes + 1, c.new0 + f2.length, g2, booms);
  else ok = pvalue(c, addKey(c, c.once ? keys.filter((_, i) => !idx.includes(i)) : keys, k), left - 1, mixes + 1, f2, g2, booms, depth - 1);
  if (p >= 1) return ok;
  // 실패: 금 간 병은 넣은 것이 다 사라지고, 펑! 솥은 마지막 병이 깨진다
  let fk: string[];
  if (c.once) fk = keys.filter((_, i) => !idx.includes(i));
  else if (c.boom) fk = keys.filter((_, i) => i !== idx[idx.length - 1]);
  else fk = keys;
  const bad = pvalue(c, fk, left - 1, mixes + 1, found, guest, booms + (c.boom ? 1 : 0), depth - 1);
  return p * ok + (1 - p) * bad;
}
/** 지금 선반에서 가장 좋은 조합 (선반 칸 번호들, 넣을 순서대로) */
export function bestCombo(s: LabState): number[] | null {
  const d = STAGES[s.stage];
  const slots = s.shelf.map((x, i) => (x ? i : -1)).filter((i) => i >= 0).sort((a, b) => s.shelf[a]!.made - s.shelf[b]!.made || a - b);
  const keys = slots.map((i) => (s.shelf[i]!.made >= 0 ? 'm' : 'b') + dkey(BY_ID[s.shelf[i]!.id].d));
  const known = knownKeys(s);
  const codexK = new Set([...s.codex].map((id) => dkey(BY_ID[id].d)));
  const wantNew = d.goal ? Math.max(0, ...d.stars.filter((q) => q.k === 'new').map((q) => q.n)) : d.need ?? 2;
  const c: PCtx = { new0: s.newN, d, g: d.goal ? BY_ID[d.goal].d : [9, 9, 9, 9], gk: goalKey(d), guestK: d.guest ? dkey(BY_ID[d.guest].d) : '', known, bad: s.bad, codexK, memo: new Map(), triple: !!d.triple, once: !!d.once, boom: !!d.boom, wantNew, mix0: s.mixes };
  let best = -1e9, pick: number[] | null = null;
  const depth = Math.min(s.bottles, d.triple && !d.once ? 3 : 4);
  combos(keys.length, c.triple, c.once, (idx) => {
    const v = actValue(c, keys, idx, s.bottles, s.mixes, [], s.guestOk, s.booms, depth, true);
    if (v > best + 1e-9) (best = v), (pick = idx);
  });
  if (!pick) return null;
  // 펑! 솥: 터질 수도 있으면 덜 아까운 것(만든 것보다 처음 재료 중 남는 것)을 마지막에
  const order = (pick as number[]).map((i) => slots[i]);
  if (d.boom && order.length > 1) {
    const val = (sl: number) => (s.shelf[sl]!.made >= 0 ? 2 : 1);
    order.sort((a, b) => val(b) - val(a));
  }
  return order;
}

const smartMem = new WeakMap<object, { key: string; combo: number[] }>();
/** 잘하는 봇: 점을 셈해 목표까지 가는 길을 미리 다 짜 보고(기댓값 탐색), 별을 가장 많이 따는 조합을 고른다 */
export const alchemylabSmart: Bot<LabState> = {
  name: '점을 셈해 길을 짜는 마녀',
  act(s) {
    if (s.down) return NO;
    if (s.phase === 'intro') return s.pt >= INTRO_MIN + 20 ? tapPot() : NO;
    if (s.phase !== 'play') return NO;
    const key = `${s.stage}:${s.tries}:${s.mixN}`;
    let m = smartMem.get(s);
    if (!m || m.key !== key) {
      if (s.pot.length) return s.pot.length >= 2 ? tapPot() : NO;
      m = { key, combo: bestCombo(s) ?? [] };
      smartMem.set(s, m);
    }
    if (s.pot.length < m.combo.length) {
      const sl = m.combo[s.pot.length];
      return s.shelf[sl] ? tapSlotIn(sl) : NO;
    }
    return tapPot();
  },
};

const dumbMem = new WeakMap<object, { until: number; next: number; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 칸이나 톡 (가끔 솥) */
export const alchemylabRandom: Bot<LabState> = {
  name: '아무 병이나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { until: -1, next: s.t + 10 + Math.floor(rng() * 40), x: 0.5, y: 0.5 }));
    if (s.t < m.until) return tapAt(m.x, m.y);
    if (s.t >= m.next) {
      if (rng() < 0.12) [m.x, m.y] = [POT_X, POT_Y];
      else [m.x, m.y] = (([x, y]) => [x, y - 0.08])(slotXY(Math.floor(rng() * 6)));
      m.until = s.t + 3 + Math.floor(rng() * 4);
      m.next = m.until + 12 + Math.floor(rng() * 50);
      return tapAt(m.x, m.y);
    }
    return NO;
  },
};

function occupied(s: LabState) {
  return s.shelf.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
}
/** 버릇 봇: 늘 가장 최근에 만든 것 + 아무거나 (만든 게 없으면 아무 둘) */
export const alchemylabHabit: Bot<LabState> = {
  name: '늘 최근에 만든 것 + 아무거나',
  act(s, rng) {
    if (s.down) return NO;
    if (s.phase === 'intro') return s.pt >= INTRO_MIN + 20 ? tapPot() : NO;
    if (s.phase !== 'play') return NO;
    const occ = occupied(s);
    if (!occ.length) return NO;
    if (s.pot.length === 0) return tapSlotIn(s.lastMade >= 0 && s.shelf[s.lastMade] ? s.lastMade : occ[Math.floor(rng() * occ.length)]);
    if (s.pot.length === 1) return tapSlotIn(occ[Math.floor(rng() * occ.length)]);
    return tapPot();
  },
};

const h2Mem = new WeakMap<object, { key: string; n: number; pair: number[] }>();
/** 독립 버릇 봇: 왼쪽부터 차례로 둘씩 섞어 보기 (1+2, 1+3, …, 2+3, …) */
export const alchemylabHabit2: Bot<LabState> = {
  name: '왼쪽부터 차례로 둘씩',
  act(s) {
    if (s.down) return NO;
    if (s.phase === 'intro') return s.pt >= INTRO_MIN + 20 ? tapPot() : NO;
    if (s.phase !== 'play') return NO;
    const key = `${s.stage}:${s.tries}`;
    let m = h2Mem.get(s);
    if (!m || m.key !== key) h2Mem.set(s, (m = { key, n: 0, pair: [] }));
    const occ = occupied(s);
    if (s.pot.length === 0) {
      const pairs: number[][] = [];
      for (let i = 0; i < occ.length; i++) for (let j = i + 1; j < occ.length; j++) pairs.push([occ[i], occ[j]]);
      if (!pairs.length) return NO;
      m.pair = pairs[m.n % pairs.length];
      m.n++;
      return tapSlotIn(m.pair[0]);
    }
    if (s.pot.length === 1) return s.shelf[m.pair[1]] ? tapSlotIn(m.pair[1]) : tapSlotIn(occ[0]);
    return tapPot();
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const OUT = '#4a2c1a';
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 3;
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function circ(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
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
function line(ctx: C2, lw: number, col = OUT) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
function starPath(ctx: C2, x: number, y: number, r: number, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r;
    i ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.3, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.3, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
/** 둥근 덩어리 여럿을 한 몸처럼 (테두리 먼저 굵게, 그 위에 채우기) */
function blob(ctx: C2, pts: number[][], fill: string | CanvasGradient, lw: number) {
  ctx.fillStyle = OUT;
  for (const [x, y, r] of pts) (circ(ctx, x, y, r + lw), ctx.fill());
  ctx.fillStyle = fill;
  for (const [x, y, r] of pts) (circ(ctx, x, y, r), ctx.fill());
}
function say(ctx: C2, text: string, x: number, y: number, size: number, fill = '#ffffff', stroke = OUT, lw = 4) {
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** 얼굴: mood 0 보통 · 1 웃음(^^) · 2 놀람 · 3 잠 */
function face(ctx: C2, x: number, y: number, r: number, t: number, seed: number, mood: number, gap = 0.3, col = '#2a1a12') {
  const ex = r * gap, er = Math.max(1.2, r * 0.12), lw = Math.max(1.1, r * 0.06);
  const blink = mood === 0 && (t + seed * 53) % 200 < 7;
  for (const sd of [-1, 1]) {
    const cx = x + sd * ex;
    if (mood === 1 || mood === 3) {
      ctx.beginPath();
      if (mood === 1) ctx.arc(cx, y + er * 0.5, er, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(cx, y - er * 0.2, er, Math.PI * 0.15, Math.PI * 0.85);
      line(ctx, lw, col);
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(cx - er, y);
      ctx.lineTo(cx + er, y);
      line(ctx, lw, col);
    } else {
      const big = mood === 2 ? 1.35 : 1;
      ctx.fillStyle = col;
      ell(ctx, cx, y, er * 0.85 * big, er * big);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circ(ctx, cx - er * 0.28, y - er * 0.38, er * 0.36 * big);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,105,125,.42)';
    ell(ctx, cx + sd * er * 0.6, y + er * 1.55, er * 0.95, er * 0.55);
    ctx.fill();
  }
  if (mood === 2) {
    ctx.fillStyle = '#7a2a2a';
    ell(ctx, x, y + r * 0.27, r * 0.08, r * 0.1);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.1, r * 0.11, 0.18 * Math.PI, 0.82 * Math.PI);
    line(ctx, lw, col);
  }
}

// ── 재료 점 아이콘 (물 방울 · 불꽃 · 흙덩이 · 바람 소용돌이) ──
const DOT_COL = ['#3f9cf5', '#ff6a2a', '#a8703a', '#3fbfa4'];
function dotIcon(ctx: C2, k: number, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  const lw = Math.max(1, r * 0.22);
  ctx.beginPath();
  if (k === 0) {
    ctx.moveTo(0, -r * 1.1);
    ctx.bezierCurveTo(r * 0.9, -r * 0.1, r * 0.9, r, 0, r);
    ctx.bezierCurveTo(-r * 0.9, r, -r * 0.9, -r * 0.1, 0, -r * 1.1);
  } else if (k === 1) {
    ctx.moveTo(0, -r * 1.15);
    ctx.bezierCurveTo(r * 0.5, -r * 0.5, r * 1.0, -r * 0.1, r * 0.75, r * 0.5);
    ctx.bezierCurveTo(r * 0.5, r * 1.05, -r * 0.5, r * 1.05, -r * 0.75, r * 0.5);
    ctx.bezierCurveTo(-r * 0.95, 0, -r * 0.2, -r * 0.3, 0, -r * 1.15);
  } else if (k === 2) {
    ctx.ellipse(0, r * 0.25, r * 0.95, r * 0.7, 0, 0, TAU);
  } else ctx.arc(0, 0, r * 0.95, 0, TAU);
  ctx.fillStyle = DOT_COL[k];
  ctx.fill();
  line(ctx, lw, 'rgba(60,35,20,.85)');
  if (k === 0) {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ell(ctx, -r * 0.3, r * 0.15, r * 0.18, r * 0.3);
    ctx.fill();
  } else if (k === 1) {
    ctx.fillStyle = '#ffd84a';
    ell(ctx, 0, r * 0.45, r * 0.35, r * 0.45);
    ctx.fill();
  } else if (k === 2) {
    ctx.fillStyle = '#6cc04a';
    ell(ctx, r * 0.15, -r * 0.55, r * 0.45, r * 0.22, -0.5);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0.3, Math.PI * 1.7);
    ctx.arc(r * 0.1, 0, r * 0.22, Math.PI * 1.7, Math.PI * 0.3, true);
    line(ctx, Math.max(1, r * 0.22), '#ffffff');
  }
  ctx.restore();
}
/** 점 줄 (가운데 정렬) */
function dotRow(ctx: C2, d: number[], x: number, y: number, r: number, hide = false) {
  const ks: number[] = [];
  d.forEach((n, k) => {
    for (let i = 0; i < n; i++) ks.push(k);
  });
  const gap = r * 2.5, x0 = x - ((ks.length - 1) * gap) / 2;
  ks.forEach((k, i) => {
    if (hide) {
      ctx.fillStyle = 'rgba(74,44,26,.25)';
      circ(ctx, x0 + i * gap, y, r * 0.8);
      ctx.fill();
    } else dotIcon(ctx, k, x0 + i * gap, y, r);
  });
}

// ── 재료 병 (처음 재료) ──
function drawBottle(ctx: C2, id: string, x: number, y: number, r: number, t: number, cracked = false) {
  const it = BY_ID[id], k = ['water', 'fire', 'earth', 'wind'].indexOf(id), lw = Math.max(1.3, r * 0.07);
  const cy = y - r * 0.62, br = r * 0.62;
  // 그림자
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, x, y, r * 0.6, r * 0.12);
  ctx.fill();
  // 목·코르크
  ctx.fillStyle = 'rgba(230,248,255,.55)';
  rr(ctx, x - r * 0.2, y - r * 1.55, r * 0.4, r * 0.5, r * 0.08);
  ctx.fill();
  line(ctx, lw);
  ctx.fillStyle = lin(ctx, x, y - r * 1.75, x, y - r * 1.5, [0, '#e8b070'], [1, '#b8783c']);
  rr(ctx, x - r * 0.24, y - r * 1.76, r * 0.48, r * 0.26, r * 0.08);
  ctx.fill();
  line(ctx, lw);
  // 몸통 유리
  circ(ctx, x, cy, br);
  ctx.fillStyle = 'rgba(235,250,255,.5)';
  ctx.fill();
  // 내용물
  ctx.save();
  circ(ctx, x, cy, br - lw * 0.5);
  ctx.clip();
  const wav = Math.sin(t * 0.08 + k) * r * 0.05;
  const lv = cy - br * 0.15 + wav;
  ctx.fillStyle = lin(ctx, x, lv, x, cy + br, [0, it.col], [1, k === 2 ? '#6a4020' : k === 1 ? '#c8301a' : k === 0 ? '#1f6ad0' : '#2a9a88']);
  ctx.beginPath();
  ctx.moveTo(x - br, lv);
  for (let i = 0; i <= 8; i++) ctx.lineTo(x - br + (i / 8) * br * 2, lv + Math.sin(t * 0.1 + i) * r * 0.03);
  ctx.lineTo(x + br, cy + br);
  ctx.lineTo(x - br, cy + br);
  ctx.fill();
  if (k === 1) {
    // 불: 안에서 흔들리는 불꽃
    const fl = 1 + Math.sin(t * 0.3) * 0.08;
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.moveTo(x, cy - br * 0.75 * fl);
    ctx.quadraticCurveTo(x + br * 0.5, cy, x, cy + br * 0.35);
    ctx.quadraticCurveTo(x - br * 0.5, cy, x, cy - br * 0.75 * fl);
    ctx.fill();
  } else if (k === 3) {
    ctx.beginPath();
    ctx.arc(x, cy + br * 0.1, br * 0.42, t * 0.06, t * 0.06 + 4.5);
    line(ctx, lw * 1.2, 'rgba(255,255,255,.9)');
  } else if (k === 0) {
    for (let i = 0; i < 3; i++) {
      const by = cy + br * 0.6 - ((t * 0.5 + i * 13) % 30) * (br / 30);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      circ(ctx, x - br * 0.3 + i * br * 0.28, by, r * 0.05);
      ctx.fill();
    }
  }
  ctx.restore();
  circ(ctx, x, cy, br);
  line(ctx, lw);
  // 유리 반짝
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ell(ctx, x - br * 0.45, cy - br * 0.35, br * 0.13, br * 0.28, 0.5);
  ctx.fill();
  if (k === 2) {
    // 흙: 목 위로 새싹
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.76);
    ctx.quadraticCurveTo(x + r * 0.05, y - r * 2.0, x, y - r * 2.1);
    line(ctx, lw, '#3a8a2a');
    ctx.fillStyle = '#6cc04a';
    ell(ctx, x - r * 0.16, y - r * 2.05, r * 0.16, r * 0.08, 0.5);
    ctx.fill();
    ell(ctx, x + r * 0.16, y - r * 2.1, r * 0.16, r * 0.08, -0.5);
    ctx.fill();
  }
  if (k === 1) {
    ctx.fillStyle = `rgba(255,140,40,${0.15 + 0.08 * Math.sin(t * 0.2)})`;
    circ(ctx, x, cy, br * 1.5);
    ctx.fill();
  }
  if (cracked) {
    ctx.beginPath();
    ctx.moveTo(x + br * 0.2, cy - br * 0.9);
    ctx.lineTo(x + br * 0.05, cy - br * 0.45);
    ctx.lineTo(x + br * 0.35, cy - br * 0.2);
    ctx.lineTo(x + br * 0.15, cy + br * 0.2);
    line(ctx, Math.max(1, lw * 0.6), 'rgba(255,255,255,.95)');
  }
}

/** 생물·물건. (x, y) = 발 가운데, r = 크기 단위(대략 반폭). mood: 0 보통 1 기쁨 2 놀람 */
function drawThing(ctx: C2, id: string, x: number, y: number, r: number, t: number, mood = 0, seed = 0) {
  const it = BY_ID[id];
  if (it.base) return drawBottle(ctx, id, x, y, r, t);
  const lw = Math.max(1.3, r * 0.065);
  const br = Math.sin(t * 0.09 + seed) * 0.03;
  // 바닥 그림자
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, x, y, r * 0.75, r * 0.13);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + br, 1 - br);
  ctx.translate(-x, -y);
  switch (id) {
    case 'pup': {
      const by = y - r * 0.72;
      ctx.fillStyle = '#cfe2f7';
      for (const lx of [-0.45, -0.15, 0.2, 0.48]) {
        rr(ctx, x + lx * r - r * 0.1, y - r * 0.38, r * 0.2, r * 0.38, r * 0.09);
        ctx.fill();
        line(ctx, lw);
      }
      const W2 = lin(ctx, x, by - r * 0.6, x, by + r * 0.5, [0, '#ffffff'], [1, '#c4defa']);
      blob(ctx, [[x - r * 0.55, by + r * 0.05, r * 0.38], [x - r * 0.15, by - r * 0.22, r * 0.46], [x + r * 0.32, by - r * 0.12, r * 0.44], [x + r * 0.62, by + r * 0.12, r * 0.32], [x, by + r * 0.14, r * 0.5], [x - r * 0.9, by - r * 0.05, r * 0.2]], W2, lw);
      // 귀
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#a9cdf2';
        ell(ctx, x + sd * r * 0.5, by - r * 0.05, r * 0.15, r * 0.3, sd * 0.4);
        ctx.fill();
        line(ctx, lw);
      }
      face(ctx, x, by - r * 0.08, r * 0.95, t, seed + 1, mood);
      ctx.fillStyle = '#2a1a12';
      ell(ctx, x, by + r * 0.02, r * 0.08, r * 0.06);
      ctx.fill();
      if (mood !== 2) {
        ctx.fillStyle = '#ff7a8a';
        ell(ctx, x + r * 0.05, by + r * 0.2, r * 0.07, r * 0.1);
        ctx.fill();
      }
      // 김
      ctx.beginPath();
      const sx = x + r * 0.1, sy = by - r * 0.62;
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + r * 0.2, sy - r * 0.15, sx - r * 0.15, sy - r * 0.3, sx + r * 0.05 + Math.sin(t * 0.1) * r * 0.05, sy - r * 0.45);
      line(ctx, lw, 'rgba(255,255,255,.95)');
      break;
    }
    case 'frog': {
      const by = y - r * 0.48;
      ctx.fillStyle = '#6a9a34';
      for (const sd of [-1, 1]) {
        ell(ctx, x + sd * r * 0.55, y - r * 0.08, r * 0.28, r * 0.12);
        ctx.fill();
        line(ctx, lw);
      }
      const G = lin(ctx, x, by - r * 0.6, x, y, [0, '#a8d860'], [1, '#6aa03a']);
      blob(ctx, [[x, by, r * 0.62], [x - r * 0.35, by - r * 0.48, r * 0.24], [x + r * 0.35, by - r * 0.48, r * 0.24]], G, lw);
      ctx.fillStyle = '#e8f4c0';
      ell(ctx, x, by + r * 0.25, r * 0.38, r * 0.25);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,80,40,.55)';
      for (const [dx, dy, q] of [[-0.42, 0.0, 0.1], [0.4, -0.12, 0.08], [0.15, -0.3, 0.06]]) (ell(ctx, x + dx * r, by + dy * r, q * r * 1.4, q * r), ctx.fill());
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#ffffff';
        circ(ctx, x + sd * r * 0.35, by - r * 0.5, r * 0.16);
        ctx.fill();
      }
      face(ctx, x, by - r * 0.5, r * 1.15, t, seed + 2, mood, 0.31);
      ctx.beginPath();
      ctx.arc(x, by - r * 0.05, r * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
      line(ctx, lw);
      // 새싹
      ctx.beginPath();
      ctx.moveTo(x, by - r * 0.6);
      ctx.lineTo(x, by - r * 0.85);
      line(ctx, lw, '#3a7a2a');
      ctx.fillStyle = '#8ad85a';
      ell(ctx, x + r * 0.12, by - r * 0.88, r * 0.14, r * 0.07, -0.4);
      ctx.fill();
      line(ctx, lw * 0.7, '#3a7a2a');
      break;
    }
    case 'fish': {
      const fy = y - r * 0.8 + Math.sin(t * 0.08 + seed) * r * 0.08;
      ctx.fillStyle = 'rgba(200,240,255,.35)';
      circ(ctx, x, fy, r * 0.82);
      ctx.fill();
      line(ctx, lw * 0.8, 'rgba(80,160,220,.8)');
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ell(ctx, x - r * 0.45, fy - r * 0.45, r * 0.12, r * 0.22, 0.7);
      ctx.fill();
      const wag = Math.sin(t * 0.25 + seed) * 0.25;
      ctx.save();
      ctx.translate(x + r * 0.42, fy);
      ctx.rotate(wag);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.32, -r * 0.25);
      ctx.lineTo(r * 0.28, r * 0.25);
      ctx.closePath();
      ctx.fillStyle = '#ff9a3a';
      ctx.fill();
      line(ctx, lw);
      ctx.restore();
      ell(ctx, x - r * 0.05, fy, r * 0.48, r * 0.38);
      ctx.fillStyle = lin(ctx, x, fy - r * 0.4, x, fy + r * 0.4, [0, '#7ad8ff'], [1, '#2a9ad8']);
      ctx.fill();
      line(ctx, lw);
      ctx.fillStyle = '#ffd84a';
      ell(ctx, x - r * 0.02, fy - r * 0.38, r * 0.16, r * 0.08, -0.2);
      ctx.fill();
      line(ctx, lw * 0.8);
      face(ctx, x - r * 0.2, fy - r * 0.02, r * 0.75, t, seed + 3, mood, 0.28);
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.6 + i * 20 + seed * 7) % 60;
        ctx.globalAlpha = 1 - q / 60;
        circ(ctx, x + r * 0.1 + Math.sin(q * 0.2 + i) * r * 0.1, fy - r * 0.9 - q * r * 0.012, r * (0.05 + i * 0.02));
        line(ctx, lw * 0.6, '#5ab8f0');
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'turtle': {
      const by = y - r * 0.3;
      ctx.fillStyle = '#e8a878';
      for (const sd of [-1, 1]) {
        ell(ctx, x + sd * r * 0.5, y - r * 0.12, r * 0.16, r * 0.12);
        ctx.fill();
        line(ctx, lw);
      }
      // 머리
      const hx = x + r * 0.62, hy = by - r * 0.32 + Math.sin(t * 0.07 + seed) * r * 0.03;
      circ(ctx, hx, hy, r * 0.3);
      ctx.fillStyle = '#f0b888';
      ctx.fill();
      line(ctx, lw);
      face(ctx, hx + r * 0.04, hy - r * 0.02, r * 0.75, t, seed + 4, mood, 0.3);
      // 등딱지
      ctx.beginPath();
      ctx.moveTo(x - r * 0.72, by);
      ctx.bezierCurveTo(x - r * 0.7, by - r * 0.95, x + r * 0.62, by - r * 0.95, x + r * 0.62, by);
      ctx.closePath();
      ctx.fillStyle = lin(ctx, x, by - r * 0.8, x, by, [0, '#8a3a2a'], [1, '#4a1e18']);
      ctx.fill();
      line(ctx, lw);
      const glow = 0.7 + 0.3 * Math.sin(t * 0.12 + seed);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.45, by - r * 0.15);
      ctx.lineTo(x - r * 0.2, by - r * 0.45);
      ctx.lineTo(x + r * 0.1, by - r * 0.3);
      ctx.lineTo(x + r * 0.35, by - r * 0.55);
      ctx.moveTo(x - r * 0.2, by - r * 0.45);
      ctx.lineTo(x - r * 0.1, by - r * 0.68);
      ctx.moveTo(x + r * 0.1, by - r * 0.3);
      ctx.lineTo(x + r * 0.2, by - r * 0.05);
      line(ctx, lw * 1.4, `rgba(255,${150 + 60 * glow},40,${glow})`);
      ctx.fillStyle = '#c86a3a';
      rr(ctx, x - r * 0.75, by - r * 0.06, r * 1.4, r * 0.12, r * 0.06);
      ctx.fill();
      line(ctx, lw);
      // 김
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 2; i++) {
        const q = (t * 0.4 + i * 25) % 50;
        ctx.globalAlpha = 1 - q / 50;
        circ(ctx, x - r * 0.2 + i * r * 0.4, by - r * 0.8 - q * r * 0.012, r * (0.08 + q * 0.002));
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'moth': {
      const by = y - r * 0.85 + Math.sin(t * 0.1 + seed) * r * 0.08;
      const fl = 0.75 + 0.25 * Math.abs(Math.sin(t * 0.18 + seed));
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(x, by);
        ctx.scale(sd * fl, 1);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.05);
        ctx.bezierCurveTo(r * 0.5, -r * 0.85, r * 1.05, -r * 0.55, r * 0.8, -r * 0.08);
        ctx.bezierCurveTo(r * 0.95, r * 0.3, r * 0.55, r * 0.6, 0, r * 0.12);
        ctx.closePath();
        ctx.fillStyle = lin(ctx, 0, -r * 0.6, r, r * 0.4, [0, '#ffe25a'], [0.55, '#ff9a2a'], [1, '#ff4a2a']);
        ctx.fill();
        line(ctx, lw);
        ctx.fillStyle = 'rgba(255,255,220,.8)';
        circ(ctx, r * 0.5, -r * 0.3, r * 0.12);
        ctx.fill();
        ctx.restore();
      }
      ell(ctx, x, by, r * 0.16, r * 0.38);
      ctx.fillStyle = '#8a4a2a';
      ctx.fill();
      line(ctx, lw);
      circ(ctx, x, by - r * 0.42, r * 0.22);
      ctx.fillStyle = '#ffb04a';
      ctx.fill();
      line(ctx, lw);
      face(ctx, x, by - r * 0.42, r * 0.55, t, seed + 5, mood, 0.32);
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sd * r * 0.08, by - r * 0.6);
        ctx.quadraticCurveTo(x + sd * r * 0.2, by - r * 0.85, x + sd * r * 0.3, by - r * 0.9);
        line(ctx, lw * 0.8);
        ctx.fillStyle = '#ff6a2a';
        circ(ctx, x + sd * r * 0.3, by - r * 0.92, r * 0.07);
        ctx.fill();
      }
      break;
    }
    case 'fairy': {
      const by = y - r * 0.35;
      ctx.fillStyle = '#7ac85a';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.3, y - r * 0.05);
      ctx.quadraticCurveTo(x, y - r * 0.75, x + r * 0.3, y - r * 0.05);
      ctx.closePath();
      ctx.fill();
      line(ctx, lw);
      for (const sd of [-1, 1]) {
        ctx.fillStyle = 'rgba(160,230,140,.85)';
        ell(ctx, x + sd * r * 0.35, by - r * 0.15, r * 0.28, r * 0.12, sd * (-0.5 + Math.sin(t * 0.2) * 0.2));
        ctx.fill();
        line(ctx, lw * 0.8);
      }
      // 민들레 머리
      const hy = by - r * 0.62;
      ctx.strokeStyle = 'rgba(200,190,150,.9)';
      ctx.lineWidth = Math.max(1, r * 0.03);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU + t * 0.004;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.2, hy + Math.sin(a) * r * 0.2);
        ctx.lineTo(x + Math.cos(a) * r * 0.55, hy + Math.sin(a) * r * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU + t * 0.004;
        circ(ctx, x + Math.cos(a) * r * 0.56, hy + Math.sin(a) * r * 0.56, r * 0.07);
        ctx.fill();
      }
      circ(ctx, x, hy, r * 0.33);
      ctx.fillStyle = '#fff6d8';
      ctx.fill();
      line(ctx, lw);
      face(ctx, x, hy, r * 0.8, t, seed + 6, mood, 0.28);
      // 날리는 씨앗
      for (let i = 0; i < 2; i++) {
        const q = (t * 0.5 + i * 37 + seed * 11) % 74;
        ctx.globalAlpha = 1 - q / 74;
        const sx = x + r * 0.5 + q * r * 0.012, sy = hy - r * 0.3 - q * r * 0.008;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + r * 0.12);
        line(ctx, 1, '#c8b890');
        ctx.fillStyle = '#ffffff';
        circ(ctx, sx, sy, r * 0.06);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'jelly': {
      const by = y - r * 0.85 + Math.sin(t * 0.07 + seed) * r * 0.06;
      for (let i = 0; i < 4; i++) {
        const tx = x - r * 0.36 + i * r * 0.24;
        ctx.beginPath();
        ctx.moveTo(tx, by + r * 0.1);
        for (let j = 1; j <= 4; j++) ctx.lineTo(tx + Math.sin(t * 0.12 + i + j) * r * 0.07, by + r * 0.1 + j * r * 0.16);
        line(ctx, lw * 1.2, '#7ab8f0');
      }
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, by + r * 0.12);
      ctx.bezierCurveTo(x - r * 0.65, by - r * 0.7, x + r * 0.65, by - r * 0.7, x + r * 0.6, by + r * 0.12);
      ctx.quadraticCurveTo(x, by + r * 0.25, x - r * 0.6, by + r * 0.12);
      ctx.fillStyle = lin(ctx, x, by - r * 0.6, x, by + r * 0.2, [0, 'rgba(210,240,255,.95)'], [1, 'rgba(120,190,250,.9)']);
      ctx.fill();
      line(ctx, lw);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ell(ctx, x - r * 0.3, by - r * 0.35, r * 0.1, r * 0.18, 0.5);
      ctx.fill();
      face(ctx, x, by - r * 0.12, r * 0.8, t, seed + 7, mood);
      break;
    }
    case 'mole': {
      const by = y - r * 0.5;
      const M = lin(ctx, x, by - r * 0.5, x, y, [0, '#b08a68'], [1, '#7a5a3e']);
      blob(ctx, [[x, by, r * 0.55], [x, by + r * 0.2, r * 0.5]], M, lw);
      ctx.fillStyle = '#e8d0b8';
      ell(ctx, x, by + r * 0.28, r * 0.3, r * 0.2);
      ctx.fill();
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#f0b0b0';
        ell(ctx, x + sd * r * 0.5, by + r * 0.35, r * 0.15, r * 0.1, sd * 0.4);
        ctx.fill();
        line(ctx, lw * 0.8);
      }
      face(ctx, x, by - r * 0.05, r * 0.85, t, seed + 8, mood === 0 ? 3 : mood);
      ctx.fillStyle = '#ff8a9a';
      ell(ctx, x, by + r * 0.06, r * 0.1, r * 0.07);
      ctx.fill();
      line(ctx, lw * 0.7);
      // 머리 위 돌
      ctx.fillStyle = '#a8a0a0';
      ell(ctx, x + r * 0.08, by - r * 0.55, r * 0.22, r * 0.14, 0.2);
      ctx.fill();
      line(ctx, lw);
      break;
    }
    case 'rainbow': {
      const by = y - r * 0.2;
      const cols = ['#ff5a6e', '#ffa63a', '#ffe04a', '#6cd06a', '#4aa8f0', '#8a6ae8'];
      const R0 = r * 0.95, bw = r * 0.11;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(x, by, R0 + bw * 0.5, Math.PI, 0);
      ctx.lineWidth = bw * cols.length + lw * 2;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      cols.forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(x, by, R0 - i * bw, Math.PI, 0);
        ctx.lineWidth = bw + 0.5;
        ctx.strokeStyle = c;
        ctx.stroke();
      });
      for (const sd of [-1, 1]) blob(ctx, [[x + sd * r * 0.68, by, r * 0.2], [x + sd * r * 0.9, by - r * 0.05, r * 0.22], [x + sd * r * 1.08, by + r * 0.02, r * 0.16]], '#ffffff', lw);
      face(ctx, x, by - R0 + r * 0.22, r * 0.7, t, seed + 9, mood === 0 ? 1 : mood);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 3; i++) {
        const a = Math.PI + 0.6 + i * 0.9 + Math.sin(t * 0.05 + i) * 0.05;
        starPath(ctx, x + Math.cos(a) * (R0 + r * 0.3), by + Math.sin(a) * (R0 + r * 0.3), r * (0.07 + 0.03 * Math.sin(t * 0.2 + i)));
        ctx.fill();
      }
      break;
    }
    case 'duck': {
      const by = y - r * 0.35;
      // 나무 통
      ctx.fillStyle = lin(ctx, x - r * 0.7, 0, x + r * 0.7, 0, [0, '#a86a3a'], [0.5, '#d89a5a'], [1, '#a86a3a']);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.72, by - r * 0.15);
      ctx.lineTo(x + r * 0.72, by - r * 0.15);
      ctx.lineTo(x + r * 0.6, y - r * 0.02);
      ctx.lineTo(x - r * 0.6, y - r * 0.02);
      ctx.closePath();
      ctx.fill();
      line(ctx, lw);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.68, by + r * 0.08);
      ctx.lineTo(x + r * 0.68, by + r * 0.08);
      line(ctx, lw, '#6a4020');
      // 오리
      const dy = by - r * 0.35 + Math.sin(t * 0.08 + seed) * r * 0.03;
      ell(ctx, x - r * 0.05, dy + r * 0.1, r * 0.45, r * 0.28);
      ctx.fillStyle = '#ffd84a';
      ctx.fill();
      line(ctx, lw);
      circ(ctx, x + r * 0.2, dy - r * 0.3, r * 0.27);
      ctx.fill();
      line(ctx, lw);
      ctx.fillStyle = '#ff8a2a';
      ell(ctx, x + r * 0.48, dy - r * 0.24, r * 0.15, r * 0.07);
      ctx.fill();
      line(ctx, lw * 0.8);
      face(ctx, x + r * 0.2, dy - r * 0.34, r * 0.6, t, seed + 10, mood, 0.3);
      // 수건
      ctx.fillStyle = '#ffffff';
      rr(ctx, x + r * 0.02, dy - r * 0.62, r * 0.36, r * 0.12, r * 0.04);
      ctx.fill();
      line(ctx, lw * 0.8);
      // 물 + 김
      ctx.fillStyle = 'rgba(120,200,255,.85)';
      ell(ctx, x, by - r * 0.15, r * 0.7, r * 0.1);
      ctx.fill();
      line(ctx, lw * 0.8);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.4 + i * 17) % 50;
        ctx.globalAlpha = 1 - q / 50;
        circ(ctx, x - r * 0.45 + i * r * 0.45, by - r * 0.3 - q * r * 0.015, r * (0.07 + q * 0.002));
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'deer': {
      const by = y - r * 0.55;
      ctx.fillStyle = '#c87a40';
      for (const lx of [-0.35, -0.15, 0.2, 0.38]) {
        rr(ctx, x + lx * r - r * 0.06, by + r * 0.1, r * 0.12, r * 0.45, r * 0.05);
        ctx.fill();
        line(ctx, lw * 0.8);
      }
      ell(ctx, x, by, r * 0.5, r * 0.28);
      ctx.fillStyle = '#e8a060';
      ctx.fill();
      line(ctx, lw);
      ctx.fillStyle = '#fff6e0';
      for (const [dx, dy] of [[-0.25, -0.08], [-0.05, -0.12], [0.15, -0.05], [-0.15, 0.06]]) (circ(ctx, x + dx * r, by + dy * r, r * 0.05), ctx.fill());
      const hx = x + r * 0.42, hy = by - r * 0.42;
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#e8a060';
        ell(ctx, hx + sd * r * 0.26, hy - r * 0.08, r * 0.15, r * 0.07, sd * 0.4);
        ctx.fill();
        line(ctx, lw * 0.8);
      }
      circ(ctx, hx, hy, r * 0.27);
      ctx.fillStyle = '#eeaa68';
      ctx.fill();
      line(ctx, lw);
      face(ctx, hx, hy, r * 0.62, t, seed + 11, mood, 0.32);
      // 꽃 관
      const fc = ['#ff7aa8', '#ffe04a', '#ffffff', '#ff7aa8'];
      fc.forEach((c, i) => {
        const fx2 = hx - r * 0.24 + i * r * 0.16, fy2 = hy - r * 0.27 - Math.sin((i / 3) * Math.PI) * r * 0.06;
        ctx.fillStyle = c;
        circ(ctx, fx2, fy2, r * 0.08);
        ctx.fill();
        line(ctx, lw * 0.6);
      });
      ctx.fillStyle = '#ffffff';
      ell(ctx, x - r * 0.5, by - r * 0.08, r * 0.08, r * 0.1);
      ctx.fill();
      break;
    }
    case 'dragon': {
      const by = y - r * 0.55;
      // 꼬리
      ctx.beginPath();
      ctx.moveTo(x - r * 0.3, by + r * 0.3);
      ctx.quadraticCurveTo(x - r * 0.95, by + r * 0.4, x - r * 0.85, by - r * 0.05);
      line(ctx, r * 0.18 + lw * 2);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.3, by + r * 0.3);
      ctx.quadraticCurveTo(x - r * 0.95, by + r * 0.4, x - r * 0.85, by - r * 0.05);
      line(ctx, r * 0.18, '#5ab060');
      // 날개
      const fl = Math.sin(t * 0.15 + seed) * 0.25;
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(x + sd * r * 0.3, by - r * 0.2);
        ctx.rotate(sd * (-0.3 + fl));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sd * r * 0.5, -r * 0.45);
        ctx.lineTo(sd * r * 0.45, -r * 0.05);
        ctx.closePath();
        ctx.fillStyle = '#ff9a4a';
        ctx.fill();
        line(ctx, lw);
        ctx.restore();
      }
      const D = lin(ctx, x, by - r * 0.6, x, y, [0, '#8ad880'], [1, '#4aa050']);
      blob(ctx, [[x, by + r * 0.12, r * 0.42], [x + r * 0.05, by - r * 0.3, r * 0.36]], D, lw);
      ctx.fillStyle = '#fff2c0';
      ell(ctx, x, by + r * 0.18, r * 0.24, r * 0.28);
      ctx.fill();
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#fff2c0';
        ctx.beginPath();
        ctx.moveTo(x + sd * r * 0.12, by - r * 0.6);
        ctx.lineTo(x + sd * r * 0.2, by - r * 0.85);
        ctx.lineTo(x + sd * r * 0.3, by - r * 0.55);
        ctx.closePath();
        ctx.fill();
        line(ctx, lw * 0.8);
      }
      face(ctx, x + r * 0.05, by - r * 0.32, r * 0.8, t, seed + 12, mood);
      if ((t + seed * 30) % 160 < 40) {
        const q = ((t + seed * 30) % 160) / 40;
        ctx.globalAlpha = 1 - q;
        ctx.fillStyle = '#ffb030';
        circ(ctx, x + r * 0.45 + q * r * 0.4, by - r * 0.15, r * (0.08 + q * 0.12));
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#4aa050';
        ell(ctx, x + sd * r * 0.25, y - r * 0.07, r * 0.15, r * 0.1);
        ctx.fill();
        line(ctx, lw);
      }
      break;
    }
    case 'sheep': {
      const by = y - r * 0.62;
      ctx.fillStyle = '#4a4a60';
      for (const lx of [-0.3, -0.1, 0.12, 0.32]) {
        rr(ctx, x + lx * r - r * 0.06, by + r * 0.15, r * 0.12, r * 0.42, r * 0.05);
        ctx.fill();
      }
      const SH = lin(ctx, x, by - r * 0.5, x, by + r * 0.4, [0, '#e8eef8'], [1, '#9aaac8']);
      blob(ctx, [[x - r * 0.4, by, r * 0.3], [x - r * 0.1, by - r * 0.22, r * 0.34], [x + r * 0.28, by - r * 0.1, r * 0.32], [x + r * 0.05, by + r * 0.12, r * 0.38]], SH, lw);
      ell(ctx, x + r * 0.42, by + r * 0.02, r * 0.22, r * 0.26);
      ctx.fillStyle = '#5a5a72';
      ctx.fill();
      line(ctx, lw);
      face(ctx, x + r * 0.42, by - r * 0.02, r * 0.55, t, seed + 13, mood, 0.32, '#ffffff');
      // 빗방울
      ctx.fillStyle = '#5aa8f0';
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.8 + i * 13 + seed * 5) % 40;
        ctx.globalAlpha = 1 - q / 40;
        ell(ctx, x - r * 0.35 + i * r * 0.28, by + r * 0.35 + q * r * 0.012, r * 0.035, r * 0.06);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'cat': {
      const by = y - r * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.35, y - r * 0.15);
      ctx.quadraticCurveTo(x - r * 0.95, y - r * 0.2, x - r * 0.7, by - r * 0.4 + Math.sin(t * 0.08) * r * 0.05);
      line(ctx, r * 0.14 + lw * 2);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.35, y - r * 0.15);
      ctx.quadraticCurveTo(x - r * 0.95, y - r * 0.2, x - r * 0.7, by - r * 0.4 + Math.sin(t * 0.08) * r * 0.05);
      line(ctx, r * 0.14, '#4a4ab8');
      const C2c = lin(ctx, x, by - r * 0.7, x, y, [0, '#6a6ae0'], [1, '#3a3a98']);
      blob(ctx, [[x, by + r * 0.15, r * 0.42], [x, by - r * 0.38, r * 0.36]], C2c, lw);
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sd * r * 0.12, by - r * 0.66);
        ctx.lineTo(x + sd * r * 0.32, by - r * 0.86);
        ctx.lineTo(x + sd * r * 0.34, by - r * 0.5);
        ctx.closePath();
        ctx.fillStyle = '#5a5ad0';
        ctx.fill();
        line(ctx, lw);
      }
      face(ctx, x, by - r * 0.35, r * 0.85, t, seed + 14, mood, 0.3, '#ffe04a');
      const tw = 0.7 + 0.3 * Math.sin(t * 0.15 + seed);
      ctx.fillStyle = `rgba(255,230,90,${tw})`;
      starPath(ctx, x, by - r * 0.62, r * 0.1);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const a = t * 0.02 + i * 1.57;
        starPath(ctx, x + Math.cos(a) * r * 0.75, by - r * 0.1 + Math.sin(a) * r * 0.45, r * (0.04 + 0.02 * Math.sin(t * 0.2 + i)));
        ctx.fill();
      }
      break;
    }
    case 'whale':
    case 'starwhale': {
      const star = id === 'starwhale', by = y - r * 0.42 + Math.sin(t * 0.06 + seed) * r * 0.04;
      // 물줄기 (무지개 / 별가루)
      const sx = x + r * 0.1, sy = by - r * 0.42;
      if (star) {
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.35, q = 0.4 + 0.2 * Math.sin(t * 0.15 + i);
          ctx.fillStyle = i % 2 ? '#ffe04a' : '#ffffff';
          starPath(ctx, sx + Math.cos(a) * r * q, sy + Math.sin(a) * r * q, r * 0.08);
          ctx.fill();
        }
      } else
        ['#ff5a6e', '#ffe04a', '#4aa8f0'].forEach((c, i) => {
          ctx.beginPath();
          ctx.arc(sx, sy, r * (0.22 + i * 0.07), Math.PI * 1.1, Math.PI * 1.9);
          line(ctx, r * 0.06, c);
        });
      const tail = Math.sin(t * 0.1 + seed) * 0.2;
      ctx.save();
      ctx.translate(x - r * 0.65, by - r * 0.05);
      ctx.rotate(tail);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-r * 0.32, -r * 0.3);
      ctx.quadraticCurveTo(-r * 0.2, 0, -r * 0.34, r * 0.18);
      ctx.closePath();
      ctx.fillStyle = star ? '#5a48c8' : '#3a7ad8';
      ctx.fill();
      line(ctx, lw);
      ctx.restore();
      ell(ctx, x, by, r * 0.72, r * 0.42);
      ctx.fillStyle = star ? lin(ctx, x, by - r * 0.4, x, by + r * 0.4, [0, '#8a78f0'], [1, '#4a38b8']) : lin(ctx, x, by - r * 0.4, x, by + r * 0.4, [0, '#6ab0ff'], [1, '#2a6ad0']);
      ctx.fill();
      line(ctx, lw);
      ctx.save();
      ell(ctx, x, by, r * 0.72, r * 0.42);
      ctx.clip();
      ctx.fillStyle = star ? '#d8d0ff' : '#e0f2ff';
      ell(ctx, x + r * 0.1, by + r * 0.4, r * 0.62, r * 0.25);
      ctx.fill();
      ctx.restore();
      if (star) {
        ctx.fillStyle = '#ffe04a';
        for (const [dx, dy] of [[-0.35, -0.12], [-0.1, -0.25], [0.15, -0.1]]) (starPath(ctx, x + dx * r, by + dy * r, r * 0.06), ctx.fill());
      }
      face(ctx, x + r * 0.35, by - r * 0.02, r * 0.75, t, seed + 15, mood, 0.25);
      ctx.fillStyle = star ? '#4a38b8' : '#2a6ad0';
      ell(ctx, x + r * 0.05, by + r * 0.18, r * 0.16, r * 0.07, 0.4);
      ctx.fill();
      break;
    }
    case 'unicorn': {
      const by = y - r * 0.55;
      ctx.fillStyle = '#f4f0ff';
      for (const lx of [-0.35, -0.15, 0.18, 0.36]) {
        rr(ctx, x + lx * r - r * 0.07, by + r * 0.1, r * 0.14, r * 0.45, r * 0.06);
        ctx.fill();
        line(ctx, lw * 0.8);
      }
      const mane = ['#ff5a6e', '#ffa63a', '#ffe04a', '#6cd06a', '#4aa8f0'];
      mane.forEach((c, i) => {
        ctx.beginPath();
        ctx.moveTo(x - r * 0.45, by - r * 0.1 + i * r * 0.05);
        ctx.quadraticCurveTo(x - r * 0.85, by + r * 0.05 + i * r * 0.06, x - r * 0.75 + Math.sin(t * 0.12 + i) * r * 0.04, by + r * 0.35 + i * r * 0.04);
        line(ctx, r * 0.07, c);
      });
      ell(ctx, x, by, r * 0.5, r * 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      line(ctx, lw);
      const hx = x + r * 0.4, hy = by - r * 0.42;
      mane.forEach((c, i) => {
        ctx.fillStyle = c;
        circ(ctx, hx - r * 0.2 - i * r * 0.05, hy - r * 0.15 + i * r * 0.11, r * 0.1);
        ctx.fill();
      });
      ell(ctx, hx, hy, r * 0.28, r * 0.25);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      line(ctx, lw);
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.06, hy - r * 0.22);
      ctx.lineTo(hx + r * 0.08, hy - r * 0.62);
      ctx.lineTo(hx + r * 0.1, hy - r * 0.2);
      ctx.closePath();
      ctx.fillStyle = lin(ctx, hx, hy - r * 0.6, hx, hy - r * 0.2, [0, '#fff6a0'], [1, '#ffb030']);
      ctx.fill();
      line(ctx, lw * 0.8);
      face(ctx, hx + r * 0.03, hy, r * 0.62, t, seed + 16, mood, 0.32);
      break;
    }
  }
  ctx.restore();
}
/** 실루엣(그림자 쪽지)용 — 화면 밖 캔버스에 그려 한 색으로 */
let silCanvas: HTMLCanvasElement | null = null;
function drawSil(ctx: C2, id: string, x: number, y: number, r: number, t: number, col: string) {
  const size = Math.ceil(r * 3.2);
  if (!silCanvas) silCanvas = document.createElement('canvas');
  const dpr = 2;
  silCanvas.width = size * dpr;
  silCanvas.height = size * dpr;
  const c = silCanvas.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, size, size);
  drawThing(c, id, size / 2, size * 0.86, r, t);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = col;
  c.fillRect(0, 0, size, size);
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(silCanvas, x - size / 2, y - size * 0.86, size, size);
}

// ── 꼬마 마녀 ──
type Mood = 'idle' | 'focus' | 'wow' | 'happy' | 'soot' | 'sad';
function drawWitch(ctx: C2, x: number, y: number, H: number, t: number, mood: Mood, stir: number, hatT: number, potX: number, potY: number) {
  const k = H / 100, lw = Math.max(1.4, k * 1.5);
  const hop = mood === 'happy' ? Math.abs(Math.sin(t * 0.15)) * 4 * k : mood === 'wow' ? 3 * k : 0;
  y -= hop;
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ell(ctx, x, y + hop, 24 * k, 4.5 * k);
  ctx.fill();
  // 다리(줄무늬 양말) · 장화
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    rr(ctx, x + sd * 8 * k - 3 * k, y - 16 * k, 6 * k, 13 * k, 2 * k);
    ctx.fill();
    ctx.fillStyle = '#ff6a7a';
    for (let i = 0; i < 3; i++) (rr(ctx, x + sd * 8 * k - 3 * k, y - 15 * k + i * 4.2 * k, 6 * k, 2 * k, 1), ctx.fill());
    rr(ctx, x + sd * 8 * k - 3 * k, y - 16 * k, 6 * k, 13 * k, 2 * k);
    line(ctx, lw);
    ell(ctx, x + sd * 9.5 * k, y - 3 * k, 7 * k, 4 * k);
    ctx.fillStyle = '#4a3070';
    ctx.fill();
    line(ctx, lw);
  }
  // 드레스
  ctx.beginPath();
  ctx.moveTo(x - 13 * k, y - 46 * k);
  ctx.quadraticCurveTo(x - 22 * k, y - 26 * k, x - 24 * k, y - 15 * k);
  for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(x - 24 * k + (i + 0.5) * 8 * k, y - 11 * k, x - 24 * k + (i + 1) * 8 * k, y - 15 * k);
  ctx.quadraticCurveTo(x + 22 * k, y - 26 * k, x + 13 * k, y - 46 * k);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x, y - 46 * k, x, y - 12 * k, [0, '#8a6af0'], [1, '#5a3fc0']);
  ctx.fill();
  line(ctx, lw);
  ctx.fillStyle = '#ffe04a';
  starPath(ctx, x - 8 * k, y - 24 * k, 4 * k);
  ctx.fill();
  line(ctx, lw * 0.6);
  // 앞치마
  ctx.fillStyle = '#fff6e8';
  rr(ctx, x - 8 * k, y - 40 * k, 16 * k, 22 * k, 4 * k);
  ctx.fill();
  line(ctx, lw * 0.8);
  if (mood === 'soot') {
    ctx.fillStyle = 'rgba(40,40,40,.35)';
    ell(ctx, x + 3 * k, y - 30 * k, 6 * k, 4 * k);
    ctx.fill();
  }
  // 국자 (솥 안으로)
  const sa = stir;
  const tipX = potX - 0.035 * (H / 0.35) + Math.cos(sa) * 9 * k, tipY = potY + Math.sin(sa) * 2.5 * k;
  const handX = x + 20 * k, handY = y - 36 * k;
  ctx.beginPath();
  ctx.moveTo(handX - 4 * k, handY - 6 * k);
  ctx.lineTo(tipX, tipY);
  line(ctx, 4.2 * k + lw * 2);
  ctx.beginPath();
  ctx.moveTo(handX - 4 * k, handY - 6 * k);
  ctx.lineTo(tipX, tipY);
  line(ctx, 4.2 * k, '#c88a4a');
  // 팔
  ctx.beginPath();
  ctx.moveTo(x + 10 * k, y - 42 * k);
  ctx.quadraticCurveTo(x + 18 * k, y - 34 * k, handX, handY);
  line(ctx, 6 * k + lw * 2);
  ctx.beginPath();
  ctx.moveTo(x + 10 * k, y - 42 * k);
  ctx.quadraticCurveTo(x + 18 * k, y - 34 * k, handX, handY);
  line(ctx, 6 * k, '#7a5ae0');
  circ(ctx, handX, handY, 3.6 * k);
  ctx.fillStyle = '#ffe2c8';
  ctx.fill();
  line(ctx, lw);
  // 왼팔 (기쁘면 번쩍)
  ctx.beginPath();
  const up = mood === 'happy' || mood === 'wow';
  ctx.moveTo(x - 10 * k, y - 42 * k);
  ctx.quadraticCurveTo(x - 20 * k, up ? y - 52 * k : y - 34 * k, x - 20 * k, up ? y - 62 * k : y - 26 * k);
  line(ctx, 6 * k + lw * 2);
  ctx.beginPath();
  ctx.moveTo(x - 10 * k, y - 42 * k);
  ctx.quadraticCurveTo(x - 20 * k, up ? y - 52 * k : y - 34 * k, x - 20 * k, up ? y - 62 * k : y - 26 * k);
  line(ctx, 6 * k, '#7a5ae0');
  circ(ctx, x - 20 * k, up ? y - 63 * k : y - 25 * k, 3.6 * k);
  ctx.fillStyle = '#ffe2c8';
  ctx.fill();
  line(ctx, lw);
  // 땋은 머리
  const hx = x, hy = y - 58 * k;
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      circ(ctx, hx + sd * (13 + i * 1.5) * k, hy + (4 + i * 6) * k, (4.2 - i * 0.5) * k);
      ctx.fillStyle = mood === 'soot' ? '#7a5040' : '#ff8a3a';
      ctx.fill();
      line(ctx, lw * 0.8);
    }
    ctx.fillStyle = '#ff5a8a';
    ell(ctx, hx + sd * 17.5 * k, hy + 21 * k, 3 * k, 2 * k, sd * 0.5);
    ctx.fill();
  }
  // 얼굴
  circ(ctx, hx, hy, 14 * k);
  ctx.fillStyle = '#ffe2c8';
  ctx.fill();
  line(ctx, lw);
  // 앞머리
  ctx.beginPath();
  ctx.moveTo(hx - 14 * k, hy - 2 * k);
  ctx.quadraticCurveTo(hx - 12 * k, hy - 14 * k, hx, hy - 14.5 * k);
  ctx.quadraticCurveTo(hx + 12 * k, hy - 14 * k, hx + 14 * k, hy - 2 * k);
  ctx.quadraticCurveTo(hx + 8 * k, hy - 8 * k, hx + 4 * k, hy - 5 * k);
  ctx.quadraticCurveTo(hx, hy - 9 * k, hx - 4 * k, hy - 5 * k);
  ctx.quadraticCurveTo(hx - 8 * k, hy - 8 * k, hx - 14 * k, hy - 2 * k);
  ctx.fillStyle = mood === 'soot' ? '#7a5040' : '#ff8a3a';
  ctx.fill();
  line(ctx, lw * 0.8);
  // 표정
  const ex = 5.2 * k, ey = hy + 1 * k, lookX = mood === 'focus' ? 1.6 * k : 0;
  const eyeW = Math.max(1.2, 1.3 * k);
  if (mood === 'happy') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + sd * ex, ey + 1.5 * k, 2.6 * k, Math.PI * 1.15, Math.PI * 1.85);
      line(ctx, eyeW, '#2a1a12');
    }
  } else if (mood === 'soot') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + sd * ex - 2 * k, ey - 2 * k);
      ctx.lineTo(hx + sd * ex + 2 * k, ey + 2 * k);
      ctx.moveTo(hx + sd * ex + 2 * k, ey - 2 * k);
      ctx.lineTo(hx + sd * ex - 2 * k, ey + 2 * k);
      line(ctx, eyeW, '#2a1a12');
    }
  } else {
    const big = mood === 'wow' ? 1.4 : 1, blink = mood === 'idle' && t % 180 < 7;
    for (const sd of [-1, 1]) {
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(hx + sd * ex - 2.4 * k, ey);
        ctx.lineTo(hx + sd * ex + 2.4 * k, ey);
        line(ctx, eyeW, '#2a1a12');
        continue;
      }
      ctx.fillStyle = '#2a1a12';
      ell(ctx, hx + sd * ex + lookX, ey + (mood === 'sad' ? 1 * k : 0), 2.2 * k * big, 2.9 * k * big);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circ(ctx, hx + sd * ex + lookX - 0.7 * k, ey - 1.1 * k, 1 * k * big);
      ctx.fill();
    }
    if (mood === 'sad')
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + sd * ex - 3 * k, ey - 4 * k + sd * 1.2 * k);
        ctx.lineTo(hx + sd * ex + 3 * k, ey - 4 * k - sd * 1.2 * k);
        line(ctx, eyeW * 0.8, '#7a4a2a');
      }
  }
  ctx.fillStyle = 'rgba(255,105,125,.45)';
  for (const sd of [-1, 1]) (ell(ctx, hx + sd * 9 * k, hy + 5.5 * k, 3 * k, 1.8 * k), ctx.fill());
  // 입
  const my = hy + 7.5 * k;
  if (mood === 'wow' || mood === 'soot') {
    ctx.fillStyle = '#8a2a2a';
    ell(ctx, hx + (mood === 'soot' ? 2 * k : 0), my, 2.4 * k, 3 * k);
    ctx.fill();
  } else if (mood === 'happy') {
    ctx.beginPath();
    ctx.arc(hx, my - 1.5 * k, 4 * k, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fillStyle = '#8a2a2a';
    ctx.fill();
    ctx.fillStyle = '#ff8a9a';
    ell(ctx, hx, my + 1.2 * k, 2 * k, 1 * k);
    ctx.fill();
  } else if (mood === 'sad') {
    ctx.beginPath();
    ctx.arc(hx, my + 2.5 * k, 3 * k, Math.PI + 0.4, -0.4);
    line(ctx, eyeW, '#2a1a12');
  } else {
    ctx.beginPath();
    ctx.arc(hx, my - 1.5 * k, 3 * k, 0.25, Math.PI - 0.25);
    line(ctx, eyeW, '#2a1a12');
    if (mood === 'focus') {
      ctx.fillStyle = '#ff7a8a';
      ell(ctx, hx + 2.5 * k, my + 1.3 * k, 1.6 * k, 1.8 * k);
      ctx.fill();
    }
  }
  if (mood === 'soot') {
    ctx.fillStyle = 'rgba(40,40,40,.45)';
    for (const [dx, dy, q] of [[-7, -3, 3], [6, 4, 3.5], [-3, 7, 2.5], [8, -5, 2]]) (circ(ctx, hx + dx * k, hy + dy * k, q * k), ctx.fill());
  }
  // 모자 (펑! 솥이면 날아갔다가 떨어진다)
  let hatY = hy - 11 * k, hatR = Math.sin(t * 0.05) * 0.05 + (mood === 'focus' ? 0.08 : 0);
  if (hatT >= 0 && hatT < 50) {
    const u = hatT / 50;
    hatY -= Math.sin(u * Math.PI) * 45 * k;
    hatR += Math.sin(u * Math.PI * 3) * 0.6;
  }
  ctx.save();
  ctx.translate(hx, hatY);
  ctx.rotate(hatR);
  ell(ctx, 0, 0, 26 * k, 6 * k);
  ctx.fillStyle = '#4a34a8';
  ctx.fill();
  line(ctx, lw);
  const tipSw = Math.sin(t * 0.07) * 3 * k;
  ctx.beginPath();
  ctx.moveTo(-14 * k, -2 * k);
  ctx.quadraticCurveTo(-8 * k, -22 * k, 2 * k, -36 * k);
  ctx.quadraticCurveTo(12 * k + tipSw, -40 * k, 20 * k + tipSw, -33 * k);
  ctx.quadraticCurveTo(10 * k, -30 * k, 8 * k, -24 * k);
  ctx.quadraticCurveTo(12 * k, -12 * k, 14 * k, -2 * k);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -38 * k, 0, 0, [0, '#7a5ae8'], [1, '#4a34a8']);
  ctx.fill();
  line(ctx, lw);
  ctx.fillStyle = '#ffc83a';
  ctx.beginPath();
  ctx.moveTo(-13.5 * k, -4 * k);
  ctx.quadraticCurveTo(0, -1 * k, 13.5 * k, -4 * k);
  ctx.lineTo(12.8 * k, -9 * k);
  ctx.quadraticCurveTo(0, -6 * k, -12.8 * k, -9 * k);
  ctx.closePath();
  ctx.fill();
  line(ctx, lw * 0.8);
  ctx.fillStyle = '#fff6a0';
  starPath(ctx, 20 * k + tipSw, -33 * k, 3.5 * k);
  ctx.fill();
  line(ctx, lw * 0.6);
  ctx.restore();
  // 콜록 연기
  if (mood === 'soot') {
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.8 + i * 14) % 42;
      ctx.globalAlpha = 1 - q / 42;
      ctx.fillStyle = '#6a6a70';
      circ(ctx, hx + 6 * k + q * 0.6 * k, my - q * 0.7 * k, (2 + q * 0.12) * k);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ── 손님 마녀 (초록 모자, 빗자루) ──
function drawGuest(ctx: C2, x: number, y: number, H: number, t: number, happy: boolean) {
  const k = H / 100, lw = Math.max(1.3, k * 1.6);
  const bob = Math.sin(t * 0.06) * 3 * k - (happy ? Math.abs(Math.sin(t * 0.18)) * 6 * k : 0);
  y += bob;
  ctx.fillStyle = 'rgba(60,30,10,.2)';
  ell(ctx, x, y + 26 * k - bob, 22 * k, 4 * k);
  ctx.fill();
  // 빗자루
  ctx.beginPath();
  ctx.moveTo(x - 34 * k, y + 2 * k);
  ctx.lineTo(x + 26 * k, y - 4 * k);
  line(ctx, 3.5 * k + lw * 2);
  ctx.beginPath();
  ctx.moveTo(x - 34 * k, y + 2 * k);
  ctx.lineTo(x + 26 * k, y - 4 * k);
  line(ctx, 3.5 * k, '#a8703a');
  ctx.beginPath();
  ctx.moveTo(x + 22 * k, y - 4 * k);
  ctx.lineTo(x + 40 * k, y - 12 * k);
  ctx.lineTo(x + 42 * k, y + 6 * k);
  ctx.closePath();
  ctx.fillStyle = '#ffcc5a';
  ctx.fill();
  line(ctx, lw);
  // 몸
  ctx.beginPath();
  ctx.moveTo(x - 10 * k, y - 26 * k);
  ctx.quadraticCurveTo(x - 18 * k, y - 6 * k, x - 16 * k, y + 8 * k);
  ctx.lineTo(x + 14 * k, y + 8 * k);
  ctx.quadraticCurveTo(x + 16 * k, y - 6 * k, x + 10 * k, y - 26 * k);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x, y - 26 * k, x, y + 8 * k, [0, '#5ad08a'], [1, '#2a9a5a']);
  ctx.fill();
  line(ctx, lw);
  // 머리
  const hy = y - 36 * k;
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#d8d8f0';
    ell(ctx, x + sd * 12 * k, hy + 6 * k, 5 * k, 9 * k);
    ctx.fill();
    line(ctx, lw * 0.8);
  }
  circ(ctx, x, hy, 12 * k);
  ctx.fillStyle = '#ffe6d0';
  ctx.fill();
  line(ctx, lw);
  // 안경
  for (const sd of [-1, 1]) {
    circ(ctx, x + sd * 5 * k, hy + 1 * k, 3.6 * k);
    line(ctx, lw * 0.8, '#a8703a');
  }
  face(ctx, x, hy + 1 * k, 14 * k, t, 31, happy ? 1 : 0, 0.36);
  // 모자
  ell(ctx, x, hy - 9 * k, 20 * k, 5 * k);
  ctx.fillStyle = '#2a8a5a';
  ctx.fill();
  line(ctx, lw);
  ctx.beginPath();
  ctx.moveTo(x - 11 * k, hy - 10 * k);
  ctx.quadraticCurveTo(x - 4 * k, hy - 30 * k, x - 14 * k, hy - 38 * k);
  ctx.quadraticCurveTo(x + 4 * k, hy - 30 * k, x + 11 * k, hy - 10 * k);
  ctx.closePath();
  ctx.fillStyle = '#3aaa6a';
  ctx.fill();
  line(ctx, lw);
  ctx.fillStyle = '#ff7aa8';
  circ(ctx, x + 6 * k, hy - 13 * k, 3 * k);
  ctx.fill();
}

// ── 다락방 ──
function drawRoom(ctx: C2, w: number, s: LabState, t: number) {
  const R = (v: number) => v * w;
  const floorY = R(0.665), front = R(0.81);
  // 벽 (나무 판자)
  ctx.fillStyle = lin(ctx, 0, R(0.08), 0, floorY, [0, '#fbe8c6'], [1, '#f0cf9c']);
  ctx.fillRect(0, R(0.08), w, floorY - R(0.08));
  for (let i = 0; i <= 9; i++) {
    const x = (i / 9) * w + (hsh(i) - 0.5) * 6;
    ctx.fillStyle = 'rgba(150,95,50,.14)';
    ctx.fillRect(x, R(0.08), 1.5, floorY - R(0.08));
    ctx.fillStyle = 'rgba(150,95,50,.12)';
    ell(ctx, x + R(0.05), R(0.2 + hsh(i + 9) * 0.4), 2.2, 3.2);
    ctx.fill();
  }
  // 경사 지붕 (양쪽 위)
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 0 : w;
    ctx.beginPath();
    ctx.moveTo(x0, R(0.08));
    ctx.lineTo(x0 - sd * R(0.2), R(0.08));
    ctx.lineTo(x0, R(0.36));
    ctx.closePath();
    ctx.fillStyle = lin(ctx, x0, R(0.08), x0 - sd * R(0.12), R(0.25), [0, '#b87a44'], [1, '#d4975a']);
    ctx.fill();
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x0 - sd * R(0.2) * (i / 4), R(0.08));
      ctx.lineTo(x0, R(0.08) + R(0.28) * (i / 4));
      line(ctx, 1.2, 'rgba(110,60,25,.35)');
    }
    ctx.beginPath();
    ctx.moveTo(x0 - sd * R(0.2), R(0.08));
    ctx.lineTo(x0, R(0.36));
    line(ctx, R(0.022), '#8a5530');
    ctx.beginPath();
    ctx.moveTo(x0 - sd * R(0.2), R(0.08) - 1);
    ctx.lineTo(x0, R(0.36) - 1);
    line(ctx, R(0.007), '#c88a52');
  }
  // 둥근 창 + 하늘
  const wx = R(0.845), wy = R(0.445), wr = R(0.075);
  circ(ctx, wx, wy, wr + R(0.018));
  ctx.fillStyle = '#9a6034';
  ctx.fill();
  line(ctx, 1.5);
  circ(ctx, wx, wy, wr);
  ctx.fillStyle = lin(ctx, wx, wy - wr, wx, wy + wr, [0, '#7ccaff'], [1, '#d6f0ff']);
  ctx.fill();
  ctx.save();
  circ(ctx, wx, wy, wr);
  ctx.clip();
  ctx.fillStyle = radg(ctx, wx - wr * 0.4, wy - wr * 0.4, 0, wr * 0.9, [0, 'rgba(255,250,200,1)'], [0.35, 'rgba(255,240,160,.7)'], [1, 'rgba(255,240,160,0)']);
  ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
  const cx0 = wx - wr + ((t * 0.15) % (wr * 3)) - wr * 0.5;
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, q] of [[0, 0.3, 0.3], [0.3, 0.2, 0.38], [0.6, 0.32, 0.26]]) (circ(ctx, cx0 + dx * wr, wy + dy * wr, q * wr), ctx.fill());
  ctx.fillStyle = '#7ac85a';
  ell(ctx, wx, wy + wr * 1.05, wr * 1.2, wr * 0.35);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#9a6034';
  ctx.fillRect(wx - R(0.006), wy - wr, R(0.012), wr * 2);
  ctx.fillRect(wx - wr, wy - R(0.006), wr * 2, R(0.012));
  rr(ctx, wx - wr - R(0.03), wy + wr + R(0.005), wr * 2 + R(0.06), R(0.022), 3);
  ctx.fillStyle = '#b87a44';
  ctx.fill();
  line(ctx, 1.4);
  // 들보 + 약초 다발
  ctx.fillStyle = lin(ctx, 0, R(0.335), 0, R(0.37), [0, '#c4844a'], [1, '#8a5530']);
  ctx.fillRect(0, R(0.335), w, R(0.035));
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.fillRect(0, R(0.37), w, R(0.008));
  const herbs: [number, number, string, string][] = [[0.07, 0.075, '#6aa84a', '#3a7a2a'], [0.3, 0.06, '#a88ad8', '#6a4aa8'], [0.62, 0.07, '#7ab85a', '#3a7a2a'], [0.71, 0.05, '#e8a03a', '#a86a1a']];
  herbs.forEach(([hx, len, c1, c2], i) => {
    const sw = Math.sin(t * 0.03 + i * 1.7) * 0.05;
    ctx.save();
    ctx.translate(R(hx), R(0.355));
    ctx.rotate(sw);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, R(0.025));
    line(ctx, 1.2, '#7a4a26');
    for (let j = 0; j < 7; j++) {
      const a = -0.5 + j * 0.17;
      ctx.fillStyle = j % 2 ? c1 : c2;
      ell(ctx, Math.sin(a) * R(0.03), R(0.025) + Math.cos(a) * R(len) * 0.6, R(0.012), R(len) * 0.5, -a);
      ctx.fill();
    }
    ctx.fillStyle = '#ff5a6e';
    rr(ctx, -R(0.012), R(0.022), R(0.024), R(0.01), 2);
    ctx.fill();
    ctx.restore();
  });
  // 햇살 띠 + 먼지 반짝이
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.moveTo(wx - wr * 0.6, wy - wr * 0.6);
  ctx.lineTo(wx + wr * 0.4, wy + wr * 0.7);
  ctx.lineTo(R(0.52), front);
  ctx.lineTo(R(0.12), front);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, wx, wy, R(0.3), front, [0, 'rgba(255,230,150,.32)'], [1, 'rgba(255,230,150,0)']);
  ctx.fill();
  for (let i = 0; i < 16; i++) {
    const u = hsh(i * 3.1), v = (hsh(i * 7.3) + t * 0.0012 * (1 + hsh(i))) % 1;
    const px = wx + (R(0.32) - wx) * v + (u - 0.5) * R(0.2) * v, py = wy + (front - wy) * v;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.1 + i * 2);
    ctx.fillStyle = '#fff6c0';
    circ(ctx, px, py, 1 + hsh(i) * 1.4);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // 바닥
  ctx.fillStyle = lin(ctx, 0, floorY, 0, front, [0, '#c8834a'], [1, '#e2a466']);
  ctx.fillRect(0, floorY, w, front - floorY);
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * R(0.09), floorY);
    ctx.lineTo(w / 2 + i * R(0.16), front);
    line(ctx, 1, 'rgba(110,60,25,.3)');
  }
  ctx.fillStyle = '#8a5530';
  ctx.fillRect(0, floorY - R(0.012), w, R(0.014));
  // 둥근 깔개
  ell(ctx, R(0.5), R(0.775), R(0.3), R(0.032));
  ctx.fillStyle = '#d8584a';
  ctx.fill();
  ell(ctx, R(0.5), R(0.775), R(0.24), R(0.022));
  line(ctx, 2, '#ffd27a');
  // 책 더미 (손님이 없을 때 오른쪽)
  const d = STAGES[s.stage];
  if (!d.guest) {
    const bx = R(0.88), by = R(0.79);
    const books: [string, number][] = [['#4a8ae8', 0.13], ['#e85a5a', 0.11], ['#5ab86a', 0.12], ['#e8b04a', 0.1]];
    books.forEach(([c, bw], i) => {
      rr(ctx, bx - R(bw) / 2 + (i % 2 ? 2 : -2), by - (i + 1) * R(0.024), R(bw), R(0.022), 2);
      ctx.fillStyle = c;
      ctx.fill();
      line(ctx, 1.3);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(bx - R(bw) / 2 + R(0.01) + (i % 2 ? 2 : -2), by - (i + 1) * R(0.024) + R(0.008), R(bw) * 0.5, 1.5);
    });
  }
  // 빗자루 (왼쪽 벽)
  ctx.beginPath();
  ctx.moveTo(R(0.035), R(0.43));
  ctx.lineTo(R(0.05), R(0.7));
  line(ctx, R(0.012) + 3);
  ctx.beginPath();
  ctx.moveTo(R(0.035), R(0.43));
  ctx.lineTo(R(0.05), R(0.7));
  line(ctx, R(0.012), '#a8703a');
  ctx.beginPath();
  ctx.moveTo(R(0.03), R(0.66));
  ctx.lineTo(R(0.075), R(0.66));
  ctx.lineTo(R(0.09), R(0.76));
  ctx.lineTo(R(0.01), R(0.76));
  ctx.closePath();
  ctx.fillStyle = '#f0c85a';
  ctx.fill();
  line(ctx, 1.4);
}

// ── 부엉이 (창틀 구경꾼) ──
function drawOwl(ctx: C2, x: number, y: number, r: number, t: number, wow: boolean) {
  const lw = Math.max(1.2, r * 0.08);
  const hop = wow ? Math.abs(Math.sin(t * 0.3)) * r * 0.3 : 0;
  y -= hop;
  ell(ctx, x, y - r * 0.6, r * 0.6, r * 0.65);
  ctx.fillStyle = lin(ctx, x, y - r * 1.2, x, y, [0, '#b8865a'], [1, '#8a5a34']);
  ctx.fill();
  line(ctx, lw);
  ctx.fillStyle = '#f0d8b0';
  ell(ctx, x, y - r * 0.4, r * 0.35, r * 0.35);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + sd * r * 0.3, y - r * 1.1);
    ctx.lineTo(x + sd * r * 0.5, y - r * 1.4);
    ctx.lineTo(x + sd * r * 0.55, y - r * 1.0);
    ctx.fillStyle = '#9a6a40';
    ctx.fill();
    line(ctx, lw * 0.8);
    const er = r * (wow ? 0.28 : 0.22);
    circ(ctx, x + sd * r * 0.25, y - r * 0.8, er);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    line(ctx, lw * 0.7);
    ctx.fillStyle = '#2a1a12';
    if (!wow && t % 230 < 8) ctx.fillRect(x + sd * r * 0.25 - er * 0.7, y - r * 0.8 - 0.5, er * 1.4, 1.5);
    else (circ(ctx, x + sd * r * 0.25, y - r * 0.8, er * 0.55), ctx.fill());
  }
  ctx.fillStyle = '#ffb030';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.08, y - r * 0.68);
  ctx.lineTo(x + r * 0.08, y - r * 0.68);
  ctx.lineTo(x, y - r * 0.52);
  ctx.closePath();
  ctx.fill();
}

// ── 솥 ──
function potColor(s: LabState): string {
  if (!s.pot.length) return '#6ad0a0';
  const cs = s.pot.map((p) => BY_ID[p.id].col);
  let r = 0, g = 0, b = 0;
  for (const c of cs) {
    r += parseInt(c.slice(1, 3), 16);
    g += parseInt(c.slice(3, 5), 16);
    b += parseInt(c.slice(5, 7), 16);
  }
  const n = cs.length;
  return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
}
function drawPot(ctx: C2, w: number, s: LabState, t: number) {
  const R = (v: number) => v * w;
  const brewing = s.phase === 'brew', bu = brewing ? (s.t - s.brewAt) / BREW_T : 0;
  const shake = brewing ? Math.sin(t * 1.3) * R(0.006) * (0.5 + bu) : 0;
  const cx = R(POT_X) + shake, rimY = R(0.535), bodyY = R(0.645), bodyR = R(0.14);
  // 불 (돌 화덕)
  const fireY = R(0.79);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? '#9a9090' : '#b0a8a0';
    ell(ctx, cx + (i - 2) * R(0.07), fireY, R(0.04), R(0.018));
    ctx.fill();
    line(ctx, 1.2);
  }
  const fl = brewing ? 1.5 : 1;
  for (let i = 0; i < 5; i++) {
    const fx2 = cx + (i - 2) * R(0.045), hgt = R(0.05) * fl * (0.7 + 0.3 * Math.sin(t * 0.3 + i * 1.7));
    ctx.fillStyle = i % 2 ? '#ffb030' : '#ff6a2a';
    ctx.beginPath();
    ctx.moveTo(fx2 - R(0.025), fireY);
    ctx.quadraticCurveTo(fx2 - R(0.015), fireY - hgt * 0.6, fx2, fireY - hgt);
    ctx.quadraticCurveTo(fx2 + R(0.015), fireY - hgt * 0.6, fx2 + R(0.025), fireY);
    ctx.fill();
  }
  // 다리
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#2a2a36';
    rr(ctx, cx + sd * R(0.09) - R(0.015), bodyY + bodyR * 0.75, R(0.03), R(0.05), 3);
    ctx.fill();
  }
  // 솥 몸통
  const liq = brewing ? `hsl(${(t * 9) % 360},85%,65%)` : potColor(s);
  ctx.fillStyle = radg(ctx, cx, rimY, 0, R(0.3), [0, brewing ? `hsla(${(t * 9) % 360},90%,70%,.45)` : liq.startsWith('#') ? 'rgba(106,208,160,.3)' : liq.replace('rgb', 'rgba').replace(')', ',.35)')], [1, 'rgba(255,255,255,0)']);
  circ(ctx, cx, rimY, R(0.3));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - R(0.15), rimY);
  ctx.bezierCurveTo(cx - R(0.2), bodyY + bodyR * 0.9, cx + R(0.2), bodyY + bodyR * 0.9, cx + R(0.15), rimY);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, cx - R(0.15), 0, cx + R(0.15), 0, [0, '#2a2a3a'], [0.35, '#4a4a60'], [0.6, '#2a2a3a'], [1, '#14141e']);
  ctx.fill();
  line(ctx, 2);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ell(ctx, cx - R(0.08), bodyY - R(0.02), R(0.025), R(0.06), 0.3);
  ctx.fill();
  // 손잡이 고리
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + sd * R(0.165), rimY + R(0.04), R(0.025), 0, TAU);
    line(ctx, R(0.01), '#2a2a3a');
  }
  // 테두리 + 물약 표면
  ell(ctx, cx, rimY, R(0.165), R(0.045));
  ctx.fillStyle = '#3a3a4c';
  ctx.fill();
  line(ctx, 2);
  ell(ctx, cx, rimY + R(0.004), R(0.14), R(0.033));
  const boil = brewing ? 1 + bu * 2 : 1;
  ctx.fillStyle = lin(ctx, cx, rimY - R(0.03), cx, rimY + R(0.03), [0, '#ffffff'], [0.25, s.pot.length || brewing ? liq : '#7ad8a8'], [1, s.pot.length || brewing ? liq : '#3aa070']);
  ctx.fill();
  // 거품
  for (let i = 0; i < (brewing ? 9 : 4); i++) {
    const q = (t * (brewing ? 1.6 : 0.5) + i * 23) % 40;
    const bx = cx + (hsh(i + Math.floor((t * (brewing ? 1.6 : 0.5) + i * 23) / 40) * 9) - 0.5) * R(0.22);
    const by = rimY - q * R(0.0012) * boil;
    ctx.globalAlpha = 1 - q / 40;
    circ(ctx, bx, by, R(0.008) * boil * (0.6 + hsh(i) * 0.8));
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fill();
    line(ctx, 1, 'rgba(60,40,30,.4)');
  }
  ctx.globalAlpha = 1;
  // 김
  for (let i = 0; i < 4; i++) {
    const q = (t * (brewing ? 1.2 : 0.4) + i * 30) % 120;
    ctx.globalAlpha = (1 - q / 120) * (brewing ? 0.75 : 0.4);
    ctx.fillStyle = '#ffffff';
    circ(ctx, cx + Math.sin(q * 0.05 + i * 2) * R(0.06) + (i - 1.5) * R(0.04), rimY - R(0.02) - q * R(0.0015), R(0.02) + q * R(0.00025));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** 쪽지 칸 하나: 생물 그림 + 점 */
function noteCell(ctx: C2, id: string | null, x: number, y: number, r: number, t: number, mode: 'show' | 'hide' | 'sil' | 'goal', fs: number) {
  if (mode === 'goal') {
    ctx.fillStyle = radg(ctx, x, y - r, 0, r * 1.7, [0, 'rgba(255,220,90,.75)'], [1, 'rgba(255,220,90,0)']);
    circ(ctx, x, y - r, r * 1.7);
    ctx.fill();
  }
  if (!id || mode === 'hide') {
    rr(ctx, x - r * 0.75, y - r * 1.8, r * 1.5, r * 1.6, r * 0.3);
    ctx.fillStyle = 'rgba(120,80,40,.12)';
    ctx.fill();
    ctx.setLineDash([4, 3]);
    line(ctx, 1.5, 'rgba(120,80,40,.6)');
    ctx.setLineDash([]);
    say(ctx, '?', x, y - r * 0.95, fs * 1.5, '#a8703a', '#fff6e0', 3);
  } else if (mode === 'sil') drawSil(ctx, id, x, y - r * 0.15, r * 0.9, t, '#5a3a5a');
  else drawThing(ctx, id, x, y - r * 0.15, r * (BY_ID[id].base ? 0.62 : 0.9), t, mode === 'goal' ? 1 : 0, 3);
}

// ── 쪽지 (목표 + 단서) ──
function drawNote(ctx: C2, w: number, s: LabState, t: number) {
  const R = (v: number) => v * w, d = STAGES[s.stage];
  const x0 = R(0.035), y0 = R(0.098), nw = w - R(0.07), nh = R(0.225);
  ctx.save();
  ctx.translate(w / 2, y0 + nh / 2);
  ctx.rotate(-0.008);
  ctx.translate(-w / 2, -(y0 + nh / 2));
  ctx.fillStyle = 'rgba(80,40,10,.22)';
  rr(ctx, x0 + 3, y0 + 5, nw, nh, R(0.02));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + nh, [0, '#fffaf0'], [1, '#f6e6c4']);
  rr(ctx, x0, y0, nw, nh, R(0.02));
  ctx.fill();
  line(ctx, 1.8, '#b8864a');
  for (const px of [x0 + R(0.03), x0 + nw - R(0.03)]) {
    circ(ctx, px, y0 + R(0.018), R(0.012));
    ctx.fillStyle = '#e8484a';
    ctx.fill();
    line(ctx, 1.2);
  }
  const fs = Math.max(12, R(0.038));
  // 제목 줄
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `900 ${fs}px system-ui, sans-serif`;
  const ty = y0 + R(0.035);
  rr(ctx, x0 + R(0.055), ty - fs * 0.62, R(0.11), fs * 1.24, fs * 0.4);
  ctx.fillStyle = '#ff7a5a';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('목표', x0 + R(0.11), ty + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a2c1a';
  const title = d.goal ? (d.rev ? '그림자를 만들어요' : `${BY_ID[d.goal].name} 만들기`) : `새것 둘 만들기  ${Math.min(s.newN, d.need ?? 2)}/${d.need ?? 2}`;
  ctx.fillText(title, x0 + R(0.18), ty + 1);
  // 식: A + B = 목표
  const ey = y0 + R(0.175), r = R(0.052);
  const xs = [0.17, 0.4, 0.73].map(R), ops: [string, number][] = [['+', 0.285], ['=', 0.535]];
  const sym = (txt: string, x: number) => say(ctx, txt, R(x), ey - r * 0.9, fs * 1.4, '#a8703a', '#fff6e0', 3);
  for (const [o, ox] of ops) sym(o, ox);
  if (!d.goal) {
    noteCell(ctx, null, xs[0], ey, r, t, 'hide', fs);
    noteCell(ctx, null, xs[1], ey, r, t, 'hide', fs);
    const sx = xs[2];
    ctx.fillStyle = radg(ctx, sx, ey - r, 0, r * 1.6, [0, 'rgba(255,220,90,.8)'], [1, 'rgba(255,220,90,0)']);
    circ(ctx, sx, ey - r, r * 1.6);
    ctx.fill();
    say(ctx, '새것!', sx, ey - r * 0.9, fs * 1.25, '#ffcf3a', OUT, 4);
    for (let i = 0; i < 4; i++) {
      const a = t * 0.03 + i * 1.57;
      ctx.fillStyle = '#ffffff';
      starPath(ctx, sx + Math.cos(a) * r * 1.3, ey - r * 0.9 + Math.sin(a) * r * 0.7, r * 0.15);
      ctx.fill();
    }
  } else if (d.rev) {
    noteCell(ctx, d.goal, xs[0], ey, r, t, s.codex.has(d.goal) && s.phase === 'result' && s.ok ? 'show' : 'sil', fs);
    ctx.strokeStyle = `rgba(255,190,40,${0.6 + 0.4 * Math.sin(t * 0.15)})`;
    ctx.lineWidth = 2.5;
    rr(ctx, xs[0] - r * 1.05, ey - r * 1.95, r * 2.1, r * 2.0, r * 0.35);
    ctx.stroke();
    noteCell(ctx, d.rev.other, xs[1], ey, r, t, 'show', fs);
    noteCell(ctx, d.rev.result, xs[2], ey, r, t, 'show', fs);
    dotRow(ctx, BY_ID[d.goal].d, xs[0], ey + r * 0.35, r * 0.17, true);
    dotRow(ctx, BY_ID[d.rev.other].d, xs[1], ey + r * 0.35, r * 0.17);
    dotRow(ctx, BY_ID[d.rev.result].d, xs[2], ey + r * 0.35, r * 0.17);
  } else {
    const [a, b] = d.clue!;
    noteCell(ctx, a, xs[0], ey, r, t, 'show', fs);
    noteCell(ctx, b, xs[1], ey, r, t, s.codex.has(b) ? 'show' : 'hide', fs);
    noteCell(ctx, d.goal, xs[2], ey, r * 1.12, t, 'goal', fs);
    dotRow(ctx, BY_ID[a].d, xs[0], ey + r * 0.35, r * 0.17);
    dotRow(ctx, BY_ID[b].d, xs[1], ey + r * 0.35, r * 0.17);
    dotRow(ctx, BY_ID[d.goal].d, xs[2], ey + r * 0.35, r * 0.17);
  }
  ctx.restore();
}

/** 미리 보기: 지금 솥에 든 것 + 이 칸 → 아는 결과 / 펑 / ? */
function previewOf(s: LabState, extra: string[]): { kind: 'item' | 'bad' | 'unk'; id?: string } {
  const sum = [...s.pot.map((p) => p.id), ...extra].reduce((a, id) => addD(a, BY_ID[id].d), [0, 0, 0, 0]), k = dkey(sum);
  if (s.bad.has(k)) return { kind: 'bad' };
  const kn = knownKeys(s);
  if (kn.has(k) && BY_KEY[k]) return { kind: 'item', id: BY_KEY[k].id };
  return { kind: 'unk' };
}
function previewBubble(ctx: C2, s: LabState, x: number, y: number, r: number, t: number, pv: { kind: string; id?: string }) {
  const d = STAGES[s.stage], isGoal = pv.id && pv.id === d.goal;
  const pr = r * (1 + 0.05 * Math.sin(t * 0.15));
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  circ(ctx, x + 1.5, y + 2, pr);
  ctx.fill();
  circ(ctx, x, y, pr);
  ctx.fillStyle = isGoal ? '#fff3b0' : pv.kind === 'bad' ? '#d8d4d0' : '#ffffff';
  ctx.fill();
  line(ctx, isGoal ? 2.5 : 1.6, isGoal ? '#e8a010' : OUT);
  ctx.beginPath();
  ctx.moveTo(x - pr * 0.3, y + pr * 0.85);
  ctx.lineTo(x - pr * 0.55, y + pr * 1.35);
  ctx.lineTo(x + pr * 0.1, y + pr * 0.95);
  ctx.fillStyle = isGoal ? '#fff3b0' : pv.kind === 'bad' ? '#d8d4d0' : '#ffffff';
  ctx.fill();
  if (pv.kind === 'item') {
    ctx.save();
    circ(ctx, x, y, pr - 1);
    ctx.clip();
    drawThing(ctx, pv.id!, x, y + pr * 0.62, pr * (BY_ID[pv.id!].base ? 0.42 : 0.62), t, 0, 2);
    ctx.restore();
  } else if (pv.kind === 'bad') {
    ctx.fillStyle = '#5a5a60';
    for (const [dx, dy, q] of [[-0.3, 0.1, 0.35], [0.25, 0.05, 0.38], [0, -0.25, 0.4]]) (circ(ctx, x + dx * pr, y + dy * pr, q * pr), ctx.fill());
    say(ctx, '펑', x, y + pr * 0.05, Math.max(11, pr * 0.8), '#ffffff', '#3a3a40', 3);
  } else say(ctx, '?', x, y + 1, Math.max(12, pr * 1.2), '#ff8a3a', OUT, 3);
}

// ── 선반 ──
function drawShelf(ctx: C2, w: number, s: LabState, t: number) {
  const R = (v: number) => v * w;
  const top = R(0.815), bot = R(1.315);
  ctx.fillStyle = lin(ctx, 0, top, 0, bot, [0, '#7d4c28'], [1, '#6a3e20']);
  ctx.fillRect(R(0.015), top, w - R(0.03), bot - top);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = 'rgba(40,20,5,.12)';
    ctx.fillRect(R(0.02) + i * R(0.08), top, 1.2, bot - top);
  }
  // 몰딩·기둥
  ctx.fillStyle = lin(ctx, 0, top - R(0.012), 0, top + R(0.02), [0, '#e0a060'], [1, '#a8683a']);
  rr(ctx, 0, top - R(0.012), w, R(0.03), 3);
  ctx.fill();
  line(ctx, 1.5);
  for (const sx of [0, w - R(0.03)]) {
    ctx.fillStyle = lin(ctx, sx, 0, sx + R(0.03), 0, [0, '#b8783c'], [1, '#8a5530']);
    ctx.fillRect(sx, top + R(0.015), R(0.03), bot - top);
  }
  const d = STAGES[s.stage], play = s.phase === 'play';
  const pop = s.pop;
  for (let row = 0; row < 2; row++) {
    const by = R(SLOT_BASE[row]);
    // 칸 안쪽 그늘
    ctx.fillStyle = 'rgba(30,12,2,.25)';
    ctx.fillRect(R(0.03), by - R(0.15), w - R(0.06), R(0.025));
    // 판자
    ctx.fillStyle = lin(ctx, 0, by - R(0.014), 0, by, [0, '#f0b878'], [1, '#d89858']);
    ctx.fillRect(R(0.01), by - R(0.014), w - R(0.02), R(0.014));
    ctx.fillStyle = lin(ctx, 0, by, 0, by + R(0.024), [0, '#b8743c'], [1, '#8a5228']);
    ctx.fillRect(R(0.01), by, w - R(0.02), R(0.024));
    ctx.fillStyle = 'rgba(255,240,200,.5)';
    ctx.fillRect(R(0.01), by - R(0.014), w - R(0.02), 1.2);
    for (let c = 0; c < 3; c++) {
      const i = row * 3 + c, sl = s.shelf[i];
      const [ux] = slotXY(i), x = R(ux);
      const inPot = s.pot.filter((p) => p.slot === i).length;
      // 막 태어난 것은 아직 뛰어오는 중이면 비워 둔다
      const arriving = !!pop && pop.slot === i && s.t < pop.end;
      // 이름표
      if (sl && !arriving) {
        const it = BY_ID[sl.id];
        const fs = Math.max(12, R(0.036));
        ctx.font = `900 ${fs}px system-ui, sans-serif`;
        const tw = Math.max(ctx.measureText(it.name).width + R(0.04), R(0.15));
        const tx = x - tw / 2, ty = by + R(0.03);
        ctx.beginPath();
        ctx.moveTo(x, by + R(0.012));
        ctx.lineTo(x, ty);
        line(ctx, 1, '#5a3a1a');
        ctx.fillStyle = 'rgba(40,20,5,.3)';
        rr(ctx, tx + 2, ty + 2, tw, R(0.068), 4);
        ctx.fill();
        ctx.fillStyle = sl.made >= 0 ? '#fff6c8' : '#fffaf0';
        rr(ctx, tx, ty, tw, R(0.068), 4);
        ctx.fill();
        line(ctx, 1.3, '#a8703a');
        ctx.fillStyle = '#4a2c1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.name, x, ty + R(0.02));
        dotRow(ctx, it.d, x, ty + R(0.05), R(0.0105));
      }
      if (!sl || arriving) {
        if (d.once && !sl) {
          ctx.fillStyle = 'rgba(255,255,255,.08)';
          ell(ctx, x, by - R(0.004), R(0.06), R(0.01));
          ctx.fill();
        }
        continue;
      }
      // 고를 수 있으면 살짝 빛 + 들썩
      const ready = play && s.pot.length < cap(d);
      const bob = ready ? Math.abs(Math.sin(t * 0.07 + i * 1.3)) * R(0.006) : 0;
      if (ready) {
        ctx.fillStyle = radg(ctx, x, by - R(0.06), 0, R(0.11), [0, 'rgba(255,230,140,.35)'], [1, 'rgba(255,230,140,0)']);
        circ(ctx, x, by - R(0.06), R(0.11));
        ctx.fill();
      }
      if (inPot) {
        ctx.strokeStyle = '#ffd23a';
        ctx.lineWidth = 3;
        rr(ctx, x - R(0.135), by - R(0.165), R(0.27), R(0.168), R(0.03));
        ctx.stroke();
      }
      const isNew = sl.made >= 0 && s.t - sl.made < 600;
      const big = BY_ID[sl.id].base ? R(0.08) : R(0.095);
      drawThing(ctx, sl.id, x, by - R(0.003) - bob, big, t, inPot ? 2 : 0, i * 3 + row);
      if (d.once && BY_ID[sl.id].base) {
        // 금 간 병 표시
        ctx.beginPath();
        ctx.moveTo(x + big * 0.25, by - big * 1.15);
        ctx.lineTo(x + big * 0.05, by - big * 0.8);
        ctx.lineTo(x + big * 0.3, by - big * 0.55);
        line(ctx, 1.4, '#ffffff');
      }
      if (inPot) {
        circ(ctx, x + R(0.11), by - R(0.145), R(0.022));
        ctx.fillStyle = '#ffd23a';
        ctx.fill();
        line(ctx, 1.5);
        say(ctx, inPot > 1 ? '×2' : '쏙', x + R(0.11), by - R(0.144), Math.max(11, R(0.026)), OUT, '#ffd23a', 0.1);
      } else if (play && s.pot.length > 0 && s.pot.length < cap(d)) previewBubble(ctx, s, x + R(0.1), by - R(0.135), R(0.034), t, previewOf(s, [sl.id]));
      else if (isNew && play && !s.pot.length) {
        ctx.save();
        ctx.translate(x - R(0.1), by - R(0.14));
        ctx.rotate(-0.25);
        rr(ctx, -R(0.035), -R(0.014), R(0.07), R(0.028), R(0.012));
        ctx.fillStyle = '#ff5a6e';
        ctx.fill();
        line(ctx, 1.2);
        say(ctx, 'NEW', 0, 1, Math.max(10, R(0.022)), '#ffffff', OUT, 0.1);
        ctx.restore();
      }
    }
  }
}

/** 손가락 그림 (가리키는 손) */
function drawFinger(ctx: C2, x: number, y: number, s: number, t: number) {
  const b = Math.sin(t * 0.18) * s * 0.18;
  ctx.save();
  ctx.translate(x, y + b);
  ctx.rotate(-0.35);
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ell(ctx, s * 0.1, s * 1.7, s * 0.5, s * 0.15);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-s * 0.18, 0);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.05, -s * 0.18, -s * 0.0);
  ctx.lineTo(-s * 0.18, s * 0.7);
  ctx.quadraticCurveTo(-s * 0.6, s * 0.75, -s * 0.5, s * 1.1);
  ctx.quadraticCurveTo(-s * 0.4, s * 1.5, s * 0.1, s * 1.55);
  ctx.quadraticCurveTo(s * 0.55, s * 1.5, s * 0.55, s * 1.05);
  ctx.lineTo(s * 0.55, s * 0.75);
  ctx.quadraticCurveTo(s * 0.45, s * 0.6, s * 0.3, s * 0.7);
  ctx.lineTo(s * 0.18, s * 0.66);
  ctx.lineTo(s * 0.18, 0);
  ctx.arc(0, 0, s * 0.18, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  line(ctx, Math.max(1.5, s * 0.08));
  ctx.restore();
}

/** 태어난 것의 길: 솥에서 튀어나와 → 바닥 → 다락방을 한 바퀴 → 선반으로 폴짝 */
function bornPath(p: Pop, a: number, w: number): { x: number; y: number; sc: number; say: boolean } {
  const R = (v: number) => v * w;
  const [sx, sy] = p.slot >= 0 ? slotXY(p.slot) : [0.5, 0.4];
  const P0 = [POT_X, 0.43];
  if (p.kind === 'goal') {
    const u = ease(a / 16);
    return { x: R(POT_X), y: R(0.53 - 0.12 * u), sc: 0.4 + 1.6 * u, say: a > 14 };
  }
  if (p.kind === 'known') {
    if (a < 12) {
      const u = ease(a / 12);
      return { x: R(POT_X), y: R(0.53 - 0.1 * u), sc: 0.5 + 0.7 * u, say: false };
    }
    const u = clamp((a - 12) / 22, 0, 1);
    return { x: R(P0[0] + (sx - P0[0]) * u), y: R(P0[1] + (sy - P0[1]) * u - Math.sin(u * Math.PI) * 0.12), sc: 1.2 - 0.2 * u, say: false };
  }
  // 새것: 0–16 솟기 · 16–30 멈칫 · 30–42 바닥으로 · 42–72 뛰어다니기 · 72–92 선반으로
  if (a < 16) {
    const u = ease(a / 16);
    return { x: R(POT_X), y: R(0.53 - 0.12 * u), sc: 0.4 + 1.4 * u, say: false };
  }
  if (a < 30) return { x: R(POT_X), y: R(0.41) + Math.sin(a * 0.6) * 1.5, sc: 1.8, say: true };
  if (a < 42) {
    const u = (a - 30) / 12;
    return { x: R(POT_X + 0.2 * u), y: R(0.41 + 0.375 * u - Math.sin(u * Math.PI) * 0.08), sc: 1.8 - 0.5 * u, say: true };
  }
  if (a < 72) {
    const u = (a - 42) / 30, xx = 0.7 + 0.2 * Math.sin(u * Math.PI);
    return { x: R(xx), y: R(0.785) - Math.abs(Math.sin(u * Math.PI * 4)) * R(0.03), sc: 1.3, say: true };
  }
  const u = clamp((a - 72) / 20, 0, 1);
  return { x: R(0.7 + (sx - 0.7) * u), y: R(0.785 + (sy - 0.785) * u - Math.sin(u * Math.PI) * 0.15), sc: 1.3 - 0.3 * u, say: false };
}

const bigText = new WeakMap<object, { text: string; sub: string; t: number; col: string }>();
function big(s: LabState, text: string, sub: string, t: number, col = '#ffd23a') {
  bigText.set(s, { text, sub, t, col });
}

function drawAll(ctx: C2, s: LabState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, R = (v: number) => v * w, d = STAGES[s.stage];
  // ── 사건 → 연출 ──
  const last = fx.memo.ev ?? 0;
  for (const e of s.events) {
    if (e.n <= last) continue;
    const ex = R(e.x), ey = R(e.y);
    switch (e.kind) {
      case 'pour':
        fx.ring(R(POT_X), R(0.535), '#ffffff', R(0.12), 3);
        break;
      case 'brew':
        fx.kick(3);
        fx.burst(R(POT_X), R(0.53), '#ffffff', 10, 2.5, 2.5);
        break;
      case 'new':
      case 'goal': {
        const it = BY_ID[e.id!];
        fx.blink('#ffffff', e.kind === 'goal' ? 0.7 : 0.55);
        fx.kick(e.kind === 'goal' ? 12 : 8);
        fx.ring(R(POT_X), R(0.45), '#ffe25a', R(0.4), 7);
        fx.ring(R(POT_X), R(0.45), '#ffffff', R(0.28), 4);
        for (const c of ['#ff5a6e', '#ffd23a', '#5ad0ff', '#8ae05a', it.col]) fx.burst(R(POT_X), R(0.45), c, 14, 6, 3.2);
        if (e.kind === 'goal') big(s, `${it.name} 완성!`, '목표를 만들었어요', t, '#ffd23a');
        else if (s.pop?.isNew) big(s, '새로 발견!', it.name, t, '#7ae0ff');
        break;
      }
      case 'known':
        fx.burst(R(POT_X), R(0.47), '#ffffff', 10, 3, 2.4);
        fx.pop(R(POT_X), R(0.4), `또 ${BY_ID[e.id!].name}`, '#fff6d0', 15);
        break;
      case 'fail': {
        const p = s.pop!;
        if (p.boom) {
          fx.blink('#ffb050', 0.7);
          fx.kick(16);
          fx.burst(R(POT_X), R(0.5), '#ff8a2a', 30, 7, 4);
          fx.burst(R(POT_X), R(0.5), '#3a3a40', 26, 5, 5);
          big(s, '펑!', p.lost ? `${BY_ID[p.lost].name} 병이 깨졌어요` : '없는 조합이에요', t, '#ff8a3a');
          if (p.lostSlot >= 0) {
            const [lx, ly] = slotXY(p.lostSlot);
            fx.burst(R(lx), R(ly - 0.07), '#d8f4ff', 20, 4, 2.6);
            fx.burst(R(lx), R(ly - 0.07), BY_ID[p.lost!].col, 12, 3, 3);
          }
        } else {
          fx.kick(5);
          fx.burst(R(POT_X), R(0.5), '#4a4a50', 26, 4, 4.5);
          fx.pop(R(POT_X), R(0.36), '콜록콜록!', '#e8e8f0', 20);
        }
        break;
      }
      case 'clear':
        for (const c of ['#ffd23a', '#ff7aa8', '#7ae0ff', '#8ae05a']) {
          fx.burst(R(0.25), R(0.45), c, 12, 6, 3);
          fx.burst(R(0.75), R(0.45), c, 12, 6, 3);
        }
        break;
      case 'stagefail':
        fx.kick(6);
        break;
      case 'hint':
        fx.pop(ex, ey, e.text ?? '', '#ffffff', 15);
        break;
      case 'stage':
        break;
    }
    if (e.kind === 'new' && s.pop?.guest) fx.pop(R(0.86), R(0.5), '고마워!', '#ffd0e8', 18);
  }
  fx.memo.ev = s.evN;

  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  drawRoom(ctx, w, s, t);
  drawNote(ctx, w, s, t);
  const pop = s.pop, pa = pop ? s.t - pop.t : 999;
  const bigNow = pop && pa < 60 && (pop.kind === 'new' || pop.kind === 'goal');
  drawOwl(ctx, R(0.76), R(0.528), R(0.035), t, !!bigNow || (s.phase === 'result' && s.ok));
  // 손님
  if (d.guest) {
    const gx = R(0.865), gy = R(0.66);
    drawGuest(ctx, gx, gy, R(0.2), t, s.guestOk);
    // 말풍선: 보고 싶은 것
    const bx = R(0.88), by = R(0.415), br2 = R(0.06);
    if (!(s.phase === 'result' && s.ok)) {
      ctx.fillStyle = s.guestOk ? '#e8ffd8' : '#ffffff';
      rr(ctx, bx - br2 * 1.15, by - br2 * 1.2, br2 * 2.3, br2 * 2.1, br2 * 0.5);
      ctx.fill();
      line(ctx, 2);
      ctx.beginPath();
      ctx.moveTo(bx - br2 * 0.2, by + br2 * 0.9);
      ctx.lineTo(bx - br2 * 0.05, by + br2 * 1.4);
      ctx.lineTo(bx + br2 * 0.35, by + br2 * 0.9);
      ctx.fillStyle = s.guestOk ? '#e8ffd8' : '#ffffff';
      ctx.fill();
      drawThing(ctx, d.guest, bx, by + br2 * 0.65, br2 * 0.72, t, s.guestOk ? 1 : 0, 9);
      if (s.guestOk) {
        ctx.fillStyle = '#ff5a8a';
        heartPath(ctx, bx + br2 * 0.8, by - br2 * 0.8, br2 * 0.3);
        ctx.fill();
      } else say(ctx, '보고 싶어!', bx - br2 * 0.1, by - br2 * 1.45, Math.max(12, R(0.034)), '#ffffff', '#2a8a5a', 3.5);
    }
  }
  // 솥 + 마녀
  drawPot(ctx, w, s, t);
  let mood: Mood = 'idle';
  if (s.phase === 'brew') mood = 'focus';
  else if (pop && s.phase === 'pop') mood = pop.kind === 'fail' ? 'soot' : pa < 30 ? 'wow' : 'happy';
  else if (s.phase === 'result') mood = s.ok ? 'happy' : 'sad';
  else if (pop && pop.kind === 'fail' && pa < 120) mood = 'soot';
  const stir = s.phase === 'brew' ? t * 0.45 : t * 0.04;
  const hatT = pop && pop.kind === 'fail' && pop.boom ? pa : -1;
  drawWitch(ctx, R(0.155), R(0.795), R(0.36), t, mood, stir, hatT, R(POT_X), R(0.545));
  // 솥에 붓는 병 (선반 → 솥)
  for (const p of s.pot) {
    const a = s.t - p.t;
    if (a > 16) continue;
    const [sx, sy] = slotXY(p.slot), u = ease(a / 16);
    const x = R(sx + (POT_X - sx) * u), y = R(sy - 0.07 + (0.49 - (sy - 0.07)) * u - Math.sin(u * Math.PI) * 0.16);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(u * 2.4 * (sx < POT_X ? 1 : -1));
    ctx.globalAlpha = 1 - Math.max(0, (a - 12) / 4);
    drawThing(ctx, p.id, 0, R(0.06), R(0.065) * (1 - 0.3 * u), t);
    ctx.restore();
    if (a === 14 || a === 15) say(ctx, '퐁당!', R(POT_X + 0.13), R(0.47), Math.max(14, R(0.045)), '#ffffff', '#2a7ad8', 4);
  }
  ctx.globalAlpha = 1;
  // 선반
  drawShelf(ctx, w, s, t);
  // 실패 연기 · 펑
  if (pop && pop.kind === 'fail' && pa < 70) {
    const u = pa / 70;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU, dist = R(0.04) + ease(u * 1.5) * R(pop.boom ? 0.2 : 0.13);
      ctx.globalAlpha = (1 - u) * 0.9;
      ctx.fillStyle = i % 2 ? '#3a3a42' : '#5a5a62';
      circ(ctx, R(POT_X) + Math.cos(a) * dist, R(0.47) + Math.sin(a) * dist * 0.6 - u * R(0.08), R(0.03) + u * R(0.04));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (pa < 40) say(ctx, pop.boom ? '펑!!' : '푸슉…', R(POT_X), R(0.4) - pa * 0.3, Math.max(18, R(pop.boom ? 0.09 : 0.06)), pop.boom ? '#ff8a3a' : '#e0e0e8', OUT, 5);
  }
  // 깨진 병 조각이 데굴데굴
  if (pop && pop.kind === 'fail' && pop.lost && pa < 60) {
    const [lx, ly] = pop.lostSlot >= 0 ? slotXY(pop.lostSlot) : [POT_X, 0.5];
    for (let i = 0; i < 5; i++) {
      const vx = (hsh(i + 1) - 0.5) * 3, vy = -2 - hsh(i + 5) * 2;
      const px = R(lx) + vx * pa, py = R(ly - 0.08) + vy * pa + 0.08 * pa * pa;
      if (py > h) continue;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pa * 0.2 + i);
      ctx.fillStyle = 'rgba(220,245,255,.9)';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(4, 3);
      ctx.lineTo(-3, 4);
      ctx.closePath();
      ctx.fill();
      line(ctx, 1, '#5a8ab0');
      ctx.restore();
    }
  }
  // 오래된 것이 창밖으로 '안녕~'
  if (pop && pop.bye && pa < 70) {
    const u = pa / 70;
    const x = R(0.5 + 0.35 * u), y = R(0.9 - 0.45 * u) - Math.sin(u * Math.PI) * R(0.1);
    ctx.globalAlpha = 1 - u * 0.6;
    drawThing(ctx, pop.bye, x, y, R(0.06) * (1 - u * 0.5), t, 1, 4);
    ctx.globalAlpha = 1;
    say(ctx, '안녕~', x, y - R(0.1), Math.max(12, R(0.036)), '#ffffff', OUT, 3);
  }
  // 태어난 것
  const showGoal = (pop && pop.kind === 'goal') || false;
  if (pop && pop.id && (s.phase === 'pop' || (s.phase === 'result' && showGoal))) {
    const P = bornPath(pop, pa, w);
    if (pop.kind === 'goal' || (pop.kind === 'new' && pa < 30)) {
      // 뒤에서 도는 빛살
      ctx.save();
      ctx.translate(P.x, P.y - R(0.06) * P.sc);
      ctx.rotate(t * 0.02);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.fillStyle = i % 2 ? 'rgba(255,240,160,.4)' : 'rgba(255,255,255,.3)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(R(0.04), -R(0.24) * Math.min(1.4, P.sc));
        ctx.lineTo(-R(0.04), -R(0.24) * Math.min(1.4, P.sc));
        ctx.fill();
      }
      ctx.restore();
    }
    drawThing(ctx, pop.id, P.x, P.y, R(0.075) * P.sc, t, pa < 30 ? 2 : 1, 7);
    if (P.say) say(ctx, BY_ID[pop.id].say, P.x + R(0.1), P.y - R(0.12) * P.sc - R(0.02), Math.max(15, R(0.05)), '#ffffff', OUT, 4);
  }
  // 1판 첫 섞기: 손가락이 물 → 불
  if (s.stage === 0 && !s.again && s.mixN === 0 && s.phase === 'play') {
    const want = s.pot.length === 0 ? 'water' : s.pot[0].id === 'water' ? 'fire' : 'water';
    const at = s.shelf.findIndex((x) => x?.id === want);
    if (at >= 0) {
      const [fx2, fy2] = slotXY(at);
      drawFinger(ctx, R(fx2 + 0.06), R(fy2 - 0.13), R(0.06), t);
    }
  }
  if (s.phase === 'play' && d.triple && s.pot.length === 2) {
    // 큰 솥: 지금 톡 하면 둘로 끓이기
    const pv = previewOf(s, []);
    previewBubble(ctx, s, R(POT_X + 0.13), R(0.44), R(0.04), t, pv);
    say(ctx, '솥 톡 = 끓이기', R(POT_X - 0.02), R(0.45), Math.max(12, R(0.036)), '#ffffff', OUT, 3.5);
  }
  fx.memo.t = t;
  ctx.restore();

  // ═════════════ 큰 순간 띠 ═════════════
  const bt = bigText.get(s);
  if (bt && t - bt.t < 70) {
    const age = t - bt.t, sc = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (70 - age) / 15);
    const size = Math.min(36, R(0.085));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, R(0.27));
    ctx.rotate(-0.05);
    ctx.scale(sc, sc);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(bt.text).width;
    ctx.font = `900 ${size * 0.5}px system-ui, sans-serif`;
    const sw = ctx.measureText(bt.sub).width;
    const rx = Math.max(tw, sw) / 2 + 22, ry = size * 1.05;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i <= 22; i++) {
      const an = (i / 22) * TAU, q = i % 2 ? 0.88 : 1.07;
      i ? ctx.lineTo(Math.cos(an) * rx * q, Math.sin(an) * ry * q) : ctx.moveTo(Math.cos(an) * rx * q, Math.sin(an) * ry * q);
    }
    ctx.closePath();
    ctx.fill();
    line(ctx, 3);
    say(ctx, bt.text, 0, -size * 0.2, size, bt.col, OUT, 5);
    say(ctx, bt.sub, 0, size * 0.55, size * 0.5, '#4a2c1a', '#ffffff', 3);
    ctx.restore();
  }

  // ═════════════ HUD: 위 띠 ═════════════
  const hb = R(0.085), fs = Math.max(12, R(0.04));
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, '#7a4a28'], [1, '#5e381e']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(255,220,160,.35)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  ctx.textBaseline = 'middle';
  {
    const cx = R(0.05), cy = hb / 2;
    circ(ctx, cx, cy, R(0.03));
    ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe878'], [1, '#f2a91c']);
    ctx.fill();
    line(ctx, 1.6);
    ctx.textAlign = 'center';
    ctx.font = `900 ${fs * 0.9}px system-ui, sans-serif`;
    ctx.fillStyle = '#5b3512';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = '#fff3dc';
    ctx.fillText(d.name, R(0.095), cy + 1);
    const nw = ctx.measureText(d.name).width;
    ctx.font = `700 ${fs * 0.8}px system-ui, sans-serif`;
    ctx.fillStyle = '#e8c89a';
    ctx.fillText(` / ${STAGE_COUNT}판`, R(0.095) + nw, cy + 2);
    // 오른쪽: 하트 · 별
    ctx.textAlign = 'right';
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#ffd23a';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.026), cy, R(0.022));
    ctx.fill();
    line(ctx, 1.2);
    for (let j = 0; j < 3; j++) {
      const hx = w - R(0.03) - sw - R(0.09) - j * R(0.055);
      heartPath(ctx, hx, cy, R(0.019));
      ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(255,255,255,.18)';
      ctx.fill();
      line(ctx, 1.3, 2 - j < s.hearts ? '#7a1020' : 'rgba(255,255,255,.3)');
    }
  }

  // ═════════════ 아래 띠: 물약 병 · 도감 · 별 · 안내 ═════════════
  {
    const ty = R(1.322);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, '#fff6e4'], [1, '#f6e2bc']);
    ctx.fillRect(0, ty, w, h - ty);
    ctx.fillStyle = 'rgba(110,60,25,.35)';
    ctx.fillRect(0, ty, w, 2);
    const fs2 = Math.max(12, R(0.036));
    const r1 = ty + R(0.034);
    ctx.font = `900 ${fs2}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a2c1a';
    ctx.fillText('물약', R(0.03), r1 + 1);
    const x0 = R(0.03) + ctx.measureText('물약').width + R(0.025), n = d.bottles, bw2 = Math.min(R(0.055), (w * 0.62 - x0) / n);
    for (let j = 0; j < n; j++) {
      const bx = x0 + j * bw2 + bw2 / 2, full = j < s.bottles, warn = full && s.bottles <= 1 && s.phase === 'play';
      const just = j === s.bottles && s.phase === 'brew' && s.t - s.brewAt < 10;
      const yy = r1 + 2 - (just ? (10 - (s.t - s.brewAt)) * 0.8 : 0);
      circ(ctx, bx, yy + R(0.006), R(0.014));
      ctx.fillStyle = full ? (warn && t % 30 < 15 ? '#ff7a7a' : '#b06af0') : 'rgba(74,44,26,.12)';
      ctx.fill();
      line(ctx, 1.2, full ? OUT : 'rgba(74,44,26,.3)');
      ctx.fillStyle = full ? '#e8d0ff' : 'rgba(74,44,26,.1)';
      rr(ctx, bx - R(0.005), yy - R(0.016), R(0.01), R(0.012), 2);
      ctx.fill();
      if (full) {
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        circ(ctx, bx - R(0.005), yy + R(0.002), R(0.004));
        ctx.fill();
      }
    }
    // 도감
    ctx.textAlign = 'right';
    const found = [...s.codex].filter((id) => !BY_ID[id].base).length;
    const ctext = `도감 ${found}/${CREATURES}`;
    ctx.fillStyle = '#4a2c1a';
    ctx.fillText(ctext, w - R(0.03), r1 + 1);
    const cw = ctx.measureText(ctext).width;
    rr(ctx, w - R(0.03) - cw - R(0.045), r1 - R(0.015), R(0.032), R(0.03), 3);
    ctx.fillStyle = '#e85a5a';
    ctx.fill();
    line(ctx, 1.2);
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(w - R(0.03) - cw - R(0.04), r1 - R(0.012), R(0.004), R(0.024));
    // 별 조건 (쉬운 말 · 칩, 넘치면 두 줄)
    const play = s.phase === 'play' || s.phase === 'brew' || s.phase === 'pop';
    const labels = d.stars.map((q) => q.label + (q.k === 'new' && play ? ` ${Math.min(s.newN, q.n)}/${q.n}` : q.k === 'within' && play ? ` (${s.mixes}번)` : ''));
    const ok = d.stars.map((q) => (s.phase === 'result' && s.ok ? s.starOk[d.stars.indexOf(q)] : q.k === 'guest' ? s.guestOk : q.k === 'new' ? s.newN >= q.n : false));
    const bad = d.stars.map((q) => (q.k === 'within' ? s.mixes > q.n || (s.mixes >= q.n && !(s.phase === 'result' && s.ok)) && s.phase !== 'intro' && s.mixes > 0 && s.mixes >= q.n && s.phase === 'play' : q.k === 'noboom' ? s.booms > 0 : false));
    ctx.font = `800 ${fs2}px system-ui, sans-serif`;
    const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
    const lines: number[][] = [[]];
    let acc = 0;
    ws.forEach((wd, j) => {
      if (acc + wd > w - R(0.04) && lines[lines.length - 1].length) (lines.push([]), (acc = 0));
      lines[lines.length - 1].push(j);
      acc += wd + R(0.015);
    });
    lines.forEach((ln, li) => {
      const tot = ln.reduce((a2, j) => a2 + ws[j], 0) + R(0.015) * (ln.length - 1);
      let xx = (w - tot) / 2;
      const yy = ty + R(0.088) + li * R(0.056);
      for (const j of ln) {
        const pw = ws[j];
        ctx.fillStyle = ok[j] ? 'rgba(255,210,58,.4)' : 'rgba(110,60,25,.08)';
        rr(ctx, xx, yy - R(0.024), pw, R(0.048), R(0.024));
        ctx.fill();
        line(ctx, 1.3, ok[j] ? '#e8a010' : bad[j] ? 'rgba(110,60,25,.2)' : 'rgba(110,60,25,.4)');
        starPath(ctx, xx + R(0.027), yy, R(0.015));
        ctx.fillStyle = ok[j] ? '#ffd23a' : 'rgba(110,60,25,.35)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = ok[j] ? '#8a4a08' : bad[j] ? 'rgba(74,44,26,.4)' : '#4a2c1a';
        ctx.font = `800 ${fs2}px system-ui, sans-serif`;
        ctx.fillText(labels[j], xx + R(0.05), yy + 1);
        if (bad[j]) {
          ctx.beginPath();
          ctx.moveTo(xx + R(0.05), yy + 1);
          ctx.lineTo(xx + pw - R(0.02), yy + 1);
          line(ctx, 1.5, 'rgba(200,60,80,.6)');
        }
        xx += pw + R(0.015);
      }
    });
    // 안내 한 줄
    let hint = d.tip;
    const first = s.stage === 0 && !s.again && s.mixN === 0;
    if (first) hint = s.pot.length === 0 ? '물 병을 톡!' : '이제 불 병을 톡! 솥이 끓어요';
    else if (s.stage === 0 && !s.again) hint = '아무 병이나 둘 — 새것을 하나 더!';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '연구소 도감 완성 — 최고의 꼬마 마녀!' : `별 ${s.got}개! 다음 판엔 새것이 나와요`) : s.hearts > 0 ? '하트 -1 · 같은 판 다시 — 점을 세어 봐요' : '끝 — 꼬마 마녀가 솥을 닦아요';
    else if (s.phase === 'play' && s.pot.length === 1) hint = d.triple ? '하나 더 넣거나, 둘 다음 솥을 톡' : '하나 더 톡 — 말풍선이 결과 예고';
    else if (s.phase === 'play' && s.pot.length === 2 && d.triple) hint = '셋째를 넣거나, 솥을 톡 해서 끓여요';
    const lastRow = ty + R(0.088) + (lines.length - 1) * R(0.056);
    ctx.font = `900 ${first ? fs2 * 1.15 : fs2}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#e0405a' : '#7a4a28';
    ctx.fillText(hint, w / 2, Math.min(h - R(0.022), lastRow + R(0.06)), w - R(0.04));
  }

  // ═════════════ 판 카드 (시작 · 결과) ═════════════
  {
    let head = '', sub = '', a = 1, age = 0, kind = '';
    if (s.phase === 'intro') {
      age = s.pt;
      a = Math.min(1, age / 6, (INTRO_T - age) / 12);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = s.again ? d.tip : `NEW  ${d.news}`;
      kind = 'intro';
    } else if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      kind = s.ok ? 'ok' : 'fail';
      head = s.ok ? (s.won ? '꼬마 마녀 연구소 대성공!' : `${d.goal ? BY_ID[d.goal].name : '새것 둘'} 성공!`) : `앗… ${s.why}`;
      sub = s.ok ? '' : s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 다음엔 점을 세어 봐요';
    }
    if (head) {
      const cy = kind === 'ok' ? R(0.27) : R(0.46), pop2 = Math.min(1, 0.5 + age / 10);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `900 ${R(0.052)}px system-ui, sans-serif`;
      const w1 = ctx.measureText(head).width;
      ctx.font = `800 ${R(0.038)}px system-ui, sans-serif`;
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.04), Math.max(w1, w2) + R(0.1)), ch = (sub || kind === 'ok' ? R(0.15) : R(0.09)) * pop2;
      ctx.translate(w / 2, cy);
      ctx.scale(pop2, pop2);
      ctx.fillStyle = 'rgba(60,30,10,.3)';
      rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.04));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#f6e2bc']);
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.04));
      ctx.fill();
      line(ctx, 2.5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${R(0.052)}px system-ui, sans-serif`;
      ctx.fillStyle = kind === 'ok' ? '#c46a00' : kind === 'fail' ? '#c0303a' : '#4a2c1a';
      if (kind === 'ok') {
        ctx.fillText(head, 0, -R(0.035), w - R(0.1));
        const nS = s.starOk.length;
        for (let j = 0; j < nS; j++) {
          const ag = s.pt - (16 + j * 14);
          const sx = (j - (nS - 1) / 2) * R(0.09), sy = R(0.032);
          const popS = ag < 0 ? 1 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.033) * popS);
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(74,44,26,.15)';
          ctx.fill();
          line(ctx, 1.8, ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(74,44,26,.35)');
          if (ag === 0 && s.starOk[j]) (fx.burst(w / 2 + sx, cy + sy, '#ffd23a', 18, 3.5, 2.6), fx.kick(3));
        }
      } else {
        ctx.fillText(head, 0, sub ? -R(0.03) : 0, w - R(0.1));
        if (sub) {
          ctx.font = `800 ${R(0.038)}px system-ui, sans-serif`;
          ctx.fillStyle = kind === 'intro' && !s.again ? '#e0405a' : '#7a4a28';
          ctx.fillText(sub, 0, R(0.035), w - R(0.08));
        }
      }
      ctx.restore();
    }
  }
}

/** 시험·스크린샷용: k판(0부터)으로 바로 (앞 판에서 만들었을 법한 것을 도감에 넣는다) */
export function jumpTo(s: LabState, k: number) {
  const pre = ['pup', 'moth', 'rainbow', 'turtle', 'dragon', 'fairy', 'cat', 'fish', 'whale', 'deer', 'unicorn'];
  for (const id of pre.slice(0, Math.min(pre.length, k * 2))) if (!s.codex.has(id)) (s.codex.add(id), s.order.push(id));
  s.stage = k;
  s.again = false;
  newStage(s);
}
