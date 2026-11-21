/**
 * 싸움 붙이기 (40라운드: 생각 부담 없는 실시간 전투 · 성장 · 구경) — 싸움 붙이기 × 연쇄 × 도감.
 * 손이 하는 일은 톡 하나: 장터 몬스터를 톡 = 그놈이 가장 가까운 옆 놈 뒤통수를 '딱!' → 둘이 만화 싸움 구름이 되어
 *   맞은 놈 쪽으로 굴러가며 닿는 놈을 다 삼킨다(삼킬수록 커지고 오래간다). 구름이 걷히면 안의 놈들이 전부 기절해
 *   사방으로 튕겨 나오고, 튕겨 나온 놈이 깨어 있는 놈 위에 떨어지면 그놈이 화나서 또 싸움(연쇄).
 * 뒤집힘: 나는 못 싸운다. 꼬마 여우는 길 끝 꿀단지까지 저절로 살금살금 걷고, 깨어 있는 몬스터 앞에선 멈춰 숨는다.
 *   적이 많이 모여 있을수록 좋다 — 무리는 모였다 흩어졌다 하니 붐빌 때 붙이면 한 방에 다 치운다.
 * 정답 없음: 아무나 톡 해도 싸움은 난다(혼자 남은 놈은 제풀에 넘어진다). 수 제한·되돌리기·막힘·힌트 없음.
 *   오래 숨어만 있으면 가까운 놈이 '!' — 2초 안에 그놈을 싸움에 휘말리게 못 하면 꿀밤(하트 -1, 뒤로 통통). 판 처음 10초는 아무도 못 본다.
 * 판 12개(장 3 × 판 4, 장마다 마지막은 대장): 판마다 새 싸움꾼 하나.
 *   1 꼬마 도깨비 → 2 덩치 곰(구름이 커진다) → 3 겁쟁이 토끼(도망가다 부딪혀 싸움이 번진다) → 4 대장 왕도깨비(구름에 다섯은 있어야 삼켜진다)
 *   → 5 낮잠 멧돼지(깨우면 보는 쪽으로 돌진 구름) → 6 쌍둥이(하나가 휘말리면 다른 하나가 달려와 덮친다) → 7 폭죽 장수(구름이 셋으로 튄다) → 8 대장 두꺼비 장군
 *   → 9 호루라기 올빼미(구름을 걷어 버린다 — 먼저 휘말리게) → 10 구경꾼 병아리(싸움 구경하러 제 발로 온다) → 11 회오리 마법사(구름이 회오리가 되어 빨아들인다) → 12 대장 용 임금.
 * 성장: 판을 깨면 장난 레벨이 저절로 오른다(구름 처음 크기·굴러가는 거리·여우 차림). 장 끝에는 세상 속 큰 물건 둘 중 하나를 톡
 *   (뿅망치 = 딱! 이 둘에게 / 고춧가루 = 구름이 더 멀리 · 벌집 = 걷힐 때 벌이 둘을 더 쏜다 / 확성기 = 둘레 놈들이 구경하러 모인다). 도감 = 싸움 붙여 본 몬스터.
 * 별(쉬운 말 셋): 꿀단지 닿기 · 꿀밤 안 맞기 · 톡 한 번에 N마리.
 * 웃음: 맞은 놈의 '어쭈?' 얼굴, 구름 밖으로 튀어나오는 주먹·발·별, 눈이 뱅글 돌며 날아가는 기절, 상자 뒤에서 킥킥대는 여우.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.52;
const TAU = Math.PI * 2;
/** 몬스터가 다니는 길(발 자리 y) · 여우가 살금살금 가는 앞줄 · 지평선 */
const MY0 = 0.72, MY1 = 1.12, FOX_Y = 1.225, HZ = 0.6;
/** 여우: 걷기 · 길이 뚫렸을 때 달리기 · 깨어 있는 놈 앞에서 멈추는 거리 · 달리려면 이만큼 비어야 */
const WALK = 0.0036, RUN = 0.0068, STOP = 0.25, CLEAR = 0.72;
/** 톡 사이 쉼(틱) · 딱! 멈칫 · 멀리 있으면 달려가서 딱 */
const CD = 30, HIT_T = 9, BONK_GAP = 0.03, DASH_V = 0.02;
/** 구름: 처음 반지름 · 처음 속도 · 마찰 · 처음 수명 · 하나 삼킬 때마다 수명·속도 */
const R0 = 0.064, V0 = 0.009, FRIC = 0.972, LIFE0 = 42, LIFE_ADD = 16, V_ADD = 0.002, V_MAX = 0.015, AGE_MAX = 420;
/** 돌진 구름(멧돼지·쌍둥이) · 폭죽으로 튄 구름 */
const V_CHARGE = 0.021, CHARGE_T = 44, V_ROCKET = 0.019;
/** 올빼미: 보는 원 · 호루라기 부는 데 걸리는 틱 · 다시 불기까지 */
const OWL_R = 0.25, OWL_WIND = 28, OWL_REST = 100;
/** 들킴: 판 처음 안전한 시간 · '!' 뒤 꿀밤까지 · 꿀밤 뒤 안전 */
const GRACE = 600, NOTICE_T = 120, SAFE_T = 300;
/** 들킴 게이지: 숨어서 기다릴 때 차는 틱 수 · 작은 싸움(둘뿐)이 올리는 양 · 큰 소동(다섯 이상)이 내리는 양 · 목격자(흩어져 허둥대는 놈) 거리 */
const PATIENCE = [600, 560, 540, 520];
const SMALL = [0, 0.05, 0.08, 0.1, 0.12, 0.13, 0.14], BIG_CALM = 0.1, WIT_R = 0.3, PANIC_T = 330, BLOOM = 8;
const KO_T = 84, DAZE_T = 80, FLEE_T = 44, FLEE_V = 0.0125, FLEE_COOL = 70;
const RESULT_MIN = 90, RESULT_OK = 250, RESULT_FAIL = 170, PICK_MIN = 36, PICK_AUTO = 900;
const STAR_PTS = 200, CLEAR_PTS = 100, BOSS_PTS = 500, WIN_PTS = 1000;
/** '와' 띠가 뜨는 한 번 톡의 휘말린 수 */
const WOW_AT = [4, 6, 9, 13, 18];
const WOW_TEXT = ['우당탕!', '대소동!', '난장판!', '온 동네 싸움!', '장터가 뒤집혔다!'];

type K = 'gob' | 'bear' | 'rabbit' | 'boar' | 'twin' | 'cracker' | 'owl' | 'chick' | 'wiz' | 'boss';
const KINDS: K[] = ['gob', 'bear', 'rabbit', 'boss', 'boar', 'twin', 'cracker', 'owl', 'chick', 'wiz'];
const KR: Record<K, number> = { gob: 0.04, bear: 0.062, rabbit: 0.037, boar: 0.052, twin: 0.039, cracker: 0.043, owl: 0.041, chick: 0.034, wiz: 0.043, boss: 0.105 };
const KSPD: Record<K, number> = { gob: 0.003, bear: 0, rabbit: 0.0034, boar: 0, twin: 0.003, cracker: 0.0027, owl: 0, chick: 0.0038, wiz: 0, boss: 0 };
const KNAME: Record<K, string> = { gob: '꼬마 도깨비', bear: '덩치 곰', rabbit: '겁쟁이 토끼', boar: '낮잠 멧돼지', twin: '쌍둥이', cracker: '폭죽 장수', owl: '호루라기 올빼미', chick: '구경꾼 병아리', wiz: '회오리 마법사', boss: '대장' };
const CH: Record<string, K> = { g: 'gob', B: 'bear', r: 'rabbit', b: 'boar', t: 'twin', c: 'cracker', o: 'owl', k: 'chick', w: 'wiz' };
/** 몬스터 상태 */
const IDLE = 0, DASH = 1, HIT = 2, INC = 3, FLY = 4, KO = 5, SLEEP = 6, NOTICE = 7, FLEE = 8, DAZE = 9, ENTER = 10;
/** HIT 상태의 역할(tgt): 맞는 쪽 · 깨어나는 멧돼지 · 혼자 넘어지는 놈 */
const T_VICTIM = -2, T_BOAR = -3, T_SOLO = -4;

/** 무리: 0 모였다 흩어졌다 · 1 줄지어 오락가락 · 2 제자리 */
interface GroupDef { f: 0 | 1 | 2; x: number; y: number; m: string; rin?: number; rout?: number; per?: number; ang?: number; len?: number; gather?: number }
interface StageDef {
  key: K; ch: number; name: string; news: string; len: number; need: number; g: GroupDef[];
  boss?: { need: number; pool: string; name: string };
}
const H = (x: number, y: number, m: string, rin = 0.06, rout = 0.27, per = 460): GroupDef => ({ f: 0, x, y, m, rin, rout, per });
const LN = (x: number, y: number, m: string, ang: number, len: number, per = 420): GroupDef => ({ f: 1, x, y, m, ang, len, per, rout: 0.07 });
const ST = (x: number, y: number, m: string, ang = 0): GroupDef => ({ f: 2, x, y, m, ang });

