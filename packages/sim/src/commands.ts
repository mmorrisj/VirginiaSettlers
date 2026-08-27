import type { Content, Scenario } from '@vs/content'
import {
  CORN_VALUE_PER_GIFT_GOODWILL,
  DEMAND_BASE_CORN,
  DEMAND_CORN_PER_COLONIST,
  DEMAND_GOODWILL_COST,
  MAX_GIFT_GOODWILL,
  MIN_GIFT_GOODWILL,
  TRADE_GOODWILL,
} from './balance.js'
import { tick, log, revealSourceCard } from './tick.js'
import {
  quoteTrade,
  placementError,
  relationshipBand,
  townState,
  PLACEMENT_MESSAGES,
  type GameState,
  type TownState,
} from './state.js'

/**
 * Everything a player can do. A saved game is the scenario id plus this list,
 * replayed from the start, which keeps saves tiny and makes any bug in a
 * student's colony reproducible from their save file alone.
 */
export type Command =
  | { kind: 'place'; building: string; x: number; y: number }
  | { kind: 'demolish'; id: number }
  | { kind: 'advance'; days: number }
  /** Send goods to a town and bring corn back. */
  | { kind: 'trade'; town: string; offer: Record<string, number> }
  /** Send goods and ask nothing, to buy goodwill rather than corn. */
  | { kind: 'gift'; town: string; offer: Record<string, number> }
  /** Take corn under threat of arms. Cheap today, ruinous later. */
  | { kind: 'demand'; town: string }

export type CommandResult = { ok: true } | { ok: false; error: string }

const MAX_ADVANCE_DAYS = 3650

export function execute(
  state: GameState,
  content: Content,
  scenario: Scenario,
  command: Command,
): CommandResult {
  switch (command.kind) {
    case 'place':
      return place(state, content, command)
    case 'demolish':
      return demolish(state, content, command.id)
    case 'advance':
      return advance(state, content, scenario, command.days)
    case 'trade':
      return trade(state, content, command.town, command.offer)
    case 'gift':
      return gift(state, content, command.town, command.offer)
    case 'demand':
      return demand(state, content, command.town)
  }
}

/** Shared checks for anything that sends a party to a town. */
function readyToDeal(
  state: GameState,
  content: Content,
  townId: string,
): { ok: true; town: TownState } | { ok: false; error: string } {
  if (state.outcome.status !== 'playing') return { ok: false, error: 'The chapter is over.' }

  const definition = content.towns.get(townId)
  const town = townState(state, townId)
  if (!definition || !town) return { ok: false, error: 'No such town.' }

  if (town.partyReturnsOn !== null) {
    return { ok: false, error: `The party to ${definition.name} has not returned.` }
  }
  return { ok: true, town }
}

/** Deducts an offer from the store, having already checked it can be paid. */
function payOffer(state: GameState, offer: Record<string, number>): void {
  for (const [resourceId, quantity] of Object.entries(offer)) {
    state.stores[resourceId] = (state.stores[resourceId] ?? 0) - quantity
  }
}

/**
 * Validates an offer: it must be non-empty, wanted by this town, and actually
 * in the store. Returns an error message, or null if the offer is good.
 */
function offerProblem(
  state: GameState,
  content: Content,
  townId: string,
  offer: Record<string, number>,
): string | null {
  const definition = content.towns.get(townId)
  if (!definition) return 'No such town.'

  const entries = Object.entries(offer)
  if (entries.length === 0 || entries.every(([, quantity]) => quantity <= 0)) {
    return 'Offer something, or there is nothing to discuss.'
  }

  for (const [resourceId, quantity] of entries) {
    if (!Number.isInteger(quantity) || quantity < 0) return 'That is not a quantity.'
    if (quantity === 0) continue
    if (definition.wants[resourceId] === undefined) {
      const name = content.resources.get(resourceId)?.name ?? resourceId
      return `${definition.name} has no use for ${name}.`
    }
    if ((state.stores[resourceId] ?? 0) < quantity) {
      return 'The store has not the goods.'
    }
  }
  return null
}

function trade(
  state: GameState,
  content: Content,
  townId: string,
  offer: Record<string, number>,
): CommandResult {
  const ready = readyToDeal(state, content, townId)
  if (!ready.ok) return ready

  const definition = content.towns.get(townId)!
  const town = ready.town

  if (relationshipBand(town.relationship) === 'hostile') {
    return { ok: false, error: `${definition.name} will not deal with the colony.` }
  }

  const problem = offerProblem(state, content, townId, offer)
  if (problem) return { ok: false, error: problem }

  if (town.cornStock <= 0) {
    return { ok: false, error: `${definition.name} has no corn to spare.` }
  }

  const quote = quoteTrade(definition, town.relationship, offer, town.cornStock)
  if (quote.corn <= 0) {
    return { ok: false, error: `${definition.name} cannot pay for that.` }
  }

  payOffer(state, quote.accepted)
  town.cornStock -= quote.corn
  town.incomingCorn = quote.corn
  town.partyReturnsOn = state.day + definition.travelDays
  town.lastContactDay = state.day
  town.relationship = Math.min(100, town.relationship + TRADE_GOODWILL)

  const offered = Object.values(offer).reduce((sum, n) => sum + n, 0)
  const taken = Object.values(quote.accepted).reduce((sum, n) => sum + n, 0)
  const handedBack = offered > taken ? ' They could not pay for all of it; the rest comes home.' : ''
  log(
    state,
    'info',
    `A party sets out for ${definition.name} to trade for ${quote.corn} corn.${handedBack}`,
  )
  return { ok: true }
}

