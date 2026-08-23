/**
 * A small, fast, seeded PRNG (mulberry32). The simulation must never touch
 * Math.random or the clock: a scenario seed has to produce the same colony for
 * every student, and saved games are replayed from an action log.
 */
export class Rng {
  private state: number

  constructor(seed: number) {
    // Force to a 32-bit integer so that any incoming seed behaves identically.
    this.state = seed >>> 0
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  /** Snapshot of internal state, so a save file can resume mid-stream. */
  serialize(): number {
    return this.state
  }

  static deserialize(state: number): Rng {
    const rng = new Rng(0)
    rng.state = state >>> 0
    return rng
  }
}
