import type { PlacedBuilding, TownState, World } from '@vs/sim';
interface Props {
    world: World;
    buildings: readonly PlacedBuilding[];
    towns: readonly TownState[];
    /** Null when no building is selected; otherwise whether the hovered tile is legal. */
    ghost: {
        valid: boolean;
    } | null;
    onHover: (tile: {
        x: number;
        y: number;
    } | null) => void;
    onSelect: (tile: {
        x: number;
        y: number;
    }) => void;
}
export declare function MapView({ world, buildings, towns, ghost, onHover, onSelect }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=MapView.d.ts.map