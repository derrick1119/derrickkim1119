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
    stars: [CLEAR, S('spin', 6, '돛대로 빙글 여섯'), S('nohit', 0, '한 번도 안 맞기')],
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
/** 갈고리 한 번(행동)의 기록: 쓰러뜨린 수 · 돛대로 돈 행동인가 · 화약통이 터진 행동인가 … (연쇄로 쓰러진 것도 그 행동의 몫) */
interface Rec { n: number; sp: boolean; bm: boolean; shark: number; shield: number; boss: boolean; bh: boolean; t: number; x: number; y: number }
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
  if (y < 0.44) {
    // 뾰족한 뱃머리 (끝은 뾰족, 허리로 갈수록 둥글게)
    const u = (y - BOW) / (0.44 - BOW);
    return HWMAX * (1 - (1 - u) * (1 - u) * (1 - u * 0.35));
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
    s.recs[act] = r = { n: 0, sp: false, bm: false, shark: 0, shield: 0, boss: false, bh: false, t: s.t, x: s.cx, y: s.cy };
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
  if (r.sp) s.spinBest = Math.max(s.spinBest, n);
  if (r.bm) s.boomBest = Math.max(s.boomBest, n);
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
  rec(s, act).bm = true;
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
    rec(s, h.act).sp = true;
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
  if (b.st === FLY && b.tm < (boss ? 28 : 18) && b.chain < (boss ? 4 : 1)) {
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
      q.chain = 9; // 연쇄는 한 단계까지만 (부딪혀 날아간 해적은 더 잇지 않는다)
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
function plan(s: HookState, b0: Body, dt = 0): Plan {
  const b = blockedBy(s, b0), D = Math.hypot(b.x - s.cx, b.y - s.cy) || 1e-6, tOut = D / HOOK_V;
  const P: Plan = { b: b0, tgt: b, mode: 0, n: 0, boom: 0, shark: 0, shield: 0, spin: 0, bossD: 0, bossKO: false, self: 0, ex: s.cx, ey: s.cy, T: tOut * 2 + REEL_T, hit: new Set() };
  if (b.k === 'shield' && shieldBlocks(b, s.cx, s.cy)) return P;
  const tMid = dt + tOut + (b.k === 'mast' ? SPIN_T / 2 : D / (YANK_V1 * 1.6));
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
        const p = predPos(s, q, dt + tOut + k);
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
      if (here > Math.hypot(mast.x - s.cx, mast.y - s.cy) / HOOK_V + 12 && live.length + s.queue.length >= 4) return NO;
      if (sp.spin >= 2) return tapAt(mast);
    }
    if (here < best.T + 40) return tapAt(best.b);
    // 상어가 곧 해적 줄 뒤로 온다면 그때까지 기다린다
    const shk = s.bodies.find((b) => b.k === 'shark' && b.st === SWIM);
    if (shk && goals.some((st) => st.k === 'shark')) {
      for (let k = 6; k <= 72; k += 6) {
        const a = shk.ang + 0.007 * k, fx = 0.5 + Math.cos(a) * 0.47, fy = 0.52 + Math.sin(a) * 0.56;
        if (Math.hypot(fx - s.cx, fy - s.cy) > ROPE) continue;
        const P = plan(s, { ...shk, x: fx, y: fy }, k);
        if (P.shark >= goals.find((st) => st.k === 'shark')!.n && here > k + P.T + 60) return NO;
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
type C2 = CanvasRenderingContext2D;
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
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
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
/** 굵은 윤곽선 + 채우기 */
function fillOut(ctx: C2, fill: string | CanvasGradient, lw: number, out = OUT) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = out;
  ctx.lineWidth = lw;
  ctx.stroke();
}
const OUT = '#2a1420';
const NUM = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const numKo = (n: number) => NUM[n] ?? String(n);

// ── 배경 층 (한 번 그려 두고 다시 쓴다) ──
interface Bg { sky: HTMLCanvasElement; isle: HTMLCanvasElement; sea: HTMLCanvasElement; deck: HTMLCanvasElement }
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
/** 갑판 테두리 점들 (화면 px, 흔들림 전) */
function deckPts(w: number, inset = 0) {
  const pts: number[][] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const y = BOW + ((STERN - BOW) * i) / N;
    pts.push([(0.5 + Math.max(0, hw(y) - inset)) * w, (PY0 + y * KY) * w]);
  }
  for (let i = N; i >= 0; i--) {
    const y = BOW + ((STERN - BOW) * i) / N;
    pts.push([(0.5 - Math.max(0, hw(y) - inset)) * w, (PY0 + y * KY) * w]);
  }
  return pts;
}
function poly(ctx: C2, pts: number[][], dy = 0) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + dy) : ctx.moveTo(p[0], p[1] + dy)));
  ctx.closePath();
}
const SUN_X = 0.7;
function getBg(w: number, h: number, sc: number): Bg {
  const key = `${w}x${h}:${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const hz = HZ * w;
  const sky = layer(w, hz + 2, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, hz, [0, '#2b1b52'], [0.32, '#6b2d6e'], [0.6, '#d4506a'], [0.82, '#f5894a'], [1, '#ffcf7a']);
    g.fillRect(0, 0, w, hz + 2);
    for (let k = 0; k < 30; k++) {
      g.globalAlpha = (0.15 + hsh(k * 3.1) * 0.5) * (1 - hsh(k + 99) * 0.9);
      g.fillStyle = '#fff4e0';
      g.beginPath();
      g.arc(hsh(k) * w, hsh(k + 99) * hz * 0.45, k % 5 ? 0.7 : 1.2, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    const sx = w * SUN_X, sy = hz + w * 0.01, sr = w * 0.085;
    g.fillStyle = radg(g, sx, sy, sr * 0.5, sr * 4.5, [0, 'rgba(255,236,170,.75)'], [0.3, 'rgba(255,170,100,.28)'], [1, 'rgba(255,140,90,0)']);
    g.fillRect(0, 0, w, hz + 2);
    g.fillStyle = radg(g, sx, sy - sr * 0.3, sr * 0.1, sr, [0, '#fffbe6'], [0.6, '#ffe28a'], [1, '#ffb347']);
    g.beginPath();
    g.arc(sx, sy, sr, 0, TAU);
    g.fill();
    // 노을 구름 띠
    for (let k = 0; k < 9; k++) {
      const cy = hz * (0.18 + hsh(k + 3) * 0.6), cx = hsh(k + 7) * w, cw = w * (0.18 + hsh(k + 11) * 0.3), ch = w * (0.012 + hsh(k + 13) * 0.016);
      const warm = cy / hz;
      g.fillStyle = lin(g, 0, cy - ch, 0, cy + ch, [0, `rgba(255,${190 + warm * 40},${150 - warm * 40},${0.55 + warm * 0.3})`], [1, `rgba(${170 + warm * 60},70,${120 - warm * 30},${0.35 + warm * 0.3})`]);
      for (let j = 0; j < 4; j++) {
        ell(g, cx + (j - 1.5) * cw * 0.28, cy + Math.sin(j * 2.1 + k) * ch * 0.3, cw * (0.22 + hsh(k * 5 + j) * 0.12), ch * (0.8 + hsh(j + k) * 0.5));
        g.fill();
      }
    }
  });
  // 먼 섬 · 유령선 (시차 층, 넓게)
  const iw = w * 1.3, ih = w * 0.16;
  const isle = layer(iw, ih, sc, (g) => {
    const base = ih * 0.92;
    const hill = (x0: number, wd: number, ht: number, col: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x0 - wd / 2, base);
      g.bezierCurveTo(x0 - wd * 0.3, base - ht, x0 + wd * 0.1, base - ht * 1.1, x0 + wd / 2, base);
      g.closePath();
      g.fill();
    };
    hill(iw * 0.16, w * 0.4, w * 0.075, '#7a3a6e');
    hill(iw * 0.3, w * 0.26, w * 0.05, '#86426f');
    hill(iw * 0.95, w * 0.34, w * 0.06, '#7a3a6e');
    // 야자수
    const palm = (x: number, y: number, s: number) => {
      g.strokeStyle = '#5a2756';
      g.lineWidth = s * 0.12;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + s * 0.2, y - s * 0.5, x + s * 0.1, y - s);
      g.stroke();
      g.fillStyle = '#5a2756';
      for (let j = 0; j < 5; j++) {
        const a = -Math.PI / 2 + (j - 2) * 0.7;
        g.beginPath();
        g.moveTo(x + s * 0.1, y - s);
        g.quadraticCurveTo(x + s * 0.1 + Math.cos(a) * s * 0.5, y - s + Math.sin(a) * s * 0.3 - s * 0.1, x + s * 0.1 + Math.cos(a) * s * 0.75, y - s + Math.abs(Math.cos(a)) * s * 0.25);
        g.quadraticCurveTo(x + s * 0.1 + Math.cos(a) * s * 0.4, y - s + Math.sin(a) * s * 0.1, x + s * 0.1, y - s);
        g.fill();
      }
    };
    palm(iw * 0.13, base - w * 0.05, w * 0.06);
    palm(iw * 0.19, base - w * 0.055, w * 0.05);
    palm(iw * 0.93, base - w * 0.045, w * 0.055);
    // 유령선 (해골 해적이 오는 곳)
    const gx = iw * 0.52, gy = base - w * 0.006, s = w * 0.11;
    g.fillStyle = '#4a2050';
    g.beginPath();
    g.moveTo(gx - s * 0.6, gy - s * 0.12);
    g.lineTo(gx + s * 0.62, gy - s * 0.16);
    g.quadraticCurveTo(gx + s * 0.4, gy + s * 0.02, gx, gy + s * 0.03);
    g.quadraticCurveTo(gx - s * 0.45, gy + s * 0.02, gx - s * 0.6, gy - s * 0.12);
    g.fill();
    for (const [mx, mh] of [[-0.25, 0.75], [0.12, 0.95], [0.42, 0.6]]) {
      g.fillRect(gx + mx * s - 1, gy - s * mh, 2, s * mh);
      g.beginPath();
      g.moveTo(gx + mx * s - s * 0.16, gy - s * mh * 0.85);
      g.lineTo(gx + mx * s + s * 0.16, gy - s * mh * 0.85);
      for (let j = 0; j <= 4; j++) g.lineTo(gx + mx * s + s * (0.16 - j * 0.08), gy - s * mh * 0.35 + (j % 2 ? -s * 0.05 : 0));
      g.closePath();
      g.globalAlpha = 0.85;
      g.fill();
      g.globalAlpha = 1;
    }
    g.fillStyle = 'rgba(180,255,210,.55)';
    for (let j = 0; j < 4; j++) (g.beginPath(), g.arc(gx - s * 0.35 + j * s * 0.22, gy - s * 0.07, 1.1, 0, TAU), g.fill());
    g.fillStyle = lin(g, 0, base - w * 0.05, 0, ih, [0, 'rgba(255,170,130,0)'], [1, 'rgba(255,170,130,.35)']);
    g.fillRect(0, base - w * 0.05, iw, ih);
  });
  const sea = layer(w, h - hz, sc, (g) => {
    const sh = h - hz;
    g.fillStyle = lin(g, 0, 0, 0, sh, [0, '#f2a067'], [0.06, '#c8667a'], [0.2, '#6a4a86'], [0.45, '#2f4f8a'], [0.75, '#1f3c6e'], [1, '#162a52']);
    g.fillRect(0, 0, w, sh);
    // 해 반사 기둥
    const sx = w * SUN_X;
    g.fillStyle = lin(g, 0, 0, 0, sh * 0.55, [0, 'rgba(255,220,140,.55)'], [1, 'rgba(255,200,140,0)']);
    g.beginPath();
    g.moveTo(sx - w * 0.05, 0);
    g.lineTo(sx + w * 0.05, 0);
    g.lineTo(sx + w * 0.16, sh * 0.55);
    g.lineTo(sx - w * 0.16, sh * 0.55);
    g.closePath();
    g.fill();
  });
  // 갑판 (선체 · 판자 · 난간)
  const deck = layer(w, h, sc, (g) => {
    const outer = deckPts(w, -0.012), inner = deckPts(w, 0.012), hull = w * 0.055;
    // 물 위 그림자
    g.fillStyle = 'rgba(8,10,40,.35)';
    poly(g, deckPts(w, -0.03), hull * 1.4);
    g.fill();
    // 선체 옆면 (가까운 쪽이 보인다)
    g.save();
    poly(g, outer, hull);
    g.fillStyle = lin(g, 0, (PY0 + 0.4 * KY) * w, 0, (PY0 + KY) * w + hull, [0, '#4a2414'], [1, '#2e140c']);
    g.fill();
    g.clip();
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.lineWidth = 1.2;
    for (let k = 1; k < 5; k++) {
      poly(g, outer, (hull * k) / 5);
      g.stroke();
    }
    // 금빛 띠 · 둥근 창
    g.strokeStyle = '#d9a441';
    g.lineWidth = w * 0.006;
    poly(g, outer, hull * 0.45);
    g.stroke();
    g.restore();
    for (let i = 0; i < 7; i++) {
      const y = 0.45 + i * 0.09;
      for (const sd of [-1, 1]) {
        const x = (0.5 + sd * (hw(y) + 0.006)) * w, yy = (PY0 + y * KY) * w + hull * 0.62;
        if (y > 0.96) continue;
        g.fillStyle = '#d9a441';
        ell(g, x, yy, w * 0.009, w * 0.007);
        g.fill();
        g.fillStyle = '#1a0c1a';
        ell(g, x, yy, w * 0.006, w * 0.0045);
        g.fill();
      }
    }
    // 갑판 바닥
    g.save();
    poly(g, outer);
    g.fillStyle = lin(g, 0, PY0 * w, 0, (PY0 + KY) * w, [0, '#b07a46'], [0.5, '#c58d55'], [1, '#d29a5e']);
    g.fill();
    g.clip();
    // 세로 판자 (뱃머리 → 고물)
    const pw = w * 0.052;
    for (let x = w * 0.1, i = 0; x < w * 0.9; x += pw, i++) {
      g.fillStyle = `rgba(${i % 3 === 0 ? '90,50,20' : i % 3 === 1 ? '255,220,170' : '120,70,30'},${0.08 + hsh(i) * 0.08})`;
      g.fillRect(x, 0, pw, h);
      g.strokeStyle = 'rgba(70,35,15,.55)';
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
      // 나뭇결
      g.strokeStyle = 'rgba(110,60,25,.22)';
      g.lineWidth = 0.8;
      for (let j = 0; j < 3; j++) {
        const gx = x + pw * (0.25 + j * 0.25);
        g.beginPath();
        g.moveTo(gx, PY0 * w);
        for (let yy = PY0 * w; yy < h; yy += w * 0.05) g.lineTo(gx + Math.sin(yy * 0.05 + i * 3 + j) * pw * 0.08, yy);
        g.stroke();
      }
      // 이음매 · 못
      for (let yy = PY0 * w + hsh(i + 5) * w * 0.2; yy < h; yy += w * (0.22 + hsh(i + yy) * 0.1)) {
        g.strokeStyle = 'rgba(70,35,15,.5)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x, yy);
        g.lineTo(x + pw, yy);
        g.stroke();
        g.fillStyle = 'rgba(60,40,30,.6)';
        for (const nx of [0.25, 0.75]) (g.beginPath(), g.arc(x + pw * nx, yy + 3, 1.1, 0, TAU), g.fill());
      }
    }
    // 가장자리 그늘 (오목한 갑판)
    g.strokeStyle = 'rgba(60,25,10,.35)';
    g.lineWidth = w * 0.05;
    poly(g, outer);
    g.stroke();
    // 고물 쪽 쇠창살 덮개 · 밧줄 뭉치
    const gx = 0.5 * w, gy = (PY0 + 0.93 * KY) * w;
    g.fillStyle = '#5a3418';
    rr(g, gx - w * 0.08, gy - w * 0.03, w * 0.16, w * 0.06, 4);
    g.fill();
    g.strokeStyle = '#2e1a0c';
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = 'rgba(30,15,5,.8)';
    g.lineWidth = 1.5;
    for (let k = 1; k < 6; k++) (g.beginPath(), g.moveTo(gx - w * 0.08 + (k * w * 0.16) / 6, gy - w * 0.03), g.lineTo(gx - w * 0.08 + (k * w * 0.16) / 6, gy + w * 0.03), g.stroke());
    g.beginPath();
    g.moveTo(gx - w * 0.08, gy);
    g.lineTo(gx + w * 0.08, gy);
    g.stroke();
    for (const [cx, cy] of [[0.24, 0.9], [0.77, 0.2]]) {
      const x = cx * w, y = (PY0 + cy * KY) * w;
      for (let k = 0; k < 3; k++) {
        g.strokeStyle = k % 2 ? '#c9a46a' : '#a8834c';
        g.lineWidth = w * 0.008;
        ell(g, x, y, w * (0.035 - k * 0.009), w * (0.02 - k * 0.005));
        g.stroke();
      }
    }
    g.restore();
    // 안쪽 난간 벽 (먼 쪽 벽의 안쪽 면이 보인다 → 깊이)
    g.save();
    poly(g, outer);
    g.clip();
    const wallH = w * 0.03;
    for (let i = 1; i < outer.length; i++) {
      const [x0, y0] = outer[i - 1], [x1, y1] = outer[i];
      if (Math.min(y0, y1) > (PY0 + 0.7 * KY) * w) continue;
      g.fillStyle = 'rgba(70,34,14,.85)';
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.lineTo(x1 + (0.5 * w - x1) * 0.04, y1 + wallH);
      g.lineTo(x0 + (0.5 * w - x0) * 0.04, y0 + wallH);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = 'rgba(255,220,160,.25)';
    g.lineWidth = 1;
    poly(g, outer, wallH * 0.5);
    g.stroke();
    g.restore();
    // 난간 (두꺼운 나무 테두리 + 기둥)
    g.lineJoin = 'round';
    g.strokeStyle = '#3a1c0e';
    g.lineWidth = w * 0.03;
    poly(g, outer);
    g.stroke();
    g.strokeStyle = '#8a5428';
    g.lineWidth = w * 0.02;
    poly(g, outer);
    g.stroke();
    g.strokeStyle = 'rgba(255,214,150,.55)';
    g.lineWidth = w * 0.005;
    poly(g, outer, -w * 0.004);
    g.stroke();
    for (let i = 1; i < outer.length - 1; i += 3) {
      const [x, y] = outer[i];
      g.fillStyle = '#5a3018';
      rr(g, x - w * 0.007, y - w * 0.012, w * 0.014, w * 0.016, 2);
      g.fill();
      g.fillStyle = '#d9a441';
      g.beginPath();
      g.arc(x, y - w * 0.006, w * 0.004, 0, TAU);
      g.fill();
    }
    void inner;
  });
  const out = { sky, isle, sea, deck };
  BG.set(key, out);
  return out;
}

// ── 꼬마 선장 · 앵무새 ──
/** pose: 0 서기 · 1 던지기 · 2 끌기(뒤로 버팀) · 3 끌려가기(날아감) · 4 빙글 · 5 우쭐 · 6 시무룩 · 7 아야 */
interface CapLook { pose: number; face: number; t: number; aim: number; soot: number; dizzy: number; squawk: number; blink: boolean }
function drawParrot(ctx: C2, x: number, y: number, k: number, t: number, squawk: number, face: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const flap = squawk > 0 ? Math.sin(t * 0.9) : Math.sin(t * 0.05) * 0.15;
  // 꼬리
  ctx.fillStyle = '#2a7bd6';
  ctx.beginPath();
  ctx.moveTo(-k * 0.05, k * 0.05);
  ctx.quadraticCurveTo(-k * 0.2, k * 0.3, -k * 0.12, k * 0.42);
  ctx.quadraticCurveTo(-k * 0.02, k * 0.25, k * 0.04, k * 0.06);
  fillOut(ctx, '#2a7bd6', 1.4);
  // 몸
  ell(ctx, 0, 0, k * 0.13, k * 0.17, -0.25);
  fillOut(ctx, lin(ctx, 0, -k * 0.17, 0, k * 0.17, [0, '#ff5a3c'], [1, '#c8261c']), 1.6);
  // 날개 (꽥 하면 퍼덕)
  ctx.save();
  ctx.translate(-k * 0.04, -k * 0.02);
  ctx.rotate(-0.5 - flap * 0.9);
  ell(ctx, -k * 0.06, k * 0.06, k * 0.08, k * 0.15, 0.3);
  fillOut(ctx, lin(ctx, 0, -k * 0.1, 0, k * 0.2, [0, '#ffd23f'], [0.5, '#3fc06a'], [1, '#2a7bd6']), 1.4);
  ctx.restore();
  // 머리 · 부리 · 눈
  ell(ctx, k * 0.05, -k * 0.18, k * 0.1, k * 0.095);
  fillOut(ctx, '#ff6a48', 1.6);
  ell(ctx, k * 0.09, -k * 0.19, k * 0.05, k * 0.045);
  ctx.fillStyle = '#fff6ea';
  ctx.fill();
  ctx.fillStyle = '#1a0c10';
  ctx.beginPath();
  ctx.arc(k * 0.1, -k * 0.19, k * 0.018, 0, TAU);
  ctx.fill();
  const open = squawk > 0 ? 0.35 + 0.25 * Math.abs(Math.sin(t * 0.6)) : 0.1;
  ctx.fillStyle = '#f2e2c4';
  ctx.beginPath();
  ctx.moveTo(k * 0.13, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.25, -k * 0.2, k * 0.2, -k * (0.1 - open * 0.05));
  ctx.quadraticCurveTo(k * 0.17, -k * 0.15, k * 0.13, -k * 0.15);
  fillOut(ctx, '#f2e2c4', 1.3);
  ctx.beginPath();
  ctx.moveTo(k * 0.13, -k * 0.14);
  ctx.quadraticCurveTo(k * 0.19, -k * (0.13 - open * 0.1), k * 0.14, -k * (0.1 - open * 0.12));
  fillOut(ctx, '#8a7a66', 1.2);
  // 볏
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(k * 0.01, -k * 0.26);
  ctx.quadraticCurveTo(-k * 0.06, -k * 0.36, k * 0.02, -k * 0.34);
  ctx.quadraticCurveTo(k * 0.04, -k * 0.3, k * 0.06, -k * 0.27);
  fillOut(ctx, '#ffd23f', 1.2);
  ctx.restore();
}

function drawCaptain(ctx: C2, x: number, y: number, k: number, L: CapLook) {
  const { pose, face, t } = L;
  const breath = Math.sin(t * 0.08) * k * 0.012;
  const lean = pose === 2 ? -0.22 : pose === 3 ? 0.35 : pose === 1 ? 0.08 : pose === 7 ? -0.15 : 0;
  const hop = pose === 5 ? -Math.abs(Math.sin(t * 0.18)) * k * 0.08 : 0;
  ctx.save();
  ctx.translate(x, y + hop);
  ctx.scale(face, 1);
  if (pose === 4) ctx.rotate(Math.sin(t * 0.5) * 0.3);
  ctx.rotate(lean);
  const skin = L.soot > 0 ? '#3a3036' : '#ffd6ae';
  // 다리 · 장화
  const step = pose === 3 ? 0.5 : pose === 2 ? 0.25 : 0;
  for (const [sd, ph] of [[-1, 0], [1, Math.PI]] as [number, number][]) {
    const lx = sd * k * 0.09 + (pose === 3 ? Math.sin(t * 0.6 + ph) * k * 0.08 : 0);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.07, -k * 0.24);
    ctx.lineTo(lx + (sd > 0 ? step : -step) * k * 0.1, -k * 0.06);
    ctx.stroke();
    ctx.strokeStyle = '#e9e2d0';
    ctx.lineWidth = k * 0.065;
    ctx.stroke();
    ell(ctx, lx + (sd > 0 ? step : -step) * k * 0.1 + k * 0.025, -k * 0.04, k * 0.07, k * 0.045);
    fillOut(ctx, lin(ctx, 0, -k * 0.09, 0, 0, [0, '#4a3030'], [1, '#1c1014']), 1.6);
  }
  // 뒤 팔 (끌기·끌려가기 땐 두 손으로 사슬)
  const armA = pose === 1 ? -0.3 : pose === 2 || pose === 3 ? -0.15 : pose === 5 ? -2.4 : pose === 7 ? -2.2 : 0.3;
  const arm = (ang: number, front: boolean) => {
    ctx.save();
    ctx.translate(front ? k * 0.16 : -k * 0.14, -k * 0.5);
    ctx.rotate(ang);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(k * 0.2, k * 0.04);
    ctx.stroke();
    ctx.strokeStyle = front ? '#e0362c' : '#b8261e';
    ctx.lineWidth = k * 0.085;
    ctx.stroke();
    ctx.fillStyle = '#fff4e0';
    ell(ctx, k * 0.2, k * 0.04, k * 0.035, k * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(k * 0.25, k * 0.045, k * 0.045, 0, TAU);
    fillOut(ctx, skin, 1.4);
    ctx.restore();
  };
  arm(pose === 2 || pose === 3 ? L.aim - lean + 0.15 : armA, false);
  // 코트
  ctx.beginPath();
  ctx.moveTo(-k * 0.17, -k * 0.56 + breath);
  ctx.quadraticCurveTo(-k * 0.24, -k * 0.38, -k * 0.27, -k * 0.2);
  ctx.quadraticCurveTo(-k * 0.05, -k * 0.13, k * 0.27, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.24, -k * 0.38, k * 0.17, -k * 0.56 + breath);
  ctx.quadraticCurveTo(0, -k * 0.6 + breath, -k * 0.17, -k * 0.56 + breath);
  fillOut(ctx, lin(ctx, -k * 0.2, 0, k * 0.25, 0, [0, '#a81e1a'], [0.45, '#e2382c'], [1, '#b82620']), k * 0.035);
  // 흰 셔츠 · 금단추 · 허리띠
  ctx.fillStyle = '#fff4e0';
  ctx.beginPath();
  ctx.moveTo(-k * 0.05, -k * 0.57 + breath);
  ctx.lineTo(k * 0.05, -k * 0.57 + breath);
  ctx.lineTo(k * 0.02, -k * 0.36);
  ctx.lineTo(-k * 0.02, -k * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2214';
  ctx.fillRect(-k * 0.24, -k * 0.31, k * 0.48, k * 0.06);
  rr(ctx, -k * 0.045, -k * 0.325, k * 0.09, k * 0.085, k * 0.015);
  fillOut(ctx, '#ffd23f', 1.2);
  ctx.fillStyle = '#ffd23f';
  for (const by of [-0.48, -0.41]) for (const bx of [-0.09, 0.09]) (ctx.beginPath(), ctx.arc(bx * k, by * k, k * 0.016, 0, TAU), ctx.fill());
  // 머리
  const hx = 0, hy = -k * 0.75 + breath;
  ctx.beginPath();
  ctx.arc(hx, hy, k * 0.21, 0, TAU);
  fillOut(ctx, L.soot > 0 ? '#3a3036' : radg(ctx, hx - k * 0.06, hy - k * 0.08, k * 0.02, k * 0.24, [0, '#ffe6c8'], [1, '#f2b88a']), k * 0.035);
  // 머리카락 (모자 아래)
  ctx.fillStyle = '#7a3a1a';
  for (let j = 0; j < 4; j++) {
    ctx.beginPath();
    ctx.arc(hx - k * 0.17 + j * k * 0.035, hy - k * 0.08 + Math.abs(j - 1.5) * k * 0.01, k * 0.045, 0, TAU);
    ctx.fill();
  }
  // 얼굴
  const ex = k * 0.08, ey = hy - k * 0.01;
  if (L.soot <= 0) {
    ctx.fillStyle = 'rgba(255,110,120,.45)';
    ell(ctx, ex + k * 0.08, ey + k * 0.07, k * 0.045, k * 0.028);
    ctx.fill();
    ell(ctx, ex - k * 0.11, ey + k * 0.07, k * 0.04, k * 0.026);
    ctx.fill();
  }
  const eyeR = k * 0.055;
  for (const sx of [-0.06, 0.07]) {
    const cx = ex + sx * k * 1.2, cy = ey;
    if (L.dizzy > 0 || pose === 6) {
      ctx.strokeStyle = L.soot > 0 ? '#fff' : OUT;
      ctx.lineWidth = k * 0.022;
      ctx.beginPath();
      if (L.dizzy > 0) for (let a = 0; a < 9; a++) ctx.lineTo(cx + Math.cos(a * 0.9 + t * 0.4) * eyeR * (a / 9), cy + Math.sin(a * 0.9 + t * 0.4) * eyeR * (a / 9));
      else ctx.arc(cx, cy + eyeR * 0.4, eyeR * 0.7, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    if (L.blink || pose === 5) {
      ctx.strokeStyle = L.soot > 0 ? '#fff' : OUT;
      ctx.lineWidth = k * 0.022;
      ctx.beginPath();
      ctx.arc(cx, cy + eyeR * 0.3, eyeR * 0.7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      continue;
    }
    const big = pose === 7 || pose === 3 ? 1.25 : 1;
    ell(ctx, cx, cy, eyeR * 0.85 * big, eyeR * big);
    fillOut(ctx, '#ffffff', k * 0.018);
    const px = cx + eyeR * 0.3 * (pose === 2 ? -1 : 1), py = cy + eyeR * 0.1;
    ctx.fillStyle = '#2a1a2a';
    ell(ctx, px, py, eyeR * 0.45, eyeR * 0.55);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px + eyeR * 0.15, py - eyeR * 0.22, eyeR * 0.18, 0, TAU);
    ctx.fill();
  }
  // 눈썹 · 입
  ctx.strokeStyle = L.soot > 0 ? '#fff' : '#5a2a14';
  ctx.lineWidth = k * 0.022;
  ctx.lineCap = 'round';
  const angry = pose === 1 || pose === 2;
  for (const sx of [-0.06, 0.07]) {
    ctx.beginPath();
    ctx.moveTo(ex + sx * k * 1.2 - eyeR * 0.7, ey - eyeR * (angry ? 1.05 : 1.35) - (sx > 0 && angry ? -eyeR * 0.25 : 0));
    ctx.lineTo(ex + sx * k * 1.2 + eyeR * 0.7, ey - eyeR * (angry ? 1.35 : 1.35) + (sx > 0 && angry ? eyeR * 0.1 : 0));
    ctx.stroke();
  }
  const my = ey + k * 0.1;
  ctx.fillStyle = '#7a1e2a';
  ctx.strokeStyle = L.soot > 0 ? '#fff' : OUT;
  ctx.lineWidth = k * 0.02;
  if (pose === 3 || pose === 7) (ell(ctx, ex + k * 0.01, my, k * 0.04, k * 0.05), ctx.fill(), ctx.stroke());
  else if (pose === 2 || pose === 1) {
    rr(ctx, ex - k * 0.04, my - k * 0.015, k * 0.09, k * 0.035, k * 0.01);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();
  } else if (pose === 6) (ctx.beginPath(), ctx.arc(ex, my + k * 0.03, k * 0.035, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
  else {
    ctx.beginPath();
    ctx.arc(ex, my - k * 0.015, k * (pose === 5 ? 0.05 : 0.035), 0.2, Math.PI - 0.2);
    if (pose === 5) (ctx.fill(), ctx.stroke());
    else ctx.stroke();
  }
  // 삼각 모자 (금테 · 빨간 깃털)
  ctx.save();
  ctx.translate(hx, hy - k * 0.13);
  ctx.rotate(pose === 7 ? -0.35 : pose === 3 ? -0.2 : 0);
  if (pose === 7) ctx.translate(0, -k * 0.08);
  ctx.fillStyle = '#e2382c';
  ctx.beginPath();
  ctx.moveTo(-k * 0.08, -k * 0.08);
  ctx.quadraticCurveTo(-k * 0.35, -k * 0.3 + Math.sin(t * 0.12) * k * 0.02, -k * 0.36, -k * 0.06);
  ctx.quadraticCurveTo(-k * 0.25, -k * 0.16, -k * 0.04, -k * 0.04);
  fillOut(ctx, '#e2382c', 1.4);
  ctx.beginPath();
  ctx.moveTo(-k * 0.3, k * 0.02);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.24, 0, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.2, -k * 0.24, k * 0.3, k * 0.02);
  ctx.quadraticCurveTo(0, k * 0.1, -k * 0.3, k * 0.02);
  fillOut(ctx, lin(ctx, 0, -k * 0.2, 0, k * 0.06, [0, '#3a2a48'], [1, '#14101c']), k * 0.03);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = k * 0.025;
  ctx.beginPath();
  ctx.moveTo(-k * 0.27, k * 0.0);
  ctx.quadraticCurveTo(0, k * 0.08, k * 0.27, k * 0.0);
  ctx.stroke();
  // 금 닻 무늬
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = k * 0.018;
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.14);
  ctx.lineTo(0, -k * 0.04);
  ctx.moveTo(-k * 0.035, -k * 0.11);
  ctx.lineTo(k * 0.035, -k * 0.11);
  ctx.moveTo(-k * 0.04, -k * 0.07);
  ctx.quadraticCurveTo(0, -k * 0.01, k * 0.04, -k * 0.07);
  ctx.stroke();
  ctx.restore();
  // 앞 팔 (던지는 팔·사슬 쥔 손)
  arm(pose === 1 || pose === 2 || pose === 3 ? L.aim - lean : pose === 5 ? -2.6 : pose === 7 ? -2.5 : pose === 6 ? 1.1 : 0.55, true);
  ctx.restore();
}

// ── 통통 해골 해적 ──
interface SkelLook { k: K; walk: number; wind: number; hurt: number; fly: boolean; seed: number; t: number; hp: number; scared: boolean }
function bone(ctx: C2, x0: number, y0: number, x1: number, y1: number, wd: number) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = wd + 2.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = '#f4ead2';
  ctx.lineWidth = wd;
  ctx.stroke();
}
function cutlass(ctx: C2, x: number, y: number, k: number, ang: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.02);
  ctx.quadraticCurveTo(k * 0.22, -k * 0.06, k * 0.36, -k * 0.13);
  ctx.quadraticCurveTo(k * 0.24, k * 0.0, 0, k * 0.025);
  ctx.closePath();
  fillOut(ctx, lin(ctx, 0, -k * 0.1, 0, k * 0.03, [0, '#ffffff'], [1, '#9aa6b8']), 1.4);
  ctx.fillStyle = '#d9a441';
  rr(ctx, -k * 0.02, -k * 0.05, k * 0.03, k * 0.1, 2);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}
function drawSkel(ctx: C2, k: number, L: SkelLook) {
  const boss = L.k === 'boss', shield = L.k === 'shield';
  const bob = L.walk ? Math.abs(Math.sin(L.walk)) * k * 0.04 : Math.sin(L.t * 0.07 + L.seed) * k * 0.01;
  const stepA = Math.sin(L.walk) * 0.5;
  const ivory = lin(ctx, 0, -k, 0, -k * 0.5, [0, '#fffaf0'], [1, '#e2d4b2']);
  // 다리 · 발
  for (const sd of [-1, 1]) {
    const fx = sd * k * 0.09 + (L.fly ? sd * k * 0.08 : Math.sin(L.walk + (sd > 0 ? 0 : Math.PI)) * k * 0.06);
    bone(ctx, sd * k * 0.07, -k * 0.27, fx, -k * 0.04 - (L.fly ? k * 0.05 : 0), k * 0.045);
    ell(ctx, fx + k * 0.02, -k * 0.03 - (L.fly ? k * 0.05 : 0), k * 0.055, k * 0.03);
    fillOut(ctx, '#f4ead2', 1.4);
  }
  ctx.save();
  ctx.translate(0, -bob);
  // 몸통: 해진 줄무늬 셔츠 (대장은 긴 외투)
  const tw = k * (boss ? 0.36 : 0.27), ty0 = -k * 0.58, ty1 = -k * (boss ? 0.16 : 0.24);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.75, ty0);
  ctx.quadraticCurveTo(-tw * 1.15, (ty0 + ty1) / 2, -tw, ty1);
  for (let j = 0; j <= 6; j++) ctx.lineTo(-tw + (j * tw * 2) / 6, ty1 + (j % 2 ? k * 0.035 : 0));
  ctx.quadraticCurveTo(tw * 1.15, (ty0 + ty1) / 2, tw * 0.75, ty0);
  ctx.closePath();
  if (boss) fillOut(ctx, lin(ctx, -tw, 0, tw, 0, [0, '#3a1a4a'], [0.5, '#5a2a6e'], [1, '#2a1238']), k * 0.025);
  else {
    ctx.save();
    ctx.fillStyle = '#f2ece0';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = shield ? '#2a6a4a' : '#24407a';
    for (let yy = ty0; yy < ty1 + k * 0.05; yy += k * 0.07) ctx.fillRect(-tw * 1.3, yy, tw * 2.6, k * 0.035);
    ctx.restore();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.025;
    ctx.stroke();
  }
  // 허리띠 · 대장 금견장
  ctx.fillStyle = boss ? '#d9a441' : '#d8342a';
  ctx.fillRect(-tw * 0.95, -k * 0.33, tw * 1.9, k * 0.05);
  if (boss) for (const sd of [-1, 1]) (ell(ctx, sd * tw * 0.8, ty0 + k * 0.02, k * 0.08, k * 0.035), fillOut(ctx, '#ffd23f', 1.3));
  // 팔 · 칼 (칼을 들면 머리 위로)
  const windA = L.wind > 0 ? -2.2 + Math.sin(L.t * 0.6) * 0.15 : -0.6 + stepA * 0.3;
  const sx = tw * 0.9, sy = -k * 0.52;
  const ax = sx + Math.cos(windA) * k * 0.2, ay = sy + Math.sin(windA) * k * 0.2;
  bone(ctx, -sx, sy, -sx - k * 0.06, sy + k * 0.17, k * 0.04);
  if (boss) {
    // 갈고리 손
    ctx.strokeStyle = '#c8ccd8';
    ctx.lineWidth = k * 0.03;
    ctx.beginPath();
    ctx.arc(-sx - k * 0.1, sy + k * 0.22, k * 0.05, -0.5, Math.PI * 1.1);
    ctx.stroke();
  }
  bone(ctx, sx, sy, ax, ay, k * 0.04);
  if (!shield) cutlass(ctx, ax, ay, k * (boss ? 1.1 : 0.9), windA + 0.3);
  ctx.restore();
  // 머리: 커다란 통통 해골
  const hy = -k * (boss ? 0.8 : 0.78) - bob, hr = k * (boss ? 0.27 : 0.25);
  ctx.save();
  ctx.translate(0, hy);
  if (L.hurt > 0) ctx.rotate(Math.sin(L.t * 1.3) * 0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, hr * 1.05, hr, 0, Math.PI * 0.85, Math.PI * 2.15);
  ctx.quadraticCurveTo(hr * 0.75, hr * 0.95, 0, hr * 0.98);
  ctx.quadraticCurveTo(-hr * 0.75, hr * 0.95, -hr * 1.05 * Math.cos(Math.PI * 0.15), hr * Math.sin(Math.PI * 0.15) * 1.0);
  ctx.closePath();
  fillOut(ctx, ivory, k * 0.03);
  // 이빨
  ctx.strokeStyle = 'rgba(80,50,40,.6)';
  ctx.lineWidth = 1.2;
  const jaw = L.scared ? hr * 0.18 : 0;
  for (let j = -2; j <= 2; j++) (ctx.beginPath(), ctx.moveTo(j * hr * 0.16, hr * 0.62 + jaw), ctx.lineTo(j * hr * 0.16, hr * 0.92 + jaw), ctx.stroke());
  ctx.beginPath();
  ctx.moveTo(-hr * 0.45, hr * 0.62);
  ctx.quadraticCurveTo(0, hr * 0.7, hr * 0.45, hr * 0.62);
  ctx.stroke();
  if (L.scared) {
    ctx.fillStyle = '#2a1020';
    ell(ctx, 0, hr * 0.68, hr * 0.32, hr * 0.12);
    ctx.fill();
  }
  // 눈구멍 · 빛나는 눈동자
  const glow = boss ? '#ff4a3a' : L.wind > 0 ? '#ff8a5a' : '#7cf6ff';
  for (const ex of [-0.38, 0.38]) {
    ell(ctx, ex * hr, -hr * 0.02, hr * (L.scared ? 0.32 : 0.27), hr * (L.scared ? 0.36 : 0.3), ex * 0.3);
    ctx.fillStyle = '#2a1424';
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(ex * hr + hr * 0.06, -hr * 0.0, hr * (L.scared ? 0.06 : 0.09), 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = '#2a1424';
  ctx.beginPath();
  ctx.moveTo(0, hr * 0.28);
  ctx.lineTo(-hr * 0.08, hr * 0.44);
  ctx.lineTo(hr * 0.08, hr * 0.44);
  ctx.closePath();
  ctx.fill();
  // 금 간 자국
  ctx.strokeStyle = 'rgba(90,60,40,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hr * 0.5, -hr * 0.75);
  ctx.lineTo(hr * 0.42, -hr * 0.55);
  ctx.lineTo(hr * 0.55, -hr * 0.42);
  ctx.stroke();
  // 머리 장식: 두건(점박이) · 안대 · 대장 모자
  const v = boss ? 2 : Math.floor(hsh(L.seed) * 3);
  if (boss) {
    ctx.beginPath();
    ctx.moveTo(-hr * 1.5, -hr * 0.45);
    ctx.quadraticCurveTo(-hr * 0.8, -hr * 1.9, 0, -hr * 1.55);
    ctx.quadraticCurveTo(hr * 0.8, -hr * 1.9, hr * 1.5, -hr * 0.45);
    ctx.quadraticCurveTo(0, -hr * 0.85, -hr * 1.5, -hr * 0.45);
    fillOut(ctx, lin(ctx, 0, -hr * 1.8, 0, -hr * 0.5, [0, '#3a2a48'], [1, '#100a16']), k * 0.03);
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = k * 0.02;
    ctx.beginPath();
    ctx.moveTo(-hr * 1.35, -hr * 0.52);
    ctx.quadraticCurveTo(0, -hr * 0.95, hr * 1.35, -hr * 0.52);
    ctx.stroke();
    // 해골·뼈 무늬
    ctx.strokeStyle = '#f4ead2';
    ctx.lineWidth = k * 0.022;
    ctx.beginPath();
    ctx.moveTo(-hr * 0.3, -hr * 1.35);
    ctx.lineTo(hr * 0.3, -hr * 0.95);
    ctx.moveTo(hr * 0.3, -hr * 1.35);
    ctx.lineTo(-hr * 0.3, -hr * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#f4ead2';
    ctx.beginPath();
    ctx.arc(0, -hr * 1.2, hr * 0.16, 0, TAU);
    ctx.fill();
  } else if (v === 0) {
    ctx.beginPath();
    ctx.ellipse(0, -hr * 0.35, hr * 1.08, hr * 0.72, 0, Math.PI, TAU);
    ctx.closePath();
    fillOut(ctx, '#d8342a', k * 0.025);
    ctx.fillStyle = '#fff4e0';
    for (const [dx, dy] of [[-0.6, -0.65], [0, -0.85], [0.55, -0.6], [-0.25, -0.5], [0.3, -0.45]]) (ctx.beginPath(), ctx.arc(dx * hr, dy * hr, hr * 0.07, 0, TAU), ctx.fill());
    ctx.fillStyle = '#d8342a';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.95, -hr * 0.45);
    ctx.lineTo(-hr * 1.4, -hr * 0.2 + Math.sin(L.t * 0.2 + L.seed) * hr * 0.1);
    ctx.lineTo(-hr * 1.3, -hr * 0.55);
    ctx.closePath();
    fillOut(ctx, '#d8342a', 1.2);
  } else if (v === 1) {
    ctx.strokeStyle = '#1a0c14';
    ctx.lineWidth = k * 0.025;
    ctx.beginPath();
    ctx.moveTo(-hr * 1.0, -hr * 0.5);
    ctx.lineTo(hr * 1.0, -hr * 0.1);
    ctx.stroke();
    ell(ctx, hr * 0.38, -hr * 0.02, hr * 0.3, hr * 0.28, 0.2);
    fillOut(ctx, '#1a0c14', 1.2);
    ctx.beginPath();
    ctx.ellipse(0, -hr * 0.55, hr * 0.7, hr * 0.42, 0, Math.PI, TAU);
    ctx.closePath();
    fillOut(ctx, '#3a2a48', k * 0.02);
  } else {
    ctx.beginPath();
    ctx.moveTo(-hr * 1.15, -hr * 0.55);
    ctx.quadraticCurveTo(0, -hr * 1.45, hr * 1.15, -hr * 0.55);
    ctx.quadraticCurveTo(0, -hr * 0.8, -hr * 1.15, -hr * 0.55);
    fillOut(ctx, '#2a2238', k * 0.025);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = k * 0.015;
    ctx.beginPath();
    ctx.moveTo(-hr * 1.0, -hr * 0.6);
    ctx.quadraticCurveTo(0, -hr * 0.85, hr * 1.0, -hr * 0.6);
    ctx.stroke();
  }
  ctx.restore();
  // 방패 (몸 앞)
  if (shield) {
    const sxp = k * 0.2, syp = -k * 0.48 - bob;
    ell(ctx, sxp, syp, k * 0.17, k * 0.21);
    fillOut(ctx, lin(ctx, sxp - k * 0.15, 0, sxp + k * 0.15, 0, [0, '#8a5428'], [0.5, '#c88a4a'], [1, '#7a4420']), k * 0.035, '#2a1a10');
    ctx.strokeStyle = '#9aa6b8';
    ctx.lineWidth = k * 0.03;
    ell(ctx, sxp, syp, k * 0.15, k * 0.19);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,30,10,.6)';
    ctx.lineWidth = 1;
    for (const dx of [-0.05, 0.05]) (ctx.beginPath(), ctx.moveTo(sxp + dx * k, syp - k * 0.18), ctx.lineTo(sxp + dx * k, syp + k * 0.18), ctx.stroke());
    ctx.beginPath();
    ctx.arc(sxp, syp, k * 0.045, 0, TAU);
    fillOut(ctx, radg(ctx, sxp - k * 0.015, syp - k * 0.015, 0, k * 0.05, [0, '#ffffff'], [1, '#7a8698']), 1.4);
  }
}

// ── 물건 ──
function drawBarrel(ctx: C2, x: number, y: number, k: number, keg: boolean, t: number, pulse: number) {
  const wd = k * (keg ? 0.62 : 0.66), top = y - k;
  ctx.fillStyle = 'rgba(20,10,20,.35)';
  ell(ctx, x, y, wd * 0.6, wd * 0.2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - wd * 0.42, top + wd * 0.12);
  ctx.quadraticCurveTo(x - wd * 0.6, y - k * 0.5, x - wd * 0.42, y - wd * 0.08);
  ctx.quadraticCurveTo(x, y + wd * 0.12, x + wd * 0.42, y - wd * 0.08);
  ctx.quadraticCurveTo(x + wd * 0.6, y - k * 0.5, x + wd * 0.42, top + wd * 0.12);
  ctx.closePath();
  const body = keg ? lin(ctx, x - wd * 0.5, 0, x + wd * 0.5, 0, [0, '#7a1a14'], [0.45, '#d8443a'], [1, '#8a2018']) : lin(ctx, x - wd * 0.5, 0, x + wd * 0.5, 0, [0, '#7a4420'], [0.45, '#c88a4a'], [1, '#8a5428']);
  fillOut(ctx, body, Math.max(1.5, k * 0.04));
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = keg ? 'rgba(60,10,10,.35)' : 'rgba(70,35,15,.4)';
  ctx.lineWidth = 1;
  for (const dx of [-0.25, 0, 0.25]) (ctx.beginPath(), ctx.moveTo(x + dx * wd, top), ctx.quadraticCurveTo(x + dx * wd * 1.3, y - k * 0.5, x + dx * wd, y), ctx.stroke());
  ctx.restore();
  ctx.strokeStyle = keg ? '#1a1014' : '#3a3440';
  ctx.lineWidth = Math.max(2, k * 0.08);
  for (const u of [0.25, 0.75]) {
    const yy = top + k * u;
    ctx.beginPath();
    ctx.ellipse(x, yy, wd * 0.53, wd * 0.12, 0, 0.05, Math.PI - 0.05);
    ctx.stroke();
  }
  ell(ctx, x, top + wd * 0.12, wd * 0.42, wd * 0.14);
  fillOut(ctx, keg ? '#b8342a' : '#d9a066', Math.max(1.5, k * 0.035));
  if (!keg) {
    ctx.strokeStyle = 'rgba(90,50,20,.5)';
    ctx.lineWidth = 1;
    for (const dx of [-0.15, 0.1]) (ctx.beginPath(), ctx.moveTo(x + dx * wd, top + wd * 0.02), ctx.lineTo(x + dx * wd, top + wd * 0.22), ctx.stroke());
  } else {
    // 해골 표시 · 심지 · 불꽃
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.arc(x, y - k * 0.5, wd * 0.13, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#fff4e0';
    ctx.lineWidth = Math.max(1.5, k * 0.05);
    ctx.beginPath();
    ctx.moveTo(x - wd * 0.22, y - k * 0.32);
    ctx.lineTo(x + wd * 0.22, y - k * 0.2);
    ctx.moveTo(x + wd * 0.22, y - k * 0.32);
    ctx.lineTo(x - wd * 0.22, y - k * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#2a1020';
    for (const dx of [-0.05, 0.05]) (ctx.beginPath(), ctx.arc(x + dx * wd, y - k * 0.51, wd * 0.035, 0, TAU), ctx.fill());
    ctx.strokeStyle = '#3a2a20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top + wd * 0.1);
    ctx.quadraticCurveTo(x + wd * 0.2, top - k * 0.15, x + wd * 0.12, top - k * 0.25);
    ctx.stroke();
    const fl = 0.7 + 0.3 * Math.sin(t * 0.9) + pulse;
    ctx.fillStyle = radg(ctx, x + wd * 0.12, top - k * 0.27, 0, k * 0.16 * fl, [0, '#ffffff'], [0.3, '#ffe06a'], [0.7, 'rgba(255,120,40,.6)'], [1, 'rgba(255,90,30,0)']);
    ctx.beginPath();
    ctx.arc(x + wd * 0.12, top - k * 0.27, k * 0.16 * fl, 0, TAU);
    ctx.fill();
  }
}

function drawCannon(ctx: C2, x: number, y: number, k: number, dir: number, flash: number) {
  ctx.fillStyle = 'rgba(20,10,20,.4)';
  ell(ctx, x, y, k * 0.62, k * 0.2);
  ctx.fill();
  // 포가 (나무 받침)
  rr(ctx, x - k * 0.45, y - k * 0.42, k * 0.9, k * 0.34, k * 0.06);
  fillOut(ctx, lin(ctx, 0, y - k * 0.42, 0, y - k * 0.08, [0, '#a86a38'], [1, '#6a3a1a']), Math.max(1.5, k * 0.04));
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sd * k * 0.3, y - k * 0.12, k * 0.15, 0, TAU);
    fillOut(ctx, '#5a3018', Math.max(1.5, k * 0.04));
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.arc(x + sd * k * 0.3, y - k * 0.12, k * 0.045, 0, TAU);
    ctx.fill();
  }
  // 포신 (바깥쪽을 겨눔)
  ctx.save();
  ctx.translate(x, y - k * 0.5);
  ctx.scale(dir, 1);
  rr(ctx, -k * 0.38, -k * 0.16, k * 0.85, k * 0.3, k * 0.14);
  fillOut(ctx, lin(ctx, 0, -k * 0.16, 0, k * 0.14, [0, '#6a6e7e'], [0.35, '#2e3040'], [1, '#14141e']), Math.max(1.5, k * 0.045));
  ell(ctx, k * 0.47, -k * 0.01, k * 0.07, k * 0.16);
  fillOut(ctx, '#3a3c4c', Math.max(1.2, k * 0.035));
  ell(ctx, k * 0.48, -k * 0.01, k * 0.035, k * 0.09);
  ctx.fillStyle = '#0a0a10';
  ctx.fill();
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = Math.max(1.5, k * 0.04);
  for (const bx of [-0.1, 0.25]) (ctx.beginPath(), ctx.moveTo(bx * k, -k * 0.15), ctx.lineTo(bx * k, k * 0.13), ctx.stroke());
  // 뒤의 고리 (갈고리 걸 데)
  ctx.strokeStyle = '#c8ccd8';
  ctx.lineWidth = Math.max(1.5, k * 0.04);
  ctx.beginPath();
  ctx.arc(-k * 0.45, -k * 0.0, k * 0.08, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  rr(ctx, -k * 0.3, -k * 0.12, k * 0.6, k * 0.05, k * 0.02);
  ctx.fill();
  ctx.restore();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,240,180,${flash * 0.6})`;
    ell(ctx, x, y - k * 0.4, k * 0.7, k * 0.5);
    ctx.fill();
  }
}

