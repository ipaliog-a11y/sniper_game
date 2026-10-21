/**
 * The save-slot flow, driven through a real browser.
 *
 * Slots are the one part of the game that can destroy something a player
 * cannot get back, and every guard on them lives in the scene rather than in
 * the core — so none of it is reachable from the headless core tests. This
 * walks the picker and asserts what each tap did to storage.
 *
 * Build and serve first, then run it:
 *   npm run build && npx serve -s dist -l 4173
 *   node tools/slotflow.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(fileURLToPath(new URL('../package.json', import.meta.url)));
const { chromium } = require('playwright');
const DIR = process.env.SHOT_DIR ?? '.';
const b = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH
    ? { executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` }
    : {},
);
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
let bad = 0;
p.on('pageerror', e => { console.log('PAGEERROR', e.message); bad++; });
await p.goto(process.env.URL ?? 'http://localhost:4173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.evaluate(() => localStorage.setItem('coldbore.profile.v1', JSON.stringify({ credits: 7400, records: { zero: { cleared: true, attempts: 3, bestFraction: 0.8 }, ranging: { cleared: true, attempts: 2, bestFraction: 0.7 } } })));
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
const box = await p.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const px = async (x, y, ms = 750) => { await p.mouse.click(box.x + x, box.y + y); await p.waitForTimeout(ms); };
const shot = (n) =>
  process.env.SHOT_DIR ? p.screenshot({ path: `${DIR}/slot-${n}.png` }) : Promise.resolve();
const state = () => p.evaluate(() => ({
  active: JSON.parse(localStorage.getItem('coldbore.slots.v1') || '{}').active ?? 0,
  s1: JSON.parse(localStorage.getItem('coldbore.profile.v1') || 'null')?.credits ?? null,
  s2: JSON.parse(localStorage.getItem('coldbore.slot.v1.2') || 'null')?.credits ?? null,
  s3: JSON.parse(localStorage.getItem('coldbore.slot.v1.3') || 'null')?.credits ?? null,
}));
// Button centres, derived from the scene's own layout maths.
const CARD = [149, 270, 391];
const COL = [79, 195, 311];
const SAVES = [195, 633];
const expect = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}  ${JSON.stringify(got)}${ok ? '' : ` want ${JSON.stringify(want)}`}`);
  if (!ok) bad++;
};

await px(...SAVES);
expect('opening SAVES does not disturb anything', await state(), { active: 0, s1: 7400, s2: null, s3: null });

await px(COL[0], CARD[1]);                       // slot 2 START
expect('switching to slot 2 keeps slot 1', await state(), { active: 1, s1: 7400, s2: 1200, s3: null });

await px(...SAVES);
await px(COL[1], CARD[1]);                       // slot 2 COPY
await shot('copy-armed');
await px(COL[1], CARD[2]);                       // into empty slot 3 — goes straight through
expect('copy into an empty slot needs one tap', await state(), { active: 1, s1: 7400, s2: 1200, s3: 1200 });

await px(COL[1], CARD[1]);                       // slot 2 COPY again
await px(COL[1], CARD[0]);                       // aim at slot 1, which has a career
expect('copy over a career does not fire on the first tap', await state(), { active: 1, s1: 7400, s2: 1200, s3: 1200 });
await shot('copy-confirm');
await px(COL[1], CARD[0]);                       // confirm
expect('and does on the second', await state(), { active: 1, s1: 1200, s2: 1200, s3: 1200 });

await px(COL[2], CARD[2]);                       // slot 3 WIPE
expect('wipe does not fire on the first tap', await state(), { active: 1, s1: 1200, s2: 1200, s3: 1200 });
await px(COL[2], CARD[2]);                       // confirm
expect('and does on the second', await state(), { active: 1, s1: 1200, s2: 1200, s3: null });

await px(COL[2], CARD[1]);                       // WIPE on the slot in use — must be disabled
expect('the slot in use cannot be wiped', await state(), { active: 1, s1: 1200, s2: 1200, s3: null });
await shot('final');
console.log(bad === 0 ? '\nSLOT FLOW OK' : `\n${bad} FAILURES`);
await b.close();
if (bad > 0) process.exit(1);
