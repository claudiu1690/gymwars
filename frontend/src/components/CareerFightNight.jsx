import { useRef, useState } from "react";
import { Action, Face, PlanFields } from "./CareerControls";
import { RarityBadge } from "./FighterRarity";
import CareerJourney from "./CareerJourney";
import { AmbitionPanel, SignatureLine } from "./CareerIdentity";
import SignatureBadge from "./SignatureBadge";
import {
  fightCornerState,
  fightReport,
  roundRecap,
  fightCompetition,
  fightRewardSummary,
  fightStatDisplay,
  roundFeedback,
  significantExchanges,
} from "../fightPresentation.mjs";
import { calendarDate } from "../careerCalendar.mjs";
import "./fight-night-arena.css";
import { GameDialog } from "./GameUI";
import FightLessons, { ResultFeedback } from "./FightLessons";

const label = (value = "") =>
  value.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
const money = (value) => "$" + value.toLocaleString("en-US");
const methods = {
  DEC: "Decision",
  "SPLIT-DEC": "Split decision",
  DRAW: "Draw",
  KO: "Knockout",
  TKO: "Technical knockout",
  SUB: "Submission",
};
const methodLabel = (value) => methods[value] || label(value);
const cornerCalls = [
  {
    title: "Work the feet",
    intent: "Favor striking. Push for a finish.",
    tradeoff: "More output · higher gas use",
    plan: { approach: "strike", pace: "high", finish: "hunt-finish" },
  },
  {
    title: "Take it down",
    intent: "Seek takedowns and submission openings.",
    tradeoff: "Measured pace · matchup matters",
    plan: { approach: "grapple", pace: "measured", finish: "hunt-finish" },
  },
  {
    title: "Save your gas",
    intent: "Mix your attacks. Stay composed.",
    tradeoff: "Less output · slower gas loss",
    plan: { approach: "balanced", pace: "cautious", finish: "play-safe" },
  },
];
const sameInstructions = (a, b) =>
  ["approach", "pace", "finish"].every((key) => a[key] === b[key]);
const instructionSummary = (plan) =>
  `${{ strike: "Striking", grapple: "Grappling", balanced: "Mixed attacks" }[plan.approach]} · ${label(plan.pace)} pace · ${plan.finish === "hunt-finish" ? "Hunt the finish" : "Stay composed"}`;

function Condition({ value, caption, fighterName }) {
  const recorded = Number.isFinite(value);
  return (
    <div className={`fn-condition ${caption.toLowerCase()}`}>
      <div>
        <span>{caption}</span>
        <strong>{recorded ? `${value}%` : "—"}</strong>
      </div>
      <div
        className="fn-condition-track"
        {...(recorded
          ? {
              role: "meter",
              "aria-label": `${fighterName} ${caption.toLowerCase()}`,
              "aria-valuemin": 0,
              "aria-valuemax": 100,
              "aria-valuenow": value,
            }
          : {})}
      >
        <span
          style={{
            width: `${recorded ? Math.max(0, Math.min(100, value)) : 0}%`,
          }}
        />
      </div>
      {!recorded && <small>Not recorded</small>}
    </div>
  );
}

