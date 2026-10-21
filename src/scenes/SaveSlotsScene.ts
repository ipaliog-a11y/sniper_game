import { setLanguage, t } from '../core/i18n';
import { STAGES } from '../core/range';
import {
  type SlotSummary,
  activeSlot,
  clearSlot,
  copySlot,
  readSlot,
  setActiveSlot,
  slotSummaries,
  writeSlot,
} from '../core/slots';
import { defaultProfile } from '../core/store';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, fillRaised, paragraph, paragraphHeight, rule, text } from '../ui/gfx';
import { C, Scroll, T } from '../ui/ui';
import { MenuScene } from './MenuScene';

/**
 * Three careers. Pick one, copy one onto another, or wipe one.
 *
 * Switching is a save and a load: the career in hand is written back to its
 * own slot before the new one is read, so nothing is ever lost by leaving.
 * Destructive actions take two taps and the second one is the dangerous
 * colour, because a wipe here is somebody's whole course of fire.
 */

type Pending =
  | { kind: 'none' }
  | { kind: 'wipe'; index: number }
  | { kind: 'copy'; from: number }
  | { kind: 'copyTo'; from: number; to: number };

export class SaveSlotsScene implements Scene {
  readonly name = 'slots';
  private scroll = new Scroll('slots');
  private pending: Pending = { kind: 'none' };

  update(): void {}

  /**
   * Write the career in hand back to the slot it came from.
   *
   * Called on entry and on the way out, never per frame. A per-frame write is
   * a write whose destination is read from storage sixty times a second while
   * the same screen is busy changing that destination — and the frame that
   * gets the order wrong puts one career into another's slot.
   */
  private park(app: App): void {
    writeSlot(this.owner, app.profile);
  }

  /** The slot the career in hand belongs to, fixed when this screen opened. */
  private owner = 0;

  enter(app: App): void {
    this.owner = activeSlot();
    this.park(app);
  }

  private open(app: App, index: number): void {
    if (index === this.owner) {
      app.set(new MenuScene());
      return;
    }
    this.park(app);
    setActiveSlot(index);
    this.owner = index;
    const loaded = readSlot(index) ?? defaultProfile();
    app.profile = loaded;
    setLanguage(loaded.settings.language);
    audio.applySettings(loaded.settings);
    // Write immediately: a brand new slot that is never saved would read as
    // empty again the moment the player backs out without finishing a stage.
    app.save();
    this.pending = { kind: 'none' };
    app.toast(t('slots.opened', { n: index + 1 }), 'good');
    audio.chime(true);
    app.set(new MenuScene());
  }

  private summaryLine(slot: SlotSummary, graded: number): string {
    if (slot.empty) return t('slots.empty');
    if (slot.attempted === 0) return t('slots.fresh', { credits: slot.credits.toLocaleString() });
    return t('slots.progress', {
      cleared: slot.cleared,
      total: graded,
      credits: slot.credits.toLocaleString(),
    });
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui } = app;
    const g = app.gauge;
    const safe = app.safe;

