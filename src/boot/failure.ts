/**
 * The failure screen.
 *
 * Deliberately imports nothing. If a module in the game's own graph throws
 * while it is being evaluated, every other module is unavailable — including
 * the canvas, the renderer and the string table — so the one thing that can
 * still speak has to stand entirely on its own. Plain DOM, hardcoded strings,
 * no dependencies.
 *
 * It exists because the alternative is the loading card sitting there forever,
 * which tells nobody anything.
 */

const PROFILE_KEY = 'coldbore.profile.v1';

/** Set by the inline snippet in index.html, which runs before any module. */
declare global {
  interface Window {
    __coldBoreEarlyError?: unknown;
  }
}

type Phase = 'boot' | 'running';

interface Copy {
  eyebrow: string;
  bootTitle: string;
  runningTitle: string;
  blurb: string;
  reset: string;
  resetNote: string;
  copy: string;
  copied: string;
  reload: string;
}

const COPY: Record<'en' | 'el', Copy> = {
  en: {
    eyebrow: 'COLD BORE',
    bootTitle: 'It did not start.',
    runningTitle: 'It stopped.',
    blurb:
      'Something went wrong. The detail below is the useful part — copy it if you are reporting this.',
    reset: 'Clear everything and reload',
    resetNote:
      'Clears the offline cache and your saved progress. This is what fixes a half-downloaded install.',
    copy: 'Copy details',
    copied: 'Copied',
    reload: 'Just reload',
  },
  el: {
    eyebrow: 'COLD BORE',
    bootTitle: 'Δεν ξεκίνησε.',
    runningTitle: 'Σταμάτησε.',
    blurb:
      'Κάτι πήγε στραβά. Οι λεπτομέρειες πιο κάτω είναι το χρήσιμο κομμάτι — αντίγραψέ τις αν το αναφέρεις.',
    reset: 'Καθαρισμός όλων και επαναφόρτωση',
    resetNote:
      'Καθαρίζει την προσωρινή μνήμη και την αποθηκευμένη πρόοδο. Αυτό διορθώνει μια μισοκατεβασμένη εγκατάσταση.',
    copy: 'Αντιγραφή λεπτομερειών',
    copied: 'Αντιγράφηκε',
    reload: 'Απλή επαναφόρτωση',
  },
};

/**
 * Which language to apologise in. Read straight out of the saved profile rather
 * than through the settings module, because the settings module may be exactly
 * what failed to load.
 */
function pickCopy(): Copy {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const lang = (JSON.parse(raw) as { settings?: { language?: unknown } })?.settings?.language;
      if (lang === 'el' || lang === 'en') return COPY[lang];
    }
  } catch {
    // No storage, or nothing saved yet. Fall through to the browser's own idea.
  }
  try {
    if (navigator.language.toLowerCase().startsWith('el')) return COPY.el;
  } catch {
    // Ancient or locked-down browser. English it is.
  }
  return COPY.en;
}

/** Wipe every trace of the app: caches, service worker, saved profile. */
export async function hardReset(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch {
    // Nothing registered, or the browser will not allow it.
  }
  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch {
    // Same.
  }
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Storage is off, so there was nothing saved to lose.
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.stack && error.stack.includes(error.message)
      ? error.stack
      : `${error.message}\n\n${error.stack ?? ''}`.trim();
  }
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

/** Context a reader cannot get at but a reporter always wants. */
function footprint(): string {
  const parts: string[] = [];
  try {
    parts.push(location.href);
  } catch {
    /* ignore */
  }
  try {
    parts.push(navigator.userAgent);
  } catch {
    /* ignore */
  }
  try {
    parts.push(`${screen.width}x${screen.height} @${devicePixelRatio}x`);
  } catch {
    /* ignore */
  }
  const standalone =
    typeof matchMedia === 'function' && matchMedia('(display-mode: fullscreen)').matches;
  parts.push(standalone ? 'installed app' : 'browser tab');
  return parts.join('\n');
}

let shown = false;

