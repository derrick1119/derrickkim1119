// 날씨 연출: 비·뇌우(빗줄기, 어두운 하늘), 안개(뿌연 띠, 짧은 시야), 밤(어둡게, 별빛).
// 규칙(시선이 좁아지는 등)은 core/world.js 가 맡고, 여기서는 보이는 것만 바꾼다.
import { THREE, cloudMaterials } from '../kit.js';
import { registerLayer } from '../layers.js';

/** 날씨별 목표값. light = 햇빛·하늘빛 배율, sky = 하늘색을 섞을 색과 비율, fog = 안개 거리 배율. */
const LOOK = {
  clear: { light: 1, hemi: 1, exposure: 1, sky: null, mix: 0, fog: 1, vignette: 0, haze: 0, rain: 0, cloud: 1 },
  rain: { light: 0.5, hemi: 0.8, exposure: 0.9, sky: '#6c7c9c', mix: 0.72, fog: 0.75, vignette: 0.08, haze: 0.12, rain: 0.8, cloud: 0.72 },
  storm: { light: 0.38, hemi: 0.68, exposure: 0.86, sky: '#3e4766', mix: 0.75, fog: 0.65, vignette: 0.16, haze: 0.1, rain: 1, cloud: 0.5 },
  fog: { light: 0.75, hemi: 1.05, exposure: 1.02, sky: '#d9e2ee', mix: 0.6, fog: 0.32, vignette: 0, haze: 0.42, rain: 0, cloud: 1 },
  night: { light: 0.12, hemi: 0.32, exposure: 0.8, sky: '#0d1a44', mix: 0.85, fog: 0.9, vignette: 0.22, haze: 0, rain: 0, cloud: 0.3 },
};
const NIGHT_HORIZON = '#2a3a78';

registerLayer({
  id: 'weather',
  order: 10,
  create(scene) {
    const engine = scene.engine;
    let base = null;
    let k = 0; // 지금 날씨 쪽으로 얼마나 넘어갔는지(0..1)
    let cur = 'clear';
    let target = 'clear';
    const drops = [];
    const stars = [];
    const tmp = new THREE.Color();

    function capture() {
      const u = engine.sky?.material?.uniforms;
      base = {
        sun: engine.sun.intensity,
        hemi: engine.hemi.intensity,
        exposure: engine.renderer.toneMappingExposure,
        top: u?.top?.value.clone(),
        mid: u?.mid?.value.clone(),
        horizon: u?.horizon?.value.clone(),
        sunStrength: u?.sunStrength?.value,
        fogNear: engine.scene.fog?.near,
        fogFar: engine.scene.fog?.far,
        vignette: engine.grade?.uniforms?.vignette?.value,
      };
    }

    function apply() {
      if (!base) capture();
      const a = LOOK.clear;
      const b = LOOK[cur] || a;
      const m = (x, y) => x + (y - x) * k;
      engine.sun.intensity = base.sun * m(a.light, b.light);
      engine.hemi.intensity = base.hemi * m(a.hemi, b.hemi);
      engine.renderer.toneMappingExposure = base.exposure * m(a.exposure, b.exposure);
      const u = engine.sky?.material?.uniforms;
      if (u && base.top) {
        const mix = b.mix * k;
        if (b.sky) {
          tmp.set(b.sky);
          u.top.value.copy(base.top).lerp(tmp, mix);
          u.mid.value.copy(base.mid).lerp(tmp, mix);
          u.horizon.value.copy(base.horizon).lerp(cur === 'night' ? tmp.set(NIGHT_HORIZON) : tmp, mix * 0.85);
        } else {
          u.top.value.copy(base.top);
          u.mid.value.copy(base.mid);
          u.horizon.value.copy(base.horizon);
        }
        if (u.sunStrength) u.sunStrength.value = base.sunStrength * m(1, cur === 'clear' ? 1 : 0.15);
      }
      if (engine.scene.fog && base.fogFar) {
        engine.scene.fog.near = base.fogNear * m(1, b.fog);
        engine.scene.fog.far = base.fogFar * m(1, b.fog);
      }
      if (engine.grade?.uniforms?.vignette && base.vignette != null) engine.grade.uniforms.vignette.value = base.vignette + b.vignette * k;
      // 스스로 빛나는 구름도 밤·폭풍에는 어둑하게
      const ck = m(a.cloud, b.cloud);
      for (const mat of cloudMaterials()) {
        if (mat.userData.baseEmissive == null) mat.userData.baseEmissive = mat.emissiveIntensity;
        mat.emissiveIntensity = mat.userData.baseEmissive * ck;
      }
    }

    return {
      stage() {
        // 새 무대가 자기 하늘·빛을 깔았다: 그 값을 기준으로 다시 잡는다
        base = null;
        capture();
        apply();
      },
      update(dt) {
        const want = scene.world.weather?.kind || 'clear';
        if (want !== target) target = want;
        // 날씨가 바뀌면 먼저 맑음 쪽으로 돌아왔다가 새 날씨로 넘어간다
        if (cur !== target) {
          k = Math.max(0, k - dt / 1.2);
          if (k === 0) cur = target;
        } else {
          k = Math.min(1, k + dt / 1.6);
        }
        apply();
        // 빗줄기
        const look = LOOK[cur] || LOOK.clear;
        const want2 = Math.round(look.rain * k * 140);
        const { w, h } = scene;
        while (drops.length < want2) drops.push({ x: Math.random() * w, y: Math.random() * h, v: 520 + Math.random() * 260, l: 10 + Math.random() * 12 });
        if (drops.length > want2) drops.length = want2;
        for (const d of drops) {
          d.y += d.v * dt;
          d.x -= d.v * 0.18 * dt;
          if (d.y > h + 20) {
            d.y = -20;
            d.x = Math.random() * (w + 60);
          }
        }
        // 밤하늘 별
        if (cur === 'night' && stars.length === 0) {
          for (let i = 0; i < 46; i++) stars.push({ x: Math.random(), y: Math.random() * 0.55, s: 0.6 + Math.random() * 1.4, p: Math.random() * 6 });
        }
      },
      overlay(ctx) {
        const { w, h, t } = scene;
        const look = LOOK[cur] || LOOK.clear;
        if (k <= 0.01) return;
        // 별(밤)
        if (cur === 'night') {
          ctx.save();
          for (const s of stars) {
            const a = (0.45 + 0.55 * Math.sin(t * 2 + s.p)) * k;
            ctx.fillStyle = `rgba(255,250,220,${(0.75 * a).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(s.x * w, scene.insets.top + s.y * (scene.groundY - scene.insets.top), s.s, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        // 안개: 땅 쪽이 뿌옇게
        if (look.haze > 0) {
          const g = ctx.createLinearGradient(0, h * 0.25, 0, scene.groundY + 30);
          g.addColorStop(0, 'rgba(235,240,248,0)');
          g.addColorStop(1, `rgba(235,240,248,${(look.haze * k).toFixed(3)})`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
        // 빗줄기
        if (drops.length) {
          ctx.save();
          ctx.strokeStyle = cur === 'storm' ? 'rgba(205,220,255,0.7)' : 'rgba(220,234,255,0.66)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (const d of drops) {
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + d.l * 0.18, d.y - d.l);
          }
          ctx.stroke();
          ctx.restore();
        }
      },
    };
  },
});
