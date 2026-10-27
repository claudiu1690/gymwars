const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
} = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const copy = (x) => JSON.parse(JSON.stringify(x));
const command = (s, type, fields = {}) => applyCommand(s, { type, ...fields });
const start = (seed = "journey-tests") =>
  createCareer({ seed, name: "Journey Gym", style: "boxing" });
function invited(seed = "journey-tests") {
  const s = start(seed);
  const leader = s.fighters[0];
  leader.record.wins = 5;
  leader.rankingPoints = 125;
  leader.championships = [{ wonWeek: 0, defenses: 0 }];
  leader.isChampion = true;
  s.boutsCompleted = 5;
  for (const [index, weightClass] of [
    "featherweight",
    "heavyweight",
  ].entries()) {
    const f = copy(leader);
    f.id = `teammate-${index}`;
    f.name = `Teammate ${index}`;
    f.weightClass = weightClass;
    f.isChampion = false;
    f.championships = [];
    f.record = { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 };
    s.fighters.push(f);
  }
  return s;
}
function enter(s) {
  return command(s, "enter-invitational", {
    fighterIds: s.fighters.map((f) => f.id),
  });
}
function prepare(s) {
  for (let i = 0; i < CAREER.invitational.notice; i++)
    s = command(s, "advance", { confirmCosts: true });
  assert.ok(s.fights.every((b) => b.status === "ready"));
  return s;
}
function resolve(s, index) {
  const b = s.fights[index];
  return command(s, "auto-fight", {
    fightId: b.id,
    expectedRound: b.decisions.length,
  });
}
function setPower(s, values) {
  s.fighters.forEach((f, i) => {
    for (const key of Object.keys(f.stats)) f.stats[key] = values[i];
    f.traits = [];
    f.discoveredTraits = [];
  });
  return s;
}

test("the career has a finite visible destination without mutating saves on reads", () => {
  const s = start(),
    original = copy(s);
  const view = publicState(s);
  assert.deepEqual(s, original);
  assert.equal(view.journey.currentStageId, "debut");
  assert.deepEqual(
    view.journey.stages.map((stage) => stage.id),
    ["debut", "first-win", "contender", "champion", "invitational"],
  );
  assert.equal(view.journey.invitational.unlocked, false);
  assert.equal(view.journey.complete, false);
  assert.equal(view.careerJourney, undefined);
  assert.equal(view.seed, undefined);
  assert.equal(view.fighters[0].potential, undefined);
  assert.throws(() => enter(s), /regional championship/);
});

test("old championship saves receive the invitation without paying or rewriting history", () => {
  const s = invited();
  delete s.careerJourney;
  const original = copy(s),
    view = publicState(s);
  assert.deepEqual(s, original);
  assert.equal(view.cash, original.cash);
  assert.equal(view.legacy, original.legacy);
  assert.deepEqual(
    view.fighters[0].championships,
    original.fighters[0].championships,
  );
  assert.equal(view.journey.currentStageId, "invitational");
  assert.equal(view.journey.invitational.canEnter, true);
  s.fighters[0].championships[0].vacant = true;
  assert.equal(
    publicState(s).journey.invitational.unlocked,
    false,
    "being assigned a vacant belt must not replace winning a championship bout",
  );
  s.fighters[0].championships[0].defenses = 1;
  assert.equal(
    publicState(s).journey.invitational.unlocked,
    true,
    "defending a vacant belt in the cage earns the invitation",
  );
});

test("eligible contenders always see an available champion with preparation time", () => {
  for (let i = 0; i < 30; i++) {
    const s = start(`title-access-${i}`),
      f = s.fighters[0];
    s.week = i;
    f.rankingPoints = CAREER.titleShotPoints;
    const champion = offers(s, f).find((offer) => offer.opponent.isChampion);
    assert.ok(champion);
    assert.equal(champion.shortNotice, false);
    assert.ok(champion.notice >= 4);
    f.rankingPoints--;
    assert.ok(offers(s, f).every((offer) => !offer.opponent.isChampion));
  }
});

test("earned journey milestones stay earned after a ranking setback", () => {
  let s = start();
  s.fighters[0].record.wins = 4;
  s.boutsCompleted = 4;
  s.fighters[0].rankingPoints = CAREER.titleShotPoints;
  s = command(s, "plan", {
    fighterId: "starter",
    plan: s.fighters[0].gameplan,
  });
  s.fighters[0].rankingPoints = 72;
  assert.equal(
    publicState(s).journey.stages.find((stage) => stage.id === "contender")
      .complete,
    true,
  );
  assert.equal(publicState(s).journey.currentStageId, "champion");
  assert.equal(
    publicState(s).journey.nextAction.label,
    "Regain title-shot eligibility",
  );
});

