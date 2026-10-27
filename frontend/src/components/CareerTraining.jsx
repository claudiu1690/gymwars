import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Action, Face } from "./CareerControls";
import SignatureBadge from "./SignatureBadge";
import { Ico } from "./Icons";
import { useTrainingDraft } from "../TrainingDraftContext";
import { assignmentFor } from "../careerAssignment.mjs";
import { calendarDate } from "../careerCalendar.mjs";
import {
  allocationStatus,
  distributeRemainder,
  campLengths,
  fightPreparationPlan,
  campEndReadiness,
  campTitle,
  fighterBout,
  fighterPair,
  gymWeekPreview,
  matchupMessage,
  planIdentity,
  planProblem,
  preparationValue,
  preparationTimeline,
  readiness,
  skillLabel,
  trainingChoices,
  trainingSkills,
} from "../trainingPlans.mjs";
import "./training-workspace.css";
import "./training-duration.css";
import "./club-environments.css";
import { roomIllustration } from "../gymEnvironments.mjs";

const money = (n) => "$" + n.toLocaleString("en-US");
const weeksText = (n) => `${n} ${n === 1 ? "week" : "weeks"}`;
const plus = (n = 0) => `${n > 0 ? "+" : ""}${n}`;
const round = (n) => Math.round(n * 10) / 10;
const roomArt = {
  balanced: roomIllustration("starter", true),
  pressure: roomIllustration("striking", true),
  defense: roomIllustration("grappling", true),
  recover: roomIllustration("recovery", true),
  combinations: roomIllustration("striking", true),
  submissions: roomIllustration("grappling", true),
  "gas-tank": roomIllustration("conditioning", true),
};
const trainingArt = (preset) => roomArt[preset] || roomArt.balanced;
const glyphs = {
  defense: "M12 3l8 3v6c0 5-8 9-8 9S4 17 4 12V6z",
  pressure: "M13 2L4 14h7l-1 8 10-13h-7z",
  balanced: "M4 7h16M4 12h16M4 17h16M8 4v6M16 9v6M10 14v6",
  recover:
    "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8",
  combinations: "M3 8h6l3 4-3 4H3M13 4h5l3 4-3 4h-5M13 16h5l3 4h-8",
  submissions:
    "M7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM17 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM9 9l6 6M4 17l4-4 4 3M12 8l4 3 4-4",
  "gas-tank": "M7 4h10v16H7zM10 1h4M10 8h4M10 12h4M10 16h4",
  custom: "M4 7h16M4 17h16M8 4v6M16 14v6",
};

function readDraft(key, s, f) {
  try {
    const saved = key && JSON.parse(sessionStorage.getItem(key));
    if (!saved || saved.week !== s.week || f.camp || fighterPair(s, f))
      return {};
    const weeks = campLengths(s, f).includes(saved.weeks) ? saved.weeks : 1;
    const custom =
      saved.custom &&
      s.rules.presets[saved.custom.preset] &&
      trainingSkills.every((k) =>
        Number.isFinite(saved.custom.allocations?.[k]),
      )
        ? {
            ...saved.custom,
            ...planIdentity[saved.custom.preset],
            id: "custom",
            type: "camp",
            title: "Custom training",
            weeks,
          }
        : null;
    const valid =
      saved.selected === "custom"
        ? !!custom
        : trainingChoices(s, f, weeks).some((p) => p.id === saved.selected);
    return {
      weeks,
      custom,
      selected: valid ? saved.selected : null,
      edited: !!saved.edited,
    };
  } catch {
    return {};
  }
}

function memberStatus(s, f) {
  return assignmentFor(s, f).label;
}

