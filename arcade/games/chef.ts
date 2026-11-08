/**
 * 몬스터 요리사 (0036, 메뉴 8번 · 17라운드 다음 차례) — 주문 처리 × 합치기 × 도감 수집 · 원버튼.
 * 기준 9(조작 최소): 재료가 컨베이어를 타고 솥 위를 지나간다. 탭하면 지금 솥 위의 재료가 퐁당. 두 개가 들어가면 요리 완성.
 * 와우: 아무 재료 둘이나 넣어 보면 엉뚱한 새 요리가 '발견'된다(찌릿 수프·꽁꽁 젤리…). 손님 몬스터는 먹은 요리대로 반응한다
 *       (찌릿 → 머리가 쭈뼛, 불타는 → 불을 뿜음, 꽁꽁 → 얼어붙음). 요리 이름의 앞말은 넣은 재료 하나, 뒷말은 다른 재료 하나 —
 *       발견할수록 "'찌릿'은 번개구나" 하고 주문을 읽게 된다.
 * 첫 3초: 첫 손님은 '찌릿 수프'. 버섯·번개를 톡톡 넣으면 발견 + 손님 머리가 쭈뼛.
 * 목표·보상: 판마다 손님 N명에게 주문대로 — 놓친 손님 0이면 별 셋. 16라운드 이유(너무 어려움) → 1판은 손님이 아주 느긋, 3명 놓쳐도 그 판만 다시.
 * 하는 일이 바뀐다: 새 재료(2판 고추 · 4판 슬라임 · 6판 별 · 8판 꿀) · 급한 손님(3판) · 황금 재료(5판, 두 배) · 변덕 손님(7판, 주문이 바뀜).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, BELT_Y = 0.62, POT = { x: 0.5, y: 0.86 }, WIN = 0.075;
/** 재료: 그림 · 이름 · 요리 앞말(형용사) · 요리 뒷말(이름) · 반응 색 */
export const ING = [
  { e: '🍄', name: '버섯', adj: '쫄깃', noun: '수프', col: '#ff8a65' },
  { e: '⚡', name: '번개', adj: '찌릿', noun: '볶음', col: '#ffe14d' },
  { e: '❄️', name: '얼음', adj: '꽁꽁', noun: '빙수', col: '#8fe3ff' },
  { e: '🌶️', name: '고추', adj: '불타는', noun: '탕', col: '#ff4d4d' },
  { e: '🫧', name: '슬라임', adj: '말랑', noun: '젤리', col: '#7dff8a' },
  { e: '⭐', name: '별', adj: '반짝', noun: '사탕', col: '#ffd23f' },
  { e: '🍯', name: '꿀', adj: '달콤', noun: '케이크', col: '#ffb347' },
];
/** 요리 = 재료 둘 (순서 무관). 이름은 '뒤 번호 재료의 앞말 + 앞 번호 재료의 뒷말' */
export const dishKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
export const dishName = (a: number, b: number) => {
  const [i, j] = a < b ? [a, b] : [b, a];
  return i === j ? `진한 ${ING[i].noun}` : `${ING[j].adj} ${ING[i].noun}`;
};
type Kind = 'normal' | 'rush' | 'fickle';
interface Guest { a: number; b: number; kind: Kind; pat: number; max: number; hue: number; mood: number; react: number; changed: boolean }
interface Item { ing: number; x: number; gold: boolean; drop: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }
export interface ChefState {
  rng: Rng; t: number; stage: number; ings: number; belt: Item[]; spawn: number; speed: number; pot: { ing: number; gold: boolean }[]; cook: number;
  guests: Guest[]; served: number; need: number; miss: number; book: Set<string>; hearts: number; stars: number; pay: number; pause: number; cleared: boolean;
  seen: Set<string>; events: Ev[]; dead: boolean; lastDish: { a: number; b: number; t: number } | null;
}

const ev = (s: ChefState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
function see(s: ChefState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, A * 0.52, text);
}

