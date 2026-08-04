import { t } from '../core/i18n';
import { targetInclination, targetMils } from '../core/range';
import { fieldOfView, reticleScale } from '../core/scope';
import {
  type Session,
  type TargetRuntime,
  exposedTargets,
  finishSession,
  fireRound,
  targetUnderAim,
  tick,
} from '../core/session';
import { spotterCall } from '../core/shot';
import { clamp, mToYard, msToFps, msToMph, radToMil, rangeFromMils } from '../core/units';
import { effectiveWind } from '../core/weather';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, bar, fillPanel, paragraph, rule, text } from '../ui/gfx';
import {
  dopePanel,
  solutionPanel,
  trajectoryPanel,
  type TrajPanelState,
  turretPanel,
  weatherPanel,
} from '../ui/panels';
import { type Splash, type Tracer, makeView, renderScope, targetAim } from '../ui/scopeView';
import { C, Scroll, T } from '../ui/ui';
import { MenuScene } from './MenuScene';
import { ResultScene } from './ResultScene';

/**
 * Behind the rifle.
 *
 * Drag anywhere on the glass to aim. The hold wanders on its own — breathing,
 * pulse, and whatever your support is not doing for you — and the only way to
 * quiet it is to stop breathing, which works for about eight seconds and then
 * works considerably less well. Break the shot in the pause and it goes where
 * you put it.
 */

type Overlay = 'none' | 'wind' | 'dope' | 'turrets' | 'solution' | 'mil' | 'traj';

const HOLD_LIMIT = 8.5;
const RECOVER_RATE = 0.55;

export class ShootScene implements Scene {
  readonly name = 'shoot';
  private session: Session;

  /** Where the shooter has commanded the rifle to point, radians. */
  private aimAz = 0;
  private aimEl = 0;
  /** Sway is added to that to get the real optical axis. */
  private swayAz = 0;
  private swayEl = 0;
  private swayPhase = Math.random() * 10;
  private cant = 0;
  private cantDrift = Math.random() * 10;

  /** 0 is fully rested, 1 is completely out of breath. */
  private breath = 0;
  private holding = false;
  private holdTime = 0;

  /** Seconds left of the bolt cycle. Nothing can be fired while this runs. */
  private cycle = 0;
  private recoilKick = 0;

  private tracers: Tracer[] = [];
  private splashes: Splash[] = [];
  private overlay: Overlay = 'none';
  private dopeScroll = new Scroll('shootdope');
  private call = '';
  private callHit = false;
  private callUntil = 0;
  private time = 0;
  private ending = 0;

  /** Last shot's true muzzle velocity (m/s) when a chrono is fitted; null otherwise. */
  private chronoLastMs: number | null = null;
  private chronoUntil = 0;

  /** Trajectory plotter overlay state (gear-gated). */
  private trajState: TrajPanelState = { shotIndex: 0, probe: null };

  /** Mil-ranging tool: the two ends of the measurement, in screen pixels. */
  private milFrom: { x: number; y: number } | null = null;
  private milTo: { x: number; y: number } | null = null;
  private milTargetIndex = 0;

  /** Swinging the rifle onto a plate: where it is going, and how far along. */
  private pan: { fromAz: number; fromEl: number; toAz: number; toEl: number; t: number } | null =
    null;
  /** Which exposed plate FIND last put you on, so repeat presses step along. */
  private lastFound: string | null = null;
  /** Leaving mid-stage throws the run away, so it asks once. */
  private confirmExit = false;
  private confirmExitUntil = 0;

  constructor(session: Session) {
    this.session = session;
  }

  enter(): void {
    const session = this.session;
    session.phase = 'live';
    // Start looking at the first target that will be up, so nobody spends the
    // clock hunting for the range.
    const first = session.targets.find((t) => t.availableAtS === 0) ?? session.targets[0];
    if (first) {
      const aim = targetAim(first.target, session.stage.firingHeightM, 0);
      this.aimAz = aim.az;
      this.aimEl = aim.el;
    }
  }

  exit(): void {
    audio.stopWind();
  }

  // --- the hold --------------------------------------------------------

