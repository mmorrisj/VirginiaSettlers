import { content, type Building } from '@vs/content'
import type { GameState } from '@vs/sim'

interface Props {
  state: GameState
  selected: string | null
  onSelect: (buildingType: string | null) => void
}

function affordable(state: GameState, building: Building): boolean {
  return Object.entries(building.cost).every(
    ([resourceId, amount]) => (state.stores[resourceId] ?? 0) >= amount,
  )
}

function describeCost(building: Building): string {
  const parts = Object.entries(building.cost).map(
    ([resourceId, amount]) => `${amount} ${content.resources.get(resourceId)?.name ?? resourceId}`,
  )
  return parts.length > 0 ? parts.join(', ') : 'nothing'
}

export function BuildMenu({ state, selected, onSelect }: Props) {
  return (
    <section className="panel">
      <h2>Build</h2>
      <ul className="build-list">
        {content.buildingList.map((building) => {
          const canAfford = affordable(state, building)
          const isSelected = selected === building.id
          return (
            <li key={building.id}>
              <button
                type="button"
                className={`build-option ${isSelected ? 'selected' : ''}`}
                disabled={!canAfford && !isSelected}
                aria-pressed={isSelected}
                onClick={() => onSelect(isSelected ? null : building.id)}
              >
                <span className="build-swatch" style={{ background: building.color }} aria-hidden="true" />
                <span className="build-text">
                  <strong>{building.name}</strong>
                  <span className="build-cost">{describeCost(building)}</span>
                </span>
              </button>
              {isSelected && <p className="build-description">{building.description}</p>}
            </li>
          )
        })}
      </ul>
      {selected && <p className="hint">Click a tile to build. Press Escape to cancel.</p>}
    </section>
  )
}
