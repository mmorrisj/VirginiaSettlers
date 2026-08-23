import { content } from '@vs/content'
import { terrainAt, type GameState, type PlacedBuilding } from '@vs/sim'

interface Props {
  state: GameState
  tile: { x: number; y: number } | null
  onDemolish: (id: number) => void
}

const IDLE_MESSAGES: Record<string, string> = {
  unstaffed: 'Nobody is working here.',
  missing_inputs: 'Waiting on materials.',
  storage_full: 'The store is full.',
}

function buildingAt(state: GameState, x: number, y: number): PlacedBuilding | undefined {
  return state.buildings.find((building) => building.x === x && building.y === y)
}

export function TileInspector({ state, tile, onDemolish }: Props) {
  if (!tile) {
    return (
      <section className="panel">
        <h2>Ground</h2>
        <p className="muted">Point at the map to inspect a tile.</p>
      </section>
    )
  }

  const terrainId = terrainAt(state.world, tile.x, tile.y)
  const terrain = terrainId ? content.terrains.get(terrainId) : undefined
  const placed = buildingAt(state, tile.x, tile.y)
  const definition = placed ? content.buildings.get(placed.type) : undefined

  return (
    <section className="panel">
      <h2>{definition?.name ?? terrain?.name ?? 'Unknown ground'}</h2>
      {!placed && <p className="muted">{terrain?.buildable ? 'Open ground.' : 'Nothing can be built here.'}</p>}

      {placed && definition && (
        <>
          <p className="muted">{definition.description}</p>
          {!placed.complete && (
            <p>Under construction — {Math.floor(placed.built / Math.max(1, definition.buildDays))}% done.</p>
          )}
          {placed.complete && (
            <p>
              {placed.staff} of {definition.workers} at work.
              {placed.idle ? ` ${IDLE_MESSAGES[placed.idle] ?? ''}` : ''}
            </p>
          )}
          <button type="button" className="danger" onClick={() => onDemolish(placed.id)}>
            Pull down (half the materials returned)
          </button>
        </>
      )}
    </section>
  )
}
