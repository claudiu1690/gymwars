import { useEffect, useRef, useState } from "react";
import { calendarDate, calendarText } from "../careerCalendar.mjs";
import { useTrainingDraft } from "../TrainingDraftContext";
import { assignmentFor } from "../careerAssignment.mjs";
import {
  fighterBout,
  fighterPair,
  gymWeekPreview,
  skillLabel,
  trainingSkills,
} from "../trainingPlans.mjs";
import "./career-turn.css";
import { AllowanceLine } from "./CareerAvailability";
import { Link } from "react-router-dom";
import { Action, Face } from "./CareerControls";
import { campTitle } from "../trainingPlans.mjs";
import { GameDialog } from "./GameUI";

const money = (amount = 0) => `$${amount.toLocaleString("en-US")}`;
const plus = (amount) => `${amount > 0 ? "+" : ""}${amount}`;

function resultStatus(s, member, report, row) {
  if (row.outcome)
    return (
      {
        retired: "Retired this week · career saved",
        interrupted: "Camp interrupted: funds ran out",
        "camp-complete": "Camp complete",
        "check-in": "Camp check-in ready",
        training: "Training continues",
        "fight-ready": "Ready for fight night",
        mentoring: "Mentoring week complete",
        rest:
          row.readiness > row.readinessBefore
            ? "Recovered this week"
            : "Stayed fresh",
      }[row.outcome] || "Week complete"
    );
  if (member.camp?.needsReview) return "Camp check-in ready";
  if (member.camp)
    return `${member.camp.completed}/${member.camp.weeks} camp weeks complete`;
  const camp = member.lastCamp;
  if (camp && camp.endedWeek > report.fromWeek && camp.endedWeek <= report.week)
    return camp.interrupted
      ? "Camp interrupted: funds ran out"
      : camp.completed < camp.weeks
        ? "Camp ended early"
        : "Camp complete";
  if (fighterPair(s, member)) return "Mentoring continues";
  if (fighterBout(s, member)?.status === "ready")
    return "Ready for fight night";
  return row.readiness > row.readinessBefore
    ? "Recovered this week"
    : "Week complete";
}

