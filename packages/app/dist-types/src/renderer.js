import { Application, Container, Graphics } from 'pixi.js';
export const TILE_SIZE = 26;
/**
 * Draws the colony. Deliberately knows nothing about React or about the rules:
 * it is handed a world, a list of buildings and a ghost, and paints them. That
 * boundary is what lets the simulation be tested without a browser.
 */
export class MapRenderer {
    world;
    content;
    callbacks;
    app = new Application();
    terrainLayer = new Graphics();
    buildingLayer = new Graphics();
    overlayLayer = new Graphics();
    hovered = null;
    ghost = null;
    destroyed = false;
    constructor(world, content, callbacks) {
        this.world = world;
        this.content = content;
        this.callbacks = callbacks;
    }
    static async create(parent, world, content, callbacks) {
        const renderer = new MapRenderer(world, content, callbacks);
        await renderer.init(parent);
        return renderer;
    }
    async init(parent) {
        await this.app.init({
            width: this.world.width * TILE_SIZE,
            height: this.world.height * TILE_SIZE,
            background: '#14202b',
            antialias: false,
            // Chromebooks are the target hardware; cap the buffer rather than render
            // four times the pixels on a high-DPI classroom display.
            resolution: Math.min(globalThis.devicePixelRatio ?? 1, 2),
            autoDensity: true,
        });
        // An await happened; the component may have unmounted in the meantime.
        if (this.destroyed) {
            this.app.destroy(true);
            return;
        }
        const scene = new Container();
        scene.addChild(this.terrainLayer, this.buildingLayer, this.overlayLayer);
        this.app.stage.addChild(scene);
        this.app.canvas.classList.add('map-canvas');
        parent.appendChild(this.app.canvas);
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;
        this.app.stage.on('pointermove', (event) => {
            const tile = this.toTile(event.global.x, event.global.y);
            if (tile?.x === this.hovered?.x && tile?.y === this.hovered?.y)
                return;
            this.hovered = tile;
            this.drawOverlay();
            this.callbacks.onHover(tile);
        });
        this.app.stage.on('pointerleave', () => {
            this.hovered = null;
            this.drawOverlay();
            this.callbacks.onHover(null);
        });
        this.app.stage.on('pointertap', (event) => {
            const tile = this.toTile(event.global.x, event.global.y);
            if (tile)
                this.callbacks.onSelect(tile);
        });
        this.drawTerrain();
    }
    toTile(globalX, globalY) {
        const x = Math.floor(globalX / TILE_SIZE);
        const y = Math.floor(globalY / TILE_SIZE);
        if (x < 0 || y < 0 || x >= this.world.width || y >= this.world.height)
            return null;
        return { x, y };
    }
    drawTerrain() {
        this.terrainLayer.clear();
        for (let y = 0; y < this.world.height; y++) {
            for (let x = 0; x < this.world.width; x++) {
                const terrainId = this.world.tiles[y * this.world.width + x];
                const colour = (terrainId && this.content.terrains.get(terrainId)?.color) ?? '#000000';
                this.terrainLayer.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(colour);
            }
        }
    }
    setBuildings(buildings) {
        this.buildingLayer.clear();
        const inset = 3;
        for (const building of buildings) {
            const definition = this.content.buildings.get(building.type);
            if (!definition)
                continue;
            const x = building.x * TILE_SIZE + inset;
            const y = building.y * TILE_SIZE + inset;
            const size = TILE_SIZE - inset * 2;
            this.buildingLayer
                .rect(x, y, size, size)
                .fill({ color: definition.color, alpha: building.complete ? 1 : 0.45 })
                .stroke({ color: '#1b1108', width: 1 });
            if (!building.complete) {
                const fraction = Math.min(1, building.built / Math.max(1, definition.buildDays * 100));
                this.buildingLayer
                    .rect(x, y + size - 3, size * fraction, 3)
                    .fill('#f0d27a');
            }
            else if (building.idle) {
                // A small red pip beats a wall of text for a nine-year-old scanning the map.
                this.buildingLayer.circle(x + size - 3, y + 3, 3).fill('#e05a4a');
            }
        }
    }
    setGhost(ghost) {
        this.ghost = ghost;
        this.drawOverlay();
    }
    drawOverlay() {
        this.overlayLayer.clear();
        if (!this.hovered)
            return;
        const { x, y } = this.hovered;
        const colour = this.ghost ? (this.ghost.valid ? '#7ee08a' : '#e05a4a') : '#ffffff';
        this.overlayLayer
            .rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            .fill({ color: colour, alpha: this.ghost ? 0.35 : 0.12 })
            .stroke({ color: colour, width: 2 });
    }
    destroy() {
        this.destroyed = true;
        // init() may still be awaiting; it checks the flag and cleans up itself.
        if (this.app.renderer)
            this.app.destroy(true);
    }
}
//# sourceMappingURL=renderer.js.map