import { describe, expect, it } from 'vitest'
import { Rng } from './rng.js'

describe('Rng', () => {
  it('produces the same stream for the same seed', () => {
    const a = Array.from({ length: 20 }, () => new Rng(1607).next())
    const b = Array.from({ length: 20 }, () => new Rng(1607).next())
    expect(a).toEqual(b)
  })

  it('produces different streams for different seeds', () => {
    expect(new Rng(1).next()).not.toEqual(new Rng(2).next())
  })

  it('stays within range', () => {
    const rng = new Rng(42)
    for (let i = 0; i < 500; i++) {
      const value = rng.int(3, 7)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(7)
    }
  })

  it('resumes exactly from a serialized state', () => {
    const original = new Rng(99)
    original.next()
    original.next()
    const resumed = Rng.deserialize(original.serialize())
    expect(resumed.next()).toEqual(Rng.deserialize(original.serialize()).next())
  })
})