/** 돛대: 갑판에서 하늘 위까지 (감아 둔 돛 · 줄사다리 · 깃발) */
function drawMast(ctx: C2, x: number, y: number, k: number, t: number, wrapped: number, flash: number) {
  const top = -k * 0.3, wd = k * 0.05;
  ctx.fillStyle = 'rgba(20,10,20,.35)';
  ell(ctx, x, y, wd * 2.4, wd * 0.8);
  ctx.fill();
  // 밑동 받침
  rr(ctx, x - wd * 1.6, y - wd * 1.2, wd * 3.2, wd * 1.4, wd * 0.4);
  fillOut(ctx, '#6a3a1a', 1.5);
  ctx.fillStyle = lin(ctx, x - wd, 0, x + wd, 0, [0, '#5a3018'], [0.4, '#b07a46'], [1, '#4a2410']);
  ctx.fillRect(x - wd, top, wd * 2, y - top - wd);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - wd, top, wd * 2, y - top - wd);
  ctx.fillStyle = '#3a3440';
  for (let yy = y - k * 0.25; yy > top; yy -= k * 0.22) ctx.fillRect(x - wd * 1.15, yy, wd * 2.3, wd * 0.5);
  // 감긴 갈고리 사슬
  if (wrapped > 0) {
    ctx.strokeStyle = '#c8ccd8';
    ctx.lineWidth = 2;
    for (let j = 0; j < 3; j++) {
      ell(ctx, x, y - k * 0.32 + j * 4, wd * 1.4, wd * 0.5);
      ctx.stroke();
    }
  }
  // 활대 · 감아 둔 돛
  const yy = Math.max(k * 0.12, y - k * 0.95);
  ctx.fillStyle = '#5a3018';
  rr(ctx, x - k * 0.42, yy - wd * 0.5, k * 0.84, wd, wd * 0.5);
  ctx.fill();
  for (let j = 0; j < 6; j++) {
    const sx = x - k * 0.36 + j * k * 0.144;
    ell(ctx, sx, yy + wd * 0.9, k * 0.085, wd * 1.3);
    fillOut(ctx, lin(ctx, 0, yy, 0, yy + wd * 2.2, [0, '#fff4e0'], [1, '#d8c8a8']), 1.2);
  }
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 1;
  for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.moveTo(x - k * 0.3 + j * k * 0.2, yy - wd), ctx.lineTo(x - k * 0.3 + j * k * 0.2, yy + wd * 2.2), ctx.stroke());
  // 깃발
  const fy = Math.max(k * 0.02, yy - k * 0.15);
  ctx.fillStyle = '#e2382c';
  ctx.beginPath();
  ctx.moveTo(x + wd, fy);
  for (let j = 0; j <= 6; j++) ctx.lineTo(x + wd + j * k * 0.04, fy + Math.sin(t * 0.15 + j * 0.8) * k * 0.012 + j * k * 0.006);
  for (let j = 6; j >= 0; j--) ctx.lineTo(x + wd + j * k * 0.04, fy + k * 0.07 + Math.sin(t * 0.15 + j * 0.8) * k * 0.012 - j * k * 0.006);
  ctx.closePath();
  fillOut(ctx, '#e2382c', 1.2);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,220,${flash * 0.5})`;
    ctx.fillRect(x - wd * 2, y - k * 0.5, wd * 4, k * 0.5);
  }
}

/** 상어: 바다에선 지느러미, 끌려오면 온몸 */
function drawShark(ctx: C2, x: number, y: number, k: number, ang: number, full: boolean, t: number, chomp: number) {
  if (!full) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(10,20,50,.35)';
    ell(ctx, 0, k * 0.05, k * 0.55, k * 0.16, Math.atan2(Math.sin(ang) * 0.5, Math.cos(ang)));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.5;
    const bx = -Math.cos(ang), by = -Math.sin(ang) * 0.5;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, k * 0.02);
      ctx.quadraticCurveTo(bx * k * 0.3 - by * sd * k * 0.1, by * k * 0.3 + bx * sd * k * 0.1, bx * k * 0.55 - by * sd * k * 0.25, by * k * 0.55 + bx * sd * k * 0.25);
      ctx.stroke();
    }
    const fc = Math.cos(ang) >= 0 ? 1 : -1;
    ctx.scale(fc, 1);
    ctx.beginPath();
    ctx.moveTo(-k * 0.16, k * 0.02);
    ctx.quadraticCurveTo(-k * 0.05, -k * 0.25, k * 0.12, -k * 0.38 + Math.sin(t * 0.1) * k * 0.02);
    ctx.quadraticCurveTo(k * 0.06, -k * 0.15, k * 0.14, k * 0.02);
    ctx.closePath();
    fillOut(ctx, lin(ctx, 0, -k * 0.38, 0, k * 0.02, [0, '#8a96b0'], [1, '#4a5670']), 1.6);
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-k * 0.22, k * 0.03);
    ctx.lineTo(k * 0.2, k * 0.03);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  const fc = Math.cos(ang) >= 0 ? 1 : -1;
  ctx.scale(fc, 1);
  ctx.rotate(Math.sin(t * 0.5) * 0.12);
  const L = k * 1.1;
  ctx.beginPath();
  ctx.moveTo(L * 0.55, -k * 0.05);
  ctx.quadraticCurveTo(L * 0.3, -k * 0.32, -L * 0.25, -k * 0.2);
  ctx.quadraticCurveTo(-L * 0.45, -k * 0.12, -L * 0.55, -k * 0.05);
  ctx.lineTo(-L * 0.75, -k * 0.3 + Math.sin(t * 0.8) * k * 0.08);
  ctx.lineTo(-L * 0.68, k * 0.02);
  ctx.lineTo(-L * 0.75, k * 0.2 + Math.sin(t * 0.8) * k * 0.08);
  ctx.lineTo(-L * 0.52, k * 0.05);
  ctx.quadraticCurveTo(0, k * 0.22, L * 0.5, k * 0.08);
  ctx.closePath();
  fillOut(ctx, lin(ctx, 0, -k * 0.3, 0, k * 0.2, [0, '#8a96b0'], [0.55, '#5a6680'], [0.6, '#f2f4f8'], [1, '#d8dce6']), 2);
  // 등지느러미
  ctx.beginPath();
  ctx.moveTo(-L * 0.05, -k * 0.24);
  ctx.quadraticCurveTo(L * 0.0, -k * 0.5, L * 0.12, -k * 0.55);
  ctx.quadraticCurveTo(L * 0.1, -k * 0.35, L * 0.18, -k * 0.26);
  fillOut(ctx, '#6a7690', 1.6);
  // 입 (냠냠)
  const open = 0.12 + 0.14 * Math.abs(Math.sin(t * 0.7)) + chomp * 0.1;
  ctx.beginPath();
  ctx.moveTo(L * 0.52, -k * 0.02);
  ctx.lineTo(L * 0.22, k * 0.02);
  ctx.lineTo(L * 0.5, k * (0.04 + open));
  ctx.closePath();
  fillOut(ctx, '#7a1e2a', 1.5);
  ctx.fillStyle = '#ffffff';
  for (let j = 0; j < 4; j++) {
    ctx.beginPath();
    ctx.moveTo(L * (0.27 + j * 0.06), k * 0.01);
    ctx.lineTo(L * (0.3 + j * 0.06), k * 0.05);
    ctx.lineTo(L * (0.33 + j * 0.06), k * 0.012);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(L * 0.36, -k * 0.13, k * 0.06, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#14101a';
  ctx.beginPath();
  ctx.arc(L * 0.38, -k * 0.13, k * 0.035, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 갈고리 머리 (세 갈래) */
function drawHookHead(ctx: C2, x: number, y: number, r: number, ang: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.lineCap = 'round';
  for (const [c, lw] of [[OUT, r * 0.42], ['#c8ccd8', r * 0.24]] as [string, number][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(r * 0.4, 0);
    for (const sd of [-1, 0, 1]) {
      ctx.moveTo(r * 0.3, 0);
      if (sd === 0) ctx.lineTo(r * 1.05, 0);
      else ctx.quadraticCurveTo(r * 0.9, sd * r * 0.9, r * 0.45, sd * r * 1.05);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.08, r * 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}
/** 사슬: 고리를 번갈아 그린다 */
function drawChain(ctx: C2, pts: number[][], link: number, shake: number) {
  let acc = 0, idx = 0;
  ctx.lineWidth = Math.max(1.6, link * 0.32);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    while (acc < L) {
      const u = acc / L, x = x0 + (x1 - x0) * u + Math.sin(idx * 1.7) * shake, y = y0 + (y1 - y0) * u + Math.cos(idx * 1.3) * shake;
      ctx.strokeStyle = OUT;
      ell(ctx, x, y, link * 0.62, idx % 2 ? link * 0.2 : link * 0.36, a);
      ctx.lineWidth = Math.max(2.4, link * 0.44);
      ctx.stroke();
      ctx.strokeStyle = idx % 2 ? '#8a90a2' : '#d8dce8';
      ctx.lineWidth = Math.max(1.3, link * 0.24);
      ctx.stroke();
      acc += link * 0.95;
      idx++;
    }
    acc -= L;
  }
}
/** 첫 안내 손가락 */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.08);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ell(ctx, k * 0.05, k * 0.55, k * 0.3, k * 0.08);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-k * 0.06, 0);
  ctx.quadraticCurveTo(-k * 0.06, -k * 0.09, 0, -k * 0.09);
  ctx.quadraticCurveTo(k * 0.06, -k * 0.09, k * 0.06, 0);
  ctx.lineTo(k * 0.06, k * 0.22);
  ctx.quadraticCurveTo(k * 0.2, k * 0.17, k * 0.24, k * 0.26);
  ctx.lineTo(k * 0.24, k * 0.42);
  ctx.quadraticCurveTo(k * 0.2, k * 0.6, k * 0.02, k * 0.6);
  ctx.quadraticCurveTo(-k * 0.16, k * 0.6, -k * 0.2, k * 0.42);
  ctx.lineTo(-k * 0.2, k * 0.3);
  ctx.quadraticCurveTo(-k * 0.2, k * 0.22, -k * 0.06, k * 0.24);
  ctx.closePath();
  fillOut(ctx, '#fff4e6', 2.2);
  ctx.restore();
}

// ── 장면 ──
interface Look { parrotT: number; say: string; gullT: number; hurtT: number; latchT: number; latchX: number; latchY: number; recent: { x: number; y: number; t: number; size: number }[] }
const LOOK = new WeakMap<object, Look>();
const SKH: Record<string, number> = { skel: 0.14, shield: 0.145, boss: 0.22 };
const dep = (y: number) => 0.86 + 0.24 * clamp(y, -0.1, 1.1);
const BIG_TXT = (n: number) => (n >= 4 ? `${numKo(n)} 와르르!!` : n === 3 ? '스트라이크!' : '쾅! 둘!');

function drawAll(ctx: C2, s: HookState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), t = s.t, d = STAGES[s.stage];
  let lk = LOOK.get(s);
  if (!lk) LOOK.set(s, (lk = { parrotT: -99, say: '', gullT: -99, hurtT: -99, latchT: -99, latchX: 0, latchY: 0, recent: [] }));
  const L = lk;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const bg = getBg(Math.round(w), Math.round(h), Math.min(3, Math.max(1, Math.round(sc))));
  const bob = Math.sin(t * 0.035) * w * 0.004, sway = Math.sin(t * 0.011) * w * 0.006;
  const X = (x: number) => x * w, Y = (y: number) => (PY0 + y * KY) * w + bob, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    x = clamp(x, w * 0.14, w * 0.86);
    y = clamp(y, R(0.16), R(GB - 0.04));
    for (let k = 0; k < 6 && L.recent.some((q) => t - q.t < 34 && Math.abs(q.x - x) < w * 0.28 && Math.abs(q.y - y) < (size + q.size) * 0.6); k++) y -= size + 3;
    L.recent.push({ x, y, t, size });
    if (L.recent.length > 12) L.recent.shift();
    fx.pop(x, y, text, col, size);
  };
  const squawk = (txt: string) => ((L.parrotT = t), (L.say = txt));

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 먼 섬 · 바다 (시차) ──
  ctx.drawImage(bg.sky, -R(0.02) + sway * 0.2, 0, w + R(0.04), R(HZ) + 2);
  ctx.drawImage(bg.isle, -R(0.15) + sway * 0.5, R(HZ) - bg.isle.height / sc + 2, bg.isle.width / sc, bg.isle.height / sc);
  ctx.drawImage(bg.sea, 0, R(HZ), w, h - R(HZ));
  // 갈매기
  for (let j = 0; j < 3; j++) {
    const gx = ((hsh(j + 3) * w + t * (0.25 + j * 0.08)) % (w * 1.2)) - w * 0.1, gy = R(0.13 + j * 0.035) + Math.sin(t * 0.02 + j) * R(0.01), fl = Math.sin(t * 0.18 + j * 2) * R(0.008);
    ctx.strokeStyle = 'rgba(60,30,60,.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(gx - R(0.018), gy - fl);
    ctx.quadraticCurveTo(gx - R(0.008), gy - R(0.008), gx, gy);
    ctx.quadraticCurveTo(gx + R(0.008), gy - R(0.008), gx + R(0.018), gy - fl);
    ctx.stroke();
  }
  // 물결 (먼 줄은 촘촘하고 느리게, 가까운 줄은 크고 빠르게)
  for (let row = 0; row < 15; row++) {
    const u = row / 14, yy = R(HZ) + (h - R(HZ)) * (u * u * 0.92 + 0.012), sp = 0.15 + u * 0.6, seg = R(0.04 + u * 0.09);
    ctx.strokeStyle = `rgba(255,${200 - u * 40},${190 + u * 30},${0.22 + u * 0.18})`;
    ctx.lineWidth = 1 + u * 1.6;
    const off = (t * sp + row * 37) % (seg * 2.2);
    for (let x0 = -seg * 2.2 + off; x0 < w + seg; x0 += seg * 2.2) {
      const xx = x0 + Math.sin(row * 7.3) * seg;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.quadraticCurveTo(xx + seg * 0.5, yy - R(0.004 + u * 0.006), xx + seg, yy);
      ctx.stroke();
    }
  }
  // 해 반짝임
  for (let j = 0; j < 16; j++) {
    const yy = R(HZ) + R(0.01 + hsh(j) * 0.3), xx = X(SUN_X) + (hsh(j + 5) - 0.5) * R(0.1 + (yy - R(HZ)) / w * 0.6);
    const a = Math.max(0, Math.sin(t * 0.08 + j * 1.7));
    ctx.fillStyle = `rgba(255,240,190,${0.7 * a})`;
    ctx.fillRect(xx - R(0.012), yy, R(0.024), 1.6);
  }
  // 배 둘레 물거품
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([R(0.03), R(0.02)]);
  ctx.lineDashOffset = -t * 0.6;
  poly(ctx, deckPts(w, -0.02), R(0.055) + bob * 0.5);
  ctx.stroke();
  ctx.restore();
  // ── 갑판 ──
  ctx.drawImage(bg.deck, 0, bob, w, h);
  // 사다리 (지금 기어오르는 해적이 있는 곳)
  for (const b of s.bodies) {
    if (b.st !== ENTER) continue;
    const rx = X(b.rx), ry = Y(b.ry), out = Math.sign(b.ox - b.rx) || 0;
    ctx.strokeStyle = '#c9a46a';
    ctx.lineWidth = 2;
    const lx = rx + out * R(0.03), ly0 = ry - R(0.01), ly1 = ry + R(out ? 0.07 : 0.0) + (out ? 0 : -R(0.07));
    for (const dx of [-R(0.012), R(0.012)]) (ctx.beginPath(), ctx.moveTo(lx + dx, ly0), ctx.lineTo(lx + dx + out * R(0.02), ly1 + R(0.04)), ctx.stroke());
    for (let j = 0; j < 4; j++) {
      const yy = ly0 + j * R(0.025), xx = lx + out * j * R(0.006);
      ctx.beginPath();
      ctx.moveTo(xx - R(0.012), yy);
      ctx.lineTo(xx + R(0.012), yy);
      ctx.stroke();
    }
  }
  // 위험 표시: 칼을 든 해적 → 선장 쪽 빨간 반달
  for (const b of s.bodies) {
    if (b.st !== WIND) continue;
    const u = 1 - b.tm / (WIND_T * d.wind * (b.k === 'boss' ? 1.3 : 1));
    const a = Math.atan2((s.cy - b.y) * KY, s.cx - b.x), rx = R(0.09 + (b.k === 'boss' ? 0.04 : 0));
    ctx.fillStyle = `rgba(255,60,50,${0.15 + 0.3 * u})`;
    ctx.beginPath();
    ctx.moveTo(X(b.x), Y(b.y));
    ctx.ellipse(X(b.x), Y(b.y), rx, rx * KY * 0.6, 0, a - 0.9, a + 0.9);
    ctx.closePath();
    ctx.fill();
  }
  // ── 서 있는 것들 (깊이 순) ──
  type Item = { y: number; f: () => void };
  const items: Item[] = [];
  const hk = s.hook;
  for (const b of s.bodies) {
    const bx = X(b.x), byy = Y(b.y);
    if (b.k === 'mast') {
      const fl = Math.max(0, 1 - (t - (fx.memo['m' + b.id] ?? -99)) / 14);
      items.push({ y: b.y, f: () => drawMast(ctx, bx, byy, w, t, hk.st === H_SPIN ? 1 : 0, fl) });
      continue;
    }
    if (b.k === 'shark') {
      if (b.st === DIVE) {
        if (b.tm > 200) items.push({ y: -1, f: () => ((ctx.globalAlpha = (b.tm - 200) / 40), drawShark(ctx, bx, byy - bob, R(0.1), b.ang + Math.PI / 2, false, t, 0), (ctx.globalAlpha = 1)) });
        continue;
      }
      const full = b.st === HOOKED || b.st === LEAP;
      items.push({ y: full ? b.y : -1, f: () => drawShark(ctx, bx, (full ? byy : byy - bob) - R(b.z) - (full ? R(0.03) : 0), R(0.1) * dep(b.y), full ? Math.atan2(s.cy - b.y, s.cx - b.x) : b.ang + Math.PI / 2, full, t, Math.max(0, 1 - (t - b.hurtT) / 20)) });
      continue;
    }
    if (b.k === 'barrel' || b.k === 'keg') {
      const k = R(b.k === 'keg' ? 0.075 : 0.085) * dep(b.y), z = R(b.z);
      items.push({
        y: b.y,
        f: () => {
          if (b.st === DROP) (ctx.fillStyle = `rgba(20,10,20,${0.35 * (1 - b.z / 0.32)})`), ell(ctx, bx, byy, k * 0.4, k * 0.13), ctx.fill();
          const tilt = b.st === HOOKED ? -0.25 * Math.sign(s.cx - b.x || 1) : 0;
          ctx.save();
          ctx.translate(bx, byy - z);
          ctx.rotate(tilt + (b.st === HOOKED ? Math.sin(t * 0.9) * 0.08 : 0));
          drawBarrel(ctx, 0, 0, k, b.k === 'keg', t, b.st === HOOKED ? 0.5 : 0);
          ctx.restore();
        },
      });
      continue;
    }
    if (b.k === 'cannon') {
      const k = R(0.1) * dep(b.y), fl = Math.max(0, 1 - (t - (fx.memo['c' + b.id] ?? -99)) / 12);
      items.push({ y: b.y, f: () => drawCannon(ctx, bx, byy, k, b.x < 0.5 ? -1 : 1, fl) });
      continue;
    }
    // 해골 해적
    if (b.st === GONE) continue;
    const k = R(SKH[b.k]) * dep(b.y);
    items.push({
      y: b.y + (b.st === FLY ? 0.02 : 0),
      f: () => {
        let x = bx, y = byy, alpha = 1;
        const fly = b.st === FLY;
        if (b.st === ENTER) {
          const u = Math.min(1, b.tm / ENTER_T);
          y += (1 - u) * k * 0.5;
          alpha = Math.min(1, 0.35 + u);
        }
        if (fly) y -= R(b.z);
        if (b.st === HOOKED) x += Math.sin(t * 1.4) * 1.5;
        if (!fly) {
          ctx.fillStyle = 'rgba(20,8,20,.35)';
          ell(ctx, bx, byy, k * (b.k === 'boss' ? 0.36 : 0.26), k * 0.08);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(20,8,20,${0.25 * Math.max(0, 1 - b.z * 4)})`;
          ell(ctx, bx, byy, k * 0.22, k * 0.06);
          ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        if (fly) (ctx.translate(0, -k * 0.5), ctx.rotate(b.rot), ctx.translate(0, k * 0.5));
        if (b.st === HOOKED) ctx.rotate(-0.35 * Math.sign(s.cx - b.x || 1));
        const face = Math.cos(b.fa) >= 0 ? 1 : -1;
        ctx.scale(face, 1);
        const flashHit = t - b.hurtT < 8;
        if (flashHit) (ctx.shadowColor = '#ffffff'), (ctx.shadowBlur = 12);
        drawSkel(ctx, k, { k: b.k, walk: b.st === WALK && !(b.tut && !s.firstThrow) ? t * 0.28 + b.seed : 0, wind: b.st === WIND ? 1 : 0, hurt: b.st === STUN ? 1 : 0, fly, seed: b.seed, t, hp: b.hp, scared: fly || b.st === HOOKED });
        ctx.restore();
        ctx.shadowBlur = 0;
        if (b.st === STUN && b.k !== 'boss') {
          for (let j = 0; j < 3; j++) {
            const a = t * 0.15 + (j * TAU) / 3;
            ctx.fillStyle = '#ffe26a';
            starPath(ctx, x + Math.cos(a) * k * 0.28, y - k * 1.05 + Math.sin(a) * k * 0.08, k * 0.06);
            ctx.fill();
          }
        }
        if (b.st === WIND) {
          const pulse = 1 + 0.18 * Math.sin(t * 0.7);
          ctx.save();
          ctx.translate(x + k * 0.2, y - k * 1.15);
          ctx.scale(pulse, pulse);
          ctx.fillStyle = '#ff4a3d';
          ctx.beginPath();
          ctx.arc(0, 0, R(0.02), 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          font(0.03, 900);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', 0, 1);
          ctx.restore();
        }
        if (b.k === 'boss' && !fly) {
          for (let j = 0; j < 3; j++) {
            ctx.save();
            ctx.translate(x + (j - 1) * k * 0.16, y - k * 1.42);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = j < b.hp ? '#ff5a4e' : 'rgba(255,255,255,.25)';
            ctx.fillRect(-k * 0.045, -k * 0.045, k * 0.09, k * 0.09);
            ctx.strokeStyle = OUT;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-k * 0.045, -k * 0.045, k * 0.09, k * 0.09);
            ctx.restore();
          }
        }
      },
    });
  }
  // 부서진 조각 (뼈·판자·모자)
  for (const q of s.bits) {
    items.push({
      y: q.y,
      f: () => {
        const age = t - q.t, a = Math.min(1, (110 - age) / 25);
        if (a <= 0) return;
        const x = X(q.x), y = Y(q.y) - R(q.z);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(20,8,20,.25)';
        ell(ctx, x, Y(q.y), R(0.012), R(0.004));
        ctx.fill();
        ctx.translate(x, y);
        ctx.rotate(q.r);
        if (q.k === 0) bone(ctx, -R(0.014), 0, R(0.014), 0, R(0.007));
        else if (q.k === 1) (rr(ctx, -R(0.02), -R(0.005), R(0.04), R(0.01), 2), fillOut(ctx, q.c ? '#c8382a' : '#b07a46', 1.2));
        else if (q.k === 2) (ell(ctx, 0, 0, R(0.022), R(0.02)), fillOut(ctx, '#f4ead2', 1.4), (ctx.fillStyle = '#2a1424'), ell(ctx, -R(0.007), 0, R(0.005), R(0.006)), ctx.fill(), ell(ctx, R(0.007), 0, R(0.005), R(0.006)), ctx.fill());
        ctx.restore();
      },
    });
  }
  // 선장
  const capK = R(0.18) * dep(s.cy);
  const capPose = s.phase === 'result' ? (s.ok ? 5 : 6) : t - L.hurtT < 30 ? 7 : hk.st === H_PULL ? 3 : hk.st === H_SPIN ? 4 : hk.st === H_YANK ? 2 : hk.st === H_OUT ? 1 : t - (fx.memo.bigT ?? -99) < 50 && (fx.memo.bigN ?? 0) >= 3 ? 5 : 0;
  const cpx = X(s.cx), cpy = Y(s.cy) - (hk.st === H_PULL ? R(0.03) : hk.st === H_SPIN ? R(0.02) : 0);
  const hand = { x: cpx + s.face * capK * 0.36, y: cpy - capK * 0.52 };
  // 갈고리가 향한 곳 (화면)
  let tgx = X(hk.x), tgy = Y(hk.y);
  const tb = hk.id ? byId(s, hk.id) : undefined;
  if (tb && (hk.st === H_YANK || hk.st === H_PULL)) (tgx = X(tb.x)), (tgy = Y(tb.y) - R(tb.k === 'cannon' ? 0.04 : PIR(tb.k) ? SKH[tb.k] * 0.5 : 0.035));
  if (hk.st === H_SPIN) (tgx = X(hk.mx)), (tgy = Y(hk.my) - R(0.07));
  const aim = Math.atan2(tgy - hand.y, (tgx - hand.x) * s.face);
  items.push({
    y: s.cy + 0.001,
    f: () => {
      ctx.fillStyle = 'rgba(20,8,20,.38)';
      ell(ctx, X(s.cx), Y(s.cy), capK * 0.3, capK * 0.08);
      ctx.fill();
      const blinkOff = s.inv > 0 && s.phase === 'play' && t - L.hurtT < INV && Math.floor(t / 4) % 2 === 0;
      ctx.save();
      if (blinkOff) ctx.globalAlpha = 0.45;
      if (s.hook.st === H_SPIN) {
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(X(hk.mx), Y(hk.my), R(hk.R), R(hk.R) * KY, 0, 0, TAU);
        ctx.stroke();
      }
      drawCaptain(ctx, cpx, cpy, capK, { pose: capPose, face: s.face, t, aim, soot: s.soot, dizzy: s.dizzy, squawk: 0, blink: Math.floor(t / 7) % 31 === 0 });
      ctx.restore();
      drawParrot(ctx, cpx - s.face * capK * 0.17, cpy - capK * 0.6 + Math.sin(t * 0.08) * 1.2, capK * 0.55, t, Math.max(0, 40 - (t - L.parrotT)), -s.face);
      if (t - L.parrotT < 50 && L.say) {
        const bx = cpx - s.face * capK * 0.35, by = cpy - capK * 1.1;
        font(0.034, 900);
        const tw = ctx.measureText(L.say).width + R(0.03);
        const lx = clamp(bx, tw / 2 + 4, w - tw / 2 - 4);
        ctx.fillStyle = '#fffaf0';
        rr(ctx, lx - tw / 2, by - R(0.024), tw, R(0.048), R(0.02));
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#c8261c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(L.say, lx, by + 1);
      }
      // 위험: 곧 맞는다
      if (s.phase === 'play' && s.bodies.some((b) => b.st === WIND && Math.hypot(b.x - s.cx, b.y - s.cy) < reachOf(b) + 0.05)) {
        const pulse = 1 + 0.15 * Math.sin(t * 0.6);
        ctx.save();
        ctx.translate(cpx + s.face * capK * 0.35, cpy - capK * 1.2);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ff2a2a';
        ctx.beginPath();
        ctx.arc(0, 0, R(0.024), 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        font(0.034, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 1);
        ctx.restore();
      }
    },
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // ── 갈고리와 사슬 ──
  if (hk.st === H_OUT || hk.st === H_BACK || hk.st === H_YANK || hk.st === H_PULL || hk.st === H_SPIN) {
    let hx = tgx, hy = tgy, z = 0;
    if (hk.st === H_OUT || hk.st === H_BACK) {
      const u = hk.st === H_OUT ? clamp(1 - Math.hypot(hk.tx - hk.x, hk.ty - hk.y) / hk.d0, 0, 1) : 0.15;
      z = Math.sin(u * Math.PI) * R(0.06 + hk.d0 * 0.12);
      hx = X(hk.x);
      hy = Y(hk.y) - z - R(0.03);
    }
    const pts: number[][] = [];
    const taut = hk.st === H_YANK || hk.st === H_PULL || hk.st === H_SPIN;
    const mx = (hand.x + hx) / 2, my = (hand.y + hy) / 2 - (taut ? 0 : z * 0.5 + R(0.02));
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      pts.push([(1 - u) * (1 - u) * hand.x + 2 * u * (1 - u) * mx + u * u * hx, (1 - u) * (1 - u) * hand.y + 2 * u * (1 - u) * my + u * u * hy]);
    }
    // 사슬 그림자
    ctx.strokeStyle = 'rgba(20,8,20,.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(s.cx), Y(s.cy));
    ctx.lineTo(hk.st === H_OUT || hk.st === H_BACK ? X(hk.x) : tgx, hk.st === H_OUT || hk.st === H_BACK ? Y(hk.y) : Y(tb ? tb.y : hk.my));
    ctx.stroke();
    if (taut) {
      ctx.strokeStyle = 'rgba(255,240,200,.35)';
      ctx.lineWidth = R(0.022);
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }
    drawChain(ctx, pts, R(0.016), taut ? 0.8 : 0);
    if (!taut) drawHookHead(ctx, hx, hy, R(0.022), Math.atan2(hy - my, hx - mx));
    // 속도선 (끌려오는 것 뒤)
    if (hk.st === H_YANK && tb) {
      const ang = Math.atan2(Y(s.cy) - Y(tb.y), X(s.cx) - X(tb.x));
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      for (let j = -1; j <= 1; j++) {
        const ox = -Math.sin(ang) * j * R(0.02), oy = Math.cos(ang) * j * R(0.02);
        ctx.beginPath();
        ctx.moveTo(X(tb.x) + ox - Math.cos(ang) * R(0.03), Y(tb.y) - R(0.03) + oy - Math.sin(ang) * R(0.03));
        ctx.lineTo(X(tb.x) + ox - Math.cos(ang) * R(0.1), Y(tb.y) - R(0.03) + oy - Math.sin(ang) * R(0.1));
        ctx.stroke();
      }
    }
    if (hk.st === H_PULL) {
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 2;
      const ang = Math.atan2(tgy - cpy, tgx - cpx);
      for (let j = 0; j < 4; j++) {
        const oy = (j - 1.5) * R(0.018);
        ctx.beginPath();
        ctx.moveTo(cpx - Math.cos(ang) * R(0.05) - Math.sin(ang) * oy, cpy - capK * 0.5 - Math.sin(ang) * R(0.05) + Math.cos(ang) * oy);
        ctx.lineTo(cpx - Math.cos(ang) * R(0.14) - Math.sin(ang) * oy, cpy - capK * 0.5 - Math.sin(ang) * R(0.14) + Math.cos(ang) * oy);
        ctx.stroke();
      }
    }
  }
  // 갈고리 걸린 순간 '척' 반짝
  if (t - L.latchT < 10) {
    const a = 1 - (t - L.latchT) / 10;
    ctx.strokeStyle = `rgba(255,250,210,${a})`;
    ctx.lineWidth = 3;
    for (let j = 0; j < 8; j++) {
      const an = (j * TAU) / 8, r0 = R(0.02 + (1 - a) * 0.03), r1 = r0 + R(0.025);
      ctx.beginPath();
      ctx.moveTo(L.latchX + Math.cos(an) * r0, L.latchY + Math.sin(an) * r0);
      ctx.lineTo(L.latchX + Math.cos(an) * r1, L.latchY + Math.sin(an) * r1);
      ctx.stroke();
    }
  }
  // ── 물보라 ──
  for (const q of s.splashes) {
    const age = t - q.t, u = age / 70, x = X(q.x), y = (PY0 + q.y * KY) * w;
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - u)})`;
    ctx.lineWidth = 2;
    for (const rr0 of [0.03, 0.055]) {
      ell(ctx, x, y, R(rr0 * q.big) * (0.4 + u * 1.4), R(rr0 * q.big) * 0.35 * (0.4 + u * 1.4));
      ctx.stroke();
    }
    if (age < 30) {
      const v = age / 30;
      for (let j = 0; j < 9; j++) {
        const an = -Math.PI / 2 + (j - 4) * 0.28, ht = R(0.07 * q.big) * Math.sin(v * Math.PI) * (0.6 + hsh(j + q.t) * 0.6);
        const px = x + Math.cos(an) * R(0.04 * q.big) * v * 1.5, py = y + Math.sin(an) * ht;
        ctx.fillStyle = j % 2 ? 'rgba(220,245,255,.9)' : 'rgba(150,210,255,.85)';
        ell(ctx, px, py, R(0.007), R(0.012), an + Math.PI / 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - v)})`;
      ell(ctx, x, y - R(0.012) * (1 - v), R(0.035 * q.big) * (0.5 + v), R(0.012 * q.big));
      ctx.fill();
    }
    if (q.hat && age > 20) {
      const hx = x + Math.sin(age * 0.05) * R(0.01), hy = y + Math.sin(age * 0.1) * 1.5;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (70 - age) / 15);
      ctx.translate(hx, hy);
      ctx.rotate(Math.sin(age * 0.07) * 0.3);
      ctx.beginPath();
      ctx.moveTo(-R(0.025), 0);
      ctx.quadraticCurveTo(0, -R(0.03), R(0.025), 0);
      ctx.quadraticCurveTo(0, R(0.008), -R(0.025), 0);
      fillOut(ctx, q.hat === 2 ? '#2a2238' : '#d8342a', 1.2);
      ctx.restore();
    }
  }
  // 미리 보기: 지금 끌면 몇이 쓰러지나 (물건 위 작은 딱지)
  if (s.phase === 'play' && hk.st === H_IDLE && s.firstThrow) {
    for (const b of s.bodies) {
      if (PIR(b.k) || !hookable(b) || Math.hypot(b.x - s.cx, b.y - s.cy) > ROPE + RAD[b.k]) continue;
      const P = plan(s, b);
      if (P.n < 2 || P.self) continue;
      const c = visCenter(b), bx = X(c.x), by = c.y * w + bob - R(b.k === 'mast' ? 0.02 : VIS[b.k] * 0.5 + 0.035);
      const txt = `×${P.n}`;
      font(0.032, 900);
      const tw = ctx.measureText(txt).width + R(0.03);
      ctx.fillStyle = P.n >= 3 ? 'rgba(255,214,74,.95)' : 'rgba(255,250,240,.92)';
      rr(ctx, bx - tw / 2, by - R(0.02), tw, R(0.04), R(0.02));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = OUT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, bx, by + 1);
    }
  }
  // 첫 안내: 손가락 하나 (술통을 톡)
  if (s.stage === 0 && !s.firstThrow && s.phase === 'play') {
    const tut = s.bodies.find((b) => b.k === 'barrel' && b.tut && b.st === SIT);
    if (tut) {
      const tx = X(tut.x), ty = Y(tut.y) - R(0.04), cyc = (t % 70) / 70, press = cyc < 0.4 ? cyc / 0.4 : cyc < 0.6 ? 1 : 1 - (cyc - 0.6) / 0.4;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = t * 0.8;
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      ctx.quadraticCurveTo((hand.x + tx) / 2 + R(0.1), (hand.y + ty) / 2, tx, ty + R(0.02));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255,236,150,${0.95 - press * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, R(0.045 + press * 0.03), 0, TAU);
      ctx.stroke();
      drawHand(ctx, tx + R(0.01), ty + R(0.01), R(0.11), press);
      ctx.restore();
    }
  }
  // 새것 스포트라이트
  if (s.spot && t >= s.spot.t) {
    const b = byId(s, s.spot.id), age = t - s.spot.t;
    if (b && age < 120) {
      const a = Math.min(1, age / 10, (120 - age) / 20), c = visCenter(b), cx = X(c.x), cy = c.y * w + bob - (b.k === 'mast' ? R(0.05) : 0), r0 = R(Math.max(0.09, VIS[b.k] * 0.7));
      ctx.save();
      ctx.fillStyle = `rgba(10,4,20,${0.55 * a})`;
      ctx.beginPath();
      ctx.rect(-20, -20, w + 40, R(GB) + 20);
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,74,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.038, 900);
      const label = `NEW  ${s.spot.label}`, tw = Math.min(w - R(0.06), ctx.measureText(label).width + R(0.05));
      const lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6), ly = cy - r0 - R(0.05) < R(0.14) ? cy + r0 + R(0.05) : cy - r0 - R(0.05);
      ctx.fillStyle = '#ffd84a';
      rr(ctx, lx - tw / 2, ly - R(0.028), tw, R(0.056), R(0.028));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#2a1420';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1, tw - R(0.03));
      ctx.restore();
    }
  }
  // 큰 순간: 노란 빛 테두리
  if (s.slowT > 0) {
    ctx.fillStyle = radg(ctx, w / 2, h * 0.45, w * 0.35, w * 0.95, [0, 'rgba(255,200,80,0)'], [1, `rgba(255,170,60,${0.25 * Math.min(1, s.slowT / 20)})`]);
    ctx.fillRect(0, 0, w, h);
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.kind) {
      case 'throw':
        say(cpx + s.face * R(0.06), cpy - capK * 1.05, '휙!', '#fff4d0', 15);
        fx.burst(cpx, Y(s.cy), '#e8d0a8', 5, 1.5, 1.6);
        break;
      case 'latch':
        L.latchT = t;
        L.latchX = ex;
        L.latchY = ey - R(e.k && PIR(e.k) ? SKH[e.k] * 0.5 : 0.04);
        say(ex, L.latchY - R(0.05), e.k === 'mast' ? '휘리릭!' : e.k === 'cannon' || e.k === 'boss' ? '척! 으앗?' : '척!', '#ffffff', e.k === 'cannon' || e.k === 'boss' ? 16 : 18);
        fx.kick(2.5);
        if (e.k === 'mast') fx.memo['m' + (s.bodies.find((b) => b.k === 'mast')?.id ?? 0)] = t;
        break;
      case 'clang':
        fx.burst(ex, ey - R(0.06), '#ffe9a0', 14, 3.2, 2);
        fx.kick(4);
        say(ex, ey - R(0.15), '챙!', '#ffd86b', 20);
        break;
      case 'miss':
        say(ex, ey - R(0.06), '헛방!', '#e6dcef', 15);
        if (!e.n) s.splashes.push({ x: e.x, y: e.y, t, big: 0.6, hat: 0 });
        else fx.burst(ex, ey, '#c8955a', 8, 2, 1.8);
        break;
      case 'ko': {
        const n = e.n ?? 1;
        fx.burst(ex, ey - R(0.06) - R(e.z ?? 0), '#fff8e8', 8 + Math.min(10, n * 2), 3 + n * 0.4, 2);
        fx.ring(ex, ey - R(0.05), n >= 3 ? '#ffd84a' : '#ffffff', R(0.05 + Math.min(5, n) * 0.012), 3);
        fx.kick(Math.min(10, 2 + n * 1.5));
        if (e.text === 'kick') say(ex, ey - R(0.13), '뻥!', '#ffe9a8', 20);
        else if (e.text === 'chomp') say(ex, ey - R(0.12), '냠!', '#9ff0ff', 20);
        else if (e.text === 'chain' && n < 3) say(ex, ey - R(0.12), '쿵!', '#ffd0a0', 15);
        else if (e.text !== 'boom' && n === 1) say(ex, ey - R(0.12), '쾅!', '#ffffff', 17);
        break;
      }
      case 'multi': {
        const n = e.n ?? 2;
        fx.memo.bigT = t;
        fx.memo.bigN = n;
        fx.memo.bigX = ex;
        fx.memo.bigY = ey;
        fx.blink('#fff6d0', Math.min(0.45, 0.12 + n * 0.07));
        fx.kick(3 + n * 2);
        fx.burst(ex, ey - R(0.05), '#ffd84a', 10 + n * 5, 4 + n * 0.5, 2.6);
        squawk(n >= 4 ? `꽥! ${numKo(n)}!!` : n === 3 ? '꽥! 스트라이크!' : '꽥!');
        L.gullT = t;
        break;
      }
      case 'splash':
      case 'gulp': {
        const big = (e.n ?? 1) >= 2 ? 1.6 : 1;
        s.splashes.push({ x: e.x, y: e.y, t, big, hat: e.k === 'boss' ? 2 : e.k ? 1 : 0 });
        if (s.splashes.length > 14) s.splashes.shift();
        fx.burst(ex, (PY0 + e.y * KY) * w, '#bfe8ff', 10, 2.6, 2);
        if (e.kind === 'gulp' || t - (fx.memo.bigT ?? -99) > 40 || t - (fx.memo.spl ?? -99) > 20) (fx.memo.spl = t), say(ex, (PY0 + e.y * KY) * w - R(0.07), e.kind === 'gulp' ? '냠!' : '풍덩!', e.kind === 'gulp' ? '#9ff0ff' : '#dff4ff', 15);
        break;
      }
      case 'crumble':
        for (let j = 0; j < 6; j++) s.bits.push({ x: e.x, y: e.y, z: 0.02, vx: (hsh(t + j) - 0.5) * 0.012, vy: (hsh(t + j + 7) - 0.5) * 0.008, vz: 0.012 + hsh(j + t * 3) * 0.01, r: hsh(j) * 6, vr: (hsh(j + 2) - 0.5) * 0.4, k: j === 0 ? 2 : 0, t, c: 0 });
        if (t - (fx.memo.bigT ?? -99) > 40) say(ex, ey - R(0.08), '와르르', '#f4ead2', 14);
        fx.burst(ex, ey, '#d8c8a8', 8, 2.2, 1.8);
        break;
      case 'shatter':
        for (let j = 0; j < 7; j++) s.bits.push({ x: e.x, y: e.y, z: 0.03, vx: (hsh(t + j * 3) - 0.5) * 0.014, vy: (hsh(t + j + 11) - 0.5) * 0.01, vz: 0.012 + hsh(j + t) * 0.012, r: hsh(j + 1) * 6, vr: (hsh(j + 4) - 0.5) * 0.5, k: 1, t, c: 0 });
        if (t - (fx.memo.bigT ?? -99) > 30) say(ex, ey - R(0.1), '와장창!', '#ffd9a0', 16);
        fx.burst(ex, ey - R(0.04), '#c8955a', 12, 3, 2.2);
        fx.kick(4);
        break;
      case 'boom':
        fx.burst(ex, ey - R(0.04), '#fff2a0', 26, 6, 3.2);
        fx.burst(ex, ey - R(0.04), '#ff6a2d', 22, 4.5, 3);
        fx.burst(ex, ey - R(0.04), '#3a2a30', 14, 2.6, 4);
        fx.ring(ex, ey, '#ffb347', R(BLAST), 7);
        fx.kick(13);
        fx.blink('#ffb347', 0.4);
        say(ex, ey - R(0.14), '펑!', '#ffd166', 28);
        for (let j = 0; j < 6; j++) s.bits.push({ x: e.x, y: e.y, z: 0.03, vx: (hsh(t + j * 5) - 0.5) * 0.02, vy: (hsh(t + j + 13) - 0.5) * 0.014, vz: 0.016 + hsh(j + t) * 0.012, r: hsh(j + 3) * 6, vr: (hsh(j + 6) - 0.5) * 0.6, k: 1, t, c: 1 });
        squawk('꽥! 펑!');
        break;
      case 'bosshit':
        say(ex, ey - R(0.24), e.n === 1 ? '으윽! 한 번 더!' : '으윽!', '#ffd0c8', 18);
        fx.kick(7);
        fx.burst(ex, ey - R(0.12), '#ffffff', 12, 3, 2.2);
        break;
      case 'bossko':
        squawk('꽥! 해골 선장이다!');
        fx.blink('#ffffff', 0.5);
        break;
      case 'hurt':
        fx.blink('#ff3b30', 0.3);
        fx.kick(10);
        fx.burst(cpx, cpy - capK * 0.6, '#ffb0a0', 14, 3.2, 2.2);
        say(cpx, cpy - capK * 1.3, '아야!', '#ffb3a8', 20);
        L.hurtT = t;
        squawk('꽥! 조심!');
        break;
      case 'soot':
        fx.burst(cpx, cpy - capK * 0.7, '#2a2028', 18, 3, 3.4);
        say(cpx, cpy - capK * 1.3, '콜록!', '#e8e0e8', 20);
        L.hurtT = t;
        break;
      case 'kick':
        fx.burst(cpx + s.face * capK * 0.3, cpy - capK * 0.2, '#ffffff', 8, 2.5, 1.8);
        break;
      case 'clunk':
        say(ex, ey - R(0.1), '쿵', '#ffe0b0', 15);
        fx.burst(ex, ey, '#c8a070', 10, 2.4, 2);
        fx.kick(4);
        fx.memo['c' + (s.bodies.find((b) => b.k === 'cannon' && Math.hypot(b.x - e.x, b.y - e.y) < 0.01)?.id ?? 0)] = t;
        break;
      case 'thud':
        say(ex, ey - R(0.16), '쿵!', '#ffe0b0', 18);
        fx.kick(6);
        break;
      case 'spinend':
        say(cpx, cpy - capK * 1.25, '어질어질~', '#e8dcff', 14);
        break;
      case 'drop':
        fx.ring(ex, ey, '#f2d8b0', R(0.05), 2);
        say(ex, ey - R(0.09), '툭', '#f2d8b0', 13);
        break;
      case 'climb':
        fx.burst(ex, ey, '#bfe8ff', 4, 1.2, 1.4);
        break;
      case 'sharkjump':
      case 'sharkup':
        s.splashes.push({ x: e.x, y: e.y, t, big: 1.2, hat: 0 });
        break;
      case 'bonk':
        fx.burst(ex, ey - R(0.06), '#ffe26a', 6, 2.4, 1.8);
        break;
      case 'clear':
        fx.burst(w * 0.3, R(0.75), '#ffd84a', 30, 6, 3);
        fx.burst(w * 0.7, R(0.75), '#ff8a6a', 30, 6, 3);
        fx.ring(w / 2, R(0.8), '#ffd84a', R(0.45), 7);
        fx.blink('#fff6c8', 0.25);
        squawk('꽥! 배를 지켰다!');
        break;
      case 'fail':
        fx.kick(7);
        squawk('꽥… 다시!');
        break;
    }
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h, fx);
}

