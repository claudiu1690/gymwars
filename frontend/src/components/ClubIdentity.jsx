import { clubCrestArt } from "../clubCrests.mjs";
import "./club-shop.css";

export const ORIGINAL_CLUB_LOOK = Object.freeze({
  id: "original",
  name: "Original corner",
  color: "#ed684e",
  dark: "#203543",
  light: "#ffdfc2",
  symbol: "glove",
  pattern: "rays",
});

export function ClubMark({ look, className = "" }) {
  if (!look) return null;
  const art = clubCrestArt(look.id);
  if (art)
    return (
      <img
        className={`shop-club-mark ${className}`}
        data-club-look={look.id}
        src={art}
        alt=""
        aria-hidden="true"
        width="320"
        height="368"
        draggable="false"
      />
    );
  return (
    <svg
      className={`shop-club-mark ${className}`}
      data-club-look={look.id}
      viewBox="0 0 120 138"
      aria-hidden="true"
      style={{
        "--look-color": look.color,
        "--look-dark": look.dark,
        "--look-light": look.light,
      }}
    >
      <path
        className="mark-shadow"
        d="M60 3 114 23v57c0 24-33 44-54 55C39 124 6 104 6 80V23Z"
      />
      <path
        className="mark-rim"
        d="M60 8 108 27v51c0 21-28 39-48 50C40 117 12 99 12 78V27Z"
      />
      <path
        className="mark-field"
        d="M60 18 99 33v44c0 17-22 33-39 43C43 110 21 94 21 77V33Z"
      />
      <path className="mark-detail" d="m40 30 20-8 20 8M40 105l20 12 20-12" />
      {look.symbol === "glove" && (
        <path
          className="mark-icon"
          d="M35 82V58c0-10 10-10 10 0V44c0-10 11-10 11 0v10-17c0-10 11-10 11 0v17-11c0-9 11-9 11 0v27L67 91H43Z"
        />
      )}
      {look.symbol === "leaf" && (
        <>
          <path
            className="mark-icon"
            d="M31 88C20 53 49 42 88 43c-1 39-26 58-57 45Z"
          />
          <path className="mark-detail" d="m38 82 33-25" />
        </>
      )}
      {look.symbol === "moon" && (
        <path
          className="mark-icon"
          d="M75 40c-33 3-43 48-7 59-38 12-58-29-31-51 9-7 22-10 38-8Z"
        />
      )}
      {look.symbol === "star" && (
        <path
          className="mark-icon"
          d="m60 38 9 20 22 3-16 16 4 22-19-11-19 11 4-22-16-16 22-3Z"
        />
      )}
      {look.symbol === "diamond" && (
        <path className="mark-icon" d="m60 39 28 29-28 33-28-33Z" />
      )}
      {look.symbol === "bolt" && (
        <path className="mark-icon" d="M65 36 34 72h22l-2 31 33-43H65Z" />
      )}
      {look.symbol === "shield" && (
        <>
          <path
            className="mark-icon"
            d="m60 39 26 10v23c0 14-14 24-26 31-12-7-26-17-26-31V49Z"
          />
          <path className="mark-detail" d="M60 51v35M46 63h28" />
        </>
      )}
      {look.symbol === "mountain" && (
        <>
          <path className="mark-icon" d="m26 94 27-53 17 25 10-16 20 44Z" />
          <path className="mark-detail" d="m44 62 10 6 8-5" />
        </>
      )}
      {look.symbol === "globe" && (
        <>
          <circle className="mark-detail" cx="60" cy="70" r="27" />
          <ellipse className="mark-detail" cx="60" cy="70" rx="12" ry="27" />
          <path className="mark-detail" d="M34 61h52M34 79h52" />
        </>
      )}
      {look.symbol === "flame" && (
        <path
          className="mark-icon"
          d="M62 38c9 18-11 22-6 35 2-10 12-11 13-21 22 20 18 47-9 47-29 0-35-27-18-44-1 16 7 16 8 20-2-17 17-23 12-37Z"
        />
      )}
      {look.symbol === "wave" && (
        <>
          <path
            className="mark-icon"
            d="M30 78c12-29 40-38 56-12-21-12-35 9-32 16 11-12 21-4 34 4-21-7-27 18-58-8Z"
          />
          <path className="mark-detail" d="M32 94c17 13 36-10 55-1" />
        </>
      )}
      {look.symbol === "lotus" && (
        <>
          <path
            className="mark-icon"
            d="M60 40c-19 20-18 38 0 54 18-16 19-34 0-54ZM56 94c-26-4-29-18-28-34 20 3 26 14 28 34ZM64 94c26-4 29-18 28-34-20 3-26 14-28 34Z"
          />
          <path className="mark-detail" d="M60 57v34" />
        </>
      )}
      {look.symbol === "laurel" && (
        <>
          <path
            className="mark-icon"
            d="m60 43 6 14 16 1-12 11 4 16-14-9-14 9 4-16-12-11 16-1Z"
          />
          <path
            className="mark-detail"
            d="M49 101C27 91 24 69 32 53M71 101c22-10 25-32 17-48M34 82l9 1M31 70l9 3M86 82l-9 1M89 70l-9 3"
          />
        </>
      )}
    </svg>
  );
}
export function ClubFlag({ look, name, className = "" }) {
  if (!look) return null;
  return (
    <div
      className={`shop-club-flag ${className}`}
      data-pattern={look.pattern}
      style={{
        "--look-color": look.color,
        "--look-dark": look.dark,
        "--look-light": look.light,
      }}
    >
      <ClubMark look={look} />
      <span>
        {name || "YOUR FIGHT CLUB"}
        <small>ONE TEAM. EVERY FIGHT.</small>
      </span>
    </div>
  );
}
