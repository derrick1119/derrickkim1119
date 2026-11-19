/**
 * 갈고리 해적 낚아채기 (32라운드: 실시간 액션 2탄) — 갈고리 낚아채기 × 가리키기 × 연쇄.
 * 조작(손이 하는 일은 하나): 화면 한 곳을 톡 = 꼬마 선장이 갈고리를 휙 던져 그 자리의 것에 '척' 걸고 **확 끌어온다**.
 *   키보드는 화살표로 커서 + 스페이스.
 * 규칙(결정적):
 *   가벼운 것(술통·해골 해적·화약통·상어)은 선장 쪽으로 끌려오며 **길 위의 해적을 볼링 핀처럼** 옆으로 날려 버린다(바다로 풍덩).
 *   무거운 것(대포·해골 선장)에 걸면 반대로 **내가 그쪽으로 끌려가며** 길을 쓸고, 돛대에 걸면 갈고리가 감겨 **한 바퀴 빙글** 돌며 둘레를 쓴다.
 *   돛대는 키가 커서 그 너머로 던진 갈고리도 돛대에 감긴다. 방패 해적은 앞(선장 쪽)에서 오는 갈고리를 '챙!' 튕긴다 — 뒤에서 끌어와 친다.
 *   화약통은 끌려오다 해적에 닿으면 펑(둘레까지), 아무것도 안 닿고 선장까지 오면 내 얼굴에서 펑.
 *   날아가는 해적은 부딪힌 해적을 또 쓰러뜨린다(연쇄). 한 번에 n번째로 쓰러뜨린 해적은 점수 ×n.
 *   던지고 끌고 감는 동안(약 0.7~1초)은 다시 못 던진다 — 하나씩 끌면 줄 지어 몰려오는 해적을 못 당한다.
 *   해적에게 맞으면 체력 -1, 체력 셋을 다 잃으면 하트 -1·그 판 다시. 하트 셋을 다 잃거나 7판을 마치면 끝.
 * 와우: 첫 톡에 갈고리가 뱃머리 술통을 낚아채고, 끌려오는 술통이 줄 선 해골 해적 둘을 '쾅' 쓰러뜨려 첨벙첨벙 바다로.
 * 판 7개(새것 하나씩 — 하는 일이 바뀐다): 1 술통(줄 뒤의 것을 끌기) → 2 대포(내가 날아가 쓸기·자리 옮기기) → 3 돛대(몰려들 때 빙글)
 *   → 4 화약통(무리 곁을 지나가게 끌기, 타이밍) → 5 방패 해적(앞은 튕김 → 뒤의 것을 끌어 등을 치기) → 6 상어(도는 상어가 줄 뒤에 올 때 낚기)
 *   → 7 해골 선장(무거워 세 번 들이받기 — 졸개와 함께).
 * 별 = ★ 배 지키기(판 깨기) · 2판부터 판마다 쉬운 한 줄이 하나씩 붙는다(한 번에 둘 · 돛대로 빙글 셋 · 한 번도 안 맞기 …).
 * 웃음: 날아가는 해골은 팔다리를 쫙 펴고 빙글빙글, 갑판에 떨어지면 뼈가 와르르, 바다엔 모자만 둥둥. 선장은 끌려갈 땐 '우와아~',
 *   빙글 돈 뒤엔 눈이 뱅글뱅글, 화약통이 얼굴에서 터지면 새까만 얼굴에 눈만 깜빡. 어깨의 앵무새가 큰 순간마다 '꽥! 스트라이크!'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const TAU = Math.PI * 2;
/** 평면(가로 폭 = 1) → 화면(가로 폭 단위): X = x, Y = PY0 + y·KY (3/4 시점으로 세로가 살짝 눌린다) */
const PY0 = 0.375, KY = 0.85;
/** 수평선 · 아래 띠 시작 (화면, 가로 폭 단위) */
const HZ = 0.3, GB = 1.3;
/** 갑판: 뱃머리(위)·고물(아래)·가장 넓은 반폭 */
const BOW = 0.03, STERN = 1.0, HWMAX = 0.37;

// ── 갈고리 ──
/** 사슬 길이 · 톡 자리에서 물건을 찾는 반경(화면) · 날아가는 속도 · 끌어오기(처음→최고, 가속) · 내가 끌려가기 · 빈 갈고리 돌아오기 */
const ROPE = 0.56, SNAP = 0.12, HOOK_V = 0.042, YANK_V0 = 0.014, YANK_V1 = 0.036, YANK_A = 0.0026, PULL_V0 = 0.012, PULL_V1 = 0.032, PULL_A = 0.0022, BACK_V = 0.05;
/** 돛대 한 바퀴 틱 · 도는 반지름 최대 · 끝나고 사슬 감는 틱 */
const SPIN_T = 44, SPIN_RMAX = 0.27, REEL_T = 40;
/** 쓰러진 해적이 날아가는 빠르기 · 솟는 빠르기 · 중력 */
const KV = 0.0125, VZ = 0.026, G = 0.0013;
const BLAST = 0.15, CAP_R = 0.042;
// ── 해적 ──
const ENTER_T = 44, WIND_T = 34, STUN_T = 46, HP = 3, INV = 80, SOOT_T = 80;
const RESULT_OK = 200, RESULT_FAIL = 170, CARD_T = 160;
const STAR_PTS = 300, WIN_PTS = 500;
/** 술통이 모자라면 이만큼마다 하나씩 굴러 들어온다 */
const SUPPLY_T = 330;

type K = 'skel' | 'shield' | 'boss' | 'barrel' | 'keg' | 'cannon' | 'mast' | 'shark';
const RAD: Record<K, number> = { skel: 0.034, shield: 0.037, boss: 0.058, barrel: 0.042, keg: 0.036, cannon: 0.05, mast: 0.035, shark: 0.05 };
/** 화면 위 키(가로 폭 단위) — 톡 자리 찾기·그리기 */
const VIS: Record<K, number> = { skel: 0.11, shield: 0.115, boss: 0.19, barrel: 0.075, keg: 0.065, cannon: 0.065, mast: 0.2, shark: 0.04 };
const PTS: Record<string, number> = { skel: 10, shield: 20, boss: 100 };
const SPD: Record<string, number> = { skel: 0.0012, shield: 0.00105, boss: 0.0007 };
const PIR = (k: K) => k === 'skel' || k === 'shield' || k === 'boss';
const HEAVY = (k: K) => k === 'cannon' || k === 'boss';
/** 몸 상태 */
const ENTER = 0, WALK = 1, WIND = 2, STUN = 3, HOOKED = 4, FLY = 5, GONE = 6, SIT = 7, SWIM = 8, DIVE = 9, LEAP = 10, DROP = 11;
/** 갈고리 상태 */
const H_IDLE = 0, H_OUT = 1, H_YANK = 2, H_PULL = 3, H_SPIN = 4, H_BACK = 5, H_REEL = 6;

type StarK = 'clear' | 'multi' | 'nohit' | 'spin' | 'boom' | 'shield' | 'shark' | 'boss';
interface Star { k: StarK; n: number; label: string }
type Thing = [K, number, number];
/** groups: [종류, 사다리 번호, 몇 명, (늦게 오는 틱)] — 같은 사다리로 줄줄이 올라와 줄을 선다 */
interface Wave { need: number; wait: number; init?: Thing[]; groups?: ([K, number, number] | [K, number, number, number])[]; drops?: Thing[] }
interface StageDef { key: string; name: string; spot: string; news: string; hint: string; start: [number, number]; spd: number; wind: number; things: Thing[]; waves: Wave[]; stars: Star[] }

/** 사다리 자리: [쪽(-1 왼쪽·1 오른쪽·0 뱃머리), y] */
const LAD: [number, number][] = [[-1, 0.3], [-1, 0.56], [-1, 0.8], [1, 0.3], [1, 0.56], [1, 0.8], [0, BOW]];
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
const CLEAR = S('clear', 0, '배 지키기');

