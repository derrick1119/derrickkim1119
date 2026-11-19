/**
 * 쿵쿵 아기 공룡 (32라운드: 실시간 액션 2탄) — 발구르기 충격파 × 꾹 눌렀다 떼기 × 콤보.
 * 조작(손가락 하나, 하는 일 하나): 화면 어디든 꾹 = 아기 공룡이 한 발을 번쩍 든다(오래 누를수록 높이 → 충격파가 넓게).
 *   떼면 '쿵!' — 땅이 출렁이며 둥근 충격파가 퍼진다. 키보드는 스페이스 꾹.
 * 규칙(결정적, 고정 간격 물리):
 *   - 충격파 안의 땅 위 동굴 사람은 공중으로 붕 뜬다(포물선). 뜬 사람은 다치지 않는다.
 *   - 떨어지는 중(그림자가 노랗게 빛날 때)에 다시 쿵 하면 더 높이 튀어 오르고, 그렇게 높이 떨어지면 기절해 데굴데굴 굴러 나간다.
 *     땅에 그냥 떨어진 사람은 어질어질하다 다시 일어나 온다. 크게 쿵 할수록 넓고 높지만, 멀리 날아가 다음 쿵이 커야 닿는다.
 *   - 둥지에 닿은 사람은 알을 들고 달아난다(그 전에 쿵 하면 알이 둥지로 돌아온다). 알 셋을 다 잃으면 하트 -1, 그 판만 다시.
 *   - 해가 질 때까지 알을 지키면 판을 깬다. 하트 셋을 다 잃거나 여섯 판을 마치면 끝.
 * 와우: 첫 쿵에 땅이 출렁이며 꼬마 동굴 사람 다섯이 한꺼번에 붕 떠서 데굴데굴 — 한 번 더 쿵으로 공중 저글.
 * 판 6개(하는 일이 바뀐다): 1 동굴 사람(띄우고 떨어지기 전에 다시 쿵) → 2 익룡(쿵이 안 닿음 → 사람을 익룡 밑에서 띄워 부딪히기)
 *   → 3 굴러오는 바위(쿵으로 되받아쳐 뒤의 사람들을 볼링처럼) → 4 방패 든 사람(작은 쿵은 막힘 → 큰 쿵 모으기)
 *   → 5 화산 진동(땅이 저절로 쿵 → 박자에 맞춰 받아 치기) → 6 매머드 대장(큰 쿵으로 띄워 세 번 저글).
 * 웃음: 뜬 사람은 팔다리를 버둥대며 '으악', 기절하면 머리 위에 별이 돌고 데굴데굴, 공룡은 힘줄 때 볼이 빵빵해진다.
 *   바위 위 작은 새가 큰 순간마다 펄쩍 뛰며 '짹!'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 화면 배치(폭 단위): 둥지 중심 화면 y · 땅 평면 세로 눌림 · 높이 배율 · 지평선 · 땅 앞 끝(지층 단면 시작) · 아래 띠 */
const CY = 0.84, SQ = 0.6, ZS = 0.5, HZ = 0.44, GE = 1.2, GB = 1.3;
/** 꾹: 다 모으는 데 걸리는 틱 · '큰 쿵' 문턱 · 쿵 뒤 발을 다시 들 수 있을 때까지 */
const CH_T = 48, BIG = 0.6, REC = 14;
/** 충격파 반지름(땅 평면) · 퍼지는 속도 */
const rOf = (ch: number) => 0.19 + 0.27 * ch;
const WAVE_V = 0.045;
/** 중력 · 띄우는 힘(모은 만큼) · 저글할 때마다 더 · 밀려나는 힘 */
const G = 0.0004;
const lv = (ch: number) => 0.011 + 0.007 * ch;
const RB = 0.0032;
const KB0 = 0.0006, KB1 = 0.0012, KBR = 0.0003;
/** 떨어지는 중 이 높이(꼭대기 대비) 아래면 다시 쿵이 닿는다 */
const ZRF = 0.85;
/** 한 사람을 공중에서 띄울 수 있는 최대 횟수 (그 뒤엔 뻗어서 떨어진다) */
const MAXFLY = 4;
const GRAB_D = 0.1, GRAB_T = 4, DAZE_T = 22, ROLL_V = 0.0085, FLEE_V = 0.0035, EXIT = 0.74;
/** 익룡: 나는 높이 · 부딪힘 거리(가로·높이) */
const PZ = 0.24, PT_HR = 0.08, PT_VZ = 0.075;
const ROCK_V = 0.0032, ROCK_OUT = 0.009, ROCK_R = 0.045, ROCK_WARN = 70;
const QUAKE_P = 330, QUAKE_W = 110, QUAKE_CH = 0.3;
const EGGS = 3;
const RESULT_OK = 180, RESULT_FAIL = 160, CARD_T = 170, NEWS_T = 160;
const STAR_PTS = 60, WIN_PTS = 200;

type K = 'kid' | 'man' | 'shield' | 'mammoth' | 'ptero';
const WGT: Record<K, number> = { kid: 0.8, man: 1, shield: 1.05, mammoth: 1.4, ptero: 1 };
const PTS: Record<K, number> = { kid: 10, man: 20, shield: 30, mammoth: 200, ptero: 50 };
const SPD: Record<K, number> = { kid: 0.001, man: 0.0017, shield: 0.0013, mammoth: 0.0006, ptero: 0 };
const BODY: Record<K, number> = { kid: 0.028, man: 0.034, shield: 0.04, mammoth: 0.085, ptero: 0.05 };
const NAME: Record<K, string> = { kid: '꼬마 동굴 사람', man: '동굴 사람', shield: '방패 든 사람', mammoth: '매머드 대장', ptero: '익룡' };
/** 적 상태 */
const WALK = 0, AIR = 1, DAZE = 2, KO = 3, GRAB = 4, FLEE = 5, FALL = 6, GONE = 7, FLY = 8, SWOOP = 9;

type StarK = 'ko' | 'nograb' | 'fly3' | 'multi' | 'ptero' | 'bowl' | 'combo' | 'boss';
interface Star { k: StarK; n: number; label: string }
/** [초, 종류, 수, 각도(도, 0 오른쪽 · 90 앞 · -90 뒤), 퍼짐(도), 거리] */
type WaveDef = [number, K | 'rock', number, number, number, number?];
interface StageDef { key: K | 'rock' | 'quake'; name: string; news: string; hint: string; goal: string; T: number; spd: number; zrf: number; stars: Star[]; waves: WaveDef[]; quake?: boolean }

const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
export const STAGES: StageDef[] = [
  {
    key: 'kid', name: '알둥지 언덕', news: '', goal: '알 지키기', T: 21, spd: 0.8, zrf: 0.95,
    hint: '떨어지기 전에(그림자가 노랄 때) 한 번 더 쿵!',
    stars: [S('ko', 8, '해 지기 전에 8명 기절')],
    waves: [
      [0, 'kid', 5, 0, 0, 0.17],
      [2.6, 'kid', 3, 180, 40],
      [4.6, 'kid', 3, 0, 40],
      [7, 'man', 3, -140, 36],
      [10.5, 'man', 3, -40, 36],
      [13.5, 'man', 4, 90, 90],
      [16.5, 'man', 3, 180, 40],
    ],
  },
  {
    key: 'ptero', name: '익룡 하늘', news: '익룡 — 쿵이 안 닿아요, 사람을 띄워 맞혀요', goal: '알 지키기', T: 22, spd: 0.9, zrf: 0.9,
    hint: '익룡 그림자 밑의 사람을 크게 띄워 부딪혀요',
    stars: [S('ko', 6, '해 지기 전에 6명 기절'), S('ptero', 1, '익룡 떨어뜨리기')],
    waves: [
      [0, 'man', 4, -150, 50],
      [0.8, 'ptero', 1, -60, 0],
      [3.5, 'man', 4, 10, 60],
      [7.5, 'man', 3, 150, 40],
      [9.5, 'ptero', 1, -120, 0],
      [11.5, 'man', 4, -50, 60],
      [15, 'man', 4, 90, 80],
      [16, 'ptero', 1, 20, 0],
    ],
  },
  {
    key: 'rock', name: '바위 비탈', news: '굴러오는 바위 — 쿵으로 되받아쳐요', goal: '알 지키기', T: 22, spd: 1, zrf: 0.85,
    hint: '바위 뒤에 사람이 줄 서면 그때 쿵! 볼링처럼 넘어져요',
    stars: [S('ko', 13, '해 지기 전에 13명 기절'), S('bowl', 4, '바위로 넷 넘어뜨리기'), S('combo', 4, '쿵 콤보 넷')],
    waves: [
      [0, 'man', 3, -150, 40],
      [1.2, 'rock', 1, -30, 0],
      [1.4, 'man', 3, -30, 0, 0.74],
      [5, 'man', 3, 160, 40],
      [6.5, 'rock', 1, 200, 0],
      [6.9, 'man', 3, 200, 80, 0.7],
      [10, 'man', 4, 60, 70],
      [12, 'rock', 1, -100, 0],
      [12.4, 'man', 3, -100, 80, 0.7],
      [16, 'man', 4, 120, 70],
      [17, 'rock', 1, 20, 0],
      [17.4, 'man', 3, 20, 70, 0.7],
    ],
  },
  {
    key: 'shield', name: '방패 부족', news: '방패 든 사람 — 큰 쿵만 통해요', goal: '알 지키기', T: 22, spd: 1, zrf: 0.85,
    hint: '방패는 노란 큰 쿵으로만 떠요 — 오래 꾹!',
    stars: [S('ko', 9, '해 지기 전에 9명 기절'), S('fly3', 3, '한 사람을 공중에서 세 번 띄우기'), S('nograb', 0, '알 하나도 안 뺏기기')],
    waves: [
      [0, 'shield', 2, -140, 40],
      [0.5, 'man', 3, -40, 50],
      [4, 'shield', 2, 170, 30],
      [5, 'man', 3, 30, 50],
      [9, 'shield', 3, 90, 80],
      [10, 'man', 3, -100, 50],
      [14, 'shield', 2, -20, 40],
      [14.5, 'man', 4, 180, 60],
      [17.5, 'man', 3, -150, 50],
    ],
  },
  {
    key: 'quake', name: '화산 발치', news: '화산 진동 — 땅이 저절로 쿵 해요', goal: '알 지키기', T: 23, spd: 1.05, zrf: 0.85, quake: true,
    hint: '화산이 쿵 하면 모두 떠요 — 떨어질 때 받아 쳐요',
    stars: [S('ko', 14, '해 지기 전에 14명 기절'), S('multi', 5, '한 번에 다섯 기절'), S('nograb', 0, '알 하나도 안 뺏기기')],
    waves: [
      [0, 'man', 4, -140, 60],
      [0.5, 'man', 4, -30, 60],
      [4.5, 'man', 4, 150, 50],
      [6, 'shield', 2, 60, 40],
      [9.5, 'man', 5, -90, 120],
      [13, 'man', 4, 30, 60],
      [14, 'shield', 2, 200, 30],
      [17, 'man', 4, 110, 80],
    ],
  },
  {
    key: 'mammoth', name: '매머드 대장', news: '매머드 대장 — 큰 쿵으로 띄워 세 번 저글!', goal: '알 지키기', T: 24, spd: 1.05, zrf: 0.85,
    hint: '매머드는 큰 쿵으로 띄우고, 떨어질 때마다 또 쿵!',
    stars: [S('boss', 1, '해 지기 전에 매머드 대장 기절'), S('combo', 6, '쿵 콤보 여섯'), S('nograb', 0, '알 하나도 안 뺏기기')],
    waves: [
      [0, 'man', 3, -150, 40],
      [1, 'mammoth', 1, -90, 0, 0.66],
      [3, 'man', 3, 20, 50],
      [6.5, 'man', 4, 160, 50],
      [8, 'ptero', 1, -30, 0],
      [11, 'shield', 2, 80, 40],
      [12, 'man', 4, -60, 70],
      [16, 'man', 4, 120, 80],
      [19, 'man', 3, -170, 40],
    ],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Foe {
  id: number; k: K; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  st: number; tm: number; j: number; fly: number; peak: number; ko: boolean; hp: number; egg: boolean; spd: number; shock: number;
  /** 익룡: 원 궤도 각·반지름·도는 쪽 */
  a: number; r: number; dir: number;
  // 연출 (시뮬레이션 결과와 무관)
  seed: number; born: number; landT: number; hitT: number; spin: number; face: number; bowl: boolean;
}
interface Rock { id: number; x: number; y: number; vx: number; vy: number; st: number; warn: number; spin: number; shock: number; born: number }
interface Shock { id: number; t0: number; ch: number; r: number; front: number; auto: boolean; launches: number; rebounds: number; kos: number; blocked: number; froze: boolean }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string; z?: number }
interface EggFly { t: number; x: number; y: number; z: number; back: boolean }

export interface DinoState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  eggs: number; lost: number; left: number; flip: boolean; rot: number;
  down: boolean; holdT: number; rec: number; lock: boolean; freeze: number;
  foes: Foe[]; rocks: Rock[]; shocks: Shock[]; nid: number; wi: number; quakeT: number;
  combo: number; bestCombo: number; grabs: number; maxFly: number; bestMulti: number; pteroKO: number; bowl: number; bossKO: number; kos: number;
  firstPress: number; firstBig: number; stomps: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  events: Ev[]; eggFly: EggFly[]; log: { stage: number; ok: boolean; got: number; stars: boolean[]; kos: number; t: number }[]; skos: number; st0: number;
  // 연출용
  lastCh: number; stompT: number; mood: number; moodT: number; birdT: number;
}