function drawHud(ctx: C2, s: HookState, w: number, h: number, fx: ReturnType<typeof juice>) {
  const t = s.t, d = STAGES[s.stage], R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  // 큰 순간 띠: 나무 팻말 위 '스트라이크!'
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 56) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN, sc2 = age < 6 ? 1.9 - 0.9 * (age / 6) : 1 + 0.03 * Math.sin(age * 0.4), a = Math.min(1, (56 - age) / 16);
    const bx = clamp(fx.memo.bigX, w * 0.34, w * 0.66), by = R(0.3);
    const txt = BIG_TXT(n), size = Math.min(34, 20 + n * 3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.06);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width, pw = tw + 30, ph = size * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    rr(ctx, -pw / 2 + 3, -ph / 2 + 4, pw, ph, 10);
    ctx.fill();
    rr(ctx, -pw / 2, -ph / 2, pw, ph, 10);
    fillOut(ctx, lin(ctx, 0, -ph / 2, 0, ph / 2, [0, '#c88a4a'], [1, '#8a5428']), 3);
    ctx.strokeStyle = 'rgba(60,30,10,.35)';
    ctx.lineWidth = 1;
    for (const yy of [-ph / 6, ph / 6]) (ctx.beginPath(), ctx.moveTo(-pw / 2 + 4, yy), ctx.lineTo(pw / 2 - 4, yy), ctx.stroke());
    ctx.fillStyle = '#d9a441';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * (pw / 2 - 8), sy * (ph / 2 - 7), 2.6, 0, TAU), ctx.fill());
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#2a1408';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#fff6c2'], [0.55, '#ffd23f'], [1, '#ff9a2e']);
    ctx.fillText(txt, 0, 2);
    if (n >= 3)
      for (let i = 0; i < 4; i++) {
        const an = t * 0.08 + (i * TAU) / 4;
        ctx.fillStyle = '#fff3b0';
        starPath(ctx, Math.cos(an) * (pw / 2 + 8), Math.sin(an) * (ph / 2 + 6), 5);
        ctx.fill();
      }
    ctx.restore();
  }
  // ═════════════ 위 띠: 판 · 하트 · 별 ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, '#4a2a18'], [1, '#2e180e']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(255,214,140,.12)';
  for (let x = 0; x < w; x += R(0.16)) ctx.fillRect(x, 0, 1, hb);
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(0, hb - 2, w, 2);
  {
    const cx = R(0.055), cy = hb / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.03), 0, TAU);
    fillOut(ctx, lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe08a'], [1, '#c8902a']), 2);
    ctx.fillStyle = '#3a2008';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff6e0';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.1), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.034, 700);
    ctx.fillStyle = '#d8b890';
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  }
  {
    const cy = hb / 2;
    ctx.textAlign = 'right';
    font(0.042, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.025), cy, R(0.02));
    fillOut(ctx, '#ffd84a', 1.2);
    for (let j = 0; j < 3; j++) {
      const hx = w - R(0.03) - sw - R(0.085) - j * R(0.052);
      heartPath(ctx, hx, cy, R(0.018));
      if (2 - j < s.hearts) fillOut(ctx, lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#d62b3d']), 1.4);
      else fillOut(ctx, 'rgba(255,255,255,.12)', 1.4, 'rgba(255,255,255,.35)');
    }
  }
  // 판 카드 (하늘 띠 안 — 갑판을 가리지 않는다)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '바다를 다 지켰다!' : '배를 지켰다!';
      else (head = `으앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 꼬마 선장이 쉬러 가요');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : '술통을 톡 하면 확 끌어와요';
    }
    if (head) {
      const cy = R(0.18), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.045, 900);
      const w1 = ctx.measureText(head).width;
      font(0.034, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.06), Math.max(w1, w2) + R(0.1)) * unroll, ch = sub || (s.phase === 'result' && s.ok) ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - ch / 2 + 4, cw, ch, R(0.02));
      ctx.fill();
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.02));
      fillOut(ctx, lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#fbf0d6'], [1, '#e6d0a0']), 2, '#7a4a20');
      ctx.fillStyle = '#6a3a18';
      for (const sx of [-1, 1]) {
        rr(ctx, w / 2 + (sx * cw) / 2 - R(0.012), cy - ch / 2 - R(0.012), R(0.024), ch + R(0.024), R(0.012));
        ctx.fill();
      }
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.045, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#8a4a08' : '#9a2a20') : '#3a1e0c';
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.025));
        const n = d.stars.length;
        for (let j = 0; j < n; j++) {
          const ag = s.pt - (12 + j * 12), sx = w / 2 + (j - (n - 1) / 2) * R(0.075), sy = cy + R(0.032);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.027) * (ag < 0 ? 1 : pop));
          const on = ag >= 0 && s.starOk[j];
          fillOut(ctx, on ? '#ffc93a' : 'rgba(90,60,20,.18)', 1.6, on ? '#7a4a08' : 'rgba(90,60,20,.4)');
          if (on && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.025) : 0), w - R(0.1));
        if (sub) {
          font(0.034, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#a2281e' : '#5a3418';
          ctx.fillText(sub, w / 2, cy + R(0.033), w - R(0.1));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 체력 · 갈고리 · 별 · 안내 ═════════════
  const ty = R(GB);
  ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, '#3a2014'], [1, '#22120a']);
  rr(ctx, 0, ty, w, h - ty + 6, R(0.025));
  ctx.fill();
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(R(0.02), ty, w - R(0.04), 2);
  const r1 = ty + R(0.042);
  {
    // 체력 하트
    font(0.034, 900);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe9d0';
    ctx.fillText('체력', R(0.035), r1 + 1);
    const tw = ctx.measureText('체력').width;
    for (let j = 0; j < HP; j++) {
      const hx = R(0.06) + tw + j * R(0.05);
      heartPath(ctx, hx, r1, R(0.017));
      const on = j < s.hp, lost = !on && s.phase === 'play' && t - s.events.filter((e) => e.kind === 'hurt' || e.kind === 'soot').reduce((m, e) => Math.max(m, e.t), -99) < 30;
      if (on) fillOut(ctx, lin(ctx, hx, r1 - R(0.02), hx, r1 + R(0.02), [0, '#ff8a95'], [1, '#d62b3d']), 1.4);
      else fillOut(ctx, lost ? 'rgba(255,90,90,.5)' : 'rgba(255,255,255,.1)', 1.4, 'rgba(255,255,255,.3)');
    }
    // 갈고리 준비 (사슬 감는 중이면 차오른다)
    const hk = s.hook, gx = w - R(0.27), gw = R(0.2), gh = R(0.026);
    const ready = hk.st === H_IDLE && s.soot <= 0;
    const fr = ready ? 1 : hk.st === H_REEL ? 1 - hk.t / (REEL_T + 36) : 0;
    drawHookHead(ctx, gx - R(0.03), r1, R(0.014), -Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
    ctx.fill();
    if (fr > 0.01) {
      ctx.fillStyle = ready ? lin(ctx, gx, 0, gx + gw, 0, [0, '#7cf0c0'], [1, '#e8fff4']) : lin(ctx, gx, 0, gx + gw, 0, [0, '#c8ccd8'], [1, '#f0f2f8']);
      rr(ctx, gx, r1 - gh / 2, gw * clamp(fr, 0, 1), gh, gh / 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,230,190,.5)';
    ctx.lineWidth = 1.3;
    rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
    ctx.stroke();
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = ready ? '#0e3a2a' : '#3a3440';
    ctx.fillText(s.soot > 0 ? '콜록…' : ready ? '던지기!' : '감는 중', gx + gw / 2, r1 + 1);
  }
  // 2줄: 별 (쉬운 말)
  const r2 = ty + R(0.1);
  {
    const st = d.stars, n = st.length;
    const labels = st.map((q) => {
      const v = starNow(s, q);
      return q.label + (s.phase === 'play' && v > 0 && v < q.n ? ` ${v}/${q.n}` : '');
    });
    const ok = st.map((q, j) => (s.phase === 'result' && s.ok ? s.starOk[j] : q.k !== 'clear' && q.k !== 'nohit' && starMet(s, q)));
    const bad = st.map((q) => q.k === 'nohit' && s.hits > 0);
    font(0.033, 800);
    const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
    const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (n - 1), scl = Math.min(1, (w - R(0.03)) / tot);
    let xx = (w - tot * scl) / 2;
    for (let j = 0; j < n; j++) {
      const pw = ws[j] * scl;
      rr(ctx, xx, r2 - R(0.025), pw, R(0.05), R(0.025));
      ctx.fillStyle = ok[j] ? 'rgba(255,216,74,.24)' : bad[j] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.07)';
      ctx.fill();
      ctx.strokeStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.12)' : 'rgba(255,230,190,.3)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      starPath(ctx, xx + R(0.026) * scl + 2, r2, R(0.014));
      ctx.fillStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.2)' : 'rgba(255,240,210,.6)';
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = ok[j] ? '#fff6dc' : bad[j] ? 'rgba(255,255,255,.35)' : '#f6e8d6';
      font(0.033, 800);
      ctx.fillText(labels[j], xx + R(0.05) * scl, r2 + 1, pw - R(0.058) * scl);
      xx += pw + gap * scl;
    }
  }
  // 3줄: 안내 한 줄
  {
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstThrow && s.phase === 'play';
    if (first) hint = '술통을 톡! 끌려오며 해적을 쓰러뜨려요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 바다를 지켰어요!' : `별 ${s.got}개! 다음 판엔 새것이 나와요`) : '빨간 ! 해적부터 끌어와요';
    else if (s.soot > 0) hint = '빈 길로 끈 화약통은 내 얼굴에서 펑!';
    font(first ? 0.04 : 0.034, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe2a8';
    ctx.fillText(hint, w / 2, ty + R(0.16), w - R(0.04));
  }
}
