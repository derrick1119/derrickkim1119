// 견인 빔 색(꾸미기). 능력치 없음. 장면(scene3d)이 빔 원뿔을 칠할 때 쓴다.
//
// 쓰는 법(scene3d._sync3d 의 견인 빔):
//   · 간단히: cone.material.color.copy(beamColor(look.beam, t, 0, { auto: sp.auto, caught }))
//     빔 하나는 한 색(무지개·흐르는 그라데이션은 시간에 따라 기체 쪽 색이 바뀐다).
//   · 빔을 따라 색이 흐르게: cone.material.color.set(...) 대신 paintBeam(cone.material, look.beam, t, { auto: sp.auto, caught })
//     (한 색 빔은 color.set 과 똑같고, 무지개·그라데이션·줄무늬·반짝이는 셰이더로 빔 길이를 따라 그린다.
//     재질 하나에 한 번 셰이더를 덧붙이고, 그 뒤로는 유니폼만 바꾼다.)
//   · 기체 아래 발광부도 빔 색을 따르게 하려면 ufo.setBeam(id)(대표 색 color. 무지개는 시간에 따라 돈다).
import { THREE, PAL, canvasTexture } from './kit.js';

/**
 * 빔 색. color = 한 색 빔의 색이자 대표 색(목록 견본·기체 아래 발광부·셰이더가 없을 때), auto = 자동 수집(드론) 빔,
 * caught = 붙잡혀 버둥대는 빔(놓칠 것 같은 위험 신호라 모두 빨강). 드론 빔·붙잡힌 빔은 꾸밈 없이 늘 한 색이다.
 * 빔은 밝은 하늘 위에 덧그리므로(더하기) 짙은 색은 사라진다. 채도 높고 밝은 색으로 잡는다.
 * 꾸밈(보통 견인 빔에만. 빔 위 자리 k: 0 = 기체 쪽, 1 = 표본 쪽):
 *   hue(t, k) = 무지개 색상(0..1, t = 초). 색상환을 따라 돈다.
 *   grad: [기체 쪽 색, 표본 쪽 색] = 빔 길이를 따라 바뀌는 그라데이션.
 *     flow = 초당 흐르는 물결 수(있으면 두 색이 물결처럼 표본 쪽으로 흘러간다), waves = 빔 하나에 드는 물결 수.
 *   stripes: [a, b] = 번갈아 드는 띠(빔을 두른 고리). bands = 빔 하나의 띠 쌍 수, speed = 초당 지나가는 띠 쌍 수
 *     (+ 면 기체 → 표본 쪽). 빔 원뿔은 앞뒤 면이 함께 보여 비스듬한 띠는 엇갈려 흐려지므로 고리로 둔다.
 *   sparkle = 반짝이 세기(빔 속에서 작은 별빛이 반짝이며 기체 쪽으로 올라간다).
 *   gain = 빛 세기 배율(옅은 색이 밝은 하늘 위에서도 보이게. 덧그리는 보통 견인 빔에만. 상점 아이콘처럼 보통 반투명으로
 *     그리면 더 하얘지기만 하므로 쓰지 않는다).
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
  // 산호빛 복숭아(고양이 세트). 붙잡힌 빔과 헷갈리지 않게 붙잡히면 더 짙은 빨강
  peach: { color: '#ff8c5a', auto: '#ffbe9a', caught: '#ff2e4a' },
  // 쨍한 라임(공룡 세트)
  lime: { color: '#8cff1e', auto: '#c8ff8a', caught: '#ff6b5e' },
  // 꿀: 기체 쪽 호박색 → 표본 쪽 노랑(꿀벌 세트)
  honey: { color: '#ff9a0a', grad: ['#ff8a00', '#ffe41a'], auto: '#ffd36a', caught: '#ff6b5e' },
  // 보랏빛 마법(마법사 세트): 별빛이 반짝인다
  violet: { color: '#a24dff', sparkle: 1, auto: '#cfa6ff', caught: '#ff6b5e' },
  // 얼음: 옅은 얼음빛. 하늘 위에서 사라지지 않게 기체 쪽을 조금 더 푸르게
  ice: { color: '#a8f0ff', grad: ['#7fe0ff', '#e4fbff'], gain: 1.9, auto: '#d6f8ff', caught: '#ff6b5e' },
  // 바다(해적 세트): 청록 → 짙은 파랑이 물결처럼 흐른다
  ocean: { color: '#1fd2ff', grad: ['#24e8ff', '#2f5cff'], flow: 0.7, waves: 1.3, gain: 1.3, auto: '#8dd8ff', caught: '#ff6b5e' },
  // 노을: 주황 → 진분홍
  sunset: { color: '#ff7a1e', grad: ['#ff8a12', '#ff2e9a'], auto: '#ffb37a', caught: '#ff6b5e' },
  // 오로라: 청록 → 보라가 느리게 흐른다
  aurora: { color: '#22f0bc', grad: ['#1ef5b4', '#a54dff'], flow: 0.22, waves: 1, auto: '#9ff5e0', caught: '#ff6b5e' },
  // 사탕: 분홍·흰 띠(고리)가 기체에서 표본 쪽으로 미끄러진다
  candy: { color: '#ff4fa8', stripes: ['#ff2f96', '#ffffff'], bands: 4, speed: 1.1, gain: 1.3, auto: '#ffb3d9', caught: '#ff6b5e' },
};
export const BEAM_IDS = Object.keys(BEAM_STYLES);

/** 무지개 한 점의 색(채도를 조금 낮춘 사탕빛 무지개). */
function rainbowRGB(h, out) {
  out.setHSL(h, 1, 0.58);
  return out;
}

