import { useState } from "react";
import { Link } from "react-router-dom";
import { ClubCrest } from "./GymWarVisuals";
import { Action } from "./CareerControls";
import "./gym-war-club.css";

const record = (club) => `${club.wins}W · ${club.losses}L · ${club.draws}D`;
const seasonEnd = (league) =>
  new Date(league.season.endsAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

function Trophy() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M10 5h12v7a6 6 0 0 1-12 0V5ZM10 7H5v5a5 5 0 0 0 7 4M22 7h5v5a5 5 0 0 1-7 4M16 18v8M10 28h12M12 25h8" />
    </svg>
  );
}

function ScoringNote({ league }) {
  return (
    <p className="gw-season-rule">
      {league.season.scoring?.mode === "best-ten"
        ? `Your best ${league.season.scoring.limit} cards count. `
        : "Every ranked card counts. "}
      Win: 3 pts · Draw: 1 pt. Repeated or weaker rivals can earn fewer points.
      Ties use counted wins
      {league.season.scoring?.mode === "best-ten"
        ? ", then opposition strength"
        : ""}
      .
    </p>
  );
}

export default function GymWarClub({
  mine,
  league,
  followed,
  rival,
  busy,
  onBattle,
  onLeaderboard,
  onWatch,
  onFollow,
}) {
  const next = league.nextMilestone;
  const earned = league.milestones.filter((item) => item.reached).at(-1);
  const seasonalFocus =
    league.rivalObjectives?.find((item) => !item.earned) ||
    league.seasonPennants?.find((item) => !item.earned);
  const previousPoints = earned?.points || 0;
  const progress = next
    ? Math.max(
        0,
        Math.min(
          100,
          ((league.lifetimePoints - previousPoints) /
            (next.points - previousPoints)) *
            100,
        ),
      )
    : 100;
  return (
    <div className="gw-clubhouse">
      <header className="gw-club-profile">
        <div className="gw-club-identity">
          <ClubCrest name={mine.name} look={mine.look} />
          <div>
            <span className="career-eyebrow">YOUR CLUB</span>
            <h3>{mine.name}</h3>
            <p>
              {earned?.title || "Every great club starts in a small corner."}
            </p>
            <Link className="gw-profile-entry" to="/career/profile">
              View your profile
            </Link>
          </div>
        </div>
        <div className="gw-club-profile-footer">
          <span>
            {league.season.label} · Ends {seasonEnd(league)}
          </span>
          <span>{league.bandLabel} league</span>
        </div>
      </header>
      <dl className="gw-club-stats">
        <div>
          <dt>Season points</dt>
          <dd>
            {league.points}
            <small>
              {league.matches} ranked {league.matches === 1 ? "card" : "cards"}{" "}
              played
            </small>
          </dd>
        </div>
        <div>
          <dt>Season record</dt>
          <dd className="gw-club-record">
            {record(league)}
            <small>Attacking cards this season</small>
          </dd>
        </div>
        <div>
          <dt>Your league rank</dt>
          <dd>
            {league.rank ? `#${league.rank}` : "Unranked"}
            <small>
              {league.rank
                ? "Among gyms in your power league"
                : "Play your first ranked card to join"}
            </small>
          </dd>
        </div>
      </dl>
      <div className="gw-club-next-goal">
        <span className="gw-honor-symbol">
          <Trophy />
        </span>
        <div>
          <span className="career-eyebrow">
            {next ? "YOUR NEXT CLUB HONOR" : "YOUR CLUB LEGACY"}
          </span>
          <h3>{next?.title || "A full trophy cabinet."}</h3>
          <p>
            {next
              ? `${Math.max(0, next.points - league.lifetimePoints)} more permanent points to earn this honor.`
              : "Every permanent club honor earned. Keep building your season record."}
          </p>
          <div
            className="gw-honor-progress"
            role="progressbar"
            aria-label={
              next ? `Progress toward ${next.title}` : "Club honors complete"
            }
            aria-valuemin={previousPoints}
            aria-valuemax={next?.points || league.lifetimePoints || 1}
            aria-valuenow={league.lifetimePoints}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>
            {league.lifetimePoints}
            {next ? ` / ${next.points}` : ""} permanent points · Kept between
            seasons
          </small>
        </div>
        <Action onClick={onBattle}>Choose a rival</Action>
      </div>
      <section className="alpha-season-focus">
        <span className="career-eyebrow">YOUR OPTIONAL SEASON FOCUS</span>
        <h3>{seasonalFocus?.name || "Your season honors are earned"}</h3>
        <p>
          {seasonalFocus
            ? `${seasonalFocus.current ?? league.points} / ${seasonalFocus.target} · Take on comparable rivals with your four-division corner. Swap reserves and tactics for the next card. Earn recognition, without a new currency or stat boost.`
            : "Keep improving your record or develop a different corner. Your permanent club honors stay yours."}
        </p>
      </section>
      <section className="gw-season-overview">
        <div>
          <span className="career-eyebrow">THIS SEASON</span>
          <h3>Make your gym’s name.</h3>
          <ScoringNote league={league} />
        </div>
        <Action secondary onClick={onLeaderboard}>
          View leaderboard
        </Action>
        <div className="gw-season-goals">
          {league.seasonPennants.map((goal) => (
            <article key={goal.target} data-earned={goal.earned}>
              <Trophy />
              <div>
                <strong>{goal.name}</strong>
                <span>
                  {goal.earned
                    ? "Earned this season"
                    : `${league.points} / ${goal.target} season points`}
                </span>
              </div>
            </article>
          ))}
          {league.rivalObjectives.map((goal) => (
            <article key={goal.target} data-earned={goal.earned}>
              <ClubCrest name="VS" />
              <div>
                <strong>{goal.name}</strong>
                <span>
                  {goal.earned
                    ? "Challenge complete"
                    : `${goal.current} / ${goal.target} different close rivals beaten`}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="gw-trophy-cabinet">
        <header>
          <span className="career-eyebrow">YOURS TO KEEP</span>
          <h3>The trophy cabinet</h3>
          <p>Permanent honors from your ranked cards.</p>
        </header>
        <div className="gw-trophy-shelf">
          {league.milestones.map((goal) => (
            <article key={goal.points} data-earned={goal.reached}>
              <span className="gw-honor-symbol">
                <Trophy />
              </span>
              <strong>{goal.title}</strong>
              <span>{goal.points} permanent points</span>
              <small>
                {goal.reached
                  ? "Earned"
                  : next?.points === goal.points
                    ? "Up next"
                    : "Not earned yet"}
              </small>
            </article>
          ))}
        </div>
      </section>
      <section className="gw-club-rivalry">
        <ClubCrest
          name={followed?.opponent?.name || rival?.name || "Rival"}
          rival
        />
        <div>
          <span className="career-eyebrow">YOUR RIVALRY</span>
          <h3>
            {followed
              ? followed.opponent?.name || "Saved rival"
              : "Find the gym you want to beat."}
          </h3>
          <p>
            {followed
              ? `${record(followed.record)} · ${followed.reason}`
              : "Follow a gym and keep your shared card history here."}
          </p>
          <div className="gw-club-rival-actions">
            {followed?.lastResult && (
              <Action secondary onClick={() => onWatch(followed.lastResult)}>
                Watch last card
              </Action>
            )}
            {followed?.status === "matched" && (
              <Action onClick={() => onBattle(followed.opponent.id)}>
                Challenge this rival
              </Action>
            )}
            {rival && followed?.opponent?.id !== rival.id && (
              <Action secondary disabled={busy} onClick={() => onFollow(rival)}>
                Follow {rival.name}
              </Action>
            )}
            {!rival && !followed && (
              <Action onClick={onBattle}>Choose a rival</Action>
            )}
            {followed && (
              <button
                className="gw-rival-unfollow"
                type="button"
                disabled={busy}
                onClick={() => onFollow(null)}
              >
                Stop following
              </button>
            )}
          </div>
        </div>
      </section>
      {!!league.seasonArchive?.length && (
        <section className="gw-season-archive">
          <h3>Past seasons</h3>
          <div>
            {league.seasonArchive.map((season) => (
              <article key={season.seasonId}>
                <strong>{season.label}</strong>
                <b>{season.points} pts</b>
                <span>{season.honors.join(" · ") || "Season completed"}</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function GymWarLeaderboard({ mine, league, onBattle, onChallenge }) {
  const [scope, setScope] = useState("yourLeague");
  const board = league.leaderboard?.[scope];
  const rows = board?.rows || [];
  const own = rows.find((row) => row.isYou) || board?.yourRow;
  function Row({ club }) {
    return (
      <tr
        className={club.isYou ? "is-your-gym" : ""}
        data-position={club.position}
      >
        <td>
          <span className="gw-rank-number">{club.position}</span>
        </td>
        <th scope="row">
          <div className="gw-ranked-gym">
            <ClubCrest
              name={club.isYou ? mine.name : club.name}
              rival={!club.isYou}
              look={club.isYou ? mine.look : null}
            />
            <div>
              <Link
                to={
                  club.isYou
                    ? "/career/profile"
                    : `/career/profile/${club.gymId}`
                }
                aria-label={`View profile for ${club.isYou ? mine.name : club.name}`}
              >
                {club.isYou ? mine.name : club.name}
                <small>
                  {club.isYou ? "Your profile" : "View club profile"}
                </small>
              </Link>
              {!club.isYou && (
                <button
                  type="button"
                  className="gw-leader-challenge"
                  aria-label={`Challenge gym ${club.name}`}
                  onClick={() =>
                    onChallenge({ id: club.gymId, type: "player" })
                  }
                >
                  Challenge
                </button>
              )}
            </div>
          </div>
        </th>
        <td className="gw-leader-record">{record(club)}</td>
        <td className="gw-leader-cards">{club.matches}</td>
        <td>
          <b>{club.points}</b>
        </td>
      </tr>
    );
  }
  return (
    <div className="gw-leaderboard">
      <header className="gw-leaderboard-hero">
        <span className="gw-honor-symbol">
          <Trophy />
        </span>
        <div>
          <span className="career-eyebrow">
            {league.season.label.toUpperCase()} · ENDS{" "}
            {seasonEnd(league).toUpperCase()}
          </span>
          <h3>Gyms to beat.</h3>
          <p>Four fighters. One club climbing the ranks.</p>
        </div>
      </header>
      <div className="gw-leaderboard-toolbar">
        <div role="group" aria-label="Leaderboard scope">
          <button
            type="button"
            aria-pressed={scope === "yourLeague"}
            onClick={() => setScope("yourLeague")}
          >
            Your league
          </button>
          <button
            type="button"
            aria-pressed={scope === "allGyms"}
            onClick={() => setScope("allGyms")}
          >
            All gyms
          </button>
        </div>
        <span>
          {scope === "yourLeague" ? league.bandLabel : "Every power league"} ·{" "}
          {board?.total || 0} ranked {board?.total === 1 ? "gym" : "gyms"}
        </span>
      </div>
      <div className="gw-your-position">
        <ClubCrest name={mine.name} look={mine.look} />
        <div>
          <span>Your position</span>
          <strong>
            {own
              ? `#${own.position} · ${mine.name}`
              : `${mine.name} · Unranked`}
          </strong>
          <small>
            {own
              ? `${own.points} season points · ${record(own)}`
              : "Play a ranked card to earn your first position."}
          </small>
        </div>
        <Action onClick={onBattle}>Choose a rival</Action>
      </div>
      {!rows.length ? (
        <div className="gw-leaderboard-empty">
          <Trophy />
          <h3>The season is open.</h3>
          <p>
            {scope === "yourLeague"
              ? "No gym in your power league has played a ranked card yet."
              : "No gyms have played a ranked card yet."}{" "}
            Take your four into the arena and put your club on the board.
          </p>
        </div>
      ) : (
        <table className="gw-leaderboard-table">
          <caption>
            {scope === "yourLeague" ? "Your power league" : "All gyms"} ·{" "}
            {league.season.label} standings
          </caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Gym</th>
              <th className="gw-leader-record" scope="col">
                W · L · D
              </th>
              <th className="gw-leader-cards" scope="col">
                Cards
              </th>
              <th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((club) => (
              <Row key={club.gymId} club={club} />
            ))}
            {board.yourRow && (
              <>
                <tr className="gw-leaderboard-gap">
                  <th scope="row" colSpan="2">
                    Your gym outside the top {board.limit}
                  </th>
                  <td className="gw-leader-record" />
                  <td className="gw-leader-cards" />
                  <td />
                </tr>
                <Row club={board.yourRow} />
              </>
            )}
          </tbody>
        </table>
      )}
      <ScoringNote league={league} />
      <p className="gw-leaderboard-footnote">
        Season rankings use attacking cards. Defenses stay in your battle
        history. Season points reset; your club honors stay.
      </p>
    </div>
  );
}
