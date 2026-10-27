import { fighterPortrait } from "../fighterPortraits.mjs";
import { calendarDate, daysUntil } from "../careerCalendar.mjs";
import { matchupRead } from "../careerAssignment.mjs";
import { skillLabel } from "../trainingPlans.mjs";
import { fightStatDisplay } from "../fightPresentation.mjs";
import { SignatureLine } from "./CareerIdentity";
import SignatureBadge from "./SignatureBadge";
import { RarityBadge } from "./FighterRarity";
import "./career-fights.css";
import "./fight-planning.css";

export const fightSkills = [
  "striking",
  "grappling",
  "submissions",
  "conditioning",
];
export const fightMoney = (value) => `$${value.toLocaleString("en-US")}`;

export function PosterFighter({ fighter, rival, bout }) {
  const shownFighter =
    bout?.status && bout.status !== "scheduled" && fighter
      ? {
          ...fighter,
          signatureCombatVersion: bout.combatVersion,
          signatureId:
            bout.preparation?.[rival ? "them" : "you"]?.signatureId || null,
        }
      : fighter && bout?.combatVersion
        ? { ...fighter, signatureCombatVersion: bout.combatVersion }
        : fighter;
  return (
    <div className={`fight-event-corner${rival ? " is-opponent" : ""}`}>
      <SignatureBadge fighter={shownFighter} />
      {fighter ? (
        <img
          className="fight-event-athlete"
          src={fighterPortrait(fighter).src}
          alt={`${fighter.name}, fighter`}
          loading="eager"
        />
      ) : (
        <div
          className="fight-event-athlete fight-event-unknown"
          aria-hidden="true"
        >
          ?
        </div>
      )}
      <div className="fight-event-identity">
        <span>{rival ? "THE CHALLENGER" : "YOUR CORNER"}</span>
        {fighter?.rarity && <RarityBadge rarity={fighter.rarity} />}
        <h3>{fighter?.name || "Booked opponent"}</h3>
        {fighter && (
          <p>
            {skillLabel(fighter.style)} · {fighter.record.wins}W ·{" "}
            {fighter.record.losses}L
            {fighter.record.draws ? ` · ${fighter.record.draws}D` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export function FightPoster({ s, f, opponent, bout, eyebrow, children }) {
  const status = bout.status;
  return (
    <article
      className="fight-event-poster fight-detail-poster"
      aria-label="Fight matchup"
    >
      <header className="fight-event-heading">
        <div>
          <span className="career-eyebrow">{eyebrow}</span>
          <h2>{bout.eventName || "Regional fight night"}</h2>
          <p>
            {skillLabel(f.weightClass)} ·{" "}
            {bout.title
              ? "Championship bout"
              : bout.circuit?.id && bout.circuit.id !== "regional"
                ? `${bout.circuit.name} bout`
                : "Regional bout"}{" "}
            · {bout.rounds || (bout.title ? 5 : 3)} rounds
          </p>
        </div>
        <span
          className={`fight-event-stamp${["ready", "live"].includes(status) ? " is-ready" : ""}`}
        >
          {status === "live"
            ? "LIVE"
            : status === "ready"
              ? "READY"
              : status === "resolved"
                ? "COMPLETED"
                : daysUntil(s, bout.eventWeek)}
        </span>
      </header>
      <div className="fight-event-versus">
        <PosterFighter fighter={f} bout={bout} />
        <span className="fight-event-vs" aria-hidden="true">
          VS
        </span>
        <PosterFighter fighter={opponent} rival bout={bout} />
      </div>
      {children}
    </article>
  );
}

// Preview only bonuses valid on this bout's date. Recorded fight inputs take
// precedence, so history does not change when a fighter develops later.
export function preparationBout(bout, f, opponent) {
  if (bout.status !== "scheduled" || bout.preparation) return bout;
  const preview = (person) => {
    const bonuses = [
      person.preparation && { ...person.preparation, source: "camp" },
      person.mentoringPreparation && {
        ...person.mentoringPreparation,
        source: "mentoring",
      },
    ].filter((bonus) => bonus && bonus.expiresWeek >= bout.eventWeek);
    return {
      bonuses,
      effectiveStats: Object.fromEntries(
        fightSkills.map((key) => [
          key,
          Math.round(
            (person.stats[key] +
              bonuses
                .filter((bonus) => bonus.stat === key)
                .reduce((total, bonus) => total + bonus.value, 0)) *
              10,
          ) / 10,
        ]),
      ),
    };
  };
  return { ...bout, preparation: { you: preview(f), them: preview(opponent) } };
}

export function FightIntel({ s, f, opponent, bout, story }) {
  const yours = fightStatDisplay(bout || {}, f);
  const theirs = fightStatDisplay(bout || {}, opponent, "B");
  const read = matchupRead(
    s,
    {
      ...f,
      stats: Object.fromEntries(yours.map((stat) => [stat.key, stat.value])),
    },
    {
      ...opponent,
      stats: Object.fromEntries(theirs.map((stat) => [stat.key, stat.value])),
    },
    bout.eventWeek,
  );
  const differentStory =
    story?.trim().replace(/\s+/g, " ") !==
    opponent.description?.trim().replace(/\s+/g, " ");
  return (
    <section
      className="fight-planning-panel fight-intel"
      aria-label="Opponent scouting"
    >
      <header>
        <span className="career-eyebrow">KNOW YOUR OPPONENT</span>
        <h2>The matchup</h2>
        <p>Compare skills and build your plan around the openings.</p>
      </header>
      <table className="fight-skill-table">
        <caption>
          {bout.preparation
            ? "Fight skills · valid preparation included"
            : "Current skills"}
        </caption>
        <thead>
          <tr>
            <th scope="col">Skill</th>
            <th scope="col">You</th>
            <th scope="col">Opponent</th>
          </tr>
        </thead>
        <tbody>
          {fightSkills.map((key) => (
            <tr key={key}>
              <th scope="row">{skillLabel(key)}</th>
              {[yours, theirs].map((stats, side) => {
                const stat = stats.find((entry) => entry.key === key);
                return (
                  <td key={side}>
                    <b>{stat?.value}</b>
                    <span
                      className={`fight-skill-track${side ? " is-rival" : ""}`}
                      aria-hidden="true"
                    >
                      <span
                        style={{
                          width: `${Math.max(0, Math.min(100, stat?.value || 0))}%`,
                        }}
                      />
                    </span>
                    {stat?.bonus > 0 && (
                      <small>includes +{stat.bonus} prep</small>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="fight-scout-facts">
        <div>
          <strong>YOUR EDGE</strong>
          <p>{read.opening}</p>
        </div>
        <div>
          <strong>WATCH OUT FOR</strong>
          <p>{read.danger}</p>
        </div>
      </div>
      <div className="fight-scout-story">
        {opponent.description && <p>{opponent.description}</p>}
        {story && differentStory && <p>{story}</p>}
        {opponent.gameplan && (
          <p>
            <strong>Scouted plan:</strong>{" "}
            {skillLabel(opponent.gameplan.approach)} ·{" "}
            {skillLabel(opponent.gameplan.pace)} pace ·{" "}
            {skillLabel(opponent.gameplan.finish)}
            {opponent.gameplan.conserveBelow
              ? ` · eases off below ${opponent.gameplan.conserveBelow}% gas`
              : ""}
            .
          </p>
        )}
        <SignatureLine
          fighter={f}
          definitions={s.rules.signatures}
          caption="Your signature"
        />
        <SignatureLine
          fighter={opponent}
          definitions={s.rules.signatures}
          caption="Their signature"
        />
      </div>
    </section>
  );
}

export function ContractFacts({ s, bout, readiness }) {
  return (
    <dl className="fight-contract-facts">
      <div>
        <dt>FIGHT DATE</dt>
        <dd>{calendarDate(s, bout.eventWeek)}</dd>
      </div>
      <div>
        <dt>GUARANTEED PAY</dt>
        <dd>
          {fightMoney(bout.show)}
          <small>+ {fightMoney(bout.winBonus)} for a win</small>
        </dd>
      </div>
      <div>
        <dt>{readiness == null ? "TIME TO PREPARE" : "YOUR FIGHTER"}</dt>
        <dd>
          {readiness == null
            ? `${bout.notice} ${bout.notice === 1 ? "week" : "weeks"}`
            : `${readiness}% ready`}
        </dd>
      </div>
    </dl>
  );
}
