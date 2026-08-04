/**
 * Range scenery. Weather is the air; biome is what the ground looks like and
 * what is planted in it. Soft props (grass, canopy, flags, hanging signs) lean
 * with the wind so the picture itself is a wind gauge.
 */

export type BiomeId = 'open' | 'forest' | 'desert' | 'urban';

export type PropKind =
  | 'grass'
  | 'weed'
  | 'bush'
  | 'tree'
  | 'cactus'
  | 'rock'
  | 'fence'
  | 'flag'
  | 'windsock'
  | 'sign'
  | 'lamp'
  | 'building'
  | 'rubble';

export interface BiomePalette {
  /** Near / far ground tints before light and haze. */
  groundNear: [number, number, number];
  groundFar: [number, number, number];
  dark: [number, number, number];
  pale: [number, number, number];
  scrub: [number, number, number];
  /** Distant ridge / skyline wash. */
  ridge: [number, number, number];
  /** Optional sky day tint blend (0 = none). */
  skyWarmth: number;
}

export interface Biome {
  id: BiomeId;
  /** English catalogue name; UI uses i18n keys biome.{id}.name. */
  name: string;
  blurb: string;
  palette: BiomePalette;
  /**
   * How heavily soft props respond to crosswind, 0..1.5. Desert scrub is stiff;
   * tall grass and canopy are soft.
   */
  windiness: number;
  /** Relative densities for scatter / prop rings. */
  density: {
    patch: number;
    speck: number;
    prop: number;
    tree: number;
  };
  /** Horizon silhouette style past the berm. */
  horizon: 'treeline' | 'ridges' | 'skyline' | 'dunes';
  /** Prop mix. Weights need not sum to 1; they are normalised per pick. */
  props: Array<{ kind: PropKind; weight: number; sway: boolean }>;
}

export const BIOMES: Biome[] = [
  {
    id: 'open',
    name: 'Open Field',
    blurb: 'Pasture and fence posts. Tall grass and socks read the wind cleanly.',
    palette: {
      groundNear: [78, 96, 58],
      groundFar: [118, 124, 88],
      dark: [48, 58, 36],
      pale: [142, 148, 98],
      scrub: [56, 72, 42],
      ridge: [62, 78, 68],
      skyWarmth: 0.05,
    },
    windiness: 1.15,
    density: { patch: 1, speck: 1.1, prop: 1.05, tree: 0.35 },
    horizon: 'treeline',
    props: [
      { kind: 'grass', weight: 3.2, sway: true },
      { kind: 'weed', weight: 1.4, sway: true },
      { kind: 'bush', weight: 1.1, sway: true },
      { kind: 'fence', weight: 0.9, sway: false },
      { kind: 'windsock', weight: 0.45, sway: true },
      { kind: 'flag', weight: 0.55, sway: true },
      { kind: 'tree', weight: 0.35, sway: true },
      { kind: 'rock', weight: 0.4, sway: false },
    ],
  },
  {
    id: 'forest',
    name: 'Forest Edge',
    blurb: 'Timber and undergrowth. Canopy sway is the wind call past three hundred.',
    palette: {
      groundNear: [52, 72, 44],
      groundFar: [72, 88, 62],
      dark: [32, 46, 30],
      pale: [96, 112, 74],
      scrub: [38, 58, 36],
      ridge: [34, 48, 36],
      skyWarmth: 0,
    },
    windiness: 1.0,
    density: { patch: 0.85, speck: 1.25, prop: 1.35, tree: 1.6 },
    horizon: 'treeline',
    props: [
      { kind: 'tree', weight: 3.4, sway: true },
      { kind: 'bush', weight: 2.2, sway: true },
      { kind: 'weed', weight: 1.2, sway: true },
      { kind: 'grass', weight: 1.0, sway: true },
      { kind: 'rock', weight: 0.5, sway: false },
      { kind: 'fence', weight: 0.25, sway: false },
    ],
  },
  {
    id: 'desert',
    name: 'Desert',
    blurb: 'Sand, rock and stiff scrub. Little green — mirage and dust do the talking.',
    palette: {
      groundNear: [156, 128, 88],
      groundFar: [168, 142, 102],
      dark: [112, 88, 58],
      pale: [198, 172, 124],
      scrub: [98, 86, 54],
      ridge: [120, 98, 72],
      skyWarmth: 0.22,
    },
    windiness: 0.75,
    density: { patch: 1.15, speck: 0.7, prop: 0.85, tree: 0.15 },
    horizon: 'dunes',
    props: [
      { kind: 'rock', weight: 2.4, sway: false },
      { kind: 'cactus', weight: 1.3, sway: false },
      { kind: 'bush', weight: 1.1, sway: true },
      { kind: 'weed', weight: 0.9, sway: true },
      { kind: 'grass', weight: 0.45, sway: true },
      { kind: 'windsock', weight: 0.3, sway: true },
      { kind: 'flag', weight: 0.25, sway: true },
    ],
  },
  {
    id: 'urban',
    name: 'Urban Fringe',
    blurb: 'Yards, poles and low walls. Signs and laundry hang into the wind.',
    palette: {
      groundNear: [92, 90, 82],
      groundFar: [108, 106, 98],
      dark: [62, 60, 56],
      pale: [148, 146, 136],
      scrub: [70, 78, 58],
      ridge: [78, 82, 88],
      skyWarmth: 0.08,
    },
    windiness: 0.95,
    density: { patch: 0.7, speck: 0.85, prop: 1.2, tree: 0.4 },
    horizon: 'skyline',
    props: [
      { kind: 'building', weight: 1.6, sway: false },
      { kind: 'lamp', weight: 1.2, sway: false },
      { kind: 'sign', weight: 1.1, sway: true },
      { kind: 'fence', weight: 1.0, sway: false },
      { kind: 'rubble', weight: 0.9, sway: false },
      { kind: 'tree', weight: 0.7, sway: true },
      { kind: 'bush', weight: 0.6, sway: true },
      { kind: 'flag', weight: 0.55, sway: true },
      { kind: 'weed', weight: 0.5, sway: true },
    ],
  },
];

