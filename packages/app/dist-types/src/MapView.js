import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { content } from '@vs/content';
import { MapRenderer } from './renderer.js';
export function MapView({ world, buildings, ghost, onHover, onSelect }) {
    const hostRef = useRef(null);
    const rendererRef = useRef(null);
    // Callbacks change every render; route them through refs so the expensive
    // WebGL context is created once for the life of the map.
    const onHoverRef = useRef(onHover);
    const onSelectRef = useRef(onSelect);
    onHoverRef.current = onHover;
    onSelectRef.current = onSelect;
    useEffect(() => {
        const host = hostRef.current;
        if (!host)
            return;
        let renderer = null;
        let cancelled = false;
        void MapRenderer.create(host, world, content, {
            onHover: (tile) => onHoverRef.current(tile),
            onSelect: (tile) => onSelectRef.current(tile),
        }).then((created) => {
            if (cancelled) {
                created.destroy();
                return;
            }
            renderer = created;
            rendererRef.current = created;
        });
        return () => {
            cancelled = true;
            renderer?.destroy();
            rendererRef.current = null;
        };
    }, [world]);
    useEffect(() => {
        rendererRef.current?.setBuildings(buildings);
    });
    useEffect(() => {
        rendererRef.current?.setGhost(ghost);
    });
    return _jsx("div", { ref: hostRef, className: "map-host" });
}
//# sourceMappingURL=MapView.js.map