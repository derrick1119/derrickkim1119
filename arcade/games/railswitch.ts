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
function drawAll(ctx: CanvasRenderingContext2D, s: RailState, w: number, h: number, th: Theme) {
  const fx = juice(s);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
