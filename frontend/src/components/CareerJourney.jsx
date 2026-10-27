import { careerGoal } from "../fightPresentation.mjs";
import { Action } from "./CareerControls";
import { Link } from "react-router-dom";

export default function CareerJourney({
  s,
  fighter,
  onRankings,
  compact = false,
}) {
  const goal = careerGoal(s, fighter);
  const journey = s.journey;
  const current = journey?.stages.find((stage) => stage.status === "current");
  const completion = journey?.completion;
  return (
    <section
      className={`career-journey ${compact ? "compact" : ""}`}
      aria-label="Your career goal"
    >
      <div className="career-eyebrow">
        {completion?.complete
          ? "CAREER COMPLETE"
          : "THE GOAL · BUILD A CHAMPIONSHIP GYM"}
      </div>
      <div className="career-section-head">
        <h2>
          {completion?.complete
            ? completion.label
            : journey
              ? journey.complete
                ? s.journey?.postInvitationalChallenge?.name ||
                  "Career Invitational winners"
                : current?.name
              : goal.title}
        </h2>
        {journey ? (
          <Link className="career-action secondary" to="/career/campaign">
            Open career path
          </Link>
        ) : (
          onRankings && (
            <Action secondary onClick={onRankings}>
              See the title race
            </Action>
          )
        )}
      </div>
      <p>
        {completion?.complete
          ? completion.description
          : journey
            ? journey.complete
              ? s.journey?.postInvitationalChallenge?.description ||
                "Complete a four-division team and earn your first Gym Wars club honor."
              : current?.description
            : goal.next}
      </p>
      {completion?.nextAction?.href && (
        <Link className="career-text-link" to={completion.nextAction.href}>
          {completion.nextAction.label}
        </Link>
      )}
      {!compact && (
        <>
          <ol className="career-journey-steps" aria-label="Career milestones">
            {(journey
              ? journey.stages.map((stage) => ({
                  name: stage.name,
                  complete: stage.complete,
                }))
              : [
                  "Make your debut",
                  "Reach 80 points",
                  "Win the belt",
                  "Defend it",
                ].map((name, i) => ({ name, complete: goal.milestones[i] }))
            ).map(({ name, complete }, i) => (
              <li key={name} className={complete ? "done" : ""}>
                <span aria-label={complete ? "Achieved" : "Not yet achieved"}>
                  {i + 1}
                </span>
                {name}
              </li>
            ))}
          </ol>
          <p className="career-journey-legacy">
            {goal.reigns} title reigns · {goal.defenses} defenses · {s.legacy}{" "}
            legacy
          </p>
          <small>
            A regional title opens the three-fighter Invitational. Win two of
            its three bouts to claim the Career Invitational trophy.
            Four-division Gym Wars is a separate ranked league.
          </small>
        </>
      )}
    </section>
  );
}
