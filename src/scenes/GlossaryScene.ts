import { t } from '../core/i18n';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, fillPanel, paragraph, rule, text } from '../ui/gfx';
import { C, Scroll, T } from '../ui/ui';
import { MenuScene } from './MenuScene';
import { SettingsScene } from './SettingsScene';

/** Keys for glossary entries (term + definition pairs in locales). */
const GLOSSARY_KEYS = [
  'mil',
  'moa',
  'dope',
  'zero',
  'cold_bore',
  'elevation',
  'windage',
  'click',
  'turret',
  'hold',
  'breath',
  'cant',
  'bc',
  'g1_g7',
  'transonic',
  'density_altitude',
  'coriolis',
  'spin_drift',
  'ffp_sfp',
  'first_round',
  'speed_bonus',
  'frh',
  'par',
  'qualified',
  'unlock',
  'practice',
  'free_field',
  'scenery',
  'rangefinder',
  'weather_meter',
  'solver',
  'spotter',
  'data_card',
  'find_next',
  'credits',
  'chrono',
  'traj',
] as const;

/**
 * Plain-language definitions of the terms the game throws around.
 * Opened from the main menu or Settings.
 */
export class GlossaryScene implements Scene {
  readonly name = 'glossary';
  private scroll = new Scroll('glossary');
  private readonly returnTo: 'menu' | 'settings';

  constructor(returnTo: 'menu' | 'settings' = 'menu') {
    this.returnTo = returnTo;
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui } = app;
    const g = app.gauge;
    const safe = app.safe;

    text(ctx, t('glossary.title'), safe.x, safe.y + 12 * g, T.head * g, C.text, 'left', 'bold');
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, t('common.back'), { size: T.small * g })) {
      audio.tap();
      app.set(this.returnTo === 'settings' ? new SettingsScene() : new MenuScene());
    }
    rule(ctx, safe.x, safe.y + 34 * g, safe.w);

    const view: Rect = { x: safe.x, y: safe.y + 44 * g, w: safe.w, h: safe.h - 44 * g };
    const pad = 12 * g;
    const cardGap = 8 * g;
    const defSize = T.small * g;
    const maxW = view.w - pad * 2;

    const cardHeights = GLOSSARY_KEYS.map((key) => {
      const def = t(`glossary.${key}.def`);
      const avgChar = defSize * 0.5;
      const charsPerLine = Math.max(16, Math.floor(maxW / avgChar));
      const lines = Math.max(2, Math.ceil(def.length / charsPerLine));
      return Math.max(52 * g, 30 * g + lines * defSize * 1.45 + 12 * g);
    });
    const contentH =
      32 * g + cardHeights.reduce((s, h) => s + h + cardGap, 0);
    this.scroll.update(ui.input, view, contentH, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    let y = view.y + 4 * g - this.scroll.offset;
    text(ctx, t('glossary.intro'), view.x, y + 10 * g, T.small * g, C.textDim);
    y += 28 * g;

    GLOSSARY_KEYS.forEach((key, i) => {
      const cardH = cardHeights[i];
      if (y + cardH > view.y - 10 && y < view.y + view.h + 10) {
        const r: Rect = { x: view.x, y, w: view.w, h: cardH };
        fillPanel(ctx, r, 6, 'rgba(21,29,25,0.7)', C.edgeSoft);
        text(ctx, t(`glossary.${key}.term`), r.x + pad, r.y + 16 * g, T.body * g, C.amber, 'left', 'bold');
        paragraph(ctx, t(`glossary.${key}.def`), r.x + pad, r.y + 32 * g, maxW, defSize, C.textDim);
      }
      y += cardH + cardGap;
    });

    ctx.restore();
  }
}
