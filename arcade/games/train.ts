/**
 * 장난감 기차 마을 (19라운드 메뉴 3번 · 디오라마) — 무한 러너 × 꾸미기 × 원버튼.
 * 기준 9(손이 하는 일 하나): 나무 장난감 기차가 하늘에 뜬 풀밭 섬의 동그란 레일을 저절로 돈다.
 *   탭하면 맨 앞 화물칸에 실린 것(나무·집·다리·등대·가로등)을 지금 기차 옆 빈 터에 내려놓는다.
 * 와우: 내려놓은 것끼리 이어지면 진화한다 — 나무 셋 나란히 → 숲(사슴), 집 셋 → 마을(주민이 걷는다), 역 바로 옆 마을 → 역 앞 시장.
 *       한 바퀴 돌 때마다 빈 들판이 마을로 자란다.
 * 첫 3초: 화물칸 셋이 다 나무. 탭 탭 탭 → 나무 셋이 줄지어 서며 '숲!' 하고 사슴이 뛰어나온다.
 * 고민(기준 5): 맨 앞 화물만 내릴 수 있고 다음 화물이 아래 띠에 보인다. 어느 터에서 내릴지(지나치면 한 바퀴 뒤)가 곧 마을 설계.
 * 목표·보상: 판마다 정해진 바퀴 안에 마을 점수 목표 → 별 1~3. 못 채우면 하트 -1, 그 판만 다시. 1판은 나무만 — 거의 못 진다.
 * 하는 일이 바뀐다: 2판 집(마을·역 앞 시장) · 3판 강(다리만 놓인다, 나머진 풍덩) · 4판 바닷가 등대 + 화물칸 넷
 *                  · 5판 밤(가로등 곁 집만 불이 켜짐) · 6판 손님(원하는 걸 다음 바퀴까지) · 7판 쌓기(같은 것 위에 한 층 더) · 8판 축제 열차.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

/** 화면 세로÷가로 · 터 수(0번은 역) · 레일·터·섬 반지름 · 3/4 시점 눌림 · 높이 배율 · 섬 중심 */
const A = 1.3, N = 16, RT = 0.262, RL = 0.385, RI = 0.475, SQ = 0.7, ZS = 0.9, CX = 0.5, CY = 0.685;
/** 물건·기차 크기 배율 (그리기 전용) */
const GS = 1.3, TS = 1.2;
const STOP = 22, PAUSE = 150, LAST = 7;
export type Kind = 'T' | 'H' | 'B' | 'L' | 'P';
const ICON: Record<Kind, string> = { T: '🌲', H: '🏠', B: '🌉', L: '🗼', P: '💡' };
const SUBJ: Record<Kind, string> = { T: '나무가', H: '집이', B: '다리가', L: '등대가', P: '가로등이' };
const COL: Record<Kind, string> = { T: '#5cb85c', H: '#ff8a5c', B: '#c98a4b', L: '#ffd23f', P: '#ffe9a0' };
export interface Lot { k: Kind | null; lv: number; at: number; evo: number; river: boolean; beach: boolean; hue: number }
type Want = 'forest' | 'village' | 'market' | 'light' | 'bridge';
const WANT: Record<Want, [string, string]> = { forest: ['🌲', '숲'], village: ['🏘️', '마을'], market: ['🎪', '시장'], light: ['🗼', '등대'], bridge: ['🌉', '다리'] };
interface Pax { want: Want; t: number; done: number; hue: number }
interface Ev { t: number; kind: string; lot: number; text?: string; col?: string; k?: Kind }
interface Cfg { laps: number; cap: number; bag: Kind[]; river: number; beach: boolean; night: boolean; pax: boolean; stack: boolean; goal: [number, number, number]; base: number }
export interface TrainState {
  rng: Rng; t: number; stage: number; tries: number; cfg: Cfg; lap: number; u: number; stop: number; lapTicks: number;
  lots: Lot[]; rivers: number[]; wagons: Kind[]; queue: Kind[]; town: number; pax: Pax[]; paxPts: number; drops: number;
  hearts: number; stars: number; total: number; last: number; pause: number; result: '' | 'clear' | 'fail' | 'end' | 'over'; dead: boolean;
  seen: Set<string>; notes: { text: string; t: number }[]; events: Ev[]; stageT: number;
}

/** 판마다 실리는 화물 (바퀴 × 화물칸 수만큼) */
const BAGS = ['TTTTTT', 'TTTTHHHHH', 'TTTHHHHBB', 'TTTTHHHHHBBL', 'TTTHHHHHBLPP', 'TTTHHHHHBBLP', 'TTTTHHHHHBPP', 'TTTHHHHHBBLP'];
/** 판마다 [목표(★), ★★, ★★★] — 잘하는 봇·못하는 봇 분포로 맞춘 값 */
export const GOALS: [number, number, number][] = [[5, 11, 16], [18, 28, 36], [20, 32, 42], [26, 40, 52], [27, 40, 52], [30, 46, 60], [28, 42, 54], [30, 45, 58]];
function cfgOf(k: number): Cfg {
  const bag = [...BAGS[k]] as Kind[];
  return {
    laps: k === 0 ? 2 : 3, cap: k >= 3 ? 4 : 3, bag, river: bag.filter((x) => x === 'B').length, beach: bag.includes('L'),
    night: k >= 4, pax: k >= 5, stack: k >= 6, goal: GOALS[k], base: k === 0 ? 400 : 360 - 12 * k,
  };
}

const lotA = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / N;
export const lotG = (i: number): [number, number] => [Math.cos(lotA(i)) * RL, Math.sin(lotA(i)) * RL];
const ringG = (u: number, r = RT): [number, number] => [Math.cos(-Math.PI / 2 + 2 * Math.PI * u) * r, Math.sin(-Math.PI / 2 + 2 * Math.PI * u) * r];
/** 지금 맨 앞 화물칸 옆의 터 (0 = 역) */
export const curLot = (s: TrainState) => ((Math.round(s.u * N) % N) + N) % N;
const lapT = (s: TrainState) => Math.round(s.cfg.base * 0.95 ** s.lap);

const ev = (s: TrainState, kind: string, lot: number, text?: string, col?: string, k?: Kind) => s.events.push({ t: s.t, kind, lot, text, col, k });
function see(s: TrainState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  const prev = s.notes[s.notes.length - 1];
  s.notes.push({ text, t: Math.max(s.t, prev ? prev.t + 150 : 0) });
}

/** 마을 보기: 점수, 진화 줄(1 숲 · 2 마을 · 3 시장), 불 켜진 집 */
export interface Look { score: number; run: Int8Array; lit: Uint8Array; forests: number; villages: number; markets: number; lights: number; bridges: number }
export function look(lots: Lot[], night: boolean): Look {
  const run = new Int8Array(N), lit = new Uint8Array(N);
  let score = 0, forests = 0, villages = 0, markets = 0, lights = 0, bridges = 0;
  for (let i = 1; i < N; ) {
    const k = lots[i].k;
    let j = i;
    if (k === 'T' || k === 'H') while (j + 1 < N && lots[j + 1].k === k) j++;
    if ((k === 'T' || k === 'H') && j - i >= 2) {
      const mk = k === 'H' && (i === 1 || j === N - 1);
      for (let q = i; q <= j; q++) run[q] = k === 'T' ? 1 : mk ? 3 : 2;
      if (k === 'T') forests++;
      else villages++;
      if (mk) (markets++, (score += 10));
    }
    i = j + 1;
  }
  for (let i = 1; i < N; i++) {
    const L = lots[i];
    if (L.k === 'T') score += (run[i] ? 3 : 1) + (L.lv - 1) * 2;
    else if (L.k === 'H') {
      score += (run[i] ? 4 : 2) + (L.lv - 1) * 2;
      if (night) for (let d = -2; d <= 2; d++) if (lots[i + d]?.k === 'P') lit[i] = 1;
      if (lit[i]) score += 3;
    } else if (L.k === 'B') (score += L.river ? 8 : 1), L.river && bridges++;
    else if (L.k === 'L') (score += L.beach ? 10 : 2), L.beach && lights++;
    else if (L.k === 'P') score += 1;
  }
  return { score, run, lit, forests, villages, markets, lights, bridges };
}
const met = (lk: Look, w: Want) => (w === 'forest' ? lk.forests > 0 : w === 'village' ? lk.villages > 0 : w === 'market' ? lk.markets > 0 : w === 'light' ? lk.lights > 0 : lk.bridges > 0);

function addPax(s: TrainState) {
  const opts: Want[] = ['forest', 'village', 'market'];
  if (s.cfg.beach) opts.push('light');
  if (s.cfg.river) opts.push('bridge');
  const lk = look(s.lots, s.cfg.night), open = opts.filter((w) => !met(lk, w) && !s.pax.some((p) => !p.done && p.want === w));
  const pool = open.length ? open : opts;
  s.pax.push({ want: pool[Math.floor(s.rng() * pool.length)], t: s.t, done: 0, hue: Math.floor(s.rng() * 360) });
}

function newStage(s: TrainState) {
  const k = s.stage, c = (s.cfg = cfgOf(k)), r = s.rng;
  s.lots = Array.from({ length: N }, () => ({ k: null, lv: 1, at: -99, evo: -99, river: false, beach: false, hue: r() }));
  s.rivers = [];
  if (c.river) s.rivers.push(4 + Math.floor(r() * 3));
  if (c.river > 1) s.rivers.push(10 + Math.floor(r() * 3));
  for (const i of s.rivers) s.lots[i].river = true;
  if (c.beach) {
    let b = 6 + Math.floor(r() * 3);
    if ([b, b + 1, b + 2].some((i) => s.lots[i].river)) b = 7;
    for (let i = b; i < b + 3; i++) s.lots[i].beach = true;
  }
  // 화물 순서: 섞되, 이번 판에 처음 나오는 것은 첫 짐에 싣는다
  const q = [...c.bag];
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  const fresh: Kind | undefined = k === 1 ? 'H' : k === 2 ? 'B' : k === 3 ? 'L' : k === 4 ? 'P' : undefined;
  if (fresh && !q.slice(0, c.cap).includes(fresh)) {
    const j = q.indexOf(fresh);
    [q[j], q[1]] = [q[1], q[j]];
  }
  s.queue = q;
  s.wagons = s.queue.splice(0, c.cap);
  s.lap = 0;
  s.u = 0;
  s.stop = k === 0 && s.tries === 0 ? 0 : 40;
  s.lapTicks = lapT(s);
  s.town = 0;
  s.pax = [];
  s.paxPts = 0;
  s.result = '';
  s.stageT = s.t;
  if (k >= 1) see(s, 'house', '🏠 새 화물: 집 — 집 셋 나란히 = 마을, 역 바로 옆이면 시장 +10');
  if (c.river) see(s, 'river', '🌊 강 — 🌉 다리만 놓여요 (다른 건 풍덩 떠내려가요)');
  if (c.beach) see(s, 'beach', '🏖️ 바닷가 — 🗼 등대는 바닷가에서 +10');
  if (c.cap > 3) see(s, 'wagon4', '🚃 새 화물칸 — 이제 넷씩 실어요');
  if (c.night) see(s, 'night', '🌙 밤이 와요 — 💡 가로등 두 칸 안의 집만 불이 켜져요 +3');
  if (c.pax) (see(s, 'pax', '🧍 손님 — 원하는 걸 다음 바퀴까지 만들면 +6'), addPax(s));
  if (c.stack) see(s, 'stack', '⬆️ 쌓기 — 같은 것 위에 또 놓으면 한 층 더 +2');
  if (k === LAST) see(s, 'festival', '🎉 마지막 판 — 축제 열차! 더 빨라요');
}

