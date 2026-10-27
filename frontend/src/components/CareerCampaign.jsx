import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Face } from "./CareerControls";
import { AmbitionPanel } from "./CareerIdentity";
import { RarityBadge } from "./FighterRarity";
import { calendarDate } from "../careerCalendar.mjs";
import { readiness } from "../trainingPlans.mjs";
import "./career-campaign.css";
import "./career-design.css";
import SportingGoals from "./SportingGoals";
import {
  CareerPathHero,
  CircuitRoadmap,
  ClubChallenges,
  StaffGoals,
} from "./CareerPathOverview";

const money = (value = 0) => `$${value.toLocaleString("en-US")}`;
const label = (value = "") =>
  value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
const skills = ["striking", "grappling", "submissions", "conditioning"];

function Trophy({ small = false }) {
  return (
    <svg
      className={`campaign-trophy ${small ? "small" : ""}`}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M35 22H16v18c0 20 12 29 30 28M85 22h19v18c0 20-12 29-30 28"
        stroke="#B9812D"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      <path
        d="M30 15h60v26c0 24-11 38-30 38S30 65 30 41V15Z"
        fill="#F5C451"
        stroke="#FFE3A0"
        strokeWidth="3"
      />
      <path d="M59 18v57c16 0 28-14 28-34V18H59Z" fill="#D69736" />
      <path
        d="m60 28 5 11 13 1-10 8 3 13-11-7-11 7 3-13-10-8 13-1 5-11Z"
        fill="#FFF2CB"
      />
      <path d="M54 76h12v21H54zM42 96h36v9H42z" fill="#F5C451" />
      <path
        d="M34 104h52v9H34z"
        fill="#87673A"
        stroke="#DDB86B"
        strokeWidth="2"
      />
    </svg>
  );
}

function StageDetails({ stage }) {
  const reward =
    typeof stage.reward === "string"
      ? stage.reward
      : [
          stage.reward?.cash && money(stage.reward.cash),
          stage.reward?.legacy && `${stage.reward.legacy} legacy`,
        ]
          .filter(Boolean)
          .join(" · ");
  return (
    <>
      <p>{stage.description}</p>
      {reward && <small className="campaign-stage-reward">{reward}</small>}
    </>
  );
}

