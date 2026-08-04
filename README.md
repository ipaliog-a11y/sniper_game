# Cold Bore

A precision rifle trainer for the browser. You do not move. You choose a rifle,
choose what hangs off it, choose what you load it with, read the weather, set
the turrets, aim, and break the shot. You are scored on where the round lands —
and, as a bonus, on first-round hits and how quickly you sent them.

The ballistics underneath are real: a point-mass solver with G1/G7 drag, air
density from temperature, pressure and humidity, wind applied as relative
airflow, Coriolis, and gyroscopic spin drift. The numbers on the data card are
numbers you could take to a range.

**Live:** [ipaliog-a11y.github.io/sniper_game](https://ipaliog-a11y.github.io/sniper_game/)

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

Build for production:

```bash
npm run build        # typechecks, then emits dist/
npm run preview
```

```bash
npm test             # the maths, no browser needed
npm run dope         # print data cards for four loads, to eyeball by hand
```

---

## Progress so far

What is already in the game and shipping on GitHub Pages.

### Simulation
- Point-mass ballistics with **G1 / G7** drag tables
- Atmosphere from temp / pressure / humidity → density altitude
- Wind as relative airflow (not a sideways fudge), Coriolis, spin drift
- Data cards and DOPE interpolation that match published retained velocities
  (~1% on validation loads)
- Cold-bore / barrel heat, cant, scope glass (SFP vs FFP subtension)

### Course of fire
- **Eight stages** from 150 m zeroing plates to a mile steel
- Fixed weather seeds so stages can be practised
- Static plates, timed exposures, movers, altitude, storm, and mile courses
- Stage unlocks driven by best score fraction on the previous stage

### Kit & economy
- Rifles, cartridges, and attachments (scopes, bipods, meters, solvers, …)
- Credits from stage payouts; gear that actually changes what you can know
- Loadout constraints (weight / slots) so you cannot carry everything

### UI & controls
- Full shoot UI: scope glass, reticle, wind flags, bullet trace / TOF
- Tools: FIND, WIND, CARD, DIAL, SOLVE, MIL
- **Touch** (drag aim, pinch zoom, HOLD + FIRE buttons) and **mouse**
  (wheel zoom, RMB breath hold, LMB or **Space** to fire — including while
  holding breath)
- Control mode toggle in settings
- **Tutorial** as stage 00 in Course of Fire (optional; Cold Bore stays open)
- **Glossary** (menu + settings) for mils, DOPE, grades, kit terms
- Result card: unlock feedback, next-grade tip, hit / first-round / speed breakdown
- Turret panel **0** button between − and + (mechanical zero)
- Toolbar **Find next**; mouse **Space** to fire
- Practice / assist modes (practice is **timeless**: full speed points, no
  stage clock-out)

### Scoring (revised)
Hits dominate. First-round and speed are bonuses that separate grades, not a
second gate on “did you pass?”

| Piece | Role |
| --- | --- |
| **Hit base** | Bulk of the points for any hit |
| **Centre quality** | Modest polish (soft curve — rim hits still pay) |
| **First-round bonus** | Rewards clean engagement |
| **Speed bonus** | Rewards par-time work; full in practice mode |

Grades: Unqualified → Qualified → Marksman → Sharpshooter → Expert →
Distinguished. Stage 2 unlocks at roughly **Qualified** on stage 1; later
unlocks ramp up. Cold Bore plates are sized for learning the card, not
micro-gongs on day one.

### Localisation
- English and **Greek** UI (including catalog rifle/accessory blurbs)
- Locale switch; shipped via GitHub Actions → Pages

### Distribution
- Vite + TypeScript, zero runtime dependencies
- PWA (installable, offline-capable once cached)
- GitHub Actions deploys `dist/` to Pages

---

## Playing

**Pick a stage.** Eight courses of fire, from confirming a zero at 150 m to a
plate at a mile. Each has fixed weather generated from a fixed seed, so a stage
plays the same way every time and can actually be practised.

**Read the brief.** Tabs before the clock starts:

- **Weather** — temperature, pressure, humidity and density altitude, plus what
  every flag on the range is doing and a thirty-second strip chart of the
  crosswind. Without a weather meter fitted the numbers are a rounded guess with
  an error you cannot re-read your way out of.
- **Data card** — elevation and wind hold for every hundred metres, worked out
  for standard air. It tells you where the load goes transonic, which is where
  the groups start opening up on their own.
- **Turrets** — dial elevation and windage, set magnification and parallax.
  The panel tells you what range the current elevation corresponds to, which is
  how you catch a turret you turned the wrong way.

**Go hot.**

| Mode | Aim | Zoom | Breath | Fire |
| --- | --- | --- | --- | --- |
| **Touch** | Drag the glass | Pinch | HOLD button | FIRE button |
| **Mouse** | Move / drag | Wheel | Right mouse button | Left mouse button |

The hold wanders on its own — breathing, pulse, and whatever your support is not
doing for you. Holding breath quiets it for about eight seconds and then makes
it worse. On mouse you can **fire while still holding RMB** (left click edges
while right is down).

Six tools sit along the bottom while you shoot:

| Tool | What it does |
| --- | --- |
| **FIND** | Swings the rifle onto the next plate that is up. Press again to step along the line. |
| **WIND** | The weather station, live. The wind is still moving while you read it. |
| **CARD** | Your data card. |
| **DIAL** | The turrets, without leaving the rifle. |
| **SOLVE** | A firing solution for whatever is under the reticle — if you are carrying the kit to produce one. |
| **MIL** | Drag across a target to measure it in mils and turn that into a range. |

**FIND** exists because hunting for a 40 cm gong at 25× through a one-degree
field of view is not the skill this is trying to teach. The clock keeps running
while the rifle swings, so it is convenience rather than a free pass.

**EXIT**, top left, walks off the stage and back to the menu. It asks twice,
because leaving mid-string throws the run away.

Watch the trace. A bullet at 1100 m takes nearly two seconds to get there, and
the sound of it hitting steel takes another three to come home.

## What the kit actually does

The three gear pockets are the sharp end of the game, because between them a
rangefinder, a weather meter and a ballistic solver will do all of your thinking
— and you cannot carry all of them and a spotting scope too.

- **No rangefinder** — you mil the target off the reticle and divide.
- **No weather meter** — the atmosphere is an estimate, and it is wrong.
- **No solver** — you read the card and correct it for the day yourself.
- **No anti-cant level** — you cannot see that the rifle is rolled over, and at
  distance a canted rifle throws sideways.
- **No spotting scope** — you will lose the splash on a clean miss and get no
  correction at all.

Second focal plane glass is cheap for the magnification, and its reticle only
subtends true mils at one setting. Ranging off it at half power gives an answer
exactly double what it should be.

## Installing it on a phone

The build is a progressive web app, so Chrome on Android will install it to the
home screen and run it fullscreen with no browser chrome. It works with no
signal once installed — everything is cached, and there is nothing to talk to a
server about anyway.

It needs to be served over HTTPS from a real origin, which the included GitHub
Actions workflow does for free:

1. In the repository, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
2. Merge this branch to `main`, or run **Actions → Deploy to GitHub Pages →
   Run workflow** and pick the branch.
3. Open the published URL — `https://<owner>.github.io/sniper_game/` — in
   Chrome on Android.
4. Menu (⋮) → **Add to Home screen** / **Install app**. Chrome usually offers
   it on its own after a few seconds.

On iOS the same page installs from Safari via **Share → Add to Home Screen**,
though iOS gives it a bit less than Android does.

Any static host works — Netlify, Cloudflare Pages, an S3 bucket. The build uses
relative paths, so it runs at a domain root or under a project path without
being reconfigured.

## Tests

The load-bearing tests check retained velocity against published trajectory
data. A 168 gr MatchKing quoted at G1 0.462 and a 140 gr ELD quoted at G7 0.315
both track the published numbers to within about one per cent out to 700 yards.
Everything else in the game rests on that.

See [DESIGN.md](DESIGN.md) for how the simulation is put together and what it
deliberately does not model.

---

## Roadmap

Rough priority order. Nothing here is scheduled; items move as playtesting
dictates.

### Near term — feel & fairness
- [x] Result screen: unlock gate, next grade, and score breakdown (hit / 1st / speed)
- [x] Tutorial string from the main menu (three calm plates, no unlock pressure)
- [x] Mouse: Spacebar fires (works while right-holding breath)
- [ ] Playtest scoring after the hit-first rebalance; tune grades / unlocks if
      still tight or too soft
- [ ] HUD: show remaining time more calmly in practice (∞) vs ranked
- [ ] Spotter call / miss correction polish (readability in Greek + English)
- [ ] Audio levels and optional mute categories (wind vs shot vs UI)

### Content
- [ ] **Target variety** — larger “steel challenge” plates, reactive targets,
      partial-value zones (head/torso scoring on silhouettes that matter more)
- [ ] Extra coach prompts mid-tutorial (optional step callouts)
- [ ] More rifles / loads / glass in the armoury (still zero-runtime catalog)
- [ ] Optional stage modifiers (mirage heavy, night/low light, gustier seed)

### Controls & platform
- [x] Spacebar fire in mouse mode (alongside left-click)
- [ ] Keyboard assist for desktop (e.g. hold key, find, dial nudges)
- [ ] Gamepad / controller mapping for living-room play
- [ ] Better touch targets and safe-area handling on notched phones
- [ ] Verify PWA install + offline cache after each Pages deploy

### Progression & meta
- [ ] Career stats: best FRH%, mean radial, stage history charts
- [ ] Medals / ribbons for Distinguished clears and clean first-round stages
- [ ] Soft daily / weekly challenge (fixed seed of the day)
- [ ] Export / import profile (local JSON) for device swaps

### Simulation depth (only if it teaches something)
- [ ] Mirage as a readable wind cue, not only atmosphere noise
- [ ] More honest range estimation feedback when mil-ranging wrong size
- [ ] Optional “true range” coach after the shot in assist mode
- [ ] Keep refusing features that break the “numbers mean the same on a range”
      rule — see DESIGN.md

### Polish & distribution
- [ ] More complete Greek (and room for a third language)
- [ ] Performance pass on low-end Android (scope redraw, tracer, weather)
- [ ] Accessibility: contrast, focus order, reduce-motion option
- [ ] Short trailer / store-style screenshots for the Pages landing

### Explicitly not on the roadmap (for now)
- Multiplayer / leaderboards that need a server
- Photoreal 3D world (2D scope trainer stays the product)
- Ballistic solver that secretly cheats the player’s kit rules

---

## Contributing notes

- Core maths and geometry live under `src/core/`; UI under `src/ui/` and
  `src/scenes/`.
- Prefer fixing the model over papering over it in the view.
- Run `npm test` and `npm run typecheck` before pushing; Pages builds from
  `main` via Actions.
