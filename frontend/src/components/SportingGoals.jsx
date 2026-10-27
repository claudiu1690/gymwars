import { Link } from "react-router-dom";
import "./sporting-goals.css";

// Optional targets use earned competition content; they never advance time or
// replace a player's pinned ambition or a fight that needs attention.
export default function SportingGoals({ s, competition }) {
  const honor = s.gymDevelopment?.sportingGoals?.[0];
  const cup = competition?.challenges?.find((c) => !c.complete);
  if (!honor && !cup) return null;
  const tokens = competition?.league?.allowance?.available;
  return (
    <section className="sporting-goals" aria-label="Your next sporting goals">
      <header>
        <span className="career-eyebrow">KEEP YOUR CORNER COMPETING</span>
        <h2>Your next sporting goals</h2>
        <p>
          Permanent honors to chase between gym expansions. Pick the challenge
          you want.
        </p>
      </header>
      <div className="sporting-goal-grid">
        {cup && (
          <article
            className="sporting-goal sporting-cup"
            style={{
              "--sporting-art": `url('/art/headquarters-tier-${cup.challenge.minTier}.webp')`,
            }}
          >
            <div>
              <span className="career-eyebrow">
                4V4 CLUB CUP ·{" "}
                {cup.locked ? `GYM TIER ${cup.challenge.minTier}` : "AVAILABLE"}
              </span>
              <h3>{cup.challenge.rewardName}</h3>
              <p>
                {cup.name}. Win the four-division card to earn its permanent
                cosmetic crest.
              </p>
              <strong>
                {cup.locked
                  ? `Reach gym tier ${cup.challenge.minTier} to enter`
                  : "Four fighters · one rival gym · one token"}
              </strong>
              {!cup.locked && tokens === 0 && (
                <p>
                  Your next token refills normally. Review the rival and save
                  your team tactics now.
                </p>
              )}
              <Link
                className="career-action"
                to={
                  cup.locked
                    ? "/career/gym/facilities"
                    : `/career/gym-wars?rival=${encodeURIComponent(cup.id)}`
                }
              >
                {cup.locked ? "Plan your next expansion" : "View the cup rival"}
              </Link>
            </div>
          </article>
        )}
        {honor && (
          <article className="sporting-goal sporting-honor">
            <div>
              <span className="career-eyebrow">CAREER CIRCUIT HONOR</span>
              <h3>{honor.name}</h3>
              <p>{honor.description}</p>
              <label>
                {honor.current}/{honor.target} circuit victories
                <progress
                  aria-label={`${honor.name} progress`}
                  value={honor.current}
                  max={honor.target}
                />
              </label>
              <strong>
                {honor.cash > 0
                  ? `$${honor.cash.toLocaleString("en-US")} first-victory prize · permanent honor`
                  : "Permanent club honor · signed purse unchanged"}
              </strong>
              <Link className="career-action secondary" to={honor.action.href}>
                {honor.action.label}
              </Link>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
