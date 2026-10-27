import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { calendarDate } from "../careerCalendar.mjs";
import { ClubMark, ClubFlag, ORIGINAL_CLUB_LOOK } from "./ClubIdentity";
import MenuIcon from "./MenuIcon";
import "./menu-icons.css";

export default function CareerChrome({
  s,
  gym,
  page,
  activePage,
  go,
  logout,
  disabled,
  guide,
  onAction,
}) {
  const location = useLocation();
  const menuTrigger = useRef(null);
  const menuPanel = useRef(null);
  const closeTrigger = useRef(null);
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(
      "(max-width: 1100px), (max-height: 620px) and (orientation: landscape)",
    );
    const update = () => {
      setCompact(query.matches);
      setMenuOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!compact || !menuOpen) return;
    const panel = menuPanel.current;
    const app = panel?.closest(".career-app");
    const underlay = [
      ...(app?.querySelectorAll(".game-hud, .career-main, .career-turn-bar") ||
        []),
    ];
    const previous = underlay.map((element) => element.inert);
    const overflow = document.body.style.overflow;
    underlay.forEach((element) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";
    // The drawer's visibility transition must commit before it accepts focus.
    const focusFrame = requestAnimationFrame(() => {
      panel.scrollTop = 0;
      closeTrigger.current?.focus({ preventScroll: true });
    });
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key !== "Tab") return;
      const items = [
        ...panel.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length);
      if (!items.length) return;
      const first = items[0],
        last = items.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", keydown);
      underlay.forEach((element, index) => {
        element.inert = previous[index];
      });
      document.body.style.overflow = overflow;
      if (menuTrigger.current?.getClientRects().length)
        menuTrigger.current.focus({ preventScroll: true });
    };
  }, [compact, menuOpen]);
  const closeMenu = () => setMenuOpen(false);
  const clubLook = s?.shopIdentity || ORIGINAL_CLUB_LOOK;
  const nav = [
    ["home", "Home", "home"],
    ["roster", "Roster", "roster"],
    ["fights", "Fights", "fights"],
    ["campaign", "Career Path", "career"],
    ["gym", "Gym", "gym"],
    ["gym-wars", "Gym Wars", "wars"],
    ["achievements", "Achievements", "achievements"],
    ["shop", "Supply Shop", "shop"],
  ];
  return (
    <>
      <header className="game-hud">
        <button
          type="button"
          className="gw-shell-menu-toggle"
          ref={menuTrigger}
          aria-controls="gw-career-menu"
          aria-expanded={compact && menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>
        <Link
          className="game-club-brand"
          to="/career/profile"
          aria-label="View your gym profile"
        >
          <span className="game-club-crest has-club-mark">
            <ClubMark look={clubLook} />
          </span>
          <div>
            <strong>{s?.name || gym?.name || "GYM WARS"}</strong>
            <small>
              {s
                ? `TIER ${s.facilityTier} · ${s.rules.facilities[s.facilityTier].name}`
                : "BUILD YOUR FIGHT TEAM"}
            </small>
          </div>
        </Link>
        {s && (
          <div className="game-resources" aria-label="Gym resources">
            <div>
              <span>GYM FUNDS</span>
              <strong>${s.cash.toLocaleString("en-US")}</strong>
              <small>${s.weeklyCost} / week</small>
            </div>
            <div className="game-date">
              <span>GAME DATE · {calendarDate(s, s.week, true)}</span>
              <strong>TIME PAUSED</strong>
            </div>
          </div>
        )}
        <button
          className="game-signout"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
        >
          ↪
        </button>
      </header>
      {compact && menuOpen && (
        <button
          type="button"
          className="gw-shell-menu-backdrop"
          tabIndex={-1}
          onClick={closeMenu}
          aria-label="Close navigation menu"
        />
      )}
      <aside
        id="gw-career-menu"
        className="gw-shell-navigation"
        data-open={menuOpen}
        ref={menuPanel}
        onTransitionEnd={(event) => {
          if (
            compact &&
            menuOpen &&
            event.target === event.currentTarget &&
            !event.currentTarget.contains(document.activeElement)
          )
            closeTrigger.current?.focus({ preventScroll: true });
        }}
        role={compact ? "dialog" : undefined}
        aria-modal={compact && menuOpen ? true : undefined}
        aria-label={compact ? "Career menu" : undefined}
        aria-hidden={compact && !menuOpen ? true : undefined}
        inert={compact && !menuOpen ? "" : undefined}
      >
        <div className="gw-shell-menu-heading">
          <strong>YOUR CORNER</strong>
          <button
            type="button"
            ref={closeTrigger}
            onClick={closeMenu}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>
        <nav className="game-nav" aria-label="Career navigation">
          <Link
            className="clubhouse-wordmark"
            to="/career"
            aria-label="Gym Wars home"
            onClick={closeMenu}
          >
            GYM
            <br />
            WARS<span>BUILD YOUR CORNER</span>
          </Link>
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => {
                closeMenu();
                go(id);
              }}
              className={
                activePage === id ||
                (activePage === "scouting" && id === "roster")
                  ? "selected"
                  : ""
              }
              aria-current={
                activePage === id ||
                (activePage === "scouting" && id === "roster")
                  ? "page"
                  : undefined
              }
            >
              <MenuIcon name={icon} />
              <span>{label}</span>
              {id === "campaign" && s?.journey?.invitational?.canEnter && (
                <i aria-label="Invitational available" />
              )}
            </button>
          ))}
          <ClubFlag
            look={clubLook}
            name={s?.name || gym?.name || "Your fight club"}
            className="shop-sidebar-flag"
          />
          <Link
            className="gw-profile-entry"
            to="/career/profile"
            onClick={closeMenu}
            aria-current={page === "profile" ? "page" : undefined}
          >
            Your profile
          </Link>
          <button
            type="button"
            className={`gw-shell-help ${page === "help" ? "selected" : ""}`}
            aria-current={page === "help" ? "page" : undefined}
            onClick={() => {
              closeMenu();
              go("help");
            }}
          >
            <MenuIcon name="help" />
            <span>Help & settings</span>
          </button>
          <button
            type="button"
            className="gw-shell-menu-signout"
            onClick={() => {
              closeMenu();
              logout();
            }}
          >
            Sign out
          </button>
        </nav>
      </aside>
    </>
  );
}
