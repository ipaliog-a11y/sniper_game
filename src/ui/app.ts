import { setLanguage } from '../core/i18n';
import { type Profile, loadProfile, saveProfile } from '../core/store';
import { type Rect, drawShellBackground, fillPanel } from './gfx';
import { Input } from './input';
import { C, font } from './theme';
import { Ui } from './ui';

/**
 * The shell: one canvas, one scene at a time, and a frame loop that never lets
 * a stalled tab produce a two-second delta and teleport a bullet.
 */

export interface Scene {
  readonly name: string;
  enter?(app: App): void;
  exit?(app: App): void;
  update(dt: number, app: App): void;
  render(ctx: CanvasRenderingContext2D, app: App): void;
}

export interface Toast {
  message: string;
  until: number;
  tone: 'info' | 'good' | 'bad';
}

export class App {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly input: Input;
  readonly ui: Ui;
  profile: Profile;

  width = 0;
  height = 0;
  dpr = 1;
  /** Elapsed wall time since boot, seconds. Drives every animation. */
  time = 0;

  private scene: Scene | null = null;
  private pending: Scene | null = null;
  private stack: Scene[] = [];
  private toasts: Toast[] = [];
  private lastFrame = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('This browser has no 2D canvas.');
    this.ctx = ctx;
    this.input = new Input(canvas);
    this.ui = new Ui(ctx, this.input);
    this.profile = loadProfile();
    setLanguage(this.profile.settings.language);
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    this.resize();
  }

  // --- layout ----------------------------------------------------------

  private resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.dpr = dpr;
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.input.setScale(1);
  };

  /**
   * The usable box, kept clear of notches and home indicators.
   * On wide / ultrawide screens the column is capped and centered so menus
   * and full-width buttons do not stretch edge-to-edge.
   */
  get safe(): Rect {
    const pad = Math.max(10, Math.min(this.width, this.height) * 0.022);
    const top = pad + (this.height > this.width ? 12 : 0);
    const bottom = pad + 6;
    const available = this.width - pad * 2;
    // ~large-phone / small-tablet width; still wide enough for two-col weather.
    const maxContentW = 720 * this.gauge;
    const w = Math.min(available, maxContentW);
    const x = (this.width - w) / 2;
    return { x, y: top, w, h: this.height - top - bottom };
  }

  get portrait(): boolean {
    return this.height > this.width;
  }

  /** Scale factor for type and controls on very small or very large screens. */
  get gauge(): number {
    return Math.max(0.82, Math.min(1.5, Math.min(this.width, this.height) / 420));
  }

  // --- scenes ----------------------------------------------------------

  set(scene: Scene): void {
    this.stack = [];
    this.pending = scene;
  }

  push(scene: Scene): void {
    if (this.scene) this.stack.push(this.scene);
    this.pending = scene;
  }

  pop(): void {
    const previous = this.stack.pop();
    if (previous) this.pending = previous;
  }

  get current(): Scene | null {
    return this.scene;
  }

  private swap(): void {
    if (!this.pending) return;
    this.scene?.exit?.(this);
    this.scene = this.pending;
    this.pending = null;
    this.scene.enter?.(this);
  }

  // --- profile ---------------------------------------------------------

  save(): void {
    saveProfile(this.profile);
  }

  // --- toasts ----------------------------------------------------------

  toast(message: string, tone: Toast['tone'] = 'info'): void {
    this.toasts.push({ message, tone, until: this.time + 2.6 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  // --- loop ------------------------------------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.frame);
  }

  /**
   * Leave the game from the main menu. Saves first, stops the loop and audio,
   * then tries to close the tab. Most browsers only allow close when the page
   * opened itself — otherwise a static “safe to close” screen stays up.
   */
  quit(message?: string): void {
    this.save();
    this.running = false;
    this.scene?.exit?.(this);
    this.scene = null;
    this.pending = null;
    this.stack = [];
    try {
      window.close();
    } catch {
      /* blocked by the browser */
    }
    this.drawQuitScreen(message);
  }

  private drawQuitScreen(message?: string): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = C.bgDeep;
    ctx.fillRect(0, 0, this.width, this.height);
    const g = this.gauge;
    ctx.fillStyle = C.text;
    ctx.font = `700 ${Math.round(22 * g)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COLD BORE', this.width / 2, this.height * 0.42);
    ctx.fillStyle = C.textDim;
    ctx.font = `400 ${Math.round(13 * g)}px ui-monospace, monospace`;
    ctx.fillText(
      message ?? 'Progress saved. You can close this tab.',
      this.width / 2,
      this.height * 0.42 + 28 * g,
    );
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    // Clamp so a backgrounded tab does not resume with a monstrous step.
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.time += dt;

    this.swap();
    this.ui.beginFrame(now);

    const { ctx } = this;
    drawShellBackground(ctx, this.width, this.height, this.safe);

    if (this.scene) {
      this.scene.update(dt, this);
      this.scene.render(ctx, this);
    }
    this.drawToasts(ctx);
    this.input.endFrame();
    if (this.running) requestAnimationFrame(this.frame);
  };

  private drawToasts(ctx: CanvasRenderingContext2D): void {
    this.toasts = this.toasts.filter((t) => t.until > this.time);
    if (this.toasts.length === 0) return;
    const g = this.gauge;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let y = this.safe.y + 28 * g;
    for (const toast of this.toasts) {
      const fade = Math.min(1, (toast.until - this.time) / 0.5);
      ctx.globalAlpha = fade;
      ctx.font = font(12 * g, 'bold');
      const w = ctx.measureText(toast.message).width + 28 * g;
      const box = { x: this.width / 2 - w / 2, y: y - 14 * g, w, h: 28 * g };
      const tone =
        toast.tone === 'good' ? C.green : toast.tone === 'bad' ? C.red : C.amber;
      fillPanel(ctx, box, 14 * g, 'rgba(8,11,10,0.94)', tone);
      ctx.fillStyle = tone;
      ctx.fillRect(box.x + 8 * g, box.y + 7 * g, 3 * g, box.h - 14 * g);
      ctx.fillStyle = toast.tone === 'info' ? C.text : tone;
      ctx.fillText(toast.message, this.width / 2 + 2 * g, y);
      y += 34 * g;
      ctx.globalAlpha = 1;
    }
  }
}