  private updateHold(dt: number, app: App): void {
    const loadout = this.session.loadout;

    if (this.holding) {
      this.holdTime += dt;
      // Holding your breath is free for a few seconds and then it is not.
      this.breath = clamp(this.breath + dt * (this.holdTime > HOLD_LIMIT ? 0.55 : 0.09), 0, 1);
      if (this.holdTime > HOLD_LIMIT + 4) {
        this.holding = false;
        app.toast(t('shoot.out_of_air'), 'bad');
      }
    } else {
      this.holdTime = Math.max(0, this.holdTime - dt * 2);
      this.breath = clamp(this.breath - dt * RECOVER_RATE, 0, 1);
    }

    // Settling: the hold tightens for the first couple of seconds behind the
    // rifle, which is what a bipod's set-up time is buying you.
    const settled = clamp(this.time / Math.max(0.3, loadout.setupSeconds + 1.2), 0, 1);
    const holdQuality = this.holding && this.holdTime < HOLD_LIMIT ? 0.28 : 1;
    const fatigue = 1 + this.breath * 2.1;
    const amplitude = loadout.swayMils * 0.001 * holdQuality * fatigue * (1.6 - 0.6 * settled);

    this.swayPhase += dt * loadout.swayRate;
    const p = this.swayPhase;
    // Two slow components for the wander and a fast small one for the pulse.
    this.swayEl =
      amplitude *
      (Math.sin(p * 1.9) * 0.55 + Math.sin(p * 0.71 + 1.3) * 0.35 + Math.sin(p * 7.4) * 0.1);
    this.swayAz =
      amplitude *
      (Math.sin(p * 1.3 + 2.1) * 0.6 + Math.sin(p * 0.53) * 0.3 + Math.cos(p * 7.1) * 0.08);

    // Cant creeps in on its own unless the rifle is on something.
    this.cantDrift += dt * 0.23;
    const cantAmp = 0.055 * this.session.loadout.support.swayFactor;
    this.cant = Math.sin(this.cantDrift) * cantAmp * (0.4 + this.breath);

    // Recoil settles back over the rifle's own time constant.
    this.recoilKick = Math.max(0, this.recoilKick - dt / Math.max(0.2, loadout.settleSeconds));
    this.cycle = Math.max(0, this.cycle - dt);
  }

  update(dt: number, app: App): void {
    this.time += dt;
    const session = this.session;

    if (session.phase === 'live') tick(session, dt);
    this.updateHold(dt, app);
    this.updatePan(dt);
    if (this.confirmExit && this.time > this.confirmExitUntil) this.confirmExit = false;

    for (const tracer of this.tracers) tracer.age += dt;
    this.tracers = this.tracers.filter((t) => t.age < t.tof + 3);
    for (const splash of this.splashes) splash.age += dt;
    this.splashes = this.splashes.filter((s) => s.age < 3);

    const wind = effectiveWind(session.conditions, 300, session.clockS);
    audio.setWind(wind.speed);

    if (session.phase === 'complete') {
      this.ending += dt;
      // Let the last bullet land and be heard before the card comes up.
      if (this.ending > 2.4) {
        app.set(new ResultScene(session, finishSession(session)));
      }
    }
  }

  // --- input -----------------------------------------------------------

  private isMouseMode(app: App): boolean {
    return app.profile.settings.controlMode === 'mouse';
  }

  /** Mouse wheel changes magnification; touch still pinches. */
  private handleWheelZoom(app: App): void {
    if (!this.isMouseMode(app)) return;
    // Panels that scroll (data card) keep the wheel for themselves.
    if (this.overlay === 'dope') return;
    const dy = app.input.wheel;
    if (dy === 0) return;
    const optic = this.session.loadout.optic;
    // Wheel down zooms out — same sense as most maps and CAD viewports.
    const factor = Math.exp(-dy * 0.0018);
    this.session.scope.magnification = clamp(
      this.session.scope.magnification * factor,
      optic.magMin,
      optic.magMax,
    );
  }

  private handleAim(app: App, glass: Rect): void {
    const input = app.input;
    const settings = app.profile.settings;
    const optic = this.session.loadout.optic;
    const fov = fieldOfView(optic, this.session.scope.magnification);
    const radius = Math.min(glass.w, glass.h) / 2;
    const pxPerRad = (radius * 2) / fov;
    const mouse = this.isMouseMode(app);

    // Pinch to change magnification (touch). Mouse uses the wheel instead.
    const claimed = input.byClaim('aim');
    const dragging = claimed.length > 0
      ? claimed
      : input.free().filter((p) => p.dragging && p.button === 0);
    if (!mouse && dragging.length >= 2) {
      const [a, b] = dragging;
      const now = Math.hypot(a.x - b.x, a.y - b.y);
      const before = Math.hypot(a.x - a.dx - (b.x - b.dx), a.y - a.dy - (b.y - b.dy));
      if (before > 4 && now > 4) {
        this.session.scope.magnification = clamp(
          this.session.scope.magnification * (now / before),
          optic.magMin,
          optic.magMax,
        );
      }
      for (const p of dragging) p.claim = 'aim';
      return;
    }

    for (const p of input.pointers.values()) {
      // Right button is breath-hold in mouse mode; never drag the rifle with it.
      if (p.button !== 0) continue;
      if (p.claim !== null && p.claim !== 'aim') continue;
      if (p.claim === null) {
        if (!p.dragging) continue;
        if (p.startX < glass.x || p.startX > glass.x + glass.w) continue;
        if (p.startY < glass.y || p.startY > glass.y + glass.h) continue;
        p.claim = 'aim';
      }
      // Taking hold of the rifle cancels any swing still in progress.
      this.pan = null;
      // Dragging moves the point of aim, so the picture slides the other way.
      // The gearing is per-radian, which means a higher magnification is
      // automatically finer — exactly as it is on a real rifle.
      const sign = settings.invertDrag ? -1 : 1;
      const scale = (settings.aimSensitivity * sign) / pxPerRad;
      this.aimAz += p.dx * scale;
      this.aimEl -= p.dy * scale;
      this.aimEl = clamp(this.aimEl, -0.35, 0.35);
      this.aimAz = clamp(this.aimAz, -0.6, 0.6);
    }
  }

