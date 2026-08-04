import { type Atmosphere, airDensity, speedOfSound } from './atmosphere';
import { type DragModel, SUBSONIC_MACH, TRANSONIC_MACH, dragCoefficient } from './drag';
import { INCH, clamp } from './units';

/**
 * A point-mass ("3-DOF") trajectory solver. It integrates the bullet through
 * real air with gravity, drag against the *relative* wind, and Coriolis, then
 * adds gyroscopic drift as a closed-form correction on top, which is how every
 * field solver worth using is built.
 *
 * Coordinates: x runs downrange along the direction the shooter faces, y is up,
 * z is to the shooter's right. The scope's optical axis starts at the origin;
 * the muzzle sits `sightHeight` below it. Everything is radians and metres.
 */

export const GRAVITY = 9.80665;
const EARTH_RATE = 7.292115e-5; // rad/s

export interface Projectile {
  /** Ballistic coefficient already converted to kg/m^2. See units.bcToSi. */
  bcSi: number;
  dragModel: DragModel;
  /** Muzzle velocity for this barrel and this powder temperature, m/s. */
  muzzleVelocity: number;
  /** Miller stability factor in the barrel it is being fired from. */
  stability: number;
  /** Right-hand twist drifts right. Almost every rifle barrel is right-hand. */
  rightHandTwist: boolean;
}

export interface Wind {
  /** Metres per second at the firing point. */
  speed: number;
  /**
   * Where the wind is blowing *from*, in radians clockwise from downrange.
   * 0 is a headwind (12 o'clock), pi/2 comes from the right (3 o'clock).
   */
  fromAngle: number;
}

export interface Environment {
  atmosphere: Atmosphere;
  wind: Wind;
  /** Positive north. Sets which way Coriolis throws the bullet, and how hard. */
  latitude: number;
  /** Bearing the shooter faces, radians clockwise from true north. */
  azimuth: number;
}

