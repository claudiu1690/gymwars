import { Link } from "react-router-dom";
import { Face } from "./CareerControls";
import {
  divisionCoverage,
  divisionLabel,
  warDivisions,
  refillText,
} from "../careerCompetition.mjs";
import "./career-experience.css";

export function TeamCoverage({
  fighters,
  compact = false,
  showChallenge = true,
}) {
  const coverage = divisionCoverage(fighters);
  return (
    <section
      className={`club-division-goal${compact ? " compact" : ""}`}
      aria-label="Four-division Gym Wars team"
    >
      <header>
        <div>
          <span className="career-eyebrow">ONE CORNER · FOUR DIVISIONS</span>
          <h2>
            {coverage.complete
              ? "Your Gym Wars team is ready"
              : `Build your Gym Wars team · ${coverage.covered}/4`}
          </h2>
        </div>
        {coverage.complete && showChallenge && (
          <Link to="/career/gym-wars">Challenge a gym</Link>
        )}
      </header>
      <div className="club-division-slots">
        {warDivisions.map((division) => {
          const fighter = coverage.active.find(
            (member) => member.weightClass === division,
          );
          const reserves =
            coverage.active.filter((member) => member.weightClass === division)
              .length - 1;
          return (
            <Link
              key={division}
              data-filled={Boolean(fighter)}
              to={
                fighter
                  ? `/career/fighter/${fighter.id}`
                  : `/career/scouting?division=${division}`
              }
            >
              {fighter ? (
                <Face fighter={fighter} compact />
              ) : (
                <span aria-hidden="true">+</span>
              )}
              <div>
                <strong>{divisionLabel(division)}</strong>
                <small>
                  {fighter
                    ? `${fighter.name}${reserves > 0 ? ` · ${reserves} reserve${reserves === 1 ? "" : "s"}` : ""}`
                    : "Recruit for this weight class"}
                </small>
              </div>
            </Link>
          );
        })}
      </div>
      {!compact && (
        <p>
          Any rarity qualifies. One fighter per division fights; extra fighters
          are optional reserves. The same owned team attacks and defends.
        </p>
      )}
    </section>
  );
}

export function AllowanceLine({
  allowance,
  noun = "career weeks",
  shortNoun = "weeks",
  compact = false,
}) {
  if (!allowance) return null;
  const refill = refillText(allowance, shortNoun);
  const explanation = `Free ${shortNoun} bank up to ${allowance.maximum}. ${refill}.${allowance.extraAvailable ? ` ${allowance.extraAvailable} extra saved separately.` : ""}`;
  return (
    <div
      className={`club-allowance${compact ? " compact" : ""}`}
      data-empty={allowance.available === 0}
      title={explanation}
    >
      <strong
        aria-label={`${allowance.available} ${noun} ready. ${explanation}`}
      >
        {allowance.available} {compact ? shortNoun : noun} ready
      </strong>
      {!compact && (
        <small>
          {allowance.nextRefillAt ? "Real-time refill: " : ""}
          {refill}
          {allowance.extraAvailable > 0 &&
            ` · ${allowance.extraAvailable} extra saved`}
        </small>
      )}
    </div>
  );
}

export function GymSceneProps({ s }) {
  const rooms = Object.values(s.departmentOptions || {}).filter(
    (room) => room.level > 0,
  ).length;
  const trophies =
    s.fighters.filter((fighter) => fighter.isChampion).length +
    (s.journey?.complete ? 1 : 0);
  const earnedTrophies =
    trophies + (s.gymDevelopment?.identity?.trophies?.length || 0);
  return (
    <div
      className="gym-scene-props"
      aria-label={`Gym identity: tier ${s.facilityTier}, ${rooms} built rooms, ${earnedTrophies} trophies`}
    >
      {s.facilityTier >= 2 && (
        <span className="gym-scene-banner">
          {s.rules.facilities[s.facilityTier].name}
        </span>
      )}
      {rooms > 0 && (
        <span className="gym-scene-roommark">
          <span aria-hidden="true">✦</span> {rooms} specialist rooms
        </span>
      )}
      {earnedTrophies > 0 && (
        <span className="gym-scene-trophies">
          <span aria-hidden="true">🏆</span> {earnedTrophies} club trophies
        </span>
      )}
      {s.facilityTier >= 4 && (
        <span className="gym-scene-crest">
          GW
          <br />
          <small>CHAMPIONSHIP CLUB</small>
        </span>
      )}
    </div>
  );
}
