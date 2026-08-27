# Virginia Settlers

A settlement-building game for late elementary students (ages 9–11), set at
Jamestown between 1607 and 1622. In the tradition of *The Settlers* and *Anno*:
find and gather resources, run production chains, build a colony, and get it
through the winter — against the real history of the place.

Runs in the browser. No install, no accounts, no data collection.

## Running it

```bash
npm install
npm run dev        # play at the printed localhost address
npm test           # 47 tests across the simulation and content
npm run typecheck
npm run build
```

## What is here

**M0 — the machinery.**

- A **deterministic simulation** — seasons, labour, production chains, food,
  starvation, exposure, win and loss.
- A **generated map** of the James River peninsula, identical for every player
  of the same chapter.
- **Primary source cards** that stop the clock when one is revealed.
- A colony journal, save/load by action replay, and speed controls.

**M1 — the Powhatan.** The colony no longer feeds itself out of its own stores
and the river alone. Corn cannot be farmed; it comes from the towns, or it does
not come at all.

- Three **Powhatan towns** on the map — Paspahegh, Quiyoughcohanock and
  Werowocomoco — each with its own harvest, its own appetite, and its own view
  of the colony.
- A **relationship** from hostile to allied that sets the exchange rate and
  decides whether a town will deal at all.
- Three ways to get corn: **trade**, **give** (goodwill, no corn), and **take by
  force** (corn now, ruin later). A trading party is on the road for days, so
  winter has to be planned for.
- The towns' granaries fill at the autumn harvest and run down over the year.
  The chapter opens in high summer, at their leanest — which is the situation
  the settlers actually landed into.
- A new production chain to trade with: bog iron pit → forge → tools.

The chapter has several honest routes through and pins them all with tests
(see **Balance** below).

## Balance

Measured against the reference players in the test suite, for the same colony
and the same buildings:

| Fishing wharves | Trading honestly | Taking by force |
|---|---|---|
| 2 | 24 alive, none lost | 7 alive, **17 lost** |
| 3 | 24 alive, none lost | 15 alive, 9 lost |
| 4 | 24 alive, none lost | 20 alive, 4 lost |

Taking corn works on the day. What it costs is the trade the colony depends on
and, worse, the safety of the ground outside the palisade: colonists who cannot
leave the fort cannot fish. That is what the siege of 1609 did to Jamestown, and
it is why a colony that takes has to over-invest in fishing just to break even.

Building nothing at all still loses the colony by day 196. All of this is pinned
by tests, so a balance change that breaks it fails CI.

## Architecture

```
packages/
  content/   buildings, resources, missions and sources as validated JSON
  sim/       the rules — pure TypeScript, no DOM, no clock, no Math.random
  app/       React UI + a PixiJS map renderer
```

Two decisions carry the project:

**The simulation is headless and deterministic.** It never reads the clock or
an unseeded random number. A saved game is the scenario id plus the list of
commands the player issued, replayed from the start — so saves are tiny, a
student's bug report is exactly reproducible, and the rules can be tested
without a browser.

**Content is data, not code.** Every building, resource, scenario and source
card lives in `packages/content/data/*.json`, validated on load against a schema
that also cross-checks every id reference and refuses incoherent scenarios. A
new chapter is a data change. Balance lives in one file,
`packages/sim/src/balance.ts`.

## Authoring content

Add a building by adding an object to `packages/content/data/buildings.json`:

```json
{
  "id": "brick_kiln",
  "name": "Brick Kiln",
  "description": "Clay from the riverbank, fired into brick.",
  "cost": { "timber": 10 },
  "buildDays": 5,
  "workers": 2,
  "placement": { "terrain": ["clay"] },
  "production": { "inputs": { "timber": 2 }, "outputs": { "brick": 3 }, "intervalDays": 3 },
  "color": "#a8443a"
}
```

The loader will refuse it if `brick` is not a declared resource or `clay` is not
buildable terrain, and will say so by name. Run `npm test` after any content
change: the suite checks that scenarios stay coherent and winnable.

## On the history

The colonists did not arrive at an empty country. The Powhatan paramount
chiefdom — some thirty tribes and many thousands of people — was already there,
and Jamestown survived its first years largely on Powhatan corn.

The game is built so that this is a mechanic rather than a footnote. Corn cannot
be farmed by the player in the first chapter; it is what runs out. The source
cards put John Smith, George Percy and Wahunsenacawh in front of the player with
the question of who wrote a document and why, which is the historical-thinking
skill the curriculum is after. Later chapters make the trade relationship, and
the tobacco boom that wrecked it, into the central tension.

Aligned to Virginia SOL VS.3 and the C3 Framework. See [`docs/DESIGN.md`](docs/DESIGN.md).

## Roadmap

| | |
|---|---|
| **M0** | ✅ Walking skeleton: deterministic sim, content pipeline, playable chapter |
| **M1** | Powhatan trade and relationship; playtest with actual 4th graders |
| **M2** | Missions and chapter goals as authored content |
| **M3** | Chapters 1–3, council decisions, tobacco and soil exhaustion |
| **M4** | Accessibility, Chromebook performance pass, teacher guide |
