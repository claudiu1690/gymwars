import { gymEnvironment } from "../gymEnvironments.mjs";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Action, Face } from "./CareerControls";
import { RarityBadge } from "./FighterRarity";
import SignatureBadge from "./SignatureBadge";
import StaffWork from "./StaffWork";
import { ClubFlag } from "./ClubIdentity";
import { Ico } from "./Icons";
import CareerDevelopment, { PurchasePreview } from "./CareerDevelopment";
import { assignmentFor, investmentPreview } from "../careerAssignment.mjs";
import { calendarDate, calendarText } from "../careerCalendar.mjs";
import {
  fighterBout,
  fighterPair,
  campTitle,
  readiness,
  planProblem,
} from "../trainingPlans.mjs";
import "./career-gym.css";
import "./career-design.css";
import "./club-environments.css";
import "./gym-art-direction.css";
import "./mentoring-choices.css";

const money = (value) => `$${value.toLocaleString("en-US")}`;
const label = (value = "") =>
  value.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
const family = (style) =>
  ["boxing", "muay-thai"].includes(style)
    ? "striking"
    : ["wrestling", "judo"].includes(style)
      ? "wrestling"
      : "submission";
const conflicts = {
  "iron-chin": "suspect-chin",
  "suspect-chin": "iron-chin",
  "fast-starter": "slow-starter",
  "slow-starter": "fast-starter",
};
const icons = {
  coach: "M3 8v8M7 6v12M17 6v12M21 8v8M7 12h10",
  scout:
    "M4 4h4v5M16 4h4v5M2 18l2-9h4l2 9M14 18l2-9h4l2 9M10 12h4M10 18a4 4 0 11-8 0 4 4 0 018 0zM22 18a4 4 0 11-8 0 4 4 0 018 0z",
};

function scheduleReason(s, f) {
  if (f.camp)
    return f.camp.needsReview
      ? "Camp decision waiting"
      : `In camp until ${calendarDate(s, f.camp.endWeek)}`;
  if (fighterPair(s, f)) return "Already in a mentoring pair";
  const bout = fighterBout(s, f);
  if (bout) return `Fight booked for ${calendarDate(s, bout.eventWeek)}`;
  return "";
}

