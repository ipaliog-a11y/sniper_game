import type { TrajectoryPoint } from '../core/ballistics';
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

export function lightFor(conditions: Conditions): Light {
  const h = conditions.hour;
  // Full daylight between about seven and five, falling off either side.
  const dusk = clamp(Math.min(h - 4.5, 20 - h) / 2.5, 0, 1);
  const overcast =
    conditions.sky === 'overcast' ? 0.7 : conditions.sky === 'rain' ? 0.55 : conditions.sky === 'fog' ? 0.6 : 1;
  const level = clamp(dusk * overcast, 0.12, 1);
  const warm = 1 - dusk;

  const dayTop: Rgb =
    conditions.sky === 'clear' ? [74, 124, 166] : conditions.sky === 'high-cloud' ? [104, 134, 158] : [102, 108, 110];
  const dayBottom: Rgb = conditions.sky === 'clear' ? [176, 202, 212] : [162, 166, 168];
  const nightTop: Rgb = [22, 28, 40];
  const nightBottom: Rgb = [78, 68, 60];

  // Dry ranges are straw, wet ones are green, and everything greys out at dusk.
  const dry = clamp(1 - conditions.atmosphere.humidity, 0, 1);
  const grass: Rgb = mixRgb([78, 96, 58], [138, 128, 82], dry);

  return {
    skyTop: css(mixRgb(nightTop, dayTop, dusk)),
    skyBottom: css(mixRgb(nightBottom, dayBottom, dusk)),
    groundNear: mixRgb([20, 24, 20], grass, level),
    groundFar: mixRgb([26, 32, 32], mixRgb(grass, [148, 152, 138], 0.45), level),
    haze: [150 + 40 * warm, 158 + 20 * warm, 152 + 10 * warm],
    level,
  };
}

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
    const hazed = mixRgb(base, light.haze, clamp(Math.pow(t, 1.4) * hazeAmount, 0, 0.9));

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fillStyle = css(hazed);
    ctx.fill();
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
): void {
  const { near, far } = visibleGroundRange(view, firingHeightM);
  if (far <= near) return;
  const seed = conditions.seed;
  const halfSpan = view.fov * 0.85 + 0.04;
  const dry = clamp(1 - conditions.atmosphere.humidity, 0, 1);
  const lightMix = 0.35 + 0.65 * light.level;

  const dark = mixRgb([38, 46, 30], [92, 84, 54], dry);
  const pale = mixRgb([104, 118, 74], [168, 156, 108], dry);
  const scrub = mixRgb([44, 58, 34], [78, 70, 44], dry);

  const place = (d: number, azOffset: number): { x: number; y: number } =>
    view.project(view.aimAz + azOffset, Math.atan2(-firingHeightM, d));

  // Broad patches: very low alpha, several metres across, purely to break up a
  // flat wash of colour.
  const patchRings = 16;
  for (let ring = 0; ring < patchRings; ring++) {
    const d = near * Math.pow(far / near, ring / (patchRings - 1));
    const scale = view.pxPerRad / d;
    for (let i = 0; i < 10; i++) {
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
  const rings = 40;
  for (let ring = 0; ring < rings; ring++) {
    const d = near * Math.pow(far / near, ring / (rings - 1));
    if (d > MAX_DRAW_RANGE) break;
    const scale = view.pxPerRad / d;
    const t = clamp(Math.log(d / 8) / Math.log(MAX_DRAW_RANGE / 8), 0, 1);
    const fade = clamp((1 - t) * 0.7 + 0.05, 0.05, 0.55) * lightMix;
    const ringKey = (ring * 2654435761) >>> 0;

    for (let i = 0; i < 70; i++) {
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
 * A treeline out past the backstop, sitting on the ground plane a long way off.
 * It gives the horizon somewhere to be when the shooter looks up.
 */
function drawTreeline(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  light: Light,
): void {
  const d = 3400;
  const halfSpan = view.fov * 1.5 + 0.3;
  const base = Math.atan2(-firingHeightM, d);
  const colour = mixRgb(mixRgb([34, 44, 34], [66, 78, 58], light.level), light.haze, 0.62);
  ctx.beginPath();
  let started = false;
  const step = halfSpan / 60;
  for (let az = view.aimAz - halfSpan; az <= view.aimAz + halfSpan; az += step) {
    const n =
      Math.sin(az * 210 + conditions.seed * 0.01) * 0.4 +
      Math.sin(az * 613) * 0.35 +
      Math.sin(az * 97 + 1.7) * 0.25;
    const treeM = 12 + n * 7;
    const p = view.project(az, Math.atan2(treeM - firingHeightM, d));
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
}

/** Ridge lines at effectively infinite distance, so they only move with azimuth. */
function drawRidges(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  light: Light,
): void {
  for (let layer = 0; layer < 3; layer++) {
    const base = -0.0015 - layer * 0.0008;
    const amp = 0.03 - layer * 0.008;
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
    ctx.fillStyle = `rgba(${Math.round(58 + 40 * light.level)},${Math.round(
      70 + 36 * light.level,
    )},${Math.round(72 + 30 * light.level)},${0.85 - shade})`;
    ctx.fill();
  }
}

/**
 * Mirage. Heat coming off the ground bends the light and the whole picture
 * boils — and it drifts with the wind, which makes it the most sensitive wind
 * gauge on the range, right up until it tells you nothing because the wind is
 * straight down the pipe.
 */
function drawMirage(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  time: number,
): void {
  if (conditions.mirage < 0.06) return;
  const zone = conditions.zones[Math.floor(conditions.zones.length / 2)] ?? conditions.zones[0];
  const wind = zoneWindAt(zone, time);
  const cross = Math.sin(wind.fromAngle) * wind.speed;
  const head = Math.cos(wind.fromAngle) * wind.speed;
  // Straight into or away from you and the mirage boils vertically instead of
  // running: that is the classic "no value wind" picture.
  const run = clamp(-cross / 6, -1, 1);
  const boil = clamp(1 - Math.abs(cross) / 4, 0, 1) * clamp(Math.abs(head) / 6 + 0.4, 0, 1);

  ctx.save();
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const strips = 26;
  for (let i = 0; i < strips; i++) {
    const d = 250 * Math.pow(2400 / 250, i / (strips - 1));
    const el = Math.atan2(-firingHeightM + 0.8, d);
    const p = view.project(view.aimAz, el);
    const phase = time * (1.6 + i * 0.13) + i;
    const wobble = Math.sin(phase) * 6 * conditions.mirage * (0.4 + boil);
    const slide = run * conditions.mirage * 22 * (0.6 + 0.4 * Math.sin(phase * 0.4));
    ctx.globalAlpha = 0.045 * conditions.mirage;
    ctx.fillStyle = 'rgb(200,200,170)';
    ctx.fillRect(
      view.cx - view.radius + slide,
      p.y + wobble - view.radius * 0.008,
      view.radius * 2,
      Math.max(1.5, view.radius * 0.016),
    );
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

  const steel: Rgb = runtime.hit ? [214, 208, 190] : [46, 50, 46];
  const body = mixRgb(steel, light.haze, wash);
  const rim = mixRgb(runtime.hit ? [244, 238, 218] : [104, 112, 104], light.haze, wash);

  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(-view.cant);

  // The frame it stands on.
  const standPx = STAND_HEIGHT_M * scale;
  if (standPx > 1.2) {
    ctx.strokeStyle = css(mixRgb([34, 36, 32], light.haze, wash), 0.9);
    ctx.lineWidth = Math.max(0.6, halfW * 0.12);
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.4, halfH * 0.8);
    ctx.lineTo(-halfW * 0.4, halfH + standPx);
    ctx.moveTo(halfW * 0.4, halfH * 0.8);
    ctx.lineTo(halfW * 0.4, halfH + standPx);
    ctx.stroke();
  }

  ctx.fillStyle = css(body);
  ctx.strokeStyle = css(rim);
  ctx.lineWidth = Math.max(0.7, halfW * 0.07);

  switch (t.shape) {
    case 'gong':
    case 'head': {
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(0.7, halfW), Math.max(0.7, halfH), 0, 0, Math.PI * 2);
      ctx.fill();
      if (halfW > 2) ctx.stroke();
      // A painted centre ring, once the plate is big enough to make one out.
      if (halfW > 9) {
        ctx.beginPath();
        ctx.ellipse(0, 0, halfW * 0.36, halfH * 0.36, 0, 0, Math.PI * 2);
        ctx.strokeStyle = css(mixRgb(runtime.hit ? [150, 140, 118] : [122, 130, 120], light.haze, wash), 0.8);
        ctx.lineWidth = Math.max(0.5, halfW * 0.05);
        ctx.stroke();
      }
      break;
    }
    case 'diamond': {
      ctx.beginPath();
      ctx.moveTo(0, -halfH);
      ctx.lineTo(halfW, 0);
      ctx.lineTo(0, halfH);
      ctx.lineTo(-halfW, 0);
      ctx.closePath();
      ctx.fill();
      if (halfW > 2) ctx.stroke();
      break;
    }
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
      ctx.fill();
      if (halfW > 2) ctx.stroke();
      break;
    }
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
}

export function renderScope(ctx: CanvasRenderingContext2D, r: ScopeRender): TargetDraw[] {
  const { session, view, time } = r;
  const conditions = session.conditions;
  const light = lightFor(conditions);
  const firingHeightM = session.stage.firingHeightM;

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

  drawRidges(ctx, view, conditions, light);
  drawGround(ctx, view, conditions, firingHeightM, light);
  drawTreeline(ctx, view, conditions, firingHeightM, light);
  drawBerm(ctx, view, session, firingHeightM, light);
  drawScatter(ctx, view, conditions, firingHeightM, light);
  drawFlags(ctx, view, conditions, firingHeightM, time, light);

  const drawn: TargetDraw[] = [];
  for (const runtime of session.targets) {
    if (session.clockS < runtime.availableAtS || session.clockS >= runtime.goneAtS) continue;
    const d = drawTarget(ctx, view, runtime, firingHeightM, session.clockS, light, conditions);
    if (d) drawn.push(d);
  }

  drawMirage(ctx, view, conditions, firingHeightM, time);

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

  // Impacts.
  for (const splash of r.splashes) {
    const p = view.project(splash.az, splash.el);
    const scale = view.pxPerRad / splash.rangeM;
    const grow = 1 - Math.exp(-splash.age * 6);
    const fade = clamp(1 - splash.age / (splash.hit ? 1.2 : 2.4), 0, 1);
    ctx.globalAlpha = fade;
    if (splash.hit) {
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = Math.max(1.2, scale * 0.08);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(3, scale * 0.7 * grow), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Dust. A rifle bullet into dry ground throws maybe half a metre of it,
      // and it hangs for a second or two, which is all the time you get to
      // read a correction off it.
      const radius = Math.max(1.5, scale * 0.45 * grow);
      ctx.globalAlpha = fade * 0.55;
      ctx.fillStyle = 'rgb(178,166,136)';
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

  // Glass: a cool cast, a bright ring at the edge, and vignetting.
  const vignette = ctx.createRadialGradient(
    view.cx,
    view.cy,
    view.radius * 0.55,
    view.cx,
    view.cy,
    view.radius,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, `rgba(4,8,6,${0.55 + (1 - r.eyeRelief) * 0.4})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);

  const clarity = session.loadout.optic.glass;
  ctx.fillStyle = `rgba(90,110,96,${0.13 * (1 - clarity) + 0.03})`;
  ctx.fillRect(view.cx - view.radius, view.cy - view.radius, view.radius * 2, view.radius * 2);

  drawReticle(ctx, view, session.loadout.optic, session.scope.magnification);
  if (r.showLevel) drawLevel(ctx, view, view.cant);

  ctx.restore();

  // Everything outside the tube.
  ctx.fillStyle = C.bgDeep;
  ctx.beginPath();
  ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.arc(view.cx, view.cy, view.radius, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.strokeStyle = '#1b241f';
  ctx.lineWidth = Math.max(2, view.radius * 0.02);
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.radius + ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  return drawn;
}

export { radToMil };
