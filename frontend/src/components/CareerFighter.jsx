import { calendarDate, calendarText, daysUntil } from "../careerCalendar.mjs";
import { Link } from "react-router-dom";
import { Action, Face } from "./CareerControls";
import { RarityBadge } from "./FighterRarity";
import { SignaturePicker, ClubGoalTracker } from "./CareerIdentity";
import { Ico, TAB_ICONS } from "./Icons";
import SignatureBadge from "./SignatureBadge";
import { assignmentFor, fighterNextAction } from "../careerAssignment.mjs";
import "./career-design.css";
import "./fighter-locker.css";
import {
  fighterBout,
  fighterPair,
  matchupMessage,
  campTitle,
  readiness,
  skillLabel,
  trainingSkills,
} from "../trainingPlans.mjs";

export default function CareerFighter({
  s,
  f,
  command,
  disabled,
  onTraining,
  onBook,
  onFight,
  onBrief,
}) {
  const b = fighterBout(s, f);
  const opponent = b && s.rivals.find((r) => r.id === b.opponentId);
  const pair = fighterPair(s, f);
  const inactive = f.retired || f.released;
  const ready = ["ready", "live"].includes(b?.status);
  const condition = readiness(f);
  const available = !inactive && !b && !f.camp && !pair;
  const assignment = assignmentFor(s, f);
  const action = fighterNextAction(s, f);
  const lastInDivision =
    !inactive &&
    !s.fighters.some(
      (other) =>
        other.id !== f.id &&
        !other.retired &&
        !other.released &&
        other.weightClass === f.weightClass,
    );
  const replacementWarning = lastInDivision
    ? ` ${f.name} is your only ${skillLabel(f.weightClass).toLowerCase()} fighter. Gym Wars needs all four divisions; recruit a replacement before returning to ranked play.`
    : "";
  return (
    <div className="fighter-workspace">
      <nav className="fighter-breadcrumb" aria-label="Fighter navigation">
        <Link to="/career/roster">Your fighters</Link>
        <span>/ {f.name}</span>
      </nav>
      <div className="fighter-layout">
        <article className="fighter-identity" data-rarity={f.rarity}>
          <div className="fighter-identity-art">
            <Face fighter={f} />
            <SignatureBadge fighter={f} definitions={s.rules.signatures} />
            {f.isChampion && (
              <span className="fighter-belt">REGIONAL CHAMPION</span>
            )}
          </div>
          <div className="fighter-identity-name">
            <div className="career-eyebrow">
              {inactive
                ? f.retired
                  ? "HALL OF FAME"
                  : "FORMER FIGHTER"
                : "YOUR FIGHTER"}
            </div>
            <div className="rarity-nameplate">
              <RarityBadge rarity={f.rarity} />
            </div>
            <h2>{f.name}</h2>
            <p>
              {skillLabel(f.style)} · {skillLabel(f.weightClass)}
            </p>
            <small>
              Age {f.age} · {f.phase}
            </small>
            <dl className="fighter-record">
              {[
                ["Wins", f.record.wins],
                ["Losses", f.record.losses],
                ["Draws", f.record.draws || 0],
              ].map(([label, n]) => (
                <div key={label}>
                  <dd>{n}</dd>
                  <dt>{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </article>
        <div className="fighter-decisions">
          {!inactive && (
            <article className="fighter-challenge">
              <header>
                <span>
                  {ready
                    ? "FIGHT NIGHT"
                    : b
                      ? "NEXT CHALLENGE"
                      : f.camp
                        ? "IN THE GYM"
                        : pair
                          ? "PASSING ON EXPERIENCE"
                          : "TRAIN OR FIGHT"}
                </span>
                <strong>
                  {b
                    ? ready
                      ? "Ready now"
                      : daysUntil(s, b.eventWeek)
                    : calendarDate(s)}
                </strong>
              </header>
              <div className="fighter-challenge-body">
                {opponent ? (
                  <>
                    <div className="fighter-opponent">
                      <div>
                        <div className="career-eyebrow">YOUR NEXT OPPONENT</div>
                        <h3>{opponent.name}</h3>
                        <p>
                          {skillLabel(opponent.style)} · {opponent.record.wins}W
                          / {opponent.record.losses}L
                        </p>
                        <span className="locker-bout-label">
                          {b.title
                            ? "Regional title bout"
                            : b.circuit?.name || "Regional bout"}{" "}
                          · {calendarDate(s, b.eventWeek)}
                        </span>
                      </div>
                      <Face fighter={opponent} compact />
                    </div>
                    <p className="fighter-matchup-read">
                      <strong>Coach’s read</strong>{" "}
                      {matchupMessage(f, opponent)}
                    </p>
                  </>
                ) : (
                  <>
                    <h3>
                      {f.camp
                        ? "Put your training into practice."
                        : pair
                          ? "A fighter’s experience lives on."
                          : condition < 70
                            ? "Recover for your next challenge."
                            : "Choose your next challenge."}
                    </h3>
                    <p>
                      {f.camp
                        ? `${campTitle(s, f.camp)}: ${f.camp.completed} of ${f.camp.weeks} weeks completed. ${f.camp.needsReview ? "Decide whether to continue or recover." : `Your camp ends on ${calendarDate(s, f.camp.endWeek)}.`}`
                        : pair
                          ? `Mentoring continues through ${calendarDate(s, pair.endWeek)}. The whole gym moves forward when you press End week.`
                          : condition < 70
                            ? "Rest restores readiness. You can still plan training, but leave time to arrive fresh."
                            : "Find a career opponent, then prepare for a fight with a purpose."}
                    </p>
                  </>
                )}
                {f.camp && opponent && (
                  <p className="fighter-commitment">
                    {f.camp.needsReview
                      ? "Camp decision waiting"
                      : `${f.camp.completed === 0 ? "Camp assigned · " : ""}${campTitle(s, f.camp)} · ${f.camp.completed}/${f.camp.weeks} weeks complete. End week to train.`}
                  </p>
                )}
                {!opponent && (
                  <div className="locker-assignment">
                    <span>THIS WEEK</span>
                    <strong>{assignment.label}</strong>
                  </div>
                )}
                <div className="fighter-main-actions">
                  <Link className="career-action" to={action.href}>
                    {action.action}{" "}
                  </Link>
                  {available && action.kind === "book" ? (
                    <Action secondary disabled={disabled} onClick={onTraining}>
                      Choose training
                    </Action>
                  ) : (
                    available && (
                      <Action secondary disabled={disabled} onClick={onBook}>
                        Find a fight
                      </Action>
                    )
                  )}
                </div>
                {b && !ready && (
                  <button
                    className="camp-text-button"
                    onClick={() => onBrief(b.id)}
                  >
                    Matchup & corner instructions
                  </button>
                )}
              </div>
            </article>
          )}
          {!inactive && (
            <div
              className="fighter-condition"
              aria-label={`Readiness ${condition}%`}
            >
              <strong>{condition}%</strong>
              <div>
                <b>
                  {condition >= 95
                    ? "Fresh and ready"
                    : condition >= 70
                      ? "Some fatigue to manage"
                      : "Recovery matters now"}
                </b>
                <p>
                  {ready
                    ? "This is your condition entering the bout."
                    : "Training builds skills; time outside camp restores readiness."}
                </p>
                <div className="fighter-condition-track">
                  <span style={{ width: `${condition}%` }} />
                </div>
              </div>
            </div>
          )}
          <SignaturePicker s={s} f={f} command={command} disabled={disabled} />
          {f.discoveredTraits.length > 0 && (
            <section
              className="locker-traits"
              aria-label="Known fighter traits"
            >
              <header>
                <span className="career-eyebrow">HOW THEY FIGHT</span>
                <h3>Fighter traits</h3>
                <p>Natural tendencies that shape each bout.</p>
              </header>
              <div className="locker-trait-grid">
                {f.discoveredTraits.map((t) => (
                  <div key={t}>
                    <span className="locker-trait-symbol" aria-hidden="true">
                      {t.includes("starter") ? "◷" : "✦"}
                    </span>
                    <div>
                      <strong>{skillLabel(t)}</strong>
                      <span>{s.rules.traits[t]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {!inactive && (
            <div className="fighter-title-chase">
              <strong>
                {f.isChampion
                  ? "Defend your belt"
                  : f.rankingPoints >= 80
                    ? "Eligible for a title shot"
                    : `${f.rankingPoints} / 80 title-eligibility points`}
              </strong>
              <span>
                {f.isChampion
                  ? "Each successful defense adds 20 gym legacy."
                  : f.rankingPoints >= 80
                    ? "Look for a championship opponent in your offers."
                    : "A regular win adds 25 points. Reach 80 to unlock championship opponents."}
              </span>
            </div>
          )}
          <section className="fighter-skills locker-skills">
            <header>
              <span className="career-eyebrow">BUILT THROUGH TRAINING</span>
              <h3>Fighter skills</h3>
              <p>Permanent skills · rated out of 99</p>
            </header>
            <dl className="fighter-attributes">
              {trainingSkills.map((k) => (
                <div key={k}>
                  <dt>
                    <Ico
                      d={
                        k === "striking"
                          ? TAB_ICONS.fights
                          : k === "conditioning"
                            ? TAB_ICONS.gym
                            : k === "grappling"
                              ? "M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 22v-9l7-3 6 3 7-3v12M9 10v12M15 13v9"
                              : "M8 3v6l4 4 4-4V3M3 11l5 5v5M21 11l-5 5v5M8 16h8"
                      }
                    />
                    {skillLabel(k)}
                  </dt>
                  <dd>
                    {Math.round(f.stats[k] * 10) / 10}
                    <small>/ 99</small>
                  </dd>
                  <div className="locker-skill-track" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.max(0, Math.min(100, (f.stats[k] / 99) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </dl>
            {Object.entries(f.growthKnowledge || {}).some(
              ([, knowledge]) => knowledge.plateau,
            ) && (
              <div className="design-growth-observation">
                <strong>What training has revealed</strong>
                {Object.entries(f.growthKnowledge || {})
                  .filter(([, knowledge]) => knowledge.plateau)
                  .map(([skill, knowledge]) => (
                    <p key={skill}>
                      {skillLabel(skill)} reached an observed plateau at{" "}
                      {Math.round(knowledge.observedAt * 10) / 10}. Training
                      forecasts now account for this known limit. Other skills
                      can still develop.
                    </p>
                  ))}
              </div>
            )}
            {f.preparation && f.preparation.expiresWeek >= s.week && (
              <p className="camp-preparation-note">
                <strong>
                  Prepared: +{f.preparation.value} {f.preparation.stat}
                </strong>{" "}
                for the next eligible bout, valid through{" "}
                {calendarDate(s, f.preparation.expiresWeek)}. Separate from
                permanent skills.
              </p>
            )}
            {f.mentoringPreparation &&
              f.mentoringPreparation.expiresWeek >= s.week && (
                <p className="camp-preparation-note">
                  <strong>
                    Lesson preparation: +{f.mentoringPreparation.value}{" "}
                    {skillLabel(f.mentoringPreparation.stat).toLowerCase()}
                  </strong>{" "}
                  for the next eligible bout through{" "}
                  {calendarDate(s, f.mentoringPreparation.expiresWeek)}.
                  Permanent trait mastery is separate.
                </p>
              )}
          </section>
          <ClubGoalTracker s={s} fighterId={f.id} />
          <section className="fighter-disclosure">
            <h3>Career story & history</h3>
            <div className="fighter-story">
              {f.championships.map((c, i) => (
                <p key={`title-${i}`}>
                  <strong>Regional title reign</strong>
                  <br />
                  {calendarDate(s, c.wonWeek)}–
                  {c.endedWeek == null
                    ? "present"
                    : calendarDate(s, c.endedWeek)}{" "}
                  · {c.defenses} defenses
                </p>
              ))}
              {f.lineage.map((l, i) => (
                <p key={`lineage-${i}`}>
                  {skillLabel(l.trait)} learned from {l.name},{" "}
                  {calendarDate(s, l.week)}.
                </p>
              ))}
              {[...f.history].reverse().map((h, i) => (
                <p key={`history-${i}`}>
                  <small>{calendarDate(s, h.week)}</small>
                  <br />
                  {calendarText(s, h.text)}
                </p>
              ))}
              {!f.history.length && <p>The next bout starts a new chapter.</p>}
            </div>
          </section>
          {available &&
            s.fighters.filter((x) => !x.retired && !x.released).length > 1 && (
              <section className="fighter-disclosure">
                <h3>Roster management</h3>
                <p>
                  Release this fighter’s roster place or preserve their story in
                  the Hall of Fame.
                </p>
                {lastInDivision && (
                  <p className="career-warning">
                    {replacementWarning}
                    <br />
                    <Link to={`/career/scouting?division=${f.weightClass}`}>
                      Find a replacement
                    </Link>
                  </p>
                )}
                <div className="career-inline">
                  <Action
                    secondary
                    disabled={disabled}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Release ${f.name} from the roster?${replacementWarning}`,
                        )
                      )
                        command({
                          type: "release",
                          fighterId: f.id,
                          ...(lastInDivision
                            ? { confirmDivisionLoss: true }
                            : {}),
                        });
                    }}
                  >
                    Release fighter
                  </Action>
                  {f.age >= 30 && (
                    <Action
                      secondary
                      disabled={disabled}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Retire ${f.name} to the Hall of Fame?${replacementWarning}`,
                          )
                        )
                          command({
                            type: "retire",
                            fighterId: f.id,
                            ...(lastInDivision
                              ? { confirmDivisionLoss: true }
                              : {}),
                          });
                      }}
                    >
                      Retire to Hall of Fame
                    </Action>
                  )}
                </div>
              </section>
            )}
        </div>
      </div>
    </div>
  );
}
