/**
 * 굴러가는 주사위 성 (30라운드: 카지노·주사위 디펜스) — 주사위 합체 디펜스 × 합치기 × 가리키기(톡).
 * 뼈대(주사위 합체 디펜스): 들판의 구불구불한 길로 말썽 젤리가 걸어와 성문을 노린다. 주사위가 탑이 되어 쏘고,
 *   같은 눈끼리 합치면 눈이 하나 오른 큰 탑이 된다. 다음 주사위(눈·색)와 주머니에 남은 주사위가 다 보인다(확률이 눈에 보임).
 * 비틀기(던져서 굴리기, 결정적 연속 물리): 주사위를 '놓는' 게 아니라 성 위의 곰이 '던진다'. 들판을 꾹 누르면 굴러갈 길과
 *   멈출 범위(고스트)가 보이고, 떼면 데굴데굴 굴러가 멈춘 자리에 탑이 선다. 굴러가는 거리·방향은 s.rng로 조금 흔들린다.
 *   - 굴러가다 같은 눈 탑에 부딪히거나, 같은 눈 탑 옆(받침이 닿는 거리)에 멈추면 쿵! 합체해 눈 +1.
 *   - 커진 탑이 또 옆 탑과 같은 눈이 되면 연쇄 합체(그동안 젤리가 잠깐 느려짐). 6과 6이 합치면 왕 주사위(둘레 전부 쏨).
 *   - 다른 눈 탑·바위에 부딪히면 통 튕기고, 연못에 빠지면 퐁당 사라지고, 언덕에 멈추면 굴러 내려가고, 길 위에는 못 선다(길섶으로 또르르).
 * 와우: 첫 톡에 굴린 ⚁가 ⚁ 탑에 쿵 → ⚂가 되자마자 옆 ⚂와 또 쿵 → ⚃ (첫 3초에 연쇄 합체).
 * 판 6개(파도 2~4개, 주사위 수 제한): 목표 = 젤리를 모두 막기. 젤리가 성에 닿으면 하트 -1, 그 판 다시. 하트 셋을 다 잃거나 6판을 마치면 끝.
 *   별(쉬운 말, 판마다 하나씩 늘어남): 1판 "성 지키기" → 2판 + "주사위 N개 남기기" → 3판부터 + 판마다 다른 셋째 별
 *   ("한 번에 두 번 합치기" · "눈 다섯 탑 세우기" · "대장을 길 반쯤에서 잡기").
 * 펼쳐짐(하는 일이 바뀐다): 1 들판(던지기·합체·연쇄) → 2 바위(통 튕김 — 막힌 곳은 바위에 튕겨 보내기)
 *   → 3 연못(퐁당 — 연못을 피한 길로 굴리기) + 🔥 불 주사위(맞은 젤리 옆도 화르륵) → 4 언덕(멈추면 굴러 내려감 — 언덕에 던져 옆 탑으로 흘려 합체)
 *   → 5 박쥐 젤리(길 말고 하늘로 곧장 — 가운데를 지키기) + ❄️ 얼음 주사위(느려짐) → 6 대장 젤리(아주 튼튼 — 큰 탑 하나로 모으기).
 * 웃음: 주사위마다 얼굴 — 굴러가는 동안 눈이 뱅글뱅글, 튕기면 '통!' 어질어질 별, 합체하면 우쭐. 맞은 젤리는 데굴데굴 굴러가다 뿅.
 *   성벽 위 토끼·병아리·고양이 구경꾼이 합체에 만세, 젤리가 성문 가까이 오면 식은땀, 성문에 닿으면 털썩.
 * 확률이 보인다: 곰 손의 '지금' 주사위 · '다음' 주사위 · 주머니에 남은 눈별 개수. 숨긴 확률 없음.
 * 잘하는 봇(성 박사): 남은 파도를 끝까지 시뮬레이션해 막히는지 보고, 막히지 않으면 던지지 않고 아낀다(별 2).
 *   막히거나 셋째 별을 딸 수가 보이면 던질 자리 후보 100여 곳을 굴려 보고(흔들림 끝값까지) 가장 좋은 자리에 던진다.
 * 버릇 봇 ①(측정용, '길 옆 가장 가까운 빈 곳'): 막힐 때만 던지되 성에서 가까운 길섶 빈자리에 던진다.
 * 버릇 봇 ②(독립 측정, '합체만 노림'): 막힐 때만 던지되 같은 눈 탑이 있으면 늘 그 탑에, 없으면 길 가운데 길섶에 던진다.
 * 비슷한 시장 게임: 주사위를 무작위로 불러 같은 눈끼리 합치는 모바일 주사위 디펜스 장르가 있다(장르 뼈대만 씀).
 *   '굴려서 놓기·부딪혀 합체·언덕/연못/바위 물리'는 그 장르에 없는 부분이다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.56;
/** 들판 평면: 가로 0~W, 세로 0~H (0 = 뒤쪽 동굴, H = 앞쪽 성문) */
const W = 1, H = 1.28;
/** 성 위의 곰이 주사위를 굴려 보내는 자리 · 주사위가 갈 수 있는 앞쪽 끝 */
const LX = 0.5, LY = 1.12, YMAX = 1.1;
/** 굴러가는 주사위 반지름 · 탑(눈 p) 반지름 */
const DR = 0.031;
const TRAD = (p: number) => 0.033 + 0.0025 * Math.min(p, 7);
/** 구름 마찰(틱마다 줄어드는 속도) · 흔들림(거리 ±7%, 방향 ±0.03) · 튕김(탑·바위·벽) */
const DEC = 0.00022, JD = 0.07, JA = 0.03, EB_T = 0.55, EB_R = 0.72, EB_W = 0.45;
/** 길: 폭 · 이 안에 멈추면 길섶으로 또르르 */
const ROADW = 0.08, ROAD_OFF = ROADW / 2 + 0.014;
const HILL_G = 0.00042;
/** 옆(합체·연쇄): 탑 받침이 닿는 거리 */
const NEAR = 0.15;
/** 탑이 쏘는 간격 · 판 시작 후 첫 젤리까지 */
const FIRE = 45, PREP = 210;
/** 눈 p 탑이 한 번에 쏘는 힘(눈 수만큼 나눠 쏨). 합체할수록 더 세진다(두 개 따로보다 하나로 합친 쪽이 1.15~1.5배) */
const V = [0, 1, 3, 8, 20, 48, 110, 0];
const KING = 7, KING_DMG = 45;
const RANGE = (p: number) => (p >= KING ? 0.3 : 0.15 + 0.015 * p);
const RESULT_OK = 160, RESULT_FAIL = 150, CARD_T = 140, NEWS_T = 170, MAXROLL = 600;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 200;
/** 젤리 기본 속도(평면/틱) */
const SPD = 0.0065;
const TAU = Math.PI * 2;

export const PLAIN = 0, FIREC = 1, ICE = 2;
export const SLIME = 0, RUN = 1, FLY = 2, BOSS = 3;
const KSPD = [1, 1.55, 0.62, 0.5];

interface WaveDef { k: number; n: number; hp: number; gap: number; at: number }
const wv = (k: number, n: number, hp: number, gap: number, at: number): WaveDef => ({ k, n, hp, gap, at });
type Third = '' | 'chain' | 'big5' | 'hill' | 'boss';
interface StageDef {
  key: string; name: string; news: string; hint: string;
  path: number[][];
  rocks?: number[][]; ponds?: number[][]; hills?: number[][];
  /** 미리 서 있는 탑 [x, y, 눈, 색] */
  pre?: number[][];
  /** 첫 주사위 [눈, 색] (주머니 앞에 붙음) */
  first?: number[];
  /** 주머니 [눈, 색, 개수] */
  bag: number[][];
  waves: WaveDef[];
  left: number; third: Third;
  /** 첫 젤리가 나오기까지(틱) — 그동안 미리 던져 둔다 */
  prep?: number;
}

const S_PATH = [[0.14, -0.04], [0.14, 0.26], [0.86, 0.26], [0.86, 0.6], [0.14, 0.6], [0.14, 0.94], [0.5, 0.94], [0.5, 1.28]];
export const STAGES: StageDef[] = [
  {
    key: 'field', name: '들판', news: '', hint: '같은 눈 탑에 맞히거나 옆에 세우면 쿵! 합체',
    path: S_PATH,
    pre: [[0.5, 0.77, 2, PLAIN], [0.36, 0.77, 3, PLAIN]],
    first: [2, PLAIN],
    bag: [[1, PLAIN, 3], [2, PLAIN, 2], [3, PLAIN, 2]],
    waves: [wv(SLIME, 4, 12, 45, 0), wv(SLIME, 5, 16, 40, 330)],
    left: 0, third: '', prep: 120,
  },
  {
    key: 'rock', name: '바위 언저리', news: '🪨 바위에 맞으면 통! 튕겨요 — 튕겨서 보내기', hint: '바위·다른 눈 탑에 맞으면 통 튕겨요',
    path: [[0.86, -0.04], [0.86, 0.3], [0.14, 0.3], [0.14, 0.66], [0.86, 0.66], [0.86, 0.98], [0.5, 0.98], [0.5, 1.28]],
    rocks: [[0.5, 0.82, 0.05], [0.3, 0.48, 0.045], [0.68, 0.47, 0.045], [0.5, 0.14, 0.04]],
    bag: [[1, PLAIN, 3], [2, PLAIN, 3], [3, PLAIN, 3]],
    waves: [wv(SLIME, 4, 7, 50, 0), wv(RUN, 3, 5, 40, 320), wv(SLIME, 5, 10, 45, 560)],
    left: 3, third: '',
  },
  {
    key: 'pond', name: '연못 마을', news: '💧 연못에 빠진 주사위는 퐁당 사라져요', hint: '연못을 피해서 굴려요 — 점선이 젖으면 ✗',
    path: [[0.5, -0.04], [0.5, 0.18], [0.14, 0.18], [0.14, 0.55], [0.86, 0.55], [0.86, 0.92], [0.5, 0.92], [0.5, 1.28]],
    ponds: [[0.5, 0.74, 0.085], [0.32, 0.37, 0.07], [0.72, 0.36, 0.06]],
    bag: [[1, PLAIN, 3], [2, PLAIN, 3], [3, PLAIN, 2], [2, FIREC, 2]],
    waves: [wv(SLIME, 5, 18, 42, 0), wv(RUN, 6, 12, 28, 300), wv(SLIME, 6, 24, 40, 580)],
    left: 3, third: 'chain',
  },
  {
    key: 'hill', name: '언덕 고개', news: '⛰️ 언덕에 멈춘 주사위는 데굴데굴 굴러 내려가요', hint: '언덕에 던지면 굴러 내려가 옆 탑과 합체!',
    path: [[0.14, -0.04], [0.14, 0.5], [0.86, 0.5], [0.86, 0.96], [0.5, 0.96], [0.5, 1.28]],
    hills: [[0.5, 0.25, 0.14], [0.52, 0.74, 0.12]],
    rocks: [[0.3, 0.8, 0.04]],
    bag: [[1, PLAIN, 2], [2, PLAIN, 3], [3, PLAIN, 3], [4, PLAIN, 1], [3, FIREC, 2]],
    waves: [wv(SLIME, 6, 26, 40, 0), wv(RUN, 6, 18, 28, 300), wv(SLIME, 7, 34, 36, 580)],
    left: 3, third: 'hill',
  },
  {
    key: 'flyer', name: '박쥐 하늘', news: '🦇 박쥐 젤리는 길 말고 하늘로 곧장 성에 와요', hint: '박쥐는 곧장 날아와요 — 가운데도 지켜요',
    path: [[0.86, -0.04], [0.86, 0.34], [0.14, 0.34], [0.14, 0.82], [0.86, 0.82], [0.86, 1.0], [0.5, 1.0], [0.5, 1.28]],
    rocks: [[0.66, 0.6, 0.04]],
    ponds: [[0.3, 0.17, 0.07]],
    bag: [[1, PLAIN, 3], [2, PLAIN, 3], [3, PLAIN, 3], [4, PLAIN, 1], [2, ICE, 2]],
    waves: [wv(SLIME, 6, 30, 40, 0), wv(FLY, 5, 22, 45, 240), wv(RUN, 6, 22, 28, 500), wv(FLY, 5, 28, 40, 700)],
    left: 3, third: 'chain',
  },
  {
    key: 'boss', name: '대장 젤리', news: '👑 대장 젤리 등장! 아주 튼튼해요 — 큰 탑으로', hint: '대장은 튼튼해요 — 큰 탑 하나로 모아요',
    path: [[0.14, -0.04], [0.14, 0.28], [0.86, 0.28], [0.86, 0.62], [0.14, 0.62], [0.14, 0.96], [0.5, 0.96], [0.5, 1.28]],
    hills: [[0.5, 0.45, 0.1]],
    ponds: [[0.72, 0.8, 0.07]],
    bag: [[1, PLAIN, 2], [2, PLAIN, 3], [3, PLAIN, 3], [4, PLAIN, 2], [3, FIREC, 1], [3, ICE, 1]],
    waves: [wv(SLIME, 6, 34, 40, 0), wv(RUN, 6, 24, 28, 260), wv(BOSS, 1, 220, 1, 520), wv(SLIME, 5, 38, 40, 820)],
    left: 2, third: 'boss',
  },
];
export const STAGE_COUNT = STAGES.length;
const nStars = (k: number) => (k === 0 ? 1 : k === 1 ? 2 : 3);
const THIRD_TXT: Record<Third, string> = { '': '', chain: '한 번에 두 번 합치기', big5: '눈 다섯 탑 세우기', hill: '언덕에서 굴려 합치기', boss: '대장을 길 반도 못 가서 잡기' };

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
interface Circle { x: number; y: number; r: number }
interface Layout { path: number[][]; cum: number[]; len: number; gx: number; gy: number; fx: number; fy: number; flen: number; rocks: Circle[]; ponds: Circle[]; hills: Circle[]; fly: boolean }
export interface Tower { id: number; x: number; y: number; p: number; c: number; cd: number; born: number; grow: number; mood: number; moodT: number; fireT: number }
export interface Foe { id: number; k: number; hp: number; max: number; d: number; spd: number; slow: number; x: number; y: number; hitT: number }
interface Spawn { t: number; k: number; hp: number; spd: number }
export interface Sim { t: number; st: number; towers: Tower[]; foes: Foe[]; sched: Spawn[]; si: number; slowT: number; leaks: number; uid: number; L: Layout; marg: number; bossAt: number; lhp: number }
export interface Roll { x: number; y: number; vx: number; vy: number; p: number; c: number; age: number; merges: number; bounces: number; tx: number; ty: number; spin: number; mood: number; hill: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number; c?: number; x2?: number; y2?: number; id?: number; uc?: number }
interface Shot { t: number; x0: number; y0: number; x1: number; y1: number; c: number; p: number }
interface Corpse { t: number; x: number; y: number; k: number; dir: number }
interface Die { p: number; c: number }

