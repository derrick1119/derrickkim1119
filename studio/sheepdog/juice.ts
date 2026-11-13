/**
 * 공용 연출(손맛) 모듈 — 0022 오너 피드백 "보기에 밋밋했어".
 * 화면 연출만 담당하고 시뮬레이션 상태는 건드리지 않는다(결정성·봇 측정에 영향 없음).
 * 게임의 draw()에서 `const fx = juice(s)`로 꺼내 쓰고, 사건이 생긴 순간 burst/pop/kick/ring을 부른다.
 * **render는 게임이 부르지 않는다** — 플레이어(`play.ts`)가 draw 직후 `peek(s)?.render()`로 그린다.
 * (0026에서 발견: 0023~0024 게임 셋이 render 호출을 빠뜨려 파티클·글자·번쩍이 한 번도 안 보였다. 그래서 한 곳에서 그린다.)
 * 상태 객체마다 하나씩 WeakMap에 붙어서, 새 판이 시작되면 자동으로 새로 생긴다.
 */
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
import { drawIcon, type IconKind } from './art.ts';
/**
 * 팝 글자 4그룹 (🎨 C010): A 소리(크림 글씨 + 잉크 외곽, 오름) · B 보상(금 알약 + 아이콘, 고정) · C 경고(말풍선, 대상 따라감) · D 안내(잉크 알약, 고정)
 */
export type PopGroup = 'A' | 'B' | 'C' | 'D';
export interface PopOpt { g?: PopGroup; icon?: IconKind; id?: string; who?: number; rot?: number; bg?: string; life?: number }
interface Popup extends PopOpt { x: number; y: number; text: string; color: string; life: number; max: number; size: number; age: number }
const CAP: Record<PopGroup, number> = { A: 1, B: 2, C: 2, D: 1 }, LOW: PopGroup[] = ['D', 'A', 'B', 'C'], LIFE: Record<PopGroup, number> = { A: 36, B: 54, C: 72, D: 60 };
const FONT = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const boxOf = (p: { x: number; y: number; text: string; size: number; icon?: IconKind }) => {
  const w = p.text.length * p.size * 0.95 + (p.icon ? p.size + 6 : 0) + 20, h = p.size + 12;
  return { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - h / 2, y1: p.y + h / 2, h };
};

export class Juice {
  particles: Particle[] = [];
  popups: Popup[] = [];
  rings: { x: number; y: number; color: string; r: number; max: number; width: number; life: number }[] = [];
  shake = 0;
  flash = 0;
  flashColor = '#ffffff';
  /** 게임이 직전 프레임 값을 기억해 두는 곳 (예: 지난번 처치 수 → 늘었으면 터뜨리기) */
  memo: Record<string, number> = {};
  private seed = 1;

  private rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  /** 지난 값보다 늘었으면 늘어난 만큼을 돌려주고 기억을 갱신한다 */
  delta(key: string, now: number): number {
    const prev = this.memo[key];
    this.memo[key] = now;
    return prev === undefined ? 0 : now - prev;
  }

  /** 파티클 터뜨리기 (화면 좌표 px) */
  burst(x: number, y: number, color: string, n = 12, speed = 3, size = 3) {
    for (let k = 0; k < n; k++) {
      const a = this.rand() * Math.PI * 2, v = speed * (0.4 + this.rand());
      const life = 22 + this.rand() * 18;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color, size: size * (0.6 + this.rand() * 0.8) });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  /** 팝 글자 (🎨 C010 그룹 규칙: 같은 id면 고쳐 쓰고, 그룹별 A1·B2·C2·D1·모두 3개까지, 겹치면 뒤에 온 것을 (높이+4)px씩 최대 2번 올리고 그래도 겹치면 안 띄움. C는 안 움직임) */
  pop(x: number, y: number, text: string, color = '#fff6e4', size = 15, o: PopOpt = {}) {
    const g = o.g ?? 'A', same = o.id ? this.popups.find((p) => p.id === o.id) : undefined;
    if (same) return void Object.assign(same, { x, y, text, icon: o.icon, life: same.max, age: Math.min(same.age, 3) });
    const p: Popup = { ...o, g, x, y, text, color, size, life: o.life ?? LIFE[g], max: o.life ?? LIFE[g], age: 0 };
    if (g !== 'C')
      for (let k = 0; ; k++) {
        const b = boxOf(p), hit = this.popups.some((q) => { const c = boxOf(q); return c.x0 < b.x1 && b.x0 < c.x1 && c.y0 < b.y1 && b.y0 < c.y1; });
        if (!hit) break;
        if (k === 2) return;
        p.y -= b.h + 4;
      }
    // 늦게 온 C(말풍선)는 안 움직이니, 겹친 A를 C 위 4px로 올린다 (🎨 C010: 1-4 ?!이 멍!을 덮음)
    if (g === 'C') {
      const b = boxOf(p);
      for (const q of this.popups) if (q.g === 'A') { const c = boxOf(q); if (c.x0 < b.x1 && b.x0 < c.x1 && c.y0 < b.y1 && b.y0 < c.y1) q.y = b.y0 - 4 - c.h / 2; }
    }
    this.popups.push(p);
    const n = (gg: PopGroup) => this.popups.filter((q) => q.g === gg).length;
    while (n(g) > CAP[g]) this.popups.splice(this.popups.findIndex((q) => q.g === g), 1);
    while (this.popups.length > 3) {
      const low = LOW.find((gg) => n(gg) > (gg === g ? 1 : 0));
      if (!low) break;
      this.popups.splice(this.popups.findIndex((q) => q.g === low), 1);
    }
  }

