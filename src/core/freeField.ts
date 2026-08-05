import { BIOME_IDS, type BiomeId, isBiomeId } from './biome';
import { degToRad } from './units';
import {
  type Stage,
  type Target,
  type TargetShape,
} from './range';
import { PRESETS } from './weather';
import { makeRng } from './rng';

/**
 * Free Field: the shooter builds the string — plates, weather, known or hidden
 * ranges — then shoots with any kit. No clock pressure; the timer only counts up.
 */

export const FREE_FIELD_ID = 'free-field';

export const FREE_FIELD_SHAPES: TargetShape[] = ['gong', 'silhouette', 'head', 'diamond'];

export const FREE_FIELD_MIN_TARGETS = 1;
export const FREE_FIELD_MAX_TARGETS = 8;
export const FREE_FIELD_MIN_RANGE_M = 100;
/** Horizon stage depth — matches the deep end of the graded course. */
export const FREE_FIELD_MAX_RANGE_M = 3540;
export const FREE_FIELD_RANGE_STEP_M = 25;

export interface FreeFieldTargetConfig {
  shape: TargetShape;
  rangeM: number;
  /** When true the shooter is not told the distance (mil it or use a rangefinder). */
  unknownRange: boolean;
}

export interface FreeFieldConfig {
  targets: FreeFieldTargetConfig[];
  /**
   * Weather preset id, or `'random'` to roll a fresh preset every time the
   * stage is built (go-hot / randomise).
   */
  weatherPresetId: string;
  /**
   * Scenery biome id, or `'random'` to pick open/forest/desert/urban at build.
   */
  biomeId: string;
  /** Fixed seed for repeatable conditions; re-rolled by the randomiser. */
  seed: number;
  /** Rounds in the magazine for this string. */
  rounds: number;
}

const SHAPE_DIMS: Record<
  TargetShape,
  { widthM: number; tallM: number; knownSizeM: number; value: number }
> = {
  gong: { widthM: 0.4, tallM: 0.4, knownSizeM: 0.4, value: 1 },
  silhouette: { widthM: 0.46, tallM: 0.76, knownSizeM: 0.76, value: 1 },
  head: { widthM: 0.16, tallM: 0.22, knownSizeM: 0.22, value: 2 },
  diamond: { widthM: 0.35, tallM: 0.35, knownSizeM: 0.35, value: 1.5 },
};

export function defaultFreeFieldTarget(rangeM = 400): FreeFieldTargetConfig {
  return {
    shape: 'gong',
    rangeM,
    unknownRange: false,
  };
}

export function defaultFreeFieldConfig(): FreeFieldConfig {
  return {
    targets: [
      defaultFreeFieldTarget(300),
      defaultFreeFieldTarget(450),
      defaultFreeFieldTarget(600),
    ],
    weatherPresetId: 'fair',
    biomeId: 'open',
    seed: (Date.now() ^ 0x9e3779b9) >>> 0,
    rounds: 8,
  };
}

/** Sensible default ammo count for a given plate count. */
export function suggestedRounds(targetCount: number): number {
  return Math.max(targetCount + 2, targetCount * 2);
}

export function clampTargetCount(n: number): number {
  return Math.max(FREE_FIELD_MIN_TARGETS, Math.min(FREE_FIELD_MAX_TARGETS, Math.round(n)));
}

export function clampRangeM(rangeM: number): number {
  const stepped =
    Math.round(rangeM / FREE_FIELD_RANGE_STEP_M) * FREE_FIELD_RANGE_STEP_M;
  return Math.max(FREE_FIELD_MIN_RANGE_M, Math.min(FREE_FIELD_MAX_RANGE_M, stepped));
}

export function nextShape(shape: TargetShape): TargetShape {
  const i = FREE_FIELD_SHAPES.indexOf(shape);
  return FREE_FIELD_SHAPES[(i + 1) % FREE_FIELD_SHAPES.length];
}

/** Weather preset ids the setup UI can cycle, plus random. */
export const FREE_FIELD_WEATHER_OPTIONS: string[] = [
  'random',
  ...PRESETS.map((p) => p.id),
];

export function nextWeatherOption(id: string): string {
  const i = FREE_FIELD_WEATHER_OPTIONS.indexOf(id);
  const at = i < 0 ? 0 : (i + 1) % FREE_FIELD_WEATHER_OPTIONS.length;
  return FREE_FIELD_WEATHER_OPTIONS[at];
}

export function prevWeatherOption(id: string): string {
  const i = FREE_FIELD_WEATHER_OPTIONS.indexOf(id);
  const at = i < 0 ? 0 : (i - 1 + FREE_FIELD_WEATHER_OPTIONS.length) % FREE_FIELD_WEATHER_OPTIONS.length;
  return FREE_FIELD_WEATHER_OPTIONS[at];
}

