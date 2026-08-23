import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { content } from '@vs/content';
import { terrainAt } from '@vs/sim';
const IDLE_MESSAGES = {
    unstaffed: 'Nobody is working here.',
    missing_inputs: 'Waiting on materials.',
    storage_full: 'The store is full.',
};
function buildingAt(state, x, y) {
    return state.buildings.find((building) => building.x === x && building.y === y);
}
export function TileInspector({ state, tile, onDemolish }) {
    if (!tile) {
        return (_jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Ground" }), _jsx("p", { className: "muted", children: "Point at the map to inspect a tile." })] }));
    }
    const terrainId = terrainAt(state.world, tile.x, tile.y);
    const terrain = terrainId ? content.terrains.get(terrainId) : undefined;
    const placed = buildingAt(state, tile.x, tile.y);
    const definition = placed ? content.buildings.get(placed.type) : undefined;
    return (_jsxs("section", { className: "panel", children: [_jsx("h2", { children: definition?.name ?? terrain?.name ?? 'Unknown ground' }), !placed && _jsx("p", { className: "muted", children: terrain?.buildable ? 'Open ground.' : 'Nothing can be built here.' }), placed && definition && (_jsxs(_Fragment, { children: [_jsx("p", { className: "muted", children: definition.description }), !placed.complete && (_jsxs("p", { children: ["Under construction \u2014 ", Math.floor(placed.built / Math.max(1, definition.buildDays)), "% done."] })), placed.complete && (_jsxs("p", { children: [placed.staff, " of ", definition.workers, " at work.", placed.idle ? ` ${IDLE_MESSAGES[placed.idle] ?? ''}` : ''] })), _jsx("button", { type: "button", className: "danger", onClick: () => onDemolish(placed.id), children: "Pull down (half the materials returned)" })] }))] }));
}
//# sourceMappingURL=TileInspector.js.map