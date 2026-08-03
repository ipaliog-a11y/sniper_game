import type { TrajectoryPoint } from '../core/ballistics';
import type { Optic } from '../core/catalog/attachments';
import {
  type Target,
  STAND_HEIGHT_M,
  targetCentreHeight,
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

interface Light {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundFar: string;
  haze: string;
  /** 0..1 overall brightness, folded into contrast on the targets. */
  level: number;
}

export function lightFor(conditions: Conditions): Light {
  const h = conditions.hour;
  const dusk = clamp(Math.min(h - 4.5, 20 - h) / 2.5, 0, 1);
  const level = clamp(dusk * (conditions.sky === 'overcast' ? 0.7 : conditions.sky === 'rain' ? 0.55 : conditions.sky === 'fog' ? 0.6 : 1), 0.12, 1);

  const warm = 1 - dusk;
  const mix = (a: number[], b: number[], t: number) =>
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(
      a[2] + (b[2] - a[2]) * t,
    )})`;

  const dayTop = conditions.sky === 'clear' ? [86, 132, 168] : conditions.sky === 'high-cloud' ? [110, 138, 158] : [104, 110, 112];
  const dayBottom = conditions.sky === 'clear' ? [168, 196, 208] : [158, 164, 166];
  const nightTop = [24, 30, 42];
  const nightBottom = [72, 66, 62];

  return {
    skyTop: mix(nightTop, dayTop, dusk),
    skyBottom: mix(nightBottom, dayBottom, dusk),
    ground: mix([28, 30, 26], conditions.sky === 'fog' ? [104, 108, 100] : [96, 100, 68], level),
    groundFar: mix([32, 36, 34], [126, 130, 116], level),
    haze: `rgba(${Math.round(150 + 40 * warm)},${Math.round(158 + 20 * warm)},${Math.round(
      150 + 10 * warm,
    )},1)`,
    level,
  };
}

// --- the world ----------------------------------------------------------

const GROUND_BANDS = 46;
const MAX_DRAW_RANGE = 4200;

/**
 * The ground, drawn as a stack of distance bands. Because the shooter sits well
 * above the range floor, near ground fills the bottom of the picture and far
 * ground crowds into a thin strip below the horizon — which is exactly why
 * judging distance by eye past 600 m does not work.
 */
function drawGround(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  light: Light,
): void {
  const halfSpan = view.fov * 1.4 + 0.25;
  const bands: Array<{ d: number; el: number }> = [];
  for (let i = 0; i <= GROUND_BANDS; i++) {
    const t = i / GROUND_BANDS;
    // Distances spaced geometrically so the near ground gets the detail.
    const d = 18 * Math.pow(MAX_DRAW_RANGE / 18, t);
    bands.push({ d, el: Math.atan2(-firingHeightM, d) });
  }

  for (let i = 0; i < GROUND_BANDS; i++) {
    const near = bands[i];
    const far = bands[i + 1];
    const fade = clamp(Math.log(far.d / 18) / Math.log(MAX_DRAW_RANGE / 18), 0, 1);
    const a = view.project(view.aimAz - halfSpan, near.el);
    const b = view.project(view.aimAz + halfSpan, near.el);
    const c = view.project(view.aimAz + halfSpan, far.el);
    const d = view.project(view.aimAz - halfSpan, far.el);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? light.ground : light.groundFar;
    ctx.globalAlpha = 1;
    ctx.fill();
    // Haze thickens with distance and with anything wet in the air.
    const hazeStrength = clamp(fade * (1.15 - conditions.visibility * 0.75), 0, 0.92);
    ctx.globalAlpha = hazeStrength;
    ctx.fillStyle = light.haze;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Scrub, rocks and grass tufts. Purely so the eye has a scale to work with. */
function drawScatter(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  firingHeightM: number,
  light: Light,
): void {
  const seed = conditions.seed;
  const halfSpan = view.fov * 0.85 + 0.06;
  ctx.globalAlpha = 0.55 * light.level + 0.15;
  for (let ring = 0; ring < 22; ring++) {
    const d = 45 * Math.pow(2600 / 45, ring / 21);
    const perRing = 26;
    const el = Math.atan2(-firingHeightM + 0.35, d);
    for (let i = 0; i < perRing; i++) {
      const r1 = hash(ring, i, seed);
      const r2 = hash(i, ring, seed ^ 0x51);
      const az = view.aimAz + (r1 - 0.5) * halfSpan * 2.4 + (r2 - 0.5) * 0.02;
      if (Math.abs(az - view.aimAz) > halfSpan) continue;
      const p = view.project(az, el + (r2 - 0.5) * 0.0008);
      if (Math.hypot(p.x - view.cx, p.y - view.cy) > view.radius) continue;
      const size = clamp((0.9 * view.pxPerRad) / d, 0.6, 14);
      const fade = clamp(1 - Math.log(d / 45) / Math.log(2600 / 45), 0.12, 1);
      ctx.fillStyle = r1 > 0.72 ? 'rgba(60,58,44,1)' : 'rgba(74,80,52,1)';
      ctx.globalAlpha = fade * (0.45 * light.level + 0.1);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, size * 1.6, size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Ridge lines at effectively infinite distance, so they only move with azimuth. */
function drawRidges(
  ctx: CanvasRenderingContext2D,
  view: View,
  conditions: Conditions,
  light: Light,
): void {
  for (let layer = 0; layer < 3; layer++) {
    const base = -0.004 - layer * 0.0015;
    const amp = 0.035 - layer * 0.009;
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

  const fade = clamp(
    1 - (Math.log(t.rangeM / 100) / Math.log(4000 / 100)) * (1.2 - conditions.visibility),
    0.25,
    1,
  );
  const face = runtime.hit ? '#d8d2c2' : light.level > 0.5 ? '#2f3330' : '#232624';
  const edge = runtime.hit ? '#f2ecd8' : '#4a504b';

  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(-view.cant);
  ctx.globalAlpha = fade;

  // The frame it stands on.
  const standPx = STAND_HEIGHT_M * scale;
  if (standPx > 1.5) {
    ctx.strokeStyle = 'rgba(40,42,38,0.85)';
    ctx.lineWidth = Math.max(0.7, halfW * 0.14);
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.35, halfH);
    ctx.lineTo(-halfW * 0.35, halfH + standPx);
    ctx.moveTo(halfW * 0.35, halfH);
    ctx.lineTo(halfW * 0.35, halfH + standPx);
    ctx.stroke();
  }

  ctx.fillStyle = face;
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(0.6, halfW * 0.08);

  switch (t.shape) {
    case 'gong':
    case 'head': {
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (halfW > 7) {
        ctx.globalAlpha = fade * 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, halfW * 0.35, halfH * 0.35, 0, 0, Math.PI * 2);
        ctx.strokeStyle = runtime.hit ? '#b9b09a' : '#5c635e';
        ctx.lineWidth = Math.max(0.5, halfW * 0.05);
        ctx.stroke();
        ctx.globalAlpha = fade;
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
      ctx.stroke();
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
      ctx.stroke();
      break;
    }
  }

  if (t.label && halfW > 9) {
    ctx.fillStyle = runtime.hit ? '#6b6553' : '#7c847d';
    ctx.font = `${Math.max(7, halfH * 0.5)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.label, 0, halfH * 0.55);
  }
  ctx.restore();
  ctx.globalAlpha = 1;

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
      ctx.fillStyle = 'rgba(160,148,118,0.75)';
      const radius = Math.max(2.5, scale * 1.6 * grow);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + radius * 0.4, radius, radius * 0.75, 0, 0, Math.PI * 2);
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
