import { Application, Container, Graphics, Text } from 'pixi.js'
import type { Content } from '@vs/content'
import type { PlacedBuilding, TownState, World } from '@vs/sim'

export const TILE_SIZE = 26

export interface RendererCallbacks {
  onHover(tile: { x: number; y: number } | null): void
  onSelect(tile: { x: number; y: number }): void
}

/**
 * Draws the colony. Deliberately knows nothing about React or about the rules:
 * it is handed a world, a list of buildings and a ghost, and paints them. That
 * boundary is what lets the simulation be tested without a browser.
 */
export class MapRenderer {
  private readonly app = new Application()
  private readonly terrainLayer = new Graphics()
  private readonly buildingLayer = new Graphics()
  private readonly townLayer = new Graphics()
  private readonly townLabels = new Container()
  private readonly overlayLayer = new Graphics()
  private hovered: { x: number; y: number } | null = null
  private ghost: { valid: boolean } | null = null
  private destroyed = false

  private constructor(
    private readonly world: World,
    private readonly content: Content,
    private readonly callbacks: RendererCallbacks,
  ) {}

  static async create(
    parent: HTMLElement,
    world: World,
    content: Content,
    callbacks: RendererCallbacks,
  ): Promise<MapRenderer> {
    const renderer = new MapRenderer(world, content, callbacks)
    await renderer.init(parent)
    return renderer
  }

  private async init(parent: HTMLElement): Promise<void> {
    await this.app.init({
      width: this.world.width * TILE_SIZE,
      height: this.world.height * TILE_SIZE,
      background: '#14202b',
      antialias: false,
      // Chromebooks are the target hardware; cap the buffer rather than render
      // four times the pixels on a high-DPI classroom display.
      resolution: Math.min(globalThis.devicePixelRatio ?? 1, 2),
      autoDensity: true,
    })

    // An await happened; the component may have unmounted in the meantime.
    if (this.destroyed) {
      this.app.destroy(true)
      return
    }

    const scene = new Container()
    scene.addChild(
      this.terrainLayer,
      this.buildingLayer,
      this.townLayer,
      this.townLabels,
      this.overlayLayer,
    )
    this.app.stage.addChild(scene)

    this.app.canvas.classList.add('map-canvas')
    parent.appendChild(this.app.canvas)

    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('pointermove', (event) => {
      const tile = this.toTile(event.global.x, event.global.y)
      if (tile?.x === this.hovered?.x && tile?.y === this.hovered?.y) return
      this.hovered = tile
      this.drawOverlay()
      this.callbacks.onHover(tile)
    })
    this.app.stage.on('pointerleave', () => {
      this.hovered = null
      this.drawOverlay()
      this.callbacks.onHover(null)
    })
    this.app.stage.on('pointertap', (event) => {
      const tile = this.toTile(event.global.x, event.global.y)
      if (tile) this.callbacks.onSelect(tile)
    })

    this.drawTerrain()
  }

  private toTile(globalX: number, globalY: number): { x: number; y: number } | null {
    const x = Math.floor(globalX / TILE_SIZE)
    const y = Math.floor(globalY / TILE_SIZE)
    if (x < 0 || y < 0 || x >= this.world.width || y >= this.world.height) return null
    return { x, y }
  }

  private drawTerrain(): void {
    this.terrainLayer.clear()
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const terrainId = this.world.tiles[y * this.world.width + x]
        const colour = (terrainId && this.content.terrains.get(terrainId)?.color) ?? '#000000'
        this.terrainLayer.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(colour)
      }
    }
  }

  setBuildings(buildings: readonly PlacedBuilding[]): void {
    this.buildingLayer.clear()
    const inset = 3

    for (const building of buildings) {
      const definition = this.content.buildings.get(building.type)
      if (!definition) continue

      const x = building.x * TILE_SIZE + inset
      const y = building.y * TILE_SIZE + inset
      const size = TILE_SIZE - inset * 2

      this.buildingLayer
        .rect(x, y, size, size)
        .fill({ color: definition.color, alpha: building.complete ? 1 : 0.45 })
        .stroke({ color: '#1b1108', width: 1 })

      if (!building.complete) {
        const fraction = Math.min(1, building.built / Math.max(1, definition.buildDays * 100))
        this.buildingLayer
          .rect(x, y + size - 3, size * fraction, 3)
          .fill('#f0d27a')
      } else if (building.idle) {
        // A small red pip beats a wall of text for a nine-year-old scanning the map.
        this.buildingLayer.circle(x + size - 3, y + 3, 3).fill('#e05a4a')
      }
    }
  }

  /**
   * Powhatan towns. Drawn as ringed markers rather than square buildings so it
   * reads at a glance that these are neighbours, not colony property.
   */
  setTowns(towns: readonly TownState[]): void {
    this.townLayer.clear()
    this.townLabels.removeChildren()

    for (const town of towns) {
      const definition = this.content.towns.get(town.id)
      if (!definition) continue

      const cx = town.x * TILE_SIZE + TILE_SIZE / 2
      const cy = town.y * TILE_SIZE + TILE_SIZE / 2

      this.townLayer
        .circle(cx, cy, TILE_SIZE * 0.42)
        .fill(definition.color)
        .stroke({ color: '#241a10', width: 2 })
      this.townLayer.circle(cx, cy, TILE_SIZE * 0.18).fill('#241a10')

      // A party on the road gets a halo, so the map shows what the colony is
      // waiting on without opening a panel.
      if (town.partyReturnsOn !== null) {
        this.townLayer.circle(cx, cy, TILE_SIZE * 0.66).stroke({ color: '#f0d27a', width: 2 })
      }

      const label = new Text({
        text: definition.name,
        style: {
          fontFamily: 'Georgia, serif',
          fontSize: 11,
          fill: '#f2e9d8',
          stroke: { color: '#14202b', width: 3 },
        },
      })
      label.anchor.set(0.5, 0)
      label.position.set(cx, cy + TILE_SIZE * 0.5)
      this.townLabels.addChild(label)
    }
  }

  setGhost(ghost: { valid: boolean } | null): void {
    this.ghost = ghost
    this.drawOverlay()
  }

  private drawOverlay(): void {
    this.overlayLayer.clear()
    if (!this.hovered) return

    const { x, y } = this.hovered
    const colour = this.ghost ? (this.ghost.valid ? '#7ee08a' : '#e05a4a') : '#ffffff'
    this.overlayLayer
      .rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      .fill({ color: colour, alpha: this.ghost ? 0.35 : 0.12 })
      .stroke({ color: colour, width: 2 })
  }

  destroy(): void {
    this.destroyed = true
    // init() may still be awaiting; it checks the flag and cleans up itself.
    if (this.app.renderer) this.app.destroy(true)
  }
}
