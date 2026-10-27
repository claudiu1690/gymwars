const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
  forecast,
  weeklyCost,
  offers,
} = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");

const start = () => {
  const s = createCareer({
    seed: "staff-progression",
    name: "Staff Test",
    style: "boxing",
  });
  s.boutsCompleted = 1;
  s.cash = 100000;
  return s;
};
const command = (s, type, fields = {}) => applyCommand(s, { type, ...fields });
const rounded = (value) => Math.round(value * 10) / 10;
function completeCamp(
  s,
  weeks = 4,
  preset = "balanced",
  fighterId = "starter",
) {
  s = command(s, "camp", { fighterId, preset, weeks });
  for (let week = 0; week < weeks; week++) {
    if (s.fighters.find((f) => f.id === fighterId).camp?.needsReview)
      s = command(s, "camp-review", {
        fighterId,
        choice: "continue",
      });
    s = command(s, "advance", { confirmCosts: true });
  }
  return s;
}
function winBout(s, fighterId) {
  const f = s.fighters.find((f) => f.id === fighterId);
  f.stats = Object.fromEntries(Object.keys(f.stats).map((k) => [k, 99]));
  f.fatigue = 0;
  const offer = offers(s, f).find((o) => !o.blockedReason);
  assert.ok(offer);
  s.rivals.find((r) => r.id === offer.id).stats = Object.fromEntries(
    Object.keys(f.stats).map((k) => [k, 1]),
  );
  s = command(s, "book", { fighterId, opponentId: offer.id, weeks: 4 });
  s = command(s, "advance", { untilEvent: true, confirmCosts: true });
  const b = s.fights.at(-1);
  s = command(s, "auto-fight", { fightId: b.id, expectedRound: 0 });
  assert.equal(s.fights.at(-1).result.winner, "A");
  return s;
}
function qualifiedDossiers(s) {
  const fighters = ["featherweight", "lightweight", "middleweight"].map(
    (weightClass, i) => ({
      ...structuredClone(s.fighters[0]),
      id: "qualified-" + i,
      weightClass,
    }),
  );
  s.fighters.push(...fighters);
  s.staff.coach.development = {
    trainingWeeks: 40,
    campsCompleted: 10,
    proof: {
      camps: fighters.map((f, i) => ({
        fighterId: f.id,
        week: 0,
        focus: ["striking", "grappling", "submissions"][i],
      })),
    },
  };
  s.staff.scout.development = {
    investigations: 36,
    signings: 6,
    proof: {
      surveys: [
        "featherweight",
        "lightweight",
        "middleweight",
        "heavyweight",
      ].map((division, i) => ({
        id: "report-" + i,
        division,
        family: ["striking", "wrestling", "submission", "striking"][i],
      })),
      recruits: fighters.map((f) => f.id),
    },
  };
  s.fights = fighters.map((f, i) => ({
    id: "proof-" + i,
    status: "resolved",
    fighterId: f.id,
    result: { winner: "A" },
    resolvedWeek: 0,
    title: true,
    wasChampion: true,
    preparedWeek: 0,
  }));
  s.careerJourney.attempts = [
    {
      id: "proof-card",
      status: "won",
      eventWeek: 0,
      fighterIds: fighters.map((f) => f.id),
      fightIds: [],
      opponentIds: [],
      resolved: 3,
      wins: 3,
      losses: 0,
      draws: 0,
      reward: { cash: 0, legacy: 0 },
    },
  ];
}

test("legacy staff keeps rank-one costs, training and reports without mutating the save on reads", () => {
  const legacy = start();
  legacy.staff = { coach: { hiredWeek: 0 }, scout: { hiredWeek: 0 } };
  const ranked = structuredClone(legacy);
  ranked.staff.coach.rank = ranked.staff.scout.rank = 1;
  const before = structuredClone(legacy);
  const view = publicState(legacy);
  assert.deepEqual(legacy, before);
  assert.equal(view.staff.coach.rank, 1);
  assert.equal(view.staff.scout.rank, 1);
  assert.equal(weeklyCost(legacy), 55);
  assert.equal(view.staffOptions.coach.next.rank, 2);
  assert.deepEqual(
    completeCamp(legacy).fighters,
    completeCamp(ranked).fighters,
  );
  assert.equal(
    publicState(completeCamp(legacy, 1)).fighters[0].stats.striking,
    48.7,
  );
  for (const role of ["coach", "scout"]) {
    assert.equal(CAREER.staff[role].fee, CAREER.staff[role].ranks[1].fee);
    assert.equal(CAREER.staff[role].upkeep, CAREER.staff[role].ranks[1].upkeep);
  }
});

