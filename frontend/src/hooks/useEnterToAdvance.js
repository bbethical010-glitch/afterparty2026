import { useEffect } from 'react';

/**
 * useEnterToAdvance
 * 
 * Hijacks the 'Enter' key within a specific container to act like the 'Tab' key,
 * moving focus to the next logical focusable input. 
 * This creates the high-speed, terminal-like data entry flow standard in Tally.
 * 
 * @param {React.RefObject} containerRef - React ref pointing to the wrapping form or div
 * @param {Object} options 
 * @param {Function} options.onFinalEnter - Callback triggered when Enter is pressed on the last focusable element
 */
export function useEnterToAdvance(containerRef, { onFinalEnter } = {}) {
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        function handleKeyDown(e) {
            // Ignore if modifier keys are pressed
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

            // We only care about the Enter key
            if (e.key !== 'Enter') return;

            // If the target is a button, let the browser handle it naturally UNLESS it's a focusable div/button meant for grouping like GroupSelector.
            if (e.target.tagName.toLowerCase() === 'button' && !e.target.classList.contains('focusable')) {
                return;
            }

            // For selects/dropdowns, usually we want Enter to open/close them or select an item
            // Because our custom select/combobox logic handles its own Enter keys (like in GroupSelector),
            // relying on event propagation, we check if the element has explicitly asked to stop propagation
            // If the event reaches here, it means the element didn't stop it, so we can advance.

            // However, native <select>s don't stop propagation. For native selects, Enter
            // typically doesn't advance focus natively; it selects. We will force advance.

            // Get all focusable elements
            const focusableQuery = '.focusable:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled])';
            const elements = Array.from(container.querySelectorAll(focusableQuery))
                // Filter out non-visible elements (like hidden inputs with 0 width/height)
                .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);

            if (elements.length === 0) return;

            const currentIndex = elements.indexOf(document.activeElement);

            if (currentIndex > -1) {
                // Prevent default form submission
                e.preventDefault();

                const nextIndex = currentIndex + 1;

                if (nextIndex < elements.length) {
                    // Focus the next element
                    elements[nextIndex].focus();
                    // If it's a text input, optionally select all text for easy replacement
                    if (elements[nextIndex].tagName.toLowerCase() === 'input' &&
                        (elements[nextIndex].type === 'text' || elements[nextIndex].type === 'number')) {
                        elements[nextIndex].select();
                    }
                } else {
                    // Reached the end of the form
                    if (onFinalEnter) {
                        onFinalEnter();
                    }
                }
            }
        }

        // Use capture phase so we can intercept before form submission handlers,
        // but typically bubbling is safer to allow individual components (like custom dropdowns) 
        // to call stopPropagation() if they need to consume the Enter key themselves.
        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [containerRef, onFinalEnter]);
}
