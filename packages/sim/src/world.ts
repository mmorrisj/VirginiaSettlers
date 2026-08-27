import type { Scenario } from '@vs/content'
import type { Rng } from './rng.js'

export interface World {
  readonly width: number
  readonly height: number
  /** Terrain ids in row-major order; length is width * height. */
  readonly tiles: readonly string[]
}

export function tileIndex(world: World, x: number, y: number): number {
  return y * world.width + x
}

export function inBounds(world: World, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height
}

export function terrainAt(world: World, x: number, y: number): string | undefined {
  if (!inBounds(world, x, y)) return undefined
  return world.tiles[tileIndex(world, x, y)]
}

/** The four orthogonal neighbours of a tile, clipped to the map. */
export function neighbours(world: World, x: number, y: number): { x: number; y: number }[] {
  const candidates = [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ]
  return candidates.filter((tile) => inBounds(world, tile.x, tile.y))
}

/**
 * Builds the peninsula: a meandering river down the eastern side with a marsh
 * fringe, clay banks along the water, and a wooded interior broken by meadows.
 * The water sits east so the map reads the way an atlas does, with the Atlantic
 * to the right and the land stretching inland to the west.
 * Everything derives from the scenario seed so the map is identical for every
 * player of the same chapter.
 */
export function generateWorld(scenario: Scenario, rng: Rng): World {
  const { width, height } = scenario
  const tiles: string[] = new Array<string>(width * height).fill('forest')

  // A random walk gives the river a natural bend without any noise library.
  // Each entry is the x at which the water begins on that row.
  const riverBank: number[] = []
  let bank = Math.floor(width * 0.82)
  for (let y = 0; y < height; y++) {
    bank += rng.int(-1, 1)
    bank = Math.max(Math.floor(width * 0.66), Math.min(width - 3, bank))
    riverBank.push(bank)
  }

  const openness = smoothedField(width, height, rng, 3)

  for (let y = 0; y < height; y++) {
    const bankAt = riverBank[y] ?? width - 3
    for (let x = 0; x < width; x++) {
      // Distance inland from the water's edge, growing to the west.
      const distanceToRiver = bankAt - x
      const value = openness[y * width + x] ?? 0.5

      let terrain: string
      if (distanceToRiver <= 0) {
        terrain = 'water'
      } else if (distanceToRiver === 1) {
        // A mostly firm bank at the water's edge: this is where wharves go.
        terrain = value < 0.3 ? 'marsh' : 'clay'
      } else if (distanceToRiver <= 4) {
        // Behind the bank lies the marsh the peninsula was known for, and the
        // bog iron dug out of its edges.
        terrain = value < 0.5 ? 'marsh' : value > 0.72 ? 'meadow' : 'forest'
      } else if (value > 0.58) {
        terrain = 'meadow'
      } else {
        terrain = 'forest'
      }
      tiles[y * width + x] = terrain
    }
  }

  return { width, height, tiles }
}

/**
 * White noise blurred a few times. Cheap, seed-stable, and enough to make
 * forests and meadows form patches rather than static.
 */
function smoothedField(width: number, height: number, rng: Rng, passes: number): number[] {
  let field = Array.from({ length: width * height }, () => rng.next())

  for (let pass = 0; pass < passes; pass++) {
    const next = new Array<number>(width * height).fill(0)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let total = 0
        let count = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            total += field[ny * width + nx] ?? 0
            count++
          }
        }
        next[y * width + x] = total / count
      }
    }
    field = next
  }

  return normalise(field)
}

/** Blurring collapses the range towards 0.5; stretch it back out to [0, 1]. */
function normalise(field: number[]): number[] {
  let min = Infinity
  let max = -Infinity
  for (const value of field) {
    if (value < min) min = value
    if (value > max) max = value
  }
  const span = max - min
  if (span === 0) return field.map(() => 0.5)
  return field.map((value) => (value - min) / span)
}