export const STAGES: StageDef[] = [
  {
    key: 'barrel', name: '뱃머리', spot: '술통', news: '', hint: '해적 줄 뒤의 술통을 톡 — 끌려오며 다 쓰러뜨려요',
    start: [0.5, 0.72], spd: 0.75, wind: 1.7, things: [['barrel', 0.5, 0.15]],
    waves: [
      { need: 0, wait: 1e9, init: [['skel', 0.5, 0.33], ['skel', 0.5, 0.48]] },
      { need: 0, wait: 520, groups: [['skel', 1, 3]], drops: [['barrel', 0.2, 0.47]] },
      { need: 0, wait: 520, groups: [['skel', 4, 3]], drops: [['barrel', 0.8, 0.47]] },
      { need: 0, wait: 1e9, groups: [['skel', 0, 2], ['skel', 5, 2]], drops: [['barrel', 0.5, 0.2]] },
    ],
    stars: [CLEAR],
  },
  {
    key: 'cannon', name: '대포 갑판', spot: '대포 — 무거워서 내가 끌려가요', news: '대포 — 걸면 내가 날아가며 길을 쓸어요', hint: '대포를 톡 — 내가 날아가며 길 위의 해적을 쓸어요',
    start: [0.5, 0.74], spd: 0.85, wind: 1.4, things: [['cannon', 0.25, 0.44], ['cannon', 0.75, 0.44], ['barrel', 0.5, 0.18]],
    waves: [
      { need: 0, wait: 1e9, groups: [['skel', 0, 3]] },
      { need: 0, wait: 460, groups: [['skel', 3, 3]], drops: [['barrel', 0.82, 0.24]] },
      { need: 1, wait: 460, groups: [['skel', 1, 2], ['skel', 4, 2]] },
      { need: 0, wait: 1e9, groups: [['skel', 0, 3], ['skel', 5, 2]], drops: [['barrel', 0.24, 0.84]] },
    ],
    stars: [CLEAR, S('multi', 2, '한 번에 둘 쓰러뜨리기')],
  },
  {
    key: 'mast', name: '큰 돛대', spot: '돛대 — 걸면 한 바퀴 빙글!', news: '돛대 — 걸면 빙글 돌며 둘레를 쓸어요', hint: '해적이 몰려오면 돛대를 톡 — 빙글 돌며 쓸어요',
    start: [0.5, 0.74], spd: 1.15, wind: 0.9, things: [['mast', 0.5, 0.47], ['barrel', 0.22, 0.32], ['barrel', 0.78, 0.32]],
    waves: [
      { need: 0, wait: 1e9, groups: [['skel', 1, 3], ['skel', 4, 3]] },
      { need: 1, wait: 480, groups: [['skel', 2, 3], ['skel', 5, 3]] },
      { need: 1, wait: 480, groups: [['skel', 0, 4], ['skel', 4, 3]], drops: [['barrel', 0.2, 0.62]] },
      { need: 0, wait: 1e9, groups: [['skel', 1, 4], ['skel', 5, 4]] },
    ],
    stars: [CLEAR, S('spin', 4, '돛대로 빙글 넷'), S('nohit', 0, '한 번도 안 맞기')],
  },
  {
    key: 'keg', name: '화약 창고', spot: '화약통 — 해적에 닿으면 펑!', news: '화약통 — 끌려오다 해적에 닿으면 펑!', hint: '해적 무리 곁을 지나게 화약통을 톡 (빈 길이면 내 얼굴에서 펑)',
    start: [0.5, 0.74], spd: 1.3, wind: 0.8, things: [['keg', 0.28, 0.34], ['keg', 0.72, 0.34], ['barrel', 0.5, 0.18], ['cannon', 0.2, 0.66]],
    waves: [
      { need: 0, wait: 1e9, groups: [['skel', 0, 4], ['skel', 5, 2]] },
      { need: 1, wait: 480, groups: [['skel', 3, 4], ['skel', 4, 3], ['skel', 1, 2]], drops: [['keg', 0.76, 0.5]] },
      { need: 1, wait: 480, groups: [['skel', 1, 4], ['skel', 6, 3], ['skel', 5, 2]], drops: [['keg', 0.3, 0.2]] },
      { need: 0, wait: 1e9, groups: [['skel', 2, 4], ['skel', 5, 4], ['skel', 0, 3]], drops: [['keg', 0.5, 0.36], ['barrel', 0.8, 0.84]] },
    ],
    stars: [CLEAR, S('boom', 3, '화약통 하나로 셋'), S('nohit', 0, '한 번도 안 맞기')],
  },
  {
    key: 'shield', name: '방패 해적', spot: '방패 해적 — 앞에서 오는 갈고리는 챙!', news: '방패 해적 — 뒤의 것을 끌어 등을 쳐요', hint: '방패는 앞만 막아요 — 그 뒤의 해적·술통을 끌어와요',
    start: [0.5, 0.74], spd: 1.35, wind: 0.8, things: [['barrel', 0.24, 0.3], ['barrel', 0.76, 0.3], ['cannon', 0.2, 0.62], ['cannon', 0.8, 0.62], ['keg', 0.5, 0.2]],
    waves: [
      { need: 0, wait: 1e9, groups: [['shield', 0, 1], ['skel', 0, 3], ['skel', 4, 2]] },
      { need: 1, wait: 480, groups: [['shield', 3, 1], ['skel', 3, 3], ['shield', 5, 1], ['skel', 5, 2], ['skel', 1, 2]], drops: [['barrel', 0.84, 0.86]] },
      { need: 1, wait: 480, groups: [['shield', 1, 2], ['skel', 1, 2], ['skel', 4, 3], ['skel', 6, 2]] },
      { need: 0, wait: 1e9, groups: [['shield', 6, 2], ['skel', 6, 2], ['shield', 2, 1], ['skel', 2, 2], ['skel', 3, 3]], drops: [['barrel', 0.5, 0.12]] },
    ],
    stars: [CLEAR, S('shield', 2, '방패 해적 둘을 한 번에'), S('nohit', 0, '한 번도 안 맞기')],
  },
  {
    key: 'shark', name: '상어 바다', spot: '상어 — 낚으면 갑판을 냠냠!', news: '상어 — 배를 도는 상어를 낚으면 길 위를 냠냠', hint: '상어가 해적 줄 뒤로 올 때 톡 — 갑판을 가로지르며 냠냠',
    start: [0.5, 0.72], spd: 1.4, wind: 0.8, things: [['shark', 0, 0], ['barrel', 0.26, 0.26], ['mast', 0.5, 0.5], ['cannon', 0.78, 0.7]],
    waves: [
      { need: 0, wait: 1e9, groups: [['skel', 1, 3], ['skel', 3, 3], ['skel', 5, 2]] },
      { need: 1, wait: 480, groups: [['skel', 4, 4], ['shield', 0, 1], ['skel', 0, 2], ['skel', 6, 2]] },
      { need: 1, wait: 480, groups: [['skel', 2, 4], ['skel', 5, 3], ['skel', 0, 3]], drops: [['keg', 0.3, 0.7]] },
      { need: 0, wait: 1e9, groups: [['skel', 1, 4], ['skel', 4, 4], ['skel', 6, 3]] },
    ],
    stars: [CLEAR, S('shark', 3, '상어가 한 번에 셋 냠'), S('nohit', 0, '한 번도 안 맞기')],
  },
  {
    key: 'boss', name: '해골 선장', spot: '해골 선장 — 무거워요! 세 번 들이받기', news: '해골 선장 — 걸면 내가 날아가 들이받아요(세 번)', hint: '해골 선장 앞에 졸개가 줄 서면 톡 — 쓸고 들이받기!',
    start: [0.5, 0.76], spd: 1.4, wind: 0.8, things: [['cannon', 0.2, 0.5], ['cannon', 0.8, 0.5], ['keg', 0.34, 0.24], ['barrel', 0.66, 0.24]],
    waves: [
      { need: 1, wait: 600, groups: [['skel', 6, 3], ['boss', 6, 1, 110], ['skel', 1, 3], ['skel', 4, 2]] },
      { need: 2, wait: 520, groups: [['skel', 3, 4], ['shield', 4, 1], ['skel', 0, 3]], drops: [['keg', 0.7, 0.62]] },
      { need: 2, wait: 520, groups: [['skel', 0, 4], ['skel', 5, 3], ['skel', 2, 2]], drops: [['barrel', 0.3, 0.84]] },
      { need: 0, wait: 1e9, groups: [['skel', 2, 4], ['shield', 3, 1], ['skel', 3, 3], ['skel', 6, 2]] },
    ],
    stars: [CLEAR, S('boss', 2, '해골 선장 들이받으며 졸개 둘'), S('nohit', 0, '한 번도 안 맞기')],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Body {
  id: number; k: K; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  st: number; tm: number; fa: number; hp: number; spd: number; act: number; chain: number; ang: number;
  /** 사다리: 바다 쪽 출발점 · 난간 위 도착점 */
  ox: number; oy: number; rx: number; ry: number;
  // 연출 (시뮬레이션 결과와 무관)
  seed: number; hurtT: number; rot: number; vrot: number; born: number; tut: boolean;
}
interface Hook {
  st: number; x: number; y: number; sx: number; sy: number; tx: number; ty: number; id: number; t: number; d0: number;
  v: number; act: number; a0: number; R: number; mx: number; my: number; spun: number; bossSpun: boolean;
}
interface Rec { n: number; spin: number; boom: number; shark: number; shield: number; boss: boolean; bh: boolean; t: number; x: number; y: number }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string; k?: K; z?: number }
/** 연출 전용: 물보라 · 부서진 조각 */
interface Splash { x: number; y: number; t: number; big: number; hat: number }
interface Bit { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; vr: number; k: number; t: number; c: number }

export interface HookState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number; flip: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; again: boolean; tries: number;
  cx: number; cy: number; face: number; hp: number; inv: number; soot: number;
  hook: Hook; prevP: boolean; queued: { x: number; y: number } | null;
  bodies: Body[]; nid: number; queue: { t: number; k: K; lad: number }[]; wave: number; waveT: number;
  freeze: number; slowT: number; slowAcc: number;
  acts: number; recs: Record<number, Rec>; best: number; spinBest: number; boomBest: number; sharkBest: number; shieldBest: number; bossWith: number; hits: number; kos: number;
  firstThrow: boolean; firstPress: number; firstBig: number; presses: number; lastAct: number; readyT: number;
  seen: Set<string>; spotted: Set<string>; spot: { id: number; t: number; label: string } | null; events: Ev[];
  // 연출용 (시뮬레이션 결과와 무관)
  splashes: Splash[]; bits: Bit[]; mood: number; moodT: number; parrotT: number; parrotSay: string; dizzy: number; lastMulti: number;
}

const ev = (s: HookState, kind: string, x: number, y: number, n?: number, text?: string, k?: K, z?: number) => s.events.push({ t: s.t, kind, x, y, n, text, k, z });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wrapA = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

