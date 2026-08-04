import { t } from '../core/i18n';
import { type Target, isFreeFieldStage, isTutorialStage, nextCourseStage } from '../core/range';
import type { StageScore } from '../core/scoring';
import { gradeColour, nextGradeAbove } from '../core/scoring';
import type { Session } from '../core/session';
import type { ShotResult } from '../core/shot';
import { bankRun } from '../core/store';
import { mToYard, msToFps } from '../core/units';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, bar, fillPanel, rule, text } from '../ui/gfx';
import { C, Scroll, T } from '../ui/ui';
import { BriefScene } from './BriefScene';
import { FreeFieldScene } from './FreeFieldScene';
import { StageSelectScene } from './StageSelectScene';

/**
 * The score card. Shows the grade, a plain breakdown of where the points came
 * from, and — for course stages — whether the next stage unlocked and what
 * the next grade still needs. Per-target VIEW opens a plate with hit marks.
 */
export class ResultScene implements Scene {
  readonly name = 'result';
  private readonly session: Session;
  private readonly score: StageScore;
  private scroll = new Scroll('result');
  private reveal = 0;
  private banked = false;
  /** Target id currently shown in the hit-map overlay, or null. */
  private viewTargetId: string | null = null;

  constructor(session: Session, score: StageScore) {
    this.session = session;
    this.score = score;
  }

  enter(app: App): void {
    audio.stopWind();
    if (this.banked) return;
    this.banked = true;
    const stage = this.session.stage;
    const freeField = this.session.freeField || isFreeFieldStage(stage.id);
    // Course strings pay credits; Free Field is sandbox money-wise.
    const reward = freeField ? 0 : this.score.reward;
    if (!freeField) app.profile.credits += reward;
    const { newAchievements } = bankRun(app.profile, {
      stageId: stage.id,
      fraction: this.score.fraction,
      points: this.score.points,
      grade: this.score.grade,
      timeS: this.score.elapsedS,
      cleared: this.score.cleared,
      frhPercent: this.score.frhPercent,
      meanRadialMil: this.score.meanRadialMil,
      hits: this.score.hits,
      targets: this.score.targets,
      shots: this.score.shots,
      practice: this.session.practice,
      freeField,
      reward,
    });
    app.save();
    // Surface at most two unlock toasts so the result card stays readable.
    for (const id of newAchievements.slice(0, 2)) {
      app.toast(t('career.unlocked_toast', { name: t(`achieve.${id}.name`) }), 'good');
    }
    if (newAchievements.length > 2) {
      app.toast(t('career.unlocked_more', { n: newAchievements.length - 2 }), 'good');
    }
    audio.chime(this.score.fraction >= 0.48);
  }

  update(dt: number): void {
    this.reveal = Math.min(1, this.reveal + dt * 1.6);
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui } = app;
    const g = app.gauge;
    const safe = app.safe;
    const score = this.score;
    const imperial = app.profile.settings.imperial;
    ui.fitText(
      this.session.freeField
        ? t('stage.free-field.name')
        : t(`stage.${this.session.stage.id}.name`),
      safe.x,
      safe.y + 12 * g,
      safe.w * 0.6,
      T.head * g,
      C.text,
      'left',
      'bold',
    );
    text(
      ctx,
      t(`grade.${score.grade}`).toUpperCase(),
      safe.x + safe.w,
      safe.y + 12 * g,
      T.head * g,
      gradeColour(score.grade),
      'right',
      'bold',
    );
    rule(ctx, safe.x, safe.y + 32 * g, safe.w);

    // Headline: points, percentage, and first-round hits.
    let y = safe.y + 50 * g;
    const shown = Math.round(score.points * this.reveal);
    text(ctx, `${shown}`, safe.x, y + 10 * g, T.huge * g, C.text, 'left', 'bold');
    text(ctx, `/ ${score.maxPoints}`, safe.x + 96 * g, y + 18 * g, T.body * g, C.textFaint);
    text(
      ctx,
      `${Math.round(score.fraction * 100 * this.reveal)}%`,
      safe.x + 96 * g,
      y + 36 * g,
      T.small * g,
      gradeColour(score.grade),
    );

