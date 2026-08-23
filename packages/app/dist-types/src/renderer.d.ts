import type { Content } from '@vs/content';
import type { PlacedBuilding, World } from '@vs/sim';
export declare const TILE_SIZE = 26;
export interface RendererCallbacks {
    onHover(tile: {
        x: number;
        y: number;
    } | null): void;
    onSelect(tile: {
        x: number;
        y: number;
    }): void;
}
/**
 * Draws the colony. Deliberately knows nothing about React or about the rules:
 * it is handed a world, a list of buildings and a ghost, and paints them. That
 * boundary is what lets the simulation be tested without a browser.
 */
export declare class MapRenderer {
    private readonly world;
    private readonly content;
    private readonly callbacks;
    private readonly app;
    private readonly terrainLayer;
    private readonly buildingLayer;
    private readonly overlayLayer;
    private hovered;
    private ghost;
    private destroyed;
    private constructor();
    static create(parent: HTMLElement, world: World, content: Content, callbacks: RendererCallbacks): Promise<MapRenderer>;
    private init;
    private toTile;
    private drawTerrain;
    setBuildings(buildings: readonly PlacedBuilding[]): void;
    setGhost(ghost: {
        valid: boolean;
    } | null): void;
    private drawOverlay;
    destroy(): void;
}
//# sourceMappingURL=renderer.d.ts.map