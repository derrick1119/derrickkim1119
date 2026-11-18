/**
 * 자석 해머 로봇 (31라운드: 실시간 액션) — 자석 모아 던지기 × 가리키기 × 연쇄.
 * 조작(손가락 하나, 하는 일 하나): 꾹 누르고 있으면 로봇이 손가락 쪽으로 뚜벅뚜벅 걸으며 해머 끝 말굽자석이 켜지고,
 *   둘레의 쇠붙이(나사·캔·톱니·스프링)가 '윙' 빨려 와 로봇 둘레에 공처럼 붙는다. 떼는 순간 붙은 고철 전부가 손가락 쪽으로
 *   산탄처럼 한꺼번에 흩뿌려진다. 키보드는 화살표 커서 + 스페이스(누르는 동안 모으기, 떼면 와르르).
 * 규칙(결정적, 고정 간격 물리):
 *   - 자석 거리는 누른 시간만큼 넓어진다(MR0 → MRMAX). 붙은 고철 무게(load)만큼 로봇이 느려지고 공이 커져 맞기 쉬워진다.
 *   - 흩뿌림: 고철 n개가 겨눈 방향 ±(0.14+0.02n) 부채꼴로 퍼진다(많을수록 넓고 촘촘). 맞은 로봇은 맞은 쪽으로 데굴데굴
 *     날아가 다른 로봇을 볼링 핀처럼 넘어뜨린다(연쇄). 쓰러진 쇠 로봇은 고철 두 개가 되어 다시 모을 수 있다(순환).
 *   - 다가오는 로봇에 닿으면 체력 -1(붙은 고철 1/3이 떨어진다). 체력을 다 잃으면 하트 -1, 그 판만 다시.
 * 와우: 첫 꾹에 둘레 고철이 윙 빨려 와 반짝이는 공이 되고, 떼자마자 0.5초 안에 앞에 선 고물 로봇 셋이 와르르 볼링 핀처럼 쓰러진다.
 * 판 7개: 목표 = 몰려오는 로봇을 다 쓰러뜨려 마당 지키기. 별(쉬운 말) = 마당 지키기 · 한 번에 N 쓰러뜨리기(2판부터) · 한 번도 안 맞기(3판부터).
 * 펼쳐짐(판마다 하는 일이 바뀐다): 1 고물 로봇(모아 던지기) → 2 큰 고철 덩어리(무겁지만 줄 선 로봇을 꿰뚫음 → 줄 세워 꿰기)
 *   → 3 나무 로봇(자석에 안 끌려오고 두 번 맞아야 → 가까이서 몰아 쏘기) → 4 기름통(맞히면 펑, 둘레가 다 날아감 → 기다렸다 통 쏘기)
 *   → 5 자석 방패 로봇(날아온 고철을 빼앗음 → 크게 모아 과부하시키거나 다른 로봇을 날려 맞히기) → 6 컨베이어(고철이 흘러
 *   분쇄기로 → 줍는 자리 고르기) → 7 대장 크레인(갈고리 그림자 피하며 몸통 맞히기, 떨어뜨린 덩어리를 되던지기).
 * 웃음: 맞은 고물 로봇은 '삐빅?!' 하며 데굴데굴 굴러 눈이 X가 되고, 우리 로봇은 무거우면 >< 힘주고, 맞으면 @@ 어질어질,
 *   한 번에 넷 넘게 쓰러뜨리면 눈이 별로 반짝. 고철 산 꼭대기 고양이가 큰 순간마다 펄쩍.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 마당 평면: 가로 0~W, 세로 0~H (0 = 먼 쪽 울타리, H = 가까운 쪽) */
const W = 1, H = 1.05;
/** 화면 배치(폭 단위): 평면 y → Y0 + y·KY (3/4 시점이라 세로가 눌림) */
const Y0 = 0.4, KY = 0.8;
const RR = 0.04;
const BOLT = 0, CAN = 1, GEAR = 2, SPRING = 3, CHUNK = 4;
const SR = [0.012, 0.014, 0.014, 0.013, 0.03];
const WT = [1, 1, 1, 1, 6];
const DMG = [1, 1, 1, 1, 3];
const GROUND = 0, PULL = 1, STUCK = 2, FLY = 3, STOLEN = 4, GONE = 5;
const BOT = 0, WOOD = 1, SHIELD = 2, BOSS = 3;
const WALK = 0, TUMBLE = 1, DOWN = 2, DEAD = 3;
const ER = [0.036, 0.038, 0.04, 0.1];
const HPK = [1, 2, 2, 50];
const FSPD = [0.0016, 0.0013, 0.0012, 0];
/** 로봇 걸음: VR ÷ (1 + KL·무게) */
const VR = 0.0068, KL = 0.06;
/** 자석 거리: MR0 + MRG·누른 틱 (MRMAX까지) · 공에 붙는 무게 한도 */
const MR0 = 0.13, MRG = 0.005, MRMAX = 0.46, CAP = 36;
/** 1판 처음 10초는 보호막(로봇이 닿아도 튕겨 나감) */
const SHIELD_T = 600;
const FV = 0.021, FV_CHUNK = 0.018, FR_FLY = 0.965, FR_CHUNK = 0.975, LAND_V = 0.0045;
const TUMBLE_FR = 0.955;
const FIELD_R = 0.13, SHIELD_CAP = 7;
const DRUM_R = 0.032, BOOM_R = 0.17;
const BELT_Y0 = 0.3, BELT_Y1 = 0.42, BELT_V = 0.0028;
const HOOK_EVERY = 150, HOOK_WARN = 85;
const RESULT_OK = 160, RESULT_FAIL = 150, CARD_T = 200, NEWS_T = 170;
const BR = (load: number) => RR + 0.01 + 0.0068 * Math.sqrt(load);
const spread = (n: number) => Math.min(0.62, 0.14 + 0.02 * n);
const mrOf = (holdT: number) => Math.min(MRMAX, MR0 + MRG * holdT);
const KNUM = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

type Side = 'T' | 'L' | 'R' | 'B';
interface Wave { at: number; n: number; k: number; side: Side; form: 'clump' | 'line' | 'spread'; lead?: number; mix?: number; x?: number; y?: number }
interface StageDef {
  key: string; name: string; news: string; tip: string; nstar: number; multi: number; hp: number; spd: number;
  scrap: number; near: number; chunks: number; drums?: number[][]; belt?: boolean; boss?: boolean; waves: Wave[]; puddles: number[][];
}

/** 판 7개 (좌우는 시드로 뒤집는다) */
export const STAGES: StageDef[] = [
  {
    key: 'yard', name: '첫 마당', news: '꾹 누르면 고철이 윙! 떼면 와르르!', tip: '로봇 쪽을 꾹 누르고 → 떼면 그쪽으로 와르르',
    nstar: 1, multi: 3, hp: 5, spd: 0.62, scrap: 26, near: 14, chunks: 0,
    waves: [
      { at: 0, n: 3, k: BOT, side: 'T', form: 'clump', x: 0.5, y: 0.2 },
      { at: 9, n: 3, k: BOT, side: 'T', form: 'clump', x: 0.25, y: -0.06 },
      { at: 16, n: 3, k: BOT, side: 'T', form: 'clump', x: 0.75, y: -0.06 },
    ],
    puddles: [[0.2, 0.3, 0.09], [0.8, 0.82, 0.08]],
  },
  {
    key: 'chunk', name: '큰 고철 덩어리', news: '큰 덩어리는 줄 선 로봇을 꿰뚫어요', tip: '덩어리를 모아 줄 선 로봇 쪽으로 던져요',
    nstar: 2, multi: 5, hp: 4, spd: 0.75, scrap: 20, near: 10, chunks: 2,
    waves: [
      { at: 0.5, n: 5, k: BOT, side: 'T', form: 'line' },
      { at: 9, n: 5, k: BOT, side: 'L', form: 'line' },
      { at: 15, n: 5, k: BOT, side: 'R', form: 'line' },
    ],
    puddles: [[0.78, 0.25, 0.08], [0.18, 0.88, 0.09]],
  },
  {
    key: 'wood', name: '나무 로봇', news: '나무 로봇: 자석 안 통함, 두 번 맞혀요', tip: '나무 로봇은 가까이서 몰아 쏴요',
    nstar: 3, multi: 5, hp: 3, spd: 1.0, scrap: 26, near: 10, chunks: 1,
    waves: [
      { at: 0.5, n: 5, k: BOT, side: 'T', form: 'spread', mix: 2 },
      { at: 1, n: 3, k: WOOD, side: 'L', form: 'spread' },
      { at: 1.5, n: 3, k: BOT, side: 'R', form: 'clump', mix: 3 },
      { at: 11, n: 4, k: BOT, side: 'B', form: 'clump', mix: 2 },
      { at: 11.5, n: 4, k: WOOD, side: 'T', form: 'clump' },
    ],
    puddles: [[0.15, 0.2, 0.08], [0.85, 0.75, 0.09]],
  },
  {
    key: 'drum', name: '기름통', news: '기름통을 맞히면 펑! 둘레가 날아가요', tip: '로봇이 기름통 옆에 올 때 통을 쏴요',
    nstar: 3, multi: 6, hp: 3, spd: 1.05, scrap: 24, near: 10, chunks: 1,
    drums: [[0.5, 0.3], [0.2, 0.62], [0.8, 0.6], [0.5, 0.96]],
    waves: [
      { at: 0.5, n: 5, k: BOT, side: 'T', form: 'clump' },
      { at: 1, n: 4, k: BOT, side: 'L', form: 'clump' },
      { at: 1.5, n: 3, k: BOT, side: 'R', form: 'clump' },
      { at: 11, n: 5, k: BOT, side: 'B', form: 'clump', mix: 3 },
      { at: 11.5, n: 4, k: BOT, side: 'L', form: 'spread' },
    ],
    puddles: [[0.82, 0.2, 0.07], [0.15, 0.95, 0.08]],
  },
  {
    key: 'shield', name: '자석 방패 로봇', news: '빨간 자석 로봇은 내 고철을 빼앗아요', tip: '일곱 개 넘게 한 번에! 방패가 넘쳐요',
    nstar: 3, multi: 5, hp: 3, spd: 1.1, scrap: 28, near: 12, chunks: 1,
    waves: [
      { at: 0.5, n: 4, k: BOT, side: 'T', form: 'clump', lead: SHIELD },
      { at: 1, n: 4, k: BOT, side: 'L', form: 'clump', mix: 3 },
      { at: 1.5, n: 3, k: BOT, side: 'R', form: 'clump' },
      { at: 11, n: 5, k: BOT, side: 'B', form: 'clump', lead: SHIELD },
      { at: 11.5, n: 4, k: BOT, side: 'T', form: 'spread', mix: 3 },
    ],
    puddles: [[0.2, 0.25, 0.08], [0.8, 0.9, 0.08]],
  },
  {
    key: 'belt', name: '컨베이어', news: '컨베이어 고철은 분쇄기로 사라져요', tip: '컨베이어 위 고철은 금방 사라져요',
    nstar: 3, multi: 6, hp: 3, spd: 1.12, scrap: 18, near: 8, chunks: 1, belt: true,
    waves: [
      { at: 0.5, n: 5, k: BOT, side: 'T', form: 'clump', mix: 2 },
      { at: 1, n: 3, k: BOT, side: 'L', form: 'clump', mix: 2 },
      { at: 1.5, n: 3, k: BOT, side: 'R', form: 'clump' },
      { at: 11, n: 4, k: BOT, side: 'T', form: 'spread', lead: SHIELD },
      { at: 11.5, n: 4, k: BOT, side: 'B', form: 'clump', mix: 2 },
    ],
    puddles: [[0.15, 0.75, 0.08], [0.85, 0.95, 0.07]],
  },
  {
    key: 'crane', name: '대장 크레인', news: '갈고리 그림자를 피해 크레인을 쳐요', tip: '그림자 밖으로! 큰 덩어리로 크레인 몸통을 쳐요',
    nstar: 3, multi: 4, hp: 3, spd: 1.12, scrap: 24, near: 10, chunks: 1, boss: true,
    drums: [[0.25, 0.42], [0.75, 0.42]],
    waves: [],
    puddles: [[0.15, 0.85, 0.08], [0.85, 0.7, 0.07]],
  },
];
export const STAGE_COUNT = STAGES.length;
const STAR_TEXT = (d: StageDef, k: number) => (k === 0 ? '마당 지키기' : k === 1 ? `한 번에 ${KNUM[d.multi]} 쓰러뜨리기` : '한 번도 안 맞기');

interface Scrap {
  id: number; k: number; x: number; y: number; vx: number; vy: number; st: number;
  /** 공에 붙은 자리: 방위각 a(공 회전 기준) · 높이각 e · 반지름 rr */
  a: number; e: number; rr: number;
  tid: number; spent: boolean; life: number; rot: number; vr: number; owner: number; hop: number; last: number; v: number;
}
interface Foe {
  id: number; k: number; x: number; y: number; vx: number; vy: number; hp: number; st: number; t: number;
  spin: number; vs: number; stun: number; tid: number; load: number; face: number; hitT: number; ph: number; bump: number;
}
interface Drum { x: number; y: number; fuse: number; gone: boolean; tid: number }
interface Hook { tx: number; ty: number; t: number; phase: number }
interface Ev { id: number; t: number; kind: string; x: number; y: number; n?: number; text?: string }
interface LogRow { stage: number; ok: boolean; got: number; starOk: boolean[]; t: number; best: number; hits: number }

export interface MagState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number; stT: number;
  jit: { flip: boolean }[];
  rx: number; ry: number; rvx: number; rvy: number; hp: number; hpMax: number; inv: number; face: number; aimA: number; walk: number; swing: number; bRot: number;
  down: boolean; lock: boolean; holdT: number; tx: number; ty: number; presses: number; pressAt: { x: number; y: number }[];
  scraps: Scrap[]; foes: Foe[]; drums: Drum[]; hook: Hook | null; nid: number;
  wave: number; lastSpawn: number; emptyT: number; chute: number; bossT: number; minion: number;
  tid: number; tally: Record<number, number>; best: number; hits: number; knocked: number; throws: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  freeze: number; slow: number; shield: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[]; eid: number;
  firstPressT: number; firstBigT: number; log: LogRow[]; stagePress: number;
}

