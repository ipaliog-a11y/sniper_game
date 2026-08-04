/**
 * Pointer handling for mouse and touch as one thing. Taps and drags are
 * separated by distance, not by device, so the whole game works the same way
 * under a finger and under a cursor. Mouse button is tracked so shoot scenes
 * can bind right-hold and left-click without treating every button as a finger.
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
   * Which button started this pointer. 0 = primary (left / finger), 1 = middle,
   * 2 = secondary (right). Touch always reports 0.
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

export class Input {
  readonly pointers = new Map<number, Pointer>();
  releases: Release[] = [];
  wheel = 0;
  /** Last position the cursor was seen at, pressed or not. Off-screen at -1. */
  hoverX = -1;
  hoverY = -1;
  private readonly element: HTMLElement;
  private scale = 1;

  constructor(element: HTMLElement) {
    this.element = element;
    element.addEventListener('pointerdown', this.onDown, { passive: false });
    element.addEventListener('pointermove', this.onMove, { passive: false });
    element.addEventListener('pointerup', this.onUp, { passive: false });
    element.addEventListener('pointercancel', this.onUp, { passive: false });
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** CSS pixels to layout units, so widget rects and pointers share a space. */
  setScale(scale: number): void {
    this.scale = scale;
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const box = this.element.getBoundingClientRect();
    return { x: (e.clientX - box.left) / this.scale, y: (e.clientY - box.top) / this.scale };
  }

  private onDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.element.setPointerCapture?.(e.pointerId);
    const p = this.local(e);
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
      // Touch and pen report 0; mouse uses the real button index.
      button: e.pointerType === 'mouse' ? e.button : 0,
    });
  };

  private onMove = (e: PointerEvent): void => {
    const hover = this.local(e);
    this.hoverX = hover.x;
    this.hoverY = hover.y;
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
    if (!pointer) return;
    e.preventDefault();
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

  /** Pointers not already grabbed by a widget. */
  free(): Pointer[] {
    return [...this.pointers.values()].filter((p) => p.claim === null);
  }

  byClaim(claim: string): Pointer[] {
    return [...this.pointers.values()].filter((p) => p.claim === claim);
  }

  /** Call at the very end of a frame. */
  endFrame(): void {
    this.releases = [];
    this.wheel = 0;
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

  /** True while any pointer started with this mouse button is still down. */
  isButtonHeld(button: number): boolean {
    for (const p of this.pointers.values()) {
      if (p.button === button) return true;
    }
    return false;
  }
}