export interface DiceState extends Sim {
  rng: Rng; seed: number; stage: number; phase: 'play' | 'result'; pt: number;
  flips: boolean[]; bag: Die[]; bi: number; roll: Roll | null;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number;
  ok: boolean; why: string; down: boolean; aim: { x: number; y: number } | null;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  events: Ev[]; shots: Shot[]; corpses: Corpse[]; slides: Ev[];
  dead: boolean; won: boolean; tries: number; again: boolean; firstThrow: boolean;
  maxChain: number; maxP: number; hillMerge: boolean; lastThrow: number; throws: number; cheerT: number; leakT: number;
}

const ev = (s: DiceState, kind: string, x: number, y: number, o: Partial<Ev> = {}) => s.events.push({ t: s.t, kind, x, y, ...o });
/** 연쇄 합체는 한 번에 일어나지만 보이기는 하나씩 쿵·쿵 (CHAIN_GAP틱 간격) */
const CHAIN_GAP = 16;
function see(s: DiceState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

function mkLayout(d: StageDef, flip: boolean): Layout {
  const fx = (x: number) => (flip ? W - x : x);
  const path = d.path.map(([x, y]) => [fx(x), y]);
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const g = path[path.length - 1], f0 = path[0];
  const C = (a?: number[][]) => (a ?? []).map(([x, y, r]) => ({ x: fx(x), y, r }));
  return {
    path, cum, len: cum[cum.length - 1], gx: g[0], gy: g[1], fx: f0[0], fy: f0[1], flen: Math.hypot(g[0] - f0[0], g[1] - f0[1]),
    rocks: C(d.rocks), ponds: C(d.ponds), hills: C(d.hills), fly: d.waves.some((w) => w.k === FLY),
  };
}
function pathAt(L: Layout, d: number, o: { x: number; y: number }) {
  const P = L.path, c = L.cum;
  if (d <= 0) return void ((o.x = P[0][0]), (o.y = P[0][1]));
  for (let i = 1; i < P.length; i++)
    if (d <= c[i] || i === P.length - 1) {
      const u = Math.min(1, (d - c[i - 1]) / (c[i] - c[i - 1] || 1));
      o.x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u;
      o.y = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u;
      return;
    }
}
const prog = (L: Layout, f: Foe) => f.d / (f.k === FLY ? L.flen : L.len);
function foePos(L: Layout, f: Foe) {
  if (f.k === FLY) {
    const u = Math.min(1, f.d / L.flen);
    f.x = L.fx + (L.gx - L.fx) * u;
    f.y = L.fy + (L.gy - L.fy) * u;
  } else pathAt(L, f.d, f);
}
/** 길까지의 거리와 길 밖으로 향하는 방향 */
function roadNear(L: Layout, x: number, y: number) {
  let bd = 9, nx = 0, ny = 1;
  const P = L.path;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1][0], ay = P[i - 1][1], dx = P[i][0] - ax, dy = P[i][1] - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const qx = ax + dx * u, qy = ay + dy * u, d = Math.hypot(x - qx, y - qy);
    if (d < bd) {
      bd = d;
      if (d > 1e-5) (nx = (x - qx) / d), (ny = (y - qy) / d);
      else {
        const l = Math.sqrt(l2) || 1;
        (nx = -dy / l), (ny = dx / l);
        if (nx * (LX - x) + ny * (LY - y) < 0) (nx = -nx), (ny = -ny);
      }
    }
  }
  return { d: bd, nx, ny };
}

function hurt(S: Sim, f: Foe, dmg: number) {
  f.hp -= dmg;
  f.hitT = S.t;
}
/** 한 틱: 젤리 나오기·걷기·탑 쏘기. E가 있으면(진짜 판) 연출 기록 — 봇의 내다보기는 E 없이 같은 규칙으로 돈다 */
function defStep(S: Sim, E: DiceState | null) {
  S.t++;
  S.st++;
  if (S.slowT > 0) S.slowT--;
  const L = S.L;
  while (S.si < S.sched.length && S.sched[S.si].t <= S.st) {
    const sp = S.sched[S.si++];
    const f: Foe = { id: S.uid++, k: sp.k, hp: sp.hp, max: sp.hp, d: 0, spd: sp.spd, slow: 0, x: 0, y: 0, hitT: -99 };
    foePos(L, f);
    S.foes.push(f);
    if (E) {
      if (sp.k === FLY) see(E, 'flyer', '🦇 박쥐 젤리는 길 말고 하늘로 곧장 날아와요');
      if (sp.k === RUN) see(E, 'runner', '🐰 토끼 젤리는 빨라요 — 길 앞쪽에서 막아요');
      if (sp.k === BOSS) ev(E, 'boss', f.x, f.y, { text: '대장 등장!' });
    }
  }
  const glob = S.slowT > 0 ? 0.35 : 1;
  for (let i = S.foes.length - 1; i >= 0; i--) {
    const f = S.foes[i];
    let v = f.spd * glob;
    if (f.slow > 0) f.slow--, (v *= 0.5);
    f.d += v;
    foePos(L, f);
    if (prog(L, f) >= 1) {
      S.leaks++;
      S.lhp += Math.max(0, f.hp) / f.max;
      S.foes.splice(i, 1);
      if (E) ev(E, 'leak', f.x, f.y, { n: f.k });
    }
  }
  const list: Foe[] = [];
  for (const tw of S.towers) {
    if (tw.cd > 0) {
      tw.cd--;
      continue;
    }
    const R = RANGE(tw.p), R2 = R * R;
    list.length = 0;
    for (const f of S.foes) if (f.hp > 0 && (f.x - tw.x) ** 2 + (f.y - tw.y) ** 2 <= R2) list.push(f);
    if (!list.length) continue;
    tw.cd = FIRE;
    tw.fireT = S.t;
    if (tw.p >= KING) {
      for (const f of list) {
        hurt(S, f, KING_DMG);
        if (E) E.shots.push({ t: S.t, x0: tw.x, y0: tw.y, x1: f.x, y1: f.y, c: 3, p: KING });
      }
      if (E) ev(E, 'kingfire', tw.x, tw.y);
      continue;
    }
    list.sort((a, b) => prog(L, b) - prog(L, a));
    const dmg = V[tw.p] / tw.p;
    let j = 0;
    for (let k = 0; k < tw.p; k++) {
      while (j < list.length && list[j].hp <= 0) j++;
      if (j >= list.length) break;
      const f = list[j];
      hurt(S, f, dmg);
      if (tw.c === FIREC) for (const g of S.foes) if (g !== f && g.hp > 0 && (g.x - f.x) ** 2 + (g.y - f.y) ** 2 < 0.075 ** 2) hurt(S, g, dmg * 0.6);
      if (tw.c === ICE) f.slow = 80;
      if (E) E.shots.push({ t: S.t + k * 3, x0: tw.x, y0: tw.y, x1: f.x, y1: f.y, c: tw.c, p: tw.p });
    }
  }
  for (let i = S.foes.length - 1; i >= 0; i--) {
    const f = S.foes[i];
    if (f.hp > 0) continue;
    const pr = prog(L, f);
    S.marg += 1 - pr;
    if (f.k === BOSS) S.bossAt = Math.min(S.bossAt, pr);
    S.foes.splice(i, 1);
    if (E) {
      E.corpses.push({ t: S.t, x: f.x, y: f.y, k: f.k, dir: f.id % 2 ? 1 : -1 });
      ev(E, 'pop', f.x, f.y, { n: f.k });
    }
  }
}

function mkRoll(tx: number, ty: number, p: number, c: number, jd: number, ja: number): Roll {
  const dx = tx - LX, dy = ty - LY, D = Math.max(0.03, Math.hypot(dx, dy)), ang = Math.atan2(dy, dx) + ja * JA;
  const Dj = D * (1 + jd * JD), v0 = (DEC + Math.sqrt(DEC * DEC + 8 * DEC * Dj)) / 2;
  return { x: LX, y: LY, vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0, p, c, age: 0, merges: 0, bounces: 0, tx, ty, spin: 0, mood: 1, hill: false };
}
function bounceOff(r: Roll, cx: number, cy: number, m: number, e: number) {
  const dx = r.x - cx, dy = r.y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= m * m) return false;
  const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
  r.x = cx + nx * m;
  r.y = cy + ny * m;
  const vn = r.vx * nx + r.vy * ny;
  if (vn < 0) {
    r.vx -= (1 + e) * vn * nx;
    r.vy -= (1 + e) * vn * ny;
    r.bounces++;
    return -vn > 0.0015;
  }
  return false;
}
/** 합체: 탑 T가 주사위를 먹고 눈 +1, 그다음 옆에 같은 눈 탑이 있으면 연쇄 */
function grow(S: Sim, T: Tower, r: Roll, E: DiceState | null) {
  r.merges++;
  T.p++;
  T.c = r.c;
  T.grow = 1;
  T.cd = Math.min(T.cd, 8);
  if (E) ev(E, T.p >= KING ? 'king' : 'merge', T.x, T.y, { n: r.merges, c: T.p, x2: r.x, y2: r.y, id: T.id });
  while (T.p < KING) {
    let U: Tower | null = null, bd = NEAR;
    for (const tw of S.towers) {
      if (tw === T || tw.p !== T.p) continue;
      const d = Math.hypot(tw.x - T.x, tw.y - T.y);
      if (d <= bd) (bd = d), (U = tw);
    }
    if (!U) break;
    S.towers.splice(S.towers.indexOf(U), 1);
    T.p++;
    r.merges++;
    if (E) ev(E, T.p >= KING ? 'king' : 'chain', T.x, T.y, { n: r.merges, c: T.p, x2: U.x, y2: U.y, id: T.id, t: E.t + CHAIN_GAP * (r.merges - 1), uc: U.c });
  }
  if (r.merges >= 2) S.slowT = Math.max(S.slowT, 30 + 25 * r.merges);
}
/** 멈춘 자리: 옆에 같은 눈 탑이 있으면 그리로 쿵, 아니면 탑이 선다 */
function place(S: Sim, r: Roll, E: DiceState | null) {
  let best: Tower | null = null, bd = NEAR;
  for (const tw of S.towers) {
    if (tw.p !== r.p || tw.p >= KING) continue;
    const d = Math.hypot(tw.x - r.x, tw.y - r.y);
    if (d <= bd) (bd = d), (best = tw);
  }
  if (best) return grow(S, best, r, E), 2;
  S.towers.push({ id: S.uid++, x: r.x, y: r.y, p: r.p, c: r.c, cd: 0, born: S.t, grow: 1, mood: 2, moodT: 40, fireT: -99 });
  if (E) ev(E, 'stand', r.x, r.y, { c: r.p });
  return 1;
}
/** 굴러가는 주사위 한 틱. 0 = 굴러가는 중, 1 = 섰다, 2 = 합체, 3 = 퐁당 */
function rollStep(S: Sim, r: Roll, E: DiceState | null): number {
  r.age++;
  const L = S.L;
  let sp = Math.hypot(r.vx, r.vy);
  if (sp > 0) {
    const ns = Math.max(0, sp - DEC);
    r.vx *= ns / sp;
    r.vy *= ns / sp;
    sp = ns;
  }
  let onHill = false;
  for (const h of L.hills) {
    const dx = r.x - h.x, dy = r.y - h.y, d = Math.hypot(dx, dy);
    if (d >= h.r) continue;
    onHill = r.hill = true;
    r.vx += (d > 1e-4 ? dx / d : 0) * HILL_G;
    r.vy += (d > 1e-4 ? dy / d : 1) * HILL_G;
    if (E && sp < 0.002) see(E, 'hillroll', '⛰️ 언덕에 멈추면 데굴데굴 굴러 내려가요');
  }
  r.x += r.vx;
  r.y += r.vy;
  r.spin += Math.hypot(r.vx, r.vy);
  let bonk = false;
  if (r.x < DR) (r.x = DR), r.vx < 0 && ((bonk = -r.vx > 0.002), (r.vx = -r.vx * EB_W));
  if (r.x > W - DR) (r.x = W - DR), r.vx > 0 && ((bonk = r.vx > 0.002), (r.vx = -r.vx * EB_W));
  if (r.y < DR) (r.y = DR), r.vy < 0 && ((bonk = -r.vy > 0.002), (r.vy = -r.vy * EB_W));
  if (r.y > YMAX) (r.y = YMAX), r.vy > 0 && (r.vy = -r.vy * EB_W);
  for (const p of L.ponds)
    if ((r.x - p.x) ** 2 + (r.y - p.y) ** 2 < p.r * p.r) {
      if (E) ev(E, 'sink', r.x, r.y, { c: r.p });
      return 3;
    }
  for (const k of L.rocks)
    if (bounceOff(r, k.x, k.y, k.r + DR, EB_R) && E) {
      ev(E, 'bonk', r.x, r.y, { text: '통!' });
      see(E, 'rock', '🪨 바위에 맞으면 통! 튕겨요');
    }
  for (const tw of S.towers) {
    const m = TRAD(tw.p) + DR;
    if ((r.x - tw.x) ** 2 + (r.y - tw.y) ** 2 >= m * m) continue;
    if (tw.p === r.p && tw.p < KING) return grow(S, tw, r, E), 2;
    if (bounceOff(r, tw.x, tw.y, m, EB_T) && E) {
      ev(E, 'bonk', r.x, r.y, { text: '통!' });
      tw.mood = 3;
      tw.moodT = 40;
      see(E, 'bounce', '🎲 다른 눈 탑에 부딪히면 통 튕겨요');
    }
  }
  if (bonk && E) ev(E, 'bonk', r.x, r.y, { text: '콩!' });
  if (bonk || r.bounces) r.mood = 2;
  const sp2 = Math.hypot(r.vx, r.vy);
  if ((sp2 < 1e-7 && !onHill) || (onHill && r.age > 240 && sp2 < 0.0006) || r.age > MAXROLL) {
    if (roadNear(L, r.x, r.y).d < ROAD_OFF && offRoad(S, r, E) === 3) return 3;
    return place(S, r, E);
  }
  return 0;
}
/** 길 위에 멈춘 주사위는 길섶(가까운 쪽)으로 또르르 — 그 자리에 바위·탑이 있으면 비켜 서고, 연못이면 퐁당 */
function offRoad(S: Sim, r: Roll, E: DiceState | null) {
  const L = S.L, x0 = r.x, y0 = r.y;
  for (let k = 0; k < 6; k++) {
    const rd = roadNear(L, r.x, r.y);
    if (rd.d >= ROAD_OFF) break;
    r.x += rd.nx * (ROAD_OFF - rd.d + 0.003);
    r.y += rd.ny * (ROAD_OFF - rd.d + 0.003);
  }
  for (const k of L.rocks) bounceOff(r, k.x, k.y, k.r + DR, 0);
  for (const tw of S.towers) if (tw.p !== r.p) bounceOff(r, tw.x, tw.y, TRAD(tw.p) + DR, 0);
  r.x = Math.max(DR, Math.min(W - DR, r.x));
  r.y = Math.max(DR, Math.min(YMAX, r.y));
  r.vx = r.vy = 0;
  if (E) ev(E, 'slide', r.x, r.y, { x2: x0, y2: y0, c: r.p }), see(E, 'roadslide', '🛤️ 길 위에는 탑이 못 서요 — 길섶으로 또르르');
  for (const p of L.ponds)
    if ((r.x - p.x) ** 2 + (r.y - p.y) ** 2 < p.r * p.r) {
      if (E) ev(E, 'sink', r.x, r.y, { c: r.p });
      return 3;
    }
  return 0;
}

