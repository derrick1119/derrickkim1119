// 입력: 키보드 · 화면 버튼(터치) · 게임패드
const K = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ', 'KeyK'], act: ['KeyX', 'KeyF', 'KeyJ'], pos: ['KeyE', 'KeyC', 'ShiftLeft', 'ShiftRight'],
};
const ALL = new Set(Object.values(K).flat());

export class Input {
  constructor(buttons, handlers) {
    this.h = handlers; // { pause, any, next }
    this.keys = new Set();
    this.btn = { left: false, right: false, up: false, down: false, jump: false, act: false, pos: false };
    this.tap = { jump: false, act: false, pos: false };   // 한 프레임보다 짧은 누름도 놓치지 않게
    this.padStart = false; this.padOk = true; this.usedTouch = false;
    window.addEventListener('keydown', (e) => {
      const c = e.code, onBtn = document.activeElement && document.activeElement.tagName === 'BUTTON';
      if (ALL.has(c) && !(onBtn && (c === 'Space' || c === 'Enter'))) e.preventDefault();
      if (e.repeat) return;
      this.h.any && this.h.any();
      this.keys.add(c);
      for (const k in this.tap) if (K[k].includes(c)) this.tap[k] = true;
      if (c === 'Escape' || c === 'KeyP') this.h.pause();
      if ((c === 'Enter' || c === 'Space') && !onBtn) this.h.next && this.h.next();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); for (const k in this.btn) this.btn[k] = false; });
    for (const name in buttons) {
      const el = buttons[name];
      const down = (e) => {
        e.preventDefault();
        this.usedTouch = this.usedTouch || e.pointerType === 'touch';
        this.h.any && this.h.any();
        this.btn[name] = true; if (name in this.tap) this.tap[name] = true;
        el.classList.add('down');
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* 일부 브라우저 */ }
      };
      const up = (e) => { e.preventDefault(); this.btn[name] = false; el.classList.remove('down'); };
      el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }
  has(name) { for (const c of K[name]) if (this.keys.has(c)) return true; return this.btn[name]; }
  poll(out) {
    let ax = (this.has('right') ? 1 : 0) - (this.has('left') ? 1 : 0), ay = (this.has('down') ? 1 : 0) - (this.has('up') ? 1 : 0);
    let jump = this.has('jump') || this.tap.jump, act = this.has('act') || this.tap.act, pos = this.has('pos') || this.tap.pos;
    this.tap.jump = this.tap.act = this.tap.pos = false;
    if (this.padOk) {
      let pads = [];
      try { pads = navigator.getGamepads ? navigator.getGamepads() || [] : []; } catch (e) { this.padOk = false; }
      for (const gp of pads) {
        if (!gp) continue;
        const B = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed), x = gp.axes[0] || 0, y = gp.axes[1] || 0;
        if (Math.abs(x) > 0.3) ax += x; if (Math.abs(y) > 0.4) ay += y;
        if (B(14)) ax -= 1; if (B(15)) ax += 1; if (B(12)) ay -= 1; if (B(13)) ay += 1;
        jump = jump || B(0); act = act || B(2) || B(5); pos = pos || B(3) || B(1);
        const st = B(9); if (st && !this.padStart) this.h.pause(); this.padStart = st;
        break;
      }
    }
    out.ax = Math.max(-1, Math.min(1, ax)); out.ay = Math.max(-1, Math.min(1, ay)); out.jump = jump; out.act = act; out.pos = pos;
  }
}
