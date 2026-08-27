import { useCallback, useEffect, useMemo, useState } from 'react'
import { content } from '@vs/content'
import { formatDate, housingCapacity, placementError, storageCapacity } from '@vs/sim'
import { MapView } from './MapView.js'
import { useGame, type Speed } from './useGame.js'
import { BuildMenu } from './ui/BuildMenu.js'
import { Journal } from './ui/Journal.js'
import { ResourceBar } from './ui/ResourceBar.js'
import { SourceCardModal } from './ui/SourceCardModal.js'
import { TradePanel } from './ui/TradePanel.js'
import { TileInspector } from './ui/TileInspector.js'

const SCENARIO_ID = 'jamestown_1607'

/** Sleeping rough only kills once the cold arrives, so only warn from autumn. */
const coldComing = (season: string): boolean => season === 'autumn' || season === 'winter'
const SPEEDS: { value: Speed; label: string }[] = [
  { value: 0, label: 'Pause' },
  { value: 1, label: 'Slow' },
  { value: 2, label: 'Normal' },
  { value: 3, label: 'Fast' },
]

export function App() {
  const { game, version, speed, setSpeed, execute, notice, clearNotice } = useGame(SCENARIO_ID)
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null)
  const [readCards, setReadCards] = useState<string[]>([])

  const state = game.state
  const date = game.date

  // A newly revealed source stops the clock: reading it is the point.
  const unreadCard = state.discoveredSourceCards.find((id) => !readCards.includes(id))
  const card = unreadCard ? content.sourceCards.get(unreadCard) : undefined

  useEffect(() => {
    if (card) setSpeed(0)
  }, [card, setSpeed])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedBuilding(null)
      if (event.key === ' ') {
        event.preventDefault()
        setSpeed(speed === 0 ? 2 : 0)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [speed, setSpeed])

  const ghost = useMemo(() => {
    if (!selectedBuilding || !hovered) return null
    return { valid: placementError(state, content, selectedBuilding, hovered.x, hovered.y) === null }
    // version is the signal that stores or buildings changed under us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuilding, hovered, state, version])

  const onSelectTile = useCallback(
    (tile: { x: number; y: number }) => {
      if (!selectedBuilding) return
      const result = execute({ kind: 'place', building: selectedBuilding, x: tile.x, y: tile.y })
      if (result.ok) setSelectedBuilding(null)
    },
    [execute, selectedBuilding],
  )

  const onDemolish = useCallback((id: number) => execute({ kind: 'demolish', id }), [execute])

  const capacity = storageCapacity(state, content, game.scenario)
  const housing = housingCapacity(state, content)
  const unhoused = Math.max(0, state.colonists - housing)

  return (
    <div className="app">
      <header className="topbar">
        <div className="titles">
          <h1>Virginia Settlers</h1>
          <p className="subtitle">
            {game.scenario.name} — {game.scenario.year}
          </p>
        </div>

        <div className="clock">
          <strong>{formatDate(date)}</strong>
          <span className={`season season-${date.season}`}>{date.season}</span>
          <span>Day {state.day}</span>
        </div>

        <div className="people">
          <strong>{state.colonists}</strong> alive
          {state.deaths > 0 && <span className="muted"> · {state.deaths} lost</span>}
          {unhoused > 0 && (
            <span className={coldComing(date.season) ? 'warn' : 'muted'}>
              {' '}
              · {unhoused} without shelter
            </span>
          )}
        </div>

        <div className="speeds" role="group" aria-label="Game speed">
          {SPEEDS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={speed === option.value ? 'selected' : ''}
              aria-pressed={speed === option.value}
              onClick={() => setSpeed(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <ResourceBar state={state} capacity={capacity} />

      {notice && (
        <p className="notice" role="status" onAnimationEnd={clearNotice}>
          {notice}
        </p>
      )}

      <main className="layout">
        <div className="map-column">
          <MapView
            world={state.world}
            buildings={state.buildings}
            towns={state.towns}
            ghost={ghost}
            onHover={setHovered}
            onSelect={onSelectTile}
          />
        </div>

        <aside className="sidebar">
          <BuildMenu state={state} selected={selectedBuilding} onSelect={setSelectedBuilding} />
          <TradePanel state={state} onCommand={execute} />
          <TileInspector state={state} tile={hovered} onDemolish={onDemolish} />
          <Journal entries={state.log} />
        </aside>
      </main>

      {state.outcome.status !== 'playing' && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>{state.outcome.status === 'survived' ? 'The colony holds' : 'The colony is lost'}</h2>
            <p>
              {state.outcome.status === 'survived'
                ? `${state.colonists} colonists saw the spring. ${state.deaths} did not.`
                : state.outcome.reason}
            </p>
            <p className="muted">
              Of the roughly 240 people at Jamestown in the autumn of 1609, about 60 were alive when
              ships arrived the following spring.
            </p>
          </div>
        </div>
      )}

      {card && (
        <SourceCardModal card={card} onDismiss={() => setReadCards((read) => [...read, card.id])} />
      )}
    </div>
  )
}