function cloneSim(S: Sim): Sim {
  return { t: S.t, st: S.st, towers: S.towers.map((o) => ({ ...o })), foes: S.foes.map((f) => ({ ...f })), sched: S.sched, si: S.si, slowT: S.slowT, leaks: S.leaks, uid: S.uid, L: S.L, marg: S.marg, bossAt: S.bossAt, lhp: S.lhp };
}
const done = (S: Sim) => S.si >= S.sched.length && S.foes.length === 0;
/** 지금 탑들로 판 끝까지 돌려 본다 (새로 던지지 않는다면) */
function forward(S0: Sim, maxT = 3600) {
  const S = cloneSim(S0);
  for (let k = 0; k < maxT && !done(S); k++) defStep(S, null);
  return S;
}

function buildSched(d: StageDef): Spawn[] {
  const out: Spawn[] = [];
  for (const w of d.waves) for (let i = 0; i < w.n; i++) out.push({ t: (d.prep ?? PREP) + w.at + i * w.gap, k: w.k, hp: w.hp, spd: SPD * KSPD[w.k] });
  return out.sort((a, b) => a.t - b.t);
}

function newStage(s: DiceState) {
  const d = STAGES[s.stage], flip = s.flips[s.stage];
  const fx = (x: number) => (flip ? W - x : x);
  s.L = mkLayout(d, flip);
  s.towers = (d.pre ?? []).map(([x, y, p, c]) => ({ id: s.uid++, x: fx(x), y, p, c, cd: 0, born: s.t - 99, grow: 0, mood: 0, moodT: 0, fireT: -99 }));
  s.foes = [];
  s.sched = buildSched(d);
  s.si = 0;
  s.st = 0;
  s.slowT = 0;
  s.leaks = 0;
  s.marg = 0;
  s.bossAt = 9;
  s.lhp = 0;
  const bag: Die[] = [];
  for (const [p, c, n] of d.bag) for (let i = 0; i < n; i++) bag.push({ p, c });
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(s.rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  if (d.first) bag.unshift({ p: d.first[0], c: d.first[1] });
  s.bag = bag;
  s.bi = 0;
  s.roll = null;
  s.phase = 'play';
  s.pt = 0;
  s.maxChain = 0;
  s.hillMerge = false;
  s.maxP = Math.max(0, ...s.towers.map((t) => t.p));
  s.starOk = [false, false, false];
  s.shots = [];
  s.corpses = [];
  s.slides = [];
  if (d.key) s.seen.add(d.key);
}
const dieAt = (s: DiceState, i: number): Die | null => s.bag[i] ?? null;
/** 지금까지 이 판의 셋째 별 조건을 채웠나 */
function thirdOk(s: DiceState) {
  const t = STAGES[s.stage].third;
  return t === 'chain' ? s.maxChain >= 2 : t === 'big5' ? s.maxP >= 5 : t === 'hill' ? s.hillMerge : t === 'boss' ? s.bossAt <= 0.5 : false;
}
const leftDice = (s: DiceState) => s.bag.length - s.bi;

/** 화면 좌표 → 평면 (원근: 뒤가 좁다) */
const FY0 = 0.17, KY = 0.8, SB = 0.88, SF = 1.0;
const scl = (y: number) => SB + (SF - SB) * (y / H);
const PX = (x: number, y: number) => 0.5 + (x - 0.5) * scl(y);
const PY = (y: number) => FY0 + y * KY;
const BAND = 1.255;
function toPlane(sx: number, sy: number) {
  const y = (sy - FY0) / KY;
  return { x: 0.5 + (sx - 0.5) / scl(y), y };
}
const inField = (q: { x: number; y: number }) => q.x > -0.04 && q.x < W + 0.04 && q.y > -0.06 && q.y < YMAX + 0.03;
const clampT = (q: { x: number; y: number }) => ({ x: Math.max(DR, Math.min(W - DR, q.x)), y: Math.max(DR, Math.min(LY - 0.06, q.y)) });

function throwAt(s: DiceState, sx: number, sy: number) {
  if (s.phase !== 'play') return;
  const q = toPlane(sx, sy);
  if (!inField(q)) return; // 들판 밖에서 떼면 취소
  if (s.roll) return void ev(s, 'nope', LX, LY - 0.08, { text: '굴러가는 중!' });
  const die = dieAt(s, s.bi);
  if (!die) return void ev(s, 'nope', LX, LY - 0.08, { text: '주사위를 다 썼어요' });
  s.bi++;
  const t = clampT(q);
  s.roll = mkRoll(t.x, t.y, die.p, die.c, s.rng() * 2 - 1, s.rng() * 2 - 1);
  s.firstThrow = true;
  s.lastThrow = s.t;
  s.throws++;
  ev(s, 'throw', LX, LY, { c: die.p });
  see(s, 'throw', '🎲 멈춘 자리에 탑이 서요 — 눈 수만큼 쏴요');
  const nx = dieAt(s, s.bi);
  if (nx?.c === FIREC) see(s, 'fire', '🔥 불 주사위: 맞은 젤리 옆까지 화르륵');
  if (nx?.c === ICE) see(s, 'ice', '❄️ 얼음 주사위: 맞은 젤리가 느려져요');
}

function endStage(s: DiceState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.roll = null;
  const d = STAGES[s.stage], n = nStars(s.stage);
  if (ok) {
    const third = thirdOk(s);
    s.starOk = [true, n >= 2 && leftDice(s) >= d.left, n >= 3 && third];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + leftDice(s) * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.6);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.6);
  }
}

export const rolldice: GameDef<DiceState> = {
  id: 'rolldice',
  name: '굴러가는 주사위 성',
  genes: ['dicedefense', 'merge', 'pointer'],
  twist: '주사위를 놓는 게 아니라 데굴데굴 굴려 보낸다 — 굴러가다 같은 눈 탑에 부딪히면 쿵 합체, 다른 눈·바위엔 통 튕기고, 연못엔 퐁당, 언덕에선 굴러 내려간다',
  rules: [
    '들판을 꾹 눌러 겨누고 떼면 주사위가 데굴데굴 — 멈춘 자리에 탑이 서서 눈 수만큼 젤리를 쏴요.',
    '같은 눈 탑에 부딪히거나 그 옆에 멈추면 쿵! 합체해 눈 +1 (커진 탑이 또 옆과 같으면 연쇄).',
    '젤리가 성에 닿으면 하트 -1, 그 판 다시.',
  ],
  controls: 'touch',
  hint: '들판을 꾹 = 겨누기, 떼면 데굴! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '장난감 성 디오라마 — 주사위 곰과 말썽 젤리',
    mood: '펠트 잔디가 깔린 탁자 위 장난감 들판. 과자색 흙길이 구불구불 동굴에서 블록 성까지 이어지고, 성벽 위 곰이 상아색 주사위를 굴린다. 젤리들은 말랑말랑 통통 튀고, 구경꾼 토끼·병아리·고양이가 합체마다 만세.',
    palette: { bg: '#2d5a3d', ink: '#fffaf0', muted: '#b9d8c0', accent: '#ffd84a', hot: '#ff6b6b', soft: '#d9f2dc' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const flips = STAGES.map(() => rng() < 0.5);
    const s = {
      rng, seed, t: 0, st: 0, towers: [], foes: [], sched: [], si: 0, slowT: 0, leaks: 0, uid: 1, L: mkLayout(STAGES[0], false), marg: 0, bossAt: 9, lhp: 0,
      stage: 0, phase: 'play', pt: 0, flips, bag: [], bi: 0, roll: null, hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0,
      ok: false, why: '', down: false, aim: null, seen: new Set<string>(), newsQ: [], news: null, events: [], shots: [], corpses: [], slides: [],
      dead: false, won: false, tries: 0, again: false, firstThrow: false, maxChain: 0, maxP: 0, hillMerge: false, lastThrow: -999, throws: 0, cheerT: -999, leakT: -999,
    } as DiceState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    // 손을 대고 있는 동안은 겨누기(고스트), 떼는 순간 데굴
    const p = inp.pointer ?? null;
    if (p) (s.down = true), (s.aim = { x: p.x, y: p.y * A });
    else if (s.down) {
      s.down = false;
      if (s.aim) throwAt(s, s.aim.x, s.aim.y);
      s.aim = null;
    }
    s.pt++;
    if (s.events.length > 40) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.shots.length > 60) s.shots = s.shots.filter((q) => s.t - q.t < 30);
    if (s.corpses.length > 20) s.corpses = s.corpses.filter((q) => s.t - q.t < 60);
    if (s.phase === 'result') {
      s.t++;
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
    defStep(s, s);
    if (s.roll) {
      const r = s.roll, res = rollStep(s, r, s);
      if (res) {
        s.roll = null;
        if (r.merges > s.maxChain) s.maxChain = r.merges;
        if (r.merges && r.hill) (s.hillMerge = true), see(s, 'hillmerge', '⛰️ 언덕에서 굴러 내려가 쿵! 합체');
        if (r.merges >= 2) see(s, 'chain', '💥 연쇄 합체! 커진 탑이 옆과 같으면 또 쿵 — 젤리가 잠깐 느려져요');
        if (r.merges >= 1) see(s, 'merge', '✨ 같은 눈끼리 쿵! 합치면 눈 +1, 훨씬 세져요');
        if (res === 3) see(s, 'sink', '💧 연못에 빠진 주사위는 사라져요');
        if (r.merges) s.cheerT = s.t;
      }
    }
    for (const tw of s.towers) if (tw.p > s.maxP) s.maxP = tw.p;
    if (s.maxP >= KING) see(s, 'king', '👑 6과 6이 합치면 왕 주사위 — 둘레를 한꺼번에 쏴요');
    if (s.maxP >= 5) see(s, 'big5', '🏰 눈 다섯 탑! 큰 탑일수록 멀리·세게 쏴요');
    cosmetic(s);
    if (s.leaks > 0) {
      s.leakT = s.t;
      return endStage(s, false, '젤리가 성문에 닿았어요!');
    }
    if (done(s) && !s.roll) endStage(s, true, '');
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

/** 연출용 상태: 탑 표정·자라기, 알림 띠 */
function cosmetic(s: DiceState) {
  for (const tw of s.towers) {
    tw.grow *= 0.88;
    if (tw.moodT > 0 && --tw.moodT === 0) tw.mood = 0;
  }
  if (s.roll) s.roll.mood = s.roll.mood === 2 ? 2 : 1;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

// ───────────────────────────── 봇 ─────────────────────────────
interface Outcome { x: number; y: number; merges: number; res: number; S: Sim; hill: boolean }
/** 이 자리로 던지면? (흔들림 jd·ja 고정) — 진짜 판과 같은 순서(굴림 → 수비)로 돌린다 */
function tryThrow(S0: Sim, tx: number, ty: number, die: Die, jd: number, ja: number, withDef: boolean): Outcome {
  const S = cloneSim(S0), r = mkRoll(tx, ty, die.p, die.c, jd, ja);
  let res = 0;
  for (let k = 0; k < MAXROLL + 2 && !res; k++) {
    if (withDef) defStep(S, null);
    res = rollStep(S, r, null);
  }
  return { x: r.x, y: r.y, merges: r.merges, res, S, hill: r.hill };
}
/** 길(과 박쥐 하늘길)을 촘촘히 찍은 점들: 뒤쪽일수록 가볍게 */
const SAMPLES = new WeakMap<Layout, number[]>();
function samples(L: Layout) {
  let a = SAMPLES.get(L);
  if (a) return a;
  a = [];
  const o = { x: 0, y: 0 };
  for (let d = 0.02; d < L.len; d += 0.04) {
    pathAt(L, d, o);
    a.push(o.x, o.y, 0.6 + 0.6 * (d / L.len));
  }
  if (L.fly) for (let d = 0.03; d < L.flen; d += 0.06) a.push(L.fx + ((L.gx - L.fx) * d) / L.flen, L.fy + ((L.gy - L.fy) * d) / L.flen, 0.9);
  SAMPLES.set(L, a);
  return a;
}
/** 길 앞 절반만 찍은 점들 (대장 별) */
const HALF = new WeakMap<Layout, number[]>();
function halfSamples(L: Layout) {
  let a = HALF.get(L);
  if (a) return a;
  a = [];
  const o = { x: 0, y: 0 };
  for (let d = 0.02; d < L.len / 2; d += 0.04) pathAt(L, d, o), a.push(o.x, o.y, 1);
  HALF.set(L, a);
  return a;
}
/** 탑들이 길을 얼마나 덮나 (눈 힘 × 덮은 길 점) */
function cover(S: Sim, half = false) {
  const a = half ? halfSamples(S.L) : samples(S.L);
  let v = 0;
  for (const tw of S.towers) {
    const R2 = RANGE(tw.p) ** 2, pw = tw.p >= KING ? 300 : V[tw.p] * (tw.c === FIREC ? 1.3 : tw.c === ICE ? 1.2 : 1);
    let n = 0;
    for (let i = 0; i < a.length; i += 3) if ((a[i] - tw.x) ** 2 + (a[i + 1] - tw.y) ** 2 <= R2) n += a[i + 2];
    v += pw * n;
  }
  return v;
}
/** 다음에 올 주사위로 연쇄가 나는 짝(눈 q 탑 옆에 눈 q+1 탑)이 있나 */
function chainReady(S: Sim, s: DiceState, from: number) {
  let best = 0;
  for (const a of S.towers)
    for (const b of S.towers) {
      if (b.p !== a.p + 1 || Math.hypot(a.x - b.x, a.y - b.y) > NEAR) continue;
      let n = 0;
      for (let i = from; i < s.bag.length; i++) if (s.bag[i].p === a.p) n++;
      best = Math.max(best, n);
    }
  return best;
}
function cands(s: DiceState, die: Die) {
  const out: { x: number; y: number }[] = [];
  for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 11; gy++) out.push({ x: 0.07 + gx * 0.123, y: 0.05 + gy * 0.1 });
  for (const tw of s.towers) {
    const dx = tw.x - LX, dy = tw.y - LY, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    if (tw.p === die.p) out.push({ x: tw.x + ux * 0.03, y: tw.y + uy * 0.03 }, { x: tw.x - ux * 0.09, y: tw.y - uy * 0.09 });
    if (Math.abs(tw.p - die.p) === 1) {
      const m = TRAD(tw.p) + DR + 0.045;
      out.push({ x: tw.x - ux * m, y: tw.y - uy * m });
      for (const sd of [-1, 1]) out.push({ x: tw.x - uy * sd * 0.11 - ux * 0.02, y: tw.y + ux * sd * 0.11 - uy * 0.02 });
    }
  }
  for (const h of s.L.hills) for (let k = 0; k < 10; k++) for (const f of [0.45, 0.8]) out.push({ x: h.x + Math.cos((k / 10) * TAU) * h.r * f, y: h.y + Math.sin((k / 10) * TAU) * h.r * f });
  return out.filter((q) => q.x > DR && q.x < W - DR && q.y > DR && q.y < LY - 0.06);
}

interface Plan { x: number; y: number }
/** 이 던지기(굴린 결과 o, 판 끝까지 돌린 F)로 셋째 별이 되나 */
function thirdBy(d: StageDef, o: Outcome, F: Sim) {
  if (d.third === 'chain') return o.merges >= 2;
  if (d.third === 'big5') return o.S.towers.some((t) => t.p >= 5);
  if (d.third === 'hill') return o.hill && o.merges >= 1;
  if (d.third === 'boss') return F.bossAt <= 0.5;
  return false;
}
/** 잘하는 봇의 한 수: 판 끝까지 내다보고 던질지 말지, 어디로 */
function plan(s: DiceState): Plan | null {
  const die = dieAt(s, s.bi);
  if (!die) return null;
  const d = STAGES[s.stage], n = nStars(s.stage);
  const base = forward(s);
  const spare = leftDice(s) - 1 - (n >= 2 ? d.left : 0);
  const wantStar = n >= 3 && !thirdOk(s) && spare >= 0;
  if (base.leaks === 0 && !wantStar) return null;
  // 1) 후보를 굴려만 본다 (수비 없이) → 덮기 점수로 추린다
  const c0 = cover(s);
  const pre: { q: { x: number; y: number }; h: number; h0: number; o: Outcome }[] = [];
  for (const q of cands(s, die)) {
    const o = tryThrow(s, q.x, q.y, die, 0, 0, false);
    if (o.res === 3) continue;
    const h0 = cover(o.S) - c0;
    let h = h0;
    if (wantStar) {
      if (d.third !== 'boss' && thirdBy(d, o, o.S)) h += 1e5;
      if (d.third === 'chain') h += chainReady(o.S, s, s.bi + 1) * 400;
      if (d.third === 'hill' && o.hill) h += 300;
      if (d.third === 'boss') h += (cover(o.S, true) - cover(s, true)) * 2;
    }
    pre.push({ q, h, h0, o });
  }
  // 막기에 좋은 자리 7곳 + 별에 좋은 자리 5곳
  const top = [...pre].sort((a, b) => b.h0 - a.h0).slice(0, 7);
  if (wantStar) for (const it of [...pre].sort((a, b) => b.h - a.h).slice(0, 5)) if (!top.includes(it)) top.push(it);
  const shape = (F: Sim, S: Sim) =>
    !wantStar ? 0 : d.third === 'boss' ? 2e5 * (1 - Math.min(1, F.bossAt)) : d.third === 'chain' ? chainReady(S, s, s.bi + 1) * 3e4 : d.third === 'big5' ? 1e4 * Math.max(0, ...S.towers.map((t) => t.p)) : 0;
  const baseV = -1e6 * base.leaks - 2e5 * base.lhp + 300 * base.marg + (base.leaks ? 0 : (wantStar && d.third === 'boss' && base.bossAt <= 0.5 ? 4e5 : 0) + shape(base, s));
  let best: Plan | null = null, bv = -Infinity;
  for (const it of top) {
    // 흔들림 끝값에서도 괜찮은가 (퐁당 위험 · 별이 흔들림에도 되나)
    let risk = 0, hits = 0;
    for (const [jd, ja] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const o2 = tryThrow(s, it.q.x, it.q.y, die, jd, ja, false);
      if (o2.res === 3) risk++;
      if (d.third !== 'boss' && thirdBy(d, o2, o2.S)) hits++;
    }
    const full = tryThrow(s, it.q.x, it.q.y, die, 0, 0, true);
    const F = forward(full.S);
    let v = -1e6 * F.leaks - 2e5 * F.lhp + 300 * F.marg - risk * 3e5 + (F.leaks ? 0 : it.h * 0.02 + shape(F, full.S));
    if (wantStar && !F.leaks && thirdBy(d, full, F)) v += d.third === 'boss' ? 4e5 : 1.5e5 + hits * 6e4;
    if (v > bv) (bv = v), (best = it.q);
  }
  if (!best) return null;
  // 막히지 않는데 별을 노릴 때는: 별이 되거나(크게 나아짐), 주사위가 넉넉할 때 한 걸음 다가가는 수만
  if (base.leaks === 0 && bv < baseV + (spare >= 1 ? 2e4 : 1e5)) return null;
  return best;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: PX(x, y), y: PY(y) / A } });
