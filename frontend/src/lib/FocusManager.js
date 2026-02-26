import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useFocusList — Hook for managing keyboard focus in a vertical list.
 *
 * Returns:
 *   activeIndex   — currently focused row
 *   setActiveIndex — manual override
 *   containerProps — spread onto the container element
 *
 * Handles Arrow↑↓ navigation, wraps at boundaries.
 * Scrolls active row into view.
 */
export function useFocusList(itemCount, { initialIndex = 0, onSelect, onBack } = {}) {
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const containerRef = useRef(null);

    // Clamp index when itemCount changes
    useEffect(() => {
        setActiveIndex((prev) => Math.min(prev, Math.max(0, itemCount - 1)));
    }, [itemCount]);

    // Scroll active item into view
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const row = container.querySelector(`[data-focus-index="${activeIndex}"]`);
        row?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleKeyDown = useCallback(
        (event) => {
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, itemCount - 1));
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    event.preventDefault();
                    onSelect?.(activeIndex);
                    break;
                case 'Escape':
                case 'Backspace':
                    if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                        event.preventDefault();
                        onBack?.();
                    }
                    break;
            }
        },
        [itemCount, activeIndex, onSelect, onBack]
    );

    const containerProps = {
        ref: containerRef,
        tabIndex: -1,
        onKeyDown: handleKeyDown,
        role: 'listbox',
        'aria-activedescendant': `focus-item-${activeIndex}`,
    };

    return { activeIndex, setActiveIndex, containerProps, containerRef };
}

/**
 * Utility: auto-focus container on mount.
 */
export function useAutoFocus(ref) {
    useEffect(() => {
        requestAnimationFrame(() => ref.current?.focus());
    }, [ref]);
}