const ev = (s: MagState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ id: ++s.eid, t: s.t, kind, x, y, n, text });
function see(s: MagState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const angDiff = (a: number, b: number) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const onBelt = (s: MagState, y: number) => !!STAGES[s.stage].belt && y > BELT_Y0 && y < BELT_Y1;
export function loadOf(s: MagState) {
  let l = 0;
  for (const c of s.scraps) if (c.st === STUCK) l += WT[c.k];
  return l;
}
const ballCount = (s: MagState) => s.scraps.reduce((a, c) => a + (c.st === STUCK || c.st === PULL ? 1 : 0), 0);
function toPlane(sx: number, sy: number) {
  return { x: clamp(sx, -0.05, W + 0.05), y: clamp((sy - Y0) / KY, -0.05, H + 0.05) };
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function addScrap(s: MagState, k: number, x: number, y: number): Scrap {
  const c: Scrap = { id: ++s.nid, k, x, y, vx: 0, vy: 0, st: GROUND, a: 0, e: 0, rr: 0, tid: 0, spent: true, life: 0, rot: s.rng() * 6.28, vr: 0, owner: -1, hop: 0, last: -1, v: Math.floor(s.rng() * 3) };
  s.scraps.push(c);
  return c;
}
const liveScrap = (s: MagState) => s.scraps.reduce((a, c) => a + (c.st === GONE ? 0 : 1), 0);
const randKind = (s: MagState) => [BOLT, CAN, GEAR, SPRING, BOLT, CAN][Math.floor(s.rng() * 6)];

function newStage(s: MagState) {
  const d = STAGES[s.stage], fl = s.jit[s.stage].flip;
  const fx = (x: number) => (fl ? W - x : x);
  s.phase = 'play';
  s.pt = 0;
  s.stT = 0;
  s.rx = 0.5;
  s.ry = d.boss ? 0.78 : 0.7;
  s.rvx = s.rvy = 0;
  s.hp = s.hpMax = d.hp;
  s.inv = 0;
  s.aimA = -Math.PI / 2;
  s.face = 1;
  s.holdT = 0;
  s.lock = s.lock || s.down;
  s.down = false;
  s.scraps = [];
  s.foes = [];
  s.hook = null;
  s.wave = 0;
  s.lastSpawn = 0;
  s.emptyT = 0;
  s.chute = 0;
  s.bossT = 0;
  s.minion = 0;
  s.tally = {};
  s.best = 0;
  s.hits = 0;
  s.knocked = 0;
  s.starOk = [false, false, false];
  s.shield = s.stage === 0 ? SHIELD_T : 0;
  s.stagePress = s.presses;
  s.drums = (d.drums ?? []).map(([x, y]) => ({ x: fx(x), y, fuse: 0, gone: false, tid: 0 }));
  // 로봇 둘레(첫 꾹에 바로 빨려 오는 거리)와 마당 여기저기에 고철
  for (let k = 0; k < d.near; k++) {
    const a = (k / d.near) * Math.PI * 2 + s.rng() * 0.35, r = 0.075 + s.rng() * 0.075;
    addScrap(s, randKind(s), clamp(s.rx + Math.cos(a) * r, 0.04, 0.96), clamp(s.ry + Math.sin(a) * r * 0.9, 0.04, H - 0.04));
  }
  let guard = 0;
  for (let k = d.near; k < d.scrap && guard < 400; guard++) {
    const x = 0.05 + s.rng() * 0.9, y = 0.05 + s.rng() * (H - 0.1);
    if (Math.hypot(x - s.rx, y - s.ry) < 0.2) continue;
    if (d.belt && y > BELT_Y0 - 0.02 && y < BELT_Y1 + 0.02) continue;
    if (s.drums.some((q) => Math.hypot(q.x - x, q.y - y) < 0.06)) continue;
    addScrap(s, randKind(s), x, y);
    k++;
  }
  for (let k = 0; k < d.chunks; k++) {
    const a = (fl ? Math.PI : 0) + (k ? Math.PI * 0.75 : -Math.PI * 0.2) + s.rng() * 0.3, r = 0.2 + s.rng() * 0.05;
    addScrap(s, CHUNK, clamp(s.rx + Math.cos(a) * r, 0.08, 0.92), clamp(s.ry + Math.sin(a) * r, 0.1, H - 0.08));
  }
  if (d.boss) s.foes.push(mkFoe(s, BOSS, 0.5, 0.085));
  if (d.key) s.seen.add(d.key);
}

function mkFoe(s: MagState, k: number, x: number, y: number): Foe {
  return { id: ++s.nid, k, x, y, vx: 0, vy: 0, hp: HPK[k], st: WALK, t: 0, spin: 0, vs: 0, stun: 0, tid: 0, load: 0, face: x < s.rx ? 1 : -1, hitT: -99, ph: s.rng() * 100, bump: -1 };
}

function spawnWave(s: MagState, w: Wave) {
  const fl = s.jit[s.stage].flip;
  let side = w.side;
  if (fl && side === 'L') side = 'R';
  else if (fl && side === 'R') side = 'L';
  let cx: number, cy: number;
  if (w.x !== undefined && w.y !== undefined) (cx = fl ? W - w.x : w.x), (cy = w.y);
  else if (side === 'T') (cx = 0.3 + s.rng() * 0.4), (cy = -0.07);
  else if (side === 'B') (cx = 0.3 + s.rng() * 0.4), (cy = H + 0.07);
  else (cx = side === 'L' ? -0.07 : W + 0.07), (cy = 0.25 + s.rng() * 0.45);
  const dx = s.rx - cx, dy = s.ry - cy, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
  for (let i = 0; i < w.n; i++) {
    let ox = 0, oy = 0;
    if (w.form === 'line') (ox = -ux * i * 0.11), (oy = -uy * i * 0.11);
    else if (w.form === 'spread') {
      const o = (i - (w.n - 1) / 2) * 0.17;
      (ox = -uy * o), (oy = ux * o);
    } else if (i > 0) {
      const a = Math.atan2(-uy, -ux) + ((i - 1) / Math.min(6, w.n - 1)) * Math.PI * 2 + 0.5, r = i <= 6 ? 0.075 : 0.15;
      (ox = Math.cos(a) * r), (oy = Math.sin(a) * r);
    }
    const k = i === 0 && w.lead !== undefined ? w.lead : w.mix && i % w.mix === w.mix - 1 ? WOOD : w.k;
    s.foes.push(mkFoe(s, k, cx + ox, cy + oy));
  }
  if (w.k === WOOD || w.mix) see(s, 'wood', '');
  if (w.lead === SHIELD) see(s, 'shield', '');
}

// ───────────────────────────── 손짓 ─────────────────────────────
function press(s: MagState) {
  s.down = true;
  s.holdT = 0;
  s.presses++;
  s.pressAt.push({ x: s.tx, y: s.ty });
  if (s.pressAt.length > 400) s.pressAt.shift();
  if (s.firstPressT < 0) s.firstPressT = s.t;
  ev(s, 'press', s.rx, s.ry);
  see(s, 'pull', '오래 누를수록 멀리서도 고철이 윙!');
}

const inYard = (f: Foe) => f.x > 0.01 && f.x < W - 0.01 && f.y > 0.01 && f.y < H - 0.01;

/** 던질 고철 하나하나의 출발 자리·방향 (흩뿌림과 미리 보기가 같은 계획을 쓴다) */
function throwPlan(s: MagState, aim0: number) {
  const ps = s.scraps.filter((c) => c.st === STUCK || c.st === PULL).sort((a, b) => a.id - b.id);
  const n = ps.length, aim = assist(s, aim0), sp = spread(n), br = BR(loadOf(s)), ca = Math.cos(aim), sa = Math.sin(aim);
  const list = ps.map((c, k) => {
    const f = n === 1 ? 0 : (k / (n - 1)) * 2 - 1, st = c.st === STUCK;
    return { c, ang: aim + sp * f, x: st ? s.rx + ca * br * 0.6 + (c.x - s.rx) * 0.4 : c.x, y: st ? s.ry + sa * br * 0.6 + (c.y - s.ry) * 0.4 : c.y };
  });
  return { aim, list };
}

/** 손 도움(휴대폰 손가락): 겨눈 쪽 ±0.24 안에 로봇이 있으면 그쪽으로 70% 당겨 준다 */
function assist(s: MagState, aim: number) {
  let best = aim, bd = 9;
  for (const f of s.foes) {
    if (f.st !== WALK || !inYard(f)) continue;
    const dx = f.x - s.rx, dy = f.y - s.ry, d = Math.hypot(dx, dy);
    if (d > 0.6 || d < 0.02) continue;
    const da = angDiff(Math.atan2(dy, dx), aim), lim = d < 0.22 ? 0.75 : 0.24;
    if (Math.abs(da) < Math.min(bd, lim)) (bd = Math.abs(da)), (best = aim + da * (d < 0.22 ? 1 : 0.7));
  }
  return best;
}

function fling(s: MagState) {
  const { aim, list } = throwPlan(s, s.aimA), n = list.length, load = loadOf(s);
  if (!n) return void ev(s, 'empty', s.rx, s.ry);
  const tid = ++s.tid;
  s.tally[tid] = 0;
  s.throws++;
  for (const { c, ang: a0, x, y } of list) {
    const ang = a0 + (s.rng() - 0.5) * 0.05;
    const v = (c.k === CHUNK ? FV_CHUNK : FV) * (0.9 + s.rng() * 0.2);
    c.x = x;
    c.y = y;
    c.vx = Math.cos(ang) * v;
    c.vy = Math.sin(ang) * v;
    c.st = FLY;
    c.tid = tid;
    c.spent = false;
    c.life = 0;
    c.last = -1;
    c.vr = (s.rng() - 0.5) * 0.7;
  }
  s.rvx -= Math.cos(aim) * Math.min(0.006, 0.0015 + load * 0.00012);
  s.rvy -= Math.sin(aim) * Math.min(0.006, 0.0015 + load * 0.00012);
  s.swing = 18;
  s.aimA = aim;
  s.face = Math.cos(aim) >= 0 ? 1 : -1;
  ev(s, 'fling', s.rx, s.ry, n);
  see(s, 'fling', '');
}

function release(s: MagState) {
  s.down = false;
  if (s.phase === 'play') fling(s);
  s.holdT = 0;
}

// ───────────────────────────── 맞히기·쓰러뜨리기 ─────────────────────────────
function bossHit(s: MagState, f: Foe, dmg: number) {
  if (f.st !== WALK) return;
  f.hp -= dmg;
  f.hitT = s.t;
  s.pts += dmg * 5;
  ev(s, 'bossHit', f.x, f.y + 0.02, dmg);
  if (f.hp > 0) return;
  f.st = DOWN;
  f.t = 0;
  ev(s, 'bossDown', f.x, f.y);
  s.slow = Math.max(s.slow, 70);
  s.freeze = Math.max(s.freeze, 6);
  for (const o of s.foes) if (o !== f && o.st === WALK) knock(s, o, (o.x - f.x) * 0.03, 0.01, 0, 9, 'boom');
}

/** 로봇 하나를 친다. 쓰러지면(체력 0) 맞은 쪽으로 데굴데굴 — 그 던지기(tid)의 쓰러뜨린 수가 하나 는다 */
function knock(s: MagState, f: Foe, vx: number, vy: number, tid: number, dmg: number, src: 'shot' | 'roll' | 'boom'): boolean {
  if (f.st !== WALK) return false;
  if (f.k === BOSS) return bossHit(s, f, src === 'roll' ? 2 : src === 'boom' ? 4 : dmg), false;
  f.hp -= dmg;
  f.hitT = s.t;
  const sp = Math.hypot(vx, vy) || 1e-6;
  if (f.hp > 0) {
    f.vx += vx * 0.35;
    f.vy += vy * 0.35;
    f.stun = 22;
    ev(s, 'dent', f.x, f.y, 0, f.k === WOOD ? '딱!' : '깡!');
    return false;
  }
  const cap = Math.min(1, 0.017 / sp);
  f.vx = vx * (src === 'shot' ? 0.62 : 1) * cap;
  f.vy = vy * (src === 'shot' ? 0.62 : 1) * cap;
  f.st = TUMBLE;
  f.t = 0;
  f.tid = tid;
  f.vs = (vx >= 0 ? 1 : -1) * (0.18 + s.rng() * 0.12);
  const n = (s.tally[tid] = (s.tally[tid] ?? 0) + 1);
  s.knocked++;
  if (tid > 0) s.best = Math.max(s.best, n);
  s.pts += 3 + (n >= 3 ? (n - 2) * 8 : 0);
  s.freeze = Math.max(s.freeze, n >= 3 ? 3 : 2);
  if (n >= 4) s.slow = Math.max(s.slow, 26);
  if (n >= 3 && s.firstBigT < 0) s.firstBigT = s.t;
  ev(s, 'knock', f.x, f.y, tid > 0 ? n : 0, src);
  if (src === 'roll') see(s, 'chain', '쓰러진 로봇이 옆 로봇도 넘어뜨려요!');
  return true;
}

function hitRobot(s: MagState, fx: number, fy: number) {
  if (s.phase !== 'play') return;
  if (s.shield > 0) return void ev(s, 'bubble', s.rx, s.ry);
  if (s.inv > 0) return void ev(s, 'bonk', fx, fy);
  const dx = fx - s.rx, dy = fy - s.ry, d = Math.hypot(dx, dy) || 1e-6;
  s.hp--;
  s.inv = 80;
  s.hits++;
  s.rvx -= (dx / d) * 0.006;
  s.rvy -= (dy / d) * 0.006;
  const st = s.scraps.filter((c) => c.st === STUCK);
  const off = Math.ceil(st.length / 3);
  for (let k = 0; k < off; k++) {
    const c = st[st.length - 1 - k], a = s.rng() * Math.PI * 2;
    c.st = FLY;
    c.spent = true;
    c.tid = 0;
    c.vx = Math.cos(a) * 0.009;
    c.vy = Math.sin(a) * 0.009;
  }
  s.freeze = Math.max(s.freeze, 4);
  ev(s, 'ouch', s.rx, s.ry, s.hp);
  if (s.hp <= 0) endStage(s, false, '로봇이 고장 났어요!');
}

function capture(s: MagState, f: Foe, c: Scrap) {
  c.st = STOLEN;
  c.owner = f.id;
  c.a = s.rng() * Math.PI * 2;
  c.e = (s.rng() - 0.5) * 1.2;
  f.load++;
  ev(s, 'steal', f.x, f.y, f.load);
  if (f.load >= SHIELD_CAP) {
    f.hp = 1;
    ev(s, 'overload', f.x, f.y);
    knock(s, f, c.vx * 0.5, c.vy * 0.5, c.tid, 9, 'shot');
  }
}

function ignite(s: MagState, d: Drum, tid: number, fuse = 7) {
  if (d.gone || d.fuse > 0) return;
  d.fuse = fuse;
  d.tid = tid;
  ev(s, 'fuse', d.x, d.y);
}

function explode(s: MagState, d: Drum) {
  d.gone = true;
  ev(s, 'boom', d.x, d.y);
  see(s, 'boom', '');
  for (const f of s.foes) {
    if (f.st === DEAD) continue;
    const dx = f.x - d.x, dy = f.y - d.y, dd = Math.hypot(dx, dy) || 1e-6;
    if (dd > BOOM_R + ER[f.k]) continue;
    const pw = 0.007 + 0.013 * Math.max(0, 1 - dd / (BOOM_R + 0.04));
    if (f.st === WALK) knock(s, f, (dx / dd) * pw, (dy / dd) * pw, d.tid, 9, 'boom');
    else if (f.k !== BOSS) (f.st = TUMBLE), (f.t = 0), (f.vx += (dx / dd) * pw), (f.vy += (dy / dd) * pw);
  }
  for (const c of s.scraps) {
    if (c.st !== GROUND) continue;
    const dx = c.x - d.x, dy = c.y - d.y, dd = Math.hypot(dx, dy) || 1e-6;
    if (dd > BOOM_R) continue;
    c.st = FLY;
    c.spent = true;
    c.tid = 0;
    c.vx = (dx / dd) * 0.012;
    c.vy = (dy / dd) * 0.012;
  }
  if (Math.hypot(s.rx - d.x, s.ry - d.y) < BOOM_R * 0.8) hitRobot(s, d.x, d.y);
  for (const o of s.drums) if (!o.gone && o !== d && Math.hypot(o.x - d.x, o.y - d.y) < BOOM_R + DRUM_R) ignite(s, o, d.tid, 6);
  s.freeze = Math.max(s.freeze, 4);
  s.slow = Math.max(s.slow, 30);
}

function breakFoe(s: MagState, f: Foe) {
  f.st = DEAD;
  ev(s, 'pop', f.x, f.y, f.k);
  if (f.k === BOT || f.k === SHIELD) {
    const n = liveScrap(s) < 60 ? 2 : liveScrap(s) < 72 ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const c = addScrap(s, randKind(s), clamp(f.x, 0.03, 0.97), clamp(f.y, 0.03, H - 0.03)), a = s.rng() * Math.PI * 2;
      c.vx = Math.cos(a) * 0.006;
      c.vy = Math.sin(a) * 0.006;
      c.hop = 14;
    }
    if (n) see(s, 'recycle', '쓰러진 쇠 로봇은 다시 고철이 돼요');
  }
}

// ───────────────────────────── 한 틱 ─────────────────────────────
function robotStep(s: MagState) {
  const load = loadOf(s), vmax = VR / (1 + KL * load), d = STAGES[s.stage];
  let wx = 0, wy = 0;
  if (s.down) {
    const ex = s.tx - s.rx, ey = s.ty - s.ry, dd = Math.hypot(ex, ey);
    if (dd > 0.035) s.aimA = Math.atan2(ey, ex);
    if (dd > 0.01) {
      const sp = Math.min(vmax, dd * 0.12);
      (wx = (ex / dd) * sp), (wy = (ey / dd) * sp);
    }
    if (Math.abs(ex) > 0.02) s.face = ex > 0 ? 1 : -1;
  }
  s.rvx += (wx - s.rvx) * 0.2;
  s.rvy += (wy - s.rvy) * 0.2;
  s.rx += s.rvx;
  s.ry += s.rvy;
  if (onBelt(s, s.ry)) s.rx += BELT_V;
  for (const q of s.drums) {
    if (q.gone) continue;
    const dx = s.rx - q.x, dy = s.ry - q.y, dd = Math.hypot(dx, dy), m = RR + DRUM_R;
    if (dd < m && dd > 1e-6) (s.rx = q.x + (dx / dd) * m), (s.ry = q.y + (dy / dd) * m);
  }
  s.rx = clamp(s.rx, 0.07, W - 0.07);
  s.ry = clamp(s.ry, d.boss ? 0.26 : 0.06, H - 0.04);
  s.walk += Math.hypot(s.rvx, s.rvy) * 95;
  if (!s.down && Math.abs(s.rvx) > 0.0006) s.face = s.rvx > 0 ? 1 : -1;
  if (s.inv > 0) s.inv--;
  if (s.shield > 0) s.shield--;
  if (s.swing > 0) s.swing--;
  s.bRot += s.down ? 0.035 : 0.012;
  if (load >= 16) see(s, 'heavy', '많이 붙이면 무거워 느려져요!');
}

function scrapStep(s: MagState) {
  let load = loadOf(s), br = BR(load);
  const mr = s.down && s.phase === 'play' ? mrOf(s.holdT) : 0;
  for (const c of s.scraps) {
    if (c.st === GROUND) {
      if (c.hop > 0) c.hop--;
      if (c.vx || c.vy) {
        c.x = clamp(c.x + c.vx, 0.015, W - 0.015);
        c.y = clamp(c.y + c.vy, 0.015, H - 0.015);
        c.vx *= 0.85;
        c.vy *= 0.85;
        if (Math.abs(c.vx) + Math.abs(c.vy) < 0.0002) c.vx = c.vy = 0;
      }
      if (onBelt(s, c.y)) {
        c.x += BELT_V;
        c.rot += 0.02;
        if (c.x > W - 0.01) {
          c.st = GONE;
          ev(s, 'crush', W - 0.02, c.y);
          see(s, 'crush', '');
          continue;
        }
      }
      if (mr > 0 && load < CAP && (c.x - s.rx) ** 2 + (c.y - s.ry) ** 2 < mr * mr) (c.st = PULL), (c.vx = 0), (c.vy = 0);
    } else if (c.st === PULL) {
      const dx = s.rx - c.x, dy = s.ry - c.y, d = Math.hypot(dx, dy) || 1e-6, acc = c.k === CHUNK ? 0.0011 : 0.0032;
      c.vx = c.vx * 0.88 + (dx / d) * acc;
      c.vy = c.vy * 0.88 + (dy / d) * acc;
      c.x += c.vx;
      c.y += c.vy;
      c.rot += 0.25;
      if (d < br * 0.95 + SR[c.k] * 0.5) {
        // 공 표면에 고르게(R2 수열) 붙는다 — 한쪽에서 온 고철도 공 전체를 덮는다
        const idx = s.scraps.reduce((a, q) => a + (q.st === STUCK ? 1 : 0), 0);
        c.st = STUCK;
        c.a = ((idx * 0.7548776662 + 0.5) % 1) * Math.PI * 2 - s.bRot;
        c.e = Math.asin(((idx * 0.569840291 + 0.5) % 1) * 1.8 - 0.9);
        c.rr = br - SR[c.k] * 0.2;
        load += WT[c.k];
        br = BR(load);
        if (load % 4 === 0 || c.k === CHUNK) ev(s, 'clink', s.rx, s.ry, load);
      }
    } else if (c.st === STUCK) {
      const a = c.a + s.bRot, ce = Math.cos(c.e);
      c.x = s.rx + Math.cos(a) * c.rr * ce;
      c.y = s.ry + Math.sin(a) * c.rr * ce;
    } else if (c.st === FLY) flyStep(s, c);
    else if (c.st === STOLEN) {
      const f = s.foes.find((o) => o.id === c.owner);
      if (!f || f.st === DEAD) {
        const a = s.rng() * Math.PI * 2;
        c.st = FLY;
        c.spent = true;
        c.tid = 0;
        c.vx = Math.cos(a) * 0.007;
        c.vy = Math.sin(a) * 0.007;
      } else {
        c.x = f.x + f.face * 0.03 + Math.cos(c.a) * 0.018;
        c.y = f.y + Math.sin(c.a) * 0.012;
      }
    }
  }
  if (s.scraps.length > 100) s.scraps = s.scraps.filter((c) => c.st !== GONE);
}

function flyStep(s: MagState, c: Scrap) {
  c.x += c.vx;
  c.y += c.vy;
  c.life++;
  c.rot += c.vr;
  const fr = c.k === CHUNK ? FR_CHUNK : FR_FLY;
  c.vx *= fr;
  c.vy *= fr;
  if (c.x < 0.015) (c.x = 0.015), (c.vx = Math.abs(c.vx) * 0.45);
  if (c.x > W - 0.015) (c.x = W - 0.015), (c.vx = -Math.abs(c.vx) * 0.45);
  if (c.y < 0.015) (c.y = 0.015), (c.vy = Math.abs(c.vy) * 0.45);
  if (c.y > H - 0.015) (c.y = H - 0.015), (c.vy = -Math.abs(c.vy) * 0.45);
  if (!c.spent) {
    if (c.k !== CHUNK)
      for (const f of s.foes) {
        if (f.k !== SHIELD || f.st !== WALK) continue;
        const dx = f.x - c.x, dy = f.y - c.y, d = Math.hypot(dx, dy) || 1e-6;
        if (d < FIELD_R) {
          c.vx += (dx / d) * 0.0024;
          c.vy += (dy / d) * 0.0024;
          if (d < ER[SHIELD] + 0.014) {
            capture(s, f, c);
            return;
          }
        }
      }
    for (const f of s.foes) {
      if (f.st !== WALK || f.id === c.last) continue;
      const r = ER[f.k] + SR[c.k], dx = f.x - c.x, dy = f.y - c.y;
      if (dx * dx + dy * dy > r * r) continue;
      c.last = f.id;
      if (f.k === BOSS) {
        bossHit(s, f, DMG[c.k]);
        if (c.k !== CHUNK) (c.spent = true), (c.vx *= -0.3), (c.vy = Math.abs(c.vy) * 0.3);
        else (c.vx *= 0.3), (c.vy *= 0.3);
        break;
      }
      knock(s, f, c.vx, c.vy, c.tid, DMG[c.k], 'shot');
      if (c.k === CHUNK) (c.vx *= 0.85), (c.vy *= 0.85);
      else {
        c.spent = true;
        c.vx = -c.vx * 0.22 + c.vy * 0.2;
        c.vy = -c.vy * 0.22 - c.vx * 0.2;
      }
      break;
    }
    for (const q of s.drums) {
      if (q.gone || q.fuse > 0 || Math.hypot(q.x - c.x, q.y - c.y) > DRUM_R + SR[c.k]) continue;
      ignite(s, q, c.tid);
      if (c.k !== CHUNK) (c.spent = true), (c.vx *= -0.3), (c.vy *= -0.3);
    }
  }
  if (c.vx * c.vx + c.vy * c.vy < LAND_V * LAND_V) {
    c.st = GROUND;
    c.hop = 10;
    c.vx *= 0.4;
    c.vy *= 0.4;
    c.spent = true;
  }
}

function foeStep(s: MagState) {
  const d = STAGES[s.stage], br = BR(loadOf(s)), mr = s.down ? mrOf(s.holdT) : 0, play = s.phase === 'play';
  for (const f of s.foes) {
    if (f.st === DEAD) continue;
    if (f.k === BOSS) {
      bossStep(s, f);
      continue;
    }
    if (f.st === WALK) {
      f.ph++;
      if (!play) {
        f.vx *= 0.8;
        f.vy *= 0.8;
        continue;
      }
      if (f.stun > 0) {
        f.stun--;
        f.x += f.vx;
        f.y += f.vy;
        f.vx *= 0.86;
        f.vy *= 0.86;
      } else {
        const dx = s.rx - f.x, dy = s.ry - f.y, dd = Math.hypot(dx, dy) || 1e-6;
        let sp = FSPD[f.k] * d.spd;
        if (f.k === BOT && s.stage > 0 && mr > 0 && dd < mr && s.holdT > 20) sp += 0.0007 * (1 - dd / mr);
        const wob = Math.sin(f.ph * 0.07 + f.id) * 0.3, ux = dx / dd, uy = dy / dd;
        f.vx += ((ux - uy * wob) * sp - f.vx) * 0.12;
        f.vy += ((uy + ux * wob) * sp - f.vy) * 0.12;
        f.x += f.vx;
        f.y += f.vy;
        if (Math.abs(f.vx) > 0.0003) f.face = f.vx > 0 ? 1 : -1;
      }
      if (onBelt(s, f.y) && f.x > 0 && f.x < W) f.x += BELT_V;
      for (const o of s.foes) {
        if (o === f || o.st !== WALK || o.k === BOSS) continue;
        const dx = f.x - o.x, dy = f.y - o.y, dd = Math.hypot(dx, dy), m = (ER[f.k] + ER[o.k]) * 0.85;
        if (dd < m && dd > 1e-6) (f.x += (dx / dd) * (m - dd) * 0.3), (f.y += (dy / dd) * (m - dd) * 0.3);
      }
      for (const q of s.drums) {
        if (q.gone) continue;
        const dx = f.x - q.x, dy = f.y - q.y, dd = Math.hypot(dx, dy), m = ER[f.k] + DRUM_R;
        if (dd < m && dd > 1e-6) (f.x = q.x + (dx / dd) * m), (f.y = q.y + (dy / dd) * m);
      }
      f.x = clamp(f.x, -0.15, W + 0.15);
      f.y = clamp(f.y, -0.15, H + 0.15);
      const cd = Math.hypot(s.rx - f.x, s.ry - f.y);
      if (cd < br * 0.9 + ER[f.k] * 0.8) {
        // 꽝 박치기: 부딪친 로봇도 튕겨 나가 넘어진다 (던지기 몫으로는 안 센다) — 판은 언제나 끝난다
        const ux = (f.x - s.rx) / (cd || 1e-6), uy = (f.y - s.ry) / (cd || 1e-6);
        hitRobot(s, f.x, f.y);
        f.st = TUMBLE;
        f.t = 0;
        f.tid = 0;
        f.hp = 0;
        f.vx = ux * 0.012;
        f.vy = uy * 0.012;
        f.vs = (ux >= 0 ? 1 : -1) * 0.25;
        s.knocked++;
      }
    } else if (f.st === TUMBLE) {
      f.t++;
      f.x += f.vx;
      f.y += f.vy;
      f.vx *= TUMBLE_FR;
      f.vy *= TUMBLE_FR;
      f.spin += f.vs * (0.4 + Math.hypot(f.vx, f.vy) * 60);
      if (f.x < 0.02) (f.x = 0.02), (f.vx = Math.abs(f.vx) * 0.6);
      if (f.x > W - 0.02) (f.x = W - 0.02), (f.vx = -Math.abs(f.vx) * 0.6);
      if (f.y < 0.02) (f.y = 0.02), (f.vy = Math.abs(f.vy) * 0.6);
      if (f.y > H - 0.02) (f.y = H - 0.02), (f.vy = -Math.abs(f.vy) * 0.6);
      const sp = Math.hypot(f.vx, f.vy);
      if (sp > 0.003) {
        for (const o of s.foes) {
          if (o === f || o.st !== WALK) continue;
          const r = ER[o.k] + ER[f.k], dx = o.x - f.x, dy = o.y - f.y, dd = Math.hypot(dx, dy);
          if (dd > r || o.bump === f.id) continue;
          o.bump = f.id;
          const nx = dx / (dd || 1e-6), ny = dy / (dd || 1e-6), pv = sp * 0.85;
          knock(s, o, ((f.vx / sp) * 0.5 + nx * 0.5) * pv, ((f.vy / sp) * 0.5 + ny * 0.5) * pv, f.tid, 1, 'roll');
          f.vx *= 0.72;
          f.vy *= 0.72;
        }
        for (const q of s.drums) if (!q.gone && Math.hypot(q.x - f.x, q.y - f.y) < ER[f.k] + DRUM_R) ignite(s, q, f.tid);
      }
      if (sp < 0.0015 && f.t > 18) (f.st = DOWN), (f.t = 0);
    } else if (f.st === DOWN) {
      f.t++;
      if (f.t > 42) breakFoe(s, f);
    }
  }
  if (s.foes.length > 24) s.foes = s.foes.filter((f) => f.st !== DEAD);
}

function bossStep(s: MagState, f: Foe) {
  f.ph++;
  if (f.st === DOWN) {
    f.t++;
    if (f.t > 90) (f.st = DEAD), ev(s, 'pop', f.x, f.y, BOSS);
    return;
  }
  f.x = 0.5 + Math.sin(f.ph * 0.0065) * 0.27;
  f.y = 0.085;
  if (s.phase !== 'play') return;
  s.bossT++;
  if (!s.hook && s.bossT > HOOK_EVERY) {
    s.hook = { tx: s.rx, ty: s.ry, t: 0, phase: 1 };
    s.bossT = 0;
    ev(s, 'hookWarn', s.rx, s.ry);
    see(s, 'hook', '');
  }
  const h = s.hook;
  if (!h) return;
  h.t++;
  if (h.phase === 1) {
    if (h.t < 45) (h.tx += (s.rx - h.tx) * 0.05), (h.ty += (s.ry - h.ty) * 0.05);
    if (h.t >= HOOK_WARN) {
      h.phase = 2;
      h.t = 0;
      ev(s, 'thud', h.tx, h.ty);
      if (Math.hypot(s.rx - h.tx, s.ry - h.ty) < 0.085) hitRobot(s, h.tx, h.ty - 0.01);
      for (const o of s.foes) if (o.st === WALK && o.k !== BOSS && Math.hypot(o.x - h.tx, o.y - h.ty) < 0.08) knock(s, o, (o.x - h.tx) * 0.1, (o.y - h.ty) * 0.1, 0, 9, 'boom');
      if (liveScrap(s) < 70) {
        const c = addScrap(s, CHUNK, clamp(h.tx, 0.05, 0.95), clamp(h.ty, 0.05, H - 0.05));
        c.hop = 16;
      }
    }
  } else if (h.t > 26) s.hook = null;
}

function spawnStep(s: MagState) {
  const d = STAGES[s.stage];
  const walking = s.foes.reduce((a, f) => a + (f.st === WALK && f.k !== BOSS ? 1 : 0), 0);
  s.emptyT = walking ? 0 : s.emptyT + 1;
  if (d.boss) {
    const boss = s.foes.find((f) => f.k === BOSS);
    if (!boss || boss.st !== WALK) return;
    if (s.stT >= 90 + s.minion * 330 || (s.emptyT > 120 && s.stT - s.lastSpawn > 120)) {
      const pair = ([['L', 'R'], ['B', 'L'], ['R', 'B']] as Side[][])[s.minion % 3];
      spawnWave(s, { at: 0, n: 4, k: BOT, side: pair[0], form: 'clump', mix: s.minion % 2 ? undefined : 4 });
      spawnWave(s, { at: 0, n: 3, k: BOT, side: pair[1], form: 'clump', mix: s.minion % 2 ? 3 : undefined });
      s.minion++;
      s.lastSpawn = s.stT;
    }
    return;
  }
  if (s.wave >= d.waves.length) return;
  const w = d.waves[s.wave];
  if (s.stT >= w.at * 60 || (s.emptyT > 70 && s.stT > 20)) {
    spawnWave(s, w);
    s.wave++;
    s.lastSpawn = s.stT;
  }
}

function beltStep(s: MagState) {
  if (!STAGES[s.stage].belt) return;
  if (++s.chute >= 42 && liveScrap(s) < 46) {
    s.chute = 0;
    const c = addScrap(s, randKind(s), 0.03, BELT_Y0 + 0.02 + s.rng() * (BELT_Y1 - BELT_Y0 - 0.04));
    c.hop = 12;
    see(s, 'chute', '');
  }
}

function endStage(s: MagState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.lock = s.lock || s.down;
  s.down = false;
  s.hook = null;
  for (const c of s.scraps) if (c.st === PULL) c.st = GROUND;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, d.nstar >= 2 && s.best >= d.multi, d.nstar >= 3 && s.hits === 0];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * 100 + 50;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += 1000);
    ev(s, 'clear', 0.5, 0.5, s.got, s.won ? '마당을 다 지켰다!' : '마당 지켰다!');
  } else {
    s.hearts--;
    s.tries++;
    s.got = 0;
    ev(s, 'fail', s.rx, s.ry, 0, why);
  }
  s.log.push({ stage: s.stage, ok, got: s.got, starOk: [...s.starOk], t: s.t, best: s.best, hits: s.hits });
}