const brain = new WeakMap<object, { key: string; p: Plan | null }>();
const ready = (s: DiceState) => s.phase === 'play' && !s.down && !s.roll && s.t - s.lastThrow >= 24 && s.pt >= 20 && s.bi < s.bag.length;

/** 봇: 판 끝까지 내다보고, 막히거나 별이 보일 때만 가장 좋은 자리에 굴린다 */
export const rolldiceSmart: Bot<DiceState> = {
  name: '성 박사',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.bi}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, p: plan(s) }));
    return m.p ? at(m.p.x, m.p.y) : NO;
  },
};

/** 길섶 자리들 (길에서 0.1 떨어진 양옆), 성에서 가까운 순 */
function roadside(L: Layout) {
  const out: { x: number; y: number; d: number }[] = [];
  const o = { x: 0, y: 0 }, o2 = { x: 0, y: 0 };
  for (let d = 0.05; d < L.len - 0.05; d += 0.06) {
    pathAt(L, d, o);
    pathAt(L, d + 0.01, o2);
    const tx = o2.x - o.x, ty = o2.y - o.y, l = Math.hypot(tx, ty) || 1;
    for (const sd of [-1, 1]) {
      const x = o.x - (ty / l) * sd * 0.1, y = o.y + (tx / l) * sd * 0.1;
      if (x > DR && x < W - DR && y > DR && y < LY - 0.06 && roadNear(L, x, y).d > ROAD_OFF) out.push({ x, y, d });
    }
  }
  return out;
}
const freeSpot = (s: DiceState, q: { x: number; y: number }) =>
  s.towers.every((t) => Math.hypot(t.x - q.x, t.y - q.y) > 0.09) && s.L.ponds.every((p) => Math.hypot(p.x - q.x, p.y - q.y) > p.r + 0.03) && s.L.hills.every((p) => Math.hypot(p.x - q.x, p.y - q.y) > p.r) && s.L.rocks.every((p) => Math.hypot(p.x - q.x, p.y - q.y) > p.r + 0.05);
const needKey = new WeakMap<object, { key: string; need: boolean }>();
function needThrow(s: DiceState) {
  const key = `${s.stage}:${s.tries}:${s.bi}`;
  let m = needKey.get(s);
  if (!m || m.key !== key) needKey.set(s, (m = { key, need: forward(s).leaks > 0 }));
  return m.need;
}

