import { useEffect, useState } from "react";

/** Format remaining ms as the design system's timer copy: "3d 12h", "3h 45m", "45m 30s". */
export function formatRemaining(ms) {
    if (ms <= 0) return "now";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${sec}s`;
}

/** Live countdown to an ISO timestamp / Date. Ticks every second. */
export function useCountdown(target) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    if (!target) return { text: null, done: false };
    const ms = new Date(target).getTime() - now;
    return { text: formatRemaining(ms), done: ms <= 0 };
}
