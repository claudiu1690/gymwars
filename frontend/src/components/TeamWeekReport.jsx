import { Link } from "react-router-dom";
import { Action, Face } from "./CareerControls";
import { RarityBadge } from "./FighterRarity";
import { calendarDate, calendarText } from "../careerCalendar.mjs";
import {
  fighterBout,
  fighterPair,
  readiness,
  skillLabel,
  trainingSkills,
} from "../trainingPlans.mjs";
import "../pages/training-six.css";

const plus = (n) => `${n > 0 ? "+" : ""}${n}`;
const money = (n) => `$${n.toLocaleString("en-US")}`;

export default function TeamWeekReport({
  s,
  f: selectedFighter,
  onTraining,
  onBook,
  onFight,
  onReviewWeek,
}) {
  const report = s.lastAdvance;
  const f = selectedFighter;
  const b = fighterBout(s, f);
  const due = s.fights.find((x) => ["ready", "live"].includes(x.status));
  if (!report?.fighters?.length)
    return (
      <section className="career-panel">
        <h2>No week report yet</h2>
        <p>Assign training on the Gym floor, then press End week.</p>
        <Link to="/career/gym">Go to Gym</Link>
      </section>
    );
  return (
    <section className="camp-week-report" aria-label="Training week results">
      <nav className="fighter-breadcrumb">
        <Link to="/career/gym">Gym training floor</Link>
        <span>/ Whole-team results</span>
      </nav>
      <header className="camp-team-report-heading">
        <div className="career-eyebrow">
          {calendarDate(s, report.fromWeek)} → {calendarDate(s, report.week)} ·
          WORK COMPLETED
        </div>
        <h2>Week complete. Here’s what changed.</h2>
        <p>
          {report.fighters.length}{" "}
          {report.fighters.length === 1 ? "fighter" : "fighters"} ·{" "}
          {report.weeks} {report.weeks === 1 ? "week" : "weeks"} passed ·{" "}
          {money(report.cost)} shared gym costs
        </p>
      </header>
      <div
        className="camp-team-results"
        aria-label="Every fighter’s week results"
      >
        {report.fighters.map((row) => {
          const member = s.fighters.find((x) => x.id === row.id);
          if (!member) return null;
          const recentCamp =
            member.lastCamp?.endedWeek > report.fromWeek &&
            member.lastCamp.endedWeek <= report.week
              ? member.lastCamp
              : null;
          const prep =
            member.preparation && member.preparation.expiresWeek >= s.week
              ? member.preparation
              : null;
          const grew = Object.values(row.gains).some((n) => n > 0);
          const status = member.camp?.needsReview
            ? "Camp decision waiting"
            : member.camp
              ? `${member.camp.completed}/${member.camp.weeks} training weeks complete`
              : recentCamp
                ? recentCamp.interrupted
                  ? "Training interrupted"
                  : recentCamp.completed < recentCamp.weeks
                    ? "Camp ended early"
                    : "Camp complete"
                : fighterPair(s, member)
                  ? "Mentoring in progress"
                  : row.readiness > row.readinessBefore
                    ? "Recovered this week"
                    : "Week complete";
          return (
            <article
              className="camp-team-result"
              data-rarity={member.rarity}
              data-fighter-id={member.id}
              key={member.id}
            >
              <header>
                <Face fighter={member} compact />
                <div>
                  <h3>{member.name}</h3>
                  <RarityBadge rarity={member.rarity} />
                  <p>{status}</p>
                </div>
              </header>
              <dl
                className="camp-result-skills"
                aria-label={`${member.name} permanent skill changes`}
              >
                {trainingSkills.map((skill) => (
                  <div key={skill}>
                    <dt>{skillLabel(skill)}</dt>
                    <dd>{plus(row.gains[skill] || 0)}</dd>
                  </div>
                ))}
              </dl>
              <p>
                {grew
                  ? "Skill gains stay with this fighter."
                  : "No permanent skill gain in this advance."}
              </p>
              <div className="camp-result-readiness">
                <span>Readiness</span>
                <strong>
                  {row.readinessBefore}% → {row.readiness}%
                </strong>
              </div>
              {prep && (
                <div className="camp-result-prep">
                  <strong>
                    Fight preparation: +{prep.value} {prep.stat}
                  </strong>
                  <br />
                  Temporary bonus for the next eligible bout; valid through{" "}
                  {calendarDate(s, prep.expiresWeek)}.
                </div>
              )}
              {recentCamp?.stalled?.length > 0 && (
                <p className="career-warning">
                  Growth has stalled in {recentCamp.stalled.join(", ")}.
                </p>
              )}
              {recentCamp?.interrupted && (
                <p className="career-warning">
                  Funds ran out. This camp ended without a completion bonus.
                </p>
              )}
              <Link
                className="agenda-action"
                to={`/career/gym/training/${member.id}`}
              >
                {member.camp ? "Open camp" : "Training & recovery"}
              </Link>
            </article>
          );
        })}
      </div>
      {report.waived > 0 && (
        <p className="career-warning">
          Hardship support covered {money(report.waived)}. Unfunded training and
          mentoring stopped; fighters recovered instead.
        </p>
      )}
      <div className="camp-report-next">
        <div>
          <strong>
            {due
              ? "Your next challenge is ready."
              : f.camp?.needsReview
                ? "Keep training or recover sooner?"
                : b
                  ? `${f.name} faces ${s.rivals.find((x) => x.id === b.opponentId)?.name} on ${calendarDate(s, b.eventWeek)}.`
                  : f.camp
                    ? "There is more work in the plan."
                    : readiness(f) < 70
                      ? `${f.name} could use some recovery.`
                      : "Ready for your next session."}
          </strong>
          <p>
            {due
              ? "Take your preparation into the corner."
              : b && !f.camp
                ? "Review recovery and the whole gym’s schedule before moving on."
                : `Next step for ${f.name}. You can manage any teammate on the Gym training floor.`}
          </p>
        </div>
        <Action
          onClick={() =>
            due
              ? onFight(due.id)
              : !f.camp && readiness(f) < 70
                ? onReviewWeek(f.id, false, "recover")
                : onTraining(f.id)
          }
        >
          {due
            ? "Go to fight night"
            : f.camp?.needsReview
              ? "Review camp"
              : !f.camp && readiness(f) < 70
                ? "Recover"
                : "Back to training"}{" "}

        </Action>
        <Link className="agenda-action" to="/career/gym">
          Manage the whole team
        </Link>
      </div>
      <section className="camp-details">
        <h3>Gym events · {money(report.cost)} running costs</h3>
        {report.events?.length ? (
          report.events.map((e, i) => (
            <p key={i}>
              <small>{calendarDate(s, e.week)}</small> ·{" "}
              {calendarText(s, e.text)}
            </p>
          ))
        ) : (
          <p>No additional gym events during this advance.</p>
        )}
      </section>
    </section>
  );
}