function SkillGains({ gains, before, label }) {
  return (
    <dl className="tw-skills" aria-label={label}>
      {trainingSkills.map((key) => (
        <div key={key}>
          <dt>{skillLabel(key)}</dt>
          <dd className={gains?.[key] < 0 ? "tw-loss" : ""}>
            {gains ? plus(gains[key] || 0) : "…"}
            {before && gains && (
              <small>
                {before[key]} → {round(before[key] + (gains[key] || 0))}
              </small>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TeamImpact({ s, f, preview }) {
  if (s.blocking)
    return (
      <div className="tw-team-impact tw-time-paused">
        <div>
          <strong>Time paused</strong>
          <span>{calendarDate(s)}</span>
        </div>
        <p>
          {s.fights.some((bout) => ["ready", "live"].includes(bout.status))
            ? "Finish fight night before playing the next week."
            : "Complete the camp check-in before playing the next week."}
        </p>
      </div>
    );
  return (
    <div className="tw-team-impact">
      <div>
        <strong>When you end the week</strong>
        <span>
          {calendarDate(s)} → {calendarDate(s, preview.endWeek)} ·{" "}
          {money(preview.cost)} gym costs
        </span>
      </div>
      <p>
        {preview.fighters
          .filter((member) => member.id !== f.id)
          .map(
            (member) =>
              `${member.name.split(" ")[0]} ${member.assignment === "training" ? "trains" : member.assignment === "mentoring" ? "continues mentoring" : "rests"}`,
          )
          .join(" · ") || "Gym running costs are charged once each week."}
      </p>
      {preview.waived > 0 && (
        <p className="tw-warning">
          Funds run out this week. Unfunded training and mentoring stop;
          fighters recover instead.
        </p>
      )}
    </div>
  );
}

function CustomPlan({ s, custom, setCustom, locked }) {
  const allocation = allocationStatus(custom.allocations);
  return (
    <section className="tw-custom" aria-label="Custom training allocations">
      <h3>Make it your camp</h3>
      <p>Choose the fight bonus, then divide your training time.</p>
      <div
        className="tw-focus"
        role="group"
        aria-label="Custom preparation focus"
      >
        {Object.entries(s.rules.presets)
          .filter(
            ([id, preset]) =>
              !preset.departmentId || s.presetOptions?.[id]?.available,
          )
          .map(([id, preset]) => (
            <button
              type="button"
              key={id}
              disabled={locked}
              aria-pressed={custom.preset === id}
              onClick={() =>
                setCustom({
                  ...custom,
                  ...planIdentity[id],
                  title: "Custom training",
                  preset: id,
                  allocations: { ...custom.allocations },
                })
              }
            >
              {planIdentity[id]?.stat
                ? `+${preparationValue(s, id)} ${skillLabel(planIdentity[id].stat)}`
                : "No fight bonus"}
              <small>{planIdentity[id]?.title || preset.name}</small>
            </button>
          ))}
      </div>
      <div className="tw-allocation-heading">
        <strong>Training time</strong>
        <b className={!allocation.valid ? "tw-loss" : ""}>
          {allocation.total ?? "—"} / 100%
        </b>
      </div>
      <div className="tw-allocation-sliders">
        <p className="tw-budget" role="status">
          {allocation.total <= 100
            ? 100 - allocation.total + "% available"
            : allocation.total - 100 + "% over budget"}
          {" · "}Changing the bonus keeps your allocation.
        </p>
        {trainingSkills.map((key) => (
          <label key={key}>
            <span>
              {skillLabel(key)} <strong>{custom.allocations[key]}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={custom.allocations[key]}
              disabled={locked}
              aria-label={`${skillLabel(key)} training allocation`}
              onChange={(event) =>
                setCustom({
                  ...custom,
                  allocations: {
                    ...custom.allocations,
                    [key]: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        ))}
      </div>
      <p role="status" className={!allocation.valid ? "tw-warning" : ""}>
        {allocation.message}
      </p>
      <div className="tw-custom-footer">
        <small>Below 10% in a skill causes a small decline.</small>
        {allocation.total < 100 && (
          <button
            type="button"
            className="tw-text-button"
            disabled={locked}
            onClick={() =>
              setCustom({
                ...custom,
                allocations: distributeRemainder(custom.allocations),
              })
            }
          >
            Distribute remaining {100 - allocation.total}%
          </button>
        )}
        <button
          type="button"
          className="tw-text-button"
          disabled={locked}
          onClick={() =>
            setCustom({
              ...custom,
              allocations: { ...s.rules.presets[custom.preset].allocations },
            })
          }
        >
          Use preset allocation
        </button>
      </div>
    </section>
  );
}

export function CampPlanner({
  s,
  f,
  revision,
  command,
  disabled,
  onBook,
  onFight,
  onTraining,
  onBrief,
  onWeekResults,
  reviewIntent = "saved",
}) {
  const { gym } = useAuth();
  const { setDraft: publishDraft } = useTrainingDraft();
  const gymId = gym?._id || gym?.id;
  const draftKey = gymId ? `gw-camp-draft:${gymId}:${f.id}` : null;
  const queued = !!f.camp && f.camp.completed === 0;
  const savedCustom =
    queued && campTitle(s, f.camp) === "Custom training"
      ? {
          ...planIdentity[f.camp.preset],
          ...f.camp,
          id: "custom",
          type: "camp",
          title: "Custom training",
        }
      : null;
  const [draft] = useState(() => readDraft(draftKey, s, f));
  // Show the saved rest plan first. Camps become previews only after a choice.
  const initialChoice = "recover";
  const [draftWeeks, setWeeks] = useState(draft.weeks || 1);
  const weeks = queued ? f.camp.weeks : draftWeeks;
  const [draftSelected, setSelected] = useState(
    draft.edited ? draft.selected || initialChoice : initialChoice,
  );
  const selected = queued
    ? savedCustom
      ? "custom"
      : f.camp.preset
    : draftSelected;
  const [draftCustom, setCustomState] = useState(draft.custom || null);
  const custom = queued ? savedCustom : draftCustom;
  const [draftEdited, setEdited] = useState(!!draft.edited);
  const edited = queued || draftEdited;
  const setCustom = (value) => {
    setEdited(true);
    setCustomState(value);
  };
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [forecast, setForecast] = useState(null);
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const restoredKey = useRef(draftKey);
  const draftWeek = useRef(s.week);
  const beforeWeek = useRef(s.week);
  const summaryRef = useRef(null);
  const b = fighterBout(s, f);
  const pair = fighterPair(s, f);
  const opponent = b && s.rivals.find((rival) => rival.id === b.opponentId);
  const locked = disabled || working;
  const planLocked = locked || queued;
  const choices = trainingChoices(s, queued ? { ...f, camp: null } : f, weeks);
  const chosen = queued
    ? {
        ...planIdentity[f.camp.preset],
        id: savedCustom ? "custom" : f.camp.preset,
        type: "camp",
        title: campTitle(s, f.camp),
        preset: f.camp.preset,
        allocations: f.camp.allocations,
        weeks: f.camp.weeks,
        stat:
          f.camp.preset === "balanced"
            ? f.camp.scheduleVersion >= 2 &&
              f.camp.weeks > 1 &&
              f.camp.commitmentBonus > 0
              ? "conditioning"
              : null
            : planIdentity[f.camp.preset]?.stat,
      }
    : selected === "custom" && custom
      ? {
          ...custom,
          weeks,
          stat:
            custom.preset === "balanced" &&
            weeks > 1 &&
            s.rules.campCompletionBonus?.[weeks] > 0
              ? "conditioning"
              : custom.stat,
        }
      : choices.find((choice) => choice.id === selected) || null;
  const problem = queued ? "" : planProblem(s, f, chosen);
  const due = s.fights.find((bout) => ["ready", "live"].includes(bout.status));
  const review = s.fighters.find(
    (fighter) =>
      !fighter.retired && !fighter.released && fighter.camp?.needsReview,
  );
  const available =
    !f.camp &&
    !pair &&
    !f.retired &&
    !f.released &&
    (!b || b.status === "scheduled");
  const knownCeilings = trainingSkills.filter(
    (key) => f.growthKnowledge?.[key]?.plateau,
  );
  const atCeiling = knownCeilings.filter(
    (key) => f.stats[key] >= f.growthKnowledge[key].observedAt - 0.1,
  );
  const preview = gymWeekPreview(s, f, available ? chosen : null, false);
  const ownPreview = preview.fighters.find((member) => member.id === f.id);
  const hasResult =
    s.lastAdvance?.week === s.week &&
    s.lastAdvance.fighters?.some((member) => member.id === f.id);

  useEffect(() => {
    if (!draftKey) return;
    if (restoredKey.current !== draftKey) {
      restoredKey.current = draftKey;
      const saved = readDraft(draftKey, s, f);
      setWeeks(saved.weeks || 1);
      setSelected(
        saved.edited ? saved.selected || initialChoice : initialChoice,
      );
      setCustomState(saved.custom || null);
      setEdited(!!saved.edited);
      return;
    }
    try {
      if (draftWeek.current !== s.week || f.camp || pair) {
        sessionStorage.removeItem(draftKey);
        draftWeek.current = s.week;
      } else
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({ week: s.week, weeks, selected, custom, edited }),
        );
    } catch {
      /* Storage is optional; the server remains authoritative. */
    }
  }, [draftKey, s.week, !!f.camp, !!pair, weeks, selected, custom, edited]);

  useEffect(() => {
    if (beforeWeek.current === s.week) return;
    beforeWeek.current = s.week;
    setNotice("");
    if (!f.camp && !pair) {
      setSelected("recover");
      setWeeks(1);
      setEdited(false);
    }
  }, [s.week, !!f.camp, !!pair]);

  const forecastKey = JSON.stringify({
    revision,
    fighterId: f.id,
    weeks: chosen?.weeks,
    allocations: chosen?.allocations,
    preset: chosen?.preset,
  });
  const needsForecast = available && chosen?.type === "camp" && !problem;
  useEffect(() => {
    if (!needsForecast) return;
    const controller = new AbortController();
    let active = true;
    const params = JSON.parse(forecastKey);
    const timer = setTimeout(async () => {
      try {
        const value = await api("/career/forecast", {
          method: "POST",
          body: {
            fighterId: params.fighterId,
            weeks: params.weeks,
            allocations: params.allocations,
          },
          signal: controller.signal,
        });
        if (active) setForecast({ key: forecastKey, value });
      } catch (error) {
        if (active) setForecast({ key: forecastKey, error: error.message });
      }
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [forecastKey, needsForecast, retry]);
  const freshForecast = queued
    ? { value: f.forecast }
    : forecast?.key === forecastKey
      ? forecast
      : null;
  const canAssign =
    chosen?.type === "camp" && !problem && !!freshForecast?.value;
  const assignDraft = useRef(null);
  assignDraft.current = () => act("camp");
  const draftSignature =
    available && edited && chosen?.type === "camp"
      ? JSON.stringify({
          fighterId: f.id,
          week: s.week,
          preset: chosen.preset,
          weeks,
          allocations: chosen.allocations,
          canAssign,
          locked,
        })
      : "";
  useEffect(() => {
    publishDraft(
      draftSignature
        ? {
            key: draftSignature,
            fighterId: f.id,
            name: f.name,
            title: chosen.title,
            canAssign: canAssign && !locked,
            onAssign: () => assignDraft.current?.(),
          }
        : null,
    );
    return () => publishDraft(null);
  }, [draftSignature]);
  const timeline = preparationTimeline(
    s,
    f,
    chosen?.type === "camp" ? weeks : 0,
    chosen?.type === "camp",
  );
  const savedBonus = queued
    ? (planIdentity[f.camp.preset]?.stat
        ? preparationValue(s, f.camp.preset)
        : 0) + (f.camp.commitmentBonus || 0)
    : null;
  const fightPlan = fightPreparationPlan(s, f);
  const priorPreparation =
    f.preparation && f.preparation.expiresWeek >= s.week ? f.preparation : null;
  const newPreparation =
    chosen?.type === "camp" && chosen.stat
      ? (savedBonus ?? preparationValue(s, chosen.preset, weeks))
      : 0;
  const usefulGrowth =
    freshForecast?.value &&
    trainingSkills.some(
      (skill) => freshForecast.value.estimatedGains?.[skill] > 0,
    );
  const samePreparation =
    (!b || priorPreparation?.expiresWeek >= b.eventWeek) &&
    priorPreparation?.stat === chosen?.stat &&
    priorPreparation?.value === newPreparation;
  const completionBonus = queued
    ? f.camp.commitmentBonus || 0
    : s.rules.campCompletionBonus?.[weeks] || 0;

  async function act(type, extra = {}, intent = "") {
    if (submitting.current || locked) return;
    if (type === "camp" && !canAssign) return;
    submitting.current = true;
    setWorking(true);
    setNotice("");
    try {
      const previousCamp = type === "cancel-camp" ? f.camp : null;
      const campArgs =
        type === "camp"
          ? {
              fighterId: f.id,
              preset: chosen.preset,
              weeks: chosen.weeks,
              allocations: chosen.allocations,
            }
          : {};
      const result = await command(
        { type, ...campArgs, ...extra },
        { trainingFighterId: f.id },
      );
      if (!result) return;
      if (type === "camp") setEdited(false);
      if (type === "cancel-camp" && previousCamp) {
        if (intent === "recover") {
          setSelected("recover");
          setNotice(
            "Camp removed. Your fighter will recover when you press End week.",
          );
        } else {
          setWeeks(previousCamp.weeks);
          const isCustom = campTitle(s, previousCamp) === "Custom training";
          setCustom(
            isCustom
              ? {
                  ...planIdentity[previousCamp.preset],
                  id: "custom",
                  type: "camp",
                  title: "Custom training",
                  preset: previousCamp.preset,
                  weeks: previousCamp.weeks,
                  allocations: { ...previousCamp.allocations },
                }
              : null,
          );
          setSelected(isCustom ? "custom" : previousCamp.preset);
          setNotice("Choose a new camp. Time has not moved.");
        }
      }
      if (type === "camp-review") {
        if (extra.choice === "taper") {
          setSelected("recover");
          setNotice(
            "Camp finished early. Earned skill gains stay. Your fighter will recover when you press End week.",
          );
        } else
          setNotice("Camp continues. Press End week when your team is ready.");
      }
    } finally {
      submitting.current = false;
      setWorking(false);
    }
  }
  const setChoice = (id) => {
    setEdited(true);
    setSelected(id);
    setNotice("");
    if (id === "custom" && !custom) {
      const preset = chosen?.preset || "balanced";
      setCustom({
        ...planIdentity[preset],
        id: "custom",
        type: "camp",
        title: "Custom training",
        preset,
        weeks,
        allocations: { ...s.rules.presets[preset].allocations },
      });
    }
  };
  const block =
    s.blocking && (!f.camp?.needsReview || due) ? (
      <aside className="tw-blocker" role="status">
        <div>
          <strong>
            {due ? "Fight night comes first" : "A teammate needs your decision"}
          </strong>
          <p>{s.blocking}</p>
        </div>
        <Action
          secondary
          disabled={locked}
          onClick={() =>
            due ? onFight(due.id) : review && onTraining(review.id)
          }
        >
          {due
            ? "Go to fight night"
            : `Review ${review?.name.split(" ")[0]}’s camp`}
        </Action>
      </aside>
    ) : null;
  return (
    <div className={`training-workspace${queued ? " tw-has-assignment" : ""}`}>
      <nav className="tw-breadcrumb" aria-label="Training navigation">
        <Link to="/career/gym">Gym</Link>
        <span>/ Training</span>
      </nav>
      {s.fighters.filter((fighter) => !fighter.retired && !fighter.released)
        .length > 1 && (
        <div
          className="tw-team"
          role="group"
          aria-label="Choose a fighter to train"
        >
          {s.fighters
            .filter((fighter) => !fighter.retired && !fighter.released)
            .map((fighter) => (
              <button
                type="button"
                key={fighter.id}
                aria-pressed={fighter.id === f.id}
                disabled={locked}
                onClick={() => fighter.id !== f.id && onTraining(fighter.id)}
              >
                <Face fighter={fighter} compact />
                <span>
                  <strong>{fighter.name}</strong>
                  <small>
                    {memberStatus(s, fighter)} · {readiness(fighter)}% ready
                  </small>
                </span>
              </button>
            ))}
        </div>
      )}
      <header className="tw-heading tw-room-heading">
        <div className="tw-selected-fighter">
          <SignatureBadge fighter={f} definitions={s.rules.signatures} />
          <Face fighter={f} compact />
          <div>
            <span className="tw-eyebrow">TRAINING FLOOR</span>
            <h2>{f.name}</h2>
            <p>
              {f.camp
                ? queued
                  ? `${campTitle(s, f.camp)} assigned · starts when you end the week`
                  : `${campTitle(s, f.camp)} · ${f.camp.completed} of ${f.camp.weeks} weeks played`
                : pair
                  ? "Mentoring in progress"
                  : "Rest & recover is set. Choose training if you want to change it."}
            </p>
          </div>
        </div>
        <div className="tw-condition">
          <strong>{readiness(f)}%</strong>
          <span>Readiness</span>
          <meter
            value={readiness(f)}
            min="0"
            max="100"
            aria-label="Current readiness"
          />
        </div>
      </header>
      <div className="tw-assignment-state" role="status">
        <strong>This week: {assignmentFor(s, f).label}</strong>
        <span>{assignmentFor(s, f).detail}</span>
      </div>
      {knownCeilings.length > 0 && !f.retired && !f.released && (
        <section className="tw-ceilings" aria-label="Known training ceilings">
          <div>
            <span className="tw-eyebrow">YOUR FIGHTER’S DEVELOPMENT</span>
            <h3>
              {atCeiling.length === trainingSkills.length
                ? "Skills at their training ceilings"
                : "Know where growth stops"}
            </h3>
            <p>
              These limits were discovered in training. More weeks or a stronger
              coach won’t raise them.
            </p>
          </div>
          <dl>
            {knownCeilings.map((key) => (
              <div key={key}>
                <dt>{skillLabel(key)}</dt>
                <dd>
                  {f.stats[key]} / {round(f.growthKnowledge[key].observedAt)}{" "}
                  <small>known ceiling</small>
                </dd>
              </div>
            ))}
          </dl>
          <p>
            {atCeiling.length === trainingSkills.length
              ? "Train for a career fight bonus, refine Gym Wars tactics, or scout a fighter with room to develop."
              : "Choose a skill with room to grow. A capped skill can still earn a career fight bonus."}
          </p>
          <div className="tw-ceiling-actions">
            <Link to="/career/gym-wars?tab=team">Gym Wars tactics</Link>
            <Link to="/career/scouting">Scout new talent</Link>
          </div>
        </section>
      )}
      {opponent && (
        <div className="tw-opponent">
          <div>
            <Face fighter={opponent} compact />
            <div className="tw-opponent-name">
              <span>BOOKED FIGHT</span>
              <strong>vs {opponent.name}</strong>
              <small>
                {calendarDate(s, b.eventWeek)} ·{" "}
                {b.eventWeek <= s.week
                  ? "Fight this week"
                  : `${b.eventWeek - s.week} ${b.eventWeek - s.week === 1 ? "week" : "weeks"} away`}
              </small>
            </div>
          </div>
          <section className="tw-details">
            <h4>Compare skills · you vs opponent</h4>
            <p>{matchupMessage(f, opponent)}</p>
            <div className="tw-matchup">
              {trainingSkills.map((skill) => (
                <span key={skill}>
                  {skillLabel(skill)}{" "}
                  <strong>
                    {f.stats[skill]} vs {opponent.stats[skill]}
                  </strong>
                </span>
              ))}
            </div>
            {onBrief && (
              <button
                className="tw-text-button"
                type="button"
                onClick={() => onBrief(b.id)}
              >
                Full fight card
              </button>
            )}
          </section>
        </div>
      )}
      {hasResult && onWeekResults && (
        <div className="tw-result-area">
          <button
            type="button"
            className="tw-text-button tw-result-toggle"
            onClick={onWeekResults}
          >
            View team week results
            <span>{calendarDate(s, s.lastAdvance.week)}</span>
          </button>
        </div>
      )}
      {notice && (
        <p className="tw-notice" role="status">
          {notice}
        </p>
      )}
      {f.retired || f.released ? (
        <section className="tw-panel">
          <h3>This fighter’s training career has ended.</h3>
          <Link to={`/career/fighter/${f.id}`}>View their career</Link>
        </section>
      ) : b && ["ready", "live"].includes(b.status) ? (
        <section className="tw-panel tw-fight-ready">
          <span className="tw-eyebrow">IT’S FIGHT NIGHT</span>
          <h3>Take it into the ring.</h3>
          <p>
            {f.name} vs {opponent?.name}. Finish this bout before the gym
            calendar can move.
          </p>
          <Action disabled={locked} onClick={() => onFight(b.id)}>
            {b.status === "live" ? "Resume fight" : "Go to fight night"}
          </Action>
        </section>
      ) : f.camp && !queued ? (
        <section className="tw-active" aria-label="Active training">
          <div className="tw-camp-art">
            <img src={trainingArt(f.camp.preset)} alt="" />
            <div>
              <span className="tw-eyebrow">
                {f.camp.needsReview ? "CAMP CHECK-IN" : "ASSIGNED TRAINING"}
              </span>
              <strong>{campTitle(s, f.camp)}</strong>
              <span>
                {f.camp.needsReview
                  ? "Choose how to finish the camp."
                  : "Your fighter trains when you end the week."}
              </span>
            </div>
          </div>
          <div className="tw-active-top">
            <div>
              <span className="tw-eyebrow">
                {f.camp.needsReview
                  ? "MIDPOINT CHECK-IN"
                  : f.camp.completed
                    ? "CAMP IN PROGRESS"
                    : "READY FOR FIRST WEEK"}
              </span>
              <h3>{campTitle(s, f.camp)}</h3>
              <p>
                {f.camp.completed} / {f.camp.weeks} weeks complete · finishes{" "}
                {calendarDate(s, f.camp.endWeek)}
              </p>
            </div>
            <div
              className="tw-week-track"
              aria-label={`${f.camp.completed} of ${f.camp.weeks} camp weeks complete`}
            >
              {Array.from({ length: f.camp.weeks }, (_, index) => (
                <span
                  key={index}
                  className={`${index < f.camp.completed ? "is-complete" : ""} ${f.camp.scheduleVersion >= 2 && f.camp.weeks > 1 && index === f.camp.weeks - 1 ? "tw-track-recovery" : ""}`}
                >
                  {index + 1}
                  {f.camp.scheduleVersion >= 2 &&
                    f.camp.weeks > 1 &&
                    index === f.camp.weeks - 1 && <small>Recover</small>}
                </span>
              ))}
            </div>
          </div>
          <span className="tw-eyebrow">SKILL GAINS EARNED IN THIS CAMP</span>
          <SkillGains gains={f.camp.gains} label="Gains earned so far" />
          {f.camp.stalled?.length > 0 && (
            <p className="tw-warning">
              Growth has stalled in {f.camp.stalled.map(skillLabel).join(", ")};
              other skills can still improve.
            </p>
          )}
          <div className="tw-active-footer">
            <span>
              {planIdentity[f.camp.preset]?.stat
                ? `Finish the camp for +${preparationValue(s, f.camp.preset) + (f.camp.commitmentBonus || 0)} ${skillLabel(planIdentity[f.camp.preset].stat)} in your next eligible fight.`
                : f.camp.scheduleVersion >= 2 &&
                    f.camp.weeks > 1 &&
                    f.camp.commitmentBonus > 0
                  ? `Finish for +${f.camp.commitmentBonus} conditioning preparation. The final week is recovery.`
                  : "This camp develops your allocated skills without a temporary fight bonus."}
            </span>
            <small>Earned gains stay if you finish early.</small>
          </div>
          {f.camp.needsReview ? (
            <div className="tw-midpoint">
              <article>
                <h3>Keep building</h3>
                <p>
                  {f.camp.weeks - f.camp.completed} camp weeks remain. More
                  skill growth and more fatigue
                  {planIdentity[f.camp.preset]?.stat
                    ? ", plus the completion bonus"
                    : ""}
                  .
                </p>
                <Action
                  disabled={locked}
                  onClick={() =>
                    act("camp-review", { fighterId: f.id, choice: "continue" })
                  }
                >
                  Continue camp
                </Action>
              </article>
              <article>
                <h3>Recover sooner</h3>
                <p>
                  Keep the gains above. End the remaining training
                  {planIdentity[f.camp.preset]?.stat
                    ? " and give up this camp’s completion bonus"
                    : " so recovery can begin"}
                  .
                </p>
                <Action
                  secondary
                  disabled={locked}
                  onClick={() =>
                    act("camp-review", { fighterId: f.id, choice: "taper" })
                  }
                >
                  Finish camp early
                </Action>
              </article>
            </div>
          ) : (
            <>
              <TeamImpact s={s} f={f} preview={preview} />
              {block}
              <p className="tw-end-week-guide">
                <Ico d={glyphs.balanced} size={20} />
                <span>
                  Set up the rest of your team, then press{" "}
                  <strong>End week</strong>. Everyone trains or recovers
                  together.
                </span>
              </p>
            </>
          )}
          <section className="tw-details">
            <h4>Training allocation & fight bonus</h4>
            <p>
              {trainingSkills
                .map((key) => `${skillLabel(key)} ${f.camp.allocations[key]}%`)
                .join(" · ")}
            </p>
            <p>
              {planIdentity[f.camp.preset]?.stat
                ? `The completion bonus applies once to the next eligible bout through ${calendarDate(s, f.camp.endWeek + 8)}. It replaces any existing preparation and does not stack.`
                : f.camp.scheduleVersion >= 2 &&
                    f.camp.weeks > 1 &&
                    f.camp.commitmentBonus > 0
                  ? `Completing this camp earns +${f.camp.commitmentBonus} conditioning for your next eligible fight. It replaces earlier preparation.`
                  : "Finishing this camp clears any earlier fight preparation."}
            </p>
          </section>
        </section>
      ) : pair ? (
        <section className="tw-panel">
          <span className="tw-eyebrow">MENTORING</span>
          <h3>A lesson is already underway</h3>
          <p>
            {f.name} can train again after {calendarDate(s, pair.endWeek)}.
            Readiness recovers while the lesson continues.
          </p>
          <TeamImpact s={s} f={f} preview={preview} />
          {block}
          <p className="tw-end-week-guide">
            This lesson continues when you press <strong>End week</strong>.
          </p>
          <Link className="tw-inline-link" to="/career/gym/mentoring">
            View the lesson
          </Link>
        </section>
      ) : (
        <div className="tw-layout">
          <div className="tw-planning">
            <section className="tw-panel">
              <div className="tw-board-title">
                <h3>
                  {queued
                    ? "Your saved training plan"
                    : "Where will they train?"}
                </h3>
                <span>
                  {queued
                    ? "Camp assigned. Change it before playing the first week."
                    : "Choose a camp or let them recover."}
                </span>
                {queued ? (
                  <div className="tw-assignment-actions">
                    <Action
                      secondary
                      disabled={locked}
                      onClick={() => act("cancel-camp", { fighterId: f.id })}
                    >
                      Change camp
                    </Action>
                    <button
                      type="button"
                      className="tw-text-button"
                      disabled={locked}
                      onClick={() =>
                        act("cancel-camp", { fighterId: f.id }, "recover")
                      }
                    >
                      Rest instead
                    </button>
                  </div>
                ) : (
                  chosen?.type === "camp" && (
                    <button
                      type="button"
                      className="tw-text-button tw-inline-review"
                      onClick={() => {
                        summaryRef.current?.scrollIntoView({
                          behavior: window.matchMedia(
                            "(prefers-reduced-motion: reduce)",
                          ).matches
                            ? "auto"
                            : "smooth",
                          block: "start",
                        });
                        summaryRef.current?.focus({ preventScroll: true });
                      }}
                    >
                      Review camp
                    </button>
                  )
                )}
              </div>
              {!queued && available && (fightPlan || f.lastCamp) && (
                <div
                  className="tw-quick-plans"
                  aria-label="Quick training plans"
                >
                  {fightPlan && (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setEdited(true);
                        setCustom(null);
                        setSelected(
                          fightPlan.type === "recover"
                            ? "recover"
                            : fightPlan.id,
                        );
                        if (fightPlan.weeks) setWeeks(fightPlan.weeks);
                      }}
                    >
                      <strong>Prepare for this fight</strong>
                      <span>
                        {fightPlan.reason ||
                          (fightPlan.type === "recover"
                            ? "Recover for fight night"
                            : `${fightPlan.weeks}-week ${fightPlan.title.toLowerCase()} · preview first`)}
                      </span>
                    </button>
                  )}
                  {f.lastCamp &&
                    campLengths(s, f).includes(f.lastCamp.weeks) && (
                      <button
                        type="button"
                        disabled={
                          locked ||
                          !s.presetOptions?.[f.lastCamp.preset]?.available
                        }
                        onClick={() => {
                          setEdited(true);
                          setWeeks(f.lastCamp.weeks);
                          const previous = f.lastCamp;
                          const isCustom =
                            campTitle(s, previous) === "Custom training";
                          setCustom(
                            isCustom
                              ? {
                                  ...planIdentity[previous.preset],
                                  id: "custom",
                                  type: "camp",
                                  title: "Custom training",
                                  preset: previous.preset,
                                  allocations: { ...previous.allocations },
                                }
                              : null,
                          );
                          setSelected(isCustom ? "custom" : previous.preset);
                        }}
                      >
                        <strong>Repeat last plan</strong>
                        <span>
                          {f.lastCamp.weeks} weeks · {campTitle(s, f.lastCamp)}{" "}
                          · preview first
                        </span>
                      </button>
                    )}
                </div>
              )}
              <div
                className="tw-plans"
                role="group"
                aria-label="Training choices"
              >
                {choices
                  .filter((choice) => !s.rules.presets[choice.id]?.departmentId)
                  .map((choice) => (
                    <button
                      type="button"
                      className={`tw-plan ${choice.id === "recover" ? "tw-rest-plan" : ""}`}
                      key={choice.id}
                      disabled={planLocked}
                      aria-pressed={
                        selected === choice.id &&
                        (edited || choice.type === "recover")
                      }
                      data-suggested={
                        !edited &&
                        selected === choice.id &&
                        choice.type !== "recover"
                      }
                      onClick={() => setChoice(choice.id)}
                    >
                      <img
                        className="tw-plan-art"
                        src={trainingArt(choice.id)}
                        alt=""
                      />
                      <strong>{choice.title}</strong>
                      {!edited &&
                        selected === choice.id &&
                        choice.type !== "recover" && (
                          <span className="tw-suggestion">
                            Suggested · not chosen
                          </span>
                        )}
                      {selected === choice.id && choice.type === "recover" && (
                        <span className="tw-suggestion">Current plan</span>
                      )}
                      <span>{choice.purpose}</span>
                      {choice.stat &&
                        f.growthKnowledge?.[choice.stat]?.plateau && (
                          <small className="tw-plateau">
                            {skillLabel(choice.stat)} known ceiling ·
                            preparation still available
                          </small>
                        )}
                      <small>
                        {choice.type === "recover"
                          ? "Readiness ↑ · no new skills"
                          : choice.stat
                            ? `+${preparationValue(s, choice.preset, weeks)} ${skillLabel(choice.stat)} fight bonus`
                            : atCeiling.length === trainingSkills.length
                              ? "Skills at their known ceilings"
                              : "Even growth across all skills"}
                      </small>
                      {selected === choice.id &&
                        (edited || choice.type === "recover") && (
                          <span className="tw-selection-label">Selected</span>
                        )}
                    </button>
                  ))}
                <button
                  type="button"
                  className="tw-plan tw-custom-plan"
                  disabled={planLocked}
                  aria-pressed={edited && selected === "custom"}
                  onClick={() => setChoice("custom")}
                >
                  <Ico d={glyphs.custom} size={25} />
                  <strong>Custom training</strong>
                  <span>Set every skill’s training time</span>
                  <small>Your allocations & fight bonus</small>
                  {edited && selected === "custom" && (
                    <span className="tw-selection-label">Selected</span>
                  )}
                </button>
              </div>
              {selected === "custom" && custom && (
                <CustomPlan
                  s={s}
                  custom={custom}
                  setCustom={setCustom}
                  locked={planLocked}
                />
              )}
            </section>
          </div>
          <aside
            className="tw-summary"
            aria-label="Selected training plan"
            ref={summaryRef}
            tabIndex={-1}
          >
            <span className="tw-eyebrow">
              {queued
                ? "ASSIGNED · TIME PAUSED"
                : chosen?.type === "recover"
                  ? "RESTING THIS WEEK"
                  : "PREVIEW — NOT ASSIGNED"}
            </span>
            <h4>{chosen?.title || "Choose your training"}</h4>
            <p>
              {chosen?.type === "recover"
                ? s.blocking
                  ? "Rest & recover is set. Resolve the paused event, then End week to recover."
                  : "Rest & recover is set. End week restores readiness. Time stays paused until then."
                : `${weeksText(weeks)} · finishes ${calendarDate(s, s.week + weeks)}`}
            </p>
            {chosen?.type === "camp" ? (
              <>
                <div
                  className="tw-duration"
                  role="group"
                  aria-label="Camp duration"
                >
                  {s.rules.campLengths
                    .filter((length) => !queued || length === weeks)
                    .map((length) => {
                      const fits = campLengths(s, f).includes(length);
                      const bonus = queued
                        ? savedBonus
                        : preparationValue(s, chosen.preset, length);
                      return (
                        <button
                          type="button"
                          key={length}
                          aria-label={`${length} ${length === 1 ? "week" : "weeks"} · ${bonus > 0 ? `+${bonus} fight bonus` : atCeiling.length === trainingSkills.length ? "skills at their ceilings" : "permanent growth"}${!fits ? " · past fight date" : ""}`}
                          aria-pressed={weeks === length}
                          disabled={planLocked || !fits}
                          onClick={() => {
                            setEdited(true);
                            setWeeks(length);
                          }}
                        >
                          <span className="tw-duration-length">
                            <strong>{length}</strong>{" "}
                            {length === 1 ? "week" : "weeks"}
                          </span>
                          <small className="tw-duration-payoff">
                            {bonus > 0
                              ? `+${bonus} ${skillLabel(chosen.stat || "conditioning")} for next fight`
                              : atCeiling.length === trainingSkills.length
                                ? "No further skill growth"
                                : "Permanent skill gains"}
                          </small>
                          <small>
                            {!fits
                              ? "Past fight date"
                              : length === 1
                                ? "Quick tune-up"
                                : length <= 3
                                  ? `${length - 1} training · 1 recovery`
                                  : `Review after ${Math.floor(length / 2)} weeks`}
                          </small>
                        </button>
                      );
                    })}
                </div>
                <p className="tw-selected-duration">
                  {weeks === 1
                    ? "One training week"
                    : `${weeks - 1} training ${weeks === 2 ? "week" : "weeks"} · one recovery week`}
                  {completionBonus > 0
                    ? ` · +${completionBonus} commitment bonus included`
                    : " · no extra commitment bonus"}
                </p>
                <p className="tw-hint tw-duration-hint">
                  {chosen.stat
                    ? "Fight bonuses shown are the total earned when the camp finishes. They apply once, within 8 game weeks, and replace the previous camp bonus. "
                    : atCeiling.length === trainingSkills.length
                      ? "Your known skill ceilings still apply to this camp. "
                      : "One-week all-round training focuses on permanent growth. "}
                  {queued && !(f.camp.scheduleVersion >= 2)
                    ? "This saved camp keeps its original training schedule. "
                    : "Camps of 2 or more weeks finish with a recovery week. Two- and three-week camps fit short fight notices; four- and six-week camps earn a commitment bonus. "}
                  Review four- and six-week camps halfway through. Time moves
                  only with End week.
                </p>
                <section
                  className={`tw-growth-preview${freshForecast?.value && !usefulGrowth ? " tw-no-growth" : ""}`}
                  aria-label="Camp growth preview"
                >
                  <strong>
                    {freshForecast?.value && !usefulGrowth
                      ? "No permanent skill gains expected"
                      : "Expected skill gains · full camp"}
                  </strong>
                  <SkillGains
                    gains={freshForecast?.value?.estimatedGains}
                    before={f.stats}
                    label="Estimated permanent gains"
                  />
                  {!!freshForecast?.value?.observedPlateaus?.length && (
                    <p>
                      Known ceilings:{" "}
                      {freshForecast.value.observedPlateaus
                        .map(skillLabel)
                        .join(", ")}
                      .
                    </p>
                  )}
                  {freshForecast?.value && !usefulGrowth && (
                    <>
                      <p>
                        {samePreparation
                          ? "You already have this fight bonus. Rest keeps it until it expires; repeating the camp won’t add permanent growth."
                          : chosen.stat
                            ? "This camp can still earn the career fight bonus below. It won’t increase permanent skills."
                            : "This camp won’t improve permanent skills. Choose another focus or let your fighter recover."}
                      </p>
                      <p>
                        Gym Wars uses permanent skills and saved tactics, not
                        career camp bonuses.
                      </p>
                      <div className="tw-ceiling-actions">
                        {!queued && (
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => setChoice("recover")}
                          >
                            Rest instead
                          </button>
                        )}
                        <Link to="/career/gym-wars?tab=team">
                          Review team tactics
                        </Link>
                      </div>
                    </>
                  )}
                </section>
                {queued ? (
                  <div className="tw-queued-actions">
                    <p className="tw-end-week-guide">
                      <strong>Ready to train.</strong> Press End week when your
                      team is set. No training has happened yet.
                    </p>
                  </div>
                ) : (
                  <>
                    <Action
                      disabled={locked || !canAssign}
                      onClick={() => act("camp")}
                    >
                      {working ? "Assigning…" : `Assign ${weeks}-week camp`}
                    </Action>
                    <p className="tw-action-hint">
                      Preview only. {f.name.split(" ")[0]} will rest until this
                      camp is assigned. End week plays saved plans.
                    </p>
                  </>
                )}
                <div className="tw-summary-stat">
                  <span>Readiness at camp end</span>
                  <strong>
                    {readiness(f)}% → {campEndReadiness(s, f, weeks)}%
                  </strong>
                </div>
                <div className="tw-summary-stat">
                  <span>Current fight preparation</span>
                  <strong>
                    {priorPreparation
                      ? `+${priorPreparation.value} ${skillLabel(priorPreparation.stat)}`
                      : "None"}
                  </strong>
                </div>
                {priorPreparation && (
                  <p className="tw-hint">
                    Expires {calendarDate(s, priorPreparation.expiresWeek)}.
                    {b && priorPreparation.expiresWeek < b.eventWeek
                      ? " This bonus expires before your booked fight."
                      : ""}
                  </p>
                )}
                <div className="tw-summary-bonus">
                  <strong>
                    {chosen.stat
                      ? `+${savedBonus ?? preparationValue(s, chosen.preset, weeks)} ${skillLabel(chosen.stat)} fight bonus`
                      : freshForecast?.value && !usefulGrowth
                        ? "No permanent growth from this camp"
                        : chosen.id === "custom"
                          ? "Growth follows your skill allocation"
                          : "Permanent growth in all four skills"}
                  </strong>
                  <span>
                    {chosen.stat
                      ? `Earned on completion${completionBonus ? `, including +${completionBonus} for finishing ${weeks} weeks` : ""}. Used in your next eligible fight.`
                      : "No temporary fight bonus."}
                  </span>
                </div>
                {b && (
                  <p className="tw-hint">
                    {Math.max(0, b.eventWeek - s.week - weeks)} recovery{" "}
                    {b.eventWeek - s.week - weeks === 1 ? "week" : "weeks"} left
                    before the fight.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="tw-recovery-preview">
                  <span>
                    {s.blocking
                      ? "After the next playable week"
                      : "Readiness after End week"}
                  </span>
                  <strong>
                    {readiness(f)}% <span>→</span>{" "}
                    {ownPreview?.after ?? readiness(f)}%
                  </strong>
                </div>
                <p className="tw-hint">
                  Rest adds no skill gains. Your existing fight bonus keeps its
                  expiry date.
                </p>
              </>
            )}
            {timeline && (
              <div
                className="tw-fight-timeline"
                aria-label="Training and fight timeline"
              >
                <span>
                  <b>{chosen?.type === "camp" ? "Camp ends" : "Rest starts"}</b>
                  {calendarDate(s, timeline.endWeek)}
                </span>
                <span>
                  <b>Recovery</b>
                  {timeline.recoveryWeeks}{" "}
                  {timeline.recoveryWeeks === 1 ? "week" : "weeks"}
                </span>
                <span>
                  <b>Fight night</b>
                  {calendarDate(s, timeline.fightWeek)} · {timeline.atFight}%
                  ready
                  {timeline.recoveryWeeks > 0
                    ? " after recovery"
                    : " · no extra recovery"}
                </span>
              </div>
            )}
            {problem && (
              <p className="tw-warning" role="alert">
                {problem}
              </p>
            )}
            {needsForecast && !freshForecast && (
              <p className="tw-hint" role="status">
                Checking your camp forecast…
              </p>
            )}
            {freshForecast?.error && (
              <p className="tw-warning" role="alert">
                {freshForecast.error}{" "}
                <button
                  type="button"
                  className="tw-text-button"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Retry forecast
                </button>
              </p>
            )}
            <TeamImpact s={s} f={f} preview={preview} />
            {block}
            {chosen?.type === "recover" && (
              <p className="tw-end-week-guide">
                <span>
                  {s.blocking ? (
                    <>
                      Recovery is queued. Resolve the event above, then press{" "}
                      <strong>End week</strong>.
                    </>
                  ) : (
                    <>
                      Recovery is your current plan. Press{" "}
                      <strong>End week</strong> when your team is ready.
                    </>
                  )}
                </span>
              </p>
            )}
            {chosen?.type === "camp" && (
              <section className="tw-details">
                <h4>Growth, bonuses & coaching</h4>
                <p>
                  Estimates include age, coach and equipment. Hidden potential
                  and available funds can limit actual gains.
                </p>
                {freshForecast?.value?.coachImpact?.rank > 0 && (
                  <p>
                    <strong>Coach adds:</strong>{" "}
                    {trainingSkills
                      .map(
                        (skill) =>
                          `${plus(freshForecast.value.coachImpact.extraGains[skill])} ${skillLabel(skill)}`,
                      )
                      .join(" · ")}
                    . Included in the forecast above.
                  </p>
                )}
                {freshForecast?.value?.departmentImpact?.totalExtraGain > 0 && (
                  <p>
                    <strong>Training areas add:</strong>{" "}
                    {trainingSkills
                      .filter(
                        (skill) =>
                          freshForecast.value.departmentImpact.extraGains[
                            skill
                          ] > 0,
                      )
                      .map(
                        (skill) =>
                          `${plus(freshForecast.value.departmentImpact.extraGains[skill])} ${skillLabel(skill)}`,
                      )
                      .join(" · ")}
                    . Included above.
                  </p>
                )}
                {chosen.stat && (
                  <p>
                    Your completion bonus applies once to the next eligible bout
                    through {calendarDate(s, s.week + weeks + 8)}. It replaces
                    older preparation and does not stack.
                  </p>
                )}
                {f.preparation?.expiresWeek >= s.week && (
                  <p>
                    Current bonus: +{f.preparation.value}{" "}
                    {skillLabel(f.preparation.stat)} through{" "}
                    {calendarDate(s, f.preparation.expiresWeek)}. Finishing this
                    camp {chosen.stat ? "replaces" : "clears"} it.
                  </p>
                )}
                <p>
                  Skills with under 10% training can decline. Fighters in their
                  declining years also lose a small amount of base skill as
                  weeks pass.
                </p>
              </section>
            )}
            {b ? (
              <Link
                className="tw-inline-link tw-book"
                to={`/career/bout/${b.id}`}
              >
                View booked fight
              </Link>
            ) : (
              onBook && (
                <button
                  type="button"
                  className="career-action secondary tw-book"
                  disabled={locked}
                  onClick={onBook}
                >
                  Find a fight
                </button>
              )
            )}
          </aside>
          <section className="tw-panel tw-specialist-panel">
            <h3>
              Specialist rooms{" "}
              {s.boutsCompleted > 0
                ? ""
                : "· unlock gym development after your first fight"}
            </h3>
            {Object.values(s.rules.presets).some(
              (preset) => preset.departmentId,
            ) && (
              <div className="tw-specialists">
                <h4>Specialist camps</h4>
                <div className="tw-specialist-grid">
                  {Object.entries(s.rules.presets)
                    .filter(([, preset]) => preset.departmentId)
                    .map(([id, preset]) => {
                      const unlocked = s.presetOptions?.[id]?.available;
                      return (
                        <div
                          key={id}
                          className={`tw-specialist ${unlocked ? "" : "is-locked"}`}
                        >
                          <button
                            type="button"
                            disabled={planLocked || !unlocked}
                            aria-pressed={edited && selected === id}
                            data-suggested={!edited && selected === id}
                            onClick={() => setChoice(id)}
                          >
                            <img
                              className="tw-specialist-art"
                              src={trainingArt(id)}
                              alt=""
                            />
                            <strong>
                              {planIdentity[id]?.title || preset.name}
                            </strong>
                            <span>
                              {unlocked
                                ? `+${preparationValue(s, id, weeks)} ${skillLabel(planIdentity[id]?.stat)} fight bonus`
                                : s.presetOptions?.[id]?.blockedReason ||
                                  `Requires ${s.rules.departments[preset.departmentId].name}`}
                            </span>
                          </button>
                          {!unlocked && (
                            <Link to="/career/gym/facilities">
                              Unlock in Gym
                            </Link>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export { default as TrainingWeekReport } from "./TeamWeekReport";
