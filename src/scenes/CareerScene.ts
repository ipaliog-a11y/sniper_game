import {
  type AchievementDef,
  type HistoryEntry,
  ACHIEVEMENTS,
  careerSummary,
  ensureCareer,
  isAchievementUnlocked,
  sortedAchievements,
  tierColour,
  unlockAchievements,
} from '../core/career';
import { t } from '../core/i18n';
import { STAGES } from '../core/range';
import { gradeColour } from '../core/scoring';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, fillPanel, rule, text } from '../ui/gfx';
import { C, Scroll, T } from '../ui/ui';
import { MenuScene } from './MenuScene';

type Tab = 'overview' | 'stages' | 'history' | 'achievements';

const TABS: Tab[] = ['overview', 'stages', 'history', 'achievements'];

/**
 * Lifetime numbers, per-stage bests, recent run log, and achievement ribbons.
 * Pure read UI except for a silent achievement refresh on enter (kit unlocks).
 */
export class CareerScene implements Scene {
  readonly name = 'career';
  private tab: Tab = 'overview';
  private scroll = new Scroll('career');

  enter(app: App): void {
    ensureCareer(app.profile);
    const fresh = unlockAchievements(app.profile);
    if (fresh.length) {
      app.save();
      for (const id of fresh.slice(0, 2)) {
        app.toast(t('career.unlocked_toast', { name: t(`achieve.${id}.name`) }), 'good');
      }
    }
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui } = app;
    const g = app.gauge;
    const safe = app.safe;

