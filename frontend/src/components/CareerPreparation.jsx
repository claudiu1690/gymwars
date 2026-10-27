import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CampPlanner } from "./CareerTraining";
import { calendarDate, daysUntil } from "../careerCalendar.mjs";
import { readiness, campTitle } from "../trainingPlans.mjs";
import { Action, PlanFields, PlanSummary } from "./CareerControls";
import { assignmentFor } from "../careerAssignment.mjs";
import {
  ContractFacts,
  FightIntel,
  FightPoster,
  preparationBout,
} from "./FightMatchup";

function Timeline({ s, b, camp }) {
  return (
    <ol className="fight-camp-timeline" aria-label="Preparation timeline">
      <li>
        <small>TODAY</small>
        <strong>{calendarDate(s)}</strong>
      </li>
      <li>
        <small>{camp ? "CAMP ENDS" : "THIS WEEK"}</small>
        <strong>
          {camp ? calendarDate(s, camp.endWeek) : "Rest or train"}
        </strong>
      </li>
      <li>
        <small>FIGHT NIGHT</small>
        <strong>{calendarDate(s, b.eventWeek)}</strong>
      </li>
    </ol>
  );
}

export function FightBrief({
  s,
  b,
  tab,
  revision,
  command,
  disabled,
  onFight,
  onTraining,
  onBook,
  onBrief,
}) {
  const f = s.fighters.find((fighter) => fighter.id === b.fighterId);
  const opponent =
    s.rivals.find((rival) => rival.id === b.opponentId) ||
    b.opponentSnapshot ||
    b.inputs?.b;
  const [plan, setPlan] = useState(f.gameplan),
    [message, setMessage] = useState(""),
    [working, setWorking] = useState(false);
  const saving = useRef(false),
    tactics = useRef(null);
  const locked = b.status !== "scheduled";
  const savedPlan = locked
    ? b.savedPlan || b.inputs?.a?.gameplan || f.gameplan
    : f.gameplan;
  const dirty = JSON.stringify(plan) !== JSON.stringify(savedPlan);
  useEffect(() => {
    if (tab === "tactics") tactics.current?.scrollIntoView({ block: "start" });
  }, [tab]);
  if (tab === "training" && !locked)
    return (
      <CampPlanner
        s={s}
        f={f}
        revision={revision}
        command={command}
        disabled={disabled}
        onFight={onFight}
        onTraining={onTraining}
        onBook={() => onBook(f.id)}
        onBrief={onBrief}
      />
    );
  if (!opponent)
    return (
      <section className="fight-planning-panel">
        <h2>Opponent details unavailable.</h2>
        <Link to="/career/fights">Back to Fights</Link>
      </section>
    );
  const assignment = assignmentFor(s, f);
  const shownBout = preparationBout(b, f, opponent);
  const action = locked
    ? b.status === "resolved"
      ? "View fight result"
      : b.status === "live"
        ? "Resume fight"
        : "Fight now"
    : f.camp?.needsReview
      ? "Review camp"
      : f.camp
        ? "Open camp"
        : "Plan training";
  const trainingAction = () => onTraining(f.id);
  async function savePlan() {
    if (disabled || locked || saving.current) return;
    saving.current = true;
    setWorking(true);
    setMessage("");
    try {
      const result = await command({ type: "plan", fighterId: f.id, plan });
      setMessage(
        result
          ? "Opening tactics saved."
          : "Tactics weren’t saved. Check the save message and try again.",
      );
    } catch (failure) {
      setMessage(failure.message || "Could not save tactics. Try again.");
    } finally {
      saving.current = false;
      setWorking(false);
    }
  }
  return (
    <div className="fight-planning fight-preparation-workspace">
      <div className="fight-planning-toolbar">
        <Link to="/career/fights">All fights</Link>
        <span>
          {b.status === "resolved"
            ? "The fight is complete."
            : locked
              ? "Your corner is waiting."
              : "Plan your camp. Set your tactics. End week when ready."}
        </span>
      </div>
      <FightPoster
        s={s}
        f={f}
        opponent={opponent}
        bout={b}
        eyebrow={
          locked
            ? b.status === "resolved"
              ? "THE FINAL BELL"
              : "YOUR FIGHT IS READY"
            : "YOUR NEXT BIG NIGHT"
        }
      >
        <footer className="fight-contract-footer">
          <ContractFacts
            s={s}
            bout={b}
            readiness={b.readiness?.you ?? readiness(f)}
          />
          <div className="fight-contract-action">
            <Action
              disabled={disabled || working}
              onClick={locked ? () => onFight(b.id) : trainingAction}
            >
              {action}
            </Action>
            <p>
              {locked
                ? b.status === "resolved"
                  ? "Revisit the result and your corner decisions."
                  : "Your opening plan is locked. Make fresh calls between rounds."
                : "Training saves a plan. End week moves the calendar."}
            </p>
          </div>
        </footer>
      </FightPoster>
      {!locked && (
        <section className="fight-camp-board" aria-label="Fight camp">
          <div className="fight-camp-art" aria-hidden="true" />
          <div className="fight-camp-status">
            <span className="career-eyebrow">01 · YOUR CAMP</span>
            <h2>
              {f.camp?.needsReview
                ? "Time for a camp check-in."
                : f.camp
                  ? campTitle(s, f.camp)
                  : "Make a plan for fight night."}
            </h2>
            <p>{assignment.detail}</p>
            <Timeline s={s} b={b} camp={f.camp} />
            <p className="fight-camp-advice">
              {f.camp
                ? f.camp.completed +
                  " of " +
                  f.camp.weeks +
                  " camp weeks complete. " +
                  Math.max(0, b.eventWeek - f.camp.endWeek) +
                  " weeks between the camp end and this fight."
                : daysUntil(s, b.eventWeek) +
                  " to train or recover. A camp is optional; arriving fresh matters too."}
            </p>
            <Link to={"/career/gym/training/" + f.id}>
              {f.camp
                ? "Review training and recovery"
                : "Choose training or recovery"}
            </Link>
          </div>
        </section>
      )}
      <div className="fight-preparation-grid">
        <FightIntel s={s} f={f} opponent={opponent} bout={shownBout} />
        <section
          className="fight-planning-panel fight-tactics-panel"
          ref={tactics}
          aria-label="Opening tactics"
        >
          <header>
            <span className="career-eyebrow">
              {locked ? "YOUR OPENING TACTICS" : "02 · YOUR OPENING TACTICS"}
            </span>
            <h2>Call the gameplan.</h2>
            <p>
              {locked
                ? "The starting instructions for this bout. Round calls can change in the live corner."
                : "Give " +
                  f.name +
                  " a plan for " +
                  opponent.name +
                  ". These instructions also guide the coach when you hand over the fight."}
            </p>
          </header>
          <PlanSummary
            value={locked ? savedPlan : plan}
            caption={
              locked
                ? "FIGHT-START INSTRUCTIONS"
                : dirty
                  ? "UNSAVED INSTRUCTIONS"
                  : "SAVED INSTRUCTIONS"
            }
          />
          {!locked && (
            <>
              <PlanFields
                value={plan}
                onChange={(value) => {
                  setPlan(value);
                  setMessage("");
                }}
                disabled={disabled || working}
              />
              <div className="fight-tactics-save">
                <Action
                  disabled={disabled || working || !dirty}
                  onClick={savePlan}
                >
                  {working ? "Saving tactics…" : "Save tactics"}
                </Action>
                <p role="status">
                  {message ||
                    (dirty
                      ? "Changes are not saved yet."
                      : "Your opening tactics are saved.")}
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
