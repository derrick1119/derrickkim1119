/**
 * 풍선 팡 연쇄 — 사운드 v0 (C008, ART §7). WebAudio 합성만(파일·외부 저작물 없음).
 * - 첫 터치(사용자 손짓) 뒤에만 AudioContext를 만든다 → 그 전엔 아무 소리도 안 난다.
 * - 음소거는 저장한다. 저장소가 막혀도(localStorage 없음) 이번 세션 안에서는 그대로 동작.
 * - 시뮬 사건(s.events) → 소리 신호(cues)는 순수 함수라 테스트로 잰다. 시뮬은 소리를 모른다(결정성 그대로).
 */

export interface SoundStore { get(k: string): number; set(k: string, v: number): void }
/** 한 소리: f Hz, at초 뒤, dur초. noise = 짧은 잡음(팡의 '파'), glide = 시작 음높이 배수(1.6 → 1) */
export interface Cue { f: number; type: OscillatorType | 'noise'; at: number; dur: number; gain: number; glide?: number }
interface SimEv { kind: string; v?: number; z?: number }

/** C 장조 펜타토닉 C5 D5 E5 G5 A5 C6 D6 E6 G6 A6 — 연쇄 n번째마다 한 칸 위로, 10칸 상한 */
export const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
const POPS = new Set(['pop', 'water', 'fire', 'king']);
/** 같은 틱 팡은 화음으로 최대 3보이스 */
export const MAX_POP_VOICES = 3;

export function cues(evs: SimEv[]): Cue[] {
  const out: Cue[] = [];
  let voices = 0, noise = false;
  for (const e of evs) {
    if (POPS.has(e.kind)) {
      if (voices >= MAX_POP_VOICES) continue;
      voices++;
      const f = PENTA[Math.min(PENTA.length - 1, Math.max(0, (e.z ?? 1) - 1))];
      if (!noise) (noise = true), out.push({ f: 0, type: 'noise', at: 0, dur: 0.012, gain: 0.12 });
      // 크기별 음색: 작은 원 = 삼각 고음, 그 밖 = 사인, 대왕 = 사인 + 옥타브 아래
      out.push({ f, type: (e.v ?? 0.2) < 0.17 ? 'triangle' : 'sine', at: 0, dur: 0.22, gain: 0.16, glide: 1.6 });
      if (e.kind === 'king') out.push({ f: f / 2, type: 'sine', at: 0, dur: 0.5, gain: 0.18 });
    } else if (e.kind === 'tap') out.push({ f: 1200, type: 'triangle', at: 0, dur: 0.03, gain: 0.14 });
    else if (e.kind === 'clang') for (const r of [1, 2.76, 5.4]) out.push({ f: 900 * r, type: 'sine', at: 0, dur: 0.25, gain: 0.05 });
    else if (e.kind === 'miss') out.push({ f: 700, type: 'sine', at: 0, dur: 0.05, gain: 0.04, glide: 1.4 });
    else if (e.kind === 'save' || e.kind === 'land') out.push({ f: 660, type: 'sine', at: 0, dur: 0.16, gain: 0.12, glide: 1.5 });
    else if (e.kind === 'flop') out.push({ f: 160, type: 'sine', at: 0, dur: 0.12, gain: 0.18 });
    // 클리어: C–E–G–C 아르페지오
    else if (e.kind === 'clear') [523.25, 659.25, 783.99, 1046.5].forEach((f, j) => out.push({ f, type: 'triangle', at: j * 0.09, dur: 0.2, gain: 0.12 }));
    // 큰 연쇄(≥7)의 끝맺음: 꼭대기 음 반복으로 밋밋하게 끝나지 않게 반짝 두 음 (C008 🧪 ⑥3)
    else if (e.kind === 'chainEnd' && (e.v ?? 0) >= 7) [1567.98, 2093].forEach((f, j) => out.push({ f, type: 'triangle', at: 0.06 + j * 0.09, dur: 0.28, gain: 0.11 }));
    // 실패는 장난스러운 하강(장조, 단조 금지)
    else if (e.kind === 'fail') [783.99, 659.25, 587.33, 523.25].forEach((f, j) => out.push({ f, type: 'sine', at: j * 0.07, dur: 0.12, gain: 0.1 }));
  }
  return out;
}

export interface Sound { readonly muted: boolean; readonly ready: boolean; unlock(): void; toggle(): boolean; play(evs: SimEv[]): number }

export function makeSound(store: SoundStore, make: () => AudioContext | null = () => {
  const C = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  try { return C ? new C() : null; } catch { return null; }
}): Sound {
  let ctx: AudioContext | null = null, master: GainNode | null = null, noiseBuf: AudioBuffer | null = null;
  let muted = store.get('mute') === 1;
  const voice = (c: Cue) => {
    const t0 = ctx!.currentTime + c.at, g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(c.gain, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + c.dur);
    g.connect(master!);
    if (c.type === 'noise') {
      const src = ctx!.createBufferSource();
      src.buffer = noiseBuf;
      src.connect(g);
      src.start(t0);
      return;
    }
    const o = ctx!.createOscillator();
    o.type = c.type;
    o.frequency.setValueAtTime(c.f * (c.glide ?? 1), t0);
    if (c.glide) o.frequency.exponentialRampToValueAtTime(c.f, t0 + 0.05);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + c.dur + 0.02);
  };
  return {
    get muted() { return muted; },
    get ready() { return !!ctx; },
    /** 사용자 손짓(pointerdown·keydown) 안에서만 부른다 — 브라우저 자동 재생 규칙 */
    unlock() {
      // iOS Safari는 touchend·click 손짓에서만 소리를 여는 일이 있어 손짓마다 resume + 무음 한 샘플을 튼다 (C009 🧪)
      const kick = () => { try { void ctx!.resume?.(); const b = ctx!.createBufferSource(); b.buffer = ctx!.createBuffer(1, 1, ctx!.sampleRate); b.connect(ctx!.destination); b.start(0); } catch { /* 소리 없이도 동작 */ } };
      if (ctx) return kick();
      ctx = make();
      if (!ctx) return;
      master = ctx.createGain();
      master.gain.value = 0.6;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);
      const n = Math.max(1, Math.round(ctx.sampleRate * 0.012));
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      kick();
    },
    toggle() {
      muted = !muted;
      store.set('mute', muted ? 1 : 0);
      return muted;
    },
    /** 이번 틱의 새 사건들을 소리로. 낸 소리 수(테스트용) */
    play(evs) {
      if (!ctx || !master || muted || !evs.length) return 0;
      const cs = cues(evs);
      for (const c of cs) voice(c);
      return cs.length;
    },
  };
}