/** 판 12개 (좌표는 화면 폭 = 1, 길이는 화면 몇 개). 판마다(다시 할 때도) 시드로 위아래를 뒤집고 살짝 흔든다 */
export const STAGES: StageDef[] = [
  {
    key: 'gob', ch: 0, name: '장터 입구', news: '', len: 2.9, need: 4,
    g: [H(0.6, 0.93, 'gggggg', 0.06, 0.06), ST(0.92, 0.76, 'gg'), H(1.4, 0.92, 'gggggg', 0.06, 0.25, 420), LN(1.95, 0.92, 'gggg', 1.2, 0.3), H(2.34, 0.92, 'ggggg', 0.06, 0.23, 400)],
  },
  {
    key: 'bear', ch: 0, name: '떡집 골목', news: '덩치 곰 — 구름에 들어가면 구름이 커져요', len: 3.0, need: 6,
    g: [H(0.72, 0.92, 'Bggggg'), H(1.32, 0.9, 'gggg', 0.06, 0.2), ST(1.76, 0.8, 'B'), H(1.86, 1.02, 'ggg', 0.05, 0.14), H(2.42, 0.92, 'Bgggggg', 0.07, 0.28)],
  },
  {
    key: 'rabbit', ch: 0, name: '당근 가게 앞', news: '겁쟁이 토끼 — 도망가다 부딪히면 거기서 또 싸움', len: 3.1, need: 7,
    g: [H(0.7, 0.92, 'ggggrr'), H(1.28, 0.84, 'gggr', 0.06, 0.18), H(1.56, 1.04, 'ggg', 0.05, 0.14), H(2.1, 0.92, 'Bgggggrr', 0.07, 0.29), H(2.58, 0.96, 'ggg', 0.05, 0.14)],
  },
  {
    key: 'boss', ch: 0, name: '왕도깨비 잔칫상', news: '대장 — 구름에 다섯은 있어야 삼켜져요', len: 2.5, need: 8,
    g: [H(0.72, 0.92, 'ggggr'), H(1.6, 0.92, 'gggg', 0.07, 0.22)],
    boss: { need: 5, pool: 'gggrgB', name: '왕도깨비' },
  },
  {
    key: 'boar', ch: 1, name: '숲길 들머리', news: '낮잠 멧돼지 — 톡 하면 보는 쪽으로 돌진!', len: 3.1, need: 7,
    g: [ST(0.5, 0.92, 'b', 0), H(0.94, 0.92, 'gggggg', 0.06, 0.24), H(1.46, 1.02, 'ggg', 0.05, 0.14), ST(1.56, 0.78, 'b', 0.45), H(2.0, 0.94, 'gggg', 0.06, 0.2), H(2.36, 0.9, 'Bggggg', 0.07, 0.24), ST(2.7, 0.92, 'b', Math.PI)],
  },
  {
    key: 'twin', ch: 1, name: '버섯 다리', news: '쌍둥이 — 하나가 휘말리면 다른 하나가 달려와요', len: 3.2, need: 8,
    g: [H(0.64, 0.84, 'tggg', 0.06, 0.18), H(1.1, 1.02, 'tggg', 0.06, 0.18), ST(1.46, 1.04, 'b', -0.25), H(1.84, 0.84, 'tgggg', 0.06, 0.2), H(2.36, 1.0, 'tgggr', 0.06, 0.2), H(2.76, 0.84, 'ggg', 0.05, 0.14)],
  },
  {
    key: 'cracker', ch: 1, name: '불꽃놀이 공터', news: '폭죽 장수 — 구름이 펑! 세 갈래로 튀어요', len: 3.2, need: 9,
    g: [H(0.74, 0.92, 'cggggg', 0.07, 0.26), H(1.22, 0.8, 'ggg', 0.05, 0.14), H(1.3, 1.06, 'ggg', 0.05, 0.14), H(1.96, 0.92, 'cBggggg', 0.07, 0.28), H(2.5, 0.84, 'tggg', 0.06, 0.18), H(2.7, 1.04, 'tgg', 0.05, 0.14)],
  },
  {
    key: 'boss', ch: 1, name: '두꺼비 장군 진지', news: '대장 — 구름에 일곱은 있어야 삼켜져요', len: 2.6, need: 10,
    g: [ST(0.5, 0.86, 'b', 0.1), H(0.88, 0.92, 'cgggg', 0.06, 0.22), H(1.7, 0.92, 'ggggg', 0.07, 0.22)],
    boss: { need: 7, pool: 'ggggrBgc', name: '두꺼비 장군' },
  },
  {
    key: 'owl', ch: 2, name: '바닷가 산책길', news: '호루라기 올빼미 — 삐익! 구름을 걷어요. 올빼미부터!', len: 3.1, need: 7,
    g: [H(0.72, 0.92, 'oggggg', 0.07, 0.25), H(1.32, 0.86, 'gggg', 0.06, 0.2), H(1.9, 0.94, 'oBggggg', 0.07, 0.27), ST(2.26, 1.04, 'b', 0), H(2.6, 0.9, 'ogggg', 0.06, 0.2)],
  },
  {
    key: 'chick', ch: 2, name: '솜사탕 부두', news: '구경꾼 병아리 — 싸움 났다! 제 발로 달려와요', len: 3.2, need: 9,
    g: [H(0.68, 0.9, 'gggkk', 0.06, 0.2), H(1.1, 1.04, 'kkkk', 0.05, 0.14), H(1.64, 0.84, 'ogggk', 0.06, 0.2), H(2.0, 1.04, 'kkkgg', 0.06, 0.18), H(2.56, 0.92, 'cgggkkk', 0.07, 0.26)],
  },
  {
    key: 'wiz', ch: 2, name: '등대 광장', news: '회오리 마법사 — 구름이 회오리가 돼 다 빨아들여요', len: 3.2, need: 10,
    g: [H(0.76, 0.92, 'wggggg', 0.08, 0.28), H(1.36, 0.86, 'gggrr', 0.06, 0.2), H(1.98, 0.94, 'wogggkk', 0.08, 0.28), H(2.58, 0.92, 'wBgggkk', 0.08, 0.28)],
  },
  {
    key: 'boss', ch: 2, name: '용 임금 꿀 창고', news: '대장 — 구름에 아홉은 있어야 삼켜져요', len: 2.7, need: 12,
    g: [H(0.76, 0.92, 'wggggk', 0.08, 0.26), H(1.8, 0.92, 'gggggk', 0.07, 0.24)],
    boss: { need: 9, pool: 'ggkgrkgBgc', name: '용 임금' },
  },
];
export const STAGE_COUNT = STAGES.length;
const CHAPTER = ['도깨비 장터', '버섯 숲길', '바닷가 축제'];
/** 장 끝 둘 중 하나: [왼쪽, 오른쪽] */
const PICKS = [
  [{ key: 'hammer', name: '뿅망치', line: "딱! 이 옆의 둘에게" }, { key: 'pepper', name: '고춧가루', line: '구름이 더 멀리 굴러요' }],
  [{ key: 'hive', name: '벌집', line: '걷힐 때 벌이 둘을 더 쏴요' }, { key: 'horn', name: '확성기', line: '둘레 놈들이 구경하러 모여요' }],
];

interface Group { x: number; y: number; form: number; rin: number; rout: number; per: number; ph: number; gather: number; ang: number; len: number; panic: number }
interface Mon {
  id: number; k: K; x: number; y: number; r: number; st: number; tm: number;
  g: number; a: number; f: number; dir: number; still: boolean; hx: number; hy: number;
  vx: number; vy: number; z: number; vz: number; face: number; ang: number;
  cid: number; tap: number; chain: number; tgt: number; tgt2: number; pair: number; dx: number; dy: number;
  cool: number; wind: number; lure: number; lureC: number; sus: number;
  // 연출 (결과와 무관)
  v: number; seed: number; hitT: number; walk: boolean; sky: boolean;
}
interface Cloud {
  id: number; x: number; y: number; vx: number; vy: number; r: number; life: number; age: number; n: number; w: number;
  tap: number; chain: number; kind: number; kick: number; tor: number; split: number; nomerge: number; mega: number; tgtc: number; dead: boolean;
  // 연출
  seed: number; popT: number; cols: number[];
}
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }

export interface BrawlState {
  rng: Rng; seed: number; t: number; st: number; stage: number; phase: 'play' | 'result' | 'pick'; pt: number; ok: boolean; lite: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean;
  level: number; perkA: number; perkB: number;
  L: number; potX: number; cam: number;
  fx: number; kb: number; blocked: boolean; blockT: number; run: boolean; alert: number; noticer: number; safeT: number; cloudWait: boolean;
  mons: Mon[]; clouds: Cloud[]; groups: Group[]; nid: number;
  bossId: number; bossNeed: number; bossGone: boolean; bossT: number; kicks: number;
  down: boolean; cd: number; taps: number; tapN: number; tc: number[]; tk: number[]; tw: number[];
  bestTap: number; hits: number; kos: number; chainMax: number; wowN: number; firstTap: number; firstWow: number;
  dex: Record<string, number>; seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { k: K; t: number } | null;
  events: Ev[];
  // 연출용
  foxMood: number; foxMoodT: number; giggle: number; lastTapT: number; lastBurstT: number; pickSel: number; lvT: number;
}

