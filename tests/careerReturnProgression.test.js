const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CAREER } = require("../consts/career");
const { PITY_THRESHOLDS } = require("../consts/rarity");
const { createCareer, applyCommand, publicState, offers, engineInput } = require("../engine/careerEngine");

const copy = (s) => JSON.parse(JSON.stringify(s));
const start = (seed = "return-progression") => createCareer({ seed, name: "Return Club", style: "boxing" });
const command = (s, type, fields = {}) => applyCommand(s, { type, ...fields });
const active = (s) => s.fighters.filter((f) => !f.retired && !f.released);
function advance(s, weeks) {
  for (let i = 0; i < weeks; i++) {
    for (const f of active(s).filter((f) => f.camp?.needsReview)) s = command(s, "camp-review", { fighterId: f.id, choice: "continue" });
    s = command(s, "advance", { confirmCosts: true });
  }
  return s;
}
function completeCorner(seed, legends = false) {
  let s = start(seed);
  while (new Set(active(s).map((f) => f.weightClass)).size < 4) {
    const owned = new Set(active(s).map((f) => f.weightClass));
    const report = s.board.find((r) => !r.signed && !r.investigated && !owned.has(r.fighter.weightClass));
    assert.ok(report, "every refreshed board offers a needed division");
    if (s.scoutsUsed === CAREER.scoutsPerWeek) { s = advance(s, 1); continue; }
    if (legends) s.scouting.pity.legend = PITY_THRESHOLDS.legend;
    s = command(s, "investigate", { reportId: report.id });
    s = command(s, "sign", { reportId: report.id });
  }
  return s;
}

test("every opening board covers all missing divisions without changing rarity rolls or requiring expansion", () => {
  for (let seed = 0; seed < 100; seed++) {
    const done = completeCorner(`coverage-${seed}`);
    assert.equal(done.week, 1);
    assert.equal(done.facilityTier, 1);
    assert.equal(active(done).length, 4);
    assert.equal(done.scouting.investigations, 3);
    assert.deepEqual(publicState(done).scouting.missingDivisions, []);
    assert.ok(done.cash >= 0);
  }
  const rare = completeCorner("all-legends", true);
  assert.ok(rare.fighters.slice(1).every((f) => f.rarity === "legend"));
  assert.equal(rare.cash, CAREER.startingCash - 1400 - CAREER.facilities[1].upkeep);
});

