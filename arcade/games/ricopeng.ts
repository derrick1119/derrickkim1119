/**
 * 도탄 눈덩이 펭귄 (32라운드: 실시간 액션 2탄) — 도탄 한 발 × 가리키기 × 연쇄.
 * 기준 9(손이 하는 일은 하나): 화면을 꾹 = 이글루 앞 아기 펭귄이 손가락 쪽으로 눈덩이를 겨누고, 벽·얼음 기둥에 튕길 길이 점선으로 보인다.
 *   떼면 쌩! 눈덩이가 벽을 '통!' 튕기며 길 위의 적을 모두 꿰뚫는다. 키보드는 화살표로 커서 + 스페이스.
 * 규칙(결정적, 3줄): 눈덩이는 벽·기둥에 튕길 때마다 빨라지고, 적을 맞힐 때마다 굴러 커진다(눈덩이 효과 — 클수록 잘 맞는다).
 *   한 발로 셋을 맞히면 눈덩이 하나를 돌려받는다. 눈덩이는 셋까지 들고, 천천히 다시 뭉친다(아끼기·줄 설 때까지 기다리기).
 *   적이 이글루에 닿으면 이글루 하트 -1, 다 잃으면 하트 -1·그 판 다시(하트 셋을 다 잃거나 8판을 마치면 끝).
 * 미리 보기 = 실제: 점선은 실제와 같은 시뮬레이션(적이 미끄러지는 것까지)을 앞당겨 돌려 그린 것이다(처음 두 번 튕김까지만 보인다).
 * 와우: 첫 손짓 — 눈덩이가 왼쪽 벽을 '통!' 튕겨 비스듬히 줄 선 눈사람 셋을 줄줄이 꿰뚫고, 셋이 와르르 부서지며 눈가루가 흩날린다.
 * 판 8개: 목표 = 이글루 지키기(적을 모두 맞히기). 별 = 1판은 하나, 2판은 둘, 3판부터 셋(판마다 다른 쉬운 한 줄).
 * 펼쳐짐(하는 일이 바뀐다): 1판 눈사람(줄 꿰기) → 2판 바다표범(좌우로 미끄러짐 → 엇갈려 줄 설 때 쏘기) → 3판 얼음 기둥(꺾어 맞히기)
 *   → 4판 방패 바다표범(앞은 튕겨 냄 → 천장에 튕겨 등 뒤로) → 5판 깨지는 얼음벽(두 번 맞으면 와장창, 조각이 둘레를 쓰러뜨림)
 *   → 6판 눈덩이 개수 제한(다시 안 뭉쳐짐 → 아끼기) → 7판 아기 펭귄 소풍(친구는 피해서) → 8판 북극곰 대장(체력 6, 튕길 때마다 다시 꿰여서
 *   벽과 대장 사이를 오가게 쏘면 한 발로 여러 번 — 대장이 내려올수록 그 길이 열리지만 이글루에 닿으면 바로 무너진다).
 * 웃음: 맞은 바다표범은 뒤집혀 버둥거리며 미끄러져 나가고, 눈사람은 당근 코만 남기고 와르르. 이글루를 들이받은 적은 '쿵' 하고 어질어질.
 *   양옆 눈둑의 아기 펭귄 구경꾼이 큰 순간마다 폴짝 뛰며 날개를 파닥인다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.52;
/** 얼음판(튕기는 벽): 왼쪽·오른쪽 눈둑 XL·XR, 위쪽 빙벽 YT. 아래 YI는 이글루 마당(적이 닿으면 이글루 하트 -1) */
const XL = 0.06, XR = 0.94, YT = 0.43, YI = 1.1;
/** 눈덩이가 떠나는 곳 (펭귄의 날개) */
const PX = 0.5, PY = 1.1;
/** 눈덩이: 처음 속도 · 튕길 때마다 배수 · 최고 속도 · 처음 반지름 · 맞힐 때마다 커지는 양 · 최대 반지름 · 최대 길이 · 최대 튕김 */
const V0 = 0.03, VUP = 1.1, VMAX = 0.052, R0 = 0.017, RUP = 0.004, RMAX = 0.04, LMAX = 2.3, BMAX = 5;
/** 던지고 다음 눈덩이까지 · 들 수 있는 눈덩이 · 하나 다시 뭉치는 틱 · 이글루 하트 */
const COOL = 8, AMMO = 3, RELOAD = 140, HP_IG = 3;
const ENTER_T = 34, SHARD = 0.14, AMIN = 0.1;
const RESULT_OK = 170, RESULT_FAIL = 150, CARD_T = 150, NEWS_T = 150;
const STAR_PTS = 150, WIN_PTS = 300;
/** 눈덩이가 땅(그림자) 위에 떠 있는 높이 — 그리기만 */
const BALL_H = 0.036;

type K = 'snow' | 'seal' | 'shield' | 'bear' | 'chick';
const RAD: Record<K, number> = { snow: 0.031, seal: 0.033, shield: 0.035, bear: 0.072, chick: 0.026 };
const PTS: Record<K, number> = { snow: 10, seal: 15, shield: 30, bear: 40, chick: -40 };
const VY: Record<K, number> = { snow: 0.00095, seal: 0.0013, shield: 0.00085, bear: 0.00062, chick: 0 };
const KIND_NAME: Record<K, string> = { snow: '눈사람', seal: '바다표범', shield: '방패 바다표범', bear: '북극곰 대장', chick: '아기 펭귄' };
const BEAR_HP = 6;
/** 배우는 판은 너그럽게: [다시 뭉치는 시간 배수, 미끄러지는 속도 배수] (1판·2판·그 뒤) */
const EASE = [[0.5, 0.7], [0.75, 0.88], [1, 1]];
const ENTER = 0, GO = 1;

type StarK = 'keep' | 'multi' | 'pil' | 'shield' | 'shatter' | 'nohurt' | 'save' | 'friend' | 'boss' | 'thrift';
interface Star { k: StarK; n: number; label: string }
/** [종류, x, y, 옆으로 미끄러지는 속도, 나오는 순서 지연(틱)] */
type Spawn = [K, number, number, number?, number?];
interface Wave { need: number; wait: number; foes: Spawn[] }
interface StageDef {
  key: string; name: string; place: number; news: string; hint: string; goal: string;
  pillars?: number[][]; blocks?: number[][]; limit?: number; waves: Wave[]; stars: Star[];
}
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
/** 줄 만들기: (x0,y0)에서 (dx,dy)씩 n개 */
const line = (k: K, n: number, x0: number, y0: number, dx: number, dy: number, vx = 0, gap = 5): Spawn[] =>
  [...Array(n).keys()].map((i) => [k, x0 + dx * i, y0 + dy * i, vx, i * gap] as Spawn);

