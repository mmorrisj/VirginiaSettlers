import type { SourceCard } from '@vs/content'

interface Props {
  card: SourceCard
  onDismiss: () => void
}

/**
 * A real document, stopped in front of the player. The question matters more
 * than the excerpt: knowing who wrote a source and why is the skill the
 * curriculum is actually after.
 */
export function SourceCardModal({ card, onDismiss }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="source-title">
      <div className="modal source-card">
        <p className="source-kicker">From the record</p>
        <h2 id="source-title">{card.title}</h2>
        <blockquote>{card.excerpt}</blockquote>
        <p className="source-attribution">
          {card.author}, {card.year}
        </p>
        <p className="source-context">{card.context}</p>
        <p className="source-question">
          <strong>Think about it:</strong> {card.question}
        </p>
        <button type="button" className="primary" onClick={onDismiss} autoFocus>
          Back to the colony
        </button>
      </div>
    </div>
  )
}