function gift(
  state: GameState,
  content: Content,
  townId: string,
  offer: Record<string, number>,
): CommandResult {
  const ready = readyToDeal(state, content, townId)
  if (!ready.ok) return ready

  const definition = content.towns.get(townId)!
  const town = ready.town

  const problem = offerProblem(state, content, townId, offer)
  if (problem) return { ok: false, error: problem }

  // A gift is valued at what the goods are worth to them, not at today's rate:
  // goodwill is the point, and a hostile town can still be given something.
  const value = quoteTrade(definition, 75, offer, Number.MAX_SAFE_INTEGER).corn
  const goodwill = Math.max(
    MIN_GIFT_GOODWILL,
    Math.min(MAX_GIFT_GOODWILL, Math.floor(value / CORN_VALUE_PER_GIFT_GOODWILL)),
  )

  payOffer(state, offer)
  town.partyReturnsOn = state.day + definition.travelDays
  town.incomingCorn = 0
  town.lastContactDay = state.day
  town.relationship = Math.min(100, town.relationship + goodwill)

  log(state, 'good', `A gift is carried to ${definition.name}, and remembered.`)
  return { ok: true }
}

/**
 * Taking corn at gunpoint. It works, it is what the colony's leaders actually
 * did, and it is why the trade the colony depended on stopped.
 */
function demand(state: GameState, content: Content, townId: string): CommandResult {
  const ready = readyToDeal(state, content, townId)
  if (!ready.ok) return ready

  const definition = content.towns.get(townId)!
  const town = ready.town

  const reach = DEMAND_BASE_CORN + DEMAND_CORN_PER_COLONIST * state.colonists
  const taken = Math.min(town.cornStock, reach)

  town.cornStock -= taken
  town.incomingCorn = taken
  town.partyReturnsOn = state.day + definition.travelDays
  town.lastContactDay = state.day

  const before = relationshipBand(town.relationship)
  town.relationship = Math.max(0, town.relationship - DEMAND_GOODWILL_COST)
  const after = relationshipBand(town.relationship)

  log(state, 'warning', `Armed men are sent to ${definition.name} to take ${taken} corn.`)
  if (before !== after) {
    log(state, 'warning', `${definition.name} is now ${after} towards the colony.`)
  }
  revealSourceCard(state, content, 'powhatan_to_smith_1609')
  return { ok: true }
}

function place(
  state: GameState,
  content: Content,
  command: Extract<Command, { kind: 'place' }>,
): CommandResult {
  if (state.outcome.status !== 'playing') return { ok: false, error: 'The chapter is over.' }

  const problem = placementError(state, content, command.building, command.x, command.y)
  if (problem) return { ok: false, error: PLACEMENT_MESSAGES[problem] }

  const definition = content.buildings.get(command.building)
  if (!definition) return { ok: false, error: PLACEMENT_MESSAGES.unknown_building }

  for (const [resourceId, amount] of Object.entries(definition.cost)) {
    state.stores[resourceId] = (state.stores[resourceId] ?? 0) - amount
  }

  state.buildings.push({
    id: state.nextBuildingId++,
    type: command.building,
    x: command.x,
    y: command.y,
    built: 0,
    complete: definition.buildDays === 0,
    staff: 0,
    progress: 0,
    idle: null,
  })

  log(state, 'info', `${definition.name} begun.`)
  return { ok: true }
}

/** Pulling a building down returns half its materials, rounded down. */
function demolish(state: GameState, content: Content, id: number): CommandResult {
  const index = state.buildings.findIndex((building) => building.id === id)
  if (index === -1) return { ok: false, error: 'No such building.' }

  const [removed] = state.buildings.splice(index, 1)
  if (!removed) return { ok: false, error: 'No such building.' }

  const definition = content.buildings.get(removed.type)
  for (const [resourceId, amount] of Object.entries(definition?.cost ?? {})) {
    state.stores[resourceId] = (state.stores[resourceId] ?? 0) + Math.floor(amount / 2)
  }

  log(state, 'info', `${definition?.name ?? 'A building'} pulled down.`)
  return { ok: true }
}

function advance(
  state: GameState,
  content: Content,
  scenario: Scenario,
  days: number,
): CommandResult {
  if (!Number.isInteger(days) || days < 1 || days > MAX_ADVANCE_DAYS) {
    return { ok: false, error: 'Invalid number of days.' }
  }
  for (let day = 0; day < days; day++) {
    if (state.outcome.status !== 'playing') break
    tick(state, content, scenario)
  }
  return { ok: true }
}
