import { describe, expect, it } from 'vitest'
import { content } from '@vs/content'
import { Game } from './game.js'
import { offerValue, placementError, relationshipBand, townState } from './state.js'
import { terrainAt } from './world.js'
import { DEMAND_GOODWILL_COST, HARVEST_DAY_OF_YEAR } from './balance.js'
import { hostilityFoodPenalty } from './tick.js'

const SCENARIO = 'jamestown_1607'
const scenario = content.scenarios.get(SCENARIO)!
const newGame = () => new Game(content, SCENARIO)

const PASPAHEGH = 'paspahegh'
const paspahegh = content.towns.get(PASPAHEGH)!

describe('the towns', () => {
  it('stand on dry land', () => {
    const game = newGame()
    expect(game.state.towns).toHaveLength(content.townList.length)
    for (const town of game.state.towns) {
      expect(terrainAt(game.state.world, town.x, town.y)).not.toBe('water')
      expect(terrainAt(game.state.world, town.x, town.y)).toBeDefined()
    }
  })

  it('are lean in high summer, months after their last harvest', () => {
    const game = newGame()
    for (const town of game.state.towns) {
      const definition = content.towns.get(town.id)!
      expect(town.cornStock).toBeGreaterThan(0)
      expect(town.cornStock).toBeLessThan(definition.harvestCorn / 2)
    }
  })

  it('eat their own stores down over the year', () => {
    const game = newGame()
    const before = townState(game.state, PASPAHEGH)!.cornStock
    game.execute({ kind: 'advance', days: 30 })
    expect(townState(game.state, PASPAHEGH)!.cornStock).toBeLessThan(before)
  })

  it('fill their granaries again when the harvest comes in', () => {
    const game = newGame()
    // The chapter opens on day 120 of the year; autumn begins on day 180.
    game.execute({ kind: 'advance', days: HARVEST_DAY_OF_YEAR - scenario.startDay })
    expect(townState(game.state, PASPAHEGH)!.cornStock).toBe(paspahegh.harvestCorn)
  })
})

describe('relationship bands', () => {
  it('reads the band from the number', () => {
    expect(relationshipBand(0)).toBe('hostile')
    expect(relationshipBand(19)).toBe('hostile')
    expect(relationshipBand(20)).toBe('wary')
    expect(relationshipBand(45)).toBe('cordial')
    expect(relationshipBand(75)).toBe('allied')
    expect(relationshipBand(100)).toBe('allied')
  })

  it('pays better the better the colony is regarded', () => {
    const offer = { copper: 10 }
    const wary = offerValue(paspahegh, 30, offer)
    const cordial = offerValue(paspahegh, 50, offer)
    const allied = offerValue(paspahegh, 90, offer)

    expect(wary).toBeLessThan(cordial)
    expect(cordial).toBeLessThan(allied)
    expect(offerValue(paspahegh, 5, offer)).toBe(0)
  })

  it('values only what the town actually wants', () => {
    expect(offerValue(paspahegh, 50, { timber: 100 })).toBe(0)
  })
})