function drop(s: TrainState) {
  const c = s.wagons[0], i = curLot(s);
  if (c === undefined) return;
  if (i === 0) return void ev(s, 'bump', 0, '역에선 못 내려요');
  const L = s.lots[i], before = look(s.lots, s.cfg.night);
  if (L.k) {
    if (!(s.cfg.stack && L.k === c && (c === 'T' || c === 'H') && L.lv < 3)) return void ev(s, 'bump', i, '이미 있어요');
    L.lv++;
    L.at = s.t;
  } else if (L.river && c !== 'B') {
    s.wagons.shift();
    s.drops++;
    return void ev(s, 'splash', i, `풍덩! ${SUBJ[c]} 떠내려가요`, '#6fd3ff', c);
  } else (L.k = c), (L.lv = 1), (L.at = s.t);
  s.wagons.shift();
  s.drops++;
  const after = look(s.lots, s.cfg.night);
  s.town = after.score;
  const gain = after.score - before.score, evo = !!after.run[i] && !(before.run[i] && L.lv > 1);
  ev(s, L.lv > 1 ? 'stack' : 'drop', i, evo ? '' : `${L.lv > 1 ? `${L.lv}층! ` : ''}+${gain}`, COL[c]);
  if (evo) {
    for (let a = i; a >= 1 && after.run[a]; a--) s.lots[a].evo = s.t;
    for (let a = i; a < N && after.run[a]; a++) s.lots[a].evo = s.t;
    const fresh = c === 'T' ? after.forests > before.forests : after.villages > before.villages;
    if (after.markets > before.markets) ev(s, 'market', i, `역 앞 시장! +${gain}`, '#ffd23f'), see(s, 'market', '🎪 역 앞 시장 — 역 바로 옆 마을은 시장이 돼요 +10');
    else ev(s, 'evolve', i, `${c === 'T' ? (fresh ? '숲이 됐어요!' : '숲이 넓어져요') : fresh ? '마을이 됐어요!' : '마을이 커져요'} +${gain}`, c === 'T' ? '#7ee07e' : '#ffb27a');
    if (c === 'T') see(s, 'forest', '🌲🌲🌲 같은 것 셋이 나란히 → 진화! (숲)');
    else see(s, 'village', '🏘️ 마을 — 주민이 이사 왔어요');
  }
}

function arrive(s: TrainState) {
  s.u = 0;
  s.lap++;
  const lk = look(s.lots, s.cfg.night);
  for (const p of s.pax) {
    if (p.done) continue;
    p.done = met(lk, p.want) ? 1 : -1;
    if (p.done > 0) (s.paxPts += 6), ev(s, 'pax', 0, `🧍 ${WANT[p.want][1]} 구경 +6`, '#7ee07e');
    else ev(s, 'paxno', 0, `😢 ${WANT[p.want][1]}이 없네…`, '#c8d0e0');
  }
  if (s.lap >= s.cfg.laps) return finish(s);
  const add = s.queue.splice(0, s.cfg.cap - s.wagons.length);
  s.wagons.push(...add);
  if (add.length) ev(s, 'load', 0, `화물 +${add.length}`);
  s.stop = STOP;
  s.lapTicks = lapT(s);
  if (s.cfg.pax) addPax(s);
}

