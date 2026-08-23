import type { Content, Scenario } from '@vs/content'
import { COLONISTS_PER_FOOD_UNIT } from './balance.js'
import { Rng } from './rng.js'
import { generateWorld, neighbours, terrainAt, type World } from './world.js'

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