  private onGlass(glass: Rect, x: number, y: number): boolean {
    return x >= glass.x && x <= glass.x + glass.w && y >= glass.y && y <= glass.y + glass.h;
  }

  /**
   * Left-click on the glass breaks the shot. Space does the same in mouse mode
   * for mice that cannot left-click while right-holding breath.
   *
   * While right-hold (breath) is down, fire on the left **press** edge — the
   * mouse reuses one pointerId for every button, so release-based fire alone
   * is unreliable when both buttons are down. Without breath, fire on a clean
   * left release so EXIT / toolbar taps still win.
   */
  private handleMouseFire(app: App, glass: Rect): void {
    if (!this.isMouseMode(app)) return;
    if (this.overlay !== 'none') return;

    const input = app.input;

    // Space always fires from the current hold (works while RMB is held).
    if (input.keyJustPressed('Space')) {
      this.shoot(app);
      return;
    }

    const holdingBreath = input.isButtonHeld(2);

    // RMB held: LMB just went down → fire if the cursor is on the glass.
    if (holdingBreath && input.buttonJustPressed(0)) {
      const x = input.hoverX >= 0 ? input.hoverX : glass.x + glass.w / 2;
      const y = input.hoverY >= 0 ? input.hoverY : glass.y + glass.h / 2;
      if (this.onGlass(glass, x, y)) {
        this.shoot(app);
      }
      return;
    }

    // Not holding breath: primary release that nothing else ate.
    if (holdingBreath) return;

    for (const r of input.releases) {
      if (r.consumed || r.button !== 0 || r.travel > 12) continue;
      if (!this.onGlass(glass, r.startX, r.startY)) continue;
      if (!this.onGlass(glass, r.x, r.y)) continue;
      r.consumed = true;
      this.shoot(app);
      return;
    }
  }

  private shoot(app: App): void {
    const session = this.session;
    if (session.phase !== 'live' || this.cycle > 0 || session.roundsLeft <= 0) return;

    const az = this.aimAz + this.swayAz;
    const el = this.aimEl + this.swayEl;
    const outcome = fireRound(session, az, el, this.cant);
    if (!outcome) return;

    const loadout = session.loadout;
    audio.shot(loadout.muzzle.loudness, clamp(loadout.massKg / 0.02, 0, 1));
    this.cycle = loadout.cycleSeconds + loadout.settleSeconds * 0.4;
    this.recoilKick = 1;

    // Recoil throws the muzzle up and a touch off to one side.
    const kick = loadout.recoilKick * 0.0016;
    this.aimEl += kick;
    this.aimAz += kick * 0.35 * (loadout.rifle.rightHandTwist ? 1 : -1);
    this.breath = clamp(this.breath + 0.06, 0, 1);
    // Keep the hold if the shooter is still right-holding breath in mouse mode.
    if (!(this.isMouseMode(app) && app.input.isButtonHeld(2))) {
      this.holding = false;
    }

    const shot = outcome.shot;
    this.tracers.push({ path: shot.path, age: 0, tof: shot.tof });

    const target = outcome.runtime?.target;
    const rangeM = target ? target.rangeM : 600;
    if (target) {
      const aim = targetAim(target, session.stage.firingHeightM, session.clockS + shot.tof);
      this.splashes.push({
        az: aim.az + shot.missRight / rangeM,
        el: aim.el + shot.missUp / rangeM,
        rangeM,
        age: -shot.tof,
        hit: shot.quality !== null,
      });
      if (shot.quality !== null) audio.impactSteel(rangeM, shot.tof, shot.quality);
      else audio.impactDirt(rangeM, shot.tof);
    }

    // The spotter only calls what a spotter could see.
    const hasSpotter = loadout.hasGear('spotter');
    const call = target
      ? hasSpotter || shot.quality !== null
        ? spotterCall(shot)
        : t('shoot.lost_splash')
      : t('shoot.round_dirt');
    this.call = call;
    this.callHit = shot.quality !== null;
    this.callUntil = this.time + shot.tof + 3.2;

    // Chronograph: each round's true exit speed, not the box number.
    if (loadout.hasGear('chrono')) {
      this.chronoLastMs = shot.muzzleVelocity;
      this.chronoUntil = this.time + shot.tof + 4.5;
    }

    if (loadout.hasGear('traj')) {
      // Point the plotter at the round just fired; probe defaults to impact.
      this.trajState = {
        shotIndex: Math.max(0, this.session.shots.length - 1),
        probe: null,
      };
    }

    if (outcome.newlyHit) audio.chime(true);
    setTimeout(() => audio.bolt(), Math.max(0, (loadout.settleSeconds * 0.5) * 1000));

    if (outcome.outOfAmmo && session.phase === 'live') {
      app.toast(t('shoot.out_of_ammo'), 'bad');
      session.phase = 'complete';
    }
  }

