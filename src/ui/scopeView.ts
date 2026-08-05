import type { TrajectoryPoint } from '../core/ballistics';
import { type Biome, type PropKind, biomeById, pickPropKind } from '../core/biome';
import type { Optic } from '../core/catalog/attachments';
import {
  type Target,
  STAND_HEIGHT_M,
  targetInclination,
  targetOffsetAt,
} from '../core/range';
import { type ReticleMark, reticleMarks, reticleScale } from '../core/scope';
import type { Session, TargetRuntime } from '../core/session';
import { clamp, radToMil } from '../core/units';
import { type Conditions, zoneWindAt } from '../core/weather';
import { C } from './theme';

/**
 * What you see down the tube.
 *
 * The whole picture is an angular projection: every object is placed by where
 * it sits in azimuth and elevation relative to the optical axis, scaled by how
 * many pixels a radian is worth at the current magnification. That is the only
 * way the reticle can be trusted — a mil-dot has to cover exactly one mil of
 * target or ranging off it is a lie.
 */

export interface View {
  cx: number;
  cy: number;
  radius: number;
  /** Pixels per radian. The single number the whole projection hangs off. */
  pxPerRad: number;
  aimAz: number;
  aimEl: number;
  cant: number;
  fov: number;
  project(az: number, el: number): { x: number; y: number };
}

export function makeView(
  cx: number,
  cy: number,
  radius: number,
  fov: number,
  aimAz: number,
  aimEl: number,
  cant: number,
): View {
  const pxPerRad = (radius * 2) / fov;
  // The reticle is bolted to the rifle, so when the rifle rolls it is the world
  // that appears to turn.
  const c = Math.cos(-cant);
  const s = Math.sin(-cant);
  return {
    cx,
    cy,
    radius,
    pxPerRad,
    aimAz,
    aimEl,
    cant,
    fov,
    project(az: number, el: number) {
      const dx = (az - aimAz) * pxPerRad;
      const dy = -(el - aimEl) * pxPerRad;
      return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
    },
  };
}

/** Cheap deterministic hash so the same range grows the same bushes every time. */
function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// --- sky and light ------------------------------------------------------

type Rgb = [number, number, number];

interface Light {
  skyTop: string;
  skyBottom: string;
  /** Ground colour close in and far out, as raw channels so bands can blend. */
  groundNear: Rgb;
  groundFar: Rgb;
  haze: Rgb;
  /** 0..1 overall brightness, folded into contrast on the targets. */
  level: number;
}

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const css = (c: Rgb, alpha = 1) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;

export function lightFor(conditions: Conditions, biome: Biome = biomeById('open')): Light {
  const h = conditions.hour;
  // Full daylight between about seven and five, falling off either side.
  const dusk = clamp(Math.min(h - 4.5, 20 - h) / 2.5, 0, 1);
  // Last light: still bright enough to shoot, but the sky is already warm.
  const lastLight = clamp(1 - Math.abs(h - 18.2) / 2.4, 0, 1) * (h > 16 ? 1 : 0);
  const overcast =
    conditions.sky === 'overcast'
      ? 0.68
      : conditions.sky === 'rain'
        ? 0.48
        : conditions.sky === 'fog'
          ? 0.55
          : 1;
  const level = clamp(dusk * overcast, 0.12, 1);
  const warm = 1 - dusk;
  const biomeWarm = biome.palette.skyWarmth;
  const stormGrey = conditions.sky === 'rain' || conditions.sky === 'overcast' ? 1 : 0;

  let dayTop: Rgb =
    conditions.sky === 'clear'
      ? [74, 124, 166]
      : conditions.sky === 'high-cloud'
        ? [104, 134, 158]
        : conditions.sky === 'fog'
          ? [128, 132, 134]
          : [88, 92, 96];
  let dayBottom: Rgb =
    conditions.sky === 'clear'
      ? [176, 202, 212]
      : conditions.sky === 'fog'
        ? [168, 170, 172]
        : conditions.sky === 'rain'
          ? [118, 122, 124]
          : [148, 152, 154];
  // Storm washes the colour out of the sky.
  if (stormGrey > 0) {
    dayTop = mixRgb(dayTop, [92, 96, 98], 0.45 * stormGrey);
    dayBottom = mixRgb(dayBottom, [120, 124, 126], 0.4 * stormGrey);
  }
  // Desert days go a little amber; forest stays cooler.
  let dayTopTinted = mixRgb(dayTop, [168, 142, 98], biomeWarm * 0.55);
  let dayBottomTinted = mixRgb(dayBottom, [210, 186, 140], biomeWarm * 0.4);
  // Last-light warm rim on the lower sky.
  if (lastLight > 0.05) {
    dayBottomTinted = mixRgb(dayBottomTinted, [220, 148, 88], lastLight * 0.55);
    dayTopTinted = mixRgb(dayTopTinted, [120, 90, 110], lastLight * 0.25);
  }
  const nightTop: Rgb = [22, 28, 40];
  const nightBottom: Rgb = [78, 68, 60];

  // Biome ground, pushed greyer at dusk / low light; wet days go darker and cooler.
  const dry = clamp(1 - conditions.atmosphere.humidity, 0, 1);
  const wet = conditions.sky === 'rain' ? 0.55 : clamp(conditions.atmosphere.humidity - 0.55, 0, 1) * 0.7;
  let near = mixRgb(biome.palette.groundNear, mixRgb(biome.palette.groundNear, [148, 132, 96], dry * 0.35), 0.25);
  let far = mixRgb(biome.palette.groundFar, mixRgb(biome.palette.groundFar, [150, 140, 110], dry * 0.3), 0.2);
  if (wet > 0) {
    near = mixRgb(near, [36, 42, 40], wet * 0.55);
    far = mixRgb(far, [48, 54, 56], wet * 0.45);
  }

  // Fog pushes haze cooler and greyer so distant plates disappear sooner.
  const fog = conditions.sky === 'fog' ? 1 : clamp(1 - conditions.visibility, 0, 1) * 0.6;
  const hazeBase: Rgb = [
    150 + 40 * warm + 24 * biomeWarm - 18 * fog - 12 * stormGrey,
    158 + 20 * warm - 10 * biomeWarm - 8 * fog - 10 * stormGrey,
    152 + 10 * warm - 28 * biomeWarm + 12 * fog - 6 * stormGrey,
  ];

  return {
    skyTop: css(mixRgb(nightTop, dayTopTinted, dusk)),
    skyBottom: css(mixRgb(nightBottom, dayBottomTinted, dusk)),
    groundNear: mixRgb([20, 24, 20], near, level),
    groundFar: mixRgb([26, 32, 32], mixRgb(far, lightHazeHint(biome), 0.2 + fog * 0.15), level),
    haze: hazeBase,
    level,
  };
}

const lightHazeHint = (biome: Biome): Rgb =>
  mixRgb(biome.palette.groundFar, biome.palette.ridge, 0.4);

// --- the world ----------------------------------------------------------

const GROUND_BANDS = 54;
const MAX_DRAW_RANGE = 6000;

/**
 * How far away the ground under a given screen elevation is. The shooter sits
 * `firingHeightM` above a flat floor, so this is just similar triangles — and
 * it is the reason the whole range past 600 m is crammed into the last few
 * pixels below the horizon.
 */
const groundDistanceAt = (el: number, firingHeightM: number) =>
  el >= -1e-5 ? Infinity : -firingHeightM / Math.tan(el);

/** The slice of ground the current view can actually see, in metres. */
function visibleGroundRange(view: View, firingHeightM: number): { near: number; far: number } {
  // Generous margin so a canted view still has ground in the corners.
  const half = view.fov * 0.95;
  const near = groundDistanceAt(view.aimEl - half, firingHeightM);
  const far = groundDistanceAt(view.aimEl + half, firingHeightM);
  return {
    near: clamp(Number.isFinite(near) ? near : MAX_DRAW_RANGE, 8, MAX_DRAW_RANGE),
    far: clamp(Number.isFinite(far) ? far : MAX_DRAW_RANGE, 20, MAX_DRAW_RANGE),
  };
}

/**
 * The ground, drawn as a stack of distance bands blended from near colour to
 * far colour and then into the haze. Every band is a real distance, so the
 * compression of the picture toward the horizon is the true perspective rather
 * than a painted backdrop.
 */
