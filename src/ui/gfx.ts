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
  if (stroke && stroke !== 'transparent') {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Raised equipment panel: soft vertical fill + hairline top edge so cards
 * read as machined faces instead of flat rectangles.
 */
export function fillRaised(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  radius: number,
  options: {
    fillTop?: string;
    fillBottom?: string;
    stroke?: string;
    accentLeft?: string;
    held?: boolean;
  } = {},
): void {
  const top = options.fillTop ?? (options.held ? C.panelLift : C.panelHi);
  const bottom = options.fillBottom ?? (options.held ? C.panelHi : C.panel);
  const stroke = options.stroke ?? C.edge;
  const rad = Math.min(radius, r.w / 2, r.h / 2);

  roundRect(ctx, r, rad);
  const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fill();

  // Hairline specular on the top edge.
  ctx.save();
  roundRect(ctx, r, rad);
  ctx.clip();
  ctx.strokeStyle = 'rgba(219,229,222,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y + 0.5);
  ctx.lineTo(r.x + r.w - rad, r.y + 0.5);
  ctx.stroke();
  ctx.restore();

  if (stroke && stroke !== 'transparent') {
    roundRect(ctx, r, rad);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (options.accentLeft) {
    ctx.save();
    roundRect(ctx, r, rad);
    ctx.clip();
    ctx.fillStyle = options.accentLeft;
    ctx.fillRect(r.x, r.y, 3, r.h);
    ctx.restore();
  }
}

/** Corner brackets — military/HUD framing without cluttering the middle. */
export function cornerBrackets(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  length: number,
  colour: string = C.edgeBright,
  insetPx = 4,
): void {
  const L = length;
  const i = insetPx;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  // TL
  ctx.moveTo(r.x + i, r.y + i + L);
  ctx.lineTo(r.x + i, r.y + i);
  ctx.lineTo(r.x + i + L, r.y + i);
  // TR
  ctx.moveTo(r.x + r.w - i - L, r.y + i);
  ctx.lineTo(r.x + r.w - i, r.y + i);
  ctx.lineTo(r.x + r.w - i, r.y + i + L);
  // BR
  ctx.moveTo(r.x + r.w - i, r.y + r.h - i - L);
  ctx.lineTo(r.x + r.w - i, r.y + r.h - i);
  ctx.lineTo(r.x + r.w - i - L, r.y + r.h - i);
  // BL
  ctx.moveTo(r.x + i + L, r.y + r.h - i);
  ctx.lineTo(r.x + i, r.y + r.h - i);
  ctx.lineTo(r.x + i, r.y + r.h - i - L);
  ctx.stroke();
}

/** Full-screen atmospheric wash under every scene. */
export function drawShellBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  safe: Rect,
): void {
  // Deep void
  ctx.fillStyle = C.gutter;
  ctx.fillRect(0, 0, width, height);

  // Content column: slightly warmer olive so the gutters read as "off stage".
  if (safe.x > 1 || safe.x + safe.w < width - 1) {
    const col = { x: safe.x - 8, y: 0, w: safe.w + 16, h: height };
    const g = ctx.createLinearGradient(col.x, 0, col.x + col.w, 0);
    g.addColorStop(0, 'rgba(13,18,16,0)');
    g.addColorStop(0.04, C.bgDeep);
    g.addColorStop(0.96, C.bgDeep);
    g.addColorStop(1, 'rgba(13,18,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(col.x, 0, col.w, height);
  } else {
    ctx.fillStyle = C.bgDeep;
    ctx.fillRect(0, 0, width, height);
  }

  // Soft top-to-bottom atmosphere.
  const v = ctx.createLinearGradient(0, 0, 0, height);
  v.addColorStop(0, 'rgba(18,28,22,0.55)');
  v.addColorStop(0.35, 'rgba(0,0,0,0)');
  v.addColorStop(0.75, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);

  // Radial vignette so focus sits in the middle of the phone.
  const cx = width / 2;
  const cy = height * 0.42;
  const rad = Math.max(width, height) * 0.72;
  const rv = ctx.createRadialGradient(cx, cy, rad * 0.25, cx, cy, rad);
  rv.addColorStop(0, 'rgba(0,0,0,0)');
  rv.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = rv;
  ctx.fillRect(0, 0, width, height);
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
  // Tiny tick ends — reads as a milled slot rather than a CSS border.
  ctx.beginPath();
  ctx.moveTo(x, y - 2);
  ctx.lineTo(x, y + 3);
  ctx.moveTo(x + w, y - 2);
  ctx.lineTo(x + w, y + 3);
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