/** New seed and, if weather/biome is random, pick is deferred to build. */
export function randomiseFreeField(config: FreeFieldConfig): FreeFieldConfig {
  const rng = makeRng((Date.now() ^ config.seed ^ 0xa5a5a5a5) >>> 0);
  return {
    ...config,
    seed: Math.floor(rng() * 0xffffffff) >>> 0,
    weatherPresetId: config.weatherPresetId === 'random' ? 'random' : config.weatherPresetId,
    biomeId: config.biomeId === 'random' ? 'random' : config.biomeId,
  };
}

/**
 * Full shuffle: new seed, random weather + biome fixed for this build, and
 * random ranges / shapes for every plate.
 */
export function fullyRandomiseFreeField(config: FreeFieldConfig): FreeFieldConfig {
  const rng = makeRng((Date.now() ^ config.seed ^ 0xc0ffee) >>> 0);
  const n = clampTargetCount(config.targets.length || 3);
  const targets: FreeFieldTargetConfig[] = [];
  for (let i = 0; i < n; i++) {
    const shape = FREE_FIELD_SHAPES[Math.floor(rng() * FREE_FIELD_SHAPES.length)];
    const rangeM = clampRangeM(
      FREE_FIELD_MIN_RANGE_M +
        rng() * (FREE_FIELD_MAX_RANGE_M - FREE_FIELD_MIN_RANGE_M),
    );
    targets.push({
      shape,
      rangeM,
      unknownRange: rng() > 0.55,
    });
  }
  // Sort near → far so the string reads left-to-right by distance.
  targets.sort((a, b) => a.rangeM - b.rangeM);
  const preset = PRESETS[Math.floor(rng() * PRESETS.length)];
  const biome = BIOME_IDS[Math.floor(rng() * BIOME_IDS.length)];
  return {
    targets,
    weatherPresetId: preset.id,
    biomeId: biome,
    seed: Math.floor(rng() * 0xffffffff) >>> 0,
    rounds: suggestedRounds(n),
  };
}

function buildTarget(cfg: FreeFieldTargetConfig, index: number, count: number): Target {
  const dims = SHAPE_DIMS[cfg.shape];
  const rangeM = clampRangeM(cfg.rangeM);
  // Spread plates across the sector so they do not stack on the same bearing.
  const azDeg = (index - (count - 1) / 2) * 4.2;
  const disclosed = !cfg.unknownRange;
  return {
    id: `ff${index + 1}`,
    shape: cfg.shape,
    rangeM,
    azimuth: degToRad(azDeg),
    heightM: 0,
    widthM: dims.widthM,
    tallM: dims.tallM,
    knownSizeM: dims.knownSizeM,
    value: dims.value,
    // Known-distance plates show the range on the face, like the tutorial.
    label: disclosed ? `${Math.round(rangeM)}` : undefined,
    disclosedRange: disclosed,
  };
}

/**
 * Compile a Free Field config into a Stage the rest of the game already
 * understands. Time limit is effectively infinite; the HUD counts up instead.
 */
export function buildFreeFieldStage(config: FreeFieldConfig): Stage {
  const targets = config.targets.map((t, i) =>
    buildTarget(t, i, config.targets.length),
  );
  const rng = makeRng(config.seed);
  const presetId =
    config.weatherPresetId === 'random'
      ? PRESETS[Math.floor(rng() * PRESETS.length)].id
      : config.weatherPresetId;
  const biomeId: BiomeId =
    config.biomeId === 'random'
      ? BIOME_IDS[Math.floor(rng() * BIOME_IDS.length)]
      : isBiomeId(config.biomeId)
        ? config.biomeId
        : 'open';

  const rounds = Math.max(
    config.targets.length,
    Math.min(40, Math.round(config.rounds) || suggestedRounds(config.targets.length)),
  );

  return {
    id: FREE_FIELD_ID,
    name: 'Free Field',
    brief:
      'Your string, your weather, your scenery, your kit. No time limit — the clock only counts up. Hit every plate; when ranges are concealed you mil them or use a rangefinder.',
    presetId,
    biomeId,
    firingHeightM: 16,
    seed: config.seed,
    targets,
    rounds,
    // Practice-style timeless stage; shoot HUD uses freeField for count-up.
    timeLimitS: Number.POSITIVE_INFINITY,
    parPerTargetS: 30,
    ordered: false,
    reward: 0,
    unlockScore: 0,
    // Carried so brief/result can special-case without only checking id.
    freeField: true,
  };
}

export function freeFieldSummary(config: FreeFieldConfig): {
  targets: number;
  maxRangeM: number;
  unknown: number;
  weatherId: string;
  biomeId: string;
} {
  const maxRangeM = config.targets.reduce((m, t) => Math.max(m, t.rangeM), 0);
  const unknown = config.targets.filter((t) => t.unknownRange).length;
  return {
    targets: config.targets.length,
    maxRangeM,
    unknown,
    weatherId: config.weatherPresetId,
    biomeId: config.biomeId,
  };
}
