import { describe, expect, it } from 'vitest'
import { content } from '@vs/content'
import { Game } from './game.js'
import { foodOutlook, placementError } from './state.js'
import type { Command } from './commands.js'

const SCENARIO = 'jamestown_1607'
const scenario = content.scenarios.get(SCENARIO)!

function newGame(): Game {
  return new Game(content, SCENARIO)
}

/** First tile on which the given building may legally be placed. */
function findSite(game: Game, buildingType: string): { x: number; y: number } {
  const { world } = game.state
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (placementError(game.state, content, buildingType, x, y) === null) return { x, y }
    }
  }
  throw new Error(`No legal site for ${buildingType} on the ${SCENARIO} map`)
}

describe('Game setup', () => {
  it('starts with the scenario stores and colonists', () => {
    const game = newGame()
    expect(game.state.colonists).toBe(scenario.startingColonists)
    expect(game.state.stores['corn']).toBe(scenario.startingResources['corn'])
    expect(game.state.outcome.status).toBe('playing')
    expect(game.date.season).toBe('summer')
  })

  it('rejects an unknown scenario', () => {
    expect(() => new Game(content, 'roanoke')).toThrow(/Unknown scenario/)
  })
})

describe('placement rules', () => {
  it('refuses to build on the river', () => {
    const game = newGame()
    const waterIndex = game.state.world.tiles.indexOf('water')
    const x = waterIndex % game.state.world.width
    const y = Math.floor(waterIndex / game.state.world.width)
    expect(placementError(game.state, content, 'dwelling', x, y)).toBe('wrong_terrain')
  })

  it('refuses a felling camp anywhere but the forest', () => {
    const game = newGame()
    const meadow = findSite(game, 'dwelling')
    expect(placementError(game.state, content, 'felling_camp', meadow.x, meadow.y)).toBe('wrong_terrain')
  })

  it('requires the fishing wharf to touch water', () => {
    const game = newGame()
    const { world } = game.state
    const inland = { x: world.width - 1, y: Math.floor(world.height / 2) }
    const problem = placementError(game.state, content, 'fishing_wharf', inland.x, inland.y)
    expect(problem === 'missing_adjacency' || problem === 'wrong_terrain').toBe(true)
  })

  it('refuses to stack two buildings on one tile', () => {
    const game = newGame()
    const site = findSite(game, 'dwelling')
    expect(game.execute({ kind: 'place', building: 'dwelling', ...site }).ok).toBe(true)
    const second = game.execute({ kind: 'place', building: 'dwelling', ...site })
    expect(second).toEqual({ ok: false, error: 'Something already stands here.' })
  })

  it('refuses what the store cannot pay for', () => {
    const game = newGame()
    game.state.stores['planks'] = 0
    const site = findSite(game, 'felling_camp')
    const result = game.execute({ kind: 'place', building: 'storehouse', x: site.x, y: site.y })
    expect(result.ok).toBe(false)
  })

  it('spends materials on placement and refunds half on demolition', () => {
    const game = newGame()
    const before = game.state.stores['timber'] ?? 0
    const site = findSite(game, 'felling_camp')
    game.execute({ kind: 'place', building: 'felling_camp', ...site })
    expect(game.state.stores['timber']).toBe(before - 4)

    const id = game.state.buildings[0]!.id
    game.execute({ kind: 'demolish', id })
    expect(game.state.stores['timber']).toBe(before - 4 + 2)
    expect(game.state.buildings).toHaveLength(0)
  })
})