export const magnethammer: GameDef<MagState> = {
  id: 'magnethammer',
  name: '자석 해머 로봇',
  genes: ['magnetfling', 'pointer', 'chain'],
  twist: '자석 공이 탄창이자 몸무게다 — 오래 모을수록 산탄은 크고 넓어지지만 로봇은 느려지고, 맞아 쓰러진 로봇은 볼링 핀처럼 옆 로봇을 넘어뜨린 뒤 다시 모을 고철이 된다',
  rules: [
    '꾹 누르면 로봇이 손가락 쪽으로 걸으며 둘레 고철을 윙 끌어모아요 (많을수록 무거워 느려져요).',
    '떼면 모은 고철을 손가락 쪽으로 한꺼번에 흩뿌려요 — 쓰러진 로봇이 옆 로봇을 볼링 핀처럼 넘어뜨려요.',
    '다가오는 로봇에 닿으면 체력이 줄어요. 다 쓰러뜨리면 마당을 지켜요!',
  ],
  controls: 'touch',
  hint: '꾹 눌러 고철 모으기 → 떼면 손가락 쪽으로 와르르 / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '노을 고철 마당 — 자석 해머 로봇',
    mood: '해 질 녘 주황·보라 하늘 아래 쌓인 고철 산과 크레인 실루엣, 기름 웅덩이에 노을이 비친다. 민트색 꼬마 로봇이 빨간 말굽자석 해머를 치켜들면 나사·캔·톱니·스프링이 윙 빨려 와 반짝이는 공이 되고, 녹슨 고물 로봇들이 볼링 핀처럼 와르르. 고철 산 꼭대기 고양이가 구경한다.',
    palette: { bg: '#2a1b3d', ink: '#fff3dd', muted: '#c9a7b8', accent: '#7ffcff', hot: '#ff5a4a', soft: '#ffb35a' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const jit = STAGES.map(() => ({ flip: rng() < 0.5 }));
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, stT: 0, jit,
      rx: 0.5, ry: 0.7, rvx: 0, rvy: 0, hp: 3, hpMax: 3, inv: 0, face: 1, aimA: -Math.PI / 2, walk: 0, swing: 0, bRot: 0,
      down: false, lock: false, holdT: 0, tx: 0.5, ty: 0.5, presses: 0, pressAt: [],
      scraps: [], foes: [], drums: [], hook: null, nid: 0,
      wave: 0, lastSpawn: 0, emptyT: 0, chute: 0, bossT: 0, minion: 0,
      tid: 0, tally: {}, best: 0, hits: 0, knocked: 0, throws: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      freeze: 0, slow: 0, shield: 0,
      seen: new Set<string>(), newsQ: [], news: null, events: [], eid: 0,
      firstPressT: -1, firstBigT: -1, log: [], stagePress: 0,
    } as MagState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    if (s.dead) return;
    const p = inp.pointer ?? null;
    if (p) {
      const q = toPlane(p.x, p.y * A);
      s.tx = q.x;
      s.ty = q.y;
      if (s.phase !== 'play') s.lock = true;
      else if (!s.down && !s.lock) press(s);
    } else {
      if (s.down) release(s);
      s.lock = false;
    }
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 120) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.phase === 'result') {
      s.pt++;
      s.slow = s.freeze = 0;
      scrapStep(s);
      foeStep(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.freeze > 0) return void s.freeze--;
    if (s.slow > 0 && --s.slow % 2 === 1) return;
    s.stT++;
    s.pt++;
    if (s.down) s.holdT++;
    robotStep(s);
    scrapStep(s);
    foeStep(s);
    for (const q of s.drums) if (!q.gone && q.fuse > 0 && --q.fuse === 0) explode(s, q);
    if (s.phase !== 'play') return;
    beltStep(s);
    spawnStep(s);
    const d = STAGES[s.stage];
    const done = d.boss ? s.foes.every((f) => f.st === DEAD) : s.wave >= d.waves.length && s.foes.every((f) => f.st === DEAD);
    if (done) endStage(s, true, '');
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 미리 보기·봇 ─────────────────────────────
export interface Shot { kills: number; dmg: number; boss: number; self: number; hit: number[]; val: number; aim: number }

/**
 * 지금 공을 aim 쪽으로 던지면 어떻게 될까 — 화면의 미리 보기와 잘하는 봇이 같은 계산을 쓴다.
 * 고철 줄기(최대 12줄)를 부채꼴로 쏘아 처음 닿는 것(로봇·자석 방패·기름통·크레인)을 찾고, 쓰러지는 로봇이
 * 굴러갈 길에 선 로봇(볼링 한 단계)과 기름통 폭발 둘레까지 센다.
 */
export function predictThrow(s: MagState, aim0: number): Shot {
  const out: Shot = { kills: 0, dmg: 0, boss: 0, self: 0, hit: [], val: 0, aim: aim0 };
  const { aim, list } = throwPlan(s, aim0);
  out.aim = aim;
  if (!list.length) return out;
  const fs = s.foes.filter((f) => f.st === WALK && (inYard(f) || f.k === BOSS));
  const lead = (f: Foe, v: number) => (f.k === BOSS ? 0 : v * (Math.hypot(f.x - s.rx, f.y - s.ry) / 0.016));
  const px = fs.map((f) => f.x + lead(f, f.vx)), py = fs.map((f) => f.y + lead(f, f.vy));
  const dmg = fs.map(() => 0), cap = fs.map(() => 0), dirx = fs.map(() => 0), diry = fs.map(() => 0);
  const drumHit = s.drums.map(() => false);
  /** 한 줄기: (ox,oy)에서 (dx,dy)로 L만큼 — 처음 닿는 것 */
  const rayHit = (ox: number, oy: number, dx: number, dy: number, L: number, chunk: boolean) => {
    let bt = L, bi = -1, kind = 0;
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      const cx = px[i] - ox, cy = py[i] - oy, b = cx * dx + cy * dy;
      if (b < 0) continue;
      const pp = cx * cx + cy * cy - b * b;
      if (f.k === SHIELD && !chunk) {
        const r = FIELD_R * 0.8;
        if (pp < r * r) {
          const tt = b - Math.sqrt(r * r - pp);
          if (tt < bt) (bt = tt), (bi = i), (kind = 1);
        }
        continue;
      }
      const r = ER[f.k] + 0.013;
      if (pp > r * r) continue;
      const tt = b - Math.sqrt(r * r - pp);
      if (tt < bt) (bt = tt), (bi = i), (kind = 0);
    }
    for (let j = 0; j < s.drums.length; j++) {
      const q = s.drums[j];
      if (q.gone) continue;
      const cx = q.x - ox, cy = q.y - oy, b = cx * dx + cy * dy;
      if (b < 0) continue;
      const pp = cx * cx + cy * cy - b * b, r = DRUM_R + 0.013;
      if (pp > r * r) continue;
      const tt = b - Math.sqrt(r * r - pp);
      if (tt < bt) (bt = tt), (bi = j), (kind = 2);
    }
    return { bi, kind };
  };
  const small = list.filter((p) => p.c.k !== CHUNK), big = list.filter((p) => p.c.k === CHUNK);
  const rays = Math.min(small.length, 12), wgt = small.length / Math.max(1, rays);
  for (let r = 0; r < rays; r++) {
    const p = small[Math.min(small.length - 1, Math.floor((r + 0.5) * wgt))], dx = Math.cos(p.ang), dy = Math.sin(p.ang);
    const { bi, kind } = rayHit(p.x, p.y, dx, dy, 0.4, false);
    if (bi < 0) continue;
    if (kind === 2) drumHit[bi] = true;
    else if (kind === 1) cap[bi] += wgt;
    else (dmg[bi] += wgt), (dirx[bi] += dx), (diry[bi] += dy);
  }
  for (const p of big) {
    const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
    for (let i = 0; i < fs.length; i++) {
      const cx = px[i] - p.x, cy = py[i] - p.y, b = cx * dx + cy * dy;
      if (b < 0 || b > 0.5) continue;
      const pp = cx * cx + cy * cy - b * b, r = ER[fs[i].k] + SR[CHUNK];
      if (pp < r * r) (dmg[i] += 3), (dirx[i] += dx), (diry[i] += dy);
    }
    const { bi, kind } = rayHit(p.x, p.y, dx, dy, 0.5, true);
    if (bi >= 0 && kind === 2) drumHit[bi] = true;
  }
  const dead = fs.map(() => false);
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    if (f.k === BOSS) {
      out.boss += dmg[i];
      continue;
    }
    if (f.k === SHIELD && f.load + cap[i] >= SHIELD_CAP) dead[i] = true;
    if (dmg[i] >= f.hp - 0.01) dead[i] = true;
    if (dead[i]) out.kills++, out.hit.push(f.id);
    else out.dmg += Math.min(dmg[i], f.hp);
  }
  // 볼링 한 단계: 쓰러진 로봇이 굴러갈 길(0.2)에 선 체력 1 로봇
  for (let i = 0; i < fs.length; i++) {
    if (!dead[i] || fs[i].k === BOSS) continue;
    const dl = Math.hypot(dirx[i], diry[i]) || 1, dx = dirx[i] / dl, dy = diry[i] / dl;
    for (let j = 0; j < fs.length; j++) {
      if (dead[j] || fs[j].k === BOSS || fs[j].hp - dmg[j] > 1.01) continue;
      const cx = px[j] - px[i], cy = py[j] - py[i], b = cx * dx + cy * dy;
      if (b < 0 || b > 0.2) continue;
      const pp = cx * cx + cy * cy - b * b, r = ER[fs[j].k] * 1.9;
      if (pp < r * r) (dead[j] = true), out.kills++, out.hit.push(fs[j].id);
    }
  }
  // 기름통 폭발(이어 터지는 통까지)
  let any = drumHit.some(Boolean), guard = 0;
  while (any && guard++ < 4) {
    any = false;
    for (let j = 0; j < s.drums.length; j++) {
      if (!drumHit[j]) continue;
      const q = s.drums[j];
      for (let k = 0; k < s.drums.length; k++) if (!drumHit[k] && !s.drums[k].gone && Math.hypot(s.drums[k].x - q.x, s.drums[k].y - q.y) < BOOM_R + DRUM_R) (drumHit[k] = true), (any = true);
    }
  }
  for (let j = 0; j < s.drums.length; j++) {
    if (!drumHit[j]) continue;
    const q = s.drums[j];
    for (let i = 0; i < fs.length; i++) {
      if (Math.hypot(px[i] - q.x, py[i] - q.y) > BOOM_R + ER[fs[i].k]) continue;
      if (fs[i].k === BOSS) out.boss += 4;
      else if (!dead[i]) (dead[i] = true), out.kills++, out.hit.push(fs[i].id);
    }
    if (Math.hypot(s.rx - q.x, s.ry - q.y) < BOOM_R * 0.8 + 0.03) out.self = 1;
  }
  out.val = out.kills * 10 + out.dmg * 1.5 + out.boss * 4 - out.self * 60;
  return out;
}

/** 여러 방향(16방 + 로봇마다 + 기름통마다)을 재 보고 가장 좋은 던지기 */
function bestThrow(s: MagState): Shot | null {
  const angs: number[] = [];
  for (let k = 0; k < 16; k++) angs.push((k / 16) * Math.PI * 2);
  for (const f of s.foes) if (f.st === WALK && Math.hypot(f.x - s.rx, f.y - s.ry) < 0.62) angs.push(Math.atan2(f.y - s.ry, f.x - s.rx));
  for (const q of s.drums) if (!q.gone) angs.push(Math.atan2(q.y - s.ry, q.x - s.rx));
  let best: Shot | null = null;
  for (const a of angs) {
    const r = predictThrow(s, a);
    if (!best || r.val > best.val) best = r;
  }
  return best;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0, 1), y: clamp((Y0 + clamp(y, -0.04, H + 0.04) * KY) / A, 0, 1) } });
const aimAt = (s: MagState, a: number) => at(s.rx + Math.cos(a) * 0.22, s.ry + Math.sin(a) * 0.22);

/** 가장 빨리 닿을 로봇까지 남은 틱 */
function danger(s: MagState) {
  const br = BR(loadOf(s));
  let m = 9999;
  for (const f of s.foes) {
    if (f.st !== WALK || f.k === BOSS) continue;
    const d = Math.hypot(f.x - s.rx, f.y - s.ry) - (br * 0.9 + ER[f.k] * 0.8);
    m = Math.min(m, Math.max(0, d) / (FSPD[f.k] * STAGES[s.stage].spd + 0.0007));
  }
  if (s.hook && s.hook.phase === 1 && Math.hypot(s.hook.tx - s.rx, s.hook.ty - s.ry) < 0.11) m = Math.min(m, HOOK_WARN - s.hook.t);
  return m;
}

/** 걸어갈 곳: 안전(로봇·갈고리·기름통에서 떨어짐) + 주울 고철 + 던지기 좋은 거리 */
function moveTarget(s: MagState): { x: number; y: number } {
  const load = loadOf(s), d = STAGES[s.stage];
  const fs = s.foes.filter((f) => f.st === WALK && f.k !== BOSS);
  let cx = 0, cy = 0;
  for (const f of fs) (cx += f.x), (cy += f.y);
  if (fs.length) (cx /= fs.length), (cy /= fs.length);
  // 공이 비었으면 고철 줍기가 급하다
  const need = load < 6 ? 3.2 : load < 14 ? 1.3 : load < 22 ? 0.45 : 0;
  let best = { x: s.rx, y: s.ry }, bv = -1e9;
  for (let k = -1; k < 36; k++) {
    const a = (k / 12) * Math.PI * 2, r = k < 0 ? 0 : k < 12 ? 0.08 : k < 24 ? 0.17 : 0.27;
    const x = s.rx + Math.cos(a) * r, y = s.ry + Math.sin(a) * r;
    if (x < 0.09 || x > W - 0.09 || y < (d.boss ? 0.28 : 0.08) || y > H - 0.06) continue;
    let v = 0;
    for (const f of fs) {
      const qx = f.x + f.vx * 25, qy = f.y + f.vy * 25, dd = Math.hypot(qx - x, qy - y) - BR(load) - ER[f.k];
      if (dd < 0.28) v -= (0.28 - dd) * 75;
      // 가는 길에 로봇이 있으면 안 된다
      if (r > 0.1) {
        const mx = (s.rx + x) / 2, my = (s.ry + y) / 2, dm = Math.hypot(qx - mx, qy - my) - BR(load) - ER[f.k];
        if (dm < 0.1) v -= (0.1 - dm) * 60;
      }
    }
    if (need > 0)
      for (const c of s.scraps) {
        if (c.st !== GROUND) continue;
        const dd = Math.hypot(c.x - x, c.y - y);
        if (dd < 0.24) v += need * (c.k === CHUNK ? (d.key === 'chunk' || d.boss ? 2.5 : 0.6) : 1) * (1 - dd / 0.24);
      }
    if (fs.length && load >= 6) v -= Math.abs(Math.hypot(cx - x, cy - y) - 0.34) * 5;
    for (const q of s.drums) if (!q.gone && Math.hypot(q.x - x, q.y - y) < BOOM_R + 0.03) v -= 8;
    if (s.hook && s.hook.phase === 1 && Math.hypot(s.hook.tx - x, s.hook.ty - y) < 0.13) v -= 60;
    if (d.boss) {
      const b = s.foes.find((f) => f.k === BOSS);
      if (b && load >= 6) v -= Math.abs(Math.hypot(b.x - x, b.y - y) - 0.36) * 6;
    }
    if (onBelt(s, y)) v -= 0.5;
    const mx = Math.min(x, W - x), my = Math.min(y, H - y);
    v -= Math.max(0, 0.2 - mx) * 25 + Math.max(0, 0.2 - my) * 25 + (mx < 0.2 && my < 0.2 ? 6 : 0);
    v -= r * 2;
    if (v > bv) (bv = v), (best = { x, y });
  }
  return best;
}

