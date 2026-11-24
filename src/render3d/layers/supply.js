// 본부 보급 풍선: 줄무늬 낙하산에 매달린 남색 보급 상자(금빛 별). 하늘을 천천히 흔들리며 내려오고,
// 열면 통 튀어 오르며 사라진다. 세계 쪽 규칙은 core/world.js(_updateSupply), 광고는 ui/ext/monetize.js.
import { THREE, mat, mesh, addOutline, roundBoxGeo, canvasTexture, glowSprite } from '../kit.js';
import { registerLayer } from '../layers.js';
import { PX } from '../engine.js';

const INK = '#2b1a5e';
let parts = null;

function build() {
  if (parts) return parts;
  // 낙하산 천: 노랑·하양 줄무늬(가로로 8칸)
  const stripes = canvasTexture(128, 16, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#ffcf26';
      ctx.fillRect((i * w) / 8, 0, w / 8 + 1, h);
    }
  });
  const canopyGeo = new THREE.SphereGeometry(0.62, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
  canopyGeo.scale(1, 0.72, 1);
  // 상자 앞면 별 무늬
  const starTex = canvasTexture(64, 64, (ctx, w) => {
    ctx.fillStyle = '#2a3284';
    ctx.fillRect(0, 0, w, w);
    ctx.fillStyle = '#ffcf26';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? w * 0.17 : w * 0.38;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r);
    }
    ctx.fill();
  });
  parts = {
    canopyGeo,
    canopyMat: mat('#ffffff', { map: stripes, rough: 0.5, side: THREE.DoubleSide }),
    boxGeo: roundBoxGeo(0.52, 0.44, 0.52, 0.08, 3),
    boxMat: mat('#2a3284', { rough: 0.35, envIntensity: 1 }),
    faceMat: mat('#ffffff', { map: starTex, rough: 0.4 }),
    bandMat: mat('#ffcf26', { rough: 0.3, metal: 0.4 }),
    lineMat: new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.7 }),
  };
  return parts;
}

function createSupply() {
  const p = build();
  const root = new THREE.Group();
  const swing = new THREE.Group();
  root.add(swing);
  const canopy = mesh(p.canopyGeo, p.canopyMat, { cast: false, pos: [0, 0.98, 0] });
  addOutline(canopy, 0.02, INK);
  swing.add(canopy);
  const box = mesh(p.boxGeo, p.boxMat, { cast: false, pos: [0, 0, 0] });
  addOutline(box, 0.022, INK);
  swing.add(box);
  // 앞면 별 판과 금빛 띠
  const face = mesh(new THREE.PlaneGeometry(0.34, 0.34), p.faceMat, { cast: false, pos: [0, 0, 0.262] });
  swing.add(face);
  const band = mesh(roundBoxGeo(0.545, 0.07, 0.545, 0.03, 2), p.bandMat, { cast: false, pos: [0, 0.13, 0] });
  swing.add(band);
  // 낙하산 줄 네 가닥
  const pts = [];
  for (const [x, z] of [
    [0.52, 0.3],
    [-0.52, 0.3],
    [0.52, -0.3],
    [-0.52, -0.3],
  ]) {
    pts.push(new THREE.Vector3(x * 0.95, 0.83, z * 1.3), new THREE.Vector3(x * 0.42, 0.22, z * 0.75));
  }
  swing.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), p.lineMat));
  const glow = glowSprite('#ffe680', 1.9, 0.5);
  glow.position.set(0, 0.25, -0.1);
  swing.add(glow);
  return { root, swing, glow };
}

registerLayer({
  id: 'supply',
  order: 40,
  create(scene) {
    let obj = null;
    let shownId = 0;
    return {
      sync() {
        const su = scene.world.supply;
        if (!su) {
          if (obj) obj.root.visible = false;
          return;
        }
        if (!obj) {
          obj = createSupply();
          scene.engine.actors.add(obj.root);
        }
        if (shownId !== su.id) shownId = su.id;
        const t = scene.t;
        obj.root.visible = scene.ufoVisible !== false;
        scene._w(su.x, su.y, obj.root.position);
        obj.root.position.z = 0.4;
        const k = Math.max(0.55, (scene.home?.r || 46) / PX) * 0.9;
        let s = k;
        if (su.state === 'open') {
          const o = Math.min(1, su.openT / 0.6);
          s = k * (1 + 0.6 * o);
          obj.swing.rotation.y += 0.3;
          obj.glow.material.opacity = 0.8 * (1 - o);
          obj.root.visible = o < 1;
        } else {
          obj.glow.material.opacity = 0.35 + 0.25 * Math.sin(t * 4);
          obj.swing.rotation.set(0, Math.sin(t * 0.7) * 0.4, Math.sin(t * 1.3 + su.phase) * 0.18);
        }
        obj.root.scale.setScalar(s);
      },
      overlay(ctx) {
        // "눌러 보세요" 표시: 상자 위에서 통통 튀는 작은 화살표
        const su = scene.world.supply;
        if (!su || su.state !== 'drop') return;
        const t = scene.t;
        const y = su.y - 64 - Math.abs(Math.sin(t * 5)) * 6;
        ctx.save();
        ctx.fillStyle = '#ffcf26';
        ctx.strokeStyle = '#12174a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(su.x - 9, y);
        ctx.lineTo(su.x + 9, y);
        ctx.lineTo(su.x, y + 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      },
    };
  },
});
