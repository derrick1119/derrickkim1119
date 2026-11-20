// 장면 전환
export const nav = { scenes: {}, cur: null, next: null, fade: 0, dir: 0,
  go(name, args) { if (this.next) return; this.next = { name, args }; this.dir = 1; },
  now(name, args) { this.cur = new this.scenes[name](args); this.fade = 1; this.dir = -1; this.next = null; },
};