  /** 퍼져 나가는 충격파 고리 (0026) */
  ring(x: number, y: number, color: string, max = 60, width = 4) {
    this.rings.push({ x, y, color, r: 4, max, width, life: 24 });
    if (this.rings.length > 20) this.rings.shift();
  }

  /** 화면 흔들림 */
  kick(amount: number) {
    this.shake = Math.max(this.shake, amount);
  }

  /** 화면 번쩍 */
  blink(color = '#ffffff', amount = 0.35) {
    this.flash = Math.max(this.flash, amount);
    this.flashColor = color;
  }

  /** 그리기 전에 부른다: 흔들림 오프셋을 적용한다 (ctx.save가 되어 있어야 함) */
  begin(ctx: CanvasRenderingContext2D) {
    if (this.shake > 0.3) ctx.translate((this.rand() - 0.5) * this.shake * 2, (this.rand() - 0.5) * this.shake * 2);
    this.shake *= 0.86;
  }

  /** 다 그린 뒤 부른다: 파티클·글자·번쩍을 덧그린다 */
  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    for (const r of this.rings) {
      r.life--;
      r.r += (r.max - r.r) * 0.18;
      ctx.globalAlpha = Math.max(0, r.life / 24);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (r.life / 24) + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 0.05;
      p.life--;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * (p.life / p.max)), 0, Math.PI * 2);
      ctx.fill();
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.popups) {
      t.life--;
      t.age++;
      if (t.g === 'A') t.y -= 0.4;
      // 0.6 → 1.15 → 1 (120ms = 7틱)에 커지고, 마지막 200ms(12틱)에 흐려진다
      const u = Math.min(1, t.age / 7), sc = u < 0.6 ? 0.6 + 0.55 * (u / 0.6) : 1.15 - 0.15 * ((u - 0.6) / 0.4);
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / 12));
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(sc, sc);
      if (t.rot) ctx.rotate(t.rot);
      ctx.font = `${t.g === 'D' ? 800 : 900} ${t.size}px ${FONT}`;
      const tw = ctx.measureText(t.text).width, iz = t.icon ? t.size + 1 : 0, gap = t.icon && t.text ? 5 : 0, w = tw + iz + gap, h = t.g === 'B' ? 26 : t.size + 13;
      if (t.g === 'A') {
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#3b2a1e';
        if (t.text) ctx.strokeText(t.text, iz ? (iz + gap) / 2 : 0, 0);
      } else {
        ctx.beginPath();
        ctx.roundRect(-w / 2 - 10, -h / 2, w + 20, h, t.g === 'C' ? 10 : h / 2);
        if (t.g === 'C') (ctx.moveTo(-5, h / 2), ctx.lineTo(0, h / 2 + 6), ctx.lineTo(5, h / 2));
        ctx.fillStyle = t.g === 'B' ? '#ffc857' : t.g === 'C' ? t.bg ?? '#fff6e4' : t.bg ?? 'rgba(59,42,30,.9)';
        ctx.fill();
        if (t.g !== 'D') (ctx.lineWidth = 2), (ctx.strokeStyle = '#7a3e1d'), ctx.stroke();
      }
      if (t.icon) drawIcon(ctx, t.icon, -w / 2 + iz / 2, 0, iz);
      ctx.fillStyle = t.g === 'A' || t.g === 'D' ? '#fff6e4' : '#3b2a1e';
      if (t.text) ctx.fillText(t.text, -w / 2 + iz + gap + tw / 2, 1);
      ctx.restore();
    }
    this.popups = this.popups.filter((t) => t.life > 0);
    if (this.flash > 0.01) {
      ctx.globalAlpha = this.flash;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      this.flash *= 0.82;
    }
    ctx.globalAlpha = 1;
  }
}

const store = new WeakMap<object, Juice>();
/** 이미 만들어진 연출만 꺼내기 (없으면 undefined) — 플레이어가 draw 뒤에 render할 때 쓴다 */
export const peek = (s: object): Juice | undefined => store.get(s);

/** 이 판(상태 객체)의 연출 꺼내기 */
export const juice = (s: object): Juice => {
  let j = store.get(s);
  if (!j) store.set(s, (j = new Juice()));
  return j;
};

/** 은은하게 흐르는 배경 별/먼지 (움직이는 배경 기본형) */
export function drift(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, n = 50, speed = 0.15) {
  ctx.fillStyle = color;
  for (let k = 0; k < n; k++) {
    const x = (((k * 7919) % 997) / 997) * w;
    const y = ((((k * 104729) % 991) / 991) * h + t * speed * (0.5 + (k % 3) * 0.4)) % h;
    ctx.globalAlpha = 0.2 + 0.4 * Math.abs(Math.sin(t / 50 + k));
    ctx.fillRect(x, y, k % 6 ? 1.5 : 2.5, k % 6 ? 1.5 : 2.5);
  }
  ctx.globalAlpha = 1;
}