function button(label: string, primary: boolean): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.style.cssText = [
    'font:600 13px/1 ui-monospace,"SF Mono",Menlo,Consolas,monospace',
    'border-radius:6px',
    'padding:13px 18px',
    'cursor:pointer',
    'border:1px solid ' + (primary ? '#e8a33d' : '#2b3a33'),
    'background:' + (primary ? '#e8a33d' : 'transparent'),
    'color:' + (primary ? '#0d1210' : '#dbe5de'),
  ].join(';');
  return el;
}

/**
 * Paint the failure. First error wins — a crash often cascades, and six stacked
 * panels help nobody.
 */
export function showFailure(error: unknown, phase: Phase = 'running'): void {
  if (shown) return;
  shown = true;

  const copy = pickCopy();
  const detail = `${describe(error)}\n\n---\n${footprint()}`;

  const panel = document.createElement('div');
  panel.setAttribute('role', 'alert');
  panel.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'overflow:auto',
    'padding:24px',
    'background:#0d1210',
    'color:#dbe5de',
    'font:13px/1.6 ui-monospace,"SF Mono",Menlo,Consolas,monospace',
    '-webkit-user-select:text',
    'user-select:text',
  ].join(';');

  const inner = document.createElement('div');
  inner.style.cssText = 'max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:14px';

  const eyebrow = document.createElement('div');
  eyebrow.textContent = copy.eyebrow;
  eyebrow.style.cssText = 'color:#e8a33d;letter-spacing:0.3em;font-size:11px';

  const title = document.createElement('h1');
  title.textContent = phase === 'boot' ? copy.bootTitle : copy.runningTitle;
  title.style.cssText = 'font:600 20px/1.3 inherit;margin:0';

  const blurb = document.createElement('p');
  blurb.textContent = copy.blurb;
  blurb.style.cssText = 'color:#8b998f;margin:0';

  const pre = document.createElement('pre');
  pre.textContent = detail;
  pre.style.cssText = [
    'white-space:pre-wrap',
    'word-break:break-word',
    'background:#151d19',
    'border:1px solid #2b3a33',
    'border-radius:6px',
    'padding:12px',
    'margin:0',
    'color:#e0705f',
    'max-height:45vh',
    'overflow:auto',
  ].join(';');

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px';

  const resetBtn = button(copy.reset, true);
  resetBtn.addEventListener('click', () => {
    resetBtn.disabled = true;
    void hardReset().then(() => window.location.reload());
  });

  const copyBtn = button(copy.copy, false);
  copyBtn.addEventListener('click', () => {
    const done = (): void => {
      copyBtn.textContent = copy.copied;
    };
    try {
      void navigator.clipboard.writeText(detail).then(done, () => {
        // No clipboard permission: select it so a long-press can copy instead.
        const range = document.createRange();
        range.selectNodeContents(pre);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(range);
      });
    } catch {
      /* ignore */
    }
  });

  const reloadBtn = button(copy.reload, false);
  reloadBtn.addEventListener('click', () => window.location.reload());

  const note = document.createElement('p');
  note.textContent = copy.resetNote;
  note.style.cssText = 'color:#5d6b62;margin:0;font-size:11px';

  row.append(resetBtn, copyBtn, reloadBtn);
  inner.append(eyebrow, title, blurb, pre, row, note);
  panel.append(inner);

  // The body may not exist yet if this fires very early.
  (document.body ?? document.documentElement).append(panel);
  document.getElementById('boot')?.remove();
}

/**
 * Catch anything that escapes. Called as early as the module graph allows; the
 * inline snippet in index.html covers the window before even that.
 */
export function installFailureHandlers(): void {
  window.addEventListener('error', (e) => showFailure(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => showFailure(e.reason));

  // An error thrown while the bundle was still evaluating was recorded by the
  // inline snippet before any of this existed.
  if (window.__coldBoreEarlyError !== undefined) {
    showFailure(window.__coldBoreEarlyError, 'boot');
  }
}
