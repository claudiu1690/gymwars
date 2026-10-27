const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
} = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const { contractTerms, circuitEntry } = require("../engine/careerEconomy");
const act = (s, type, data = {}) => applyCommand(s, { type, ...data });
function promoted(seed = "followup") {
  let s = createCareer({ seed, name: "Lab corner", style: "boxing" });
  s.gymGoals = Object.fromEntries(
    CAREER.circuits.map((c) => [c.goalId, { week: 0 }]),
  );
  return act(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
}
function finish(s, id) {
  const b = s.fights.find((b) => b.id === id);
  while (s.week < b.eventWeek) s = act(s, "advance", { confirmCosts: true });
  return act(s, "auto-fight", { fightId: id, expectedRound: 0 });
}
function proveStyles(s, circuit = "city") {
  for (const p of CAREER.circuitPacks
    .find((p) => p.circuitId === circuit)
    .opponents.filter((p) => !p.capstone))
    s.fights.push({
      id: `proof-${circuit}-${p.id}`,
      fighterId: "starter",
      status: "resolved",
      result: { winner: "A" },
      circuit: { id: circuit },
      circuitOpponentId: p.id,
      eventWeek: 0,
    });
}
test("gym access does not qualify a new fighter; both booking APIs enforce individual wins while regional fights stay open", () => {
  const s = promoted(),
    f = s.fighters[0];
  const original = structuredClone(s),
    all = offers(s, f);
  for (const o of all.filter((o) => o.circuit.level > 1)) {
    assert.equal(o.qualification.qualified, false);
    assert.match(o.unavailable, /career wins/);
    for (const command of [
      { type: "accept-offer", offerId: o.offerId },
      { type: "book", opponentId: o.id, weeks: 4 },
    ])
      assert.throws(
        () => applyCommand(s, { ...command, fighterId: f.id }),
        /career wins/,
      );
  }
  const regional = all.find((o) => o.circuit.level === 1 && !o.unavailable);
  assert.ok(regional);
  const booked = act(s, "accept-offer", {
    fighterId: f.id,
    offerId: regional.offerId,
  });
  assert.equal(booked.week, 0);
  assert.deepEqual(s, original);
  f.record.wins = 2;
  assert.ok(
    offers(s, f).find((o) => o.circuit.id === "city").qualification.qualified,
  );
  assert.ok(
    !offers(s, f).find((o) => o.circuit.id === "world").qualification.qualified,
  );
  f.record.wins = 4;
  assert.ok(
    offers(s, f).find((o) => o.circuit.id === "world").qualification.qualified,
  );
});
test("a historical victory proves that fighter's circuit entry without granting access to an unproven reserve", () => {
  const s = promoted(),
    f = s.fighters[0],
    world = CAREER.circuits.at(-1);
  s.fights.push({
    fighterId: f.id,
    status: "resolved",
    result: { winner: "A" },
    circuit: { id: "world" },
  });
  assert.ok(circuitEntry(s, f, world).qualified);
  const reserve = { ...structuredClone(f), id: "reserve" };
  assert.ok(!circuitEntry(s, reserve, world).qualified);
});
test("title premiums are quoted honestly for skill gaps and repeated gym victories, with stale price IDs rejected", () => {
  let s = promoted(),
    f = s.fighters[0];
  f.isChampion = true;
  const r = s.rivals.find(
    (r) =>
      r.weightClass === f.weightClass &&
      !r.circuitOpponentId &&
      !r.circuitChallenge &&
      !r.invitational,
  );
  r.isChampion = false;
  r.rankingPoints = 80;
  f.stats = Object.fromEntries(Object.keys(f.stats).map((k) => [k, 78]));
  r.stats = Object.fromEntries(Object.keys(r.stats).map((k) => [k, 39]));
  const raw = {
    id: r.id,
    title: true,
    opponent: r,
    circuit: { id: "regional" },
    show: 500,
    winBonus: 900,
  };
  let q = contractTerms(s, raw, f.id);
  assert.deepEqual([q.show, q.winBonus], [300, 450]);
  assert.ok(q.titlePurse.development);
  r.stats = Object.fromEntries(Object.keys(r.stats).map((k) => [k, 66]));
  q = contractTerms(s, raw, f.id);
  assert.deepEqual([q.show, q.winBonus], [500, 900]);
  s.fights.push(
    ...[1, 2].map((i) => ({
      id: "old-" + i,
      opponentId: r.id,
      status: "resolved",
      result: { winner: "A" },
    })),
  );
  assert.equal(contractTerms(s, raw, f.id).show, 300);
  s = act(s, "plan", { fighterId: f.id, plan: f.gameplan });
  const title = offers(s, s.fighters[0]).find((o) => o.title);
  assert.match(title.offerId, /-t2$/);
  assert.throws(
    () =>
      act(s, "accept-offer", {
        fighterId: f.id,
        offerId: title.offerId.replace(/-t2$/, ""),
      }),
    /available/,
  );
});
test("regional challengers refresh without rewriting rivals, exceeding their ceiling, or accumulating on every command", () => {
  let s = promoted(),
    f = s.fighters[0];
  f.isChampion = true;
  f.stats = Object.fromEntries(Object.keys(f.stats).map((k) => [k, 95]));
  const before = structuredClone(s.rivals);
  s = act(s, "plan", { fighterId: f.id, plan: f.gameplan });
  const challengers = s.rivals.filter((r) =>
    r.id.startsWith("title-challenger-"),
  );
  assert.equal(challengers.length, 1);
  assert.equal(
    Object.values(challengers[0].stats).reduce((n, v) => n + v, 0) / 4,
    66,
  );
  for (const old of before)
    assert.deepEqual(
      s.rivals.find((r) => r.id === old.id),
      old,
    );
  const count = s.rivals.length;
  for (let i = 0; i < 8; i++)
    s = act(s, "plan", { fighterId: f.id, plan: f.gameplan });
  assert.equal(s.rivals.length, count);
});
test("World Open follows the two earlier challenge trophies; accepted older invitations still settle unchanged", () => {
  let s = promoted("challenge-prize"),
    f = s.fighters[0];
  f.record.wins = 4;
  let world = publicState(s).gymDevelopment.challenges.find(
    (c) => c.id === "world-open",
  );
  assert.ok(world.locked);
  assert.match(world.blockedReason, /National Showcase and Next Generation/);
  assert.ok(!offers(s, f).some((o) => o.challengeId === world.id));
  s.careerChallenges["national-showcase"] = { week: 0 };
  assert.match(
    publicState(s).gymDevelopment.challenges.find((c) => c.id === world.id)
      .blockedReason,
    /Next Generation/,
  );
  s.careerChallenges["next-generation"] = { week: 0 };
  f.stats = Object.fromEntries(Object.keys(f.stats).map((k) => [k, 95]));
  const o = offers(s, f).find((o) => o.challengeId === world.id);
  s = act(s, "accept-offer", { fighterId: f.id, offerId: o.offerId });
  const signed = structuredClone(s.fights.at(-1));
  delete s.careerChallenges["next-generation"];
  s.fighters[0].record.wins = 0;
  const readBefore = structuredClone(s);
  assert.ok(
    !publicState(s).gymDevelopment.challenges.find((c) => c.id === world.id)
      .locked,
  );
  assert.deepEqual(s, readBefore);
  s = finish(s, signed.id);
  assert.equal(s.fights.at(-1).show, signed.show);
  assert.equal(s.fights.at(-1).winBonus, signed.winBonus);
  assert.deepEqual(s.fights.at(-1).challengeReward, signed.challengeReward);
  assert.equal(s.fights.at(-1).status, "resolved");
});
test("new circuit honors pay a separate first-victory prize once; old signed capstones gain no retroactive cash", () => {
  for (const legacy of [false, true]) {
    let s = promoted("capstone");
    proveStyles(s);
    s.fighters[0].record.wins = 4;
    s.fighters[0].stats = Object.fromEntries(
      Object.keys(s.fighters[0].stats).map((k) => [k, 99]),
    );
    const o = offers(s, s.fighters[0]).find(
      (o) => o.capstone && o.circuit.id === "city",
    );
    assert.equal(o.honorReward.cash, 1000);
    assert.match(o.offerId, /-h1$/);
    assert.throws(
      () =>
        act(s, "accept-offer", {
          fighterId: "starter",
          offerId: o.offerId.replace(/-h1$/, ""),
        }),
      /available/,
    );
    s.rivals.find((r) => r.id === o.id).stats = Object.fromEntries(
      Object.keys(s.fighters[0].stats).map((k) => [k, 1]),
    );
    s = act(s, "accept-offer", { fighterId: "starter", offerId: o.offerId });
    if (legacy) delete s.fights.at(-1).honorReward;
    s = finish(s, s.fights.at(-1).id);
    const b = s.fights.at(-1);
    assert.equal(b.result.winner, "A");
    assert.equal(b.rewards.purse, 750);
    assert.equal(b.rewards.trophyEarnings.cash, legacy ? 0 : 1000);
    assert.equal(b.rewards.honor.alreadyEarned, false);
    assert.equal(
      s.economyTotals.byReason["career-circuit-honor"] || 0,
      legacy ? 0 : 1000,
    );
    assert.ok(
      !publicState(s).gymDevelopment.sportingGoals.some((g) => g.id === "city"),
    );
    assert.ok(
      !offers(s, s.fighters[0]).some(
        (q) => q.circuit.id === "city" && q.honorReward,
      ),
    );
    const before = structuredClone(s);
    assert.throws(() =>
      act(s, "auto-fight", { fightId: b.id, expectedRound: 0 }),
    );
    assert.deepEqual(s, before);
  }
});
test("mentoring explains known duplicates before schedule conflicts, offers eligible juniors, and never names hidden traits", () => {
  const s = promoted(),
    junior = s.fighters[0];
  junior.age = 22;
  junior.traits = ["cardio-machine"];
  junior.discoveredTraits = ["cardio-machine"];
  junior.camp = { endWeek: 4 };
  const mentor = {
    ...structuredClone(junior),
    id: "veteran",
    name: "Veteran",
    age: 35,
    camp: null,
  };
  const other = {
    ...structuredClone(junior),
    id: "junior",
    name: "Eligible Junior",
    traits: [],
    discoveredTraits: [],
    camp: null,
  };
  s.fighters.push(mentor, other);
  let view = publicState(s);
  assert.match(
    view.mentoringOptions.find((o) => o.juniorId === junior.id).blockedReason,
    /already has cardio machine/,
  );
  assert.ok(
    view.mentoringOptions.find((o) => o.juniorId === other.id).canStart,
  );
  junior.discoveredTraits = [];
  junior.camp = null;
  view = publicState(s);
  const reason = view.mentoringOptions.find(
    (o) => o.juniorId === junior.id,
  ).blockedReason;
  assert.match(reason, /cannot be passed/);
  assert.doesNotMatch(reason, /cardio|already has/);
  assert.deepEqual(
    view.fighters.find((f) => f.id === junior.id).discoveredTraits,
    [],
  );
});
test("two signed division capstones share a single first-honor award while both accepted purses are paid", () => {
  let s = promoted("capstone");
  proveStyles(s);
  s.fighters[0].record.wins = 4;
  s.fighters[0].stats = Object.fromEntries(
    Object.keys(s.fighters[0].stats).map((k) => [k, 99]),
  );
  s.fighters.push({
    ...structuredClone(s.fighters[0]),
    id: "other",
    weightClass: "featherweight",
  });
  for (const r of s.rivals.filter((r) => r.capstone))
    r.stats = Object.fromEntries(Object.keys(r.stats).map((k) => [k, 1]));
  for (const id of ["starter", "other"]) {
    const o = offers(
      s,
      s.fighters.find((f) => f.id === id),
    ).find((o) => o.capstone && o.circuit.id === "city");
    s = act(s, "accept-offer", { fighterId: id, offerId: o.offerId });
    assert.equal(s.fights.at(-1).honorReward.cash, 1000);
  }
  const ids = s.fights.slice(-2).map((b) => b.id);
  for (const id of ids) s = finish(s, id);
  const bouts = s.fights.slice(-2);
  assert.ok(bouts.every((b) => b.result.winner === "A"));
  assert.deepEqual(
    bouts.map((b) => b.rewards.purse),
    [750, 750],
  );
  assert.deepEqual(
    bouts.map((b) => b.rewards.trophyEarnings.cash),
    [1000, 0],
  );
  assert.equal(bouts[1].rewards.honor.alreadyEarned, true);
  assert.equal(s.economyTotals.byReason["career-circuit-honor"], 1000);
});
test("old title defense contracts keep their full accepted premium after the current quote changes", () => {
  let s = promoted("legacy-defense"),
    f = s.fighters[0];
  f.rankingPoints = 80;
  f.stats = Object.fromEntries(Object.keys(f.stats).map((k) => [k, 99]));
  const o = offers(s, f).find((o) => o.title);
  assert.equal(o.titlePurse.development, true);
  s = act(s, "accept-offer", { fighterId: f.id, offerId: o.offerId });
  // Declared historical signed contract, never a player save migration.
  const b = s.fights.at(-1);
  b.show = 500;
  b.winBonus = 900;
  b.combatVersion = 4;
  delete b.titlePurse;
  s = finish(s, b.id);
  const settled = s.fights.at(-1);
  assert.deepEqual(
    [settled.show, settled.winBonus, settled.combatVersion],
    [500, 900, 4],
  );
  assert.equal(
    settled.rewards.purse,
    settled.result.winner === "A" ? 1400 : 500,
  );
});
