import { Game, type Command, type CommandResult } from '@vs/sim';
export type Speed = 0 | 1 | 2 | 3;
export interface GameController {
    game: Game;
    /** Increments whenever the state changes, to drive re-renders. */
    version: number;
    speed: Speed;
    setSpeed: (speed: Speed) => void;
    execute: (command: Command) => CommandResult;
    notice: string | null;
    clearNotice: () => void;
}
/**
 * Owns the Game instance and drives it in real time. The simulation itself
 * still moves in whole days; only the pacing lives here.
 */
export declare function useGame(scenarioId: string): GameController;
//# sourceMappingURL=useGame.d.ts.map