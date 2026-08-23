import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { content } from '@vs/content';
import { Game } from '@vs/sim';
/** Real milliseconds per simulated day at each speed. 0 means paused. */
const MS_PER_DAY = { 0: 0, 1: 900, 2: 320, 3: 110 };
/**
 * Owns the Game instance and drives it in real time. The simulation itself
 * still moves in whole days; only the pacing lives here.
 */
export function useGame(scenarioId) {
    const gameRef = useRef(null);
    gameRef.current ??= new Game(content, scenarioId);
    const game = gameRef.current;
    const [version, bump] = useReducer((n) => n + 1, 0);
    const [speed, setSpeed] = useState(1);
    const [notice, setNotice] = useState(null);
    const execute = useCallback((command) => {
        const result = game.execute(command);
        setNotice(result.ok ? null : result.error);
        bump();
        return result;
    }, [game]);
    const finished = game.state.outcome.status !== 'playing';
    useEffect(() => {
        if (speed === 0 || finished)
            return;
        let frame = 0;
        let last = performance.now();
        let owed = 0;
        const step = (now) => {
            owed += now - last;
            last = now;
            const msPerDay = MS_PER_DAY[speed];
            // Cap the catch-up so a backgrounded tab does not fast-forward a year.
            let days = Math.min(Math.floor(owed / msPerDay), 5);
            if (days > 0) {
                owed -= days * msPerDay;
                game.execute({ kind: 'advance', days });
                bump();
            }
            else {
                owed = Math.min(owed, msPerDay * 5);
            }
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [game, speed, finished]);
    const clearNotice = useCallback(() => setNotice(null), []);
    return { game, version, speed, setSpeed, execute, notice, clearNotice };
}
//# sourceMappingURL=useGame.js.map