const smooth = (a, b, x) => {
  const k = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
};
/** 흐름·미끄러짐 위상(0..1): 초당 rate 바퀴. */
const phaseOf = (rate, t) => (((t * rate) % 1) + 1) % 1;
/** 그라데이션 빔의 섞는 정도(0 = 기체 쪽 색, 1 = 표본 쪽 색). 셰이더와 같은 식. */
function gradMix(st, t, k) {
  let f = k;
  if (st.flow) {
    const w = 0.5 - 0.5 * Math.cos(Math.PI * 2 * (k * (st.waves ?? 1) - phaseOf(st.flow, t)));
    f += (w - f) * 0.6;
  }
  return smooth(0, 1, f);
}
/** 줄무늬 빔의 섞는 정도(0 = a, 1 = b). 셰이더와 같은 식. */
function stripeMix(st, t, k) {
  const s = (((k * (st.bands ?? 4) - phaseOf(st.speed ?? 0, t)) % 1) + 1) % 1;
  return smooth(0.42, 0.5, s) * (1 - smooth(0.92, 1, s));
}

const colorCache = new Map();
/** 색 문자열 → THREE.Color(매 프레임 다시 읽지 않게 모아 둔다. 바꾸지 말 것). */
function col(hex) {
  let c = colorCache.get(hex);
  if (!c) colorCache.set(hex, (c = new THREE.Color(hex)));
  return c;
}

/**
 * 빔 색 하나(THREE.Color). 무지개·그라데이션·줄무늬는 t·k 에 따라 바뀐다(반짝이는 뺀다). out 을 주면 거기에 쓴다
 * (매 프레임 새로 만들지 않게).
 * @param {string} id BEAM_STYLES 의 id
 * @param {number} [t] 초
 * @param {number} [k] 빔 위 자리(0 = 기체, 1 = 표본)
 * @param {{auto?: boolean, caught?: boolean}} [state]
 */
export function beamColor(id, t = 0, k = 0, { auto = false, caught = false } = {}, out = new THREE.Color()) {
  const st = BEAM_STYLES[id] || BEAM_STYLES.cyan;
  if (caught) return out.set(st.caught);
  if (auto) return out.set(st.auto);
  if (st.hue) return rainbowRGB(st.hue(t, k), out);
  if (st.stripes) return out.copy(col(st.stripes[0])).lerp(col(st.stripes[1]), stripeMix(st, t, k));
  if (st.grad) return out.copy(col(st.grad[0])).lerp(col(st.grad[1]), gradMix(st, t, k));
  return out.set(st.color);
}