    text(ctx, t('result.frh'), safe.x + safe.w, y - 4 * g, T.micro * g, C.textFaint, 'right');
    text(
      ctx,
      `${score.frhPercent.toFixed(0)}%`,
      safe.x + safe.w,
      y + 16 * g,
      T.title * g,
      score.frhPercent >= 60 ? C.green : C.amber,
      'right',
      'bold',
    );
    y += 48 * g;

    const meter: Rect = { x: safe.x, y, w: safe.w, h: 8 * g };
    bar(ctx, meter, score.fraction * this.reveal, gradeColour(score.grade));
    y += 18 * g;

    // --- unlock + grade ladder ----------------------------------------
    y = this.drawProgressFeedback(ctx, app, safe.x, y, safe.w) + 8 * g;

    // --- score breakdown ----------------------------------------------
    y = this.drawScoreExplain(ctx, app, safe.x, y, safe.w) + 8 * g;

    const summary: Array<[string, string]> = [
      [t('result.plates'), `${score.hits} / ${score.targets}`],
      [t('result.rounds'), `${score.shots}`],
      [t('result.time'), `${score.elapsedS.toFixed(1)} s`],
      [t('result.mean_miss'), `${score.meanRadialMil.toFixed(2)} MIL`],
      [
        t('result.payout'),
        this.session.freeField
          ? t('result.payout_free')
          : `${score.reward.toLocaleString()} cr`,
      ],
    ];
    const colW = safe.w / summary.length;
    summary.forEach(([label, value], i) => {
      text(ctx, label, safe.x + i * colW, y, T.micro * g, C.textFaint);
      ui.fitText(
        value,
        safe.x + i * colW,
        y + 16 * g,
        colW - 8 * g,
        T.body * g,
        i === 4 ? C.amber : C.text,
      );
    });
    y += 34 * g;

    // Chronograph string stats when the kit recorded every exit velocity.
    if (this.session.loadout.hasGear('chrono') && this.session.shots.length > 0) {
      const fps = this.session.shots.map((s) => msToFps(s.shot.muzzleVelocity));
      const mean = fps.reduce((a, b) => a + b, 0) / fps.length;
      const es = Math.max(...fps) - Math.min(...fps);
      const variance =
        fps.length > 1
          ? fps.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (fps.length - 1)
          : 0;
      const sd = Math.sqrt(variance);
      const chronoPanel: Rect = { x: safe.x, y, w: safe.w, h: 28 * g };
      fillPanel(ctx, chronoPanel, 6, 'rgba(127,201,138,0.08)', C.edgeSoft);
      text(
        ctx,
        t('result.chrono_line', {
          n: fps.length,
          mean: mean.toFixed(0),
          es: es.toFixed(0),
          sd: sd.toFixed(1),
        }),
        safe.x + 12 * g,
        y + 15 * g,
        T.small * g,
        C.green,
      );
      y += 34 * g;
    }

    rule(ctx, safe.x, y, safe.w);
    y += 8 * g;

