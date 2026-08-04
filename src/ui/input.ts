/**
 * Pointer handling for mouse and touch as one thing. Taps and drags are
 * separated by distance, not by device, so the whole game works the same way
 * under a finger and under a cursor.
 *
 * Mouse is special: the browser reuses one pointerId for every button. We keep
 * an `e.buttons` bitmask so right-hold + left-click can coexist (breath + fire).
 */

export interface Pointer {
  id: number;
  x: number;
  y: number;
  /** Movement since the previous frame, in CSS pixels. */
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  startT: number;
  /** Furthest the pointer has been from where it went down. */
  travel: number;
  /** Set once travel passes the tap threshold; a drag is no longer a tap. */
  dragging: boolean;
  /** Claimed by a widget or a scene region, so nothing else steals it. */
  claim: string | null;
  /**
   * Which button owns this interaction for aim/tap purposes. 0 = primary
   * (left / finger). Right-hold alone also lives here until left is pressed.
   */
  button: number;
}

export interface Release {
  x: number;
  y: number;
  startX: number;
  startY: number;
  duration: number;
  travel: number;
  claim: string | null;
  consumed: boolean;
  button: number;
}

const TAP_SLOP = 12;

/** Map PointerEvent.button → PointerEvent.buttons bit. */
function buttonMask(button: number): number {
  if (button === 0) return 1; // left
  if (button === 1) return 4; // middle
  if (button === 2) return 2; // right
  if (button === 3) return 8;
  if (button === 4) return 16;
  return 0;
}

export class Input {
  readonly pointers = new Map<number, Pointer>();
  releases: Release[] = [];
  wheel = 0;
  /** Last position the cursor was seen at, pressed or not. Off-screen at -1. */
  hoverX = -1;
  hoverY = -1;
  /**
   * Current mouse `buttons` bitmask (0 when no mouse buttons, or on pure touch).
   * This is the only reliable way to know right is still held while left is down.
   */
  mouseButtons = 0;
  /** Mouse/pen button indices that went down since the last endFrame. */
  private pressedButtons: number[] = [];
  /** Keyboard keys that went down since the last endFrame (KeyboardEvent.code). */
  private pressedKeys: string[] = [];
  private readonly keysHeld = new Set<string>();
  private readonly element: HTMLElement;
  private scale = 1;

  constructor(element: HTMLElement) {
    this.element = element;
    element.addEventListener('pointerdown', this.onDown, { passive: false });
    element.addEventListener('pointermove', this.onMove, { passive: false });
    element.addEventListener('pointerup', this.onUp, { passive: false });
    element.addEventListener('pointercancel', this.onUp, { passive: false });
    element.addEventListener('lostpointercapture', this.onLostCapture);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** CSS pixels to layout units, so widget rects and pointers share a space. */
  setScale(scale: number): void {
    this.scale = scale;
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const box = this.element.getBoundingClientRect();
    return { x: (e.clientX - box.left) / this.scale, y: (e.clientY - box.top) / this.scale };
  }

  private isMouse(e: PointerEvent): boolean {
    return e.pointerType === 'mouse';
  }

  private onDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.element.setPointerCapture?.(e.pointerId);
    const p = this.local(e);
    const mouse = this.isMouse(e);
    const button = mouse ? e.button : 0;

    if (mouse) {
      this.mouseButtons = e.buttons;
      this.pressedButtons.push(button);
    }

    const existing = this.pointers.get(e.pointerId);

    // Primary (left / touch): always start a fresh interaction so a click while
    // right-holding is a clean shot, not a continuation of the right-hold drag.
    if (button === 0) {
      this.pointers.set(e.pointerId, {
        id: e.pointerId,
        x: p.x,
        y: p.y,
        dx: 0,
        dy: 0,
        startX: p.x,
        startY: p.y,
        startT: performance.now(),
        travel: 0,
        dragging: false,
        claim: null,
        button: 0,
      });
      return;
    }

    // Non-primary (right-hold): only create a pointer if nothing is tracked yet.
    // If left is already down, leave the primary pointer alone.
    if (!existing) {
      this.pointers.set(e.pointerId, {
        id: e.pointerId,
        x: p.x,
        y: p.y,
        dx: 0,
        dy: 0,
        startX: p.x,
        startY: p.y,
        startT: performance.now(),
        travel: 0,
        dragging: false,
        claim: null,
        button,
      });
    }
  };

  private onMove = (e: PointerEvent): void => {
    const hover = this.local(e);
    this.hoverX = hover.x;
    this.hoverY = hover.y;
    if (this.isMouse(e)) this.mouseButtons = e.buttons;

    const pointer = this.pointers.get(e.pointerId);
    if (!pointer) return;
    e.preventDefault();
    const p = hover;
    pointer.dx += p.x - pointer.x;
    pointer.dy += p.y - pointer.y;
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.travel = Math.max(pointer.travel, Math.hypot(p.x - pointer.startX, p.y - pointer.startY));
    if (pointer.travel > TAP_SLOP) pointer.dragging = true;
  };