function Roadmap({ journey }) {
  return (
    <section className="campaign-roadmap" aria-label="Campaign milestones">
      <header className="campaign-section-title">
        <div>
          <span className="campaign-kicker">THE ROAD TO THE TROPHY</span>
          <h2>From debut to team trophy</h2>
        </div>
        <span className="campaign-progress-count">
          {journey.stages.filter((stage) => stage.complete).length} /{" "}
          {journey.stages.length}
        </span>
      </header>
      <ol>
        {journey.stages.map((stage, index) => (
          <li
            key={stage.id}
            className={`campaign-stage ${stage.status}`}
            aria-current={stage.status === "current" ? "step" : undefined}
          >
            <span
              className="campaign-stage-number"
              aria-label={stage.complete ? "Complete" : `Stage ${index + 1}`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="campaign-stage-content">
              <span className="path-stage-status">
                {stage.complete
                  ? "EARNED"
                  : stage.status === "current"
                    ? "IN PROGRESS"
                    : "UP AHEAD"}
              </span>
              <strong>{stage.name}</strong>
              <StageDetails stage={stage} />
              {stage.status === "current" && stage.progress && (
                <div className="campaign-stage-progress">
                  <span>
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, (stage.progress.current / Math.max(1, stage.progress.target)) * 100))}%`,
                      }}
                    />
                  </span>
                  <small>{stage.progress.label}</small>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Opponent({ opponent }) {
  if (!opponent) return null;
  return (
    <div className="campaign-opponent">
      <span className="campaign-kicker">
        OPPOSITION · {label(opponent.style)}
      </span>
      <h3>{opponent.name}</h3>
      <p>{opponent.description}</p>
      <dl>
        {skills.map((skill) => (
          <div key={skill}>
            <dt>{label(skill)}</dt>
            <dd>{opponent.stats[skill]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Lineup({ s, competition, command, disabled }) {
  const [fighterIds, setFighterIds] = useState([null, null, null]);
  const [slot, setSlot] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const candidates = competition.fighters
    .map((candidate) => ({
      ...candidate,
      fighter: s.fighters.find((fighter) => fighter.id === candidate.id),
    }))
    .filter((candidate) => candidate.fighter);
  const selected = fighterIds.map((id) =>
    candidates.find((candidate) => candidate.id === id),
  );
  const valid =
    fighterIds.every(Boolean) &&
    new Set(fighterIds).size === competition.teamSize &&
    selected.every((candidate) => candidate?.eligible);
  const canConfirm = competition.canEnter && valid && !disabled && !submitting;
  const choose = (id) => {
    setFighterIds((current) => {
      const next = [...current];
      const previousSlot = current.indexOf(id);
      if (previousSlot !== -1 && previousSlot !== slot)
        next[previousSlot] = current[slot];
      next[slot] = id;
      return next;
    });
    setConfirm(false);
    if (slot < competition.teamSize - 1) setSlot(slot + 1);
  };
  async function enter() {
    if (lock.current || !canConfirm) return;
    lock.current = true;
    setSubmitting(true);
    try {
      const result = await command({ type: "enter-invitational", fighterIds });
      if (result) setConfirm(false);
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }
  return (
    <section
      id="campaign-lineup"
      className="campaign-lineup"
      aria-label="Invitational lineup"
    >
      <header className="campaign-section-title">
        <div>
          <span className="campaign-kicker">PICK THE RIGHT MATCHUPS</span>
          <h2>Three fights. One gym.</h2>
        </div>
        <span className="campaign-progress-count">
          {fighterIds.filter(Boolean).length} / {competition.teamSize} selected
        </span>
      </header>
      <p className="campaign-lineup-intro">
        Assign a different fighter to each opponent. You have{" "}
        {competition.notice} weeks to prepare after entering. Each opponent
        fights in your chosen fighter’s weight class.
      </p>
      <div className="campaign-entry-terms" aria-label="Invitational terms">
        <span>
          <small>ENTRY</small>
          <strong>
            {competition.entryFee ? money(competition.entryFee) : "Free"}
          </strong>
        </span>
        <span>
          <small>FIGHT DATE</small>
          <strong>{calendarDate(s, competition.eventWeek)}</strong>
        </span>
        <span>
          <small>EACH FIGHTER EARNS</small>
          <strong>
            {money(competition.show)} + {money(competition.winBonus)} for a win
          </strong>
        </span>
      </div>
      <div
        className="campaign-match-slots"
        role="group"
        aria-label="Choose a lineup slot"
      >
        {competition.opponents.map((opponent, index) => (
          <button
            type="button"
            key={opponent.slot}
            className={`campaign-match-slot ${slot === index ? "selected" : ""}`}
            aria-pressed={slot === index}
            onClick={() => {
              setSlot(index);
              setConfirm(false);
            }}
            disabled={disabled || submitting}
          >
            <span className="campaign-kicker">BOUT {index + 1}</span>
            <div className="campaign-lineup-choice">
              {selected[index]?.fighter ? (
                <Face fighter={selected[index].fighter} compact />
              ) : (
                <span className="campaign-empty-slot" aria-hidden="true">
                  +
                </span>
              )}
              <strong>
                {selected[index]?.fighter.name || "Choose fighter"}
              </strong>
            </div>
            <span className="campaign-versus">VS</span>
            <span className="campaign-slot-opponent">
              {opponent.name}
              <small>{label(opponent.style)}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="campaign-picker">
        <Opponent opponent={competition.opponents[slot]} />
        <div className="campaign-roster-picker">
          <span className="campaign-kicker">
            YOUR FIGHTER FOR BOUT {slot + 1}
          </span>
          <div role="group" aria-label={`Choose fighter for bout ${slot + 1}`}>
            {candidates.map(({ fighter, eligible, blockedReason }) => {
              const assignedSlot = fighterIds.indexOf(fighter.id);
              const elsewhere = assignedSlot !== -1 && assignedSlot !== slot;
              const reason =
                blockedReason ||
                (elsewhere
                  ? `In bout ${assignedSlot + 1} · choose to ${fighterIds[slot] ? "swap" : "move"}`
                  : "");
              return (
                <button
                  type="button"
                  key={fighter.id}
                  className="campaign-candidate"
                  data-rarity={fighter.rarity}
                  aria-pressed={fighterIds[slot] === fighter.id}
                  disabled={!eligible || disabled || submitting}
                  onClick={() => choose(fighter.id)}
                >
                  <Face fighter={fighter} compact />
                  <span>
                    <RarityBadge rarity={fighter.rarity} />
                    <strong>{fighter.name}</strong>
                    <small>
                      {label(fighter.style)} · {readiness(fighter)}% ready
                    </small>
                    <small className={reason ? "campaign-unavailable" : ""}>
                      {reason ||
                        `${fighter.stats.striking} STR · ${fighter.stats.grappling} GRP · ${fighter.stats.submissions} SUB · ${fighter.stats.conditioning} CON`}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          {candidates.length === 0 && (
            <p>
              No active fighters.{" "}
              <Link to="/career/scouting">Recruit your team</Link>
            </p>
          )}
        </div>
      </div>
      {competition.blockedReason && (
        <p className="campaign-blocked">{competition.blockedReason}</p>
      )}
      {confirm ? (
        <div
          className="campaign-confirm"
          role="region"
          aria-label="Confirm Invitational entry"
        >
          <div>
            <strong>Lock in this team?</strong>
            <p>
              {selected.map((candidate) => candidate?.fighter.name).join(" · ")}
            </p>
            <p>
              All three fights are booked for{" "}
              {calendarDate(s, competition.eventWeek)}. The lineup is fixed once
              you enter. Win at least {competition.winsRequired} bouts to earn
              the trophy.
            </p>
          </div>
          <div className="campaign-actions">
            <button
              type="button"
              className="campaign-button"
              disabled={!canConfirm}
              onClick={enter}
            >
              {submitting ? "Entering…" : "Confirm entry"}
            </button>
            <button
              type="button"
              className="campaign-button secondary"
              disabled={disabled || submitting}
              onClick={() => setConfirm(false)}
            >
              Change lineup
            </button>
          </div>
        </div>
      ) : (
        <div className="campaign-lineup-footer">
          <small>
            {valid
              ? "Your team is set. Check the matchups before entering."
              : "Choose three different, available fighters."}
          </small>
          <button
            type="button"
            className="campaign-button"
            disabled={!canConfirm}
            onClick={() => setConfirm(true)}
          >
            Enter Invitational
          </button>
        </div>
      )}
    </section>
  );
}

function ActiveEvent({ s, competition, onTraining, onFight }) {
  const attempt = competition.attempt;
  return (
    <section
      id="campaign-scorecard"
      className="campaign-live"
      aria-label="Invitational scorecard"
    >
      <header className="campaign-event-score">
        <div>
          <span className="campaign-kicker">
            {attempt.status === "active" ? "YOUR INVITATIONAL" : "FINAL SCORE"}
          </span>
          <h2>
            {attempt.status === "won"
              ? "The trophy is yours."
              : attempt.status === "lost"
                ? "A setback. A new target."
                : `${attempt.resolved} / ${competition.teamSize} bouts complete`}
          </h2>
          <p>
            {calendarDate(s, attempt.eventWeek)} · Win{" "}
            {competition.winsRequired} of {competition.teamSize} bouts
          </p>
        </div>
        <div
          className="campaign-score"
          aria-label={`${attempt.wins} wins, ${attempt.losses} losses, ${attempt.draws} draws`}
        >
          <span>
            <b>{attempt.wins}</b>WINS
          </span>
          <i>:</i>
          <span>
            <b>{attempt.losses}</b>LOSSES
          </span>
          {attempt.draws > 0 && (
            <span>
              <b>{attempt.draws}</b>DRAWS
            </span>
          )}
        </div>
      </header>
      <div className="campaign-event-bouts">
        {attempt.bouts.map((bout, index) => {
          const fighter = s.fighters.find(
            (entry) => entry.id === bout.fighterId,
          );
          const opponent =
            s.rivals.find((entry) => entry.id === bout.opponentId) ||
            competition.opponents[index];
          const playable = ["ready", "live"].includes(bout.status);
          return (
            <article
              className={`campaign-event-bout ${bout.result || ""}`}
              key={bout.fightId}
            >
              <header>
                <span>BOUT {index + 1}</span>
                <strong>
                  {bout.result
                    ? label(bout.result)
                    : playable
                      ? "Fight ready"
                      : "In preparation"}
                </strong>
              </header>
              <div className="campaign-event-fighter">
                {fighter && <Face fighter={fighter} compact />}
                <div>
                  <h3>{fighter?.name || "Your fighter"}</h3>
                  <span>vs {opponent?.name || "Invitational opponent"}</span>
                  {fighter && !bout.result && (
                    <small>{readiness(fighter)}% ready</small>
                  )}
                </div>
              </div>
              {!bout.result && (
                <Opponent opponent={competition.opponents[index]} />
              )}
              {bout.result ? (
                <Link
                  className="campaign-button secondary"
                  to={`/career/bout/${bout.fightId}`}
                >
                  View result
                </Link>
              ) : playable ? (
                <button
                  type="button"
                  className="campaign-button"
                  onClick={() => onFight(bout.fightId)}
                >
                  {bout.status === "live" ? "Resume fight" : "Enter corner"}
                </button>
              ) : (
                <button
                  type="button"
                  className="campaign-button secondary"
                  onClick={() => onTraining(bout.fighterId)}
                >
                  Prepare fighter
                </button>
              )}
            </article>
          );
        })}
      </div>
      {attempt.status === "active" && (
        <p className="campaign-event-note">
          All three bouts must finish to settle the Invitational.{" "}
          {attempt.wins >= competition.winsRequired
            ? "You have secured the winning score. Finish your remaining bouts to lift the trophy."
            : "Each matchup matters. Prepare the whole team in Gym."}
        </p>
      )}
    </section>
  );
}

export default function CareerCampaign({
  s,
  command,
  disabled,
  onTraining,
  onFight,
}) {
  const journey = s.journey;
  if (!journey)
    return (
      <section className="campaign-screen">
        <h2>The road to the trophy</h2>
        <p>Your campaign is loading.</p>
        <Link to="/career">Return to gym</Link>
      </section>
    );
  const competition = journey.invitational;
  const active = competition.attempt?.status === "active";
  const won = journey.complete || competition.status === "won";
  const lost = competition.attempt?.status === "lost";
  return (
    <div className="campaign-screen career-path">
      <CareerPathHero s={s} />
      <Roadmap journey={journey} />
      <CircuitRoadmap s={s} />
      {journey.complete && <SportingGoals s={s} />}
      <AmbitionPanel s={s} command={command} disabled={disabled} />
      <section
        id="career-invitational"
        className={`campaign-hero path-invitational-banner ${won ? "complete" : ""}`}
        aria-label="Career Invitational event"
      >
        <div className="campaign-hero-copy">
          <span className="campaign-kicker">
            {journey.careerComplete
              ? "CAREER COMPLETE"
              : won
                ? "INVITATIONAL WON"
                : active
                  ? "YOUR TEAM CARD"
                  : competition.unlocked
                    ? "YOUR INVITATION IS READY"
                    : "EARN YOUR INVITATION"}
          </span>
          <h2>{won ? "Invitational champions." : competition.name}</h2>
          <p>
            {won
              ? `${s.name} has won the Invitational. Your fighters earned their place, together.`
              : "Win a regional belt, then choose three fighters for one team card. Win two of the three bouts to bring home the trophy."}
          </p>
          <p className="design-competition-note">
            3 fighters · 2 wins to claim the trophy. Gym Wars is your separate
            4v4 ranked league.
          </p>
          <div className="campaign-prize">
            <span>TROPHY REWARD</span>
            <strong>{money(competition.reward.cash)}</strong>
            <b>+{competition.reward.legacy} legacy</b>
          </div>
          {won && journey.completedWeek != null && (
            <small className="campaign-won-date">
              Won {calendarDate(s, journey.completedWeek)}
            </small>
          )}
        </div>
        <div className="campaign-trophy-stage">
          <Trophy />
          <span>
            CAREER
            <br />
            <b>INVITATIONAL</b>
          </span>
          <small>
            {won
              ? "CHAMPIONS"
              : `${competition.teamSize} FIGHTERS · ${competition.winsRequired} WINS TO VICTORY`}
          </small>
        </div>
      </section>
      {competition.attempt && (
        <ActiveEvent
          s={s}
          competition={competition}
          onTraining={onTraining}
          onFight={onFight}
        />
      )}
      {!active && !won && competition.unlocked && (
        <>
          {lost && (
            <div className="campaign-retry">
              <strong>The Invitational is still within reach.</strong>
              <p>
                Review the results, build your weak matchups, then enter again
                with a fresh lineup.
              </p>
            </div>
          )}
          <Lineup
            s={s}
            competition={competition}
            command={command}
            disabled={disabled}
          />
        </>
      )}
      {!competition.unlocked && !won && (
        <section className="campaign-locked">
          <Trophy small />
          <div>
            <span className="campaign-kicker">INVITATIONAL LOCKED</span>
            <h2>Earn your invitation.</h2>
            <p>
              {competition.blockedReason ||
                "Follow the campaign milestones to unlock the team competition."}
            </p>
          </div>
        </section>
      )}
      <ClubChallenges s={s} />
      <section className="campaign-locked">
        <div>
          <span className="career-eyebrow">BEYOND THE CAREER TROPHY</span>
          <h2>Build your club’s cup collection</h2>
          <p>
            Gym tiers 4, 5 and 6 each unlock a fixed 4v4 rival with a different
            fighting identity. Win a ranked card to earn their permanent crest.
            Your core career completion stays earned.
          </p>
          <Link className="career-action secondary" to="/career/gym-wars">
            View the club cups
          </Link>
        </div>
      </section>
      <StaffGoals s={s} />
    </div>
  );
}
