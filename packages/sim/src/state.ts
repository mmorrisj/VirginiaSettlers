import type { Content, Scenario, Town } from '@vs/content'
import {
  BAND_RATE_PERCENT,
  COLONISTS_PER_FOOD_UNIT,
  HARVEST_DAY_OF_YEAR,
  RELATIONSHIP_BANDS,
  type RelationshipBand,
} from './balance.js'
import { DAYS_PER_YEAR } from './calendar.js'
import { Rng } from './rng.js'
import { generateWorld, inBounds, neighbours, terrainAt, type World } from './world.js'

export type LogKind = 'info' | 'good' | 'warning' | 'death' | 'source'

export interface LogEntry {
  day: number
  kind: LogKind
  message: string
}

export type IdleReason = 'unstaffed' | 'missing_inputs' | 'storage_full' | null

export interface PlacedBuilding {
  /** Stable identifier, assigned in placement order. */
  id: number
  type: string
  x: number
  y: number
  /** Construction progress in hundredths of a day, against buildDays * 100. */
  built: number
  complete: boolean
  /** Colonists working here after this tick's allocation. */
  staff: number
  /** Production progress in hundredths of a staffed day. */
  progress: number
  idle: IdleReason
}

/** The colony's standing with one Powhatan town, and what it has going on there. */
export interface TownState {
  id: string
  x: number
  y: number
  /** Goodwill, 0-100. */
  relationship: number
  /** Corn the town currently has to spare. */
  cornStock: number
  /** Day a trading party returns, or null when nobody is away. */
  partyReturnsOn: number | null
  /** Corn that party is bringing back. */
  incomingCorn: number
  /** Last day the colony dealt with this town, for the journal. */
  lastContactDay: number | null
}

export type Outcome =
  | { status: 'playing' }
  | { status: 'survived'; day: number }
  | { status: 'failed'; day: number; reason: string }

export interface GameState {
  scenarioId: string
  /** Days elapsed since the scenario began. */
  day: number
  world: World
  buildings: PlacedBuilding[]
  nextBuildingId: number
  towns: TownState[]
  stores: Record<string, number>
  /** Lifetime totals produced, for the colony journal and end-of-chapter report. */
  produced: Record<string, number>
  colonists: number
  deaths: number
  /** Consecutive days the colony has failed to feed everyone. */
  hungerDays: number
  discoveredSourceCards: string[]
  log: LogEntry[]
  outcome: Outcome
  /** Serialized RNG state, advanced by the simulation only. */
  rngState: number
}

export function createInitialState(content: Content, scenario: Scenario): GameState {
  const rng = new Rng(scenario.seed)
  const world = generateWorld(scenario, rng)

  const stores: Record<string, number> = {}
  const produced: Record<string, number> = {}
  for (const resource of content.resourceList) {
    stores[resource.id] = 0
    produced[resource.id] = 0
  }
  for (const [resourceId, amount] of Object.entries(scenario.startingResources)) {
    stores[resourceId] = amount
  }

  return {
    scenarioId: scenario.id,
    day: 0,
    world,
    buildings: [],
    nextBuildingId: 1,
    towns: content.townList.map((town) => createTownState(town, world, scenario)),
    stores,
    produced,
    colonists: scenario.startingColonists,
    deaths: 0,
    hungerDays: 0,
    discoveredSourceCards: [],
    log: [{ day: 0, kind: 'info', message: `${scenario.name}: ${scenario.summary}` }],
    outcome: { status: 'playing' },
    rngState: rng.serialize(),
  }
}

/** Total storage the colony can hold, including completed storehouses. */
/**
 * Places a town on the map and works out how much corn it has left. The chapter
 * opens in high summer, months after the last harvest and before the next, so
 * the towns are at their leanest exactly when the colony first needs them —
 * which is the situation the settlers actually landed into.
 */
function createTownState(town: Town, world: World, scenario: Scenario): TownState {
  const { x, y } = nearestLandTile(
    world,
    Math.round(town.position.x * (world.width - 1)),
    Math.round(town.position.y * (world.height - 1)),
  )

  const dayOfYear = scenario.startDay % DAYS_PER_YEAR
  const sinceHarvest =
    dayOfYear >= HARVEST_DAY_OF_YEAR
      ? dayOfYear - HARVEST_DAY_OF_YEAR
      : dayOfYear + (DAYS_PER_YEAR - HARVEST_DAY_OF_YEAR)

  return {
    id: town.id,
    x,
    y,
    relationship: town.startingRelationship,
    cornStock: Math.max(0, town.harvestCorn - town.dailyUse * sinceHarvest),
    partyReturnsOn: null,
    incomingCorn: 0,
    lastContactDay: null,
  }
}

/** Spiral out from a target tile until we find dry land to put a town on. */
function nearestLandTile(world: World, targetX: number, targetY: number): { x: number; y: number } {
  const isLand = (x: number, y: number) => {
    const terrain = terrainAt(world, x, y)
    return terrain !== undefined && terrain !== 'water'
  }
  if (isLand(targetX, targetY)) return { x: targetX, y: targetY }

  for (let radius = 1; radius < Math.max(world.width, world.height); radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue
        const x = targetX + dx
        const y = targetY + dy
        if (inBounds(world, x, y) && isLand(x, y)) return { x, y }
      }
    }
  }
  return { x: 0, y: 0 }
}

export function relationshipBand(relationship: number): RelationshipBand {
  let band: RelationshipBand = 'hostile'
  for (const entry of RELATIONSHIP_BANDS) {
    if (relationship >= entry.min) band = entry.band
  }
  return band
}