  // --- finding the plate ------------------------------------------------

  /**
   * Swing onto the next plate that is up. Hunting for a 40 cm gong at 25x
   * through a one-degree field of view is not the skill this is trying to
   * teach, so the rifle will find it for you — but the clock keeps running and
   * the swing itself takes a moment, the same as it would behind a real rifle.
   */
  private recenter(app: App): void {
    const session = this.session;
    const up = exposedTargets(session);
    if (up.length === 0) {
      app.toast(t('shoot.nothing_up'), 'bad');
      return;
    }

    // Left to right, so repeated presses walk the line the way you would.
    const ordered = [...up].sort((a, b) => a.target.azimuth - b.target.azimuth);
    const at = ordered.findIndex((t) => t.target.id === this.lastFound);
    // Prefer an un-hit plate; if they are all down, just step to the next one.
    let next = ordered[(at + 1) % ordered.length];
    for (let i = 1; i <= ordered.length; i++) {
      const candidate = ordered[(at + i) % ordered.length];
      if (!candidate.hit) {
        next = candidate;
        break;
      }
    }

    const aim = targetAim(next.target, session.stage.firingHeightM, session.clockS);
    this.pan = {
      fromAz: this.aimAz,
      fromEl: this.aimEl,
      toAz: aim.az,
      toEl: aim.el,
      t: 0,
    };
    this.lastFound = next.target.id;
  }

  /** Ease the swing. Cancelled the instant the shooter takes over by dragging. */
  private updatePan(dt: number): void {
    if (!this.pan) return;
    const pan = this.pan;
    pan.t = clamp(pan.t + dt / 0.32, 0, 1);
    const e = pan.t < 0.5 ? 2 * pan.t * pan.t : 1 - Math.pow(-2 * pan.t + 2, 2) / 2;
    this.aimAz = pan.fromAz + (pan.toAz - pan.fromAz) * e;
    this.aimEl = pan.fromEl + (pan.toEl - pan.fromEl) * e;
    if (pan.t >= 1) this.pan = null;
  }

  // --- ranging ---------------------------------------------------------

  private handleMilTool(app: App, glass: Rect): void {
    const input = app.input;
    for (const p of input.pointers.values()) {
      if (p.claim !== null && p.claim !== 'mil') continue;
      if (p.claim === null) {
        if (p.startX < glass.x || p.startX > glass.x + glass.w) continue;
        if (p.startY < glass.y || p.startY > glass.y + glass.h) continue;
        p.claim = 'mil';
        this.milFrom = { x: p.startX, y: p.startY };
      }
      this.milTo = { x: p.x, y: p.y };
    }
  }

  private milReading(glass: Rect): { mils: number; rangeM: number } | null {
    if (!this.milFrom || !this.milTo) return null;
    const optic = this.session.loadout.optic;
    const radius = Math.min(glass.w, glass.h) / 2;
    const fov = fieldOfView(optic, this.session.scope.magnification);
    const pxPerRad = (radius * 2) / fov;
    // Second focal plane glass measures wrong at anything but its true power,
    // and this is where that bites.
    const pxPerMil = (pxPerRad * 0.001) / reticleScale(optic, this.session.scope.magnification);
    const mils = Math.hypot(this.milTo.x - this.milFrom.x, this.milTo.y - this.milFrom.y) / pxPerMil;
    const sizes = this.milSizes();
    const size = sizes[this.milTargetIndex % sizes.length];
    return { mils, rangeM: rangeFromMils(size.metres, mils) };
  }

  private milSizes(): Array<{ label: string; metres: number }> {
    const seen = new Map<string, number>();
    for (const runtime of this.session.targets) {
      const t = runtime.target;
      const key = `${(t.knownSizeM * 100).toFixed(0)} cm ${t.shape}`;
      seen.set(key, t.knownSizeM);
    }
    return [...seen.entries()].map(([label, metres]) => ({ label, metres }));
  }

