import { C, font } from './theme';

/** Drawing primitives. Nothing here knows what a rifle is. */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const inside = (r: Rect, px: number, py: number) =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

export const inset = (r: Rect, dx: number, dy = dx): Rect => ({
  x: r.x + dx,
  y: r.y + dy,
  w: r.w - dx * 2,
  h: r.h - dy * 2,
});

export function roundRect(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  radius: number,
): void {
  const rad = Math.min(radius, r.w / 2, r.h / 2);
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  ctx.closePath();
}

export function fillPanel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  radius: number,
  fill: string = C.panel,
  stroke: string = C.edge,
): void {
  roundRect(ctx, r, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export type Align = 'left' | 'center' | 'right';

export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  colour: string = C.text,
  align: Align = 'left',
  weight: 'normal' | 'bold' = 'normal',
): void {
  ctx.font = font(size, weight);
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

/** Wrap to a width and return how tall it ended up. */
export function paragraph(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  colour: string = C.textDim,
  lineHeight = 1.45,
): number {
  ctx.font = font(size);
  ctx.fillStyle = colour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const words = value.split(' ');
  let line = '';
  let cursor = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      cursor += size * lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursor);
    cursor += size * lineHeight;
  }
  return cursor - y;
}

export function measure(ctx: CanvasRenderingContext2D, value: string, size: number): number {
  ctx.font = font(size);
  return ctx.measureText(value).width;
}

/** A horizontal rule with the faint bracket ends this UI uses everywhere. */
export function rule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  colour: string = C.edgeSoft,
): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 0.5);
  ctx.lineTo(x + w, y + 0.5);
  ctx.stroke();
}

/** Left-to-right filled bar, used for meters, timers and headroom. */
export function bar(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  fraction: number,
  colour: string,
  track: string = C.edgeSoft,
): void {
  roundRect(ctx, r, r.h / 2);
  ctx.fillStyle = track;
  ctx.fill();
  const f = Math.max(0, Math.min(1, fraction));
  if (f <= 0) return;
  roundRect(ctx, { ...r, w: Math.max(r.h, r.w * f) }, r.h / 2);
  ctx.fillStyle = colour;
  ctx.fill();
}

export function crosshairDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colour: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = colour;
  ctx.fill();
}

export function withClip(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  radius: number,
  draw: () => void,
): void {
  ctx.save();
  roundRect(ctx, r, radius);
  ctx.clip();
  draw();
  ctx.restore();
}
