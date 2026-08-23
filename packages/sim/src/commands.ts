import type { Content, Scenario } from '@vs/content'
import { tick, log } from './tick.js'
import { placementError, PLACEMENT_MESSAGES, type GameState } from './state.js'

/**
 * Everything a player can do. A saved game is the scenario id plus this list,
 * replayed from the start, which keeps saves tiny and makes any bug in a
 * student's colony reproducible from their save file alone.
 */
export type Command =
  | { kind: 'place'; building: string; x: number; y: number }
  | { kind: 'demolish'; id: number }
  | { kind: 'advance'; days: number }

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
  }
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