const ev = (s: DinoState, kind: string, x: number, y: number, n?: number, text?: string, z?: number) => s.events.push({ t: s.t, kind, x, y, n, text, z });
function see(s: DinoState, key: string, text: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (x: number, y: number) => Math.hypot(x, y);
const needBig = (k: K) => k === 'shield' || k === 'mammoth';
/** 떨어지는 중이고 충분히 낮으면 다시 쿵이 닿는다 */
const inWin = (s: DinoState, f: { z: number; vz: number; peak: number; fly: number }) => f.vz < 0 && f.z <= f.peak * STAGES[s.stage].zrf && f.fly < MAXFLY;
const chOf = (holdT: number) => clamp(holdT / CH_T, 0, 1);

// ───────────────────────────── 시뮬레이션 ─────────────────────────────

function mkFoe(s: DinoState, k: K, x: number, y: number): Foe {
  return {
    id: ++s.nid, k, x, y, z: k === 'ptero' ? PZ : 0, vx: 0, vy: 0, vz: 0, st: k === 'ptero' ? FLY : WALK, tm: 0, j: 0, fly: 0, peak: 0, ko: false,
    hp: k === 'mammoth' ? 3 : 1, egg: false, spd: SPD[k] * STAGES[s.stage].spd, shock: 0, a: Math.atan2(y, x), r: dist(x, y), dir: s.rng() < 0.5 ? 1 : -1,
    seed: Math.floor(s.rng() * 1e6), born: s.t, landT: -99, hitT: -99, spin: 0, face: x > 0 ? -1 : 1, bowl: false,
  };
}

function spawnWave(s: DinoState, w: WaveDef) {
  const [, k, n, a0, sp, d0] = w;
  const base = ((s.flip ? 180 - a0 : a0) + (s.stage ? s.rot : 0)) * (Math.PI / 180);
  const D = d0 ?? 0.64;
  if (k === 'rock') {
    const x = Math.cos(base) * 0.66, y = clamp(Math.sin(base) * 0.66, -0.62, 0.58);
    s.rocks.push({ id: ++s.nid, x, y, vx: 0, vy: 0, st: 0, warn: ROCK_WARN, spin: 0, shock: 0, born: s.t });
    if (see(s, 'rock', '')) s.spot = { id: -s.nid, t: s.t, label: '굴러오는 바위' };
    return;
  }
  for (let i = 0; i < n; i++) {
    let a = base, d = D;
    if (s.stage === 0 && s.wi === 0 && w[0] === 0) a = ((-170 + i * 72 + (i === 2 ? 25 : 0)) * Math.PI) / 180;
    else if (sp === 0) d = D + i * 0.075;
    else a = base + ((n === 1 ? 0 : i / (n - 1) - 0.5) * sp * Math.PI) / 180 + (s.rng() - 0.5) * 0.08;
    const x = clamp(Math.cos(a) * d, -0.66, 0.66), y = clamp(Math.sin(a) * d, -0.62, 0.58);
    const f = mkFoe(s, k as K, x, y);
    if (k === 'mammoth') f.hp = 3;
    s.foes.push(f);
    if (see(s, k, k === 'kid' ? '' : '')) s.spot = { id: f.id, t: s.t, label: k === 'man' ? '어른 — 떨어질 때 한 번 더 쿵!' : NAME[k as K] };
  }
}

function addPts(s: DinoState, n: number) {
  s.pts += Math.round(n * (1 + 0.1 * Math.min(10, s.combo)));
}

/** 공중으로 띄우기 (땅 위 → 하늘) */
function launch(s: DinoState, f: Foe, ch: number, out: number, sh: Shock | null) {
  const d = dist(f.x, f.y) || 1e-6, ux = f.x / d, uy = f.y / d;
  f.st = AIR;
  f.vz = lv(ch) / WGT[f.k];
  f.z = Math.max(f.z, 0.001);
  f.peak = f.z + (f.vz * f.vz) / (2 * G);
  f.vx = ux * out;
  f.vy = uy * out;
  f.j = 0;
  f.fly = 1;
  f.ko = f.k === 'kid';
  f.hitT = s.t;
  if (f.egg) {
    f.egg = false;
    s.eggFly.push({ t: s.t, x: f.x, y: f.y, z: 0.05, back: true });
    s.eggs++;
    ev(s, 'back', f.x, f.y);
  }
  if (sh) {
    sh.launches++;
    if (f.ko) sh.kos++;
  }
  ev(s, 'launch', f.x, f.y, f.ko ? 1 : 0);
}

/** 떨어지는 중에 다시 쿵 → 더 높이 */
function rebound(s: DinoState, f: Foe, ch: number, sh: Shock) {
  const d = dist(f.x, f.y) || 1e-6;
  f.j++;
  f.fly++;
  f.vz = lv(ch) / WGT[f.k] + RB * f.j;
  f.peak = f.z + (f.vz * f.vz) / (2 * G);
  f.vx = (f.x / d) * KBR;
  f.vy = (f.y / d) * KBR;
  f.hitT = s.t;
  const was = f.ko;
  if (f.k === 'mammoth') {
    f.hp--;
    if (f.hp <= 0) f.ko = true;
  } else f.ko = true;
  sh.rebounds++;
  if (f.ko && !was) sh.kos++;
  s.maxFly = Math.max(s.maxFly, f.fly);
  ev(s, 'rebound', f.x, f.y, f.fly, f.ko && !was ? 'ko' : '', f.z);
}

function stompNow(s: DinoState, ch: number, auto: boolean) {
  const sh: Shock = { id: ++s.nid, t0: s.t, ch, r: auto ? 9 : rOf(ch), front: auto ? 9 : 0.02, auto, launches: 0, rebounds: 0, kos: 0, blocked: 0, froze: false };
  s.shocks.push(sh);
  if (!auto) {
    s.stomps++;
    s.rec = REC;
    s.lastCh = ch;
    s.stompT = s.t;
    if (ch >= BIG) s.freeze = Math.max(s.freeze, 2);
  }
  ev(s, auto ? 'quake' : 'stomp', 0, 0, Math.round(ch * 100));
  shockStep(s, sh);
}

function shockHit(s: DinoState, sh: Shock, f: Foe) {
  if (f.k === 'ptero') return;
  const ground = f.st === WALK || f.st === DAZE || f.st === GRAB || f.st === FLEE;
  if (ground) {
    if (sh.auto) {
      launch(s, f, QUAKE_CH, KBR, sh);
      return;
    }
    if (needBig(f.k) && sh.ch < BIG) {
      sh.blocked++;
      const d = dist(f.x, f.y) || 1e-6;
      f.x += (f.x / d) * 0.03;
      f.y += (f.y / d) * 0.03;
      f.hitT = s.t;
      if (f.st === GRAB) f.st = WALK;
      ev(s, 'block', f.x, f.y);
      return;
    }
    launch(s, f, sh.ch, (KB0 + KB1 * sh.ch) / (WGT[f.k] * WGT[f.k]), sh);
  } else if (f.st === AIR && !sh.auto && inWin(s, f)) rebound(s, f, sh.ch, sh);
}

/** 충격파 한 틱: 앞머리가 지나간 자리의 적·바위에 효과 */
function shockStep(s: DinoState, sh: Shock) {
  sh.front = Math.min(sh.r, sh.front + WAVE_V);
  for (const f of s.foes) {
    if (f.shock >= sh.id || f.st === GONE || f.st === KO) continue;
    const d = dist(f.x, f.y);
    if (d - BODY[f.k] * 0.5 > sh.front) continue;
    f.shock = sh.id;
    shockHit(s, sh, f);
  }
  if (!sh.auto)
    for (const r of s.rocks) {
      if (r.shock >= sh.id || r.st !== 0) continue;
      const d = dist(r.x, r.y);
      if (d - ROCK_R > sh.front) continue;
      r.shock = sh.id;
      if (r.warn > 0) continue;
      r.st = 1;
      r.vx = (r.x / d) * ROCK_OUT;
      r.vy = (r.y / d) * ROCK_OUT;
      sh.launches++;
      ev(s, 'rockback', r.x, r.y);
    }
  if (!sh.froze && sh.kos >= 3) (sh.froze = true), (s.freeze = Math.max(s.freeze, 4));
}

function shockEnd(s: DinoState, sh: Shock) {
  if (sh.auto) return;
  const hits = sh.launches + sh.rebounds;
  if (sh.rebounds > 0) {
    s.combo++;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    if (s.combo >= 2) ev(s, 'combo', 0, 0, s.combo);
  } else if (hits === 0 && sh.blocked === 0) {
    if (s.combo >= 2) ev(s, 'break', 0, 0, s.combo);
    s.combo = 0;
    ev(s, 'whiff', 0, 0);
  }
  s.bestMulti = Math.max(s.bestMulti, sh.kos);
  if (sh.kos >= 2) ev(s, 'multi', 0, 0, sh.kos, 'ko');
  else if (sh.launches >= 3) ev(s, 'multi', 0, 0, sh.launches, 'up');
  if ((sh.kos >= 3 || sh.launches >= 3) && s.firstBig < 0) s.firstBig = s.t;
}

function koFoe(s: DinoState, f: Foe) {
  f.st = KO;
  f.tm = 90;
  const d = dist(f.x, f.y) || 1e-6;
  const sp = f.k === 'mammoth' ? ROLL_V * 0.6 : ROLL_V;
  f.vx = (f.x / d) * sp;
  f.vy = (f.y / d) * sp;
  f.vz = 0;
  f.z = 0;
  s.kos++;
  s.skos++;
  const mult = f.k === 'kid' || f.k === 'ptero' ? 1 : 1 + 0.5 * Math.max(0, f.fly - 2);
  addPts(s, PTS[f.k] * mult);
  if (f.k === 'mammoth') s.bossKO++;
  if (f.k === 'ptero') s.pteroKO++;
  ev(s, 'ko', f.x, f.y, f.fly, f.k);
}

function eggLost(s: DinoState, x: number, y: number, why: string) {
  s.lost++;
  ev(s, 'lost', x, y, 0, why);
  if (s.lost >= EGGS && s.phase === 'play') endStage(s, false, why);
}

function foeStep(s: DinoState, f: Foe) {
  const d = dist(f.x, f.y) || 1e-6;
  switch (f.st) {
    case WALK: {
      const reach = f.k === 'mammoth' ? 0.15 : GRAB_D;
      if (d > reach) {
        const v = Math.min(f.spd, d - reach + 1e-4);
        f.x -= (f.x / d) * v;
        f.y -= (f.y / d) * v;
        f.face = f.x > 0 ? -1 : 1;
      } else if (s.eggs > 0) {
        f.st = GRAB;
        f.tm = f.k === 'mammoth' ? 50 : GRAB_T;
        ev(s, 'reach', f.x, f.y);
      }
      break;
    }
    case GRAB:
      if (--f.tm <= 0) {
        if (s.eggs <= 0) {
          f.st = WALK;
          break;
        }
        s.grabs++;
        if (f.k === 'mammoth') {
          const n = s.eggs;
          s.eggs = 0;
          for (let i = 0; i < n; i++) eggLost(s, f.x, f.y, '매머드가 알을 밟았어요');
          f.st = WALK;
          f.x *= 1.6;
          f.y *= 1.6;
          break;
        }
        s.eggs--;
        f.egg = true;
        f.st = FLEE;
        ev(s, 'grab', f.x, f.y);
      }
      break;
    case FLEE:
      f.x += (f.x / d) * FLEE_V;
      f.y += (f.y / d) * FLEE_V;
      f.face = f.x > 0 ? 1 : -1;
      if (d > EXIT) {
        f.st = GONE;
        if (f.egg) eggLost(s, f.x, f.y, '알을 뺏겼어요');
      }
      break;
    case AIR:
      f.x += f.vx;
      f.y += f.vy;
      f.z += f.vz;
      f.vz -= G;
      f.spin += f.ko ? 0.25 : 0.08;
      if (f.z <= 0 && f.vz < 0) {
        f.z = 0;
        f.landT = s.t;
        if (f.ko) koFoe(s, f);
        else {
          f.st = DAZE;
          f.tm = DAZE_T;
          f.j = 0;
          f.fly = 0;
          f.vx = f.vy = 0;
          ev(s, 'land', f.x, f.y);
        }
      }
      break;
    case DAZE:
      if (--f.tm <= 0) f.st = WALK;
      break;
    case KO:
      f.x += f.vx;
      f.y += f.vy;
      f.spin += 0.3;
      if (--f.tm <= 0 || Math.abs(f.x) > 0.75 || f.y > 0.72 || f.y < -0.8) f.st = GONE;
      break;
    case FLY: {
      f.r -= 0.00085 * STAGES[s.stage].spd;
      f.a += 0.0065 * f.dir;
      f.x = Math.cos(f.a) * f.r;
      f.y = Math.sin(f.a) * f.r;
      f.z = PZ + Math.sin(s.t * 0.08 + f.seed) * 0.01;
      f.face = Math.cos(f.a + (f.dir * Math.PI) / 2) >= 0 ? 1 : -1;
      if (f.r < 0.05) (f.st = SWOOP), (f.tm = 0);
      break;
    }
    case SWOOP:
      f.z = Math.max(0.06, f.z - 0.005);
      if (f.z <= 0.06 && ++f.tm >= 24) {
        if (s.eggs > 0) {
          s.eggs--;
          s.grabs++;
          f.egg = true;
          ev(s, 'grab', f.x, f.y);
        }
        f.st = FLEE;
        f.a = Math.atan2(f.y, f.x) || -1.2;
      }
      break;
    case FALL:
      f.z += f.vz;
      f.vz -= G * 1.5;
      f.spin += 0.3;
      if (f.z <= 0) (f.z = 0), koFoe(s, f);
      break;
  }
  if (f.k === 'ptero' && f.st === FLEE) {
    f.r = Math.max(f.r, 0.06) + 0.0032;
    f.x = Math.cos(f.a) * f.r;
    f.y = Math.sin(f.a) * f.r;
    f.z = Math.min(PZ, f.z + 0.004);
    if (f.r > EXIT + 0.05) {
      f.st = GONE;
      if (f.egg) eggLost(s, f.x, f.y, '익룡이 알을 채 갔어요');
    }
  }
}

function pteroHits(s: DinoState) {
  for (const p of s.foes) {
    if (p.k !== 'ptero' || (p.st !== FLY && p.st !== SWOOP && p.st !== FLEE)) continue;
    for (const f of s.foes) {
      if (f.st !== AIR || f.k === 'ptero') continue;
      if (Math.hypot(f.x - p.x, f.y - p.y) < PT_HR && Math.abs(f.z - p.z) < PT_VZ) {
        p.st = FALL;
        p.vz = 0.004;
        p.hitT = s.t;
        if (!f.ko) (f.ko = true), (f.vz = Math.max(f.vz, 0.004));
        f.hitT = s.t;
        if (p.egg) {
          p.egg = false;
          s.eggs++;
          s.eggFly.push({ t: s.t, x: p.x, y: p.y, z: p.z, back: true });
          ev(s, 'back', p.x, p.y);
        }
        ev(s, 'pterohit', p.x, p.y, 0, '', p.z);
        if (s.firstBig < 0) s.firstBig = s.t;
        break;
      }
    }
  }
}

function rockStep(s: DinoState, r: Rock) {
  if (r.warn > 0) {
    r.warn--;
    return;
  }
  const d = dist(r.x, r.y) || 1e-6;
  if (r.st === 0) {
    const v = ROCK_V * STAGES[s.stage].spd;
    r.x -= (r.x / d) * v;
    r.y -= (r.y / d) * v;
    r.spin -= v / ROCK_R;
    if (d < 0.11) {
      r.st = 2;
      ev(s, 'crash', r.x, r.y);
      if (s.eggs > 0) {
        s.eggs--;
        eggLost(s, r.x, r.y, '바위에 알이 깨졌어요');
      }
    }
  } else if (r.st === 1) {
    r.x += r.vx;
    r.y += r.vy;
    r.spin += ROCK_OUT / ROCK_R;
    for (const f of s.foes) {
      if (f.k === 'ptero' || f.k === 'mammoth' || f.st === KO || f.st === GONE || (f.st === AIR && f.z > 0.1) || f.bowl) continue;
      if (Math.hypot(f.x - r.x, f.y - r.y) < ROCK_R + BODY[f.k]) {
        if (f.st !== AIR) launch(s, f, 0.15, ROCK_OUT * 0.5, null);
        f.ko = true;
        f.bowl = true;
        f.vx = r.vx * 0.5 + (f.y - r.y) * 0.02;
        f.vy = r.vy * 0.5 - (f.x - r.x) * 0.02;
        s.bowl++;
        addPts(s, 10);
        ev(s, 'bowl', f.x, f.y, s.bowl);
        if (s.firstBig < 0 && s.bowl >= 2) s.firstBig = s.t;
      }
    }
    if (d > EXIT + 0.06) r.st = 2;
  }
}

/** 둥근 둥지 둘레에서 서로 겹치지 않게 (땅 위끼리만) */
function separate(s: DinoState) {
  const g = s.foes.filter((f) => f.k !== 'ptero' && (f.st === WALK || f.st === GRAB || f.st === DAZE));
  for (let i = 0; i < g.length; i++)
    for (let j = i + 1; j < g.length; j++) {
      const a = g[i], b = g[j], dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy), m = (BODY[a.k] + BODY[b.k]) * 0.8;
      if (dd < m && dd > 1e-6) {
        const p = (m - dd) * 0.25;
        a.x -= (dx / dd) * p;
        a.y -= (dy / dd) * p;
        b.x += (dx / dd) * p;
        b.y += (dy / dd) * p;
      }
    }
}

