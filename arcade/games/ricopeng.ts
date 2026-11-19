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
 *   → 6판 눈덩이 개수 제한(다시 안 뭉쳐짐 → 아끼기) → 7판 아기 펭귄 소풍(친구는 피해서) → 8판 북극곰 대장(튕겨 여러 번).
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
    hint: '대장은 눈덩이를 튕겨 내요 — 빙벽과 대장 사이를 오가게!',
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
function ballStep(F: Field, b: Ball, out: Hap[] | null) {
  let rem = b.v, skip: unknown = null;
  const legs: number[] = [];
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
    const circ = (cx: number, cy: number, cr: number, o: unknown, kd: string, front: boolean) => {
      if (o === skip) return;
      const ox = b.x - cx, oy = b.y - cy, R = cr + b.r, bb = ox * b.dx + oy * b.dy;
      if (bb >= 0) return;
      const c = ox * ox + oy * oy - R * R;
      if (c < 0) return;
      const disc = bb * bb - c;
      if (disc < 0) return;
      const q = -bb - Math.sqrt(disc);
      if (q < 0 || q >= u) return;
      const hx = (b.x + b.dx * q - cx) / R, hy = (b.y + b.dy * q - cy) / R;
      if (front && hy < 0.3) return;
      (u = q), (nx = hx), (ny = hy), (obj = o), (kind = kd);
    };
    for (const p of F.pillars) circ(p.x, p.y, p.r, p, 'pillar', false);
    for (const k of F.blocks) if (k.hp > 0) circ(k.x, k.y, k.r, k, 'block', false);
    for (const f of F.foes) {
      if (f.dead || f.st !== GO) continue;
      if (f.k === 'shield') circ(f.x, f.y, RAD.shield, f, 'shield', true);
    }
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
  const cand: { f: Foe; o: number }[] = [];
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
  pts: number[]; bd: number[]; hits: { id: number; k: K; n: number; x: number; y: number; d: number; urg: number; back: boolean; pil: boolean }[];
  n: number; bossN: number; pn: number; sh: number; crack: number; chick: boolean; chickD: number; shard: number; ex: number; ey: number; done: string; ticks: number;
}

/** 눈덩이를 (ax,ay) 쪽으로 던지면? — 적이 미끄러지는 것까지 실제와 같은 코드로 앞당겨 돌린다 */
function simulate(s: PengState, ax: number, ay: number, lead = 0, maxT = 120): Sim {
  const F: Field = { foes: s.foes.map((f) => ({ ...f })), pillars: s.pillars, blocks: s.blocks.map((k) => ({ ...k })) };
  const b = newBall(0, ax, ay), spd = ease(s)[1];
  // 이미 날아가는 눈덩이도 같이 돌린다 (그 눈덩이가 먼저 맞힐 적은 이 눈덩이 몫이 아니다)
  const fly = s.balls.filter((q) => !q.done).map((q) => ({ ...q, hit: [...q.hit], tr: [] as number[] }));
  const out: Sim = { pts: [PX, PY], bd: [], hits: [], n: 0, bossN: 0, pn: 0, sh: 0, crack: 0, chick: false, chickD: 0, shard: 0, ex: PX, ey: PY, done: '', ticks: 0 };
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
    let pil = b.pil;
    for (const h of haps) {
      if (h.k === 'wall' || h.k === 'top' || h.k === 'pillar' || h.k === 'block' || h.k === 'shield') out.pts.push(h.x, h.y), out.bd.push(d0);
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
      id, k, x: instant || k === 'chick' ? cx : x, y: instant || k === 'chick' ? y0 : YT - 0.05, vx, vy: VY[k], hp: k === 'bear' ? BEAR_HP : 1, ph: 0,
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