function finish(s: TrainState) {
  const sc = s.town + s.paxPts, [g1, g2, g3] = s.cfg.goal;
  s.last = sc;
  if (sc >= g1) {
    const st = 1 + +(sc >= g2) + +(sc >= g3);
    s.stars += st;
    s.total += sc + st * 5;
    s.result = s.stage >= LAST ? 'end' : 'clear';
    ev(s, 'clear', -1, `${s.stage + 1}판 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.hearts--;
    s.result = s.hearts <= 0 ? 'over' : 'fail';
    ev(s, 'fail', -1, `${g1 - sc}점 모자라요 — ♥ -1`);
  }
  s.pause = PAUSE;
}

export const train: GameDef<TrainState> = {
  id: 'train',
  name: '장난감 기차 마을',
  genes: ['endless', 'decorate', 'onebutton'],
  twist: '탭 하나로 달리는 기차의 화물을 "지금 옆 터"에 내려놓는다 — 같은 것 셋이 나란히 서면 숲·마을·역 앞 시장으로 진화해, 내려놓는 타이밍이 곧 마을 설계가 된다',
  rules: [
    '기차는 저절로 돌아요. 탭하면 맨 앞 화물을 지금 옆 빈 터에 내려놓아요 (스페이스도 돼요).',
    '같은 것 셋이 나란히 → 진화! 나무 셋 = 숲, 집 셋 = 마을, 역 바로 옆 마을 = 시장.',
    '판마다 정해진 바퀴 안에 마을 점수 목표를 채우면 별 — 못 채우면 하트 하나 잃고 그 판 다시.',
  ],
  controls: 'tap',
  hint: '탭 = 맨 앞 화물 내려놓기 / 스페이스',
  aspect: A,
  art: {
    concept: '하늘에 뜬 장난감 기차 디오라마',
    mood: '나무 장난감 기차가 구름 위에 뜬 작은 풀밭 섬을 칙칙폭폭 돈다. 내려놓은 나무·집이 이어져 숲과 마을이 되고, 강엔 다리, 바닷가엔 등대, 밤이면 가로등과 창문이 하나둘 켜진다.',
    palette: { bg: '#bfe3f2', ink: '#fff8ea', muted: '#8a7a66', accent: '#5cb85c', hot: '#e0473c', soft: '#f6efe0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), t: 0, stage: 0, tries: 0, lap: 0, u: 0, stop: 0, lapTicks: 400, lots: [], rivers: [], wagons: [], queue: [], town: 0, pax: [], paxPts: 0, drops: 0,
      hearts: 3, stars: 0, total: 0, last: 0, pause: 0, result: '', dead: false, seen: new Set<string>(), notes: [], events: [], stageT: 0,
    } as unknown as TrainState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.pause > 0) {
      if (--s.pause === 0) {
        if (s.result === 'end' || s.result === 'over') return void (s.dead = true);
        if (s.result === 'clear') (s.stage++, (s.tries = 0));
        else s.tries++;
        newStage(s);
      }
      return;
    }
    if (inp.tap) drop(s);
    if (s.stop > 0) s.stop--;
    else if ((s.u += 1 / s.lapTicks) >= 1) arrive(s);
  },
  over: (s) => s.dead,
  score: (s) => s.total,
  draw(ctx, s, w, h, th: Theme) {
    W = w;
    const fx = juice(s), K = w / 380, t = s.t, lk = look(s.lots, s.cfg.night);
    const dusk = s.stage === 4 ? 0.8 : s.cfg.laps - 1.4, dark = s.cfg.night ? Math.max(0, Math.min(0.85, ((s.lap + s.u - dusk) / 1.2) * 0.85)) : 0;
    ctx.save();
    fx.begin(ctx);
    sky(ctx, w, h, t, dark);
    island(ctx, s, t);
    // 터 바닥 표시 (역 앞 광장 · 빈 터 · 강 다리 자리 · 바닷가)
    for (let i = 1; i < N; i++) {
      const [gx, gy] = lotG(i), L = s.lots[i], [x, y] = sp(gx, gy);
      if (i === 1 || i === N - 1) {
        ctx.fillStyle = 'rgba(214,196,160,.85)';
        ctx.beginPath();
        ctx.ellipse(x, y, 0.045 * w, 0.045 * w * SQ, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(160,140,110,.5)';
        for (let q = 0; q < 6; q++) ctx.fillRect(x - 0.03 * w + (q % 3) * 0.022 * w, y - 0.012 * w + Math.floor(q / 3) * 0.014 * w, 0.016 * w, 0.009 * w);
      }
      if (L.k) continue;
      ctx.strokeStyle = L.river ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1.3 * K;
      ctx.setLineDash([3 * K, 3 * K]);
      ctx.beginPath();
      ctx.ellipse(x, y, 0.03 * w, 0.03 * w * SQ, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (L.river || L.beach) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.font = `${13 * K}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(L.river ? '🌉' : '🗼', x, y - 2 * K);
        ctx.globalAlpha = 1;
      }
    }
    // 숲 바닥(짙은 풀·버섯) · 마을 길(자갈) — 진화한 줄이 땅에서도 이어져 보이게
    for (let i = 1; i < N; i++) {
      if (!lk.run[i] || lk.run[i - 1] === lk.run[i]) continue;
      let j = i;
      while (lk.run[j + 1] === lk.run[i]) j++;
      const forest = lk.run[i] === 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = forest ? 'rgba(52,110,40,.75)' : 'rgba(222,204,165,.95)';
      ctx.lineWidth = (forest ? 0.07 : 0.022) * w;
      ctx.beginPath();
      for (let q = 0; q <= 12; q++) {
        const a = lotA(i - 0.3 + ((j - i + 0.6) * q) / 12), r = forest ? RL + 0.01 : RL - 0.04, [x, y] = sp(Math.cos(a) * r, Math.sin(a) * r);
        q ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
      if (forest)
        for (let q = i; q <= j; q++) {
          const a = lotA(q + 0.35), [x, y] = sp(Math.cos(a) * (RL - 0.025), Math.sin(a) * (RL - 0.025));
          ctx.fillStyle = '#f2ead8';
          ctx.fillRect(x - 0.8 * K, y - 3 * K, 1.6 * K, 3 * K);
          ctx.fillStyle = '#e0473c';
          ctx.beginPath();
          ctx.arc(x, y - 3 * K, 2.6 * K, Math.PI, 0);
          ctx.fill();
        }
    }
    track(ctx, s);
    // 지금 내려놓을 자리: 고리 + 반투명 미리보기
    const cur = curLot(s), front = s.wagons[0];
    if (!s.pause && front && cur) {
      const L = s.lots[cur], [gx, gy] = lotG(cur), [x, y] = sp(gx, gy);
      const ok = !L.k ? !L.river || front === 'B' : s.cfg.stack && L.k === front && L.lv < 3 && (front === 'T' || front === 'H');
      const pulse = 1 + 0.12 * Math.sin(t / 4);
      ctx.strokeStyle = ok ? '#ffffff' : L.river ? '#6fd3ff' : '#ff8f8f';
      ctx.lineWidth = 2.5 * K;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(x, y, 0.036 * w * pulse, 0.036 * w * SQ * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // 주민·동물 반응 (웃음): 판 완성 → 우스꽝스러운 춤, 실패 → 데굴데굴, 풍덩 → 눈이 커지며 펄쩍, 진화 → 신나서 춤
    const since = (kinds: string[]) => s.events.reduce((m, e) => (kinds.includes(e.kind) ? Math.min(m, t - e.t) : m), 999);
    const party = s.pause > 0 && (s.result === 'clear' || s.result === 'end'), oops = s.pause > 0 && (s.result === 'fail' || s.result === 'over');
    const evoAge = since(['evolve', 'market']), splashAge = since(['splash']);
    const mood: Mood = party ? 1 : oops ? 2 : splashAge < 45 ? 3 : evoAge < 60 ? 1 : 0;
    // 입체 물건: 깊이(땅 y) 순서로
    const list: { y: number; f: () => void }[] = [];
    // 섬 가장자리 덤불·바위 (강·바닷가 자리는 비움)
    for (let i = 0; i < N; i++) {
      const a = lotA(i + 0.5), near = (q: number) => s.lots[q % N].river || s.lots[q % N].beach;
      if (near(i) || near(i + 1)) continue;
      const bx = Math.cos(a) * 0.447, by = Math.sin(a) * 0.447;
      list.push({ y: by, f: () => rimBit(ctx, bx, by, i) });
    }
    for (let i = 1; i < N; i++) {
      const L = s.lots[i];
      if (!L.k) continue;
      const gy = lotG(i)[1], age = t - L.at, bounce = t - L.evo < 24 ? 1 + 0.18 * Math.sin(((t - L.evo) / 24) * Math.PI) : 1;
      const fly = age < 14 ? 1 - age / 14 : 0, rr = RL - (RL - RT) * fly * 0.8, ax = Math.cos(lotA(i)), ay = Math.sin(lotA(i));
      const sc = (fly ? 0.75 + 0.25 * (1 - fly) : age < 26 ? 1 + 0.2 * Math.sin(((age - 14) / 12) * Math.PI) : 1) * bounce;
      list.push({ y: gy, f: () => item(ctx, L.k!, ax * rr, ay * rr, fly * fly * 0.09, sc, { lv: L.lv, run: lk.run[i], lit: !!lk.lit[i], dark, hue: L.hue, ang: lotA(i) + Math.PI / 2, river: L.river, beach: L.beach, t }) });
      // 숲 사이 작은 나무 · 사슴 / 마을 주민 / 시장 천막
      if (lk.run[i] === 1 && lk.run[i + 1] === 1) {
        const a = lotA(i + 0.5), mx = Math.cos(a) * (RL + 0.02), my = Math.sin(a) * (RL + 0.02);
        list.push({ y: my, f: () => item(ctx, 'T', mx, my, 0, 0.7, { lv: 1, run: 1, lit: false, dark, hue: L.hue * 0.5, ang: 0, river: false, beach: false, t }) });
      }
      if (lk.run[i] === 1 && lk.run[i - 1] !== 1) {
        // 사슴: 숲이 생기면(또는 판 완성) 펄쩍 공중제비
        const a = lotA(i + 1) + Math.sin(t / 70 + i) * 0.12, rd = Math.sin(a) < 0 ? RL - 0.055 : RL + 0.055, dx = Math.cos(a) * rd, dy = Math.sin(a) * rd;
        const ea = t - L.evo, leap = ea < 40 ? ea / 40 : party ? ((t % 50) / 50) : -1;
        list.push({ y: dy, f: () => emoji(ctx, '🦌', dx, dy, 17 * K, Math.cos(t / 70 + i) < 0, leap >= 0 ? Math.sin(leap * Math.PI) * 26 * K : 0, leap >= 0 ? leap * Math.PI * 2 : 0) });
      }
      if (lk.run[i] >= 2 && lk.run[i - 1] < 2) {
        let j = i;
        while (lk.run[j + 1] >= 2) j++;
        for (let p = 0; p < 2 + (j - i); p++) {
          const ph = t / (110 + p * 23) + p * 2.1 + i, a = lotA(i + (j - i) * (0.5 + 0.5 * Math.sin(ph))), r = RL - 0.045 - (p % 2) * 0.012;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          list.push({ y: py, f: () => person(ctx, px, py, (p * 97 + i * 31) % 360, t + p * 7, Math.cos(ph) > 0, mood) });
        }
        if (lk.run[i] === 3) for (let q = i; q <= j; q++) {
          const a = lotA(q) + 0.09, mx = Math.cos(a) * (RL - 0.06), my = Math.sin(a) * (RL - 0.06);
          list.push({ y: my, f: () => stall(ctx, mx, my, q) });
        }
      }
    }
    // 역 + 손님
    list.push({ y: -RL, f: () => station(ctx, t, dark) });
    s.pax.forEach((p, n) => {
      if (p.done < 0) return;
      // 소원을 이룬 손님은 빙글빙글 재주넘기하며 마을로 간다
      const walk = p.done > 0 ? Math.min(1, (t - p.t) / 400) : 0, px = -0.07 + n * 0.035 + walk * 0.1, py = -RT - 0.045 + walk * 0.02;
      list.push({ y: py, f: () => (person(ctx, px, py, p.hue, t, false, p.done > 0 ? 4 : mood), !p.done && bubble(ctx, px, py, WANT[p.want][0], t)) });
    });
    // 양 · 풍차 / 연못 오리
    if (!s.rivers.length) {
      list.push({ y: 0, f: () => windmill(ctx, t) });
      for (let q = 0; q < 3; q++) {
        const sx = Math.cos(t / 240 + q * 2.1) * 0.12, sy = 0.07 + Math.sin(t / 190 + q * 1.3) * 0.05;
        list.push({ y: sy, f: () => sheep(ctx, sx, sy, t + q * 30, mood === 3 || evoAge < 30 ? 3 : mood) });
      }
    } else {
      const jump = splashAge < 40 ? Math.sin((splashAge / 40) * Math.PI) * 20 * K : 0;
      list.push({ y: 0.01, f: () => (emoji(ctx, '🦆', Math.cos(t / 90) * 0.05, 0.01 + Math.sin(t / 90) * 0.02, 13 * K, Math.sin(t / 90) > 0, jump), jump > 0 && emoji(ctx, '❗', Math.cos(t / 90) * 0.05 + 0.02, 0.01 + Math.sin(t / 90) * 0.02, 11 * K, false, jump + 16 * K)) });
    }
    trainCars(ctx, s, list, dark, evoAge < 18 ? Math.sin((evoAge / 18) * Math.PI) * 0.014 : 0);
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    smoke(ctx, s);
    // 역 앞 시장: 지붕과 지붕 사이에 알록달록 깃발 줄
    for (let i = 1; i < N - 1; i++) {
      if (lk.run[i] !== 3 || lk.run[i + 1] !== 3) continue;
      const [x0, y0] = sp(...lotG(i), 0.058), [x1, y1] = sp(...lotG(i + 1), 0.058), mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + 8 * K;
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 0.8 * K;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(mx, my, x1, y1);
      ctx.stroke();
      for (let q = 1; q < 6; q++) {
        const f = q / 6, bx = (1 - f) * (1 - f) * x0 + 2 * f * (1 - f) * mx + f * f * x1, by = (1 - f) * (1 - f) * y0 + 2 * f * (1 - f) * my + f * f * y1;
        ctx.fillStyle = ['#ff5c6c', '#ffd23f', '#4dabf7', '#7ee07e', '#ff9f43'][(q + i) % 5];
        ctx.beginPath();
        ctx.moveTo(bx - 2.2 * K, by);
        ctx.lineTo(bx + 2.2 * K, by);
        ctx.lineTo(bx + Math.sin(t / 9 + q) * 0.8 * K, by + 5 * K);
        ctx.fill();
      }
    }
    // 떠내려간 화물: 강을 따라 둥둥 → 폭포로 데굴데굴 (어푸어푸)
    for (const e of s.events) {
      if (e.kind !== 'splash' || !e.k) continue;
      const age = t - e.t, a = lotA(e.lot), r = RL + Math.min(1, age / 60) * (RI - RL + 0.01), fall = Math.max(0, age - 60);
      const [x, y0] = sp(Math.cos(a) * r, Math.sin(a) * r), y = y0 + fall * fall * 0.03 * K + Math.sin(age / 5) * 1.5 * K;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(age / 7) * 0.5 + fall * 0.25);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${16 * K}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ICON[e.k], 0, 0);
      ctx.restore();
      if (age < 60) {
        ctx.font = `800 ${10 * K}px system-ui, sans-serif`;
        ctx.fillStyle = '#e8f8ff';
        ctx.fillText(age % 30 < 15 ? '어푸' : '어푸어푸', x + 16 * K, y - 10 * K);
      }
    }
    // 지금 자리 미리보기(반투명) + 화살표
    if (!s.pause && front && cur) {
      const L = s.lots[cur], [gx, gy] = lotG(cur), [x, y] = sp(gx, gy, 0.075);
      if (!L.k) {
        ctx.globalAlpha = 0.45;
        item(ctx, front, gx, gy, 0, 1, { lv: 1, run: 0, lit: false, dark, hue: L.hue, ang: lotA(cur) + Math.PI / 2, river: L.river, beach: L.beach, t });
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${14 * K}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▼', x, y - 6 * K + Math.sin(t / 5) * 2 * K);
    }
    if (dark > 0.02) night(ctx, s, lk, dark, w, h);
    // 사건 연출
    const seenT = fx.memo.t ?? -1;
    // 떠오르는 글자는 글자 폭만큼 화면 안으로 (가장자리 터에서 잘리지 않게)
    const pop = (x: number, y: number, text: string, col: string, size: number) => {
      ctx.font = `800 ${size}px system-ui, sans-serif`;
      const hw = ctx.measureText(text).width / 2 + 6;
      fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
    };
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      const [gx, gy] = e.lot > 0 ? lotG(e.lot) : e.lot === 0 ? [0, -RT] : [0, 0];
      const [x0, y] = sp(gx, gy, e.lot >= 0 ? 0.05 : 0);
      if (e.kind === 'drop') fx.burst(x0, y + 8 * K, e.col!, 14, 2.6, 2.6), fx.ring(x0, y + 8 * K, '#ffffff', 26 * K, 3), e.text && pop(x0, y - 10 * K, e.text, '#ffffff', 15 * K), fx.kick(1.5);
      if (e.kind === 'stack') fx.burst(x0, y, e.col!, 20, 3, 3), fx.ring(x0, y, '#ffffff', 34 * K, 4), pop(x0, y - 14 * K, e.text!, '#fff1a8', 17 * K), fx.kick(3);
      if (e.kind === 'evolve') fx.burst(x0, y, e.col!, 42, 5, 3.4), fx.ring(x0, y, e.col!, 70 * K, 6), fx.kick(6), fx.blink('#fffbe0', 0.18), pop(x0, y - 30 * K, e.text!, '#ffffff', 20 * K);
      if (e.kind === 'market') {
        for (const c of ['#ff5c6c', '#ffd23f', '#4dabf7', '#7ee07e']) fx.burst(x0, y, c, 16, 6, 3);
        fx.ring(x0, y, '#ffd23f', 90 * K, 7), fx.kick(8), fx.blink('#fff1c0', 0.25), pop(x0, y - 32 * K, e.text!, '#ffd23f', 22 * K);
      }
      if (e.kind === 'splash') fx.burst(x0, y + 6 * K, '#6fd3ff', 30, 4, 3), fx.ring(x0, y + 6 * K, '#bfefff', 40 * K, 4), fx.kick(4), pop(x0, y - 16 * K, e.text!, '#bfefff', 15 * K);
      if (e.kind === 'bump') pop(x0, y - 12 * K, e.text!, '#ffd0d0', 13 * K), fx.kick(1);
      if (e.kind === 'load') fx.burst(x0, y, '#ffffff', 18, 2.5, 4), pop(x0, y - 22 * K, e.text!, '#ffffff', 15 * K);
      if (e.kind === 'pax') fx.burst(x0, y, '#7ee07e', 24, 4, 3), pop(x0, y + 40 * K, e.text!, '#b9ffb9', 17 * K);
      if (e.kind === 'paxno') pop(x0, y + 58 * K, e.text!, '#c8d0e0', 14 * K);
      if (e.kind === 'clear') {
        for (const c of ['#ff5c6c', '#ffd23f', '#4dabf7', '#7ee07e', '#ffffff']) fx.burst(w / 2, h * 0.45, c, 22, 7, 3.2);
        fx.blink('#fff6c8', 0.3), fx.kick(5);
      }
      if (e.kind === 'fail') fx.kick(10), fx.blink(th.hot, 0.25);
    }
    fx.memo.t = t;
    // 첫 안내 · 새것 띠 · 판 결과 카드
    if (s.stage === 0 && s.drops === 0 && !s.pause) {
      card(ctx, w / 2, CY * w + 0.02 * w, ['👆 탭! 기차가 나무를 내려놓아요', '나무 셋 나란히 = 숲'], K, 'rgba(255,250,235,.92)', '#4a3020');
    } else if (s.stage === 0 && s.drops < 3 && !lk.forests && !s.pause) {
      card(ctx, w / 2, CY * w + 0.02 * w, ['탭 탭 탭 — 줄지어 세워요!'], K, 'rgba(255,250,235,.85)', '#4a3020');
    }
    const note = s.notes.find((n) => t >= n.t && t < n.t + 170);
    if (note) {
      ctx.globalAlpha = Math.min(1, (n4(t - note.t)) / 12, (note.t + 170 - t) / 15);
      card(ctx, w / 2, 0.165 * w, [note.text], K * 0.92, 'rgba(45,30,18,.86)', '#fff3c8');
      ctx.globalAlpha = 1;
    }
    if (s.pause > 0 && s.result) {
      const ok = s.result === 'clear' || s.result === 'end', st = ok ? Math.min(3, 1 + +(s.last >= s.cfg.goal[1]) + +(s.last >= s.cfg.goal[2])) : 0;
      const lines = ok
        ? [s.result === 'end' ? '🎉 마을 축제 완성!' : `${s.stage + 1}판 완성!`, `${'★'.repeat(st)}${'☆'.repeat(3 - st)}  마을 ${s.last}점`]
        : s.result === 'over' ? ['하트를 다 썼어요', `마을 점수 합계 ${s.total}`] : [`${s.cfg.goal[0] - s.last}점 모자라요`, `♥ -1 · 이 판 다시!`];
      card(ctx, w / 2, 0.27 * w, lines, K * 1.25, ok ? 'rgba(255,250,235,.95)' : 'rgba(60,20,20,.88)', ok ? '#4a3020' : '#ffdede');
    } else if (s.stage > 0 && t - s.stageT < 70 && t - s.stageT > 0) {
      card(ctx, w / 2, 0.27 * w, [`${s.stage + 1}판 — 목표 ${s.cfg.goal[0]}점`, `${s.cfg.laps}바퀴 · 화물칸 ${s.cfg.cap}`], K * 1.1, 'rgba(255,250,235,.92)', '#4a3020');
    }
    ctx.restore();
    hud(ctx, s, w, h, K, th);
  },
};
const n4 = (x: number) => Math.max(0, x);

