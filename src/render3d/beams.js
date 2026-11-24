// 견인 빔 색(꾸미기). 능력치 없음. 장면(scene3d)이 빔 원뿔을 칠할 때 쓴다.
//
// 쓰는 법(scene3d._sync3d 의 견인 빔):
//   · 간단히: cone.material.color.copy(beamColor(look.beam, t, 0, { auto: sp.auto, caught }))
//     무지개는 시간에 따라 색이 돈다(빔 하나는 한 색).
//   · 빔을 따라 무지개가 흐르게: cone.material.color.set(...) 대신 paintBeam(cone.material, look.beam, t, { auto: sp.auto, caught })
//     (기본·분홍·황금은 color.set 과 똑같고, 무지개만 셰이더로 빔 길이를 따라 색이 돈다. 재질 하나에 한 번 셰이더를 덧붙인다.)
//   · 기체 아래 발광부도 빔 색을 따르게 하려면 ufo.setBeam(id).
import { THREE, PAL, canvasTexture } from './kit.js';

/**
 * 빔 색. color = 보통 견인 빔, auto = 자동 수집(드론) 빔, caught = 붙잡혀 버둥대는 빔(놓칠 것 같은 위험 신호라 모두 빨강).
 * hue(t, k) = 무지개 색상(0..1): t = 초, k = 빔 위 자리(0 = 기체 쪽, 1 = 표본 쪽). 색상환을 따라 돈다.
 */
export const BEAM_STYLES = {
  cyan: { color: PAL.glow, auto: '#8dffc8', caught: '#ff6b5e' },
  // 빔은 덧그리기라 밝은 하늘 위에서 옅어진다. 하늘빛을 이기게 채도를 높게 잡는다
  pink: { color: '#ff4fc8', auto: '#ff9ce4', caught: '#ff6b5e' },
  gold: { color: '#ffa615', auto: '#ffd36a', caught: '#ff6b5e' },
  rainbow: {
    color: '#ff8af0', // 대표 색(목록 견본·셰이더가 없을 때)
    auto: '#c6b8ff',
    caught: '#ff6b5e',
    hue: (t, k = 0) => (((t * 0.22 + k * 0.85) % 1) + 1) % 1,
  },
};
export const BEAM_IDS = Object.keys(BEAM_STYLES);

/** 무지개 한 점의 색(채도를 조금 낮춘 사탕빛 무지개). */
function rainbowRGB(h, out) {
  out.setHSL(h, 1, 0.58);
  return out;
}

/**
 * 빔 색 하나(THREE.Color). 무지개는 t·k 에 따라 돈다. out 을 주면 거기에 쓴다(매 프레임 새로 만들지 않게).
 * @param {string} id BEAM_STYLES 의 id
 * @param {number} [t] 초
 * @param {number} [k] 빔 위 자리(0 = 기체, 1 = 표본). 무지개만 쓴다
 * @param {{auto?: boolean, caught?: boolean}} [state]
 */
export function beamColor(id, t = 0, k = 0, { auto = false, caught = false } = {}, out = new THREE.Color()) {
  const st = BEAM_STYLES[id] || BEAM_STYLES.cyan;
  if (caught) return out.set(st.caught);
  if (auto) return out.set(st.auto);
  if (st.hue) return rainbowRGB(st.hue(t, k), out);
  return out.set(st.color);
}