function newGuest(s: ChefState, first = false): Guest {
  const k = s.stage, r = s.rng, n = s.ings;
  let a = Math.floor(r() * n), b = Math.floor(r() * n);
  if (first) (a = 0), (b = 1);
  // 새 재료가 나온 판엔 그 재료가 든 주문을 자주
  if (!first && n > 3 && r() < 0.4) a = n - 1;
  const kind: Kind = k >= 6 && r() < 0.3 ? 'fickle' : k >= 2 && r() < 0.35 ? 'rush' : 'normal';
  const base = k === 0 ? 1500 : Math.max(240, 1000 - 130 * k), max = Math.round(base * (kind === 'rush' ? 0.6 : 1));
  if (kind === 'rush') see(s, 'rush', '급한 손님 — 빨리 주면 두 배!');
  if (kind === 'fickle') see(s, 'fickle', '변덕 손님 — 주문이 한 번 바뀌어요');
  return { a, b, kind, pat: max, max, hue: Math.floor(r() * 360), mood: 0, react: 0, changed: false };
}

function newStage(s: ChefState) {
  const k = s.stage;
  s.ings = Math.min(ING.length, 3 + Math.floor((k + 1) / 2));
  s.speed = 0.0042 + 0.0007 * k;
  s.need = 3 + Math.min(k, 3);
  s.served = 0;
  s.miss = 0;
  s.pot = [];
  s.cook = 0;
  s.belt = [];
  s.spawn = 0;
  s.cleared = false;
  s.guests = [newGuest(s, k === 0), newGuest(s), newGuest(s)];
  for (let x = 0.95; x > -0.05; x -= 0.19) s.belt.push(item(s, x));
  if (s.ings > 3) see(s, `ing${s.ings - 1}`, `새 재료: ${ING[s.ings - 1].e} ${ING[s.ings - 1].name}`);
  if (k >= 4) see(s, 'gold', '황금 재료 — 그 요리는 두 배!');
  ev(s, 'stage', 0.5, A * 0.45, `${k + 1}판 — 손님 ${s.need}명`);
}

/** 컨베이어에 올릴 재료: 절반은 맨 앞 손님 주문에 필요한 것 (기다리기만 하면 오게) */
function item(s: ChefState, x: number): Item {
  const g = s.guests[0], r = s.rng();
  const ing = g && r < Math.max(0.16, 0.5 - 0.06 * s.stage) ? (s.rng() < 0.5 ? g.a : g.b) : Math.floor(s.rng() * s.ings);
  return { ing, x, gold: s.stage >= 4 && s.rng() < 0.08, drop: 0 };
}

