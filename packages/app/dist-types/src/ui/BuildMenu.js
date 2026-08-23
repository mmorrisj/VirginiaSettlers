import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { content } from '@vs/content';
function affordable(state, building) {
    return Object.entries(building.cost).every(([resourceId, amount]) => (state.stores[resourceId] ?? 0) >= amount);
}
function describeCost(building) {
    const parts = Object.entries(building.cost).map(([resourceId, amount]) => `${amount} ${content.resources.get(resourceId)?.name ?? resourceId}`);
    return parts.length > 0 ? parts.join(', ') : 'nothing';
}
export function BuildMenu({ state, selected, onSelect }) {
    return (_jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Build" }), _jsx("ul", { className: "build-list", children: content.buildingList.map((building) => {
                    const canAfford = affordable(state, building);
                    const isSelected = selected === building.id;
                    return (_jsxs("li", { children: [_jsxs("button", { type: "button", className: `build-option ${isSelected ? 'selected' : ''}`, disabled: !canAfford && !isSelected, "aria-pressed": isSelected, onClick: () => onSelect(isSelected ? null : building.id), children: [_jsx("span", { className: "build-swatch", style: { background: building.color }, "aria-hidden": "true" }), _jsxs("span", { className: "build-text", children: [_jsx("strong", { children: building.name }), _jsx("span", { className: "build-cost", children: describeCost(building) })] })] }), isSelected && _jsx("p", { className: "build-description", children: building.description })] }, building.id));
                }) }), selected && _jsx("p", { className: "hint", children: "Click a tile to build. Press Escape to cancel." })] }));
}
//# sourceMappingURL=BuildMenu.js.map