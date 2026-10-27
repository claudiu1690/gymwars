import { useEffect, useRef, useState } from "react";

/**
 * Tween a number toward `target` with an ease-out cubic via rAF.
 * With `fromZero` the first value counts up from 0; otherwise the hook
 * snaps to the first value and only tweens subsequent changes.
 */
export function useCountUp(target, { duration = 700, fromZero = false } = {}) {
    const [value, setValue] = useState(fromZero ? 0 : target);
    const valueRef = useRef(fromZero ? 0 : target);

    useEffect(() => {
        const from = valueRef.current;
        if (from === target) return;
        let raf;
        const t0 = performance.now();
        const tick = (now) => {
            const p = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const next = from + (target - from) * eased;
            valueRef.current = next;
            setValue(next);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return value;
}