/** 버릇 봇 ①(측정용): 막힐 때만, 성에서 가장 가까운 길섶 빈자리에 */
export const rolldiceHabit: Bot<DiceState> = {
  name: '버릇: 길 옆 가장 가까운 빈 곳',
  act(s) {
    if (!ready(s) || !needThrow(s)) return NO;
    const die = dieAt(s, s.bi)!;
    const spots = roadside(s.L).filter((q) => freeSpot(s, q)).sort((a, b) => b.d - a.d);
    const q = spots.find((q) => tryThrow(s, q.x, q.y, die, 0, 0, false).res !== 3) ?? { x: 0.3, y: 0.8 };
    return at(q.x, q.y);
  },
};
/** 버릇 봇 ②(독립 측정): 막힐 때만, 같은 눈 탑이 있으면 늘 그 탑으로(합체만 노림), 없으면 길 가운데쯤 길섶 */
export const rolldiceHabit2: Bot<DiceState> = {
  name: '버릇: 합체만 노림',
  act(s) {
    if (!ready(s) || !needThrow(s)) return NO;
    const die = dieAt(s, s.bi)!;
    const same = s.towers.filter((t) => t.p === die.p).sort((a, b) => Math.hypot(a.x - LX, a.y - LY) - Math.hypot(b.x - LX, b.y - LY))[0];
    if (same) return at(same.x, same.y);
    const spots = roadside(s.L).filter((q) => freeSpot(s, q));
    const mid = s.L.len / 2;
    spots.sort((a, b) => Math.abs(a.d - mid) - Math.abs(b.d - mid));
    const q = spots.find((q) => tryThrow(s, q.x, q.y, die, 0, 0, false).res !== 3) ?? { x: 0.5, y: 0.5 };
    return at(q.x, q.y);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 들판 아무 데나 던진다 (가끔 들판 밖에서 떼서 취소) */
export const rolldiceRandom: Bot<DiceState> = {
  name: '아무 데나 데굴',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 30 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    if (rng() < 0.1) (m.x = rng()), (m.y = rng() * A);
    else {
      const px = rng() * W, py = rng() * (LY - 0.08);
      (m.x = PX(px, py)), (m.y = PY(py));
    }
    m.hold = 2 + Math.floor(rng() * 4);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type F = (v: number) => number;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const PIPS: Record<number, number[][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
/** 눈 높이별 깃발·받침 색 */
const LV = ['#ffffff', '#f4f1e8', '#7ee0b5', '#6cc4ff', '#b48cff', '#ff9a3c', '#ff5c7a', '#ffd23a'];
/** 주사위 색: [윗면, 앞면, 옆면, 테두리, 눈] */
function dieCols(c: number, p: number) {
  if (p >= KING) return ['#fff2a8', '#ffcf3a', '#d99a10', '#a86d00', '#7a3d00'];
  if (c === FIREC) return ['#ffb08a', '#ff6f4a', '#d8462a', '#9c2a14', '#ffffff'];
  if (c === ICE) return ['#e6f8ff', '#a6dcf5', '#6fb6dc', '#3e86ad', '#1e4a78'];
  return ['#fffdf5', '#f3ead6', '#d9c9a8', '#a8916a', '#2a2f45'];
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/**
 * 3/4 시점 주사위 (x,y = 바닥 가운데). hs = 반 폭(px). mood: 0 평온 · 1 뱅글(굴러감) · 2 어질어질 · 3 놀람 · 4 우쭐
 * rot = 굴러가며 기우는 각, hop = 바닥에서 뜬 높이(px)
 */
function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number, hs: number, p: number, c: number, o: { mood?: number; rot?: number; hop?: number; alpha?: number; t: number; flag?: boolean; face?: boolean }) {
  const cols = dieCols(c, p), fh = hs * 1.35, td = hs * 1.05, hop = o.hop ?? 0, t = o.t;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  // 바닥 그림자
  ctx.fillStyle = 'rgba(20,50,20,.28)';
  ctx.beginPath();
  ctx.ellipse(x + hs * 0.15, y + hs * 0.05, hs * (1.25 - Math.min(0.4, hop / (hs * 6))), hs * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.translate(x, y - hop - fh / 2);
  if (o.rot) ctx.rotate(o.rot);
  ctx.translate(0, fh / 2);
  const rr = hs * 0.28;
  // 옆면(오른쪽 두께)
  ctx.fillStyle = cols[2];
  ctx.beginPath();
  ctx.moveTo(hs, -fh + rr * 0.4);
  ctx.lineTo(hs + hs * 0.22, -fh - td * 0.25);
  ctx.lineTo(hs + hs * 0.22, -td * 0.25 - rr * 0.2);
  ctx.lineTo(hs, 0);
  ctx.closePath();
  ctx.fill();
  // 앞면
  const fg = ctx.createLinearGradient(0, -fh, 0, 0);
  fg.addColorStop(0, cols[1]);
  fg.addColorStop(1, cols[2]);
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.roundRect(-hs, -fh, hs * 2, fh, [0, 0, rr, rr]);
  ctx.fill();
  // 윗면
  const tg = ctx.createLinearGradient(-hs, -fh - td, hs, -fh);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(0.35, cols[0]);
  tg.addColorStop(1, cols[1]);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-hs + rr * 0.5, -fh - td);
  ctx.lineTo(hs + hs * 0.22 - rr * 0.5, -fh - td);
  ctx.quadraticCurveTo(hs + hs * 0.22, -fh - td, hs + hs * 0.2, -fh - td + rr * 0.4);
  ctx.lineTo(hs, -fh);
  ctx.lineTo(-hs, -fh);
  ctx.lineTo(-hs, -fh - td + rr * 0.4);
  ctx.quadraticCurveTo(-hs, -fh - td, -hs + rr * 0.5, -fh - td);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = cols[3];
  ctx.lineWidth = Math.max(1, hs * 0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-hs, -fh, hs * 2, fh, [0, 0, rr, rr]);
  ctx.stroke();
  // 윗면 눈 (또는 왕관)
  const tcx = hs * 0.08, tcy = -fh - td / 2;
  if (p >= KING) {
    ctx.fillStyle = '#fff6c8';
    ctx.strokeStyle = '#a86d00';
    ctx.lineWidth = 1.2;
    const cw = hs * 0.7;
    ctx.beginPath();
    ctx.moveTo(tcx - cw, tcy + td * 0.3);
    ctx.lineTo(tcx - cw, tcy - td * 0.25);
    ctx.lineTo(tcx - cw * 0.5, tcy + td * 0.05);
    ctx.lineTo(tcx, tcy - td * 0.42);
    ctx.lineTo(tcx + cw * 0.5, tcy + td * 0.05);
    ctx.lineTo(tcx + cw, tcy - td * 0.25);
    ctx.lineTo(tcx + cw, tcy + td * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    const pr = hs * (p >= 5 ? 0.15 : 0.18);
    for (const [u, v] of PIPS[p] ?? []) {
      ctx.fillStyle = p === 1 && c === PLAIN ? '#e8383d' : cols[4];
      ctx.beginPath();
      ctx.ellipse(tcx + u * hs * 0.56, tcy + v * td * 0.3, pr, pr * 0.62, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 앞면 얼굴
  if (o.face !== false) {
    const mood = o.mood ?? 0, ey = -fh * 0.58, ex = hs * 0.36, er = hs * 0.15;
    ctx.fillStyle = '#2a2033';
    ctx.strokeStyle = '#2a2033';
    ctx.lineWidth = Math.max(1, hs * 0.08);
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const cx = sd * ex;
      if (mood === 1 || mood === 2) {
        ctx.beginPath();
        for (let k = 0; k < 12; k++) {
          const a = k * 0.7 + t * (mood === 1 ? 0.45 : 0.25) * sd, r2 = (k / 12) * er * 1.2;
          ctx.lineTo(cx + Math.cos(a) * r2, ey + Math.sin(a) * r2);
        }
        ctx.stroke();
      } else if (mood === 4) {
        ctx.beginPath();
        ctx.arc(cx, ey + er * 0.4, er * 0.9, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else if (mood === 3) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, ey, er * 1.25, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#2a2033';
        ctx.beginPath();
        ctx.arc(cx, ey, er * 0.5, 0, TAU);
        ctx.fill();
      } else {
        const blink = (t + Math.floor(x)) % 170 < 6;
        ctx.beginPath();
        if (blink) ctx.ellipse(cx, ey, er, er * 0.2, 0, 0, TAU);
        else ctx.ellipse(cx, ey, er * 0.8, er, 0, 0, TAU);
        ctx.fill();
        if (!blink) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx + er * 0.25, ey - er * 0.35, er * 0.3, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#2a2033';
        }
      }
    }
    // 볼
    ctx.fillStyle = 'rgba(255,120,130,.45)';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * hs * 0.62, -fh * 0.34, hs * 0.16, hs * 0.09, 0, 0, TAU);
      ctx.fill();
    }
    // 입
    ctx.strokeStyle = '#2a2033';
    ctx.fillStyle = '#7a2a3a';
    ctx.lineWidth = Math.max(1, hs * 0.07);
    ctx.beginPath();
    if (mood === 1 || mood === 3) ctx.ellipse(0, -fh * 0.3, hs * 0.13, hs * 0.16, 0, 0, TAU), ctx.fill();
    else if (mood === 2) {
      ctx.moveTo(-hs * 0.2, -fh * 0.28);
      for (let k = 1; k <= 4; k++) ctx.lineTo(-hs * 0.2 + k * hs * 0.1, -fh * 0.28 + (k % 2 ? -hs * 0.06 : 0));
      ctx.stroke();
    } else {
      ctx.arc(0, -fh * 0.36, hs * (mood === 4 ? 0.2 : 0.14), 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }
  // 탑 깃발
  if (o.flag) {
    const fx0 = hs * 0.85, fy0 = -fh - td * 0.75;
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = Math.max(1.2, hs * 0.08);
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    ctx.lineTo(fx0, fy0 - hs * 1.1);
    ctx.stroke();
    ctx.fillStyle = LV[Math.min(7, p)];
    const wav = Math.sin(t * 0.15 + x) * hs * 0.1;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 - hs * 1.1);
    ctx.lineTo(fx0 + hs * 0.7, fy0 - hs * 0.92 + wav);
    ctx.lineTo(fx0, fy0 - hs * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** 말썽 젤리 (x,y = 바닥). k: 0 젤리 · 1 토끼 젤리 · 2 박쥐 젤리 · 3 대장 */
function drawFoe(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, k: number, t: number, hit: boolean, scared: boolean, slow: boolean) {
  const cols = [['#b8f28a', '#59c23a', '#2f7a1c'], ['#ffc2dc', '#ff7fb0', '#c43d76'], ['#d9b8ff', '#a070f0', '#5b34a8'], ['#ff9c8a', '#ef4b3c', '#9a1f17']][k];
  const fly = k === FLY, bob = fly ? Math.sin(t * 0.12) * u * 0.25 : 0, sq = fly ? 0 : Math.abs(Math.sin(t * 0.18)) * 0.12;
  const zy = fly ? u * 1.6 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(20,50,20,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * (fly ? 0.7 : 1.05), u * 0.35, 0, 0, TAU);
  ctx.fill();
  ctx.translate(x, y - zy + bob);
  ctx.scale(1 + sq, 1 - sq);
  if (fly)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = cols[2];
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.6, -u * 0.7);
      ctx.quadraticCurveTo(sd * u * 1.7, -u * (1.5 + Math.sin(t * 0.5) * 0.5), sd * u * 1.8, -u * 0.4);
      ctx.quadraticCurveTo(sd * u * 1.3, -u * 0.6, sd * u * 0.7, -u * 0.25);
      ctx.fill();
    }
  if (k === RUN)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = cols[1];
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.35, -u * 1.55, u * 0.17, u * 0.45, sd * 0.25, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffe3ee';
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.35, -u * 1.5, u * 0.08, u * 0.3, sd * 0.25, 0, TAU);
      ctx.fill();
    }
  const g = ctx.createRadialGradient(-u * 0.35, -u * 0.95, u * 0.1, 0, -u * 0.55, u * 1.1);
  g.addColorStop(0, hit ? '#ffffff' : cols[0]);
  g.addColorStop(0.55, hit ? '#fff0f0' : cols[1]);
  g.addColorStop(1, cols[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-u, 0);
  ctx.bezierCurveTo(-u * 1.05, -u * 0.9, -u * 0.55, -u * 1.25, 0, -u * 1.25);
  ctx.bezierCurveTo(u * 0.55, -u * 1.25, u * 1.05, -u * 0.9, u, 0);
  ctx.quadraticCurveTo(0, u * 0.18, -u, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(-u * 0.45, -u * 0.85, u * 0.2, u * 0.12, -0.6, 0, TAU);
  ctx.fill();
  if (slow) {
    ctx.fillStyle = 'rgba(190,235,255,.45)';
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.5, u * 1.05, u * 0.75, 0, 0, TAU);
    ctx.fill();
  }
  // 눈 · 입
  const ey = -u * 0.62;
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.32, ey, u * 0.22, u * 0.26, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath();
    ctx.arc(sd * u * 0.32 + (scared ? 0 : u * 0.05), ey + u * 0.04, u * (scared ? 0.07 : 0.12), 0, TAU);
    ctx.fill();
    if (k === BOSS || (!scared && k !== FLY)) {
      ctx.strokeStyle = '#1a1a2a';
      ctx.lineWidth = Math.max(1.2, u * 0.08);
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.12, ey - u * 0.3);
      ctx.lineTo(sd * u * 0.5, ey - u * (k === BOSS ? 0.42 : 0.36));
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#5a1a2a';
  ctx.beginPath();
  if (scared) ctx.ellipse(0, -u * 0.25, u * 0.12, u * 0.14, 0, 0, TAU);
  else ctx.ellipse(0, -u * 0.28, u * 0.22, u * 0.08, 0, 0, Math.PI);
  ctx.fill();
  if (k === BOSS) {
    ctx.fillStyle = '#ffd23a';
    ctx.strokeStyle = '#a86d00';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-u * 0.5, -u * 1.15);
    ctx.lineTo(-u * 0.55, -u * 1.65);
    ctx.lineTo(-u * 0.25, -u * 1.38);
    ctx.lineTo(0, -u * 1.75);
    ctx.lineTo(u * 0.25, -u * 1.38);
    ctx.lineTo(u * 0.55, -u * 1.65);
    ctx.lineTo(u * 0.5, -u * 1.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 콧수염
    ctx.fillStyle = '#3a1a10';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.2, -u * 0.38, u * 0.2, u * 0.07, sd * 0.3, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  if (scared) {
    ctx.fillStyle = '#9fe3ff';
    ctx.beginPath();
    ctx.ellipse(x + u * 0.9, y - zy - u * 1.1 + (t % 24) * u * 0.02, u * 0.1, u * 0.16, 0, 0, TAU);
    ctx.fill();
  }
}

/** 구경꾼 동물 (성벽 위). k 0 토끼 · 1 병아리 · 2 고양이. mode 0 구경 · 1 만세 · 2 식은땀 · 3 털썩 */
function drawFan(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, k: number, mode: number, t: number) {
  const col = ['#f7f2ee', '#ffe066', '#ffb36b'][k], dark = ['#d9c9c0', '#e0b020', '#d9822b'][k];
  ctx.save();
  const jump = mode === 1 ? Math.abs(Math.sin(t * 0.3 + k)) * u * 0.6 : 0;
  ctx.translate(x, y - jump);
  if (mode === 3) ctx.rotate((k % 2 ? 1 : -1) * 0.9);
  if (k === 0)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.3, -u * 1.45, u * 0.18, u * 0.5, sd * 0.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffc6d6';
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.3, -u * 1.42, u * 0.08, u * 0.32, sd * 0.15, 0, TAU);
      ctx.fill();
    }
  if (k === 2)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.65, -u * 0.95);
      ctx.lineTo(sd * u * 0.5, -u * 1.5);
      ctx.lineTo(sd * u * 0.15, -u * 1.1);
      ctx.fill();
    }
  // 팔 (만세)
  if (mode === 1)
    for (const sd of [-1, 1]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = u * 0.28;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.55, -u * 0.5);
      ctx.lineTo(sd * u * 0.95, -u * 1.25);
      ctx.stroke();
    }
  const g = ctx.createRadialGradient(-u * 0.25, -u * 0.9, u * 0.1, 0, -u * 0.6, u);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, col);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -u * 0.6, u * 0.68, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a2033';
  ctx.strokeStyle = '#2a2033';
  ctx.lineWidth = Math.max(1, u * 0.1);
  for (const sd of [-1, 1]) {
    if (mode === 1) {
      ctx.beginPath();
      ctx.arc(sd * u * 0.25, -u * 0.62, u * 0.12, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mode === 3) {
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.25 - u * 0.1, -u * 0.72);
      ctx.lineTo(sd * u * 0.25 + u * 0.1, -u * 0.52);
      ctx.moveTo(sd * u * 0.25 + u * 0.1, -u * 0.72);
      ctx.lineTo(sd * u * 0.25 - u * 0.1, -u * 0.52);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(sd * u * 0.25, -u * 0.62, u * (mode === 2 ? 0.12 : 0.08), 0, TAU);
      ctx.fill();
    }
  }
  if (k === 1) {
    ctx.fillStyle = '#ff9a2a';
    ctx.beginPath();
    ctx.moveTo(-u * 0.14, -u * 0.45);
    ctx.lineTo(u * 0.14, -u * 0.45);
    ctx.lineTo(0, -u * (mode === 1 || mode === 2 ? 0.2 : 0.3));
    ctx.fill();
  } else {
    ctx.fillStyle = '#7a2a3a';
    ctx.beginPath();
    if (mode === 1 || mode === 2) ctx.ellipse(0, -u * 0.35, u * 0.12, u * 0.12, 0, 0, TAU);
    else ctx.ellipse(0, -u * 0.4, u * 0.1, u * 0.05, 0, 0, Math.PI);
    ctx.fill();
  }
  ctx.restore();
  if (mode === 2) {
    ctx.fillStyle = '#9fe3ff';
    ctx.beginPath();
    ctx.ellipse(x + u * 0.6, y - u * 1.1 + (t % 20) * u * 0.03, u * 0.1, u * 0.16, 0, 0, TAU);
    ctx.fill();
  }
}

/** 던지는 곰 (성문 위). wind 0~1 = 뒤로 젖힘, toss = 던진 직후 */
function drawBear(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, wind: number, toss: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-wind * 0.18 + toss * 0.22);
  const body = ctx.createRadialGradient(-u * 0.3, -u * 1.0, u * 0.1, 0, -u * 0.7, u * 1.2);
  body.addColorStop(0, '#d9a066');
  body.addColorStop(1, '#8a5a2e');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.55, u * 0.75, u * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f1d3a8';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.45, u * 0.42, u * 0.38, 0, 0, TAU);
  ctx.fill();
  // 머리
  const hy = -u * 1.45;
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#8a5a2e';
    ctx.beginPath();
    ctx.arc(sd * u * 0.5, hy - u * 0.42, u * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f1d3a8';
    ctx.beginPath();
    ctx.arc(sd * u * 0.5, hy - u * 0.42, u * 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, hy, u * 0.58, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f1d3a8';
  ctx.beginPath();
  ctx.ellipse(0, hy + u * 0.18, u * 0.27, u * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.ellipse(0, hy + u * 0.1, u * 0.09, u * 0.06, 0, 0, TAU);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (wind > 0.3) ctx.ellipse(sd * u * 0.22, hy - u * 0.08, u * 0.07, u * 0.03, 0, 0, TAU);
    else ctx.arc(sd * u * 0.22, hy - u * 0.08, u * 0.065, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,130,.5)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.36, hy + u * 0.12, u * 0.1, u * 0.06, 0, 0, TAU);
    ctx.fill();
  }
  // 팔: 머리 위로 주사위를 든다
  ctx.strokeStyle = '#8a5a2e';
  ctx.lineWidth = u * 0.26;
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.55, -u * 0.85);
    ctx.lineTo(sd * u * 0.42 - wind * u * 0.2, -u * 2.05 + toss * u * 0.6);
    ctx.stroke();
  }
  ctx.restore();
  void t;
}

