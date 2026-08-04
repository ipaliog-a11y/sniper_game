/**
 * Procedural Web Audio — no sample files, no loading.
 *
 * The important cue is still the delayed impact: steel at long range rings back
 * after TOF + range/c, because waiting for that is half of shooting at distance.
 * Everything else is layered so bare muzzle, brake, and can sound different,
 * and wind is a soft bed rather than white hiss.
 */

const SPEED_OF_SOUND = 343;

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private windBus: GainNode | null = null;
  private uiBus: GainNode | null = null;
  private white: AudioBuffer | null = null;
  private pink: AudioBuffer | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  /** Master on/off (settings.sound). */
  enabled = true;
  /** 0..1 user master volume. */
  private masterVolume = 1;
  private sfxOn = true;
  private envOn = true;

  /** Internal headroom before the compressor; scaled by masterVolume. */
  private static readonly MASTER_BASE = 0.72;
  private static readonly SFX_GAIN = 1;
  private static readonly UI_GAIN = 0.55;
  private static readonly WIND_GAIN = 0.85;

  /**
   * Apply settings from the profile. Safe before unlock (stores values; gains
   * apply when the context is created).
   */
  applySettings(opts: {
    sound: boolean;
    masterVolume: number;
    soundSfx: boolean;
    soundEnv: boolean;
  }): void {
    this.enabled = opts.sound;
    this.masterVolume = Math.max(0, Math.min(1, opts.masterVolume));
    this.sfxOn = opts.soundSfx;
    this.envOn = opts.soundEnv;
    this.applyGains();
    // If environment is muted, collapse the live wind bed immediately.
    if (!this.envOn || !this.enabled) this.stopWind();
  }

  private applyGains(): void {
    if (!this.master) return;
    const masterOn = this.enabled ? Audio.MASTER_BASE * this.masterVolume : 0;
    this.master.gain.setTargetAtTime(masterOn, this.ctx!.currentTime, 0.02);
    if (this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(
        this.sfxOn && this.enabled ? Audio.SFX_GAIN : 0,
        this.ctx!.currentTime,
        0.02,
      );
    }
    if (this.uiBus) {
      this.uiBus.gain.setTargetAtTime(
        this.sfxOn && this.enabled ? Audio.UI_GAIN : 0,
        this.ctx!.currentTime,
        0.02,
      );
    }
    if (this.windBus) {
      this.windBus.gain.setTargetAtTime(
        this.envOn && this.enabled ? Audio.WIND_GAIN : 0,
        this.ctx!.currentTime,
        0.05,
      );
    }
  }

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

    // Master: soft limiter so layered shots stay full without hard clipping.
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? Audio.MASTER_BASE * this.masterVolume : 0;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    this.master.connect(comp).connect(this.ctx.destination);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn && this.enabled ? Audio.SFX_GAIN : 0;
    this.sfxBus.connect(this.master);

    this.windBus = this.ctx.createGain();
    this.windBus.gain.value = this.envOn && this.enabled ? Audio.WIND_GAIN : 0;
    this.windBus.connect(this.master);

    this.uiBus = this.ctx.createGain();
    this.uiBus.gain.value = this.sfxOn && this.enabled ? Audio.UI_GAIN : 0;
    this.uiBus.connect(this.master);

    this.white = this.makeWhite(2);
    this.pink = this.makePink(4);
    this.applyGains();
  }

  private makeWhite(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Voss-ish pink: softer highs for wind beds that do not scream. */
  private makePink(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = pink * 0.11;
    }
    return buffer;
  }

  private get live(): boolean {
    return this.enabled && this.ctx !== null && this.master !== null && this.sfxBus !== null;
  }

  private get sfxLive(): boolean {
    return this.live && this.sfxOn;
  }

  private get envLive(): boolean {
    return this.live && this.envOn;
  }

  private noiseBurst(
    bus: GainNode,
    buffer: AudioBuffer,
    delay: number,
    duration: number,
    gain: number,
    filterType: BiquadFilterType,
    frequency: number,
    q = 1,
    attack = 0.003,
  ): void {
    if (!this.live) return;
    const ctx = this.ctx!;
    const at = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    // Random start so successive shots do not phase-lock the noise buffer.
    const offset = Math.random() * Math.max(0.01, buffer.duration - 0.05);

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, at);
    filter.Q.value = q;

    const env = ctx.createGain();
    const peak = Math.max(0.0002, gain);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(peak, at + Math.max(0.001, attack));
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    src.connect(filter).connect(env).connect(bus);
    src.start(at, offset);
    src.stop(at + duration + 0.06);
  }

  private tone(
    bus: GainNode,
    delay: number,
    frequency: number,
    duration: number,
    gain: number,
    type: OscillatorType = 'sine',
    bendTo?: number,
    attack = 0.004,
  ): void {
    if (!this.live) return;
    const ctx = this.ctx!;
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, frequency), at);
    if (bendTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, bendTo), at + duration);
    }
    const env = ctx.createGain();
    const peak = Math.max(0.0002, gain);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(peak, at + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(env).connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  /**
   * The shot.
   * @param loudness 1 bare, ~1.3 brake, ~0.35 can
   * @param calibre 0 light (.308-ish) … 1 heavy (.50)
   * @param signature 0 quiet dust … 1 brake cloud (more open “bark”)
   */
  shot(loudness: number, calibre = 0.35, signature = 0.7): void {
    if (!this.sfxLive || !this.white || !this.pink || !this.sfxBus) return;
    const bus = this.sfxBus;
    const l = Math.max(0.12, Math.min(1.45, loudness));
    const cal = Math.max(0, Math.min(1, calibre));
    const sig = Math.max(0.05, Math.min(1.2, signature));
    const suppressed = l < 0.55;

    // Crack — sharp transient; cans kill most of this.
    const crackGain = suppressed ? 0.08 * l : 0.42 * l * (0.55 + 0.45 * sig);
    this.noiseBurst(
      bus,
      this.white,
      0,
      0.035 + 0.04 * l,
      crackGain,
      'highpass',
      suppressed ? 1800 : 1200 + 900 * (1 - cal),
      0.7,
      0.0015,
    );

    // Mid body / “report” — brake pushes this up; can softens and lengthens.
    const bodyDur = (suppressed ? 0.22 : 0.12) + 0.18 * l + 0.12 * cal;
    this.noiseBurst(
      bus,
      this.pink,
      0.002,
      bodyDur,
      (suppressed ? 0.28 : 0.38) * l,
      'bandpass',
      suppressed ? 280 + 80 * cal : 380 + 120 * sig - 60 * cal,
      suppressed ? 0.8 : 1.4,
      0.004,
    );

    // Chest thump — heavier calibres go lower and longer.
    const thumpF = 72 - 28 * cal;
    this.tone(
      bus,
      0,
      thumpF,
      0.22 + 0.28 * cal + 0.1 * l,
      (suppressed ? 0.28 : 0.32) * l * (0.7 + 0.3 * cal),
      'triangle',
      thumpF * 0.45,
      0.008,
    );
    this.tone(
      bus,
      0.01,
      thumpF * 0.55,
      0.35 + 0.25 * cal,
      0.14 * l * (0.5 + 0.5 * cal),
      'sine',
      thumpF * 0.3,
      0.012,
    );

    // Open report tail (bare / brake) — short “echo” into the landscape.
    if (!suppressed && l > 0.55) {
      this.noiseBurst(
        bus,
        this.pink,
        0.08 + 0.04 * sig,
        0.35 + 0.25 * l,
        0.09 * l * sig,
        'lowpass',
        520 - 100 * cal,
        0.6,
        0.02,
      );
      // Light slap delay for space without a convolver.
      this.noiseBurst(
        bus,
        this.white,
        0.14,
        0.12,
        0.04 * l * sig,
        'bandpass',
        900,
        2,
        0.01,
      );
    }

    // Suppressor: soft gas hiss instead of crack.
    if (suppressed) {
      this.noiseBurst(bus, this.pink, 0.01, 0.35, 0.12 * l, 'lowpass', 420, 0.5, 0.02);
    }
  }

  /**
   * Steel, heard after the bullet arrives and the sound comes home.
   * @param centred 0 rim … 1 dead centre (brighter, longer ring)
   */
  impactSteel(rangeM: number, tof: number, centred: number): void {
    if (!this.sfxLive || !this.white || !this.sfxBus) return;
    const bus = this.sfxBus;
    const delay = tof + rangeM / SPEED_OF_SOUND;
    // Distance: quieter and duller far out (air + you are behind a tube).
    const dist = Math.max(0.22, Math.min(1, 180 / Math.max(80, rangeM)));
    const q = Math.max(0, Math.min(1, centred));
    const fund = 480 + 420 * q + 40 * (1 - dist);

    // Attack tick — the “tick” of bullet on plate.
    this.noiseBurst(
      bus,
      this.white,
      delay,
      0.04,
      0.11 * dist * (0.6 + 0.4 * q),
      'bandpass',
      fund * 2.2,
      8,
      0.001,
    );

    // Inharmonic partials — reads as steel, not a pure beep.
    const partials: Array<[number, number, number]> = [
      [1.0, 0.14 * dist, 1.15 + 0.35 * q],
      [1.47, 0.08 * dist, 0.75 + 0.25 * q],
      [2.11, 0.05 * dist * (0.5 + 0.5 * q), 0.45 + 0.2 * q],
      [2.76, 0.028 * dist * q, 0.3],
    ];
    for (const [ratio, gain, dur] of partials) {
      const f = fund * ratio;
      this.tone(bus, delay, f, dur, gain, 'sine', f * 0.92, 0.002);
    }
  }

  impactDirt(rangeM: number, tof: number): void {
    if (!this.sfxLive || !this.white || !this.pink || !this.sfxBus) return;
    const bus = this.sfxBus;
    const delay = tof + rangeM / SPEED_OF_SOUND;
    const dist = Math.max(0.2, Math.min(1, 200 / Math.max(80, rangeM)));
    this.noiseBurst(bus, this.pink, delay, 0.32, 0.16 * dist, 'lowpass', 340, 0.7, 0.008);
    this.noiseBurst(bus, this.white, delay + 0.01, 0.12, 0.07 * dist, 'bandpass', 700, 1.5, 0.004);
    this.tone(bus, delay, 58, 0.22, 0.09 * dist, 'sine', 36, 0.01);
  }

  /** Bolt cycle — open, extract, close. */
  bolt(): void {
    if (!this.sfxLive || !this.white || !this.sfxBus) return;
    const bus = this.sfxBus;
    this.noiseBurst(bus, this.white, 0, 0.04, 0.1, 'bandpass', 2100, 4, 0.002);
    this.tone(bus, 0.01, 190, 0.05, 0.04, 'triangle', 140, 0.003);
    this.noiseBurst(bus, this.white, 0.14, 0.055, 0.12, 'bandpass', 1450, 3.5, 0.002);
    this.tone(bus, 0.15, 120, 0.06, 0.035, 'triangle', 90, 0.004);
    this.noiseBurst(bus, this.white, 0.32, 0.045, 0.09, 'bandpass', 2600, 5, 0.002);
  }

  /** Semi auto cycle — short gas/eject tick, not a full bolt throw. */
  semiCycle(): void {
    if (!this.sfxLive || !this.white || !this.pink || !this.sfxBus) return;
    const bus = this.sfxBus;
    this.noiseBurst(bus, this.pink, 0.02, 0.08, 0.07, 'bandpass', 900, 1.2, 0.003);
    this.noiseBurst(bus, this.white, 0.05, 0.035, 0.08, 'bandpass', 2400, 5, 0.001);
    this.tone(bus, 0.06, 280, 0.04, 0.03, 'triangle', 160, 0.002);
  }

  /** Turret / dry click. */
  click(): void {
    if (!this.sfxLive || !this.white || !this.uiBus) return;
    this.noiseBurst(this.uiBus, this.white, 0, 0.018, 0.09, 'bandpass', 2800, 10, 0.001);
    this.tone(this.uiBus, 0, 1400, 0.03, 0.03, 'sine', 900, 0.001);
  }

  /** Soft UI confirm — equipment, not a game-menu blip. */
  tap(): void {
    if (!this.sfxLive || !this.uiBus) return;
    this.tone(this.uiBus, 0, 720, 0.045, 0.045, 'sine', 480, 0.003);
  }

  chime(good: boolean): void {
    if (!this.sfxLive || !this.uiBus) return;
    const bus = this.uiBus;
    if (good) {
      this.tone(bus, 0, 523, 0.16, 0.07, 'sine', 523, 0.006);
      this.tone(bus, 0.07, 659, 0.22, 0.065, 'sine', 659, 0.006);
      this.tone(bus, 0.14, 784, 0.32, 0.05, 'sine', 784, 0.008);
    } else {
      this.tone(bus, 0, 196, 0.28, 0.08, 'triangle', 140, 0.01);
      this.tone(bus, 0.05, 155, 0.35, 0.05, 'sine', 110, 0.012);
    }
  }

  /** Ambient wind from firing-point speed (m/s). */
  setWind(speedMs: number): void {
    if (!this.envLive || !this.pink || !this.windBus) return;
    const ctx = this.ctx!;
    if (!this.windSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.pink;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.55;

      const hipass = ctx.createBiquadFilter();
      hipass.type = 'highpass';
      hipass.frequency.value = 80;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      // Slow LFO: gust pressure on the bed, not a siren.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.11;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.018;
      lfo.connect(lfoDepth);
      lfoDepth.connect(gain.gain);
      lfo.start();

      const lfoF = ctx.createOscillator();
      lfoF.type = 'sine';
      lfoF.frequency.value = 0.07;
      const lfoFDepth = ctx.createGain();
      lfoFDepth.gain.value = 40;
      lfoF.connect(lfoFDepth);
      lfoFDepth.connect(filter.frequency);
      lfoF.start();

      src.connect(hipass).connect(filter).connect(gain).connect(this.windBus);
      src.start();
      this.windSource = src;
      this.windFilter = filter;
      this.windGain = gain;
    }

    // Cap so a storm is present but never drowns the shot.
    const target = Math.min(0.1, 0.012 + speedMs * 0.009);
    this.windGain!.gain.setTargetAtTime(target, ctx.currentTime, 0.45);
    this.windFilter!.frequency.setTargetAtTime(260 + speedMs * 55, ctx.currentTime, 0.55);
  }

  stopWind(): void {
    if (!this.windGain || !this.ctx) return;
    this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
  }
}

export const audio = new Audio();