test("staff promotions charge once, use current rank upkeep and preserve hire/release commands", () => {
  let s = start();
  const cash = s.cash;
  s = command(s, "hire", { role: "coach" });
  s = command(s, "hire", { role: "scout" });
  assert.equal(s.cash, cash - 800);
  assert.equal(weeklyCost(s), 55);
  qualifiedDossiers(s);
  for (const [rank, tier] of [
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 6],
  ]) {
    s.facilityTier = tier;
    for (const role of ["coach", "scout"]) {
      const before = s.cash;
      const next = publicState(s).staffOptions[role].next;
      assert.equal(publicState(s).staffOptions[role].canUpgrade, true);
      s = command(s, "upgrade-staff", { role });
      assert.equal(s.cash, before - next.fee);
      assert.equal(s.staff[role].rank, rank);
    }
    const expected =
      CAREER.facilities[tier].upkeep +
      CAREER.staff.coach.ranks[rank].upkeep +
      CAREER.staff.scout.ranks[rank].upkeep;
    assert.equal(weeklyCost(s), expected);
    const before = s.cash;
    s = command(s, "advance", { confirmCosts: true });
    assert.equal(s.cash, before - expected);
  }
  assert.equal(publicState(s).staffOptions.coach.next, null);
  assert.equal(publicState(s).staffOptions.coach.canUpgrade, false);
  s = command(s, "fire", { role: "coach" });
  assert.equal(s.staff.coach, undefined);
  assert.equal(weeklyCost(s), CAREER.facilities[6].upkeep + 35);
  s = command(s, "hire", { role: "coach" });
  assert.equal(s.staff.coach.rank, 1);
});

test("invalid promotions cannot spend cash, skip facility gates or exceed rank five", () => {
  const unhired = start();
  const hired = command(unhired, "hire", { role: "coach" });
  const locked = structuredClone(hired);
  locked.upgrade = { tier: 2, endWeek: 4 };
  const poor = structuredClone(hired);
  poor.facilityTier = 2;
  poor.cash = CAREER.staff.coach.ranks[2].fee - 1;
  poor.staff.scout = { rank: 1, hiredWeek: 0 };
  qualifiedDossiers(poor);
  const maxed = structuredClone(hired);
  maxed.facilityTier = 6;
  maxed.staff.coach.rank = 5;
  for (const [state, role, message] of [
    [unhired, "coach", /Hire/],
    [locked, "coach", /Neighborhood gym/],
    [poor, "coach", /1200/],
    [maxed, "coach", /highest rank/],
    [hired, "__proto__", /Hire/],
    [hired, "other", /Hire/],
  ]) {
    const before = structuredClone(state);
    assert.throws(() => command(state, "upgrade-staff", { role }), message);
    assert.deepEqual(state, before);
  }
  const fresh = createCareer({ seed: "no-staff", name: "Opening Gym" });
  assert.throws(
    () => command(fresh, "hire", { role: "coach" }),
    /opening bout/,
  );
  assert.equal(publicState(fresh).staffOptions.coach.canHire, false);
  assert.match(
    publicState(locked).staffOptions.coach.blockedReason,
    /Neighborhood gym/,
  );
});

