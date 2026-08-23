import type { PlacedBuilding, World } from '@vs/sim';
interface Props {
    world: World;
    buildings: readonly PlacedBuilding[];
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
export declare function MapView({ world, buildings, ghost, onHover, onSelect }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=MapView.d.ts.map