/**
 * 👻 몸 갈아타기 — 직접 짠 WebGL2 렌더러 (런타임 의존성 0).
 * 그림자 맵(태양, 하드웨어 PCF 3×3) → HDR 장면(MSAA 4×, 하늘·불투명·반투명·가산·빛 알갱이)
 * → 블룸(1/2~1/32 다섯 단 내려가며 흐리고 올라오며 더함) → ACES 톤맵·색보정·비네트 → 화면.
 * 재질: 꼭짓점 색 + 거칠기(GGX 반사) + 산란(감싸는 빛) + 굽힌 AO, 반구 환경광, 림 라이트, 공기 원근 안개.
 */
import { ident, invert, lookAt, mul, ortho, persp, type M4, type V3 } from './m4.ts';
import { STRIDE, type Mesh } from './mesh.ts';

export interface GMesh { vao: WebGLVertexArrayObject; n: number }
export interface Draw {
  m: GMesh; model: M4;
  tint?: number[]; emis?: number[]; fres?: number[]; flash?: number; alpha?: number;
  /** 0 불투명 · 1 반투명 · 2 가산(빛) */
  pass?: 0 | 1 | 2; shadow?: boolean;
}
export interface Light {
  sun: V3; sunC: number[]; sky: number[]; gnd: number[]; rim: number[]; fog: number[]; fogD: number; fogS: number;
  zen: number[]; hor: number[]; expo: number; bloom: number; sat: number; con: number; warm: number; vig: number;
}
export interface Cam { eye: V3; at: V3; fov: number }

const VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec3 aC;
layout(location=3) in float aO; layout(location=4) in vec2 aM; layout(location=5) in vec2 aW;
uniform mat4 uVP, uM; uniform float uT;
out vec3 vW, vN, vC; out float vO; out vec2 vM;
void main(){
  vec4 w = uM * vec4(aP, 1.);
  if (aW.x > 0.) { w.x += sin(uT*1.6 + aW.y) * aW.x; w.z += sin(uT*1.27 + aW.y*1.7) * aW.x * .6; }
  else if (aW.x < 0.) { w.y += abs(sin(uT*2.6 + aW.y)) * -aW.x; }
  vW = w.xyz; vN = mat3(uM) * aN; vC = aC; vO = aO; vM = aM;
  gl_Position = uVP * w;
}`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW, vN, vC; in float vO; in vec2 vM;
uniform vec3 uCam, uSun, uSunC, uSky, uGnd, uRim, uFog; uniform float uFogD, uFogS;
uniform mat4 uLVP; uniform sampler2DShadow uSh;
uniform vec3 uTint, uEmis, uFres; uniform float uFlash, uAlpha;
out vec4 o;
float shade(float ndl){
  vec4 l = uLVP * vec4(vW, 1.); vec3 p = l.xyz / l.w * .5 + .5;
  if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1. || p.z > 1.) return 1.;
  float b = .0008 + .0025 * (1. - clamp(ndl, 0., 1.)); vec2 t = 1. / vec2(textureSize(uSh, 0)); float s = 0.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) s += texture(uSh, vec3(p.xy + vec2(x, y) * t * 1.25, p.z - b));
  return s / 9.;
}
void main(){
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vW), L = uSun, H = normalize(L + V);
  vec3 alb = pow(vC * uTint, vec3(2.2));
  float rough = max(vM.x, .08), sss = vM.y, ndl = dot(N, L), nv = max(dot(N, V), 1e-3);
  float wrap = sss * .7, dif = clamp((ndl + wrap) / (1. + wrap), 0., 1.);
  float sh = shade(ndl);
  float a2 = pow(rough, 4.), nh = max(dot(N, H), 0.), dd = nh*nh*(a2 - 1.) + 1.;
  float spec = a2 / (3.14159 * dd * dd) * (.04 + .96 * pow(1. - max(dot(H, V), 0.), 5.)) * clamp(ndl, 0., 1.) * .25;
  vec3 hemi = mix(uGnd, uSky, N.y * .5 + .5);
  float fr = pow(1. - nv, 3.);
  vec3 c = alb * (uSunC * dif * sh + hemi * vO);
  c += alb * sss * vec3(1., .55, .4) * .25 * uSunC * (1. - dif) * vO;   // 젤리: 그늘 쪽에 속빛
  c += uSunC * spec * sh * vO;
  c += uRim * fr * vO * (.35 + .65 * sh);
  c += uFres * fr * 2.2 + uEmis;
  c = mix(c, vec3(6.), uFlash);
  float d = length(vW - uCam), f = 1. - exp(-max(d - uFogS, 0.) * uFogD);
  c = mix(c, uFog, clamp(f, 0., 1.));
  o = vec4(c, uAlpha);
}`;
const FS_DEPTH = `#version 300 es
precision mediump float; void main(){}`;
const VS_FULL = `#version 300 es
out vec2 vU; void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vU = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
const FS_SKY = `#version 300 es
precision highp float; in vec2 vU; uniform mat4 uIVP; uniform vec3 uCam, uSun, uZen, uHor, uSunC; out vec4 o;
void main(){
  vec4 p = uIVP * vec4(vU * 2. - 1., 1., 1.); vec3 r = normalize(p.xyz / p.w - uCam);
  float y = clamp(r.y, -.2, 1.), t = pow(clamp(y, 0., 1.), .55);
  vec3 c = mix(uHor, uZen, t);
  float s = max(dot(r, uSun), 0.);
  c += uSunC * (pow(s, 900.) * 40. + pow(s, 24.) * .35 + pow(s, 4.) * .08);
  o = vec4(c, 1.);
}`;
const VS_PT = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec4 aC; layout(location=2) in float aS;
uniform mat4 uVP; uniform float uPx; out vec4 vC;
void main(){ gl_Position = uVP * vec4(aP, 1.); gl_PointSize = clamp(aS * uPx / gl_Position.w, 1., 256.); vC = aC; }`;
const FS_PT = `#version 300 es
precision mediump float; in vec4 vC; out vec4 o;
void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r = dot(q, q); if (r > 1.) discard; float a = 1. - r; o = vec4(vC.rgb * vC.a * a * a, 0.); }`;
const FS_PRE = `#version 300 es
precision highp float; in vec2 vU; uniform sampler2D uS; uniform vec2 uTx; out vec4 o;
void main(){
  vec3 c = (texture(uS, vU + uTx * vec2(-1,-1)).rgb + texture(uS, vU + uTx * vec2(1,-1)).rgb + texture(uS, vU + uTx * vec2(-1,1)).rgb + texture(uS, vU + uTx * vec2(1,1)).rgb) * .25;
  float b = max(c.r, max(c.g, c.b)), k = clamp(b - 1.2, 0., 1.); k = k * k * .5;
  o = vec4(c * max(k, b - 1.7) / max(b, 1e-4), 1.);
}`;
const FS_DOWN = `#version 300 es
precision highp float; in vec2 vU; uniform sampler2D uS; uniform vec2 uTx; out vec4 o;
void main(){ o = vec4((texture(uS, vU + uTx * vec2(-1,-1)).rgb + texture(uS, vU + uTx * vec2(1,-1)).rgb + texture(uS, vU + uTx * vec2(-1,1)).rgb + texture(uS, vU + uTx * vec2(1,1)).rgb) * .25, 1.); }`;
const FS_UP = `#version 300 es
precision highp float; in vec2 vU; uniform sampler2D uS; uniform vec2 uTx; out vec4 o;
void main(){
  vec3 c = texture(uS, vU).rgb * 4.;
  c += (texture(uS, vU + uTx * vec2(-1,0)).rgb + texture(uS, vU + uTx * vec2(1,0)).rgb + texture(uS, vU + uTx * vec2(0,-1)).rgb + texture(uS, vU + uTx * vec2(0,1)).rgb) * 2.;
  c += texture(uS, vU + uTx * vec2(-1,-1)).rgb + texture(uS, vU + uTx * vec2(1,-1)).rgb + texture(uS, vU + uTx * vec2(-1,1)).rgb + texture(uS, vU + uTx * vec2(1,1)).rgb;
  o = vec4(c / 16., 1.);
}`;
const FS_FIN = `#version 300 es
precision highp float; in vec2 vU; uniform sampler2D uS, uB; uniform float uExpo, uBloom, uSat, uCon, uWarm, uVig; out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec3 c = texture(uS, vU).rgb + texture(uB, vU).rgb * uBloom;
  c = aces(c * uExpo);
  c *= vec3(1. + uWarm, 1., 1. - uWarm);
  float l = dot(c, vec3(.2126, .7152, .0722)); c = max(mix(vec3(l), c, uSat), 0.);
  c = pow(c, vec3(1. / 2.2));
  c = clamp((c - .5) * uCon + .5, 0., 1.);
  vec2 q = vU - .5; c *= 1. - uVig * smoothstep(.25, .85, length(q * vec2(1.1, .85)));
  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
  o = vec4(c, 1.);
}`;