function drawGround(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  light: Light,
): void {
  const halfSpan = view.fov * 1.5 + 0.3;
  const hazeAmount = 1.05 - conditions.visibility * 0.72;

  const elAt = (d: number) => Math.atan2(-firingHeightM, d);
  const bands: number[] = [];
  for (let i = 0; i <= GROUND_BANDS; i++) {
    bands.push(8 * Math.pow(MAX_DRAW_RANGE / 8, i / GROUND_BANDS));
  }

  for (let i = 0; i < GROUND_BANDS; i++) {
    const dNear = bands[i];
    const dFar = bands[i + 1];
    // Last band runs all the way to the horizon so there is never a seam.
    const elNear = elAt(dNear);
    const elFar = i === GROUND_BANDS - 1 ? 0 : elAt(dFar);
    const t = i / (GROUND_BANDS - 1);

    const a = view.project(view.aimAz - halfSpan, elNear);
    const b = view.project(view.aimAz + halfSpan, elNear);
    const c = view.project(view.aimAz + halfSpan, elFar);
    const d = view.project(view.aimAz - halfSpan, elFar);

    const base = mixRgb(light.groundNear, light.groundFar, Math.pow(t, 0.7));
    // Fog / rain falloff: distant bands sink into haze harder.
    const weatherBoost =
      conditions.sky === 'fog' ? 0.28 : conditions.sky === 'rain' ? 0.14 : conditions.sky === 'overcast' ? 0.06 : 0;
    const hazed = mixRgb(
      base,
      light.haze,
      clamp(Math.pow(t, 1.35) * hazeAmount + weatherBoost * Math.pow(t, 0.9), 0, 0.94),
    );

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fillStyle = css(hazed);
    ctx.fill();
  }

  // Wet ground: a few soft specular bands so rain-soaked dirt reads shiny, not just dark.
  if (conditions.sky === 'rain' || conditions.atmosphere.humidity > 0.78) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const d = 40 * Math.pow(900 / 40, i / 7);
      const el = elAt(d);
      const p = view.project(view.aimAz, el);
      const scale = view.pxPerRad / d;
      ctx.globalAlpha = 0.03 + 0.02 * (i % 2);
      ctx.fillStyle = 'rgb(180,190,188)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, view.radius * 0.55, Math.max(1.2, scale * 0.9), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * Ground texture. Two passes: broad patches of lighter and darker going, then a
 * fine speckle of grass and stones with the occasional bush.
 *
 * Everything is placed at a real distance and sized in real metres, so it
 * foreshortens honestly — which matters, because the texture is the only thing
 * giving the eye a sense of how far away the dirt is.
 */
function drawScatter(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  light: Light,
  biome: Biome,
): void {
  const { near, far } = visibleGroundRange(view, firingHeightM);
  if (far <= near) return;
  const seed = conditions.seed;
  const halfSpan = view.fov * 0.85 + 0.04;
  const dry = clamp(1 - conditions.atmosphere.humidity, 0, 1);
  const lightMix = 0.35 + 0.65 * light.level;

  const dark = mixRgb(biome.palette.dark, mixRgb(biome.palette.dark, [92, 84, 54], dry), 0.35);
  const pale = mixRgb(biome.palette.pale, mixRgb(biome.palette.pale, [168, 156, 108], dry), 0.3);
  const scrub = biome.palette.scrub;

  const place = (d: number, azOffset: number): { x: number; y: number } =>
    view.project(view.aimAz + azOffset, Math.atan2(-firingHeightM, d));

  // Broad patches: very low alpha, several metres across, purely to break up a
  // flat wash of colour.
  const patchRings = Math.round(16 * biome.density.patch);
  for (let ring = 0; ring < patchRings; ring++) {
    const d = near * Math.pow(far / near, ring / Math.max(1, patchRings - 1));
    const scale = view.pxPerRad / d;
    const perRing = Math.round(10 * biome.density.patch);
    for (let i = 0; i < perRing; i++) {
      const r1 = hash(ring * 977, i, seed ^ 0x2f);
      const r2 = hash(i * 613, ring, seed ^ 0xb7);
      const p = place(d * (1 + (r2 - 0.5) * 0.18), (r1 - 0.5) * halfSpan * 2.1);
      if (Math.hypot(p.x - view.cx, p.y - view.cy) > view.radius * 1.1) continue;
      const sizeM = 3 + r1 * 9;
      ctx.globalAlpha = 0.06 * lightMix;
      ctx.fillStyle = css(r2 > 0.5 ? pale : dark);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, sizeM * scale, sizeM * scale * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Fine speckle. Small enough that at any usable magnification it reads as
  // texture rather than as things.
  const rings = Math.round(40 * biome.density.speck);
  for (let ring = 0; ring < rings; ring++) {
    const d = near * Math.pow(far / near, ring / Math.max(1, rings - 1));
    if (d > MAX_DRAW_RANGE) break;
    const scale = view.pxPerRad / d;
    const t = clamp(Math.log(d / 8) / Math.log(MAX_DRAW_RANGE / 8), 0, 1);
    const fade = clamp((1 - t) * 0.7 + 0.05, 0.05, 0.55) * lightMix;
    const ringKey = (ring * 2654435761) >>> 0;
    const perRing = Math.round(70 * biome.density.speck);

    for (let i = 0; i < perRing; i++) {
      const r1 = hash(ringKey, i, seed);
      const r2 = hash(i, ringKey, seed ^ 0x51);
      const r3 = hash(i * 31, ring * 17, seed ^ 0x9e);
      const p = place(d * (1 + (r2 - 0.5) * 0.06), (r1 - 0.5) * halfSpan * 2.1);
      if (Math.hypot(p.x - view.cx, p.y - view.cy) > view.radius) continue;

      const bush = r3 > 0.965;
      const sizeM = bush ? 0.16 + r1 * 0.22 : 0.02 + r2 * 0.05;
      const w = Math.max(0.45, sizeM * scale);
      if (w > view.radius * 0.35) continue;
      ctx.globalAlpha = fade * (bush ? 0.75 : 0.5);
      ctx.fillStyle = css(bush ? scrub : r3 > 0.6 ? pale : dark);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, w * (bush ? 1 : 1.6), w * (bush ? 0.85 : 0.55), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * The backstop. Every range has one, and it is the best depth cue in the
 * picture — a wall of earth at a known distance that everything else can be
 * judged against.
 */
function drawBerm(
  ctx: CanvasRenderingContext2D,
  view: View,
  session: Session,
  firingHeightM: number,
  light: Light,
): void {
  const furthest = session.stage.targets.reduce((m, t) => Math.max(m, t.rangeM), 0);
  const d = furthest * 1.12 + 40;
  const height = clamp(furthest * 0.012, 3, 14);
  const halfSpan = view.fov * 1.5 + 0.3;
  const t = clamp(Math.log(d / 8) / Math.log(MAX_DRAW_RANGE / 8), 0, 1);
  const face = mixRgb(mixRgb(light.groundNear, light.groundFar, 0.5), light.haze, t * 0.55);

  ctx.beginPath();
  let started = false;
  const step = halfSpan / 40;
  for (let az = view.aimAz - halfSpan; az <= view.aimAz + halfSpan; az += step) {
    // A rolling crest rather than a straight parapet.
    const crest =
      height * (0.78 + 0.22 * Math.sin(az * 46 + session.conditions.seed) + 0.1 * Math.sin(az * 131));
    const p = view.project(az, Math.atan2(crest - firingHeightM, d));
    if (!started) {
      ctx.moveTo(p.x, p.y);
      started = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  const footRight = view.project(view.aimAz + halfSpan, Math.atan2(-firingHeightM, d * 0.82));
  const footLeft = view.project(view.aimAz - halfSpan, Math.atan2(-firingHeightM, d * 0.82));
  ctx.lineTo(footRight.x, footRight.y);
  ctx.lineTo(footLeft.x, footLeft.y);
  ctx.closePath();
  ctx.fillStyle = css(mixRgb(face, [0, 0, 0], 0.12));
  ctx.fill();
}

/**
 * Horizon silhouette past the berm — treeline, dunes, or an urban skyline
 * depending on biome. Always sits on a real distance so it foreshortens.
 */
function drawHorizon(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  light: Light,
  biome: Biome,
): void {
  const d = biome.horizon === 'skyline' ? 2800 : biome.horizon === 'dunes' ? 3200 : 3400;
  const halfSpan = view.fov * 1.5 + 0.3;
  const base = Math.atan2(-firingHeightM, d);
  const colour = mixRgb(
    mixRgb(biome.palette.ridge, biome.palette.scrub, 0.35),
    light.haze,
    biome.horizon === 'skyline' ? 0.48 : 0.62,
  );
  ctx.beginPath();
  let started = false;
  const step = halfSpan / 70;
  for (let az = view.aimAz - halfSpan; az <= view.aimAz + halfSpan; az += step) {
    let heightM: number;
    if (biome.horizon === 'skyline') {
      // Blocky city fringe: stepped roofs rather than organic canopy.
      const cell = Math.floor((az + conditions.seed * 0.001) * 38);
      const block = hash(cell, 3, conditions.seed ^ 0x51);
      const tower = hash(cell, 9, conditions.seed ^ 0xa7) > 0.82;
      heightM = 8 + block * 18 + (tower ? 14 + block * 20 : 0);
    } else if (biome.horizon === 'dunes') {
      const n =
        Math.sin(az * 48 + conditions.seed * 0.01) * 0.55 +
        Math.sin(az * 17 + 0.4) * 0.3 +
        Math.sin(az * 5) * 0.15;
      heightM = 4 + n * 9;
    } else {
      const n =
        Math.sin(az * 210 + conditions.seed * 0.01) * 0.4 +
        Math.sin(az * 613) * 0.35 +
        Math.sin(az * 97 + 1.7) * 0.25;
      const dense = biome.id === 'forest' ? 1.35 : 1;
      heightM = (12 + n * 7) * dense;
    }
    const p = view.project(az, Math.atan2(heightM - firingHeightM, d));
    if (!started) {
      ctx.moveTo(p.x, p.y);
      started = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  const right = view.project(view.aimAz + halfSpan, base);
  const left = view.project(view.aimAz - halfSpan, base);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.fillStyle = css(colour);
  ctx.fill();

  // Urban skyline: faint window glints on a few blocks.
  if (biome.horizon === 'skyline' && light.level > 0.35) {
    ctx.globalAlpha = 0.12 * light.level;
    ctx.fillStyle = 'rgb(220,210,160)';
    for (let i = 0; i < 18; i++) {
      const r1 = hash(i, 40, conditions.seed ^ 0xcc);
      const r2 = hash(i, 41, conditions.seed ^ 0xdd);
      if (r2 < 0.55) continue;
      const az = view.aimAz + (r1 - 0.5) * halfSpan * 1.8;
      const winH = 10 + r2 * 22;
      const p = view.project(az, Math.atan2(winH - firingHeightM, d));
      const s = Math.max(1, (view.pxPerRad / d) * 1.2);
      ctx.fillRect(p.x - s * 0.4, p.y - s * 0.2, s * 0.8, s * 0.5);
    }
    ctx.globalAlpha = 1;
  }
}

/** Ridge lines at effectively infinite distance, so they only move with azimuth. */
function drawRidges(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  light: Light,
  biome: Biome,
): void {
  // Urban ranges use a flatter backdrop; desert ridges stay warm and low.
  const layers = biome.horizon === 'skyline' ? 2 : 3;
  for (let layer = 0; layer < layers; layer++) {
    const base = -0.0015 - layer * 0.0008;
    const amp = (biome.horizon === 'dunes' ? 0.022 : 0.03) - layer * 0.008;
    const step = 0.02;
    ctx.beginPath();
    let started = false;
    for (let az = view.aimAz - view.fov * 1.6; az <= view.aimAz + view.fov * 1.6; az += step) {
      const n =
        Math.sin(az * (7 + layer * 3) + conditions.seed * 0.001) * 0.5 +
        Math.sin(az * (17 + layer * 5) + layer) * 0.3 +
        Math.sin(az * 41 + conditions.seed * 0.01) * 0.2;
      const el = base + n * amp * 0.5 + amp * 0.5;
      const p = view.project(az, el);
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    const close = view.project(view.aimAz + view.fov * 1.6, -0.5);
    const closeLeft = view.project(view.aimAz - view.fov * 1.6, -0.5);
    ctx.lineTo(close.x, close.y);
    ctx.lineTo(closeLeft.x, closeLeft.y);
    ctx.closePath();
    const shade = 0.16 + layer * 0.1;
    const ridge = mixRgb(biome.palette.ridge, light.haze, 0.25 + layer * 0.1);
    ctx.fillStyle = `rgba(${Math.round(ridge[0] * (0.55 + 0.45 * light.level))},${Math.round(
      ridge[1] * (0.55 + 0.45 * light.level),
    )},${Math.round(ridge[2] * (0.55 + 0.45 * light.level))},${0.85 - shade})`;
    ctx.fill();
  }
}

/**
 * Mirage. Heat coming off the ground bends the light and the whole picture
 * boils — and it drifts with the wind, which makes it the most sensitive wind
 * gauge on the range, right up until it tells you nothing because the wind is
 * straight down the pipe.
 *
 * Better glass cleans the boil without inventing a different wind; cheap glass
 * leaves the picture swimming.
 */
function drawMirage(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  time: number,
  glassQuality = 0.55,
): void {
  if (conditions.mirage < 0.05) return;
  const zone = conditions.zones[Math.floor(conditions.zones.length / 2)] ?? conditions.zones[0];
  const wind = zoneWindAt(zone, time);
  const cross = Math.sin(wind.fromAngle) * wind.speed;
  const head = Math.cos(wind.fromAngle) * wind.speed;
  // Straight into or away from you and the mirage boils vertically instead of
  // running: that is the classic "no value wind" picture.
  const run = clamp(-cross / 5.5, -1, 1);
  const boil = clamp(1 - Math.abs(cross) / 4, 0, 1) * clamp(Math.abs(head) / 6 + 0.4, 0, 1);
  // Elite glass damps the boil; budget glass keeps every shimmer.
  const glassDamp = clamp(1 - glassQuality * 0.62, 0.28, 1);
  const strength = conditions.mirage * glassDamp;

  ctx.save();
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';

  // Horizontal heat bands — lean hard with crosswind so the picture "runs".
  const strips = 34;
  for (let i = 0; i < strips; i++) {
    const d = 200 * Math.pow(2600 / 200, i / (strips - 1));
    const el = Math.atan2(-firingHeightM + 0.6 + (i % 3) * 0.15, d);
    const p = view.project(view.aimAz, el);
    const phase = time * (1.7 + i * 0.14) + i * 0.9;
    const wobble = Math.sin(phase) * 7.5 * strength * (0.35 + boil);
    const slide = run * strength * 36 * (0.55 + 0.45 * Math.sin(phase * 0.37));
    const bandH = Math.max(1.4, view.radius * (0.012 + 0.01 * boil));
    ctx.globalAlpha = 0.038 * strength * (0.7 + 0.3 * Math.sin(phase * 0.5));
    ctx.fillStyle = boil > 0.55 ? 'rgb(210,205,170)' : 'rgb(198,200,175)';
    ctx.fillRect(
      view.cx - view.radius + slide,
      p.y + wobble - bandH * 0.5,
      view.radius * 2,
      bandH,
    );
  }

  // Diagonal shimmer cells so a full-value crosswind is obvious at a glance.
  if (Math.abs(run) > 0.12 || boil > 0.5) {
    const cells = 18;
    for (let i = 0; i < cells; i++) {
      const d = 320 * Math.pow(1800 / 320, i / (cells - 1));
      const el = Math.atan2(-firingHeightM + 1.1, d);
      const azOff = ((i % 5) - 2) * 0.012;
      const p = view.project(view.aimAz + azOff, el);
      const phase = time * 2.1 + i * 1.3;
      const lean = run * strength * 14;
      const rise = Math.sin(phase) * strength * 5 * (0.4 + boil);
      const w = Math.max(4, view.radius * 0.07);
      ctx.globalAlpha = 0.028 * strength;
      ctx.fillStyle = 'rgb(220,215,180)';
      ctx.beginPath();
      ctx.ellipse(p.x + lean, p.y + rise, w, w * 0.22, run * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Weather in the glass: rain streaks, fog wash, and a last-light warm rim.
 * Drawn after scenery so it sits on top of the world without moving mils.
 */
function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  light: Light,
  time: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius, 0, Math.PI * 2);
  ctx.clip();

  // Fog falloff — soft milky wash that densifies toward the horizon / distance.
  const fogAmt =
    conditions.sky === 'fog'
      ? 0.42
      : conditions.visibility < 0.85
        ? (1 - conditions.visibility) * 0.35
        : 0;
  if (fogAmt > 0.04) {
    const fog = ctx.createRadialGradient(
      view.cx,
      view.cy + view.radius * 0.15,
      view.radius * 0.15,
      view.cx,
      view.cy,
      view.radius,
    );
    fog.addColorStop(0, `rgba(170,176,178,${0.08 * fogAmt})`);
    fog.addColorStop(0.55, `rgba(150,156,158,${0.22 * fogAmt})`);
    fog.addColorStop(1, `rgba(130,136,140,${0.45 * fogAmt})`);
    ctx.fillStyle = fog;
    ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);
  }

  // Rain streaks — wind-leaned so they agree with the flag picture.
  if (conditions.sky === 'rain') {
    const zone = conditions.zones[0] ?? conditions.zones[conditions.zones.length - 1];
    const wind = zone ? zoneWindAt(zone, time) : { speed: 3, fromAngle: Math.PI / 2 };
    const lean = Math.sin(wind.fromAngle) * clamp(wind.speed / 10, 0.15, 0.85);
    const streaks = 48;
    for (let i = 0; i < streaks; i++) {
      const u = hash(i, Math.floor(time * 9), conditions.seed ^ 0x71);
      const v = hash(i * 3, Math.floor(time * 9) + 1, conditions.seed ^ 0xa3);
      const x0 = view.cx - view.radius + u * view.radius * 2;
      const y0 = view.cy - view.radius + ((v + (time * 0.35) % 1) % 1) * view.radius * 2.2;
      const len = view.radius * (0.06 + u * 0.1);
      ctx.strokeStyle = `rgba(190,200,210,${0.12 + v * 0.14})`;
      ctx.lineWidth = 1 + u * 0.8;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + lean * len * 1.4, y0 + len);
      ctx.stroke();
    }
  }

  // Last-light warm rim — lower half of the tube catches residual sun.
  const h = conditions.hour;
  const lastLight = clamp(1 - Math.abs(h - 18.2) / 2.4, 0, 1) * (h > 16 && h < 20.5 ? 1 : 0);
  if (lastLight > 0.08 && conditions.sky !== 'rain') {
    const rim = ctx.createLinearGradient(view.cx, view.cy, view.cx, view.cy + view.radius);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(0.45, 'rgba(0,0,0,0)');
    rim.addColorStop(1, `rgba(210,120,60,${0.14 * lastLight * light.level})`);
    ctx.fillStyle = rim;
    ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);
  }

  // Storm grey cast over the whole picture.
  if (conditions.sky === 'rain' || (conditions.sky === 'overcast' && light.level < 0.75)) {
    const grey = conditions.sky === 'rain' ? 0.12 : 0.06;
    ctx.fillStyle = `rgba(70,76,80,${grey})`;
    ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);
  }

  ctx.restore();
}

// --- wind indicators ----------------------------------------------------

/**
 * Range flags. A flag hanging dead is nothing; a flag straight out is around
 * fifteen miles an hour. What it points at is where the wind is going, and how
 * side-on you see it is how much of that wind is going to move your bullet.
 */
function drawFlags(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  time: number,
  light: Light,
): void {
  conditions.zones.forEach((zone, index) => {
    const d = zone.distanceM;
    if (d < 60) return;
    const wind = zoneWindAt(zone, time);
    // Space the indicators out either side of the target line.
    const side = index % 2 === 0 ? -1 : 1;
    const az = view.aimAz * 0 + side * (0.055 + 0.03 * ((index * 7) % 3)) + (index - 1) * 0.012;
    const groundEl = Math.atan2(-firingHeightM, d);
    const poleTopEl = Math.atan2(-firingHeightM + 3.2, d);
    const base = view.project(az, groundEl);
    const top = view.project(az, poleTopEl);
    if (Math.hypot(base.x - view.cx, base.y - view.cy) > view.radius * 1.25) return;

    const scale = view.pxPerRad / d;
    ctx.strokeStyle = `rgba(40,42,38,${0.5 + 0.4 * light.level})`;
    ctx.lineWidth = Math.max(0.8, scale * 0.06);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();

    if (zone.indicator === 'flag' || zone.indicator === 'smoke') {
      // Droop: dead calm hangs straight down, 15 mph stands it out level.
      const droop = clamp(1 - wind.speed / 6.7, 0, 1) * (Math.PI / 2);
      const downwind = wind.fromAngle + Math.PI;
      // Only the across-the-view part of the wind is visible as flag length.
      const crossView = Math.sin(downwind);
      const alongView = Math.cos(downwind);
      const len = 1.4 * scale;
      const dirX = crossView * Math.cos(droop);
      const dirY = Math.sin(droop) + alongView * 0.12;
      const tipX = top.x + dirX * len;
      const tipY = top.y + dirY * len;
      // Foreshortening: a flag pointing at you is a stub.
      const foreshorten = clamp(Math.abs(crossView) * 0.85 + 0.15, 0.15, 1);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(top.x + (tipX - top.x) * foreshorten, top.y + (tipY - top.y) * foreshorten);
      ctx.lineTo(
        top.x + (tipX - top.x) * foreshorten * 0.55,
        top.y + (tipY - top.y) * foreshorten * 0.55 + len * 0.42,
      );
      ctx.closePath();
      ctx.fillStyle = index % 2 === 0 ? '#c9532f' : '#d8a531';
      ctx.globalAlpha = 0.55 + 0.45 * light.level;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Grass, dust and mirage boards: a lean, not a direction.
      const lean = clamp(wind.speed / 9, 0, 1) * Math.sin(wind.fromAngle + Math.PI);
      ctx.strokeStyle = `rgba(120,118,74,${0.4 + 0.4 * light.level})`;
      ctx.lineWidth = Math.max(0.7, scale * 0.05);
      for (let i = -2; i <= 2; i++) {
        const x = base.x + i * scale * 0.25;
        ctx.beginPath();
        ctx.moveTo(x, base.y);
        ctx.quadraticCurveTo(
          x + lean * scale * 0.5,
          base.y - scale * 0.5,
          x + lean * scale * 1.1,
          base.y - scale * 0.75,
        );
        ctx.stroke();
      }
    }
  });
}

// --- scenery props (biome + wind sway) ----------------------------------

/**
 * Cross-view wind lean at a distance. Positive means the prop tips right on
 * screen. Gusts and zone volatility make soft props fidget rather than freeze.
 */
function windSwayAt(
  conditions: Conditions,
  distanceM: number,
  time: number,
  phase: number,
  windiness: number,
): { lean: number; flutter: number; speed: number } {
  // Nearest zone at or before this distance, else the first.
  let zone = conditions.zones[0];
  for (const z of conditions.zones) {
    if (z.distanceM <= distanceM * 1.05) zone = z;
  }
  const wind = zoneWindAt(zone, time);
  // fromAngle is where wind comes FROM; props stream the other way.
  const downwind = wind.fromAngle + Math.PI;
  const cross = Math.sin(downwind);
  const base = clamp(wind.speed / 7.5, 0, 1.35) * windiness;
  const gust =
    0.55 +
    0.45 *
      Math.sin(time * (0.9 + zone.volatility * 1.4) + phase) *
      (0.4 + zone.volatility);
  const lean = cross * base * gust;
  const flutter =
    Math.sin(time * (2.4 + zone.volatility * 3) + phase * 1.7) *
    base *
    zone.volatility *
    0.35;
  return { lean, flutter, speed: wind.speed };
}

/**
 * Larger scenery objects — trees, poles, grass clumps, urban clutter — placed
 * at real ranges. Soft kinds lean and flutter with local wind so density and
 * direction read without a meter.
 */
function drawSceneryProps(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  light: Light,
  biome: Biome,
  time: number,
): void {
  const { near, far } = visibleGroundRange(view, firingHeightM);
  if (far <= near) return;
  const seed = conditions.seed ^ 0xc0ffee;
  const halfSpan = view.fov * 0.9 + 0.05;
  const rings = Math.round(22 * biome.density.prop);
  const perRingBase = Math.round(5 * biome.density.prop);

  for (let ring = 0; ring < rings; ring++) {
    const t = ring / Math.max(1, rings - 1);
    // Bias a little toward mid-range where props read as objects, not texture.
    const d = near * Math.pow(Math.min(far, 2200) / near, Math.pow(t, 0.85));
    if (d < 40 || d > 2400) continue;
    const scale = view.pxPerRad / d;
    if (scale < 0.35) continue;
    const fade = clamp(1 - t * 0.75, 0.18, 0.9) * (0.4 + 0.6 * light.level);
    // More trees in forest at longer rings.
    const treeBoost = biome.density.tree > 1 && d > 180 ? 1.25 : 1;
    const perRing = Math.round(perRingBase * treeBoost * (0.7 + (1 - t) * 0.6));

    for (let i = 0; i < perRing; i++) {
      const r1 = hash(ring * 911, i * 17, seed);
      const r2 = hash(i * 53, ring * 29, seed ^ 0x33);
      const r3 = hash(i, ring, seed ^ 0x99);
      // Keep a clear fire lane near aimAz so plates are not buried in props.
      const lane = 0.012 + 0.01 * (1 - t);
      let azOff = (r1 - 0.5) * halfSpan * 2.05;
      if (Math.abs(azOff) < lane) azOff += Math.sign(azOff || 1) * lane * 1.4;
      const dist = d * (1 + (r2 - 0.5) * 0.12);
      const groundEl = Math.atan2(-firingHeightM, dist);
      const base = view.project(view.aimAz + azOff, groundEl);
      if (Math.hypot(base.x - view.cx, base.y - view.cy) > view.radius * 1.05) continue;

      const picked = pickPropKind(biome, r3);
      // Extra trees when density asks for them.
      const kind: PropKind =
        biome.density.tree > 1.2 && r3 > 0.72 && picked.kind !== 'tree' && r2 > 0.55
          ? 'tree'
          : picked.kind;
      const sway = picked.sway || kind === 'tree' || kind === 'grass' || kind === 'weed';
      const phase = r1 * Math.PI * 2;
      const wind = windSwayAt(conditions, dist, time, phase, biome.windiness);
      const lean = sway ? wind.lean + wind.flutter : 0;
      const s = view.pxPerRad / dist;

      ctx.globalAlpha = fade;
      drawProp(ctx, kind, base.x, base.y, s, lean, wind.speed, light, biome, r1, r2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawProp(
  ctx: CanvasRenderingContext2D,
  kind: PropKind,
  x: number,
  y: number,
  scale: number,
  lean: number,
  windSpeed: number,
  light: Light,
  biome: Biome,
  r1: number,
  r2: number,
): void {
  const leanPx = lean * scale * 1.8;
  switch (kind) {
    case 'grass':
    case 'weed': {
      const h = (kind === 'weed' ? 0.55 : 0.4) * (0.7 + r1 * 0.6);
      const blades = kind === 'weed' ? 5 : 7;
      ctx.strokeStyle = css(mixRgb(biome.palette.scrub, biome.palette.pale, r2 * 0.35), 0.85);
      ctx.lineWidth = Math.max(0.6, scale * 0.03);
      ctx.lineCap = 'round';
      for (let b = 0; b < blades; b++) {
        const ox = (b - (blades - 1) / 2) * scale * 0.08;
        const tipLean = leanPx * (0.7 + r2 * 0.5) * (0.6 + b * 0.08);
        ctx.beginPath();
        ctx.moveTo(x + ox, y);
        ctx.quadraticCurveTo(
          x + ox + tipLean * 0.45,
          y - h * scale * 0.55,
          x + ox + tipLean,
          y - h * scale,
        );
        ctx.stroke();
      }
      break;
    }
    case 'bush': {
      const h = 0.7 + r1 * 0.55;
      const w = 0.85 + r2 * 0.5;
      ctx.fillStyle = css(mixRgb(biome.palette.scrub, biome.palette.dark, 0.25));
      ctx.beginPath();
      ctx.ellipse(x + leanPx * 0.35, y - h * scale * 0.45, w * scale * 0.55, h * scale * 0.5, lean * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(mixRgb(biome.palette.scrub, biome.palette.pale, 0.2), 0.7);
      ctx.beginPath();
      ctx.ellipse(x + leanPx * 0.5, y - h * scale * 0.65, w * scale * 0.35, h * scale * 0.32, lean * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tree': {
      const trunkH = 2.2 + r1 * 2.8;
      const canopyR = 1.1 + r2 * 1.4;
      // Trunk stays put; canopy drifts with the wind.
      ctx.strokeStyle = css(mixRgb([52, 40, 28], biome.palette.dark, 0.4));
      ctx.lineWidth = Math.max(1, scale * 0.14);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + leanPx * 0.15, y - trunkH * scale);
      ctx.stroke();
      const cx = x + leanPx * 0.55;
      const cy = y - trunkH * scale * 0.92;
      ctx.fillStyle = css(mixRgb(biome.palette.scrub, [30, 48, 32], 0.25));
      ctx.beginPath();
      ctx.ellipse(cx, cy, canopyR * scale * 0.7, canopyR * scale * 0.85, lean * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(mixRgb(biome.palette.scrub, biome.palette.pale, 0.15), 0.55);
      ctx.beginPath();
      ctx.ellipse(cx + leanPx * 0.12, cy - canopyR * scale * 0.2, canopyR * scale * 0.4, canopyR * scale * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cactus': {
      const h = 1.1 + r1 * 1.4;
      ctx.fillStyle = css(mixRgb([62, 96, 58], biome.palette.scrub, 0.4));
      ctx.fillRect(x - scale * 0.08, y - h * scale, scale * 0.16, h * scale);
      // Arms
      if (r2 > 0.35) {
        ctx.fillRect(x, y - h * scale * 0.65, scale * 0.35, scale * 0.1);
        ctx.fillRect(x + scale * 0.28, y - h * scale * 0.9, scale * 0.1, scale * 0.35);
      }
      if (r2 > 0.65) {
        ctx.fillRect(x - scale * 0.4, y - h * scale * 0.5, scale * 0.32, scale * 0.1);
      }
      break;
    }
    case 'rock':
    case 'rubble': {
      const w = (kind === 'rubble' ? 0.7 : 0.9) + r1 * 1.1;
      const h = 0.35 + r2 * 0.55;
      ctx.fillStyle = css(mixRgb(biome.palette.dark, biome.palette.pale, 0.35));
      ctx.beginPath();
      ctx.ellipse(x, y - h * scale * 0.35, w * scale * 0.55, h * scale * 0.45, r1 * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (kind === 'rubble') {
        ctx.fillStyle = css(biome.palette.dark, 0.7);
        ctx.fillRect(x - scale * 0.25, y - scale * 0.35, scale * 0.5, scale * 0.2);
      }
      break;
    }
    case 'fence': {
      const h = 1.15;
      ctx.strokeStyle = css(mixRgb([70, 62, 48], biome.palette.dark, 0.3), 0.85);
      ctx.lineWidth = Math.max(0.8, scale * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h * scale);
      ctx.stroke();
      // Wire rails — slight bow in wind
      ctx.lineWidth = Math.max(0.5, scale * 0.03);
      for (const frac of [0.35, 0.65]) {
        const yy = y - h * scale * frac;
        ctx.beginPath();
        ctx.moveTo(x - scale * 0.55, yy);
        ctx.quadraticCurveTo(x + leanPx * 0.2, yy + Math.abs(lean) * scale * 0.08, x + scale * 0.55, yy);
        ctx.stroke();
      }
      break;
    }
    case 'flag': {
      const pole = 2.4 + r1 * 0.8;
      ctx.strokeStyle = css([40, 42, 38], 0.85);
      ctx.lineWidth = Math.max(0.8, scale * 0.05);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - pole * scale);
      ctx.stroke();
      const droop = clamp(1 - windSpeed / 6.7, 0, 1) * (Math.PI / 2) * 0.85;
      const len = 1.1 * scale;
      const dirX = Math.sign(lean || 1) * Math.cos(droop) * (0.35 + Math.abs(lean) * 0.65);
      const dirY = Math.sin(droop);
      ctx.beginPath();
      ctx.moveTo(x, y - pole * scale);
      ctx.lineTo(x + dirX * len, y - pole * scale + dirY * len);
      ctx.lineTo(x + dirX * len * 0.55, y - pole * scale + dirY * len * 0.55 + len * 0.4);
      ctx.closePath();
      ctx.fillStyle = r2 > 0.5 ? '#c9532f' : '#d8a531';
      ctx.fill();
      break;
    }
    case 'windsock': {
      const pole = 2.8;
      ctx.strokeStyle = css([50, 52, 48], 0.9);
      ctx.lineWidth = Math.max(0.8, scale * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - pole * scale);
      ctx.stroke();
      const fill = clamp(windSpeed / 8, 0.1, 1);
      const len = (1.3 + fill * 0.6) * scale;
      const dir = Math.sign(lean || 1);
      ctx.beginPath();
      ctx.moveTo(x, y - pole * scale);
      ctx.lineTo(x + dir * len, y - pole * scale + (1 - fill) * scale * 0.35);
      ctx.lineTo(x + dir * len * 0.9, y - pole * scale + scale * 0.35);
      ctx.closePath();
      ctx.fillStyle = fill > 0.55 ? '#e07830' : '#c8a040';
      ctx.fill();
      break;
    }
    case 'sign': {
      const pole = 2.0;
      ctx.strokeStyle = css([60, 60, 58], 0.9);
      ctx.lineWidth = Math.max(0.8, scale * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - pole * scale);
      ctx.stroke();
      // Hanging board sways
      const bx = x + leanPx * 0.4;
      const by = y - pole * scale * 0.85;
      ctx.fillStyle = css(mixRgb([120, 90, 50], biome.palette.pale, 0.2));
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(lean * 0.25);
      ctx.fillRect(-scale * 0.45, 0, scale * 0.9, scale * 0.55);
      ctx.restore();
      break;
    }
    case 'lamp': {
      const pole = 4.2 + r1 * 1.2;
      ctx.strokeStyle = css([48, 48, 52], 0.9);
      ctx.lineWidth = Math.max(1, scale * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - pole * scale);
      ctx.stroke();
      ctx.fillStyle = css([180, 170, 120], 0.35 + 0.4 * light.level);
      ctx.beginPath();
      ctx.arc(x, y - pole * scale, Math.max(1.2, scale * 0.18), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'building': {
      const w = 3.5 + r1 * 5;
      const h = 2.5 + r2 * 6;
      ctx.fillStyle = css(mixRgb(biome.palette.dark, biome.palette.ridge, 0.4));
      ctx.fillRect(x - (w * scale) / 2, y - h * scale, w * scale, h * scale);
      // Roof lip
      ctx.fillStyle = css(mixRgb(biome.palette.dark, [40, 40, 42], 0.3));
      ctx.fillRect(x - (w * scale) / 2 - scale * 0.1, y - h * scale - scale * 0.15, w * scale + scale * 0.2, scale * 0.2);
      // Windows
      if (scale > 2) {
        ctx.fillStyle = css([40, 48, 58], 0.7);
        const cols = 2 + Math.floor(r1 * 2);
        const rows = 1 + Math.floor(r2 * 3);
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const wx = x - (w * scale) / 2 + ((col + 0.5) / cols) * w * scale;
            const wy = y - h * scale + ((row + 0.4) / (rows + 0.5)) * h * scale;
            ctx.fillRect(wx - scale * 0.12, wy - scale * 0.15, scale * 0.24, scale * 0.3);
          }
        }
      }
      break;
    }
  }
}

// --- targets ------------------------------------------------------------

export interface TargetDraw {
  runtime: TargetRuntime;
  screen: { x: number; y: number };
  /** Screen radius of the plate, pixels. */
  sizePx: number;
}

export function targetAim(
  target: Target,
  firingHeightM: number,
  time: number,
): { az: number; el: number } {
  const lateral = targetOffsetAt(target, time);
  return {
    az: target.azimuth + lateral / Math.max(1, target.rangeM),
    el: targetInclination(target, firingHeightM),
  };
}

function drawTarget(
  ctx: CanvasRenderingContext2D,
  view: View,
  runtime: TargetRuntime,
  firingHeightM: number,
  time: number,
  light: Light,
  conditions: Conditions,
): TargetDraw | null {
  const t = runtime.target;
  const aim = targetAim(t, firingHeightM, time);
  const centre = view.project(aim.az, aim.el);
  const scale = view.pxPerRad / t.rangeM;
  const halfW = (t.widthM / 2) * scale;
  const halfH = (t.tallM / 2) * scale;
  if (
    Math.hypot(centre.x - view.cx, centre.y - view.cy) >
    view.radius + Math.max(halfW, halfH) + 20
  ) {
    return null;
  }

  // Haze washes distant plates out the same way it washes out the ground, so
  // a target at 1200 m is genuinely harder to see than one at 300 m.
  const dt = clamp(Math.log(Math.max(1, t.rangeM) / 100) / Math.log(4000 / 100), 0, 1);
  const wash = clamp(dt * (1.05 - conditions.visibility * 0.72), 0, 0.72);

  // Hit plates keep pale paint-dust scars; unhit steel is dark with a cool sheen.
  const steel: Rgb = runtime.hit ? [208, 200, 178] : [52, 58, 54];
  const body = mixRgb(steel, light.haze, wash);
  const shade = mixRgb(runtime.hit ? [160, 152, 130] : [28, 32, 30], light.haze, wash);
  const highlight = mixRgb(runtime.hit ? [250, 246, 230] : [168, 178, 168], light.haze, wash);

  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(-view.cant);

  // Stand posts + crossbar + feet — reads as a real steel target frame.
  const standPx = STAND_HEIGHT_M * scale;
  if (standPx > 1.2) {
    const postX = halfW * 0.42;
    const postW = Math.max(0.7, halfW * 0.1);
    const footY = halfH + standPx;
    const barY = halfH + standPx * 0.22;
    // Soft contact shadow on the dirt.
    ctx.fillStyle = css(mixRgb([18, 20, 16], light.haze, wash), 0.28);
    ctx.beginPath();
    ctx.ellipse(0, footY + postW, halfW * 0.7, postW * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Posts.
    ctx.strokeStyle = css(mixRgb([40, 42, 38], light.haze, wash), 0.95);
    ctx.lineWidth = postW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-postX, halfH * 0.75);
    ctx.lineTo(-postX, footY);
    ctx.moveTo(postX, halfH * 0.75);
    ctx.lineTo(postX, footY);
    ctx.stroke();
    // Crossbar and feet.
    if (halfW > 3) {
      ctx.lineWidth = Math.max(0.6, postW * 0.85);
      ctx.beginPath();
      ctx.moveTo(-postX, barY);
      ctx.lineTo(postX, barY);
      ctx.moveTo(-postX - postW * 1.2, footY);
      ctx.lineTo(-postX + postW * 1.2, footY);
      ctx.moveTo(postX - postW * 1.2, footY);
      ctx.lineTo(postX + postW * 1.2, footY);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  const pathPlate = (): void => {
    switch (t.shape) {
      case 'gong':
      case 'head':
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(0.7, halfW), Math.max(0.7, halfH), 0, 0, Math.PI * 2);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -halfH);
        ctx.lineTo(halfW, 0);
        ctx.lineTo(0, halfH);
        ctx.lineTo(-halfW, 0);
        ctx.closePath();
        break;
      case 'silhouette': {
        const shoulder = -halfH * 0.42;
        ctx.beginPath();
        ctx.moveTo(-halfW, halfH);
        ctx.lineTo(-halfW, shoulder);
        ctx.lineTo(-halfW * 0.42, shoulder);
        ctx.lineTo(-halfW * 0.42, -halfH);
        ctx.lineTo(halfW * 0.42, -halfH);
        ctx.lineTo(halfW * 0.42, shoulder);
        ctx.lineTo(halfW, shoulder);
        ctx.lineTo(halfW, halfH);
        ctx.closePath();
        break;
      }
    }
  };

  // Body fill.
  pathPlate();
  ctx.fillStyle = css(body);
  ctx.fill();

  // Edge bevel: dark outer lip + light inner ring so the plate has thickness.
  if (halfW > 2.5) {
    pathPlate();
    ctx.strokeStyle = css(shade, 0.9);
    ctx.lineWidth = Math.max(1, halfW * 0.1);
    ctx.stroke();
    pathPlate();
    ctx.strokeStyle = css(highlight, 0.55);
    ctx.lineWidth = Math.max(0.6, halfW * 0.045);
    ctx.stroke();
  }

  // Specular sheen across the face (steel, not matte cardboard).
  if (halfW > 4) {
    ctx.save();
    pathPlate();
    ctx.clip();
    const sheen = ctx.createLinearGradient(-halfW, -halfH, halfW * 0.6, halfH);
    sheen.addColorStop(0, `rgba(255,255,255,${runtime.hit ? 0.1 : 0.2})`);
    sheen.addColorStop(0.35, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.7, `rgba(0,0,0,${runtime.hit ? 0.08 : 0.18})`);
    sheen.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = sheen;
    ctx.fillRect(-halfW * 1.2, -halfH * 1.2, halfW * 2.4, halfH * 2.4);
    // Soft top-left catch light.
    const catchLight = ctx.createRadialGradient(
      -halfW * 0.35,
      -halfH * 0.4,
      0,
      -halfW * 0.35,
      -halfH * 0.4,
      Math.max(halfW, halfH) * 0.9,
    );
    catchLight.addColorStop(0, `rgba(230,235,228,${runtime.hit ? 0.12 : 0.22})`);
    catchLight.addColorStop(1, 'rgba(230,235,228,0)');
    ctx.fillStyle = catchLight;
    ctx.fillRect(-halfW * 1.2, -halfH * 1.2, halfW * 2.4, halfH * 2.4);
    ctx.restore();
  }

  // Centre ring / paint zone on gongs once they resolve.
  if ((t.shape === 'gong' || t.shape === 'head') && halfW > 9) {
    ctx.beginPath();
    ctx.ellipse(0, 0, halfW * 0.36, halfH * 0.36, 0, 0, Math.PI * 2);
    ctx.strokeStyle = css(mixRgb(runtime.hit ? [150, 140, 118] : [122, 130, 120], light.haze, wash), 0.8);
    ctx.lineWidth = Math.max(0.5, halfW * 0.05);
    ctx.stroke();
  }

  // Lasting paint-dust scars on a hit plate — deterministic per target id.
  if (runtime.hit && halfW > 5) {
    ctx.save();
    pathPlate();
    ctx.clip();
    let seed = 0;
    for (let i = 0; i < t.id.length; i++) seed = (seed * 33 + t.id.charCodeAt(i)) | 0;
    for (let i = 0; i < 7; i++) {
      const r1 = hash(seed, i, 0x51);
      const r2 = hash(seed ^ 0x2f, i * 3, 0xb7);
      const r3 = hash(i, seed, 0x9e);
      const px = (r1 - 0.5) * halfW * 1.5;
      const py = (r2 - 0.5) * halfH * 1.5;
      const s = Math.max(0.8, halfW * (0.06 + r3 * 0.12));
      ctx.globalAlpha = 0.35 + r3 * 0.35;
      ctx.fillStyle = css(mixRgb([236, 228, 200], light.haze, wash * 0.5));
      ctx.beginPath();
      ctx.ellipse(px, py, s, s * (0.55 + r1 * 0.4), r2 * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (t.label && halfW > 10) {
    ctx.fillStyle = css(mixRgb(runtime.hit ? [104, 98, 82] : [130, 138, 130], light.haze, wash));
    ctx.font = `${Math.max(7, halfH * 0.45)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.label, 0, halfH * 0.58);
  }
  ctx.restore();

  return { runtime, screen: centre, sizePx: Math.max(halfW, halfH) };
}

// --- reticle ------------------------------------------------------------

function drawReticle(
  ctx: CanvasRenderingContext2D,
  view: View,
  optic: Optic,
  magnification: number,
): void {
  const scale = reticleScale(optic, magnification);
  // Mils on the glass. On second focal plane glass this is not one mil of
  // target, and that is the whole trap.
  const pxPerMil = (view.pxPerRad * 0.001) / scale;
  const { cx, cy, radius } = view;

  ctx.save();
  ctx.strokeStyle = C.reticle;
  ctx.fillStyle = C.reticle;
  ctx.lineWidth = Math.max(1, radius * 0.004);

  if (optic.reticle === 'duplex') {
    const thick = radius * 0.55;
    ctx.lineWidth = Math.max(2.5, radius * 0.016);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * radius, cy + dy * radius);
      ctx.lineTo(cx + dx * thick, cy + dy * thick);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, radius * 0.004);
    ctx.beginPath();
    ctx.moveTo(cx - thick, cy);
    ctx.lineTo(cx + thick, cy);
    ctx.moveTo(cx, cy - thick);
    ctx.lineTo(cx, cy + thick);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Fine cross with a gap at the middle so the aiming point is not covered.
  const gap = pxPerMil * 0.16;
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  const marks: ReticleMark[] = reticleMarks(optic);
  ctx.font = `${Math.max(7, radius * 0.032)}px ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const mark of marks) {
    const x = cx + mark.right * pxPerMil;
    const y = cy + mark.down * pxPerMil;
    if (Math.hypot(x - cx, y - cy) > radius * 0.96) continue;
    const size = Math.max(1, mark.size * pxPerMil);
    if (optic.reticle === 'mildot') {
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(x - size / 2, y - Math.max(0.8, pxPerMil * 0.02), size, Math.max(1.4, pxPerMil * 0.04));
    }
    if (mark.label && pxPerMil > 26) {
      ctx.fillText(mark.label, x + size + 3, y);
    }
  }
  ctx.restore();
}

/** Bubble level. Without the gear that provides it, nothing is drawn at all. */
function drawLevel(ctx: CanvasRenderingContext2D, view: View, cant: number): void {
  const w = view.radius * 0.5;
  const y = view.cy + view.radius * 0.78;
  const h = Math.max(7, view.radius * 0.035);
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = 'rgba(20,24,20,0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(view.cx - w / 2, y - h / 2, w, h, h / 2);
  ctx.stroke();
  const offset = clamp(cant / 0.09, -1, 1) * (w / 2 - h * 0.6);
  const level = Math.abs(cant) < 0.006;
  ctx.beginPath();
  ctx.arc(view.cx + offset, y, h * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = level ? 'rgba(127,201,138,0.9)' : 'rgba(224,112,95,0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,24,20,0.6)';
  ctx.beginPath();
  ctx.moveTo(view.cx, y - h / 2);
  ctx.lineTo(view.cx, y + h / 2);
  ctx.stroke();
  ctx.restore();
}

// --- the whole picture --------------------------------------------------

export interface Tracer {
  path: TrajectoryPoint[];
  /** Seconds since the shot broke. */
  age: number;
  tof: number;
}

export interface Splash {
  az: number;
  el: number;
  rangeM: number;
  age: number;
  hit: boolean;
}

export interface ScopeRender {
  session: Session;
  view: View;
  time: number;
  tracers: Tracer[];
  splashes: Splash[];
  showLevel: boolean;
  /** Darkens as the eye box narrows under recoil. */
  eyeRelief: number;
  /** Residual recoil kick 0..1 — drives flinch, flash, and dust outside the tube. */
  shotKick?: number;
  /** Muzzle device signature 0..1 (brake high, suppressor low). */
  muzzleSignature?: number;
}

export function renderScope(ctx: CanvasRenderingContext2D, r: ScopeRender): TargetDraw[] {
  const { session, view, time } = r;
  const conditions = session.conditions;
  const biome = biomeById(session.stage.biomeId);
  const light = lightFor(conditions, biome);
  const firingHeightM = session.stage.firingHeightM;
  const clarity = session.loadout.optic.glass;
  const shotKick = r.shotKick ?? 0;
  const muzzleSig = r.muzzleSignature ?? 0.7;

  ctx.save();
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius, 0, Math.PI * 2);
  ctx.clip();

  // Sky.
  const gradient = ctx.createLinearGradient(0, view.cy - view.radius, 0, view.cy + view.radius);
  gradient.addColorStop(0, light.skyTop);
  gradient.addColorStop(1, light.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);

  drawRidges(ctx, view, conditions, light, biome);
  drawGround(ctx, view, conditions, firingHeightM, light);
  drawHorizon(ctx, view, conditions, firingHeightM, light, biome);
  drawBerm(ctx, view, session, firingHeightM, light);
  drawScatter(ctx, view, conditions, firingHeightM, light, biome);
  drawSceneryProps(ctx, view, conditions, firingHeightM, light, biome, time);
  drawFlags(ctx, view, conditions, firingHeightM, time, light);

  const drawn: TargetDraw[] = [];
  for (const runtime of session.targets) {
    if (session.clockS < runtime.availableAtS || session.clockS >= runtime.goneAtS) continue;
    const d = drawTarget(ctx, view, runtime, firingHeightM, session.clockS, light, conditions);
    if (d) drawn.push(d);
  }

  drawMirage(ctx, view, conditions, firingHeightM, time, clarity);
  drawAtmosphere(ctx, view, conditions, light, time);

  // Vapour trail. Only the part of the flight that has happened is drawn.
  for (const tracer of r.tracers) {
    const points = tracer.path.filter((p) => p.t <= tracer.age);
    if (points.length < 2) continue;
    ctx.beginPath();
    let started = false;
    for (const p of points) {
      const horizontal = Math.hypot(p.pos.x, p.pos.z);
      const az = Math.atan2(p.pos.z, p.pos.x);
      const el = Math.atan2(p.pos.y, horizontal);
      const s = view.project(az, el);
      if (!started) {
        ctx.moveTo(s.x, s.y);
        started = true;
      } else {
        ctx.lineTo(s.x, s.y);
      }
    }
    ctx.strokeStyle = `rgba(228,232,222,${clamp(0.5 - tracer.age * 0.12, 0.05, 0.5)})`;
    ctx.lineWidth = Math.max(1, view.radius * 0.006);
    ctx.stroke();
  }

  // Impacts — steel hit splash (paint dust) vs dirt puff.
  for (const splash of r.splashes) {
    if (splash.age < 0) continue;
    const p = view.project(splash.az, splash.el);
    const scale = view.pxPerRad / splash.rangeM;
    const grow = 1 - Math.exp(-splash.age * 5.5);
    const hitLife = 1.85;
    const missLife = 2.5;
    const fade = clamp(1 - splash.age / (splash.hit ? hitLife : missLife), 0, 1);
    if (splash.hit) {
      // Bright strike flash, then expanding paint/dust chips that hang a beat.
      const core = Math.max(2.5, scale * 0.55 * grow);
      ctx.globalAlpha = fade * 0.95;
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = Math.max(1.2, scale * 0.09);
      ctx.beginPath();
      ctx.arc(p.x, p.y, core, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = fade * 0.55;
      ctx.fillStyle = 'rgba(255,240,190,0.9)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, core * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Paint dust cloud.
      ctx.globalAlpha = fade * 0.4;
      ctx.fillStyle = 'rgb(230,222,190)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, core * 1.8, core * 1.15, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Chips flying off the face.
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + splash.age * 1.5;
        const dist = core * (0.9 + grow * 1.4) * (0.6 + (i % 3) * 0.2);
        ctx.globalAlpha = fade * 0.5;
        ctx.fillStyle = i % 2 === 0 ? '#f0e6c0' : '#c8c0a0';
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(ang) * dist, p.y + Math.sin(ang) * dist * 0.75, Math.max(0.8, core * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Dust. A rifle bullet into dry ground throws maybe half a metre of it,
      // and it hangs for a second or two, which is all the time you get to
      // read a correction off it.
      const radius = Math.max(1.5, scale * 0.45 * grow);
      ctx.globalAlpha = fade * 0.55;
      ctx.fillStyle = conditions.sky === 'rain' ? 'rgb(120,124,118)' : 'rgb(178,166,136)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + radius * 0.5, radius * 1.15, radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = fade * 0.25;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + radius * 0.2, radius * 2.1, radius * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Scope glass chrome (inside the tube, after the world) -------------
  // Soft edge falloff — poor optics and high power both darken the rim.
  const mag = session.scope.magnification;
  const powerEdge = clamp((mag - 8) / 28, 0, 1);
  const rimDark = 0.5 + (1 - r.eyeRelief) * 0.42 + (1 - clarity) * 0.18 + powerEdge * 0.12;
  const vignette = ctx.createRadialGradient(
    view.cx,
    view.cy,
    view.radius * (0.42 + clarity * 0.12),
    view.cx,
    view.cy,
    view.radius,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.62, 'rgba(4,8,6,0)');
  vignette.addColorStop(0.88, `rgba(4,8,6,${0.22 * rimDark})`);
  vignette.addColorStop(1, `rgba(2,5,4,${rimDark})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);

  // Cool glass cast; worse glass goes greener/murkier.
  ctx.fillStyle = `rgba(90,110,96,${0.14 * (1 - clarity) + 0.025})`;
  ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);

  // Dust / smear on cheap glass — denser at high power where every smudge shows.
  if (clarity < 0.72) {
    const dust = Math.round(18 * (1 - clarity) * (0.6 + powerEdge * 0.5));
    for (let i = 0; i < dust; i++) {
      const u = hash(i, 3, conditions.seed ^ 0x44);
      const v = hash(i * 5, 7, conditions.seed ^ 0x55);
      const ang = u * Math.PI * 2;
      const rad = Math.sqrt(v) * view.radius * 0.92;
      const x = view.cx + Math.cos(ang) * rad;
      const y = view.cy + Math.sin(ang) * rad;
      ctx.globalAlpha = 0.04 + (1 - clarity) * 0.08;
      ctx.fillStyle = 'rgb(200,205,190)';
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + u * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Soft bright ring at the exit pupil (tube chrome catch).
  ctx.strokeStyle = `rgba(180,200,170,${0.12 + clarity * 0.1})`;
  ctx.lineWidth = Math.max(1.5, view.radius * 0.014);
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius * 0.985, 0, Math.PI * 2);
  ctx.stroke();

  // Recoil flinch: brief radial darkening / tunnel as the eye box collapses.
  if (shotKick > 0.08) {
    const flinch = ctx.createRadialGradient(
      view.cx,
      view.cy,
      view.radius * (0.55 - shotKick * 0.2),
      view.cx,
      view.cy,
      view.radius,
    );
    flinch.addColorStop(0, 'rgba(0,0,0,0)');
    flinch.addColorStop(1, `rgba(0,0,0,${0.35 * shotKick})`);
    ctx.fillStyle = flinch;
    ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);
  }

  drawReticle(ctx, view, session.loadout.optic, session.scope.magnification);
  if (r.showLevel) drawLevel(ctx, view, view.cant);

  ctx.restore();

  // Everything outside the tube.
  ctx.fillStyle = C.bgDeep;
  ctx.beginPath();
  ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.arc(view.cx, view.cy, view.radius, 0, Math.PI * 2, true);
  ctx.fill();

  // Scope tube metal ring — layered chrome, not a single flat stroke.
  const ringW = Math.max(2.5, view.radius * 0.028);
  ctx.lineWidth = ringW;
  ctx.strokeStyle = '#121816';
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius + ringW * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, ringW * 0.35);
  ctx.strokeStyle = 'rgba(90,110,96,0.45)';
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius + ringW * 0.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20,28,24,0.9)';
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius + ringW * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  // Shot signature outside the tube: muzzle flash + dust (kit-gated by signature).
  if (shotKick > 0.12) {
    const flash = shotKick * shotKick;
    const sig = clamp(muzzleSig, 0, 1);
    // Flash blooms under the tube (muzzle is "below" the picture in feel).
    const fx = view.cx + (hash(3, 1, 9) - 0.5) * view.radius * 0.08 * flash;
    const fy = view.cy + view.radius * (0.92 + flash * 0.08);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Suppressor: almost no flash; brake: bright and wide.
    const flashAlpha = 0.55 * flash * (0.15 + 0.85 * sig);
    if (flashAlpha > 0.04) {
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, view.radius * (0.18 + 0.2 * sig) * flash);
      g.addColorStop(0, `rgba(255,230,160,${flashAlpha})`);
      g.addColorStop(0.35, `rgba(255,140,40,${flashAlpha * 0.55})`);
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, view.radius * (0.2 + 0.22 * sig) * flash, 0, Math.PI * 2);
      ctx.fill();
    }
    // Brake / bare: dust and debris kicked up under the muzzle.
    if (sig > 0.35 && flash > 0.2) {
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI - Math.PI * 0.5;
        const dist = view.radius * (0.15 + flash * 0.2) * (0.5 + i * 0.08);
        ctx.globalAlpha = 0.18 * flash * sig;
        ctx.fillStyle = 'rgb(160,148,120)';
        ctx.beginPath();
        ctx.ellipse(
          fx + Math.cos(a) * dist * 0.6,
          fy + Math.sin(a) * dist * 0.35 + view.radius * 0.06,
          view.radius * 0.06 * flash,
          view.radius * 0.035 * flash,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  return drawn;
}

export { radToMil };