function world(s: DinoState) {
  const d = STAGES[s.stage], el = d.T * 60 - s.left;
  while (s.wi < d.waves.length && d.waves[s.wi][0] * 60 <= el) spawnWave(s, d.waves[s.wi]), s.wi++;
  for (const sh of s.shocks) if (s.t > sh.t0) shockStep(s, sh);
  for (const sh of s.shocks) if (sh.front >= sh.r) shockEnd(s, sh);
  s.shocks = s.shocks.filter((sh) => sh.front < sh.r);
  for (const f of s.foes) foeStep(s, f);
  separate(s);
  pteroHits(s);
  for (const r of s.rocks) rockStep(s, r);
  s.foes = s.foes.filter((f) => f.st !== GONE);
  s.rocks = s.rocks.filter((r) => r.st !== 2);
  if (d.quake && s.phase === 'play') {
    if (--s.quakeT === QUAKE_W) ev(s, 'rumble', 0, 0);
    if (s.quakeT <= 0) (s.quakeT = QUAKE_P), stompNow(s, QUAKE_CH, true);
  }
  if (s.phase === 'play' && --s.left <= 0) {
    const g = d.stars[0];
    if (starMet(s, g)) endStage(s, true, '');
    else endStage(s, false, g.k === 'boss' ? '매머드가 버텼어요' : `${g.n - s.skos}명 모자라요`);
  }
}

function newStage(s: DinoState) {
  s.flip = s.stage > 0 && s.rng() < 0.5;
  s.rot = s.stage > 0 ? (s.rng() - 0.5) * 40 : 0;
  s.eggs = EGGS;
  s.lost = 0;
  s.left = STAGES[s.stage].T * 60;
  s.down = false;
  s.holdT = 0;
  s.rec = 0;
  s.freeze = 0;
  s.foes = [];
  s.rocks = [];
  s.shocks = [];
  s.wi = 0;
  s.quakeT = QUAKE_P;
  s.combo = 0;
  s.bestCombo = 0;
  s.grabs = 0;
  s.maxFly = 0;
  s.bestMulti = 0;
  s.pteroKO = 0;
  s.bowl = 0;
  s.bossKO = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.eggFly = [];
  s.skos = 0;
  s.st0 = s.t;
  const key = STAGES[s.stage].key;
  if (key === 'quake') see(s, 'quake', '');
  s.seen.add('st' + s.stage);
}

function starMet(s: DinoState, st: Star) {
  switch (st.k) {
    case 'ko': return s.skos >= st.n;
    case 'nograb': return s.grabs === 0 && s.lost === 0;
    case 'fly3': return s.maxFly >= st.n;
    case 'multi': return s.bestMulti >= st.n;
    case 'ptero': return s.pteroKO >= st.n;
    case 'bowl': return s.bowl >= st.n;
    case 'combo': return s.bestCombo >= st.n;
    case 'boss': return s.bossKO >= st.n;
  }
}
function starNow(s: DinoState, st: Star): number {
  switch (st.k) {
    case 'fly3': return s.maxFly;
    case 'multi': return s.bestMulti;
    case 'ptero': return s.pteroKO;
    case 'bowl': return s.bowl;
    case 'combo': return s.bestCombo;
    case 'boss': return s.bossKO;
    case 'ko': return s.skos;
    default: return -1;
  }
}

function endStage(s: DinoState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 2;
    s.moodT = 999;
    ev(s, 'clear', 0, 0);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'fail', 0, 0, 0, why);
  }
  s.log.push({ stage: s.stage, ok, got: ok ? s.got : 0, stars: ok ? [...s.starOk] : [], kos: s.skos, t: s.t - s.st0 });
}

