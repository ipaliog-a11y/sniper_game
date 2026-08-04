import { type Align, type Rect, fillPanel, inside, measure, rule, text } from './gfx';
import type { Input } from './input';
import { C, T } from './theme';

/**
 * An immediate-mode widget layer. Widgets are drawn and hit-tested in the same
 * call, and clicks are matched against taps that both started and finished
 * inside the same box, so declaration order never matters.
 */

export interface ButtonStyle {
  fill?: string;
  stroke?: string;
  label?: string;
  size?: number;
  radius?: number;
  align?: Align;
  disabled?: boolean;
  accent?: boolean;
  danger?: boolean;
}

export class Ui {
  ctx: CanvasRenderingContext2D;
  input: Input;
  /** Repeat timer for hold-to-repeat steppers, keyed by widget id. */
  private repeats = new Map<string, number>();
  private now = 0;

  constructor(ctx: CanvasRenderingContext2D, input: Input) {
    this.ctx = ctx;
    this.input = input;
  }

  beginFrame(now: number): void {
    this.now = now;
  }

  button(r: Rect, label: string, style: ButtonStyle = {}): boolean {
    const { ctx } = this;
    const held = !style.disabled && this.input.isDownIn(r.x, r.y, r.w, r.h);
    const accentColour = style.danger ? C.red : C.amber;
    const fill = style.disabled
      ? C.panel
      : style.accent
        ? held
          ? accentColour
          : 'rgba(232,163,61,0.16)'
        : held
          ? C.panelHi
          : C.panel;
    const stroke = style.disabled ? C.edgeSoft : style.accent ? accentColour : C.edge;
    fillPanel(ctx, r, style.radius ?? 6, style.fill ?? fill, style.stroke ?? stroke);
    const colour = style.disabled
      ? C.textFaint
      : style.accent
        ? held
          ? C.bgDeep
          : accentColour
        : C.text;
    text(
      ctx,
      label,
      style.align === 'left' ? r.x + 12 : r.x + r.w / 2,
      r.y + r.h / 2,
      style.size ?? T.body,
      colour,
      style.align ?? 'center',
      style.accent ? 'bold' : 'normal',
    );
    if (style.disabled) return false;
    return this.input.takeTap(r.x, r.y, r.w, r.h);
  }

  /**
   * Hold-to-repeat control: one fire on press, then auto-repeat after a short
   * delay while held. Must not also fire on release — the old path called
   * takeTap after the press-fire, so every “+1 click” was applied twice (0.2
   * mil steps on a 0.1 mil turret).
   */
  stepper(id: string, r: Rect, label: string, disabled = false): boolean {
    const { ctx } = this;
    const held = !disabled && this.input.isHeldIn(r.x, r.y, r.w, r.h);
    fillPanel(ctx, r, 6, held ? C.panelHi : C.panel, disabled ? C.edgeSoft : C.edge);
    text(
      ctx,
      label,
      r.x + r.w / 2,
      r.y + r.h / 2,
      T.head,
      disabled ? C.textFaint : C.text,
      'center',
      'bold',
    );
    if (disabled) return false;

    const last = this.repeats.get(id);
    if (!held) {
      // Consume any release tap so a press-fire is not followed by a second
      // takeTap on pointer-up (that was the double-step bug).
      if (last !== undefined) {
        this.input.takeTap(r.x, r.y, r.w, r.h);
        this.repeats.delete(id);
        return false;
      }
      // Pointer never registered as held (edge case): still allow a clean tap.
      return this.input.takeTap(r.x, r.y, r.w, r.h);
    }
    if (last === undefined) {
      this.repeats.set(id, this.now + 420);
      return true;
    }
    if (this.now >= last) {
      this.repeats.set(id, this.now + 55);
      return true;
    }
    return false;
  }

  toggle(r: Rect, label: string, on: boolean): boolean {
    const { ctx } = this;
    fillPanel(ctx, r, 6, on ? 'rgba(232,163,61,0.16)' : C.panel, on ? C.amber : C.edge);
    text(ctx, label, r.x + 12, r.y + r.h / 2, T.body, on ? C.amber : C.textDim, 'left');
    const knob = { x: r.x + r.w - 34, y: r.y + r.h / 2 - 8, w: 26, h: 16 };
    fillPanel(ctx, knob, 8, on ? C.amber : C.edgeSoft, 'transparent');
    ctx.beginPath();
    ctx.arc(on ? knob.x + knob.w - 8 : knob.x + 8, knob.y + 8, 6, 0, Math.PI * 2);
    ctx.fillStyle = on ? C.bgDeep : C.textDim;
    ctx.fill();
    return this.input.takeTap(r.x, r.y, r.w, r.h);
  }