const ev = (s: BrawlState, kind: string, x: number, y: number, n?: number, text?: string) => {
  if (!s.lite) s.events.push({ t: s.t, kind, x, y, n, text });
};
function see(s: BrawlState, key: string, text = '') {
  if (s.lite || !key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const jit = (r: Rng, a: number) => (r() - 0.5) * 2 * a;

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
const isStill = (k: K) => k === 'bear' || k === 'boar' || k === 'owl' || k === 'wiz' || k === 'boss';
/** 깨어서 길 위에 있는 놈(여우 길을 막는다) */
const blocks = (m: Mon) => m.st === IDLE || m.st === NOTICE || m.st === DAZE || m.st === ENTER || m.st === DASH || m.st === FLEE || m.st === HIT;
/** 톡 할 수 있는 놈 */
const tappable = (m: Mon) => (m.st === IDLE || m.st === NOTICE || m.st === SLEEP || m.st === DAZE) && m.k !== 'boss';
/** 싸움 상대가 될 수 있는 놈 */
const canFight = (m: Mon) => (m.st === IDLE || m.st === NOTICE || m.st === DAZE || m.st === ENTER) && m.k !== 'boss';
/** 구름이 삼킬 수 있는 놈 */
const edible = (m: Mon) => m.st === IDLE || m.st === NOTICE || m.st === DAZE || m.st === ENTER || m.st === DASH || m.st === FLEE || m.st === SLEEP || (m.st === HIT && m.tgt !== T_BOAR);

function mk(s: BrawlState, k: K, x: number, y: number, g: number): Mon {
  const m: Mon = {
    id: ++s.nid, k, x, y, r: KR[k], st: k === 'boar' ? SLEEP : IDLE, tm: 0, g, a: 0, f: 1, dir: 1, still: isStill(k), hx: x, hy: y,
    vx: 0, vy: 0, z: 0, vz: 0, face: -1, ang: 0, cid: -1, tap: 0, chain: 0, tgt: -1, tgt2: -1, pair: -1, dx: 1, dy: 0,
    cool: 0, wind: 0, lure: 0, lureC: -1, sus: 0, v: Math.floor(s.rng() * 3), seed: Math.floor(s.rng() * 1000), hitT: -999, walk: false, sky: false,
  };
  s.mons.push(m);
  return m;
}
const monById = (s: BrawlState, id: number) => {
  for (const m of s.mons) if (m.id === id) return m;
  return null;
};
const cloudById = (s: BrawlState, id: number) => {
  for (const c of s.clouds) if (c.id === id && !c.dead) return c;
  return null;
};

function newStage(s: BrawlState) {
  const d = STAGES[s.stage], r = s.rng, flip = s.stage > 0 && r() < 0.5;
  const FY = (y: number) => (flip ? MY0 + MY1 - y : y), FA = (a: number) => (flip ? -a : a);
  s.L = d.len;
  s.potX = d.len - 0.2;
  s.st = 0;
  s.fx = 0.13;
  s.cam = 0;
  s.kb = 0;
  s.blocked = false;
  s.blockT = 0;
  s.run = false;
  s.alert = 0;
  s.noticer = -1;
  s.safeT = 0;
  s.cloudWait = false;
  s.mons = [];
  s.clouds = [];
  s.groups = [];
  s.bossId = -1;
  s.bossNeed = 0;
  s.bossGone = false;
  s.bossT = 0;
  s.kicks = 0;
  s.cd = 0;
  s.bestTap = 0;
  s.hits = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  let twin: Mon | null = null;
  d.g.forEach((gd, gi) => {
    const per = gd.per ?? 400;
    const G: Group = {
      x: gd.x + (s.stage > 0 ? jit(r, 0.03) : 0), y: clamp(FY(gd.y) + (s.stage > 0 ? jit(r, 0.02) : 0), MY0 + 0.04, MY1 - 0.04), form: gd.f,
      rin: gd.rin ?? 0.06, rout: gd.rout ?? 0.17, per, ph: s.stage === 0 && gi === 0 ? 0 : Math.floor(r() * per), gather: gd.gather ?? 0.3, ang: FA(gd.ang ?? 0), len: gd.len ?? 0.3, panic: -1,
    };
    s.groups.push(G);
    const ks = [...gd.m].map((c) => CH[c]), movers = ks.filter((k) => !isStill(k)).length;
    let j = 0, sj = 0;
    const a0 = r() * TAU, stills = ks.length - movers;
    for (const k of ks) {
      let x = G.x, y = G.y;
      const m = mk(s, k, x, y, gi);
      if (m.still) {
        if (G.form === 2) {
          // 제자리 무리: 줄지어 놓는다 (멧돼지는 ang 쪽을 본다)
          const off = (sj - (stills - 1) / 2) * 0.07;
          x = G.x + off;
          y = G.y + (stills > 1 ? (sj % 2 ? 0.015 : -0.015) : 0);
        } else if (stills > 1 || k === 'owl' || k === 'wiz') {
          const aa = a0 + sj * 2.4;
          const rr = k === 'bear' ? 0 : 0.035;
          x = G.x + Math.cos(aa) * rr;
          y = G.y + Math.sin(aa) * rr * 0.6;
        }
        sj++;
        m.ang = G.ang;
        m.face = Math.cos(G.ang) >= 0 ? 1 : -1;
      } else if (G.form === 1) {
        m.a = movers > 1 ? j / (movers - 1) : 0.5;
        j++;
        x = G.x + Math.cos(G.ang) * (m.a - 0.5) * G.len;
        y = G.y + Math.sin(G.ang) * (m.a - 0.5) * G.len;
      } else if (G.form === 2) {
        const off = (j - (movers - 1) / 2) * 0.075;
        j++;
        x = G.x + off;
        y = G.y + (j % 2 ? 0.012 : -0.012);
        m.still = true;
      } else {
        m.a = a0 + (TAU * j) / Math.max(1, movers);
        m.f = movers > 4 ? (j % 2 ? 1 : 0.5) : 0.85;
        m.dir = (gi + j) % 3 === 0 ? -1 : 1;
        j++;
        const R = G.rin + (G.rout - G.rin) * (openOf(G, 0) > 0.5 ? 1 : 0);
        x = G.x + Math.cos(m.a) * R * m.f;
        y = G.y + Math.sin(m.a) * R * m.f * 0.62;
      }
      m.x = m.hx = x;
      m.y = m.hy = clamp(y, MY0, MY1);
      if (k === 'twin') {
        if (twin) (m.pair = twin.id), (twin.pair = m.id), (m.v = twin.v), (twin = null);
        else twin = m;
      }
    }
  });
  if (d.boss) {
    const b = mk(s, 'boss', d.len - 0.6, (MY0 + MY1) / 2, -1);
    b.hx = b.x;
    b.hy = b.y;
    s.bossId = b.id;
    s.bossNeed = d.boss.need;
    see(s, 'boss' + d.ch, `${d.boss.name} — 작은 구름은 걷어차요`);
  }
  // 몇 번 흔들어 겹침을 푼다
  for (let i = 0; i < 12; i++) separate(s);
  for (const m of s.mons) (m.hx = m.still ? m.x : m.hx), (m.hy = m.still ? m.y : m.hy);
  if (!s.lite) {
    see(s, d.key === 'boss' ? '' : d.key);
    s.newsQ = d.news ? [d.news] : [];
    s.news = null;
    s.spot = s.stage > 0 ? { k: d.key, t: s.t } : null;
  }
}

/** 무리가 흩어진 정도 0(모임)~1(흩어짐) */
function openOf(G: Group, st: number) {
  if (G.rout <= G.rin) return 0;
  if (st < G.panic) return 1.12;
  const u = ((st + G.ph) % G.per) / G.per;
  return u < G.gather ? 0 : 1;
}
let GX = 0, GY = 0, GFAST = 1;
function goal(s: BrawlState, m: Mon) {
  const G = s.groups[m.g];
  GFAST = 1;
  if (!G || m.still) return void ((GX = m.hx), (GY = m.hy));
  if (G.form === 1) {
    const off = (m.a - 0.5) * G.len + Math.sin(((s.st + G.ph) / G.per) * TAU) * G.rout;
    GX = G.x + Math.cos(G.ang) * off;
    GY = G.y + Math.sin(G.ang) * off;
  } else {
    const o = openOf(G, s.st), R = G.rin + (G.rout - G.rin) * o, th = m.a + s.st * 0.0032 * m.dir;
    GX = G.x + Math.cos(th) * R * m.f;
    GY = G.y + Math.sin(th) * R * m.f * 0.62;
    GFAST = o === 0 || o > 1 ? 1.9 : 1;
  }
}

function separate(s: BrawlState) {
  const ms = s.mons, n = ms.length;
  for (let i = 0; i < n; i++) {
    const a = ms[i];
    if (a.st !== IDLE && a.st !== SLEEP && a.st !== DAZE && a.st !== NOTICE) continue;
    for (let j = i + 1; j < n; j++) {
      const b = ms[j];
      if (b.st !== IDLE && b.st !== SLEEP && b.st !== DAZE && b.st !== NOTICE) continue;
      const dx = b.x - a.x, dy = (b.y - a.y) * 1.5, min = (a.r + b.r) * 0.86;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.001, push = (min - d) * 0.5, ux = d2 ? dx / d : 1, uy = d2 ? dy / d : 0;
      const fa = a.still ? 0 : b.still ? 1 : 0.5, fb = b.still ? 0 : a.still ? 1 : 0.5;
      a.x -= ux * push * 2 * fa;
      a.y -= (uy * push * 2 * fa) / 1.5;
      b.x += ux * push * 2 * fb;
      b.y += (uy * push * 2 * fb) / 1.5;
    }
  }
}

function nearestFighter(s: BrawlState, a: Mon, skip = -1): Mon | null {
  let best: Mon | null = null, bd = 1e9;
  for (const m of s.mons) {
    if (m === a || m.id === skip || !canFight(m)) continue;
    const d = (m.x - a.x) ** 2 + (m.y - a.y) ** 2;
    if (d < bd) (bd = d), (best = m);
  }
  return best;
}

/** a가 가장 가까운 옆 놈에게 싸움을 건다. far = 멀어도 달려가서(톡), 아니면 가까울 때만(화난 놈) — 상대가 없으면 혼자 구름 */
function provoke(s: BrawlState, a: Mon, tap: number, chain: number, dx: number, dy: number, far: boolean) {
  if (s.noticer === a.id) s.noticer = -2;
  a.tap = tap;
  a.chain = chain;
  a.lure = 0;
  const b = nearestFighter(s, a);
  const d = b ? Math.hypot(b.x - a.x, b.y - a.y) : 9;
  if (b && d <= a.r + b.r + BONK_GAP) return startHit(s, a, b);
  if (b && d < (far ? 1.3 : 0.2)) {
    a.st = DASH;
    a.tm = 0;
    a.tgt = b.id;
    ev(s, 'dash', a.x, a.y);
    return;
  }
  // 혼자: 제풀에 화내다 작은 구름
  const l = Math.hypot(dx, dy);
  a.st = HIT;
  a.tm = HIT_T;
  a.tgt = T_SOLO;
  a.dx = l > 1e-6 ? dx / l : 1;
  a.dy = l > 1e-6 ? dy / l : 0;
  a.hitT = s.t;
  ev(s, 'solo', a.x, a.y);
}
function startHit(s: BrawlState, a: Mon, b: Mon) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 0.001;
  a.st = HIT;
  a.tm = HIT_T;
  a.tgt = b.id;
  a.tgt2 = -1;
  a.dx = (b.x - a.x) / d;
  a.dy = (b.y - a.y) / d;
  a.face = a.dx >= 0 ? 1 : -1;
  a.hitT = s.t;
  if (s.noticer === b.id) s.noticer = -2;
  b.st = HIT;
  b.tm = HIT_T + 4;
  b.tgt = T_VICTIM;
  b.hitT = s.t;
  b.lure = 0;
  // 뿅망치: 옆의 하나 더
  if (s.perkA === 1) {
    let c: Mon | null = null, cd = 0.21 ** 2;
    for (const m of s.mons) {
      if (m === a || m === b || !canFight(m)) continue;
      const q = (m.x - a.x) ** 2 + (m.y - a.y) ** 2;
      if (q < cd) (cd = q), (c = m);
    }
    if (c) {
      if (s.noticer === c.id) s.noticer = -2;
      c.st = HIT;
      c.tm = HIT_T + 4;
      c.tgt = T_VICTIM;
      c.hitT = s.t;
      c.lure = 0;
      a.tgt2 = c.id;
      const mx = (b.x + c.x) / 2 - a.x, my = (b.y + c.y) / 2 - a.y, l = Math.hypot(mx, my);
      if (l > 0.01) (a.dx = mx / l), (a.dy = my / l);
      ev(s, 'bonk', c.x, c.y, 2);
    }
  }
  ev(s, 'bonk', b.x, b.y, a.chain);
}
function wake(s: BrawlState, m: Mon, tap: number, chain: number) {
  m.st = HIT;
  m.tm = 16;
  m.tgt = T_BOAR;
  m.tap = tap;
  m.chain = chain;
  m.hitT = s.t;
  ev(s, 'wake', m.x, m.y);
}

function radiusOf(s: BrawlState, c: Cloud) {
  const base = R0 * (1 + 0.022 * s.level) + 0.02 * Math.sqrt(Math.max(0, c.n + c.w - 2));
  return c.mega ? Math.min(0.27, base + 0.06) : Math.min(0.2, base) * (c.tor > 0 ? 1.12 : 1);
}
function spawnCloud(s: BrawlState, mem: Mon[], x: number, y: number, dx: number, dy: number, tap: number, chain: number, kind: number): Cloud {
  const v = kind === 1 ? V_CHARGE : kind === 2 ? V_ROCKET : V0 * (1 + 0.03 * s.level) * (s.perkA === 2 ? 1.35 : 1) * (mem.length === 1 ? 0.75 : 1);
  const c: Cloud = {
    id: ++s.nid, x, y: clamp(y, MY0, MY1), vx: dx * v, vy: dy * v, r: R0, life: (kind === 1 ? CHARGE_T + 8 : kind === 2 ? 40 : LIFE0 + (s.perkA === 2 ? 12 : 0)) + s.level, age: 0, n: 0, w: 0,
    tap, chain, kind, kick: 0, tor: 0, split: 0, nomerge: kind === 2 ? 40 : 0, mega: 0, tgtc: -1, dead: false, seed: s.nid * 7, popT: s.t, cols: [],
  };
  s.clouds.push(c);
  for (const m of mem) swallow(s, c, m, true);
  c.r = radiusOf(s, c);
  if (chain > s.chainMax) s.chainMax = chain;
  if (chain >= 2) see(s, 'chain');
  see(s, 'cloud');
  ev(s, 'cloud', c.x, c.y, chain);
  // 확성기: 둘레 놈들이 구경하러 모인다 (톡으로 붙인 구름만)
  if (s.perkB === 2 && chain === 1 && kind === 0) {
    for (const m of s.mons) if (m.st === IDLE && !m.still && (m.x - c.x) ** 2 + (m.y - c.y) ** 2 < 0.34 ** 2) (m.lure = 50), (m.lureC = c.id);
    ev(s, 'horn', c.x, c.y);
  }
  return c;
}
function swallow(s: BrawlState, c: Cloud, m: Mon, init = false) {
  if (s.noticer === m.id) s.noticer = -2;
  m.st = INC;
  m.cid = c.id;
  m.tap = c.tap;
  m.lure = 0;
  c.n++;
  if (!s.lite && c.cols.length < 8) c.cols.push(KINDS.indexOf(m.k) * 3 + m.v);
  const slot = c.tap & 15, cnt = ++s.tc[slot];
  if (!init) {
    c.life = Math.min(AGE_MAX, c.life + (m.k === 'chick' ? 12 : m.k === 'bear' ? 40 : LIFE_ADD));
    const sp = Math.hypot(c.vx, c.vy);
    if (c.kind !== 1 || c.age >= CHARGE_T) {
      const ns = Math.min(V_MAX, sp + V_ADD);
      if (sp > 1e-5) (c.vx *= ns / sp), (c.vy *= ns / sp);
    }
    // 새로 낀 놈 쪽으로 구름이 쏠린다 (붐비는 데서는 그 자리를 맴돌며 다 삼킨다)
    if (c.kind === 0 && !c.mega) (c.x += (m.x - c.x) / c.n), (c.y += (m.y - c.y) / c.n);
    c.popT = s.t;
    ev(s, 'swallow', m.x, m.y, cnt);
  }
  if (m.k === 'bear') (c.w += 2), see(s, 'bigcloud');
  if (m.k === 'cracker' && !c.mega) c.split = 22;
  if (m.k === 'wiz') (c.tor = Math.max(c.tor, 120)), (c.life = Math.max(c.life, 100)), ev(s, 'tornado', c.x, c.y), see(s, 'tornado');
  if (m.k === 'twin' && m.pair >= 0) {
    const p = monById(s, m.pair);
    if (p && canFight(p)) {
      const d = Math.hypot(c.x - p.x, c.y - p.y) || 0.001;
      const rc = spawnCloud(s, [p], p.x, p.y, (c.x - p.x) / d, (c.y - p.y) / d, c.tap, c.chain + 1, 1);
      rc.tgtc = c.id;
      rc.life = 90;
      ev(s, 'twin', p.x, p.y);
      see(s, 'rush');
    }
  }
  // '와' 띠: 한 번 톡에 휘말린 수
  while (s.tw[slot] < WOW_AT.length && cnt >= WOW_AT[s.tw[slot]]) {
    const lv = s.tw[slot]++;
    s.wowN++;
    if (s.firstWow < 0) s.firstWow = s.t;
    if (lv >= 1) see(s, 'wow' + Math.min(lv, 3));
    ev(s, 'wow', c.x, c.y, lv, WOW_TEXT[lv]);
  }
  c.r = radiusOf(s, c);
}
function koCount(s: BrawlState, m: Mon) {
  const slot = m.tap & 15, k = ++s.tk[slot];
  s.pts += 5 * k * k;
  s.kos++;
  if (k > s.bestTap) s.bestTap = k;
  if (!s.lite) s.dex[m.k === 'boss' ? 'boss' + STAGES[s.stage].ch : m.k] = (s.dex[m.k === 'boss' ? 'boss' + STAGES[s.stage].ch : m.k] ?? 0) + 1;
  return k;
}
function fling(s: BrawlState, m: Mon, ang: number, dist: number, chain: number) {
  const T = 24 + Math.floor(s.rng() * 10);
  m.st = FLY;
  m.tm = T;
  m.cid = -1;
  m.chain = chain;
  m.vx = (Math.cos(ang) * dist) / T;
  m.vy = (Math.sin(ang) * dist * 0.62) / T;
  m.z = 0.02;
  m.vz = 0.0042 * T * 0.5;
  m.lure = 0;
}
function burst(s: BrawlState, c: Cloud) {
  c.dead = true;
  const mem: Mon[] = [];
  for (const m of s.mons) if (m.cid === c.id && m.st === INC) mem.push(m);
  const n = mem.length, base = s.rng() * TAU, d0 = 0.12 + 0.03 * Math.sqrt(n);
  let last = 0;
  mem.forEach((m, i) => {
    fling(s, m, base + (TAU * i) / Math.max(1, n) + jit(s.rng, 0.25), d0 * (0.75 + s.rng() * 0.6), c.chain);
    if (m.k === 'boss') (m.sky = true), (m.tm = 70), (m.vx = 0.004), (m.vy = -0.002), (m.vz = 0.02), (s.pts += BOSS_PTS);
    last = koCount(s, m);
  });
  ev(s, 'burst', c.x, c.y, n, String(last));
  s.lastBurstT = s.t;
  if (!c.mega && c.tap > 1) {
    // 목격자: 싸움을 보고도 멀쩡한 놈은 놀라서 한동안 흩어져 허둥댄다 (그 무리는 당분간 안 모인다)
    for (const m of s.mons) {
      if (m.k === 'boss' || !(m.st === IDLE || m.st === ENTER) || (m.x - c.x) ** 2 + (m.y - c.y) ** 2 > WIT_R * WIT_R) continue;
      m.sus = 90;
      const G = s.groups[m.g];
      if (G && G.form === 0 && G.rout > G.rin) G.panic = s.st + PANIC_T;
    }
    // 들킴 게이지: 둘뿐인 작은 싸움은 수상하다 · 큰 소동은 누가 시작했는지 아무도 모른다
    const add = SMALL[Math.min(s.stage, SMALL.length - 1)] * (n <= 2 ? 1 : n === 3 ? 0.5 : 0);
    if (add > 0 && c.chain === 1 && c.kind === 0) (s.alert = Math.min(1, s.alert + add)), ev(s, 'sus', c.x, c.y, n);
    else if (n >= 5) (s.alert = Math.max(0, s.alert - BIG_CALM)), ev(s, 'calm', c.x, c.y, n);
  }
  if (c.mega) {
    s.bossGone = true;
    // 대장이 날아가면 남은 놈들도 놀라서 다 나가떨어진다
    for (const m of s.mons) {
      if (!edible(m) && !(m.st === HIT)) continue;
      m.tap = c.tap;
      fling(s, m, Math.atan2(m.y - c.y, m.x - c.x) + jit(s.rng, 0.3), 0.16 + s.rng() * 0.1, c.chain);
      koCount(s, m);
    }
    ev(s, 'mega', c.x, c.y, n);
    see(s, 'megaburst');
  }
  // 벌집: 걷힐 때 벌이 가까운 둘을 쏜다
  if (s.perkB === 1 && c.chain <= 2 && !c.mega && n >= 2) {
    for (let q = 0; q < 2; q++) {
      let b: Mon | null = null, bd = 0.42 ** 2;
      for (const m of s.mons) {
        if (!canFight(m) || m.k === 'boss') continue;
        const dd = (m.x - c.x) ** 2 + (m.y - c.y) ** 2;
        if (dd < bd) (bd = dd), (b = m);
      }
      if (!b) break;
      ev(s, 'bee', b.x, b.y, 0, `${c.x},${c.y}`);
      provoke(s, b, c.tap, c.chain + 1, b.x - c.x, b.y - c.y, false);
    }
  }
}
/** 올빼미 호루라기: 구름이 걷히고 안의 놈들은 어질어질 풀려난다 (기절 아님) */
function disperse(s: BrawlState, c: Cloud) {
  c.dead = true;
  let i = 0;
  for (const m of s.mons) {
    if (m.cid !== c.id || m.st !== INC) continue;
    const a = (i++ * TAU) / Math.max(1, c.n) + c.seed;
    m.st = DAZE;
    m.tm = DAZE_T;
    m.cid = -1;
    m.tap = 0;
    m.x = clamp(c.x + Math.cos(a) * c.r * 0.8, 0.08, s.L - 0.4);
    m.y = clamp(c.y + Math.sin(a) * c.r * 0.5, MY0, MY1);
  }
  ev(s, 'disperse', c.x, c.y, c.n);
}
/** 폭죽: 구름이 세 갈래로 튄다 */
function splitCloud(s: BrawlState, c: Cloud) {
  const mem: Mon[] = [];
  let boom: Mon | null = null;
  for (const m of s.mons) {
    if (m.cid !== c.id || m.st !== INC) continue;
    if (m.k === 'cracker' && !boom) boom = m;
    else mem.push(m);
  }
  ev(s, 'cracker', c.x, c.y, mem.length);
  see(s, 'split');
  if (boom) {
    fling(s, boom, -Math.PI / 2, 0.02, c.chain);
    boom.vz = 0.012;
    boom.tm = 40;
    koCount(s, boom);
  }
  if (mem.length < 2) {
    // 튈 만큼 없으면 구름이 크게 한 번 튕긴다
    const a = Math.atan2(c.vy, c.vx) + 0.9;
    c.vx = Math.cos(a) * V_ROCKET;
    c.vy = Math.sin(a) * V_ROCKET;
    c.life += 30;
    c.n = mem.length;
    return;
  }
  c.dead = true;
  const k = Math.min(3, mem.length), a0 = Math.atan2(c.vy, c.vx) + (k === 2 ? Math.PI / 2 : 0);
  const parts: Mon[][] = [];
  for (let i = 0; i < k; i++) parts.push([]);
  mem.forEach((m, i) => parts[i % k].push(m));
  parts.forEach((p, i) => {
    const a = a0 + (TAU * i) / k;
    s.tc[c.tap & 15] -= p.length; // 다시 삼키며 센다
    const rc = spawnCloud(s, p, c.x + Math.cos(a) * 0.03, c.y + Math.sin(a) * 0.02, Math.cos(a), Math.sin(a) * 0.7, c.tap, c.chain, 2);
    rc.life += 14 * p.length;
  });
}
function land(s: BrawlState, m: Mon) {
  if (m.sky) return void (m.st = KO), (m.tm = 1);
  m.x = clamp(m.x, 0.04, s.L - 0.05);
  m.y = clamp(m.y, MY0 - 0.03, MY1 + 0.03);
  m.z = 0;
  let hit: Mon | null = null, bd = 1e9;
  if (m.chain < 6) {
    for (const o of s.mons) {
      if (o === m || o.k === 'boss' || !(canFight(o) || o.st === SLEEP)) continue;
      const lim = (m.r + o.r) * 0.75, d = (o.x - m.x) ** 2 + ((o.y - m.y) * 1.4) ** 2;
      if (d < lim * lim && d < bd) (bd = d), (hit = o);
    }
  }
  m.st = KO;
  m.tm = KO_T;
  ev(s, 'land', m.x, m.y, hit ? 1 : 0);
  if (hit) {
    ev(s, 'angry', hit.x, hit.y, m.chain + 1);
    if (hit.st === SLEEP) wake(s, hit, m.tap, m.chain + 1);
    else provoke(s, hit, m.tap, m.chain + 1, m.vx, m.vy, false);
  }
}

function monsters(s: BrawlState) {
  const ms = s.mons, xmax = s.L - 0.38;
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    switch (m.st) {
      case IDLE: {
        if (m.cool > 0) m.cool--;
        if (m.sus > 0) m.sus--;
        if (m.k === 'owl') {
          // 구름이 보는 원 안에 들어오면 호루라기를 분다
          if (m.wind < 0) m.wind++;
          else {
            let near = false;
            for (const c of s.clouds) if (!c.dead && !c.mega && (c.x - m.x) ** 2 + (c.y - m.y) ** 2 < OWL_R * OWL_R) near = true;
            if (near) {
              if (m.wind === 0) ev(s, 'puff', m.x, m.y);
              if (++m.wind >= OWL_WIND) {
                m.wind = -OWL_REST;
                for (const c of s.clouds) if (!c.dead && !c.mega && (c.x - m.x) ** 2 + (c.y - m.y) ** 2 < (OWL_R + 0.07) ** 2) disperse(s, c);
                ev(s, 'whistle', m.x, m.y);
                see(s, 'whistle');
              }
            } else if (m.wind > 0) m.wind = Math.max(0, m.wind - 2);
          }
        }
        if (m.still) break;
        goal(s, m);
        let sp = KSPD[m.k] * GFAST;
        if (m.lure > 0) {
          m.lure--;
          const c = cloudById(s, m.lureC);
          if (c) (GX = c.x), (GY = c.y), (sp = 0.0052);
          else m.lure = 0;
        } else if (m.k === 'chick' || (m.k === 'rabbit' && m.cool <= 0)) {
          let bc: Cloud | null = null, bd = m.k === 'chick' ? 0.5 ** 2 : 1e9;
          for (const c of s.clouds) {
            if (c.dead) continue;
            const d = (c.x - m.x) ** 2 + (c.y - m.y) ** 2;
            if (m.k === 'rabbit' ? d < (0.2 + c.r) ** 2 && d < bd : d < bd) (bd = d), (bc = c);
          }
          if (bc && m.k === 'chick') (GX = bc.x), (GY = bc.y), (sp = 0.0082);
          else if (bc) {
            // 토끼: 구름 반대쪽으로 달아난다
            const d = Math.sqrt(bd) || 0.001;
            m.st = FLEE;
            m.tm = FLEE_T;
            m.vx = ((m.x - bc.x) / d) * FLEE_V;
            m.vy = ((m.y - bc.y) / d) * FLEE_V;
            m.tap = bc.tap;
            m.chain = bc.chain;
            m.face = m.vx >= 0 ? 1 : -1;
            ev(s, 'flee', m.x, m.y);
            see(s, 'flee');
            break;
          }
        }
        const dx = GX - m.x, dy = GY - m.y, d = Math.hypot(dx, dy);
        m.walk = d > 0.004;
        if (d > 1e-4) {
          const stp = Math.min(sp, d);
          m.x += (dx / d) * stp;
          m.y += (dy / d) * stp;
          if (Math.abs(dx) > 0.004) m.face = dx > 0 ? 1 : -1;
        }
        m.x = clamp(m.x, 0.08, xmax);
        m.y = clamp(m.y, MY0, MY1);
        break;
      }
      case ENTER: {
        goal(s, m);
        const dx = GX - m.x, dy = GY - m.y, d = Math.hypot(dx, dy);
        m.walk = true;
        m.face = dx > 0 ? 1 : -1;
        if (d < 0.02 || (m.x < xmax && d < 0.12)) m.st = IDLE;
        else (m.x += (dx / d) * 0.0042), (m.y += (dy / d) * 0.0042);
        break;
      }
      case DASH: {
        let b = monById(s, m.tgt);
        if (!b || !canFight(b)) {
          b = nearestFighter(s, m);
          if (b) m.tgt = b.id;
        }
        if (!b || ++m.tm > 110) {
          provokeSolo(s, m);
          break;
        }
        const dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy) || 0.001;
        m.face = dx >= 0 ? 1 : -1;
        m.walk = true;
        if (d <= m.r + b.r + BONK_GAP) startHit(s, m, b);
        else (m.x += (dx / d) * DASH_V), (m.y += (dy / d) * DASH_V);
        break;
      }
      case HIT: {
        if (--m.tm > 0) break;
        if (m.tgt === T_VICTIM) m.st = IDLE; // 때린 놈이 먼저 딴 구름에 삼켜졌다
        else if (m.tgt === T_BOAR) {
          spawnCloud(s, [m], m.x, m.y, Math.cos(m.ang), Math.sin(m.ang) * 0.8, m.tap, m.chain, 1);
          ev(s, 'charge', m.x, m.y);
          see(s, 'charge');
        } else if (m.tgt === T_SOLO) spawnCloud(s, [m], m.x, m.y, m.dx, m.dy, m.tap, m.chain, 0);
        else {
          const mem = [m];
          let x = 0, y = 0, k = 0;
          for (const id of [m.tgt, m.tgt2]) {
            const b = id >= 0 ? monById(s, id) : null;
            if (b && b.st === HIT && b.tgt === T_VICTIM) mem.push(b), (x += b.x), (y += b.y), k++;
          }
          if (k) spawnCloud(s, mem, (x / k) * 0.7 + m.x * 0.3, (y / k) * 0.7 + m.y * 0.3, m.dx, m.dy, m.tap, m.chain, 0);
          else spawnCloud(s, mem, m.x, m.y, m.dx, m.dy, m.tap, m.chain, 0);
        }
        break;
      }
      case FLY: {
        m.x += m.vx;
        m.y += m.vy;
        m.z = Math.max(0, m.z + m.vz);
        m.vz -= m.sky ? 0 : 0.0042;
        if (--m.tm <= 0) land(s, m);
        break;
      }
      case KO:
      case DAZE: {
        if (--m.tm <= 0) {
          if (m.st === KO) m.st = -1;
          else m.st = IDLE;
        }
        break;
      }
      case NOTICE: {
        const tx = s.fx + 0.1, ty = MY1, dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
        m.face = dx >= 0 ? 1 : -1;
        m.walk = d > 0.01;
        if (d > 0.01) (m.x += (dx / d) * Math.min(0.003, d)), (m.y += (dy / d) * Math.min(0.003, d));
        if (--m.tm <= 0) {
          // 꿀밤!
          m.st = IDLE;
          s.noticer = -1;
          s.hearts--;
          s.hits++;
          s.kb = 34;
          s.alert = 0;
          s.safeT = s.t + SAFE_T;
          ev(s, 'bonkfox', s.fx, FOX_Y);
          if (s.hearts <= 0) endStage(s, false);
        }
        break;
      }
      case FLEE: {
        m.x += m.vx;
        m.y += m.vy;
        if ((m.y < MY0 && m.vy < 0) || (m.y > MY1 && m.vy > 0)) m.vy = -m.vy;
        if ((m.x < Math.max(0.08, s.cam + 0.04) && m.vx < 0) || (m.x > Math.min(xmax, s.cam + 0.98) && m.vx > 0)) (m.vx = -m.vx), (m.face = -m.face);
        let hit: Mon | null = null;
        for (const o of ms) {
          if (o === m || o.k === 'boss' || !(canFight(o) || o.st === SLEEP)) continue;
          const lim = m.r + o.r;
          if ((o.x - m.x) ** 2 + (o.y - m.y) ** 2 < lim * lim * 0.8) {
            hit = o;
            break;
          }
        }
        if (hit) {
          m.chain++;
          ev(s, 'bump', hit.x, hit.y, m.chain);
          see(s, 'bump');
          if (hit.st === SLEEP) wake(s, hit, m.tap, m.chain), (m.st = DAZE), (m.tm = 40);
          else startHit(s, m, hit), (m.dx = m.vx / FLEE_V), (m.dy = m.vy / FLEE_V);
        } else if (--m.tm <= 0) (m.st = IDLE), (m.cool = FLEE_COOL), ev(s, 'pant', m.x, m.y);
        break;
      }
    }
  }
}
function provokeSolo(s: BrawlState, m: Mon) {
  m.st = HIT;
  m.tm = HIT_T;
  m.tgt = T_SOLO;
  m.dx = m.face;
  m.dy = 0;
  m.hitT = s.t;
  ev(s, 'solo', m.x, m.y);
}