interface Brain { fire: boolean; key: string; shot: Shot | null; shotT: number }
const brains = new WeakMap<object, Brain>();
const mem = (s: MagState) => {
  let m = brains.get(s);
  if (!m) brains.set(s, (m = { fire: false, key: '', shot: null, shotT: -99 }));
  return m;
};

/** 잘하는 봇: 늘 누른 채 안전하고 고철 많은 곳으로 걸으며, 던지기를 내다봐(부채꼴 줄기·볼링·폭발) 별 조건만큼 쓰러질 때 쏜다 */
export const magnethammerSmart: Bot<MagState> = {
  name: '내다보는 기술자',
  act(s) {
    if (s.phase !== 'play' || s.lock) return NO;
    const m = mem(s);
    if (m.fire) return (m.fire = false), NO;
    if (!s.down) return (m.shot = null), at(moveTarget(s).x, moveTarget(s).y);
    const n = ballCount(s), load = loadOf(s), d = STAGES[s.stage];
    const dz = danger(s), pulling = s.scraps.some((c) => c.st === PULL);
    if (n >= 2 && (s.t - m.shotT >= 6 || dz < 60)) (m.shot = bestThrow(s)), (m.shotT = s.t);
    const sh = m.shot;
    if (sh && n >= 2) {
      const standing = s.foes.reduce((a, f) => a + (f.st === WALK && f.k !== BOSS ? 1 : 0), 0);
      const pending = d.boss ? 3 : d.waves.slice(s.wave).reduce((a, w) => a + w.n, 0);
      const wantMulti = d.nstar >= 2 && s.best < d.multi;
      let want = wantMulti ? d.multi : 2;
      if (wantMulti && standing < d.multi && pending === 0) want = Math.max(1, standing);
      if (!wantMulti) want = Math.min(want, Math.max(1, standing));
      const go =
        sh.self === 0 &&
        (!pulling || dz < 60) &&
        ((sh.kills >= want && (sh.kills >= 2 || standing <= 1 || dz < 90)) ||
          (dz < (wantMulti ? 75 : 110) && sh.kills >= 1) ||
          (load >= 26 && sh.kills >= 2) ||
          (d.boss && (!wantMulti || standing === 0) && sh.boss >= 6 + (load >= 20 ? 0 : 4)) ||
          (d.boss && dz < 45 && sh.boss >= 2));
      if (go) {
        m.fire = true;
        return aimAt(s, sh.aim);
      }
    }
    const t = moveTarget(s);
    return at(t.x, t.y);
  },
};

const habitMem = new WeakMap<object, { fire: boolean }>();
const hm = (s: MagState) => {
  let m = habitMem.get(s);
  if (!m) habitMem.set(s, (m = { fire: false }));
  return m;
};
const nearestFoe = (s: MagState) => {
  let best: Foe | null = null, bd = 9;
  for (const f of s.foes) {
    if (f.st !== WALK) continue;
    const d = Math.hypot(f.x - s.rx, f.y - s.ry);
    if (d < bd) (bd = d), (best = f);
  }
  return { f: best, d: bd };
};

/** 버릇 봇: 가장 가까운 고철 쪽으로 꾹 — 고철이 8개 모이면 가장 가까운 로봇에게 던진다 */
export const magnethammerHabit: Bot<MagState> = {
  name: '다 모이면 가장 가까운 적에게',
  act(s) {
    if (s.phase !== 'play' || s.lock) return NO;
    const m = hm(s);
    if (m.fire) return (m.fire = false), NO;
    const n = ballCount(s), { f } = nearestFoe(s);
    if (s.down && f && (n >= 8 || (s.holdT > 100 && n >= 1))) {
      m.fire = true;
      return aimAt(s, Math.atan2(f.y - s.ry, f.x - s.rx));
    }
    let tx = s.rx, ty = s.ry, bd = 9;
    for (const c of s.scraps) {
      if (c.st !== GROUND) continue;
      const d = Math.hypot(c.x - s.rx, c.y - s.ry);
      if (d < bd) (bd = d), (tx = c.x), (ty = c.y);
    }
    return at(tx, ty);
  },
};

const habit2Mem = new WeakMap<object, { fire: boolean }>();
/** 버릇 봇 2(판 만들기에 안 씀): 제자리에서 꾹 — 로봇이 가까이(0.3) 오면 그쪽으로 바로 던진다 */
export const magnethammerHabit2: Bot<MagState> = {
  name: '가까이 오면 바로',
  act(s) {
    if (s.phase !== 'play' || s.lock) return NO;
    let m = habit2Mem.get(s);
    if (!m) habit2Mem.set(s, (m = { fire: false }));
    if (m.fire) return (m.fire = false), NO;
    if (!s.down) return at(s.rx, s.ry);
    const { f, d } = nearestFoe(s);
    if (f && d < 0.3 && ballCount(s) >= 1) {
      m.fire = true;
      return aimAt(s, Math.atan2(f.y - s.ry, f.x - s.rx));
    }
    return at(s.rx, s.ry);
  },
};

const dumbMem = new WeakMap<object, { next: number; until: number; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 꾹(0.1~1.3초) 눌렀다 뗀다 */
export const magnethammerRandom: Bot<MagState> = {
  name: '아무 데나 꾹',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 50), until: 0, x: 0.5, y: 0.5 }));
    if (s.t < m.next) return NO;
    if (!m.until) (m.until = s.t + 6 + Math.floor(rng() * 75)), (m.x = rng()), (m.y = 0.22 + rng() * 0.62);
    if (s.t < m.until) {
      m.x = clamp(m.x + (rng() - 0.5) * 0.02, 0, 1);
      m.y = clamp(m.y + (rng() - 0.5) * 0.02, 0, 1);
      return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
    }
    m.until = 0;
    m.next = s.t + 10 + Math.floor(rng() * 70);
    return NO;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const depth = (y: number) => 0.86 + 0.18 * clamp(y / H, -0.2, 1.2);