test("Invitational entry validates distinct available fighters atomically", () => {
  const s = invited(),
    original = copy(s);
  assert.throws(
    () =>
      command(s, "enter-invitational", {
        fighterIds: ["starter", "starter", "teammate-1"],
      }),
    /different fighters/,
  );
  assert.deepEqual(s, original);
  s.fighters[2].camp = { endWeek: 6 };
  const view = publicState(s).journey.invitational;
  assert.equal(view.canEnter, false);
  assert.match(view.fighters[2].blockedReason, /camp ends/);
  assert.throws(() => enter(s), /three fighters/);
  s.fighters[2].camp = null;
  s.fighters[2].nextBoutWeek = 5;
  assert.match(
    publicState(s).journey.invitational.fighters[2].blockedReason,
    /recovery/,
  );
  s.fighters[2].nextBoutWeek = 4;
  assert.equal(publicState(s).journey.invitational.canEnter, true);
});

test("Invitational schedules one three-fighter card against the published weight-matched lineup", () => {
  const before = invited(),
    s = enter(before),
    view = publicState(s);
  assert.equal(s.cash, before.cash);
  assert.equal(s.week, 0);
  assert.equal(s.fights.length, 3);
  assert.equal(view.journey.invitational.status, "scheduled");
  assert.equal(view.journey.invitational.eventWeek, 4);
  s.fights.forEach((b, i) => {
    const opponent = s.rivals.find((r) => r.id === b.opponentId);
    assert.equal(b.eventWeek, 4);
    assert.equal(b.title, false);
    assert.equal(b.rounds, 3);
    assert.equal(opponent.weightClass, s.fighters[i].weightClass);
    assert.deepEqual(opponent.stats, CAREER.invitational.opponents[i].stats);
    assert.equal(opponent.style, CAREER.invitational.opponents[i].style);
    assert.ok(!view.ladder.some((f) => f.id === opponent.id));
  });
  assert.throws(() => enter(s), /Finish all three/);
  assert.throws(
    () => command(s, "release", { fighterId: "starter" }),
    /commitments/,
  );
  assert.ok(s.fighters[0].isChampion);
});

test("a two-win team earns its trophy only after all three bouts, once, with titles and regional rankings preserved", () => {
  let s = prepare(enter(setPower(invited("team-victory"), [99, 99, 1])));
  const cash = s.cash,
    legacy = s.legacy,
    rankings = s.fighters.map((f) => f.rankingPoints);
  s = resolve(s, 0);
  s = resolve(s, 1);
  assert.equal(s.careerJourney.attempts[0].wins, 2);
  assert.equal(publicState(s).journey.complete, false);
  assert.equal(publicState(s).journey.invitational.status, "live");
  assert.throws(
    () => command(s, "advance", { confirmCosts: true }),
    /ready fight/,
  );
  const checkpoint = copy(s);
  s = resolve(s, 2);
  assert.deepEqual(
    s,
    resolve(checkpoint, 2),
    "the last bout and award survive replay from a stored checkpoint",
  );
  assert.equal(s.fights[2].result.winner, "B");
  assert.equal(publicState(s).journey.complete, true);
  assert.equal(publicState(s).journey.invitational.status, "won");
  assert.equal(publicState(s).journey.invitational.attempt.resolved, 3);
  assert.equal(
    s.cash - cash,
    s.fights.reduce((sum, b) => sum + b.purse, 0) +
      CAREER.invitational.reward.cash,
  );
  assert.equal(s.legacy - legacy, CAREER.invitational.reward.legacy);
  assert.deepEqual(
    s.fighters.map((f) => f.rankingPoints),
    rankings,
  );
  assert.equal(s.fighters[0].isChampion, true);
  assert.equal(s.fighters[0].championships[0].defenses, 0);
  assert.equal(
    s.journal.filter((entry) => entry.type === "campaign-complete").length,
    1,
  );
  const won = copy(s);
  assert.throws(() => resolve(s, 2));
  assert.throws(() => enter(s), /already won/);
  assert.deepEqual(s, won);
  s = command(s, "advance", { confirmCosts: true });
  assert.equal(publicState(s).journey.complete, true);
  assert.equal(publicState(s).journey.invitational.status, "won");
  assert.ok(
    offers(s, s.fighters[0]).length,
    "normal career continues after the ending",
  );
});

