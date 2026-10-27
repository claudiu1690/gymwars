/** Lucide-style inline SVG icons (1.5px stroke) per the design system's
 *  iconography spec — paths lifted from the mobile-app ui kit. */
export function Ico({ d, size = 20, extra = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d + extra} />
    </svg>
  );
}

export const TAB_ICONS = {
  shop: "M3 9h18v12H3V9ZM2 9l3-6h14l3 6M8 9v3a4 4 0 0 0 8 0V9",
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  scouting: "M21 21l-5-5M10 17a7 7 0 100-14 7 7 0 000 14z",
  roster:
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  fights:
    "M7 15 4 12V8a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5v4l-3 5H8l-1-2ZM8 17v4h8v-4M4 9H2v4l5 4M10 4v4M14 4v4",
  gym: "M3 8v8M6 5v14M18 5v14M21 8v8M6 12h12M3 12h3M18 12h3",
  rankings:
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
};

export const ICONS = {
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9",
  bellClapper: "M13.73 21a2 2 0 01-3.46 0",
  plus: "M12 5v14M5 12h14",
  lock: "M7 11V7a5 5 0 0110 0v4M3 11h18v10H3z",
};