  private onUp = (e: PointerEvent): void => {
    const pointer = this.pointers.get(e.pointerId);
    if (!pointer) {
      if (this.isMouse(e)) this.mouseButtons = e.buttons;
      return;
    }
    e.preventDefault();

    const mouse = this.isMouse(e);
    const releasedButton = mouse ? e.button : pointer.button;

    if (mouse) this.mouseButtons = e.buttons;

    // Only attribute a primary tap/release to left; right-up must not look like a tap.
    const releaseTravel =
      releasedButton === 0 || !mouse ? pointer.travel : Math.max(pointer.travel, TAP_SLOP + 1);

    this.releases.push({
      x: pointer.x,
      y: pointer.y,
      startX: pointer.startX,
      startY: pointer.startY,
      duration: performance.now() - pointer.startT,
      travel: releaseTravel,
      claim: releasedButton === 0 ? pointer.claim : null,
      consumed: false,
      button: releasedButton,
    });

    // Mouse: other buttons may still be down (e.buttons !== 0). Keep the pointer
    // so breath-hold survives a left-click. Touch/pen: always remove.
    if (mouse && e.buttons !== 0) {
      // Left came up while right still held — re-tag so aim ignores it.
      if (releasedButton === 0 && (e.buttons & buttonMask(2)) !== 0) {
        pointer.button = 2;
        pointer.dragging = false;
        pointer.travel = 0;
        pointer.claim = null;
        pointer.startX = pointer.x;
        pointer.startY = pointer.y;
        pointer.startT = performance.now();
      }
      return;
    }

    this.pointers.delete(e.pointerId);
    if (mouse) this.mouseButtons = 0;
  };

  private onLostCapture = (e: PointerEvent): void => {
    // Capture can drop mid-gesture; treat like a full release of that pointer.
    if (!this.pointers.has(e.pointerId)) return;
    if (this.isMouse(e)) {
      this.mouseButtons = 0;
    }
    const pointer = this.pointers.get(e.pointerId)!;
    this.pointers.delete(e.pointerId);
    this.releases.push({
      x: pointer.x,
      y: pointer.y,
      startX: pointer.startX,
      startY: pointer.startY,
      duration: performance.now() - pointer.startT,
      travel: pointer.travel,
      claim: pointer.claim,
      consumed: false,
      button: pointer.button,
    });
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.wheel += e.deltaY;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    // Space is a fire binding in mouse mode — never scroll the page with it.
    if (e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    if (!this.keysHeld.has(e.code)) {
      this.keysHeld.add(e.code);
      this.pressedKeys.push(e.code);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private onBlur = (): void => {
    this.keysHeld.clear();
  };

  /** True if this key code went down since the last endFrame. */
  keyJustPressed(code: string): boolean {
    return this.pressedKeys.includes(code);
  }

  /** True while the key is held. */
  isKeyHeld(code: string): boolean {
    return this.keysHeld.has(code);
  }

  /** Pointers not already grabbed by a widget. */
  free(): Pointer[] {
    return [...this.pointers.values()].filter((p) => p.claim === null);
  }

  byClaim(claim: string): Pointer[] {
    return [...this.pointers.values()].filter((p) => p.claim === claim);
  }

  /** True if this mouse button went down since the last endFrame. */
  buttonJustPressed(button: number): boolean {
    return this.pressedButtons.includes(button);
  }

  /**
   * True while the given mouse/touch button is held.
   * For mouse, uses the buttons bitmask so right survives a left-click.
   */
  isButtonHeld(button: number): boolean {
    const mask = buttonMask(button);
    if (mask !== 0 && (this.mouseButtons & mask) !== 0) return true;
    // Touch / pen (no mouseButtons): fall back to pointer records.
    if (this.mouseButtons === 0) {
      for (const p of this.pointers.values()) {
        if (p.button === button) return true;
      }
    }
    return false;
  }

  /** Call at the very end of a frame. */
  endFrame(): void {
    this.releases = [];
    this.wheel = 0;
    this.pressedButtons = [];
    this.pressedKeys = [];
    for (const p of this.pointers.values()) {
      p.dx = 0;
      p.dy = 0;
    }
  }

  /** A primary-button tap that started and ended inside the same box, and did not wander. */
  takeTap(x: number, y: number, w: number, h: number, claim: string | null = null): boolean {
    for (const r of this.releases) {
      if (r.consumed) continue;
      if (r.button !== 0) continue;
      if (r.claim !== claim) continue;
      if (r.travel > TAP_SLOP) continue;
      if (r.x < x || r.x > x + w || r.y < y || r.y > y + h) continue;
      if (r.startX < x || r.startX > x + w || r.startY < y || r.startY > y + h) continue;
      r.consumed = true;
      return true;
    }
    return false;
  }

  isDownIn(x: number, y: number, w: number, h: number): boolean {
    for (const p of this.pointers.values()) {
      if (p.button !== 0) continue;
      if (p.dragging) continue;
      if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return true;
    }
    return false;
  }

  /** Held anywhere inside a box, drag or not — for hold-to-repeat buttons. */
  isHeldIn(x: number, y: number, w: number, h: number): boolean {
    for (const p of this.pointers.values()) {
      if (p.button !== 0) continue;
      if (p.startX >= x && p.startX <= x + w && p.startY >= y && p.startY <= y + h) return true;
    }
    return false;
  }
}
