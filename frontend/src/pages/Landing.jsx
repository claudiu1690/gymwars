import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { gymEnvironment } from "../gymEnvironments.mjs";
import SiteLinks from "../components/SiteLinks";
import "./landing.css";
import "../components/fighter-rarity-backings.css";

const corner = [
  {
    division: "Featherweight",
    style: "Fast hands. Sharp footwork.",
    portrait: "featherweight-shaved",
    rarity: "prospect",
  },
  {
    division: "Lightweight",
    style: "Find the opening. Take control.",
    portrait: "lightweight-centerpart",
    rarity: "contender",
  },
  {
    division: "Middleweight",
    style: "Make every exchange count.",
    portrait: "middleweight-cornrows",
    rarity: "elite",
  },
  {
    division: "Heavyweight",
    style: "Big presence. Bigger moments.",
    portrait: "heavyweight-blackbeard",
    rarity: "legend",
  },
];

export default function Landing() {
  const { authed } = useAuth();
  const playHref = authed ? "/career" : "/register";
  const playLabel = authed ? "Back to my gym" : "Start your gym";
  useEffect(() => {
    const previous = document.title;
    document.title = "Gym Wars — Build your corner. Make your name.";
    return () => {
      document.title = previous;
    };
  }, []);
  return (
    <div className="gw-landing">
      <a className="landing-skip" href="#landing-main">
        Skip to the game
      </a>
      <header className="landing-nav">
        <Link className="landing-wordmark" to="/" aria-label="Gym Wars home">
          GYM<span>WARS</span>
        </Link>
        <nav aria-label="Main navigation">
          <a className="landing-nav-section" href="#how-to-play">
            The game
          </a>
          <a className="landing-nav-section" href="#your-corner">
            Your corner
          </a>
          <a className="landing-nav-section" href="#gym-wars">
            Gym Wars
          </a>
          {!authed && (
            <Link className="landing-login" to="/login">
              Log in
            </Link>
          )}
          <Link className="landing-button landing-nav-play" to={playHref}>
            {playLabel}
          </Link>
        </nav>
      </header>
      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <picture className="landing-hero-art">
            <source
              media="(max-width: 680px)"
              srcSet="/art/landing/your-corner-mobile.webp"
            />
            <img
              src="/art/landing/your-corner.webp"
              alt="Four fighters together in a sunlit neighborhood gym"
              fetchPriority="high"
              width="1920"
              height="1080"
            />
          </picture>
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              THE FIGHT GYM MANAGEMENT GAME
            </span>
            <h1 id="landing-title">
              Small gym.
              <br />
              Big <em>legacy.</em>
            </h1>
            <p>
              Scout your fighters. Shape their training. Make the calls that
              turn your corner into champions.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button" to={playHref}>
                {playLabel}
              </Link>
              <a
                className="landing-button landing-button-quiet"
                href="#how-to-play"
              >
                See how it plays
              </a>
            </div>
            <small>Free to start · Play in your browser</small>
          </div>
          <div className="landing-hero-ticket">
            <span>YOUR GYM. YOUR FIGHTERS.</span>
            <strong>Your next great fight starts here.</strong>
          </div>
        </section>
        <div className="landing-promise-strip" aria-label="Game features">
          <span>BUILD YOUR TEAM</span>
          <span>CALL THE FIGHT</span>
          <span>TAKE ON RIVAL GYMS</span>
        </div>
        <section
          id="how-to-play"
          className="landing-section landing-play"
          aria-labelledby="landing-play-title"
        >
          <header className="landing-section-heading">
            <span className="landing-eyebrow">YOU’RE IN THEIR CORNER</span>
            <h2 id="landing-play-title">
              A simple loop.
              <br />A team worth building.
            </h2>
            <p>
              Choose the matchup. Prepare your fighter. Step into fight night.
            </p>
          </header>
          <div className="landing-loop-grid">
            <article>
              <div className="landing-loop-art">
                <img
                  src="/art/cartoon-team-locker-room.webp"
                  alt="A cozy team locker room"
                  loading="lazy"
                  width="800"
                  height="450"
                />
                <span>01</span>
              </div>
              <h3>Find your fighters</h3>
              <p>
                Recruit different styles, strengths and rarities. Develop a
                promising newcomer or build around a proven contender.
              </p>
            </article>
            <article>
              <div className="landing-loop-art">
                <img
                  src={gymEnvironment(1)}
                  alt="Your gym with training mats, a heavy bag and a practice cage"
                  loading="lazy"
                  width="800"
                  height="450"
                />
                <span>02</span>
              </div>
              <h3>Make a plan</h3>
              <p>
                Choose their training, recovery and tactics. When your team is
                ready, End week moves everyone forward together.
              </p>
            </article>
            <article>
              <div className="landing-loop-art">
                <img
                  src="/art/cartoon-fight-night.webp"
                  alt="A brightly lit fight-night arena"
                  loading="lazy"
                  width="800"
                  height="450"
                />
                <span>03</span>
              </div>
              <h3>Work the corner</h3>
              <p>
                Read the matchup and make calls between rounds, or trust your
                coach. Win purses, chase belts and learn from every result.
              </p>
            </article>
          </div>
        </section>
        <section
          id="your-corner"
          className="landing-section landing-corner"
          aria-labelledby="landing-corner-title"
        >
          <header className="landing-section-heading">
            <span className="landing-eyebrow">MORE THAN A FIGHT CARD</span>
            <h2 id="landing-corner-title">
              Find your people.
              <br />
              Build your corner.
            </h2>
            <p>
              A quick boxer. A patient grappler. The veteran who passes it on.
              Choose who your gym becomes.
            </p>
          </header>
          <div className="landing-fighter-grid">
            {corner.map((fighter) => (
              <article
                key={fighter.division}
                className="landing-fighter"
                data-rarity={fighter.rarity}
              >
                <div className="landing-fighter-art">
                  <img
                    src={`/art/fighters/${fighter.portrait}.webp`}
                    alt={`${fighter.division} fighter`}
                    loading="lazy"
                    width="600"
                    height="832"
                  />
                </div>
                <div>
                  <h3>{fighter.division}</h3>
                  <p>{fighter.style}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="landing-corner-note">
            Train their strengths. Choose a signature. Let veterans teach the
            next generation.
          </p>
        </section>
        <section
          id="gym-wars"
          className="landing-war"
          aria-labelledby="landing-war-title"
        >
          <img
            className="landing-war-art"
            src="/art/cartoon-fight-night.webp"
            alt=""
            loading="lazy"
            width="1600"
            height="900"
          />
          <div className="landing-war-copy">
            <span className="landing-eyebrow">THE WHOLE CORNER SHOWS UP</span>
            <h2 id="landing-war-title">
              Four fighters.
              <br />
              One rival gym.
              <br />
              <em>Your name on the line.</em>
            </h2>
            <p>
              One fighter in each division. Saved tactics for every matchup.
              Take your team into ranked 4v4 cards and compete for club cups,
              crests and leaderboard places.
            </p>
            <div className="landing-war-score">
              <strong>
                4 <span>vs</span> 4
              </strong>
              <small>
                Featherweight · Lightweight
                <br />
                Middleweight · Heavyweight
              </small>
            </div>
            <Link className="landing-button" to={playHref}>
              {playLabel}
            </Link>
          </div>
        </section>
        <section
          className="landing-section landing-legacy"
          aria-labelledby="landing-legacy-title"
        >
          <div>
            <span className="landing-eyebrow">
              FROM LOCAL CORNER TO CLUB LEGEND
            </span>
            <h2 id="landing-legacy-title">
              Give them a gym
              <br />
              to be proud of.
            </h2>
            <p>
              Grow your rooms. Develop your staff. Earn new circuits, trophy
              nights and permanent honors through what your team achieves.
            </p>
            <p>
              Every belt, pennant and earned cosmetic tells part of your club’s
              story.
            </p>
          </div>
          <div className="landing-legacy-art">
            <img
              src="/art/headquarters-tier-4.webp"
              alt="An expanded gym with a boxing ring, grappling room and trophy display"
              loading="lazy"
              width="1600"
              height="905"
            />
            <span>Build a home for your champions.</span>
          </div>
        </section>
        <section
          className="landing-section landing-questions"
          aria-labelledby="landing-questions-title"
        >
          <header className="landing-section-heading">
            <span className="landing-eyebrow">BEFORE THE FIRST BELL</span>
            <h2 id="landing-questions-title">Good to know.</h2>
          </header>
          <div className="landing-faq-grid">
            <article>
              <h3>Do I need to install anything?</h3>
              <p>
                No download. Create your gym and play in your browser, on
                desktop or phone.
              </p>
            </article>
            <article>
              <h3>Can I play at my own pace?</h3>
              <p>
                Yes. Planning never advances time. Career weeks and Gym Wars
                tokens refill over time; your team waits for your next visit.
              </p>
            </article>
            <article>
              <h3>What kind of fighting game is this?</h3>
              <p>
                You’re the manager and corner coach. Recruitment, preparation
                and tactical calls shape the fight. Every result gives you
                something to learn.
              </p>
            </article>
          </div>
        </section>
        <section className="landing-final">
          <span className="landing-eyebrow">THE DOORS ARE YOURS TO OPEN</span>
          <h2>
            Build your corner.
            <br />
            Make your name.
          </h2>
          <Link className="landing-button" to={playHref}>
            {playLabel}
          </Link>
          <p>Free to start. No download.</p>
        </section>
      </main>
      <footer className="landing-footer">
        <Link className="landing-wordmark" to="/" aria-label="Gym Wars home">
          GYM<span>WARS</span>
        </Link>
        <p>A small gym. A big story. Your call.</p>
        <Link to={authed ? "/career" : "/login"}>
          {authed ? "Back to my gym" : "Already have a gym? Log in"}
        </Link>
        <SiteLinks />
      </footer>
    </div>
  );
}
