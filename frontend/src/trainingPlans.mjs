import { advanceEstimate } from "./careerGuide.mjs";

export const trainingSkills = [
  "striking",
  "grappling",
  "submissions",
  "conditioning",
];
export const skillLabel = (s = "") =>
  s.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
export const readiness = (f) => Math.round(100 - f.fatigue);
export const fighterBout = (s, f) =>
  s.fights.find((b) => b.fighterId === f.id && b.status !== "resolved");
export const fighterPair = (s, f) =>
  s.mentoring.find(
    (p) => p.status === "active" && [p.mentorId, p.juniorId].includes(f.id),
  );
export const campLengths = (s, f) => {
  const b = fighterBout(s, f);
  return s.rules.campLengths.filter(
    (w) => !b || (b.status === "scheduled" && s.week + w <= b.eventWeek),
  );
};

export const planIdentity = {
  defense: {
    title: "Grappling drills",
    intent:
      "Build takedowns, ground control and resistance to opposing takedowns.",
    purpose: "Build your grappling",
    stat: "grappling",
    symbol: "defense",
  },
  pressure: {
    title: "Striking drills",
    intent: "Sharpen striking and put more work into your standing game.",
    purpose: "Sharpen your striking",
    stat: "striking",
    symbol: "pressure",
  },
  balanced: {
    title: "All-round training",
    intent: "Develop all four skills with an even share of training time.",
    purpose: "Grow all four skills",
    stat: null,
    symbol: "balanced",
  },
  recover: {
    title: "Rest & recover",
    intent: "Restore condition before taking on the next challenge.",
    purpose: "Restore condition",
    stat: null,
    symbol: "recover",
  },
  combinations: {
    title: "Combination drills",
    intent:
      "Drill combinations with more striking work and less ground development.",
    purpose: "Striking Bay camp",
    stat: "striking",
    symbol: "combinations",
  },
  submissions: {
    title: "Submission drills",
    intent:
      "Build submission chains and grappling. Standing skills take a back seat.",
    purpose: "Grappling Lab camp",
    stat: "submissions",
    symbol: "submissions",
  },
  "gas-tank": {
    title: "Conditioning drills",
    intent:
      "Prioritize conditioning for a sustained pace. Technical development is slower.",
    purpose: "Conditioning Studio camp",
    stat: "conditioning",
    symbol: "gas-tank",
  },
};

export const preparationValue = (s, preset, weeks = 1) =>
  (s.rules.presets[preset]?.preparationValue ?? 0) +
  (s.rules.presets[preset]?.preparationStat
    ? s.gymDevelopment?.preparationBonus || 0
    : 0) +
  (s.rules.campCompletionBonus?.[weeks] || 0);

export function campEndReadiness(s, f, weeks, schedule = null) {
  let fatigue = f.fatigue;
  const camp = schedule || {
    weeks,
    completed: 0,
    scheduleVersion: s.rules.campScheduleVersion || 1,
  };
  for (let i = 1; i <= weeks; i++) {
    const recovery =
      camp.scheduleVersion >= 2 &&
      camp.weeks > 1 &&
      camp.completed + i === camp.weeks;
    fatigue = recovery
      ? Math.max(0, fatigue - restRecovery(s))
      : Math.min(100, fatigue + s.rules.fatiguePerWeek);
  }
  return Math.round(100 - fatigue);
}

export function campTitle(s, camp) {
  if (!camp) return "Training";
  const preset = s.rules.presets[camp.preset];
  const custom =
    camp.allocations &&
    preset &&
    trainingSkills.some(
      (skill) => camp.allocations[skill] !== preset.allocations[skill],
    );
  return custom
    ? "Custom training"
    : planIdentity[camp.preset]?.title || "Training camp";
}

export const restRecovery = (s, tier = s.facilityTier) =>
  s.rules.recoveryPerWeek * s.rules.facilities[tier].recovery +
  (s.gymDevelopment?.recoveryBonus || 0);

