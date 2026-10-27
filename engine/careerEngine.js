// Pure career commands. Nothing advances on reads, wall time, or disconnect.
// The repository commits the entire resulting state with a revision compare.
const { createRng } = require("../utils/rng");
const {
  generateFighter,
  rollRarity,
  scoutStatRanges,
  STAT_KEYS,
} = require("../services/fighterGenService");
const { validateAllocations } = require("../services/campMath");
const {
  beginFight,
  advanceRound,
  finishFight,
  liveSnapshot,
  CURRENT_FIGHT_VERSION,
  SUPPORTED_FIGHT_VERSIONS,
} = require("./fightEngine");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const { CAREER } = require("../consts/career");
const {
  staffDevelopment,
  creditStaffWork,
} = require("../consts/staffDevelopment");
const FIGHTER_PORTRAITS = require("../consts/fighterPortraits.json");
const {
  CLUB_LOOKS,
  SHORT_NOTICE_PREMIUM,
  CIRCUIT_HONOR_PRIZES,
  TITLE_DEMAND,
} = require("../consts/careerEconomy");
const {
  contractTerms,
  circuitEntry,
  skillAverage,
  winsAgainst,
  scoutReport,
  campRecoveryWeek,
  clubStyle,
  cashFlow,
} = require("./careerEconomy");
const {
  isSignatureId,
  signatureChoicesFor,
  signatureFor,
} = require("../consts/signatures");
const {
  RARITY_TIERS,
  SCOUT_ODDS,
  PITY_THRESHOLDS,
} = require("../consts/rarity");
const clone = (value) => JSON.parse(JSON.stringify(value));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (n) => Math.round(n * 10) / 10;
// Keep earned fractions in the save. Only presentation rounds to tenths.
const precise = (n) => Math.round(n * 1000000) / 1000000;
const active = (s) => s.fighters.filter((f) => !f.retired && !f.released);
const DIVISIONS = [
  "featherweight",
  "lightweight",
  "middleweight",
  "heavyweight",
];
const missingDivisions = (s) =>
  DIVISIONS.filter(
    (division) => !active(s).some((f) => f.weightClass === division),
  );
const error = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode, expose: true });
};
const requireThat = (test, message) => {
  if (!test) error(message, 409);
};
const basePlan = () => ({
  approach: "balanced",
  pace: "measured",
  finish: "hunt-finish",
  conserveBelow: 30,
});
const family = (f) => STYLES[f.style]?.family;
const phase = (f) =>
  f.age < 25 ? "Rising" : f.age < 33 ? "Prime" : "Declining";
function plan(p) {
  requireThat(
    p &&
      ["strike", "balanced", "grapple"].includes(p.approach) &&
      ["high", "measured", "cautious"].includes(p.pace) &&
      ["hunt-finish", "play-safe"].includes(p.finish),
    "Choose valid corner instructions.",
  );
  requireThat(
    [0, 20, 30, 40, 50].includes(p.conserveBelow),
    "Choose a valid low-gas threshold.",
  );
  return {
    approach: p.approach,
    pace: p.pace,
    finish: p.finish,
    conserveBelow: p.conserveBelow,
  };
}
function makeFighter(seed, id, options = {}) {
  const f = generateFighter({
    seed,
    weightClass: options.weightClass,
    rarity: options.rarity || "prospect",
  });
  const rng = createRng(`${seed}:career`);
  const order = [
    "journeyman",
    "prospect",
    "contender",
    "elite",
    "legend",
  ].indexOf(f.rarity);
  f.id = id;
  f.style = options.style || f.style;
  // Substantial overlap: rarity helps, but specialists and development matter.
  for (const key of STAT_KEYS) {
    f.stats[key] = rng.int(29 + order * 3, 43 + order * 3);
    f.potential[key] = rng.int(58 + order * 4, 74 + order * 4);
  }
  f.stats[STYLE_FAMILIES[family(f)].primaryStat] += 6;
  f.traits = f.traits.filter((t) => CAREER.traits[t]);
  f.discoveredTraits = [];
  f.fatigue = 0;
  f.gameplan = basePlan();
  f.record = { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 };
  f.rankingPoints = 0;
  f.history = [];
  f.championships = [];
  f.lineage = [];
  f.portrait = rng.pick(
    FIGHTER_PORTRAITS.filter(
      (art) =>
        art.weightClasses.includes(f.weightClass) &&
        (!art.minAge || f.age >= art.minAge),
    ),
  ).id;
  f.camp = null;
  f.preparation = null;
  f.retired = false;
  f.generationVersion = 2;
  f.signatureId = null;
  f.signatureProgress = { boutComplete: false, campComplete: false };
  return Object.assign(f, options);
}
function log(s, type, text, fighterId = null) {
  s.journal.push({ week: s.week, type, text, fighterId });
  s.journal = s.journal.slice(-300);
}
function milestone(s, f, type, text) {
  f.history.push({ week: s.week, type, text });
  log(s, type, text, f.id);
}
function find(s, id) {
  const f = active(s).find((f) => f.id === id);
  if (!f) error("Fighter not found in your active roster.", 404);
  return f;
}
const pendingFight = (s, id) =>
  s.fights.find((b) => b.fighterId === id && b.status !== "resolved");
const pairFor = (s, id) =>
  s.mentoring.find(
    (p) => p.status === "active" && [p.mentorId, p.juniorId].includes(id),
  );
// Saves written before staff ranks existed already own the first rank.
const staffRank = (s, role) =>
  s.staff[role]
    ? clamp(
        Number.isInteger(s.staff[role].rank) ? s.staff[role].rank : 1,
        1,
        CAREER.staff[role].ranks.length - 1,
      )
    : 0;
const staffSpec = (s, role) => CAREER.staff[role].ranks[staffRank(s, role)];
const coachMultiplier = (s) => staffSpec(s, "coach")?.growthMultiplier || 1;
const weeklyCost = (s) =>
  CAREER.facilities[s.facilityTier].upkeep +
  Object.keys(CAREER.staff).reduce(
    (n, k) => n + (staffSpec(s, k)?.upkeep || 0),
    0,
  );
const departmentLevel = (s, id) =>
  clamp(
    Number.isInteger(s.departments?.[id]) ? s.departments[id] : 0,
    0,
    CAREER.departments[id].levels.length - 1,
  );
const departmentSpec = (s, id) =>
  CAREER.departments[id].levels[departmentLevel(s, id)];
const skillBonuses = (s) =>
  Object.fromEntries(
    STAT_KEYS.map((key) => [
      key,
      Object.keys(CAREER.departments).reduce(
        (sum, id) => sum + (departmentSpec(s, id)?.skillBonuses?.[key] || 0),
        0,
      ),
    ]),
  );
const recoveryPerWeek = (s) =>
  round(
    CAREER.recoveryPerWeek * CAREER.facilities[s.facilityTier].recovery +
      (departmentSpec(s, "recoverySuite")?.recoveryBonus || 0),
  );
const preparationBonus = (s) =>
  departmentSpec(s, "filmRoom")?.preparationBonus || 0;
