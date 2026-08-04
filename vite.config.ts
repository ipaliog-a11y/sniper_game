import { createHash } from 'node:crypto';
import { type Plugin, defineConfig } from 'vite';

/**
 * Emits a service worker with the built filenames baked into it.
 *
 * Chrome will not offer to install a page on Android without one, and the
 * hashed asset names are only known once the bundle exists — so the worker is
 * generated here rather than hand-maintained and left to rot.
 */
function serviceWorker(): Plugin {
  return {
    name: 'cold-bore-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((name) => !name.endsWith('.map'))
        .map((name) => `./${name}`);
      // The shell and anything shipped from public/ rather than the bundle.
      // index.html is emitted by a later plugin, so it is never in `bundle`.
      const gear = [
        'ranger24',
        'fieldman4',
        'mk14',
        'trailhand260',
        'prs26',
        'qmarc',
        'aw300',
        'northlineprc',
        'lr338',
        'sentineltrg',
        'am50',
        'opt-duplex',
        'opt-mildot',
        'opt-sfp',
        'opt-tree',
        'opt-elite',
        'opt-horizon',
        'muz-none',
        'muz-brake',
        'muz-can',
        'muz-tuner',
      ].map((id) => `./gear/${id}.jpg`);
      const extras = [
        './',
        './index.html',
        './manifest.webmanifest',
        './icon-192.png',
        './icon-512.png',
        './icon-maskable-512.png',
        './apple-touch-icon.png',
        ...gear,
      ];
      const precache = [...new Set([...extras, ...assets])];
      // The cache name changes whenever the build does, which is what evicts
      // the previous version instead of serving it forever.
      const version = createHash('sha256')
        .update(precache.join('|'))
        .digest('hex')
        .slice(0, 12);

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: workerSource(version, precache),
      });
    },
  };
}

function workerSource(version: string, precache: string[]): string {
  return `/* Generated at build time. Do not edit. */
const CACHE = 'cold-bore-${version}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll rejects the whole batch if any single request fails, which would
      // leave the app permanently uninstallable, so each is added on its own.
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations come from the network first so a deployed update is picked up
  // on the next launch, and fall back to the cached shell when there is none.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./').then((hit) => hit || caches.match(request))),
    );
    return;
  }

  // Everything else is content-hashed, so the cache is always right.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
`;
}

export default defineConfig({
  // Relative, so the same build works at a domain root or under a project path
  // like /sniper_game/ on GitHub Pages.
  base: './',
  plugins: [serviceWorker()],
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
