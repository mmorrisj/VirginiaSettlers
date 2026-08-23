import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
/**
 * The colony journal. It is also the artifact a teacher can ask a student to
 * export and explain, so entries are written as plain sentences.
 */
export function Journal({ entries }) {
    const listRef = useRef(null);
    const recent = entries.slice(-40);
    useEffect(() => {
        const list = listRef.current;
        if (list)
            list.scrollTop = list.scrollHeight;
    }, [entries.length]);
    return (_jsxs("section", { className: "panel journal", children: [_jsx("h2", { children: "Journal" }), _jsx("ol", { ref: listRef, className: "journal-list", "aria-live": "polite", children: recent.map((entry, index) => (_jsxs("li", { className: `journal-entry ${entry.kind}`, children: [_jsxs("span", { className: "journal-day", children: ["Day ", entry.day] }), _jsx("span", { children: entry.message })] }, `${entry.day}-${index}`))) })] }));
}
//# sourceMappingURL=Journal.js.map