export const BIOME_IDS: BiomeId[] = BIOMES.map((b) => b.id);

export const biomeById = (id: string | undefined | null): Biome =>
  BIOMES.find((b) => b.id === id) ?? BIOMES[0];

export const isBiomeId = (value: unknown): value is BiomeId =>
  typeof value === 'string' && BIOME_IDS.includes(value as BiomeId);

export function nextBiomeId(id: string): BiomeId {
  const i = BIOME_IDS.indexOf(id as BiomeId);
  return BIOME_IDS[(i < 0 ? 0 : i + 1) % BIOME_IDS.length];
}

export function prevBiomeId(id: string): BiomeId {
  const i = BIOME_IDS.indexOf(id as BiomeId);
  return BIOME_IDS[(i < 0 ? 0 : i - 1 + BIOME_IDS.length) % BIOME_IDS.length];
}

/** Free Field weather-style option list: random + each biome. */
export const FREE_FIELD_BIOME_OPTIONS: string[] = ['random', ...BIOME_IDS];

export function nextBiomeOption(id: string): string {
  const i = FREE_FIELD_BIOME_OPTIONS.indexOf(id);
  return FREE_FIELD_BIOME_OPTIONS[(i < 0 ? 0 : i + 1) % FREE_FIELD_BIOME_OPTIONS.length];
}

export function prevBiomeOption(id: string): string {
  const i = FREE_FIELD_BIOME_OPTIONS.indexOf(id);
  return FREE_FIELD_BIOME_OPTIONS[
    (i < 0 ? 0 : i - 1 + FREE_FIELD_BIOME_OPTIONS.length) % FREE_FIELD_BIOME_OPTIONS.length
  ];
}

/** Pick a weighted prop kind for this biome. */
export function pickPropKind(biome: Biome, u: number): { kind: PropKind; sway: boolean } {
  const total = biome.props.reduce((s, p) => s + p.weight, 0) || 1;
  let roll = u * total;
  for (const p of biome.props) {
    roll -= p.weight;
    if (roll <= 0) return { kind: p.kind, sway: p.sway };
  }
  const last = biome.props[biome.props.length - 1];
  return { kind: last.kind, sway: last.sway };
}
