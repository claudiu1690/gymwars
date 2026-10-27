import { gymEnvironment } from "../gymEnvironments.mjs";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api";
import { divisionCoverage } from "../careerCompetition.mjs";
import { AllowanceLine, TeamCoverage } from "./CareerAvailability";
import { Face, Action } from "./CareerControls";
import { RarityBadge } from "./FighterRarity";
import {
  ClubGoalTracker,
  CircuitPayoff,
  SignatureLine,
} from "./CareerIdentity";
import SignatureBadge from "./SignatureBadge";
import { ClubFlag } from "./ClubIdentity";
import FirstFightTrail from "./FirstFightTrail";
import SportingGoals from "./SportingGoals";
import { calendarDate } from "../careerCalendar.mjs";
import { assignmentFor, fighterNextAction } from "../careerAssignment.mjs";
import "./career-design.css";
import "./career-home-scene.css";
import { readiness, skillLabel } from "../trainingPlans.mjs";

export default function CareerHome({
  s,
  command,
  guide,
  disabled,
  onAction,
  onFighter,
  onTraining,
  allowances,
}) {
  const team = s.fighters.filter((f) => !f.retired && !f.released);
  const coverage = divisionCoverage(team);
  const [competition, setCompetition] = useState(null);
  useEffect(() => {
    let active = true;
    if (coverage.complete)
      api("/career/wars/lobby")
        .then((data) => {
          if (active) setCompetition(data);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [coverage.complete, s.week, s.boutsCompleted, allowances?.serverNow]);
  const paused =
    allowances?.careerWeeks?.available === 0 && guide?.kind === "advance";
  const defense = competition?.latestDefense;
  const chapter = s.journey?.postInvitationalChallenge;
  const stage = s.journey?.stages.find((item) => item.status === "current");
  const nextBout = s.fights
    .filter((bout) => bout.status !== "resolved")
    .sort((a, b) => a.eventWeek - b.eventWeek)[0];
  const nextGymGoal = (s.gymDevelopment?.goals || []).find(
    (goal) => !goal.complete && !goal.locked,
  );
  return (
    <div className="club-home">
      <div className="club-command-grid">
        <section
          className="club-scene club-home-headquarters gym-illustrated-home"
          aria-label="Your gym headquarters"
        >
          <div className="club-scene-name">
            <span className="career-eyebrow">
              GYM TIER {s.facilityTier} / {s.rules.facilities.length - 1}
            </span>
            <h2>{s.name}</h2>
            <p>{s.rules.facilities[s.facilityTier].name}</p>
          </div>
          <div className="club-home-illustration">
            <img
              src={gymEnvironment(s.facilityTier)}
              alt={`${s.rules.facilities[s.facilityTier].name} interior`}
              width="1600"
              height="900"
              fetchPriority="high"
            />
            {s.shopIdentity && (
              <ClubFlag
                look={s.shopIdentity}
                name={s.name}
                className="shop-home-flag"
              />
            )}
          </div>
          <nav
            className="club-home-shortcuts"
            aria-label="Headquarters actions"
          >
            <Link className="club-scene-hotspot training" to="/career/gym">
              <span aria-hidden="true">✦</span>
              <strong>Training floor</strong>
              <small>
                {team.filter((f) => f.camp).length} in camp · {team.length}{" "}
                fighters
              </small>
            </Link>
            <Link
              className="club-scene-hotspot recruitment"
              to="/career/scouting"
            >
              <span aria-hidden="true">＋</span>
              <strong>Recruitment</strong>
              <small>
                {s.rules.scoutsPerWeek - s.scoutsUsed} investigations
              </small>
            </Link>
          </nav>
          <div className="club-scene-strip">
            <span>
              <b>{team.filter((f) => f.isChampion).length}</b> champions
            </span>
            <span>
              <b>{s.boutsCompleted}</b> bouts fought
            </span>
            <span>
              <b>{s.legacy}</b> reputation
            </span>
          </div>
        </section>
        <section className="clubhouse-play" aria-label="Play your next turn">
          <span className="career-eyebrow">YOUR NEXT MOVE</span>
          <h2>
            {paused
              ? "Your team plans are saved."
              : guide?.title || "Build your next contender."}
          </h2>
          <p className="design-next-explanation">
            {paused
              ? "Your career weeks will refill. Review tactics, plan training, or recruit from this week’s board while you wait."
              : guide?.body ||
                "Choose a fighter, sign a fight and prepare together."}
          </p>
          {paused ? (
            <Link className="career-action" to="/career/roster">
              Review your team
            </Link>
          ) : (
            guide && (
              <Action disabled={disabled} onClick={() => onAction(guide)}>
                {guide.cta}
              </Action>
            )
          )}
          <AllowanceLine allowance={allowances?.careerWeeks} />
          {s.week === 0 && allowances?.careerWeeks && (
            <small className="design-home-calendar-note">
              You start with 8 career weeks. Unused weeks can build up to 12.
            </small>
          )}
          <small className="design-home-calendar-note">
            Plan at your own pace. End week advances everyone together.
          </small>
        </section>
      </div>
      {s.journey?.careerComplete && (
        <SportingGoals s={s} competition={competition} />
      )}
      <FirstFightTrail s={s} />
      {s.boutsCompleted > 0 && <ClubGoalTracker s={s} />}
      {s.boutsCompleted > 0 && <CircuitPayoff s={s} />}
      {s.boutsCompleted > 0 && <TeamCoverage fighters={team} />}
      {coverage.complete && !s.journey?.careerComplete && (
        <section
          className="club-return-card"
          aria-label="Your club competition update"
        >
          <div>
            <span className="career-eyebrow">YOUR NEXT CLUB CHALLENGE</span>
            <h2>
              {competition?.league?.nextMilestone
                ? `${competition.league.nextMilestone.title || competition.league.nextMilestone.name} is next`
                : "Take your corner into Gym Wars"}
            </h2>
            <p>
              {competition?.league?.nextMilestone
                ? `${competition.league.lifetimePoints ?? competition.league.points ?? 0}/${competition.league.nextMilestone.points} permanent club points`
                : "Four bouts. One rival gym. Choose a matched card."}
            </p>
            {defense && (
              <p>
                Your latest defense against {defense.yourGym}: {defense.losses}–
                {defense.wins}
                {defense.draws ? ` (${defense.draws} drawn)` : ""}.{" "}
                <Link to="/career/gym-wars">View the card</Link>
              </p>
            )}
          </div>
          <div>
            <AllowanceLine
              allowance={
                competition?.league?.allowance || allowances?.leagueCards
              }
              noun="ranked cards"
              shortNoun="cards"
            />
            <Link className="career-action" to="/career/gym-wars">
              Choose a rival
            </Link>
          </div>
        </section>
      )}
      {s.boutsCompleted > 0 && (
        <Link
          className={`club-campaign-ticket ${s.journey?.complete ? "complete" : ""}`}
          to="/career/campaign"
        >
          <span className="club-cup" aria-hidden="true">
            <svg
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M7 3h10v5a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 5 4M17 5h4v3a4 4 0 0 1-5 4M12 13v6M7 21h10M9 19h6" />
            </svg>
          </span>
          <div>
            <span className="career-eyebrow">
              {s.journey?.complete
                ? s.journey.careerComplete
                  ? "CAREER COMPLETE"
                  : "INVITATIONAL WON"
                : "ROAD TO THE CAREER INVITATIONAL"}
            </span>
            <h2>
              {s.journey?.complete
                ? s.journey.completion?.complete
                  ? s.journey.completion.label
                  : chapter?.name || "Take your championship club further."
                : stage?.name || "From your first fight to the final team card"}
            </h2>
            <p>
              {s.journey?.complete
                ? s.journey.completion?.complete
                  ? s.journey.completion.description
                  : chapter?.description ||
                    "Build four divisions and earn your first Gym Wars club honor."
                : stage?.description ||
                  "Win a regional belt. Assemble three fighters. Take the Invitational."}
            </p>
          </div>
          <div
            className="club-campaign-progress"
            aria-label="Campaign progress"
          >
            {(s.journey?.stages || []).map((item, index) => (
              <span key={item.id} data-status={item.status} title={item.name}>
                {index + 1}
              </span>
            ))}
          </div>
          <strong className="club-ticket-action">
            {s.journey?.complete ? "View your trophy" : "View career path"}
          </strong>
        </Link>
      )}
      {!s.journey?.careerComplete &&
        competition?.challenges?.some((c) => !c.locked && !c.complete) && (
          <Link className="career-action secondary" to="/career/gym-wars">
            New club cup available · win a 4v4 card to earn your crest
          </Link>
        )}
      {s.boutsCompleted > 0 && nextGymGoal && (
        <Link
          className="design-home-goal"
          to={nextGymGoal.href || "/career/gym/facilities"}
        >
          <div>
            <span className="career-eyebrow">YOUR GYM’S NEXT CHAPTER</span>
            <strong>{nextGymGoal.name}</strong>
            <p>{nextGymGoal.description}</p>
          </div>
          <span>
            {nextGymGoal.current}/{nextGymGoal.target} {nextGymGoal.unit}
          </span>
        </Link>
      )}
      {s.boutsCompleted > 0 && s.rules.departments && (
        <Link className="club-development-link" to="/career/gym/facilities">
          <div>
            <strong>Build your gym’s identity</strong>
            <small>
              {
                Object.values(s.departmentOptions || {}).filter(
                  (d) => d.level > 0,
                ).length
              }{" "}
              / {Object.keys(s.rules.departments).length} departments built ·
              training efficiency, better recovery and fight preparation
            </small>
          </div>
          <span>Explore gym development</span>
        </Link>
      )}
      <section className="club-team" aria-label="Your fight team">
        <header className="career-section-head">
          <div>
            <span className="career-eyebrow">THE PEOPLE WHO GET YOU THERE</span>
            <h2>Your fight team</h2>
          </div>
          <Link className="career-text-link" to="/career/roster">
            Open roster
          </Link>
        </header>
        <div className="club-team-deck">
          {team.map((fighter) => {
            const assignment = assignmentFor(s, fighter);
            const nextAction = fighterNextAction(s, fighter);
            return (
              <article
                className="club-fighter"
                key={fighter.id}
                data-rarity={fighter.rarity}
              >
                <SignatureBadge
                  fighter={fighter}
                  definitions={s.rules.signatures}
                />
                <button
                  className="club-fighter-open"
                  onClick={() => onFighter(fighter.id)}
                  aria-label={`View ${fighter.name}`}
                >
                  <Face fighter={fighter} compact />
                  <div>
                    <RarityBadge rarity={fighter.rarity} />
                    <h3>{fighter.name}</h3>
                    <p>
                      {skillLabel(fighter.style)} · {fighter.record.wins}W /{" "}
                      {fighter.record.losses}L
                    </p>
                    <SignatureLine
                      fighter={fighter}
                      definitions={s.rules.signatures}
                    />
                  </div>
                </button>
                <div className="club-fighter-assignment">
                  <span>{assignment.label}</span>
                  <strong>{readiness(fighter)}% ready</strong>
                </div>
                <div className="club-condition" aria-hidden="true">
                  <span style={{ width: `${readiness(fighter)}%` }} />
                </div>
                <Link className="career-action secondary" to={nextAction.href}>
                  {nextAction.action}
                </Link>
              </article>
            );
          })}
          {team.length < s.rules.facilities[s.facilityTier].slots && (
            <Link className="club-recruit-slot" to="/career/scouting">
              <span>＋</span>
              <strong>Build your team</strong>
              <small>
                {s.rules.facilities[s.facilityTier].slots - team.length} open
                places
              </small>
            </Link>
          )}
        </div>
      </section>
      {nextBout && (
        <Link className="club-next-event" to="/career/fights">
          <span className="career-eyebrow">NEXT ON THE FIGHT CARD</span>
          <strong>
            {s.fighters.find((f) => f.id === nextBout.fighterId)?.name}{" "}
            <i>vs</i> {s.rivals.find((f) => f.id === nextBout.opponentId)?.name}
          </strong>
          <span>{calendarDate(s, nextBout.eventWeek)} · Open fight board</span>
        </Link>
      )}
    </div>
  );
}