/** 갑판의 반폭 (뱃머리는 둥글게 뾰족, 고물은 살짝 좁다) */
export function hw(y: number) {
  if (y < BOW || y > STERN) return 0;
  if (y < 0.4) {
    const u = (y - BOW) / (0.4 - BOW);
    return HWMAX * Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)));
  }
  if (y > 0.86) {
    const u = (y - 0.86) / (STERN - 0.86);
    return HWMAX - 0.05 * u * u;
  }
  return HWMAX;
}
const onDeck = (x: number, y: number, m = 0) => y >= BOW + m && y <= STERN - m * 0.5 && Math.abs(x - 0.5) <= hw(y) - m;
const standing = (b: Body) => PIR(b.k) && (b.st === WALK || b.st === WIND || b.st === STUN || (b.st === ENTER && b.tm > ENTER_T * 0.55));
const livePir = (b: Body) => PIR(b.k) && b.st !== FLY && b.st !== GONE;
const hookable = (b: Body) =>
  (PIR(b.k) && (b.st === WALK || b.st === WIND || b.st === STUN || (b.st === ENTER && b.tm > ENTER_T * 0.55))) ||
  ((b.k === 'barrel' || b.k === 'keg' || b.k === 'cannon' || b.k === 'mast') && b.st === SIT) ||
  (b.k === 'shark' && b.st === SWIM);
const byId = (s: HookState, id: number) => s.bodies.find((b) => b.id === id);
/** 몸의 화면 가운데(가로 폭 단위) — 톡 자리 찾기 */
export const visCenter = (b: Body) => ({ x: b.x, y: PY0 + b.y * KY - VIS[b.k] * (b.k === 'mast' ? 0.35 : 0.5) });
/** 방패가 (fx,fy) 쪽에서 오는 것을 막는가 — 방패는 바라보는 쪽 ±70° */
const shieldBlocks = (b: Body, fx: number, fy: number) => b.k === 'shield' && b.st !== HOOKED && b.st !== FLY && Math.cos(Math.atan2(fy - b.y, fx - b.x) - b.fa) > 0.34;
const reachOf = (b: Body) => CAP_R + RAD[b.k] + 0.004;

function rec(s: HookState, act: number) {
  let r = s.recs[act];
  if (!r) {
    s.recs[act] = r = { n: 0, spin: 0, boom: 0, shark: 0, shield: 0, boss: false, bh: false, t: s.t, x: s.cx, y: s.cy };
    for (const k of Object.keys(s.recs)) if (+k < act - 8) delete s.recs[+k];
  }
  return r;
}

/** 해적 하나 쓰러짐(점수·별 기록) — how: yank·kick·pull·spin·boom·chain·chomp·head */
function countKO(s: HookState, q: Body, act: number, how: string) {
  const r = rec(s, act);
  const n = ++r.n;
  s.pts += (PTS[q.k] ?? 10) * n;
  s.kos++;
  s.best = Math.max(s.best, n);
  if (how === 'spin') s.spinBest = Math.max(s.spinBest, ++r.spin);
  if (how === 'boom') s.boomBest = Math.max(s.boomBest, ++r.boom);
  if (how === 'chomp') s.sharkBest = Math.max(s.sharkBest, ++r.shark);
  if (q.k === 'shield') s.shieldBest = Math.max(s.shieldBest, ++r.shield);
  if (q.k === 'boss') r.boss = true;
  if (r.bh) s.bossWith = Math.max(s.bossWith, r.n - (r.boss ? 1 : 0));
  r.x = q.x;
  r.y = q.y;
  if (how === 'chain') s.seen.add('chain');
  ev(s, 'ko', q.x, q.y, n, how, q.k, q.z);
  if (n === 2) s.freeze = Math.max(s.freeze, 3);
  if (n >= 3) {
    s.freeze = Math.max(s.freeze, n === 3 ? 4 : 2);
    s.slowT = Math.max(s.slowT, 34);
    if (s.firstBig < 0) s.firstBig = s.t;
  }
  if (n >= 2 && s.firstBig < 0 && s.stage === 0) s.firstBig = s.t;
  if (n >= 2) ev(s, 'multi', q.x, q.y, n, undefined, q.k);
}

/** 쓰러뜨리기: (dx,dy) 쪽으로 날아가 바다로 풍덩(갑판에 떨어지면 뼈가 와르르) */
function knock(s: HookState, q: Body, dx: number, dy: number, pw: number, act: number, how: string) {
  const L = Math.hypot(dx, dy) || 1;
  q.st = FLY;
  q.vx = (dx / L) * KV * pw;
  q.vy = (dy / L) * KV * pw;
  q.vz = VZ * (0.75 + 0.3 * Math.min(1.4, pw));
  q.z = Math.max(q.z, 0.002);
  q.act = act;
  q.chain = 0;
  q.tm = 0;
  q.vrot = (dx >= 0 ? 1 : -1) * (0.22 + 0.1 * pw);
  if (s.hook.id === q.id && s.hook.st === H_OUT) s.hook.id = 0;
  countKO(s, q, act, how);
}

function bossHit(s: HookState, q: Body, ux: number, uy: number, act: number, how: string) {
  q.hp--;
  q.hurtT = s.t;
  const r = rec(s, act);
  r.bh = true;
  s.bossWith = Math.max(s.bossWith, r.n);
  s.freeze = Math.max(s.freeze, 5);
  if (q.hp <= 0) {
    knock(s, q, ux, uy, 1.25, act, how);
    s.slowT = Math.max(s.slowT, 60);
    ev(s, 'bossko', q.x, q.y);
    return;
  }
  q.st = STUN;
  q.tm = 60;
  q.vx = ux * 0.012;
  q.vy = uy * 0.012;
  ev(s, 'bosshit', q.x, q.y, q.hp);
}

function explode(s: HookState, x: number, y: number, act: number, depth = 0) {
  ev(s, 'boom', x, y);
  s.freeze = Math.max(s.freeze, 5);
  s.slowT = Math.max(s.slowT, 24);
  s.seen.add('boomed');
  for (const q of s.bodies) {
    if (q.st === GONE || q.st === FLY) continue;
    const d = Math.hypot(q.x - x, q.y - y);
    if (PIR(q.k) && q.st !== HOOKED && d < BLAST + RAD[q.k]) {
      const ux = d > 1e-6 ? (q.x - x) / d : 0, uy = d > 1e-6 ? (q.y - y) / d : -1;
      if (q.k === 'boss') bossHit(s, q, ux, uy, act, 'boom');
      else knock(s, q, ux, uy, 1.15 - d * 1.5, act, 'boom');
    } else if (q.k === 'keg' && q.st === SIT && d < BLAST + RAD.keg && depth < 4) {
      q.st = GONE;
      explode(s, q.x, q.y, act, depth + 1);
    } else if (q.k === 'barrel' && q.st === SIT && d < BLAST * 0.8) {
      q.st = GONE;
      ev(s, 'shatter', q.x, q.y);
    }
  }
  if (Math.hypot(s.cx - x, s.cy - y) < BLAST * 0.85 + CAP_R) hurt(s, '화약통이 얼굴에서 펑!', true);
}

function hurt(s: HookState, why: string, soot = false) {
  if (s.phase !== 'play' || s.inv > 0) return;
  s.hp--;
  s.hits++;
  s.inv = INV;
  if (soot) s.soot = SOOT_T;
  ev(s, soot ? 'soot' : 'hurt', s.cx, s.cy);
  for (const q of s.bodies) {
    if (!PIR(q.k) || (q.st !== WALK && q.st !== WIND && q.st !== STUN)) continue;
    const dx = q.x - s.cx, dy = q.y - s.cy, d = Math.hypot(dx, dy) || 1e-6;
    if (d > 0.14) continue;
    q.st = STUN;
    q.tm = STUN_T;
    q.vx = (dx / d) * 0.006;
    q.vy = (dy / d) * 0.006;
  }
  if (s.hp <= 0) endStage(s, false, why);
}

/** 톡 자리(화면, 가로 폭 단위)에 있는 걸 것 — 손가락 반경 안의 가장 가까운 것, 없으면 그 방향 ±16°의 것 */
export function pickAt(s: HookState, px: number, py: number): Body | null {
  let best: Body | null = null, bd = SNAP;
  for (const b of s.bodies) {
    if (!hookable(b) || Math.hypot(b.x - s.cx, b.y - s.cy) > ROPE + RAD[b.k]) continue;
    const c = visCenter(b), d = Math.hypot(c.x - px, c.y - py);
    if (d < bd) (bd = d), (best = b);
  }
  if (!best) {
    const ty = (py - PY0) / KY, ta = Math.atan2(ty - s.cy, px - s.cx);
    let ba = 0.33;
    for (const b of s.bodies) {
      if (!hookable(b) || Math.hypot(b.x - s.cx, b.y - s.cy) > ROPE + RAD[b.k]) continue;
      const da = Math.abs(wrapA(Math.atan2(b.y - s.cy, b.x - s.cx) - ta));
      if (da < ba) (ba = da), (best = b);
    }
  }
  if (!best && s.stage < 2) {
    // 배우는 판(1·2판): 그래도 없으면 톡 자리에서 가장 가까운 것 (톡 하면 늘 뭔가 걸린다)
    const ty = (py - PY0) / KY;
    let bd2 = 1e9;
    for (const b of s.bodies) {
      if (!hookable(b) || Math.hypot(b.x - s.cx, b.y - s.cy) > ROPE + RAD[b.k]) continue;
      const d = Math.hypot(b.x - px, b.y - ty);
      if (d < bd2) (bd2 = d), (best = b);
    }
  }
  return best ? blockedBy(s, best) : null;
}