function clouds(s: BrawlState) {
  const cs = s.clouds, ms = s.mons, n0 = cs.length;
  for (let ci = 0; ci < n0; ci++) {
    const c = cs[ci];
    if (c.dead) continue;
    c.age++;
    c.life--;
    if (c.kick > 0) c.kick--;
    if (c.nomerge > 0) c.nomerge--;
    if (c.tgtc >= 0) {
      const t = cloudById(s, c.tgtc);
      if (t) {
        const d = Math.hypot(t.x - c.x, t.y - c.y) || 0.001;
        c.vx = ((t.x - c.x) / d) * V_CHARGE;
        c.vy = ((t.y - c.y) / d) * V_CHARGE;
      } else c.tgtc = -1;
    }
    if (c.kind !== 0 || c.age > BLOOM) (c.x += c.vx), (c.y += c.vy);
    const fr = c.kind === 0 && c.age <= BLOOM ? 1 : c.mega ? 0.88 : c.kind === 1 && c.age < CHARGE_T ? 1 : FRIC;
    c.vx *= fr;
    c.vy *= fr;
    if ((c.y < MY0 && c.vy < 0) || (c.y > MY1 && c.vy > 0)) (c.vy = -c.vy), ev(s, 'wall', c.x, c.y);
    const xl = Math.max(0.07, s.cam + 0.05), xr = Math.min(s.L - 0.34, s.cam + 0.97);
    if ((c.x < xl && c.vx < 0) || (c.x > xr && c.vx > 0)) (c.vx = -c.vx), ev(s, 'wall', c.x, c.y);
    if (c.tor > 0) {
      c.tor--;
      const R = c.mega ? 1.6 : 0.42, pull = c.mega ? 0.011 : 0.0062;
      for (const m of ms) {
        if (m.k === 'boss' || !(m.st === IDLE || m.st === DAZE || m.st === ENTER || m.st === NOTICE)) continue;
        const dx = c.x - m.x, dy = c.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 > R * R || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        m.x += (dx / d) * pull;
        m.y += (dy / d) * pull;
      }
    }
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (!edible(m)) continue;
      const lim = c.r + m.r * 0.55, dx = m.x - c.x, dy = m.y - c.y;
      if (dx * dx + dy * dy > lim * lim) continue;
      if (m.k === 'boss') {
        if (c.mega) continue;
        if (c.n >= s.bossNeed) {
          swallow(s, c, m);
          c.mega = 1;
          c.tor = 9999;
          c.split = 0;
          c.life = 130;
          c.vx = c.vy = 0;
          c.r = radiusOf(s, c);
          ev(s, 'bossin', m.x, m.y, c.n);
          see(s, 'mega');
        } else if (c.kick <= 0) {
          const d = Math.hypot(dx, dy) || 0.001;
          c.vx = (-dx / d) * 0.021;
          c.vy = (-dy / d) * 0.021 + jit(s.rng, 0.004);
          c.kick = 45;
          c.life += 26;
          s.kicks++;
          s.bossNeed = Math.max(2, s.bossNeed - 1);
          m.hitT = s.t;
          ev(s, 'kick', m.x, m.y, s.bossNeed);
          see(s, 'kick');
        }
        continue;
      }
      if (m.st === SLEEP) {
        if (c.kind === 1 && c.age < 4) continue;
        wake(s, m, c.tap, c.chain + 1);
        continue;
      }
      swallow(s, c, m);
    }
    if (c.split > 0 && --c.split === 0) splitCloud(s, c);
    if (!c.dead && (c.life <= 0 || c.age > AGE_MAX)) burst(s, c);
  }
  // 구름끼리 만나면 합쳐진다
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i];
    if (a.dead || a.nomerge > 0) continue;
    for (let j = i + 1; j < cs.length; j++) {
      const b = cs[j];
      if (b.dead || b.nomerge > 0) continue;
      const lim = (a.r + b.r) * 0.8;
      if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 > lim * lim) continue;
      const [big, sm] = a.mega || (!b.mega && a.n >= b.n) ? [a, b] : [b, a];
      for (const m of ms) if (m.cid === sm.id && m.st === INC) m.cid = big.id;
      const wa = big.n, wb = sm.n;
      if (!big.mega) (big.vx = (big.vx * wa + sm.vx * wb) / (wa + wb)), (big.vy = (big.vy * wa + sm.vy * wb) / (wa + wb)), (big.x = (big.x * wa + sm.x * wb) / (wa + wb)), (big.y = (big.y * wa + sm.y * wb) / (wa + wb));
      big.n += sm.n;
      big.w += sm.w;
      big.life = Math.min(AGE_MAX, Math.max(big.life, sm.life) + 16);
      big.tor = Math.max(big.tor, sm.tor);
      if (sm.split > 0 && !big.mega) big.split = Math.max(big.split, sm.split);
      if (big.kind === 1 && big.age >= 6) (big.kind = 0), (big.tgtc = -1);
      big.chain = Math.max(big.chain, sm.chain);
      if (!s.lite) for (const q of sm.cols) if (big.cols.length < 8) big.cols.push(q);
      big.r = radiusOf(s, big);
      big.popT = s.t;
      sm.dead = true;
      ev(s, 'merge', big.x, big.y, big.n);
      see(s, 'merge');
    }
  }
}

