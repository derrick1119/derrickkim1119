/* 데이 & 나이트 — 공용 도우미 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = (DN.U = {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (t) => { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.easeOut = (t) => 1 - Math.pow(1 - U.clamp(t, 0, 1), 3);
  U.easeInOut = (t) => { t = U.clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  U.TAU = Math.PI * 2;

  /* 시드 고정 난수 (mulberry32) */
  U.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /* 색: '#rrggbb' <-> [r,g,b] */
  U.rgb = function (hex) {
    if (Array.isArray(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.mix = function (a, b, t) {
    a = U.rgb(a); b = U.rgb(b);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  U.css = function (c, alpha) {
    c = U.rgb(c);
    const r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
    return alpha === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
  };

  /* 부드러운 값 따라가기 (프레임 독립) */
  U.approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  U.wait = (ms) => new Promise((res) => setTimeout(res, ms));
})(typeof globalThis !== 'undefined' ? globalThis : window);
