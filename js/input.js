// THE LAMP 2 — 입력: 키보드 · 화면 버튼(터치) · 게임패드
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyK']);
const LIGHT = new Set(['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyX', 'KeyL']);

export class Input {
  constructor(buttons, handlers) {
    this.h = handlers; // { pause, restart, any }
    this.keys = new Set();
    this.btn = { left: false, right: false, jump: false, light: false };
    // 한 프레임보다 짧게 눌렀다 뗀 입력도 놓치지 않도록 따로 적어 둔다
    this.tap = { jump: false, light: false };
    this.pad = { ax: 0, jump: false, light: false, start: false };
    this.padOk = true;
    this.usedTouch = false;

    window.addEventListener('keydown', (e) => {
      const c = e.code;
      if (LEFT.has(c) || RIGHT.has(c) || JUMP.has(c) || LIGHT.has(c)) e.preventDefault();
      if (e.repeat) return;
      this.h.any && this.h.any();
      this.keys.add(c);
      if (JUMP.has(c)) this.tap.jump = true;
      if (LIGHT.has(c)) this.tap.light = true;
      if (c === 'Escape' || c === 'KeyP') this.h.pause();
      else if (c === 'KeyR') this.h.restart();
      else if (c === 'KeyM') this.h.mute && this.h.mute();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); for (const k in this.btn) this.btn[k] = false; });

    // 화면 버튼: 여러 손가락을 동시에 받는다
    for (const name in buttons) {
      const el = buttons[name];
      const down = (e) => {
        e.preventDefault();
        this.usedTouch = this.usedTouch || e.pointerType === 'touch';
        this.h.any && this.h.any();
        this.btn[name] = true;
        if (name in this.tap) this.tap[name] = true;
        el.classList.add('down');
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* 일부 브라우저 */ }
      };
      const up = (e) => { e.preventDefault(); this.btn[name] = false; el.classList.remove('down'); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  has(set) { for (const k of this.keys) if (set.has(k)) return true; return false; }

  // 세계의 입력 칸을 채운다
  poll(out) {
    let ax = (this.has(RIGHT) || this.btn.right ? 1 : 0) - (this.has(LEFT) || this.btn.left ? 1 : 0);
    let jump = this.has(JUMP) || this.btn.jump || this.tap.jump;
    let light = this.has(LIGHT) || this.btn.light || this.tap.light;
    this.tap.jump = false; this.tap.light = false;
    if (this.padOk) {
      let pads = [];
      try { pads = navigator.getGamepads ? navigator.getGamepads() || [] : []; } catch (e) { this.padOk = false; }
      for (const gp of pads) {
        if (!gp) continue;
        const x = gp.axes[0] || 0, B = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
        if (Math.abs(x) > 0.3) ax += x;
        if (B(14)) ax -= 1;
        if (B(15)) ax += 1;
        jump = jump || B(0);
        light = light || B(2) || B(1) || B(5);
        const st = B(9);
        if (st && !this.pad.start) this.h.pause();
        this.pad.start = st;
        break;
      }
    }
    out.ax = Math.max(-1, Math.min(1, ax));
    out.jump = jump;
    out.light = light;
  }
}