function serve(s: ChefState) {
  const [p, q] = s.pot, g = s.guests[0], key = dishKey(p.ing, q.ing), name = dishName(p.ing, q.ing), gold = p.gold || q.gold;
  s.pot = [];
  s.lastDish = { a: p.ing, b: q.ing, t: s.t };
  if (!s.book.has(key)) {
    s.book.add(key);
    ev(s, 'discover', POT.x, POT.y - 0.12, `새 요리 발견! ${name}`, ING[Math.max(p.ing, q.ing)].col);
    see(s, 'discover', '아무 재료 둘이나 — 새 요리가 도감에 쌓여요');
    s.pay += 3;
  }
  if (!g) return;
  g.react = 60;
  if (dishKey(g.a, g.b) === key) {
    const mul = (gold ? 2 : 1) * (g.kind === 'rush' ? 2 : 1);
    s.pay += 10 * mul;
    s.served++;
    g.mood = 1;
    ev(s, 'happy', 0.5, 0.3, `냠! ${name}${mul > 1 ? ` ×${mul}` : ''}`, ING[Math.max(p.ing, q.ing)].col);
    if (s.served >= s.need && !s.cleared) {
      s.cleared = true;
      const st = s.miss === 0 ? 3 : s.miss === 1 ? 2 : 1;
      s.stars += st;
      ev(s, 'clear', 0.5, A * 0.4, `${s.stage + 1}판 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
      s.pause = 100;
    }
  } else {
    g.mood = -1;
    g.pat -= g.max * 0.2;
    ev(s, 'wrong', 0.5, 0.3, '이게 아닌데…', '#ff8fa3');
  }
}

export const chef: GameDef<ChefState> = {
  id: 'chef',
  name: '몬스터 요리사',
  genes: ['order', 'merge', 'onebutton'],
  twist: '탭 하나로 지나가는 재료를 솥에 넣는다 — 아무 둘이나 섞으면 엉뚱한 새 요리가 발견되고, 요리 이름이 곧 재료의 암호라 발견할수록 주문을 읽게 된다',
  rules: ['재료가 솥 위를 지날 때 탭하면 퐁당 (스페이스도 돼요). 두 개 넣으면 요리 완성!', '맨 앞 몬스터 손님이 주문한 요리를 주면 냠! 처음 만든 요리는 도감에 쌓여요.', '판마다 손님 N명을 대접하면 통과 — 한 명도 안 놓치면 별 셋.'],
  controls: 'tap',
  hint: '탭 = 솥 위 재료 넣기 / 스페이스',
  aspect: A,
  art: {
    concept: '한밤의 몬스터 식당',
    mood: '보랏빛 부엌의 커다란 솥이 부글부글 빛나고, 알록달록한 몬스터 손님들이 줄을 선다. 요리를 먹으면 찌릿·활활·꽁꽁 저마다 엉뚱하게 반응한다.',
    palette: { bg: '#24123a', ink: '#fff6ff', muted: '#7d5aa6', accent: '#7dff8a', hot: '#ff5c8a', soft: '#3a1f5c' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, stage: 0, ings: 3, belt: [], spawn: 0, speed: 0, pot: [], cook: 0, guests: [], served: 0, need: 3, miss: 0, book: new Set<string>(), hearts: 3, stars: 0, pay: 0, pause: 0, cleared: false, seen: new Set<string>(), events: [], dead: false, lastDish: null } as unknown as ChefState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 100);
    if (s.pause > 0) {
      if (--s.pause === 0) s.cleared ? (s.stage++, newStage(s)) : newStage(s);
      return;
    }
    // 컨베이어
    for (const it of s.belt) if (!it.drop) it.x += s.speed;
    s.belt = s.belt.filter((it) => it.x < 1.08 && !(it.drop && s.t - it.drop > 14));
    const lead = Math.min(...s.belt.filter((it) => !it.drop).map((it) => it.x), 1);
    if (lead > 0.13 + (s.rng() < 0.5 ? 0.04 : 0)) s.belt.push(item(s, lead - 0.19));
    // 탭: 솥 위 재료를 넣는다
    if (inp.tap && s.pot.length < 2 && !s.cook) {
      const it = s.belt.filter((x) => !x.drop && Math.abs(x.x - POT.x) < WIN).sort((a, b) => Math.abs(a.x - POT.x) - Math.abs(b.x - POT.x))[0];
      if (it) {
        it.drop = s.t;
        s.pot.push({ ing: it.ing, gold: it.gold });
        ev(s, 'plop', POT.x, POT.y, ING[it.ing].e, ING[it.ing].col);
        if (s.pot.length === 2) s.cook = 24;
      } else ev(s, 'miss', POT.x, BELT_Y, '휙', '#ffffff');
    }
    if (s.cook > 0 && --s.cook === 0) serve(s);
    // 손님: 참을성이 줄고, 다 떨어지면 화내며 떠난다. 대접받으면 다음 손님
    // 줄 선 손님도 반 속도로 기다림에 지친다 (판이 갈수록 줄이 길어지면 바빠진다)
    for (const o of s.guests.slice(1)) if (s.stage >= 1 && o.pat > o.max * 0.25) o.pat -= 0.5;
    const g = s.guests[0];
    if (g) {
      if (g.react > 0) g.react--;
      if (g.mood === 1 && g.react === 0) s.guests.shift(), s.guests.push(newGuest(s));
      else if (g.mood !== 1) {
        g.pat--;
        if (g.kind === 'fickle' && !g.changed && g.pat < g.max / 2) {
          g.changed = true;
          g.a = Math.floor(s.rng() * s.ings);
          ev(s, 'fickle', 0.5, 0.3, '아 잠깐, 바꿀래!', '#ffd23f');
        }
        if (g.pat <= 0) {
          s.miss++;
          ev(s, 'leave', 0.5, 0.3, '흥! 놓친 손님', '#ff5c8a');
          s.guests.shift();
          s.guests.push(newGuest(s));
          if (s.miss >= 3) {
            s.hearts--;
            ev(s, 'fail', 0.5, A * 0.45, '손님 셋을 놓쳤어요! 하트 -1 · 다시');
            if (s.hearts <= 0) s.dead = true;
            else s.pause = 100;
          }
        }
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pay + s.stars * 5 + s.stage * 10,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    ctx.save();
    fx.begin(ctx);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#3a1f5c');
    bg.addColorStop(1, th.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    // 벽 타일 + 매달린 등
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    for (let y = 0; y < Y(0.5); y += 22) for (let x = (y / 22) % 2 ? 0 : 11; x < w; x += 22) ctx.fillRect(x, y, 20, 20);
    for (const lx of [0.15, 0.85]) {
      const lg = ctx.createRadialGradient(X(lx), Y(0.08), 0, X(lx), Y(0.08), R(0.35));
      lg.addColorStop(0, 'rgba(255,200,120,.35)');
      lg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, Y(0.5));
      ctx.fillStyle = '#ffd38a';
      ctx.beginPath();
      ctx.arc(X(lx), Y(0.08), R(0.018), 0, Math.PI * 2);
      ctx.fill();
    }
    // 손님 줄 (맨 앞이 크게)
    s.guests.forEach((g, i) => {
      const x = X(i === 0 ? 0.5 : 0.2 + 0.6 * (i - 1)), y = Y(i === 0 ? 0.3 : 0.2), r = R(i === 0 ? 0.11 : 0.06), bob = Math.sin(s.t / 12 + i) * 3;
      const col = `hsl(${g.hue},70%,${g.mood === -1 ? 40 : 58}%)`;
      const dish = s.lastDish && i === 0 && g.react > 0 ? s.lastDish : null, adj = dish ? Math.max(dish.a, dish.b) : -1;
      ctx.save();
      ctx.translate(x, y + bob);
      if (adj === 2) ctx.filter = 'hue-rotate(180deg)';
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = i === 0 ? 18 : 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.95 * (adj === 4 ? 1 + 0.15 * Math.sin(s.t) : 1), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.filter = 'none';
      // 뿔·더듬이
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 0.12;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * r * 0.4, -r * 0.8);
        ctx.lineTo(sx * r * (adj === 1 ? 0.9 : 0.6), -r * (adj === 1 ? 1.6 : 1.25));
        ctx.stroke();
      }
      if (adj === 1) for (let k = 0; k < 6; k++) (ctx.strokeStyle = '#ffe14d'), ctx.beginPath(), ctx.moveTo((k - 2.5) * r * 0.3, -r * 0.95), ctx.lineTo((k - 2.5) * r * 0.36, -r * 1.45), ctx.stroke();
      // 눈·입
      ctx.fillStyle = '#fff';
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * r * 0.35, -r * 0.15, r * 0.22, 0, Math.PI * 2), ctx.fill());
      ctx.fillStyle = '#1a0f2a';
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * r * 0.35 + (i === 0 ? 0 : 2), -r * 0.12, r * 0.1, 0, Math.PI * 2), ctx.fill());
      ctx.strokeStyle = '#1a0f2a';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      if (g.mood === 1) ctx.arc(0, r * 0.25, r * 0.3, 0.15, Math.PI - 0.15);
      else if (g.mood === -1 || g.pat < g.max * 0.3) ctx.arc(0, r * 0.55, r * 0.25, Math.PI + 0.3, -0.3);
      else (ctx.moveTo(-r * 0.2, r * 0.35), ctx.lineTo(r * 0.2, r * 0.35));
      ctx.stroke();
      if (adj === 3) for (let k = 0; k < 5; k++) (ctx.fillStyle = k % 2 ? '#ff4d4d' : '#ffb347'), ctx.beginPath(), ctx.arc((k - 2) * r * 0.12 + Math.sin(s.t / 3 + k) * 3, r * 0.6 + k * r * 0.12, r * 0.12, 0, Math.PI * 2), ctx.fill();
      if (adj === 5 || adj === 6) for (let k = 0; k < 4; k++) (ctx.fillStyle = adj === 5 ? '#ffd23f' : '#ff8fb1'), ctx.font = `${r * 0.4}px system-ui`, ctx.fillText(adj === 5 ? '✦' : '♥', Math.cos(s.t / 10 + k * 1.6) * r * 1.3, Math.sin(s.t / 10 + k * 1.6) * r * 1.1);
      ctx.restore();
      if (i === 0) {
        // 주문 말풍선 + 참을성
        const bx = X(0.5), by = Y(0.12);
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.beginPath();
        ctx.roundRect(bx - R(0.3), by - R(0.06), R(0.6), R(0.1), R(0.03));
        ctx.fill();
        ctx.fillStyle = '#2a1640';
        ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const known = s.book.has(dishKey(g.a, g.b));
        ctx.fillText(`${dishName(g.a, g.b)} ${known ? ING[g.a].e + ING[g.b].e : '❓'}${g.kind === 'rush' ? ' ⏱' : g.kind === 'fickle' ? ' 🌀' : ''}`, bx, by - R(0.01));
        ctx.fillStyle = 'rgba(0,0,0,.15)';
        ctx.fillRect(bx - R(0.26), by + R(0.022), R(0.52), R(0.012));
        ctx.fillStyle = g.pat / g.max < 0.3 ? th.hot : th.accent;
        ctx.fillRect(bx - R(0.26), by + R(0.022), R(0.52) * Math.max(0, g.pat / g.max), R(0.012));
      }
    });
    // 컨베이어
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, Y(BELT_Y) - R(0.04), w, R(0.11));
    ctx.fillStyle = '#3b3b4f';
    ctx.fillRect(0, Y(BELT_Y) - R(0.05), w, R(0.1));
    ctx.fillStyle = '#5a5a74';
    ctx.fillRect(0, Y(BELT_Y) - R(0.05), w, 3);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let x = -((s.t * s.speed * w) % 18); x < w; x += 18) ctx.fillRect(x, Y(BELT_Y) - R(0.05), 3, R(0.1));
    ctx.strokeStyle = 'rgba(125,255,138,.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(X(POT.x - WIN), Y(BELT_Y) - R(0.06), R(WIN * 2), R(0.12));
    ctx.setLineDash([]);
    for (const it of s.belt) {
      const fall = it.drop ? Math.min(1, (s.t - it.drop) / 14) : 0, x = X(it.drop ? it.x + (POT.x - it.x) * fall : it.x), y = Y(BELT_Y + (POT.y - 0.05 - BELT_Y) * fall * fall);
      const near = !it.drop && Math.abs(it.x - POT.x) < WIN;
      if (it.gold || near) (ctx.shadowColor = it.gold ? '#ffd23f' : '#7dff8a'), (ctx.shadowBlur = 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${R(near ? 0.095 : 0.075)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ING[it.ing].e, x, y);
      ctx.shadowBlur = 0;
      if (it.gold) (ctx.strokeStyle = '#ffd23f'), (ctx.lineWidth = 2), ctx.beginPath(), ctx.arc(x, y, R(0.05), 0, Math.PI * 2), ctx.stroke();
    }
    // 솥: 넣은 재료 색으로 부글부글
    const px = X(POT.x), py = Y(POT.y), pr = R(0.17), mix = s.pot.length ? ING[s.pot[s.pot.length - 1].ing].col : '#7d5aa6';
    const fire = ctx.createRadialGradient(px, py + pr * 0.9, 0, px, py + pr * 0.9, pr * 1.3);
    fire.addColorStop(0, 'rgba(255,140,60,.6)');
    fire.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = fire;
    ctx.fillRect(px - pr * 1.5, py, pr * 3, pr * 2);
    ctx.fillStyle = '#1b1b22';
    ctx.beginPath();
    ctx.ellipse(px, py + pr * 0.25, pr, pr * 0.8, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = mix;
    ctx.shadowColor = mix;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.ellipse(px, py, pr, pr * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (let k = 0; k < 6; k++) {
      const bx = px + Math.sin(k * 2.1 + s.t / 20) * pr * 0.7, by = py - ((s.t * (0.6 + (s.cook ? 1.5 : 0)) + k * 13) % 30), br = 3 + (k % 3);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3a3a48';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(px, py, pr, pr * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${R(0.05)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    s.pot.forEach((p, i) => ctx.fillText(ING[p.ing].e, px + (i ? 1 : -1) * R(0.06), py - R(0.005)));
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      const x = X(e.x), y = Y(e.y);
      if (e.kind === 'plop') fx.burst(px, py, e.col!, 14, 3, 3), fx.ring(px, py, e.col!, pr * 1.2, 4), fx.kick(2);
      if (e.kind === 'miss') fx.pop(x, y - 20, e.text!, '#ffffff', 14);
      if (e.kind === 'discover') fx.burst(x, y, e.col!, 50, 6, 3.5), fx.ring(x, y, e.col!, R(0.4), 7), fx.blink(e.col!, 0.25), fx.kick(8), fx.pop(w / 2, Y(0.73), e.text!, '#ffffff', 22);
      if (e.kind === 'happy') fx.burst(x, y, e.col!, 30, 5, 3), fx.pop(x, y + R(0.16), e.text!, e.col!, 18);
      if (e.kind === 'wrong') fx.pop(x, y + R(0.16), e.text!, e.col!, 16), fx.kick(4);
      if (e.kind === 'fickle') fx.pop(x, y + R(0.16), e.text!, e.col!, 16);
      if (e.kind === 'leave') fx.pop(x, y + R(0.16), e.text!, e.col!, 18), fx.blink(th.hot, 0.2), fx.kick(6);
      if (e.kind === 'clear') fx.pop(w / 2, h * 0.42, e.text!, '#ffffff', 24), fx.burst(w / 2, h * 0.42, '#ffd23f', 50, 6, 3), fx.blink('#fff6c8', 0.25);
      if (e.kind === 'fail') fx.pop(w / 2, h * 0.45, e.text!, th.hot, 18), fx.kick(10);
      if (e.kind === 'stage') fx.pop(w / 2, h * 0.4, e.text!, '#ffffff', 20);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.56, e.text!, th.accent, 16);
    }
    fx.memo.t = s.t;
    ctx.restore();
    ctx.fillStyle = 'rgba(20,8,36,.65)';
    ctx.fillRect(0, h - R(0.09), w, R(0.09));
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    ctx.fillText(`${s.stage + 1}판 · 손님 ${s.served}/${s.need} · 📖 ${s.book.size} · ★ ${s.stars} · 놓침 ${s.miss}/3`, 10, h - R(0.045));
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), w - 10, h - R(0.045));
    if (s.stage === 0 && s.book.size === 0 && s.t > 30) (ctx.textAlign = 'center'), (ctx.fillStyle = '#ffffff'), (ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`), ctx.fillText('👆 재료가 초록 칸에 오면 탭!', w / 2, Y(0.5));
  },
};

/** 봇: 아무 때나 탭 */
export const chefRandom: Bot<ChefState> = { name: '아무 때나', act: (_s, rng) => ({ tap: rng() < 0.03, dir: 0 }) };

/** 봇: 레시피를 다 안다 — 맨 앞 손님 주문의 두 재료 중 아직 안 넣은 것이 초록 칸 한가운데 올 때 탭(황금이면 더 반갑게) */
export const chefSmart: Bot<ChefState> = {
  name: '요리 장인',
  act(s) {
    const g = s.guests[0];
    if (!g || s.pause || s.cook || g.mood === 1) return { tap: false, dir: 0 };
    const want = [g.a, g.b];
    for (const p of s.pot) {
      const i = want.indexOf(p.ing);
      if (i >= 0) want.splice(i, 1);
    }
    const it = s.belt.find((x) => !x.drop && Math.abs(x.x - POT.x) < WIN * 0.6);
    return { tap: !!it && want.includes(it.ing), dir: 0 };
  },
};