function Corner({ fighter, side, bout }) {
  const state = fightCornerState(bout, side);
  const readiness = bout.readiness?.[side === "A" ? "you" : "them"];
  const prepared = bout.preparation?.[side === "A" ? "you" : "them"];
  return (
    <article
      className={`fn-corner ${side}`}
      aria-label={side === "A" ? "Your corner" : "Opponent corner"}
    >
      <SignatureBadge
        fighter={{
          ...fighter,
          signatureId: prepared?.signatureId || null,
          signatureCombatVersion: bout.combatVersion,
        }}
      />
      <div className="fn-fighter-heading">
        <div className="fn-portrait">
          <Face fighter={fighter} compact />
        </div>
        <div>
          <small className="fn-eyebrow">
            {side === "A" ? "Your fighter" : "Opponent"}
          </small>
          <h2>{fighter.name}</h2>
          <p>
            {label(fighter.style)} · {fighter.record.wins}W /{" "}
            {fighter.record.losses}L / {fighter.record.draws || 0}D
          </p>
          <RarityBadge rarity={fighter.rarity} />
          <SignatureLine
            fighter={{
              ...fighter,
              signatureId: prepared?.signatureId || null,
              signatureAccess: null,
            }}
          />
        </div>
      </div>
      <div className="fn-condition-pair">
        <Condition
          value={state.health}
          caption="Health"
          fighterName={fighter.name}
        />
        <Condition value={state.gas} caption="Gas" fighterName={fighter.name} />
      </div>
      {state.finishLabel && <p className="fn-stoppage">{state.finishLabel}</p>}
      <section
        className="fn-fighter-details"
        aria-label={`${fighter.name} fight skills`}
      >
        <h3>{prepared ? "Prepared skills" : "Fighter skills"}</h3>
        <div className="fn-skills">
          {fightStatDisplay(bout, fighter, side).map(
            ({ key, value, bonus, sources }) => (
              <div key={key}>
                <span>{label(key)}</span>
                <strong>{value}</strong>
                {bonus > 0 && (
                  <small>
                    Includes +{bonus} {sources.join(" + ")}
                  </small>
                )}
              </div>
            ),
          )}
        </div>
        {!prepared && (
          <p>Prepared skills were not recorded. Current roster skills shown.</p>
        )}
        <p>
          {Number.isFinite(readiness)
            ? `Entered at ${readiness}% readiness`
            : "Entry readiness was not recorded"}
        </p>
      </section>
    </article>
  );
}

