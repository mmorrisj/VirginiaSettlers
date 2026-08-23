# Design

## What the game is

A settlement builder in the genre of *The Settlers* and *Anno*, scoped to one
colony, one river and four seasons, played in sessions of about 45 minutes.
Chapters, not an open sandbox.

The win condition of a chapter is **survive the winter and meet the council's
goal**, never "maximise a score". Failure is recoverable and instructive: the
Starving Time is the lesson, not a game over screen.

## Why Jamestown

- It maps directly onto **Virginia SOL VS.3** (grade 4 Virginia Studies), so a
  teacher can drop it into a unit that already exists.
- The documentary record is unusually rich and unusually contradictory, which
  makes it ideal for teaching that sources have authors with motives.
- The colony's dependence on the Powhatan is not a subplot. It is the reason
  anyone survived, and it drives the conflict that follows.

## The design decision the rest hangs on

The obvious version of a colonial building game — empty land, gather, expand —
is bad history and a worse game. The Powhatan paramount chiefdom was already
there, and Jamestown ate its corn.

So the relationship is a mechanic:

- **Corn cannot be farmed by the player in Chapter 1.** It is the store that
  runs out. Getting more means trade, and trade means offering something the
  Powhatan actually want and behaving in a way that keeps the relationship
  alive.
- **Tobacco is the trap.** It is the cash crop that makes the colony rich,
  exhausts the soil in a few seasons, and forces expansion onto Powhatan land.
  The player should feel the causal chain that led to 1622 rather than read
  about it.
- Every faction has stated goals and a point of view.

This is better history and a better game: it produces real tension instead of a
resource treadmill.

## Chapters

| Chapter | Year | The problem |
|---|---|---|
| 1. The Landing | 1607 | Survive the first winter on what you brought and what you can catch |
| 2. The Starving Time | 1609–10 | The relationship has broken down; the store is empty |
| 3. The Tobacco Boom | 1614–22 | Prosperity that consumes soil and land |

## Educational layer

- **Source cards.** Completing a building reveals a short real document. The
  card carries the excerpt, who wrote it, the context, and a question about the
  author's motive. The clock stops until it is read.
- **Council decisions.** Periodic dilemmas with no clean answer, followed by a
  card on what actually happened. This is where the assessment value lives.
- **Colony journal.** An exportable log a teacher can grade.

## Constraints

- **Browser, no install.** Schools run Chromebooks.
- **No accounts, no telemetry.** Collecting data on under-13s drags in COPPA.
  Saves live in `localStorage` plus an exportable code.
- **Readable on a projector.** Large type, strong contrast, keyboard reachable.

## Simulation model

One tick is one day. A stylised 360-day year: twelve 30-day months, four 90-day
seasons — real calendars add complexity a ten-year-old gains nothing from
tracking, while the seasonal cycle is what the game is about.

Each day, in order: assign labour (construction first), advance construction,
run production, feed the colony, apply exposure, resolve the outcome.

Determinism is a hard rule. No `Date.now()`, no `Math.random()`, integer-only
progress arithmetic. A scenario seed produces the same colony for every student
in a classroom, and a save file is a replayable command log.

## Balance targets for Chapter 1

24 colonists eat 12 food per day. Measured against the reference player in the
test suite:

| Wharves built | Outcome |
|---|---|
| 1 | Colony lost, day 196 |
| 2–3 | Survives, 8–9 dead |
| 4+ | Survives intact |

Failure, costly survival and mastery are all reachable. These numbers are locked
in by tests, so a balance change that makes the chapter unwinnable fails CI.