type U = Record<string, WebGLUniformLocation | null>;
interface Prog { p: WebGLProgram; u: U }
interface RT { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

export class Gfx {
  gl: WebGL2RenderingContext;
  w = 1; h = 1;
  hdr: boolean;
  draws = 0;
  private lit: Prog; private dep: Prog; private sky: Prog; private pt: Prog; private pre: Prog; private down: Prog; private up: Prog; private fin: Prog;
  private shFb: WebGLFramebuffer; private shTex: WebGLTexture; private SH = 2048;
  private msFb!: WebGLFramebuffer; private msCol!: WebGLRenderbuffer; private msDep!: WebGLRenderbuffer;
  private scene!: RT; private bl: RT[] = [];
  private empty: WebGLVertexArrayObject;
  private ptVao: WebGLVertexArrayObject; private ptBuf: WebGLBuffer; private ptN = 0;

  constructor(cv: HTMLCanvasElement) {
    const gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('webgl2');
    this.gl = gl;
    this.hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    const mk = (vs: string, fs: string): Prog => {
      const p = gl.createProgram()!;
      for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
        const s = gl.createShader(t)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
      const u: U = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i)!.name;
        u[name] = gl.getUniformLocation(p, name);
      }
      return { p, u };
    };
    this.lit = mk(VS, FS); this.dep = mk(VS, FS_DEPTH); this.sky = mk(VS_FULL, FS_SKY); this.pt = mk(VS_PT, FS_PT);
    this.pre = mk(VS_FULL, FS_PRE); this.down = mk(VS_FULL, FS_DOWN); this.up = mk(VS_FULL, FS_UP); this.fin = mk(VS_FULL, FS_FIN);
    // 그림자 맵
    this.shTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.shTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, this.SH, this.SH);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.shFb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shTex, 0);
    this.empty = gl.createVertexArray()!;
    this.ptVao = gl.createVertexArray()!;
    this.ptBuf = gl.createBuffer()!;
    gl.bindVertexArray(this.ptVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
    gl.bindVertexArray(null);
  }

  upload(m: Mesh): GMesh {
    const gl = this.gl, vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, m.v, gl.STATIC_DRAW);
    const S = STRIDE * 4, at: [number, number, number][] = [[0, 3, 0], [1, 3, 3], [2, 3, 6], [3, 1, 9], [4, 2, 10], [5, 2, 12]];
    for (const [l, n, off] of at) gl.enableVertexAttribArray(l), gl.vertexAttribPointer(l, n, gl.FLOAT, false, S, off * 4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.i, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, n: m.i.length };
  }

  private rt(w: number, h: number, old?: RT): RT {
    const gl = this.gl;
    if (old) gl.deleteTexture(old.tex), gl.deleteFramebuffer(old.fb);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, this.hdr ? gl.RGBA16F : gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  resize(w: number, h: number) {
    if (w === this.w && h === this.h && this.scene) return;
    const gl = this.gl;
    this.w = w; this.h = h;
    if (this.msFb) gl.deleteFramebuffer(this.msFb), gl.deleteRenderbuffer(this.msCol), gl.deleteRenderbuffer(this.msDep);
    const fmt = this.hdr ? gl.RGBA16F : gl.RGBA8, samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
    this.msCol = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.msCol);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, fmt, w, h);
    this.msDep = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.msDep);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
    this.msFb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msCol);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msDep);
    this.scene = this.rt(w, h, this.scene);
    for (let i = 0; i < 5; i++) this.bl[i] = this.rt(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1)), this.bl[i]);
  }

  /** 빛 알갱이: [x, y, z, r, g, b, 세기, 크기] × n */
  points(data: Float32Array, n: number) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * 8), gl.DYNAMIC_DRAW);
    this.ptN = n;
  }

  /** 카메라 → [보기·투영 곱, 투영, 보기] */
  camera(c: Cam): { vp: M4; proj: M4; view: M4 } {
    const proj = persp(c.fov, this.w / this.h, 0.05, 40), view = lookAt(c.eye, c.at);
    return { vp: mul(proj, view), proj, view };
  }

  frame(c: Cam, L: Light, list: Draw[], t: number, shadowBox = 1.3) {
    const gl = this.gl, { vp } = this.camera(c);
    this.draws = 0;
    // 1) 그림자
    const lv = lookAt([L.sun[0] * 4, L.sun[1] * 4, L.sun[2] * 4], [0, 0, 0], [0, 1, 0]), lvp = mul(ortho(-shadowBox, shadowBox, -shadowBox, shadowBox, 0.5, 9), lv);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFb);
    gl.viewport(0, 0, this.SH, this.SH);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
    gl.useProgram(this.dep.p);
    gl.uniformMatrix4fv(this.dep.u.uVP, false, lvp);
    gl.uniform1f(this.dep.u.uT, t);
    for (const d of list) if ((d.pass ?? 0) === 0 && d.shadow !== false) {
      gl.uniformMatrix4fv(this.dep.u.uM, false, d.model);
      gl.bindVertexArray(d.m.vao);
      gl.drawElements(gl.TRIANGLES, d.m.n, gl.UNSIGNED_INT, 0);
      this.draws++;
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // 2) 장면
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFb);
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.useProgram(this.sky.p);
    gl.uniformMatrix4fv(this.sky.u.uIVP, false, invert(vp));
    gl.uniform3fv(this.sky.u.uCam, c.eye); gl.uniform3fv(this.sky.u.uSun, L.sun); gl.uniform3fv(this.sky.u.uZen, L.zen); gl.uniform3fv(this.sky.u.uHor, L.hor); gl.uniform3fv(this.sky.u.uSunC, L.sunC);
    gl.bindVertexArray(this.empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    const u = this.lit.u;
    gl.useProgram(this.lit.p);
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLVP, false, lvp); gl.uniform1f(u.uT, t);
    gl.uniform3fv(u.uCam, c.eye); gl.uniform3fv(u.uSun, L.sun); gl.uniform3fv(u.uSunC, L.sunC); gl.uniform3fv(u.uSky, L.sky); gl.uniform3fv(u.uGnd, L.gnd);
    gl.uniform3fv(u.uRim, L.rim); gl.uniform3fv(u.uFog, L.fog); gl.uniform1f(u.uFogD, L.fogD); gl.uniform1f(u.uFogS, L.fogS);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shTex); gl.uniform1i(u.uSh, 0);
    const one = [1, 1, 1], zero = [0, 0, 0];
    for (const pass of [0, 1, 2] as const) {
      if (pass === 1) gl.enable(gl.BLEND), gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA), gl.depthMask(false);
      if (pass === 2) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      for (const d of list) {
        if ((d.pass ?? 0) !== pass) continue;
        gl.uniformMatrix4fv(u.uM, false, d.model);
        gl.uniform3fv(u.uTint, d.tint ?? one); gl.uniform3fv(u.uEmis, d.emis ?? zero); gl.uniform3fv(u.uFres, d.fres ?? zero);
        gl.uniform1f(u.uFlash, d.flash ?? 0); gl.uniform1f(u.uAlpha, d.alpha ?? 1);
        gl.bindVertexArray(d.m.vao);
        gl.drawElements(gl.TRIANGLES, d.m.n, gl.UNSIGNED_INT, 0);
        this.draws++;
      }
    }
    if (this.ptN) {
      gl.useProgram(this.pt.p);
      gl.uniformMatrix4fv(this.pt.u.uVP, false, vp);
      gl.uniform1f(this.pt.u.uPx, this.h / (2 * Math.tan(c.fov / 2)));
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(this.ptVao);
      gl.drawArrays(gl.POINTS, 0, this.ptN);
    }
    gl.disable(gl.BLEND); gl.depthMask(true); gl.disable(gl.DEPTH_TEST);
    // 3) MSAA → 텍스처
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.scene.fb);
    gl.blitFramebuffer(0, 0, this.w, this.h, 0, 0, this.w, this.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    // 4) 블룸
    gl.bindVertexArray(this.empty);
    const pass = (p: Prog, src: RT, dst: RT) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
      gl.useProgram(p.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(p.u.uS, 0);
      gl.uniform2f(p.u.uTx, 1 / src.w, 1 / src.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    pass(this.pre, this.scene, this.bl[0]);
    for (let i = 1; i < 5; i++) pass(this.down, this.bl[i - 1], this.bl[i]);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = 4; i > 0; i--) pass(this.up, this.bl[i], this.bl[i - 1]);
    gl.disable(gl.BLEND);
    // 5) 마무리
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.w, this.h);
    const f = this.fin;
    gl.useProgram(f.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.scene.tex); gl.uniform1i(f.u.uS, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.bl[0].tex); gl.uniform1i(f.u.uB, 1);
    gl.uniform1f(f.u.uExpo, L.expo); gl.uniform1f(f.u.uBloom, L.bloom); gl.uniform1f(f.u.uSat, L.sat); gl.uniform1f(f.u.uCon, L.con); gl.uniform1f(f.u.uWarm, L.warm); gl.uniform1f(f.u.uVig, L.vig);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }
}
export { ident };
