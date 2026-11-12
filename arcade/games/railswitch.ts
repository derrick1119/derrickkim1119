/**
 * 기찻길 전환 (24라운드: 새 장르) — 교차로 신호 × 가리키기(톡) × 판마다 새것.
 * 기준 9(손이 하는 일은 하나): 갈림길을 톡 = '철컥!' 선로가 바뀐다. 누르고 있는 동안 바꾼 뒤의 기찻길이 밝은 점선으로 보이고
 *   (처음 서는 역에 ✓·💢, 부딪힐 자리에 💥), 손을 떼는 순간 철컥(갈림길이 아닌 곳에서 떼면 취소). 키보드는 화살표 커서 + 스페이스.
 * 규칙(칸 기반·결정적): 기차는 한 방향 선로를 따라 칸마다 같은 빠르기로 저절로 간다(갈림길 앞 칸에서는 느려진다).
 *   갈림길은 기차 머리가 그 칸에 들어서는 순간의 방향으로 간다. 손님을 태운 기차는 지나가는 역마다 선다 —
 *   맨 앞 손님이 같은 그림 역이면 '띵동' 내리고, 아니면 화를 낸다(두 번 화나면 짐을 들고 내려 버린다 = 하트 −1).
 *   빈 기차는 역을 그냥 지나고, 출발역에서 다음 손님을 태운다. 두 기차가 한 칸에 들어가면 쾅(하트 −1).
 *   기차가 앞으로 갈 길(처음 서는 역까지)은 늘 점선으로 보인다.
 * 와우: 첫 톡에 선로가 철컥 바뀌고, 점선이 곰 역으로 꺾이고, 칙칙폭폭 기차가 곰 손님을 곰 역에 '띵동' 내려 준다(곰이 손을 흔든다).
 * 판 8개: 목표 = 손님 N명을 제 역에. 별 = ★ 다 내려 줌 · ★ 철컥 N번 이하 · ★ 보너스(헛바퀴 없이 / 손님 화 안 냄).
 *   실패(기차끼리 쾅 · 손님이 두 번 화나서 내림) = 하트 −1, 그 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 곰 역·풍경 길 → 2판 토끼 역(손님마다 바꾸기) → 3판 기차 둘(앞 기차가 지나간 뒤 바꾸기, 합류점 쾅 조심)
 *   → 4판 건널목 소 떼(소가 다 건널 때까지 기차가 선다 — 뒤 기차는 딴 길로) → 5판 급행(두 배 빠른 기차 — 따라잡지 않게 딴 고리로)
 *   → 6판 터널(안이 안 보이고, 기차가 들어가면 터널 갈림길이 잠긴다 — 미리 정하기) → 7판 화물칸(두 칸 기차 — 앞 칸 손님부터, 들를 순서대로)
 *   → 8판 밤 신호등(톡 하면 빨강·초록, 빨간불엔 기차가 선다 — 세워서 비켜 주기) + 마음 바뀌는 여우 손님(🔄 길을 지나면 갈 역이 바뀐다).
 * 웃음: 잘못 선 역에서 손님이 짐가방을 들고 발을 동동·💢, 두 번이면 짐을 들고 내려 '다음 기차 탈 거야!' 하며 씩씩.
 *   기차끼리 아슬아슬하면 기관사 너구리가 두 손으로 눈을 가린다(지나가면 '휴~'). 소 떼는 선로 위에서 느긋하게 풀을 뜯는다(음매~).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.42;
/** 판: 가로 7칸 × 세로 8칸. 화면 좌표(가로 0~1, 세로 0~A) — 3/4 시점이라 칸의 세로가 가로보다 짧다 */
const COLS = 7, ROWS = 8, NC = COLS * ROWS;
const BX0 = 0.031, CW = 0.134, BY0 = 0.262, RH = 0.1;
const gx = (c: number) => c % COLS, gy = (c: number) => (c / COLS) | 0;
const cid = (x: number, y: number) => y * COLS + x;
const CXc = (c: number) => BX0 + (gx(c) + 0.5) * CW, CYc = (c: number) => BY0 + (gy(c) + 0.5) * RH;
/** 한 칸 가는 틱(보통·급행) · 갈림길 앞 칸에서 느려지는 배수 · 역·출발역에 서 있는 틱 · 판 시작 뒤 출발까지 */
const PER = 19, PER_FAST = 10, SLOW = 1.7, DW_ST = 38, DW_DEPOT = 32, INTRO = 90;
const MAX_ANGER = 3;
/** 소 떼: 풀 뜯다가(OFF) 건널목을 건넌다(ON, 이동안 기차는 건널목 앞에서 선다) */
const COW_OFF = 330, COW_ON = 150;
const RESULT_OK = 150, RESULT_FAIL = 150, NEWS_T = 170, CARD_T = 140;
const STAR_PTS = 100, CLEAR_PTS = 20, WIN_PTS = 200;
/** 손가락으로 누르는 자리(갈림길·신호등) 반지름 — 340px 폭에서 약 30px */
const HIT_R = 0.088;

/** 동물: 0 곰 · 1 토끼 · 2 돼지 (여우는 변덕 손님: want ↔ alt) */
const AN = ['곰', '토끼', '돼지'];

const DIRS: Record<string, [number, number]> = { '6': [1, 0], '4': [-1, 0], '8': [0, -1], '2': [0, 1], '9': [1, -1], '7': [-1, -1], '3': [1, 1], '1': [-1, 1] };

interface StageDef {
  key: string;
  news: string;
  hint: string;
  /** 7글자 × 8줄. 숫자 = 나가는 방향(숫자 키패드), 소문자 = 갈림길(jn에 [기본, 바꾼 방향]) */
  map: string[];
  jn: Record<string, [string, string]>;
  /** [x, y, 동물, 건물 x, 건물 y] */
  st: number[][];
  /** [x, y, 승강장 x, 승강장 y] */
  depot: number[];
  /** 기차: 머리부터 [x,y] 칸들(길이 = 칸 수 + 2), 급행, 처음 태운 손님 */
  trains: { path: number[][]; fast?: boolean; pax?: (number | number[])[] }[];
  /** 출발역에서 기다리는 손님 (숫자 = 동물, [갈 역, 바뀔 역] = 여우) */
  queue: (number | number[])[];
  cow?: number[];
  tunnel?: number[][];
  sig?: number[][];
  night?: boolean;
  /** 손님 줄을 시드로 섞을까 */
  mix?: boolean;
  par: number;
  bonus: 'nolap' | 'calm';
}