export function trainingChoices(s, f, weeks = 1) {
  const b = fighterBout(s, f);
  if (
    f.camp ||
    fighterPair(s, f) ||
    f.retired ||
    f.released ||
    (b && b.status !== "scheduled")
  )
    return [];
  // A fighter's condition must never remove or rearrange training choices.
  // Recovery is a fourth option, not a replacement for a core camp.
  const ids = ["balanced", "pressure", "defense", "recover"];
  ids.push(
    ...Object.keys(s.rules.presets).filter(
      (id) =>
        s.rules.presets[id].departmentId && s.presetOptions?.[id]?.available,
    ),
  );
  return ids.map((id) => ({
    ...planIdentity[id],
    ...(id === "balanced" &&
    weeks > 1 &&
    s.rules.campScheduleVersion >= 2 &&
    s.rules.campCompletionBonus?.[weeks] > 0
      ? { stat: "conditioning" }
      : {}),
    id,
    type: id === "recover" ? "recover" : "camp",
    weeks: id === "recover" ? 1 : weeks,
    preset: id === "recover" ? null : id,
    allocations:
      id === "recover" ? null : { ...s.rules.presets[id].allocations },
  }));
}

export function allocationStatus(allocations) {
  const numbers = trainingSkills.map((key) => allocations?.[key]);
  if (numbers.some((n) => !Number.isFinite(n) || n < 0 || n > 100))
    return {
      total: null,
      valid: false,
      message: "Each skill needs 0–100%. Fix the invalid allocation.",
    };
  const total = Math.round(numbers.reduce((sum, n) => sum + n, 0) * 100) / 100;
  const difference = Math.round(Math.abs(100 - total) * 100) / 100;
  return {
    total,
    valid: total === 100,
    message:
      total > 100
        ? `${total}% allocated — ${difference}% over budget. Remove ${difference} percentage points.`
        : total < 100
          ? `${total}% allocated — ${difference}% left to assign.`
          : "100% allocated — your training time is balanced.",
  };
}

export function distributeRemainder(allocations) {
  const next = { ...allocations };
  const status = allocationStatus(next);
  if (status.total === null || status.total > 100) return next;
  let left = 100 - status.total;
  while (left > 0) {
    const key = trainingSkills.reduce((a, b) => (next[a] <= next[b] ? a : b));
    const amount = Math.min(5, left, 100 - next[key]);
    next[key] += amount;
    left -= amount;
  }
  return next;
}

export function preparationTimeline(s, f, weeks = 0, training = false) {
  const bout = fighterBout(s, f);
  if (!bout || bout.status !== "scheduled") return null;
  const endWeek = s.week + weeks;
  const recoveryWeeks = Math.max(0, bout.eventWeek - endWeek);
  const atEnd = training ? campEndReadiness(s, f, weeks) : readiness(f);
  const atFight = Math.min(
    100,
    Math.round(atEnd + recoveryWeeks * restRecovery(s)),
  );
  return { endWeek, fightWeek: bout.eventWeek, recoveryWeeks, atEnd, atFight };
}

export function suggestedTrainingChoice(s, f, intent = "saved") {
  const bout = fighterBout(s, f);
  return intent === "recover" ||
    readiness(f) < 70 ||
    (f.lastCamp?.endedWeek === s.week && bout?.status === "scheduled")
    ? "recover"
    : "balanced";
}

export function fighterAssignment(s, f, chosen = null) {
  if (f.camp || chosen?.type === "camp") return "training";
  if (fighterPair(s, f)) return "mentoring";
  if (["ready", "live"].includes(fighterBout(s, f)?.status)) return "fight";
  if (chosen?.type === "recover") return "recovery";
  return "unassigned";
}

