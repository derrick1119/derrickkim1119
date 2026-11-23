// 반짝이 표본 오라, 관측실, 사진기 연출.
//   · 3D: 살아 있는 반짝이 표본마다 빛무리 + 무지개 고리 + 맴도는 반짝이 별. 표본 모델(종류별로 재사용된다)에 붙였다 뗀다.
//   · 2D 덧그림: 작은 화면에서도 읽히도록 표본 둘레에 반짝 별, 모을 때 무지개 폭죽과 '반짝!' 글자.
import { registerLayer } from '../layers.js';
import { THREE, canvasTexture, glowTexture } from '../kit.js';
import { PX } from '../engine.js';
import { TAU, star, withAlpha, label, easeOut, easeBack, clamp } from '../../render/draw.js';
import { t as tr } from '../../i18n/index.js';

const RAINBOW = ['#ff6b9a', '#ffa64d', '#ffe45c', '#7dff9a', '#6fd8ff', '#b28bff'];
const GOLD = new THREE.Color('#ffd75e');
const TWINKLES = 5;
const BURST_LIFE = 0.95;
const FLASH_LIFE = 0.45;

let starTex = null;
/** 네 갈래 반짝 별(가운데가 밝은 빛 위에). */
function starTexture() {
  if (starTex) return starTex;
  starTex = canvasTexture(64, 64, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.22, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.fillStyle = '#ffffff';
    star(ctx, c, c, c * 0.96, c * 0.15, 4, -Math.PI / 2);
    ctx.fill();
  });
  return starTex;
}

let haloTex = null;
/** 무지개 고리(돌리면 색이 흐른다). */
function haloTexture() {
  if (haloTex) return haloTex;
  haloTex = canvasTexture(128, 128, (ctx, w) => {
    const c = w / 2;
    let paint = '#ffe45c';
    if (typeof ctx.createConicGradient === 'function') {
      const g = ctx.createConicGradient(0, c, c);
      RAINBOW.forEach((col, i) => g.addColorStop(i / RAINBOW.length, col));
      g.addColorStop(1, RAINBOW[0]);
      paint = g;
    }
    ctx.strokeStyle = paint;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.74, 0, TAU);
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = w * 0.2;
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = w * 0.09;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = w * 0.035;
    ctx.stroke();
  });
  return haloTex;
}