function cosmetic(s: DinoState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.eggFly = s.eggFly.filter((e) => s.t - e.t < 40);
  if (s.spot && s.t - s.spot.t > 120) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

export const stompdino: GameDef<DinoState> = {
  id: 'stompdino',
  name: '쿵쿵 아기 공룡',
  genes: ['stomp', 'hold', 'combo'],
  twist: '쿵에 띄워진 사람은 다치지 않고, 떨어지는 중에 다시 쿵 해야 더 높이 튀어 기절한다 — 크게 쿵 할수록 멀리 날아가 다음 쿵을 더 크게 모아야 해서, 언제·얼마나 모을지가 공중 저글의 박자가 된다',
  rules: [
    '꾹 누르면 아기 공룡이 발을 들어요(오래 누를수록 넓게). 떼면 쿵! 둘레의 동굴 사람이 공중으로 붕 떠요.',
    '떨어지는 중(그림자가 노랄 때)에 한 번 더 쿵 하면 높이 튀어 기절! 그냥 떨어지면 다시 일어나요.',
    '해가 질 때까지 둥지의 알을 지켜요. 알 셋을 다 뺏기면 하트 -1(그 판 다시).',
  ],
  controls: 'touch',
  hint: '꾹 누르면 발을 들고, 떼면 쿵! / 스페이스 꾹',
  aspect: A,
  art: {
    concept: '노을 지는 선사 시대 계곡의 아기 공룡 — 흙 디오라마 그림책',
    mood: '주황·분홍 노을 아래 연기 나는 화산과 거대한 고사리가 겹겹이 서 있고, 땅 앞쪽은 지층 단면처럼 잘려 화석이 박혀 있다. 쿵 하면 땅이 물결처럼 출렁이고 흙먼지가 둥글게 퍼지며, 털옷 입은 동굴 사람들이 팔다리를 버둥대며 공중으로 붕 뜬다.',
    palette: { bg: '#2a1838', ink: '#fff2dc', muted: '#c9a6a0', accent: '#ffc24a', hot: '#ff5a3c', soft: '#4a2a48' },
  },
  reveals: (s) => [...s.seen].filter((k) => !k.startsWith('st')).length,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, won: false, dead: false, again: false, tries: 0,
      eggs: EGGS, lost: 0, left: 0, flip: false, rot: 0, down: false, holdT: 0, rec: 0, lock: false, freeze: 0,
      foes: [], rocks: [], shocks: [], nid: 0, wi: 0, quakeT: QUAKE_P,
      combo: 0, bestCombo: 0, grabs: 0, maxFly: 0, bestMulti: 0, pteroKO: 0, bowl: 0, bossKO: 0, kos: 0,
      firstPress: -1, firstBig: -1, stomps: 0,
      seen: new Set<string>(), newsQ: [], news: null, spot: null, events: [], eggFly: [], log: [], skos: 0, st0: 0,
      lastCh: 0, stompT: -999, mood: 0, moodT: 0, birdT: -999,
    } as DinoState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    if (s.phase === 'play') {
      if (p) {
        if (!s.down && !s.lock && s.rec <= 0) {
          s.down = true;
          s.holdT = 0;
          if (s.firstPress < 0) s.firstPress = s.t;
        }
        if (s.down && ++s.holdT >= CH_T + 150) {
          stompNow(s, 1, false);
          s.down = false;
          s.lock = true;
        }
      } else {
        if (s.down) stompNow(s, chOf(s.holdT), false);
        s.down = false;
        s.lock = false;
      }
    } else {
      s.down = false;
      s.lock = !!p;
    }
    if (s.rec > 0) s.rec--;
    if (s.phase === 'result') {
      s.pt++;
      for (const f of s.foes) if (f.st === AIR || f.st === KO || f.st === FALL || f.st === FLEE) foeStep(s, f);
      s.foes = s.foes.filter((f) => f.st !== GONE);
      cosmetic(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.freeze > 0) {
      s.freeze--;
      cosmetic(s);
      return;
    }
    world(s);
    if ((s.phase as string) === 'result' && s.ok) for (const f of s.foes) if (f.st === WALK || f.st === GRAB || f.st === DAZE) f.st = FLEE;
    cosmetic(s);
    s.pt++;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const HOLD: Input = { tap: false, dir: 0, pointer: { x: 0.5, y: 0.55 } };

interface Pred { x: number; y: number; z: number; vz: number; peak: number; air: boolean; gone: boolean; st: number; grabAt: number }
/** 적 하나가 n틱 뒤 어디에 있을지 (다른 적·충격파는 무시한 근사) */
function predict(f: Foe, n: number): Pred {
  let x = f.x, y = f.y, st = f.st, tm = f.tm, left = n;
  const out = (gone = false): Pred => ({ x, y, z: 0, vz: 0, peak: 0, air: false, gone, st, grabAt: 1e9 });
  if (st === KO || st === GONE || st === FALL || f.k === 'ptero') return out(true);
  if (st === AIR) {
    // 이산 적분: z(k) = z0 + k·vz0 − G·k(k−1)/2
    const a = G / 2, b = -(f.vz + G / 2), c = -f.z;
    const land = Math.ceil((-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a));
    if (n < land) {
      const z = f.z + n * f.vz - (G * n * (n - 1)) / 2;
      return { x: f.x + f.vx * n, y: f.y + f.vy * n, z, vz: f.vz - G * n, peak: f.peak, air: true, gone: false, st: AIR, grabAt: 1e9 };
    }
    if (f.ko) return out(true);
    x = f.x + f.vx * land;
    y = f.y + f.vy * land;
    left -= land;
    st = DAZE;
    tm = DAZE_T;
  }
  if (st === DAZE) {
    if (left <= tm) return out();
    left -= tm;
    st = WALK;
  }
  if (st === FLEE) {
    const d = dist(x, y) || 1e-6, m = FLEE_V * left;
    return { ...out(), x: x + (x / d) * m, y: y + (y / d) * m };
  }
  if (st === GRAB) return { ...out(), grabAt: n - left + tm };
  // WALK
  const d = dist(x, y) || 1e-6, reach = f.k === 'mammoth' ? 0.15 : GRAB_D, need = (d - reach) / f.spd;
  if (left <= need) {
    const m = f.spd * left;
    return { ...out(), x: x - (x / d) * m, y: y - (y / d) * m };
  }
  const p = out();
  p.x = (x / d) * reach;
  p.y = (y / d) * reach;
  p.st = GRAB;
  p.grabAt = n - left + need + (f.k === 'mammoth' ? 50 : GRAB_T);
  return p;
}

interface Hit { d: number; air: boolean; win: boolean; f: Foe; p: Pred }
/** tr틱 뒤에 쿵 하면 충격파가 닿을 때 각 적의 모습 */
function scan(s: DinoState, tr: number): { hits: Hit[]; risk: number; rocks: { d: number; v: number }[] } {
  const hits: Hit[] = [];
  let risk = 0;
  for (const f of s.foes) {
    if (f.k === 'ptero') continue;
    const p0 = predict(f, tr);
    if (p0.gone) continue;
    if (p0.grabAt <= tr) risk += f.k === 'mammoth' ? 200 : 40;
    const d0 = dist(p0.x, p0.y) - BODY[f.k] * 0.5;
    if (d0 > 0.5) continue;
    const th = tr + Math.max(0, Math.ceil((d0 - 0.02 - WAVE_V) / WAVE_V));
    const p = th === tr ? p0 : predict(f, th);
    if (p.gone) continue;
    hits.push({ d: dist(p.x, p.y) - BODY[f.k] * 0.5, air: p.air, win: p.air && p.vz < -G && p.z <= p.peak * STAGES[s.stage].zrf - 0.006, f, p });
  }
  const rocks: { d: number; v: number }[] = [];
  for (const r of s.rocks) {
    if (r.st !== 0) continue;
    const roll = Math.max(0, tr - r.warn), d0 = dist(r.x, r.y), d = d0 - ROCK_V * STAGES[s.stage].spd * roll;
    if (d < 0.11) {
      risk += 60;
      continue;
    }
    if (r.warn > tr) continue;
    // 되받아친 바위 길에 선 사람 수
    const ux = r.x / d0, uy = r.y / d0;
    let line = 0;
    for (const f of s.foes) {
      if (f.k === 'ptero' || f.k === 'mammoth' || f.st === AIR || f.st === KO) continue;
      const along = f.x * ux + f.y * uy, side = Math.abs(f.x * uy - f.y * ux);
      if (along > d - 0.02 && side < ROCK_R + BODY[f.k] + 0.01) line++;
    }
    rocks.push({ d: d - ROCK_R, v: 22 + line * 26 + (d < 0.25 ? 30 : 0) });
  }
  return { hits, risk, rocks };
}

let wantFly3 = false, wantPtero = false;
function valueOf(s: DinoState, sc: ReturnType<typeof scan>, ch: number): number {
  const r = rOf(ch);
  let v = -sc.risk;
  const up: Pred[] = [];
  for (const h of sc.hits) {
    if (h.d > r) continue;
    const f = h.f;
    if (h.air) {
      if (!h.win || f.fly >= MAXFLY) continue;
      if (f.k === 'mammoth') v += f.hp <= 1 ? 150 : 60;
      else if (f.ko) v += f.k === 'kid' ? 1 : 4 + (wantFly3 && f.fly + 1 === 3 ? 40 : 0);
      else v += 34;
    } else {
      if (needBig(f.k) && ch < BIG) {
        v -= 1;
        continue;
      }
      if (f.k === 'kid') {
        v += 26;
        continue;
      }
      let u = Math.max(0, 0.28 - h.d) * 60;
      // 저글 거리: 떨어질 자리가 큰 쿵 안이면 다음 쿵으로 기절시킬 수 있다
      const vz = lv(ch) / WGT[f.k], T = (2 * vz) / G, land = h.d + ((KB0 + KB1 * ch) / (WGT[f.k] * WGT[f.k])) * T;
      const jug = land < rOf(1) - 0.03;
      if (jug) u += 10 + (rOf(1) - land) * 30;
      if (h.p.st === GRAB) u += 45;
      if (h.p.st === FLEE && f.egg) u += 80;
      if (f.k === 'mammoth') u += jug ? 60 : 0;
      v += u;
      up.push(h.p);
    }
  }
  for (const rk of sc.rocks) if (rk.d <= r) v += rk.v;
  // 익룡: 띄운 사람이 솟아오를 때 익룡 자리에 있으면 부딪힌다
  if (up.length)
    for (const p of s.foes) {
      if (p.k !== 'ptero' || (p.st !== FLY && p.st !== SWOOP)) continue;
      const vz = lv(ch);
      if ((vz * vz) / (2 * G) < PZ - PT_VZ * 0.6) continue;
      const tUp = Math.max(4, (vz - Math.sqrt(Math.max(0, vz * vz - 2 * G * PZ))) / G);
      const pa = p.st === FLY ? p.a + 0.0065 * p.dir * tUp : p.a, prr = p.st === FLY ? Math.max(0.05, p.r - 0.00085 * tUp) : p.r;
      const px = Math.cos(pa) * prr, py = Math.sin(pa) * prr;
      for (const q of up) {
        const dq = dist(q.x, q.y) || 1e-6, out = (KB0 + KB1 * ch) * tUp;
        if (Math.hypot(q.x + (q.x / dq) * out - px, q.y + (q.y / dq) * out - py) < PT_HR * 0.85) {
          v += wantPtero ? 90 : 50;
          break;
        }
      }
    }
  return v;
}

/**
 * 잘하는 봇: 앞으로 60틱 동안 '언제 떼고 얼마나 모을지' 후보를 모두 그려 보고 고른다.
 * 떨어지는 사람이 노란 창에 들어올 때를 맞춰 쿵 하고, 땅에서 다가오는 사람은 한데 모였을 때 띄운다.
 */
export const stompdinoSmart: Bot<DinoState> = {
  name: '떨어질 때 맞춰 쿵',
  act(s) {
    if (s.phase !== 'play' || s.lock) return NO;
    const d = STAGES[s.stage];
    wantFly3 = d.stars.some((q) => q.k === 'fly3') && s.maxFly < 3;
    wantPtero = d.stars.some((q) => q.k === 'ptero') && s.pteroKO < 1;
    if (s.down) {
      let best = -1e9, bt = 0;
      for (let tr = 0; tr <= 48; tr += 3) {
        const ch = chOf(s.holdT + tr), v = valueOf(s, scan(s, tr), ch) - tr * 0.3;
        if (v > best) (best = v), (bt = tr);
        if (ch >= 1 && tr > 0) break;
      }
      return bt === 0 ? NO : HOLD;
    }
    const st0 = s.rec;
    let best = 0, bs = 99;
    for (let tr = 3; tr <= 72; tr += 3) {
      const sc = scan(s, tr);
      for (const H of [3, 12, 24, 36, 48]) {
        const start = tr - H;
        if (start < st0) break;
        const v = valueOf(s, sc, chOf(H)) - tr * 0.3 - H * 0.05;
        if (v > best) (best = v), (bs = start);
      }
    }
    return best > 3 && bs <= 2 ? HOLD : NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number }>();
/** 못하는 봇: 아무 때나 아무만큼 꾹 눌렀다 뗀다 */
export const stompdinoRandom: Bot<DinoState> = {
  name: '아무 때나 쿵',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 50), hold: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? HOLD : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.hold = 1 + Math.floor(rng() * 50);
    return HOLD;
  },
};

/** 버릇 봇: 누가 원 안(가장 작은 쿵)에 들어오면 늘 바로 작은 쿵 */
export const stompdinoHabit: Bot<DinoState> = {
  name: '들어오면 바로 작은 쿵',
  act(s) {
    if (s.phase !== 'play' || s.lock) return NO;
    if (s.down) return NO;
    const r = rOf(0);
    const near = s.foes.some((f) => f.k !== 'ptero' && f.st !== AIR && f.st !== KO && dist(f.x, f.y) - BODY[f.k] * 0.5 < r) || s.rocks.some((q) => q.st === 0 && q.warn <= 0 && dist(q.x, q.y) - ROCK_R < r);
    return near && s.rec <= 0 ? HOLD : NO;
  },
};

/** 독립 버릇 봇: 누가 보이면 늘 끝까지 모아 가장 큰 쿵 */
export const stompdinoHabit2: Bot<DinoState> = {
  name: '늘 끝까지 모아 큰 쿵',
  act(s) {
    if (s.phase !== 'play' || s.lock) return NO;
    if (s.down) return s.holdT >= CH_T ? NO : HOLD;
    const any = s.foes.some((f) => f.k !== 'ptero' && f.st !== KO && dist(f.x, f.y) < rOf(1) + 0.1) || s.rocks.some((q) => q.st === 0);
    return any && s.rec <= 0 ? HOLD : NO;
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
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
function starPath(ctx: C2, x: number, y: number, r: number, inner = 0.45) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * inner : r;
    if (k) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
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
function eggPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.3);
  ctx.bezierCurveTo(x + r * 0.95, y - r * 1.3, x + r * 1.05, y + r * 0.85, x, y + r * 0.95);
  ctx.bezierCurveTo(x - r * 1.05, y + r * 0.85, x - r * 0.95, y - r * 1.3, x, y - r * 1.3);
  ctx.closePath();
}
/** 윤곽선 굵게 + 채우기 */
function fs(ctx: C2, fill: string | CanvasGradient, lw: number, stroke = OUT) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}
const OUT = '#2b1322';

