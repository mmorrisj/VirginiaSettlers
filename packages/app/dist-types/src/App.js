import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { content } from '@vs/content';
import { formatDate, housingCapacity, placementError, storageCapacity } from '@vs/sim';
import { MapView } from './MapView.js';
import { useGame } from './useGame.js';
import { BuildMenu } from './ui/BuildMenu.js';
import { Journal } from './ui/Journal.js';
import { ResourceBar } from './ui/ResourceBar.js';
import { SourceCardModal } from './ui/SourceCardModal.js';
import { TileInspector } from './ui/TileInspector.js';
const SCENARIO_ID = 'jamestown_1607';
/** Sleeping rough only kills once the cold arrives, so only warn from autumn. */
const coldComing = (season) => season === 'autumn' || season === 'winter';
const SPEEDS = [
    { value: 0, label: 'Pause' },
    { value: 1, label: 'Slow' },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'Fast' },
];
export function App() {
    const { game, version, speed, setSpeed, execute, notice, clearNotice } = useGame(SCENARIO_ID);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [hovered, setHovered] = useState(null);
    const [readCards, setReadCards] = useState([]);
    const state = game.state;
    const date = game.date;
    // A newly revealed source stops the clock: reading it is the point.
    const unreadCard = state.discoveredSourceCards.find((id) => !readCards.includes(id));
    const card = unreadCard ? content.sourceCards.get(unreadCard) : undefined;
    useEffect(() => {
        if (card)
            setSpeed(0);
    }, [card, setSpeed]);
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                setSelectedBuilding(null);
            if (event.key === ' ') {
                event.preventDefault();
                setSpeed(speed === 0 ? 2 : 0);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [speed, setSpeed]);
    const ghost = useMemo(() => {
        if (!selectedBuilding || !hovered)
            return null;
        return { valid: placementError(state, content, selectedBuilding, hovered.x, hovered.y) === null };
        // version is the signal that stores or buildings changed under us.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBuilding, hovered, state, version]);
    const onSelectTile = useCallback((tile) => {
        if (!selectedBuilding)
            return;
        const result = execute({ kind: 'place', building: selectedBuilding, x: tile.x, y: tile.y });
        if (result.ok)
            setSelectedBuilding(null);
    }, [execute, selectedBuilding]);
    const onDemolish = useCallback((id) => execute({ kind: 'demolish', id }), [execute]);
    const capacity = storageCapacity(state, content, game.scenario);
    const housing = housingCapacity(state, content);
    const unhoused = Math.max(0, state.colonists - housing);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "titles", children: [_jsx("h1", { children: "Virginia Settlers" }), _jsxs("p", { className: "subtitle", children: [game.scenario.name, " \u2014 ", game.scenario.year] })] }), _jsxs("div", { className: "clock", children: [_jsx("strong", { children: formatDate(date) }), _jsx("span", { className: `season season-${date.season}`, children: date.season }), _jsxs("span", { children: ["Day ", state.day] })] }), _jsxs("div", { className: "people", children: [_jsx("strong", { children: state.colonists }), " alive", state.deaths > 0 && _jsxs("span", { className: "muted", children: [" \u00B7 ", state.deaths, " lost"] }), unhoused > 0 && (_jsxs("span", { className: coldComing(date.season) ? 'warn' : 'muted', children: [' ', "\u00B7 ", unhoused, " without shelter"] }))] }), _jsx("div", { className: "speeds", role: "group", "aria-label": "Game speed", children: SPEEDS.map((option) => (_jsx("button", { type: "button", className: speed === option.value ? 'selected' : '', "aria-pressed": speed === option.value, onClick: () => setSpeed(option.value), children: option.label }, option.value))) })] }), _jsx(ResourceBar, { state: state, capacity: capacity }), notice && (_jsx("p", { className: "notice", role: "status", onAnimationEnd: clearNotice, children: notice })), _jsxs("main", { className: "layout", children: [_jsx("div", { className: "map-column", children: _jsx(MapView, { world: state.world, buildings: state.buildings, ghost: ghost, onHover: setHovered, onSelect: onSelectTile }) }), _jsxs("aside", { className: "sidebar", children: [_jsx(BuildMenu, { state: state, selected: selectedBuilding, onSelect: setSelectedBuilding }), _jsx(TileInspector, { state: state, tile: hovered, onDemolish: onDemolish }), _jsx(Journal, { entries: state.log })] })] }), state.outcome.status !== 'playing' && (_jsx("div", { className: "modal-backdrop", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "modal", children: [_jsx("h2", { children: state.outcome.status === 'survived' ? 'The colony holds' : 'The colony is lost' }), _jsx("p", { children: state.outcome.status === 'survived'
                                ? `${state.colonists} colonists saw the spring. ${state.deaths} did not.`
                                : state.outcome.reason }), _jsx("p", { className: "muted", children: "Of the roughly 240 people at Jamestown in the autumn of 1609, about 60 were alive when ships arrived the following spring." })] }) })), card && (_jsx(SourceCardModal, { card: card, onDismiss: () => setReadCards((read) => [...read, card.id]) }))] }));
}
//# sourceMappingURL=App.js.map