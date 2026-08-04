import {
  type Attachment,
  GEAR,
  GEAR_SLOTS,
  MUZZLES,
  OPTICS,
  SUPPORTS,
} from '../core/catalog/attachments';
import { CARTRIDGES, type Cartridge, cartridgesFor } from '../core/catalog/cartridges';
import { DETAIL_TABS, itemDetailById } from '../core/catalog/itemDetails';
import { RIFLES, type Rifle } from '../core/catalog/rifles';
import {
  catalogBlurb,
  catalogDetail,
  catalogName,
  catalogNotes,
  catalogRole,
} from '../core/catalogLabels';
import { t } from '../core/i18n';
import { resolveLoadout } from '../core/loadout';
import { buildDope } from '../core/scope';
import { buy, owns } from '../core/store';
import { mToYard, msToFps } from '../core/units';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, fillPanel, paragraph, roundRect, rule, text } from '../ui/gfx';
import { drawImageContained, getGearImage } from '../ui/gearImages';
import { C, Scroll, T } from '../ui/ui';
import { MenuScene } from './MenuScene';

/**
 * The armoury. Buying is deliberately slow — a rifle costs several clean
 * stages — so that the decision of what to hang off it stays a decision. The
 * three gear pockets are the sharp end of that: a rangefinder, a weather meter
 * and a solver will do all of your thinking, and you cannot have all three and
 * a spotting scope as well.
 */

type Tab = 'rifle' | 'ammo' | 'optic' | 'muzzle' | 'support' | 'gear';
const TABS: Tab[] = ['rifle', 'ammo', 'optic', 'muzzle', 'support', 'gear'];
const TAB_LABEL_KEYS = [
  'armoury.tab.rifle',
  'armoury.tab.ammo',
  'armoury.tab.optic',
  'armoury.tab.muzzle',
  'armoury.tab.support',
  'armoury.tab.gear',
] as const;

interface Entry {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  stats: Array<[string, string]>;
  equipped: boolean;
  usable: boolean;
  /** Why it cannot be used, if it cannot. */
  reason?: string;
}

export interface ArmouryOptions {
  /**
   * Free Field kit mode: every catalogue item can be fitted without buying.
   * Ownership and credits are not changed.
   */
  freeKit?: boolean;
  /** Where BACK returns (defaults to main menu). */
  returnTo?: () => Scene;
}

export class ArmouryScene implements Scene {
  readonly name = 'armoury';
  private tab = 0;
  private scroll = new Scroll('armoury');
  /** Open item-detail overlay (rifle / glass / muzzle), or null. */
  private detailId: string | null = null;
  private detailScroll = new Scroll('armoury-detail');
  /** Data cards cost tens of milliseconds to build, so never build one twice. */
  private dopeCache = new Map<string, ReturnType<typeof buildDope>>();
  private readonly freeKit: boolean;
  private readonly returnTo: (() => Scene) | null;

  constructor(options: ArmouryOptions = {}) {
    this.freeKit = Boolean(options.freeKit);
    this.returnTo = options.returnTo ?? null;
  }

  update(): void {}

  private tabKey(): Tab {
    return TABS[this.tab];
  }

  private hasDetails(tab: Tab = this.tabKey()): boolean {
    return DETAIL_TABS.has(tab);
  }