function Recap({ events, names, groups, highlights = [] }) {
  return (
    <ol className="fn-events">
      {(groups || roundRecap(events, names)).map((group, i) => (
        <li
          key={`${group.round}-${group.time}-${i}`}
          data-highlight={highlights.includes(group.id)}
        >
          <time>
            R{group.round} · {group.time}
          </time>
          <div>
            {highlights.includes(group.id) && (
              <strong className="fn-key-moment">Key moment</strong>
            )}
            {group.lines.map((line, j) => (
              <p
                key={j}
                className={line.type === "reset" ? "fn-reset" : ""}
                data-actor={line.actor}
              >
                {line.text}
              </p>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function RoundReport({ feedback, names }) {
  if (!feedback) return null;
  const change = (value) =>
    `${value < 0 ? "−" : value > 0 ? "+" : ""}${Math.abs(value)}`;
  return (
    <section className="fn-round-report" aria-label="Last round result">
      <h3>{feedback.title}</h3>
      {feedback.recorded ? (
        <div className="fn-round-deltas">
          {["A", "B"].map((side) => (
            <div key={side}>
              <strong>{names[side]}</strong>
              <p>
                Health {change(feedback[side].healthChange)} · Gas{" "}
                {change(feedback[side].gasChange)}%
              </p>
              {feedback[side].finishEffortGas > 0 && (
                <small>
                  {feedback[side].finishEffortGas}% gas spent on finish attempts
                </small>
              )}
              {feedback[side].signature?.activations > 0 && (
                <small>
                  {feedback[side].signature.rawGasSaved > 0
                    ? `Signature saved ${feedback[side].signature.rawGasSaved} raw gas units this round`
                    : `Signature active in ${feedback[side].signature.activations} contest${feedback[side].signature.activations === 1 ? "" : "s"} this round`}
                  .
                </small>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>Per-round condition changes were not recorded in this older bout.</p>
      )}
    </section>
  );
}

export default function CareerFightNight({
  s,
  b,
  command,
  disabled,
  onDone,
  onFight,
  onRankings,
}) {
  const f = s.fighters.find((fighter) => fighter.id === b.fighterId);
  const opponent = s.rivals.find((fighter) => fighter.id === b.opponentId);
  const savedPlan = b.savedPlan || f.gameplan;
  const [plan, setPlan] = useState(() => b.decisions?.at(-1)?.a || savedPlan);
  const [playing, setPlaying] = useState(false);
  const [coaching, setCoaching] = useState(false);
  const actionLock = useRef(false);
  const names = { A: f.name, B: opponent.name };
  const resolved = b.status === "resolved";
  const report = resolved ? fightReport(b, names) : null;
  const rewards = resolved ? fightRewardSummary(b) : null;
  const feedback = roundFeedback(b, names);
  const roundsDone = b.decisions?.length || 0;
  const nextRound = Math.min(b.rounds, roundsDone + 1);
  const score =
    feedback?.score || (roundsDone === 0 && !resolved ? { A: 0, B: 0 } : null);
  const latestExchange = significantExchanges(b.latestEvents || [], names).at(
    -1,
  );
  const currentCall = cornerCalls.find((call) =>
    sameInstructions(plan, call.plan),
  );
  const nextFight = s.fights.find(
    (fight) => ["ready", "live"].includes(fight.status) && fight.id !== b.id,
  );
  const nextFighter = s.fighters.find(
    (fighter) => fighter.id === nextFight?.fighterId,
  );
  const busy = disabled || playing;
  const usingSavedPlan =
    sameInstructions(plan, savedPlan) &&
    plan.conserveBelow === savedPlan.conserveBelow;

  async function play(type) {
    if (actionLock.current || disabled || resolved) return;
    actionLock.current = true;
    setPlaying(true);
    try {
      await command({ type, fightId: b.id, expectedRound: roundsDone, plan });
    } finally {
      actionLock.current = false;
      setPlaying(false);
    }
  }

  const matchup = (
    <section className="fn-matchup" aria-label="Matchup and current condition">
      <Corner fighter={f} side="A" bout={b} />
      <div className="fn-scoreboard">
        <span className="fn-eyebrow">
          {resolved
            ? "Final bell"
            : roundsDone
              ? "Between rounds"
              : "Opening bell"}
        </span>
        <strong className="fn-round">
          {resolved ? methodLabel(b.result.method) : `Round ${nextRound}`}
        </strong>
        <span>{resolved ? `Round ${b.result.round}` : `of ${b.rounds}`}</span>
        <div className="fn-score" aria-label="Scored rounds won">
          <strong>
            {Number.isFinite(score?.A) ? score.A : "—"}
            <span>–</span>
            {Number.isFinite(score?.B) ? score.B : "—"}
          </strong>
          <small>Scored rounds won</small>
        </div>
        <div
          className="fn-round-markers"
          aria-label={`${roundsDone} of ${b.rounds} rounds completed`}
        >
          {Array.from({ length: b.rounds }, (_, i) => (
            <span
              key={i}
              className={i < roundsDone ? "complete" : ""}
              aria-current={
                !resolved && i + 1 === nextRound ? "step" : undefined
              }
            >
              R{i + 1}
            </span>
          ))}
        </div>
      </div>
      <Corner fighter={opponent} side="B" bout={b} />
    </section>
  );

  return (
    <div className="fight-night fight-night-arena" aria-label="Fight night">
      <header className="fn-event">
        <div>
          <p className="fn-eyebrow">
            Fight night · {calendarDate(s, b.eventWeek)}
          </p>
          <h1>{b.eventName || fightCompetition(b)}</h1>
          <p>
            {label(f.weightClass)} · {b.rounds} rounds
            {b.title ? " · Championship bout" : ""}
          </p>
        </div>
        <div className="fn-purse">
          <span>Bout contract</span>
          <strong>{money(b.show)} guaranteed</strong>
          <small>+ {money(b.winBonus)} if you win</small>
        </div>
      </header>

      {resolved ? (
        <>
          <section
            className={`fn-result ${b.result.winner === "A" ? "victory" : ""}`}
            aria-label="Fight result"
          >
            <p className="fn-eyebrow">
              {b.result.winner === "A"
                ? "Victory"
                : b.result.winner === "B"
                  ? "Defeat"
                  : "Draw"}
            </p>
            <h2>
              {b.result.winner === "draw"
                ? "Honors even"
                : `${names[b.result.winner]} wins`}
            </h2>
            <strong className="fn-result-method">
              {methodLabel(b.result.method)} · Round {b.result.round}
            </strong>
            <p className="fn-verdict" role="status">
              {report.explanation}
            </p>
            <FightLessons bout={b} fighterId={f.id} />
            <ResultFeedback reference={b.id} />
            <dl className="fn-rewards">
              <div>
                <dt>Bout earnings</dt>
                <dd>
                  {rewards.purse == null
                    ? "Not recorded"
                    : money(rewards.purse)}
                </dd>
              </div>
              <div>
                <dt>Regional ranking</dt>
                <dd>{rewards.ranking}</dd>
              </div>
              {rewards.readiness != null && (
                <div>
                  <dt>Readiness after bout</dt>
                  <dd>{rewards.readiness}%</dd>
                </div>
              )}
              {rewards.legacy > 0 && (
                <div>
                  <dt>Gym legacy earned</dt>
                  <dd>+{rewards.legacy}</dd>
                </div>
              )}
            </dl>
            {rewards.card && (
              <p className="fn-card-progress">
                <strong>Invitational card: {rewards.card.wins} / 2 wins</strong>{" "}
                · {rewards.card.resolved} / 3 bouts complete
                {rewards.card.status === "won" ? " · Trophy secured" : ""}
              </p>
            )}
            {rewards.trophy?.cash > 0 && (
              <p className="fn-reward-note">
                <strong>Trophy payout: {money(rewards.trophy.cash)}</strong>
                {rewards.trophy.legacy > 0
                  ? ` · +${rewards.trophy.legacy} legacy`
                  : ""}
                .{" "}
                {b.rewards?.challenge?.reward
                  ? "First-victory prize, awarded once per gym and separately from the bout purse."
                  : "Awarded once for the team card, separately from this bout’s purse."}
              </p>
            )}
            {b.rewards?.challenge?.alreadyEarned && (
              <p className="fn-reward-note">
                Your gym already earned this trophy. The bout purse is paid as
                signed; the first-victory prize pays once per gym.
              </p>
            )}
            {b.rewards?.challenge?.reward?.trophy && (
              <p className="fn-reward-note">
                Club honor earned:{" "}
                <strong>{b.rewards.challenge.reward.trophy}</strong>
              </p>
            )}
            {(
              b.rewards?.progression?.promotions ||
              (b.rewards?.progression?.promotion
                ? [b.rewards.progression.promotion]
                : [])
            ).map((promotion) => (
              <p className="fn-reward-note" key={promotion.id}>
                Competition earned: <strong>{promotion.name}</strong>.
                {promotion.deed &&
                  ` ${promotion.deed}${promotion.previouslyEarned ? " · earlier deed credited" : ""}.`}{" "}
                New contracts available; booked purses stay as signed.
              </p>
            ))}
            {!!b.rewards?.progression?.deeds?.length && (
              <p className="fn-reward-note">
                Club deed earned:{" "}
                {b.rewards.progression.deeds
                  .map(
                    (id) =>
                      s.gymDevelopment?.goals?.find((goal) => goal.id === id)
                        ?.name || label(id),
                  )
                  .join(" · ")}
                .
              </p>
            )}
            {b.rewards?.progression?.ambition && (
              <p className="fn-reward-note">
                Club goal achieved:{" "}
                <strong>{b.rewards.progression.ambition.label}</strong>.
              </p>
            )}
            {!rewards.rankingRecorded && b.competition !== "invitational" && (
              <p className="fn-history-note">
                The ranking rule is shown because this older result did not
                record a ranking delta.
              </p>
            )}
            <div className="fn-next-step">
              <Action
                onClick={nextFight ? () => onFight(nextFight.id) : onDone}
              >
                {nextFight
                  ? `Next fight · ${nextFighter?.name || "Your fighter"}`
                  : "Back to gym · what’s next?"}
              </Action>
              <div>
                <p>
                  {Number.isFinite(b.resolvedWeek)
                    ? `Eligible to compete again: ${calendarDate(s, b.resolvedWeek + s.rules.boutTurnaroundWeeks)}.`
                    : "Check your fighter’s current availability before booking again."}
                </p>
                <small>Use the turnaround to recover and prepare.</small>
                {nextFight && (
                  <button
                    type="button"
                    onClick={onDone}
                    className="fn-text-button"
                  >
                    Return to gym
                  </button>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          {matchup}
          <section
            className={`fn-last-exchange ${feedback?.observation ? "has-note" : ""}`}
            aria-label="Latest meaningful exchange"
            aria-busy={playing}
          >
            <div>
              <p className="fn-eyebrow">
                {roundsDone
                  ? `Round ${roundsDone} · key exchange`
                  : "Before the bell"}
              </p>
              {latestExchange ? (
                <Recap groups={[latestExchange]} names={names} />
              ) : (
                <p className="fn-opening">
                  {roundsDone
                    ? "No individual exchange was recorded for this round. Check the score and condition before your next call."
                    : "Choose your opening instructions, then play round 1."}
                </p>
              )}
            </div>
            {feedback?.observation && (
              <aside>
                <strong>Corner note</strong>
                <p>{feedback.observation}</p>
              </aside>
            )}
          </section>
          <section className="fn-decision" aria-label="Between-round tactics">
            <div className="fn-decision-heading">
              <div>
                <p className="fn-eyebrow">You are the corner</p>
                <h2>How do we fight round {nextRound}?</h2>
                <p>Keep your call or choose a new one. Then ring the bell.</p>
              </div>
              <span className="fn-current-call">
                Current: {currentCall?.title || "Custom call"}
              </span>
            </div>
            <div
              className="fn-quick-calls"
              role="group"
              aria-label="Round corner calls"
            >
              {cornerCalls.map((call, index) => {
                const selected = sameInstructions(plan, call.plan);
                return (
                  <button
                    type="button"
                    key={call.title}
                    aria-label={call.title}
                    aria-pressed={selected}
                    className="fn-quick-call"
                    disabled={busy}
                    onClick={() => setPlan({ ...plan, ...call.plan })}
                  >
                    <span className="fn-call-number" aria-hidden="true">
                      {`0${index + 1}`}
                    </span>
                    <span className="fn-call-content">
                      <strong>{call.title}</strong>
                      <span>{call.intent}</span>
                      <small>{call.tradeoff}</small>
                      <b>
                        {selected
                          ? "Your call for this round"
                          : "Choose this call"}
                      </b>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="fn-tactics-tools">
              <button
                className="fn-advanced-toggle"
                type="button"
                disabled={busy}
                aria-haspopup="dialog"
                onClick={() => setCoaching(true)}
              >
                Set custom tactics
              </button>
              <button
                className="fn-text-button"
                type="button"
                disabled={busy || usingSavedPlan}
                onClick={() => setPlan({ ...savedPlan })}
              >
                Use saved fight plan
              </button>
            </div>
            <GameDialog
              open={coaching}
              onClose={() => setCoaching(false)}
              title="Make your own call"
            >
              <div className="fn-custom-call">
                <p>Choose approach, pace and finishing intent independently.</p>
                <PlanFields value={plan} onChange={setPlan} disabled={busy} />
                <Action onClick={() => setCoaching(false)}>
                  Use these tactics
                </Action>
              </div>
            </GameDialog>
            <div className="fn-play-bar">
              <div>
                <span className="fn-eyebrow">Going into round {nextRound}</span>
                <p>{instructionSummary(plan)}</p>
              </div>
              <Action disabled={busy} onClick={() => play("round")}>
                {playing ? "Resolving…" : `Play round ${nextRound}`}
              </Action>
            </div>
            <div className="fn-coach-finish">
              <Action
                secondary
                disabled={busy}
                onClick={() => play("auto-fight")}
              >
                Finish fight
              </Action>
              <p>
                Let the coach play every remaining round with this call.
                {plan.conserveBelow > 0
                  ? ` Switches to cautious pace below ${plan.conserveBelow}% gas.`
                  : " No automatic pace switch."}
                {b.combatVersion >= 2
                  ? " Finish attempts spend extra gas; staying composed keeps that gas."
                  : ""}
              </p>
            </div>
            <p className="fn-save-status" role="status">
              {playing
                ? "Resolving your instructions…"
                : "Each round saves automatically. Career time stays here."}
            </p>
          </section>
        </>
      )}

      {(resolved || roundsDone > 0) && (
        <section
          className="fn-disclosure fn-fight-report"
          aria-labelledby="fn-report-title"
        >
          <h2 id="fn-report-title" className="fn-section-title">
            {resolved ? "Fight stats" : `Round ${roundsDone} stats & exchanges`}
          </h2>
          <div className="fn-disclosure-content">
            <RoundReport feedback={feedback} names={names} />
            {resolved ? (
              <>
                <table className="fn-totals">
                  <caption>Fight totals</caption>
                  <thead>
                    <tr>
                      <th>Measure</th>
                      <th>{f.name}</th>
                      <th>{opponent.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Scored rounds won", "roundsWon"],
                      ["Damage dealt", "damage"],
                      ["Knockdowns", "knockdowns"],
                      ["Takedowns", "takedowns"],
                      ["Submission attempts", "subAttempts"],
                    ].map(([name, key]) => (
                      <tr key={key}>
                        <th>{name}</th>
                        <td>{b.result.totals.A[key]}</td>
                        <td>{b.result.totals.B[key]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {b.debrief?.observation && (
                  <p className="fn-camp-note">
                    <strong>For your next camp:</strong> {b.debrief.observation}
                  </p>
                )}
                <section className="fn-full-log" aria-label="Fight timeline">
                  <h3>Fight timeline</h3>
                  <p>
                    Every recorded exchange, in order. Key moments are marked in
                    the timeline.
                  </p>
                  {b.result.rounds?.length ? (
                    b.result.rounds.map((round) => (
                      <section key={round.round}>
                        <h4>Round {round.round}</h4>
                        <Recap
                          groups={report.groups.filter(
                            (group) => group.round === round.round,
                          )}
                          names={names}
                          highlights={report.momentGroups.map(
                            (group) => group.id,
                          )}
                        />
                      </section>
                    ))
                  ) : (
                    <p>
                      Detailed exchanges are retained for the most recent 30
                      bouts. The career result remains saved.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <Recap events={b.latestEvents || []} names={names} />
            )}
          </div>
        </section>
      )}
      {resolved && (
        <>
          <section
            className="fn-disclosure fn-final-condition"
            aria-labelledby="fn-condition-title"
          >
            <h2 id="fn-condition-title" className="fn-section-title">
              Final condition & prepared skills
            </h2>
            <div className="fn-disclosure-content">{matchup}</div>
          </section>
          {s.ambition && (
            <section className="fn-disclosure" aria-label="Your club goal now">
              <div className="fn-disclosure-content">
                <AmbitionPanel s={s} compact />
              </div>
            </section>
          )}
          <section
            className="fn-disclosure fn-career-goal"
            aria-labelledby="fn-next-goal-title"
          >
            <h2 id="fn-next-goal-title" className="fn-section-title">
              Your next career goal
            </h2>
            <div className="fn-disclosure-content">
              <CareerJourney
                s={s}
                fighter={f}
                onRankings={onRankings}
                compact
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
