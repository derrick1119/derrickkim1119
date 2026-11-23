// 3D 엔진: 렌더러, 카메라, 빛, 환경. 화면 좌표(CSS px)와 3D 좌표를 1:1로 잇는다.
//
// 좌표 약속
//   · 행동 평면 z = 0: 지구인은 y = 0(땅) 위를 x 로 걷고, 표본과 기체는 이 평면에 떠 있다.
//   · 화면 (x, y) ↔ 3D (X, Y, 0):  X = (x − w/2) / PX,  Y = (groundY − y) / PX.  PX = 64 px.
//   · 카메라는 수평(아래로 기울이지 않음)으로 z = +CAM_DIST 에서 −z 를 본다. 렌즈를 위아래로 옮겨(view offset)
//     땅선(y = 0, z = 0)이 정확히 groundY 에 오게 한다. 그래서 행동 평면 위에서는 원근 왜곡 없이 선형으로 대응한다.
//   · 무대 배경은 z < −1 에, 화면 아래(조작부 뒤)의 앞마당은 z > 0 에 둔다.
import { THREE, makeSky } from './kit.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const PX = 64;
export const CAM_DIST = 14;
const CAM_Y_MIN = 2.2;
const CAM_Y_MAX = 3.4;

/** 기본 환경(맑은 낮). 무대가 env 로 덮어쓴다. */
export const DEFAULT_ENV = {
  sky: { top: '#2a5fd6', mid: '#4d8ff2', horizon: '#9fd0ff', sunDir: [-0.45, 0.5, -1], sunColor: '#fff3d0', sunStrength: 0.5 },
  fog: { color: '#a9d2ff', near: 30, far: 220 },
  sun: { color: '#fff0d6', intensity: 2.1, dir: [-0.55, 1, 0.75] },
  hemi: { sky: '#b4d6ff', ground: '#8fb86a', intensity: 0.85 },
  exposure: 1.0,
};