function sprite(map, color, size, opacity, order = 7) {
  const m = new THREE.SpriteMaterial({
    map,
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  s.renderOrder = order;
  s.raycast = () => {};
  return s;
}

/** 오라 한 벌. 표본이 사라지면 떼어 내 다른 반짝이 표본에 다시 붙인다. */
function makeAura() {
  const group = new THREE.Group();
  group.name = 'shiny-aura';
  const glow = sprite(glowTexture(), GOLD, 1.15, 0.5, 6);
  const halo = sprite(haloTexture(), '#ffffff', 1.0, 0.45, 6);
  group.add(glow, halo);
  const twinkles = [];
  for (let i = 0; i < TWINKLES; i++) {
    const s = sprite(starTexture(), RAINBOW[(i * 2) % RAINBOW.length], 0.2, 0.9, 8);
    twinkles.push(s);
    group.add(s);
  }
  return { group, glow, halo, twinkles, phase: Math.random() * TAU, sp: null };
}

const tmpColor = new THREE.Color();

function animateAura(a, t, k) {
  const ph = a.phase;
  // 금빛 ↔ 무지개 빛깔이 숨 쉬듯 오간다
  const hue = (t * 0.18 + ph) % 1;
  tmpColor.setHSL(hue, 0.9, 0.62);
  const mixK = 0.5 + 0.5 * Math.sin(t * 2.1 + ph);
  a.glow.material.color.copy(GOLD).lerp(tmpColor, mixK * 0.7);
  a.glow.material.opacity = (0.52 + 0.16 * Math.sin(t * 4.2 + ph)) * k;
  a.glow.scale.setScalar(1.08 + 0.1 * Math.sin(t * 3 + ph));
  a.halo.material.rotation = t * 0.9 + ph;
  a.halo.material.opacity = (0.44 + 0.14 * Math.sin(t * 2.6 + ph * 2)) * k;
  a.halo.scale.setScalar(0.96 + 0.05 * Math.sin(t * 3.4 + ph));
  // 기울어진 궤도를 도는 별: 반은 표본 앞, 반은 뒤로 지나간다
  for (let i = 0; i < a.twinkles.length; i++) {
    const s = a.twinkles[i];
    const ang = t * 1.7 + (i * TAU) / a.twinkles.length + ph;
    const r = 0.44 + 0.05 * Math.sin(t * 2.3 + i);
    s.position.set(Math.cos(ang) * r, Math.sin(ang) * r * 0.5 + 0.04, Math.sin(ang) * r * 0.8);
    const tw = Math.max(0, Math.sin(t * 5.2 + i * 1.9 + ph));
    s.scale.setScalar(0.08 + 0.2 * tw * tw);
    s.material.rotation = t * 1.5 + i;
    s.material.opacity = (0.35 + 0.65 * tw) * k;
  }
}

/** 표본 상태에 따른 오라의 진하기. */
function auraAlpha(sp) {
  if (!sp) return 0;
  if (sp.state === 'fade') return clamp(sp.fade ?? 1);
  if (sp.state === 'beam') return 1 - 0.5 * clamp(sp.bt ?? 0);
  return 1;
}

registerLayer({
  id: 'collection',
  order: 60,
  create(scene) {
    const { world, engine } = scene;
    const auras = new Map(); // 표본 id → 오라
    const free = [];
    const bursts = [];
    const flashes = [];
    const offs = [];

    /** 행동 평면(z=0) 위 3D 점 → 화면 좌표(1:1 대응). */
    const toScreen = (p) => ({ x: p.x * PX + engine.w / 2, y: engine.groundY - p.y * PX });

    function detach(id, a) {
      a.group.parent?.remove(a.group);
      a.sp = null;
      auras.delete(id);
      free.push(a);
    }

    function addBurst(x, y) {
      const sparks = [];
      const n = scene.reducedMotion ? 8 : 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + Math.random() * 0.3;
        const v = 90 + Math.random() * 110;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, size: 4 + Math.random() * 4, color: RAINBOW[i % RAINBOW.length], rot: Math.random() * TAU });
      }
      bursts.push({ x, y, age: 0, sparks });
      if (bursts.length > 6) bursts.shift();
    }

    function addFlash(x, y) {
      const s = sprite(glowTexture(), '#fff3b0', 0.6, 0.95, 9);
      engine.toWorld(x, y, s.position);
      s.position.z = 0.3;
      engine.actors.add(s);
      flashes.push({ s, age: 0 });
    }

    // 반짝이를 낚아채는 순간: 무지개 폭죽
    offs.push(
      world.on('collect', ({ specimen, result, auto }) => {
        if (!specimen || specimen.shiny !== true || auto) return;
        if (result?.report && result.gain === 0) return;
        const x = specimen.x;
        const y = scene._specimenY ? scene._specimenY(specimen) : specimen.y;
        addBurst(x, y);
        addFlash(x, y);
        scene.ring?.(x, y, '#fff6c8', 64, 0.55);
        scene.ring?.(x, y, '#ff9ad0', 44, 0.45);
        if (!scene.reducedMotion) scene.flash?.('#fff6d0', 0.16);
      }),
    );
    // 기체가 삼킬 때: 배 쪽에서 한 번 더 반짝
    offs.push(
      world.on('absorbed', (sp) => {
        if (!sp || sp.shiny !== true || sp.auto) return;
        const p = scene.bellyPoint?.();
        if (!p) return;
        for (let i = 0; i < 3; i++) scene.sparkle?.(p.x, p.y, 4, RAINBOW[(i * 2 + 1) % RAINBOW.length], 150);
        scene.ring?.(p.x, p.y, '#ffe45c', 40, 0.4);
      }),
    );

    return {
      sync() {
        const live = new Set();
        for (const sp of world.specimens) {
          if (sp.shiny !== true) continue;
          const entry = scene.specs.get(sp.id);
          if (!entry) continue;
          live.add(sp.id);
          let a = auras.get(sp.id);
          if (!a) {
            a = free.pop() || makeAura();
            auras.set(sp.id, a);
          }
          const root = entry.obj.root;
          if (a.group.parent !== root) root.add(a.group);
          a.sp = sp;
        }
        // 사라진(재사용 상자로 돌아간) 표본에서는 떼어 낸다: 같은 모델이 보통 표본으로 다시 나올 수 있다
        for (const [id, a] of auras) if (!live.has(id)) detach(id, a);
        const t = scene.t3 || 0;
        for (const a of auras.values()) animateAura(a, t, auraAlpha(a.sp));
      },

      update(dt) {
        for (const b of bursts) {
          b.age += dt;
          for (const p of b.sparks) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 1 - 2.2 * dt;
            p.vy = p.vy * (1 - 2.2 * dt) + 60 * dt;
            p.rot += dt * 6;
          }
        }
        while (bursts.length && bursts[0].age > BURST_LIFE) bursts.shift();
        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i];
          f.age += dt;
          const k = f.age / FLASH_LIFE;
          if (k >= 1) {
            engine.actors.remove(f.s);
            f.s.material.dispose();
            flashes.splice(i, 1);
            continue;
          }
          f.s.scale.setScalar(0.6 + 2.2 * easeOut(k));
          f.s.material.opacity = 0.95 * (1 - k);
        }
      },

      overlay(ctx) {
        const t = scene.t3 || 0;
        // 작게 보여도 반짝이인 줄 알도록: 둘레에서 번갈아 반짝이는 별
        for (const a of auras.values()) {
          const sp = a.sp;
          if (!sp || sp.state === 'beam' || !a.group.parent) continue;
          const k = auraAlpha(sp);
          const { x, y } = toScreen(a.group.parent.position);
          for (let i = 0; i < 3; i++) {
            const ph = t * 2.4 + i * 2.09 + a.phase;
            const tw = Math.sin(ph);
            if (tw <= 0.05) continue;
            const cycle = Math.floor(ph / TAU);
            // 반짝일 때마다 자리를 옮긴다
            const ang = a.phase + i * 2.09 + cycle * 1.37;
            const r = 22 + ((cycle + i) % 3) * 4;
            const sx = x + Math.cos(ang) * r;
            const sy = y + Math.sin(ang) * r * 0.85;
            const s = 2.5 + 3.5 * tw;
            ctx.fillStyle = withAlpha(RAINBOW[(i * 2 + cycle) % RAINBOW.length], 0.55 * k * tw);
            star(ctx, sx, sy, s * 2, s * 0.5, 4, 0);
            ctx.fill();
            ctx.fillStyle = withAlpha('#ffffff', k * tw);
            star(ctx, sx, sy, s * 1.3, s * 0.28, 4, 0);
            ctx.fill();
          }
        }
        // 모으는 순간의 무지개 폭죽
        for (const b of bursts) {
          const k = clamp(b.age / BURST_LIFE);
          ctx.save();
          ctx.lineWidth = 4 * (1 - k) + 1;
          for (let i = 0; i < 3; i++) {
            const rk = clamp(k * 1.4 - i * 0.12);
            if (rk <= 0) continue;
            ctx.strokeStyle = withAlpha(RAINBOW[(i * 2) % RAINBOW.length], 0.85 * (1 - rk));
            ctx.beginPath();
            ctx.arc(b.x, b.y, 14 + 62 * easeOut(rk) - i * 6, 0, TAU);
            ctx.stroke();
          }
          for (const p of b.sparks) {
            ctx.fillStyle = withAlpha(p.color, 1 - k);
            star(ctx, p.x, p.y, p.size * (1 - 0.4 * k), p.size * 0.3, 4, p.rot);
            ctx.fill();
          }
          // '반짝!' 글자가 통 튀어 올랐다 사라진다
          const pop = b.age < 0.22 ? easeBack(b.age / 0.22) : 1;
          const fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
          ctx.globalAlpha = Math.max(0, fade);
          label(ctx, tr('collection.shiny.pop'), b.x, b.y - 34 - 16 * easeOut(k), { size: 19 * pop, fill: '#fff3a8', stroke: '#1f2350', lw: 6 });
          ctx.restore();
        }
      },

      stage() {
        // 무대가 바뀌면 남은 폭죽은 정리한다(오라는 sync 가 정리)
        bursts.length = 0;
      },

      dispose() {
        for (const off of offs) off?.();
        for (const [id, a] of auras) detach(id, a);
        for (const f of flashes) {
          engine.actors.remove(f.s);
          f.s.material.dispose();
        }
        flashes.length = 0;
      },
    };
  },
});
