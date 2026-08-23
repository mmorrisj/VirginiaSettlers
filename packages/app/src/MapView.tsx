import { useEffect, useRef } from 'react'
import { content } from '@vs/content'
import type { PlacedBuilding, World } from '@vs/sim'
import { MapRenderer } from './renderer.js'

interface Props {
  world: World
  buildings: readonly PlacedBuilding[]
  /** Null when no building is selected; otherwise whether the hovered tile is legal. */
  ghost: { valid: boolean } | null
  onHover: (tile: { x: number; y: number } | null) => void
  onSelect: (tile: { x: number; y: number }) => void
}

export function MapView({ world, buildings, ghost, onHover, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<MapRenderer | null>(null)

  // Callbacks change every render; route them through refs so the expensive
  // WebGL context is created once for the life of the map.
  const onHoverRef = useRef(onHover)
  const onSelectRef = useRef(onSelect)
  onHoverRef.current = onHover
  onSelectRef.current = onSelect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: MapRenderer | null = null
    let cancelled = false

    void MapRenderer.create(host, world, content, {
      onHover: (tile) => onHoverRef.current(tile),
      onSelect: (tile) => onSelectRef.current(tile),
    }).then((created) => {
      if (cancelled) {
        created.destroy()
        return
      }
      renderer = created
      rendererRef.current = created
    })

    return () => {
      cancelled = true
      renderer?.destroy()
      rendererRef.current = null
    }
  }, [world])

  useEffect(() => {
    rendererRef.current?.setBuildings(buildings)
  })

  useEffect(() => {
    rendererRef.current?.setGhost(ghost)
  })

  return <div ref={hostRef} className="map-host" />
}