// ── 노을 계곡 배경 (층마다 캐시) ──
interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; ground: HTMLCanvasElement; strata: HTMLCanvasElement }
const BG = new Map<string, Bg>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function fern(g: C2, x: number, y: number, len: number, ang: number, curl: number, col: string, lit: string | null, n = 14) {
  // 고사리 잎줄기: 휘어진 줄기 + 양쪽 잎
  const pts: number[][] = [];
  let a = ang, px = x, py = y;
  for (let i = 0; i <= n; i++) {
    pts.push([px, py, a]);
    px += Math.cos(a) * (len / n);
    py += Math.sin(a) * (len / n);
    a += curl / n;
  }
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, len * 0.018);
  g.lineCap = 'round';
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.stroke();
  for (let i = 1; i < n; i++) {
    const [qx, qy, qa] = pts[i], ll = len * 0.2 * Math.sin((i / n) * Math.PI) + len * 0.03;
    for (const sd of [-1, 1]) {
      const la = qa + sd * 1.15;
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(qx, qy);
      g.quadraticCurveTo(qx + Math.cos(la - sd * 0.3) * ll * 0.6, qy + Math.sin(la - sd * 0.3) * ll * 0.6, qx + Math.cos(la) * ll, qy + Math.sin(la) * ll);
      g.quadraticCurveTo(qx + Math.cos(la + sd * 0.3) * ll * 0.5, qy + Math.sin(la + sd * 0.3) * ll * 0.5, qx, qy);
      g.fill();
      if (lit && sd < 0) {
        g.strokeStyle = lit;
        g.lineWidth = Math.max(0.6, len * 0.006);
        g.beginPath();
        g.moveTo(qx, qy);
        g.quadraticCurveTo(qx + Math.cos(la - sd * 0.3) * ll * 0.6, qy + Math.sin(la - sd * 0.3) * ll * 0.6, qx + Math.cos(la) * ll, qy + Math.sin(la) * ll);
        g.stroke();
      }
    }
  }
}
function getBg(w: number, h: number, sc: number): Bg {
  const key = `${w}x${h}:${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const hz = HZ * w;
  const sky = layer(w, hz + w * 0.06, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, hz + w * 0.06, [0, '#2a1846'], [0.28, '#5c2a5e'], [0.55, '#b4485c'], [0.78, '#f0804e'], [0.93, '#ffc067'], [1, '#ffd98a']);
    g.fillRect(0, 0, w, hz + w * 0.06);
    // 첫 별
    for (let k = 0; k < 26; k++) {
      g.globalAlpha = 0.25 + hsh(k * 3.1) * 0.5;
      g.fillStyle = '#ffe9f2';
      g.beginPath();
      g.arc(hsh(k) * w, hsh(k + 99) * hz * 0.3, k % 5 ? 0.7 : 1.3, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    // 길게 늘어진 노을 구름 (아래쪽이 햇빛을 받아 밝다)
    for (let k = 0; k < 9; k++) {
      const cy = hz * (0.18 + hsh(k + 4) * 0.55), cx = hsh(k + 9) * w, cw = w * (0.25 + hsh(k + 2) * 0.35), ch = w * (0.012 + hsh(k + 6) * 0.018);
      const warm = cy / hz;
      g.fillStyle = `rgba(${Math.round(120 + 120 * warm)},${Math.round(60 + 70 * warm)},${Math.round(110 - 20 * warm)},${0.35 + 0.2 * warm})`;
      for (let j = 0; j < 5; j++) {
        ell(g, cx + (j - 2) * cw * 0.22, cy + Math.sin(j * 1.7 + k) * ch * 0.4, cw * (0.2 + hsh(k * 5 + j) * 0.12), ch * (0.7 + hsh(k + j) * 0.5));
        g.fill();
      }
      g.fillStyle = `rgba(255,${Math.round(170 + 50 * warm)},${Math.round(120 + 40 * warm)},${0.25 + 0.3 * warm})`;
      ell(g, cx, cy + ch * 0.6, cw * 0.42, ch * 0.35);
      g.fill();
    }
  });
  // 먼 산맥 + 화산 (화산 꼭대기는 연기·불빛을 매 프레임 덧그린다)
  const fw = w * 1.25, fh = hz + w * 0.04;
  const far = layer(fw, fh, sc, (g) => {
    g.fillStyle = '#8a4a76';
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(0, fh);
    for (let x = 0; x <= fw; x += w / 30) g.lineTo(x, hz - w * (0.07 + 0.05 * Math.sin((x / w) * 5 + 2) + 0.025 * Math.sin((x / w) * 17)));
    g.lineTo(fw, fh);
    g.fill();
    g.globalAlpha = 1;
    // 화산 (가운데 오른쪽)
    const vx = fw * 0.66, top = hz - w * 0.27, half = w * 0.36;
    g.fillStyle = lin(g, vx - half, 0, vx + half, 0, [0, '#7a3a5e'], [0.45, '#5a2a4e'], [1, '#3a1a38']);
    g.beginPath();
    g.moveTo(vx - half, fh);
    g.quadraticCurveTo(vx - half * 0.35, top + w * 0.1, vx - w * 0.06, top);
    g.lineTo(vx + w * 0.06, top + w * 0.004);
    g.quadraticCurveTo(vx + half * 0.35, top + w * 0.1, vx + half, fh);
    g.closePath();
    g.fill();
    // 용암 줄기 (어두운 빛)
    g.strokeStyle = 'rgba(255,110,60,.55)';
    g.lineWidth = w * 0.006;
    for (const [dx, len] of [[-0.03, 0.12], [0.025, 0.08], [0.0, 0.16]]) {
      g.beginPath();
      g.moveTo(vx + dx * w, top + w * 0.01);
      g.quadraticCurveTo(vx + dx * w * 2.2, top + len * w * 0.5, vx + dx * w * 3 + w * 0.01, top + len * w);
      g.stroke();
    }
    // 화산 왼쪽 볕 받은 테두리
    g.strokeStyle = 'rgba(255,170,120,.35)';
    g.lineWidth = w * 0.006;
    g.beginPath();
    g.moveTo(vx - half * 0.9, fh - w * 0.02);
    g.quadraticCurveTo(vx - half * 0.35, top + w * 0.1, vx - w * 0.06, top);
    g.stroke();
    // 가까운 산등성이
    g.fillStyle = '#4a2448';
    g.beginPath();
    g.moveTo(0, fh);
    for (let x = 0; x <= fw; x += w / 36) g.lineTo(x, hz - w * (0.025 + 0.03 * Math.sin((x / w) * 3.3 + 0.5) + 0.012 * Math.sin((x / w) * 13)));
    g.lineTo(fw, fh);
    g.fill();
  });
  // 중간: 거대한 고사리·소철·침엽수 실루엣
  const mw = w * 1.35, mh = w * 0.42;
  const mid = layer(mw, mh, sc, (g) => {
    const base = mh;
    for (let k = 0; k < 7; k++) {
      // 침엽수
      const x = (k / 7) * mw + hsh(k + 30) * w * 0.12, hh = w * (0.16 + hsh(k + 31) * 0.12), ww = w * 0.05;
      g.fillStyle = '#3a2242';
      g.beginPath();
      g.moveTo(x, base - hh);
      for (let j = 0; j <= 6; j++) g.lineTo(x + ww * (j / 6) * (j % 2 ? 0.7 : 1), base - hh + (hh * j) / 6);
      g.lineTo(x - ww, base);
      for (let j = 6; j >= 0; j--) g.lineTo(x - ww * (j / 6) * (j % 2 ? 0.7 : 1), base - hh + (hh * j) / 6);
      g.closePath();
      g.fill();
    }
    for (let k = 0; k < 9; k++) {
      // 소철 (줄기 + 부채꼴 잎)
      const x = hsh(k + 50) * mw, hh = w * (0.08 + hsh(k + 51) * 0.1);
      g.fillStyle = '#2e1a36';
      g.fillRect(x - w * 0.008, base - hh, w * 0.016, hh);
      for (let j = 0; j < 7; j++) {
        const a = -Math.PI / 2 + (j - 3) * 0.42;
        fern(g, x, base - hh, w * (0.08 + hsh(k * 3 + j) * 0.04), a, (j - 3) * 0.25, '#2e1a36', j < 3 ? 'rgba(255,150,110,.35)' : null, 8);
      }
    }
    // 아래 덤불 띠
    g.fillStyle = '#2a1832';
    g.beginPath();
    g.moveTo(0, base);
    for (let x = 0; x <= mw; x += w / 40) g.lineTo(x, base - w * (0.02 + 0.015 * Math.abs(Math.sin(x / w * 9)) + 0.01 * hsh(x)));
    g.lineTo(mw, base);
    g.fill();
  });
  // 땅: 계곡 바닥 (먼 쪽은 노을 안개, 가까운 쪽은 따뜻한 풀빛)
  const gh = (GE - HZ) * w;
  const ground = layer(w, gh, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, gh, [0, '#9a5a5a'], [0.12, '#a87a4e'], [0.45, '#a8913f'], [1, '#7f8a3a']);
    g.fillRect(0, 0, w, gh);
    // 흙길 얼룩
    for (let k = 0; k < 18; k++) {
      const px = hsh(k + 70) * w, py = (0.08 + hsh(k + 71) * 0.92) * gh, sz = (0.03 + hsh(k + 72) * 0.05) * w * (0.5 + py / gh);
      g.fillStyle = `rgba(150,96,52,${0.18 + 0.15 * hsh(k + 73)})`;
      ell(g, px, py, sz * 1.6, sz * 0.5);
      g.fill();
    }
    // 풀 결
    for (let k = 0; k < 260; k++) {
      const px = hsh(k + 100) * w, py = hsh(k + 101) * gh, d = 0.4 + py / gh, ln = w * 0.012 * d;
      g.strokeStyle = k % 3 ? `rgba(70,90,30,${0.25 * d})` : `rgba(230,200,110,${0.22 * d})`;
      g.lineWidth = 0.8 * d;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + (hsh(k) - 0.5) * ln * 0.6, py - ln);
      g.stroke();
    }
    // 둥지 자리: 밟아 다진 흙 원
    const cx = w * 0.5, cy = (CY - HZ) * w;
    g.fillStyle = radg(g, cx, cy, 0, w * 0.2, [0, 'rgba(214,160,100,.75)'], [0.7, 'rgba(190,130,80,.35)'], [1, 'rgba(190,130,80,0)']);
    ell(g, cx, cy, w * 0.24, w * 0.24 * SQ);
    g.fill();
    // 작은 돌멩이
    for (let k = 0; k < 30; k++) {
      const px = hsh(k + 200) * w, py = (0.1 + hsh(k + 201) * 0.9) * gh, r = w * (0.004 + hsh(k + 202) * 0.006) * (0.5 + py / gh);
      g.fillStyle = 'rgba(60,36,40,.35)';
      ell(g, px + r * 0.3, py + r * 0.3, r * 1.2, r * 0.6);
      g.fill();
      g.fillStyle = k % 2 ? '#b8a088' : '#9c8676';
      ell(g, px, py, r * 1.1, r * 0.7);
      g.fill();
    }
    // 지평선 안개
    g.fillStyle = lin(g, 0, 0, 0, gh * 0.25, [0, 'rgba(255,170,140,.45)'], [1, 'rgba(255,170,140,0)']);
    g.fillRect(0, 0, w, gh * 0.25);
  });
  // 앞 단면: 지층 + 화석
  const sh = (GB - GE) * w + w * 0.02;
  const strata = layer(w, sh, sc, (g) => {
    const bands = [['#6f4a2a', 0], ['#9a5e34', 0.18], ['#c08a4e', 0.38], ['#8a4438', 0.55], ['#6a3e3e', 0.72], ['#4a2c34', 0.88]] as [string, number][];
    for (let i = 0; i < bands.length; i++) {
      const [col, y0] = bands[i];
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, sh);
      for (let x = 0; x <= w; x += w / 30) g.lineTo(x, y0 * sh + Math.sin(x / w * 7 + i * 2) * sh * 0.03 + Math.sin(x / w * 19 + i) * sh * 0.012);
      g.lineTo(w, sh);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255,220,170,.12)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x <= w; x += w / 30) {
        const yy = y0 * sh + Math.sin(x / w * 7 + i * 2) * sh * 0.03 + Math.sin(x / w * 19 + i) * sh * 0.012;
        if (x) g.lineTo(x, yy);
        else g.moveTo(x, yy);
      }
      g.stroke();
    }
    // 작은 돌 알갱이
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(${k % 2 ? '255,230,190' : '40,20,20'},.18)`;
      ell(g, hsh(k + 300) * w, (0.15 + hsh(k + 301) * 0.8) * sh, w * 0.006, w * 0.003);
      g.fill();
    }
    // 암모나이트
    const ax = w * 0.22, ay = sh * 0.62, ar = w * 0.03;
    g.strokeStyle = 'rgba(255,230,190,.55)';
    g.lineWidth = w * 0.004;
    g.beginPath();
    for (let a = 0; a < TAU * 2.6; a += 0.15) {
      const rr2 = ar * (1 - a / (TAU * 2.9));
      const px = ax + Math.cos(a) * rr2, py = ay + Math.sin(a) * rr2 * 0.85;
      if (a) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
    for (let a = 0; a < TAU; a += 0.5) {
      g.beginPath();
      g.moveTo(ax + Math.cos(a) * ar * 0.55, ay + Math.sin(a) * ar * 0.47);
      g.lineTo(ax + Math.cos(a) * ar, ay + Math.sin(a) * ar * 0.85);
      g.stroke();
    }
    // 뼈 화석
    const bx = w * 0.7, by = sh * 0.45;
    g.strokeStyle = 'rgba(255,236,200,.55)';
    g.lineWidth = w * 0.009;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(bx - w * 0.05, by + w * 0.01);
    g.lineTo(bx + w * 0.05, by - w * 0.008);
    g.stroke();
    g.fillStyle = 'rgba(255,236,200,.55)';
    for (const [ex, ey] of [[-0.05, 0.01], [0.05, -0.008]])
      for (const o of [-1, 1]) {
        g.beginPath();
        g.arc(bx + ex * w, by + ey * w + o * w * 0.007, w * 0.008, 0, TAU);
        g.fill();
      }
    // 작은 물고기 화석
    const qx = w * 0.88, qy = sh * 0.8;
    g.strokeStyle = 'rgba(255,230,190,.4)';
    g.lineWidth = w * 0.003;
    g.beginPath();
    g.moveTo(qx - w * 0.03, qy);
    g.lineTo(qx + w * 0.02, qy);
    for (let j = 0; j < 5; j++) {
      g.moveTo(qx - w * 0.02 + j * w * 0.008, qy - w * 0.008);
      g.lineTo(qx - w * 0.02 + j * w * 0.008, qy + w * 0.008);
    }
    g.moveTo(qx + w * 0.02, qy);
    g.lineTo(qx + w * 0.032, qy - w * 0.01);
    g.moveTo(qx + w * 0.02, qy);
    g.lineTo(qx + w * 0.032, qy + w * 0.01);
    g.stroke();
    // 풀뿌리 · 윗단 풀 처마
    g.strokeStyle = 'rgba(60,30,20,.5)';
    g.lineWidth = 1;
    for (let k = 0; k < 16; k++) {
      const x0 = hsh(k + 400) * w;
      g.beginPath();
      g.moveTo(x0, 0);
      g.quadraticCurveTo(x0 + (hsh(k + 401) - 0.5) * w * 0.04, sh * 0.1, x0 + (hsh(k + 402) - 0.5) * w * 0.03, sh * (0.12 + hsh(k + 403) * 0.12));
      g.stroke();
    }
    g.fillStyle = '#6f7d34';
    g.beginPath();
    g.moveTo(0, 0);
    for (let x = 0; x <= w; x += w / 60) g.lineTo(x, sh * (0.04 + 0.05 * hsh(x * 3.1)));
    g.lineTo(w, 0);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,220,140,.35)';
    g.fillRect(0, 0, w, 1.5);
    // 아래로 갈수록 어둡게
    g.fillStyle = lin(g, 0, 0, 0, sh, [0, 'rgba(20,6,16,0)'], [1, 'rgba(20,6,16,.5)']);
    g.fillRect(0, 0, w, sh);
  });
  const bg = { sky, far, mid, ground, strata };
  BG.set(key, bg);
  return bg;
}