function fox(s: BrawlState) {
  if (s.kb > 0) {
    s.fx = Math.max(0.1, s.fx - 0.3 * ((s.kb / 34) ** 2 - ((s.kb - 1) / 34) ** 2));
    s.kb--;
    s.blocked = false;
    return;
  }
  let block: Mon | null = null, bd = 9, ahead = 9;
  for (const m of s.mons) {
    if (!blocks(m)) continue;
    const d = m.x - s.fx;
    if (d < -0.05) continue;
    if (d < ahead) ahead = d;
    if (d < STOP + (m.k === 'boss' ? 0.1 : 0) && d < bd) (bd = d), (block = m);
  }
  let cw = false;
  for (const c of s.clouds) {
    if (c.dead) continue;
    const d = c.x - s.fx;
    if (d > -0.14 && d < 0.2 + c.r) cw = true;
    if (d > -0.14 && d < ahead) ahead = d;
  }
  s.cloudWait = cw;
  s.blocked = !!block;
  if (block || cw) s.blockT++;
  else {
    s.blockT = 0;
    s.run = ahead > CLEAR;
    s.fx += s.run ? RUN : WALK;
  }
  // 들킴
  if (s.noticer === -2) (s.noticer = -1), (s.alert = 0.5), (s.safeT = s.t + 60), ev(s, 'phew', s.fx, FOX_Y);
  if (s.noticer >= 0) {
    const m = monById(s, s.noticer);
    if (!m || m.st !== NOTICE) (s.noticer = -1), (s.alert = 0.5);
  } else if (s.st > GRACE && s.t > s.safeT) {
    if (block) {
      let busy = block.st !== IDLE;
      if (!busy) for (const c of s.clouds) if (!c.dead && (c.x - block.x) ** 2 + (c.y - block.y) ** 2 < 0.36 ** 2) busy = true;
      if (!busy) s.alert += 1 / PATIENCE[Math.min(s.stage, PATIENCE.length - 1)];
    }
    s.alert = Math.max(0, s.alert - 0.00035);
    if (s.alert >= 1) {
      // 여우에게 가장 가까운 놈이 알아챈다
      let nm: Mon | null = null, nd = 0.62;
      for (const m of s.mons) {
        if (m.st !== IDLE || m.k === 'boss' || m.k === 'owl' || m.k === 'bear' || m.k === 'wiz') continue;
        const d = m.x - s.fx;
        if (d > -0.05 && d < nd) (nd = d), (nm = m);
      }
      if (nm) {
        nm.st = NOTICE;
        nm.tm = NOTICE_T;
        s.noticer = nm.id;
        ev(s, 'notice', nm.x, nm.y);
        see(s, 'notice');
      }
      s.alert = nm ? 1 : 0.97;
    }
  }
  if (s.fx >= s.potX - 0.1) endStage(s, true);
}

