/**
 * 효과음 (M1): WebAudio로 즉석 합성 — 소리 파일 0개.
 * 첫 사용자 입력 전에는 AudioContext를 만들지 않는다(브라우저 자동재생 정책). 오디오가 없거나 실패해도 게임은 멈추지 않는다.
 */
import type { GameEvent } from './sim.ts';

type Ctx = AudioContext;

export interface Sfx {
  unlock(): void;
  play(e: GameEvent): void;
  ui(kind: 'start' | 'pause' | 'pick'): void;
  muted: boolean;
}

export function createSfx(): Sfx {
  let ac: Ctx | null = null, master: GainNode | null = null, noise: AudioBuffer | null = null;
  let voices = 0;
  const lastAt: Record<string, number> = {};
  const sfx: Sfx = {
    muted: false,
    unlock() {
      try {
        if (!ac) {
          const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
            ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) return;
          ac = new AC();
          master = ac.createGain();
          master.gain.value = 0.5;
          // 리미터 대신 가벼운 컴프레서 — 동시에 여러 소리가 나도 찢어지지 않게
          const comp = ac.createDynamicsCompressor();
          comp.threshold.value = -14;
          comp.ratio.value = 6;
          master.connect(comp).connect(ac.destination);
          noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
          const d = noise.getChannelData(0);
          let x = 12345;
          for (let i = 0; i < d.length; i++) (x = (x * 1103515245 + 12345) >>> 0), (d[i] = (x / 2147483648) - 1);
        }
        if (ac.state === 'suspended') void ac.resume();
      } catch {
        ac = null;
      }
    },
    play(e) {
      if (!ac || !master || sfx.muted) return;
      const t = ac.currentTime;
      // 같은 소리는 40ms(총은 70ms)에 한 번만 — 몰려 터질 때 귀가 아프지 않게 (리뷰)
      if (t - (lastAt[e.type] ?? -1) < (e.type === 'fire' ? 0.07 : 0.04)) return;
      lastAt[e.type] = t;
      try {
        switch (e.type) {
          case 'fire':
            // 리뷰 R2: 자동 사격음이 콤보 음계를 덮는다 → 편대 사격만, 아주 작게. 포탑은 무음
            if (e.from !== 'ship') return;
            tone(t, 880, 1320, 0.035, 0.018, 'triangle');
            break;
          case 'hit':
            tone(t, 1800, 1200, 0.03, 0.08, 'triangle');
            break;
          case 'kill': {
            // 콤보마다 반음씩 올라간다(최대 한 옥타브) — "이어 간다"는 걸 귀로 안다
            const semi = [0, 2, 4, 5, 7, 9, 11, 12][Math.min(7, e.combo - 1)], base = (e.big ? 220 : 392) * 2 ** (semi / 12);
            tone(t, base * 1.5, base, 0.12, 0.22, 'triangle');
            burstNoise(t, e.big ? 0.25 : 0.12, e.big ? 900 : 2200, e.big ? 0.5 : 0.3);
            if (e.by === 'body') tone(t, 160, 70, 0.14, 0.22, 'sine'); // 행성 피격(0.8)과 귀로 구분되게 작게
            break;
          }
          case 'impact':
            tone(t, 110, 35, 0.45, 0.8, 'sine');
            burstNoise(t, 0.4, 500, 0.7);
            break;
          case 'reroll':
            [660, 880].forEach((f, k) => tone(t + k * 0.05, f, f * 1.2, 0.08, 0.12, 'triangle'));
            break;
          case 'clear':
            [784, 988, 1175].forEach((f, k) => tone(t + k * 0.08, f, f, 0.2, 0.14, 'sine'));
            break;
          case 'offer':
            tone(t, 1046, 1046, 0.12, 0.18, 'sine');
            tone(t + 0.06, 1568, 1568, 0.14, 0.12, 'sine');
            break;
          case 'build':
            [523, 659, 784, 1046].forEach((f, k) => tone(t + k * 0.055, f, f, 0.16, 0.2, 'triangle'));
            break;
          case 'dead':
            tone(t, 300, 40, 1.2, 0.6, 'sawtooth');
            burstNoise(t, 1, 400, 0.6);
            break;
        }
      } catch {
        /* 소리 실패는 무시 */
      }
    },
    ui(kind) {
      if (!ac || !master || sfx.muted) return;
      const t = ac.currentTime;
      if (kind === 'start') [392, 523, 784].forEach((f, k) => tone(t + k * 0.07, f, f, 0.14, 0.2, 'triangle'));
      else if (kind === 'pause') tone(t, 600, 400, 0.08, 0.15, 'sine');
      else tone(t, 900, 1200, 0.05, 0.12, 'sine');
    },
  };

  /** 동시 발음 상한 — 넘으면 새 소리를 버린다 */
  function voice(node: AudioScheduledSourceNode) {
    voices++;
    node.onended = () => voices--;
  }

  function tone(t: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType) {
    if (voices >= 14) return;
    const o = ac!.createOscillator(), g = ac!.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master!);
    voice(o);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function burstNoise(t: number, dur: number, cutoff: number, vol: number) {
    if (voices >= 14) return;
    const src = ac!.createBufferSource(), f = ac!.createBiquadFilter(), g = ac!.createGain();
    src.buffer = noise;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff * 0.2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master!);
    voice(src);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return sfx;
}