/** 돛대는 키가 커서, 선장 → 목표 사이에 돛대가 있으면 갈고리가 돛대에 감긴다 */
function blockedBy(s: HookState, b: Body): Body {
  if (b.k === 'mast') return b;
  const D = Math.hypot(b.x - s.cx, b.y - s.cy);
  for (const m of s.bodies) {
    if (m.k !== 'mast' || m.st !== SIT) continue;
    const dx = b.x - s.cx, dy = b.y - s.cy, u = ((m.x - s.cx) * dx + (m.y - s.cy) * dy) / (D * D || 1);
    if (u <= 0 || u >= 1) continue;
    const px = s.cx + dx * u, py = s.cy + dy * u;
    if (Math.hypot(m.x - px, m.y - py) < RAD.mast + 0.022 && D * u < D - 0.02) return m;
  }
  return b;
}

function throwHook(s: HookState, px: number, py: number) {
  let tgt = pickAt(s, px, py);
  // 처음 한 번: 뱃머리 술통으로 (첫 손짓에 큰 일)
  if (!s.firstThrow && s.stage === 0) {
    const tut = s.bodies.find((b) => b.k === 'barrel' && b.st === SIT && b.tut);
    if (tut) tgt = tut;
  }
  s.firstThrow = true;
  const h = s.hook;
  h.st = H_OUT;
  h.x = s.cx;
  h.y = s.cy;
  h.sx = s.cx;
  h.sy = s.cy;
  h.t = 0;
  h.act = ++s.acts;
  h.spun = 0;
  h.bossSpun = false;
  rec(s, h.act);
  if (tgt) {
    h.id = tgt.id;
    h.tx = tgt.x;
    h.ty = tgt.y;
  } else {
    h.id = 0;
    let tx = px, ty = (py - PY0) / KY;
    const d = Math.hypot(tx - s.cx, ty - s.cy);
    if (d > ROPE) (tx = s.cx + ((tx - s.cx) / d) * ROPE), (ty = s.cy + ((ty - s.cy) / d) * ROPE);
    h.tx = tx;
    h.ty = ty;
  }
  h.d0 = Math.max(0.05, Math.hypot(h.tx - s.cx, h.ty - s.cy));
  s.face = h.tx >= s.cx ? 1 : -1;
  s.lastAct = s.t;
  ev(s, 'throw', h.tx, h.ty, 0, undefined, tgt?.k);
}

function endHook(s: HookState) {
  s.hook.st = H_REEL;
  s.hook.t = REEL_T;
  s.hook.id = 0;
}

/** 갈고리가 닿았다 */
function latch(s: HookState) {
  const h = s.hook, b = h.id ? byId(s, h.id) : undefined;
  if (!b || !hookable(b)) {
    h.st = H_BACK;
    ev(s, 'miss', h.x, h.y, onDeck(h.x, h.y) ? 1 : 0);
    return;
  }
  if (b.k === 'shield' && shieldBlocks(b, s.cx, s.cy)) {
    h.st = H_BACK;
    b.hurtT = s.t;
    ev(s, 'clang', b.x, b.y);
    return;
  }
  ev(s, 'latch', b.x, b.y, 0, undefined, b.k);
  if (b.k === 'mast') {
    const d = Math.hypot(s.cx - b.x, s.cy - b.y);
    h.st = H_SPIN;
    h.t = 0;
    h.mx = b.x;
    h.my = b.y;
    h.R = clamp(d, RAD.mast + CAP_R + 0.02, SPIN_RMAX);
    h.a0 = Math.atan2(s.cy - b.y, s.cx - b.x);
    h.sx = s.cx;
    h.sy = s.cy;
    s.seen.add('spun');
    return;
  }
  if (HEAVY(b.k)) {
    h.st = H_PULL;
    h.v = PULL_V0;
    h.sx = s.cx;
    h.sy = s.cy;
    return;
  }
  b.st = HOOKED;
  b.z = 0;
  h.st = H_YANK;
  h.v = YANK_V0;
  h.sx = b.x;
  h.sy = b.y;
}

function hookStep(s: HookState) {
  const h = s.hook;
  if (h.st === H_OUT) {
    h.t++;
    const b = h.id ? byId(s, h.id) : undefined;
    if (b && hookable(b)) (h.tx = b.x), (h.ty = b.y);
    else if (h.id) h.id = 0;
    const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
    if (d <= HOOK_V) {
      h.x = h.tx;
      h.y = h.ty;
      latch(s);
    } else (h.x += (dx / d) * HOOK_V), (h.y += (dy / d) * HOOK_V);
    return;
  }
  if (h.st === H_BACK) {
    const dx = s.cx - h.x, dy = s.cy - h.y, d = Math.hypot(dx, dy);
    if (d <= BACK_V) endHook(s);
    else (h.x += (dx / d) * BACK_V), (h.y += (dy / d) * BACK_V);
    return;
  }
  if (h.st === H_REEL) {
    if (--h.t <= 0) (h.st = H_IDLE), (s.readyT = s.t);
    return;
  }
  if (h.st === H_YANK) return yankStep(s);
  if (h.st === H_PULL) return pullStep(s);
  if (h.st === H_SPIN) return spinStep(s);
}

/** 가벼운 것을 끌어온다: 길 위의 해적을 옆으로 날린다 */
function yankStep(s: HookState) {
  const h = s.hook, b = byId(s, h.id);
  if (!b || b.st !== HOOKED) return endHook(s);
  h.v = Math.min(YANK_V1, h.v + YANK_A);
  const dx = s.cx - b.x, dy = s.cy - b.y, d = Math.hypot(dx, dy), ux = dx / (d || 1), uy = dy / (d || 1);
  const stop = CAP_R + RAD[b.k] * 0.8;
  const mv = Math.min(h.v, Math.max(0, d - stop));
  b.x += ux * mv;
  b.y += uy * mv;
  h.x = b.x;
  h.y = b.y;
  b.fa = Math.atan2(-uy, -ux);
  const rr = RAD[b.k] + (b.k === 'shark' ? 0.008 : 0);
  for (const q of s.bodies) {
    if (q === b || !standing(q)) continue;
    if (Math.hypot(q.x - b.x, q.y - b.y) >= rr + RAD[q.k]) continue;
    if (b.k === 'keg') {
      b.st = GONE;
      explode(s, b.x, b.y, h.act);
      return endHook(s);
    }
    if (q.k === 'boss') {
      bossHit(s, q, ux, uy, h.act, 'yank');
      stopYanked(s, b, ux, uy);
      return endHook(s);
    }
    if (b.k === 'shark') {
      q.st = GONE;
      countKO(s, q, h.act, 'chomp');
      ev(s, 'chomp', q.x, q.y, rec(s, h.act).shark, undefined, q.k);
      continue;
    }
    // 옆으로 날린다 (길의 어느 쪽에 있었는지에 따라)
    const side = ux * (q.y - b.y) - uy * (q.x - b.x) >= 0 ? 1 : -1;
    knock(s, q, -uy * side + ux * 0.38, ux * side + uy * 0.38, 1, h.act, 'yank');
  }
  if (d - mv <= stop + 1e-6) arrive(s, b, ux, uy);
}

/** 끌려오던 것이 해골 선장 등에 막혔다 */
function stopYanked(s: HookState, b: Body, ux: number, uy: number) {
  if (PIR(b.k)) knock(s, b, -uy, ux, 0.9, s.hook.act, 'yank');
  else if (b.k === 'shark') leap(s, b, -ux, -uy);
  else (b.st = GONE), ev(s, 'shatter', b.x, b.y);
}

function leap(s: HookState, b: Body, ux: number, uy: number) {
  b.st = LEAP;
  b.hurtT = s.t;
  b.vx = ux * 0.02;
  b.vy = uy * 0.02;
  b.vz = 0.03;
  b.z = 0.002;
}

/** 끌려온 것이 선장에게 왔다 */
function arrive(s: HookState, b: Body, ux: number, uy: number) {
  const act = s.hook.act;
  if (b.k === 'barrel') (b.st = GONE), ev(s, 'shatter', b.x, b.y);
  else if (b.k === 'keg') (b.st = GONE), explode(s, b.x, b.y, act);
  else if (b.k === 'shark') leap(s, b, ux, uy), ev(s, 'sharkjump', b.x, b.y);
  else if (PIR(b.k)) {
    // 선장이 '뻥' 차서 뒤로 날려 보낸다
    knock(s, b, -ux, -uy, 1.25, act, 'kick');
    ev(s, 'kick', b.x, b.y);
  }
  endHook(s);
}

/** 무거운 것에 걸었다: 내가 끌려가며 길을 쓴다 */
function pullStep(s: HookState) {
  const h = s.hook, b = byId(s, h.id);
  if (!b || b.st === GONE || b.st === FLY) return endHook(s);
  h.v = Math.min(PULL_V1, h.v + PULL_A);
  const dx = b.x - s.cx, dy = b.y - s.cy, d = Math.hypot(dx, dy), ux = dx / (d || 1), uy = dy / (d || 1);
  const stop = CAP_R + RAD[b.k] + 0.004;
  const mv = Math.min(h.v, Math.max(0, d - stop));
  s.cx += ux * mv;
  s.cy += uy * mv;
  s.face = ux >= 0 ? 1 : -1;
  h.x = b.x;
  h.y = b.y;
  for (const q of s.bodies) {
    if (q === b || !standing(q)) continue;
    if (Math.hypot(q.x - s.cx, q.y - s.cy) >= CAP_R + RAD[q.k]) continue;
    if (shieldBlocks(q, s.cx, s.cy) || q.k === 'boss') {
      // 방패(앞)·해골 선장에 '쿵' 막혔다
      if (q.k === 'boss') bossHit(s, q, ux, uy, h.act, 'head');
      else (q.st = STUN), (q.tm = 30), (q.vx = ux * 0.006), (q.vy = uy * 0.006), ev(s, 'clang', q.x, q.y);
      s.cx -= ux * 0.01;
      s.cy -= uy * 0.01;
      ev(s, 'thud', s.cx, s.cy);
      return endHook(s);
    }
    const side = ux * (q.y - s.cy) - uy * (q.x - s.cx) >= 0 ? 1 : -1;
    knock(s, q, -uy * side + ux * 0.45, ux * side + uy * 0.45, 1.05, h.act, 'pull');
  }
  if (d - mv <= stop + 1e-6) {
    if (b.k === 'boss') bossHit(s, b, ux, uy, h.act, 'head'), ev(s, 'thud', s.cx, s.cy);
    else ev(s, 'clunk', b.x, b.y);
    endHook(s);
  }
}

