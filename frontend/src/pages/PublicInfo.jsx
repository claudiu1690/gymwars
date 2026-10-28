import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth";
import SiteLinks from "../components/SiteLinks";
import { api } from "../api";
import "./public-info.css";

const pages = {
  support: {
    eyebrow: "WE’RE IN YOUR CORNER",
    title: "Need a hand?",
    intro: "Find your next move, report a problem or manage your account.",
  },
  privacy: {
    eyebrow: "YOUR GAME. YOUR DATA.",
    title: "Privacy notice",
    intro:
      "What Gym Wars stores, what other managers can see and the controls you have.",
  },
  terms: {
    eyebrow: "A FAIR FIGHT FOR EVERY CLUB",
    title: "Terms of play",
    intro: "The ground rules for playing Gym Wars, operated by Digital Olive.",
  },
};

function Section({ title, children, id }) {
  return (
    <section className="public-info-card" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function PublicInfo({ kind }) {
  const { authed } = useAuth();
  const [site, setSite] = useState(null);
  useEffect(() => {
    let active = true;
    api("/site")
      .then((value) => {
        if (active) setSite(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const page = pages[kind];
  const helpHref = authed ? "/career/help#support" : "/login";
  useEffect(() => {
    const previous = document.title;
    document.title = `${page.title} · Gym Wars`;
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, [page.title]);
  return (
    <div className="public-info">
      <a className="public-info-skip" href="#public-info-main">
        Skip to content
      </a>
      <header className="public-info-nav">
        <Link
          className="public-info-wordmark"
          to="/"
          aria-label="Gym Wars home"
        >
          GYM<span>WARS</span>
        </Link>
        <nav aria-label="Information pages">
          <NavLink to="/support">Support</NavLink>
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/terms">Terms</NavLink>
        </nav>
        <Link className="public-info-button" to={authed ? "/career" : "/login"}>
          {authed ? "Back to my gym" : "Log in"}
        </Link>
      </header>
      <main id="public-info-main">
        <header className="public-info-hero">
          <div>
            <span className="public-info-eyebrow">{page.eyebrow}</span>
            <h1>{page.title}</h1>
            <p>{page.intro}</p>
          </div>
          <img
            src="/art/club-crests/original.webp"
            alt=""
            aria-hidden="true"
            width="320"
            height="368"
          />
        </header>
        {kind !== "support" && (
          <p className="public-info-date">
            Updated 28 October 2026 · Operator: Digital Olive
          </p>
        )}
        <div className="public-info-grid">
          {kind === "support" && (
            <>
              <Section title="Start with the handbook">
                <p>
                  Training and recovery save your plans. Only{" "}
                  <strong>End week</strong> moves the team forward. The handbook
                  explains bookings, tactics, gym progression and your
                  four-fighter Gym Wars team.
                </p>
                <Link
                  className="public-info-button"
                  to={authed ? "/career/help" : "/login"}
                >
                  {authed ? "Open the handbook" : "Log in for the handbook"}
                </Link>
              </Section>
              <Section title="Send a report">
                <p>
                  Open <strong>Help & settings</strong> in your gym and choose{" "}
                  <strong>Tell us what needs work</strong>. Describe what
                  happened, what you expected and the screen where it happened.
                </p>
                <p>
                  Keep your GW reference number so we can identify the report.
                  Never include your password or payment-card details.
                </p>
                <Link className="public-info-button" to={helpHref}>
                  {authed ? "Open the report form" : "Log in to send a report"}
                </Link>
              </Section>
              <Section title="Account and privacy requests">
                <p>
                  Help & settings lets you change your password, control
                  optional gameplay analytics and download your player-visible
                  data.
                </p>
                <p>
                  For a correction, deletion or another data request, use the
                  report form and begin your message with{" "}
                  <strong>Privacy request</strong>. The downloadable game data
                  does not include passwords, security tokens or hidden fighter
                  values.
                </p>
                <Link to="/privacy">Read the privacy notice</Link>
              </Section>
              <Section title="Trouble signing in?">
                <p>
                  Check your email and password, then use the password-reset
                  page. Reset emails can only arrive when email delivery is
                  available.
                </p>
                <Link
                  className="public-info-button public-info-button-secondary"
                  to="/forgot-password"
                >
                  Reset your password
                </Link>
                <p className="public-info-note">
                  {site?.supportEmail ? (
                    <>
                      Contact us at{" "}
                      <a href={`mailto:${site.supportEmail}`}>
                        {site.supportEmail}
                      </a>{" "}
                      if you cannot access your account.
                    </>
                  ) : site?.localPreview ? (
                    <>
                      In this local preview, password-reset emails are
                      unavailable. Digital Olive has not announced a public
                      support email yet.
                    </>
                  ) : (
                    <>
                      The support page is loading its contact details. Please
                      try again if they do not appear.
                    </>
                  )}
                </p>
              </Section>
            </>
          )}
          {kind === "privacy" && (
            <>
              <Section title="Who operates Gym Wars?">
                <p>
                  Digital Olive operates Gym Wars and is responsible for the
                  account and gameplay data described here. Use the{" "}
                  <Link to="/support">support page</Link> for the current
                  contact route.
                </p>
                <p className="public-info-note">
                  {site?.localPreview ? (
                    <>
                      This notice describes the current local preview. Public
                      operator contact details, hosting providers and
                      international-transfer arrangements will be stated before
                      the public service opens.
                    </>
                  ) : (
                    site?.serviceDetails ||
                    "Service information is loading. Please contact Support if it does not appear."
                  )}
                </p>
              </Section>
              <Section title="Account and game data">
                <p>
                  We store your email address, a hashed password, account
                  preferences and security-token hashes. We also store your gym,
                  fighters, training plans, career progress, achievements,
                  equipped cosmetics, published team and accepted competition
                  results.
                </p>
                <p>
                  These records let us provide your account, save your game and
                  operate fair competitions. Password and session controls help
                  protect the service.
                </p>
              </Section>
              <Section title="What other managers can see">
                <p>
                  Your gym name, equipped crest, earned achievements, public
                  record, league position and published four-fighter team can
                  appear in Gym Wars and gym profiles.
                </p>
                <p>
                  Your email, password, private support reports, reserve plans
                  and hidden fighter potential are not included in those public
                  views. Choose a gym name you are comfortable sharing.
                </p>
              </Section>
              <Section title="Optional gameplay analytics">
                <p>
                  Analytics are off by default. If you opt in, first-party
                  events record milestones, return visits and categories of
                  blocked actions, linked to your gym. Event details exclude
                  email addresses, message text, passwords and hidden fighter
                  values.
                </p>
                <p>
                  Events are scheduled to expire after 90 days. Switching
                  analytics off in Help & settings removes your gym’s recorded
                  analytics and stops new optional events.
                </p>
              </Section>
              <Section title="Browser storage and reports">
                <p>
                  Your browser stores a sign-in token, sound and motion
                  preferences, and temporary draft/request information used to
                  recover actions. Signing out clears the sign-in token. Browser
                  storage can also be cleared in your browser settings.
                </p>
                <p>
                  If you send a report, we store its message, category,
                  reference and limited screen context with your account so it
                  can be reviewed. Do not put sensitive personal information in
                  a report.
                </p>
              </Section>
              <Section title="Retention and service providers">
                <p>
                  Account, game, accepted competition and support records
                  currently have no automatic expiry. They remain stored until
                  removed through an applicable data request or service
                  operation. Analytics have the separate 90-day expiry described
                  above.
                </p>
                <p>
                  No payment provider is connected and Gym Wars does not collect
                  payment-card details.{" "}
                  {site?.localPreview ? (
                    <>
                      This local preview does not send account emails. The
                      providers and retention schedule for the public service
                      must be disclosed when they are selected.
                    </>
                  ) : (
                    <>
                      Account verification and password recovery use the
                      configured transactional email service. Service providers
                      and processing arrangements are described above.
                    </>
                  )}
                </p>
              </Section>
              <Section title="Your choices and requests">
                <p>
                  You can withdraw optional analytics consent, download
                  player-visible data and ask Digital Olive to access, correct
                  or delete personal data. Where applicable, you can also
                  request restriction, object to processing, request portability
                  and complain to your data-protection authority.
                </p>
                <p>
                  Send a <strong>Privacy request</strong> through the{" "}
                  <Link to="/support">support route</Link>. We may need to
                  verify that you control the account. A gameplay export is not
                  a substitute for responding to a broader personal-data
                  request.
                </p>
              </Section>
              <Section title="Why the game uses this data">
                <p>
                  Account and game records are used to provide the game you
                  request. Limited security and support handling serves the
                  legitimate interests of protecting the game and resolving
                  reports. Optional analytics uses your consent, which you can
                  withdraw.
                </p>
                <p>
                  Combat, training and matchmaking are automated game systems.
                  They determine fictional sporting outcomes and do not make
                  credit, employment or similar real-world decisions about you.
                </p>
              </Section>
            </>
          )}
          {kind === "terms" && (
            <>
              <Section title="Playing the game">
                <p>
                  Gym Wars is a browser game operated by Digital Olive. These
                  terms describe your use of the game alongside the{" "}
                  <Link to="/privacy">privacy notice</Link>. You must be legally
                  able to agree to the terms, or have permission from a parent
                  or guardian where required.
                </p>
                <p>
                  Keep your login details secure and contact us if you think
                  someone else is using your account.
                </p>
              </Section>
              <Section title="Keep competition fair">
                <p>
                  Do not exploit bugs, automate play to gain an unfair
                  advantage, tamper with requests or results, bypass limits,
                  impersonate others or use accounts to manipulate rankings.
                </p>
                <p>
                  Gym names and reports must not contain threats, harassment,
                  hateful material or other people’s private information. Report
                  problems through <Link to="/support">Support</Link>.
                </p>
              </Section>
              <Section title="Progress and virtual items">
                <p>
                  Fighters, currency, training weeks, Gym Wars tokens and
                  rewards are game content. They have no cash value and cannot
                  be redeemed, sold or transferred outside supported game
                  features.
                </p>
                <p>
                  Cosmetic crests are earned through achievements. Preparation
                  and tactics influence fights, but a particular result is never
                  guaranteed.
                </p>
              </Section>
              <Section title="Purchases are currently disconnected">
                <p>
                  No real-money checkout is available in this build. Local test
                  checkout charges nothing and grants preview supplies only.
                  Displayed pack prices are not a request for payment.
                </p>
                <p>
                  Before any paid service opens, the checkout must explain the
                  item, price, applicable purchase limits and relevant
                  cancellation/refund information. Do not send payment details
                  through reports.
                </p>
              </Section>
              <Section title="Updates and account action">
                <p>
                  We may update content, fix bugs and tune future gameplay.
                  Accepted fights retain their recorded rules and results.
                  Service interruptions can occur; use the game’s retry or
                  refresh actions rather than submitting a different request
                  repeatedly.
                </p>
                <p>
                  We may investigate abuse and restrict accounts that break
                  these rules. If you believe an action is mistaken, use{" "}
                  <Link to="/support">Support</Link> and include the relevant
                  reference.
                </p>
              </Section>
              <Section title="Your rights and contact">
                <p>
                  These terms do not remove mandatory consumer or
                  data-protection rights. Digital Olive retains its rights in
                  the game; you may use it for its intended personal gameplay.
                </p>
                <p>
                  The current contact route is the in-game report form. Public
                  operator contact details and the purchase terms for any future
                  paid service will be provided before those services open.
                </p>
              </Section>
            </>
          )}
        </div>
      </main>
      <footer className="public-info-footer">
        <SiteLinks />
        <Link to="/">Back to Gym Wars</Link>
      </footer>
    </div>
  );
}
