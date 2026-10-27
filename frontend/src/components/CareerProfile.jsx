import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { ClubMark } from "./ClubIdentity";
import { Face } from "./CareerControls";
import { RarityBadge } from "./FighterRarity";
import SignatureBadge from "./SignatureBadge";
import "./gym-profile.css";

const label = (s = "") =>
  s.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
const record = (r) => `${r.wins}W · ${r.losses}L · ${r.draws}D`;
const skills = ["striking", "grappling", "submissions", "conditioning"];

export default function CareerProfile({ gymId = "me", revision, signatures }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api(`/career/profiles/${encodeURIComponent(gymId)}`)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [gymId, revision, attempt, refresh]);
  if (error)
    return (
      <section
        className="career-panel gym-profile-error"
        aria-label="Profile unavailable"
      >
        <h2>Profile unavailable</h2>
        <p role="alert">{error}</p>
        <button
          type="button"
          className="career-action secondary"
          onClick={refresh}
        >
          Try again
        </button>
        <Link className="career-action" to="/career/gym-wars">
          Back to Gym Wars
        </Link>
      </section>
    );
  if (!data) return <p role="status">Opening the club profile…</p>;
  const { isYou, league, team } = data;
  return (
    <div className="gym-profile">
      <section className="gym-profile-hero" aria-label="Club profile">
        <div className="gym-profile-identity">
          <ClubMark look={data.look} />
          <div>
            <span className="career-eyebrow">
              {isYou ? "YOUR PUBLIC PROFILE" : "MEET THE CLUB"}
            </span>
            <h2>{data.name}</h2>
            <p>
              Tier {data.facility.tier} · {data.facility.name}
            </p>
            <strong>{league.title}</strong>
          </div>
        </div>
        <div className="gym-profile-actions">
          {isYou ? (
            <Link className="career-action" to="/career/achievements">
              Choose club colors
            </Link>
          ) : team.ready ? (
            <Link
              className="career-action"
              to={`/career/gym-wars?rival=${data.id}&type=player`}
            >
              Challenge this gym
            </Link>
          ) : (
            <span className="gym-profile-team-status">
              4v4 team not published
            </span>
          )}
          <Link
            className="career-action secondary"
            to="/career/gym-wars?tab=leaderboard"
          >
            Gym leaderboard
          </Link>
          <small>
            {isYou
              ? "This is what other managers can see."
              : "Reviewing a club or matchup is free. Play uses 1 token."}
          </small>
        </div>
      </section>
      <section className="gym-profile-stats" aria-label="Club record">
        <article>
          <span>ACHIEVEMENTS</span>
          <strong>
            {data.earnedCount} <small>/ {data.achievementTotal}</small>
          </strong>
          <p>Earned through play</p>
        </article>
        <article>
          <span>{league.season.label.toUpperCase()} · GYM WARS</span>
          <strong>
            {league.points} <small>points</small>
          </strong>
          <p>
            {league.matches
              ? `${record(league)} · #${league.rank} overall`
              : "No ranked cards this season"}
          </p>
        </article>
        <article>
          <span>LIFETIME HONOR</span>
          <strong>
            {league.lifetimePoints} <small>points</small>
          </strong>
          <p>Kept across seasons</p>
        </article>
        <article>
          <span>CAREER BOUTS</span>
          <strong>{data.career.bouts}</strong>
          <p>{record(data.career)}</p>
        </article>
      </section>
      {!!league.honors.length && (
        <section className="gym-profile-pennants" aria-label="Season honors">
          {league.honors.map((name) => (
            <span key={name}>
              {league.season.label} · {name}
            </span>
          ))}
        </section>
      )}
      <section
        className="gym-profile-team"
        aria-label="Published Gym Wars team"
      >
        <header className="gym-profile-section-head">
          <div>
            <span className="career-eyebrow">FOUR DIVISIONS. ONE CORNER.</span>
            <h3>Gym Wars team</h3>
            <p>
              {team.ready
                ? "The club’s published lineup. These are the fighters you’ll face."
                : "A full 4v4 lineup hasn’t been published yet."}
            </p>
          </div>
          {isYou && (
            <Link
              className="career-action secondary"
              to="/career/gym-wars?tab=team"
            >
              Manage your team
            </Link>
          )}
        </header>
        {team.ready ? (
          <div className="gym-profile-fighters">
            {team.lineup.map((f) => (
              <article
                className="gym-profile-fighter"
                data-rarity={f.rarity}
                key={f.id}
              >
                <div className="gym-profile-fighter-art">
                  <Face fighter={f} />
                  <SignatureBadge fighter={f} definitions={signatures} />
                </div>
                <div className="gym-profile-fighter-copy">
                  <div className="rarity-nameplate">
                    <RarityBadge rarity={f.rarity} />
                  </div>
                  <span>{label(f.weightClass)}</span>
                  <h4>{f.name}</h4>
                  <p>
                    {label(f.style)} · {f.record?.wins || 0}W ·{" "}
                    {f.record?.losses || 0}L
                  </p>
                  <dl>
                    {skills.map((key) => (
                      <div key={key}>
                        <dt>{label(key)}</dt>
                        <dd>{Math.round(f.stats[key])}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="gym-profile-empty">
            <h4>A team in the making.</h4>
            <p>
              {isYou
                ? "Recruit one fighter in each division, then save your team and tactics in Gym Wars."
                : "This club is building its corner. Its achievements are still here to explore."}
            </p>
            {isYou && (
              <Link className="career-action" to="/career/scouting">
                Build your corner
              </Link>
            )}
          </div>
        )}
      </section>
      <section
        className="gym-profile-trophies"
        aria-label="Earned achievements"
      >
        <header className="gym-profile-section-head">
          <div>
            <span className="career-eyebrow">EARNED. NEVER BOUGHT.</span>
            <h3>The trophy wall</h3>
            <p>
              {data.earnedCount} achievements · Career quests, training and gym
              battles
            </p>
          </div>
          {isYou && (
            <Link className="career-action secondary" to="/career/achievements">
              All achievements
            </Link>
          )}
        </header>
        {data.achievements.length ? (
          <div className="gym-profile-awards">
            {data.achievements.map((a) => (
              <article key={a.id}>
                <ClubMark look={a.reward} />
                <div>
                  <small>
                    {a.group === "club"
                      ? "YOUR GYM"
                      : label(a.group).toUpperCase()}
                  </small>
                  <h4>{a.name}</h4>
                  <p>{a.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="gym-profile-empty">
            <h4>The first chapter is still being written.</h4>
            <p>
              {isYou
                ? "Finish your first career bout to earn your first achievement and a new club look."
                : "This club hasn’t earned an achievement yet."}
            </p>
            {isYou && (
              <Link className="career-action" to="/career/fights">
                Find your first fight
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