  /** Horizontal tab strip. Returns the newly picked index, or -1. */
  tabs(r: Rect, labels: string[], active: number): number {
    const { ctx } = this;
    const w = r.w / labels.length;
    let picked = -1;
    for (let i = 0; i < labels.length; i++) {
      const tab: Rect = { x: r.x + i * w, y: r.y, w, h: r.h };
      const on = i === active;
      if (on) {
        ctx.fillStyle = 'rgba(232,163,61,0.10)';
        ctx.fillRect(tab.x, tab.y, tab.w, tab.h);
      }
      text(
        ctx,
        labels[i],
        tab.x + tab.w / 2,
        tab.y + tab.h / 2,
        T.small,
        on ? C.amber : C.textDim,
        'center',
        on ? 'bold' : 'normal',
      );
      if (on) {
        ctx.fillStyle = C.amber;
        ctx.fillRect(tab.x + 8, tab.y + tab.h - 2, tab.w - 16, 2);
      }
      if (this.input.takeTap(tab.x, tab.y, tab.w, tab.h)) picked = i;
    }
    rule(ctx, r.x, r.y + r.h - 1, r.w);
    return picked;
  }

  /** Draggable slider. Returns the value, changed or not. */
  slider(id: string, r: Rect, value: number, min: number, max: number): number {
    const { ctx } = this;
    const track: Rect = { x: r.x, y: r.y + r.h / 2 - 3, w: r.w, h: 6 };
    fillPanel(ctx, track, 3, C.edgeSoft, 'transparent');
    const f = (value - min) / (max - min || 1);
    fillPanel(ctx, { ...track, w: Math.max(6, track.w * f) }, 3, C.amberDim, 'transparent');

    let next = value;
    const grab = { x: r.x - 16, y: r.y - 8, w: r.w + 32, h: r.h + 16 };
    for (const p of this.input.pointers.values()) {
      const owns = p.claim === id;
      if (!owns && (p.claim !== null || !inside(grab, p.startX, p.startY))) continue;
      p.claim = id;
      next = min + ((p.x - r.x) / (r.w || 1)) * (max - min);
      next = Math.max(min, Math.min(max, next));
    }

    const knobX = r.x + Math.max(0, Math.min(1, (next - min) / (max - min || 1))) * r.w;
    ctx.beginPath();
    ctx.arc(knobX, r.y + r.h / 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = C.panelHi;
    ctx.fill();
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return next;
  }

  /** A label/value pair on one line, the way a data card reads. */
  field(x: number, y: number, w: number, label: string, value: string, colour: string = C.text): void {
    text(this.ctx, label, x, y, T.small, C.textFaint, 'left');
    text(this.ctx, value, x + w, y, T.body, colour, 'right');
  }

  /** Text that shrinks to fit rather than overflowing its box. */
  fitText(
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    colour: string,
    align: Align = 'left',
    weight: 'normal' | 'bold' = 'normal',
  ): void {
    let s = size;
    while (s > 7 && measure(this.ctx, value, s) > maxWidth) s -= 1;
    text(this.ctx, value, x, y, s, colour, align, weight);
  }
}

/**
 * Scroll state for a list. Retained by the scene, driven by whichever pointer
 * grabbed it, with a little inertia so flicks feel right on a phone.
 */
export class Scroll {
  offset = 0;
  private velocity = 0;
  private readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  update(input: Input, view: Rect, contentHeight: number, dt: number): void {
    const max = Math.max(0, contentHeight - view.h);
    let dragged = false;
    for (const p of input.pointers.values()) {
      const owns = p.claim === this.id;
      if (!owns) {
        if (p.claim !== null) continue;
        if (!inside(view, p.startX, p.startY)) continue;
        // Only grab the pointer once it is clearly a vertical drag, so taps on
        // the cards inside still work.
        if (!p.dragging || Math.abs(p.y - p.startY) < Math.abs(p.x - p.startX)) continue;
        p.claim = this.id;
      }
      this.offset -= p.dy;
      this.velocity = dt > 0 ? -p.dy / dt : 0;
      dragged = true;
    }
    if (!dragged) {
      this.offset += this.velocity * dt;
      this.velocity *= Math.pow(0.002, dt);
      if (Math.abs(this.velocity) < 4) this.velocity = 0;
    }
    if (this.offset < 0) {
      this.offset = dragged ? this.offset * 0.5 : 0;
      this.velocity = 0;
    }
    if (this.offset > max) {
      this.offset = dragged ? max + (this.offset - max) * 0.5 : max;
      this.velocity = 0;
    }
    if (input.wheel !== 0 && inside(view, input.hoverX, input.hoverY)) {
      this.offset = Math.max(0, Math.min(max, this.offset + input.wheel));
    }
  }

  /** True once the scroll has taken a pointer, so children should ignore taps. */
  isDragging(input: Input): boolean {
    return input.byClaim(this.id).length > 0;
  }
}

export { C, T };
