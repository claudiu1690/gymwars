import { useEffect, useRef, useState } from "react";
import CareerCoachingPractice from "./CareerCoachingPractice";
import { Link } from "react-router-dom";
import { Action } from "./CareerControls";
import { Ico } from "./Icons";
import { calendarDate } from "../careerCalendar.mjs";
import { investmentPreview } from "../careerAssignment.mjs";
import { gymEnvironment, roomIllustration } from "../gymEnvironments.mjs";
import "./career-development.css";
import "./career-design.css";

const money = (value = 0) => `$${value.toLocaleString("en-US")}`;

export function PurchasePreview({ preview }) {
  if (!preview) return null;
  return (
    <div
      className="design-purchase-preview"
      aria-label="Budget after this purchase"
    >
      <div>
        <span>Cash remaining</span>
        <strong>{money(preview.cashAfterPurchase)}</strong>
      </div>
      <div>
        <span>Whole gym / week</span>
        <strong>
          {money(preview.weeklyCostBefore)} → {money(preview.weeklyCostAfter)}
        </strong>
      </div>
      <div>
        <span>Weeks covered</span>
        <strong>
          {preview.weeksCovered == null
            ? "No upkeep"
            : `${preview.weeksCovered} weeks`}
        </strong>
      </div>
      <small>
        Based on remaining cash and upkeep, before future fight income.
        {preview.constructionWeeks
          ? " Higher upkeep begins when the expansion opens."
          : ""}
      </small>
    </div>
  );
}

function CampPayoff({ sample }) {
  if (!sample) return null;
  const skills = ["striking", "grappling", "submissions", "conditioning"];
  return (
    <div className="design-room-payoff">
      <strong>What changes for {sample.fighterName}</strong>
      <small>
        {sample.weeks}-week all-round camp · estimated permanent gains
      </small>
      <dl>
        {skills
          .filter((skill) => sample.before[skill] !== sample.after[skill])
          .map((skill) => (
            <div key={skill}>
              <dt>{skill}</dt>
              <dd>
                +{sample.before[skill]} → +{sample.after[skill]}
              </dd>
            </div>
          ))}
      </dl>
      {sample.recoveryBefore !== sample.recoveryAfter && (
        <p>
          Readiness restored per rest week: {sample.recoveryBefore} →{" "}
          {sample.recoveryAfter}.
        </p>
      )}
      {sample.recoveryBefore !== sample.recoveryAfter && (
        <div>
          {sample.recoveryExamples?.map((example) => (
            <p key={example.fatigue}>
              {example.fatigue === 25
                ? "After a fresh bout"
                : `${example.fatigue} fatigue`}
              : {example.before} → {example.after} rest weeks to full readiness.
            </p>
          ))}
        </div>
      )}
      {sample.preparationBefore !== sample.preparationAfter && (
        <p>
          Extra next-bout preparation: +{sample.preparationBefore} → +
          {sample.preparationAfter}.
        </p>
      )}
      {skills.every((skill) => sample.before[skill] === sample.after[skill]) &&
        sample.recoveryBefore === sample.recoveryAfter &&
        sample.preparationBefore === sample.preparationAfter && (
          <p>
            No extra displayed skill gain for this sample. Check the room’s
            specialist unlock.
          </p>
        )}
    </div>
  );
}
const departmentArt = {
  strikingBay: {
    icon: "M8 3h8l2 4v7l-4 4H8l-3-5V8l3-1V3zM8 18v3h6v-3M8 7h5",
    short: "Striking",
    color: "#f4b864",
    file: "striking",
    alt: "Striking room with navy and coral heavy bags and a speed bag",
  },
  grapplingLab: {
    icon: "M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10M6 14l6 3 6-3",
    short: "Grappling",
    color: "#b59ce7",
    file: "grappling",
    alt: "Grappling room with a blue wrestling mat, a padded training dummy and a gi",
  },
  conditioningStudio: {
    icon: "M13 2L4 14h7l-1 8 10-13h-7l1-7z",
    short: "Conditioning",
    color: "#81d6c0",
    file: "conditioning",
    alt: "Conditioning room with a squat rack, kettlebells and a plyometric box",
  },
  recoverySuite: {
    icon: "M8 3h8v5h5v8h-5v5H8v-5H3V8h5V3z",
    short: "Recovery",
    color: "#83bcf5",
    file: "recovery",
    alt: "Recovery room with a treatment bench, a cold plunge tub and fresh towels",
  },
  filmRoom: {
    icon: "M3 4h18v13H3V4zM8 21h8M12 17v4M10 8l5 3-5 3V8z",
    short: "Film room",
    color: "#e5a3c9",
    file: "film",
    alt: "Film room with two chairs, a screen showing an octagon and a strategy whiteboard",
  },
};

