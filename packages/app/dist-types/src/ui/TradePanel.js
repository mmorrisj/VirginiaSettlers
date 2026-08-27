import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { content } from '@vs/content';
import { quoteTrade, relationshipBand } from '@vs/sim';
const BAND_LABEL = {
    hostile: 'hostile',
    wary: 'wary',
    cordial: 'cordial',
    allied: 'allied',
};
/** Sensible offer sizes for a ten-year-old: no free-typing of numbers. */
const STEPS = [1, 5, 10, 25];
export function TradePanel({ state, onCommand }) {
    return (_jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Neighbours" }), _jsx("p", { className: "muted panel-intro", children: "The Powhatan towns have the corn. What they will give depends on how the colony has treated them." }), state.towns.map((town) => (_jsx(TownCard, { state: state, town: town, onCommand: onCommand }, town.id)))] }));
}
function TownCard({ state, town, onCommand, }) {
    const definition = content.towns.get(town.id);
    const wanted = Object.keys(definition?.wants ?? {});
    const [good, setGood] = useState(wanted[0] ?? '');
    const [quantity, setQuantity] = useState(5);
    if (!definition)
        return null;
    const band = relationshipBand(town.relationship);
    const away = town.partyReturnsOn !== null;
    const daysOut = away ? Math.max(0, (town.partyReturnsOn ?? 0) - state.day) : 0;
    const held = state.stores[good] ?? 0;
    const offer = { [good]: Math.min(quantity, held) };
    const quote = quoteTrade(definition, town.relationship, offer, town.cornStock);
    const acceptedCount = Object.values(quote.accepted).reduce((sum, n) => sum + n, 0);
    return (_jsxs("article", { className: `town-card band-${band}`, children: [_jsxs("header", { className: "town-head", children: [_jsx("strong", { children: definition.name }), _jsx("span", { className: `band-badge band-${band}`, children: BAND_LABEL[band] })] }), _jsx("div", { className: "relationship-bar", role: "img", "aria-label": `Goodwill ${town.relationship} of 100`, children: _jsx("span", { style: { width: `${town.relationship}%` } }) }), _jsxs("p", { className: "town-line", children: ["Corn to spare: ", _jsx("strong", { children: town.cornStock })] }), away ? (_jsxs("p", { className: "town-line muted", children: ["A party is on the road \u2014 back in ", daysOut, " ", daysOut === 1 ? 'day' : 'days', "."] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "offer-row", children: [_jsx("select", { value: good, onChange: (event) => setGood(event.target.value), "aria-label": "Trade good", children: wanted.map((resourceId) => (_jsxs("option", { value: resourceId, children: [content.resources.get(resourceId)?.name ?? resourceId, " (", state.stores[resourceId] ?? 0, ")"] }, resourceId))) }), _jsx("div", { className: "steps", role: "group", "aria-label": "How much to offer", children: STEPS.map((step) => (_jsx("button", { type: "button", className: quantity === step ? 'selected' : '', "aria-pressed": quantity === step, onClick: () => setQuantity(step), children: step }, step))) })] }), _jsx("p", { className: "quote", children: held === 0 ? (_jsxs("span", { className: "muted", children: ["The store has no ", content.resources.get(good)?.name ?? good, "."] })) : quote.corn > 0 ? (_jsxs(_Fragment, { children: ["They will give ", _jsxs("strong", { children: [quote.corn, " corn"] }), " for ", acceptedCount, ' ', content.resources.get(good)?.name ?? good, acceptedCount < (offer[good] ?? 0) && _jsx("span", { className: "muted", children: " (the rest comes home)" })] })) : (_jsx("span", { className: "muted", children: band === 'hostile' ? 'They will not deal with the colony.' : 'They cannot pay for that.' })) }), _jsxs("div", { className: "town-actions", children: [_jsx("button", { type: "button", className: "primary", disabled: quote.corn <= 0, onClick: () => onCommand({ kind: 'trade', town: town.id, offer }), children: "Trade" }), _jsx("button", { type: "button", disabled: held === 0, title: "Give with nothing asked back. Buys goodwill, not corn.", onClick: () => onCommand({ kind: 'gift', town: town.id, offer }), children: "Give" }), _jsx("button", { type: "button", className: "danger", title: "Take corn by force. It works today.", onClick: () => onCommand({ kind: 'demand', town: town.id }), children: "Take by force" })] })] }))] }));
}
//# sourceMappingURL=TradePanel.js.map