import type { Rect } from './gfx';

/**
 * Lazy-load catalogue art from public/ and draw it into detail panels.
 * Paths are relative to the page base so GitHub Pages project roots work.
 */

type CacheEntry =
  | { status: 'loading' }
  | { status: 'ready'; img: HTMLImageElement }
  | { status: 'error' };

const cache = new Map<string, CacheEntry>();

export function publicUrl(path: string): string {
  const clean = path.replace(/^\//, '');
  return new URL(clean, document.baseURI).href;
}

/** Returns a fully loaded image, or null while loading / on failure. */
export function getGearImage(path: string | undefined): HTMLImageElement | null {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit?.status === 'ready') return hit.img;
  if (hit) return null;

  const img = new Image();
  cache.set(path, { status: 'loading' });
  img.decoding = 'async';
  img.onload = () => cache.set(path, { status: 'ready', img });
  img.onerror = () => cache.set(path, { status: 'error' });
  img.src = publicUrl(path);
  return null;
}

/** Draw the image fully visible inside r (letterbox on the deep panel fill). */
export function drawImageContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  r: Rect,
): void {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw <= 0 || ih <= 0) return;
  const ir = iw / ih;
  const rr = r.w / r.h;
  let dw: number;
  let dh: number;
  if (ir > rr) {
    dw = r.w;
    dh = r.w / ir;
  } else {
    dh = r.h;
    dw = r.h * ir;
  }
  const dx = r.x + (r.w - dw) / 2;
  const dy = r.y + (r.h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}
