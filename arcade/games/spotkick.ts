/**
 * 동물 승부차기 눈치 싸움 (35라운드: 눈치 싸움 × 턴제 — 톡 하나).
 * 조작은 톡뿐: 골대를 큰 칸 6개(3×2)로 나눠, 찰 차례엔 찰 곳을, 막을 차례엔 뛸 곳을 톡 — 그다음은 저절로
 *   도움닫기 → 뻥 → 슬로모션 → 골망 출렁 / 몸 날려 탁! / 관중석 팝콘 와르르. 아무것도 안 누르면 아무 일도 없다(타이머 없음).
 * 와우: 상대 골키퍼는 **내 버릇을 배우고**(같은 곳만 차면 미리 그쪽으로 뜀), 상대의 버릇은 **몸짓으로 보인다**
 *   (골키퍼가 한쪽으로 기울기, 키커가 꼬리를 흔들고 힐끔 보기). 단서가 늘 맞진 않고, 뒤 판 상대는 찡긋 윙크로 속인다.
 * 미리 보기: 칸마다 장갑 = 막힐 확률(찰 때) / 막을 확률(막을 때). 단서를 정직하다고 보고 그린다(찡긋은 사람이 읽는다).
 * 판 6개 · 판마다 새것: 1 곰돌이(늘 가운데) → 2 고양이(몸짓 단서) → 3 여우(내 버릇을 배움 · 여우 수첩)
 *   → 4 너구리(바람: 공이 한 칸 밀림) → 5 부엉이(찡긋 = 거짓말) → 6 사자 대장(큰 몸: 옆 칸까지 닿음).
 * 한 경기 = 5번씩 차고 막기(동점이면 서든데스). 이기면 다음 판, 지면 하트 -1 · 그 판만 다시.
 * 결정적: 상대의 고르기·단서·바람·빗나감은 모두 s.rng.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 자리 (가로 폭 = 1) ─────────────────────────────
/** 골대 입(칸 6개) */
const GX0 = 0.085, GX1 = 0.915, GY0 = 0.43, GY1 = 0.825;
const CW = (GX1 - GX0) / 3, CH = (GY1 - GY0) / 2;
const colOf = (c: number) => c % 3, rowOf = (c: number) => (c / 3) | 0;
const cellX = (c: number) => GX0 + CW * (colOf(c) + 0.5);
const cellY = (c: number) => GY0 + CH * (rowOf(c) + 0.5);
const SPOT_X = 0.5, SPOT_Y = 1.12, LINE_Y = 0.83;

// ───────────────────────────── 판 ─────────────────────────────
type Kind = 'dog' | 'bear' | 'cat' | 'fox' | 'raccoon' | 'owl' | 'lion';
type StarK = 'win' | 'saves' | 'margin' | 'goals' | 'wind' | 'trick';
interface StarDef { k: StarK; n: number; label: string }
const ST = (k: StarK, n: number, label: string): StarDef => ({ k, n, label });
type Spot = '' | 'tell' | 'learn' | 'wind' | 'bluff' | 'big';
interface StageDef {
  kind: Kind; who: string; name: string; habit: string; news: string; spot: Spot;
  /** 상대 골키퍼가 뛰는 곳 · 상대 키커가 차는 곳 (버릇, 합 1) */
  keep0: number[]; kick0: number[];
  /** 내 버릇을 배우는 정도(0~1) · 단서가 맞을 확률 · 찡긋(거짓말) 확률 */
  learn: number; honest: number; wink: number; wind: boolean;
  /** 상대 골키퍼: 같은 줄 위아래 닿을 확률 · 옆 칸 닿을 확률 / 내 골키퍼가 위아래 닿을 확률 */
  stretch: number; adj: number; myStretch: number;
  /** 상대 키커 빗나감 배수 · 덧붙는 빗나감 */
  kMiss: number; kFlat: number;
  jersey: string; jersey2: string; stars: StarDef[];
}
const U6 = [1, 1, 1, 1, 1, 1].map((x) => x / 6);
export const STAGES: StageDef[] = [
  {
    kind: 'bear', who: '곰돌이', name: '졸린 곰돌이', habit: '늘 가운데만 지켜요', news: '', spot: '',
    keep0: [0, 0.2, 0, 0, 0.8, 0], kick0: [0, 0.25, 0, 0, 0.75, 0],
    learn: 0, honest: 0, wink: 0, wind: false, stretch: 0.3, adj: 0, myStretch: 0.3, kMiss: 1, kFlat: 0.4,
    jersey: '#ff6a4a', jersey2: '#ffd0c0', stars: [ST('win', 0, '경기 이기기')],
  },
  {
    kind: 'cat', who: '고양이', name: '오른쪽 고양이', habit: '오른쪽을 좋아해요', news: '몸짓 단서 — 기우는 쪽, 꼬리 쪽으로 가요', spot: 'tell',
    keep0: [0.05, 0.07, 0.27, 0.07, 0.14, 0.4], kick0: [0.04, 0.06, 0.26, 0.08, 0.16, 0.4],
    learn: 0, honest: 0.85, wink: 0, wind: false, stretch: 0.3, adj: 0, myStretch: 0.3, kMiss: 1, kFlat: 0.1,
    jersey: '#a86af0', jersey2: '#e6d4ff', stars: [ST('win', 0, '경기 이기기'), ST('saves', 2, '두 번 막기')],
  },
  {
    kind: 'fox', who: '여우', name: '눈치 여우', habit: '내 버릇을 배워요', news: '여우 수첩 — 같은 곳만 고르면 여우가 미리 가요', spot: 'learn',
    keep0: U6, kick0: [0.14, 0.12, 0.14, 0.2, 0.2, 0.2],
    learn: 0.75, honest: 0.75, wink: 0, wind: false, stretch: 0.5, adj: 0, myStretch: 0.25, kMiss: 0.4, kFlat: 0,
    jersey: '#3cbf6a', jersey2: '#c8f2d4', stars: [ST('win', 0, '경기 이기기'), ST('saves', 2, '두 번 막기'), ST('margin', 2, '두 골 차로 이기기')],
  },
  {
    kind: 'raccoon', who: '너구리', name: '바람 너구리', habit: '왼쪽을 좋아해요', news: '바람 — 공이 바람 쪽으로 한 칸 밀려요', spot: 'wind',
    keep0: [0.24, 0.08, 0.08, 0.34, 0.16, 0.1], kick0: [0.22, 0.08, 0.08, 0.36, 0.14, 0.12],
    learn: 0.6, honest: 0.8, wink: 0, wind: true, stretch: 0.5, adj: 0, myStretch: 0.25, kMiss: 0.45, kFlat: 0,
    jersey: '#ffc23a', jersey2: '#fff0c0', stars: [ST('win', 0, '경기 이기기'), ST('wind', 1, '바람에 밀린 공으로 골 넣기'), ST('saves', 2, '두 번 막기')],
  },
  {
    kind: 'owl', who: '부엉이', name: '찡긋 부엉이', habit: '찡긋 하면 거짓말', news: '속임수 — 찡긋 윙크하면 기운 쪽이 거짓말', spot: 'bluff',
    keep0: U6, kick0: [0.16, 0.12, 0.16, 0.2, 0.16, 0.2],
    learn: 0.6, honest: 1, wink: 0.45, wind: false, stretch: 0.55, adj: 0, myStretch: 0.25, kMiss: 0.35, kFlat: 0,
    jersey: '#2cb8c8', jersey2: '#c6f0f4', stars: [ST('win', 0, '경기 이기기'), ST('trick', 2, '찡긋 속임수 두 번 이기기'), ST('margin', 2, '두 골 차로 이기기')],
  },
  {
    kind: 'lion', who: '사자 대장', name: '사자 대장', habit: '몸이 커서 옆 칸까지', news: '큰 골키퍼 — 옆 칸까지 손이 닿아요', spot: 'big',
    keep0: [0.12, 0.14, 0.12, 0.2, 0.22, 0.2], kick0: [0.18, 0.1, 0.18, 0.2, 0.14, 0.2],
    learn: 0.6, honest: 0.75, wink: 0.25, wind: true, stretch: 0.55, adj: 0.6, myStretch: 0.15, kMiss: 0.3, kFlat: 0,
    jersey: '#3a3a4a', jersey2: '#ffd23a', stars: [ST('win', 0, '사자 대장 이기기'), ST('saves', 3, '세 번 막기'), ST('goals', 4, '네 골 넣기')],
  },
];
export const STAGE_COUNT = STAGES.length;
/** 칸별 빗나감: 위 구석이 가장 위험 */
const MISS = [0.2, 0.08, 0.2, 0.05, 0, 0.05];
const KICKS = 5, SD_MAX = 5;
const GOAL_PTS = 10, SAVE_PTS = 10, CLEAR_PTS = 100, STAR_PTS = 100, WIN_PTS = 200, HEART_PTS = 100;
/** 타임라인(틱): 도움닫기 · 날아가기(슬로모션 포함) · 결과 */
const RUN = 14, FLY = 34, SHOT_T = RUN + FLY, RES_T = 58, END_OK = 190, END_FAIL = 160, BANNER_T = 170;

// ───────────────────────────── 상태 ─────────────────────────────
type Role = 'kick' | 'keep';
type Out = 'goal' | 'save' | 'miss';
type MissK = '' | 'over' | 'wide' | 'post' | 'blown';
interface Turn {
  n: number; role: Role; opp: number; tell: number; wink: boolean; wind: -1 | 0 | 1;
  pick: number; ball: number; aim: number; miss: MissK; out: Out | null; asleep: boolean;
  /** 실제 상대 골키퍼가 뛴 곳 (내가 찰 때 opp) · 상대 키커가 찬 곳 (막을 때 opp) */
}
interface Memo { freq: number[]; dlt: number[]; last: number; n: number }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }
export interface KickState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'aim' | 'shot' | 'res' | 'end'; pt: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; ok: boolean;
  again: boolean; tries: number; n: number; turn: Turn; mine: Out[]; theirs: Out[];
  myGoals: number; oppGoals: number; saves: number; windGoals: number; tricks: number;
  memK: Memo; memD: Memo; history: Turn[];
  /** 이번 경기에서 내가 고른 칸 수 (찰 때 · 막을 때) — 여우 수첩 그림 */
  cntK: number[]; cntD: number[];
  down: boolean; firstTap: number; firstBig: number; wowN: number; taps: number;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; t: number; label: string; rx: number; ry: number } | null;
  events: Ev[]; bigText: string; bigT: number; bigY: number;
}

const ev = (s: KickState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: KickState, key: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function wow(s: KickState, text: string, x = 0.5, y = 0.6) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.bigText = text;
  s.bigT = s.t;
  s.bigY = y;
  ev(s, 'big', x, y, 0, text);
}
const newMemo = (): Memo => ({ freq: [0, 0, 0, 0, 0, 0], dlt: [0, 0, 0, 0, 0, 0], last: -1, n: 0 });

