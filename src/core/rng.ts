/**
 * Seeded randomness. Every stage is generated from a seed so that a course of
 * fire can be replayed, shared and compared — a trainer where the wind is
 * different each attempt teaches nothing.
 */

export interface Rng {
  (): number;
  seed: number;
}

/** mulberry32: small, fast, and good enough for weather and group dispersion. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.seed = seed;
  return next;
}

export const range = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);

export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

/** Box-Muller. Group dispersion is Gaussian, so the sim should be too. */
export function gaussian(rng: Rng): number {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Hash a string into a seed, so stages can be named rather than numbered. */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