const FONT = (px: number, wt = 800) => `${wt} ${Math.round(px)}px system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
const CAN_COL = [['#ff7a6a', '#d83a2e', '#7a1a14'], ['#7ab8ff', '#2e78d8', '#123a7a'], ['#9be37a', '#3fae3a', '#1a5a1a']];

function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}
function rrect(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}
function star5(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function heart(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.2, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function pill(ctx: C2, x: number, y: number, w: number, h: number, fill = 'rgba(29,16,40,.78)', stroke = 'rgba(255,179,90,.55)') {
  rrect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
function text(ctx: C2, t: string, x: number, y: number, px: number, col: string, align: CanvasTextAlign = 'center', wt = 800, outline = 'rgba(20,8,24,.7)') {
  ctx.font = FONT(px, wt);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = Math.max(2, px * 0.22);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outline;
    ctx.strokeText(t, x, y);
  }
  ctx.fillStyle = col;
  ctx.fillText(t, x, y);
}

/** 고철 한 조각: 나사·캔·톱니·스프링·큰 덩어리 (r = 화면 반지름 px) */
const FLAT = [['#dfe5ec', '#3e454e'], ['', 'rgba(30,10,10,.75)'], ['#e0b04a', '#5a3a0c'], ['#d7dee6', '#4a525c']];
function drawPiece(ctx: C2, k: number, v: number, x: number, y: number, r: number, rot: number) {
  if (r < 6 && k !== CHUNK) {
    // 작은 조각은 그라데이션 없이 (폰에서 매 프레임 수십 개)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.lineWidth = Math.max(0.8, r * 0.2);
    ctx.strokeStyle = FLAT[k][1];
    ctx.fillStyle = k === CAN ? CAN_COL[v % 3][1] : FLAT[k][0];
    if (k === BOLT) {
      ctx.fillRect(-r * 0.1, -r * 0.28, r * 1.2, r * 0.56);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) ctx.lineTo(-r * 0.35 + Math.cos((i * Math.PI) / 3) * r * 0.62, Math.sin((i * Math.PI) / 3) * r * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (k === CAN) {
      rrect(ctx, -r * 0.62, -r * 0.8, r * 1.24, r * 1.6, r * 0.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(-r * 0.62, -r * 0.12, r * 1.24, r * 0.26);
    } else if (k === GEAR) {
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, rr = i % 2 ? r * 0.72 : r;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a2e10';
      ctx.fillRect(-r * 0.2, -r * 0.2, r * 0.4, r * 0.4);
    } else {
      ctx.strokeStyle = FLAT[k][0];
      ctx.lineWidth = r * 0.34;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) ctx.lineTo(-r * 0.85 + (i / 8) * r * 1.7, Math.sin(i * 2.2) * r * 0.55);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(-r * 0.35, -r * 0.35, r * 0.3, r * 0.3);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const lw = Math.max(0.8, r * 0.16);
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  if (k === BOLT) {
    ctx.fillStyle = '#8d97a3';
    ctx.strokeStyle = '#3e454e';
    rrect(ctx, -r * 0.15, -r * 0.3, r * 1.25, r * 0.6, r * 0.15);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,46,54,.6)';
    ctx.lineWidth = lw * 0.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(r * (0.2 + i * 0.3), -r * 0.3);
      ctx.lineTo(r * (0.32 + i * 0.3), r * 0.3);
      ctx.stroke();
    }
    const g = ctx.createLinearGradient(-r, -r, r * 0.2, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#c9d1da');
    g.addColorStop(1, '#6f7884');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#3e454e';
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) ctx.lineTo(-r * 0.35 + Math.cos((i * Math.PI) / 3) * r * 0.62, Math.sin((i * Math.PI) / 3) * r * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (k === CAN) {
    const c = CAN_COL[v % 3];
    const g = ctx.createLinearGradient(-r * 0.7, 0, r * 0.7, 0);
    g.addColorStop(0, c[2]);
    g.addColorStop(0.35, c[0]);
    g.addColorStop(0.7, c[1]);
    g.addColorStop(1, c[2]);
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(30,10,10,.75)';
    rrect(ctx, -r * 0.62, -r * 0.8, r * 1.24, r * 1.6, r * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(-r * 0.62, -r * 0.12, r * 1.24, r * 0.26);
    ctx.fillStyle = '#dfe6ee';
    ell(ctx, 0, -r * 0.8, r * 0.62, r * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(-r * 0.4, -r * 0.6, r * 0.14, r * 1.2);
  } else if (k === GEAR) {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fff1b8');
    g.addColorStop(0.5, '#e0b04a');
    g.addColorStop(1, '#8a5e18');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#5a3a0c';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.74 : r;
      ctx.lineTo(Math.cos(a - 0.12) * rr, Math.sin(a - 0.12) * rr);
      ctx.lineTo(Math.cos(a + 0.12) * rr, Math.sin(a + 0.12) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4a2e10';
    ell(ctx, 0, 0, r * 0.28, r * 0.28);
    ctx.fill();
  } else if (k === SPRING) {
    ctx.strokeStyle = '#4a525c';
    ctx.lineWidth = r * 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const px = -r * 0.85 + (i / 12) * r * 1.7, py = Math.sin(i * 1.6) * r * 0.55;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = '#d7dee6';
    ctx.lineWidth = r * 0.22;
    ctx.stroke();
  } else {
    // 큰 고철 덩어리: 울퉁불퉁 무쇠 + 녹 + 리벳
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, '#b9bfca');
    g.addColorStop(0.45, '#6b707c');
    g.addColorStop(1, '#2c2e36');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#1a1b20';
    ctx.lineWidth = Math.max(1.2, r * 0.09);
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, rr = r * (0.82 + hsh(i * 3.7 + v) * 0.24);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(176,84,40,.55)';
    ell(ctx, r * 0.25, r * 0.3, r * 0.35, r * 0.2, 0.4);
    ctx.fill();
    ctx.fillStyle = '#d9dee6';
    for (const [px, py] of [[-0.45, 0.1], [0.1, -0.5], [0.5, 0.05]]) {
      ell(ctx, px * r, py * r, r * 0.09, r * 0.09);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

// ── 배경(하늘·고철 산·크레인·울타리·땅) — 판·크기마다 한 번 그려 둔다 ──
let bgCache: { key: string; cv: HTMLCanvasElement } | null = null;
function background(ctx: C2, s: MagState, w: number, h: number) {
  const dpr = ctx.getTransform().a || 1;
  const key = `${w}x${h}@${dpr}:${s.stage}:${s.jit[s.stage].flip ? 1 : 0}`;
  if (typeof document === 'undefined') return paintBackground(ctx, s, w, h);
  if (!bgCache || bgCache.key !== key) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBackground(c, s, w, h);
    bgCache = { key, cv };
  }
  ctx.drawImage(bgCache.cv, 0, 0, w, h);
}

function paintBackground(ctx: C2, s: MagState, w: number, h: number) {
  const gy0 = Y0 * w, gy1 = (Y0 + H * KY) * w;
  // 하늘: 보라 → 자홍 → 주황 → 노란 지평
  const sky = ctx.createLinearGradient(0, 0, 0, gy0);
  sky.addColorStop(0, '#22143e');
  sky.addColorStop(0.32, '#53286c');
  sky.addColorStop(0.6, '#b04674');
  sky.addColorStop(0.82, '#ee7658');
  sky.addColorStop(1, '#ffc078');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, gy0 + 2);
  for (let k = 0; k < 40; k++) {
    ctx.globalAlpha = 0.25 + hsh(k) * 0.5;
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(hsh(k * 3.1) * w, hsh(k * 5.7) * gy0 * 0.35, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
  // 해와 빛 번짐
  const sx = w * 0.7, sy = w * 0.3;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.42);
  glow.addColorStop(0, 'rgba(255,240,190,.85)');
  glow.addColorStop(0.18, 'rgba(255,200,120,.45)');
  glow.addColorStop(1, 'rgba(255,140,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, gy0 + 4);
  const sun = ctx.createRadialGradient(sx, sy - w * 0.02, 0, sx, sy, w * 0.07);
  sun.addColorStop(0, '#fffbe6');
  sun.addColorStop(0.6, '#ffe39a');
  sun.addColorStop(1, '#ffb066');
  ctx.fillStyle = sun;
  ell(ctx, sx, sy, w * 0.07, w * 0.07);
  ctx.fill();
  // 길게 누운 구름
  for (const [cx, cy, cw, a, col] of [[0.25, 0.12, 0.34, 0.5, '#ff9fb4'], [0.62, 0.17, 0.4, 0.45, '#ffb38a'], [0.12, 0.22, 0.26, 0.35, '#c26a9a'], [0.85, 0.09, 0.22, 0.3, '#ff9fb4']] as [number, number, number, number, string][]) {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ell(ctx, cx * w, cy * w, cw * w * 0.5, w * 0.012);
    ctx.fill();
    ell(ctx, (cx + 0.05) * w, (cy - 0.008) * w, cw * w * 0.3, w * 0.01);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 먼 고철 산 (실루엣 + 해 쪽 테두리 빛)
  const ridge = (base: number, amp: number, seed: number, col: string, rim: string) => {
    ctx.beginPath();
    ctx.moveTo(0, gy0 + 4);
    const pts: number[][] = [];
    for (let i = 0; i <= 24; i++) {
      const x = (i / 24) * w, y = base * w - (Math.sin(i * 0.9 + seed) * 0.5 + hsh(i + seed * 10) * 0.8) * amp * w;
      pts.push([x, y]);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, gy0 + 4);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  ridge(0.33, 0.06, 1.3, '#4a2752', 'rgba(255,150,110,.55)');
  // 크레인 실루엣 둘
  const crane = (x: number, top: number, jib: number, dir: number, sc: number) => {
    ctx.strokeStyle = '#2b1838';
    ctx.fillStyle = '#2b1838';
    ctx.lineWidth = 2 * sc;
    const tw = w * 0.022 * sc, bx = x * w, ty = top * w, by = gy0 - w * 0.03;
    ctx.strokeRect(bx - tw / 2, ty, tw, by - ty);
    ctx.lineWidth = 0.9 * sc;
    ctx.beginPath();
    for (let y = ty; y < by; y += tw) {
      ctx.moveTo(bx - tw / 2, y);
      ctx.lineTo(bx + tw / 2, y + tw);
      ctx.moveTo(bx + tw / 2, y);
      ctx.lineTo(bx - tw / 2, y + tw);
    }
    ctx.stroke();
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(bx - dir * w * 0.08 * sc, ty + 2);
    ctx.lineTo(bx + dir * jib * w, ty + 2);
    ctx.moveTo(bx, ty - w * 0.03 * sc);
    ctx.lineTo(bx + dir * jib * w * 0.7, ty + 2);
    ctx.moveTo(bx, ty - w * 0.03 * sc);
    ctx.lineTo(bx - dir * w * 0.08 * sc, ty + 2);
    ctx.stroke();
    ctx.fillRect(bx - dir * w * 0.09 * sc - w * 0.012, ty, w * 0.03 * sc, w * 0.025 * sc);
    ctx.fillRect(bx - tw, ty + w * 0.005, tw * 2, w * 0.03 * sc);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + dir * jib * w * 0.8, ty + 2);
    ctx.lineTo(bx + dir * jib * w * 0.8, ty + w * 0.11 * sc);
    ctx.stroke();
    ctx.fillRect(bx + dir * jib * w * 0.8 - 3 * sc, ty + w * 0.11 * sc, 6 * sc, 4 * sc);
  };
  crane(0.12, 0.07, 0.36, 1, 1);
  crane(0.9, 0.16, 0.2, -1, 0.7);
  ridge(0.37, 0.045, 4.2, '#5c2f55', 'rgba(255,170,120,.6)');
  // 가까운 고철 더미: 낡은 차·타이어 탑·드럼통 실루엣
  const pileCol = '#6a3656', pileRim = 'rgba(255,170,120,.7)';
  const lump = (cx: number, cy: number, rw: number, rh: number) => {
    ctx.fillStyle = pileCol;
    ell(ctx, cx * w, cy * w, rw * w, rh * w);
    ctx.fill();
    ctx.strokeStyle = pileRim;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx * w, cy * w, rw * w, rh * w, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  };
  lump(0.12, 0.395, 0.17, 0.05);
  lump(0.5, 0.405, 0.12, 0.03);
  lump(0.86, 0.395, 0.18, 0.055);
  // 타이어 탑 (왼쪽)
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#2e1c30';
    ell(ctx, 0.22 * w, (0.365 - i * 0.022) * w, 0.04 * w, 0.013 * w);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,120,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // 낡은 차 (오른쪽)
  ctx.fillStyle = '#7a3a4c';
  rrect(ctx, 0.66 * w, 0.345 * w, 0.17 * w, 0.04 * w, 0.012 * w);
  ctx.fill();
  rrect(ctx, 0.69 * w, 0.325 * w, 0.09 * w, 0.03 * w, 0.01 * w);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,190,140,.35)';
  ctx.fillRect(0.7 * w, 0.33 * w, 0.03 * w, 0.017 * w);
  ctx.fillRect(0.74 * w, 0.33 * w, 0.03 * w, 0.017 * w);
  ctx.fillStyle = '#2e1c30';
  for (const x of [0.69, 0.8]) {
    ell(ctx, x * w, 0.385 * w, 0.017 * w, 0.017 * w);
    ctx.fill();
  }
  // 뒤 울타리 (철망)
  const fy0 = gy0 - w * 0.07, fy1 = gy0 + w * 0.004;
  ctx.strokeStyle = 'rgba(40,20,40,.55)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let x = -w * 0.05; x < w * 1.05; x += w * 0.028) {
    ctx.moveTo(x, fy0);
    ctx.lineTo(x + (fy1 - fy0) * 0.5, fy1);
    ctx.moveTo(x + (fy1 - fy0) * 0.5, fy0);
    ctx.lineTo(x, fy1);
  }
  ctx.stroke();
  ctx.fillStyle = '#3a2238';
  for (let x = 0.02; x < 1; x += 0.12) ctx.fillRect(x * w, fy0 - 3, 3, fy1 - fy0 + 3);
  ctx.fillRect(0, fy0 - 3, w, 2);
  // 지평 아지랑이
  const hz = ctx.createLinearGradient(0, gy0 - w * 0.09, 0, gy0 + w * 0.05);
  hz.addColorStop(0, 'rgba(255,170,120,0)');
  hz.addColorStop(0.6, 'rgba(255,170,120,.22)');
  hz.addColorStop(1, 'rgba(255,170,120,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, gy0 - w * 0.09, w, w * 0.14);
  // 땅: 해 쪽(위 오른쪽)이 밝은 흙바닥
  const gnd = ctx.createLinearGradient(0, gy0, 0, gy1);
  gnd.addColorStop(0, '#b06a4a');
  gnd.addColorStop(0.45, '#8a4f3a');
  gnd.addColorStop(1, '#5c3128');
  ctx.fillStyle = gnd;
  ctx.fillRect(0, gy0, w, gy1 - gy0);
  const lit = ctx.createRadialGradient(w * 0.75, gy0, 0, w * 0.75, gy0, w * 0.75);
  lit.addColorStop(0, 'rgba(255,190,120,.35)');
  lit.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = lit;
  ctx.fillRect(0, gy0, w, gy1 - gy0);
  ctx.fillStyle = 'rgba(30,10,30,.35)';
  ctx.fillRect(0, gy0, w, 3);
  // 흙 결: 자갈·티끌·금
  for (let k = 0; k < 260; k++) {
    const x = hsh(k * 1.37) * w, y = gy0 + hsh(k * 2.11 + 4) * (gy1 - gy0), big = hsh(k * 7.3) > 0.85;
    ctx.fillStyle = k % 3 ? 'rgba(60,25,20,.35)' : 'rgba(235,170,120,.35)';
    if (big) {
      ell(ctx, x, y, 2.6, 1.6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,180,.35)';
      ell(ctx, x - 0.6, y - 0.6, 1.2, 0.7);
      ctx.fill();
    } else ctx.fillRect(x, y, 1.4, 1.1);
  }
  ctx.strokeStyle = 'rgba(50,20,20,.28)';
  ctx.lineWidth = 3;
  for (const off of [0, 0.05]) {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * w, y = gy0 + (0.62 + off + Math.sin(i * 0.5) * 0.04) * (gy1 - gy0);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // 묻힌 철판 (리벳 박힌 녹슨 판)
  for (let k = 0; k < 4; k++) {
    const x = (0.12 + hsh(k * 9.1 + 2) * 0.76) * w, y = gy0 + (0.12 + hsh(k * 4.3 + 1) * 0.76) * (gy1 - gy0), pw = w * (0.12 + hsh(k) * 0.08), ph = pw * 0.42;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((hsh(k * 2.2) - 0.5) * 0.3);
    ctx.fillStyle = 'rgba(70,40,40,.32)';
    rrect(ctx, -pw / 2, -ph / 2, pw, ph, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,140,.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-pw / 2 + 2, -ph / 2 + 1);
    ctx.lineTo(pw / 2 - 2, -ph / 2 + 1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,170,.25)';
    for (const [rx, ry] of [[-0.42, -0.3], [0.42, -0.3], [-0.42, 0.3], [0.42, 0.3]]) {
      ell(ctx, rx * pw, ry * ph, 1.3, 1.3);
      ctx.fill();
    }
    ctx.restore();
  }
  // 기름 얼룩
  for (let k = 0; k < 6; k++) {
    const x = hsh(k * 5.5 + 7) * w, y = gy0 + hsh(k * 3.3 + 9) * (gy1 - gy0), r = w * (0.03 + hsh(k * 1.9) * 0.04);
    ctx.fillStyle = 'rgba(40,14,30,.18)';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, rr = r * (0.7 + hsh(k * 10 + i) * 0.5);
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.5);
    }
    ctx.closePath();
    ctx.fill();
  }
  // 노을 빛줄기 (위 오른쪽에서 비스듬히)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const x0 = w * (0.55 + k * 0.2), sp = w * (0.05 + k * 0.02);
    const g = ctx.createLinearGradient(x0, gy0, x0 - w * 0.5, gy1);
    g.addColorStop(0, 'rgba(255,170,100,.10)');
    g.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - sp, gy0);
    ctx.lineTo(x0 + sp, gy0);
    ctx.lineTo(x0 - w * 0.45 + sp * 2, gy1);
    ctx.lineTo(x0 - w * 0.55, gy1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // 잡초 (울타리 밑·앞 가장자리)
  ctx.strokeStyle = 'rgba(70,60,30,.75)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 26; k++) {
    const x = hsh(k * 2.9 + 1) * w, y = k < 14 ? gy0 + 3 + hsh(k) * 4 : gy1 - 3 - hsh(k) * 6;
    ctx.beginPath();
    for (let j = -1; j <= 1; j++) {
      ctx.moveTo(x + j * 2, y);
      ctx.quadraticCurveTo(x + j * 3, y - 4, x + j * 4 + 1, y - 6 - hsh(k + j) * 3);
    }
    ctx.stroke();
  }
  // 기름 웅덩이: 노을이 비친다
  const d = STAGES[s.stage], fl = s.jit[s.stage].flip;
  for (const [px0, py, pr] of d.puddles) {
    const px = fl ? W - px0 : px0, x = px * w, y = (Y0 + py * KY) * w, rx = pr * w, ry = pr * KY * w * 0.62;
    ctx.save();
    ell(ctx, x, y, rx, ry);
    ctx.fillStyle = 'rgba(40,16,30,.55)';
    ctx.fill();
    ctx.clip();
    const rf = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    rf.addColorStop(0, '#ffcf8a');
    rf.addColorStop(0.35, '#ee7658');
    rf.addColorStop(0.7, '#8a3a6e');
    rf.addColorStop(1, '#2a1640');
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = rf;
    ell(ctx, x, y + ry * 0.12, rx * 0.92, ry * 0.86);
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.4;
    for (const [col, o] of [['#7ffcff', 0.3], ['#ff7ad9', 0.45], ['#ffe066', 0.6]] as [string, number][]) {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.15, y + ry * 0.1, rx * o, ry * o * 0.8, 0, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,240,220,.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
  }
  // 가장자리의 반쯤 묻힌 장식 고철 (줍지 못함)
  for (const [px, py, kind] of [[0.04, 0.98, 0], [0.96, 0.12, 1], [0.03, 0.18, 1], [0.97, 1.0, 0]] as number[][]) {
    const x = px * w, y = (Y0 + py * KY) * w;
    if (kind === 0) {
      ctx.fillStyle = '#2a1a22';
      ell(ctx, x, y, w * 0.045, w * 0.022);
      ctx.fill();
      ctx.fillStyle = '#5a3a40';
      ell(ctx, x, y - 1, w * 0.022, w * 0.01);
      ctx.fill();
    } else {
      ctx.fillStyle = '#5e4a52';
      ctx.beginPath();
      ctx.moveTo(x - w * 0.03, y + 3);
      ctx.lineTo(x - w * 0.01, y - w * 0.03);
      ctx.lineTo(x + w * 0.035, y - w * 0.02);
      ctx.lineTo(x + w * 0.03, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,170,120,.4)';
      ctx.stroke();
    }
  }
  // 앞 가장자리: 녹슨 철판 턱
  const lip = ctx.createLinearGradient(0, gy1 - 4, 0, gy1 + w * 0.03);
  lip.addColorStop(0, '#4a2a26');
  lip.addColorStop(1, '#1d1028');
  ctx.fillStyle = lip;
  ctx.fillRect(0, gy1 - 2, w, h - gy1 + 2);
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, (gy0 + gy1) / 2, w * 0.45, w / 2, (gy0 + gy1) / 2, w * 0.95);
  vg.addColorStop(0, 'rgba(20,6,24,0)');
  vg.addColorStop(1, 'rgba(20,6,24,.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, gy0, w, gy1 - gy0);
}

// ── 우리 로봇 '자석이': 민트 몸·눈 화면·안테나·빨간 말굽자석 해머 ──
interface HeroLook { mood: 'idle' | 'charge' | 'strain' | 'happy' | 'star' | 'dizzy'; hammer: number; glow: number }
function heroLook(s: MagState, fxm: Record<string, number>): HeroLook {
  const load = loadOf(s);
  let mood: HeroLook['mood'] = 'idle';
  if (s.inv > 30) mood = 'dizzy';
  else if (s.t - (fxm.bigT ?? -999) < 70) mood = 'star';
  else if (s.t - (fxm.happyT ?? -999) < 45) mood = 'happy';
  else if (s.down && load >= 14) mood = 'strain';
  else if (s.down) mood = 'charge';
  // 해머 각도(0 = 앞, -π/2 = 위): 쉴 땐 어깨에, 누르면 머리 위로, 떼면 앞으로 내리친다
  let hammer = -2.25;
  if (s.down) hammer = -1.45 + Math.sin(s.t * 0.9) * 0.05;
  if (s.swing > 0) {
    const k = 18 - s.swing;
    hammer = k < 5 ? -1.5 + (k / 5) * 2.0 : 0.5 - ((k - 5) / 13) * 2.75;
  }
  return { mood, hammer, glow: s.down ? Math.min(1, s.holdT / 25) : 0 };
}

function drawHero(ctx: C2, s: MagState, X: number, Y: number, K: number, L: HeroLook) {
  const u = K * 0.0098, t = s.t, face = s.face;
  const moving = Math.hypot(s.rvx, s.rvy) > 0.0007;
  const bob = moving ? Math.abs(Math.sin(s.walk)) * 1.0 * u : Math.sin(t * 0.08) * 0.35 * u;
  const squash = s.swing > 12 ? 0.92 : 1;
  ctx.save();
  ctx.translate(X, Y);
  if (L.mood === 'dizzy') ctx.rotate(Math.sin(t * 0.5) * 0.12);
  // 다리
  for (const sd of [-1, 1]) {
    const lift = moving ? Math.max(0, Math.sin(s.walk + (sd > 0 ? 0 : Math.PI))) * 1.8 * u : 0;
    ctx.fillStyle = '#1f6f6c';
    rrect(ctx, sd * 2.4 * u - 1.1 * u, -4.4 * u - lift, 2.2 * u, 4 * u, 0.9 * u);
    ctx.fill();
    const fg = ctx.createLinearGradient(0, -1.4 * u - lift, 0, 0);
    fg.addColorStop(0, '#3a4652');
    fg.addColorStop(1, '#1a2028');
    ctx.fillStyle = fg;
    ell(ctx, sd * 2.4 * u + face * 0.6 * u, -0.7 * u - lift, 1.9 * u, 1.05 * u);
    ctx.fill();
  }
  ctx.translate(0, -bob);
  ctx.scale(1, squash);
  // 몸통
  const bg = ctx.createLinearGradient(-4.5 * u, -10.5 * u, 4.5 * u, -3.5 * u);
  bg.addColorStop(0, '#b8fff4');
  bg.addColorStop(0.35, '#55d6c9');
  bg.addColorStop(1, '#1f8a85');
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#0f3a3a';
  ctx.lineWidth = Math.max(1.2, u * 0.4);
  rrect(ctx, -4.6 * u, -10.6 * u, 9.2 * u, 7.4 * u, 2.2 * u);
  ctx.fill();
  ctx.stroke();
  // 배 계기판: 무게 바늘
  const load = loadOf(s);
  ctx.fillStyle = '#eafffb';
  rrect(ctx, -2.7 * u, -9.2 * u, 5.4 * u, 3.8 * u, 1 * u);
  ctx.fill();
  ctx.lineWidth = u * 0.55;
  for (const [a0, a1, col] of [[Math.PI, Math.PI * 1.45, '#3fbf6a'], [Math.PI * 1.45, Math.PI * 1.75, '#ffc23a'], [Math.PI * 1.75, Math.PI * 2, '#ff4a3a']] as [number, number, string][]) {
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.arc(0, -5.9 * u, 2.1 * u, a0, a1);
    ctx.stroke();
  }
  const na = Math.PI + Math.min(1, load / CAP) * Math.PI;
  ctx.strokeStyle = '#1a2a2a';
  ctx.lineWidth = u * 0.4;
  ctx.beginPath();
  ctx.moveTo(0, -5.9 * u);
  ctx.lineTo(Math.cos(na) * 2 * u, -5.9 * u + Math.sin(na) * 2 * u);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  rrect(ctx, -3.8 * u, -10 * u, 1.2 * u, 5.4 * u, 0.6 * u);
  ctx.fill();
  // 머리
  const hg = ctx.createLinearGradient(-5 * u, -18.6 * u, 5 * u, -10 * u);
  hg.addColorStop(0, '#d2fff8');
  hg.addColorStop(0.4, '#66e0d3');
  hg.addColorStop(1, '#23948e');
  ctx.fillStyle = hg;
  ctx.strokeStyle = '#0f3a3a';
  ctx.lineWidth = Math.max(1.2, u * 0.4);
  rrect(ctx, -5.2 * u, -18.6 * u, 10.4 * u, 8.4 * u, 2.6 * u);
  ctx.fill();
  ctx.stroke();
  // 노을 테두리 빛 (오른쪽 위)
  ctx.strokeStyle = 'rgba(255,190,120,.75)';
  ctx.lineWidth = u * 0.5;
  ctx.beginPath();
  ctx.moveTo(2.4 * u, -18.3 * u);
  ctx.quadraticCurveTo(4.9 * u, -18.3 * u, 4.9 * u, -15.6 * u);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4.3 * u, -10.2 * u);
  ctx.lineTo(4.3 * u, -6.5 * u);
  ctx.stroke();
  // 귀 볼트
  ctx.fillStyle = '#ffd84a';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * 5.4 * u, -14.4 * u, 0.9 * u, 1.4 * u);
    ctx.fill();
    ctx.stroke();
  }
  // 눈 화면
  const sg = ctx.createLinearGradient(0, -17.4 * u, 0, -11.4 * u);
  sg.addColorStop(0, '#1e3d4c');
  sg.addColorStop(1, '#0b1720');
  ctx.fillStyle = sg;
  rrect(ctx, -4.1 * u, -17.3 * u, 8.2 * u, 5.9 * u, 1.7 * u);
  ctx.fill();
  const ex = face * 0.5 * u, ey = -14.4 * u, eyeCol = L.mood === 'dizzy' ? '#ffd84a' : L.mood === 'star' ? '#ffe066' : '#7ffcff';
  ctx.fillStyle = ctx.strokeStyle = eyeCol;
  ctx.lineWidth = u * 0.55;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.25;
  ell(ctx, ex, ey, 3.6 * u, 2.2 * u);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const sd of [-1, 1]) {
    const x = ex + sd * 1.7 * u;
    if (L.mood === 'happy') {
      ctx.beginPath();
      ctx.arc(x, ey + 0.5 * u, 0.9 * u, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (L.mood === 'strain') {
      ctx.beginPath();
      ctx.moveTo(x - sd * 0.9 * u, ey - 0.9 * u);
      ctx.lineTo(x + sd * 0.5 * u, ey);
      ctx.lineTo(x - sd * 0.9 * u, ey + 0.9 * u);
      ctx.stroke();
    } else if (L.mood === 'star') {
      star5(ctx, x, ey, 1.25 * u);
      ctx.fill();
    } else if (L.mood === 'dizzy') {
      ctx.lineWidth = u * 0.35;
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k * 0.75 + t * 0.3 * sd, r = (k / 12) * 1.1 * u;
        ctx.lineTo(x + Math.cos(a) * r, ey + Math.sin(a) * r);
      }
      ctx.stroke();
    } else {
      const blink = (t + s.seed) % 190 < 7 ? 0.25 : 1, hh = (L.mood === 'charge' ? 1.3 : 2.2) * u * blink;
      rrect(ctx, x - 0.7 * u, ey - hh / 2, 1.4 * u, hh, 0.6 * u);
      ctx.fill();
      if (L.mood === 'charge') {
        ctx.beginPath();
        ctx.moveTo(x - 0.9 * u, ey - 1.6 * u + (sd > 0 ? 0.4 : -0.1) * u);
        ctx.lineTo(x + 0.9 * u, ey - 1.6 * u + (sd > 0 ? -0.1 : 0.4) * u);
        ctx.stroke();
      }
    }
  }
  // 입 (화면 속 점선 웃음 / 오 / 힘줌)
  ctx.lineWidth = u * 0.4;
  ctx.beginPath();
  if (L.mood === 'dizzy' || L.mood === 'strain') {
    for (let k = 0; k <= 4; k++) ctx.lineTo(ex - 1.2 * u + k * 0.6 * u, -12.4 * u + (k % 2 ? -0.35 : 0.35) * u);
  } else if (L.mood === 'charge') ell(ctx, ex, -12.3 * u, 0.45 * u, 0.4 * u);
  else ctx.arc(ex, -12.9 * u, 0.9 * u, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  if (L.mood === 'happy' || L.mood === 'star') {
    ctx.fillStyle = 'rgba(255,120,170,.7)';
    for (const sd of [-1, 1]) ctx.fillRect(ex + sd * 2.9 * u - 0.6 * u, -13.1 * u, 1.2 * u, 0.6 * u);
  }
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath();
  ctx.moveTo(-3.6 * u, -16.9 * u);
  ctx.lineTo(-1.6 * u, -16.9 * u);
  ctx.lineTo(-3.6 * u, -12.6 * u);
  ctx.closePath();
  ctx.fill();
  if (L.mood === 'strain') {
    ctx.fillStyle = '#9fe9ff';
    ell(ctx, -face * 6.2 * u, -17 * u + ((t * 0.4) % 4) * u, 0.7 * u, 1.1 * u);
    ctx.fill();
  }
  // 안테나
  ctx.strokeStyle = '#0f3a3a';
  ctx.lineWidth = u * 0.6;
  ctx.beginPath();
  ctx.moveTo(-face * 1 * u, -18.6 * u);
  ctx.quadraticCurveTo(-face * 1.6 * u, -20.6 * u, -face * 0.8 * u + Math.sin(t * 0.12) * 0.6 * u, -22 * u);
  ctx.stroke();
  const ax = -face * 0.8 * u + Math.sin(t * 0.12) * 0.6 * u, ay = -22.4 * u;
  const on = L.glow > 0 ? ((t >> 3) % 2 ? '#ff5a4a' : '#7ffcff') : '#ffd84a';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = on;
  ell(ctx, ax, ay, 2.2 * u, 2.2 * u);
  ctx.fill();
  ctx.globalAlpha = 1;
  ell(ctx, ax, ay, 1.15 * u, 1.15 * u);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, ax - 0.35 * u, ay - 0.35 * u, 0.4 * u, 0.4 * u);
  ctx.fill();
  // 팔 + 자석 해머 (손 쪽 = 바라보는 쪽)
  const px = face * 3.8 * u, py = -8.4 * u, a = face > 0 ? L.hammer : Math.PI - L.hammer;
  const hx = px + Math.cos(a) * 9.6 * u, hy = py + Math.sin(a) * 9.6 * u;
  ctx.strokeStyle = '#5a3418';
  ctx.lineWidth = u * 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px - Math.cos(a) * 1.2 * u, py - Math.sin(a) * 1.2 * u);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = '#a8703c';
  ctx.lineWidth = u * 0.9;
  ctx.stroke();
  ctx.fillStyle = '#2a9d96';
  ctx.strokeStyle = '#0f3a3a';
  ctx.lineWidth = u * 0.4;
  ell(ctx, px + Math.cos(a) * 0.8 * u, py + Math.sin(a) * 0.8 * u, 1.3 * u, 1.3 * u);
  ctx.fill();
  ctx.stroke();
  // 말굽자석 머리: 손잡이에 수직으로 놓인 U, 끝은 은색
  if (L.glow > 0) {
    const gl = ctx.createRadialGradient(hx, hy, 0, hx, hy, 7 * u);
    gl.addColorStop(0, `rgba(127,252,255,${0.55 * L.glow})`);
    gl.addColorStop(1, 'rgba(127,252,255,0)');
    ctx.fillStyle = gl;
    ell(ctx, hx, hy, 7 * u, 7 * u);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  ctx.scale(1.3, 1.3);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#5a0e0a';
  ctx.lineWidth = 2.9 * u;
  ctx.beginPath();
  ctx.arc(0.6 * u, 0, 2.3 * u, Math.PI * 0.5, Math.PI * 1.5, true);
  ctx.stroke();
  const mg = ctx.createLinearGradient(0, -3 * u, 0, 3 * u);
  mg.addColorStop(0, '#ff8a7a');
  mg.addColorStop(0.5, '#e8443a');
  mg.addColorStop(1, '#a3221a');
  ctx.strokeStyle = mg;
  ctx.lineWidth = 2.1 * u;
  ctx.stroke();
  ctx.fillStyle = '#e8eef4';
  ctx.strokeStyle = '#3e454e';
  ctx.lineWidth = u * 0.35;
  for (const sd of [-1, 1]) {
    rrect(ctx, 0.6 * u, sd * 2.3 * u - 1.05 * u, 2.2 * u, 2.1 * u, 0.4 * u);
    ctx.fill();
    ctx.stroke();
  }
  if (L.glow > 0.3 && (t >> 1) % 3) {
    ctx.strokeStyle = '#d8ffff';
    ctx.lineWidth = u * 0.35;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(2.8 * u, sd * 2.3 * u);
      for (let k = 1; k <= 3; k++) ctx.lineTo(2.8 * u + k * 1.1 * u, sd * 2.3 * u + (hsh(t + k * 7 + sd) - 0.5) * 2.2 * u);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
}

/** 고물 로봇 (녹슨 깡통) · 나무 로봇 · 자석 방패 로봇 */
function drawFoe(ctx: C2, s: MagState, f: Foe, X: number, Y: number, K: number) {
  const u = K * 0.0086 * (f.k === SHIELD ? 1.08 : 1), t = s.t, face = f.face;
  const hit = s.t - f.hitT < 7;
  ctx.save();
  ctx.translate(X, Y);
  let down = false;
  if (f.st === TUMBLE) {
    const lift = Math.abs(Math.sin(f.t * 0.28)) * Math.max(0, 4 - f.t * 0.08) * u;
    ctx.translate(0, -7 * u - lift);
    ctx.rotate(f.spin);
    ctx.translate(0, 7 * u);
    down = true;
  } else if (f.st === DOWN) {
    ctx.translate(0, -2.2 * u);
    ctx.rotate(face * 1.45 + Math.sin(f.t * 0.6) * 0.06);
    ctx.translate(0, 2.2 * u);
    down = true;
  } else if (f.stun > 0) ctx.rotate(Math.sin(t * 0.7) * 0.15);
  const wk = f.st === WALK ? f.ph * 0.22 : f.t * 0.9;
  const bob = f.st === WALK ? Math.abs(Math.sin(wk)) * 0.8 * u : 0;
  // 다리
  for (const sd of [-1, 1]) {
    const lift = f.st === WALK || f.st === DOWN ? Math.max(0, Math.sin(wk + (sd > 0 ? 0 : Math.PI))) * 1.5 * u : 0;
    ctx.fillStyle = f.k === WOOD ? '#7a4a22' : '#3a2a2a';
    ctx.fillRect(sd * 2.2 * u - 0.8 * u, -4 * u - lift, 1.6 * u, 3.6 * u);
    ctx.fillStyle = f.k === WOOD ? '#5a3414' : '#241818';
    rrect(ctx, sd * 2.2 * u - 1.7 * u + face * 0.4 * u, -1.3 * u - lift, 3.4 * u, 1.5 * u, 0.6 * u);
    ctx.fill();
  }
  ctx.translate(0, -bob);
  ctx.scale(face, 1);
  if (f.k === BOT) {
    // 팔(뒤)
    ctx.strokeStyle = '#6a3a24';
    ctx.lineWidth = u * 1.1;
    ctx.lineCap = 'round';
    const reach = down ? -0.8 : Math.sin(wk * 0.5) * 0.25;
    ctx.beginPath();
    ctx.moveTo(-2 * u, -8 * u);
    ctx.lineTo(3.5 * u, -8.5 * u + reach * 3 * u);
    ctx.stroke();
    // 몸통: 녹슨 통
    const g = ctx.createLinearGradient(-4 * u, -10 * u, 4 * u, -2 * u);
    g.addColorStop(0, '#f2a86a');
    g.addColorStop(0.4, '#c9683a');
    g.addColorStop(1, '#6e3220');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#3a1a10';
    ctx.lineWidth = Math.max(1, u * 0.38);
    rrect(ctx, -4 * u, -10.4 * u, 8 * u, 8 * u, 1.8 * u);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,25,10,.55)';
    ctx.lineWidth = u * 0.45;
    for (const yy of [-8, -5]) {
      ctx.beginPath();
      ctx.moveTo(-3.8 * u, yy * u);
      ctx.lineTo(3.8 * u, yy * u);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,200,140,.7)';
    ctx.lineWidth = u * 0.45;
    ctx.beginPath();
    ctx.moveTo(1.5 * u, -10.1 * u);
    ctx.quadraticCurveTo(3.7 * u, -10.1 * u, 3.7 * u, -7.5 * u);
    ctx.stroke();
    ctx.fillStyle = '#8f9aa6';
    ctx.fillRect(-3 * u, -7.4 * u, 2.6 * u, 2 * u);
    ctx.fillStyle = '#ffe2c0';
    for (const [rx, ry] of [[-3.2, -9.6], [3.2, -9.6], [-3.2, -3.2], [3.2, -3.2]]) ctx.fillRect(rx * u - 0.3 * u, ry * u - 0.3 * u, 0.6 * u, 0.6 * u);
    ctx.fillStyle = 'rgba(80,30,10,.5)';
    ell(ctx, 1.8 * u, -4.2 * u, 1.2 * u, 0.6 * u, 0.4);
    ctx.fill();
    // 머리: 기운 깡통 머리 + 큰 카메라 눈
    ctx.save();
    ctx.translate(0, -10.4 * u);
    ctx.rotate(-0.08 + (down ? 0.2 : Math.sin(wk) * 0.04));
    const hg = ctx.createLinearGradient(-3.4 * u, -5 * u, 3.4 * u, 0);
    hg.addColorStop(0, '#f6b47a');
    hg.addColorStop(1, '#a24c2a');
    ctx.fillStyle = hg;
    ctx.strokeStyle = '#3a1a10';
    ctx.lineWidth = Math.max(1, u * 0.38);
    rrect(ctx, -3.4 * u, -5.4 * u, 6.8 * u, 5.6 * u, 1.3 * u);
    ctx.fill();
    ctx.stroke();
    // 안테나(구부러진 철사 + 깜빡 전구)
    ctx.strokeStyle = '#3a2a2a';
    ctx.lineWidth = u * 0.4;
    ctx.beginPath();
    ctx.moveTo(-1.5 * u, -5.4 * u);
    ctx.lineTo(-2.2 * u, -7.4 * u);
    ctx.lineTo(-0.8 * u, -8.2 * u);
    ctx.stroke();
    ctx.fillStyle = (t + f.id * 13) % 50 < 25 ? '#ff5a4a' : '#7a1a14';
    ell(ctx, -0.8 * u, -8.4 * u, 0.7 * u, 0.7 * u);
    ctx.fill();
    const ex = 1 * u, ey = -2.8 * u;
    ctx.fillStyle = '#2a1410';
    ell(ctx, ex, ey, 2.2 * u, 2.2 * u);
    ctx.fill();
    if (down) {
      ctx.strokeStyle = '#ffe2c0';
      ctx.lineWidth = u * 0.5;
      ctx.beginPath();
      ctx.moveTo(ex - u, ey - u);
      ctx.lineTo(ex + u, ey + u);
      ctx.moveTo(ex + u, ey - u);
      ctx.lineTo(ex - u, ey + u);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff3dd';
      ell(ctx, ex, ey, 1.7 * u, 1.7 * u);
      ctx.fill();
      ctx.fillStyle = f.stun > 0 ? '#ffd84a' : '#ff4a3a';
      ell(ctx, ex + 0.4 * u, ey, 1 * u, 1 * u);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex + 0.1 * u, ey - 0.4 * u, 0.35 * u, 0.35 * u);
      ctx.fill();
      ctx.strokeStyle = '#2a1410';
      ctx.lineWidth = u * 0.7;
      ctx.beginPath();
      ctx.moveTo(ex - 1.8 * u, ey - 2.5 * u);
      ctx.lineTo(ex + 1.8 * u, ey - 1.7 * u);
      ctx.stroke();
    }
    ctx.strokeStyle = '#2a1410';
    ctx.lineWidth = u * 0.35;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-2.5 * u + i * 0.8 * u, -1.6 * u);
      ctx.lineTo(-2.5 * u + i * 0.8 * u, -0.4 * u);
      ctx.stroke();
    }
    ctx.restore();
    // 팔(앞) + 집게
    ctx.strokeStyle = '#8a4a2a';
    ctx.lineWidth = u * 1.2;
    ctx.beginPath();
    ctx.moveTo(1.5 * u, -7.5 * u);
    ctx.lineTo(5 * u, -7.2 * u - reach * 3 * u);
    ctx.stroke();
    ctx.strokeStyle = '#3a2a2a';
    ctx.lineWidth = u * 0.6;
    ctx.beginPath();
    ctx.moveTo(5 * u, -7.2 * u - reach * 3 * u);
    ctx.lineTo(6.2 * u, -8 * u - reach * 3 * u);
    ctx.moveTo(5 * u, -7.2 * u - reach * 3 * u);
    ctx.lineTo(6.2 * u, -6.4 * u - reach * 3 * u);
    ctx.stroke();
  } else if (f.k === WOOD) {
    // 나무 판자 몸 + 나무 공 머리 + 단추 눈 + 새싹
    const g = ctx.createLinearGradient(-4 * u, 0, 4 * u, 0);
    g.addColorStop(0, '#8a5a2e');
    g.addColorStop(0.35, '#e0b07a');
    g.addColorStop(1, '#8a5a2e');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#4a2a10';
    ctx.lineWidth = Math.max(1, u * 0.38);
    rrect(ctx, -4 * u, -10.4 * u, 8 * u, 8.2 * u, 0.8 * u);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = u * 0.3;
    ctx.strokeStyle = 'rgba(74,42,16,.7)';
    for (const xx of [-1.4, 1.4]) {
      ctx.beginPath();
      ctx.moveTo(xx * u, -10.2 * u);
      ctx.lineTo(xx * u, -2.4 * u);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(74,42,16,.35)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-2.6 * u + i * 1.6 * u, -6 * u, 1.4 * u, 0.3, 1.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#3a3a40';
    for (const [nx, ny] of [[-2.8, -9.4], [2.8, -9.4], [-2.8, -3.2], [2.8, -3.2]]) {
      ell(ctx, nx * u, ny * u, 0.35 * u, 0.35 * u);
      ctx.fill();
    }
    if (f.hp < HPK[WOOD] && f.st === WALK) {
      ctx.strokeStyle = '#3a1a08';
      ctx.lineWidth = u * 0.45;
      ctx.beginPath();
      ctx.moveTo(-3.5 * u, -8 * u);
      ctx.lineTo(-1 * u, -6.5 * u);
      ctx.lineTo(0.5 * u, -7.8 * u);
      ctx.lineTo(3 * u, -5.5 * u);
      ctx.stroke();
    }
    const hg = ctx.createRadialGradient(-1 * u, -14.6 * u, 0.5 * u, 0, -13.6 * u, 4 * u);
    hg.addColorStop(0, '#f2c890');
    hg.addColorStop(1, '#9a6430');
    ctx.fillStyle = hg;
    ctx.strokeStyle = '#4a2a10';
    ctx.lineWidth = Math.max(1, u * 0.38);
    ell(ctx, 0, -13.6 * u, 3.6 * u, 3.4 * u);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(90,50,20,.5)';
    ell(ctx, -1.8 * u, -12.4 * u, 0.6 * u, 0.4 * u);
    ctx.fill();
    for (const sd of [-0.4, 1.8]) {
      if (down) {
        ctx.strokeStyle = '#1a1010';
        ctx.lineWidth = u * 0.45;
        ctx.beginPath();
        ctx.moveTo(sd * u - 0.6 * u, -14.4 * u);
        ctx.lineTo(sd * u + 0.6 * u, -13.2 * u);
        ctx.moveTo(sd * u + 0.6 * u, -14.4 * u);
        ctx.lineTo(sd * u - 0.6 * u, -13.2 * u);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1a1010';
        ell(ctx, sd * u, -13.8 * u, 0.85 * u, 0.85 * u);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ell(ctx, sd * u + 0.25 * u, -14.1 * u, 0.28 * u, 0.28 * u);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = u * 0.3;
    ctx.beginPath();
    for (let k = 0; k <= 5; k++) ctx.lineTo(-0.6 * u + k * 0.55 * u, -11.6 * u + (k % 2 ? 0.35 : -0.15) * u);
    ctx.stroke();
    ctx.fillStyle = '#5fc04a';
    ctx.strokeStyle = '#2a6a1a';
    ctx.lineWidth = u * 0.25;
    ell(ctx, 0.9 * u, -17.6 * u, 1.3 * u, 0.6 * u, -0.5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -16.9 * u);
    ctx.lineTo(0.3 * u, -17.6 * u);
    ctx.stroke();
  } else if (f.k === SHIELD) {
    // 강철 반구 몸 + 빨간 눈 두 개 + 앞으로 든 큰 말굽자석(빼앗은 고철이 붙는다)
    const g = ctx.createLinearGradient(-4 * u, -12 * u, 4 * u, -2 * u);
    g.addColorStop(0, '#e6eef8');
    g.addColorStop(0.45, '#8a97a8');
    g.addColorStop(1, '#3a4250');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#1a2028';
    ctx.lineWidth = Math.max(1, u * 0.38);
    ctx.beginPath();
    ctx.moveTo(-4.4 * u, -2.6 * u);
    ctx.lineTo(-4.4 * u, -9 * u);
    ctx.quadraticCurveTo(-4.4 * u, -15 * u, 0, -15 * u);
    ctx.quadraticCurveTo(4.4 * u, -15 * u, 4.4 * u, -9 * u);
    ctx.lineTo(4.4 * u, -2.6 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#141820';
    rrect(ctx, -3.2 * u, -12.2 * u, 6.4 * u, 2.8 * u, 1.2 * u);
    ctx.fill();
    ctx.fillStyle = down ? '#ffd84a' : '#ff3a2e';
    for (const sd of [-1.2, 1.4]) {
      rrect(ctx, sd * u - 0.8 * u, -11.4 * u, 1.6 * u, 1 * u, 0.4 * u);
      ctx.fill();
    }
    // 말굽자석 방패
    ctx.save();
    ctx.translate(4.6 * u, -7 * u);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#5a0e0a';
    ctx.lineWidth = 3.4 * u;
    ctx.beginPath();
    ctx.arc(0, 0, 3.4 * u, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.strokeStyle = '#e23d3d';
    ctx.lineWidth = 2.5 * u;
    ctx.stroke();
    ctx.fillStyle = '#e8eef4';
    for (const sd of [-1, 1]) ctx.fillRect(-2.4 * u, sd * 3.4 * u - 1.2 * u, 2.4 * u, 2.4 * u);
    ctx.restore();
  }
  if (hit) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    rrect(ctx, -4.4 * u, -17 * u, 8.8 * u, 15 * u, 2 * u);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // 어질어질 별 (쓰러진 뒤)
  if (f.st === DOWN || f.stun > 0) {
    for (let k = 0; k < 3; k++) {
      const a = t * 0.15 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#ffe066';
      star5(ctx, X + Math.cos(a) * 4 * u, Y - (f.st === DOWN ? 6 : 19) * u + Math.sin(a) * 1.2 * u, 1.1 * u);
      ctx.fill();
    }
  }
}

function drawDrum(ctx: C2, q: Drum, X: number, Y: number, K: number, t: number) {
  const u = K * 0.0086, lit = q.fuse > 0 && (t >> 1) % 2 === 0;
  ctx.save();
  ctx.translate(X + (q.fuse > 0 ? (hsh(t) - 0.5) * 2 : 0), Y);
  ctx.fillStyle = 'rgba(30,10,24,.35)';
  ell(ctx, -1.2 * u, 0, 4.6 * u, 1.6 * u);
  ctx.fill();
  const g = ctx.createLinearGradient(-3.6 * u, 0, 3.6 * u, 0);
  g.addColorStop(0, '#7a1a10');
  g.addColorStop(0.3, '#ff6a4a');
  g.addColorStop(0.65, '#d83a22');
  g.addColorStop(1, '#6a140c');
  ctx.fillStyle = lit ? '#ffffff' : g;
  ctx.strokeStyle = '#3a0c08';
  ctx.lineWidth = Math.max(1, u * 0.38);
  rrect(ctx, -3.6 * u, -10 * u, 7.2 * u, 10 * u, 1 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(-3.6 * u, -6.4 * u, 7.2 * u, 1.4 * u);
  ctx.fillStyle = '#1a1a1a';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-3.6 * u + i * 2 * u, -5 * u);
    ctx.lineTo(-2.6 * u + i * 2 * u, -6.4 * u);
    ctx.lineTo(-1.8 * u + i * 2 * u, -6.4 * u);
    ctx.lineTo(-2.8 * u + i * 2 * u, -5 * u);
    ctx.closePath();
    ctx.fill();
  }
  // 불꽃 그림
  ctx.fillStyle = '#fff3dd';
  ctx.beginPath();
  ctx.moveTo(0, -4.4 * u);
  ctx.quadraticCurveTo(1.6 * u, -2.6 * u, 0.6 * u, -1 * u);
  ctx.quadraticCurveTo(0, -2 * u, -0.6 * u, -1 * u);
  ctx.quadraticCurveTo(-1.6 * u, -2.6 * u, 0, -4.4 * u);
  ctx.fill();
  ctx.fillStyle = '#a3221a';
  ell(ctx, 0, -10 * u, 3.6 * u, 1.2 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5a0e0a';
  ell(ctx, 1.4 * u, -10 * u, 0.7 * u, 0.3 * u);
  ctx.fill();
  ctx.restore();
}

/** 대장 크레인: 무한궤도 몸통 + 성난 눈 조종석 + 붐 + 갈고리 자석 */
function drawBoss(ctx: C2, s: MagState, f: Foe, X: number, Y: number, K: number) {
  const u = K * 0.0086, t = s.t, dead = f.st !== WALK, hit = s.t - f.hitT < 6;
  ctx.save();
  ctx.translate(X, Y);
  if (dead) ctx.rotate(Math.min(0.35, f.t * 0.01));
  ctx.fillStyle = 'rgba(30,10,24,.4)';
  ell(ctx, 0, 0, 16 * u, 3.4 * u);
  ctx.fill();
  // 궤도
  ctx.fillStyle = '#2a2a30';
  rrect(ctx, -14 * u, -4.6 * u, 28 * u, 5 * u, 2.4 * u);
  ctx.fill();
  ctx.fillStyle = '#5a5a64';
  for (let i = 0; i < 7; i++) {
    ell(ctx, -11 * u + i * 3.7 * u, -2.1 * u, 1.3 * u, 1.3 * u);
    ctx.fill();
  }
  // 몸통 (노랑 + 위험 줄무늬)
  const g = ctx.createLinearGradient(0, -14 * u, 0, -4 * u);
  g.addColorStop(0, '#ffd84a');
  g.addColorStop(1, '#c78a10');
  ctx.fillStyle = hit ? '#ffffff' : g;
  ctx.strokeStyle = '#3a2a08';
  ctx.lineWidth = Math.max(1.2, u * 0.4);
  rrect(ctx, -12 * u, -13.5 * u, 24 * u, 9.4 * u, 1.6 * u);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  rrect(ctx, -12 * u, -6.6 * u, 24 * u, 2.4 * u, 0.5 * u);
  ctx.clip();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-12 * u, -6.6 * u, 24 * u, 2.4 * u);
  ctx.fillStyle = '#ffd23a';
  for (let i = -6; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 2.4 * u, -6.6 * u);
    ctx.lineTo(i * 2.4 * u + 1.2 * u, -6.6 * u);
    ctx.lineTo(i * 2.4 * u - 0.2 * u, -4.2 * u);
    ctx.lineTo(i * 2.4 * u - 1.4 * u, -4.2 * u);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // 조종석 얼굴
  ctx.fillStyle = hit ? '#ffffff' : '#e8b02a';
  rrect(ctx, -6 * u, -22 * u, 12 * u, 9 * u, 1.6 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#141820';
  rrect(ctx, -4.8 * u, -20.6 * u, 9.6 * u, 5 * u, 1.2 * u);
  ctx.fill();
  ctx.fillStyle = dead ? '#ffd84a' : '#ff3a2e';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 3.8 * u, -19.6 * u);
    ctx.lineTo(sd * 0.8 * u, -18.4 * u);
    ctx.lineTo(sd * 0.8 * u, -17.2 * u);
    ctx.lineTo(sd * 3.8 * u, -17.8 * u);
    ctx.closePath();
    ctx.fill();
  }
  // 굴뚝 연기
  ctx.fillStyle = '#3a3a40';
  ctx.fillRect(7.5 * u, -19 * u, 2 * u, 5.5 * u);
  for (let k = 0; k < 3; k++) {
    const p = ((t * 0.02 + k / 3) % 1), r = (1 + p * 2.5) * u;
    ctx.globalAlpha = (1 - p) * (dead ? 0.7 : 0.4);
    ctx.fillStyle = dead ? '#2a2a2a' : '#8a7a8a';
    ell(ctx, 8.5 * u + p * 3 * u, -20 * u - p * 8 * u, r, r);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawHand(ctx: C2, x: number, y: number, sz: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * sz * 0.12);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#fff3e4';
  ctx.strokeStyle = '#3a2030';
  ctx.lineWidth = Math.max(1.5, sz * 0.07);
  ctx.beginPath();
  ctx.moveTo(-sz * 0.14, sz * 0.05);
  ctx.lineTo(-sz * 0.14, -sz * 0.55);
  ctx.quadraticCurveTo(0, -sz * 0.7, sz * 0.14, -sz * 0.55);
  ctx.lineTo(sz * 0.14, -sz * 0.1);
  ctx.quadraticCurveTo(sz * 0.42, -sz * 0.15, sz * 0.45, sz * 0.05);
  ctx.lineTo(sz * 0.42, sz * 0.38);
  ctx.quadraticCurveTo(sz * 0.3, sz * 0.62, 0, sz * 0.6);
  ctx.quadraticCurveTo(-sz * 0.3, sz * 0.58, -sz * 0.36, sz * 0.3);
  ctx.lineTo(-sz * 0.42, sz * 0.05);
  ctx.quadraticCurveTo(-sz * 0.3, -sz * 0.08, -sz * 0.14, sz * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** 고철 산 위의 구경꾼 고양이 (큰 순간마다 펄쩍) */
function drawCat(ctx: C2, x: number, y: number, u: number, t: number, jump: number, fur: number) {
  ctx.save();
  ctx.translate(x, y - jump);
  ctx.fillStyle = '#2a1830';
  ctx.strokeStyle = 'rgba(255,170,120,.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(3 * u, 0);
  ctx.quadraticCurveTo(7 * u + fur, -3 * u, 6 * u + Math.sin(t * 0.05) * 1.5 * u, -9 * u - fur);
  ctx.lineWidth = 1.8 * u;
  ctx.strokeStyle = '#2a1830';
  ctx.stroke();
  ell(ctx, 0, -3 * u, 3.6 * u + fur * 0.3, 3.2 * u + fur * 0.3);
  ctx.fill();
  ell(ctx, -1.6 * u, -7.4 * u, 2.6 * u, 2.3 * u);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-1.6 * u + sd * 2.2 * u, -8.4 * u);
    ctx.lineTo(-1.6 * u + sd * 1.6 * u, -11 * u);
    ctx.lineTo(-1.6 * u + sd * 0.4 * u, -9.4 * u);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,170,120,.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-1.6 * u, -7.4 * u, 2.6 * u, Math.PI * 1.3, Math.PI * 1.95);
  ctx.stroke();
  ctx.fillStyle = '#ffe066';
  const blink = t % 220 < 8;
  for (const sd of [-1, 1]) {
    ell(ctx, -1.6 * u + sd * 1 * u, -7.6 * u, 0.6 * u, blink ? 0.1 * u : jump > 1 ? 0.8 * u : 0.5 * u);
    ctx.fill();
  }
  ctx.restore();
}

function drawBelt(ctx: C2, s: MagState, w: number) {
  const y0 = (Y0 + BELT_Y0 * KY) * w, y1 = (Y0 + BELT_Y1 * KY) * w, t = s.t;
  ctx.fillStyle = 'rgba(20,8,20,.35)';
  ctx.fillRect(0, y1, w, w * 0.012);
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#3a3440');
  g.addColorStop(1, '#221c28');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, y1 - y0);
  const step = w * 0.06, off = (t * BELT_V * w) % step;
  ctx.strokeStyle = 'rgba(255,200,160,.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -step + off; x < w + step; x += step) {
    ctx.moveTo(x, y0 + 3);
    ctx.lineTo(x + (y1 - y0) * 0.25, (y0 + y1) / 2);
    ctx.lineTo(x, y1 - 3);
  }
  ctx.stroke();
  for (const yy of [y0, y1]) {
    ctx.fillStyle = '#9aa0ac';
    ctx.fillRect(0, yy - 2, w, 4);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(0, yy - 2, w, 1);
  }
  // 왼쪽 미끄럼관(고철이 떨어져 나옴) · 오른쪽 분쇄기(이빨이 씹는다)
  ctx.fillStyle = '#5a4a5a';
  rrect(ctx, -w * 0.02, y0 - w * 0.09, w * 0.08, w * 0.08, w * 0.012);
  ctx.fill();
  ctx.fillStyle = '#2a1a2a';
  ctx.fillRect(w * 0.0, y0 - w * 0.02, w * 0.055, w * 0.02);
  const cx = w * 0.92;
  const cg = ctx.createLinearGradient(cx, y0 - w * 0.06, cx + w * 0.1, y1);
  cg.addColorStop(0, '#6a6e7a');
  cg.addColorStop(1, '#2a2c34');
  ctx.fillStyle = cg;
  rrect(ctx, cx, y0 - w * 0.07, w * 0.1, y1 - y0 + w * 0.08, w * 0.012);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(cx, y0 - w * 0.07, w * 0.1, w * 0.014);
  ctx.fillStyle = '#1a1a1a';
  for (let i = 0; i < 4; i++) ctx.fillRect(cx + i * w * 0.026, y0 - w * 0.07, w * 0.012, w * 0.014);
  ctx.fillStyle = '#0e0a12';
  ctx.fillRect(cx - 2, y0 + 2, w * 0.02, y1 - y0 - 4);
  ctx.fillStyle = '#d7dee6';
  const chew = Math.sin(t * 0.4) * 2;
  for (let i = 0; i < 4; i++) {
    const yy = y0 + 4 + i * ((y1 - y0 - 8) / 3);
    ctx.beginPath();
    ctx.moveTo(cx - 2, yy + chew);
    ctx.lineTo(cx + w * 0.02, yy + 3 + chew);
    ctx.lineTo(cx - 2, yy + 6 + chew);
    ctx.fill();
  }
}

function drawAll(ctx: C2, s: MagState, w: number, h: number, _th: Theme) {
  const fx = juice(s), m = fx.memo, t = s.t, d = STAGES[s.stage];
  const PX = (x: number) => x * w, PY = (y: number) => (Y0 + y * KY) * w;
  // ── 사건 → 손맛 (한 번씩만) ──
  let bossDmg = 0;
  for (const e of s.events) {
    if (e.id <= (m.eid ?? 0)) continue;
    m.eid = e.id;
    const x = PX(e.x), y = PY(e.y), K = w * depth(e.y), body = y - K * 0.06;
    switch (e.kind) {
      case 'press':
        fx.ring(x, body, 'rgba(127,252,255,.9)', w * 0.09, 3);
        break;
      case 'clink':
        fx.burst(x, body - K * 0.02, '#e8f6ff', 4, 1.6, 1.6);
        break;
      case 'fling': {
        const n = e.n ?? 1;
        fx.burst(x, body - K * 0.04, '#fff3c0', 10 + Math.min(20, n), 3.6, 2.4);
        fx.burst(x, body - K * 0.04, '#7ffcff', 6, 2.6, 1.8);
        fx.ring(x, body, '#7ffcff', w * (0.08 + n * 0.004), 4);
        fx.kick(2 + n * 0.12);
        if (n >= 18) fx.pop(x, body - K * 0.12, '와르르!', '#ffe066', 18);
        break;
      }
      case 'knock': {
        const n = e.n ?? 1;
        fx.burst(x, body, '#ffb347', 12 + n * 2, 3.6 + n * 0.3, 3);
        fx.burst(x, body, '#fff3c0', 6, 4.2, 1.8);
        fx.burst(x, body, '#cfd6de', 8, 2.8, 2.2);
        fx.ring(x, body, '#ffe08a', w * (0.06 + n * 0.01), 4);
        fx.kick(3 + Math.min(9, n * 1.5));
        fx.pop(x, body - K * 0.08, e.text === 'roll' ? '데굴!' : e.text === 'boom' ? '휙!' : '쾅!', n >= 3 ? '#ffe066' : '#ffffff', n >= 3 ? 16 : 14);
        if (n <= 1 && t % 3 === 0) fx.pop(x + K * 0.05, body - K * 0.15, '삐빅?!', '#ffcfa0', 12);
        if (n >= 2) (m.bigX = (m.bigT ?? -99) > t - 40 ? (m.bigX ?? x) * 0.6 + x * 0.4 : x), (m.bigYY = clamp(body - K * 0.2, w * 0.3, w * 1.12));
        if (n >= 2) (m.bigT = t), (m.bigN = n);
        if (n >= 3) (m.catT = t), fx.blink('#ffe6a0', n >= 4 ? 0.28 : 0.16);
        m.happyT = t;
        break;
      }
      case 'roll':
        break;
      case 'dent':
        fx.burst(x, body, '#ffe2c0', 6, 2, 1.8);
        fx.pop(x, body - K * 0.1, e.text ?? '깡!', '#ffe2c0', 13);
        break;
      case 'pop':
        if (e.n === WOOD) fx.burst(x, y - K * 0.02, '#c99355', 14, 2.6, 2.4), fx.pop(x, y - K * 0.06, '우지직', '#f2c890', 12);
        else if (e.n === BOSS) fx.burst(x, y - K * 0.1, '#ffd84a', 40, 5, 3.4), fx.burst(x, y - K * 0.1, '#5a4a5a', 30, 3, 4), fx.kick(14);
        else fx.burst(x, y - K * 0.02, '#cfd6de', 10, 2.2, 2), fx.burst(x, y - K * 0.02, '#ffb347', 6, 2.4, 1.8);
        break;
      case 'ouch':
        fx.kick(9);
        fx.blink('#ff9a8a', 0.22);
        fx.burst(x, body - K * 0.06, '#ffe066', 14, 3, 2.2);
        fx.pop(x, body - K * 0.16, (e.n ?? 1) <= 0 ? '퓨슝…' : '아야!', '#ffb0a0', 18);
        break;
      case 'bubble':
        fx.ring(x, body, '#bff8ff', w * 0.1, 3);
        if ((m.bubT ?? -99) < t - 30) (m.bubT = t), fx.pop(x, body - K * 0.13, '퐁!', '#bff8ff', 14);
        break;
      case 'bonk':
        fx.burst(x, body, '#ffffff', 4, 1.6, 1.4);
        break;
      case 'steal':
        fx.burst(x, body, '#ff6a5a', 5, 1.8, 1.6);
        if ((e.n ?? 0) % 3 === 1) fx.pop(x, body - K * 0.12, '쏙! 내 고철!', '#ff9a8a', 12);
        break;
      case 'overload':
        fx.pop(x, body - K * 0.16, '너무 무거워 쿵!', '#ffe066', 16);
        fx.ring(x, body, '#ff6a5a', w * 0.12, 4);
        fx.kick(7);
        break;
      case 'fuse':
        fx.burst(x, y - K * 0.09, '#ffe066', 6, 1.6, 1.6);
        break;
      case 'boom':
        fx.burst(x, y - K * 0.05, '#fff6c0', 18, 6.5, 4.5);
        fx.burst(x, y - K * 0.05, '#ffb030', 30, 5.2, 5.5);
        fx.burst(x, y - K * 0.05, '#ff5a2a', 24, 3.8, 6.5);
        fx.burst(x, y - K * 0.05, '#4a3a4a', 18, 2.2, 7);
        fx.ring(x, y - K * 0.03, '#ffd28a', BOOM_R * w * 1.25, 8);
        fx.ring(x, y - K * 0.03, '#ffffff', BOOM_R * w * 0.7, 4);
        fx.kick(13);
        fx.blink('#ffd28a', 0.4);
        fx.pop(x, y - K * 0.14, '펑!', '#ffe066', 30);
        m.catT = t;
        break;
      case 'crush':
        fx.burst(x, y - 4, '#cfd6de', 6, 2, 1.6);
        if ((m.crushT ?? -99) < t - 40) (m.crushT = t), fx.pop(x - w * 0.06, y - K * 0.06, '우지끈', '#d7dee6', 12);
        break;
      case 'hookWarn':
        fx.pop(x, y - K * 0.18, '피해요!', '#ff9a8a', 15);
        break;
      case 'thud':
        fx.burst(x, y, '#c08a6a', 22, 3.6, 3);
        fx.ring(x, y, '#ffcf9a', w * 0.12, 5);
        fx.kick(8);
        fx.pop(x, y - K * 0.1, '쿵!', '#ffffff', 22);
        break;
      case 'bossHit':
        bossDmg += e.n ?? 1;
        fx.burst(x, y - K * 0.1, '#ffe066', 3, 2.4, 1.8);
        break;
      case 'bossDown':
        fx.blink('#ffffff', 0.6);
        fx.kick(16);
        fx.pop(x, y - K * 0.2, '대장 크레인 쓰러짐!', '#ffe066', 22);
        m.bigT = t;
        m.bigN = 0;
        m.catT = t;
        break;
      case 'clear':
        for (let k = 0; k < 5; k++) fx.burst(w * (0.15 + k * 0.175), h * 0.42, ['#ffe066', '#7ffcff', '#ff7ad9', '#9be37a', '#ffb347'][k], 18, 4.2, 2.6);
        fx.blink('#fff3c0', 0.25);
        break;
      case 'fail':
        fx.burst(x, body, '#cfd6de', 20, 3.4, 2.4);
        break;
      case 'empty':
        fx.pop(x, body - K * 0.12, '빈손!', '#d7dee6', 13);
        break;
    }
  }
  if (bossDmg > 0) {
    const b = s.foes.find((f) => f.k === BOSS);
    if (b) fx.pop(PX(b.x) + (hsh(t) - 0.5) * w * 0.1, PY(b.y) - w * 0.2, `-${bossDmg}`, '#ffe066', Math.min(30, 14 + bossDmg));
  }

  ctx.save();
  fx.begin(ctx);
  background(ctx, s, w, h);
  // 하늘에 나는 새 (시차)
  ctx.strokeStyle = 'rgba(40,16,48,.75)';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 3; k++) {
    const bx = (((t * (0.25 + k * 0.07) + k * 140) % (w + 60)) - 30), by = w * (0.1 + k * 0.05) + Math.sin(t * 0.03 + k) * 4, fl = Math.sin(t * 0.25 + k * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(bx - 5, by - fl);
    ctx.quadraticCurveTo(bx - 2, by - 2, bx, by);
    ctx.quadraticCurveTo(bx + 2, by - 2, bx + 5, by - fl);
    ctx.stroke();
  }
  // 고양이 구경꾼 (왼쪽 고철 더미 위)
  const catAge = t - (m.catT ?? -999);
  drawCat(ctx, w * 0.085, w * 0.36, w * 0.0058, t, catAge < 30 ? Math.sin((catAge / 30) * Math.PI) * w * 0.045 : 0, catAge < 40 ? 2 : 0);
  if (catAge === 1) fx.pop(w * 0.1, w * 0.27, '냐!', '#ffe0b0', 13);
  if (d.belt) drawBelt(ctx, s, w);

  // ── 바닥 위 표시: 자석 범위 · 겨눈 부채꼴(미리 보기) · 방패 자석 범위 · 갈고리 그림자 ──
  const load = loadOf(s), br = BR(load);
  for (const f of s.foes) {
    if (f.k !== SHIELD || f.st !== WALK) continue;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,90,74,.55)';
    ctx.fillStyle = 'rgba(255,90,74,.08)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = t * 0.5;
    ell(ctx, PX(f.x), PY(f.y), FIELD_R * w, FIELD_R * KY * w);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (s.hook && s.hook.phase === 1) {
    const hx = PX(s.hook.tx), hy = PY(s.hook.ty), k = s.hook.t / HOOK_WARN, pulse = 0.5 + 0.5 * Math.sin(t * 0.5);
    ctx.fillStyle = `rgba(20,0,10,${0.25 + k * 0.35})`;
    ell(ctx, hx, hy, 0.085 * w, 0.085 * KY * w);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,70,60,${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 0.085 * w, 0.085 * KY * w, 0, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ell(ctx, hx, hy, 0.085 * w, 0.085 * KY * w);
    ctx.stroke();
  }
  let preview: Shot | null = null;
  if (s.down && s.phase === 'play') {
    const rx = PX(s.rx), ry = PY(s.ry), mr = mrOf(s.holdT);
    const fg = ctx.createRadialGradient(rx, ry, 0, rx, ry, mr * w);
    fg.addColorStop(0, 'rgba(127,252,255,.02)');
    fg.addColorStop(0.85, 'rgba(127,252,255,.12)');
    fg.addColorStop(1, 'rgba(127,252,255,.0)');
    ctx.fillStyle = fg;
    ell(ctx, rx, ry, mr * w, mr * KY * w);
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = 'rgba(127,252,255,.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 0.8;
    ell(ctx, rx, ry, mr * w, mr * KY * w);
    ctx.stroke();
    ctx.restore();
    for (let k = 0; k < 3; k++) {
      const p = 1 - ((t * 0.035 + k / 3) % 1);
      ctx.strokeStyle = `rgba(190,255,255,${0.35 * (1 - p)})`;
      ctx.lineWidth = 1.5;
      ell(ctx, rx, ry, mr * w * p, mr * KY * w * p);
      ctx.stroke();
    }
    // 겨눈 부채꼴: 지금 떼면 어디로 퍼질지
    const n = ballCount(s);
    if (n > 0) {
      preview = predictThrow(s, s.aimA);
      const a = preview.aim, sp = spread(n), L = 0.42;
      ctx.save();
      const cg = ctx.createRadialGradient(rx, ry, br * w, rx, ry, L * w);
      cg.addColorStop(0, 'rgba(255,226,120,.38)');
      cg.addColorStop(1, 'rgba(255,226,120,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      for (let i = 0; i <= 12; i++) {
        const aa = a - sp + (i / 12) * sp * 2;
        ctx.lineTo(rx + Math.cos(aa) * L * w, ry + Math.sin(aa) * L * KY * w);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,236,170,.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(rx + Math.cos(a + sd * sp) * br * w, ry + Math.sin(a + sd * sp) * br * KY * w);
        ctx.lineTo(rx + Math.cos(a + sd * sp) * L * w, ry + Math.sin(a + sd * sp) * L * KY * w);
        ctx.stroke();
      }
      ctx.restore();
    }
    // 손가락 자리
    const fxp = PX(s.tx), fyp = PY(s.ty);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ell(ctx, fxp, fyp, 9 + Math.sin(t * 0.3) * 1.5, (9 + Math.sin(t * 0.3) * 1.5) * KY);
    ctx.stroke();
  }

  // ── 땅에 붙은 것들(그림자) → 키 순서대로 세운 것들 ──
  type Spr = { y: number; f: () => void };
  const sprites: Spr[] = [];
  for (const c of s.scraps) {
    if (c.st !== GROUND) continue;
    const K = w * depth(c.y), r = SR[c.k] * K * (c.k === CHUNK ? 1.1 : 1.25), x = PX(c.x), y = PY(c.y), hop = c.hop > 0 ? Math.sin((c.hop / 14) * Math.PI) * r * 1.2 : 0;
    sprites.push({
      y: c.y,
      f: () => {
        ctx.fillStyle = 'rgba(30,10,24,.35)';
        ell(ctx, x - r * 0.25, y + r * 0.15, r * 1.05, r * 0.42);
        ctx.fill();
        drawPiece(ctx, c.k, c.v, x, y - r * 0.45 - hop, r, c.rot);
        if (c.k === CHUNK && (t >> 4) % 2 && s.phase === 'play') {
          ctx.strokeStyle = 'rgba(255,240,180,.7)';
          ctx.lineWidth = 1.2;
          ell(ctx, x, y - r * 0.45, r * 1.5, r * 1.5);
          ctx.stroke();
        }
      },
    });
  }
  for (const q of s.drums) if (!q.gone) sprites.push({ y: q.y, f: () => drawDrum(ctx, q, PX(q.x), PY(q.y), w * depth(q.y), t) });
  for (const f of s.foes) {
    if (f.st === DEAD) continue;
    const K = w * depth(f.y), X = PX(f.x), Y = PY(f.y);
    if (f.k === BOSS) {
      sprites.push({ y: f.y, f: () => drawBoss(ctx, s, f, X, Y, K) });
      continue;
    }
    sprites.push({
      y: f.y,
      f: () => {
        ctx.fillStyle = 'rgba(30,10,24,.35)';
        ell(ctx, X - K * 0.012, Y + K * 0.003, K * 0.042, K * 0.014);
        ctx.fill();
        drawFoe(ctx, s, f, X, Y, K);
        // 방패 로봇: 빼앗은 고철 + 과부하 칸
        if (f.k === SHIELD && f.st === WALK) {
          const u = K * 0.0086;
          for (let i = 0; i < SHIELD_CAP; i++) {
            ctx.fillStyle = i < f.load ? '#ff5a4a' : 'rgba(255,255,255,.3)';
            ell(ctx, X - 3 * 1.4 * u + i * 1.4 * u, Y - 19 * u, 0.55 * u, 0.55 * u);
            ctx.fill();
          }
        }
        // 위험 표시: 곧 부딪칠 로봇
        if (f.st === WALK && s.phase === 'play' && s.shield <= 0) {
          const dd = Math.hypot(f.x - s.rx, f.y - s.ry) - (br * 0.9 + ER[f.k] * 0.8);
          if (dd < 0.07) {
            const u = K * 0.0086;
            ctx.fillStyle = '#ff3a2e';
            ell(ctx, X, Y - 21 * u, Math.max(8, 2.4 * u), Math.max(8, 2.4 * u));
            ctx.fill();
            text(ctx, '!', X, Y - 21 * u + 0.5, Math.max(12, 3.6 * u), '#ffffff', 'center', 900, '');
          }
        }
      },
    });
  }
  const hl = heroLook(s, m);
  {
    const K = w * depth(s.ry), X = PX(s.rx), Y = PY(s.ry), u = K * 0.0098, cy = Y - 10 * u;
    const ball = s.scraps.filter((c) => c.st === STUCK);
    const pos = ball.map((c) => {
      const a = c.a + s.bRot, ce = Math.cos(c.e), rr = c.rr * K * 1.3;
      return { c, x: X + Math.cos(a) * rr * ce, y: cy + Math.sin(a) * rr * ce * 0.62 - Math.sin(c.e) * rr * 0.85, z: Math.sin(a) * ce };
    });
    sprites.push({
      y: s.ry,
      f: () => {
        ctx.fillStyle = 'rgba(30,10,24,.38)';
        ell(ctx, X - u * 1.5, Y + u * 0.2, 6 * u + br * K * 0.6, 2.2 * u + br * K * 0.15);
        ctx.fill();
        if (ball.length) {
          const gl = ctx.createRadialGradient(X, cy, 0, X, cy, br * K * 1.8);
          gl.addColorStop(0, 'rgba(127,252,255,.18)');
          gl.addColorStop(1, 'rgba(127,252,255,0)');
          ctx.fillStyle = gl;
          ell(ctx, X, cy, br * K * 1.8, br * K * 1.8);
          ctx.fill();
        }
        if (ball.length) {
          const R = br * K * 1.38;
          const sg = ctx.createRadialGradient(X - R * 0.35, cy - R * 0.4, R * 0.1, X, cy, R);
          sg.addColorStop(0, 'rgba(230,255,255,.16)');
          sg.addColorStop(0.75, 'rgba(127,252,255,.1)');
          sg.addColorStop(1, 'rgba(127,252,255,.35)');
          ctx.fillStyle = sg;
          ell(ctx, X, cy, R, R);
          ctx.fill();
        }
        for (const p of pos) if (p.z < 0) drawPiece(ctx, p.c.k, p.c.v, p.x, p.y, SR[p.c.k] * K * 1.6, p.c.rot + s.bRot);
        drawHero(ctx, s, X, Y, K, hl);
        for (const p of pos) if (p.z >= 0) drawPiece(ctx, p.c.k, p.c.v, p.x, p.y, SR[p.c.k] * K * 1.6, p.c.rot + s.bRot);
        if (ball.length >= 6 && (t >> 2) % 6 === 0) {
          const p = pos[(t >> 3) % pos.length];
          ctx.fillStyle = '#ffffff';
          star5(ctx, p.x, p.y, 3);
          ctx.fill();
        }
        if (s.shield > 0) {
          const a = s.shield < 120 ? 0.5 + 0.5 * Math.sin(t * 0.5) : 1;
          const bg = ctx.createRadialGradient(X - 3 * u, cy - 4 * u, 0, X, cy, 13 * u);
          bg.addColorStop(0, `rgba(220,255,255,${0.05 * a})`);
          bg.addColorStop(0.8, `rgba(127,252,255,${0.16 * a})`);
          bg.addColorStop(1, `rgba(190,255,255,${0.5 * a})`);
          ctx.fillStyle = bg;
          ell(ctx, X, cy, 13 * u, 13 * u);
          ctx.fill();
          ctx.strokeStyle = `rgba(255,255,255,${0.5 * a})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(X, cy, 11.5 * u, Math.PI * 1.15, Math.PI * 1.45);
          ctx.stroke();
        }
        if (s.down && ball.length) {
          const n = ballCount(s), heavy = load >= 18;
          const bx = X, by = Y - 27 * u - br * K * 0.3;
          pill(ctx, bx - 13, by - 9, 26, 18, heavy ? 'rgba(120,20,20,.85)' : 'rgba(10,40,48,.82)', heavy ? '#ff8a7a' : '#7ffcff');
          text(ctx, String(n), bx, by + 0.5, 13, heavy ? '#ffd0c8' : '#d8ffff', 'center', 900, '');
        }
      },
    });
  }
  sprites.sort((a, b) => a.y - b.y);
  for (const sp of sprites) sp.f();

  // 끌려오는 고철(윙 줄) · 날아가는 고철(꼬리) · 방패에 붙은 고철
  for (const c of s.scraps) {
    if (c.st === PULL) {
      const K = w * depth(c.y), x = PX(c.x), y = PY(c.y) - K * 0.03, r = SR[c.k] * K * 1.2;
      ctx.strokeStyle = 'rgba(160,255,255,.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - c.vx * w * 4, y - c.vy * KY * w * 4);
      ctx.stroke();
      drawPiece(ctx, c.k, c.v, x, y, r, c.rot);
    } else if (c.st === FLY) {
      const K = w * depth(c.y), x = PX(c.x), gy = PY(c.y), lift = K * (0.045 - Math.min(0.04, c.life * 0.0009)), y = gy - lift, r = SR[c.k] * K * 1.2;
      ctx.fillStyle = 'rgba(30,10,24,.3)';
      ell(ctx, x, gy, r * 0.9, r * 0.35);
      ctx.fill();
      if (!c.spent) {
        ctx.strokeStyle = c.k === CHUNK ? 'rgba(255,200,120,.75)' : 'rgba(255,236,170,.65)';
        ctx.lineWidth = c.k === CHUNK ? r * 0.9 : Math.max(1.5, r * 0.7);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - c.vx * w * 5, y - c.vy * KY * w * 5);
        ctx.stroke();
      }
      drawPiece(ctx, c.k, c.v, x, y, r, c.rot);
    } else if (c.st === STOLEN) {
      const K = w * depth(c.y);
      drawPiece(ctx, c.k, c.v, PX(c.x), PY(c.y) - K * 0.06, SR[c.k] * K * 1.1, c.rot);
    }
  }
  // 갈고리 자석 (크레인 붐 끝에서 줄로 내려온다)
  const boss = s.foes.find((f) => f.k === BOSS && f.st === WALK);
  if (boss) {
    const bx = PX(boss.x), by = PY(boss.y) - w * 0.19;
    let hx = bx + w * 0.12, hy = by + w * 0.06, drop = 0;
    if (s.hook) {
      const k = s.hook.phase === 1 ? Math.min(1, s.hook.t / 30) : 1;
      hx = hx + (PX(s.hook.tx) - hx) * k;
      const ty = PY(s.hook.ty) - w * 0.16;
      hy = hy + (ty - hy) * k;
      if (s.hook.phase === 2) drop = Math.min(1, s.hook.t / 4) * w * 0.15 * (1 - Math.max(0, s.hook.t - 12) / 14);
    }
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = w * 0.014;
    ctx.beginPath();
    ctx.moveTo(PX(boss.x), PY(boss.y) - w * 0.07);
    ctx.lineTo(bx + w * 0.12, by);
    ctx.stroke();
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = w * 0.008;
    ctx.stroke();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(bx + w * 0.12, by);
    ctx.lineTo(hx, hy + drop);
    ctx.stroke();
    const g = ctx.createLinearGradient(hx - w * 0.04, 0, hx + w * 0.04, 0);
    g.addColorStop(0, '#3a3e48');
    g.addColorStop(0.4, '#a8b0bc');
    g.addColorStop(1, '#2a2e36');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#141820';
    ctx.lineWidth = 1.2;
    ell(ctx, hx, hy + drop, w * 0.04, w * 0.016);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e23d3d';
    ctx.fillRect(hx - w * 0.04, hy + drop - 1, w * 0.08, 3);
    if (s.hook && s.hook.phase === 1) {
      ctx.fillStyle = '#4a4e58';
      drawPiece(ctx, CHUNK, 1, hx, hy + w * 0.03, w * 0.03, t * 0.02);
    }
  }

  // 큰 순간: 화면 가운데 "와르르 ×N!"
  const bigAge = t - (m.bigT ?? -999);
  if (bigAge < 55 && (m.bigN ?? 0) >= 2) {
    // 한 번 던져 쓰러뜨린 수: 쓰러진 무리 위에, 늘수록 크게 (둘 → 셋 → 와르르 넷!)
    const n = m.bigN, k = bigAge < 7 ? 1.7 - (bigAge / 7) * 0.7 : 1, a = bigAge > 38 ? 1 - (bigAge - 38) / 17 : 1;
    const px = clamp(m.bigX ?? w / 2, w * 0.24, w * 0.76), yy = (m.bigYY ?? w * 0.6) - bigAge * 0.25, sz = (16 + Math.min(16, n * 3)) * k;
    ctx.globalAlpha = a;
    const lbl = n >= 3 ? `와르르 ${KNUM[Math.min(10, n)] ?? n}!` : `${KNUM[n]}!`;
    const bgr = ctx.createRadialGradient(px, yy, 0, px, yy, sz * 3);
    bgr.addColorStop(0, 'rgba(60,14,40,.5)');
    bgr.addColorStop(1, 'rgba(60,14,40,0)');
    ctx.fillStyle = bgr;
    ell(ctx, px, yy, sz * 3.2, sz * 1.1);
    ctx.fill();
    text(ctx, lbl, px, yy, sz, n >= 4 ? '#ffe066' : n >= 3 ? '#ffd27a' : '#ffffff', 'center', 900, 'rgba(90,20,40,.92)');
    ctx.globalAlpha = 1;
  }
  if (s.slow > 0) {
    const vg = ctx.createRadialGradient(w / 2, h * 0.5, w * 0.35, w / 2, h * 0.5, w * 0.9);
    vg.addColorStop(0, 'rgba(255,220,150,0)');
    vg.addColorStop(1, 'rgba(255,200,120,.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();

  drawHud(ctx, s, w, h, preview);
}

function drawHud(ctx: C2, s: MagState, w: number, h: number, preview: Shot | null) {
  const d = STAGES[s.stage], t = s.t, F = Math.max(12, Math.round(w * 0.038));
  // ── 위 띠: 판 · 하트 / 체력 · 남은 로봇 · 점수 ──
  ctx.font = FONT(F);
  const title = `${s.stage + 1}판 · ${d.name}`, tw = ctx.measureText(title).width;
  pill(ctx, 8, 8, tw + 22, F + 12);
  text(ctx, title, 19 + tw / 2, 8 + (F + 12) / 2 + 0.5, F, '#fff3dd', 'center', 800, '');
  for (let k = 0; k < 3; k++) {
    const x = w - 18 - k * 22, y = 8 + (F + 12) / 2;
    heart(ctx, x, y, 8);
    ctx.fillStyle = k < s.hearts ? '#ff5a6a' : 'rgba(40,20,40,.6)';
    ctx.fill();
    ctx.strokeStyle = k < s.hearts ? '#ffd0d8' : 'rgba(255,200,200,.35)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    if (k < s.hearts) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ell(ctx, x - 3, y - 3, 2, 1.4);
      ctx.fill();
    }
  }
  const y2 = 8 + F + 18;
  // 체력: 전지 칸
  const cells = s.hpMax, cw = 11, chx = 8;
  pill(ctx, chx, y2, 30 + cells * (cw + 3), F + 8);
  const low = s.hp <= 1 && s.phase === 'play';
  ctx.fillStyle = low && (t >> 3) % 2 ? '#ff5a4a' : '#7ffcff';
  ctx.beginPath();
  ctx.moveTo(chx + 15, y2 + 4);
  ctx.lineTo(chx + 10, y2 + (F + 8) / 2 + 1);
  ctx.lineTo(chx + 14, y2 + (F + 8) / 2 + 1);
  ctx.lineTo(chx + 12, y2 + F + 4);
  ctx.lineTo(chx + 19, y2 + (F + 8) / 2 - 1);
  ctx.lineTo(chx + 15, y2 + (F + 8) / 2 - 1);
  ctx.closePath();
  ctx.fill();
  for (let k = 0; k < cells; k++) {
    rrect(ctx, chx + 24 + k * (cw + 3), y2 + 5, cw, F - 2, 2.5);
    ctx.fillStyle = k < s.hp ? (low ? '#ff5a4a' : '#55d6c9') : 'rgba(255,255,255,.12)';
    ctx.fill();
  }
  if (s.shield > 0 && s.phase === 'play') text(ctx, `보호막 ${Math.ceil(s.shield / 60)}`, chx + 34 + cells * (cw + 3) + 30, y2 + (F + 8) / 2, F - 1, '#bff8ff', 'center', 800);
  // 남은 로봇
  let left = s.foes.filter((f) => f.st === WALK && f.k !== BOSS).length;
  if (!d.boss) left += d.waves.slice(s.wave).reduce((a, x) => a + x.n, 0);
  const lt = d.boss ? `크레인 ${Math.max(0, Math.ceil(((s.foes.find((f) => f.k === BOSS)?.hp ?? 0) / HPK[BOSS]) * 100))}%` : `남은 로봇 ${left}`;
  ctx.font = FONT(F - 1);
  const lw = ctx.measureText(lt).width + 20;
  pill(ctx, w - 8 - lw, y2, lw, F + 8);
  const bo = d.boss ? s.foes.find((f) => f.k === BOSS) : null;
  if (bo) {
    ctx.save();
    rrect(ctx, w - 8 - lw, y2, lw, F + 8, (F + 8) / 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,90,58,.55)';
    ctx.fillRect(w - 8 - lw, y2, lw * Math.max(0, bo.hp / HPK[BOSS]), F + 8);
    ctx.restore();
  }
  text(ctx, lt, w - 8 - lw / 2, y2 + (F + 8) / 2 + 0.5, F - 1, '#ffd8b0', 'center', 800, '');
  // 점수·별 합
  const sc = `★${s.stars}  ${s.pts}`;
  ctx.font = FONT(F - 1);
  const sw = ctx.measureText(sc).width + 18;
  const sx = Math.max(chx + 36 + cells * (cw + 3) + (s.shield > 0 ? 64 : 4), (w - sw) / 2 + 20);
  if (sx + sw < w - 14 - lw) {
    pill(ctx, sx, y2, sw, F + 8);
    text(ctx, sc, sx + sw / 2, y2 + (F + 8) / 2 + 0.5, F - 1, '#ffe066', 'center', 800, '');
  }
  // 알림 띠
  if (s.news && t - s.news.t < NEWS_T && s.phase === 'play' && t - (juice(s).memo.bigT ?? -999) > 60) {
    const a = Math.min(1, (NEWS_T - (t - s.news.t)) / 20);
    ctx.globalAlpha = a;
    ctx.font = FONT(F - 1, 700);
    const nw = Math.min(w - 16, ctx.measureText(s.news.text).width + 24);
    pill(ctx, (w - nw) / 2, y2 + F + 14, nw, F + 10, 'rgba(10,40,48,.85)', 'rgba(127,252,255,.7)');
    text(ctx, s.news.text, w / 2, y2 + F + 14 + (F + 10) / 2 + 0.5, F - 1, '#d8ffff', 'center', 700, '');
    ctx.globalAlpha = 1;
  }

  // ── 아래 띠: 별 조건(쉬운 말) + 한 줄 안내 ──
  const by0 = (Y0 + H * KY) * w + 4;
  const pg = ctx.createLinearGradient(0, by0, 0, h);
  pg.addColorStop(0, 'rgba(36,18,44,.96)');
  pg.addColorStop(1, 'rgba(20,10,28,.98)');
  ctx.fillStyle = pg;
  rrect(ctx, 4, by0, w - 8, h - by0 - 4, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,179,90,.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const rowH = (h - by0 - 8) / 4;
  const starState = (k: number): 'on' | 'off' | 'wait' => {
    if (s.phase === 'result' && s.ok) return s.starOk[k] ? 'on' : 'off';
    if (k === 0) return 'wait';
    if (k === 1) return s.best >= d.multi ? 'on' : 'wait';
    return s.hits > 0 ? 'off' : 'wait';
  };
  const drawStarLine = (k: number, x: number, y: number, extra = '') => {
    const st = starState(k);
    star5(ctx, x + 8, y, 7.5);
    ctx.fillStyle = st === 'on' ? '#ffd84a' : st === 'off' ? 'rgba(120,90,110,.6)' : 'rgba(255,216,74,.25)';
    ctx.fill();
    ctx.strokeStyle = st === 'off' ? 'rgba(160,120,140,.6)' : '#ffd84a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const txt = STAR_TEXT(d, k) + extra;
    text(ctx, txt, x + 20, y + 0.5, F, st === 'off' ? 'rgba(200,170,190,.55)' : st === 'on' ? '#ffe9a0' : '#fff3dd', 'left', 700, '');
    if (st === 'off') {
      ctx.font = FONT(F, 700);
      const tw2 = ctx.measureText(txt).width;
      ctx.strokeStyle = 'rgba(255,120,120,.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 18, y);
      ctx.lineTo(x + 22 + tw2, y);
      ctx.stroke();
    }
  };
  drawStarLine(0, 14, by0 + rowH * 0.62);
  if (d.nstar >= 2) drawStarLine(1, 14, by0 + rowH * 1.62, s.best > 0 && s.best < d.multi && s.phase === 'play' ? `  (지금 ${s.best})` : '');
  if (d.nstar >= 3) drawStarLine(2, 14, by0 + rowH * 2.62);
  if (d.nstar < 3) text(ctx, d.nstar === 1 ? '별은 판마다 하나씩 늘어나요' : '다음 판부터 별이 셋', 14, by0 + rowH * (d.nstar + 0.62), F - 1, 'rgba(255,220,200,.5)', 'left', 600, '');
  text(ctx, d.tip, w / 2, by0 + rowH * 3.55, F - 1, '#ffc89a', 'center', 600, '');

  // ── 판 시작 카드: 이번 판의 새것 한 줄 (첫 꾹이나 시간이 지나면 사라짐) ──
  if (s.phase === 'play' && s.pt < CARD_T && s.stage > 0 && !(s.presses > s.stagePress && s.pt > 70)) {
    const a = Math.min(1, (CARD_T - s.pt) / 25, s.pt / 8);
    ctx.globalAlpha = a;
    const cy = y2 + F * 4.6;
    ctx.font = FONT(F + 1, 700);
    const nw = Math.min(w - 20, Math.max(ctx.measureText(d.news).width + 28, w * 0.6));
    rrect(ctx, (w - nw) / 2, cy - F * 2.1, nw, F * 3.6, 14);
    ctx.fillStyle = 'rgba(29,16,40,.88)';
    ctx.fill();
    ctx.strokeStyle = '#ffb35a';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (s.stage > 0) {
      pill(ctx, (w - nw) / 2 + 8, cy - F * 1.8, 42, F + 4, '#ff5a4a', '#ffd0c8');
      text(ctx, 'NEW', (w - nw) / 2 + 29, cy - F * 1.8 + (F + 4) / 2 + 0.5, F - 1, '#ffffff', 'center', 900, '');
    }
    text(ctx, `${s.stage + 1}판 · ${d.name}`, w / 2, cy - F * 1.2, F + 6, '#ffe066', 'center', 900);
    text(ctx, d.news, w / 2, cy + F * 0.55, F, '#fff3dd', 'center', 700, '');
    ctx.globalAlpha = 1;
    // 새것 가리키기(스포트라이트)
    const tgt = spotTarget(s);
    if (tgt && s.pt > 20) {
      const sx = tgt.x * w, sy = (Y0 + tgt.y * KY) * w - w * 0.03, r = w * (0.07 + 0.01 * Math.sin(t * 0.2));
      ctx.strokeStyle = 'rgba(255,230,120,.95)';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -t;
      ell(ctx, sx, sy, r, r);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // ── 손가락 안내 (1판, 첫 꾹 전) ──
  if (s.phase === 'play' && s.stage === 0 && s.presses === 0) {
    const tg = s.foes.find((f) => f.st === WALK);
    const hx = tg ? tg.x * w : w * 0.5, hy = tg ? (Y0 + tg.y * KY) * w + w * 0.02 : (Y0 + 0.35 * KY) * w;
    const ph = (t % 80) / 80, press = ph < 0.55 ? Math.min(1, ph / 0.12) : Math.max(0, 1 - (ph - 0.55) / 0.1);
    if (ph < 0.6) {
      ctx.strokeStyle = `rgba(127,252,255,${0.8 - ph})`;
      ctx.lineWidth = 2.5;
      ell(ctx, hx, hy, w * (0.03 + ph * 0.12), w * (0.03 + ph * 0.12) * KY);
      ctx.stroke();
    }
    drawHand(ctx, hx + w * 0.04, hy + w * 0.06, w * 0.11, press);
    const msg = '꾹 눌러 모으고, 떼면 와르르!';
    ctx.font = FONT(F + 1);
    const mw = ctx.measureText(msg).width + 26;
    pill(ctx, (w - mw) / 2, hy + w * 0.15, mw, F + 14, 'rgba(10,40,48,.9)', '#7ffcff');
    text(ctx, msg, w / 2, hy + w * 0.15 + (F + 14) / 2 + 0.5, F + 1, '#ffffff', 'center', 900, '');
  }
  // ── 결과 카드 ──
  if (s.phase === 'result') drawResult(ctx, s, w, F);
  else if (preview && preview.kills > 0 && s.down) {
    const tx = s.tx * w, ty = (Y0 + s.ty * KY) * w - 22;
    const lbl = `${preview.kills}개 쓰러뜨림`;
    ctx.font = FONT(F - 1);
    const lw2 = ctx.measureText(lbl).width + 16;
    pill(ctx, clamp(tx - lw2 / 2, 4, w - lw2 - 4), ty - 10, lw2, F + 6, 'rgba(60,24,10,.85)', '#ffd84a');
    text(ctx, lbl, clamp(tx, lw2 / 2 + 4, w - lw2 / 2 - 4), ty - 10 + (F + 6) / 2 + 0.5, F - 1, '#ffe066', 'center', 800, '');
  }
}

function spotTarget(s: MagState): { x: number; y: number } | null {
  const k = STAGES[s.stage].key;
  if (k === 'chunk') return s.scraps.find((c) => c.k === CHUNK && c.st === GROUND) ?? null;
  if (k === 'wood') return s.foes.find((f) => f.k === WOOD && f.st === WALK && inYard(f)) ?? null;
  if (k === 'drum') return s.drums.find((q) => !q.gone) ?? null;
  if (k === 'shield') return s.foes.find((f) => f.k === SHIELD && f.st === WALK && inYard(f)) ?? null;
  if (k === 'belt') return { x: 0.9, y: (BELT_Y0 + BELT_Y1) / 2 };
  if (k === 'crane') return s.foes.find((f) => f.k === BOSS) ?? null;
  return null;
}

function drawResult(ctx: C2, s: MagState, w: number, F: number) {
  const d = STAGES[s.stage], age = s.pt, cy = (Y0 + 0.45 * KY) * w;
  const a = Math.min(1, age / 10);
  ctx.globalAlpha = a;
  const cw = w * 0.84, ch = s.ok ? F * 8.6 : F * 5.6;
  rrect(ctx, (w - cw) / 2, cy - ch / 2, cw, ch, 16);
  ctx.fillStyle = 'rgba(29,16,40,.92)';
  ctx.fill();
  ctx.strokeStyle = s.ok ? '#ffd84a' : '#ff8a7a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const pk = age < 10 ? 1.3 - age * 0.03 : 1;
  if (s.ok) {
    text(ctx, s.won ? '마당을 다 지켰다!' : '마당 지켰다!', w / 2, cy - ch / 2 + F * 1.4, (F + 9) * pk, '#ffe066', 'center', 900);
    for (let k = 0; k < d.nstar; k++) {
      const x = w / 2 + (k - (d.nstar - 1) / 2) * F * 3, y = cy - ch / 2 + F * 3.6, on = s.starOk[k], show = age > 14 + k * 10;
      const r = F * (show && on ? (age < 24 + k * 10 ? 1.7 - (age - 14 - k * 10) * 0.05 : 1.2) : 1.2);
      star5(ctx, x, y, r);
      ctx.fillStyle = show && on ? '#ffd84a' : 'rgba(255,216,74,.18)';
      ctx.fill();
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    for (let k = 0; k < d.nstar; k++) {
      const on = s.starOk[k];
      text(ctx, `${on ? '✓' : '·'} ${STAR_TEXT(d, k)}`, w / 2, cy - ch / 2 + F * (5.4 + k * 1.15), F - 1, on ? '#ffe9a0' : 'rgba(220,190,210,.55)', 'center', 700, '');
    }
  } else {
    text(ctx, '퓨슝… 로봇이 고장!', w / 2, cy - ch / 2 + F * 1.5, (F + 6) * pk, '#ffb0a0', 'center', 900);
    text(ctx, s.hearts > 0 ? `하트 하나로 이 판 다시 (남은 하트 ${s.hearts})` : '하트를 다 썼어요', w / 2, cy - ch / 2 + F * 3.1, F, '#fff3dd', 'center', 700, '');
    text(ctx, '무거우면 느려요 — 조금 모아 자주 던져 봐요', w / 2, cy - ch / 2 + F * 4.4, F - 1, '#ffc89a', 'center', 600, '');
  }
  ctx.globalAlpha = 1;
}