export function planProblem(s, f, plan) {
  if (!plan || plan.type !== "camp") return "";
  if (!campLengths(s, f).includes(plan.weeks))
    return "This camp must finish by the booked fight week.";
  if (!s.rules.presets[plan.preset]) return "Choose a training focus.";
  const option = s.presetOptions?.[plan.preset];
  if (option && !option.available)
    return option.blockedReason || "Build the required department first.";
  const a = plan.allocations;
  const allocation = allocationStatus(a);
  if (!allocation.valid) return allocation.message;
  if (plan.preset === "defense" && a.grappling < 40)
    return "Grappling preparation needs at least 40% grappling.";
  if (plan.preset === "pressure" && a.striking < 40)
    return "Striking preparation needs at least 40% striking.";
  const spec = s.rules.presets[plan.preset];
  if (spec.preparationStat && a[spec.preparationStat] < spec.minAllocation)
    return `${spec.name} needs at least ${spec.minAllocation}% ${spec.preparationStat}.`;
  if (s.cash < s.weeklyCost)
    return "Cover one week of gym costs before starting camp. Recovery and paying bouts remain available.";
  return "";
}

export function matchupMessage(f, opponent) {
  if (!opponent)
    return "Choose an opponent to give your next camp a clear target.";
  const gaps = trainingSkills
    .map((k) => ({ k, gap: opponent.stats[k] - f.stats[k] }))
    .sort((a, b) => b.gap - a.gap);
  if (gaps[0].gap > 0) {
    const k = gaps[0].k;
    return `${opponent.name} has the ${k} advantage: ${opponent.stats[k]} against your ${f.stats[k]}. Prepare for the gap or build your own strength.`;
  }
  const k = gaps.at(-1).k;
  return `Your ${k} is ${f.stats[k]} against ${opponent.stats[k]}. You lead on known skills; condition and tactics still matter.`;
}

// Mirrors the existing calendar's condition/cost rules, using public values.
// Skill gains remain server forecasts; hidden potential is never reconstructed.
export function gymWeekPreview(s, focus, chosen = null, untilEvent = false) {
  const view = structuredClone(s);
  const f = view.fighters.find((x) => x.id === focus.id);
  if (chosen?.type === "camp" && !f.camp) {
    f.camp = {
      ...chosen,
      startedWeek: s.week,
      endWeek: s.week + chosen.weeks,
      completed: 0,
      scheduleVersion: s.rules.campScheduleVersion || 1,
      reviewed: false,
    };
  }
  const weeks = advanceEstimate(view, untilEvent);
  const team = view.fighters.filter((x) => !x.retired && !x.released);
  const before = new Map(
    team.map((x) => [
      x.id,
      {
        readiness: readiness(x),
        training:
          !!x.camp &&
          !(
            x.camp.scheduleVersion >= 2 &&
            x.camp.weeks > 1 &&
            x.camp.completed + 1 === x.camp.weeks
          ),
        recoveryFinish:
          x.camp?.scheduleVersion >= 2 &&
          x.camp.weeks > 1 &&
          x.camp.completed + 1 === x.camp.weeks,
        assignment: fighterAssignment(
          view,
          x,
          x.id === focus.id ? chosen : null,
        ),
      },
    ]),
  );
  let cost = 0,
    waived = 0,
    cash = s.cash,
    tier = s.facilityTier;
  for (let step = 1; step <= weeks; step++) {
    const bill =
      s.weeklyCost +
      s.rules.facilities[tier].upkeep -
      s.rules.facilities[s.facilityTier].upkeep;
    const paid = Math.min(bill, cash);
    cash -= paid;
    cost += paid;
    waived += bill - paid;
    if (paid < bill)
      team.forEach((x) => {
        x.camp = null;
      });
    if (s.upgrade && s.upgrade.endWeek <= s.week + step)
      tier = s.facilityTier + 1;
    for (const x of team) {
      const recovery =
        x.camp?.scheduleVersion >= 2 &&
        x.camp.weeks > 1 &&
        (x.camp.completed || 0) + 1 === x.camp.weeks;
      x.fatigue =
        x.camp && !recovery
          ? Math.min(100, x.fatigue + s.rules.fatiguePerWeek)
          : Math.max(0, x.fatigue - restRecovery(s, tier));
      if (x.camp) x.camp.completed = (x.camp.completed || 0) + 1;
      if (x.camp && x.camp.endWeek <= s.week + step) x.camp = null;
    }
  }
  return {
    weeks,
    endWeek: s.week + weeks,
    cost,
    waived,
    cash,
    fighters: team.map((x) => ({
      id: x.id,
      name: x.name,
      portrait: x.portrait,
      weightClass: x.weightClass,
      age: x.age,
      before: before.get(x.id).readiness,
      after: readiness(x),
      assignment: before.get(x.id).assignment,
      work: waived
        ? "Recovery if operating funds run out"
        : before.get(x.id).recoveryFinish
          ? "Camp recovery finish"
          : before.get(x.id).training
            ? "Training"
            : fighterPair(s, x)
              ? "Mentoring & recovery"
              : "Recovery",
    })),
  };
}