    const footerH = 48 * g;
    const view: Rect = {
      x: safe.x,
      y,
      w: safe.w,
      h: safe.h - (y - safe.y) - footerH - 10 * g,
    };
    const rowH = 46 * g;
    this.scroll.update(ui.input, view, score.perTarget.length * rowH + 6 * g, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    score.perTarget.forEach((tgt, i) => {
      const runtime = this.session.targets.find((r) => r.target.id === tgt.targetId);
      const ry = view.y + 4 * g + i * rowH - this.scroll.offset;
      if (ry > view.y + view.h || ry + rowH < view.y) return;
      const r: Rect = { x: view.x, y: ry, w: view.w, h: rowH - 6 * g };
      fillPanel(ctx, r, 6, tgt.hit ? 'rgba(127,201,138,0.07)' : 'rgba(224,112,95,0.06)', C.edgeSoft);

      const range = runtime ? runtime.target.rangeM : 0;
      const label = imperial ? `${Math.round(mToYard(range))} yd` : `${Math.round(range)} m`;
      text(ctx, label, r.x + 12 * g, r.y + 15 * g, T.body * g, C.text, 'left', 'bold');
      text(
        ctx,
        runtime ? t(`shape.${runtime.target.shape}`) : '',
        r.x + 12 * g,
        r.y + 31 * g,
        T.micro * g,
        C.textFaint,
      );

      const detail = tgt.hit
        ? `${tgt.firstRound ? t('result.first_round') : t('result.n_rounds', { n: tgt.rounds })} · ${tgt.timeToHitS.toFixed(1)} s · ${t(
            'result.centred',
            { pct: Math.round(tgt.quality * 100) },
          )}`
        : tgt.rounds > 0
          ? t('result.no_hit', { n: tgt.rounds })
          : t('result.never');
      text(ctx, detail, r.x + 90 * g, r.y + 23 * g, T.small * g, tgt.hit ? C.textDim : C.red);

      // VIEW sits left of the points when the plate was engaged.
      const canView = tgt.rounds > 0 || tgt.hit;
      const viewW = 72 * g;
      const ptsX = r.x + r.w - 12 * g;
      if (canView) {
        const viewBtn: Rect = {
          x: ptsX - viewW - 44 * g,
          y: r.y + 8 * g,
          w: viewW,
          h: r.h - 16 * g,
        };
        if (ui.button(viewBtn, t('result.view_target'), { size: T.micro * g, accent: tgt.hit })) {
          audio.tap();
          this.viewTargetId = tgt.targetId;
        }
      }

      text(
        ctx,
        `${tgt.points}`,
        ptsX,
        r.y + 23 * g,
        T.body * g,
        tgt.hit ? C.text : C.textFaint,
        'right',
        'bold',
      );
    });
    ctx.restore();

    const half = safe.w / 2 - 5 * g;
    const again: Rect = { x: safe.x, y: safe.y + safe.h - footerH, w: half, h: footerH - 4 * g };
    const next: Rect = { x: safe.x + half + 10 * g, y: again.y, w: half, h: again.h };
    if (!this.viewTargetId) {
      if (this.session.freeField) {
        if (ui.button(again, t('result.again'), { size: T.body * g })) {
          audio.tap();
          app.set(new BriefScene(this.session.stage));
        }
        if (ui.button(next, t('result.free_field_setup'), { accent: true, size: T.body * g })) {
          audio.tap();
          app.set(new FreeFieldScene());
        }
      } else {
        if (ui.button(again, t('result.again'), { size: T.body * g })) {
          audio.tap();
          app.set(new BriefScene(this.session.stage));
        }
        if (ui.button(next, t('result.course'), { accent: true, size: T.body * g })) {
          audio.tap();
          app.set(new StageSelectScene());
        }
      }
    }

    if (this.viewTargetId) {
      this.drawTargetView(ctx, app, this.viewTargetId);
    }
  }

