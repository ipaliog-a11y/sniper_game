# Cold Bore

A precision rifle trainer for the browser. You do not move. You choose a rifle,
choose what hangs off it, choose what you load it with, read the weather, set
the turrets, aim with your finger, and break the shot. You are scored on where
the round lands and on how long you took to send it.

The ballistics underneath are real: a point-mass solver with G1/G7 drag, air
density from temperature, pressure and humidity, wind applied as relative
airflow, Coriolis, and gyroscopic spin drift. The numbers on the data card are
numbers you could take to a range.

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

## Playing

**Pick a stage.** Eight courses of fire, from confirming a zero at 150 m to a
plate at a mile. Each has fixed weather generated from a fixed seed, so a stage
plays the same way every time and can actually be practised.

**Read the brief.** Four tabs before the clock starts:

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

**Go hot.** Drag anywhere on the glass to aim; pinch to change magnification.
The hold wanders on its own — breathing, pulse, and whatever your support is not
doing for you. Hold **HOLD** to stop breathing, which quiets it for about eight
seconds and then makes it considerably worse. **FIRE** breaks the shot.

Six tools sit along the bottom while you shoot:

| Tool | What it does |
| --- | --- |
| **FIND** | Swings the rifle onto the next plate that is up. Press again to step along the line. |
| **WIND** | The weather station, live. The wind is still moving while you read it. |
| **CARD** | Your data card. |
| **DIAL** | The turrets, without leaving the rifle. |
| **SOLVE** | A firing solution for whatever is under the reticle — if you are carrying the kit to produce one. |
| **MIL** | Drag across a target to measure it in mils and turn that into a range. |

**FIND** exists because hunting for a 40 cm gong at 25x through a one-degree
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

## Scoring

Each plate is worth a hit, how centred that hit was, whether the *first* round
sent at it connected, and how quickly. First round hit percentage gets the
biggest number on the score card on purpose: it is the only statistic on there
that would matter anywhere outside a range.

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

```bash
npm test             # the maths, no browser needed
npm run dope         # print data cards for four loads, to eyeball by hand
```

The load-bearing tests check retained velocity against published trajectory
data. A 168 gr MatchKing quoted at G1 0.462 and a 140 gr ELD quoted at G7 0.315
both track the published numbers to within about one per cent out to 700 yards.
Everything else in the game rests on that.

See [DESIGN.md](DESIGN.md) for how the simulation is put together and what it
deliberately does not model.
