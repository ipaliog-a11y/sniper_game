# Design notes

How the simulation is put together, why it is put together that way, and what it
deliberately does not model.

## The one rule

Every number the player sees has to be a number that would mean the same thing
on a real range. A mil-dot has to cover exactly one mil of target, or ranging
off it is a lie and the ranging stage teaches a wrong habit. That constraint
drives more of the architecture than anything else.

---

## Ballistics

`src/core/ballistics.ts` integrates a point mass ("3-DOF") through real air with
RK4 at a fixed step — 3 ms while the solver is searching, 0.8 ms for the shot
the player actually takes.

Forces on the bullet:

- **Gravity**, 9.80665 m/s².
- **Drag**, against the *wind-relative* velocity. Applying wind this way rather
  than as a sideways fudge is what makes a headwind produce a small vertical
  change and a tailwind the opposite, for free.
- **Coriolis**, from the Earth's rotation vector expressed in the shooter's
  local frame. In the northern hemisphere every shot walks right; firing east
  lifts the bullet and firing west drops it.

**Gyroscopic drift** is added afterwards as a closed-form correction rather than
being integrated, because a point-mass model has no spin to work with. Litz's
fit against the Miller stability factor is used: `1.25 × (SG + 1.2) × tof^1.83`
inches. That is how every field solver does it.

### Drag

`src/core/drag.ts` holds the G1 and G7 drag functions as coefficient against
Mach for the reference projectile, which is defined as one pound and one inch
across. That definition is what lets a ballistic coefficient quoted in lb/in²
divide straight into the drag:

```
a = ρ · v² · Cd_ref(M) · π / (8 · BC)
```

with `BC` converted to kg/m². The derivation is just `BC = m / (i · d²)` and
`Cd_bullet = i · Cd_ref` substituted into `½ρv²Cd·A/m`.

Both curves are resampled onto an even Mach grid at load time so the inner loop
does an index and a lerp instead of a binary search. The solver evaluates drag a
couple of million times to build one data card.

### Why G7 matters

A ballistic coefficient is meaningless without the reference shape it was
measured against. G1 is the old flat-based standard bullet; G7 is the
boat-tailed long-range shape modern match bullets actually resemble. Quoting a
G1 BC for a VLD bullet is why published drop charts fall apart past 600 m, and
the game models both so that difference can be felt.

### Validation

`tests/core.test.mjs` checks retained velocity against published trajectory data
for two loads quoted against different drag models:

| Load | 100 yd | 300 yd | 500 yd | 1000 yd |
| --- | --- | --- | --- | --- |
| 168 gr SMK, G1 0.462, 2700 fps | 2511 / 2513 | 2152 / 2160 | 1821 / 1834 | 1182 / 1180 |
| 140 gr ELD, G7 0.315, 2710 fps | 2572 / 2569 | 2304 / 2299 | 2048 / 2049 | 1466 / 1500 |

(model / published). Two independent BC-and-model pairs landing within about one
per cent is the strongest evidence available that the drag constant is right.

`npm run dope` prints full data cards for four loads if you want to check them
against a solver you trust.

## Atmosphere

`src/core/atmosphere.ts` derives air density from temperature, station pressure
and humidity separately, because that is how a shooter reads them off a meter —
even though density is the only thing the bullet cares about. Humid air comes
out *lighter* than dry air at the same pressure, which surprises people who
expect a muggy day to be thick: water vapour is lighter than the nitrogen it
displaces.

Speed of sound is temperature-dependent, so on a cold day a bullet is at a
higher Mach for the same muzzle velocity and drags harder — on top of the cold
air being denser.

Density altitude folds all three into one number, which is why it is the figure
that ends up written on a data card.

## Wind

This is the part that makes the game hard, and it is deliberately built so that
one number is never enough.

`src/core/weather.ts` generates a **wind field**: several zones down the range,
each with its own base speed, direction and volatility, and each swinging on
three sine components at unrelated periods so it lulls and gusts without ever
quite repeating. Zones further downrange drift further off the firing point's
wind, because terrain bends wind.

For a shot, the zones the bullet passes are collapsed into one effective vector,
**weighted toward the muzzle**. A bullet deflected early has the whole rest of
its flight to travel sideways off that heading, so the first third of the range
does most of the damage. Shooters call this wind weighting, and it is why the
flag at your elbow matters more than the one at the target. There is a test for
it.

Everything is deterministic in the stage clock, which means the strip chart in
the weather panel is a genuine record rather than a decoration, and waiting for
a lull is a real decision rather than a dice roll.

## Optics and the projection

`src/ui/scopeView.ts` renders the scope picture as a pure **angular
projection**. Every object is placed by its azimuth and elevation relative to
the optical axis and scaled by pixels-per-radian at the current magnification.
Nothing is drawn in a "world space" that is then projected; there is no world
space. That is the only way a mil-dot can be trusted to cover one mil.

Consequences that fall out for free:

- Aiming is geared per radian, so higher magnification is automatically finer.
- Field of view shrinks proportionally with magnification.
- **Second focal plane** reticles are handled by a single scale factor. Their
  subtension is only true at one magnification, and the mil-ranging tool uses
  the same factor, so ranging off SFP glass at half power really does give an
  answer twice what it should be.
- Rifle cant rotates the world, not the reticle, because the reticle is bolted
  to the rifle.

The ground is drawn as distance bands on a flat floor seen from a firing
position some metres above it. The compression toward the horizon is true
perspective rather than a painted backdrop, which is exactly why judging
distance by eye past 600 m does not work.

## The shot

`src/core/shot.ts` puts together everything the shooter did and everything they
had no say in.

What they did: where the reticle actually was when the trigger broke (commanded
aim plus sway), what is on the turrets, how level the rifle is.

What they did not: this round's muzzle velocity drawn against the load's
velocity SD, the rifle's own cone of fire, a barrel that walks as it heats, and
a **cold bore** offset applied only to the first round of a stage. The cold bore
throw is fixed per rifle rather than random per shot, so it can be learned —
which is the whole point of the exercise, and where the game gets its name.

On a mover, the impact is scored against where the target *is when the bullet
arrives*, not where it was at the break. At 700 m that difference is most of a
metre of lead.

## The hold

Sway is three sine components — two slow ones for the wander and a fast small
one for the pulse — with an amplitude set by the rifle's mass, the support
fitted, and how much air the shooter has left. Holding your breath cuts it to
about a quarter for roughly eight seconds and then makes it rapidly worse. The
hold also tightens over the first couple of seconds behind the rifle, which is
what a bipod's set-up time is buying.

Cant creeps in on its own and is invisible without an anti-cant level fitted.

## Scoring

`src/core/scoring.ts`. A trainer that scored only accuracy would teach you to
take four minutes over every shot; one that scored only speed would teach you to
spray. So each plate is worth:

- a base for hitting it at all, plus a bonus for how centred,
- a **first round** bonus, because in the field there is rarely a second one,
- a speed bonus that decays to nothing at twice par but never turns a hit into a
  zero.

## What is not modelled

Stated plainly, because a trainer that quietly fakes things is worse than one
that admits its limits:

- **Aerodynamic jump** — the small vertical deflection a crosswind induces.
  Real, deterministic, and left out to keep the wind model to one lever.
- **Vertical wind and terrain-induced updraught.** Wind is horizontal.
- **Wind that changes during the flight.** The effective wind is frozen at the
  trigger break, which is a very good approximation at a two-second time of
  flight and a poor one at five.
- **Transonic instability.** The model tells you when a bullet has dropped
  through Mach 1.2 and the game warns you, but the point-mass solver keeps
  flying it as though nothing happened. In reality that is where groups open up
  unpredictably, and no point-mass model predicts it.
- **Powder temperature history**, barrel fouling, and bullet-to-bullet BC
  variation.
- **Mirage-induced apparent target displacement.** The mirage is drawn and reads
  as a wind gauge, but it does not move where the target appears to be.

## Shipping it

`vite.config.ts` carries a small plugin that writes the service worker at build
time with the hashed asset filenames baked into it, and a cache name derived
from that list — so a new deploy evicts the old one instead of serving it
forever. Navigations go to the network first and fall back to the cached shell;
everything else is content-hashed and comes from the cache.

Hand-rolling that rather than pulling in Workbox keeps the project at three dev
dependencies and no runtime ones, which is the same reason the audio is
synthesised and there are no image assets outside the app icons.

## Layout

```
src/core/          the simulation. No DOM, no canvas, all unit-testable.
  units.ts         MOA, mils, the mil relation, and every imperial conversion
  atmosphere.ts    density, speed of sound, density altitude
  drag.ts          G1 and G7 tables
  ballistics.ts    the integrator and the firing solution solver
  catalog/         rifles, cartridges, optics, muzzle devices, support, gear
  loadout.ts       resolves a kit selection into the numbers the sim consumes
  weather.ts       the wind field and the atmosphere for a stage
  scope.ts         turrets, travel, reticle geometry, the data card
  range.ts         targets, shapes, hit scoring, the eight stages
  shot.ts          resolving one round
  session.ts       one trip to the range
  scoring.ts       what a stage was worth
  store.ts         what survives a refresh

src/ui/            canvas, input, and drawing. Knows about the core; not vice versa.
  app.ts           canvas, scene stack, frame loop
  input.ts         mouse and touch as one thing
  ui.ts            immediate-mode widgets
  scopeView.ts     the angular projection and everything drawn through it
  panels.ts        weather station, data card, turrets, firing solution
  audio.ts         synthesised report, steel, bolt. No files.

src/scenes/        one file per screen
```

The core never imports from the UI. Every physical quantity inside it is SI;
imperial exists only at the edges, because that is how shooters talk.