test("cash cannot buy coaching experience; actual training and completed camps earn a promotion", () => {
  let s = command(start(), "hire", { role: "coach" });
  s.facilityTier = 6;
  const before = structuredClone(s);
  assert.throws(
    () => command(s, "upgrade-staff", { role: "coach" }),
    /coaching promotion quests/,
  );
  assert.deepEqual(s, before);
  s = command(s, "camp", {
    fighterId: "starter",
    preset: "balanced",
    weeks: 4,
  });
  assert.deepEqual(s.staff.coach.development, {
    trainingWeeks: 0,
    campsCompleted: 0,
  });
  for (let week = 0; week < 4; week++) {
    if (s.fighters[0].camp?.needsReview)
      s = command(s, "camp-review", {
        fighterId: "starter",
        choice: "continue",
      });
    s = command(s, "advance", { confirmCosts: true });
  }
  assert.deepEqual(
    publicState(s).staffOptions.coach.development.progress,
    { trainingWeeks: 3, campsCompleted: 1 },
    "recovery finishes a camp but is not a training week",
  );
  assert.equal(publicState(s).staffOptions.coach.canUpgrade, false);
  s = completeCamp(s, 1);
  assert.equal(
    publicState(s).staffOptions.coach.canUpgrade,
    false,
    "one-week repeats cannot qualify another fighter",
  );
  s = command(s, "veteran");
  s = completeCamp(s, 4, "pressure", "veteran");
  assert.equal(
    publicState(s).staffOptions.coach.canUpgrade,
    false,
    "camps alone are insufficient",
  );
  s = winBout(s, "starter");
  assert.equal(publicState(s).staffOptions.coach.canUpgrade, true);
  const cash = s.cash,
    week = s.week;
  s = command(s, "upgrade-staff", {
    role: "coach",
    development: { trainingWeeks: 999 },
  });
  assert.equal(s.staff.coach.rank, 2);
  assert.equal(s.cash, cash - 1200);
  assert.equal(s.week, week);
  assert.equal(s.staff.coach.development.proof.camps.length, 2);
  assert.throws(
    () => command(s, "upgrade-staff", { role: "coach" }),
    /coaching promotion quests/,
  );
});

test("scouts develop from investigated prospects and real signings while employed", () => {
  let s = start();
  s = command(s, "investigate", { reportId: s.board[0].id });
  s = command(s, "hire", { role: "scout" });
  s.facilityTier = 6;
  assert.deepEqual(
    s.staff.scout.development,
    { investigations: 0, signings: 0 },
    "pre-hire work does not count",
  );
  for (let i = 0; i < 4; i++) {
    if (s.scoutsUsed >= 2) s = command(s, "advance", { confirmCosts: true });
    const surveyed =
      s.staff.scout.development.proof?.surveys?.map((p) => p.division) || [];
    const report =
      s.board.find(
        (entry) =>
          !entry.investigated && !surveyed.includes(entry.fighter.weightClass),
      ) || s.board.find((entry) => !entry.investigated);
    s = command(s, "investigate", { reportId: report.id });
    if (i === 0) s = command(s, "sign", { reportId: report.id });
  }
  assert.deepEqual(publicState(s).staffOptions.scout.development.progress, {
    investigations: 4,
    signings: 1,
  });
  assert.equal(
    publicState(s).staffOptions.scout.canUpgrade,
    false,
    "recruitment without a debut is not enough",
  );
  s = winBout(s, s.staff.scout.development.proof.recruits[0]);
  assert.equal(publicState(s).staffOptions.scout.canUpgrade, true);
  const before = structuredClone(s);
  for (let i = 0; i < 5; i++) publicState(s);
  assert.deepEqual(s, before, "reads cannot earn experience");
  s = command(s, "upgrade-staff", { role: "scout" });
  assert.equal(s.staff.scout.rank, 2);
  assert.throws(
    () => command(s, "upgrade-staff", { role: "scout" }),
    /scouting promotion quests/,
  );
});

test("cancelled camps, rehires and legacy staff preserve honest development boundaries", () => {
  let s = command(start(), "hire", { role: "coach" });
  s = command(s, "camp", {
    fighterId: "starter",
    preset: "balanced",
    weeks: 4,
  });
  s = command(s, "cancel-camp", { fighterId: "starter" });
  assert.deepEqual(s.staff.coach.development, {
    trainingWeeks: 0,
    campsCompleted: 0,
  });
  s = command(s, "camp", {
    fighterId: "starter",
    preset: "balanced",
    weeks: 4,
  });
  s = command(s, "advance", { confirmCosts: true });
  s = command(s, "advance", { confirmCosts: true });
  s = command(s, "camp-review", { fighterId: "starter", choice: "taper" });
  assert.deepEqual(s.staff.coach.development, {
    trainingWeeks: 2,
    campsCompleted: 0,
  });
  s = command(s, "fire", { role: "coach" });
  s = command(s, "hire", { role: "coach" });
  assert.deepEqual(s.staff.coach.development, {
    trainingWeeks: 0,
    campsCompleted: 0,
  });
  const legacy = start();
  legacy.facilityTier = 6;
  legacy.staff.coach = { rank: 3, hiredWeek: 0 };
  const before = structuredClone(legacy),
    option = publicState(legacy).staffOptions.coach;
  assert.equal(option.currentRank, 3);
  assert.deepEqual(option.development.progress, {
    trainingWeeks: 12,
    campsCompleted: 3,
  });
  assert.equal(
    option.canUpgrade,
    false,
    "honoring an old rank does not grant another",
  );
  assert.deepEqual(legacy, before);
});