/** 대장 판: 졸개가 계속 몰려온다 (화면에 24마리 넘지 않게) */
function bossWaves(s: BrawlState) {
  const d = STAGES[s.stage];
  if (!d.boss || s.bossGone) return;
  if (++s.bossT < 200) return;
  let awake = 0;
  for (const m of s.mons) if (m.k !== 'boss' && blocks(m) && m.x > s.L - 1.5) awake++;
  if (awake >= 10 || s.mons.length >= 21) return void (s.bossT = 140);
  s.bossT = 0;
  const gi = s.groups.length - 1, G = s.groups[gi], n = 3 + (s.rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const k = CH[d.boss.pool[Math.floor(s.rng() * d.boss.pool.length)]];
    const m = mk(s, k, G.x + jit(s.rng, 0.32), MY0 - 0.13 - s.rng() * 0.05, gi);
    m.st = ENTER;
    m.still = k === 'bear';
    m.a = s.rng() * TAU;
    m.f = 0.5 + s.rng() * 0.5;
    m.dir = s.rng() < 0.5 ? -1 : 1;
    if (m.still) (m.hx = G.x + jit(s.rng, 0.12)), (m.hy = G.y + jit(s.rng, 0.1));
  }
  ev(s, 'wave', G.x, G.y, n);
}