function tierUnlocks(s, tier) {
  const unlocks = [];
  for (const department of Object.values(s.rules.departments || {})) {
    const levels =
      department.levels?.filter((level) => level?.facilityTier === tier) || [];
    for (const level of levels) {
      unlocks.push(`${department.name} · level ${level.level}`);
    }
  }
  for (const [role, staff] of Object.entries(s.rules.staff)) {
    for (const rank of staff.ranks?.filter(
      (rank) => rank?.facilityTier === tier,
    ) || []) {
      if (rank.rank > 1)
        unlocks.push(
          `${role === "coach" ? "Coach" : "Scout"} rank ${rank.rank}`,
        );
    }
  }
  return unlocks;
}

export default function CareerDevelopment({ s, revision, command, disabled }) {
  const facilities = s.rules.facilities;
  const maxTier = s.gymDevelopment?.maxTier || facilities.length - 1;
  const [viewTier, setViewTier] = useState(
    Math.min(s.facilityTier + 1, maxTier),
  );
  const [departmentId, setDepartmentId] = useState("strikingBay");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");
  const inFlight = useRef(false);
  const roomDetail = useRef(null);
  const previousTier = useRef(s.facilityTier);
  const currentFacility = facilities[s.facilityTier];
  const viewedFacility = facilities[viewTier] || currentFacility;
  const nextFacility = facilities[s.facilityTier + 1];
  const departments = Object.values(s.departmentOptions || {});
  const department = s.departmentOptions?.[departmentId] || departments[0];
  const selectedArt =
    departmentArt[department?.id] || departmentArt.strikingBay;
  const spec = department && s.rules.departments?.[department.id];
  const built = departments.filter((option) => option.level > 0).length;
  const levelsBuilt = departments.reduce(
    (total, option) => total + option.level,
    0,
  );
  const nextStage = viewTier === s.facilityTier + 1;
  const expansion = s.gymDevelopment?.expansion;
  const expansionReason =
    expansion?.blockedReason ||
    (s.upgrade
      ? "An expansion is already underway."
      : !s.boutsCompleted
        ? "Complete your opening bout to unlock expansion."
        : nextFacility && s.cash < nextFacility.cost
          ? `Need ${money(nextFacility.cost - s.cash)} more to expand.`
          : "");
  const canExpand =
    nextStage &&
    !s.upgrade &&
    !expansionReason &&
    (expansion?.canUpgrade ?? true);
  const unavailable = disabled || pending;
  const unlocks = tierUnlocks(s, viewTier);
  useEffect(() => {
    if (s.facilityTier > previousTier.current) {
      setResult(
        `${facilities[s.facilityTier].name} is open. Your club banner has changed and new rooms are available.`,
      );
      setViewTier(Math.min(s.facilityTier + 1, maxTier));
    }
    previousTier.current = s.facilityTier;
  }, [s.facilityTier]);
  useEffect(() => {
    setConfirm("");
  }, [viewTier, departmentId, s.facilityTier, department?.level]);

  const selectDepartment = (id) => {
    setDepartmentId(id);
    if (window.matchMedia("(max-width: 760px)").matches) {
      requestAnimationFrame(() => {
        roomDetail.current?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
      });
    }
  };

  const purchase = async (payload, message) => {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setPending(true);
    try {
      const ok = await command(payload);
      if (ok) {
        setConfirm("");
        setResult(message);
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <section
      id="gym-facilities"
      className="gym-development"
      aria-labelledby="gym-facility-title"
    >
      <header className="gym-section-heading">
        <div>
          <span className="career-eyebrow">A HOME WORTH FIGHTING FOR</span>
          <h2 id="gym-facility-title">Build your gym</h2>
          <p>Expand your home. Equip the rooms. Unlock new ways to train.</p>
        </div>
        <span className="development-current-tier">
          TIER <strong>{s.facilityTier}</strong> / {maxTier}
        </span>
      </header>
      {expansion?.recommendation && (
        <p className="development-recommendation">
          {expansion.recommendation}{" "}
          <Link to="/career/scouting">Build your team</Link>
        </p>
      )}
      {!!s.gymDevelopment?.identity?.earnedPennants?.length && (
        <div className="development-pennants" aria-label="Earned club pennants">
          {s.gymDevelopment.identity.earnedPennants.map((pennant) => (
            <span key={pennant.id}>⚑ {pennant.name}</span>
          ))}
        </div>
      )}
      {!!s.gymDevelopment?.challenges?.length && (
        <section
          className="development-challenges"
          aria-label="Earned career challenges"
        >
          <h3>Club challenge cards</h3>
          <p>
            Build each chapter of your gym to meet a new opponent and earn a
            trophy.
          </p>
          <div>
            {s.gymDevelopment.challenges.map((challenge) => (
              <article key={challenge.id} data-earned={challenge.complete}>
                <span className="career-eyebrow">
                  {challenge.complete
                    ? "TROPHY EARNED"
                    : challenge.locked
                      ? "BUILD TOWARD THIS"
                      : challenge.canEnter
                        ? "CHALLENGE AVAILABLE"
                        : "PREPARE FOR THIS"}
                </span>
                <h4>{challenge.name}</h4>
                <p>{challenge.description}</p>
                <strong>
                  {challenge.reward.trophy} · +{challenge.reward.legacy}{" "}
                  reputation
                  {challenge.reward.cash > 0 &&
                    ` · ${money(challenge.reward.cash)} first-victory prize`}
                </strong>
                {challenge.blockedReason && <p>{challenge.blockedReason}</p>}
                {!challenge.complete && (
                  <Link to={challenge.href || "/career/fights"}>
                    {challenge.actionLabel ||
                      (challenge.locked
                        ? "View chapter goal"
                        : "Find the challenge offer")}{" "}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <ol className="development-roadmap" aria-label="Gym growth roadmap">
        {facilities.map(
          (facility, tier) =>
            facility && (
              <li key={tier}>
                <button
                  type="button"
                  aria-pressed={viewTier === tier}
                  aria-label={`Inspect tier ${tier}: ${facility.name}`}
                  data-state={
                    tier < s.facilityTier
                      ? "earned"
                      : tier === s.facilityTier
                        ? "current"
                        : "future"
                  }
                  onClick={() => setViewTier(tier)}
                >
                  <span className="development-tier-number">{tier}</span>
                  <span>
                    <strong>{facility.name}</strong>
                    <small>
                      {tier === s.facilityTier
                        ? "Your home"
                        : s.upgrade?.tier === tier
                          ? "Expanding now"
                          : tier < s.facilityTier
                            ? "Outgrown"
                            : `${facility.slots} fighter places`}
                    </small>
                  </span>
                </button>
              </li>
            ),
        )}
      </ol>

      <div
        className="development-stage"
        data-current={viewTier === s.facilityTier}
      >
        <figure
          className="development-stage-visual"
          aria-label="Gym tier preview"
        >
          <img
            src={gymEnvironment(viewTier)}
            alt={`${viewedFacility.name} · tier ${viewTier} gym interior`}
            width="1600"
            height="900"
            loading="lazy"
          />
          <figcaption>
            <strong>{viewedFacility.name}</strong>
            <span>
              Tier {viewTier} ·{" "}
              {viewTier === s.facilityTier
                ? "Your current home"
                : viewTier < s.facilityTier
                  ? "Part of your story"
                  : "Expansion preview"}
            </span>
          </figcaption>
        </figure>
        <div className="development-stage-copy">
          <span className="career-eyebrow">
            {viewTier === s.facilityTier
              ? "YOUR CURRENT HOME"
              : viewTier < s.facilityTier
                ? "PART OF YOUR STORY"
                : nextStage
                  ? "YOUR NEXT EXPANSION"
                  : "FUTURE HOME"}{" "}
            · TIER {viewTier}
          </span>
          <h3>{viewedFacility.name}</h3>
          {viewedFacility.description && <p>{viewedFacility.description}</p>}
          {(s.gymDevelopment?.goals || [])
            .filter((goal) => goal.tier === viewTier)
            .map((goal) => (
              <div className="design-tier-goal" key={goal.id}>
                <span className="career-eyebrow">
                  {goal.complete
                    ? "CHAPTER COMPLETE"
                    : goal.locked
                      ? "FUTURE CHAPTER"
                      : "THIS TIER’S CHALLENGE"}
                </span>
                <strong>{goal.name}</strong>
                <p>{goal.description}</p>
                <span>
                  {goal.current} / {goal.target} {goal.unit} ·{" "}
                  {goal.promoted
                    ? "Circuit earned"
                    : goal.deedComplete || goal.complete
                      ? "Deed earned"
                      : "In progress"}
                </span>
                {goal.waitingFor && (
                  <p>
                    Deed saved. First earn {goal.waitingFor.name} to receive
                    this promotion.
                  </p>
                )}
                {!goal.deedComplete && goal.prerequisiteLabel && (
                  <small>{goal.prerequisiteLabel}</small>
                )}
                {goal.reward && (
                  <small>
                    {typeof goal.reward === "string"
                      ? goal.reward
                      : `Reward: ${money(goal.reward.cash || 0)} · +${goal.reward.legacy || 0} legacy`}
                  </small>
                )}
                {goal.waitingFor?.href ? (
                  <Link className="career-text-link" to={goal.waitingFor.href}>
                    Work on the earlier chapter
                  </Link>
                ) : (
                  !goal.complete &&
                  !goal.locked &&
                  goal.href && (
                    <Link className="career-text-link" to={goal.href}>
                      Work toward this goal
                    </Link>
                  )
                )}
              </div>
            ))}
          <div className="development-stage-stats">
            <span>
              <strong>{viewedFacility.slots}</strong>Fighter places
            </span>
            <span>
              <strong>{money(viewedFacility.upkeep)}</strong>Facility / week
            </span>
            <span>
              <strong>
                +{Math.round((viewedFacility.recovery - 1) * 100)}%
              </strong>
              Base rest recovery
            </span>
          </div>
          {viewedFacility.warChallenge && (
            <div className="design-tier-goal">
              <span className="career-eyebrow">NEW 4V4 CLUB CUP</span>
              <strong>{viewedFacility.warChallenge.name}</strong>
              <p>
                Win a ranked card against {viewedFacility.warChallenge.rival} to
                earn the {viewedFacility.warChallenge.reward} crest. Normal
                1-token cost and scoring.
              </p>
              <Link to="/career/gym-wars">View club cups</Link>
            </div>
          )}
          <div className="development-stage-unlocks">
            <strong>Available at this tier</strong>
            <div>
              {unlocks.length ? (
                unlocks.map((unlock) => <span key={unlock}>{unlock}</span>)
              ) : (
                <span>Your first team and its training floor</span>
              )}
            </div>
            {unlocks.length > 0 && (
              <small>Rooms and staff are purchased separately.</small>
            )}
          </div>
        </div>
        <div className="development-stage-action">
          {s.upgrade?.tier === viewTier ? (
            <>
              <span className="development-build-mark" aria-hidden="true">
                ↗
              </span>
              <strong>Expansion underway</strong>
              <p>Opens {calendarDate(s, s.upgrade.endWeek)}.</p>
              <small>
                Your team keeps training. Advance the career calendar when
                ready.
              </small>
            </>
          ) : nextStage ? (
            <>
              <strong>{money(viewedFacility.cost)}</strong>
              <span>{viewedFacility.weeks} career weeks to expand</span>
              <p>
                Facility upkeep {money(currentFacility.upkeep)} →{" "}
                {money(viewedFacility.upkeep)} / week.
              </p>
              <PurchasePreview
                preview={
                  expansion?.purchasePreview ||
                  investmentPreview(
                    s,
                    viewedFacility.cost,
                    s.weeklyCost -
                      currentFacility.upkeep +
                      viewedFacility.upkeep,
                  )
                }
              />
              {confirm === "facility" ? (
                <div
                  className="development-confirm"
                  role="group"
                  aria-label="Confirm gym expansion"
                >
                  <p>
                    Spend {money(viewedFacility.cost)} now? Your larger gym
                    opens {calendarDate(s, s.week + viewedFacility.weeks)}.
                  </p>
                  <Action
                    disabled={unavailable || !canExpand}
                    onClick={() =>
                      purchase(
                        { type: "upgrade" },
                        `${viewedFacility.name} expansion has started.`,
                      )
                    }
                  >
                    Confirm expansion
                  </Action>
                  <Action
                    secondary
                    disabled={unavailable}
                    onClick={() => setConfirm("")}
                  >
                    Keep saving
                  </Action>
                </div>
              ) : (
                <Action
                  disabled={unavailable || !canExpand}
                  onClick={() => {
                    setConfirm("facility");
                    setResult("");
                  }}
                >
                  Expand gym · {money(viewedFacility.cost)}
                </Action>
              )}
              {expansionReason && (
                <p className="development-lock">{expansionReason}</p>
              )}
            </>
          ) : viewTier === s.facilityTier ? (
            <>
              <span className="development-build-mark" aria-hidden="true">
                ◆
              </span>
              <strong>
                {s.facilityTier === maxTier
                  ? "The world-class home is yours"
                  : "Your home base"}
              </strong>
              <p>
                {built} / {departments.length} departments equipped.
              </p>
              <small>
                {s.facilityTier === maxTier
                  ? departments.every((room) => room.level === room.maxLevel)
                    ? "Your gym is fully equipped. Develop the next generation of champions."
                    : "Finish your departments and develop the next generation of champions."
                  : "Build the departments below or inspect your next expansion."}
              </small>
            </>
          ) : viewTier < s.facilityTier ? (
            <>
              <strong>You built this chapter.</strong>
              <p>Your team has moved on to {currentFacility.name}.</p>
            </>
          ) : (
            <>
              <strong>{money(viewedFacility.cost)}</strong>
              <span>{viewedFacility.weeks} career weeks to expand</span>
              <p>Reach {facilities[viewTier - 1]?.name} first.</p>
              <small>
                Grow one tier at a time. Each step opens more room upgrades.
              </small>
            </>
          )}
        </div>
      </div>

      {departments.length > 0 && (
        <>
          <header className="development-rooms-heading">
            <div>
              <span className="career-eyebrow">PUT YOUR GYM TO WORK</span>
              <h3>Your departments</h3>
              <p>
                Choose a room. Compare training efficiency, recovery and
                preparation before investing.
              </p>
            </div>
            <span>
              {built} rooms built · {levelsBuilt} /{" "}
              {departments.reduce(
                (total, option) => total + option.maxLevel,
                0,
              )}{" "}
              upgrades
            </span>
          </header>
          <div className="development-workshop">
            <div className="development-room-gallery">
              <div
                className="development-room-cards"
                role="group"
                aria-label="Gym departments"
              >
                {departments.map((room) => {
                  const art =
                    departmentArt[room.id] || departmentArt.strikingBay;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      aria-label={`${room.name}, ${room.level ? `level ${room.level}` : "not built"}`}
                      aria-pressed={department?.id === room.id}
                      aria-controls="development-selected-room"
                      data-built={room.level > 0}
                      style={{ "--room-color": art.color }}
                      onClick={() => selectDepartment(room.id)}
                    >
                      <img
                        src={roomIllustration(art.file, true)}
                        alt=""
                        width="440"
                        height="270"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="development-room-card-copy">
                        <strong>{art.short}</strong>
                        <span>
                          {room.level
                            ? `LV ${room.level} / ${room.maxLevel}`
                            : room.canUpgrade
                              ? "READY TO BUILD"
                              : "NOT BUILT"}
                        </span>
                        <i aria-hidden="true">
                          {Array.from({ length: room.maxLevel }, (_, i) => (
                            <b key={i} data-lit={i < room.level} />
                          ))}
                        </i>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {department && (
              <article
                ref={roomDetail}
                id="development-selected-room"
                className="development-room-detail"
                aria-labelledby="development-selected-room-title"
                style={{
                  "--room-color": selectedArt.color,
                }}
              >
                <img
                  className="development-room-illustration"
                  src={roomIllustration(selectedArt.file)}
                  alt={selectedArt.alt}
                  width="1600"
                  height="900"
                  loading="lazy"
                  decoding="async"
                />
                <header>
                  <span className="development-room-emblem">
                    <Ico d={selectedArt.icon} size={32} />
                  </span>
                  <div>
                    <span className="career-eyebrow">
                      {department.level
                        ? `LEVEL ${department.level} / ${department.maxLevel}`
                        : "NEW DEPARTMENT"}
                    </span>
                    <h3 id="development-selected-room-title">
                      {department.name}
                    </h3>
                  </div>
                </header>
                <p>{department.description}</p>
                {department.level > 0 &&
                  [
                    "strikingBay",
                    "grapplingLab",
                    "conditioningStudio",
                    "filmRoom",
                  ].includes(department.id) && (
                    <CareerCoachingPractice
                      key={department.id}
                      s={s}
                      revision={revision}
                      roomId={
                        {
                          strikingBay: "striking",
                          grapplingLab: "grappling",
                          conditioningStudio: "conditioning",
                          filmRoom: "film",
                        }[department.id]
                      }
                      disabled={unavailable}
                    />
                  )}
                <div className="development-room-effect">
                  <span>
                    {department.level
                      ? "WORKING FOR YOUR TEAM"
                      : "FIRST BUILD IMPROVES"}
                  </span>
                  <strong>
                    {department.current?.effectLabel ||
                      department.next?.effectLabel}
                  </strong>
                  {department.unlocks?.length > 0 && (
                    <small>
                      Convenient coaching plan:{" "}
                      {department.unlocks
                        .map(
                          (preset) => s.rules.presets[preset]?.name || preset,
                        )
                        .join(" · ")}
                    </small>
                  )}
                </div>
                <ol
                  className="development-room-levels"
                  aria-label={`${department.name} levels`}
                >
                  {spec?.levels?.filter(Boolean).map((level) => (
                    <li
                      key={level.level}
                      data-state={
                        department.level >= level.level
                          ? "built"
                          : department.level + 1 === level.level
                            ? "next"
                            : "locked"
                      }
                    >
                      <span>{level.level}</span>
                      <div>
                        <strong>{level.effectLabel}</strong>
                        <small>
                          {department.level >= level.level
                            ? "Built"
                            : `${money(level.fee)} · gym tier ${level.facilityTier}`}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
                {department.next ? (
                  <div className="development-room-purchase">
                    <strong>
                      {department.level
                        ? `Next: level ${department.next.level}`
                        : "Build this room"}
                    </strong>
                    <span>
                      {money(department.next.fee)} once · no weekly upkeep
                    </span>
                    <CampPayoff sample={department.sampleCamp} />
                    <PurchasePreview
                      preview={
                        department.purchasePreview ||
                        investmentPreview(s, department.next.fee)
                      }
                    />
                    {confirm === department.id ? (
                      <div
                        className="development-confirm"
                        role="group"
                        aria-label={`Confirm ${department.name} upgrade`}
                      >
                        <p>
                          Spend {money(department.next.fee)} on{" "}
                          {department.name}? {department.next.effectLabel}.
                          Opens immediately; time stays paused.
                        </p>
                        <Action
                          disabled={unavailable || !department.canUpgrade}
                          onClick={() =>
                            purchase(
                              {
                                type: "upgrade-department",
                                departmentId: department.id,
                              },
                              `${department.name} is now level ${department.next.level}.`,
                            )
                          }
                        >
                          Confirm · {money(department.next.fee)}
                        </Action>
                        <Action
                          secondary
                          disabled={unavailable}
                          onClick={() => setConfirm("")}
                        >
                          Keep saving
                        </Action>
                      </div>
                    ) : (
                      <Action
                        disabled={unavailable || !department.canUpgrade}
                        onClick={() => {
                          setConfirm(department.id);
                          setResult("");
                        }}
                      >
                        {department.level ? "Upgrade room" : "Build room"} ·{" "}
                        {money(department.next.fee)}
                      </Action>
                    )}
                    {department.blockedReason && (
                      <p className="development-lock">
                        {department.blockedReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="development-room-max">
                    <span aria-hidden="true">★ ★ ★</span>
                    <strong>Department complete</strong>
                    <p>Your team benefits every week.</p>
                  </div>
                )}
              </article>
            )}
          </div>
          <div
            className="development-team-effects"
            aria-label="Current gym benefits"
          >
            <span>
              <strong>{s.gymDevelopment?.recoveryPerWeek ?? "—"}</strong>
              Readiness restored per rest week
            </span>
            <span>
              <strong>{built}</strong>Departments working for your team
            </span>
            <span>
              <strong>
                {s.gymDevelopment?.preparationBonus
                  ? `+${s.gymDevelopment.preparationBonus}`
                  : "0"}
              </strong>
              Extra prep from the Film Room
            </span>
          </div>
        </>
      )}
      <p className="development-result" role="status">
        {result}
      </p>
      <section className="club-looks" aria-label="Club colors and crests">
        <h3>Earn your club’s colors</h3>
        <p>
          Career quests, training and Gym Wars achievements unlock crests,
          banners and wall flags. Equipping them is free.
        </p>
        <Link className="career-action secondary" to="/career/achievements">
          Open Achievements
        </Link>
      </section>
    </section>
  );
}