/** 빔 재질에 무지개 셰이더를 한 번 덧붙인다(꺼 두면 원래 그림과 같다). 돌려주는 값 = 유니폼. */
function rainbowUniforms(material) {
  let u = material.userData.beamU;
  if (u) return u;
  u = { uRainbow: { value: 0 }, uHueT: { value: 0 }, uHueK: { value: 0.85 } };
  material.userData.beamU = u;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vBeamV;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvBeamV = uv.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uRainbow; uniform float uHueT; uniform float uHueK; varying float vBeamV;
vec3 beamHue( float h ) {
  vec3 k = clamp( abs( fract( h + vec3( 0.0, 2.0 / 3.0, 1.0 / 3.0 ) ) * 6.0 - 3.0 ) - 1.0, 0.0, 1.0 );
  return mix( vec3( 1.0 ), k, 0.9 );
}`,
      )
      .replace('#include <color_fragment>', '#include <color_fragment>\nif ( uRainbow > 0.5 ) diffuseColor.rgb *= beamHue( uHueT + vBeamV * uHueK );');
  };
  const prevKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `beamStyle|${prevKey ? prevKey() : ''}`;
  material.needsUpdate = true;
  return u;
}

/**
 * 빔 원뿔 재질을 빔 색으로 칠한다(cone.material.color.set(color) 대신 부른다). 무지개는 빔을 따라 색이 흐른다
 * (원뿔 uv.y = 0 기체 쪽, 1 표본 쪽). 붙잡힌 빔·드론 빔은 한 색.
 */
export function paintBeam(material, id, t = 0, { auto = false, caught = false } = {}) {
  const st = BEAM_STYLES[id] || BEAM_STYLES.cyan;
  const rainbow = !!st.hue && !auto && !caught;
  if (rainbow || material.userData.beamU) {
    const u = rainbowUniforms(material);
    u.uRainbow.value = rainbow ? 1 : 0;
    u.uHueT.value = rainbow ? st.hue(t, 0) : 0;
  }
  if (rainbow) material.color.set('#ffffff');
  else beamColor(id, t, 0, { auto, caught }, material.color);
}

// ───────── 아이콘·미리보기용 빔 원뿔(장면의 견인 빔과 같은 그림) ─────────

let ringTex = null;
/** 가장자리가 밝은 유리관 + 빛 고리 네 줄(장면의 견인 빔 그림과 같다). */
function ringTexture() {
  if (ringTex) return ringTex;
  ringTex = canvasTexture(64, 128, (ctx, w, h) => {
    const gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(255,255,255,0.95)');
    gx.addColorStop(0.18, 'rgba(255,255,255,0.45)');
    gx.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gx.addColorStop(0.82, 'rgba(255,255,255,0.45)');
    gx.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const y = (i + 0.5) * (h / 4);
      const g = ctx.createLinearGradient(0, y - 10, 0, y + 10);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 10, w, 20);
    }
  });
  ringTex.wrapS = ringTex.wrapT = THREE.RepeatWrapping;
  ringTex.repeat.set(3, 1.6);
  return ringTex;
}

let fadeTex = null;
/** 양 끝을 부드럽게 지우는 투명도 그림(초록 채널). 위 = 넓은 끝. */
function fadeTexture() {
  if (fadeTex) return fadeTex;
  fadeTex = canvasTexture(
    4,
    128,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgb(0,0,0)');
      g.addColorStop(0.16, 'rgb(255,255,255)');
      g.addColorStop(0.8, 'rgb(220,220,220)');
      g.addColorStop(1, 'rgb(90,90,90)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    { srgb: false },
  );
  return fadeTex;
}

let coneGeo = null;
/**
 * 견인 빔 원뿔 하나(좁은 끝 = 원점, 넓은 끝 = 위 y 1, 반지름 1). additive = 덧그리기(장면처럼),
 * 끄면 투명 배경 아이콘에서도 색이 제대로 남는 보통 반투명.
 */
export function makeBeamCone(id = 'cyan', { additive = true, t = 0 } = {}) {
  coneGeo ??= new THREE.CylinderGeometry(1, 0.12, 1, 24, 1, true).translate(0, 0.5, 0);
  const m = new THREE.MeshBasicMaterial({
    map: ringTexture(),
    alphaMap: fadeTexture(),
    transparent: true,
    opacity: additive ? 0.55 : 0.8,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  paintBeam(m, id, t);
  const cone = new THREE.Mesh(coneGeo, m);
  cone.renderOrder = 6;
  cone.frustumCulled = false;
  return cone;
}