function drawAll(ctx: CanvasRenderingContext2D, s: DiceState, w: number, h: number, th: Theme) {
  const fx = juice(s), X: F = (x) => x * w, Y: F = (y) => y * w, R: F = (r) => r * w, t = s.t;
  const L = s.L, d = STAGES[s.stage];
  const SX = (x: number, y: number) => X(PX(x, y)), SY = (y: number) => Y(PY(y));
  const dep = (y: number) => scl(y);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  /** 평면 원 → 화면 (원근 때문에 살짝 찌그러짐) */
  const pcircle = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let k = 0; k <= 36; k++) {
      const a = (k / 36) * TAU, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (k) ctx.lineTo(SX(px, py), SY(py));
      else ctx.moveTo(SX(px, py), SY(py));
    }
    ctx.closePath();
  };
  const dieHS = (p: number, y: number) => R((0.039 + 0.0035 * (Math.min(p, 7) - 1)) * dep(y));

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 먼 언덕 ──
  {
    const g = ctx.createLinearGradient(0, 0, 0, Y(FY0 + 0.05));
    g.addColorStop(0, '#8fd3ff');
    g.addColorStop(1, '#d8f3ff');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, Y(FY0 + 0.1));
    for (let k = 0; k < 4; k++) {
      const cx = ((hsh(k) * 1.4 + t * 0.00012 * (1 + k)) % 1.4) - 0.2;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let q = 0; q < 3; q++) {
        ctx.beginPath();
        ctx.ellipse(X(cx + q * 0.045), Y(0.1 + hsh(k + 5) * 0.03 - (q === 1 ? 0.01 : 0)), R(0.04), R(0.02), 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#7cc47a';
    ctx.beginPath();
    ctx.moveTo(-10, Y(FY0 + 0.02));
    for (let x = 0; x <= 1.02; x += 0.05) ctx.lineTo(X(x), Y(FY0 - 0.03 - 0.025 * Math.sin(x * 7 + 1) - 0.015 * Math.sin(x * 17)));
    ctx.lineTo(w + 10, Y(FY0 + 0.02));
    ctx.closePath();
    ctx.fill();
  }
  // ── 들판 판 (바깥 풀밭 위에 한 단 높은 판) ──
  const c0 = [SX(0, 0), SY(0)], c1 = [SX(W, 0), SY(0)], c2 = [SX(W, H), SY(H)], c3 = [SX(0, H), SY(H)];
  {
    const og = ctx.createLinearGradient(0, Y(FY0 - 0.03), 0, Y(BAND));
    og.addColorStop(0, '#5fa84c');
    og.addColorStop(1, '#3b7a30');
    ctx.fillStyle = og;
    ctx.fillRect(-10, Y(FY0 - 0.03), w + 20, Y(BAND - FY0 + 0.05));
    // 바깥 가장자리 나무 (뒤쪽 모서리 · 양옆)
    const tree = (x: number, y: number, u: number, k: number) => {
      ctx.fillStyle = 'rgba(20,50,20,.3)';
      ctx.beginPath();
      ctx.ellipse(x + u * 0.2, y, u * 0.9, u * 0.3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#8a5a2e';
      ctx.fillRect(x - u * 0.12, y - u * 0.9, u * 0.24, u * 0.9);
      const tg = ctx.createRadialGradient(x - u * 0.3, y - u * 1.8, u * 0.1, x, y - u * 1.4, u);
      tg.addColorStop(0, ['#b8ec7a', '#ffd0e0', '#c8f08a'][k % 3]);
      tg.addColorStop(1, ['#3f8f34', '#e07aa0', '#4a9a3a'][k % 3]);
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(x, y - u * 1.4, u * 0.85, 0, TAU);
      ctx.fill();
    };
    for (let k = 0; k < 7; k++) {
      const yy = 0.06 + k * 0.19, sx0 = SX(0, yy) - R(0.012), sx1 = SX(W, yy) + R(0.012), u = R(0.02 * dep(yy));
      if (sx0 > u * 1.4) tree(sx0 / 2 + (k % 2 ? -1 : 1) * R(0.005), SY(yy), u, k);
      if (w - sx1 > u * 1.4) tree((w + sx1) / 2, SY(yy + 0.08), u, k + 1);
    }
    // 판 두께(옆·앞 흙) · 그림자
    ctx.fillStyle = 'rgba(20,40,10,.35)';
    ctx.beginPath();
    ctx.moveTo(c0[0] - 3, c0[1] + 4);
    ctx.lineTo(c1[0] + 3, c1[1] + 4);
    ctx.lineTo(c2[0] + 8, c2[1] + R(0.05));
    ctx.lineTo(c3[0] - 8, c3[1] + R(0.05));
    ctx.closePath();
    ctx.fill();
    const sg = ctx.createLinearGradient(0, c3[1], 0, c3[1] + R(0.04));
    sg.addColorStop(0, '#a8763f');
    sg.addColorStop(1, '#6a4422');
    ctx.fillStyle = sg;
    ctx.fillRect(c3[0], c3[1], c2[0] - c3[0], R(0.04));
    ctx.fillStyle = 'rgba(255,230,180,.25)';
    for (let k = 0; k < 9; k++) ctx.fillRect(c3[0] + ((c2[0] - c3[0]) * (k + 0.3)) / 9, c3[1] + R(0.012 + (k % 3) * 0.008), R(0.03), R(0.004));
    const gg = ctx.createLinearGradient(0, c0[1], 0, c3[1]);
    gg.addColorStop(0, '#8fd36a');
    gg.addColorStop(1, '#5fb548');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(c0[0], c0[1]);
    ctx.lineTo(c1[0], c1[1]);
    ctx.lineTo(c2[0], c2[1]);
    ctx.lineTo(c3[0], c3[1]);
    ctx.closePath();
    ctx.fill();
    // 잔디 결 · 꽃
    for (let k = 0; k < 70; k++) {
      const px = hsh(k * 3 + 1), py = hsh(k * 7 + 2) * H;
      if (roadNear(L, px, py).d < ROADW * 0.7) continue;
      const sx = SX(px, py), sy = SY(py), u = R(0.012 * dep(py));
      ctx.strokeStyle = k % 3 ? 'rgba(40,110,40,.45)' : 'rgba(200,255,170,.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - u, sy);
      ctx.lineTo(sx - u * 0.6, sy - u * 1.4);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + u * 0.1, sy - u * 1.8);
      ctx.moveTo(sx + u, sy);
      ctx.lineTo(sx + u * 0.6, sy - u * 1.3);
      ctx.stroke();
      if (k % 9 === 0) {
        ctx.fillStyle = ['#ffffff', '#ffe066', '#ff9ec4'][k % 3];
        for (let q = 0; q < 5; q++) {
          ctx.beginPath();
          ctx.arc(sx + Math.cos((q / 5) * TAU) * u * 0.5, sy - u * 2 + Math.sin((q / 5) * TAU) * u * 0.4, u * 0.35, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ffb02a';
        ctx.beginPath();
        ctx.arc(sx, sy - u * 2, u * 0.3, 0, TAU);
        ctx.fill();
      }
    }
  }
  // ── 길 ──
  {
    const pts = L.path.map(([x, y]) => [SX(x, Math.max(0, y)), SY(Math.max(-0.02, y))]);
    const stroke = (wd: number, col: string, dash?: number[]) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = wd;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(dash ?? []);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.setLineDash([]);
    };
    stroke(R(ROADW * 1.3), 'rgba(60,40,20,.35)');
    stroke(R(ROADW * 1.12), '#b98a52');
    stroke(R(ROADW * 0.95), '#e9c48a');
    stroke(R(ROADW * 0.35), 'rgba(255,240,200,.35)');
    stroke(R(0.006), 'rgba(150,100,50,.35)', [R(0.012), R(0.03)]);
    // 젤리 발자국 방향 화살
    const o = { x: 0, y: 0 }, o2 = { x: 0, y: 0 };
    ctx.fillStyle = 'rgba(150,95,45,.45)';
    for (let dd = 0.25 + ((t * 0.002) % 0.3); dd < L.len - 0.15; dd += 0.3) {
      pathAt(L, dd, o);
      pathAt(L, dd + 0.02, o2);
      const ax = SX(o2.x, o2.y) - SX(o.x, o.y), ay = SY(o2.y) - SY(o.y), a = Math.atan2(ay, ax), cx = SX(o.x, o.y), cy = SY(o.y), u = R(0.014);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * u, cy + Math.sin(a) * u);
      ctx.lineTo(cx + Math.cos(a + 2.4) * u, cy + Math.sin(a + 2.4) * u);
      ctx.lineTo(cx + Math.cos(a - 2.4) * u, cy + Math.sin(a - 2.4) * u);
      ctx.fill();
    }
  }
  // 대장 판: 길 반쯤 깃발 (셋째 별 기준)
  if (d.third === 'boss') {
    const o = { x: 0, y: 0 };
    pathAt(L, L.len / 2, o);
    const fx0 = SX(o.x, o.y), fy0 = SY(o.y);
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    ctx.lineTo(fx0, fy0 - R(0.07));
    ctx.stroke();
    ctx.fillStyle = s.bossAt <= 0.5 ? '#ffd84a' : '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 - R(0.07));
    ctx.lineTo(fx0 + R(0.05), fy0 - R(0.055) + Math.sin(t * 0.1) * R(0.004));
    ctx.lineTo(fx0, fy0 - R(0.04));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('반', fx0 + R(0.018), fy0 - R(0.055));
  }
  // ── 동굴 (길 시작) ──
  {
    const cx = SX(L.path[0][0], 0), cy = SY(0) + R(0.01), u = R(0.07);
    ctx.fillStyle = '#7d7468';
    ctx.beginPath();
    ctx.ellipse(cx, cy, u * 1.35, u * 0.95, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#9a9184';
    ctx.beginPath();
    ctx.ellipse(cx - u * 0.3, cy - u * 0.55, u * 0.6, u * 0.35, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1e1622';
    ctx.beginPath();
    ctx.ellipse(cx, cy, u * 0.62, u * 0.62, 0, Math.PI, TAU);
    ctx.fill();
    const blink = t % 140 < 8;
    ctx.fillStyle = '#ffe066';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sd * u * 0.18, cy - u * 0.3, u * 0.07, blink ? u * 0.01 : u * 0.07, 0, 0, TAU);
      ctx.fill();
    }
  }
  // ── 연못 ──
  for (const p of L.ponds) {
    ctx.fillStyle = 'rgba(40,90,60,.35)';
    pcircle(p.x, p.y + 0.008, p.r * 1.12);
    ctx.fill();
    const g = ctx.createLinearGradient(0, SY(p.y - p.r), 0, SY(p.y + p.r));
    g.addColorStop(0, '#5ec3e8');
    g.addColorStop(1, '#2a8fc4');
    ctx.fillStyle = g;
    pcircle(p.x, p.y, p.r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      const rr = p.r * (0.3 + ((t * 0.004 + k * 0.5) % 1) * 0.6);
      ctx.globalAlpha = 1 - ((t * 0.004 + k * 0.5) % 1);
      pcircle(p.x, p.y, rr);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#6cc24a';
    const lx = SX(p.x + p.r * 0.45, p.y - p.r * 0.2), ly = SY(p.y - p.r * 0.2);
    ctx.beginPath();
    ctx.ellipse(lx, ly, R(0.02), R(0.011), 0, 0.3, TAU - 0.3);
    ctx.lineTo(lx, ly);
    ctx.fill();
    ctx.strokeStyle = '#e0f7ff';
    ctx.lineWidth = 2;
    pcircle(p.x, p.y, p.r);
    ctx.stroke();
  }
  // ── 언덕 ──
  for (const hl of L.hills) {
    const cx = SX(hl.x, hl.y), cy = SY(hl.y);
    const g = ctx.createRadialGradient(cx - R(hl.r * 0.3), cy - R(hl.r * 0.5), R(0.01), cx, cy, R(hl.r * 1.05));
    g.addColorStop(0, '#d6f5a0');
    g.addColorStop(0.6, '#8fd060');
    g.addColorStop(1, '#4f9a3a');
    ctx.fillStyle = 'rgba(30,70,20,.3)';
    pcircle(hl.x + 0.01, hl.y + 0.012, hl.r);
    ctx.fill();
    ctx.fillStyle = g;
    pcircle(hl.x, hl.y, hl.r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.2;
    for (const f of [0.35, 0.68]) {
      pcircle(hl.x, hl.y - 0.004, hl.r * f);
      ctx.stroke();
    }
    // 내리막 화살
    ctx.fillStyle = 'rgba(40,90,30,.55)';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + 0.2, rr = hl.r * (0.72 + 0.12 * (((t * 0.01 + k * 0.13) % 1)));
      const px = hl.x + Math.cos(a) * rr, py = hl.y + Math.sin(a) * rr, sx = SX(px, py), sy = SY(py), u = R(0.012);
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * u, sy + Math.sin(a) * u * 0.8);
      ctx.lineTo(sx + Math.cos(a + 2.4) * u, sy + Math.sin(a + 2.4) * u * 0.8);
      ctx.lineTo(sx + Math.cos(a - 2.4) * u, sy + Math.sin(a - 2.4) * u * 0.8);
      ctx.fill();
    }
    ctx.fillStyle = '#ff7aa8';
    ctx.beginPath();
    ctx.arc(cx, cy - R(0.006), R(0.007), 0, TAU);
    ctx.fill();
  }
  // ── 겨누는 중: 고스트 · 굴러갈 길 미리 보기 ──
  let pv: { pts: number[]; o: Outcome; bon: number[]; die: Die; q: { x: number; y: number }; D: number; ang: number } | null = null;
  const die0 = dieAt(s, s.bi);
  if (s.down && s.aim && s.phase === 'play' && die0) {
    const q0 = toPlane(s.aim.x, s.aim.y);
    if (inField(q0)) {
      const q = clampT(q0);
      const key = `${s.t >> 2}:${q.x.toFixed(3)}:${q.y.toFixed(3)}:${s.bi}:${s.towers.length}`;
      const c = PREV.get(s);
      if (c && c.key === key) pv = c.pv;
      else {
        const S = cloneSim(s), r = mkRoll(q.x, q.y, die0.p, die0.c, 0, 0), pts = [r.x, r.y], bon: number[] = [];
        let res = 0, lb = 0;
        for (let k = 0; k < MAXROLL && !res; k++) {
          res = rollStep(S, r, null);
          if (k % 3 === 0) pts.push(r.x, r.y);
          if (r.bounces > lb) (lb = r.bounces), bon.push(r.x, r.y);
        }
        pts.push(r.x, r.y);
        pv = { pts, o: { x: r.x, y: r.y, merges: r.merges, res, S, hill: r.hill }, bon, die: die0, q, D: Math.hypot(q.x - LX, q.y - LY), ang: Math.atan2(q.y - LY, q.x - LX) };
        PREV.set(s, { key, pv });
      }
    }
  }
  // 탑 받침 (옆 = 받침이 닿는 거리)
  for (const tw of s.towers) {
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    pcircle(tw.x, tw.y, NEAR / 2);
    ctx.fill();
    ctx.strokeStyle = LV[Math.min(7, tw.p)];
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([R(0.008), R(0.006)]);
    pcircle(tw.x, tw.y, NEAR / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  if (pv && pv.o.res === 1) {
    const p = pv.die.p;
    ctx.fillStyle = 'rgba(255,240,150,.12)';
    pcircle(pv.o.x, pv.o.y, RANGE(p));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,150,.75)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([R(0.012), R(0.01)]);
    pcircle(pv.o.x, pv.o.y, RANGE(p));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 이웃 끈 (받침이 닿는 탑끼리 깃발 끈)
  for (let i = 0; i < s.towers.length; i++)
    for (let j = i + 1; j < s.towers.length; j++) {
      const a = s.towers[i], b = s.towers[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > NEAR) continue;
      const ax = SX(a.x, a.y), ay = SY(a.y) - dieHS(a.p, a.y) * 2.6, bx = SX(b.x, b.y), by = SY(b.y) - dieHS(b.p, b.y) * 2.6;
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + R(0.02), bx, by);
      ctx.stroke();
      for (let k = 1; k < 4; k++) {
        const u = k / 4, px = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * ((ax + bx) / 2) + u * u * bx, py = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * ((ay + by) / 2 + R(0.02)) + u * u * by;
        ctx.fillStyle = ['#ff6b6b', '#ffd84a', '#6cc4ff'][k - 1];
        ctx.beginPath();
        ctx.moveTo(px - R(0.006), py);
        ctx.lineTo(px + R(0.006), py);
        ctx.lineTo(px, py + R(0.011));
        ctx.fill();
      }
    }

  // ── 서 있는 것들 (뒤에서 앞으로) ──
  const items: { y: number; f: () => void }[] = [];
  for (const k of L.rocks)
    items.push({
      y: k.y,
      f: () => {
        const cx = SX(k.x, k.y), cy = SY(k.y), u = R(k.r * dep(k.y));
        ctx.fillStyle = 'rgba(20,50,20,.3)';
        ctx.beginPath();
        ctx.ellipse(cx + u * 0.15, cy + u * 0.1, u * 1.15, u * 0.45, 0, 0, TAU);
        ctx.fill();
        const g = ctx.createRadialGradient(cx - u * 0.4, cy - u * 1.0, u * 0.1, cx, cy - u * 0.5, u * 1.3);
        g.addColorStop(0, '#e2ddd4');
        g.addColorStop(0.6, '#a39b8f');
        g.addColorStop(1, '#6d665c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - u * 1.05, cy);
        ctx.quadraticCurveTo(cx - u * 1.1, cy - u * 1.0, cx - u * 0.2, cy - u * 1.25);
        ctx.quadraticCurveTo(cx + u * 0.9, cy - u * 1.2, cx + u * 1.05, cy - u * 0.2);
        ctx.quadraticCurveTo(cx + u, cy + u * 0.2, cx - u * 1.05, cy);
        ctx.fill();
        ctx.fillStyle = 'rgba(110,170,80,.75)';
        ctx.beginPath();
        ctx.ellipse(cx - u * 0.2, cy - u * 1.12, u * 0.45, u * 0.16, -0.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#4a4440';
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + sd * u * 0.28, cy - u * 0.6, u * 0.07, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = '#4a4440';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - u * 0.45, u * 0.14, 0.3, Math.PI - 0.3);
        ctx.stroke();
      },
    });
  s.towers.forEach((tw) => {
    items.push({
      y: tw.y,
      f: () => {
        let vp = tw.p, gr = tw.grow;
        for (const e of s.events) if (e.id === tw.id && e.t > t && (e.kind === 'chain' || e.kind === 'king')) vp--;
        for (const e of s.events) if (e.id === tw.id && e.t <= t && t - e.t < 20 && (e.kind === 'chain' || e.kind === 'king')) gr = Math.max(gr, 1 - (t - e.t) / 20);
        const hs = dieHS(vp, tw.y) * (1 + gr * 0.45), age = t - tw.fireT, kick = age >= 0 && age < 8 ? Math.sin((age / 8) * Math.PI) * hs * 0.25 : 0;
        const mood = tw.moodT > 0 ? tw.mood : s.foes.some((f) => (f.x - tw.x) ** 2 + (f.y - tw.y) ** 2 < RANGE(tw.p) ** 2) ? 4 : 0;
        if (tw.p >= KING) {
          const gl = ctx.createRadialGradient(SX(tw.x, tw.y), SY(tw.y) - hs, 0, SX(tw.x, tw.y), SY(tw.y) - hs, hs * 3);
          gl.addColorStop(0, 'rgba(255,230,120,.55)');
          gl.addColorStop(1, 'rgba(255,230,120,0)');
          ctx.fillStyle = gl;
          ctx.beginPath();
          ctx.arc(SX(tw.x, tw.y), SY(tw.y) - hs, hs * 3, 0, TAU);
          ctx.fill();
        }
        drawDie(ctx, SX(tw.x, tw.y), SY(tw.y), hs, vp, tw.c, { mood, hop: kick, t: t + tw.id * 13, flag: true });
      },
    });
  });
  for (const f of s.foes)
    items.push({
      y: f.y,
      f: () => {
        const u = R((f.k === BOSS ? 0.07 : f.k === RUN ? 0.034 : f.k === FLY ? 0.036 : 0.04) * dep(f.y));
        const pr = prog(L, f);
        drawFoe(ctx, SX(f.x, f.y), SY(f.y), u, f.k, t + f.id * 7, t - f.hitT < 5, pr > 0.82, f.slow > 0 || s.slowT > 0);
        if (f.hp < f.max) {
          const bw = u * 1.6, bx = SX(f.x, f.y) - bw / 2, by = SY(f.y) - u * (f.k === FLY ? 3.2 : f.k === BOSS ? 2.1 : 1.75) - (f.k === RUN ? u * 0.5 : 0);
          ctx.fillStyle = 'rgba(0,0,0,.45)';
          ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
          ctx.fillStyle = f.hp / f.max > 0.5 ? '#7ee05a' : f.hp / f.max > 0.25 ? '#ffd23a' : '#ff5a5a';
          ctx.fillRect(bx, by, (bw * Math.max(0, f.hp)) / f.max, 3);
        }
      },
    });
  // 데굴데굴 쓰러진 젤리
  for (const c of s.corpses) {
    const age = t - c.t;
    if (age > 40) continue;
    items.push({
      y: c.y,
      f: () => {
        const u = R((c.k === BOSS ? 0.07 : 0.038) * dep(c.y)), x = SX(c.x, c.y) + c.dir * age * R(0.0022), y = SY(c.y) - Math.abs(Math.sin(age * 0.25)) * u * 0.8;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age / 40);
        ctx.translate(x, y - u * 0.6);
        ctx.rotate(c.dir * age * 0.3);
        ctx.translate(-x, -(y - u * 0.6));
        drawFoe(ctx, x, y, u, c.k === FLY ? SLIME : c.k, t, true, true, false);
        ctx.restore();
        if (age < 30) {
          ctx.fillStyle = '#fff27a';
          for (let k = 0; k < 3; k++) {
            const a = t * 0.2 + (k * TAU) / 3;
            star(ctx, x + Math.cos(a) * u * 0.9, y - u * 1.5 + Math.sin(a) * u * 0.3, u * 0.22);
            ctx.fill();
          }
        }
      },
    });
  }
  // 굴러가는 주사위
  if (s.roll) {
    const r = s.roll;
    items.push({
      y: r.y,
      f: () => {
        const sp = Math.hypot(r.vx, r.vy), hs = dieHS(r.p, r.y), hop = Math.abs(Math.sin(r.spin * 40)) * hs * Math.min(1.2, sp * 120) + (r.age < 14 ? (14 - r.age) * hs * 0.12 : 0);
        drawDie(ctx, SX(r.x, r.y), SY(r.y), hs, r.p, r.c, { mood: r.mood, rot: Math.sin(r.spin * 22) * Math.min(0.5, sp * 50), hop, t });
        // 흙먼지
        if (sp > 0.004 && t % 3 === 0) fx.burst(SX(r.x, r.y), SY(r.y), 'rgba(230,200,150,.8)', 2, 0.8, 1.6);
      },
    });
  }
  // 합체 미끄러짐: 연쇄 짝 탑은 차례가 오면 쪼르르 빨려 들고, 옆에 멈춘 주사위도 쪼르르
  for (const e of s.events) {
    if ((e.kind !== 'chain' && e.kind !== 'king' && e.kind !== 'merge') || e.x2 === undefined) continue;
    const age = t - e.t, isMerge = e.kind === 'merge' || (e.kind === 'king' && e.n === 1);
    let u: number;
    if (isMerge) {
      if (age > 10 || Math.hypot(e.x - e.x2, e.y - e.y2!) < 0.075) continue;
      u = age / 10;
    } else {
      if (age > 0) continue;
      u = age < -12 ? 0 : (age + 12) / 12;
    }
    const x = e.x2 + (e.x - e.x2) * u, y = e.y2! + (e.y - e.y2!) * u, p = Math.min(6, e.c! - 1);
    items.push({ y, f: () => drawDie(ctx, SX(x, y), SY(y) - Math.sin(u * Math.PI) * R(0.03), dieHS(p, y), p, e.uc ?? PLAIN, { mood: u > 0 ? 1 : 3, t, alpha: isMerge ? 1 - u * 0.6 : 1, flag: !isMerge && u === 0 }) });
  }
  // 고스트 (멈출 자리)
  if (pv && pv.o.res === 1) {
    const o = pv.o;
    items.push({ y: o.y, f: () => drawDie(ctx, SX(o.x, o.y), SY(o.y), dieHS(pv!.die.p, o.y), pv!.die.p, pv!.die.c, { alpha: 0.5 + 0.15 * Math.sin(t * 0.2), t, mood: 0 }) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  // ── 쏜 눈알 ──
  for (const q of s.shots) {
    const age = t - q.t;
    if (age < 0 || age > 9) continue;
    const u = age / 9, x0 = SX(q.x0, q.y0), y0 = SY(q.y0) - dieHS(q.p, q.y0) * 2.4, x1 = SX(q.x1, q.y1), y1 = SY(q.y1) - R(0.03);
    const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * R(0.05);
    const col = q.c === FIREC ? '#ff8a3a' : q.c === ICE ? '#bff0ff' : q.c === 3 ? '#ffe066' : '#ffffff';
    const u0 = Math.max(0, u - 0.18), xb = x0 + (x1 - x0) * u0, yb = y0 + (y1 - y0) * u0 - Math.sin(u0 * Math.PI) * R(0.05), br = R(0.009 + 0.0014 * Math.min(6, q.p));
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = br * 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(xb, yb);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x, y, br, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = q.c === PLAIN ? '#2a2f45' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, br * 0.35, 0, TAU);
    ctx.fill();
    if (q.c === FIREC) {
      ctx.fillStyle = 'rgba(255,200,80,.6)';
      ctx.beginPath();
      ctx.arc(x - (x1 - x0) * 0.05, y - (y1 - y0) * 0.05, R(0.006), 0, TAU);
      ctx.fill();
    }
    if (age === 9) fx.burst(x1, y1, col, 4, 1.4, 1.6);
  }

  // ── 성 (앞쪽 가운데) ──
  const gateX = SX(L.gx, H), castleY = SY(H) + R(0.034);
  {
    const cx = gateX, by = castleY, cw = R(0.52), wallH = R(0.115);
    // 성벽
    const wg = ctx.createLinearGradient(0, by - wallH, 0, by);
    wg.addColorStop(0, '#ffd8e6');
    wg.addColorStop(1, '#e9a8c0');
    ctx.fillStyle = 'rgba(40,20,20,.3)';
    ctx.fillRect(cx - cw / 2 - 4, by - 2, cw + 8, R(0.02));
    ctx.fillStyle = wg;
    ctx.fillRect(cx - cw / 2, by - wallH, cw, wallH);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let k = 0; k < 7; k++) ctx.fillRect(cx - cw / 2 + k * (cw / 7) + 2, by - wallH + R(0.03), cw / 7 - 4, 1.5);
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = k % 2 ? '#ffc3d8' : '#ffe4ee';
      ctx.fillRect(cx - cw / 2 + k * (cw / 9), by - wallH - R(0.018), cw / 9 - 2, R(0.02));
    }
    // 문
    ctx.fillStyle = '#6a3a2a';
    ctx.beginPath();
    ctx.moveTo(cx - R(0.05), by);
    ctx.lineTo(cx - R(0.05), by - R(0.05));
    ctx.arc(cx, by - R(0.05), R(0.05), Math.PI, TAU);
    ctx.lineTo(cx + R(0.05), by);
    ctx.fill();
    ctx.strokeStyle = '#3a2018';
    ctx.lineWidth = 1;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * R(0.022), by - R(0.088));
      ctx.lineTo(cx + k * R(0.018), by);
      ctx.stroke();
    }
    // 양쪽 탑
    for (const sd of [-1, 1]) {
      const tx = cx + sd * (cw / 2 - R(0.035)), tw2 = R(0.085), th2 = R(0.16);
      const tg = ctx.createLinearGradient(tx - tw2 / 2, 0, tx + tw2 / 2, 0);
      tg.addColorStop(0, '#c7e6ff');
      tg.addColorStop(0.5, '#ffffff');
      tg.addColorStop(1, '#9cc8ec');
      ctx.fillStyle = tg;
      ctx.fillRect(tx - tw2 / 2, by - th2, tw2, th2);
      ctx.fillStyle = sd < 0 ? '#ff7a8a' : '#6cb8ff';
      ctx.beginPath();
      ctx.moveTo(tx - tw2 * 0.62, by - th2);
      ctx.lineTo(tx, by - th2 - R(0.06));
      ctx.lineTo(tx + tw2 * 0.62, by - th2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, by - th2 - R(0.06));
      ctx.lineTo(tx, by - th2 - R(0.09));
      ctx.stroke();
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.moveTo(tx, by - th2 - R(0.09));
      ctx.lineTo(tx + R(0.03) * (1 + 0.15 * Math.sin(t * 0.12 + sd)), by - th2 - R(0.078));
      ctx.lineTo(tx, by - th2 - R(0.066));
      ctx.fill();
      ctx.fillStyle = '#5a3a5a';
      ctx.beginPath();
      ctx.roundRect(tx - R(0.01), by - th2 + R(0.04), R(0.02), R(0.03), [R(0.01), R(0.01), 0, 0]);
      ctx.fill();
    }
    // 구경꾼: 위험할수록 식은땀, 합체에 만세, 성문 쿵에 털썩
    const danger = s.foes.some((f) => prog(L, f) > 0.82), cheer = t - s.cheerT < 70, fell = s.phase === 'result' && !s.ok;
    const mode = fell ? 3 : cheer ? 1 : danger ? 2 : 0;
    const fans = [[-0.155, 0], [-0.085, 1], [0.085, 2], [0.155, 1]];
    fans.forEach(([ox, k], i) => drawFan(ctx, cx + R(ox), by - wallH - R(0.012), R(0.028), k, s.phase === 'result' && s.ok ? 1 : mode, t + i * 9));
    // 던지는 곰 (성문 위)
    const wind = s.down && die0 ? Math.min(1, (s.pt % 1000) / 1) : 0, toss = Math.max(0, 1 - (t - s.lastThrow) / 14);
    const bx = cx, byy = by - wallH - R(0.01);
    drawBear(ctx, bx, byy, R(0.036), wind, toss, t);
    if (die0 && !s.roll && s.phase === 'play') drawDie(ctx, bx - wind * R(0.014), byy - R(0.076) + toss * R(0.02), R(0.03), die0.p, die0.c, { t, mood: 0 });
  }

  // ── 미리 보기: 굴러갈 길 · 멈출 범위 · 결과 ──
  if (pv) {
    const P = pv.pts, o = pv.o;
    if (s.roll) ctx.globalAlpha = 0.4; // 굴러가는 중엔 흐리게 (떼도 안 던져짐)
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.beginPath();
    for (let k = 0; k < P.length; k += 2) {
      const sx = SX(P[k], P[k + 1]), sy = SY(P[k + 1]);
      if (k) ctx.lineTo(sx, sy);
      else ctx.moveTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 0; k < pv.bon.length; k += 2) {
      const bx = SX(pv.bon[k], pv.bon[k + 1]), by = SY(pv.bon[k + 1]);
      ctx.fillStyle = '#ffffff';
      star(ctx, bx, by, R(0.014));
      ctx.fill();
    }
    // 멈출 범위 (흔들림): 굴러가는 방향으로 길쭉한 고리
    {
      const ca = Math.cos(pv.ang), sa = Math.sin(pv.ang), a1 = pv.D * JD + 0.012, a2 = pv.D * Math.sin(JA) + 0.012;
      ctx.strokeStyle = 'rgba(255,240,150,.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 32; k++) {
        const a = (k / 32) * TAU, px = pv.q.x + ca * Math.cos(a) * a1 - sa * Math.sin(a) * a2, py = pv.q.y + sa * Math.cos(a) * a1 + ca * Math.sin(a) * a2;
        if (k) ctx.lineTo(SX(px, py), SY(py));
        else ctx.moveTo(SX(px, py), SY(py));
      }
      ctx.stroke();
    }
    // 결과 말풍선
    let txt = '', col = '#ffffff';
    if (o.res === 3) (txt = '퐁당! ✗'), (col = '#ff8a8a');
    else if (o.merges >= 2) (txt = `연쇄 ${o.merges}번 합체!`), (col = '#ffd84a');
    else if (o.merges === 1) (txt = o.hill ? '언덕 타고 쿵! 합체' : '쿵! 합체'), (col = '#ffd84a');
    else if (o.res === 1) (txt = `여기 서요 (눈 ${pv.die.p})`), (col = '#ffffff');
    if (txt) {
      const bx = SX(o.x, o.y), by = SY(o.y) - R(o.merges ? 0.15 : 0.105);
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(txt).width + R(0.03);
      ctx.fillStyle = 'rgba(20,40,20,.82)';
      ctx.beginPath();
      ctx.roundRect(Math.max(4, Math.min(w - tw - 4, bx - tw / 2)), by - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillText(txt, Math.max(4 + tw / 2, Math.min(w - tw / 2 - 4, bx)), by + 1);
    }
    ctx.globalAlpha = 1;
  }
  // 1판 첫 톡 전: 여기를 노려요
  if (s.stage === 0 && !s.firstThrow && s.phase === 'play' && s.towers.length) {
    const tg = s.towers.find((q) => q.p === (die0?.p ?? 2)) ?? s.towers[0];
    const pulse = (t % 50) / 50;
    ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
    ctx.lineWidth = 3;
    pcircle(tg.x, tg.y, 0.03 + pulse * 0.08);
    ctx.stroke();
    if (!s.down) {
      const hx = SX(tg.x, tg.y) + R(0.05), hy = SY(tg.y) + R(0.02) + Math.sin(t * 0.15) * R(0.01);
      ctx.fillStyle = '#ffffff';
      font(0.06, 900);
      ctx.textAlign = 'center';
      ctx.fillText('👆', hx, hy);
    }
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = SX(e.x, e.y), y = SY(e.y);
    const big = (e.n ?? 1) >= 2;
    if (e.kind === 'throw') fx.burst(X(0.5), castleY - R(0.13), '#ffffff', 10, 2.2, 2), fx.pop(X(0.5), castleY - R(0.2), '데굴데굴~', '#fff3c0', 15);
    if (e.kind === 'stand') fx.burst(x, y, '#e8d8b0', 12, 2.2, 2), fx.ring(x, y, '#ffffff', R(0.05), 2), fx.pop(x, y - R(0.09), '섰다!', '#ffffff', 14), fx.kick(1.5);
    if (e.kind === 'bonk') fx.burst(x, y - R(0.02), '#ffffff', 8, 2, 1.8), fx.kick(2.5), fx.pop(x, y - R(0.07), e.text ?? '통!', '#ffe3b0', 14);
    if (e.kind === 'merge') fx.burst(x, y - R(0.03), LV[Math.min(7, e.c!)], 26, 4.4, 2.8), fx.ring(x, y, '#ffe066', R(0.11), 5), fx.kick(5 + e.c!), fx.pop(x, y - R(0.09), `쿵! 눈 ${e.c}`, '#ffe066', 19);
    if (e.kind === 'chain') {
      fx.burst(x, y - R(0.03), '#ffd84a', 40, 5.5, 3), fx.burst(x, y, LV[Math.min(7, e.c!)], 26, 4.5, 2.6), fx.ring(x, y, '#ffffff', R(0.18), 6), fx.ring(x, y, '#ffd84a', R(0.26), 4);
      fx.kick(9 + e.n!), fx.blink('#fff6c8', 0.25), fx.pop(x, y - R(0.23), `연쇄 ${e.n}번! 눈 ${e.c}`, '#ffd84a', 22 + e.n! * 2);
    }
    if (e.kind === 'king') fx.burst(x, y, '#ffd23a', 70, 7, 3.4), fx.burst(x, y, '#ffffff', 40, 5, 3), fx.ring(x, y, '#ffd23a', R(0.35), 8), fx.kick(14), fx.blink('#fff2a0', 0.45), fx.pop(x, y - R(0.18), '👑 왕 주사위!', '#ffe066', 26);
    if (e.kind === 'sink') fx.burst(x, y, '#9fe3ff', 26, 4, 2.6), fx.ring(x, y, '#ffffff', R(0.08), 4), fx.kick(4), fx.pop(x, y - R(0.08), '퐁당!', '#bfeaff', 18);
    if (e.kind === 'pop') fx.burst(x, y - R(0.03), ['#7ee05a', '#ff9ec4', '#c9a6ff', '#ff6b5a'][e.n!], e.n === BOSS ? 50 : 12, e.n === BOSS ? 6 : 3, 2.4), e.n === BOSS && (fx.kick(12), fx.blink('#ffffff', 0.3), fx.pop(x, y - R(0.1), '대장 뿅!', '#ffd84a', 24));
    if (e.kind === 'kingfire') fx.ring(x, y, '#ffe066', R(RANGE(KING)), 3);
    if (e.kind === 'boss') fx.kick(8), fx.pop(x, y + R(0.05), '👑 대장 등장!', '#ff9c8a', 20);
    if (e.kind === 'leak') fx.burst(gateX, castleY - R(0.05), '#ff8a8a', 30, 5, 3), fx.kick(12), fx.blink(th.hot, 0.3), fx.pop(gateX, castleY - R(0.2), '앗! 성문 쿵!', '#ffb3a8', 20);
    if (e.kind === 'nope') fx.pop(x, y, e.text!, '#ffd6cc', 14), fx.kick(1.5);
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.5), '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, Y(0.5), '#ff9ec4', 40, 6, 3.2), fx.ring(w / 2, Y(0.6), '#ffe066', R(0.45), 7), fx.blink('#fff6c8', 0.22);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
    void big;
  }
  fx.memo.t = s.t;
  // 연쇄로 느려진 동안: 화면 가장자리 빛
  if (s.slowT > 0) {
    ctx.strokeStyle = `rgba(255,230,120,${Math.min(0.5, s.slowT / 80)})`;
    ctx.lineWidth = R(0.025);
    ctx.strokeRect(0, Y(0.075), w, Y(BAND - 0.075));
  }
  ctx.restore();

  drawHud(ctx, s, d, w, h, X, Y, R, font, th, die0);
}
const PREV = new WeakMap<object, { key: string; pv: { pts: number[]; o: Outcome; bon: number[]; die: Die; q: { x: number; y: number }; D: number; ang: number } }>();

