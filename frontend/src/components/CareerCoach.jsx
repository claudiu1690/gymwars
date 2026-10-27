import { calendarDate, daysUntil } from "../careerCalendar.mjs";
const money = (n) => "$" + n.toLocaleString("en-US");
const button = (text, onClick, disabled, secondary = false) => (
  <button
    type="button"
    className={`career-action ${secondary ? "secondary" : ""}`}
    onClick={onClick}
    disabled={disabled}
  >
    {text}
  </button>
);

export function CoachCard({ s, guide, onAction, disabled }) {
  const nextBout = s.fights
    .filter((b) => b.status !== "resolved")
    .sort((a, b) => a.eventWeek - b.eventWeek)[0];
  const fighter =
    nextBout && s.fighters.find((f) => f.id === nextBout.fighterId);
  const opponent =
    nextBout && s.rivals.find((f) => f.id === nextBout.opponentId);
  const latest = s.fights.filter((b) => b.status === "resolved").at(-1);
  return (
    <section
      className="career-panel career-next career-coach"
      aria-label="Coach’s next step"
    >
      <div className="career-eyebrow">
        YOUR COACH · {nextBout ? "NEXT FIGHT" : "NEXT STEP"}
      </div>
      {nextBout && (
        <p className="career-coach-matchup">
          <strong>
            {fighter?.name} vs {opponent?.name}
          </strong>
          <br />
          Already booked ·{" "}
          {nextBout.eventWeek > s.week
            ? `${calendarDate(s, nextBout.eventWeek)} · ${daysUntil(s, nextBout.eventWeek)}`
            : "Fight today"}
          .
        </p>
      )}
      {nextBout || guide.kind === "book" ? (
        <ol className="career-coach-steps" aria-label="Fight preparation steps">
          {["Book", "Train", "Recover", "Fight"].map((step, i) => (
            <li
              key={step}
              className={
                guide.step === i ? "current" : i < guide.step ? "done" : ""
              }
              aria-current={guide.step === i ? "step" : undefined}
            >
              <span>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      ) : null}
      <h2>{guide.title}</h2>
      <p>{guide.body}</p>
      {latest?.resolvedWeek === s.week && (
        <p className="career-coach-result">
          Last bout:{" "}
          {latest.result.winner === "A"
            ? "win"
            : latest.result.winner === "B"
              ? "loss"
              : "draw"}{" "}
          · {money(latest.purse)} earned. Every result builds your career.
        </p>
      )}
      {button(guide.cta, () => onAction(guide), disabled)}
      <small>You manage the team. Your fighters handle the action.</small>
    </section>
  );
}
