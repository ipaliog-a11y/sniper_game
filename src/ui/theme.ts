/**
 * One palette, one type scale. Everything on screen is meant to read like
 * equipment rather than a video game: olive, gunmetal, and a single amber that
 * is only ever used for things the shooter has to act on.
 */

export const C = {
  bg: '#0d1210',
  bgDeep: '#080b0a',
  /** Slightly cooler void used outside the safe column on wide screens. */
  gutter: '#060807',
  panel: '#151d19',
  panelHi: '#1d2823',
  /** Soft top edge of raised panels. */
  panelLift: '#24332c',
  edge: '#2b3a33',
  edgeSoft: '#22302a',
  edgeBright: '#3a4d44',
  text: '#dbe5de',
  textDim: '#8b998f',
  textFaint: '#5d6b62',
  amber: '#e8a33d',
  amberDim: '#8a6425',
  amberGlow: 'rgba(232,163,61,0.22)',
  green: '#7fc98a',
  red: '#e0705f',
  blue: '#79b8d1',
  reticle: '#0a0c0b',
  scopeGlass: '#5b6f5a',
  steel: '#9aa39c',
  steelDark: '#5c635e',
} as const;

export const FONT = {
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const font = (size: number, weight: 'normal' | 'bold' = 'normal') =>
  `${weight === 'bold' ? '600 ' : ''}${size}px ${FONT.mono}`;

/** Type scale in design units; the app scales these by the viewport. */
export const T = {
  micro: 9,
  small: 11,
  body: 13,
  head: 17,
  title: 24,
  huge: 38,
} as const;