// ── 아기 공룡 ──
interface DinoPose { ch: number; hold: boolean; sAge: number; lastCh: number; mood: number; look: number; t: number; scared: boolean }
/** mood: 0 보통 · 2 만세 · 4 시무룩 */
function drawDino(ctx: C2, x: number, y: number, k: number, o: DinoPose) {
  const { ch, t } = o;
  const G1 = '#8fe0a8', G2 = '#47b083', G3 = '#2b7a63', BEL = '#fff0c4', SP = '#ff8f5e', SP2 = '#d9583a';
  const lw = k * 0.026;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 그림자 (발을 들수록 작게)
  ctx.fillStyle = 'rgba(46,16,34,.4)';
  ell(ctx, 0, 0, k * (0.44 - ch * 0.04), k * 0.1);
  ctx.fill();
  let sx = 1, sy = 1;
  const stompE = o.sAge < 18 ? (o.sAge < 3 ? o.sAge / 3 : Math.max(0, 1 - (o.sAge - 3) / 15)) : 0;
  if (stompE > 0) (sx = 1 + 0.16 * stompE * (0.5 + o.lastCh)), (sy = 1 - 0.17 * stompE * (0.5 + o.lastCh));
  else if (o.hold) (sy = 1 + 0.07 * ch), (sx = 1 - 0.035 * ch);
  const br = 1 + Math.sin(t * 0.07) * 0.018;
  const trem = o.hold && ch >= 1 ? Math.sin(t * 2.3) * k * 0.014 : o.hold ? Math.sin(t * 1.3) * k * 0.004 * ch : 0;
  const lean = o.hold ? -0.07 * ch : 0;
  ctx.translate(trem, 0);
  ctx.rotate(lean);
  ctx.scale(sx, sy * br);
  const lift = o.hold ? k * (0.05 + 0.3 * ch) : 0;
  // 꼬리 (뒤쪽 왼편으로 말려 올라감)
  {
    const sw = Math.sin(t * 0.06) * k * 0.03;
    ctx.beginPath();
    ctx.moveTo(-k * 0.12, -k * 0.16);
    ctx.quadraticCurveTo(-k * 0.42, -k * 0.06, -k * 0.5 + sw, -k * 0.3);
    ctx.quadraticCurveTo(-k * 0.53 + sw, -k * 0.4, -k * 0.46 + sw, -k * 0.38);
    ctx.quadraticCurveTo(-k * 0.38, -k * 0.2, -k * 0.12, -k * 0.34);
    ctx.closePath();
    fs(ctx, lin(ctx, -k * 0.5, -k * 0.4, -k * 0.1, -k * 0.1, [0, G2], [1, G3]), lw);
    ctx.fillStyle = SP;
    for (let i = 0; i < 3; i++) {
      const u = 0.3 + i * 0.22, px = -k * (0.18 + u * 0.3) + sw * u, py = -k * (0.3 + u * 0.06);
      ctx.beginPath();
      ctx.moveTo(px - k * 0.03, py + k * 0.01);
      ctx.lineTo(px - k * 0.01, py - k * 0.06);
      ctx.lineTo(px + k * 0.025, py + k * 0.005);
      ctx.closePath();
      fs(ctx, SP, lw * 0.7);
    }
  }
  // 다리: 왼쪽은 딛고, 오른쪽은 든다
  const leg = (lx: number, up: number, bend: number) => {
    ctx.save();
    ctx.translate(lx, -up);
    // 허벅지
    ell(ctx, bend * k * 0.03, -k * 0.11, k * 0.1, k * 0.13, bend * 0.3);
    fs(ctx, lin(ctx, 0, -k * 0.24, 0, 0, [0, G2], [1, G3]), lw);
    // 발
    ell(ctx, bend * k * 0.05, -k * 0.015, k * 0.12, k * 0.055);
    fs(ctx, G2, lw);
    ctx.fillStyle = BEL;
    for (let i = -1; i <= 1; i++) {
      ell(ctx, bend * k * 0.05 + i * k * 0.055, k * 0.012, k * 0.022, k * 0.016);
      ctx.fill();
    }
    ctx.restore();
  };
  leg(-k * 0.13, 0, -0.2);
  leg(k * 0.14, lift, o.hold ? 1 : 0.2);
  // 몸통
  ell(ctx, 0, -k * 0.36, k * 0.28, k * 0.27);
  fs(ctx, radg(ctx, -k * 0.1, -k * 0.48, k * 0.05, k * 0.36, [0, G1], [0.6, G2], [1, G3]), lw);
  // 배
  ell(ctx, k * 0.02, -k * 0.31, k * 0.17, k * 0.19);
  ctx.fillStyle = lin(ctx, 0, -k * 0.5, 0, -k * 0.12, [0, '#fff8de'], [1, '#f2d898']);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,140,70,.45)';
  ctx.lineWidth = lw * 0.6;
  for (let i = 0; i < 4; i++) {
    const yy = -k * (0.42 - i * 0.07);
    ctx.beginPath();
    ctx.ellipse(k * 0.02, yy, k * 0.15 * Math.sqrt(1 - Math.pow((yy + k * 0.31) / (k * 0.2), 2) || 0.01), k * 0.02, 0, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 팔 (힘줄 땐 위로 번쩍, 쿵 직후엔 만세)
  const armUp = o.hold ? 0.6 + 0.6 * ch : stompE > 0 || o.mood === 2 ? 1.4 : o.scared ? 0.9 : 0.15 + Math.sin(t * 0.07) * 0.08;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * k * 0.23, -k * 0.42);
    ctx.rotate(sd * (0.6 - armUp * 1.1) + (o.mood === 2 ? Math.sin(t * 0.3 + sd) * 0.2 : 0));
    rr(ctx, -k * 0.035, 0, k * 0.07, k * 0.13, k * 0.035);
    fs(ctx, G2, lw * 0.9);
    ctx.fillStyle = BEL;
    for (const cx of [-0.018, 0.018]) {
      ell(ctx, cx * k, k * 0.13, k * 0.012, k * 0.016);
      ctx.fill();
    }
    ctx.restore();
  }
  // 머리
  const hx = k * 0.02, hy = -k * 0.76;
  // 머리 위 등지느러미 가시
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 0.45, px = hx + Math.cos(a) * k * 0.23, py = hy + Math.sin(a) * k * 0.23;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-k * 0.05, k * 0.03);
    ctx.quadraticCurveTo(0, -k * (0.1 + (i === 1 ? 0.03 : 0)), k * 0.05, k * 0.03);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, -k * 0.1, 0, k * 0.03, [0, SP], [1, SP2]), lw * 0.8);
    ctx.restore();
  }
  ell(ctx, hx, hy, k * 0.26, k * 0.24);
  fs(ctx, radg(ctx, hx - k * 0.1, hy - k * 0.1, k * 0.03, k * 0.32, [0, G1], [0.65, G2], [1, G3]), lw);
  // 볼 (힘줄수록 빵빵)
  const puff = o.hold ? 0.035 + 0.07 * ch : stompE * 0.04;
  for (const sd of [-1, 1]) {
    const cx = hx + sd * k * 0.17, cy = hy + k * 0.07;
    if (puff > 0.01) {
      ell(ctx, cx + sd * k * puff * 0.4, cy, k * (0.06 + puff), k * (0.05 + puff * 0.8));
      fs(ctx, radg(ctx, cx - k * 0.02, cy - k * 0.03, 0, k * (0.08 + puff), [0, G1], [1, G2]), lw * 0.8);
    }
    ctx.fillStyle = `rgba(255,120,130,${0.45 + 0.3 * ch})`;
    ell(ctx, cx + sd * k * puff * 0.4, cy + k * 0.01, k * (0.045 + puff * 0.5), k * 0.03);
    ctx.fill();
  }
  // 주둥이
  ell(ctx, hx + k * 0.02, hy + k * 0.09, k * 0.15, k * 0.1);
  fs(ctx, lin(ctx, 0, hy, 0, hy + k * 0.19, [0, '#a6ecbc'], [1, '#6cc794']), lw * 0.8);
  ctx.fillStyle = G3;
  for (const sd of [-1, 1]) {
    ell(ctx, hx + k * 0.02 + sd * k * 0.04, hy + k * 0.05, k * 0.012, k * 0.008);
    ctx.fill();
  }
  // 입
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw * 0.9;
  const mx = hx + k * 0.02, my = hy + k * 0.12;
  if (stompE > 0.15 || o.mood === 2) {
    ctx.beginPath();
    ctx.ellipse(mx, my, k * 0.06, k * (0.03 + 0.03 * Math.max(stompE, o.mood === 2 ? 0.7 : 0)), 0, 0, Math.PI);
    ctx.closePath();
    fs(ctx, '#7a2030', lw * 0.8);
    ctx.fillStyle = '#ff8a9a';
    ell(ctx, mx, my + k * 0.035, k * 0.03, k * 0.015);
    ctx.fill();
  } else if (o.hold) {
    ctx.beginPath();
    ctx.moveTo(mx - k * 0.035, my);
    ctx.quadraticCurveTo(mx, my - k * 0.012, mx + k * 0.035, my);
    ctx.stroke();
  } else if (o.mood === 4) {
    ctx.beginPath();
    ctx.moveTo(mx - k * 0.04, my + k * 0.015);
    ctx.quadraticCurveTo(mx - k * 0.02, my - k * 0.01, mx, my + k * 0.005);
    ctx.quadraticCurveTo(mx + k * 0.02, my - k * 0.01, mx + k * 0.04, my + k * 0.015);
    ctx.stroke();
  } else if (o.scared) {
    ell(ctx, mx, my, k * 0.022, k * 0.02);
    fs(ctx, '#7a2030', lw * 0.7);
  } else {
    ctx.beginPath();
    ctx.arc(mx, my - k * 0.03, k * 0.045, 0.35, Math.PI - 0.35);
    ctx.stroke();
  }
  // 눈
  const blink = !o.hold && (t % 200) < 7;
  for (const sd of [-1, 1]) {
    const ex = hx + sd * k * 0.095 + k * 0.01, ey = hy - k * 0.04;
    if (o.hold && ch > 0.45) {
      // 힘줄 때 > <
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      ctx.moveTo(ex - sd * k * 0.04, ey - k * 0.035);
      ctx.lineTo(ex + sd * k * 0.025, ey);
      ctx.lineTo(ex - sd * k * 0.04, ey + k * 0.035);
      ctx.stroke();
      continue;
    }
    if (o.mood === 2) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      ctx.arc(ex, ey + k * 0.02, k * 0.04, Math.PI + 0.3, -0.3);
      ctx.stroke();
      continue;
    }
    if (blink) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw * 1.2;
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.04, ey);
      ctx.quadraticCurveTo(ex, ey + k * 0.02, ex + k * 0.04, ey);
      ctx.stroke();
      continue;
    }
    const big = stompE > 0.3 || o.scared ? 1.12 : 1;
    ell(ctx, ex, ey, k * 0.058 * big, k * 0.07 * big);
    fs(ctx, '#ffffff', lw * 0.9);
    const px = ex + o.look * k * 0.018, py = ey + k * 0.008;
    ell(ctx, px, py, k * 0.036, k * 0.045);
    ctx.fillStyle = '#2a1430';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, px - k * 0.012, py - k * 0.018, k * 0.013, k * 0.015);
    ctx.fill();
    ell(ctx, px + k * 0.012, py + k * 0.016, k * 0.006, k * 0.006);
    ctx.fill();
    if (o.mood === 4) {
      ctx.fillStyle = 'rgba(140,210,255,.9)';
      ell(ctx, ex + sd * k * 0.03, ey + k * 0.09 + ((t * 0.6) % (k * 0.12)), k * 0.014, k * 0.022);
      ctx.fill();
    }
  }
  // 힘줄 때 눈썹
  if (o.hold && ch > 0.2) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.1;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + sd * k * 0.15 + k * 0.01, hy - k * 0.13);
      ctx.lineTo(hx + sd * k * 0.05 + k * 0.01, hy - k * 0.1);
      ctx.stroke();
    }
  }
  // 머리 윤기
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, hx - k * 0.1, hy - k * 0.15, k * 0.07, k * 0.035, -0.4);
  ctx.fill();
  ctx.restore();
}