// ───────────────────────────── 눈치 (상대 AI · 미리 보기 · 봇이 같은 것을 쓴다) ─────────────────────────────
const norm = (p: number[]) => {
  const z = p.reduce((a, b) => a + b, 0) || 1;
  return p.map((x) => x / z);
};
/** 내 다음 고르기 예측: 자주 고른 칸 + 같은 걸음(같은 칸·차례로 돌기)을 이어 가기 */
function predict(m: Memo): number[] {
  const p = m.freq.map((f) => 0.35 + f);
  if (m.last >= 0) for (let d = 0; d < 6; d++) p[(m.last + d) % 6] += 1.7 * m.dlt[d];
  return norm(p);
}
function remember(m: Memo, c: number) {
  if (m.last >= 0) {
    for (let d = 0; d < 6; d++) m.dlt[d] *= 0.8;
    m.dlt[(c - m.last + 6) % 6] += 1;
  }
  for (let i = 0; i < 6; i++) m.freq[i] *= 0.85;
  m.freq[c] += 1;
  m.last = c;
  m.n++;
}
/** 골키퍼 d가 b로 오는 공을 막을 확률 */
function saveP(d: number, b: number, stretch: number, adj: number) {
  if (d < 0 || b < 0) return 0;
  if (d === b) return 1;
  if (colOf(d) === colOf(b)) return stretch;
  if (rowOf(d) === rowOf(b) && Math.abs(colOf(d) - colOf(b)) === 1) return adj;
  return 0;
}
/** 바람에 밀린 공이 가는 칸 (-1 = 골대 밖) */
const shift = (c: number, wind: number) => {
  const cc = colOf(c) + wind;
  return cc < 0 || cc > 2 ? -1 : rowOf(c) * 3 + cc;
};
const myMiss = (b: number) => (b < 0 ? 1 : MISS[b]);
const oppMiss = (d: StageDef, b: number) => (b < 0 ? 1 : clamp(MISS[b] * d.kMiss + d.kFlat, 0, 0.95));
/** 상대 골키퍼가 뛸 곳의 분포 (단서 전) */
function keepQ(d: StageDef, memK: Memo, wind: number): number[] {
  if (!d.learn) return d.keep0;
  const pr = predict(memK);
  // 내가 찰 곳을 예측하고, 바람에 밀려 공이 갈 곳으로 뛴다
  const v = [0, 1, 2, 3, 4, 5].map((dv) => pr.reduce((a, p, c) => a + p * saveP(dv, shift(c, wind), d.stretch, d.adj), 0));
  const w = norm(v.map((x) => x ** 3));
  return d.keep0.map((x, i) => (1 - d.learn) * x + d.learn * w[i]);
}
/** 상대 키커가 찰 곳의 분포 (단서 전) */
function kickQ(d: StageDef, memD: Memo, wind: number): number[] {
  // 바람에 밀려 밖으로 나갈 곳은 잘 안 찬다
  const base = norm(d.kick0.map((x, a) => x * (shift(a, wind) < 0 ? 0.12 : 1)));
  if (!d.learn) return base;
  const pr = predict(memD);
  const v = [0, 1, 2, 3, 4, 5].map((a) => {
    const b = shift(a, wind);
    return b < 0 ? 0 : (1 - oppMiss(d, b)) * (1 - pr.reduce((acc, p, dv) => acc + p * saveP(dv, b, d.myStretch, 0), 0));
  });
  const w = norm(v.map((x) => Math.max(0, x) ** 4));
  return base.map((x, i) => (1 - d.learn) * x + d.learn * w[i]);
}
/** 무엇을 읽나: 'habit' 버릇·배운 것만(칸의 딱지) · 'honest' 몸짓을 그대로 믿기 · 'true' 찡긋까지 읽기(잘하는 봇) */
type Read = 'habit' | 'honest' | 'true';
/** 단서(기운 쪽 tell)가 그 칸에서 나올 가능도 */
function tellLike(d: StageDef, c: number, tell: number, wink: boolean, read: Read) {
  if (tell < 0 || read === 'habit') return 1;
  const knowWink = read === 'true';
  const hit = colOf(c) === tell;
  if (wink && knowWink) return hit ? 0 : 0.5;
  return d.honest * (hit ? 1 : 0) + (1 - d.honest) / 3;
}
/** 상대가 고른 칸의 뒤 분포 (보이는 것: 버릇·배운 것·단서) */
function posterior(s: KickState, read: Read): number[] {
  const d = STAGES[s.stage], tu = s.turn;
  if (tu.asleep) return [0, 0, 0, 0, 0, 0];
  const q = tu.role === 'kick' ? keepQ(d, s.memK, tu.wind) : kickQ(d, s.memD, tu.wind);
  return norm(q.map((p, c) => p * tellLike(d, c, tu.tell, tu.wink, read)));
}
/** 칸마다 미리 보기: 찰 때 = [골 확률, 막힐 확률, 빗나갈 확률] / 막을 때 = [막을 확률, 먹힐 확률, 상대 빗나감] */
function preview(s: KickState, read: Read): { good: number; block: number; miss: number; land: number }[] {
  const d = STAGES[s.stage], tu = s.turn, P = posterior(s, read);
  const out: { good: number; block: number; miss: number; land: number }[] = [];
  for (let c = 0; c < 6; c++) {
    if (tu.role === 'kick') {
      const b = shift(c, tu.wind), m = tu.asleep ? 0 : myMiss(b);
      const sv = b < 0 ? 0 : P.reduce((a, p, dv) => a + p * saveP(dv, b, d.stretch, d.adj), 0);
      out.push({ good: (1 - m) * (1 - sv), block: (1 - m) * sv, miss: m, land: b });
    } else {
      // 내가 c로 뛰면: 상대가 a를 차서 b로 가면
      let sv = 0, gl = 0, ms = 0;
      for (let a = 0; a < 6; a++) {
        if (!P[a]) continue;
        const b = shift(a, tu.wind), m = oppMiss(d, b);
        ms += P[a] * m;
        const k = saveP(c, b, d.myStretch, 0);
        sv += P[a] * (1 - m) * k;
        gl += P[a] * (1 - m) * (1 - k);
      }
      out.push({ good: sv, block: gl, miss: ms, land: c });
    }
  }
  return out;
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function newTurn(s: KickState) {
  const d = STAGES[s.stage], r = s.rng, role: Role = s.n % 2 === 0 ? 'kick' : 'keep';
  const asleep = s.stage === 0 && s.tries === 0 && s.n === 0;
  let wind: -1 | 0 | 1 = 0;
  if (d.wind) {
    const w = r();
    wind = w < 0.4 ? -1 : w < 0.8 ? 1 : 0;
  }
  const q = role === 'kick' ? keepQ(d, s.memK, wind) : kickQ(d, s.memD, wind);
  let x = r(), opp = 5;
  for (let c = 0; c < 6; c++) if ((x -= q[c]) <= 0) {
    opp = c;
    break;
  }
  let tell = -1, wink = false;
  if (d.honest > 0 || d.wink > 0) {
    const col = colOf(opp);
    if (d.wink > 0 && r() < d.wink) {
      const others = [0, 1, 2].filter((c) => c !== col);
      tell = others[Math.floor(r() * 2)];
      wink = true;
    } else tell = r() < d.honest ? col : Math.floor(r() * 3);
  }
  s.turn = { n: s.n, role, opp: asleep ? -1 : opp, tell, wink, wind, pick: -1, ball: -1, aim: -1, miss: '', out: null, asleep };
  s.phase = 'aim';
  s.pt = 0;
  if (role === 'keep' && see(s, 'keep')) s.spot = { x: 0.5, y: (GY0 + GY1) / 2, t: s.t, label: '막을 차례 — 뛸 곳을 톡', rx: 0.44, ry: 0.2 };
}
function newStage(s: KickState) {
  const d = STAGES[s.stage];
  s.n = 0;
  s.mine = [];
  s.theirs = [];
  s.myGoals = s.oppGoals = s.saves = s.windGoals = s.tricks = 0;
  s.memK = newMemo();
  s.memD = newMemo();
  s.cntK = [0, 0, 0, 0, 0, 0];
  s.cntD = [0, 0, 0, 0, 0, 0];
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  if (!s.again) {
    s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : `${d.who}는 ${d.habit}`, t: s.t };
    if (d.spot) see(s, d.spot);
    const sp = d.spot;
    if (sp === 'tell') s.spot = { x: 0.5, y: 0.62, t: s.t, label: '기우는 쪽을 봐요', rx: 0.2, ry: 0.2 };
    else if (sp === 'learn') s.spot = { x: 0.5, y: (GY0 + GY1) / 2, t: s.t, label: '여우 수첩: 내가 고른 곳', rx: 0.44, ry: 0.2 };
    else if (sp === 'wind') s.spot = { x: 0.5, y: 0.355, t: s.t, label: '바람', rx: 0.2, ry: 0.05 };
    else if (sp === 'bluff') s.spot = { x: 0.5, y: 0.6, t: s.t, label: '찡긋 = 거짓말', rx: 0.18, ry: 0.2 };
    else if (sp === 'big') s.spot = { x: 0.5, y: 0.6, t: s.t, label: '옆 칸까지 닿는 큰 몸', rx: 0.3, ry: 0.2 };
    else s.spot = null;
  } else s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: `${d.who}는 ${d.habit}`, t: s.t };
  newTurn(s);
}
function starMet(s: KickState, q: StarDef) {
  switch (q.k) {
    case 'win': return s.myGoals > s.oppGoals;
    case 'saves': return s.saves >= q.n;
    case 'margin': return s.myGoals - s.oppGoals >= q.n;
    case 'goals': return s.myGoals >= q.n;
    case 'wind': return s.windGoals >= q.n;
    case 'trick': return s.tricks >= q.n;
  }
}
/** 별 칸 옆 진행 */
function starNow(s: KickState, q: StarDef): string {
  if (q.k === 'saves') return `${Math.min(s.saves, q.n)}/${q.n}`;
  if (q.k === 'goals') return `${Math.min(s.myGoals, q.n)}/${q.n}`;
  if (q.k === 'wind') return `${Math.min(s.windGoals, q.n)}/${q.n}`;
  if (q.k === 'trick') return `${Math.min(s.tricks, q.n)}/${q.n}`;
  return '';
}
/** 톡 → 결과를 지금 정한다 (보여 주는 건 날아가는 동안) */
function shoot(s: KickState, c: number) {
  const d = STAGES[s.stage], tu = s.turn, r = s.rng;
  tu.pick = c;
  if (tu.role === 'kick') {
    tu.aim = c;
    const b = shift(c, tu.wind);
    tu.ball = b;
    if (tu.asleep) tu.out = 'goal';
    else if (b < 0) (tu.out = 'miss'), (tu.miss = 'blown');
    else if (r() < myMiss(b)) {
      tu.out = 'miss';
      tu.miss = rowOf(b) === 0 ? (r() < 0.5 ? 'post' : 'over') : r() < 0.5 ? 'post' : 'wide';
    } else tu.out = r() < saveP(tu.opp, b, d.stretch, d.adj) ? 'save' : 'goal';
    remember(s.memK, c);
    s.cntK[c]++;
  } else {
    tu.aim = tu.opp;
    const b = shift(tu.opp, tu.wind);
    tu.ball = b;
    if (b < 0) (tu.out = 'miss'), (tu.miss = 'blown');
    else if (r() < oppMiss(d, b)) {
      tu.out = 'miss';
      tu.miss = rowOf(b) === 0 ? (r() < 0.5 ? 'post' : 'over') : r() < 0.5 ? 'post' : 'wide';
    } else tu.out = r() < saveP(c, b, d.myStretch, 0) ? 'save' : 'goal';
    remember(s.memD, c);
    s.cntD[c]++;
  }
  s.phase = 'shot';
  s.pt = 0;
  s.taps++;
  s.banner = null;
  see(s, tu.role === 'kick' ? 'kick' : 'keep');
  ev(s, 'tap', cellX(c), cellY(c), c);
}
/** 공이 닿은 순간: 점수·연출 */
function land(s: KickState) {
  const tu = s.turn, d = STAGES[s.stage];
  const bx = tu.ball >= 0 ? cellX(tu.ball) : 0.5, by = tu.ball >= 0 ? cellY(tu.ball) : GY0;
  const lead0 = s.myGoals - s.oppGoals;
  if (tu.role === 'kick') {
    s.mine.push(tu.out!);
    if (tu.out === 'goal') {
      s.myGoals++;
      s.pts += GOAL_PTS;
      if (tu.wind && tu.ball !== tu.aim) s.windGoals++;
      if (tu.wink) s.tricks++;
      const lead = s.myGoals - s.oppGoals;
      wow(s, lead0 < 0 && lead === 0 ? '동점 골!!' : lead0 === 0 && lead > 0 && s.n >= 6 ? '역전 골!!' : rowOf(tu.ball) === 0 && colOf(tu.ball) !== 1 ? '구석 꽂았다!!' : tu.wind && tu.ball !== tu.aim ? '바람 타고 골!!' : '골!!!', bx, by);
    }
    ev(s, tu.out!, bx, by, tu.ball, tu.miss);
  } else {
    s.theirs.push(tu.out!);
    if (tu.out === 'goal') s.oppGoals++;
    else if (tu.out === 'save') {
      s.saves++;
      s.pts += SAVE_PTS;
      if (tu.wink) s.tricks++;
      wow(s, tu.wink ? '속임수 간파!!' : '막았다!!', bx, by);
    } else if (tu.wink) s.tricks++;
    ev(s, 'k' + tu.out!, bx, by, tu.ball, tu.miss);
  }
  void d;
  s.phase = 'res';
  s.pt = 0;
}
function afterTurn(s: KickState) {
  s.history.push(s.turn);
  if (s.history.length > 12) s.history.shift();
  s.n++;
  const reg = s.n >= KICKS * 2, pair = s.n % 2 === 0;
  if (reg && pair && (s.myGoals !== s.oppGoals || s.n >= (KICKS + SD_MAX) * 2)) return endMatch(s);
  if (s.n === KICKS * 2 && s.myGoals === s.oppGoals) {
    see(s, 'sudden');
    ev(s, 'sudden', 0.5, 0.6);
    s.banner = { head: '서든데스!', sub: '한 번씩 — 먼저 앞서면 이겨요', t: s.t };
  }
  newTurn(s);
}
function endMatch(s: KickState) {
  const d = STAGES[s.stage];
  s.phase = 'end';
  s.pt = 0;
  s.ok = s.myGoals > s.oppGoals;
  if (s.ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += (CLEAR_PTS + s.got * STAR_PTS) * (1 + s.stage * 0.5);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    wow(s, s.won ? '우승!!!' : '승리!', 0.5, 0.5);
    ev(s, 'clear', 0.5, 0.5);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.6);
  }
}

// ───────────────────────────── 톡 ─────────────────────────────
/** x: 0~1, y: 가로 폭 단위 → 칸(0~5) 또는 -1 */
function hitCell(x: number, y: number): number {
  if (x < GX0 - 0.03 || x > GX1 + 0.03 || y < GY0 - 0.05 || y > GY1 + 0.04) return -1;
  const c = clamp(Math.floor((x - GX0) / CW), 0, 2), r = y < GY0 + CH ? 0 : 1;
  return r * 3 + c;
}