  private entries(app: App): Entry[] {
    const profile = app.profile;
    const selection = profile.loadout;
    const rifle = RIFLES.find((r) => r.id === selection.rifleId) ?? RIFLES[0];

    switch (TABS[this.tab]) {
      case 'rifle':
        return RIFLES.map((r: Rifle) => ({
          id: r.id,
          name: catalogName(r.id, r.name),
          blurb: catalogBlurb(r.id, r.blurb),
          cost: r.cost,
          equipped: r.id === selection.rifleId,
          usable: true,
          stats: [
            [t('armoury.stat.chambering'), r.chambering.toUpperCase()],
            [t('armoury.stat.barrel'), `${r.barrelIn}" 1:${r.twistIn}`],
            [t('armoury.stat.precision'), `${r.precisionMoa.toFixed(2)} MOA`],
            [t('armoury.stat.cycle'), `${r.cycleSeconds.toFixed(1)} s`],
            [t('armoury.stat.mass'), `${r.massKg.toFixed(1)} kg`],
            [t('armoury.stat.rail'), `${r.railMils} MIL`],
          ],
        }));

      case 'ammo': {
        const compatible = new Set(cartridgesFor(rifle.chambering).map((c) => c.id));
        return CARTRIDGES.map((c: Cartridge) => ({
          id: c.id,
          name: catalogName(c.id, c.name),
          blurb: catalogBlurb(c.id, c.blurb),
          cost: c.cost,
          equipped: c.id === selection.cartridgeId,
          usable: compatible.has(c.id),
          reason: compatible.has(c.id)
            ? undefined
            : t('armoury.not_chambered', { rifle: catalogName(rifle.id, rifle.name) }),
          stats: [
            [t('armoury.stat.chambering'), c.chambering.toUpperCase()],
            [t('armoury.stat.bullet'), `${c.grains} gr ${c.grade}`],
            [t('armoury.stat.bc'), `${c.bc.toFixed(3)} ${c.dragModel}`],
            [t('armoury.stat.velocity'), `${c.velocityFps} fps @ ${c.referenceBarrelIn}"`],
            [t('armoury.stat.velocity_sd'), `${c.velocitySd} fps`],
            [t('armoury.stat.dispersion'), `${c.dispersionMoa.toFixed(2)} MOA`],
          ],
        }));
      }

      case 'optic':
        return OPTICS.map((o) => ({
          id: o.id,
          name: catalogName(o.id, o.name),
          blurb: catalogBlurb(o.id, o.blurb),
          cost: o.cost,
          equipped: o.id === selection.opticId,
          usable: true,
          stats: [
            [t('armoury.stat.magnification'), `${o.magMin}–${o.magMax}x`],
            [
              t('armoury.stat.turrets'),
              `${o.turretUnit}, ${(o.clickRad / (o.turretUnit === 'MIL' ? 0.001 : 0.000290888)).toFixed(2)}/click`,
            ],
            [t('armoury.stat.travel'), t('armoury.travel_up', { mils: o.elevationTravelMils })],
            [t('armoury.stat.reticle'), `${o.reticle} · ${o.ffp ? 'FFP' : `SFP @ ${o.trueAtMag}x`}`],
            [t('armoury.stat.glass'), `${Math.round(o.glass * 100)}%`],
            [t('armoury.stat.mass'), `${o.massKg.toFixed(2)} kg`],
          ],
        }));

      case 'muzzle':
        return MUZZLES.map((m) => ({
          id: m.id,
          name: catalogName(m.id, m.name),
          blurb: catalogBlurb(m.id, m.blurb),
          cost: m.cost,
          equipped: m.id === selection.muzzleId,
          usable: true,
          stats: [
            [t('armoury.stat.recoil'), `${Math.round(m.recoilFactor * 100)}%`],
            [
              t('armoury.stat.velocity'),
              `${m.velocityDeltaFps >= 0 ? '+' : ''}${m.velocityDeltaFps} fps`,
            ],
            [
              t('armoury.stat.dispersion'),
              `${m.dispersionMoa >= 0 ? '+' : ''}${m.dispersionMoa.toFixed(2)} MOA`,
            ],
            [t('armoury.stat.signature'), `${Math.round(m.signature * 100)}%`],
            [t('armoury.stat.report'), `${Math.round(m.loudness * 100)}%`],
            [t('armoury.stat.mass'), `${m.massKg.toFixed(2)} kg`],
          ],
        }));

      case 'support':
        return SUPPORTS.map((s) => ({
          id: s.id,
          name: catalogName(s.id, s.name),
          blurb: catalogBlurb(s.id, s.blurb),
          cost: s.cost,
          equipped: s.id === selection.supportId,
          usable: true,
          stats: [
            [t('armoury.stat.hold'), t('armoury.wobble', { pct: Math.round(s.swayFactor * 100) })],
            [t('armoury.stat.drift'), `${Math.round(s.swaySpeed * 100)}%`],
            [t('armoury.stat.setup'), `${s.setupSeconds.toFixed(1)} s`],
            [t('armoury.stat.mass'), `${s.massKg.toFixed(2)} kg`],
          ],
        }));

      case 'gear': {
        const fitted = selection.gearIds;
        return GEAR.map((gear) => ({
          id: gear.id,
          name: catalogName(gear.id, gear.name),
          blurb: catalogBlurb(gear.id, gear.blurb),
          cost: gear.cost,
          equipped: fitted.includes(gear.id),
          usable: fitted.includes(gear.id) || fitted.length < GEAR_SLOTS,
          reason:
            fitted.includes(gear.id) || fitted.length < GEAR_SLOTS
              ? undefined
              : t('armoury.pockets_full'),
          stats: [[t('armoury.stat.mass'), `${gear.massKg.toFixed(2)} kg`]],
        }));
      }
    }
  }