// ── 둥지 · 알 ──
const EGG_AT = [[-0.034, -0.008], [0.034, -0.008], [0, 0.022]];
function drawNestBack(ctx: C2, x: number, y: number, R: number) {
  ctx.fillStyle = 'rgba(46,16,34,.35)';
  ell(ctx, x, y + R * 0.08, R * 1.18, R * 1.18 * SQ * 0.95);
  ctx.fill();
  ell(ctx, x, y, R, R * SQ);
  ctx.fillStyle = radg(ctx, x, y + R * 0.1, 0, R, [0, '#5a3420'], [0.7, '#7a4a2a'], [1, '#a06a3a']);
  ctx.fill();
  // 지푸라기
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = hsh(i + 900) * TAU, rr2 = R * (0.3 + hsh(i + 901) * 0.55);
    ctx.strokeStyle = i % 2 ? 'rgba(240,200,120,.6)' : 'rgba(200,150,80,.6)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2 * SQ);
    ctx.lineTo(x + Math.cos(a + 0.5) * rr2 * 0.9, y + Math.sin(a + 0.5) * rr2 * SQ * 0.9);
    ctx.stroke();
  }
}
function drawNestFront(ctx: C2, x: number, y: number, R: number) {
  // 앞쪽 테두리 (잔가지 엮음) — 알 앞을 반쯤 가린다
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const a = 0.05 + (i / 34) * (Math.PI - 0.1), a2 = a + 0.5 + hsh(i) * 0.3;
    const rr1 = R * (1 + (hsh(i + 50) - 0.5) * 0.12), rr2 = R * (1.02 + (hsh(i + 60) - 0.5) * 0.14);
    ctx.strokeStyle = ['#8a5a32', '#6a4024', '#b07a44', '#5a3420'][i % 4];
    ctx.lineWidth = 2.4 + hsh(i + 70) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * rr1, y + Math.sin(a) * rr1 * SQ - R * 0.04);
    ctx.quadraticCurveTo(x + Math.cos((a + a2) / 2) * rr1 * 1.08, y + Math.sin((a + a2) / 2) * rr1 * SQ, x + Math.cos(a2) * rr2, y + Math.sin(a2) * rr2 * SQ - R * 0.02);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,210,150,.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y - R * 0.06, R * 1.0, R * SQ * 1.0, 0, 0.15, Math.PI - 0.15);
  ctx.stroke();
}
function drawEgg(ctx: C2, x: number, y: number, r: number, wob: number, crack = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  eggPath(ctx, 0, -r * 0.9, r);
  fs(ctx, radg(ctx, -r * 0.35, -r * 1.3, r * 0.1, r * 1.5, [0, '#fffaf0'], [0.6, '#f6e2c0'], [1, '#d9b98a']), Math.max(1, r * 0.14));
  ctx.fillStyle = 'rgba(160,110,70,.55)';
  for (const [sx, sy, sr] of [[0.3, -1.2, 0.16], [-0.35, -0.7, 0.13], [0.15, -0.35, 0.11], [-0.1, -1.5, 0.09], [0.45, -0.75, 0.08]]) {
    ell(ctx, sx * r, sy * r, sr * r, sr * r * 0.8);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ell(ctx, -r * 0.35, -r * 1.35, r * 0.18, r * 0.3, -0.4);
  ctx.fill();
  if (crack) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.9);
    ctx.lineTo(-r * 0.3, -r * 1.1);
    ctx.lineTo(0, -r * 0.8);
    ctx.lineTo(r * 0.35, -r * 1.05);
    ctx.lineTo(r * 0.8, -r * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

// ── 동굴 사람 (꼬마 · 어른 · 방패) ──
/** pose: 0 걷기 · 1 공중 버둥 · 2 어질(앉음) · 3 기절 데굴 · 4 알 집기 · 5 알 들고 도망 · 6 방패로 버팀 */
function drawCave(ctx: C2, k: number, kind: K, pose: number, t: number, seed: number, egg: boolean, ko: boolean) {
  const kid = kind === 'kid', shield = kind === 'shield';
  const SKIN = kid ? '#f6c79a' : '#eab084', SKIN2 = kid ? '#d9976a' : '#c98458';
  const FUR = kid ? ['#ffc06a', '#e08a3a'] : shield ? ['#b8a27a', '#7a6444'] : ['#e09448', '#9a5424'];
  const HAIR = kid ? '#6a3a20' : '#3a2216';
  const lw = Math.max(1, k * 0.035);
  const ph = t * (pose === 5 ? 0.42 : 0.26) + seed;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const head = kid ? 0.25 : 0.2, hy = kid ? -0.74 : -0.8;
  // 다리
  const legs = (sw: number, spread = 0) => {
    for (const sd of [-1, 1]) {
      const a = Math.sin(ph + (sd > 0 ? Math.PI : 0)) * sw + sd * spread;
      const fx = Math.sin(a) * k * 0.2 + sd * k * 0.05, fy = -Math.max(0, Math.cos(a) * -1) * k * 0.05;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = k * 0.11 + lw * 2;
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.06, -k * 0.27);
      ctx.lineTo(fx, fy - k * 0.04);
      ctx.stroke();
      ctx.strokeStyle = sd > 0 ? SKIN2 : SKIN;
      ctx.lineWidth = k * 0.11;
      ctx.stroke();
      ell(ctx, fx + k * 0.035, fy - k * 0.025, k * 0.075, k * 0.04);
      fs(ctx, sd > 0 ? SKIN2 : SKIN, lw);
    }
  };
  // 몽둥이
  const club = (hx: number, hy2: number, ang: number) => {
    ctx.save();
    ctx.translate(hx, hy2);
    ctx.rotate(ang);
    rr(ctx, -k * 0.035, -k * 0.34, k * 0.07, k * 0.36, k * 0.03);
    fs(ctx, lin(ctx, -k * 0.04, 0, k * 0.04, 0, [0, '#a8703c'], [1, '#6a4020']), lw);
    ell(ctx, 0, -k * 0.38, k * 0.085, k * 0.11);
    fs(ctx, radg(ctx, -k * 0.03, -k * 0.42, 0, k * 0.12, [0, '#c08a50'], [1, '#7a4a24']), lw);
    ctx.fillStyle = '#5a3418';
    for (const [qx, qy] of [[0.03, -0.42], [-0.04, -0.34], [0.02, -0.3]]) {
      ell(ctx, qx * k, qy * k, k * 0.016, k * 0.012);
      ctx.fill();
    }
    ctx.restore();
  };
  // 팔 (어깨 → 손)
  const arm = (x0: number, y0: number, x1: number, y1: number, col: string) => {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.09 + lw * 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = k * 0.09;
    ctx.stroke();
    ell(ctx, x1, y1, k * 0.055, k * 0.055);
    fs(ctx, col, lw);
  };
  const air = pose === 1 || pose === 3;
  const flail = Math.sin(t * 0.7 + seed) * 0.5;
  if (pose === 2) ctx.translate(0, k * 0.16);
  // 뒤팔
  if (air) arm(-k * 0.08, -k * 0.5, -k * 0.24, -k * (0.82 + flail * 0.15), SKIN2);
  else if (pose === 5) arm(-k * 0.06, -k * 0.52, -k * 0.06, -k * 1.02, SKIN2);
  else if (!shield) arm(-k * 0.1, -k * 0.5, -k * 0.2, -k * (0.32 + Math.sin(ph) * 0.05), SKIN2);
  // 다리
  if (pose === 2) {
    for (const sd of [-1, 1]) {
      ell(ctx, sd * k * 0.07 + k * 0.12, -k * 0.2, k * 0.12, k * 0.05);
      fs(ctx, sd > 0 ? SKIN2 : SKIN, lw);
    }
  } else if (air) legs(0.9 + flail, 0.3);
  else legs(pose === 0 || pose === 5 ? (pose === 5 ? 0.75 : 0.5) : 0.1);
  // 몸통 (털옷)
  const by = -k * 0.44;
  ctx.beginPath();
  ctx.moveTo(-k * 0.2, by - k * 0.12);
  ctx.quadraticCurveTo(-k * 0.26, by + k * 0.14, -k * 0.18, by + k * 0.2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-k * 0.18 + (i / 6) * k * 0.38, by + k * (i % 2 ? 0.25 : 0.19));
  ctx.quadraticCurveTo(k * 0.27, by + k * 0.12, k * 0.2, by - k * 0.12);
  ctx.quadraticCurveTo(0, by - k * 0.26, -k * 0.2, by - k * 0.12);
  ctx.closePath();
  fs(ctx, lin(ctx, -k * 0.2, by - k * 0.2, k * 0.2, by + k * 0.2, [0, FUR[0]], [1, FUR[1]]), lw);
  ctx.fillStyle = shield ? 'rgba(70,50,30,.45)' : 'rgba(90,40,16,.5)';
  for (const [qx, qy, qr] of [[-0.08, -0.06, 0.04], [0.09, 0.02, 0.035], [-0.02, 0.1, 0.03], [0.1, -0.1, 0.025]]) {
    ell(ctx, qx * k, by + qy * k, qr * k, qr * k * 0.8);
    ctx.fill();
  }
  // 어깨끈 (맨살 어깨)
  ctx.strokeStyle = FUR[1];
  ctx.lineWidth = k * 0.05;
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, by - k * 0.12);
  ctx.lineTo(k * 0.06, by - k * 0.2);
  ctx.stroke();
  // 머리
  const hx = k * 0.03, hyy = k * hy + (pose === 0 ? Math.abs(Math.sin(ph)) * -k * 0.02 : 0);
  ctx.save();
  if (pose === 2) {
    ctx.translate(hx, hyy);
    ctx.rotate(Math.sin(t * 0.15) * 0.25);
    ctx.translate(-hx, -hyy);
  }
  // 머리카락 (뒤)
  ctx.fillStyle = HAIR;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + 0.2 + i * 0.42;
    ell(ctx, hx + Math.cos(a) * k * head * 0.85, hyy + Math.sin(a) * k * head * 0.8, k * head * 0.42, k * head * 0.38);
    ctx.fill();
  }
  ell(ctx, hx, hyy, k * head, k * head * 0.95);
  fs(ctx, radg(ctx, hx - k * 0.05, hyy - k * 0.06, 0, k * head * 1.2, [0, SKIN], [1, SKIN2]), lw);
  if (!kid) {
    ctx.fillStyle = 'rgba(80,40,30,.28)';
    ctx.beginPath();
    ctx.ellipse(hx + k * 0.02, hyy + k * 0.06, k * head * 0.85, k * head * 0.55, 0, 0.1, Math.PI - 0.1);
    ctx.fill();
  }
  // 머리카락 (위, 덥수룩)
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(hx - k * head * 1.05, hyy - k * head * 0.1);
  for (let i = 0; i <= 7; i++) {
    const a = Math.PI + (i / 7) * Math.PI, rr2 = k * head * (i % 2 ? 1.12 : 1.32);
    ctx.lineTo(hx + Math.cos(a) * rr2, hyy + Math.sin(a) * rr2 * 0.95);
  }
  ctx.quadraticCurveTo(hx + k * head * 0.4, hyy - k * head * 0.35, hx - k * head * 1.05, hyy - k * head * 0.1);
  ctx.closePath();
  fs(ctx, HAIR, lw * 0.8);
  if (kid) {
    // 꼬마: 정수리 상투 + 뼈 핀
    ell(ctx, hx - k * 0.02, hyy - k * head * 1.35, k * 0.06, k * 0.05);
    fs(ctx, HAIR, lw * 0.8);
    ctx.strokeStyle = '#fff3dc';
    ctx.lineWidth = k * 0.03;
    ctx.beginPath();
    ctx.moveTo(hx - k * 0.1, hyy - k * head * 1.4);
    ctx.lineTo(hx + k * 0.06, hyy - k * head * 1.3);
    ctx.stroke();
  }
  // 코
  ell(ctx, hx + k * head * 0.82, hyy + k * 0.01, k * 0.06, k * 0.05);
  fs(ctx, '#e3946a', lw * 0.8);
  // 눈썹(일자) · 눈
  const ex = hx + k * head * 0.45, ey = hyy - k * 0.04;
  if (ko || pose === 3) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.1;
    for (const o of [0, -k * 0.1]) {
      ctx.beginPath();
      ctx.moveTo(ex + o - k * 0.025, ey - k * 0.025);
      ctx.lineTo(ex + o + k * 0.025, ey + k * 0.025);
      ctx.moveTo(ex + o + k * 0.025, ey - k * 0.025);
      ctx.lineTo(ex + o - k * 0.025, ey + k * 0.025);
      ctx.stroke();
    }
  } else if (pose === 2) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 0.8;
    for (const o of [0, -k * 0.1]) {
      ctx.beginPath();
      for (let a = 0; a < TAU * 1.6; a += 0.4) {
        const rr2 = k * 0.006 * a;
        const px = ex + o + Math.cos(a + t * 0.2) * rr2, py = ey + Math.sin(a + t * 0.2) * rr2;
        if (a) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  } else {
    const wide = air ? 1.5 : 1;
    for (const o of [0, -k * 0.1]) {
      ell(ctx, ex + o, ey, k * 0.03 * wide, k * 0.034 * wide);
      fs(ctx, '#ffffff', lw * 0.6);
      ctx.fillStyle = '#1a0e12';
      ell(ctx, ex + o + k * 0.008, ey + k * 0.003, k * 0.014, k * 0.016);
      ctx.fill();
    }
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = k * 0.035;
    ctx.beginPath();
    ctx.moveTo(ex - k * 0.14, ey - k * (air ? 0.07 : 0.045));
    ctx.quadraticCurveTo(ex - k * 0.05, ey - k * (air ? 0.09 : 0.03), ex + k * 0.04, ey - k * (air ? 0.07 : 0.05));
    ctx.stroke();
  }
  // 입
  const mx = hx + k * head * 0.5, my = hyy + k * 0.09;
  if (air || pose === 3) {
    ell(ctx, mx, my, k * 0.04, k * 0.05);
    fs(ctx, '#5a1a1a', lw * 0.7);
  } else if (pose === 5) {
    ctx.beginPath();
    ctx.arc(mx - k * 0.01, my - k * 0.02, k * 0.05, 0.2, Math.PI - 0.6);
    ctx.closePath();
    fs(ctx, '#ffffff', lw * 0.7);
  } else {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(mx - k * 0.05, my);
    ctx.quadraticCurveTo(mx - k * 0.01, my + k * 0.025, mx + k * 0.03, my - k * 0.01);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - k * 0.02, my, k * 0.022, k * 0.02);
  }
  ctx.restore();
  // 앞팔 + 들고 있는 것
  if (shield) {
    arm(k * 0.08, -k * 0.5, k * 0.2, -k * 0.4, SKIN);
    const sx = k * (pose === 6 ? 0.26 : 0.22), sy = -k * 0.42;
    ctx.save();
    ctx.translate(sx, sy);
    if (air) ctx.rotate(0.8 + flail);
    ell(ctx, 0, 0, k * 0.11, k * 0.27);
    fs(ctx, lin(ctx, -k * 0.1, 0, k * 0.1, 0, [0, '#8a5a30'], [1, '#5a3418']), lw * 1.2);
    ell(ctx, k * 0.02, 0, k * 0.08, k * 0.22);
    fs(ctx, radg(ctx, k * 0.02, 0, 0, k * 0.22, [0, '#f0c27a'], [0.5, '#d49a58'], [1, '#b07838']), lw * 0.6);
    ctx.strokeStyle = 'rgba(120,70,30,.6)';
    ctx.lineWidth = Math.max(0.8, k * 0.012);
    for (const q of [0.35, 0.65]) {
      ell(ctx, k * 0.02, 0, k * 0.08 * q, k * 0.22 * q);
      ctx.stroke();
    }
    ctx.restore();
  } else if (air) {
    arm(k * 0.08, -k * 0.5, k * 0.24, -k * (0.86 - flail * 0.15), SKIN);
    if (!kid) club(k * 0.24, -k * (0.86 - flail * 0.15), 0.6 + flail);
  } else if (pose === 5) {
    arm(k * 0.06, -k * 0.52, k * 0.06, -k * 1.02, SKIN);
    if (egg) drawEgg(ctx, 0, -k * 1.0, k * 0.1, Math.sin(t * 0.3) * 0.2);
  } else if (pose === 4) {
    arm(k * 0.08, -k * 0.5, k * 0.32, -k * 0.36, SKIN);
  } else if (pose === 2) {
    arm(k * 0.08, -k * 0.5, k * 0.22, -k * 0.3, SKIN);
  } else if (kid) {
    arm(k * 0.08, -k * 0.5, k * 0.2, -k * 0.38, SKIN);
    ctx.strokeStyle = '#fff3dc';
    ctx.lineWidth = k * 0.04;
    ctx.beginPath();
    ctx.moveTo(k * 0.2, -k * 0.38);
    ctx.lineTo(k * 0.2, -k * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#fff3dc';
    for (const o of [-1, 1]) {
      ell(ctx, k * 0.2 + o * k * 0.025, -k * 0.62, k * 0.03, k * 0.03);
      ctx.fill();
    }
  } else {
    const sw = Math.sin(ph) * 0.25;
    arm(k * 0.08, -k * 0.5, k * 0.22, -k * 0.52, SKIN);
    club(k * 0.22, -k * 0.52, 0.35 + sw);
  }
}

// ── 익룡 ──
function drawPtero(ctx: C2, k: number, t: number, face: number, egg: boolean, fall: boolean) {
  ctx.save();
  ctx.scale(face, 1);
  if (fall) ctx.rotate(t * 0.3);
  const lw = Math.max(1, k * 0.022);
  const flap = fall ? 0.4 : Math.sin(t * 0.22);
  ctx.lineJoin = 'round';
  // 날개 (뒤 → 앞)
  for (const sd of [-1, 1]) {
    const tipY = -k * (0.32 * flap) * (sd < 0 ? 0.8 : 1), tipX = -k * 0.05 + sd * k * 0.04;
    ctx.beginPath();
    ctx.moveTo(k * 0.06, -k * 0.02);
    ctx.quadraticCurveTo(k * 0.1, tipY * 0.6 - k * 0.05, tipX + k * 0.3 * (sd < 0 ? 0.8 : 1), tipY - k * 0.08);
    ctx.quadraticCurveTo(-k * 0.05, tipY * 0.3, -k * 0.12, k * 0.02);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, tipY, 0, k * 0.05, [0, sd < 0 ? '#c25a5a' : '#ff9e6e'], [1, sd < 0 ? '#7a2e4a' : '#c4526a']), lw);
    ctx.strokeStyle = 'rgba(60,20,30,.6)';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(k * 0.06, -k * 0.02);
    ctx.quadraticCurveTo(k * 0.1, tipY * 0.6 - k * 0.05, tipX + k * 0.3 * (sd < 0 ? 0.8 : 1), tipY - k * 0.08);
    ctx.stroke();
  }
  // 몸통
  ell(ctx, 0, 0, k * 0.15, k * 0.065, -0.1);
  fs(ctx, lin(ctx, 0, -k * 0.06, 0, k * 0.06, [0, '#b0607a'], [1, '#6a2e4a']), lw);
  // 다리 + 알
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-k * 0.04, k * 0.04);
  ctx.lineTo(-k * 0.06, k * 0.11);
  ctx.moveTo(k * 0.02, k * 0.04);
  ctx.lineTo(k * 0.0, k * 0.11);
  ctx.stroke();
  if (egg) drawEgg(ctx, -k * 0.03, k * 0.2, k * 0.06, 0);
  // 머리 · 볏 · 부리
  ctx.save();
  ctx.translate(k * 0.15, -k * 0.04);
  ctx.beginPath();
  ctx.moveTo(-k * 0.02, -k * 0.02);
  ctx.lineTo(-k * 0.16, -k * 0.1);
  ctx.lineTo(k * 0.0, -k * 0.055);
  ctx.closePath();
  fs(ctx, '#ff8a5a', lw);
  ell(ctx, 0, 0, k * 0.06, k * 0.05);
  fs(ctx, '#c2687e', lw);
  ctx.beginPath();
  ctx.moveTo(k * 0.03, -k * 0.02);
  ctx.lineTo(k * 0.26, k * 0.015);
  ctx.lineTo(k * 0.03, k * 0.035);
  ctx.closePath();
  fs(ctx, '#ffd27a', lw);
  ell(ctx, k * 0.015, -k * 0.012, k * 0.018, k * 0.018);
  fs(ctx, fall ? '#ffffff' : '#fff6d0', lw * 0.6);
  ctx.fillStyle = OUT;
  if (fall) {
    ctx.font = `900 ${Math.max(8, k * 0.04)}px system-ui`;
  } else {
    ell(ctx, k * 0.02, -k * 0.012, k * 0.008, k * 0.01);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-k * 0.01, -k * 0.04);
    ctx.lineTo(k * 0.04, -k * 0.028);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// ── 굴러오는 바위 ──