// ───────────────────────── 그리기 도우미 (시뮬레이션과 무관) ─────────────────────────
let W = 380;
type V3 = [number, number, number];
interface Face { p: V3[]; c: string }
const sp = (x: number, y: number, z = 0): [number, number] => [(CX + x) * W, (CY + y * SQ - z * ZS) * W];
const nrm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const VIEW = nrm([0, ZS, SQ]), LIGHT = nrm([-0.55, 0.45, 0.75]);
const rgbMemo = new Map<string, number[]>();
function shade(hex: string, f: number) {
  let c = rgbMemo.get(hex);
  if (!c) rgbMemo.set(hex, (c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))));
  return `rgb(${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0})`;
}
/** 볼록한 입체의 면들을 그린다: 뒷면은 버리고, 빛 방향에 따라 밝기를 준다 */
function solid(ctx: CanvasRenderingContext2D, fs: Face[], cen: V3, edge = true) {
  for (const f of fs) {
    const [a, b, c] = f.p, u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = nrm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
    const m = f.p.reduce((s, q) => [s[0] + q[0] / f.p.length, s[1] + q[1] / f.p.length, s[2] + q[2] / f.p.length], [0, 0, 0]);
    if (n[0] * (m[0] - cen[0]) + n[1] * (m[1] - cen[1]) + n[2] * (m[2] - cen[2]) < 0) n = [-n[0], -n[1], -n[2]];
    if (n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] <= 0.02) continue;
    ctx.fillStyle = shade(f.c, 0.72 + 0.42 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]));
    ctx.beginPath();
    f.p.forEach((q, i) => (i ? ctx.lineTo(...sp(q[0], q[1], q[2])) : ctx.moveTo(...sp(q[0], q[1], q[2]))));
    ctx.closePath();
    ctx.fill();
    if (edge) (ctx.strokeStyle = 'rgba(50,30,15,.35)'), (ctx.lineWidth = 0.7), ctx.stroke();
  }
}
function boxF(x: number, y: number, z: number, a: number, b: number, hh: number, ang: number, col: string, top = col): Face[] {
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (lx: number, ly: number, lz: number): V3 => [x + lx * ca - ly * sa, y + lx * sa + ly * ca, lz];
  const B = [P(-a, -b, z), P(a, -b, z), P(a, b, z), P(-a, b, z)], T = B.map((p) => [p[0], p[1], z + hh] as V3);
  return [0, 1, 2, 3].map((i) => ({ p: [B[i], B[(i + 1) % 4], T[(i + 1) % 4], T[i]], c: col })).concat([{ p: T, c: top }]);
}
function box(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, a: number, b: number, hh: number, ang: number, col: string, top = col) {
  solid(ctx, boxF(x, y, z, a, b, hh, ang, col, top), [x, y, z + hh / 2]);
}
function roof(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, a: number, b: number, rh: number, ang: number, col: string, wall: string) {
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (lx: number, ly: number, lz: number): V3 => [x + lx * ca - ly * sa, y + lx * sa + ly * ca, lz];
  const e1 = P(-a, -b, z), e2 = P(a, -b, z), e3 = P(a, b, z), e4 = P(-a, b, z), r1 = P(-a, 0, z + rh), r2 = P(a, 0, z + rh);
  solid(ctx, [{ p: [e1, e2, r2, r1], c: col }, { p: [e4, e3, r2, r1], c: col }, { p: [e2, e3, r2], c: wall }, { p: [e1, e4, r1], c: wall }], [x, y, z + rh / 3]);
}
/** 벽 네 면마다 층별 창문 (보이는 면만 그려진다) */
function windows(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, a: number, b: number, hh: number, lv: number, ang: number, col: string) {
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (lx: number, ly: number, lz: number): V3 => [x + lx * ca - ly * sa, y + lx * sa + ly * ca, lz];
  const side: [number, number][][] = [[[-a, -b], [a, -b]], [[a, -b], [a, b]], [[a, b], [-a, b]], [[-a, b], [-a, -b]]], fs: Face[] = [];
  for (const [p0, p1] of side)
    for (let l = 0; l < lv; l++) {
      const L = (s: number, zz: number) => P(p0[0] + (p1[0] - p0[0]) * s, p0[1] + (p1[1] - p0[1]) * s, zz), z0 = z + (hh / lv) * (l + 0.3), z1 = z + (hh / lv) * (l + 0.75);
      fs.push({ p: [L(0.36, z0), L(0.64, z0), L(0.64, z1), L(0.36, z1)], c: col });
    }
  solid(ctx, fs, [x, y, z + hh / 2], false);
}
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, a = 0.22) {
  ctx.fillStyle = `rgba(25,45,15,${a})`;
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.3, y + rx * 0.08, rx, rx * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}
function emoji(ctx: CanvasRenderingContext2D, e: string, gx: number, gy: number, size: number, flip = false, lift = 0, rot = 0) {
  const [x, y] = sp(gx, gy);
  shadow(ctx, x, y, size * 0.35 * (1 - Math.min(0.5, lift / (size * 3))), 0.18);
  ctx.save();
  ctx.translate(x, y - size * 0.45 - lift);
  if (rot) ctx.rotate(flip ? -rot : rot);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, 0, 0);
  ctx.restore();
}
/** 섬 가장자리 장식: 덤불과 바위가 번갈아 */
function rimBit(ctx: CanvasRenderingContext2D, gx: number, gy: number, i: number) {
  const [x, y] = sp(gx, gy), K = W / 380;
  if (i % 3 === 1) {
    shadow(ctx, x, y, 5 * K, 0.2);
    ctx.fillStyle = '#9a958c';
    ctx.beginPath();
    ctx.ellipse(x, y - 2 * K, 5 * K, 3.5 * K, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c4beb3';
    ctx.beginPath();
    ctx.ellipse(x - 1.2 * K, y - 3.2 * K, 2.6 * K, 1.6 * K, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  shadow(ctx, x, y, 7 * K, 0.2);
  for (const [dx, dy, r, c] of [[-3.5, -3, 4, '#4f9a3f'], [3, -3.5, 4.2, '#4a9140'], [0, -6, 4.6, '#62b04e']] as const) (ctx.fillStyle = c), ctx.beginPath(), ctx.arc(x + dx * K, y + dy * K, r * K, 0, Math.PI * 2), ctx.fill();
  if (i % 3 === 2) (ctx.fillStyle = '#ff8fb1'), ctx.beginPath(), ctx.arc(x + 1.5 * K, y - 7.5 * K, 1.5 * K, 0, Math.PI * 2), ctx.fill();
}

interface ItemOpt { lv: number; run: number; lit: boolean; dark: number; hue: number; ang: number; river: boolean; beach: boolean; t: number }
/** 터 위의 물건 하나 (화물칸 위 작은 것·미리보기도 같은 함수) */
function item(ctx: CanvasRenderingContext2D, k: Kind, gx: number, gy: number, z: number, sc0: number, o: ItemOpt) {
  const sc = sc0 * GS, [x, y] = sp(gx, gy, z), K = (W / 380) * sc;
  if (k === 'T') {
    const big = (o.run ? 1.18 : 1) * (1 + 0.28 * (o.lv - 1)), sway = Math.sin(o.t / 40 + o.hue * 9) * 0.6 * K;
    if (z < 0.01) shadow(ctx, x, y, 10 * K * big);
    ctx.fillStyle = '#7b4b2a';
    ctx.fillRect(x - 1.7 * K * big, y - 7 * K * big, 3.4 * K * big, 7.5 * K * big);
    if (o.run && o.hue > 0.5) {
      // 숲: 둥근 활엽수
      for (const [dx, dy, r] of [[-4.5, -14, 7], [4.5, -15, 7], [0, -21, 8]] as const) {
        const cx = x + dx * K * big + sway, cy = y + dy * K * big, rr = r * K * big;
        const g = ctx.createRadialGradient(cx - rr * 0.4, cy - rr * 0.5, rr * 0.1, cx, cy, rr);
        g.addColorStop(0, '#8fdc6a');
        g.addColorStop(1, '#2f7d32');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    const hi = o.run ? '#5fbf5a' : '#7dd36b', lo = o.run ? '#1f6b2a' : '#2e8b3a';
    for (let i = 0; i < 3; i++) {
      const by = y - (5 + i * 6) * K * big, hw = (10 - i * 2.5) * K * big, th = 11 * K * big, sx = sway * (i + 1) * 0.5;
      const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
      g.addColorStop(0, hi);
      g.addColorStop(1, lo);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - hw, by);
      ctx.quadraticCurveTo(x, by + 3 * K * big, x + hw, by);
      ctx.lineTo(x + sx, by - th);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (k === 'H') {
    const s = sc, a = 0.021 * s, b = 0.017 * s, hh = (0.024 + 0.02 * (o.lv - 1)) * s, hue = Math.floor(o.hue * 4);
    const wall = ['#f6e7c8', '#f7d4bb', '#e6e1f3', '#d9efd2'][hue], rf = ['#d9534f', '#3f7fd9', '#e39b2d', '#7b5bd6'][hue];
    if (z < 0.01) shadow(ctx, x, y, 15 * K);
    box(ctx, gx, gy, z, a, b, hh, o.ang, wall);
    windows(ctx, gx, gy, z, a, b, hh, o.lv, o.ang, o.dark > 0.25 ? (o.lit ? '#ffd25a' : '#2f3b5a') : '#7fb2e5');
    roof(ctx, gx, gy, z + hh, a + 0.004 * s, b + 0.006 * s, 0.02 * s, o.ang, rf, wall);
    return;
  }
  if (k === 'B') {
    const s = sc;
    if (o.river) {
      box(ctx, gx, gy, z + 0.004, 0.038 * s, 0.013 * s, 0.006 * s, o.ang, '#c38a4e', '#d9a066');
      for (const sd of [-1, 1]) {
        const ox = -Math.sin(o.ang) * sd * 0.012 * s, oy = Math.cos(o.ang) * sd * 0.012 * s;
        box(ctx, gx + ox, gy + oy, z + 0.01 * s, 0.038 * s, 0.0018 * s, 0.009 * s, o.ang, '#8a5a2b');
      }
    } else {
      if (z < 0.01) shadow(ctx, x, y, 10 * K);
      box(ctx, gx, gy, z, 0.018 * s, 0.009 * s, 0.006 * s, o.ang, '#c38a4e');
      box(ctx, gx, gy, z + 0.006 * s, 0.016 * s, 0.008 * s, 0.006 * s, o.ang + 0.5, '#b07a43');
    }
    return;
  }
  if (k === 'L') {
    if (z < 0.01) shadow(ctx, x, y, 11 * K);
    if (o.beach) (ctx.fillStyle = '#8d8a85'), ctx.beginPath(), ctx.ellipse(x, y, 9 * K, 4 * K, 0, 0, Math.PI * 2), ctx.fill();
    const H = 44 * K, bw = 8 * K, tw = 5.2 * K;
    for (let i = 0; i < 4; i++) {
      const y0 = y - (H * i) / 4, y1 = y - (H * (i + 1)) / 4, w0 = bw + ((tw - bw) * i) / 4, w1 = bw + ((tw - bw) * (i + 1)) / 4;
      ctx.fillStyle = i % 2 ? '#f5f1e8' : '#d9433a';
      ctx.beginPath();
      ctx.moveTo(x - w0, y0);
      ctx.lineTo(x + w0, y0);
      ctx.lineTo(x + w1, y1);
      ctx.lineTo(x - w1, y1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath();
    ctx.moveTo(x + 1 * K, y);
    ctx.lineTo(x + bw, y);
    ctx.lineTo(x + tw, y - H);
    ctx.lineTo(x + 1 * K, y - H);
    ctx.fill();
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(x - tw - 2 * K, y - H - 2 * K, tw * 2 + 4 * K, 2.5 * K);
    ctx.fillStyle = '#ffe27a';
    ctx.shadowColor = '#ffe27a';
    ctx.shadowBlur = 8 + o.dark * 14;
    ctx.fillRect(x - tw * 0.8, y - H - 9 * K, tw * 1.6, 7 * K);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d9433a';
    ctx.beginPath();
    ctx.arc(x, y - H - 9 * K, tw * 0.95, Math.PI, 0);
    ctx.fill();
    return;
  }
  // 가로등
  if (z < 0.01) shadow(ctx, x, y, 5 * K);
  ctx.fillStyle = '#3b3f4a';
  ctx.fillRect(x - 1.1 * K, y - 24 * K, 2.2 * K, 24 * K);
  ctx.fillRect(x - 3 * K, y - 2 * K, 6 * K, 2 * K);
  ctx.fillStyle = o.dark > 0.2 ? '#fff1b0' : '#ffe9a0';
  ctx.shadowColor = '#ffd25a';
  ctx.shadowBlur = 6 + o.dark * 16;
  ctx.fillRect(x - 3.2 * K, y - 31 * K, 6.4 * K, 7 * K);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#3b3f4a';
  ctx.beginPath();
  ctx.moveTo(x - 4.5 * K, y - 31 * K);
  ctx.lineTo(x + 4.5 * K, y - 31 * K);
  ctx.lineTo(x, y - 35 * K);
  ctx.fill();
}

/** 반응: 0 걷기 · 1 춤 · 2 데굴데굴 · 3 깜짝(눈 커지며 펄쩍) · 4 재주넘기 */
type Mood = 0 | 1 | 2 | 3 | 4;
function person(ctx: CanvasRenderingContext2D, gx: number, gy: number, hue: number, t: number, flip: boolean, mood: Mood = 0) {
  const [x, y] = sp(gx, gy), K = W / 380, step = Math.sin(t / 5) * 1.6 * K;
  let lift = 0, rot = 0, dx = 0;
  if (mood === 1) (lift = Math.abs(Math.sin(t / 6)) * 6 * K), (rot = Math.sin(t / 6) * 0.45);
  if (mood === 2) (rot = (t / 4) * (flip ? -1 : 1)), (dx = Math.sin(t / 25) * 7 * K), (lift = 2 * K);
  if (mood === 3) lift = Math.max(0, Math.sin(t / 4)) * 9 * K;
  if (mood === 4) (rot = t / 7), (lift = 5 * K + Math.abs(Math.sin(t / 7)) * 4 * K);
  shadow(ctx, x + dx, y, 3.5 * K, 0.25);
  ctx.save();
  ctx.translate(x + dx, y - 7 * K - lift);
  ctx.rotate(rot);
  ctx.strokeStyle = '#3a2a20';
  ctx.lineWidth = 1.2 * K;
  ctx.beginPath();
  const kick = mood ? Math.sin(t / 3) * 2.5 * K : step;
  ctx.moveTo(-1 * K, 3 * K);
  ctx.lineTo(-1 * K + kick, 7 * K);
  ctx.moveTo(1 * K, 3 * K);
  ctx.lineTo(1 * K - kick, 7 * K);
  if (mood === 1 || mood === 3) {
    // 팔을 번쩍 (춤이면 흔들흔들)
    const wv = mood === 1 ? Math.sin(t / 4) * 2 * K : 0;
    ctx.moveTo(-2.4 * K, -1.5 * K);
    ctx.lineTo(-5 * K + wv, -6.5 * K);
    ctx.moveTo(2.4 * K, -1.5 * K);
    ctx.lineTo(5 * K + wv, -6.5 * K);
  }
  ctx.stroke();
  ctx.fillStyle = `hsl(${hue},65%,55%)`;
  ctx.beginPath();
  ctx.roundRect(-2.6 * K, -3 * K, 5.2 * K, 6.5 * K, 2 * K);
  ctx.fill();
  ctx.fillStyle = '#f3c9a0';
  const hx = (flip ? -0.4 : 0.4) * K;
  ctx.beginPath();
  ctx.arc(hx, -5.6 * K, 2.7 * K, 0, Math.PI * 2);
  ctx.fill();
  if (mood === 3) {
    // 깜짝: 눈이 왕방울
    ctx.fillStyle = '#ffffff';
    for (const ex of [-1.1, 1.1]) (ctx.beginPath(), ctx.arc(hx + ex * K, -6 * K, 1.3 * K, 0, Math.PI * 2), ctx.fill());
    ctx.fillStyle = '#1a1a1a';
    for (const ex of [-1.1, 1.1]) (ctx.beginPath(), ctx.arc(hx + ex * K, -6 * K, 0.6 * K, 0, Math.PI * 2), ctx.fill());
  } else {
    ctx.fillStyle = '#3a2a20';
    for (const ex of [-0.9, 0.9]) ctx.fillRect(hx + ex * K - 0.3 * K, -6.2 * K, 0.6 * K, 0.9 * K);
  }
  ctx.restore();
}
function bubble(ctx: CanvasRenderingContext2D, gx: number, gy: number, e: string, t: number) {
  const [x, y0] = sp(gx, gy), K = W / 380, y = y0 - 26 * K + Math.sin(t / 12) * 1.5 * K;
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.roundRect(x - 10 * K, y - 9 * K, 20 * K, 17 * K, 6 * K);
  ctx.moveTo(x - 2 * K, y + 8 * K);
  ctx.lineTo(x, y + 12 * K);
  ctx.lineTo(x + 2 * K, y + 8 * K);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${12 * K}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y);
}
function stall(ctx: CanvasRenderingContext2D, gx: number, gy: number, q: number) {
  box(ctx, gx, gy, 0, 0.011, 0.008, 0.01, 0.3, '#c98a4b');
  const top = ['#ff5c6c', '#4dabf7', '#ffd23f'][q % 3];
  box(ctx, gx, gy, 0.016, 0.014, 0.011, 0.003, 0.3, top, top);
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 1;
  const [x0, y0] = sp(gx - 0.012, gy, 0.016), [x1, y1] = sp(gx - 0.012, gy, 0.0);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const [px, py] = sp(gx, gy, 0.012);
  ctx.fillStyle = ['#ff9f43', '#7ee07e', '#ff6b81'][q % 3];
  for (let i = 0; i < 3; i++) (ctx.beginPath(), ctx.arc(px - 3 + i * 3, py, 1.6, 0, Math.PI * 2), ctx.fill());
}
function sheep(ctx: CanvasRenderingContext2D, gx: number, gy: number, t: number, mood: Mood = 0) {
  const [x, y] = sp(gx, gy), K = W / 380;
  const hop = mood === 3 ? Math.max(0, Math.sin(t / 5)) * 10 * K : mood === 1 ? Math.abs(Math.sin(t / 7)) * 6 * K : Math.abs(Math.sin(t / 18)) * 1.2 * K;
  shadow(ctx, x, y, 6 * K, 0.2);
  ctx.save();
  ctx.translate(x, y - 5 * K - hop);
  // 실패하면 벌러덩 뒤집혀 다리를 버둥버둥, 춤출 땐 엉덩이 실룩
  if (mood === 2) ctx.rotate(Math.PI + Math.sin(t / 4) * 0.2);
  else if (mood === 1) ctx.rotate(Math.sin(t / 5) * 0.3);
  ctx.fillStyle = '#3a3030';
  const kick = mood === 2 ? Math.sin(t / 2) * 1.5 * K : 0;
  ctx.fillRect(-3 * K + kick, 2 * K, 1.4 * K, 3 * K);
  ctx.fillRect(2 * K - kick, 2 * K, 1.4 * K, 3 * K);
  ctx.fillStyle = '#fbfbf5';
  for (const [dx, dy, r] of [[-2.5, -1, 3.6], [1.5, -2, 3.8], [3.5, 0, 3], [-0.5, -3.5, 3]] as const) (ctx.beginPath(), ctx.arc(dx * K, dy * K, r * K, 0, Math.PI * 2), ctx.fill());
  ctx.fillStyle = '#3a3030';
  ctx.beginPath();
  ctx.ellipse(6 * K, -2 * K, 2.2 * K, 1.7 * K, 0, 0, Math.PI * 2);
  ctx.fill();
  if (mood === 3) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6.6 * K, -2.6 * K, 1.1 * K, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(6.8 * K, -2.6 * K, 0.5 * K, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (mood === 3 && hop > 4 * K) (ctx.fillStyle = '#ffffff'), (ctx.font = `900 ${10 * K}px system-ui, sans-serif`), (ctx.textAlign = 'center'), ctx.fillText('메에?!', x, y - 20 * K - hop);
}
function windmill(ctx: CanvasRenderingContext2D, t: number) {
  box(ctx, 0, 0, 0, 0.022, 0.022, 0.05, 0.4, '#efe4cf');
  roof(ctx, 0, 0, 0.05, 0.026, 0.026, 0.026, 0.4, '#b5523b', '#efe4cf');
  const [x, y] = sp(0.0, 0.024, 0.055), K = W / 380, a0 = t / 30;
  ctx.strokeStyle = '#6b4a2a';
  ctx.fillStyle = 'rgba(255,250,240,.92)';
  ctx.lineWidth = 1.2 * K;
  for (let i = 0; i < 4; i++) {
    const a = a0 + (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + c * 24 * K, y + s * 24 * K);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + c * 6 * K - s * 0.5 * K, y + s * 6 * K + c * 0.5 * K);
    ctx.lineTo(x + c * 23 * K - s * 0.5 * K, y + s * 23 * K + c * 0.5 * K);
    ctx.lineTo(x + c * 23 * K - s * 5 * K, y + s * 23 * K + c * 5 * K);
    ctx.lineTo(x + c * 6 * K - s * 4 * K, y + s * 6 * K + c * 4 * K);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#6b4a2a';
  ctx.beginPath();
  ctx.arc(x, y, 2.2 * K, 0, Math.PI * 2);
  ctx.fill();
}

function station(ctx: CanvasRenderingContext2D, t: number, dark: number) {
  const y = -RL + 0.01;
  box(ctx, 0, -RT - 0.042, 0, 0.075, 0.014, 0.008, 0, '#b9b2a6', '#d6d0c4');
  box(ctx, 0, y, 0, 0.05, 0.026, 0.034, 0, '#f1dcb5');
  windows(ctx, 0, y, 0, 0.05, 0.026, 0.034, 1, 0, dark > 0.25 ? '#ffd25a' : '#7fb2e5');
  roof(ctx, 0, y, 0.034, 0.058, 0.034, 0.024, 0, '#3f8f5a', '#f1dcb5');
  const [x, cy] = sp(0, y + 0.026, 0.05), K = W / 380;
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 1.2 * K;
  ctx.beginPath();
  ctx.arc(x, cy, 4.2 * K, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + Math.cos(t / 60) * 3 * K, cy + Math.sin(t / 60) * 3 * K);
  ctx.moveTo(x, cy);
  ctx.lineTo(x, cy - 2.6 * K);
  ctx.stroke();
  // 깃발
  const [fx0, fy0] = sp(0.06, y - 0.01, 0), [fx1, fy1] = sp(0.06, y - 0.01, 0.085);
  ctx.strokeStyle = '#5a4a3a';
  ctx.beginPath();
  ctx.moveTo(fx0, fy0);
  ctx.lineTo(fx1, fy1);
  ctx.stroke();
  ctx.fillStyle = '#e0473c';
  ctx.beginPath();
  ctx.moveTo(fx1, fy1);
  ctx.quadraticCurveTo(fx1 + 7 * K, fy1 + 2 * K + Math.sin(t / 8) * 2 * K, fx1 + 13 * K, fy1 + 3 * K);
  ctx.lineTo(fx1, fy1 + 7 * K);
  ctx.fill();
}

function trainCars(ctx: CanvasRenderingContext2D, s: TrainState, list: { y: number; f: () => void }[], dark: number, hop: number) {
  const tangent = (u: number) => -Math.PI / 2 + 2 * Math.PI * u + Math.PI / 2;
  const part = (u: number, lx0: number, ly0: number, z0: number, a0: number, b0: number, h0: number, col: string, top?: string) => {
    const [lx, ly, z, a, b, hh] = [lx0 * TS, ly0 * TS, z0 * TS + hop, a0 * TS, b0 * TS, h0 * TS];
    const [cx, cy] = ringG(u), ang = tangent(u), x = cx + lx * Math.cos(ang) - ly * Math.sin(ang), y = cy + lx * Math.sin(ang) + ly * Math.cos(ang);
    list.push({ y: y + z * 0.3, f: () => box(ctx, x, y, z, a, b, hh, ang, col, top) });
  };
  const wheels = (u: number, xs: number[]) => {
    const [cx, cy] = ringG(u), ang = tangent(u);
    for (const lx0 of xs)
      for (const ly of [-0.015 * TS, 0.015 * TS]) {
        const lx = lx0 * TS, x = cx + lx * Math.cos(ang) - ly * Math.sin(ang), y = cy + lx * Math.sin(ang) + ly * Math.cos(ang);
        list.push({
          y: y - 0.004,
          f: () => {
            const [px, py] = sp(x, y, 0.007 * TS + hop), K = (W / 380) * TS;
            ctx.fillStyle = '#f4c542';
            ctx.strokeStyle = '#7a5a10';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(px, py, 3.4 * K, 3.4 * K, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#7a5a10';
            ctx.beginPath();
            ctx.arc(px, py, 1 * K, 0, Math.PI * 2);
            ctx.fill();
          },
        });
      }
  };
  const ul = s.u + 0.056;
  // 기관차: 바퀴 · 받침 · 보일러 · 운전실 · 굴뚝
  wheels(ul, [-0.018, 0.0, 0.018]);
  part(ul, 0, 0, 0.006, 0.034, 0.013, 0.008, '#2b2b33');
  part(ul, 0.01, 0, 0.014, 0.022, 0.011, 0.017, '#e0473c', '#ef6a5e');
  part(ul, -0.02, 0, 0.014, 0.012, 0.013, 0.026, '#2f6fd1', '#4b88e6');
  part(ul, -0.02, 0, 0.04, 0.015, 0.016, 0.004, '#f4c542');
  part(ul, 0.024, 0, 0.031, 0.004, 0.004, 0.014, '#2b2b33');
  part(ul, 0.024, 0, 0.045, 0.006, 0.006, 0.003, '#f4c542');
  // 화물칸: 맨 앞이 내려놓을 칸
  const cap = s.cfg.cap;
  for (let i = 0; i < cap; i++) {
    const uw = s.u - 0.044 * i, c = s.wagons[i];
    wheels(uw, [-0.014, 0.014]);
    part(uw, 0, 0, 0.006, 0.022, 0.012, 0.006, '#2b2b33');
    part(uw, 0, 0, 0.012, 0.025, 0.016, 0.007, i === 0 && c ? '#e9b45f' : '#c98a4b', i === 0 && c ? '#f6cf86' : '#d9a066');
    if (c) {
      const [gx, gy] = ringG(uw);
      list.push({ y: gy + 0.012, f: () => item(ctx, c, gx, gy, 0.019 * TS + hop, c === 'L' ? 0.42 : c === 'B' ? 0.6 : 0.55, { lv: 1, run: 0, lit: false, dark, hue: 0.3, ang: tangent(uw), river: false, beach: false, t: s.t }) });
    }
  }
}
function smoke(ctx: CanvasRenderingContext2D, s: TrainState) {
  const ul = s.u + 0.056, K = W / 380, moving = s.stop === 0 && !s.pause;
  for (let k = 0; k < 9; k++) {
    const age = (s.t + k * 8) % 72, ub = ul + 0.0035 - (moving ? age / s.lapTicks : 0);
    const ang = 2 * Math.PI * ub, lx = 0.024 * TS, [cx, cy] = ringG(ub), x = cx + lx * Math.cos(ang), y = cy + lx * Math.sin(ang);
    const [px, py] = sp(x, y, 0.05 * TS + age * 0.0011);
    ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - age / 72)})`;
    ctx.beginPath();
    ctx.arc(px + Math.sin(age / 9 + k) * 2 * K, py, (3 + age * 0.13) * K, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sky(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dark: number) {
  const mix = (a: number[], b: number[], f: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')})`;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, mix([128, 196, 236], [16, 22, 58], dark));
  g.addColorStop(0.6, mix([206, 236, 248], [52, 46, 96], dark));
  g.addColorStop(1, mix([250, 238, 214], [86, 60, 104], dark));
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  if (dark > 0.1)
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(255,255,240,${dark * (0.4 + 0.5 * Math.abs(Math.sin(t / 40 + k)))})`;
      ctx.fillRect(((k * 7919) % 997) / 997 * w, ((k * 104729) % 991) / 991 * h * 0.55, 1.6, 1.6);
    }
  for (let i = 0; i < 6; i++) {
    const x = ((((i * 0.37 + t * 0.00012 * (1 + (i % 3) * 0.4)) % 1.4) + 1.4) % 1.4 - 0.2) * w, y = (0.16 + ((i * 0.13) % 0.4)) * w + (i > 3 ? 0.75 * w : 0), r = (0.03 + (i % 3) * 0.012) * w;
    ctx.fillStyle = `rgba(255,255,255,${0.75 - dark * 0.5})`;
    for (const [dx, dy, rr] of [[-1.1, 0.2, 0.7], [0, -0.2, 1], [1.1, 0.15, 0.75], [0.5, 0.35, 0.6]] as const) (ctx.beginPath(), ctx.ellipse(x + dx * r, y + dy * r, rr * r * 1.3, rr * r * 0.8, 0, 0, Math.PI * 2), ctx.fill());
  }
}

function island(ctx: CanvasRenderingContext2D, s: TrainState, t: number) {
  const w = W, cx = CX * w, cy = CY * w, ex = RI * w, ey = RI * SQ * w, D = 0.07 * w, K = w / 380;
  // 매달린 바위 뿌리
  ctx.fillStyle = '#5a4433';
  ctx.beginPath();
  ctx.moveTo(cx - ex * 0.85, cy + D + ey * 0.4);
  const tips = [[-0.6, 0.16], [-0.42, 0.1], [-0.25, 0.22], [-0.08, 0.15], [0.05, 0.26], [0.22, 0.14], [0.38, 0.2], [0.58, 0.09]];
  for (const [dx, dy] of tips) ctx.lineTo(cx + dx * ex, cy + D + ey + dy * w * 0.55);
  ctx.lineTo(cx + ex * 0.85, cy + D + ey * 0.4);
  ctx.closePath();
  const rg = ctx.createLinearGradient(0, cy + D, 0, cy + D + ey + 0.15 * w);
  rg.addColorStop(0, '#6b4a30');
  rg.addColorStop(1, '#3c2d26');
  ctx.fillStyle = rg;
  ctx.fill();
  // 옆면 흙층
  ctx.beginPath();
  ctx.ellipse(cx, cy, ex, ey, 0, 0, Math.PI);
  ctx.lineTo(cx - ex, cy + D);
  ctx.ellipse(cx, cy + D, ex, ey, 0, Math.PI, 0, true);
  ctx.closePath();
  const sg = ctx.createLinearGradient(0, cy, 0, cy + ey + D);
  sg.addColorStop(0, '#9a6b42');
  sg.addColorStop(1, '#6b4a30');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,20,.35)';
  ctx.lineWidth = 2 * K;
  for (const f of [0.45, 0.75]) (ctx.beginPath(), ctx.ellipse(cx, cy + D * f, ex, ey, 0, 0.15, Math.PI - 0.15), ctx.stroke());
  ctx.fillStyle = 'rgba(80,60,50,.6)';
  for (let k = 0; k < 14; k++) {
    const a = 0.2 + (k / 14) * (Math.PI - 0.4), px = cx + Math.cos(a) * ex * 0.98, py = cy + Math.sin(a) * ey + D * (0.3 + ((k * 37) % 10) / 20);
    ctx.beginPath();
    ctx.ellipse(px, py, 3 * K, 2 * K, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 강·바닷가의 폭포 (앞쪽 가장자리에서 흘러내림)
  const falls: number[] = s.rivers.map((i) => lotA(i));
  const beachIdx = s.lots.map((l, i) => (l.beach ? i : -1)).filter((i) => i >= 0);
  if (beachIdx.length) falls.push(lotA(beachIdx[1]));
  for (const a of falls) {
    if (Math.sin(a) < -0.1) continue;
    const fx = cx + Math.cos(a) * ex, fy = cy + Math.sin(a) * ey, fw = 0.045 * w * (0.5 + 0.5 * Math.abs(Math.sin(a)));
    const fg = ctx.createLinearGradient(0, fy, 0, fy + D + 0.12 * w);
    fg.addColorStop(0, 'rgba(110,190,240,.95)');
    fg.addColorStop(1, 'rgba(110,190,240,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(fx - fw / 2, fy, fw, D + 0.12 * w);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let k = 0; k < 4; k++) ctx.fillRect(fx - fw / 2 + (k + 0.5) * (fw / 4), fy + ((t * 1.5 + k * 13) % (D + 0.08 * w)), 1.2 * K, 7 * K);
  }
  // 풀밭 윗면
  const gg = ctx.createRadialGradient(cx - ex * 0.2, cy - ey * 0.3, ex * 0.1, cx, cy, ex);
  gg.addColorStop(0, '#a6df7c');
  gg.addColorStop(1, '#6fbf55');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, ex, ey, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5aa845';
  ctx.lineWidth = 3 * K;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1, ex, ey, 0, 0.05, Math.PI - 0.05);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, ex - 1, ey - 1, 0, 0, Math.PI * 2);
  ctx.clip();
  // 풀 무늬 · 꽃
  for (let k = 0; k < 70; k++) {
    const a = ((k * 2.399) % (Math.PI * 2)), r = Math.sqrt(((k * 0.618) % 1)) * 0.95, px = cx + Math.cos(a) * r * ex, py = cy + Math.sin(a) * r * ey;
    ctx.strokeStyle = 'rgba(60,130,50,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 1.5 * K, py - 3 * K);
    ctx.moveTo(px + 1.5 * K, py);
    ctx.lineTo(px + 2 * K, py - 3 * K);
    ctx.stroke();
    if (k % 9 === 0) (ctx.fillStyle = ['#fff6a0', '#ffb3c7', '#ffffff'][k % 3]), ctx.beginPath(), ctx.arc(px + 4 * K, py - 1 * K, 1.6 * K, 0, Math.PI * 2), ctx.fill();
  }
  // 바닷가: 모래 + 물가
  if (beachIdx.length) {
    const a0 = lotA(beachIdx[0] - 0.6), a1 = lotA(beachIdx[beachIdx.length - 1] + 0.6);
    const band = (r0: number, r1: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let k = 0; k <= 20; k++) {
        const a = a0 + ((a1 - a0) * k) / 20, [x, y] = sp(Math.cos(a) * r0, Math.sin(a) * r0);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      for (let k = 20; k >= 0; k--) {
        const a = a0 + ((a1 - a0) * k) / 20, [x, y] = sp(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(x, y);
      }
      ctx.fill();
    };
    band(RL - 0.05, RI + 0.02, '#f3dfa6');
    band(RL + 0.045 + 0.004 * Math.sin(t / 20), RI + 0.02, '#4fb3e8');
    band(RL + 0.045 + 0.004 * Math.sin(t / 20), RL + 0.052 + 0.004 * Math.sin(t / 20), 'rgba(255,255,255,.85)');
    const am = (a0 + a1) / 2, [bx, by] = sp(Math.cos(am) * (RI - 0.02), Math.sin(am) * (RI - 0.02));
    ctx.fillStyle = '#ffffff';
    ctx.font = `${13 * K}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛵', bx + Math.sin(t / 50) * 6 * K, by - 4 * K + Math.sin(t / 15) * K);
  }
  // 강 + 가운데 연못
  if (s.rivers.length) {
    const pts: [number, number][] = [];
    const a1 = lotA(s.rivers[0]);
    pts.push(sp(Math.cos(a1) * (RI + 0.03), Math.sin(a1) * (RI + 0.03)), sp(Math.cos(a1) * 0.2, Math.sin(a1) * 0.2), sp(0, 0));
    if (s.rivers[1]) {
      const a2 = lotA(s.rivers[1]);
      pts.push(sp(Math.cos(a2) * 0.2, Math.sin(a2) * 0.2), sp(Math.cos(a2) * (RI + 0.03), Math.sin(a2) * (RI + 0.03)));
    }
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(...pts[k]);
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    path();
    ctx.strokeStyle = '#d9c48c';
    ctx.lineWidth = 0.085 * w;
    ctx.stroke();
    path();
    ctx.strokeStyle = '#4aa3df';
    ctx.lineWidth = 0.065 * w;
    ctx.stroke();
    path();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1.2 * K;
    ctx.setLineDash([6 * K, 10 * K]);
    ctx.lineDashOffset = -t * 0.4;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#d9c48c';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 0.105 * w, 0.105 * w * SQ, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4aa3df';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 0.09 * w, 0.09 * w * SQ, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4caf50';
    for (const [dx, dy] of [[-0.05, 0.02], [0.04, -0.015]]) (ctx.beginPath(), ctx.ellipse(cx + dx * w, cy + dy * w, 4 * K, 2.2 * K, 0, 0.3, Math.PI * 2), ctx.fill());
    ctx.lineCap = 'butt';
  }
  ctx.restore();
}

function track(ctx: CanvasRenderingContext2D, s: TrainState) {
  const w = W, cx = CX * w, cy = CY * w, K = w / 380;
  const ring = (r0: number, r1: number, col: string, dy = 0) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, cy + dy, r1 * w, r1 * w * SQ, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy + dy, r0 * w, r0 * w * SQ, 0, 0, Math.PI * 2);
    ctx.fill('evenodd');
  };
  ring(RT - 0.03, RT + 0.03, '#8d7a62', 2 * K);
  ring(RT - 0.03, RT + 0.03, '#c2b196');
  // 강 위는 나무 다리
  for (const i of s.rivers) {
    for (const a of [lotA(i)]) {
      for (let k = -4; k <= 4; k++) {
        const aa = a + k * 0.022, [x0, y0] = sp(Math.cos(aa) * (RT - 0.032), Math.sin(aa) * (RT - 0.032)), [x1, y1] = sp(Math.cos(aa) * (RT + 0.032), Math.sin(aa) * (RT + 0.032));
        ctx.strokeStyle = '#7a5230';
        ctx.lineWidth = 3.5 * K;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      const [px, py] = sp(Math.cos(a) * (RT + 0.03), Math.sin(a) * (RT + 0.03));
      ctx.fillStyle = '#5a3a20';
      for (const d of [-6, 6]) ctx.fillRect(px + d * K - 1.2 * K, py, 2.4 * K, 6 * K);
    }
  }
  ctx.strokeStyle = '#8a5a35';
  ctx.lineWidth = 2.6 * K;
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2, [x0, y0] = sp(Math.cos(a) * (RT - 0.024), Math.sin(a) * (RT - 0.024)), [x1, y1] = sp(Math.cos(a) * (RT + 0.024), Math.sin(a) * (RT + 0.024));
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  for (const r of [RT - 0.013, RT + 0.013]) {
    ctx.strokeStyle = '#5d606b';
    ctx.lineWidth = 2.2 * K;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * w, r * w * SQ, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#d4d7e0';
    ctx.lineWidth = 0.8 * K;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.8 * K, r * w, r * w * SQ, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function night(ctx: CanvasRenderingContext2D, s: TrainState, lk: Look, dark: number, w: number, h: number) {
  const K = w / 380;
  ctx.fillStyle = `rgba(14,20,56,${dark * 0.62})`;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x: number, y: number, r: number, col: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (let i = 1; i < N; i++) {
    const L = s.lots[i], [gx, gy] = lotG(i);
    if (L.k === 'P') {
      const [x, y] = sp(gx, gy);
      glow(x, y - 28 * K, 0.075 * w, '255,205,110', 0.55 * dark);
      glow(x, y, 0.06 * w, '255,190,90', 0.3 * dark);
    }
    if (L.k === 'H' && lk.lit[i]) {
      const [x, y] = sp(gx, gy, 0.02);
      glow(x, y, 0.04 * w, '255,200,100', 0.45 * dark);
    }
    if (L.k === 'L') {
      const [x, y] = sp(gx, gy);
      const ly = y - 49 * K, a = s.t / 45;
      glow(x, ly, 0.05 * w, '255,235,150', 0.7 * dark);
      ctx.fillStyle = `rgba(255,240,170,${0.16 * dark})`;
      for (const d of [0, Math.PI]) {
        ctx.beginPath();
        ctx.moveTo(x, ly);
        ctx.lineTo(x + Math.cos(a + d - 0.12) * 0.4 * w, ly + Math.sin(a + d - 0.12) * 0.12 * w);
        ctx.lineTo(x + Math.cos(a + d + 0.12) * 0.4 * w, ly + Math.sin(a + d + 0.12) * 0.12 * w);
        ctx.fill();
      }
    }
  }
  const ul = s.u + 0.056, [hx, hy] = ringG(ul + 0.03), [px, py] = sp(hx, hy, 0.02);
  glow(px, py, 0.06 * w, '255,240,190', 0.5 * dark);
  const [sx, sy] = sp(0, -RL + 0.036, 0.02);
  glow(sx, sy, 0.07 * w, '255,210,120', 0.4 * dark);
  ctx.globalCompositeOperation = 'source-over';
}

function card(ctx: CanvasRenderingContext2D, x: number, y: number, lines: string[], K: number, bg: string, fg: string) {
  ctx.font = `900 ${15 * K}px system-ui, sans-serif`;
  const tw = Math.max(...lines.map((l, i) => (ctx.font = `${i ? 700 : 900} ${(i ? 12.5 : 15) * K}px system-ui, sans-serif`, ctx.measureText(l).width)));
  const bw = Math.min(W * 0.94, tw + 26 * K), bh = (lines.length * 19 + 10) * K;
  ctx.fillStyle = bg;
  ctx.shadowColor = 'rgba(0,0,0,.25)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 10 * K);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.font = `${i ? 700 : 900} ${(i ? 12.5 : 15) * K}px system-ui, sans-serif`;
    ctx.fillStyle = i && fg === '#4a3020' ? '#7a5a40' : fg;
    ctx.fillText(l, x, y - bh / 2 + (14 + i * 19) * K, W * 0.9);
  });
}

function hud(ctx: CanvasRenderingContext2D, s: TrainState, w: number, h: number, K: number, th: Theme) {
  // 위 띠: 판 · 바퀴 · 하트 / 마을 점수 막대와 별 눈금
  ctx.fillStyle = 'rgba(70,45,28,.86)';
  ctx.fillRect(0, 0, w, 0.125 * w);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(0, 0.122 * w, w, 0.003 * w);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${14 * K}px system-ui, sans-serif`;
  ctx.fillText(`🚂 ${s.stage + 1}판/8 · ${Math.min(s.lap + 1, s.cfg.laps)}/${s.cfg.laps}바퀴 · ★${s.stars}`, 10 * K, 0.035 * w);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.font = `900 ${15 * K}px system-ui, sans-serif`;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10 * K, 0.035 * w);
  const sc = s.town + s.paxPts, [g1, g2, g3] = s.cfg.goal, x0 = 0.25 * w, x1 = w - 12 * K, by = 0.088 * w, bh = 9 * K, X = (v: number) => x0 + (x1 - x0) * Math.min(1, v / g3);
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${13 * K}px system-ui, sans-serif`;
  ctx.fillText(`🏡 ${sc}/${g1}`, 10 * K, by);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(x0, by - bh / 2, x1 - x0, bh, bh / 2);
  ctx.fill();
  const bg = ctx.createLinearGradient(x0, 0, x1, 0);
  bg.addColorStop(0, '#7ee07e');
  bg.addColorStop(1, '#ffd23f');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x0, by - bh / 2, Math.max(bh, X(sc) - x0), bh, bh / 2);
  ctx.fill();
  ctx.font = `900 ${10 * K}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const [g, n] of [[g1, 1], [g2, 2], [g3, 3]] as const) {
    const gx = Math.min(X(g), x1 - 8 * K);
    ctx.fillStyle = sc >= g ? '#fff6c8' : 'rgba(255,255,255,.55)';
    ctx.fillRect(gx - 0.6, by - bh / 2 - 2, 1.2, bh + 4);
    ctx.fillText('★'.repeat(n), gx, by - bh / 2 - 6 * K);
  }
  // 아래 띠: 화물칸 (맨 앞이 지금 내릴 것) · 역에서 실을 다음 화물
  const y0 = h - 0.115 * w;
  ctx.fillStyle = 'rgba(70,45,28,.86)';
  ctx.fillRect(0, y0, w, h - y0);
  const cy = y0 + (h - y0) / 2, box = 0.085 * w;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,248,234,.75)';
  ctx.font = `800 ${11 * K}px system-ui, sans-serif`;
  ctx.fillText('화물', 9 * K, cy - 0.025 * w);
  ctx.fillText('맨 앞', 9 * K, cy + 0.02 * w);
  for (let i = 0; i < s.cfg.cap; i++) {
    const x = 0.13 * w + i * (box + 5 * K), c = s.wagons[i], big = i === 0;
    ctx.fillStyle = big ? '#f6cf86' : 'rgba(255,255,255,.14)';
    ctx.beginPath();
    ctx.roundRect(x, cy - box / 2, box, box, 8 * K);
    ctx.fill();
    if (big) (ctx.strokeStyle = '#ffffff'), (ctx.lineWidth = 2 * K), ctx.stroke();
    if (!c && big) (ctx.fillStyle = '#7a5a40'), (ctx.font = `800 ${10 * K}px system-ui, sans-serif`), (ctx.textAlign = 'center'), ctx.fillText('빈 칸', x + box / 2, cy + 1);
    if (c) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${(big ? 22 : 18) * K}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ICON[c], x + box / 2, cy + 1);
    }
  }
  const nx = 0.13 * w + s.cfg.cap * (box + 5 * K) + 6 * K;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,248,234,.75)';
  ctx.font = `800 ${11 * K}px system-ui, sans-serif`;
  ctx.fillText(s.lap + 1 < s.cfg.laps ? '역에서 ▸' : '마지막 바퀴', nx, cy - 0.025 * w);
  if (s.lap + 1 < s.cfg.laps) {
    ctx.font = `${15 * K}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.fillText(s.queue.slice(0, 4).map((k) => ICON[k]).join(''), nx, cy + 0.02 * w);
    ctx.globalAlpha = 1;
  }
}

/** 봇: 아무 때나 탭 (처음 하는 사람) */
export const trainRandom: Bot<TrainState> = { name: '아무 때나', act: (_s, rng) => ({ tap: rng() < 0.025, dir: 0 }) };

/** 내다보기 점수: 빈 터마다 '다음에 올 화물이 놓이면 얼마나 진화하나' */
function potential(lots: Lot[], up: Set<Kind>): number {
  let p = 0;
  for (let f = 1; f < N; f++) {
    const L = lots[f];
    if (L.k) continue;
    if (L.river) {
      if (up.has('B')) p += 3;
      continue;
    }
    let best = L.beach && up.has('L') ? 4 : 0;
    for (const X of ['T', 'H'] as const) {
      if (!up.has(X)) continue;
      let l = 0, r = 0;
      while (f - l - 1 >= 1 && lots[f - l - 1].k === X) l++;
      while (f + r + 1 < N && lots[f + r + 1].k === X) r++;
      const n = l + r + 1;
      let g = n === 2 ? 1.5 : 0;
      if (n >= 3) g = ((l < 3 ? l : 0) + (r < 3 ? r : 0) + 1) * 2 + (X === 'H' && ((f - l <= 1 && l < 3) || (f + r >= N - 1 && r < 3)) ? 10 : 0);
      if (g > best) best = g;
    }
    p += best;
  }
  return p;
}

/** 봇: 마을 설계사 — 역을 떠날 때 이번 바퀴에 실린 화물을 어느 터에 내릴지 모두 따져(다음 짐까지 내다봄) 계획하고, 그 터에 오면 탭 */
const plans = new WeakMap<TrainState, { key: string; tg: number[]; n: number }>();
function makePlan(s: TrainState): number[] {
  const cap = s.wagons.length, cur = curLot(s);
  let start = 1;
  if (cur === 0) start = s.u > 0.5 ? N : 1;
  else start = ((cur + 0.5) / N - s.u) * s.lapTicks >= 4 ? cur : cur + 1;
  const lastLap = s.lap >= s.cfg.laps - 1, lots = s.lots.map((l) => ({ ...l })), up = new Set<Kind>([...s.wagons, ...s.queue.slice(0, s.cfg.cap)]);
  const pend = s.pax.filter((p) => !p.done);
  let best = -Infinity, bestSeq: number[] = [];
  const seq: number[] = [];
  const value = (held: number) => {
    const lk = look(lots, s.cfg.night);
    let v = lk.score;
    for (const p of pend) if (met(lk, p.want)) v += 6;
    if (!lastLap) v += 0.35 * potential(lots, up) - 2 * held;
    return v;
  };
  const dfs = (wi: number, from: number) => {
    const v = value(cap - wi);
    if (v > best + 1e-9) (best = v), (bestSeq = [...seq]);
    if (wi >= cap) return;
    const c = s.wagons[wi];
    for (let j = from; j < N; j++) {
      const L = lots[j];
      if (L.k) {
        if (!(s.cfg.stack && L.k === c && (c === 'T' || c === 'H') && L.lv < 3)) continue;
        L.lv++;
        seq.push(j);
        dfs(wi + 1, j + 1);
        seq.pop();
        L.lv--;
        continue;
      }
      if (L.river && c !== 'B') continue;
      L.k = c;
      seq.push(j);
      dfs(wi + 1, j + 1);
      seq.pop();
      L.k = null;
    }
  };
  dfs(0, Math.max(1, start));
  return bestSeq;
}
export const trainSmart: Bot<TrainState> = {
  name: '마을 설계사',
  act(s) {
    const no = { tap: false, dir: 0 as const };
    if (s.pause || !s.wagons.length) return no;
    const key = `${s.stage}/${s.tries}/${s.lap}`, cur = curLot(s);
    let p = plans.get(s);
    const idx = p ? p.n - s.wagons.length : 0;
    if (!p || p.key !== key || idx < 0 || (p.tg[idx] !== undefined && (cur > p.tg[idx] || (cur === 0 && s.u > 0.5)))) {
      plans.set(s, (p = { key, tg: makePlan(s), n: s.wagons.length }));
      return { tap: p.tg[0] === cur && cur > 0, dir: 0 };
    }
    return { tap: cur > 0 && p.tg[idx] === cur, dir: 0 };
  },
};