  private equip(app: App, id: string): void {
    const selection = app.profile.loadout;
    switch (TABS[this.tab]) {
      case 'rifle': {
        selection.rifleId = id;
        // Changing chambering strands the old ammunition; fall back to whatever
        // this rifle can actually eat, cheapest first.
        const rifle = RIFLES.find((r) => r.id === id)!;
        const compatible = cartridgesFor(rifle.chambering);
        if (!compatible.some((c) => c.id === selection.cartridgeId)) {
          const affordable = this.freeKit
            ? compatible[0]
            : (compatible.find((c) => owns(app.profile, c.id)) ?? compatible[0]);
          selection.cartridgeId = affordable.id;
          app.toast(t('armoury.ammo_switched', { name: catalogName(affordable.id, affordable.name) }));
        }
        break;
      }
      case 'ammo':
        selection.cartridgeId = id;
        break;
      case 'optic':
        selection.opticId = id;
        break;
      case 'muzzle':
        selection.muzzleId = id;
        break;
      case 'support':
        selection.supportId = id;
        break;
      case 'gear': {
        const fitted = selection.gearIds;
        const at = fitted.indexOf(id);
        if (at >= 0) fitted.splice(at, 1);
        else if (fitted.length < GEAR_SLOTS) fitted.push(id);
        break;
      }
    }
    app.save();
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui, profile } = app;
    const g = app.gauge;
    const safe = app.safe;
    const imperial = profile.settings.imperial;