describe('trading', () => {
  it('sends a party, spends the goods, and brings corn back on the appointed day', () => {
    const game = newGame()
    const copperBefore = game.state.stores['copper'] ?? 0
    const cornBefore = game.state.stores['corn'] ?? 0

    expect(game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 5 } }).ok).toBe(true)
    expect(game.state.stores['copper']).toBe(copperBefore - 5)

    const town = townState(game.state, PASPAHEGH)!
    const expected = town.incomingCorn
    expect(expected).toBeGreaterThan(0)

    // Still on the road: nothing has arrived yet.
    game.execute({ kind: 'advance', days: paspahegh.travelDays - 1 })
    expect(game.state.stores['corn'] ?? 0).toBeLessThan(cornBefore + expected)

    game.execute({ kind: 'advance', days: 1 })
    expect(townState(game.state, PASPAHEGH)!.partyReturnsOn).toBeNull()
    expect(game.state.produced['corn'] ?? 0).toBe(0) // traded, not produced
  })

  it('will not send a second party while the first is away', () => {
    const game = newGame()
    game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 2 } })
    const second = game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 2 } })
    expect(second).toEqual({ ok: false, error: 'The party to Paspahegh has not returned.' })
  })

  it('refuses goods the town has no use for', () => {
    const game = newGame()
    const result = game.execute({ kind: 'trade', town: PASPAHEGH, offer: { timber: 5 } })
    expect(result).toEqual({ ok: false, error: 'Paspahegh has no use for Timber.' })
  })

  it('refuses goods the colony does not have', () => {
    const game = newGame()
    const result = game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 9999 } })
    expect(result).toEqual({ ok: false, error: 'The store has not the goods.' })
  })

  it('refuses an empty offer', () => {
    const game = newGame()
    expect(game.execute({ kind: 'trade', town: PASPAHEGH, offer: {} }).ok).toBe(false)
    expect(game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 0 } }).ok).toBe(false)
  })

  it('refuses an unknown town', () => {
    const game = newGame()
    expect(game.execute({ kind: 'trade', town: 'atlantis', offer: { copper: 1 } })).toEqual({
      ok: false,
      error: 'No such town.',
    })
  })

  it('never promises more corn than the town has', () => {
    const game = newGame()
    const town = townState(game.state, PASPAHEGH)!
    town.cornStock = 10
    game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 40 } })
    expect(townState(game.state, PASPAHEGH)!.incomingCorn).toBe(10)
    expect(townState(game.state, PASPAHEGH)!.cornStock).toBe(0)
  })

  it('will not trade with a town that has nothing to spare', () => {
    const game = newGame()
    townState(game.state, PASPAHEGH)!.cornStock = 0
    expect(game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 5 } })).toEqual({
      ok: false,
      error: 'Paspahegh has no corn to spare.',
    })
  })

  it('is refused outright by a hostile town', () => {
    const game = newGame()
    townState(game.state, PASPAHEGH)!.relationship = 5
    expect(game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 5 } })).toEqual({
      ok: false,
      error: 'Paspahegh will not deal with the colony.',
    })
  })

  it('earns a little goodwill', () => {
    const game = newGame()
    const before = townState(game.state, PASPAHEGH)!.relationship
    game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 2 } })
    expect(townState(game.state, PASPAHEGH)!.relationship).toBeGreaterThan(before)
  })
})

describe('gifts', () => {
  it('cost goods, bring no corn, and buy goodwill', () => {
    const game = newGame()
    const copperBefore = game.state.stores['copper'] ?? 0
    const before = townState(game.state, PASPAHEGH)!.relationship

    expect(game.execute({ kind: 'gift', town: PASPAHEGH, offer: { copper: 20 } }).ok).toBe(true)

    const town = townState(game.state, PASPAHEGH)!
    expect(game.state.stores['copper']).toBe(copperBefore - 20)
    expect(town.incomingCorn).toBe(0)
    expect(town.relationship).toBeGreaterThan(before)
  })

  it('are the way back from hostility, when trade is refused', () => {
    const game = newGame()
    townState(game.state, PASPAHEGH)!.relationship = 5
    expect(game.execute({ kind: 'gift', town: PASPAHEGH, offer: { copper: 20 } }).ok).toBe(true)
    expect(townState(game.state, PASPAHEGH)!.relationship).toBeGreaterThan(5)
  })
})

describe('taking by force', () => {
  it('brings corn home and costs a great deal of goodwill', () => {
    const game = newGame()
    const before = townState(game.state, PASPAHEGH)!.relationship

    expect(game.execute({ kind: 'demand', town: PASPAHEGH }).ok).toBe(true)

    const town = townState(game.state, PASPAHEGH)!
    expect(town.incomingCorn).toBeGreaterThan(0)
    expect(town.relationship).toBe(before - DEMAND_GOODWILL_COST)
  })

  it('brings Wahunsenacawh’s words to light', () => {
    const game = newGame()
    expect(game.state.discoveredSourceCards).not.toContain('powhatan_to_smith_1609')
    game.execute({ kind: 'demand', town: PASPAHEGH })
    expect(game.state.discoveredSourceCards).toContain('powhatan_to_smith_1609')
  })

  it('closes the town to trade if repeated', () => {
    const game = newGame()
    for (let i = 0; i < 3; i++) {
      game.execute({ kind: 'demand', town: PASPAHEGH })
      game.execute({ kind: 'advance', days: paspahegh.travelDays })
    }
    expect(relationshipBand(townState(game.state, PASPAHEGH)!.relationship)).toBe('hostile')
    expect(game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 5 } }).ok).toBe(false)
  })
})