test("promotion achievements require distinct fighters and preparation before the sporting result", () => {
  const { staffDevelopment } = require("../consts/staffDevelopment");
  const s = start();
  s.facilityTier = 6;
  s.staff = {
    coach: { rank: 1, hiredWeek: 0 },
    scout: { rank: 1, hiredWeek: 0 },
  };
  qualifiedDossiers(s);
  const original = structuredClone(s);
  const coach = () => staffDevelopment(s.staff.coach, "coach", s);
  assert.equal(coach().qualified, true);
  s.staff.coach.development.proof.camps.forEach((c) => (c.week = 2));
  assert.equal(
    coach().requirements.find((q) => q.id === "winningFighters").current,
    0,
    "wins before preparation do not qualify",
  );
  s.staff.coach.rank = 3;
  assert.equal(
    coach().requirements.find((q) => q.id === "teamTrophies").current,
    0,
    "a trophy before preparation does not qualify",
  );
  s.staff.coach.development.proof.camps = [...Array(10)].map(() => ({
    fighterId: "qualified-0",
    week: 0,
    focus: "striking",
  }));
  s.staff.coach.rank = 1;
  assert.equal(
    coach().requirements.find((q) => q.id === "campFighters").current,
    1,
    "repeating one fighter cannot qualify two",
  );
  s.staff.scout.development.proof.recruits = ["starter"];
  assert.equal(
    staffDevelopment(s.staff.scout, "scout", s).requirements.find(
      (q) => q.id === "debutRecruits",
    ).current,
    0,
    "pre-existing record numbers do not establish a recruit debut",
  );
  const before = structuredClone(s);
  for (let i = 0; i < 3; i++) publicState(s);
  assert.deepEqual(s, before);
  s.staff = original.staff;
  s.fights = original.fights;
  s.facilityTier = 1;
  s.cash = 0;
  const option = publicState(s).staffOptions.coach;
  assert.equal(option.development.qualified, true);
  assert.deepEqual(
    option.promotionChecks.filter((c) => !c.complete).map((c) => c.id),
    ["facility", "cash"],
    "every simultaneous blocker is visible",
  );
});

test("every coach rank forecasts rounded uncapped camp growth and its extra benefit", () => {
  for (const rank of [0, 1, 2, 3, 4, 5])
    for (const age of [23, 24.97, 32.99, 35]) {
      let s = start();
      s.facilityTier = 6;
      if (rank) s.staff.coach = { hiredWeek: 0, rank };
      const f = s.fighters[0];
      f.age = age;
      const projected = forecast(s, f, CAREER.presets.pressure.allocations, 4);
      const before = { ...f.stats };
      const uncoached = structuredClone(s);
      uncoached.staff = {};
      const result = completeCamp(s, 4, "pressure");
      const baseline = completeCamp(uncoached, 4, "pressure");
      for (const key of Object.keys(before)) {
        assert.equal(
          projected.estimatedGains[key],
          rounded(result.fighters[0].stats[key] - before[key]),
          `${rank}/${age}/${key}`,
        );
        assert.equal(
          projected.coachImpact.estimatedGainsWithoutCoach[key],
          rounded(baseline.fighters[0].stats[key] - before[key]),
        );
        assert.equal(
          projected.coachImpact.extraGains[key],
          rounded(
            result.fighters[0].stats[key] - baseline.fighters[0].stats[key],
          ),
        );
      }
      assert.equal(projected.coachImpact.rank, rank);
      assert.equal(
        projected.coachImpact.bonusPercent,
        rank ? [0, 15, 25, 35, 45, 55][rank] : 0,
      );
      assert.equal(JSON.stringify(projected).includes("potential"), false);
      assert.equal(publicState(s).fighters[0].potential, undefined);
    }
});