test("coverage migration appends invitations without rewriting existing reports, investigations or fees", () => {
  const s = start();
  for (const report of s.board) report.fighter.weightClass = "lightweight";
  s.board[0].investigated = true;
  s.board[0].fee = 550;
  s.board[0].fighter.rarity = "elite";
  s.scouting.investigations = 17;
  const before = copy(s);
  const view = publicState(s);
  assert.deepEqual(s, before);
  assert.equal(view.board[0].fee, 0, "the existing first-recruit scholarship is preserved");
  assert.equal(view.board[0].fighter.rarity, "elite");
  const next = command(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
  assert.deepEqual(next.board.slice(0, 4), before.board);
  assert.equal(next.board.length, 7);
  assert.equal(next.scouting.investigations, 17);
  assert.deepEqual(next.scouting.pity, before.scouting.pity);
});

test("trusted repository advance cap bounds legacy multiweek commands, retaining midpoint stops", () => {
  let s = start();
  s.cash = 10000;
  s = command(s, "camp", { fighterId: "starter", preset: "pressure", weeks: 6 });
  const limited = applyCommand(s, { type: "advance", untilEvent: true, confirmCosts: true, maxAdvanceWeeks: 8 }, { maxAdvanceWeeks: 2 });
  assert.equal(limited.week, 2);
  assert.equal(limited.lastAdvance.weeks, 2);
  assert.equal(limited.lastAdvance.cost, 40);
  const midpoint = applyCommand(limited, { type: "advance", untilEvent: true, confirmCosts: true }, { maxAdvanceWeeks: 6 });
  assert.equal(midpoint.week, 3);
  assert.equal(midpoint.lastAdvance.weeks, 1);
  assert.equal(midpoint.fighters[0].camp.needsReview, true);
  assert.throws(() => applyCommand(s, { type: "advance", confirmCosts: true }, { maxAdvanceWeeks: 0 }), /No career weeks/);
  assert.equal(s.week, 0);
});

test("explicit last-division release requires acknowledgement and provides a replacement path; natural aging still retires", () => {
  let s = completeCorner("division-vacancy");
  const feather = active(s).find((f) => f.weightClass === "featherweight");
  assert.throws(() => command(s, "release", { fighterId: feather.id }), /last featherweight/);
  assert.equal(active(s).length, 4);
  const released = command(s, "release", { fighterId: feather.id, confirmDivisionLoss: true });
  assert.deepEqual(publicState(released).scouting.missingDivisions, ["featherweight"]);
  assert.equal(released.journal.at(-1).type, "division-vacancy");
  s.fighters.find((f) => f.id === feather.id).age = 39.999;
  s = advance(s, 1);
  assert.equal(s.fighters.find((f) => f.id === feather.id).retired, true);
  assert.ok(s.journal.some((entry) => entry.type === "division-vacancy"));
});

test("long camps combine unchanged weekly growth with a recovery finish and one replaceable next-bout bonus", () => {
  let s = start();
  s.cash = 10000;
  const camp = (source, weeks) => command(source, "camp", { fighterId: "starter", preset: "pressure", weeks });
  const long = advance(camp(s, 6), 6);
  let short = copy(s);
  for (let i = 0; i < 5; i++) short = advance(camp(short, 1), 1);
  short = advance(short, 1);
  assert.deepEqual(long.fighters[0].stats, short.fighters[0].stats);
  assert.equal(long.fighters[0].preparation.value, 5);
  assert.equal(advance(camp(s, 4), 4).fighters[0].preparation.value, 4);
  assert.equal(advance(camp(long, 1), 1).fighters[0].preparation.value, 3);
  const expired = copy(long);
  expired.week = long.fighters[0].preparation.expiresWeek + 1;
  assert.equal(engineInput(expired, expired.fighters[0]).stats.striking, expired.fighters[0].stats.striking);
  const old = camp(s, 6);
  delete old.fighters[0].camp.commitmentBonus;
  assert.equal(advance(old, 6).fighters[0].preparation.value, 3, "old active camps retain their saved rules");
});

test("new mentoring excludes pure drawbacks, labels situational lessons and warns rather than blocks runway risk", () => {
  let s = start();
  s.boutsCompleted = 1;
  s = command(s, "veteran");
  const mentor = s.fighters.find((f) => f.id === "veteran");
  mentor.traits = mentor.discoveredTraits = ["suspect-chin", "big-fight-nerves", "slow-starter", "cardio-machine"];
  s.fighters[0].traits = [];
  s.cash = 20;
  const options = publicState(s).mentoringOptions;
  assert.ok(options.every((p) => !["suspect-chin", "big-fight-nerves"].includes(p.trait)));
  const situational = options.find((p) => p.trait === "slow-starter");
  assert.equal(situational.traitKind, "situational");
  assert.equal(situational.budget.funded, false);
  assert.equal(situational.budget.shortfall, 60);
  assert.equal(situational.canStart, true);
  assert.throws(() => command(s, "mentor", { mentorId: mentor.id, juniorId: "starter", trait: "suspect-chin" }), /transferable trait/);
  assert.equal(command(s, "mentor", { mentorId: mentor.id, juniorId: "starter", trait: "slow-starter" }).mentoring[0].status, "active");
  s.fights.push({ id: "booked-income", fighterId: "other", status: "scheduled", eventWeek: 3, show: 180 });
  const funded = publicState(s).mentoringOptions.find((p) => p.trait === "slow-starter");
  assert.equal(funded.budget.bookedShowIncome, 180);
  assert.equal(funded.budget.funded, true);
});

test("four-division chapter earns permanent fighting purses and pennants without passive money", () => {
  let s = completeCorner("earned-circuit");
  s.fighters[0].record.wins = 2; // Individual City qualification.
  assert.equal(publicState(s).careerCircuit.id, "regional");
  s.boutsCompleted = 1;
  const cash = s.cash;
  s = command(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
  const view = publicState(s);
  assert.equal(view.careerCircuit.id, "city");
  assert.equal(s.cash, cash);
  assert.ok(view.gymDevelopment.identity.earnedPennants.some((p) => p.id === "fight-team"));
  assert.equal(s.facilityTier, 1, "competition is earned before paying for a building");
  const offer = offers(s, s.fighters[0]).find((o) => o.circuit.id === "city");
  assert.equal(offer.show, 300);
  assert.equal(offer.winBonus, 450);
  const booked = command(s, "accept-offer", { fighterId: "starter", offerId: offer.offerId });
  const captured = copy(booked.fights[0]);
  booked.gymGoals["division-dynasty"] = { week: 1, badge: "A division dynasty" };
  const later = command(booked, "plan", { fighterId: "starter", plan: booked.fighters[0].gameplan });
  assert.deepEqual(later.fights[0], captured, "earned circuit changes never rewrite booked purses");
});

test("post-Invitational career has an earned challenge, one trophy and an immutable reward", () => {
  let s = start("challenge-payoff");
  s.fighters[0].record.wins = 4; // National challenge checkpoint.
  s.cash = 10000;
  s.careerJourney.completedWeek = 0;
  for (const key of Object.keys(s.fighters[0].stats)) s.fighters[0].stats[key] = 99;
  const view = publicState(s);
  assert.equal(view.journey.postInvitationalChallenge.id, "national-showcase");
  assert.match(view.journey.nextAction.label, /National Showcase/);
  const offer = offers(s, s.fighters[0]).find((o) => o.challengeId === "national-showcase");
  assert.ok(offer);
  s.rivals.find((r) => r.id === offer.id).stats = {striking:1,grappling:1,submissions:1,conditioning:1};
  s = command(s, "accept-offer", { fighterId: "starter", offerId: offer.offerId });
  const boutId = s.fights[0].id;
  s = advance(s, 4);
  s = command(s, "auto-fight", { fightId: boutId, expectedRound: 0 });
  assert.equal(s.fights[0].result.winner, "A");
  assert.equal(s.fights[0].rewards.challenge.reward.legacy, 35);
  assert.equal(publicState(s).gymDevelopment.identity.trophies[0].trophy, "National Showcase pennant");
  assert.ok(!offers(s, s.fighters[0]).some((o) => o.challengeId === "national-showcase"));
  const earned = copy(s.careerChallenges);
  assert.throws(() => command(s, "auto-fight", { fightId: boutId, expectedRound: s.fights[0].decisions.length }));
  assert.deepEqual(s.careerChallenges, earned);
  assert.ok(publicState(s).ladder.every((f) => !f.circuitChallenge), "challenge guests do not take regional belts or standings");
});

test("Next Generation chooses an eligible active junior and routes occupied or missing successors to useful actions", () => {
  const s = start("successor-route");
  s.fighters[0].record.wins = 4; // Qualified successor checkpoint.
  s.careerJourney.completedWeek = 0;
  s.careerChallenges["national-showcase"] = { week: 0, trophy: "National Showcase pennant" };
  s.gymGoals.successor = { week: 0, badge: "Pass it forward" };
  for (const id of ["open-doors","fight-team","title-defense","team-trophy"]) s.gymGoals[id] = {week:0,badge:id};
  s.fighters[0].rankingPoints = 120;
  const junior = { ...copy(s.fighters[0]), id: "junior", name: "Junior", weightClass: "featherweight", rankingPoints: 25 };
  s.fighters.push(junior);
  s.mentoring.push({ id: "old-lesson", mentorId: "former-mentor", juniorId: junior.id, status: "completed", endWeek: 0 });
  let view = publicState(s);
  assert.equal(view.journey.postInvitationalChallenge.id, "next-generation");
  assert.equal(view.journey.postInvitationalChallenge.fighterId, junior.id);
  assert.equal(view.journey.postInvitationalChallenge.canEnter, true);
  assert.deepEqual(view.journey.nextAction, { label: "Enter Next Generation", href: "/career/booking/junior" });
  const offer = offers(s, junior).find((candidate) => candidate.challengeId === "next-generation");
  assert.ok(offer, "the journey's chosen fighter actually has the advertised offer");
  const booked = command(s, "accept-offer", { fighterId: junior.id, offerId: offer.offerId });
  view = publicState(booked);
  assert.equal(view.journey.postInvitationalChallenge.canEnter, false);
  assert.deepEqual(view.journey.nextAction, { label: "Prepare the booked bout", href: "/career/gym/training/junior" });
  const due = copy(booked);
  due.fights[0].status = "ready";
  assert.deepEqual(publicState(due).journey.nextAction, { label: "Finish the booked bout", href: `/career/fight-night/${due.fights[0].id}` });
  const reserve = { ...copy(junior), id: "junior-reserve", name: "Next Junior", weightClass: "middleweight", rankingPoints: 10 };
  booked.fighters.push(reserve);
  booked.mentoring.push({ id: "second-lesson", mentorId: "former-mentor", juniorId: reserve.id, status: "succeeded", endWeek: 0 });
  assert.equal(publicState(booked).journey.nextAction.href, "/career/booking/junior-reserve", "a free qualified teammate is preferred to a booked junior");
  const unavailable = copy(s);
  unavailable.fighters.find((f) => f.id === junior.id).retired = true;
  view = publicState(unavailable);
  assert.equal(view.journey.postInvitationalChallenge.canEnter, false);
  assert.match(view.journey.postInvitationalChallenge.blockedReason, /active fighter/);
  assert.deepEqual(view.journey.nextAction, { label: "Prepare a mentored successor", href: "/career/gym/mentoring" });
  const longCamp = command(s, "camp", { fighterId: junior.id, preset: "pressure", weeks: 6 });
  view = publicState(longCamp);
  assert.equal(view.journey.postInvitationalChallenge.canEnter, false);
  assert.deepEqual(view.journey.nextAction, { label: "Finish Junior's camp", href: "/career/gym/training/junior" });
});

test("earned ordinary circuits sustain four-fighter 30/50/70 percent outcome policies at four- and six-week throughput", () => {
  const { runPolicies } = require("../scripts/simulateCareerEconomy");
  const model = runPolicies();
  assert.equal(model.results.length, 36);
  for (const policy of model.results) {
    assert.ok(policy.weeklyNet > 0, `${policy.circuit}/${policy.winRate}/${policy.boutInterval}`);
    assert.equal(policy.hardshipWeeks, 0);
    assert.ok(policy.weeksToPurchase > 0 && policy.weeksToPurchase < 104);
    assert.ok(policy.boutsPerFourWeekRefill <= 4);
  }
});
