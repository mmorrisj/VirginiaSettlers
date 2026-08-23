import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A real document, stopped in front of the player. The question matters more
 * than the excerpt: knowing who wrote a source and why is the skill the
 * curriculum is actually after.
 */
export function SourceCardModal({ card, onDismiss }) {
    return (_jsx("div", { className: "modal-backdrop", role: "dialog", "aria-modal": "true", "aria-labelledby": "source-title", children: _jsxs("div", { className: "modal source-card", children: [_jsx("p", { className: "source-kicker", children: "From the record" }), _jsx("h2", { id: "source-title", children: card.title }), _jsx("blockquote", { children: card.excerpt }), _jsxs("p", { className: "source-attribution", children: [card.author, ", ", card.year] }), _jsx("p", { className: "source-context", children: card.context }), _jsxs("p", { className: "source-question", children: [_jsx("strong", { children: "Think about it:" }), " ", card.question] }), _jsx("button", { type: "button", className: "primary", onClick: onDismiss, autoFocus: true, children: "Back to the colony" })] }) }));
}
//# sourceMappingURL=SourceCardModal.js.map