/** 결과 화면 동안: 날던 놈은 떨어지고 기절한 놈은 사라진다 (새 싸움은 없다) */
function settle(s: BrawlState) {
  for (const m of s.mons) {
    if (m.st === FLY) {
      m.x += m.vx;
      m.y += m.vy;
      m.z = Math.max(0, m.z + m.vz);
      m.vz -= m.sky ? 0 : 0.0042;
      if (--m.tm <= 0) (m.st = m.sky ? -1 : KO), (m.tm = KO_T), (m.z = 0);
    } else if (m.st === KO && --m.tm <= 0) m.st = -1;
  }
  if (s.mons.some((m) => m.st === -1)) s.mons = s.mons.filter((m) => m.st !== -1);
}

function endStage(s: BrawlState, ok: boolean) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.noticer = -1;
  for (const m of s.mons) if (m.st === NOTICE) m.st = IDLE;
  if (ok) {
    const d = STAGES[s.stage];
    s.starOk = [true, s.hits === 0, s.bestTap >= d.need];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS;
    s.level++;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    if (d.boss && s.hearts < 3) s.hearts++;
    ev(s, 'clear', s.potX, FOX_Y, s.got);
  } else ev(s, 'fail', s.fx, FOX_Y);
}

function world(s: BrawlState) {
  s.st++;
  // 1판 첫 화면: 저쪽에서 벌써 둘이 싸움이 붙는다 (구경)
  if (s.stage === 0 && s.st === 24 && s.taps === 0 && s.mons.length > 7) {
    const a = s.mons[6], b = s.mons[7];
    if (a.st === IDLE && b.st === IDLE) (a.tap = 1), (a.chain = 1), a.x < b.x ? startHit(s, a, b) : startHit(s, b, a);
  }
  monsters(s);
  if (s.phase !== 'play') return;
  if ((s.st & 1) === 0) separate(s);
  clouds(s);
  fox(s);
  bossWaves(s);
  let dead = false;
  for (const m of s.mons) if (m.st === -1) dead = true;
  if (dead) s.mons = s.mons.filter((m) => m.st !== -1);
  if (s.clouds.length && s.clouds.some((c) => c.dead)) s.clouds = s.clouds.filter((c) => !c.dead);
  s.cam = clamp(s.fx - 0.2, 0, s.L - 1);
}

function doTap(s: BrawlState, px: number, py: number) {
  if (s.cd > 0) return void ev(s, 'cool', px + s.cam, py);
  const wx = px + s.cam;
  let best: Mon | null = null, bd = 1e9;
  for (const m of s.mons) {
    if (!tappable(m)) continue;
    const mx = m.x - s.cam;
    if (mx < -0.03 || mx > 1.03) continue;
    const d = (m.x - wx) ** 2 + (m.y - m.r * 0.7 - py) ** 2;
    if (d < bd) (bd = d), (best = m);
  }
  if (!best) return void ev(s, 'none', wx, py);
  tapMon(s, best);
}
function tapMon(s: BrawlState, m: Mon) {
  s.cd = CD;
  s.taps++;
  if (s.firstTap < 0) s.firstTap = s.t;
  s.lastTapT = s.t;
  const tap = ++s.tapN, slot = tap & 15;
  s.tc[slot] = s.tk[slot] = s.tw[slot] = 0;
  ev(s, 'tap', m.x, m.y);
  if (m.st === SLEEP) wake(s, m, tap, 1);
  else (m.st = IDLE), provoke(s, m, tap, 1, m.face, 0, true);
}

function pickPerk(s: BrawlState, side: number) {
  const ch = STAGES[s.stage].ch;
  if (ch === 0) s.perkA = side + 1;
  else s.perkB = side + 1;
  s.pickSel = side;
  see(s, PICKS[ch][side].key);
  ev(s, 'pick', side ? 0.72 : 0.28, 0.95, side);
}

function cosmetic(s: BrawlState) {
  if (s.events.length > 80) s.events = s.events.filter((e) => s.t - e.t < 120);
  if (s.spot && s.t - s.spot.t > 260) s.spot = null;
  if (s.news && s.t - s.news.t > 210) s.news = null;
  if (!s.news && s.newsQ.length) s.news = { text: s.newsQ.shift()!, t: s.t };
}

const game: GameDef<BrawlState> & { wows(s: BrawlState): number } = {
  id: 'brawlstart',
  name: '싸움 붙이기',
  genes: ['brawlstart', 'chain', 'collect'],
  twist: "나는 못 싸운다 — 톡 한 놈이 옆 놈 뒤통수를 '딱!' 치면 둘이 싸움 구름이 되어 굴러가며 닿는 놈을 다 삼키고, 걷힐 때 튕겨 나온 놈이 또 싸움을 붙인다. 적이 붐빌수록 좋다",
  rules: [
    "몬스터를 톡 하면 옆 놈을 '딱!' — 둘이 싸움 구름이 되어 굴러가며 닿는 놈을 다 삼켜요.",
    '무리가 붐빌 때 붙이면 구름이 커져요. 여우는 길이 비면 저절로 꿀단지까지 가요.',
    "오래 숨어 있으면 '!' — 그놈을 얼른 싸움 붙이지 못하면 꿀밤(하트 -1).",
  ],
  controls: 'touch',
  hint: '몬스터를 톡 = 옆 놈을 딱! 싸움 붙이기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 좋은 몬스터 장터 길의 꼬마 여우 장난꾸러기 — 손그림 스티커 같은 만화 싸움 구름 소동',
    mood: '줄무늬 천막과 깃발이 늘어선 밝은 낮의 장터 길. 통통한 도깨비·곰·토끼가 어슬렁대다 톡 한 번에 먼지 구름 속 주먹다짐이 되고, 별과 신발이 튀어나오며 굴러가 온 장터를 삼킨다. 상자 뒤에 숨은 꼬마 여우는 킥킥 웃으며 꿀단지를 향해 살금살금 걷는다.',
    palette: { bg: '#ffe9b8', ink: '#4a2e1a', muted: '#9a7b5a', accent: '#ffb52e', hot: '#ff5a3c', soft: '#fff6dc' },
  },
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: 3 } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, st: 0, stage: 0, phase: 'play', pt: 0, ok: false, lite: false,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, won: false, dead: false, level: 0, perkA: 0, perkB: 0,
      L: 3, potX: 2.8, cam: 0, fx: 0.13, kb: 0, blocked: false, blockT: 0, run: false, alert: 0, noticer: -1, safeT: 0, cloudWait: false,
      mons: [], clouds: [], groups: [], nid: 0, bossId: -1, bossNeed: 0, bossGone: false, bossT: 0, kicks: 0,
      down: false, cd: 0, taps: 0, tapN: 1, tc: new Array(16).fill(0), tk: new Array(16).fill(0), tw: new Array(16).fill(0),
      bestTap: 0, hits: 0, kos: 0, chainMax: 0, wowN: 0, firstTap: -1, firstWow: -1,
      dex: {}, seen: new Set<string>(), newsQ: [], news: null, spot: null, events: [],
      foxMood: 0, foxMoodT: 0, giggle: 0, lastTapT: -999, lastBurstT: -999, pickSel: -1, lvT: -999,
    } as BrawlState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, fresh = !!p && !s.down;
    s.down = !!p;
    if (s.cd > 0) s.cd--;
    if (s.phase === 'play') {
      if (fresh) doTap(s, p!.x, p!.y * A);
      world(s);
    } else if (s.phase === 'result') {
      s.pt++;
      settle(s); // 날아가던 놈들은 마저 떨어진다
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL) || (fresh && s.pt > RESULT_MIN)) {
        if (!s.ok || s.won) s.dead = true;
        else if (STAGES[s.stage].boss && STAGES[s.stage].ch < PICKS.length) (s.phase = 'pick'), (s.pt = 0), (s.pickSel = -1), ev(s, 'pickopen', 0.5, 0.9);
        else s.stage++, newStage(s);
      }
    } else {
      s.pt++;
      if (s.pickSel < 0) {
        if (fresh && s.pt > PICK_MIN) pickPerk(s, p!.x < 0.5 ? 0 : 1);
        else if (inp.pick !== undefined && inp.pick < 2 && s.pt > PICK_MIN) pickPerk(s, inp.pick);
        else if (s.pt >= PICK_AUTO) pickPerk(s, 0);
        if (s.pickSel >= 0) s.pt = 2000;
      } else if (s.pt >= 2000 + 70) s.stage++, newStage(s);
    }
    cosmetic(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const brawlstart = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0, 1), y: clamp(y / A, 0, 1) } });