export default function CareerTurnBar({
  s,
  allowance,
  reportOverride,
  disabled,
  busy,
  onEndWeek,
  onRestWeek,
  onResolve,
  onTraining,
  showResults,
  onDismissResults,
}) {
  const { draft } = useTrainingDraft();
  const resultHeading = useRef(null);
  const resultPanel = useRef(null);
  const reportDialog = useRef(null);
  const plansTrigger = useRef(null);
  const plansReturn = useRef(null);
  const resultReturn = useRef(null);
  const dock = useRef(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [openedReport, setOpenedReport] = useState(false);
  const report = reportOverride || s.lastAdvance;
  const historical = report && report.week < s.week;
  const reportKey = report ? `${report.fromWeek}-${report.week}` : "";
  const resultsVisible = Boolean(
    (showResults || openedReport) && report?.fighters,
  );
  const closePlans = (restore = true) => {
    setPlansOpen(false);
    if (restore !== false && plansReturn.current?.isConnected)
      plansReturn.current.focus({ preventScroll: true });
  };
  const closeReport = (restore = true) => {
    setOpenedReport(false);
    onDismissResults?.();
    if (restore !== false && resultReturn.current?.isConnected)
      resultReturn.current.focus({ preventScroll: true });
  };
  const openPlans = () => {
    plansReturn.current = document.activeElement;
    closeReport(false);
    setPlansOpen(true);
  };
  useEffect(() => {
    closePlans(false);
  }, [s.week]);

  useEffect(() => {
    const app = dock.current?.closest(".career-app");
    if (!app) return;
    const previous = app.style.getPropertyValue("--gw-turn-measured");
    const measure = () => {
      if (dock.current)
        app.style.setProperty(
          "--gw-turn-measured",
          `${Math.ceil(dock.current.getBoundingClientRect().height)}px`,
        );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(dock.current);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (previous) app.style.setProperty("--gw-turn-measured", previous);
      else app.style.removeProperty("--gw-turn-measured");
    };
  }, []);

  useEffect(() => {
    if (!plansOpen && !resultsVisible) return;
    const keydown = (event) => {
      if (
        event.key !== "Escape" ||
        document.querySelector('.gw-shell-navigation[aria-modal="true"]')
      )
        return;
      event.preventDefault();
      if (plansOpen) closePlans();
      if (resultsVisible) closeReport();
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
    };
  }, [plansOpen, resultsVisible, onDismissResults]);

  useEffect(() => {
    if (!resultsVisible) return;
    closePlans(false);
    resultReturn.current = document.activeElement?.closest(
      ".gw-turn-plan-panel",
    )
      ? plansTrigger.current
      : document.activeElement;
    resultHeading.current?.focus({ preventScroll: true });
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    resultPanel.current?.scrollTo({
      top: 0,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [resultsVisible, reportKey]);
  useEffect(() => {
    if (!resultsVisible) return;
    const modal = reportDialog.current;
    if (modal && !modal.open) modal.showModal();
    resultHeading.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      modal?.close();
      document.body.style.overflow = overflow;
      if (resultReturn.current?.isConnected)
        resultReturn.current.focus({ preventScroll: true });
    };
  }, [resultsVisible]);

  const team = s.fighters.filter(
    (member) => !member.retired && !member.released,
  );
  const dueFight = s.fights.find((fight) =>
    ["ready", "live"].includes(fight.status),
  );
  const campDecision = team.find((member) => member.camp?.needsReview);
  const blocked = Boolean(s.blocking || dueFight || campDecision);
  const preview = blocked
    ? null
    : team[0]
      ? gymWeekPreview(s, team[0])
      : {
          endWeek: s.week + 1,
          cost: Math.min(s.cash, s.weeklyCost),
          waived: Math.max(0, s.weeklyCost - s.cash),
        };
  const training = team.filter((member) => member.camp).length;
  const mentoring = team.filter(
    (member) => !member.camp && fighterPair(s, member),
  ).length;
  const resting = team.length - training - mentoring;
  const unavailable = Boolean(disabled || busy);
  const empty = allowance?.available === 0;

  return (
    <aside
      className="career-turn-bar gw-turn-dock"
      ref={dock}
      aria-label="Week controls"
    >
      {resultsVisible && (
        <dialog
          className="career-week-screen"
          ref={reportDialog}
          aria-labelledby="career-week-result-title"
          onCancel={(event) => {
            event.preventDefault();
            closeReport();
          }}
        >
          <section
            className="career-turn-results"
            ref={resultPanel}
            aria-labelledby="career-week-result-title"
          >
            <header className="career-turn-result-heading">
              <div>
                <span className="career-turn-result-date">
                  {calendarDate(s, report.fromWeek)} →{" "}
                  {calendarDate(s, report.week)}
                </span>
                <h2
                  id="career-week-result-title"
                  tabIndex={-1}
                  ref={resultHeading}
                >
                  {historical ? "Previously saved week" : "Week complete"}
                </h2>
                <p>
                  {money(report.cost)} paid in shared gym costs
                  {report.waived > 0
                    ? ` · ${money(report.waived)} hardship support`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className="career-turn-result-close"
                onClick={closeReport}
                aria-label="Close week results"
              >
                ✕
              </button>
            </header>
            <div className="career-turn-result-team">
              {report.fighters.map((row) => {
                const member = s.fighters.find(
                  (fighter) => fighter.id === row.id,
                );
                if (!member) return null;
                const gains = trainingSkills.filter(
                  (skill) =>
                    row.gains?.[skill] !== 0 && row.gains?.[skill] != null,
                );
                return (
                  <article className="career-turn-result-fighter" key={row.id}>
                    <Face fighter={member} compact />
                    <div className="career-turn-result-work">
                      <strong>{member.name}</strong>
                      {row.activity && (
                        <b className="career-week-activity">
                          {row.activity === "training"
                            ? campTitle(s, row.training)
                            : row.activity === "mentoring"
                              ? "Mentoring"
                              : "Rest & recover"}
                        </b>
                      )}
                      <span>
                        {historical && !row.outcome
                          ? "Result from this saved week"
                          : resultStatus(s, member, report, row)}
                      </span>
                      <div
                        className="career-turn-result-gains"
                        aria-label={`${member.name} skill changes`}
                      >
                        {gains.length ? (
                          gains.map((skill) => (
                            <span key={skill}>
                              {plus(row.gains[skill])} {skillLabel(skill)}
                            </span>
                          ))
                        ) : (
                          <span className="career-turn-no-gains">
                            No skill gains this week
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="career-turn-result-condition">
                      <span>Readiness</span>
                      <strong>
                        {row.readinessBefore}% → {row.readiness}%
                      </strong>
                    </div>
                  </article>
                );
              })}
            </div>
            {report.waived > 0 && (
              <p className="career-turn-result-warning">
                Funds ran out. Unfunded training and mentoring ended; fighters
                recovered instead.
              </p>
            )}
            {report.events?.length > 0 && (
              <section
                className="career-turn-result-events"
                aria-label="Gym events this week"
              >
                <h3>Gym events · {report.events.length}</h3>
                {report.events.map((event, index) => (
                  <p key={index}>
                    {calendarDate(s, event.week)} ·{" "}
                    {calendarText(s, event.text)}
                  </p>
                ))}
              </section>
            )}
            <footer className="career-week-continue">
              <Action onClick={closeReport}>Continue planning</Action>
              {(dueFight || campDecision) && (
                <Action
                  secondary
                  onClick={() => {
                    closeReport(false);
                    onResolve?.();
                  }}
                >
                  {dueFight ? "Go to fight night" : "Review camp check-in"}
                </Action>
              )}
            </footer>
          </section>
        </dialog>
      )}
      <div className="gw-turn-row">
        <div className="gw-turn-date">
          <strong>{calendarDate(s)}</strong>
          <AllowanceLine allowance={allowance} compact />
          {report?.fighters && (
            <button
              type="button"
              className="gw-plans-button gw-direct-report"
              onClick={() => setOpenedReport(true)}
            >
              Week report
            </button>
          )}
        </div>
        <div className="gw-turn-overview" aria-live="polite">
          <strong>
            {blocked
              ? "Time paused"
              : draft
                ? "Camp preview"
                : `${training} training · ${resting} resting${mentoring ? ` · ${mentoring} mentoring` : ""}`}
          </strong>
          <span>
            {blocked
              ? dueFight
                ? "Your fight is ready"
                : "A camp needs your decision"
              : draft
                ? "Choose Assign camp or rest in Week plans"
                : `${money(preview.cost)} next week${preview.waived > 0 ? " · funds low" : ""}`}
          </span>
        </div>
        <div className="career-turn-plans gw-turn-plans">
          <button
            type="button"
            className="gw-plans-button"
            ref={plansTrigger}
            aria-haspopup="dialog"
            onClick={openPlans}
            aria-label={`Week plans: ${training} training, ${mentoring} mentoring, ${resting} resting`}
          >
            <span className="gw-turn-plans-full">Week </span>plans{" "}
          </button>
          <GameDialog
            open={plansOpen}
            onClose={closePlans}
            title="This week’s team plans"
          >
            <section
              className="gw-turn-plan-panel"
              aria-label="Team plans for this week"
            >
              <AllowanceLine allowance={allowance} />
              <p>Set plans freely. Only End week moves the calendar.</p>
              <p
                className={
                  preview?.waived > 0
                    ? "gw-turn-budget-warning"
                    : "gw-turn-budget"
                }
              >
                {blocked
                  ? dueFight
                    ? "Finish fight night before the next week."
                    : "Make the camp decision before the next week."
                  : `${calendarDate(s)} → ${calendarDate(s, preview.endWeek)} · ${money(preview.cost)} shared gym costs${preview.waived > 0 ? ". Funds low: unfunded training ends; team rests." : "."}`}
              </p>
              {!blocked && draft && (
                <div className="career-turn-draft" role="status">
                  <span>
                    <strong>
                      {draft.name.split(" ")[0]}'s camp is a preview.
                    </strong>{" "}
                    Assign it, or rest this week.
                  </span>
                  <button
                    type="button"
                    disabled={unavailable || !draft.canAssign}
                    onClick={draft.onAssign}
                  >
                    Assign camp
                  </button>
                  <button
                    type="button"
                    disabled={unavailable || empty || !onRestWeek}
                    onClick={onRestWeek}
                  >
                    Rest & end week
                  </button>
                </div>
              )}
              <div className="gw-turn-team-counts">
                <span>
                  <b>{training}</b> training
                </span>
                <span>
                  <b>{mentoring}</b> mentoring
                </span>
                <span>
                  <b>{resting}</b> resting
                </span>
              </div>
              <div className="gw-turn-team-list">
                {team.length ? (
                  team.map((member) => (
                    <button
                      type="button"
                      disabled={unavailable || !onTraining}
                      key={member.id}
                      onClick={() => {
                        closePlans();
                        onTraining?.(member.id);
                      }}
                    >
                      <span>{member.name}</span>
                      <small>
                        {assignmentFor(s, member).label}
                        {member.camp
                          ? ` · ${member.camp.completed}/${member.camp.weeks} weeks`
                          : ""}
                      </small>
                    </button>
                  ))
                ) : (
                  <p>
                    No active fighters. Your gym’s calendar can still move
                    forward.
                  </p>
                )}
              </div>
              {report?.fighters && (
                <button
                  type="button"
                  className="gw-turn-report-link"
                  onClick={() => {
                    closePlans();
                    setOpenedReport(true);
                  }}
                >
                  View last week’s results
                </button>
              )}
              {empty && (
                <Link
                  className="career-turn-practice"
                  to="/career/roster"
                  onClick={closePlans}
                >
                  Review your team while weeks refill
                </Link>
              )}
            </section>
          </GameDialog>
        </div>
        <div className="career-turn-actions">
          {blocked ? (
            <button
              type="button"
              className="career-turn-resolve"
              disabled={unavailable}
              onClick={onResolve}
            >
              {busy ? "Working…" : dueFight ? "Fight night" : "Camp check-in"}
            </button>
          ) : empty ? (
            <Link className="gw-turn-free-play" to="/career/roster">
              Review team
            </Link>
          ) : (
            <button
              type="button"
              id="career-end-week"
              className="career-turn-end"
              disabled={unavailable}
              onClick={draft ? openPlans : onEndWeek}
              aria-label={
                draft
                  ? "Review your unassigned camp before ending the week"
                  : "End week: advance exactly seven days and use one career week"
              }
            >
              <span aria-hidden="true">{draft ? "✎" : "⌛"}</span>
              <span>
                {busy ? "Working…" : draft ? "Review camp" : "End week"}
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