function drawHud(ctx: CanvasRenderingContext2D, s: DiceState, d: StageDef, w: number, h: number, X: F, Y: F, R: F, font: (sz: number, wgt?: number) => void, th: Theme, die0: Die | null) {
  const t = s.t, n = nStars(s.stage);
  // ═════════════ 위 띠 ═════════════
  const hb = R(0.075);
  ctx.fillStyle = 'rgba(28,58,36,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `🏰 ${s.stage + 1}판`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.56);
  // 파도
  const waves = d.waves.length, cur = d.waves.filter((wd) => (d.prep ?? PREP) + wd.at <= s.st).length;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d9f2dc';
  font(0.036, 800);
  ctx.fillText(`파도 ${Math.max(1, cur)}/${waves}`, w * 0.47, hb * 0.54);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 (하늘 띠)
  if (s.news && t - s.news.t < NEWS_T) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + R(0.12)), by2 = Y(0.115) + drop;
    ctx.fillStyle = 'rgba(28,58,36,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = th.accent;
    font(0.028, 900);
    ctx.textAlign = 'left';
    ctx.fillText('NEW', w / 2 - tw2 / 2 + R(0.02), by2);
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2 + R(0.035), by2, tw2 - R(0.1));
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 성 지킴 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '성을 다 지켰어요! 🏰' : '성 지켰다!'), (sub = `남은 주사위 ${leftDice(s)}개`), (col = '#ffd84a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 젤리들이 성에서 춤춰요'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}판 ${d.name}` : `${s.stage + 1}판 ${d.name}`;
      sub = `파도 ${d.waves.length}번 · 주사위 ${s.bag.length}개`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(0.36), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,58,36,.93)';
      ctx.beginPath();
      ctx.roundRect(-R(0.45), -R(0.055), R(0.9), R(ch), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.056), x0 = -(hw + R(0.02) + sw * n) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018));
        for (let k = 0; k < n; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.018));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          const fx = juice(s);
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.84));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.84));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.86));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  const ty = BAND, tb = h / w;
  {
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(36,70,44,.97)');
    g.addColorStop(1, 'rgba(22,46,28,.99)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
  }
  // 줄 1: 지금 · 다음 · 주머니
  const r1 = Y(ty + 0.124), lab = Y(ty + 0.024);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  font(0.032, 800);
  ctx.fillStyle = '#b9d8c0';
  ctx.fillText('지금', X(0.085), lab);
  ctx.fillText('다음', X(0.215), lab);
  if (die0) drawDie(ctx, X(0.085), r1, R(0.031), die0.p, die0.c, { t, mood: s.roll ? 3 : 0 });
  else {
    font(0.032, 800);
    ctx.fillStyle = '#ffb3a8';
    ctx.fillText('없음', X(0.085), r1 - R(0.04));
  }
  const nx = dieAt(s, s.bi + 1);
  if (nx) drawDie(ctx, X(0.215), r1 - R(0.006), R(0.025), nx.p, nx.c, { t: t + 50, mood: 0 });
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(X(0.285), Y(ty + 0.012));
  ctx.lineTo(X(0.285), r1 + R(0.008));
  ctx.stroke();
  // 주머니 (남은 주사위 눈별 개수)
  const cnt = new Map<string, { p: number; c: number; n: number }>();
  for (let i = s.bi; i < s.bag.length; i++) {
    const b = s.bag[i], k = `${b.c}:${b.p}`;
    const e = cnt.get(k);
    if (e) e.n++;
    else cnt.set(k, { p: b.p, c: b.c, n: 1 });
  }
  const list = [...cnt.values()].sort((a, b) => a.c - b.c || a.p - b.p);
  ctx.fillStyle = '#b9d8c0';
  font(0.03, 800);
  ctx.textAlign = 'left';
  font(0.032, 800);
  ctx.fillText(`주머니에 남은 주사위 ${leftDice(s)}개`, X(0.31), lab);
  const step = Math.min(0.11, 0.66 / Math.max(1, list.length));
  list.forEach((e, i) => {
    const cx = X(0.335 + i * step);
    drawDie(ctx, cx, r1 - R(0.012), R(0.02), e.p, e.c, { t, face: false });
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.textAlign = 'left';
    ctx.fillText(`${e.n}`, cx + R(0.03), r1 - R(0.03));
  });
  // 줄 2~4: 별 조건
  const labels = ['성 지키기', `주사위 ${d.left}개 남기기`, THIRD_TXT[d.third]];
  const ok3 = thirdOk(s);
  const live = [s.phase === 'result' && s.ok, leftDice(s) >= d.left, ok3];
  const lost = [s.phase === 'result' && !s.ok, leftDice(s) < d.left, d.third === 'boss' && s.bossAt > 0.5 && s.bossAt < 9];
  for (let k = 0; k < n; k++) {
    const yy = Y(ty + 0.155 + k * 0.04), failed = s.phase === 'result' && !s.ok, okk = failed ? false : s.phase === 'result' ? s.starOk[k] : k === 0 ? false : live[k] && k !== 1;
    const bad = failed || lost[k];
    ctx.fillStyle = okk ? '#ffd84a' : bad ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.65)';
    font(0.036, 900);
    ctx.textAlign = 'left';
    ctx.fillText(bad ? '✗' : '★', X(0.04), yy);
    ctx.fillStyle = okk ? '#fff3c0' : bad ? 'rgba(255,255,255,.4)' : '#eaf7ec';
    font(0.036, 800);
    ctx.fillText(labels[k], X(0.1), yy);
    if (k === 1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = leftDice(s) >= d.left ? '#b9f0c0' : '#ffb3a8';
      ctx.fillText(`지금 ${leftDice(s)}개`, X(0.96), yy);
    }
    if (k === 2 && d.third === 'chain') {
      ctx.textAlign = 'right';
      ctx.fillStyle = ok3 ? '#ffd84a' : '#eaf7ec';
      ctx.fillText(ok3 ? '했다!' : `가장 많이 ${s.maxChain}번`, X(0.96), yy);
    }
    if (k === 2 && d.third === 'big5') {
      ctx.textAlign = 'right';
      ctx.fillStyle = ok3 ? '#ffd84a' : '#eaf7ec';
      ctx.fillText(ok3 ? '했다!' : `가장 큰 탑 ${s.maxP}`, X(0.96), yy);
    }
    if (k === 2 && (d.third === 'hill' || d.third === 'boss') && (ok3 || bad)) {
      ctx.textAlign = 'right';
      ctx.fillStyle = ok3 ? '#ffd84a' : 'rgba(255,255,255,.45)';
      ctx.fillText(ok3 ? '했다!' : '놓쳤어요', X(0.96), yy);
    }
  }
  // 안내 한 줄
  let hint = d.hint;
  const first = s.stage === 0 && !s.firstThrow && s.phase === 'play';
  if (first) hint = '👆 같은 눈 탑을 꾹 눌러 겨누고, 떼면 데굴 → 쿵!';
  else if (s.down && s.phase === 'play') hint = s.roll ? '굴러가는 중 — 멈추면 다음 주사위' : die0 ? '떼면 데굴! 점선 = 굴러갈 길 · 노란 고리 = 멈출 범위' : '주사위를 다 썼어요';
  else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판 끝! 주사위들이 우쭐' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '꾹 누르면 굴러갈 길이 보여요';
  ctx.textAlign = 'center';
  ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
  font(first ? 0.04 : 0.036, 900);
  ctx.fillText(hint, w / 2, Y(ty + 0.155 + n * 0.04 + 0.006), w - R(0.05));
}
