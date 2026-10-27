const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  offers,
  publicState,
} = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const act = (s, type, data = {}) => applyCommand(s, { type, ...data });
function late() {
  let s = createCareer({
    seed: "late-grind-rules",
    name: "Lab",
    style: "boxing",
  });
  s.gymGoals = Object.fromEntries(
    CAREER.circuits.map((c) => [c.goalId, { week: 0 }]),
  );
  s.fighters[0].record.wins = 4;
  return act(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
}
function cappedBout() {
  let s = late();
  const f = s.fighters[0];
  f.growthKnowledge = {};
  for (const key of Object.keys(f.stats)) {
    f.stats[key] = f.potential[key] = 60;
    f.growthKnowledge[key] = { plateau: true, observedAt: 60, observedWeek: 0 };
  }
  const o = offers(s, f).find((o) => o.circuit.id === "regional" && !o.title);
  const r = s.rivals.find((r) => r.id === o.id);
  r.stats = { striking: 55, grappling: 80, submissions: 60, conditioning: 55 };
  return act(s, "book", { fighterId: f.id, opponentId: r.id, weeks: 4 });
}

test("completed lower circuits feature an appropriate ordinary matchup without altering signed bouts or purses", () => {
  const s = late(),
    f = s.fighters[0];
  for (const key of Object.keys(f.stats)) f.stats[key] = 55;
  const rivals = s.rivals.filter(
    (r) => r.circuitId === "city" && r.weightClass === f.weightClass,
  );
  for (const [index, r] of rivals.entries()) {
    r.stats = Object.fromEntries(
      Object.keys(r.stats).map((key) => [key, index === 1 ? 55 : 85]),
    );
    s.fights.push({
      id: "proof-" + r.id,
      fighterId: f.id,
      opponentId: r.id,
      status: "resolved",
      result: { winner: "A" },
      circuit: { id: "city" },
      circuitOpponentId: r.circuitOpponentId,
      eventWeek: 0,
    });
  }
  s.circuitHonors.city = { week: 0 };
  const before = structuredClone(s),
    shown = offers(s, f);
  const city = shown.filter((offer) => offer.circuit.id === "city");
  assert.equal(city.length, 1);
  assert.equal(city[0].id, rivals[1].id);
  assert.equal(city[0].show, 300);
  assert.equal(city[0].winBonus, 450);
  assert.ok(shown.filter((offer) => offer.circuit.id === "world").length >= 2);
  assert.deepEqual(s, before);
  for (const rival of rivals.filter((rival) => !rival.capstone))
    s.fights.push({ fighterId: "another-fighter-" + rival.id, opponentId: rival.id, status: "scheduled", eventWeek: 4 });
  const fallback = offers(s, f).find((offer) => offer.circuit.id === "city");
  assert.ok(fallback.capstone, "A valid repeat capstone remains available when ordinary opponents are already booked");
  assert.equal(fallback.honorReward, null);
});

test("public offer advice prefers reachable sporting steps, honors explicit circuit intent and preserves every choice", async () => {
  const { offerPurpose, suggestedOffer } =
    await import("../frontend/src/careerOffers.mjs");
  const s = publicState(late()),
    f = s.fighters[0];
  const before = structuredClone(s);
  const eligible = f.offers.filter((offer) => !offer.unavailable);
  const next = suggestedOffer(s, f, eligible);
  assert.ok(next);
  assert.ok(offerPurpose(s, f, next).gap >= -12);
  const world = suggestedOffer(s, f, eligible, "world");
  assert.equal(world.circuit.id, "world");
  assert.equal(offerPurpose(s, f, world).matchup, "Stronger opponent");
  assert.ok(suggestedOffer(s, f, eligible, "invalid"));
  assert.equal(suggestedOffer(s, f, []), undefined);
  assert.deepEqual(s, before);
});

test("a new circuit style advances the gym invitation once; rematches and earned honors describe their actual payoff", async () => {
  const { offerPurpose } = await import("../frontend/src/careerOffers.mjs");
  const s = publicState(late()),
    f = s.fighters[0];
  const o = f.offers.find((offer) => offer.circuit.id === "city");
  assert.equal(offerPurpose(s, f, o).kind, "invitation");
  assert.match(offerPurpose(s, f, o).description, /0\/2/);
  s.fights.push({
    fighterId: "another-division",
    status: "resolved",
    result: { winner: "A" },
    circuit: o.circuit,
    circuitOpponentId: o.circuitOpponentId,
  });
  assert.equal(offerPurpose(s, f, o).kind, "rematch");
  assert.match(offerPurpose(s, f, o).description, /other style/);
  s.circuitHonors.city = { week: 0 };
  assert.match(offerPurpose(s, f, o).description, /no repeat honor prize/);
});

test("known-ceiling preparation uses a short relevant camp and rests once its bonus is covered", async () => {
  const { fightPreparationPlan, trainingChoices } =
    await import("../frontend/src/trainingPlans.mjs");
  const raw = cappedBout(),
    before = structuredClone(raw),
    s = publicState(raw),
    f = s.fighters[0];
  const plan = fightPreparationPlan(s, f);
  assert.equal(plan.stat, "grappling");
  assert.equal(plan.weeks, 1);
  assert.match(plan.reason, /temporary bonus, not permanent growth/);
  assert.ok(
    trainingChoices(s, f, 4).some((choice) => choice.id === "balanced"),
  );
  f.preparation = { stat: "grappling", value: 20, expiresWeek: 8 };
  assert.equal(fightPreparationPlan(s, f).type, "recover");
  f.preparation.expiresWeek = 2;
  assert.equal(fightPreparationPlan(s, f).stat, "grappling");
  f.stats.grappling = 59;
  assert.ok(
    fightPreparationPlan(s, f).weeks > 1,
    "Aging below an observed ceiling still permits development",
  );
  assert.deepEqual(raw, before);
});

test("recommended preparation assigns without time, retains ceilings and signed fees, and avoids a redundant second camp", async () => {
  const { fightPreparationPlan } =
    await import("../frontend/src/trainingPlans.mjs");
  let s = cappedBout();
  const signed = structuredClone(s.fights.at(-1)),
    view = publicState(s);
  const plan = fightPreparationPlan(view, view.fighters[0]);
  s = act(s, "camp", {
    fighterId: "starter",
    preset: plan.preset,
    weeks: plan.weeks,
    allocations: plan.allocations,
  });
  assert.equal(s.week, 0);
  s = act(s, "advance", { confirmCosts: true });
  assert.equal(s.week, 1);
  assert.ok(
    Object.values(s.fighters[0].lastCamp.gains).every((gain) => gain === 0),
  );
  assert.equal(s.fighters[0].preparation.stat, "grappling");
  const prepared = publicState(s);
  assert.equal(
    fightPreparationPlan(prepared, prepared.fighters[0]).type,
    "recover",
  );
  while (s.week < signed.eventWeek)
    s = act(s, "advance", { confirmCosts: true });
  s = act(s, "auto-fight", { fightId: signed.id, expectedRound: 0 });
  const bout = s.fights.at(-1);
  assert.equal(bout.show, signed.show);
  assert.equal(bout.winBonus, signed.winBonus);
  assert.equal(
    bout.purse,
    signed.show + (bout.result.winner === "A" ? signed.winBonus : 0),
  );
});