test("a lost team card grants no trophy prize and can be retried without repeating the title climb", () => {
  let s = prepare(enter(setPower(invited("team-defeat"), [1, 1, 1])));
  const cash = s.cash,
    legacy = s.legacy;
  for (let i = 0; i < 3; i++) s = resolve(s, i);
  const view = publicState(s).journey;
  assert.equal(view.complete, false);
  assert.equal(view.invitational.status, "lost");
  assert.equal(view.invitational.attempt.wins, 0);
  assert.equal(view.invitational.canEnter, true);
  assert.equal(
    s.cash - cash,
    s.fights.reduce((sum, b) => sum + b.purse, 0),
  );
  assert.equal(s.legacy, legacy);
  s = enter(s);
  assert.equal(s.careerJourney.attempts.length, 2);
  assert.equal(s.fights[3].eventWeek, 8);
  const old = s.rivals.find((r) => r.id === "invitational-1-opponent-0");
  const retry = s.rivals.find((r) => r.id === "invitational-2-opponent-0");
  assert.deepEqual(old.stats, retry.stats);
});

test("draws do not count as the two required Invitational wins", () => {
  let s = prepare(enter(setPower(invited("team-draws"), [99, 99, 99])));
  for (const b of s.fights.slice(0, 2)) {
    b.status = "resolved";
    b.result = { winner: "draw" };
  }
  s = resolve(s, 2);
  const attempt = publicState(s).journey.invitational.attempt;
  assert.ok(attempt.wins <= 1);
  assert.ok(attempt.draws >= 2);
  assert.equal(attempt.status, "lost");
  assert.equal(publicState(s).journey.complete, false);
});

test("a version-one save gains journey metadata without changing a booked fight or legacy balances", () => {
  let s = start("version-one-journey");
  s = command(s, "book", {
    fighterId: "starter",
    opponentId: offers(s, s.fighters[0])[0].id,
    weeks: 4,
  });
  s.version = 1;
  delete s.scouting;
  delete s.careerJourney;
  const original = copy(s);
  const view = publicState(s);
  assert.deepEqual(s, original);
  assert.equal(view.journey.currentStageId, "debut");
  const upgraded = command(s, "plan", {
    fighterId: "starter",
    plan: s.fighters[0].gameplan,
  });
  assert.deepEqual(upgraded.fights, original.fights);
  assert.deepEqual(upgraded.fighters, original.fighters);
  assert.equal(upgraded.week, original.week);
  assert.equal(upgraded.cash, original.cash);
  assert.equal(upgraded.legacy, original.legacy);
});

test("selected-lineup eligibility is enforced even when three other fighters are free", () => {
  const s = invited("lineup-eligibility");
  s.facilityTier = 2;
  const fourth = copy(s.fighters[2]);
  fourth.id = "fourth";
  s.fighters.push(fourth);
  s.fighters[2].camp = { endWeek: 6 };
  const original = copy(s);
  assert.equal(publicState(s).journey.invitational.canEnter, true);
  assert.throws(
    () =>
      command(s, "enter-invitational", {
        fighterIds: ["starter", "teammate-0", "teammate-1"],
      }),
    /camp ends/,
  );
  assert.deepEqual(s, original);
  const entered = command(s, "enter-invitational", {
    fighterIds: ["starter", "teammate-0", "fourth"],
  });
  assert.equal(entered.fights.length, 3);
  assert.equal(entered.fighters[2].camp.endWeek, 6);
});

test("an unrelated bout cannot score or settle the Invitational, and its calendar blocker remains intact", () => {
  let s = invited("unrelated-bout");
  s.facilityTier = 2;
  const fourth = copy(s.fighters[2]);
  fourth.id = "fourth";
  s.fighters.push(fourth);
  s = command(s, "book", {
    fighterId: fourth.id,
    opponentId: offers(s, fourth)[0].id,
    weeks: 1,
  });
  s = command(s, "enter-invitational", {
    fighterIds: ["starter", "teammate-0", "teammate-1"],
  });
  const before = copy(s.careerJourney.attempts[0]);
  s = command(s, "advance", { untilEvent: true, confirmCosts: true });
  assert.equal(s.week, 1);
  assert.equal(s.fights[0].status, "ready");
  assert.throws(
    () => command(s, "advance", { confirmCosts: true }),
    /ready fight/,
  );
  s = resolve(s, 0);
  assert.deepEqual(s.careerJourney.attempts[0], before);
  assert.equal(publicState(s).journey.complete, false);
  s = command(s, "advance", { untilEvent: true, confirmCosts: true });
  assert.equal(s.week, 4);
  assert.equal(
    s.fights.filter(
      (b) => b.competition === "invitational" && b.status === "ready",
    ).length,
    3,
  );
});