const game: GameDef<KickState> & { wows(s: KickState): number } = {
  id: 'spotkick',
  name: '⚽ 동물 승부차기 눈치 싸움',
  genes: ['mindgame', 'turnbased'],
  twist: '상대 골키퍼는 내 버릇을 배워 같은 곳만 차면 미리 그쪽으로 뛰고, 상대의 버릇은 몸짓(기울기·꼬리·힐끔)으로 보인다 — 그런데 뒤 판 상대는 찡긋 윙크로 거짓 몸짓을 한다',
  rules: [
    '찰 차례엔 찰 곳, 막을 차례엔 뛸 곳을 톡! 5번씩 차고 막아 골이 많으면 승리.',
    '칸의 % = 상대 버릇으로 본 확률. 기울기·힐끔(몸짓)은 지금 갈 쪽 — 찡긋하면 거짓말!',
    '같은 곳만 고르면 상대가 배워요. 지면 하트 -1, 그 판만 다시.',
  ],
  controls: 'touch',
  hint: '골대 칸을 톡 = 차기·막기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 가득한 동물 축구장의 승부차기 — 3/4 시점 골대와 줄무늬 잔디, 응원하는 동물 관중석, 표정이 살아 있는 통통한 동물 키커·골키퍼',
    mood: '파란 하늘 아래 줄무늬 잔디가 반짝이고, 관중석의 토끼·병아리·돼지가 깃발을 흔든다. 톡 하면 강아지가 도움닫기해 뻥 — 슬로모션으로 날아간 공이 골망을 크게 출렁이면 관중석에 파도가 일고 꽃가루가 쏟아진다. 막히면 골키퍼가 날아올라 탁! 하고 우쭐, 빗나가면 공이 관중석 팝콘을 와르르 엎는다.',
    palette: { bg: '#8fd65c', ink: '#3a2a14', muted: '#7a6a4a', accent: '#ffcf3a', hot: '#ff5f3a', soft: '#fff6dc' },
  },
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'end' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'aim', pt: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, won: false, dead: false, ok: false,
      again: false, tries: 0, n: 0, turn: null, mine: [], theirs: [],
      myGoals: 0, oppGoals: 0, saves: 0, windGoals: 0, tricks: 0,
      memK: newMemo(), memD: newMemo(), history: [], cntK: [0, 0, 0, 0, 0, 0], cntD: [0, 0, 0, 0, 0, 0],
      down: false, firstTap: -1, firstBig: -1, wowN: 0, taps: 0,
      seen: new Set<string>(), banner: null, spot: null, events: [], bigText: '', bigT: -999, bigY: 0.6,
    } as unknown as KickState;
    newStage(s);
    s.banner = null;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    s.pt++;
    if (s.phase === 'aim') {
      let c = -1;
      if (inp.pick !== undefined && inp.pick >= 0 && inp.pick < 3) c = 3 + inp.pick;
      else if (fresh) c = hitCell(p!.x, p!.y * A);
      if (c >= 0) {
        if (s.firstTap < 0) s.firstTap = s.t;
        shoot(s, c);
      }
    } else if (s.phase === 'shot') {
      if (s.pt === RUN) ev(s, 'boot', SPOT_X, SPOT_Y);
      if (s.pt >= SHOT_T) land(s);
    } else if (s.phase === 'res') {
      if (s.pt >= RES_T + (s.turn.out === 'goal' ? 8 : 0) || (fresh && s.pt > 26)) afterTurn(s);
    } else {
      const T = s.ok ? END_OK : END_FAIL;
      if (s.pt >= T || (fresh && s.pt > 60)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
    if (s.events.length > 60) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.spot && s.t - s.spot.t > 220) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const spotkick = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapCell = (c: number) => at(cellX(c), cellY(c));

/** 잘하는 봇: 상대 규칙(버릇·배우기·단서·찡긋·바람)을 알고 뒤 분포를 계산해, 골(막기) 기댓값이 가장 큰 칸 */
export function bestCell(s: KickState, read: Read = 'true'): number {
  const pv = preview(s, read), d = STAGES[s.stage];
  let best = 0, bv = -1;
  for (let c = 0; c < 6; c++) {
    let v = pv[c].good;
    // 별 욕심: 바람 별이 남았으면 바람에 밀리는 골에 조금 더
    if (s.turn.role === 'kick' && d.stars.some((q) => q.k === 'wind') && s.windGoals < 1 && s.turn.wind && pv[c].land >= 0 && pv[c].land !== c) v += 0.06;
    if (v > bv + 1e-9) (bv = v), (best = c);
  }
  return best;
}
const tapMem = new WeakMap<object, number>();
export const spotkickSmart: Bot<KickState> = {
  name: '단서·버릇을 읽고 기댓값 최고 칸',
  act(s) {
    if (s.phase !== 'aim' || s.down || s.pt < 8) return NO;
    const last = tapMem.get(s) ?? -99;
    if (s.t - last < 4) return NO;
    tapMem.set(s, s.t);
    return tapCell(bestCell(s));
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const spotkickRandom: Bot<KickState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.x = 0.03 + rng() * 0.94;
        m.y = 0.1 + rng() * 0.88;
      } else m.next = s.t + 12 + Math.floor(rng() * 50);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

const habitMem = new WeakMap<object, number>();
function habitTap(s: KickState, f: () => number): Input {
  if (s.phase !== 'aim' || s.down || s.pt < 8) return NO;
  const last = habitMem.get(s) ?? -99;
  if (s.t - last < 4) return NO;
  habitMem.set(s, s.t);
  return tapCell(f());
}
/** 버릇 봇: 늘 같은 칸(오른쪽 아래)만 차고 막는다 */
export const spotkickHabit: Bot<KickState> = {
  name: '늘 같은 칸',
  act: (s) => habitTap(s, () => 5),
};
/** 독립 버릇 봇: 칸을 차례로 돈다 (찰 때·막을 때 따로) */
export const spotkickHabit2: Bot<KickState> = {
  name: '칸을 차례로 돌기',
  act: (s) => habitTap(s, () => (s.memK.n * (s.turn.role === 'kick' ? 1 : 0) + s.memD.n * (s.turn.role === 'keep' ? 1 : 0) + s.stage) % 6),
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
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const OUT = '#4a2a12';
const MY_JERSEY = '#3d8df5', MY_JERSEY2 = '#d6e8ff';

// ── 동물 ──
type Face = 'idle' | 'focus' | 'happy' | 'smug' | 'shock' | 'dizzy' | 'sad' | 'sleep' | 'wink' | 'laugh';
type Arms = 'idle' | 'keeper' | 'up' | 'run' | 'head' | 'hug' | 'down' | 'cheer' | 'cross';
interface Pose {
  back: boolean; face: Face; lean: number; look: number; arms: Arms; step: number; kick: number; sq: number;
  tail: number; turn: number; jersey: string; jersey2: string; num: number; t: number; gloves: boolean;
}
const pose = (o: Partial<Pose>): Pose => ({ back: false, face: 'idle', lean: 0, look: 0, arms: 'idle', step: 0, kick: 0, sq: 0, tail: 0, turn: 0, jersey: MY_JERSEY, jersey2: MY_JERSEY2, num: 7, t: 0, gloves: false, ...o });
interface Skin { body: string; shade: string; belly: string; ear: string; inner: string; muzzle: string; nose: string }
const SKIN: Record<Kind, Skin> = {
  dog: { body: '#fff0d2', shade: '#dcbf90', belly: '#fffaf0', ear: '#b9773e', inner: '#e8a37a', muzzle: '#fffaf2', nose: '#3a2418' },
  bear: { body: '#b8783e', shade: '#86521f', belly: '#f0cf9e', ear: '#a0662f', inner: '#e8a880', muzzle: '#f4dcb4', nose: '#2a1608' },
  cat: { body: '#ffb24a', shade: '#e0801e', belly: '#fff4e2', ear: '#ffb24a', inner: '#ffb8b0', muzzle: '#fff4e2', nose: '#ff7a8a' },
  fox: { body: '#ff8a3a', shade: '#d05a16', belly: '#fff6ea', ear: '#ff8a3a', inner: '#fff0e0', muzzle: '#fff6ea', nose: '#2a1810' },
  raccoon: { body: '#aeacbc', shade: '#767490', belly: '#ecebf2', ear: '#767490', inner: '#4a4658', muzzle: '#f6f4fa', nose: '#2a2632' },
  owl: { body: '#c99560', shade: '#8a5a2e', belly: '#f6e4c4', ear: '#9a6a3e', inner: '#9a6a3e', muzzle: '#f6e4c4', nose: '#ffa12a' },
  lion: { body: '#ffc84a', shade: '#e0962a', belly: '#fff0c0', ear: '#ffc84a', inner: '#ff9f6a', muzzle: '#fff3d0', nose: '#7a3a1a' },
};
const MANE = ['#e0762a', '#c8561a'];

function drawTail(ctx: C2, k: Kind, S: Skin, H: number, by: number, wag: number, back: boolean, lw: number) {
  ctx.save();
  ctx.translate(back ? H * 0.07 : H * 0.1, by);
  ctx.rotate(wag);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  if (k === 'dog') {
    ctx.fillStyle = S.body;
    ctx.beginPath();
    ctx.moveTo(-H * 0.025, 0);
    ctx.quadraticCurveTo(-H * 0.05, -H * 0.13, H * 0.03, -H * 0.17);
    ctx.quadraticCurveTo(H * 0.06, -H * 0.12, H * 0.025, -H * 0.1);
    ctx.quadraticCurveTo(H * 0.0, -H * 0.06, H * 0.025, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (k === 'bear') {
    ctx.fillStyle = S.body;
    ell(ctx, 0, -H * 0.02, H * 0.045, H * 0.04);
    ctx.fill();
    ctx.stroke();
  } else if (k === 'cat' || k === 'lion') {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = H * 0.05 + lw;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(H * 0.08, -H * 0.02, H * 0.02, -H * 0.2, H * 0.12, -H * 0.3);
    ctx.stroke();
    ctx.strokeStyle = S.body;
    ctx.lineWidth = H * 0.05;
    ctx.stroke();
    if (k === 'cat') {
      ctx.strokeStyle = S.shade;
      ctx.lineWidth = H * 0.05;
      ctx.setLineDash([H * 0.03, H * 0.04]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = MANE[1];
      ell(ctx, H * 0.12, -H * 0.31, H * 0.04, H * 0.05);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  } else if (k === 'fox' || k === 'raccoon') {
    ctx.fillStyle = lin(ctx, 0, 0, 0, -H * 0.36, [0, S.body], [1, S.shade]);
    ctx.beginPath();
    ctx.moveTo(-H * 0.03, 0);
    ctx.bezierCurveTo(-H * 0.12, -H * 0.12, H * 0.02, -H * 0.3, H * 0.13, -H * 0.36);
    ctx.bezierCurveTo(H * 0.2, -H * 0.24, H * 0.12, -H * 0.08, H * 0.04, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.clip();
    if (k === 'fox') {
      ctx.fillStyle = '#fff6ea';
      ell(ctx, H * 0.14, -H * 0.34, H * 0.08, H * 0.07, -0.6);
      ctx.fill();
    } else {
      ctx.fillStyle = '#4a4658';
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(H * (0.0 + i * 0.04), -H * (0.06 + i * 0.085));
        ctx.rotate(-0.7);
        ctx.fillRect(-H * 0.15, -H * 0.018, H * 0.3, H * 0.036);
        ctx.restore();
      }
    }
    ctx.restore();
  } else if (k === 'owl') {
    ctx.fillStyle = S.shade;
    for (const a of [-0.35, 0, 0.35]) {
      ctx.save();
      ctx.rotate(a);
      ell(ctx, 0, H * 0.04, H * 0.025, H * 0.06);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function glove(ctx: C2, x: number, y: number, r: number, rot: number, col = '#f6ff6a') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = lin(ctx, 0, -r, 0, r, [0, '#ffffff'], [0.5, col], [1, '#c8d040']);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, r * 0.16);
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, r * 0.8);
  ctx.lineTo(-r * 0.75, -r * 0.2);
  ctx.quadraticCurveTo(-r * 0.75, -r * 0.95, 0, -r * 0.95);
  ctx.quadraticCurveTo(r * 0.75, -r * 0.95, r * 0.72, -r * 0.2);
  ctx.lineTo(r * 0.7, r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 엄지
  ctx.beginPath();
  ctx.ellipse(-r * 0.78, r * 0.05, r * 0.28, r * 0.42, -0.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff6a4a';
  ctx.fillRect(-r * 0.7, r * 0.5, r * 1.4, r * 0.3);
  ctx.restore();
}

/** 두 다리 · 몸 · 팔 · 머리. 발밑이 (x, y). H = 키 */
function drawCritter(ctx: C2, k: Kind, x: number, y: number, H: number, P: Pose) {
  const S = SKIN[k], lw = Math.max(1.3, H * 0.017), t = P.t;
  const hr = H * (k === 'owl' ? 0.285 : 0.275), hy = -H * 0.665;
  const bw = H * 0.17, bh = H * 0.17, byc = -H * 0.27;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(P.lean);
  ctx.scale(1 + P.sq * 0.5, 1 - P.sq);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  const tailA = P.tail + Math.sin(t * 0.25) * 0.15;
  if (!P.back) drawTail(ctx, k, S, H, byc + bh * 0.5, 0.5 + tailA, false, lw);
  // ── 다리 ──
  for (const sd of [-1, 1]) {
    const kickLeg = sd === 1 && P.kick !== 0;
    const st = sd * P.step;
    const fx = sd * H * 0.085 + (kickLeg ? H * 0.02 * P.kick : 0), fy = kickLeg ? -H * 0.13 * Math.max(0, P.kick) + H * 0.05 * Math.max(0, -P.kick) : -Math.max(0, st) * H * 0.06;
    const hx = sd * H * 0.065, hyp = -H * 0.13;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = H * 0.085 + lw * 2;
    ctx.beginPath();
    ctx.moveTo(hx, hyp);
    ctx.lineTo(fx, fy - H * 0.03);
    ctx.stroke();
    ctx.strokeStyle = P.jersey2;
    ctx.lineWidth = H * 0.085;
    ctx.stroke();
    // 양말 줄
    ctx.strokeStyle = P.jersey;
    ctx.lineWidth = H * 0.085;
    ctx.beginPath();
    ctx.moveTo(lerp(hx, fx, 0.55), lerp(hyp, fy - H * 0.03, 0.55));
    ctx.lineTo(lerp(hx, fx, 0.7), lerp(hyp, fy - H * 0.03, 0.7));
    ctx.stroke();
    // 축구화
    ctx.fillStyle = '#3a3048';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ell(ctx, fx + sd * H * 0.012, fy - H * 0.012, H * 0.058, H * 0.034, kickLeg ? -0.4 * P.kick : 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ell(ctx, fx + sd * H * 0.0, fy - H * 0.024, H * 0.025, H * 0.01);
    ctx.fill();
  }
  // ── 몸(유니폼) ──
  ctx.beginPath();
  ctx.moveTo(-bw * 0.82, byc - bh);
  ctx.quadraticCurveTo(0, byc - bh * 1.15, bw * 0.82, byc - bh);
  ctx.quadraticCurveTo(bw * 1.12, byc, bw * 0.98, byc + bh);
  ctx.quadraticCurveTo(0, byc + bh * 1.2, -bw * 0.98, byc + bh);
  ctx.quadraticCurveTo(-bw * 1.12, byc, -bw * 0.82, byc - bh);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -bw, 0, bw, 0, [0, P.jersey], [0.45, P.jersey], [1, 'rgba(0,0,0,.25)']);
  ctx.fill();
  ctx.fillStyle = lin(ctx, -bw, 0, bw, 0, [0, 'rgba(255,255,255,.28)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.18)']);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 바지
  ctx.fillStyle = P.jersey2;
  ctx.fillRect(-bw * 1.2, byc + bh * 0.35, bw * 2.4, bh);
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.fillRect(-bw * 1.2, byc + bh * 0.35, bw * 2.4, bh * 0.12);
  if (!P.back) {
    // 가운데 줄
    ctx.fillStyle = P.jersey2;
    ctx.fillRect(-bw * 0.12, byc - bh * 1.2, bw * 0.24, bh * 1.5);
  }
  ctx.restore();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.stroke();
  if (P.back) {
    ctx.font = `900 ${Math.max(8, H * 0.15)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(1.5, H * 0.02);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.strokeText(String(P.num), 0, byc - bh * 0.25);
    ctx.fillStyle = P.jersey2;
    ctx.fillText(String(P.num), 0, byc - bh * 0.25);
    drawTail(ctx, k, S, H, byc + bh * 0.55, tailA, true, lw);
  }
  // ── 팔 ──
  const sh = byc - bh * 0.62;
  for (const sd of [-1, 1]) {
    const sx = sd * bw * 0.88;
    let hx = sd * bw * 1.3, hy2 = byc + bh * 0.35;
    switch (P.arms) {
      case 'keeper': hx = sd * bw * 2.0; hy2 = sh - bh * 0.35 + Math.sin(t * 0.2 + sd) * H * 0.01; break;
      case 'up': hx = sd * bw * 0.95; hy2 = hy - hr * 1.05; break;
      case 'run': hx = sd * bw * 1.25 + Math.sin(t * 0.6) * sd * H * 0.03; hy2 = byc + Math.sin(t * 0.6 + (sd > 0 ? Math.PI : 0)) * H * 0.05; break;
      case 'head': hx = sd * hr * 0.75; hy2 = hy - hr * 0.55; break;
      case 'hug': hx = sd * bw * 0.45; hy2 = byc - bh * 0.15; break;
      case 'down': hx = sd * bw * 0.85; hy2 = byc + bh * 1.1; break;
      case 'cheer': hx = sd * bw * (sd > 0 ? 1.1 : 1.6); hy2 = sd > 0 ? hy - hr * 1.0 : sh - bh * 0.2 + Math.sin(t * 0.5) * H * 0.03; break;
      case 'cross': hx = -sd * bw * 0.35; hy2 = byc - bh * 0.25; break;
      default: hx = sd * bw * 1.3; hy2 = byc + bh * 0.35 + Math.sin(t * 0.08 + sd) * H * 0.006;
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = H * 0.07 + lw * 2;
    ctx.beginPath();
    ctx.moveTo(sx, sh);
    ctx.lineTo(hx, hy2);
    ctx.stroke();
    ctx.strokeStyle = k === 'owl' ? S.shade : S.body;
    ctx.lineWidth = H * 0.07;
    ctx.stroke();
    // 소매
    ctx.strokeStyle = P.jersey;
    ctx.beginPath();
    ctx.moveTo(sx, sh);
    ctx.lineTo(lerp(sx, hx, 0.35), lerp(sh, hy2, 0.35));
    ctx.stroke();
    if (P.gloves) glove(ctx, hx, hy2, H * 0.06, Math.atan2(hy2 - sh, hx - sx) + Math.PI / 2 + Math.PI);
    else {
      ctx.fillStyle = k === 'owl' ? S.shade : S.body;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw;
      ell(ctx, hx, hy2, H * 0.043, H * 0.043);
      ctx.fill();
      ctx.stroke();
    }
  }
  // ── 머리 ──
  drawHead(ctx, k, S, 0, hy, hr, P, lw);
  ctx.restore();
}

function drawHead(ctx: C2, k: Kind, S: Skin, x: number, y: number, r: number, P: Pose, lw: number) {
  const t = P.t;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  // 갈기 (사자)
  if (k === 'lion') {
    ctx.fillStyle = radg(ctx, 0, 0, r * 0.6, r * 1.45, [0, MANE[0]], [1, MANE[1]]);
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * TAU, q = i % 2 ? 1.18 : 1.42;
      const px = Math.cos(a) * r * q, py = Math.sin(a) * r * q * 0.98;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 귀 (머리 뒤)
  const earsBehind = () => {
    if (k === 'bear' || k === 'raccoon' || k === 'lion') {
      for (const sd of [-1, 1]) {
        const ex = sd * r * (k === 'lion' ? 0.78 : 0.68), ey = -r * (k === 'lion' ? 0.62 : 0.72), er = r * (k === 'raccoon' ? 0.27 : 0.3);
        ctx.fillStyle = S.ear;
        ell(ctx, ex, ey, er, er);
        ctx.fill();
        ctx.stroke();
        if (!P.back) {
          ctx.fillStyle = S.inner;
          ell(ctx, ex, ey + er * 0.1, er * 0.55, er * 0.55);
          ctx.fill();
        }
      }
    } else if (k === 'cat' || k === 'fox') {
      const big = k === 'fox' ? 1.18 : 1;
      for (const sd of [-1, 1]) {
        ctx.fillStyle = S.ear;
        ctx.beginPath();
        ctx.moveTo(sd * r * 0.2, -r * 0.82);
        ctx.lineTo(sd * r * 0.72 * big, -r * 1.22 * big + (k === 'cat' ? Math.sin(t * 0.07 + sd) * r * 0.03 : 0));
        ctx.lineTo(sd * r * 0.9, -r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = k === 'fox' ? '#3a2418' : S.inner;
        ctx.beginPath();
        if (k === 'fox') {
          ctx.moveTo(sd * r * 0.55 * big, -r * 1.05 * big);
          ctx.lineTo(sd * r * 0.72 * big, -r * 1.22 * big);
          ctx.lineTo(sd * r * 0.8 * big, -r * 0.98 * big);
        } else if (!P.back) {
          ctx.moveTo(sd * r * 0.35, -r * 0.8);
          ctx.lineTo(sd * r * 0.7, -r * 1.1);
          ctx.lineTo(sd * r * 0.8, -r * 0.5);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else if (k === 'owl') {
      for (const sd of [-1, 1]) {
        ctx.fillStyle = S.shade;
        ctx.beginPath();
        ctx.moveTo(sd * r * 0.35, -r * 0.85);
        ctx.lineTo(sd * r * 0.85, -r * 1.2);
        ctx.lineTo(sd * r * 0.8, -r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  };
  earsBehind();
  // 머리
  ctx.fillStyle = radg(ctx, -r * 0.3, -r * 0.35, r * 0.1, r * 1.15, [0, k === 'dog' ? '#fffaf0' : S.body], [0.7, S.body], [1, S.shade]);
  ell(ctx, 0, 0, r, r * 0.94);
  ctx.fill();
  ctx.stroke();
  if (P.back) {
    if (k === 'dog') {
      ctx.fillStyle = S.ear;
      ell(ctx, r * 0.35, -r * 0.35, r * 0.28, r * 0.22, 0.4);
      ctx.fill();
    } else if (k === 'cat') {
      ctx.strokeStyle = S.shade;
      ctx.lineWidth = r * 0.1;
      for (const dx of [-0.25, 0, 0.25]) {
        ctx.beginPath();
        ctx.moveTo(dx * r, -r * 0.85);
        ctx.lineTo(dx * r * 0.9, -r * 0.45);
        ctx.stroke();
      }
    } else if (k === 'lion') {
      ctx.fillStyle = radg(ctx, 0, 0, r * 0.2, r * 1.1, [0, MANE[0]], [1, MANE[1]]);
      ell(ctx, 0, 0, r * 0.98, r * 0.92);
      ctx.fill();
    }
    if (k === 'dog') {
      // 늘어진 귀 (뒤에서)
      for (const sd of [-1, 1]) {
        ctx.fillStyle = S.ear;
        ctx.strokeStyle = OUT;
        ctx.lineWidth = lw;
        ell(ctx, sd * r * 0.74 - P.turn * r * 0.12, -r * 0.3 + Math.sin(t * 0.1 + sd) * r * 0.03, r * 0.22, r * 0.4, sd * 0.25);
        ctx.fill();
        ctx.stroke();
      }
    }
    // 힐끔 (고개를 돌려 한쪽 눈이 보임)
    if (P.turn) {
      const sd = Math.sign(P.turn), q = Math.abs(P.turn);
      ctx.save();
      ell(ctx, 0, 0, r, r * 0.94);
      ctx.clip();
      ctx.fillStyle = k === 'owl' ? S.belly : S.muzzle;
      ell(ctx, sd * r * (1.05 - 0.25 * q), r * 0.18, r * 0.42 * q, r * 0.3);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw;
      // 눈
      const ex = sd * r * (0.86 - 0.12 * q), ey = -r * 0.05;
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex, ey, r * 0.13 * q + r * 0.05, r * 0.17);
      ctx.fill();
      ctx.stroke();
      if (P.face === 'wink') {
        ctx.strokeStyle = OUT;
        ctx.lineWidth = lw * 1.6;
        ctx.beginPath();
        ctx.moveTo(ex - r * 0.1, ey);
        ctx.quadraticCurveTo(ex, ey - r * 0.1, ex + r * 0.1, ey);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#2a1a10';
        ell(ctx, ex + sd * r * 0.05, ey + r * 0.01, r * 0.07, r * 0.1);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ell(ctx, ex + sd * r * 0.03, ey - r * 0.03, r * 0.025, r * 0.03);
        ctx.fill();
      }
      // 코끝
      ctx.fillStyle = k === 'owl' ? S.nose : S.nose;
      ell(ctx, sd * r * (1.0 - 0.1 * q) + sd * r * 0.12 * q, r * 0.18, r * 0.07, r * 0.055);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  // ── 얼굴 ──
  const look = P.look * r * 0.06;
  if (k === 'owl') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#fff6e0';
      ell(ctx, sd * r * 0.4, -r * 0.05, r * 0.36, r * 0.36);
      ctx.fill();
      ctx.strokeStyle = '#e0a040';
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
    }
  }
  if (k === 'raccoon') {
    ctx.fillStyle = '#4a4658';
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.02, r * 0.3, r * 0.2, -0.25, 0, TAU);
    ctx.ellipse(r * 0.4, -r * 0.02, r * 0.3, r * 0.2, 0.25, 0, TAU);
    ctx.fill();
  }
  if (k === 'cat') {
    ctx.strokeStyle = S.shade;
    ctx.lineWidth = r * 0.09;
    for (const dx of [-0.2, 0, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(dx * r, -r * 0.9);
      ctx.lineTo(dx * r * 0.9, -r * 0.6);
      ctx.stroke();
    }
  }
  if (k === 'dog') {
    ctx.fillStyle = S.ear;
    ell(ctx, r * 0.38, -r * 0.12, r * 0.24, r * 0.22, 0.3);
    ctx.fill();
  }
  // 주둥이
  if (k !== 'owl') {
    ctx.fillStyle = S.muzzle;
    ctx.strokeStyle = 'rgba(74,42,18,.35)';
    ctx.lineWidth = lw * 0.8;
    ell(ctx, 0, r * 0.32, r * (k === 'cat' ? 0.34 : 0.42), r * 0.28);
    ctx.fill();
    if (k === 'fox') {
      ctx.fillStyle = S.belly;
      ell(ctx, -r * 0.45, r * 0.3, r * 0.3, r * 0.22, 0.4);
      ctx.fill();
      ell(ctx, r * 0.45, r * 0.3, r * 0.3, r * 0.22, -0.4);
      ctx.fill();
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,120,130,.38)';
  ell(ctx, -r * 0.62, r * 0.28, r * 0.15, r * 0.1);
  ctx.fill();
  ell(ctx, r * 0.62, r * 0.28, r * 0.15, r * 0.1);
  ctx.fill();
  // 눈
  const er = r * (k === 'owl' ? 0.17 : 0.12), ex = r * (k === 'owl' ? 0.4 : 0.36), ey = -r * 0.04;
  ctx.strokeStyle = OUT;
  const f = P.face;
  const blink = (f === 'idle' || f === 'focus') && t % 200 < 6;
  for (const sd of [-1, 1]) {
    const cx = sd * ex + look, cy = ey;
    const winkThis = f === 'wink' && sd === 1;
    ctx.lineWidth = lw * 1.4;
    if (f === 'happy' || f === 'laugh' || winkThis || blink || f === 'sleep') {
      ctx.beginPath();
      if (f === 'sleep' || blink) {
        ctx.moveTo(cx - er, cy);
        ctx.quadraticCurveTo(cx, cy + er * 0.8, cx + er, cy);
      } else {
        ctx.moveTo(cx - er, cy + er * 0.3);
        ctx.quadraticCurveTo(cx, cy - er * 1.1, cx + er, cy + er * 0.3);
      }
      ctx.stroke();
    } else if (f === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < TAU * 1.6; a += 0.3) {
        const rr2 = er * (a / (TAU * 1.6));
        const px = cx + Math.cos(a + t * 0.3) * rr2, py = cy + Math.sin(a + t * 0.3) * rr2;
        a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    } else if (f === 'shock') {
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx, cy, er * 1.25, er * 1.35);
      ctx.fill();
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.fillStyle = '#2a1a10';
      ell(ctx, cx, cy, er * 0.4, er * 0.45);
      ctx.fill();
    } else if (f === 'smug') {
      ctx.fillStyle = '#2a1a10';
      ell(ctx, cx + r * 0.03, cy + er * 0.2, er * 0.75, er * 0.75);
      ctx.fill();
      ctx.fillStyle = S.body;
      ctx.fillRect(cx - er * 1.2, cy - er * 1.4, er * 2.4, er * 1.4);
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      ctx.moveTo(cx - er * 1.0, cy + er * 0.05);
      ctx.lineTo(cx + er * 1.0, cy - er * 0.05);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#2a1a10';
      ell(ctx, cx, cy, er * 0.85, er);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx - er * 0.3, cy - er * 0.4, er * 0.32, er * 0.32);
      ctx.fill();
      ell(ctx, cx + er * 0.3, cy + er * 0.35, er * 0.14, er * 0.14);
      ctx.fill();
    }
    // 눈썹
    if (f === 'focus' || f === 'sad' || f === 'smug') {
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      const up = f === 'sad' ? 1 : f === 'smug' ? -0.35 : -1;
      ctx.moveTo(cx - sd * er * 1.1, cy - er * 1.7 - (f === 'smug' ? er * 0.3 : 0));
      ctx.lineTo(cx + sd * er * 1.0, cy - er * 1.7 + up * er * 0.6);
      ctx.stroke();
    }
  }
  // 코 · 입
  if (k === 'owl') {
    ctx.fillStyle = S.nose;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, r * 0.12);
    ctx.lineTo(r * 0.1, r * 0.12);
    ctx.lineTo(0, r * (f === 'shock' || f === 'laugh' ? 0.42 : 0.34));
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.stroke();
  } else {
    ctx.fillStyle = S.nose;
    ell(ctx, 0, r * 0.18, r * 0.1, r * 0.07);
    ctx.fill();
    ctx.lineWidth = lw * 1.1;
    ctx.strokeStyle = OUT;
    const my = r * 0.36;
    ctx.beginPath();
    if (f === 'happy' || f === 'laugh') {
      ctx.moveTo(-r * 0.2, my - r * 0.04);
      ctx.quadraticCurveTo(0, my + r * 0.3, r * 0.2, my - r * 0.04);
      ctx.closePath();
      ctx.fillStyle = '#c0303a';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff8a9a';
      ell(ctx, 0, my + r * 0.12, r * 0.08, r * 0.05);
      ctx.fill();
    } else if (f === 'shock') {
      ell(ctx, 0, my + r * 0.06, r * 0.1, r * 0.13);
      ctx.fillStyle = '#7a2030';
      ctx.fill();
      ctx.stroke();
    } else if (f === 'sad' || f === 'dizzy') {
      ctx.moveTo(-r * 0.14, my + r * 0.08);
      ctx.quadraticCurveTo(0, my - r * 0.04, r * 0.14, my + r * 0.08);
      ctx.stroke();
    } else if (f === 'smug') {
      ctx.moveTo(-r * 0.15, my);
      ctx.quadraticCurveTo(r * 0.05, my + r * 0.06, r * 0.2, my - r * 0.07);
      ctx.stroke();
    } else if (f === 'wink') {
      ctx.moveTo(-r * 0.14, my);
      ctx.quadraticCurveTo(0, my + r * 0.14, r * 0.14, my);
      ctx.stroke();
      ctx.fillStyle = '#ff7a8a';
      ell(ctx, r * 0.04, my + r * 0.09, r * 0.06, r * 0.05);
      ctx.fill();
    } else {
      ctx.moveTo(-r * 0.12, my);
      ctx.quadraticCurveTo(-r * 0.06, my + r * 0.07, 0, my);
      ctx.quadraticCurveTo(r * 0.06, my + r * 0.07, r * 0.12, my);
      ctx.stroke();
    }
    if (k === 'cat') {
      ctx.strokeStyle = 'rgba(74,42,18,.6)';
      ctx.lineWidth = lw * 0.7;
      for (const sd of [-1, 1])
        for (const dy of [-0.04, 0.06]) {
          ctx.beginPath();
          ctx.moveTo(sd * r * 0.3, r * (0.25 + dy));
          ctx.lineTo(sd * r * 0.75, r * (0.2 + dy * 1.6));
          ctx.stroke();
        }
    }
  }
  if (k === 'dog') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = S.ear;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw;
      ell(ctx, sd * r * 0.92, -r * 0.12 + Math.sin(t * 0.1 + sd) * r * 0.03, r * 0.24, r * 0.44, sd * 0.3);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (f === 'sleep') {
    ctx.fillStyle = '#5a7ad0';
    ctx.font = `900 ${Math.max(10, r * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const zz = (t * 0.02) % 1;
    ctx.globalAlpha = 1 - zz;
    ctx.fillText('Z', r * (0.9 + zz * 0.5), -r * (0.8 + zz * 0.8));
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 축구공 */
function drawBall(ctx: C2, x: number, y: number, r: number, spin: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = radg(ctx, -r * 0.35, -r * 0.4, r * 0.1, r * 1.2, [0, '#ffffff'], [0.7, '#f2f2f2'], [1, '#b8bcc8']);
  ell(ctx, 0, 0, r, r);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.rotate(spin);
  ctx.fillStyle = '#2a2a3a';
  const pent = (px: number, py: number, q: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 5;
      i ? ctx.lineTo(px + Math.cos(a) * q, py + Math.sin(a) * q) : ctx.moveTo(px + Math.cos(a) * q, py + Math.sin(a) * q);
    }
    ctx.closePath();
    ctx.fill();
  };
  pent(0, 0, r * 0.36);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5 + Math.PI / 5;
    pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3);
  }
  ctx.restore();
  ctx.strokeStyle = '#3a3a4a';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ell(ctx, 0, 0, r, r);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ell(ctx, -r * 0.4, -r * 0.45, r * 0.22, r * 0.14, -0.6);
  ctx.fill();
  ctx.restore();
}
function paw(ctx: C2, x: number, y: number, r: number, col: string) {
  ctx.fillStyle = col;
  ell(ctx, x, y + r * 0.25, r * 0.55, r * 0.45);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.55;
    ell(ctx, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.75, r * 0.22, r * 0.26);
    ctx.fill();
  }
}
/** 잔디 위 병아리 구경꾼 (쪼다가 골이면 폴짝) */
function drawChick(ctx: C2, x: number, y: number, r: number, t: number, jump: number, face: number) {
  const peck = jump > 0 ? 0 : Math.max(0, Math.sin(t * 0.07)) ** 8;
  ctx.fillStyle = 'rgba(30,60,20,.28)';
  ell(ctx, x, y + r * 0.1, r * 0.8, r * 0.22);
  ctx.fill();
  const yy = y - jump * r * 1.6;
  ctx.save();
  ctx.translate(x, yy);
  ctx.scale(face, 1);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.strokeStyle = '#e08a1a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.1);
  ctx.lineTo(-r * 0.25, r * 0.05);
  ctx.moveTo(r * 0.15, -r * 0.1);
  ctx.lineTo(r * 0.2, r * 0.05);
  ctx.stroke();
  ctx.strokeStyle = OUT;
  ctx.fillStyle = lin(ctx, 0, -r * 1.2, 0, 0, [0, '#fff6a0'], [1, '#ffd23a']);
  ell(ctx, 0, -r * 0.55, r * 0.6, r * 0.5);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(r * 0.3, -r * 1.0);
  ctx.rotate(peck * 0.9);
  ell(ctx, 0, 0, r * 0.38, r * 0.36);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a1a10';
  ell(ctx, r * 0.12, -r * 0.05, r * 0.06, r * 0.08);
  ctx.fill();
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -r * 0.02);
  ctx.lineTo(r * 0.55, r * 0.05);
  ctx.lineTo(r * 0.3, r * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // 날개
  ctx.fillStyle = '#ffe070';
  ell(ctx, -r * 0.12, -r * 0.55 - jump * r * 0.2, r * 0.3, r * 0.2, jump ? -0.8 : 0.3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/** 손가락 (안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.3);
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, k * 0.2, k * 1.25, k * 0.4, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, k * 0.08);
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
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ── 골대 ──
const FL = 0.062, FR = 0.938, CB = 0.418, PT = 0.017;
const BL = 0.145, BR = 0.855, BT = 0.392, BG = 0.735;
/** 뒤 그물 위의 점 (u: 0~1 왼→오, v: 0~1 위→아래) */
const backPt = (u: number, v: number): [number, number] => [lerp(BL, BR, u), lerp(BT, BG, v)];

// ── 관중 ──
type Fan = { x: number; y: number; r: number; k: number; side: number; pop: boolean; ph: number; row: number };
const FANS: Fan[] = [];
for (let row = 0; row < 3; row++) {
  const n = 12 + row, y = 0.205 + row * 0.045, r = 0.021 + row * 0.003;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5 + (row % 2) * 0.35) / n + (hsh(i * 7 + row * 31) - 0.5) * 0.02;
    FANS.push({ x, y: y + (hsh(i + row * 17) - 0.5) * 0.006, r, k: Math.floor(hsh(i * 3 + row * 11) * 6), side: x < 0.5 ? 0 : 1, pop: hsh(i * 13 + row * 5) > 0.72, ph: hsh(i + row * 3) * 10, row });
  }
}
const FAN_COL = ['#ffffff', '#ffe08a', '#ffb3c8', '#c8f0a0', '#d8c8ff', '#b8e4ff'];

// ── 연출 기억 (상태와 무관) ──
interface Conf { x: number; y: number; vx: number; vy: number; rot: number; vr: number; col: string; life: number }
interface Vis { ev: number; netT: number; netX: number; netY: number; netK: number; waveT: number; waveSide: number; spillT: number; spillX: number; spillY: number; conf: Conf[]; corn: Conf[]; seed: number; slow: number }
const VIS = new WeakMap<object, Vis>();
const visOf = (s: KickState): Vis => {
  let v = VIS.get(s);
  if (!v) VIS.set(s, (v = { ev: -1, netT: -999, netX: 0.5, netY: 0.6, netK: 1, waveT: -999, waveSide: -1, spillT: -999, spillX: 0.5, spillY: 0.25, conf: [], corn: [], seed: 7, slow: 0 }));
  return v;
};
function confetti(v: Vis, n: number, x0: number, x1: number, y: number) {
  const cols = ['#ff5a6a', '#ffd23a', '#5ad0ff', '#7ae06a', '#c08aff', '#ff9a3a', '#ffffff'];
  for (let i = 0; i < n; i++) {
    v.seed = (v.seed * 16807) % 2147483647;
    const a = v.seed / 2147483647;
    v.seed = (v.seed * 16807) % 2147483647;
    const b = v.seed / 2147483647;
    v.conf.push({ x: lerp(x0, x1, a), y: y - b * 0.1, vx: (b - 0.5) * 0.006, vy: 0.002 + a * 0.004, rot: a * 6, vr: (b - 0.5) * 0.4, col: cols[i % cols.length], life: 140 + Math.floor(a * 60) });
  }
  if (v.conf.length > 260) v.conf.splice(0, v.conf.length - 260);
}

// ── 공의 길 ──
interface BallAt { x: number; y: number; r: number; gx: number; gy: number; show: boolean; inNet: boolean; spin: number }
/** 날아가는 끝점 (화면 x, y) — 골·막힘은 칸, 빗나감은 골대 밖 */
function shotEnd(s: KickState): [number, number] {
  const tu = s.turn, j = hsh(tu.n * 7 + s.stage * 13 + s.tries * 3);
  const b = tu.ball;
  if (tu.miss === 'blown') return [tu.wind < 0 ? -0.04 : 1.04, cellY(tu.aim) - 0.05];
  if (b < 0) return [0.5, GY0];
  const c = colOf(b), r = rowOf(b);
  const bx = cellX(b) + (c === 0 ? -0.05 : c === 2 ? 0.05 : (j - 0.5) * 0.08), by = cellY(b) + (r === 0 ? -0.035 : 0.04) + (j - 0.5) * 0.03;
  if (tu.miss === 'over') return [bx, CB - 0.07];
  if (tu.miss === 'wide') return [c === 2 ? FR + 0.06 : c === 0 ? FL - 0.06 : j < 0.5 ? FL - 0.06 : FR + 0.06, by];
  if (tu.miss === 'post') return c === 0 ? [FL + 0.005, by] : c === 2 ? [FR - 0.005, by] : [bx, CB + 0.005];
  return [bx, by];
}
/** 관중석에 떨어지는 곳 */
function standSpot(s: KickState): [number, number] {
  const tu = s.turn, [ex] = shotEnd(s), j = hsh(tu.n * 5 + s.stage * 3 + 1);
  const x = tu.miss === 'blown' ? (tu.wind < 0 ? 0.08 : 0.92) : tu.miss === 'wide' || tu.miss === 'post' ? (ex < 0.5 ? 0.06 + j * 0.12 : 0.82 + j * 0.12) : clamp(ex + (j - 0.5) * 0.2, 0.08, 0.92);
  return [clamp(x, 0.15, 0.85), 0.215 + j * 0.08];
}
/** 날기 시간 → 진행 (슬로모션: 끝 25%를 45%의 시간 동안) */
function flyU(f: number) {
  const a = 0.55 * FLY;
  if (f <= 0) return 0;
  if (f < a) return 0.75 * ease(f / a) ** 0.9;
  return Math.min(1, 0.75 + 0.25 * ((f - a) / (FLY - a)));
}
function ballAt(s: KickState): BallAt {
  const tu = s.turn, base: BallAt = { x: SPOT_X, y: SPOT_Y, r: 0.032, gx: SPOT_X, gy: SPOT_Y, show: true, inNet: false, spin: 0 };
  if (s.phase === 'aim' || s.phase === 'end') return base;
  const f = s.phase === 'shot' ? s.pt - RUN : FLY + s.pt;
  if (f <= 0) return base;
  const [tx, ty] = shotEnd(s);
  const u = flyU(Math.min(f, FLY));
  const gyEnd = Math.min(LINE_Y, Math.max(ty, LINE_Y - 0.02));
  const endAlt = Math.max(0, LINE_Y - ty);
  const gx = lerp(SPOT_X, tx, u), gy = lerp(SPOT_Y, gyEnd, u);
  const alt = endAlt * Math.pow(u, 1.25) + Math.sin(Math.PI * u) * 0.04;
  const r = lerp(0.032, 0.021, u);
  if (f <= FLY) return { x: gx, y: gy - alt, r, gx, gy, show: true, inNet: false, spin: f * 0.5 };
  // 닿은 뒤
  const q = f - FLY;
  if (tu.out === 'goal') {
    const v = clamp(q / 16, 0, 1), [bx, by] = backPt((tx - FL) / (FR - FL), clamp((ty - CB) / (LINE_Y - CB), 0, 1));
    const x = lerp(tx, bx, ease(v)), yTop = lerp(ty, by, ease(v));
    const fall = clamp((q - 16) / 18, 0, 1), y = lerp(yTop, BG - 0.015, fall * fall) - Math.abs(Math.sin(fall * Math.PI * 2)) * 0.02 * (1 - fall);
    return { x, y, r: r * 0.9, gx: x, gy: BG, show: true, inNet: true, spin: FLY * 0.5 + q * 0.2 };
  }
  if (tu.out === 'save') {
    const kd = kDive(s), caught = kd === tu.ball;
    if (caught) {
      const kp = keeperAt(s);
      return { x: kp.hx, y: kp.hy, r, gx: kp.hx, gy: LINE_Y, show: q < 200, inNet: false, spin: FLY * 0.5 };
    }
    const dir = tx < 0.5 ? -1 : 1, v = clamp(q / 30, 0, 1);
    const x = tx + dir * 0.32 * v, y = lerp(ty, LINE_Y + 0.06, v) - Math.sin(Math.PI * v) * 0.14;
    return { x, y, r, gx: x, gy: lerp(LINE_Y, LINE_Y + 0.06, v), show: v < 1, inNet: false, spin: FLY * 0.5 - q * 0.4 };
  }
  // 빗나감: 관중석으로
  const [sx, sy] = standSpot(s), v = clamp(q / 26, 0, 1);
  const x = lerp(tx, sx, ease(v)), y = lerp(ty, sy, ease(v)) - Math.sin(Math.PI * v) * 0.08;
  return { x, y, r: lerp(r, 0.016, v), gx: x, gy: lerp(LINE_Y, 0.37, v), show: v < 1, inNet: false, spin: FLY * 0.5 + q * 0.6 };
}

// ── 골키퍼 ──
const KH = 0.3, KICK_H = 0.31;
/** 골키퍼가 뛴 칸 (-1 = 안 뜀) */
const kDive = (s: KickState) => (s.turn.role === 'kick' ? s.turn.opp : s.turn.pick);
interface KeeperAt { cx: number; cy: number; rot: number; face: Face; arms: Arms; lean: number; look: number; hx: number; hy: number; sq: number }
function keeperAt(s: KickState): KeeperAt {
  const tu = s.turn, mine = tu.role === 'keep', t = s.t;
  const idle = { cx: 0.5, cy: LINE_Y - KH * 0.45 };
  const k: KeeperAt = { cx: idle.cx, cy: idle.cy, rot: 0, face: 'focus', arms: 'keeper', lean: 0, look: 0, hx: 0.5, hy: 0.6, sq: 0 };
  const handsUp = () => {
    const c = Math.cos(k.rot), sn = Math.sin(k.rot), lx = 0, ly = KH * (k.arms === 'up' ? -0.5 : k.arms === 'down' ? 0.34 : k.arms === 'hug' ? 0.15 : -0.12);
    k.hx = k.cx + lx * c - ly * sn;
    k.hy = k.cy + lx * sn + ly * c;
  };
  if (s.phase === 'aim' || s.phase === 'end') {
    k.cy += Math.abs(Math.sin(t * 0.09)) * -0.006;
    if (s.phase === 'aim' && !mine) {
      if (tu.asleep) (k.face = 'sleep'), (k.arms = 'idle');
      else if (tu.tell >= 0) {
        const sd = tu.tell - 1;
        k.lean = sd * 0.2 + Math.sin(t * 0.12) * 0.04 * (sd ? 1 : 0);
        k.cx += sd * (0.03 + Math.sin(t * 0.12) * 0.008);
        k.look = sd;
        if (!sd) k.cy -= Math.abs(Math.sin(t * 0.18)) * 0.02;
        if (tu.wink) k.face = 'wink';
      } else k.lean = Math.sin(t * 0.05) * 0.04;
    } else k.lean = Math.sin(t * 0.07) * 0.06;
    if (s.phase === 'end') (k.face = s.ok ? 'dizzy' : 'smug'), (k.arms = s.ok ? 'head' : 'cross'), (k.lean = 0);
    handsUp();
    return k;
  }
  const d = kDive(s);
  const f = s.phase === 'shot' ? s.pt - RUN : FLY + s.pt;
  const u = flyU(Math.min(f, FLY));
  if (d < 0) {
    // 졸던 곰
    k.face = s.phase === 'res' ? 'shock' : 'sleep';
    k.arms = s.phase === 'res' ? 'head' : 'idle';
    handsUp();
    return k;
  }
  const c = colOf(d), r = rowOf(d), sd = c - 1;
  let tx = cellX(d) + sd * 0.012, ty = cellY(d) + 0.01, trot = sd * (r === 0 ? 1.05 : 1.42);
  if (!sd) (tx = 0.5), (ty = r === 0 ? cellY(1) + 0.05 : LINE_Y - KH * 0.36), (trot = 0);
  const v = ease(clamp((u - 0.12) / 0.8, 0, 1));
  k.cx = lerp(idle.cx, tx, v);
  k.cy = lerp(idle.cy, ty, v) - Math.sin(Math.PI * v) * (sd ? 0.04 : 0);
  k.rot = lerp(0, trot, v);
  k.arms = !sd && r === 1 ? 'down' : 'up';
  k.face = 'focus';
  if (s.phase === 'res') {
    const q = s.pt, out = tu.out;
    const fall = clamp(q / 12, 0, 1);
    const groundY = LINE_Y - KH * (sd ? 0.16 : 0.45);
    if (sd) {
      k.cy = lerp(ty, groundY, fall * fall);
      k.rot = lerp(trot, sd * Math.PI / 2, fall);
    } else if (r === 0) k.cy = lerp(ty, idle.cy, fall * fall);
    if (out === 'save') {
      k.arms = d === tu.ball ? 'hug' : 'up';
      if (q > 22) {
        // 일어나 우쭐
        const g = clamp((q - 22) / 8, 0, 1);
        k.cx = lerp(k.cx, lerp(tx, 0.5, 0.4), g);
        k.cy = lerp(k.cy, idle.cy, g) - Math.abs(Math.sin(q * 0.25)) * 0.012 * g;
        k.rot = lerp(k.rot, 0, g);
        k.face = mine ? 'happy' : 'smug';
        k.arms = d === tu.ball ? 'hug' : mine ? 'cheer' : 'cross';
        k.lean = mine ? 0 : -0.12;
      } else k.face = 'focus';
    } else if (out === 'goal') {
      k.face = q > 8 ? 'dizzy' : 'shock';
      k.arms = 'up';
      if (!sd && q > 6) {
        // 가운데서 놓치면 털썩 주저앉아 머리를 감싼다
        const g = clamp((q - 6) / 8, 0, 1);
        k.cy = lerp(k.cy, idle.cy + KH * 0.08, g);
        k.sq = 0.12 * g;
        k.arms = 'head';
      }
    } else {
      k.face = q > 10 ? (mine ? 'happy' : 'shock') : 'focus';
      if (q > 18) {
        const g = clamp((q - 18) / 8, 0, 1);
        k.cy = lerp(k.cy, idle.cy, g);
        k.rot = lerp(k.rot, 0, g);
        k.arms = mine ? 'cheer' : 'head';
      }
    }
  }
  handsUp();
  return k;
}

// ── 키커 ──
interface KickerAt { x: number; y: number; back: boolean; face: Face; arms: Arms; step: number; kick: number; lean: number; turn: number; tail: number; sq: number }
const K0X = 0.37, K0Y = 1.32, K1X = 0.455, K1Y = 1.185;
function kickerAt(s: KickState): KickerAt {
  const tu = s.turn, mine = tu.role === 'kick', t = s.t;
  const k: KickerAt = { x: K0X, y: K0Y, back: true, face: 'focus', arms: 'idle', step: 0, kick: 0, lean: 0, turn: 0, tail: 0, sq: 0 };
  if (s.phase === 'aim' || s.phase === 'end') {
    k.sq = Math.sin(t * 0.12) * 0.02;
    if (mine) k.turn = 0.5;
    if (s.phase === 'aim' && !mine && tu.tell >= 0) {
      const sd = tu.tell - 1;
      k.turn = sd ? sd * (0.75 + 0.25 * Math.sin(t * 0.1)) : 0;
      k.tail = sd ? sd * 0.7 + Math.sin(t * 0.35) * 0.35 : Math.sin(t * 0.4) * 0.5;
      if (tu.wink) k.face = 'wink';
    } else k.tail = Math.sin(t * 0.15) * 0.3;
    if (s.phase === 'end') {
      const win = s.ok;
      k.back = false;
      k.face = win ? 'happy' : 'sad';
      k.arms = win ? 'up' : 'idle';
      k.y -= win ? Math.abs(Math.sin(t * 0.2)) * 0.03 : 0;
    }
    return k;
  }
  if (s.phase === 'shot') {
    const q = s.pt, v = clamp(q / RUN, 0, 1);
    k.x = lerp(K0X, K1X, v);
    k.y = lerp(K0Y, K1Y, v) - Math.abs(Math.sin(v * Math.PI * 3)) * 0.02;
    k.step = q < RUN - 3 ? Math.sin(q * 0.75) : 0;
    k.arms = 'run';
    k.lean = -0.08;
    k.turn = 0.4;
    k.kick = q < RUN - 3 ? 0 : q < RUN ? -1 : q < RUN + 8 ? 1 : 0.6;
    if (q >= RUN) (k.lean = 0.12), (k.arms = 'keeper');
    k.tail = 0.6;
    return k;
  }
  // 결과: 돌아서서 반응
  const q = s.pt, out = tu.out;
  k.x = K1X;
  k.y = K1Y;
  const myWin = mine ? out === 'goal' : out !== 'goal';
  if (q < 6) {
    k.kick = 0.6;
    k.lean = 0.12;
    return k;
  }
  k.back = false;
  if (out === 'goal') {
    k.face = 'happy';
    k.arms = 'up';
    k.y -= Math.abs(Math.sin(q * 0.22)) * 0.05;
    k.sq = Math.sin(q * 0.44) * 0.05;
  } else if (out === 'save') {
    k.face = 'sad';
    k.arms = 'idle';
    k.lean = Math.sin(q * 0.1) * 0.05;
  } else {
    k.face = 'shock';
    k.arms = 'head';
    k.lean = Math.sin(q * 0.4) * 0.06;
  }
  void myWin;
  return k;
}

// ── 배경 (크기별로 한 번 그려 둔다) ──
const BGC = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
const HORIZ = 0.372;
function getBg(w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${w}x${h}@${sc}`;
  const hit = BGC.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w;
  const c = layer(w, h, sc, (g) => {
    // 하늘
    g.fillStyle = lin(g, 0, 0, 0, R(0.2), [0, '#5cc0ff'], [0.7, '#a8e2ff'], [1, '#e8f8ff']);
    g.fillRect(0, 0, w, R(0.21));
    g.fillStyle = radg(g, R(0.88), R(0.1), 0, R(0.5), [0, 'rgba(255,250,210,.95)'], [0.3, 'rgba(255,245,200,.4)'], [1, 'rgba(255,245,200,0)']);
    g.fillRect(0, 0, w, R(0.3));
    for (let i = 0; i < 4; i++) {
      const cx = R(0.08 + i * 0.28 + hsh(i) * 0.06), cy = R(0.12 + hsh(i + 3) * 0.03), cw = R(0.09 + hsh(i + 5) * 0.05);
      g.fillStyle = 'rgba(255,255,255,.95)';
      g.beginPath();
      for (const [dx, dy, q] of [[-0.5, 0.1, 0.4], [0, -0.15, 0.55], [0.5, 0.1, 0.42], [0.2, 0.15, 0.4]]) {
        g.moveTo(cx + dx * cw + q * cw, cy + dy * cw);
        g.arc(cx + dx * cw, cy + dy * cw, q * cw, 0, TAU);
      }
      g.fill();
    }
    // 관중석 지붕 · 계단
    const st0 = R(0.168);
    g.fillStyle = lin(g, 0, st0 - R(0.02), 0, st0 + R(0.01), [0, '#ff7a5a'], [1, '#d84a2a']);
    g.beginPath();
    g.moveTo(0, st0 + R(0.01));
    for (let i = 0; i <= 12; i++) g.quadraticCurveTo(R((i - 0.5) / 12), st0 - R(0.012), R(i / 12), st0 + R(0.01));
    g.lineTo(w, st0 - R(0.03));
    g.lineTo(0, st0 - R(0.03));
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.moveTo(R(i / 12), st0 - R(0.025));
      g.lineTo(R((i + 0.5) / 12), st0 - R(0.025));
      g.quadraticCurveTo(R((i + 0.25) / 12), st0 + R(0.004), R(i / 12), st0 - R(0.025));
      g.fill();
    }
    for (let row = 0; row < 4; row++) {
      const y0 = st0 + R(0.012) + row * R(0.04);
      g.fillStyle = row % 2 ? '#6aa8e8' : '#5a96d8';
      g.fillRect(0, y0, w, R(0.042));
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(0, y0, w, R(0.004));
      // 좌석
      for (let i = 0; i < 18; i++) {
        g.fillStyle = (i + row) % 3 === 0 ? '#ffd23a' : (i + row) % 3 === 1 ? '#ff6a5a' : '#ffffff';
        rr(g, R((i + 0.15 + (row % 2) * 0.5) / 18), y0 + R(0.02), R(0.032), R(0.014), R(0.004));
        g.fill();
      }
    }
    // 광고판 (글씨 없이 무늬만)
    const ab0 = R(0.334), ab1 = R(HORIZ);
    const cols = ['#ff5a4a', '#ffd23a', '#3dc06a', '#3d8df5', '#a86af0', '#ff8ac0'];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[i];
      g.fillRect(R(i / 6), ab0, R(1 / 6) + 1, ab1 - ab0);
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let q = 0; q < 3; q++) {
        starPath(g, R((i + 0.25 + q * 0.25) / 6), (ab0 + ab1) / 2, R(0.008));
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.3)';
      g.fillRect(R(i / 6), ab0, R(1 / 6), R(0.006));
    }
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(0, ab1 - R(0.004), w, R(0.006));
    // 잔디: 깎은 줄무늬 (원근)
    const gy0 = R(HORIZ), gy1 = h;
    g.fillStyle = lin(g, 0, gy0, 0, gy1, [0, '#8ed65a'], [0.5, '#7ccb4a'], [1, '#6abb3c']);
    g.fillRect(0, gy0, w, gy1 - gy0);
    for (let i = 0; i < 14; i += 2) {
      const y0 = gy0 + (gy1 - gy0) * (i / 14) ** 1.35, y1 = gy0 + (gy1 - gy0) * ((i + 1) / 14) ** 1.35;
      g.fillStyle = 'rgba(255,255,220,.13)';
      g.fillRect(0, y0, w, y1 - y0);
    }
    g.fillStyle = radg(g, R(0.5), R(0.95), 0, R(0.8), [0, 'rgba(255,255,210,.25)'], [1, 'rgba(255,255,210,0)']);
    g.fillRect(0, gy0, w, gy1 - gy0);
    // 선 (골 지역 · 페널티 박스 · 페널티 점 · 반원)
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = R(0.007);
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-R(0.1), R(LINE_Y));
    g.lineTo(R(1.1), R(LINE_Y));
    g.stroke();
    g.beginPath();
    g.moveTo(R(0.0), R(LINE_Y));
    g.lineTo(R(-0.05), R(0.97));
    g.lineTo(R(1.05), R(0.97));
    g.lineTo(R(1.0), R(LINE_Y));
    g.stroke();
    g.lineWidth = R(0.008);
    g.beginPath();
    g.moveTo(R(-0.3), R(1.36));
    g.quadraticCurveTo(R(0.5), R(1.27), R(1.3), R(1.36));
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)';
    ell(g, R(SPOT_X), R(SPOT_Y + 0.004), R(0.018), R(0.008));
    g.fill();
    // 풀포기 · 꽃
    for (let i = 0; i < 60; i++) {
      const x = hsh(i + 40) * w, yu = hsh(i + 41), y = gy0 + R(0.02) + (gy1 - gy0 - R(0.04)) * yu;
      const s2 = R(0.006 + yu * 0.009);
      g.strokeStyle = 'rgba(60,140,40,.5)';
      g.lineWidth = Math.max(1, s2 * 0.35);
      g.beginPath();
      for (const d of [-1, 0, 1]) {
        g.moveTo(x + d * s2 * 0.4, y);
        g.lineTo(x + d * s2 * 0.9, y - s2 * (1.4 - Math.abs(d) * 0.4));
      }
      g.stroke();
      if (i % 6 === 0 && (x < R(0.1) || x > R(0.9))) {
        g.fillStyle = ['#ffffff', '#ffe14a', '#ff9ac0'][i % 3];
        for (let q = 0; q < 5; q++) {
          const a = (q / 5) * TAU;
          g.beginPath();
          g.arc(x + Math.cos(a) * s2 * 0.5, y - s2 * 1.5 + Math.sin(a) * s2 * 0.5, s2 * 0.4, 0, TAU);
          g.fill();
        }
      }
    }
    // 골대 안: 그늘 · 뒤 그물 받침
    g.fillStyle = 'rgba(30,80,20,.28)';
    g.beginPath();
    g.moveTo(R(FL), R(LINE_Y));
    g.lineTo(R(BL), R(BG));
    g.lineTo(R(BR), R(BG));
    g.lineTo(R(FR), R(LINE_Y));
    g.closePath();
    g.fill();
  });
  BGC.set(key, c);
  return c;
}

function drawNet(ctx: C2, s: KickState, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number) {
  const t = s.t, age = t - vis.netT, amp = age >= 0 && age < 70 ? Math.exp(-age / 22) * Math.cos(age * 0.35) * vis.netK : 0;
  const bulge = (x: number, y: number): [number, number] => {
    if (!amp) return [x, y];
    const dx = x - vis.netX, dy = y - vis.netY, d2 = dx * dx * 1.2 + dy * dy, k = Math.exp(-d2 / 0.03) * amp;
    // 그물이 뒤(위쪽·바깥)로 불룩
    return [x + (x - 0.5) * k * 0.3 + dx * k * 0.9, y - k * 0.11 + dy * k * 0.7];
  };
  // 뒤 판 · 옆 판 · 지붕 그물: 격자 점을 앞 입 → 뒤 판으로 섞어 그린다
  ctx.save();
  ctx.lineWidth = Math.max(1, R(0.0028));
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  const NU = 16, NV = 10;
  const P = (u: number, v: number): [number, number] => bulge(...backPt(u, v));
  ctx.beginPath();
  for (let i = 0; i <= NU; i++) {
    for (let j = 0; j <= NV; j++) {
      const [x, y] = P(i / NU, j / NV);
      j ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y));
    }
  }
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const [x, y] = P(i / NU, j / NV);
      i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y));
    }
  }
  ctx.stroke();
  // 옆 그물 (앞 기둥 ↔ 뒤 기둥)
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath();
  for (const side of [0, 1]) {
    const fx = side ? FR : FL, bx = side ? BR : BL;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const [x0, y0] = bulge(fx, lerp(CB, LINE_Y, v)), [x1, y1] = bulge(bx, lerp(BT, BG, v));
      ctx.moveTo(X(x0), Y(y0));
      ctx.lineTo(X(x1), Y(y1));
    }
    for (let i = 0; i <= 5; i++) {
      const u = i / 5;
      const [x0, y0] = bulge(lerp(fx, bx, u), lerp(CB, BT, u)), [x1, y1] = bulge(lerp(fx, bx, u), lerp(LINE_Y, BG, u));
      ctx.moveTo(X(x0), Y(y0));
      ctx.lineTo(X(x1), Y(y1));
    }
  }
  // 지붕
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const [x0, y0] = bulge(lerp(FL, FR, u), CB), [x1, y1] = bulge(lerp(BL, BR, u), BT);
    ctx.moveTo(X(x0), Y(y0));
    ctx.lineTo(X(x1), Y(y1));
  }
  ctx.stroke();
  if (amp > 0.05) {
    ctx.fillStyle = radg(ctx, X(vis.netX), Y(vis.netY - 0.03), 0, R(0.16), [0, `rgba(255,255,255,${0.45 * Math.abs(amp)})`], [1, 'rgba(255,255,255,0)']);
    ell(ctx, X(vis.netX), Y(vis.netY - 0.03), R(0.16), R(0.13));
    ctx.fill();
  }
  // 뒤 기둥
  ctx.strokeStyle = '#e8eef4';
  ctx.lineWidth = R(0.009);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(BL), Y(BG));
  ctx.lineTo(X(BL), Y(BT));
  ctx.lineTo(X(BR), Y(BT));
  ctx.lineTo(X(BR), Y(BG));
  ctx.moveTo(X(FL), Y(CB));
  ctx.lineTo(X(BL), Y(BT));
  ctx.moveTo(X(FR), Y(CB));
  ctx.lineTo(X(BR), Y(BT));
  ctx.stroke();
  ctx.restore();
}
function drawFrame(ctx: C2, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, flash: number) {
  const pw = R(PT);
  // 그림자
  ctx.fillStyle = 'rgba(30,60,20,.3)';
  ctx.beginPath();
  ctx.moveTo(X(FL), Y(LINE_Y));
  ctx.lineTo(X(FL) + R(0.06), Y(LINE_Y) + R(0.02));
  ctx.lineTo(X(FR) + R(0.06), Y(LINE_Y) + R(0.02));
  ctx.lineTo(X(FR), Y(LINE_Y));
  ctx.lineTo(X(FR) + pw / 2, Y(LINE_Y));
  ctx.closePath();
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 1;
  const post = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7a8a9a';
    ctx.lineWidth = pw + 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = flash > 0 ? `rgb(255,${Math.round(255 - flash * 60)},${Math.round(255 - flash * 200)})` : '#ffffff';
    ctx.lineWidth = pw;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,180,200,.6)';
    ctx.lineWidth = pw * 0.35;
    ctx.beginPath();
    ctx.moveTo(x0 + pw * 0.25, y0);
    ctx.lineTo(x1 + pw * 0.25, y1);
    ctx.stroke();
  };
  post(X(FL), Y(LINE_Y), X(FL), Y(CB));
  post(X(FR), Y(LINE_Y), X(FR), Y(CB));
  post(X(FL), Y(CB), X(FR), Y(CB));
}

/** 관중 한 마리 */
function drawFan(ctx: C2, f: Fan, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, jump: number, shock: boolean, cheer: number, t: number, oppJersey: string) {
  const x = X(f.x), y = Y(f.y) - R(jump * 0.03 + Math.abs(Math.sin(t * 0.05 + f.ph)) * 0.003), r = R(f.r);
  const shirt = f.side ? oppJersey : MY_JERSEY;
  // 몸
  ctx.fillStyle = shirt;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  rr(ctx, x - r * 0.9, y + r * 0.55, r * 1.8, r * 1.4, r * 0.6);
  ctx.fill();
  ctx.stroke();
  // 팔 (환호하면 위로)
  if (cheer > 0.05) {
    ctx.strokeStyle = shirt;
    ctx.lineWidth = r * 0.42;
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sd * r * 0.75, y + r * 0.8);
      ctx.lineTo(x + sd * r * (1.0 + 0.2 * cheer), y + r * (0.8 - 1.4 * cheer));
      ctx.stroke();
    }
  }
  // 머리
  const col = FAN_COL[f.k], k = f.k;
  ctx.fillStyle = col;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  if (k === 0) {
    // 토끼 귀
    for (const sd of [-1, 1]) {
      ell(ctx, x + sd * r * 0.35, y - r * 1.1, r * 0.22, r * 0.55, sd * 0.15);
      ctx.fill();
      ctx.stroke();
    }
  } else if (k === 2 || k === 4) {
    for (const sd of [-1, 1]) {
      ell(ctx, x + sd * r * 0.7, y - r * 0.6, r * 0.28, r * 0.28);
      ctx.fill();
      ctx.stroke();
    }
  } else if (k === 3) {
    for (const sd of [-1, 1]) {
      ell(ctx, x + sd * r * 0.45, y - r * 0.75, r * 0.3, r * 0.3);
      ctx.fill();
      ctx.stroke();
    }
  }
  ell(ctx, x, y, r, r * 0.92);
  ctx.fill();
  ctx.stroke();
  if (k === 1) {
    // 병아리 부리
    ctx.fillStyle = '#ff9a2a';
    ell(ctx, x, y + r * 0.25, r * 0.25, r * 0.14);
    ctx.fill();
  } else if (k === 2) {
    ctx.fillStyle = '#ff8aa8';
    ell(ctx, x, y + r * 0.3, r * 0.32, r * 0.22);
    ctx.fill();
  }
  // 눈 · 입
  ctx.fillStyle = '#2a1a10';
  if (shock) {
    ell(ctx, x - r * 0.35, y - r * 0.05, r * 0.16, r * 0.2);
    ctx.fill();
    ell(ctx, x + r * 0.35, y - r * 0.05, r * 0.16, r * 0.2);
    ctx.fill();
    ell(ctx, x, y + r * 0.5, r * 0.16, r * 0.2);
    ctx.fill();
  } else if (cheer > 0.3) {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 1.2;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sd * r * 0.35, y + r * 0.02, r * 0.15, Math.PI, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#c0303a';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r * 0.22, 0, Math.PI);
    ctx.fill();
  } else {
    ell(ctx, x - r * 0.35, y - r * 0.02, r * 0.1, r * 0.13);
    ctx.fill();
    ell(ctx, x + r * 0.35, y - r * 0.02, r * 0.1, r * 0.13);
    ctx.fill();
  }
  // 팝콘 통
  if (f.pop && !shock) {
    const px = x + r * 1.0, py = y + r * 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px - r * 0.45, py - r * 0.4);
    ctx.lineTo(px + r * 0.45, py - r * 0.4);
    ctx.lineTo(px + r * 0.32, py + r * 0.6);
    ctx.lineTo(px - r * 0.32, py + r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e03a3a';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(px - r * 0.12, py - r * 0.4);
    ctx.lineTo(px - r * 0.1, py + r * 0.6);
    ctx.moveTo(px + r * 0.14, py - r * 0.4);
    ctx.lineTo(px + r * 0.12, py + r * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#fff6c8';
    for (let i = 0; i < 4; i++) {
      ell(ctx, px - r * 0.3 + i * r * 0.2, py - r * 0.5 - (i % 2) * r * 0.12, r * 0.14, r * 0.13);
      ctx.fill();
    }
  }
}

// ── 칸 미리 보기 ──
/** 칸 색: 찰 때 초록 = 잘 들어감 · 빨강 = 잘 막힘 / 막을 때 초록 = 잘 막음 */
function cellTone(kick: boolean, good: number): [string, string] {
  if (kick) return good >= 0.6 ? ['#3fd05a', '#2fb24a'] : good >= 0.35 ? ['#ffc030', '#e8a020'] : ['#ff5a4a', '#e04a3a'];
  return good >= 0.45 ? ['#3fd05a', '#2fb24a'] : good >= 0.2 ? ['#ffc030', '#e8a020'] : ['#c8c8d8', '#8a8aa0'];
}
function drawCellsBack(ctx: C2, s: KickState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number) {
  const tu = s.turn, t = s.t, pv = preview(s, 'habit'), kick = tu.role === 'kick';
  const pop = s.pt < 10 ? ease(s.pt / 10) : 1;
  for (let c = 0; c < 6; c++) {
    const x0 = X(GX0 + CW * colOf(c)), y0 = Y(GY0 + CH * rowOf(c)), cw = R(CW), ch = R(CH);
    const cx = x0 + cw / 2, cy = y0 + ch / 2, pul = 0.5 + 0.5 * Math.sin(t * 0.12 + c * 0.9);
    const [tone] = cellTone(kick, pv[c].good);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    ctx.translate(-cx, -cy);
    rr(ctx, x0 + R(0.008), y0 + R(0.008), cw - R(0.016), ch - R(0.016), R(0.02));
    ctx.globalAlpha = 0.2 + 0.08 * pul;
    ctx.fillStyle = tone;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.75 + 0.25 * pul})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([R(0.022), R(0.014)]);
    ctx.lineDashOffset = -t * 0.4;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
function drawCells(ctx: C2, s: KickState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void) {
  const tu = s.turn, t = s.t, d = STAGES[s.stage];
  const pv = preview(s, 'habit'), kick = tu.role === 'kick';
  const showPaws = d.learn > 0, cnt = kick ? s.cntK : s.cntD;
  const pop = s.pt < 10 ? ease(s.pt / 10) : 1;
  for (let c = 0; c < 6; c++) {
    const x0 = X(GX0 + CW * colOf(c)), y0 = Y(GY0 + CH * rowOf(c)), cw = R(CW), ch = R(CH);
    const p = pv[c], cx = x0 + cw / 2, cy = y0 + ch / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    ctx.translate(-cx, -cy);
    // 확률 딱지 + 장갑(막힐 확률 / 막을 확률) — 위 줄은 칸 위쪽, 아래 줄은 칸 아래쪽 (가운데는 골키퍼 자리)
    const pb = kick ? p.block : p.good;
    const ng = pb < 0.1 ? 0 : pb < 0.3 ? 1 : pb < 0.55 ? 2 : 3;
    const pct = Math.round(p.good * 100);
    const lab = kick ? `골 ${pct}%` : `막기 ${pct}%`;
    font(0.034, 900);
    const tw = ctx.measureText(lab).width + R(0.024), gw = ng * R(0.028), lx = cx - gw / 2, ly = rowOf(c) === 0 ? y0 + R(0.03) : y0 + ch - R(0.03);
    for (let i = 0; i < ng; i++) {
      const gx = lx + tw / 2 + R(0.018) + i * R(0.028), gy = ly + Math.sin(t * 0.15 + i + c) * R(0.003);
      glove(ctx, gx, gy, R(0.017), -0.2 + i * 0.15, kick ? '#ffb0a0' : '#f6ff6a');
    }
    const [, hot] = cellTone(kick, p.good);
    ctx.fillStyle = 'rgba(40,30,20,.35)';
    rr(ctx, lx - tw / 2 + 1.5, ly - R(0.02) + 2, tw, R(0.04), R(0.02));
    ctx.fill();
    ctx.fillStyle = hot;
    rr(ctx, lx - tw / 2, ly - R(0.02), tw, R(0.04), R(0.02));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, lx, ly + 1);
    // 바람에 밀려 밖으로 나갈 칸
    if (tu.wind && p.land < 0) {
      font(0.034, 900);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.strokeText('밖으로!', cx, cy + R(0.004));
      ctx.fillStyle = '#d0302a';
      ctx.fillText('밖으로!', cx, cy + R(0.004));
    }
    // 여우 수첩: 내가 고른 횟수 = 발자국 (칸 안쪽 모서리)
    if (showPaws && cnt[c] > 0) {
      const py = rowOf(c) === 0 ? y0 + ch - R(0.026) : y0 + R(0.026), px0 = colOf(c) === 2 ? x0 + cw - R(0.03) : x0 + R(0.03), dir = colOf(c) === 2 ? -1 : 1;
      for (let i = 0; i < Math.min(4, cnt[c]); i++) paw(ctx, px0 + dir * i * R(0.026), py, R(0.011), 'rgba(110,50,10,.85)');
    }
    ctx.restore();
  }
  // 바람: 골대 위로 큰 화살표 하나
  if (tu.wind) {
    const wd = tu.wind, y = Y(CB - 0.03), x0 = X(0.2), x1 = X(0.8), sh = ((t * 0.02) % 1) * R(0.05) * wd;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(30,60,120,.35)';
    ctx.lineWidth = R(0.03);
    ctx.beginPath();
    ctx.moveTo(x0, y + 2);
    ctx.lineTo(x1, y + 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = R(0.024);
    ctx.setLineDash([R(0.03), R(0.02)]);
    ctx.lineDashOffset = -sh * 3;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.setLineDash([]);
    const hx = wd > 0 ? x1 + R(0.02) : x0 - R(0.02);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1a5ab0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + wd * R(0.03), y);
    ctx.lineTo(hx - wd * R(0.02), y - R(0.03));
    ctx.lineTo(hx - wd * R(0.02), y + R(0.03));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lab = `바람 ${wd > 0 ? '→' : '←'} 공이 한 칸`, tw = ctx.measureText(lab).width + R(0.03);
    ctx.fillStyle = '#2a7ad0';
    rr(ctx, X(0.5) - tw / 2, y - R(0.02), tw, R(0.04), R(0.02));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lab, X(0.5), y + 1);
    ctx.restore();
  }
  // 몸짓 단서: 기운 쪽(힐끔 본 쪽) 줄을 크게 — 찡긋이면 분홍 '거짓말?'
  if (tu.tell >= 0) {
    const x0 = X(GX0 + CW * tu.tell), cw = R(CW), y0 = Y(GY0), ch = R(GY1 - GY0), pul = 0.5 + 0.5 * Math.sin(t * 0.22);
    const col = tu.wink ? '#ff5ab0' : '#ffd23a';
    ctx.save();
    ctx.strokeStyle = 'rgba(80,40,10,.45)';
    ctx.lineWidth = 7;
    rr(ctx, x0 + R(0.004), y0 + R(0.004), cw - R(0.008), ch - R(0.008), R(0.024));
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.5 + pul * 1.5;
    ctx.stroke();
    const lab = tu.wink ? (kick ? '찡긋! 거짓 기울기' : '찡긋! 거짓 힐끔') : kick ? (tu.tell === 1 ? '가운데 지킬 듯!' : '이쪽으로 뛸 듯!') : tu.tell === 1 ? '가운데로 찰 듯!' : '이쪽으로 찰 듯!';
    font(0.034, 900);
    const tw = ctx.measureText(lab).width + R(0.04), lx = clamp(x0 + cw / 2, tw / 2 + 4, X(1) - tw / 2 - 4), ly = Y(GY1 + 0.03);
    ctx.fillStyle = col;
    rr(ctx, lx - tw / 2, ly - R(0.023), tw, R(0.046), R(0.023));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = tu.wink ? '#ffffff' : '#5a2a08';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, lx, ly + 1);
    ctx.restore();
  }
}

// ── 전광판 · HUD ──
function drawBoard(ctx: C2, s: KickState, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const d = STAGES[s.stage], y0 = R(0.09), bh = R(0.076), bw = R(0.92), x0 = (w - bw) / 2;
  ctx.fillStyle = 'rgba(30,20,40,.35)';
  rr(ctx, x0 + 2, y0 + 4, bw, bh, R(0.02));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + bh, [0, '#3a3450'], [1, '#22202e']);
  rr(ctx, x0, y0, bw, bh, R(0.02));
  ctx.fill();
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 2;
  ctx.stroke();
  const cy = y0 + bh / 2;
  // 점수
  font(0.05, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe14a';
  ctx.fillText(`${s.myGoals} : ${s.oppGoals}`, w / 2, cy + 1);
  // 양쪽 줄: 이름 + 5칸
  const row = (side: number, res: Out[], name: string, col: string) => {
    const dir = side ? 1 : -1, nx = w / 2 + dir * R(0.28);
    font(0.03, 900);
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.fillText(name, nx, cy - R(0.017));
    for (let i = 0; i < KICKS; i++) {
      const idx = res.length > KICKS ? res.length - KICKS + i : i;
      const r0 = res[idx], dx = nx + (i - 2) * R(0.042), dy = cy + R(0.019);
      ctx.fillStyle = r0 === 'goal' ? '#5ae06a' : r0 ? '#ff5a4a' : 'rgba(255,255,255,.2)';
      ell(ctx, dx, dy, R(0.012), R(0.012));
      ctx.fill();
      if (r0 === 'save' || r0 === 'miss') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(dx - R(0.006), dy - R(0.006));
        ctx.lineTo(dx + R(0.006), dy + R(0.006));
        ctx.moveTo(dx + R(0.006), dy - R(0.006));
        ctx.lineTo(dx - R(0.006), dy + R(0.006));
        ctx.stroke();
      }
    }
  };
  row(0, s.mine, '강아지', '#9ac8ff');
  row(1, s.theirs, d.who, '#ffc8a0');
  if (s.n >= KICKS * 2 && s.phase !== 'end') {
    font(0.028, 900);
    const lab = '서든데스', tw = ctx.measureText(lab).width + R(0.03), ly = y0 + bh + R(0.012);
    ctx.fillStyle = '#ff4a3a';
    rr(ctx, w / 2 - tw / 2, ly - R(0.017), tw, R(0.034), R(0.017));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(lab, w / 2, ly + 1);
  }
}
function drawTop(ctx: C2, s: KickState, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const d = STAGES[s.stage], hb = R(0.082);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,252,240,.97)'], [1, 'rgba(255,240,210,.95)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(110,60,20,.3)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2, cx = R(0.055);
  ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe878'], [1, '#f2a91c']);
  ell(ctx, cx, cy, R(0.031), R(0.031));
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5b3512';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(s.stage + 1), cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a2a10';
  font(0.042, 900);
  ctx.fillText(d.name, R(0.1), cy + 1, R(0.4));
  const nw = Math.min(R(0.4), ctx.measureText(d.name).width);
  font(0.032, 700);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  ctx.textAlign = 'right';
  font(0.042, 900);
  const st = String(s.stars), sw = ctx.measureText(st).width;
  ctx.fillStyle = '#d88a08';
  ctx.fillText(st, w - R(0.03), cy + 1);
  starPath(ctx, w - R(0.03) - sw - R(0.026), cy, R(0.021));
  ctx.fillStyle = '#ffd23a';
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (let j = 0; j < 3; j++) {
    const hx2 = w - R(0.03) - sw - R(0.085) - j * R(0.052);
    heartPath(ctx, hx2, cy, R(0.018));
    ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx2, cy - R(0.02), hx2, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(110,60,20,.15)';
    ctx.fill();
    ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(110,60,20,.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}
/** 아래 띠: 별 조건 · 안내 한 줄 */
function drawBottom(ctx: C2, s: KickState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number, h: number) {
  const d = STAGES[s.stage], t = s.t, tu = s.turn, y0 = Y(1.365);
  ctx.fillStyle = lin(ctx, 0, y0, 0, h, [0, 'rgba(255,248,226,.94)'], [1, 'rgba(255,236,200,.96)']);
  rr(ctx, 0, y0, w, h - y0 + 8, R(0.03));
  ctx.fill();
  ctx.fillStyle = 'rgba(110,60,20,.3)';
  ctx.fillRect(0, y0, w, 1.5);
  // 별 조건
  font(0.03, 800);
  const chips = d.stars.map((q, i) => {
    const prog = starNow(s, q), ok = s.phase === 'end' && s.ok ? s.starOk[i] : q.k !== 'win' && q.k !== 'margin' && starMet(s, q);
    return { lab: `${q.label}${prog ? ' ' + prog : ''}`, ok };
  });
  const widths = chips.map((c) => ctx.measureText(c.lab).width + R(0.07));
  const total = widths.reduce((a, b) => a + b, 0) + R(0.015) * (chips.length - 1);
  const sc = Math.min(1, (w - R(0.03)) / total);
  let x = (w - total * sc) / 2;
  const cy = Y(1.4);
  ctx.save();
  ctx.translate(x, cy);
  ctx.scale(sc, sc);
  ctx.translate(-x, -cy);
  chips.forEach((c, i) => {
    const cw = widths[i];
    ctx.fillStyle = c.ok ? '#ffe08a' : 'rgba(255,255,255,.85)';
    rr(ctx, x, cy - R(0.022), cw, R(0.044), R(0.022));
    ctx.fill();
    ctx.strokeStyle = c.ok ? '#c88a10' : 'rgba(140,100,60,.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    starPath(ctx, x + R(0.024), cy, R(0.013));
    ctx.fillStyle = c.ok ? '#ffc020' : 'rgba(140,100,60,.25)';
    ctx.fill();
    ctx.strokeStyle = c.ok ? '#8a5a08' : 'rgba(140,100,60,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#5a3a1a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.lab, x + R(0.045), cy + 1);
    x += cw + R(0.015);
  });
  ctx.restore();
  // 안내 한 줄
  let hint = '';
  if (s.phase === 'aim') {
    if (tu.asleep) hint = '곰돌이가 졸아요! 아무 데나 톡 해서 뻥!';
    else if (tu.role === 'kick') hint = tu.wink ? '찡긋! 기운 쪽이 거짓말 — 그쪽이 오히려 비어요' : tu.wind ? `바람이 ${tu.wind < 0 ? '왼쪽' : '오른쪽'}으로 — 공이 한 칸 밀려요` : tu.tell >= 0 ? `${d.who}가 ${tu.tell === 1 ? '가운데를 지켜요' : tu.tell === 0 ? '왼쪽으로 기울어요' : '오른쪽으로 기울어요'}` : '찰 곳을 톡! 장갑이 적은 칸이 잘 들어가요';
    else hint = tu.wink ? '찡긋! 힐끔 본 쪽이 거짓말이에요' : tu.wind ? `바람이 ${tu.wind < 0 ? '왼쪽' : '오른쪽'}으로 — 공이 밀려 와요` : tu.tell >= 0 ? `${d.who}가 ${tu.tell === 1 ? '꼬리를 곧게 — 가운데?' : tu.tell === 0 ? '왼쪽을 힐끔 — 꼬리도 왼쪽' : '오른쪽을 힐끔 — 꼬리도 오른쪽'}` : '막을 차례! 공이 올 곳으로 뛸 칸을 톡';
  } else if (s.phase === 'shot') hint = tu.role === 'kick' ? '뻥!' : '날아라!';
  else if (s.phase === 'res') hint = '톡 하면 다음 차례';
  else hint = s.ok ? (s.won ? '모든 판 승리!' : '다음 판엔 새것이 나와요 — 톡') : s.hearts > 0 ? '같은 판을 다시 해요 — 톡' : '하트가 없어요';
  const first = s.stage === 0 && !s.again && s.n === 0 && s.phase === 'aim';
  font(first ? 0.044 : 0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  const line = first ? '👆 찰 곳을 톡!' : hint;
  ctx.strokeText(line, w / 2, Y(1.458), w - R(0.04));
  ctx.fillStyle = first ? '#d0400a' : '#5a3a1a';
  ctx.fillText(line, w / 2, Y(1.458), w - R(0.04));
  void t;
  void X;
}

function drawAll(ctx: C2, s: KickState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), vis = visOf(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], t = s.t, tu = s.turn;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const ball = ballAt(s);

  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= vis.ev || t - e.t > 12) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.kind) {
      case 'tap':
        fx.ring(ex, ey, '#ffffff', R(0.12), 4);
        fx.burst(ex, ey, '#ffffff', 10, 3, 2.4);
        break;
      case 'boot':
        fx.kick(5);
        fx.ring(X(SPOT_X), Y(SPOT_Y), '#ffffff', R(0.14), 5);
        fx.burst(X(SPOT_X), Y(SPOT_Y), '#a8e070', 16, 4, 2.6);
        fx.pop(X(SPOT_X) + R(0.1), Y(SPOT_Y) - R(0.06), '뻥!', '#fff27a', Math.max(20, R(0.075)));
        break;
      case 'goal':
      case 'kgoal': {
        const mine = e.kind === 'goal';
        vis.netT = t;
        vis.netX = ball.x;
        vis.netY = ball.y;
        vis.netK = mine ? 1.2 : 0.9;
        fx.kick(mine ? 14 : 7);
        if (mine) {
          fx.blink('#fff6c0', 0.4);
          vis.waveT = t;
          vis.waveSide = -1;
          confetti(vis, 90, 0.02, 0.98, 0.1);
          fx.burst(ex, ey, '#ffe14a', 30, 6, 3.4);
          fx.burst(ex, ey, '#ffffff', 20, 5, 3);
          fx.ring(ex, ey, '#ffe14a', R(0.25), 7);
        } else {
          vis.waveT = t;
          vis.waveSide = 1;
          fx.burst(ex, ey, '#ffffff', 16, 4, 2.6);
          fx.pop(ex, ey - R(0.08), '앗, 먹혔다', '#ffd0c0', Math.max(15, R(0.05)));
        }
        break;
      }
      case 'save':
      case 'ksave': {
        const mine = e.kind === 'ksave';
        const kp = keeperAt(s);
        fx.kick(mine ? 12 : 8);
        fx.ring(X(kp.hx), Y(kp.hy), '#ffffff', R(0.2), 7);
        fx.burst(X(kp.hx), Y(kp.hy), '#fff27a', 26, 6, 3.2);
        fx.pop(X(kp.hx), Y(kp.hy) - R(0.07), '탁!', '#ffffff', Math.max(26, R(0.1)));
        if (mine) {
          fx.blink('#e0f4ff', 0.35);
          vis.waveT = t;
          vis.waveSide = -1;
          confetti(vis, 50, 0.05, 0.95, 0.1);
        } else {
          vis.waveT = t;
          vis.waveSide = 1;
        }
        break;
      }
      case 'miss':
      case 'kmiss': {
        if (e.text === 'post') {
          const [px, py] = shotEnd(s);
          fx.kick(8);
          fx.ring(X(px), Y(py), '#fff27a', R(0.12), 5);
          fx.burst(X(px), Y(py), '#ffffff', 14, 4, 2.4);
          fx.pop(X(px), Y(py) - R(0.05), '땡!', '#fff27a', Math.max(24, R(0.085)));
        } else fx.pop(X(ball.x), Y(ball.y) - R(0.05), e.text === 'blown' ? '휘잉~' : e.text === 'over' ? '붕~' : '휙~', '#ffffff', Math.max(18, R(0.06)));
        break;
      }
      case 'clear':
        confetti(vis, 120, 0.0, 1.0, 0.05);
        vis.waveT = t;
        vis.waveSide = -1;
        break;
      case 'fail':
        fx.kick(5);
        break;
      case 'sudden':
        fx.kick(6);
        fx.blink('#ffe0a0', 0.3);
        break;
      case 'big':
        fx.kick(9);
        break;
    }
  }
  vis.ev = Math.max(vis.ev, ...s.events.map((e) => e.t), vis.ev);
  // 관중석에 공이 떨어지는 순간: 팝콘 와르르
  if (s.phase === 'res' && tu.out === 'miss' && s.pt === 26) {
    const [sx, sy] = standSpot(s);
    vis.spillT = t;
    vis.spillX = sx;
    vis.spillY = sy;
    fx.burst(X(sx), Y(sy), '#fff6c8', 20, 5, 3.2);
    for (let i = 0; i < 26; i++) {
      vis.seed = (vis.seed * 16807) % 2147483647;
      const a2 = vis.seed / 2147483647;
      vis.seed = (vis.seed * 16807) % 2147483647;
      const b2 = vis.seed / 2147483647;
      vis.corn.push({ x: sx, y: sy, vx: (a2 - 0.5) * 0.014, vy: -0.006 - b2 * 0.01, rot: a2 * 6, vr: (b2 - 0.5) * 0.3, col: b2 < 0.3 ? '#ffe08a' : '#fffbe8', life: 50 + Math.floor(a2 * 30) });
    }
    fx.pop(X(sx), Y(sy) + R(0.05), '내 팝콘!', '#ffffff', Math.max(16, R(0.05)));
    fx.kick(6);
  }

  // ── 슬로모션 카메라 ──
  const f = s.phase === 'shot' ? s.pt - RUN : -1;
  const slowK = f > 0.55 * FLY && f <= FLY ? Math.sin(Math.PI * clamp((f - 0.55 * FLY) / (0.45 * FLY + 10), 0, 1)) : s.phase === 'res' && s.pt < 10 ? (1 - s.pt / 10) * 0.6 : 0;
  vis.slow += (slowK - vis.slow) * 0.25;
  const zoom = 1 + vis.slow * 0.12;
  const [zx, zy] = s.phase === 'aim' ? [0.5, 0.6] : shotEnd(s);

  ctx.save();
  fx.begin(ctx);
  ctx.translate(X(zx), Y(zy));
  ctx.scale(zoom, zoom);
  ctx.translate(-X(zx), -Y(zy));
  ctx.drawImage(getBg(Math.round(w), Math.round(h), Math.min(3, Math.max(1, Math.round(sc)))), -R(0.03), -R(0.03), w + R(0.06), h + R(0.06));

  // ── 하늘: 해 · 흐르는 구름 · 새 ──
  {
    const sx = R(0.9), sy = R(0.06), sr = R(0.03);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.004);
    ctx.fillStyle = 'rgba(255,220,90,.55)';
    for (let i = 0; i < 10; i++) {
      ctx.rotate(TAU / 10);
      ctx.beginPath();
      ctx.moveTo(sr * 1.2, -sr * 0.18);
      ctx.lineTo(sr * 1.75, 0);
      ctx.lineTo(sr * 1.2, sr * 0.18);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = radg(ctx, sx, sy, 0, sr, [0, '#fffbe0'], [1, '#ffd84a']);
    ell(ctx, sx, sy, sr, sr);
    ctx.fill();
  }
  // ── 관중 ──
  const wave = t - vis.waveT;
  for (const fan of FANS) {
    let jump = 0, cheer = 0;
    if (wave >= 0 && wave < 110 && (vis.waveSide < 0 || fan.side === vis.waveSide)) {
      const q = wave - fan.x * 34 - fan.row * 3;
      if (q > 0 && q < 26) (jump = Math.sin((q / 26) * Math.PI)), (cheer = jump);
      if (q >= 26 && wave < 100) cheer = 0.5 + 0.5 * Math.sin(t * 0.3 + fan.ph);
      if (vis.waveSide === 1) cheer *= 0.8;
    }
    const sp = t - vis.spillT, near = sp >= 0 && sp < 80 && Math.abs(fan.x - vis.spillX) < 0.07 && Math.abs(fan.y - vis.spillY) < 0.05;
    drawFan(ctx, fan, X, Y, R, jump, near, cheer, t, d.jersey);
  }
  // 팝콘 와르르: 통이 뒤집혀 날고 알갱이가 쏟아진다
  const spA = t - vis.spillT;
  if (spA >= 0 && spA < 50) {
    const u = spA / 50, bx = X(vis.spillX + 0.04 * u), by = Y(vis.spillY - 0.09 * Math.sin(Math.PI * u) + 0.05 * u * u), br = R(0.028);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(u * 7);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-br * 0.6, -br * 0.7);
    ctx.lineTo(br * 0.6, -br * 0.7);
    ctx.lineTo(br * 0.42, br * 0.8);
    ctx.lineTo(-br * 0.42, br * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#e03a3a';
    ctx.lineWidth = br * 0.22;
    ctx.beginPath();
    ctx.moveTo(-br * 0.18, -br * 0.7);
    ctx.lineTo(-br * 0.14, br * 0.8);
    ctx.moveTo(br * 0.2, -br * 0.7);
    ctx.lineTo(br * 0.16, br * 0.8);
    ctx.stroke();
    ctx.restore();
  }
  for (const c of vis.corn) {
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.0006;
    c.vx *= 0.98;
    c.rot += c.vr;
    c.life--;
    const cx2 = X(c.x), cy2 = Y(c.y), q = R(0.008);
    ctx.fillStyle = c.col;
    ctx.strokeStyle = 'rgba(160,110,40,.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a3 = c.rot + (i * TAU) / 3;
      ctx.moveTo(cx2 + Math.cos(a3) * q * 0.7 + q * 0.6, cy2 + Math.sin(a3) * q * 0.7);
      ctx.arc(cx2 + Math.cos(a3) * q * 0.7, cy2 + Math.sin(a3) * q * 0.7, q * 0.6, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
  }
  vis.corn = vis.corn.filter((c) => c.life > 0);
  // 깃발 흔드는 응원단 (양쪽 끝)
  for (const [fxp, col] of [[0.03, MY_JERSEY], [0.97, d.jersey]] as [number, string][]) {
    const bx = X(fxp), by = Y(0.31), wv = Math.sin(t * 0.15 + fxp * 9) * R(0.012);
    ctx.strokeStyle = '#7a4a22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - R(0.08));
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(bx, by - R(0.08));
    ctx.quadraticCurveTo(bx + (fxp < 0.5 ? 1 : -1) * R(0.03), by - R(0.075) + wv, bx + (fxp < 0.5 ? 1 : -1) * R(0.06), by - R(0.065));
    ctx.lineTo(bx, by - R(0.045));
    ctx.closePath();
    ctx.fill();
  }

  // ── 골대: 뒤 그물 ──
  drawNet(ctx, s, vis, X, Y, R);
  // 그물 안 공 (골 뒤)
  if (ball.show && ball.inNet) {
    ctx.fillStyle = 'rgba(20,50,10,.3)';
    ell(ctx, X(ball.x), Y(BG), R(ball.r), R(ball.r * 0.35));
    ctx.fill();
    drawBall(ctx, X(ball.x), Y(ball.y), R(ball.r), ball.spin);
  }
  // 바람 자루
  if (tu.wind || d.wind) {
    const wx = X(0.5), wy = Y(CB - 0.004), wd = tu.wind;
    ctx.strokeStyle = '#7a8a9a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx, wy - R(0.055));
    ctx.stroke();
    ctx.save();
    ctx.translate(wx, wy - R(0.05));
    ctx.rotate(wd ? (wd > 0 ? 0 : Math.PI) : Math.PI / 2.3);
    const fl = Math.sin(t * 0.4) * R(0.004);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#ff5a3a';
      ctx.beginPath();
      ctx.moveTo(i * R(0.018), -R(0.012) + i * R(0.0015) + fl * i * 0.3);
      ctx.lineTo((i + 1) * R(0.018), -R(0.011) + (i + 1) * R(0.0015) + fl * (i + 1) * 0.3);
      ctx.lineTo((i + 1) * R(0.018), R(0.011) - (i + 1) * R(0.0015) + fl * (i + 1) * 0.3);
      ctx.lineTo(i * R(0.018), R(0.012) - i * R(0.0015) + fl * i * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (wd && s.phase !== 'end') {
      // 바람 줄
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const yy = Y(0.45 + i * 0.12 + hsh(i) * 0.04), sp = (t * 0.012 + hsh(i + 3)) % 1, xx = wd > 0 ? X(-0.2 + sp * 1.4) : X(1.2 - sp * 1.4);
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.quadraticCurveTo(xx + wd * R(0.05), yy - R(0.01), xx + wd * R(0.1), yy);
        ctx.stroke();
      }
    }
  }

  if (s.phase === 'aim') drawCellsBack(ctx, s, X, Y, R);
  // ── 골키퍼 ──
  const kp = keeperAt(s), keeperMine = tu.role === 'keep' && s.phase !== 'end';
  const kk: Kind = keeperMine ? 'dog' : d.kind, kH = R(KH * (d.kind === 'lion' && !keeperMine ? 1.14 : 1));
  // 바닥 그림자
  const air = clamp((LINE_Y - KH * 0.45 - kp.cy) / 0.2, 0, 1);
  ctx.fillStyle = 'rgba(30,60,20,.3)';
  ell(ctx, X(kp.cx), Y(LINE_Y + 0.006), kH * (0.32 - air * 0.12), kH * 0.07);
  ctx.fill();
  ctx.save();
  ctx.translate(X(kp.cx), Y(kp.cy));
  ctx.rotate(kp.rot);
  drawCritter(ctx, kk, 0, kH * 0.45, kH, pose({ face: kp.face, lean: kp.lean, look: kp.look, arms: kp.arms, sq: kp.sq, gloves: true, t: t + 30, jersey: keeperMine ? '#ffb020' : d.jersey, jersey2: keeperMine ? '#fff0c0' : d.jersey2, num: 1, tail: Math.sin(t * 0.1) * 0.3 }));
  ctx.restore();
  // 찡긋 반짝
  if (s.phase === 'aim' && tu.wink && !keeperMine) {
    const a = 0.5 + 0.5 * Math.sin(t * 0.25);
    ctx.fillStyle = `rgba(255,140,210,${a})`;
    starPath(ctx, X(kp.cx + 0.08), Y(kp.cy - KH * 0.75), R(0.02 + 0.006 * a));
    ctx.fill();
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText('찡긋!', X(kp.cx + 0.13), Y(kp.cy - KH * 0.9));
    ctx.fillStyle = '#e0408a';
    ctx.fillText('찡긋!', X(kp.cx + 0.13), Y(kp.cy - KH * 0.9));
  }
  // 우쭐 말풍선
  if (s.phase === 'res' && tu.out === 'save' && s.pt > 24) {
    const txt = keeperMine ? '막았다!' : d.kind === 'lion' ? '어림없다!' : '흥~ 다 보여!';
    bubble(ctx, X(kp.cx), Y(kp.cy - KH * 1.0), txt, font, R, keeperMine ? '#2a6ad0' : '#c0401a');
  }
  if (s.phase === 'res' && tu.out === 'goal' && s.pt > 14) {
    const kx = X(kp.cx), ky = Y(kp.cy - KH * 0.2);
    for (let i = 0; i < 3; i++) {
      const a = t * 0.15 + (i * TAU) / 3;
      ctx.fillStyle = '#ffe14a';
      starPath(ctx, kx + Math.cos(a) * R(0.05), ky + Math.sin(a) * R(0.02) - R(0.04), R(0.012));
      ctx.fill();
    }
  }

  // 잔디 위 병아리 둘 (골·막기에 폴짝)
  for (const [cxp, cyp, fc, ph] of [[0.07, 0.97, 1, 0], [0.93, 1.03, -1, 40]] as [number, number, number, number][]) {
    const q = t - vis.waveT - ph * 0.2, jump = q >= 0 && q < 60 ? Math.abs(Math.sin(q * 0.16)) * (1 - q / 60) : 0;
    const wx = cxp + Math.sin((t + ph * 9) * 0.006) * 0.02;
    drawChick(ctx, X(wx), Y(cyp), R(0.038), t + ph, jump, Math.cos((t + ph * 9) * 0.006) > 0 ? fc : -fc);
  }
  // ── 골대 앞틀 ──
  const postFlash = s.phase === 'res' && tu.out === 'miss' && tu.miss === 'post' && s.pt < 20 ? 1 - s.pt / 20 : 0;
  drawFrame(ctx, X, Y, R, postFlash);

  // ── 칸 (고르기) ──
  if (s.phase === 'aim') drawCells(ctx, s, X, Y, R, font);

  // ── 공 (날아가는) ──
  if (ball.show && !ball.inNet) {
    // 그림자
    ctx.fillStyle = 'rgba(30,60,20,.3)';
    const sy = Math.min(Y(ball.gy), Y(LINE_Y + 0.4));
    ell(ctx, X(ball.gx), sy + R(0.006), R(ball.r * 0.9), R(ball.r * 0.3));
    ctx.fill();
    // 꼬리
    if (s.phase === 'shot' && s.pt > RUN) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = R(ball.r * 1.2);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(ball.x), Y(ball.y));
      const back = 0.12 * (1 - vis.slow * 0.6);
      ctx.lineTo(X(lerp(ball.x, SPOT_X, back)), Y(lerp(ball.y, SPOT_Y, back)));
      ctx.stroke();
    }
    drawBall(ctx, X(ball.x), Y(ball.y), R(ball.r), ball.spin);
  }

  // ── 키커 ──
  const kc = kickerAt(s), kickMine = tu.role === 'kick' || s.phase === 'end';
  const ck: Kind = kickMine ? 'dog' : d.kind;
  ctx.fillStyle = 'rgba(30,60,20,.3)';
  ell(ctx, X(kc.x), Y(kc.y + 0.005), R(KICK_H * 0.3), R(KICK_H * 0.07));
  ctx.fill();
  drawCritter(ctx, ck, X(kc.x), Y(kc.y), R(KICK_H * (ck === 'lion' ? 1.08 : 1)), pose({
    back: kc.back, face: kc.face, lean: kc.lean, arms: kc.arms, step: kc.step, kick: kc.kick, sq: kc.sq, tail: kc.tail, turn: kc.turn,
    jersey: kickMine ? MY_JERSEY : d.jersey, jersey2: kickMine ? MY_JERSEY2 : d.jersey2, num: kickMine ? 10 : 9, t,
  }));
  if (s.phase === 'aim' && !kickMine && tu.tell >= 0 && kc.turn) {
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    const tx = X(kc.x + Math.sign(kc.turn) * 0.13), ty = Y(kc.y - KICK_H * 0.95);
    const lab = tu.wink ? '찡긋!' : '힐끔';
    ctx.strokeText(lab, tx, ty);
    ctx.fillStyle = tu.wink ? '#e0408a' : '#5a3a1a';
    ctx.fillText(lab, tx, ty);
  }
  if (s.phase === 'res' && s.pt > 8) {
    const txt = tu.out === 'goal' ? (kickMine ? '들어갔다!' : '헤헤~') : tu.out === 'save' ? (kickMine ? '으앙…' : '아깝다!') : kickMine ? '앗 팝콘…' : '헛발!';
    bubble(ctx, X(kc.x), Y(kc.y - KICK_H * 1.05), txt, font, R, tu.out === 'goal' ? '#d0500a' : '#5a6a88');
  }

  // 꽃가루
  for (const c of vis.conf) {
    c.x += c.vx;
    c.y += c.vy;
    c.vx += Math.sin(t * 0.05 + c.rot) * 0.0002;
    c.rot += c.vr;
    c.life--;
    ctx.save();
    ctx.translate(X(c.x), Y(c.y));
    ctx.rotate(c.rot);
    ctx.scale(1, Math.abs(Math.cos(c.rot * 1.3)) + 0.2);
    ctx.fillStyle = c.col;
    ctx.fillRect(-R(0.009), -R(0.005), R(0.018), R(0.01));
    ctx.restore();
  }
  vis.conf = vis.conf.filter((c) => c.life > 0 && c.y < 1.6);

  // ── 큰 순간 띠 ──
  if (t - s.bigT < 64) {
    const age = t - s.bigT, sc2 = age < 6 ? 1.9 - 0.9 * (age / 6) : 1, a = Math.min(1, (64 - age) / 16);
    const size = Math.min(36, R(0.09));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(X(0.5), Y(0.27));
    ctx.rotate(-0.06);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(s.bigText).width, rx = tw / 2 + 20, ry = size * 0.85;
    const fit = Math.min(1, (w * 0.94) / (2 * rx * 1.1));
    ctx.scale(sc2 * fit, sc2 * fit);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 22; i++) {
      const an = (i / 22) * TAU, q = i % 2 ? 0.85 : 1.1;
      i ? ctx.lineTo(Math.cos(an) * rx * q, Math.sin(an) * ry * q) : ctx.moveTo(Math.cos(an) * rx * q, Math.sin(an) * ry * q);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.strokeText(s.bigText, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#fff6a0'], [0.5, '#ffd23a'], [1, '#ff8a3a']);
    ctx.fillText(s.bigText, 0, 2);
    ctx.restore();
  }
  ctx.restore();

  // 슬로모션 가장자리
  if (vis.slow > 0.05) {
    ctx.fillStyle = radg(ctx, w / 2, h * 0.45, w * 0.35, w * 1.0, [0, 'rgba(255,255,255,0)'], [1, `rgba(40,30,60,${0.35 * vis.slow})`]);
    ctx.fillRect(0, 0, w, h);
  }

  // ═════════════ HUD ═════════════
  drawTop(ctx, s, R, font, w);
  drawBoard(ctx, s, R, font, w);
  drawBottom(ctx, s, X, Y, R, font, w, h);
  drawCards(ctx, s, fx, X, Y, R, font, w);
  // 첫 안내 손가락
  const firstAim = s.phase === 'aim' && s.stage === 0 && !s.again && (s.n === 0 || (s.n === 1 && s.taps === 1));
  if (firstAim) {
    const c = s.n === 0 ? 5 : 4;
    drawHand(ctx, X(cellX(c)) + R(0.02), Y(cellY(c)) + R(0.0), R(0.085), Math.max(0, Math.sin(t * 0.15)));
  }
}
function bubble(ctx: C2, x: number, y: number, txt: string, font: (sz: number, wgt?: number) => void, R: (r: number) => number, col: string) {
  font(0.038, 900);
  const tw = ctx.measureText(txt).width;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  rr(ctx, x - tw / 2 - R(0.02), y - R(0.026), tw + R(0.04), R(0.052), R(0.024));
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - R(0.012), y + R(0.024));
  ctx.lineTo(x, y + R(0.045));
  ctx.lineTo(x + R(0.012), y + R(0.024));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - R(0.011), y + R(0.018), R(0.022), R(0.008));
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, y + 1);
  ctx.restore();
}
function drawCards(ctx: C2, s: KickState, fx: ReturnType<typeof juice>, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const t = s.t, d = STAGES[s.stage];
  // 스포트라이트 (새것)
  if (s.spot && s.phase === 'aim' && t - s.spot.t < 220) {
    const sp = s.spot, a = Math.min(1, (220 - (t - sp.t)) / 30), pul = 1 + 0.04 * Math.sin(t * 0.2), prx = R(sp.rx) * pul, pry = R(sp.ry) * pul;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -t * 0.8;
    rr(ctx, X(sp.x) - prx, Y(sp.y) - pry, prx * 2, pry * 2, Math.min(prx, pry) * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.034, 900);
    const lab = `NEW  ${sp.label}`, tw = ctx.measureText(lab).width + R(0.04);
    const lx = clamp(X(sp.x), tw / 2 + 4, w - tw / 2 - 4), ly = Math.max(R(0.19), Y(sp.y) - pry - R(0.005));
    ctx.fillStyle = '#ff5a3a';
    rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, lx, ly + 1);
    ctx.restore();
  }
  // 판 띠 (판 시작 · 결과)
  let head = '', sub = '', a = 0, age = 0;
  let cy = Y(0.955);
  if (s.phase === 'end') {
    age = s.pt;
    a = Math.min(1, age / 8);
    cy = Y(s.ok ? 0.62 : 0.66);
    if (s.ok) head = s.won ? `우승! ${s.myGoals} : ${s.oppGoals}` : `${d.who} 이겼다! ${s.myGoals} : ${s.oppGoals}`;
    else (head = `으앗, 졌다… ${s.myGoals} : ${s.oppGoals}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '하트가 없어요 — 끝');
  } else if (s.banner && t - s.banner.t < BANNER_T) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (BANNER_T - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (head && a > 0) {
    const pop = Math.min(1, 0.5 + age / 10);
    ctx.save();
    ctx.globalAlpha = a;
    font(0.052, 900);
    const w1 = ctx.measureText(head).width;
    font(0.034, 800);
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const okRes = s.phase === 'end' && s.ok;
    const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.5) : 0) + R(0.1)), ch = (okRes ? R(0.21) : sub ? R(0.15) : R(0.09)) * pop;
    ctx.translate(w / 2, cy);
    ctx.fillStyle = 'rgba(60,30,10,.3)';
    rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#8a5a20';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = s.phase === 'end' ? (s.ok ? '#ff6a3a' : '#7a8aa8') : '#3d9df5';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo((sd * cw) / 2, -ch * 0.25);
      ctx.lineTo(sd * (cw / 2 + R(0.035)), -ch * 0.3);
      ctx.lineTo(sd * (cw / 2 + R(0.02)), 0);
      ctx.lineTo(sd * (cw / 2 + R(0.035)), ch * 0.3);
      ctx.lineTo((sd * cw) / 2, ch * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.052, 900);
    ctx.fillStyle = s.phase === 'end' ? (s.ok ? '#d0500a' : '#5a6a88') : '#2a5a9a';
    if (okRes) {
      ctx.fillText(head, 0, -R(0.06), w - R(0.1));
      const nS = s.starOk.length;
      for (let j = 0; j < nS; j++) {
        const ag = s.pt - (16 + j * 14);
        const sx = (j - (nS - 1) / 2) * R(0.09);
        const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
        starPath(ctx, sx, 0, R(0.036) * popS);
        ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
        ctx.fill();
        ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy, '#ffd23a', 16, 3, 2.4);
      }
      font(0.034, 800);
      ctx.fillStyle = '#9a5a08';
      ctx.fillText(s.won ? '동물 승부차기 최고!' : '다음 판엔 새 상대!', 0, R(0.06), w - R(0.1));
    } else {
      ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
      if (sub) {
        font(0.034, 800);
        ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
        ctx.fillText(sub, 0, R(0.035), w - R(0.1));
      }
    }
    ctx.restore();
  }
}

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: KickState, k: number) {
  s.stage = k;
  s.again = false;
  s.tries = 1;
  newStage(s);
}
