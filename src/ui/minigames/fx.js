// 미니게임 캔버스 효과: 튀어 오르는 글자, 불똥, 화면 흔들림, 번쩍임.
// 움직임 줄이기 설정이면 흔들림은 끄고 번쩍임과 불똥은 약하게 한다.
import { FONT_DISPLAY, TAU, easeBack, clamp } from '../../render/draw.js';

export class Fx {
  /** @param {boolean} reduced 움직임 줄이기 */
  constructor(reduced) {
    this.reduced = reduced;
    this.pops = [];
    this.parts = [];
    this.shakeT = 0;
    this.shakeA = 0;
    this.flashA = 0;
    this.flashColor = '#ffffff';
  }

  /** 글자 하나를 튀어 오르게 한다. */
  pop(text, x, y, { color = '#ffffff', size = 26, life = 0.9, rise = 46 } = {}) {
    if (this.pops.length > 12) this.pops.shift();
    this.pops.push({ text, x, y, color, size, life, age: 0, rise: this.reduced ? rise * 0.4 : rise });
  }

  /** 불똥을 흩뿌린다. */
  burst(x, y, color, n = 12, { speed = 160, size = 4, gravity = 220, life = 0.7, star = false } = {}) {
    const count = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.35 + Math.random() * 0.65);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: gravity,
        size: size * (0.6 + Math.random() * 0.7),
        color,
        life: life * (0.7 + Math.random() * 0.5),
        age: 0,
        star,
      });
    }
    if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
  }

  /** 불꽃놀이처럼 고리 모양으로 퍼지는 불똥. */
  ring(x, y, color, n = 30, speed = 160, life = 1) {
    const count = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.1;
      for (const k of [1, 0.62]) {
        const v = speed * k * (0.92 + Math.random() * 0.16);
        this.parts.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          g: 60,
          size: k === 1 ? 4.2 : 3,
          color: k === 1 ? color : '#ffffff',
          life: life * (0.85 + Math.random() * 0.3),
          age: 0,
          star: false,
        });
      }
    }
    if (this.parts.length > 320) this.parts.splice(0, this.parts.length - 320);
  }

  shake(amount = 8, time = 0.25) {
    if (this.reduced) return;
    this.shakeA = Math.max(this.shakeA, amount);
    this.shakeT = Math.max(this.shakeT, time);
  }

  flash(alpha = 0.6, color = '#ffffff') {
    this.flashA = Math.max(this.flashA, this.reduced ? Math.min(alpha, 0.22) : alpha);
    this.flashColor = color;
  }

  update(dt) {
    for (const p of this.pops) p.age += dt;
    this.pops = this.pops.filter((p) => p.age < p.life);
    for (const p of this.parts) {
      p.age += dt;
      p.vy += p.g * dt;
      p.vx *= Math.exp(-1.6 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.shakeT <= 0) this.shakeA = 0;
    this.flashA = Math.max(0, this.flashA - dt * 2.6);
  }

  /** 화면 흔들림 만큼의 이동. */
  offset() {
    if (!this.shakeT) return [0, 0];
    const a = this.shakeA * Math.min(1, this.shakeT / 0.2);
    return [(Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a];
  }

  draw(ctx, w, h) {
    for (const p of this.parts) {
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = clamp(k * 1.4);
      ctx.fillStyle = p.color;
      if (p.star) {
        const r = p.size * (0.6 + k * 0.6);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const rr = i % 2 ? r * 0.4 : r;
          const a = (i * Math.PI) / 4 + p.age * 4;
          ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * (0.5 + k * 0.5)), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const p of this.pops) {
      const k = p.age / p.life;
      const s = this.reduced ? 1 : easeBack(Math.min(1, p.age / 0.22));
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.translate(p.x, p.y - p.rise * Math.sqrt(k));
      ctx.scale(s, s);
      ctx.font = `${p.size}px ${FONT_DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, p.size * 0.26);
      ctx.strokeStyle = '#11143a';
      ctx.fillStyle = '#11143a';
      ctx.fillText(p.text, 0, p.size * 0.12);
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    if (this.flashA > 0) {
      ctx.globalAlpha = this.flashA;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }
}
