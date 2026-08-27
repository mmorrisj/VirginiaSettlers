import { useState } from 'react'
import { content } from '@vs/content'
import { quoteTrade, relationshipBand, type Command, type GameState, type TownState } from '@vs/sim'

interface Props {
  state: GameState
  onCommand: (command: Command) => void
}

const BAND_LABEL: Record<string, string> = {
  hostile: 'hostile',
  wary: 'wary',
  cordial: 'cordial',
  allied: 'allied',
}

/** Sensible offer sizes for a ten-year-old: no free-typing of numbers. */
const STEPS = [1, 5, 10, 25]

export function TradePanel({ state, onCommand }: Props) {
  return (
    <section className="panel">
      <h2>Neighbours</h2>
      <p className="muted panel-intro">
        The Powhatan towns have the corn. What they will give depends on how the colony has treated
        them.
      </p>
      {state.towns.map((town) => (
        <TownCard key={town.id} state={state} town={town} onCommand={onCommand} />
      ))}
    </section>
  )
}

function TownCard({
  state,
  town,
  onCommand,
}: {
  state: GameState
  town: TownState
  onCommand: (command: Command) => void
}) {
  const definition = content.towns.get(town.id)
  const wanted = Object.keys(definition?.wants ?? {})
  const [good, setGood] = useState<string>(wanted[0] ?? '')
  const [quantity, setQuantity] = useState<number>(5)

  if (!definition) return null

  const band = relationshipBand(town.relationship)
  const away = town.partyReturnsOn !== null
  const daysOut = away ? Math.max(0, (town.partyReturnsOn ?? 0) - state.day) : 0
  const held = state.stores[good] ?? 0
  const offer = { [good]: Math.min(quantity, held) }
  const quote = quoteTrade(definition, town.relationship, offer, town.cornStock)
  const acceptedCount = Object.values(quote.accepted).reduce((sum, n) => sum + n, 0)

  return (
    <article className={`town-card band-${band}`}>
      <header className="town-head">
        <strong>{definition.name}</strong>
        <span className={`band-badge band-${band}`}>{BAND_LABEL[band]}</span>
      </header>

      <div className="relationship-bar" role="img" aria-label={`Goodwill ${town.relationship} of 100`}>
        <span style={{ width: `${town.relationship}%` }} />
      </div>

      <p className="town-line">
        Corn to spare: <strong>{town.cornStock}</strong>
      </p>

      {away ? (
        <p className="town-line muted">
          A party is on the road — back in {daysOut} {daysOut === 1 ? 'day' : 'days'}.
        </p>
      ) : (
        <>
          <div className="offer-row">
            <select value={good} onChange={(event) => setGood(event.target.value)} aria-label="Trade good">
              {wanted.map((resourceId) => (
                <option key={resourceId} value={resourceId}>
                  {content.resources.get(resourceId)?.name ?? resourceId} ({state.stores[resourceId] ?? 0})
                </option>
              ))}
            </select>
            <div className="steps" role="group" aria-label="How much to offer">
              {STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  className={quantity === step ? 'selected' : ''}
                  aria-pressed={quantity === step}
                  onClick={() => setQuantity(step)}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>

          <p className="quote">
            {held === 0 ? (
              <span className="muted">The store has no {content.resources.get(good)?.name ?? good}.</span>
            ) : quote.corn > 0 ? (
              <>
                They will give <strong>{quote.corn} corn</strong> for {acceptedCount}{' '}
                {content.resources.get(good)?.name ?? good}
                {acceptedCount < (offer[good] ?? 0) && <span className="muted"> (the rest comes home)</span>}
              </>
            ) : (
              <span className="muted">
                {band === 'hostile' ? 'They will not deal with the colony.' : 'They cannot pay for that.'}
              </span>
            )}
          </p>

          <div className="town-actions">
            <button
              type="button"
              className="primary"
              disabled={quote.corn <= 0}
              onClick={() => onCommand({ kind: 'trade', town: town.id, offer })}
            >
              Trade
            </button>
            <button
              type="button"
              disabled={held === 0}
              title="Give with nothing asked back. Buys goodwill, not corn."
              onClick={() => onCommand({ kind: 'gift', town: town.id, offer })}
            >
              Give
            </button>
            <button
              type="button"
              className="danger"
              title="Take corn by force. It works today."
              onClick={() => onCommand({ kind: 'demand', town: town.id })}
            >
              Take by force
            </button>
          </div>
        </>
      )}
    </article>
  )
}
