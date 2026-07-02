/** Lucide-style inline SVG icons (1.5px stroke) per the design system's
 *  iconography spec — paths lifted from the mobile-app ui kit. */
export function Ico({ d, size = 20, extra = "" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d + extra} />
        </svg>
    );
}

export const TAB_ICONS = {
    home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
    roster: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
    fights: "M6.5 17.5l-5-5 5-5 M17.5 6.5l5 5-5 5",
    gym: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
    rankings: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
};

export const ICONS = {
    bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9",
    bellClapper: "M13.73 21a2 2 0 01-3.46 0",
    plus: "M12 5v14M5 12h14",
    lock: "M7 11V7a5 5 0 0110 0v4M3 11h18v10H3z",
};