/** 판 8개. 모두 한 방향(시계 방향) 고리 + 갈림길. 역 건물은 선로 바로 뒤(위) 칸. 신호등은 오른쪽 기둥(합류점 앞) */
export const STAGES: StageDef[] = [
  {
    key: '', news: '', hint: '갈림길을 톡 하면 점선(기차가 갈 길)이 바뀌어요',
    map: ['.......', '.66662.', '.8...2.', '.a6662.', '.8...2.', '.8...2.', '.84444.', '.......'],
    jn: { a: ['8', '6'] },
    st: [[3, 3, 0, 3, 2]],
    depot: [3, 6, 3, 7],
    trains: [{ path: [[1, 5], [1, 6], [2, 6]], pax: [0] }],
    queue: [0, 0],
    par: 1, bonus: 'nolap',
  },
  {
    key: 'rabbit', news: '🐰 토끼 역이 생겼어요 — 손님마다 갈림길을 바꿔요', hint: '손님이 바뀌면 갈림길도 바꿔요 — 점선 끝 역을 봐요',
    map: ['.......', '.66662.', '.8...2.', '.a6662.', '.8...2.', '.8...2.', '.84444.', '.......'],
    jn: { a: ['8', '6'] },
    st: [[3, 3, 0, 3, 2], [3, 1, 1, 3, 0]],
    depot: [3, 6, 3, 7],
    trains: [{ path: [[1, 5], [1, 6], [2, 6]], pax: [0] }],
    queue: [1, 0],
    par: 3, bonus: 'calm',
  },
  {
    key: 'two', news: '🚂🚂 기차 둘 + 🚦 신호등 — 빨간불엔 기차가 서요', hint: '두 기차가 합류점에서 만나면 쾅! 💥 보이면 신호등을 톡',
    map: ['.......', '.66662.', '.8...2.', '.a6662.', '.8...2.', '.8...2.', '.84444.', '.......'],
    jn: { a: ['8', '6'] },
    st: [[3, 3, 0, 3, 2], [3, 1, 1, 3, 0]],
    depot: [3, 6, 3, 7],
    sig: [[5, 2]],
    trains: [{ path: [[1, 4], [1, 5], [1, 6]], pax: [0] }, { path: [[4, 1], [3, 1], [2, 1]], pax: [] }],
    queue: [1, 1, 0],
    mix: true,
    par: 5, bonus: 'calm',
  },
  {
    key: 'cow', news: '🐄 건널목 소 떼 — 다 건널 때까지 기차가 서요', hint: '소가 건너는 동안엔 딴 길로 — 뒤 기차는 끼익!',
    map: ['.......', '.66662.', '.8...2.', '.a6662.', '.8...2.', '.b6662.', '.84444.', '.......'],
    jn: { a: ['8', '6'], b: ['8', '6'] },
    st: [[3, 3, 0, 3, 2], [3, 1, 1, 3, 0], [4, 5, 2, 4, 4]],
    depot: [3, 6, 3, 7],
    cow: [2, 5],
    sig: [[5, 2], [5, 4]],
    trains: [{ path: [[1, 6], [2, 6], [3, 6]], pax: [0] }, { path: [[5, 2], [5, 1], [4, 1]], pax: [] }],
    queue: [2, 1, 2],
    mix: true,
    par: 6, bonus: 'calm',
  },
  {
    key: 'express', news: '⚡ 급행 기차 — 두 배 빠르고 못 서요! 앞을 막으면 쾅', hint: '급행이 앞 기차를 따라잡지 않게 — 딴 길이나 빨간불로',
    map: ['.......', '.66662.', '.8...2.', '.a6662.', '.8...2.', '.b6662.', '.84444.', '.......'],
    jn: { a: ['8', '6'], b: ['8', '6'] },
    st: [[3, 3, 0, 3, 2], [3, 1, 1, 3, 0], [4, 5, 2, 4, 4]],
    depot: [3, 6, 3, 7],
    sig: [[5, 2], [5, 4]],
    trains: [{ path: [[1, 3], [1, 4], [1, 5]], pax: [1] }, { path: [[5, 5], [5, 4], [5, 3]], fast: true, pax: [] }],
    queue: [0, 2, 1, 0],
    mix: true,
    par: 7, bonus: 'calm',
  },
  {
    key: 'tunnel', news: '⛰️ 터널 — 안이 안 보여요. 기차가 들어가면 잠겨요', hint: '터널 갈림길은 기차가 들어가기 전에 정해요 🔒',
    map: ['.......', '.66662.', '.8...2.', '.a6662.', '.8...2.', '.b6662.', '.84444.', '.......'],
    jn: { a: ['8', '6'], b: ['8', '6'] },
    st: [[3, 3, 0, 3, 2], [3, 1, 1, 3, 0], [4, 5, 2, 4, 4]],
    depot: [3, 6, 3, 7],
    tunnel: [[1, 2], [1, 3], [1, 4], [2, 3]],
    sig: [[5, 2], [5, 4]],
    trains: [{ path: [[1, 6], [2, 6], [3, 6]], pax: [0] }, { path: [[5, 2], [5, 1], [4, 1]], pax: [] }],
    queue: [1, 2, 0],
    mix: true,
    par: 6, bonus: 'calm',
  },
  {
    key: 'cars', news: '🚃 화물칸 두 칸 — 앞 칸 손님부터 내려요', hint: '앞 칸 손님 역 먼저! 순서가 맞으면 한 바퀴에 둘',
    map: ['.......', '.66662.', '.8...2.', '.a6662.', '98...2.', '88...2.', '.p4444.', '.......'],
    jn: { a: ['8', '6'], p: ['8', '7'] },
    st: [[3, 3, 0, 3, 2], [3, 1, 1, 3, 0], [0, 5, 2, 0, 6]],
    depot: [3, 6, 3, 7],
    trains: [{ path: [[2, 6], [3, 6], [4, 6], [5, 6]], pax: [0, 2] }],
    queue: [1, 2, 0, 1],
    mix: true,
    par: 6, bonus: 'calm',
  },
  {
    key: 'fox', news: '🌙 밤 + 🦊 관광 여우 — 첫 역에서 사진 찍고 다음 역으로', hint: '여우는 두 역을 들러요 — 📸 찍은 뒤 다음 역으로 바꿔요',
    map: ['.......', '.66662.', '.8...2.', '.a6662.', '.8...2.', '.b6662.', '.84444.', '.......'],
    jn: { a: ['8', '6'], b: ['8', '6'] },
    st: [[3, 3, 0, 3, 2], [3, 1, 1, 3, 0], [4, 5, 2, 4, 4]],
    depot: [3, 6, 3, 7],
    sig: [[5, 2], [5, 4]],
    night: true,
    trains: [{ path: [[1, 5], [1, 6], [2, 6]], pax: [[0, 1]] }, { path: [[5, 1], [4, 1], [3, 1]], fast: true, pax: [] }],
    queue: [2, [1, 2], 0],
    mix: true,
    par: 7, bonus: 'calm',
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 선로망 ─────────────────────────────
interface Station { cell: number; animal: number; b: number }
interface Net {
  /** 칸마다 나가는 칸들 (갈림길이면 [기본, 바꾼]) · 들어오는 칸들 */
  out: number[][];
  inn: number[][];
  /** 칸 → 갈림길 번호(-1) · 갈림길 → 칸 · 기본 상태 */
  jn: number[];
  jcell: number[];
  st: number[];
  stations: Station[];
  depot: number;
  dpl: number;
  cow: number;
  tun: boolean[];
  /** 터널 안 갈림길 */
  tj: boolean[];
  sig: number[];
  sigCell: number[];
  /** 누를 수 있는 것: 갈림길(k 0) · 신호등(k 1) */
  hits: { cell: number; k: number; i: number; x: number; y: number }[];
}

const NETS: Net[] = [];
function net(stage: number): Net {
  if (NETS[stage]) return NETS[stage];
  const d = STAGES[stage];
  const out: number[][] = Array.from({ length: NC }, () => []), inn: number[][] = Array.from({ length: NC }, () => []);
  const jn = new Array(NC).fill(-1), jcell: number[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const ch = d.map[y][x];
      if (ch === '.') continue;
      const c = cid(x, y);
      const ds = d.jn[ch] ?? [ch];
      if (d.jn[ch]) (jn[c] = jcell.length), jcell.push(c);
      for (const k of ds) {
        const [dx, dy] = DIRS[k];
        out[c].push(cid(x + dx, y + dy));
      }
    }
  for (let c = 0; c < NC; c++) for (const o of out[c]) inn[o].push(c);
  const st = new Array(NC).fill(-1);
  const stations = d.st.map(([x, y, a, bx, by], i) => ((st[cid(x, y)] = i), { cell: cid(x, y), animal: a, b: cid(bx, by) }));
  const tun = new Array(NC).fill(false);
  for (const [x, y] of d.tunnel ?? []) tun[cid(x, y)] = true;
  const sig = new Array(NC).fill(-1), sigCell: number[] = [];
  for (const [x, y] of d.sig ?? []) (sig[cid(x, y)] = sigCell.length), sigCell.push(cid(x, y));
  const hits = [
    ...jcell.map((c, i) => ({ cell: c, k: 0, i, x: CXc(c), y: CYc(c) })),
    ...sigCell.map((c, i) => ({ cell: c, k: 1, i, x: CXc(c) + CW * 0.36, y: CYc(c) - RH * 0.55 })),
  ];
  return (NETS[stage] = {
    out, inn, jn, jcell, st, stations, depot: cid(d.depot[0], d.depot[1]), dpl: cid(d.depot[2], d.depot[3]),
    cow: d.cow ? cid(d.cow[0], d.cow[1]) : -1, tun, tj: jcell.map((c) => tun[c]), sig, sigCell, hits,
  });
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
/** 손님: 갈 역(동물) · 관광 여우면 그다음 역(alt, 없으면 -1) */
interface Pax { id: number; want: number; alt: number; anger: number; fox: boolean }
interface Train {
  id: number;
  /** 머리부터 칸들: [머리, 1칸, …, 꼬리, 꼬리가 온 칸] */
  hist: number[];
  /** 머리가 이 칸을 나가 들어갈 칸 (칸에 들어서는 순간 정해진다) */
  nxt: number;
  pt: number;
  per: number;
  dwell: number;
  wait: number;
  /** 칸 가운데서 설 일: 0 없음 · 1 역 · 2 출발역 */
  pend: number;
  cars: number;
  pax: (Pax | null)[];
  fast: boolean;
  /** 앞 기차 때문에 끼익 서 있다 (연출·봇) */
  brake: boolean;
}
interface Sim {
  t: number;
  go: number;
  trains: Train[];
  sw: number[];
  sig: number[];
  queue: Pax[];
  done: number;
  total: number;
  crash: number;
  quit: number;
  cowOn: boolean;
  cowT: number;
  laps: number;
  wrong: number;
  N: Net;
}
interface Ev { t: number; kind: string; c: number; text?: string; a?: number; tr?: number }

export interface RailState extends Sim {
  rng: Rng;
  seed: number;
  stage: number;
  phase: 'play' | 'result';
  pt: number;
  hearts: number;
  stars: number;
  got: number;
  starOk: boolean[];
  pts: number;
  ok: boolean;
  why: string;
  down: boolean;
  aim: { x: number; y: number } | null;
  seen: Set<string>;
  newsQ: string[];
  news: { text: string; t: number } | null;
  events: Ev[];
  dead: boolean;
  won: boolean;
  tries: number;
  tog: number;
  again: boolean;
  firstTap: boolean;
  pid: number;
  /** 연출: 내린 손님(역으로 걸어가 손 흔들기) · 화나서 내린 손님 · 부딪힌 자리 */
  off: { a: number; c: number; t: number; mad: boolean; fox: boolean }[];
}

const ev = (s: RailState, kind: string, c: number, text?: string, a?: number, tr?: number) => s.events.push({ t: s.t, kind, c, text, a, tr });
function see(s: RailState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

const front = (tr: Train) => tr.pax.findIndex((p) => p !== null);
const hasEmpty = (tr: Train) => tr.pax.some((p) => p === null);
const body = (tr: Train) => tr.hist.slice(0, tr.cars + 1);
const inTunnel = (S: Sim) => S.trains.some((tr) => body(tr).some((c) => S.N.tun[c]));
const locked = (S: Sim, j: number) => S.N.tj[j] && inTunnel(S);

/** 머리가 칸 c에 막 들어섰다: 나갈 칸을 정하고, 여우 마음 바뀜·역/출발역에 설 일을 정한다 */
function enter(S: Sim, tr: Train, E: RailState | null) {
  const N = S.N, c = tr.hist[0], j = N.jn[c];
  tr.nxt = j >= 0 ? N.out[c][S.sw[j]] : N.out[c][0];
  tr.per = Math.round((tr.fast ? PER_FAST : PER) * (N.jn[tr.nxt] >= 0 ? SLOW : 1));
  tr.pend = 0;
  if (N.st[c] >= 0 && front(tr) >= 0) tr.pend = 1;
  else if (c === N.depot) {
    if (front(tr) >= 0) {
      S.laps++;
      if (E) ev(E, 'lap', c, '빙글~ 한 바퀴 더?', -1, tr.id);
    }
    if (hasEmpty(tr) && S.queue.length) tr.pend = 2;
  }
}

/** 칸 가운데서 선다: 역이면 맨 앞 손님이 내리거나 화내고, 출발역이면 빈 칸에 손님을 태운다 */
function stop(S: Sim, tr: Train, E: RailState | null) {
  const N = S.N, c = tr.hist[0];
  if (tr.pend === 1) {
    const stn = N.stations[N.st[c]], k = front(tr), p = tr.pax[k]!;
    if (p.want === stn.animal && p.alt >= 0) {
      // 관광 여우: 첫 역에서 사진 찍고 다음 역으로
      p.want = p.alt;
      p.alt = -1;
      if (E) ev(E, 'photo', c, `찰칵! 📸 다음은 ${AN[p.want]} 역`, stn.animal, tr.id), see(E, 'photo', '📸 여우는 첫 역에서 사진만 찍고 다음 역으로 가요');
    } else if (p.want === stn.animal) {
      // 내리면 뒤 칸 손님들이 앞으로 당겨 앉는다 (늘 앞 칸 = 먼저 탄 손님)
      tr.pax.splice(k, 1);
      tr.pax.push(null);
      S.done++;
      if (E) {
        ev(E, 'ding', c, p.fox ? '여우도 띵동! 🦊' : `띵동! ${AN[stn.animal]} 역`, stn.animal, tr.id);
        E.off.push({ a: p.want, c, t: E.t, mad: false, fox: p.fox });
        see(E, 'ding', '🔔 같은 그림 역에 서면 손님이 띵동 내려요');
      }
    } else {
      p.anger++;
      S.wrong++;
      if (p.anger >= MAX_ANGER) {
        tr.pax.splice(k, 1);
        tr.pax.push(null);
        S.quit = c;
        if (E) ev(E, 'quit', c, '흥! 다음 기차 탈 거야!', p.want, tr.id), E.off.push({ a: p.want, c, t: E.t, mad: true, fox: p.fox });
      } else if (E) ev(E, 'angry', c, `여긴 ${AN[stn.animal]} 역이잖아! 💢`, p.want, tr.id), see(E, 'angry', '💢 다른 그림 역에 서면 손님이 화내요 — 두 번이면 내려 버려요');
    }
    tr.dwell = DW_ST;
  } else if (tr.pend === 2) {
    let n = 0;
    const on = tr.pax.filter((p): p is Pax => p !== null);
    while (on.length < tr.cars && S.queue.length) on.push(S.queue.shift()!), n++;
    for (let k = 0; k < tr.cars; k++) tr.pax[k] = on[k] ?? null;
    if (E && n) ev(E, 'board', c, n > 1 ? '두 분 타세요~' : '어서 타세요~', tr.pax[front(tr)]?.want ?? 0, tr.id);
    tr.dwell = DW_DEPOT;
  }
  tr.pend = 0;
}

function cowStep(S: Sim, E: RailState | null) {
  if (S.N.cow < 0) return;
  if (--S.cowT > 0) return;
  if (S.cowOn) (S.cowOn = false), (S.cowT = COW_OFF);
  else if (!S.trains.some((tr) => body(tr).includes(S.N.cow))) {
    S.cowOn = true;
    S.cowT = COW_ON;
    if (E) ev(E, 'cowin', S.N.cow, '음매~ 건너요', 0), see(E, 'cowon', '🐄 소 떼가 건너는 동안 기차는 건널목 앞에서 기다려요');
  } else S.cowT = 1;
}

/** 한 틱. E가 있으면(진짜 판) 연출 사건을 남긴다 — 점선·미리 보기·봇의 내다보기는 E 없이 같은 규칙으로 돈다 */
function tick(S: Sim, E: RailState | null) {
  S.t++;
  cowStep(S, E);
  if (S.t < S.go) return;
  const N = S.N;
  for (const tr of S.trains) {
    if (tr.dwell > 0) {
      tr.dwell--;
      continue;
    }
    if (tr.pt < tr.per) {
      tr.pt++;
      if (tr.pend && tr.pt * 2 >= tr.per) stop(S, tr, E);
      continue;
    }
    const nx = tr.nxt;
    if ((nx === N.cow && S.cowOn) || (N.sig[nx] >= 0 && S.sig[N.sig[nx]] === 1)) {
      if (E && tr.wait === 0) ev(E, nx === N.cow && S.cowOn ? 'cowwait' : 'sigwait', nx, nx === N.cow && S.cowOn ? '음매~' : '빨간불!', 0, tr.id);
      tr.wait++;
      continue;
    }
    // 같은 선로 바로 앞에 기차가 있으면 끼익 — 서서 기다린다 (옆에서 끼어들면 그대로 들어가 쾅)
    const ahead = S.trains.find((o) => o !== tr && body(o).includes(nx));
    if (ahead && !tr.fast && ahead.hist[ahead.hist.indexOf(nx) + 1] === tr.hist[0]) {
      if (E && tr.wait === 0) ev(E, 'brake', tr.hist[0], '끼익!', 0, tr.id), see(E, 'brake', '🙈 같은 선로 앞에 기차가 있으면 끼익 — 서서 기다려요');
      tr.wait++;
      tr.brake = true;
      continue;
    }
    tr.wait = 0;
    tr.brake = false;
    tr.hist.unshift(nx);
    tr.hist.pop();
    tr.pt = 0;
    enter(S, tr, E);
  }
  // 두 기차가 한 칸에: 쾅
  for (let i = 0; i < S.trains.length && S.crash < 0; i++)
    for (let k = i + 1; k < S.trains.length && S.crash < 0; k++) {
      const b = body(S.trains[k]);
      for (const c of body(S.trains[i]))
        if (b.includes(c)) {
          S.crash = c;
          break;
        }
    }
}

function cloneSim(S: Sim): Sim {
  return {
    t: S.t, go: S.go, sw: S.sw.slice(), sig: S.sig.slice(), queue: S.queue.map((p) => ({ ...p })), done: S.done, total: S.total, crash: S.crash, quit: S.quit,
    cowOn: S.cowOn, cowT: S.cowT, laps: S.laps, wrong: S.wrong, N: S.N,
    trains: S.trains.map((tr) => ({ ...tr, hist: tr.hist.slice(), pax: tr.pax.map((p) => (p ? { ...p } : null)) })),
  };
}

// ───────────────────────────── 판 진행 ─────────────────────────────
function mkPax(s: RailState, q: number | number[]): Pax {
  return Array.isArray(q) ? { id: s.pid++, want: q[0], alt: q[1], anger: 0, fox: true } : { id: s.pid++, want: q, alt: -1, anger: 0, fox: false };
}

function newStage(s: RailState) {
  const d = STAGES[s.stage], N = net(s.stage);
  s.N = N;
  s.sw = N.jcell.map(() => 0);
  s.sig = N.sigCell.map(() => 0);
  s.trains = d.trains.map((td, i) => {
    const hist = td.path.map(([x, y]) => cid(x, y)), cars = hist.length - 2;
    const pax: (Pax | null)[] = [];
    for (let k = 0; k < cars; k++) pax.push(td.pax && k < td.pax.length ? mkPax(s, td.pax[k]) : null);
    const tr: Train = { id: i, hist, nxt: hist[0], pt: 0, per: PER, dwell: 0, wait: 0, pend: 0, cars, pax, fast: !!td.fast, brake: false };
    return tr;
  });
  let q = d.queue.slice();
  if (d.mix) {
    const r = mulberry32(s.seed * 31 + s.stage * 977 + s.tries * 13);
    for (let i = q.length - 1; i > 0; i--) {
      const k = Math.floor(r() * (i + 1));
      [q[i], q[k]] = [q[k], q[i]];
    }
  }
  s.queue = q.map((x) => mkPax(s, x));
  for (const tr of s.trains) {
    enter(s, tr, null);
    tr.pend = 0;
    tr.pt = Math.floor(tr.per / 2) + 1;
  }
  s.done = 0;
  s.total = s.queue.length + s.trains.reduce((a, tr) => a + tr.pax.filter(Boolean).length, 0);
  s.crash = -1;
  s.quit = -1;
  s.cowOn = false;
  s.cowT = 90 + Math.floor(mulberry32(s.seed + s.stage)() * 120);
  s.laps = 0;
  s.wrong = 0;
  s.go = s.t + (s.stage === 0 && !s.again ? INTRO + 30 : INTRO);
  s.phase = 'play';
  s.pt = 0;
  s.tog = 0;
  s.starOk = [false, false, false];
  s.off = [];
  if (d.key) s.seen.add(d.key);
}

function hitAt(S: Sim, x: number, y: number) {
  let best = -1, bd = HIT_R;
  S.N.hits.forEach((h, i) => {
    const dd = Math.hypot(h.x - x, (h.y - y) * 1.15);
    if (dd < bd) (bd = dd), (best = i);
  });
  return best;
}

function tapAt(s: RailState, x: number, y: number) {
  if (s.phase !== 'play') return;
  const hi = hitAt(s, x, y);
  if (hi < 0) return void ev(s, 'miss', -1, '', x * 1000 + y);
  const h = s.N.hits[hi];
  s.firstTap = true;
  if (h.k === 0) {
    if (locked(s, h.i)) return void ev(s, 'lock', h.cell, '🔒 터널 안에 기차가 있어요'), see(s, 'lock', '🔒 기차가 터널 안에 있으면 터널 갈림길이 잠겨요');
    s.sw[h.i] ^= 1;
    s.tog++;
    ev(s, 'clack', h.cell, '철컥!', h.i);
    see(s, 'switch', '🔀 철컥! 점선 = 기차가 갈 길이에요');
  } else {
    s.sig[h.i] ^= 1;
    s.tog++;
    ev(s, 'signal', h.cell, s.sig[h.i] ? '빨간불!' : '초록불!', h.i);
    see(s, 'signal', '🚦 빨간불이면 기차가 신호등 앞에서 기다려요');
  }
}

function endStage(s: RailState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, s.tog <= d.par, d.bonus === 'nolap' ? s.laps === 0 : s.wrong === 0];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', -1, s.won ? '기차 마을 완성! 🚂' : '다 내려 줬어요!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', s.crash >= 0 ? s.crash : s.quit, why);
  }
}

export const railswitch: GameDef<RailState> = {
  id: 'railswitch',
  name: '기찻길 전환',
  genes: ['traffic', 'pointer', 'depth'],
  twist: '신호 대신 갈림길 하나를 톡 — 기차가 갈 길이 늘 점선으로 보이고, 누르고 있으면 바꾼 뒤의 길과 처음 서는 역(✓·💢)·부딪힐 자리(💥)가 미리 보인다',
  rules: [
    '갈림길을 톡 = 철컥! 기차는 점선을 따라 저절로 가요 (꾹 누르면 바뀐 길이 보여요).',
    '손님은 기차가 서는 역에서 내려요 — 같은 그림 역이면 띵동, 아니면 화내요(두 번이면 하트 −1).',
    '기차끼리 부딪히면 쾅! 하트 −1.',
  ],
  controls: 'touch',
  hint: '갈림길을 톡 = 철컥! (꾹 누르면 바뀐 길 미리 보기) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '장난감 기차 마을 디오라마 — 동물 손님 태우는 칙칙폭폭',
    mood: '나무 탁자 위 잔디 디오라마: 자갈 깔린 선로에 갈색 침목, 빨간 지붕 역마다 동물 그림 간판, 김을 뿜는 장난감 기차와 너구리 기관사. 밤이면 신호등과 가로등이 번진다.',
    palette: { bg: '#2c4a3a', ink: '#fffaf0', muted: '#cfe3c8', accent: '#ffd84a', hot: '#ff6b5b', soft: '#e8f5d8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, go: 0, trains: [], sw: [], sig: [], queue: [], done: 0, total: 0, crash: -1, quit: -1, cowOn: false, cowT: 0, laps: 0, wrong: 0,
      N: net(0), stage: 0, phase: 'play', pt: 0, hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '',
      down: false, aim: null, seen: new Set<string>(), newsQ: [], news: null, events: [], dead: false, won: false, tries: 0, tog: 0, again: false, firstTap: false, pid: 0, off: [],
    } as RailState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null;
    if (p) (s.down = true), (s.aim = { x: p.x, y: p.y * A });
    else if (s.down) {
      s.down = false;
      if (s.aim) tapAt(s, s.aim.x, s.aim.y);
      s.aim = null;
    }
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.phase === 'result') {
      s.t++;
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), (s.tries = 0), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    tick(s, s);
    if (s.crash >= 0) {
      see(s, 'crash', '💥 두 기차가 한 칸에 들어가면 쾅!');
      return endStage(s, false, '쾅! 기차끼리 부딪혔어요');
    }
    if (s.quit >= 0) return endStage(s, false, '손님이 화나서 내려 버렸어요');
    if (s.done >= s.total) return endStage(s, true, '');
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 길 찾기 (점선·봇) ─────────────────────────────
/** 이 기차가 지금 노리는 곳: 손님을 태웠으면 맨 앞 손님의 역(동물), 비었으면 출발역(-1), 갈 데 없으면 null */
function legOf(S: Sim, tr: Train): { want: number; alt: number } | null {
  let k = front(tr);
  // 막 서려는 역에서 맞게 내릴 손님은 내린 셈 친다 (관광 여우는 다음 역)
  if (tr.pend === 1 && k >= 0 && S.N.stations[S.N.st[tr.hist[0]]].animal === tr.pax[k]!.want) {
    if (tr.pax[k]!.alt >= 0) return { want: tr.pax[k]!.alt, alt: -1 };
    k = tr.pax.findIndex((p, i) => i > k && p !== null);
  }
  if (k >= 0) return { want: tr.pax[k]!.want, alt: tr.pax[k]!.alt };
  if (tr.pend === 2 || S.queue.length) return { want: -1, alt: -1 };
  return null;
}

/** 머리의 다음 칸부터 목표까지의 길 후보 (짧은 순, 최대 max개). 잘못 서는 역을 지나는 길은 뺀다 */
function routes(S: Sim, tr: Train, max: number): number[][] {
  const N = S.N, leg = legOf(S, tr);
  const outs: number[][] = [];
  if (!leg) return outs;
  const carry = leg.want >= 0;
  const path: number[] = [];
  const go = (c: number, want: number, alt: number, depth: number) => {
    if (outs.length >= 24 || depth > 30) return;
    path.push(c);
    let end = false, bad = false;
    if (carry && N.st[c] >= 0) {
      if (N.stations[N.st[c]].animal === want) end = true;
      else bad = true;
    } else if (!carry && c === N.depot) end = true;
    if (end) outs.push(path.slice());
    else if (!bad) {
      // 같은 칸을 같은 마음으로 두 번 지나면 맴도는 길
      let rep = 0;
      for (let i = 0; i < path.length - 1; i++) if (path[i] === c) rep++;
      if (rep < 1) for (const o of N.out[c]) go(o, want, alt, depth + 1);
    }
    path.pop();
  };
  go(tr.nxt, leg.want, leg.alt, 0);
  outs.sort((a, b) => a.length - b.length);
  return outs.slice(0, max);
}

/** 갈림길 j에 맨 먼저 닿을 기차가 원하는 상태 (계획 = 기차마다 앞으로 들어갈 칸들) */
function jitWants(S: Sim, plans: (number[] | null)[]) {
  const N = S.N, need: { st: number; eta: number }[] = N.jcell.map(() => ({ st: -1, eta: 1e9 }));
  S.trains.forEach((tr, i) => {
    const pl = plans[i];
    if (!pl) return;
    const k0 = pl.indexOf(tr.nxt);
    if (k0 < 0) return;
    const met = new Set<number>();
    for (let m = k0; m < pl.length - 1; m++) {
      const j = N.jn[pl[m]];
      if (j < 0 || met.has(j)) continue;
      met.add(j);
      if (m - k0 < need[j].eta) need[j] = { st: N.out[pl[m]].indexOf(pl[m + 1]), eta: m - k0 };
    }
  });
  // 계획에 없는 기차(갈 데 없는 빈 기차)가 먼저 닿는 갈림길은 건드리지 않는다
  S.trains.forEach((tr, i) => {
    if (plans[i]) return;
    let c = tr.nxt;
    for (let m = 0; m < 10; m++) {
      const j = N.jn[c];
      if (j >= 0) {
        if (m < need[j].eta) need[j] = { st: -1, eta: m };
        break;
      }
      c = N.out[c][0];
    }
  });
  return need;
}

/** 내다보기: 계획대로(갈림길은 맨 먼저 닿는 기차에 맞춰) 굴려서 점수를 매긴다 */
function rollout(S0: Sim, plans0: (number[] | null)[], hold: number[], H: number) {
  const S = cloneSim(S0);
  const plans = plans0.slice();
  let v = 0, tog = 0;
  const done0 = S.done, wrong0 = S.wrong, laps0 = S.laps;
  const sig = S.trains.map((tr) => legKey(S, tr));
  for (let k = 0; k < H; k++) {
    const need = jitWants(S, plans);
    need.forEach((n, j) => {
      if (n.st >= 0 && S.sw[j] !== n.st && !locked(S, j)) (S.sw[j] = n.st), tog++;
    });
    hold.forEach((u, i) => {
      const want = S.t < u ? 1 : 0;
      if (S.sig[i] !== want) (S.sig[i] = want), tog++;
    });
    const d0 = S.done;
    tick(S, null);
    if (S.crash >= 0) return -1e9 + k * 1000;
    if (S.quit >= 0) return -5e8 + k * 1000;
    if (S.done > d0) v += (S.done - d0) * (1e6 - k * 600);
    // 목표가 바뀐 기차는 가장 짧은 길로 다음 계획
    S.trains.forEach((tr, i) => {
      const kk = legKey(S, tr);
      if (kk !== sig[i]) {
        sig[i] = kk;
        plans[i] = routes(S, tr, 1)[0] ?? null;
      }
    });
    if (S.done >= S.total) {
      v += (H - k) * 600;
      break;
    }
  }
  v -= (S.wrong - wrong0) * 3e6 + (S.laps - laps0) * 2e5 + tog * 2e4;
  // 남은 거리
  S.trains.forEach((tr, i) => {
    const pl = plans[i];
    if (pl && S.done < S.total) {
      const k0 = pl.indexOf(tr.nxt);
      v -= (k0 < 0 ? 20 : pl.length - k0) * 4000;
    }
  });
  void done0;
  return v;
}
const legKey = (S: Sim, tr: Train) => {
  const l = legOf(S, tr);
  return l ? `${l.want},${l.alt},${tr.pax.map((p) => (p ? p.id : '-')).join('')}` : 'x';
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const press = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
interface Brain { key: string; plans: (number[] | null)[]; hold: number[]; at: number; press: number; hx: number; hy: number }
const brain = new WeakMap<object, Brain>();
const HOLDS = [24, 48, 80, 120, 170];

/** 기차마다 길 후보(짧은 순 셋)의 모든 조합을 내다보고, 부딪힘이 보이면 신호등으로 잠깐 세우는 수도 따져 본다 */
function plan(s: RailState): { plans: (number[] | null)[]; hold: number[] } {
  const opts = s.trains.map((tr) => {
    const r = routes(s, tr, 3);
    return r.length ? r : [null];
  });
  const green = s.sig.map(() => 0);
  const combos: { p: (number[] | null)[]; v: number }[] = [];
  const pick: (number[] | null)[] = [];
  const rec = (i: number) => {
    if (i === opts.length) return void combos.push({ p: pick.slice(), v: rollout(s, pick, green, 420) });
    for (const o of opts[i]) {
      pick[i] = o;
      rec(i + 1);
    }
  };
  rec(0);
  combos.sort((a, b) => b.v - a.v);
  let best = { plans: combos[0].p, hold: green }, bv = combos[0].v;
  if (s.sig.length && bv < 0)
    for (const c of combos.slice(0, 3))
      for (let i = 0; i < s.sig.length; i++)
        for (const d of HOLDS) {
          const hold = green.slice();
          hold[i] = s.t + d;
          const v = rollout(s, c.p, hold, 420) - d * 50;
          if (v > bv) (bv = v), (best = { plans: c.p, hold });
        }
  return best;
}

/** 봇: 손님마다 갈 길 후보를 모두 내다보고(부딪힘·잘못 서기·시간), 갈림길은 맨 먼저 닿을 기차에 맞춰 그때그때 철컥 */
export const railswitchSmart: Bot<RailState> = {
  name: '역장 너구리',
  act(s) {
    let m = brain.get(s);
    if (!m) brain.set(s, (m = { key: '', plans: [], hold: [], at: -999, press: 0, hx: 0, hy: 0 }));
    if (m.press > 0) {
      m.press--;
      return m.press > 0 ? press(m.hx, m.hy) : NO;
    }
    if (s.down) return NO;
    if (s.phase !== 'play') return (m.key = ''), NO;
    const key = `${s.stage}:${s.tries}:${s.trains.map((tr) => legKey(s, tr)).join('|')}:${s.sw.join('')}`;
    if (key !== m.key || s.t - m.at > 60 || m.plans.some((pl, i) => pl && !pl.includes(s.trains[i].nxt))) {
      m.key = key;
      m.at = s.t;
      const r = plan(s);
      m.plans = r.plans;
      m.hold = r.hold;
    }
    let target: { x: number; y: number } | null = null;
    // 신호등: 세울 때까지 빨강, 그 뒤 초록
    s.sig.forEach((v, i) => {
      const want = s.t < (m!.hold[i] ?? 0) ? 1 : 0;
      if (!target && v !== want) target = s.N.hits.find((q) => q.k === 1 && q.i === i)!;
    });
    if (!target) {
      const need = jitWants(s, m.plans);
      let bj = -1, be = 1e9;
      need.forEach((n, j) => {
        if (n.st >= 0 && s.sw[j] !== n.st && !locked(s, j) && n.eta < be) (be = n.eta), (bj = j);
      });
      if (bj >= 0) target = s.N.hits.find((q) => q.k === 0 && q.i === bj)!;
    }
    if (!target) return NO;
    const tg = target as { x: number; y: number };
    m.hx = tg.x;
    m.hy = tg.y;
    m.press = 1;
    return press(tg.x, tg.y);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 아무 갈림길(가끔은 화면 아무 데나)을 톡 */
export const railswitchRandom: Bot<RailState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 40 + Math.floor(rng() * 80), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? press(m.x, m.y) : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 50 + Math.floor(rng() * 150);
    const hs = s.N.hits;
    if (rng() < 0.8 && hs.length) {
      const h = hs[Math.floor(rng() * hs.length)];
      (m.x = h.x + (rng() - 0.5) * 0.05), (m.y = h.y + (rng() - 0.5) * 0.05);
    } else (m.x = rng()), (m.y = rng() * A);
    m.hold = 2 + Math.floor(rng() * 6);
    return press(m.x, m.y);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
/** 땅 평면의 세로 눌림 (3/4 시점) */
const KG = RH / CW;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** 동물 색: [몸, 테두리, 주둥이·귀 안] — 0 곰 · 1 토끼 · 2 돼지 · 3 여우 · 4 너구리 */
const AC = [
  ['#b07a4c', '#6f4527', '#f3d7b4'],
  ['#fbf7f2', '#b9ab9e', '#ffc2d1'],
  ['#ffb8c6', '#d9758a', '#ff8fa6'],
  ['#f28a3a', '#b25a1c', '#fff4e6'],
  ['#a3abb5', '#545c66', '#eef1f4'],
];
/** 기차 색: [몸, 어두운 면, 장식] — 보통 둘 · 급행 */
const TC = [
  ['#e8483b', '#a92a21', '#ffd84a'],
  ['#3d8fe0', '#245c9e', '#d8f0ff'],
];
const FASTC = ['#f6b51c', '#b9800a', '#ff5a3a'];
const DASH = ['#ffe066', '#8fdcff'];
const smokeMem = new WeakMap<object, { x: number; y: number; t: number; dx: number }[]>();
const sayMem = new WeakMap<object, { x: number; y: number; t: number }[]>();
const leverMem = new WeakMap<object, number[]>();

interface Fore { paths: number[][]; ends: ({ c: number; ok: number; a: number } | null)[]; crash: number; ct: number }
/** 아무것도 안 하면(또는 tg 하나만 바꾸면) 어떻게 되나: 기차마다 처음 설 곳까지의 칸들 · 설 곳의 결과 · 부딪힐 칸 */
function forecast(S0: Sim, tg: { k: number; i: number } | null, H = 420): Fore {
  const S = cloneSim(S0);
  if (tg) {
    if (tg.k === 0) S.sw[tg.i] ^= 1;
    else S.sig[tg.i] ^= 1;
  }
  const paths = S.trains.map((tr) => [tr.hist[1], tr.hist[0], tr.nxt]);
  const ends: Fore['ends'] = S.trains.map(() => null);
  const fin = S.trains.map(() => false);
  // 이미 들어선 칸에서 설 일이 있으면 그 칸이 끝
  S.trains.forEach((tr, i) => {
    if (tr.pend === 1) {
      const p = tr.pax[front(tr)]!, a = S.N.stations[S.N.st[tr.hist[0]]].animal;
      ends[i] = { c: tr.hist[0], ok: p.want === a ? 1 : 0, a: p.want };
      fin[i] = true;
      paths[i].pop();
    } else if (tr.dwell > 0 || tr.pend === 2) fin[i] = tr.pend === 2 || tr.dwell > 0;
  });
  // 서 있는 기차도 앞으로 갈 길은 보여 준다
  S.trains.forEach((_tr, i) => {
    if (fin[i] && !ends[i]) fin[i] = false;
  });
  let crash = -1, ct = 0;
  for (let k = 0; k < H && fin.some((f) => !f); k++) {
    const heads = S.trains.map((tr) => tr.hist[0]);
    tick(S, null);
    if (S.crash >= 0) {
      crash = S.crash;
      ct = k;
      break;
    }
    S.trains.forEach((tr, i) => {
      if (fin[i] || tr.hist[0] === heads[i]) return;
      const pa = paths[i];
      if (pa[pa.length - 1] !== tr.nxt) pa.push(tr.nxt);
      if (tr.pend === 1) {
        const p = tr.pax[front(tr)]!, a = S.N.stations[S.N.st[tr.hist[0]]].animal;
        ends[i] = { c: tr.hist[0], ok: p.want === a ? (p.alt >= 0 ? 2 : 1) : 0, a: p.want };
        fin[i] = true;
        pa.pop();
      } else if (tr.pend === 2) {
        ends[i] = { c: tr.hist[0], ok: 3, a: -1 };
        fin[i] = true;
        pa.pop();
      } else if (pa.length > 16) fin[i] = true;
    });
  }
  return { paths, ends, crash, ct };
}

function star5(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 땅 위 상자: 가운데 (x,y)px, 땅 평면 각 phi, 길이 l·너비 wd(px), 바닥 높이 z0·높이 hh(px). 보이는 옆면만 그린다 */
function box(ctx: CanvasRenderingContext2D, x: number, y: number, phi: number, l: number, wd: number, z0: number, hh: number, side: string, top: string, dark: string) {
  const ca = Math.cos(phi), sa = Math.sin(phi);
  const g = [[l / 2, wd / 2], [l / 2, -wd / 2], [-l / 2, -wd / 2], [-l / 2, wd / 2]].map(([u, v]) => [x + u * ca - v * sa, y + (u * sa + v * ca) * KG]);
  const b = g.map(([a, c]) => [a, c - z0]), tp = g.map(([a, c]) => [a, c - z0 - hh]);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, mx = (g[i][0] + g[j][0]) / 2 - x, my = (g[i][1] + g[j][1]) / 2 - y;
    if (my <= 0.01) continue;
    ctx.fillStyle = mx < -Math.abs(my) * 0.3 ? side : dark;
    ctx.beginPath();
    ctx.moveTo(b[i][0], b[i][1]);
    ctx.lineTo(b[j][0], b[j][1]);
    ctx.lineTo(tp[j][0], tp[j][1]);
    ctx.lineTo(tp[i][0], tp[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = top;
  ctx.beginPath();
  tp.forEach(([a, c], i) => (i ? ctx.lineTo(a, c) : ctx.moveTo(a, c)));
  ctx.closePath();
  ctx.fill();
  return tp;
}

/** 동물 얼굴. mood: 0 보통 · 1 기쁨 · 2 화남 · 3 눈 가림 · 4 어질어질 · 5 놀람 */
function face(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, mood: number, t: number, anger = 0) {
  const [c0, c1, c2] = AC[a];
  ctx.save();
  ctx.translate(x, y);
  if (mood === 2) ctx.translate(Math.sin(t * 0.9) * r * 0.07, 0);
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.strokeStyle = c1;
  // 귀
  for (const sd of [-1, 1]) {
    ctx.fillStyle = c0;
    ctx.beginPath();
    if (a === 0) ctx.arc(sd * r * 0.66, -r * 0.66, r * 0.3, 0, Math.PI * 2);
    else if (a === 1) ctx.ellipse(sd * r * 0.34, -r * 1.12, r * 0.2, r * 0.6, sd * 0.18, 0, Math.PI * 2);
    else if (a === 2) (ctx.moveTo(sd * r * 0.35, -r * 0.8), ctx.lineTo(sd * r * 0.95, -r * 0.95), ctx.lineTo(sd * r * 0.8, -r * 0.38), ctx.closePath());
    else if (a === 3) (ctx.moveTo(sd * r * 0.25, -r * 0.75), ctx.lineTo(sd * r * 0.82, -r * 1.25), ctx.lineTo(sd * r * 0.92, -r * 0.42), ctx.closePath());
    else (ctx.moveTo(sd * r * 0.3, -r * 0.78), ctx.lineTo(sd * r * 0.78, -r * 1.08), ctx.lineTo(sd * r * 0.9, -r * 0.45), ctx.closePath());
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = a === 3 ? '#3a2418' : a === 4 ? '#3c424a' : c2;
    ctx.beginPath();
    if (a === 0) ctx.arc(sd * r * 0.66, -r * 0.66, r * 0.15, 0, Math.PI * 2);
    else if (a === 1) ctx.ellipse(sd * r * 0.34, -r * 1.1, r * 0.09, r * 0.42, sd * 0.18, 0, Math.PI * 2);
    else ctx.arc(sd * r * 0.68, -r * 0.78, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  // 머리
  const hg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  hg.addColorStop(0, mood === 2 && anger >= 2 ? '#ffb0a0' : '#ffffff');
  hg.addColorStop(0.25, mood === 2 && anger >= 2 ? '#ff8a70' : c0);
  hg.addColorStop(1, mood === 2 && anger >= 2 ? '#d9432f' : c1);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 얼굴 무늬
  if (a === 0) (ctx.fillStyle = c2), ctx.beginPath(), ctx.ellipse(0, r * 0.32, r * 0.45, r * 0.33, 0, 0, Math.PI * 2), ctx.fill();
  if (a === 3) {
    ctx.fillStyle = c2;
    for (const sd of [-1, 1]) ctx.beginPath(), ctx.ellipse(sd * r * 0.4, r * 0.38, r * 0.42, r * 0.36, sd * -0.4, 0, Math.PI * 2), ctx.fill();
  }
  if (a === 4) {
    ctx.fillStyle = '#3c424a';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.08, r * 0.82, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 눈
  const ey = -r * 0.08, ex = r * 0.36, er = r * 0.13;
  ctx.fillStyle = a === 4 ? '#ffffff' : '#1d1410';
  ctx.strokeStyle = a === 4 ? '#ffffff' : '#1d1410';
  ctx.lineWidth = Math.max(1.2, r * 0.11);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (mood === 1) ctx.arc(sd * ex, ey + er * 0.6, er, Math.PI * 1.15, Math.PI * 1.85);
    else if (mood === 4) {
      for (let k = 0; k < 10; k++) {
        const aa = k * 0.75 + t * 0.3, rr = (k / 10) * er * 1.2;
        ctx.lineTo(sd * ex + Math.cos(aa) * rr, ey + Math.sin(aa) * rr);
      }
    } else if (mood === 5) (ctx.fillStyle = '#ffffff'), ctx.arc(sd * ex, ey, er * 1.25, 0, Math.PI * 2), ctx.fill(), ctx.stroke(), (ctx.fillStyle = '#1d1410'), ctx.beginPath(), ctx.arc(sd * ex, ey, er * 0.55, 0, Math.PI * 2);
    else ctx.ellipse(sd * ex, ey, er * 0.75, er, 0, 0, Math.PI * 2);
    if (mood === 1 || mood === 4) ctx.stroke();
    else ctx.fill();
    if (mood === 2) {
      ctx.strokeStyle = '#1d1410';
      ctx.beginPath();
      ctx.moveTo(sd * (ex + er * 1.2), ey - er * 2.1);
      ctx.lineTo(sd * (ex - er * 1.1), ey - er * 1.1);
      ctx.stroke();
    }
  }
  // 코·입
  ctx.strokeStyle = '#1d1410';
  ctx.fillStyle = '#1d1410';
  if (a === 2) {
    ctx.fillStyle = '#ff8fa6';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.32, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9566d';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#a8364c';
    for (const sd of [-1, 1]) ctx.beginPath(), ctx.ellipse(sd * r * 0.12, r * 0.3, r * 0.05, r * 0.08, 0, 0, Math.PI * 2), ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * (a === 1 ? 0.08 : 0.13), r * (a === 1 ? 0.06 : 0.09), 0, 0, Math.PI * 2);
    ctx.fillStyle = a === 1 ? '#ff7f9c' : '#1d1410';
    ctx.fill();
  }
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.strokeStyle = '#1d1410';
  ctx.beginPath();
  const my = r * (a === 2 ? 0.6 : 0.42);
  if (mood === 1) (ctx.fillStyle = '#c0392b'), ctx.arc(0, my - r * 0.05, r * 0.2, 0.1, Math.PI - 0.1), ctx.closePath(), ctx.fill();
  else if (mood === 2) ctx.arc(0, my + r * 0.16, r * 0.17, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke();
  else if (mood === 5) ctx.ellipse(0, my, r * 0.09, r * 0.12, 0, 0, Math.PI * 2), ctx.fill();
  else ctx.arc(0, my - r * 0.1, r * 0.13, 0.3, Math.PI - 0.3), ctx.stroke();
  // 볼
  if (mood !== 2) {
    ctx.fillStyle = 'rgba(255,110,120,.35)';
    for (const sd of [-1, 1]) ctx.beginPath(), ctx.ellipse(sd * r * 0.58, r * 0.22, r * 0.17, r * 0.1, 0, 0, Math.PI * 2), ctx.fill();
  }
  // 눈 가린 두 손
  if (mood === 3) {
    ctx.fillStyle = c0;
    ctx.strokeStyle = c1;
    ctx.lineWidth = Math.max(1, r * 0.08);
    for (const sd of [-1, 1]) ctx.beginPath(), ctx.ellipse(sd * r * 0.36, ey, r * 0.3, r * 0.24, sd * 0.3, 0, Math.PI * 2), ctx.fill(), ctx.stroke();
  }
  // 💢
  if (mood === 2) {
    ctx.strokeStyle = '#ff2a2a';
    ctx.lineWidth = Math.max(1.4, r * 0.12);
    const ax = r * 0.85, ay = -r * 0.85, q = r * 0.22;
    ctx.beginPath();
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      ctx.moveTo(ax + sx * q * 0.35, ay + sy * q);
      ctx.quadraticCurveTo(ax + sx * q * 0.35, ay + sy * q * 0.35, ax + sx * q, ay + sy * q * 0.35);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** 소: 흰 몸에 검은 얼룩, 풀 뜯을 땐 고개를 숙인다 */
function cow(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, f: number, graze: number, t: number, k: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,50,20,.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 1.25, u * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(f, 1);
  const leg = Math.sin(t * 0.25 + k) * u * 0.08 * (graze ? 0 : 1);
  ctx.fillStyle = '#3a3330';
  for (const [lx, ph] of [[-0.6, 1], [-0.3, -1], [0.35, 1], [0.62, -1]]) ctx.fillRect(u * lx - u * 0.08, -u * 0.55, u * 0.16, u * 0.55 + ph * leg);
  const g = ctx.createLinearGradient(0, -u * 1.3, 0, -u * 0.45);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d9d6d0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.85, u * 0.95, u * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2420';
  for (const [sx, sy, sr] of [[-0.35, -0.95, 0.24], [0.25, -0.75, 0.2], [0.55, -1.05, 0.14]]) ctx.beginPath(), ctx.ellipse(u * sx, u * sy, u * sr, u * sr * 0.75, 0.4, 0, Math.PI * 2), ctx.fill();
  // 꼬리
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = Math.max(1, u * 0.07);
  ctx.beginPath();
  ctx.moveTo(-u * 0.92, -u * 0.95);
  ctx.quadraticCurveTo(-u * 1.25, -u * 0.7 + Math.sin(t * 0.15 + k) * u * 0.15, -u * 1.1, -u * 0.45);
  ctx.stroke();
  // 머리
  const hx = u * 1.0, hy = graze ? -u * 0.38 : -u * 1.05;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(hx, hy, u * 0.36, u * 0.32, graze ? 0.6 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb3c1';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.18, hy + u * 0.14, u * 0.22, u * 0.15, graze ? 0.6 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8d9a0';
  for (const sd of [-1, 1]) ctx.beginPath(), ctx.ellipse(hx - u * 0.1 + sd * u * 0.05, hy - u * 0.32, u * 0.06, u * 0.14, sd * 0.6, 0, Math.PI * 2), ctx.fill();
  ctx.fillStyle = '#1d1410';
  if (!graze) ctx.beginPath(), ctx.arc(hx + u * 0.05, hy - u * 0.06, u * 0.05, 0, Math.PI * 2), ctx.fill();
  else {
    // 풀 한 가닥 오물오물
    ctx.strokeStyle = '#4fa04a';
    ctx.lineWidth = Math.max(1, u * 0.06);
    ctx.beginPath();
    ctx.moveTo(hx + u * 0.3, hy + u * 0.2);
    ctx.lineTo(hx + u * 0.45, hy + u * 0.05 + Math.sin(t * 0.4 + k) * u * 0.06);
    ctx.stroke();
  }
  ctx.restore();
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, kind: number, t: number, k: number) {
  ctx.fillStyle = 'rgba(30,60,20,.25)';
  ctx.beginPath();
  ctx.ellipse(x + u * 0.25, y, u * 0.75, u * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a4b2a';
  ctx.fillRect(x - u * 0.09, y - u * 0.55, u * 0.18, u * 0.55);
  const sway = Math.sin(t * 0.03 + k) * u * 0.04;
  if (kind === 0) {
    for (const [dx, dy, r, c] of [[0, -1.05, 0.55, '#3f9e4a'], [-0.28, -0.8, 0.38, '#4caf55'], [0.3, -0.85, 0.4, '#48a851'], [0.05, -1.3, 0.36, '#5cc265']] as [number, number, number, string][]) {
      const g = ctx.createRadialGradient(x + (dx - 0.15) * u + sway, y + (dy - 0.15) * u, u * 0.05, x + dx * u + sway, y + dy * u, r * u);
      g.addColorStop(0, '#9be38f');
      g.addColorStop(0.4, c);
      g.addColorStop(1, '#2e7a37');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + dx * u + sway, y + dy * u, r * u, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const yy = y - u * (0.45 + i * 0.38), ww = u * (0.62 - i * 0.14);
      ctx.fillStyle = i % 2 ? '#2f8a4c' : '#2a7d45';
      ctx.beginPath();
      ctx.moveTo(x - ww + sway * i * 0.5, yy);
      ctx.lineTo(x + ww + sway * i * 0.5, yy);
      ctx.lineTo(x + sway * (i + 1) * 0.5, yy - u * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.beginPath();
      ctx.moveTo(x - ww * 0.8 + sway * i * 0.5, yy - u * 0.02);
      ctx.lineTo(x + sway * (i + 1) * 0.5, yy - u * 0.6);
      ctx.lineTo(x - ww * 0.2 + sway * i * 0.5, yy - u * 0.04);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** 집 한 채 (축에 맞춘 상자 + 박공지붕) */
function house(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, wall: string, roof: string, lit: boolean, door = true) {
  ctx.fillStyle = 'rgba(30,50,20,.28)';
  ctx.beginPath();
  ctx.ellipse(x + u * 0.12, y + u * 0.08, u * 0.95, u * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  box(ctx, x, y, 0, u * 1.3, u * 0.8, 0, u * 0.62, wall, wall, shade(wall, -0.18));
  const top = y - u * 0.62, fy = y + u * 0.4 * KG - u * 0.62, by = y - u * 0.4 * KG - u * 0.62;
  // 지붕: 앞면·뒷면
  ctx.fillStyle = shade(roof, -0.15);
  ctx.beginPath();
  ctx.moveTo(x - u * 0.78, by + u * 0.02);
  ctx.lineTo(x + u * 0.78, by + u * 0.02);
  ctx.lineTo(x + u * 0.72, top - u * 0.48);
  ctx.lineTo(x - u * 0.72, top - u * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.8, fy + u * 0.06);
  ctx.lineTo(x + u * 0.8, fy + u * 0.06);
  ctx.lineTo(x + u * 0.72, top - u * 0.48);
  ctx.lineTo(x - u * 0.72, top - u * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(x - u * 0.72, top - u * 0.5, u * 1.44, u * 0.06);
  // 앞벽 창·문
  const wy = y + u * 0.4 * KG;
  ctx.fillStyle = lit ? '#ffe9a0' : '#9ad3f0';
  ctx.fillRect(x - u * 0.48, wy - u * 0.46, u * 0.24, u * 0.2);
  ctx.fillRect(x + u * 0.24, wy - u * 0.46, u * 0.24, u * 0.2);
  if (door) (ctx.fillStyle = '#7a4b2a'), ctx.fillRect(x - u * 0.1, wy - u * 0.38, u * 0.2, u * 0.38);
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function drawAll(ctx: CanvasRenderingContext2D, s: RailState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage], N = s.N;
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const px = (c: number) => X(CXc(c)), py = (c: number) => Y(CYc(c));
  const mid = (a: number, b: number) => [(px(a) + px(b)) / 2, (py(a) + py(b)) / 2];
  const night = !!d.night;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = sayMem.get(s);
    if (!rec) sayMem.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.28 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.16, Math.min(w * 0.84, x)), y, text, col, size);
  };
  /** 칸 c를 a에서 들어와 b로 나가는 곡선 위 u 지점과 방향 */
  const curve = (a: number, c: number, b: number) => {
    const [x0, y0] = mid(a, c), [x2, y2] = mid(c, b);
    return { x0, y0, x1: px(c), y1: py(c), x2, y2 };
  };
  const at = (q: ReturnType<typeof curve>, u: number) => {
    const v = 1 - u;
    return {
      x: v * v * q.x0 + 2 * v * u * q.x1 + u * u * q.x2,
      y: v * v * q.y0 + 2 * v * u * q.y1 + u * u * q.y2,
      dx: 2 * v * (q.x1 - q.x0) + 2 * u * (q.x2 - q.x1),
      dy: 2 * v * (q.y1 - q.y0) + 2 * u * (q.y2 - q.y1),
    };
  };
  const pieces: { a: number; c: number; b: number; on: boolean }[] = [];
  for (let c = 0; c < NC; c++)
    for (const a of N.inn[c])
      N.out[c].forEach((b, k) => {
        const j = N.jn[c];
        pieces.push({ a, c, b, on: j < 0 || s.sw[j] === k });
      });
  // 기차마다 지금 칸들의 위치 (머리·칸들)
  const trainPos = s.trains.map((tr) => {
    const u = Math.min(1, tr.pt / tr.per);
    return tr.hist.slice(0, tr.cars + 1).map((c, k) => {
      const q = curve(tr.hist[k + 1], c, k === 0 ? tr.nxt : tr.hist[k - 1]), p = at(q, u);
      return { x: p.x, y: p.y, phi: Math.atan2(p.dy / KG, p.dx), c };
    });
  });

  ctx.save();
  fx.begin(ctx);
  // ═════════════ 하늘·먼 산 ═════════════
  const sky = ctx.createLinearGradient(0, 0, 0, Y(BY0));
  sky.addColorStop(0, night ? '#0f1838' : '#8fd3ff');
  sky.addColorStop(1, night ? '#2a3a72' : '#e6f7ff');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(BY0) + 20);
  if (night) {
    for (let k = 0; k < 40; k++) {
      ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 0.03 + k));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hsh(k) * w, Y(0.09) + hsh(k + 50) * Y(0.12), k % 5 ? 1.5 : 2.5, k % 5 ? 1.5 : 2.5);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff6c8';
    ctx.shadowColor = '#fff3b0';
    ctx.shadowBlur = R(0.05);
    ctx.beginPath();
    ctx.arc(X(0.84), Y(0.135), R(0.03), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a3a72';
    ctx.beginPath();
    ctx.arc(X(0.855), Y(0.128), R(0.026), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#fff3b0';
    ctx.shadowColor = '#fff7d0';
    ctx.shadowBlur = R(0.06);
    ctx.beginPath();
    ctx.arc(X(0.86), Y(0.14), R(0.032), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (let k = 0; k < 3; k++) {
      const cx0 = ((X(0.2 + k * 0.33) + t * (0.15 + k * 0.05)) % (w + R(0.3))) - R(0.15), cy0 = Y(0.115 + (k % 2) * 0.035);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (const [dx, dy, r] of [[0, 0, 0.03], [0.03, -0.012, 0.025], [-0.03, 0.004, 0.022], [0.055, 0.004, 0.018]]) ctx.beginPath(), ctx.arc(cx0 + R(dx), cy0 + R(dy), R(r), 0, Math.PI * 2), ctx.fill();
    }
  }
  // 먼 언덕 둘
  for (const [base, amp, col, ph] of [[0.215, 0.04, night ? '#22345a' : '#9fd88a', 0.5], [0.245, 0.03, night ? '#1b2b4a' : '#7cc56e', 2.1]] as [number, number, string, number][]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, Y(BY0));
    for (let k = 0; k <= 20; k++) ctx.lineTo((k / 20) * w, Y(base - amp * (0.5 + 0.5 * Math.sin(k * 0.7 + ph)) * (0.6 + 0.4 * Math.sin(k * 0.23))));
    ctx.lineTo(w, Y(BY0));
    ctx.closePath();
    ctx.fill();
  }
  // 먼 마을 지붕들
  for (let k = 0; k < 6; k++) {
    const hx = X(0.08 + k * 0.17 + hsh(k) * 0.05), hy = Y(0.238 - hsh(k + 9) * 0.01), hw2 = R(0.028);
    ctx.fillStyle = night ? '#1a2440' : ['#f6e3c4', '#ffe0d0', '#e8f0ff'][k % 3];
    ctx.fillRect(hx - hw2, hy - R(0.03), hw2 * 2, R(0.03));
    ctx.fillStyle = night ? '#141c34' : ['#d9573f', '#3f7fd9', '#7a4fb0'][k % 3];
    ctx.beginPath();
    ctx.moveTo(hx - hw2 * 1.2, hy - R(0.03));
    ctx.lineTo(hx, hy - R(0.055));
    ctx.lineTo(hx + hw2 * 1.2, hy - R(0.03));
    ctx.fill();
    if (night) (ctx.fillStyle = '#ffd86a'), ctx.fillRect(hx - R(0.008), hy - R(0.022), R(0.016), R(0.012));
  }
  // ═════════════ 나무 탁자 + 디오라마 판 ═════════════
  const bx0 = X(BX0 - 0.012), bx1 = X(BX0 + COLS * CW + 0.012), by0 = Y(BY0 - 0.012), by1 = Y(BY0 + ROWS * RH + 0.004);
  ctx.fillStyle = night ? '#3a2a20' : '#c99263';
  ctx.fillRect(-10, Y(BY0 - 0.004), w + 20, h);
  for (let k = 0; k < 9; k++) {
    ctx.strokeStyle = night ? 'rgba(0,0,0,.18)' : 'rgba(120,70,30,.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, Y(BY0 + 0.03 + k * 0.12));
    ctx.bezierCurveTo(w * 0.3, Y(BY0 + 0.05 + k * 0.12), w * 0.6, Y(BY0 + 0.01 + k * 0.12), w, Y(BY0 + 0.04 + k * 0.12));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,20,0,.35)';
  ctx.beginPath();
  ctx.roundRect(bx0 + R(0.012), by0 + R(0.03), bx1 - bx0, by1 - by0 + R(0.045), R(0.03));
  ctx.fill();
  // 판 앞면 (흙 두께)
  ctx.fillStyle = night ? '#3b2616' : '#8a5a36';
  ctx.beginPath();
  ctx.roundRect(bx0, by0 + R(0.03), bx1 - bx0, by1 - by0 + R(0.012), R(0.03));
  ctx.fill();
  ctx.fillStyle = night ? '#2c1c10' : '#6e4426';
  ctx.fillRect(bx0 + R(0.02), by1 + R(0.022), bx1 - bx0 - R(0.04), R(0.008));
  // 잔디 윗면
  const gg = ctx.createLinearGradient(0, by0, 0, by1);
  gg.addColorStop(0, night ? '#2f5a3a' : '#8fd67a');
  gg.addColorStop(1, night ? '#28503a' : '#74c464');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.roundRect(bx0, by0, bx1 - bx0, by1 - by0, R(0.03));
  ctx.fill();
  ctx.strokeStyle = night ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 잔디 무늬·꽃
  for (let k = 0; k < 70; k++) {
    const gx0 = bx0 + hsh(k * 3 + 1) * (bx1 - bx0), gy0 = by0 + hsh(k * 7 + 2) * (by1 - by0);
    ctx.fillStyle = k % 9 === 0 ? (night ? '#8a8fb0' : ['#ffffff', '#ffe066', '#ff9ec4'][k % 3]) : night ? 'rgba(0,0,0,.12)' : 'rgba(40,120,40,.22)';
    if (k % 9 === 0) ctx.beginPath(), ctx.arc(gx0, gy0, R(0.006), 0, Math.PI * 2), ctx.fill();
    else ctx.fillRect(gx0, gy0, R(0.004), R(0.012));
  }
  // 소 건널목 흙길
  if (N.cow >= 0) {
    const cxw = px(N.cow);
    ctx.fillStyle = night ? '#4a3a2a' : '#d8b98a';
    ctx.fillRect(cxw - R(0.04), by0, R(0.08), by1 - by0);
    ctx.fillStyle = night ? 'rgba(0,0,0,.15)' : 'rgba(150,110,60,.25)';
    for (let k = 0; k < 14; k++) ctx.fillRect(cxw - R(0.03) + hsh(k) * R(0.06), by0 + hsh(k + 3) * (by1 - by0), R(0.008), R(0.004));
  }
  // ═════════════ 선로: 자갈 → 침목 → 레일 ═════════════
  const SAMP = 10;
  const piecePts = (q: ReturnType<typeof curve>) => Array.from({ length: SAMP + 1 }, (_, i) => at(q, i / SAMP));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const pc of pieces) {
    const pts = piecePts(curve(pc.a, pc.c, pc.b));
    ctx.strokeStyle = night ? '#5a5a62' : '#bfae95';
    ctx.lineWidth = R(0.064);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  for (const pc of pieces) {
    const pts = piecePts(curve(pc.a, pc.c, pc.b));
    ctx.strokeStyle = night ? '#6c6c74' : '#d6c7ae';
    ctx.lineWidth = R(0.046);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  for (const pc of pieces) {
    if (!pc.on) continue;
    const pts = piecePts(curve(pc.a, pc.c, pc.b));
    for (let i = 1; i < SAMP; i += 3) {
      const p = pts[i], l = Math.hypot(p.dx, p.dy) || 1, nx = -p.dy / l, ny = p.dx / l;
      ctx.strokeStyle = night ? '#4a3420' : '#8b5a35';
      ctx.lineWidth = R(0.013);
      ctx.beginPath();
      ctx.moveTo(p.x + nx * R(0.031), p.y + ny * R(0.031));
      ctx.lineTo(p.x - nx * R(0.031), p.y - ny * R(0.031));
      ctx.stroke();
    }
  }
  const rail = (pts: { x: number; y: number; dx: number; dy: number }[], off: number, col: string, lw: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const l = Math.hypot(p.dx, p.dy) || 1, xx = p.x - (p.dy / l) * off, yy = p.y + (p.dx / l) * off;
      if (i) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    });
    ctx.stroke();
  };
  for (const pass of [0, 1])
    for (const pc of pieces) {
      if (pc.on !== !!pass) continue;
      const pts = piecePts(curve(pc.a, pc.c, pc.b));
      for (const sd of [-1, 1]) {
        rail(pts, sd * R(0.017), pc.on ? (night ? '#4a525e' : '#59626e') : 'rgba(90,98,110,.45)', R(0.009));
        if (pc.on) rail(pts, sd * R(0.017) - R(0.002), night ? '#9aa6b8' : '#eef3f8', R(0.0035));
      }
    }
  // ═════════════ 점선: 기차가 앞으로 갈 길 ═════════════
  const fc = s.phase === 'play' ? forecast(s, null) : null;
  // 누르고 있는 동안: 이 갈림길(신호등)을 바꾸면
  let hover = -1;
  if (s.down && s.aim && s.phase === 'play') hover = hitAt(s, s.aim.x, s.aim.y);
  const hv = hover >= 0 ? N.hits[hover] : null;
  const hvLocked = !!hv && hv.k === 0 && locked(s, hv.i);
  const pv = hv && !hvLocked ? forecast(s, { k: hv.k, i: hv.i }) : null;
  const dashPath = (i: number, path: number[], col: string, lw: number, alpha: number, march: number) => {
    const tr = s.trains[i], tp = trainPos[i][0];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setLineDash([R(0.022), R(0.016)]);
    ctx.lineDashOffset = -march;
    ctx.lineCap = 'round';
    const pts: number[][] = [[tp.x, tp.y]];
    // path = [꼬리 쪽 칸, 머리 칸, 다음 칸, …]
    const u0 = Math.min(1, tr.pt / tr.per);
    if (path.length >= 3) {
      const q0 = curve(path[0], path[1], path[2]);
      for (let k = 1; k <= 6; k++) {
        const p = at(q0, u0 + ((1 - u0) * k) / 6);
        pts.push([p.x, p.y]);
      }
    }
    for (let m = 2; m < path.length; m++) {
      const q = curve(path[m - 1], path[m], path[m + 1] ?? path[m]);
      const last = m === path.length - 1;
      for (let k = 1; k <= 6; k++) {
        if (last && k > 3) break;
        const p = at(q, k / 6);
        pts.push([p.x, p.y]);
      }
    }
    const hidden = (x: number, y: number) => {
      if (!N.tun.some(Boolean)) return false;
      const cx0 = Math.floor((x / w - BX0) / CW), cy0 = Math.floor((y / w - BY0) / RH);
      return cx0 >= 0 && cy0 >= 0 && cx0 < COLS && cy0 < ROWS && N.tun[cid(cx0, cy0)];
    };
    for (const [lw0, c0] of [[lw + R(0.008), 'rgba(40,30,20,.55)'], [lw, col]] as [number, string][]) {
      ctx.strokeStyle = c0;
      ctx.lineWidth = lw0;
      ctx.beginPath();
      let pen = false;
      for (const [x, y] of pts) {
        if (hidden(x, y)) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y), (pen = true);
      }
      ctx.stroke();
    }
    ctx.restore();
    // 화살촉
    if (pts.length > 2) {
      const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 2];
      if (!hidden(ax, ay)) {
        const an = Math.atan2(ay - by, ax - bx);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = col;
        ctx.strokeStyle = 'rgba(40,30,20,.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax + Math.cos(an) * R(0.02), ay + Math.sin(an) * R(0.02));
        ctx.lineTo(ax + Math.cos(an + 2.5) * R(0.018), ay + Math.sin(an + 2.5) * R(0.018));
        ctx.lineTo(ax + Math.cos(an - 2.5) * R(0.018), ay + Math.sin(an - 2.5) * R(0.018));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  };
  if (fc) {
    s.trains.forEach((tr, i) => {
      const changed = pv && pv.paths[i].join() !== fc.paths[i].join();
      dashPath(i, fc.paths[i], tr.fast ? '#ffb02e' : DASH[i % 2], R(0.011), changed ? 0.3 : 0.95, t * 0.6);
    });
    if (pv)
      s.trains.forEach((_tr, i) => {
        if (pv.paths[i].join() !== fc.paths[i].join()) dashPath(i, pv.paths[i], '#ffffff', R(0.015), 1, t * 0.9);
      });
  }
  // ═════════════ 땅 위 물건들 (뒤에서 앞으로) ═════════════
  type Dr = { y: number; f: () => void };
  const L: Dr[] = [];
  const used = new Set<number>();
  for (let c = 0; c < NC; c++) if (N.out[c].length) used.add(c);
  for (const st of N.stations) used.add(st.b);
  used.add(N.dpl);
  if (N.cow >= 0) used.add(N.cow - COLS);
  // 장식: 빈 칸마다 나무·집·꽃밭 (판마다 같은 배치)
  for (let c = 0; c < NC; c++) {
    if (used.has(c)) continue;
    const hv0 = hsh(c * 13 + s.stage * 7), x0 = px(c) + (hsh(c * 5) - 0.5) * R(0.03), y0 = py(c) + (hsh(c * 3) - 0.5) * R(0.02);
    const edge = gx(c) === 0 || gx(c) === COLS - 1 || gy(c) === 0 || gy(c) === ROWS - 1;
    if (hv0 < 0.45) L.push({ y: y0, f: () => tree(ctx, x0, y0, R(0.045 + hsh(c) * 0.012), hv0 < 0.22 ? 1 : 0, t, c) });
    else if (hv0 < 0.62 && edge) L.push({ y: y0, f: () => house(ctx, x0, y0, R(0.04), ['#fff2dc', '#ffe3e3', '#e6f0ff', '#f0ffe6'][c % 4], ['#d9573f', '#3f7fd9', '#7a4fb0', '#e08a2a'][c % 4], night) });
    else if (hv0 < 0.8)
      L.push({
        y: y0,
        f: () => {
          for (let k = 0; k < 5; k++) {
            ctx.fillStyle = ['#ff6b8a', '#ffe066', '#ffffff', '#b28dff', '#ff9a3c'][(c + k) % 5];
            ctx.beginPath();
            ctx.arc(x0 + (hsh(c + k) - 0.5) * R(0.07), y0 + (hsh(c * 2 + k) - 0.5) * R(0.035), R(0.008), 0, Math.PI * 2);
            ctx.fill();
          }
        },
      });
    else if (!edge && hv0 < 0.9)
      L.push({
        y: y0,
        f: () => {
          // 작은 연못과 오리
          ctx.fillStyle = night ? '#1f3a5a' : '#6cc8ef';
          ctx.beginPath();
          ctx.ellipse(x0, y0, R(0.05), R(0.026), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          const dxk = Math.sin(t * 0.02 + c) * R(0.02);
          ctx.fillStyle = '#ffe14d';
          ctx.beginPath();
          ctx.ellipse(x0 + dxk, y0 - R(0.004), R(0.011), R(0.007), 0, 0, Math.PI * 2);
          ctx.arc(x0 + dxk + R(0.008), y0 - R(0.012), R(0.006), 0, Math.PI * 2);
          ctx.fill();
        },
      });
  }
  // 역 (건물 + 승강장 + 동물 간판)
  const stationLit = (i: number) => fc?.ends.some((e) => e && e.c === N.stations[i].cell);
  N.stations.forEach((st, i) => {
    const bx = px(st.b), by = py(st.b), sx = px(st.cell), sy = py(st.cell);
    const front = gy(st.b) > gy(st.cell);
    L.push({
      y: by - (front ? 0 : R(0.001)),
      f: () => {
        const u = R(0.05);
        house(ctx, bx, by, u, ['#fff1d6', '#fde6ef', '#ffe5e8'][st.animal], ['#c9442f', '#3f8fd9', '#e07a9a'][st.animal], night, false);
        // 간판 기둥 + 동물 얼굴
        const gx0 = (bx + sx) / 2 + R(front ? -0.05 : 0.05), gy0 = (by + sy) / 2 + R(front ? 0.004 : 0);
        ctx.fillStyle = '#6b4a2a';
        ctx.fillRect(gx0 - R(0.004), gy0 - R(0.07), R(0.008), R(0.07));
        const lit = stationLit(i);
        const pulse = lit ? 1 + Math.sin(t * 0.2) * 0.06 : 1;
        ctx.fillStyle = lit ? '#fff3b0' : '#ffffff';
        ctx.strokeStyle = ['#6f4527', '#3f8fd9', '#d9758a'][st.animal];
        ctx.lineWidth = R(0.006);
        ctx.beginPath();
        ctx.arc(gx0, gy0 - R(0.085), R(0.04) * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        face(ctx, gx0, gy0 - R(0.08), R(0.026) * pulse, st.animal, 0, t);
      },
    });
    // 승강장 (선로 옆 돌판)
    L.push({
      y: sy - R(0.03),
      f: () => {
        const pyy = sy + (front ? R(0.035) : -R(0.04));
        ctx.fillStyle = night ? '#6a6a72' : '#e7dccb';
        ctx.beginPath();
        ctx.roundRect(sx - R(0.075), pyy - R(0.012), R(0.15), R(0.024), R(0.006));
        ctx.fill();
        ctx.fillStyle = night ? '#4a4a52' : '#bfae95';
        ctx.fillRect(sx - R(0.075), pyy + R(0.01), R(0.15), R(0.006));
        ctx.fillStyle = '#ffd84a';
        ctx.fillRect(sx - R(0.075), pyy + (front ? -R(0.012) : R(0.008)), R(0.15), R(0.003));
      },
    });
  });
  // 출발역: 지붕 있는 승강장 + 기다리는 손님 줄
  {
    const dx0 = px(N.depot), dy0 = py(N.depot), plx = px(N.dpl), ply = py(N.dpl);
    L.push({
      y: ply - R(0.02),
      f: () => {
        ctx.fillStyle = night ? '#6a6a72' : '#efe3cf';
        ctx.beginPath();
        ctx.roundRect(plx - R(0.17), ply - R(0.035), R(0.34), R(0.05), R(0.008));
        ctx.fill();
        ctx.fillStyle = night ? '#4a4a52' : '#c4b294';
        ctx.fillRect(plx - R(0.17), ply + R(0.012), R(0.34), R(0.01));
        ctx.fillStyle = '#ffd84a';
        ctx.fillRect(plx - R(0.17), ply - R(0.035), R(0.34), R(0.004));
        // 기다리는 손님 (먼저 탈 손님이 오른쪽 = 기차가 오는 쪽)
        const q = s.queue.slice(0, 5);
        q.forEach((p, k) => {
          const qx = plx + R(0.12) - k * R(0.062), qy = ply - R(0.012) + Math.abs(Math.sin(t * 0.12 + k)) * -R(0.004);
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          ctx.beginPath();
          ctx.ellipse(qx, qy + R(0.012), R(0.02), R(0.007), 0, 0, Math.PI * 2);
          ctx.fill();
          face(ctx, qx, qy - R(0.012), R(0.024), p.fox ? 3 : p.want, k === 0 ? 1 : 0, t + k * 9);
          if (p.fox) {
            // 관광 여우: 갈 역 둘
            ctx.fillStyle = 'rgba(255,255,255,.95)';
            ctx.beginPath();
            ctx.roundRect(qx - R(0.034), qy - R(0.08), R(0.068), R(0.03), R(0.012));
            ctx.fill();
            face(ctx, qx - R(0.017), qy - R(0.065), R(0.011), p.want, 0, t);
            face(ctx, qx + R(0.017), qy - R(0.065), R(0.011), p.alt, 0, t);
          }
        });
        if (s.queue.length > 5) {
          ctx.fillStyle = '#ffffff';
          font(0.03, 900);
          ctx.textAlign = 'center';
          ctx.fillText(`+${s.queue.length - 5}`, plx - R(0.2), ply - R(0.02));
        }
      },
    });
    // 지붕 (기둥 넷)
    L.push({
      y: ply + R(0.04),
      f: () => {
        const rx0 = plx - R(0.18), rx1 = plx + R(0.18), ry = ply - R(0.1);
        ctx.fillStyle = '#7a4b2a';
        for (const xx of [rx0 + R(0.02), rx1 - R(0.02)]) ctx.fillRect(xx - R(0.004), ry, R(0.008), R(0.1));
        ctx.fillStyle = night ? '#7a2a22' : '#d9483a';
        ctx.beginPath();
        ctx.moveTo(rx0 - R(0.01), ry + R(0.01));
        ctx.lineTo(rx1 + R(0.01), ry + R(0.01));
        ctx.lineTo(rx1 - R(0.01), ry - R(0.03));
        ctx.lineTo(rx0 + R(0.01), ry - R(0.03));
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 7; k++) ctx.fillRect(rx0 + R(0.005) + k * R(0.052), ry + R(0.004), R(0.026), R(0.007));
        ctx.fillStyle = '#ffffff';
        font(0.026, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚉 출발역', plx, ry - R(0.011));
        void dx0;
        void dy0;
      },
    });
  }
  // 갈림길 레버 (갈림길 칸 옆 작은 신호 상자 + 방향 화살표 표지)
  let lev = leverMem.get(s);
  if (!lev || lev.length !== N.jcell.length) leverMem.set(s, (lev = N.jcell.map((_, j) => s.sw[j])));
  N.jcell.forEach((c, j) => {
    lev![j] += (s.sw[j] - lev![j]) * 0.3;
    const x0 = px(c), y0 = py(c), inTun = N.tun[c];
    L.push({
      y: y0 + R(0.03),
      f: () => {
        // 누를 자리 고리 (숨쉬듯)
        const isHv = hv && hv.k === 0 && hv.i === j;
        const br = 0.5 + 0.5 * Math.sin(t * 0.12 + j);
        ctx.strokeStyle = isHv ? '#ffffff' : `rgba(255,255,255,${0.35 + 0.35 * br})`;
        ctx.lineWidth = isHv ? R(0.008) : R(0.005);
        ctx.beginPath();
        ctx.ellipse(x0, y0, R(0.062), R(0.062) * KG, 0, 0, Math.PI * 2);
        ctx.stroke();
        // 바뀌는 방향 표지: 지금 가는 쪽 화살표
        const b = N.out[c][s.sw[j]], ang = Math.atan2(py(b) - y0, px(b) - x0);
        const sx0 = x0 - R(0.045), sy0 = y0 - R(0.07);
        ctx.fillStyle = '#6b4a2a';
        ctx.fillRect(sx0 - R(0.003), sy0, R(0.006), R(0.06));
        ctx.fillStyle = inTun && locked(s, j) ? '#9aa3ad' : '#2f9e5a';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = R(0.005);
        ctx.beginPath();
        ctx.arc(sx0, sy0, R(0.026), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.translate(sx0, sy0);
        ctx.rotate(ang);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(R(0.018), 0);
        ctx.lineTo(R(0.002), -R(0.013));
        ctx.lineTo(R(0.002), -R(0.005));
        ctx.lineTo(-R(0.016), -R(0.005));
        ctx.lineTo(-R(0.016), R(0.005));
        ctx.lineTo(R(0.002), R(0.005));
        ctx.lineTo(R(0.002), R(0.013));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (inTun && locked(s, j)) {
          ctx.fillStyle = '#ffffff';
          font(0.022, 900);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', sx0 + R(0.03), sy0 - R(0.02));
        }
        // 레버: 기울기가 철컥 바뀐다
        const lx = x0 + R(0.048), ly = y0 + R(0.012);
        ctx.fillStyle = '#7a5434';
        ctx.fillRect(lx - R(0.014), ly - R(0.012), R(0.028), R(0.016));
        ctx.strokeStyle = '#3a3a40';
        ctx.lineWidth = R(0.006);
        ctx.beginPath();
        ctx.moveTo(lx, ly - R(0.008));
        const la = (lev![j] - 0.5) * 1.6;
        ctx.lineTo(lx + Math.sin(la) * R(0.035), ly - R(0.008) - Math.cos(la) * R(0.035));
        ctx.stroke();
        ctx.fillStyle = '#e8483b';
        ctx.beginPath();
        ctx.arc(lx + Math.sin(la) * R(0.035), ly - R(0.008) - Math.cos(la) * R(0.035), R(0.009), 0, Math.PI * 2);
        ctx.fill();
      },
    });
  });
  // 신호등
  N.sigCell.forEach((_c, i) => {
    const hh = N.hits.find((q) => q.k === 1 && q.i === i)!, x0 = X(hh.x), y0 = Y(hh.y) + R(0.045);
    L.push({
      y: y0,
      f: () => {
        const red = s.sig[i] === 1, isHv = hv && hv.k === 1 && hv.i === i;
        ctx.strokeStyle = isHv ? '#ffffff' : `rgba(255,255,255,${0.35 + 0.3 * Math.sin(t * 0.12 + i)})`;
        ctx.lineWidth = R(0.005);
        ctx.beginPath();
        ctx.ellipse(x0, y0 - R(0.045), R(0.05), R(0.06), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath();
        ctx.ellipse(x0 + R(0.006), y0, R(0.016), R(0.006), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a4f58';
        ctx.fillRect(x0 - R(0.004), y0 - R(0.06), R(0.008), R(0.06));
        ctx.fillStyle = '#2a2e35';
        ctx.beginPath();
        ctx.roundRect(x0 - R(0.016), y0 - R(0.11), R(0.032), R(0.058), R(0.008));
        ctx.fill();
        for (const [k, on, col] of [[0, red, '#ff3b30'], [1, !red, '#3ddc5a']] as [number, boolean, string][]) {
          ctx.fillStyle = on ? col : '#1a1d22';
          if (on) (ctx.shadowColor = col), (ctx.shadowBlur = R(0.03));
          ctx.beginPath();
          ctx.arc(x0, y0 - R(0.095) + k * R(0.028), R(0.01), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      },
    });
  });
  // 소 떼
  if (N.cow >= 0) {
    const cx0 = px(N.cow), cy0 = py(N.cow), up = py(N.cow - COLS);
    for (let k = 0; k < 3; k++) {
      const ph = s.cowOn ? Math.min(1, (COW_ON - s.cowT) / 40) : Math.max(0, 1 - (COW_OFF - s.cowT) / 40);
      const onY = cy0 + (k - 1) * R(0.018), offY = up + (k - 1) * R(0.012);
      const yy = offY + (onY - offY) * ph, xx = cx0 + (k - 1) * R(0.038) + Math.sin(t * 0.01 + k) * R(0.006);
      const grazing = (s.cowOn && ph >= 1) || (!s.cowOn && ph <= 0);
      L.push({ y: yy, f: () => cow(ctx, xx, yy, R(0.026), k % 2 ? -1 : 1, grazing ? 1 : 0, t, k) });
    }
    // 건널목 차단기·경고등
    L.push({
      y: cy0 + R(0.04),
      f: () => {
        for (const sd of [-1, 1]) {
          const bx = cx0 + sd * R(0.058), by = cy0 + R(0.035);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx - R(0.003), by - R(0.06), R(0.006), R(0.06));
          const blink = s.cowOn && (t >> 4) % 2 === (sd > 0 ? 1 : 0);
          ctx.fillStyle = blink ? '#ff3b30' : '#5a1a1a';
          if (blink) (ctx.shadowColor = '#ff3b30'), (ctx.shadowBlur = R(0.03));
          ctx.beginPath();
          ctx.arc(bx, by - R(0.065), R(0.009), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      },
    });
  }
  // 기차
  let smoke = smokeMem.get(s);
  if (!smoke) smokeMem.set(s, (smoke = []));
  const danger = new Set<number>();
  if (fc && fc.crash >= 0 && fc.ct < 70) s.trains.forEach((_, i) => danger.add(i));
  s.trains.forEach((tr, i) => {
    if (tr.brake || (tr.wait > 0 && tr.wait < 50)) danger.add(i);
  });
  const crashed = s.phase === 'result' && !s.ok && s.crash >= 0;
  s.trains.forEach((tr, i) => {
    const P = trainPos[i], col = tr.fast ? FASTC : TC[i % 2];
    const moving = tr.dwell === 0 && tr.wait === 0 && s.t >= s.go && s.phase === 'play';
    const bob = moving ? Math.sin(t * 0.6 + i) * R(0.002) : 0;
    const hid = (c: number) => N.tun[c];
    // 칸들 (뒤에서 앞으로)
    for (let k = P.length - 1; k >= 0; k--) {
      const q = P[k];
      if (hid(q.c)) continue;
      const tilt = crashed ? (i % 2 ? 0.25 : -0.25) : 0;
      L.push({
        y: q.y,
        f: () => {
          ctx.save();
          if (crashed) (ctx.translate(q.x, q.y), ctx.rotate(tilt), ctx.translate(-q.x, -q.y));
          ctx.fillStyle = 'rgba(0,0,0,.28)';
          ctx.beginPath();
          ctx.ellipse(q.x + R(0.008), q.y + R(0.01), R(0.058), R(0.03), 0, 0, Math.PI * 2);
          ctx.fill();
          // 바퀴
          for (const [u, v] of [[0.03, 0.026], [-0.03, 0.026], [0.03, -0.026], [-0.03, -0.026]]) {
            const wx = q.x + R(u) * Math.cos(q.phi) - R(v) * Math.sin(q.phi), wy = q.y + (R(u) * Math.sin(q.phi) + R(v) * Math.cos(q.phi)) * KG;
            ctx.fillStyle = '#26292e';
            ctx.beginPath();
            ctx.ellipse(wx, wy - R(0.008), R(0.012), R(0.01), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = col[2];
            ctx.beginPath();
            ctx.arc(wx, wy - R(0.008), R(0.004), 0, Math.PI * 2);
            ctx.fill();
          }
          if (k === 0) {
            // 기관차: 받침 · 보일러 · 운전실 · 굴뚝
            box(ctx, q.x, q.y + bob, q.phi, R(0.1), R(0.056), R(0.008), R(0.012), '#3a3d44', '#4a4e57', '#2a2c31');
            const ca = Math.cos(q.phi), sa = Math.sin(q.phi);
            const fxp = q.x + R(0.022) * ca, fyp = q.y + R(0.022) * sa * KG + bob;
            box(ctx, fxp, fyp, q.phi, R(0.058), R(0.044), R(0.02), R(0.03), col[0], shade(col[0], 0.25), col[1]);
            const bxp = q.x - R(0.03) * ca, byp = q.y - R(0.03) * sa * KG + bob;
            const tp = box(ctx, bxp, byp, q.phi, R(0.04), R(0.054), R(0.02), R(0.05), col[1], shade(col[1], 0.2), shade(col[1], -0.2));
            // 지붕 테
            ctx.fillStyle = col[2];
            ctx.beginPath();
            tp.forEach(([a, c2], m) => (m ? ctx.lineTo(a, c2) : ctx.moveTo(a, c2)));
            ctx.closePath();
            ctx.fill();
            // 굴뚝
            const cx1 = q.x + R(0.04) * ca, cy1 = q.y + R(0.04) * sa * KG + bob - R(0.05);
            ctx.fillStyle = '#26292e';
            ctx.fillRect(cx1 - R(0.009), cy1, R(0.018), R(0.026));
            ctx.fillStyle = col[2];
            ctx.beginPath();
            ctx.ellipse(cx1, cy1, R(0.013), R(0.006), 0, 0, Math.PI * 2);
            ctx.fill();
            // 앞등
            const hx = q.x + R(0.052) * ca, hy = q.y + R(0.052) * sa * KG + bob - R(0.03);
            ctx.fillStyle = '#fff6b0';
            ctx.beginPath();
            ctx.arc(hx, hy, R(0.007), 0, Math.PI * 2);
            ctx.fill();
            if (tr.fast) {
              ctx.fillStyle = '#ffffff';
              font(0.026, 900);
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⚡', fxp, fyp - R(0.062));
            }
            // 너구리 기관사 (운전실 위로 고개)
            const mood = crashed ? 4 : danger.has(i) ? 3 : s.events.some((e) => e.kind === 'ding' && e.tr === i && s.t - e.t < 60) ? 1 : 0;
            face(ctx, bxp, byp - R(0.088), R(0.022), 4, mood, t + i * 7);
            // 기관사 모자
            ctx.fillStyle = '#2f4f8f';
            ctx.beginPath();
            ctx.ellipse(bxp, byp - R(0.108), R(0.017), R(0.007), 0, Math.PI, 0);
            ctx.fill();
            // 연기
            if (moving && t % 7 === 0) smoke!.push({ x: cx1, y: cy1 - R(0.005), t, dx: (Math.cos(q.phi) > 0 ? -1 : 1) * 0.15 });
          } else {
            // 손님 칸
            box(ctx, q.x, q.y + bob, q.phi, R(0.088), R(0.052), R(0.008), R(0.032), shade(col[0], 0.1), shade(col[0], 0.35), col[1]);
            const p = tr.pax[k - 1];
            if (p) {
              const atSt = tr.dwell > 0 && N.st[tr.hist[0]] >= 0 && k === 1;
              const mood = crashed ? 4 : p.anger > 0 && (atSt || t % 200 < 120) ? 2 : danger.has(i) ? 5 : 0;
              face(ctx, q.x, q.y + bob - R(0.06), R(0.032), p.fox ? 3 : p.want, mood, t + k * 11, p.anger);
              if (p.fox) {
                // 관광 여우: 남은 갈 역 말풍선
                const bw = p.alt >= 0 ? R(0.07) : R(0.04);
                ctx.fillStyle = 'rgba(255,255,255,.95)';
                ctx.beginPath();
                ctx.roundRect(q.x - bw / 2, q.y - R(0.135), bw, R(0.032), R(0.014));
                ctx.fill();
                face(ctx, q.x - (p.alt >= 0 ? R(0.017) : 0), q.y - R(0.119), R(0.012), p.want, 0, t);
                if (p.alt >= 0) face(ctx, q.x + R(0.017), q.y - R(0.119), R(0.012), p.alt, 0, t);
              }
              if (p.anger > 0) {
                ctx.fillStyle = '#ff3b30';
                font(0.022, 900);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💢'.repeat(p.anger), q.x + R(0.04), q.y - R(0.1));
              }
            }
          }
          ctx.restore();
        },
      });
    }
  });
  // 내린 손님: 역 건물로 쪼르르 걸어가 손 흔들기 / 화나서 내린 손님은 짐가방 들고 씩씩
  for (const o of s.off) {
    const st = N.stations[N.st[o.c]], age = s.t - o.t;
    if (!o.mad && age > 260) continue;
    const k0 = Math.min(1, age / 50), x0 = px(o.c), y0 = py(o.c) + (st && gy(st.b) > gy(o.c) ? R(0.04) : -R(0.04));
    const bxp = st ? px(st.b) : x0, byp = st ? py(st.b) : y0;
    const xx = o.mad ? x0 + R(0.04) : x0 + (bxp - x0) * k0 * 0.55 + R(0.03), yy = o.mad ? y0 : y0 + (byp - y0) * k0 * 0.4;
    const hop = o.mad ? Math.abs(Math.sin(t * 0.35)) * R(0.012) : Math.abs(Math.sin(age * 0.25)) * R(0.008) * (1 - k0 * 0.5);
    L.push({
      y: yy,
      f: () => {
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath();
        ctx.ellipse(xx, yy + R(0.004), R(0.022), R(0.008), 0, 0, Math.PI * 2);
        ctx.fill();
        face(ctx, xx, yy - R(0.035) - hop, R(0.03), o.fox ? 3 : o.a, o.mad ? 2 : 1, t, o.mad ? 2 : 0);
        if (o.mad) {
          // 짐가방
          ctx.fillStyle = '#8a4b2a';
          ctx.beginPath();
          ctx.roundRect(xx + R(0.026), yy - R(0.026), R(0.032), R(0.026), R(0.004));
          ctx.fill();
          ctx.strokeStyle = '#5a2a12';
          ctx.lineWidth = R(0.004);
          ctx.beginPath();
          ctx.arc(xx + R(0.042), yy - R(0.028), R(0.007), Math.PI, 0);
          ctx.stroke();
        } else {
          // 손 흔들기
          const wv = Math.sin(t * 0.4) * 0.6;
          ctx.save();
          ctx.translate(xx + R(0.03), yy - R(0.05) - hop);
          ctx.rotate(-0.6 + wv);
          ctx.fillStyle = AC[o.fox ? 3 : o.a][0];
          ctx.strokeStyle = AC[o.fox ? 3 : o.a][1];
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(0, -R(0.012), R(0.008), R(0.016), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      },
    });
  }
  L.sort((a, b) => a.y - b.y);
  for (const o of L) o.f();
  // 터널: 산이 선로를 덮는다 (안의 기차는 안 보임)
  if (N.tun.some(Boolean)) {
    const cs = N.tun.map((v, c) => (v ? c : -1)).filter((c) => c >= 0);
    const xs = cs.map(px), ys = cs.map(py);
    const mx0 = Math.min(...xs) - R(0.06), mx1 = Math.max(...xs) + R(0.06), my0 = Math.min(...ys) - R(0.05), my1 = Math.max(...ys) + R(0.045);
    const g = ctx.createLinearGradient(0, my0 - R(0.06), 0, my1);
    g.addColorStop(0, night ? '#3a4a5a' : '#a9c98a');
    g.addColorStop(0.5, night ? '#2c3c3a' : '#7fae62');
    g.addColorStop(1, night ? '#203026' : '#5f8f48');
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse((mx0 + mx1) / 2 + R(0.02), my1, (mx1 - mx0) / 2 + R(0.02), R(0.03), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(mx0 - R(0.02), my1);
    ctx.bezierCurveTo(mx0 - R(0.02), my0 - R(0.02), mx0 + R(0.02), my0 - R(0.09), (mx0 + mx1) / 2 - R(0.02), my0 - R(0.08));
    ctx.bezierCurveTo(mx1 - R(0.02), my0 - R(0.07), mx1 + R(0.03), my0 + R(0.02), mx1 + R(0.02), my1);
    ctx.closePath();
    ctx.fill();
    // 바위·풀 무늬
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = k % 3 ? 'rgba(255,255,255,.12)' : 'rgba(60,80,40,.25)';
      ctx.beginPath();
      ctx.ellipse(mx0 + hsh(k) * (mx1 - mx0), my0 + hsh(k + 4) * (my1 - my0) * 0.9, R(0.018), R(0.01), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 꼭대기 눈·깃발
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse((mx0 + mx1) / 2 - R(0.02), my0 - R(0.072), R(0.03), R(0.012), 0, 0, Math.PI * 2);
    ctx.fill();
    // 터널 입구들: 터널 칸과 바깥 칸의 경계
    for (const c of cs)
      for (const nb of [...N.out[c], ...N.inn[c]]) {
        if (N.tun[nb]) continue;
        const [ex, ey] = mid(c, nb);
        ctx.fillStyle = '#6b6258';
        ctx.beginPath();
        ctx.ellipse(ex, ey, R(0.04), R(0.034), 0, Math.PI, 0);
        ctx.lineTo(ex + R(0.04), ey + R(0.01));
        ctx.lineTo(ex - R(0.04), ey + R(0.01));
        ctx.fill();
        ctx.fillStyle = '#1a1612';
        ctx.beginPath();
        ctx.ellipse(ex, ey + R(0.004), R(0.028), R(0.026), 0, Math.PI, 0);
        ctx.lineTo(ex + R(0.028), ey + R(0.012));
        ctx.lineTo(ex - R(0.028), ey + R(0.012));
        ctx.fill();
      }
    // 안에 기차가 있으면 산꼭대기로 연기가 몽글
    if (inTunnel(s) && t % 9 === 0) smoke.push({ x: (mx0 + mx1) / 2 + R(0.02), y: my0 - R(0.05), t, dx: 0.1 });
    // 터널 갈림길 표지는 산 위에 다시
    N.jcell.forEach((c, j) => {
      if (!N.tun[c]) return;
      const b = N.out[c][s.sw[j]], ang = Math.atan2(py(b) - py(c), px(b) - px(c));
      const sx0 = px(c), sy0 = py(c) - R(0.02), lk = locked(s, j);
      const isHv = hv && hv.k === 0 && hv.i === j;
      ctx.strokeStyle = isHv ? '#ffffff' : `rgba(255,255,255,${0.4 + 0.3 * Math.sin(t * 0.12)})`;
      ctx.lineWidth = R(0.006);
      ctx.beginPath();
      ctx.arc(sx0, sy0, R(0.045), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = lk ? '#7d8590' : '#2f9e5a';
      ctx.beginPath();
      ctx.arc(sx0, sy0, R(0.032), 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(sx0, sy0);
      ctx.rotate(ang);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(R(0.022), 0);
      ctx.lineTo(R(0.002), -R(0.016));
      ctx.lineTo(R(0.002), -R(0.006));
      ctx.lineTo(-R(0.02), -R(0.006));
      ctx.lineTo(-R(0.02), R(0.006));
      ctx.lineTo(R(0.002), R(0.006));
      ctx.lineTo(R(0.002), R(0.016));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (lk) {
        font(0.026, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🔒', sx0 + R(0.036), sy0 - R(0.03));
      }
    });
  }
  // 연기 뭉게
  for (const p of smoke) {
    const age = t - p.t;
    if (age > 60) continue;
    ctx.fillStyle = `rgba(255,255,255,${0.75 * (1 - age / 60)})`;
    ctx.beginPath();
    ctx.arc(p.x + age * p.dx * R(0.004) + Math.sin(age * 0.1 + p.t) * R(0.004), p.y - age * R(0.0011), R(0.008 + age * 0.00035), 0, Math.PI * 2);
    ctx.fill();
  }
  smokeMem.set(s, smoke.filter((p) => t - p.t <= 60 && t >= p.t));
  // ═════════════ 결과 표시: 처음 서는 역(✓·💢)과 부딪힐 자리(💥) ═════════════
  const mark = (f: Fore, strong: boolean) => {
    f.ends.forEach((e, i) => {
      if (!e || e.ok === 3) return;
      const st = N.stations[N.st[e.c]], x0 = px(e.c), y0 = py(e.c) - R(0.075);
      const tr = s.trains[i];
      if (N.tun[e.c]) return;
      const bounce = Math.abs(Math.sin(t * 0.15 + i)) * R(0.006);
      ctx.save();
      ctx.globalAlpha = strong ? 1 : 0.92;
      ctx.fillStyle = e.ok ? 'rgba(40,170,80,.95)' : 'rgba(225,60,50,.95)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = R(0.005);
      ctx.beginPath();
      ctx.roundRect(x0 - R(0.045), y0 - R(0.03) - bounce, R(0.09), R(0.05), R(0.025));
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0 - R(0.01), y0 + R(0.02) - bounce);
      ctx.lineTo(x0 + R(0.01), y0 + R(0.02) - bounce);
      ctx.lineTo(x0, y0 + R(0.035) - bounce);
      ctx.closePath();
      ctx.fill();
      const p = tr.pax[front(tr)];
      face(ctx, x0 - R(0.018), y0 - R(0.005) - bounce, R(0.017), p?.fox ? 3 : e.a, e.ok ? 1 : 2, t, e.ok ? 0 : 2);
      font(0.03, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(e.ok === 2 ? '📸' : e.ok ? '✓' : '✗', x0 + R(0.022), y0 - R(0.004) - bounce);
      ctx.restore();
      void st;
    });
    if (f.crash >= 0) {
      const x0 = px(f.crash), y0 = py(f.crash) - R(0.02), pl = 1 + Math.sin(t * 0.4) * 0.12;
      ctx.save();
      ctx.translate(x0, y0);
      ctx.scale(pl, pl);
      ctx.fillStyle = '#ffdd33';
      ctx.strokeStyle = '#e8302a';
      ctx.lineWidth = R(0.006);
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, rr = k % 2 ? R(0.024) : R(0.045);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.85);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      font(0.028, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e8302a';
      ctx.fillText('쾅!', 0, R(0.002));
      ctx.restore();
    }
  };
  if (fc) mark(pv ?? fc, !!pv);
  // 1판 첫 톡 전: 여기를 톡!
  if (s.stage === 0 && !s.firstTap && s.phase === 'play' && N.hits.length) {
    const hh = N.hits[0], pulse = (t % 50) / 50;
    ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
    ctx.lineWidth = R(0.008);
    ctx.beginPath();
    ctx.ellipse(X(hh.x), Y(hh.y), R(0.03 + pulse * 0.07), R(0.03 + pulse * 0.07) * KG, 0, 0, Math.PI * 2);
    ctx.stroke();
    const hx = X(hh.x) + R(0.07), hy = Y(hh.y) + R(0.05) + Math.sin(t * 0.15) * R(0.01);
    font(0.06, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', hx, hy);
  }
  // 밤: 어둠 + 불빛
  if (night) {
    ctx.fillStyle = 'rgba(8,14,44,.5)';
    ctx.fillRect(0, Y(BY0 - 0.02), w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x: number, y: number, r: number, col: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    N.stations.forEach((st) => glow(px(st.b), py(st.b) - R(0.03), R(0.1), 'rgba(255,200,90,.35)'));
    glow(px(N.dpl), py(N.dpl) - R(0.04), R(0.14), 'rgba(255,210,120,.35)');
    N.sigCell.forEach((_c, i) => {
      const hh = N.hits.find((q) => q.k === 1 && q.i === i)!;
      glow(X(hh.x), Y(hh.y) - R(0.035), R(0.09), s.sig[i] ? 'rgba(255,60,40,.55)' : 'rgba(60,255,110,.45)');
    });
    s.trains.forEach((_tr, i) => {
      const q = trainPos[i][0];
      if (N.tun[q.c]) return;
      glow(q.x + Math.cos(q.phi) * R(0.08), q.y + Math.sin(q.phi) * KG * R(0.08) - R(0.02), R(0.1), 'rgba(255,240,160,.4)');
    });
    ctx.restore();
  }
  // ═════════════ 사건 연출 ═════════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = e.c >= 0 ? px(e.c) : w / 2, y = e.c >= 0 ? py(e.c) : Y(0.6);
    if (e.kind === 'clack') fx.burst(x, y, '#fff3b0', 14, 3, 2.2), fx.ring(x, y, '#ffffff', R(0.07), 3), fx.kick(2), say(x, y - R(0.07), '철컥!', '#ffffff', 17);
    if (e.kind === 'signal') fx.ring(x + R(0.05), y - R(0.06), e.text === '빨간불!' ? '#ff5a4a' : '#5aff7a', R(0.06), 3), say(x, y - R(0.1), e.text!, e.text === '빨간불!' ? '#ffb0a8' : '#b8ffc8', 15);
    if (e.kind === 'ding') fx.burst(x, y - R(0.04), '#ffe066', 22, 3.6, 2.6), fx.burst(x, y - R(0.04), '#ffffff', 10, 2.4, 2), fx.ring(x, y - R(0.03), '#ffe066', R(0.09), 4), say(x, y - R(0.12), e.text!, '#fff3a0', 17);
    if (e.kind === 'photo') fx.blink('#ffffff', 0.35), fx.burst(x, y - R(0.05), '#ffffff', 16, 3, 2.2), say(x, y - R(0.12), e.text!, '#ffffff', 15);
    if (e.kind === 'angry') fx.burst(x, y - R(0.05), '#ff6b5b', 14, 3, 2.2), fx.kick(4), say(x, y - R(0.12), e.text!, '#ffc2b8', 15);
    if (e.kind === 'quit') fx.burst(x, y - R(0.05), '#ff3b30', 24, 4, 2.6), fx.kick(7), say(x, y - R(0.13), e.text!, '#ffb0a8', 17);
    if (e.kind === 'board') fx.burst(x, y - R(0.03), '#ffffff', 10, 2.2, 2), say(x, y - R(0.1), e.text!, '#e6fff0', 14);
    if (e.kind === 'brake') fx.burst(x, y, '#ffcc66', 10, 2.6, 1.8), say(x, y - R(0.1), '끼익!', '#ffe0b0', 15);
    if (e.kind === 'cowin') say(x, y - R(0.1), '음매~ 🐄', '#ffffff', 15);
    if (e.kind === 'cowwait') say(x, y - R(0.12), '음매~ (기다려요)', '#fff0d0', 13);
    if (e.kind === 'sigwait') say(x, y - R(0.1), '빨간불 — 기다려요', '#ffd0c8', 13);
    if (e.kind === 'lock') fx.kick(1.5), say(x, y - R(0.1), e.text!, '#e6eef8', 14);
    if (e.kind === 'lap') say(x, y - R(0.1), e.text!, '#e6f0ff', 13);
    if (e.kind === 'miss') {
      const mx = Math.floor((e.a ?? 0) / 1000) / 1000, my = ((e.a ?? 0) % 1000) / 1000;
      void mx;
      void my;
    }
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.6), '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, Y(0.6), '#ff9ec4', 40, 6, 3.2), fx.burst(w * 0.5, Y(0.75), '#ffffff', 40, 6, 3), fx.ring(w / 2, Y(0.65), '#ffe066', R(0.45), 7), fx.blink('#fff6c8', 0.22);
    if (e.kind === 'fail') {
      fx.kick(9);
      fx.blink(th.hot, 0.2);
      if (s.crash >= 0) fx.burst(x, y - R(0.03), '#ffffff', 34, 5, 3.4), fx.burst(x, y - R(0.03), '#ffb02e', 24, 4.4, 2.8), fx.ring(x, y, '#ffdd33', R(0.14), 6), say(x, y - R(0.12), '쾅!!', '#ffdd33', 22);
    }
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════════ HUD ═════════════
  const hb = R(0.085);
  ctx.fillStyle = night ? 'rgba(10,16,40,.9)' : 'rgba(36,62,44,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.046, 900);
  const ttl = `🚂 ${s.stage + 1}판`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.044, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 띠
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(0.115) + drop;
    ctx.fillStyle = night ? 'rgba(10,16,40,.92)' : 'rgba(36,62,44,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 끝 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '기차 마을 완성! 🚂' : '다 내려 줬어요!'), (sub = `손님 ✓ · 철컥 ${s.tog}번${s.tog <= d.par ? ' ✓' : ` (≤${d.par} ✗)`} · ${d.bonus === 'nolap' ? '헛바퀴 없이' : '화 안 냄'} ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffd84a');
      else (head = s.why), (sub = s.hearts > 0 ? '하트 −1 · 이 판 다시' : '끝 — 손님들이 고마워해요!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}판` : `${s.stage + 1}판`;
      sub = `손님 ${s.total}명 · 기차 ${s.trains.length}대 · ★ 철컥 ${d.par}번 이하`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(nw ? 0.165 : 0.175), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = night ? 'rgba(10,16,40,.93)' : 'rgba(36,62,44,.93)';
      ctx.beginPath();
      ctx.roundRect(-R(0.46), -R(0.055), R(0.92), R(ch), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.056), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.018));
          ctx.scale(pop, pop);
          star5(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.84));
      ctx.fillStyle = '#fffaf0';
      font(0.034, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.86));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.035, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.88));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = BY0 + ROWS * RH + 0.05, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, night ? 'rgba(14,20,50,.95)' : 'rgba(40,70,48,.95)');
    g.addColorStop(1, night ? 'rgba(8,12,34,.98)' : 'rgba(26,48,32,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 손님: 내려 준 수 + 기다리는 줄
    const r1 = Y(ty + 0.045);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6fff0';
    font(0.038, 900);
    ctx.fillText(`손님 ${s.done}/${s.total}`, X(0.03), r1);
    font(0.032, 800);
    ctx.fillStyle = th.muted;
    ctx.fillText('다음', X(0.3), r1);
    s.queue.slice(0, 6).forEach((p, k) => face(ctx, X(0.4) + k * R(0.07), r1, R(0.024), p.fox ? 3 : p.want, 0, t + k * 5));
    ctx.textAlign = 'right';
    ctx.fillStyle = s.tog <= d.par ? '#e6fff0' : '#ffb3a8';
    font(0.034, 800);
    ctx.fillText(`철컥 ${s.tog}`, X(0.97), r1);
    // 별 목표 셋
    const okk = s.phase === 'result' && s.ok ? s.starOk : [s.done >= s.total, s.tog <= d.par, d.bonus === 'nolap' ? s.laps === 0 : s.wrong === 0];
    const bad = [s.phase === 'result' && !s.ok, s.tog > d.par, d.bonus === 'nolap' ? s.laps > 0 : s.wrong > 0];
    const labels = [`손님 ${s.done}/${s.total}`, `철컥 ≤${d.par}`, d.bonus === 'nolap' ? '헛바퀴 없이' : '화 안 냄'];
    const r2 = Y(ty + 0.115), cw2 = R(0.3);
    for (let k = 0; k < 3; k++) {
      const cx1 = X(0.03) + k * (cw2 + R(0.017));
      ctx.fillStyle = okk[k] && !bad[k] ? 'rgba(255,216,74,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - R(0.026), cw2, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = okk[k] && !bad[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] && !bad[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + R(0.03), r2 + R(0.002));
      ctx.fillStyle = okk[k] && !bad[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#e6f8ff';
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + R(0.058), r2 + R(0.002), cw2 - R(0.066));
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstTap && s.phase === 'play';
    if (first) hint = '👆 갈림길을 톡! 점선이 곰 역으로 철컥';
    else if (s.down && s.phase === 'play') hint = hvLocked ? '🔒 기차가 터널 안 — 지금은 못 바꿔요' : hv ? (hv.k === 0 ? '떼면 철컥! 흰 점선 = 바뀐 길' : '떼면 신호 바뀜! 흰 점선 = 바뀐 길') : '갈림길(고리)을 눌러요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판 끝! 칙칙폭폭 고마워요' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '꾹 누르면 바뀐 길이 미리 보여요';
    else if (s.stage === 0 && s.done > 0) hint = '꾹 누르고 있으면 바뀐 길이 미리 보여요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.042 : 0.036, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.05));
  }
}