test("forecast and coach benefit do not disclose hidden potential before training reaches it", () => {
  const high = start();
  high.staff.coach = { hiredWeek: 0, rank: 3 };
  const low = structuredClone(high);
  for (const key of Object.keys(high.fighters[0].stats)) {
    high.fighters[0].potential[key] = 99;
    low.fighters[0].potential[key] = low.fighters[0].stats[key] + 0.2;
  }
  for (const weeks of [1, 4, 6]) {
    for (const allocations of [
      CAREER.presets.balanced.allocations,
      CAREER.presets.pressure.allocations,
      { striking: 100, grappling: 0, submissions: 0, conditioning: 0 },
    ]) {
      assert.deepEqual(
        forecast(low, low.fighters[0], allocations, weeks),
        forecast(high, high.fighters[0], allocations, weeks),
      );
    }
  }
  const projected = forecast(
    low,
    low.fighters[0],
    CAREER.presets.balanced.allocations,
    4,
  );
  const actual = completeCamp(low);
  for (const key of Object.keys(low.fighters[0].stats)) {
    const actualGain = rounded(
      actual.fighters[0].stats[key] - low.fighters[0].stats[key],
    );
    assert.equal(actualGain, 0.2);
    assert.ok(actualGain < projected.estimatedGains[key]);
    assert.equal(actual.fighters[0].lastCamp.stalled.includes(key), true);
  }
});

test("scout ranks narrow public stat ranges without changing rarity rolls or revealing hidden values", () => {
  const base = start();
  for (const rank of [0, 1, 2, 3, 4, 5]) {
    const s = structuredClone(base);
    if (rank) s.staff.scout = { hiredWeek: 0, rank };
    const investigated = command(s, "investigate", { reportId: s.board[0].id });
    const control = command(base, "investigate", {
      reportId: base.board[0].id,
    });
    assert.deepEqual(investigated.board[0].fighter, control.board[0].fighter);
    assert.deepEqual(investigated.scouting, control.scouting);
    const report = publicState(investigated).board[0].fighter;
    const width = rank ? [0, 6, 4, 2, 1, 0][rank] : 12;
    for (const [key, [lo, hi]] of Object.entries(report.statRanges)) {
      const actual = investigated.board[0].fighter.stats[key];
      assert.ok(lo <= actual && actual <= hi);
      assert.ok(lo >= 1 && hi <= 99 && hi - lo <= width);
      if (rank === 5) assert.deepEqual([lo, hi], [actual, actual]);
    }
    assert.equal(report.stats, undefined);
    assert.equal(report.potential, undefined);
    assert.equal(report.traits, undefined);
    assert.deepEqual(
      publicState(investigated).scouting.odds,
      publicState(control).scouting.odds,
    );
  }
});

test("mentoring eligibility gives safe pre-commitment reasons without exposing a junior's hidden traits", () => {
  let s = command(start(), "veteran");
  const mentor = s.fighters.find((f) => f.id === "veteran");
  const junior = s.fighters[0];
  mentor.discoveredTraits = ["cardio-machine"];
  junior.traits = ["cardio-machine"];
  junior.discoveredTraits = [];
  let view = publicState(s);
  let option = view.mentoringOptions.find(
    (x) =>
      x.mentorId === mentor.id &&
      x.juniorId === junior.id &&
      x.trait === "cardio-machine",
  );
  assert.equal(option.canStart, false);
  assert.equal(
    option.blockedReason,
    "This trait cannot be passed to this fighter.",
  );
  assert.equal(view.fighters[0].traits, undefined);
  junior.traits = [];
  view = publicState(s);
  option = view.mentoringOptions.find(
    (x) =>
      x.mentorId === mentor.id &&
      x.juniorId === junior.id &&
      x.trait === "cardio-machine",
  );
  assert.equal(option.canStart, true);
  const result = command(s, "mentor", option);
  assert.equal(result.mentoring[0].endWeek, s.week + option.weeks);
  assert.equal(result.mentoring[0].chance, option.chance);
  assert.equal(
    publicState(result).mentoringOptions.find(
      (x) => x.mentorId === mentor.id && x.juniorId === junior.id,
    ).canStart,
    false,
  );
});