    text(ctx, t('career.title'), safe.x, safe.y + 12 * g, T.head * g, C.text, 'left', 'bold');
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, t('common.back'), { size: T.small * g })) {
      audio.tap();
      app.set(new MenuScene());
      return;
    }
    rule(ctx, safe.x, safe.y + 34 * g, safe.w);

    // Tab strip.
    const tabY = safe.y + 42 * g;
    const tabH = 28 * g;
    const tabW = (safe.w - 6 * g * (TABS.length - 1)) / TABS.length;
    TABS.forEach((tab, i) => {
      const r: Rect = { x: safe.x + i * (tabW + 6 * g), y: tabY, w: tabW, h: tabH };
      const active = this.tab === tab;
      fillPanel(ctx, r, 5, active ? 'rgba(232,163,61,0.14)' : C.panel, active ? C.amber : C.edgeSoft);
      if (ui.button(r, '', { size: T.micro * g })) {
        if (this.tab !== tab) {
          audio.tap();
          this.tab = tab;
          this.scroll.offset = 0;
        }
      }
      text(
        ctx,
        t(`career.tab.${tab}`),
        r.x + r.w / 2,
        r.y + r.h / 2,
        T.micro * g,
        active ? C.amber : C.textDim,
        'center',
        active ? 'bold' : 'normal',
      );
    });

    const view: Rect = {
      x: safe.x,
      y: tabY + tabH + 10 * g,
      w: safe.w,
      h: safe.h - (tabY + tabH + 10 * g - safe.y),
    };

    if (this.tab === 'overview') this.drawOverview(ctx, app, view);
    else if (this.tab === 'stages') this.drawStages(ctx, app, view);
    else if (this.tab === 'history') this.drawHistory(ctx, app, view);
    else this.drawAchievements(ctx, app, view);
  }

  private drawOverview(ctx: CanvasRenderingContext2D, app: App, view: Rect): void {
    const g = app.gauge;
    const sum = careerSummary(app.profile);
    const rows: Array<[string, string, string?]> = [
      [t('career.stat.runs'), `${sum.runs}`, t('career.stat.runs_sub', { course: sum.courseRuns, free: sum.freeFieldRuns })],
      [t('career.stat.stages'), `${sum.stagesCleared} / ${sum.stagesTotal}`, undefined],
      [t('career.stat.shots'), `${sum.shots}`, undefined],
      [t('career.stat.frh'), sum.runs ? `${sum.frhPercent.toFixed(0)}%` : '—', t('career.stat.frh_sub')],
      [
        t('career.stat.mean_miss'),
        sum.shots ? `${sum.meanRadialMil.toFixed(2)} MIL` : '—',
        t('career.stat.mean_miss_sub'),
      ],
      [t('career.stat.best_grade'), t(`grade.${sum.bestGrade}`), undefined],
      [t('career.stat.points'), sum.pointsEarned.toLocaleString(), undefined],
      [t('career.stat.credits'), `${sum.creditsEarned.toLocaleString()} cr`, undefined],
      [t('career.stat.perfect_frh'), `${sum.perfectFrhClears}`, undefined],
      [t('career.stat.distinguished'), `${sum.distinguishedRuns}`, undefined],
      [
        t('career.stat.achievements'),
        `${sum.achievementsUnlocked} / ${sum.achievementsTotal}`,
        undefined,
      ],
    ];

    const cardH = 52 * g;
    const gap = 8 * g;
    const contentH = rows.length * (cardH + gap) + 8 * g;
    this.scroll.update(app.ui.input, view, contentH, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    let y = view.y + 2 * g - this.scroll.offset;
    for (const [label, value, sub] of rows) {
      const r: Rect = { x: view.x, y, w: view.w, h: cardH };
      fillPanel(ctx, r, 6, C.panel, C.edgeSoft);
      text(ctx, label, r.x + 12 * g, r.y + 16 * g, T.micro * g, C.textFaint);
      text(ctx, value, r.x + 12 * g, r.y + 34 * g, T.body * g, C.text, 'left', 'bold');
      if (sub) {
        app.ui.fitText(sub, r.x + r.w * 0.42, r.y + 34 * g, r.w * 0.55 - 12 * g, T.micro * g, C.textDim);
      }
      y += cardH + gap;
    }
    ctx.restore();
  }

  private drawStages(ctx: CanvasRenderingContext2D, app: App, view: Rect): void {
    const g = app.gauge;
    const stages = STAGES.filter((s) => s.id !== 'free-field');
    const rowH = 58 * g;
    const contentH = stages.length * rowH + 8 * g;
    this.scroll.update(app.ui.input, view, contentH, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    stages.forEach((stage, i) => {
      const y = view.y + 2 * g + i * rowH - this.scroll.offset;
      if (y > view.y + view.h || y + rowH < view.y) return;
      const r: Rect = { x: view.x, y, w: view.w, h: rowH - 8 * g };
      const rec = app.profile.records[stage.id];
      fillPanel(ctx, r, 6, C.panel, C.edgeSoft);
      const name = t(`stage.${stage.id}.name`);
      app.ui.fitText(name, r.x + 12 * g, r.y + 14 * g, r.w * 0.62, T.small * g, C.text);
      if (!rec || rec.attempts === 0) {
        text(ctx, t('career.stage.never'), r.x + 12 * g, r.y + 34 * g, T.micro * g, C.textFaint);
        text(ctx, '—', r.x + r.w - 12 * g, r.y + 24 * g, T.body * g, C.textFaint, 'right');
        return;
      }
      const grade = t(`grade.${rec.bestGrade}`);
      text(
        ctx,
        t('career.stage.line', {
          pct: Math.round(rec.bestFraction * 100),
          attempts: rec.attempts,
          frh:
            rec.bestFrhPercent != null ? `${Math.round(rec.bestFrhPercent)}%` : '—',
        }),
        r.x + 12 * g,
        r.y + 34 * g,
        T.micro * g,
        C.textDim,
      );
      text(
        ctx,
        grade,
        r.x + r.w - 12 * g,
        r.y + 16 * g,
        T.small * g,
        gradeColour(rec.bestGrade),
        'right',
        'bold',
      );
      text(
        ctx,
        rec.cleared ? t('career.stage.cleared') : t('career.stage.open'),
        r.x + r.w - 12 * g,
        r.y + 34 * g,
        T.micro * g,
        rec.cleared ? C.green : C.textFaint,
        'right',
      );
    });
    ctx.restore();
  }

  private drawHistory(ctx: CanvasRenderingContext2D, app: App, view: Rect): void {
    const g = app.gauge;
    const history = ensureCareer(app.profile).history;
    if (history.length === 0) {
      text(ctx, t('career.history.empty'), view.x + view.w / 2, view.y + 40 * g, T.body * g, C.textDim, 'center');
      return;
    }
    const rowH = 64 * g;
    this.scroll.update(app.ui.input, view, history.length * rowH + 8 * g, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    history.forEach((entry, i) => {
      const y = view.y + 2 * g + i * rowH - this.scroll.offset;
      if (y > view.y + view.h || y + rowH < view.y) return;
      this.drawHistoryRow(ctx, app, entry, { x: view.x, y, w: view.w, h: rowH - 8 * g });
    });
    ctx.restore();
  }

  private drawHistoryRow(ctx: CanvasRenderingContext2D, app: App, entry: HistoryEntry, r: Rect): void {
    const g = app.gauge;
    fillPanel(ctx, r, 6, C.panel, C.edgeSoft);
    const stageName =
      entry.freeField || entry.stageId === 'free-field'
        ? t('stage.free-field.name')
        : t(`stage.${entry.stageId}.name`);
    app.ui.fitText(stageName, r.x + 12 * g, r.y + 14 * g, r.w * 0.55, T.small * g, C.text);
    const when = formatWhen(entry.at);
    text(ctx, when, r.x + r.w - 12 * g, r.y + 14 * g, T.micro * g, C.textFaint, 'right');
    text(
      ctx,
      t(`grade.${entry.grade}`),
      r.x + 12 * g,
      r.y + 32 * g,
      T.micro * g,
      gradeColour(entry.grade),
      'left',
      'bold',
    );
    text(
      ctx,
      t('career.history.line', {
        pct: Math.round(entry.fraction * 100),
        hits: entry.hits,
        targets: entry.targets,
        frh: Math.round(entry.frhPercent),
        time: entry.timeS.toFixed(0),
      }),
      r.x + 12 * g,
      r.y + 48 * g,
      T.micro * g,
      C.textDim,
    );
    const tags: string[] = [];
    if (entry.practice) tags.push(t('career.tag.practice'));
    if (entry.freeField) tags.push(t('career.tag.free_field'));
    if (entry.cleared) tags.push(t('career.tag.cleared'));
    if (tags.length) {
      text(ctx, tags.join(' · '), r.x + r.w - 12 * g, r.y + 32 * g, T.micro * g, C.textFaint, 'right');
    }
  }

  private drawAchievements(ctx: CanvasRenderingContext2D, app: App, view: Rect): void {
    const g = app.gauge;
    const list = sortedAchievements(app.profile);
    const rowH = 62 * g;
    const contentH = 28 * g + list.length * rowH;
    this.scroll.update(app.ui.input, view, contentH, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    let y = view.y + 2 * g - this.scroll.offset;
    const unlocked = ensureCareer(app.profile).unlocked.length;
    text(
      ctx,
      t('career.achievements.header', { n: unlocked, total: ACHIEVEMENTS.length }),
      view.x,
      y + 10 * g,
      T.micro * g,
      C.textFaint,
    );
    y += 24 * g;

    for (const def of list) {
      if (y > view.y + view.h || y + rowH < view.y) {
        y += rowH;
        continue;
      }
      this.drawAchievementRow(ctx, app, def, { x: view.x, y, w: view.w, h: rowH - 8 * g });
      y += rowH;
    }
    ctx.restore();
  }

  private drawAchievementRow(
    ctx: CanvasRenderingContext2D,
    app: App,
    def: AchievementDef,
    r: Rect,
  ): void {
    const g = app.gauge;
    const unlocked = isAchievementUnlocked(app.profile, def.id);
    const edge = unlocked ? tierColour(def.tier) : C.edgeSoft;
    fillPanel(ctx, r, 6, unlocked ? 'rgba(232,163,61,0.08)' : C.panel, edge);
    const badge: Rect = { x: r.x + 10 * g, y: r.y + 12 * g, w: 28 * g, h: 28 * g };
    fillPanel(ctx, badge, 4, unlocked ? 'rgba(8,11,10,0.6)' : 'rgba(8,11,10,0.35)', edge);
    text(
      ctx,
      unlocked ? '★' : '·',
      badge.x + badge.w / 2,
      badge.y + badge.h / 2,
      T.body * g,
      unlocked ? tierColour(def.tier) : C.textFaint,
      'center',
      'bold',
    );
    const nameX = r.x + 48 * g;
    text(
      ctx,
      unlocked ? t(`achieve.${def.id}.name`) : t('career.achievement.locked'),
      nameX,
      r.y + 16 * g,
      T.small * g,
      unlocked ? C.text : C.textFaint,
      'left',
      'bold',
    );
    const desc = unlocked ? t(`achieve.${def.id}.desc`) : t('career.achievement.locked_hint');
    app.ui.fitText(desc, nameX, r.y + 34 * g, r.w - 60 * g, T.micro * g, C.textDim);
    text(
      ctx,
      t(`career.tier.${def.tier}`),
      r.x + r.w - 12 * g,
      r.y + 16 * g,
      T.micro * g,
      unlocked ? tierColour(def.tier) : C.textFaint,
      'right',
    );
  }
}

function formatWhen(at: number): string {
  try {
    const d = new Date(at);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return '';
  }
}