/** 돛대에 감겼다: 한 바퀴 빙글 돌며 둘레를 쓴다 */
function spinStep(s: HookState) {
  const h = s.hook;
  h.t++;
  const a = h.a0 + (TAU * h.t) / SPIN_T * s.face;
  s.cx = h.mx + Math.cos(a) * h.R;
  s.cy = h.my + Math.sin(a) * h.R;
  h.x = h.mx;
  h.y = h.my;
  for (const q of s.bodies) {
    if (!standing(q)) continue;
    const dx = q.x - s.cx, dy = q.y - s.cy;
    if (Math.hypot(dx, dy) >= CAP_R + RAD[q.k] + 0.006) continue;
    const rx = q.x - h.mx, ry = q.y - h.my, rd = Math.hypot(rx, ry) || 1, tx = -Math.sin(a) * s.face, ty = Math.cos(a) * s.face;
    if (q.k === 'boss') {
      if (!h.bossSpun) (h.bossSpun = true), bossHit(s, q, rx / rd, ry / rd, h.act, 'spin');
      continue;
    }
    knock(s, q, rx / rd + tx * 0.7, ry / rd + ty * 0.7, 1.1, h.act, 'spin');
    h.spun++;
  }
  if (h.t >= SPIN_T) {
    s.cx = h.sx;
    s.cy = h.sy;
    s.dizzy = 60;
    ev(s, 'spinend', s.cx, s.cy, h.spun);
    endHook(s);
    h.t = REEL_T + 36; // 어질어질: 한 바퀴 돈 뒤엔 조금 더 쉬어야 한다
  }
}

function pirStep(s: HookState, q: Body) {
  const d0 = STAGES[s.stage];
  if (q.st === ENTER) {
    q.tm++;
    const u = Math.min(1, q.tm / ENTER_T);
    q.x = q.ox + (q.rx - q.ox) * u;
    q.y = q.oy + (q.ry - q.oy) * u;
    q.fa = Math.atan2(s.cy - q.y, s.cx - q.x);
    if (q.tm >= ENTER_T) (q.st = WALK), (q.tm = 0);
    return;
  }
  const dx = s.cx - q.x, dy = s.cy - q.y, d = Math.hypot(dx, dy) || 1e-6;
  const want = Math.atan2(dy, dx), turn = q.k === 'shield' ? 0.045 : 0.12;
  q.fa += clamp(wrapA(want - q.fa), -turn, turn);
  const reach = reachOf(q);
  if (q.st === STUN) {
    q.x += q.vx;
    q.y += q.vy;
    q.vx *= 0.85;
    q.vy *= 0.85;
    if (--q.tm <= 0) q.st = WALK;
    return;
  }
  if (q.st === WALK) {
    if (q.tut && !s.firstThrow && s.t < 600) return;
    if (d > reach) {
      const mv = Math.min(q.spd, d - reach);
      q.x += (dx / d) * mv;
      q.y += (dy / d) * mv;
    } else {
      q.st = WIND;
      q.tm = Math.round(WIND_T * d0.wind * (q.k === 'boss' ? 1.3 : 1));
      ev(s, 'wind', q.x, q.y, 0, undefined, q.k);
    }
    return;
  }
  if (q.st === WIND) {
    if (d > reach + 0.06) return void (q.st = WALK);
    if (--q.tm <= 0) {
      if (s.inv <= 0 && s.hook.st !== H_PULL && s.hook.st !== H_SPIN) hurt(s, q.k === 'boss' ? '해골 선장에게 맞았다' : '해골 해적에게 맞았다');
      if (q.st === WIND) (q.st = STUN), (q.tm = 30), (q.vx = (-dx / d) * 0.004), (q.vy = (-dy / d) * 0.004);
    }
  }
}

function keepOnDeck(q: Body) {
  const r = RAD[q.k];
  q.y = clamp(q.y, BOW + r + 0.03, STERN - r * 0.5);
  const lim = Math.max(0.02, hw(q.y) - r);
  if (Math.abs(q.x - 0.5) > lim) q.x = 0.5 + Math.sign(q.x - 0.5) * lim;
}

function flyStep(s: HookState, b: Body) {
  b.x += b.vx;
  b.y += b.vy;
  b.z += b.vz;
  b.vz -= G;
  b.rot += b.vrot;
  b.tm++;
  const boss = b.k === 'boss';
  if (b.st === FLY && b.tm < (boss ? 28 : 18) && b.chain < (boss ? 4 : 2)) {
    for (const q of s.bodies) {
      if (q === b || !standing(q)) continue;
      if (Math.hypot(q.x - b.x, q.y - b.y) >= RAD[b.k] + RAD[q.k]) continue;
      if (q.k === 'boss' || (!boss && shieldBlocks(q, b.x - b.vx * 4, b.y - b.vy * 4))) {
        b.vx *= -0.35;
        b.vy *= -0.35;
        b.chain = 9;
        ev(s, 'clang', q.x, q.y);
        break;
      }
      const v = Math.hypot(b.vx, b.vy) || 1e-6, rx = q.x - b.x, ry = q.y - b.y, rd = Math.hypot(rx, ry) || 1e-6;
      knock(s, q, rx / rd + (b.vx / v) * 0.8, ry / rd + (b.vy / v) * 0.8, 0.85, b.act, 'chain');
      if (!boss) (b.vx *= 0.7), (b.vy *= 0.7);
      b.chain++;
      ev(s, 'bonk', q.x, q.y);
      if (!boss) break;
    }
  }
  if (b.z <= 0) {
    b.z = 0;
    if (b.st === LEAP) {
      // 상어: 바다로 풍덩 → 잠깐 잠수했다가 다시 배를 돈다
      if (onDeck(b.x, b.y)) (b.vz = 0.022), (b.z = 0.001);
      else {
        b.st = DIVE;
        b.tm = 240;
        b.ang = Math.atan2((b.y - 0.52) / 0.56, (b.x - 0.5) / 0.47);
        ev(s, 'splash', b.x, b.y, 2);
      }
      return;
    }
    b.st = GONE;
    if (onDeck(b.x, b.y, -0.01)) ev(s, 'crumble', b.x, b.y, 0, undefined, b.k);
    else {
      const sh = s.bodies.find((q) => q.k === 'shark' && q.st === SWIM && Math.hypot(q.x - b.x, q.y - b.y) < 0.16);
      ev(s, sh ? 'gulp' : 'splash', b.x, b.y, b.k === 'boss' ? 2 : 1, undefined, b.k);
      if (sh) (s.pts += 5), (sh.hurtT = s.t);
    }
  }
}

function sharkStep(s: HookState, b: Body) {
  if (b.st === DIVE) {
    if (--b.tm <= 0) (b.st = SWIM), ev(s, 'sharkup', b.x, b.y);
    b.ang += 0.004;
    b.x = 0.5 + Math.cos(b.ang) * 0.47;
    b.y = 0.52 + Math.sin(b.ang) * 0.56;
    return;
  }
  if (b.st !== SWIM) return;
  b.ang += 0.007;
  b.x = 0.5 + Math.cos(b.ang) * 0.47;
  b.y = 0.52 + Math.sin(b.ang) * 0.56;
  b.fa = b.ang + Math.PI / 2;
}

function sep(s: HookState) {
  const ps = s.bodies.filter((b) => PIR(b.k) && (b.st === WALK || b.st === WIND || b.st === STUN));
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = (RAD[a.k] + RAD[b.k]) * 0.92;
      if (d >= m || d < 1e-6) continue;
      const push = (m - d) / 2, ux = dx / d, uy = dy / d, wa = a.k === 'boss' ? 0.2 : 1, wb = b.k === 'boss' ? 0.2 : 1;
      a.x -= ux * push * wa;
      a.y -= uy * push * wa;
      b.x += ux * push * wb;
      b.y += uy * push * wb;
    }
  for (const q of ps) {
    // 선장 몸은 밀고 지나가지 못한다
    const dx = q.x - s.cx, dy = q.y - s.cy, d = Math.hypot(dx, dy), m = CAP_R + RAD[q.k];
    if (d < m && d > 1e-6 && s.hook.st !== H_PULL && s.hook.st !== H_SPIN) (q.x = s.cx + (dx / d) * m), (q.y = s.cy + (dy / d) * m);
    keepOnDeck(q);
  }
}

function mkBody(s: HookState, k: K, x: number, y: number): Body {
  return {
    id: ++s.nid, k, x, y, z: 0, vx: 0, vy: 0, vz: 0, st: SIT, tm: 0, fa: Math.atan2(s.cy - y, s.cx - x), hp: k === 'boss' ? 3 : 1,
    spd: (SPD[k] ?? 0) * STAGES[s.stage].spd, act: 0, chain: 0, ang: 0, ox: x, oy: y, rx: x, ry: y,
    seed: Math.floor(s.rng() * 1e6), hurtT: -99, rot: 0, vrot: 0, born: s.t, tut: false,
  };
}