  /**
   * Full-screen overlay: plate silhouette to scale, every successful impact
   * marked where it landed relative to the target centre.
   */
  private drawTargetView(ctx: CanvasRenderingContext2D, app: App, targetId: string): void {
    const { ui } = app;
    const g = app.gauge;
    const safe = app.safe;
    const runtime = this.session.targets.find((r) => r.target.id === targetId);
    if (!runtime) {
      this.viewTargetId = null;
      return;
    }
    const target = runtime.target;
    const imperial = app.profile.settings.imperial;

    // Dim the score card underneath.
    ctx.fillStyle = 'rgba(8,11,10,0.82)';
    ctx.fillRect(0, 0, app.width, app.height);

    const panelW = Math.min(safe.w, 420 * g);
    const panelH = Math.min(safe.h - 20 * g, 480 * g);
    const panel: Rect = {
      x: app.width / 2 - panelW / 2,
      y: app.height / 2 - panelH / 2,
      w: panelW,
      h: panelH,
    };
    fillPanel(ctx, panel, 10, C.panel, C.edge);

    const rangeLabel = imperial
      ? `${Math.round(mToYard(target.rangeM))} yd`
      : `${Math.round(target.rangeM)} m`;
    text(
      ctx,
      t('result.view_title', {
        shape: t(`shape.${target.shape}`),
        range: rangeLabel,
      }),
      panel.x + 14 * g,
      panel.y + 18 * g,
      T.body * g,
      C.text,
      'left',
      'bold',
    );
    text(
      ctx,
      t('result.view_hint'),
      panel.x + 14 * g,
      panel.y + 34 * g,
      T.micro * g,
      C.textFaint,
    );

    const close: Rect = {
      x: panel.x + panel.w - 88 * g,
      y: panel.y + 10 * g,
      w: 74 * g,
      h: 28 * g,
    };
    if (ui.button(close, t('result.view_close'), { size: T.small * g })) {
      audio.tap();
      this.viewTargetId = null;
      return;
    }

    // Canvas for the plate — leave room for the legend under it.
    const canvas: Rect = {
      x: panel.x + 16 * g,
      y: panel.y + 48 * g,
      w: panel.w - 32 * g,
      h: panel.h - 110 * g,
    };
    fillPanel(ctx, canvas, 6, C.bgDeep, C.edgeSoft);

    const hits = this.session.shots
      .filter((s) => s.targetId === targetId && s.shot.quality !== null)
      .map((s) => s.shot);

    this.paintTargetWithHits(ctx, target, canvas, hits, g);

    const legendY = panel.y + panel.h - 48 * g;
    text(ctx, t('result.view_hits', { n: hits.length }), panel.x + 14 * g, legendY, T.small * g, C.green);
    text(
      ctx,
      t('result.view_legend'),
      panel.x + 14 * g,
      legendY + 16 * g,
      T.micro * g,
      C.textFaint,
    );

    // Tap outside the panel closes.
    for (const rel of app.input.releases) {
      if (rel.consumed || rel.button !== 0 || rel.travel > 12) continue;
      const inPanel =
        rel.x >= panel.x &&
        rel.x <= panel.x + panel.w &&
        rel.y >= panel.y &&
        rel.y <= panel.y + panel.h;
      if (!inPanel) {
        rel.consumed = true;
        this.viewTargetId = null;
        audio.tap();
        break;
      }
    }
  }

