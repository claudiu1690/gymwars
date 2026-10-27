import { Face, PlanFields, PlanSummary } from "./CareerControls";
import { Link } from "react-router-dom";
import { warDivisions, divisionLabel } from "../careerCompetition.mjs";
import { SignatureLine } from "./CareerIdentity";
import { RarityBadge } from "./FighterRarity";
import SignatureBadge from "./SignatureBadge";

export default function WarLineup({
  fighters,
  choices,
  selected,
  onChange,
  disabled,
  editingDivision,
  onEdit,
  gameplans = {},
  onPlanChange,
  opponent,
}) {
  const fighter =
    fighters.find((f) => f.weightClass === editingDivision) || fighters[0];
  const reserves = fighter
    ? choices.filter((f) => f.weightClass === fighter.weightClass)
    : [];
  const plan = fighter && (gameplans[fighter.id] || fighter.gameplan);
  const rival = opponent?.lineup.find(
    (f) => f.weightClass === fighter?.weightClass,
  );
  return (
    <section
      className="war-lineup gw-team-workbench"
      aria-label="Your Gym Wars lineup"
    >
      <div
        className="gw-team-rail"
        role="group"
        aria-label="Choose a fighter to set tactics"
      >
        <div className="gw-team-rail-heading">
          <span className="career-eyebrow">01 · YOUR TEAM</span>
          <h3>Choose your fighter</h3>
        </div>
        {warDivisions.map((division) => {
          const f = fighters.find(
            (candidate) => candidate.weightClass === division,
          );
          if (!f)
            return (
              <article className="war-lineup-empty" key={division}>
                <small>{divisionLabel(division)}</small>
                <strong>Division missing</strong>
                <Link to={`/career/scouting?division=${division}`}>
                  Recruit {divisionLabel(division)}
                </Link>
              </article>
            );
          return (
            <button
              type="button"
              key={division}
              className="gw-team-fighter"
              disabled={disabled}
              aria-pressed={fighter?.id === f.id}
              aria-label={`Set ${f.name}'s tactics`}
              onClick={() => onEdit(division)}
            >
              <Face fighter={f} compact />
              <span>
                <small>{divisionLabel(division)}</small>
                <strong>{f.name}</strong>
                <span>
                  {divisionLabel((gameplans[f.id] || f.gameplan)?.approach)} ·{" "}
                  {divisionLabel((gameplans[f.id] || f.gameplan)?.pace)}
                </span>
                <b>
                  {fighter?.id === f.id ? "Setting tactics" : "Set tactics"}
                </b>
              </span>
            </button>
          );
        })}
      </div>
      {fighter ? (
        <div
          className="gw-team-editor"
          aria-label={`${fighter.name}'s Gym Wars tactics`}
        >
          <header className="gw-tactic-fighter">
            <div className="gw-tactic-portrait">
              <Face fighter={fighter} />
              <SignatureBadge fighter={fighter} />
            </div>
            <div>
              <span className="career-eyebrow">
                02 · SET THEIR INSTRUCTIONS
              </span>
              <h3>{fighter.name}</h3>
              <p>
                {divisionLabel(fighter.weightClass)} ·{" "}
                {divisionLabel(fighter.style)}{" "}
                <RarityBadge rarity={fighter.rarity} />
              </p>
              <SignatureLine fighter={fighter} />
              <dl className="gw-tactic-stats">
                {["striking", "grappling", "submissions", "conditioning"].map(
                  (stat) => (
                    <div key={stat}>
                      <dt>{divisionLabel(stat)}</dt>
                      <dd>{Math.round(fighter.stats[stat])}</dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          </header>
          {reserves.length > 1 && (
            <section className="gw-team-reserves">
              <h4>Who takes this division?</h4>
              <div
                className="war-lineup-options"
                role="group"
                aria-label={`Choose ${divisionLabel(fighter.weightClass)} fighter`}
              >
                {reserves.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.id}
                    disabled={disabled}
                    aria-pressed={
                      (selected[fighter.weightClass] || fighter.id) ===
                      candidate.id
                    }
                    onClick={() =>
                      onChange({
                        ...selected,
                        [fighter.weightClass]: candidate.id,
                      })
                    }
                  >
                    <Face fighter={candidate} compact />
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{divisionLabel(candidate.style)}</small>
                    </span>
                    <b aria-hidden="true">
                      {candidate.id === fighter.id ? "In team" : "Use fighter"}
                    </b>
                  </button>
                ))}
              </div>
            </section>
          )}
          {rival && (
            <aside className="gw-team-matchup">
              <Face fighter={rival} compact />
              <div>
                <small>YOUR NEXT MATCHUP · {opponent.name}</small>
                <strong>vs {rival.name}</strong>
                <span>
                  {divisionLabel(rival.gameplan?.approach)} attacks ·{" "}
                  {divisionLabel(rival.gameplan?.pace)} pace · Striking{" "}
                  {Math.round(rival.stats.striking)} / Grappling{" "}
                  {Math.round(rival.stats.grappling)}
                </span>
              </div>
            </aside>
          )}
          <PlanFields
            value={plan}
            disabled={disabled}
            onChange={(next) => onPlanChange(fighter.id, next)}
            autoRuleDescription="In Gym Wars, your coach switches to a cautious pace when gas falls below this level."
          />
          <PlanSummary value={plan} caption="THIS FIGHTER'S GYM WARS PLAN" />
          <p className="gw-team-plan-note">
            These instructions apply to Gym Wars attacks and defenses. Your
            booked career fight uses its own corner instructions.
          </p>
        </div>
      ) : (
        <div className="gw-team-editor">
          <h3>Build your four-division team</h3>
          <p>Recruit your first fighter to set their Gym Wars tactics.</p>
        </div>
      )}
    </section>
  );
}
