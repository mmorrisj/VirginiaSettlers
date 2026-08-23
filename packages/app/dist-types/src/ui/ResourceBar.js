import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { content } from '@vs/content';
import { foodOutlook } from '@vs/sim';
export function ResourceBar({ state, capacity }) {
    const stored = Object.values(state.stores).reduce((sum, amount) => sum + amount, 0);
    const nearlyFull = stored > capacity * 0.9;
    const food = foodOutlook(state, content);
    const hungry = food.daysRemaining < 30;
    return (_jsxs("div", { className: "resource-bar", children: [content.resourceList
                .filter((resource) => resource.tracked)
                .map((resource) => (_jsxs("span", { className: "resource", children: [_jsx("span", { className: `swatch swatch-${resource.icon}`, "aria-hidden": "true" }), _jsx("span", { className: "resource-name", children: resource.name }), _jsx("strong", { children: state.stores[resource.id] ?? 0 })] }, resource.id))), _jsxs("span", { className: `resource food-outlook ${hungry ? 'warn' : ''}`, children: [_jsx("span", { className: "resource-name", children: "Food lasts" }), _jsx("strong", { children: Number.isFinite(food.daysRemaining) ? `${food.daysRemaining} days` : '—' }), _jsxs("span", { className: "rate", children: ["eating ", food.perDay, "/day"] })] }), _jsxs("span", { className: `resource store-total ${nearlyFull ? 'warn' : ''}`, children: [_jsx("span", { className: "resource-name", children: "Store" }), _jsxs("strong", { children: [stored, " / ", capacity] })] })] }));
}
//# sourceMappingURL=ResourceBar.js.map