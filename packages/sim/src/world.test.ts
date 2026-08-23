import { describe, expect, it } from 'vitest'
import { content } from '@vs/content'
import { Rng } from './rng.js'
import { generateWorld, neighbours, terrainAt } from './world.js'

const scenario = content.scenarios.get('jamestown_1607')!

describe('generateWorld', () => {
  it('produces an identical map for the same seed', () => {
    const a = generateWorld(scenario, new Rng(scenario.seed))
    const b = generateWorld(scenario, new Rng(scenario.seed))
    expect(a.tiles).toEqual(b.tiles)
  })

  it('produces a different map for a different seed', () => {
    const a = generateWorld(scenario, new Rng(scenario.seed))
    const b = generateWorld(scenario, new Rng(scenario.seed + 1))
    expect(a.tiles).not.toEqual(b.tiles)
  })

  it('fills the grid with known terrain only', () => {
    const world = generateWorld(scenario, new Rng(scenario.seed))
    expect(world.tiles).toHaveLength(scenario.width * scenario.height)
    for (const terrain of world.tiles) {
      expect(content.terrains.has(terrain)).toBe(true)
    }
  })

  it('always gives the colony a river and buildable ground beside it', () => {
    const world = generateWorld(scenario, new Rng(scenario.seed))
    const counts = new Map<string, number>()
    for (const terrain of world.tiles) counts.set(terrain, (counts.get(terrain) ?? 0) + 1)

    expect(counts.get('water') ?? 0).toBeGreaterThan(0)
    expect(counts.get('forest') ?? 0).toBeGreaterThan(0)

    const shoreline = world.tiles.some((terrain, index) => {
      if (!content.terrains.get(terrain)?.buildable) return false
      const x = index % world.width
      const y = Math.floor(index / world.width)
      return neighbours(world, x, y).some((tile) => terrainAt(world, tile.x, tile.y) === 'water')
    })
    expect(shoreline).toBe(true)
  })

  it('clips neighbours to the map edges', () => {
    const world = generateWorld(scenario, new Rng(scenario.seed))
    expect(neighbours(world, 0, 0)).toHaveLength(2)
    expect(neighbours(world, 1, 1)).toHaveLength(4)
    expect(terrainAt(world, -1, 0)).toBeUndefined()
  })
})