describe('production', () => {
  it('takes buildDays to finish before anything is produced', () => {
    const game = newGame()
    const site = findSite(game, 'felling_camp')
    game.execute({ kind: 'place', building: 'felling_camp', ...site })
    const stock = game.state.stores['timber'] ?? 0

    game.execute({ kind: 'advance', days: 2 })
    expect(game.state.buildings[0]!.complete).toBe(false)
    expect(game.state.stores['timber']).toBe(stock)

    game.execute({ kind: 'advance', days: 1 })
    expect(game.state.buildings[0]!.complete).toBe(true)
  })

  it('runs the timber chain from forest to planks', () => {
    const game = newGame()
    const camp = findSite(game, 'felling_camp')
    game.execute({ kind: 'place', building: 'felling_camp', ...camp })
    const pit = findSite(game, 'sawpit')
    game.execute({ kind: 'place', building: 'sawpit', ...pit })

    const planksBefore = game.state.stores['planks'] ?? 0
    game.execute({ kind: 'advance', days: 40 })

    expect(game.state.stores['planks'] ?? 0).toBeGreaterThan(planksBefore)
  })

  it('yields far less fish in winter than in summer', () => {
    // Net stores cannot show this: the colony eats the catch as fast as it lands.
    // The lifetime production tally is what the seasonal modifier acts on.
    const catchOver = (waitDays: number): number => {
      const game = new Game(content, SCENARIO)
      const site = findSite(game, 'fishing_wharf')
      game.execute({ kind: 'place', building: 'fishing_wharf', ...site })
      game.execute({ kind: 'advance', days: waitDays })
      const before = game.state.produced['fish'] ?? 0
      game.execute({ kind: 'advance', days: 30 })
      return (game.state.produced['fish'] ?? 0) - before
    }

    // The scenario opens on day 120 of the year, in summer; winter begins 150 days later.
    const summerCatch = catchOver(10)
    const winterCatch = catchOver(160)
    expect(summerCatch).toBeGreaterThan(0)
    expect(winterCatch).toBeLessThan(summerCatch / 2)
  })

  it('stalls a building when the store is full instead of losing goods silently', () => {
    const game = newGame()
    const site = findSite(game, 'felling_camp')
    game.execute({ kind: 'place', building: 'felling_camp', ...site })
    game.execute({ kind: 'advance', days: 3 })
    expect(game.state.buildings[0]!.complete).toBe(true)

    game.state.stores['corn'] = game.scenario.baseStorage
    const timberBefore = game.state.stores['timber'] ?? 0
    game.execute({ kind: 'advance', days: 2 })

    expect(game.state.buildings[0]!.idle).toBe('storage_full')
    expect(game.state.stores['timber']).toBe(timberBefore)
  })

  it('never lets the store exceed its capacity', () => {
    const game = newGame()
    const camp = findSite(game, 'felling_camp')
    game.execute({ kind: 'place', building: 'felling_camp', ...camp })
    game.execute({ kind: 'advance', days: 120 })

    const stored = Object.values(game.state.stores).reduce((sum, amount) => sum + amount, 0)
    expect(stored).toBeLessThanOrEqual(game.scenario.baseStorage)
  })
})

describe('survival', () => {
  it('eats through the stores and starves without new food', () => {
    const game = newGame()
    const cornAtLanding = scenario.startingResources['corn'] ?? 0
    game.execute({ kind: 'advance', days: 60 })
    expect(game.state.stores['corn'] ?? 0).toBeLessThan(cornAtLanding)
    expect(game.state.deaths).toBe(0)

    game.execute({ kind: 'advance', days: 240 })
    expect(game.state.deaths).toBeGreaterThan(0)
  })

  it('gives the player a workable runway before the first death', () => {
    // A chapter that kills a careless player is the point; one that kills a
    // careful player inside a month is a balance bug.
    const game = newGame()
    game.execute({ kind: 'advance', days: 60 })
    expect(game.state.colonists).toBe(scenario.startingColonists)
  })

  it('ends the chapter when the last colonist is gone', () => {
    const game = newGame()
    game.state.stores['corn'] = 0
    game.execute({ kind: 'advance', days: 300 })
    expect(game.state.outcome.status).toBe('failed')
  })

  it('eats perishable fish before dried corn', () => {
    const game = newGame()
    game.state.stores['fish'] = 50
    const cornBefore = game.state.stores['corn'] ?? 0
    game.execute({ kind: 'advance', days: 1 })
    expect(game.state.stores['fish']).toBeLessThan(50)
    expect(game.state.stores['corn']).toBe(cornBefore)
  })
})

describe('determinism', () => {
  const script: Command[] = [
    { kind: 'advance', days: 3 },
    { kind: 'place', building: 'felling_camp', x: -1, y: -1 },
    { kind: 'advance', days: 25 },
  ]

  const run = (): Game => {
    const game = newGame()
    for (const command of script) {
      if (command.kind === 'place') {
        const site = findSite(game, command.building)
        game.execute({ ...command, ...site })
      } else {
        game.execute(command)
      }
    }
    return game
  }

  it('produces an identical colony from identical commands', () => {
    expect(JSON.stringify(run().state)).toEqual(JSON.stringify(run().state))
  })

  it('rebuilds the same colony from a save file', () => {
    const original = run()
    const restored = Game.load(content, original.save())
    expect(JSON.stringify(restored.state)).toEqual(JSON.stringify(original.state))
  })

  it('does not record commands it rejected', () => {
    const game = newGame()
    game.execute({ kind: 'place', building: 'dwelling', x: -5, y: -5 })
    expect(game.save().commands).toHaveLength(0)
  })

  it('refuses a save file from a future version', () => {
    expect(() =>
      Game.load(content, { version: 2 as unknown as 1, scenarioId: SCENARIO, commands: [] }),
    ).toThrow(/Unsupported save version/)
  })
})

