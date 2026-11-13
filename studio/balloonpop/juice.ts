/**
 * 공용 연출(손맛) 모듈 — 0022 오너 피드백 "보기에 밋밋했어".
 * 화면 연출만 담당하고 시뮬레이션 상태는 건드리지 않는다(결정성·봇 측정에 영향 없음).
 * 게임의 draw()에서 `const fx = juice(s)`로 꺼내 쓰고, 사건이 생긴 순간 burst/pop/kick/ring을 부른다.
 * **render는 게임이 부르지 않는다** — 플레이어(`play.ts`)가 draw 직후 `peek(s)?.render()`로 그린다.
 * (0026에서 발견: 0023~0024 게임 셋이 render 호출을 빠뜨려 파티클·글자·번쩍이 한 번도 안 보였다. 그래서 한 곳에서 그린다.)
 * 상태 객체마다 하나씩 WeakMap에 붙어서, 새 판이 시작되면 자동으로 새로 생긴다.
 */
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Popup { x: number; y: number; text: string; color: string; life: number; size: number }

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

  /** 떠오르는 글자 (+1, 연쇄!, 건설!) */
  pop(x: number, y: number, text: string, color = '#ffffff', size = 16) {
    this.popups.push({ x, y, text, color, life: 50, size });
    if (this.popups.length > 30) this.popups.shift();
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
  render(ctx: CanvasRenderingContext2D, w: number, h: number, y0 = 0) {
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
      t.y -= 0.7;
      ctx.globalAlpha = Math.min(1, t.life / 20);
      ctx.font = `800 ${t.size}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    this.popups = this.popups.filter((t) => t.life > 0);
    if (this.flash > 0.01) {
      ctx.globalAlpha = this.flash;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, y0, w, h);
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
