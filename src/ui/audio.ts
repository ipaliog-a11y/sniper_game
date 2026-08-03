/**
 * Every sound is synthesised — no files, no loading. The important one is the
 * impact: steel at 900 m rings back two and a half seconds after the shot,
 * because that is how long the sound takes to come home, and waiting for it is
 * half of what shooting at distance feels like.
 */

const SPEED_OF_SOUND = 343;

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  enabled = true;

  /** Browsers will not start audio until a gesture, so this is called on tap. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    type WithWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (globalThis as WithWebkit).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);

    const length = Math.floor(this.ctx.sampleRate * 2);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
  }

  private get live(): boolean {
    return this.enabled && this.ctx !== null && this.master !== null;
  }

  private burst(
    delay: number,
    duration: number,
    gain: number,
    filterType: BiquadFilterType,
    frequency: number,
    q = 1,
  ): void {
    if (!this.live || !this.noise) return;
    const ctx = this.ctx!;
    const at = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(filter).connect(env).connect(this.master!);
    src.start(at);
    src.stop(at + duration + 0.05);
  }

  private tone(
    delay: number,
    frequency: number,
    duration: number,
    gain: number,
    type: OscillatorType = 'sine',
    bendTo?: number,
  ): void {
    if (!this.live) return;
    const ctx = this.ctx!;
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    if (bendTo !== undefined) osc.frequency.exponentialRampToValueAtTime(bendTo, at + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(env).connect(this.master!);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  /** The shot. `loudness` is 1 for a bare muzzle, about a third for a can. */
  shot(loudness: number, calibreWeight: number): void {
    const l = Math.max(0.15, loudness);
    this.burst(0, 0.05 + 0.2 * l, 0.55 * l, 'highpass', 700 + 400 * (1 - l));
    this.burst(0.004, 0.35 + 0.4 * l, 0.4 * l, 'lowpass', 220 - 60 * calibreWeight);
    this.tone(0, 90 - 30 * calibreWeight, 0.28 + 0.2 * l, 0.35 * l, 'triangle', 40);
    if (l > 0.6) this.burst(0.12, 0.5, 0.1 * l, 'lowpass', 400);
  }

  /** Steel, heard after the bullet gets there and the sound comes back. */
  impactSteel(rangeM: number, tof: number, centred: number): void {
    const delay = tof + rangeM / SPEED_OF_SOUND;
    const pitch = 620 + 500 * centred;
    this.tone(delay, pitch, 0.9, 0.16, 'sine', pitch * 0.55);
    this.tone(delay + 0.005, pitch * 1.51, 0.55, 0.07, 'sine');
    this.burst(delay, 0.05, 0.09, 'bandpass', pitch * 2, 6);
  }

  impactDirt(rangeM: number, tof: number): void {
    const delay = tof + rangeM / SPEED_OF_SOUND;
    this.burst(delay, 0.28, 0.14, 'lowpass', 300);
    this.tone(delay, 70, 0.2, 0.08, 'sine', 45);
  }

  bolt(): void {
    this.burst(0, 0.05, 0.09, 'bandpass', 1800, 3);
    this.burst(0.13, 0.06, 0.11, 'bandpass', 1200, 3);
    this.burst(0.3, 0.05, 0.08, 'bandpass', 2400, 4);
  }

  click(): void {
    this.burst(0, 0.02, 0.07, 'bandpass', 3200, 8);
  }

  tap(): void {
    this.tone(0, 880, 0.05, 0.04, 'square');
  }

  chime(good: boolean): void {
    if (good) {
      this.tone(0, 660, 0.18, 0.09, 'sine');
      this.tone(0.09, 990, 0.3, 0.08, 'sine');
    } else {
      this.tone(0, 220, 0.3, 0.09, 'sine', 150);
    }
  }

  /** Ambient wind, driven straight off the wind speed at the firing point. */
  setWind(speedMs: number): void {
    if (!this.live || !this.noise) return;
    const ctx = this.ctx!;
    if (!this.windSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.master!);
      src.start();
      this.windSource = src;
      this.windFilter = filter;
      this.windGain = gain;
    }
    const target = Math.min(0.12, speedMs * 0.011);
    this.windGain!.gain.setTargetAtTime(target, ctx.currentTime, 0.4);
    this.windFilter!.frequency.setTargetAtTime(
      280 + speedMs * 45,
      ctx.currentTime,
      0.5,
    );
  }

  stopWind(): void {
    if (!this.windGain || !this.ctx) return;
    this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }
}

export const audio = new Audio();
