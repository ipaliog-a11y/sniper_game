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
import { clamp, mToYard, msToMph, radToMil, rangeFromMils } from '../core/units';
import { effectiveWind } from '../core/weather';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, bar, fillPanel, paragraph, rule, text } from '../ui/gfx';
import { dopePanel, solutionPanel, turretPanel, weatherPanel } from '../ui/panels';
import { type Splash, type Tracer, makeView, renderScope, targetAim } from '../ui/scopeView';
import { C, Scroll, T } from '../ui/ui';
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

type Overlay = 'none' | 'wind' | 'dope' | 'turrets' | 'solution' | 'mil';

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
  private callUntil = 0;
  private time = 0;
  private ending = 0;

  /** Mil-ranging tool: the two ends of the measurement, in screen pixels. */
  private milFrom: { x: number; y: number } | null = null;
  private milTo: { x: number; y: number } | null = null;
  private milTargetIndex = 0;

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
        app.toast('Out of air — breathe', 'bad');
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

  private handleAim(app: App, glass: Rect): void {
    const input = app.input;
    const settings = app.profile.settings;
    const optic = this.session.loadout.optic;
    const fov = fieldOfView(optic, this.session.scope.magnification);
    const radius = Math.min(glass.w, glass.h) / 2;
    const pxPerRad = (radius * 2) / fov;

    // Pinch to change magnification.
    const claimed = input.byClaim('aim');
    const dragging = claimed.length > 0 ? claimed : input.free().filter((p) => p.dragging);
    if (dragging.length >= 2) {
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
      if (p.claim !== null && p.claim !== 'aim') continue;
      if (p.claim === null) {
        if (!p.dragging) continue;
        if (p.startX < glass.x || p.startX > glass.x + glass.w) continue;
        if (p.startY < glass.y || p.startY > glass.y + glass.h) continue;
        p.claim = 'aim';
      }
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
    this.holding = false;

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
        : 'Lost the splash. No call.'
      : 'Round into the dirt.';
    this.call = call;
    this.callUntil = this.time + shot.tof + 3.2;

    if (outcome.newlyHit) audio.chime(true);
    setTimeout(() => audio.bolt(), Math.max(0, (loadout.settleSeconds * 0.5) * 1000));

    if (outcome.outOfAmmo && session.phase === 'live') {
      app.toast('Out of ammunition', 'bad');
      session.phase = 'complete';
    }
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

    const barH = 54 * g;
    const glass: Rect = { x: 0, y: 0, w: app.width, h: app.height - barH };

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

    stat(left, glass.y + 22 * g, 'ELEV', `${dial >= 0 ? '' : ''}${dial.toFixed(1)} MIL`, C.amber);
    stat(
      left,
      glass.y + 58 * g,
      'WIND',
      `${Math.abs(windDial).toFixed(1)} ${windDial >= 0 ? 'R' : 'L'}`,
      C.amber,
    );
    stat(left, glass.y + 94 * g, 'MAG', `${session.scope.magnification.toFixed(1)}x`);

    const right = Math.min(app.width - pad - 76 * g, cx + radius + 12 * g);
    stat(right, glass.y + 22 * g, 'ROUNDS', `${session.roundsLeft}`, session.roundsLeft <= 2 ? C.red : C.text);
    const remaining = Math.max(0, session.stage.timeLimitS - session.clockS);
    stat(
      right,
      glass.y + 58 * g,
      'CLOCK',
      `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`,
      remaining < 20 ? C.red : C.text,
    );
    const down = session.targets.filter((t) => t.hit).length;
    stat(right, glass.y + 94 * g, 'PLATES', `${down}/${session.targets.length}`);

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
      overheld ? 'BREATHE' : this.holding ? `HOLDING ${this.holdTime.toFixed(1)}s` : 'BREATHING',
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
        session.loadout.rifle.action === 'bolt' ? 'CYCLING' : 'RECOVERING',
        cx,
        glass.y + glass.h - 76 * g,
        T.small * g,
        C.textFaint,
        'center',
      );
    }

    // The spotter's call.
    if (this.call && this.time < this.callUntil) {
      const w = Math.min(glass.w - 40 * g, 340 * g);
      const box: Rect = { x: cx - w / 2, y: glass.y + 12 * g, w, h: 30 * g };
      const hit = this.call.toLowerCase().includes('hit') || this.call.includes('Centre');
      fillPanel(ctx, box, 6, 'rgba(8,11,10,0.85)', hit ? C.green : C.edge);
      text(ctx, this.call, cx, box.y + box.h / 2, T.small * g, hit ? C.green : C.text, 'center');
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
        : `${targetMils(aimed.target).toFixed(1)} mil tall — range unknown`;
      text(
        ctx,
        `${aimed.target.shape.toUpperCase()}  ·  ${label}`,
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
    text(ctx, 'RANGE BY RETICLE', box.x + pad, box.y + 16 * g, T.small * g, C.amber, 'left', 'bold');
    text(
      ctx,
      'drag across the target, top to bottom',
      box.x + pad,
      box.y + 32 * g,
      T.micro * g,
      C.textFaint,
    );

    const cycle: Rect = { x: box.x + box.w - pad - 120 * g, y: box.y + 44 * g, w: 120 * g, h: 26 * g };
    if (app.ui.button(cycle, size ? size.label : 'no targets', { size: T.micro * g })) {
      this.milTargetIndex++;
      audio.click();
    }

    if (reading && reading.mils > 0.05) {
      const imperial = app.profile.settings.imperial;
      text(ctx, `${reading.mils.toFixed(2)} MIL`, box.x + pad, box.y + 58 * g, T.head * g, C.text, 'left', 'bold');
      const r = reading.rangeM;
      text(
        ctx,
        imperial ? `${Math.round(mToYard(r))} yd` : `${Math.round(r)} m`,
        box.x + pad,
        box.y + 80 * g,
        T.body * g,
        C.amber,
      );
      const confirm: Rect = { x: box.x + box.w - pad - 120 * g, y: box.y + 70 * g, w: 120 * g, h: 22 * g };
      if (app.ui.button(confirm, 'RECORD IT', { size: T.micro * g, accent: true })) {
        const aimed = targetUnderAim(this.session, this.aimAz + this.swayAz, this.aimEl + this.swayEl);
        if (aimed) {
          this.session.known[aimed.target.id] = r;
          app.toast(`Recorded ${Math.round(r)} m`, 'good');
          this.overlay = 'none';
        } else {
          app.toast('Put the reticle on the target first', 'bad');
        }
      }
    } else {
      text(ctx, '— — —', box.x + pad, box.y + 62 * g, T.head * g, C.textFaint, 'left');
    }
  }

  private drawToolbar(ctx: CanvasRenderingContext2D, app: App, r: Rect): void {
    const { ui } = app;
    const g = app.gauge;
    const session = this.session;

    ctx.fillStyle = C.bg;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    rule(ctx, r.x, r.y, r.w, C.edge);

    const pad = 8 * g;
    const triggerW = Math.min(120 * g, r.w * 0.26);
    const breathW = Math.min(96 * g, r.w * 0.2);
    const toolsW = r.w - triggerW - breathW - pad * 4;

    const tools: Array<[string, Overlay]> = [
      ['WIND', 'wind'],
      ['CARD', 'dope'],
      ['DIAL', 'turrets'],
      ['SOLVE', 'solution'],
      ['MIL', 'mil'],
    ];
    const toolW = toolsW / tools.length - 4 * g;
    tools.forEach(([label, overlay], i) => {
      const b: Rect = {
        x: r.x + pad + i * (toolW + 4 * g),
        y: r.y + pad,
        w: toolW,
        h: r.h - pad * 2,
      };
      const on = this.overlay === overlay;
      if (ui.button(b, label, { size: T.small * g, accent: on })) {
        audio.tap();
        this.overlay = on ? 'none' : overlay;
        if (this.overlay === 'mil') {
          this.milFrom = null;
          this.milTo = null;
        }
      }
    });

    const breath: Rect = {
      x: r.x + r.w - triggerW - breathW - pad * 2,
      y: r.y + pad,
      w: breathW,
      h: r.h - pad * 2,
    };
    const holdingNow = app.input.isHeldIn(breath.x, breath.y, breath.w, breath.h);
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
      'HOLD',
      breath.x + breath.w / 2,
      breath.y + breath.h / 2,
      T.small * g,
      this.holding ? C.green : C.textDim,
      'center',
      'bold',
    );

    const trigger: Rect = { x: r.x + r.w - triggerW - pad, y: r.y + pad, w: triggerW, h: r.h - pad * 2 };
    const ready = this.cycle <= 0 && session.roundsLeft > 0 && session.phase === 'live';
    if (ui.button(trigger, ready ? 'FIRE' : this.cycle > 0 ? '· · ·' : 'EMPTY', {
      accent: ready,
      danger: !ready,
      disabled: !ready,
      size: T.head * g,
    })) {
      this.shoot(app);
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, app: App, glass: Rect): void {
    const g = app.gauge;
    const { ui } = app;
    const session = this.session;

    const w = Math.min(glass.w - 24 * g, 420 * g);
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
          app.toast('Dialled');
          this.overlay = 'none';
        });
        break;
      }
      default:
        break;
    }
  }
}

export { exposedTargets, targetInclination, msToMph, paragraph };