  // --- render ----------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui } = app;
    const g = app.gauge;
    const session = this.session;
    const settings = app.profile.settings;

    const barH = (app.width < 560 * g ? 104 : 54) * g;
    const glass: Rect = { x: 0, y: 0, w: app.width, h: app.height - barH };

    this.handleWheelZoom(app);
    if (this.overlay === 'none') this.handleAim(app, glass);
    else if (this.overlay === 'mil') this.handleMilTool(app, glass);

    const optic = session.loadout.optic;
    const fov = fieldOfView(optic, session.scope.magnification);
    const radius = Math.min(glass.w, glass.h) / 2 - 2;
    // Recoil lifts the picture and the eye box narrows for a moment.
    const recoilLift = this.recoilKick * this.recoilKick * session.loadout.recoilKick * 0.0022;
    const view = makeView(
      glass.x + glass.w / 2,
      glass.y + glass.h / 2,
      radius,
      fov,
      this.aimAz + this.swayAz,
      this.aimEl + this.swayEl + recoilLift,
      this.cant,
    );

    renderScope(ctx, {
      session,
      view,
      time: this.time,
      tracers: this.tracers,
      splashes: this.splashes,
      showLevel: session.loadout.hasGear('level'),
      eyeRelief: 1 - this.recoilKick * 0.8,
    });

    this.drawHud(ctx, app, view.cx, radius, glass);
    if (this.overlay === 'mil') this.drawMilTool(ctx, app, glass);

    this.drawToolbar(ctx, app, { x: 0, y: app.height - barH, w: app.width, h: barH });

    if (this.overlay !== 'none' && this.overlay !== 'mil') {
      this.drawOverlay(ctx, app, glass);
    }

    // After every widget has had a chance to consume its tap: left-click fire.
    this.handleMouseFire(app, glass);