describe('trade determinism', () => {
  it('replays identically from a save file', () => {
    const build = () => {
      const game = newGame()
      game.execute({ kind: 'trade', town: PASPAHEGH, offer: { copper: 4 } })
      game.execute({ kind: 'advance', days: 12 })
      game.execute({ kind: 'gift', town: PASPAHEGH, offer: { copper: 6 } })
      game.execute({ kind: 'demand', town: 'quiyoughcohanock' })
      game.execute({ kind: 'advance', days: 40 })
      return game
    }
    const original = build()
    expect(JSON.stringify(build().state)).toEqual(JSON.stringify(original.state))
    expect(JSON.stringify(Game.load(content, original.save()).state)).toEqual(
      JSON.stringify(original.state),
    )
  })
})

/**
 * A player who works the trade relationship instead of only fishing. Keeps the
 * forge chain running, sends copper and then tools out for corn, and never
 * takes by force.
 */
function playAsTrader(game: Game, options: { demandInsteadOfTrade: boolean }): void {
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
    const housing = countOf('dwelling') * 5
    if (countOf('felling_camp') < 1) tryBuild('felling_camp')
    else if (countOf('sawpit') < 1) tryBuild('sawpit')
    else if (countOf('fishing_wharf') < 2) tryBuild('fishing_wharf')
    else if (countOf('bog_iron_pit') < 1) tryBuild('bog_iron_pit')
    else if (countOf('forge') < 1) tryBuild('forge')
    else if (housing < game.state.colonists) tryBuild('dwelling')

    for (const town of game.state.towns) {
      if (town.partyReturnsOn !== null || town.cornStock <= 0) continue

      if (options.demandInsteadOfTrade) {
        game.execute({ kind: 'demand', town: town.id })
        continue
      }

      const tools = game.state.stores['tools'] ?? 0
      const copper = game.state.stores['copper'] ?? 0
      if (tools > 0) game.execute({ kind: 'trade', town: town.id, offer: { tools } })
      else if (copper >= 10) game.execute({ kind: 'trade', town: town.id, offer: { copper: 10 } })
    }

    game.execute({ kind: 'advance', days: 5 })
  }
}

describe('hostility has teeth', () => {
  it('costs nothing while the neighbours are merely wary', () => {
    const game = newGame()
    expect(hostilityFoodPenalty(game.state)).toBe(0)
  })

  it('cuts food production for every town turned against the colony', () => {
    const game = newGame()
    const towns = game.state.towns
    towns[0]!.relationship = 0
    const one = hostilityFoodPenalty(game.state)
    expect(one).toBeGreaterThan(0)

    for (const town of towns) town.relationship = 0
    expect(hostilityFoodPenalty(game.state)).toBeGreaterThan(one)
  })

  it('starves a besieged colony even with food in the water', () => {
    // Colonists who cannot safely leave the palisade cannot fish. This is what
    // the siege of 1609 did to Jamestown.
    const catchWith = (relationship: number): number => {
      const game = newGame()
      for (const town of game.state.towns) town.relationship = relationship
      const site = (() => {
        for (let y = 0; y < game.state.world.height; y++)
          for (let x = 0; x < game.state.world.width; x++)
            if (placementError(game.state, content, 'fishing_wharf', x, y) === null) return { x, y }
        throw new Error('no wharf site')
      })()
      game.execute({ kind: 'place', building: 'fishing_wharf', ...site })
      game.execute({ kind: 'advance', days: 40 })
      return game.state.produced['fish'] ?? 0
    }

    expect(catchWith(0)).toBeLessThan(catchWith(60))
  })
})

describe('the trade path is a real way to play', () => {
  it('lets a player who trades honestly get the colony through the winter', () => {
    const game = newGame()
    playAsTrader(game, { demandInsteadOfTrade: false })
    expect(game.state.outcome.status).toBe('survived')
    expect(game.state.deaths).toBe(0)
  })

  it('turns every town hostile against a player who only takes', () => {
    const game = newGame()
    playAsTrader(game, { demandInsteadOfTrade: true })

    for (const town of game.state.towns) {
      expect(relationshipBand(town.relationship)).toBe('hostile')
    }
  })

  it('costs far more lives to take than to trade, for the same colony', () => {
    // The design claim of this whole milestone, pinned: with identical
    // buildings and identical labour, the colony that deals fairly comes
    // through and the colony that takes at gunpoint does not.
    const trading = newGame()
    playAsTrader(trading, { demandInsteadOfTrade: false })

    const taking = newGame()
    playAsTrader(taking, { demandInsteadOfTrade: true })

    expect(taking.state.deaths).toBeGreaterThan(trading.state.deaths)
    expect(taking.state.colonists).toBeLessThan(trading.state.colonists)
  })
})
