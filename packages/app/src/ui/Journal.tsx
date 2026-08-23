import { useEffect, useRef } from 'react'
import type { LogEntry } from '@vs/sim'

interface Props {
  entries: readonly LogEntry[]
}

/**
 * The colony journal. It is also the artifact a teacher can ask a student to
 * export and explain, so entries are written as plain sentences.
 */
export function Journal({ entries }: Props) {
  const listRef = useRef<HTMLOListElement>(null)
  const recent = entries.slice(-40)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [entries.length])

  return (
    <section className="panel journal">
      <h2>Journal</h2>
      <ol ref={listRef} className="journal-list" aria-live="polite">
        {recent.map((entry, index) => (
          <li key={`${entry.day}-${index}`} className={`journal-entry ${entry.kind}`}>
            <span className="journal-day">Day {entry.day}</span>
            <span>{entry.message}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