/**
 * A deliberately simple reference player: keep one felling camp and one saw pit
 * running, put up wharves for food, then house everybody. If this policy cannot
 * survive the chapter, the chapter is not winnable and the balance is wrong.
 */
function playCompetently(game: Game, targetWharves: number): void {
  const countOf = (type: string) => game.state.buildings.filter((b) => b.type === type).length

  const tryBuild = (type: string): boolean => {
    const { world } = game.state
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        if (placementError(game.state, content, type, x, y) !== null) continue
        return game.execute({ kind: 'place', building: type, x, y }).ok
      }
    }
    return false
  }

  while (game.state.outcome.status === 'playing') {
    const housing = game.state.buildings.filter((b) => b.type === 'dwelling').length * 5

    if (countOf('felling_camp') < 1) tryBuild('felling_camp')
    else if (countOf('sawpit') < 1) tryBuild('sawpit')
    else if (countOf('fishing_wharf') < targetWharves) tryBuild('fishing_wharf')
    else if (housing < game.state.colonists) tryBuild('dwelling')

    game.execute({ kind: 'advance', days: 5 })
  }
}

describe('the chapter is playable', () => {
  it('offers enough shoreline for the colony to feed itself', () => {
    const game = newGame()
    let wharfSites = 0
    for (let y = 0; y < game.state.world.height; y++) {
      for (let x = 0; x < game.state.world.width; x++) {
        if (placementError(game.state, content, 'fishing_wharf', x, y) === null) wharfSites++
      }
    }
    // Feeding 24 colonists through winter needs several wharves at once.
    expect(wharfSites).toBeGreaterThanOrEqual(6)
  })

  it('offers somewhere to put every building in the game', () => {
    // A building with no legal site is invisible content: the player never sees
    // it, and any build order that waits on it stalls silently. This caught a
    // bog iron pit that had exactly one site on the whole map.
    const game = newGame()
    game.state.stores['timber'] = 9999
    game.state.stores['planks'] = 9999

    for (const building of content.buildingList) {
      let sites = 0
      for (let y = 0; y < game.state.world.height; y++) {
        for (let x = 0; x < game.state.world.width; x++) {
          if (placementError(game.state, content, building.id, x, y) === null) sites++
        }
      }
      expect(sites, `no room for ${building.id} on the ${SCENARIO} map`).toBeGreaterThanOrEqual(4)
    }
  })

  it('can be won by a player who fishes and builds shelter', () => {
    const game = newGame()
    playCompetently(game, 6)

    expect(game.state.outcome.status).toBe('survived')
    expect(game.state.colonists).toBeGreaterThan(0)
  })

  it('is lost by a player who builds nothing', () => {
    const game = newGame()
    game.execute({ kind: 'advance', days: 400 })
    expect(game.state.outcome.status).toBe('failed')
  })
})

describe('food outlook', () => {
  it('counts every edible resource, not just corn', () => {
    const game = newGame()
    game.state.stores['fish'] = 30
    const outlook = foodOutlook(game.state, content)
    expect(outlook.stored).toBe((scenario.startingResources['corn'] ?? 0) + 30)
  })

  it('reports how many days the store will last', () => {
    const game = newGame()
    const outlook = foodOutlook(game.state, content)
    expect(outlook.perDay).toBe(Math.ceil(scenario.startingColonists / 2))
    expect(outlook.daysRemaining).toBe(Math.floor(outlook.stored / outlook.perDay))
  })

  it('counts down as the colony eats', () => {
    const game = newGame()
    const before = foodOutlook(game.state, content).daysRemaining
    game.execute({ kind: 'advance', days: 10 })
    expect(foodOutlook(game.state, content).daysRemaining).toBe(before - 10)
  })
})
