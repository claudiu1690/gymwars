import { Face } from "./CareerControls";
import { fighterPortrait } from "../fighterPortraits.mjs";
import { warDivisions, warLabel } from "../warPresentation.mjs";
import { matchupRead } from "../careerAssignment.mjs";
import SignatureBadge from "./SignatureBadge";
import { ClubMark } from "./ClubIdentity";
import { RarityBadge } from "./FighterRarity";

export function ClubCrest({ name = "Gym", rival = false, look }) {
  if (look)
    return (
      <span
        className={
          "gw-club-crest has-selected-look" + (rival ? " is-rival" : "")
        }
        data-look-id={look.id}
        aria-hidden="true"
      >
        <ClubMark look={look} />
      </span>
    );
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`gw-club-crest ${rival ? "is-rival" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 90">
        <path d="M40 3 75 17v38L40 86 5 55V17Z" />
        <path d="m27 22 13-7 13 7M28 67l12 10 12-10" />
      </svg>
      <b>{initials}</b>
    </span>
  );
}

export function WarAthlete({ fighter, eager = false }) {
  if (!fighter || fighter.missingPortrait)
    return (
      <img
        className="gw-athlete gw-athlete-unknown"
        src="/art/fighters/empty-fighter.webp"
        alt={
          fighter?.name
            ? `${fighter.name}, historical portrait unavailable`
            : "Empty division"
        }
        width="384"
        height="576"
        loading={eager ? "eager" : "lazy"}
      />
    );
  return (
    <img
      className="gw-athlete"
      src={fighterPortrait(fighter).src}
      alt={`${fighter.name}, ${warLabel(fighter.weightClass)} fighter`}
      loading={eager ? "eager" : "lazy"}
    />
  );
}

export function WarMiniFace({ fighter }) {
  return fighter.missingPortrait ? (
    <span className="gw-legacy-face">
      <WarAthlete fighter={fighter} />
    </span>
  ) : (
    <Face fighter={fighter} compact />
  );
}

function Team({ name, fighters, rival, look }) {
  return (
    <div className={`gw-arena-team ${rival ? "is-rival" : ""}`}>
      <header>
        <ClubCrest name={name} rival={rival} look={look} />
        <div>
          <small>{rival ? "RIVAL GYM" : "YOUR GYM"}</small>
          <h3>{name}</h3>
        </div>
      </header>
      <div className="gw-arena-fighters">
        {warDivisions.map((division) => {
          const fighter = fighters.find((f) => f.weightClass === division);
          return (
            <div className="gw-team-member" key={division}>
              <SignatureBadge fighter={fighter} />
              <WarAthlete fighter={fighter} eager />
              <span>{warLabel(division)}</span>
              <strong>{fighter?.name || "Recruit a fighter"}</strong>
              {fighter?.rarity && <RarityBadge rarity={fighter.rarity} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GymWarArena({
  yourGym,
  theirGym,
  fighters = [],
  opponents = [],
  yourLook,
  theirLook,
  children,
}) {
  return (
    <section className="gw-arena" aria-label="4v4 gym battle">
      {children && <div className="gw-arena-action">{children}</div>}
      <div className="gw-arena-topline">
        <span>GYM VS GYM</span>
        <b>
          4 <i>VS</i> 4
        </b>
        <span>ONE FIGHTER PER DIVISION</span>
      </div>
      <div className="gw-arena-versus">
        <Team
          name={yourGym || "Your gym"}
          fighters={fighters}
          look={yourLook}
        />
        <span className="gw-arena-vs" aria-hidden="true">
          VS
        </span>
        <Team
          name={theirGym || "Choose a rival"}
          fighters={opponents}
          rival
          look={theirLook}
        />
      </div>
    </section>
  );
}

export function WarRivals({ opponents, selected, onChange, disabled }) {
  return (
    <section className="gw-rival-board" aria-label="Rival gyms">
      <header>
        <div>
          <span className="career-eyebrow">PICK YOUR OPPOSITION</span>
          <h3>Choose your rival.</h3>
        </div>
        <span>Four fighters. Four bouts.</span>
        <span className="gw-rival-mobile-hint">Swipe for more gyms →</span>
      </header>
      <div
        className="war-league-rivals"
        role="group"
        aria-label="Choose a rival gym"
      >
        {opponents.map((opponent) => (
          <button
            key={opponent.id}
            type="button"
            aria-pressed={selected === opponent.id}
            disabled={disabled}
            onClick={() => onChange(opponent.id)}
          >
            <div className="gw-rival-title">
              <ClubCrest name={opponent.name} rival />
              <strong>{opponent.name}</strong>
            </div>
            <div className="gw-rival-faces" aria-hidden="true">
              {opponent.lineup.map((f) => (
                <Face key={f.id} fighter={f} compact />
              ))}
            </div>
            <span>{opponent.matchup || "4v4 gym"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function WarTactics({ fighters, opponent, s, onEdit }) {
  return (
    <section className="gw-tactics" aria-label="Matchup scouting">
      <header>
        <span className="career-eyebrow">KNOW YOUR OPPOSITION</span>
        <h3>The four matchups</h3>
      </header>
      <div className="gw-tactics-grid">
        {fighters.map((you) => {
          const them = opponent.lineup.find(
            (f) => f.weightClass === you.weightClass,
          );
          if (!them) return null;
          const scout = matchupRead(s, you, them, s.week);
          return (
            <article key={you.weightClass}>
              <small>{warLabel(you.weightClass)}</small>
              <strong>
                {you.name} vs {them.name}
              </strong>
              <p>
                <b>Your opening:</b> {scout.opening}
              </p>
              <p>
                <b>Watch for:</b> {scout.danger}
              </p>
              <p>
                Their plan: {warLabel(them.gameplan?.approach || "balanced")} ·{" "}
                {warLabel(them.gameplan?.pace || "measured")} pace ·{" "}
                {warLabel(them.gameplan?.finish || "hunt-finish")}
              </p>
              <button
                className="career-action secondary"
                type="button"
                onClick={() => onEdit?.(you)}
              >
                Set {you.name}’s tactics
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
