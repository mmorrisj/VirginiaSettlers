import type { Content, Scenario } from '@vs/content'
import {
  COLONISTS_PER_FOOD_UNIT,
  CONSTRUCTION_CREW,
  FOOD_YIELD_BY_SEASON,
  MAX_LOG_ENTRIES,
  STARVATION_DEATH_RATE,
  STARVATION_GRACE_DAYS,
  SURVIVAL_GOAL_DAYS,
  WINTER_EXPOSURE_DEATH_CHANCE,
} from './balance.js'
import { dateFrom, formatDate } from './calendar.js'
import { Rng } from './rng.js'
import {
  housingCapacity,
  storageCapacity,
  totalStored,
  type GameState,
  type LogKind,
  type PlacedBuilding,
} from './state.js'

/** Progress is tracked in hundredths so the simulation stays integer-only. */
const PROGRESS_SCALE = 100

export function log(state: GameState, kind: LogKind, message: string): void {
  state.log.push({ day: state.day, kind, message })
  if (state.log.length > MAX_LOG_ENTRIES) state.log.splice(0, state.log.length - MAX_LOG_ENTRIES)
}

/**
 * Advances the colony by one day. This is the only place time moves, and it
 * uses no clock and no unseeded randomness, so the same actions on the same
 * seed always produce the same colony.
 */
export function tick(state: GameState, content: Content, scenario: Scenario): void {
  if (state.outcome.status !== 'playing') return

  state.day += 1
  const rng = Rng.deserialize(state.rngState)
  const date = dateFrom(scenario.startDay, state.day)

  allocateLabour(state, content)
  advanceConstruction(state, content)
  produce(state, content, scenario, date.season)
  const fed = consumeFood(state, content)
  applyHunger(state, fed)
  applyExposure(state, content, rng, date.season)
  resolveOutcome(state, date.season)

  state.rngState = rng.serialize()
}

/**
 * Colonists are assigned in placement order: construction sites first, so a
 * half-built storehouse is never stalled by a fully staffed saw pit.
 */
function allocateLabour(state: GameState, content: Content): void {
  let available = state.colonists

  for (const building of state.buildings) {
    if (building.complete) continue
    const crew = Math.min(CONSTRUCTION_CREW, available)
    building.staff = crew
    available -= crew
  }

  for (const building of state.buildings) {
    if (!building.complete) continue
    const needed = content.buildings.get(building.type)?.workers ?? 0
    const crew = Math.min(needed, available)
    building.staff = crew
    available -= crew
  }
}

function advanceConstruction(state: GameState, content: Content): void {
  for (const building of state.buildings) {
    if (building.complete) continue
    if (building.staff === 0) {
      building.idle = 'unstaffed'
      continue
    }

    building.idle = null
    building.built += Math.floor((building.staff * PROGRESS_SCALE) / CONSTRUCTION_CREW)

    const definition = content.buildings.get(building.type)
    if (!definition) continue
    if (building.built < definition.buildDays * PROGRESS_SCALE) continue

    building.complete = true
    building.built = definition.buildDays * PROGRESS_SCALE
    log(state, 'good', `${definition.name} finished.`)
    revealSourceCard(state, content, definition.sourceCard)
  }
}

function revealSourceCard(state: GameState, content: Content, cardId: string | undefined): void {
  if (!cardId || state.discoveredSourceCards.includes(cardId)) return
  const card = content.sourceCards.get(cardId)
  if (!card) return
  state.discoveredSourceCards.push(cardId)
  log(state, 'source', `A record comes to light: "${card.title}" (${card.author}, ${card.year}).`)
}

function produce(state: GameState, content: Content, scenario: Scenario, season: string): void {
  const capacity = storageCapacity(state, content, scenario)

  for (const building of state.buildings) {
    if (!building.complete) continue
    const definition = content.buildings.get(building.type)
    const recipe = definition?.production
    if (!definition || !recipe) continue

    const staffPercent =
      definition.workers === 0
        ? PROGRESS_SCALE
        : Math.floor((building.staff * PROGRESS_SCALE) / definition.workers)

    if (staffPercent === 0) {
      building.idle = 'unstaffed'
      continue
    }

    const producesFood = Object.keys(recipe.outputs).some(
      (resourceId) => content.resources.get(resourceId)?.edible,
    )
    const seasonPercent = producesFood ? (FOOD_YIELD_BY_SEASON[season] ?? PROGRESS_SCALE) : PROGRESS_SCALE

    building.progress += Math.floor((staffPercent * seasonPercent) / PROGRESS_SCALE)
    building.idle = null

    const threshold = recipe.intervalDays * PROGRESS_SCALE
    while (building.progress >= threshold) {
      const blocked = runRecipe(state, content, building, capacity)
      if (blocked) {
        // Hold at the threshold: work resumes the moment the blockage clears.
        building.progress = threshold
        building.idle = blocked
        break
      }
      building.progress -= threshold
    }
  }
}

