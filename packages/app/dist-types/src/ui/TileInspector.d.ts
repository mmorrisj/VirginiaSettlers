import { type GameState } from '@vs/sim';
interface Props {
    state: GameState;
    tile: {
        x: number;
        y: number;
    } | null;
    onDemolish: (id: number) => void;
}
export declare function TileInspector({ state, tile, onDemolish }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=TileInspector.d.ts.map