test("camp review and hardship do not strand an entered team card", () => {
  let s = enter(invited("hardship-card"));
  s = command(s, "camp", {
    fighterId: "starter",
    preset: "balanced",
    weeks: 4,
  });
  s = command(s, "advance", { untilEvent: true, confirmCosts: true });
  assert.equal(s.week, 2);
  assert.equal(s.fighters[0].camp.needsReview, true);
  assert.throws(
    () => command(s, "advance", { confirmCosts: true }),
    /midpoint/,
  );
  s = command(s, "camp-review", { fighterId: "starter", choice: "continue" });
  s.cash = 0;
  s = command(s, "advance", { untilEvent: true, confirmCosts: true });
  while (s.week < 4)
    s = command(s, "advance", { untilEvent: true, confirmCosts: true });
  assert.equal(s.fighters[0].camp, null);
  assert.equal(s.fights.filter((b) => b.status === "ready").length, 3);
  for (let i = 0; i < 3; i++) s = resolve(s, i);
  assert.notEqual(publicState(s).journey.invitational.attempt.status, "active");
  assert.doesNotThrow(() => command(s, "advance", { confirmCosts: true }));
});

test("public campaign projections never expose fighter or fight seeds, potential, or hidden traits", () => {
  const s = prepare(enter(invited("private-campaign-seed")));
  const original = copy(s),
    view = publicState(s);
  const campaignPayload = JSON.stringify({
    journey: view.journey,
    fighters: view.fighters,
    rivals: view.rivals,
    fights: view.fights,
    rules: view.rules,
  });
  assert.ok(!campaignPayload.includes("private-campaign-seed"));
  assert.ok(!campaignPayload.includes('"potential":'));
  for (const f of [...view.fighters, ...view.rivals]) {
    assert.equal(f.seed, undefined);
    assert.equal(f.traits, undefined);
    assert.equal(f.potential, undefined);
  }
  for (const b of view.fights) {
    assert.equal(b.seed, undefined);
    assert.equal(b.inputs, undefined);
  }
  assert.deepEqual(s, original);
});

test("repository retries and failed commits cannot duplicate the Invitational card or trophy prize", async () => {
  const { repository } = require("../services/careerService");
  let doc = {
    gymId: "isolated-journey-test",
    revision: 0,
    receipts: [],
    state: setPower(invited("team-victory"), [99, 99, 1]),
  };
  const model = {
    findOne() {
      return { lean: async () => copy(doc) };
    },
    findOneAndUpdate(filter, update) {
      return {
        lean: async () => {
          if (doc.revision !== filter.revision) return null;
          doc.state = copy(update.$set.state);
          doc.revision += update.$inc.revision;
          doc.receipts.push(...copy(update.$push.receipts.$each));
          return copy(doc);
        },
      };
    },
  };
  const repo = repository(model);
  const entry = {
    id: "invitational-entry",
    revision: 0,
    command: {
      type: "enter-invitational",
      fighterIds: doc.state.fighters.map((f) => f.id),
    },
  };
  const entries = await Promise.all([
    repo.command(doc.gymId, entry),
    repo.command(doc.gymId, entry),
  ]);
  assert.equal(doc.revision, 1);
  assert.equal(doc.state.fights.length, 3);
  assert.equal(entries.filter((result) => result.duplicate).length, 1);
  doc.state = resolve(resolve(prepare(doc.state), 0), 1);
  const prePrize = copy(doc);
  const payout = {
    id: "invitational-final-bout",
    revision: 1,
    command: {
      type: "auto-fight",
      fightId: doc.state.fights[2].id,
      expectedRound: 0,
    },
  };
  const failing = repository(model, {
    beforeCommit: async () => {
      throw new Error("simulated storage failure");
    },
  });
  await assert.rejects(
    () => failing.command(doc.gymId, payout),
    /storage failure/,
  );
  assert.deepEqual(doc, prePrize);
  const results = await Promise.all([
    repo.command(doc.gymId, payout),
    repo.command(doc.gymId, payout),
  ]);
  assert.equal(doc.revision, 2);
  assert.equal(results.filter((result) => result.duplicate).length, 1);
  assert.equal(
    doc.state.journal.filter((entry) => entry.type === "campaign-complete")
      .length,
    1,
  );
  const paid = copy(doc);
  const retry = await repo.command(doc.gymId, payout);
  assert.equal(retry.duplicate, true);
  assert.deepEqual(doc, paid);
  await assert.rejects(
    () =>
      repo.command(doc.gymId, { ...payout, id: "invitational-stale-retry" }),
    /changed in another request/,
  );
  await assert.rejects(
    () =>
      repo.command(doc.gymId, {
        ...payout,
        command: { type: "advance", confirmCosts: true },
      }),
    /different action/,
  );
  assert.deepEqual(doc, paid);
});