/** Runs one completion of a building's recipe, or reports why it could not. */
function runRecipe(
  state: GameState,
  content: Content,
  building: PlacedBuilding,
  capacity: number,
): 'missing_inputs' | 'storage_full' | null {
  const recipe = content.buildings.get(building.type)?.production
  if (!recipe) return null

  for (const [resourceId, amount] of Object.entries(recipe.inputs)) {
    if ((state.stores[resourceId] ?? 0) < amount) return 'missing_inputs'
  }

  let free = capacity - totalStored(state)
  const inputTotal = Object.values(recipe.inputs).reduce((sum, amount) => sum + amount, 0)
  const outputTotal = Object.values(recipe.outputs).reduce((sum, amount) => sum + amount, 0)
  if (free + inputTotal < outputTotal) return 'storage_full'

  for (const [resourceId, amount] of Object.entries(recipe.inputs)) {
    state.stores[resourceId] = (state.stores[resourceId] ?? 0) - amount
    free += amount
  }
  for (const [resourceId, amount] of Object.entries(recipe.outputs)) {
    const added = Math.min(amount, free)
    state.stores[resourceId] = (state.stores[resourceId] ?? 0) + added
    state.produced[resourceId] = (state.produced[resourceId] ?? 0) + added
    free -= added
  }
  return null
}

/**
 * Feeds the colony, spending the most perishable food first. Returns true if
 * everyone got a full ration.
 */
function consumeFood(state: GameState, content: Content): boolean {
  let needed = Math.ceil(state.colonists / COLONISTS_PER_FOOD_UNIT)
  if (needed === 0) return true

  const larder = content.resourceList
    .filter((resource) => resource.edible)
    .sort((a, b) => b.perishability - a.perishability || a.id.localeCompare(b.id))

  for (const resource of larder) {
    if (needed === 0) break
    const eaten = Math.min(needed, state.stores[resource.id] ?? 0)
    state.stores[resource.id] = (state.stores[resource.id] ?? 0) - eaten
    needed -= eaten
  }

  return needed === 0
}

function applyHunger(state: GameState, fed: boolean): void {
  if (fed) {
    if (state.hungerDays >= STARVATION_GRACE_DAYS) {
      log(state, 'good', 'The store holds again. The colony eats.')
    }
    state.hungerDays = 0
    return
  }

  state.hungerDays += 1
  if (state.hungerDays === 1) {
    log(state, 'warning', 'Rations are short. There is not enough for everyone.')
    return
  }
  if (state.hungerDays <= STARVATION_GRACE_DAYS) return

  const lost = Math.min(state.colonists, Math.max(1, Math.floor(state.colonists * STARVATION_DEATH_RATE)))
  state.colonists -= lost
  state.deaths += lost
  log(state, 'death', `${lost} ${lost === 1 ? 'colonist dies' : 'colonists die'} of hunger.`)
}

function applyExposure(state: GameState, content: Content, rng: Rng, season: string): void {
  if (season !== 'winter' || state.colonists === 0) return

  const unhoused = Math.max(0, state.colonists - housingCapacity(state, content))
  if (unhoused === 0) return

  const risk = WINTER_EXPOSURE_DEATH_CHANCE * Math.min(1, unhoused / state.colonists)
  if (!rng.chance(risk)) return

  state.colonists -= 1
  state.deaths += 1
  log(state, 'death', 'A colonist dies of the cold, having no roof.')
}

function resolveOutcome(state: GameState, season: string): void {
  if (state.colonists <= 0) {
    state.outcome = { status: 'failed', day: state.day, reason: 'The colony did not survive.' }
    log(state, 'death', 'The last colonist is gone. Jamestown is abandoned.')
    return
  }

  if (state.day >= SURVIVAL_GOAL_DAYS && season === 'spring') {
    state.outcome = { status: 'survived', day: state.day }
    log(state, 'good', `Spring. ${state.colonists} are alive, and the colony holds.`)
  }
}

export { formatDate }