  private paintTargetWithHits(
    ctx: CanvasRenderingContext2D,
    target: Target,
    canvas: Rect,
    hits: ShotResult[],
    g: number,
  ): void {
    const pad = 18 * g;
    const availW = canvas.w - pad * 2;
    const availH = canvas.h - pad * 2;
    const scale = Math.min(availW / target.widthM, availH / target.tallM);
    const cx = canvas.x + canvas.w / 2;
    const cy = canvas.y + canvas.h / 2;
    const hw = (target.widthM / 2) * scale;
    const hh = (target.tallM / 2) * scale;

    // Soft grid for reading offsets.
    ctx.save();
    ctx.strokeStyle = 'rgba(91,111,90,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3 * g, 4 * g]);
    ctx.beginPath();
    ctx.moveTo(cx - hw - 8 * g, cy);
    ctx.lineTo(cx + hw + 8 * g, cy);
    ctx.moveTo(cx, cy - hh - 8 * g);
    ctx.lineTo(cx, cy + hh + 8 * g);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plate fill.
    ctx.fillStyle = 'rgba(154,163,156,0.22)';
    ctx.strokeStyle = C.steel;
    ctx.lineWidth = 2 * g;
    this.traceTargetShape(ctx, target, cx, cy, hw, hh);
    ctx.fill();
    ctx.stroke();

    // Inner rings for gongs (helps read “centre”).
    if (target.shape === 'gong' || target.shape === 'head') {
      ctx.strokeStyle = 'rgba(154,163,156,0.35)';
      ctx.lineWidth = 1;
      for (const f of [0.33, 0.66]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, hw * f, hh * f, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Centre mark.
    ctx.strokeStyle = C.amberDim;
    ctx.lineWidth = 1;
    const tick = 6 * g;
    ctx.beginPath();
    ctx.moveTo(cx - tick, cy);
    ctx.lineTo(cx + tick, cy);
    ctx.moveTo(cx, cy - tick);
    ctx.lineTo(cx, cy + tick);
    ctx.stroke();

    hits.forEach((shot, i) => {
      const x = cx + shot.missRight * scale;
      const y = cy - shot.missUp * scale;
      const q = shot.quality ?? 0;
      const colour = q > 0.75 ? C.green : q > 0.4 ? C.amber : C.blue;
      const r = Math.max(4 * g, 5.5 * g);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.strokeStyle = C.bgDeep;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(ctx, `${i + 1}`, x, y + 0.5 * g, T.micro * g, C.bgDeep, 'center', 'bold');
    });

    if (hits.length === 0) {
      text(
        ctx,
        t('result.view_no_hits'),
        cx,
        cy,
        T.small * g,
        C.textFaint,
        'center',
      );
    }

    // Axis labels (shooter’s view: right / up).
    text(ctx, t('result.view_right'), canvas.x + canvas.w - 8 * g, cy - 6 * g, T.micro * g, C.textFaint, 'right');
    text(ctx, t('result.view_up'), cx + 6 * g, canvas.y + 12 * g, T.micro * g, C.textFaint, 'left');
    ctx.restore();
  }

  private traceTargetShape(
    ctx: CanvasRenderingContext2D,
    target: Target,
    cx: number,
    cy: number,
    hw: number,
    hh: number,
  ): void {
    ctx.beginPath();
    switch (target.shape) {
      case 'gong':
      case 'head':
        ctx.ellipse(cx, cy, hw, hh, 0, 0, Math.PI * 2);
        break;
      case 'diamond':
        ctx.moveTo(cx, cy - hh);
        ctx.lineTo(cx + hw, cy);
        ctx.lineTo(cx, cy + hh);
        ctx.lineTo(cx - hw, cy);
        ctx.closePath();
        break;
      case 'silhouette': {
        // Geometric centre is cy; torso below shoulder line, head above.
        const shoulder = hh * 0.42;
        const torsoTop = cy - shoulder;
        const torsoBot = cy + hh;
        const headTop = cy - hh;
        const headW = hw * 0.42;
        // Torso
        ctx.rect(cx - hw, torsoTop, hw * 2, torsoBot - torsoTop);
        // Head (same path for fill — add as second rect via move)
        ctx.rect(cx - headW, headTop, headW * 2, torsoTop - headTop);
        break;
      }
    }
  }

  /**
   * Unlock status for the next course stage, and how far to the next grade.
   * Tutorial has no unlock ladder — only the grade tip.
   */
  private drawProgressFeedback(
    ctx: CanvasRenderingContext2D,
    app: App,
    x: number,
    y: number,
    w: number,
  ): number {
    const g = app.gauge;
    const score = this.score;
    const stage = this.session.stage;
    const next = nextCourseStage(stage.id);
    const nextGrade = nextGradeAbove(score.fraction);
    const panelH = 54 * g;
    const r: Rect = { x, y, w, h: panelH };
    fillPanel(ctx, r, 6, 'rgba(21,29,25,0.75)', C.edgeSoft);

    let line = y + 14 * g;

    if (this.session.freeField || isFreeFieldStage(stage.id)) {
      text(ctx, t('result.free_field_done'), x + 12 * g, line, T.small * g, C.amber, 'left', 'bold');
      line += 15 * g;
      text(ctx, t('result.free_field_done_detail'), x + 12 * g, line, T.micro * g, C.textDim);
    } else if (isTutorialStage(stage.id) && next) {
      text(ctx, t('result.tutorial_done'), x + 12 * g, line, T.small * g, C.amber, 'left', 'bold');
      line += 15 * g;
      text(
        ctx,
        t('result.tutorial_next', { name: t(`stage.${next.id}.name`) }),
        x + 12 * g,
        line,
        T.micro * g,
        C.textDim,
      );
    } else if (next) {
      const needPct = Math.round(next.unlockScore * 100);
      const havePct = Math.round(score.fraction * 100);
      const needPts = Math.ceil(next.unlockScore * score.maxPoints);
      const unlocked = score.fraction >= next.unlockScore;
      const nextName = t(`stage.${next.id}.name`);
      if (unlocked) {
        text(
          ctx,
          t('result.unlock_yes', { name: nextName }),
          x + 12 * g,
          line,
          T.small * g,
          C.green,
          'left',
          'bold',
        );
        line += 15 * g;
        text(
          ctx,
          t('result.unlock_yes_detail', { pct: needPct }),
          x + 12 * g,
          line,
          T.micro * g,
          C.textDim,
        );
      } else {
        const short = Math.max(0, needPts - score.points);
        text(
          ctx,
          t('result.unlock_no', { name: nextName }),
          x + 12 * g,
          line,
          T.small * g,
          C.amber,
          'left',
          'bold',
        );
        line += 15 * g;
        text(
          ctx,
          t('result.unlock_no_detail', {
            need: needPct,
            have: havePct,
            pts: short,
          }),
          x + 12 * g,
          line,
          T.micro * g,
          C.textDim,
        );
      }
    } else {
      text(ctx, t('result.unlock_final'), x + 12 * g, line, T.small * g, C.amber, 'left', 'bold');
      line += 15 * g;
      text(ctx, t('result.unlock_final_detail'), x + 12 * g, line, T.micro * g, C.textDim);
    }

    line = y + panelH - 12 * g;
    if (nextGrade) {
      const needPts = Math.ceil(nextGrade.threshold * score.maxPoints) - score.points;
      text(
        ctx,
        t('result.next_grade', {
          grade: t(`grade.${nextGrade.grade}`),
          pct: Math.round(nextGrade.threshold * 100),
          pts: Math.max(0, needPts),
        }),
        x + 12 * g,
        line,
        T.micro * g,
        C.textFaint,
      );
    } else {
      text(ctx, t('result.top_grade'), x + 12 * g, line, T.micro * g, C.amber);
    }

    return y + panelH;
  }

  /** Where the points came from — hits first, then bonuses. */
  private drawScoreExplain(
    ctx: CanvasRenderingContext2D,
    app: App,
    x: number,
    y: number,
    w: number,
  ): number {
    const g = app.gauge;
    const score = this.score;
    const r: Rect = { x, y, w, h: 50 * g };
    fillPanel(ctx, r, 6, 'rgba(21,29,25,0.55)', C.edgeSoft);

    text(ctx, t('result.score_how'), x + 12 * g, y + 12 * g, T.micro * g, C.textFaint);

    const parts: Array<[string, number, string]> = [
      [t('result.part_hit'), score.accuracyPoints, C.text],
      [t('result.part_first'), score.firstRoundPoints, C.green],
      [t('result.part_speed'), score.speedPoints, C.amber],
    ];
    const col = (w - 24 * g) / parts.length;
    parts.forEach(([label, pts, colour], i) => {
      const cx = x + 12 * g + i * col;
      text(ctx, label, cx, y + 26 * g, T.micro * g, C.textFaint);
      text(ctx, `${pts}`, cx, y + 40 * g, T.small * g, colour, 'left', 'bold');
    });

    // Tiny legend on the right when wide enough.
    if (w > 360 * g) {
      text(
        ctx,
        t('result.score_legend'),
        x + w - 12 * g,
        y + 12 * g,
        T.micro * g,
        C.textFaint,
        'right',
      );
    }

    return y + 50 * g;
  }
}