export interface ShotGeometry {
  /** Direction of the optical axis: right of the baseline, radians. */
  aimAz: number;
  /** Direction of the optical axis: above the baseline, radians. */
  aimEl: number;
  /** Bore above the optical axis, radians. Zero angle plus whatever is dialled. */
  boreEl: number;
  /** Bore right of the optical axis, radians. Windage. */
  boreAz: number;
  /** Rifle rotation about the bore, radians. Positive tips the scope right. */
  cant: number;
  /** Scope axis above the bore axis, metres. */
  sightHeight: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TrajectoryPoint {
  t: number;
  pos: Vec3;
  speed: number;
  mach: number;
}

export interface Impact {
  /** Time of flight to the target plane, seconds. */
  tof: number;
  /** Metres above the aim point, measured in the target plane. */
  up: number;
  /** Metres right of the aim point, measured in the target plane. */
  right: number;
  /** Speed at the target, m/s. */
  speed: number;
  /** Mach at the target. Below ~1.2 the group opens up for free. */
  mach: number;
  /** Kinetic energy at the target, joules. Needs the bullet mass. */
  energy: number;
  /** True if the bullet never reached the plane before falling out of the sim. */
  short: boolean;
  path: TrajectoryPoint[];
}

export interface IntegrateOptions {
  /** Fixed step, seconds. 2 ms for solver passes, 0.5 ms for the shot itself. */
  dt?: number;
  /** Record a path point every n steps. 0 records nothing. */
  sampleEvery?: number;
  /** Give up after this long, seconds. */
  maxTof?: number;
  /** Bullet mass in kg, only needed if you want terminal energy. */
  massKg?: number;
}

/** Unit vector from an azimuth (right positive) and elevation (up positive). */
export function direction(az: number, el: number): Vec3 {
  const ce = Math.cos(el);
  return { x: ce * Math.cos(az), y: Math.sin(el), z: ce * Math.sin(az) };
}

/**
 * Where the bore actually points once the rifle is canted. A scope dialled 10
 * mils up on a rifle rolled 5 degrees to the right throws almost a mil of
 * unwanted windage — this is the single most common unexplained miss at
 * distance, and it is why bubble levels exist.
 */
export function borePointing(g: ShotGeometry): { az: number; el: number } {
  const c = Math.cos(g.cant);
  const s = Math.sin(g.cant);
  return {
    el: g.aimEl + g.boreEl * c - g.boreAz * s,
    az: g.aimAz + g.boreEl * s + g.boreAz * c,
  };
}

function windVector(wind: Wind): Vec3 {
  // fromAngle is where it comes from, so the air moves the opposite way.
  return {
    x: -wind.speed * Math.cos(wind.fromAngle),
    y: 0,
    z: -wind.speed * Math.sin(wind.fromAngle),
  };
}

/**
 * Earth's rotation vector expressed in the shooter's local frame. Firing east
 * lifts the bullet, firing west drops it, and in the northern hemisphere every
 * shot walks right no matter which way it is pointed.
 */
function earthRate(env: Environment): Vec3 {
  const cosLat = Math.cos(env.latitude);
  return {
    x: EARTH_RATE * cosLat * Math.cos(env.azimuth),
    y: EARTH_RATE * Math.sin(env.latitude),
    z: -EARTH_RATE * cosLat * Math.sin(env.azimuth),
  };
}

/**
 * Gyroscopic drift, Litz's fit to the Miller stability factor. A spinning
 * bullet noses very slightly into its own curved path and slides sideways the
 * way the rifling turns it — about 20 cm right at 1000 m for a .308.
 */
export function spinDrift(projectile: Projectile, tof: number): number {
  if (tof <= 0) return 0;
  const inches = 1.25 * (projectile.stability + 1.2) * Math.pow(tof, 1.83);
  return inches * INCH * (projectile.rightHandTwist ? 1 : -1);
}

/**
 * Integrate one shot and report where it crosses the plane through the target,
 * perpendicular to the line of sight.
 */
export function fire(
  projectile: Projectile,
  env: Environment,
  geom: ShotGeometry,
  targetRange: number,
  options: IntegrateOptions = {},
): Impact {
  const dt = options.dt ?? 0.001;
  const sampleEvery = options.sampleEvery ?? 0;
  // ELR .50 / .338 arcs need ~10–16 s of flight; keep headroom past two miles.
  const maxTof = options.maxTof ?? 20;

  const rho = airDensity(env.atmosphere);
  const sonic = speedOfSound(env.atmosphere);
  const dragK = (rho * Math.PI) / (8 * projectile.bcSi);
  const w = windVector(env.wind);
  const omega = earthRate(env);
  const model: DragModel = projectile.dragModel;

  // The line of sight, and the plane we are shooting at.
  const los = direction(geom.aimAz, geom.aimEl);
  const planePoint = {
    x: los.x * targetRange,
    y: los.y * targetRange,
    z: los.z * targetRange,
  };
  // In-plane axes: "up" is perpendicular to the sight line in the vertical
  // plane, "right" is horizontal and square to both.
  const rightAxis = normalise({ x: -los.z, y: 0, z: los.x });
  const upAxis = cross(rightAxis, los);

  const bore = borePointing(geom);
  const d = direction(bore.az, bore.el);
  const v0 = projectile.muzzleVelocity;

  // Muzzle sits below the optical axis, square to the bore.
  let px = -upAxis.x * geom.sightHeight;
  let py = -upAxis.y * geom.sightHeight;
  let pz = -upAxis.z * geom.sightHeight;
  let vx = d.x * v0;
  let vy = d.y * v0;
  let vz = d.z * v0;

  const path: TrajectoryPoint[] = [];
  let t = 0;
  let step = 0;

  function signedDistance(x: number, y: number, z: number): number {
    return (x - planePoint.x) * los.x + (y - planePoint.y) * los.y + (z - planePoint.z) * los.z;
  }

  // Acceleration at a state. Drag works against the wind-relative velocity;
  // Coriolis works on the ground-relative one.
  function accel(sx: number, sy: number, sz: number, out: number[]): void {
    const rx = sx - w.x;
    const ry = sy - w.y;
    const rz = sz - w.z;
    const speed = Math.hypot(rx, ry, rz);
    const cd = dragCoefficient(model, speed / sonic);
    const k = dragK * cd * speed;
    out[0] = -k * rx - 2 * (omega.y * sz - omega.z * sy);
    out[1] = -k * ry - 2 * (omega.z * sx - omega.x * sz) - GRAVITY;
    out[2] = -k * rz - 2 * (omega.x * sy - omega.y * sx);
  }

  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const c = [0, 0, 0];
  const e = [0, 0, 0];

  let crossed = false;
  while (t < maxTof) {
    // Classic RK4 on the coupled position/velocity system.
    accel(vx, vy, vz, a);
    const k1vx = a[0], k1vy = a[1], k1vz = a[2];

    accel(vx + (k1vx * dt) / 2, vy + (k1vy * dt) / 2, vz + (k1vz * dt) / 2, b);
    const k2vx = b[0], k2vy = b[1], k2vz = b[2];

    accel(vx + (k2vx * dt) / 2, vy + (k2vy * dt) / 2, vz + (k2vz * dt) / 2, c);
    const k3vx = c[0], k3vy = c[1], k3vz = c[2];

    accel(vx + k3vx * dt, vy + k3vy * dt, vz + k3vz * dt, e);
    const k4vx = e[0], k4vy = e[1], k4vz = e[2];

    const nvx = vx + (dt / 6) * (k1vx + 2 * k2vx + 2 * k3vx + k4vx);
    const nvy = vy + (dt / 6) * (k1vy + 2 * k2vy + 2 * k3vy + k4vy);
    const nvz = vz + (dt / 6) * (k1vz + 2 * k2vz + 2 * k3vz + k4vz);
    const npx = px + (dt / 2) * (vx + nvx);
    const npy = py + (dt / 2) * (vy + nvy);
    const npz = pz + (dt / 2) * (vz + nvz);

    const ppx = px, ppy = py, ppz = pz;
    const pvx = vx, pvy = vy, pvz = vz;
    const pt = t;
    const pf = signedDistance(px, py, pz);
    px = npx; py = npy; pz = npz;
    vx = nvx; vy = nvy; vz = nvz;
    t += dt;
    step++;

    if (sampleEvery > 0 && step % sampleEvery === 0) {
      const speed = Math.hypot(vx, vy, vz);
      path.push({ t, pos: { x: px, y: py, z: pz }, speed, mach: speed / sonic });
    }

    const f = signedDistance(px, py, pz);
    if (f >= 0) {
      crossed = true;
      // Land exactly on the plane by interpolating the last step.
      const span = f - pf;
      const u = span === 0 ? 0 : -pf / span;
      px = ppx + (px - ppx) * u;
      py = ppy + (py - ppy) * u;
      pz = ppz + (pz - ppz) * u;
      vx = pvx + (vx - pvx) * u;
      vy = pvy + (vy - pvy) * u;
      vz = pvz + (vz - pvz) * u;
      t = pt + dt * u;
      break;
    }
    // Bullet has stopped making downrange progress: it will never get there.
    if (vx * los.x + vy * los.y + vz * los.z <= 0) break;
  }

  const dx = px - planePoint.x;
  const dy = py - planePoint.y;
  const dz = pz - planePoint.z;
  const speed = Math.hypot(vx, vy, vz);
  const drift = spinDrift(projectile, t);

  if (sampleEvery > 0) {
    path.push({ t, pos: { x: px, y: py, z: pz }, speed, mach: speed / sonic });
  }

  return {
    tof: t,
    up: dx * upAxis.x + dy * upAxis.y + dz * upAxis.z,
    right: dx * rightAxis.x + dy * rightAxis.y + dz * rightAxis.z + drift,
    speed,
    mach: speed / sonic,
    energy: 0.5 * (options.massKg ?? 0) * speed * speed,
    short: !crossed,
    path,
  };
}

/**
 * Miss distance against launch angle is smooth and very nearly straight — over
 * the target's range it is basically `angle x range` — so a secant search lands
 * on the root in three or four steps. A dozen bisections as a fallback keeps it
 * honest if the shot cannot reach at all and the curve goes flat.
 */
function findRoot(
  f: (x: number) => number,
  guess: number,
  slope: number,
  lo: number,
  hi: number,
  tolerance = 1e-4,
): number {
  let x0 = clamp(guess, lo, hi);
  let f0 = f(x0);
  if (Math.abs(f0) < tolerance) return x0;
  let x1 = clamp(x0 - f0 / slope, lo, hi);
  if (x1 === x0) x1 = clamp(x0 + (hi - lo) * 1e-3, lo, hi);

  for (let i = 0; i < 12; i++) {
    const f1 = f(x1);
    if (Math.abs(f1) < tolerance) return x1;
    const denom = f1 - f0;
    if (denom === 0) break;
    let next = x1 - (f1 * (x1 - x0)) / denom;
    if (!Number.isFinite(next)) break;
    next = clamp(next, lo, hi);
    x0 = x1;
    f0 = f1;
    x1 = next;
    if (Math.abs(x1 - x0) < 1e-10) return x1;
  }
  return x1;
}

export interface FiringSolution {
  /** Bore above the sight line needed to hit, radians. */
  elevation: number;
  /** Bore right of the sight line needed to hit, radians. */
  windage: number;
  tof: number;
  impactSpeed: number;
  impactMach: number;
  /** Drop below the bore line at the target, metres. Handy for a data card. */
  drop: number;
  spinDrift: number;
  transonic: boolean;
  subsonic: boolean;
}

const SOLVER_OPTS: IntegrateOptions = { dt: 0.003 };

/**
 * Work out what the rifle has to be told to hit a target at this range in
 * these conditions. Elevation and windage are solved in turn; one pass of
 * re-solving elevation afterwards catches the small coupling between them.
 */
export function solve(
  projectile: Projectile,
  env: Environment,
  targetRange: number,
  sightHeight: number,
  losAngle = 0,
): FiringSolution {
  const base = (boreEl: number, boreAz: number) =>
    fire(
      projectile,
      env,
      { aimAz: 0, aimEl: losAngle, boreEl, boreAz, cant: 0, sightHeight },
      targetRange,
      SOLVER_OPTS,
    );

  // The slope of miss-height against launch angle is the target range, near
  // enough, and the same holds sideways. That makes both searches quick.
  let windage = 0;
  let elevation = findRoot((el) => base(el, windage).up, 0, targetRange, -0.02, 0.3);
  windage = findRoot((az) => base(elevation, az).right, 0, targetRange, -0.06, 0.06);
  elevation = findRoot((el) => base(el, windage).up, elevation, targetRange, -0.02, 0.3);

  const shot = fire(
    projectile,
    env,
    { aimAz: 0, aimEl: losAngle, boreEl: elevation, boreAz: windage, cant: 0, sightHeight },
    targetRange,
    { dt: 0.001 },
  );

  return {
    elevation,
    windage,
    tof: shot.tof,
    impactSpeed: shot.speed,
    impactMach: shot.mach,
    drop: elevation * targetRange,
    spinDrift: spinDrift(projectile, shot.tof),
    transonic: shot.mach < TRANSONIC_MACH,
    subsonic: shot.mach < SUBSONIC_MACH,
  };
}

/**
 * The bore angle that puts the bullet on the sight line at the zero distance.
 * Everything the shooter later dials is measured from here, so a rifle zeroed
 * at 100 m in July does not shoot where it did in January.
 */
export function zeroAngle(
  projectile: Projectile,
  env: Environment,
  zeroRange: number,
  sightHeight: number,
): number {
  return findRoot(
    (el) =>
      fire(
        projectile,
        env,
        { aimAz: 0, aimEl: 0, boreEl: el, boreAz: 0, cant: 0, sightHeight },
        zeroRange,
        SOLVER_OPTS,
      ).up,
    0,
    zeroRange,
    -0.02,
    0.3,
  );
}

// --- tiny vector helpers -----------------------------------------------

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalise(v: Vec3): Vec3 {
  const m = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

export { clamp };
