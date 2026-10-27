import { Link } from "react-router-dom";
import { ClubMark } from "./ClubIdentity";
import "./achievements.css";
import { careerPathFocus } from "../careerPath.mjs";
import StaffWork from "./StaffWork";
import "./career-path.css";

const money = (value) => `$${value.toLocaleString("en-US")}`;
export function PathAction({ action, className = "career-action" }) {
  if (!action?.href) return null;
  return action.href.startsWith("#") ? (
    <a className={className} href={action.href}>
      {action.label}
    </a>
  ) : (
    <Link className={className} to={action.href}>
      {action.label}
    </Link>
  );
}
export function PathProgress({ progress }) {
  return progress?.target > 0 ? (
    <div className="path-progress">
      <progress
        max={progress.target}
        value={Math.min(progress.current, progress.target)}
        aria-label={progress.label}
      />
      <span>{progress.label}</span>
    </div>
  ) : null;
}
export function Pennant({ number, earned = false }) {
  return (
    <span
      className={`path-pennant ${earned ? "earned" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 70 86">
        <path d="M4 4h62v56L35 81 4 60Z" />
        <path d="M12 12h46v44L35 72 12 56Z" />
      </svg>
      <b>{number}</b>
    </span>
  );
}
export function CareerPathHero({ s }) {
  const focus = careerPathFocus(s);
  return (
    <section
      className="career-path-hero"
      aria-label="Your next career milestone"
    >
      <div className="path-hero-copy">
        <span className="path-eyebrow">{focus.status}</span>
        <h2>{focus.title}</h2>
        <p>{focus.description}</p>
        <PathProgress progress={focus.progress} />
        {focus.reward && (
          <div className="path-next-reward">
            <span>WHAT YOU EARN</span>
            <strong>{focus.reward}</strong>
          </div>
        )}
        <PathAction action={focus.action} />
      </div>
      <div className="path-club-level">
        <span>CLUB REPUTATION · LEVEL {s.careerCircuit?.level || 1}</span>
        <strong>
          {(s.careerCircuit?.name || "Regional").replace(" circuit", "")}
        </strong>
        <small>Club achievements unlock new opponents and bigger purses.</small>
      </div>
    </section>
  );
}
export function CircuitRoadmap({ s }) {
  const circuits = s.rules.circuits || [];
  const goals = s.gymDevelopment?.goals || [];
  if (!circuits.length) return null;
  return (
    <section
      id="club-levels"
      className="path-promotions"
      aria-label="Club reputation unlock levels"
    >
      <header className="path-section-heading">
        <div>
          <span className="path-eyebrow">SIX CLUB REPUTATION LEVELS</span>
          <h2>Grow your gym’s reputation</h2>
          <p>
            These are unlock levels for your gym: new opponents and larger
            purses. Your fighters still compete for the same four regional
            belts.
          </p>
        </div>
        <span>
          Level {s.careerCircuit?.level || 1} / {circuits.length}
        </span>
      </header>
      <div className="path-competition-guide">
        <Link to="/career/rankings">
          <strong>Fighter rankings</strong>
          <span>
            One regional title ladder per weight class. Earn 80 points, then
            challenge for the belt.
          </span>
        </Link>
        <Link to="/career/gym-wars">
          <strong>Gym Wars</strong>
          <span>A separate 4v4 gym league with its own club leaderboard.</span>
        </Link>
      </div>
      <ol className="path-circuit-grid">
        {circuits.map((circuit, index) => {
          const goal = goals.find((item) => item.id === circuit.goalId);
          const reached = index < (s.careerCircuit?.level || 1);
          const current = index + 1 === s.careerCircuit?.level;
          const next = index === (s.careerCircuit?.level || 1);
          return (
            <li
              key={circuit.id}
              className="path-circuit"
              data-state={
                current
                  ? "current"
                  : reached
                    ? "earned"
                    : next
                      ? "next"
                      : "locked"
              }
            >
              <header>
                <Pennant number={index + 1} earned={reached} />
                <div>
                  <span>
                    {current
                      ? "CURRENT CLUB LEVEL"
                      : reached
                        ? "EARNED"
                        : next
                          ? "NEXT PROMOTION"
                          : "LATER PROMOTION"}
                  </span>
                  <h3>
                    {circuit.name.replace(" circuit", "")}{" "}
                    <small>Level {index + 1}</small>
                  </h3>
                </div>
              </header>
              <p>{circuit.requirement}</p>
              {index > 0 && <small className="path-prerequisite">Each fighter also needs {index >= 3 ? 4 : 2} career wins to enter. Regional bouts stay open for development.</small>}
              {(s.achievementRewards || [])
                .filter((a) => a.questId === circuit.goalId)
                .map((a) => (
                  <div key={a.id} className="path-achievement-reward">
                    <ClubMark look={a.reward} />
                    <Link to={"/career/achievements#achievement-" + a.id}>
                      Cosmetic reward: {a.reward.name}
                    </Link>
                  </div>
                ))}
              <div className="path-circuit-purse">
                <strong>{money(circuit.show)}</strong>
                <span>to fight · +{money(circuit.winBonus)} for a win</span>
              </div>
              {goal && !reached && (
                <PathProgress
                  progress={{
                    current: goal.current,
                    target: goal.target,
                    label: `${goal.current} / ${goal.target} ${goal.unit}`,
                  }}
                />
              )}
              {goal?.waitingFor && !reached && (
                <small className="path-prerequisite">
                  {goal.deedComplete ? "Achievement recorded. " : ""}First earn{" "}
                  {goal.waitingFor.name}.
                </small>
              )}
              {next && goal?.href && (
                <PathAction
                  className="path-text-action"
                  action={{
                    label: goal.name,
                    href:
                      goal.href === "/career/campaign"
                        ? "#career-invitational"
                        : goal.href,
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="path-fine-print">
        Club reputation changes the fights available, not your regional ranking.
        Each offer shows its exact prize money.
      </p>
    </section>
  );
}
export function ClubChallenges({ s }) {
  const challenges = s.gymDevelopment?.challenges || [];
  if (!challenges.length) return null;
  return (
    <section className="path-challenges" aria-label="Club challenges">
      <header className="path-section-heading">
        <div>
          <span className="path-eyebrow">MORE TO FIGHT FOR</span>
          <h2>Put your gym’s name on a trophy</h2>
          <p>
            World promotion and all three challenges complete your club career.
          </p>
        </div>
        <span>
          {challenges.filter((item) => item.complete).length} /{" "}
          {challenges.length} earned
        </span>
      </header>
      <div className="path-challenge-grid">
        {challenges.map((challenge, index) => (
          <article
            className="path-challenge"
            key={challenge.id}
            data-state={
              challenge.complete
                ? "earned"
                : challenge.locked
                  ? "locked"
                  : "open"
            }
          >
            <Pennant number={index + 1} earned={challenge.complete} />
            <span className="path-eyebrow">
              {challenge.complete
                ? "TROPHY EARNED"
                : challenge.locked
                  ? "WORK TOWARD IT"
                  : "AVAILABLE"}
            </span>
            <h3>{challenge.name}</h3>
            <p>{challenge.description}</p>
            <strong className="path-challenge-prize">
              {challenge.reward.trophy}
            </strong>
            <small>
              +{challenge.reward.legacy} reputation
              {challenge.reward.cash > 0 &&
                ` · $${challenge.reward.cash.toLocaleString("en-US")} first-victory prize`}
            </small>
            {(s.achievementRewards || [])
              .filter((a) => a.challengeId === challenge.id)
              .map((a) => (
                <div key={a.id} className="path-achievement-reward">
                  <ClubMark look={a.reward} />
                  <Link to={"/career/achievements#achievement-" + a.id}>
                    Cosmetic reward: {a.reward.name}
                  </Link>
                </div>
              ))}
            {challenge.blockedReason && !challenge.complete && (
              <p className="path-prerequisite">{challenge.blockedReason}</p>
            )}
            {!challenge.complete && (
              <PathAction
                className="path-text-action"
                action={{ label: challenge.actionLabel, href: challenge.href }}
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
export function StaffGoals({ s }) {
  if (!s.staffOptions) return null;
  return (
    <section className="path-staff" aria-label="Staff careers">
      <header className="path-section-heading">
        <div>
          <span className="path-eyebrow">GROW THE PEOPLE IN YOUR CORNER</span>
          <h2>Your staff earn their next rank</h2>
          <p>
            Coach camps. Discover talent. Their work makes the next promotion
            possible.
          </p>
        </div>
      </header>
      <div className="path-staff-grid">
        {["coach", "scout"].map((role) => {
          const option = s.staffOptions[role];
          return (
            <article key={role}>
              <span className="path-eyebrow">
                {role === "coach" ? "COACHING PATH" : "SCOUTING PATH"}
              </span>
              <h3>
                {option.current?.name ||
                  (role === "coach"
                    ? "Build your coaching corner"
                    : "Build your scouting network")}
              </h3>
              {option.current ? (
                <>
                  <p>
                    {option.next
                      ? `Working toward ${option.next.name}.`
                      : "Top rank earned."}
                  </p>
                  <StaffWork option={option} role={role} compact />
                </>
              ) : (
                <p>
                  Hire after your opening bout.{" "}
                  {role === "coach"
                    ? "Training weeks and full camps develop your coach."
                    : "Investigations and recruitment develop your scout."}
                </p>
              )}
              <Link className="path-text-action" to="/career/gym/staff">
                {option.canUpgrade
                  ? "Review earned promotion"
                  : "Open staff development"}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
