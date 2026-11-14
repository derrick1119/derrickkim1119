// 입력: 키보드 · 터치(떠다니는 조이스틱) · 게임패드
const MOVE = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const TOGGLE = new Set(['Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF']);

export class Input {
  constructor(surface, stickEl, handlers) {
    this.h = handlers; // { toggle, pause, pick(n), reroll, any }
    this.keys = new Set();
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.stickEl = stickEl;
    this.knob = stickEl.firstElementChild;
    this.usedTouch = false;
    this.padA = false; this.padStart = false; this.padOk = true;
    this.active = false; // 게임 중에만 이동/램프 입력을 받는다

    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (MOVE[e.code] || e.code === 'Space') e.preventDefault(); return; }
      this.h.any && this.h.any();
      if (MOVE[e.code]) { this.keys.add(e.code); e.preventDefault(); return; }
      if (TOGGLE.has(e.code)) { e.preventDefault(); this.h.toggle(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') { this.h.pause(); return; }
      if (e.code === 'Digit1' || e.code === 'Numpad1') this.h.pick(0);
      else if (e.code === 'Digit2' || e.code === 'Numpad2') this.h.pick(1);
      else if (e.code === 'Digit3' || e.code === 'Numpad3') this.h.pick(2);
      else if (e.code === 'KeyR') this.h.reroll();
      else if (e.code === 'KeyM') this.h.mute && this.h.mute();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.endStick(); });

    const opt = { passive: false };
    surface.addEventListener('touchstart', (e) => {
      this.usedTouch = true;
      this.h.any && this.h.any();
      if (!this.active) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this.stick.id === null) {
          this.stick.id = t.identifier;
          this.stick.ox = this.stick.x = t.clientX; this.stick.oy = this.stick.y = t.clientY;
          this.showStick();
        } else {
          // 두 번째 손가락 = 램프
          this.h.toggle();
        }
      }
    }, opt);
    surface.addEventListener('touchmove', (e) => {
      if (!this.active) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) { this.stick.x = t.clientX; this.stick.y = t.clientY; this.showStick(); }
      }
    }, opt);
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.stick.id) this.endStick();
    };
    surface.addEventListener('touchend', end);
    surface.addEventListener('touchcancel', end);
    surface.addEventListener('mousedown', (e) => {
      this.h.any && this.h.any();
      if (this.active && e.button === 0 && !this.usedTouch) this.h.toggle();
    });
    surface.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  showStick() {
    const s = this.stick, R = 52;
    let dx = s.x - s.ox, dy = s.y - s.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      // 손가락을 따라 기준점이 끌려온다
      s.ox += (dx / d) * (d - R); s.oy += (dy / d) * (d - R);
      dx = s.x - s.ox; dy = s.y - s.oy;
    }
    this.stickEl.classList.remove('hidden');
    this.stickEl.style.transform = `translate(${s.ox}px, ${s.oy}px)`;
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  endStick() {
    this.stick.id = null;
    this.stickEl.classList.add('hidden');
  }

  setActive(on) {
    this.active = on;
    if (!on) { this.endStick(); }
  }

  // 이동 방향 (길이 0..1)
  poll(out) {
    let mx = 0, my = 0;
    for (const k of this.keys) { const v = MOVE[k]; if (v) { mx += v[0]; my += v[1]; } }
    if (this.stick.id !== null) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy, d = Math.hypot(dx, dy);
      if (d > 7) { const k = Math.min(1, d / 44) / d; mx += dx * k; my += dy * k; }
    }
    let pads = [];
    if (this.padOk) {
      // 권한이 막힌 프레임 안에서는 예외가 날 수 있다
      try { pads = navigator.getGamepads ? navigator.getGamepads() || [] : []; } catch (e) { this.padOk = false; }
    }
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.22) { mx += ax; my += ay; }
      const a = !!(gp.buttons[0] && gp.buttons[0].pressed), st = !!(gp.buttons[9] && gp.buttons[9].pressed);
      if (a && !this.padA) this.h.toggle();
      if (st && !this.padStart) this.h.pause();
      this.padA = a; this.padStart = st;
      break;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    out.mx = mx; out.my = my;
  }
}
