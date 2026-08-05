import { catalogName } from '../core/catalogLabels';
import { t } from '../core/i18n';
import { resolveLoadout } from '../core/loadout';
import { STAGES } from '../core/range';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import {
  type Rect,
  bar,
  cornerBrackets,
  fillPanel,
  fillRaised,
  paragraph,
  rule,
  text,
} from '../ui/gfx';
import { C, T } from '../ui/theme';
import { ArmouryScene } from './ArmouryScene';
import { CareerScene } from './CareerScene';
import { FreeFieldScene } from './FreeFieldScene';
import { GlossaryScene } from './GlossaryScene';
import { SettingsScene } from './SettingsScene';
import { StageSelectScene } from './StageSelectScene';

/** The title card. Kept short — nobody came here to read a menu. */
export class MenuScene implements Scene {
  readonly name = 'menu';
  private t0 = 0;

  update(dt: number): void {
    this.t0 += dt;
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui, profile } = app;
    const g = app.gauge;
    const safe = app.safe;
    const loadout = resolveLoadout(profile.loadout);

    // Slow drifting reticle — the only motion this screen needs.
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = C.steel;
    ctx.lineWidth = 1;
    const cx = app.width / 2 + Math.sin(this.t0 * 0.31) * 14 * g;
    const cy = app.height * 0.4 + Math.cos(this.t0 * 0.23) * 10 * g;
    const rad = Math.min(app.width, app.height) * 0.32;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.moveTo(cx - rad, cy);
    ctx.lineTo(cx + rad, cy);
    ctx.moveTo(cx, cy - rad);
    ctx.lineTo(cx, cy + rad);
    ctx.stroke();
    for (let i = 1; i <= 5; i++) {
      const d = (rad / 6) * i;
      ctx.beginPath();
      ctx.moveTo(cx - 5 * g, cy + d);
      ctx.lineTo(cx + 5 * g, cy + d);
      ctx.stroke();
    }
    // Outer ranging ring, slightly more transparent.
    ctx.globalAlpha = 0.04;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 1.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const titleY = safe.y + app.height * 0.16;
    // Wordmark
    text(ctx, t('menu.title'), app.width / 2, titleY, T.huge * g * 1.12, C.text, 'center', 'bold');
    // Amber accent underline under the title
    const titleW = Math.min(safe.w * 0.42, 160 * g);
    ctx.fillStyle = C.amber;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(app.width / 2 - titleW / 2, titleY + 18 * g, titleW, 1.5 * g);
    ctx.globalAlpha = 0.25;
    ctx.fillRect(app.width / 2 - titleW / 2, titleY + 21 * g, titleW, 1 * g);
    ctx.globalAlpha = 1;

    text(
      ctx,
      t('menu.subtitle'),
      app.width / 2,
      titleY + 36 * g,
      T.small * g,
      C.amber,
      'center',
    );

    // Progress counts graded stages only — tutorial is practice, not a clear.
    const graded = STAGES.filter((s) => s.id !== 'tutorial');
    const cleared = graded.filter((s) => profile.records[s.id]?.cleared).length;
    const progressY = titleY + 58 * g;
    text(
      ctx,
      t('menu.stages_cleared', {
        cleared,
        total: graded.length,
        credits: profile.credits.toLocaleString(),
      }),
      app.width / 2,
      progressY,
      T.small * g,
      C.textFaint,
      'center',
    );
    // Thin course progress meter
    const barW = Math.min(safe.w * 0.55, 220 * g);
    bar(
      ctx,
      { x: app.width / 2 - barW / 2, y: progressY + 14 * g, w: barW, h: 4 * g },
      graded.length ? cleared / graded.length : 0,
      C.amberDim,
      C.edgeSoft,
    );

    const w = Math.min(safe.w, 340 * g);
    const x = app.width / 2 - w / 2;
    // Slightly tighter rows so CAREER fits above the footer on short phones.
    let y = app.height * 0.48;
    const h = 42 * g;
    const gap = 8 * g;

    const item = (label: string, sub: string, accent = false): boolean => {
      const r: Rect = { x, y, w, h };
      const held = ui.input.isDownIn(r.x, r.y, r.w, r.h);
      if (accent) {
        fillRaised(ctx, r, 8, {
          fillTop: held ? C.amber : 'rgba(232,163,61,0.18)',
          fillBottom: held ? C.amber : 'rgba(232,163,61,0.06)',
          stroke: C.amber,
          accentLeft: held ? C.bgDeep : C.amber,
          held,
        });
      } else {
        fillRaised(ctx, r, 8, {
          held,
          stroke: held ? C.edgeBright : C.edge,
          accentLeft: held ? C.amberDim : C.edgeBright,
        });
      }
      const labelCol = accent ? (held ? C.bgDeep : C.amber) : C.text;
      const subCol = accent ? (held ? 'rgba(8,11,10,0.7)' : C.amberDim) : C.textFaint;
      text(ctx, label, x + 16 * g, y + h / 2 - 7 * g, T.body * g, labelCol, 'left', 'bold');
      text(ctx, sub, x + 16 * g, y + h / 2 + 9 * g, T.micro * g, subCol, 'left');
      // Chevron affordance
      text(
        ctx,
        '›',
        x + w - 14 * g,
        y + h / 2,
        T.head * g,
        accent ? (held ? C.bgDeep : C.amber) : C.textFaint,
        'right',
      );
      y += h + gap;
      return ui.input.takeTap(r.x, r.y, r.w, r.h);
    };

    if (item(t('menu.course'), t('menu.course_sub', { count: STAGES.length }), true)) {
      audio.unlock();
      audio.tap();
      app.set(new StageSelectScene());
    }
    if (item(t('menu.free_field'), t('menu.free_field_sub'))) {
      audio.unlock();
      audio.tap();
      app.set(new FreeFieldScene());
    }
    if (
      item(
        t('menu.armoury'),
        `${catalogName(loadout.rifle.id, loadout.rifle.name)} · ${catalogName(loadout.cartridge.id, loadout.cartridge.name)}`,
      )
    ) {
      audio.unlock();
      audio.tap();
      app.set(new ArmouryScene());
    }
    if (item(t('menu.career'), t('menu.career_sub'))) {
      audio.unlock();
      audio.tap();
      app.set(new CareerScene());
    }
    if (item(t('menu.glossary'), t('menu.glossary_sub'))) {
      audio.unlock();
      audio.tap();
      app.set(new GlossaryScene());
    }
    if (
      item(
        t('menu.settings'),
        profile.settings.imperial ? t('menu.settings_imperial') : t('menu.settings_metric'),
      )
    ) {
      audio.unlock();
      audio.tap();
      app.set(new SettingsScene());
    }

    const footer: Rect = { x, y: app.height - safe.y - 68 * g, w, h: 56 * g };
    if (footer.y > y) {
      fillPanel(ctx, footer, 8, 'rgba(21,29,25,0.55)', C.edgeSoft);
      cornerBrackets(ctx, footer, 10 * g, C.edge, 5 * g);
      rule(ctx, footer.x + 12 * g, footer.y + 22 * g, footer.w - 24 * g);
      paragraph(
        ctx,
        t('menu.footer'),
        footer.x + 12 * g,
        footer.y + 36 * g,
        footer.w - 24 * g,
        T.small * g,
        C.textDim,
      );
      text(ctx, t('menu.how_it_works'), footer.x + 12 * g, footer.y + 12 * g, T.micro * g, C.textFaint);
    }
  }
}