const tapAt = (s: BrawlState, m: Mon) => at(m.x - s.cam, m.y - m.r * 0.7);
const onScreen = (s: BrawlState, m: Mon) => m.x - s.cam > 0.01 && m.x - s.cam < 0.99;

/** 내다보기용 복사 (연출·도감은 건드리지 않는다) */
function cloneSim(s: BrawlState): BrawlState {
  return {
    ...s, lite: true, rng: mulberry32((s.seed ^ Math.imul(s.t + 1, 0x9e3779b1)) >>> 0),
    mons: s.mons.map((m) => ({ ...m })), clouds: s.clouds.map((c) => ({ ...c })), groups: s.groups.map((g) => ({ ...g })), tc: s.tc.slice(), tk: s.tk.slice(), tw: s.tw.slice(), events: [], newsQ: [], starOk: s.starOk,
  };
}
const quiet = (s: BrawlState) => {
  if (s.clouds.length || s.noticer >= 0) return false;
  for (const m of s.mons) if (m.st === HIT || m.st === DASH || m.st === FLY || m.st === FLEE) return false;
  return true;
};
function runSim(c: BrawlState, max: number) {
  for (let i = 0; i < max && c.phase === 'play'; i++) {
    c.t++;
    world(c);
    if (i > 16 && quiet(c)) break;
  }
  // 아직 굴러가는 구름은 그 자리에서 걷힌 것으로 센다
  if (c.phase === 'play') for (const q of c.clouds) if (!q.dead) burst(c, q);
}
/** 결과·장 끝 화면 넘기기 (모든 봇 공통) */
function between(s: BrawlState, side: number): Input | null {
  if (s.phase === 'result') return !s.down && s.pt > RESULT_MIN + 2 ? at(0.5, 0.9) : NO;
  if (s.phase === 'pick') return !s.down && s.pickSel < 0 && s.pt > PICK_MIN + 2 ? at(side ? 0.72 : 0.28, 0.95) : NO;
  return null;
}

const smartMem = new WeakMap<object, { next: number }>();
/** 무리가 지금 모여 있나 (흩어지지 않는 무리·줄·제자리는 늘 모인 것으로) */
const tight = (s: BrawlState, m: Mon) => {
  const G = s.groups[m.g];
  if (!G || G.form !== 0 || G.rout <= G.rin) return true;
  if (openOf(G, s.st) > 0) return false;
  // 모이라는 신호 뒤 다 모일 때까지 잠깐
  return (s.st + G.ph) % G.per > 34 || Math.hypot(m.x - G.x, (m.y - G.y) / 0.62) < G.rin * 1.6;
};
/** 잘하는 봇: 무리가 붐빌 때까지 기다렸다가, 톡 할 만한 놈마다 실제로 굴려 보고(내다보기) 가장 크게 번지는 놈을 고른다 */
export const brawlstartSmart: Bot<BrawlState> = {
  name: '붐빌 때 굴려 보고 가장 크게 번지는 놈',
  act(s) {
    const b = between(s, 0);
    if (b) return b;
    if (s.down || s.cd > 0) return NO;
    let mem = smartMem.get(s);
    if (!mem) smartMem.set(s, (mem = { next: 0 }));
    if (s.t < mem.next) return NO;
    const hurry = s.noticer >= 0 || s.alert > 0.72;
    // 무리별로 깨어 있는 수
    const size: number[] = [];
    for (const m of s.mons) if (m.g >= 0 && canFight(m)) size[m.g] = (size[m.g] ?? 0) + 1;
    const cands: Mon[] = [];
    for (const m of s.mons) {
      if (!tappable(m) || !onScreen(s, m)) continue;
      const G = s.groups[m.g], big = (size[m.g] ?? 0) >= 4 && G && s.st >= G.panic;
      // 큰 무리는 모였을 때만 (급하면 아무 때나)
      if (big && !hurry && !tight(s, m) && s.blockT < 420) continue;
      cands.push(m);
    }
    if (!cands.length) return (mem.next = s.t + 6), NO;
    // 값싼 미리 고르기: 둘레에 몬스터가 많은 놈 · 여우 앞길의 놈 · 특별한 놈
    const dens = (m: Mon) => {
      let n = 0;
      for (const o of s.mons) if (o !== m && edible(o) && (o.x - m.x) ** 2 + (o.y - m.y) ** 2 < 0.2 ** 2) n++;
      return n + (m.k === 'boar' || m.k === 'owl' ? 3 : 0) + (m.x - s.fx < 0.3 ? 1.5 : 0) + (m.st === NOTICE ? 9 : 0);
    };
    const pool = cands.map((m) => ({ m, d: dens(m) })).sort((p, q) => q.d - p.d || p.m.id - q.m.id).slice(0, 6);
    const base = cloneSim(s);
    runSim(base, 150);
    const d = STAGES[s.stage];
    let best: Mon | null = null, bv = -1e9;
    for (const { m } of pool) {
      const c = cloneSim(s), cm = c.mons.find((o) => o.id === m.id)!;
      tapMon(c, cm);
      const slot = c.tapN & 15;
      runSim(c, 210);
      const k = c.tk[slot];
      let v = c.pts - base.pts + (c.hearts - base.hearts) * 3000 + (c.fx - base.fx) * 150 - (c.alert - base.alert) * 900;
      if (s.bestTap < d.need && k >= d.need) v += STAR_PTS;
      if (v > bv) (bv = v), (best = m);
    }
    if (!best || (bv < -200 && !hurry && s.blockT < 300)) return (mem.next = s.t + 9), NO;
    return tapAt(s, best);
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const brawlstartRandom: Bot<BrawlState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.x = 0.03 + rng() * 0.94;
        m.y = 0.3 + rng() * 0.6;
      } else m.next = s.t + 20 + Math.floor(rng() * 70);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

function habit(s: BrawlState, side: number, pick: (c: Mon[]) => Mon): Input {
  const b = between(s, side);
  if (b) return b;
  if (s.down || s.cd > 0) return NO;
  const c = s.mons.filter((m) => tappable(m) && onScreen(s, m));
  return c.length ? tapAt(s, pick(c)) : NO;
}
/** 버릇 봇: 늘 여우에게 가장 가까운 놈 */
export const brawlstartHabit: Bot<BrawlState> = {
  name: '늘 여우에게 가장 가까운 놈',
  act: (s) => habit(s, 0, (c) => c.reduce((a, m) => (Math.hypot(m.x - s.fx, m.y - FOX_Y) < Math.hypot(a.x - s.fx, a.y - FOX_Y) ? m : a))),
};
/** 독립 버릇 봇: 늘 가장 큰 놈 (같으면 앞쪽) */
export const brawlstartHabit2: Bot<BrawlState> = {
  name: '늘 가장 큰 놈',
  act: (s) => habit(s, 1, (c) => c.reduce((a, m) => (m.r > a.r + 1e-9 || (Math.abs(m.r - a.r) < 1e-9 && m.x > a.x) ? m : a))),
};

// ───────────────────────────── 그리기 ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: BrawlState, w: number, h: number, th: Theme) {
  void juice;
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  void s;
  void HZ;
  void CHAPTER;
  void KNAME;
}

/** 측정·스냅샷용: k판(0부터)으로 건너뛴다 (장난 레벨·장 끝 선택도 그 판에 맞춘다) */
export function jumpTo(s: BrawlState, k: number, perkA = 1, perkB = 1) {
  s.stage = clamp(k, 0, STAGES.length - 1);
  s.level = s.stage;
  s.perkA = s.stage >= 4 ? perkA : 0;
  s.perkB = s.stage >= 8 ? perkB : 0;
  s.events = [];
  newStage(s);
}
/** 측정용 속 들여다보기 */
export const brawlstartDebug = { cloneSim, tapMon, runSim, openOf, tappable, world };