function spawnPirate(s: HookState, k: K, lad: number) {
  const [sd0, y] = LAD[lad], sd = s.flip ? -sd0 : sd0, jy = sd === 0 ? 0 : (s.rng() - 0.5) * 0.03;
  const b = mkBody(s, k, 0, 0);
  if (sd === 0) (b.rx = 0.5 + (s.rng() - 0.5) * 0.03), (b.ry = BOW + 0.06), (b.ox = b.rx), (b.oy = BOW - 0.07);
  else {
    const yy = y + jy, h = hw(yy);
    b.rx = 0.5 + sd * (h - 0.035);
    b.ry = yy;
    b.ox = 0.5 + sd * (h + 0.07);
    b.oy = yy;
  }
  b.x = b.ox;
  b.y = b.oy;
  b.st = ENTER;
  b.tm = 0;
  s.bodies.push(b);
  if (!s.spotted.has(k) && k !== 'skel') {
    s.spotted.add(k);
    s.spot = { id: b.id, t: s.t, label: STAGES[s.stage].spot };
  }
  ev(s, 'climb', b.rx, b.ry, 0, undefined, k);
}

function spawnWave(s: HookState) {
  const d = STAGES[s.stage], w = d.waves[s.wave], F = (x: number) => (s.flip ? 1 - x : x);
  for (const [k, x, y] of w.init ?? []) {
    const b = mkBody(s, k, F(x), y);
    b.st = WALK;
    b.tut = s.stage === 0 && s.wave === 0;
    s.bodies.push(b);
  }
  for (const [k, lad, n, late] of w.groups ?? []) for (let i = 0; i < n; i++) s.queue.push({ t: s.t + 1 + (late ?? 0) + i * 34, k, lad });
  for (const [k, x, y] of w.drops ?? []) {
    const b = mkBody(s, k, F(x), y);
    b.st = DROP;
    b.z = 0.32;
    s.bodies.push(b);
  }
  s.queue.sort((a, b) => a.t - b.t);
  s.wave++;
  s.waveT = 0;
  if (s.wave > 1) ev(s, 'wave', 0.5, 0.5, s.wave);
}

function newStage(s: HookState) {
  const d = STAGES[s.stage];
  s.flip = s.stage > 0 && s.rng() < 0.5;
  const F = (x: number) => (s.flip ? 1 - x : x);
  s.cx = d.start[0];
  s.cy = d.start[1];
  s.face = 1;
  s.hp = HP;
  s.inv = 40;
  s.soot = 0;
  s.hook = { st: H_IDLE, x: s.cx, y: s.cy, sx: s.cx, sy: s.cy, tx: s.cx, ty: s.cy, id: 0, t: 0, d0: 0, v: 0, act: 0, a0: 0, R: 0, mx: 0, my: 0, spun: 0, bossSpun: false };
  s.queued = null;
  s.bodies = [];
  s.queue = [];
  for (const [k, x, y] of d.things) {
    const b = mkBody(s, k, F(x), y);
    if (k === 'shark') {
      b.st = SWIM;
      b.ang = s.flip ? Math.PI * 1.15 : -Math.PI * 0.15;
      sharkStep(s, b);
    }
    b.tut = s.stage === 0 && k === 'barrel';
    s.bodies.push(b);
  }
  s.wave = 0;
  s.waveT = 0;
  s.freeze = 0;
  s.slowT = 0;
  s.slowAcc = 0;
  s.recs = {};
  s.best = s.spinBest = s.boomBest = s.sharkBest = s.shieldBest = s.bossWith = s.hits = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.lastAct = s.t;
  s.readyT = s.t;
  s.seen.add(d.key);
  const sp = d.things.find(([k]) => k !== 'barrel' && !s.spotted.has(k));
  if (sp && s.stage > 0) {
    s.spotted.add(sp[0]);
    const b = s.bodies.find((q) => q.k === sp[0]);
    if (b) s.spot = { id: b.id, t: s.t + 40, label: d.spot };
  }
  spawnWave(s);
}

function starMet(s: HookState, st: Star) {
  switch (st.k) {
    case 'clear': return s.phase === 'result' ? s.ok : false;
    case 'multi': return s.best >= st.n;
    case 'nohit': return s.hits === 0;
    case 'spin': return s.spinBest >= st.n;
    case 'boom': return s.boomBest >= st.n;
    case 'shield': return s.shieldBest >= st.n;
    case 'shark': return s.sharkBest >= st.n;
    case 'boss': return s.bossWith >= st.n;
  }
}
export function starNow(s: HookState, st: Star): number {
  return st.k === 'multi' ? s.best : st.k === 'spin' ? s.spinBest : st.k === 'boom' ? s.boomBest : st.k === 'shield' ? s.shieldBest : st.k === 'shark' ? s.sharkBest : st.k === 'boss' ? s.bossWith : -1;
}

function endStage(s: HookState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.queued = null;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((q) => q.k === 'clear' || starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 2;
    s.moodT = 999;
    ev(s, 'clear', 0.5, 0.6);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'fail', s.cx, s.cy, 0, why);
  }
}

/** 술통이 모자라면 하나 굴러 들어온다 — 방패 해적이 있으면 그 등 뒤로(앞만 막는 방패를 칠 거리) */
function supply(s: HookState) {
  if ((s.t - s.readyT) % 1 !== 0 || s.waveT % SUPPLY_T !== SUPPLY_T - 1) return;
  if (s.bodies.filter((b) => (b.k === 'barrel' || b.k === 'keg') && (b.st === SIT || b.st === DROP)).length >= 2) return;
  let x = 0, y = 0;
  const sh = s.bodies.find((b) => b.k === 'shield' && (b.st === WALK || b.st === WIND));
  if (sh) {
    const dx = sh.x - s.cx, dy = sh.y - s.cy, d = Math.hypot(dx, dy) || 1;
    (x = sh.x + (dx / d) * 0.14), (y = sh.y + (dy / d) * 0.14);
  } else {
    const a = s.rng() * TAU, r = 0.28 + s.rng() * 0.12;
    (x = s.cx + Math.cos(a) * r), (y = s.cy + Math.sin(a) * r);
  }
  y = clamp(y, BOW + 0.12, STERN - 0.06);
  const lim = hw(y) - 0.05;
  x = clamp(x, 0.5 - lim, 0.5 + lim);
  const b = mkBody(s, 'barrel', x, y);
  b.st = DROP;
  b.z = 0.32;
  s.bodies.push(b);
}

function world(s: HookState) {
  const d = STAGES[s.stage];
  s.waveT++;
  for (let i = 0; i < s.queue.length; i++)
    if (s.queue[i].t <= s.t) {
      const q = s.queue.splice(i--, 1)[0];
      spawnPirate(s, q.k, q.lad);
    }
  hookStep(s);
  for (const b of s.bodies) {
    if (b.st === GONE) continue;
    if (PIR(b.k) && (b.st === ENTER || b.st === WALK || b.st === WIND || b.st === STUN)) pirStep(s, b);
    else if (b.st === FLY || b.st === LEAP) flyStep(s, b);
    else if (b.k === 'shark') sharkStep(s, b);
    else if (b.st === DROP) {
      b.vz -= G * 1.4;
      b.z += b.vz;
      if (b.z <= 0) (b.z = 0), (b.st = SIT), ev(s, 'drop', b.x, b.y, 0, undefined, b.k);
    }
    if (s.phase !== 'play') return;
  }
  sep(s);
  s.bodies = s.bodies.filter((b) => b.st !== GONE);
  supply(s);
  if (s.inv > 0) s.inv--;
  if (s.soot > 0) s.soot--;
  // 다음 물결 · 판 끝
  const live = s.bodies.filter(livePir).length, flying = s.bodies.some((b) => PIR(b.k) && b.st === FLY);
  if (s.wave < d.waves.length) {
    if (!s.queue.length && (live <= d.waves[s.wave - 1].need || s.waveT >= d.waves[s.wave - 1].wait)) spawnWave(s);
  } else if (!s.queue.length && live === 0 && !flying && s.hook.st !== H_YANK && s.hook.st !== H_PULL && s.hook.st !== H_SPIN) endStage(s, true, '');
}

function cosmetic(s: HookState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  if (s.dizzy > 0) s.dizzy--;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  if (s.spot && s.t - s.spot.t > 120) s.spot = null;
  s.splashes = s.splashes.filter((q) => s.t - q.t < 70);
  for (const b of s.bits) {
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    b.vz -= 0.0016;
    b.r += b.vr;
    if (b.z < 0) {
      b.z = 0;
      b.vz = Math.abs(b.vz) * 0.35 < 0.002 ? 0 : Math.abs(b.vz) * 0.35;
      b.vx *= 0.6;
      b.vy *= 0.6;
      b.vr *= 0.6;
    }
  }
  s.bits = s.bits.filter((b) => s.t - b.t < 110);
  if (s.bits.length > 90) s.bits.splice(0, s.bits.length - 90);
}