    text(ctx, t('slots.title'), safe.x, safe.y + 12 * g, T.head * g, C.text, 'left', 'bold');
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, t('common.menu'), { size: T.small * g })) {
      audio.tap();
      this.park(app);
      app.set(new MenuScene());
    }
    rule(ctx, safe.x, safe.y + 34 * g, safe.w);

    const gradedIds = STAGES.filter((s) => s.id !== 'tutorial').map((s) => s.id);
    const graded = gradedIds.length;
    // The career in hand is handed over rather than written, so its own row is
    // up to date without this screen touching storage while it draws.
    const slots = slotSummaries(gradedIds, app.profile);

    const view: Rect = { x: safe.x, y: safe.y + 44 * g, w: safe.w, h: safe.h - 44 * g };
    // Tall enough that the timestamp line clears the action row under it.
    const cardH = 120 * g;
    const gap = 10 * g;
    const noteH = paragraphHeight(ctx, t('slots.note'), view.w, T.micro * g);
    this.scroll.update(ui.input, view, slots.length * (cardH + gap) + noteH + 18 * g, 1 / 60);
    const blocked = this.scroll.isDragging(ui.input);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    slots.forEach((slot, i) => {
      const y = view.y + i * (cardH + gap) - this.scroll.offset;
      const r: Rect = { x: view.x, y, w: view.w, h: cardH };
      if (y > view.y + view.h || y + cardH < view.y) return;

      const copyTarget =
        (this.pending.kind === 'copy' && this.pending.from !== i) ||
        (this.pending.kind === 'copyTo' && this.pending.from !== i);
      fillRaised(ctx, r, 9, {
        fillTop: slot.active ? 'rgba(232,163,61,0.12)' : C.panelHi,
        fillBottom: slot.active ? 'rgba(232,163,61,0.04)' : C.panel,
        stroke: copyTarget ? C.amber : slot.active ? C.amber : C.edge,
        accentLeft: slot.active ? C.amber : slot.empty ? C.edgeSoft : C.edgeBright,
      });

      const pad = 16 * g;
      text(
        ctx,
        t('slots.slot', { n: slot.index + 1 }),
        r.x + pad,
        r.y + 20 * g,
        T.body * g,
        slot.empty ? C.textFaint : C.text,
        'left',
        'bold',
      );
      if (slot.active) {
        text(
          ctx,
          t('slots.in_use'),
          r.x + r.w - pad,
          r.y + 20 * g,
          T.micro * g,
          C.amber,
          'right',
          'bold',
        );
      }
      text(
        ctx,
        this.summaryLine(slot, graded),
        r.x + pad,
        r.y + 40 * g,
        T.small * g,
        slot.empty ? C.textFaint : C.textDim,
      );
      if (!slot.empty && slot.savedAt > 0) {
        text(
          ctx,
          t('slots.saved', { when: new Date(slot.savedAt).toLocaleString() }),
          r.x + pad,
          r.y + 57 * g,
          T.micro * g,
          C.textFaint,
        );
      }

      // --- the three actions -------------------------------------------
      const btnH = 30 * g;
      const btnY = r.y + cardH - btnH - 12 * g;
      const btnW = (r.w - pad * 2 - 16 * g) / 3;
      const place = (slotIndex: number): Rect => ({
        x: r.x + pad + slotIndex * (btnW + 8 * g),
        y: btnY,
        w: btnW,
        h: btnH,
      });

      /**
       * Copying: every other card becomes a destination until it resolves.
       *
       * An empty destination goes straight through — there is nothing there to
       * lose. A destination holding a career asks twice, exactly as wiping
       * does, because replacing one is every bit as final as deleting it and
       * the button sits where OPEN was a moment ago.
       */
      if (copyTarget) {
        const armed =
          this.pending.kind === 'copyTo' && this.pending.to === i
            ? this.pending
            : this.pending.kind === 'copy'
              ? this.pending
              : null;
        if (!armed) return;
        const confirming = this.pending.kind === 'copyTo' && this.pending.to === i;
        const whole: Rect = { x: r.x + pad, y: btnY, w: r.w - pad * 2, h: btnH };
        const label = confirming
          ? t('slots.copy_replace_confirm', { n: i + 1 })
          : t(slot.empty ? 'slots.copy_here' : 'slots.copy_over', { n: i + 1 });
        if (
          !blocked &&
          ui.button(whole, label, {
            size: T.small * g,
            accent: true,
            danger: !slot.empty,
          })
        ) {
          audio.tap();
          if (slot.empty || confirming) {
            if (copySlot(armed.from, i)) {
              app.toast(t('slots.copied', { from: armed.from + 1, to: i + 1 }), 'good');
              audio.chime(true);
            }
            this.pending = { kind: 'none' };
          } else {
            this.pending = { kind: 'copyTo', from: armed.from, to: i };
          }
        }
        return;
      }

      const openLabel = slot.active
        ? t('slots.continue')
        : slot.empty
          ? t('slots.start')
          : t('slots.open');
      if (!blocked && ui.button(place(0), openLabel, { size: T.small * g, accent: slot.active })) {
        audio.tap();
        this.open(app, i);
        return;
      }

      const copying =
        (this.pending.kind === 'copy' || this.pending.kind === 'copyTo') &&
        this.pending.from === i;
      if (
        !blocked &&
        ui.button(place(1), copying ? t('common.cancel') : t('slots.copy'), {
          size: T.small * g,
          disabled: slot.empty,
        })
      ) {
        audio.tap();
        this.pending = copying ? { kind: 'none' } : { kind: 'copy', from: i };
      }

      const wiping = this.pending.kind === 'wipe' && this.pending.index === i;
      if (
        !blocked &&
        ui.button(place(2), wiping ? t('slots.wipe_confirm') : t('slots.wipe'), {
          size: T.small * g,
          danger: wiping,
          accent: wiping,
          // The slot you are standing in cannot be wiped from under you.
          disabled: slot.empty || slot.active,
        })
      ) {
        audio.tap();
        if (wiping) {
          clearSlot(i);
          this.pending = { kind: 'none' };
          app.toast(t('slots.wiped', { n: i + 1 }), 'bad');
        } else {
          this.pending = { kind: 'wipe', index: i };
        }
      }
    });

    const noteY = view.y + slots.length * (cardH + gap) + 10 * g - this.scroll.offset;
    paragraph(ctx, t('slots.note'), view.x, noteY, view.w, T.micro * g, C.textFaint);

    ctx.restore();
  }
}
