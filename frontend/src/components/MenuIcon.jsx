// Original monochrome menu symbols, drawn on one 24-unit grid.
const shapes = {
  home: <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" />,
  roster: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.7" />
    </>
  ),
  fights: (
    <>
      <path d="M7 17 4.5 14a4 4 0 0 1-1-3V9a2 2 0 0 1 4 0V7a5 5 0 0 1 5-5H14a6 6 0 0 1 6 6v3a8 8 0 0 1-3 6M7 17h10v5H7z" />
      <path d="M7.5 9v3" />
    </>
  ),
  career: (
    <>
      <path d="M3 21h6v-5h6v-5h6M15 11V2l6 2.5L15 7" />
      <circle cx="4" cy="16" r="1" />
    </>
  ),
  gym: (
    <>
      <path d="M8 8V6a4 4 0 0 1 8 0v2M12 8a8 8 0 0 1 8 8v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2a8 8 0 0 1 8-8Z" />
    </>
  ),
  wars: (
    <>
      <path d="m3 4 6-2 5 2v7c0 4-4 7-5 8-2-1-6-4-6-8V4Z" />
      <path d="m17 5 4 1.5V14c0 4-4 7-5 8l-3-2.5" />
    </>
  ),
  achievements: (
    <>
      <path d="M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 14v7M8 21h8" />
    </>
  ),
  shop: (
    <>
      <path d="M5 9h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3ZM8 9V6a4 4 0 0 1 8 0v3M7 9v12M17 9v12" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m9 3 1-1h4l1 3 3 1 3-1 1 3-2 2v4l2 2-1 3-3-1-3 1-1 3h-4l-1-3-3-1-3 1-1-3 2-2v-4L2 8l1-3 3 1 3-1V3Z" />
    </>
  ),
};
export default function MenuIcon({ name }) {
  return (
    <svg
      className="game-menu-icon"
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-menu-icon={name}
    >
      {shapes[name] || shapes.home}
    </svg>
  );
}