function drawRock(ctx: C2, r: number, spin: number) {
  ell(ctx, 0, 0, r, r);
  fs(ctx, radg(ctx, -r * 0.35, -r * 0.4, r * 0.1, r * 1.1, [0, '#c8b6a0'], [0.55, '#8e7a6c'], [1, '#55443e']), Math.max(1.2, r * 0.08));
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, TAU);
  ctx.clip();
  ctx.rotate(spin);
  ctx.fillStyle = 'rgba(110,150,70,.75)';
  ell(ctx, -r * 0.3, -r * 0.55, r * 0.45, r * 0.25, 0.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(50,30,30,.6)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(r * 0.1, -r * 0.2);
  ctx.lineTo(r * 0.35, r * 0.1);
  ctx.lineTo(r * 0.25, r * 0.45);
  ctx.moveTo(r * 0.35, r * 0.1);
  ctx.lineTo(r * 0.65, r * 0.15);
  ctx.moveTo(-r * 0.5, r * 0.3);
  ctx.lineTo(-r * 0.2, r * 0.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(40,24,24,.35)';
  ell(ctx, -r * 0.3, r * 0.25, r * 0.12, r * 0.09);
  ctx.fill();
  ell(ctx, r * 0.45, -r * 0.4, r * 0.09, r * 0.07);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,240,220,.4)';
  ell(ctx, -r * 0.4, -r * 0.45, r * 0.25, r * 0.13, -0.6);
  ctx.fill();
}

// ── 매머드 대장 ──
function drawMammoth(ctx: C2, k: number, t: number, face: number, pose: number, hp: number) {
  ctx.save();
  ctx.scale(face, 1);
  const lw = Math.max(1.4, k * 0.022);
  const air = pose === 1 || pose === 3;
  const step = pose === 0 ? Math.sin(t * 0.12) : 0;
  ctx.lineJoin = 'round';
  // 다리 4개 (뒤쪽 둘은 어둡게)
  const legX = [-0.3, 0.2, -0.18, 0.32];
  legX.forEach((lx, i) => {
    const back = i < 2, sw = (i % 2 ? 1 : -1) * step * k * 0.04 + (air ? (i % 2 ? 1 : -1) * k * 0.05 : 0);
    rr(ctx, lx * k - k * 0.075 + sw, -k * 0.32 - (air ? k * 0.05 : 0), k * 0.15, k * 0.33, k * 0.06);
    fs(ctx, back ? '#4a2818' : '#6e3e24', lw);
    ctx.fillStyle = '#f2e2c4';
    for (const o of [-1, 0, 1]) {
      ell(ctx, lx * k + sw + o * k * 0.04, -k * 0.012 - (air ? k * 0.05 : 0), k * 0.018, k * 0.014);
      ctx.fill();
    }
  });
  // 꼬리
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw * 2;
  ctx.beginPath();
  ctx.moveTo(-k * 0.46, -k * 0.55);
  ctx.quadraticCurveTo(-k * 0.56, -k * 0.45 + Math.sin(t * 0.1) * k * 0.03, -k * 0.54, -k * 0.36);
  ctx.stroke();
  // 몸통 (덥수룩한 털)
  ctx.beginPath();
  ctx.moveTo(-k * 0.48, -k * 0.5);
  ctx.quadraticCurveTo(-k * 0.5, -k * 0.9, -k * 0.1, -k * 0.92);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.95, k * 0.42, -k * 0.7);
  ctx.lineTo(k * 0.42, -k * 0.34);
  for (let i = 0; i <= 12; i++) ctx.lineTo(k * 0.42 - (i / 12) * k * 0.92, -k * (i % 2 ? 0.26 : 0.33));
  ctx.closePath();
  fs(ctx, lin(ctx, 0, -k * 0.95, 0, -k * 0.3, [0, '#a86a40'], [0.5, '#7a4428'], [1, '#56301c']), lw);
  ctx.strokeStyle = 'rgba(40,18,10,.45)';
  ctx.lineWidth = lw * 0.8;
  for (let i = 0; i < 14; i++) {
    const x0 = -k * 0.42 + (i / 14) * k * 0.8, y0 = -k * (0.82 - (i % 3) * 0.12);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + k * 0.03, y0 + k * 0.1, x0 - k * 0.01, y0 + k * 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,210,160,.18)';
  ell(ctx, -k * 0.1, -k * 0.8, k * 0.25, k * 0.07, -0.1);
  ctx.fill();
  // 머리
  const hx = k * 0.42, hy = -k * 0.66;
  ell(ctx, hx, hy, k * 0.23, k * 0.25);
  fs(ctx, radg(ctx, hx - k * 0.05, hy - k * 0.1, 0, k * 0.3, [0, '#b07a4a'], [1, '#6a3a22']), lw);
  // 머리 꼭대기 털 + 뼈 머리띠
  ctx.fillStyle = '#5a301a';
  ctx.beginPath();
  ctx.moveTo(hx - k * 0.18, hy - k * 0.14);
  for (let i = 0; i <= 6; i++) ctx.lineTo(hx - k * 0.18 + (i / 6) * k * 0.32, hy - k * (i % 2 ? 0.3 : 0.38));
  ctx.lineTo(hx + k * 0.16, hy - k * 0.12);
  ctx.closePath();
  fs(ctx, '#5a301a', lw);
  ctx.strokeStyle = '#fff1d6';
  ctx.lineWidth = k * 0.04;
  ctx.beginPath();
  ctx.moveTo(hx - k * 0.2, hy - k * 0.15);
  ctx.quadraticCurveTo(hx, hy - k * 0.24, hx + k * 0.2, hy - k * 0.13);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx - k * 0.02, hy - k * 0.2);
  ctx.lineTo(hx + k * 0.02, hy - k * 0.36);
  ctx.lineTo(hx + k * 0.06, hy - k * 0.2);
  ctx.closePath();
  fs(ctx, '#fff1d6', lw * 0.7);
  // 귀
  ell(ctx, hx - k * 0.17, hy + k * 0.02, k * 0.06, k * 0.09);
  fs(ctx, '#7a4428', lw);
  // 상아 (뒤)
  const tusk = (ox: number, sc: number) => {
    ctx.beginPath();
    ctx.moveTo(hx + k * 0.1 + ox, hy + k * 0.12);
    ctx.quadraticCurveTo(hx + k * 0.4 + ox, hy + k * 0.32 * sc, hx + k * 0.42 + ox, hy - k * 0.02);
    ctx.quadraticCurveTo(hx + k * 0.3 + ox, hy + k * 0.2 * sc, hx + k * 0.12 + ox, hy + k * 0.2);
    ctx.closePath();
    fs(ctx, lin(ctx, hx, hy, hx + k * 0.4, hy, [0, '#e8d6b0'], [1, '#fff8e8']), lw);
  };
  tusk(-k * 0.04, 0.9);
  // 코
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.12 + lw * 2;
  const tk = Math.sin(t * 0.08) * k * 0.04;
  ctx.beginPath();
  ctx.moveTo(hx + k * 0.12, hy + k * 0.06);
  ctx.quadraticCurveTo(hx + k * 0.24, hy + k * 0.35, hx + k * 0.16 + tk, hy + k * 0.52);
  ctx.stroke();
  ctx.strokeStyle = '#8a5432';
  ctx.lineWidth = k * 0.12;
  ctx.stroke();
  tusk(0, 1);
  // 눈 · 눈썹
  if (pose === 3) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath();
    ctx.moveTo(hx + k * 0.04, hy - k * 0.06);
    ctx.lineTo(hx + k * 0.1, hy);
    ctx.moveTo(hx + k * 0.1, hy - k * 0.06);
    ctx.lineTo(hx + k * 0.04, hy);
    ctx.stroke();
  } else {
    ell(ctx, hx + k * 0.07, hy - k * 0.03, k * (air ? 0.045 : 0.03), k * (air ? 0.05 : 0.032));
    fs(ctx, '#ffffff', lw * 0.7);
    ctx.fillStyle = '#1a0a08';
    ell(ctx, hx + k * 0.08, hy - k * 0.025, k * 0.016, k * 0.018);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    ctx.moveTo(hx + k * 0.0, hy - k * (air ? 0.12 : 0.1));
    ctx.lineTo(hx + k * 0.13, hy - k * (air ? 0.11 : 0.06));
    ctx.stroke();
  }
  ctx.restore();
  // 체력 (뼈 셋)
  for (let j = 0; j < 3; j++) {
    const bx = (j - 1) * k * 0.16, by = -k * 1.12;
    ctx.fillStyle = j < hp ? '#fff1d6' : 'rgba(255,255,255,.18)';
    ctx.strokeStyle = j < hp ? OUT : 'rgba(255,255,255,.3)';
    ctx.lineWidth = 1.2;
    rr(ctx, bx - k * 0.05, by - k * 0.015, k * 0.1, k * 0.03, k * 0.015);
    ctx.fill();
    ctx.stroke();
    for (const o of [-1, 1])
      for (const q of [-1, 1]) {
        ell(ctx, bx + o * k * 0.05, by + q * k * 0.016, k * 0.02, k * 0.02);
        ctx.fill();
        ctx.stroke();
      }
  }
}

// ── 구경꾼: 바위 위 작은 새 ──
function drawBird(ctx: C2, x: number, y: number, k: number, t: number, hop: number) {
  ctx.save();
  const jump = hop > 0 ? Math.sin((hop / 40) * Math.PI) * k * 0.6 : Math.max(0, Math.sin(t * 0.05)) > 0.98 ? k * 0.1 : 0;
  ctx.translate(x, y - jump);
  const lw = Math.max(1, k * 0.06);
  ctx.strokeStyle = '#d98a3a';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-k * 0.1, -k * 0.05);
  ctx.lineTo(-k * 0.12, k * 0.08);
  ctx.moveTo(k * 0.08, -k * 0.05);
  ctx.lineTo(k * 0.1, k * 0.08);
  ctx.stroke();
  // 꼬리깃
  ctx.beginPath();
  ctx.moveTo(-k * 0.3, -k * 0.3);
  ctx.lineTo(-k * 0.62, -k * 0.5);
  ctx.lineTo(-k * 0.55, -k * 0.22);
  ctx.closePath();
  fs(ctx, '#3e8aa8', lw);
  ell(ctx, 0, -k * 0.32, k * 0.34, k * 0.3);
  fs(ctx, radg(ctx, -k * 0.1, -k * 0.45, 0, k * 0.4, [0, '#8fd6f0'], [1, '#3e8aa8']), lw);
  ell(ctx, k * 0.08, -k * 0.24, k * 0.18, k * 0.15);
  ctx.fillStyle = '#fff1c8';
  ctx.fill();
  // 날개 (뛸 때 파닥)
  ctx.save();
  ctx.translate(-k * 0.08, -k * 0.34);
  ctx.rotate(hop > 0 ? -0.9 + Math.sin(t * 0.8) * 0.5 : 0.2);
  ell(ctx, -k * 0.1, 0, k * 0.2, k * 0.11);
  fs(ctx, '#2e6a86', lw * 0.8);
  ctx.restore();
  // 볏
  ctx.beginPath();
  ctx.moveTo(k * 0.05, -k * 0.6);
  ctx.lineTo(-k * 0.02, -k * 0.82);
  ctx.lineTo(k * 0.14, -k * 0.62);
  ctx.closePath();
  fs(ctx, '#ff7a5a', lw * 0.8);
  // 부리 · 눈
  ctx.beginPath();
  ctx.moveTo(k * 0.3, -k * 0.38);
  ctx.lineTo(k * 0.48, -k * 0.33);
  ctx.lineTo(k * 0.3, -k * 0.28);
  ctx.closePath();
  fs(ctx, '#ffb43a', lw * 0.8);
  ell(ctx, k * 0.17, -k * 0.42, k * 0.07, k * 0.08);
  fs(ctx, '#ffffff', lw * 0.6);
  ctx.fillStyle = OUT;
  ell(ctx, k * 0.19, -k * 0.41, k * 0.035, k * 0.045);
  ctx.fill();
  ctx.restore();
}

/** 머리 위를 도는 어질어질 별 */
function dizzy(ctx: C2, x: number, y: number, r: number, t: number, n = 3) {
  for (let i = 0; i < n; i++) {
    const a = t * 0.12 + (i * TAU) / n;
    starPath(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, r * 0.32);
    fs(ctx, '#ffe066', 1, '#8a5a10');
  }
}