    text(
      ctx,
      this.freeKit ? t('armoury.title_free') : t('armoury.title'),
      safe.x,
      safe.y + 12 * g,
      T.head * g,
      C.text,
      'left',
      'bold',
    );
    if (!this.freeKit) {
      text(
        ctx,
        t('common.cr', { n: profile.credits.toLocaleString() }),
        safe.x + safe.w - 84 * g,
        safe.y + 14 * g,
        T.body * g,
        C.amber,
        'right',
        'bold',
      );
    } else {
      text(
        ctx,
        t('armoury.free_kit_badge'),
        safe.x + safe.w - 84 * g,
        safe.y + 14 * g,
        T.small * g,
        C.amber,
        'right',
        'bold',
      );
    }
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, this.returnTo ? t('common.back') : t('common.menu'), { size: T.small * g })) {
      audio.tap();
      app.set(this.returnTo ? this.returnTo() : new MenuScene());
    }

    const tabRect: Rect = { x: safe.x, y: safe.y + 38 * g, w: safe.w, h: 30 * g };
    const picked = ui.tabs(
      tabRect,
      TAB_LABEL_KEYS.map((k) => t(k)),
      this.tab,
    );
    if (picked >= 0 && picked !== this.tab && !this.detailId) {
      this.tab = picked;
      this.scroll.offset = 0;
      this.detailId = null;
      audio.tap();
    }

    // A live summary of what the rifle as configured actually does. This is the
    // only place the player sees the loadout resolved into real numbers before
    // they are standing behind it.
    const summaryH = 76 * g;
    const summary: Rect = { x: safe.x, y: tabRect.y + tabRect.h + 10 * g, w: safe.w, h: summaryH };
    this.drawSummary(ctx, summary, app, imperial);

    const view: Rect = {
      x: safe.x,
      y: summary.y + summaryH + 10 * g,
      w: safe.w,
      h: safe.h - (summary.y + summaryH + 10 * g - safe.y),
    };

    const entries = this.entries(app);
    const modalOpen = this.detailId !== null;
    // Stats wrap into however many columns fit, and the card grows to hold them
    // rather than letting the rows print on top of each other.
    const statCols = view.w > 380 * g ? 3 : 2;
    const maxStats = entries.reduce((m, e) => Math.max(m, e.stats.length), 0);
    const statRows = Math.ceil(maxStats / statCols);
    const cardH = (86 + statRows * 30) * g;
    const gap = 10 * g;
    if (!modalOpen) {
      this.scroll.update(ui.input, view, entries.length * (cardH + gap), 1 / 60);
    }
    const blocked = modalOpen || this.scroll.isDragging(ui.input);
    const showDetailsBtn = this.hasDetails();

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    entries.forEach((entry, i) => {
      const y = view.y + i * (cardH + gap) - this.scroll.offset;
      if (y > view.y + view.h || y + cardH < view.y) return;
      const r: Rect = { x: view.x, y, w: view.w, h: cardH };
      // Free Field kit: every item is usable as if owned (equip only, no buy).
      const held = this.freeKit || owns(profile, entry.id);
      // Temporary debug: free shop prices when settings.debugFreeShop is on.
      const price = profile.settings.debugFreeShop ? 0 : entry.cost;
      const affordable = profile.credits >= price;

      fillPanel(
        ctx,
        r,
        8,
        entry.equipped ? 'rgba(232,163,61,0.09)' : C.panel,
        entry.equipped ? C.amber : C.edge,
      );

      const pad = 14 * g;
      const actionW = 88 * g;
      const detailsW = 88 * g;
      const action: Rect = {
        x: r.x + r.w - pad - actionW,
        y: r.y + 10 * g,
        w: actionW,
        h: 30 * g,
      };
      const detailsBtn: Rect = {
        x: action.x - (showDetailsBtn ? detailsW + 8 * g : 0),
        y: r.y + 10 * g,
        w: detailsW,
        h: 30 * g,
      };
      const nameMaxW = (showDetailsBtn ? detailsBtn.x : action.x) - r.x - pad - 8 * g;

      ui.fitText(
        entry.name,
        r.x + pad,
        r.y + 20 * g,
        Math.max(40 * g, nameMaxW),
        T.body * g,
        entry.usable ? C.text : C.textFaint,
        'left',
        'bold',
      );

      if (showDetailsBtn && itemDetailById(entry.id) && !modalOpen) {
        if (ui.button(detailsBtn, t('armoury.details'), { size: T.small * g })) {
          audio.tap();
          this.detailId = entry.id;
          this.detailScroll.offset = 0;
        }
      }

      if (!modalOpen) {
        if (entry.equipped) {
          text(
            ctx,
            t('armoury.fitted'),
            action.x + action.w,
            r.y + 25 * g,
            T.small * g,
            C.amber,
            'right',
            'bold',
          );
        } else if (!held) {
          if (
            ui.button(action, t('common.cr', { n: price.toLocaleString() }), {
              size: T.small * g,
              disabled: !affordable,
              accent: affordable,
            })
          ) {
            if (buy(profile, entry.id, price)) {
              audio.chime(true);
              app.toast(t('armoury.bought', { name: entry.name }), 'good');
              this.equip(app, entry.id);
            }
          }
        } else if (!entry.usable) {
          text(
            ctx,
            t('armoury.owned'),
            action.x + action.w,
            r.y + 25 * g,
            T.small * g,
            C.textFaint,
            'right',
          );
        } else if (
          ui.button(action, entry.equipped ? t('armoury.fitted') : t('armoury.fit'), {
            size: T.small * g,
          })
        ) {
          audio.click();
          this.equip(app, entry.id);
        }
      } else if (entry.equipped) {
        text(
          ctx,
          t('armoury.fitted'),
          action.x + action.w,
          r.y + 25 * g,
          T.small * g,
          C.amber,
          'right',
          'bold',
        );
      }

      paragraph(ctx, entry.blurb, r.x + pad, r.y + 44 * g, r.w - pad * 2, T.small * g, C.textDim);

      // Stats at the foot of the card, on a rhythm that leaves room for both
      // the label and the value.
      const statY = r.y + 84 * g;
      const colGap = 10 * g;
      const colW = (r.w - pad * 2 - colGap * (statCols - 1)) / statCols;
      entry.stats.forEach((stat, si) => {
        const cx = r.x + pad + (si % statCols) * (colW + colGap);
        const cy = statY + Math.floor(si / statCols) * 30 * g;
        text(ctx, stat[0], cx, cy, T.micro * g, C.textFaint);
        ui.fitText(stat[1], cx, cy + 14 * g, colW, T.small * g, entry.usable ? C.text : C.textFaint);
      });

      if (entry.reason) {
        ui.fitText(entry.reason, r.x + r.w - pad, r.y + 20 * g, r.w * 0.45, T.micro * g, C.red, 'right');
      }

      if (!blocked && entry.usable && held && ui.input.takeTap(r.x, r.y, r.w, r.h)) {
        audio.click();
        this.equip(app, entry.id);
      }
    });

    ctx.restore();

    if (this.detailId) {
      this.drawDetailWindow(ctx, app, entries);
    }
  }

  /**
   * Full-screen detail overlay for a rifle, optic, or muzzle.
   * Catalogue art loads from public/gear/ via meta.image when present.
   */
  private drawDetailWindow(ctx: CanvasRenderingContext2D, app: App, entries: Entry[]): void {
    const { ui } = app;
    const g = app.gauge;
    const safe = app.safe;
    const id = this.detailId!;
    const entry = entries.find((e) => e.id === id);
    const meta = itemDetailById(id);
    if (!entry || !meta) {
      this.detailId = null;
      return;
    }

    // Dim the armoury underneath and swallow taps outside the panel.
    ctx.fillStyle = 'rgba(8,11,10,0.86)';
    ctx.fillRect(0, 0, app.width, app.height);

    const panelW = Math.min(safe.w, 480 * g);
    const panelH = Math.min(safe.h - 12 * g, 560 * g);
    const panel: Rect = {
      x: app.width / 2 - panelW / 2,
      y: app.height / 2 - panelH / 2,
      w: panelW,
      h: panelH,
    };
    fillPanel(ctx, panel, 10, C.panel, C.amber);

    const pad = 14 * g;
    text(
      ctx,
      t('armoury.details_title'),
      panel.x + pad,
      panel.y + 16 * g,
      T.micro * g,
      C.textFaint,
    );
    text(
      ctx,
      entry.name,
      panel.x + pad,
      panel.y + 34 * g,
      T.head * g,
      C.text,
      'left',
      'bold',
    );

    const close: Rect = {
      x: panel.x + panel.w - pad - 86 * g,
      y: panel.y + 12 * g,
      w: 86 * g,
      h: 28 * g,
    };
    if (ui.button(close, t('armoury.details_close'), { size: T.small * g })) {
      audio.tap();
      this.detailId = null;
      return;
    }

    const role = catalogRole(id);
    if (role) {
      ui.fitText(
        role,
        panel.x + pad,
        panel.y + 52 * g,
        panel.w - pad * 2 - 90 * g,
        T.small * g,
        C.amber,
      );
    }

    rule(ctx, panel.x + pad, panel.y + 64 * g, panel.w - pad * 2);

    // Scrollable body under the chrome.
    const body: Rect = {
      x: panel.x + pad,
      y: panel.y + 74 * g,
      w: panel.w - pad * 2,
      h: panel.h - 74 * g - pad,
    };

    // Measure content height (image + specs + prose + notes).
    const imgH = Math.min(148 * g, body.w * 0.42);
    const statCols = body.w > 300 * g ? 3 : 2;
    const statRows = Math.ceil(entry.stats.length / statCols);
    const specsH = 18 * g + statRows * 28 * g;
    // Approximate prose height from character count so scroll max is stable.
    const detailText = catalogDetail(id);
    const notes = catalogNotes(id);
    // Mono glyph width is ~0.6em; pad lines so scroll max is never short.
    const charsPerLine = Math.max(18, Math.floor(body.w / (T.small * g * 0.62)));
    const detailLines = Math.max(4, Math.ceil(detailText.length / charsPerLine) + 2);
    const detailH = detailLines * T.small * g * 1.45;
    const notesH = notes.length
      ? 22 * g +
        notes.reduce(
          (sum, n) =>
            sum + (Math.max(1, Math.ceil(n.length / charsPerLine)) + 1) * T.small * g * 1.4 + 10 * g,
          0,
        )
      : 0;
    const contentH =
      imgH + 14 * g + specsH + 12 * g + 16 * g + detailH + 12 * g + notesH + 48 * g;

    this.detailScroll.update(ui.input, body, contentH, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(body.x, body.y, body.w, body.h);
    ctx.clip();

    let y = body.y - this.detailScroll.offset;

    // Product art (public/gear/…) or a reserved photo-slot placeholder.
    const img: Rect = { x: body.x, y, w: body.w, h: imgH };
    fillPanel(ctx, img, 8, C.bgDeep, C.edgeSoft);
    const art = getGearImage(meta.image);
    if (art) {
      ctx.save();
      roundRect(ctx, img, 8);
      ctx.clip();
      drawImageContained(ctx, art, img);
      ctx.restore();
    } else {
      ctx.strokeStyle = C.edge;
      ctx.lineWidth = 1;
      const m = 10 * g;
      for (const [ox, oy, sx, sy] of [
        [img.x + m, img.y + m, 1, 1],
        [img.x + img.w - m, img.y + m, -1, 1],
        [img.x + m, img.y + img.h - m, 1, -1],
        [img.x + img.w - m, img.y + img.h - m, -1, -1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + sy * 16 * g);
        ctx.lineTo(ox, oy);
        ctx.lineTo(ox + sx * 16 * g, oy);
        ctx.stroke();
      }
      text(
        ctx,
        meta.image ? t('armoury.image_loading') : t('armoury.image_soon'),
        img.x + img.w / 2,
        img.y + img.h / 2 - 8 * g,
        T.body * g,
        C.textDim,
        'center',
        'bold',
      );
      if (!meta.image) {
        text(
          ctx,
          t('armoury.image_hint'),
          img.x + img.w / 2,
          img.y + img.h / 2 + 12 * g,
          T.micro * g,
          C.textFaint,
          'center',
        );
      }
    }
    y += imgH + 14 * g;

    text(ctx, t('armoury.spec_sheet'), body.x, y + 6 * g, T.micro * g, C.textFaint);
    y += 18 * g;
    const colGap = 10 * g;
    const colW = (body.w - colGap * (statCols - 1)) / statCols;
    entry.stats.forEach((stat, si) => {
      const cx = body.x + (si % statCols) * (colW + colGap);
      const cy = y + Math.floor(si / statCols) * 28 * g;
      text(ctx, stat[0], cx, cy, T.micro * g, C.textFaint);
      ui.fitText(stat[1], cx, cy + 13 * g, colW - 4 * g, T.small * g, C.text);
    });
    y += statRows * 28 * g + 12 * g;

    rule(ctx, body.x, y, body.w);
    y += 14 * g;

    const proseH = paragraph(ctx, detailText, body.x, y, body.w, T.small * g, C.textDim);
    y += proseH + 12 * g;

    if (notes.length) {
      text(ctx, t('armoury.field_notes'), body.x, y + 4 * g, T.micro * g, C.amber);
      y += 18 * g;
      for (const note of notes) {
        text(ctx, '·', body.x, y + 2 * g, T.small * g, C.amber);
        const nh = paragraph(ctx, note, body.x + 12 * g, y, body.w - 12 * g, T.small * g, C.text);
        y += Math.max(nh, T.small * g * 1.4) + 8 * g;
      }
    }

    ctx.restore();

    // Close when the user taps the dimmed area around the panel.
    const strips: Rect[] = [
      { x: 0, y: 0, w: app.width, h: panel.y },
      { x: 0, y: panel.y + panel.h, w: app.width, h: app.height - (panel.y + panel.h) },
      { x: 0, y: panel.y, w: panel.x, h: panel.h },
      { x: panel.x + panel.w, y: panel.y, w: app.width - (panel.x + panel.w), h: panel.h },
    ];
    for (const s of strips) {
      if (s.w <= 0 || s.h <= 0) continue;
      if (ui.input.takeTap(s.x, s.y, s.w, s.h)) {
        audio.tap();
        this.detailId = null;
        return;
      }
    }
  }

  private drawSummary(
    ctx: CanvasRenderingContext2D,
    r: Rect,
    app: App,
    imperial: boolean,
  ): void {
    const g = app.gauge;
    const loadout = resolveLoadout(app.profile.loadout);
    fillPanel(ctx, r, 8, 'rgba(8,11,10,0.5)', C.edgeSoft);

    const pad = 12 * g;
    const half = (r.w - pad * 2) / 2;
    app.ui.fitText(
      `${catalogName(loadout.rifle.id, loadout.rifle.name)} · ${catalogName(loadout.cartridge.id, loadout.cartridge.name)}`,
      r.x + pad,
      r.y + 15 * g,
      half + 20 * g,
      T.small * g,
      C.text,
      'left',
      'bold',
    );
    // Full gear names when there is room for them, a count when there is not.
    const gearNames = loadout.gear.length
      ? half > 200 * g
        ? loadout.gear.map((gear) => catalogName(gear.id, gear.name)).join(', ')
        : t('armoury.gear_count', { n: loadout.gear.length, max: GEAR_SLOTS })
      : t('armoury.no_gear');
    app.ui.fitText(
      gearNames,
      r.x + r.w - pad,
      r.y + 15 * g,
      half - 20 * g,
      T.micro * g,
      C.textFaint,
      'right',
    );
    rule(ctx, r.x + pad, r.y + 26 * g, r.w - pad * 2);

    // Where the load actually stops being supersonic — the honest measure of
    // how far this rifle reaches. Only the barrel and the bullet move it, so
    // that pair is the whole cache key.
    const key = `${loadout.rifle.id}|${loadout.cartridge.id}|${loadout.muzzle.id}|${loadout.zeroRangeM}`;
    let dope = this.dopeCache.get(key);
    if (!dope) {
      dope = buildDope(loadout);
      this.dopeCache.set(key, dope);
    }
    const supersonic = dope.transonicRangeM
      ? imperial
        ? `${Math.round(mToYard(dope.transonicRangeM))} yd`
        : `${Math.round(dope.transonicRangeM)} m`
      : t('armoury.beyond_card');

    const stats: Array<[string, string, string?]> = [
      [t('armoury.stat.muzzle'), `${msToFps(loadout.muzzleVelocity).toFixed(0)} fps`],
      [t('armoury.stat.group'), `${loadout.dispersionMoa.toFixed(2)} MOA`],
      [
        t('armoury.stat.stability'),
        loadout.stability.toFixed(2),
        loadout.stability < 1.4 ? C.red : C.text,
      ],
      [t('armoury.stat.hold'), `${loadout.swayMils.toFixed(2)} MIL`],
      [t('armoury.stat.recoil'), `${loadout.recoilKick.toFixed(2)} m/s`],
      [t('armoury.stat.transonic'), supersonic],
    ];
    const colW = (r.w - pad * 2) / stats.length;
    stats.forEach((stat, i) => {
      const x = r.x + pad + i * colW;
      text(ctx, stat[0], x, r.y + 42 * g, T.micro * g, C.textFaint);
      app.ui.fitText(stat[1], x, r.y + 58 * g, colW - 8 * g, T.small * g, stat[2] ?? C.text);
    });
  }
}

export type { Attachment };
