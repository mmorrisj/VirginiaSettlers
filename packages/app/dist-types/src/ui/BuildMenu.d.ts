import type { GameState } from '@vs/sim';
interface Props {
    state: GameState;
    selected: string | null;
    onSelect: (buildingType: string | null) => void;
}
export declare function BuildMenu({ state, selected, onSelect }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=BuildMenu.d.ts.map