/**
 * 마지막 색 보정(톤 매핑 뒤, 화면 색 공간에서): 채도·대비를 조금 올리고, 그늘은 남색으로 빛은 따뜻하게,
 * 화면 가장자리를 살짝 어둡게(비네트) 해 시선을 가운데로 모은다. 슈퍼셀 게임 화면의 '쨍하고 진한' 마감.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.12 },
    contrast: { value: 1.06 },
    vignette: { value: 0.22 },
    shadowTint: { value: new THREE.Color('#1c2a6b') },
    highlightTint: { value: new THREE.Color('#fff1d6') },
    aspect: { value: 0.5 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float saturation; uniform float contrast; uniform float vignette;
    uniform vec3 shadowTint; uniform vec3 highlightTint; uniform float aspect; varying vec2 vUv;
    void main(){
      vec3 c = texture2D( tDiffuse, vUv ).rgb;
      float l = dot( c, vec3( 0.299, 0.587, 0.114 ) );
      c = mix( vec3( l ), c, saturation );
      c = ( c - 0.5 ) * contrast + 0.5;
      // 그늘은 차가운 남색, 밝은 곳은 따뜻한 햇빛 쪽으로 아주 살짝
      c = mix( c, c * shadowTint * 2.2, ( 1.0 - smoothstep( 0.0, 0.45, l ) ) * 0.12 );
      c = mix( c, c * highlightTint, smoothstep( 0.55, 1.0, l ) * 0.25 );
      vec2 d = vUv - 0.5; d.x *= aspect;
      float v = smoothstep( 0.75, 0.2, length( d ) );
      c *= mix( 1.0 - vignette, 1.0, v );
      gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
    }`,
};

export class Engine {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES 는 채도를 많이 깎는다. 컨셉의 쨍한 색을 살리려고 색을 덜 건드리는 Neutral 을 쓴다.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 900);
    this.camY = 3;
    this.w = 390;
    this.h = 760;
    this.groundY = 600;
    this.shake = { x: 0, y: 0 };

    this.hemi = new THREE.HemisphereLight('#bcdcff', '#8fbf5a', 1.1);
    scene.add(this.hemi);
    const sun = new THREE.DirectionalLight('#fff1d8', 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 3;
    const sc = sun.shadow.camera;
    sc.left = -7;
    sc.right = 7;
    sc.top = 9;
    sc.bottom = -3;
    sc.near = 1;
    sc.far = 60;
    scene.add(sun, sun.target);
    this.sun = sun;

    this.sky = null;
    this.stage = null;
    this.actors = new THREE.Group();
    this.actors.name = 'actors';
    scene.add(this.actors);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envTarget = null;

    // 후처리: 장면 → 빛 번짐(블룸) → 톤 매핑·sRGB → 색 보정. 느린 기기에서는 끈다(setPost).
    this.post = true;
    this.bloomOn = true;
    const isWebGL2 = renderer.capabilities.isWebGL2;
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: isWebGL2 ? 4 : 0 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, this.camera));
    // 문턱을 높여 스스로 빛나는 것(조명·빔·불)만 번지게 한다
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 1.25);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.setEnv(DEFAULT_ENV);
  }

  /**
   * 후처리 단계를 정한다.
   * @param {{post?: boolean, bloom?: boolean}} o post = 색 보정·멀티샘플링 등 후처리 전체, bloom = 빛 번짐
   */
  setPost({ post = this.post, bloom = this.bloomOn } = {}) {
    this.post = post;
    this.bloomOn = bloom;
    this.bloom.enabled = bloom;
  }

  /** 하늘·안개·빛을 바꾼다. 무대를 바꿀 때 부른다. */
  setEnv(env) {
    const e = { ...DEFAULT_ENV, ...env };
    const sk = { ...DEFAULT_ENV.sky, ...(env.sky || {}) };
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky.geometry.dispose();
      this.sky.material.dispose();
    }
    this.sky = makeSky({ ...sk, sunDir: new THREE.Vector3(...sk.sunDir) });
    this.scene.add(this.sky);
    const fog = { ...DEFAULT_ENV.fog, ...(env.fog || {}) };
    this.scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
    const sun = { ...DEFAULT_ENV.sun, ...(env.sun || {}) };
    this.sun.color.set(sun.color);
    this.sun.intensity = sun.intensity;
    this.sunDir = new THREE.Vector3(...sun.dir).normalize();
    this.sun.position.copy(this.sunDir).multiplyScalar(30);
    this.sun.target.position.set(0, 0, 0);
    const hemi = { ...DEFAULT_ENV.hemi, ...(env.hemi || {}) };
    this.hemi.color.set(hemi.sky);
    this.hemi.groundColor.set(hemi.ground);
    this.hemi.intensity = hemi.intensity;
    this.renderer.toneMappingExposure = e.exposure ?? 1;
    // 무대가 색 보정을 조금 바꿀 수 있다(밤 무대는 비네트를 더 진하게 등)
    const g = { saturation: 1.12, contrast: 1.06, vignette: 0.22, bloom: 0.5, ...(env.grade || {}) };
    if (this.grade) {
      this.grade.uniforms.saturation.value = g.saturation;
      this.grade.uniforms.contrast.value = g.contrast;
      this.grade.uniforms.vignette.value = g.vignette;
      this.bloom.strength = g.bloom;
    }
    // 금속(기체)에 비칠 환경: 지금 하늘을 흐리게 구운 것
    const envScene = new THREE.Scene();
    envScene.add(makeSky({ ...sk, sunDir: new THREE.Vector3(...sk.sunDir) }));
    // 반사에 비칠 땅은 풀색 그대로 두면 금속 아랫면이 녹색으로 물든다. 남회색 쪽으로 누른다.
    const envGround = new THREE.Color(hemi.ground).lerp(new THREE.Color('#5a6688'), 0.65);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 24), new THREE.MeshBasicMaterial({ color: envGround }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    envScene.add(ground);
    const target = this.pmrem.fromScene(envScene, 0.04);
    if (this.envTarget) this.envTarget.dispose();
    this.envTarget = target;
    this.scene.environment = target.texture;
    ground.geometry.dispose();
    ground.material.dispose();
    envScene.children[0].material.dispose();
    envScene.children[0].geometry.dispose();
  }

  /** 무대(배경 묶음)를 바꾼다. stage = { group, env, update(t, dt) } */
  setStage(stage) {
    if (this.stage) {
      this.scene.remove(this.stage.group);
      disposeTree(this.stage.group);
    }
    this.stage = stage;
    if (stage) {
      this.scene.add(stage.group);
      this.setEnv(stage.env || {});
    }
  }

  /**
   * 화면 배치. groundY = 지구인이 서는 화면 y, insetTop = 계기판 아래 끝.
   */
  layout({ w, h, dpr, groundY, insetTop }) {
    this.w = w;
    this.h = h;
    this.groundY = groundY;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    // 빛 번짐은 반 해상도로 충분하다(가장 비싼 부분)
    this.bloom.setSize(Math.round((w * dpr) / 2), Math.round((h * dpr) / 2));
    this.grade.uniforms.aspect.value = w / h;
    // 땅이 보이는 띠: 화면이 낮으면 카메라를 낮춰 하늘을 더 남긴다
    this.camY = Math.min(Math.max((0.45 * (groundY - insetTop)) / PX, CAM_Y_MIN), CAM_Y_MAX);
    this._applyCamera();
  }

  _applyCamera() {
    const { w, h, groundY, camY } = this;
    const f = PX * CAM_DIST; // 초점 거리(px)
    const horizonY = groundY - PX * camY; // 렌즈 중심이 오는 화면 y
    const halfH = Math.max(horizonY, h - horizonY, 1);
    const cam = this.camera;
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfH / f));
    cam.aspect = w / (2 * halfH);
    cam.setViewOffset(w, 2 * halfH, 0, halfH - horizonY, w, h);
    cam.position.set(this.shake.x / PX, camY - this.shake.y / PX, CAM_DIST);
    cam.lookAt(this.shake.x / PX, camY - this.shake.y / PX, 0);
    cam.updateProjectionMatrix();
  }

  /** 그림자를 켜고 끈다(느린 기기에서 끈다). */
  setShadows(on) {
    if (this.sun.castShadow === on) return;
    this.sun.castShadow = on;
  }

  /** 화면 흔들림(px). */
  setShake(x, y) {
    if (x === this.shake.x && y === this.shake.y) return;
    this.shake.x = x;
    this.shake.y = y;
    this._applyCamera();
  }

  /** 화면 좌표 → 행동 평면(z) 위의 3D 점. */
  toWorld(x, y, out = new THREE.Vector3()) {
    return out.set((x - this.w / 2) / PX, (this.groundY - y) / PX, 0);
  }

  /** 3D 점 → 화면 좌표. */
  toScreen(v) {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.w, y: ((1 - p.y) / 2) * this.h };
  }

  render() {
    if (this.post) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.stage) disposeTree(this.stage.group);
    if (this.envTarget) this.envTarget.dispose();
    this.pmrem.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}

/** 무대를 내릴 때 그 무대만 쓰던 도형·텍스처를 해제한다(캐시된 공용 도형은 그대로 둔다). */
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.userData?.ownGeometry && o.geometry) o.geometry.dispose();
    if (o.isMesh && o.geometry && !o.geometry.userData?.shared && o.matrixAutoUpdate === false) o.geometry.dispose();
  });
}

/** WebGL 을 쓸 수 있는지. */
export function webglAvailable() {
  try {
    const cv = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (cv.getContext('webgl2') || cv.getContext('webgl')));
  } catch {
    return false;
  }
}