// Uses public condition and observed plateaus only. Loading a plan never assigns it.
export function fightPreparationPlan(s, f) {
  const bout = fighterBout(s, f);
  if (!bout || bout.status !== "scheduled" || f.camp || fighterPair(s, f))
    return null;
  const lengths = campLengths(s, f);
  const weeks = [...lengths].reverse().find((w) => {
    const t = preparationTimeline(s, f, w, true);
    return t && t.atFight >= 85;
  });
  if (!weeks) return { type: "recover", title: "Rest before this fight" };
  const opponent = s.rivals.find((r) => r.id === bout.opponentId);
  const capped = (skill) =>
    f.growthKnowledge?.[skill]?.plateau &&
    f.stats[skill] >=
      (f.growthKnowledge[skill].observedAt ?? f.stats[skill]) - 0.1;
  const choices = trainingChoices(s, f, weeks).filter(
    (c) => c.type === "camp" && c.stat && !capped(c.stat),
  );
  choices.sort(
    (a, b) =>
      (opponent?.stats[b.stat] || 0) -
      f.stats[b.stat] -
      ((opponent?.stats[a.stat] || 0) - f.stats[a.stat]),
  );
  if (choices.length) return { ...choices[0], weeks };
  if (!trainingSkills.every(capped))
    return { ...trainingChoices(s, f, weeks)[0], weeks };

  // At known ceilings, offer short, useful preparation instead of new growth.
  // Longer camps and custom allocations remain available.
  const short = lengths.find(
    (length) => preparationTimeline(s, f, length, true)?.atFight >= 85,
  );
  const preparation = trainingChoices(s, f, short)
    .filter(
      (choice) =>
        choice.type === "camp" &&
        choice.stat &&
        preparationValue(s, choice.preset, short) > 0,
    )
    .sort(
      (a, b) =>
        (opponent?.stats[b.stat] || 0) -
          f.stats[b.stat] -
          ((opponent?.stats[a.stat] || 0) - f.stats[a.stat]) ||
        preparationValue(s, b.preset, short) -
          preparationValue(s, a.preset, short),
    );
  const best = preparation[0];
  if (!best)
    return {
      type: "recover",
      title: "Rest before this fight",
      reason:
        "Known skills are at their ceilings. Rest for fight night; another camp offers no useful preparation.",
    };
  if (
    f.preparation?.expiresWeek >= bout.eventWeek &&
    f.preparation.stat === best.stat &&
    f.preparation.value >= preparationValue(s, best.preset, short)
  )
    return {
      type: "recover",
      title: "Keep your preparation and rest",
      reason:
        "Known skills are at their ceilings. Your useful preparation is already covered; rest keeps it for fight night.",
    };
  return {
    ...best,
    weeks: short,
    reason: `Known skills are at their ceilings. Prepare ${best.stat} for this career bout; this is a temporary bonus, not permanent growth.`,
  };
}

export function importantWeekReport(report) {
  return Boolean(
    report &&
    (report.waived > 0 ||
      report.fighters?.some((f) =>
        [
          "camp-complete",
          "check-in",
          "fight-ready",
          "retired",
          "interrupted",
        ].includes(f.outcome),
      ) ||
      report.events?.some((e) =>
        [
          "upgrade",
          "mentoring",
          "retired",
          "gym-goal",
          "circuit-promotion",
          "journey-complete",
          "ambition-complete",
        ].includes(e.type),
      )),
  );
}