export const hookpirate: GameDef<HookState> = {
  id: 'hookpirate',
  name: '갈고리 해적 낚아채기',
  genes: ['hookyank', 'pointer', 'chain'],
  twist: '공격 버튼이 따로 없다 — 갈고리로 무엇을 거느냐(가벼우면 끌려오고, 무거우면 내가 끌려가고, 돛대면 빙글)와 그것이 어느 길로 지나가느냐가 곧 공격이라, 해적이 줄 서는 순간 그 뒤의 것을 낚아채는 게 수다',
  rules: [
    '톡 한 곳의 것에 갈고리를 걸어 확 끌어와요. 끌려오는 길 위의 해적은 모두 쓰러져요.',
    '대포·해골 선장은 무거워 내가 끌려가며 길을 쓸고, 돛대에 걸면 한 바퀴 빙글!',
    '맞으면 체력 -1, 다 잃으면 하트 -1(그 판 다시). 해적을 모두 쓰러뜨리면 다음 판!',
  ],
  controls: 'touch',
  hint: '톡 하면 갈고리가 날아가 걸린 것을 확 끌어와요 / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '노을 바다 해적선 갑판 — 꼬마 선장과 통통 해골 해적',
    mood: '주황·분홍 노을 아래 먼 섬과 유령선이 비치고, 반짝이는 파도 위 나무 갑판이 살랑 흔들린다. 갈고리가 사슬을 철렁 끌며 날아가 술통을 낚아채면, 끌려오는 술통에 해골 해적들이 볼링 핀처럼 쾅 날아가 첨벙첨벙 물보라.',
    palette: { bg: '#2a1838', ink: '#fff4e0', muted: '#c9a7b8', accent: '#ffc24a', hot: '#ff5a3c', soft: '#4a2a4c' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, flip: false,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, again: false, tries: 0,
      cx: 0.5, cy: 0.72, face: 1, hp: HP, inv: 0, soot: 0, hook: null as unknown as Hook, prevP: false, queued: null,
      bodies: [], nid: 0, queue: [], wave: 0, waveT: 0, freeze: 0, slowT: 0, slowAcc: 0,
      acts: 0, recs: {}, best: 0, spinBest: 0, boomBest: 0, sharkBest: 0, shieldBest: 0, bossWith: 0, hits: 0, kos: 0,
      firstThrow: false, firstPress: -1, firstBig: -1, presses: 0, lastAct: 0, readyT: 0,
      seen: new Set<string>(), spotted: new Set<string>(), spot: null, events: [],
      splashes: [], bits: [], mood: 0, moodT: 0, parrotT: -99, parrotSay: '', dizzy: 0, lastMulti: -99,
    } as HookState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    const tap = !!p && !s.prevP;
    s.prevP = !!p;
    if (tap) {
      s.presses++;
      if (s.firstPress < 0) s.firstPress = s.t;
    }
    if (s.phase === 'result') {
      s.pt++;
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
    if (tap && p) s.queued = { x: p.x, y: p.y * A };
    if (s.queued && s.hook.st === H_IDLE && s.soot <= 0) {
      throwHook(s, s.queued.x, s.queued.y);
      s.queued = null;
    }
    let steps = 1;
    if (s.freeze > 0) (s.freeze--, (steps = 0));
    else if (s.slowT > 0) {
      s.slowT--;
      s.slowAcc += 0.4;
      steps = s.slowAcc >= 1 ? 1 : 0;
      if (steps) s.slowAcc -= 1;
    }
    for (let k = 0; k < steps && s.phase === 'play'; k++) world(s);
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
const tapAt = (b: Body): Input => {
  const c = visCenter(b);
  return { tap: false, dir: 0, pointer: { x: c.x, y: c.y / A } };
};

interface Plan { b: Body; tgt: Body; mode: number; n: number; boom: number; shark: number; shield: number; spin: number; bossD: number; bossKO: boolean; self: number; ex: number; ey: number; T: number; hit: Set<number> }

/** 해적이 T틱 뒤 어디쯤 있을까 (선장 쪽으로 걸어온다) */
function predPos(s: HookState, q: Body, T: number) {
  let x = q.x, y = q.y;
  if (q.st === ENTER) {
    const left = ENTER_T - q.tm;
    if (left > T) return q.tm > ENTER_T * 0.55 ? { x, y } : null;
    T -= left;
    x = q.rx;
    y = q.ry;
  } else if (q.st === STUN) T = Math.max(0, T - q.tm);
  else if (q.st === WIND) T = 0;
  const dx = s.cx - x, dy = s.cy - y, d = Math.hypot(dx, dy) || 1e-6, mv = Math.min(q.spd * T, Math.max(0, d - reachOf(q)));
  return { x: x + (dx / d) * mv, y: y + (dy / d) * mv };
}

/** 이 걸 것에 갈고리를 걸면 무슨 일이 생길까 (시뮬레이션과 같은 기하로 어림) */
function plan(s: HookState, b0: Body): Plan {
  const b = blockedBy(s, b0), D = Math.hypot(b.x - s.cx, b.y - s.cy) || 1e-6, tOut = D / HOOK_V;
  const P: Plan = { b: b0, tgt: b, mode: 0, n: 0, boom: 0, shark: 0, shield: 0, spin: 0, bossD: 0, bossKO: false, self: 0, ex: s.cx, ey: s.cy, T: tOut * 2 + REEL_T, hit: new Set() };
  if (b.k === 'shield' && shieldBlocks(b, s.cx, s.cy)) return P;
  const tMid = tOut + (b.k === 'mast' ? SPIN_T / 2 : D / (YANK_V1 * 1.6));
  const ps: { q: Body; x: number; y: number }[] = [];
  for (const q of s.bodies)
    if (q !== b && PIR(q.k) && (q.st === ENTER || q.st === WALK || q.st === WIND || q.st === STUN)) {
      const p = predPos(s, q, tMid);
      if (p) ps.push({ q, x: p.x, y: p.y });
    }
  const add = (q: Body, how: string) => {
    if (P.hit.has(q.id)) return;
    P.hit.add(q.id);
    P.n++;
    if (q.k === 'shield') P.shield++;
    if (how === 'spin') P.spin++;
    if (how === 'boom') P.boom++;
    if (how === 'chomp') P.shark++;
  };
  const blast = (x: number, y: number) => {
    for (const p of ps)
      if (Math.hypot(p.x - x, p.y - y) < BLAST + RAD[p.q.k]) {
        if (p.q.k === 'boss') (P.bossD += 1), (P.bossKO = P.bossKO || p.q.hp <= 1), P.bossKO && add(p.q, 'boom');
        else add(p.q, 'boom');
      }
  };
  if (b.k === 'mast') {
    // 도는 동안 선장 자리를 따라가며, 그때의 해적 자리와 맞대 본다
    P.mode = 3;
    const R = clamp(D, RAD.mast + CAP_R + 0.02, SPIN_RMAX), dir = b.x >= s.cx ? 1 : -1, a0 = Math.atan2(s.cy - b.y, s.cx - b.x);
    const qs = s.bodies.filter((q) => q !== b && PIR(q.k) && (q.st === ENTER || q.st === WALK || q.st === WIND || q.st === STUN));
    for (let k = 1; k <= SPIN_T; k += 2) {
      const a = a0 + ((TAU * k) / SPIN_T) * dir, px = b.x + Math.cos(a) * R, py = b.y + Math.sin(a) * R;
      for (const q of qs) {
        if (P.hit.has(q.id) || (q.k === 'boss' && P.bossD)) continue;
        const p = predPos(s, q, tOut + k);
        if (!p || Math.hypot(p.x - px, p.y - py) >= CAP_R + RAD[q.k] + 0.006) continue;
        if (q.k === 'boss') (P.bossD = 1), (P.bossKO = q.hp <= 1), P.bossKO && add(q, 'spin');
        else add(q, 'spin');
      }
    }
    P.T = tOut + SPIN_T + REEL_T + 36;
    return P;
  }
  if (HEAVY(b.k)) {
    P.mode = 2;
    const ux = (b.x - s.cx) / D, uy = (b.y - s.cy) / D, L = D - CAP_R - RAD[b.k] - 0.004;
    const cs = ps
      .map((p) => ({ p, u: (p.x - s.cx) * ux + (p.y - s.cy) * uy, perp: Math.abs((p.x - s.cx) * uy - (p.y - s.cy) * ux) }))
      .filter((c) => c.u > -0.01 && c.u < L + RAD[c.p.q.k] && c.perp < CAP_R + RAD[c.p.q.k])
      .sort((a, c) => a.u - c.u);
    let end = L, blocked = false;
    for (const c of cs) {
      if (c.p.q.k === 'boss' || shieldBlocks(c.p.q, s.cx, s.cy)) {
        end = Math.max(0, c.u - CAP_R - RAD[c.p.q.k]);
        blocked = true;
        if (c.p.q.k === 'boss') (P.bossD = 1), (P.bossKO = c.p.q.hp <= 1), P.bossKO && add(c.p.q, 'head');
        break;
      }
      add(c.p.q, 'pull');
    }
    if (!blocked && b.k === 'boss') {
      (P.bossD = 1), (P.bossKO = b.hp <= 1);
      if (P.bossKO) {
        add(b, 'head');
        // 날아가는 해골 선장이 뒤의 졸개를 쓰러뜨린다
        for (const p of ps) {
          const u = (p.x - b.x) * ux + (p.y - b.y) * uy, perp = Math.abs((p.x - b.x) * uy - (p.y - b.y) * ux);
          if (u > 0 && u < KV * 1.25 * 28 && perp < RAD.boss + RAD[p.q.k]) add(p.q, 'chain');
        }
      }
    }
    P.ex = s.cx + ux * end;
    P.ey = s.cy + uy * end;
    P.T = tOut + end / ((PULL_V0 + PULL_V1) / 2) + REEL_T;
    return P;
  }
  P.mode = 1;
  const ux = (s.cx - b.x) / D, uy = (s.cy - b.y) / D, L = D - CAP_R - RAD[b.k] * 0.8, rr = RAD[b.k] + (b.k === 'shark' ? 0.008 : 0);
  type C = { q: Body; x: number; y: number; u: number };
  const cs: C[] = [];
  for (const p of ps) {
    const u = (p.x - b.x) * ux + (p.y - b.y) * uy, perp = Math.abs((p.x - b.x) * uy - (p.y - b.y) * ux);
    if (u > -rr && u < L + 0.02 && perp < rr + RAD[p.q.k]) cs.push({ q: p.q, x: p.x, y: p.y, u });
  }
  cs.sort((a, c) => a.u - c.u);
  let stopped = false;
  for (const c of cs) {
    if (b.k === 'keg') {
      const bx = b.x + ux * Math.max(0, c.u - rr), by = b.y + uy * Math.max(0, c.u - rr);
      blast(bx, by);
      if (Math.hypot(s.cx - bx, s.cy - by) < BLAST * 0.85 + CAP_R) P.self = 1;
      stopped = true;
      break;
    }
    if (c.q.k === 'boss') {
      P.bossD = 1;
      P.bossKO = c.q.hp <= 1;
      if (P.bossKO) add(c.q, 'yank');
      if (PIR(b.k)) add(b, 'yank');
      stopped = true;
      break;
    }
    add(c.q, b.k === 'shark' ? 'chomp' : 'yank');
  }
  if (!stopped) {
    if (b.k === 'keg') {
      blast(s.cx, s.cy);
      P.self = 1;
    } else if (PIR(b.k)) add(b, 'kick');
  }
  P.T = tOut + L / ((YANK_V0 + YANK_V1) / 2) + REEL_T;
  return P;
}

/** (x,y)에 서 있으면 몇 틱 뒤에 맞을까 (skip = 이번에 쓰러질 해적) */
function threat(s: HookState, x: number, y: number, skip: Set<number>) {
  const wm = STAGES[s.stage].wind;
  let T = 9999;
  for (const q of s.bodies) {
    if (!livePir(q) || q.st === HOOKED || skip.has(q.id)) continue;
    let t = 0, qx = q.x, qy = q.y;
    if (q.st === ENTER) (t += ENTER_T - q.tm), (qx = q.rx), (qy = q.ry);
    if (q.st === STUN) t += q.tm;
    const d = Math.hypot(qx - x, qy - y), reach = reachOf(q);
    if (q.st === WIND && d < reach + 0.06) t = q.tm;
    else t += Math.max(0, d - reach) / Math.max(1e-5, q.spd) + WIND_T * wm * (q.k === 'boss' ? 1.3 : 1);
    T = Math.min(T, t);
  }
  return T;
}

const metric = (st: Star, P: Plan) =>
  st.k === 'multi' ? P.n : st.k === 'spin' ? P.spin : st.k === 'boom' ? P.boom : st.k === 'shield' ? P.shield : st.k === 'shark' ? P.shark : st.k === 'boss' ? (P.bossD ? P.n - (P.bossKO ? 1 : 0) : -1) : -1;
function value(s: HookState, P: Plan) {
  const d = STAGES[s.stage];
  let v = 0;
  for (let i = 1; i <= P.n; i++) v += 10 * i;
  v += P.shield * 10 + P.bossD * 70 + (P.bossKO ? 300 : 0) - P.self * 2500;
  for (const st of d.stars) {
    if (st.k === 'clear' || st.k === 'nohit' || starMet(s, st)) continue;
    if (metric(st, P) >= st.n) v += 600;
  }
  const after = threat(s, P.ex, P.ey, P.hit), nohit = d.stars.some((q) => q.k === 'nohit') && s.hits === 0;
  if (after < P.T + 6) v -= nohit ? 1200 : 500;
  else if (after < P.T + 40) v -= 120;
  return v;
}

/** 봇: 걸 수 있는 것을 모두 어림해 보고(쓰러뜨릴 수·별·끝난 뒤의 위험), 안전하면 줄이 설 때까지 기다렸다가 한 번에 낚는다 */
export const hookpirateSmart: Bot<HookState> = {
  name: '줄 뒤의 것을 낚기',
  act(s) {
    if (s.phase !== 'play' || s.hook.st !== H_IDLE || s.soot > 0 || s.queued || s.prevP) return NO;
    const live = s.bodies.filter((q) => livePir(q) && q.st !== HOOKED);
    if (!live.length) return NO;
    const here = threat(s, s.cx, s.cy, new Set());
    const d = STAGES[s.stage], waited = s.t - s.readyT;
    const goals = d.stars.filter((st) => st.k !== 'clear' && st.k !== 'nohit' && !starMet(s, st));
    let best: Plan | null = null, bv = -1e9, star: Plan | null = null;
    for (const b of s.bodies) {
      if (!hookable(b) || Math.hypot(b.x - s.cx, b.y - s.cy) > ROPE + RAD[b.k]) continue;
      const P = plan(s, b);
      if (P.mode === 0) continue;
      const v = value(s, P);
      if (v > bv) (bv = v), (best = P);
      if (goals.some((st) => metric(st, P) >= st.n) && !P.self && (!star || P.n > star.n)) star = P;
    }
    if (!best) return NO;
    if (star && threat(s, star.ex, star.ey, star.hit) > star.T - 10) return tapAt(star.b);
    if (best.self && bv < 0) return NO;
    // 돛대 별: 해적이 다 몰려올 때까지 기다렸다가 마지막 순간에 빙글 (도는 동안은 안 맞는다)
    const mast = s.bodies.find((b) => b.k === 'mast' && b.st === SIT);
    if (mast && goals.some((st) => st.k === 'spin') && Math.hypot(mast.x - s.cx, mast.y - s.cy) <= ROPE) {
      const sp = plan(s, mast);
      if (here > sp.T * 0.5 + 14 && live.length + s.queue.length >= 4) return NO;
      if (sp.spin >= 2) return tapAt(mast);
    }
    if (here < best.T + 40) return tapAt(best.b);
    // 상어가 곧 해적 줄 뒤로 온다면 그때까지 기다린다
    const shk = s.bodies.find((b) => b.k === 'shark' && b.st === SWIM);
    if (shk && goals.some((st) => st.k === 'shark')) {
      for (let k = 6; k <= 72; k += 6) {
        const a = shk.ang + 0.007 * k, fx = 0.5 + Math.cos(a) * 0.47, fy = 0.52 + Math.sin(a) * 0.56;
        if (Math.hypot(fx - s.cx, fy - s.cy) > ROPE) continue;
        const P = plan(s, { ...shk, x: fx, y: fy });
        if (P.shark >= 3 && here > k + P.T + 60) return NO;
      }
    }
    const pool = live.length + s.queue.length;
    const want = Math.min(pool, s.stage === 0 ? 2 : 3);
    // 아직 못 딴 별이 있고 해적이 넉넉하면, 줄이 설 때까지 더 기다린다
    if (goals.length && goals.some((st) => pool >= st.n) && waited < 420 && best.n < Math.max(4, want) && here > best.T + 90) return NO;
    if (best.n >= want) return tapAt(best.b);
    if (waited > 150 && best.n >= 2) return tapAt(best.b);
    if (waited > 300 && best.n >= 1) return tapAt(best.b);
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 아무 데나 톡 */
export const hookpirateRandom: Bot<HookState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0.5, y: 0.5 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    m.x = rng();
    m.y = rng();
    m.hold = 2 + Math.floor(rng() * 10);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

/** 버릇 봇: 갈고리가 돌아오면 늘 가장 가까운 해적을 끈다 */
export const hookpirateHabit: Bot<HookState> = {
  name: '늘 가장 가까운 해적을 끌기',
  act(s) {
    if (s.phase !== 'play' || s.hook.st !== H_IDLE || s.soot > 0 || s.queued || s.prevP) return NO;
    let best: Body | null = null, bd = 1e9;
    for (const q of s.bodies) {
      if (!PIR(q.k) || !hookable(q)) continue;
      const d = Math.hypot(q.x - s.cx, q.y - s.cy);
      if (d < bd && d <= ROPE) (bd = d), (best = q);
    }
    return best ? tapAt(best) : NO;
  },
};

/** 독립 버릇 봇: 갈고리가 돌아오면 바로, 지금 가장 많이 쓰러뜨리는 것을 끈다 (기다리기·피하기·판 목표 없음) */
export const hookpirateHabit2: Bot<HookState> = {
  name: '늘 지금 가장 많이 쓰러뜨리는 것을 바로',
  act(s) {
    if (s.phase !== 'play' || s.hook.st !== H_IDLE || s.soot > 0 || s.queued || s.prevP) return NO;
    if (!s.bodies.some((q) => livePir(q) && q.st !== ENTER)) return NO;
    let best: Plan | null = null;
    for (const b of s.bodies) {
      if (!hookable(b) || Math.hypot(b.x - s.cx, b.y - s.cy) > ROPE + RAD[b.k]) continue;
      const P = plan(s, b);
      if (P.mode === 0 || P.self) continue;
      if (!best || P.n + P.bossD * 0.5 > best.n + best.bossD * 0.5) best = P;
    }
    return best ? tapAt(best.b) : NO;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: HookState, w: number, h: number, th: Theme) {
  void th;
  void juice;
  ctx.fillStyle = '#123';
  ctx.fillRect(0, 0, w, h);
  for (const b of s.bodies) {
    ctx.fillStyle = PIR(b.k) ? '#eee' : '#a63';
    ctx.beginPath();
    ctx.arc(b.x * w, (PY0 + b.y * KY) * w - b.z * w, RAD[b.k] * w, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#f33';
  ctx.beginPath();
  ctx.arc(s.cx * w, (PY0 + s.cy * KY) * w, CAP_R * w, 0, TAU);
  ctx.fill();
}