function TeamCard({ s, f, disabled, openFighter, onTraining, onMentoring }) {
  const bout = fighterBout(s, f),
    pair = fighterPair(s, f);
  const ready = ["ready", "live"].includes(bout?.status);
  const state = ready
    ? "fight"
    : f.camp?.needsReview
      ? "decision"
      : f.camp
        ? "training"
        : pair
          ? "mentoring"
          : f.fatigue > 0
            ? "recovery"
            : "idle";
  const assignment = assignmentFor(s, f);
  const title = assignment.label;
  const partner =
    pair &&
    s.fighters.find(
      (other) =>
        other.id === (pair.mentorId === f.id ? pair.juniorId : pair.mentorId),
    );
  return (
    <article
      className="gym-team-card"
      data-state={state}
      data-rarity={f.rarity}
    >
      <SignatureBadge fighter={f} definitions={s.rules.signatures} />
      <button
        type="button"
        className="gym-fighter-top"
        onClick={() => openFighter(f.id)}
        aria-label={`View ${f.name}`}
      >
        <Face fighter={f} compact />
        <div>
          <RarityBadge rarity={f.rarity} />
          <h3>{f.name}</h3>
          <span>
            {label(f.style)} · {f.record.wins}W / {f.record.losses}L
          </span>
        </div>
      </button>
      <div className="gym-team-work">
        <span className="gym-work-label">
          <i aria-hidden="true" />
          {title}
        </span>
        <strong>
          {f.camp
            ? campTitle(s, f.camp)
            : pair
              ? `${label(pair.trait)} with ${partner?.name || "a teammate"}`
              : ready
                ? `Enter the corner for ${f.name.split(" ")[0]}.`
                : f.fatigue > 0
                  ? "Readiness recovers. Skills stay put."
                  : "Choose a focus and camp length."}
        </strong>
        <p>
          {f.camp
            ? `${f.camp.completed} / ${f.camp.weeks} weeks complete · ${f.camp.needsReview ? "Choose the next step" : `ends ${calendarDate(s, f.camp.endWeek)}`}`
            : pair
              ? `Both schedules reserved until ${calendarDate(s, pair.endWeek)}.`
              : bout
                ? `Next fight: ${calendarDate(s, bout.eventWeek)}. A camp must finish before then.`
                : "Free schedule · train now or keep this fighter available."}
        </p>
        <div className="gym-readiness">
          <span>Readiness</span>
          <span className="gym-readiness-track">
            <i style={{ width: `${readiness(f)}%` }} />
          </span>
          <strong>{readiness(f)}%</strong>
        </div>
        <div className="gym-team-actions">
          {ready ? (
            <Link
              className="career-action"
              to={`/career/fight-night/${bout.id}`}
            >
              Enter corner
            </Link>
          ) : pair ? (
            <Action secondary onClick={onMentoring}>
              View mentoring pair
            </Action>
          ) : (
            <Action disabled={disabled} onClick={() => onTraining(f.id)}>
              {f.camp?.needsReview
                ? "Camp check-in"
                : f.camp
                  ? "Open camp"
                  : "Choose training"}{" "}
            </Action>
          )}
          {bout && !ready && (
            <Link
              className="gym-small-link"
              to={`/career/bout/${bout.id}/tactics`}
            >
              Corner plan
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function StaffCard({ s, role, command, disabled }) {
  const spec = s.rules.staff[role],
    hired = s.staff[role];
  const rank =
    s.staffOptions?.[role]?.currentRank ?? (hired ? hired.rank || 1 : 0);
  const ranks = spec.ranks?.filter(Boolean) || [
    {
      rank: 1,
      name: role === "coach" ? "Club coach" : "Local scout",
      ...spec,
      ...(role === "coach" ? { growthMultiplier: 1.15 } : { reportWidth: 6 }),
      facilityTier: 1,
    },
  ];
  const current =
    s.staffOptions?.[role]?.current || ranks.find((r) => r.rank === rank);
  const next =
    s.staffOptions?.[role]?.next ?? ranks.find((r) => r.rank === rank + 1);
  const blocked =
    s.staffOptions?.[role]?.blockedReason ||
    (!s.boutsCompleted
      ? "Complete your opening bout to build your staff."
      : next && s.facilityTier < next.facilityTier
        ? `Requires ${s.rules.facilities[next.facilityTier].name}.`
        : next && s.cash < next.fee
          ? `Need ${money(next.fee - s.cash)} more.`
          : "");
  const [release, setRelease] = useState(false);
  const development = s.staffOptions?.[role]?.development;
  const effect = (r) =>
    role === "coach"
      ? `+${Math.round((r.growthMultiplier - 1) * 100)}% camp growth`
      : r.reportWidth === 0
        ? "Exact stats · complete verified trait profile"
        : `${r.reportWidth}-point scouting ranges${r.rank >= 4 ? " · verified beneficial trait" : r.rank >= 3 ? " · full development outlook" : r.rank >= 2 ? " · primary development outlook" : ""}`;
  return (
    <article className="gym-staff-card" data-role={role}>
      <div className="gym-staff-heading">
        <span className="gym-staff-emblem">
          <Ico d={icons[role]} size={38} />
        </span>
        <div>
          <span className="career-eyebrow">
            {role === "coach" ? "BUILD YOUR FIGHTERS" : "FIND YOUR NEXT STAR"}
          </span>
          <h3>
            {hired ? current?.name : role === "coach" ? "Coach" : "Scout"}
          </h3>
          <span>{hired ? `Rank ${rank}` : "Position open"}</span>
        </div>
      </div>
      <strong className="gym-staff-effect">
        {current
          ? effect(current)
          : role === "coach"
            ? "More growth from every camp."
            : "Know who you are signing."}
      </strong>
      <p>
        {role === "coach"
          ? "Boosts permanent skill gains during training. Preview the coach’s extra gains when choosing a camp."
          : "Narrows the uncertainty on investigated recruits. Better information; the fighter’s ability is unchanged."}
      </p>
      {next && (
        <div className="gym-staff-next-rank">
          <span>Next promotion · rank {next.rank}</span>
          <strong>{next.name}</strong>
          <p>{effect(next)}</p>
        </div>
      )}
      <StaffWork option={s.staffOptions?.[role]} role={role} />
      {!hired && (
        <p>
          After hiring, your {role} develops through real work with the gym.
          Money alone cannot buy the next rank.
        </p>
      )}
      <h4>Staff progression</h4>
      <ol className="gym-staff-ranks" aria-label={`${label(role)} progression`}>
        {ranks.map((r) => (
          <li
            key={r.rank}
            data-state={
              rank >= r.rank
                ? "earned"
                : rank + 1 === r.rank
                  ? "next"
                  : "locked"
            }
          >
            <span aria-hidden="true">
              {(rank >= r.rank ? "★" : "☆").repeat(r.rank)}
            </span>
            <strong>{r.name}</strong>
            <small>{effect(r)}</small>
            <small>
              {r.rank === rank ? "Current rank" : `Gym tier ${r.facilityTier}`}
            </small>
            {r.rank > 1 && (
              <small className="staff-rank-work">
                {development?.ranks
                  .find((entry) => entry.rank === r.rank)
                  ?.requirements.map(
                    (item) => `${item.target} ${item.label.toLowerCase()}`,
                  )
                  .join(" · ")}
              </small>
            )}
          </li>
        ))}
      </ol>
      {next && (
        <ul
          className="staff-promotion-checks"
          aria-label="Everything needed to promote"
        >
          {(s.staffOptions?.[role]?.promotionChecks || [])
            .filter((check) => check.id !== "debut" || !check.complete)
            .map((check) => (
              <li key={check.id} data-complete={check.complete}>
                <span>{check.complete ? "Ready" : "Needed"}</span>
                {check.complete ? (
                  <strong>{check.label}</strong>
                ) : (
                  <Link to={check.href}>{check.label}</Link>
                )}
              </li>
            ))}
        </ul>
      )}
      <div className="gym-staff-contract">
        {next ? (
          <>
            <div>
              <strong>
                {hired ? `Develop to ${next.name}` : `Hire ${next.name}`}
              </strong>
              <span>
                {money(next.fee)} once · {money(next.upkeep)} / week
                {current
                  ? ` (${money(next.upkeep - current.upkeep)} more)`
                  : ""}
              </span>
            </div>
            <Action
              disabled={disabled || !!blocked}
              onClick={() =>
                command({ type: hired ? "upgrade-staff" : "hire", role })
              }
            >
              {hired ? "Promote" : "Hire"} · {money(next.fee)}
            </Action>
          </>
        ) : (
          <div>
            <strong>Top rank achieved</strong>
            <span>{money(current?.upkeep || 0)} / week</span>
          </div>
        )}
      </div>
      {next && (
        <PurchasePreview
          preview={
            s.staffOptions?.[role]?.purchasePreview ||
            investmentPreview(
              s,
              next.fee,
              s.weeklyCost - (current?.upkeep || 0) + next.upkeep,
            )
          }
        />
      )}
      {blocked && next && <p className="gym-lock-reason">{blocked}</p>}
      {hired && (
        <div className="gym-staff-release">
          {release ? (
            <>
              <p>
                Release your {role}? Its benefit ends immediately; hiring again
                starts at rank 1 with new development progress.
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={async () => {
                  const ok = await command({ type: "fire", role });
                  if (ok) setRelease(false);
                }}
              >
                Release {role}
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setRelease(false)}
              >
                Keep staff
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setRelease(true)}
            >
              Manage contract · current upkeep {money(current?.upkeep || 0)} /
              week
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function VeteranOpportunity({ s, team, command, disabled, onSigned }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const capacity = s.rules.facilities[s.facilityTier].slots;
  const blockedReason =
    team.length >= capacity
      ? "Free a roster place or expand your gym first."
      : s.cash < 180
        ? `Need ${money(180 - s.cash)} more to sign Marco.`
        : "";
  if (!s.boutsCompleted || s.veteranSigned) return null;
  return (
    <aside className="gym-veteran-opportunity" aria-label="Veteran opportunity">
      <Face fighter={{ name: "Marco Silva", portrait: 3 }} />
      <div>
        <span className="career-eyebrow">EXPERIENCE WORTH PASSING ON</span>
        <h3>
          Marco Silva <small>Age 32</small>
        </h3>
        <p>
          Known trait: <strong>Cardio machine</strong> —{" "}
          {s.rules.traits["cardio-machine"]} Limited growth headroom; his value
          is also in what he can teach.
        </p>
        {confirm ? (
          <div
            className="gym-veteran-confirm"
            role="group"
            aria-label="Confirm veteran signing"
          >
            <p>
              Sign Marco for $180. {money(s.cash - 180)} left after signing ·{" "}
              {team.length + 1} / {capacity} roster places filled. You choose
              his mentoring partner afterward.
            </p>
            <Action
              disabled={disabled || pending || !!blockedReason}
              onClick={async () => {
                if (inFlight.current) return;
                inFlight.current = true;
                setPending(true);
                try {
                  const ok = await command({ type: "veteran" });
                  if (ok) {
                    setConfirm(false);
                    onSigned("veteran");
                  }
                } finally {
                  inFlight.current = false;
                  setPending(false);
                }
              }}
            >
              Confirm · $180
            </Action>
            <Action
              secondary
              disabled={disabled || pending}
              onClick={() => setConfirm(false)}
            >
              Keep looking
            </Action>
          </div>
        ) : (
          <Action
            disabled={disabled || !!blockedReason}
            onClick={() => setConfirm(true)}
          >
            Sign veteran · $180
          </Action>
        )}
        {blockedReason && <p className="gym-lock-reason">{blockedReason}</p>}
      </div>
    </aside>
  );
}

function TeamTraining({ s, team, command, disabled }) {
  const [selected, setSelected] = useState([]),
    [preset, setPreset] = useState("balanced"),
    [weeks, setWeeks] = useState(1);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  const available = team.filter((f) => assignmentFor(s, f).kind === "rest");
  const chosen = available.filter((f) => selected.includes(f.id));
  const spec = s.rules.presets[preset];
  const problems = chosen
    .map((f) => ({
      f,
      problem: planProblem(s, f, {
        type: "camp",
        preset,
        weeks,
        allocations: spec.allocations,
      }),
    }))
    .filter((item) => item.problem);
  const repeatProblems = chosen
    .map((f) => ({
      f,
      problem: !f.lastCamp
        ? "No previous camp to repeat."
        : planProblem(s, f, { type: "camp", ...f.lastCamp }),
    }))
    .filter((item) => item.problem);
  async function assign(repeat = false) {
    if (lock.current || disabled || !chosen.length) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      const ok = await command(
        repeat
          ? { type: "repeat-camp-batch", fighterIds: chosen.map((f) => f.id) }
          : {
              type: "camp-batch",
              fighterIds: chosen.map((f) => f.id),
              preset,
              weeks,
            },
      );
      if (ok) {
        setSelected([]);
        setMessage(
          `${chosen.length} camps assigned. Time has not moved. End week when your whole team is ready.`,
        );
      }
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  if (team.length < 2) return null;
  return (
    <section className="design-team-training" aria-label="Team training">
      <h3>Assign camps to several fighters</h3>
      <p>
        Choose available teammates and a shared camp, or repeat each fighter’s
        previous camp. Adjust any camp individually before End week.
      </p>
      <div
        className="design-batch-fighters"
        role="group"
        aria-label="Choose fighters for team training"
      >
        {available.map((f) => (
          <button
            type="button"
            key={f.id}
            aria-pressed={selected.includes(f.id)}
            disabled={disabled || pending}
            onClick={() => {
              setSelected((ids) =>
                ids.includes(f.id)
                  ? ids.filter((id) => id !== f.id)
                  : [...ids, f.id],
              );
              setMessage("");
            }}
          >
            <Face fighter={f} compact />
            <strong>{f.name}</strong>
            <span>{readiness(f)}% readiness</span>
          </button>
        ))}
      </div>
      {!available.length ? (
        <p>Everyone already has a commitment. Review their cards above.</p>
      ) : (
        <>
          <div className="design-batch-selection">
            <button
              type="button"
              className="camp-text-button"
              disabled={disabled || pending}
              onClick={() => setSelected(available.map((f) => f.id))}
            >
              Choose all available
            </button>
            <button
              type="button"
              className="camp-text-button"
              disabled={disabled || pending}
              onClick={() => setSelected([])}
            >
              Clear selection
            </button>
          </div>
          <div
            className="design-batch-presets"
            role="group"
            aria-label="Shared training focus"
          >
            {Object.entries(s.rules.presets).map(([id, plan]) => (
              <button
                type="button"
                key={id}
                aria-pressed={id === preset}
                disabled={
                  disabled ||
                  pending ||
                  s.presetOptions?.[id]?.available === false
                }
                title={s.presetOptions?.[id]?.blockedReason || plan.description}
                onClick={() => setPreset(id)}
              >
                {plan.name}
              </button>
            ))}
          </div>
          <div
            className="design-batch-presets"
            role="group"
            aria-label="Shared camp duration"
          >
            {s.rules.campLengths.map((length) => (
              <button
                type="button"
                key={length}
                aria-pressed={weeks === length}
                disabled={disabled || pending}
                onClick={() => setWeeks(length)}
              >
                {length} {length === 1 ? "week" : "weeks"}
              </button>
            ))}
          </div>
          <p>
            <strong>{chosen.length} fighters selected</strong> · {spec.name},{" "}
            {weeks} {weeks === 1 ? "week" : "weeks"}.{" "}
            {chosen.length
              ? `Ends ${calendarDate(s, s.week + weeks)}.`
              : "Choose teammates above."}
          </p>
          {problems.length > 0 && (
            <p className="career-warning">
              {problems
                .map(({ f, problem }) => `${f.name}: ${problem}`)
                .join(" ")}
            </p>
          )}
          <div className="design-batch-actions">
            <Action
              disabled={
                disabled || pending || !chosen.length || !!problems.length
              }
              onClick={() => assign()}
            >
              Assign {chosen.length || "selected"} camps
            </Action>
            <Action
              secondary
              disabled={
                disabled || pending || !chosen.length || !!repeatProblems.length
              }
              onClick={() => assign(true)}
            >
              Repeat previous camps
            </Action>
          </div>
          {chosen.length > 0 && (
            <section
              className="design-repeat-details"
              aria-label="Previous camps to repeat"
            >
              <h4>Previous camps to repeat</h4>
              {chosen.map((f) => (
                <p key={f.id}>
                  {f.name}:{" "}
                  {f.lastCamp
                    ? `${campTitle(s, f.lastCamp)}, ${f.lastCamp.weeks} weeks`
                    : "No previous camp"}
                  {repeatProblems.find((item) => item.f.id === f.id)
                    ? ` — ${repeatProblems.find((item) => item.f.id === f.id).problem}`
                    : ""}
                </p>
              ))}
            </section>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}

function Mentoring({ s, team, command, disabled, juniorId }) {
  const [chosen, setChosen] = useState(null),
    [showAll, setShowAll] = useState(false),
    [working, setWorking] = useState(false);
  const lock = useRef(false);
  const active = s.mentoring.filter((p) => p.status === "active");
  const lessons = new Map();
  for (const option of [...(s.mentoringOptions || [])]
    .filter(
      (lesson) => !["suspect-chin", "big-fight-nerves"].includes(lesson.trait),
    )
    .sort(
      (a, b) => Number(b.canStart) - Number(a.canStart) || a.weeks - b.weeks,
    )) {
    const key = option.juniorId + ":" + option.trait;
    if (!lessons.has(key)) lessons.set(key, option);
  }
  const options = [...lessons.values()].sort(
    (a, b) => Number(b.juniorId === juniorId) - Number(a.juniorId === juniorId),
  );
  const alternative = (option) =>
    options.find(
      (o) =>
        o.trait === option.trait &&
        o.juniorId !== option.juniorId &&
        o.canStart,
    );
  useEffect(() => {
    if (chosen)
      document
        .getElementById("mentor-lesson-" + chosen)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [chosen]);
  async function begin(option) {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    try {
      if (
        await command({
          type: "mentor",
          mentorId: option.mentorId,
          juniorId: option.juniorId,
          trait: option.trait,
        })
      )
        setChosen(null);
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  return (
    <section
      className="gym-mentoring simple-mentoring"
      aria-labelledby="gym-mentoring-title"
    >
      <header className="gym-section-heading">
        <div>
          <span className="career-eyebrow">VETERANS TEACH. FIGHTERS GROW.</span>
          <h2 id="gym-mentoring-title">Learn a veteran’s trait</h2>
          <p>
            A permanent fighting trait, or more time building skills. Choose
            what this fighter needs next.
          </p>
        </div>
      </header>
      <div className="mentor-choice-grid" aria-label="Training or mentoring">
        <article>
          <small>TRAIN</small>
          <h3>Build their skills</h3>
          <p>
            One fighter trains. Grow permanent stats until their ceilings, with
            help from coaches and upgraded rooms.
          </p>
          <Link
            className="career-action secondary"
            to={juniorId ? `/career/gym/training/${juniorId}` : "/career/gym"}
          >
            Go to training
          </Link>
        </article>
        <article>
          <small>MENTOR</small>
          <h3>Learn a lasting trait</h3>
          <p>
            Reserve two fighters for a chance to learn a permanent trait. Their
            skills do not grow during the lesson; readiness recovers.
          </p>
          <span>
            Useful for a long-term keeper or a fighter near their ceilings.
          </span>
        </article>
      </div>
      <p className="mentor-rule">
        Both fighters pause training and career fights. Your other fighters can
        keep earning, and Gym Wars remains available. No lesson fee; normal gym
        upkeep continues. Only End week advances the lesson.
      </p>
      {active.length > 0 && (
        <section className="mentor-active" aria-label="Active mentoring pairs">
          <h3>Lessons in progress</h3>
          {active.map((p) => {
            const m = s.fighters.find((f) => f.id === p.mentorId),
              j = s.fighters.find((f) => f.id === p.juniorId);
            return (
              <article key={p.id}>
                <div className="mentor-pair-art">
                  <Face fighter={m} compact />
                  <span>→</span>
                  <Face fighter={j} compact />
                </div>
                <div>
                  <h3>
                    {j?.name} is learning {label(p.trait)}
                  </h3>
                  <p>
                    With {m?.name} · finishes {calendarDate(s, p.endWeek)}
                  </p>
                  <strong>
                    {Math.round(p.chance * 100)}% chance · both fighters
                    recovering
                  </strong>
                  <p>
                    Completion guarantees +
                    {p.preparation?.value ||
                      s.rules.mentoring?.preparationValue ||
                      2}{" "}
                    {p.preparation?.stat
                      ? label(p.preparation.stat).toLowerCase() + " "
                      : ""}
                    preparation for the learner’s next career bout. Trait
                    mastery is separate.
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      )}
      <div className="mentor-lessons" aria-label="Available mentoring lessons">
        {(showAll ? options : options.slice(0, 6)).map((o) => {
          const mentor = team.find((f) => f.id === o.mentorId),
            junior = team.find((f) => f.id === o.juniorId),
            id = o.mentorId + ":" + o.juniorId + ":" + o.trait;
          return (
            <article
              key={id}
              id={"mentor-lesson-" + id}
              className="mentor-lesson"
            >
              <div className="mentor-pair-art">
                <Face fighter={mentor} compact />
                <span>→</span>
                <Face fighter={junior} compact />
              </div>
              <div className="mentor-lesson-body">
                <small>
                  {mentor.name} teaches {junior.name}
                </small>
                <h3>{label(o.trait)}</h3>
                {(o.traitKind === "situational" ||
                  ["fast-starter", "slow-starter"].includes(o.trait)) && (
                  <strong className="mentor-situational">
                    Situational · changes how they fight
                  </strong>
                )}
                <p>
                  {o.effect ||
                    s.rules.transferableTraits?.[o.trait]?.effect ||
                    s.rules.traits[o.trait]}
                </p>
                {(o.bestFor ||
                  s.rules.transferableTraits?.[o.trait]?.bestFor) && (
                  <p className="mentor-best-for">
                    Best for:{" "}
                    <strong>
                      {o.bestFor || s.rules.transferableTraits[o.trait].bestFor}
                    </strong>
                  </p>
                )}
                <div className="mentor-terms">
                  <strong>{o.weeks} weeks</strong>
                  <strong>{Math.round(o.chance * 100)}% trait mastery</strong>
                  <span>
                    {o.compatible === false
                      ? "Different style families"
                      : "Same style family"}
                  </span>
                </div>
                {o.preparation && (
                  <p className="design-lesson-payoff">
                    Guaranteed on completion: +{o.preparation.value}{" "}
                    {label(o.preparation.stat).toLowerCase()} for the learner’s
                    next career bout, even without trait mastery. Use within{" "}
                    {o.preparation.expiresAfterWeeks} weeks. This does not apply
                    to Gym Wars.
                  </p>
                )}
                {o.trainingAlternative && (
                  <div className="mentor-training-alternative">
                    <div>
                      <small>TRAIN INSTEAD</small>
                      <p>
                        About{" "}
                        <strong>
                          +{o.trainingAlternative.estimatedTotalGrowth} total
                          stat points
                        </strong>{" "}
                        spread across four skills over {o.weeks} weeks. Estimate
                        for balanced training; ceilings can limit growth.
                      </p>
                    </div>
                    <Link
                      className="career-action secondary"
                      to={`/career/gym/training/${junior.id}`}
                    >
                      Train {junior.name.split(" ")[0]}
                    </Link>
                  </div>
                )}
                {o.budget && (
                  <p
                    className={
                      o.budget.funded ? "mentor-budget" : "career-warning"
                    }
                  >
                    Gym upkeep: {money(o.budget.commitmentCost)} for this lesson
                    · {money(o.budget.availableCash)} available
                    {o.budget.bookedShowIncome > 0
                      ? `, including ${money(o.budget.bookedShowIncome)} booked show income`
                      : ""}
                    .
                    {!o.budget.funded
                      ? ` Budget short by ${money(o.budget.shortfall)}. Arrange fight income; running out of cash interrupts the lesson.`
                      : ""}
                  </p>
                )}
                {o.blockedReason ? (
                  <div className="mentor-blocked">
                    <p>{o.blockedReason}</p>
                    {alternative(o) && (
                      <Action
                        secondary
                        disabled={disabled || working}
                        onClick={() => {
                          setShowAll(true);
                          setChosen(
                            alternative(o).mentorId +
                              ":" +
                              alternative(o).juniorId +
                              ":" +
                              alternative(o).trait,
                          );
                        }}
                      >
                        Choose{" "}
                        {
                          team.find((f) => f.id === alternative(o).juniorId)
                            ?.name
                        }{" "}
                        for this lesson
                      </Action>
                    )}
                  </div>
                ) : chosen === id ? (
                  <div
                    className="mentor-confirm"
                    role="group"
                    aria-label="Confirm mentoring lesson"
                  >
                    <p>
                      <b>
                        {mentor.name} and {junior.name}
                      </b>{" "}
                      cannot train or take career fights until{" "}
                      {calendarDate(s, s.week + o.weeks)}. Your gym still costs{" "}
                      {money(s.weeklyCost)} each week:{" "}
                      {money(s.weeklyCost * o.weeks)} over this lesson.{" "}
                      {o.preparation
                        ? `Completion guarantees +${o.preparation.value} ${label(o.preparation.stat).toLowerCase()} preparation; `
                        : ""}
                      trait mastery grants {label(o.trait)}.
                    </p>
                    {team.filter(
                      (fighter) =>
                        ![o.mentorId, o.juniorId].includes(fighter.id) &&
                        !fighter.camp &&
                        !fighterPair(s, fighter),
                    ).length === 0 && (
                      <p className="career-warning">
                        Every available fighter will be committed. Keep enough
                        cash for the lesson; they cannot earn career purses
                        during it.
                      </p>
                    )}
                    <Action
                      disabled={disabled || working}
                      onClick={() => begin(o)}
                    >
                      Start lesson
                    </Action>
                    <Action
                      secondary
                      disabled={disabled || working}
                      onClick={() => setChosen(null)}
                    >
                      Cancel
                    </Action>
                  </div>
                ) : (
                  <Action
                    disabled={disabled || working || !o.canStart}
                    onClick={() => setChosen(id)}
                  >
                    Choose lesson
                  </Action>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!options.length && (
        <div className="mentor-empty">
          <h3>No lesson available yet</h3>
          <p>
            You need a veteran aged 30+ with a known trait, and another fighter
            to learn it.
          </p>
          <Link to="/career/gym">Back to training</Link>
        </div>
      )}
      {options.length > 6 && (
        <Action secondary onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show recommended lessons" : "Show all lessons"}
        </Action>
      )}
      {!team.some((f) => f.age >= 30 && f.discoveredTraits.length) && (
        <VeteranOpportunity
          s={s}
          team={team}
          command={command}
          disabled={disabled}
          onSigned={() => setChosen(null)}
        />
      )}
    </section>
  );
}

export default function CareerGym({
  s,
  revision,
  command,
  disabled,
  openFighter,
  onTraining,
  onReviewWeek,
  section,
  juniorId,
  savedFighterId,
}) {
  const mentoringRef = useRef(null);
  const navigate = useNavigate();
  const area = ["staff", "facilities", "mentoring", "history"].includes(section)
    ? section
    : "training";
  const team = s.fighters.filter((f) => !f.retired && !f.released),
    facility = s.rules.facilities[s.facilityTier];
  const idle = team.filter(
    (f) =>
      !f.camp &&
      !fighterPair(s, f) &&
      !["ready", "live"].includes(fighterBout(s, f)?.status),
  );
  const training = team.filter((f) => !!f.camp).length;
  const savedFighter = team.find(
    (f) =>
      f.id === savedFighterId &&
      f.camp?.completed === 0 &&
      f.camp.startedWeek === s.week,
  );
  const mentorScroll = () => navigate("/career/gym/mentoring");
  return (
    <div className="gym-hub" data-area={area}>
      <header
        className={`gym-home-hero gym-illustrated-hero${area === "training" ? " gym-floor-hero" : ""}`}
      >
        <div className="gym-hero-copy">
          <span className="career-eyebrow">
            GYM TIER {s.facilityTier} /{" "}
            {s.gymDevelopment?.maxTier || s.rules.facilities.length - 1} ·{" "}
            {calendarDate(s)}
          </span>
          <h2>{s.name || "Your gym"}</h2>
          <p>{facility.name} · Train the team. Build the club.</p>
          <nav className="gym-area-tabs" aria-label="Gym areas">
            {[
              ["training", "Training floor"],
              ["staff", "Staff"],
              ["facilities", "Expansion"],
              ["mentoring", "Mentoring"],
              ["history", "History"],
            ].map(([key, name]) => (
              <Link
                key={key}
                aria-current={area === key ? "page" : undefined}
                to={key === "training" ? "/career/gym" : `/career/gym/${key}`}
              >
                {name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="gym-hero-illustration">
          <img
            src={gymEnvironment(s.facilityTier)}
            alt={`${facility.name}: your fighters’ home gym`}
            width="1600"
            height="900"
            fetchPriority="high"
          />
          {s.shopIdentity && (
            <ClubFlag
              look={s.shopIdentity}
              name={s.name}
              className="shop-gym-flag"
            />
          )}
        </div>
        <div className="gym-hero-stats">
          <span>
            <strong>
              {team.length} / {facility.slots}
            </strong>
            Fighters
          </span>
          <span>
            <strong>{training}</strong>In camp
          </span>
          <span>
            <strong>{money(s.weeklyCost)}</strong>Gym costs / week
          </span>
          <span>
            <strong>{s.legacy}</strong>Career reputation
          </span>
        </div>
      </header>
      <section
        id="gym-training-floor"
        className="gym-training-floor"
        aria-labelledby="gym-training-title"
      >
        {savedFighter && (
          <div className="gym-saved-camp" role="status">
            <div>
              <strong>{savedFighter.name}’s camp is saved.</strong>
              <p>
                Time has not moved. Set another fighter’s camp, then press End
                week when you’re ready.
              </p>
            </div>
          </div>
        )}
        <header className="gym-section-heading">
          <div>
            <span className="career-eyebrow">BUILD YOUR FIGHTERS</span>
            <h2 id="gym-training-title">The training floor</h2>
            <p>
              Set each fighter’s work here. Everyone trains or rests when you
              press End week.
            </p>
          </div>
          {team.length > 0 && (
            <Action
              disabled={disabled}
              onClick={() =>
                onTraining(
                  (
                    team.find((f) => f.camp?.needsReview) ||
                    team.find((f) => f.camp) ||
                    team[0]
                  ).id,
                )
              }
            >
              Open training
            </Action>
          )}
        </header>
        <ol className="gym-training-steps" aria-label="How training works">
          <li>
            <b>1</b>
            <span>Choose a fighter</span>
          </li>
          <li>
            <b>2</b>
            <span>Build their camp</span>
          </li>
          <li>
            <b>3</b>
            <span>End week · see the gains</span>
          </li>
        </ol>
        {idle.length > 0 && (
          <div className="gym-idle-callout">
            <span aria-hidden="true">↗</span>
            <div>
              <strong>
                {idle.length}{" "}
                {idle.length === 1 ? "fighter is" : "fighters are"} resting.
              </strong>
              <p>Choose Train to build skills. Rest restores readiness.</p>
            </div>
          </div>
        )}
        <div className="gym-team-grid">
          {team.map((f) => (
            <TeamCard
              key={f.id}
              s={s}
              f={f}
              disabled={disabled}
              openFighter={openFighter}
              onTraining={onTraining}
              onMentoring={mentorScroll}
            />
          ))}
          {team.length < facility.slots && (
            <Link className="gym-empty-slot" to="/career/scouting">
              <span aria-hidden="true">+</span>
              <strong>Room for the next contender</strong>
              <p>
                {facility.slots - team.length} open roster{" "}
                {facility.slots - team.length === 1 ? "place" : "places"}
              </p>
              <b>Scout a fighter</b>
            </Link>
          )}
        </div>
        <TeamTraining s={s} team={team} command={command} disabled={disabled} />
      </section>
      <section
        id="gym-staff"
        className="gym-staff-section"
        aria-labelledby="gym-staff-title"
      >
        <header className="gym-section-heading">
          <div>
            <span className="career-eyebrow">
              BUILD THE TEAM BEHIND THE TEAM
            </span>
            <h2 id="gym-staff-title">Your staff</h2>
            <p>Hire a specialist, then develop their rank as your gym grows.</p>
          </div>
        </header>
        <div className="gym-staff-grid">
          {Object.keys(s.rules.staff).map((role) => (
            <StaffCard
              key={role}
              s={s}
              role={role}
              command={command}
              disabled={disabled}
            />
          ))}
        </div>
      </section>
      <CareerDevelopment
        s={s}
        revision={revision}
        command={command}
        disabled={disabled}
      />
      <div id="gym-mentoring" ref={mentoringRef}>
        <Mentoring
          s={s}
          team={team}
          command={command}
          disabled={disabled}
          juniorId={juniorId}
        />
      </div>
      <section id="gym-history" className="gym-history">
        <header className="gym-history-header">
          <h2>Gym history</h2>
          <p>Your past fighters and recent gym events.</p>
        </header>
        <div className="gym-history-content">
          <section>
            <h3>Hall of Fame</h3>
            {s.fighters.filter((f) => f.retired).length ? (
              s.fighters
                .filter((f) => f.retired)
                .map((f) => (
                  <button
                    type="button"
                    className="gym-hall-fighter"
                    key={f.id}
                    onClick={() => openFighter(f.id)}
                  >
                    <Face fighter={f} compact />
                    <span>
                      <strong>{f.name}</strong>
                      <small>
                        {f.record.wins}W / {f.record.losses}L ·{" "}
                        {f.championships.length} title reigns
                      </small>
                    </span>
                    <b></b>
                  </button>
                ))
            ) : (
              <p>The careers you build will live here.</p>
            )}
          </section>
          <section>
            <h3>Gym journal</h3>
            {[...s.journal]
              .reverse()
              .slice(0, 12)
              .map((e, i) => (
                <p key={i}>
                  <small>{calendarDate(s, e.week)}</small> ·{" "}
                  {calendarText(s, e.text)}
                </p>
              ))}
          </section>
        </div>
      </section>
    </div>
  );
}