function purchasePreview(s, cost, weeklyCostAfter = weeklyCost(s)) {
  const cashAfterPurchase = s.cash - cost;
  return {
    cost,
    cashAfterPurchase,
    weeklyCostBefore: weeklyCost(s),
    weeklyCostAfter,
    weeksCovered: Math.floor(Math.max(0, cashAfterPurchase) / weeklyCostAfter),
  };
}
function departmentOptions(s) {
  return Object.fromEntries(
    Object.entries(CAREER.departments).map(([id, spec]) => {
      const level = departmentLevel(s, id);
      const next = spec.levels[level + 1] || null;
      const blockedReason = !next
        ? "This department has reached its highest level."
        : s.boutsCompleted < 1
          ? "Complete your opening bout before equipping the gym."
          : s.facilityTier < next.facilityTier
            ? `Open ${CAREER.facilities[next.facilityTier].name} to unlock this equipment.`
            : s.cash < next.fee
              ? `You need $${next.fee} for this equipment.`
              : null;
      return [
        id,
        {
          id,
          name: spec.name,
          description: spec.description,
          level,
          maxLevel: spec.levels.length - 1,
          current: spec.levels[level],
          next,
          canUpgrade: !blockedReason,
          blockedReason,
          unlocks: spec.unlocks,
          purchasePreview: next ? purchasePreview(s, next.fee) : null,
          sampleCamp:
            next && active(s).length
              ? equipmentSample(s, id, next.level, active(s)[0])
              : null,
        },
      ];
    }),
  );
}
function presetOptions(s) {
  return Object.fromEntries(
    Object.entries(CAREER.presets).map(([id, spec]) => {
      const blockedReason =
        spec.departmentId && departmentLevel(s, spec.departmentId) < 1
          ? `Install level 1 ${CAREER.departments[spec.departmentId].name} to unlock this camp.`
          : null;
      return [id, { id, ...spec, available: !blockedReason, blockedReason }];
    }),
  );
}
function expansionOption(s) {
  const nextTier = s.facilityTier + 1;
  const next = CAREER.facilities[nextTier] || null;
  const blockedReason = !next
    ? "Your gym has reached its largest size."
    : s.upgrade
      ? "An expansion is already under construction."
      : s.boutsCompleted < 1
        ? "Complete your opening bout before expanding."
        : nextTier >= 3 &&
            nextTier > (s.progression?.grandfatherExpansionTier || 0) &&
            careerCircuit(s).level < nextTier
          ? `Earn ${CAREER.circuits[nextTier - 1].name} before opening this gym. ${CAREER.circuits[nextTier - 1].requirement}`
          : s.cash < next.cost
            ? `You need $${next.cost} to expand the gym.`
            : null;
  return {
    nextTier: next ? nextTier : null,
    recommendation:
      nextTier === 2 && careerCircuit(s).level < 2
        ? "Recommended first: complete your four-division team and enter City. Higher purses help cover the bigger gym."
        : null,
    next,
    canUpgrade: !blockedReason,
    blockedReason,
    purchasePreview: next
      ? {
          ...purchasePreview(
            s,
            next.cost,
            weeklyCost(s) -
              CAREER.facilities[s.facilityTier].upkeep +
              next.upkeep,
          ),
          constructionWeeks: next.weeks,
        }
      : null,
  };
}
function staffOptions(s) {
  return Object.fromEntries(
    Object.entries(CAREER.staff).map(([role, spec]) => {
      const currentRank = staffRank(s, role);
      const current = spec.ranks[currentRank];
      const next = spec.ranks[currentRank + 1] || null;
      const development = staffDevelopment(s.staff[role], role, s);
      const promotionChecks = next
        ? [
            {
              id: "debut",
              label: "Complete your opening bout",
              complete: s.boutsCompleted >= 1,
              href: "/career/fights",
            },
            ...(currentRank
              ? [
                  {
                    id: "quests",
                    label: "Complete both promotion quests",
                    complete: development.qualified,
                    href: role === "coach" ? "/career/gym" : "/career/scouting",
                  },
                ]
              : []),
            {
              id: "facility",
              label: `${CAREER.facilities[next.facilityTier].name} · gym tier ${next.facilityTier}`,
              complete: s.facilityTier >= next.facilityTier,
              href: "/career/gym/facilities",
            },
            {
              id: "cash",
              label: `$${next.fee.toLocaleString("en-US")} promotion budget${s.cash < next.fee ? ` · $${(next.fee - s.cash).toLocaleString("en-US")} short` : " ready"}`,
              complete: s.cash >= next.fee,
              href: "/career/fights",
            },
          ]
        : [];
      const blockedReason = !next
        ? "This staff member has reached the highest rank."
        : s.boutsCompleted < 1
          ? "Complete your opening bout to hire staff."
          : s.facilityTier < next.facilityTier
            ? `Open ${CAREER.facilities[next.facilityTier].name} to unlock rank ${next.rank}.`
            : currentRank && !development.qualified
              ? `Complete both ${role === "coach" ? "coaching" : "scouting"} promotion quests.`
              : s.cash < next.fee
                ? `You need $${next.fee} for ${currentRank ? "this promotion" : "this hire"}.`
                : null;
      return [
        role,
        {
          currentRank,
          current,
          next,
          development,
          promotionChecks,
          blockedReason,
          canHire: !currentRank && !blockedReason,
          canUpgrade: !!currentRank && !blockedReason,
          purchasePreview: next
            ? purchasePreview(
                s,
                next.fee,
                weeklyCost(s) - (current?.upkeep || 0) + next.upkeep,
              )
            : null,
        },
      ];
    }),
  );
}
function mentoringOptions(s) {
  const team = active(s);
  const conflicts = {
    "iron-chin": "suspect-chin",
    "suspect-chin": "iron-chin",
    "fast-starter": "slow-starter",
    "slow-starter": "fast-starter",
  };
  return team
    .filter((mentor) => mentor.age >= 30)
    .flatMap((mentor) =>
      team
        .filter((junior) => junior.id !== mentor.id)
        .flatMap((junior) =>
          mentor.discoveredTraits
            .filter((trait) => CAREER.transferableTraits[trait])
            .map((trait) => {
              const compatible = family(mentor) === family(junior);
              const lesson = CAREER.transferableTraits[trait];
              const weeks = compatible
                ? lesson.compatibleWeeks || CAREER.mentoring.compatibleWeeks
                : lesson.otherWeeks || CAREER.mentoring.otherWeeks;
              const training = forecast(
                s,
                junior,
                CAREER.presets.balanced.allocations,
                weeks,
              );
              const commitmentCost = weeks * weeklyCost(s);
              // Only guaranteed show money from already-booked bouts is counted.
              // Win bonuses and future offers are not a promise of solvency.
              const bookedShowIncome = s.fights
                .filter(
                  (b) =>
                    b.status === "scheduled" && b.eventWeek <= s.week + weeks,
                )
                .reduce((total, b) => total + (Number(b.show) || 0), 0);
              const availableCash = s.cash + bookedShowIncome;
              const knownDuplicate = junior.discoveredTraits.includes(trait);
              const knownConflict = junior.discoveredTraits.includes(
                conflicts[trait],
              );
              const blockedReason = knownDuplicate
                ? `${junior.name} already has ${trait.replaceAll("-", " ")}. Choose another learner.`
                : knownConflict
                  ? `${junior.name} has ${conflicts[trait].replaceAll("-", " ")}, which conflicts with this lesson. Choose another learner.`
                  : [mentor, junior].some(
                        (f) =>
                          f.camp || pairFor(s, f.id) || pendingFight(s, f.id),
                      )
                    ? "Both fighters need clear schedules for mentoring."
                    : junior.traits.includes(trait) ||
                        junior.traits.includes(conflicts[trait])
                      ? "This trait cannot be passed to this fighter."
                      : s.mentoring.filter((p) => p.status === "active")
                            .length >= Math.max(1, s.facilityTier - 1)
                        ? "All mentoring spaces are occupied."
                        : s.cash < weeklyCost(s)
                          ? "Cover one week of operating costs before starting mentoring."
                          : null;
              return {
                mentorId: mentor.id,
                juniorId: junior.id,
                trait,
                traitKind: CAREER.transferableTraits[trait].kind,
                traitDescription: CAREER.traits[trait],
                effect: lesson.effect,
                bestFor: lesson.bestFor,
                compatible,
                trainingAlternative: {
                  weeks,
                  estimatedTotalGrowth: training.estimatedTotalGrowth,
                },
                blockedReason,
                canStart: !blockedReason,
                weeks,
                chance: compatible ? 0.9 : 0.7,
                budget: {
                  commitmentCost,
                  bookedShowIncome,
                  availableCash,
                  funded: availableCash >= commitmentCost,
                  shortfall: Math.max(0, commitmentCost - availableCash),
                  weeksCovered: Math.floor(s.cash / weeklyCost(s)),
                },
                preparation: {
                  stat: STYLE_FAMILIES[family(mentor)].primaryStat,
                  value: CAREER.mentoring.preparationValue,
                  expiresAfterWeeks:
                    CAREER.mentoring.preparationExpiresAfterWeeks,
                },
              };
            }),
        ),
    );
}
function spend(s, amount, reason = "purchase", detail = {}) {
  requireThat(
    s.cash >= amount,
    `You need $${amount}; keep a regional bout on the calendar to earn show money.`,
  );
  s.cash -= amount;
  cashFlow(s, -amount, reason, detail);
}
function syncJourney(s, historical = false) {
  s.careerJourney ||= { milestones: {}, attempts: [], completedWeek: null };
  const earnedTitle = s.fighters.some((f) =>
    f.championships.some((title) => !title.vacant || title.defenses > 0),
  );
  const achieved = {
    debut: s.boutsCompleted > 0 || earnedTitle,
    "first-win": s.fighters.some((f) => f.record.wins > 0) || earnedTitle,
    contender:
      s.fighters.some((f) => f.rankingPoints >= CAREER.titleShotPoints) ||
      earnedTitle,
    champion: earnedTitle,
    invitational: s.careerJourney.completedWeek != null,
  };
  for (const [id, complete] of Object.entries(achieved)) {
    if (!complete || s.careerJourney.milestones[id]) continue;
    s.careerJourney.milestones[id] = {
      week: historical ? null : s.week,
      historical,
    };
  }
}
function gymGoals(s) {
  const earnedChampionships = s.fighters.flatMap((f) =>
    f.championships
      .filter((title) => !title.vacant || title.defenses > 0)
      .map((title) => ({ ...title, weightClass: f.weightClass })),
  );
  const successorWins = s.mentoring.filter(
    (lesson) =>
      ["completed", "succeeded"].includes(lesson.status) &&
      s.fights.some(
        (bout) =>
          bout.fighterId === lesson.juniorId &&
          bout.status === "resolved" &&
          bout.result?.winner === "A" &&
          bout.resolvedWeek >= (lesson.completedWeek ?? lesson.endWeek),
      ),
  ).length;
  const definitions = [
    {
      id: "open-doors",
      tier: 1,
      name: "Open the doors",
      description: "Complete the gym's opening career bout.",
      current: s.boutsCompleted,
      target: 1,
      unit: "bout",
      href: "/career/fights",
    },
    {
      id: "fight-team",
      tier: 2,
      name: "Build your corner",
      description:
        "Own one fighter in each of the four divisions to build a complete corner.",
      current: DIVISIONS.length - missingDivisions(s).length,
      target: 4,
      unit: "divisions covered",
      href: "/career/scouting",
    },
    {
      id: "title-defense",
      tier: 3,
      name: "Keep the belt",
      description: "Defend a regional championship in the cage.",
      current: earnedChampionships.reduce(
        (sum, title) => sum + title.defenses,
        0,
      ),
      target: 1,
      unit: "title defense",
      href: "/career/fights",
    },
    {
      id: "team-trophy",
      tier: 4,
      name: "Win as a gym",
      description: "Bring home the three-fighter Career Invitational trophy.",
      current: s.careerJourney.completedWeek != null ? 1 : 0,
      target: 1,
      unit: "team trophy",
      href: "/career/campaign",
    },
    {
      id: "successor",
      tier: 5,
      name: "Pass it forward",
      description:
        "Complete a mentoring lesson, then win a career bout with that junior.",
      current: successorWins,
      target: 1,
      unit: "mentored fighter win",
      href: "/career/gym/mentoring",
    },
    {
      id: "division-dynasty",
      tier: 6,
      name: "A division dynasty",
      description:
        "Win earned regional championships in three different weight classes.",
      current: new Set(earnedChampionships.map((title) => title.weightClass))
        .size,
      target: 3,
      unit: "championship divisions",
      href: "/career/fights",
    },
  ];
  const promotedLevel = careerCircuit(s).level;
  return definitions.map((goal) => {
    const previous = definitions
      .slice(0, goal.tier - 1)
      .find(
        (entry) =>
          entry.tier > (s.progression?.grandfatherCircuitLevel || 0) &&
          !s.gymGoals?.[entry.id],
      );
    const waitingFor = previous
      ? { id: previous.id, name: previous.name, href: previous.href }
      : null;
    return {
      ...goal,
      current: s.gymGoals?.[goal.id]
        ? goal.target
        : Math.min(goal.target, goal.current),
      reward: `${CAREER.circuits[goal.tier - 1].name} competition and the ${goal.name} pennant`,
      complete: !!s.gymGoals?.[goal.id],
      deedComplete: !!s.gymGoals?.[goal.id],
      promoted: promotedLevel >= goal.tier,
      locked: !!waitingFor && !s.gymGoals?.[goal.id],
      waitingFor,
      prerequisiteLabel: waitingFor
        ? `Complete ${waitingFor.name} for this promotion. Earlier deeds stay recorded.`
        : null,
      earned: s.gymGoals?.[goal.id] || null,
    };
  });
}
function syncGymGoals(s, historical = false) {
  s.gymGoals ||= {};
  for (const goal of gymGoals(s)) {
    if (goal.current < goal.target || goal.complete) continue;
    s.gymGoals[goal.id] = {
      week: historical ? null : s.week,
      historical,
      badge: goal.name,
    };
    if (!historical)
      log(
        s,
        "gym-goal",
        `${goal.name} deed complete. Your gym earns its pennant. Circuit promotion follows the completed chapter order.`,
      );
  }
}
function careerCircuit(s) {
  let level = Math.max(1, s.progression?.grandfatherCircuitLevel || 1);
  while (
    level < CAREER.circuits.length &&
    s.gymGoals?.[CAREER.circuits[level].goalId] &&
    (level > 1 || s.gymGoals?.[CAREER.circuits[0].goalId])
  )
    level++;
  const index = level - 1;
  const current = CAREER.circuits[index];
  const next = CAREER.circuits[index + 1];
  return {
    ...clone(current),
    level,
    next: next
      ? {
          id: next.id,
          goalId: next.goalId,
          name: next.name,
          requirement: next.requirement,
          show: next.show,
          winBonus: next.winBonus,
        }
      : null,
  };
}
function challengeOptions(s, fighter = null) {
  return CAREER.challenges.map((spec) => {
    const completed = s.careerChallenges?.[spec.id] || null;
    const signed = s.fights.find(
      (b) => b.challengeId === spec.id && b.status !== "resolved",
    );
    const missingChallenges = (spec.requiresChallenges || []).filter(
      (id) => !s.careerChallenges[id],
    );
    const circuitUnlocked = spec.requiresInvitational
      ? s.careerJourney.completedWeek != null
      : careerCircuit(s).level >=
        CAREER.circuits.findIndex(
          (circuit) => circuit.goalId === spec.unlockGoal,
        ) +
          1;
    // Existing invitations and trophies survive the new finale order.
    const unlocked =
      !!completed || !!signed || (circuitUnlocked && !missingChallenges.length);
    const qualified = (member) =>
      !spec.requireMentoredFighter ||
      s.mentoring.some(
        (p) =>
          p.juniorId === member.id &&
          ["completed", "succeeded"].includes(p.status),
      );
    const entryFor = (member) => {
      if (!member)
        return spec.requireMentoredFighter
          ? {
              blockedReason:
                "Complete a mentoring lesson with an active fighter before entering this challenge.",
              href: "/career/gym/mentoring",
              actionLabel: "Prepare a mentored successor",
            }
          : {
              blockedReason: "Recruit an active fighter for this challenge.",
              href: "/career/scouting",
              actionLabel: "Recruit your challenge fighter",
            };
      if (!qualified(member))
        return {
          blockedReason:
            "Choose a fighter who has completed a mentoring lesson.",
          href: "/career/gym/mentoring",
          actionLabel: "Prepare a mentored successor",
        };
      const opponentId = `challenge-${spec.id}-${member.weightClass}`;
      const bout =
        pendingFight(s, member.id) ||
        s.fights.find(
          (b) => b.opponentId === opponentId && b.status !== "resolved",
        );
      if (bout)
        return {
          blockedReason:
            "Finish the already-booked bout before entering this challenge.",
          href: ["ready", "live"].includes(bout.status)
            ? `/career/fight-night/${bout.id}`
            : `/career/gym/training/${bout.fighterId}`,
          actionLabel: ["ready", "live"].includes(bout.status)
            ? "Finish the booked bout"
            : "Prepare the booked bout",
        };
      if (pairFor(s, member.id))
        return {
          blockedReason:
            "Finish this fighter's current mentoring lesson first.",
          href: "/career/gym/mentoring",
          actionLabel: "Finish the current mentoring lesson",
        };
      const terms = CAREER.circuits.find((c) => c.goalId === spec.unlockGoal);
      const qualification = circuitEntry(s, member, terms);
      if (qualification && !qualification.qualified)
        return {
          blockedReason: qualification.description,
          href: `/career/booking/${member.id}`,
          actionLabel: `Qualify ${member.name} with career wins`,
        };
      if ((member.nextBoutWeek || 0) > s.week + 4)
        return {
          blockedReason:
            "This fighter's post-fight turnaround ends after the challenge date.",
          href: `/career/gym/training/${member.id}`,
          actionLabel: `Recover ${member.name} for the challenge`,
        };
      if (member.camp && member.camp.endWeek > s.week + 4)
        return {
          blockedReason: "This fighter's camp ends after the challenge date.",
          href: `/career/gym/training/${member.id}`,
          actionLabel: `Finish ${member.name}'s camp`,
        };
      return {
        blockedReason: null,
        href: `/career/booking/${member.id}`,
        actionLabel: `Enter ${spec.name}`,
        opponentId,
      };
    };
    // Journey and gym cards choose a fighter who can actually take this
    // contract. Explicit booking checks still evaluate the selected fighter.
    const candidates = active(s)
      .filter(qualified)
      .sort(
        (a, b) => b.rankingPoints - a.rankingPoints || a.id.localeCompare(b.id),
      );
    const chosen =
      fighter ||
      candidates.find((member) => !entryFor(member).blockedReason) ||
      candidates[0] ||
      null;
    const entry = entryFor(chosen);
    const blockedReason = completed
      ? "This trophy is already in your gym."
      : !unlocked
        ? circuitUnlocked && missingChallenges.length
          ? `Before the finale, win ${missingChallenges.map((id) => CAREER.challenges.find((c) => c.id === id).name).join(" and ")}.`
          : spec.requiresInvitational
            ? "Win the Career Invitational. A State circuit promotion is not required for this invitation."
            : CAREER.circuits.find((c) => c.goalId === spec.unlockGoal)
                ?.requirement || "Complete the matching club milestone."
        : entry.blockedReason;
    const legacyReward = {
      legacy: spec.reward.legacy,
      trophy: spec.reward.trophy,
    };
    const visibleReward = completed
      ? completed.reward || legacyReward
      : signed
        ? signed.challengeReward || legacyReward
        : spec.reward;
    return {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      reward: clone(visibleReward),
      complete: !!completed,
      earned: completed,
      locked: !unlocked,
      prerequisites: missingChallenges,
      blockedReason,
      canEnter: !blockedReason,
      fighterId: chosen?.id || null,
      opponentId: entry.opponentId || null,
      href: completed
        ? "/career/gym/facilities"
        : !unlocked
          ? "/career/campaign"
          : entry.href,
      actionLabel: completed
        ? "View your club trophies"
        : !unlocked
          ? `Work toward ${spec.name}`
          : entry.actionLabel,
    };
  });
}
function ensureChallenges(s) {
  s.careerChallenges ||= {};
  const challengePlans = {
    "national-showcase": {
      approach: "strike",
      pace: "measured",
      finish: "play-safe",
      conserveBelow: 30,
    },
    "next-generation": {
      approach: "grapple",
      pace: "measured",
      finish: "hunt-finish",
      conserveBelow: 30,
    },
    "world-open": {
      approach: "balanced",
      pace: "measured",
      finish: "hunt-finish",
      conserveBelow: 40,
    },
  };
  for (const spec of CAREER.challenges)
    for (const weightClass of DIVISIONS) {
      const id = `challenge-${spec.id}-${weightClass}`;
      const existing = s.rivals.find((r) => r.id === id);
      if (existing) {
        if (
          !existing.contentVersion &&
          !s.fights.some((b) => b.opponentId === id && b.status !== "resolved")
        ) {
          existing.gameplan = clone(challengePlans[spec.id]);
          existing.contentVersion = 2;
        }
        continue;
      }
      const opponent = makeFighter(`${s.seed}:${id}`, id, {
        weightClass,
        style: spec.style,
        age: 28,
        name: spec.opponentNames[DIVISIONS.indexOf(weightClass)],
        rarity: "contender",
      });
      opponent.stats = clone(spec.stats);
      opponent.potential = Object.fromEntries(
        STAT_KEYS.map((key) => [key, 99]),
      );
      opponent.circuitChallenge = spec.id;
      opponent.description = spec.description;
      opponent.gymName = spec.name;
      opponent.gameplan = clone(challengePlans[spec.id]);
      opponent.contentVersion = 2;
      s.rivals.push(opponent);
    }
}
function ensureCircuitOpponents(s) {
  for (const pack of CAREER.circuitPacks)
    for (const profile of pack.opponents)
      for (const [division, weightClass] of DIVISIONS.entries()) {
        const id = `circuit-${pack.circuitId}-${profile.id}-${weightClass}`;
        if (s.rivals.some((r) => r.id === id)) continue;
        const opponent = makeFighter(`${s.seed}:${id}`, id, {
          weightClass,
          style: profile.style,
          age: 27,
          name: profile.names[division],
          rarity: "contender",
        });
        opponent.stats = clone(profile.stats);
        opponent.potential = Object.fromEntries(
          STAT_KEYS.map((key) => [key, 99]),
        );
        opponent.traits = [];
        opponent.discoveredTraits = [];
        opponent.gameplan = clone(profile.gameplan);
        opponent.circuitOpponentId = profile.id;
        opponent.circuitId = pack.circuitId;
        opponent.capstone = !!profile.capstone;
        opponent.description = profile.description;
        opponent.gymName = CAREER.circuits.find(
          (c) => c.id === pack.circuitId,
        ).name;
        s.rivals.push(opponent);
      }
}
function ensureTitleChallengers(s) {
  for (const champion of active(s).filter((f) => f.isChampion)) {
    if (pendingFight(s, champion.id)) continue;
    const candidates = s.rivals.filter(
      (r) =>
        !r.retired &&
        !r.invitational &&
        !r.circuitChallenge &&
        !r.circuitOpponentId &&
        r.weightClass === champion.weightClass &&
        r.rankingPoints >= CAREER.titleShotPoints &&
        !s.fights.some((b) => b.opponentId === r.id && b.status !== "resolved"),
    );
    const credible = (r) =>
      skillAverage(r) >=
        Math.min(66, skillAverage(champion) - TITLE_DEMAND.maxSkillGap) &&
      winsAgainst(s, r.id) < TITLE_DEMAND.repeatWins;
    if (candidates.some(credible)) continue;
    const serial =
      s.rivals.filter((r) =>
        r.id.startsWith(`title-challenger-${champion.weightClass}-`),
      ).length + 1;
    const id = `title-challenger-${champion.weightClass}-${serial}`;
    const challenger = makeFighter(`${s.seed}:${id}`, id, {
      weightClass: champion.weightClass,
      style: serial % 2 ? "wrestling" : "boxing",
      age: 26,
      rarity: "contender",
    });
    challenger.stats =
      serial % 2
        ? { striking: 46, grappling: 54, submissions: 49, conditioning: 50 }
        : { striking: 54, grappling: 47, submissions: 43, conditioning: 53 };
    // New challengers develop with the regional champion, up to a regional
    // ceiling. Existing rivals and accepted opponent snapshots never change.
    const target = Math.min(66, Math.max(50, skillAverage(champion) - 8));
    const growth = Math.max(0, target - skillAverage(challenger));
    challenger.stats = Object.fromEntries(
      STAT_KEYS.map((key) => [key, precise(challenger.stats[key] + growth)]),
    );
    challenger.rankingPoints = CAREER.titleShotPoints;
    challenger.record = { wins: 6, losses: 2, draws: 0, kos: 2, subs: 1 };
    challenger.gymName = "Regional title challenger";
    challenger.description =
      "A qualified 80-point challenger for the regional belt. This is a five-round title defense.";
    challenger.gameplan = {
      approach: serial % 2 ? "grapple" : "strike",
      pace: "measured",
      finish: "hunt-finish",
      conserveBelow: 30,
    };
    s.rivals.push(challenger);
  }
}
function syncSignatureProgress(s) {
  for (const f of s.fighters) {
    f.signatureId = isSignatureId(f.signatureId) ? f.signatureId : null;
    f.signatureProgress ||= {};
    // An interrupted/cancelled camp is never a qualifying completion.
    f.signatureProgress.boutComplete = !!(
      f.signatureProgress.boutComplete ||
      s.fights.some((b) => b.fighterId === f.id && b.status === "resolved") ||
      f.history?.some((h) => h.type === "bout") ||
      [f.record?.wins, f.record?.losses, f.record?.draws].some((n) => n > 0)
    );
    f.signatureProgress.campComplete = !!(
      f.signatureProgress.campComplete ||
      f.history?.some((h) => h.type === "camp-complete") ||
      (f.lastCamp &&
        !f.lastCamp.interrupted &&
        !f.lastCamp.cancelled &&
        f.lastCamp.completed >= f.lastCamp.weeks)
    );
  }
}
function signatureAccess(s, f) {
  const boutComplete = !!f.signatureProgress?.boutComplete;
  const campComplete = !!f.signatureProgress?.campComplete;
  const eligible =
    ["elite", "legend"].includes(f.rarity) || (boutComplete && campComplete);
  const chosen = !!f.signatureId;
  const choiceIds = signatureChoicesFor(f.style);
  const booked = pendingFight(s, f.id);
  const bookedVersion =
    booked?.combatVersion || (booked?.signatureVersion === 1 ? 4 : 3);
  const choiceBlocks = Object.fromEntries(
    choiceIds
      .filter(
        (id) =>
          booked?.status === "scheduled" &&
          signatureFor(id).minCombatVersion >= 6 &&
          signatureFor(id).minCombatVersion > bookedVersion,
      )
      .map((id) => [
        id,
        "Available after your booked fight. This contract keeps its original abilities.",
      ]),
  );
  const locked = !!(
    chosen ||
    f.retired ||
    f.released ||
    ["ready", "live"].includes(pendingFight(s, f.id)?.status)
  );
  const blockedReason = chosen
    ? "This fighter's signature is permanent and cannot be changed or removed."
    : f.retired || f.released
      ? "This fighter is no longer in the active corner."
      : locked
        ? "Fight inputs are locked. Choose a signature after this bout."
        : !eligible
          ? `Complete ${!boutComplete && !campComplete ? "one career bout and one full camp" : !boutComplete ? "one career bout" : "one full camp"} with this fighter.`
          : null;
  return {
    choiceIds,
    choiceBlocks,
    combatVersion: booked ? bookedVersion : CURRENT_FIGHT_VERSION,
    previousBalance:
      !!booked &&
      bookedVersion < CURRENT_FIGHT_VERSION &&
      (f.signatureId ? [f.signatureId] : choiceIds).some(
        (id) =>
          signatureFor(id, bookedVersion)?.effect !== signatureFor(id)?.effect,
      ),
    eligible,
    boutComplete,
    campComplete,
    chosen,
    locked,
    blockedReason,
  };
}
function careerCompletion(s) {
  const complete =
    careerCircuit(s).level === CAREER.circuits.length &&
    CAREER.challenges.every((c) => s.careerChallenges[c.id]);
  const challenge = challengeOptions(s).find((c) => !c.complete && !c.locked);
  const goal = gymGoals(s).find((g) => !g.complete && !g.locked);
  const nextAction = complete
    ? { label: "Take your corner to Gym Wars", href: "/career/gym-wars" }
    : challenge
      ? { label: challenge.actionLabel, href: challenge.href }
      : goal
        ? { label: goal.name, href: goal.href }
        : { label: "Choose your next opponent", href: "/career/fights" };
  return {
    complete,
    label: complete ? "Career complete" : "Your club story continues",
    description: complete
      ? "World promotion and all three club challenges earned. Keep developing your corner or compete in Gym Wars."
      : "Earn World promotion and win all three club challenges to complete the club career.",
    nextAction,
  };
}
function sportingGoals(s) {
  return CAREER.circuits.slice(1, careerCircuit(s).level).flatMap((circuit) => {
    if (s.circuitHonors[circuit.id]) return [];
    const pack = CAREER.circuitPacks.find((p) => p.circuitId === circuit.id);
    const beaten = new Set(
      s.fights
        .filter(
          (b) =>
            b.status === "resolved" &&
            b.result?.winner === "A" &&
            b.circuit?.id === circuit.id,
        )
        .map((b) => b.circuitOpponentId),
    );
    const opponents = pack.opponents.filter((p) => !p.capstone);
    const current = opponents.filter((p) => beaten.has(p.id)).length;
    const fighter = active(s)
      .filter((f) => circuitEntry(s, f, circuit).qualified)
      .sort((a, b) => skillAverage(b) - skillAverage(a))[0];
    const signed = s.fights.find(
      (b) =>
        b.capstone && b.circuit?.id === circuit.id && b.status !== "resolved",
    );
    return [
      {
        id: circuit.id,
        name: `${circuit.name.replace(" circuit", "")} proving night`,
        description:
          current === opponents.length
            ? "Your gym has beaten both styles. Win the capstone bout to earn this permanent circuit honor."
            : "Beat both circuit styles to earn the capstone invitation, then win its permanent club honor.",
        current,
        target: opponents.length + 1,
        cash: signed
          ? signed.honorReward?.cash || 0
          : CIRCUIT_HONOR_PRIZES[circuit.id],
        action: signed
          ? {
              label: "Prepare the proving night",
              href: `/career/bout/${signed.id}`,
            }
          : fighter
            ? {
                label: "View circuit opponents",
                href: `/career/booking/${fighter.id}?circuit=${circuit.id}`,
              }
            : {
                label: "Qualify a fighter with career wins",
                href: "/career/fights",
              },
      },
    ];
  });
}
function ambitionProjection(s, selection) {
  const f = selection.fighterId
    ? s.fighters.find((entry) => entry.id === selection.fighterId)
    : null;
  const available = !selection.fighterId || (f && !f.retired && !f.released);
  let goalBlockedReason = null;
  let label,
    current = 0,
    target = 1,
    nextAction = { label: "Choose your next opponent", href: "/career/fights" };
  const goal = gymGoals(s);
  const fightAction = (fighter) => {
    if (!fighter || fighter.retired || fighter.released)
      return { label: "Choose another fighter", href: "/career/roster" };
    const bout = pendingFight(s, fighter.id);
    return bout
      ? ["ready", "live"].includes(bout.status)
        ? { label: "Enter fight night", href: `/career/fight-night/${bout.id}` }
        : {
            label: "Prepare this fighter",
            href: `/career/gym/training/${fighter.id}`,
          }
      : { label: "Choose an opponent", href: `/career/booking/${fighter.id}` };
  };
  switch (selection.goalId) {
    case "complete-corner":
      label = "Build a complete corner";
      target = 4;
      current = goal.find((g) => g.id === "fight-team").complete
        ? 4
        : 4 - missingDivisions(s).length;
      nextAction = {
        label: "Recruit a missing division",
        href: "/career/scouting",
      };
      break;
    case "first-belt":
      label = f ? `${f.name}: win a regional belt` : "Win a regional belt";
      current = (f
        ? f.championships
        : s.fighters.flatMap((entry) => entry.championships)
      ).some((t) => !t.vacant || t.defenses > 0)
        ? 1
        : 0;
      nextAction = fightAction(
        f || active(s).sort((a, b) => b.rankingPoints - a.rankingPoints)[0],
      );
      break;
    case "defend-belt":
      label = f ? `${f.name}: keep the belt` : "Keep a regional belt";
      current = (f
        ? f.championships
        : s.fighters.flatMap((entry) => entry.championships)
      ).some((t) => t.defenses > 0)
        ? 1
        : 0;
      nextAction = fightAction(
        f || active(s).find((entry) => entry.isChampion),
      );
      break;
    case "mentored-win":
      label = f ? `${f.name}: win after mentoring` : "Pass it forward";
      current = s.mentoring.some(
        (lesson) =>
          (!f || lesson.juniorId === f.id) &&
          ["completed", "succeeded"].includes(lesson.status) &&
          s.fights.some(
            (b) =>
              b.fighterId === lesson.juniorId &&
              b.status === "resolved" &&
              b.result?.winner === "A" &&
              b.resolvedWeek >= (lesson.completedWeek ?? lesson.endWeek),
          ),
      )
        ? 1
        : 0;
      nextAction =
        f &&
        s.mentoring.some(
          (lesson) =>
            lesson.juniorId === f.id &&
            ["completed", "succeeded"].includes(lesson.status),
        )
          ? fightAction(f)
          : {
              label: "Choose a mentoring lesson",
              href: "/career/gym/mentoring",
            };
      break;
    case "club-challenge": {
      const challenge = challengeOptions(s, f).find(
        (c) => c.id === selection.challengeId,
      );
      label = challenge?.name || "Win a club challenge";
      current = challenge?.complete ? 1 : 0;
      nextAction = challenge
        ? { label: challenge.actionLabel, href: challenge.href }
        : nextAction;
      if (challenge?.locked) {
        goalBlockedReason = challenge.blockedReason;
        nextAction = {
          label: "See the unlock path",
          href: "/career/campaign#club-levels",
        };
      }
      break;
    }
    case "division-dynasty": {
      const deed = goal.find((g) => g.id === "division-dynasty");
      label = deed.name;
      target = deed.target;
      current = deed.complete ? target : deed.current;
      nextAction = {
        label: "Find your next title contender",
        href: "/career/roster",
      };
      break;
    }
    case "career-complete": {
      const completion = careerCompletion(s);
      label = "Complete the club career";
      target = CAREER.challenges.length + 1;
      current =
        Object.keys(s.careerChallenges).filter((id) =>
          CAREER.challenges.some((c) => c.id === id),
        ).length + (careerCircuit(s).level === CAREER.circuits.length ? 1 : 0);
      nextAction = completion.nextAction;
      break;
    }
    default:
      return null;
  }
  const complete = selection.completedWeek != null || current >= target;
  const status = complete ? "complete" : available ? "active" : "unavailable";
  const subject = selection.fighterId
    ? f?.name || "your chosen fighter"
    : "one of your fighters";
  let description, payoff, progressUnit;
  switch (selection.goalId) {
    case "complete-corner":
      description = `Recruit and keep an active fighter in every weight class: ${DIVISIONS.map((division) => division[0].toUpperCase() + division.slice(1)).join(", ")}.`;
      payoff = "Opens Gym Wars and earns City circuit entry after your debut.";
      progressUnit = "divisions covered";
      break;
    case "first-belt":
      description = `Earn ${CAREER.titleShotPoints} title-eligibility points with ${subject}, then book and win a regional championship bout.`;
      payoff = "A regional belt and the chance to defend it.";
      progressUnit = "belts won";
      break;
    case "defend-belt":
      description = `Win a regional title defense with ${subject} against a qualified challenger.`;
      payoff =
        "Records a title defense and earns State circuit entry after City.";
      progressUnit = "title defenses won";
      break;
    case "mentored-win":
      description = `Complete a mentoring lesson with ${subject} as the learner, then win a career bout with that fighter.`;
      payoff =
        "Earns Champions circuit entry after National and opens Next Generation.";
      progressUnit = "wins after mentoring";
      break;
    case "club-challenge": {
      const challenge = CAREER.challenges.find(
        (entry) => entry.id === selection.challengeId,
      );
      description =
        challenge?.id === "national-showcase"
          ? "Win the Career Invitational, then beat the invited national striker in a career bout."
          : challenge?.id === "next-generation"
            ? "Earn Champions circuit entry, then beat the invited ground specialist with a fighter who completed a mentoring lesson."
            : "Earn World circuit entry, then beat the final invited opponent in a career bout.";
      payoff = challenge
        ? `${challenge.reward.trophy} and +${challenge.reward.legacy} reputation.`
        : "Adds a challenge victory to your club history.";
      progressUnit = "challenge victories";
      break;
    }
    case "division-dynasty":
      description =
        "Win regional championships in three different weight classes across your gym.";
      payoff =
        "Earns World circuit entry after Champions and opens World Open.";
      progressUnit = "championship divisions";
      break;
    case "career-complete":
      description = `Earn World circuit entry and win all three club challenges: ${CAREER.challenges.map((challenge) => challenge.name).join(", ")}.`;
      payoff =
        "Completes your club's career story. Keep developing fighters or compete in Gym Wars.";
      progressUnit = "career milestones";
      break;
  }
  return {
    ...clone(selection),
    label,
    description,
    payoff,
    blockedReason: goalBlockedReason,
    status,
    progress: {
      current: complete ? target : Math.min(current, target),
      target,
      label: `${complete ? target : Math.min(current, target)} / ${target} ${progressUnit}`,
    },
    nextAction:
      status === "unavailable"
        ? {
            label: "Choose another club goal",
            href: "/career/campaign#club-goals",
          }
        : complete
          ? {
              label: "Choose your next club goal",
              href: "/career/campaign#club-goals",
            }
          : nextAction,
  };
}
function ambitionOptions(s) {
  const definitions = [
    { goalId: "complete-corner" },
    { goalId: "first-belt" },
    { goalId: "defend-belt" },
    { goalId: "mentored-win" },
    ...CAREER.challenges.map((c) => ({
      goalId: "club-challenge",
      challengeId: c.id,
    })),
    { goalId: "division-dynasty" },
    { goalId: "career-complete" },
  ];
  for (const f of active(s)) {
    definitions.push({ goalId: "first-belt", fighterId: f.id });
    if (f.isChampion)
      definitions.push({ goalId: "defend-belt", fighterId: f.id });
    if (
      s.mentoring.some(
        (lesson) =>
          lesson.juniorId === f.id &&
          ["completed", "succeeded"].includes(lesson.status),
      )
    )
      definitions.push({ goalId: "mentored-win", fighterId: f.id });
  }
  return definitions.map((selection) => ({
    ...ambitionProjection(s, selection),
    canSelect: true,
  }));
}
function syncAmbition(s, historical = false) {
  if (!s.selectedAmbition || s.selectedAmbition.completedWeek != null) return;
  const projection = ambitionProjection(s, s.selectedAmbition);
  if (projection?.status === "complete") {
    s.selectedAmbition.completedWeek = s.week;
    s.ambitionHistory.push({
      ...clone(s.selectedAmbition),
      status: "complete",
      historical,
    });
    s.ambitionHistory = s.ambitionHistory.slice(-100);
    if (!historical)
      log(
        s,
        "ambition-complete",
        `Ambition complete: ${projection.label}.`,
        s.selectedAmbition.fighterId || null,
      );
  }
}
function invitationalOptions(s) {
  const spec = CAREER.invitational;
  const journey = s.careerJourney;
  const attempt = journey.attempts.at(-1) || null;
  const eventWeek = s.week + spec.notice;
  const fighters = active(s).map((f) => {
    const blockedReason = pendingFight(s, f.id)
      ? "Finish this fighter's booked bout first."
      : pairFor(s, f.id)
        ? "Finish this fighter's mentoring first."
        : (f.nextBoutWeek || 0) > eventWeek
          ? "This fighter's post-fight recovery ends after the Invitational date."
          : f.camp && f.camp.endWeek > eventWeek
            ? "This camp ends after the Invitational date."
            : null;
    return { id: f.id, eligible: !blockedReason, blockedReason };
  });
  const unlocked = !!journey.milestones.champion;
  const complete = journey.completedWeek != null;
  const blockedReason = complete
    ? "Your gym has already won the Invitational. Continue your career freely."
    : attempt?.status === "active"
      ? "Finish all three bouts on your current Invitational card."
      : !unlocked
        ? "Win a regional championship to earn your gym's invitation."
        : fighters.filter((f) => f.eligible).length < spec.teamSize
          ? "Bring three fighters whose schedules fit this event. Recruit or finish current commitments."
          : null;
  const bouts = attempt
    ? attempt.fightIds.map((fightId) => {
        const b = s.fights.find((fight) => fight.id === fightId);
        return {
          fightId,
          fighterId: b.fighterId,
          opponentId: b.opponentId,
          status: b.status,
          result:
            b.status !== "resolved"
              ? null
              : b.result.winner === "A"
                ? "win"
                : b.result.winner === "B"
                  ? "loss"
                  : "draw",
        };
      })
    : [];
  const status = complete
    ? "won"
    : attempt?.status === "active"
      ? bouts.some((b) => ["ready", "live"].includes(b.status))
        ? "live"
        : "scheduled"
      : attempt?.status === "lost"
        ? "lost"
        : unlocked
          ? "available"
          : "locked";
  return {
    name: spec.name,
    status,
    unlocked,
    canEnter: !blockedReason,
    blockedReason,
    teamSize: spec.teamSize,
    winsRequired: spec.winsRequired,
    entryFee: 0,
    notice: spec.notice,
    eventWeek: attempt?.status === "active" ? attempt.eventWeek : eventWeek,
    show: spec.show,
    winBonus: spec.winBonus,
    reward: clone(spec.reward),
    opponents: spec.opponents.map(({ gameplan, ...opponent }) =>
      clone(opponent),
    ),
    fighters,
    attempt: attempt ? { ...clone(attempt), bouts } : null,
  };
}
function careerJourney(s) {
  const milestones = s.careerJourney.milestones;
  const complete = s.careerJourney.completedWeek != null;
  const highestPoints = Math.max(0, ...active(s).map((f) => f.rankingPoints));
  const definitions = [
    {
      id: "debut",
      name: "Open the doors",
      description:
        "Take your first fighter to a regional bout. Learn what their preparation changes in the cage.",
      reward: "Unlock coaches, scouts, gym expansion and the veteran mentor.",
      current: s.boutsCompleted,
      target: 1,
      unit: "bout completed",
    },
    {
      id: "first-win",
      name: "Make your name",
      description:
        "Win a regional fight. Choose an opponent whose weaknesses fit your fighter's strengths.",
      reward: "Win bonus and 25 ranking points for the winning fighter.",
      current: s.fighters.reduce((n, f) => n + f.record.wins, 0),
      target: 1,
      unit: "win",
    },
    {
      id: "contender",
      name: "Earn a title shot",
      description:
        "Reach 80 ranking points with one fighter. A win adds 25, a draw adds 5 and a loss costs 8.",
      reward:
        "A guaranteed championship offer whenever the champion is available.",
      current: highestPoints,
      target: CAREER.titleShotPoints,
      unit: "ranking points",
    },
    {
      id: "champion",
      name: "Bring home the belt",
      description:
        "Beat a regional champion in a five-round title bout. The belt earns your whole gym an invitation.",
      reward: "Title purses and an invitation to the Career Invitational.",
      current: milestones.champion ? 1 : 0,
      target: 1,
      unit: "regional title won",
    },
    {
      id: "invitational",
      name: "Win as a gym",
      description:
        "Choose three fighters for three different matchups on one card. Win at least two bouts to become Invitational champions.",
      reward: "$3,000 gym prize, 100 legacy and the Invitational trophy.",
      current: s.careerJourney.attempts.at(-1)?.wins || 0,
      target: CAREER.invitational.winsRequired,
      unit: "wins on one Invitational card",
    },
  ];
  let foundCurrent = false;
  const stages = definitions.map(({ current, target, unit, ...stage }) => {
    const done = !!milestones[stage.id];
    const status = done ? "complete" : foundCurrent ? "locked" : "current";
    if (!done) foundCurrent = true;
    const amount = done ? target : Math.min(target, current);
    return {
      ...stage,
      complete: done,
      status,
      progress: {
        current: amount,
        target,
        label: `${amount} / ${target} ${unit}`,
      },
    };
  });
  const currentStageId =
    stages.find((stage) => stage.status === "current")?.id || null;
  const focus = [...active(s)].sort(
    (a, b) => b.rankingPoints - a.rankingPoints,
  )[0];
  const bout = focus && pendingFight(s, focus.id);
  const competition = invitationalOptions(s);
  const invitationalBout =
    competition.attempt?.status === "active"
      ? competition.attempt.bouts.find((b) =>
          ["ready", "live"].includes(b.status),
        )
      : null;
  const postInvitationalChallenge = complete
    ? challengeOptions(s).find(
        (challenge) => !challenge.complete && !challenge.locked,
      ) || null
    : null;
  const nextAction = complete
    ? postInvitationalChallenge
      ? {
          label: postInvitationalChallenge.actionLabel,
          href: postInvitationalChallenge.href,
        }
      : {
          label: "Build your next club chapter",
          href: "/career/gym/facilities",
        }
    : currentStageId === "invitational"
      ? invitationalBout
        ? {
            label: "Fight for the team trophy",
            href: `/career/fight-night/${invitationalBout.fightId}`,
          }
        : competition.attempt?.status === "active"
          ? { label: "Prepare your Invitational team", href: "/career/gym" }
          : active(s).length < competition.teamSize
            ? {
                label: "Recruit your Invitational teammates",
                href: "/career/scouting",
              }
            : {
                label: "Build your Invitational lineup",
                href: "/career/campaign",
              }
      : bout
        ? ["ready", "live"].includes(bout.status)
          ? {
              label: "Enter fight night",
              href: `/career/fight-night/${bout.id}`,
            }
          : {
              label: "Prepare your next fight",
              href: `/career/gym/training/${focus.id}`,
            }
        : focus
          ? {
              label:
                currentStageId === "champion"
                  ? focus.rankingPoints >= CAREER.titleShotPoints ||
                    focus.isChampion
                    ? "Find your title fight"
                    : "Regain title-shot eligibility"
                  : "Choose your next opponent",
              href: `/career/booking/${focus.id}`,
            }
          : { label: "Recruit your next fighter", href: "/career/scouting" };
  return {
    title: "From first bout to champion gym",
    complete,
    careerComplete: careerCompletion(s).complete,
    completion: careerCompletion(s),
    completedWeek: s.careerJourney.completedWeek,
    currentStageId,
    stages,
    nextAction: complete ? careerCompletion(s).nextAction : nextAction,
    postInvitationalChallenge,
    invitational: competition,
  };
}
function enterInvitational(s, fighterIds) {
  const options = invitationalOptions(s),
    spec = CAREER.invitational;
  requireThat(options.canEnter, options.blockedReason);
  requireThat(
    Array.isArray(fighterIds) &&
      fighterIds.length === spec.teamSize &&
      new Set(fighterIds).size === spec.teamSize,
    "Choose three different fighters for the Invitational.",
  );
  const team = fighterIds.map((id) => {
    const f = find(s, id),
      option = options.fighters.find((entry) => entry.id === id);
    requireThat(option.eligible, option.blockedReason);
    return f;
  });
  const id = `invitational-${s.careerJourney.attempts.length + 1}`;
  const attempt = {
    id,
    status: "active",
    eventWeek: options.eventWeek,
    fighterIds: [...fighterIds],
    fightIds: [],
    wins: 0,
    losses: 0,
    draws: 0,
    resolved: 0,
  };
  team.forEach((f, slot) => {
    const template = spec.opponents[slot];
    const opponent = makeFighter(
      `${s.seed}:invitational:${slot}`,
      `${id}-opponent-${slot}`,
      {
        name: template.name,
        style: template.style,
        weightClass: f.weightClass,
        age: 27,
        rarity: "contender",
      },
    );
    opponent.stats = clone(template.stats);
    opponent.traits = [];
    opponent.discoveredTraits = [];
    opponent.gameplan = clone(template.gameplan);
    opponent.gymName = "The Invitational Select";
    opponent.description = template.description;
    opponent.invitational = true;
    s.rivals.push(opponent);
    const fightId = `bout-${s.fights.length + 1}`;
    s.fights.push({
      id: fightId,
      fighterId: f.id,
      opponentId: opponent.id,
      seed: `${s.seed}:${id}:${slot}`,
      eventWeek: options.eventWeek,
      eventName: spec.name,
      competition: "invitational",
      invitationalId: id,
      status: "scheduled",
      rounds: 3,
      title: false,
      wasChampion: !!f.isChampion,
      show: spec.show,
      winBonus: spec.winBonus,
      engineVersion: CAREER.engineVersion,
      combatVersion: CURRENT_FIGHT_VERSION,
      signatureVersion: 1,
      opponentSnapshot: clone(opponent),
      decisions: [],
    });
    attempt.fightIds.push(fightId);
  });
  s.careerJourney.attempts.push(attempt);
  log(
    s,
    "invitational",
    `${s.name} enters the Gym Wars Invitational. Three matchups, one card: win at least two bouts for the trophy.`,
  );
}
function settleInvitational(s, b) {
  if (!b.invitationalId) return;
  const attempt = s.careerJourney.attempts.find(
    (entry) => entry.id === b.invitationalId,
  );
  if (!attempt || attempt.status !== "active") return;
  const bouts = attempt.fightIds.map((id) =>
    s.fights.find((fight) => fight.id === id),
  );
  const resolved = bouts.filter((fight) => fight.status === "resolved");
  attempt.resolved = resolved.length;
  attempt.wins = resolved.filter((fight) => fight.result.winner === "A").length;
  attempt.losses = resolved.filter(
    (fight) => fight.result.winner === "B",
  ).length;
  attempt.draws = resolved.filter(
    (fight) => fight.result.winner === "draw",
  ).length;
  if (resolved.length !== CAREER.invitational.teamSize) return;
  attempt.status =
    attempt.wins >= CAREER.invitational.winsRequired ? "won" : "lost";
  attempt.completedWeek = s.week;
  for (const fight of bouts)
    s.rivals.find((r) => r.id === fight.opponentId).retired = true;
  if (attempt.status === "won") {
    s.careerJourney.completedWeek = s.week;
    s.cash += CAREER.invitational.reward.cash;
    cashFlow(s, CAREER.invitational.reward.cash, "invitational-trophy");
    s.legacy += CAREER.invitational.reward.legacy;
    attempt.reward = clone(CAREER.invitational.reward);
    log(
      s,
      "campaign-complete",
      `Career Invitational champions! ${s.name} wins ${attempt.wins} of 3 bouts, the trophy, $${CAREER.invitational.reward.cash} and ${CAREER.invitational.reward.legacy} legacy. Next: the National Showcase invitation is open.`,
    );
  } else {
    log(
      s,
      "invitational",
      `The Invitational ends with ${attempt.wins} wins, ${attempt.losses} losses and ${attempt.draws} draws. Recover, adjust your matchups and enter again; your invitation remains open.`,
    );
  }
}
function makeBoard(s) {
  const missing = missingDivisions(s);
  return Array.from({ length: CAREER.boardSize }, (_, i) => {
    // Identity is fixed on the board; rarity is rolled only when investigated.
    const f = makeFighter(
      `${s.seed}:prospect:${s.week}:${i}`,
      `prospect-${s.week}-${i}`,
      missing[i] ? { weightClass: missing[i] } : {},
    );
    return {
      id: f.id,
      fighter: f,
      investigated: false,
      signed: false,
      fee: null,
    };
  });
}
function ensureBoardCoverage(s) {
  // A rollout never rewrites a report the player has seen. Append a coverage
  // invitation only when an existing board lacks an entire needed division.
  for (const weightClass of missingDivisions(s)) {
    if (s.board.some((r) => !r.signed && r.fighter.weightClass === weightClass))
      continue;
    const id = `coverage-${s.week}-${weightClass}`;
    s.board.push({
      id,
      fighter: makeFighter(`${s.seed}:${id}`, id, { weightClass }),
      investigated: false,
      signed: false,
      fee: null,
    });
  }
}
function freshScouting() {
  return {
    investigations: 0,
    pity: Object.fromEntries(
      Object.keys(PITY_THRESHOLDS).map((tier) => [tier, 0]),
    ),
  };
}
function upgradeCareer(input) {
  const s = clone(input);
  s.calendarStart ||= "2026-10-05";
  // Old saves acquire empty equipment only in this cloned state. Public reads
  // never rewrite the stored save or grant bonuses retroactively.
  s.departments ||= {};
  requireThat(
    [1, 2, CAREER.version].includes(s.version),
    "Unsupported career save version.",
  );
  if (s.version === 1) {
    // Historical misses were not recorded. Start guarantees at zero without
    // changing any existing fighter, revealed report, fight or command receipt.
    s.scouting = freshScouting();
  }
  if (!s.progression) {
    const grandfatherCircuitLevel = CAREER.circuits.reduce(
      (highest, circuit, i) =>
        s.gymGoals?.[circuit.goalId] ? Math.max(highest, i + 1) : highest,
      1,
    );
    s.progression = {
      version: 1,
      grandfatherCircuitLevel,
      grandfatherExpansionTier: Math.max(s.facilityTier, s.upgrade?.tier || 0),
    };
    for (const b of s.fights.filter((bout) => bout.status === "scheduled")) {
      b.combatVersion ||= 3;
      b.signatureVersion = 0;
    }
  }
  s.version = CAREER.version;
  s.circuitHonors ||= {};
  s.ambitionHistory ||= [];
  syncJourney(s, true);
  syncGymGoals(s, true);
  ensureChallenges(s);
  ensureCircuitOpponents(s);
  ensureTitleChallengers(s);
  ensureBoardCoverage(s);
  syncSignatureProgress(s);
  syncAmbition(s, true);
  return s;
}
function createCareer({ seed, name, style = "boxing" }) {
  requireThat(
    typeof name === "string" &&
      name.trim().length >= 3 &&
      name.trim().length <= 30,
    "Gym name must be 3–30 characters.",
  );
  requireThat(
    Object.hasOwn(STYLES, style),
    "Choose a supported fighting style.",
  );
  const s = {
    version: CAREER.version,
    progression: {
      version: 1,
      grandfatherCircuitLevel: 1,
      grandfatherExpansionTier: 1,
    },
    seed,
    name: name.trim(),
    week: 0,
    calendarStart: "2026-10-05",
    cash: CAREER.startingCash,
    facilityTier: 1,
    upgrade: null,
    staff: {},
    departments: {},
    fighters: [],
    rivals: [],
    fights: [],
    mentoring: [],
    scoutsUsed: 0,
    scouting: freshScouting(),
    board: [],
    journal: [],
    telemetry: [],
    legacy: 0,
    boutsCompleted: 0,
    veteranSigned: false,
    circuitHonors: {},
    selectedAmbition: null,
    ambitionHistory: [],
    started: true,
  };
  const starter = makeFighter(`${seed}:starter`, "starter", {
    style,
    weightClass: "lightweight",
    age: 23,
    portrait: 0,
  });
  starter.stats = {
    striking: 43,
    grappling: 40,
    submissions: 38,
    conditioning: 44,
  };
  starter.stats[STYLE_FAMILIES[family(starter)].primaryStat] += 5;
  s.fighters.push(starter);
  const descriptions = [
    "Patient counter striker. Makes opponents work for every opening.",
    "Relentless wrestler. Dangerous early, vulnerable if forced to chase.",
    "Submission specialist. Keeps threatening from the bottom.",
    "The regional champion. A complete fighter with a long memory.",
  ];
  for (const wc of [
    "featherweight",
    "lightweight",
    "middleweight",
    "heavyweight",
  ]) {
    for (let i = 0; i < 4; i++) {
      const r = makeFighter(`${seed}:circuit:${wc}:${i}`, `rival-${wc}-${i}`, {
        weightClass: wc,
        style: ["boxing", "wrestling", "bjj", "muay-thai"][i],
        age: 24 + i * 2,
      });
      r.description = descriptions[i];
      r.gymName = [
        "Eastside Combat",
        "Iron Bridge",
        "Groundwork",
        "Summit MMA",
      ][i];
      r.rankingPoints = i === 3 ? 120 : 20 + i * 15;
      r.isChampion = i === 3;
      r.record.wins = 3 + i * 3;
      r.record.losses = i;
      if (i === 1) r.stats.conditioning = 31;
      if (i === 3) {
        for (const k of STAT_KEYS) r.stats[k] += 10;
        r.championships.push({ wonWeek: 0, defenses: 0 });
      }
      s.rivals.push(r);
    }
  }
  s.board = makeBoard(s);
  cashFlow(s, CAREER.startingCash, "starting-funds");
  milestone(s, starter, "signed", `${starter.name} is your first fighter.`);
  syncJourney(s);
  syncGymGoals(s);
  ensureChallenges(s);
  ensureCircuitOpponents(s);
  return s;
}
function offers(s, f) {
  if (pendingFight(s, f.id) || pairFor(s, f.id)) return [];
  const pool = s.rivals.filter(
    (r) =>
      !r.retired &&
      !r.invitational &&
      !r.circuitChallenge &&
      !r.circuitOpponentId &&
      r.weightClass === f.weightClass &&
      !s.fights.some((b) => b.opponentId === r.id && b.status !== "resolved"),
  );
  const eligible = pool.filter(
    (r) =>
      !r.isChampion ||
      f.rankingPoints >= CAREER.titleShotPoints ||
      f.isChampion,
  );
  const rng = createRng(`${s.seed}:offers:${s.week}:${f.id}`);
  const previous = [...s.fights]
    .reverse()
    .find((b) => b.fighterId === f.id && b.status === "resolved");
  const rematch = eligible.find((r) => r.id === previous?.opponentId);
  const titleOpponent = eligible
    .filter(
      (r) =>
        r.isChampion ||
        (f.isChampion && r.rankingPoints >= CAREER.titleShotPoints),
    )
    .sort((a, b) => {
      const score = (r) =>
        Number(winsAgainst(s, r.id) >= TITLE_DEMAND.repeatWins) * 1000 +
        Number(skillAverage(f) - skillAverage(r) > TITLE_DEMAND.maxSkillGap) *
          100 +
        winsAgainst(s, r.id);
      return score(a) - score(b) || skillAverage(b) - skillAverage(a);
    })[0];
  const selected = titleOpponent
    ? [
        titleOpponent,
        ...(rematch && rematch !== titleOpponent
          ? [rematch]
          : rng.sample(
              eligible.filter((r) => r !== titleOpponent),
              1,
            )),
      ]
    : rematch
      ? [
          rematch,
          ...rng.sample(
            eligible.filter((r) => r !== rematch),
            1,
          ),
        ]
      : rng.sample(eligible, 2);
  selected.sort((a, b) =>
    STAT_KEYS.reduce((n, k) => n + a.stats[k] - b.stats[k], 0),
  );
  const circuit = CAREER.circuits[0];
  const regular = selected.map((r, index) => {
    const title = !!(
      r.isChampion ||
      (f.isChampion && r.rankingPoints >= CAREER.titleShotPoints)
    );
    const shortNotice = index === 1 && !title;
    const notice = shortNotice ? 1 + (s.week % 2) : s.week % 3 === 2 ? 6 : 4;
    const eventWeek = s.week + notice;
    const unavailable =
      eventWeek < (f.nextBoutWeek || 0)
        ? "Your fighter is still in the post-fight recovery period."
        : f.camp && f.camp.endWeek > eventWeek
          ? "Your current camp ends after this event."
          : notice > 8
            ? "Finish the current commitment before taking another fight."
            : null;
    const rematching = r === rematch;
    return {
      id: r.id,
      offerId: `offer-${s.week}-${f.id}-${r.id}${title ? "-t2" : ""}`,
      eventWeek,
      expiresWeek: s.week + 1,
      notice,
      shortNotice,
      shortNoticePremium: shortNotice ? { ...SHORT_NOTICE_PREMIUM } : null,
      unavailable,
      eventName: shortNotice ? "Circuit Fight Night" : "Regional Showcase",
      headline: title
        ? "The belt is on the line"
        : rematching
          ? "Run it back"
          : shortNotice
            ? "The promoter needs a replacement"
            : "A place on the main card",
      story: rematching
        ? `You have history with ${r.name}. The promoter wants a rematch on this card.`
        : shortNotice
          ? `An opening on the card. ${r.gymName} has ${r.name} ready to go. Take the call with only ${notice} ${notice === 1 ? "week" : "weeks"} to prepare?`
          : `The regional matchmaker has paired ${f.name} with ${r.name}. A scheduled date gives you room to train, recover and make an impression.`,
      opponent: publicFighter(r),
      title,
      qualifiedDefense: !!(
        title &&
        f.isChampion &&
        r.rankingPoints >= CAREER.titleShotPoints
      ),
      rematch: rematching,
      circuit: { id: circuit.id, name: circuit.name, level: 1 },
      show: title
        ? circuit.titleShow
        : circuit.show + (shortNotice ? SHORT_NOTICE_PREMIUM.show : 0),
      winBonus: title
        ? circuit.titleWinBonus
        : circuit.winBonus +
          (r.rankingPoints >= 50 ? 130 : 0) +
          (shortNotice ? SHORT_NOTICE_PREMIUM.winBonus : 0),
    };
  });
  const unlocked = careerCircuit(s).level;
  // Each opponent owns its purse. An easy Regional rematch never inherits a
  // World club's rate. Lower promoted circuits remain available for recovery.
  for (const [index, terms] of CAREER.circuits.entries()) {
    if (index === 0 || index >= unlocked) continue;
    const pack = CAREER.circuitPacks.find(
      (entry) => entry.circuitId === terms.id,
    );
    const beaten = new Set(
      s.fights
        .filter(
          (b) =>
            b.status === "resolved" &&
            b.result?.winner === "A" &&
            b.circuit?.id === terms.id,
        )
        .map((b) => b.circuitOpponentId),
    );
    const archetypes = pack.opponents.filter((entry) => !entry.capstone);
    const candidates = s.rivals.filter(
      (r) =>
        r.circuitId === terms.id &&
        r.weightClass === f.weightClass &&
        !s.fights.some(
          (b) => b.opponentId === r.id && b.status !== "resolved",
        ) &&
        (!r.capstone || archetypes.every((entry) => beaten.has(entry.id))),
    );
    const featured =
      candidates.find((r) => r.capstone && !s.circuitHonors[terms.id]) ||
      candidates.find((r) => !beaten.has(r.circuitOpponentId)) ||
      [...candidates]
        .filter((r) => !r.capstone)
        .sort(
          (a, b) =>
            Math.abs(skillAverage(a) - skillAverage(f)) -
            Math.abs(skillAverage(b) - skillAverage(f)),
        )[0] ||
      candidates[0];
    const displayed =
      index === unlocked - 1 ? candidates : featured ? [featured] : [];
    for (const rival of displayed) {
      const notice = 4;
      const qualification = circuitEntry(s, f, terms);
      const honorReward =
        rival.capstone && !s.circuitHonors[terms.id]
          ? {
              cash: CIRCUIT_HONOR_PRIZES[terms.id],
              trophy: `${terms.name} honor`,
            }
          : null;
      regular.push({
        id: rival.id,
        offerId: `offer-${s.week}-${f.id}-${rival.id}${terms.purseVersion ? `-p${terms.purseVersion}` : ""}${honorReward ? "-h1" : ""}`,
        purseVersion: terms.purseVersion || 1,
        eventWeek: s.week + notice,
        expiresWeek: s.week + 1,
        notice,
        shortNotice: false,
        qualification,
        honorReward,
        unavailable: !qualification.qualified
          ? qualification.description
          : s.week + notice < (f.nextBoutWeek || 0)
            ? "Your fighter is still in the post-fight recovery period."
            : f.camp?.endWeek > s.week + notice
              ? "Your current camp ends after this event."
              : null,
        eventName: rival.capstone
          ? `${terms.name} capstone`
          : `${terms.name} showcase`,
        headline: rival.capstone
          ? "An earned circuit test"
          : "A promoted circuit opponent",
        story: rival.description,
        opponent: publicFighter(rival),
        title: false,
        rematch: beaten.has(rival.circuitOpponentId),
        circuit: { id: terms.id, name: terms.name, level: index + 1 },
        circuitOpponentId: rival.circuitOpponentId,
        capstone: !!rival.capstone,
        show: terms.show,
        winBonus: terms.winBonus,
      });
    }
  }
  const challenge = challengeOptions(s, f).find((entry) => entry.canEnter);
  if (!challenge) return regular.map((offer) => contractTerms(s, offer, f.id));
  const opponent = s.rivals.find((r) => r.id === challenge.opponentId);
  if (
    !opponent ||
    s.fights.some(
      (b) => b.opponentId === opponent.id && b.status !== "resolved",
    )
  )
    return regular.map((offer) => contractTerms(s, offer, f.id));
  const notice = 4;
  const unavailable =
    s.week + notice < (f.nextBoutWeek || 0)
      ? "Your fighter is still in the post-fight recovery period."
      : f.camp && f.camp.endWeek > s.week + notice
        ? "Your current camp ends after this event."
        : null;
  const challengeLevel = Math.max(
    1,
    CAREER.circuits.findIndex(
      (entry) =>
        entry.goalId ===
        CAREER.challenges.find((entry) => entry.id === challenge.id).unlockGoal,
    ) + 1,
  );
  const challengeTerms = CAREER.circuits[challengeLevel - 1];
  regular.push({
    id: opponent.id,
    offerId: `offer-${s.week}-${f.id}-${opponent.id}${challengeTerms.purseVersion ? `-p${challengeTerms.purseVersion}` : ""}`,
    purseVersion: challengeTerms.purseVersion || 1,
    eventWeek: s.week + notice,
    expiresWeek: s.week + 1,
    notice,
    shortNotice: false,
    unavailable,
    eventName: challenge.name,
    headline: "An earned club challenge",
    story: challenge.description,
    opponent: publicFighter(opponent),
    title: false,
    show: challengeTerms.show,
    winBonus: challengeTerms.winBonus,
    rematch: false,
    circuit: {
      id: challengeTerms.id,
      name: challengeTerms.name,
      level: challengeLevel,
    },
    challengeId: challenge.id,
    challengeReward: challenge.reward,
  });
  return regular.map((offer) => contractTerms(s, offer, f.id));
}
function trainingGain(f, allocation, coach, roomBonus = 0) {
  const mult =
    (phase(f) === "Rising" ? 1.3 : phase(f) === "Declining" ? 0.6 : 1) *
    coach *
    (1 + roomBonus);
  return allocation < 10
    ? -0.2 * (1 - allocation / 10)
    : 1.8 * (allocation / 100) * mult;
}
function trainWeek(s, f) {
  const c = f.camp;
  const bonuses = skillBonuses(s);
  c.completed += 1;
  const recovery = campRecoveryWeek(c, c.completed);
  if (!recovery) {
    creditStaffWork(s, "coach", "trainingWeeks");
    for (const key of STAT_KEYS) {
      const before = f.stats[key];
      const gain = trainingGain(
        f,
        c.allocations[key],
        coachMultiplier(s),
        bonuses[key],
      );
      f.stats[key] = precise(clamp(before + gain, 1, f.potential[key]));
      c.gains[key] = precise(c.gains[key] + f.stats[key] - before);
      if (gain > 0 && f.stats[key] >= f.potential[key]) {
        if (!c.stalled.includes(key)) c.stalled.push(key);
        f.growthKnowledge ||= {};
        f.growthKnowledge[key] ||= {
          plateau: true,
          observedWeek: s.week,
          observedAt: f.stats[key],
        };
      }
    }
    f.fatigue = clamp(f.fatigue + CAREER.fatiguePerWeek, 0, 100);
  } else {
    f.fatigue = round(Math.max(0, f.fatigue - recoveryPerWeek(s)));
  }
  if (c.completed >= c.weeks) {
    s.achievementStats = {
      ...s.achievementStats,
      camps: require("./achievements").metrics(s).camps + 1,
    };
    creditStaffWork(s, "coach", "campsCompleted", 1, { fighter: f, camp: c });
    const preset = CAREER.presets[c.preset];
    const preparationStat =
      preset.preparationStat ||
      (c.scheduleVersion >= 2 && c.weeks > 1 && c.commitmentBonus > 0
        ? "conditioning"
        : null);
    f.preparation = preparationStat
      ? {
          stat: preparationStat,
          value:
            (preset.preparationValue || 0) +
            (preset.preparationStat ? preparationBonus(s) : 0) +
            (c.commitmentBonus || 0),
          expiresWeek: s.week + 8,
        }
      : null;
    f.lastCamp = { ...c, endedWeek: s.week };
    f.signatureProgress ||= {};
    f.signatureProgress.campComplete = true;
    f.camp = null;
    milestone(
      s,
      f,
      "camp-complete",
      `${f.name} finished camp with ${round(Object.values(c.gains).reduce((a, b) => a + b, 0))} total stat growth.${f.preparation ? ` Next bout: +${f.preparation.value} ${f.preparation.stat} within 8 weeks; this replaces previous camp preparation.` : ""}${c.stalled.length ? ` Growth has stalled in ${c.stalled.join(", ")}.` : ""}`,
    );
  } else if (
    c.completed === Math.floor(c.weeks / 2) &&
    c.weeks > 3 &&
    !c.reviewed
  ) {
    c.needsReview = true;
    log(s, "camp-review", `${f.name} needs a camp midpoint decision.`, f.id);
  }
}
function forecast(s, f, allocations, weeks, start = s.week) {
  const fight = pendingFight(s, f.id);
  const schedule =
    f.camp &&
    weeks === f.camp.weeks - f.camp.completed &&
    STAT_KEYS.every((key) => f.camp.allocations[key] === allocations[key])
      ? f.camp
      : { weeks, completed: 0, scheduleVersion: CAREER.campScheduleVersion };
  let ending = f.fatigue;
  let recoveryWeeks = 0;
  for (let week = 0; week < weeks; week++) {
    if (campRecoveryWeek(schedule, schedule.completed + week + 1)) {
      ending = Math.max(0, ending - recoveryPerWeek(s));
      recoveryWeeks++;
    } else ending = Math.min(100, ending + CAREER.fatiguePerWeek);
  }
  const restWeeks = fight ? Math.max(0, fight.eventWeek - (start + weeks)) : 0;
  const readiness = round(
    100 - Math.max(0, ending - restWeeks * recoveryPerWeek(s)),
  );
  // Match accumulated weekly fractions and aging. Unobserved potential stays
  // private; only an actual, recorded plateau constrains a public forecast.
  const roomBonuses = skillBonuses(s);
  const gainsFor = (coach, rooms = roomBonuses) => {
    const projected = {
      ...f,
      age: f.age + (start - s.week) / CAREER.weeksPerYear,
      stats: { ...f.stats },
    };
    for (let week = 0; week < weeks; week++) {
      projected.age += 1 / CAREER.weeksPerYear;
      for (const key of STAT_KEYS) {
        const knownLimit = f.growthKnowledge?.[key]?.plateau
          ? f.growthKnowledge[key].observedAt
          : 99;
        projected.stats[key] = precise(
          clamp(
            projected.stats[key] +
              (campRecoveryWeek(schedule, schedule.completed + week + 1)
                ? 0
                : trainingGain(
                    projected,
                    allocations[key],
                    coach,
                    rooms[key] || 0,
                  )),
            1,
            knownLimit,
          ),
        );
        if (phase(projected) === "Declining")
          projected.stats[key] = precise(
            Math.max(
              1,
              projected.stats[key] - (key === "conditioning" ? 0.08 : 0.035),
            ),
          );
      }
      if (projected.age >= 40 && !fight) break;
    }
    return Object.fromEntries(
      STAT_KEYS.map((key) => [
        key,
        precise(projected.stats[key] - f.stats[key]),
      ]),
    );
  };
  const multiplier = coachMultiplier(s);
  const rawGains = gainsFor(multiplier);
  const displayGains = (gains) =>
    Object.fromEntries(STAT_KEYS.map((key) => [key, round(gains[key])]));
  const estimatedGains = displayGains(rawGains);
  const rawWithoutCoach = multiplier === 1 ? { ...rawGains } : gainsFor(1);
  const estimatedGainsWithoutCoach = displayGains(rawWithoutCoach);
  const extraGains = Object.fromEntries(
    STAT_KEYS.map((key) => [key, round(rawGains[key] - rawWithoutCoach[key])]),
  );
  const rawWithoutDepartments = gainsFor(multiplier, {});
  const estimatedGainsWithoutDepartments = displayGains(rawWithoutDepartments);
  const departmentExtra = Object.fromEntries(
    STAT_KEYS.map((key) => [
      key,
      round(rawGains[key] - rawWithoutDepartments[key]),
    ]),
  );
  return {
    endWeek: start + weeks,
    restWeeks,
    readiness,
    fatigueAtEnd: round(ending),
    trainingWeeks: weeks - recoveryWeeks,
    recoveryWeeks,
    estimatedGains,
    estimatedTotalGrowth: Math.max(
      0,
      round(Object.values(rawGains).reduce((sum, gain) => sum + gain, 0)),
    ),
    preciseGains: Object.fromEntries(
      STAT_KEYS.map((key) => [key, Math.round(rawGains[key] * 100) / 100]),
    ),
    recoveryPerWeek: recoveryPerWeek(s),
    departmentImpact: {
      skillBonuses: roomBonuses,
      estimatedGainsWithoutDepartments,
      extraGains: departmentExtra,
      totalExtraGain: round(
        Object.values(departmentExtra).reduce((sum, value) => sum + value, 0),
      ),
    },
    coachImpact: {
      rank: staffRank(s, "coach"),
      multiplier,
      bonusPercent: Math.round((multiplier - 1) * 100),
      estimatedGainsWithoutCoach,
      extraGains,
      totalExtraGain: round(
        Object.values(extraGains).reduce((sum, value) => sum + value, 0),
      ),
    },
    fightWeek: fight?.eventWeek ?? null,
    observedPlateaus: STAT_KEYS.filter(
      (key) => f.growthKnowledge?.[key]?.plateau,
    ),
  };
}
function equipmentSample(s, departmentId, level, f) {
  const allocations = CAREER.presets.balanced.allocations;
  const before = forecast(s, f, allocations, 4).preciseGains;
  const upgraded = {
    ...s,
    departments: { ...s.departments, [departmentId]: level },
  };
  const after = forecast(upgraded, f, allocations, 4).preciseGains;
  return {
    fighterId: f.id,
    fighterName: f.name,
    preset: "balanced",
    weeks: 4,
    before,
    after,
    extra: Object.fromEntries(
      STAT_KEYS.map((key) => [key, round(after[key] - before[key])]),
    ),
    recoveryBefore: recoveryPerWeek(s),
    recoveryAfter: recoveryPerWeek(upgraded),
    recoveryExamples: [25, 36, 54].map((fatigue) => ({
      fatigue,
      before: Math.ceil(fatigue / recoveryPerWeek(s)),
      after: Math.ceil(fatigue / recoveryPerWeek(upgraded)),
    })),
    preparationBefore: preparationBonus(s),
    preparationAfter: preparationBonus(upgraded),
  };
}
function engineInput(s, f) {
  const stats = clone(f.stats);
  for (const bonus of [f.preparation, f.mentoringPreparation])
    if (bonus && bonus.expiresWeek >= s.week) stats[bonus.stat] += bonus.value;
  return {
    name: f.name,
    stats,
    traits: f.traits,
    style: f.style,
    fatigue: f.fatigue,
    gameplan: clone(f.gameplan),
    signatureId: f.signatureId || null,
  };
}
function replay(b) {
  requireThat(
    ["career-1", "career-2", CAREER.engineVersion].includes(b.engineVersion),
    "This fight needs its saved engine version before it can resume.",
  );
  const state = beginFight({
    a: b.inputs.a,
    b: b.inputs.b,
    seed: b.seed,
    rounds: b.rounds,
    title: b.title,
    engineVersion: b.combatVersion || 1,
  });
  for (const choice of b.decisions) {
    state.A.gameplan = clone(choice.a);
    state.B.gameplan = clone(choice.b);
    advanceRound(state);
  }
  return state;
}
function automatic(p, corner) {
  const next = clone(p);
  if (
    p.conserveBelow > 0 &&
    (100 * corner.gas) / corner.gasMax < p.conserveBelow
  )
    next.pace = "cautious";
  return next;
}
function prepareFight(s, b) {
  if (b.inputs) return;
  const f = s.fighters.find((f) => f.id === b.fighterId),
    r = b.opponentSnapshot || s.rivals.find((r) => r.id === b.opponentId);
  b.inputs = { a: engineInput(s, f), b: engineInput(s, r) };
  b.combatVersion ||= b.signatureVersion === 1 ? 4 : 3;
  if (b.signatureVersion !== 1 || b.combatVersion < 4) {
    delete b.inputs.a.signatureId;
    delete b.inputs.b.signatureId;
  }
  b.status = "ready";
  b.preparedWeek = s.week;
  b.decisions = [];
  b.engineVersion = CAREER.engineVersion;
  b.savedPlan = clone(b.inputs.a.gameplan);
  b.preparation = Object.fromEntries(
    [
      ["you", f, b.inputs.a],
      ["them", r, b.inputs.b],
    ].map(([side, person, input]) => {
      const bonuses = [
        person.preparation && { ...person.preparation, source: "camp" },
        person.mentoringPreparation && {
          ...person.mentoringPreparation,
          source: "mentoring",
        },
      ].filter((bonus) => bonus && bonus.expiresWeek >= s.week);
      return [
        side,
        {
          baseStats: Object.fromEntries(
            STAT_KEYS.map((key) => [key, round(person.stats[key])]),
          ),
          effectiveStats: Object.fromEntries(
            STAT_KEYS.map((key) => [key, round(input.stats[key])]),
          ),
          stat: bonuses[0]?.stat || null,
          value: bonuses[0]?.value || 0,
          bonuses,
          signatureId: input.signatureId || null,
        },
      ];
    }),
  );
  b.readiness = { you: round(100 - f.fatigue), them: round(100 - r.fatigue) };
}
function applyRecord(f, won, lost, result) {
  if (won) {
    f.record.wins++;
    if (result.method === "SUB") f.record.subs++;
    if (["KO", "TKO"].includes(result.method)) f.record.kos++;
  } else if (lost) f.record.losses++;
  else f.record.draws++;
}
function retire(s, f) {
  if (f.retired) return;
  f.retired = true;
  f.isChampion = false;
  f.retiredWeek = s.week;
  f.camp = null;
  if (f.championships.length && f.championships.at(-1).endedWeek == null)
    f.championships.at(-1).endedWeek = s.week;
  for (const p of s.mentoring.filter(
    (p) => p.status === "active" && [p.mentorId, p.juniorId].includes(f.id),
  ))
    p.status = "interrupted";
  s.legacy += 10;
  milestone(
    s,
    f,
    "retired",
    `${f.name} retires. Their record stays in your Hall of Fame.`,
  );
  if (!active(s).some((teammate) => teammate.weightClass === f.weightClass))
    log(
      s,
      "division-vacancy",
      `Your ${f.weightClass} slot needs a successor. Recruit this division before your next complete Gym Wars card.`,
      f.id,
    );
}
function completeFight(s, b, state) {
  if (b.status === "resolved") return;
  const result = finishFight(state);
  const f = s.fighters.find((f) => f.id === b.fighterId),
    r = s.rivals.find((r) => r.id === b.opponentId);
  const won = result.winner === "A",
    lost = result.winner === "B";
  const oldWins = f.record.wins,
    oldLosses = f.record.losses;
  const rankingBefore = f.rankingPoints;
  const legacyBefore = s.legacy;
  const cashBefore = s.cash;
  const previous = s.fights.filter(
    (x) =>
      x.status === "resolved" && x.fighterId === f.id && x.opponentId === r.id,
  ).length;
  applyRecord(f, won, lost, result);
  f.signatureProgress ||= {};
  f.signatureProgress.boutComplete = true;
  applyRecord(r, lost, won, result);
  if (b.competition !== "invitational") {
    f.rankingPoints = Math.max(0, f.rankingPoints + (won ? 25 : lost ? -8 : 5));
    r.rankingPoints = Math.max(0, r.rankingPoints + (lost ? 20 : won ? -8 : 5));
  }
  b.purse = b.show + (won ? b.winBonus : 0);
  s.cash += b.purse;
  cashFlow(s, b.purse, "fight-purse", {
    fighterId: f.id,
    circuitId: b.circuit?.id || "regional",
    fightId: b.id,
  });
  s.boutsCompleted++;
  if (b.title && result.winner !== "draw") {
    const winner = won ? f : r,
      loser = won ? r : f;
    if (winner.isChampion) {
      winner.championships.at(-1).defenses++;
      if (won) s.legacy += 20;
    } else {
      winner.championships.push({ wonWeek: s.week, defenses: 0 });
      if (won) s.legacy += 50;
    }
    if (loser.championships.length && loser.isChampion)
      loser.championships.at(-1).endedWeek = s.week;
    for (const person of [...s.fighters, ...s.rivals].filter(
      (x) => x.weightClass === f.weightClass,
    ))
      person.isChampion = person.id === winner.id;
    if (won)
      milestone(
        s,
        f,
        "championship",
        `${f.name} ${b.wasChampion ? "defends" : "wins"} the ${f.weightClass} title.`,
      );
  }
  f.fatigue = Math.min(100, f.fatigue + 25);
  r.fatigue = Math.min(100, r.fatigue + 25);
  f.nextBoutWeek = s.week + CAREER.boutTurnaroundWeeks;
  f.preparation = null;
  f.mentoringPreparation = null;
  b.status = "resolved";
  b.result = result;
  b.snapshot = liveSnapshot(state);
  if (state.roundSummaries) b.roundSummaries = clone(state.roundSummaries);
  b.resolvedWeek = s.week;
  let honorAward = null;
  const honorAlreadyEarned = !!s.circuitHonors[b.circuit?.id];
  if (won && b.capstone && b.circuit?.id && !s.circuitHonors[b.circuit.id]) {
    honorAward = b.honorReward ? clone(b.honorReward) : null;
    if (honorAward?.cash > 0) {
      s.cash += honorAward.cash;
      cashFlow(s, honorAward.cash, "career-circuit-honor", {
        fightId: b.id,
        circuitId: b.circuit.id,
      });
    }
    s.circuitHonors[b.circuit.id] = {
      week: s.week,
      fighterId: f.id,
      fightId: b.id,
      reward: honorAward,
    };
    log(
      s,
      "circuit-honor",
      `${f.name} wins the ${b.circuit.name} capstone. The circuit honor is displayed in your club history.`,
      f.id,
    );
  }
  settleInvitational(s, b);
  const challengeSpec = CAREER.challenges.find(
    (spec) => spec.id === b.challengeId,
  );
  let challengeAward = null;
  if (won && challengeSpec && !s.careerChallenges[challengeSpec.id]) {
    // Reward terms are accepted with the contract. Old contracts retain their non-cash award.
    challengeAward = clone(
      b.challengeReward || {
        legacy: challengeSpec.reward.legacy,
        trophy: challengeSpec.reward.trophy,
      },
    );
    if (challengeAward.cash > 0) {
      s.cash += challengeAward.cash;
      cashFlow(s, challengeAward.cash, "career-challenge-trophy", {
        fightId: b.id,
        challengeId: challengeSpec.id,
      });
    }
    s.careerChallenges[challengeSpec.id] = {
      week: s.week,
      fighterId: f.id,
      fightId: b.id,
      trophy: challengeAward.trophy,
      reward: clone(challengeAward),
    };
    s.legacy += challengeAward.legacy;
    log(
      s,
      "club-challenge",
      `${f.name} wins ${challengeSpec.name}. Your gym earns the ${challengeAward.trophy} and ${challengeAward.legacy} reputation.`,
      f.id,
    );
  }
  const card = b.invitationalId
    ? s.careerJourney.attempts.find((entry) => entry.id === b.invitationalId)
    : null;
  // The last unresolved card bout can be any slot. Use the actual cash delta
  // to attribute the one team/first-victory award to its settling command.
  const trophyCash = Math.max(0, s.cash - cashBefore - b.purse);
  b.rewards = {
    competition: b.competition === "invitational" ? "invitational" : "regional",
    purse: b.purse,
    boutEarnings: b.purse,
    rankingBefore,
    rankingAfter: f.rankingPoints,
    rankingDelta: f.rankingPoints - rankingBefore,
    legacyDelta: s.legacy - legacyBefore,
    readinessBefore: b.readiness.you,
    readinessAfter: round(100 - f.fatigue),
    trophy: challengeAward
      ? {
          cash: challengeAward.cash || 0,
          legacy: challengeAward.legacy,
          name: challengeAward.trophy,
        }
      : honorAward
        ? { cash: honorAward.cash, legacy: 0, name: honorAward.trophy }
        : trophyCash
          ? { cash: trophyCash, legacy: card?.reward?.legacy || 0 }
          : null,
    trophyEarnings: {
      cash: trophyCash,
      legacy:
        challengeAward?.legacy || (trophyCash ? card?.reward?.legacy || 0 : 0),
    },
    challenge: challengeSpec
      ? {
          id: challengeSpec.id,
          name: challengeSpec.name,
          completed: won,
          alreadyEarned: won && !challengeAward,
          reward: challengeAward,
        }
      : null,
    honor: b.capstone
      ? {
          completed: won,
          alreadyEarned: won && honorAlreadyEarned,
          reward: honorAward,
        }
      : null,
    card: card
      ? {
          id: card.id,
          resolved: card.resolved,
          wins: card.wins,
          losses: card.losses,
          draws: card.draws,
          status: card.status,
        }
      : null,
    invitational: card
      ? {
          wins: card.wins,
          boutsCompleted: card.resolved,
          targetWins: CAREER.invitational.winsRequired,
          cardComplete: card.status !== "active",
          champion: card.status === "won",
        }
      : null,
  };
  const events = result.rounds.flatMap((r) => r.events);
  const stopped = events.filter(
    (e) => e.type === "td-stuffed" && e.actor === "A",
  ).length;
  b.debrief = {
    takedownsStopped: stopped,
    takedownsFaced: stopped + result.totals.B.takedowns,
    gas: b.snapshot,
    observation:
      b.readiness.you < 70
        ? "You entered with substantial fatigue. Leave a rest week between camp and the bout."
        : result.totals.B.takedowns > result.totals.A.takedowns
          ? "The opponent won more takedowns. Consider grappling drills and compare their cardio."
          : b.snapshot.A.gas < 30
            ? "Your gas fell below 30%. Try measured pace or a low-gas corner rule."
            : "Compare the decisive exchanges with your plan before choosing a rematch. One result does not establish a guaranteed tactic.",
    decisive: events
      .filter((e) =>
        ["ko", "tko", "submission", "knockdown", "takedown"].includes(e.type),
      )
      .slice(-3),
  };
  milestone(
    s,
    f,
    "bout",
    `${won ? "Win" : lost ? "Loss" : "Draw"} against ${r.name} by ${result.method}. Earned $${b.purse}.`,
  );
  f.history.at(-1).signatureId = b.inputs.a.signatureId || null;
  f.history.at(-1).combatVersion = b.combatVersion;
  if (oldWins + oldLosses === 0)
    milestone(s, f, "debut", `${f.name} made their career debut.`);
  if (lost && !oldLosses)
    milestone(
      s,
      f,
      "first-loss",
      "First loss — regroup, recover, and choose the next matchup.",
    );
  if (
    won &&
    ["KO", "TKO", "SUB"].includes(result.method) &&
    !f.history.some((h) => h.type === "first-finish")
  )
    milestone(s, f, "first-finish", `${f.name} earned their first finish.`);
  if (
    won &&
    Object.values(b.inputs.b.stats).reduce((a, v) => a + v, 0) >
      Object.values(b.inputs.a.stats).reduce((a, v) => a + v, 0) + 20
  )
    milestone(
      s,
      f,
      "upset",
      "An upset win against the stronger pre-fight stat profile.",
    );
  if (previous)
    milestone(s, f, "rivalry", `${previous + 1} meetings with ${r.name}.`);
  const trait = f.traits.find((t) => !f.discoveredTraits.includes(t));
  if (trait) {
    f.discoveredTraits.push(trait);
    b.rewards.discoveredTraits = [
      { id: trait, description: CAREER.traits[trait] },
    ];
    milestone(
      s,
      f,
      "trait",
      `Discovered ${trait.replaceAll("-", " ")}: ${CAREER.traits[trait]}`,
    );
  }
  if ((f.age >= 38 && lost) || f.age >= 40) retire(s, f);
  b.rewards.legacyDelta = s.legacy - legacyBefore;
  // Keep recent exchange logs; all career records and result summaries remain.
  const resolved = s.fights.filter((x) => x.status === "resolved");
  for (const old of resolved.slice(0, -30)) {
    delete old.inputs;
    if (old.result) old.result.rounds = [];
  }
}
function resolveRound(s, b, suppliedPlan) {
  requireThat(
    ["ready", "live"].includes(b.status),
    "This bout is not awaiting a round.",
  );
  const state = replay(b);
  const a = suppliedPlan
    ? plan(suppliedPlan)
    : automatic(b.inputs.a.gameplan, state.A);
  const opponent = automatic(b.inputs.b.gameplan, state.B);
  b.decisions.push({ a, b: opponent });
  state.A.gameplan = clone(a);
  state.B.gameplan = clone(opponent);
  const result = advanceRound(state);
  b.status = "live";
  b.snapshot = result.snapshot;
  b.latestEvents = result.events;
  if (state.roundSummaries) b.roundSummaries = clone(state.roundSummaries);
  if (result.ended) completeFight(s, b, state);
}
function simulateCircuit(s) {
  if (s.week % 2) return;
  const rng = createRng(`${s.seed}:circuit-week:${s.week}`);
  for (const wc of [
    "featherweight",
    "lightweight",
    "middleweight",
    "heavyweight",
  ]) {
    const eligible = s.rivals.filter(
      (r) =>
        !r.retired &&
        !r.invitational &&
        !r.circuitChallenge &&
        !r.circuitOpponentId &&
        r.weightClass === wc &&
        !s.fights.some((b) => b.opponentId === r.id && b.status !== "resolved"),
    );
    const [a, b] = rng.sample(eligible, 2);
    if (!a || !b) continue;
    const state = beginFight({
      a: engineInput(s, a),
      b: engineInput(s, b),
      seed: `${s.seed}:circuit:${s.week}:${wc}`,
      engineVersion: CURRENT_FIGHT_VERSION,
    });
    while (!state.outcome && state.round < state.rounds) {
      state.A.gameplan = automatic(a.gameplan, state.A);
      state.B.gameplan = automatic(b.gameplan, state.B);
      advanceRound(state);
    }
    const result = finishFight(state);
    applyRecord(a, result.winner === "A", result.winner === "B", result);
    applyRecord(b, result.winner === "B", result.winner === "A", result);
    a.rankingPoints = Math.max(
      0,
      a.rankingPoints + (result.winner === "A" ? 8 : -3),
    );
    b.rankingPoints = Math.max(
      0,
      b.rankingPoints + (result.winner === "B" ? 8 : -3),
    );
    a.fatigue = Math.min(100, a.fatigue + 15);
    b.fatigue = Math.min(100, b.fatigue + 15);
  }
}
function advanceWeek(s) {
  s.week++;
  s.scoutsUsed = 0;
  const cost = weeklyCost(s),
    paid = Math.min(cost, s.cash);
  s.cash -= paid;
  cashFlow(s, -paid, "weekly-upkeep", { hardship: cost - paid });
  s.lastAdvance = { week: s.week, cost: paid, waived: cost - paid };
  if (paid < cost) {
    log(
      s,
      "hardship",
      `Hardship support covered $${cost - paid}. Training and mentoring stop; fighters can recover and take paying regional bouts.`,
    );
    for (const f of active(s).filter((f) => f.camp)) {
      f.lastCamp = { ...f.camp, endedWeek: s.week, interrupted: true };
      f.camp = null;
      log(
        s,
        "camp-complete",
        `${f.name}'s camp ended because operating funds ran out. This week becomes recovery.`,
        f.id,
      );
    }
    for (const p of s.mentoring.filter((p) => p.status === "active")) {
      p.status = "interrupted";
      log(
        s,
        "mentoring",
        "Mentoring ended because operating funds ran out. Both fighters are available.",
      );
    }
  }
  if (s.upgrade && s.upgrade.endWeek <= s.week) {
    s.facilityTier = s.upgrade.tier;
    s.upgrade = null;
    log(s, "upgrade", `Opened ${CAREER.facilities[s.facilityTier].name}.`);
  }
  for (const f of [
    ...active(s),
    ...s.rivals.filter(
      (r) => !r.retired && !r.circuitChallenge && !r.circuitOpponentId,
    ),
  ]) {
    f.age += 1 / CAREER.weeksPerYear;
    if (f.camp) trainWeek(s, f);
    else
      f.fatigue = round(
        Math.max(
          0,
          f.fatigue -
            (s.fighters.includes(f)
              ? recoveryPerWeek(s)
              : CAREER.recoveryPerWeek *
                CAREER.facilities[s.facilityTier].recovery),
        ),
      );
    if (phase(f) === "Declining")
      for (const k of STAT_KEYS)
        f.stats[k] = Math.max(
          1,
          f.stats[k] - (k === "conditioning" ? 0.08 : 0.035),
        );
    if (s.fighters.includes(f) && f.age >= 40 && !pendingFight(s, f.id))
      retire(s, f);
  }
  // Authored tests retain their skill sheet and age, but previous bouts must
  // not leave a permanent fatigue handicap for every subsequent challenger.
  for (const r of s.rivals.filter(
    (r) => !r.retired && (r.circuitChallenge || r.circuitOpponentId),
  ))
    r.fatigue = round(Math.max(0, r.fatigue - CAREER.recoveryPerWeek));
  for (const r of s.rivals.filter(
    (r) =>
      !r.retired &&
      !r.invitational &&
      !r.circuitChallenge &&
      !r.circuitOpponentId &&
      r.age >= 40 &&
      !s.fights.some((b) => b.opponentId === r.id && b.status !== "resolved"),
  )) {
    r.retired = true;
    r.isChampion = false;
    const replacement = makeFighter(
      `${s.seed}:replacement:${s.week}:${r.id}`,
      `rival-new-${s.week}-${r.id}`,
      { weightClass: r.weightClass, age: 23 },
    );
    replacement.gymName = r.gymName;
    replacement.description = "A new contender joins the regional circuit.";
    replacement.rankingPoints = 25;
    s.rivals.push(replacement);
  }
  for (const wc of [
    "featherweight",
    "lightweight",
    "middleweight",
    "heavyweight",
  ]) {
    const pool = [
      ...active(s),
      ...s.rivals.filter(
        (r) =>
          !r.retired &&
          !r.invitational &&
          !r.circuitChallenge &&
          !r.circuitOpponentId,
      ),
    ].filter((f) => f.weightClass === wc);
    if (!pool.some((f) => f.isChampion)) {
      const champion = pool.sort(
        (a, b) => b.rankingPoints - a.rankingPoints,
      )[0];
      if (champion) {
        champion.isChampion = true;
        champion.championships.push({
          wonWeek: s.week,
          defenses: 0,
          vacant: true,
        });
      }
    }
  }
  for (const p of s.mentoring.filter(
    (p) => p.status === "active" && p.endWeek <= s.week,
  )) {
    const mentor = active(s).find((f) => f.id === p.mentorId),
      junior = active(s).find((f) => f.id === p.juniorId);
    if (!mentor || !junior) {
      p.status = "interrupted";
      continue;
    }
    const success = createRng(`${s.seed}:mentor:${p.id}`)() < p.chance;
    p.status = success ? "succeeded" : "completed";
    const preparation = p.preparation || {
      stat: STYLE_FAMILIES[family(mentor)].primaryStat,
      value: CAREER.mentoring.preparationValue,
      expiresAfterWeeks: CAREER.mentoring.preparationExpiresAfterWeeks,
    };
    junior.mentoringPreparation = {
      stat: preparation.stat,
      value: preparation.value,
      expiresWeek: s.week + preparation.expiresAfterWeeks,
      source: "mentoring",
    };
    p.completedWeek = s.week;
    p.preparationAward = clone(junior.mentoringPreparation);
    if (success) {
      junior.traits.push(p.trait);
      junior.discoveredTraits.push(p.trait);
      junior.lineage.push({
        mentorId: mentor.id,
        name: mentor.name,
        trait: p.trait,
        week: s.week,
      });
      s.legacy += 5;
    }
    log(
      s,
      "mentoring",
      success
        ? `${mentor.name} passed ${p.trait} to ${junior.name}. Next bout: +${preparation.value} ${preparation.stat}.`
        : `${junior.name} completed mentoring; the trait did not transfer, but their next bout gains +${preparation.value} ${preparation.stat}.`,
    );
  }
  simulateCircuit(s);
  for (const b of s.fights.filter(
    (b) => b.status === "scheduled" && b.eventWeek <= s.week,
  ))
    prepareFight(s, b);
  s.board = makeBoard(s);
}
function blocking(s) {
  if (s.fights.some((b) => ["ready", "live"].includes(b.status)))
    return "Attend or auto-corner the ready fight before advancing.";
  if (active(s).some((f) => f.camp?.needsReview))
    return "Review the camp midpoint before advancing.";
  return null;
}
function assignCamp(s, cmd) {
  requireThat(
    s.cash >= weeklyCost(s),
    "Cover one week of operating costs before starting camp. Regional bouts and recovery remain available.",
  );
  const f = find(s, cmd.fighterId);
  requireThat(
    Object.hasOwn(CAREER.presets, cmd.preset || ""),
    "Choose an available training focus.",
  );
  const preset = CAREER.presets[cmd.preset];
  requireThat(
    CAREER.campLengths.includes(cmd.weeks),
    "Choose a 1, 2, 3, 4, or 6 week camp.",
  );
  const option = presetOptions(s)[cmd.preset];
  requireThat(option.available, option.blockedReason);
  requireThat(
    !f.camp && !pairFor(s, f.id),
    "Finish the existing training commitment first.",
  );
  const b = pendingFight(s, f.id);
  requireThat(
    !b || (b.status === "scheduled" && s.week + cmd.weeks <= b.eventWeek),
    "Camp must end by the booked fight week.",
  );
  const allocations = cmd.allocations || preset.allocations;
  const invalid = validateAllocations(allocations);
  if (invalid) error(invalid);
  requireThat(
    !preset.preparationStat ||
      allocations[preset.preparationStat] >= preset.minAllocation,
    `${preset.name} needs at least ${preset.minAllocation}% ${preset.preparationStat}.`,
  );
  f.camp = {
    preset: cmd.preset,
    allocations: clone(allocations),
    weeks: cmd.weeks,
    startedWeek: s.week,
    endWeek: s.week + cmd.weeks,
    completed: 0,
    gains: Object.fromEntries(STAT_KEYS.map((key) => [key, 0])),
    stalled: [],
    needsReview: false,
    reviewed: false,
    commitmentBonus: CAREER.campCompletionBonus[cmd.weeks],
    scheduleVersion: CAREER.campScheduleVersion,
  };
}
function applyCommand(input, cmd, { maxAdvanceWeeks } = {}) {
  const s = upgradeCareer(input);
  require("./achievements").sync(s);
  const previousCircuit = careerCircuit(s).level;
  const previousDeeds = new Set(Object.keys(s.gymGoals));
  const previousAmbitionComplete = s.selectedAmbition?.completedWeek;
  requireThat(cmd && typeof cmd.type === "string", "A command is required.");
  switch (cmd.type) {
    case "club-look": {
      const look = CLUB_LOOKS.find((item) => item.id === cmd.lookId);
      requireThat(look, "Choose an available club look.");
      s.clubStyle ||= { owned: ["original"], selected: "original" };
      if (!s.clubStyle.owned.includes(look.id)) {
        requireThat(
          clubStyle(s).catalog.find((p) => p.id === look.id)?.owned,
          "Earn this cosmetic through Achievements before equipping it.",
        );
        s.clubStyle.owned.push(look.id);
      }
      s.clubStyle.selected = look.id;
      s.cosmeticLookId = null;
      break;
    }
    case "enter-invitational": {
      enterInvitational(s, cmd.fighterIds);
      break;
    }
    case "investigate": {
      requireThat(
        s.scoutsUsed < CAREER.scoutsPerWeek,
        "Both investigations are used. Advance the career to refresh the board.",
      );
      const report = s.board.find((r) => r.id === cmd.reportId);
      requireThat(
        report && !report.investigated,
        "Choose an uninvestigated prospect.",
      );
      const rarity = rollRarity(
        createRng(`${s.seed}:investigate:${report.id}`),
        s.scouting.pity,
      );
      const identity = report.fighter;
      report.fighter = makeFighter(identity.seed, identity.id, {
        rarity,
        style: identity.style,
        weightClass: identity.weightClass,
      });
      for (const key of [
        "name",
        "style",
        "weightClass",
        "age",
        "portrait",
        "region",
        "regionLabel",
      ])
        report.fighter[key] = identity[key];
      report.fee = 100 + (RARITY_TIERS[rarity].order - 1) * 150;
      report.fighter.discoveredTraits =
        scoutReport(report.fighter, staffRank(s, "scout"))?.verifiedTraits ||
        [];
      for (const tier of Object.keys(PITY_THRESHOLDS)) {
        s.scouting.pity[tier] =
          RARITY_TIERS[rarity].order >= RARITY_TIERS[tier].order
            ? 0
            : s.scouting.pity[tier] + 1;
      }
      s.scouting.investigations++;
      creditStaffWork(s, "scout", "investigations", 1, {
        fighter: report.fighter,
        family: family(report.fighter),
      });
      report.investigated = true;
      s.scoutsUsed++;
      break;
    }
    case "sign": {
      const report = s.board.find((r) => r.id === cmd.reportId);
      requireThat(
        report?.investigated && !report.signed,
        "Investigate an available prospect first.",
      );
      requireThat(
        active(s).length < CAREER.facilities[s.facilityTier].slots,
        "Your roster is full.",
      );
      spend(s, s.fighters.length === 1 ? 0 : report.fee, "recruitment", {
        fighterId: report.fighter.id,
      });
      report.fighter.discoveredTraits = [
        ...new Set([
          ...report.fighter.discoveredTraits,
          ...(scoutReport(report.fighter, staffRank(s, "scout"))
            ?.verifiedTraits || []),
        ]),
      ];
      report.signed = true;
      creditStaffWork(s, "scout", "signings", 1, { fighter: report.fighter });
      s.fighters.push(report.fighter);
      milestone(
        s,
        report.fighter,
        "signed",
        `${report.fighter.name} joined your gym.`,
      );
      break;
    }
    case "veteran": {
      requireThat(
        s.boutsCompleted > 0 && !s.veteranSigned,
        "The veteran opportunity opens after your first bout.",
      );
      requireThat(
        active(s).length < CAREER.facilities[s.facilityTier].slots,
        "Free a roster slot for the veteran.",
      );
      spend(s, 180, "veteran-recruitment");
      const first = active(s)[0];
      const f = makeFighter(`${s.seed}:veteran`, "veteran", {
        age: 32,
        style: first?.style || "boxing",
        name: "Marco Silva",
        portrait: 3,
        traits: ["cardio-machine"],
        discoveredTraits: ["cardio-machine"],
      });
      for (const k of STAT_KEYS) f.potential[k] = f.stats[k] + 5;
      s.fighters.push(f);
      s.veteranSigned = true;
      milestone(
        s,
        f,
        "signed",
        "Marco Silva joined: a veteran who can teach cardio-machine.",
      );
      break;
    }
    case "rebuild": {
      requireThat(
        active(s).length === 0,
        "A rebuilding prospect is available when the active roster is empty.",
      );
      const f = makeFighter(
        `${s.seed}:rebuild:${s.week}`,
        `rebuild-${s.week}`,
        { age: 21, rarity: "journeyman", weightClass: "lightweight" },
      );
      s.fighters.push(f);
      milestone(
        s,
        f,
        "signed",
        "A local prospect joins on a development scholarship so the gym can rebuild.",
      );
      break;
    }
    case "plan": {
      const f = find(s, cmd.fighterId);
      requireThat(
        !["ready", "live"].includes(pendingFight(s, f.id)?.status),
        "Fight inputs are locked; use between-round instructions.",
      );
      f.gameplan = plan(cmd.plan);
      break;
    }
    case "signature": {
      const f = find(s, cmd.fighterId),
        access = signatureAccess(s, f);
      if (f.signatureId) {
        requireThat(
          f.signatureId === cmd.signatureId,
          "This fighter's signature is permanent and cannot be changed or removed.",
        );
        break;
      }
      requireThat(
        isSignatureId(cmd.signatureId),
        "Choose one of the available signatures.",
      );
      requireThat(
        access.choiceIds.includes(cmd.signatureId),
        "Choose a signature for this fighter's style, or Pace Keeper.",
      );
      requireThat(
        !access.choiceBlocks[cmd.signatureId],
        access.choiceBlocks[cmd.signatureId],
      );
      requireThat(!access.locked, access.blockedReason);
      requireThat(access.eligible, access.blockedReason);
      f.signatureId = cmd.signatureId;
      milestone(
        s,
        f,
        "signature",
        `${f.name} chose ${CAREER.signatures[cmd.signatureId].name} as their permanent signature.`,
      );
      break;
    }
    case "select-ambition": {
      requireThat(
        ambitionOptions(s).some(
          (a) =>
            a.goalId === cmd.goalId &&
            (a.challengeId || null) === (cmd.challengeId || null),
        ),
        "Choose an available club ambition.",
      );
      if (cmd.fighterId) find(s, cmd.fighterId);
      requireThat(
        !cmd.fighterId ||
          [
            "first-belt",
            "defend-belt",
            "mentored-win",
            "club-challenge",
          ].includes(cmd.goalId),
        "This ambition belongs to the whole club.",
      );
      if (s.selectedAmbition && s.selectedAmbition.completedWeek == null)
        s.ambitionHistory.push({
          ...clone(s.selectedAmbition),
          status: "switched",
          endedWeek: s.week,
        });
      s.selectedAmbition = {
        goalId: cmd.goalId,
        ...(cmd.fighterId ? { fighterId: cmd.fighterId } : {}),
        ...(cmd.challengeId ? { challengeId: cmd.challengeId } : {}),
        selectedWeek: s.week,
        completedWeek: null,
      };
      log(
        s,
        "ambition-selected",
        `Club ambition: ${ambitionProjection(s, s.selectedAmbition).label}.`,
        cmd.fighterId || null,
      );
      break;
    }
    case "clear-ambition": {
      if (s.selectedAmbition)
        s.ambitionHistory.push({
          ...clone(s.selectedAmbition),
          status: "cleared",
          endedWeek: s.week,
        });
      s.selectedAmbition = null;
      break;
    }
    case "accept-offer":
    case "book": {
      const f = find(s, cmd.fighterId);
      requireThat(
        !pendingFight(s, f.id) && !pairFor(s, f.id),
        "Finish the existing commitment first.",
      );
      const offer = offers(s, f).find((o) =>
        cmd.type === "accept-offer"
          ? o.offerId === cmd.offerId
          : o.id === cmd.opponentId,
      );
      requireThat(offer, "This offer is no longer available.");
      // Qualification also applies to the legacy booking command. Existing
      // signed bouts are settled without consulting today's entry rules.
      requireThat(
        !offer.qualification || offer.qualification.qualified,
        offer.qualification?.description,
      );
      if (cmd.type === "accept-offer") {
        requireThat(!offer.unavailable, offer.unavailable);
        requireThat(
          cmd.weeks == null || cmd.weeks === offer.notice,
          "The promoter sets this fight date. Choose another offer for a different date.",
        );
      }
      const notice = cmd.type === "accept-offer" ? offer.notice : cmd.weeks;
      requireThat(
        Number.isInteger(notice) && notice >= 1 && notice <= 8,
        "Book between 1 and 8 weeks ahead.",
      );
      requireThat(
        s.week + notice >= (f.nextBoutWeek || 0),
        "This fighter is still in the post-fight turnaround. Check their calendar for the next available date.",
      );
      requireThat(
        !f.camp || f.camp.endWeek <= s.week + notice,
        "The camp must finish by fight week.",
      );
      if (cmd.type === "book") {
        // Legacy date overrides must not retain a replacement-call premium
        // after extending the preparation window (or apply demand twice).
        let show = offer.standardShow ?? offer.show;
        let winBonus = offer.standardWinBonus ?? offer.winBonus;
        if (offer.circuit?.id === CAREER.circuits[0].id && !offer.title) {
          if (offer.shortNoticePremium) {
            show -= offer.shortNoticePremium.show;
            winBonus -= offer.shortNoticePremium.winBonus;
          }
          offer.shortNotice = notice <= SHORT_NOTICE_PREMIUM.maxWeeks;
          offer.shortNoticePremium = offer.shortNotice
            ? { ...SHORT_NOTICE_PREMIUM }
            : null;
          if (offer.shortNoticePremium) {
            show += offer.shortNoticePremium.show;
            winBonus += offer.shortNoticePremium.winBonus;
          }
        }
        Object.assign(
          offer,
          contractTerms(
            s,
            { ...offer, eventWeek: s.week + notice, show, winBonus },
            f.id,
          ),
        );
      }
      const id = `bout-${s.fights.length + 1}`;
      s.fights.push({
        id,
        fighterId: f.id,
        opponentId: offer.id,
        seed: `${s.seed}:${id}`,
        eventWeek: s.week + notice,
        eventName: offer.eventName,
        offerId: offer.offerId,
        status: "scheduled",
        rounds: offer.title ? 5 : 3,
        title: offer.title,
        wasChampion: !!f.isChampion,
        show: offer.show,
        winBonus: offer.winBonus,
        purseVersion: offer.purseVersion || 1,
        shortNotice: !!offer.shortNotice,
        shortNoticePremium: offer.shortNoticePremium || null,
        circuit: offer.circuit,
        challengeId: offer.challengeId || null,
        challengeReward: offer.challengeReward
          ? clone(offer.challengeReward)
          : null,
        circuitOpponentId: offer.circuitOpponentId || null,
        capstone: !!offer.capstone,
        qualifiedDefense: !!offer.qualifiedDefense,
        demand: offer.demand || null,
        titlePurse: offer.titlePurse || null,
        honorReward: offer.honorReward ? clone(offer.honorReward) : null,
        engineVersion: CAREER.engineVersion,
        combatVersion: CURRENT_FIGHT_VERSION,
        signatureVersion: 1,
        opponentSnapshot: clone(s.rivals.find((r) => r.id === offer.id)),
        decisions: [],
      });
      log(
        s,
        "book",
        `${f.name} signs to face ${offer.opponent.name} at ${offer.eventName}.`,
        f.id,
      );
      break;
    }
    // Older clients may retry this name. Assigning training never moves time;
    // the separate advance command plays the shared team week.
    case "start-training":
    case "camp": {
      assignCamp(s, cmd);
      break;
    }
    case "camp-batch":
    case "repeat-camp-batch": {
      requireThat(
        Array.isArray(cmd.fighterIds) &&
          cmd.fighterIds.length > 0 &&
          cmd.fighterIds.length <= CAREER.facilities[s.facilityTier].slots &&
          new Set(cmd.fighterIds).size === cmd.fighterIds.length,
        "Choose different available fighters for this team assignment.",
      );
      // applyCommand owns an isolated clone: if any assignment fails, none of
      // the selected fighters is saved, and this command never plays a week.
      for (const fighterId of cmd.fighterIds) {
        const f = find(s, fighterId);
        const source = cmd.type === "repeat-camp-batch" ? f.lastCamp : cmd;
        requireThat(source, `${f.name} has no previous camp to repeat.`);
        assignCamp(s, {
          fighterId,
          preset: source.preset,
          weeks: source.weeks,
          allocations: source.allocations,
        });
      }
      break;
    }
    case "cancel-camp": {
      const f = find(s, cmd.fighterId);
      requireThat(f.camp, "No camp is assigned to this fighter.");
      requireThat(
        f.camp.completed === 0 && !f.camp.needsReview,
        "This camp has started. Make its midpoint decision before ending it early.",
      );
      f.camp = null;
      break;
    }
    case "camp-review": {
      const f = find(s, cmd.fighterId);
      requireThat(f.camp?.needsReview, "No camp review is waiting.");
      requireThat(
        ["continue", "taper"].includes(cmd.choice),
        "Choose continue or taper.",
      );
      if (cmd.choice === "taper") {
        f.lastCamp = { ...f.camp, endedWeek: s.week };
        f.camp = null;
        log(
          s,
          "taper",
          `${f.name} ended camp early to make room for recovery.`,
          f.id,
        );
      } else {
        f.camp.needsReview = false;
        f.camp.reviewed = true;
      }
      break;
    }
    case "advance": {
      requireThat(!blocking(s), blocking(s));
      if (maxAdvanceWeeks != null)
        requireThat(
          Number.isInteger(maxAdvanceWeeks) && maxAdvanceWeeks > 0,
          "No career weeks are ready. Planning and ready fights remain available.",
        );
      const count = Math.min(cmd.untilEvent ? 8 : 1, maxAdvanceWeeks ?? 8);
      const cost = weeklyCost(s);
      requireThat(
        cmd.confirmCosts === true || s.cash >= cost * count,
        `This advance may cost up to $${cost * count}. Confirm the cost preview; hardship support protects a depleted gym.`,
      );
      const start = s.week;
      let paid = 0,
        waived = 0;
      for (let i = 0; i < count; i++) {
        advanceWeek(s);
        paid += s.lastAdvance.cost;
        waived += s.lastAdvance.waived;
        // Journal retention must not suppress an event stop in an old save.
        if (
          blocking(s) ||
          s.journal.some(
            (e) =>
              e.week === s.week &&
              ["camp-complete", "upgrade", "mentoring", "retired"].includes(
                e.type,
              ),
          ) ||
          s.cash < weeklyCost(s)
        )
          break;
      }
      s.lastAdvance = {
        fromWeek: start,
        week: s.week,
        weeks: s.week - start,
        cost: paid,
        waived,
        projectedCost: paid + waived,
        events: s.journal.filter((e) => e.week > start),
        fighters: s.fighters
          .filter((f) => {
            const before = input.fighters.find((member) => member.id === f.id);
            return before && !before.retired && !before.released;
          })
          .map((f) => {
            const before = input.fighters.find((x) => x.id === f.id);
            const mentoring = (input.mentoring || []).some(
              (pair) =>
                pair.status === "active" &&
                [pair.mentorId, pair.juniorId].includes(f.id),
            );
            const endedCamp =
              f.lastCamp?.endedWeek > start && f.lastCamp.endedWeek <= s.week
                ? f.lastCamp
                : null;
            return {
              id: f.id,
              name: f.name,
              activity: before.camp
                ? campRecoveryWeek(before.camp, before.camp.completed + 1)
                  ? "recovery"
                  : "training"
                : mentoring
                  ? "mentoring"
                  : "rest",
              training: before.camp
                ? {
                    preset: before.camp.preset,
                    allocations: clone(before.camp.allocations),
                  }
                : null,
              outcome: f.retired
                ? "retired"
                : endedCamp?.interrupted
                  ? "interrupted"
                  : endedCamp
                    ? "camp-complete"
                    : f.camp?.needsReview
                      ? "check-in"
                      : f.camp
                        ? "training"
                        : s.fights.some(
                              (bout) =>
                                bout.fighterId === f.id &&
                                ["ready", "live"].includes(bout.status),
                            )
                          ? "fight-ready"
                          : mentoring
                            ? "mentoring"
                            : "rest",
              readinessBefore: round(100 - before.fatigue),
              readiness: round(100 - f.fatigue),
              gains: Object.fromEntries(
                STAT_KEYS.map((k) => [k, round(f.stats[k] - before.stats[k])]),
              ),
            };
          }),
      };
      break;
    }
    case "round":
    case "auto-fight": {
      const b = s.fights.find((b) => b.id === cmd.fightId);
      requireThat(b, "Fight not found.");
      requireThat(
        Number.isInteger(cmd.expectedRound) &&
          cmd.expectedRound === b.decisions.length,
        "This round was already played. Refresh the saved bout.",
      );
      if (cmd.type === "round") resolveRound(s, b, cmd.plan);
      else {
        requireThat(
          ["ready", "live"].includes(b.status),
          "This bout is not ready.",
        );
        const selectedPlan = cmd.plan ? plan(cmd.plan) : null;
        while (b.status !== "resolved") {
          const current = selectedPlan ? replay(b) : null;
          resolveRound(
            s,
            b,
            selectedPlan ? automatic(selectedPlan, current.A) : null,
          );
        }
      }
      break;
    }
    case "upgrade": {
      const option = expansionOption(s);
      requireThat(option.canUpgrade, option.blockedReason);
      const tier = s.facilityTier + 1,
        spec = CAREER.facilities[tier];
      spend(s, spec.cost, "gym-expansion", { tier });
      s.upgrade = { tier, endWeek: s.week + spec.weeks };
      break;
    }
    case "upgrade-department": {
      requireThat(
        Object.hasOwn(CAREER.departments, cmd.departmentId),
        "Choose a gym department.",
      );
      const option = departmentOptions(s)[cmd.departmentId];
      requireThat(option.canUpgrade, option.blockedReason);
      spend(s, option.next.fee, "room-upgrade", {
        roomId: cmd.departmentId,
        level: option.next.level,
      });
      s.departments[cmd.departmentId] = option.next.level;
      log(
        s,
        "equipment",
        `Installed ${option.name} level ${option.next.level}. ${option.next.effectLabel}.`,
      );
      break;
    }
    case "hire": {
      requireThat(
        s.boutsCompleted > 0,
        "Complete your opening bout before hiring staff.",
      );
      requireThat(
        Object.hasOwn(CAREER.staff, cmd.role) && !s.staff[cmd.role],
        "Choose an unfilled staff role.",
      );
      const spec = CAREER.staff[cmd.role].ranks[1];
      spend(s, spec.fee, "staff-hire", { role: cmd.role });
      s.staff[cmd.role] = { hiredWeek: s.week, rank: 1 };
      s.staff[cmd.role].development = staffDevelopment(
        s.staff[cmd.role],
        cmd.role,
      ).progress;
      log(
        s,
        "staff",
        `Hired ${spec.name}. Operating costs are now $${weeklyCost(s)} per week.`,
      );
      break;
    }
    case "upgrade-staff": {
      requireThat(
        Object.hasOwn(CAREER.staff, cmd.role) && s.staff[cmd.role],
        "Hire this staff role before promoting it.",
      );
      const option = staffOptions(s)[cmd.role];
      requireThat(option.canUpgrade, option.blockedReason);
      spend(s, option.next.fee, "staff-promotion", {
        role: cmd.role,
        rank: option.next.rank,
      });
      s.staff[cmd.role] = {
        ...s.staff[cmd.role],
        rank: option.next.rank,
        promotedWeek: s.week,
      };
      log(
        s,
        "staff",
        `Promoted ${cmd.role} to ${option.next.name}. Operating costs are now $${weeklyCost(s)} per week.`,
      );
      break;
    }
    case "fire": {
      requireThat(
        Object.hasOwn(CAREER.staff, cmd.role) && s.staff[cmd.role],
        "Staff member not found.",
      );
      delete s.staff[cmd.role];
      break;
    }
    case "mentor": {
      requireThat(
        s.cash >= weeklyCost(s),
        "Cover one week of operating costs before starting mentoring.",
      );
      const m = find(s, cmd.mentorId),
        j = find(s, cmd.juniorId);
      requireThat(
        m.id !== j.id && m.age >= 30,
        "Choose an age 30+ mentor and a different junior.",
      );
      requireThat(
        ![m, j].some(
          (f) => f.camp || pairFor(s, f.id) || pendingFight(s, f.id),
        ),
        "Both fighters need clear schedules for mentoring.",
      );
      const conflicts = {
        "iron-chin": "suspect-chin",
        "suspect-chin": "iron-chin",
        "fast-starter": "slow-starter",
        "slow-starter": "fast-starter",
      };
      requireThat(
        CAREER.transferableTraits[cmd.trait] &&
          m.discoveredTraits.includes(cmd.trait) &&
          !j.traits.includes(cmd.trait) &&
          !j.traits.includes(conflicts[cmd.trait]),
        "Choose a known, compatible transferable trait.",
      );
      requireThat(
        s.mentoring.filter((p) => p.status === "active").length <
          Math.max(1, s.facilityTier - 1),
        "All mentoring spaces are occupied.",
      );
      const compatible = family(m) === family(j);
      const lesson = CAREER.transferableTraits[cmd.trait];
      const weeks = compatible
        ? lesson.compatibleWeeks || CAREER.mentoring.compatibleWeeks
        : lesson.otherWeeks || CAREER.mentoring.otherWeeks;
      s.mentoring.push({
        id: `pair-${s.mentoring.length}`,
        mentorId: m.id,
        juniorId: j.id,
        trait: cmd.trait,
        startedWeek: s.week,
        weeks,
        endWeek: s.week + weeks,
        chance: compatible ? 0.9 : 0.7,
        lessonVersion: 3,
        preparation: {
          stat: STYLE_FAMILIES[family(m)].primaryStat,
          value: CAREER.mentoring.preparationValue,
          expiresAfterWeeks: CAREER.mentoring.preparationExpiresAfterWeeks,
        },
        status: "active",
      });
      break;
    }
    case "release":
    case "retire": {
      const f = find(s, cmd.fighterId);
      requireThat(
        active(s).length > 1,
        "Keep at least one fighter so the gym can recover.",
      );
      requireThat(
        !f.camp && !pairFor(s, f.id) && !pendingFight(s, f.id),
        "Finish this fighter’s commitments first.",
      );
      requireThat(
        active(s).some(
          (teammate) =>
            teammate.id !== f.id && teammate.weightClass === f.weightClass,
        ) || cmd.confirmDivisionLoss === true,
        `This is your last ${f.weightClass} fighter. Confirm the empty division; recruit a replacement before the next complete Gym Wars card.`,
      );
      if (cmd.type === "retire") {
        requireThat(f.age >= 30, "Voluntary retirement opens at age 30.");
        retire(s, f);
      } else {
        if (f.isChampion && f.championships.length)
          f.championships.at(-1).endedWeek = s.week;
        f.released = true;
        f.isChampion = false;
        log(s, "release", `${f.name} left the gym.`, f.id);
        if (
          !active(s).some((teammate) => teammate.weightClass === f.weightClass)
        )
          log(
            s,
            "division-vacancy",
            `Your ${f.weightClass} slot needs a replacement before the next complete Gym Wars card.`,
            f.id,
          );
      }
      break;
    }
    default:
      error("Unknown career command.");
  }
  syncJourney(s);
  syncGymGoals(s);
  syncSignatureProgress(s);
  syncAmbition(s);
  require("./achievements").sync(s);
  ensureTitleChallengers(s);
  const promoted = careerCircuit(s).level > previousCircuit;
  const earnedDeeds = Object.keys(s.gymGoals).filter(
    (id) => !previousDeeds.has(id),
  );
  const ambitionCompleted =
    previousAmbitionComplete == null &&
    s.selectedAmbition?.completedWeek != null;
  const promotions = CAREER.circuits
    .slice(previousCircuit, careerCircuit(s).level)
    .map((c, i) => ({
      id: c.id,
      name: c.name,
      level: previousCircuit + i + 1,
      goalId: c.goalId,
      deed: gymGoals(s).find((g) => g.id === c.goalId)?.name || c.requirement,
      previouslyEarned: previousDeeds.has(c.goalId),
    }));
  for (const promotion of promotions)
    log(
      s,
      "circuit-promotion",
      `${promotion.name} earned: ${promotion.deed}${promotion.previouslyEarned ? " (previously completed deed credited)" : ""}. New contracts available; signed purses stay unchanged.`,
    );
  if (cmd.type === "advance" && s.lastAdvance)
    s.lastAdvance.events = s.journal.filter(
      (e) => e.week > s.lastAdvance.fromWeek,
    );
  const progression = {
    deeds: earnedDeeds,
    promotions,
    promotion: promoted
      ? {
          id: careerCircuit(s).id,
          name: careerCircuit(s).name,
          level: careerCircuit(s).level,
        }
      : null,
    ambition: ambitionCompleted
      ? {
          goalId: s.selectedAmbition.goalId,
          label: ambitionProjection(s, s.selectedAmbition).label,
        }
      : null,
  };
  if (earnedDeeds.length || promoted || ambitionCompleted) {
    const justResolved = s.fights.find(
      (b) => b.id === cmd.fightId && b.status === "resolved",
    );
    if (justResolved?.rewards)
      justResolved.rewards.progression = clone(progression);
  }
  s.telemetry.push({
    type: cmd.type,
    week: s.week,
    cashBefore: input.cash,
    cashAfter: s.cash,
    cashDelta: s.cash - input.cash,
    facilityTier: s.facilityTier,
    rosterSize: active(s).length,
    circuitLevel: careerCircuit(s).level,
    weeklyCost: weeklyCost(s),
    hardship: cmd.type === "advance" ? s.lastAdvance.waived : 0,
    fighterId: cmd.fighterId || null,
    ...(cmd.type === "select-ambition"
      ? { goalId: cmd.goalId, challengeId: cmd.challengeId || null }
      : {}),
    ...(cmd.type === "accept-offer" || cmd.type === "book"
      ? { circuitId: s.fights.at(-1)?.circuit?.id || null }
      : {}),
    ...(["round", "auto-fight"].includes(cmd.type) &&
    s.fights.find((b) => b.id === cmd.fightId)?.status === "resolved"
      ? {
          circuitId:
            s.fights.find((b) => b.id === cmd.fightId)?.circuit?.id || null,
          fightId: cmd.fightId,
          outcome: s.fights.find((b) => b.id === cmd.fightId)?.result?.winner,
          newCircuitContract: !!s.fights.find((b) => b.id === cmd.fightId)
            ?.circuitOpponentId,
        }
      : {}),
    ...(earnedDeeds.length || promoted || ambitionCompleted
      ? { progression }
      : {}),
  });
  s.telemetry = s.telemetry.slice(-1000);
  s.ambitionHistory = s.ambitionHistory.slice(-100);
  return s;
}
function publicFighter(f) {
  const { seed, potential, traits, ...data } = clone(f);
  data.age = Math.floor(f.age);
  data.stats = Object.fromEntries(STAT_KEYS.map((k) => [k, round(f.stats[k])]));
  for (const camp of [data.camp, data.lastCamp])
    if (camp?.gains)
      camp.gains = Object.fromEntries(
        STAT_KEYS.map((key) => [key, round(camp.gains[key])]),
      );
  data.phase = phase(f);
  return data;
}
function publicState(s) {
  s = upgradeCareer(s);
  const data = clone(s);
  delete data.seed;
  delete data.telemetry;
  delete data.economyLedger;
  delete data.economyTotals;
  delete data.economyFlowCount;
  data.clubStyle = clubStyle(s);
  data.achievementRewards = require("../consts/achievements")
    .ACHIEVEMENTS.filter((a) => a.questId || a.challengeId)
    .map((a) => ({
      id: a.id,
      questId: a.questId,
      challengeId: a.challengeId,
      reward: require("../consts/achievements").lookById(a.lookId),
    }));
  delete data.careerJourney;
  data.journey = careerJourney(s);
  data.careerCircuit = careerCircuit(s);
  data.ambition = s.selectedAmbition
    ? ambitionProjection(s, s.selectedAmbition)
    : null;
  data.ambitionOptions = ambitionOptions(s);
  data.fighters = s.fighters.map((f) => ({
    ...publicFighter(f),
    signatureAccess: signatureAccess(s, f),
    offers: !f.retired && !f.released ? offers(s, f) : [],
    forecast: f.camp
      ? forecast(s, f, f.camp.allocations, f.camp.weeks - f.camp.completed)
      : null,
  }));
  data.rivals = s.rivals.map(publicFighter);
  data.board = s.board.map((r) => ({
    id: r.id,
    investigated: r.investigated,
    signed: r.signed,
    fee: r.investigated ? (s.fighters.length === 1 ? 0 : r.fee) : null,
    fighter: r.investigated
      ? {
          ...publicFighter(r.fighter),
          stats: undefined,
          statRanges: scoutStatRanges(
            r.fighter,
            staffSpec(s, "scout")?.reportWidth ?? 12,
          ),
          scoutReport: scoutReport(r.fighter, staffRank(s, "scout")),
        }
      : {
          id: r.fighter.id,
          name: r.fighter.name,
          style: r.fighter.style,
          weightClass: r.fighter.weightClass,
          age: Math.floor(r.fighter.age),
          portrait: r.fighter.portrait,
        },
  }));
  data.fights = data.fights.map((b) => {
    const original = s.fights.find((entry) => entry.id === b.id);
    b.replayAvailable =
      b.status === "resolved" &&
      !!original.inputs?.a &&
      !!original.inputs?.b &&
      !!original.seed &&
      SUPPORTED_FIGHT_VERSIONS.includes(original.combatVersion) &&
      [3, 5].includes(original.rounds) &&
      Array.isArray(original.decisions);
    b.replayBlockedReason = b.replayAvailable
      ? null
      : b.status !== "resolved"
        ? "Finish this bout before reviewing its recorded film."
        : "The original combat inputs are no longer retained for this historical bout.";
    delete b.seed;
    delete b.inputs;
    delete b.opponentSnapshot;
    return b;
  });
  data.weeklyCost = weeklyCost(s);
  const recentFlows = (s.economyLedger || []).filter(
    (entry) => entry.week > s.week - 4 && entry.reason !== "starting-funds",
  );
  data.budget = {
    runwayWeeks: Math.floor(s.cash / weeklyCost(s)),
    recentIncome: recentFlows
      .filter((entry) => entry.flow === "source")
      .reduce((n, entry) => n + entry.amount, 0),
    recentSpending: recentFlows
      .filter((entry) => entry.flow === "sink")
      .reduce((n, entry) => n + entry.amount, 0),
    bookedShowMoney: s.fights
      .filter((b) => b.status !== "resolved")
      .reduce((n, b) => n + b.show, 0),
  };
  data.staff = Object.fromEntries(
    Object.entries(s.staff).map(([role, entry]) => [
      role,
      { ...entry, rank: staffRank(s, role) },
    ]),
  );
  data.staffOptions = staffOptions(s);
  data.departmentOptions = departmentOptions(s);
  data.presetOptions = presetOptions(s);
  data.gymDevelopment = {
    sportingGoals: sportingGoals(s),
    maxTier: CAREER.facilities.length - 1,
    mentoringCapacity: Math.max(1, s.facilityTier - 1),
    recoveryPerWeek: recoveryPerWeek(s),
    recoveryBonus: departmentSpec(s, "recoverySuite")?.recoveryBonus || 0,
    skillBonuses: skillBonuses(s),
    preparationBonus: preparationBonus(s),
    expansion: expansionOption(s),
    goals: gymGoals(s),
    challenges: challengeOptions(s),
    identity: {
      name: data.careerCircuit.name.replace(" circuit", " club"),
      reputation: s.legacy,
      earnedPennants: gymGoals(s)
        .filter((goal) => goal.complete)
        .map((goal) => ({
          id: goal.id,
          name: goal.name,
          week: goal.earned.week,
        })),
      trophies: Object.entries(s.careerChallenges).map(([id, earned]) => ({
        id,
        ...clone(earned),
      })),
      circuitHonors: Object.entries(s.circuitHonors).map(([id, earned]) => ({
        id,
        ...clone(earned),
      })),
    },
  };
  data.mentoringOptions = mentoringOptions(s);
  data.blocking = blocking(s);
  data.rules = CAREER;
  data.scouting.guarantees = Object.entries(PITY_THRESHOLDS).map(
    ([tier, threshold]) => ({
      tier,
      misses: s.scouting.pity[tier],
      threshold,
      remaining: Math.max(0, threshold - s.scouting.pity[tier]) + 1,
    }),
  );
  data.scouting.odds = SCOUT_ODDS;
  data.scouting.missingDivisions = missingDivisions(s);
  data.ladder = [
    ...data.rivals.filter(
      (f) =>
        !f.retired &&
        !f.invitational &&
        !f.circuitChallenge &&
        !f.circuitOpponentId,
    ),
    ...data.fighters.filter((f) => !f.retired && !f.released),
  ].sort(
    (a, b) =>
      Number(b.isChampion || false) - Number(a.isChampion || false) ||
      b.rankingPoints - a.rankingPoints,
  );
  return data;
}
module.exports = {
  createCareer,
  applyCommand,
  publicState,
  publicFighter,
  offers,
  forecast,
  weeklyCost,
  blocking,
  replay,
  engineInput,
  automatic,
  normalizePlan: plan,
};