/** 빔 재질에 꾸밈 셰이더(무지개·그라데이션·줄무늬·반짝이)를 한 번 덧붙인다(꺼 두면 원래 그림과 같다). 돌려주는 값 = 유니폼. */
function beamUniforms(material) {
  let u = material.userData.beamU;
  if (u) return u;
  u = {
    uBeamMode: { value: 0 }, // 0 끔(재질 색 그대로) | 1 무지개 | 2 그라데이션 | 3 줄무늬
    uHueT: { value: 0 },
    uHueK: { value: 0.85 },
    uBeamA: { value: new THREE.Color() },
    uBeamB: { value: new THREE.Color() },
    uBeamPhase: { value: 0 }, // 흐름·미끄러짐 위상(0..1)
    uBeamWave: { value: 0 }, // 그라데이션 물결 섞기(0 = 고정 그라데이션)
    uBeamRep: { value: 1 }, // 물결 수 | 띠 쌍 수
    uSpark: { value: 0 }, // 반짝이 세기
    uBeamT: { value: 0 }, // 반짝이 시간(초)
  };
  material.userData.beamU = u;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vBeamUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvBeamUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uBeamMode; uniform float uHueT; uniform float uHueK;
uniform vec3 uBeamA; uniform vec3 uBeamB;
uniform float uBeamPhase; uniform float uBeamWave; uniform float uBeamRep;
uniform float uSpark; uniform float uBeamT;
varying vec2 vBeamUv;
vec3 beamHue( float h ) {
  vec3 k = clamp( abs( fract( h + vec3( 0.0, 2.0 / 3.0, 1.0 / 3.0 ) ) * 6.0 - 3.0 ) - 1.0, 0.0, 1.0 );
  return mix( vec3( 1.0 ), k, 0.9 );
}
// 반짝이: 둘레 14 칸 × 길이 9 칸 격자에서 칸마다 하나씩(반쯤은 비운다), 기체 쪽으로 천천히 오르며 깜빡인다
float beamSparkle( vec2 uv, float t ) {
  vec2 p = vec2( uv.x * 14.0, uv.y * 9.0 + t * 0.6 );
  vec2 id = floor( p );
  id.x = mod( id.x, 14.0 );
  vec2 f = fract( p ) - 0.5;
  float h = fract( sin( dot( id, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
  vec2 o = ( vec2( fract( h * 7.13 ), fract( h * 3.71 ) ) - 0.5 ) * 0.5;
  vec2 d = abs( f - o );
  // 네 갈래 별빛: 가운데 점 + 가는 십자
  float star = smoothstep( 0.16, 0.0, length( d ) ) + 0.6 * smoothstep( 0.035, 0.0, min( d.x, d.y ) ) * smoothstep( 0.3, 0.0, max( d.x, d.y ) );
  float tw = 0.5 + 0.5 * sin( t * ( 3.0 + 4.0 * h ) + h * 40.0 );
  return step( 0.5, h ) * star * tw * tw;
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
if ( uBeamMode > 0.5 ) {
  vec3 beamC;
  if ( uBeamMode < 1.5 ) beamC = beamHue( uHueT + vBeamUv.y * uHueK );
  else if ( uBeamMode < 2.5 ) {
    float w = 0.5 - 0.5 * cos( 6.2831853 * ( vBeamUv.y * uBeamRep - uBeamPhase ) );
    beamC = mix( uBeamA, uBeamB, smoothstep( 0.0, 1.0, mix( vBeamUv.y, w, uBeamWave ) ) );
  } else {
    float s = fract( vBeamUv.y * uBeamRep - uBeamPhase );
    beamC = mix( uBeamA, uBeamB, smoothstep( 0.42, 0.5, s ) * ( 1.0 - smoothstep( 0.92, 1.0, s ) ) );
  }
  diffuseColor.rgb *= beamC;
}
if ( uSpark > 0.0 ) diffuseColor.rgb += vec3( 1.0, 0.86, 1.0 ) * beamSparkle( vBeamUv, uBeamT ) * uSpark * 2.5;`,
      );
  };
  const prevKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `beamStyle2|${prevKey ? prevKey() : ''}`;
  material.needsUpdate = true;
  return u;
}

/**
 * 빔 원뿔 재질을 빔 색으로 칠한다(cone.material.color.set(color) 대신 부른다). 무지개·그라데이션·줄무늬·반짝이는 빔을 따라
 * 그린다(원뿔 uv.y = 0 기체 쪽, 1 표본 쪽, uv.x = 둘레). 붙잡힌 빔·드론 빔은 한 색.
 */
export function paintBeam(material, id, t = 0, { auto = false, caught = false } = {}) {
  const st = BEAM_STYLES[id] || BEAM_STYLES.cyan;
  const plain = auto || caught;
  const mode = plain ? 0 : st.hue ? 1 : st.stripes ? 3 : st.grad ? 2 : 0;
  const spark = plain ? 0 : st.sparkle || 0;
  if (mode || spark || material.userData.beamU) {
    const u = beamUniforms(material);
    u.uBeamMode.value = mode;
    u.uSpark.value = spark;
    u.uBeamT.value = t % 600; // 아주 커지지 않게(반짝이 자리만 가끔 새로 섞인다)
    if (mode === 1) u.uHueT.value = st.hue(t, 0);
    else if (mode === 2) {
      u.uBeamA.value.copy(col(st.grad[0]));
      u.uBeamB.value.copy(col(st.grad[1]));
      u.uBeamWave.value = st.flow ? 0.6 : 0;
      u.uBeamRep.value = st.waves ?? 1;
      u.uBeamPhase.value = st.flow ? phaseOf(st.flow, t) : 0;
    } else if (mode === 3) {
      u.uBeamA.value.copy(col(st.stripes[0]));
      u.uBeamB.value.copy(col(st.stripes[1]));
      u.uBeamRep.value = st.bands ?? 4;
      u.uBeamPhase.value = phaseOf(st.speed ?? 0, t);
    }
  }
  if (mode) material.color.setRGB(1, 1, 1);
  else beamColor(id, t, 0, { auto, caught }, material.color);
  if (st.gain && !plain && material.blending === THREE.AdditiveBlending) material.color.multiplyScalar(st.gain);
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