/** 판 8개. 좌표는 뒤집기 전 — 2판부터 판마다(다시 할 때도) 시드로 좌우를 뒤집고 살짝 흔든다 */
export const STAGES: StageDef[] = [
  {
    key: 'snow', name: '눈사람 마을', place: 0, news: '', goal: '이글루 지키기',
    hint: '줄 선 눈사람을 한 발로 꿰면 눈덩이가 굴러 커져요',
    waves: [
      { need: 0, wait: 1e9, foes: [['snow', 0.25, 0.68], ['snow', 0.375, 0.59], ['snow', 0.5, 0.5]] },
      { need: 0, wait: 420, foes: line('snow', 4, 0.5, 0.76, 0, -0.085) },
      { need: 1, wait: 480, foes: [...line('snow', 3, 0.2, 0.72, 0.12, -0.085), ...line('snow', 3, 0.8, 0.72, -0.12, -0.085)] },
    ],
    stars: [S('keep', 0, '이글루 지키기')],
  },
  {
    key: 'seal', name: '바다표범 비탈', place: 0, news: '바다표범 — 좌우로 미끄러져요', goal: '이글루 지키기',
    hint: '엇갈려 한 줄이 되는 순간을 기다려요',
    waves: [
      { need: 0, wait: 1e9, foes: [...line('seal', 3, 0.2, 0.5, 0.1, 0.07, 0.0016), ['snow', 0.75, 0.55, 0, 10]] },
      { need: 1, wait: 420, foes: [...line('seal', 2, 0.15, 0.55, 0, 0.09, 0.002), ...line('seal', 2, 0.85, 0.55, 0, 0.09, -0.002), ['snow', 0.5, 0.52, 0, 8], ['snow', 0.5, 0.62, 0, 12]] },
      { need: 1, wait: 460, foes: [['seal', 0.5, 0.5, 0, 0], ['seal', 0.38, 0.58, -0.0012, 4], ['seal', 0.62, 0.58, 0.0012, 4], ['seal', 0.26, 0.66, -0.0012, 8], ['seal', 0.74, 0.66, 0.0012, 8], ['snow', 0.5, 0.7, 0, 12]] },
    ],
    stars: [S('keep', 0, '이글루 지키기'), S('multi', 3, '한 발로 셋 맞히기')],
  },
  {
    key: 'pillar', name: '얼음 기둥 숲', place: 1, news: '얼음 기둥 — 눈덩이가 비스듬히 꺾여요', goal: '이글루 지키기',
    hint: '기둥에 맞혀 꺾으면 뒤에 숨은 적도 맞아요',
    pillars: [[0.5, 0.88, 0.042], [0.25, 0.68, 0.038], [0.75, 0.68, 0.038]],
    waves: [
      { need: 0, wait: 1e9, foes: [...line('snow', 3, 0.5, 0.5, 0, 0.08), ['seal', 0.2, 0.5, 0.0012, 6], ['seal', 0.8, 0.52, -0.0012, 6]] },
      { need: 2, wait: 380, foes: [['seal', 0.15, 0.5, 0.0016], ['seal', 0.35, 0.56, -0.0012, 4], ['seal', 0.65, 0.5, 0.0012, 8], ['seal', 0.85, 0.56, -0.0016, 12], ['snow', 0.4, 0.6, 0, 6], ['snow', 0.6, 0.6, 0, 10]] },
      { need: 2, wait: 380, foes: [...line('snow', 3, 0.3, 0.5, 0.2, 0), ...line('seal', 3, 0.2, 0.58, 0.3, 0, 0.0014)] },
      { need: 2, wait: 400, foes: [...line('seal', 3, 0.25, 0.5, 0.25, 0, -0.0014), ...line('snow', 2, 0.5, 0.6, 0, 0.08)] },
    ],
    stars: [S('keep', 0, '이글루 지키기'), S('pil', 4, '기둥에 튕긴 한 발로 넷'), S('multi', 5, '한 발로 다섯 맞히기')],
  },
  {
    key: 'shield', name: '방패 바다표범 고개', place: 1, news: '방패 바다표범 — 앞은 튕겨 내요, 등 뒤로!', goal: '이글루 지키기',
    hint: '위쪽 빙벽에 튕기면 위에서 등 뒤로 떨어져요',
    pillars: [[0.5, 0.9, 0.04]],
    waves: [
      { need: 0, wait: 1e9, foes: line('shield', 3, 0.3, 0.58, 0.2, 0) },
      { need: 2, wait: 400, foes: [['shield', 0.25, 0.52], ['shield', 0.75, 0.52, 0, 6], ...line('seal', 3, 0.3, 0.62, 0.2, 0, 0.0012)] },
      { need: 2, wait: 400, foes: [...line('shield', 3, 0.3, 0.5, 0.2, 0), ...line('snow', 3, 0.5, 0.6, 0, 0.08)] },
      { need: 2, wait: 420, foes: [['shield', 0.35, 0.52], ['shield', 0.65, 0.52, 0, 6], ...line('seal', 3, 0.2, 0.62, 0.3, 0, -0.0014)] },
    ],
    stars: [S('keep', 0, '이글루 지키기'), S('shield', 2, '방패 둘을 한 발로'), S('thrift', 8, '눈덩이 여덟 개로 끝내기')],
  },
  {
    key: 'block', name: '얼음벽 골짜기', place: 2, news: '얼음벽 — 두 번 맞으면 와장창!', goal: '이글루 지키기',
    hint: '적이 얼음벽 곁에 오면 깨요 — 조각이 둘레를 쓰러뜨려요',
    blocks: [[0.26, 0.72, 0.032], [0.34, 0.72, 0.032], [0.42, 0.72, 0.032], [0.58, 0.6, 0.032], [0.66, 0.6, 0.032], [0.74, 0.6, 0.032]],
    waves: [
      { need: 0, wait: 1e9, foes: [...line('snow', 3, 0.26, 0.52, 0.08, 0), ['seal', 0.6, 0.48, 0.0008, 6], ['seal', 0.74, 0.48, 0.0008, 10]] },
      { need: 2, wait: 400, foes: [...line('seal', 3, 0.2, 0.5, 0.1, 0, 0.0012), ['shield', 0.7, 0.48, 0, 6], ['snow', 0.84, 0.5, 0, 10]] },
      { need: 2, wait: 400, foes: [...line('snow', 4, 0.2, 0.5, 0.2, 0), ['seal', 0.3, 0.58, -0.0012, 8], ['seal', 0.7, 0.58, -0.0012, 8]] },
      { need: 2, wait: 420, foes: [...line('seal', 3, 0.3, 0.5, 0.2, 0, 0.0014), ...line('snow', 2, 0.4, 0.6, 0.2, 0)] },
    ],
    stars: [S('keep', 0, '이글루 지키기'), S('shatter', 3, '얼음 조각으로 셋 쓰러뜨리기'), S('multi', 5, '한 발로 다섯 맞히기')],
  },
  {
    key: 'limit', name: '눈 없는 언덕', place: 2, news: '눈덩이 열한 개뿐 — 다시 안 뭉쳐져요', goal: '이글루 지키기', limit: 11,
    hint: '셋을 맞히면 하나 돌려받아요 — 줄 설 때까지 아껴요',
    pillars: [[0.3, 0.8, 0.036], [0.7, 0.8, 0.036]],
    waves: [
      { need: 0, wait: 1e9, foes: [...line('seal', 3, 0.2, 0.5, 0.1, 0.06, 0.0014), ...line('snow', 3, 0.7, 0.52, 0, 0.08)] },
      { need: 2, wait: 440, foes: [...line('seal', 2, 0.15, 0.54, 0, 0.09, 0.0018), ...line('seal', 2, 0.85, 0.54, 0, 0.09, -0.0018), ['shield', 0.5, 0.5]] },
      { need: 2, wait: 460, foes: [...line('snow', 5, 0.5, 0.82, 0, -0.08), ['seal', 0.2, 0.55, 0.0012], ['seal', 0.8, 0.55, -0.0012]] },
    ],
    stars: [S('keep', 0, '이글루 지키기'), S('save', 2, '눈덩이 둘 남기기'), S('nohurt', 0, '이글루 안 다치기')],
  },
  {
    key: 'chick', name: '아기 펭귄 소풍길', place: 3, news: '아기 펭귄 친구 — 맞히면 안 돼요!', goal: '이글루 지키기',
    hint: '친구가 지나간 다음에 — 점선이 친구에 닿으면 멈춰요',
    pillars: [[0.5, 0.88, 0.038]],
    waves: [
      { need: 0, wait: 1e9, foes: [...line('chick', 3, -0.1, 0.78, -0.07, 0, 0.0035, 0), ...line('seal', 3, 0.3, 0.52, 0.2, 0, 0.001), ['snow', 0.5, 0.6]] },
      { need: 2, wait: 420, foes: [...line('chick', 3, 1.1, 0.66, 0.07, 0, -0.0032, 0), ['shield', 0.3, 0.5], ['shield', 0.7, 0.5], ...line('snow', 3, 0.5, 0.52, 0, 0.08)] },
      { need: 2, wait: 440, foes: [...line('chick', 4, -0.1, 0.84, -0.07, 0, 0.0034, 0), ...line('seal', 4, 0.2, 0.5, 0.2, 0, 0.0014), ['shield', 0.5, 0.62]] },
    ],
    stars: [S('keep', 0, '이글루 지키기'), S('friend', 0, '친구 펭귄 안 맞히기'), S('thrift', 7, '눈덩이 일곱 개로 끝내기')],
  },
  {
    key: 'bear', name: '북극곰 대장 빙벽', place: 3, news: '북극곰 대장 — 여섯 번 맞혀야 해요', goal: '대장 이기기',
    hint: '튕길 때마다 대장을 또 꿰요 — 벽과 대장 사이를 오가게!',
    pillars: [[0.25, 0.86, 0.036], [0.75, 0.86, 0.036]],
    waves: [
      { need: 0, wait: 1e9, foes: [['bear', 0.5, 0.56, 0.0006], ...line('snow', 2, 0.25, 0.6, 0.5, 0)] },
      { need: 1, wait: 400, foes: [...line('seal', 3, 0.2, 0.52, 0.12, 0.05, 0.0014), ['shield', 0.78, 0.55]] },
      { need: 1, wait: 440, foes: [...line('snow', 3, 0.2, 0.52, 0.3, 0), ...line('seal', 2, 0.35, 0.62, 0.3, 0, -0.0012)] },
    ],
    stars: [S('keep', 0, '대장 이기기'), S('boss', 3, '한 발로 대장 세 번'), S('nohurt', 0, '이글루 안 다치기')],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Foe {
  id: number; k: K; x: number; y: number; vx: number; vy: number; hp: number; ph: number;
  st: number; tm: number; delay: number; ex: number; ey: number; tx: number; ty: number; dizzy: number; dead: boolean;
  // 연출 (시뮬레이션 결과와 무관)
  hurtT: number; seed: number;
}
interface Pillar { x: number; y: number; r: number }
interface Block { id: number; x: number; y: number; r: number; hp: number }
interface Ball {
  id: number; x: number; y: number; dx: number; dy: number; v: number; r: number; dist: number; bounces: number;
  hit: number[]; n: number; pil: boolean; pn: number; sh: number; bossN: number; bl: number; refunds: number; done: string;
  // 연출: 지나온 자리
  tr: number[];
}
/** 한 틱 동안 눈덩이에게 일어난 일 */
interface Hap { k: string; x: number; y: number; f?: Foe; n?: number }
interface Field { foes: Foe[]; pillars: Pillar[]; blocks: Block[] }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string; k?: K; seed?: number; a?: number; r?: number }
/** 부서진 적 (연출: 멈칫했다가 부서지거나 뒤집혀 날아간다) */
interface Wreck { k: K; x: number; y: number; t: number; a: number; n: number; seed: number; face: number }

export interface PengState extends Field {
  rng: Rng; seed: number; t: number; wt: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  ig: number; ammo: number; reload: number; cool: number; queue: { x: number; y: number } | null; limited: boolean;
  down: boolean; lock: boolean; aim: { x: number; y: number } | null; holdT: number;
  freeze: number; slowT: number; flip: boolean;
  balls: Ball[]; nid: number; wave: number; waveT: number;
  best: number; pilBest: number; shBest: number; shardK: number; hurtN: number; chickN: number; bossBest: number; shots: number;
  firstShot: number; firstBig: number; firstPress: number;
  seen: Set<string>; spotted: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  events: Ev[]; wrecks: Wreck[];
  // 연출용 (시뮬레이션 결과와 무관)
  mood: number; moodT: number; throwT: number; cheerT: number; bigN: number;
}

const ev = (s: PengState, kind: string, x: number, y: number, n?: number, text?: string, extra?: Partial<Ev>) => s.events.push({ t: s.t, kind, x, y, n, text, ...extra });
function see(s: PengState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (s: { stage: number }) => EASE[Math.min(s.stage, 2)];

// ───────────────────────────── 시뮬레이션 ─────────────────────────────

/** 적 한 틱 (순수: 자기 상태와 기둥·얼음벽만 본다 — 그래서 미리 보기가 실제와 똑같다) */
function moveFoe(f: Foe, F: Field, spd: number) {
  if (f.st === ENTER) {
    if (f.delay > 0) return void f.delay--;
    f.tm++;
    const u = Math.min(1, f.tm / ENTER_T);
    f.x = f.ex + (f.tx - f.ex) * u;
    f.y = f.ey + (f.ty - f.ey) * u;
    if (u >= 1) f.st = GO;
    return;
  }
  f.ph++;
  if (f.dizzy > 0) return void f.dizzy--;
  if (f.k === 'chick') return void (f.x += f.vx);
  let vy = f.vy * spd;
  if (f.k === 'seal' || f.k === 'shield') vy *= 0.5 + 1.0 * Math.max(0, Math.sin(f.ph * 0.07 + f.seed));
  f.y += vy;
  f.x += f.vx * spd;
  const r = RAD[f.k];
  if (f.x < XL + r) (f.x = XL + r), (f.vx = Math.abs(f.vx));
  if (f.x > XR - r) (f.x = XR - r), (f.vx = -Math.abs(f.vx));
  for (const p of F.pillars) around(f, p.x, p.y, p.r);
  for (const b of F.blocks) if (b.hp > 0) around(f, b.x, b.y, b.r);
}
/** 기둥·얼음벽을 옆으로 비켜 미끄러진다 */
function around(f: Foe, px: number, py: number, pr: number) {
  const dx = f.x - px, dy = f.y - py, want = pr + RAD[f.k] * 0.85;
  if (Math.abs(dx) >= want || Math.abs(dy) >= want) return;
  const d = Math.hypot(dx, dy);
  if (d >= want) return;
  const push = Math.min(0.006, want - d), sx = dx >= 0 ? 1 : -1;
  f.x = clamp(f.x + sx * push, XL + RAD[f.k], XR - RAD[f.k]);
  if (dy < 0) f.y -= Math.min(f.vy, (want - d) * 0.3);
}

/** 점과 선분 사이 거리 (가장 가까운 점의 y·비율은 segU·segY에 남긴다 — 봇이 수만 번 부르므로 배열을 만들지 않는다) */
let segU = 0, segY = 0;
function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
  const ex = x1 - x0, ey = y1 - y0, L2 = ex * ex + ey * ey;
  let u = L2 > 1e-12 ? ((px - x0) * ex + (py - y0) * ey) / L2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const cx = x0 + ex * u, cy = y0 + ey * u, dx = px - cx, dy = py - cy;
  segU = u;
  segY = cy;
  return Math.sqrt(dx * dx + dy * dy);
}

function aimDir(ax: number, ay: number) {
  let a = Math.atan2(ay - PY, ax - PX);
  if (a > 0) a = a < Math.PI / 2 ? -AMIN : -Math.PI + AMIN;
  a = clamp(a, -Math.PI + AMIN, -AMIN);
  return [Math.cos(a), Math.sin(a)];
}

function newBall(id: number, ax: number, ay: number): Ball {
  const [dx, dy] = aimDir(ax, ay);
  return { id, x: PX, y: PY, dx, dy, v: V0, r: R0, dist: 0, bounces: 0, hit: [], n: 0, pil: false, pn: 0, sh: 0, bossN: 0, bl: -1, refunds: 0, done: '', tr: [] };
}

/** 얼음벽 와장창: 조각이 둘레의 적을 쓰러뜨리고, 곁의 얼음벽도 금이 간다 (연쇄) */
function shatter(F: Field, k: Block, b: Ball, out: Hap[] | null) {
  k.hp = 0;
  out?.push({ k: 'shatter', x: k.x, y: k.y });
  for (const f of F.foes) {
    if (f.dead || f.st !== GO || f.k === 'chick' || Math.hypot(f.x - k.x, f.y - k.y) > SHARD + RAD[f.k] * 0.5) continue;
    if (f.k === 'bear') {
      f.hp--;
      if (f.hp > 0) continue;
    }
    f.dead = true;
    b.n++;
    if (f.k === 'shield') b.sh++;
    out?.push({ k: 'shard', x: f.x, y: f.y, f, n: b.n });
  }
  for (const o of F.blocks) if (o.hp > 0 && Math.hypot(o.x - k.x, o.y - k.y) < 0.09 && --o.hp <= 0) shatter(F, o, b, out);
}

/**
 * 눈덩이 한 틱 (시뮬레이션·미리 보기·봇이 모두 같은 것을 쓴다).
 * 벽·빙벽·기둥·얼음벽·방패 앞면·북극곰에 닿으면 정확히 그 자리에서 튕기고(빨라짐), 지나간 길 위의 적은 모두 맞는다(커짐).
 */
/** 원과 부딪히기 (ballStep 안에서만 쓰는 임시 값 — 봇이 수십만 번 부르므로 클로저·배열을 만들지 않는다) */
let cU = 0, cNx = 0, cNy = 0, cObj: unknown = null, cKind = '', cSkip: unknown = null;
function circ(b: Ball, cx: number, cy: number, cr: number, o: unknown, kd: string, front: boolean) {
  if (o === cSkip) return;
  const ox = b.x - cx, oy = b.y - cy, R = cr + b.r, bb = ox * b.dx + oy * b.dy;
  if (bb >= 0) return;
  const c = ox * ox + oy * oy - R * R;
  if (c < 0) return;
  const disc = bb * bb - c;
  if (disc < 0) return;
  const q = -bb - Math.sqrt(disc);
  if (q < 0 || q >= cU) return;
  const hx = (b.x + b.dx * q - cx) / R, hy = (b.y + b.dy * q - cy) / R;
  if (front && hy < 0.3) return;
  (cU = q), (cNx = hx), (cNy = hy), (cObj = o), (cKind = kd);
}
const LEGS: number[] = [];
const CAND: { f: Foe; o: number }[] = [];
function ballStep(F: Field, b: Ball, out: Hap[] | null) {
  let rem = b.v, skip: unknown = null;
  const legs = LEGS;
  legs.length = 0;
  for (let it = 0; it < 6 && rem > 1e-7 && !b.done; it++) {
    let u = rem, nx = 0, ny = 0, obj: unknown = null, kind = '';
    if (b.dx < -1e-9) {
      const q = (XL + b.r - b.x) / b.dx;
      if (q >= 0 && q < u && skip !== 'L') (u = q), (nx = 1), (ny = 0), (obj = 'L'), (kind = 'wall');
    }
    if (b.dx > 1e-9) {
      const q = (XR - b.r - b.x) / b.dx;
      if (q >= 0 && q < u && skip !== 'R') (u = q), (nx = -1), (ny = 0), (obj = 'R'), (kind = 'wall');
    }
    if (b.dy < -1e-9) {
      const q = (YT + b.r - b.y) / b.dy;
      if (q >= 0 && q < u && skip !== 'T') (u = q), (nx = 0), (ny = 1), (obj = 'T'), (kind = 'top');
    }
    (cU = u), (cNx = nx), (cNy = ny), (cObj = obj), (cKind = kind), (cSkip = skip);
    for (const p of F.pillars) circ(b, p.x, p.y, p.r, p, 'pillar', false);
    for (const k of F.blocks) if (k.hp > 0) circ(b, k.x, k.y, k.r, k, 'block', false);
    for (const f of F.foes) if (f.k === 'shield' && !f.dead && f.st === GO) circ(b, f.x, f.y, RAD.shield, f, 'shield', true);
    (u = cU), (nx = cNx), (ny = cNy), (obj = cObj), (kind = cKind);
    const x1 = b.x + b.dx * u, y1 = b.y + b.dy * u;
    legs.push(b.x, b.y, x1, y1);
    b.x = x1;
    b.y = y1;
    rem -= u;
    b.dist += u;
    if (!obj) break;
    const dd = b.dx * nx + b.dy * ny;
    b.dx -= 2 * dd * nx;
    b.dy -= 2 * dd * ny;
    const L = Math.hypot(b.dx, b.dy);
    b.dx /= L;
    b.dy /= L;
    b.bounces++;
    b.v = Math.min(VMAX, b.v * VUP);
    skip = obj;
    if (kind === 'pillar') b.pil = true;
    if (kind === 'block') {
      const k = obj as Block;
      if (--k.hp <= 0) shatter(F, k, b, out);
      else out?.push({ k: 'block', x: x1, y: y1 });
    } else out?.push({ k: kind, x: x1, y: y1 });
  }
  // 길 위의 적 (지나간 순서대로)
  const cand = CAND;
  cand.length = 0;
  for (const f of F.foes) {
    // 북극곰 대장은 튕길 때마다 다시 맞을 수 있다 (벽과 대장 사이를 오가면 여러 번)
    if (f.dead || f.st !== GO || (f.k === 'bear' ? b.bl === b.bounces : b.hit.includes(f.id))) continue;
    const R = RAD[f.k] + b.r;
    for (let i = 0; i < legs.length; i += 4) {
      const lim = R + 0.06;
      if (Math.abs(f.x - legs[i]) > lim || Math.abs(f.y - legs[i + 1]) > lim) continue;
      const d = segDist(f.x, f.y, legs[i], legs[i + 1], legs[i + 2], legs[i + 3]);
      if (d >= R) continue;
      if (f.k === 'shield' && (segY - f.y) / Math.max(1e-6, d) > 0.3) continue;
      cand.push({ f, o: i + segU });
      break;
    }
  }
  if (cand.length > 1) cand.sort((p, q) => p.o - q.o);
  for (const { f } of cand) {
    if (b.done) break;
    if (f.k === 'bear') {
      f.hp--;
      b.n++;
      b.bossN++;
      b.bl = b.bounces;
      b.r = Math.min(RMAX, b.r + RUP * 0.5);
      f.dizzy = 14;
      f.y = Math.max(YT + 0.1, f.y - 0.02);
      if (f.hp <= 0) f.dead = true;
      out?.push({ k: f.hp <= 0 ? 'hit' : 'bear', x: f.x, y: f.y, f, n: b.n });
      continue;
    }
    b.hit.push(f.id);
    if (f.k === 'chick') {
      f.dizzy = 100;
      b.done = 'chick';
      out?.push({ k: 'chick', x: f.x, y: f.y, f });
      break;
    }
    f.dead = true;
    b.n++;
    b.r = Math.min(RMAX, b.r + RUP);
    if (b.pil) b.pn++;
    if (f.k === 'shield') b.sh++;
    out?.push({ k: 'hit', x: f.x, y: f.y, f, n: b.n });
  }
  if (!b.done && (b.dist >= LMAX || b.bounces > BMAX)) b.done = 'poof';
  if (!b.done && b.dy > 0 && b.y > YI + 0.03) b.done = 'exit';
}

/** 미리 보기 결과 (그리기·봇이 쓴다) */
interface Sim {
  pts: number[]; bd: number[]; bk: string[]; hits: { id: number; k: K; n: number; x: number; y: number; d: number; urg: number; back: boolean; pil: boolean }[];
  n: number; bossN: number; pn: number; sh: number; crack: number; chick: boolean; chickD: number; shard: number; ex: number; ey: number; done: string; ticks: number;
}

/** 눈덩이를 (ax,ay) 쪽으로 던지면? — 적이 미끄러지는 것까지 실제와 같은 코드로 앞당겨 돌린다 */
function simulate(s: PengState, ax: number, ay: number, lead = 0, maxT = 120): Sim {
  const F: Field = { foes: s.foes.map((f) => ({ ...f })), pillars: s.pillars, blocks: s.blocks.map((k) => ({ ...k })) };
  const b = newBall(0, ax, ay), spd = ease(s)[1];
  // 이미 날아가는 눈덩이도 같이 돌린다 (그 눈덩이가 먼저 맞힐 적은 이 눈덩이 몫이 아니다)
  const fly = s.balls.filter((q) => !q.done).map((q) => ({ ...q, hit: [...q.hit], tr: [] as number[] }));
  const out: Sim = { pts: [PX, PY], bd: [], bk: [], hits: [], n: 0, bossN: 0, pn: 0, sh: 0, crack: 0, chick: false, chickD: 0, shard: 0, ex: PX, ey: PY, done: '', ticks: 0 };
  const haps: Hap[] = [];
  // 봇은 누르고 떼기까지 몇 틱이 걸린다 — 그동안 적이 미끄러지는 것을 먼저 돌린다
  for (let k = 0; k < lead; k++) {
    for (const f of F.foes) moveFoe(f, F, spd);
    for (const f of F.foes) if (!f.dead && f.st === GO && f.k !== 'chick' && f.y >= YI) f.dead = true;
    for (const q of fly) if (!q.done) ballStep(F, q, null);
    F.foes = F.foes.filter((f) => !f.dead);
  }
  let t = 0;
  for (; t < maxT && !b.done; t++) {
    for (const f of F.foes) moveFoe(f, F, spd);
    for (const f of F.foes) if (!f.dead && f.st === GO && f.k !== 'chick' && f.y >= YI) f.dead = true;
    for (const q of fly) if (!q.done) ballStep(F, q, null);
    haps.length = 0;
    const d0 = b.dist;
    ballStep(F, b, haps);
    if (!haps.length && !fly.length) {
      let gone = false;
      for (const f of F.foes) if (f.dead) gone = true;
      if (!gone) continue;
    }
    let pil = b.pil;
    for (const h of haps) {
      if (h.k === 'wall' || h.k === 'top' || h.k === 'pillar' || h.k === 'block' || h.k === 'shield') out.pts.push(h.x, h.y), out.bd.push(d0), out.bk.push(h.k);
      if (h.k === 'block') out.crack++;
      if ((h.k === 'hit' || h.k === 'shard') && h.f) {
        const f = h.f, u = clamp((f.y - YT) / (YI - YT), 0, 1);
        out.hits.push({ id: f.id, k: f.k, n: h.n ?? 0, x: f.x, y: f.y, d: b.dist, urg: u, back: f.k === 'shield', pil });
        if (h.k === 'shard') out.shard++;
      }
      if (h.k === 'chick') (out.chick = true), (out.chickD = b.dist);
      if (h.k === 'bear') out.hits.push({ id: h.f!.id, k: 'bear', n: h.n ?? 0, x: h.x, y: h.y, d: b.dist, urg: 0, back: false, pil });
      pil = pil || h.k === 'pillar';
    }
    F.foes = F.foes.filter((f) => !f.dead);
  }
  out.pts.push(b.x, b.y);
  out.n = b.n;
  out.bossN = b.bossN;
  out.pn = b.pn;
  out.sh = b.sh;
  out.ex = b.x;
  out.ey = b.y;
  out.done = b.done || 'far';
  out.ticks = t;
  return out;
}

function hurtIgloo(s: PengState, f: Foe) {
  if (s.phase !== 'play') return;
  const dmg = f.k === 'bear' ? s.ig : 1;
  s.ig -= dmg;
  s.hurtN += dmg;
  s.mood = 3;
  s.moodT = 60;
  ev(s, 'bonk', f.x, YI, s.ig, KIND_NAME[f.k], { k: f.k, seed: f.seed });
  // 연출: 담에 '쿵' 부딪혀 어질어질 튕겨 나간다 (n = -1)
  s.wrecks.push({ k: f.k, x: f.x, y: YI - 0.01, t: s.t, a: -Math.PI / 2, n: -1, seed: f.seed, face: 1 });
  if (s.ig <= 0) endStage(s, false, f.k === 'bear' ? '대장이 이글루를 깔고 앉았어요' : '이글루가 무너졌어요');
}

function fire(s: PengState, ax: number, ay: number) {
  if (s.phase !== 'play' || s.ammo < 1) return;
  s.ammo--;
  s.cool = COOL;
  s.shots++;
  const b = newBall(++s.nid, ax, ay);
  s.balls.push(b);
  if (s.firstShot < 0) s.firstShot = s.t;
  s.throwT = s.t;
  ev(s, 'throw', PX, PY, 0, '', { a: Math.atan2(b.dy, b.dx) });
}

/** 눈덩이 하나에 일어난 일을 점수·별·연출로 */
function applyHaps(s: PengState, b: Ball, haps: Hap[]) {
  for (const h of haps) {
    switch (h.k) {
      case 'wall':
      case 'top':
        ev(s, 'bounce', h.x, h.y, b.bounces, h.k);
        see(s, 'bounce', '');
        break;
      case 'pillar':
        ev(s, 'pillar', h.x, h.y, b.bounces);
        break;
      case 'block':
        ev(s, 'crack', h.x, h.y);
        break;
      case 'shatter':
        ev(s, 'shatter', h.x, h.y);
        see(s, 'shatter', '');
        break;
      case 'shield':
        ev(s, 'ting', h.x, h.y);
        see(s, 'ting', '방패는 앞에서 튕겨 내요 — 등 뒤나 옆으로!');
        break;
      case 'chick':
        s.chickN++;
        s.pts = Math.max(0, s.pts + PTS.chick);
        ev(s, 'chick', h.x, h.y, 0, '', { seed: h.f?.seed });
        break;
      case 'bear': {
        const f = h.f!;
        s.pts += PTS.bear * (h.n ?? 1);
        f.hurtT = 24;
        s.bossBest = Math.max(s.bossBest, b.bossN);
        ev(s, 'bearhit', f.x, f.y, f.hp);
        see(s, 'bearhit', '');
        multi(s, b, f.x, f.y);
        break;
      }
      case 'hit':
      case 'shard': {
        const f = h.f!, n = h.n ?? 1;
        s.pts += PTS[f.k] * n;
        s.pilBest = Math.max(s.pilBest, b.pn);
        s.shBest = Math.max(s.shBest, b.sh);
        if (h.k === 'shard') s.shardK++;
        if (f.k === 'bear') (s.pts += 300), (s.bossBest = Math.max(s.bossBest, b.bossN));
        const a = Math.atan2(b.dy, b.dx);
        s.wrecks.push({ k: f.k, x: f.x, y: f.y, t: s.t, a, n, seed: f.seed, face: f.vx >= 0 ? 1 : -1 });
        if (s.wrecks.length > 30) s.wrecks.shift();
        ev(s, h.k === 'shard' ? 'shard' : 'hit', f.x, f.y, n, '', { k: f.k, seed: f.seed, a, r: b.r });
        multi(s, b, f.x, f.y);
        break;
      }
    }
  }
}

/** 한 발로 여럿: 멈칫(맞힌 수만큼 길게) · 셋부터 잠깐 느려짐 · 눈덩이 돌려받기 */
function multi(s: PengState, b: Ball, x: number, y: number) {
  const n = b.n;
  s.freeze = Math.max(s.freeze, Math.min(5, 1 + n));
  s.best = Math.max(s.best, n);
  if (n >= 2) see(s, 'grow', '맞힐 때마다 눈덩이가 굴러 커져요!');
  if (n === 3 || n === 6) {
    s.slowT = Math.max(s.slowT, n >= 6 ? 50 : 34);
    if (s.firstBig < 0) s.firstBig = s.t;
    s.ammo = Math.min(s.limited ? 99 : AMMO, s.ammo + 1);
    b.refunds++;
    ev(s, 'refund', x, y, n);
    see(s, 'refund', '한 발로 셋 — 눈덩이 하나를 돌려받아요');
    s.cheerT = s.t;
  }
  if (n >= 3) ev(s, 'multi', x, y, n);
}

function world(s: PengState) {
  s.wt++;
  const spd = ease(s)[1];
  for (const f of s.foes) moveFoe(f, s, spd);
  for (const f of s.foes) {
    if (f.dead) continue;
    if (f.k === 'chick') {
      if ((f.vx < 0 && f.x < XL - 0.1) || (f.vx > 0 && f.x > XR + 0.1)) f.dead = true;
      continue;
    }
    if (f.st === GO && f.y >= YI) {
      f.dead = true;
      hurtIgloo(s, f);
      if (s.phase !== 'play') return;
    }
  }
  const haps: Hap[] = [];
  for (const b of s.balls) {
    if (b.done) continue;
    haps.length = 0;
    ballStep(s, b, haps);
    b.tr.push(b.x, b.y);
    if (b.tr.length > 24) b.tr.splice(0, 2);
    applyHaps(s, b, haps);
    if (b.done) ev(s, b.done === 'chick' ? 'stop' : b.done, b.x, b.y, b.n, '', { r: b.r });
  }
  s.balls = s.balls.filter((b) => !b.done);
  s.foes = s.foes.filter((f) => !f.dead);
  // 첫 판 첫 줄은 첫 눈덩이가 떨어질 때까지 기다려 준다 (손가락 안내 그대로 쏘면 꼭 셋이 맞는다)
  if (s.stage === 0 && ((s.firstShot >= 0 && !s.balls.length) || s.wt > 360)) for (const f of s.foes) if (f.vy === 0 && f.k === 'snow') f.vy = VY.snow;
  if (s.cool > 0) s.cool--;
  if (!s.limited && s.ammo < AMMO) {
    s.reload++;
    if (s.reload >= RELOAD * ease(s)[0]) (s.ammo++), (s.reload = 0), ev(s, 'reload', PX, PY, s.ammo);
  } else s.reload = 0;
  s.waveT++;
  const d = STAGES[s.stage], alive = s.foes.filter((f) => f.k !== 'chick').length;
  if (s.wave < d.waves.length) {
    const w = d.waves[s.wave];
    if ((alive === 0 && s.waveT >= 40) || (alive <= w.need && s.waveT >= 150) || s.waveT >= w.wait) spawnWave(s);
  } else if (alive === 0 && !s.balls.length) endStage(s, true, '');
}

function spawnWave(s: PengState) {
  const d = STAGES[s.stage], w = d.waves[s.wave], instant = s.stage === 0 && s.wave === 0;
  const J = () => (s.stage ? (s.rng() - 0.5) * 0.024 : 0);
  for (const [k, x0, y0, vx0 = 0, delay = 0] of w.foes) {
    const x = clamp((s.flip ? 1 - x0 : x0) + J(), XL + RAD[k], XR - RAD[k]), y = clamp(y0 + J(), YT + 0.04, YI - 0.2);
    const vx = (s.flip ? -vx0 : vx0) * (k === 'chick' ? 1 : 1);
    const cx = k === 'chick' ? (s.flip ? 1 - x0 : x0) : x;
    const id = ++s.nid, seed = Math.floor(s.rng() * 1e6);
    s.foes.push({
      id, k, x: instant || k === 'chick' ? cx : x, y: instant || k === 'chick' ? y0 : YT - 0.05, vx, vy: instant ? 0 : VY[k], hp: k === 'bear' ? BEAR_HP : 1, ph: 0,
      st: instant || k === 'chick' ? GO : ENTER, tm: 0, delay: k === 'chick' ? 0 : delay, ex: x, ey: YT - 0.05, tx: x, ty: y, dizzy: 0, dead: false,
      hurtT: 0, seed: seed % 1000,
    });
    if (!s.spotted.has(k) && k !== 'snow') {
      s.spotted.add(k);
      s.spot = { id, t: s.t, label: KIND_NAME[k] };
    }
    see(s, k, '');
  }
  s.wave++;
  s.waveT = 0;
  ev(s, 'wave', 0.5, YT, s.wave);
}

function newStage(s: PengState) {
  const d = STAGES[s.stage];
  s.flip = s.stage > 0 && s.rng() < 0.5;
  const F = (x: number) => (s.flip ? 1 - x : x);
  s.ig = HP_IG;
  s.limited = !!d.limit;
  s.ammo = d.limit ?? AMMO;
  s.reload = 0;
  s.cool = 0;
  s.queue = null;
  s.down = false;
  s.aim = null;
  s.freeze = 0;
  s.slowT = 0;
  s.foes = [];
  s.balls = [];
  s.pillars = (d.pillars ?? []).map(([x, y, r]) => ({ x: F(x), y, r }));
  s.blocks = (d.blocks ?? []).map(([x, y, r]) => ({ id: ++s.nid, x: F(x), y, r, hp: 2 }));
  s.wave = 0;
  s.waveT = 0;
  s.best = 0;
  s.pilBest = 0;
  s.shBest = 0;
  s.shardK = 0;
  s.hurtN = 0;
  s.chickN = 0;
  s.bossBest = 0;
  s.shots = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = d.stars.map(() => false);
  s.seen.add(d.key);
  if (d.limit) s.seen.add('limit');
  spawnWave(s);
}

function starMet(s: PengState, st: Star): boolean {
  switch (st.k) {
    case 'keep': return true;
    case 'multi': return s.best >= st.n;
    case 'pil': return s.pilBest >= st.n;
    case 'shield': return s.shBest >= st.n;
    case 'shatter': return s.shardK >= st.n;
    case 'nohurt': return s.hurtN === 0;
    case 'save': return s.ammo >= st.n;
    case 'friend': return s.chickN === 0;
    case 'boss': return s.bossBest >= st.n;
    case 'thrift': return s.shots <= st.n;
  }
}
/** 별 줄 옆에 붙는 지금까지 (예: 2/5) */
function starNow(s: PengState, st: Star): string {
  const v = st.k === 'multi' ? s.best : st.k === 'pil' ? s.pilBest : st.k === 'shield' ? s.shBest : st.k === 'shatter' ? s.shardK : st.k === 'boss' ? s.bossBest : st.k === 'save' ? s.ammo : -1;
  return v >= 0 && st.k !== 'save' && v > 0 && v < st.n ? `${v}/${st.n}` : '';
}

function endStage(s: PengState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  s.aim = null;
  s.queue = null;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 2;
    s.moodT = 999;
    s.cheerT = s.t;
    ev(s, 'clear', 0.5, 0.8);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'fail', PX, PY, 0, why);
  }
}