export function townState(state: GameState, townId: string): TownState | undefined {
  return state.towns.find((town) => town.id === townId)
}

/**
 * Corn an offer would fetch at this town today. The town's own valuation of the
 * goods, scaled by how it currently regards the colony — never by what the
 * colony thinks the goods are worth.
 */
export function offerValue(
  town: Town,
  relationship: number,
  offer: Record<string, number>,
): number {
  const percent = BAND_RATE_PERCENT[relationshipBand(relationship)]
  let value = 0
  for (const [resourceId, quantity] of Object.entries(offer)) {
    const cordialRate = town.wants[resourceId]
    if (cordialRate === undefined) continue
    value += Math.floor((cordialRate * quantity * percent) / 100)
  }
  return value
}

export interface TradeQuote {
  /** Goods the town will actually take. */
  accepted: Record<string, number>
  /** Corn those goods fetch. */
  corn: number
}

/**
 * What a town will really give for an offer today. A town does not take twenty
 * hatchets for the eighty corn left in its granary: it accepts what it can pay
 * for and hands the rest back. The UI shows this quote before the player
 * commits, so nobody discovers the exchange rate by losing a winter's tools.
 */
export function quoteTrade(
  town: Town,
  relationship: number,
  offer: Record<string, number>,
  cornAvailable: number,
): TradeQuote {
  const percent = BAND_RATE_PERCENT[relationshipBand(relationship)]
  const accepted: Record<string, number> = {}
  let corn = 0
  let remaining = Math.max(0, cornAvailable)

  // Sorted so the quote is identical however the offer object was built.
  for (const resourceId of Object.keys(offer).sort()) {
    const quantity = offer[resourceId] ?? 0
    const cordialRate = town.wants[resourceId]
    if (quantity <= 0 || cordialRate === undefined) continue

    const rate = Math.floor((cordialRate * percent) / 100)
    if (rate <= 0) continue

    const take = Math.min(quantity, Math.floor(remaining / rate))
    if (take <= 0) continue

    accepted[resourceId] = take
    corn += take * rate
    remaining -= take * rate
  }

  return { accepted, corn }
}

export function storageCapacity(state: GameState, content: Content, scenario: Scenario): number {
  let capacity = scenario.baseStorage
  for (const building of state.buildings) {
    if (!building.complete) continue
    capacity += content.buildings.get(building.type)?.storage ?? 0
  }
  return capacity
}

export function totalStored(state: GameState): number {
  let total = 0
  for (const amount of Object.values(state.stores)) total += amount
  return total
}

/** Beds available across all completed dwellings. */
export function housingCapacity(state: GameState, content: Content): number {
  let housing = 0
  for (const building of state.buildings) {
    if (!building.complete) continue
    housing += content.buildings.get(building.type)?.housing ?? 0
  }
  return housing
}

export interface FoodOutlook {
  /** Everything edible currently in the store. */
  stored: number
  /** Food eaten per day at the colony's present size. */
  perDay: number
  /** Whole days the store will last if nothing more is produced. */
  daysRemaining: number
}

/**
 * The one number that decides the chapter. Fresh fish is eaten the day it
 * lands, so a raw resource count reads as zero and looks like a broken wharf:
 * what the player needs to see is how long the colony can last.
 */
export function foodOutlook(state: GameState, content: Content): FoodOutlook {
  let stored = 0
  for (const resource of content.resourceList) {
    if (resource.edible) stored += state.stores[resource.id] ?? 0
  }
  const perDay = Math.ceil(state.colonists / COLONISTS_PER_FOOD_UNIT)
  return {
    stored,
    perDay,
    daysRemaining: perDay === 0 ? Infinity : Math.floor(stored / perDay),
  }
}

export type PlacementError =
  | 'unknown_building'
  | 'out_of_bounds'
  | 'occupied'
  | 'wrong_terrain'
  | 'missing_adjacency'
  | 'cannot_afford'

/**
 * Why a building may not go on a tile, or null if it may. The UI calls this to
 * grey out illegal tiles, and the reducer calls it again to enforce the rules.
 */
export function placementError(
  state: GameState,
  content: Content,
  buildingType: string,
  x: number,
  y: number,
): PlacementError | null {
  const building = content.buildings.get(buildingType)
  if (!building) return 'unknown_building'

  const terrain = terrainAt(state.world, x, y)
  if (terrain === undefined) return 'out_of_bounds'

  if (state.buildings.some((placed) => placed.x === x && placed.y === y)) return 'occupied'

  const terrainInfo = content.terrains.get(terrain)
  const allowed = building.placement.terrain
  if (!terrainInfo?.buildable || (allowed && !allowed.includes(terrain))) return 'wrong_terrain'

  const required = building.placement.adjacentTerrain
  if (required) {
    const satisfied = neighbours(state.world, x, y).some((tile) => {
      const neighbourTerrain = terrainAt(state.world, tile.x, tile.y)
      return neighbourTerrain !== undefined && required.includes(neighbourTerrain)
    })
    if (!satisfied) return 'missing_adjacency'
  }

  for (const [resourceId, amount] of Object.entries(building.cost)) {
    if ((state.stores[resourceId] ?? 0) < amount) return 'cannot_afford'
  }

  return null
}

export const PLACEMENT_MESSAGES: Record<PlacementError, string> = {
  unknown_building: 'No such building.',
  out_of_bounds: 'That is beyond the map.',
  occupied: 'Something already stands here.',
  wrong_terrain: 'This ground will not serve.',
  missing_adjacency: 'This must be built beside the right ground.',
  cannot_afford: 'The store has not the materials.',
}