    void ui;
    void settings;
    void g;
  }

  private drawHud(
    ctx: CanvasRenderingContext2D,
    app: App,
    cx: number,
    radius: number,
    glass: Rect,
  ): void {
    const g = app.gauge;
    const session = this.session;
    const settings = app.profile.settings;
    const optic = session.loadout.optic;

    // Corner readouts, kept outside the tube so they never cover the picture.
    const pad = 10 * g;
    const left = Math.max(pad, cx - radius - 88 * g);
    const dial = radToMil(session.scope.elevationClicks * optic.clickRad);
    const windDial = radToMil(session.scope.windageClicks * optic.clickRad);

    const stat = (x: number, y: number, label: string, value: string, colour: string = C.text): void => {
      text(ctx, label, x, y, T.micro * g, C.textFaint);
      text(ctx, value, x, y + 14 * g, T.body * g, colour, 'left', 'bold');
    };

    // Leaving is in the corner and asks twice, because walking off a stage
    // throws the run away and nobody should do it with a stray thumb.
    const exitBtn: Rect = {
      x: left,
      y: glass.y + pad,
      w: this.confirmExit ? 148 * g : 72 * g,
      h: 26 * g,
    };
    if (
      app.ui.button(exitBtn, this.confirmExit ? t('shoot.abandon') : t('shoot.exit'), {
        size: T.micro * g,
        accent: this.confirmExit,
        danger: this.confirmExit,
      })
    ) {
      audio.tap();
      if (this.confirmExit) {
        audio.stopWind();
        app.set(new MenuScene());
        return;
      }
      this.confirmExit = true;
      this.confirmExitUntil = this.time + 3.5;
    }

    const statTop = glass.y + 52 * g;
    stat(left, statTop, t('shoot.elev'), `${dial.toFixed(1)} MIL`, C.amber);
    stat(
      left,
      statTop + 36 * g,
      t('shoot.wind'),
      `${Math.abs(windDial).toFixed(1)} ${windDial >= 0 ? 'R' : 'L'}`,
      C.amber,
    );
    stat(left, statTop + 72 * g, t('shoot.mag'), `${session.scope.magnification.toFixed(1)}x`);

    const right = Math.min(app.width - pad - 76 * g, cx + radius + 12 * g);
    stat(
      right,
      statTop,
      t('shoot.rounds'),
      `${session.roundsLeft}`,
      session.roundsLeft <= 2 ? C.red : C.text,
    );
    if (session.freeField) {
      // Free Field: no limit — show elapsed time counting up.
      const elapsed = Math.max(0, session.clockS);
      const mm = Math.floor(elapsed / 60);
      const ss = Math.floor(elapsed % 60);
      stat(
        right,
        statTop + 36 * g,
        t('shoot.clock'),
        `${mm}:${String(ss).padStart(2, '0')}`,
        C.amber,
      );
    } else if (session.practice) {
      stat(right, statTop + 36 * g, t('shoot.clock'), t('shoot.clock_practice'), C.amber);
    } else {
      const remaining = Math.max(0, session.stage.timeLimitS - session.clockS);
      stat(
        right,
        statTop + 36 * g,
        t('shoot.clock'),
        `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`,
        remaining < 20 ? C.red : C.text,
      );
    }
    const down = session.targets.filter((tgt) => tgt.hit).length;
    stat(right, statTop + 72 * g, t('shoot.plates'), `${down}/${session.targets.length}`);

    // Muzzle chronograph: live last shot + running mean for the string.
    if (session.loadout.hasGear('chrono')) {
      const readings = session.shots.map((s) => s.shot.muzzleVelocity);
      const last =
        this.chronoLastMs !== null
          ? msToFps(this.chronoLastMs)
          : readings.length
            ? msToFps(readings[readings.length - 1])
            : null;
      const mean =
        readings.length > 0
          ? msToFps(readings.reduce((a, b) => a + b, 0) / readings.length)
          : msToFps(session.loadout.muzzleVelocity);
      const chronoY = statTop + 108 * g;
      if (last !== null) {
        stat(right, chronoY, t('shoot.chrono'), `${last.toFixed(0)}`, C.green);
      } else {
        stat(right, chronoY, t('shoot.chrono'), t('shoot.chrono_ready'), C.amber);
      }
      if (readings.length >= 2) {
        text(
          ctx,
          t('shoot.chrono_avg', { fps: mean.toFixed(0) }),
          right,
          chronoY + 28 * g,
          T.micro * g,
          C.textFaint,
        );
      }
    }

    // Breath meter under the tube: the one thing the shooter has to watch.
    const meterW = Math.min(radius * 1.1, 220 * g);
    const meter: Rect = {
      x: cx - meterW / 2,
      y: glass.y + glass.h - 28 * g,
      w: meterW,
      h: 7 * g,
    };
    const overheld = this.holding && this.holdTime > HOLD_LIMIT;
    bar(
      ctx,
      meter,
      1 - this.breath,
      overheld ? C.red : this.holding ? C.green : C.textDim,
      'rgba(8,11,10,0.7)',
    );
    text(
      ctx,
      overheld
        ? t('shoot.breathe')
        : this.holding
          ? t('shoot.holding', { s: this.holdTime.toFixed(1) })
          : t('shoot.breathing'),
      cx,
      meter.y - 10 * g,
      T.micro * g,
      overheld ? C.red : C.textFaint,
      'center',
    );

    // The bolt, or the wait for it.
    if (this.cycle > 0) {
      text(
        ctx,
        session.loadout.rifle.action === 'bolt' ? t('shoot.cycling') : t('shoot.recovering'),
        cx,
        glass.y + glass.h - 76 * g,
        T.small * g,
        C.textFaint,
        'center',
      );
    }

    // The spotter's call, in the band between the two columns of readouts. On a
    // screen too narrow for that band it drops below them instead of sitting on
    // top of the elevation you are about to check.
    if (this.call && this.time < this.callUntil) {
      const band = glass.w - 2 * (left + 80 * g);
      const roomy = band > 150 * g;
      const w = roomy ? Math.min(band, 340 * g) : Math.min(glass.w - 24 * g, 340 * g);
      const showChrono =
        session.loadout.hasGear('chrono') &&
        this.chronoLastMs !== null &&
        this.time < this.chronoUntil;
      const box: Rect = {
        x: cx - w / 2,
        y: roomy ? glass.y + pad : statTop + 96 * g,
        w,
        h: showChrono ? 44 * g : 30 * g,
      };
      const hit = this.callHit;
      fillPanel(ctx, box, 6, 'rgba(8,11,10,0.85)', hit ? C.green : C.edge);
      app.ui.fitText(
        this.call,
        cx,
        showChrono ? box.y + 13 * g : box.y + box.h / 2,
        box.w - 16 * g,
        T.small * g,
        hit ? C.green : C.text,
        'center',
      );
      if (showChrono && this.chronoLastMs !== null) {
        text(
          ctx,
          t('shoot.chrono_shot', { fps: msToFps(this.chronoLastMs).toFixed(0) }),
          cx,
          box.y + 32 * g,
          T.micro * g,
          C.amber,
          'center',
        );
      }
    }

    // What is under the reticle right now, and how far away it is.
    const aimed = targetUnderAim(session, this.aimAz + this.swayAz, this.aimEl + this.swayEl);
    if (aimed) {
      const known =
        session.loadout.hasGear('lrf') || settings.assist
          ? aimed.target.rangeM
          : session.known[aimed.target.id];
      const label = known
        ? settings.imperial
          ? `${Math.round(mToYard(known))} yd`
          : `${Math.round(known)} m`
        : t('shoot.range_unknown', { mils: targetMils(aimed.target).toFixed(1) });
      text(
        ctx,
        `${t(`shape.${aimed.target.shape}`)}  ·  ${label}`,
        cx,
        glass.y + glass.h - 58 * g,
        T.small * g,
        known ? C.amber : C.textDim,
        'center',
      );
    }
  }

  private drawMilTool(ctx: CanvasRenderingContext2D, app: App, glass: Rect): void {
    const g = app.gauge;
    const reading = this.milReading(glass);
    if (this.milFrom && this.milTo) {
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(this.milFrom.x, this.milFrom.y);
      ctx.lineTo(this.milTo.x, this.milTo.y);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const p of [this.milFrom, this.milTo]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * g, 0, Math.PI * 2);
        ctx.fillStyle = C.amber;
        ctx.fill();
      }
    }

    const sizes = this.milSizes();
    const size = sizes[this.milTargetIndex % sizes.length];
    const w = Math.min(glass.w - 24 * g, 300 * g);
    const box: Rect = { x: glass.x + glass.w / 2 - w / 2, y: glass.y + 14 * g, w, h: 96 * g };
    fillPanel(ctx, box, 8, 'rgba(8,11,10,0.9)', C.amber);
    const pad = 12 * g;
    text(
      ctx,
      t('shoot.mil_title'),
      box.x + pad,
      box.y + 16 * g,
      T.small * g,
      C.amber,
      'left',
      'bold',
    );
    text(ctx, t('shoot.mil_hint'), box.x + pad, box.y + 32 * g, T.micro * g, C.textFaint);

    const cycle: Rect = { x: box.x + box.w - pad - 120 * g, y: box.y + 44 * g, w: 120 * g, h: 26 * g };
    if (app.ui.button(cycle, size ? size.label : t('shoot.no_targets'), { size: T.micro * g })) {
      this.milTargetIndex++;
      audio.click();
    }

    if (reading && reading.mils > 0.05) {
      const imperial = app.profile.settings.imperial;
      text(
        ctx,
        `${reading.mils.toFixed(2)} MIL`,
        box.x + pad,
        box.y + 58 * g,
        T.head * g,
        C.text,
        'left',
        'bold',
      );
      const r = reading.rangeM;
      const rangeLabel = imperial
        ? `${Math.round(mToYard(r))} yd`
        : `${Math.round(r)} m`;
      text(ctx, rangeLabel, box.x + pad, box.y + 80 * g, T.body * g, C.amber);
      const confirm: Rect = { x: box.x + box.w - pad - 120 * g, y: box.y + 70 * g, w: 120 * g, h: 22 * g };
      if (app.ui.button(confirm, t('shoot.record_it'), { size: T.micro * g, accent: true })) {
        const aimed = targetUnderAim(this.session, this.aimAz + this.swayAz, this.aimEl + this.swayEl);
        if (aimed) {
          this.session.known[aimed.target.id] = r;
          app.toast(t('shoot.recorded', { range: rangeLabel }), 'good');
          this.overlay = 'none';
        } else {
          app.toast(t('shoot.reticle_first'), 'bad');
        }
      }
    } else {
      text(ctx, '— — —', box.x + pad, box.y + 62 * g, T.head * g, C.textFaint, 'left');
    }
  }

  /**
   * The controls. Six tools, the breath hold and the trigger. On a wide screen
   * they fit one row; on a phone the tools take a row of their own so nothing
   * shrinks to a size you cannot hit with a thumb.
   */
  private drawToolbar(ctx: CanvasRenderingContext2D, app: App, r: Rect): void {
    const { ui } = app;
    const g = app.gauge;
    const session = this.session;

    ctx.fillStyle = C.bg;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    rule(ctx, r.x, r.y, r.w, C.edge);

    const pad = 8 * g;
    const twoRow = r.w < 560 * g;
    const rowH = twoRow ? (r.h - pad * 3) / 2 : r.h - pad * 2;

    const tools: Array<[string, Overlay | 'find']> = [
      [t('shoot.find'), 'find'],
      [t('shoot.tool.wind'), 'wind'],
      [t('shoot.tool.card'), 'dope'],
      [t('shoot.tool.dial'), 'turrets'],
      [t('shoot.tool.solve'), 'solution'],
      [t('shoot.tool.mil'), 'mil'],
    ];
    // Trajectory plotter only appears when the gear is on the rifle.
    if (session.loadout.hasGear('traj')) {
      tools.push([t('shoot.tool.traj'), 'traj']);
    }

    // Tools get the whole first row when stacked, or the space the trigger and
    // the breath hold leave over when they share one.
    const triggerW = twoRow ? (r.w - pad * 3) * 0.62 : Math.min(120 * g, r.w * 0.24);
    const breathW = twoRow ? (r.w - pad * 3) * 0.38 : Math.min(96 * g, r.w * 0.18);
    const toolsW = twoRow ? r.w - pad * 2 : r.w - triggerW - breathW - pad * 4;
    const toolGap = 4 * g;
    const toolW = (toolsW - toolGap * (tools.length - 1)) / tools.length;

    tools.forEach(([label, target], i) => {
      const b: Rect = {
        x: r.x + pad + i * (toolW + toolGap),
        y: r.y + pad,
        w: toolW,
        h: rowH,
      };
      const on = target !== 'find' && this.overlay === target;
      if (ui.button(b, label, { size: T.small * g, accent: on })) {
        audio.tap();
        if (target === 'find') {
          this.recenter(app);
          this.overlay = 'none';
          return;
        }
        this.overlay = on ? 'none' : target;
        if (this.overlay === 'mil') {
          this.milFrom = null;
          this.milTo = null;
        }
      }
    });

    const controlY = twoRow ? r.y + pad * 2 + rowH : r.y + pad;
    const breath: Rect = {
      x: twoRow ? r.x + pad : r.x + r.w - triggerW - breathW - pad * 2,
      y: controlY,
      w: breathW,
      h: rowH,
    };
    // Touch: hold the HOLD button. Mouse: right mouse button anywhere, or the button.
    const holdingNow =
      app.input.isHeldIn(breath.x, breath.y, breath.w, breath.h) ||
      (this.isMouseMode(app) && app.input.isButtonHeld(2));
    this.holding = holdingNow && this.holdTime < HOLD_LIMIT + 4;
    fillPanel(
      ctx,
      breath,
      6,
      this.holding ? 'rgba(127,201,138,0.18)' : C.panel,
      this.holding ? C.green : C.edge,
    );
    text(
      ctx,
      t('shoot.hold'),
      breath.x + breath.w / 2,
      breath.y + breath.h / 2,
      T.small * g,
      this.holding ? C.green : C.textDim,
      'center',
      'bold',
    );

    const trigger: Rect = {
      x: twoRow ? r.x + pad * 2 + breathW : r.x + r.w - triggerW - pad,
      y: controlY,
      w: triggerW,
      h: rowH,
    };
    const ready = this.cycle <= 0 && session.roundsLeft > 0 && session.phase === 'live';
    const fireLabel = ready
      ? this.isMouseMode(app)
        ? t('shoot.fire_mouse')
        : t('shoot.fire')
      : this.cycle > 0
        ? '· · ·'
        : t('shoot.empty');
    if (
      ui.button(trigger, fireLabel, {
        accent: ready,
        danger: !ready,
        disabled: !ready,
        size: T.head * g,
      })
    ) {
      this.shoot(app);
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, app: App, glass: Rect): void {
    const g = app.gauge;
    const { ui } = app;
    const session = this.session;

    const maxW = this.overlay === 'traj' ? 480 * g : 420 * g;
    const w = Math.min(glass.w - 24 * g, maxW);
    const panel: Rect = {
      x: glass.x + glass.w - w - 12 * g,
      y: glass.y + 12 * g,
      w,
      h: glass.h - 24 * g,
    };
    fillPanel(ctx, panel, 10, 'rgba(8,11,10,0.94)', C.edge);

    const close: Rect = { x: panel.x + panel.w - 40 * g, y: panel.y + 8 * g, w: 32 * g, h: 28 * g };
    if (ui.button(close, '×', { size: T.head * g })) {
      audio.tap();
      this.overlay = 'none';
    }

    const body: Rect = {
      x: panel.x + 16 * g,
      y: panel.y + 34 * g,
      w: panel.w - 32 * g,
      h: panel.h - 46 * g,
    };
    const panelCtx = { ui, session, settings: app.profile.settings, time: this.time, gauge: g };

    switch (this.overlay) {
      case 'wind':
        weatherPanel(ctx, body, panelCtx);
        break;
      case 'dope':
        dopePanel(ctx, body, panelCtx, this.dopeScroll);
        break;
      case 'turrets':
        turretPanel(ctx, body, panelCtx, () => audio.click());
        break;
      case 'solution': {
        const aimed: TargetRuntime | null = targetUnderAim(
          session,
          this.aimAz + this.swayAz,
          this.aimEl + this.swayEl,
        );
        solutionPanel(ctx, body, panelCtx, aimed?.target ?? null, (elev, wind) => {
          session.scope.elevationClicks = elev;
          session.scope.windageClicks = wind;
          audio.click();
          app.toast(t('shoot.dialled'));
          this.overlay = 'none';
        });
        break;
      }
      case 'traj':
        trajectoryPanel(ctx, body, panelCtx, this.trajState, (next) => {
          this.trajState = next;
        });
        break;
      default:
        break;
    }
  }
}

export { exposedTargets, targetInclination, msToMph, paragraph };
