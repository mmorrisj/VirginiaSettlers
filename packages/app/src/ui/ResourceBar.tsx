import { content } from '@vs/content'
import { foodOutlook, type GameState } from '@vs/sim'

interface Props {
  state: GameState
  capacity: number
}

export function ResourceBar({ state, capacity }: Props) {
  const stored = Object.values(state.stores).reduce((sum, amount) => sum + amount, 0)
  const nearlyFull = stored > capacity * 0.9
  const food = foodOutlook(state, content)
  const hungry = food.daysRemaining < 30

  return (
    <div className="resource-bar">
      {content.resourceList
        .filter((resource) => resource.tracked)
        .map((resource) => (
          <span key={resource.id} className="resource">
            <span className={`swatch swatch-${resource.icon}`} aria-hidden="true" />
            <span className="resource-name">{resource.name}</span>
            <strong>{state.stores[resource.id] ?? 0}</strong>
          </span>
        ))}

      <span className={`resource food-outlook ${hungry ? 'warn' : ''}`}>
        <span className="resource-name">Food lasts</span>
        <strong>{Number.isFinite(food.daysRemaining) ? `${food.daysRemaining} days` : '—'}</strong>
        <span className="rate">eating {food.perDay}/day</span>
      </span>

      <span className={`resource store-total ${nearlyFull ? 'warn' : ''}`}>
        <span className="resource-name">Store</span>
        <strong>
          {stored} / {capacity}
        </strong>
      </span>
    </div>
  )
}