function cosmetic(s: PengState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.wrecks = s.wrecks.filter((c) => s.t - c.t < 90);
  if (s.spot && s.t - s.spot.t > 110) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

export const ricopeng: GameDef<PengState> = {
  id: 'ricopeng',
  name: '도탄 눈덩이 펭귄',
  genes: ['ricochet', 'pointer', 'chain'],
  twist: '한 발이 벽·얼음 기둥에 튕기며 다가오는 적을 줄줄이 꿰뚫는데, 맞힐 때마다 눈덩이가 굴러 커져(눈덩이 효과) 뒤의 적이 더 잘 맞는다 — 셋을 꿰면 눈덩이를 돌려받으니, 적이 한 줄에 설 때까지 기다릴지 지금 쏠지를 실시간으로 고른다',
  rules: [
    '꾹 누르면 눈덩이가 튕길 길이 점선으로 보여요. 떼면 쌩! 벽에 튕기며 길 위의 적을 모두 맞혀요.',
    '맞힐 때마다 눈덩이가 커지고, 한 발로 셋을 맞히면 눈덩이 하나를 돌려받아요.',
    '적이 이글루에 닿으면 이글루 하트 -1, 다 잃으면 하트 -1(그 판 다시). 적을 모두 맞히면 다음 판!',
  ],
  controls: 'touch',
  hint: '꾹 누르면 튕길 길이 보이고, 떼면 쌩! / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '오로라 밤 빙하의 아기 펭귄 — 눈 덮인 디오라마',
    mood: '초록·보라 오로라가 하늘에 흐르고 먼 빙산이 겹겹이 서 있다. 반질반질한 얼음 바닥엔 오로라와 친구들이 비친다. 빨간 목도리 아기 펭귄이 눈덩이를 던지면 벽을 \'통!\' 튕겨 장난꾸러기 눈사람·바다표범을 줄줄이 와르르 — 눈가루가 반짝이며 흩날린다.',
    palette: { bg: '#0b1633', ink: '#f2f8ff', muted: '#8fa6c8', accent: '#7ff0d0', hot: '#ff6b6b', soft: '#1f3563' },
  },
  guard: (s) => s.ig,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, wt: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, won: false, dead: false, again: false, tries: 0,
      ig: HP_IG, ammo: AMMO, reload: 0, cool: 0, queue: null, limited: false,
      down: false, lock: false, aim: null, holdT: 0, freeze: 0, slowT: 0, flip: false,
      foes: [], pillars: [], blocks: [], balls: [], nid: 0, wave: 0, waveT: 0,
      best: 0, pilBest: 0, shBest: 0, shardK: 0, hurtN: 0, chickN: 0, bossBest: 0, shots: 0,
      firstShot: -1, firstBig: -1, firstPress: -1,
      seen: new Set<string>(), spotted: new Set<string>(), newsQ: [], news: null, spot: null, events: [], wrecks: [],
      mood: 0, moodT: 0, throwT: -999, cheerT: -999, bigN: 0,
    } as PengState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    if (s.phase === 'play') {
      if (p) {
        if (!s.down && !s.lock) {
          s.down = true;
          s.holdT = 0;
          if (s.firstPress < 0) s.firstPress = s.t;
        }
        if (s.down) (s.aim = { x: clamp(p.x, 0, 1), y: clamp(p.y * A, 0, A) }), s.holdT++;
      } else {
        if (s.down && s.aim) {
          if (Math.hypot(s.aim.x - PX, s.aim.y - PY) < 0.06) ev(s, 'cancel', PX, PY);
          else if (s.ammo < 1) ev(s, 'empty', PX, PY);
          else s.queue = { ...s.aim };
        }
        s.down = false;
        s.lock = false;
        s.aim = null;
      }
      if (s.queue && s.cool <= 0) fire(s, s.queue.x, s.queue.y), (s.queue = null);
    } else {
      s.down = false;
      s.aim = null;
      s.lock = !!p;
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
    if (s.freeze > 0) s.freeze--;
    else if (s.slowT > 0 && (s.slowT--, s.t % 2 === 0)) {
      /* 큰 순간: 한 틱 걸러 한 번만 움직인다 (미리 보기와 어긋나지 않게 틱을 건너뛴다) */
    } else world(s);
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
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
/** 각도 → 손가락 자리 (펭귄에서 0.4 떨어진 곳) */
const aimAt = (a: number) => at(PX + Math.cos(a) * 0.4, PY + Math.sin(a) * 0.4);
const LEAD = 3;
const ANGLES = (n: number) => [...Array(n).keys()].map((i) => -Math.PI + AMIN + ((Math.PI - 2 * AMIN) * (i + 0.5)) / n);

/** 이글루에 닿기까지 남은 틱 (가장 급한 적) */
function urgency(s: PengState) {
  let T = 1e9, id = -1;
  const spd = ease(s)[1];
  for (const f of s.foes) {
    if (f.k === 'chick') continue;
    const v = f.vy * spd * (f.k === 'seal' || f.k === 'shield' ? 0.82 : 1), tt = (YI - f.y) / Math.max(1e-6, v) + (f.st === ENTER ? ENTER_T + f.delay : 0);
    if (tt < T) (T = tt), (id = f.id);
  }
  return { T, id };
}

interface Pick { a: number; v: number; sim: Sim; obj: number }
function judge(s: PengState, a: number): Pick {
  const d = STAGES[s.stage], sim = simulate(s, PX + Math.cos(a) * 0.4, PY + Math.sin(a) * 0.4, LEAD);
  let v = 0, obj = 0;
  for (const h of sim.hits) v += (PTS[h.k] || 10) * h.n + 50 * h.urg * h.urg;
  const has = (k: StarK) => d.stars.some((q) => q.k === k);
  if (has('shield') && s.shBest < 2 && sim.sh >= 2) obj += 160;
  if (has('pil') && s.pilBest < 4 && sim.pn >= 4) obj += 160;
  if (has('boss') && s.bossBest < 3 && sim.bossN >= 3) obj += 300;
  if (has('shatter') && s.shardK < 3) obj += 70 * sim.shard + 40 * sim.crack;
  if (sim.bossN >= 2) obj += 60 * sim.bossN;
  // 별 '한 발로 대장 세 번'을 노리는 동안엔 대장을 조금씩 깎지 않는다
  if (has('boss') && s.bossBest < 3 && sim.bossN > 0 && sim.bossN < 3) v -= 260;
  if (sim.chick) v -= 3000;
  return { a, v: v + obj, sim, obj };
}

function shotList(s: PengState, n = 30): Pick[] {
  const all: Pick[] = [];
  let best: Pick | null = null;
  for (const a of ANGLES(n)) {
    const j = judge(s, a);
    all.push(j);
    if (!best || j.v > best.v) best = j;
  }
  if (!best) return all;
  const step = (Math.PI - 2 * AMIN) / n;
  for (const o of [-0.5, -0.25, 0.25, 0.5]) {
    const a = best.a + o * step;
    if (a > -Math.PI + AMIN && a < -AMIN) all.push(judge(s, a));
  }
  void 0;
  return all;
}

const waitMem = new WeakMap<object, { since: number; key: string; next: number }>();
/**
 * 봇: 각도 36개(+다듬기)를 실제와 같은 시뮬레이션으로 모두 던져 보고(맞힐 수·급한 적·판 목표·친구 피하기) 고른다.
 * 급하지 않으면 줄이 설 때까지 기다린다(눈덩이 아끼기 별·개수 제한 판에선 더 오래).
 */
export const ricopengSmart: Bot<PengState> = {
  name: '줄 설 때 꿰기',
  act(s) {
    if (s.phase !== 'play' || s.down) return NO;
    if (s.ammo < 1 || s.cool > 0 || s.queue) return NO;
    const live = s.foes.filter((f) => f.k !== 'chick' && f.st === GO);
    if (!live.length) return NO;
    const key = `${s.stage}:${s.wave}:${s.tries}:${live.length}`;
    let m = waitMem.get(s);
    if (!m || m.key !== key) waitMem.set(s, (m = { since: s.t, key, next: 0 }));
    if (s.t < m.next) return NO;
    const waited = s.t - m.since, d = STAGES[s.stage];
    const has = (k: StarK) => d.stars.find((q) => q.k === k);
    const all = shotList(s);
    let best: Pick | null = null;
    for (const j of all) if (!best || j.v > best.v) best = j;
    if (!best || best.sim.n === 0 || best.sim.chick) return (m.next = s.t + 8), NO;
    const { T, id } = urgency(s);
    if (T < 150) {
      let pick: Pick | null = null;
      for (const j of all) if (!j.sim.chick && j.sim.hits.some((q) => q.id === id) && (!pick || j.v > pick.v)) pick = j;
      return aimAt((pick ?? best).a);
    }
    const mu = has('multi'), thrift = !!has('thrift') || s.limited, chase = !!mu && s.best < mu.n;
    let want = chase ? mu.n : 3;
    want = Math.min(want, live.length + (s.wave < d.waves.length ? 2 : 0));
    const n = best.sim.n, full = !s.limited && s.ammo >= AMMO;
    // 별 '한 발로 대장 세 번': 대장이 내려와 벽 사이에서 여러 번 꿰일 자리가 날 때까지 대장은 아껴 둔다
    const boss = has('boss'), bear = s.foes.find((f) => f.k === 'bear' && f.st === GO);
    if (boss && bear && s.bossBest < 3 && best.sim.bossN > 0 && best.sim.bossN < 3 && T > 260) {
      let alt: Pick | null = null;
      for (const j of all) if (j.sim.bossN === 0 && j.sim.n > 0 && !j.sim.chick && (!alt || j.v > alt.v)) alt = j;
      if (alt && (alt.sim.n >= 2 || waited > 200)) return aimAt(alt.a);
      return (m.next = s.t + 8), NO;
    }
    if (n >= want || best.obj >= 150) return aimAt(best.a);
    // 별 '한 발로 n': 급하지 않으면 눈덩이가 가득이어도 줄이 다 설 때까지 참는다
    if (chase && T > 240 && waited < 540) return (m.next = s.t + 8), NO;
    if (thrift) {
      if (n >= 3 || (waited > 300 && n >= 2) || waited > 600) return aimAt(best.a);
      return (m.next = s.t + 8), NO;
    }
    if (full && n >= 2 && waited > 60) return aimAt(best.a);
    if (n >= 2 && waited > 200) return aimAt(best.a);
    if (waited > 360) return aimAt(best.a);
    m.next = s.t + 8;
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 아무 데나 꾹 눌렀다 뗀다 */
export const ricopengRandom: Bot<PengState> = {
  name: '아무 데나 휙',
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
    m.hold = 2 + Math.floor(rng() * 30);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

/** 버릇 봇: 눈덩이가 있으면 늘 가장 가까운 적에 곧장 (튕기기·기다리기·아끼기 없음) */
export const ricopengHabit: Bot<PengState> = {
  name: '늘 가장 가까운 적에 곧장',
  act(s) {
    if (s.phase !== 'play' || s.down || s.ammo < 1 || s.cool > 0 || s.queue) return NO;
    let best: Foe | null = null, bd = 1e9;
    for (const f of s.foes) {
      if (f.st !== GO || f.k === 'chick') continue;
      const d = Math.hypot(f.x - PX, f.y - PY);
      if (d < bd) (bd = d), (best = f);
    }
    return best ? at(best.x, best.y) : NO;
  },
};

/** 독립 버릇 봇: 눈덩이가 있으면 늘 지금 가장 많이 맞히는 쪽으로 바로 (기다리기·판 목표·친구 피하기 없음) */
export const ricopengHabit2: Bot<PengState> = {
  name: '늘 가장 많이 맞히는 쪽으로 바로',
  act(s) {
    if (s.phase !== 'play' || s.down || s.ammo < 1 || s.cool > 0 || s.queue) return NO;
    let best: { a: number; n: number } | null = null;
    for (const a of ANGLES(36)) {
      const n = simulate(s, PX + Math.cos(a) * 0.4, PY + Math.sin(a) * 0.4, LEAD).n;
      if (!best || n > best.n) best = { a, n };
    }
    return best && best.n > 0 ? aimAt(best.a) : NO;
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
type C2 = CanvasRenderingContext2D;
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
/** 눈송이 (판 메달·눈덩이 아이콘 장식) */
function flakePath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3, cx = Math.cos(a), cy = Math.sin(a);
    ctx.moveTo(x, y);
    ctx.lineTo(x + cx * r, y + cy * r);
    for (const sd of [-1, 1]) {
      const b = a + sd * 0.6;
      ctx.moveTo(x + cx * r * 0.6, y + cy * r * 0.6);
      ctx.lineTo(x + cx * r * 0.6 + Math.cos(b) * r * 0.3, y + cy * r * 0.6 + Math.sin(b) * r * 0.3);
    }
  }
}
/** 펄럭이는 띠 (목도리 꼬리) */
function ribbon(ctx: C2, x0: number, y0: number, len: number, wd: number, t: number, ph: number, col: string, dir: number) {
  const pts: number[][] = [];
  for (let i = 0; i <= 6; i++) {
    const u = i / 6;
    pts.push([x0 + dir * len * u, y0 + len * 0.35 * u + Math.sin(t * 0.16 + ph + u * 4) * wd * 1.2 * u]);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [c, lw] of [[OUT, wd + 2.2], [col, wd]] as [string, number][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}
const OUT = '#16223f';

// ── 판(장소)별 팔레트: 0 초록 오로라 · 1 보라 오로라 · 2 청록·분홍 · 3 붉은 오로라(대장) ──
const PAL = [
  { sky: ['#030920', '#0b1c4a', '#1f3f78'], au: ['107,255,200', '79,216,255'], far: ['#1d3767', '#2f5590', '#5b86c0'], ice: ['#2f5f9a', '#4f86c0', '#7fb3df'], tint: '120,255,210' },
  { sky: ['#06051d', '#18144a', '#36327e'], au: ['185,139,255', '93,252,210'], far: ['#252f6a', '#38489a', '#6a79c8'], ice: ['#3a5aa6', '#5b7fc8', '#89a9e4'], tint: '190,150,255' },
  { sky: ['#020e1b', '#0a2b44', '#1a4e6c'], au: ['93,255,176', '255,139,216'], far: ['#16425e', '#24637f', '#4f93b0'], ice: ['#256a8f', '#3f8db5', '#72b7d8'], tint: '120,255,200' },
  { sky: ['#0a0517', '#220f38', '#452255'], au: ['255,122,184', '127,255,240'], far: ['#33204f', '#4c3270', '#7b5aa0'], ice: ['#46508f', '#6b77bb', '#9aa5dc'], tint: '255,150,200' },
];
const HZ = YT - 0.1;
const GB = 1.31;

interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; floor: HTMLCanvasElement; yard: HTMLCanvasElement }
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
/** 빙산 실루엣 한 줄 */
function bergs(g: C2, w: number, base: number, hgt: number, n: number, seed: number, col: string, hi: string) {
  let x = -w * 0.1;
  for (let k = 0; k < n; k++) {
    const bw = w * (0.18 + hsh(seed + k) * 0.22), bh = hgt * (0.45 + hsh(seed + k * 3) * 0.55), px = x + bw * (0.3 + hsh(seed + k * 7) * 0.4);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x, base);
    g.lineTo(x + bw * 0.12, base - bh * 0.55);
    g.lineTo(px - bw * 0.1, base - bh * 0.9);
    g.lineTo(px, base - bh);
    g.lineTo(px + bw * 0.14, base - bh * 0.78);
    g.lineTo(x + bw * 0.88, base - bh * 0.35);
    g.lineTo(x + bw, base);
    g.closePath();
    g.fill();
    // 빛 받는 면
    g.fillStyle = hi;
    g.beginPath();
    g.moveTo(px, base - bh);
    g.lineTo(px + bw * 0.14, base - bh * 0.78);
    g.lineTo(x + bw * 0.88, base - bh * 0.35);
    g.lineTo(x + bw, base);
    g.lineTo(px + bw * 0.05, base);
    g.closePath();
    g.fill();
    x += bw * 0.78;
  }
}
function getBg(w: number, h: number, place: number, sc: number): Bg {
  const key = `${w}x${h}:${place}:${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const P = PAL[place], R = (r: number) => r * w;
  const sky = layer(w, R(HZ) + R(0.06), sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, R(HZ), [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, R(HZ) + R(0.06));
    for (let k = 0; k < 80; k++) {
      g.globalAlpha = 0.25 + hsh(k * 3.1) * 0.65;
      g.fillStyle = k % 9 ? '#e3ecff' : '#fff0c0';
      const r = k % 7 ? 0.6 : 1.2;
      g.beginPath();
      g.arc(hsh(k * 1.7) * w, hsh(k * 2.9) * R(HZ) * 0.95, r, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    // 초승달
    const mx = R(0.82), my = R(0.15), mr = R(0.035);
    g.fillStyle = radg(g, mx, my, 0, mr * 4, [0, 'rgba(255,250,220,.25)'], [1, 'rgba(255,250,220,0)']);
    g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    g.fillStyle = '#fff6da';
    g.beginPath();
    g.arc(mx, my, mr, 0, TAU);
    g.fill();
    g.fillStyle = P.sky[1];
    g.beginPath();
    g.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.88, 0, TAU);
    g.fill();
  });
  const far = layer(w * 1.2, R(0.2), sc, (g) => {
    bergs(g, w * 1.2, R(0.2), R(0.15), 9, 11 + place, P.far[0], P.far[1]);
    bergs(g, w * 1.2, R(0.2), R(0.1), 9, 37 + place, P.far[1], P.far[2]);
    // 바다 위 빛
    g.fillStyle = lin(g, 0, R(0.17), 0, R(0.2), [0, 'rgba(255,255,255,0)'], [1, 'rgba(200,230,255,.25)']);
    g.fillRect(0, R(0.17), w * 1.2, R(0.03));
  });
  const floor = layer(w, h, sc, (g) => {
    // 얼음 바닥
    g.fillStyle = lin(g, 0, R(YT), 0, R(YI + 0.1), [0, P.ice[0]], [0.5, P.ice[1]], [1, P.ice[2]]);
    g.fillRect(0, R(YT), w, R(YI + 0.2 - YT));
    // 얼음 속: 갇힌 물고기·공기방울·밝은 얼음 조각 (깊이감)
    for (let k = 0; k < 7; k++) {
      const x = R(XL + 0.08 + hsh(k * 8.3) * 0.7), y = R(YT + 0.1 + hsh(k * 4.9) * 0.55), sz = R(0.022 + hsh(k) * 0.012), dir = hsh(k * 3) < 0.5 ? -1 : 1;
      g.fillStyle = 'rgba(15,40,90,.22)';
      ell(g, x, y, sz, sz * 0.42);
      g.fill();
      g.beginPath();
      g.moveTo(x - dir * sz * 0.9, y);
      g.lineTo(x - dir * sz * 1.5, y - sz * 0.35);
      g.lineTo(x - dir * sz * 1.5, y + sz * 0.35);
      g.closePath();
      g.fill();
    }
    for (let k = 0; k < 30; k++) {
      g.strokeStyle = 'rgba(220,240,255,.28)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(R(XL + 0.03 + hsh(k * 2.3) * 0.82), R(YT + 0.05 + hsh(k * 6.1) * 0.62), 1 + hsh(k) * 2.2, 0, TAU);
      g.stroke();
    }
    for (let k = 0; k < 6; k++) {
      const x = R(XL + 0.1 + hsh(k * 11.7) * 0.68), y = R(YT + 0.08 + hsh(k * 3.7) * 0.58);
      g.fillStyle = radg(g, x, y, 0, R(0.12), [0, 'rgba(190,230,255,.22)'], [1, 'rgba(190,230,255,0)']);
      ell(g, x, y, R(0.14), R(0.05));
      g.fill();
    }
    // 반질반질 줄무늬(원근)
    for (let k = 0; k < 14; k++) {
      const y = R(YT + (YI - YT) * Math.pow((k + 0.5) / 14, 1.2));
      g.strokeStyle = `rgba(255,255,255,${0.05 + 0.05 * (k % 3 === 0 ? 1 : 0)})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(R(XL), y);
      g.quadraticCurveTo(w / 2, y + R(0.006), R(XR), y);
      g.stroke();
    }
    // 스케이트 자국
    g.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const x0 = R(XL + 0.05 + hsh(k * 5.3) * 0.75), y0 = R(YT + 0.06 + hsh(k * 2.1) * 0.55), L = R(0.08 + hsh(k) * 0.12), bend = (hsh(k * 9) - 0.5) * L;
      g.strokeStyle = 'rgba(255,255,255,.22)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x0 + L * 0.5, y0 + bend * 0.4, x0 + L, y0 + bend * 0.2);
      g.stroke();
    }
    // 금
    for (let k = 0; k < 5; k++) {
      let x = R(XL + 0.08 + hsh(k * 13.1) * 0.7), y = R(YT + 0.1 + hsh(k * 7.7) * 0.5);
      g.strokeStyle = 'rgba(30,60,110,.28)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += R(0.02 + hsh(k * 3 + j) * 0.03) * (hsh(k + j * 5) < 0.5 ? -1 : 1);
        y += R(0.01 + hsh(k * 5 + j) * 0.02);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // 가장자리 눈가루
    for (let k = 0; k < 26; k++) {
      const side = k % 2, x = side ? R(XR - 0.01 - hsh(k) * 0.05) : R(XL + 0.01 + hsh(k) * 0.05), y = R(YT + hsh(k * 3.3) * (YI - YT));
      g.fillStyle = 'rgba(240,248,255,.35)';
      ell(g, x, y, R(0.02 + hsh(k * 2) * 0.025), R(0.008 + hsh(k * 4) * 0.008));
      g.fill();
    }
    // 위 빙벽 (튕기는 벽): 얼음 절벽 + 굴 셋 + 눈 지붕 + 고드름
    const cy0 = R(HZ), cy1 = R(YT);
    g.fillStyle = lin(g, 0, cy0, 0, cy1, [0, '#e6f4ff'], [0.25, '#9cc6ec'], [1, '#5f8fc4']);
    g.fillRect(0, cy0, w, cy1 - cy0);
    for (let k = 0; k < 18; k++) {
      const x = R(hsh(k * 4.1)), wd = R(0.02 + hsh(k) * 0.05);
      g.fillStyle = `rgba(255,255,255,${0.1 + hsh(k * 2) * 0.15})`;
      g.fillRect(x, cy0 + R(0.02), wd * 0.25, cy1 - cy0 - R(0.02));
      g.fillStyle = 'rgba(40,80,140,.15)';
      g.fillRect(x + wd * 0.3, cy0 + R(0.03), wd * 0.15, cy1 - cy0 - R(0.03));
    }
    for (const cx of [0.2, 0.5, 0.8]) {
      const gx = R(cx), gw2 = R(0.07), top = cy0 + R(0.035);
      g.fillStyle = lin(g, 0, top, 0, cy1, [0, '#0c1a3a'], [1, '#22406e']);
      g.beginPath();
      g.moveTo(gx - gw2, cy1);
      g.lineTo(gx - gw2, top + gw2 * 0.6);
      g.quadraticCurveTo(gx - gw2, top, gx, top);
      g.quadraticCurveTo(gx + gw2, top, gx + gw2, top + gw2 * 0.6);
      g.lineTo(gx + gw2, cy1);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(230,245,255,.7)';
      g.lineWidth = 2;
      g.stroke();
    }
    // 눈 지붕
    g.fillStyle = '#f4f9ff';
    g.beginPath();
    g.moveTo(0, cy0 + R(0.02));
    for (let k = 0; k <= 12; k++) g.quadraticCurveTo(R((k - 0.5) / 12), cy0 - R(0.02 + hsh(k) * 0.015), R(k / 12), cy0 + R(0.012 + hsh(k * 3) * 0.01));
    g.lineTo(w, cy0 - R(0.04));
    g.lineTo(0, cy0 - R(0.04));
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 40; k++) {
      const x = R(hsh(k * 6.1)), L = R(0.012 + hsh(k * 2.7) * 0.03);
      if (Math.abs(x / w - 0.2) < 0.07 || Math.abs(x / w - 0.5) < 0.07 || Math.abs(x / w - 0.8) < 0.07) continue;
      g.fillStyle = 'rgba(235,248,255,.95)';
      g.beginPath();
      g.moveTo(x - R(0.006), cy0 + R(0.015));
      g.lineTo(x + R(0.006), cy0 + R(0.015));
      g.lineTo(x, cy0 + R(0.015) + L);
      g.closePath();
      g.fill();
    }
    // 가장자리 어둡게 (비네트)
    g.fillStyle = lin(g, R(XL), 0, R(XL + 0.14), 0, [0, 'rgba(10,25,60,.28)'], [1, 'rgba(10,25,60,0)']);
    g.fillRect(R(XL), R(YT), R(0.14), R(YI - YT));
    g.fillStyle = lin(g, R(XR), 0, R(XR - 0.14), 0, [0, 'rgba(10,25,60,.28)'], [1, 'rgba(10,25,60,0)']);
    g.fillRect(R(XR - 0.14), R(YT), R(0.14), R(YI - YT));
    // 빙벽 아래 그늘
    g.fillStyle = lin(g, 0, cy1, 0, cy1 + R(0.06), [0, 'rgba(10,30,70,.35)'], [1, 'rgba(10,30,70,0)']);
    g.fillRect(0, cy1, w, R(0.06));
    // 양옆 눈둑 (튕기는 벽): 위는 눈, 얼음판 쪽은 파란 그늘 면
    for (const sd of [-1, 1]) {
      const edge = sd < 0 ? R(XL) : R(XR), face = R(0.022), outer = sd < 0 ? 0 : w;
      g.fillStyle = lin(g, outer, 0, edge, 0, [0, '#dfeeff'], [1, '#f6fbff']);
      g.beginPath();
      g.moveTo(outer, cy1 - R(0.03));
      g.lineTo(edge - sd * face, cy1 - R(0.01));
      for (let k = 0; k <= 10; k++) g.lineTo(edge - sd * face + sd * R(hsh(k + sd * 5) * 0.006), R(YT + (YI + 0.12 - YT) * (k / 10)));
      g.lineTo(outer, R(YI + 0.14));
      g.closePath();
      g.fill();
      g.fillStyle = lin(g, edge - sd * face, 0, edge, 0, [0, '#a9c8ea'], [1, '#6f9ccc']);
      g.beginPath();
      g.moveTo(edge - sd * face, cy1 - R(0.01));
      g.lineTo(edge, cy1);
      g.lineTo(edge, R(YI + 0.12));
      g.lineTo(edge - sd * face, R(YI + 0.12));
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(edge - sd * face, cy1 - R(0.01));
      g.lineTo(edge - sd * face, R(YI + 0.12));
      g.stroke();
      for (let k = 0; k < 8; k++) {
        g.fillStyle = 'rgba(120,160,210,.35)';
        ell(g, outer + sd * -R(0.012 + hsh(k * 3 + sd) * 0.02), R(YT + 0.05 + k * 0.085), R(0.012), R(0.006));
        g.fill();
      }
    }
  });
  const yard = layer(w, h - R(YI) + R(0.02), sc, (g) => {
    const top = 0, H = h - R(YI) + R(0.02);
    g.fillStyle = lin(g, 0, top, 0, H, [0, '#e9f3ff'], [1, '#c6dbf3']);
    g.beginPath();
    g.moveTo(0, top + R(0.02));
    for (let k = 0; k <= 10; k++) g.quadraticCurveTo(R((k - 0.5) / 10), top - R(0.004 + hsh(k * 2) * 0.012), R(k / 10), top + R(0.01));
    g.lineTo(w, H);
    g.lineTo(0, H);
    g.closePath();
    g.fill();
    // 눈 벽돌 담 (이글루 마당 경계)
    for (let k = 0; k < 14; k++) {
      const bx = R(XL + k * 0.064), bw = R(0.058);
      if (bx + bw > R(XR) + 1) break;
      if (Math.abs(bx + bw / 2 - w / 2) < R(0.12)) continue;
      g.fillStyle = lin(g, 0, top, 0, top + R(0.035), [0, '#ffffff'], [1, '#b8d0ec']);
      rr(g, bx, top - R(0.012), bw, R(0.035), R(0.008));
      g.fill();
      g.strokeStyle = 'rgba(70,110,170,.45)';
      g.lineWidth = 1;
      g.stroke();
    }
    for (let k = 0; k < 16; k++) {
      g.fillStyle = 'rgba(150,185,225,.35)';
      ell(g, R(hsh(k * 7.3)), R(0.06 + hsh(k * 3.1) * 0.15), R(0.03 + hsh(k) * 0.03), R(0.006));
      g.fill();
    }
  });
  const out = { sky, far, floor, yard };
  BG.set(key, out);
  return out;
}

/** 오로라 커튼 (매 프레임 흐른다) */
function aurora(ctx: C2, w: number, t: number, P: (typeof PAL)[number], k: number) {
  const R = (r: number) => r * w;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 3; b++) {
    const base = R(0.13 + b * 0.05), amp = R(0.03 + b * 0.012), col = b === 1 ? P.au[1] : P.au[0], tall = R(0.09 - b * 0.015);
    const g = ctx.createLinearGradient(0, base - tall, 0, base + tall * 0.6);
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.55, `rgba(${col},${(0.22 - b * 0.04) * k})`);
    g.addColorStop(0.8, `rgba(${col},${(0.4 - b * 0.08) * k})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * w * 1.1 - w * 0.05, y = base + Math.sin(i * 0.55 + t * (0.012 + b * 0.004) + b * 2) * amp + Math.sin(i * 1.3 - t * 0.02) * amp * 0.3;
      if (i) ctx.lineTo(x, y - tall);
      else ctx.moveTo(x, y - tall);
    }
    for (let i = N; i >= 0; i--) {
      const x = (i / N) * w * 1.1 - w * 0.05, y = base + Math.sin(i * 0.55 + t * (0.012 + b * 0.004) + b * 2) * amp + Math.sin(i * 1.3 - t * 0.02) * amp * 0.3;
      ctx.lineTo(x, y + tall * 0.6);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** 아기 펭귄 (주인공). pose: 0 서기 1 겨누기 2 던지기 3 깜짝 4 어질 5 만세 · aim = 겨눈 각도 */
function drawPeng(ctx: C2, k: number, pose: number, t: number, aim: number, ammo: boolean, sub = 0) {
  const breath = 1 + Math.sin(t * 0.09) * 0.02;
  const lean = pose === 1 || pose === 2 ? clamp(Math.cos(aim) * 0.35, -0.3, 0.3) * (pose === 2 ? 1.3 : 0.7) : pose === 4 ? Math.sin(t * 0.2) * 0.15 : 0;
  const hop = pose === 5 ? Math.abs(Math.sin(t * 0.18)) * k * 0.12 : 0;
  ctx.save();
  // 그림자
  ctx.fillStyle = 'rgba(10,25,60,.35)';
  ell(ctx, 0, 0, k * 0.32, k * 0.08);
  ctx.fill();
  ctx.translate(0, -hop);
  // 발
  ctx.fillStyle = '#ff9a2f';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.025);
  for (const sd of [-1, 1]) {
    ell(ctx, sd * k * 0.12, -k * 0.02, k * 0.1, k * 0.045, sd * 0.15);
    ctx.fill();
    ctx.stroke();
  }
  ctx.rotate(lean * 0.4);
  const sy = pose === 2 ? 1.08 : breath, sx = pose === 2 ? 0.93 : 2 - breath;
  ctx.scale(sx, sy);
  // 몸 (등 = 남색, 배 = 흰색)
  const bx = 0, by = -k * 0.43;
  ctx.fillStyle = lin(ctx, -k * 0.3, by - k * 0.4, k * 0.3, by + k * 0.4, [0, '#3a4d78'], [0.5, '#24335a'], [1, '#141e38']);
  ell(ctx, bx, by, k * 0.31, k * 0.43);
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, k * 0.03);
  ctx.stroke();
  // 날개 (지느러미)
  const flapIdle = Math.sin(t * 0.09) * 0.08;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * k * 0.27, by - k * 0.02);
    let rot = sd * (0.35 + flapIdle);
    const throwing = (pose === 1 || pose === 2) && sd === (Math.cos(aim) >= 0 ? 1 : -1);
    if (pose === 1 && throwing) rot = sd * -2.3;
    if (pose === 2 && throwing) rot = sd * -1.0 + Math.sin(sub * 0.5) * 0.2;
    if (pose === 5) rot = sd * (-2.2 + Math.sin(t * 0.4) * 0.4);
    if (pose === 3) rot = sd * -1.4;
    if (pose === 4) rot = sd * (0.9 + Math.sin(t * 0.3 + sd) * 0.3);
    ctx.rotate(rot);
    ctx.fillStyle = lin(ctx, 0, 0, 0, k * 0.3, [0, '#2c3d66'], [1, '#18233f']);
    ell(ctx, 0, k * 0.14, k * 0.075, k * 0.17);
    ctx.fill();
    ctx.stroke();
    if (pose === 1 && throwing && ammo) {
      // 머리 위로 든 눈덩이
      ctx.fillStyle = radg(ctx, -k * 0.03, k * 0.31, 0, k * 0.11, [0, '#ffffff'], [0.7, '#e6f1fd'], [1, '#a9c8ea']);
      ctx.beginPath();
      ctx.arc(0, k * 0.33, k * 0.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#6b8fbf';
      ctx.lineWidth = Math.max(1, k * 0.02);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 배
  ctx.fillStyle = lin(ctx, 0, by - k * 0.2, 0, by + k * 0.4, [0, '#ffffff'], [1, '#d8e6f6']);
  ell(ctx, 0, by + k * 0.08, k * 0.21, k * 0.31);
  ctx.fill();
  // 얼굴 흰 테
  ctx.fillStyle = '#ffffff';
  ell(ctx, -k * 0.095, by - k * 0.2, k * 0.1, k * 0.09);
  ctx.fill();
  ell(ctx, k * 0.095, by - k * 0.2, k * 0.1, k * 0.09);
  ctx.fill();
  // 목도리
  ctx.fillStyle = lin(ctx, 0, by - k * 0.08, 0, by + k * 0.02, [0, '#ff5a64'], [1, '#c92a3c']);
  rr(ctx, -k * 0.27, by - k * 0.08, k * 0.54, k * 0.1, k * 0.05);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.022);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = Math.max(1, k * 0.016);
  for (const sx2 of [-0.15, -0.05, 0.05, 0.15]) {
    ctx.beginPath();
    ctx.moveTo(k * sx2, by - k * 0.07);
    ctx.lineTo(k * (sx2 + 0.02), by + k * 0.01);
    ctx.stroke();
  }
  ribbon(ctx, k * 0.18, by - k * 0.02, k * 0.3, Math.max(2, k * 0.06), t, 0, '#e8434f', 1);
  // 눈
  const ey = by - k * 0.2;
  if (pose === 4) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.2, k * 0.025);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < 9; a++) {
        const rr2 = k * 0.006 * a, an = a * 0.9 + t * 0.2;
        const px = sd * k * 0.095 + Math.cos(an) * rr2, py = ey + Math.sin(an) * rr2;
        if (a) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  } else if (pose === 5) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.5, k * 0.03);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * k * 0.095, ey + k * 0.02, k * 0.045, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    const blink = pose === 0 && Math.sin(t * 0.023) > 0.985;
    const look = pose === 1 || pose === 2 ? Math.cos(aim) * k * 0.025 : 0, lookY = pose === 1 || pose === 2 ? Math.sin(aim) * k * 0.02 : 0;
    for (const sd of [-1, 1]) {
      const ex = sd * k * 0.095;
      if (blink) {
        ctx.strokeStyle = OUT;
        ctx.lineWidth = Math.max(1.2, k * 0.025);
        ctx.beginPath();
        ctx.moveTo(ex - k * 0.04, ey);
        ctx.lineTo(ex + k * 0.04, ey);
        ctx.stroke();
        continue;
      }
      const big = pose === 3 ? 1.2 : 1;
      ctx.fillStyle = '#10152a';
      ell(ctx, ex + look, ey + lookY, k * 0.042 * big, k * 0.052 * big);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + look - k * 0.014, ey + lookY - k * 0.02, k * 0.016 * big, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + look + k * 0.012, ey + lookY + k * 0.016, k * 0.007, 0, TAU);
      ctx.fill();
    }
    if (pose === 1) {
      // 힘줌: 눈썹
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1, k * 0.02);
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sd * k * 0.14, ey - k * 0.075);
        ctx.lineTo(sd * k * 0.05, ey - k * 0.06);
        ctx.stroke();
      }
    }
  }
  // 볼터치
  ctx.fillStyle = 'rgba(255,120,150,.55)';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * k * 0.15, ey + k * 0.06, k * 0.045, k * 0.025);
    ctx.fill();
  }
  // 부리
  ctx.fillStyle = lin(ctx, 0, ey, 0, ey + k * 0.09, [0, '#ffc04a'], [1, '#ff8a1e']);
  ctx.beginPath();
  if (pose === 5 || pose === 3) {
    ctx.moveTo(-k * 0.045, ey + k * 0.035);
    ctx.lineTo(k * 0.045, ey + k * 0.035);
    ctx.lineTo(0, ey + k * 0.075);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ell(ctx, 0, ey + k * 0.085, k * 0.03, k * 0.02);
    ctx.fill();
  } else {
    ctx.moveTo(-k * 0.045, ey + k * 0.035);
    ctx.quadraticCurveTo(0, ey + k * 0.02, k * 0.045, ey + k * 0.035);
    ctx.lineTo(0, ey + k * 0.085);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1, k * 0.018);
    ctx.stroke();
  }
  if (pose === 3) {
    // 땀방울
    ctx.fillStyle = '#9fe0ff';
    ctx.beginPath();
    ctx.moveTo(k * 0.27, ey - k * 0.12);
    ctx.quadraticCurveTo(k * 0.31, ey - k * 0.03, k * 0.27, ey - k * 0.02);
    ctx.quadraticCurveTo(k * 0.23, ey - k * 0.03, k * 0.27, ey - k * 0.12);
    ctx.fill();
  }
  ctx.restore();
  if (pose === 4)
    for (let j = 0; j < 3; j++) {
      const an = t * 0.12 + (j * TAU) / 3;
      ctx.fillStyle = '#ffe66b';
      starPath(ctx, Math.cos(an) * k * 0.28, -k * 0.95 + Math.sin(an) * k * 0.07, k * 0.05);
      ctx.fill();
    }
}

/** 장난꾸러기 눈사람 (발 = 0,0) */
function drawSnowman(ctx: C2, k: number, t: number, seed: number, mood: number) {
  const bob = Math.sin(t * 0.12 + seed) * k * 0.015, sway = Math.sin(t * 0.07 + seed) * 0.05;
  const hats = ['#3fb6a8', '#a46bff', '#ffcc3a', '#ff6b8b'], hat = hats[seed % 4];
  ctx.save();
  ctx.rotate(sway * 0.5);
  const ball = (y: number, r: number) => {
    ctx.fillStyle = radg(ctx, -r * 0.35, y - r * 0.4, r * 0.1, r * 1.3, [0, '#ffffff'], [0.6, '#eaf3fd'], [1, '#a9c3e3']);
    ctx.beginPath();
    ctx.arc(0, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#5a7aa8';
    ctx.lineWidth = Math.max(1, k * 0.025);
    ctx.stroke();
  };
  ball(-k * 0.22, k * 0.24);
  // 팔 (나뭇가지)
  ctx.strokeStyle = '#6b4424';
  ctx.lineWidth = Math.max(1.5, k * 0.035);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const wave = Math.sin(t * 0.15 + seed + sd) * 0.3 + (mood ? -0.5 : 0);
    const ax = sd * k * 0.16, ay = -k * 0.52, ex = ax + sd * k * 0.26, ey = ay - k * (0.12 + wave * 0.15);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ex, ey);
    ctx.moveTo(ax + sd * k * 0.16, ay - k * 0.06 - wave * k * 0.08);
    ctx.lineTo(ax + sd * k * 0.2, ay - k * 0.16 - wave * k * 0.1);
    ctx.stroke();
  }
  ball(-k * 0.52 + bob, k * 0.18);
  // 단추
  ctx.fillStyle = '#28303f';
  for (const yy of [-0.46, -0.56]) {
    ctx.beginPath();
    ctx.arc(0, k * yy + bob, k * 0.022, 0, TAU);
    ctx.fill();
  }
  const hy = -k * 0.78 + bob * 1.5;
  ball(hy, k * 0.145);
  // 털모자
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.moveTo(-k * 0.13, hy - k * 0.06);
  ctx.quadraticCurveTo(0, hy - k * 0.3, k * 0.13, hy - k * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.022);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  rr(ctx, -k * 0.14, hy - k * 0.09, k * 0.28, k * 0.05, k * 0.025);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(k * 0.02, hy - k * 0.25, k * 0.04, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 얼굴: 장난꾸러기 눈썹 + 숯 눈 + 당근 코 + 씨익
  ctx.fillStyle = '#1c2230';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sd * k * 0.05, hy - k * 0.01, k * (mood ? 0.03 : 0.024), 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sd * k * 0.05 - k * 0.008, hy - k * 0.02, k * 0.008, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#1c2230';
  ctx.lineWidth = Math.max(1, k * 0.02);
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.09, hy - k * (mood ? 0.07 : 0.05));
    ctx.lineTo(sd * k * 0.02, hy - k * (mood ? 0.03 : 0.045));
    ctx.stroke();
  }
  ctx.fillStyle = lin(ctx, 0, hy, k * 0.14, hy, [0, '#ff9a2a'], [1, '#e8641a']);
  ctx.beginPath();
  ctx.moveTo(0, hy + k * 0.005);
  ctx.lineTo(k * 0.15, hy + k * 0.03);
  ctx.lineTo(0, hy + k * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  if (mood) {
    ctx.fillStyle = '#1c2230';
    ell(ctx, 0, hy + k * 0.08, k * 0.035, k * 0.03);
    ctx.fill();
  } else
    for (let j = 0; j < 5; j++) {
      ctx.fillStyle = '#1c2230';
      ctx.beginPath();
      ctx.arc(-k * 0.06 + j * k * 0.03, hy + k * 0.065 + Math.sin((j / 4) * Math.PI) * k * 0.02, k * 0.012, 0, TAU);
      ctx.fill();
    }
  ctx.restore();
}

/** 통통한 바다표범 (배로 미끄러지며 다가온다, 앞에서 본 모습) · shield면 얼음 방패를 앞에 든다 */
function drawSeal(ctx: C2, k: number, t: number, seed: number, slide: number, shield: number, mood: number) {
  const sq = 1 + slide * 0.08;
  ctx.save();
  ctx.scale(sq, 2 - sq);
  // 뒷지느러미
  ctx.fillStyle = '#6f849c';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.025);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * k * 0.1, -k * 0.55);
    ctx.rotate(sd * (0.6 + Math.sin(t * 0.2 + seed) * 0.2));
    ell(ctx, 0, -k * 0.06, k * 0.05, k * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, -k * 0.6, 0, 0, [0, '#a8bacd'], [0.6, '#8ea2b9'], [1, '#6f839b']);
  ell(ctx, 0, -k * 0.27, k * 0.34, k * 0.29);
  ctx.fill();
  ctx.stroke();
  // 점박이
  ctx.fillStyle = 'rgba(70,90,115,.45)';
  for (let j = 0; j < 5; j++) {
    ell(ctx, (hsh(seed + j) - 0.5) * k * 0.5, -k * (0.35 + hsh(seed + j * 3) * 0.18), k * 0.03, k * 0.022);
    ctx.fill();
  }
  // 앞지느러미 (철퍼덕)
  const pad = Math.sin(t * 0.25 + seed) * 0.4 * (slide > 0.3 ? 1 : 0.3);
  ctx.fillStyle = '#7b90a8';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * k * 0.28, -k * 0.1);
    ctx.rotate(sd * (0.9 + pad * sd));
    ell(ctx, 0, k * 0.06, k * 0.05, k * 0.11);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // 얼굴
  const fy = -k * 0.3;
  ctx.fillStyle = '#f2f6fb';
  ell(ctx, -k * 0.055, fy + k * 0.06, k * 0.07, k * 0.055);
  ctx.fill();
  ell(ctx, k * 0.055, fy + k * 0.06, k * 0.07, k * 0.055);
  ctx.fill();
  ctx.fillStyle = '#2b2f3a';
  ell(ctx, 0, fy + k * 0.025, k * 0.035, k * 0.025);
  ctx.fill();
  // 눈
  for (const sd of [-1, 1]) {
    const ex = sd * k * 0.12, ey = fy - k * 0.06;
    ctx.fillStyle = '#0d1018';
    ell(ctx, ex, ey, k * 0.05, k * (shield && mood === 0 ? 0.035 : 0.055));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - k * 0.015, ey - k * 0.018, k * 0.016, 0, TAU);
    ctx.fill();
    if (shield) {
      ctx.strokeStyle = '#1b2130';
      ctx.lineWidth = Math.max(1, k * 0.022);
      ctx.beginPath();
      ctx.moveTo(ex - sd * k * 0.06, ey - k * 0.09);
      ctx.lineTo(ex + sd * k * 0.04, ey - k * 0.06);
      ctx.stroke();
    }
  }
  // 수염
  ctx.strokeStyle = 'rgba(30,40,60,.6)';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1])
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.08, fy + k * 0.06 + j * k * 0.015);
      ctx.lineTo(sd * k * 0.22, fy + k * 0.04 + j * k * 0.03);
      ctx.stroke();
    }
  // 메롱
  if (!shield && mood === 0) {
    ctx.fillStyle = '#ff7a9a';
    ell(ctx, k * 0.02, fy + k * 0.13, k * 0.025, k * 0.02);
    ctx.fill();
  }
  ctx.restore();
  if (shield) {
    // 얼음 방패 (앞쪽, 반투명)
    const fl = shield > 1 ? 1 : 0;
    ctx.save();
    ctx.translate(0, -k * 0.16);
    ctx.fillStyle = lin(ctx, -k * 0.3, -k * 0.2, k * 0.3, k * 0.15, [0, 'rgba(230,250,255,.92)'], [0.5, 'rgba(150,215,250,.78)'], [1, 'rgba(90,160,220,.85)']);
    rr(ctx, -k * 0.3, -k * 0.13, k * 0.6, k * 0.24, k * 0.07);
    ctx.fill();
    ctx.strokeStyle = fl ? '#ffe36b' : '#e8fbff';
    ctx.lineWidth = Math.max(1.5, k * 0.035);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = Math.max(1, k * 0.02);
    ctx.beginPath();
    ctx.moveTo(-k * 0.22, -k * 0.06);
    ctx.lineTo(-k * 0.1, -k * 0.09);
    ctx.moveTo(-k * 0.2, k * 0.0);
    ctx.lineTo(-k * 0.14, -k * 0.01);
    ctx.stroke();
    ctx.restore();
  }
}

/** 북극곰 대장 (네 발로 엉금엉금, 빨간 망토·얼음 왕관) */
function drawBear(ctx: C2, k: number, t: number, hp: number, hurt: number) {
  const step = Math.sin(t * 0.1) * k * 0.02;
  ctx.save();
  if (hurt > 0) ctx.translate(Math.sin(t * 2.2) * k * 0.03, 0);
  // 망토
  ctx.fillStyle = lin(ctx, 0, -k * 0.75, 0, -k * 0.2, [0, '#ff5a5a'], [1, '#a81e2e']);
  ctx.beginPath();
  ctx.moveTo(-k * 0.3, -k * 0.62);
  ctx.quadraticCurveTo(-k * 0.55, -k * 0.3, -k * 0.42, -k * 0.12);
  ctx.lineTo(k * 0.42, -k * 0.12);
  ctx.quadraticCurveTo(k * 0.55, -k * 0.3, k * 0.3, -k * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.5, k * 0.02);
  ctx.stroke();
  // 몸
  ctx.fillStyle = radg(ctx, -k * 0.12, -k * 0.5, k * 0.05, k * 0.55, [0, '#ffffff'], [0.6, '#eef3f9'], [1, '#bfcde0']);
  ell(ctx, 0, -k * 0.34, k * 0.38, k * 0.32);
  ctx.fill();
  ctx.stroke();
  // 앞발
  ctx.fillStyle = '#e9eff7';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * k * 0.2, -k * 0.06 + (sd > 0 ? step : -step), k * 0.1, k * 0.07);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3a3f4c';
    for (let j = -1; j <= 1; j++) {
      ctx.beginPath();
      ctx.arc(sd * k * 0.2 + j * k * 0.03, -k * 0.02 + (sd > 0 ? step : -step), k * 0.01, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#e9eff7';
  }
  // 머리
  const hy = -k * 0.55;
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#eef3f9';
    ctx.beginPath();
    ctx.arc(sd * k * 0.15, hy - k * 0.17, k * 0.065, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d9a6b2';
    ctx.beginPath();
    ctx.arc(sd * k * 0.15, hy - k * 0.17, k * 0.03, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = radg(ctx, -k * 0.06, hy - k * 0.1, k * 0.03, k * 0.3, [0, '#ffffff'], [1, '#c8d5e6']);
  ell(ctx, 0, hy, k * 0.22, k * 0.19);
  ctx.fill();
  ctx.stroke();
  // 얼음 왕관
  ctx.fillStyle = lin(ctx, 0, hy - k * 0.36, 0, hy - k * 0.18, [0, '#e8fbff'], [1, '#7cc6f2']);
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, hy - k * 0.17);
  ctx.lineTo(-k * 0.13, hy - k * 0.3);
  ctx.lineTo(-k * 0.06, hy - k * 0.23);
  ctx.lineTo(0, hy - k * 0.35);
  ctx.lineTo(k * 0.06, hy - k * 0.23);
  ctx.lineTo(k * 0.13, hy - k * 0.3);
  ctx.lineTo(k * 0.12, hy - k * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 눈·눈썹 (성났다 → 맞으면 질끈)
  for (const sd of [-1, 1]) {
    const ex = sd * k * 0.08, ey = hy - k * 0.03;
    if (hurt > 0) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1.5, k * 0.025);
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.03, ey - k * 0.02);
      ctx.lineTo(ex + k * 0.03, ey);
      ctx.lineTo(ex - k * 0.03, ey + k * 0.02);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#121620';
      ctx.beginPath();
      ctx.arc(ex, ey, k * 0.028, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - k * 0.008, ey - k * 0.01, k * 0.009, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.5, k * 0.025);
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.14, ey - k * 0.07);
    ctx.lineTo(sd * k * 0.03, ey - k * 0.04);
    ctx.stroke();
  }
  ctx.fillStyle = '#f2f5fa';
  ell(ctx, 0, hy + k * 0.08, k * 0.09, k * 0.07);
  ctx.fill();
  ctx.fillStyle = '#20242e';
  ell(ctx, 0, hy + k * 0.05, k * 0.04, k * 0.028);
  ctx.fill();
  ctx.strokeStyle = '#20242e';
  ctx.lineWidth = Math.max(1, k * 0.015);
  ctx.beginPath();
  ctx.moveTo(-k * 0.04, hy + k * 0.12);
  ctx.quadraticCurveTo(0, hy + (hurt > 0 ? k * 0.09 : k * 0.1), k * 0.04, hy + k * 0.12);
  ctx.stroke();
  ctx.restore();
  // 체력 칸
  for (let j = 0; j < BEAR_HP; j++) {
    ctx.fillStyle = j < hp ? '#ff5a6a' : 'rgba(255,255,255,.25)';
    heartPath(ctx, (j - (BEAR_HP - 1) / 2) * k * 0.13, -k * 1.08, k * 0.045);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

/** 아기 펭귄 친구 (회색 솜털, 뒤뚱뒤뚱 옆으로) */
function drawChick(ctx: C2, k: number, t: number, dir: number, dizzy: number, seed: number) {
  const wob = Math.sin(t * 0.3 + seed) * 0.12;
  ctx.save();
  ctx.fillStyle = 'rgba(10,25,60,.3)';
  ell(ctx, 0, 0, k * 0.28, k * 0.07);
  ctx.fill();
  ctx.rotate(dizzy > 0 ? Math.sin(t * 0.4) * 0.3 : wob);
  ctx.scale(dir, 1);
  ctx.fillStyle = radg(ctx, -k * 0.08, -k * 0.5, k * 0.05, k * 0.45, [0, '#e4e8ef'], [1, '#9aa4b4']);
  ell(ctx, 0, -k * 0.38, k * 0.27, k * 0.36);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.03);
  ctx.stroke();
  ctx.fillStyle = '#2a3048';
  ell(ctx, 0, -k * 0.62, k * 0.2, k * 0.14);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, k * 0.06, -k * 0.55, k * 0.12, k * 0.1);
  ctx.fill();
  if (dizzy > 0) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1, k * 0.03);
    ctx.beginPath();
    ctx.arc(k * 0.08, -k * 0.56, k * 0.035, 0, Math.PI * 1.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#10152a';
    ctx.beginPath();
    ctx.arc(k * 0.09, -k * 0.57, k * 0.03, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffb04a';
  ctx.beginPath();
  ctx.moveTo(k * 0.16, -k * 0.53);
  ctx.lineTo(k * 0.26, -k * 0.5);
  ctx.lineTo(k * 0.16, -k * 0.47);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,130,160,.6)';
  ell(ctx, k * 0.1, -k * 0.48, k * 0.03, k * 0.02);
  ctx.fill();
  ctx.fillStyle = '#ffd34a';
  rr(ctx, -k * 0.18, -k * 0.44, k * 0.36, k * 0.06, k * 0.03);
  ctx.fill();
  ctx.restore();
  if (dizzy > 0)
    for (let j = 0; j < 3; j++) {
      const an = t * 0.15 + (j * TAU) / 3;
      ctx.fillStyle = '#ffe66b';
      starPath(ctx, Math.cos(an) * k * 0.25, -k * 0.9 + Math.sin(an) * k * 0.06, k * 0.06);
      ctx.fill();
    }
}

/** 얼음 기둥 (육각 수정) — 발 = 0,0, r = 바닥 반지름(px) */
function drawPillar(ctx: C2, r: number, hgt: number, t: number, flash: number) {
  ctx.fillStyle = 'rgba(10,30,70,.3)';
  ell(ctx, r * 0.15, r * 0.1, r * 1.25, r * 0.45);
  ctx.fill();
  ctx.fillStyle = '#eef7ff';
  ell(ctx, 0, 0, r * 1.15, r * 0.42);
  ctx.fill();
  const w2 = r * 0.95;
  ctx.fillStyle = lin(ctx, -w2, 0, w2, 0, [0, 'rgba(200,240,255,.95)'], [0.35, 'rgba(130,200,245,.9)'], [0.7, 'rgba(80,150,220,.92)'], [1, 'rgba(60,120,200,.95)']);
  ctx.beginPath();
  ctx.moveTo(-w2, 0);
  ctx.lineTo(-w2, -hgt * 0.85);
  ctx.lineTo(-w2 * 0.4, -hgt);
  ctx.lineTo(w2 * 0.5, -hgt * 0.95);
  ctx.lineTo(w2, -hgt * 0.8);
  ctx.lineTo(w2, 0);
  ctx.quadraticCurveTo(0, r * 0.35, -w2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2d5a92';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w2 * 0.55, -hgt * 0.1);
  ctx.lineTo(-w2 * 0.55, -hgt * 0.85);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.moveTo(w2 * 0.15, -hgt * 0.05);
  ctx.lineTo(w2 * 0.15, -hgt * 0.9);
  ctx.stroke();
  const gl = 0.4 + 0.3 * Math.sin(t * 0.05) + flash;
  ctx.fillStyle = `rgba(255,255,255,${Math.min(1, gl)})`;
  starPath(ctx, -w2 * 0.4, -hgt * 0.92, r * 0.25);
  ctx.fill();
}

/** 얼음벽 벽돌 (hp 2 = 멀쩡, 1 = 금) */
function drawBlock(ctx: C2, r: number, hp: number, shake: number) {
  const hw = r * 1.05, hgt = r * 1.5;
  ctx.save();
  ctx.translate(shake, 0);
  ctx.fillStyle = 'rgba(10,30,70,.3)';
  ell(ctx, r * 0.1, r * 0.15, hw * 1.15, r * 0.4);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -hgt, 0, 0, [0, 'rgba(225,248,255,.95)'], [1, 'rgba(110,180,235,.92)']);
  rr(ctx, -hw, -hgt, hw * 2, hgt, r * 0.25);
  ctx.fill();
  ctx.strokeStyle = '#2d5a92';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  rr(ctx, -hw, -hgt, hw * 2, r * 0.35, r * 0.2);
  ctx.fill();
  if (hp <= 1) {
    ctx.strokeStyle = '#1d3f72';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.1, -hgt);
    ctx.lineTo(hw * 0.15, -hgt * 0.6);
    ctx.lineTo(-hw * 0.2, -hgt * 0.35);
    ctx.lineTo(hw * 0.1, 0);
    ctx.moveTo(hw * 0.15, -hgt * 0.6);
    ctx.lineTo(hw * 0.7, -hgt * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** 눈덩이 (r = 반지름 px, spin = 굴러간 거리) */
function drawSnowball(ctx: C2, x: number, y: number, r: number, spin: number, glow: number) {
  if (glow > 0) {
    ctx.fillStyle = radg(ctx, x, y, r * 0.5, r * 2.4, [0, `rgba(200,240,255,${0.45 * glow})`], [1, 'rgba(200,240,255,0)']);
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = radg(ctx, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.2, [0, '#ffffff'], [0.55, '#eef5fd'], [1, '#a6c3e6']);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#5f86bb';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,160,210,.6)';
  ctx.lineWidth = Math.max(1, r * 0.09);
  for (let j = 0; j < 3; j++) {
    const a = spin * 0.35 + (j * TAU) / 3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.22, a, a + 1.6);
    ctx.stroke();
  }
}

/** 손가락 그림 (첫 안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.1);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.07;
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
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

/** 이글루 (cx, base = 바닥 가운데, rw = 반폭 px) · hp만큼 멀쩡하고, 잃을 때마다 금이 간다 */
function drawIgloo(ctx: C2, cx: number, base: number, rw: number, hp: number, t: number, shake: number) {
  const rh = rw * 0.72;
  ctx.save();
  ctx.translate(cx + shake, base);
  ctx.fillStyle = 'rgba(20,40,80,.25)';
  ell(ctx, 0, 0, rw * 1.08, rh * 0.18);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, rw, rh, 0, Math.PI, TAU);
  ctx.closePath();
  ctx.fillStyle = radg(ctx, -rw * 0.35, -rh * 0.7, rw * 0.1, rw * 1.3, [0, '#ffffff'], [0.6, '#e2eefb'], [1, '#a9c4e4']);
  ctx.fill();
  ctx.strokeStyle = '#5a7fb2';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(90,125,175,.45)';
  ctx.lineWidth = 1.1;
  for (let row = 1; row < 5; row++) {
    const yy = -rh * (row / 5);
    const half = rw * Math.sqrt(1 - Math.pow(row / 5, 2));
    ctx.beginPath();
    ctx.moveTo(-half, yy);
    ctx.lineTo(half, yy);
    ctx.stroke();
    for (let j = -4; j <= 4; j++) {
      const xx = (j + (row % 2) * 0.5) * rw * 0.22;
      if (Math.abs(xx) > half) continue;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + rh / 5);
      ctx.stroke();
    }
  }
  // 금
  ctx.strokeStyle = '#2c4a7a';
  ctx.lineWidth = 1.6;
  const cracks = HP_IG - hp;
  for (let c = 0; c < cracks; c++) {
    let x = (c === 0 ? -0.5 : c === 1 ? 0.45 : 0.05) * rw, y = -rh * 0.85;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (hsh(c * 7 + j) - 0.5) * rw * 0.25;
      y += rh * 0.16;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  // 따뜻한 동그란 창
  const wx = rw * 0.5, wy = -rh * 0.45, gl = 0.75 + 0.15 * Math.sin(t * 0.07);
  ctx.fillStyle = radg(ctx, wx, wy, 0, rw * 0.3, [0, `rgba(255,210,120,${0.5 * gl})`], [1, 'rgba(255,210,120,0)']);
  ctx.beginPath();
  ctx.arc(wx, wy, rw * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = lin(ctx, wx, wy - rw * 0.08, wx, wy + rw * 0.08, [0, '#fff1b8'], [1, '#ffb04a']);
  ell(ctx, wx, wy, rw * 0.085, rw * 0.075);
  ctx.fill();
  ctx.strokeStyle = '#5a7fb2';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
/** 화면 위 크기: 먼 쪽은 작게, 가까운 쪽은 크게 */
const dep = (y: number) => 0.8 + 0.32 * clamp((y - YT) / (YI - YT), 0, 1);
const FOE_H: Record<K, number> = { snow: 0.14, seal: 0.13, shield: 0.13, bear: 0.27, chick: 0.08 };
const PENG_H = 0.16;
/** 공중의 눈덩이를 그릴 화면 y */
const ballY = (y: number) => y - BALL_H * dep(y);

function drawAll(ctx: C2, s: PengState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], P = PAL[d.place], t = s.t, wt = s.wt;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const bg = getBg(Math.round(w), Math.round(h), d.place, Math.min(3, Math.max(1, Math.round(sc))));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const prev = s.down && s.aim && s.phase === 'play' ? simulate(s, s.aim.x, s.aim.y) : null;
  const aimA = s.aim ? Math.atan2(...(aimDir(s.aim.x, s.aim.y).reverse() as [number, number])) : fx.memo.throwA ?? -Math.PI / 2;
  // 카메라: 겨눈 쪽으로 살짝 (시차)
  const camT = (s.down && s.aim ? Math.cos(aimA) * 0.6 : 0) + Math.sin(t * 0.004) * 0.25;
  fx.memo.cam = (fx.memo.cam ?? 0) + (camT - (fx.memo.cam ?? 0)) * 0.06;
  const cam = fx.memo.cam;

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 오로라 · 먼 빙산 ──
  ctx.fillStyle = P.sky[0];
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.drawImage(bg.sky, 0, 0, w, Y(HZ) + R(0.06));
  aurora(ctx, w, wt + t * 0.5, P, 1);
  ctx.drawImage(bg.far, -R(0.1) - cam * R(0.04), Y(HZ) - R(0.17), w * 1.2, R(0.2));
  // ── 얼음판 · 빙벽 · 눈둑 ──
  ctx.drawImage(bg.floor, 0, 0, w, h);
  // 얼음에 비친 오로라
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(XL), Y(YT), X(XR - XL), Y(YI - YT) + 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 3; j++) {
    const yy = Y(YT + 0.12 + j * 0.2) + Math.sin(t * 0.01 + j) * R(0.02), xx = X(0.5 + Math.sin(t * 0.006 + j * 2) * 0.25);
    ctx.fillStyle = radg(ctx, xx, yy, 0, R(0.3), [0, `rgba(${j === 1 ? P.au[1] : P.au[0]},.13)`], [1, `rgba(${P.au[0]},0)`]);
    ell(ctx, xx, yy, R(0.38), R(0.08));
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // 얼음에 비친 그림자들 (뒤집어 흐리게)
  ctx.globalAlpha = 0.16;
  for (const p of s.pillars) {
    ctx.save();
    ctx.translate(X(p.x), Y(p.y));
    ctx.scale(1, -0.55);
    drawPillar(ctx, R(p.r), R(0.15) * dep(p.y), t, 0);
    ctx.restore();
  }
  for (const f of s.foes) {
    if (f.st !== GO) continue;
    const k = R(FOE_H[f.k]) * dep(f.y);
    ctx.save();
    ctx.translate(X(f.x), Y(f.y) + 1);
    ctx.scale(f.k === 'chick' ? (f.vx >= 0 ? 1 : -1) : 1, -0.5);
    if (f.k === 'snow') drawSnowman(ctx, k, wt, f.seed, 0);
    else if (f.k === 'seal' || f.k === 'shield') drawSeal(ctx, k, wt, f.seed, 0, f.k === 'shield' ? 1 : 0, 0);
    else if (f.k === 'bear') drawBear(ctx, k, wt, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // 이글루 마당
  ctx.drawImage(bg.yard, 0, Y(YI) + R(0.004), w, bg.yard.height / Math.min(3, Math.max(1, Math.round(sc))));
  const bonkAge = t - (fx.memo.bonkT ?? -99);
  // 구경꾼: 양옆 눈둑의 아기 펭귄 (큰 순간마다 폴짝)
  {
    const cheer = t - s.cheerT < 70;
    for (const [sx, sy, dir, sd] of [[0.04, 1.03, 1, 3], [0.96, 1.06, -1, 7]] as number[][]) {
      const jump = cheer ? Math.abs(Math.sin((t + sd * 5) * 0.22)) * R(0.03) : Math.abs(Math.sin((t + sd * 9) * 0.05)) * R(0.004);
      ctx.save();
      ctx.translate(X(sx), Y(sy) - jump);
      drawChick(ctx, R(0.075), t + sd * 13, dir, 0, sd);
      ctx.restore();
      if (cheer && (t - s.cheerT) % 40 < 26) {
        font(0.03, 900);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff6c8';
        ctx.strokeStyle = 'rgba(0,0,0,.5)';
        ctx.lineWidth = 3;
        const tx = clamp(X(sx), R(0.08), w - R(0.08));
        ctx.strokeText('와아!', tx, Y(sy) - R(0.11));
        ctx.fillText('와아!', tx, Y(sy) - R(0.11));
      }
    }
  }
  // ── 서 있는 것들: 깊이(발 y) 순서로 ──
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  for (const p of s.pillars) {
    const fl = Math.max(0, 1 - (t - (fx.memo['pl' + Math.round(p.x * 100)] ?? -99)) / 12);
    items.push({ y: p.y, draw: () => (ctx.save(), ctx.translate(X(p.x), Y(p.y)), drawPillar(ctx, R(p.r), R(0.15) * dep(p.y), t, fl), ctx.restore()) });
  }
  for (const b of s.blocks) {
    if (b.hp <= 0) continue;
    const sh = Math.max(0, 8 - (t - (fx.memo['bk' + b.id] ?? -99)));
    items.push({ y: b.y, draw: () => (ctx.save(), ctx.translate(X(b.x), Y(b.y)), drawBlock(ctx, R(b.r) * dep(b.y), b.hp, Math.sin(t * 2) * sh * 0.4), ctx.restore()) });
  }
  const drawFoe = (f: Foe) => {
    let x = f.x, y = f.y, z = 0, sc2 = 1;
    if (f.st === ENTER) {
      if (f.delay > 0) return;
      const u = Math.min(1, f.tm / ENTER_T);
      z = Math.sin(u * Math.PI) * 0.05;
      sc2 = 0.5 + 0.5 * u;
      x = f.x;
      y = f.y;
    }
    const k = R(FOE_H[f.k]) * dep(y) * sc2;
    ctx.save();
    ctx.translate(X(x), Y(y));
    if (f.k !== 'chick') {
      ctx.fillStyle = 'rgba(10,25,60,.32)';
      ell(ctx, 0, 0, k * (f.k === 'bear' ? 0.45 : 0.3), k * 0.08);
      ctx.fill();
      // 미끄러진 자국
      if (f.st === GO && (f.k === 'seal' || f.k === 'shield')) {
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 1.5;
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(sd * k * 0.12, -k * 0.05);
          ctx.lineTo(sd * k * 0.12 - f.vx * R(20), -k * 0.05 - R(0.05));
          ctx.stroke();
        }
      }
    }
    ctx.translate(0, -R(z));
    const slide = f.k === 'seal' || f.k === 'shield' ? Math.max(0, Math.sin(f.ph * 0.07 + f.seed)) : 0;
    const mood = f.dizzy > 0 ? 1 : 0;
    if (f.k === 'snow') drawSnowman(ctx, k, wt, f.seed, mood);
    else if (f.k === 'seal') drawSeal(ctx, k, wt, f.seed, slide, 0, mood);
    else if (f.k === 'shield') drawSeal(ctx, k, wt, f.seed, slide, t - (fx.memo['sh' + f.id] ?? -99) < 10 ? 2 : 1, 0);
    else if (f.k === 'bear') drawBear(ctx, k, wt, f.hp, Math.max(f.dizzy, f.hurtT));
    else drawChick(ctx, k, wt, f.vx >= 0 ? 1 : -1, f.dizzy, f.seed);
    ctx.restore();
  };
  for (const f of s.foes) items.push({ y: f.y, draw: () => drawFoe(f) });
  // 맞은 적: 멈칫(번쩍) → 와르르 / 뒤집혀 날아감
  for (const c of s.wrecks) {
    const age = t - c.t;
    items.push({
      y: c.y,
      draw: () => {
        const k = R(FOE_H[c.k]) * dep(c.y), cx = X(c.x), cy = Y(c.y), ax = Math.cos(c.a), ay = Math.sin(c.a);
        if (c.n < 0) {
          // 이글루 담에 '쿵' → 어질어질 뒤로 콩 튕겼다 사라진다
          const u = age, fade = Math.max(0, 1 - u / 60);
          if (fade <= 0) return;
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(cx + Math.sin(u * 0.5) * k * 0.05, cy - k * 0.3 * Math.sin(Math.min(1, u / 24) * Math.PI) - Math.min(u, 24) * k * 0.012);
          ctx.rotate(Math.sin(u * 0.4) * 0.25);
          ctx.scale(1, u < 4 ? 0.8 : 1);
          if (c.k === 'snow') drawSnowman(ctx, k, wt, c.seed, 1);
          else if (c.k === 'bear') drawBear(ctx, k, wt, 0, 1);
          else drawSeal(ctx, k, wt, c.seed, 0, c.k === 'shield' ? 1 : 0, 1);
          for (let j = 0; j < 3; j++) {
            const an = u * 0.25 + (j * TAU) / 3;
            ctx.fillStyle = '#ffe66b';
            starPath(ctx, Math.cos(an) * k * 0.28, -k * 0.95 + Math.sin(an) * k * 0.07, k * 0.07);
            ctx.fill();
          }
          ctx.restore();
          return;
        }
        if (age < 4) {
          ctx.save();
          ctx.translate(cx + Math.sin(age * 3) * k * 0.06, cy);
          ctx.scale(1 + 0.08 * (4 - age) / 4, 1 - 0.06 * (4 - age) / 4);
          if (c.k === 'snow') drawSnowman(ctx, k, wt, c.seed, 1);
          else if (c.k === 'bear') drawBear(ctx, k, wt, 0, 1);
          else drawSeal(ctx, k, wt, c.seed, 0, 0, 1);
          // 번쩍 (맞은 순간 하얗게)
          ctx.fillStyle = radg(ctx, 0, -k * 0.45, 0, k * 0.6, [0, 'rgba(255,255,255,.9)'], [0.6, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']);
          ell(ctx, 0, -k * 0.45, k * 0.55, k * 0.6);
          ctx.fill();
          ctx.restore();
          return;
        }
        const u = age - 4, fade = Math.max(0, 1 - u / 42);
        if (fade <= 0) return;
        ctx.save();
        ctx.globalAlpha = fade;
        if (c.k === 'snow') {
          // 눈 공 셋이 와르르 + 당근 코가 핑그르르
          // 바닥에 남은 눈 무더기
          ctx.fillStyle = radg(ctx, cx, cy - k * 0.04, 0, k * 0.3, [0, '#ffffff'], [1, '#b9d0ec']);
          ell(ctx, cx, cy - k * 0.03, k * 0.28 * (1 - u / 120), k * 0.09);
          ctx.fill();
          ctx.strokeStyle = '#6e8fbf';
          ctx.lineWidth = 1;
          ctx.stroke();
          const parts = [[0.2, -0.22, -0.7], [0.16, -0.52, 0.25], [0.13, -0.78, 0.95], [0.09, -0.5, -1.2], [0.08, -0.6, 1.4]];
          parts.forEach(([r, py, spread], i) => {
            const vx = ax * k * 0.07 + spread * k * 0.09, up = k * (0.13 + (i % 3) * 0.04);
            const px = cx + vx * u * 0.35, pyy = Math.min(cy - k * r * 0.5, cy + k * py - up * u * 0.35 + u * u * k * 0.014);
            ctx.fillStyle = radg(ctx, px - k * r * 0.3, pyy - k * r * 0.3, 0, k * r * 1.2, [0, '#ffffff'], [1, '#a9c3e3']);
            ctx.beginPath();
            ctx.arc(px, pyy, k * r * (1 - u / 90), 0, TAU);
            ctx.fill();
            ctx.strokeStyle = '#4f6f9f';
            ctx.lineWidth = 1.4;
            ctx.stroke();
          });
          // 털모자가 휙
          ctx.save();
          ctx.translate(cx - ax * k * 0.04 * u * 0.4, cy - k * 0.95 - k * 0.3 * Math.sin(Math.min(1, u / 34) * Math.PI));
          ctx.rotate(-u * 0.12);
          ctx.fillStyle = ['#3fb6a8', '#a46bff', '#ffcc3a', '#ff6b8b'][c.seed % 4];
          ctx.beginPath();
          ctx.moveTo(-k * 0.13, 0);
          ctx.quadraticCurveTo(0, -k * 0.24, k * 0.13, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = OUT;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.translate(cx + ax * k * 0.05 * u * 0.4, cy - k * 0.8 - k * 0.2 * u * 0.3 + u * u * k * 0.01);
          ctx.rotate(u * 0.5);
          ctx.fillStyle = '#ff8a2a';
          ctx.beginPath();
          ctx.moveTo(-k * 0.02, -k * 0.02);
          ctx.lineTo(k * 0.13, 0);
          ctx.lineTo(-k * 0.02, k * 0.02);
          ctx.fill();
          ctx.restore();
        } else {
          // 뒤집혀 버둥거리며 미끄러져 날아간다
          const sd = ax >= 0 ? 1 : -1;
          ctx.translate(cx + ax * k * 0.12 * u * 0.4 + sd * k * 0.02 * u, cy - k * 0.25 * Math.sin(Math.min(1, u / 30) * Math.PI) - u * k * 0.006 + ay * k * 0.02 * u);
          ctx.rotate(sd * Math.min(Math.PI, u * 0.3) + Math.sin(u * 0.8) * 0.15);
          if (c.k === 'bear') drawBear(ctx, k, wt + u * 3, 0, 1);
          else drawSeal(ctx, k, wt + u * 4, c.seed, 1, 0, 1);
          if (u < 30)
            for (let j = 0; j < 3; j++) {
              const an = u * 0.3 + (j * TAU) / 3;
              ctx.fillStyle = '#ffe66b';
              starPath(ctx, Math.cos(an) * k * 0.3, -k * 0.65 + Math.sin(an) * k * 0.08, k * 0.07);
              ctx.fill();
            }
        }
        ctx.restore();
      },
    });
  }
  // 날아가는 눈덩이 (그림자 + 꼬리 + 공)
  for (const b of s.balls) {
    items.push({
      y: b.y,
      draw: () => {
        const bx = X(b.x), by = Y(ballY(b.y)), r = R(b.r) * dep(b.y) * 1.1;
        ctx.fillStyle = 'rgba(10,25,60,.3)';
        ell(ctx, bx, Y(b.y), r * 0.9, r * 0.32);
        ctx.fill();
        const tr = b.tr;
        ctx.lineCap = 'round';
        for (let i = 0; i < tr.length - 2; i += 2) {
          const u = (i + 2) / tr.length;
          ctx.strokeStyle = `rgba(235,248,255,${0.1 + 0.5 * u})`;
          ctx.lineWidth = r * (0.3 + 1.5 * u);
          ctx.beginPath();
          ctx.moveTo(X(tr[i]), Y(ballY(tr[i + 1])));
          ctx.lineTo(X(tr[i + 2]), Y(ballY(tr[i + 3])));
          ctx.stroke();
        }
        if (tr.length >= 2) {
          ctx.strokeStyle = 'rgba(235,248,255,.6)';
          ctx.lineWidth = r * 1.8;
          ctx.beginPath();
          ctx.moveTo(X(tr[tr.length - 2]), Y(ballY(tr[tr.length - 1])));
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
        // 빨라질수록 속도선
        if (b.bounces > 0) {
          ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.8, 0.2 * b.bounces)})`;
          ctx.lineWidth = 1.5;
          for (const o of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(bx - b.dx * r * 1.2 - b.dy * r * 0.6 * o, by - b.dy * r * 1.2 + b.dx * r * 0.6 * o);
            ctx.lineTo(bx - b.dx * r * (3 + b.bounces) - b.dy * r * 0.6 * o, by - b.dy * r * (3 + b.bounces) + b.dx * r * 0.6 * o);
            ctx.stroke();
          }
        }
        drawSnowball(ctx, bx, by, r, b.dist * 30, Math.min(1, b.n * 0.25));
        if (b.n >= 2) {
          font(0.034, 900);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(10,20,50,.7)';
          ctx.strokeText(`×${b.n}`, bx, by - r - R(0.025));
          ctx.fillStyle = b.n >= 3 ? '#ffe36b' : '#ffffff';
          ctx.fillText(`×${b.n}`, bx, by - r - R(0.025));
        }
      },
    });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // ── 이글루 · 눈덩이 더미 · 펭귄 (맨 앞) ──
  drawIgloo(ctx, X(0.5), Y(1.345), R(0.23), s.ig, t, bonkAge < 16 ? Math.sin(bonkAge * 2.5) * (16 - bonkAge) * 0.3 : 0);
  {
    // 눈덩이 더미 (남은 수만큼)
    const n = Math.min(s.limited ? 11 : AMMO, Math.floor(s.ammo)), px = X(0.33), py = Y(1.2);
    for (let i = 0; i < n; i++) {
      const row = i < 3 ? 0 : i < 5 ? 1 : 2, col = i < 3 ? i : i < 5 ? i - 3 : i - 5;
      const bx = px + (col - (row === 0 ? 1 : row === 1 ? 0.5 : 0)) * R(0.03) - (i >= 6 ? R(0.1) : 0) + (i >= 6 ? (i - 6) * R(0.03) : 0), by = py - row * R(0.024);
      drawSnowball(ctx, bx, by, R(0.016), i, 0);
    }
    if (!s.limited && s.ammo < AMMO && s.phase === 'play') {
      const u = s.reload / (RELOAD * ease(s)[0]);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px + (n - 1) * R(0.03), py, R(0.017), -Math.PI / 2, -Math.PI / 2 + u * TAU);
      ctx.stroke();
    }
  }
  {
    const since = t - s.throwT;
    let pose = 0;
    if (s.phase === 'result') pose = s.ok ? 5 : 4;
    else if (bonkAge < 45) pose = 3;
    else if (s.down) pose = 1;
    else if (since < 14) pose = 2;
    else if (t - s.cheerT < 50) pose = 5;
    const k = R(PENG_H);
    // 이글루 문 불빛을 등지고
    ctx.fillStyle = radg(ctx, X(PX), Y(1.16) - k * 0.4, 0, k * 0.9, [0, 'rgba(255,220,150,.28)'], [1, 'rgba(255,220,150,0)']);
    ctx.beginPath();
    ctx.arc(X(PX), Y(1.16) - k * 0.4, k * 0.9, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(X(PX), Y(1.165));
    drawPeng(ctx, k, pose, t, pose === 2 ? fx.memo.throwA ?? -Math.PI / 2 : aimA, s.ammo >= 1, since);
    ctx.restore();
  }
  // ── 미리 보기: 튕길 길 (처음 두 번 튕김까지) ──
  if (prev && s.aim) {
    const pts = prev.pts, segs: number[] = [];
    let tot = 0;
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const L = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
      segs.push(L);
      tot += L;
    }
    const bAt2 = segs.length >= 3 ? segs[0] + segs[1] : tot;
    const vis = Math.min(tot, segs.length >= 3 ? bAt2 + 0.18 : tot), fadeFrom = segs.length >= 3 ? bAt2 : tot - 0.05;
    const ok = s.ammo >= 1;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.3);
    // 점선 (그림자 + 흰 점), 앞으로 흐른다
    const gap = 0.024, off = (t * 0.0016) % gap;
    for (let pass = 0; pass < 2; pass++) {
      let acc = 0, si = 0;
      for (let dd = off; dd < vis; dd += gap) {
        while (si < segs.length - 1 && dd > acc + segs[si]) (acc += segs[si]), si++;
        const u = segs[si] > 0 ? (dd - acc) / segs[si] : 0, x = pts[si * 2] + (pts[si * 2 + 2] - pts[si * 2]) * u, y = pts[si * 2 + 1] + (pts[si * 2 + 3] - pts[si * 2 + 1]) * u;
        const a = dd > fadeFrom ? Math.max(0, 1 - (dd - fadeFrom) / (vis - fadeFrom + 1e-6)) : 1;
        if (pass === 0) {
          ctx.fillStyle = `rgba(10,30,70,${0.25 * a})`;
          ctx.beginPath();
          ctx.arc(X(x), Y(y), R(0.005), 0, TAU);
          ctx.fill();
        } else {
          ctx.fillStyle = ok ? `rgba(255,255,255,${0.95 * a})` : `rgba(200,210,230,${0.6 * a})`;
          ctx.strokeStyle = `rgba(20,50,100,${0.6 * a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(X(x), Y(ballY(y)), R(0.0075 + 0.003 * (1 - dd / 2.4)), 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    // 튕길 자리
    for (let j = 0; j < Math.min(2, prev.bd.length); j++) {
      const bx = X(pts[2 + j * 2]), by = Y(ballY(pts[3 + j * 2])), kind = prev.bk[j];
      ctx.strokeStyle = kind === 'shield' ? '#ffd84a' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, R(0.018 + 0.006 * pulse), 0, TAU);
      ctx.stroke();
      ctx.fillStyle = kind === 'shield' ? '#ffd84a' : '#e8fbff';
      starPath(ctx, bx, by, R(0.012));
      ctx.fill();
      if (kind === 'shield') {
        font(0.032, 900);
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(10,20,50,.7)';
        ctx.strokeText('방패에 튕겨요!', clamp(bx, R(0.15), w - R(0.15)), by - R(0.045));
        ctx.fillStyle = '#ffe36b';
        ctx.fillText('방패에 튕겨요!', clamp(bx, R(0.15), w - R(0.15)), by - R(0.045));
      }
    }
    // 맞을 차례 번호 (보이는 길 안에서)
    let shown = 0, bossShown = 0, lastX = X(prev.ex), lastY = Y(prev.ey);
    for (const hq of prev.hits) {
      if (hq.d > vis + 0.02) continue;
      const f = s.foes.find((q) => q.id === hq.id);
      if (!f) continue;
      if (f.k === 'bear') {
        bossShown++;
        if (bossShown > 1) continue;
      }
      shown++;
      {
        const k0 = R(FOE_H[f.k]) * dep(f.y);
        ctx.strokeStyle = `rgba(255,90,78,${0.6 + 0.4 * pulse})`;
        ctx.lineWidth = 2.5;
        ell(ctx, X(f.x), Y(f.y), k0 * (f.k === 'bear' ? 0.5 : 0.36), k0 * 0.12);
        ctx.stroke();
      }
      const k = R(FOE_H[f.k]) * dep(f.y), bx = X(f.x), by = Y(f.y) - k * (f.k === 'bear' ? 1.2 : 1.05) - R(0.02);
      lastX = bx;
      lastY = by;
      ctx.fillStyle = '#ff5a4e';
      ctx.beginPath();
      ctx.arc(bx, by, R(0.022), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.03, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(hq.n), bx, by + 1);
    }
    if (bossShown > 1) {
      const f = s.foes.find((q) => q.k === 'bear');
      if (f) {
        const k = R(FOE_H.bear) * dep(f.y);
        font(0.036, 900);
        ctx.textAlign = 'left';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(10,20,50,.75)';
        ctx.strokeText(`×${bossShown}`, X(f.x) + R(0.03), Y(f.y) - k * 1.2 - R(0.02));
        ctx.fillStyle = '#ffe36b';
        ctx.fillText(`×${bossShown}`, X(f.x) + R(0.03), Y(f.y) - k * 1.2 - R(0.02));
      }
    }
    // 친구 조심
    if (prev.chick && prev.chickD <= vis + 0.02) {
      const c = s.foes.find((q) => q.k === 'chick' && prev.hits.some((hh) => hh.id === q.id));
      const cx = c ? X(c.x) : X(prev.ex), cy = c ? Y(c.y) - R(0.09) : Y(prev.ey) - R(0.06);
      ctx.strokeStyle = '#ff4a3d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - R(0.018), cy - R(0.018));
      ctx.lineTo(cx + R(0.018), cy + R(0.018));
      ctx.moveTo(cx + R(0.018), cy - R(0.018));
      ctx.lineTo(cx - R(0.018), cy + R(0.018));
      ctx.stroke();
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,20,50,.75)';
      ctx.strokeText('친구 조심!', clamp(cx, R(0.14), w - R(0.14)), cy - R(0.035));
      ctx.fillStyle = '#ffb3a8';
      ctx.fillText('친구 조심!', clamp(cx, R(0.14), w - R(0.14)), cy - R(0.035));
    }
    if (shown >= 2) {
      font(0.05, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10,20,50,.8)';
      const txt = `${shown}마리!`, tx = clamp(lastX, R(0.14), w - R(0.14)), ty = Math.max(Y(YT + 0.04), lastY - R(0.05));
      ctx.strokeText(txt, tx, ty);
      ctx.fillStyle = shown >= 3 ? '#ffe36b' : '#ffffff';
      ctx.fillText(txt, tx, ty);
    }
    // 손가락 자리
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(s.aim.x), Y(s.aim.y), R(0.02 + 0.006 * pulse), 0, TAU);
    ctx.stroke();
    if (!ok) {
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,20,50,.75)';
      ctx.strokeText('눈덩이 뭉치는 중…', X(0.5), Y(1.0));
      ctx.fillStyle = '#ffd0c8';
      ctx.fillText('눈덩이 뭉치는 중…', X(0.5), Y(1.0));
    }
  }
  // 첫 안내: 손가락 그림 하나 (벽을 누르면 튕겨서 줄줄이)
  if (s.stage === 0 && s.firstShot < 0 && s.phase === 'play' && !s.down) {
    if (fx.memo.gT === undefined || t - fx.memo.gT > 12) {
      let best = -1, ga = -Math.PI / 2;
      for (let i = 0; i < 48; i++) {
        const a = -Math.PI + AMIN + ((Math.PI - 2 * AMIN) * (i + 0.5)) / 48, n = simulate(s, PX + Math.cos(a) * 0.4, PY + Math.sin(a) * 0.4).n;
        if (n > best + 0.5 || (n === best && Math.abs(a + 2.5) < Math.abs(ga + 2.5))) (best = n), (ga = a);
      }
      const g = simulate(s, PX + Math.cos(ga) * 0.4, PY + Math.sin(ga) * 0.4);
      fx.memo.gT = t;
      fx.memo.gx = g.pts.length > 4 ? g.pts[2] : PX + Math.cos(ga) * 0.4;
      fx.memo.gy = g.pts.length > 4 ? g.pts[3] : PY + Math.sin(ga) * 0.4;
    }
    const tx = X(fx.memo.gx), ty = Y(fx.memo.gy), cyc = (t % 80) / 80, press = cyc < 0.5 ? cyc * 2 : 1 - (cyc - 0.5) * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.moveTo(X(PX), Y(ballY(PY)));
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - press * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tx, ty, R(0.03 + press * 0.03), 0, TAU);
    ctx.stroke();
    ctx.translate(tx, ty);
    ctx.rotate(0.2);
    drawHand(ctx, 0, R(0.01), R(0.085), press);
    ctx.restore();
  }
  // 새 적 스포트라이트
  if (s.spot) {
    const f = s.foes.find((q) => q.id === s.spot!.id), age = t - s.spot.t;
    if (f && age < 110 && (f.st === GO || f.tm > 10)) {
      const a = Math.min(1, age / 10, (110 - age) / 20), k = R(FOE_H[f.k]) * dep(f.y), cx = X(f.x), cy = Y(f.y) - k * 0.5, r0 = Math.max(R(0.07), k * 0.85);
      ctx.save();
      ctx.fillStyle = `rgba(4,8,24,${0.45 * a})`;
      ctx.beginPath();
      ctx.rect(-20, -20, w + 40, Y(GB) + 20);
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,74,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.04, 900);
      const label = `NEW  ${s.spot.label}`, tw = ctx.measureText(label).width + R(0.04), lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6), ly = cy + r0 + R(0.045);
      ctx.fillStyle = '#ffd84a';
      rr(ctx, lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#1a1424';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    x = clamp(x, w * 0.14, w * 0.86);
    const card = s.phase === 'result' || (s.pt < CARD_T && (s.stage > 0 || s.again)), minY = card ? Y(0.36) : Y(0.14);
    y = clamp(y, minY, Y(GB) - 10);
    const busy = (yy: number) => rec!.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - yy) < (size + q.size) * 0.6);
    // 겹치면 위로 비키고, 위가 막히면(판 카드·HUD) 아래로 비킨다
    let up = y;
    for (let k = 0; k < 6 && busy(up); k++) up -= size + 2;
    if (up >= minY) y = up;
    else for (let k = 0; k < 6 && busy(y); k++) y += size + 2;
    rec.push({ x, y, t, size });
    if (rec.length > 12) rec.shift();
    fx.pop(x, y, text, col, size);
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(ballY(e.y));
    switch (e.kind) {
      case 'throw':
        fx.memo.throwA = e.a ?? -Math.PI / 2;
        fx.burst(X(PX), Y(1.04), '#ffffff', 6, 2, 1.6);
        say(X(PX) + R(0.1), Y(1.0), '휙!', '#e8f4ff', 14);
        break;
      case 'bounce': {
        const n = e.n ?? 1;
        fx.ring(ex, ey, '#ffffff', R(0.05 + n * 0.008), 3);
        fx.burst(ex, ey, '#f2f8ff', 8 + n * 2, 2.6 + n * 0.3, 2);
        fx.kick(1.5 + n * 0.8);
        say(ex + (e.x < 0.5 ? R(0.06) : -R(0.06)), ey - R(0.03), n >= 3 ? '통통!' : '통!', '#ffffff', Math.min(24, 14 + n * 2));
        break;
      }
      case 'pillar':
        fx.ring(ex, ey, '#bff4ff', R(0.06), 3);
        fx.burst(ex, ey, '#bff4ff', 12, 3, 1.8);
        fx.kick(2.5);
        say(ex, ey - R(0.05), '팅!', '#bff4ff', 16);
        for (const p of s.pillars) if (Math.hypot(p.x - e.x, p.y - e.y) < 0.12) fx.memo['pl' + Math.round(p.x * 100)] = t;
        break;
      case 'crack':
        fx.burst(ex, ey, '#d8f4ff', 10, 2.6, 2);
        fx.kick(3);
        say(ex, ey - R(0.05), '쩍!', '#d8f4ff', 16);
        for (const b of s.blocks) if (Math.hypot(b.x - e.x, b.y - e.y) < 0.08) fx.memo['bk' + b.id] = t;
        break;
      case 'shatter':
        fx.burst(X(e.x), Y(e.y) - R(0.03), '#e8fbff', 26, 5, 2.6);
        fx.burst(X(e.x), Y(e.y) - R(0.03), '#7fd0ff', 16, 4, 2.2);
        fx.ring(X(e.x), Y(e.y), '#bff4ff', R(SHARD), 6);
        fx.kick(8);
        fx.blink('#bff4ff', 0.25);
        say(X(e.x), Y(e.y) - R(0.09), '와장창!', '#bff4ff', 24);
        break;
      case 'ting':
        fx.burst(ex, ey, '#ffe36b', 12, 3, 1.8);
        fx.kick(3);
        say(ex, ey - R(0.05), '팅!', '#ffe36b', 18);
        for (const f of s.foes) if (f.k === 'shield' && Math.hypot(f.x - e.x, f.y - e.y) < 0.1) fx.memo['sh' + f.id] = t;
        break;
      case 'hit':
      case 'shard': {
        const n = e.n ?? 1, hx = X(e.x), hy = Y(e.y) - R(FOE_H[e.k ?? 'snow']) * dep(e.y) * 0.5;
        fx.burst(hx, hy, '#ffffff', 10 + n * 3, 3 + n * 0.4, 2.4);
        fx.burst(hx, hy, '#bfe0ff', 6 + n * 2, 2.4, 2);
        if (e.k === 'seal' || e.k === 'shield') fx.burst(hx, hy, '#9fb2c8', 6, 2.2, 2);
        if (e.k === 'shield') fx.burst(hx, hy, '#7fe0ff', 10, 3.5, 1.8);
        fx.ring(hx, hy, n >= 3 ? '#ffe36b' : '#ffffff', R(0.05 + Math.min(5, n) * 0.012), 3 + Math.min(4, n) * 0.5);
        fx.kick(2 + Math.min(6, n) * 1.3);
        if (n >= 3) fx.blink('#ffffff', Math.min(0.35, 0.1 + n * 0.04));
        say(hx, hy - R(0.07), String(n), n >= 3 ? '#ffe36b' : '#ffffff', Math.min(34, 16 + n * 3.5));
        if (e.k === 'seal' && n % 2 === 1) say(hx + R(0.07), hy - R(0.02), '꽥!', '#dfe8f5', 13);
        break;
      }
      case 'multi':
        if ((e.n ?? 0) >= (fx.memo.bigN && t - (fx.memo.bigT ?? -99) < 40 ? fx.memo.bigN : 0)) (fx.memo.bigT = t), (fx.memo.bigN = e.n ?? 3), (fx.memo.bigX = ex), (fx.memo.bigY = ey);
        break;
      case 'refund':
        say(X(0.33), Y(1.12), '+1 눈덩이', '#bff4ff', 17);
        fx.burst(X(0.33), Y(1.18), '#ffffff', 14, 3, 2);
        break;
      case 'bearhit':
        fx.kick(5);
        say(X(e.x) + (e.x < 0.5 ? R(0.16) : -R(0.16)), Y(e.y) - R(0.12), '으앙!', '#ffd0c8', 18);
        fx.burst(X(e.x), Y(e.y) - R(0.12), '#ffffff', 14, 3.4, 2.4);
        break;
      case 'bonk':
        fx.memo.bonkT = t;
        fx.kick(8);
        fx.blink('#ff6a5a', 0.16);
        fx.burst(X(e.x), Y(YI), '#ffffff', 18, 3.4, 2.6);
        say(X(e.x), Y(YI) - R(0.08), '쿵!', '#ffb3a8', 22);
        say(X(0.5), Y(1.04), '이글루 하트 -1', '#ffb3a8', 15);
        break;
      case 'chick':
        fx.burst(X(e.x), Y(e.y) - R(0.05), '#ffe66b', 10, 2.6, 2);
        say(X(e.x), Y(e.y) - R(0.1), '삐약?!', '#ffe9a8', 17);
        break;
      case 'poof':
      case 'stop':
        fx.burst(ex, ey, '#f2f8ff', 8 + Math.round((e.r ?? 0.02) * 300), 2.4, 2.2);
        break;
      case 'empty':
        say(X(PX), Y(1.0), '눈덩이를 뭉치는 중이에요', '#ffd0c8', 14);
        break;
      case 'reload':
        fx.burst(X(0.33), Y(1.2), '#ffffff', 5, 1.6, 1.4);
        break;
      case 'clear':
        fx.burst(w * 0.3, Y(0.7), '#ffffff', 34, 6, 3);
        fx.burst(w * 0.7, Y(0.7), `rgb(${P.au[0]})`, 34, 6, 3);
        fx.ring(w / 2, Y(0.75), '#ffe36b', R(0.45), 7);
        fx.blink('#eaffff', 0.25);
        break;
      case 'fail':
        fx.kick(7);
        break;
    }
  }
  fx.memo.t = t;
  // 앞쪽 눈발 (가장 가까운 층 — 시차가 크다)
  for (let j = 0; j < 16; j++) {
    const sp = 0.3 + hsh(j) * 0.5, yy = (hsh(j + 3) * h + (wt + t) * sp * 0.6) % (Y(GB) - 4), xx = ((hsh(j + 7) * w + Math.sin((wt + t) * 0.01 + j) * R(0.03) - cam * R(0.06) * (1 + (j % 3))) % w + w) % w;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * hsh(j * 5)})`;
    ctx.beginPath();
    ctx.arc(xx, yy, 1 + (j % 3) * 0.6, 0, TAU);
    ctx.fill();
  }
  // 큰 순간: 잠깐 느려지는 동안 가장자리가 푸르게 어두워지고 눈발이 멈춘 듯
  if (s.slowT > 0 && s.phase === 'play') {
    const a = Math.min(1, s.slowT / 12);
    ctx.fillStyle = radg(ctx, w / 2, Y(0.75), R(0.35), R(1.0), [0, 'rgba(0,0,0,0)'], [1, `rgba(20,60,140,${0.38 * a})`]);
    ctx.fillRect(-20, -20, w + 40, Y(GB) + 20);
  }
  ctx.restore();
  // 큰 순간 띠: 'N마리 와르르!'
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 56) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN, sc2 = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (56 - age) / 16);
    // 맞힌 자리의 글자(숫자·와장창)와 겹치지 않게: 위쪽에서 터지면 그 아래, 아래쪽이면 그 위에
    const gy = fx.memo.bigY / w, bx = clamp(fx.memo.bigX, w * 0.3, w * 0.7), by = clamp(gy < 0.72 ? Y(gy + 0.2) : Y(gy - 0.2), Y(0.42), Y(1.0));
    const txt = n >= 6 ? `${n}마리 눈사태!` : n >= 5 ? `${n}마리 와르르르!` : `${n}마리 와르르!`, size = Math.min(36, 20 + n * 3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.06);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width, rx = tw / 2 + 20, ry = size * 0.78;
    // 눈 구름 모양 판
    ctx.fillStyle = 'rgba(14,30,72,.88)';
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const an = (i / 20) * TAU, q = 0.9 + 0.12 * Math.sin(i * 2.3 + fx.memo.bigT);
      const px = Math.cos(an) * rx * q, py = Math.sin(an) * ry * q;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(191,244,255,.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0b1430';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#ffffff'], [0.5, '#d9f6ff'], [1, '#7fd8ff']);
    ctx.fillText(txt, 0, 2);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const an = t * 0.06 + (i * TAU) / 3;
      flakePath(ctx, Math.cos(an) * (rx + 8), Math.sin(an) * (ry + 6), 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═════════════ HUD ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(6,14,40,.94)'], [1, 'rgba(12,26,64,.86)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(191,244,255,.5)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  {
    const cx = R(0.055), cy = hb / 2;
    ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#e8fbff'], [1, '#7cc6f2']);
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.03), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0d2346';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f2f8ff';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.1), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.036, 700);
    ctx.fillStyle = '#8fa6c8';
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
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      const hx = w - R(0.03) - sw - R(0.08) - j * R(0.05);
      heartPath(ctx, hx, cy, R(0.017));
      ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#d62b3d']) : 'rgba(255,255,255,.12)';
      ctx.fill();
      ctx.strokeStyle = 2 - j < s.hearts ? OUT : 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
  // 판 카드 (하늘 띠 안 — 놀이터를 가리지 않는다)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '빙하를 다 지켜 냈다!' : `${d.goal} 성공!`;
      else (head = `으앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 아기 펭귄이 이글루로 쏙');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : '꾹 누르면 튕길 길이 보여요';
    }
    if (head) {
      const cy = Y(0.2), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.045, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.06), Math.max(w1, w2) + R(0.1)) * unroll, ch = sub || (s.phase === 'result' && s.ok) ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - ch / 2 + 4, cw, ch, R(0.03));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#f6fbff'], [1, '#cfe3f7']);
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.03));
      ctx.fill();
      ctx.strokeStyle = '#4f7fb8';
      ctx.lineWidth = 2;
      ctx.stroke();
      // 눈 지붕
      ctx.fillStyle = '#ffffff';
      for (let j = 0; j < 7; j++) {
        ctx.beginPath();
        ctx.arc(w / 2 - cw / 2 + ((j + 0.5) / 7) * cw, cy - ch / 2 + 1, R(0.014 + hsh(j) * 0.008), Math.PI, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.045, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#1d4f8a' : '#9a2a20') : '#14284d';
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.025), w - R(0.1));
        const n = d.stars.length;
        for (let j = 0; j < n; j++) {
          const ag = s.pt - (12 + j * 12);
          const sx = w / 2 + (j - (n - 1) / 2) * R(0.07), sy = cy + R(0.03);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.026) * (ag < 0 ? 1 : pop));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(40,70,120,.18)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#7a4a08' : 'rgba(40,70,120,.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.025) : 0), w - R(0.1));
        if (sub) {
          font(0.036, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#b8302a' : '#33507a';
          ctx.fillText(sub, w / 2, cy + R(0.032), w - R(0.1));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 눈덩이 · 이글루 하트 · 별 · 안내 ═════════════
  {
    const ty = Y(GB);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, 'rgba(10,22,58,.96)'], [1, 'rgba(5,10,30,.98)']);
    rr(ctx, 0, ty, w, h - ty + 4, R(0.025));
    ctx.fill();
    ctx.fillStyle = 'rgba(191,244,255,.45)';
    ctx.fillRect(R(0.02), ty, w - R(0.04), 1.5);
    const r1 = ty + R(0.042);
    {
      // 눈덩이
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#dfe9ff';
      ctx.fillText('눈덩이', R(0.03), r1 + 1);
      const lx = R(0.03) + ctx.measureText('눈덩이').width + R(0.035);
      const cap = s.limited ? Math.max(1, Math.ceil(s.ammo)) : AMMO;
      const show = Math.min(cap, s.limited ? 6 : AMMO);
      for (let j = 0; j < show; j++) {
        const bx = lx + j * R(0.045), full = j < s.ammo;
        if (full) drawSnowball(ctx, bx, r1, R(0.017), j * 2, 0);
        else {
          ctx.strokeStyle = 'rgba(255,255,255,.3)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(bx, r1, R(0.016), 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
          if (j === Math.floor(s.ammo) && !s.limited) {
            const u = s.reload / (RELOAD * ease(s)[0]);
            ctx.strokeStyle = '#bff4ff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(bx, r1, R(0.016), -Math.PI / 2, -Math.PI / 2 + u * TAU);
            ctx.stroke();
          }
        }
      }
      if (s.limited) {
        font(0.036, 900);
        ctx.fillStyle = s.ammo <= 2 ? '#ffb3a8' : '#ffffff';
        ctx.fillText(`${s.ammo}개 남음`, lx + show * R(0.045), r1 + 1);
      }
      // 이글루 하트
      const hx0 = w - R(0.27);
      font(0.034, 800);
      ctx.fillStyle = '#dfe9ff';
      ctx.fillText('이글루', hx0, r1 + 1);
      const iw = ctx.measureText('이글루').width;
      for (let j = 0; j < HP_IG; j++) {
        const hx = hx0 + iw + R(0.035) + j * R(0.042);
        const beat = j === s.ig && bonkAge < 30 ? 1 + 0.4 * (1 - bonkAge / 30) : 1;
        heartPath(ctx, hx, r1, R(0.015) * beat);
        ctx.fillStyle = j < s.ig ? '#ff6a7a' : 'rgba(255,255,255,.12)';
        ctx.fill();
        ctx.strokeStyle = j < s.ig ? OUT : 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    // 2줄: 별 (쉬운 말)
    const r2 = ty + R(0.1);
    {
      const n = d.stars.length;
      const labels = d.stars.map((q, j) => {
        const pr = s.phase === 'play' && j > 0 ? starNow(s, q) : '';
        return q.label + (pr && !starMet(s, q) ? ` ${pr}` : '');
      });
      const live = (q: Star) => q.k === 'nohurt' || q.k === 'friend' || q.k === 'thrift' || q.k === 'save';
      const ok = d.stars.map((q, j) => (s.phase === 'result' && s.ok ? s.starOk[j] : j > 0 && !live(q) && starMet(s, q)));
      const bad = d.stars.map((q) => (q.k === 'nohurt' && s.hurtN > 0) || (q.k === 'friend' && s.chickN > 0) || (q.k === 'thrift' && s.shots > q.n));
      font(0.034, 800);
      const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
      const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (n - 1), scale = Math.min(1, (w - R(0.03)) / tot);
      let xx = (w - tot * scale) / 2;
      for (let j = 0; j < n; j++) {
        const pw = ws[j] * scale;
        ctx.fillStyle = ok[j] ? 'rgba(255,216,74,.22)' : bad[j] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.07)';
        rr(ctx, xx, r2 - R(0.025), pw, R(0.05), R(0.025));
        ctx.fill();
        ctx.strokeStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.28)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        starPath(ctx, xx + R(0.026) * scale + 2, r2, R(0.014));
        ctx.fillStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.55)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = ok[j] ? '#fff6dc' : bad[j] ? 'rgba(255,255,255,.35)' : '#e6ecff';
        font(0.034, 800);
        ctx.fillText(labels[j], xx + R(0.05) * scale, r2 + 1, pw - R(0.058) * scale);
        xx += pw + gap * scale;
      }
    }
    // 3줄: 안내 한 줄
    {
      let hint = d.hint;
      const first = s.stage === 0 && s.firstShot < 0 && s.phase === 'play';
      if (first) hint = s.down ? '떼면 쌩! 점선 위의 눈사람을 모두 맞혀요' : '👆 벽 쪽을 꾹 — 튕길 길이 보여요';
      else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판을 지켜 냈어요!' : `★ ${s.got}개! 다음 판엔 새 친구가 나와요`) : '적이 줄 설 때까지 기다렸다 한 발로!';
      else if (s.news && t - s.news.t < NEWS_T) hint = s.news.text;
      else if (s.down && s.ammo < 1) hint = '눈덩이를 뭉치는 중 — 조금만 기다려요';
      font(first ? 0.04 : 0.035, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = first ? '#ffffff' : '#bff4ff';
      ctx.fillText(hint, w / 2, ty + R(0.163), w - R(0.04));
    }
  }
  void th;
}
